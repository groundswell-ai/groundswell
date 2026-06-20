# TypeBox Converter API — VERIFIED (P2.M4.T1.S1)

> **Status: AUTHORITATIVE.** All signatures below were read directly from
> `node_modules/@sinclair/typebox/typebox.d.ts` (v0.27.8) and confirmed resolvable in-repo
> on 2026-06-20. This is the single source of truth for the `jsonSchemaToTypebox` converter.

## 0. Why this exists (PRD/contract grounding)

PRD §7.10 + §7.12 require **cross-harness tool parity**: the SAME Groundswell `Tool`
(`{ name; description; input_schema: JSON-Schema }`, `src/types/sdk-primitives.ts` L10-24)
must reach BOTH harnesses. The existing bridge `MCPHandler.toAgentSDKServer()`
(`src/core/mcp-handler.ts` L173-235) converts `input_schema` → **Zod raw shape** for the
Claude Code SDK (`jsonSchemaToZodRawShape` L219-263 + `jsonSchemaPropertyToZod` L266-308).
The Pi harness needs the PARALLEL conversion: `input_schema` → **TypeBox `TSchema`**, because
Pi's `ToolDefinition.parameters: TParams extends TSchema` (`@earendil-works/pi-coding-agent`
`dist/core/extensions/types.d.ts` L13, L335). This converter is S1; S2 (`toPiCustomTools`)
consumes it. See `external_deps.md` §1.4 gotcha + §4 ("Required new bridge: JSON-Schema →
TypeBox converter") and `consumer-analysis.md` §5 ("Risk: JSON Schema → Zod conversion …
consider extracting an `McpFormatConverter` strategy").

---

## 1. TypeBox dependency — resolvable transitively (NO new dep required for S1)

```
$ npm ls @sinclair/typebox
groundswell@0.0.4
└─┬ vitest@1.6.1 → @vitest/snapshot → pretty-format → @jest/schemas → @sinclair/typebox@0.27.8
```

- `node_modules/@sinclair/typebox` **resolves** at `/home/dustin/projects/groundswell/node_modules/@sinclair/typebox` (v0.27.8, `main: ./typebox.js`, `types: ./typebox.d.ts`, CJS).
- **PRECEDENT (decisive):** `src/harnesses/pi-harness.ts` **L1** already does
  `import { Type } from "@sinclair/typebox";` — and that file compiles (`npm run lint` green)
  AND its tests pass (`pi-harness-customtools.test.ts`, completed P2.M3.T1.S1). So the
  transitive resolution is **stable enough for S1** under BOTH `tsc` (esModuleInterop:true
  synthesizes named imports) and `vitest`/esbuild (esbuild interops CJS→ESM named imports).
- **RECOMMENDATION (NOT blocking):** add `@sinclair/typebox` as a direct `dependencies`
  entry in `package.json` for robustness in a P4 cleanup pass (the current resolution is
  incidental — pinned to the vitest snapshot chain). S1 does NOT do this (out of scope:
  S1 touches only the converter file + test). Documented as a note in the PRP.
- **GOTCHA (raw Node ESM):** `node ./file.mjs` with `import { Type } from '@sinclair/typebox'`
  FAILS ("Named export not found … CommonJS module"). This is IRRELEVANT — the project NEVER
  runs raw-node-ESM on src; vitest (esbuild) and tsc both handle the interop. Do NOT be fooled
  by a `node -e` probe failing; the pi-harness.ts L1 precedent is the proof it works in-pipeline.

---

## 2. The `Type` builder API (every builder the converter calls — verified signatures)

All from `node_modules/@sinclair/typebox/typebox.d.ts` `export declare namespace Type`:

```ts
// PRIMITIVES
Type.String<Format extends string = string>(options?: StringOptions): TString<Format>;   // d.ts L638
Type.Number(options?: NumericOptions<number>): TNumber;                                   // d.ts L630
Type.Integer(options?: NumericOptions<number>): TInteger;                                 // d.ts L613
Type.Boolean(options?: SchemaOptions): TBoolean;                                          // d.ts L601

// COMPOSITE
Type.Object<T extends TProperties>(properties: T, options?: ObjectOptions): TObject<T>;   // d.ts L632
//   TProperties = Record<keyof any, TSchema> (d.ts L230). Each property value MUST be a TSchema.
Type.Array(schema: TSchema, options?: ArrayOptions): TArray<TSchema>;                     // (arity 2: item-schema, options)

// ENUM / LITERAL / UNION  ← THE KEY NON-OBVIOUS MAPPING
Type.Literal<T extends TLiteralValue>(value: T): TLiteral<T>;                             // d.ts L622  (TLiteralValue = string|number|boolean|null)
Type.Union<T extends TSchema[]>(anyOf: [...T]): TUnion<T>;                                // d.ts L678
Type.Enum<T extends Record<string,string|number>>(item: T): TEnum<T>;                     // d.ts L605  ← takes a RECORD/OBJECT, NOT an array!

// OPTIONALITY (applied to a property VALUE, not the object)
Type.Optional<T extends TSchema>(schema: T): TOptional<T>;                                // d.ts L591

// ESCAPE HATCHES (default arm; $ref fallback; unknown type)
Type.Any(options?: SchemaOptions): TAny;                                                  // d.ts L597
Type.Unknown(options?: SchemaOptions): TUnknown;                                          // d.ts L682
```

### 2a. JSON-Schema `enum` → TypeBox mapping (NON-OBVIOUS — read this)

JSON-Schema enum is an **array**: `{ type:'string', enum:['a','b','c'] }`.
TypeBox `Type.Enum` takes a **`Record<string,string|number>`** (object), NOT an array. Two
valid mappings exist; **use the Union-of-Literals** (idiomatic, type-faithful, handles mixed
string/number enums uniformly):

```ts
// PREFERRED: JSON-Schema enum:[v1,v2,...] → Type.Union(values.map(v => Type.Literal(v)))
const tbEnum = Type.Union(schema.enum.map((v) => Type.Literal(v)));
//   → { anyOf: [ { const: v1, ... }, { const: v2, ... } ] }   (exactly JSON-Schema's anyOf shape)
```

The `Type.Enum({...})` object form is rejected here because (a) it requires synthesizing a
`Record` key for each value (lossy for non-string values), (b) it emits a different runtime
shape, (c) the Zod converter does not model enums at all (it falls through to the type arm),
so ANY faithful enum support is already parity-plus. Union-of-Literals is the cleanest.

### 2b. JSON-Schema `$ref` → TypeBox mapping (S1 scope = permissive fallback)

TypeBox `Type.Ref(schema)` **requires a schema with `$id`** (a referenced definition, not a
string path): `Type.Ref<T extends TSchema>(schema: T): TRef<T>` (d.ts L664). S1's converter is
a **pure function with NO definitions registry** (the contract says "Mock: none (pure
function)"). Therefore a local `$ref: '#/definitions/Foo'` cannot be resolved inline. The
**parity-correct, safe fallback** is `Type.Any()`:

```ts
// $ref present → Type.Any() (no registry in S1; permissive — tool validation accepts the value).
//   Parity with the Zod converter's default arm (z.unknown()) for $ref/unmatched types.
if (typeof schema.$ref === 'string') return Type.Any();
```

This "supports $ref basics" per the contract: it does NOT crash, returns a valid `TSchema`,
and is permissive (Pi tool-call args are accepted, not rejected). A definitions-registry-aware
resolver is an explicit S2+ extension (documented); S1 stays pure.

---

## 3. Optionality semantics (mirrors the Zod converter L243-254 EXACTLY)

In TypeBox, optionality is a **modifier on the property VALUE**, applied via `Type.Optional(...)`:

```ts
// WRONG (TypeBox has no "required: string[]" on the object):
//   Type.Object(props, { required: [...] })   // ← ObjectOptions has no `required`
// RIGHT (wrap each non-required property value in Type.Optional):
Type.Object({
  name: Type.String(),                       // required
  count: Type.Optional(Type.Number()),       // optional
})
```

`TOptional<T>` (d.ts L26) = `T & { modifier: OptionalModifier }`. The Optional modifier is the
Symbol `Symbol.for('TypeBox.Optional')` (a.k.a. exported `Optional`). Detection:
`(schema as any).modifier === Symbol.for('TypeBox.Optional')` OR via `TypeGuard.TOptional(...)`
(if present in this version — see §5).

**This is a 1:1 mirror of `jsonSchemaToZodRawShape` L243-254**, which marks non-required props
`.optional()`. The converter iterates `schema.required` (a `string[]`), builds a `Set`, and for
each property applies `Type.Optional` when the key is absent from the set.

---

## 4. The `TypeGuard` namespace — the assertion helper for unit tests

`export declare namespace TypeGuard` (d.ts L454) provides type-narrowing predicates. These are
**the cleanest assertion helpers** for the test suite (no Symbol-bookkeeping):

```ts
import { TypeGuard } from '@sinclair/typebox';
TypeGuard.TString(schema)   // schema is TString
TypeGuard.TNumber(schema)   // schema is TNumber
TypeGuard.TInteger(schema)  // schema is TInteger
TypeGuard.TBoolean(schema)  // schema is TBoolean
TypeGuard.TObject(schema)   // schema is TObject
TypeGuard.TArray(schema)    // schema is TArray
TypeGuard.TUnion(schema)    // schema is TUnion
TypeGuard.TLiteral(schema)  // schema is TLiteral
TypeGuard.TAny(schema)      // schema is TAny
TypeGuard.TUnknown(schema)  // schema is TUnknown
```

**Naming gotcha:** TypeGuard predicates are `TypeGuard.T<String|Object|...>` (capital-T type
name), NOT `TypeGuard.IsX`. Verified in d.ts L456-504 body. For optionality, prefer the direct
modifier check `(schema as any).modifier === Optional` (import `{ Optional }` from
`@sinclair/typebox`) — more reliable than guessing a TypeGuard.TOptional name.

---

## 5. Coverage parity table — JSON-Schema → {Zod (existing) | TypeBox (S1 new)}

| JSON-Schema shape | Zod converter (mcp-handler.ts) | TypeBox converter (S1) | Notes |
|---|---|---|---|
| `{ type:'object', properties, required }` | `z.object(...)` + `.optional()` on non-required | `Type.Object(...)` + `Type.Optional(...)` on non-required | 1:1 parity (§3) |
| `{ type:'string' }` | `z.string()` | `Type.String()` | |
| `{ type:'number' }` | `z.number()` | `Type.Number()` | |
| `{ type:'integer' }` | `z.number()` | `Type.Integer()` | **TypeBox upgrade**: Zod collapses int→number; TypeBox keeps distinct `TInteger`. Parity+ |
| `{ type:'boolean' }` | `z.boolean()` | `Type.Boolean()` | |
| `{ type:'array', items }` | `z.array(convert(items))` | `Type.Array(convert(items))` | recursive |
| `{ type:'array' }` (no items) | `z.array(z.unknown())` | `Type.Array(Type.Unknown())` | |
| `{ type:'object', properties }` (nested) | `z.object(...)` (recurse) | `Type.Object(...)` (recurse) | recursive |
| `{ type:'object' }` (no properties) | `z.record(z.unknown())` | `Type.Record(Type.String(), Type.Any())` | see §6 |
| `{ enum:[...] }` | *(not handled → type arm)* | `Type.Union(values.map(Type.Literal))` | **TypeBox upgrade** (§2a) |
| `{ $ref:'...' }` | *(default arm → z.unknown())* | `Type.Any()` | permissive parity (§2b) |
| unknown/missing `type` | `z.unknown()` (default) | `Type.Unknown()` | default arm |

**Conclusion:** TypeBox coverage ≥ Zod coverage on every arm, PLUS explicit `integer`, `enum`,
and `$ref` handling. This satisfies the contract: "object/string/number/boolean/array/enum/$ref
basics (parity with the Zod converter's coverage)".

---

## 6. Edge case — `{ type:'object' }` with NO `properties` (open object)

The Zod converter returns `z.record(z.unknown())` for a property-less object (mcp-handler.ts
L302). The TypeBox analog is `Type.Record(Type.String(), Type.Any())` (d.ts L660 RecordStringType
overload: `Record<K extends TString, T extends TSchema>`). This is the faithful mapping. (Do NOT
return `Type.Object({})` — that is a closed object allowing zero properties, which would REJECT
valid arbitrary LLM args.)

---

## 7. Function signature (the contract, made concrete)

```ts
// src/harnesses/pi-schema-converter.ts
import { Type, type TSchema } from '@sinclair/typebox';
import type { Tool } from '../types/sdk-primitives.js';

/**
 * Convert a Groundswell Tool JSON-Schema (input_schema) into a TypeBox TSchema
 * for Pi's ToolDefinition.parameters (PRD §7.10; parallel to MCPHandler.jsonSchemaToZodRawShape
 * for the Claude Code SDK). Pure function — no I/O, no mocks, no registry.
 *
 * Coverage: object (required/optional/nested/open), string, number, integer, boolean,
 * array (items), enum (union of literals), $ref (permissive Any fallback). Unrecognized
 * shapes → Type.Unknown() (parity with the Zod converter's default arm).
 */
export function jsonSchemaToTypebox(schema: Tool['input_schema'] | Record<string, unknown>): TSchema;
```

**Input type note:** `Tool['input_schema']` is typed as
`{ type:'object'; properties: Record<string, unknown>; required?: string[] }` (sdk-primitives
L16-22). But MCP/JSON-Schema properties are `unknown` (not strongly typed), so the converter
takes `Record<string, unknown>` for recursion and casts at the property level. The PUBLIC entry
accepts `Tool['input_schema']` (the top-level is always an object); internal recursion uses the
`Record<string, unknown>` overload. Export `Type` re-export OR keep `Type` import internal —
see Decision in PRP (the contract says "Export Type.Type.* builders"; simplest = the converter
file re-exports `{ Type }` so S2 imports both from one module).

---

## 8. Consumption by S2 (`toPiCustomTools`) — the forward contract

S2 replaces the **placeholder** in `src/harnesses/pi-harness.ts` `buildCustomTools` (L650):
```ts
// CURRENT (placeholder, P2.M3.T1.S1):
const PERMISSIVE_PARAMS = Type.Object({}, { additionalProperties: true });
// ...
parameters: PERMISSIVE_PARAMS,   // placeholder — P2.M4.T1.S1 owns real conversion
```
with a **real** schema produced by S1's converter:
```ts
// S2 (P2.M4.T1.S2) will do:
import { jsonSchemaToTypebox } from './pi-schema-converter.js';
// ...
parameters: jsonSchemaToTypebox(tool.input_schema),
```
S1 must guarantee: (a) `jsonSchemaToTypebox(tool.input_schema)` returns a value assignable to
`ToolDefinition.parameters` (`TSchema`) — verified by the signature; (b) the returned schema is
ACCEPTED by Pi's runtime tool-call validation (permissive arms = Any/Unknown ensure this even for
shapes we don't model); (c) the function is deterministic + pure (S2 may call it eagerly per-tool).

---

## 9. Test strategy (pure function — NO mocks)

- **No mocks** (contract: "Mock: none (pure function)"). The converter is pure: `input → output`.
- **Assertions via `TypeGuard`** (§4) + structural spot-checks (`schema.properties.foo.type`,
  `schema.anyOf.length`, `(prop).modifier === Optional`).
- **Cases** (one `it` each): object w/ required+optional; nested object; string; number; integer;
  boolean; array of strings; array of objects; enum (string values); enum (mixed); `$ref`;
  unknown type → Unknown; property-less object → Record; round-trip parity against the
  `input_schema` shapes already in `src/__tests__/unit/agent-tool-executor.test.ts` (L60-130 —
  reuse those exact shapes as representative fixtures).
- **Placement:** `src/__tests__/unit/providers/pi-schema-converter.test.ts` (mirrors the
  `src/harnesses/pi-schema-converter.ts` location; the `providers/` subdir is the established
  home for harness-adjacent unit tests — all `pi-harness-*.test.ts` live there).

---

## 10. File-location decision — `src/harnesses/pi-schema-converter.ts`

The contract offers two locations: `src/harnesses/pi-schema-converter.ts` OR a
`src/core/mcp-handler.ts` sibling (`src/core/pi-schema-converter.ts`). **Chosen: `src/harnesses/`.**
Rationale: (a) contract's first-listed option; (b) TypeBox is **Pi-specific** (Pi's
`ToolDefinition.parameters` is `TSchema`; the Claude SDK uses Zod) — co-locating with `PiHarness`
is thematically correct; (c) the natural S2 consumer (`PiHarness.buildCustomTools`, L648-700)
already lives in `src/harnesses/` → same-layer import; (d) if S2 instead puts the bridge on
`MCPHandler` (core), the cross-layer import `core → harnesses` is an **already-accepted pattern**
(`src/core/agent.ts:43` already imports `from '../harnesses/index.js'`). The converter is a pure
leaf (imports only `@sinclair/typebox` + a type from `sdk-primitives`) → introduces NO reverse
runtime coupling.

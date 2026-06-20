# PRP — P2.M4.T1.S1: JSON-Schema → TypeBox schema converter

**PRD reference:** §7.10 (Tool Execution — "Groundswell passes its tool list into
`createAgentSession({ tools })` … Pi treats them as ordinary registered tools"), §7.12 (MCP & LSP
provided by Groundswell's `MCPHandler` … "both harnesses receive the same tool list"), §7.14.1
(Feature parity — "MCP Tools: Register, discover, and execute MCP tools" identically across
harnesses). **Plan:** `plan/004_9a50e71828f4/` — S1 of P2.M4.T1 ("JSON-Schema → TypeBox converter
and toPiCustomTools bridge"). **Consumes** the existing `Tool.input_schema` JSON-Schema type
(`src/types/sdk-primitives.ts` L10-24), the existing Zod converter as the **parity reference**
(`src/core/mcp-handler.ts` `jsonSchemaToZodRawShape` L219-263 + `jsonSchemaPropertyToZod` L266-308),
and the placeholder schema in `PiHarness.buildCustomTools` (`src/harnesses/pi-harness.ts` —
`const PERMISSIVE_PARAMS = Type.Object({}, { additionalProperties: true })` then `parameters: PERMISSIVE_PARAMS`;
grep `PERMISSIVE_PARAMS` to locate — line numbers drift because S3 is editing this file in parallel; at
time of writing it is ~L673-680). **Unblocks**
P2.M4.T1.S2 (`MCPHandler.toPiCustomTools()` / PiHarness bridge that replaces the placeholder with a
real converted schema). **Scope tag:** (a) CREATE `src/harnesses/pi-schema-converter.ts` exporting
`jsonSchemaToTypebox(schema): TSchema` — a PURE function (no mocks, no I/O, no registry) supporting
object/string/number/integer/boolean/array/enum/$ref (parity + over the Zod converter); (b)
re-export `Type` + key `TSchema` types so S2 imports everything from one module; (c) unit-test
against representative JSON-Schema shapes. **Mock: none.** **Parallel note:** S2 (the bridge that CONSUMES this converter) edits `buildCustomTools` (the
`PERMISSIVE_PARAMS` line — referenced as "L650" throughout this PRP, but LINE NUMBERS DRIFT because S3
is editing pi-harness.ts in parallel; always `grep PERMISSIVE_PARAMS src/harnesses/pi-harness.ts` to find
the current line) + adds `toPiCustomTools`; S1 only CREATES the converter file + its test. **Zero file
overlap** with S2 (S2 will `import { jsonSchemaToTypebox }` from this file). See Decision 10.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Ten load-bearing details:
> (1) `@sinclair/typebox@0.27.8` resolves **transitively** in-repo; `src/harnesses/pi-harness.ts`
> **L1** already does `import { Type } from "@sinclair/typebox"` and compiles + tests green → the
> SAME import style works for the converter (NO new dep needed for S1; adding a direct dep is a P4
> cleanup, documented, NOT blocking). (2) The converter is the **PARALLEL** of
> `MCPHandler.jsonSchemaToZodRawShape` (Zod for Claude) → it produces **TypeBox `TSchema`** for Pi.
> Every arm of the Zod converter maps 1:1 (object/string/number/boolean/array) PLUS TypeBox adds
> distinct `integer`, real `enum` (Union of Literals), and permissive `$ref` → `Any()`. (3) JSON-Schema
> `enum:[...]` (array) → `Type.Union(values.map(v => Type.Literal(v)))` — NOT `Type.Enum` (which takes
> a `Record`, not an array). (4) JSON-Schema `$ref` → `Type.Any()` — S1 is a pure function with NO
> definitions registry; permissive parity with the Zod converter's default arm. (5) Optionality is a
> **modifier on the property VALUE** (`Type.Optional(Type.String())`), NOT an object-level `required:[]`
> field — 1:1 mirror of the Zod converter's `.optional()` (L243-254). (6) Property-less object
> `{type:'object'}` → `Type.Record(Type.String(), Type.Any())` (faithful to Zod's `z.record(z.unknown())`;
> NOT `Type.Object({})` which is a closed empty object). (7) File location = `src/harnesses/pi-schema-converter.ts`
> (contract's first option; TypeBox is Pi-specific; co-located with `PiHarness.buildCustomTools` the
> S2 consumer; core→harnesses cross-layer import is already an accepted pattern via `agent.ts:43`).
> (8) Tests use `TypeGuard.TString/TObject/...` predicates (capital-T names, NOT `IsX`) + optional
> `(schema).modifier === Optional` for optionality. (9) Reuse the exact `input_schema` fixtures from
> `src/__tests__/unit/agent-tool-executor.test.ts` L60-130 as representative test shapes. (10) S1 CREATES
> the converter + test only; S2 CONSUMES it (edits `buildCustomTools` + adds `toPiCustomTools`) — no
> overlap, both land independently.

---

## Goal

**Feature Goal:** Provide a PURE, deterministic `jsonSchemaToTypebox(schema): TSchema` converter
that translates Groundswell's `Tool.input_schema` (JSON-Schema) into TypeBox `TSchema` schemas
suitable for Pi's `ToolDefinition.parameters` (PRD §7.10, §7.12, §7.14.1). It is the TypeBox PARALLEL
of the existing `MCPHandler.jsonSchemaToZodRawShape()` (which does the same job for the Claude Code
SDK's Zod-based `tool()` helper). After S1: a caller can convert any `Tool.input_schema` into a valid
TypeBox schema covering object (required/optional/nested/open), string, number, integer, boolean,
array, enum, and `$ref` — with coverage ≥ the Zod converter's on every arm.

**Deliverable:**
1. **CREATE `src/harnesses/pi-schema-converter.ts`** exporting:
   - `jsonSchemaToTypebox(schema: Tool['input_schema'] | Record<string, unknown>): TSchema` — the
     public converter (pure function; handles the top-level object + delegates to a private
     `propertyToTypebox` recursive helper for each property/items value).
   - A **re-export** of `Type` (and optionally `TSchema`) from `@sinclair/typebox` so S2 imports
     both the converter AND the builders from one module (`import { jsonSchemaToTypebox, Type } from
     './pi-schema-converter.js'`). This also lets S2 drop the direct `@sinclair/typebox` import if
     desired (the contract says "Export `Type.Type.*` builders").
   - A private recursive `propertyToTypebox(prop: Record<string, unknown>): TSchema` mirroring
     `jsonSchemaPropertyToZod` (mcp-handler.ts L266-308) — handles string/number/integer/boolean/
     array/object/enum/$ref/default.
2. **CREATE `src/__tests__/unit/providers/pi-schema-converter.test.ts`** — unit tests for every
   coverage arm (NO mocks — pure-function input→output assertions via `TypeGuard` + structural checks).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-schema-converter.ts` compiles; `import { Type, type
   TSchema } from "@sinclair/typebox"` typechecks (esModuleInterop synthesizes the named CJS import,
   proven by `pi-harness.ts` L1); `Tool['input_schema']` import resolves.
2. `npm test` exits 0 — the new `pi-schema-converter.test.ts` suite passes AND the full regression
   suite stays green (S1 adds a pure leaf module + test; touches nothing else).
3. `npm run build` exits 0 — `dist/harnesses/pi-schema-converter.{js,d.ts}` emits
   `jsonSchemaToTypebox` + the `Type` re-export.
4. Runtime spot-check (vitest): converting a representative `input_schema`
   (`{type:'object', properties:{name:{type:'string'}, count:{type:'number'}, tags:{type:'array',
   items:{type:'string'}}}, required:['name']}`) yields a TypeBox `TObject` whose `.properties.name`
   is a `TString`, `.properties.count` is an optional `TNumber` (has the `Optional` modifier), and
   `.properties.tags` is a `TArray` whose `.items` is a `TString`. Converting `{enum:['a','b']}`
   yields a `TUnion` of two `TLiteral`s.
5. Contract (grep): `export function jsonSchemaToTypebox`, `import { Type`, `from "@sinclair/typebox"`,
   `Type.Union(`, `Type.Literal(`, `Type.Optional(`, `Type.Record(`, `Type.Any()`, `Type.Integer(`;
   NO `import` from `@earendil-works/pi-ai` or `@earendil-works/pi-agent-core`; the converter file
   imports ONLY `@sinclair/typebox` + `type { Tool }` from sdk-primitives.

---

## ⚠️ SCOPE DECISIONS — ten load-bearing details

### Decision 1 — TypeBox resolves transitively; reuse the pi-harness.ts L1 import style (NO new dep)

`npm ls @sinclair/typebox` shows it resolves at v0.27.8 (transitively). **Decisive precedent:**
`src/harnesses/pi-harness.ts` **L1** already does `import { Type } from "@sinclair/typebox";` — that
file compiles (`npm run lint` green, P2.M3.T1.S1 complete) AND its tests pass. So the named CJS import
works under BOTH `tsc` (`esModuleInterop: true` synthesizes named imports from CJS default) and
`vitest`/esbuild (esbuild interops CJS→ESM named imports). **S1 uses the identical import.** No new
`package.json` dependency is required. (RECOMMENDATION, NOT S1 scope: add `@sinclair/typebox` as a
direct `dependencies` entry in a P4 cleanup pass, since the current resolution is incidental — pinned
to the vitest snapshot chain. Documented only; S1 does not touch `package.json`.) **GOTCHA:** a raw
`node ./probe.mjs` with `import { Type }` FAILS ("Named export not found … CommonJS module") — this is
IRRELEVANT; the project never runs raw-node-ESM on `src/`. The `pi-harness.ts` L1 precedent is proof
the pipeline handles it. (Research §1.)

### Decision 2 — Parity reference is `MCPHandler.jsonSchemaToZodRawShape` (read it first)

The converter is the **TypeBox parallel** of `src/core/mcp-handler.ts` `jsonSchemaToZodRawShape`
(L219-263) + `jsonSchemaPropertyToZod` (L266-308). READ BOTH before implementing — they define the
exact coverage contract (object w/ required/optional, string, number, integer, boolean, array w/
items, nested object, property-less object, unknown→fallback). The TypeBox converter mirrors the
STRUCTURE (public entry → iterate properties → apply optionality → private recursive property
helper with a `switch (type)`) but swaps `z.X()` for `Type.X()`. TypeBox coverage is **≥ Zod** on
every arm and adds: distinct `Type.Integer()` (Zod collapses int→number), real `Type.Union` of
`Type.Literal` for `enum` (Zod ignores enum), and permissive `Type.Any()` for `$ref` (Zod's default
arm). (Research §5.)

### Decision 3 — JSON-Schema `enum:[...]` → `Type.Union(values.map(v => Type.Literal(v)))`

TypeBox `Type.Enum` takes a `Record<string,string|number>` (d.ts L605), NOT an array. JSON-Schema
`enum` IS an array (`{type:'string', enum:['a','b','c']}`). The faithful, idiomatic TypeBox mapping
is a **Union of Literals**: `Type.Union(schema.enum.map((v) => Type.Literal(v)))` →
`{ anyOf:[{const:'a'},{const:'b'},{const:'c'}] }` (exactly the JSON-Schema `anyOf` shape). This
handles mixed string/number enums uniformly and is parity-PLUS (the Zod converter does not model
enum at all). (Research §2a.) Apply the enum check **before** the `type` switch (an `enum` array can
appear with OR without a `type` field in JSON-Schema).

### Decision 4 — `$ref` → `Type.Any()` (S1 has no definitions registry; permissive parity)

TypeBox `Type.Ref(schema)` requires a schema WITH `$id` (d.ts L664), not a string path. S1 is a
**pure function with no registry** (contract: "Mock: none (pure function)"). A local
`$ref: '#/definitions/Foo'` therefore cannot be resolved inline. The parity-correct, safe fallback
is `Type.Any()` — it does not crash, returns a valid `TSchema`, and is permissive (Pi tool-call args
are ACCEPTED, not rejected — critical: you never want a too-strict schema to reject valid LLM args).
This mirrors the Zod converter's default arm (`z.unknown()` for unmatched types, which includes
`$ref`). Check `$ref` FIRST (before `type`/`enum`), matching JSON-Schema precedence. A
registry-aware resolver is an explicit S2+ extension; S1 stays pure. (Research §2b.)

### Decision 5 — Optionality is a VALUE modifier, applied via `Type.Optional(...)`

TypeBox `ObjectOptions` has **no** `required: string[]` field (unlike JSON-Schema). Optionality is a
**modifier on each property VALUE**: `Type.Object({ name: Type.String(), count:
Type.Optional(Type.Number()) })`. `TOptional<T> = T & { modifier: OptionalModifier }` (d.ts L26). To
apply required/optional: build a `Set<string>` from `schema.required`, then for each property, if the
key is NOT in the set, wrap the converted schema in `Type.Optional(...)`. This is a **1:1 mirror** of
`jsonSchemaToZodRawShape` L243-254 (which does `.optional()` on non-required props). (Research §3.)

### Decision 6 — Property-less object `{type:'object'}` → `Type.Record(Type.String(), Type.Any())`

The Zod converter returns `z.record(z.unknown())` for an object with NO `properties` (mcp-handler.ts
L302). The TypeBox analog is `Type.Record(Type.String(), Type.Any())` (d.ts L660, RecordStringType
overload). Do **NOT** return `Type.Object({})` — that is a CLOSED object allowing zero properties,
which would REJECT valid arbitrary LLM args. The Record form is the faithful "open object" mapping.
(Research §6.)

### Decision 7 — File location: `src/harnesses/pi-schema-converter.ts`

The contract offers `src/harnesses/pi-schema-converter.ts` OR a `src/core/mcp-handler.ts` sibling.
**Chosen: `src/harnesses/`.** Rationale: (a) contract's first-listed option; (b) TypeBox is
**Pi-specific** (Pi's `ToolDefinition.parameters: TSchema`; the Claude SDK uses Zod) — co-locating
with `PiHarness` is thematically correct; (c) the natural S2 consumer (`PiHarness.buildCustomTools`,
pi-harness.ts L648-700) already lives in `src/harnesses/` → same-layer import; (d) if S2 instead puts
the bridge on `MCPHandler` (core), the cross-layer import `core → harnesses` is an **already-accepted
pattern** (`src/core/agent.ts:43` imports `from '../harnesses/index.js'`). The converter is a pure
leaf (imports only `@sinclair/typebox` + `type { Tool }` from sdk-primitives) → introduces NO reverse
runtime coupling. (Research §10.)

### Decision 8 — Test assertions via `TypeGuard` (capital-T names) + Optional modifier check

`@sinclair/typebox` exports `namespace TypeGuard` (d.ts L454) with type-narrowing predicates. These
are the cleanest assertions (no Symbol bookkeeping): `TypeGuard.TString(s)`, `TypeGuard.TObject(s)`,
`TypeGuard.TNumber(s)`, `TypeGuard.TInteger(s)`, `TypeGuard.TBoolean(s)`, `TypeGuard.TArray(s)`,
`TypeGuard.TUnion(s)`, `TypeGuard.TLiteral(s)`, `TypeGuard.TAny(s)`, `TypeGuard.TUnknown(s)`,
`TypeGuard.TRecord(s)`. **GOTCHA:** the predicate names are `TypeGuard.TXxx` (capital-T type name),
NOT `TypeGuard.IsXxx` (verified d.ts L456-504). For optionality, import `{ Optional }` from
`@sinclair/typebox` and check `(schema as any).modifier === Optional` (more reliable than guessing a
`TypeGuard.TOptional` name; `Optional` is the exported `Symbol.for('TypeBox.Optional')`). (Research §4.)

### Decision 9 — Reuse `agent-tool-executor.test.ts` L60-130 fixtures as representative shapes

`src/__tests__/unit/agent-tool-executor.test.ts` already declares realistic `input_schema` objects
(e.g. `{type:'object', properties:{message:{type:'string'}}, required:['message']}`). Reuse those
EXACT shapes (plus the shapes enumerated in the Coverage table) as the converter's test fixtures —
they are representative of what real MCP tools declare and they double as a parity smoke-test (the
same shapes the Zod converter must also handle). (Research §9.)

### Decision 10 — S1 CREATES the converter + test; S2 CONSUMES it (no overlap)

S2 (P2.M4.T1.S2) will: (a) add `MCPHandler.toPiCustomTools(): ToolDefinition[]` (or extend
`PiHarness.buildCustomTools`); (b) REPLACE the placeholder `PERMISSIVE_PARAMS` at pi-harness.ts L650
with `parameters: jsonSchemaToTypebox(tool.input_schema)`. S1 does **neither** — it only CREATES
`src/harnesses/pi-schema-converter.ts` + its test. The placeholder in `buildCustomTools` is left
INTACT for S2 to replace (S1 must NOT edit pi-harness.ts). Zero file overlap → both PRPs merge
cleanly. The forward contract: S1 guarantees `jsonSchemaToTypebox(tool.input_schema)` returns a value
assignable to `ToolDefinition.parameters` (`TSchema`) and that the schema is permissive enough
(`Any`/`Unknown` arms) that Pi's runtime validation never rejects valid LLM tool-call args.
(Research §8.)

---

## User Persona

**Target User:** Groundswell core maintainers + the S2 bridge implementer.
- **P2.M4.T1.S2 (`toPiCustomTools`)** — needs a stable, pure, importable
  `jsonSchemaToTypebox(schema)` whose return type is `TSchema` (assignable to
  `ToolDefinition.parameters`). Until S1, S2 has no converter and must keep the permissive
  placeholder (`Type.Object({}, { additionalProperties: true })`, pi-harness.ts L650) → tool args
  are unvalidated → parity with Claude's schema-faithful Zod shapes is impossible.
- **P4.M2.T1.S1 (parity tests)** — asserts the SAME `Tool.input_schema` produces equivalent schema
  fidelity on both harnesses. S1 is the TypeBox half of that parity pair.

**Use Case:** A Groundswell user registers an MCP tool
(`{name:'search', input_schema:{type:'object', properties:{query:{type:'string'}, limit:{type:
'integer'}}, required:['query']}}`). On the default `pi` harness, Pi's `ToolDefinition.parameters`
must carry a faithful TypeBox schema (so the model sees the `query` param is required and `limit` is
an optional integer) — identical in EFFECT to what `claude-code` produces via the Zod converter.

**Pain Points Addressed:** Until S1, the `pi` harness registers tools with a permissive
`additionalProperties:true` placeholder (pi-harness.ts L650) → the model gets NO parameter hints →
worse tool-calling accuracy vs `claude-code`. S1 enables schema-faithful Pi tool registration.

---

## Why

- **Realizes PRD §7.10 + §7.12** — both harnesses receive the SAME tool list; Pi needs TypeBox where
  Claude needs Zod. S1 is the TypeBox half of the shared `MCPHandler` tool-bridge.
- **Delivers tool-schema parity (§7.14.1)** — TypeBox coverage ≥ Zod coverage on every arm.
- **Unblocks S2** — `toPiCustomTools` can now emit real `ToolDefinition[]` with faithful parameters.
- **Improves default-harness quality** — the DEFAULT (`pi`) harness gains schema-faithful tool hints.

---

## What

1. **CREATE** `src/harnesses/pi-schema-converter.ts` — `jsonSchemaToTypebox` (public, pure) +
   `propertyToTypebox` (private recursive) + `Type`/`TSchema` re-export.
2. **CREATE** `src/__tests__/unit/providers/pi-schema-converter.test.ts` — pure-function unit tests
   for every coverage arm (NO mocks).
3. **VALIDATE** (lint / targeted test / full suite / build / grep contract + runtime spot-check).
4. **DO NOT** edit `pi-harness.ts` (the placeholder at L650 is S2's to replace), `mcp-handler.ts`
   (the Zod converter stays as the Claude path), `package.json` (transitive resolution suffices;
   direct dep is a P4 note), or any other file.

### Success Criteria

- [ ] `jsonSchemaToTypebox({type:'object', properties:{a:{type:'string'}}, required:['a']})` returns a
      `TObject` whose `properties.a` is a `TString` (assert `TypeGuard.TObject` + `.properties.a`).
- [ ] Non-required properties are wrapped in `Type.Optional(...)` (assert `(prop).modifier === Optional`).
- [ ] `{type:'string'}`→`TString`; `{type:'number'}`→`TNumber`; `{type:'integer'}`→`TInteger`;
      `{type:'boolean'}`→`TBoolean` (distinct integer vs number — parity+ over Zod).
- [ ] `{type:'array', items:{type:'string'}}`→`TArray` whose `.items` is `TString`; array without
      `items`→`TArray(Type.Unknown())`.
- [ ] `{type:'object', properties:{...}}` (nested) recurses correctly.
- [ ] `{type:'object'}` (no properties)→`TRecord` (`Type.Record(Type.String(), Type.Any())`).
- [ ] `{enum:['a','b']}`→`TUnion` of two `TLiteral`s (`anyOf.length === 2`); mixed-type enum values
      handled (string + number).
- [ ] `{$ref:'#/definitions/Foo'}`→`TAny` (`TypeGuard.TAny`); does NOT throw.
- [ ] Unknown/missing `type` (and no `enum`/`$ref`)→`TUnknown` (`TypeGuard.TUnknown`); does NOT throw.
- [ ] The function is PURE — same input always yields structurally-equal output; no side effects; no
      I/O; no mocks. Deterministic across calls.
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.
- [ ] No import from `@earendil-works/pi-ai` / `@earendil-works/pi-agent-core` (grep clean); converter
      imports ONLY `@sinclair/typebox` + `type { Tool }` from sdk-primitives.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/core/mcp-handler.ts` (`jsonSchemaToZodRawShape` L219-263 +
`jsonSchemaPropertyToZod` L266-308 — the PARITY REFERENCE: copy the structure, swap `z.X()`→`Type.X()`),
`src/types/sdk-primitives.ts` (the `Tool` / `input_schema` type L10-24), `src/harnesses/pi-harness.ts`
(L1 `import { Type } from "@sinclair/typebox"` — the import-style precedent + the L650 placeholder S2
will later replace), `src/__tests__/unit/agent-tool-executor.test.ts` (L60-130 — representative
`input_schema` fixtures to reuse), and (c) the copy-paste-ready snippets in "Implementation Patterns"
+ `research/typebox-converter-api-verified.md`. The ten load-bearing decisions (transitive typebox
resolution, Zod-parity structure, enum→Union-of-Literals, $ref→Any, Optional-as-value-modifier,
property-less object→Record, file location, TypeGuard assertions, fixture reuse, S1/S2 non-overlap)
are proven in the research note.

### Documentation & References

```yaml
# MUST READ — the verified TypeBox API (every builder signature + the non-obvious enum/$ref mappings).
- file: plan/004_9a50e71828f4/P2M4T1S1/research/typebox-converter-api-verified.md
  why: §1 = typebox resolves transitively + the pi-harness.ts L1 import precedent (NO new dep);
       §2 = every Type.* builder signature the converter calls; §2a = enum→Union-of-Literals (NOT Type.Enum);
       §2b = $ref→Type.Any() (no registry in S1); §3 = Optional is a VALUE modifier (mirror Zod .optional());
       §4 = TypeGuard assertion helpers (capital-T names, not IsX); §5 = full JSON-Schema→{Zod|TypeBox} parity table;
       §6 = property-less object→Type.Record; §7 = the concrete function signature; §8 = the S2 forward contract;
       §9 = test strategy (pure, no mocks); §10 = file-location decision.
  critical: §2 (builder sigs), §2a (enum mapping), §2b ($ref fallback), §3 (optionality), §5 (parity table).

# MUST READ — the parity reference (the Zod converter S1 mirrors).
- file: src/core/mcp-handler.ts
  why: L219-263 = jsonSchemaToZodRawShape (the PUBLIC-ENTRY structure to copy: iterate properties →
       build required Set → apply .optional() to non-required → return shape); L266-308 =
       jsonSchemaPropertyToZod (the RECURSIVE helper to copy: switch(type) over string/number/integer/
       boolean/array/object + default→z.unknown()). S1 mirrors BOTH, swapping z.X()→Type.X() and adding
       enum + $ref arms (which the Zod converter lacks).
  pattern: PUBLIC entry handles the top-level object + required/optional; PRIVATE recursive helper
           handles each property/items value. DO NOT edit this file (it's the Claude path).
  gotcha: the Zod converter collapses integer→z.number() (L291); TypeBox keeps Type.Integer() distinct (parity+).

# MUST READ — the input type (what the converter consumes).
- file: src/types/sdk-primitives.ts
  why: L10-24 = `interface Tool { name; description; input_schema: { type:'object'; properties:
       Record<string, unknown>; required?: string[] } }`. The converter's public entry takes
       `Tool['input_schema']`; internal recursion takes `Record<string, unknown>` (properties are
       `unknown` — cast at the property level). Import as `import type { Tool } from '../types/sdk-primitives.js'`.
  pattern: the top-level input_schema is ALWAYS type:'object'; nested properties can be any JSON-Schema shape.

# MUST READ — the import-style precedent + the placeholder S2 will replace.
- file: src/harnesses/pi-harness.ts
  why: L1 = `import { Type } from "@sinclair/typebox";` (COPY this exact import — proves the named CJS
       import compiles + runs under tsc/esbuild/vitest; VERIFIED intact at L1); `buildCustomTools`
       (grep to locate — the S2 consumer site; ~L668 at time of writing) contains
       `const PERMISSIVE_PARAMS = Type.Object({}, { additionalProperties: true });` then
       `parameters: PERMISSIVE_PARAMS,   // placeholder — P2.M4.T1.S1 owns real conversion` (the
       PLACEHOLDER S2 replaces with `jsonSchemaToTypebox(tool.input_schema)` — S1 leaves it intact).
  pattern: S1 uses the same `import { Type } from "@sinclair/typebox"` as L1. S1 does NOT edit this file.
  gotcha: DO NOT touch the PERMISSIVE_PARAMS line — that's S2's edit. S1 only CREATES pi-schema-converter.ts
          + its test. NOTE: S3 (parallel) is editing this file (loadSkills/buildSkillsResourceLoader) so
          line numbers DRIFT — always grep by symbol (`PERMISSIVE_PARAMS`, `buildCustomTools`) not line.

# MUST READ — the external-deps brief (the schema-converter gotcha + bridge requirement).
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.4 = "Schema gotcha: Pi uses TypeBox (TSchema) for parameters, while Claude SDK uses Zod raw
       shapes and Groundswell's MCPServer tools use JSON-Schema (input_schema) → MCPHandler needs a
       schema-converter bridge producing TypeBox for Pi (parallel to the existing jsonSchemaToZodRawShape()
       for Claude)"; §4 = "Required new bridge on MCPHandler: toPiCustomTools(): ToolDefinition[] (plus a
       JSON-Schema → TypeBox converter)". §1.8 gotcha #2 = "Tool parameter schemas are TypeBox — must
       convert from JSON-Schema/Zod."
  critical: §1.4 (the exact gotcha S1 resolves) + §4 (the bridge S1 feeds).

# SHOULD READ — the consumer analysis (the parity rationale + the strategy recommendation).
- file: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: §5 = "Risk: JSON Schema → Zod conversion … does not belong in the shared MCPHandler if Pi wants
       a different shape — consider extracting an McpFormatConverter strategy" (this is WHY S1 is a
       separate file, not a method on MCPHandler); §5 "How a harness delegates" steps 4-5 = the Pi path
       (toPiCustomTools bridge → toolExecutor). Confirms S1's converter is the extracted, Pi-specific half.

# SHOULD READ — representative input_schema fixtures to reuse in tests.
- file: src/__tests__/unit/agent-tool-executor.test.ts
  why: L60-130 = realistic `input_schema` objects (e.g. `{type:'object', properties:{message:{type:
       'string'}}, required:['message']}`). Reuse these EXACT shapes as converter test fixtures — they
       are representative of real MCP tools AND double as a Zod-converter parity smoke-test.
  pattern: copy the input_schema objects verbatim into the test's fixture block.

# REFERENCE — the TypeBox type declarations (read-only, for signature verification).
- file: node_modules/@sinclair/typebox/typebox.d.ts
  why: L49 TSchema; L64 TAny; L73 TArray; L85 TBoolean; L131 TEnum; L189 TLiteral; L211 TNumber;
       L230 TProperties; L239 TObject; L26 TOptional; L331 TString; L383 TUnion; L400 TUnknown.
       L454 TypeGuard namespace (predicate names = TypeGuard.TXxx, capital-T). L591-714 Type builders.
  gotcha: Type.Enum (L605) takes Record<string,string|number>, NOT an array — use Union-of-Literals instead.
```

### Current Codebase tree (relevant slice)

```bash
src/core/
└── mcp-handler.ts            # READ-ONLY parity reference (jsonSchemaToZodRawShape L219-263; jsonSchemaPropertyToZod L266-308). DO NOT EDIT.
src/types/
└── sdk-primitives.ts         # CONSUMER (Tool / input_schema type L10-24 — import type { Tool })
src/harnesses/
├── pi-harness.ts             # READ-ONLY (L1 import precedent; L650 placeholder S2 replaces). DO NOT EDIT in S1.
└── pi-schema-converter.ts    # ← NEW (jsonSchemaToTypebox + propertyToTypebox + Type/TSchema re-export)
src/__tests__/unit/providers/
└── pi-schema-converter.test.ts   # ← NEW (pure-function unit tests; TypeGuard assertions)
node_modules/@sinclair/typebox/typebox.d.ts   # READ-ONLY (Type builders L591-714; TypeGuard L454; TSchema/TObject/etc L26-400)
# (agent.ts, mcp-handler.ts, all other harnesses, barrels, package.json — UNTOUCHED by S1.)
```

### Desired Codebase tree with files to be added

```bash
src/harnesses/pi-schema-converter.ts                   # NEW — the pure converter (exports jsonSchemaToTypebox + Type)
src/__tests__/unit/providers/pi-schema-converter.test.ts   # NEW — unit tests (no mocks)
# (buildCustomTools placeholder at pi-harness.ts L650 is S2's to replace — S1 leaves it.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — @sinclair/typebox resolves TRANSITIVELY (v0.27.8). src/harnesses/pi-harness.ts L1
//   already does `import { Type } from "@sinclair/typebox"` and compiles + tests green. S1 uses the
//   IDENTICAL import. NO new package.json dependency is needed for S1. (Adding a direct dep is a P4
//   cleanup note — do NOT do it in S1.) A raw `node ./probe.mjs` with this import FAILS, but that's
//   irrelevant: the project never runs raw-node-ESM on src (tsc esModuleInterop + vitest/esbuild both
//   handle the CJS→ESM named-import interop). (Decision 1.)

// CRITICAL #2 — TypeBox Type.Enum takes a Record<string,string|number>, NOT an array (d.ts L605).
//   JSON-Schema enum IS an array. Map via Type.Union(values.map(v => Type.Literal(v))) — NOT Type.Enum.
//   Handles mixed string/number enums uniformly. Check `enum` BEFORE the `type` switch (enum can
//   appear with or without a type field). (Decision 3.)

// CRITICAL #3 — TypeBox Type.Ref requires a schema WITH $id (d.ts L664), not a string path. S1 has
//   NO definitions registry (pure function). Map $ref → Type.Any() (permissive; parity with Zod
//   converter's default z.unknown() arm). Check $ref FIRST (JSON-Schema precedence). Do NOT throw on
//   $ref. (Decision 4.)

// CRITICAL #4 — Optionality is a VALUE modifier: Type.Optional(Type.String()), applied per-property.
//   ObjectOptions has NO `required:[]` field. Build a Set from schema.required; wrap non-required
//   property values in Type.Optional(...). 1:1 mirror of jsonSchemaToZodRawShape L243-254. (Decision 5.)

// CRITICAL #5 — Property-less object {type:'object'} (no properties) → Type.Record(Type.String(),
//   Type.Any()). Do NOT return Type.Object({}) — that's a CLOSED empty object that would reject valid
//   arbitrary LLM args. The Record form is the faithful "open object" (parity with z.record(z.unknown())). (Decision 6.)

// CRITICAL #6 — The converter must NEVER throw on unrecognized input. Unknown/missing `type` (and no
//   enum/$ref) → Type.Unknown(). $ref → Type.Any(). This guarantees Pi's runtime tool-call validation
//   never rejects valid LLM args due to an unmodeled schema shape. Permissive > strict for tool params.

// CRITICAL #7 — TypeBox imports: `import { Type, type TSchema } from "@sinclair/typebox"` (named CJS
//   import; works via esModuleInterop under tsc + via esbuild under vitest — proven by pi-harness.ts L1).
//   For Optional-modifier detection in tests: `import { TypeGuard, Optional } from "@sinclair/typebox"`;
//   check `(schema as any).modifier === Optional`. TypeGuard predicates are TypeGuard.TXxx (capital-T),
//   NOT TypeGuard.IsXxx. (Decision 8.)

// GOTCHA #8 — isolatedModules: true (tsconfig.json). Re-exporting `Type` (a value) is fine
//   (`export { Type } from "@sinclair/typebox"`); re-exporting `TSchema` (a type) MUST be type-only:
//   `export { Type } from "@sinclair/typebox"; export type { TSchema } from "@sinclair/typebox";`.
//   OR a single `export { Type, type TSchema } from "@sinclair/typebox";` (inline type modifier).

// GOTCHA #9 — Tool['input_schema'] is typed { type:'object'; properties: Record<string, unknown>;
//   required?: string[] }. But nested properties are `unknown`. The converter's PUBLIC entry takes
//   `Tool['input_schema']` (top-level always object); the PRIVATE recursive helper takes
//   `Record<string, unknown>` and reads `prop.type` / `prop.enum` / `prop.$ref` / `prop.items` /
//   `prop.properties` via casts. Keep the cast surface minimal and local.

// GOTCHA #10 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   pi-schema-converter.ts (proving the impl compiles + no forbidden transitive import + the Type
//   re-export is valid). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH gates.

// GOTCHA #11 — DO NOT edit pi-harness.ts. The placeholder `PERMISSIVE_PARAMS` (grep to locate; ~L673
//   at time of writing, DRIFTS as S3 lands in parallel) is S2's to replace with
//   `jsonSchemaToTypebox(tool.input_schema)`. S1 only CREATES the converter + test. Editing
//   buildCustomTools would conflict with S2 (parallel). (Decision 10.)

// GOTCHA #12 — DO NOT edit mcp-handler.ts. The Zod converter (jsonSchemaToZodRawShape +
//   jsonSchemaPropertyToZod) is the CLAUDE path and the PARITY REFERENCE (read-only). S1 is the
//   Pi-specific parallel in a SEPARATE file. Keeping them separate is the consumer-analysis §5
//   recommendation ("extracting an McpFormatConverter strategy").

// GOTCHA #13 — JSON-Schema `type` can be an ARRAY (e.g. ["string","null"] for nullable). The Zod
//   converter does NOT handle this (falls to default). For parity, S1 may treat a type array as
//   Type.Unknown() OR build a Union — OPTIONAL enhancement; the contract lists "basics" only. Keep
//   S1 minimal: a type array → Type.Unknown() (permissive). Document if you go further.

// GOTCHA #14 — The converter is consumed by S2 which may call it eagerly per-tool. Keep it cheap
//   (no caching needed at S1 scale — a handful of tools). Pure + deterministic means S2 can memoize
//   externally if ever needed.
```

---

## Implementation Blueprint

### Data models and structure

NO new data models. The converter consumes `Tool['input_schema']` (existing, sdk-primitives.ts L10-24)
and produces `TSchema` (existing, from `@sinclair/typebox`). It is a **pure leaf module**: imports
`{ Type, type TSchema }` from `@sinclair/typebox` + `type { Tool }` from sdk-primitives; exports
`jsonSchemaToTypebox` + re-exports `Type`/`TSchema`. No classes, no state, no I/O.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline (S2 may be in flight in parallel; it edits pi-harness.ts L650
        + adds toPiCustomTools — S1 does NOT touch either).
  - RUN: `grep -nE "jsonSchemaToZodRawShape|jsonSchemaPropertyToZod" src/core/mcp-handler.ts` → confirm
        the parity reference exists (L219 + L266). READ L219-308 to internalize the structure to mirror.
  - RUN: `grep -n 'import { Type } from "@sinclair/typebox"' src/harnesses/pi-harness.ts` → 1 hit (L1).
        Confirms the named CJS import compiles + runs in-pipeline (Decision 1).
  - RUN: `node -e "console.log(require.resolve('@sinclair/typebox'))"` → resolves to
        node_modules/@sinclair/typebox/typebox.js. Confirms transitive availability.
  - RUN: `grep -nE "Type\.(Enum|Union|Literal|Optional|Object|Record|Array|Any|Unknown|Integer|Number|String|Boolean)" node_modules/@sinclair/typebox/typebox.d.ts | head` → sanity-check builder names.
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before adding S1's file.

Task 1: CREATE src/harnesses/pi-schema-converter.ts (the converter)
  - IMPORTS: `import { Type, type TSchema } from "@sinclair/typebox";` (named CJS import — identical
        style to pi-harness.ts L1) + `import type { Tool } from "../types/sdk-primitives.js";`.
  - RE-EXPORT (so S2 imports everything from one module): `export { Type } from "@sinclair/typebox";`
        and `export type { TSchema } from "@sinclair/typebox";` (two statements — type-only for TSchema;
        isolatedModules-safe). Place at top of file after the converter's own import.
  - PUBLIC ENTRY: `export function jsonSchemaToTypebox(schema: Tool['input_schema'] | Record<string,
        unknown>): TSchema`. Structure (mirror jsonSchemaToZodRawShape L219-263):
        (a) read `properties = (schema as any).properties ?? {}`; build `props: Record<string, TSchema>`.
        (b) for each [key, value] in Object.entries(properties): `props[key] = propertyToTypebox(value)`.
        (c) build `requiredSet = new Set((schema as any).required ?? [])`.
        (d) for each key NOT in requiredSet: `props[key] = Type.Optional(props[key])`.
        (e) if `properties` was absent/empty AND schema.type === 'object' → return Type.Record(
            Type.String(), Type.Any()) (Decision 6); else return Type.Object(props).
        Edge: if schema has no `type` / isn't an object → return Type.Unknown() (defensive default).
  - PRIVATE HELPER: `function propertyToTypebox(prop: Record<string, unknown>): TSchema` (mirror
        jsonSchemaPropertyToZod L266-308). Order of checks (JSON-Schema precedence):
        1. `if (typeof prop.$ref === 'string') return Type.Any();` (Decision 4).
        2. `if (Array.isArray(prop.enum) && prop.enum.length) return Type.Union(prop.enum.map((v) =>
           Type.Literal(v)));` (Decision 3 — BEFORE the type switch; handles enum with/without type).
        3. `switch (prop.type)`:
             'string'  → Type.String();
             'number'  → Type.Number();
             'integer' → Type.Integer();   (parity+ over Zod's z.number())
             'boolean' → Type.Boolean();
             'array'   → prop.items ? Type.Array(propertyToTypebox(prop.items)) : Type.Array(Type.Unknown());
             'object'  → prop.properties ? recurse (build Type.Object with required/optional, OR delegate
                          back to jsonSchemaToTypebox(prop)) : Type.Record(Type.String(), Type.Any());
             default   → Type.Unknown();   (incl. missing type, type arrays, null — Decision GOTCHA #13)
  - JSDOC on jsonSchemaToTypebox: cite PRD §7.10/§7.12/§7.14.1; state "PURE function — no I/O, no
        mocks, no definitions registry"; list coverage (object/string/number/integer/boolean/array/
        enum/$ref); note "$ref → Type.Any() (permissive; registry is an S2+ extension)" and "parity
        with MCPHandler.jsonSchemaToZodRawShape (Claude path)".
  - VERIFY (grep): `grep -nE "export function jsonSchemaToTypebox|import \{ Type|from \"@sinclair/typebox\"|Type\.Union\(|Type\.Literal\(|Type\.Optional\(|Type\.Record\(|Type\.Any\(\)|Type\.Integer\(|Type\.Unknown\(\)" src/harnesses/pi-schema-converter.ts` → all present.
  - VERIFY (NO forbidden import): `! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core|from \"zod\"" src/harnesses/pi-schema-converter.ts` → exit 1 (no match).
  - VERIFY (did NOT edit pi-harness.ts / mcp-handler.ts): `git diff --name-only` lists ONLY
        src/harnesses/pi-schema-converter.ts (new) + the new test file (Task 3).

Task 2: CREATE src/__tests__/unit/providers/pi-schema-converter.test.ts (the suite — NO mocks)
  - IMPORTS: `import { describe, it, expect } from 'vitest';` + `import { jsonSchemaToTypebox, Type }
        from '../../../harnesses/pi-schema-converter.js';` + `import { TypeGuard, Optional } from
        '@sinclair/typebox';`.
  - FIXTURES: copy the input_schema shapes from src/__tests__/unit/agent-tool-executor.test.ts L60-130
        (e.g. `{type:'object', properties:{message:{type:'string'}}, required:['message']}`) into a
        top-level `const FIXTURES = {...}` block (Decision 9). Add: nested object, number, integer,
        boolean, array-of-strings, array-of-objects, enum (string), enum (mixed), $ref, unknown-type,
        property-less object.
  - STRUCTURE: `describe('jsonSchemaToTypebox', () => { ... })` with one `it` per coverage arm.
  - ASSERTION HELPERS: TypeGuard.TObject/TString/TNumber/TInteger/TBoolean/TArray/TUnion/TLiteral/
        TAny/TUnknown/TRecord (capital-T names — Decision 8). For optionality: `(schema as any)
        .modifier === Optional` (import Optional from @sinclair/typebox).
  - CASES:
      object required+optional: convert {type:'object', properties:{a:{type:'string'}, b:{type:
        'number'}}, required:['a']} → TypeGuard.TObject(out); out.properties.a is TString; out.properties
        .b.modifier === Optional (b is optional).
      nested object: convert {type:'object', properties:{inner:{type:'object', properties:{x:{type:
        'string'}}}}} → recurse; out.properties.inner is TObject with properties.x TString.
      string: {type:'string'} (as a property value) → TString. (Test via propertyToTypebox by wrapping
        in an object, OR test the public entry with a property.)
      number: → TNumber. integer: → TInteger (assert DISTINCT from number — parity+).
      boolean: → TBoolean.
      array of strings: {type:'array', items:{type:'string'}} → TArray; out.items is TString.
      array without items: {type:'array'} → TArray; out.items is TUnknown.
      enum string: {enum:['a','b','c']} → TUnion; out.anyOf.length === 3; each entry is TLiteral.
      enum mixed: {enum:['a', 1]} → TUnion anyOf.length === 2 (mixed string+number literals).
      $ref: {$ref:'#/definitions/Foo'} → TAny; does NOT throw.
      unknown type: {type:'foobar'} → TUnknown; missing type (no enum/$ref) {} → TUnknown.
      property-less object: {type:'object'} (no properties) → TRecord (TypeGuard.TRecord).
      parity smoke: convert FIXTURES from agent-tool-executor.test.ts → each yields a TObject without
        throwing; spot-check one property type.
      purity: call twice with same input → structurally equal (compare JSON.stringify(out1) ===
        JSON.stringify(out2)); no side effects.
  - PLACEMENT: src/__tests__/unit/providers/ (mirrors pi-schema-converter.ts in src/harnesses/;
        established home for harness-adjacent unit tests).

Task 3: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted test, full suite, build, grep contract, runtime spot-check.
  - If lint fails on the Type re-export: ensure `export type { TSchema }` (type-only) and
        `export { Type }` (value) are SEPARATE statements (or inline `type` modifier) — isolatedModules.
  - If lint fails on `import { Type }`: confirm the import string is exactly "@sinclair/typebox"
        (NOT "typebox" — Pi uses the bare "typebox" alias internally, but Groundswell resolves the
        scoped name; pi-harness.ts L1 uses "@sinclair/typebox"). Match L1 exactly.
  - If a test fails on optionality: verify propertyToTypebox wraps the VALUE in Type.Optional at the
        OBJECT-ENTRY level (jsonSchemaToTypebox), not inside propertyToTypebox (which builds the bare
        type). Re-check Decision 5 + mcp-handler.ts L243-254.
  - If a test fails on enum: verify the enum check is BEFORE the type switch and uses Type.Union +
        Type.Literal (NOT Type.Enum).
```

### Implementation Patterns & Key Details

```ts
// === The converter file skeleton (src/harnesses/pi-schema-converter.ts) ===
import { Type, type TSchema } from "@sinclair/typebox";
import type { Tool } from "../types/sdk-primitives.js";

// Re-export so S2 imports converter + builders from ONE module (contract: "Export Type.Type.* builders").
export { Type } from "@sinclair/typebox";
export type { TSchema } from "@sinclair/typebox";

/**
 * Convert a Groundswell Tool JSON-Schema (input_schema) into a TypeBox TSchema for Pi's
 * ToolDefinition.parameters (PRD §7.10, §7.12, §7.14.1). PURE function — no I/O, no mocks, no
 * definitions registry. Parallel to MCPHandler.jsonSchemaToZodRawShape() (the Claude Code SDK path).
 *
 * Coverage (parity+ over the Zod converter on every arm):
 *   - object (required/optional via Type.Optional, nested, open → Type.Record)
 *   - string / number / integer (distinct) / boolean
 *   - array (items recursive; no items → Type.Unknown)
 *   - enum → Type.Union(values.map(Type.Literal))   [JSON-Schema array, NOT Type.Enum's Record]
 *   - $ref  → Type.Any()   [permissive; no registry in S1; S2+ may extend]
 *   - unknown/missing type → Type.Unknown()
 *
 * @param schema - Tool['input_schema'] (top-level always an object) or a nested JSON-Schema fragment.
 * @returns A TypeBox TSchema assignable to ToolDefinition.parameters.
 */
export function jsonSchemaToTypebox(
  schema: Tool["input_schema"] | Record<string, unknown>,
): TSchema {
  const s = schema as Record<string, unknown>;

  // Defensive: top-level must be an object.
  if (s.type !== "object") {
    return Type.Unknown();
  }

  const properties = (s.properties ?? {}) as Record<string, Record<string, unknown>>;
  const requiredSet = new Set((s.required ?? []) as string[]);

  // Property-less object → open record (parity with z.record(z.unknown())); NOT Type.Object({}).
  if (Object.keys(properties).length === 0) {
    return Type.Record(Type.String(), Type.Any());
  }

  // Build each property's schema, then apply optionality to non-required values (mirror Zod L243-254).
  const props: Record<string, TSchema> = {};
  for (const [key, value] of Object.entries(properties)) {
    const converted = propertyToTypebox(value);
    props[key] = requiredSet.has(key) ? converted : Type.Optional(converted);
  }
  return Type.Object(props);
}

/**
 * Convert a single JSON-Schema property/fragment to a TypeBox TSchema (recursive).
 * Mirrors MCPHandler.jsonSchemaPropertyToZod (mcp-handler.ts L266-308), + enum + $ref arms.
 */
function propertyToTypebox(prop: Record<string, unknown>): TSchema {
  // $ref → permissive Any (S1 has no registry; parity with Zod default arm). Check FIRST.
  if (typeof prop.$ref === "string") {
    return Type.Any();
  }

  // enum (array) → Union of Literals (Type.Enum takes a Record, not an array — use Union). Check BEFORE type.
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    return Type.Union((prop.enum as (string | number | boolean | null)[]).map((v) => Type.Literal(v)));
  }

  switch (prop.type) {
    case "string":
      return Type.String();
    case "number":
      return Type.Number();
    case "integer":
      return Type.Integer(); // parity+ (Zod collapses int→number; TypeBox keeps distinct)
    case "boolean":
      return Type.Boolean();
    case "array":
      return Type.Array(
        prop.items ? propertyToTypebox(prop.items as Record<string, unknown>) : Type.Unknown(),
      );
    case "object":
      // Delegate back to the public entry (handles nested required/optional + open-record).
      return jsonSchemaToTypebox(prop);
    default:
      // unknown type, type arrays (e.g. ["string","null"]), missing type → permissive Unknown.
      return Type.Unknown();
  }
}

// === TEST assertion patterns (src/__tests__/unit/providers/pi-schema-converter.test.ts) ===
import { TypeGuard, Optional } from "@sinclair/typebox";

// Optionality check (Decision 8):
const out = jsonSchemaToTypebox({
  type: "object",
  properties: { a: { type: "string" }, b: { type: "number" } },
  required: ["a"],
}) as any;
expect(TypeGuard.TObject(out)).toBe(true);
expect(TypeGuard.TString(out.properties.a)).toBe(true);
expect((out.properties.b as any).modifier === Optional).toBe(true); // b is optional

// Enum check:
const en = jsonSchemaToTypebox({
  type: "object",
  properties: { mode: { type: "string", enum: ["fast", "slow"] } },
}) as any;
expect(TypeGuard.TUnion(en.properties.mode)).toBe(true);
expect(en.properties.mode.anyOf.length).toBe(2);
```

### Integration Points

```yaml
NO INTEGRATION CHANGES in S1. The converter is a pure leaf. Specifically:
  - DATABASE: none.
  - CONFIG: none (no new env vars; transitive typebox resolution is automatic).
  - ROUTES: none.
  - PUBLIC API (src/index.ts): NOT modified in S1. The converter is an INTERNAL harness utility;
    P3.M3.T1.S1 owns the public-export sweep. (If desired, S1 MAY add `export { jsonSchemaToTypebox }
    from './harnesses/pi-schema-converter.js'` to src/index.ts — OPTIONAL; the contract does not
    require a public export. Default: keep internal; S2 imports it directly via relative path.)
  - PI-HARNESS: NOT modified (the L650 placeholder is S2's to replace — GOTCHA #11).
  - MCP-HANDLER: NOT modified (the Zod converter is the Claude path + parity reference — GOTCHA #12).
  - PACKAGE.JSON: NOT modified (typebox resolves transitively; direct dep is a P4 note — Decision 1).

FORWARD CONTRACT (S2 will consume):
  - S2 import: `import { jsonSchemaToTypebox } from "./pi-schema-converter.js";` (relative, same dir).
  - S2 usage (replaces pi-harness.ts L650 placeholder):
        parameters: jsonSchemaToTypebox(tool.input_schema),
  - S1 guarantees: return type is TSchema (assignable to ToolDefinition.parameters); schema is
    permissive (Any/Unknown arms) so Pi runtime validation never rejects valid LLM tool-call args.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating pi-schema-converter.ts — fix before proceeding
npm run lint          # = tsc --noEmit; type-checks src/ (EXCLUDES src/__tests__ per tsconfig).
                      # Proves: import { Type, type TSchema } compiles; Tool['input_schema'] import
                      # resolves; the Type/TSchema re-exports are isolatedModules-safe; NO forbidden
                      # transitive import (pi-ai / pi-agent-core / zod).

# Expected: Zero errors. If errors: see GOTCHA #8 (type-only re-export), Decision 1 (import string),
# GOTCHA #9 (cast surface). READ the output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the converter in isolation (NO mocks — pure function)
npx vitest run src/__tests__/unit/providers/pi-schema-converter.test.ts

# Expected: ALL cases pass (object required/optional, nested, string, number, integer, boolean,
# array w/ + w/o items, enum string + mixed, $ref → Any, unknown → Unknown, property-less → Record,
# parity smoke, purity). If failing: see Decision 3 (enum), Decision 4 ($ref), Decision 5 (optionality).
```

### Level 3: Integration Testing (System Validation)

```bash
# Full regression suite — S1 adds a pure leaf module; NOTHING else changes, so the suite MUST stay green.
npm test

# Build — emits dist/harnesses/pi-schema-converter.{js,d.ts} with jsonSchemaToTypebox + Type re-export.
npm run build
ls -la dist/harnesses/pi-schema-converter.*   # confirm emit

# Runtime spot-check (vitest inline) — convert a representative schema and assert structure:
npx vitest run src/__tests__/unit/providers/pi-schema-converter.test.ts -t "object required"

# Expected: full suite green (no regressions — S1 touched no existing file); dist emits the new module.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# PARITY SMOKE — feed the SAME input_schema through BOTH converters and confirm both produce a valid
# schema without throwing (the structural EQUIVALENCE assertion is P4.M2.T1.S1's job; S1 only confirms
# no-throw + faithful TypeBox structure). Inline via vitest:
npx vitest run src/__tests__/unit/providers/pi-schema-converter.test.ts -t "parity smoke"

# GREP CONTRACT — verify every load-bearing symbol is present + no forbidden imports:
grep -nE "export function jsonSchemaToTypebox|import \{ Type|from \"@sinclair/typebox\"|Type\.Union\(|Type\.Literal\(|Type\.Optional\(|Type\.Record\(|Type\.Any\(\)|Type\.Integer\(|Type\.Unknown\(\)" src/harnesses/pi-schema-converter.ts
! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core|from \"zod\"" src/harnesses/pi-schema-converter.ts   # exit 1 = pass
git diff --name-only   # ONLY: src/harnesses/pi-schema-converter.ts + src/__tests__/unit/providers/pi-schema-converter.test.ts (both NEW)

# Expected: all grep hits present; no forbidden imports; diff touches ONLY the 2 new files (S1 edits
# nothing existing — GOTCHA #11/#12). pi-harness.ts L650 placeholder is UNCHANGED (S2's to replace).
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (`tsc --noEmit` on src/ — converter compiles; re-exports isolatedModules-safe).
- [ ] `npm test` exits 0 (new suite + full regression green — S1 is a pure leaf, no regressions).
- [ ] `npm run build` exits 0 (`dist/harnesses/pi-schema-converter.{js,d.ts}` emits).
- [ ] No forbidden imports (grep: no `@earendil-works/pi-ai`, `pi-agent-core`, or `zod` in the converter).
- [ ] `git diff --name-only` lists ONLY the 2 new files (pi-harness.ts + mcp-handler.ts UNTOUCHED).

### Feature Validation

- [ ] All success-criteria coverage arms pass (object/string/number/integer/boolean/array/enum/$ref/unknown/record).
- [ ] Optionality correct (non-required props wrapped in `Type.Optional`; modifier === `Optional`).
- [ ] Enum mapped via `Type.Union` of `Type.Literal` (NOT `Type.Enum`).
- [ ] `$ref` → `Type.Any()` (permissive; no throw).
- [ ] Property-less object → `Type.Record(Type.String(), Type.Any())` (NOT `Type.Object({})`).
- [ ] `integer` distinct from `number` (parity+ over the Zod converter).
- [ ] Function is pure + deterministic (same input → structurally-equal output; no side effects).
- [ ] Parity smoke: the `agent-tool-executor.test.ts` fixtures convert without throwing.

### Code Quality Validation

- [ ] Mirrors the structure of `jsonSchemaToZodRawShape` + `jsonSchemaPropertyToZod` (parity reference).
- [ ] File placement matches the desired tree (`src/harnesses/pi-schema-converter.ts`).
- [ ] Anti-patterns avoided (no `Type.Enum` for arrays; no `Type.Object({})` for open objects; no throwing
      on unrecognized input; no editing of pi-harness.ts/mcp-handler.ts/package.json).
- [ ] Re-exports `Type` + `TSchema` so S2 imports from one module.
- [ ] JSDoc cites PRD §7.10/§7.12/§7.14.1 + states purity + lists coverage + the $ref-permissive note.

### Documentation & Deployment

- [ ] Code is self-documenting (clear function/param names; JSDoc on the public entry).
- [ ] The $ref → Any and enum → Union-of-Literals decisions are documented in JSDoc (non-obvious mappings).
- [ ] No new env vars. No new dependencies (transitive typebox; direct-dep recommendation is a P4 note).

---

## Anti-Patterns to Avoid

- ❌ Don't use `Type.Enum` for JSON-Schema `enum` (it takes a Record, not an array) — use `Type.Union` of `Type.Literal`.
- ❌ Don't return `Type.Object({})` for a property-less object (closed/empty → rejects valid args) — use `Type.Record`.
- ❌ Don't throw on unrecognized input / `$ref` (permissive `Type.Any()`/`Type.Unknown()` — never reject valid LLM args).
- ❌ Don't apply optionality at the object level (`ObjectOptions` has no `required`) — wrap each property VALUE in `Type.Optional`.
- ❌ Don't collapse `integer` → `number` (TypeBox keeps them distinct; parity+ over Zod).
- ❌ Don't edit `pi-harness.ts` (the L650 placeholder is S2's) or `mcp-handler.ts` (the Zod converter is the Claude path + parity reference).
- ❌ Don't add `@sinclair/typebox` as a direct `package.json` dep in S1 (transitive resolution suffices; direct dep is a P4 cleanup).
- ❌ Don't import from `@earendil-works/pi-ai` / `pi-agent-core` (non-hoisted transitives → MODULE_NOT_FOUND).
- ❌ Don't skip the purity test (the converter MUST be deterministic + side-effect-free for S2 to trust/memoize it).
- ❌ Don't create new patterns when the `jsonSchemaToZodRawShape` structure works — mirror it, swap `z.X()`→`Type.X()`.

---

## Confidence Score

**9/10** — One-pass success is highly likely because: (a) the converter is a SMALL, PURE leaf
(single file, ~50 LOC, no state/I/O/mocks); (b) the parity reference (`jsonSchemaToZodRawShape`) is
in-repo and explicitly structurally mirrored; (c) every TypeBox builder signature is verified in the
research note; (d) the import-style precedent (`pi-harness.ts` L1) proves the named CJS typebox
import compiles + runs in-pipeline; (e) the non-obvious mappings (enum→Union-of-Literals, $ref→Any,
Optional-as-value-modifier, property-less→Record) are all documented with rationale + copy-paste
snippets. The 1-point residual risk: TypeBox `TypeGuard` predicate-name drift (capital-T vs IsX) —
mitigated by Decision 8 + the Optional-modifier fallback check.

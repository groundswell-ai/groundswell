# Research Findings — P3.M3.T1.S1: Export Harness surface + deprecated aliases in src/index.ts

## 1. Verified current state (post P1/P2/early-P3)

### `src/index.ts` (PUBLIC API barrel)
- **Lines 1–76**: ONE big `export type { ... } from './types/index.js'` block. ALL public types flow
  through `./types/index.js`. Contains a `// Provider types` comment section listing `Provider,
  ProviderId, ProviderCapabilities, ProviderOptions, ProviderExecutionOptions, ProviderRequest,
  ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult, ModelSpec, ToolExecutor,
  ProviderResult, ProviderResponseStatus, ProviderErrorDetails, ProviderResponseMetadata,
  GlobalProviderConfig`.
- **Line 117**: `export { ClaudeCodeHarness, AnthropicProvider } from './harnesses/claude-code-harness.js';`
  ✅ BOTH already exported (ClaudeCodeHarness from P2.M1.T1.S1; AnthropicProvider is the deprecated alias = `export const AnthropicProvider = ClaudeCodeHarness;` at claude-code-harness.ts:1309).
- **Line 118**: `export { HarnessRegistry, ProviderRegistry } from './harnesses/harness-registry.js';`
  ✅ BOTH already exported (HarnessRegistry from P1.M2.T1.S2; ProviderRegistry = `export type/const ProviderRegistry = HarnessRegistry;` at harness-registry.ts:615/623).
- **NOT exported from public API**: `PiHarness`, `configureHarnesses`, `parseModelSpec`,
  `formatModelForProvider`, and ALL `Harness*` types. (`configureHarnesses` lives in
  `src/utils/harness-config.ts`; `parseModelSpec`/`formatModelForProvider` in `src/utils/model-spec.ts`;
  both re-exported by `src/utils/index.ts` but NOT lifted to `src/index.ts`.)

### `src/types/index.ts` (TYPE barrel — feeds `src/index.ts`)
- `// Provider types` block re-exports from `./providers.js` and INCLUDES `ModelSpec` (line 41),
  `ToolExecutionRequest`, `ToolExecutionResult`.
- **Does NOT re-export any harness types** — no `Harness`, `HarnessId`, etc. THIS MUST BE ADDED.

### `src/types/harnesses.ts` — CANONICAL home of all Harness* types
Exports: `HarnessId`, `ModelProviderId`, `HarnessCapabilities`, `HarnessOptions`, `HarnessHookEvents`,
`ToolExecutionRequest`, `ToolExecutionResult`, `HarnessExecutionOptions`, `HarnessRequest`, `ModelSpec`,
`Harness`, `GlobalHarnessConfig`, plus type-only `declare function parseModelSpec`/`formatModelForProvider`.

### `src/types/providers.ts` — now an ALIAS SHIM (P1.M1.T3.S1)
- Imports `ModelSpec, ToolExecutionRequest, ToolExecutionResult` from `./harnesses.js` (lines 23–25).
- Re-exports them: `export type { ModelSpec };` (L103), `export type { ToolExecutionRequest, ToolExecutionResult };` (L108).
- **Same identity** as the harnesses.ts originals — re-exporting the same name from two different
  source files in ONE barrel = TS2308 duplicate-export error.

## 2. ⚠️ THE CRITICAL GOTCHA — `ModelSpec` duplicate-export

If `src/types/index.ts` adds a `// Harness types` block:
```ts
export type { ..., ModelSpec, ... } from './harnesses.js';
```
while the existing `// Provider types` block STILL has:
```ts
export type { ..., ModelSpec, ... } from './providers.js';
```
→ **`tsc` error**: "Module has already exported a member named 'ModelSpec'" / duplicate identifier.

**Resolution (the ONLY safe one):** REMOVE `ModelSpec` from the Provider types block in
`src/types/index.ts` and place it (once) in the new Harness types block. Consumers see no difference —
`ModelSpec` resolves to the identical type (providers.ts just aliases it). `src/index.ts`'s single
big `export type {} from './types/index.js'` block is unaffected (it lists `ModelSpec` once regardless).

Note: `ToolExecutionRequest` / `ToolExecutionResult` are NOT in the item's harness-types list, so they
stay in the Provider block (no dedup needed for them — only `ModelSpec` is listed in both places AND
in the item's harness list).

## 3. Item-specified harness types to export (PRD §7.2–§7.8)
`Harness`, `HarnessId`, `ModelProviderId`, `HarnessCapabilities`, `HarnessOptions`, `HarnessRequest`,
`HarnessHookEvents`, `GlobalHarnessConfig`, `ModelSpec`. (9 names; `ModelSpec` already public via
provider alias → must MOVE not duplicate in types/index.ts.)

## 4. Class + function exports to add to public API
- `PiHarness` from `./harnesses/pi-harness.js` (class at pi-harness.ts:78). NOT in `src/harnesses/index.ts`
  barrel either — import directly from the source file, matching how ClaudeCodeHarness is imported.
- `configureHarnesses` from `./utils/harness-config.js`.
- `parseModelSpec`, `formatModelForProvider` from `./utils/model-spec.js` (RUNTIME implementations —
  NOT the type-only `declare` versions in harnesses.ts; see harnesses.ts L492–496 consumer guidance).

**Intentionally NOT added (out of scope):** `getGlobalHarnessConfig`, `resolveHarnessConfig`,
`resetGlobalHarnessConfig` (consumed internally by `src/core/agent.ts`; item lists only
`configureHarnesses`); `configureProviders` legacy alias (was never in the public API; only in
`utils/index.ts`).

## 5. Backward-compat aliases that MUST remain intact (now deprecated)
Already exported; do NOT remove: `Provider, ProviderId, ProviderCapabilities, ProviderOptions,
ProviderExecutionOptions, ProviderRequest, ProviderHookEvents, ToolExecutionRequest,
ToolExecutionResult, ToolExecutor, ProviderResult, ProviderResponseStatus, ProviderErrorDetails,
ProviderResponseMetadata, GlobalProviderConfig` (types) + `AnthropicProvider`, `ProviderRegistry`
(classes). The `@deprecated` JSDoc lives on the source types in `providers.ts` (P1.M1.T3.S1) —
re-export barrels don't carry JSDoc, so no edit needed to mark them.

## 6. Test pattern (precedent)
`src/__tests__/unit/agent-response-public-api.test.ts`: imports from `../../index.js`, vitest
describe/it/expect, asserts each type/value is reachable via runtime constructs (type-annotated
object literals + `expect()` on values). Mirror it as `src/__tests__/unit/harness-public-api.test.ts`.

## 7. Validation commands (verified from package.json / tsconfig.json)
- `npm run lint` → `tsc --noEmit`, includes `src/**/*`, EXCLUDES `src/__tests__` (tsconfig L23).
- `npm test` → `vitest run` (esbuild strips types; tests need runtime `expect()`).
- `npm run build` → `tsc` emits `dist/`.

## 8. Scope boundaries (do NOT touch)
- `src/types/harnesses.ts`, `src/types/providers.ts` — owned by P1.M1.* (complete). No changes.
- `src/harnesses/*.ts` source files — owned by P2.* (complete). Only CONSUME exports.
- `src/utils/harness-config.ts`, `src/utils/model-spec.ts` — owned by P1.M2.T2 / P1.M1.T2 (complete).
  Only re-export from `src/index.ts`.
- `src/core/agent.ts` — owned by P3.M1.* (complete). No changes.
- `src/harnesses/index.ts` barrel — optional to also add PiHarness there, but NOT required; `src/index.ts`
  imports PiHarness directly from its source file (precedent: ClaudeCodeHarness).

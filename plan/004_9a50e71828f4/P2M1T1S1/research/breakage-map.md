# Breakage Map — P2.M1.T1.S1 (AnthropicProvider → ClaudeCodeHarness rename)

Verified in the live tree (commit at task start). Answers: "what BREAKS if I change
`readonly id` from `'anthropic'` to `'claude-code'` and rename the file?"

## 1. Source files (affect `npm run lint` = `tsc --noEmit`, excludes `src/__tests__`)

The registry stores harnesses keyed by `provider.id`:

```ts
// src/harnesses/harness-registry.ts:193
public register(provider: Provider): void {
  if (this.providers.has(provider.id)) { throw ... }
  this.providers.set(provider.id, provider);   // ← key = provider.id
}
```

So after the rename, `new ClaudeCodeHarness()` registers under `'claude-code'`, NOT `'anthropic'`.

**Files that REFERENCE the old file path `anthropic-provider.js` (break on rename):**

| File | Line | What | Fix |
|------|------|------|-----|
| `src/types/index.ts` | 52 | `export { AnthropicProvider } from '../harnesses/anthropic-provider.js';` | change path → `claude-code-harness.js`; export BOTH `ClaudeCodeHarness` + `AnthropicProvider` alias |
| `src/index.ts` | 117 | `export { AnthropicProvider } from './harnesses/anthropic-provider.js';` | same |

These two barrels reference the FILE PATH, so renaming the source file breaks the import
resolution → `npm run lint` fails. **Forced consequence** of the rename (NOT scope creep).
Both barrels must be updated. (The full Harness-surface public export is P3.M3.T1.S1; this
task only fixes the existing path + adds `ClaudeCodeHarness` alongside the alias.)

**Cosmetic comment-only references (do NOT affect lint, leave or update optionally):**
- `src/types/harnesses.ts:242` (JSDoc)
- `src/harnesses/opencode-provider.ts` (several `// PATTERN: Follow AnthropicProvider` comments) — opencode is deleted in P4.M1 anyway
- `src/harnesses/harness-registry.ts` (JSDoc `@example` blocks) — registry logic untouched (owned by S2)
- `src/harnesses/anthropic-provider.ts:390` (self-referential comment, becomes the renamed file)

## 2. Test files (affect `npm test` = `vitest run`; esbuild transpile-only)

### 2a. Tests that `new AnthropicProvider()` the REAL class — BREAK, must update

These import from the real path and instantiate the real class:

- `src/__tests__/integration/provider-agent.test.ts` — **integration**; registers under 'claude-code'
  but looks up `'anthropic'` everywhere (`new Agent({ provider: 'anthropic' })`, default resolution).
  33 tests, currently GREEN. Forced minimal fix (out of explicit contract scope but required for green).
- The 12 unit `src/__tests__/unit/providers/anthropic-provider-*.test.ts` — **in scope**, RENAMED to
  `claude-code-harness-*.test.ts` + contents updated (per contract OUTPUT clause).

### 2b. Tests that use local MOCK factories — do NOT break (mock id is a test fixture, not the real class)

These define their OWN `createMockProvider(id)` returning a `Provider`-shaped stub and register it
with `id: 'anthropic'`. The real `AnthropicProvider`/`ClaudeCodeHarness` is never instantiated, so
the rename does not touch them. They stay GREEN unchanged:

- `src/__tests__/unit/agent.test.ts` (`createMockProvider('anthropic')`)
- `src/__tests__/integration/provider-switching.test.ts` (local `createMockProvider`)
- `src/__tests__/unit/providers/provider-lifecycle.test.ts` (local mock factory)
- `src/__tests__/unit/providers/harness-registry.test.ts` (`createMockProvider('anthropic')`)
- `src/__tests__/unit/providers/provider-alias-shim.test.ts` (type-only alias assertions; model strings)
- `src/__tests__/unit/provider-interface.test.ts` — defines its OWN local
  `class AnthropicProvider implements Provider` (line 746) as a test stub; `implements Provider`
  (deprecated, still present). Not affected.
- agent-tool-executor / agent-prompt-provider-override / agent-stream-provider-override — use mocks.
- cache-key / model-spec / harness-config / harnesses-types / harnesses-config-types /
  provider-result-types / workflow-validation — use `'anthropic'` only as a ModelProviderId /
  model-string literal. Unaffected (ModelProviderId is unchanged).

## 3. Consumers kept green by STRUCTURAL assignability (no edit needed)

- `src/core/agent.ts` — resolves provider via `ProviderRegistry.getInstance().get(effectiveProvider)`
  and stores `this.provider: Provider`. Because `ClaudeCodeHarness implements Harness` is structurally
  assignable to `Provider` (id `'claude-code'` ∈ ProviderId; method params are alias-identical),
  `new AnthropicProvider()` (= alias = `new ClaudeCodeHarness()`) still satisfies `Provider`.
  Agent does NOT import the class directly. ✓ Untouched (owned by P3.M1).
- `src/harnesses/harness-registry.ts` — `register(provider: Provider)` accepts the alias instance.
  Registry is keyed by `ProviderId` (superset including `'claude-code'`). ✓ Untouched (defaults owned by S2).

## 4. Bottom line — the exact file set this task touches

```
MODIFY/RENAME:
  src/harnesses/anthropic-provider.ts                 → src/harnesses/claude-code-harness.ts  (rename + reinterface)
  src/__tests__/unit/providers/anthropic-provider-*.test.ts (×12) → claude-code-harness-*.test.ts (rename + update)
MODIFY (forced — barrel path fix):
  src/types/index.ts                                  (line 52)
  src/index.ts                                        (line 117)
MODIFY (forced — integration test stays green):
  src/__tests__/integration/provider-agent.test.ts    (import path + 'anthropic'→'claude-code' id refs)
```

No other source or test file is touched.

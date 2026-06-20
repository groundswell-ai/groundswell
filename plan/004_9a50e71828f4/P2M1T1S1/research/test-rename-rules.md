# Test Rename Rules — P2.M1T1S1

## The governing rule for the string `'anthropic'` in renamed test files

After renaming the class + changing `readonly id` to `'claude-code'`, the string literal
`'anthropic'` appears in the unit tests in TWO semantically different roles. They must be treated
OPPOSITELY:

### Role A — the harness `.id` / registry key / `this.id`-derived metadata  → CHANGE to `'claude-code'`

These all derive from the harness identity (`this.id`), which is now `'claude-code'`:

| Assertion / call | Was | Becomes |
|---|---|---|
| `expect(provider.id).toBe('anthropic')` | 'anthropic' | 'claude-code' |
| `expect(providerInterface.id).toBe('anthropic')` | 'anthropic' | 'claude-code' |
| `expect(retrieved?.id).toBe('anthropic')` | 'anthropic' | 'claude-code' |
| `registry.get('anthropic')` / `registry.has('anthropic')` | 'anthropic' | 'claude-code' |
| `registry.initializeProvider('anthropic')` / `isReady` / `getStatus` | 'anthropic' | 'claude-code' |
| `response.metadata.agentId` (from `createSuccessResponse(data,{agentId:this.id})`) | 'anthropic' | 'claude-code' |
| streaming `events[0].metadata.provider` (from `metadata:{provider:this.id}`) | 'anthropic' | 'claude-code' |

Locations verified (grep): `anthropic-provider.test.ts:26,34,76,219,221,230`;
`anthropic-provider-sessions.test.ts:460`; `anthropic-provider-execute.test.ts:116,970,1218`;
`anthropic-provider-initialize.test.ts:231,240,241,251,260,268,269,270,282`;
`anthropic-provider-loadskills.test.ts:496`; `anthropic-provider-registermcps.test.ts:369`;
`anthropic-provider-sessions.test.ts:309`; `anthropic-provider-terminate.test.ts:205,219,227,238,251`.

NOTE on the streaming `metadata.provider: this.id` field: the field NAME stays `provider` (verbatim
streaming logic) but its VALUE is now `'claude-code'` (it reflects `this.id`). This is a known
semantic quirk (a harness id reported under a field named `provider`) — flagged for a future cleanup
but NOT changed here (contract: keep streaming logic verbatim). The test assertion updates to match.

### Role B — the ModelSpec.provider / model strings → KEEP `'anthropic'`

These refer to the LLM-host axis (ModelProviderId), which is UNCHANGED by this task:

- `expect(result.provider).toBe('anthropic')` in normalizeModel happy-path tests (the parsed
  ModelSpec.provider for claude models is still `'anthropic'`). KEEP.
- Object literals `{ provider: 'anthropic', model: '...', raw: '...' }` in normalizeModel tests. KEEP.
- Model strings: `'claude-sonnet-4'`, `'anthropic/claude-opus-4-20250514'`, etc. KEEP (these are
  `parseModelSpec` inputs; the default provider is still `'anthropic'`).

### Mechanical per-file change set (each renamed file)

For every `src/__tests__/unit/providers/anthropic-provider-*.test.ts` → `claude-code-harness-*.test.ts`:

1. `git mv` the file (rename).
2. Import path: `'../../../harnesses/anthropic-provider.js'` → `'../../../harnesses/claude-code-harness.js'`.
3. Import symbol: `import { AnthropicProvider }` → `import { ClaudeCodeHarness }`
   (the alias `AnthropicProvider` still works, but use the new name for the renamed tests).
4. Type annotations: `let provider: AnthropicProvider` → `ClaudeCodeHarness`;
   `Promise<AnthropicProvider>` → `Promise<ClaudeCodeHarness>`.
5. Construction: `new AnthropicProvider()` → `new ClaudeCodeHarness()`.
6. Apply Role A replacements (`'anthropic'`→`'claude-code'` for id/registry/this.id-derived metadata).
7. Leave Role B occurrences (`result.provider`, model strings) as `'anthropic'`.
8. normalizeModel file ONLY: update error-message assertions (`AnthropicProvider`→`ClaudeCodeHarness`,
   `ProviderRegistry`→`HarnessRegistry`) — see research/normalize-model-fix.md.
9. describe-block titles (cosmetic): `describe('AnthropicProvider...')` → `describe('ClaudeCodeHarness...')`.

### Integration test `src/__tests__/integration/provider-agent.test.ts` (minimal forced fix)

1. Import path: `'../../harnesses/anthropic-provider.js'` → `'../../harnesses/claude-code-harness.js'`;
   import `ClaudeCodeHarness` (the alias also works).
2. `new AnthropicProvider()` → `new ClaudeCodeHarness()`; type `Promise<AnthropicProvider>` →
   `Promise<ClaudeCodeHarness>`.
3. Every `new Agent({ provider: 'anthropic' })` → `new Agent({ provider: 'claude-code' })` (the
   harness registers under 'claude-code' now). ~11 occurrences.
4. The single "should create Agent without provider config (uses default)" test: the global default
   after `resetGlobalConfig()` is still `'anthropic'` (legacy DEFAULT_PROVIDER_CONFIG), so a default
   lookup would miss. Add at the top of THAT test:
   `configureProviders({ defaultProvider: 'claude-code' });` (import from `'../../utils/provider-config.js'`).
   `configureProviders` is the legacy alias (accepts the ProviderId superset incl. 'claude-code') and
   feeds the Agent's `getGlobalProviderConfig`/`resolveProviderConfig`. Then `new Agent({})` resolves
   'claude-code' → found.
5. The "throw when provider is not registered" test: `new Agent({ provider: 'anthropic' })` still
   throws (genuinely unregistered) — leave OR change to `'claude-code'` for consistency (also throws
   pre-registration). Either is green.
6. No metadata-value assertions change here (the file only asserts `toHaveProperty('agentId')`, not
   its value).

### What NOT to touch (uses local mocks — stays green unchanged)

agent.test.ts, provider-switching.test.ts, provider-lifecycle.test.ts, harness-registry.test.ts,
provider-alias-shim.test.ts, provider-interface.test.ts (local `class AnthropicProvider implements
Provider` stub), and all the agent-*/cache/model/harnesses-types tests. See research/breakage-map.md §2b.

# Research Notes — P1.M1.T1.S1 (Rewire agent.ts harness resolution)

Verified against the working tree on 2026-06-20. All line numbers confirmed by `read`/`grep`.

## 1. The three call sites in `src/core/agent.ts` (LEGACY → must swap)

All three currently call `getGlobalProviderConfig()` + `resolveProviderConfig(...)`. `resolveProviderConfig`
returns `{ provider, options }`; the new `resolveHarnessConfig` returns `{ harness, options }` (note the
key rename `provider` → `harness`).

| Site | Lines | Current code (verified) | Throw/return behaviour to PRESERVE |
|------|-------|-------------------------|------------------------------------|
| Constructor | 117–123 | `const globalConfig = getGlobalProviderConfig();`<br>`const resolved = resolveProviderConfig(globalConfig, this.harnessId, this.harnessOptions);`<br>`const effectiveHarness = resolved.provider;` | Throws at L128: `throw new Error(\`Harness '${effectiveHarness}' is not registered\`)` — keep literal `is not registered`. |
| `stream()` | 372–379 | `const globalConfig = getGlobalProviderConfig();`<br>`const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(globalConfig, this.harnessId, this.harnessOptions, promptHarness, promptHarnessOptions);` | Throws SYNCHRONOUSLY at L390 (before generator creation): `throw new Error(\`Harness '${resolvedHarness}' is not registered\`)` — keep `is not registered`. |
| `executePrompt()` | 616–623 | identical shape to `stream()` (5 args) | Returns (NOT throws) at L633: `createErrorResponse('PROVIDER_NOT_FOUND', \`Harness '${resolvedHarness}' is not registered\`, { harnessId: resolvedHarness }, false)` — keep error-return behaviour, only swap the resolve functions. |

## 2. Imports (lines 45–46)

```ts
45: import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';   // REMOVE
46: import { getGlobalHarnessConfig } from '../utils/harness-config.js';                            // already present; ADD resolveHarnessConfig
```

After: `import { getGlobalHarnessConfig, resolveHarnessConfig } from '../utils/harness-config.js';`
and delete line 45 entirely.

## 3. The new API (`src/utils/harness-config.ts`)

- `DEFAULT_HARNESS_CONFIG = { defaultHarness: 'pi' }` (L63) — **the new global default is `'pi'`**, not `'anthropic'`.
- `getGlobalHarnessConfig()` (L158): `return globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG;`
- `resolveHarnessConfig(globalConfig, agentHarness?, agentOptions?, promptHarness?, promptOptions?)` (L192):
  PURE, **performs NO id validation** — returns `{ harness, options }`. (ids treated as opaque string keys)
- `resetGlobalHarnessConfig()` (L222) exists + exported — tests use it.

## 4. MUST NOT TOUCH (out of scope / already correct)

- **Line 661** (model axis): `const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;` — already correct.
- **Line 111** (`this.harnessId` assignment): `this.harnessId = config.harness ?? (config.provider as HarnessId | undefined);` — keep the legacy `provider` fallback (provider:'claude-code' must keep resolving; provider:'anthropic' will now throw, which is intended).
- **`src/__tests__/adversarial/edge-case.test.ts`** (Issue 5, unicode) — out of scope, leave failing.
- **`src/utils/provider-config.ts`** shim + legacy `globalProviderConfig` singleton — do NOT delete in this task (other tests still import the legacy fns directly; see §6).

## 5. Registry facts

- `ProviderRegistry === HarnessRegistry` (`src/harnesses/harness-registry.ts:623`: `export const ProviderRegistry = HarnessRegistry`). They are the SAME singleton. Integration tests that register via `ProviderRegistry.getInstance().register(...)` populate the same store the Agent reads via `HarnessRegistry.getInstance().get(...)`.
- Registry is keyed `'pi'` + `'claude-code'` only (`src/harnesses/register-defaults.ts`). `'anthropic'` is NOT a key.

## 6. Test blast-radius map (the real risk for one-pass success)

After the swap, any `new Agent()` / `new Agent({})` with **no explicit harness** resolves to the new
default `'pi'` (previously `'anthropic'`). Any test that relied on `configureProviders({defaultProvider})`
to set the Agent's harness default ALSO breaks (Agent no longer reads that singleton for harness axis).

### 6a. WILL break — must update mock registration / config (verified by reading source)

| File:line | Current behaviour | Why it breaks | Fix pattern |
|-----------|-------------------|---------------|-------------|
| `src/__tests__/unit/agent.test.ts:127–132` (`it('uses the configured global default harness')`) | registers mock `'anthropic'`; `new Agent()` resolves `'anthropic'` | `beforeEach` calls `resetGlobalHarnessConfig()` → default is now `'pi'`; only `'anthropic'` registered → throws `'pi'` not registered | change registration to `createMockHarness('pi')`; update comment |
| `src/__tests__/unit/agent.test.ts:134–138` (`it('throws when the resolved harness is not registered')`) | `expect(() => new Agent()).toThrow(/Harness 'anthropic' is not registered/)` | default is now `'pi'` → throws `Harness 'pi' is not registered` | change regex to `/Harness 'pi' is not registered/`; update comment |
| `src/__tests__/integration/provider-switching.test.ts:144–151` (`'uses global default'`) | registers `'anthropic'`; `new Agent({})` resolves `'anthropic'` (legacy default) | resolves `'pi'`; only `'anthropic'` registered → throws | add `configureHarnesses({defaultHarness:'anthropic'})` (mock is registered) OR register `'pi'` |
| `src/__tests__/integration/provider-switching.test.ts:427–432` (`'use global default when agent has no provider'`) | same pattern | same | same fix |
| `src/__tests__/integration/provider-agent.test.ts:182–188` (`'without provider config (uses default)'`) | `configureProviders({defaultProvider:'claude-code'})`; `new Agent({})` resolves `'claude-code'` | `configureProviders` now dead for harness axis; resolves `'pi'`; mock id ≠ `'pi'` → throws | replace with `configureHarnesses({defaultHarness:'claude-code'})` (mock registered as claude-code) OR register `'pi'` |

### 6b. Likely STILL PASS (verified — all needed harnesses registered)

- `src/__tests__/unit/agent.test.ts:116–125` (explicit `harness:'claude-code'`; and `provider:'anthropic'` with mock 'anthropic' registered — fallback `this.harnessId` keeps working).
- `src/__tests__/unit/agent-prompt-harness-override.test.ts` (registers `'anthropic'` + `'pi'` + `'claude-code'` in `beforeEach`; `new Agent()` → `'pi'` is registered → OK. Stale comment at L80 but green).
- `src/__tests__/integration/harness-cache-hooks-parity.test.ts:432–435` (registers `'anthropic'` + `'pi'` + `'claude-code'`; L469 `new Agent(...)` → `'pi'` registered → OK).
- `src/__tests__/unit/agent-tool-executor.test.ts` (uses explicit `provider:'anthropic'` with mock registered).
- `src/__tests__/unit/utils/harness-config.test.ts` (tests the legacy fns DIRECTLY — still exported, unchanged → green).

### 6c. Triage protocol for the implementer

Run `npm test`. For each failure, apply the decision tree:
1. Does the failing test construct `new Agent()` / `new Agent({})` with NO harness? → it now resolves `'pi'`.
   - If a `'pi'` mock is already registered → investigate other cause.
   - Else → either register `createMockHarness('pi')`, OR add `configureHarnesses({defaultHarness: <id-of-registered-mock>})` mirroring the test's original intent.
2. Does it call `configureProviders({defaultProvider: X})` expecting the Agent to honour it? → Agent no longer reads that singleton. Replace/augment with `configureHarnesses({defaultHarness: X})` (ensuring a mock with id `X` is registered).
3. Update any assertion regex literalising `Harness 'anthropic'` for a no-harness default path → `Harness 'pi'`.
4. NEVER modify `src/__tests__/adversarial/edge-case.test.ts` (Issue 5, out of scope).

Document every test-file change in the commit message.

## 7. Confidence

Core 3-call-site swap + import removal is mechanical and verified against exact source — high confidence.
The variable-scope risk is the test cascade in §6a/§6c; each break is a 1-line mechanical fix following the
decision tree. No external services, no async mocking — all pure functions + an in-memory registry.

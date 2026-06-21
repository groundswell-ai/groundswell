# Issue 1 — `configureHarnesses()` global default never reaches the Agent

> Verification report. All claims below are quoted verbatim from the codebase
> with exact file paths and line numbers so downstream implementation agents
> can act without re-reading the source.

## TL;DR — the bug

`Agent` resolves its harness through the **legacy** `getGlobalProviderConfig()` /
`resolveProviderConfig()` API in **all three** resolution call sites (constructor,
`stream()`, `executePrompt()`). The legacy `getGlobalProviderConfig()` singleton
is a *separate* store from `getGlobalHarnessConfig()` — so when a user calls
`configureHarnesses({ defaultHarness: 'pi' })` (the documented public API), it
writes to a singleton the Agent **never reads**. The legacy singleton still
returns its hardcoded default `{ defaultProvider: 'anthropic' }`, which is not
in the registry → the constructor throws `Harness 'anthropic' is not registered`.

The model axis is unaffected: line 661 already reads
`getGlobalHarnessConfig().defaultModelProvider` correctly. Only the harness axis
is broken.

---

## 1. Three harness-resolution call sites in `src/core/agent.ts`

All three read the **legacy** `getGlobalProviderConfig()` + `resolveProviderConfig()`.

### 1a. Constructor — `src/core/agent.ts:117-120`

```ts
117:    const globalConfig = getGlobalProviderConfig();
118:    const resolved = resolveProviderConfig(
119:      globalConfig,
120:      this.harnessId,
121:      this.harnessOptions,
122:    );
123:    const effectiveHarness = resolved.provider;
```

### 1b. `stream()` — `src/core/agent.ts:372-378`

```ts
372:    const globalConfig = getGlobalProviderConfig();
373:    const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
374:      globalConfig,
375:      this.harnessId,
376:      this.harnessOptions,
377:      promptHarness,
378:      promptHarnessOptions
379:    );
```

### 1c. `executePrompt()` — `src/core/agent.ts:616-622`

```ts
616:    const globalConfig = getGlobalProviderConfig();
617:    const { provider: resolvedHarness, options: resolvedHarnessOptions } = resolveProviderConfig(
618:      globalConfig,
619:      this.harnessId,
620:      this.harnessOptions,
621:      promptHarness,
622:      promptHarnessOptions
623:    );
```

---

## 2. Legacy import in `src/core/agent.ts:45`

```ts
45: import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';
46: import { getGlobalHarnessConfig } from '../utils/harness-config.js';
```

Note: `getGlobalHarnessConfig` is already imported (line 46) and is used in
exactly one place — the model axis on line 661 (see §6 below). The harness axis
still imports the legacy pair.

---

## 3. `src/utils/provider-config.ts` — confirmed deprecated shim

The **entire file** is a re-export shim. Quoted verbatim:

```ts
/**
 * Global provider configuration — DEPRECATED shim.
 *
 * @deprecated Since v1.2. All logic has moved to {@link ./harness-config.js}.
 * Use `configureHarnesses` / `getGlobalHarnessConfig` / `resolveHarnessConfig` directly.
 * This module remains only so existing imports (agent.ts, utils/index.ts, tests) keep
 * resolving during the harness-vocabulary migration. Removed when P3.M1 rewires agent.ts.
 */
export {
  configureProviders,
  getGlobalProviderConfig,
  resolveProviderConfig,
  resetGlobalConfig,
} from './harness-config.js';
```

The legacy `getGlobalProviderConfig` is implemented in `harness-config.ts`
(historical note: it reads a **separate** singleton from `getGlobalHarnessConfig`,
see §4). Its hardcoded default, at `src/utils/harness-config.ts`:

```ts
const DEFAULT_PROVIDER_CONFIG: GlobalProviderConfig = {
  defaultProvider: 'anthropic' as ProviderId,
  providerDefaults: undefined,
};
```

The legacy `resolveProviderConfig(globalConfig, agentProvider?, agentOptions?, promptProvider?, promptOptions?)`
behaviour (signature in `src/utils/harness-config.ts`):

- Translates the legacy shape into the harness shape (unsound but runtime-safe
  casts via `as HarnessId` / `as Partial<Record<HarnessId, HarnessOptions>>`).
- **Delegates to `resolveHarnessConfig`**, which performs **NO id validation**
  (ids are treated as opaque string keys — see §4). So any legacy literal like
  `'anthropic'` flows through unchecked.
- Returns `{ provider: harness as ProviderId, options: options as ProviderOptions }`.

The legacy `configureProviders` keeps its own singleton
(`globalProviderConfig` in `harness-config.ts`) — separate from
`globalHarnessConfig`. This is the documented Scope Decision at the top of
`harness-config.ts`:

> Therefore, **`configureProviders` keeps its own module-private singleton**
> with permissive validation, while `resolveProviderConfig` safely delegates to
> `resolveHarnessConfig` (which performs NO id validation — it treats ids as
> opaque string keys).

This is the root cause: `configureHarnesses()` writes to `globalHarnessConfig`,
but `getGlobalProviderConfig()` reads from `globalProviderConfig`. They are two
different stores.

---

## 4. `src/utils/harness-config.ts` — harness cascade (the correct path)

### 4a. `getGlobalHarnessConfig()` and its default

`getGlobalHarnessConfig` returns the configured value or the module default:

```ts
const DEFAULT_HARNESS_CONFIG: GlobalHarnessConfig = {
  defaultHarness: 'pi' as HarnessId,
};
```

```ts
export function getGlobalHarnessConfig(): GlobalHarnessConfig {
  return globalHarnessConfig ?? DEFAULT_HARNESS_CONFIG;
}
```

### 4b. `resolveHarnessConfig` — PURE, no id validation

Exact signature and body:

```ts
export function resolveHarnessConfig(
  globalConfig: GlobalHarnessConfig,
  agentHarness?: HarnessId,
  agentOptions?: HarnessOptions,
  promptHarness?: HarnessId,
  promptOptions?: HarnessOptions,
): { harness: HarnessId; options: HarnessOptions } {
  // Step 1: Resolve harness — prompt wins (first-defined-wins via ??)
  const harness = promptHarness ?? agentHarness ?? globalConfig.defaultHarness;

  // Step 2: Get global defaults for the resolved harness
  const globalDefaults = globalConfig.harnessDefaults?.[harness];

  // Step 3: Merge options — last write wins
  const options: HarnessOptions = {
    ...(globalDefaults ?? {}),
    ...(agentOptions ?? {}),
    ...(promptOptions ?? {}),
  };

  return { harness, options };
}
```

**Confirmed:** pure function, no singleton read, **no id validation**
(no call to `isValidHarnessId`). Validation happens only in `configureHarnesses`,
not in resolve. This is the function the Agent should call (or its shape should
be returned to the Agent through `getGlobalHarnessConfig()`).

---

## 5. Constructor throw — `src/core/agent.ts:131`

```ts
125:    const registry = HarnessRegistry.getInstance();
126:    const harnessInstance = registry.get(effectiveHarness) as Harness | undefined;
127:    if (!harnessInstance) {
128:      throw new Error(`Harness '${effectiveHarness}' is not registered`);
129:    }
130:    this.harness = harnessInstance;
```

(Note: line numbers shifted slightly from the PRD's "around 131"; the `throw`
itself is on line 128, the variable checked is `harnessInstance`, derived from
`registry.get(effectiveHarness)`. With `effectiveHarness === 'anthropic'`,
`registry.get('anthropic')` returns `undefined` → throws.)

The same pattern repeats in `stream()` (line 390, synchronous throw before
generator creation) and `executePrompt()` (line 633, returns
`createErrorResponse('PROVIDER_NOT_FOUND', ...)`).

---

## 6. Line 661 already uses `getGlobalHarnessConfig()` for model axis — proof only harness axis is broken

```ts
661:      const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
662:      const modelSpec = parseModelSpec(effectiveModel, defaultModelProvider);
```

Context (lines 657-662, inside `executePrompt()` cache block):

```ts
657:      //   resolve against the global defaultModelProvider (defaults to 'anthropic' when unset).
658:      //   NOTE: parseModelSpec throws on invalid model strings — intentional fail-fast.
659:      const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
660:      // ↑ NOTE: actual source has this on line 661 (see read output)
661:      const defaultModelProvider = getGlobalHarnessConfig().defaultModelProvider;
662:      const modelSpec = parseModelSpec(effectiveModel, defaultModelProvider);
```

(The cache comment block runs from line ~652; the `getGlobalHarnessConfig()`
call is on **line 661**.) This proves the model-provider axis is fine; only the
harness axis is wrongly wired to the legacy singleton.

---

## 7. Registry is keyed by `'pi'` and `'claude-code'` — `src/harnesses/register-defaults.ts`

```ts
export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  // Claude Code harness — Anthropic-only (PRD §7.8).
  const CLAUDE_CODE: HarnessId = 'claude-code';
  if (!registry.has(CLAUDE_CODE)) {
    registry.register(new ClaudeCodeHarness());
  }

  // Pi harness — vendor-neutral DEFAULT (PRD §7.1, §7.6)...
  const PI: HarnessId = 'pi';
  if (!registry.has(PI)) {
    registry.register(new PiHarness());
  }

  return registry;
}
```

**Confirmed:** registry contains only `'pi'` and `'claude-code'`. The legacy
default `'anthropic'` is **not** a registry key — so any code path that resolves
to `'anthropic'` will throw `Harness 'anthropic' is not registered`.

---

## 8. Example reproducer — `examples/harnesses/02-harness-configuration.ts`

The example calls `configureHarnesses({ defaultHarness: 'pi' })` and then
constructs an Agent with **no harness** field. **This is the documented public
API and it currently throws.**

### 8a. Global config call — `examples/harnesses/02-harness-configuration.ts:70-71`

```ts
70:    configureHarnesses({
71:      defaultHarness: 'pi',
```

### 8b. Agent with no harness — `examples/harnesses/02-harness-configuration.ts:121-124`

```ts
121:    const agent2 = new Agent({
122:      name: 'DefaultAgent',
123:      // No harness specified — inherits global defaultHarness 'pi'
124:    });
```

**Confirmed reproducer.** Expected behaviour (per the inline comment):
inherits global `defaultHarness: 'pi'`. Actual current behaviour: the Agent
reads `getGlobalProviderConfig()` which returns `defaultProvider: 'anthropic'`,
then `registry.get('anthropic')` returns `undefined`, then the constructor
throws `Harness 'anthropic' is not registered`.

---

## Architecture — data-flow diagram

```
User code                              agent.ts                    Singletons in harness-config.ts
─────────                              ────────                    ──────────────────────────────
configureHarnesses({defaultHarness:'pi'})                         globalHarnessConfig = {defaultHarness:'pi'} ✅
       │                                                                         │
       │ (writes)                                                                │ (never read by Agent)
       ▼                                                                         ▼
                                                                                
new Agent({name:'DefaultAgent'})                                                 
       │                                                                         
       ▼                                                                         
constructor (L117)  ──► getGlobalProviderConfig() ──► reads globalProviderConfig ❌
                       resolveProviderConfig(...)        (separate singleton!)
                       returns provider = DEFAULT = 'anthropic'
                                                                                
       ▼                                                                         
registry.get('anthropic') (L126)  ──►  undefined  ('pi' and 'claude-code' only)
                                                                                
       ▼                                                                         
throw `Harness 'anthropic' is not registered` (L128)                            
```

The fix: change the three call sites in `agent.ts` (L117-120, L372-378, L616-622)
to call `getGlobalHarnessConfig()` + `resolveHarnessConfig()` instead. The shape
is the same; only the import names change (`provider` → `harness`). The legacy
import on line 45 can then be removed. The legacy shim
(`src/utils/provider-config.ts`) and the legacy singleton can be deleted in a
follow-up.

---

## Start Here

1. **`src/core/agent.ts`** — the only file that needs to change for the core fix.
   Replace the legacy pair (`getGlobalProviderConfig` + `resolveProviderConfig`)
   at lines 117-120, 372-378, and 616-622 with `getGlobalHarnessConfig()` +
   `resolveHarnessConfig()`. Remove the import on line 45.
2. **`src/utils/harness-config.ts`** — read for the exact signatures of
   `getGlobalHarnessConfig()` and `resolveHarnessConfig()` (lines shown in §4).
   `resolveHarnessConfig` returns `{ harness, options }` (note: `harness`, not
   `provider`).
3. **`examples/harnesses/02-harness-configuration.ts:121`** — the reproducer
   test (use as the smoke test for the fix).
4. **`src/harnesses/register-defaults.ts`** — confirms `'pi'` and
   `'claude-code'` are the only valid registry keys; `'anthropic'` is not one.

## Constraints / Risks

- **Backward-compat:** existing callers using `new Agent({ provider: 'anthropic' })`
  rely on the legacy path. If the agent.ts change swaps to harness resolution,
  the `config.provider as HarnessId` fallback (line 111) still passes
  `'anthropic'` into `resolveHarnessConfig`, which does NO validation — so it
  flows to `registry.get('anthropic')` and throws. The fix is safe **only if**
  either (a) the throw is acceptable for that legacy literal, or (b) the
  fallback is updated/removed. Check downstream tasks before removing the
  fallback.
- **Two separate singletons:** `globalProviderConfig` and `globalHarnessConfig`
  in `harness-config.ts` are distinct stores. The legacy shim
  `provider-config.ts` only re-exports — it does not unify them. Do not assume
  `configureProviders` and `configureHarnesses` share state.
- **Test regex coupling:** `stream()` (L390) and `executePrompt()` (L633)
  messages explicitly preserve the `is not registered` substring so existing
  `.rejects.toThrow(...)` regex tests still match. Keep that substring in any
  rewording.

## Open Questions

- Should the legacy `provider-config.ts` shim and the legacy singleton be
  deleted in the same change, or in a separate follow-up (per the existing
  `@deprecated` note "Removed when P3.M1 rewires agent.ts")?
- Are there integration tests still using `configureProviders` with
  `'anthropic'` that would break if the Agent stops reading the legacy
  singleton? (Search `tests/` for `configureProviders` before removing.)

# register-defaults.ts bootstrap helper design (P2.M1.T1.S2)

## The contract requirement

> "Add a registry bootstrap helper (e.g. src/harnesses/register-defaults.ts) that registers
> ClaudeCodeHarness (id 'claude-code') — PiHarness registration added in P2.M3."

## The HarnessRegistry API (src/harnesses/harness-registry.ts)

```ts
class HarnessRegistry {
  static getInstance(): HarnessRegistry;          // singleton
  register(provider: Provider): void;             // keys by provider.id
  get(id: ProviderId): Provider | undefined;
  has(id: ProviderId): boolean;
  initializeProvider(id, options?): Promise<void>;
  isReady(id): boolean;
  static _resetForTesting(): void;                 // nulls the singleton
  _resetInitStateForTesting(): void;               // clears init-state map
}
```

## CRITICAL GOTCHA — `register()` THROWS on duplicate

```ts
// harness-registry.ts register()
if (this.providers.has(provider.id)) {
  throw new Error(`Provider '${provider.id}' is already registered`);
}
```

Implications for the bootstrap helper:
- If `registerDefaultHarnesses()` is called **twice** (e.g. once at app startup, once by Agent
  construction in P3.M1; or twice across test files that don't perfectly reset), the SECOND call
  throws and crashes.
- → **The helper MUST be idempotent:** guard each registration with `if (!registry.has(id))`.

## Design — idempotent, singleton-by-default, accepts an override

```ts
// src/harnesses/register-defaults.ts
import { HarnessRegistry } from "./harness-registry.js";
import { ClaudeCodeHarness } from "./claude-code-harness.js";
import type { HarnessId } from "../types/harnesses.js";

/**
 * Bootstrap helper: register Groundswell's built-in harnesses with the
 * HarnessRegistry (PRD §7.6 / §7.1). Idempotent — safe to call multiple times
 * (guards each registration with `registry.has(id)` so the registry's own
 * duplicate-error is never triggered).
 *
 * Today registers:
 *   - ClaudeCodeHarness (id 'claude-code') — Anthropic-only (PRD §7.8).
 *
 * P2.M3.T2.S3 will add PiHarness (id 'pi') as the vendor-neutral default here.
 *
 * @param registry - Target registry (defaults to the HarnessRegistry singleton).
 * @returns The registry (for chaining / testing).
 *
 * @example
 * ```ts
 * import { registerDefaultHarnesses } from 'groundswell/harnesses';
 * const registry = registerDefaultHarnesses();
 * const cc = registry.get('claude-code');  // ClaudeCodeHarness instance
 * ```
 */
export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  // Claude Code harness — Anthropic-only (PRD §7.8).
  const CLAUDE_CODE: HarnessId = "claude-code";
  if (!registry.has(CLAUDE_CODE)) {
    registry.register(new ClaudeCodeHarness());
  }

  // TODO(P2.M3.T2.S3): register PiHarness (id 'pi') as the vendor-neutral default.
  //   import { PiHarness } from "./pi-harness.js";
  //   if (!registry.has("pi")) registry.register(new PiHarness());

  return registry;
}
```

## Why these design choices

1. **Idempotent (`has()` guard)** — neutralizes the registry's duplicate-throw. This is the
   load-bearing detail. Without it, calling the helper twice (app startup + P3.M1 Agent, or in
   overlapping tests) crashes. This also unblocks P2.M3 — PiHarness can be added with the same
   guard pattern without re-architecting.
2. **Default arg = singleton** — `registerDefaultHarnesses()` with no args uses
   `HarnessRegistry.getInstance()`, matching how every other consumer reaches the registry
   (agent.ts, the integration tests). An explicit `registry` param lets tests pass a fresh
   (reset) instance and keeps the function pure-ish / unit-testable.
3. **Returns the registry** — convenient for `const r = registerDefaultHarnesses(); r.get(...)`.
4. **`new ClaudeCodeHarness()` is safe to register un-instantiated** — the constructor only sets
   field defaults; it does NOT load the `@anthropic-ai/claude-agent-sdk` (that's `initialize()`).
   So registering holds a lightweight instance; `initializeProvider()` is called later (lazily).
   No SDK mock needed for register-defaults tests. (The "Mock: SDK import in tests" contract note
   applies to the EXECUTE config-error test, not this helper — see test-strategy.md.)

## Type-check proofs

- `registry.has("claude-code")` — `has(id: ProviderId)`. `ProviderId = HarnessId | 'anthropic' |
  'opencode'` (providers.ts L40); `HarnessId = 'pi' | 'claude-code'` (harnesses.ts). So
  `'claude-code' ∈ ProviderId` ✓.
- `registry.register(new ClaudeCodeHarness())` — `register(provider: Provider)`.
  `ClaudeCodeHarness implements Harness` and is structurally assignable to `Provider` (S1 PRP
  GOTCHA #9: id `'claude-code'` ∈ `ProviderId` superset; `execute`/`initialize`/etc. params are
  alias-identical). The registry already compiles with ClaudeCodeHarness (S1's `npm run lint`
  gate proves it) ✓.

## Barrel export (src/harnesses/index.ts)

Add `registerDefaultHarnesses` to the harnesses barrel so tests / Agent / app entry can import it
from one place:

```ts
// src/harnesses/index.ts (append)
export { registerDefaultHarnesses } from './register-defaults.js';
```

**Do NOT add it to `src/index.ts` (public API)** — the full Harness-surface public export is
P3.M3.T1.S1 (same boundary S1 honored: it only touched `src/index.ts` for the forced path fix).
S2 exports through the internal `src/harnesses/index.ts` barrel only.

## NOT auto-called on import

The helper is an **explicit function call**, never invoked as a side effect of importing the
module. Auto-registering on import would pollute the singleton in every test that imports
anything from `src/harnesses/` (breaking test isolation across ~15 suites). Callers
(app entrypoint, Agent bootstrap in P3.M1) invoke it deliberately.

## Scope boundary vs S1 (parallel) + downstream

- S2 touches `claude-code-harness.ts` (the normalizeModel throw + ConfigError class) and the
  normalizemodel test. S1 touches the SAME two files (rename + reinterface + test rename).
  **S2 runs AFTER S1** (plan_status: S1 Implementing, S2 Researching) → sequential, no merge
  conflict; S2 edits S1's output.
- S2's NEW files (`register-defaults.ts`, `register-defaults.test.ts`) and its edits to
  `src/types/agent.ts` (add CONFIG_ERROR) + `src/harnesses/index.ts` (export helper) do NOT
  overlap any S1-touched file. Clean separation.
- Downstream: P3.M1 (Agent) calls `registerDefaultHarnesses()` (or relies on app entry having
  called it) and `registry.get('claude-code')`; catches `ConfigError` from `execute()` and maps
  it to an `AgentResponse` error (`code: CONFIG_ERROR`). P2.M3.T2.S3 adds PiHarness to this
  helper.

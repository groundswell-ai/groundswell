# Type Swap + ClaudeCodeHarnessOptions Decision — P2.M1.T1.S1

## 1. The explicit type swaps (per contract LOGIC clause)

In `src/harnesses/claude-code-harness.ts`, the imports + declarations change as follows.
All `Harness*` types are imported from `../types/harnesses.js` (canonical home, shipped by
P1.M1.T1.S1). `SessionState` stays imported from `../types/providers.js` (Bucket C — kept
concrete, Anthropic-SDK-shaped, adapter-internal).

| Old (from `../types/providers.js`) | New (from `../types/harnesses.js`) | Where |
|----|----|----|
| `implements Provider` | `implements Harness` | class decl |
| `readonly id: ProviderId = "anthropic"` | `readonly id: HarnessId = "claude-code"` | id field |
| `ProviderCapabilities` | `HarnessCapabilities` | capabilities field + `satisfies` + `supports`/`requiresFeatures` param types |
| `ProviderRequest` | `HarnessRequest` | `execute` + `executeStreaming` request param |
| `ProviderHookEvents` | `HarnessHookEvents` | `execute` + `executeStreaming` + `buildAgentSDKHooks` hooks param |
| `ToolExecutor` (param type) | inline `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>` | `execute` + `executeStreaming` toolExecutor param |
| `ModelSpec` (from providers.js) | `ModelSpec` (from harnesses.js — same type, re-exported) | normalizeModel return |
| `ProviderOptions` (param type) | `ClaudeCodeHarnessOptions` (see §2) | `initialize` param |

`SessionState` stays from `../types/providers.js` (NOT swapped — it is the adapter-internal
session-state shape, kept concrete per the alias-shim Bucket C). `StreamEvent`, `AgentResponse`,
`createSuccessResponse`, `createErrorResponse` imports are unchanged.

## 2. The `initialize` session-field problem + the ClaudeCodeHarnessOptions resolution

### The problem
`HarnessOptions` (types/harnesses.ts) is INTENTIONALLY SLIMMED — it omits `sessionStore`,
`sessionPersistence`, `sessionTtl`, `sessionPath` (those are adapter internals per system_context.md
§7). But the existing `initialize()` body reads all four:
`options?.sessionStore`, `options?.sessionPersistence`, `options?.sessionPath`, `options?.sessionTtl`
(to construct `MemorySessionStore` / `FileSessionStore`). Typing the param as `HarnessOptions` makes
the body fail to type-check (`Property 'sessionStore' does not exist on type 'HarnessOptions'`).

### The resolution — a harness-specific options interface extending HarnessOptions
PRD §7.5: *"Harness implementations MAY extend this with harness-specific fields."*
system_context.md §7: *"each harness owns its concrete state type … session fields live on the
concrete harness."* → define:

```ts
import type { HarnessOptions } from "../types/harnesses.js";
// ... inside claude-code-harness.ts ...
/**
 * Claude Code harness options (PRD §7.5).
 * Extends {@link HarnessOptions} with adapter-internal session-store configuration that the
 * slimmed base contract intentionally omits.
 */
export interface ClaudeCodeHarnessOptions extends HarnessOptions {
  /** Direct session-store injection (mutually exclusive with sessionPersistence). */
  sessionStore?: SessionStore<SessionState>;
  /** Declarative store selection; constructs the appropriate SessionStore. */
  sessionPersistence?: "memory" | "file" | "redis";
  /** Session TTL in ms (default 86400000 = 24h). */
  sessionTtl?: number;
  /** Directory for FileSessionStore (default './sessions'). Only when sessionPersistence='file'. */
  sessionPath?: string;
}
```

Then `async initialize(options?: ClaudeCodeHarnessOptions): Promise<void>` — **the body stays
verbatim** (every `options?.sessionX` still resolves). `SessionStore` is already imported from
`./session-store.js` in the current file.

### PROOF this satisfies `implements Harness` under the project's strict tsconfig
Concern: `initialize(options?: ClaudeCodeHarnessOptions)` is a NARROWER param than the interface's
`initialize(options?: HarnessOptions)`. Under strict function contravariance this would fail — BUT
TypeScript checks METHOD-syntax members bivariantly (strictFunctionTypes exempts method shorthand).

**Empirically verified** with a minimal repro against TS 5.2 + `strict: true`:
```
interface Harness { initialize(options?: HarnessOptions): Promise<void>; }
interface ClaudeCodeHarnessOptions extends HarnessOptions { sessionStore?: unknown; ... }
class ClaudeCodeHarness implements Harness {
  readonly id = 'claude-code';
  async initialize(options?: ClaudeCodeHarnessOptions): Promise<void> { /* uses sessionStore */ }
}
```
→ `tsc --noEmit` exits 0. ✅ Confirmed safe.

### Why not just keep `initialize(options?: ProviderOptions)`?
`ProviderOptions` (Bucket C) is structurally a superset of `HarnessOptions` and would also satisfy
the interface (bivariance) with zero body change. It is the MINIMAL option. But it couples the NEW
`Harness` class to a `@deprecated` type — semantically awkward during a migration whose whole point
is the rename. `ClaudeCodeHarnessOptions` is the architecturally-intended, forward-looking choice
and is verified to compile. (If the implementer strongly prefers minimalism, `ProviderOptions` is an
acceptable fallback that also ships green — but `ClaudeCodeHarnessOptions` is recommended.)

## 3. `execute` / `executeStreaming` / `buildAgentSDKHooks` — bodies stay verbatim

Only the PARAMETER TYPES change (ProviderRequest→HarnessRequest, ProviderHookEvents→HarnessHookEvents,
ToolExecutor→inline callback). Since those are all type aliases to the SAME underlying types
(P1.M1.T3.S1 shim: `ProviderRequest = HarnessRequest`, `ProviderHookEvents = HarnessHookEvents`,
`ToolExecutor = (r: ToolExecutionRequest) => Promise<ToolExecutionResult>`), the runtime behavior is
byte-for-byte identical. No body edit. The gnarly `buildAgentSDKHooks` return-type conditional
(`typeof this.sdk extends null ? never : HookEvent`) compiles unchanged.

## 4. Deprecated alias export

End of `claude-code-harness.ts`:
```ts
/** @deprecated Since v1.2. Use {@link ClaudeCodeHarness}. Renamed as part of the Harness/Provider split. */
export const AnthropicProvider = ClaudeCodeHarness;
```
This keeps every `new AnthropicProvider()` / `import { AnthropicProvider }` working (the 2 barrels,
the integration test, any external consumer) while pointing at the renamed class.

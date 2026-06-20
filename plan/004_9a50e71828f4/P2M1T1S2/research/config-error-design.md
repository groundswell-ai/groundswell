# ConfigError + CONFIG_ERROR code design (P2.M1.T1.S2)

## The contract requirement

> "Update ClaudeCodeHarness.normalizeModel/execute to throw a clear config error
> (code CONFIG_ERROR) when ModelSpec.provider !== 'anthropic'."

S1 (P2.M1.T1.S1, running in parallel) already:
- changed the comparison from `spec.provider !== this.id` → `spec.provider !== "anthropic"`
  (PRD §7.8 anthropic-only gate; `this.id` is now the harness id `'claude-code'`, a different axis);
- BUT throws a plain `new Error(message)` whose message text mentions `ClaudeCodeHarness` +
  `HarnessRegistry`.

S1's deliverable has **no structured `.code`** — the error is only identifiable by message text.
S2's contribution is to make the code **structurally accessible** as `CONFIG_ERROR` so the Agent
layer (P3.M1) / workflow retry logic can branch on it (PRD §6.2 `AgentErrorDetails.code`,
§11 restart semantics).

## Decision 1 — define a `ConfigError extends Error` class

A plain `Error` cannot carry `.code`. Define:

```ts
// src/harnesses/claude-code-harness.ts  (top-level, exported)
import { AGENT_ERROR_CODES } from "../types/agent.js";

/**
 * Thrown when a harness receives a configuration it cannot honour — e.g. a model
 * provider it cannot run (ClaudeCodeHarness + non-anthropic, PRD §7.8). Carries a
 * machine-readable `code` (default `AGENT_ERROR_CODES.CONFIG_ERROR`) so callers and
 * Agent retry logic can branch structurally rather than parsing message text.
 *
 * @see AGENT_ERROR_CODES
 */
export class ConfigError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options: { code?: string; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "ConfigError";
    this.code = options.code ?? AGENT_ERROR_CODES.CONFIG_ERROR;
    this.details = options.details;
  }
}
```

**Why a class, not a plain `{ code }` literal thrown via `Error`?**
- `instanceof ConfigError` lets P3.M1 (Agent) write `catch (e) { if (e instanceof ConfigError) ... }`.
- `.code` is the canonical machine-readable handle (matches `AgentErrorDetails.code` shape).
- ES2022 `Error` subclassing works under the project's `target` (tsconfig). The class sets
  `this.name = "ConfigError"` so `err.name` is correct (good stack traces / serialization).

**Placement — `claude-code-harness.ts`, not a shared `src/errors/` module.**
- The codebase has no `src/errors/` dir today; `src/types/error.ts` is a TYPE-ONLY module
  (just the `WorkflowError` interface). Adding a runtime class there breaks its type-only nature.
- S2's contract only names the claude-code anthropic-only constraint. PiHarness (P2.M2) is
  vendor-neutral and won't throw this specific error. If P2.M2/P2.M3 later need a shared config
  error, they can extract `ConfigError` to a neutral module then — YAGNI for S2.
- P3.M1 (Agent) imports `ConfigError` from `claude-code-harness.js` to catch + map it to an
  `AgentResponse` error with `code: CONFIG_ERROR`. One-way dependency (claude-code-harness.ts →
  agent.ts via `AGENT_ERROR_CODES`); `agent.ts` never imports the harness → **no cycle**.

## Decision 2 — add `CONFIG_ERROR` to `AGENT_ERROR_CODES` (src/types/agent.ts)

Current `AGENT_ERROR_CODES` keys (src/types/agent.ts L610-653):
`INVALID_RESPONSE_FORMAT, VALIDATION_FAILED, EXECUTION_FAILED, API_REQUEST_FAILED,
TOOL_EXECUTION_FAILED, INTERNAL_ERROR`. **No `CONFIG_ERROR`.**

Add (purely additive — no breakage, `as const` object gains a key):

```ts
  /**
   * Invalid harness/provider configuration
   *
   * Use when a harness receives a configuration it cannot honour — e.g. a model
   * provider it cannot run (ClaudeCodeHarness only runs anthropic/* per PRD §7.8).
   * Non-recoverable: the caller must select a different harness or model, not retry.
   */
  CONFIG_ERROR: 'CONFIG_ERROR',
```

`AgentErrorDetails.code` is typed `string` (open), so a literal would also compile — but using
the constant is consistent with the codebase convention (SCREAMING_SNAKE_CASE from
`AGENT_ERROR_CODES`) and makes the code discoverable + greppable. Tests reference
`AGENT_ERROR_CODES.CONFIG_ERROR`.

## Decision 3 — `normalizeModel` throws `ConfigError` (message text PRESERVED)

```ts
// src/harnesses/claude-code-harness.ts — normalizeModel()
normalizeModel(model: string): ModelSpec {
  const spec = parseModelSpec(model, "anthropic");

  // PRD §7.8 — claude-code can ONLY run anthropic/* models. Compare against the literal
  // LLM-host 'anthropic', NOT this.id (the harness id 'claude-code' — a different axis).
  if (spec.provider !== "anthropic") {
    throw new ConfigError(
      `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
        `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
        `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
      {
        code: AGENT_ERROR_CODES.CONFIG_ERROR,
        details: { provider: spec.provider, model: spec.model, harnessId: this.id },
      },
    );
  }
  return spec;
}
```

**Critical:** the message string is IDENTICAL to S1's plain-`Error` message. This means every
`.toThrow(/...message.../)` and `toContain('ClaudeCodeHarness')` / `toContain('HarnessRegistry')`
assertion that S1 updated in `claude-code-harness-normalizemodel.test.ts` STILL PASSES. S2 only
ADDS new assertions (`instanceof ConfigError`, `.code === CONFIG_ERROR`). No S1 assertion is
weakened or removed.

## Decision 4 — `execute`/`executeStreaming` enforce via propagation (no duplicate check)

`execute` already calls `this.normalizeModel(request.options.model ?? "...")`:
- non-streaming path: `claude-code-harness.ts` L409 (inside the async IIFE returning
  `Promise<AgentResponse<T>>`).
- streaming path: `executeStreaming` L641 (inside the async generator).

There is **NO try/catch wrapping either normalizeModel call** (verified: the only
`createErrorResponse` sites in execute are the "missing result message" L551 and
"subtype !== success" L566 — both inline returns, not a catch). So a `ConfigError` thrown by
`normalizeModel`:
- non-streaming → rejects the IIFE's promise → `execute()` returns a rejected `Promise` →
  "execute throws a clear config error (code CONFIG_ERROR)" ✓.
- streaming → throws on the first generator `.next()` (normalizeModel runs before the first
  `yield`) → "surfaced at execute" ✓.

**No duplicate provider check in execute** — DRY. `normalizeModel` is the single enforcement
point; execute inherits it. (Adding a second check risks the two drifting.) This satisfies the
contract's "Update ... execute to throw" via the existing call site — execute propagates the
ConfigError. Verified by the new execute-CONFIG_ERROR test.

**Ordering note (acceptable):** execute checks `if (!this.sdk) throw "SDK not initialized"`
(L376) BEFORE normalizeModel (L409). If the SDK is uninitialized AND the model is non-anthropic,
the SDK-init error wins. That's fine — initialization is a prerequisite; the contract does not
mandate a relative ordering. Tests stub `provider.sdk = {} as any` to reach the normalizeModel
check (the stub is never invoked because normalizeModel throws first).

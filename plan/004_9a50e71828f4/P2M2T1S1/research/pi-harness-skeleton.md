# Research — `PiHarness` class skeleton design (P2.M2.T1.S1)

> The exact shape of `src/harnesses/pi-harness.ts`. Mirrors `ClaudeCodeHarness`
> (src/harnesses/claude-code-harness.ts) structurally, minus the SDK wiring (S2) and
> minus the anthropic-only model constraint (pi is provider-open — PRD §7.4/§7.8).

## 1. File location & barrel boundary

- **CREATE** `src/harnesses/pi-harness.ts` (sibling of `claude-code-harness.ts`).
- **DO NOT** add `PiHarness` to `src/harnesses/index.ts`. The existing barrel exports only
  `HarnessRegistry`/`ProviderRegistry`/`InitializationStatus` + the session stores — it does **NOT**
  export `ClaudeCodeHarness` (verified: `grep ClaudeCodeHarness src/harnesses/index.ts` → no hit).
  Tests and downstream tasks import harness classes **directly from the file**
  (`import { ClaudeCodeHarness } from '../../../harnesses/claude-code-harness.js'` — see every
  `src/__tests__/unit/providers/claude-code-harness-*.test.ts`). `PiHarness` follows the same
  convention. ➡️ zero barrel edit = zero merge surface with the parallel P2.M1.T1.S2 work.
- **DO NOT** add `PiHarness` to `src/index.ts` (public API). The full Harness-surface public export is
  **P3.M3.T1.S1** ("Export Harness surface + deprecated aliases in src/index.ts"). Both the parallel
  P2.M1.T1.S2 PRP and P1.M1.T1.S1 honored this boundary; S1 of P2.M2 must too.

## 2. Capability flags — ALL `true` (PRD §7.4 `pi` column)

```ts
readonly capabilities: HarnessCapabilities = {
  mcp: true,            // via Groundswell MCPHandler (tools registered with the harness) — PRD §7.4/§7.10
  skills: true,         // native agentskills.io — PRD §7.4/§7.12 (VERIFIED: loadSkills/formatSkillsForPrompt)
  lsp: true,            // via MCP plugins through MCPHandler — PRD §7.4
  streaming: true,      // session.subscribe (MessageUpdateEvent) — PRD §7.4/§7.11
  sessions: true,       // SessionManager (fork/switch/clone) — PRD §7.4/§1.7
  extendedThinking: true, // model-dependent — PRD §7.4
} satisfies HarnessCapabilities;
```

`satisfies HarnessCapabilities` (not `as`) is the repo idiom — `ClaudeCodeHarness` uses it (L~111).
It type-checks the literal WITHOUT widening it.

## 3. normalizeModel — delegate to `parseModelSpec` (NO anthropic constraint)

```ts
normalizeModel(model: string): ModelSpec {
  // Pi is vendor-neutral: ANY provider is valid (PRD §7.4 "LLM providers: any", §7.8 open set).
  // Unlike ClaudeCodeHarness, there is NO `spec.provider !== "anthropic"` gate here.
  return parseModelSpec(model);
}
```

- `parseModelSpec` (src/utils/model-spec.ts, P1.M1.T2.S1) already implements open-set validation:
  rejects empty/whitespace, rejects empty provider/model parts, REJECTS harness-qualified 3-segment
  strings like `pi/anthropic/x` (PRD §7.8 critical rule), and accepts any non-empty provider.
- Default provider arg omitted → `parseModelSpec` defaults to `'anthropic'` (so plain `claude-sonnet-4`
  resolves to `{provider:'anthropic',...}`, matching ClaudeCodeHarness's happy path).
- **Scope boundary:** this is the string→ModelSpec layer. S2 ("ModelSpec→Model<any>") owns the
  conversion to Pi's `Model<any>` via `getModel(provider, model)` (from `@earendil-works/pi-ai`,
  a transitive dep — see external_deps.md §1.3). Delegating to `parseModelSpec` here does NOT pre-empt
  S2; it reuses existing infra and returns a correct `ModelSpec` S2 can consume. This is the "return
  stubs" option the contract explicitly permits (vs a throwing stub). Recommended.

## 4. The throwing stubs (S2+ own the real bodies)

```ts
async initialize(_options?: HarnessOptions): Promise<void> {
  throw new Error('PiHarness.initialize() not implemented — P2.M2.T1.S2 wires createAgentSession()');
}
async terminate(): Promise<void> {
  throw new Error('PiHarness.terminate() not implemented — P2.M2.T1.S2');
}
async execute<T>(
  _request: HarnessRequest,
  _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  _hooks?: HarnessHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  throw new Error('PiHarness.execute() not implemented — P2.M2.T2.S1 (prompt/subscribe/result)');
}
async registerMCPs(_servers: MCPServer[]): Promise<Tool[]> {
  throw new Error('PiHarness.registerMCPs() not implemented — P2.M4.T1.S2 (MCPHandler.toPiCustomTools)');
}
async loadSkills(_skills: Skill[]): Promise<void> {
  throw new Error('PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io)');
}
```

- Each error message cites the subtask that OWNS the real implementation (S2 / P2.M2.T2.S1 /
  P2.M4.T1.S2 / P2.M3.T2.S3) — so the next implementer knows exactly where to look.
- Underscore-prefixed params (`_request`) avoid `noUnusedParameters`-style noise under `strict`
  (tsconfig has `"strict": true`; tsc does not error on unused params by default, but the prefix is
  the repo's existing convention — ClaudeCodeHarness methods use named params; the `_` prefix is safe
  and self-documenting for stubs).
- `execute`'s declared return type is the **full interface union** (`Promise<AgentResponse<T>> |
  AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`). Even though it throws, declaring the
  union keeps the signature byte-faithful to `Harness.execute` so S2 can fill either branch without
  re-touching the signature. (A function that throws is assignable to any return type.)

## 5. The trivial (fully implemented) methods — mirror ClaudeCodeHarness L~127/L~133

```ts
supports(capability: keyof HarnessCapabilities): boolean {
  return this.capabilities[capability];
}
requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean {
  return features.every((f) => this.capabilities[f]);
}
```

`requiresFeatures([])` → `true` (every() on empty = true — matches the interface contract "empty array → true").

## 6. Imports (isolatedModules-safe — `import type` for types, value import for parseModelSpec)

```ts
import type {
  Harness, HarnessId, HarnessCapabilities, HarnessOptions,
  HarnessRequest, HarnessHookEvents, ToolExecutionRequest, ToolExecutionResult, ModelSpec,
} from "../types/harnesses.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import type { AgentResponse } from "../types/agent.js";
import type { StreamEvent } from "../types/streaming.js";
import { parseModelSpec } from "../utils/model-spec.js";
```

- `parseModelSpec` is a RUNTIME value import (it is a real function, not a type). The other five
  imports are `import type` (erased at compile time → no runtime cycle, satisfies `isolatedModules`).
- This mirrors ClaudeCodeHarness's import block (L~41–59): it uses `import type` for the Harness/
  sdk-primitives/agent/streaming types and a value import for `createSuccessResponse`/`createErrorResponse`
  + `parseModelSpec`. PiHarness needs no `createSuccessResponse` (execute throws, it doesn't build one yet).

## 7. "compiles & registers" = structural assignability to `Provider`

The contract's "registers" criterion is satisfied by **structural typing**, NOT by editing the registry:
- `HarnessRegistry.register(provider: Provider)` (src/harnesses/harness-registry.ts) takes a `Provider`.
- `Provider` (src/types/providers.ts L569) is a structural interface: `readonly id: ProviderId`,
  `readonly capabilities: ProviderCapabilities`, + the same method set as `Harness`.
- `'pi' ∈ ProviderId` because `ProviderId = HarnessId | 'anthropic' | 'opencode'` and `HarnessId = 'pi' | 'claude-code'`.
- `PiHarness implements Harness` ⇒ `new PiHarness()` is structurally assignable to `Provider` ⇒
  `registry.register(new PiHarness())` compiles. This is the SAME mechanism ClaudeCodeHarness relies on
  (P2.M1.T1.S1 GOTCHA #9 — "ClaudeCodeHarness is structurally assignable to Provider").
- ➡️ A test asserts `const p: Provider = new PiHarness();` compiles AND that
  `HarnessRegistry.getInstance().register(new PiHarness())` then `has('pi') === true`. That IS the
  "registers" proof — at the type + runtime level — without touching `register-defaults.ts`.

## 8. What this file deliberately does NOT contain (deferred)

| Concern | Owner | Why deferred |
|---|---|---|
| `createAgentSession()` wiring / `private session` field | P2.M2.T1.S2 | "Implement initialize/terminate + model resolution" |
| ModelSpec→`Model<any>` via `getModel()` | P2.M2.T1.S2 | "ModelSpec→Model<any>" |
| `prompt`/`subscribe` → `AgentResponse` aggregation | P2.M2.T2.S1 | session lifecycle |
| `customTools: ToolDefinition[]` (JSON-Schema→TypeBox) | P2.M3.T1.S1 + P2.M4.T1.S1/S2 | tool bridge |
| StreamEvent mapping from Pi events | P2.M3.T2.S1 | streaming |
| HarnessHookEvents adaptation | P2.M3.T2.S2 | hooks |
| Native skill loading + register as default | P2.M3.T2.S3 | skills + registry registration |

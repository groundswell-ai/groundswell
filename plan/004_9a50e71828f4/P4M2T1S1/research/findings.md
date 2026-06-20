# Research Findings — P4.M2.T1.S1 (Parity tests: identical AgentResponse + tool execution semantics)

Source files read: `src/harnesses/pi-harness.ts`, `src/harnesses/claude-code-harness.ts`,
`src/types/harnesses.ts`, `src/types/agent.ts`, `src/core/agent.ts`, `src/__tests__/adversarial/prd-compliance.test.ts`,
`src/__tests__/integration/provider-switching.test.ts`, `src/__tests__/integration/agent-workflow.test.ts`,
`src/__tests__/unit/providers/pi-harness-execute.test.ts`, `src/__tests__/unit/providers/claude-code-harness-execute.test.ts`,
`vitest.config.ts`.

## 1. Proven mocking pattern (USE THIS — do not invent vi.mock module mocks)

Both harnesses **lazy-import their SDK inside `initialize()`** via `await import(...)`. The codebase's
26 harness unit tests therefore mock the SDK by **overwriting the private `sdk` field after a real
`initialize()`**, NOT via module-level `vi.mock(...)`. This is what "mock both SDK imports" means in
this repo.

### PiHarness (`src/__tests__/unit/providers/pi-harness-execute.test.ts`)
```ts
harness = new PiHarness();
await harness.initialize();                       // loads real SDK into this.sdk
const fakeSession = makeFakeSession(events);      // { subscribe(l)->unsub, prompt(text)->replays events }
// @ts-expect-error - private field access for testing
harness.sdk = { ...harness.sdk, createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }) };
```
- Fake session event shapes (verified): `{type:'session_start'}`, `{type:'turn_end', message:{role:'assistant',
  content:[{type:'text',text}|{type:'toolCall',id,name,arguments}], usage:{input,output,...}}}`,
  `{type:'agent_end'}`, `{type:'session_shutdown'}`.
- For tool round-trip: `createAgentSession` receives `{ customTools: harness.buildCustomTools() }`.
  Capture `callArgs.customTools`; each entry has `.name` and `.execute(args)`. Invoking
  `customTools[i].execute({q:'x'})` calls the registered `toolExecutor({name, input:{q:'x'}})`.

### ClaudeCodeHarness (`src/__tests__/unit/providers/claude-code-harness-execute.test.ts`)
```ts
provider = new ClaudeCodeHarness();
await provider.initialize();
// @ts-expect-error - Testing private property
provider.sdk = {
  query: vi.fn().mockImplementation(({ prompt, options }) => (async function* () {
    yield { type:'assistant', message:{ content:[ {type:'text',text:'Hello'} | {type:'tool_use',id,name,input} ] } };
    yield { type:'result', subtype:'success', result:{data:'...'}, usage:{input_tokens,output_tokens} };
  })()),
  createSdkMcpServer: vi.fn(),
  tool: vi.fn(),
};
```
- `query()` returns an `AsyncGenerator<SDKMessage>`.

## 2. AgentResponse parity is ACHIEVABLE — identical metadata keys on success

Both success paths call the SAME factory (`createSuccessResponse`) with the SAME metadata shape:
```ts
createSuccessResponse(data, {
  agentId: this.id,           // 'pi' vs 'claude-code' — VALUE differs, KEY present in both
  timestamp: Date.now(),      // volatile
  duration,                   // number >= 0
  usage: { input_tokens, output_tokens },
  toolCalls: <count>,
});
```
Factory (`src/types/agent.ts:709`): `{ status:'success', data, error:null, metadata }`.
- **Parity assertion**: `status`, `data`, `error===null`, and metadata KEY-SET
  (`agentId,timestamp,duration,usage,toolCalls`) identical; `usage` + `toolCalls` VALUES identical
  (controllable via mock); `agentId` + `timestamp` + `duration` VALUES legitimately differ.
- Error path: `createErrorResponse(code, message, details, recoverable)` → `{status:'error', data:null,
  error:{code,message,details,recoverable}, metadata:{agentId:'unknown',timestamp}}`. Both harnesses
  use the same EXECUTION_FAILED error path → shape parity is clean.

## 3. CRITICAL ASYMMETRY — tool execution is NOT architecturally identical (PRD §7.14 gap)

This is the single most important gotcha. A naive "both call the shared toolExecutor with identical
request" assertion **FAILS**:

| Aspect | PiHarness | ClaudeCodeHarness (non-streaming `execute`) |
|---|---|---|
| Who executes the tool | `toolExecutor` (Groundswell) — via `buildCustomTools()` `execute` delegating to `toolExecutor` | The **SDK itself** via the `mcpServers`/`createSdkMcpServer` wrapper; `toolExecutor` param is **NOT invoked** for execution |
| tool_use handling in `execute` | dispatched by Pi runtime inside `session.prompt()` | only **counted** (`toolCallCount++`, claude-code-harness.ts:532-540) |
| `onToolStart`/`onToolEnd` hook args | REAL `{name,input}` / `{content, isError:real, duration:real}` | `{name,input}` / `{content, isError:false ALWAYS, duration:0 ALWAYS}` (SDK limitation, claude-code-harness.ts:1125) |
| `toolCalls` metadata | counts `toolCall` blocks in turn_end | counts `tool_use` blocks in assistant msg |

**Therefore the parity test asserts SHAPE parity, not value equality, for tool round-trips:**
- Both surface `ToolExecutionRequest {name, input}` and `ToolExecutionResult {content, isError}`.
- Both preserve namespaced names (`server__tool`) unchanged.
- Both increment `toolCalls` in metadata identically (script same tool count in each mock).
- PiHarness: assert the shared stub `toolExecutor` IS invoked with `{name, input}` and its
  `{content, isError}` is returned (via customTools capture).
- ClaudeCodeHarness: assert `toolCalls` metadata + the hooks adapter fires with the request/result SHAPE.
- **Do NOT** assert `isError`/`duration` VALUE equality across harnesses — that gap is a tracked
  fidelity difference (PiHarness > claude-code), documented in pi-harness.ts "fireHookEvents" note.

## 4. Workflow-context parity (PRD §7.14.6)

`Agent.executePrompt` (agent.ts:594) resolves the harness via `HarnessRegistry.getInstance().get(resolvedHarness)`,
calls `harness.execute(request, this.toolExecutor.bind(this), harnessHooks)`, and the `harnessHooks`
(`onToolStart`/`onToolEnd`, agent.ts:688-703) call `emitWorkflowEvent → ctx.emitEvent` when the agent
runs inside a workflow context (`runInContext` / `getExecutionContext`).
- Register BOTH mocked harness instances in `HarnessRegistry` in `beforeEach`.
- Run an Agent (`harness:'pi'` then `harness:'claude-code'`) inside `runInContext(...)` with an observer
  capturing `WorkflowEvent[]`; assert both emit the same EVENT TYPES for an equivalent scripted turn.

## 5. Test infra facts
- `npm test` = `vitest run`; `npm run lint` = `tsc --noEmit`; `npm run build` = `tsc`.
- `vitest.config.ts`: `include: src/__tests__/**/*.test.ts`, `globals:true`. Existing tests still
  `import { describe, it, expect, vi, beforeEach } from 'vitest'` explicitly — follow that.
- Registry reset: `HarnessRegistry._resetForTesting()` + `HarnessRegistry.getInstance()._resetInitStateForTesting()`
  in beforeEach/afterEach (pattern from pi-harness-execute.test.ts).
- No new deps. File goes to `src/__tests__/integration/harness-parity.test.ts`.

## 6. Contract → PRD section mapping (the three describe blocks)
- §7.14.4 identical AgentResponse → "AgentResponse parity"
- §7.14.1 MCP/tool execution → "Tool execution shape parity"
- §7.14.6 workflow integration events → "Workflow-context parity"

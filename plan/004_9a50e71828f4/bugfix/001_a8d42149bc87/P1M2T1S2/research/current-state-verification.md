# P1.M2.T1.S2 — Current-State Verification (post-S1)

Scope: confirm the exact current state of every file/line the S2 contract references, so the
PRP's line numbers and signatures are accurate (not stale from the architecture doc, which was
written pre-S1). Investigation only — no source edits.

## S1 dependency — CONFIRMED present

`MCPHandler.toAgentToolResultFromExecResult` exists and is **public** (verified):
- `src/core/mcp-handler.ts:292-305` (method body)
- `src/core/mcp-handler.ts:21` — `import type { MCPServer, Tool, ToolResult, ToolExecutionResult } from '../types/index.js';` (ToolExecutionResult already imported by S1)
- Signature: `public toAgentToolResultFromExecResult(result: ToolExecutionResult): AgentToolResult<{ isError: boolean }>`
- Body reads `result.content` (string passthrough, else JSON.stringify) and `result.isError` → `details.isError`.

S2 can consume it directly via `this.mcpHandler.toAgentToolResultFromExecResult(res)`.

## `src/harnesses/pi-harness.ts` — verified line numbers (post-S1, unchanged by S1)

### `execute()` signature + streaming forward (L212-223)
```ts
execute<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,   // L214
  hooks?: HarnessHookEvents,
): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
  if (request.options.streaming) {
    if (!this.sdk || !this.modelRegistry || !this.authStorage) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    return this.executeStreaming<T>(request, toolExecutor, hooks);   // L223 — ONLY forward
  }
```

### Call site #1 — non-streaming `createAgentSession` (L246-252)
```ts
const { session } = await this.sdk!.createAgentSession({
  model,
  modelRegistry: this.modelRegistry,
  authStorage: this.authStorage,
  customTools: this.buildCustomTools(),   // L250 — NO toolExecutor arg
  ...(resourceLoader ? { resourceLoader } : {}),
});
```

### `executeStreaming()` signature (L348-352)
```ts
private async *executeStreaming<T>(
  request: HarnessRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,   // L350
  hooks?: HarnessHookEvents,
): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
```

### Call site #2 — streaming `createAgentSession` (L366-372)
```ts
const { session } = await this.sdk!.createAgentSession({
  model,
  modelRegistry: this.modelRegistry,
  authStorage: this.authStorage,
  customTools: this.buildCustomTools(),   // L370 — NO toolExecutor arg
  ...(resourceLoader ? { resourceLoader } : {}),
});
```

### `buildCustomTools()` (L654-661)
```ts
private buildCustomTools(): ToolDefinition[] {
  return this.mcpHandler.toPiCustomTools();
}
```

`grep toolExecutor src/harnesses/pi-harness.ts` returns exactly 3 hits (L214 sig, L223 forward,
L350 sig) — ZERO call sites. **Bug CONFIRMED still present.**

## `src/core/mcp-handler.ts` — `toPiCustomTools()` (L236-261, unchanged by S1)

```ts
public toPiCustomTools(): ToolDefinition[] {
  const tools = this.getTools();
  if (tools.length === 0) return [];
  return Array.from(this.registeredTools.entries()).map(([fullName, registered]) =>   // fullName = map key
    defineTool({
      name: fullName,
      label: fullName,
      description: registered.tool.description,
      parameters: jsonSchemaToTypebox(registered.tool.input_schema),
      execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
        try {
          const result = await registered.executor(params);   // L253 — harness's OWN executor
          return this.toAgentToolResult(result, false);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return this.toAgentToolResult(`Error: ${message}`, true);
        }
      },
    }),
  );
}
```
- `fullName` is the map key already in scope at L237 — use it as `toolExecutor({ name: fullName, ... })`.
- Execute param order: `(_toolCallId, params, _signal, _onUpdate, _ctx)`. `params` is the Pi SDK's tool input.
- Zero-arg today; S2 adds optional `toolExecutor?` param.

## Types — `src/types/harnesses.ts` (L128-150)

```ts
export interface ToolExecutionRequest {   // L128
  name: string;        // may be namespaced: "server__tool"
  input: unknown;
}
export interface ToolExecutionResult {    // L145
  content: string | unknown;
  isError: boolean;
}
```

## Existing test — `src/__tests__/unit/providers/pi-harness-customtools.test.ts`

Three describes. The two that matter for backward-compat analysis:
1. `describe('delegation')` — `harness.buildCustomTools()` called with **NO args** (L79).
   → Stays green ONLY if the new `toolExecutor` param is OPTIONAL (fallback path).
2. `describe('execute() integration — customTools wired')` — `vi.spyOn(mcpHandler, 'toPiCustomTools').mockReturnValue([fakeToolDef])` (L73), then `harness.execute({ prompt:'hi', options:{} }, executor)` (L100).
   → The spy uses `.mockReturnValue` (ignores args), so even after S2 threads `toolExecutor` into `toPiCustomTools`, the spy still returns `[fakeToolDef]`. The captured `customTools[0].execute` is `fakeToolDef.execute` (a vi.fn that does NOT call toolExecutor). Test asserts shape only — **still green after S2**.

**Conclusion**: keeping `toolExecutor` OPTIONAL on BOTH `buildCustomTools` and `toPiCustomTools`
(with `undefined` → current behavior) leaves this entire file untouched. This matches the
contract's explicit preference ("prefer keeping the fallback so the existing test is untouched").

## Scope boundaries (do NOT touch in S2)

- `ClaudeCodeHarness` — uses `toAgentSDKServer()` (mcp-handler.ts:170-219), unaffected.
- `skills` / `resourceLoader` path — unrelated.
- `toAgentToolResult` (private, L272-281) — ClaudeCode path, untouched.
- `Agent.toolExecutor` (agent.ts:180) — already passes `self.toolExecutor.bind(self)` to `harness.execute()` at agent.ts:496 and :806; no Agent change needed.
- Regression test (asserting toolExecutor is invoked) is **P1.M2.T1.S3**, NOT S2.

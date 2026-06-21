# Issue 2 — PiHarness ignores the `toolExecutor` callback (verified)

Scope: investigation only. No source edits made. Every claim below is quoted verbatim
with the exact file:line where it lives.

The PRD's central claim is **confirmed**: `PiHarness.execute()` /
`PiHarness.executeStreaming()` declare a `toolExecutor` parameter, forward it nowhere
useful (only into the streaming branch), and never actually call it. Tool execution
flows exclusively through `MCPHandler.toPiCustomTools()` → `registered.executor`, which
is the executor stashed inside the harness's own `MCPHandler` at `registerServer()`
time — NOT the caller-supplied callback.

This breaks the contract `Harness.execute()` advertises (the caller expects its
`toolExecutor` to be the source of truth for tool dispatch), and it means
`Agent.toolExecutor` (the method that resolves tools via delegated
`MCPHandler[]` + main `MCPHandler`) is bypassed whenever the Pi harness is selected.

---

## Files Retrieved
1. `src/harnesses/pi-harness.ts` (lines 1–757) — the harness; all findings 1–4, 6.
2. `src/core/mcp-handler.ts` (lines 1–end) — `toPiCustomTools()` and
   `toAgentToolResult()`; finding 5.
3. `src/__tests__/unit/providers/pi-harness-customtools.test.ts` (full file) —
   finding 8.
4. `src/core/agent.ts` (lines 146–227, 495–497, 805–807) — `Agent.toolExecutor`
   definition and its two `harness.execute(...)` call sites; finding 9.
5. `src/types/harnesses.ts` (lines 125–150) — `ToolExecutionRequest` and
   `ToolExecutionResult` interface definitions; finding 7.
6. `src/types/providers.ts` (re-exports only) — confirms
   `ToolExecutionResult` is canonical in `harnesses.ts`.

---

## Finding 1 — `execute()` signature; `toolExecutor` is declared, forwarded only to streaming branch, NEVER invoked

File: `src/harnesses/pi-harness.ts`

Signature — lines 212–216:
```ts
  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
```

Streaming branch — line 223 (the ONLY use of `toolExecutor` anywhere in `execute`):
```ts
      return this.executeStreaming<T>(request, toolExecutor, hooks);
```

That is the sole mention of `toolExecutor` inside `execute()`. After the streaming
early-return, the non-streaming IIFE (lines 225–345) never references it. There is
no `toolExecutor({ name, input })` call anywhere in the body.

A full-file `grep toolExecutor src/harnesses/pi-harness.ts` returns exactly three
matches — all are signature / forward lines:
- `pi-harness.ts:214` — `execute` parameter
- `pi-harness.ts:223` — forwarded into `executeStreaming(...)`
- `pi-harness.ts:350` — `executeStreaming` parameter

There are ZERO call-site matches (`toolExecutor(`). **Claim CONFIRMED.**

---

## Finding 2 — `executeStreaming()` signature; `toolExecutor` parameter is never invoked

File: `src/harnesses/pi-harness.ts`, lines 348–352:
```ts
  private async *executeStreaming<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
```

`toolExecutor` is declared at line 350 and then **dropped**. The body (lines 353–546)
never references it again. Tool results emitted on the stream
(`tool_call_start` / `tool_call_done` at lines 462–475) come from the Pi SDK's
own tool dispatcher, which in turn calls each `customTools[i].execute` — i.e. the
executor captured by `MCPHandler.toPiCustomTools()`, NOT the caller's
`toolExecutor`. **Claim CONFIRMED.**

---

## Finding 3 — `buildCustomTools()` body: pure delegation, no `toolExecutor` rebinding

File: `src/harnesses/pi-harness.ts`, lines 649–661 (verbatim):
```ts
  /**
   * Build Pi `ToolDefinition[]` from the registered MCPHandler tools (PRD §7.10, §7.12, §7.14.1).
   *
   * Delegates to `MCPHandler.toPiCustomTools()` (P2.M4.T1.S2) which produces schema-faithful
   * ToolDefinitions with REAL TypeBox `parameters` (converted via `jsonSchemaToTypebox`) and
   * `execute` delegating to `registered.executor` (Claude parity).
   */
  private buildCustomTools(): ToolDefinition[] {
    return this.mcpHandler.toPiCustomTools();
  }
```

The method is a one-liner: `return this.mcpHandler.toPiCustomTools();` (line 660).
It takes no arguments and does not close over `toolExecutor` (which, being a
function-scoped parameter of `execute`/`executeStreaming`, isn't even in scope here —
`buildCustomTools` is a class method on `this`). **Claim CONFIRMED.**

---

## Finding 4 — All `buildCustomTools()` call sites inside `pi-harness.ts`

There are exactly two; both are inline expressions fed straight to
`createAgentSession({ customTools })`. Neither call receives any argument and
neither captures the result in a variable that is later filtered/rebound.

### 4a. Non-streaming `execute()` — line 250

File: `src/harnesses/pi-harness.ts`, lines 245–252:
```ts
      // Create the Pi session. customTools: [] — Groundswell tools wired in P2.M3.T1.
      const { session } = await this.sdk!.createAgentSession({
        model,
        modelRegistry: this.modelRegistry,
        authStorage: this.authStorage,
        customTools: this.buildCustomTools(),
        ...(resourceLoader ? { resourceLoader } : {}), // skills injection; omitted when no skills
      });
```

- `this.buildCustomTools()` is called with NO arguments (no `toolExecutor` threaded).
- The resulting `ToolDefinition[]` is passed directly as `customTools` to
  `createAgentSession`.

### 4b. Streaming `executeStreaming()` — line 370

File: `src/harnesses/pi-harness.ts`, lines 365–372:
```ts
    // REUSE P2.M3.T1.S1's customTools seam (Decision 1) — do NOT pass customTools: [].
    const { session } = await this.sdk!.createAgentSession({
      model,
      modelRegistry: this.modelRegistry,
      authStorage: this.authStorage,
      customTools: this.buildCustomTools(),
      ...(resourceLoader ? { resourceLoader } : {}), // skills injection; omitted when no skills
    });
```

Identical pattern: no argument, no rebinding, direct handoff to `createAgentSession`.
**Claim CONFIRMED** — there is no place at which `toolExecutor` could be wired into
`buildCustomTools`, because the call sites don't pass it and the method doesn't
accept it.

---

## Finding 5 — `MCPHandler.toPiCustomTools()`: each tool's `execute` delegates to `registered.executor`, NOT to the caller's `toolExecutor`

File: `src/core/mcp-handler.ts`, lines 236–261:
```ts
  public toPiCustomTools(): ToolDefinition[] {
    const tools = this.getTools();
    if (tools.length === 0) return [];
    return Array.from(this.registeredTools.entries()).map(([fullName, registered]) =>
      defineTool({
        name: fullName,
        label: fullName,
        description: registered.tool.description,
        parameters: jsonSchemaToTypebox(registered.tool.input_schema),
        execute: async (
          _toolCallId: string,
          params: unknown,
          _signal: AbortSignal | undefined,
          _onUpdate: undefined,
          _ctx: ExtensionContext,
        ): Promise<AgentToolResult<{ isError: boolean }>> => {
          try {
            const result = await registered.executor(params);
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

Key facts:
- Line 253: `const result = await registered.executor(params);` — the dispatch target
  is `registered.executor`, a closure stashed inside `MCPHandler.registeredTools` at
  `registerServer()` time (see `createToolExecutor`, mcp-handler.ts ~line 327).
- The method takes **no parameters** — there is no seam through which an external
  `toolExecutor` could be passed.
- The closure captures only `registered` (and `this`), never an externally-supplied
  callback. The "input" the Pi SDK passes (`params`) goes straight to
  `registered.executor(params)`.

`registered.executor` for an `inprocess` server (the only currently supported
transport that actually works — see `createToolExecutor` at mcp-handler.ts ~329)
looks up a function previously registered via
`MCPHandler.registerToolExecutor(serverName, toolName, executor)`. That is the
**only** way to make an inprocess tool fire. The `Agent` does NOT call
`registerToolExecutor` for the tools it owns; it expects the harness to call its
`toolExecutor` callback. So Pi tools registered on the Agent's `MCPHandler` will
hit the `No executor registered for inprocess tool '…'` throw inside
`createToolExecutor`. **Claim CONFIRMED.**

---

## Finding 6 — How `customTools` reaches the Pi session

Both call sites use the same shape. Non-streaming version, file
`src/harnesses/pi-harness.ts`, lines 246–252 (streaming is identical at 366–372):

```ts
      const { session } = await this.sdk!.createAgentSession({
        model,
        modelRegistry: this.modelRegistry,
        authStorage: this.authStorage,
        customTools: this.buildCustomTools(),
        ...(resourceLoader ? { resourceLoader } : {}),
      });
```

`customTools: this.buildCustomTools()` is the only place `customTools` enters the Pi
session. Nothing else feeds tools to Pi — there is no `tools:` field, no MCP
transport wired up, nothing. So whatever `buildCustomTools()` returns is the
**entire** tool surface Pi sees, and those tools all dispatch through
`registered.executor` (Finding 5). The caller's `toolExecutor` is structurally
unreachable. **Claim CONFIRMED.**

---

## Finding 7 — `ToolExecutionResult` interface (and the result conversion path)

File: `src/types/harnesses.ts`, lines 145–150:
```ts
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;
  /** Whether the execution resulted in an error */
  isError: boolean;
}
```

(`ToolExecutionRequest`, sibling type, lives at harnesses.ts:127–131:
`{ name: string; input: unknown }`.)

There is **no** `toAgentToolResultFromExecResult` helper. The Pi-side conversion is
`MCPHandler.toAgentToolResult(result: unknown, isError: boolean)` at
`src/core/mcp-handler.ts`, lines 272–281:
```ts
  private toAgentToolResult(
    result: unknown,
    isError: boolean,
  ): AgentToolResult<{ isError: boolean }> {
    const text = typeof result === 'string' ? result : JSON.stringify(result);
    return { content: [{ type: 'text' as const, text }], details: { isError } };
  }
```

Critical mismatch: `toAgentToolResult` accepts the **raw executor output** (typed
`unknown`) and stringifies it directly — it does NOT read `result.content` /
`result.isError`. So even if someone wired the caller's `toolExecutor` (which
returns a `ToolExecutionResult { content, isError }`) into this path, the resulting
Pi tool result would be `JSON.stringify({content, isError})` — i.e. the entire
ToolExecutionResult object stringified into one text chunk, rather than the
semantic content. Any fix that swaps `registered.executor` for the caller's
`toolExecutor` must also replace `toAgentToolResult` with a converter that
understands the `ToolExecutionResult` shape. **Claim CONFIRMED.**

---

## Finding 8 — Existing test `pi-harness-customtools.test.ts` does NOT assert `toolExecutor` is called

File: `src/__tests__/unit/providers/pi-harness-customtools.test.ts` (entire file, ~115 lines).

The suite has three `describe` blocks. Their assertions:

1. `describe('delegation')` — spies on `mcpHandler.toPiCustomTools`,
   asserts `harness.buildCustomTools()` returns the **same reference**:
   ```ts
   expect(tools).toBe(fakeTools);            // same reference — pure delegation
   expect(tools).toHaveLength(1);
   expect(tools[0].name).toBe('srv__echo');
   ```

2. `describe('empty delegation')` — asserts `[]` round-trips when
   `toPiCustomTools()` returns `[]`:
   ```ts
   expect(tools).toHaveLength(0);
   ```

3. `describe('execute() integration — customTools wired')` — monkey-patches
   `createAgentSession` to capture `opts`, calls `harness.execute({ prompt: 'hi', options: {} }, executor)`
   where `executor` is a `vi.fn()`:
   ```ts
   expect(capturedOpts.customTools).toHaveLength(1);
   expect(capturedOpts.customTools[0].name).toBe('srv__echo');
   expect(typeof capturedOpts.customTools[0].execute).toBe('function');
   ```

Notable gaps:
- The `executor` mock is **passed** to `execute()` but the test **never asserts it
  was called** — no `expect(executor).toHaveBeenCalled()`. (The mock wouldn't be
  called anyway, because the fake `session.prompt` is a no-op that never triggers
  a tool call.)
- The test does not exercise the path where Pi invokes `customTools[0].execute`
  and verifies that invocation routes back to `executor`.
- Nothing asserts `Agent.toolExecutor` is the dispatch target.

So the suite passes today *despite* the bug — it only verifies shape/delegation,
not the runtime dispatch contract. **Claim CONFIRMED.**

---

## Finding 9 — `Agent.toolExecutor` is what gets passed to `harness.execute()`; the harness is supposed to call it

File: `src/core/agent.ts`.

Definition — line 180:
```ts
  private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
```

Body (lines 180–218) resolves the tool via the Agent's delegated `MCPHandler[]`
first, then the main `MCPHandler`, then returns a "not found" error result —
returning a `ToolExecutionResult { content, isError }` (via
`convertToToolExecutionResult`, agent.ts:223–248). This is the canonical
Groundswell tool-dispatch path and the only place Agent-owned tool resolution
lives.

The Agent passes it as the `toolExecutor` argument at both call sites:

Streaming — `src/core/agent.ts`, lines 494–497 (inside `Agent.stream`):
```ts
        const harnessResult = harness.execute<T>(
          harnessRequest,
          self.toolExecutor.bind(self),
          harnessHooks
        );
```

Non-streaming — `src/core/agent.ts`, lines 804–807 (inside `executePrompt`):
```ts
      const harnessResult = harness.execute<T>(
        harnessRequest,
        this.toolExecutor.bind(this),
        harnessHooks
      );
```

So the Agent correctly hands its `toolExecutor` to the harness. The contract is
"the harness MUST call this callback when a tool is requested." `PiHarness`
accepts the argument and then silently drops it (Findings 1–2), routing tool
calls through its OWN `MCPHandler` instead. This is the bug. **Claim CONFIRMED.**

### MCPHandler bridging note
The Agent holds its own `private readonly mcpHandler: MCPHandler` (agent.ts:60)
and a list `mcpHandlers: MCPHandler[]` (line 63) for delegated handlers passed
via `config.mcps`. In its constructor (agent.ts:140–148) it calls
`this.mcpHandler.registerServer(mcp)` for each — which is what populates the
**harness-side** MCPHandler's `registeredTools`. So today the *only* path that
works end-to-end is: harness's MCPHandler has the tools (registered by the
Agent), and the harness's MCPHandler dispatches them via `registered.executor`
internally — completely bypassing `Agent.toolExecutor`, which is the contract
surface. Any inprocess tool whose executor was NOT pre-registered via
`MCPHandler.registerToolExecutor(...)` will throw at dispatch time.

---

## Architecture — how the pieces connect (and where they break)

```
                ┌──────────────────────────────────────────────────────────┐
                │ Agent (src/core/agent.ts)                                 │
                │  - this.mcpHandler.registerServer(mcp)        [ctor]      │
                │  - this.toolExecutor(req): ToolExecutionResult [line 180] │
                │      └─ resolves via mcpHandlers[] + main mcpHandler      │
                └───────────────────────────┬──────────────────────────────┘
                                            │ harness.execute(req,
                                            │                  this.toolExecutor.bind(this),
                                            │                  hooks)        [agent.ts:496, 806]
                                            ▼
                ┌──────────────────────────────────────────────────────────┐
                │ PiHarness.execute(req, toolExecutor, hooks)              │
                │   [pi-harness.ts:212]                                     │
                │   • streaming?  → forwards toolExecutor to                │
                │                  executeStreaming  [line 223]             │
                │   • non-stream: drops toolExecutor on the floor           │
                │                                                          │
                │   BOTH branches call createAgentSession({                 │
                │     customTools: this.buildCustomTools()                  │
                │   })                                                     │
                └───────────────────────────┬──────────────────────────────┘
                                            │
                                            ▼
                ┌──────────────────────────────────────────────────────────┐
                │ PiHarness.buildCustomTools()         [pi-harness.ts:659]  │
                │   return this.mcpHandler.toPiCustomTools();               │
                │   (NO toolExecutor argument, NO rebinding)                │
                └───────────────────────────┬──────────────────────────────┘
                                            │
                                            ▼
                ┌──────────────────────────────────────────────────────────┐
                │ MCPHandler.toPiCustomTools()      [mcp-handler.ts:236]    │
                │   defineTool({                                           │
                │     execute: async (_id, params, ...) => {                │
                │       const result = await registered.executor(params); ◀ │ dispatches HERE
                │       return this.toAgentToolResult(result, false);       │
                │     }                                                    │
                │   })                                                     │
                │                                                          │
                │   registered.executor comes from createToolExecutor()     │
                │   at registerServer() time — NOT from the caller's        │
                │   toolExecutor.                                          │
                └──────────────────────────────────────────────────────────┘
```

The break is the arrow from `PiHarness.execute` down to `buildCustomTools`:
the caller's `toolExecutor` never reaches `toPiCustomTools`, so it can never
become the `execute` closure inside any Pi `ToolDefinition`.

---

## Start Here

Open **`src/harnesses/pi-harness.ts`** at line **659** (`buildCustomTools`).
That is the seam any fix must touch: it must accept `toolExecutor` (or a wrapper
that adapts `(ToolExecutionRequest) => Promise<ToolExecutionResult>` into the
Pi `execute` signature) and use it as the dispatch target instead of (or in
addition to) `registered.executor`. The two callers (pi-harness.ts:250 and
:370) must then pass `toolExecutor` into it.

Companion files to touch in lockstep:
- `src/core/mcp-handler.ts:236` — `toPiCustomTools()` must gain a parameter
  (or a sibling method) that injects the caller's `toolExecutor` as the
  dispatch target.
- `src/core/mcp-handler.ts:272` — `toAgentToolResult(result: unknown, isError)`
  stringifies `result` blindly. If the dispatch target becomes the caller's
  `toolExecutor`, the return type changes to `ToolExecutionResult`, and this
  converter must learn to read `result.content` / `result.isError` instead of
  `JSON.stringify`-ing the whole object.
- `src/__tests__/unit/providers/pi-harness-customtools.test.ts` — add an
  assertion that `executor` is actually invoked when Pi calls
  `customTools[i].execute` (the existing suite has no such check; Finding 8).

---

## Constraints / Risks / Open Questions for the implementing agent

1. **Signature churn is unavoidable.** `buildCustomTools()` is currently
   zero-arg; `toPiCustomTools()` is zero-arg. Both must gain a parameter
   (the `toolExecutor`, or an adapter). Touch only those two signatures plus
   their two call sites — keep scope tight.

2. **Adapter shape mismatch.** Pi's `execute` is
   `(_toolCallId, params, _signal, _onUpdate, _ctx) => Promise<AgentToolResult<{isError:boolean}>>`
   (mcp-handler.ts:246–256). The caller's `toolExecutor` is
   `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>` where
   `ToolExecutionRequest = { name: string; input: unknown }`. The adapter must
   supply `name` (use `fullName`, the map key already in scope at line 237) and
   pass `params` as `input`, then convert the returned `ToolExecutionResult`
   back into an `AgentToolResult`.

3. **`toAgentToolResult` is wrong for this path.** It accepts `unknown` and
   stringifies. The new path returns `ToolExecutionResult` whose `content`
   field is already the semantic payload. Do not reuse `toAgentToolResult`
   blindly — write a sibling (e.g. `toAgentToolResultFromExecResult`) that
   reads `result.content` / `result.isError`.

4. **Backward compatibility with the existing MCPHandler-only path.**
   The Claude harness (`ClaudeCodeHarness`) uses `toAgentSDKServer()`
   (mcp-handler.ts:170–219) which DOES call `registered.executor` directly —
   that path is unaffected and must keep working. Do not remove
   `toPiCustomTools`' current behaviour; either add an optional parameter
   (preferred — `undefined` falls back to `registered.executor`, preserving
   the existing test) or add a new method.

5. **Skills/ResourceLoader is unrelated.** Findings 1–9 do not touch
   `buildSkillsResourceLoader`. Do not let the fix drift into the skills path.

6. **The "No executor registered for inprocess tool" trap.**
   `MCPHandler.createToolExecutor` (mcp-handler.ts ~327) throws for any
   inprocess tool whose executor wasn't pre-registered via
   `registerToolExecutor(serverName, toolName, fn)`. The current Agent never
   calls `registerToolExecutor`, so today any Pi tool call on a non-pre-registered
   tool will throw inside `registered.executor` and surface as
   `AgentToolResult<{isError:true}>` with message
   `"Error: No executor registered for inprocess tool '<srv>__<tool>'. ..."`.
   This is a runtime symptom of the bug and a useful regression sentinel for
   the new test.

7. **Open question — who owns `registered.executor` for Pi after the fix?**
   Two reasonable designs:
   (a) The caller's `toolExecutor` becomes the *sole* dispatch target (cleanest,
       matches the `Harness` contract literally; `registered.executor` is
       ignored on the Pi path).
   (b) The caller's `toolExecutor` wraps `registered.executor` as a fallback.
   The PRD frames this as "PiHarness ignores the toolExecutor callback", which
   leans toward (a). Confirm with the supervisor before implementing if there
   is any ambiguity.

---

*Investigation only — no source files were modified. See acceptance report below.*

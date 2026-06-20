# Test Mock Pattern — `createAgentSession` fake session emitting scripted events

> Reference for P2.M2.T2.S1's `pi-harness-execute.test.ts`. The contract (item description §3)
> says: *"Mock createAgentSession in tests with a fake session emitting scripted events."*

## 1. Why mock `createAgentSession` (not the real SDK)

The real `createAgentSession` loads extensions, resolves providers, and makes live LLM calls —
untestable in CI. The aggregation logic (turn_end/agent_end capture) is the unit under test, so
we inject a **fake session** whose `subscribe(listener)` captures the listener and whose
`prompt(text)` replays a scripted event list into it. This is the Pi analogue of
ClaudeCodeHarness's execute test (`claude-code-harness-execute.test.ts`) which mocks
`sdk.query` with an `async function*` yielding scripted SDKMessages.

## 2. The fake-session factory (copy-paste ready)

```ts
import { vi } from 'vitest';

type FakeEvent = Record<string, unknown> & { type: string };

/**
 * Builds a fake AgentSession whose subscribe() captures the listener and whose prompt()
 * replays `events` into it in order, then resolves. Mirrors the Pi contract:
 *   subscribe(listener) => unsubscribe
 *   prompt(text)        => Promise<void>
 */
function makeFakeSession(events: FakeEvent[]) {
  let listener: ((e: FakeEvent) => void) | null = null;
  return {
    subscribe: vi.fn((l: (e: FakeEvent) => void) => {
      listener = l;
      return () => { listener = null; };   // unsubscribe
    }),
    prompt: vi.fn(async (_text: string) => {
      for (const e of events) listener?.(e);
    }),
    // Expose for assertions / late injection:
    _emit(e: FakeEvent) { listener?.(e); },
  };
}
```

## 3. Wiring the mock into PiHarness (after `initialize()`)

`createAgentSession` is a top-level export of `@earendil-works/pi-coding-agent`. After a REAL
`await harness.initialize()` (which sets `this.sdk` to the imported module), overwrite the
private `sdk.createAgentSession` with a mock that returns the fake session — exactly the
`provider.sdk = { query: vi.fn()… }` pattern ClaudeCodeHarness's execute test uses:

```ts
const harness = new PiHarness();
await harness.initialize();           // real import → this.sdk is set

const fakeSession = makeFakeSession([...events]);
// @ts-expect-error - private field access for testing
harness.sdk = {
  ...harness.sdk,                     // keep createAgentSession's sibling exports intact
  createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
};

const response = await harness.execute({ prompt: 'hi', options: {} }, async () => ({ content: '', isError: false }));
```

> **vi.mock vs private-field overwrite.** S2 used a file-scope `vi.mock('@earendil-works/…')`
> for `resolveModel` (registry-deterministic). T2 PREFERS the **private-field overwrite**
> approach (no `vi.mock`) because (a) `initialize()` already runs the REAL import + builds the
> real headless registry, and we only want to stub the ONE function `createAgentSession`; (b)
> it keeps the test file free of hoisting surprises. Use `@ts-expect-error` on the private
> field (matches ClaudeCodeHarness's execute test idiom).

## 4. The scripted event payloads (verified shapes — see event-aggregation-contract.md §2)

```ts
const SESSION_START   = { type: 'session_start', reason: 'startup' };
const TURN_END_TEXT   = {
  type: 'turn_end', turnIndex: 0,
  message: {
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello world' }],
    usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: 'stop', api: 'anthropic-messages', provider: 'anthropic', model: 'claude-sonnet-4',
  },
  toolResults: [],
};
const TURN_END_TOOL   = {
  type: 'turn_end', turnIndex: 0,
  message: {
    role: 'assistant',
    content: [
      { type: 'text', text: 'Calling tool' },
      { type: 'toolCall', id: 'tc1', name: 'search', arguments: { q: 'x' } },
    ],
    usage: { input: 20, output: 8, cacheRead: 0, cacheWrite: 0, totalTokens: 28, cost: { input:0, output:0, cacheRead:0, cacheWrite:0, total:0 } },
    stopReason: 'toolUse', api: 'anthropic-messages', provider: 'anthropic', model: 'claude-sonnet-4',
  },
  toolResults: [],
};
const AGENT_END       = { type: 'agent_end', messages: [] };
const SESSION_SHUTDOWN = { type: 'session_shutdown', reason: 'quit' };
```

## 5. Assertion matrix (map directly to test cases)

| Scripted events | Expected `AgentResponse` |
|---|---|
| `[SESSION_START, TURN_END_TEXT, AGENT_END]` | `status:'success'`, `data:'Hello world'`, `usage.input_tokens===10`, `usage.output_tokens===5`, `toolCalls===0`, `metadata.agentId==='pi'`, `metadata.duration>=0` |
| `[SESSION_START, TURN_END_TOOL, AGENT_END]` | `toolCalls===1` (one `toolCall` block) |
| `[TURN_END_TEXT(t1), TURN_END_TEXT(t2)]` (2 turns) | `data` === t2 text (**last turn wins**), `usage` === sum of both turns |
| `[]` + `prompt` rejects | `status:'error'`, `error.code==='EXECUTION_FAILED'`, `error.recoverable===true` |
| `[SESSION_START, …]` + `hooks.onSessionStart` spy | `onSessionStart` called once (session_start) |
| `[…, SESSION_SHUTDOWN]` + `hooks.onSessionEnd` spy | `onSessionEnd` called with a number (duration) |
| no events, empty text | `status:'success'`, `data===''`, `toolCalls===0`, usage zeros |

## 6. Uninitialized + streaming branches (do NOT need the mock)

- **Uninitialized:** `new PiHarness()` (no `initialize()`) → `execute(...)` rejects/throws
  `/not initialized/i` (the IIFE's `if (!this.sdk …)` guard). No mock needed.
- **Streaming:** `execute({ prompt:'x', options:{ streaming:true } }, …)` **throws synchronously**
  citing `P2.M3.T2.S1` BEFORE the IIFE runs (the `if (request.options.streaming)` branch).

## 7. The S1 test that MUST be updated (load-bearing)

`src/__tests__/unit/providers/pi-harness.test.ts` (shipped by P2.M2.T1.S1) contains, in its
`describe('stub methods throw with downstream subtask references')` block:

```ts
it('execute() should throw citing P2.M2.T2.S1', () => {
  const harness = new PiHarness();
  const dummyExecutor = async () => ({ content: '', isError: false });
  expect(() => harness.execute({ prompt: 'test', options: {} }, dummyExecutor)).toThrow(/P2\.M2\.T2\.S1/);
});
```

After T2 implements `execute()`, this assertion is **OBSOLETE** (execute no longer throws that
message — it returns a Promise). **T2 MUST remove this single `it(...)` case** while KEEPING the
`registerMCPs` (cites P2.M4.T1.S2) and `loadSkills` (cites P2.M3.T2.S3) throw assertions in the
same block (those stubs remain). Confirmed via grep: only `pi-harness.test.ts` asserts execute
throws; `pi-harness-initialize.test.ts` and `pi-harness-normalizemodel.test.ts` do not reference
execute.

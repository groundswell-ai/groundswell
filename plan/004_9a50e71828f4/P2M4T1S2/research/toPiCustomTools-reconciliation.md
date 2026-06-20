# Research Note — P2.M4.T1.S2: `MCPHandler.toPiCustomTools()`

Scope: the load-bearing decisions behind the S2 bridge. Verified against the live
codebase (mcp-handler.ts, pi-harness.ts, the Pi SDK `.d.ts`, the existing customTools test,
agent.ts) on 2026-06-20.

## 1. S1 (the converter) is DONE — confirmed signature

`src/harnesses/pi-schema-converter.ts` EXISTS and exports:
```ts
export { Type } from "@sinclair/typebox";
export type { TSchema } from "@sinclair/typebox";
export function jsonSchemaToTypebox(schema: Tool['input_schema'] | Record<string, unknown>): TSchema
```
It is a pure leaf (imports only `@sinclair/typebox` + `type { Tool }`). S2 imports
`jsonSchemaToTypebox` from it via `import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";`
(core → harnesses is an accepted pattern: agent.ts:43 does the same; the converter imports
nothing back into core → no cycle).

## 2. The architectural reconciliation (THE crux)

The contract says: `MCPHandler.toPiCustomTools(): ToolDefinition[]` that, per registered tool,
builds `{name:fullName, label, description, parameters: jsonSchemaToTypebox(tool.input_schema),
execute: async (id,params) => { const r = await registered.executor(params); return toAgentToolResult(r); }}`.
And: "Consumed by PiHarness.execute (P2.M3.T1.S1)."

The PRE-EXISTING `PiHarness.buildCustomTools(toolExecutor)` (P2.M3.T1.S1) does the SAME job but:
(a) takes a harness-level `toolExecutor` param and wires `execute` to call it; (b) uses a
PERMISSIVE placeholder schema (`Type.Object({}, { additionalProperties: true })`, pi-harness.ts L650);
(c) builds the `defineTool(...)` closure INLINE in PiHarness.

S2 SUPERSEDES (b) and (c): the real schema + the canonical bridge move onto `MCPHandler.toPiCustomTools()`,
mirroring `toAgentSDKServer()` (the Claude path, which lives on MCPHandler and uses
`registered.executor(args)` directly — NOT the harness-level toolExecutor).

**Reconciliation decision (verified against ClaudeCodeHarness parity):**
- **ADD** `MCPHandler.toPiCustomTools()` — iterates `this.registeredTools`, builds `defineTool({...})`
  per tool with `parameters: jsonSchemaToTypebox(registered.tool.input_schema)` and `execute` that
  calls `registered.executor(params)` (NOT the harness toolExecutor) and maps via a new private
  `toAgentToolResult(r, isError)` helper. Returns `[]` when `getTools()` is empty.
- **REFACTOR** `PiHarness.buildCustomTools` → `private buildCustomTools(): ToolDefinition[]` (DROP
  the `toolExecutor` param) → body becomes `return this.mcpHandler.toPiCustomTools();`. Delete the
  `PERMISSIVE_PARAMS` placeholder + the inline closure.
- **UPDATE** the two call sites: pi-harness.ts L256 (non-streaming execute) + L376 (streaming) →
  `customTools: this.buildCustomTools(),`.

**Why dropping the harness-level `toolExecutor` from the tool path is CORRECT (parity):**
ClaudeCodeHarness receives `toolExecutor` in `execute()` (Harness interface, PRD §7.3) but executes
MCP tools via its OWN `mcpHandler.toAgentSDKServer()` → `registered.executor` (claude-code-harness.ts
L925 + mcp-handler.ts toAgentSDKServer handler). The passed `toolExecutor` is NOT the MCP execution
path on Claude (comment at claude-code-harness.ts L769: "Tool execution happens via SDK, toolExecutor
is called through hooks"). S2 makes Pi MATCH this: tools execute via `registered.executor`, and the
harness `toolExecutor` param stays in `execute()`'s signature (interface contract) but is no longer
threaded into `buildCustomTools`. The multi-handler dispatch in agent.ts (`this.mcpHandlers[]`) is a
PRE-EXISTING characteristic shared by BOTH harnesses — S2 introduces no regression there.

## 3. `toAgentToolResult(r)` — the mapping (and a critical difference from buildCustomTools)

`registered.executor(params)` returns the RAW executor output (`unknown` — the `ToolExecutor` type is
`(input) => Promise<unknown>`), NOT a `ToolExecutionResult` `{content, isError}`. (The existing
buildCustomTools closure called the harness toolExecutor, which DID return `{content,isError}` —
different.) So `toAgentToolResult` must treat `r` as a raw value and stringify it — EXACTLY like
`toAgentSDKServer`'s inline handler does:
```ts
// toAgentSDKServer handler (mcp-handler.ts) — the parity template:
const result = await registered.executor(args);            // raw unknown
return { content: [{ type:'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
```
Pi's `AgentToolResult<TDetails>` shape (verified from the EXISTING buildCustomTools which returns it
and passes its tests): `{ content: Array<{type:'text', text}>, details: TDetails, terminate?: ... }`.
So:
```ts
private toAgentToolResult(result: unknown, isError: boolean): AgentToolResult<{ isError: boolean }> {
  const text = typeof result === "string" ? result : JSON.stringify(result);
  return { content: [{ type: "text" as const, text }], details: { isError } };
}
```
The `execute` closure wraps `registered.executor(params)` in try/catch (parity with toAgentSDKServer):
success → `toAgentToolResult(result, false)`; catch → `toAgentToolResult(\`Error: ${message}\`, true)`.

## 4. Imports for mcp-handler.ts (eager-load trade-off — DOCUMENTED)

mcp-handler.ts will add:
```ts
import { defineTool } from "@earendil-works/pi-coding-agent";                 // value (runtime)
import type { ToolDefinition, AgentToolResult, ExtensionContext } from "@earendil-works/pi-coding-agent"; // types (erased)
import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";     // S1 converter
```
- **Why static `defineTool` import (not lazy):** `toPiCustomTools()` is SYNC (returns `ToolDefinition[]`,
  mirroring sync `toAgentSDKServer(): McpServerConfig | null`). A sync method cannot `await import`.
  MCPHandler ALREADY statically imports `@anthropic-ai/claude-agent-sdk` (L5-9) for toAgentSDKServer —
  statically importing the Pi SDK for toPiCustomTools is the SAME accepted pattern.
- **Trade-off:** Claude-only users who import MCPHandler now also load the Pi SDK at module-eval.
  This is consistent with the existing eager Claude-SDK load and is a documented P4-optimizable
  consequence (a type-only-import + plain object literal would elide it, but risks TypeBox
  `Static<TSchema>` inference errors; defineTool is the proven-safe choice — pi-harness.ts L2 already
  statically imports it and compiles+tests green).
- `ExtensionContext` is imported only so the `execute` 5th param type-checks (matches existing
  buildCustomTools closure signature).

## 5. Test impact (verified via grep — these are the ONLY call sites)

`buildCustomTools` is referenced at:
- `src/harnesses/pi-harness.ts:256` + `:376` (call sites) + `:668` (def) — REFACTORED in S2.
- `src/__tests__/unit/providers/pi-harness-customtools.test.ts` — L72, L87, L105, L126, L145, L164
  (6 `buildCustomTools(<executor>)` calls) + the execute-integration `it` at the end. REWIRED.
- `src/__tests__/unit/providers/pi-harness-registermcps.test.ts:156` — `buildCustomTools(noopExecutor)`. UPDATED.
- `src/__tests__/unit/providers/pi-harness-streaming.test.ts:401` — comment + verifies customTools is
  passed (no direct call w/ arg). VERIFY it still passes (buildCustomTools() returns []).

**Test strategy (contract: "Mock MCPHandler in tests"):**
- **NEW** `src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts` — standalone `new MCPHandler()`,
  register servers + executors via `registerToolExecutor(serverName, toolName, executor)` (the inprocess
  path `registered.executor` looks up `toolExecutors.get(fullName)`). Covers: shape, empty→[],
  `parameters` is a REAL TypeBox schema (NOT the placeholder — assert `TypeGuard.TObject` + a property),
  execute success (string + object results), execute error (isError:true, no throw), parity with
  `getTools()` (same count + names). NO PiHarness needed → no SDK init.
- **UPDATE** `pi-harness-customtools.test.ts` — `buildCustomTools()` (no arg). Since it's now a 1-line
  delegator, MOCK `harness.mcpHandler.toPiCustomTools` (`vi.spyOn((harness as any).mcpHandler,
  'toPiCustomTools').mockReturnValue([...])`) and assert buildCustomTools() returns it verbatim +
  execute() passes customTools into createAgentSession. This avoids touching the private executor
  registry and tests ONLY the delegation (the real logic is covered by the new MCPHandler unit test).

## 6. `defineTool` runtime behavior (verified)

`defineTool(tool)` is an IDENTITY function at runtime (`(tool) => tool` — the d.ts shows it only
preserves `TParams` inference). So `defineTool({...})` returns the object as-is. Safe to call; no
runtime side effects. createAgentSession accepts the resulting `ToolDefinition[]` (proven by the
existing buildCustomTools + pi-harness-execute.test.ts / streaming test).

## 7. Parity checklist (PRD §7.14.1)

After S2, both harnesses expose a tool-bridge on MCPHandler that iterates `registeredTools`, uses
`registered.executor`, and stringifies the raw result:
- Claude: `toAgentSDKServer()` → `createSdkMcpServer({tools:[sdkTool(...)]})`.
- Pi: `toPiCustomTools()` → `ToolDefinition[]` via `defineTool(...)`.
Both return `null`/`[]` when empty. Both catch executor errors and return isError-flagged content.
Schema fidelity: Claude uses `jsonSchemaToZodRawShape` (Zod); Pi uses `jsonSchemaToTypebox` (TypeBox).
PARITY ACHIEVED. ✓

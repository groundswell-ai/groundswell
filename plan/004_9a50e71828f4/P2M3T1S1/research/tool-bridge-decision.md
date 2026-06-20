# Research Note — P2.M3.T1.S1 Tool Bridge Decisions

## The ordering conflict & its resolution

### The conflict
- **This item (P2.M3.T1.S1)** is titled *"customTools ToolDefinition mapping delegating to toolExecutor"*.
- The item contract (LOGIC) says: *"build customTools from `this.mcpHandler.toPiCustomTools()`"* and
  INPUT lists `MCPHandler.toPiCustomTools(): ToolDefinition[] (from P2.M4.T1.S2)`.
- **BUT** `plan_status` shows `P2.M4.T1.S2 (MCPHandler.toPiCustomTools())` is **Planned — not yet built**,
  and `P2.M4.T1.S1 (JSON-Schema → TypeBox converter)` is likewise **Planned**. The only sibling guaranteed
  done when this item runs is **P2.M2.T2.S1** (per `<parallel_execution_context>`).

➡️ Therefore this item **CANNOT** call `this.mcpHandler.toPiCustomTools()` (it would not compile) and
**CANNOT** reuse a JSON-Schema→TypeBox converter (none exists yet).

### The resolution
Build the **execute→toolExecutor delegation wiring inline on `PiHarness`** as a private method
`buildCustomTools(toolExecutor): ToolDefinition[]`. It consumes the ALREADY-EXISTING
`this.mcpHandler.getTools()` (returns namespaced `Tool[]` with JSON-Schema `input_schema`) and produces
`ToolDefinition[]` whose `execute()` delegates to `toolExecutor`. This is the item's actual deliverable
(round-trip parity) and is **independently testable** (mock MCPHandler + toolExecutor).

**Scope boundary with P2.M4:** `buildCustomTools` owns the *execute delegation* (this item).
`P2.M4.T1.S1` owns the *real JSON-Schema→TypeBox conversion*; `P2.M4.T1.S2` owns
`MCPHandler.toPiCustomTools()`. When P2.M4.T1.S2 lands, the implementer MAY refactor
`buildCustomTools` to call `this.mcpHandler.toPiCustomTools()` for schemas while keeping the
execute→toolExecutor wiring on PiHarness. **This PRP does NOT pre-empt P2.M4's schema work** — it uses
a permissive placeholder schema (see §2).

---

## §2 — TypeBox import + permissive placeholder schema

### Verified: `@sinclair/typebox` IS importable
```
$ node -e "const t=require('@sinclair/typebox'); console.log(typeof t.Type.Object, typeof t.Type.Any)"
function function
```
- It is **hoisted** at top-level `node_modules/@sinclair/typebox` (NOT nested under pi-coding-agent).
- The `ERR_PACKAGE_PATH_NOT_EXPORTED` wall (Decision 2 of P2.M2.T2.S1) applies to
  `@earendil-works/pi-ai` and `@earendil-works/pi-agent-core` (non-hoisted transitive) — **NOT** to
  `@sinclair/typebox`.
- ⚠️ It is an **undeclared** dependency of groundswell (not in `package.json`). `npm run build`/runtime
  resolve it via hoisting; `tsc`/vitest resolve it via Node resolution. **Acceptable for this item**
  because P2.M4.T1.S1 will properly own TypeBox usage + the dep declaration; this item only needs
  `Type.Object`/`Type.Any` for a permissive placeholder. (If a future strict toolchain rejects the
  undeclared import, add `"@sinclair/typebox": "^0.34"` to dependencies — out of scope here.)

### Permissive placeholder schema (PRIMARY)
```ts
import { Type } from '@sinclair/typebox';
// Accepts any object (LLM tool args are always objects); additionalProperties:true permits extras.
const PERMISSIVE_PARAMS = Type.Object({}, { additionalProperties: true });
```
This lets Pi describe the tool and pass args through without rejecting them. **Real schema fidelity
(matching each tool's JSON-Schema `input_schema`) is owned by P2.M4.T1.S1.** This item documents the
placeholder in a code comment + JSDoc.

### Fallback if Pi's validation rejects the above
If integration shows Pi rejecting args against `Type.Object({},{additionalProperties:true})`, switch to
`Type.Any()` (accepts ANY value — guaranteed no rejection, but gives the LLM no param description).
Listed in the PRP's lint/integration triage.

---

## §3 — Pi types/values safe to import from the TOP-LEVEL package

Verified against `node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts`:
- **VALUES re-exported:** `createAgentSession` (P2.M2.T2.S1 already imports), `defineTool`
  (L8 — wraps a ToolDefinition → `ToolDefinition & AnyToolDefinition`; ideal for the customTools array).
- **TYPES re-exported:** `ToolDefinition` (via `core/extensions/index`), `AgentToolResult`,
  `ExtensionContext`, `AgentToolUpdateCallback` (all in the big `export type {…}` at L7).

➡️ Import `import { Type } from '@sinclair/typebox'`, `import { defineTool } from '@earendil-works/pi-coding-agent'`,
and `import type { ToolDefinition, AgentToolResult, ExtensionContext } from '@earendil-works/pi-coding-agent'`.
**Do NOT** import `AgentMessage`/`AssistantMessage`/`TextContent`/`Usage` from `pi-ai` or `pi-agent-core`
(non-hoisted transitive — `ERR_PACKAGE_PATH_NOT_EXPORTED`). Cast `TextContent` structurally:
`{ type: 'text' as const, text: string }`.

---

## §4 — AgentToolResult ↔ ToolExecutionResult mapping (the parity contract)

`AgentToolResult<T>` (pi-agent-core, read via `pi-coding-agent` re-export):
```ts
{ content: (TextContent | ImageContent)[]; details: T; terminate?: boolean }
```
`ToolExecutionResult` (src/types/harnesses.ts):
```ts
{ content: string | unknown; isError: boolean }
```
**Mapping (inside each ToolDefinition.execute):**
```ts
const result = await toolExecutor({ name: toolName, input: params });
const text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
return {
  content: [{ type: 'text' as const, text }],
  details: { isError: result.isError, toolName },
  // terminate: OMIT — never force-stop the loop on a tool result; let the model decide.
};
```
- On `toolExecutor` **rejection** (bug/throw, not an isError:true result): catch, return
  `{ content:[{type:'text',text:'Error: <msg>'}], details:{isError:true, toolName} }`. Mirror
  `MCPHandler.toAgentSDKServer()`'s try/catch (src/core/mcp-handler.ts L222-235).
- `terminate` is deliberately NOT set on errors — error tools should return content to the model so it
  can react (parity with ClaudeCodeHarness, where errors flow back as text content).

---

## §5 — Namespacing (already done by MCPHandler)

`MCPHandler.registerServer` already namespaces: `${server.name}__${tool.name}`
(src/core/mcp-handler.ts L48-56). `getTools()` returns tools with the **already-namespaced** name.
➡️ `buildCustomTools` uses `tool.name` AS-IS for the ToolDefinition `name` field (no re-namespacing).
This matches the contract: *"Tools are namespaced serverName__toolName"* and ClaudeCodeHarness parity.

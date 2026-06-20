# PRP — P2.M3.T1.S1: `customTools` ToolDefinition mapping delegating to `toolExecutor`

**PRD reference:** §7.1 (`pi` harness), §7.3 (`Harness.execute`), §7.10 (Tool Execution —
`ToolExecutionRequest`/`ToolExecutionResult`, *"Groundswell passes its tool list into
`createAgentSession({tools})`; when Pi emits a `tool_call`, the adapter invokes `toolExecutor`"*),
§7.12 (MCP via Groundswell `MCPHandler` — *not* a harness feature), §7.14.1 (MCP tools: register,
discover, execute — identical across harnesses), §7.14 (parity: identical tool-execution semantics).
**Plan:** `plan/004_9a50e71828f4/` — S1 of P2.M3.T1 ("PiHarness tool registration & execution
delegation"). **Consumes** P2.M2.T2.S1 (the real non-streaming `execute()` IIFE that currently passes
`customTools: []` and accepts-but-ignores `toolExecutor`), P2.M2.T1.S2 (initialize/terminate +
private `sdk`/`authStorage`/`modelRegistry`/`options` + `resolveModel`), and P2.M1.T1.S1 (the
`Harness` interface). **Consumes the EXISTING** `MCPHandler` (`src/core/mcp-handler.ts` —
`registerServer`, `getTools`, namespacing). **Defers to (does NOT block on)** P2.M4.T1.S1
(JSON-Schema→TypeBox converter) and P2.M4.T1.S2 (`MCPHandler.toPiCustomTools()`). **Unblocks**
P2.M3.T2 (streaming/hooks reuse the same `createAgentSession({customTools})` seam), P3.M1 (Agent
passes `toolExecutor` → real tool round-trip on the default harness), P4.M2.T1.S1 (parity tests
assert identical tool-execution semantics).
**Scope tag:** REPLACE the throwing `registerMCPs()` stub in `src/harnesses/pi-harness.ts` with a real
implementation that forwards to `this.mcpHandler.registerServer` (mirror `ClaudeCodeHarness` L907-933);
ADD a private `buildCustomTools(toolExecutor)` that maps `this.mcpHandler.getTools()` →
`ToolDefinition[]` with each `execute()` delegating to `toolExecutor`; WIRE `customTools` into the
`execute()` IIFE (replacing P2.M2.T2.S1's `customTools: []`). ADD 2 new test files. MODIFY 1 existing
test file (remove the now-obsolete `registerMCPs`-throws assertion). **No edits** to barrels, registry,
`loadSkills` stub, the streaming generator, the aggregation listener, types, or any other source.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Six load-bearing, non-obvious details:
> (1) **`MCPHandler.toPiCustomTools()` does NOT exist yet** (it's P2.M4.T1.S2, ordered AFTER this item).
> So this item builds the execute→toolExecutor delegation **inline on `PiHarness`** as a private
> `buildCustomTools(toolExecutor): ToolDefinition[]`, consuming the ALREADY-EXISTING
> `this.mcpHandler.getTools()`. See `research/tool-bridge-decision.md` §1. (2) **The JSON-Schema→TypeBox
> converter does NOT exist yet** (P2.M4.T1.S1). So `buildCustomTools` uses a **permissive placeholder
> TypeBox schema** `Type.Object({}, { additionalProperties: true })` from `@sinclair/typebox` (verified
> hoisted + resolvable). Real schema fidelity is P2.M4.T1.S1's job. See Decision 2 + research §2.
> (3) **`@sinclair/typebox` is an UNDECLARED (transitive) dep** — hoisted at top-level
> `node_modules/@sinclair/typebox`, so `import { Type } from '@sinclair/typebox'` resolves for
> tsc+vitest+build. It is NOT one of the forbidden non-hoisted transitives (`pi-ai`/`pi-agent-core` —
> those still trigger `ERR_PACKAGE_PATH_NOT_EXPORTED`). (4) **Pi types/values come ONLY from the
> top-level `@earendil-works/pi-coding-agent`** re-export: `defineTool` (value, L8),
> `ToolDefinition`/`AgentToolResult`/`ExtensionContext` (types, L7). Do NOT import
> `TextContent`/`AssistantMessage`/`Usage` from `pi-ai`/`pi-agent-core` — cast structurally.
> (5) **Namespacing is already done** by `MCPHandler.registerServer` (`serverName__toolName`,
> src/core/mcp-handler.ts L48-56); `buildCustomTools` uses `tool.name` AS-IS. (6) **The current
> `pi-harness.test.ts` `registerMCPs() should throw citing P2.M4.T1.S2` assertion (L64-66) is
> OBSOLETE** once `registerMCPs` is implemented — remove that ONE `it(...)`; KEEP the `loadSkills`
> throw assertion (L69-71, cites P2.M3.T2.S3 — still a stub).

---

## Goal

**Feature Goal:** Give `PiHarness` a working **tool round-trip**: (a) `registerMCPs(servers)` forwards
to `this.mcpHandler.registerServer` and returns the namespaced tool list (parity with
`ClaudeCodeHarness.registerMCPs`); (b) `execute()` builds `customTools` from the registered tools,
wiring each `ToolDefinition.execute()` to invoke the caller-supplied `toolExecutor` and map its
`ToolExecutionResult` → Pi's `AgentToolResult`; (c) those `customTools` are passed into
`createAgentSession({…, customTools})`. After S1, when Pi emits a `tool_call` for a Groundswell tool,
the adapter runs it locally through `toolExecutor` and feeds the result back to the model — the
tool-execution parity bar of PRD §7.14 / §7.14.1 — with **no Pi MCP plugin required**.

**Deliverable:**
1. **MODIFY `src/harnesses/pi-harness.ts`**:
   - ADD `private mcpHandler: MCPHandler = new MCPHandler();` (mirror `ClaudeCodeHarness` L177) + import.
   - REPLACE the throwing `registerMCPs()` stub with: init guard → `for (s of servers) this.mcpHandler.registerServer(s)` → `return this.mcpHandler.getTools();` (NO `mcpServerConfig`/`toAgentSDKServer()` — that's Claude-specific).
   - ADD `private buildCustomTools(toolExecutor): ToolDefinition[]` — maps `this.mcpHandler.getTools()` → `ToolDefinition[]` via `defineTool(...)`, each `execute()` calls `toolExecutor({name, input})`, maps result→`AgentToolResult`, try/catch on rejection.
   - In the `execute()` IIFE (P2.M2.T2.S1's body), replace `customTools: []` with `customTools: this.buildCustomTools(toolExecutor)`.
   - LEAVE the streaming branch throw, the aggregation listener, `onSessionStart`/`onSessionEnd` hooks, `loadSkills` stub, and `resolveModel`/`initialize`/`terminate` **UNCHANGED**.
2. **MODIFY `src/__tests__/unit/providers/pi-harness.test.ts`** — REMOVE the single
   `it('registerMCPs() should throw citing P2.M4.T1.S2', …)` block (L64-66); KEEP the `loadSkills`
   throw assertion.
3. **NEW `src/__tests__/unit/providers/pi-harness-registermcps.test.ts`** — `registerMCPs()`
   forwarding suite (mirror `claude-code-harness-registermcps.test.ts`): init guard, single/multi
   server registration, namespaced `serverName__toolName` tool discovery, idempotent calls, empty
   array, return shape (`Tool[]` with `input_schema`).
4. **NEW `src/__tests__/unit/providers/pi-harness-customtools.test.ts`** — the delegation bridge
   suite: (a) `buildCustomTools` produces one `ToolDefinition` per registered tool with correct
   `name`/`description`/`parameters`; (b) calling a tool's `execute(...)` invokes `toolExecutor` with
   `{name: 'server__tool', input: <params>}` exactly once; (c) success result → `AgentToolResult`
   with `content:[{type:'text',text}]` + `details.isError===false`; (d) `isError:true` result → still
   returns text content + `details.isError===true` (no throw, no `terminate`); (e) `toolExecutor`
   rejection → caught, returns error text + `details.isError===true`; (f) empty registry → `[]`;
   (g) `execute()` passes the built `customTools` (non-empty) into `createAgentSession` (monkey-patch
   `sdk.createAgentSession` to capture opts, reuse P2.M2.T2.S1's fake-session idiom).

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) exits 0 — `pi-harness.ts` compiles; the `defineTool`/`ToolDefinition`
   wiring is sound; `@sinclair/typebox` `Type.Object` resolves; no forbidden transitive import
   (`pi-ai`/`pi-agent-core`); no import cycle.
2. `npm test` exits 0 — new registerMCPs + customTools suites + the (edited) S1 structure suite +
   P2.M2.T2.S1's execute suite + full regression all green.
3. `npm run build` exits 0 — `dist/harnesses/pi-harness.{js,d.ts}` emitted with real registerMCPs +
   buildCustomTools + wired customTools.
4. Runtime spot-check (tsx): an initialized `PiHarness` with a registered inprocess tool, whose
   `createAgentSession` is monkey-patched to a fake session that (during `prompt()`) invokes the
   registered tool's `execute()`, returns an `AgentResponse` with `status:'success'` AND the
   `toolExecutor` mock was called with `{name:'srv__echo', input:{…}}`.
5. Contract (grep): `mcpHandler`, `registerServer(`, `getTools()`, `buildCustomTools(`, `defineTool(`,
   `customTools: this.buildCustomTools(toolExecutor)`, `toolExecutor({ name:`, `@sinclair/typebox`;
   NO `@earendil-works/pi-ai` / `@earendil-works/pi-agent-core` import; `loadSkills` still throws
   citing P2.M3.T2.S3.

---

## ⚠️ SCOPE DECISIONS — six load-bearing details

### Decision 1 — `toPiCustomTools()` does NOT exist yet; build the delegation INLINE on PiHarness

The item contract LOGIC says *"build customTools from `this.mcpHandler.toPiCustomTools()`"* and INPUT
lists it as *(from P2.M4.T1.S2)*. But `plan_status` shows **P2.M4.T1.S2 is Planned — not built**, and
the parallel context guarantees only **P2.M2.T2.S1** is done when this item runs. Calling
`this.mcpHandler.toPiCustomTools()` would **not compile**.
➡️ This item builds a **private `buildCustomTools(toolExecutor): ToolDefinition[]`** on `PiHarness`
that consumes the **already-existing** `this.mcpHandler.getTools()` (returns namespaced `Tool[]` with
JSON-Schema `input_schema`) and produces `ToolDefinition[]` whose `execute()` delegates to
`toolExecutor`. This IS the item's deliverable (round-trip parity) and is independently testable.
**Scope boundary:** `buildCustomTools` owns the *execute delegation*; P2.M4.T1.S1 owns the *real
JSON-Schema→TypeBox conversion*; P2.M4.T1.S2 owns `MCPHandler.toPiCustomTools()`. When P2.M4.T1.S2
lands, it MAY refactor `buildCustomTools` to source schemas from `toPiCustomTools()` — this PRP does
NOT pre-empt that. See `research/tool-bridge-decision.md` §1.

### Decision 2 — Permissive placeholder TypeBox schema (real converter is P2.M4.T1.S1)

Pi's `ToolDefinition.parameters` is a **TypeBox** `TSchema` (external_deps §1.4 + §1.8-gotcha-2). The
real JSON-Schema→TypeBox converter is **P2.M4.T1.S1 (not built)**. So `buildCustomTools` cannot yet
faithfully convert each tool's `input_schema`.
➡️ Use a permissive placeholder: `const PERMISSIVE_PARAMS = Type.Object({}, { additionalProperties: true });`
from `@sinclair/typebox` (verified resolvable — Decision 3). This accepts any object (LLM tool args are
always objects) so Pi describes the tool and passes args through **without rejecting them**. Document
the placeholder in a code comment + JSDoc citing P2.M4.T1.S1 as the owner of real fidelity.
**Fallback** (if integration shows Pi rejecting args against the above): switch to `Type.Any()`
(accepts ANY value). See `research/tool-bridge-decision.md` §2.

### Decision 3 — `@sinclair/typebox` is an UNDECLARED-but-resolvable transitive dep

```
$ node -e "const t=require('@sinclair/typebox'); console.log(typeof t.Type.Object, typeof t.Type.Any)"
function function
```
- It is **hoisted** at top-level `node_modules/@sinclair/typebox` (NOT nested under pi-coding-agent).
- The `ERR_PACKAGE_PATH_NOT_EXPORTED` wall (P2.M2.T2.S1 Decision 2) applies to `pi-ai`/`pi-agent-core`
  (non-hoisted) — **NOT** to `@sinclair/typebox`. `import { Type } from '@sinclair/typebox'` resolves
  for `tsc`/vitest/`npm run build`.
- ⚠️ It is **not** in `package.json` dependencies. Acceptable here because P2.M4.T1.S1 will own TypeBox
  usage + the dep declaration; this item only needs `Type.Object`/`Type.Any`. (If a strict toolchain
  later rejects the undeclared import, add `"@sinclair/typebox": "^0.34"` — out of scope here.)

### Decision 4 — Pi types/values come ONLY from the top-level `@earendil-works/pi-coding-agent`

Verified against `dist/index.d.ts`:
- **VALUES:** `defineTool` (L8 — wraps `ToolDefinition<TParams>` → `ToolDefinition & AnyToolDefinition`;
  ideal because `customTools?: ToolDefinition[]` accepts the widened form). `createAgentSession` is
  already imported by P2.M2.T2.S1.
- **TYPES:** `ToolDefinition`, `AgentToolResult`, `ExtensionContext`, `AgentToolUpdateCallback`
  (all in the big `export type {…}` re-export at L7).
➡️ Import `import { defineTool } from '@earendil-works/pi-coding-agent'` and
`import type { ToolDefinition, AgentToolResult, ExtensionContext } from '@earendil-works/pi-coding-agent'`.
**Do NOT** import `TextContent`/`AssistantMessage`/`Usage` from `pi-ai`/`pi-agent-core` — they are
non-hoisted transitive (`ERR_PACKAGE_PATH_NOT_EXPORTED`). Cast `TextContent` structurally:
`{ type: 'text' as const, text: string }`. See `research/tool-bridge-decision.md` §3.

### Decision 5 — Namespacing is already done by `MCPHandler`; do NOT re-namespace

`MCPHandler.registerServer` already stores each tool under `${server.name}__${tool.name}`
(src/core/mcp-handler.ts L48-56) and `getTools()` returns tools with the **already-namespaced** `name`.
➡️ `buildCustomTools` uses `tool.name` AS-IS for the `ToolDefinition.name` field (no concatenation).
This matches the contract (*"Tools are namespaced serverName__toolName"*) and ClaudeCodeHarness parity.
The `toolExecutor` receives `{ name: tool.name }` where `tool.name` is already `serverName__toolName`.

### Decision 6 — Remove the obsolete `registerMCPs`-throws assertion; KEEP `loadSkills`-throws

`src/__tests__/unit/providers/pi-harness.test.ts` L63-72 has a
`describe('stub methods throw with downstream subtask references')` with two `it(...)` cases:
`registerMCPs() should throw citing P2.M4.T1.S2` (L64-66) and `loadSkills() should throw citing P2.M3.T2.S3`
(L69-71). Once S1 implements `registerMCPs`, the first assertion FAILS.
➡️ S1 **removes the `registerMCPs` `it(...)` block** (L64-66). The `loadSkills` assertion STAYS
(`loadSkills` is still a stub — P2.M3.T2.S3). Confirmed by grep: only `pi-harness.test.ts` references
these throw assertions. (The `execute`-throws case was already handled by P2.M2.T2.S1 / never present in
the current file — do NOT touch execute assertions.)

---

## User Persona

**Target User:** Groundswell core maintainers + downstream PRP agents:
- **P2.M3.T2.S1/S2 (streaming + hooks)** — reuse the `createAgentSession({customTools})` seam; the
  `onToolStart`/`onToolEnd` hooks will fire around the `execute()` calls this item wires.
- **P2.M4.T1.S1/S2 (MCPHandler bridge)** — may refactor `buildCustomTools` to source TypeBox schemas
  from `MCPHandler.toPiCustomTools()`; the execute→toolExecutor wiring stays on PiHarness.
- **P3.M1 (Agent)** — calls `registry.get('pi').execute(req, toolExecutor, hooks)` and the user's
  `toolExecutor` now actually runs Groundswell tools (parity with the `claude-code` path).
- **P4.M2.T1.S1 (parity tests)** — asserts identical `ToolExecutionRequest`/`ToolExecutionResult`
  semantics across both harnesses.

**Use Case:** PRD §7.1 — `pi` is the **default**, vendor-neutral harness. Pi has **no built-in MCP**
(§7.4 `pi` column: *"via Groundswell `MCPHandler`"*). S1 makes Groundswell's MCPHandler tools actually
*executable* through Pi — the mechanism that delivers MCP/LSP parity "without a Pi plugin" (§7.12).

**Pain Points Addressed:** Until S1, `PiHarness.registerMCPs()` throws on every call and
`customTools: []` means Pi can call NONE of Groundswell's tools — the default harness is tool-blind.
S1 removes that blocker: tools register, Pi discovers them, and execution round-trips through
`toolExecutor`.

---

## Why

- **Realizes PRD §7.10 + §7.14.1** — *"Groundswell passes its tool list into `createAgentSession({tools})`;
  when Pi emits a tool_call, the adapter invokes toolExecutor and returns the ToolExecutionResult."*
  S1 is the literal implementation of that sentence for the `pi` harness.
- **Delivers tool-execution parity** (§7.14 adapter NFRs: *"Identical tool-execution semantics
  (`ToolExecutionRequest` / `ToolExecutionResult`)"*) — same request/result shapes as ClaudeCodeHarness,
  different in-process mechanism (customTools vs `createSdkMcpServer`).
- **Unblocks P3.M1** — `Agent.executePrompt` passes its `toolExecutor`; without S1 that callback is
  never invoked on the default harness.
- **Keeps Pi plugin-free** (§7.4/§7.12) — tools execute locally via `MCPHandler`, registered with Pi
  as ordinary `customTools`. No `pi.registerProvider`/MCP plugin bundled.

---

## What

1. **MODIFY** `src/harnesses/pi-harness.ts` — real `registerMCPs()` + `buildCustomTools()` + wired `customTools`.
2. **MODIFY** `src/__tests__/unit/providers/pi-harness.test.ts` — remove the obsolete registerMCPs-throws `it(...)`.
3. **CREATE** `src/__tests__/unit/providers/pi-harness-registermcps.test.ts` — registerMCPs forwarding suite.
4. **CREATE** `src/__tests__/unit/providers/pi-harness-customtools.test.ts` — delegation bridge suite.
5. **VALIDATE** (lint / targeted tests / full suite / build / grep + runtime spot-check).

### Success Criteria

- [ ] `registerMCPs(servers)` on an **initialized** harness calls `this.mcpHandler.registerServer(server)`
      for each server and returns `this.mcpHandler.getTools()` (`Tool[]`, each `name` =
      `serverName__toolName`, each with `input_schema`).
- [ ] `registerMCPs()` on an **uninitialized** harness rejects `/not initialized/i`.
- [ ] `buildCustomTools(toolExecutor)` returns exactly one `ToolDefinition` per registered tool, with
      `name`/`label`/`description` from the `Tool`, and a permissive TypeBox `parameters`.
- [ ] Calling a built tool's `execute(toolCallId, params, signal, onUpdate, ctx)` invokes `toolExecutor`
      **exactly once** with `{ name: 'server__tool', input: params }` and returns an `AgentToolResult`
      whose `content[0]` is `{type:'text', text:<stringified result.content>}` and
      `details.isError === <result.isError>`.
- [ ] If `toolExecutor` returns `{isError:true}`, `execute()` STILL returns (does not throw, does not
      set `terminate`).
- [ ] If `toolExecutor` **rejects**, `execute()` catches and returns `{content:[{type:'text',text:'Error: …'}], details:{isError:true,…}}`.
- [ ] `execute()` passes `customTools: this.buildCustomTools(toolExecutor)` (non-empty when tools are
      registered) into `createAgentSession({…})`.
- [ ] `loadSkills` **still throws** citing P2.M3.T2.S3 (unchanged).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0; P2.M2.T2.S1's execute suite + S1/S2
      suites + full regression pass.
- [ ] No import of `@earendil-works/pi-ai` or `@earendil-works/pi-agent-core` (grep clean).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S1 using only
(a) this PRP, (b) read-only access to `src/harnesses/pi-harness.ts` (the S1+S2+P2.M2.T2.S1 file — has
the `execute()` IIFE with `customTools: []` + the throwing `registerMCPs` stub), `src/harnesses/claude-code-harness.ts`
(registerMCPs forwarding pattern L907-933 + `private mcpHandler` L177), `src/core/mcp-handler.ts`
(`registerServer`/`getTools`/namespacing L48-56 + the `toAgentSDKServer` try/catch + executor pattern
L222-235), `src/types/harnesses.ts` (`ToolExecutionRequest`/`ToolExecutionResult` L127/L145 +
`MCPServer`), `src/types/sdk-primitives.ts` (`Tool`/`Tool.input_schema`), and (c) the copy-paste-ready
snippets below + `research/tool-bridge-decision.md`. The six non-obvious load-bearing details
(no-toPiCustomTools-yet, placeholder-schema, typebox-hoisted, top-level-Pi-types-only,
namespacing-already-done, registerMCPs-test-removal) are proven in the research note.

### Documentation & References

```yaml
# MUST READ — the authoritative contract (PRD §7 harness system).
- url: PRD.md §7.3, §7.10, §7.12, §7.14, §7.14.1   (repo root; identical in plan/004_9a50e71828f4/prd_snapshot.md §7)
  why: §7.10 = the EXACT sentence this item implements ("Groundswell passes its tool list into
       createAgentSession({tools}); when Pi emits a tool_call, the adapter invokes toolExecutor and
       returns the ToolExecutionResult"); §7.12 = MCP via MCPHandler (not a harness feature — no plugin);
       §7.14/§7.14.1 = identical tool-execution semantics across harnesses (the parity bar).
  critical: §7.10 is WHY customTools' execute() must delegate to toolExecutor (not Pi's own execution).

# MUST READ — the verified Pi SDK surface + the ToolDefinition contract.
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.4 = ToolDefinition interface (name/label/description/parameters:TypeBox/execute signature
       returning AgentToolResult) + defineTool(); §1.4 "Execution model" = "Pi calls tool.execute(...)
       in-process and feeds the result back to the model automatically"; §1.8-gotcha-2 = TypeBox schema
       requirement; §4 = the adapter-design table ("Tool registration: customTools: ToolDefinition[]";
       "Required new bridge on MCPHandler: toPiCustomTools()").
  critical: §1.4 confirms execute() is in-process + must return AgentToolResult; §4 confirms toPiCustomTools
            is the (P2.M4) bridge — S1 builds the inline equivalent (Decision 1).

# MUST READ — the six load-bearing decisions (ordering/typebox/types/namespacing/test-removal).
- file: plan/004_9a50e71828f4/P2M3T1S1/research/tool-bridge-decision.md
  why: §1 = why toPiCustomTools can't be called (ordering) + the inline-buildCustomTools resolution;
       §2 = TypeBox resolution proof + permissive placeholder schema + Type.Any() fallback; §3 = which
       Pi types/values are safe to import from the top-level package; §4 = AgentToolResult↔ToolExecutionResult
       mapping (the parity contract); §5 = namespacing is already done by MCPHandler.
  critical: §1 (Decision 1) + §4 (the mapping) are the two most load-bearing facts.

# MUST READ — the file S1 modifies (the P2.M2.T2.S1 execute IIFE + S1/S2 lifecycle).
- file: src/harnesses/pi-harness.ts
  why: Ships (S1+S2+P2.M2.T2.S1): id/capabilities/normalizeModel/supports/requiresFeatures; the 4 private
       fields (sdk/authStorage/modelRegistry/options); real initialize/terminate; resolveModel(spec); the
       REAL non-streaming execute() IIFE (per P2.M2.T2.S1 contract — currently passes customTools: []);
       the THROWING registerMCPs/loadSkills stubs. S1 REPLACES registerMCPs, ADDS buildCustomTools +
       private mcpHandler, and swaps customTools:[] → customTools:this.buildCustomTools(toolExecutor).
  gotcha: P2.M2.T2.S1's execute accepts toolExecutor but (per its Decision 4) does not use it — S1 is
          what finally consumes it. If P2.M2.T2.S1 named it `_toolExecutor`, rename to `toolExecutor`.

# MUST READ — the registerMCPs pattern to mirror + the mcpHandler field.
- file: src/harnesses/claude-code-harness.ts
  why: L177 = `private mcpHandler: MCPHandler = new MCPHandler();` (copy verbatim — S1 needs the same field);
       L907-933 = registerMCPs(): init guard → `for (s of servers) this.mcpHandler.registerServer(s)` →
       `return this.mcpHandler.getTools();`. The ONLY Pi difference: DROP the `toAgentSDKServer()`/
       `mcpServerConfig` block (L924-930) — Pi uses customTools at execute time, not an SDK MCP server.
  pattern: copy the field declaration + the registerMCPs control flow; omit the Claude-only SDK config.

# MUST READ — MCPHandler (the tool registry S1 consumes) + the executor try/catch pattern.
- file: src/core/mcp-handler.ts
  why: registerServer(server) (L42-60 — namespaces server.name__tool.name into registeredTools);
       getTools() (L82-86 — returns Tool[] with namespaced name + input_schema); the toAgentSDKServer()
       handler (L210-240 — the try/catch + result→content mapping S1 mirrors for AgentToolResult);
       createToolExecutor (L282-308 — inprocess executor lookup). S1 calls registerServer + getTools only.
  pattern: buildCustomTools mirrors toAgentSDKServer's per-tool mapping loop + try/catch, but emits
           ToolDefinition (Pi) instead of sdkTool (Claude), and delegates to the injected toolExecutor
           (not registered.executor).

# MUST READ — ToolExecutionRequest/Result + MCPServer + the Tool shape.
- file: src/types/harnesses.ts
  why: ToolExecutionRequest { name; input } (L127); ToolExecutionResult { content: string|unknown;
       isError: boolean } (L145); MCPServer (imported from sdk-primitives). These are the two shapes
       buildCustomTools bridges between.
- file: src/types/sdk-primitives.ts
  why: Tool { name; description; input_schema: { type:'object'; properties; required? } } (L10-22) —
       the source shape getTools() returns; buildCustomTools reads .name/.description/.input_schema.

# MUST READ — the Pi ToolDefinition/AgentToolResult shapes (verified from installed .d.ts).
- url: node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts L335-367
  why: ToolDefinition<TParams,TDetails,TState> { name; label; description; promptSnippet?; promptGuidelines?;
       parameters: TParams; executionMode?; execute(toolCallId, params, signal, onUpdate, ctx):
       Promise<AgentToolResult<TDetails>>; renderCall?/renderResult? (UI-only — omit) }. defineTool(L375).
- url: node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-agent-core/dist/types.d.ts L304-322
  why: AgentToolResult<T> { content: (TextContent|ImageContent)[]; details: T; terminate? } (L305-315);
       AgentToolUpdateCallback<T> (L322). NOTE: do NOT import from here (transitive) — read the shape,
       import the TYPE from the top-level pi-coding-agent re-export, cast TextContent structurally.

# SHOULD READ — the registerMCPs test to mirror (real MCPHandler, inprocess servers).
- file: src/__tests__/unit/providers/claude-code-harness-registermcps.test.ts
  why: The idiom for testing registerMCPs WITHOUT mocking MCPHandler: createTestTool(name,desc) +
       createTestServer(name, tools) fixtures; real initialize(); assert namespaced tool discovery,
       init-guard throw, multi-server, idempotency, empty-array. S1's pi-harness-registermcps.test.ts
       is a near-direct copy (swap ClaudeCodeHarness→PiHarness, drop the sdkConfig assertions).
  pattern: copy the fixtures + describe/it layout + the HarnessRegistry reset (getInstance()._resetInitStateForTesting()
           + _resetForTesting() — see pi-harness-initialize.test.ts L25-27).

# SHOULD READ — the fake-session test idiom (for the execute-passes-customTools assertion).
- file: plan/004_9a50e71828f4/P2M2T2S1/PRP.md   (Task 3 + research/test-mock-pattern.md)
  why: P2.M2.T2.S1's `pi-harness-execute.test.ts` monkey-patches `harness['sdk'].createAgentSession`
       to return a fake session emitting scripted events. S1's customtools test REUSES this idiom and
       ADDS an assertion that `createAgentSession.mock.calls[0][0].customTools` is a non-empty array
       whose elements are ToolDefinitions with callable `execute`.
```

### Current Codebase tree (relevant slice)

```bash
src/harnesses/
├── claude-code-harness.ts   # REFERENCE (private mcpHandler L177; registerMCPs L907-933)
├── harness-registry.ts      # CONSUMER (HarnessRegistry + _resetForTesting/_resetInitStateForTesting — test reset)
├── index.ts                 # UNTOUCHED (barrel)
├── pi-harness.ts            # ← MODIFY (registerMCPs + buildCustomTools + private mcpHandler + customTools wiring)
└── session-store.ts         # untouched
src/core/
└── mcp-handler.ts           # CONSUMER (registerServer + getTools + namespacing; toAgentSDKServer try/catch pattern)
src/types/
├── agent.ts                 # CONSUMER (AGENT_ERROR_CODES — already imported; no new agent.ts imports needed)
├── harnesses.ts             # CONSUMER (ToolExecutionRequest L127, ToolExecutionResult L145, MCPServer via sdk-primitives)
├── sdk-primitives.ts        # CONSUMER (Tool { name, description, input_schema })
└── streaming.ts             # untouched (StreamEvent — referenced by execute return union only)
src/__tests__/unit/providers/
├── claude-code-harness-registermcps.test.ts   # REFERENCE (registerMCPs test idiom)
├── pi-harness.test.ts                          # ← MODIFY (remove registerMCPs-throws it(...) L64-66)
├── pi-harness-initialize.test.ts               # (S2) — must still pass
├── pi-harness-normalizemodel.test.ts           # (S1/S2) — must still pass
├── pi-harness-execute.test.ts                  # (P2.M2.T2.S1) — must still pass
├── pi-harness-registermcps.test.ts             # ← NEW
└── pi-harness-customtools.test.ts              # ← NEW
node_modules/@sinclair/typebox/                 # HOISTED transitive — Type.Object/Type.Any resolvable (Decision 3)
node_modules/@earendil-works/pi-coding-agent/   # INSTALLED — re-exports defineTool (value) + ToolDefinition/AgentToolResult/ExtensionContext (types)
  └── node_modules/@earendil-works/{pi-agent-core,pi-ai}/  # NON-HOISTED transitive — DO NOT IMPORT (Decision 4)
```

### Desired Codebase tree with files to be added/changed

```bash
src/harnesses/pi-harness.ts                              # MODIFY (real registerMCPs + buildCustomTools + mcpHandler + customTools wiring)
src/__tests__/unit/providers/pi-harness.test.ts          # MODIFY (remove obsolete registerMCPs-throws it(...))
src/__tests__/unit/providers/pi-harness-registermcps.test.ts  # NEW
src/__tests__/unit/providers/pi-harness-customtools.test.ts   # NEW
# (barrels, registry, loadSkills stub, streaming generator, aggregation listener, types, other harnesses — UNTOUCHED.)
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — `MCPHandler.toPiCustomTools()` does NOT exist yet (P2.M4.T1.S2, ordered AFTER this item).
//   Do NOT call it — it won't compile. Build the delegation INLINE as PiHarness.buildCustomTools(toolExecutor)
//   consuming the EXISTING this.mcpHandler.getTools(). (Decision 1; research/tool-bridge-decision.md §1.)

// CRITICAL #2 — The JSON-Schema→TypeBox converter does NOT exist yet (P2.M4.T1.S1). Use a permissive
//   placeholder TypeBox schema: `Type.Object({}, { additionalProperties: true })` from '@sinclair/typebox'.
//   Real schema fidelity (matching each tool's input_schema) is P2.M4.T1.S1's job — document the placeholder.
//   Fallback if Pi rejects args: `Type.Any()`. (Decision 2; research §2.)

// CRITICAL #3 — '@sinclair/typebox' is an UNDECLARED-but-HOISTED transitive dep. `import { Type } from
//   '@sinclair/typebox'` resolves for tsc/vitest/build (verified). It is NOT one of the forbidden non-hoisted
//   transitives (pi-ai/pi-agent-core — those still ERR_PACKAGE_PATH_NOT_EXPORTED). (Decision 3.)

// CRITICAL #4 — Pi types/values come ONLY from the top-level '@earendil-works/pi-coding-agent':
//   `defineTool` (value), `ToolDefinition`/`AgentToolResult`/`ExtensionContext` (types). Do NOT import
//   TextContent/AssistantMessage/Usage from pi-ai/pi-agent-core — cast structurally:
//   `{ type: 'text' as const, text: string }`. (Decision 4; research §3.)

// CRITICAL #5 — Namespacing is ALREADY done by MCPHandler.registerServer (serverName__toolName).
//   buildCustomTools uses tool.name AS-IS — do NOT re-concatenate. (Decision 5; research §5.)

// CRITICAL #6 — REMOVE the `it('registerMCPs() should throw citing P2.M4.T1.S2')` from
//   src/__tests__/unit/providers/pi-harness.test.ts (L64-66). KEEP the loadSkills throw assertion (L69-71).
//   (Decision 6.)

// GOTCHA #7 — isolatedModules: true (tsconfig.json). `import type { ToolDefinition, AgentToolResult,
//   ExtensionContext } from '@earendil-works/pi-coding-agent'` (types only). `defineTool` and `Type` are
//   VALUE imports. MCPHandler is a VALUE import from '../core/mcp-handler.js'. MCPServer/Tool are
//   `import type` from '../types/sdk-primitives.js' (or harnesses.js).

// GOTCHA #8 — AgentToolResult.content is `(TextContent|ImageContent)[]` — an ARRAY, not a string.
//   ToolExecutionResult.content is `string|unknown`. Map: `[{ type:'text' as const, text: typeof
//   result.content==='string' ? result.content : JSON.stringify(result.content) }]`. (research §4.)

// GOTCHA #9 — Do NOT set `terminate: true` on error tool results. Error tools must return content to the
//   model so it can react (parity with ClaudeCodeHarness, where errors flow back as text). Omit `terminate`
//   entirely (it's optional). (research §4.)

// GOTCHA #10 — registerMCPs does NOT store an SDK config (unlike ClaudeCodeHarness L924-930). Pi builds
//   customTools FRESH at execute() time via buildCustomTools — no cached mcpServerConfig field. DROP the
//   toAgentSDKServer()/mcpServerConfig block entirely.

// GOTCHA #11 — buildCustomTools must be tolerant of an EMPTY registry: if getTools() returns [], return [].
//   Then createAgentSession gets customTools:[] (same as P2.M2.T2.S1's no-op) — backward compatible.

// GOTCHA #12 — The toolExecutor signature is `(req: ToolExecutionRequest) => Promise<ToolExecutionResult>`.
//   Inside execute()'s ToolDefinition.execute, call `toolExecutor({ name: tool.name, input: params })`.
//   `params` is `Static<TParams>` (widened to the permissive schema → effectively Record<string,unknown>/
//   unknown). Pass it through unchanged as `input`.

// GOTCHA #13 — buildCustomTools is PRIVATE. Tests access it via `(harness as any).buildCustomTools(toolExecutor)`
//   (mirror how claude-code tests reach private fields via @ts-expect-error / cast). Do NOT make it public
//   just for tests.

// GOTCHA #14 — defineTool wraps ToolDefinition<TParams> → ToolDefinition & AnyToolDefinition. Build each
//   tool object then wrap with defineTool(...) so it satisfies `customTools: ToolDefinition[]`. (Verified
//   re-exported as a value, pi-coding-agent index.d.ts L8.)

// GOTCHA #15 — npm run lint EXCLUDES src/__tests__ (tsconfig.json "exclude"). It type-checks
//   src/harnesses/pi-harness.ts (proving the TypeBox + defineTool + ToolDefinition wiring compiles + no
//   forbidden transitive import + no cycle). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH.

// GOTCHA #16 — If P2.M2.T2.S1 (parallel) named the execute param `_toolExecutor` (unused-prefix), S1
//   RENAMES it to `toolExecutor` (now used). Verify by grep before editing; the Harness interface declares
//   it as `toolExecutor` so the rename is signature-safe.
```

---

## Implementation Blueprint

### Data models and structure

No new exported types. S1 adds: one private field (`mcpHandler`), one private method
(`buildCustomTools`), and replaces the `registerMCPs` stub body. The new import surface:

```ts
// === src/harnesses/pi-harness.ts — the additions/changes vs P2.M2.T2.S1 ===
import { Type } from "@sinclair/typebox";                 // VALUE — permissive placeholder schema (Decision 3)
import {
  defineTool,                                             // VALUE — wraps ToolDefinition → AnyToolDefinition (pi-coding-agent index.d.ts L8)
} from "@earendil-works/pi-coding-agent";
import type {
  ToolDefinition,                                         // TYPE — re-exported (index.d.ts L7)
  AgentToolResult,                                        // TYPE — re-exported (index.d.ts L7)
  ExtensionContext,                                       // TYPE — re-exported (index.d.ts L7) — for the execute ctx param
} from "@earendil-works/pi-coding-agent";
import { MCPHandler } from "../core/mcp-handler.js";      // VALUE — the existing tool registry
import type { MCPServer, Tool } from "../types/sdk-primitives.js";  // TYPE — registerMCPs/getTools shapes
// (ToolExecutionRequest, ToolExecutionResult already `import type`-ed by S1's skeleton via ../types/harnesses.js.)
```

> **No `TextContent`/`AssistantMessage`/`Usage` import.** The execute() body casts TextContent
> structurally (CRITICAL #4). `createSuccessResponse`/`createErrorResponse`/`AGENT_ERROR_CODES` are
> already imported by S2/P2.M2.T2.S1 — S1 adds NO agent.ts imports.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; no edits)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -n "customTools: \[\]\|registerMCPs\|mcpHandler\|toolExecutor" src/harnesses/pi-harness.ts`
        → confirm P2.M2.T2.S1's execute IIFE passes `customTools: []` and registerMCPs still throws.
        (If customTools:[] is absent, P2.M2.T2.S1 hasn't landed — STOP; S1 consumes its execute IIFE.)
  - RUN: `node -e "console.log(typeof require('@sinclair/typebox').Type.Object)"` → 'function' (Decision 3 confirmed).
  - RUN: `grep -n "defineTool\|export.*ToolDefinition\b\|AgentToolResult\b" node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts` → hits (re-exports confirmed).
  - RUN: `grep -n "registerServer\|getTools\|server.name__\|tool.name" src/core/mcp-handler.ts` → hits (namespacing confirmed, Decision 5).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN. If red from a parallel task, surface it.
  - RUN: `grep -n "registerMCPs() should throw citing P2.M4.T1.S2" src/__tests__/unit/providers/pi-harness.test.ts` → 1 hit (the obsolete assertion to remove).

Task 1: MODIFY src/harnesses/pi-harness.ts (add field + imports + registerMCPs + buildCustomTools + wire customTools)
  - ADD the imports above (Type value; defineTool value; ToolDefinition/AgentToolResult/ExtensionContext type; MCPHandler value; MCPServer/Tool type).
  - ADD the private field (near the other private fields, mirror ClaudeCodeHarness L177):
        `private mcpHandler: MCPHandler = new MCPHandler();`
  - REPLACE the throwing `registerMCPs(_servers)` stub with the real body from "Implementation Patterns" below
    (init guard → loop registerServer → return getTools). DROP any toAgentSDKServer/mcpServerConfig block (GOTCHA #10).
  - ADD `private buildCustomTools(toolExecutor): ToolDefinition[]` (the delegation bridge) from "Implementation Patterns".
  - In the execute() IIFE (P2.M2.T2.S1's body), find `customTools: []` and replace with
    `customTools: this.buildCustomTools(toolExecutor)`. (If P2.M2.T2.S1 named the param `_toolExecutor`,
    rename to `toolExecutor` — GOTCHA #16.)
  - LEAVE the streaming-throw branch, the aggregation listener, onSessionStart/onSessionEnd hooks,
    loadSkills stub, resolveModel/initialize/terminate UNCHANGED.
  - VERIFY (grep): `grep -nE "mcpHandler|registerServer\(|getTools\(\)|buildCustomTools\(|defineTool\(|customTools: this\.buildCustomTools|toolExecutor\(\{ name:|@sinclair/typebox" src/harnesses/pi-harness.ts` → 7+ hits.
  - VERIFY (NO forbidden transitive import): `! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts` → exit 1 (no match).

Task 2: MODIFY src/__tests__/unit/providers/pi-harness.test.ts (remove obsolete assertion)
  - In `describe('stub methods throw with downstream subtask references', …)`, DELETE the single
    `it('registerMCPs() should throw citing P2.M4.T1.S2', () => { … })` block (L64-66).
  - KEEP the `loadSkills` (cites P2.M3.T2.S3) `it(...)` case (L69-71).
  - VERIFY: `grep -n "P2.M4.T1.S2" src/__tests__/unit/providers/pi-harness.test.ts` → 0 hits (removed);
            `grep -n "P2.M3.T2.S3" src/__tests__/unit/providers/pi-harness.test.ts` → 1 hit (kept).

Task 3: CREATE src/__tests__/unit/providers/pi-harness-registermcps.test.ts
  - STRUCTURE: import { describe, it, expect, beforeEach } from 'vitest'; PiHarness; HarnessRegistry (reset);
    type MCPServer + Tool from '../../../types/sdk-primitives.js'. Copy createTestTool/createTestServer
    fixtures from claude-code-harness-registermcps.test.ts.
  - beforeEach: `new PiHarness()`; reset HarnessRegistry (getInstance()._resetInitStateForTesting() +
    _resetForTesting() — copy from pi-harness-initialize.test.ts L25-27).
  - CASES (describe('PiHarness - registerMCPs()')):
      Init guard:
        - new PiHarness() (no init) → registerMCPs([srv]) → rejects /not initialized/i.
      Single server:
        - await init; await registerMCPs([srv('fs',[tool('read_file')])]) → returns Tool[] length 1;
          result[0].name === 'fs__read_file'; result[0].description matches; result[0].input_schema.type==='object'.
      Multiple servers / multiple tools:
        - registerMCPs([srv('fs',[t1,t2]), srv('git',[t3])]) → length 3; names 'fs__t1','fs__t2','git__t3'.
      Namespacing:
        - explicit assertion result.every(t => t.name.includes('__')).
      Idempotent / repeated calls:
        - registerMCPs([srv('a',[ta])]); registerMCPs([srv('b',[tb])]) → second returns length covering both
          (MCPHandler accumulates; assert second call's getTools includes 'a__ta' AND 'b__tb').
          NOTE: registerServer throws on DUPLICATE server name — do NOT register the same server twice.
      Empty array:
        - registerMCPs([]) → resolves; returns [] (or current accumulated list — assert it does not throw).
      Integration with execute (customTools wired):
        - after registerMCPs, (harness as any).buildCustomTools(async()=>({content:'',isError:false})).length === registered count.
  - PLACEMENT: src/__tests__/unit/providers/.

Task 4: CREATE src/__tests__/unit/providers/pi-harness-customtools.test.ts (the delegation bridge)
  - STRUCTURE: import { describe, it, expect, beforeEach, vi } from 'vitest'; PiHarness; HarnessRegistry (reset);
    type MCPServer/Tool from '../../../types/sdk-primitives.js'.
  - beforeEach: `new PiHarness()`; await initialize(); reset registry; register ONE inprocess server
    'srv' with tool 'echo' (input_schema {type:'object',properties:{msg:{type:'string'}}}) — gives 'srv__echo'.
  - HELPERS: const noopExecutor = vi.fn(async (req) => ({ content: `echo:${JSON.stringify(req.input)}`, isError: false }));
  - CASES (describe('PiHarness - buildCustomTools() toolExecutor delegation')):
      Shape:
        - const tools = (harness as any).buildCustomTools(noopExecutor); expect(tools).toHaveLength(1);
          expect(tools[0].name).toBe('srv__echo'); expect(typeof tools[0].description).toBe('string');
          expect(tools[0].parameters).toBeTruthy(); expect(typeof tools[0].execute).toBe('function').
      Empty registry → []:
        - new PiHarness(); init; buildCustomTools(fn) → length 0 (GOTCHA #11).
      Success delegation:
        - tools[0].execute('call-1', { msg: 'hi' }, undefined, undefined, {} as any);
          expect(noopExecutor).toHaveBeenCalledTimes(1);
          expect(noopExecutor).toHaveBeenCalledWith({ name: 'srv__echo', input: { msg: 'hi' } });
          const res = await ret; expect(res.content[0]).toEqual({ type:'text', text: 'echo:{"msg":"hi"}' });
          expect(res.details.isError).toBe(false); expect(res.terminate).toBeUndefined().
      isError:true result still returns (no throw, no terminate):
        - const errExec = vi.fn(async ()=>({ content:'boom', isError:true }));
          const r = await (harness as any).buildCustomTools(errExec)[0].execute('c',{},undefined,undefined,{} as any);
          expect(r.content[0].text).toBe('boom'); expect(r.details.isError).toBe(true); expect(r.terminate).toBeUndefined().
      Non-string content is JSON-stringified:
        - const objExec = vi.fn(async ()=>({ content:{ a:1 }, isError:false }));
          const r = await …execute(…); expect(r.content[0].text).toBe('{"a":1}').
      toolExecutor rejection is caught:
        - const throwExec = vi.fn(async ()=>{ throw new Error('explode'); });
          const r = await …buildCustomTools(throwExec)[0].execute('c',{},undefined,undefined,{} as any);
          expect(r.content[0].text).toMatch(/explode|Error/i); expect(r.details.isError).toBe(true).
      execute() passes customTools into createAgentSession (integration):
        - register the srv__echo tool; monkey-patch (harness as any).sdk.createAgentSession to capture opts:
          const captured: any = {}; const fakeSession = { subscribe:()=>()=>{}, prompt: async()=>{} };
          (harness as any).sdk = { ...(harness as any).sdk,
            createAgentSession: vi.fn(async (opts)=>{ captured.opts=opts; return { session: fakeSession }; }) };
          await harness.execute({prompt:'hi',options:{}}, noopExecutor);
          expect(captured.opts.customTools).toHaveLength(1);
          expect(captured.opts.customTools[0].name).toBe('srv__echo');
          expect(typeof captured.opts.customTools[0].execute).toBe('function').
          (Reuse P2.M2.T2.S1's fake-session minimal shape — subscribe returning an unsubscribe fn, prompt async no-op.)
  - PLACEMENT: src/__tests__/unit/providers/.

Task 5: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - If lint names pi-harness.ts: check (a) a transitive type import slipped in (CRITICAL #4),
    (b) `Type`/`defineTool` imported as `import type` (they're VALUES), (c) `ToolDefinition`/`AgentToolResult`
    imported as a value (they're TYPES), (d) `customTools` array type mismatch (use defineTool to widen).
  - If pi-harness.test.ts fails on "registerMCPs should throw P2.M4.T1.S2": the obsolete case wasn't removed (Task 2).
  - If customtools test fails on "Pi rejected args": switch the placeholder schema to `Type.Any()` (Decision 2 fallback).
```

### Implementation Patterns & Key Details

```ts
// === The private mcpHandler field (add near the other private fields) ===
private mcpHandler: MCPHandler = new MCPHandler();   // mirror ClaudeCodeHarness L177

// === registerMCPs() — REPLACES the throwing stub (mirror ClaudeCodeHarness L907-933, DROP sdkConfig) ===
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // Init guard (mirror ClaudeCodeHarness L914-917).
  if (!this.sdk) {
    throw new Error("PiHarness not initialized. Call initialize() first.");
  }
  // Forward each server to MCPHandler (namespacing serverName__toolName happens inside — Decision 5).
  for (const server of servers) {
    this.mcpHandler.registerServer(server);
  }
  // Return the discovered tools in MCP format (namespaced name + input_schema).
  // NOTE: no toAgentSDKServer()/mcpServerConfig — Pi builds customTools at execute() time (GOTCHA #10).
  return this.mcpHandler.getTools();
}

// === buildCustomTools() — the execute→toolExecutor delegation bridge (THE deliverable) ===
/**
 * Build Pi `ToolDefinition[]` from the registered MCPHandler tools, wiring each tool's `execute()`
 * to delegate to the caller-supplied `toolExecutor` (PRD §7.10).
 *
 * NOTE: `MCPHandler.toPiCustomTools()` (the schema-faithful bridge) is owned by P2.M4.T1.S2 and is
 * NOT yet built. This inline bridge consumes `getTools()` directly. The `parameters` schema is a
 * PERMISSIVE placeholder (`Type.Object({}, { additionalProperties: true })`) pending P2.M4.T1.S1's
 * real JSON-Schema→TypeBox converter. Tool names are already namespaced `serverName__toolName`
 * by MCPHandler.registerServer (Decision 5).
 */
private buildCustomTools(
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
): ToolDefinition[] {
  // Permissive placeholder schema — accepts any object (LLM tool args are always objects).
  // Real schema fidelity is P2.M4.T1.S1. Fallback if Pi rejects: Type.Any().
  const PERMISSIVE_PARAMS = Type.Object({}, { additionalProperties: true });

  return this.mcpHandler.getTools().map((tool) =>
    defineTool({
      name: tool.name,                 // already 'serverName__toolName' (Decision 5)
      label: tool.name,                // UI label — reuse the namespaced name (no separate label source)
      description: tool.description,
      parameters: PERMISSIVE_PARAMS,   // placeholder — P2.M4.T1.S1 owns real conversion
      // PRD §7.10: when Pi emits a tool_call, invoke toolExecutor and return the ToolExecutionResult.
      execute: async (
        _toolCallId: string,
        params: unknown,               // Static<PERMISSIVE_PARAMS> — widened; passed through as `input`
        _signal: AbortSignal | undefined,
        _onUpdate: undefined,          // headless — no streaming updates
        _ctx: ExtensionContext,
      ): Promise<AgentToolResult<unknown>> => {
        try {
          const result = await toolExecutor({ name: tool.name, input: params });
          const text =
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content);
          return {
            content: [{ type: "text" as const, text }],   // AgentToolResult.content is an ARRAY (GOTCHA #8)
            details: { isError: result.isError, toolName: tool.name },
            // terminate: OMIT — never force-stop on a tool result (GOTCHA #9); let the model decide.
          };
        } catch (error) {
          // toolExecutor rejection (bug/throw) — return error content, do NOT propagate (GOTCHA #9).
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: `Error: ${message}` }],
            details: { isError: true, toolName: tool.name },
          };
        }
      },
    }),
  );
}

// === The ONE-LINE change inside execute()'s IIFE (P2.M2.T2.S1's body) ===
// FIND:    const { session } = await this.sdk.createAgentSession({
//            model,
//            modelRegistry: this.modelRegistry,
//            authStorage: this.authStorage,
//            customTools: [],                          // ← P2.M2.T2.S1 placeholder
//          });
// REPLACE: customTools: this.buildCustomTools(toolExecutor),
//
// (If P2.M2.T2.S1 named the execute param `_toolExecutor`, rename it to `toolExecutor` first — GOTCHA #16.)
```

```ts
// === loadSkills stays EXACTLY as S1/S2 left it (GOTCHA: unchanged) ===
async loadSkills(_skills: Skill[]): Promise<void> {
  throw new Error("PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io loading)");
}
```

### Integration Points

```yaml
SOURCE (MODIFY):
  - src/harnesses/pi-harness.ts : add private mcpHandler field; replace registerMCPs stub → real
    forwarding; add private buildCustomTools(toolExecutor); swap customTools:[] → customTools:this.buildCustomTools(toolExecutor)
    in the execute() IIFE; add imports (Type, defineTool, ToolDefinition/AgentToolResult/ExtensionContext types, MCPHandler, MCPServer/Tool types).

TESTS (MODIFY / NEW):
  - src/__tests__/unit/providers/pi-harness.test.ts             : REMOVE the registerMCPs-throws it(...) (Decision 6).
  - src/__tests__/unit/providers/pi-harness-registermcps.test.ts: NEW (registerMCPs forwarding).
  - src/__tests__/unit/providers/pi-harness-customtools.test.ts : NEW (delegation bridge + execute integration).

IMPORTS ADDED (to pi-harness.ts):
  - value: { Type } from "@sinclair/typebox"
  - value: { defineTool } from "@earendil-works/pi-coding-agent"
  - type : { ToolDefinition, AgentToolResult, ExtensionContext } from "@earendil-works/pi-coding-agent"
  - value: { MCPHandler } from "../core/mcp-handler.js"
  - type : { MCPServer, Tool } from "../types/sdk-primitives.js"   (ToolExecutionRequest/Result already type-imported by S1's skeleton)
  - (createSuccessResponse/createErrorResponse/AGENT_ERROR_CODES/parseModelSpec/getGlobalHarnessConfig/ConfigError/
     ModelRegistry/AuthStorage/createAgentSession/AgentSession*/StreamEvent — already imported by S1/S2/P2.M2.T2.S1.)

CONSUMERS (kept green — NO source edits):
  - execute()'s first real consumer with tools is P3.M1 (Agent.executePrompt passes toolExecutor).
  - HarnessRegistry.register/has/get UNCHANGED.

NOT IN SCOPE (do not touch — owned downstream):
  - MCPHandler.toPiCustomTools() (the schema-faithful bridge)                → P2.M4.T1.S2
  - JSON-Schema → TypeBox converter (real parameter schemas)                 → P2.M4.T1.S1
  - Streaming execute path (AsyncGenerator<StreamEvent>)                     → P2.M3.T2.S1
  - onToolStart/onToolEnd/onStream hook wiring                               → P2.M3.T2.S2
  - Native agentskills.io skill loading (loadSkills body)                    → P2.M3.T2.S3
  - Agent harness rewire (registry.get('pi').execute with real toolExecutor) → P3.M1
  - Harness-surface public export                                             → P3.M3.T1.S1
```

---

## Validation Loop

> **Toolchain:** `npm run lint` = `tsc --noEmit` (EXCLUDES `src/__tests__` → validates
> `src/harnesses/pi-harness.ts` compiles + TypeBox/defineTool/ToolDefinition wiring sound + NO forbidden
> transitive import + no cycle). `npm test` = `vitest run` (esbuild transpile-only; new + edited + full
> suite). `npm run build` = `tsc` (emits `dist/`). No eslint/prettier.

### Level 1: Syntax & Type Check (run after Task 1)

```bash
npm run lint
# Expected: exit 0. An error naming pi-harness.ts =
#   (a) a transitive type slipped in: `import { TextContent } from '@earendil-works/pi-ai'` →
#       ERR_PACKAGE_PATH_NOT_EXPORTED or unresolved. FIX: remove it; cast structurally (CRITICAL #4).
#   (b) `Type` or `defineTool` imported as `import type` (they're VALUES — used at runtime). FIX: value import.
#   (c) `ToolDefinition`/`AgentToolResult` imported as a value (they're TYPES). FIX: `import type`.
#   (d) `customTools` array type mismatch (defineTool widens to AnyToolDefinition — if you skipped defineTool,
#       cast `as ToolDefinition[]` or wrap each element in defineTool). FIX: use defineTool (GOTCHA #14).
#   (e) '@sinclair/typebox' unresolved (shouldn't happen — hoisted). FIX: confirm node_modules/@sinclair/typebox
#       exists; if a strict toolchain rejects the undeclared dep, add it to package.json deps (out of scope).
```

### Level 2: Unit Tests (run after Tasks 2–4)

```bash
# NEW registerMCPs forwarding suite
npm test -- src/__tests__/unit/providers/pi-harness-registermcps
# Expected: all pass. A failure on namespacing = registerServer wasn't forwarded (check the loop).
# A failure on init-guard = the `if (!this.sdk)` check is missing/after the loop.

# NEW customtools delegation suite
npm test -- src/__tests__/unit/providers/pi-harness-customtools
# Expected: all pass. A failure on "toolExecutor called with {name,input}" = the execute body didn't
#   pass { name: tool.name, input: params } (check GOTCHA #12). A failure on "content[0].text" = the
#   stringification mapping is wrong (GOTCHA #8). A failure on "customTools passed to createAgentSession"
#   = the execute() IIFE still has customTools:[] (Task 1 wire step incomplete).

# EDITED S1 structure suite (must still pass after removing the registerMCPs-throws case)
npm test -- src/__tests__/unit/providers/pi-harness.test
# Expected: all pass. If "registerMCPs() should throw citing P2.M4.T1.S2" still runs/fails → Task 2
#   didn't remove it. loadSkills throw case MUST still pass.

# P2.M2.T2.S1's execute suite MUST STILL PASS (customTools wiring must not break aggregation/hooks):
npm test -- src/__tests__/unit/providers/pi-harness-execute
# Expected: all pass. (P2.M2.T2.S1's fake session passes customTools:[] equivalent — now buildCustomTools
#   returns [] when no tools registered, so its assertions are unaffected. If a case asserts
#   createAgentSession called with customTools:[] EXACTLY, that assertion now sees [] from buildCustomTools
#   when the registry is empty — still []. If it deepEqual'd [], it still passes. If it FAILS, update the
#   assertion to check `.customTools` is an array — note this as a minor P2.M2.T2.S1-test edit IF needed.)

# S1/S2 suites MUST STILL PASS (no behaviour change to initialize/terminate/resolveModel/normalizeModel):
npm test -- src/__tests__/unit/providers/pi-harness-initialize src/__tests__/unit/providers/pi-harness-normalizemodel
# Expected: all pass.

# Full suite (catch any ripple — esp. registry/agent/claude-code suites + the parallel P2.M2.T2.S1 suites)
npm test
```

### Level 3: Integration / Runtime Spot-Check (manual, tsx)

```bash
# Prove the end-to-end tool round-trip with a monkey-patched fake session (no network):
cat > /tmp/pi-customtools-spotcheck.mts <<'EOF'
import { PiHarness } from "./src/harnesses/pi-harness.ts";
import type { MCPServer } from "./src/types/sdk-primitives.ts";

const h = new PiHarness();
await h.initialize();

// Register one inprocess tool.
const srv: MCPServer = {
  name: "srv", transport: "inprocess",
  tools: [{ name: "echo", description: "echoes input",
    input_schema: { type: "object", properties: { msg: { type: "string" } } } }],
};
await h.registerMCPs([srv]);

// toolExecutor the Agent would supply.
const toolExecutor = async (req: any) => ({ content: `echo:${JSON.stringify(req.input)}`, isError: false });
let executed: any = null;

// Fake session: during prompt(), find the registered customTool and run its execute().
let listener: any;
const fakeSession = {
  subscribe: (l: any) => { listener = l; return () => { listener = null; }; },
  prompt: async (_t: string) => {
    // Pi would normally call the tool itself; here we simulate by grabbing the customTools and invoking.
    // (createAgentSession captured opts — we read them via the mock below.)
  },
};
let capturedOpts: any;
(h as any).sdk = { ...(h as any).sdk,
  createAgentSession: async (opts: any) => { capturedOpts = opts; return { session: fakeSession }; } };

// Drive execute — and separately prove the customTool's execute() delegates to toolExecutor.
const res = await h.execute({ prompt: "hi", options: {} }, toolExecutor);
console.log("customTools:", capturedOpts.customTools.map((t:any)=>t.name));   // ['srv__echo']
const r = await capturedOpts.customTools[0].execute("c1", { msg: "ping" }, undefined, undefined, {});
console.log("tool result:", JSON.stringify(r));  // content:[{type:'text',text:'echo:{"msg":"ping"}'}], details.isError:false
console.log("agentResponse.status:", res.status);
EOF
npx tsx /tmp/pi-customtools-spotcheck.mts
# Expected: customTools: ['srv__echo']; tool result content text 'echo:{"msg":"ping"}', details.isError false;
#   agentResponse.status 'success'.
```

### Level 4: Contract Grep (forbidden/required tokens)

```bash
# REQUIRED (all present):
grep -nE "mcpHandler|registerServer\(|getTools\(\)|buildCustomTools\(|defineTool\(|customTools: this\.buildCustomTools\(toolExecutor\)|toolExecutor\(\{|@sinclair/typebox" src/harnesses/pi-harness.ts
# FORBIDDEN (none present — exit 1 = pass):
! grep -nE "@earendil-works/pi-ai|@earendil-works/pi-agent-core" src/harnesses/pi-harness.ts
# loadSkills stub intact:
grep -nE "loadSkills\(\) not implemented — P2\.M3\.T2\.S3" src/harnesses/pi-harness.ts
```

---

## Final Validation Checklist

### Technical Validation
- [ ] All 4 validation levels completed successfully.
- [ ] `npm run lint` exits 0 (pi-harness.ts compiles; TypeBox/defineTool wiring sound; no forbidden transitive import; no cycle).
- [ ] `npm test` exits 0 (new registerMCPs + customtools suites + edited S1 suite + P2.M2.T2.S1 execute suite + full regression).
- [ ] `npm run build` exits 0 (`dist/harnesses/pi-harness.{js,d.ts}` emitted with real registerMCPs + buildCustomTools + wired customTools).

### Feature Validation
- [ ] `registerMCPs()` forwards to `this.mcpHandler.registerServer` and returns namespaced `getTools()`.
- [ ] `buildCustomTools(toolExecutor)` maps each registered tool to a `ToolDefinition` whose `execute()`
      delegates to `toolExecutor({name, input})` and maps `ToolExecutionResult` → `AgentToolResult`.
- [ ] Success → `content:[{type:'text',text}]` + `details.isError===false`; `isError:true` → still returns
      (no throw, no `terminate`); rejection → caught error content + `details.isError===true`.
- [ ] `execute()` passes `customTools: this.buildCustomTools(toolExecutor)` into `createAgentSession`.
- [ ] Empty registry → `customTools: []` (backward compatible with P2.M2.T2.S1's no-tools path).
- [ ] Tool-execution semantics identical to `ClaudeCodeHarness` (`ToolExecutionRequest`/`ToolExecutionResult` — PRD §7.14 parity).
- [ ] `loadSkills` still throws citing P2.M3.T2.S3.

### Code Quality Validation
- [ ] Follows ClaudeCodeHarness.registerMCPs forwarding pattern; no new patterns invented.
- [ ] `buildCustomTools` mirrors MCPHandler.toAgentSDKServer's per-tool loop + try/catch (adapted to Pi types).
- [ ] No transitive-dep type imports (structural TextContent cast only — CRITICAL #4).
- [ ] `toolExecutor` finally consumed (was a P2.M2.T2.S1 no-op).
- [ ] Permissive TypeBox schema documented as a P2.M4.T1.S1 placeholder.

### Documentation & Deployment
- [ ] registerMCPs + buildCustomTools JSDoc cite PRD §7.10/§7.14.1 + the P2.M4 downstream owners.
- [ ] No new env vars / config.

---

## Anti-Patterns to Avoid

- ❌ Don't call `this.mcpHandler.toPiCustomTools()` — it doesn't exist yet (P2.M4.T1.S2); build the
  delegation inline as `buildCustomTools` (Decision 1).
- ❌ Don't implement the real JSON-Schema→TypeBox conversion — it's P2.M4.T1.S1; use the permissive
  placeholder schema (Decision 2).
- ❌ Don't import `TextContent`/`AssistantMessage`/`Usage` from `pi-ai`/`pi-agent-core` — non-hoisted
  transitive; `ERR_PACKAGE_PATH_NOT_EXPORTED`. Cast structurally (Decision 4).
- ❌ Don't re-namespace tool names — MCPHandler already did (`serverName__toolName`); use `tool.name` as-is (Decision 5).
- ❌ Don't store an `mcpServerConfig`/call `toAgentSDKServer()` in registerMCPs — that's Claude-specific;
  Pi builds customTools fresh at execute() time (GOTCHA #10).
- ❌ Don't set `terminate: true` on error tool results — return content so the model can react (GOTCHA #9).
- ❌ Don't return a string from `execute()` — `AgentToolResult.content` is an ARRAY of content blocks (GOTCHA #8).
- ❌ Don't leave the obsolete `it('registerMCPs() should throw citing P2.M4.T1.S2')` in pi-harness.test.ts (Decision 6).
- ❌ Don't make `buildCustomTools` public just for tests — access it via `(harness as any).buildCustomTools(…)` (GOTCHA #13).
- ❌ Don't touch the aggregation listener, streaming branch, hooks, or `loadSkills` — out of scope.

---

**Confidence Score: 9/10** for one-pass implementation success. The delegation mechanism is a direct
analogue of the EXISTING `MCPHandler.toAgentSDKServer()` loop (adapted ToolDefinition/AgentToolResult
shapes, verified against the installed `.d.ts`); `registerMCPs` is a near-verbatim copy of
ClaudeCodeHarness's; the TypeBox placeholder is verified resolvable; and the test idioms (real
MCPHandler for registerMCPs; private-field cast for buildCustomTools; fake-session capture for the
execute integration) are all proven in sibling files. The -1 is for the one residual uncertainty:
whether Pi validates `params` strictly against `Type.Object({},{additionalProperties:true})` — explicitly
mitigated by the documented `Type.Any()` fallback (Decision 2) — and the minor possibility that
P2.M2.T2.S1's execute test asserts `customTools:[]` by deep-equal (handled in Level 2 triage).

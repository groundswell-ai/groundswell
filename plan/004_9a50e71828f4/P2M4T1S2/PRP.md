# PRP — P2.M4.T1.S2: `MCPHandler.toPiCustomTools()` returning `ToolDefinition[]`

**PRD reference:** §7.10 (Tool Execution — "Groundswell passes its tool list into
`createAgentSession({ tools })` … Pi treats them as ordinary registered tools"), §7.12 (MCP & LSP
provided by Groundswell's `MCPHandler` … "both harnesses receive the same tool list"), §7.14.1
(Feature parity — "MCP Tools: Register, discover, and execute MCP tools" identically across
harnesses). **Plan:** `plan/004_9a50e71828f4/` — S2 of P2.M4.T1 ("JSON-Schema → TypeBox converter and
toPiCustomTools bridge"). **Consumes** S1's `jsonSchemaToTypebox` (`src/harnesses/pi-schema-converter.ts`
— ALREADY IMPLEMENTED, exports `jsonSchemaToTypebox(schema): TSchema` + re-exports `Type`/`TSchema`),
the `MCPHandler.registeredTools` Map + `getTools()` + the `toAgentSDKServer()` PARITY TEMPLATE
(`src/core/mcp-handler.ts`), the Pi SDK `defineTool`/`ToolDefinition`/`AgentToolResult` types
(`@earendil-works/pi-coding-agent`), and the PRE-EXISTING inline bridge `PiHarness.buildCustomTools`
(`src/harnesses/pi-harness.ts` L668-700, esp. the `PERMISSIVE_PARAMS` placeholder at L650 that S2
REPLACES with a real converted schema). **Unblocks** P2.M4 completion + P4.M2.T1.S1 (parity tests).
**Scope tag:** (a) ADD `MCPHandler.toPiCustomTools(): ToolDefinition[]` + a private `toAgentToolResult`
helper, mirroring `toAgentSDKServer()` but emitting Pi `ToolDefinition[]` with `parameters:
jsonSchemaToTypebox(tool.input_schema)` and `execute` delegating to `registered.executor`; (b)
REFACTOR `PiHarness.buildCustomTools` into a 1-line delegator (`return this.mcpHandler.toPiCustomTools()`)
that DROPS the `toolExecutor` param + the placeholder schema; (c) UPDATE the 2 call sites in
`execute()`/`executeStreaming()`; (d) ADD a focused MCPHandler unit test + REWIRE the existing
PiHarness customTools tests. **Mock:** MCPHandler is mocked/spied in the PiHarness delegation tests;
the new MCPHandler unit test uses a REAL MCPHandler (registers servers + executors — mirrors how
`toAgentSDKServer` is tested via `claude-code-harness-registermcps.test.ts`). **Parallel note:** S1
(the converter) is DONE and untouched by S2. S2 has ZERO file overlap with S1.

> **READ "SCOPE DECISIONS" BEFORE WRITING CODE.** Ten load-bearing details:
> (1) `toPiCustomTools()` MIRRORS `toAgentSDKServer()` — both iterate `this.registeredTools`, both use
> `registered.executor(args)` directly (NOT the harness-level `toolExecutor`), both stringify the raw
> executor result, both return null/[] when empty. The ONLY differences: Pi returns `ToolDefinition[]`
> (via `defineTool`) instead of `McpServerConfig` (via `createSdkMcpServer`), and Pi's `parameters` is
> `jsonSchemaToTypebox(input_schema)` (TypeBox) instead of `jsonSchemaToZodRawShape` (Zod). (2) S2
> SUPERSEDES the P2.M3.T1.S1 inline bridge: `PiHarness.buildCustomTools(toolExecutor)` (placeholder
> schema + harness-toolExecutor delegation) is REFACTORED to `buildCustomTools(): ToolDefinition[]` →
> `return this.mcpHandler.toPiCustomTools();`. The `toolExecutor` param is DROPPED from buildCustomTools
> because `toPiCustomTools` uses `registered.executor` (Claude parity — see Decision 2). (3) `registered
> .executor(params)` returns the RAW executor output (`unknown`), NOT a `ToolExecutionResult` — so
> `toAgentToolResult(r, isError)` must stringify `r` directly (mirror toAgentSDKServer L196-205), NOT
> read `r.content`/`r.isError`. (4) `toPiCustomTools()` is SYNC (`: ToolDefinition[]`, mirroring sync
> `toAgentSDKServer()`) → CANNOT `await import`; therefore `defineTool` is a STATIC top-level import in
> mcp-handler.ts (same as the existing static `@anthropic-ai/claude-agent-sdk` import at L5-9). (5) The
> `details` field of the returned `AgentToolResult` is `{ isError: boolean }` (minimal; the existing
> buildCustomTools also stashed `toolName` but it is NOT load-bearing — dropped for a clean shared
> helper). (6) mcp-handler.ts imports the S1 converter via `import { jsonSchemaToTypebox } from
> "../harnesses/pi-schema-converter.js";` — core→harnesses is an ACCEPTED pattern (agent.ts:43); the
> converter is a pure leaf (imports nothing back into core) → no cycle. (7) The `execute` closure
> signature is the FULL 5-arg Pi form `(toolCallId, params, signal, onUpdate, ctx)` (underscore-prefixed
> unused) so it type-checks against `ToolDefinition.execute` — copy the existing buildCustomTools closure
> signature verbatim. (8) Tests: the NEW `mcp-handler-pi-customtools.test.ts` uses a REAL MCPHandler +
> `registerToolExecutor(serverName, toolName, fn)` (the inprocess executor-lookup path); the REWIRED
> `pi-harness-customtools.test.ts` SPIES on `harness.mcpHandler.toPiCustomTools` (`vi.spyOn`) and asserts
> pure delegation (buildCustomTools is now 1 line). (9) ALL `buildCustomTools(<executor>)` call sites +
> tests must be updated (grep-verified: pi-harness.ts L256+L376; customtools.test L72/87/105/126/145/164;
> registermcps.test L156). (10) The harness-level `toolExecutor` param REMAINS in `execute()`'s signature
> (Harness interface, PRD §7.3) — it is simply no longer passed to buildCustomTools; this MIRRORS
> ClaudeCodeHarness where the passed toolExecutor is not the MCP execution path (claude-code-harness.ts
> L769 comment). No regression; intentional parity.

---

## Goal

**Feature Goal:** Give `MCPHandler` a Pi-side tool bridge — `toPiCustomTools(): ToolDefinition[]` — that
is the structural PARALLEL of the existing `toAgentSDKServer()` (Claude) bridge: it iterates
`this.registeredTools`, wraps each in a Pi `ToolDefinition` (via `defineTool`) whose `parameters` is the
REAL TypeBox schema produced by S1's `jsonSchemaToTypebox(tool.input_schema)` (replacing the permissive
placeholder), and whose `execute` delegates to `registered.executor(params)` and maps the result to a Pi
`AgentToolResult`. Wire it into `PiHarness` by refactoring `buildCustomTools` to delegate to it. After
S2: MCPHandler exposes BOTH `toAgentSDKServer()` (Claude) and `toPiCustomTools()` (Pi); tool-execution is
at PARITY across harnesses (PRD §7.14.1) and the default `pi` harness registers tools with schema-faithful
TypeBox parameters (not the permissive placeholder).

**Deliverable:**
1. **MODIFY `src/core/mcp-handler.ts`** — ADD:
   - `public toPiCustomTools(): ToolDefinition[]` — iterates `this.registeredTools`; per tool builds
     `defineTool({ name: fullName, label: fullName, description, parameters: jsonSchemaToTypebox(...),
     execute: async (5-arg) => { try { return toAgentToolResult(await registered.executor(params), false) }
     catch (e) { return toAgentToolResult(\`Error: ${msg}\`, true) } } })`; returns `[]` when `getTools()`
     is empty (early return mirroring toAgentSDKServer L172-175).
   - `private toAgentToolResult(result: unknown, isError: boolean): AgentToolResult<{ isError: boolean }>`
     — stringifies the RAW executor result (`typeof === 'string' ? r : JSON.stringify(r)`) and returns
     `{ content: [{ type:'text', text }], details: { isError } }`.
   - Top-level imports: `import { defineTool } from "@earendil-works/pi-coding-agent";`, `import type {
     ToolDefinition, AgentToolResult, ExtensionContext } from "@earendil-works/pi-coding-agent";`,
     `import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";`.
2. **MODIFY `src/harnesses/pi-harness.ts`** — REFACTOR `buildCustomTools`:
   - Signature `private buildCustomTools(toolExecutor: ...)` → `private buildCustomTools(): ToolDefinition[]`.
   - Body: delete the `PERMISSIVE_PARAMS` placeholder (L650) + the inline `defineTool` closure →
     `return this.mcpHandler.toPiCustomTools();`.
   - Update JSDoc to state it delegates to `MCPHandler.toPiCustomTools()` (no more placeholder).
   - Update the 2 call sites: L256 (`execute`) + L376 (`executeStreaming`) → `customTools:
     this.buildCustomTools(),`.
3. **CREATE `src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts`** — REAL MCPHandler unit
   test for `toPiCustomTools()` (shape / empty→[] / real-TypeBox-parameters / execute success string +
   object / execute error / executor rejection / parity-with-getTools).
4. **MODIFY `src/__tests__/unit/providers/pi-harness-customtools.test.ts`** — REWIRE to assert
   `buildCustomTools()` delegates to `mcpHandler.toPiCustomTools` (spy) + execute() passes customTools.
5. **MODIFY `src/__tests__/unit/providers/pi-harness-registermcps.test.ts`** — L156: `buildCustomTools(noopExecutor)` → `buildCustomTools()`.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit` on src/) exits 0 — `toPiCustomTools` + `toAgentToolResult` type-check;
   `defineTool`/`ToolDefinition`/`AgentToolResult` imports resolve; the S1 converter import resolves;
   `buildCustomTools()` new signature + both call sites compile.
2. `npm test` exits 0 — the new `mcp-handler-pi-customtools.test.ts` passes, the REWIRED
   `pi-harness-customtools.test.ts` + `pi-harness-registermcps.test.ts` pass, and `pi-harness-streaming.test.ts`
   + the full regression suite stay GREEN.
3. `npm run build` exits 0 — `dist/core/mcp-handler.{js,d.ts}` emits `toPiCustomTools` + `toAgentToolResult`;
   `dist/harnesses/pi-harness.js` reflects the refactored `buildCustomTools`.
4. Runtime spot-check (vitest): a registered tool `{name:'echo', input_schema:{type:'object',
   properties:{msg:{type:'string'}}, required:['msg']}}` produces a `ToolDefinition` whose `parameters` is a
   TypeBox `TObject` with `properties.msg` a `TString` (NOT the permissive placeholder), and whose `execute`
   returns `{ content:[{type:'text',text:'...'}], details:{ isError:false } }` when the registered
   executor resolves.
5. Contract (grep): `toPiCustomTools`, `toAgentToolResult`, `defineTool(`, `jsonSchemaToTypebox(`,
   `registered.executor(params)` present in mcp-handler.ts; `PERMISSIVE_PARAMS` ABSENT from pi-harness.ts;
   `buildCustomTools(` takes NO arguments at both call sites.

---

## ⚠️ SCOPE DECISIONS — ten load-bearing details

### Decision 1 — `toPiCustomTools()` MIRRORS `toAgentSDKServer()` (read it first; copy the structure)

`toAgentSDKServer()` (mcp-handler.ts L165-218) is the PARITY TEMPLATE. READ IT. It: (a) early-returns
`null` if `getTools()` is empty; (b) `Array.from(this.registeredTools.entries()).map(([fullName,
registered]) => {...})`; (c) inside the map, wraps each tool — for Claude via `sdkTool(fullName,
description, jsonSchemaToZodRawShape(input_schema), async (args) => {...})`; (d) the handler does
`const result = await registered.executor(args); return { content:[{type:'text', text: typeof result
=== 'string' ? result : JSON.stringify(result)}] };` wrapped in try/catch (catch → `isError:true`);
(e) returns the assembled config. `toPiCustomTools()` copies this EXACT skeleton but: early-returns `[]`
(instead of `null`); wraps via `defineTool({name:fullName, label:fullName, description, parameters:
jsonSchemaToTypebox(registered.tool.input_schema), execute: async (5-arg) => {...}})`; the `execute` body
does `try { return this.toAgentToolResult(await registered.executor(params), false) } catch(e) { return
this.toAgentToolResult(\`Error: ${msg}\`, true) }`. Returns the `ToolDefinition[]`. The key insight: the
structure (empty-guard → iterate registeredTools → wrap each → try/catch executor → stringify) is IDENTICAL;
only the wrapper type + schema format differ.

### Decision 2 — S2 SUPERSEDES the P2.M3.T1.S1 inline bridge; `buildCustomTools` DROPS `toolExecutor`

The P2.M3.T1.S1 `buildCustomTools(toolExecutor)` was a PLACEHOLDER (S1 converter not yet built): it used a
permissive `PERMISSIVE_PARAMS` schema and wired `execute` to call the harness-level `toolExecutor({name,
input})`. S2 replaces BOTH: (a) the real schema (`jsonSchemaToTypebox`) lives in `toPiCustomTools`; (b)
`execute` calls `registered.executor(params)` (Claude parity). Therefore `buildCustomTools` no longer NEEDS
the `toolExecutor` param — it becomes `private buildCustomTools(): ToolDefinition[] { return
this.mcpHandler.toPiCustomTools(); }`. The `PERMISSIVE_PARAMS` const (L650) + the entire inline
`defineTool` closure (L652-700) are DELETED. **Why dropping `toolExecutor` is parity-correct:**
ClaudeCodeHarness receives `toolExecutor` in `execute()` (Harness interface) but executes MCP tools via
its OWN `mcpHandler.toAgentSDKServer()` → `registered.executor` (claude-code-harness.ts L925). The passed
`toolExecutor` is NOT the MCP execution path on Claude (L769 comment: "Tool execution happens via SDK,
toolExecutor is called through hooks"). S2 makes Pi MATCH: `execute()` KEEPS its `toolExecutor` param
(Harness interface — DO NOT change `execute`'s signature) but no longer threads it into `buildCustomTools`.
The agent.ts multi-handler dispatch (`this.mcpHandlers[]`) is a PRE-EXISTING characteristic of BOTH
harnesses; S2 introduces no regression. (Research §2.)

### Decision 3 — `registered.executor(params)` returns RAW `unknown`, NOT `ToolExecutionResult`

CRITICAL difference from the superseded buildCustomTools closure: that closure called the harness
`toolExecutor` which returns `ToolExecutionResult` (`{content, isError}`), so it read `result.content`/
`result.isError`. `toPiCustomTools` calls `registered.executor(params)` whose type is `ToolExecutor =
(input) => Promise<unknown>` — the RAW executor output (a string, an object, whatever the tool returns).
So `toAgentToolResult(r, isError)` must stringify `r` DIRECTLY (`typeof r === 'string' ? r :
JSON.stringify(r)`), NOT read `r.content`. This is EXACTLY what `toAgentSDKServer`'s handler does
(mcp-handler.ts L196-205) — copy that stringification. If you read `r.content` you will stringify
`undefined` ("undefined") and every test will fail. (Research §3.)

### Decision 4 — `toPiCustomTools()` is SYNC → `defineTool` is a STATIC import (cannot lazy-import)

The contract types `toPiCustomTools(): ToolDefinition[]` (not `Promise<ToolDefinition[]>`), mirroring sync
`toAgentSDKServer(): McpServerConfig | null`. A sync method CANNOT `await import("@earendil-works/pi-coding-agent")`.
Therefore `defineTool` (a runtime VALUE) must be a STATIC top-level import in mcp-handler.ts. This is
CONSISTENT with the existing static `@anthropic-ai/claude-agent-sdk` import at mcp-handler.ts L5-9
(`createSdkMcpServer`, `tool as sdkTool`) used by the sync `toAgentSDKServer`. The TYPES
(`ToolDefinition`, `AgentToolResult`, `ExtensionContext`) are `import type` (erased at runtime). **Trade-off
(documented, NOT blocking):** Claude-only users who import MCPHandler now also load the Pi SDK at
module-eval. This matches the existing eager Claude-SDK load and is a P4-optimizable consequence. A
type-only-import + plain object literal would elide it but risks TypeBox `Static<TSchema>` inference errors;
`defineTool` is the PROVEN-safe choice (pi-harness.ts L2 already statically imports it and compiles+tests
green). (Research §4.)

### Decision 5 — `AgentToolResult.details` = `{ isError: boolean }` (minimal)

The returned `AgentToolResult` shape (verified from the EXISTING buildCustomTools which returns it and
passes its tests): `{ content: Array<{type:'text', text}>, details: TDetails, terminate?: ... }`. S2 uses
`details: { isError: boolean }` — a minimal, clean shape for the shared `toAgentToolResult` helper. The
existing buildCustomTools ALSO stashed `toolName` in details, but it is NOT load-bearing (no test asserts
it; Pi already knows the tool name) — dropped so the helper stays generic. If you want `toolName` for
debugging, pass it into `toAgentToolResult` as a 3rd arg — OPTIONAL, do not over-engineer. (Research §3/§5.)

### Decision 6 — mcp-handler.ts imports the S1 converter (core→harnesses; no cycle)

`import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";`. The reverse edge
(`pi-harness.ts → core/mcp-handler.ts`) already exists, BUT `pi-schema-converter.ts` is a PURE LEAF
(imports only `@sinclair/typebox` + `type { Tool }` — nothing back into core), so the graph is a DAG with
no cycle. core→harnesses for a pure utility is an ACCEPTED pattern: `src/core/agent.ts:43` already does
`import { ... } from "../harnesses/index.js"`. (S1 Decision 7 + Research §1.)

### Decision 7 — `execute` closure is the FULL 5-arg Pi signature (copy the existing closure verbatim)

Pi's `ToolDefinition.execute(toolCallId: string, params: Static<TParams>, signal: AbortSignal | undefined,
onUpdate: AgentToolUpdateCallback<TDetails> | undefined, ctx: ExtensionContext): Promise<AgentToolResult<TDetails>>`.
Copy the EXACT signature from the existing buildCustomTools closure (pi-harness.ts L660-667):
`execute: async (_toolCallId: string, params: unknown, _signal: AbortSignal | undefined, _onUpdate:
undefined, _ctx: ExtensionContext): Promise<AgentToolResult<{ isError: boolean }>> => {...}`. The 4
underscore-prefixed args are unused but REQUIRED for the signature to type-check against
`ToolDefinition.execute` (positional). `params: unknown` (widened — `Static<TSchema>` for the broad param
type). `ExtensionContext` is imported (type-only) solely so the 5th param type-checks. (Research §4.)

### Decision 8 — Test strategy: NEW real-MCPHandler unit test + REWIRED spy-based PiHarness tests

- **NEW** `src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts` — construct a standalone
  `new MCPHandler()`; register a server (`registerServer({name:'srv', transport:'inprocess', tools:[...]})`);
  register each tool's executor via `handler.registerToolExecutor('srv', 'echo', async (input) => ...)`
  (this is what `registered.executor` looks up for inprocess transport — `createToolExecutor` mcp-handler.ts
  L285-300). NO PiHarness → NO SDK init needed → fast, isolated. Covers: shape (name/label/description/
  parameters/execute), empty→[], `parameters` is a REAL TypeBox schema (assert `TypeGuard.TObject` +
  `.properties.msg` is `TString` — proves the placeholder is gone), execute success (string + object
  results stringify correctly), execute returns `isError:false`, executor rejection → `isError:true` +
  text matches `/Error/i` + NO throw, parity with `getTools()` (same count + same names).
- **REWIRE** `pi-harness-customtools.test.ts` — `buildCustomTools()` now takes NO arg and is a 1-line
  delegator. The 6 `buildCustomTools(<executor>)` calls + the executor-delegation assertions are REPLACED
  with a spy: `vi.spyOn((harness as any).mcpHandler, 'toPiCustomTools').mockReturnValue([fakeToolDef])`;
  assert `buildCustomTools()` returns the spied array verbatim (same reference / same length / same
  entries). KEEP the execute-integration `it` (it verifies customTools is passed into createAgentSession —
  still valid; buildCustomTools() returns []). This tests ONLY the delegation seam (the real logic is in
  the new MCPHandler unit test). (Research §5.)
- **UPDATE** `pi-harness-registermcps.test.ts` L156: `buildCustomTools(noopExecutor)` → `buildCustomTools()`
  (the `noopExecutor` local is then unused — delete it or keep; the assertion `customTools.toHaveLength(1)`
  + `.name === 'fs__read'` still holds because `registerMCPs` populated the harness mcpHandler).
- **VERIFY** `pi-harness-streaming.test.ts` (L401) still passes — it checks customTools is passed (an
  array, not hardcoded `[]`); buildCustomTools() still returns a `ToolDefinition[]`. No edit expected;
  RUN it to confirm.

### Decision 9 — Update ALL `buildCustomTools` call sites + tests (grep-verified, no orphans)

Grep-verified references (run `grep -rn "buildCustomTools" src/` to re-confirm before editing):
- `src/harnesses/pi-harness.ts:256` (execute non-streaming) + `:376` (executeStreaming) → `this.buildCustomTools()`.
- `src/harnesses/pi-harness.ts:668` (def) → new signature.
- `src/__tests__/unit/providers/pi-harness-customtools.test.ts` L72, L87, L105, L126, L145, L164 (+ the
  execute-integration `it`) → REWIRED (Decision 8).
- `src/__tests__/unit/providers/pi-harness-registermcps.test.ts:156` → `buildCustomTools()`.
- `src/__tests__/unit/providers/pi-harness-streaming.test.ts:401` → comment + verify (no arg call).
Do NOT leave any `buildCustomTools(<arg>)` call — `tsc` will ERROR on "Expected 0 arguments, but got 1"
and the lint gate will fail. (Research §5.)

### Decision 10 — `toPiCustomTools` early-returns `[]` (not `null`) when empty; `label === fullName`

Mirror toAgentSDKServer's empty-guard (L172-175: `if (tools.length === 0) return null;`) but return `[]`
(the contract + the existing buildCustomTools both yield `[]` for an empty registry — verified by
`pi-harness-customtools.test.ts` "should return [] when no tools are registered"). `label: fullName` —
the existing buildCustomTools used `label: tool.name` (the namespaced fullName); toPiCustomTools uses
`label: fullName` (same value — `registered.tool.name` IS the fullName because `registerServer` stores
`{...tool, name: fullName}`). `description: registered.tool.description`. (Research §5/§7.)

---

## User Persona

**Target User:** Groundswell core maintainers + the parity-test author (P4.M2.T1.S1) + downstream
`PiHarness.execute` consumers.
- **P4.M2.T1.S1 (parity tests)** — asserts the SAME `Tool.input_schema` produces equivalent schema
  fidelity + execution semantics on both harnesses. S2 gives Pi a `toPiCustomTools()` that is the
  structural twin of `toAgentSDKServer()`, making the parity assertion a direct method-vs-method compare.
- **PiHarness.execute (P2.M3.T1.S1 consumer)** — needs `buildCustomTools()` to return schema-faithful
  `ToolDefinition[]` so the model receives real parameter hints (improving tool-call accuracy vs the
  permissive placeholder).

**Use Case:** A Groundswell user registers an MCP tool
(`{name:'search', input_schema:{type:'object', properties:{query:{type:'string'}, limit:{type:'integer'}},
required:['query']}}`) on the default `pi` harness. `PiHarness.execute()` calls `buildCustomTools()` →
`mcpHandler.toPiCustomTools()` → a `ToolDefinition` whose `parameters` is a TypeBox `TObject` with
`query` a required `TString` and `limit` an optional `TInteger`. The model sees the real schema (identical
in EFFECT to what `claude-code` produces via the Zod converter) and calls `execute`, which delegates to
`registered.executor({query:'x', limit:5})` and returns an `AgentToolResult`.

**Pain Points Addressed:** Until S2, the `pi` harness registers tools with a permissive
`Type.Object({}, { additionalProperties: true })` placeholder (pi-harness.ts L650) → the model gets NO
parameter hints → worse tool-calling accuracy vs `claude-code`. S2 replaces the placeholder with the REAL
converted schema AND moves the bridge to its canonical home (`MCPHandler.toPiCustomTools`, mirroring
`toAgentSDKServer`), achieving PRD §7.14.1 tool-execution parity.

---

## Why

- **Realizes PRD §7.10 + §7.12 + §7.14.1** — both harnesses receive the SAME tool list and execute via
  `MCPHandler`; Pi gets a `ToolDefinition[]` bridge that is the twin of Claude's `McpServerConfig` bridge.
- **Completes P2.M4** — S1 (converter) + S2 (bridge) together replace the placeholder with schema-faithful
  Pi tool registration.
- **Improves default-harness quality** — the DEFAULT (`pi`) harness gains schema-faithful tool hints
  (required/optional, types, enums) → better LLM tool-calling accuracy.
- **Unblocks P4.M2.T1.S1** — the parity test can now compare `toAgentSDKServer` vs `toPiCustomTools`
  directly (same `registeredTools`, same `registered.executor`, mirrored structure).

---

## What

1. **MODIFY `src/core/mcp-handler.ts`** — add `toPiCustomTools()` + `toAgentToolResult()` + the 3 imports.
2. **MODIFY `src/harnesses/pi-harness.ts`** — refactor `buildCustomTools` (drop param + placeholder;
   delegate to `toPiCustomTools`) + update the 2 call sites + JSDoc.
3. **CREATE `src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts`** — real-MCPHandler unit test.
4. **MODIFY `src/__tests__/unit/providers/pi-harness-customtools.test.ts`** — spy-based delegation tests.
5. **MODIFY `src/__tests__/unit/providers/pi-harness-registermcps.test.ts`** — drop the executor arg.
6. **VALIDATE** (lint / targeted tests / full suite / build / grep contract + runtime spot-check).
7. **DO NOT** edit `pi-schema-converter.ts` (S1 — DONE, untouched), `toAgentSDKServer` or the Zod
   converters (the Claude path), `package.json` (Pi SDK + typebox already deps), `src/index.ts`
   (public-export sweep is P3.M3.T1.S1), or `execute()`'s signature (Harness interface — only its
   buildCustomTools call site changes).

### Success Criteria

- [ ] `MCPHandler.toPiCustomTools()` exists, is `public`, returns `ToolDefinition[]`, returns `[]` when
      `getTools()` is empty, and is wired into `PiHarness.buildCustomTools()`.
- [ ] Each emitted `ToolDefinition` has `name === fullName` (`serverName__toolName`), `label === fullName`,
      `description === registered.tool.description`, `parameters === jsonSchemaToTypebox(input_schema)`
      (a REAL TypeBox schema — NOT the placeholder).
- [ ] `execute` delegates to `registered.executor(params)` (NOT the harness `toolExecutor`) and returns an
      `AgentToolResult` whose `details.isError === false` on success and `=== true` (with `/Error/i` text)
      when the executor throws (never re-throws).
- [ ] The raw executor result is stringified directly (`typeof === 'string' ? r : JSON.stringify(r)`) —
      NOT read as `{content, isError}`.
- [ ] `PiHarness.buildCustomTools()` takes NO arguments; its body is `return this.mcpHandler.toPiCustomTools();`;
      the `PERMISSIVE_PARAMS` placeholder is GONE.
- [ ] Both `execute()` (L256) + `executeStreaming()` (L376) call `this.buildCustomTools()` (no arg).
- [ ] `npm run lint` / `npm test` / `npm run build` all exit 0.
- [ ] No `buildCustomTools(<arg>)` call remains anywhere (grep clean); `PERMISSIVE_PARAMS` is gone from
      pi-harness.ts (grep clean).

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: an engineer who has never seen this repo can implement S2 using only
(a) this PRP, (b) read-only access to `src/core/mcp-handler.ts` (`toAgentSDKServer` L165-218 — the PARITY
TEMPLATE to mirror; `registeredTools` Map L33; `getTools()` L88; `registerToolExecutor` L78-84;
`createToolExecutor` L285-300 — explains the inprocess executor lookup the test must satisfy), the
ALREADY-DONE `src/harnesses/pi-schema-converter.ts` (S1 — `jsonSchemaToTypebox` signature confirmed),
`src/harnesses/pi-harness.ts` (L650 placeholder + L668-700 buildCustomTools to refactor + L256/L376 call
sites + L2 the `defineTool` import precedent), the Pi SDK `.d.ts`
(`node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` L335-376 — `ToolDefinition`
+ `defineTool` + the `execute` 5-arg signature), and `src/__tests__/unit/providers/pi-harness-customtools.test.ts`
(the existing test to rewire) + `claude-code-harness-registermcps.test.ts` (the toAgentSDKServer test
pattern to mirror), and (c) the copy-paste-ready snippets in "Implementation Patterns" +
`research/toPiCustomTools-reconciliation.md`. The ten load-bearing decisions (mirror toAgentSDKServer,
supersede buildCustomTools, raw-executor-result stringification, sync→static-import defineTool, minimal
details, converter import path, 5-arg execute closure, test strategy, all-call-sites update, empty→[] +
label=fullName) are proven in the research note.

### Documentation & References

```yaml
# MUST READ — the PARITY TEMPLATE (the method to mirror structure-for-structure).
- file: src/core/mcp-handler.ts
  why: L165-218 = toAgentSDKServer (COPY the skeleton: empty-guard → Array.from(registeredTools.entries())
       → map → wrap each tool → try/catch executor → stringify result); L33 = registeredTools Map<string,
       RegisteredTool>; L20-25 = RegisteredTool {tool, executor, serverName}; L88-92 = getTools();
       L78-84 = registerToolExecutor (the inprocess executor the TEST must register); L196-205 = the
       stringification to copy for toAgentToolResult (typeof result === 'string' ? result :
       JSON.stringify(result)); L285-300 = createToolExecutor (explains WHY the test calls
       registerToolExecutor — inprocess looks up toolExecutors.get(fullName)).
  pattern: PUBLIC method, early empty-return, iterate registeredTools.entries(), wrap each, return array.
  gotcha: toAgentSDKServer uses `registered.executor(args)` and stringifies the RAW result — toPiCustomTools
          does the SAME (do NOT read result.content — the executor returns unknown, not ToolExecutionResult).

# MUST READ — the S1 converter (DONE; the import target).
- file: src/harnesses/pi-schema-converter.ts
  why: exports `jsonSchemaToTypebox(schema: Tool['input_schema'] | Record<string,unknown>): TSchema`
       (confirmed at L26) + re-exports `Type`/`TSchema`. S2 imports `{ jsonSchemaToTypebox }` from here.
       It is a PURE leaf — no reverse import into core → no cycle.
  pattern: `import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";` (relative path).

# MUST READ — the file to REFACTOR (buildCustomTools) + the import precedent.
- file: src/harnesses/pi-harness.ts
  why: L2 = `import { defineTool } from "@earendil-works/pi-coding-agent";` (the STATIC-import precedent —
       proves it compiles + runs in-pipeline); L3-8 = `import type { ToolDefinition, AgentToolResult,
       ExtensionContext }` (the type import); L650 = `PERMISSIVE_PARAMS` placeholder (DELETE in S2);
       L648-700 = buildCustomTools (REFACTOR to 1-line delegator); L256 + L376 = the 2 call sites
       (`this.buildCustomTools(toolExecutor)` → `this.buildCustomTools()`).
  pattern: buildCustomTools becomes `private buildCustomTools(): ToolDefinition[] { return
           this.mcpHandler.toPiCustomTools(); }`.
  gotcha: execute()'s `toolExecutor` param STAYS (Harness interface) — only the buildCustomTools call drops it.

# MUST READ — the Pi SDK type definitions (ToolDefinition + defineTool + execute signature).
- file: node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts
  why: L335-356 = interface ToolDefinition<TParams, TDetails, TState> (name/label/description/promptSnippet?/
       promptGuidelines?/parameters/renderShell?/prepareArguments?/executionMode?/execute/renderCall?/
       renderResult?); L361 = execute(toolCallId, params: Static<TParams>, signal, onUpdate, ctx) =>
       Promise<AgentToolResult<TDetails>> (the 5-arg signature to match); L375 = defineTool (identity fn
       for inference). Confirms the exact closure shape S2 must emit.
  gotcha: execute is positional 5-arg — all params required for the signature to type-check (unused ones
          underscore-prefixed).

# MUST READ — the research note (the reconciliation + toAgentToolResult mapping + test strategy).
- file: plan/004_9a50e71828f4/P2M4T1S2/research/toPiCustomTools-reconciliation.md
  why: §2 = the architectural reconciliation (why buildCustomTools drops toolExecutor; Claude parity);
       §3 = toAgentToolResult (raw-result stringification, NOT ToolExecutionResult); §4 = imports + the
       eager-load trade-off; §5 = the grep-verified call sites + test strategy; §6 = defineTool is identity;
       §7 = parity checklist.
  critical: §2 (reconciliation), §3 (stringification), §5 (call sites + tests).

# MUST READ — the S1 PRP (the forward contract S2 consumes).
- file: plan/004_9a50e71828f4/P2M4T1S1/PRP.md
  why: Decision 10 + "FORWARD CONTRACT (S2 will consume)" = `parameters: jsonSchemaToTypebox(tool.input_schema)`
       and the guarantee the return is `TSchema` assignable to `ToolDefinition.parameters`. Confirms S1 is
       the input to S2.

# MUST READ — the contract source + parity rationale.
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.4 = "Schema gotcha: Pi uses TypeBox (TSchema) … MCPHandler needs a schema-converter bridge
       producing TypeBox for Pi (parallel to jsonSchemaToZodRawShape for Claude)"; §4 = "Required new bridge
       on MCPHandler: toPiCustomTools(): ToolDefinition[]" (the exact requirement S2 fulfills) + the
       Claude/Pi tool-registration parity table.
- file: plan/004_9a50e71828f4/docs/consumer-analysis.md
  why: §5 = "toAgentSDKServer() … does not belong in the shared MCPHandler if Pi wants a different shape —
       consider extracting an McpFormatConverter strategy" (S1+S2 realize this: S1 extracted the converter,
       S2 adds toPiCustomTools as the Pi-side bridge alongside the Claude-side toAgentSDKServer).

# SHOULD READ — the existing test to REWIRE + the toAgentSDKServer test pattern to mirror.
- file: src/__tests__/unit/providers/pi-harness-customtools.test.ts
  why: the 6 `buildCustomTools(<executor>)` calls (L72/87/105/126/145/164) + the execute-integration `it`
       to rewire into spy-based delegation tests. The `createTestTool`/`createTestServer`/`noopExecutor`
       helpers are reusable.
- file: src/__tests__/unit/providers/claude-code-harness-registermcps.test.ts
  why: the pattern for testing an MCPHandler bridge with a REAL handler (register server + assert the
       bridge output shape). Mirror it for the new mcp-handler-pi-customtools.test.ts.

# REFERENCE — the AgentToolResult shape (proven by the existing buildCustomTools).
- file: src/harnesses/pi-harness.ts   # L676-698 (the existing execute closure return shape)
  why: the existing buildCustomTools returns `{ content:[{type:'text',text}], details:{ isError, toolName } }`
       and passes its tests → that IS the AgentToolResult shape. S2 uses `details:{ isError }` (drops
       toolName — not load-bearing).
```

### Current Codebase tree (relevant slice)

```bash
src/core/
└── mcp-handler.ts            # MODIFY — ADD toPiCustomTools() + toAgentToolResult() + 3 imports. (toAgentSDKServer L165-218 = parity template; registeredTools L33; getTools L88; registerToolExecutor L78.)
src/harnesses/
├── pi-harness.ts             # MODIFY — REFACTOR buildCustomTools (L668) → 1-line delegator; drop PERMISSIVE_PARAMS (L650); update call sites L256+L376.
└── pi-schema-converter.ts    # READ-ONLY (S1 DONE) — exports jsonSchemaToTypebox. DO NOT EDIT.
src/__tests__/unit/providers/
├── mcp-handler-pi-customtools.test.ts   # ← NEW — real-MCPHandler unit test for toPiCustomTools().
├── pi-harness-customtools.test.ts       # MODIFY — rewire to spy-based delegation tests.
└── pi-harness-registermcps.test.ts      # MODIFY — L156 buildCustomTools(noopExecutor) → buildCustomTools().
node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts  # READ-ONLY — ToolDefinition L335, defineTool L375, execute sig L361.
# (src/index.ts, package.json, pi-schema-converter.ts, toAgentSDKServer, the Zod converters — UNTOUCHED by S2.)
```

### Desired Codebase tree with files to be added/modified

```bash
src/core/mcp-handler.ts                                       # MODIFIED — +toPiCustomTools() +toAgentToolResult() +imports
src/harnesses/pi-harness.ts                                   # MODIFIED — buildCustomTools() delegator; placeholder removed
src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts   # NEW — toPiCustomTools unit tests
src/__tests__/unit/providers/pi-harness-customtools.test.ts    # MODIFIED — spy-based delegation tests
src/__tests__/unit/providers/pi-harness-registermcps.test.ts   # MODIFIED — drop executor arg at L156
```

### Known Gotchas of our codebase & Library Quirks

```ts
// CRITICAL #1 — toPiCustomTools MIRRORS toAgentSDKServer. Read mcp-handler.ts L165-218 FIRST and copy the
//   skeleton (empty-guard → Array.from(this.registeredTools.entries()).map(...) → wrap each → try/catch
//   executor → stringify). Only the wrapper (defineTool vs sdkTool) + schema (jsonSchemaToTypebox vs
//   jsonSchemaToZodRawShape) + return type (ToolDefinition[] vs McpServerConfig) differ. (Decision 1.)

// CRITICAL #2 — registered.executor(params) returns RAW unknown, NOT ToolExecutionResult. The superseded
//   buildCustomTools closure read result.content/result.isError (because it called the harness toolExecutor
//   which returns ToolExecutionResult). toPiCustomTools calls registered.executor (ToolExecutor =
//   (input)=>Promise<unknown>) → stringify the RAW value: typeof r === 'string' ? r : JSON.stringify(r).
//   Copy toAgentSDKServer L196-205 EXACTLY. Reading r.content yields "undefined" and breaks every test. (Decision 3.)

// CRITICAL #3 — toPiCustomTools is SYNC (: ToolDefinition[]). It CANNOT `await import`. So defineTool MUST
//   be a STATIC top-level import in mcp-handler.ts. This is fine: mcp-handler.ts ALREADY statically imports
//   @anthropic-ai/claude-agent-sdk at L5-9 for the sync toAgentSDKServer. Type imports (ToolDefinition,
//   AgentToolResult, ExtensionContext) are `import type` (erased). (Decision 4.)

// CRITICAL #4 — buildCustomTools DROPS its toolExecutor param. Body → `return this.mcpHandler.toPiCustomTools();`.
//   DELETE the PERMISSIVE_PARAMS const (L650) + the entire inline defineTool closure (L652-700). UPDATE both
//   call sites (L256, L376) to `this.buildCustomTools()` (no arg). execute()'s toolExecutor param STAYS
//   (Harness interface) — it's just no longer threaded into buildCustomTools (Claude parity). (Decision 2.)

// CRITICAL #5 — ALL buildCustomTools(<arg>) call sites + tests MUST be updated. tsc ERRORS on "Expected 0
//   arguments, but got 1" if any remain. Grep-verified sites: pi-harness.ts L256+L376; customtools.test
//   L72/87/105/126/145/164; registermcps.test L156. Run `grep -rn "buildCustomTools(" src/` to re-confirm. (Decision 9.)

// CRITICAL #6 — The execute closure is the FULL 5-arg Pi signature: (toolCallId, params, signal, onUpdate,
//   ctx). Copy pi-harness.ts L660-667 verbatim (4 unused underscore-prefixed). params: unknown (widened).
//   ExtensionContext imported (type-only) so the 5th param type-checks. (Decision 7.)

// CRITICAL #7 — The NEW MCPHandler unit test MUST call registerToolExecutor(serverName, toolName, fn) for
//   each tool AFTER registerServer, because registered.executor for inprocess transport looks up
//   toolExecutors.get(fullName) (createToolExecutor L285-300). Without it, execute throws "No executor
//   registered for inprocess tool". (Decision 8.)

// GOTCHA #8 — isolatedModules: true (tsconfig.json). `import type { ToolDefinition, AgentToolResult,
//   ExtensionContext }` MUST be type-only (they're types). `import { defineTool }` is a value import.
//   `import { jsonSchemaToTypebox }` is a value import (it's a function). Keep them as separate statements
//   OR use inline `type` modifiers.

// GOTCHA #9 — npm run lint EXCLUDES src/__tests__ (tsconfig "exclude"). It type-checks mcp-handler.ts +
//   pi-harness.ts (proving the impl compiles + the new imports resolve + buildCustomTools signature change
//   propagates). Test type errors surface in `npm test` (vitest/esbuild). Run BOTH gates.

// GOTCHA #10 — AgentToolResult<TDetails>: details is generic. Use details: { isError: boolean }. The
//   existing buildCustomTools also put toolName in details — drop it (not load-bearing; no test asserts it).
//   terminate is OPTIONAL (undefined) — do not set it. (Decision 5.)

// GOTCHA #11 — DO NOT edit pi-schema-converter.ts (S1 is DONE). DO NOT edit toAgentSDKServer or the Zod
//   converters (the Claude path + parity reference). DO NOT edit package.json (Pi SDK + typebox are already
//   declared deps). DO NOT edit src/index.ts (public-export sweep is P3.M3.T1.S1). DO NOT change execute()'s
//   signature (Harness interface) — only its buildCustomTools call site.

// GOTCHA #12 — label === fullName (the namespaced serverName__toolName). registered.tool.name IS the
//   fullName (registerServer stores {...tool, name: fullName}). Do NOT use the un-namespaced tool name.
//   (Decision 10.)

// GOTCHA #13 — Return [] (not null) when getTools() is empty (parity with buildCustomTools's existing
//   "return [] when no tools" behavior + the contract). toAgentSDKServer returns null for empty; toPiCustomTools
//   returns [] — the return TYPES differ (McpServerConfig|null vs ToolDefinition[]). (Decision 10.)

// GOTCHA #14 — defineTool is an IDENTITY function at runtime ((tool)=>tool). So defineTool({...}) returns the
//   object as-is; no runtime side effect. createAgentSession accepts the resulting ToolDefinition[] (proven
//   by the existing buildCustomTools + pi-harness-execute/streaming tests). (Research §6.)
```

---

## Implementation Blueprint

### Data models and structure

NO new data models. S2 consumes: `RegisteredTool` (`{tool, executor, serverName}` — mcp-handler.ts L20-25),
`Tool['input_schema']` (sdk-primitives.ts), `ToolDefinition`/`AgentToolResult` (Pi SDK), and S1's
`TSchema` (via `jsonSchemaToTypebox`). The `toAgentToolResult` helper is a pure mapper (no state).

### Implementation Tasks (ordered by dependencies)

```yaml
Task 0: PRE-FLIGHT (verify inputs; confirm S1 + baseline green)
  - RUN: `git status --short` — note baseline.
  - RUN: `grep -n "export function jsonSchemaToTypebox" src/harnesses/pi-schema-converter.ts` → 1 hit (S1 DONE).
  - RUN: `grep -nE "toAgentSDKServer|registeredTools|getTools\(\)|registerToolExecutor" src/core/mcp-handler.ts`
        → confirm the parity template (L165) + Map (L33) + getTools (L88) + registerToolExecutor (L78).
  - RUN: `grep -nE "buildCustomTools|PERMISSIVE_PARAMS|import \{ defineTool" src/harnesses/pi-harness.ts`
        → confirm L2 (import), L256+L376 (call sites), L650 (placeholder), L668 (def).
  - RUN: `grep -rn "buildCustomTools(" src/__tests__/` → enumerate ALL test call sites (Decision 9).
  - RUN (baseline): `npm run lint && npm test` — confirm GREEN before editing.

Task 1: MODIFY src/core/mcp-handler.ts — ADD imports (top of file, after the existing claude-agent-sdk import block)
  - ADD: `import { defineTool } from "@earendil-works/pi-coding-agent";`
  - ADD: `import type { ToolDefinition, AgentToolResult, ExtensionContext } from "@earendil-works/pi-coding-agent";`
  - ADD: `import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";`
  - VERIFY: `npm run lint` still green (imports resolve; isolatedModules-safe — type-only for the 3 types).

Task 2: MODIFY src/core/mcp-handler.ts — ADD toPiCustomTools() + toAgentToolResult()
  - PLACE: immediately AFTER toAgentSDKServer() (keeps the two bridges adjacent — thematic grouping).
  - ADD public method:
        public toPiCustomTools(): ToolDefinition[] {
          const tools = this.getTools();
          if (tools.length === 0) return [];                          // mirror toAgentSDKServer L172-175
          return Array.from(this.registeredTools.entries()).map(([fullName, registered]) => {
            return defineTool({
              name: fullName,                                          // serverName__toolName
              label: fullName,                                         // UI label (Decision 10)
              description: registered.tool.description,
              parameters: jsonSchemaToTypebox(registered.tool.input_schema),  // S1 converter (REAL schema)
              execute: async (
                _toolCallId: string,
                params: unknown,
                _signal: AbortSignal | undefined,
                _onUpdate: undefined,
                _ctx: ExtensionContext,
              ): Promise<AgentToolResult<{ isError: boolean }>> => {
                try {
                  const result = await registered.executor(params);   // RAW unknown (Decision 3)
                  return this.toAgentToolResult(result, false);
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error);
                  return this.toAgentToolResult(`Error: ${message}`, true);   // never re-throw
                }
              },
            });
          });
        }
  - ADD private helper (place right after toPiCustomTools):
        private toAgentToolResult(
          result: unknown,
          isError: boolean,
        ): AgentToolResult<{ isError: boolean }> {
          const text = typeof result === "string" ? result : JSON.stringify(result);
          return {
            content: [{ type: "text" as const, text }],
            details: { isError },
          };
        }
  - ADD JSDoc on toPiCustomTools: cite PRD §7.10/§7.12/§7.14.1; state "PARALLEL of toAgentSDKServer()
        (Claude) — iterates registeredTools, wraps each in a Pi ToolDefinition via defineTool, delegates
        execute to registered.executor"; note "parameters via jsonSchemaToTypebox (S1)"; note "returns []
        when empty"; note "registered.executor returns RAW output — stringified via toAgentToolResult".
  - VERIFY (grep): `grep -nE "toPiCustomTools|toAgentToolResult|defineTool\(|jsonSchemaToTypebox\(|registered\.executor\(params\)" src/core/mcp-handler.ts` → all present.
  - VERIFY (lint): `npm run lint` → 0 errors.

Task 3: MODIFY src/harnesses/pi-harness.ts — REFACTOR buildCustomTools + call sites
  - REPLACE the buildCustomTools method (L648-700) with:
        private buildCustomTools(): ToolDefinition[] {
          return this.mcpHandler.toPiCustomTools();
        }
  - DELETE the `PERMISSIVE_PARAMS` const (L650) + the inline `this.mcpHandler.getTools().map((tool) =>
        defineTool({...}))` closure (now in toPiCustomTools).
  - UPDATE the buildCustomTools JSDoc: state it delegates to MCPHandler.toPiCustomTools() (P2.M4.T1.S2);
        remove the placeholder/P2.M4.T1.S1-pending language.
  - UPDATE L256 (execute non-streaming): `customTools: this.buildCustomTools(),` (drop toolExecutor arg).
  - UPDATE L376 (executeStreaming): `customTools: this.buildCustomTools(),` (drop toolExecutor arg).
  - NOTE: the top-level `import { defineTool }` + `import type { ToolDefinition, AgentToolResult,
        ExtensionContext }` in pi-harness.ts may now be UNUSED (defineTool/AgentToolResult/ExtensionContext
        moved to mcp-handler.ts; ToolDefinition still used as the buildCustomTools return type). If tsc/esbuild
        flags unused imports, REMOVE `defineTool`, `AgentToolResult`, `ExtensionContext` from pi-harness.ts
        imports (KEEP `ToolDefinition` — it's the return type). Run lint to confirm.
  - VERIFY (grep): `grep -n "PERMISSIVE_PARAMS" src/harnesses/pi-harness.ts` → NO hits (deleted).
  - VERIFY (grep): `grep -n "buildCustomTools(" src/harnesses/pi-harness.ts` → def + 2 call sites, ALL
        with NO arguments (no `(toolExecutor)`).
  - VERIFY (lint): `npm run lint` → 0 errors (proves buildCustomTools signature change propagated; no
        orphan buildCustomTools(<arg>) call — tsc would error).

Task 4: CREATE src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts (real-MCPHandler unit test)
  - IMPORTS: `import { describe, it, expect } from 'vitest';` + `import { MCPHandler } from
        '../../../core/mcp-handler.js';` + `import { TypeGuard } from '@sinclair/typebox';` + `import type
        { Tool, MCPServer } from '../../../types/sdk-primitives.js';`.
  - HELPERS: createTestTool(name, description, input_schema?) → Tool; createTestServer(name, tools) → MCPServer.
  - FIXTURE: a tool with a NON-trivial input_schema (e.g. {type:'object', properties:{msg:{type:'string'},
        count:{type:'integer'}}, required:['msg']}) so the parameters assertion is meaningful (proves the
        placeholder is gone).
  - STRUCTURE: `describe('MCPHandler.toPiCustomTools()', () => { ... })`.
  - CASES:
      empty: `new MCPHandler().toPiCustomTools()` → [] (toHaveLength(0)).
      shape: register a server with 1 tool → toPiCustomTools() → toHaveLength(1); [0].name === 'srv__echo';
        [0].label === 'srv__echo'; [0].description === '<desc>'; typeof [0].execute === 'function'.
      REAL parameters (not placeholder): assert TypeGuard.TObject(tools[0].parameters) === true AND
        TypeGuard.TString(tools[0].parameters.properties.msg) === true (proves jsonSchemaToTypebox ran — the
        placeholder Type.Object({}, {additionalProperties:true}) has NO .properties.msg).
      execute success (string): registerToolExecutor('srv','echo', async (input) => `echo:${JSON.stringify(input)}`);
        const r = await tools[0].execute('c', {msg:'hi'}, undefined, undefined, {} as any);
        expect(r.content[0]).toEqual({type:'text', text:'echo:{"msg":"hi"}'}); expect(r.details.isError).toBe(false).
      execute success (object): executor returns {a:1} → r.content[0].text === '{"a":1}'.
      execute error (isError, no throw): executor throws new Error('boom') → r.content[0].text matches
        /boom|Error/i; r.details.isError === true; (the await does NOT reject — toAgentToolResult catches).
      parity with getTools(): register 2 servers (3 tools) → toPiCustomTools().length === getTools().length;
        names match (sorted compare).
  - PLACEMENT: src/__tests__/unit/providers/ (mirrors the harness-bridge test convention).

Task 5: MODIFY src/__tests__/unit/providers/pi-harness-customtools.test.ts (rewire to spy-based delegation)
  - RATIONALE: buildCustomTools() is now a 1-line delegator; the real logic is tested in Task 4. This file
        tests ONLY the delegation seam + the execute() customTools wiring.
  - REPLACE the 6 `buildCustomTools(<executor>)`-based `it` blocks with spy-based ones:
      shape/delegation: `const fake = [{name:'srv__echo', label:'srv__echo', description:'d', parameters:{},
        execute: async () => ({content:[], details:{isError:false}})}];`
        `vi.spyOn((harness as any).mcpHandler, 'toPiCustomTools').mockReturnValue(fake);`
        `const tools = (harness as any).buildCustomTools();`
        `expect(tools).toBe(fake);` (same reference — pure delegation) `expect(tools).toHaveLength(1);`.
      empty delegation: spy returns [] → buildCustomTools() → toHaveLength(0).
  - KEEP (lightly update) the execute-integration `it`: register a server so mcpHandler has a tool, then
        `vi.spyOn((harness as any).mcpHandler, 'toPiCustomTools').mockReturnValue([fakeToolDef])`, monkey-patch
        createAgentSession to capture opts, call execute(), assert capturedOpts.customTools === the faked array.
        (Removes the dependency on a real executor — the spy replaces toPiCustomTools entirely.)
  - REMOVE the now-irrelevant executor-delegation assertions (executor-called-with, isError, non-string,
        rejection) — those scenarios are covered by Task 4's real-MCPHandler test.
  - VERIFY: `npx vitest run src/__tests__/unit/providers/pi-harness-customtools.test.ts` → all pass.

Task 6: MODIFY src/__tests__/unit/providers/pi-harness-registermcps.test.ts (L156)
  - CHANGE: `const customTools = harness.buildCustomTools(noopExecutor);` →
        `// @ts-expect-error - Testing private method\n      const customTools = harness.buildCustomTools();`
  - The existing assertions (toHaveLength(1), [0].name === 'fs__read', typeof execute === 'function') STILL
        HOLD (registerMCPs populated the harness mcpHandler; toPiCustomTools reads it). Keep them.
  - If `noopExecutor` is now unused in that `it`, leave it (harmless) or remove it.
  - VERIFY: `npx vitest run src/__tests__/unit/providers/pi-harness-registermcps.test.ts` → passes.

Task 7: VALIDATE (the load-bearing step — see Validation Loop)
  - RUN all gates: lint, targeted tests, full suite, build, grep contract, runtime spot-check.
  - VERIFY pi-harness-streaming.test.ts (L401) still passes (customTools is an array — buildCustomTools()
        returns [] when no tools registered; the test registers tools or mocks — confirm green).
```

### Implementation Patterns & Key Details

```ts
// === mcp-handler.ts — the new bridge (mirror toAgentSDKServer) ===
import { defineTool } from "@earendil-works/pi-coding-agent";
import type { ToolDefinition, AgentToolResult, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { jsonSchemaToTypebox } from "../harnesses/pi-schema-converter.js";

// ... inside class MCPHandler, immediately after toAgentSDKServer() ...

/**
 * Convert registered tools to Pi `ToolDefinition[]` (PRD §7.10, §7.12, §7.14.1).
 * PARALLEL of {@link toAgentSDKServer} (Claude): iterates `registeredTools`, wraps each in a Pi
 * ToolDefinition via `defineTool`, and delegates `execute` to `registered.executor`. `parameters`
 * is the REAL TypeBox schema from `jsonSchemaToTypebox` (S1). Returns `[]` when no tools registered.
 *
 * `registered.executor` returns the RAW executor output (unknown) — stringified via
 * {@link toAgentToolResult} (mirrors toAgentSDKServer's handler). Errors are caught → isError:true
 * (never re-thrown), matching Claude-path semantics.
 */
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
          const result = await registered.executor(params); // RAW unknown — NOT ToolExecutionResult
          return this.toAgentToolResult(result, false);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return this.toAgentToolResult(`Error: ${message}`, true);
        }
      },
    }),
  );
}

/** Map a raw executor result (unknown) to a Pi `AgentToolResult` (stringify non-strings). */
private toAgentToolResult(
  result: unknown,
  isError: boolean,
): AgentToolResult<{ isError: boolean }> {
  const text = typeof result === "string" ? result : JSON.stringify(result);
  return { content: [{ type: "text" as const, text }], details: { isError } };
}

// === pi-harness.ts — the refactored delegator ===
private buildCustomTools(): ToolDefinition[] {
  return this.mcpHandler.toPiCustomTools(); // P2.M4.T1.S2 — schema-faithful Pi tool bridge
}
// call sites (execute L256 + executeStreaming L376):
//   customTools: this.buildCustomTools(),   // (was: this.buildCustomTools(toolExecutor))

// === TEST: real-MCPHandler unit test (mcp-handler-pi-customtools.test.ts) ===
import { TypeGuard } from "@sinclair/typebox";

const handler = new MCPHandler();
handler.registerServer({ name: "srv", transport: "inprocess", tools: [{
  name: "echo", description: "echoes",
  input_schema: { type: "object", properties: { msg: { type: "string" } }, required: ["msg"] },
}]});
handler.registerToolExecutor("srv", "echo", async (input) => `echo:${JSON.stringify(input)}`); // REQUIRED for inprocess

const tools = handler.toPiCustomTools();
expect(tools).toHaveLength(1);
expect(tools[0].name).toBe("srv__echo");
expect(TypeGuard.TObject(tools[0].parameters)).toBe(true);                       // REAL schema
expect(TypeGuard.TString((tools[0].parameters as any).properties.msg)).toBe(true); // NOT the placeholder
const r = await tools[0].execute("c", { msg: "hi" }, undefined, undefined, {} as any);
expect(r.content[0]).toEqual({ type: "text", text: 'echo:{"msg":"hi"}' });
expect(r.details.isError).toBe(false);

// === TEST: spy-based PiHarness delegation (pi-harness-customtools.test.ts) ===
const fake = [{ name: "srv__echo", label: "srv__echo", description: "d", parameters: {},
  execute: async () => ({ content: [{ type: "text" as const, text: "x" }], details: { isError: false } }) }];
vi.spyOn((harness as any).mcpHandler, "toPiCustomTools").mockReturnValue(fake);
const tools = (harness as any).buildCustomTools(); // no arg
expect(tools).toBe(fake); // pure delegation — same reference
```

### Integration Points

```yaml
NO NEW INTEGRATION SURFACES. S2 wires an existing seam (PiHarness.buildCustomTools → MCPHandler) and
consumes S1's converter. Specifically:
  - DATABASE: none.
  - CONFIG: none (no new env vars).
  - ROUTES: none.
  - PUBLIC API (src/index.ts): NOT modified (MCPHandler is already exported; toPiCustomTools is a public
    method on it. P3.M3.T1.S1 owns any public-export sweep — NOT S2).
  - PI-SCHEMA-CONVERTER: NOT modified (S1 DONE — consumed via import).
  - TOAGENTSDKSERVER / Zod converters: NOT modified (the Claude path + parity reference).
  - PACKAGE.JSON: NOT modified (Pi SDK + @sinclair/typebox already declared deps).
  - HARNESS INTERFACE (execute signature): NOT modified — toolExecutor stays a param; only the
    buildCustomTools call site drops it (Claude parity).

CONSUMED BY:
  - PiHarness.execute() (non-streaming L256) + executeStreaming() (L376) — both call buildCustomTools()
    → mcpHandler.toPiCustomTools() → createAgentSession({customTools}).
  - P4.M2.T1.S1 (parity tests) — will compare toAgentSDKServer vs toPiCustomTools directly.
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after Tasks 1-3 (mcp-handler.ts + pi-harness.ts edits) — fix before proceeding
npm run lint          # = tsc --noEmit on src/ (EXCLUDES src/__tests__).
                      # Proves: the 3 new imports resolve; toPiCustomTools + toAgentToolResult type-check;
                      # buildCustomTools()'s new signature propagated to BOTH call sites (no orphan <arg>
                      # call — tsc would error "Expected 0 arguments, but got 1"); unused-import cleanup
                      # (defineTool/AgentToolResult/ExtensionContext may now be unused in pi-harness.ts).

# Expected: Zero errors. If errors: see GOTCHA #8 (type-only imports), Decision 4 (defineTool static
# import), Task 3 NOTE (remove now-unused pi-harness imports). READ the output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# The NEW MCPHandler unit test (real handler; the core of S2)
npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts

# The REWIRED PiHarness delegation tests
npx vitest run src/__tests__/unit/providers/pi-harness-customtools.test.ts
npx vitest run src/__tests__/unit/providers/pi-harness-registermcps.test.ts

# The streaming test (verify the customTools-passthrough still works — no edit expected)
npx vitest run src/__tests__/unit/providers/pi-harness-streaming.test.ts

# Expected: ALL pass. If mcp-handler test fails on "No executor registered for inprocess tool" → you forgot
# registerToolExecutor (Decision 8 / CRITICAL #7). If it fails on parameters assertion → you used the
# placeholder instead of jsonSchemaToTypebox (Decision 1). If pi-harness-customtools fails → the spy isn't
# wired (Decision 8). If registermcps/streaming fail on buildCustomTools → an arg remains (Decision 9).
```

### Level 3: Integration Testing (System Validation)

```bash
# Full regression suite — S2 refactors a seam; the suite MUST stay green.
npm test

# Build — emits toPiCustomTools + toAgentToolResult in dist/core/mcp-handler.{js,d.ts} + the refactored
# buildCustomTools in dist/harnesses/pi-harness.js.
npm run build
grep -n "toPiCustomTools\|toAgentToolResult" dist/core/mcp-handler.d.ts   # confirm emit
grep -n "PERMISSIVE_PARAMS" dist/harnesses/pi-harness.js && echo "FAIL: placeholder leaked" || echo "OK: placeholder gone"

# Expected: full suite green (no regressions); dist emits the new method + the refactored delegator.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# PARITY SMOKE — structural mirror of toAgentSDKServer: both iterate registeredTools, both use
# registered.executor, both stringify, both empty-return. Inline via vitest:
npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts -t "parity with getTools"

# SCHEMA-FIDELITY SMOKE — the placeholder is GONE; a registered tool's parameters is a REAL TypeBox schema:
npx vitest run src/__tests__/unit/providers/mcp-handler-pi-customtools.test.ts -t "REAL parameters"

# GREP CONTRACT — verify every load-bearing symbol is present + the placeholder is gone + no orphan args:
grep -nE "toPiCustomTools|toAgentToolResult|defineTool\(|jsonSchemaToTypebox\(|registered\.executor\(params\)" src/core/mcp-handler.ts
grep -nE "this\.buildCustomTools\(\)" src/harnesses/pi-harness.ts                  # 2 hits (L256+L376), NO args
! grep -n "PERMISSIVE_PARAMS" src/harnesses/pi-harness.ts                          # exit 1 = pass (deleted)
! grep -rnE "buildCustomTools\([a-zA-Z]" src/                                       # exit 1 = pass (no orphan arg calls)
git diff --name-only   # mcp-handler.ts + pi-harness.ts + 3 test files (1 NEW, 2 MODIFIED) + registermcps test

# Expected: all grep hits present; PERMISSIVE_PARAMS gone; NO buildCustomTools(<arg>) anywhere; diff is
# exactly the 5 files in the Desired Codebase tree.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` exits 0 (imports resolve; toPiCustomTools/toAgentToolResult type-check; buildCustomTools
      signature change propagated to both call sites; unused-imports cleaned).
- [ ] `npm test` exits 0 (new MCPHandler test + rewired PiHarness tests + full regression green).
- [ ] `npm run build` exits 0 (dist emits toPiCustomTools + toAgentToolResult; placeholder gone from dist).
- [ ] `grep -rn "PERMISSIVE_PARAMS" src/` → no hits.
- [ ] `grep -rnE "buildCustomTools\([a-zA-Z]" src/` → no hits (no orphan arg calls).
- [ ] `git diff --name-only` lists ONLY: mcp-handler.ts, pi-harness.ts, mcp-handler-pi-customtools.test.ts
      (NEW), pi-harness-customtools.test.ts, pi-harness-registermcps.test.ts.

### Feature Validation

- [ ] `toPiCustomTools()` returns `[]` when no tools registered; returns one `ToolDefinition` per registered
      tool otherwise (parity with `getTools()` count + names).
- [ ] Each `ToolDefinition.parameters` is a REAL TypeBox schema from `jsonSchemaToTypebox` (NOT the
      placeholder) — `TypeGuard.TObject` + a real `.properties.<key>` of the right type.
- [ ] `execute` delegates to `registered.executor(params)` and returns `AgentToolResult` with
      `details.isError === false` on success; `=== true` + `/Error/i` text on executor throw (no re-throw).
- [ ] The raw executor result is stringified directly (string → as-is; else `JSON.stringify`) — NOT read
      as `{content, isError}`.
- [ ] `buildCustomTools()` takes NO args and returns `this.mcpHandler.toPiCustomTools()` verbatim.
- [ ] `execute()` + `executeStreaming()` both pass `customTools: this.buildCustomTools()` into
      `createAgentSession`.

### Code Quality Validation

- [ ] `toPiCustomTools` is placed adjacent to `toAgentSDKServer` (thematic grouping; the two bridges).
- [ ] Mirrors `toAgentSDKServer`'s structure (empty-guard → iterate registeredTools → wrap → try/catch →
      stringify) — diff against it to confirm parity.
- [ ] JSDoc cites PRD §7.10/§7.12/§7.14.1 + notes it parallels `toAgentSDKServer` + the raw-result caveat.
- [ ] Anti-patterns avoided (no reading `r.content`; no re-throwing in execute; no placeholder schema;
      no harness-toolExecutor threading; no orphan `buildCustomTools(<arg>)`).
- [ ] Unused imports removed from pi-harness.ts (defineTool/AgentToolResult/ExtensionContext if no longer
      referenced there; KEEP ToolDefinition as the return type).

### Documentation & Deployment

- [ ] Code is self-documenting (clear method/param names; JSDoc on toPiCustomTools + toAgentToolResult).
- [ ] The raw-result-vs-ToolExecutionResult distinction is documented in JSDoc (non-obvious; the #1 pitfall).
- [ ] No new env vars. No new dependencies. No public-API changes (toPiCustomTools is a new public method on
      an already-exported class).

---

## Anti-Patterns to Avoid

- ❌ Don't read `result.content`/`result.isError` in `toAgentToolResult` — `registered.executor` returns RAW
  `unknown`, NOT a `ToolExecutionResult`. Stringify the value directly (mirror toAgentSDKServer L196-205).
- ❌ Don't re-throw inside `execute` — catch the executor error and return `isError:true` text (parity with
  toAgentSDKServer; Pi must not crash the turn on a tool error).
- ❌ Don't keep the `PERMISSIVE_PARAMS` placeholder — S2's whole point is replacing it with
  `jsonSchemaToTypebox(tool.input_schema)`.
- ❌ Don't leave any `buildCustomTools(<arg>)` call — `tsc` errors and the lint gate fails. Update ALL sites.
- ❌ Don't thread the harness `toolExecutor` into `buildCustomTools` — `toPiCustomTools` uses
  `registered.executor` (Claude parity). The `toolExecutor` param stays in `execute()`'s signature only.
- ❌ Don't make `toPiCustomTools` async / `Promise<ToolDefinition[]>` — it mirrors sync
  `toAgentSDKServer()`; the contract types it `: ToolDefinition[]`. (And sync can't lazy-import defineTool.)
- ❌ Don't use the un-namespaced tool name for `name`/`label` — use `fullName` (`serverName__toolName`);
  `registered.tool.name` IS the fullName.
- ❌ Don't return `null` for empty — return `[]` (the contract + the existing buildCustomTools behavior).
- ❌ Don't edit `pi-schema-converter.ts` (S1 DONE), `toAgentSDKServer`/Zod converters (Claude path),
  `package.json`, `src/index.ts`, or `execute()`'s signature.
- ❌ Don't forget `registerToolExecutor` in the MCPHandler unit test — inprocess `registered.executor` looks
  up `toolExecutors.get(fullName)`; without it, execute throws "No executor registered".

---

## Confidence Score

**9/10** — One-pass success is highly likely because: (a) the work is a SMALL, well-scoped refactor (one new
method + helper on MCPHandler + a 1-line delegator + test rewires); (b) the PARITY TEMPLATE
(`toAgentSDKServer`) is in-repo and explicitly mirrored structure-for-structure; (c) S1 (the converter) is
ALREADY DONE with a confirmed signature, so the `parameters` mapping is a known-good call; (d) the
non-obvious pitfall (raw-result stringification vs ToolExecutionResult) is documented with the exact
toAgentSDKServer lines to copy; (e) all `buildCustomTools` call sites + tests are grep-enumerated with
exact line numbers; (f) the test strategy (real-MCPHandler unit test + spy-based PiHarness delegation) is
spelled out with copy-paste snippets. The 1-point residual risk: unused-import fallout in pi-harness.ts
after moving defineTool/AgentToolResult/ExtensionContext to mcp-handler.ts (mitigated by Task 3 NOTE +
the lint gate catching it deterministically).

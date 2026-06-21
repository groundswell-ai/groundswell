# Bug Fix Requirements

## Overview

End-to-end validation of the **Harness System (PRD §7)** implementation delivered in
`plan/004_9a50e71828f4/tasks.json` (Phases P1–P4). The implementation is largely complete and
well-structured — the type system (`src/types/harnesses.ts`), model-spec parsing
(`src/utils/model-spec.ts`), cache-key isolation (`src/cache/cache-key.ts`), the dual-cascade
*utilities* (`src/utils/harness-config.ts`), the ClaudeCodeHarness anthropic-only constraint, and
the parity test suite are all solid and verified passing.

However, **two integration-level bugs** break the documented primary user journeys end-to-end:

1. **CRITICAL** — The new public API `configureHarnesses()` (PRD §7.6) is disconnected from the
   `Agent`. The Agent still resolves the harness from a *legacy* singleton that defaults to
   `'anthropic'`, while the registry only contains `'pi'` / `'claude-code'`. Constructing an
   Agent that relies on the global default (the exact pattern documented in the PRD, the docs,
   and the shipped example `02-harness-configuration.ts`) throws **"Harness 'anthropic' is not
   registered"**. The official example crashes on launch.

2. **MAJOR** — `PiHarness` (the *default* harness) never invokes the `toolExecutor` callback
   passed to `execute()` (PRD §7.10). Tools are discovered and executed exclusively through the
   harness's *own* internal `MCPHandler`, which the `Agent` never populates. As a result, any
   tool configured at the Agent level (`config.mcps`, `config.tools`, or `request.options.tools`)
   is invisible to and non-executable by PiHarness — directly violating PRD §7.10 and the
   P2.M3.T1.S1 implementation contract.

A few minor issues are also documented below. The pre-existing `npm test` failure
(`edge-case.test.ts` unicode) is noted for completeness but is **out of scope** for the harness
work.

`npm run lint` (tsc --noEmit) passes. `npm test`: 1 failure (pre-existing, unrelated — see Minor 4).

## Critical Issues (Must Fix)

### Issue 1: `configureHarnesses()` global default never reaches the `Agent` — default/no-harness Agent construction throws "Harness 'anthropic' is not registered"

**Severity**: Critical
**PRD Reference**: §7.6 (`configureHarnesses` / `GlobalHarnessConfig`), §7.7 (Configuration Cascade — "GlobalHarnessConfig.defaultHarness (highest priority for defaults)… first defined value wins"), §7.13 (usage examples)
**Also violates**: `docs/harnesses.md` lines 222, 247, 379, 493 (which explicitly promise the harness "may be omitted" / "inherits from global"), and the shipped example `examples/harnesses/02-harness-configuration.ts`.

**Expected Behavior**: Per PRD §7.7, the harness cascade root is `GlobalHarnessConfig.defaultHarness` (set via the public `configureHarnesses()`). When an `Agent` is constructed without an explicit `harness` field, it should resolve to that global default (`'pi'`). PRD §7.6's documented example —
```ts
configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic', ... });
```
followed by `new Agent({ model })` — must work. The docs even state: "When `configureHarnesses()` is never called, the default is `{ defaultHarness: 'pi' }`."

**Actual Behavior**: `src/core/agent.ts` resolves the harness from the **legacy** singleton in three places — the constructor (lines 117–118), `stream()` (lines 372–373), and `executePrompt()` (lines 616–617):
```ts
const globalConfig = getGlobalProviderConfig();          // LEGACY singleton — default 'anthropic'
const resolved = resolveProviderConfig(globalConfig, this.harnessId, this.harnessOptions, ...);
```
`configureHarnesses()` writes to the **new** singleton (`globalHarnessConfig` in `src/utils/harness-config.ts`), which the Agent **never reads for harness resolution**. The legacy singleton (`globalProviderConfig`) defaults to `{ defaultProvider: 'anthropic' }`. Since the registry is now keyed by `'pi'` / `'claude-code'` (PRD §7.2; `register-defaults.ts`), `registry.get('anthropic')` returns `undefined` and the constructor throws at `src/core/agent.ts:131`:
```
Harness 'anthropic' is not registered
```

The harness utilities themselves are correct — `getGlobalHarnessConfig()` defaults to `'pi'` and `resolveHarnessConfig()` implements the cascade properly. The bug is purely that the **Agent calls the wrong functions**. (The deprecated shim `src/utils/provider-config.ts` even documents that it should be "Removed when P3.M1 rewires agent.ts" — but P3.M1 is marked Complete while agent.ts still imports the legacy functions at line 45.)

**Steps to Reproduce** (verified):

1. *Via the shipped example* — crashes on launch:
   ```
   ANTHROPIC_API_KEY=sk-dummy npx tsx examples/harnesses/02-harness-configuration.ts
   # Error: Harness 'anthropic' is not registered
   #     at new Agent (src/core/agent.ts:131:13)
   #     at .../examples/harnesses/02-harness-configuration.ts:121:20
   ```
   Example 02 calls `configureHarnesses({ defaultHarness: 'pi', ... })` then constructs
   `new Agent({ name: 'DefaultAgent' })` with **no** harness (line 121), expecting the global
   `'pi'` default — and crashes immediately.

2. *Minimal reproduction*:
   ```ts
   import { configureHarnesses, Agent, HarnessRegistry } from './src/index.js';
   import { registerDefaultHarnesses } from './src/harnesses/register-defaults.js';
   registerDefaultHarnesses();                                   // registers 'pi' + 'claude-code'
   configureHarnesses({ defaultHarness: 'pi', defaultModelProvider: 'anthropic' }); // NEW public API
   new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });   // THROWS — should default to 'pi'
   ```
   Confirmed across four scenarios:
   | Scenario | Result |
   |----------|--------|
   | `configureHarnesses({defaultHarness:'pi'})` + Agent **without** harness | ❌ FAILS: "Harness 'anthropic' is not registered" |
   | `configureHarnesses(...)` + Agent **with** explicit `harness:'pi'` | ✅ works (cascade never reaches global) |
   | Legacy `configureProviders({defaultProvider:'pi'})` + Agent without harness | ✅ works (writes the legacy singleton the Agent reads) |
   | **Nothing configured** + Agent without harness | ❌ FAILS: "Harness 'anthropic' is not registered" |

   The last row is the most damaging: the most basic possible usage (`new Agent({ model })`,
   with no global config and no explicit harness) fails, because the Agent's legacy default is
   `'anthropic'` and nothing registers an `'anthropic'` harness anymore.

**Suggested Fix**: In `src/core/agent.ts`, replace the legacy harness resolution with the new
cascade utilities in **all three** call sites (constructor, `stream()`, `executePrompt()`):
```ts
import { getGlobalHarnessConfig, resolveHarnessConfig } from '../utils/harness-config.js';
...
const globalConfig = getGlobalHarnessConfig();
const { harness: effectiveHarness, options: resolvedHarnessOptions } =
  resolveHarnessConfig(globalConfig, this.harnessId, this.harnessOptions /*, promptHarness, promptHarnessOptions */);
```
`resolveHarnessConfig` is already a pure function that performs no id validation and returns
`{ harness, options }`, so this is a near drop-in swap. (The `defaultModelProvider` read at
line 665 already uses `getGlobalHarnessConfig()`, so model-provider resolution is fine — only the
*harness* axis reads the wrong singleton.) After the fix, add a regression test that constructs
an Agent without an explicit harness after `configureHarnesses({ defaultHarness: 'pi' })` and
asserts `agent` resolves to the `pi` harness — none of the existing parity tests cover this
default-resolution path (they all pass `harness:` explicitly), which is why the bug slipped
through.

## Major Issues (Should Fix)

### Issue 2: `PiHarness` ignores the `toolExecutor` callback — Agent-configured tools are invisible and non-executable (PRD §7.10 violation)

**Severity**: Major
**PRD Reference**: §7.10 ("When Pi emits a `tool_call`, the adapter invokes `toolExecutor` and returns the `ToolExecutionResult`"), §7.12 (MCP via MCPHandler), §7.14.1 (tool-execution parity). Also violates the P2.M3.T1.S1 contract: *"build customTools from `this.mcpHandler.toPiCustomTools()` **but wire each tool's `execute()` to invoke the provided `toolExecutor`**"*.

**Expected Behavior**: Per PRD §7.10, when Pi emits a tool call, `PiHarness.execute()` must invoke the `toolExecutor` callback it receives (which, in the Agent-driven path, is `Agent.toolExecutor` — the bridge to the Agent's `MCPHandler`). Tools the user configures on the `Agent` (`config.mcps`, `config.tools`, or per-prompt `request.options.tools`) must be discoverable and executable.

**Actual Behavior**: In `src/harnesses/pi-harness.ts`:
- `buildCustomTools()` (lines 659–660) is `return this.mcpHandler.toPiCustomTools();` — it builds Pi `ToolDefinition[]` from the **harness's own** `MCPHandler`, whose `execute` delegates to that handler's `registered.executor` (`src/core/mcp-handler.ts` `toPiCustomTools`), **never** to the `toolExecutor` argument.
- The `toolExecutor` parameter of `execute()` (line 214) and `executeStreaming()` (line 350) is a **dead parameter** — it is only forwarded into `executeStreaming` and is never invoked anywhere in the execute body.
- `request.options.tools` (the tool metadata the Agent passes) is **never read** by `PiHarness`.

Because the `Agent` registers MCP servers on the **Agent's** own `MCPHandler` (constructor lines 140–152) and passes `this.toolExecutor` to `execute()` — but never calls `harness.registerMCPs()` — the PiHarness's internal `MCPHandler` stays empty. Result: Pi is handed `customTools: []`, so it can neither see nor call any Agent-configured tool, and the bridging `toolExecutor` is never used.

**Steps to Reproduce** (verified):
```ts
const pi = new PiHarness();
// (mock pi.sdk.createAgentSession to capture opts.customTools; mock pi.modelRegistry/authStorage)
await pi.registerMCPs([{ name:'srv', transport:'inprocess',
  tools:[{ name:'ping', description:'d', input_schema:{type:'object',properties:{x:{type:'string'}}} }] }]);

const agentToolExecutor = async (req) => { console.log('CALLED', req.name); return { content:`agent-${req.name}`, isError:false }; };
await pi.execute({ prompt:'hi', options:{} }, agentToolExecutor);

// customTools captured = [ { name:'srv__ping', execute: [Function] } ]
await capturedCustomTools[0].execute('tc1', { x:'val' }, undefined, undefined, {});
// => { content:[{text:"Error: No executor registered for inprocess tool 'srv__ping'..."}], details:{ isError:true } }
// and "[agentToolExecutor CALLED]" is NEVER printed.
```
The Pi tool's `execute()` raises "No executor registered" and the `toolExecutor` callback is
never invoked. (For the Agent-driven path the situation is worse: `capturedCustomTools` is `[]`
because the Agent never populates the harness's `MCPHandler`.)

The existing test `src/__tests__/unit/providers/pi-harness-customtools.test.ts` does **not** catch
this — it passes an `executor` arg but never asserts it is called (the fake tool's `execute`
ignores it), so PRD §7.10 is untested.

**Suggested Fix**: Make `buildCustomTools` accept (or capture) the per-call `toolExecutor` and
rebind each tool's `execute` to invoke it, as the contract required, e.g.:
```ts
private buildCustomTools(toolExecutor: (req)=>Promise<ToolExecutionResult>): ToolDefinition[] {
  return this.mcpHandler.getTools().map(t => defineTool({
    name: t.name, label: t.name, description: t.description,
    parameters: jsonSchemaToTypebox(t.input_schema),
    execute: async (id, params) => {
      const res = await toolExecutor({ name: t.name, input: params });
      return this.toAgentToolResultFromExecResult(res);   // {content, details:{isError}}
    },
  }));
}
```
Then thread `toolExecutor` into the `buildCustomTools()` calls in both `execute()` and
`executeStreaming()`. Add a test asserting that when the Pi session emits a tool call, the
`toolExecutor` callback is invoked with `{ name, input }` and its result is returned.

## Minor Issues (Nice to Fix)

### Issue 3: Streaming `metadata` event reports the **harness id** as `provider` (harness/provider conflation)

**Severity**: Minor
**PRD Reference**: §7.8 ("the harness is never part of the model string" / harness ⊥ provider), §7.14.4.

**Expected Behavior**: The `StreamEvent` `{ type:'metadata'; metadata:{ provider: string } }`
(`src/types/streaming.ts:41`) should report the **LLM provider** (e.g. `'anthropic'`, `'openai'`).

**Actual Behavior**: Both harnesses set `provider: this.id` (the *harness* id):
`src/harnesses/claude-code-harness.ts:702` and `src/harnesses/pi-harness.ts:380`. After the
rename, ClaudeCode now reports `'claude-code'` (previously `'anthropic'`, when `id` happened to
equal the provider) and Pi reports `'pi'` — neither is the LLM host. The two are consistent with
each other (so §7.14.4 shape-parity holds), but the value is semantically wrong.

**Steps to Reproduce**: Stream any prompt through either harness and inspect the first yielded
event; `metadata.provider` is `'pi'` / `'claude-code'` rather than the resolved
`modelSpec.provider`.

**Suggested Fix**: `provider: modelSpec.provider` (the parsed LLM host) in both adapters.

### Issue 4: `registerDefaultHarnesses()` not exported from the public barrel and never auto-invoked

**Severity**: Minor
**PRD Reference**: §7.6 / §7.1 (pi is the default). `docs/harnesses.md:572` notes it is "internal."

**Expected Behavior**: A convenient way to register both built-in harnesses, or auto-registration,
so users don't have to hand-register `PiHarness` + `ClaudeCodeHarness` on every startup.

**Actual Behavior**: `registerDefaultHarnesses` is exported only from `src/harnesses/index.ts`,
**not** from the public `src/index.ts`. It is never called automatically (the registry starts
empty). Every example manually calls `registry.register(new PiHarness())` +
`registry.register(new ClaudeCodeHarness())`. This compounds Issue 1: even after the cascade fix,
`new Agent({ model })` will fail unless the user has registered a `'pi'` harness somewhere.

**Suggested Fix**: Either export `registerDefaultHarnesses` from `src/index.ts` (and document it),
or auto-register the defaults lazily inside `HarnessRegistry.get()` / the Agent constructor.

### Issue 5: Pre-existing test failure — unicode in workflow names (OUT OF SCOPE for the harness work)

**Severity**: Minor (pre-existing, unrelated to PRD §7)
**PRD Reference**: PRD §3.1 / §14.2 (`Workflow` base class; the PRD places no character restriction on `name`).

**Expected Behavior**: `npm test` is green.

**Actual Behavior**: `src/__tests__/adversarial/edge-case.test.ts > "should handle unicode in workflow names"` fails because `src/core/workflow.ts:185` rejects unicode via `if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName))`. This security-validation guard (commit `1eb66c0`) predates the harness migration and is unrelated to PRD §7. It is noted only for completeness; it should **not** be bundled into a harness bugfix.

**Suggested Fix** (if addressed at all, separately): either relax the allowlist to permit unicode
letters, or update the test to reflect the intentional security restriction. Out of scope here.

## Testing Summary

- **Total tests performed**: ~25 ad-hoc end-to-end scenarios across the harness surface (cascade matrix × 4, model-spec parsing × 14, cache-key isolation × 4, PiHarness tool-execution wiring × 2, streaming-metadata inspection, example launches, public-API export audit) plus full `npm run lint` + `npm test`.
- **Passing**: model-spec parsing (incl. harness-qualified rejection), cache-key harness/provider isolation, ClaudeCode anthropic-only constraint, explicit-harness Agent construction, hook-ordering parity suite, type system, lint.
- **Failing**: default/no-harness Agent construction (Issue 1), PiHarness `toolExecutor` wiring (Issue 2), plus the pre-existing unicode test (Issue 5).
- **Areas with good coverage**: pure utilities (`model-spec`, `cache-key`, `harness-config`), ClaudeCode constraint, cross-harness shape/hook/cache parity via mocked SDKs, type definitions.
- **Areas needing more attention**: **integration of the new public API with the `Agent`** (the default-resolution cascade path had zero test coverage — root cause of Issue 1), and **PiHarness tool round-trip through the real `toolExecutor`** (Issue 2's contract was never asserted). A user who runs the shipped `02-harness-configuration.ts` example or follows the PRD §7.6 quickstart will hit Issue 1 immediately.

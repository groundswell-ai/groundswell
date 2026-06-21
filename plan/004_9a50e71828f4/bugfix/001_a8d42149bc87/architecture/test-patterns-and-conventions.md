# TEST PATTERNS AND CONVENTIONS

A scouting report on the harness system's test coverage, mocking idioms, and runner configuration. Downstream agents should mirror these conventions to land regression tests that pass CI.

---

## 1. Test files touching the harness system

Full list of `src/__tests__/**/*.test.ts` files that reference any of `harness`, `configureHarnesses`, `PiHarness`, `ClaudeCodeHarness`, `resolveHarnessConfig`, or `registerDefaultHarnesses` (53 files total, grouped by tier):

### Integration (`src/__tests__/integration/`)
1. `harness-parity.test.ts` — flagship parity suite (§7.14.1 / §7.14.4 / §7.14.6).
2. `harness-cache-hooks-parity.test.ts` — cache isolation + hook ordering parity (§7.14.3 / §7.14.5).
3. `provider-agent.test.ts` — legacy `provider:`-vocabulary tests (still call `new Agent({ provider: 'claude-code' })`).
4. `provider-switching.test.ts` — cascade priority + options merge (legacy vocabulary).

### Unit — Harness internals (`src/__tests__/unit/`)
5. `agent.test.ts` — `Agent` constructor + harness resolution (incl. the only default-resolution test, see §3).
6. `agent-prompt-harness-override.test.ts` — NEW `harness:` cascade through `Agent.prompt()`.
7. `agent-stream-harness-override.test.ts` — NEW `harness:` cascade through `Agent.stream()`.
8. `agent-prompt-provider-override.test.ts` — legacy `provider:` fallback regression for `prompt()`.
9. `agent-stream-provider-override.test.ts` — legacy `provider:` fallback regression for `stream()`.
10. `agent-cache-key-isolation.test.ts` — Agent-level cache key isolation by (harness, provider, model).
11. `agent-config-types.test.ts` — compile-time `AgentConfig` shape (harness/harnessOptions).
12. `prompt-overrides-types.test.ts` — compile-time `PromptOverrides` shape.
13. `harness-public-api.test.ts` — public-API exports of harness surface.
14. `harnesses-types.test.ts` — type-level harness contract.
15. `harnesses-config-types.test.ts` — type-level config contract.
16. `cache-key.test.ts` — §7.14.5 cache-key digest.

### Unit — Harness-config utility (`src/__tests__/unit/utils/`)
17. `harness-config.test.ts` — `configureHarnesses` / `getGlobalHarnessConfig` / `resolveHarnessConfig` + deprecated aliases + provider-config.js shim.
18. `model-spec.test.ts` — `parseModelSpec` harness-qualified model rejection.

### Unit — Providers registry (`src/__tests__/unit/providers/`)
19. `harness-registry.test.ts` — `HarnessRegistry`/`ProviderRegistry` singleton + lifecycle.
20. `register-defaults.test.ts` — `registerDefaultHarnesses()` registers `pi` + `claude-code`, defaultHarness = `'pi'`.
21. `provider-alias-shim.test.ts`
22. `provider-lifecycle.test.ts`
23. `session-store.test.ts` / `session-store-ttl.test.ts`

### Unit — PiHarness (`src/__tests__/unit/providers/pi-harness*.test.ts`)
24. `pi-harness.test.ts` — class structure, capabilities, registrability.
25. `pi-harness-execute.test.ts` — non-streaming execute (THE Pi SDK mock pattern source).
26. `pi-harness-streaming.test.ts`
27. `pi-harness-initialize.test.ts`
28. `pi-harness-resolvemodel.test.ts` / `pi-harness-normalizemodel.test.ts`
29. `pi-harness-registermcps.test.ts`
30. `pi-harness-customtools.test.ts` — `buildCustomTools()` delegation.
31. `pi-harness-hooks.test.ts`
32. `pi-harness-loadskills.test.ts`
33. `pi-schema-converter.test.ts`
34. `mcp-handler-pi-customtools.test.ts`

### Unit — ClaudeCodeHarness (`src/__tests__/unit/providers/claude-code-harness*.test.ts`)
35. `claude-code-harness.test.ts` — class structure.
36. `claude-code-harness-execute.test.ts` — non-streaming execute (THE Anthropic SDK mock pattern source).
37. `claude-code-harness-execute-config-error.test.ts`
38. `claude-code-harness-initialize.test.ts`
39. `claude-code-harness-sessionconfig.test.ts` / `claude-code-harness-sessionstore.test.ts` / `claude-code-harness-sessions.test.ts`
40. `claude-code-harness-hooks.test.ts`
41. `claude-code-harness-loadskills.test.ts`
42. `claude-code-harness-registermcps.test.ts`
43. `claude-code-harness-supports.test.ts`
44. `claude-code-harness-terminate.test.ts`
45. `claude-code-harness-normalizemodel.test.ts`

### Unit — agent-tool-executor
46. `agent-tool-executor.test.ts` — tool-execution delegation through MCPHandler.

### Other
47. `unit/workflow-validation.test.ts` — uses `new Agent({ provider: 'anthropic' })` for fixtures only.

---

## 2. Parity suite deep-dive

The parity contract lives in **two integration files**, both at `src/__tests__/integration/`:

### `harness-parity.test.ts` — THE flagship
Three `describe` blocks covering PRD §7.14.4 (AgentResponse shape), §7.14.1 (tool-exec shape), §7.14.6 (workflow-event types).

**File header (lines 1-19) explicitly documents the technique:**
> "Mocking technique: overwrite the private `sdk` field after real `initialize()` — NOT vi.mock. This is the proven pattern across all 26 existing harness unit tests."

**Both harnesses are constructed and initialized for REAL, then their private `sdk` field is overwritten:**
```ts
async function makeMockedHarnesses() {
  const pi = new PiHarness();
  await pi.initialize();              // REAL initialize() — no SDK calls yet
  const cc = new ClaudeCodeHarness();
  await cc.initialize();              // REAL initialize() — no SDK calls yet
  return { pi, cc };
}
```

**`beforeEach` registers both in the (reset) registry:**
```ts
beforeEach(async () => {
  HarnessRegistry._resetForTesting();
  HarnessRegistry.getInstance()._resetInitStateForTesting();
  vi.clearAllMocks();
  sharedToolExecutor.mockClear();
  ({ pi, cc } = await makeMockedHarnesses());
  HarnessRegistry.getInstance().register(pi);
  HarnessRegistry.getInstance().register(cc);
});
```

**SHAPE-parity assertion idiom (the rule, never value-equality):**
```ts
const piKeys = Object.keys(piRes.metadata).sort();
const ccKeys = Object.keys(ccRes.metadata).sort();
expect(piKeys).toEqual(ccKeys);
// ...
// agentId is the ONE sanctioned value divergence — NOT equal
expect(piRes.metadata.agentId).toBe('pi');
expect(ccRes.metadata.agentId).toBe('claude-code');
expect(piRes.metadata.agentId).not.toBe(ccRes.metadata.agentId);
```

### `harness-cache-hooks-parity.test.ts`
Same technique, two critical asymmetries documented in the file header (lines 17-30):
- PiHarness fires hooks end-to-end through `execute()` via scripted session events.
- ClaudeCodeHarness cannot fire hooks via mocked `query()` — the deterministic seam is `buildAgentSDKHooks()` + manually invoking the returned callbacks.

---

## 3. Default-resolution path — confirms PRD claim (with one nuance)

**Search command run:**
```bash
grep -rn "new Agent(" src/__tests__ --include='*.test.ts'
```

**Result:** The PRD's claim is **CONFIRMED, with one nuance.**

The ONLY test of `new Agent()` with no harness argument is in `src/__tests__/unit/agent.test.ts`, in the `describe('Agent harness resolution')` block (lines 105-141). But that test exercises the **LEGACY `provider` cascade**, not the new harness cascade:

```ts
// src/__tests__/unit/agent.test.ts:127-141
it('uses the configured global default harness', () => {
  // The constructor reads getGlobalProviderConfig() (legacy singleton, default 'anthropic').
  // Register the legacy default so new Agent() resolves without throwing.
  HarnessRegistry.getInstance().register(createMockHarness('anthropic' as HarnessId));
  const agent = new Agent(); // no throw — resolves 'anthropic' from legacy default
  expect(agent.name).toBe('Agent');
});

it('throws when the resolved harness is not registered', () => {
  // The constructor reads getGlobalProviderConfig() (legacy singleton, default 'anthropic').
  // No 'anthropic' stub registered → throw.
  expect(() => new Agent()).toThrow(/Harness 'anthropic' is not registered/);
});
```

**Why this matters for the bugfix:** the production `Agent` constructor in `src/core/agent.ts:117-119` resolves via the LEGACY singleton, not the new one:
```ts
// src/core/agent.ts:117-119  (still in legacy-bridge mode)
const globalConfig = getGlobalProviderConfig();           // LEGACY singleton
const resolved = resolveProviderConfig(                   // DELEGATES to resolveHarnessConfig
  globalConfig,
  this.harnessId,
  this.harnessOptions,
);
```
- `getGlobalProviderConfig()` defaults to `defaultProvider: 'anthropic'` (verified in `harness-config.test.ts:351-356`).
- `getGlobalHarnessConfig()` defaults to `defaultHarness: 'pi'` (verified in `harness-config.test.ts:181-184` and `register-defaults.test.ts:60-63`).

**Therefore:** NO existing test covers `new Agent()` resolving to `'pi'` (the PRD §7.7 default) via the new `configureHarnesses()` / `getGlobalHarnessConfig()` path. Downstream regression tests for the bugfix need to construct this scenario explicitly.

---

## 4. vitest configuration

**File: `vitest.config.ts` (whole file, 14 lines):**
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx', 'examples/__tests__/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for TypeScript files
    },
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
```

**Key facts:**
- Test glob: `src/__tests__/**/*.test.ts` (+ `.tsx` variants, + `examples/__tests__`). Files outside these globs are NOT collected.
- `globals: true` → `describe`, `it`, `expect`, `vi`, `beforeEach` etc. are globally available. Most files still `import { describe, it, expect, vi } from 'vitest';` for clarity — DO that.
- NO setup file (`setupFiles` is absent). NO global mocks. NO `vi.mock` of modules at the config level.
- `esbuild.target: 'node18'`, `jsx: 'automatic'`, `jsxImportSource: 'react'`.
- Module resolution: `.js` import specifiers map to `.ts` source files transparently (esbuild handles this; the empty `alias` block is a leftover comment).

---

## 5. package.json scripts (exact)

```json
"scripts": {
  "build": "tsc",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "tsc --noEmit",
  "start:all": "tsx examples/index.ts",
  // ...start:* examples...
  "generate:llms": "npx tsx scripts/generate-llms-full.ts"
}
```

- **`npm test` → `vitest run`** (single pass, exits).
- **`npm run test:watch` → `vitest`** (watch mode).
- **`npm run lint` → `tsc --noEmit`** — type-checks ONLY `src/**/*` (per `tsconfig.json` `include`), EXCLUDING `src/__tests__` (per `tsconfig.json` `exclude`). So **`lint` does NOT type-check test files.** Type errors in tests will surface only at `vitest run` time, via esbuild (which is permissive — type errors often DON'T fail the run).
- No `coverage` script; `@vitest/coverage-v8` is installed but uncovered.
- `engines.node: ">=20"`. Dev runtime: Node 20+, vitest 1.x.

---

## 6. Pi SDK mock pattern (the canonical factory)

**Source: `src/__tests__/integration/harness-parity.test.ts:46-80` (verbatim copy exists in `pi-harness-execute.test.ts:30-55`).**

The technique is **private-field overwrite after real `initialize()`**, NOT `vi.mock`. The fake Pi `AgentSession` exposes `subscribe` (captures the listener) and `prompt` (replays scripted events):

```ts
type FakeEvent = Record<string, unknown> & { type: string };

function makeFakeSession(events: FakeEvent[]) {
  let listener: ((e: FakeEvent) => void) | null = null;
  return {
    subscribe: vi.fn((l: (e: FakeEvent) => void) => {
      listener = l;
      return () => { listener = null; };
    }),
    prompt: vi.fn(async (_text: string) => {
      for (const e of events) listener?.(e);
    }),
    _emit(e: FakeEvent) { listener?.(e); },
  };
}

function wirePi(harness: PiHarness, events: FakeEvent[]) {
  const fakeSession = makeFakeSession(events);
  // @ts-expect-error - private field access for testing
  harness.sdk = {
    ...harness.sdk,
    createAgentSession: vi.fn().mockResolvedValue({ session: fakeSession }),
  };
  return { harness, fakeSession };
}
```

**Usage pattern:**
```ts
const pi = new PiHarness();
await pi.initialize();                          // REAL init — no SDK calls yet
wirePi(pi, [
  PI_SESSION_START,                              // { type: 'session_start', reason: 'startup' }
  piTurnEndText('PARITY_DATA', { input: 10, output: 5 }),
  PI_AGENT_END,                                  // { type: 'agent_end', messages: [] }
]);
const res = await pi.execute({ prompt: 'x', options: {} }, toolExecutor);
```

**Scripted event payloads (helper factories, copy these verbatim):**
- `piTurnEndText(text, {input, output}, turnIndex=0)` — assistant text turn (see `harness-parity.test.ts:107-130`).
- `piTurnEndTool(toolName, args, usage, turnIndex=0)` — assistant turn with a `toolCall` block (`harness-parity.test.ts:132-159`).
- `piToolExecStart(toolCallId, toolName, args)` and `piToolExecEnd(toolCallId, result, isError)` — fire `onToolStart`/`onToolEnd` (`harness-parity.test.ts:161-170`).

**Assertion capture:** after `execute()`, inspect call args via `pi.sdk.createAgentSession.mock.calls[0][0]` (see `harness-parity.test.ts:525-533`).

---

## 7. Anthropic (ClaudeAgent) SDK mock pattern

**Source: `src/__tests__/integration/harness-parity.test.ts:82-105` and `src/__tests__/unit/providers/claude-code-harness-execute.test.ts:80-100`.**

Same technique (private-field overwrite). The `sdk.query` mock returns an **async generator** that yields scripted `SDKMessage`s:

```ts
type SDKMessage =
  | { type: 'assistant'; message: { content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }> } }
  | { type: 'user'; message: { content: string }; session_id?: string }
  | { type: 'result'; subtype: 'success' | 'error_during_execution' | 'error_max_turns'; result?: unknown; structured_output?: unknown; usage?: { input_tokens: number; output_tokens: number }; errors?: string[] };

function makeCcMessages(messages: SDKMessage[]) {
  return async function* () {
    for (const msg of messages) yield msg;
  };
}

function wireCc(harness: ClaudeCodeHarness, messages: SDKMessage[]) {
  const capturedOptions: Record<string, unknown>[] = [];
  // @ts-expect-error - Testing private property
  harness.sdk = {
    query: vi.fn().mockImplementation(({ options }) => {
      capturedOptions.push(options);
      return makeCcMessages(messages)();
    }),
    createSdkMcpServer: vi.fn(),
    tool: vi.fn(),
  };
  return { harness, capturedOptions };
}
```

**Scripted message factories (`harness-parity.test.ts:212-241`):**
```ts
ccAssistantText(text)                  // assistant text message
ccAssistantToolUse(name, input)        // assistant tool_use block
ccResultSuccess(data, {input_tokens, output_tokens})
ccResultError(subtype, errors=[])
```

**Hook-firing asymmetry (CRITICAL — documented in `harness-cache-hooks-parity.test.ts:17-30`):**
> ClaudeCodeHarness hooks do NOT fire through a mocked `execute()`. `buildAgentSDKHooks(hooks)` returns an sdkHooks map passed to `query()` via `options.hooks`; the REAL Anthropic SDK invokes those callbacks, but a MOCKED query never does.

To fire `onToolStart`/`onToolEnd` for a ClaudeCodeHarness parity test, manually invoke the SDK hook callbacks captured inside `options.hooks.PreToolUse[0].hooks[0]` / `PostToolUse[0].hooks[0]`. See `harness-parity.test.ts:367-402` for the exact pattern.

**Mock must include `createSdkMcpServer` and `tool` stubs** — `initialize()` references them; absence causes TypeError.

---

## 8. Cascade matrix (the 4 PRD scenarios) — NO single dedicated test exists

**Searched:**
```bash
grep -niE "cascade matrix|cascade.*4|4 scenar|scenario 1" PRD.md
# → (no output)
```

**PRD §7.7 cascade (lines 385-399):**
```
GlobalHarnessConfig.defaultHarness  (highest priority for defaults)
    ↓
AgentConfig.harness / AgentConfig.harnessOptions
    ↓
PromptOverrides.harness / PromptOverrides.harnessOptions
    ↓
Prompt-level overrides  (lowest priority)
```

**Result:** There is **NO single test file** that documents all four cascade scenarios as a unified matrix. However, the cascade IS exercised piecewise across two files:

1. **`src/__tests__/unit/utils/harness-config.test.ts`** (`describe('resolveHarnessConfig')`, lines 245-405) — pure-function tests of `resolveHarnessConfig(global, agentHarness?, agentOptions?, promptHarness?, promptOptions?)`. Covers: global-only, agent-beats-global, prompt-beats-agent, options merge LWW, immutability, full cascade. **This is the closest thing to a cascade matrix and is the right place to add 4-scenario regression cases.**

2. **`src/__tests__/unit/agent-prompt-harness-override.test.ts`** — end-to-end `Agent.prompt()` tests of: explicit prompt override, agent-level (no prompt), prompt-beats-agent, legacy provider fallback, unregistered-harness `PROVIDER_NOT_FOUND`.

**The 4 canonical scenarios downstream agents should encode** (not yet co-located anywhere):
| # | global.defaultHarness | agent.harness | prompt.harness | resolved |
|---|---|---|---|---|
| 1 | `'pi'` | — | — | `'pi'` |
| 2 | `'pi'` | `'claude-code'` | — | `'claude-code'` |
| 3 | `'pi'` | `'claude-code'` | `'pi'` | `'pi'` (prompt wins) |
| 4 | `'claude-code'` | `'pi'` | `'claude-code'` | `'claude-code'` (prompt wins) |

`harness-config.test.ts:377-405` (the `describe('cascade integration')` block) covers scenarios 2, 3, and 4 at the function level. **Scenario 1 (default-only resolution at the Agent constructor level via `getGlobalHarnessConfig`) is NOT covered** — see §3 above.

---

## 9. TypeScript config relevant to testing

**File: `tsconfig.json`** (key fields):
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",                       // ← ESM, NOT CJS
    "moduleResolution": "bundler",            // ← bundler-style; .js specifiers map to .ts
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "jsxImportSource": "ink",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,                           // ← full strict mode
    "useDefineForClassFields": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true                   // ← each file compiled independently
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/__tests__"]   // ← tests EXCLUDED from tsc
}
```

**`package.json`**: `"type": "module"` (project is ESM-only).

**Consequences for test authoring:**
1. **Imports MUST use `.js` extensions** even when importing `.ts` source: `import { PiHarness } from '../../harnesses/pi-harness.js';`. Every existing test does this. The bundler/esbuild resolution maps `.js` → `.ts` automatically.
2. **Private field access** in tests uses `// @ts-expect-error - Testing private property` (or `- private field access for testing`). Required because `strict: true` blocks direct private-field writes. `tsc` is excluded from checking tests, but vitest's esbuild still flags unannotated private access at runtime in some Node versions — keep the `@ts-expect-error` comments.
3. **`isolatedModules: true`** means type-only imports MUST use `import type { ... }` (see every test file). Re-exporting types intermixed with values can fail at runtime under esbuild.
4. **No path aliases** are configured — tests import via deep relative paths (`../../../harnesses/...`).
5. **Tests are NOT type-checked by `npm run lint`** — they only execute via `vitest run`. esbuild strips types without checking them, so a type error in a test will NOT fail CI unless it is also a syntax error. Manual `tsc --noEmit` on test files is the only way to catch type drift.
6. **Strict null checks** — tests assert `expect(x).not.toBeNull()` and `expect(x).not.toBeUndefined()` (the project's PRD §6.4.4 "use null, not undefined" convention; see `agent.test.ts:412-417`).

---

## 10. Cross-cutting conventions summary (cheat sheet for downstream agents)

| Concern | Convention |
|---|---|
| Test runner | vitest 1.x, `vitest run` for CI |
| File location | `src/__tests__/unit/...test.ts` (unit) or `src/__tests__/integration/...test.ts` (parity) |
| Imports | Relative paths + `.js` extension, `import type` for types |
| Globals | `globals: true`, but explicitly `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';` |
| Registry reset | `HarnessRegistry._resetForTesting();` in `beforeEach` AND `afterEach`; ALSO `HarnessRegistry.getInstance()._resetInitStateForTesting();` for harness init-state |
| Global config reset | `resetGlobalHarnessConfig()` (new) and/or `resetGlobalConfig()` (legacy) in `beforeEach`/`afterEach` |
| Mock clearing | `vi.clearAllMocks();` in `beforeEach`; `mockFn.mockClear();` for shared mocks |
| Pi SDK mock | Private-field overwrite after real `initialize()`, `makeFakeSession()` factory, scripted events |
| Claude SDK mock | Private-field overwrite after real `initialize()`, `sdk.query` returns async generator yielding `SDKMessage`s; include `createSdkMcpServer` + `tool` stubs |
| Hooks for CC | Manually invoke `options.hooks.PreToolUse[0].hooks[0]` etc. (mocked `query` does not fire them) |
| Assertions on parity | SHAPE/key-set parity only (`Object.keys(...).sort()`); never value-equality on `isError`/`duration` |
| Mock harness for Agent tests | `createMockHarness(id, executeImpl?)` factory (see `agent-prompt-harness-override.test.ts:33-72`); default execute returns `createSuccessResponse(...)` |
| Type-only tests | `*.test.ts` files with `import type` and runtime no-ops are accepted (see `harness-public-api.test.ts`) |
| Lint scope | Tests NOT type-checked by `npm run lint`; verify with `vitest run` |
| `@ts-expect-error` discipline | Always pair with a descriptive comment; required for private-field access |

---

## Start Here (for the next agent)

1. **Open `src/__tests__/integration/harness-parity.test.ts`** — copy the `makeFakeSession`/`wirePi`/`wireCc` factories verbatim. This is the gold-standard mocking idiom.
2. **Open `src/__tests__/unit/utils/harness-config.test.ts`** — find the `describe('cascade integration')` block (lines 377-405). Add the 4-scenario matrix here as pure-function tests of `resolveHarnessConfig`.
3. **Open `src/__tests__/unit/agent.test.ts`** lines 127-141 — the only existing default-resolution test, but it exercises the LEGACY path. To cover the bugfix's new path, construct a test that calls `configureHarnesses({ defaultHarness: 'pi' })` + `registerDefaultHarnesses()` + `new Agent()` (no harness arg) and asserts resolution to `'pi'`.
4. **Open `src/core/agent.ts:109-128`** — confirm whether the constructor still reads `getGlobalProviderConfig()` (legacy, default `'anthropic'`) or has been migrated to `getGlobalHarnessConfig()` (new, default `'pi'`). The bugfix likely changes this line.

## Residual risks / open questions

- **Test type-checking gap:** `npm run lint` does NOT cover `src/__tests__`. A test can compile under esbuild (and pass `vitest run`) while having type errors. Recommend running `npx tsc --noEmit` with the exclude removed, OR adding a `test:types` script, if type-correctness of tests matters for the bugfix.
- **The default-resolution test at `agent.test.ts:127-141` is misleadingly named** ("uses the configured global default harness") — it actually tests the legacy `provider` path. A downstream agent adding a new-harness default-resolution test should NOT modify this one in place (would break the legacy regression contract); add a sibling test instead.
- **No `coverage` script exists** — coverage is enabled by `@vitest/coverage-v8` but no npm script invokes it. If the bugfix's acceptance criteria require coverage thresholds, a `coverage` script needs adding.
- **`Agent` constructor is still wired to the legacy `getGlobalProviderConfig()` singleton** (`src/core/agent.ts:117`). If the bugfix moves the constructor to `getGlobalHarnessConfig()`, ALL existing tests that rely on the legacy default of `'anthropic'` (e.g. `agent.test.ts:128-133` registering a mock `'anthropic'` harness, the cascade tests in `provider-switching.test.ts`) may break. Audit before changing.

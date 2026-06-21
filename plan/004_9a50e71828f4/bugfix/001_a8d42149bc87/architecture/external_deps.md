# External Dependencies — Harness System Bugfix

> This is a **bugfix** effort. No new external dependencies are introduced. This file
> documents the existing dependencies that the fixes touch, so downstream agents understand
> the runtime surface.

## 1. No new dependencies

All four fixes operate entirely on existing source within `src/`. No `package.json`
changes are required. The fixes reuse existing internal utilities:
- `getGlobalHarnessConfig` / `resolveHarnessConfig` (`src/utils/harness-config.ts`) — already implemented, already imported in agent.ts.
- `registerDefaultHarnesses` (`src/harnesses/register-defaults.ts`) — already implemented.
- `parseModelSpec` / `ModelSpec.provider` (`src/utils/model-spec.ts`) — already used by both harnesses.

## 2. Runtime SDKs (mocked in tests, real in production)

| SDK | Used by | Mock pattern |
|-----|---------|--------------|
| Pi SDK (`@anthropic-ai/...` / internal `pi.sdk`) | `PiHarness` | Private-field overwrite after real `initialize()`; `makeFakeSession()` replays scripted events. See `harness-parity.test.ts:46-80`. |
| Anthropic Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | `ClaudeCodeHarness` | Private-field overwrite; `sdk.query` returns async generator yielding `SDKMessage`s; must include `createSdkMcpServer` + `tool` stubs. See `harness-parity.test.ts:82-105`. |

**Neither SDK needs mocking changes for this bugfix.** Issue 2's regression test reuses
the Pi `makeFakeSession` pattern and triggers a tool call via scripted `piToolExecStart` /
`piTurnEndTool` events.

## 3. Test/dev tooling (unchanged)

- **vitest 1.x** — `npm test` = `vitest run`.
- **TypeScript 5.x, strict mode, ESM (`"type":"module"`)**, `moduleResolution: bundler`.
  Imports MUST use `.js` extensions; type-only imports MUST use `import type`.
- `npm run lint` = `tsc --noEmit` — **excludes `src/__tests__`**. Tests are validated by
  `vitest run` only.

## 4. Public API surface affected

| Symbol | Change | Backward compat |
|--------|--------|-----------------|
| `configureHarnesses()` | Behavior now actually reaches `Agent` (was disconnected). | ✅ Strict improvement — fixes the documented-but-broken contract. |
| `new Agent({ model })` (no harness) | Resolves to global `'pi'` default instead of throwing. | ✅ New working path; previously always threw. |
| `registerDefaultHarnesses` | NEWLY exported from `src/index.ts`. | ✅ Additive export. |
| `PiHarness.execute()` `toolExecutor` param | Now actually invoked (was dead). | ✅ Fulfills the existing `Harness.execute()` contract. |
| `StreamEvent.metadata.provider` | Reports LLM provider instead of harness id. | ⚠️ Value change — consumers asserting `provider==='pi'`/`'claude-code'` must update. Grep tests before landing. |

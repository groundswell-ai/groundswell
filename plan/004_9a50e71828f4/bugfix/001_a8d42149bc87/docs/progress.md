# Progress

## Status
In Progress

## Tasks
- [x] Scout: TEST PATTERNS AND CONVENTIONS for harness system → wrote `plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md`

## Files Changed
- `plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/test-patterns-and-conventions.md` (created)

## Notes
- Catalogued 47+ test files touching the harness system across unit + integration tiers.
- Confirmed PRD claim: NO existing parity test covers the `new Agent()` default-resolution path via `getGlobalHarnessConfig()` (default `'pi'`). The only default-resolution test (`agent.test.ts:127-141`) actually exercises the LEGACY `getGlobalProviderConfig()` path (default `'anthropic'`) — misleadingly named.
- Documented the canonical mocking idiom: private-field overwrite after real `initialize()` (NOT `vi.mock`). Pi = `makeFakeSession` + scripted events; CC = `sdk.query` returns async generator yielding `SDKMessage`s.
- Flagged that `npm run lint` (=`tsc --noEmit`) EXCLUDES `src/__tests__`, so test type errors only surface at `vitest run` time via esbuild (which strips types without checking).
- Flagged that `src/core/agent.ts:117` still uses the LEGACY `getGlobalProviderConfig()` — a migration to `getGlobalHarnessConfig()` would cascade-break existing legacy-default tests.
- No single "4-scenario cascade matrix" test exists; closest is `harness-config.test.ts:377-405` (function-level), and end-to-end cascade coverage lives in `agent-prompt-harness-override.test.ts`.

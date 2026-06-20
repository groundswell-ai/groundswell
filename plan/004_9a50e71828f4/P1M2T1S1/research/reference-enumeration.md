# P1.M2.T1.S1 — Relocation Reference Enumeration (research note)

Captured via exhaustive grep on the working tree (alias shim already applied, P1.M1.T3.S1 in
flight). This is the ground-truth list of every `src/providers` reference that breaks after
`git mv src/providers src/harnesses`.

## Toolchain facts (verified)

- `npm run lint` = `tsc --noEmit`. tsconfig `exclude: ["node_modules","dist","src/__tests__"]` →
  **lint does NOT type-check tests**. It DOES check: `src/core/agent.ts`, `src/index.ts`,
  `src/types/index.ts`, `src/types/providers.ts`, `src/providers/*.ts` (→ `src/harnesses/*.ts`).
- `npm test` = `vitest run` (esbuild transpile-only). Includes `src/__tests__/**` + `examples/__tests__/**`.
  Module-resolution failures here surface as test errors.
- tsconfig `include: ["src/**/*"]` → `src/harnesses/**` is matched. **No tsconfig change needed.**
- `git ls-files src/providers/` → all 5 files tracked. `git mv src/providers src/harnesses` is safe.

## Non-test src/ edit sites (4 files, 6 sites)

```
src/core/agent.ts:43          import { ProviderRegistry } from '../providers/index.js';
src/types/index.ts:52         export { AnthropicProvider } from '../providers/anthropic-provider.js';
src/index.ts:117              export { AnthropicProvider } from './providers/anthropic-provider.js';
src/index.ts:118              export { ProviderRegistry } from './providers/provider-registry.js';
src/types/providers.ts:148       * type is imported from '../providers/session-store.js'.   (JSDoc)
src/types/providers.ts:150    sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>;  (inline TYPE import)
```

NOTE: `src/index.ts:117/118` and `src/types/index.ts:52` are `export ... from` re-exports — they
do NOT contain the word "import", so the contract's verification `grep -rn "providers/" src/ |
grep import` does NOT flag them. **They still break compilation** and MUST be updated (lint catches).

## Test edit sites (31 files)

`src/__tests__/integration/` (2): provider-switching.test.ts, provider-agent.test.ts
`src/__tests__/unit/` (4): agent.test.ts, agent-tool-executor.test.ts,
  agent-prompt-provider-override.test.ts, agent-stream-provider-override.test.ts
`src/__tests__/unit/providers/` (25): provider-registry, anthropic-provider-initialize,
  anthropic-provider-terminate, anthropic-provider-registermcps, anthropic-provider-loadskills,
  anthropic-provider-hooks, anthropic-provider, anthropic-provider-normalizemodel, provider-lifecycle,
  opencode-provider-deprecation (**incl. 2 dynamic `await import('...providers/...')` at L248, L265**),
  opencode-provider-initialize, opencode-provider-terminate, opencode-provider-registermcps,
  opencode-provider-loadskills, opencode-provider-normalizemodel, opencode-provider-hooks,
  opencode-provider-execute, session-store, anthropic-provider-execute, anthropic-provider-sessions,
  anthropic-provider-sessionconfig, session-store-ttl, anthropic-provider-sessionstore,
  anthropic-provider-supports, opencode-provider-supports.

## Path-prefix forms present (all safe to prefix-replace)

- `../providers/`        (src/core, src/types — 2 levels up from src/<dir>)
- `./providers/`         (src/index.ts)
- `../../providers/`     (src/__tests__/unit, src/__tests__/integration — from depth-2 test dirs)
- `../../../providers/`  (src/__tests__/unit/providers — depth-3)

## What is NOT touched / out of scope (verified no-op)

- `../types/providers.js` / `./types/providers.js` — the TYPES file is NOT moving. A blind
  `s/providers/harnesses/g` would corrupt these → MUST use prefix-based replacement.
- `src/__tests__/unit/providers/` test DIRECTORY name — leave as-is (contract does not rename it).
- `examples/` — zero `src/providers` imports. Examples import from the `groundswell` package +
  `examples/providers/` example scripts (separate dir, owned by P4.M3.T2). NO changes.
- `scripts/` — no `src/providers` refs.
- `package.json` `start:provider-*` scripts point at `examples/providers/*` — NOT src. No change.
- `docs/providers.md`, prose JSDoc path refs in moved files (`src/types/harnesses.ts:242`,
  `src/harnesses/anthropic-provider.ts:390`, `src/harnesses/opencode-provider.ts:210`) — optional
  cosmetic refresh; do NOT block (the contract `grep import` verification won't flag them).

## Naming-coexistence note

After the move, TWO "harnesses" things coexist (different paths, no clash):
- `src/harnesses/` — the relocated adapter directory (barrel `index.ts` + 4 impl files).
- `src/types/harnesses.ts` — the Harness* type definitions (P1.M1.T1, NOT moving).
Resolves fine by path: `../harnesses/index.js` (barrel) vs `./harnesses.js` (types). Don't conflate.

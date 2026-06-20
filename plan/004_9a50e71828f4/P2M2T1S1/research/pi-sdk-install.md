# Research — Installing `@earendil-works/pi-coding-agent`

> Authoritative source for the dependency step of P2.M2.T1.S1. Verified against
> the repo root (`package.json`, lockfiles) and `plan/004_9a50e71828f4/docs/external_deps.md`
> (§1, VERIFIED 2026-06-20 via `npm pack` + `.d.ts`).

## 1. Package manager = **npm** (NOT pnpm)

Evidence:
- `package.json` scripts use `npm` (`"build": "tsc"`, `"test": "vitest run"`, `"lint": "tsc --noEmit"`). Build/test/lint are all run via `npm run`.
- `package-lock.json` (161 KB, dated Jan 26 16:07) is **NEWER** than `pnpm-lock.yaml` (61 KB, Jan 25 19:45). npm is the active manager; the pnpm lock is stale.
- The work-item contract literally says `npm i @earendil-works/pi-coding-agent`.

➡️ **Use `npm i`** so `package-lock.json` is updated (not `pnpm-lock.yaml`). Mixing managers
would leave `package-lock.json` out of sync with `package.json` and the installed tree.

## 2. Version = `0.79.8` → recorded as `^0.79.8`

- `external_deps.md` Dependency Summary + §1: the verified Pi SDK version is **`0.79.8`**
  (`main: ./dist/index.js`, `types: ./dist/index.d.ts`, ESM, Node 18+).
- `npm view @earendil-works/pi-coding-agent version` → `0.79.8` (re-confirmed live).
- Repo convention is **caret** ranges for runtime deps (e.g. `"@anthropic-ai/claude-agent-sdk": "^0.1.0"`,
  `"ink": "^6.6.0"`). `npm i @earendil-works/pi-coding-agent@0.79.8` records `"^0.79.8"` by default
  (npm's default `save-prefix` is `^`; repo has no `.npmrc` overriding it). ✅ matches convention.

➡️ **Command: `npm i @earendil-works/pi-coding-agent@0.79.8`**
   - Adds to `package.json` `dependencies`.
   - Updates `package-lock.json` + installs into `node_modules/@earendil-works/pi-coding-agent/`.
   - Pulls transitive deps incl. `@earendil-works/pi-ai` (the `getModel(provider, model)` provider
     resolver — needed by S2, not S1), `@sinclair/typebox` (tool param schemas — needed by P2.M4.T1.S1).

## 3. Peer-dep / conflict check — EXPECTED CLEAN

- `zod` is already `3.25.76` (`external_deps.md` Summary). Pi SDK uses **TypeBox**, not zod, so there
  is no zod peer conflict (zod is the Claude SDK's peer, already satisfied).
- Pi's transitive runtime (`@earendil-works/pi-ai`, `@sinclair/typebox`, `lru-cache`, `ws`, etc.) does
  not overlap/conflict with the existing tree (spot-checked: `lru-cache` already present at `^10.4.3` —
  npm dedupes; no hard pin mismatch at the Pi-required version).
- ➡️ After install, scan npm output for `npm ERR! ERESOLVE` / peer warnings. If a genuine conflict
  appears, run `npm i @earendil-works/pi-coding-agent@0.79.8 --legacy-peer-deps` ONLY as a fallback and
  document why. Expected: none required.

## 4. The skeleton does NOT import the SDK (S1 boundary)

- S1 deliverable = **dependency installed + compilable skeleton that instantiates**. It does NOT wire
  `createAgentSession` (that is **S2** = "Implement initialize/terminate + model resolution (ModelSpec→Model<any>)").
- Therefore `src/harnesses/pi-harness.ts` imports ONLY the local Harness types + `parseModelSpec`.
  The Pi SDK package is present in `node_modules` and listed in `package.json` (so it RESOLVES), but no
  `import ... from '@earendil-works/pi-coding-agent'` lives in `src/` until S2.
- This is intentional and safe: an unused-but-installed dep is a normal npm state; `npm run lint`/`build`
  do not flag unused dependencies.

## 5. Proving the dep RESOLVES (validation step, not a code import)

Because S1 ships no SDK import, prove resolution separately at validation time:

```bash
# (a) listed in package.json deps
grep -n "@earendil-works/pi-coding-agent" package.json
# (b) physically installed
ls node_modules/@earendil-works/pi-coding-agent/dist/index.js node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts
# (c) runtime-importable (ESM resolve + entry executes)
node --input-type=module -e "import('@earendil-works/pi-coding-agent').then(m=>console.log('pi entry keys:', Object.keys(m).slice(0,5))).catch(e=>{console.error(e);process.exit(1)})"
```

All three MUST pass. (c) confirms the `exports["."].import` → `./dist/index.js` map resolves under Node
ESM (the package is `"type": "module"`-compatible with this repo, which is also ESM — `package.json`
has `"type": "module"`).

## 6. Where the dep is DECLARED (one line)

`package.json` → `"dependencies"` block (alphabetical-ish, alongside `@anthropic-ai/claude-agent-sdk`):

```json
"@earendil-works/pi-coding-agent": "^0.79.8",
```

No devDependencies move (it is a runtime dep — PiHarness is shipped product code in `dist/`).

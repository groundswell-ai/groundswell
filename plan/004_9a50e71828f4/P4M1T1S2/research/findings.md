# Research Findings — P4.M1.T1.S2 (Update examples & finalize migration-opencode doc)

Source of truth for the PRP. All facts below were verified by direct file reads + live `tsc` runs
against a freshly-built `dist/` (2026-06-20).

## 1. Contract discrepancy — 5 files, not 4

Contract LOGIC says "examples/providers/02,03,04,06-*.ts import/register OpenCodeProvider". **Wrong.**
`grep -rlni opencode examples/` returns **5** files:

```
examples/providers/02-provider-configuration.ts
examples/providers/03-provider-switching.ts
examples/providers/04-multi-provider-scenarios.ts
examples/providers/05-provider-sessions.ts   ← CONTRACT OMITS THIS; it DOES import OpenCodeProvider (L26, L57)
examples/providers/06-provider-with-mcp-skills.ts
```

The OUTPUT gate ("Examples compile without opencode") requires all 5. **05 is in-scope.**

Other example surfaces are already opencode-free (verify-only): `examples/providers/README.md`,
`examples/README.md`, `examples/index.ts`, the `examples/examples/*` workflow files, `examples/components/*`.
Confirmed by `grep -rni opencode examples/` listing only the 5 files above.

## 2. Scope boundary — S2 removes ONLY opencode (vocabulary rewrite is P4.M3.T2)

The contract is explicit: *"full example migration happens in P4.M3.T2, but remove opencode imports
here so examples compile."* Therefore S2 **must NOT** do the provider→harness vocabulary rewrite:

| Vocabulary change | Owner | S2 does it? |
|---|---|---|
| `OpenCodeProvider` import/register/config/override removal | **S2 (this task)** | ✅ YES |
| `AnthropicProvider` → `ClaudeCodeHarness` rename | P4.M3.T2 | ❌ NO |
| `ProviderRegistry` → `HarnessRegistry` rename | P4.M3.T2 | ❌ NO |
| `configureProviders` → `configureHarnesses` rename | P4.M3.T2 | ❌ NO |
| `provider:` → `harness:` field rename | P4.M3.T2 | ❌ NO |
| Capability matrix rewritten to compare `pi` vs `claude-code` | P4.M3.T2 | ❌ NO |

**Why this matters:** the legacy `AnthropicProvider` / `ProviderRegistry` / `provider:'anthropic'`
vocabulary is STILL VALID (P3.M3.T1.S1 kept them as deprecated aliases: `src/index.ts:126-127`).
So after S2 the examples remain in legacy vocabulary — that is correct and intended. The harness
vocabulary (`PiHarness`/`ClaudeCodeHarness`/`harness:`) is deliberately deferred.

## 3. Pre-existing, OUT-OF-SCOPE breakage (do NOT fix in S2)

Live `tsc --noEmit` on the examples (against freshly built `dist/`) classifies every error:

### Example 06 (5 errors)
| Line | Error | Classification |
|---|---|---|
| 26 | `Module '"groundswell"' has no exported member 'OpenCodeProvider'` | **OPENCODE — S2 fixes** |
| 31 | `Cannot find module '../../utils/helpers.js'` | PRE-EXISTING — standalone-tsc artifact (helpers.ts exists; examples not in project tsconfig) |
| 316 | `Property 'path' is missing in type '{name;content}' but required in type 'Skill'` | PRE-EXISTING — Skill shape drift (P4.M3.T2) |
| 432 | `AgentHooks` has no properties in common | PRE-EXISTING — hooks API drift (P4.M3.T2) |
| 459 | `Argument '"opencode"' not assignable to 'ProviderId'` | **OPENCODE — S2 fixes** |

### Example 02 (6 errors)
| Line | Error | Classification |
|---|---|---|
| 25 | `no exported member 'configureProviders'` | PRE-EXISTING — `configureProviders` exists at `src/utils/harness-config.ts:287` (deprecated alias) but is NOT re-exported from `src/index.ts` (only `configureHarnesses` is, L133). Vocabulary gap = P4.M3.T2. |
| 26 | `no exported member 'getGlobalProviderConfig'` (did-you-mean GlobalProviderConfig) | PRE-EXISTING — same as above (`harness-config.ts:323`, not re-exported). P4.M3.T2. |
| 28 | `no exported member 'OpenCodeProvider'` | **OPENCODE — S2 fixes** |
| 32 | `Cannot find module '../../utils/helpers.js'` | PRE-EXISTING — standalone-tsc artifact |
| 110 | `Type '"opencode"' not assignable to 'ProviderId'` | **OPENCODE — S2 fixes** |
| 186 | `Type '"opencode"' not assignable to 'ProviderId'` | **OPENCODE — S2 fixes** |

**Conclusion:** S2 eliminates ONLY the OpenCodeProvider/opencode-ProviderId errors. The
`configureProviders`/`getGlobalProviderConfig`/`Skill.path`/`AgentHooks`/helpers-path errors are
pre-existing and owned by P4.M3.T2. The S2 success criterion is therefore **"zero
OpenCodeProvider/opencode errors remain"** + **grep empty**, NOT "tsc zero-errors on examples".

## 4. tsconfig reality — examples are NOT type-checked by the project

`tsconfig.json`: `"include": ["src/**/*"]`, `"rootDir": "./src"`, `"exclude": ["node_modules","dist","src/__tests__"]`.
=> `npm run lint` (tsc --noEmit) / `npm run build` (tsc) / `npm test` (vitest) **never touch examples/**.
Examples execute via `tsx` (`start:provider-*` scripts in package.json). So:
- The `helpers.js` "Cannot find module" error is a **standalone-tsc artifact only** (helpers.ts exists
  at `examples/utils/helpers.ts`; tsx resolves the `.js`→`.ts` mapping at runtime). It is NOT real
  breakage and NOT in scope.
- The real S2 validation is the **grep gate** + a **targeted tsc delta** proving opencode errors are gone.

## 5. Verified working validation command

```bash
npm run build >/dev/null 2>&1   # regenerate dist/ (picks up S1's opencode removal + current exports)
npx tsc --noEmit --module ES2022 --moduleResolution bundler --target ES2022 \
  --lib ES2022 --esModuleInterop --skipLibCheck --resolveJsonModule \
  examples/providers/06-provider-with-mcp-skills.ts 2>&1 | grep -iE "opencode"
# EXPECT (after S2): empty.  (before S2: 2 opencode errors, L26 + L459)
```
Run per-file (02,03,04,05,06). After S2 each must show ZERO lines matching `opencode|OpenCodeProvider`.
Other error lines may remain — they are the pre-existing P4.M3.T2 vocabulary issues (see §3) and MUST
be left untouched.

## 6. Current public API surface (src/index.ts) — what examples CAN import

```
src/index.ts:126  export { ClaudeCodeHarness, AnthropicProvider }   ← AnthropicProvider alias valid
src/index.ts:127  export { HarnessRegistry, ProviderRegistry }       ← ProviderRegistry alias valid
src/index.ts:130  export { PiHarness }
src/index.ts:133  export { configureHarnesses }                      ← ONLY the harness name exported
src/index.ts:134  export { parseModelSpec, formatModelForProvider }
```
- `Agent`, `Prompt`, `MCPHandler` exported (L121-123).
- `OpenCodeProvider`: NEVER exported (confirmed; S1 then deletes the class). ← the import S2 removes.
- `configureProviders` / `getGlobalProviderConfig`: defined as deprecated aliases in
  `src/utils/harness-config.ts:287,323` but **NOT re-exported** from index.ts. Pre-existing gap (P4.M3.T2).

## 7. Per-file opencode edit map (precise line anchors, current state)

### 02-provider-configuration.ts (opencode hits: L28,73,91,107-113,128-129,172,177,186,193,234)
- L28 import: drop `OpenCodeProvider,`
- L66-77 `configureProviders({...})`: drop the `opencode: { endpoint, timeout }` block (keep `anthropic`)
- L91: drop `registry.register(new OpenCodeProvider());`
- L107-113 Agent 2 "OpenCodeAgent" `provider:'opencode'`: convert to a second anthropic variant (e.g.
  `name:'CustomAnthropicAgent2', provider:'anthropic'`) OR remove Agent 2. Keep legacy `provider:` vocab.
- L128-129, L172, L177, L193, L234 console.logs: scrub "OpenCode"/"opencode" strings (anthropic-neutral)
- L186 prompt2 override `provider:'opencode'`: change to `provider:'anthropic'` or remove the override
- ⚠ LEAVE `configureProviders`/`getGlobalProviderConfig` imports (L25-26) — pre-existing, P4.M3.T2.

### 03-provider-switching.ts (hits: L15,27,58,63-67,90-102,125-127,173-194,251-258,281,294)
- L27 import: drop `OpenCodeProvider,`
- L58: drop `registry.register(new OpenCodeProvider());`
- L63-67 commented opencode init: remove the comment block
- L90-102 `opencodeAgent` (`provider:'opencode'`, model `openai/gpt-4`): collapse to an anthropic agent
  or remove. Add `// TODO(P4.M3.T2): rewrite as pi vs claude-code harness switching`
- L125-127, L173-194 prompt2 opencode override + notes: remove the override (or anthropic) + scrub notes
- L251-258 capability comparison table (Anthropic | OpenCode): remove the OpenCode column/rows OR
  replace the second column with a `// TODO(P4.M3.T2)` note
- L281, L294 "when to use" code-string examples: change `"opencode"` → `"anthropic"` (legacy vocab OK)

### 04-multi-provider-scenarios.ts (hits: L15,27,58,77,88,191-192,300-313,377,387,399,421)
- L27 import: drop `OpenCodeProvider,`
- L58: drop register
- L77,88 comments: scrub OpenCode mentions
- L191-192 `ResilientAgent` `primaryProvider/fallbackProvider: 'anthropic'|'opencode'`: narrow the union
  to `'anthropic'` (single-provider) + TODO(P4.M3.T2) note for pi/claude-code fallback
- L300 `providers: Array<'anthropic'|'opencode'>`: narrow to `['anthropic']` (or remove A/B loop) + TODO
- L313 `provider==='opencode' ? {endpoint} : undefined`: remove the opencode branch
- L377-421 pattern code-strings: `"opencode"` → `"anthropic"` (or mark TODO)

### 05-provider-sessions.ts (hits: L26,57,302-325)
- L26 import: drop `OpenCodeProvider,`
- L57: drop register
- L302-325 "OpenCodeProvider Session Model" comparison block: remove the OpenCode column/rows OR
  collapse to anthropic-only + `// TODO(P4.M3.T2): compare pi vs claude-code session models`

### 06-provider-with-mcp-skills.ts (hits: L26,58,459,461,464,478-479,485,490-491,507)
- L26 import: drop `OpenCodeProvider,`
- L58: drop register
- L459 `registry.get('opencode')`, L461 guard, L464 matrix header, L478-479 OpenCodeProvider caps dump,
  L485/490-491 notes, L507 summary line: remove the OpenCode column from the capability matrix + scrub
  notes. Leave the anthropic column. Add `// TODO(P4.M3.T2): rewrite matrix as pi vs claude-code (PRD §7.4)`

## 8. Migration doc edits (docs/migration-opencode-removal.md) — mark COMPLETE, narrow scope

S2 owns ONLY "mark removal COMPLETE in v2.0.0". Do NOT rewrite the `AnthropicProvider`/`configureProviders`
references to harness vocabulary (that is the docs-rewrite owned by P4.M3.T1.S1 "update migration guides" /
P4.M3.T2). Edits:
- Header: add `**Status:** ✅ COMPLETED — Removed in v2.0.0`; bump `**Last Updated:**` to June 2026.
- Overview: "has been deprecated in favor of" → "has been **removed** in v2.0.0 (deprecated v1.5.0)".
- Timeline: "July 2026: v2.0.0 released with OpenCodeProvider removal" → past-tense "**Completed:**
  v2.0.0 shipped — `OpenCodeProvider` + `@opencode-ai/sdk` removed."
- FAQ "Will OpenCodeProvider continue to work in v1.x?": update answer to "Removed in v2.0.0; it
  remained functional with deprecation warnings through v1.x."
- FAQ "How long do I have to migrate?": "The window closed with v2.0.0 — follow the steps above before
  upgrading."
- Leave the migrate-to-AnthropicProvider step code as-is (still valid alias); optionally add a one-line
  forward-note pointing to the harness system docs (P4.M3 will author those).

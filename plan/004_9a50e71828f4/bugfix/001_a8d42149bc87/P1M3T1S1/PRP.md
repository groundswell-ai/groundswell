name: "P1.M3.T1.S1 — Fix metadata.provider conflation (this.id → modelSpec.provider) in PiHarness + ClaudeCodeHarness"
description: |

  Two-token semantic fix: the streaming `metadata` StreamEvent's `provider` field currently
  reports the *harness id* (`'pi'` / `'claude-code'`) instead of the resolved *LLM provider*
  (e.g. `'anthropic'`). Change `provider: this.id` → `provider: modelSpec.provider` at both
  emission sites, then update the two existing tests that assert the old harness-id values.

---

## Goal

**Feature Goal**: Make `StreamEvent` `{ type: 'metadata'; metadata: { provider } }` carry the
semantically correct value — the resolved LLM host (`ModelSpec.provider`, a `ModelProviderId`
such as `'anthropic'`), not the harness id (`this.id` ∈ `'pi' | 'claude-code'`). This restores
the invariant documented in PRD §7.8 ("the harness is never part of the model string" / harness ⊥
provider) and §7.14.4 (cross-harness shape parity — the field shape stays identical; only the
*value* becomes correct).

**Deliverable**:
1. `src/harnesses/pi-harness.ts` — line ~380: `provider: this.id` → `provider: modelSpec.provider`.
2. `src/harnesses/claude-code-harness.ts` — line ~702: `provider: this.id` → `provider: modelSpec.provider`.
3. `src/__tests__/unit/providers/pi-harness-streaming.test.ts:210` — expected value `'pi'` → `'anthropic'`.
4. `src/__tests__/unit/providers/claude-code-harness-execute.test.ts:1218` — expected value `'claude-code'` → `'anthropic'`.

**Success Definition**: `npm run lint` (tsc --noEmit) is green AND `npm test` (vitest run) is
green, with the two metadata tests passing asserting `provider === 'anthropic'`. A grep for the
old harness-id literals on `metadata.provider` returns no other assertion references.

## User Persona (if applicable)

**Target User**: Downstream consumer of the streaming API (developer integrating the harness's
`execute()` / `stream()` async generator) who reads `metadata.provider` to route, log, or
meter by LLM host.

**Use Case**: Inspect the first yielded `StreamEvent`; branch on `event.metadata.provider` to
select an API key, emit telemetry, or record cost against the correct LLM vendor.

**User Journey**: `for await (const e of harness.execute(req, toolExecutor)) { if (e.type === 'metadata') log({ provider: e.metadata.provider }); ... }`

**Pain Points Addressed**: Today `metadata.provider` lies (`'pi'` / `'claude-code'`) — it reports
the adapter, not the model host, so per-vendor metering/routing is broken. After the fix the
field matches the `ModelSpec.provider` the harness actually used.

## Why

- **Semantic correctness (PRD §7.8, §7.14.4)**: `metadata.provider` is the only REQUIRED field
  on the metadata payload (`src/types/streaming.ts:41`) — it is load-bearing for consumers.
  `ModelSpec.provider` JSDoc (`src/types/harnesses.ts:230`) literally reads *"LLM host — NOT
  the harness"*, which is exactly what this field must carry.
- **Cross-harness consistency preserved**: Both adapters are changed identically, so §7.14.4
  shape-parity still holds; only the previously-wrong value becomes correct.
- **Scope discipline**: This is Issue 3 (Minor) from the bug-fix PRD. It is a *self-contained*
  two-site change with no dependency on Issue 1 (cascade) or Issue 2 (toolExecutor wiring),
  both of which are already Complete. It must not regress them.

## What

### User-visible behavior
Streaming metadata now reports the resolved LLM provider string (e.g. `'anthropic'`, `'openai'`)
instead of the harness id. The `model` and `requestId` fields are unchanged.

### Technical requirements
- Exactly two production edits (one per harness), each a single token swap on the `provider`
  property of the yielded metadata object. `modelSpec` is already a local `const` in scope at
  both sites — no new imports, no new variables.
- Exactly two test edits: change the expected literal string in each `expect(...).toBe(...)`.
- Do **NOT** touch `requestId` (it intentionally embeds `this.id`: `${this.id}-${Date.now()}`).
- Do **NOT** touch `model: modelSpec.model` (already correct).
- Do **NOT** add/remove the `satisfies Extract<StreamEvent, { type: 'metadata' }>` narrowing
  (PiHarness uses it; ClaudeCodeHarness omits it — that pre-existing inconsistency is out of
  scope for this task).

### Success Criteria
- [ ] `metadata.provider === modelSpec.provider` at both emission sites.
- [ ] Both updated tests assert `'anthropic'` and pass.
- [ ] `npm run lint` green (tsc --noEmit).
- [ ] `npm test` green (the only known pre-existing failure, `edge-case.test.ts` unicode —
      Issue 5, explicitly OUT OF SCOPE — must remain the sole failure if present).
- [ ] `grep -rn "metadata.provider" src/__tests__/` shows only the two updated assertions.

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement
this successfully?_ **Yes** — every file path, line number, exact code block, the precise
expected test value, the validation commands, and the reasoning for `'anthropic'` (vs. an
assumption) are specified below.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: plan/004_9a50e71828f4/bugfix/001_a8d42149bc87/architecture/issue3-4-metadata-and-exports.md
  why: Scout verification report for Issue 3 — confirms exact lines, scope, and the one-token fix.
  critical: "Finding 3.1–3.5 trace each claim (emission sites, modelSpec in scope, ModelSpec.provider
    semantics, StreamEvent.provider is the only required field, parseModelSpec returns provider
    correctly). The residual-risk note warns to grep tests for old literals — DONE: exactly 2 match."

- file: src/harnesses/pi-harness.ts
  why: EMISSION SITE #1 — executeStreaming() yields the metadata event.
  pattern: "const modelSpec = this.normalizeModel(...) is in scope at L358 BEFORE the yield at
    L374-382. The yield block sets provider: this.id (L380) — change ONLY that token."
  gotcha: "requestId: `${this.id}-${Date.now()}` MUST keep this.id (it's the harness-scoped
    request id, intentionally embedding the harness id). model: modelSpec.model is already correct."

- file: src/harnesses/claude-code-harness.ts
  why: EMISSION SITE #2 — executeStreaming() yields the metadata event.
  pattern: "const modelSpec = this.normalizeModel(request.options.model ?? 'claude-sonnet-4-20250514')
    is in scope at L666-669 BEFORE the yield at L696-704. The yield block sets provider: this.id (L702)
    — change ONLY that token."
  gotcha: "ClaudeCodeHarness.normalizeModel (L1204) hardcodes parseModelSpec(model, 'anthropic')
    and throws ConfigError if provider !== 'anthropic' (PRD §7.8 anthropic-only). So the resolved
    modelSpec.provider here is ALWAYS 'anthropic'."

- file: src/types/streaming.ts
  why: Defines the StreamEvent metadata arm — confirms provider is the ONLY required metadata field.
  pattern: "{ type: 'metadata'; metadata: { requestId?: string; model?: string; provider: string } }"
  gotcha: "provider is required (not optional), so consumers depend on it — must be the LLM host."

- file: src/types/harnesses.ts
  why: ModelSpec interface — confirms .provider exists and is the LLM host (ModelProviderId).
  pattern: "interface ModelSpec { provider: ModelProviderId; model: string; raw: string } —
    JSDoc: 'LLM host — NOT the harness'."

- file: src/utils/model-spec.ts
  why: parseModelSpec() — the string→ModelSpec parser both normalizeModel() delegate to.
  pattern: "Plain format (1 segment, L78): provider = defaultProvider. Qualified (2 segments, L95):
    provider = parsed prefix. REJECTS 3-segment harness-qualified strings (PRD §7.8)."
  gotcha: "parseModelSpec(model, defaultProvider = 'anthropic') — param default is 'anthropic'.
    If defaultProvider arg is undefined, the TS default kicks in → 'anthropic'."

- file: src/__tests__/unit/providers/pi-harness-streaming.test.ts
  why: TEST SITE #1 — L210 asserts .toBe('pi'); update to .toBe('anthropic').
  pattern: "Test 'should yield metadata event first with provider=pi and model' (L201) calls
    harness.execute({ prompt:'hi', options:{ streaming:true } }, dummyToolExecutor) — NO model.
    Update the test's it() name too if it hardcodes 'pi' (see Implementation Tasks Task 4)."

- file: src/__tests__/unit/providers/claude-code-harness-execute.test.ts
  why: TEST SITE #2 — L1218 asserts .toBe('claude-code'); update to .toBe('anthropic').
  pattern: "Test 'should yield metadata event first' (L1199) calls provider.execute({ prompt:
    'Test prompt', options:{ streaming:true } }, toolExecutor) — NO model."
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
# Only the files this task touches (the full tree is large; relevant slice shown):
src/
  harnesses/
    pi-harness.ts                         # EDIT: L380 provider: this.id → modelSpec.provider
    claude-code-harness.ts                # EDIT: L702 provider: this.id → modelSpec.provider
  types/
    streaming.ts                          # READ-ONLY: StreamEvent metadata arm (provider: string)
    harnesses.ts                          # READ-ONLY: ModelSpec.provider (LLM host)
  utils/
    model-spec.ts                         # READ-ONLY: parseModelSpec(defaultProvider='anthropic')
    harness-config.ts                     # READ-ONLY: DEFAULT_HARNESS_CONFIG (no defaultModelProvider)
  __tests__/unit/providers/
    pi-harness-streaming.test.ts          # EDIT: L210 .toBe('pi') → .toBe('anthropic')
    claude-code-harness-execute.test.ts   # EDIT: L1218 .toBe('claude-code') → .toBe('anthropic')
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# NO new files. This is a pure in-place edit of 4 existing lines across 4 files.
```

### Known Gotchas of our codebase & Library Quirks

```python
# CRITICAL: Both edits are on a `yield` inside an async generator (executeStreaming). Do not
#   restructure the yielded object — only swap the value of the `provider` property. The
#   `satisfies Extract<StreamEvent, { type: "metadata" }>` on the PiHarness site is a type
#   narrowing assertion; changing the provider value to a ModelProviderId string keeps it satisfied.

# CRITICAL: Do NOT assume the test value. The expected provider for BOTH tests is 'anthropic',
#   but for DIFFERENT reasons — verify each before editing:
#   - PiHarness test: getGlobalHarnessConfig().defaultModelProvider is UNDEFINED in this test
#     (DEFAULT_HARNESS_CONFIG only sets defaultHarness:'pi'; the test never calls configureHarnesses).
#     So normalizeModel('claude-sonnet-4-20250514') → parseModelSpec(model, undefined) → the TS
#     param default 'anthropic' applies → provider:'anthropic'. (If a future change sets a global
#     defaultModelProvider, recompute; today it is 'anthropic'.)
#   - ClaudeCodeHarness test: normalizeModel HARDCODES parseModelSpec(model, 'anthropic') and
#     THROWS if provider !== 'anthropic'. So modelSpec.provider is ALWAYS 'anthropic' here.

# CRITICAL: requestId intentionally includes this.id — `${this.id}-${Date.now()}`. Leave it.
#   Only the `provider` property is wrong.

# GOTCHA (test isolation): both test files reset HarnessRegistry / ProviderRegistry in
#   afterEach/beforeEach. Do not introduce any global config mutation in the test edits —
#   just change the expected literal string.

# GOTCHA (out of scope): src/__tests__/integration/provider-agent.test.ts and
#   provider-switching.test.ts contain MANY `new Agent({ provider: 'claude-code' })` lines —
#   those use the legacy `provider` field for HARNESS SELECTION, unrelated to streaming
#   metadata.provider. src/__tests__/unit/provider-result-types.test.ts uses `providerId`
#   (a DIFFERENT field on a different object). NONE of these reference the streaming metadata
#   provider field and must NOT be touched. Confirmed via grep: only 2 assertions match
#   metadata.provider with the old harness-id literals (the two listed above).
```

## Implementation Blueprint

### Data models and structure

None. This task changes no data models — `StreamEvent.metadata.provider` is already typed
`provider: string` and `ModelSpec.provider` is `ModelProviderId` (a string subtype). The edit
merely supplies the correct string value.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: EDIT src/harnesses/pi-harness.ts (executeStreaming metadata yield, ~L374-382)
  - FIND: |
      yield {
        type: "metadata",
        metadata: {
          requestId: `${this.id}-${Date.now()}`,
          model: modelSpec.model,
          provider: this.id,
        },
      } satisfies Extract<StreamEvent, { type: "metadata" }>;
  - REPLACE the single line `provider: this.id,` with `provider: modelSpec.provider,`
  - PRESERVE: requestId (keeps this.id), model: modelSpec.model, the satisfies narrowing.
  - NAMING/PLACEMENT: in-place token swap; no new symbols.
  - WHY: modelSpec is the local const from L358 (this.normalizeModel(...)). Its .provider is the LLM host.

Task 2: EDIT src/harnesses/claude-code-harness.ts (executeStreaming metadata yield, ~L696-704)
  - FIND: |
      yield {
        type: "metadata",
        metadata: {
          requestId: `${this.id}-${Date.now()}`,
          model: modelSpec.model,
          provider: this.id,
        },
      };
  - REPLACE the single line `provider: this.id,` with `provider: modelSpec.provider,`
  - PRESERVE: requestId (keeps this.id), model: modelSpec.model. (No satisfies narrowing on this site.)
  - NAMING/PLACEMENT: in-place token swap; no new symbols.
  - WHY: modelSpec is the local const from L666-669. Always 'anthropic' due to the anthropic-only guard.

Task 3: EDIT src/__tests__/unit/providers/pi-harness-streaming.test.ts (L210)
  - FIND: `expect(events[0].metadata.provider).toBe('pi');`
  - REPLACE WITH: `expect(events[0].metadata.provider).toBe('anthropic');`
  - ALSO CHECK: the enclosing `it('should yield metadata event first with provider=pi and model', ...)`
    name at L201. Updating the test name is OPTIONAL but recommended for accuracy:
    → `it('should yield metadata event first with provider=anthropic (modelSpec.provider) and model', ...)`
  - WHY: no model in the test request → default 'claude-sonnet-4-20250514' → normalizeModel →
    parseModelSpec(model, undefined) → param default 'anthropic'.

Task 4: EDIT src/__tests__/unit/providers/claude-code-harness-execute.test.ts (L1218)
  - FIND: `expect(events[0].metadata.provider).toBe('claude-code');`
  - REPLACE WITH: `expect(events[0].metadata.provider).toBe('anthropic');`
  - ALSO CHECK: the enclosing `it('should yield metadata event first', ...)` at L1199 — name is
    already value-neutral, no rename required.
  - WHY: ClaudeCodeHarness.normalizeModel hardcodes parseModelSpec(model, 'anthropic') and
    enforces provider === 'anthropic' (else ConfigError). So modelSpec.provider is always 'anthropic'.

Task 5: VERIFY no other metadata.provider assertions reference the old literals
  - RUN: `grep -rn "metadata.provider" src/__tests__/`
  - EXPECT exactly 2 matches, both now asserting 'anthropic'.
  - RUN: `grep -rn "metadata: { provider" src/__tests__/` (the PRD-suggested belt-and-braces check)
  - EXPECT: no assertion references the old harness-id values ('pi' / 'claude-code') for metadata.provider.
```

### Implementation Patterns & Key Details

```python
# The edit is a one-token, in-place swap on the `provider` property of the yielded metadata object.
# Both sites are structurally identical except PiHarness adds `satisfies Extract<StreamEvent, { type: "metadata" }>`.

# PiHarness AFTER (src/harnesses/pi-harness.ts):
    yield {
      type: "metadata",
      metadata: {
        requestId: `${this.id}-${Date.now()}`,   # UNCHANGED — harness-scoped request id
        model: modelSpec.model,                   # UNCHANGED — already correct
        provider: modelSpec.provider,             # CHANGED: was this.id ('pi')
      },
    } satisfies Extract<StreamEvent, { type: "metadata" }>;

# ClaudeCodeHarness AFTER (src/harnesses/claude-code-harness.ts):
    yield {
      type: "metadata",
      metadata: {
        requestId: `${this.id}-${Date.now()}`,   # UNCHANGED
        model: modelSpec.model,                   # UNCHANGED
        provider: modelSpec.provider,             # CHANGED: was this.id ('claude-code')
      },
    };

# TYPE CHECK: modelSpec.provider is ModelProviderId (a string subtype). The metadata arm is
# typed `provider: string`. Assigning ModelProviderId to string is sound — no type error.
# The `satisfies` narrowing on the PiHarness site is preserved unchanged and still holds.
```

### Integration Points

```yaml
# No integration points to wire. This change is isolated to the two yielded-metadata objects.
# No DB, config, routes, or new exports.
DATABASE: []
CONFIG: []
ROUTES: []
EXPORTS: []
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Type-check (the project's "lint" script is tsc --noEmit — there is no eslint/ruff step here).
npm run lint
# Expected: zero errors. The only file with a type narrowing (pi-harness.ts satisfies) is unchanged
# in shape, so this must remain green.

# (Optional) scoped type-check while iterating:
npx tsc --noEmit
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the two affected test files first (fast feedback):
npx vitest run src/__tests__/unit/providers/pi-harness-streaming.test.ts
npx vitest run src/__tests__/unit/providers/claude-code-harness-execute.test.ts
# Expected: ALL tests pass, including the two updated metadata assertions (.toBe('anthropic')).

# If either metadata test FAILS, the resolved modelSpec.provider is not 'anthropic' — re-read
# the test's request model and recompute via parseModelSpec BEFORE changing the literal again.
# Do NOT blindly swap to another value; trace the actual resolution.
```

### Level 3: Integration Testing (System Validation)

```bash
# Full suite (npm test = vitest run). Confirms no other test depended on the old value.
npm test
# Expected: green. The ONLY acceptable failure is the pre-existing, OUT-OF-SCOPE
# src/__tests__/adversarial/edge-case.test.ts "unicode in workflow names" test (Issue 5),
# which is unrelated to PRD §7. If that is the sole failure, the task still satisfies its
# success criteria — but flag it; do not attempt to fix it here.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Grep audit (the PRD §4 "do not assume" guard) — confirms no stale assertion lingers.
grep -rn "metadata.provider" src/__tests__/
# Expected output (exactly these two lines, both now 'anthropic'):
#   src/__tests__/unit/providers/claude-code-harness-execute.test.ts:1218:  expect(events[0].metadata.provider).toBe('anthropic');
#   src/__tests__/unit/providers/pi-harness-streaming.test.ts:210:          expect(events[0].metadata.provider).toBe('anthropic');

# Belt-and-braces (PRD-suggested alternate pattern):
grep -rn "metadata: { provider" src/__tests__/
# Expected: no matches asserting 'pi' or 'claude-code' as the streaming metadata provider.

# Runtime sanity (optional, manual): stream a prompt through either harness and inspect the
# first yielded event — metadata.provider should be the LLM host ('anthropic'), not the harness id.
# (Both unit tests already cover this via the mocked SDK paths, so this is optional confirmation.)
```

## Final Validation Checklist

### Technical Validation
- [ ] `npm run lint` (tsc --noEmit) green.
- [ ] `npm test` (vitest run) green (modulo the known out-of-scope Issue 5 unicode failure).
- [ ] `npx vitest run src/__tests__/unit/providers/pi-harness-streaming.test.ts` green.
- [ ] `npx vitest run src/__tests__/unit/providers/claude-code-harness-execute.test.ts` green.
- [ ] `grep -rn "metadata.provider" src/__tests__/` shows exactly 2 matches, both `'anthropic'`.

### Feature Validation
- [ ] `provider: modelSpec.provider` at both emission sites (pi-harness.ts L380, claude-code-harness.ts L702).
- [ ] `requestId` still embeds `this.id` (untouched) at both sites.
- [ ] `model: modelSpec.model` untouched at both sites.
- [ ] Both updated metadata tests assert `'anthropic'` and pass.
- [ ] No `satisfies` narrowing removed/added on either site (PiHarness keeps it; ClaudeCode stays without).

### Code Quality Validation
- [ ] No new files, no new imports, no new symbols (pure value swap).
- [ ] No change to unrelated `provider` fields elsewhere (Agent harness-selection `provider`, `providerId` on results).
- [ ] Out-of-scope Issue 5 (unicode workflow name) NOT touched.

### Documentation & Deployment
- [ ] (Optional) test name at pi-harness-streaming.test.ts L201 updated if it hardcoded 'pi'.
- [ ] No new env vars / config / exported symbols.

---

## Anti-Patterns to Avoid

- ❌ Don't touch `requestId` or `model` — only `provider` is wrong.
- ❌ Don't remove/add the `satisfies` narrowing to "match" the other harness — that's a separate
  inconsistency, out of scope.
- ❌ Don't assume the test value is `'anthropic'` without tracing — for PiHarness it depends on
  the (currently-unset) global `defaultModelProvider`; for ClaudeCode it's hardcoded. Both resolve
  to `'anthropic'` TODAY; if the Pi test ever wires `configureHarnesses({ defaultModelProvider })`,
  recompute the expected literal.
- ❌ Don't edit the many `new Agent({ provider: 'claude-code' })` lines in the integration tests —
  those select a HARNESS, not a streaming-metadata provider.
- ❌ Don't bundle Issue 5's unicode fix into this task — it is explicitly out of scope.
- ❌ Don't restructure the yielded object or the async generator — single-token in-place swap only.

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success.

Rationale: The fix surface is precisely two one-token production edits and two one-literal
test edits, all at exact known line numbers with the resolved expected value (`'anthropic'`)
fully traced for both sites (with distinct, documented reasons). The only residual risk is a
future change to global `defaultModelProvider` defaulting — mitigated by the explicit
"recompute, don't assume" guard in Tasks 3–4 and Anti-Patterns. The change is type-safe
(ModelProviderId → string), touches no integration points, and is covered by the two tests
being updated.

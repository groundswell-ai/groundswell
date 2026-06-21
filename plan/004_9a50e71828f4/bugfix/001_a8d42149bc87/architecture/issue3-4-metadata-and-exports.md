# Issue 3 & Issue 4 — Verification Report

**Scope:** Scout-only investigation of two MINOR issues. This report captures exact code
locations and verifies each claim from the PRD. No files were modified beyond this report
and `progress.md`.

---

## MINOR Issue 3 — Streaming `metadata.provider` conflates harness id with model provider

### Claim
At the `metadata` StreamEvent emission sites in both `PiHarness` and `ClaudeCodeHarness`,
the event is emitted with `provider: this.id` — which is the **harness id**
(`'pi'` | `'claude-code'`), NOT the resolved LLM provider (e.g. `'anthropic'`). The
`StreamEvent.metadata.provider` field semantically denotes the LLM host, so this is a
conflation bug. The resolved `modelSpec` (which carries the correct `.provider`) IS in
scope at both sites, so the fix is a one-token change: `provider: this.id` →
`provider: modelSpec.provider`.

### Finding 3.1 — PiHarness emission site

**File:** `src/harnesses/pi-harness.ts`
**Lines:** 374–382 (inside `executeStreaming`, the async generator)

```ts
    // Yield metadata FIRST (mirror ClaudeCodeHarness L696-701).
    yield {
      type: "metadata",
      metadata: {
        requestId: `${this.id}-${Date.now()}`,
        model: modelSpec.model,
        provider: this.id,
      },
    } satisfies Extract<StreamEvent, { type: "metadata" }>;
```

- `this.id` is `'pi'` (the harness id).
- `modelSpec` is in scope — defined at **`src/harnesses/pi-harness.ts:358`**:
  ```ts
  const modelSpec = this.normalizeModel(request.options.model ?? "claude-sonnet-4-20250514");
  ```
- `normalizeModel` (`src/harnesses/pi-harness.ts:771-774`) delegates to `parseModelSpec`
  with the open `ModelProviderId` set, returning `{ provider, model, raw }`.
- The `model` field is correctly sourced from `modelSpec.model`; only `provider` is wrong.

### Finding 3.2 — ClaudeCodeHarness emission site

**File:** `src/harnesses/claude-code-harness.ts`
**Lines:** 696–704 (inside `executeStreaming`, the async generator)

```ts
    // Yield metadata event first
    yield {
      type: "metadata",
      metadata: {
        requestId: `${this.id}-${Date.now()}`,
        model: modelSpec.model,
        provider: this.id,
      },
    };
```

- `this.id` is `'claude-code'` (the harness id).
- `modelSpec` is in scope — defined at **`src/harnesses/claude-code-harness.ts:666-669`**:
  ```ts
    const modelSpec = this.normalizeModel(
      request.options.model ?? "claude-sonnet-4-20250514",
    );
  ```
- Note the ClaudeCodeHarness site omits the `satisfies Extract<StreamEvent, { type: "metadata" }>`
  narrowing that the PiHarness site uses — a minor inconsistency, but not the bug under
  investigation.
- The same `model` is correctly sourced from `modelSpec.model`; only `provider` is wrong.

### Finding 3.3 — `StreamEvent` metadata type definition

**File:** `src/types/streaming.ts`
**Line:** 41

```ts
  | { type: 'metadata'; metadata: { requestId?: string; model?: string; provider: string } }
```

- `provider` is the only **required** field of the metadata payload (`requestId` and `model`
  are optional). This confirms the field is semantically load-bearing and consumers depend
  on it.
- The discriminated-union arm is the only `metadata` variant in `StreamEvent`.

### Finding 3.4 — `ModelSpec` interface confirms `.provider` exists

**File:** `src/types/harnesses.ts`
**Lines:** 229–238

```ts
export interface ModelSpec {
  /** LLM host — NOT the harness */
  provider: ModelProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}
```

- The JSDoc explicitly states "LLM host — NOT the harness," which is the semantic the
  streaming `metadata.provider` field is supposed to carry.
- `ModelProviderId` is the open-set type (PRD §7.8) — values like `'anthropic'`, `'openai'`, etc.

### Finding 3.5 — `parseModelSpec` returns the provider correctly

**File:** `src/utils/model-spec.ts`
**Lines:** 58–96 (function body)

Both branches return `{ provider, model, raw }`:

- Plain format (single segment, line 78): `return { provider: defaultProvider, model: parts[0], raw };`
- Qualified format (two segments, line 95): `return { provider, model: modelName, raw };`

So `modelSpec.provider` is reliably populated at both emission sites.

### Issue 3 — Summary

| Aspect | Status |
|---|---|
| Claim: `provider: this.id` at both sites | ✅ Confirmed (pi-harness.ts:380, claude-code-harness.ts:702) |
| Claim: `modelSpec` in scope at both sites | ✅ Confirmed (pi-harness.ts:358, claude-code-harness.ts:666) |
| Claim: `modelSpec.provider` is the correct value | ✅ Confirmed (types/harnesses.ts:230, utils/model-spec.ts:78/95) |
| Claim: `StreamEvent.metadata.provider` is required | ✅ Confirmed (types/streaming.ts:41) |
| Fix surface | 2 one-token edits: `this.id` → `modelSpec.provider` |

**Residual risk / open question:** Existing snapshot tests may assert `provider: 'pi'`
or `provider: 'claude-code'` on the metadata event. A test grep should be run before the
fix lands (e.g. `grep -rn "provider: 'pi'\|provider: 'claude-code'" src/__tests__`).

---

## MINOR Issue 4 — `registerDefaultHarnesses` not exported from public barrel & never auto-invoked

### Claim
`registerDefaultHarnesses` is exported only from the internal barrel `src/harnesses/index.ts`,
NOT from the public barrel `src/index.ts`. It is also never auto-invoked anywhere in
production source — `HarnessRegistry.getInstance()` returns an empty registry. Consumers
who import the singleton directly get no default harnesses registered.

### Finding 4.1 — Internal barrel exports it

**File:** `src/harnesses/index.ts`
**Line:** 21

```ts
export { registerDefaultHarnesses } from './register-defaults.js';
```

This is the harness-internal barrel (not the public package entry).

### Finding 4.2 — Public barrel does NOT re-export it

**File:** `src/index.ts`

The full harness-related export surface from the public barrel is:

| Symbol | Line | Kind |
|---|---|---|
| `ClaudeCodeHarness`, `AnthropicProvider` | `// Providers` block | value |
| `HarnessRegistry`, `ProviderRegistry` | `// Providers` block | value (deprecated alias) |
| `PiHarness` | `// Harness adapters` block | value |
| `configureHarnesses` | `// Harness configuration` block | value |
| `parseModelSpec`, `formatModelForProvider` | `// Harness configuration` block | value |
| Types: `Harness`, `HarnessId`, `ModelProviderId`, `HarnessCapabilities`, `HarnessOptions`, `HarnessRequest`, `HarnessHookEvents`, `GlobalHarnessConfig`, `ModelSpec` | `// Harness types` block (inside `./types/index.js`) | type-only |

**`registerDefaultHarnesses` is ABSENT.** A grep for `registerDefaultHarnesses` in
`src/index.ts` returns no matches (confirmed via `grep`).

### Finding 4.3 — `registerDefaultHarnesses` function body

**File:** `src/harnesses/register-defaults.ts`
**Lines:** 28–48

```ts
export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  // Claude Code harness — Anthropic-only (PRD §7.8).
  const CLAUDE_CODE: HarnessId = 'claude-code';
  if (!registry.has(CLAUDE_CODE)) {
    registry.register(new ClaudeCodeHarness());
  }

  // Pi harness — vendor-neutral DEFAULT (PRD §7.1, §7.6). defaultHarness is already 'pi' in
  // src/utils/harness-config.ts (DEFAULT_HARNESS_CONFIG); this registration pairs the id with a
  // live instance so registry.get('pi') resolves. Idempotent (guard mirrors the claude-code block).
  const PI: HarnessId = 'pi';
  if (!registry.has(PI)) {
    registry.register(new PiHarness());
  }

  return registry;
}
```

- Default arg: `HarnessRegistry.getInstance()` — the singleton.
- Idempotent via `registry.has(id)` guards (required because `HarnessRegistry.register()`
  throws on duplicate — see `harness-registry.ts` register() method).
- Registers exactly two harnesses: `ClaudeCodeHarness` (id `'claude-code'`) and
  `PiHarness` (id `'pi'`).
- Returns the registry for chaining/testing.

### Finding 4.4 — `HarnessRegistry.getInstance()` does NOT auto-register defaults

**File:** `src/harnesses/harness-registry.ts`

The singleton is lazily created with an EMPTY provider map:

```ts
  private static instance: HarnessRegistry;
  private providers: Map<ProviderId, Provider> = new Map();
  private states: Map<ProviderId, ProviderInitState> = new Map();

  private constructor() {
    // Empty constructor for S1
    // Future subtasks may initialize with configuration
  }

  public static getInstance(): HarnessRegistry {
    if (!HarnessRegistry.instance) {
      HarnessRegistry.instance = new HarnessRegistry();
    }
    return HarnessRegistry.instance;
  }
```

- No call to `registerDefaultHarnesses` inside `getInstance()` or the constructor.
- The registry **starts empty** — consumers must register harnesses explicitly (or call
  `registerDefaultHarnesses()`).

### Finding 4.5 — No production callers of `registerDefaultHarnesses()`

Command run:
```bash
grep -rn "registerDefaultHarnesses(" /home/dustin/projects/groundswell/src/ --include="*.ts"
```

Results (every match):

| File:line | Context |
|---|---|
| `src/harnesses/register-defaults.ts:17` | JSDoc **example** (`const registry = registerDefaultHarnesses();`) — NOT a call |
| `src/harnesses/register-defaults.ts:28` | **Function definition** (`export function registerDefaultHarnesses(...)`) |
| `src/__tests__/unit/providers/register-defaults.test.ts:25,31,36,41,42,49,54` | **Test** callers only |

A separate grep of `src/core/` returns **no matches** — `agent.ts`, `factory.ts`, and the
rest of the core do NOT call `registerDefaultHarnesses()`.

**Conclusion:** `registerDefaultHarnesses()` is invoked exclusively by tests. Zero
production callers exist. Any consumer relying on `HarnessRegistry.getInstance()` to be
populated with defaults will get an empty registry.

### Issue 4 — Summary

| Aspect | Status |
|---|---|
| Claim: exported from `src/harnesses/index.ts` | ✅ Confirmed (line 21) |
| Claim: NOT re-exported from `src/index.ts` | ✅ Confirmed (absent; harness exports enumerated above) |
| Claim: registers PiHarness + ClaudeCodeHarness into singleton | ✅ Confirmed (register-defaults.ts:28-48) |
| Claim: registry starts empty (no lazy auto-registration) | ✅ Confirmed (harness-registry.ts constructor + getInstance) |
| Claim: never auto-invoked in production | ✅ Confirmed (only test + JSDoc callers; `src/core/` has zero matches) |
| Fix surface (per PRD §Suggested Fix) | Either (a) add `export { registerDefaultHarnesses } from './harnesses/index.js';` to `src/index.ts`, or (b) document the explicit `registry.register(new ...)` pattern. Note PRP `P2M1T1S2` GOTCHA #5 / #10 explicitly **forbids** auto-invoking on import and (originally) adding to `src/index.ts` — so the fix is a policy decision, not mechanical. |

**Residual risk / open question:** PRP `P2M1T1S2` deliberately kept
`registerDefaultHarnesses` OUT of the public barrel and explicitly forbids auto-invocation
on import (to avoid polluting the singleton in every test). The "fix" for Issue 4 is
therefore a **deliberate API-surface decision**, not a clear-cut bug. Confirm with the
supervisor whether the intended resolution is (a) re-export from `src/index.ts`, (b)
auto-register lazily inside `getInstance()`, or (c) accept current behavior and just
document it.

---

## Cross-cutting notes

- Both issues are localized and independently fixable. Issue 3 is a clear semantic bug with
  a trivial mechanical fix (2 one-token edits). Issue 4 is more of an API-surface/policy
  decision with prior PRP precedent against the "obvious" fix.
- No files outside this report and `progress.md` were modified.

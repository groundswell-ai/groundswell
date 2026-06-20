# PRP — P1.M1.T1.S1: Create `harnesses.ts` with core harness interfaces

**PRD reference:** §7.2 (HarnessId), §7.3 (Harness interface), §7.4 (HarnessCapabilities),
§7.5 (HarnessOptions), §7.8 (Model & Provider / ModelProviderId), §7.10 (Tool Execution),
§7.11 (Hook Adaptation).
**Plan:** `plan/004_9a50e71828f4/` — first task of the v1.2 Harness/Provider split.
**Scope tag:** PURE TYPES. No runtime code. No re-export wiring (that is S3 / P3.M3.T1.S1).

---

## Goal

**Feature Goal:** Create a new standalone, ESM, type-only module `src/types/harnesses.ts`
that defines the entire v1.2 Harness + ModelProvider type surface. This file is the
foundation every downstream harness task (registry, adapters, agent rewire, public API)
imports from.

**Deliverable:** One new file — `src/types/harnesses.ts` — exporting exactly:
`HarnessId`, `ModelProviderId`, `HarnessCapabilities`, `HarnessOptions`,
`HarnessExecutionOptions`, `HarnessHookEvents`, `HarnessRequest`,
`ToolExecutionRequest`, `ToolExecutionResult`, `ModelSpec`, and the `Harness` interface.

**Success Definition:**
1. `npm run lint` (`tsc --noEmit`) passes with the new file present (it is covered by the
   `src/**/*` include glob and type-checked immediately, even before S3 wires re-exports).
2. Every type listed above is exported and importable via `import type { ... } from './harnesses.js'`.
3. Zero runtime code — only `import type` statements and `export interface`/`export type`.
4. The `Harness.execute<T>()` return type is EXACTLY
   `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`.
5. `harnesses.ts` compiles in isolation (only depends on `./sdk-primitives.js`,
   `./agent.js`, `./streaming.js` — all pre-existing).

---

## User Persona

**Target User:** Groundswell core maintainers + the downstream PRP agents implementing
S2 (GlobalHarnessConfig/parseModelSpec), P1.M1.T3 (deprecated Provider* aliases),
P2 (ClaudeCodeHarness/PiHarness adapters), and P3 (Agent + public API rewire).

**Use Case:** Every adapter, the registry, the agent runtime, and the public API will
`import type` from this file. It is the single source of truth for the harness contract.

**Pain Points Addressed:** Today the runtime axis (agent SDK/loop) and the model-vendor
axis are conflated into one `ProviderId = "anthropic" | "opencode"`. This file introduces
the two orthogonal axes (`HarnessId` + `ModelProviderId`) the rest of v1.2 builds on.

---

## Why

- **Unblocks the whole v1.2 migration.** `grep -rln "Harness" src/` currently returns 0
  files. This task creates the canonical type vocabulary every later task references
  (system_context.md §2 "Verified reality").
- **Decouples harness from provider.** PRD §7 mandates `HarnessId ⊥ ModelProviderId`.
  This file encodes that split at the type level before any runtime changes.
- **Zero-risk landing.** Pure types, no consumers yet → cannot break the build. The file
  sits dormant until S3 re-exports it, so it ships independently and reversibly
  (system_context.md §6 sequencing step 1).

---

## What

A new TypeScript module `src/types/harnesses.ts` containing ONLY type declarations that:

- Split the old single `ProviderId` axis into `HarnessId` (runtime) and `ModelProviderId`
  (LLM host, open string union).
- Mirror the existing `ProviderCapabilities` / `ProviderHookEvents` / `Provider` interface
  shapes 1:1 under new `Harness*` names.
- Slim `HarnessOptions` vs. the old `ProviderOptions` (drop session-store fields).
- Merge `ProviderRequest` + `ProviderExecutionOptions` into `HarnessRequest`.
- Copy `ToolExecutionRequest` / `ToolExecutionResult` verbatim from `providers.ts`.

### Success Criteria

- [ ] `src/types/harnesses.ts` exists and exports every type listed in Deliverable.
- [ ] `npm run lint` passes (zero `tsc` errors).
- [ ] No `sessionStore` / `sessionPersistence` / `sessionTtl` / `sessionPath` on `HarnessOptions`.
- [ ] `ModelProviderId` is an OPEN set (`'anthropic' | 'openai' | 'google' | 'zai' | (string & {})`).
- [ ] `execute<T>()` returns the exact union type from Success Definition #4.
- [ ] Only `import type` + `.js` extensions are used for all imports.

---

## All Needed Context

### Context Completeness Check

✅ "No Prior Knowledge" test: A developer who has never seen this repo can implement this
file using only (a) this PRP, (b) the reference implementation in the Implementation
Blueprint, and (c) read-only access to `src/types/providers.ts`, `sdk-primitives.ts`,
`agent.ts`, `streaming.ts`. Every required dependency type and its exact location is named below.

### Documentation & References

```yaml
# MUST READ — the authoritative source of the old types being ported/split.
- file: src/types/providers.ts
  why: 1:1 port source. HarnessCapabilities/Options/HookEvents/Request/ToolExecution* are
        mechanical renames/merges of ProviderCapabilities/ProviderOptions/ProviderHookEvents/
        ProviderRequest(+ProviderExecutionOptions)/ToolExecutionRequest/ToolExecutionResult.
  pattern: 'export interface Provider { ... }' and 'export interface ProviderOptions { ... }'
  gotcha: ProviderOptions ALSO carries sessionStore/sessionPersistence/sessionTtl/sessionPath —
          these are adapter internals and MUST be dropped from HarnessOptions (see work-item LOGIC).

# MUST READ — the exact contract being defined (verbatim interfaces).
- url: PRD.md §7.2–§7.5, §7.8, §7.10, §7.11   (in repo root, also plan/004_9a50e71828f4/prd_snapshot.md)
  why: Authoritative field lists & the execute<T>() return type union.
  critical: §7.8 — harness is NEVER part of the model string; provider axis = ModelProviderId.

# MUST READ — the architecture summary (verified old→new mapping + sequencing + risks).
- file: plan/004_9a50e71828f4/docs/system_context.md
  why: §3 "Target Type Mapping" gives the exact rename table; §6 step 1 = this task;
        §7 risk note on SessionState being SDK-shaped (why we keep store types OUT of HarnessOptions).
- file: plan/004_9a50e71828f4/docs/external_deps.md
  why: §1.3 confirms ModelProviderId open set ('anthropic'|'openai'|'google'|'zai') matches Pi SDK.

# Dependency types imported BY harnesses.ts (all pre-existing, read-only):
- file: src/types/sdk-primitives.ts
  why: Provides Tool, MCPServer, Skill (used by Harness.registerMCPs/loadSkills + HarnessExecutionOptions.tools).
- file: src/types/agent.ts
  why: Provides AgentResponse<T> (execute<T> return payload). Defined at lines ~264/382/445.
- file: src/types/streaming.ts
  why: Provides StreamEvent (the AsyncGenerator yield type in execute<T>).

# PROOF of signature parity — read-only confidence check, do NOT modify.
- file: src/providers/anthropic-provider.ts
  why: Lines 338–344 show execute<T>(request, toolExecutor, hooks?) returning the EXACT same union
        as PRD §7.3. Confirms the contract is already implemented upstream; this task only
        formalizes the type. (ClaudeCodeHarness in P2.M1 is a rename of this class.)

# Test pattern to mirror if you add the optional type-test (Task 2).
- file: src/__tests__/unit/provider-result-types.test.ts
  why: Vitest type-only test asserting interface shapes via runtime constructors + `import type`.
        This is the codebase's convention for validating pure-type modules.
```

### Current Codebase Tree (relevant slice)

```bash
src/types/
├── agent.ts            # AgentResponse<T> (+ AgentResponseStatus/ErrorDetails/Metadata) — IMPORT
├── providers.ts        # OLD Provider* family — the 1:1 port source (READ-ONLY for this task)
├── sdk-primitives.ts   # Tool, MCPServer, Skill, TokenUsage — IMPORT
├── streaming.ts        # StreamEvent — IMPORT
├── index.ts            # barrel re-exports — DO NOT TOUCH (S3 / P3.M3.T1.S1 owns Harness exports here)
└── (other type files)  # unrelated to this task
plan/004_9a50e71828f4/docs/
├── system_context.md   # §3 mapping, §6 sequencing, §7 risks
└── external_deps.md    # verified SDK/model-provider facts
```

### Desired Codebase Tree (this task adds exactly one file)

```bash
src/types/
└── harnesses.ts        # NEW — the Harness* + ModelProviderId type surface (pure types)
```

> No other file is created or modified by THIS task. `types/index.ts` and root
> `src/index.ts` re-exports are added in **S3 (P3.M3.T1.S1)**; deprecated `Provider*`
> aliases are added in **P1.M1.T3**. Do NOT do their work here.

### Known Gotchas of Our Codebase & Library Quirks

```ts
// CRITICAL: This is an ESM project ("type": "module", module/moduleResolution = ES2022/bundler).
// ALL relative imports MUST use `import type` AND the `.js` extension, even though the
// source is `.ts`. Example:  import type { AgentResponse } from './agent.js';
// (see existing convention in src/types/providers.ts lines 1-3).

// CRITICAL: tsconfig has `isolatedModules: true`. Never re-export a type with a bare
// `export { Foo }` — use `export type { Foo }`. (This task only DEFINES new types, so it
// only needs `export interface`/`export type` declarations — safe.)

// GOTCHA: `(string & {})` is the standard TS idiom for an "open union": it keeps IDE
// autocomplete on the literal members ('anthropic' | 'openai' | ...) while still
// accepting ANY string. Use it verbatim for ModelProviderId (PRD §7.8).

// GOTCHA: The old ProviderOptions carries sessionStore/sessionPersistence/sessionTtl/sessionPath.
// These are SDK-specific session internals (Anthropic-SDK-shaped SessionState) and belong to
// ADAPTER internals (system_context.md §7 risk note). DROP them from HarnessOptions per the
// work-item LOGIC. apiKey is KEPT (harness forwards it to the provider — it is not harness-owned).

// GOTCHA: `ModelSpec` must be defined HERE (in S1), not deferred to S2. Reason: the S1-required
// `Harness.normalizeModel(model): ModelSpec` cannot compile without it. S2 then adds
// GlobalHarnessConfig + parseModelSpec/formatModelForProvider FUNCTIONS — it must NOT redefine
// ModelSpec. (Flagged explicitly below so S2's PRP author is aware.)
```

---

## Implementation Blueprint

### Data Models and Structure

This task defines only TypeScript interfaces/type aliases. The complete, compilable
reference implementation is given in the "Implementation Patterns" section — copy it
verbatim and adjust JSDoc as desired. No classes, no functions, no runtime values.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/types/harnesses.ts   (PRIMARY — mandatory)
  FILES:
    - CREATE: src/types/harnesses.ts
  IMPLEMENT: the eleven exports listed in Deliverable, in this order:
    1. import type { Tool, MCPServer, Skill } from './sdk-primitives.js'
    2. import type { AgentResponse } from './agent.js'
    3. import type { StreamEvent } from './streaming.js'
    4. export type HarnessId = 'pi' | 'claude-code'
    5. export type ModelProviderId = 'anthropic' | 'openai' | 'google' | 'zai' | (string & {})
    6. export interface HarnessCapabilities  { mcp, skills, lsp, streaming, sessions, extendedThinking: boolean }
    7. export interface HarnessOptions       { endpoint?, apiKey?, sessionId?, timeout?, headers? }   # SLIMMED — no session-store fields
    8. export interface HarnessHookEvents    { onToolStart?, onToolEnd?, onSessionStart?, onSessionEnd?, onStream? }
    9. export interface ToolExecutionRequest { name: string; input: unknown }                         # verbatim from providers.ts
   10. export interface ToolExecutionResult  { content: string|unknown; isError: boolean }             # verbatim from providers.ts
   11. export interface HarnessExecutionOptions { model?, systemPrompt?, tools?:Tool[], hooks?, sessionId?, streaming? }
   12. export interface HarnessRequest       { prompt: string; options: HarnessExecutionOptions }
   13. export interface ModelSpec            { provider: ModelProviderId; model: string; raw: string }
   14. export interface Harness (see exact method surface below)
  FOLLOW pattern: src/types/providers.ts (JSDoc density + `@example` blocks + readonly members)
  NAMING: PascalCase interfaces, camelCase fields. `Harness*` prefix (NOT `Provider*`).
  PLACEMENT: src/types/harnesses.ts (new file, sibling of providers.ts).
  IMPORTS: `import type` ONLY, with `.js` extensions (ESM + isolatedModules).
  MOCK/RUNTIME: NONE — pure type declarations.

Task 2: CREATE src/__tests__/unit/harnesses-types.test.ts   (RECOMMENDED — TDD convention)
  FILES:
    - CREATE: src/__tests__/unit/harnesses-types.test.ts
  IMPLEMENT: Vitest type-shape tests mirroring provider-result-types.test.ts:
    - assert HarnessId narrows to 'pi' | 'claude-code'
    - assert ModelProviderId accepts the 4 literals AND an arbitrary string (open set)
    - construct a HarnessCapabilities/HarnessOptions/HarnessRequest/ModelSpec object literal
      to confirm field shapes compile (TS structural check)
    - declare a `const h: Harness = ... ` ONLY as `type` probe if desired (interface satisfaction)
    - assert ToolExecutionRequest/Result match the verbatim shape
  FOLLOW pattern: src/__tests__/unit/provider-result-types.test.ts (imports via `import type`,
        uses `describe/it/expect` from 'vitest', constructs objects to prove shapes).
  NAMING: test_{concept}_{scenario}.
  NOTE: tests/ is excluded from the tsc build (tsconfig exclude: src/__tests__), so this file
        never affects `npm run lint`. It is a green-field safety net only.
  COVERAGE: every exported type referenced at least once.

# OUT OF SCOPE — do NOT do these (owned by other tasks):
#   - Re-export Harness* from src/types/index.ts or root src/index.ts  → S3 / P3.M3.T1.S1
#   - Add deprecated Provider* aliases pointing at Harness*             → P1.M1.T3.S1
#   - Touch src/types/providers.ts, anthropic-provider.ts, or any runtime file
#   - Add GlobalHarnessConfig / parseModelSpec / formatModelForProvider → S2 (P1.M1.T1.S2)
```

### Implementation Patterns & Key Details

> This is the **complete reference implementation** of `src/types/harnesses.ts`. It compiles
> against the existing repo (verified import paths: `./sdk-primitives.js`, `./agent.js`,
> `./streaming.js`). Use it as the authoritative source of truth for field names, optionality,
> and the execute signature.

```ts
// src/types/harnesses.ts
import type { Tool, MCPServer, Skill } from './sdk-primitives.js';
import type { AgentResponse } from './agent.js';
import type { StreamEvent } from './streaming.js';

/**
 * Harness identifier (PRD §7.2).
 *
 * The agent runtime/SDK that drives prompting, tool execution, streaming, and
 * sessions. This axis is ORTHOGONAL to the LLM provider/model — the two are
 * chosen independently (PRD §7). The harness NEVER appears in the model string.
 */
export type HarnessId = 'pi' | 'claude-code';

/**
 * LLM host / model provider (PRD §7.8).
 *
 * Open set: the well-known providers get IDE autocomplete via the `(string & {})`
 * idiom, but ANY provider string is valid (e.g. a custom provider registered with a
 * harness's model registry). This is the LLM vendor axis — NOT the harness.
 */
export type ModelProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'zai'
  | (string & {});

/**
 * Harness capability flags (PRD §7.4). Identical shape to the legacy
 * ProviderCapabilities. Unsupported features are advertised here rather than
 * silently degrading (PRD §7.14).
 */
export interface HarnessCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}

/**
 * Harness-level configuration options (PRD §7.5).
 *
 * Intentionally SLIMMED relative to the legacy ProviderOptions: the session-store
 * fields (sessionStore, sessionPersistence, sessionTtl, sessionPath) are adapter
 * internals and live on the concrete harness, not on the shared harness contract
 * (system_context.md §3 / §7 risk note). `apiKey` is forwarded to the LLM provider
 * — it is not owned by the harness.
 *
 * Harness implementations MAY extend this with harness-specific fields (e.g.
 * `skillsDirs?: string[]` on a `pi` adapter) per PRD §7.5.
 */
export interface HarnessOptions {
  /** API endpoint override */
  endpoint?: string;
  /** API key (forwarded to the LLM provider) */
  apiKey?: string;
  /** Session/resume id */
  sessionId?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Hook events adapted from AgentHooks to harness-specific lifecycle (PRD §7.11).
 * Identical to the legacy ProviderHookEvents.
 */
export interface HarnessHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number,
  ) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}

/**
 * Tool execution request (PRD §7.10). Copied VERBATIM from providers.ts.
 * Tools are executed locally via MCPHandler regardless of harness.
 */
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;
  /** Tool input parameters */
  input: unknown;
}

/**
 * Tool execution result (PRD §7.10). Copied VERBATIM from providers.ts.
 */
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;
  /** Whether the execution resulted in an error */
  isError: boolean;
}

/**
 * Execution options carried inside a {@link HarnessRequest} (PRD §7.3 + §7.10).
 * Mirrors the legacy ProviderExecutionOptions; named separately for adapter reuse.
 */
export interface HarnessExecutionOptions {
  /** Model identifier ("provider/model" or plain — never harness-qualified; PRD §7.8) */
  model?: string;
  /** System prompt override */
  systemPrompt?: string;
  /** Available tools */
  tools?: Tool[];
  /** Lifecycle hooks */
  hooks?: HarnessHookEvents;
  /** Session identifier for session-based harnesses */
  sessionId?: string;
  /** Enable streaming mode (returns AsyncGenerator instead of a complete response) */
  streaming?: boolean;
}

/**
 * Harness execution request (PRD §7.3). Merges the legacy ProviderRequest +
 * ProviderExecutionOptions (system_context.md §3 mapping).
 */
export interface HarnessRequest {
  /** The user prompt/message */
  prompt: string;
  /** Execution options */
  options: HarnessExecutionOptions;
}

/**
 * Parsed model identifier (PRD §7.8).
 *
 * `provider` is the LLM host (ModelProviderId) — NEVER the harness. Format is
 * `provider/model` (e.g. `anthropic/claude-sonnet-4-20250514`) or a plain model id
 * resolved against the configured `defaultModelProvider`.
 *
 * NOTE: Defined here (in S1) rather than S2 because {@link Harness.normalizeModel}
 * references it and must compile. S2 (P1.M1.T1.S2) adds GlobalHarnessConfig +
 * parseModelSpec/formatModelForProvider FUNCTIONS and must NOT redefine this interface.
 */
export interface ModelSpec {
  /** LLM host — NOT the harness */
  provider: ModelProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}

/**
 * The shared harness contract both `PiHarness` and `ClaudeCodeHarness` implement
 * (PRD §7.3). Identical method surface to the legacy Provider interface; the
 * `execute<T>()` return type matches the already-shipped AnthropicProvider.execute
 * (src/providers/anthropic-provider.ts lines 338–344).
 *
 * Adapters: PiHarness wraps `createAgentSession()`; ClaudeCodeHarness (rename of
 * AnthropicProvider) wraps the Claude Code SDK. New harnesses implement this and
 * register with HarnessRegistry (§7.6, owned by P1.M2).
 */
export interface Harness {
  /** Unique harness identifier (one of the supported HarnessId values) */
  readonly id: HarnessId;
  /** Capability flags for feature detection */
  readonly capabilities: HarnessCapabilities;

  /** Initialize the harness with optional configuration (SDK clients, connections). */
  initialize(options?: HarnessOptions): Promise<void>;
  /** Terminate the harness and release resources. */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request with a type-safe response (PRD §7.3).
   *
   * `toolExecutor` delegates tool calls back to Groundswell's MCPHandler — the harness
   * only reports tool calls back, it never executes them itself (PRD §7.10 / §7.12).
   *
   * @returns `Promise<AgentResponse<T>>` for non-streaming, or an
   *          `AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` when
   *          `request.options.streaming === true`.
   */
  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  /** Register MCP servers and return the discovered tools (PRD §7.10 / §7.12). */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  /** Load skills into the harness (PRD §7.12). */
  loadSkills(skills: Skill[]): Promise<void>;
  /** Parse a model string into a ModelSpec (PRD §7.8). */
  normalizeModel(model: string): ModelSpec;
  /** Check if a single capability is supported. */
  supports(capability: keyof HarnessCapabilities): boolean;
  /** Check if ALL listed capabilities are supported (empty array → true). */
  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean;
}
```

### Integration Points

```yaml
# NONE for this task — harnesses.ts is a leaf type module with no consumers yet.
# Downstream wiring (reference only — DO NOT implement here):
TYPES_BARREL: src/types/index.ts        # S3 adds: export type { Harness*, ModelProviderId, ModelSpec } from './harnesses.js'
PUBLIC_API:    src/index.ts              # S3 (P3.M3.T1.S1) re-exports the Harness surface (+ deprecated Provider* aliases in P1.M1.T3)
DEPRECATED:    src/types/providers.ts    # P1.M1.T3.T1 turns Provider* into `@deprecated` type aliases pointing at Harness*
CONSUMERS:     src/core/agent.ts, src/cache/cache-key.ts, src/providers/*  # rewired in P2/P3
```

---

## Validation Loop

> This is a TypeScript/ESM project. The template's Python commands (ruff/mypy/pytest/uv)
> DO NOT APPLY. Use the project's real toolchain below.

### Level 1: Syntax & Type (Immediate Feedback)

```bash
# Primary gate — type-check the whole project (harnesses.ts is covered by `src/**/*`).
npm run lint          # == tsc --noEmit ; MUST exit 0

# Optional: targeted sanity check that the file is syntactically valid ESM TypeScript.
npx tsc --noEmit src/types/harnesses.ts   # bundler resolution; expect 0 errors
```

Expected: **Zero errors.** If errors appear, READ the output — the most likely causes are
(a) a missing `.js` extension on an import, (b) a typo in a dependency type name, or
(c) accidentally importing a runtime value with `import` instead of `import type`.

### Level 2: Unit / Type Tests (Component Validation) — only if Task 2 is done

```bash
npm test -- src/__tests__/unit/harnesses-types.test.ts   # vitest run, targeted
```

Expected: All assertions pass. (If Task 2 was skipped, this level is N/A — the work item
accepts `npm run lint` as the gate.)

### Level 3: Integration (System Validation) — NOT YET POSSIBLE in S1

No consumer imports `harnesses.ts` until **S3** wires re-exports and **P2/P3** rewire the
runtime. Therefore full integration validation is intentionally deferred. Do NOT attempt
`import { Harness } from 'groundswell'` here — that path is built in S3.

### Level 4: Domain-Specific Validation

```bash
# Confirm the file is type-only (no runtime artifacts) and uses correct import form.
grep -nE "^import [^{]" src/types/harnesses.ts && echo "FAIL: found a non-type import" || echo "OK: all imports are import type"
grep -nE "from '\.[^']*'" src/types/harnesses.ts | grep -vE "\.js'" && echo "FAIL: relative import missing .js" || echo "OK: all relative imports use .js"

# Confirm session-store fields were dropped from HarnessOptions.
grep -nE "sessionStore|sessionPersistence|sessionTtl|sessionPath" src/types/harnesses.ts && echo "FAIL: leaked session-store field" || echo "OK: harness options slimmed"

# Confirm ModelProviderId is the open union.
grep -nE "\(string & \{\}\)" src/types/harnesses.ts   # expect 1 match
```

Expected: all `OK` / exactly the expected match counts.

---

## Final Validation Checklist

### Technical Validation
- [ ] `npm run lint` passes (zero `tsc --noEmit` errors).
- [ ] `src/types/harnesses.ts` is type-only (Level 4 grep confirms `import type` only).
- [ ] All relative imports use `.js` extensions.
- [ ] (If Task 2 done) targeted vitest test passes.

### Feature Validation
- [ ] All eleven exports from the Deliverable are present and exported.
- [ ] `HarnessOptions` has NO session-store fields.
- [ ] `ModelProviderId` is the open `(string & {})` union with the 4 literals.
- [ ] `execute<T>()` return type is the exact `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`.
- [ ] `Harness` interface surface matches PRD §7.3 (id, capabilities, initialize, terminate, execute, registerMCPs, loadSkills, normalizeModel, supports, requiresFeatures).

### Code Quality & Boundary Validation
- [ ] JSDoc + `@example` density matches `src/types/providers.ts`.
- [ ] `readonly` on `id` and `capabilities`.
- [ ] **Boundary respected:** NO edits to `types/index.ts`, root `src/index.ts`, `providers.ts`, `anthropic-provider.ts`, or any runtime file.
- [ ] **Scope respected:** GlobalHarnessConfig / parseModelSpec / formatModelForProvider NOT added (S2). Provider* aliases NOT added (P1.M1.T3). Re-exports NOT added (S3).
- [ ] `ModelSpec` defined here is flagged for S2 (so S2 adds functions, not a redefinition).

### Documentation
- [ ] Inline JSDoc cross-references PRD section numbers.
- [ ] The ModelSpec/S2 hand-off is documented in a comment (prevents S2 from duplicating it).

---

## Anti-Patterns to Avoid

- ❌ Don't inline `HarnessExecutionOptions` fields directly in `HarnessRequest` and skip the
  named interface — adapters (P2) reference the options type by name; mirror `providers.ts`.
- ❌ Don't keep `sessionStore`/`sessionPersistence` on `HarnessOptions` "to be safe" — they are
  explicitly adapter internals (work-item LOGIC + system_context.md §7).
- ❌ Don't import `ModelSpec` from the OLD `./providers.js` (its `provider` is the closed
  `ProviderId`) — define the open-set `ModelSpec` HERE so the provider axis is correct from day one.
- ❌ Don't add a `ToolExecutor` named alias export to `harnesses.ts` unless also updating
  consumers — the PRD §7.3 / work-item spec inlines the signature; the legacy alias lives in
  `providers.ts` and is migrated by P1.M1.T3 / P2.
- ❌ Don't use bare `import` for type-only deps (breaks `isolatedModules` + ESM intent); use `import type`.
- ❌ Don't "helpfully" wire re-exports in `types/index.ts` or `src/index.ts` — that is S3's job
  and doing it here blurs task boundaries and risks merge conflicts.
- ❌ Don't write runtime code (classes, functions, consts). This is a pure-types module.

---

## Hand-off Notes for Downstream Tasks

- **S2 (P1.M1.T1.S2):** Add `GlobalHarnessConfig` + `parseModelSpec()` + `formatModelForProvider()`
  to this same file (or a sibling). Do NOT redefine `ModelSpec` or `ModelProviderId` — import them.
- **P1.M1.T3 (deprecated aliases):** Turn the `Provider*` family in `providers.ts` into
  `@deprecated` type aliases re-exporting from `harnesses.ts` (mirrors the existing
  `ProviderResult → AgentResponse` deprecation pattern in `docs/`).
- **S3 / P3.M3.T1.S1:** Re-export the full Harness surface from `types/index.ts` and root `src/index.ts`.
- **P2.M1 (ClaudeCodeHarness):** Rename `AnthropicProvider`; its `execute()` already satisfies this
  interface (verified at anthropic-provider.ts:338-344).

---

**Confidence Score: 9/10** for one-pass implementation success.
Rationale: The task is fully specified (exact types enumerated), the 1:1 port source
(`providers.ts`) and the verified architecture mapping (`system_context.md` §3) are pinned,
and a complete compilable reference implementation is provided. The only residual risk is the
ModelSpec/S2 boundary decision — which is resolved and documented explicitly above.

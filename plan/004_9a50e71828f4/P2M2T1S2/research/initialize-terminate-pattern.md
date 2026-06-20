# Research — initialize/terminate + ModelRegistry construction

> How `PiHarness.initialize/terminate` mirror `ClaudeCodeHarness` and how to build
> the `ModelRegistry` / `AuthStorage` headlessly. Read alongside
> `model-resolution-path.md` (the resolution decision).

## 1. The lazy-import precedent (ClaudeCodeHarness.initialize)

`src/harnesses/claude-code-harness.ts` L167 + L229-248:

```ts
// Field (typed via the module's own type):
private sdk: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;

async initialize(options?: ClaudeCodeHarnessOptions): Promise<void> {
  if (this.sdk) return;                                   // idempotent
  try {
    this.sdk = await import("@anthropic-ai/claude-agent-sdk");
  } catch (error) {
    throw new Error(
      `Failed to load @anthropic-ai/claude-agent-sdk: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  if (!this.sdk) throw new Error("...Import returned null");
  // ... (session-store config specific to claude-code)
}
```

PiHarness mirrors this EXACTLY for the SDK field, swapping the package:

```ts
private sdk: typeof import("@earendil-works/pi-coding-agent") | null = null;
// in initialize():  this.sdk = await import("@earendil-works/pi-coding-agent");
```

`@earendil-works/pi-coding-agent` IS installed (S1 installs `^0.79.8`), so the dynamic
import resolves at runtime — same as ClaudeCodeHarness's real import in its
initialize test (no vi.mock needed for the SDK module itself).

## 2. ModelRegistry + AuthStorage construction (headless)

`createAgentSession` is **NOT called in initialize** — that is T2 (P2.M2.T2.S1).
Per the contract, initialize only: (1) `await import` the SDK, (2) build a
ModelRegistry, (3) store `sdk + modelRegistry + options`.

### AuthStorage (re-exported by pi-coding-agent: index.d.ts L5)

```ts
export declare class AuthStorage {
  static create(authPath?: string): AuthStorage;     // reads ~/.pi/agent/auth.json (disk)
  static fromStorage(storage: AuthStorageBackend): AuthStorage;
  static inMemory(data?: AuthStorageData): AuthStorage;   // ← NO disk; headless-friendly
  setRuntimeApiKey(provider: string, apiKey: string): void;   // CLI --api-key override
  getApiKey(providerId: string, opts?): Promise<string | undefined>;
  // priority: runtime override → auth.json → OAuth → ENV VAR → fallback resolver
}
```

➡️ Use `AuthStorage.inMemory()` — avoids disk/auth.json coupling, keeps the harness
deterministic & testable. Env-var resolution is BUILT IN to `getApiKey` (step 4), so
`process.env.ANTHROPIC_API_KEY` etc. are picked up automatically with zero extra code.

### ModelRegistry.inMemory (re-exported: index.d.ts L11)

```ts
static inMemory(authStorage: AuthStorage): ModelRegistry;
```

➡️ `this.modelRegistry = ModelRegistry.inMemory(authStorage);` — loads built-in models
(no models.json path), wires the AuthStorage for per-provider key resolution.

### API-key injection from `options.apiKey`

`HarnessOptions.apiKey` is **provider-agnostic** ("forwarded to the LLM provider",
PRD §7.5) — at `initialize` time we do NOT yet know the target provider (no model
specified). So:
- Store `options` on the instance.
- At **resolveModel** time (where `spec.provider` is known), if `options.apiKey` is
  set, call `this.authStorage.setRuntimeApiKey(spec.provider, options.apiKey)` so the
  subsequent `modelRegistry.find()` + auth check sees it. (One-line; see PRP.)

## 3. Test strategy (two files — mirrors the ClaudeCodeHarness precedent)

The repo's `claude-code-harness-initialize.test.ts` does a **REAL** SDK import
(the SDK is installed) and asserts `provider.sdk` is populated — NO `vi.mock` of the
SDK module. PiHarness follows the same split:

### File A — `pi-harness-initialize.test.ts` (REAL import, no vi.mock)
Mirrors `claude-code-harness-initialize.test.ts`:
- `await harness.initialize()` → `harness['sdk']` not null, has `createAgentSession` +
  `ModelRegistry` exports.
- `harness['modelRegistry']` is a `ModelRegistry` instance (instanceof).
- `harness['options']` stored.
- Idempotent (2× initialize keeps same `sdk` ref).
- Accepts `{apiKey, endpoint, timeout, headers, sessionId}` without throwing.
- `terminate()` nulls `sdk`/`modelRegistry`/`options`; idempotent; safe before init.
- Registry integration: `HarnessRegistry.getInstance().register(new PiHarness())`.

### File B — `pi-harness-resolvemodel.test.ts` (vi.mock for deterministic resolution)
The contract wants "model resolution testable with mocked getModel". Mock the
pi-coding-agent module so `ModelRegistry.find` is controllable:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

const fakeFind = vi.fn();
const fakeModel = { id: 'claude-sonnet-4', provider: 'anthropic' /* ... */ };

vi.mock('@earendil-works/pi-coding-agent', () => ({
  ModelRegistry: Object.assign(
    class { static inMemory() { return { find: fakeFind, getApiKeyForProvider: vi.fn() }; } },
    { inMemory: vi.fn(() => ({ find: fakeFind, getApiKeyForProvider: vi.fn() })) },
  ),
  AuthStorage: { inMemory: vi.fn(() => ({ setRuntimeApiKey: vi.fn(), getApiKey: vi.fn() })) },
  // (only the symbols initialize/resolveModel touch need to be mocked)
}));

beforeEach(() => { fakeFind.mockReset(); fakeFind.mockReturnValue(fakeModel); });

it('resolves a ModelSpec to a Model via ModelRegistry.find', async () => {
  const h = new PiHarness();
  await h.initialize();
  const m = h.resolveModel({ provider: 'anthropic', model: 'claude-sonnet-4', raw: 'anthropic/claude-sonnet-4' });
  expect(fakeFind).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4');
  expect(m).toBe(fakeModel);
});

it('throws ConfigError when the model is not in the registry', async () => {
  fakeFind.mockReturnValue(undefined);
  const h = new PiHarness(); await h.initialize();
  expect(() => h.resolveModel({ provider: 'foo', model: 'bar', raw: 'foo/bar' }))
    .toThrow(/CONFIG_ERROR|not found/i);
});
```

Note: `vi.mock` is **hoisted** file-scope, so File B cannot also do a "real import"
assertion in the same file — that's why initialize's real-import test lives in File A.

## 4. Why NOT add `@earendil-works/pi-ai` as a direct dep

Considered + rejected (see model-resolution-path.md Fact 1-2):
- It would make `getModel` importable, but `getModel` is the **wrong** API
  (generic-constrained to KnownProvider + known model ids; static catalogue only).
- Resolution must go through `ModelRegistry.find` regardless → pi-ai adds a dep for
  zero benefit. Types derive cleanly from `ModelRegistry` (`NonNullable<ReturnType<...>>`).

## 5. Scope boundary vs S1 (parallel predecessor)

S1 (P2.M2.T1.S1) ships: the dep install + `PiHarness` skeleton with `id`/`capabilities`/
`satisfies`/`supports`/`requiresFeatures`, a `normalizeModel` that delegates to
`parseModelSpec(model)` (no gate), and throwing stubs for initialize/terminate/execute/
registerMCPs/loadSkills citing downstream subtasks.

S2 (this task):
- REPLACES the initialize/terminate **throwing stubs** with real bodies (await import +
  ModelRegistry build / null refs).
- ADDS a `resolveModel(spec)` method (ModelSpec → Model<Api>) + a private
  `modelRegistry`/`authStorage`/`sdk`/`options` field set.
- MAY enhance `normalizeModel` to thread `getGlobalHarnessConfig().defaultModelProvider`
  (backward-compatible — undefined → parseModelSpec default 'anthropic' → S1's tests pass).
- Does NOT touch execute/registerMCPs/loadSkills (still throw, owned by T2/P2.M3/P2.M4).
- Does NOT call `createAgentSession` (T2 / P2.M2.T2.S1).
- Does NOT edit barrels / register-defaults (P2.M3.T2.S3) / src/index.ts (P3.M3.T1.S1).

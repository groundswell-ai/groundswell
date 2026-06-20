# Research — ModelSpec → Model<any> Resolution Path

> **THE load-bearing finding for P2.M2.T1.S2.** The work-item contract says
> "map to Model<any> via `getModel(provider, model)` from `@earendil-works/pi-ai`".
> This is **infeasible as written** for two independent, verified reasons. This note
> documents the correct, workable alternative: **`ModelRegistry.find(provider, modelId)`**.

## Verified facts (read directly from installed `.d.ts` on 2026-06-20)

### Fact 1 — `@earendil-works/pi-ai` is NOT importable from project source

```
node --input-type=module -e "await import('@earendil-works/pi-ai')"
→ ERR_MODULE_NOT_FOUND
```

- pi-ai is a **transitive** dep of `@earendil-works/pi-coding-agent` (declared
  `"@earendil-works/pi-ai": "^0.79.8"` in pi-coding-agent's package.json).
- npm did **NOT hoist** it. The only copy is
  `node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai`.
- Importing the nested path is **blocked by the package `exports` map**:
  `import('@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai')`
  → `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- `external_deps.md` §1.3/§1.8 call pi-ai "(transitive dep)" and assume
  `getModel` is importable — **that assumption is false in practice**. A
  transitive dep is NOT resolvable by a consumer unless hoisted or declared
  directly.

### Fact 2 — `getModel` is generic-constrained (would be the WRONG API even if importable)

`node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-ai/dist/models.d.ts`:

```ts
export declare function getModel<
  TProvider extends KnownProvider,
  TModelId extends keyof (typeof MODELS)[TProvider]
>(provider: TProvider, modelId: TModelId): Model<ModelApi<TProvider, TModelId>>;
```

- `provider` MUST be a `KnownProvider` (a **closed** union).
- `modelId` MUST be `keyof MODELS[provider]` (only the **known built-in** model ids).
- It reads from a **static** `MODELS` map (`models.generated.ts`) — not from the
  runtime ModelRegistry (which is what holds custom models.json / env-resolved auth).
- Groundswell's `ModelSpec` is an **OPEN set** (PRD §7.8: any provider string,
  custom providers via `~/.pi/agent/models.json` or extensions). Calling
  `getModel(spec.provider, spec.model)` with **dynamic** strings:
  - is a **compile-time type error** (string not assignable to `keyof MODELS[...]`),
    AND
  - even cast to `any`, would return `undefined` / throw for any model not in the
    static generated map (i.e. every custom provider, every new model id).

➡️ `getModel` is a static, typed-helper API for the Pi CLI's *known* catalogue. It
is **structurally incompatible** with Groundswell's open-set, runtime-resolved model
strings. Using it (even if pi-ai were importable) would reject every non-builtin
model — the opposite of pi's vendor-neutral purpose.

### Fact 3 — `ModelRegistry.find(provider, modelId)` is the CORRECT API

`node_modules/@earendil-works/pi-coding-agent/dist/core/model-registry.d.ts`:

```ts
export declare class ModelRegistry {
  static create(authStorage: AuthStorage, modelsJsonPath?: string): ModelRegistry;
  static inMemory(authStorage: AuthStorage): ModelRegistry;
  // ...
  /** Find a model by provider and ID. */
  find(provider: string, modelId: string): Model<Api> | undefined;
  getApiKeyForProvider(provider: string): Promise<string | undefined>;
  getApiKeyAndHeaders(model: Model<Api>): Promise<ResolvedRequestAuth>;
  hasConfiguredAuth(model: Model<Api>): boolean;
  getAvailable(): Model<Api>[];      // models with auth configured
  getAll(): Model<Api>[];            // built-in + custom
  registerProvider(providerName: string, config: ProviderConfigInput): void;
}
```

Why this is the right seam:
- **Re-exported from `@earendil-works/pi-coding-agent`** (the dep S1 installs):
  `export { ModelRegistry } from "./core/model-registry.ts";` (index.d.ts L11). No
  pi-ai import needed → **no new dependency**.
- Takes **plain `string`** params → no generic constraints → works with the open
  `ModelSpec.provider` / `ModelSpec.model` from `parseModelSpec`.
- Returns `Model<Api> | undefined` → **gracefully** signals "model not in registry"
  (the harness throws a `ConfigError`, not a crash).
- Resolves **through the registry's auth context** (built-in + custom models.json +
  `AuthStorage` env/runtime overrides) — exactly the "resolve API keys per provider"
  behaviour the contract asks for.
- `find()` covers both built-in AND custom providers (custom models are merged into
  the registry at construction via `loadCustomModels`).

### Fact 4 — The `Model<Api>` return type is derivable WITHOUT importing pi-ai

`Model` and `Api` are **not** re-exported by `@earendil-works/pi-coding-agent`
(only `ModelRegistry`, `createAgentSession`, `AgentSession`, etc. are). But the
return type of `find()` carries it:

```ts
// pi-coding-agent re-exports ModelRegistry; derive the element type from it:
type PiModel = NonNullable<ReturnType<ModelRegistry['find']>>;   // === Model<Api>
```

This is **type-safe** (structurally identical to `Model<Api>`) and requires **no
pi-ai import**. `Model<Api>` is assignable to `Model<any>` (what
`CreateAgentSessionOptions.model?: Model<any>` wants in T2).

## Decision

**Use `ModelRegistry.find(spec.provider, spec.model)` as the ModelSpec→Model<any>
resolution mechanism.** Do NOT use `getModel`. Do NOT add `@earendil-works/pi-ai`
as a direct dependency (it would not help — `getModel` is the wrong API either way).

This honours the contract's **intent** (ModelSpec → Model<any>, resolvable + mockable)
while adapting the **mechanism** to the only workable, open-set, registry-aware API
available on the installed dep.

## Naming the resolution step

The `Harness.normalizeModel(model: string): ModelSpec` interface (src/types/harnesses.ts)
**pins** `normalizeModel`'s return type to `ModelSpec`, and S1 (P2.M2.T1.S1, the
parallel predecessor) already ships `normalizeModel = parseModelSpec(model)`. The
contract prose ("normalizeModel(model): parseModelSpec(...) and map to Model<any>")
**conflates two steps**. To stay interface-compliant + non-conflicting with S1:

- `normalizeModel(model)` → returns `ModelSpec` (S1's behaviour, possibly enhanced to
  thread `getGlobalHarnessConfig().defaultModelProvider` — backward-compatible).
- **NEW** `resolveModel(spec): PiModel` → maps `ModelSpec → Model<Api>` via
  `this.modelRegistry.find(spec.provider, spec.model)`. This is what "map to
  Model<any>" means in practice; T2 (createAgentSession) consumes it.

## Testability (contract: "model resolution testable with mocked getModel")

Since resolution goes through `ModelRegistry.find` (an instance method on the
registry built in `initialize`), the resolution test mocks via:
`vi.spyOn(harness['modelRegistry'], 'find').mockReturnValue(fakeModel)` — OR by
`vi.mock('@earendil-works/pi-coding-agent')` to swap `ModelRegistry` wholesale.
Both give deterministic, network-free resolution tests. See
`initialize-terminate-pattern.md` §3 for the concrete vi.mock shape.

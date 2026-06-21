# Migration Guide: Provider → Harness

**Version:** 0.0.4+ (PRD v1.2)
**Status:** ✅ ACTIVE — Deprecated aliases retained (non-breaking)

## Overview

Starting with v0.0.4 (PRD v1.2), Groundswell splits the single `Provider*` concept into two
independent axes:

| Axis | v1.x | v0.0.4+ (Harness*) |
|------|------|-------------------|
| **Agent runtime** | `Provider` / `ProviderId` | `Harness` / `HarnessId` (`'pi'` \| `'claude-code'`) |
| **LLM host** | Conflated with provider | `ModelProviderId` (open set: `'anthropic'`, `'openai'`, `'google'`, …) |

The **harness** (`pi` or `claude-code`) is the agent runtime/SDK that drives prompting, tool
execution, streaming, and sessions. The **provider/model** (`anthropic/claude-sonnet-4`,
`openai/gpt-4o`, …) identifies the LLM host and model. The two axes are chosen and resolved
**independently**.

**This is a vocabulary rename with deprecated aliases — NOT a breaking change.** All v1.x
`Provider*` names still work as deprecated aliases exported from `'groundswell'`. Your existing
code continues to function without modification.

## Why This Change?

1. **Vendor neutrality.** `pi` is now the default harness — vendor-neutral, no walled garden,
   runs any LLM provider. `claude-code` remains as an Anthropic-ecosystem option.
2. **Orthogonal axes.** Separating the runtime (harness) from the LLM host (provider) allows
   choosing them independently: the same harness can drive different providers, and different
   harnesses can drive the same provider.
3. **Parity.** Both harnesses implement the same `Harness` interface with identical capabilities
   (MCP, Skills, LSP, Streaming, Sessions, Extended Thinking). Feature parity is enforced by the
   shared `MCPHandler` infrastructure.
4. **Cleaner API.** The split eliminates the conflation where `ProviderId` meant both "which SDK"
   and "which LLM vendor."

## What Changed (Renaming, not breaking)

The following table maps every deprecated `Provider*` name to its v0.0.4+ `Harness*` equivalent:

| v1.x (Provider*) — deprecated | v0.0.4+ (Harness*) | Notes |
|------------------------------|--------------------|-------|
| `AnthropicProvider` | `ClaudeCodeHarness` | Alias retained |
| `ProviderRegistry` | `HarnessRegistry` | Alias retained |
| `configureProviders()` | `configureHarnesses()` | Alias retained; separate legacy singleton |
| `Provider` (interface) | `Harness` | |
| `ProviderId` | `HarnessId` + `ModelProviderId` | Split into two axes |
| `ProviderRequest` | `HarnessRequest` | |
| `ProviderOptions` | `HarnessOptions` | |
| `ProviderCapabilities` | `HarnessCapabilities` | |
| `ProviderHookEvents` | `HarnessHookEvents` | |
| `ProviderResult<T>` | `AgentResponse<T>` | See [AgentResponse Migration Guide](./migration-guide-agent-response.md) |
| `AgentConfig.provider` | `AgentConfig.harness` | |
| `AgentConfig.providerOptions` | `AgentConfig.harnessOptions` | |
| `PromptOverrides.provider` | `PromptOverrides.harness` | |

**All v1.x names are still exported from `'groundswell'` as deprecated aliases.** Your existing
code compiles and runs without changes. The deprecation warnings guide you to the new names at
your own pace.

## Migration Steps

### Step 1: Update Imports

**Before:**
```ts
import { AnthropicProvider, ProviderRegistry } from 'groundswell';
// configureProviders({...}) — deprecated; see Step 3
```

**After:**
```ts
import { ClaudeCodeHarness, HarnessRegistry, configureHarnesses } from 'groundswell';
```

### Step 2: Update Registry Calls

**Before:**
```ts
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
```

**After:**
```ts
const registry = HarnessRegistry.getInstance();
registry.register(new ClaudeCodeHarness());
```

### Step 3: `configureProviders` → `configureHarnesses`

> [!IMPORTANT]
> `configureHarnesses` **rejects** `'anthropic'` as `defaultHarness`. Use `'pi'` (the new default)
> or `'claude-code'`. The LLM host is now the independent `defaultModelProvider` field.

**Before:**
```ts
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

**After:**
```ts
import { configureHarnesses } from 'groundswell';

configureHarnesses({
  defaultHarness: 'pi',
  defaultModelProvider: 'anthropic',
  harnessDefaults: {
    'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

### Step 4: Update `AgentConfig` Fields

**Before:**
```ts
const agent = new Agent({
  name: 'Analyzer',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  providerOptions: { apiKey: process.env.ANTHROPIC_API_KEY },
});
```

**After:**
```ts
import { Agent } from 'groundswell';

const agent = new Agent({
  name: 'Analyzer',
  harness: 'claude-code',
  model: 'anthropic/claude-sonnet-4-20250514',
  harnessOptions: { apiKey: process.env.ANTHROPIC_API_KEY },
});
```

### Step 5: Update `PromptOverrides`

**Before:**
```ts
const response = await agent.prompt(myPrompt, {
  provider: 'anthropic',
});
```

**After:**
```ts
const response = await agent.prompt(myPrompt, {
  harness: 'claude-code',
});
```

### Step 6: Model Strings

Model strings identify the **LLM host**, never the harness. The formats are unchanged:

**Before (if you had provider-qualified models):**
```ts
model: 'anthropic/claude-sonnet-4-20250514',
```

**After (unchanged — identifies the LLM host, not the harness):**
```ts
model: 'anthropic/claude-sonnet-4-20250514',
// Or plain:
model: 'claude-sonnet-4-20250514',  // resolved against defaultModelProvider='anthropic'
```

> [!WARNING]
> Harness-qualified model strings (e.g., `pi/anthropic/claude-sonnet-4`) were **never valid**.
> `parseModelSpec` has always rejected 3+ segment strings with
> *"Harness must not appear in model string."*

## Before and After Examples

### Example 1: Basic Setup

**Before (v1.x):**
```ts
import { AnthropicProvider, ProviderRegistry, Agent } from 'groundswell';
// configureProviders({...}) — deprecated; see Step 3

const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());

configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});

const agent = new Agent({
  name: 'Analyzer',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

**After (v0.0.4+):**
```ts
import { ClaudeCodeHarness, HarnessRegistry, configureHarnesses, Agent } from 'groundswell';

const registry = HarnessRegistry.getInstance();
registry.register(new ClaudeCodeHarness());

configureHarnesses({
  defaultHarness: 'pi',
  defaultModelProvider: 'anthropic',
  harnessDefaults: {
    'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});

const agent = new Agent({
  name: 'Analyzer',
  harness: 'claude-code',
  model: 'anthropic/claude-sonnet-4-20250514',
});
```

### Example 2: Configuration Cascade

**Before (v1.x):**
```ts
const agent = new Agent({
  name: 'Analyzer',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  providerOptions: { timeout: 120000 },
});

// Per-call override
const response = await agent.prompt(myPrompt, {
  provider: 'anthropic',
  providerOptions: { timeout: 30000 },
});
```

**After (v0.0.4+):**
```ts
import { Agent } from 'groundswell';

const agent = new Agent({
  name: 'Analyzer',
  harness: 'pi',
  model: 'anthropic/claude-sonnet-4-20250514',
  harnessOptions: { timeout: 120000 },
});

// Per-call override — harness unchanged, options narrowed
const response = await agent.prompt(myPrompt, {
  harnessOptions: { timeout: 30000 },
});
```

### Example 3: Per-Call Harness Switch

**Before (v1.x):**
```ts
const response = await agent.prompt(myPrompt, {
  provider: 'anthropic',
});
```

**After (v0.0.4+):**
```ts
import type { AgentResponse } from 'groundswell';

const response = await agent.prompt(myPrompt, {
  harness: 'claude-code',
});
```

## Deprecated Aliases Timeline

- **v0.0.4 (PRD v1.2):** Harness vocabulary introduced. All `Provider*` names retained as
  deprecated aliases. No code changes required for existing consumers.
- **Removal:** Tracked follow-up — no hard date set. The deprecated aliases will be removed in a
  future major version after the migration window has matured.

> [!NOTE]
> **Contrast with OpenCode.** The OpenCode provider was a **hard removal** in v2.0.0
> (see [OpenCode Removal Migration Guide](./migration-opencode-removal.md)). The Provider→Harness
> rename is **non-breaking** — all aliases are retained and functional.

## FAQ

**Q: Do I have to migrate immediately?**
A: No. All v1.x `Provider*` names are still exported as deprecated aliases from `'groundswell'`.
Your existing code works unchanged. Migrate at your own pace.

**Q: Is `configureProviders` removed?**
A: No, it is **deprecated** but retained. It keeps its own legacy singleton with permissive
validation (accepts `'anthropic'` as a provider). It does not delegate to `configureHarnesses`,
so both can coexist during migration. Use `configureHarnesses` for new code.

**Q: Can I still use model `'openai/gpt-4o'`?**
A: Yes — via the `pi` harness (the default). The `claude-code` harness is Anthropic-only and
will reject non-Anthropic providers.

**Q: `configureHarnesses` rejects `'anthropic'` as `defaultHarness`?**
A: Yes. The `defaultHarness` must be `'pi'` or `'claude-code'`. The LLM provider is now the
independent `defaultModelProvider` field (which defaults to `'anthropic'`). If you were passing
`defaultProvider: 'anthropic'` to `configureProviders`, the equivalent is:
```ts
configureHarnesses({
  defaultHarness: 'claude-code',       // or 'pi' if you want the vendor-neutral default
  defaultModelProvider: 'anthropic',  // the LLM host — this was your old 'anthropic' provider
});
```

**Q: What about OpenCode?**
A: `OpenCodeProvider` was **removed** in v2.0.0 — a hard removal with no deprecated alias
retained. See the [OpenCode Removal Migration Guide](./migration-opencode-removal.md) for details.
The Provider→Harness rename is non-breaking by contrast.

**Q: Does `ProviderResult<T>` still work?**
A: Yes, as a deprecated alias for `AgentResponse<T>`. See the
[AgentResponse Migration Guide](./migration-guide-agent-response.md) for the current response type.

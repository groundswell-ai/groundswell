# Migration Guide: OpenCode Provider Removal

**Deprecated:** Version 1.5.0
**Removed In:** Version 2.0.0
**Last Updated:** January 26, 2026

## Overview

OpenCodeProvider has been deprecated in favor of AnthropicProvider, which provides:
- Full MCP server integration via `createSdkMcpServer`
- LSP integration via MCP plugins
- Client-side tool execution and delegation
- Full PRD compliance (Section 7.4 requirements)

## Why This Change?

1. **Architectural Mismatch**: OpenCode SDK is a client-server library requiring an external server process, not a standalone execution library
2. **PRD Non-Compliance**: Missing required MCP and LSP capabilities specified in PRD Section 7.4
3. **Technical Debt**: High maintenance burden (~$14K/year) for partial implementation
4. **User Trust**: Honest communication about capabilities builds trust

## Breaking Changes

- OpenCodeProvider class removed
- `@opencode-ai/sdk` dependency removed
- ProviderId type no longer includes 'opencode'
- Multi-provider gateway functionality removed

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { AnthropicProvider, OpenCodeProvider } from 'groundswell';
```

**After:**
```typescript
import { AnthropicProvider } from 'groundswell';
```

### Step 2: Update Provider Registration

**Before:**
```typescript
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());
```

**After:**
```typescript
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
```

### Step 3: Update Configuration

**Before:**
```typescript
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    opencode: { endpoint: 'http://localhost:4096' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

**After:**
```typescript
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

### Step 4: Update Model Specification

**Before:**
```typescript
const agent = new Agent({
  provider: 'opencode',
  model: 'openai/gpt-4',
});
```

**After:**
```typescript
const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

## Model Mapping

If you were using OpenCode for multi-provider access to different LLMs, here's the mapping:

| OpenCode Model | Anthropic Equivalent | Notes |
|----------------|---------------------|-------|
| `anthropic/*` | Same model | Direct access, use AnthropicProvider |
| `openai/gpt-4` | `claude-opus-4-20250514` | Comparable performance |
| `openai/gpt-3.5-turbo` | `claude-haiku-4-20250514` | Faster, cheaper option |
| `google/gemini-pro` | N/A | Not available via Anthropic |

## Before and After Examples

### Example 1: Basic Provider Setup

**Before:**
```typescript
import { OpenCodeProvider } from 'groundswell';

const provider = new OpenCodeProvider();
await provider.initialize({ endpoint: 'http://localhost:4096' });
```

**After:**
```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
await provider.initialize({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### Example 2: Agent Configuration

**Before:**
```typescript
const agent = new Agent({
  name: 'Analyzer',
  provider: 'opencode',
  model: 'openai/gpt-4',
  providerOptions: {
    endpoint: 'http://localhost:4096',
  },
});
```

**After:**
```typescript
const agent = new Agent({
  name: 'Analyzer',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

### Example 3: Multi-Provider Fallback

**Before:**
```typescript
// Using OpenCode for fallback to OpenAI
const agent = new Agent({
  provider: 'opencode',
  model: 'openai/gpt-4',
});
```

**After:**
```typescript
// Use Anthropic models directly
const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

## Timeline

- **January 2026**: v1.5.0 released with deprecation warnings
- **January-June 2026**: Migration period (6 months)
- **July 2026**: v2.0.0 released with OpenCodeProvider removal

## Getting Help

- Documentation: https://groundswell.dev/docs/providers
- Migration Support: [GitHub Issues](https://github.com/your-repo/issues)
- Questions: [GitHub Discussions](https://github.com/your-repo/discussions)

## FAQ

**Q: Can I still use OpenAI models?**
A: Not directly through Groundswell. OpenCodeProvider was the only provider offering multi-provider access. For OpenAI models, consider using the OpenAI API directly or through another library.

**Q: Will OpenCodeProvider continue to work in v1.x?**
A: Yes, OpenCodeProvider will remain functional in all v1.x releases, but you will see deprecation warnings. We recommend migrating before v2.0.0.

**Q: How long do I have to migrate?**
A: You have until v2.0.0 is released (estimated July 2026). That's approximately 6 months from the deprecation announcement.

**Q: What if I need features only OpenCode provided?**
A: Please open a GitHub issue to discuss your use case. We may consider adding support for additional providers in the future if there's sufficient demand.

**Q: Will there be automated migration tools?**
A: Currently, migration must be done manually. The changes are straightforward import and configuration updates that should take less than an hour for most projects.

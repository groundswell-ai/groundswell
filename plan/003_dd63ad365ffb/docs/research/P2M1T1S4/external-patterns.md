# External Research: normalizeModel() Patterns in LLM Provider Abstractions

## Summary

Research on how major LLM SDK libraries handle model normalization in provider abstractions.

## Key Patterns Found

### 1. LangChain.js - Registry Pattern

**Approach**: Central model registry with alias support
- Supports `provider/model` format
- Model name aliases (gpt-4 → gpt-4-turbo)
- Default provider fallback
- Runtime model configuration

**Reference**: https://js.langchain.com/docs/concepts/#llms-and-chat-models

### 2. Vercel AI SDK - Type-Safe Selection

**Approach**: Template literal types for validation
- Uses `${string}/${string}` type for format validation
- Provider inference from model names (gpt-* → openai)
- Explicit provider override option
- Delegates validation to providers

**Reference**: https://sdk.vercel.ai/docs/ai-sdk-core/models

### 3. OpenAI SDK - Direct Pass-Through

**Approach**: No client-side normalization
- Passes model string directly to API
- Server-side validation only
- Simple, provider-specific

## Best Practices Identified

### ✅ DO: Split on First `/` Only

```typescript
const parts = model.split('/', 2); // Max 2 parts
```

**Reason**: Model names may contain slashes (e.g., `claude/3.5`)

### ✅ DO: Preserve Original Input

```typescript
const raw = model; // Store before manipulation
// ... parsing logic
return { provider, model, raw };
```

**Reason**: Needed for debugging, logging, and error messages

### ✅ DO: Use Type Guards for Validation

```typescript
function isValidProvider(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}
```

**Reason**: Provides both runtime validation and TypeScript type narrowing

### ✅ DO: Provider-Specific Validation

Each provider validates its own model format:

```typescript
class AnthropicProvider implements Provider {
  normalizeModel(model: string): ModelSpec {
    const spec = parseModelSpec(model, 'anthropic');

    // Provider-specific validation
    if (spec.provider !== 'anthropic') {
      throw new Error(
        `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider`
      );
    }

    return spec;
  }
}
```

**Reason**: Each provider knows its valid model formats

## Common Pitfalls

### ❌ Throwing on Plain Model Names

```typescript
// BAD
if (!model.includes('/')) {
  throw new Error('Model must include provider prefix');
}

// GOOD
if (!model.includes('/')) {
  return { provider: 'anthropic', model, raw: model };
}
```

### ❌ Losing Original Input

```typescript
// BAD
const trimmed = model.trim();
return { provider, model: trimmed }; // Lost original!

// GOOD
const raw = model;
const trimmed = model.trim();
return { provider, model: trimmed, raw };
```

### ❌ Unsafe Type Assertions

```typescript
// BAD
return { provider: parts[0] as ProviderId, ... };

// GOOD
if (!isValidProvider(parts[0])) {
  throw new Error(`Invalid provider: ${parts[0]}`);
}
return { provider: parts[0], ... }; // Type narrowed
```

### ❌ Over-Normalization

```typescript
// BAD - Network calls, complex lookups
const config = await fetchModelConfig(model);
const resolved = resolveAliases(model);

// GOOD - Simple parsing
return parseModelSpec(model, defaultProvider);
```

## Implementation Pattern for Groundswell

Based on research and existing codebase:

```typescript
// src/providers/anthropic-provider.ts
import { parseModelSpec } from '../utils/model-spec.js';

export class AnthropicProvider implements Provider {
  readonly id: ProviderId = 'anthropic';

  normalizeModel(model: string): ModelSpec {
    // Delegate to existing utility
    const spec = parseModelSpec(model, 'anthropic');

    // Provider-specific validation
    if (spec.provider !== 'anthropic') {
      throw new Error(
        `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
        `Use ProviderRegistry.get('${spec.provider}') instead.`
      );
    }

    return spec;
  }
}
```

## References

- LangChain Model I/O: https://js.langchain.com/docs/concepts/model_io
- Vercel AI SDK Models: https://sdk.vercel.ai/docs/ai-sdk-core/models
- TypeScript Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

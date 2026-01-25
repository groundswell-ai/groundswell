# Model Formatting Research Notes for P1.M1.T2.S2

## Research Date
January 25, 2026

## Subject
Model name formatting and cross-provider model translation patterns for implementing `formatModelForProvider()` function.

---

## Summary

This research document covers model name formatting patterns across AI providers, cross-provider translation strategies, error handling best practices, and relevant open source libraries for implementing the `formatModelForProvider()` utility function.

---

## 1. Provider Model Naming Conventions

### Anthropic Model Names
- **Format**: `claude-{tier}-{major}-{minor}-{date}`
- **Examples**:
  - `claude-sonnet-4-20250514`
  - `claude-opus-4-20250514`
  - `claude-haiku-3-5-20241022`
- **Tiers**: haiku (fast/cheap), sonnet (balanced), opus (flagship)
- **Documentation**: https://docs.anthropic.com/en/docs/about-claude/models

### OpenAI Model Names
- **Format**: `{family}-{variant}-{date}`
- **Examples**:
  - `gpt-4-turbo-2024-04-09`
  - `gpt-4o-2024-05-13`
  - `gpt-3.5-turbo-0125`
- **Documentation**: https://platform.openai.com/docs/models

### Google Model Names
- **Format**: `{family}-{variant}`
- **Examples**:
  - `gemini-pro-vision`
  - `gemini-ultra`
  - `gemini-1.5-pro`
- **Documentation**: https://ai.google.dev/models/gemini

### Open Source Models
- **Format**: Variable formats
- **Examples**:
  - `llama3:70b` (Ollama format)
  - `mistral-7b`
  - `qwen2-72b-instruct`

---

## 2. Cross-Provider Translation Strategies

### Strategy 1: Direct Alias Mapping
Simple 1:1 mappings between equivalent models.

```typescript
const MODEL_ALIAS_MAP: Record<string, Record<string, string>> = {
  anthropic: {
    'claude-3-5-sonnet': 'gpt-4-turbo', // when targeting opencode/openai
    'claude-opus-4': 'gpt-4'
  },
  opencode: {
    'gpt-4-turbo': 'claude-3-5-sonnet', // when targeting anthropic
    'gpt-4': 'claude-opus-4'
  }
};
```

### Strategy 2: Capability-Based Mapping
Map by capability tier rather than specific models.

```typescript
const MODEL_TIERS = {
  flagship: ['claude-opus-4', 'gpt-4'],
  standard: ['claude-3-5-sonnet', 'gpt-4-turbo'],
  fast: ['claude-haiku-3-5', 'gpt-3.5-turbo']
};

function mapByTier(sourceModel: string, targetProvider: ProviderId): string {
  // Find tier of source model, return equivalent in target provider
}
```

### Strategy 3: Semantic Translation
Parse model name and translate semantically.

```typescript
function translateSemantically(sourceModel: string, targetProvider: ProviderId): string {
  // Parse: claude-sonnet-4-20250514
  // Translate to: gpt-4-turbo (sonnet → turbo, 4 → 4)
}
```

**Recommendation for MVP**: Do NOT implement cross-provider translation. Throw clear error instead.

---

## 3. Error Handling Best Practices

### Fail Fast with Clear Messages

```typescript
// GOOD: Clear, actionable error
throw new Error(
  `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
  'Cross-provider model translation is not supported.'
);

// BAD: Generic error
throw new Error('Provider mismatch');
```

### Include Context in Errors

```typescript
// Include all relevant context:
// - Source provider
// - Source model name
// - Target provider
// - What operation failed
// - Why it failed

throw new Error(
  `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
  'Cross-provider model translation is not supported. ' +
  `Use a model from the ${targetProvider} provider instead.`
);
```

### Error Message Pattern from Codebase

From `src/core/workflow.ts`:
```typescript
throw new Error(
  `${operation} called outside of workflow context. ` +
  `Agent/Prompt operations must be executed within a workflow step.`
);
```

---

## 4. Open Source Libraries

### LiteLLM
- **GitHub**: https://github.com/berriai/litellm
- **Docs**: https://docs.litellm.ai
- **Pattern**: Provider-qualified model format (e.g., `"anthropic/claude-3-5-sonnet"`)
- **Relevance**: Similar model qualification pattern to our PRD

### OpenRouter
- **Website**: https://openrouter.ai
- **Docs**: https://openrouter.ai/docs
- **Pattern**: Gateway with provider-qualified names
- **Relevance**: Multi-provider model name normalization

### LangChain
- **GitHub**: https://github.com/langchain-ai/langchain
- **Docs**: https://js.langchain.com
- **Pattern**: Provider-specific classes for each LLM
- **Relevance**: Type-safe provider abstractions

### Vercel AI SDK
- **Website**: https://sdk.vercel.ai
- **Docs**: https://sdk.vercel.ai/docs
- **Pattern**: Provider-specific functions
- **Relevance**: Clean provider abstraction patterns

---

## 5. Implementation Recommendations

### MVP Implementation (Current Scope)

```typescript
export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  // Same provider: pass-through
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Different provider: throw error (no translation in MVP)
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    'Cross-provider model translation is not supported.'
  );
}
```

### Future Enhancement: Model Mapping Table

```typescript
// Future implementation (out of scope for MVP)
const MODEL_MAPPING: Record<ProviderId, Record<string, string>> = {
  anthropic: {
    'gpt-4-turbo': 'claude-3-5-sonnet',
    'gpt-4': 'claude-opus-4'
  },
  opencode: {
    'claude-3-5-sonnet': 'gpt-4-turbo',
    'claude-opus-4': 'gpt-4'
  }
};

export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  // Same provider: pass-through
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Different provider: check mapping table
  const mapping = MODEL_MAPPING[targetProvider];
  if (mapping && mapping[spec.model]) {
    return mapping[spec.model];
  }

  // No mapping found: throw error
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    `No mapping found for model "${spec.model}".`
  );
}
```

---

## 6. URLs and References

### Official Documentation
- Anthropic Models: https://docs.anthropic.com/en/docs/about-claude/models
- OpenAI Models: https://platform.openai.com/docs/models
- Google Gemini: https://ai.google.dev/models/gemini

### Open Source Libraries
- LiteLLM: https://github.com/berriai/litellm | https://docs.litellm.ai
- OpenRouter: https://openrouter.ai | https://openrouter.ai/docs
- LangChain.js: https://github.com/langchain-ai/langchain | https://js.langchain.com
- Vercel AI SDK: https://sdk.vercel.ai | https://sdk.vercel.ai/docs

### Best Practices
- Error Message Best Practices: https://zellwk.com/blog/input-validation-best-practices/
- TypeScript Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html

---

## 7. Key Takeaways for Implementation

1. **MVP Scope**: Implement pass-through only, throw error for cross-provider
2. **Error Messages**: Include all context (source provider, model, target provider)
3. **Code Organization**: Keep with `parseModelSpec()` in same file
4. **Future Extensibility**: Structure allows adding model mapping table later
5. **Type Safety**: Use `ModelSpec` and `ProviderId` types throughout
6. **Testing**: Cover both pass-through and error cases
7. **Documentation**: Comprehensive JSDoc with examples

---

## 8. Test Cases to Consider

### Pass-Through Tests
- Same provider (anthropic → anthropic)
- Same provider (opencode → opencode)
- With spec from parseModelSpec()

### Error Tests
- Cross-provider (anthropic → opencode)
- Cross-provider (opencode → anthropic)
- Error message content validation
- Error message includes all context

### Edge Cases (Future)
- Unknown model in mapping table
- Unknown provider
- Empty model name

# External Research Summary for P1.M1.T2.S1

**Research Date:** January 25, 2026
**Task:** Research best practices for parsing model specification strings

## Key Findings

### 1. String Splitting Best Practices

**Source:** MDN Web Docs - String.prototype.split()

**Key Insight:** Use `split()` with a limit parameter to control split behavior.

```typescript
// Split on first slash only
const parts = model.split('/', 2);
// "anthropic/claude/3" → ['anthropic', 'claude/3']
// "claude-3" → ['claude-3']
```

**Why:** The limit parameter ensures we only split on the first slash, allowing model names to contain slashes if needed.

### 2. Type Guard Pattern for Union Types

**Source:** TypeScript Handbook - Type Narrowing

**Key Insight:** Use type guards to validate and narrow union types.

```typescript
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

// Usage
if (isValidProviderId(provider)) {
  // TypeScript knows provider is ProviderId here
}
```

**Why:** Runtime validation is required even with union types. Type guards enable type-safe conditional blocks.

### 3. Input Validation Best Practices

**Source:** Input Validation Best Practices (zellwk.com)

**Key Insights:**
1. Trim input before validation
2. Preserve original input for debugging/error messages
3. Provide actionable error messages with context
4. Include the invalid value in error messages

```typescript
const trimmed = model.trim();
if (trimmed.length === 0) {
  throw new Error(
    `Model specification cannot be empty. ` +
    `Expected format: "provider/model" or "model"`
  );
}
```

### 4. Error Handling Patterns

**Source:** Error Handling Patterns in TypeScript (martinfowler.com)

**Key Insight:** Use standard `Error` class with descriptive messages for this codebase.

```typescript
// Groundswell pattern (from src/core/workflow.ts)
throw new Error('Workflow name cannot be empty');
throw new Error(`Unknown provider: ${provider}`);
```

**Why:** This codebase uses standard `Error` class, not custom error types.

### 5. TypeScript-Specific Gotchas

**Source:** TypeScript Handbook - Template Literal Types

**Key Insight:** Template literal types are compile-time only.

```typescript
// This validates at COMPILE TIME for string literals
type ModelFormat<T extends ProviderId> = `${T}/${string}`;

// But runtime validation is STILL required for dynamic strings
function parseModelSpec(model: string): ModelSpec {
  // Must validate at runtime
  const provider = model.split('/')[0];
  if (!isValidProviderId(provider)) {
    throw new Error(`Invalid provider: ${provider}`);
  }
}
```

## External Resources

| Resource | URL | Key Takeaway |
|----------|-----|--------------|
| TypeScript Type Narrowing | https://www.typescriptlang.org/docs/handbook/2/narrowing.html | Type guards for union types |
| String.prototype.split() | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split | Use limit parameter |
| Input Validation Best Practices | https://zellwk.com/blog/input-validation-best-practices/ | Sanitize, validate, error messages |
| Zod Validation | https://zod.dev/ | Alternative to manual validation |
| Vitest Expect API | https://vitest.dev/api/expect.html | Testing assertions |

## Implementation Pattern

```typescript
// 1. Trim and validate
const trimmed = model.trim();
if (trimmed.length === 0) {
  throw new Error('Cannot be empty');
}

// 2. Split with limit
const parts = trimmed.split('/', 2);

// 3. Validate with type guard
if (!isValidProviderId(provider)) {
  throw new Error(`Invalid provider: "${provider}"`);
}

// 4. Return with preserved original
return {
  provider,
  model: modelName,
  raw: trimmed  // Preserve original
};
```

## Edge Cases to Handle

1. Empty string: `""`
2. Whitespace only: `"   "`
3. Empty provider: `"/model"`
4. Empty model: `"anthropic/"`
5. Invalid provider: `"invalid/model"`
6. Multiple slashes: `"anthropic/claude/3"`
7. Model names with special chars: `"claude-3.5-sonnet_20250514"`

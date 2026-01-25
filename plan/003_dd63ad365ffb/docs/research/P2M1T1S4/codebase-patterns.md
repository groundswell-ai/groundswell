# Codebase Research: normalizeModel() Implementation Patterns

## Overview

This document summarizes the existing codebase patterns relevant to implementing `normalizeModel()` in the `AnthropicProvider` class.

## Key Files Reference

| File | Purpose | Key Patterns |
|------|---------|--------------|
| `src/providers/anthropic-provider.ts:221-228` | Current stub implementation | Returns stub ModelSpec |
| `src/utils/model-spec.ts:104-168` | parseModelSpec() utility | Provider/model parsing, validation |
| `src/types/providers.ts:150-157` | ModelSpec interface | Type definition |
| `src/__tests__/unit/utils/model-spec.test.ts` | Test patterns | Vitest describe/it/expect |

## Existing Implementation: Stub

**Location**: `src/providers/anthropic-provider.ts:221-228`

```typescript
normalizeModel(model: string): ModelSpec {
  // Full implementation in P2.M1.T1.S4
  return {
    provider: 'anthropic',
    model,
    raw: model,
  };
}
```

**Issues**:
- Does not delegate to parseModelSpec()
- Does not validate provider matches 'anthropic'
- Does not handle qualified format (anthropic/claude-opus-4)

## parseModelSpec() Utility

**Location**: `src/utils/model-spec.ts:104-168`

**Function Signature**:
```typescript
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec
```

**Behavior**:
1. Trims input, preserves original in `raw` field
2. Splits on first `/` (max 2 parts)
3. Validates provider is 'anthropic' or 'opencode'
4. Validates non-empty provider and model parts
5. Returns ModelSpec with provider, model, raw

**Error Messages**:
- Empty input: `Model specification cannot be empty. Expected format: "provider/model" or "model"`
- Invalid provider: `Invalid provider: "{provider}". Supported providers: "anthropic", "opencode"`
- Empty provider: `Invalid model specification: "{trimmed}". Provider cannot be empty...`
- Empty model: `Invalid model specification: "{trimmed}". Model name cannot be empty...`

## Validation Patterns

### Type Guard Pattern

**Location**: `src/utils/model-spec.ts:30-32`

```typescript
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}
```

### Error Throwing Pattern

**Consistent format across codebase**:
```typescript
throw new Error(`Descriptive message with "${value}"`);
```

**Examples from provider-registry.ts**:
- Line 196: `throw new Error(\`Provider '${provider.id}' is already registered\`);`
- Line 288: `throw new Error(\`Provider '${id}' is not registered\`);`

## Test Patterns

**Location**: `src/__tests__/unit/utils/model-spec.test.ts`

**Structure**:
```typescript
describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    it('should parse anthropic model', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');
      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      } as ModelSpec);
    });
  });

  describe('error cases', () => {
    it('should throw on invalid provider', () => {
      expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);
    });
  });
});
```

## Provider Interface Contract

**Location**: `src/types/providers.ts:580-599`

```typescript
/**
 * Normalize a model string to a ModelSpec
 *
 * Parses model strings in two formats:
 * - Plain: "claude-sonnet-4-20250514" (uses default provider)
 * - Qualified: "anthropic/claude-opus-4-20250514" (explicit provider)
 *
 * @param model - Model string to parse
 * @returns ModelSpec with provider, model, and raw string
 */
normalizeModel(model: string): ModelSpec;
```

## Implementation Requirements

Based on PRD Section 7.8 and existing patterns:

1. **INPUT**: `model: string`
2. **LOGIC**:
   - Delegate to `parseModelSpec(model, 'anthropic')`
   - Validate provider is 'anthropic' (or no provider specified, defaults to anthropic)
   - Return ModelSpec
3. **OUTPUT**: ModelSpec with provider='anthropic'

## Key Gotchas

1. **Import parseModelSpec**: Must import from `../utils/model-spec.js`
2. **Provider validation**: After parsing, verify `spec.provider === 'anthropic'`
3. **Error message pattern**: Follow existing pattern with descriptive messages
4. **JSDoc**: Update existing JSDoc to reflect full implementation
5. **Test file location**: Tests should go in `src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts`

# Testing Patterns Report for P1.M1.T2.S1

**Research Date:** January 25, 2026
**Task:** Document testing patterns for parseModelSpec() implementation

## Test Framework

- **Framework:** Vitest
- **Config:** `vitest.config.ts`
- **Globals:** `true` (no imports needed for describe, it, expect)
- **Command:** `npm test` or `npx vitest run`

## Test File Organization

```
src/__tests__/
├── unit/                    # Component tests
│   ├── utils/
│   │   └── [feature].test.ts
├── integration/             # Multi-component tests
└── adversarial/             # Edge case tests
```

## Test Patterns

### 1. Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { parseModelSpec } from '../../../utils/model-spec.js';

describe('parseModelSpec', () => {
  it('should parse qualified format', () => {
    const result = parseModelSpec('anthropic/claude-3-5-sonnet');

    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-3-5-sonnet');
    expect(result.raw).toBe('anthropic/claude-3-5-sonnet');
  });
});
```

### 2. Error Testing Pattern

```typescript
it('should throw on invalid provider', () => {
  expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);
});

// Or with detailed error checking
it('should include error details', () => {
  try {
    parseModelSpec('invalid/model');
    expect.fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('anthropic');
  }
});
```

### 3. Grouped Tests with describe

```typescript
describe('qualified format (provider/model)', () => {
  it('should parse anthropic model', () => { /* ... */ });
  it('should parse opencode model', () => { /* ... */ });
  it('should handle whitespace', () => { /* ... */ });
});

describe('error cases', () => {
  it('should throw on empty string', () => { /* ... */ });
  it('should throw on invalid provider', () => { /* ... */ });
});
```

## Test Cases for parseModelSpec()

### Success Cases

1. **Qualified format - Anthropic**
   - Input: `'anthropic/claude-3-5-sonnet'`
   - Expected: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: '...' }`

2. **Qualified format - OpenCode**
   - Input: `'opencode/gpt-4'`
   - Expected: `{ provider: 'opencode', model: 'gpt-4', raw: '...' }`

3. **Plain format with default**
   - Input: `'claude-sonnet-4'`
   - Expected: `{ provider: 'anthropic', model: 'claude-sonnet-4', raw: '...' }`

4. **Plain format with explicit default**
   - Input: `'gpt-4', 'opencode'`
   - Expected: `{ provider: 'opencode', model: 'gpt-4', raw: '...' }`

5. **Whitespace handling**
   - Input: `'  anthropic/claude-3-5-sonnet  '`
   - Expected: trimmed parts, raw preserved

6. **Multiple slashes**
   - Input: `'anthropic/claude/3/5'`
   - Expected: `{ provider: 'anthropic', model: 'claude/3/5', raw: '...' }`

### Error Cases

1. **Empty string**
   - Input: `''`
   - Expected: throw with "cannot be empty"

2. **Whitespace-only**
   - Input: `'   '`
   - Expected: throw with "cannot be empty"

3. **Invalid provider**
   - Input: `'invalid/model'`
   - Expected: throw with "invalid provider" and list of supported providers

4. **Empty provider part**
   - Input: `'/model'`
   - Expected: throw with "provider cannot be empty"

5. **Empty model part**
   - Input: `'anthropic/'`
   - Expected: throw with "model name cannot be empty"

## Assertion Patterns

```typescript
// Exact match
expect(result).toEqual({ provider: 'anthropic', model: 'claude-3', raw: '...' });

// Property match
expect(result.provider).toBe('anthropic');

// Contains
expect(result.raw).toContain('anthropic');

// Error with regex
expect(() => parseModelSpec('')).toThrow(/empty/i);

// Error instance check
expect(error).toBeInstanceOf(Error);
```

## Running Tests

```bash
# Run specific test file
npm test -- src/__tests__/unit/utils/model-spec.test.ts

# Run all unit tests
npm test -- src/__tests__/unit/

# Run all tests
npm test

# Watch mode
npm run test:watch
```

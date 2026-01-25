# Model Specification Parsing Best Practices Research

**Research Date:** 2026-01-25
**Task:** Research best practices for parsing provider/model format strings in TypeScript/JavaScript
**Context:** Implementing `parseModelSpec()` function for Groundswell Agent SDK

## Table of Contents
1. [Overview](#overview)
2. [String Splitting Best Practices](#string-splitting-best-practices)
3. [Union Type Validation Patterns](#union-type-validation-patterns)
4. [Edge Cases and Error Handling](#edge-cases-and-error-handling)
5. [TypeScript-Specific Gotchas](#typescript-specific-gotchas)
6. [JSDoc Documentation Patterns](#jsdoc-documentation-patterns)
7. [Implementation Examples](#implementation-examples)
8. [Testing Patterns](#testing-patterns)
9. [External Resources](#external-resources)

---

## Overview

The `parseModelSpec()` function needs to parse model strings in the format `"provider/model"` (e.g., `"anthropic/claude-3-5-sonnet"`) or plain model names (e.g., `"claude-sonnet-4"` with a default provider).

### Key Requirements

1. **Parse qualified format**: `"provider/model"` → `{ provider: "anthropic", model: "claude-3-5-sonnet" }`
2. **Parse plain format**: `"claude-sonnet-4"` with default provider → `{ provider: "anthropic", model: "claude-sonnet-4" }`
3. **Validate provider**: Ensure provider is in the union type `'anthropic' | 'opencode'`
4. **Handle edge cases**: Empty strings, multiple slashes, invalid providers
5. **Type safety**: Return type `ModelSpec` with proper TypeScript typing
6. **Error handling**: Clear, actionable error messages

### Existing Type Definitions

From `/home/dustin/projects/groundswell/src/types/providers.ts`:

```typescript
/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId = 'anthropic' | 'opencode';

/**
 * Model specification
 * Represents a parsed model identifier with provider and model name.
 */
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}
```

---

## String Splitting Best Practices

### 1. Basic String Splitting

**Pattern:** Use `String.prototype.split()` with a limit parameter

```typescript
/**
 * Parse model specification string
 * @param model - Model string in "provider/model" or "model" format
 * @param defaultProvider - Default provider when no provider specified
 * @returns Parsed ModelSpec object
 */
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Split on first slash only (limit: 2)
  const parts = model.split('/', 2);

  if (parts.length === 2) {
    // Qualified format: "provider/model"
    return {
      provider: parts[0] as ProviderId,
      model: parts[1],
      raw: model
    };
  }

  // Plain format: "model" (use default provider)
  return {
    provider: defaultProvider,
    model: parts[0],
    raw: model
  };
}
```

**Why this works:**
- `split('/', 2)` ensures we only split on the first slash
- Returns array with 1 element (no slash) or 2 elements (has slash)
- Simple and efficient

### 2. Handling Empty Strings

**Problem:** Empty string or whitespace-only input

```typescript
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Trim and validate input
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. ' +
      'Expected format: "provider/model" or "model"'
    );
  }

  // Continue with parsing...
  const parts = trimmed.split('/', 2);
  // ...
}
```

### 3. Handling Multiple Slashes

**Problem:** Input like `"anthropic/claude/3-5-sonnet"` or `"///"`

**Solution 1: Use first slash only**
```typescript
// split('/', 2) handles this automatically
const parts = "anthropic/claude/3-5-sonnet".split('/', 2);
// Returns: ['anthropic', 'claude/3-5-sonnet']
```

**Solution 2: Reject multiple slashes**
```typescript
const parts = model.split('/');
if (parts.length > 2) {
  throw new Error(
    `Invalid model specification: "${model}". ` +
    `Multiple slashes found. Expected format: "provider/model"`
  );
}
```

**Recommendation:** Use Solution 1 (first slash only) for flexibility, as some models might have slashes in their names.

---

## Union Type Validation Patterns

### 1. Type Guard Pattern

**Pattern:** Create a type guard to validate ProviderId

```typescript
/**
 * Type guard for ProviderId validation
 * @param value - Value to check
 * @returns True if value is a valid ProviderId
 */
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

/**
 * Parse and validate model specification
 */
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error('Model specification cannot be empty');
  }

  const parts = trimmed.split('/', 2);

  if (parts.length === 2) {
    // Qualified format: validate provider
    const [provider, modelName] = parts;

    if (!isValidProviderId(provider)) {
      throw new Error(
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`
      );
    }

    return {
      provider,
      model: modelName,
      raw: trimmed
    };
  }

  // Plain format: use default provider
  return {
    provider: defaultProvider,
    model: parts[0],
    raw: trimmed
  };
}

/**
 * Get comma-separated list of supported providers
 */
function getSupportedProvidersList(): string {
  return ['anthropic', 'opencode'].join(', ');
}
```

### 2. Const Array Pattern

**Pattern:** Use const array for provider validation

```typescript
/**
 * Supported provider identifiers
 * @constant
 */
const PROVIDER_IDS = ['anthropic', 'opencode'] as const;

/**
 * Provider type derived from const array
 */
type ProviderId = typeof PROVIDER_IDS[number];

/**
 * Check if value is a valid ProviderId
 */
function isValidProviderId(value: string): value is ProviderId {
  return PROVIDER_IDS.includes(value as ProviderId);
}

/**
 * Get list of supported providers for error messages
 */
function getSupportedProvidersList(): string {
  return PROVIDER_IDS.map(p => `"${p}"`).join(', ');
}
```

**Benefits:**
- Single source of truth for provider list
- Type-safe derivation of ProviderId type
- Easy to add new providers

### 3. Enum-like Object Pattern

**Pattern:** Use object with values as the union type

```typescript
/**
 * Provider identifier constants
 * @constant
 */
const ProviderId = {
  ANTHROPIC: 'anthropic',
  OPENCODE: 'opencode'
} as const;

/**
 * Provider type
 */
type ProviderId = typeof ProviderId[keyof typeof ProviderId];

/**
 * Check if value is a valid ProviderId
 */
function isValidProviderId(value: string): value is ProviderId {
  return Object.values(ProviderId).includes(value as ProviderId);
}
```

---

## Edge Cases and Error Handling

### 1. Comprehensive Edge Case Handling

```typescript
/**
 * Parse model specification with comprehensive error handling
 * @param model - Model string to parse
 * @param defaultProvider - Default provider (default: 'anthropic')
 * @returns Parsed ModelSpec object
 * @throws {Error} When model specification is invalid
 */
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Edge case 1: Empty or whitespace-only input
  const trimmed = model.trim();
  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. ' +
      'Expected format: "provider/model" or "model"'
    );
  }

  // Edge case 2: Split with limit
  const parts = trimmed.split('/', 2);

  if (parts.length === 2) {
    const [provider, modelName] = parts;

    // Edge case 3: Empty provider part
    if (provider.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Provider cannot be empty. Expected format: "provider/model"'
      );
    }

    // Edge case 4: Empty model part
    if (modelName.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Model name cannot be empty. Expected format: "provider/model"'
      );
    }

    // Edge case 5: Invalid provider
    if (!isValidProviderId(provider)) {
      throw new Error(
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`
      );
    }

    // Edge case 6: Model name contains only slashes
    // (e.g., "anthropic/" -> parts = ['anthropic', ''])
    // Already handled by empty model check above

    return {
      provider,
      model: modelName,
      raw: trimmed
    };
  }

  // Plain format: parts.length === 1
  const modelName = parts[0];

  // Edge case 7: Plain model name is empty (shouldn't happen due to trim check)
  if (modelName.length === 0) {
    throw new Error(
      `Invalid model specification: "${trimmed}". ` +
      'Model name cannot be empty'
    );
  }

  return {
    provider: defaultProvider,
    model: modelName,
    raw: trimmed
  };
}
```

### 2. Error Code Pattern

**Pattern:** Use error codes for better error handling

```typescript
/**
 * Error codes for model specification parsing
 * @constant
 */
const MODEL_SPEC_ERROR_CODES = {
  EMPTY_INPUT: 'MODEL_SPEC_EMPTY_INPUT',
  INVALID_FORMAT: 'MODEL_SPEC_INVALID_FORMAT',
  INVALID_PROVIDER: 'MODEL_SPEC_INVALID_PROVIDER',
  EMPTY_PROVIDER: 'MODEL_SPEC_EMPTY_PROVIDER',
  EMPTY_MODEL: 'MODEL_SPEC_EMPTY_MODEL',
} as const;

/**
 * Model specification parsing error
 */
class ModelSpecError extends Error {
  constructor(
    code: keyof typeof MODEL_SPEC_ERROR_CODES,
    message: string,
    public readonly input?: string
  ) {
    super(message);
    this.name = 'ModelSpecError';
    this.code = code;
  }

  readonly code: keyof typeof MODEL_SPEC_ERROR_CODES;
}

/**
 * Parse with custom error type
 */
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new ModelSpecError(
      'EMPTY_INPUT',
      'Model specification cannot be empty',
      model
    );
  }

  // ... rest of implementation
}
```

### 3. Result Type Pattern

**Pattern:** Return Result type instead of throwing

```typescript
/**
 * Result type for parsing operations
 */
type ParseResult<T> =
  | { success: true; value: T }
  | { success: false; error: ModelSpecError };

/**
 * Parse model specification without throwing
 * @param model - Model string to parse
 * @param defaultProvider - Default provider (default: 'anthropic')
 * @returns Result containing ModelSpec or error
 */
function parseModelSpecSafe(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ParseResult<ModelSpec> {
  try {
    const value = parseModelSpec(model, defaultProvider);
    return { success: true, value };
  } catch (error) {
    if (error instanceof ModelSpecError) {
      return { success: false, error };
    }
    return {
      success: false,
      error: new ModelSpecError(
        'INVALID_FORMAT',
        error instanceof Error ? error.message : 'Unknown error',
        model
      )
    };
  }
}
```

---

## TypeScript-Specific Gotchas

### 1. Type Assertion Gotcha

**❌ Bad Practice:** Unsafe type assertion

```typescript
const parts = model.split('/');
return {
  provider: parts[0] as ProviderId, // UNSAFE! No validation
  model: parts[1],
  raw: model
};
```

**✅ Good Practice:** Validate before assertion

```typescript
const provider = parts[0];
if (!isValidProviderId(provider)) {
  throw new Error(`Invalid provider: ${provider}`);
}
return {
  provider, // TypeScript knows this is ProviderId
  model: parts[1],
  raw: model
};
```

### 2. String Split Type Narrowing

**Gotcha:** `String.prototype.split()` always returns `string[]`

```typescript
const parts = model.split('/', 2);
// parts is string[], NOT [string] | [string, string]

// ❌ This won't work:
if (parts.length === 2) {
  const [provider, model] = parts; // provider and model are string
}
```

**Solution:** Use type guard or explicit check

```typescript
const parts = model.split('/', 2);

if (parts.length === 2) {
  const [provider, modelName] = parts;
  // provider: string, modelName: string
  // Must validate provider before using as ProviderId
}
```

### 3. Template Literal Type Gotcha

**Pattern:** Use template literal types for compile-time validation

```typescript
/**
 * Template literal type for model format
 */
type ModelFormat<T extends ProviderId> = `${T}/${string}`;

/**
 * This validates at COMPILE TIME for string literals
 */
type ValidModel =
  | ModelFormat<'anthropic'>
  | ModelFormat<'opencode'>;

/**
 * This still requires RUNTIME validation for dynamic strings
 */
function parseModelSpec(model: string): ModelSpec {
  // Template literal types don't help with runtime validation
  // Must still validate at runtime
  const parts = model.split('/', 2);
  // ...
}
```

**Key Point:** Template literal types are for compile-time checking only. Runtime validation is still required.

### 4. Union Type Exhaustiveness

**Pattern:** Ensure all union members are handled

```typescript
/**
 * Get all valid provider IDs
 */
function getValidProviderIds(): ProviderId[] {
  // Use const assertion for type safety
  return ['anthropic', 'opencode'] as ProviderId[];
}

/**
 * Validate provider ID with exhaustiveness check
 */
function isValidProviderId(value: string): value is ProviderId {
  const validIds = getValidProviderIds();
  return validIds.includes(value as ProviderId);
}

/**
 * Pattern matching on ProviderId
 */
function getProviderEndpoint(provider: ProviderId): string {
  switch (provider) {
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'opencode':
      return 'http://localhost:8080';
    default:
      // TypeScript ensures exhaustiveness
      const _exhaustiveCheck: never = provider;
      return _exhaustiveCheck;
  }
}
```

---

## JSDoc Documentation Patterns

### 1. Comprehensive Function Documentation

```typescript
/**
 * Parse a model specification string into a structured ModelSpec object
 *
 * ## Supported Formats
 *
 * - **Qualified format**: `"provider/model"` - Explicit provider specification
 *   - Example: `"anthropic/claude-3-5-sonnet"`
 *   - Example: `"opencode/gpt-4"`
 *
 * - **Plain format**: `"model"` - Uses default provider
 *   - Example: `"claude-sonnet-4"` (uses default provider)
 *
 * ## Validation Rules
 *
 * 1. Input cannot be empty or whitespace-only
 * 2. Provider must be one of: `'anthropic'`, `'opencode'`
 * 3. Model name cannot be empty after provider split
 * 4. Only the first slash is considered the provider/model separator
 *
 * ## Examples
 *
 * ### Qualified format
 * ```ts
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * // Returns:
 * // {
 * //   provider: 'anthropic',
 * //   model: 'claude-3-5-sonnet',
 * //   raw: 'anthropic/claude-3-5-sonnet'
 * // }
 * ```
 *
 * ### Plain format with default provider
 * ```ts
 * const spec = parseModelSpec('claude-sonnet-4', 'anthropic');
 * // Returns:
 * // {
 * //   provider: 'anthropic',
 * //   model: 'claude-sonnet-4',
 * //   raw: 'claude-sonnet-4'
 * // }
 * ```
 *
 * ### Invalid provider error
 * ```ts
 * try {
 *   parseModelSpec('invalid/model');
 * } catch (error) {
 *   console.error(error.message);
 *   // "Invalid provider: "invalid". Supported providers: "anthropic", "opencode""
 * }
 * ```
 *
 * @param model - Model specification string to parse
 * @param defaultProvider - Default provider to use when none specified (default: 'anthropic')
 * @returns Parsed ModelSpec object with provider, model, and raw string
 * @throws {Error} When model specification is invalid:
 * - Empty input
 * - Invalid provider
 * - Empty provider or model parts
 *
 * @see {@link ModelSpec} for the return type structure
 * @see {@link ProviderId} for valid provider identifiers
 */
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Implementation...
}
```

### 2. Type Guard Documentation

```typescript
/**
 * Type guard to check if a string is a valid ProviderId
 *
 * Use this function to validate and narrow string types to ProviderId.
 *
 * @example
 * ```ts
 * const value: string = getUserInput();
 *
 * if (isValidProviderId(value)) {
 *   // TypeScript knows value is ProviderId here
 *   console.log(`Valid provider: ${value}`);
 * } else {
 *   console.error(`Invalid provider: ${value}`);
 * }
 * ```
 *
 * @param value - The string value to check
 * @returns True if the value is a valid ProviderId ('anthropic' | 'opencode')
 *
 * @see {@link ProviderId} for the provider identifier type
 */
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}
```

### 3. Error Documentation

```typescript
/**
 * Error thrown when model specification parsing fails
 *
 * ## Error Codes
 *
 * | Code | Description | Example Input |
 * |------|-------------|---------------|
 * | `MODEL_SPEC_EMPTY_INPUT` | Empty or whitespace-only input | `""`, `"   "` |
 * | `MODEL_SPEC_INVALID_FORMAT` | Invalid format (e.g., trailing slash) | `"anthropic/"` |
 * | `MODEL_SPEC_INVALID_PROVIDER` | Provider not in union type | `"invalid/model"` |
 * | `MODEL_SPEC_EMPTY_PROVIDER` | Empty provider part | `"/model"` |
 * | `MODEL_SPEC_EMPTY_MODEL` | Empty model name | `"anthropic/"` |
 *
 * @example
 * ```ts
 * try {
 *   parseModelSpec('invalid-provider/model');
 * } catch (error) {
 *   if (error instanceof ModelSpecError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *     // Output: [MODEL_SPEC_INVALID_PROVIDER] Invalid provider: "invalid-provider"
 *   }
 * }
 * ```
 *
 * @extends Error
 */
class ModelSpecError extends Error {
  /**
   * Machine-readable error code
   */
  readonly code: keyof typeof MODEL_SPEC_ERROR_CODES;

  /**
   * Original input that caused the error
   */
  readonly input?: string;

  constructor(
    code: keyof typeof MODEL_SPEC_ERROR_CODES,
    message: string,
    input?: string
  ) {
    super(message);
    this.name = 'ModelSpecError';
    this.code = code;
    this.input = input;
  }
}
```

---

## Implementation Examples

### 1. Complete Implementation with All Patterns

```typescript
/**
 * Model specification parser implementation
 * Following Groundswell best practices
 */

// Type definitions
type ProviderId = 'anthropic' | 'opencode';

interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;
}

// Constants
const PROVIDER_IDS = ['anthropic', 'opencode'] as const;

const MODEL_SPEC_ERROR_CODES = {
  EMPTY_INPUT: 'MODEL_SPEC_EMPTY_INPUT',
  INVALID_FORMAT: 'MODEL_SPEC_INVALID_FORMAT',
  INVALID_PROVIDER: 'MODEL_SPEC_INVALID_PROVIDER',
  EMPTY_PROVIDER: 'MODEL_SPEC_EMPTY_PROVIDER',
  EMPTY_MODEL: 'MODEL_SPEC_EMPTY_MODEL',
} as const;

// Error class
class ModelSpecError extends Error {
  constructor(
    public readonly code: keyof typeof MODEL_SPEC_ERROR_CODES,
    message: string,
    public readonly input?: string
  ) {
    super(message);
    this.name = 'ModelSpecError';
  }
}

// Type guard
function isValidProviderId(value: string): value is ProviderId {
  return PROVIDER_IDS.includes(value as ProviderId);
}

// Helper
function getSupportedProvidersList(): string {
  return PROVIDER_IDS.map(p => `"${p}"`).join(', ');
}

// Main function
function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Validate input
  const trimmed = model.trim();
  if (trimmed.length === 0) {
    throw new ModelSpecError(
      'EMPTY_INPUT',
      'Model specification cannot be empty. ' +
      'Expected format: "provider/model" or "model"',
      model
    );
  }

  // Split on first slash
  const parts = trimmed.split('/', 2);

  if (parts.length === 2) {
    const [provider, modelName] = parts;

    // Validate provider part
    if (provider.length === 0) {
      throw new ModelSpecError(
        'EMPTY_PROVIDER',
        `Invalid model specification: "${trimmed}". ` +
        'Provider cannot be empty. Expected format: "provider/model"',
        model
      );
    }

    // Validate model part
    if (modelName.length === 0) {
      throw new ModelSpecError(
        'EMPTY_MODEL',
        `Invalid model specification: "${trimmed}". ` +
        'Model name cannot be empty. Expected format: "provider/model"',
        model
      );
    }

    // Validate provider ID
    if (!isValidProviderId(provider)) {
      throw new ModelSpecError(
        'INVALID_PROVIDER',
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`,
        model
      );
    }

    return {
      provider,
      model: modelName,
      raw: trimmed
    };
  }

  // Plain format
  const modelName = parts[0];
  return {
    provider: defaultProvider,
    model: modelName,
    raw: trimmed
  };
}

// Export
export { parseModelSpec, ModelSpecError, MODEL_SPEC_ERROR_CODES };
export type { ProviderId, ModelSpec };
```

### 2. Alternative: Regex-Based Implementation

```typescript
/**
 * Parse model specification using regex
 * Provides more strict format validation
 */
function parseModelSpecRegex(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new ModelSpecError(
      'EMPTY_INPUT',
      'Model specification cannot be empty',
      model
    );
  }

  // Match: provider/model or just model
  // Provider must be lowercase letters only
  // Model can contain letters, numbers, hyphens, underscores, dots
  const regex = /^(?:([a-z]+)\/)?([a-zA-Z0-9\-_.]+)$/;
  const match = trimmed.match(regex);

  if (!match) {
    throw new ModelSpecError(
      'INVALID_FORMAT',
      `Invalid model specification: "${trimmed}". ` +
      'Expected format: "provider/model" or "model"',
      model
    );
  }

  const [, provider, modelName] = match;

  if (provider) {
    // Qualified format
    if (!isValidProviderId(provider)) {
      throw new ModelSpecError(
        'INVALID_PROVIDER',
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`,
        model
      );
    }

    return {
      provider,
      model: modelName,
      raw: trimmed
    };
  }

  // Plain format
  return {
    provider: defaultProvider,
    model: modelName,
    raw: trimmed
  };
}
```

**Pros of Regex:**
- More strict validation
- Rejects invalid characters
- Single pass validation

**Cons of Regex:**
- Less flexible (might reject valid model names)
- Harder to maintain
- Less readable

**Recommendation:** Use the `split()`-based implementation for flexibility.

---

## Testing Patterns

### 1. Unit Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { parseModelSpec, ModelSpecError, MODEL_SPEC_ERROR_CODES } from './model-spec';

describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    it('should parse valid anthropic model', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      });
    });

    it('should parse valid opencode model', () => {
      const result = parseModelSpec('opencode/gpt-4');

      expect(result).toEqual({
        provider: 'opencode',
        model: 'gpt-4',
        raw: 'opencode/gpt-4'
      });
    });

    it('should preserve whitespace in raw but trim parts', () => {
      const result = parseModelSpec('  anthropic/claude-3-5-sonnet  ');

      expect(result.raw).toBe('  anthropic/claude-3-5-sonnet  ');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });
  });

  describe('plain format (model only)', () => {
    it('should use default provider for plain model', () => {
      const result = parseModelSpec('claude-sonnet-4', 'anthropic');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4'
      });
    });

    it('should use default provider parameter', () => {
      const result = parseModelSpec('gpt-4', 'opencode');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4');
    });

    it('should default to anthropic when no default specified', () => {
      const result = parseModelSpec('claude-opus-4');

      expect(result.provider).toBe('anthropic');
    });
  });

  describe('edge cases', () => {
    it('should handle model names with special characters', () => {
      const result = parseModelSpec('anthropic/claude-3.5-sonnet_20250514');

      expect(result.model).toBe('claude-3.5-sonnet_20250514');
    });

    it('should handle multiple slashes (use first only)', () => {
      const result = parseModelSpec('anthropic/claude/3/5');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude/3/5');
    });

    it('should handle whitespace-only input', () => {
      expect(() => parseModelSpec('   ')).toThrow(ModelSpecError);
    });
  });

  describe('error cases', () => {
    it('should throw on empty string', () => {
      expect(() => parseModelSpec('')).toThrow(ModelSpecError);
    });

    it('should throw on invalid provider', () => {
      try {
        parseModelSpec('invalid/model');
        expect.fail('Should have thrown ModelSpecError');
      } catch (error) {
        expect(error).toBeInstanceOf(ModelSpecError);
        expect((error as ModelSpecError).code).toBe('INVALID_PROVIDER');
        expect((error as ModelSpecError).input).toBe('invalid/model');
      }
    });

    it('should throw on empty provider part', () => {
      try {
        parseModelSpec('/model');
        expect.fail('Should have thrown ModelSpecError');
      } catch (error) {
        expect(error).toBeInstanceOf(ModelSpecError);
        expect((error as ModelSpecError).code).toBe('EMPTY_PROVIDER');
      }
    });

    it('should throw on empty model part', () => {
      try {
        parseModelSpec('anthropic/');
        expect.fail('Should have thrown ModelSpecError');
      } catch (error) {
        expect(error).toBeInstanceOf(ModelSpecError);
        expect((error as ModelSpecError).code).toBe('EMPTY_MODEL');
      }
    });

    it('should include error details in message', () => {
      try {
        parseModelSpec('invalid/model');
        expect.fail('Should have thrown ModelSpecError');
      } catch (error) {
        const err = error as ModelSpecError;
        expect(err.message).toContain('Invalid provider');
        expect(err.message).toContain('"invalid"');
        expect(err.message).toContain('Supported providers');
      }
    });
  });

  describe('error codes', () => {
    it('should use correct error codes', () => {
      const testCases = [
        { input: '', code: 'EMPTY_INPUT' },
        { input: '   ', code: 'EMPTY_INPUT' },
        { input: '/model', code: 'EMPTY_PROVIDER' },
        { input: 'anthropic/', code: 'EMPTY_MODEL' },
        { input: 'invalid/model', code: 'INVALID_PROVIDER' },
      ] as const;

      for (const { input, code } of testCases) {
        try {
          parseModelSpec(input);
          expect.fail(`Should have thrown for input: "${input}"`);
        } catch (error) {
          expect(error).toBeInstanceOf(ModelSpecError);
          expect((error as ModelSpecError).code).toBe(code);
        }
      }
    });
  });
});
```

### 2. Property-Based Testing

```typescript
import { describe, it, expect } from 'vitest';
import { parseModelSpec } from './model-spec';

// Helper to generate random strings
function randomString(length: number): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

describe('parseModelSpec property-based tests', () => {
  it('should always return valid ProviderId for qualified format', () => {
    for (let i = 0; i < 100; i++) {
      const provider = ['anthropic', 'opencode'][Math.floor(Math.random() * 2)];
      const model = randomString(10);
      const input = `${provider}/${model}`;

      const result = parseModelSpec(input);

      expect(['anthropic', 'opencode']).toContain(result.provider);
      expect(result.model).toBe(model);
      expect(result.raw).toBe(input);
    }
  });

  it('should preserve raw input exactly', () => {
    const inputs = [
      'anthropic/claude-3-5-sonnet',
      '  anthropic/claude-3-5-sonnet  ',
      'anthropic/claude-3-5-sonnet  ',
      '  anthropic/claude-3-5-sonnet',
    ];

    for (const input of inputs) {
      const result = parseModelSpec(input);
      expect(result.raw).toBe(input);
    }
  });

  it('should handle model names with special characters', () => {
    const modelNames = [
      'claude-3.5-sonnet',
      'claude_3_5_sonnet',
      'claude3.5sonnet',
      'claude-3-5-sonnet-20250514',
    ];

    for (const modelName of modelNames) {
      const result = parseModelSpec(`anthropic/${modelName}`);
      expect(result.model).toBe(modelName);
    }
  });
});
```

---

## External Resources

### TypeScript Documentation

1. **TypeScript Handbook - Type Narrowing**
   URL: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
   - Topics: Type guards, discrimination, assertion functions

2. **TypeScript Handbook - Template Literal Types**
   URL: https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
   - Topics: String manipulation in type system

3. **TypeScript JSDoc Reference**
   URL: https://www.typescriptlang.org/docs/handbook/intro-to-jsdoc.html
   - Topics: JSDoc tags, type annotations, examples

### String Manipulation

4. **MDN - String.prototype.split()**
   URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
   - Topics: Split behavior, limit parameter, edge cases

5. **MDN - String.prototype.trim()**
   URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim
   - Topics: Whitespace removal

### Validation Patterns

6. **Zod - Schema Validation**
   URL: https://zod.dev/
   - Topics: Runtime type validation, error handling
   - Alternative to manual validation

7. **Validation Best Practices**
   URL: https://zellwk.com/blog/input-validation-best-practices/
   - Topics: Sanitization, validation, error messages

### Error Handling

8. **Error Handling Patterns in TypeScript**
   URL: https://martinfowler.com/articles/replaceThrowWithNotification.html
   - Topics: Result types, error propagation

9. **TypeScript Error Handling Guide**
   URL: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html#custom-error-factories
   - Topics: Custom error classes, error codes

### Testing

10. **Vitest Expect Documentation**
    URL: https://vitest.dev/api/expect.html
    - Topics: Assertions, error testing

11. **Property-Based Testing**
    URL: https://jesterui.blog/2020/07/20/property-based-testing-in-typescript.html
    - Topics: Generating test cases, coverage

---

## Summary of Key Best Practices

### 1. Always Validate Input

```typescript
// Trim and check for empty
const trimmed = model.trim();
if (trimmed.length === 0) {
  throw new Error('Cannot be empty');
}
```

### 2. Use Type Guards for Union Types

```typescript
function isValidProviderId(value: string): value is ProviderId {
  return ['anthropic', 'opencode'].includes(value as ProviderId);
}
```

### 3. Provide Clear Error Messages

```typescript
throw new Error(
  `Invalid provider: "${provider}". ` +
  `Supported providers: ${getSupportedProvidersList()}`
);
```

### 4. Preserve Original Input

```typescript
return {
  provider,
  model: modelName,
  raw: trimmed // Always preserve original input
};
```

### 5. Use split() with Limit

```typescript
const parts = model.split('/', 2); // Only split on first slash
```

### 6. Document with JSDoc

```typescript
/**
 * Parse model specification
 * @param model - Model string to parse
 * @returns Parsed ModelSpec object
 * @throws {Error} When invalid
 */
```

### 7. Test Edge Cases

- Empty strings
- Whitespace-only input
- Multiple slashes
- Invalid providers
- Empty parts

---

**End of Research Document**

*This research was compiled from established TypeScript/JavaScript best practices, Groundswell project patterns, and standard library documentation.*

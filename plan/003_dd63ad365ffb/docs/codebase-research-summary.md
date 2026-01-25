# Research Summary: configureProviders() Implementation

## Validation Patterns Found

### Reusable Validation Helpers in src/utils/model-spec.ts

The codebase already has validation helpers that can be reused:

**File**: `src/utils/model-spec.ts` (Lines 30-41)

```typescript
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

function getSupportedProvidersList(): string {
  return '"anthropic", "opencode"';
}
```

These are **private functions** (not exported). For `configureProviders()`, we have two options:

1. **Copy the pattern** - Implement similar private helpers in provider-config.ts
2. **Export and reuse** - Export these helpers from model-spec.ts and import them

**Recommendation**: Copy the pattern for now since:
- The validation helpers are implementation-specific to model-spec
- provider-config.ts should be self-contained
- Future refactoring can extract shared validation if needed

### Validation Error Pattern

**File**: `src/utils/model-spec.ts` (Lines 145-150)

```typescript
if (!isValidProviderId(provider)) {
  throw new Error(
    `Invalid provider: "${provider}". ` +
    `Supported providers: ${getSupportedProvidersList()}`
  );
}
```

**Pattern to follow**:
- Check validity first
- Throw `Error` (not a custom class)
- Include invalid value in quotes
- List supported providers
- Use consistent error message format

## Error Handling Conventions

### Error Classes
- **Use built-in `Error`** only - no custom error classes in codebase
- One exception: `TypeError` used in cache-key.ts:67

### Error Message Format
```typescript
// Pattern: template literal + concatenation
throw new Error(
  `Invalid provider: "${provider}". ` +
  `Supported providers: ${getSupportedProvidersList()}`
);
```

**Key conventions**:
- Use template literals for dynamic values
- Concatenate with `+` for readability
- Include expected format/help
- Be descriptive and actionable

## Test Patterns

### Test File Organization
```
src/__tests__/unit/utils/
└── model-spec.test.ts  # Pattern to follow
```

### Validation Error Test Pattern
```typescript
describe('error cases', () => {
  it('should throw on invalid provider', () => {
    expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);
  });

  it('should include supported providers in error message', () => {
    try {
      parseModelSpec('invalid/model');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('anthropic');
      expect((error as Error).message).toContain('opencode');
    }
  });
});
```

### Global State Reset Pattern
```typescript
describe('feature', () => {
  // No special reset needed for module-private variables
  // ES module scoping provides natural test isolation

  it('should work', () => {
    // Test implementation
  });
});
```

**Note**: Module-private variables don't need special reset because:
- ES modules are cached per process
- Tests run in isolated contexts
- Vitest handles module isolation

## Type Definitions Reference

### GlobalProviderConfig Interface
**File**: `src/types/providers.ts` (Lines 353-364)

```typescript
export interface GlobalProviderConfig {
  /** Default provider to use when none specified */
  defaultProvider: ProviderId;

  /** Per-provider default options */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

### ProviderId Type
**File**: `src/types/providers.ts` (Lines 8-10)

```typescript
export type ProviderId =
  | 'anthropic'
  | 'opencode';
```

### ProviderOptions Interface
**File**: `src/types/providers.ts` (Lines 35-50)

```typescript
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
}
```

## Implementation Checklist

### Core Function Requirements (from PRD 7.6)
1. **INPUT**: `config: GlobalProviderConfig`
2. **VALIDATION**:
   - Validate `config.defaultProvider` is 'anthropic' or 'opencode'
   - Validate `config.providerDefaults` keys are valid ProviderIds
   - Throw on invalid provider
3. **OUTPUT**: Sets globalConfig variable (no return value)

### File Modifications
1. **MODIFY** `src/utils/provider-config.ts`:
   - Uncomment and implement `configureProviders()` function
   - Add private validation helpers
   - Mutate module-private `globalConfig` variable

2. **CREATE** `src/__tests__/unit/utils/provider-config.test.ts`:
   - Test valid configuration
   - Test invalid defaultProvider
   - Test invalid providerDefaults keys
   - Test providerDefaults is optional

3. **UPDATE** `src/utils/index.ts`:
   - Export `configureProviders` function

## Critical Gotchas

1. **ES Module Extensions**: Always use `.js` extensions in imports
   ```typescript
   import type { GlobalProviderConfig } from '../types/providers.js';  // ✓ CORRECT
   ```

2. **Module-Private Variable**: `globalConfig` is not exported
   ```typescript
   let globalConfig: GlobalProviderConfig | null = null;  // ✓ Already exists
   ```

3. **Void Return**: Function returns nothing, just mutates `globalConfig`
   ```typescript
   export function configureProviders(config: GlobalProviderConfig): void
   ```

4. **Validation Order**: Validate before mutating
   ```typescript
   // 1. Validate defaultProvider
   // 2. Validate providerDefaults keys
   // 3. Then set globalConfig = config
   ```

5. **Error Type**: Use `Error`, not custom classes
   ```typescript
   throw new Error('message');  // ✓ CORRECT
   ```

## Related Subtasks

- **P1.M2.T1.S1** (Complete): Created module-private `globalConfig` variable
- **P1.M2.T1.S2** (THIS PRP): Implement `configureProviders()` function
- **P1.M2.T1.S3** (Next): Implement `getGlobalProviderConfig()` accessor
- **P1.M2.T1.S4** (Future): Implement `resolveProviderConfig()` cascade utility

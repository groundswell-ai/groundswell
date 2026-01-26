# Test Patterns: Configuration Cascade

## Vitest Configuration

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,  // describe, it, expect available globally
    testMatch: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx'
    ],
    environment: 'node'
  }
});
```

## Import Patterns

**Critical**: Use `.js` extension in imports (TypeScript ESM requirement)

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import {
  configureProviders,
  getGlobalProviderConfig,
  resetGlobalConfig,
  resolveProviderConfig
} from '../../../utils/provider-config.js';
import type { GlobalProviderConfig, ProviderId, ProviderOptions } from '../../../../types/providers.js';
```

## Test Structure Pattern

```typescript
describe('resolveProviderConfig', () => {
  // Helper function for creating test configs
  const createGlobalConfig = (
    defaultProvider: ProviderId = 'anthropic',
    providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>
  ): GlobalProviderConfig => ({
    defaultProvider,
    providerDefaults
  });

  describe('feature area name', () => {
    it('should do something specific', () => {
      // Arrange
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });

      // Act
      const result = resolveProviderConfig(global, 'opencode', { timeout: 10000 });

      // Assert
      expect(result.provider).toBe('opencode');
      expect(result.options).toEqual({ timeout: 10000 });
    });
  });
});
```

## Test Isolation Pattern

```typescript
afterEach(() => {
  resetGlobalConfig();
});
```

## Assertion Patterns

### Object equality
```typescript
expect(result.options).toEqual({
  timeout: 10000,
  apiKey: 'sk-global'
});
```

### Type validation
```typescript
expect(typeof result.provider).toBe('string');
expect(['anthropic', 'opencode']).toContain(result.provider);
```

### Structure validation
```typescript
expect(result).toHaveProperty('provider');
expect(result).toHaveProperty('options');
```

## Key Test Scenarios

### 1. Global Default Only
```typescript
it('should use global default when no overrides provided', () => {
  const global = createGlobalConfig('anthropic');
  const result = resolveProviderConfig(global);
  expect(result.provider).toBe('anthropic');
});
```

### 2. Agent Override
```typescript
it('should use agent provider when provided', () => {
  const global = createGlobalConfig('anthropic');
  const result = resolveProviderConfig(global, 'opencode');
  expect(result.provider).toBe('opencode');
});
```

### 3. Prompt Override (Highest Priority)
```typescript
it('should use prompt provider over agent provider', () => {
  const global = createGlobalConfig('anthropic');
  const result = resolveProviderConfig(global, 'opencode', undefined, 'anthropic');
  expect(result.provider).toBe('anthropic'); // Prompt wins
});
```

### 4. Options Merge
```typescript
it('should merge agent options with global defaults', () => {
  const global = createGlobalConfig('anthropic', {
    anthropic: { timeout: 30000, apiKey: 'sk-global' }
  });
  const result = resolveProviderConfig(global, 'anthropic', { timeout: 10000 });

  expect(result.options).toEqual({
    timeout: 10000,  // Agent overrides global
    apiKey: 'sk-global'  // Global preserved
  });
});
```

## Validation Commands

```bash
# Run specific test file
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Run with verbose output
npm test -- src/__tests__/unit/utils/provider-config.test.ts --reporter=verbose

# Run all utils tests
npm test -- src/__tests__/unit/utils/

# Run full test suite
npm test
```

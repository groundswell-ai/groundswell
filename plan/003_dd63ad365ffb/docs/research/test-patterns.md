# Groundswell Test Patterns for Session Management

## 1. Test File Naming and Organization

### File Structure
```
src/__tests__/unit/providers/
├── anthropic-provider.test.ts               # Main provider tests
├── anthropic-provider-initialize.test.ts     # Initialize method tests
├── anthropic-provider-terminate.test.ts      # Terminate method tests
├── anthropic-provider-loadskills.test.ts     # Skills loading tests
├── anthropic-provider-hooks.test.ts          # Hook transformation tests
├── anthropic-provider-registermcps.test.ts   # MCP registration tests
└── anthropic-provider-normalizemodel.test.ts  # Model normalization tests
```

### Naming Convention
- Primary file: `<component>.test.ts`
- Method-specific: `<component>-<method>.test.ts`
- Descriptive suffixes indicating specific test areas

## 2. State Change Verification Patterns

### Testing Private State Through Public Methods
```typescript
// Pattern: Use @ts-expect-error to access private properties for testing
expect(provider.sdk).toBeNull();  // Before initialization
await provider.initialize();
expect(provider.sdk).not.toBeNull();  // After initialization
```

### State Tracking Through Method Chains
```typescript
// Verify state changes across method calls
await provider.initialize();
// @ts-expect-error - Testing private property
expect(provider.sdk).not.toBeNull();

await provider.terminate();
// @ts-expect-error - Testing private property
expect(provider.sdk).toBeNull();
```

## 3. Mock Patterns for SDK Dependencies

### Mocking File System Operations
```typescript
// Mock fs/promises for file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import('fs/promises');

// Mock successful file reads
vi.mocked(readFile).mockResolvedValue(mockSkillContent['math-expert']);
```

### Mocking SDK Module
```typescript
// Test successful SDK import
await provider.initialize();
// @ts-expect-error - Testing private property
expect(provider.sdk).toHaveProperty('query');
expect(provider.sdk).toHaveProperty('createSdkMcpServer');
```

## 4. Map Usage Testing Patterns

### ProviderRegistry Map Storage
```typescript
// Verify Map-based storage behavior
const registry = ProviderRegistry.getInstance();
const provider = createMockProvider('anthropic');

registry.register(provider);
expect(registry.has('anthropic')).toBe(true);
expect(registry.get('anthropic')).toBe(provider);
```

### Map Operations
```typescript
// Test Map.has() and Map.get()
expect(registry.has('anthropic')).toBe(true);
const retrieved = registry.get('anthropic');
expect(retrieved).toBe(provider);

// Test Map.size()
expect(registry.getAllProviders().size).toBe(1);
```

## 5. Lifecycle Testing Patterns

### Initialize Lifecycle
```typescript
describe('Initialize Lifecycle', () => {
  it('should handle initialization with options', async () => {
    const options = { apiKey: 'sk-test' };
    await provider.initialize(options);
    // Verify state changes
    // @ts-expect-error - Testing private property
    expect(provider.sdk).not.toBeNull();
  });

  it('should be idempotent (safe to call multiple times)', async () => {
    await provider.initialize();
    const firstSdk = provider.sdk;  // @ts-expect-error

    await provider.initialize();
    const secondSdk = provider.sdk;  // @ts-expect-error

    expect(firstSdk).toBe(secondSdk);  // Same reference
  });
});
```

### Terminate Lifecycle
```typescript
describe('Terminate Lifecycle', () => {
  it('should clear all state on termination', async () => {
    await provider.initialize();
    // @ts-expect-error - Testing private property
    expect(provider.sdk).not.toBeNull();

    await provider.terminate();
    // @ts-expect-error - Testing private property
    expect(provider.sdk).toBeNull();
  });

  it('should be safe to call multiple times', async () => {
    await provider.initialize();
    await provider.terminate();
    await provider.terminate();  // Should not throw
  });
});
```

## 6. Error Handling Patterns

### Error State Testing
```typescript
// Test error scenarios
provider.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));
await expect(provider.initialize()).rejects.toThrow('Init failed');
```

### Graceful Error Handling
```typescript
// Test methods that should never throw
const testScenarios = [
  provider.terminate(),  // Never throws
  provider.initialize().then(() => provider.terminate()),
];

for (const scenario of testScenarios) {
  await expect(scenario).resolves.not.toThrow();
}
```

## 7. Session Storage Testing Patterns

### Session State Management
```typescript
// Test session state across method calls
await provider.initialize();
await provider.loadSkills(skills);  // Modify state
// @ts-expect-error - Testing private property
expect(provider.skillsPrompt).toContain('skill-content');

await provider.terminate();
// @ts-expect-error - Testing private property
expect(provider.skillsPrompt).toBe('');  // Cleared
```

### Session Isolation
```typescript
// Verify independent session instances
const provider1 = new AnthropicProvider();
const provider2 = new AnthropicProvider();

await provider1.initialize();
await provider2.initialize();

// Should maintain independent state
expect(provider1.sdk).not.toBe(provider2.sdk);
```

## 8. Testing Best Practices Observed

1. **Test Isolation**: Each test file `beforeEach` resets provider and registry state
2. **State Verification**: Use private property access with `@ts-expect-error`
3. **Mock Cleanup**: Always clear mocks after each test with `vi.clearAllMocks()`
4. **Error Scenarios**: Test both success and error paths for each method
5. **Edge Cases**: Test with empty inputs, null/undefined, and invalid values
6. **Integration Tests**: Verify method interactions and state transitions
7. **Type Safety**: Verify TypeScript types work correctly in tests

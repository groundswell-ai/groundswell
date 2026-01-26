# Research Findings: Testing Capability Checking Helper Methods

**Research Date:** 2026-01-26
**Purpose:** Best practices and examples for testing capability checking helper methods

---

## 1. Testing Capability Checking Helper Methods (supports(), requiresFeatures())

### Key Patterns

#### 1.1 Feature Detection Testing
```typescript
// Example from Modernizr-style capability checking
describe('CapabilityChecker.supports()', () => {
  it('should return true when feature is available', () => {
    // Mock the feature
    global.window.FeatureAPI = { isSupported: true };
    expect(CapabilityChecker.supports('FeatureAPI')).toBe(true);
  });

  it('should return false when feature is not available', () => {
    delete global.window.FeatureAPI;
    expect(CapabilityChecker.supports('FeatureAPI')).toBe(false);
  });

  it('should cache capability checks', () => {
    const spy = jest.spyOn(CapabilityChecker, 'detectFeature');
    CapabilityChecker.supports('CachedFeature');
    CapabilityChecker.supports('CachedFeature');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

#### 1.2 Feature Requirements Testing
```typescript
describe('CapabilityChecker.requiresFeatures()', () => {
  it('should pass when all required features are available', () => {
    const requiredFeatures = ['feature1', 'feature2'];
    expect(CapabilityChecker.requiresFeatures(requiredFeatures)).toBe(true);
  });

  it('should fail when any required feature is missing', () => {
    const requiredFeatures = ['feature1', 'nonexistent-feature'];
    expect(CapabilityChecker.requiresFeatures(requiredFeatures)).toBe(false);
  });

  it('should handle empty array as always satisfied', () => {
    expect(CapabilityChecker.requiresFeatures([])).toBe(true);
  });
});
```

### Common Anti-Patterns to Avoid

1. **Testing implementation details instead of behavior**
   - ❌ Don't test the internal detection logic
   - ✅ Test the public API (supports() returns boolean)

2. **Not testing edge cases**
   - ❌ Only testing happy path
   - ✅ Test: undefined, null, empty strings, missing features

3. **Over-mocking**
   - ❌ Mocking every single browser API
   - ✅ Mock only the specific feature being tested

---

## 2. TypeScript/JavaScript Class Method Testing Best Practices

### 2.1 Testing Public vs Private Methods

**Best Practice:** Test public methods, which indirectly test private methods

```typescript
class Workflow {
  private validateCapability(capability: string): boolean {
    // Internal validation logic
  }

  public supports(capability: string): boolean {
    return this.validateCapability(capability);
  }
}

// ✅ Good: Test the public API
describe('Workflow.supports()', () => {
  it('should validate capabilities correctly', () => {
    const workflow = new Workflow();
    expect(workflow.supports('valid-feature')).toBe(true);
  });
});

// ❌ Avoid: Directly testing private methods
```

### 2.2 Arrange-Act-Assert Pattern

```typescript
describe('CapabilityHelper', () => {
  it('should check multiple capabilities', () => {
    // Arrange
    const helper = new CapabilityHelper();
    const capabilities = ['cap1', 'cap2', 'cap3'];

    // Act
    const result = helper.hasAllCapabilities(capabilities);

    // Assert
    expect(result).toBe(true);
  });
});
```

### 2.3 Testing Class Instances with Dependencies

```typescript
describe('Workflow with CapabilityChecker', () => {
  let workflow: Workflow;
  let mockCapabilityChecker: jest.Mocked<CapabilityChecker>;

  beforeEach(() => {
    mockCapabilityChecker = {
      supports: jest.fn(),
      requiresFeatures: jest.fn(),
    } as any;
    workflow = new Workflow(mockCapabilityChecker);
  });

  it('should delegate capability checks', () => {
    mockCapabilityChecker.supports.mockReturnValue(true);
    workflow.initialize();
    expect(mockCapabilityChecker.supports).toHaveBeenCalledWith('required-feature');
  });
});
```

---

## 3. Provider Capability Testing Patterns

### 3.1 Mock Provider Testing

```typescript
interface Provider {
  supports(operation: string): boolean;
  execute(operation: string, data: any): Promise<any>;
}

describe('Provider capability testing', () => {
  it('should only execute supported operations', async () => {
    const provider = new MockProvider();

    expect(provider.supports('valid-operation')).toBe(true);
    expect(provider.supports('invalid-operation')).toBe(false);

    await expect(
      provider.execute('valid-operation', {})
    ).resolves.toBeDefined();

    await expect(
      provider.execute('invalid-operation', {})
    ).rejects.toThrow('Unsupported operation');
  });
});
```

### 3.2 Provider Registration Pattern

```typescript
describe('ProviderRegistry', () => {
  it('should register providers with capability declarations', () => {
    const registry = new ProviderRegistry();
    const provider = new MyProvider();

    registry.register(provider);

    expect(registry.hasCapability('my-provider-feature')).toBe(true);
  });

  it('should select appropriate provider based on capabilities', () => {
    const registry = new ProviderRegistry();
    const provider1 = new ProviderA(); // supports feature X
    const provider2 = new ProviderB(); // supports feature Y

    registry.register(provider1);
    registry.register(provider2);

    expect(registry.getProviderFor('feature-x')).toBe(provider1);
    expect(registry.getProviderFor('feature-y')).toBe(provider2);
  });
});
```

---

## 4. Recommended Resources

### GitHub Repositories with Similar Tests

1. **Modernizr** - Feature detection library
   - URL: https://github.com/Modernizr/Modernizr
   - Key takeaway: Comprehensive feature detection tests with browser mocks

2. **React** - Feature detection and capability checks
   - URL: https://github.com/facebook/react
   - Tests in: `packages/react-dom/src/__tests__`
   - Key takeaway: Test capabilities in isolation with proper cleanup

3. **TensorFlow.js** - Backend capability checking
   - URL: https://github.com/tensorflow/tfjs
   - Key takeaway: Backend provider selection based on capabilities

4. **Puppeteer** - Browser capability testing
   - URL: https://github.com/puppeteer/puppeteer
   - Key takeaway: Comprehensive browser API mocking

### Blog Posts & Documentation

1. **Jest Testing Patterns** - Official Jest documentation
   - URL: https://jestjs.io/docs/getting-started
   - Key takeaways: Mock functions, test isolation, coverage

2. **Testing TypeScript with Jest** - Basarat's guide
   - URL: https://basarat.gitbook.io/typescript/main-1/jest
   - Key takeaways: TypeScript-specific testing patterns

3. **"Unit Testing Best Practices"** by Martin Fowler
   - URL: https://martinfowler.com/bliki/UnitTest.html
   - Key takeaways: Test behavior, not implementation

### StackOverflow Discussions (Common Topics)

1. **Testing private methods in TypeScript**
   - Search: "TypeScript test private methods"
   - Consensus: Don't test private methods directly

2. **Mocking browser capabilities in tests**
   - Search: "jest mock browser API capabilities"
   - Solutions: Use `global.window` or testing-library

3. **Testing feature detection**
   - Search: "testing feature detection JavaScript"
   - Patterns: Mock the feature, test the detector

---

## 5. Common Pitfalls and Anti-Patterns

### 5.1 Testing Implementation Details
❌ **Bad:**
```typescript
it('should call internal check method', () => {
  const spy = spyOn(workflow, 'internalCheck');
  workflow.supports('feature');
  expect(spy).toHaveBeenCalled();
});
```

✅ **Good:**
```typescript
it('should return correct capability status', () => {
  expect(workflow.supports('feature')).toBe(true);
});
```

### 5.2 Not Cleaning Up Test State
❌ **Bad:**
```typescript
it('should test feature A', () => {
  global.window.FeatureA = true;
  // Test...
});

it('should test feature B', () => {
  // FeatureA is still present!
  global.window.FeatureB = true;
});
```

✅ **Good:**
```typescript
afterEach(() => {
  // Clean up global state
  delete global.window.FeatureA;
  delete global.window.FeatureB;
});
```

### 5.3 Brittle Tests Tied to Implementation
❌ **Bad:**
```typescript
it('should check capabilities in specific order', () => {
  expect(capabilityChecker.checkOrder).toEqual(['A', 'B', 'C']);
});
```

✅ **Good:**
```typescript
it('should determine correct capability state', () => {
  expect(capabilityChecker.hasAllRequired()).toBe(true);
});
```

### 5.4 Testing Multiple Behaviors in One Test
❌ **Bad:**
```typescript
it('should test all capability scenarios', () => {
  expect(workflow.supports('A')).toBe(true);
  expect(workflow.supports('B')).toBe(false);
  expect(workflow.requiresFeatures(['C'])).toBe(true);
  // ...10 more assertions
});
```

✅ **Good:**
```typescript
it('should support feature A', () => {
  expect(workflow.supports('A')).toBe(true);
});

it('should not support feature B', () => {
  expect(workflow.supports('B')).toBe(false);
});
```

---

## 6. Test Structure Checklist

### For Capability Checking Methods:
- [ ] Test true/positive cases
- [ ] Test false/negative cases
- [ ] Test edge cases (null, undefined, empty)
- [ ] Test caching behavior (if applicable)
- [ ] Test with mocked features
- [ ] Test cleanup between tests
- [ ] Test error handling

### For Class Method Testing:
- [ ] Focus on public API
- [ ] Use Arrange-Act-Assert
- [ ] Mock external dependencies
- [ ] Test state changes
- [ ] Test side effects
- [ ] Test error conditions
- [ ] Ensure test isolation

### For Provider Capability Testing:
- [ ] Test provider registration
- [ ] Test capability declaration
- [ ] Test provider selection
- [ ] Test fallback behavior
- [ ] Test capability composition
- [ ] Test multi-provider scenarios

---

## 7. Example Test Suite Structure

```typescript
describe('Workflow Capability System', () => {
  let workflow: Workflow;
  let mockProviders: Provider[];

  beforeEach(() => {
    // Setup test fixtures
    mockProviders = createMockProviders();
    workflow = new Workflow(mockProviders);
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('supports()', () => {
    describe('when feature is available', () => {
      it('should return true', () => {
        expect(workflow.supports('available-feature')).toBe(true);
      });
    });

    describe('when feature is not available', () => {
      it('should return false', () => {
        expect(workflow.supports('missing-feature')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle null input', () => {
        expect(workflow.supports(null as any)).toBe(false);
      });

      it('should handle undefined input', () => {
        expect(workflow.supports(undefined as any)).toBe(false);
      });
    });
  });

  describe('requiresFeatures()', () => {
    it('should accept array of features', () => {
      const features = ['feature1', 'feature2'];
      expect(workflow.requiresFeatures(features)).toBe(true);
    });

    it('should handle empty array', () => {
      expect(workflow.requiresFeatures([])).toBe(true);
    });

    it('should fail if any feature is missing', () => {
      const features = ['feature1', 'nonexistent'];
      expect(workflow.requiresFeatures(features)).toBe(false);
    });
  });
});
```

---

## 8. Key Takeaways Summary

1. **Test Behavior, Not Implementation**
   - Focus on what the method does, not how it does it
   - Test the public API, not private methods

2. **Use Proper Test Isolation**
   - Clean up mocks and global state between tests
   - Use beforeEach/afterEach hooks

3. **Cover Edge Cases**
   - Test with null, undefined, empty inputs
   - Test both success and failure paths

4. **Mock External Dependencies**
   - Mock browser APIs for capability checks
   - Mock providers for provider testing

5. **Follow AAA Pattern**
   - Arrange: Set up test data
   - Act: Call the method
   - Assert: Verify results

6. **Write Maintainable Tests**
   - One assertion per test (when possible)
   - Descriptive test names
   - Avoid implementation coupling

---

## Notes

- Web search quota was reached during research
- This document compiles best practices from established testing patterns
- All patterns are based on industry-standard testing practices
- References to well-known open-source projects are provided for real-world examples

**Next Steps:**
- Review existing test structure in project
- Apply these patterns to capability checking tests
- Ensure test coverage for all helper methods
- Add integration tests for provider interactions

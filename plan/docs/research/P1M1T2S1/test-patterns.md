# Test Patterns Research: P1.M1.T2.S1

## Reference Test Pattern from P1.M1.T1.S1

**File**: `src/__tests__/adversarial/parent-validation.test.ts`

### Complete Reference Pattern

```typescript
/**
 * Parent Validation Tests (TDD Red Phase)
 *
 * These tests validate the attachChild() method properly prevents
 * attaching a child workflow that already has a different parent.
 *
 * This is the RED phase of TDD - tests are written to FAIL initially,
 * documenting the expected behavior before implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/unit/workflow.test.ts:4-11
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Adversarial: Parent Validation', () => {
  /**
   * Setup: Mock console methods to capture error messages
   * Pattern from: research/console-mocking.md "Basic Spying Patterns"
   */
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  /**
   * Teardown: Restore all mocks to prevent test pollution
   * CRITICAL: Always use vi.restoreAllMocks() in afterEach
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Primary failing test for parent validation bug
   *
   * Bug: attachChild() only checks if child is already attached to THIS workflow
   * It does NOT check if child already has a different parent
   *
   * Expected: Error thrown with message containing 'already has a parent'
   * Actual: No error thrown, inconsistent tree state created
   *
   * Pattern from: research/error-assertions.md "Partial Message Matching"
   */
  it('should throw when attaching child that already has a different parent', () => {
    // ARRANGE: Create two parent workflows
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');

    // ARRANGE: Create child with parent1 (constructor auto-attaches)
    // CRITICAL: Constructor calls parent.attachChild(this) at workflow.ts:113-116
    const child = new SimpleWorkflow('Child', parent1);

    // Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);

    // ACT & ASSERT: Attempting to attach child to parent2 should throw
    // This test FAILS because attachChild() doesn't check child.parent !== this
    expect(() => parent2.attachChild(child)).toThrow('already has a parent');
  });
});
```

## Key Test Pattern Elements

### 1. Console Mocking Pattern
```typescript
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### 2. Error Assertion Pattern
```typescript
// Partial message matching (recommended)
expect(() => parent2.attachChild(child)).toThrow('already has a parent');

// Exact message matching
expect(() => parent.attachChild(child)).toThrow(
  'Child already attached to this workflow'
);

// Regex pattern matching
expect(() => operation()).toThrow(/circular|cycle|ancestor/);
```

### 3. Test Fixture Pattern
```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}
```

## Test Framework Details

- **Framework**: Vitest
- **Config**: `vitest.config.ts`
- **Test location**: `src/__tests__/adversarial/`
- **Run command**: `npm test`
- **Watch mode**: `npm run test:watch`

## Test File Structure

```
src/__tests__/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests
└── adversarial/       # Edge case and failure mode testing
```

## Adapting Pattern for Circular Reference Tests

For P1.M1.T2.S1, we need to test TWO scenarios:

1. **Immediate circular reference**: `child.attachChild(parent)`
2. **Ancestor circular reference**: `root -> child1 -> child2 -> root` (multi-level)

Both tests should:
- Follow the same console mocking pattern
- Use SimpleWorkflow fixture
- Assert error message contains 'circular' OR 'cycle' OR 'ancestor'
- Be in the adversarial test directory

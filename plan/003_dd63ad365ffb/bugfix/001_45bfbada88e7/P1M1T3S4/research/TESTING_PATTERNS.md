# Testing Patterns Research for P1M1T3S4

## Vitest Testing Framework

### Configuration
- **File**: `vitest.config.ts`
- **Test Runner**: Vitest 1.0.0
- **Globals**: Enabled (`describe`, `it`, `expect` available globally)
- **Target**: Node 18
- **File Pattern**: `src/__tests__/**/*.test.ts`

### Running Tests
```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
vitest run            # Direct vitest command
```

## Test File Structure

### Standard Organization
```typescript
import { describe, it, expect } from 'vitest';
import { Workflow, Step, ... } from '../../index.js';

describe('Feature being tested', () => {
  describe('Specific scenario', () => {
    it('should do something specific', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Hierarchy Patterns
1. **Top-level describe**: Feature/method name (`Workflow.restartStep`)
2. **Second-level describe**: Scenario categories (`error handling`, `successful execution`)
3. **Third-level describe** (optional): Specific sub-scenarios
4. **it blocks**: Individual test cases with descriptive names

## Test Patterns

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
it('should execute the step method and return its result', async () => {
  // ARRANGE: Set up test workflow and dependencies
  class TestWorkflow extends Workflow {
    @Step({ restartable: true })
    async myStep(): Promise<string> {
      return 'step result';
    }

    async run(): Promise<string> {
      return await this.restartStep('myStep') as string;
    }
  }

  // ACT: Execute the test
  const wf = new TestWorkflow();
  const result = await wf.run();

  // ASSERT: Verify expected outcome
  expect(result).toBe('step result');
});
```

### 2. Helper Functions for Test Data

```typescript
// Create mock objects with sensible defaults
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { stepName: 'testStep' },
    logs: [],
    ...overrides,
  };
}

// Usage
it('should handle custom error messages', () => {
  const error = createMockWorkflowError({ message: 'CUSTOM_ERROR' });
  const result = analyzeError(error);
  expect(result).toBe('retry');
});
```

### 3. Test Workflow Classes

```typescript
// Pattern 1: Simple workflow with single step
class TestWorkflow extends Workflow {
  @Step({ restartable: true })
  async myStep(): Promise<string> {
    return 'result';
  }

  async run(): Promise<string> {
    return await this.restartStep('myStep') as string;
  }
}

// Pattern 2: Workflow with state tracking
class StatefulWorkflow extends Workflow {
  attemptCount = 0;

  @Step({ restartable: true })
  async retryableStep(): Promise<void> {
    this.attemptCount++;
    if (this.attemptCount < 3) {
      throw new Error('Temporary failure');
    }
  }

  async run(): Promise<void> {
    await this.retryableStep();
  }
}

// Pattern 3: Workflow with event capture
class EventCapturingWorkflow extends Workflow {
  capturedEvents: WorkflowEvent[] = [];

  async run(): Promise<void> {
    this.addObserver({
      onLog: () => {},
      onEvent: (e) => this.capturedEvents.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    await this.restartStep('myStep');
  }
}
```

### 4. Event Capture Pattern

```typescript
// Capture events for verification
const events: WorkflowEvent[] = [];
this.addObserver({
  onLog: () => {},
  onEvent: (e) => events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

// Filter events by type
const restartedEvents = events.filter(e => e.type === 'stepRestarted');
expect(restartedEvents.length).toBe(1);

// Type narrowing for discriminated unions
if (restartedEvents[0]?.type === 'stepRestarted') {
  expect(restartedEvents[0].stepName).toBe('myStep');
  expect(restartedEvents[0].retryCount).toBe(1);
}
```

### 5. Async Error Testing

```typescript
// Pattern 1: Expect rejection
await expect(wf.run()).rejects.toThrow('Error message');

// Pattern 2: Try-catch with assertion
try {
  await wf.run();
  expect.fail('Should have thrown error');
} catch (error) {
  expect(error).toBeInstanceOf(WorkflowError);
  expect((error as WorkflowError).message).toContain('expected text');
}

// Pattern 3: Error object matching
await expect(wf.run()).rejects.toMatchObject({
  message: "Step 'nonexistentStep' not found",
  workflowId: wf.id,
  state: expect.any(Object),
  logs: expect.any(Array),
});
```

### 6. Counter and State Verification

```typescript
// Track execution count
class CountingWorkflow extends Workflow {
  stepExecuted = false;
  attemptCount = 0;

  @Step({ restartable: true })
  async myStep(): Promise<void> {
    this.attemptCount++;
    this.stepExecuted = true;
  }

  async run(): Promise<void> {
    await this.restartStep('myStep');
  }
}

const wf = new CountingWorkflow();
await wf.run();

expect(wf.stepExecuted).toBe(true);
expect(wf.attemptCount).toBe(1);
```

## Assertion Patterns

### Equality Assertions
```typescript
expect(result).toBe('value')           // Strict equality (===)
expect(result).toEqual({ key: 'value' }) // Deep equality
expect(result).toMatchObject({ key: 'value' }) // Partial match
```

### Truthiness Assertions
```typescript
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeDefined()
expect(value).toBeUndefined()
expect(value).toBeNull()
expect(value).not.toBeNull()
```

### Numeric Assertions
```typescript
expect(count).toBe(1)
expect(count).toBeGreaterThan(0)
expect(count).toBeLessThanOrEqual(10)
expect(array.length).toBeGreaterThanOrEqual(1)
```

### String Assertions
```typescript
expect(message).toBe('exact match')
expect(message).toContain('substring')
expect(message).toMatch(/regex pattern/)
```

### Type Assertions
```typescript
expect(error).toBeInstanceOf(Error)
expect(array).toContain(item)
```

## Test Naming Conventions

### Describe Block Names
- **Feature-level**: `'Workflow.restartStep'`, `'Workflow.analyzeError'`
- **Scenario-level**: `'error handling'`, `'successful step execution'`
- **Sub-scenario**: `'when step is not found'`, `'with default options'`

### Test (it) Names
- Use **should** statements: `'should throw error for non-existent step'`
- Be **specific** about what is being tested
- Include **expected outcome** in the name

### Examples
```typescript
✅ Good:
- 'should throw WorkflowError when step is not found'
- 'should emit stepRestarted event with correct payload'
- 'should return retry for transient error codes'

❌ Bad:
- 'test error' (too vague)
- 'restart' (doesn't say what should happen)
- 'event test' (not specific enough)
```

## Test Organization

### Grouping Related Tests
```typescript
describe('Workflow.restartStep', () => {
  describe('error handling', () => {
    it('should throw error for non-existent step', async () => { ... });
    it('should throw error when max retries exceeded', async () => { ... });
  });

  describe('successful execution', () => {
    it('should execute step and return result', async () => { ... });
    it('should preserve workflow context', async () => { ... });
  });

  describe('event emission', () => {
    it('should emit stepRestarted event', async () => { ... });
  });
});
```

### Test Isolation
- **Each test is independent**: No shared state between tests
- **Create new instances**: Each test creates fresh workflow instances
- **Clean up**: No manual cleanup needed (Vitest handles it)

## Edge Case Testing

### Boundary Values
```typescript
it('should allow exactly maxRetries attempts', async () => {
  // Test exact boundary: retryCount = maxRetries
  await this.restartStep('myStep', { retryCount: 2, maxRetries: 3 });
});

it('should throw when maxRetries exceeded by 1', async () => {
  // Test just past boundary: retryCount = maxRetries + 1
  await this.restartStep('myStep', { retryCount: 3, maxRetries: 3 });
});
```

### Null/Undefined Handling
```typescript
it('should handle null original error gracefully', async () => {
  const error = createMockWorkflowError({
    original: null as unknown,
  });
  const result = wf.analyzeError(error);
  expect(result).toBe('abort');
});

it('should handle undefined options', async () => {
  const result = await this.restartStep('myStep', undefined);
  expect(result).toBeDefined();
});
```

### Type Safety
```typescript
// Type narrowing for discriminated unions
if (event.type === 'stepRestarted') {
  // TypeScript knows event has stepName, retryCount, etc.
  expect(event.stepName).toBe('myStep');
}
```

## Mock Patterns

### Partial Mock Objects
```typescript
const mockObserver: WorkflowObserver = {
  onLog: () => {},
  onEvent: (e) => events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
```

### Spying on Methods
```typescript
// Track method calls
let callCount = 0;
class SpyWorkflow extends Workflow {
  async myStep(): Promise<void> {
    callCount++;
  }
}
```

## Performance Testing (Rare)
```typescript
it('should provide O(1) lookup performance', () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    TRANSIENT_ERROR_SET.has('TIMEOUT');
  }
  const end = performance.now();
  expect(end - start).toBeLessThan(10); // < 10ms for 1000 lookups
});
```

## Best Practices Summary

1. ✅ **Use AAA pattern** (Arrange-Act-Assert)
2. ✅ **Create helper functions** for test data
3. ✅ **Group related tests** with nested describe blocks
4. ✅ **Use descriptive test names** with "should" statements
5. ✅ **Test both success and failure** scenarios
6. ✅ **Verify edge cases** (null, undefined, boundaries)
7. ✅ **Capture and verify events** for event-driven code
8. ✅ **Use type narrowing** for discriminated unions
9. ✅ **Keep tests independent** (no shared state)
10. ✅ **Use async/await** consistently for async tests

# Codebase Inventory for P1M1T3S4

## Existing Test Files

### Workflow Restart Tests (ALREADY EXISTS)

**File**: `src/__tests__/unit/workflow-restart-step.test.ts`
- **Lines**: 527
- **Status**: ✅ COMPREHENSIVE
- **Coverage**:
  - Error handling (non-existent step, non-function step, max retries exceeded)
  - Successful step execution (various return types, void methods, context preservation)
  - Event emission (stepRestarted events with retry counts)
  - State handling (snapshots, state overrides, event payloads)
  - Integration with @Step decorator
  - Retry count semantics

**Test Cases**:
```typescript
// Error handling
- should throw WorkflowError when step is not found
- should throw WorkflowError when step exists but is not a function
- should throw WorkflowError when max retries exceeded
- should allow exactly maxRetries attempts
- should default maxRetries to 3 when not specified

// Successful execution
- should execute the step method and return its result
- should execute step with no return value
- should execute step that returns a number
- should execute step that returns an object
- should preserve workflow context (this binding)

// Event emission
- should emit stepRestarted event with correct payload
- should emit stepRestarted event with retryCount of 1 by default
- should emit stepRestarted event with custom retryCount

// State handling
- should capture state snapshot when no stateOverride provided
- should include state in stepRestarted event
- should use stateOverride when provided in event payload

// Integration
- should work with methods decorated with @Step
- should work with methods not decorated with @Step
- should work with async methods that throw errors

// Retry semantics
- should calculate retryCount as (options.retryCount ?? 0) + 1
- should match stepRetry event retryCount semantics
```

### Workflow Analyze Error Tests (ALREADY EXISTS)

**File**: `src/__tests__/unit/workflow-analyze-error.test.ts`
- **Lines**: 714
- **Status**: ✅ COMPREHENSIVE
- **Coverage**:
  - Recoverable flag checking
  - stepName extraction from error metadata
  - stepMetadata lookup with graceful handling
  - Restartable flag checking
  - Integration with analyzeErrorForRestart utility
  - Transient error detection
  - ErrorCriterion variants (string, regex, recoverable, function)
  - Multiple criteria matching
  - Return type validation
  - Integration with restartStep method
  - Edge cases (null original error, undefined original error, empty retryOn array, special characters)

**Test Cases**:
```typescript
// Recoverable flag checking
- should return abort when error is marked as non-recoverable
- should continue analysis when error is marked as recoverable
- should continue analysis when recoverable property is missing

// stepName extraction
- should return abort when error.state is undefined
- should return abort when error.state.stepName is undefined
- should return abort when error.state.stepName is null
- should extract stepName from error.state.stepName

// stepMetadata lookup
- should return abort when stepMetadata does not exist
- should return abort when step not found in stepMetadata
- should return abort when stepMeta is undefined

// Restartable flag checking
- should return abort when step is not marked as restartable
- should return abort when restartable is undefined
- should continue analysis when step is marked as restartable

// Transient errors
- should return retry for TIMEOUT transient error
- should return retry for RATE_LIMIT transient error
- should return retry for NETWORK_ERROR transient error
- should return retry for SERVICE_UNAVAILABLE transient error

// ErrorCriterion variants
- string code matching (exact match, no match)
- regex code matching (pattern match, no match, case-insensitive)
- recoverable flag matching (true, false, default)
- function predicate matching (returns true, returns false, complex logic)

// Multiple criteria
- should return retry when any criterion matches (OR logic)
- should return abort when no criteria match

// Integration
- should provide decision for use with restartStep

// Edge cases
- should handle null original error gracefully
- should handle undefined original error gracefully
- should handle empty retryOn array
- should handle special characters in error message
```

## Test Framework Configuration

**Vitest Config**: `vitest.config.ts`
```typescript
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    globals: true,
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic',
  },
});
```

**Package.json Scripts**:
```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

## Test Patterns Used in Codebase

### 1. AAA Pattern (Arrange-Act-Assert)
```typescript
it('should do something', async () => {
  // Arrange: Set up test data and dependencies
  const events: WorkflowEvent[] = [];
  class TestWorkflow extends Workflow { ... }

  // Act: Execute the function under test
  const wf = new TestWorkflow();
  await wf.run();

  // Assert: Verify expected outcomes
  expect(result).toBe('expected');
});
```

### 2. Helper Functions for Test Data Creation
```typescript
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
```

### 3. Test Workflow Classes
```typescript
class TestWorkflow extends Workflow {
  @Step({ restartable: true })
  async myStep(): Promise<string> {
    return 'result';
  }

  async run(): Promise<string> {
    return await this.restartStep('myStep') as string;
  }
}
```

### 4. Event Capture Pattern
```typescript
const events: WorkflowEvent[] = [];
this.addObserver({
  onLog: () => {},
  onEvent: (e) => events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});
// Later: filter events
const restartedEvents = events.filter(e => e.type === 'stepRestarted');
```

## Related Source Files

### Workflow Class
**File**: `src/core/workflow.ts`
- **restartStep method**: Lines 506-563
- **analyzeError method**: Lines 650-689
- **stepMetadata Map**: Used for storing step decorator metadata

### Step Decorator
**File**: `src/decorators/step.ts`
- **Lines 29-238**: Full decorator implementation with retry loop
- **Lines 115-229**: Retry loop implementation
- **Lines 40-65**: Error criterion matching logic

### Restart Analysis Utility
**File**: `src/utils/restart-analysis.ts`
- **Lines 378-424**: `analyzeErrorForRestart` function
- **Lines 33-47**: Transient error constants
- **Lines 83-88**: `isTransientError` function
- **Lines 159-187**: `matchesCriterion` function

## Type Definitions

### RestartStepOptions
```typescript
export interface RestartStepOptions {
  retryCount?: number;
  maxRetries?: number;
  stateOverride?: SerializedWorkflowState;
}
```

### ErrorCriterion
```typescript
type ErrorCriterion =
  | { code: string }
  | { code: RegExp }
  | { recoverable: boolean }
  | ((error: WorkflowError) => boolean);
```

### RestartAnalysis
```typescript
interface RestartAnalysis {
  shouldRestart: boolean;
  reason: string;
  suggestedAction: 'retry' | 'abort' | 'rebuild';
  estimatedSuccessProbability: number;
}
```

## Key Observations

1. **Tests Are Already Comprehensive**: Both `restartStep` and `analyzeError` have extensive test coverage
2. **File Naming Discrepancy**: The task specifies `workflow-restart.test.ts` but actual files are:
   - `workflow-restart-step.test.ts`
   - `workflow-analyze-error.test.ts`
3. **Test Quality**: Existing tests follow best practices with AAA pattern, helper functions, and comprehensive edge case coverage
4. **No Gap Identified**: The contract definition in P1.M1.T3.S4 is fully satisfied by existing tests

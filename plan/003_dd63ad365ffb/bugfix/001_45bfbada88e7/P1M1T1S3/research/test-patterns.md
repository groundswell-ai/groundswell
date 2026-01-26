# Test Patterns: Event Type Testing for P1.M1.T1.S3

## Executive Summary

This document analyzes the existing test patterns for event types in the Groundswell codebase and provides specific guidance for testing the updated `stepRetry` event type.

---

## 1. Existing Test Files for Event System

### 1.1 Primary Event Test Files

| File | Lines | Focus |
|------|-------|-------|
| `src/__tests__/unit/event-replayer.test.ts` | 1-999 | Event replay for all event types |
| `src/__tests__/unit/decorators-retry.test.ts` | 1-390 | **stepRetry event testing** |
| `src/__tests__/integration/observer-logging.test.ts` | 1-644 | Observer pattern with events |
| `src/__tests__/adversarial/observer-propagation.test.ts` | 1-487 | Event propagation through hierarchy |
| `src/__tests__/unit/workflow-emitEvent-childDetached.test.ts` | 1-154 | Specific event emission testing |
| `src/__tests__/unit/decorators.test.ts` | 1-999 | Basic step event tests |

### 1.2 Test File Locations

```bash
src/__tests__/
├── unit/
│   ├── event-replayer.test.ts        # Event replay system
│   ├── decorators-retry.test.ts      # stepRetry event tests (PRIMARY)
│   ├── decorators.test.ts            # Basic step event tests
│   ├── workflow.test.ts              # Workflow events
│   └── workflow-emitEvent-childDetached.test.ts
├── integration/
│   ├── observer-logging.test.ts      # Observer pattern integration
│   └── tree-mirroring.test.ts        # Event collection and tree mirroring
└── adversarial/
    └── observer-propagation.test.ts  # Event propagation edge cases
```

---

## 2. Current stepRetry Event Tests

### 2.1 Test File: decorators-retry.test.ts

**File**: `src/__tests__/unit/decorators-retry.test.ts`

**Total Lines**: 390
**Test Count**: 12 test cases

### 2.2 stepRetry-Specific Tests

#### Test 1: "should emit stepRetry event on each retry"

**Lines**: 91-127

```typescript
it('should emit stepRetry event on each retry', async () => {
  const events: WorkflowEvent[] = [];

  class RetryWorkflow extends Workflow {
    attemptCount = 0;

    @Step({ restartable: true, maxRetries: 3 })
    async retryableStep(): Promise<void> {
      this.attemptCount++;
      if (this.attemptCount < 2) {
        throw new Error('Temporary failure');
      }
    }

    async run() {
      this.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await this.retryableStep();
    }
  }

  const wf = new RetryWorkflow();
  await wf.run();

  const retryEvents = events.filter(e => e.type === 'stepRetry');
  expect(retryEvents.length).toBe(1);  // One retry event

  if (retryEvents[0]?.type === 'stepRetry') {
    expect(retryEvents[0].retryCount).toBe(1);
    expect(retryEvents[0].step).toBe('retryableStep');  // ← REFERS TO 'step' FIELD
  }
});
```

**Key Patterns**:
1. Event capture via observer's `onEvent` callback
2. Event filtering by type: `events.filter(e => e.type === 'stepRetry')`
3. Type narrowing: `if (retryEvents[0]?.type === 'stepRetry')`
4. Property assertions with type-safe access

#### Test 2: "should emit stepStart, stepRetry, and stepEnd events in order"

**Lines**: 308-349

```typescript
it('should emit stepStart, stepRetry, and stepEnd events in order', async () => {
  const events: WorkflowEvent[] = [];

  class EventsWorkflow extends Workflow {
    attemptCount = 0;

    @Step({ restartable: true, maxRetries: 2 })
    async retryableStep(): Promise<void> {
      this.attemptCount++;
      if (this.attemptCount < 2) {
        throw new Error('Temporary failure');
      }
    }

    async run() {
      this.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      await this.retryableStep();
    }
  }

  const wf = new EventsWorkflow();
  await wf.run();

  const eventTypes = events.map(e => e.type);
  expect(eventTypes).toContain('stepStart');
  expect(eventTypes).toContain('stepRetry');
  expect(eventTypes).toContain('stepEnd');

  // Verify ordering: stepStart comes before stepRetry, stepRetry comes before stepEnd
  const startIdx = eventTypes.indexOf('stepStart');
  const retryIdx = eventTypes.indexOf('stepRetry');
  const endIdx = eventTypes.indexOf('stepEnd');

  expect(startIdx).toBeLessThan(retryIdx);
  expect(retryIdx).toBeLessThan(endIdx);
});
```

**Key Patterns**:
1. Event ordering verification via index comparison
2. Event type extraction: `events.map(e => e.type)`
3. Sequential assertion: `expect(startIdx).toBeLessThan(retryIdx)`

---

## 3. Common Test Patterns

### 3.1 Event Capture Pattern

**Purpose**: Capture all events emitted during workflow execution

```typescript
const events: WorkflowEvent[] = [];

workflow.addObserver({
  onLog: () => {},
  onEvent: (e) => events.push(e),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
});

await workflow.run();
```

**Variations**:
- Capture specific event types only
- Track call order with timestamps
- Separate arrays for different event types

### 3.2 Event Filtering Pattern

**Purpose**: Find events of a specific type

```typescript
const retryEvents = events.filter(e => e.type === 'stepRetry');
const errorEvents = events.filter(e => e.type === 'error');
const stepEvents = events.filter(e => e.type === 'stepStart' || e.type === 'stepEnd');
```

**Type-safe filtering**:
```typescript
const isStepRetry = (e: WorkflowEvent): e is Extract<WorkflowEvent, { type: 'stepRetry' }> =>
  e.type === 'stepRetry';

const retryEvents = events.filter(isStepRetry);
```

### 3.3 Type Narrowing Pattern

**Purpose**: Safely access event properties

```typescript
// Pattern 1: if statement
if (event.type === 'stepRetry') {
  // TypeScript knows event has: step, retryCount, error
  expect(event.step).toBe('stepName');
  expect(event.retryCount).toBeGreaterThan(0);
}

// Pattern 2: Optional chaining with type guard
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].retryCount).toBe(1);
}

// Pattern 3: Switch statement
switch (event.type) {
  case 'stepRetry':
    expect(event.retryCount).toBeGreaterThan(0);
    break;
  case 'error':
    expect(event.error.message).toBeDefined();
    break;
}
```

### 3.4 Mock Observer Pattern

**Purpose**: Track observer callback invocations

```typescript
let onEventCallCount = 0;
let receivedEventType: string | undefined;

const trackingObserver: WorkflowObserver = {
  onLog: () => {},
  onEvent: (e) => {
    onEventCallCount++;
    receivedEventType = e.type;
  },
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

workflow.addObserver(trackingObserver);
await workflow.run();

expect(onEventCallCount).toBeGreaterThan(0);
expect(receivedEventType).toBeDefined();
```

### 3.5 Event Ordering Pattern

**Purpose**: Verify events are emitted in the correct sequence

```typescript
const eventTypes = events.map(e => e.type);

// Method 1: Index comparison
const startIdx = eventTypes.indexOf('stepStart');
const retryIdx = eventTypes.indexOf('stepRetry');
expect(startIdx).toBeLessThan(retryIdx);

// Method 2: Sequential array assertion
expect(eventTypes).toEqual([
  'stepStart',
  'stepRetry',
  'stepRetry',
  'stepEnd'
]);

// Method 3: Sliding window comparison
for (let i = 0; i < eventTypes.length - 1; i++) {
  const current = eventTypes[i];
  const next = eventTypes[i + 1];
  // Verify valid transitions
}
```

### 3.6 Property Assertion Pattern

**Purpose**: Verify event properties have correct values

```typescript
// Single property assertion
expect(retryEvent.retryCount).toBe(1);

// Multiple properties
expect(retryEvent).toMatchObject({
  type: 'stepRetry',
  retryCount: 1,
  step: 'retryableStep'
});

// Nested object assertion
expect(retryEvent.error).toMatchObject({
  message: 'Temporary failure',
  workflowId: workflow.id
});

// Type-specific assertions
expect(retryEvent.retryCount).toBeGreaterThan(0);
expect(retryEvent.timestamp).toBeGreaterThan(Date.now() - 1000);
```

---

## 4. Test Structure Patterns

### 4.1 Standard Test Structure

```typescript
describe('@Step decorator with retry options', () => {
  it('should [do something specific]', async () => {
    // Arrange: Set up test data and workflow
    const events: WorkflowEvent[] = [];

    class TestWorkflow extends Workflow {
      @Step({ restartable: true })
      async testStep() { /* ... */ }

      async run() {
        this.addObserver({
          onLog: () => {},
          onEvent: (e) => events.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });
        await this.testStep();
      }
    }

    // Act: Execute the workflow
    const wf = new TestWorkflow();
    await wf.run();

    // Assert: Verify results
    const retryEvents = events.filter(e => e.type === 'stepRetry');
    expect(retryEvents.length).toBeGreaterThan(0);
  });
});
```

### 4.2 Parameterized Test Pattern

```typescript
describe.each([
  { maxRetries: 1, expectedAttempts: 2 },
  { maxRetries: 2, expectedAttempts: 3 },
  { maxRetries: 3, expectedAttempts: 4 },
])('retry behavior with maxRetries=$maxRetries', ({ maxRetries, expectedAttempts }) => {
  it(`should attempt ${expectedAttempts} times`, async () => {
    // Test implementation using parameters
  });
});
```

---

## 5. Testing the Updated stepRetry Event

### 5.1 Required Test Updates

**After changing `step` → `stepName`**:

```typescript
// BEFORE
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].step).toBe('retryableStep');
}

// AFTER
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].stepName).toBe('retryableStep');
}
```

**After adding `analysis: RestartAnalysis`**:

```typescript
// NEW ASSERTION
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].analysis).toBeDefined();
  expect(retryEvents[0].analysis).toMatchObject({
    shouldRestart: expect.any(Boolean),
    reason: expect.any(String),
    suggestedAction: expect.any(String),
    estimatedSuccessProbability: expect.any(Number)
  });

  // Verify valid suggestedAction values
  expect(['retry', 'abort', 'rebuild']).toContain(retryEvents[0].analysis.suggestedAction);

  // Verify probability range
  expect(retryEvents[0].analysis.estimatedSuccessProbability).toBeGreaterThanOrEqual(0);
  expect(retryEvents[0].analysis.estimatedSuccessProbability).toBeLessThanOrEqual(1);
}
```

**After adding `timestamp: number`**:

```typescript
// NEW ASSERTION
if (retryEvents[0]?.type === 'stepRetry') {
  expect(retryEvents[0].timestamp).toBeDefined();
  expect(retryEvents[0].timestamp).toBeGreaterThan(0);
  expect(retryEvents[0].timestamp).toBeLessThanOrEqual(Date.now());

  // Verify timestamp is recent (within last second)
  const timeDiff = Date.now() - retryEvents[0].timestamp;
  expect(timeDiff).toBeLessThan(1000);
}
```

### 5.2 New Test Cases to Add

#### Test: "stepRetry event should include all required fields"

```typescript
it('should include all required fields in stepRetry event', async () => {
  const events: WorkflowEvent[] = [];

  class TestWorkflow extends Workflow {
    @Step({ restartable: true, maxRetries: 2 })
    async retryableStep() {
      if (this.attemptCount++ < 1) {
        throw new Error('Temporary failure');
      }
    }

    async run() {
      this.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      await this.retryableStep();
    }
  }

  const wf = new TestWorkflow();
  const startTime = Date.now();
  await wf.run();
  const endTime = Date.now();

  const retryEvents = events.filter(e => e.type === 'stepRetry');
  expect(retryEvents.length).toBe(1);

  if (retryEvents[0]?.type === 'stepRetry') {
    // Verify all required fields exist
    expect(retryEvents[0].type).toBe('stepRetry');
    expect(retryEvents[0].node).toBeDefined();
    expect(retryEvents[0].stepName).toBe('retryableStep');
    expect(retryEvents[0].retryCount).toBe(1);
    expect(retryEvents[0].analysis).toBeDefined();
    expect(retryEvents[0].error).toBeDefined();
    expect(retryEvents[0].timestamp).toBeDefined();

    // Verify field types
    expect(typeof retryEvents[0].stepName).toBe('string');
    expect(typeof retryEvents[0].retryCount).toBe('number');
    expect(typeof retryEvents[0].timestamp).toBe('number');

    // Verify timestamp is within test execution window
    expect(retryEvents[0].timestamp).toBeGreaterThanOrEqual(startTime);
    expect(retryEvents[0].timestamp).toBeLessThanOrEqual(endTime);

    // Verify analysis structure
    expect(retryEvents[0].analysis).toMatchObject({
      shouldRestart: expect.any(Boolean),
      reason: expect.any(String),
      suggestedAction: expect.stringMatching(/^(retry|abort|rebuild)$/),
      estimatedSuccessProbability: expect.any(Number)
    });

    // Verify error structure
    expect(retryEvents[0].error).toMatchObject({
      message: expect.any(String),
      original: expect.anything(),
      workflowId: expect.any(String),
      state: expect.any(Object),
      logs: expect.any(Array)
    });
  }
});
```

#### Test: "stepRetry event should have valid timestamp"

```typescript
it('should have timestamp close to emission time', async () => {
  const events: WorkflowEvent[] = [];
  const timestamps: number[] = [];

  class TestWorkflow extends Workflow {
    @Step({ restartable: true, maxRetries: 2, retryDelayMs: 100 })
    async retryableStep() {
      timestamps.push(Date.now());
      if (this.attemptCount++ < 1) {
        throw new Error('Temporary failure');
      }
    }

    async run() {
      this.addObserver({
        onLog: () => {},
        onEvent: (e) => {
          if (e.type === 'stepRetry') {
            timestamps.push(e.timestamp);
          }
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      await this.retryableStep();
    }
  }

  const wf = new TestWorkflow();
  await wf.run();

  // First timestamp is from method call, second from event emission
  expect(timestamps.length).toBe(2);

  // Event timestamp should be very close to method call timestamp
  const timeDiff = Math.abs(timestamps[1] - timestamps[0]);
  expect(timeDiff).toBeLessThan(100); // Less than 100ms difference
});
```

#### Test: "stepRetry event analysis should be valid"

```typescript
it('should include valid RestartAnalysis in stepRetry event', async () => {
  const events: WorkflowEvent[] = [];

  class TestWorkflow extends Workflow {
    @Step({ restartable: true, maxRetries: 2 })
    async retryableStep() {
      if (this.attemptCount++ < 1) {
        throw new Error('Temporary failure');
      }
    }

    async run() {
      this.addObserver({
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });
      await this.retryableStep();
    }
  }

  const wf = new TestWorkflow();
  await wf.run();

  const retryEvents = events.filter(e => e.type === 'stepRetry');
  expect(retryEvents.length).toBe(1);

  if (retryEvents[0]?.type === 'stepRetry') {
    const { analysis } = retryEvents[0];

    // Verify shouldRestart is true (since we're retrying)
    expect(analysis.shouldRestart).toBe(true);

    // Verify reason is a non-empty string
    expect(analysis.reason).toBeTruthy();
    expect(typeof analysis.reason).toBe('string');
    expect(analysis.reason.length).toBeGreaterThan(0);

    // Verify suggestedAction is valid
    expect(['retry', 'abort', 'rebuild']).toContain(analysis.suggestedAction);

    // Verify estimatedSuccessProbability is in valid range
    expect(analysis.estimatedSuccessProbability).toBeGreaterThanOrEqual(0);
    expect(analysis.estimatedSuccessProbability).toBeLessThanOrEqual(1);

    // For a retry event, suggestedAction should be 'retry'
    expect(analysis.suggestedAction).toBe('retry');
  }
});
```

---

## 6. Test Commands

### 6.1 Run Specific Test File

```bash
# Run only stepRetry event tests
uv run vitest run src/__tests__/unit/decorators-retry.test.ts

# Run with coverage
uv run vitest run --coverage src/__tests__/unit/decorators-retry.test.ts

# Run specific test by name
uv run vitest run -t "should emit stepRetry event"
```

### 6.2 Run All Event-Related Tests

```bash
# Run all event system tests
uv run vitest run src/__tests__/unit/event-replayer.test.ts
uv run vitest run src/__tests__/integration/observer-logging.test.ts
uv run vitest run src/__tests__/adversarial/observer-propagation.test.ts
```

### 6.3 Debugging Failed Tests

```bash
# Run with verbose output
uv run vitest run --verbose

# Run with watch mode
uv run vitest watch src/__tests__/unit/decorators-retry.test.ts

# Run with inspector
uv run vitest --inspect-brk src/__tests__/unit/decorators-retry.test.ts
```

---

## 7. Coverage Considerations

### 7.1 Test Coverage Goals

- [ ] All stepRetry event fields are asserted in at least one test
- [ ] Type narrowing is tested for all new fields
- [ ] Edge cases are covered (max retries, no retries, etc.)
- [ ] Event ordering is verified
- [ ] Integration with observer pattern is tested

### 7.2 Coverage Commands

```bash
# Generate coverage report
uv run vitest run --coverage

# View coverage in browser
open coverage/index.html

# Check coverage for specific file
uv run vitest run --coverage src/__tests__/unit/decorators-retry.test.ts
grep "decorators/step.ts" coverage/index.html
```

---

## 8. Mock Data Patterns

### 8.1 Mock stepRetry Event

```typescript
const mockStepRetryEvent: Extract<WorkflowEvent, { type: 'stepRetry' }> = {
  type: 'stepRetry',
  node: mockWorkflowNode,
  stepName: 'testStep',
  retryCount: 1,
  analysis: {
    shouldRestart: true,
    reason: 'Test error',
    suggestedAction: 'retry',
    estimatedSuccessProbability: 0.7
  },
  error: mockWorkflowError,
  timestamp: Date.now()
};
```

### 8.2 Mock RestartAnalysis

```typescript
const mockRestartAnalysis: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Transient error detected',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.8
};
```

### 8.3 Mock WorkflowError

```typescript
const mockWorkflowError: WorkflowError = {
  message: 'Test error',
  original: new Error('Test error'),
  workflowId: 'test-workflow-id',
  stack: 'Error: Test error\n    at test.ts:10',
  state: {},
  logs: []
};
```

---

## 9. Common Pitfalls

### 9.1 Forgetting Type Narrowing

**Wrong**:
```typescript
const retryEvent = events.find(e => e.type === 'stepRetry');
expect(retryEvent.stepName).toBe('test');  // Type error!
```

**Right**:
```typescript
const retryEvent = events.find(e => e.type === 'stepRetry');
if (retryEvent?.type === 'stepRetry') {
  expect(retryEvent.stepName).toBe('test');  // Type-safe!
}
```

### 9.2 Not Testing All Fields

**Wrong**:
```typescript
expect(retryEvent.type).toBe('stepRetry');
// Missing tests for other fields!
```

**Right**:
```typescript
expect(retryEvent).toMatchObject({
  type: 'stepRetry',
  stepName: 'test',
  retryCount: 1,
  analysis: expect.any(Object),
  error: expect.any(Object),
  timestamp: expect.any(Number)
});
```

### 9.3 Not Testing Timestamp Validity

**Wrong**:
```typescript
expect(retryEvent.timestamp).toBeDefined();
```

**Right**:
```typescript
expect(retryEvent.timestamp).toBeGreaterThan(0);
expect(retryEvent.timestamp).toBeLessThanOrEqual(Date.now());
```

---

## 10. Summary

**Key Takeaways**:

1. **Event Capture**: Use observer's `onEvent` callback to capture all events
2. **Type Narrowing**: Always use `if (event.type === 'stepRetry')` before accessing event properties
3. **Field Updates**: Change all `event.step` references to `event.stepName`
4. **New Fields**: Add assertions for `analysis` and `timestamp` fields
5. **Event Ordering**: Verify stepStart → stepRetry → stepEnd sequence
6. **Integration**: Ensure observer pattern still works with updated events

**Files to Update**:
- `src/__tests__/unit/decorators-retry.test.ts` (PRIMARY)
- Any other test files that reference stepRetry events

**New Tests to Add**:
- Test for all required fields
- Test for valid timestamp
- Test for valid RestartAnalysis structure

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Author**: PRP Research Agent
**Status**: Ready for PRP Generation

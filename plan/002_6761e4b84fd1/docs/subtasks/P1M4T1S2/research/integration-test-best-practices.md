# Integration Test Best Practices for Complex JavaScript/TypeScript Workflows

**Research Date:** 2026-01-24
**Focus:** TypeScript/Vitest patterns for multi-step workflow testing

---

## Table of Contents

1. [Best Practices for Integration Testing Multi-Step Workflows](#1-best-practices-for-integration-testing-multi-step-workflows)
2. [Testing Child Workflow Response Propagation Patterns](#2-testing-child-workflow-response-propagation-patterns)
3. [Common Integration Test Failure Patterns and Debugging](#3-common-integration-test-failure-patterns-and-debugging)
4. [Validating Response Propagation Through Nested Workflows](#4-validating-response-propagation-through-nested-workflows)
5. [Vitest-Specific Patterns and Utilities](#5-vitest-specific-patterns-and-utilities)
6. [Resources and Documentation](#6-resources-and-documentation)

---

## 1. Best Practices for Integration Testing Multi-Step Workflows

### 1.1 Test Organization and Structure

#### Principle: Arrange-Act-Assert (AAA) Pattern

```typescript
describe('Multi-Step Order Processing Workflow', () => {
  it('should complete full order lifecycle', async () => {
    // Arrange
    const orderData = createMockOrder();
    const inventoryService = mockInventoryService();
    const paymentService = mockPaymentService();

    // Act
    const result = await processOrderWorkflow(orderData);

    // Assert
    expect(result.status).toBe('completed');
    expect(result.orderId).toBeDefined();
    expect(inventoryService.reserve).toHaveBeenCalledTimes(1);
    expect(paymentService.charge).toHaveBeenCalledWith(orderData.total);
  });
});
```

#### Principle: Shared Context with Setup/Teardown

```typescript
describe('User Registration Workflow', () => {
  let workflowContext: WorkflowContext;
  let userId: string;

  beforeAll(async () => {
    // Setup shared resources (database, services)
    workflowContext = await createTestContext();
  });

  afterAll(async () => {
    // Cleanup
    await workflowContext.cleanup();
  });

  beforeEach(async () => {
    // Reset state before each test
    await workflowContext.reset();
  });

  it('step 1: should register user', async () => {
    const response = await workflowContext.register({
      email: 'test@example.com',
      password: 'securepass'
    });
    expect(response.status).toBe(201);
    userId = response.body.id;
  });

  it('step 2: should verify email', async () => {
    await workflowContext.verifyEmail(userId);
    const user = await workflowContext.getUser(userId);
    expect(user.emailVerified).toBe(true);
  });

  it('step 3: should complete onboarding', async () => {
    const profile = await workflowContext.completeOnboarding(userId, {
      name: 'Test User',
      preferences: {}
    });
    expect(profile.onboardingComplete).toBe(true);
  });
});
```

### 1.2 State Management Across Steps

#### Pattern: Test Context Builder

```typescript
interface TestContext {
  database: TestDatabase;
  services: {
    workflow: WorkflowService;
    notifications: NotificationService;
    storage: StorageService;
  };
  state: {
    userId?: string;
    workflowId?: string;
    sessionId?: string;
  };
}

class ContextBuilder {
  private context: Partial<TestContext> = {};

  withDatabase(db: TestDatabase) {
    this.context.database = db;
    return this;
  }

  withServices(services: TestContext['services']) {
    this.context.services = services;
    return this;
  }

  withState(state: Partial<TestContext['state']>) {
    this.context.state = { ...this.context.state, ...state };
    return this;
  }

  build(): TestContext {
    return this.context as TestContext;
  }
}

// Usage in tests
describe('Document Approval Workflow', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await new ContextBuilder()
      .withDatabase(await createTestDb())
      .withServices({
        workflow: new WorkflowService(),
        notifications: mockNotificationService(),
        storage: mockStorageService()
      })
      .build();
  });

  it('should propagate state through approval chain', async () => {
    const doc = await context.services.workflow.createDocument({
      title: 'Test Doc',
      content: 'Content'
    });

    context.state.workflowId = doc.id;

    // Step 1: Submit
    await context.services.workflow.submit(doc.id);
    let state = await context.services.workflow.getState(doc.id);
    expect(state.status).toBe('pending_approval');

    // Step 2: Approve
    await context.services.workflow.approve(doc.id, 'approver1');
    state = await context.services.workflow.getState(doc.id);
    expect(state.status).toBe('approved');

    // Step 3: Finalize
    await context.services.workflow.finalize(doc.id);
    state = await context.services.workflow.getState(doc.id);
    expect(state.status).toBe('completed');
  });
});
```

### 1.3 Isolation and Independence

#### Principle: Test Isolation with Fixtures

```typescript
import { test } from 'vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

// Fixture pattern
export const createWorkflowFixture = async () => {
  const db = await createTestDatabase();
  const services = await createTestServices(db);

  return {
    db,
    services,
    async cleanup() {
      await db.clear();
      await db.close();
    }
  };
};

describe('Isolated Workflow Tests', () => {
  let fixture: Awaited<ReturnType<typeof createWorkflowFixture>>;

  beforeEach(async () => {
    fixture = await createWorkflowFixture();
  });

  afterEach(async () => {
    await fixture.cleanup();
  });

  // Each test is completely isolated
  test('workflow A runs independently', async () => {
    const result = await fixture.services.workflow.runA();
    expect(result).toBeDefined();
  });

  test('workflow B runs independently', async () => {
    const result = await fixture.services.workflow.runB();
    expect(result).toBeDefined();
  });
});
```

### 1.4 Deterministic Testing

#### Pattern: Time Control for Time-Based Workflows

```typescript
import { vi } from 'vitest';

describe('Time-Based Workflow Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle timeout in multi-step workflow', async () => {
    const workflow = new TimeoutWorkflow();

    // Start the workflow
    const promise = workflow.execute();

    // Fast-forward time
    await vi.advanceTimersByTimeAsync(5000);

    // Verify timeout handled
    const result = await promise;
    expect(result.status).toBe('timed_out');
  });

  it('should complete before timeout', async () => {
    const workflow = new TimeoutWorkflow();
    workflow.setDelay(1000);

    const promise = workflow.execute();

    // Fast-forward but not past timeout
    await vi.advanceTimersByTimeAsync(3000);

    const result = await promise;
    expect(result.status).toBe('completed');
  });
});
```

### 1.5 Data-Driven Workflow Testing

#### Pattern: Parameterized Workflows

```typescript
describe('Data-Driven Workflow Tests', () => {
  const workflowScenarios = [
    {
      name: 'simple workflow',
      input: { steps: 3, complexity: 'low' },
      expected: { status: 'completed', duration: '< 1s' }
    },
    {
      name: 'complex workflow',
      input: { steps: 10, complexity: 'high' },
      expected: { status: 'completed', duration: '< 5s' }
    },
    {
      name: 'failing workflow',
      input: { steps: 5, shouldFail: true },
      expected: { status: 'failed', error: 'Step 3 failed' }
    }
  ];

  test.each(workflowScenarios)('$name', async ({ input, expected }) => {
    const workflow = new ConfigurableWorkflow(input);
    const result = await workflow.execute();

    expect(result.status).toBe(expected.status);
    if (expected.error) {
      expect(result.error).toContain(expected.error);
    }
  });
});
```

---

## 2. Testing Child Workflow Response Propagation Patterns

### 2.1 Mocking Child Workflows

#### Pattern: Direct Mocking with vi.fn()

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('Parent-Child Workflow Response Propagation', () => {
  let childWorkflowMock: ReturnType<typeof vi.fn>;
  let parentWorkflow: ParentWorkflow;

  beforeEach(() => {
    // Mock child workflow
    childWorkflowMock = vi.fn();
    childWorkflowMock.mockResolvedValue({
      status: 'success',
      data: { result: 'child-result' },
      metadata: { executionTime: 100 }
    });

    // Inject mock into parent
    parentWorkflow = new ParentWorkflow({
      childWorkflow: childWorkflowMock
    });
  });

  it('should propagate child workflow response to parent', async () => {
    const result = await parentWorkflow.execute();

    expect(result.childResponse).toEqual({
      status: 'success',
      data: { result: 'child-result' }
    });
    expect(childWorkflowMock).toHaveBeenCalledTimes(1);
  });

  it('should handle child workflow errors', async () => {
    childWorkflowMock.mockRejectedValue(
      new Error('Child workflow failed')
    );

    await expect(parentWorkflow.execute()).rejects.toThrow(
      'Child workflow failed'
    );
  });
});
```

### 2.2 Sequential Child Workflow Execution

#### Pattern: Chained Workflow Testing

```typescript
describe('Sequential Child Workflow Execution', () => {
  it('should execute children in sequence and aggregate responses', async () => {
    const mockChildren = {
      step1: vi.fn().mockResolvedValue({ step: 1, data: 'result1' }),
      step2: vi.fn().mockResolvedValue({ step: 2, data: 'result2' }),
      step3: vi.fn().mockResolvedValue({ step: 3, data: 'result3' })
    };

    const orchestrator = new WorkflowOrchestrator(mockChildren);
    const result = await orchestrator.executeSequential();

    // Verify execution order
    expect(mockChildren.step1).toHaveBeenCalledBefore(mockChildren.step2);
    expect(mockChildren.step2).toHaveBeenCalledBefore(mockChildren.step3);

    // Verify response aggregation
    expect(result.responses).toEqual([
      { step: 1, data: 'result1' },
      { step: 2, data: 'result2' },
      { step: 3, data: 'result3' }
    ]);

    // Verify final state includes all child data
    expect(result.finalState).toMatchObject({
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      aggregatedData: ['result1', 'result2', 'result3']
    });
  });
});
```

### 2.3 Parallel Child Workflow Execution

#### Pattern: Concurrent Workflow Testing

```typescript
describe('Parallel Child Workflow Execution', () => {
  it('should execute children in parallel and collect all responses', async () => {
    const executionOrder: string[] = [];

    const mockChildren = {
      workflowA: vi.fn().mockImplementation(async () => {
        executionOrder.push('A-start');
        await delay(100);
        executionOrder.push('A-end');
        return { id: 'A', result: 'success-a' };
      }),
      workflowB: vi.fn().mockImplementation(async () => {
        executionOrder.push('B-start');
        await delay(50);
        executionOrder.push('B-end');
        return { id: 'B', result: 'success-b' };
      }),
      workflowC: vi.fn().mockImplementation(async () => {
        executionOrder.push('C-start');
        await delay(75);
        executionOrder.push('C-end');
        return { id: 'C', result: 'success-c' };
      })
    };

    const orchestrator = new WorkflowOrchestrator(mockChildren);
    const result = await orchestrator.executeParallel();

    // Verify all workflows started concurrently
    expect(executionOrder.slice(0, 3).sort()).toEqual(['A-start', 'B-start', 'C-start']);

    // Verify all responses collected
    expect(result.responses).toHaveLength(3);
    expect(result.responses).toContainEqual({ id: 'A', result: 'success-a' });
    expect(result.responses).toContainEqual({ id: 'B', result: 'success-b' });
    expect(result.responses).toContainEqual({ id: 'C', result: 'success-c' });
  });

  it('should handle partial failures in parallel execution', async () => {
    const mockChildren = {
      workflowA: vi.fn().mockResolvedValue({ id: 'A', result: 'success' }),
      workflowB: vi.fn().mockRejectedValue(new Error('Workflow B failed')),
      workflowC: vi.fn().mockResolvedValue({ id: 'C', result: 'success' })
    };

    const orchestrator = new WorkflowOrchestrator(mockChildren, {
      continueOnError: true
    });

    const result = await orchestrator.executeParallel();

    expect(result.successful).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe('Workflow B failed');
  });
});
```

### 2.4 Event-Based Response Propagation

#### Pattern: Event Emitter Testing

```typescript
import { EventEmitter } from 'events';

describe('Event-Based Response Propagation', () => {
  it('should propagate child workflow responses via events', async () => {
    const parentWorkflow = new EventBasedParentWorkflow();
    const collectedEvents: string[] = [];

    // Listen for child events
    parentWorkflow.on('child:started', (data) => {
      collectedEvents.push(`started:${data.childId}`);
    });

    parentWorkflow.on('child:completed', (data) => {
      collectedEvents.push(`completed:${data.childId}:${data.result.status}`);
    });

    parentWorkflow.on('child:failed', (data) => {
      collectedEvents.push(`failed:${data.childId}:${data.error}`);
    });

    // Execute workflow
    await parentWorkflow.execute();

    // Verify event flow
    expect(collectedEvents).toEqual([
      'started:child-1',
      'completed:child-1:success',
      'started:child-2',
      'completed:child-2:success',
      'started:child-3',
      'completed:child-3:success'
    ]);
  });

  it('should handle workflow timeout via events', async () => {
    const parentWorkflow = new EventBasedParentWorkflow({
      timeout: 1000
    });

    const timeoutPromise = new Promise((resolve) => {
      parentWorkflow.once('workflow:timeout', resolve);
    });

    // Start workflow but don't complete children
    parentWorkflow.execute().catch(() => {});

    // Wait for timeout event
    const timeoutEvent = await timeoutPromise;

    expect(timeoutEvent).toHaveProperty('reason', 'timeout');
    expect(timeoutEvent).toHaveProperty('elapsedTime');
  });
});
```

### 2.5 State Transformation Through Child Workflows

#### Pattern: State Pipeline Testing

```typescript
describe('State Transformation Pipeline', () => {
  it('should transform state through child workflow chain', async () => {
    const initialState = {
      userId: 'user-123',
      balance: 1000,
      transactions: []
    };

    const childWorkflows = {
      validate: vi.fn().mockResolvedValue({
        valid: true,
        errors: []
      }),
      calculate: vi.fn().mockResolvedValue({
        newBalance: 950,
        fee: 50
      }),
      execute: vi.fn().mockResolvedValue({
        transactionId: 'txn-456',
        executedAt: new Date().toISOString()
      }),
      notify: vi.fn().mockResolvedValue({
        notificationSent: true,
        channels: ['email', 'sms']
      })
    };

    const pipeline = new StatePipeline(childWorkflows);
    const result = await pipeline.execute(initialState);

    // Verify each child was called with transformed state
    expect(childWorkflows.validate).toHaveBeenCalledWith(initialState);
    expect(childWorkflows.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        validationResult: { valid: true, errors: [] }
      })
    );
    expect(childWorkflows.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        calculationResult: { newBalance: 950, fee: 50 }
      })
    );

    // Verify final aggregated state
    expect(result.finalState).toMatchObject({
      userId: 'user-123',
      balance: 950,
      lastTransactionId: 'txn-456',
      notificationsSent: true
    });
  });
});
```

---

## 3. Common Integration Test Failure Patterns and Debugging

### 3.1 Async/Await Issues

#### Pattern: Missing Await Detection

```typescript
describe('Async/Await Failure Patterns', () => {
  it('FAILS: Missing await causes false positive', async () => {
    let executed = false;

    // WRONG: Not awaiting promise
    asyncOperation().then(() => {
      executed = true;
    });

    // This assertion runs before asyncOperation completes
    expect(executed).toBe(false); // Test passes but test is wrong!
  });

  it('PASSES: Properly awaited async operation', async () => {
    let executed = false;

    // CORRECT: Awaiting promise
    await asyncOperation().then(() => {
      executed = true;
    });

    // This assertion runs after asyncOperation completes
    expect(executed).toBe(true);
  });

  it('PASSES: Using async/await properly', async () => {
    const result = await asyncOperation();
    expect(result).toBeDefined();
  });
});
```

#### Pattern: Race Condition Detection

```typescript
describe('Race Condition Detection', () => {
  it('should detect and handle race conditions', async () => {
    const results: string[] = [];
    const workflow = new ConcurrentWorkflow();

    // Create multiple concurrent operations
    const promises = [
      workflow.step1().then(r => results.push(`step1:${r}`)),
      workflow.step2().then(r => results.push(`step2:${r}`)),
      workflow.step3().then(r => results.push(`step3:${r}`))
    ];

    // Wait for all with explicit timeout
    await Promise.race([
      Promise.all(promises),
      delay(5000).then(() => {
        throw new Error('Test timeout: Race condition detected');
      })
    ]);

    // Verify all completed
    expect(results).toHaveLength(3);

    // Use waitFor to poll for expected state
    await waitFor(() => {
      expect(results).toHaveLength(3);
    }, { timeout: 5000 });
  });
});
```

### 3.2 Hook Execution Issues

#### Pattern: Hook Execution Order Verification

```typescript
describe('Hook Execution Debugging', () => {
  const executionLog: string[] = [];

  beforeAll(() => {
    executionLog.push('beforeAll');
  });

  afterAll(() => {
    executionLog.push('afterAll');
    console.log('Hook execution order:', executionLog);
  });

  beforeEach(() => {
    executionLog.push('beforeEach');
  });

  afterEach(() => {
    executionLog.push('afterEach');
  });

  it('test 1', () => {
    executionLog.push('test1');
    expect(executionLog).toEqual([
      'beforeAll',
      'beforeEach',
      'test1',
      'afterEach'
    ]);
  });

  it('test 2', () => {
    executionLog.push('test2');
    // executionLog should reset between tests if properly isolated
    expect(executionLog).toEqual([
      'beforeAll',
      'beforeEach',
      'beforeEach', // From test 1
      'afterEach',  // From test 1
      'beforeEach', // From test 2
      'test2'
    ]);
  });
});
```

### 3.3 Test Isolation Failures

#### Pattern: Detecting State Bleed

```typescript
describe('Test Isolation Debugging', () => {
  let sharedState: { value: number };

  beforeEach(() => {
    // Reset state - this is critical for isolation
    sharedState = { value: 0 };
  });

  it('test 1 modifies state', () => {
    sharedState.value = 100;
    expect(sharedState.value).toBe(100);
  });

  it('test 2 should have fresh state', () => {
    // If this fails, beforeEach didn't run properly
    expect(sharedState.value).toBe(0);

    sharedState.value = 200;
  });

  it('test 3 should also have fresh state', () => {
    // This test is independent of test 1 and 2
    expect(sharedState.value).toBe(0);
  });
});
```

### 3.4 Timeout Issues

#### Pattern: Timeout Debugging

```typescript
describe('Timeout Debugging Patterns', () => {
  it('should fail fast with clear timeout message', async () => {
    const workflow = new SlowWorkflow();

    // Set explicit timeout
    await expect(
      workflow.execute(),
      'Workflow should complete within 2 seconds'
    ).resolves.toBeDefined();

    // Or use test timeout
    vi.setConfig({ testTimeout: 2000 });

    // Or use Promise.race for custom timeout handling
    const result = await Promise.race([
      workflow.execute(),
      delay(2000).then(() => {
        throw new Error('Workflow timed out after 2000ms');
      })
    ]);

    expect(result).toBeDefined();
  });

  it('should measure and assert execution time', async () => {
    const workflow = new WorkflowWithPerformance();

    const startTime = Date.now();
    await workflow.execute();
    const duration = Date.now() - startTime;

    // Assert performance expectations
    expect(duration).toBeLessThan(5000);
    console.log(`Workflow executed in ${duration}ms`);
  });
});
```

### 3.5 Mock/Stub Failures

#### Pattern: Mock Verification Debugging

```typescript
describe('Mock Failure Debugging', () => {
  it('should verify mock calls with detailed output', async () => {
    const mockFn = vi.fn();

    const workflow = new Workflow({
      callback: mockFn
    });

    await workflow.execute();

    // Debug mock calls
    console.log('Mock calls:', mockFn.mock.calls);
    console.log('Call count:', mockFn.mock.calls.length);

    // Verify with helpful error messages
    expect(mockFn).toHaveBeenCalled();
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockFn).toHaveBeenNthCalledWith(1, { step: 1 });
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('should reset mocks between tests', () => {
    const mockFn = vi.fn();

    // First call
    mockFn('first');

    // Clear mock for fresh start
    mockFn.mockClear();
    expect(mockFn).not.toHaveBeenCalled();

    // Reset to original implementation
    mockFn.mockReset();

    // Restore completely
    mockFn.mockRestore();
  });
});
```

### 3.6 Debugging Utilities

#### Pattern: Custom Debug Helpers

```typescript
// test-utils/debug.ts

export const debugWorkflow = (workflow: any, label: string) => {
  console.group(`[DEBUG] ${label}`);
  console.log('State:', workflow.state);
  console.log('History:', workflow.executionHistory);
  console.log('Errors:', workflow.errors);
  console.groupEnd();
};

export const traceExecution = async <T>(
  promise: Promise<T>,
  label: string
): Promise<T> => {
  console.log(`[TRACE] ${label} - Starting`);
  const startTime = Date.now();

  try {
    const result = await promise;
    const duration = Date.now() - startTime;
    console.log(`[TRACE] ${label} - Completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[TRACE] ${label} - Failed after ${duration}ms:`, error);
    throw error;
  }
};

export const waitFor = async (
  condition: () => void | Promise<void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const { timeout = 5000, interval = 100 } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await condition();
      return; // Condition met
    } catch (error) {
      // Condition not met yet, wait and retry
      await delay(interval);
    }
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
};

// Usage in tests
describe('Debugging Workflows', () => {
  it('should use debug helpers', async () => {
    const workflow = new ComplexWorkflow();

    const result = await traceExecution(
      workflow.execute(),
      'ComplexWorkflow.execute'
    );

    debugWorkflow(workflow, 'Final State');
    expect(result).toBeDefined();
  });
});
```

---

## 4. Validating Response Propagation Through Nested Workflows

### 4.1 Nested Workflow Structure Testing

#### Pattern: Deep Response Validation

```typescript
describe('Nested Workflow Response Validation', () => {
  it('should validate responses propagate through 3-level nesting', async () => {
    // Level 3: Leaf workflow
    const leafWorkflow = vi.fn().mockResolvedValue({
      level: 3,
      data: { value: 'leaf-result' }
    });

    // Level 2: Middle workflow
    const middleWorkflow = new MiddleWorkflow({
      child: leafWorkflow
    });

    // Level 1: Root workflow
    const rootWorkflow = new RootWorkflow({
      child: middleWorkflow
    });

    // Execute and validate full propagation
    const result = await rootWorkflow.execute();

    // Validate nested response structure
    expect(result).toMatchObject({
      level: 1,
      childResponse: {
        level: 2,
        childResponse: {
          level: 3,
          data: { value: 'leaf-result' }
        }
      }
    });

    // Validate all levels executed
    expect(leafWorkflow).toHaveBeenCalledTimes(1);
  });

  it('should aggregate responses from parallel nested workflows', async () => {
    const createNestedWorkflow = (id: string) => ({
      id,
      execute: vi.fn().mockResolvedValue({
        workflowId: id,
        timestamp: Date.now(),
        nestedData: {
          value: `result-${id}`
        }
      })
    });

    const workflows = [
      createNestedWorkflow('A'),
      createNestedWorkflow('B'),
      createNestedWorkflow('C')
    ];

    const orchestrator = new ParallelOrchestrator(workflows);
    const result = await orchestrator.executeAll();

    // Validate aggregation
    expect(result.responses).toHaveLength(3);
    expect(result.responses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workflowId: expect.any(String),
          nestedData: expect.objectContaining({
            value: expect.any(String)
          })
        })
      ])
    );

    // Validate hierarchical summary
    expect(result.summary).toMatchObject({
      totalWorkflows: 3,
      successful: 3,
      failed: 0,
      executionTime: expect.any(Number)
    });
  });
});
```

### 4.2 Response Transformation Chain Validation

#### Pattern: Transformation Pipeline Testing

```typescript
describe('Response Transformation Chain', () => {
  it('should validate transformations through nested processors', async () => {
    const transformations = [
      // Level 1: Initial response
      vi.fn().mockImplementation(async (input) => ({
        ...input,
        processedAt: 'level1',
        value: input.value * 2
      })),

      // Level 2: Second transformation
      vi.fn().mockImplementation(async (input) => ({
        ...input,
        processedAt: 'level2',
        value: input.value + 10
      })),

      // Level 3: Final transformation
      vi.fn().mockImplementation(async (input) => ({
        ...input,
        processedAt: 'level3',
        value: input.value / 2,
        metadata: {
          originalValue: input.value,
          transformationCount: 3
        }
      }))
    ];

    const pipeline = new TransformationPipeline(transformations);

    // Input: { value: 5 }
    // Level 1: { value: 10, processedAt: 'level1' }
    // Level 2: { value: 20, processedAt: 'level2' }
    // Level 3: { value: 10, processedAt: 'level3', metadata: {...} }

    const result = await pipeline.process({ value: 5 });

    // Validate final transformation
    expect(result.value).toBe(10);
    expect(result.processedAt).toBe('level3');
    expect(result.metadata).toMatchObject({
      originalValue: 20,
      transformationCount: 3
    });

    // Validate each transformation was called in order
    expect(transformations[0]).toHaveBeenCalledWith({ value: 5 });
    expect(transformations[1]).toHaveBeenCalledWith(
      expect.objectContaining({ processedAt: 'level1', value: 10 })
    );
    expect(transformations[2]).toHaveBeenCalledWith(
      expect.objectContaining({ processedAt: 'level2', value: 20 })
    );
  });
});
```

### 4.3 Error Propagation Through Nested Workflows

#### Pattern: Nested Error Handling Validation

```typescript
describe('Nested Error Propagation', () => {
  it('should propagate errors up through nested levels', async () => {
    const leafError = new Error('Leaf workflow failed');

    const leafWorkflow = vi.fn().mockRejectedValue(leafError);
    const middleWorkflow = new MiddleWorkflow({ child: leafWorkflow });
    const rootWorkflow = new RootWorkflow({ child: middleWorkflow });

    await expect(rootWorkflow.execute()).rejects.toThrow('Leaf workflow failed');

    // Validate error was wrapped with context at each level
    try {
      await rootWorkflow.execute();
    } catch (error) {
      expect(error).toMatchObject({
        message: expect.stringContaining('Leaf workflow failed'),
        stack: expect.stringContaining('MiddleWorkflow'),
        stack: expect.stringContaining('RootWorkflow'),
        // May include nested error chain
        cause: expect.any(Error)
      });
    }
  });

  it('should handle partial failures in nested workflows', async () => {
    const workflows = {
      workflowA: vi.fn().mockResolvedValue({ status: 'success', data: 'A' }),
      workflowB: vi.fn().mockRejectedValue(new Error('B failed')),
      workflowC: vi.fn().mockResolvedValue({ status: 'success', data: 'C' })
    };

    const orchestrator = new NestedOrchestrator(workflows, {
      errorStrategy: 'continue'
    });

    const result = await orchestrator.executeNested();

    // Validate partial success
    expect(result.overallStatus).toBe('partial_success');
    expect(result.successful).toEqual(['workflowA', 'workflowC']);
    expect(result.failed).toEqual(['workflowB']);

    // Validate error details preserved
    expect(result.errors).toMatchObject({
      workflowB: {
        message: 'B failed',
        workflow: expect.any(String)
      }
    });
  });
});
```

### 4.4 Context Preservation in Nested Workflows

#### Pattern: Context Chain Validation

```typescript
describe('Context Preservation in Nested Workflows', () => {
  it('should preserve and extend context through nested levels', async () => {
    const initialContext = {
      requestId: 'req-123',
      userId: 'user-456',
      timestamp: Date.now()
    };

    const leafWorkflow = vi.fn().mockImplementation(async (ctx) => ({
      success: true,
      context: {
        ...ctx,
        leafData: 'leaf-value'
      }
    }));

    const middleWorkflow = vi.fn().mockImplementation(async (ctx) => {
      const childResult = await leafWorkflow(ctx);
      return {
        success: true,
        context: {
          ...childResult.context,
          middleData: 'middle-value'
        },
        childResult
      };
    });

    const rootWorkflow = vi.fn().mockImplementation(async (ctx) => {
      const childResult = await middleWorkflow(ctx);
      return {
        success: true,
        context: {
          ...childResult.context,
          rootData: 'root-value'
        },
        childResult
      };
    });

    const result = await rootWorkflow(initialContext);

    // Validate all context levels preserved
    expect(result.context).toMatchObject({
      requestId: 'req-123',
      userId: 'user-456',
      timestamp: initialContext.timestamp,
      leafData: 'leaf-value',
      middleData: 'middle-value',
      rootData: 'root-value'
    });

    // Validate nested context access
    expect(result.childResult.context.leafData).toBe('leaf-value');
    expect(result.childResult.childResult).toBeDefined();
  });

  it('should isolate context changes between parallel branches', async () => {
    const sharedContext = {
      requestId: 'req-123',
      branch: 'shared'
    };

    const branchA = vi.fn().mockImplementation(async (ctx) => ({
      branch: 'A',
      context: {
        ...ctx,
        branchSpecific: 'A-data'
      }
    }));

    const branchB = vi.fn().mockImplementation(async (ctx) => ({
      branch: 'B',
      context: {
        ...ctx,
        branchSpecific: 'B-data'
      }
    }));

    const orchestrator = new ParallelBranchOrchestrator({
      branches: { branchA, branchB }
    });

    const result = await orchestrator.executeParallel(sharedContext);

    // Validate branches got original context
    expect(branchA).toHaveBeenCalledWith(sharedContext);
    expect(branchB).toHaveBeenCalledWith(sharedContext);

    // Validate branches modified context independently
    expect(result.branchA.context.branchSpecific).toBe('A-data');
    expect(result.branchB.context.branchSpecific).toBe('B-data');

    // Validate original context not mutated
    expect(sharedContext.branch).toBe('shared');
    expect(sharedContext).not.toHaveProperty('branchSpecific');
  });
});
```

### 4.5 Response Timeline and Ordering Validation

#### Pattern: Timeline Validation for Nested Workflows

```typescript
describe('Response Timeline Validation', () => {
  it('should track execution timeline through nested workflows', async () => {
    const timeline: Array<{ level: number; time: number }> = [];

    const createLevel = (level: number, delay: number) => ({
      execute: vi.fn().mockImplementation(async (input) => {
        const startTime = Date.now();
        timeline.push({ level, time: startTime });

        await delay(delay);

        return {
          level,
          executionTime: delay,
          startTime,
          endTime: Date.now(),
          childResponse: input
        };
      })
    });

    const level3 = createLevel(3, 100);
    const level2 = createLevel(2, 50);
    const level1 = createLevel(1, 75);

    // Wire up nested structure
    level3.execute = vi.fn().mockImplementation(async () => {
      timeline.push({ level: 3, time: Date.now() });
      await delay(100);
      return { level: 3, timestamp: Date.now() };
    });

    level2.execute = vi.fn().mockImplementation(async () => {
      timeline.push({ level: 2, time: Date.now() });
      const childResult = await level3.execute();
      await delay(50);
      return { level: 2, childResult, timestamp: Date.now() };
    });

    level1.execute = vi.fn().mockImplementation(async () => {
      timeline.push({ level: 1, time: Date.now() });
      const childResult = await level2.execute();
      await delay(75);
      return { level: 1, childResult, timestamp: Date.now() };
    });

    const result = await level1.execute();

    // Validate timeline order (outer to inner)
    expect(timeline.map(t => t.level)).toEqual([1, 2, 3]);

    // Validate timestamps are sequential
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].time).toBeGreaterThanOrEqual(timeline[i - 1].time);
    }

    // Validate total execution time
    const totalTime = result.timestamp - timeline[0].time;
    expect(totalTime).toBeGreaterThanOrEqual(100 + 50 + 75);
  });
});
```

---

## 5. Vitest-Specific Patterns and Utilities

### 5.1 Vitest Mocking Strategies

#### Pattern: Module Mocking

```typescript
// vitest setup
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock entire module
vi.mock('./workflow-service', () => ({
  WorkflowService: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({ status: 'completed' })
  }))
}));

// Partial mocking
import { actualWorkflowService } from './workflow-service';

vi.mock('./workflow-service', async () => {
  const actual = await vi.importActual('./workflow-service');
  return {
    ...actual,
    WorkflowService: vi.fn().mockImplementation(() => ({
      ...new actual.WorkflowService(),
      execute: vi.fn().mockResolvedValue({ status: 'mocked' })
    }))
  };
});

// Spy on real implementation
const spy = vi.spyOn(actualWorkflowService, 'execute');
spy.mockResolvedValueOnce({ status: 'intercepted' });
```

#### Pattern: Dynamic Mock Responses

```typescript
describe('Dynamic Mock Responses', () => {
  it('should return different responses on sequential calls', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'completed' });

    const workflow = new Workflow({ checker: mockFn });

    const result1 = await workflow.checkStatus();
    expect(result1.status).toBe('pending');

    const result2 = await workflow.checkStatus();
    expect(result2.status).toBe('processing');

    const result3 = await workflow.checkStatus();
    expect(result3.status).toBe('completed');
  });

  it('should return dynamic responses based on input', async () => {
    const mockFn = vi.fn().mockImplementation(async (input) => {
      if (input.shouldFail) {
        throw new Error('Failed as requested');
      }
      return { status: 'success', processed: input.value };
    });

    const workflow = new Workflow({ processor: mockFn });

    const result1 = await workflow.process({ value: 123 });
    expect(result1.processed).toBe(123);

    await expect(workflow.process({ value: 456, shouldFail: true }))
      .rejects.toThrow('Failed as requested');
  });
});
```

### 5.2 Vitest Coverage Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/',
        '**/dist/'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
    // Workflow-specific test configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true, // Important for workflow state isolation
    pool: 'threads', // Better for CPU-intensive workflow tests
    poolOptions: {
      threads: {
        singleThread: false // Parallel workflow execution
      }
    },
    // Include integration test files
    include: [
      '**/*.integration.test.ts',
      '**/*.workflow.test.ts',
      '**/*.e2e.test.ts'
    ]
  }
});
```

### 5.3 Vitest Test Watch Mode for Workflows

```bash
# Watch workflow test files only
vitest --workspace=test/workflows

# Run integration tests only
vitest run --reporter=verbose --coverage '*.integration.test.ts'

# Run specific workflow test suite
vitest run order-processing.workflow.test.ts

# Run with UI for debugging
vitest --ui
```

### 5.4 Snapshot Testing for Workflow Responses

```typescript
import { expect } from 'vitest';

describe('Workflow Response Snapshots', () => {
  it('should match expected workflow response structure', async () => {
    const workflow = new OrderProcessingWorkflow();
    const result = await workflow.execute({
      orderId: 'order-123',
      items: [{ id: 'item-1', quantity: 2 }]
    });

    // Inline snapshot
    expect(result).toMatchInlineSnapshot({
      orderId: expect.any(String),
      status: 'completed',
      timestamp: expect.any(Number),
      // Use properties for dynamic values
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          status: expect.any(String)
        })
      ])
    }, `
      {
        "orderId": String,
        "status": "completed",
        "timestamp": Number,
        "steps": Array [
          Object {
            "name": String,
            "status": String
          }
        ]
      }
    `);
  });

  it('should match file snapshot for complex workflow', async () => {
    const workflow = new ComplexMultiStepWorkflow();
    const result = await workflow.execute();

    // File snapshot (auto-updated on first run)
    expect(result).toMatchSnapshot();
  });
});
```

### 5.5 Custom Matchers for Workflow Testing

```typescript
// test-utils/workflow-matchers.ts
import { expect } from 'vitest';

interface WorkflowResponse {
  status: string;
  steps?: Array<{ name: string; status: string }>;
  errors?: Array<{ message: string }>;
  childResponse?: any;
}

expect.extend({
  toBeCompletedWorkflow(received: WorkflowResponse) {
    const pass = received.status === 'completed';
    return {
      pass,
      message: () => pass
        ? `Expected workflow not to be completed, but it was`
        : `Expected workflow to be completed, but got status: ${received.status}`
    };
  },

  toHaveCompletedAllSteps(received: WorkflowResponse) {
    if (!received.steps) {
      return {
        pass: false,
        message: () => 'Workflow response has no steps'
      };
    }

    const allCompleted = received.steps.every(
      step => step.status === 'completed'
    );

    return {
      pass: allCompleted,
      message: () => allCompleted
        ? `Expected all steps not to be completed, but they were`
        : `Expected all steps to be completed, but got: ${JSON.stringify(received.steps)}`
    };
  },

  toPropagateChildResponse(received: WorkflowResponse) {
    const pass = !!received.childResponse;

    return {
      pass,
      message: () => pass
        ? `Expected workflow not to propagate child response, but it did`
        : `Expected workflow to propagate child response, but it was missing`
    };
  },

  toHaveNestedWorkflowStructure(received: WorkflowResponse, levels: number) {
    let current = received;
    let depth = 0;

    while (current.childResponse) {
      depth++;
      current = current.childResponse;
    }

    const pass = depth === levels;

    return {
      pass,
      message: () => pass
        ? `Expected workflow not to have ${levels} nesting levels, but it did`
        : `Expected workflow to have ${levels} nesting levels, but got ${depth}`
    };
  }
});

// Usage in tests
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeCompletedWorkflow(): T;
    toHaveCompletedAllSteps(): T;
    toPropagateChildResponse(): T;
    toHaveNestedWorkflowStructure(levels: number): T;
  }
}

describe('Custom Matchers for Workflows', () => {
  it('should use custom workflow matchers', async () => {
    const result = await workflow.execute();

    expect(result).toBeCompletedWorkflow();
    expect(result).toHaveCompletedAllSteps();
    expect(result).toPropagateChildResponse();
    expect(result).toHaveNestedWorkflowStructure(3);
  });
});
```

---

## 6. Resources and Documentation

### Official Vitest Documentation
- **Vitest Official Docs**: https://vitest.dev/
- **Vitest Testing Frameworks**: https://vitest.dev/guide/testing-frameworks.html
- **Vitest API Reference**: https://vitest.dev/api/
- **Vitest CLI Options**: https://vitest.dev/advanced/cli.html

### Integration Testing Resources
- **Vitest Guide - Test Context**: https://vitest.dev/guide/test-context.html
- **Vitest Coverage**: https://vitest.dev/guide/coverage.html
- **Vitest Mocking**: https://vitest.dev/api/vi.html
- **Vitest Snapshot Testing**: https://vitest.dev/guide/snapshot.html

### TypeScript Testing Patterns
- **Vitest with TypeScript**: https://vitest.dev/guide/why.html
- **TypeScript Testing Best Practices**: https://github.com/microsoft/TypeScript/wiki/Testing-TypeScript

### Workflow Testing Resources
- **Temporal Workflow Testing**: https://docs.temporal.io/typescript/testing
- **AWS Step Functions Testing**: https://docs.aws.amazon.com/step-functions/latest/dg/test-unit-testing.html
- **Testcontainers for Integration Tests**: https://testcontainers.com/

### Additional Resources
- **Vitest Configuration**: https://vitest.dev/config/
- **Vitest UI**: https://vitest.dev/guide/ui.html
- **Vitest Workspace**: https://vitest.dev/guide/workspace.html

---

## Key Takeaways

### Multi-Step Workflow Testing
1. **Organize tests logically** using describe blocks with clear, step-by-step test names
2. **Use setup/teardown hooks** to manage shared context and ensure isolation
3. **Implement state builders** for complex test data construction
4. **Control time** in tests for time-based workflows using fake timers
5. **Parameterize tests** for data-driven workflow scenarios

### Response Propagation Testing
1. **Mock child workflows** explicitly with vi.fn() for precise control
2. **Test both sequential and parallel** execution patterns
3. **Validate event-based propagation** for event-driven architectures
4. **Use state pipeline patterns** for transformation chain validation
5. **Aggregate and verify** parallel workflow results comprehensively

### Failure Pattern Debugging
1. **Detect async issues** with proper await usage and timing assertions
2. **Monitor hook execution** with logging to verify test lifecycle
3. **Ensure test isolation** with proper cleanup and state reset
4. **Handle timeouts** with explicit timeouts and race conditions
5. **Debug mock failures** with detailed call verification

### Nested Workflow Validation
1. **Validate deep nesting** with recursive response structure checks
2. **Track transformation chains** through all processing levels
3. **Test error propagation** through nested error handling
4. **Preserve context** across nested workflow boundaries
5. **Validate timelines** for execution ordering and timing correctness

---

*This research document is intended to serve as a comprehensive guide for integration testing complex JavaScript/TypeScript workflows using Vitest. All patterns and examples are based on industry best practices as of 2026-01-24.*

# Node.js/TypeScript Integration Testing Best Practices

Research document for testing patterns in workflow/agent systems with Vitest, TypeScript decorators, event emitters, and error handling.

**Research Date:** 2026-01-26
**Context:** P1.M2.T2.S2 - Research Node.js/TypeScript integration testing best practices

---

## Table of Contents

1. [Vitest Integration Testing Patterns](#1-vitest-integration-testing-patterns)
2. [TypeScript Testing Patterns for Workflow/Agent Systems](#2-typescript-testing-patterns-for-workflowagent-systems)
3. [Event Emitter Testing Patterns](#3-event-emitter-testing-patterns)
4. [Error Handling Testing](#4-error-handling-testing)
5. [Common Pitfalls and Solutions](#5-common-pitfalls-and-solutions)
6. [Library-Specific Considerations](#6-library-specific-considerations)

---

## 1. Vitest Integration Testing Patterns

### 1.1 Structure Integration Tests

**Best Practice:** Organize integration tests by feature/context, not by file structure.

```typescript
// Recommended structure
// tests/integration/workflow/
//   ├── workflow-execution.test.ts
//   ├── step-validation.test.ts
//   └── error-handling.test.ts

// tests/integration/agent/
//   ├── agent-lifecycle.test.ts
//   └── agent-response-validation.test.ts

// Example: tests/integration/workflow/workflow-execution.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Workflow } from '@/workflow'

describe('Workflow Execution Integration', () => {
  let workflow: Workflow

  beforeEach(async () => {
    // Setup with real dependencies or integration-specific mocks
    workflow = new Workflow({
      // Integration test configuration
    })
    await workflow.initialize()
  })

  afterEach(async () => {
    await workflow.cleanup()
  })

  it('should execute complete workflow with multiple steps', async () => {
    const result = await workflow.execute({
      input: 'test-data'
    })

    expect(result.status).toBe('completed')
    expect(result.steps.length).toBeGreaterThan(0)
  })
})
```

**Key Documentation:**
- [Vitest Test Structure](https://vitest.dev/guide/organizing-tests.html)
- [Vitest Context Configuration](https://vitest.dev/config/)

### 1.2 Mocking Strategies for External Dependencies

**Strategy 1: Module Mocking with `vi.mock`**

```typescript
// Mock external services at module level
import { vi, beforeEach, expect } from 'vitest'
import { WorkflowAgent } from '@/agents/workflow-agent'

vi.mock('@/services/database', () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    transaction: vi.fn(),
    close: vi.fn()
  }))
}))

vi.mock('@/services/llm', () => ({
  LLMService: vi.fn().mockImplementation(() => ({
    complete: vi.fn().mockResolvedValue({
      text: 'Mocked response',
      usage: { tokens: 100 }
    })
  }))
}))

describe('Workflow with External Dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should interact with mocked database service', async () => {
    const agent = new WorkflowAgent()
    await agent.executeWorkflow('test-input')

    // Verify interactions
    const DatabaseService = await import('@/services/database')
    expect(DatabaseService.DatabaseService).toHaveBeenCalled()
  })
})
```

**Strategy 2: Partial Mocking with `vi.spyOn`**

```typescript
import { Agent } from '@/agent'
import { DatabaseService } from '@/services/database'

describe('Agent with Partial Mocks', () => {
  let agent: Agent
  let dbQuerySpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    agent = new Agent()
    // Spy on specific method while keeping rest of implementation
    dbQuerySpy = vi.spyOn(DatabaseService.prototype, 'query')
      .mockResolvedValue({ rows: [{ id: 1, name: 'test' }] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should use real agent logic with mocked database', async () => {
    const result = await agent.fetchData('test-id')
    expect(result).toEqual({ id: 1, name: 'test' })
    expect(dbQuerySpy).toHaveBeenCalledWith('SELECT * FROM data WHERE id = $1', ['test-id'])
  })
})
```

**Strategy 3: Factory Pattern for Test Doubles**

```typescript
// tests/utils/factories.ts
export class TestAgentBuilder {
  private config: AgentConfig = {}
  private mockServices = false

  withMockServices() {
    this.mockServices = true
    return this
  }

  withConfig(config: Partial<AgentConfig>) {
    this.config = { ...this.config, ...config }
    return this
  }

  build(): Agent {
    if (this.mockServices) {
      return new Agent({
        ...this.config,
        services: createMockServices()
      })
    }
    return new Agent(this.config)
  }
}

// Usage in tests
describe('Agent Builder Pattern', () => {
  it('should create agent with mocks', async () => {
    const agent = new TestAgentBuilder()
      .withMockServices()
      .withConfig({ maxRetries: 3 })
      .build()

    await agent.execute()
    // Test with mocked services
  })
})
```

**Key Documentation:**
- [Vitest Mocking Functions](https://vitest.dev/api/mock.html)
- [Vitest vi.mock Documentation](https://vitest.dev/api/vi.html#vi-mock)
- [Vitest Spying](https://vitest.dev/api/vi.html#vi-spyon)

### 1.3 Event Emission Testing Patterns

**Pattern 1: Callback Tracking with `vi.fn()`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { Workflow } from '@/workflow'
import { WorkflowEvent } from '@/types/events'

describe('Workflow Event Emission', () => {
  let workflow: Workflow
  const eventLog: WorkflowEvent[] = []
  const eventSpy = vi.fn((event: WorkflowEvent) => {
    eventLog.push(event)
  })

  beforeEach(() => {
    eventLog.length = 0
    eventSpy.mockClear()
    workflow = new Workflow()
    workflow.on('*', eventSpy)
  })

  it('should emit stepComplete event with correct payload', async () => {
    await workflow.executeStep('test-step', { data: 'input' })

    expect(eventSpy).toHaveBeenCalled()

    const stepEvent = eventLog.find(e => e.type === 'stepComplete')
    expect(stepEvent).toBeDefined()
    expect(stepEvent?.payload).toMatchObject({
      stepName: 'test-step',
      status: 'success'
    })
  })

  it('should emit events in correct order', async () => {
    await workflow.execute(['step1', 'step2'])

    const eventTypes = eventLog.map(e => e.type)
    expect(eventTypes).toEqual([
      'workflowStart',
      'stepStart',
      'stepComplete',
      'stepStart',
      'stepComplete',
      'workflowComplete'
    ])
  })
})
```

**Pattern 2: Promise-Based Event Waiting**

```typescript
import { waitFor } from '@testing-library/dom'
import { once } from 'events'

describe('Async Event Testing', () => {
  it('should wait for specific event', async () => {
    const workflow = new Workflow()

    // Create promise that resolves when event fires
    const eventPromise = new Promise<WorkflowEvent>((resolve) => {
      workflow.once('workflowComplete', resolve)
    })

    // Trigger workflow
    workflow.execute()

    // Wait for event
    const event = await eventPromise
    expect(event.type).toBe('workflowComplete')
  })

  it('should timeout if event not emitted', async () => {
    const workflow = new Workflow()

    const eventPromise = new Promise((resolve) => {
      workflow.once('neverHappens', resolve)
    })

    // Add timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 100)
    )

    await expect(eventPromise).rejects.toThrow('Timeout')
  })
})
```

**Pattern 3: Event Capture Utility**

```typescript
// tests/utils/event-capture.ts
export class EventCapture<TEvent = any> {
  private events: TEvent[] = []
  private emitter: any

  constructor(emitter: any, eventNames: string[]) {
    this.emitter = emitter
    eventNames.forEach(name => {
      emitter.on(name, (event: TEvent) => this.events.push(event))
    })
  }

  getEvents(): TEvent[] {
    return [...this.events]
  }

  getEventsByType<K extends TEvent['type']>(type: K): TEvent[] {
    return this.events.filter(e => e.type === type)
  }

  getLastEvent(): TEvent | undefined {
    return this.events[this.events.length - 1]
  }

  clear() {
    this.events.length = 0
  }

  dispose() {
    this.emitter.removeAllListeners()
  }
}

// Usage
describe('Event Capture Utility', () => {
  it('should capture and query events', async () => {
    const workflow = new Workflow()
    const capture = new EventCapture(workflow, ['stepStart', 'stepComplete', 'workflowComplete'])

    await workflow.execute(['step1', 'step2'])

    const stepStarts = capture.getEventsByType('stepStart')
    expect(stepStarts).toHaveLength(2)

    capture.dispose()
  })
})
```

**Key Documentation:**
- [Vitest Async Testing](https://vitest.dev/guide/testing-async.html)
- [Node.js EventEmitter Documentation](https://nodejs.org/api/events.html)

### 1.4 Async/Await Testing Best Practices

**Best Practice 1: Explicit Await Management**

```typescript
describe('Async Testing Best Practices', () => {
  it('should handle sequential async operations', async () => {
    const agent = new Agent()

    // Clear and explicit awaiting
    const result1 = await agent.step1()
    expect(result1).toBeDefined()

    const result2 = await agent.step2(result1)
    expect(result2).toBeDefined()

    const finalResult = await agent.step3(result2)
    expect(finalResult.status).toBe('completed')
  })

  it('should handle parallel async operations', async () => {
    const agent = new Agent()

    // Run independent operations in parallel
    const [result1, result2, result3] = await Promise.all([
      agent.fetchData1(),
      agent.fetchData2(),
      agent.fetchData3()
    ])

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
    expect(result3).toBeDefined()
  })
})
```

**Best Practice 2: Timeout Configuration**

```typescript
import { test } from 'vitest'

test('should handle long-running operations', {
  timeout: 10000 // 10 seconds
}, async () => {
  const agent = new Agent()
  const result = await agent.longRunningOperation()
  expect(result).toBeDefined()
})

// Global configuration in vitest.config.ts
export default defineConfig({
  test: {
    hookTimeout: 10000,
    testTimeout: 10000
  }
})
```

**Best Practice 3: Error Handling in Async Tests**

```typescript
describe('Async Error Handling', () => {
  it('should reject with expected error', async () => {
    const agent = new Agent()

    await expect(agent.failingOperation()).rejects.toThrow('Expected error')
  })

  it('should handle specific error types', async () => {
    const agent = new Agent()

    await expect(agent.failingOperation()).rejects.toThrow(WorkflowError)
  })

  it('should handle error with custom validation', async () => {
    const agent = new Agent()

    try {
      await agent.failingOperation()
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError)
      expect(error.message).toContain('specific message')
      expect(error.code).toBe('STEP_FAILED')
    }
  })
})
```

**Key Documentation:**
- [Vitest Async Testing Guide](https://vitest.dev/guide/testing-async.html)
- [Vitest Configuration](https://vitest.dev/config/)

---

## 2. TypeScript Testing Patterns for Workflow/Agent Systems

### 2.1 Testing Decorator Patterns (@Step)

**Pattern 1: Direct Method Testing**

```typescript
// src/workflow/decorators.ts
export function Step(options: StepOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // Decorator logic
      const context = this as WorkflowContext
      await context.emit({ type: 'stepStart', stepName: propertyKey })

      try {
        const result = await originalMethod.apply(this, args)
        await context.emit({ type: 'stepComplete', stepName: propertyKey, result })
        return result
      } catch (error) {
        await context.emit({ type: 'stepError', stepName: propertyKey, error })
        throw error
      }
    }

    return descriptor
  }
}

// tests/unit/workflow/step-decorator.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Step } from '@/workflow/decorators'
import { WorkflowContext } from '@/workflow/context'

class TestWorkflow {
  context = new WorkflowContext()

  @Step({ name: 'test-step', timeout: 5000 })
  async processData(input: string): Promise<string> {
    return input.toUpperCase()
  }

  @Step({ name: 'failing-step' })
  async failingStep(): Promise<void> {
    throw new Error('Step failed')
  }
}

describe('Step Decorator', () => {
  let workflow: TestWorkflow
  let emitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    workflow = new TestWorkflow()
    emitSpy = vi.spyOn(workflow.context, 'emit')
  })

  it('should wrap method with event emission', async () => {
    const result = await workflow.processData('hello')

    expect(result).toBe('HELLO')
    expect(emitSpy).toHaveBeenCalledTimes(2) // start + complete

    const startCall = emitSpy.mock.calls[0][0]
    expect(startCall.type).toBe('stepStart')
    expect(startCall.stepName).toBe('processData')

    const completeCall = emitSpy.mock.calls[1][0]
    expect(completeCall.type).toBe('stepComplete')
  })

  it('should emit error event when step fails', async () => {
    await expect(workflow.failingStep()).rejects.toThrow('Step failed')

    expect(emitSpy).toHaveBeenCalledTimes(2)

    const errorCall = emitSpy.mock.calls[1][0]
    expect(errorCall.type).toBe('stepError')
    expect(errorCall.error).toBeInstanceOf(Error)
  })
})
```

**Pattern 2: Metadata Inspection**

```typescript
// tests/unit/workflow/step-metadata.test.ts
import { getStepMetadata } from '@/workflow/metadata'

describe('Step Metadata', () => {
  it('should store step options in metadata', () => {
    class TestWorkflow {
      @Step({ name: 'custom-name', timeout: 10000, retries: 3 })
      async testMethod() {}
    }

    const metadata = getStepMetadata(TestWorkflow.prototype, 'testMethod')
    expect(metadata).toEqual({
      name: 'custom-name',
      timeout: 10000,
      retries: 3
    })
  })
})
```

**Key Documentation:**
- [TypeScript Decorators Documentation](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [Vitest Type Testing](https://vitest.dev/guide/testing-types.html)

### 2.2 Testing Class Methods and Context

**Pattern 1: Instance Context Testing**

```typescript
describe('Agent Context Management', () => {
  it('should maintain context across method calls', async () => {
    const agent = new Agent()

    await agent.initialize()
    expect(agent.context.state).toBe('initialized')

    await agent.executeStep('step1')
    expect(agent.context.currentStep).toBe('step1')
    expect(agent.context.history).toHaveLength(1)

    await agent.executeStep('step2')
    expect(agent.context.currentStep).toBe('step2')
    expect(agent.context.history).toHaveLength(2)
  })

  it('should share context between methods', async () => {
    const agent = new Agent({ sharedMemory: true })

    agent.context.set('key1', 'value1')
    await agent.methodThatReadsContext()

    expect(agent.context.get('processed')).toBe(true)
  })
})
```

**Pattern 2: Method Interaction Testing**

```typescript
describe('Agent Method Interactions', () => {
  it('should call methods in correct sequence', async () => {
    const agent = new Agent()
    const callOrder: string[] = []

    // Spy on private methods (if necessary)
    const validateSpy = vi.spyOn(agent as any, 'validateInput')
      .mockImplementation(async () => {
        callOrder.push('validate')
        return true
      })

    const processSpy = vi.spyOn(agent as any, 'processInput')
      .mockImplementation(async () => {
        callOrder.push('process')
        return 'processed'
      })

    const saveSpy = vi.spyOn(agent as any, 'saveResult')
      .mockImplementation(async () => {
        callOrder.push('save')
      })

    await agent.execute('input')

    expect(callOrder).toEqual(['validate', 'process', 'save'])
    expect(validateSpy).toHaveBeenCalledWith('input')
    expect(processSpy).toHaveBeenCalledWith('input')
    expect(saveSpy).toHaveBeenCalledWith('processed')
  })
})
```

### 2.3 Type-Safe Test Patterns

**Pattern 1: Type Guards and Assertions**

```typescript
// tests/utils/type-guards.ts
export function assertWorkflowEvent(event: unknown): asserts event is WorkflowEvent {
  if (typeof event !== 'object' || event === null) {
    throw new Error('Event must be an object')
  }
  if (!('type' in event) || typeof event.type !== 'string') {
    throw new Error('Event must have a type property')
  }
}

export function isStepCompleteEvent(event: WorkflowEvent): event is StepCompleteEvent {
  return event.type === 'stepComplete'
}

// Usage in tests
describe('Type-Safe Event Testing', () => {
  it('should use type guards for event validation', async () => {
    const workflow = new Workflow()
    const events: WorkflowEvent[] = []

    workflow.on('*', (event: unknown) => {
      assertWorkflowEvent(event) // Type guard
      events.push(event)
    })

    await workflow.execute()

    const stepEvents = events.filter(isStepCompleteEvent)
    stepEvents.forEach(event => {
      // TypeScript knows event has result property
      expect(event.result).toBeDefined()
    })
  })
})
```

**Pattern 2: Generic Test Utilities**

```typescript
// tests/utils/test-helpers.ts
export async function expectEvent<TEvent extends WorkflowEvent>(
  emitter: EventEmitter,
  eventType: TEvent['type'],
  timeout = 1000
): Promise<TEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      emitter.removeListener(eventType, handler)
      reject(new Error(`Event ${eventType} not emitted within ${timeout}ms`))
    }, timeout)

    const handler = (event: WorkflowEvent) => {
      if (event.type === eventType) {
        clearTimeout(timer)
        resolve(event as TEvent)
      }
    }

    emitter.on(eventType, handler)
  })
}

// Usage
describe('Generic Event Utilities', () => {
  it('should wait for typed event', async () => {
    const workflow = new Workflow()
    workflow.execute()

    const event = await expectEvent<StepCompleteEvent>(workflow, 'stepComplete')
    expect(event.result).toBeDefined() // Type-safe access
  })
})
```

**Pattern 3: Fixture Generation**

```typescript
// tests/fixtures/workflow-fixtures.ts
export function createWorkflowFixture(overrides?: Partial<WorkflowConfig>): Workflow {
  return new Workflow({
    name: 'test-workflow',
    timeout: 5000,
    retries: 3,
    ...overrides
  })
}

export function createStepEvent(
  type: 'stepStart' | 'stepComplete' | 'stepError',
  overrides?: Partial<StepEvent>
): StepEvent {
  return {
    type,
    stepName: 'test-step',
    timestamp: Date.now(),
    ...overrides
  }
}

// Usage
describe('Fixture Usage', () => {
  it('should create workflow with defaults', () => {
    const workflow = createWorkflowFixture()
    expect(workflow.config.name).toBe('test-workflow')
  })

  it('should create workflow with overrides', () => {
    const workflow = createWorkflowFixture({ timeout: 10000 })
    expect(workflow.config.timeout).toBe(10000)
  })
})
```

**Key Documentation:**
- [TypeScript Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
- [Vitest Type Testing](https://vitest.dev/guide/testing-types.html)

---

## 3. Event Emitter Testing Patterns

### 3.1 How to Test Event Emission

**Pattern 1: Listener Verification**

```typescript
import { EventEmitter } from 'events'
import { describe, it, expect, beforeEach } from 'vitest'

describe('Event Emission Verification', () => {
  let emitter: EventEmitter
  let listenerCallCount = 0
  const receivedEvents: any[] = []

  beforeEach(() => {
    emitter = new EventEmitter()
    listenerCallCount = 0
    receivedEvents.length = 0
  })

  it('should verify listener was called', () => {
    const listener = (data: any) => {
      listenerCallCount++
      receivedEvents.push(data)
    }

    emitter.on('test-event', listener)
    emitter.emit('test-event', { message: 'test' })

    expect(listenerCallCount).toBe(1)
    expect(receivedEvents[0]).toEqual({ message: 'test' })
  })

  it('should verify multiple listeners', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    emitter.on('event', listener1)
    emitter.on('event', listener2)

    emitter.emit('event', 'data')

    expect(listener1).toHaveBeenCalledWith('data')
    expect(listener2).toHaveBeenCalledWith('data')
  })
})
```

**Pattern 2: Event Order Verification**

```typescript
describe('Event Order Testing', () => {
  it('should emit events in correct sequence', async () => {
    const workflow = new Workflow()
    const eventLog: string[] = []

    workflow.on('stepStart', () => eventLog.push('start'))
    workflow.on('stepComplete', () => eventLog.push('complete'))
    workflow.on('workflowComplete', () => eventLog.push('done'))

    await workflow.execute(['step1', 'step2'])

    expect(eventLog).toEqual([
      'start', 'complete',  // step1
      'start', 'complete',  // step2
      'done'                // workflow
    ])
  })
})
```

### 3.2 Event Listener/Spy Patterns

**Pattern 1: Vitest Spy Integration**

```typescript
describe('Event Spy Patterns', () => {
  it('should use vi.fn() as event listener', () => {
    const emitter = new EventEmitter()
    const spy = vi.fn()

    emitter.on('test-event', spy)
    emitter.emit('test-event', 'arg1', 'arg2')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should track multiple calls', () => {
    const emitter = new EventEmitter()
    const spy = vi.fn()

    emitter.on('event', spy)
    emitter.emit('event', 1)
    emitter.emit('event', 2)
    emitter.emit('event', 3)

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls).toEqual([
      [1],
      [2],
      [3]
    ])
  })
})
```

**Pattern 2: Conditional Spy Activation**

```typescript
describe('Conditional Event Spies', () => {
  it('should spy only on specific events', async () => {
    const workflow = new Workflow()

    const stepStartSpy = vi.fn()
    const stepCompleteSpy = vi.fn()

    workflow.on('stepStart', stepStartSpy)
    workflow.on('stepComplete', stepCompleteSpy)

    await workflow.execute(['step1', 'step2'])

    expect(stepStartSpy).toHaveBeenCalledTimes(2)
    expect(stepCompleteSpy).toHaveBeenCalledTimes(2)

    // Verify spy arguments
    stepStartSpy.mock.calls.forEach((call, index) => {
      expect(call[0].stepName).toBe(`step${index + 1}`)
    })
  })
})
```

**Pattern 3: Listener Cleanup**

```typescript
describe('Event Listener Cleanup', () => {
  it('should remove listeners after test', () => {
    const emitter = new EventEmitter()
    const spy = vi.fn()

    emitter.on('test', spy)
    emitter.emit('test', 'data')
    expect(spy).toHaveBeenCalledTimes(1)

    emitter.removeListener('test', spy)
    emitter.emit('test', 'data')
    expect(spy).toHaveBeenCalledTimes(1) // Still 1, not 2
  })

  it('should clean up in afterEach', () => {
    const emitter = new EventEmitter()

    afterEach(() => {
      emitter.removeAllListeners()
    })

    // Test code...
  })
})
```

### 3.3 Testing Event Payloads

**Pattern 1: Payload Structure Validation**

```typescript
describe('Event Payload Testing', () => {
  it('should emit event with correct structure', async () => {
    const workflow = new Workflow()
    const capturedEvent: any = null

    workflow.once('stepComplete', (event: any) => {
      capturedEvent = event
    })

    await workflow.executeStep('test-step', { input: 'data' })

    expect(capturedEvent).toMatchObject({
      type: 'stepComplete',
      stepName: 'test-step',
      timestamp: expect.any(Number),
      payload: {
        input: 'data',
        output: expect.anything()
      }
    })
  })

  it('should validate discriminated union types', async () => {
    const workflow = new Workflow()
    const events: WorkflowEvent[] = []

    workflow.on('*', (event: WorkflowEvent) => {
      events.push(event)
    })

    await workflow.execute()

    // TypeScript type narrowing
    const startEvents = events.filter((e): e is StepStartEvent => e.type === 'stepStart')
    const completeEvents = events.filter((e): e is StepCompleteEvent => e.type === 'stepComplete')
    const errorEvents = events.filter((e): e is StepErrorEvent => e.type === 'stepError')

    expect(startEvents.length).toBeGreaterThan(0)
    expect(completeEvents.length).toBeGreaterThan(0)

    completeEvents.forEach(event => {
      expect(event.result).toBeDefined() // Type-safe access
    })
  })
})
```

**Pattern 2: Payload Transformation Testing**

```typescript
describe('Event Payload Transformation', () => {
  it('should transform payload through pipeline', async () => {
    const workflow = new Workflow()

    workflow.on('rawEvent', (data: any) => {
      workflow.emit('processedEvent', {
        ...data,
        processed: true,
        timestamp: Date.now()
      })
    })

    const processedSpy = vi.fn()
    workflow.on('processedEvent', processedSpy)

    workflow.emit('rawEvent', { value: 42 })

    expect(processedSpy).toHaveBeenCalledWith({
      value: 42,
      processed: true,
      timestamp: expect.any(Number)
    })
  })
})
```

**Key Documentation:**
- [Node.js EventEmitter](https://nodejs.org/api/events.html)
- [Vitest Mock Functions](https://vitest.dev/api/mock.html)

---

## 4. Error Handling Testing

### 4.1 Testing Custom Errors (WorkflowError)

**Pattern 1: Custom Error Class Definition**

```typescript
// src/errors/workflow-error.ts
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public step?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'WorkflowError'
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      step: this.step,
      details: this.details,
      stack: this.stack
    }
  }
}

// tests/unit/errors/workflow-error.test.ts
import { describe, it, expect } from 'vitest'
import { WorkflowError } from '@/errors/workflow-error'

describe('WorkflowError', () => {
  it('should create error with required properties', () => {
    const error = new WorkflowError(
      'Step failed',
      'STEP_FAILED',
      'processData',
      { input: 'test' }
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('WorkflowError')
    expect(error.message).toBe('Step failed')
    expect(error.code).toBe('STEP_FAILED')
    expect(error.step).toBe('processData')
    expect(error.details).toEqual({ input: 'test' })
  })

  it('should serialize to JSON correctly', () => {
    const error = new WorkflowError('Test error', 'TEST_CODE')
    const json = error.toJSON()

    expect(json).toMatchObject({
      name: 'WorkflowError',
      message: 'Test error',
      code: 'TEST_CODE'
    })
    expect(json.stack).toBeDefined()
  })
})
```

**Pattern 2: Error Throwing and Catching**

```typescript
describe('Error Throwing and Catching', () => {
  it('should throw WorkflowError in step', async () => {
    const workflow = new Workflow()

    await expect(
      workflow.executeStep('failing-step')
    ).rejects.toThrow(WorkflowError)
  })

  it('should catch and verify error properties', async () => {
    const workflow = new Workflow()

    try {
      await workflow.executeStep('failing-step')
      expect.fail('Should have thrown WorkflowError')
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowError)
      expect(error.code).toBe('STEP_FAILED')
      expect(error.step).toBe('failing-step')
    }
  })
})
```

### 4.2 Error Validation Patterns

**Pattern 1: Error Type Guards**

```typescript
// tests/utils/error-guards.ts
export function isWorkflowError(error: unknown): error is WorkflowError {
  return error instanceof WorkflowError
}

export function assertWorkflowError(error: unknown): asserts error is WorkflowError {
  if (!isWorkflowError(error)) {
    throw new Error(`Expected WorkflowError, got ${error}`)
  }
}

export function isErrorCode(error: WorkflowError, code: string): boolean {
  return error.code === code
}

// Usage in tests
describe('Error Validation', () => {
  it('should use type guards for error validation', async () => {
    const workflow = new Workflow()

    try {
      await workflow.execute()
    } catch (error) {
      assertWorkflowError(error)
      expect(isErrorCode(error, 'WORKFLOW_FAILED')).toBe(true)
    }
  })
})
```

**Pattern 2: Error Message Validation**

```typescript
describe('Error Message Validation', () => {
  it('should include helpful error messages', async () => {
    const agent = new Agent()

    try {
      await agent.execute('invalid-input')
    } catch (error) {
      assertWorkflowError(error)
      expect(error.message).toContain('validation')
      expect(error.message).toContain('invalid-input')
      expect(error.details).toMatchObject({
        input: 'invalid-input',
        errors: expect.any(Array)
      })
    }
  })
})
```

**Pattern 3: Error Code Enumeration**

```typescript
// src/errors/error-codes.ts
export enum WorkflowErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  STEP_FAILED = 'STEP_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  AGENT_ERROR = 'AGENT_ERROR'
}

// tests/integration/workflow/error-codes.test.ts
describe('Workflow Error Codes', () => {
  it('should use correct error codes for different failures', async () => {
    const workflow = new Workflow()

    // Test initialization failure
    await expect(workflow.initialize({ invalid: true }))
      .rejects.toMatchObject({
        code: WorkflowErrorCode.INITIALIZATION_FAILED
      })

    // Test step failure
    await expect(workflow.executeStep('failing-step'))
      .rejects.toMatchObject({
        code: WorkflowErrorCode.STEP_FAILED
      })
  })
})
```

### 4.3 Graceful Error Handling Testing

**Pattern 1: Error Recovery Testing**

```typescript
describe('Error Recovery', () => {
  it('should recover from transient errors', async () => {
    const agent = new Agent({ maxRetries: 3 })
    let attemptCount = 0

    // Mock service that fails twice then succeeds
    vi.spyOn(agent.service, 'call').mockImplementation(async () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new WorkflowError('Service unavailable', 'SERVICE_UNAVAILABLE')
      }
      return { success: true }
    })

    const result = await agent.executeWithRetry('operation')
    expect(result.success).toBe(true)
    expect(attemptCount).toBe(3)
  })

  it('should fail after max retries', async () => {
    const agent = new Agent({ maxRetries: 2 })

    vi.spyOn(agent.service, 'call').mockRejectedValue(
      new WorkflowError('Permanent failure', 'PERMANENT_ERROR')
    )

    await expect(agent.executeWithRetry('operation'))
      .rejects.toThrow(WorkflowError)

    expect(agent.service.call).toHaveBeenCalledTimes(2)
  })
})
```

**Pattern 2: Fallback Behavior Testing**

```typescript
describe('Fallback Behavior', () => {
  it('should use fallback on primary failure', async () => {
    const agent = new Agent({
      primaryService: 'service-a',
      fallbackService: 'service-b'
    })

    const primarySpy = vi.spyOn(agent, 'callPrimary').mockRejectedValue(
      new WorkflowError('Primary failed', 'PRIMARY_FAILED')
    )

    const fallbackSpy = vi.spyOn(agent, 'callFallback').mockResolvedValue({
      source: 'fallback',
      data: 'result'
    })

    const result = await agent.executeWithFallback()

    expect(primarySpy).toHaveBeenCalled()
    expect(fallbackSpy).toHaveBeenCalled()
    expect(result.source).toBe('fallback')
  })
})
```

**Pattern 3: Error Event Emission**

```typescript
describe('Error Event Emission', () => {
  it('should emit error event on failure', async () => {
    const workflow = new Workflow()
    const errorSpy = vi.fn()

    workflow.on('error', errorSpy)

    try {
      await workflow.executeStep('failing-step')
    } catch (error) {
      // Expected error
    }

    expect(errorSpy).toHaveBeenCalledTimes(1)
    const errorEvent = errorSpy.mock.calls[0][0]

    expect(errorEvent.type).toBe('error')
    expect(errorEvent.error).toBeInstanceOf(WorkflowError)
    expect(errorEvent.error.code).toBe('STEP_FAILED')
  })

  it('should emit error with context', async () => {
    const workflow = new Workflow()
    const errorEvents: any[] = []

    workflow.on('error', (event) => errorEvents.push(event))

    try {
      await workflow.execute(['step1', 'failing-step', 'step3'])
    } catch (error) {
      // Expected
    }

    const errorEvent = errorEvents[0]
    expect(errorEvent.context).toMatchObject({
      workflow: workflow.id,
      completedSteps: ['step1'],
      currentStep: 'failing-step',
      remainingSteps: ['step3']
    })
  })
})
```

**Key Documentation:**
- [Vitest Error Testing](https://vitest.dev/guide/testing-async.html#testing-errors)
- [TypeScript Error Handling](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)

---

## 5. Common Pitfalls and Solutions

### 5.1 Async Testing Pitfalls

**Pitfall 1: Missing await**

```typescript
// ❌ BAD: Missing await
it('should test async operation', () => {
  workflow.execute() // Missing await
  expect(workflow.status).toBe('completed') // Runs before completion
})

// ✅ GOOD: Proper await
it('should test async operation', async () => {
  await workflow.execute()
  expect(workflow.status).toBe('completed')
})
```

**Pitfall 2: Not waiting for event listeners**

```typescript
// ❌ BAD: Event not yet emitted
it('should test event', async () => {
  workflow.execute()
  expect(eventSpy).toHaveBeenCalled() // May fail
})

// ✅ GOOD: Wait for event
it('should test event', async () => {
  workflow.execute()
  await waitFor(() => {
    expect(eventSpy).toHaveBeenCalled()
  })
})
```

**Pitfall 3: Race conditions in parallel tests**

```typescript
// ❌ BAD: Shared state causes race conditions
let workflow = new Workflow()

it('test 1', async () => {
  workflow.state = 'test1'
  await workflow.execute()
})

it('test 2', async () => {
  workflow.state = 'test2'
  await workflow.execute() // May interfere with test1
})

// ✅ GOOD: Isolated instances
it('test 1', async () => {
  const workflow = new Workflow()
  workflow.state = 'test1'
  await workflow.execute()
})

it('test 2', async () => {
  const workflow = new Workflow()
  workflow.state = 'test2'
  await workflow.execute()
})
```

### 5.2 Mocking Pitfalls

**Pitfall 1: Over-mocking**

```typescript
// ❌ BAD: Everything mocked
vi.mock('@/services/database')
vi.mock('@/services/llm')
vi.mock('@/services/cache')
vi.mock('@/utils/logger')
// Test becomes meaningless

// ✅ GOOD: Mock only external dependencies
vi.mock('@/services/llm') // External API
// Keep database, cache, logger real for integration testing
```

**Pitfall 2: Not clearing mocks**

```typescript
// ❌ BAD: Mock state bleeds between tests
it('test 1', async () => {
  vi.spyOn(service, 'method').mockResolvedValue('result1')
  await operation()
  expect(service.method).toHaveBeenCalled()
})

it('test 2', async () => {
  // Mock from test1 still active!
  await operation()
  expect(service.method).toHaveBeenCalledWith('different') // May fail
})

// ✅ GOOD: Clean up mocks
afterEach(() => {
  vi.restoreAllMocks()
})

it('test 1', async () => {
  vi.spyOn(service, 'method').mockResolvedValue('result1')
  await operation()
})

it('test 2', async () => {
  vi.spyOn(service, 'method').mockResolvedValue('result2')
  await operation()
})
```

### 5.3 Event Emitter Pitfalls

**Pitfall 1: Memory leaks**

```typescript
// ❌ BAD: Listeners not removed
it('should test events', () => {
  workflow.on('event', listener)
  workflow.emit('event', 'data')
  // Listener stays attached
})

// ✅ GOOD: Clean up listeners
it('should test events', () => {
  workflow.on('event', listener)
  workflow.emit('event', 'data')
  workflow.off('event', listener)
})

// ✅ BETTER: Use cleanup utilities
afterEach(() => {
  workflow.removeAllListeners()
})
```

**Pitfall 2: Wrong event names**

```typescript
// ❌ BAD: Typo in event name
workflow.on('stpeComplete', listener) // Typo!
workflow.emit('stepComplete', data) // Won't trigger

// ✅ GOOD: Use constants
const Events = {
  STEP_COMPLETE: 'stepComplete',
  STEP_ERROR: 'stepError'
} as const

workflow.on(Events.STEP_COMPLETE, listener)
workflow.emit(Events.STEP_COMPLETE, data)
```

### 5.4 Type Safety Pitfalls

**Pitfall 1: Type assertions**

```typescript
// ❌ BAD: Unsafe type assertion
const event = emittedEvent as StepCompleteEvent
expect(event.result).toBeDefined() // No compile-time check

// ✅ GOOD: Type guards
if (event.type === 'stepComplete') {
  expect(event.result).toBeDefined() // Type-safe
}
```

**Pitfall 2: Missing null checks**

```typescript
// ❌ BAD: Assumes non-null
const result = workflow.getResult()
expect(result.value).toBe('expected') // May crash if null

// ✅ GOOD: Explicit null checks
const result = workflow.getResult()
expect(result).not.toBeNull()
expect(result!.value).toBe('expected')
```

---

## 6. Library-Specific Considerations

### 6.1 Vitest-Specific Features

**Feature 1: `vi.waitFor` for async conditions**

```typescript
import { vi } from 'vitest'

it('should wait for condition', async () => {
  workflow.execute()

  await vi.waitFor(() => {
    expect(workflow.status).toBe('completed')
  }, { timeout: 5000 })
})
```

**Feature 2: Snapshot testing for event sequences**

```typescript
it('should match event sequence snapshot', async () => {
  const events: WorkflowEvent[] = []
  workflow.on('*', (event) => events.push(event))

  await workflow.execute(['step1', 'step2'])

  expect(events).toMatchSnapshot()
})
```

**Feature 3: Benchmarks**

```typescript
import { bench, describe } from 'vitest'

describe('Workflow Performance', () => {
  bench('should execute workflow efficiently', async () => {
    const workflow = new Workflow()
    await workflow.execute(['step1', 'step2', 'step3'])
  })
})
```

**Vitest Documentation:**
- [Vitest API Reference](https://vitest.dev/api/)
- [Vitest Configuration](https://vitest.dev/config/)
- [Vitest Advanced Features](https://vitest.dev/guide/advanced.html)

### 6.2 TypeScript Considerations

**Consideration 1: Type-only imports**

```typescript
// Use type-only imports to avoid runtime imports
import type { WorkflowEvent } from '@/types/events'
import { Workflow } from '@/workflow'
```

**Consideration 2: Strict mode testing**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Consideration 3: Type-safe mocks**

```typescript
import type { Agent } from '@/agent'

const mockAgent = {
  execute: vi.fn<Agent['execute']>(),
  validate: vi.fn<Agent['validate']>()
} as unknown as Agent
```

### 6.3 Node.js EventEmitter Considerations

**Consideration 1: Max listeners warning**

```typescript
// In tests, you might exceed default max listeners
beforeEach(() => {
  workflow.setMaxListeners(100) // Avoid warning
})
```

**Consideration 2: Error events**

```typescript
// Special handling for 'error' events
it('should handle error event', (done) => {
  workflow.on('error', (error) => {
    expect(error).toBeInstanceOf(WorkflowError)
    done()
  })

  workflow.executeFailingStep()
})
```

**Node.js EventEmitter Documentation:**
- [Node.js EventEmitter API](https://nodejs.org/api/events.html#class-eventemitter)
- [Event Best Practices](https://nodejs.org/api/events.html#events_best_practices)

### 6.4 Testing Framework Integration

**Integration with Testing Library**

```typescript
import { render, waitFor } from '@testing-library/dom'

it('should test UI integration', async () => {
  const { getByText } = render(<WorkflowUI workflow={workflow} />)

  workflow.execute()

  await waitFor(() => {
    expect(getByText('Complete')).toBeInTheDocument()
  })
})
```

**Integration with Supertest for HTTP**

```typescript
import request from 'supertest'
import { app } from '@/app'

it('should test workflow endpoint', async () => {
  const response = await request(app)
    .post('/api/workflows/execute')
    .send({ workflowId: 'test' })
    .expect(200)

  expect(response.body.status).toBe('completed')
})
```

---

## Summary and Recommendations

### Key Takeaways

1. **Structure Tests by Feature**: Organize integration tests by workflow/agent functionality, not file structure
2. **Mock Strategically**: Only mock external dependencies; keep internal logic real for integration tests
3. **Type Safety First**: Use type guards and avoid unsafe assertions
4. **Event Testing Patterns**: Use spies, promise-based waiting, and event capture utilities
5. **Error Handling**: Test error emission, error codes, and recovery patterns
6. **Clean Up**: Always remove event listeners and restore mocks in `afterEach`
7. **Async Best Practices**: Always await async operations and use `waitFor` for race conditions

### Recommended Test Structure

```
tests/
├── unit/
│   ├── workflow/
│   │   ├── step-decorator.test.ts
│   │   └── workflow-error.test.ts
│   └── agents/
│       └── agent-validation.test.ts
├── integration/
│   ├── workflow/
│   │   ├── workflow-execution.test.ts
│   │   └── step-validation.test.ts
│   └── agents/
│       ├── agent-lifecycle.test.ts
│       └── agent-response-validation.test.ts
├── utils/
│   ├── factories.ts
│   ├── event-capture.ts
│   └── error-guards.ts
└── fixtures/
    ├── workflow-fixtures.ts
    └── event-fixtures.ts
```

### Further Reading

- [Vitest Best Practices Guide](https://vitest.dev/guide/)
- [Testing TypeScript Guide](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Node.js Testing Patterns](https://nodejs.org/api/test.html)
- [Event-Driven Architecture Testing](https://martinfowler.com/articles/microservices-testing/#testing-a-state-based-microservice)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Maintained By:** P1.M2.T2.S2 Research Team

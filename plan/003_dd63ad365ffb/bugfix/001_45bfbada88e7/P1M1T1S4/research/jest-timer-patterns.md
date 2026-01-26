# Jest Timer Mocks & Testing Patterns Research

## Table of Contents
1. [Jest Timer Mocks for Testing Delays](#1-jest-timer-mocks-for-testing-delays)
2. [Decorator Testing Patterns](#2-decorator-testing-patterns)
3. [Retry Logic Testing](#3-retry-logic-testing)
4. [Event/Observables Testing](#4-eventobservables-testing)
5. [Common Gotchas](#5-common-gotchas)
6. [Best Practices](#6-best-practices)

---

## 1. Jest Timer Mocks for Testing Delays

### 1.1 Core Timer Mock Functions

```typescript
// Enable fake timers
jest.useFakeTimers();

// Advance time by specific milliseconds
jest.advanceTimersByTime(1000);

// Run all pending timers immediately
jest.runAllTimers();

// Run only currently pending timers
jest.runOnlyPendingTimers();

// Clear all timers
jest.clearAllTimers();

// Restore real timers
jest.useRealTimers();
```

### 1.2 Testing Retry Delays

```typescript
describe('Retry with Fake Timers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should retry after specified delay', async () => {
    const callback = jest.fn();
    let attempts = 0;

    const retryWithDelay = async () => {
      attempts++;
      if (attempts < 3) {
        setTimeout(() => retryWithDelay(), 1000);
        throw new Error('Not yet');
      }
      callback();
    };

    // Start the operation
    const promise = retryWithDelay().catch(() => {});

    // Fast-forward through each retry
    for (let i = 0; i < 2; i++) {
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow promises to settle
    }

    // Final attempt succeeds
    jest.advanceTimersByTime(1000);
    await promise;

    expect(callback).toHaveBeenCalled();
    expect(attempts).toBe(3);
  });
});
```

### 1.3 Testing Exponential Backoff

```typescript
describe('Exponential Backoff with Fake Timers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should implement exponential backoff', async () => {
    const delays: number[] = [];
    const mockDelay = (ms: number) => {
      delays.push(ms);
      return new Promise(resolve => setTimeout(resolve, ms));
    };

    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        await mockDelay(Math.pow(2, attempts) * 100); // 200, 400, 800
        throw new Error('Retry');
      }
      return 'success';
    };

    const promise = operation().catch(() => {});

    // Advance through all delays
    jest.advanceTimersByTime(200 + 400 + 800);
    await Promise.resolve();

    expect(delays).toEqual([200, 400]);
  });
});
```

### 1.4 Testing setInterval with Retry Logic

```typescript
describe('setInterval with Retry Monitoring', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute retry on interval', async () => {
    const callback = jest.fn().mockReturnValueOnce(
      Promise.reject(new Error('Fail'))
    ).mockReturnValueOnce(
      Promise.resolve('Success')
    );

    let intervalId: NodeJS.Timeout;
    const executeWithInterval = () => {
      callback().then(() => clearInterval(intervalId));
      intervalId = setInterval(() => {
        callback().then(() => clearInterval(intervalId));
      }, 1000);
    };

    executeWithInterval();

    // First immediate call fails
    await Promise.resolve();

    // First interval retry (1000ms)
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
```

### 1.5 Legacy vs Modern Timer APIs

```typescript
// Legacy timers (default before Jest 27)
jest.useFakeTimers('legacy');

// Modern timers (Jest 27+)
jest.useFakeTimers('modern');

// With modern timers, you can use:
jest.setSystemTime(new Date('2024-01-01'));

// Get current time
const now = Date.now();
```

---

## 2. Decorator Testing Patterns

### 2.1 Testing Method Decorators

```typescript
// Decorator definition
function Log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with`, args);
    const result = originalMethod.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };
  return descriptor;
}

// Test
describe('Log Decorator', () => {
  it('should log method calls and results', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    class TestClass {
      @Log
      add(a: number, b: number): number {
        return a + b;
      }
    }

    const instance = new TestClass();
    const result = instance.add(2, 3);

    expect(result).toBe(5);
    expect(consoleSpy).toHaveBeenCalledWith('Calling add with', [2, 3]);
    expect(consoleSpy).toHaveBeenCalledWith('Result:', 5);
  });
});
```

### 2.2 Testing Decorator Factories (with Parameters)

```typescript
// Decorator factory
function Retry(maxAttempts: number, delay: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          if (i < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      throw lastError;
    };
    return descriptor;
  };
}

// Test
describe('Retry Decorator Factory', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should retry specified number of times', async () => {
    let attempts = 0;

    class TestService {
      @Retry(3, 1000)
      async fetchData(): Promise<string> {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return 'success';
      }
    }

    const service = new TestService();
    const promise = service.fetchData();

    // Fast-forward through retries
    jest.advanceTimersByTime(2000);
    await promise;

    expect(attempts).toBe(3);
  });

  it('should configure custom delay', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((fn: Function, delay: number) => {
      delays.push(delay);
      return originalSetTimeout(fn, delay);
    }) as any;

    let attempts = 0;

    class TestService {
      @Retry(3, 500)
      async fetchData(): Promise<string> {
        attempts++;
        if (attempts < 3) throw new Error('Fail');
        return 'success';
      }
    }

    const service = new TestService();
    const promise = service.fetchData();

    jest.advanceTimersByTime(1000);
    await promise;

    expect(delays).toEqual([500, 500]);
  });
});
```

### 2.3 Testing Decorators with Event Emission

```typescript
// Event emitter decorator
function EmitEvent(eventName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      (this as any).emit(eventName, result);
      return result;
    };
    return descriptor;
  };
}

// Test
describe('EmitEvent Decorator', () => {
  it('should emit event with method result', async () => {
    const mockObserver = jest.fn();

    class TestService {
      private observers: Function[] = [];

      on(event: string, callback: Function) {
        this.observers.push(callback);
      }

      emit(event: string, data: any) {
        this.observers.forEach(cb => cb(data));
      }

      @EmitEvent('dataFetched')
      async fetchData(): Promise<{ id: number }> {
        return { id: 42 };
      }
    }

    const service = new TestService();
    service.on('dataFetched', mockObserver);

    await service.fetchData();

    expect(mockObserver).toHaveBeenCalledWith({ id: 42 });
  });
});
```

### 2.4 Testing Decorator Property Access

```typescript
// Decorator that modifies property descriptor
function ReadOnly(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  descriptor.writable = false;
  return descriptor;
}

// Test
describe('ReadOnly Decorator', () => {
  it('should prevent property modification', () => {
    class TestClass {
      @ReadOnly
      readonly value: number = 10;
    }

    const instance = new TestClass();

    expect(() => {
      (instance as any).value = 20;
    }).toThrow();

    expect(instance.value).toBe(10);
  });
});
```

### 2.5 Mocking Class Instances for Decorator Testing

```typescript
describe('Decorator with Mocked Instance', () => {
  it('should test decorator with mocked dependencies', async () => {
    // Mock dependency
    const mockRepository = {
      save: jest.fn()
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({ id: 1, name: 'Test' })
    };

    class DataService {
      constructor(private repository: any) {}

      @Retry(3, 100)
      async saveData(data: any) {
        return this.repository.save(data);
      }
    }

    const service = new DataService(mockRepository);

    // First call fails
    await expect(service.saveData({ name: 'Test' })).rejects.toThrow();

    // Second call succeeds
    const result = await service.saveData({ name: 'Test' });
    expect(result).toEqual({ id: 1, name: 'Test' });
    expect(mockRepository.save).toHaveBeenCalledTimes(2);
  });
});
```

---

## 3. Retry Logic Testing

### 3.1 Testing Retry Counts

```typescript
describe('Retry Count Testing', () => {
  it('should respect max retry limit', async () => {
    let attemptCount = 0;
    const failingOperation = jest.fn(() => {
      attemptCount++;
      throw new Error('Always fails');
    });

    const retryOperation = async (maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await failingOperation();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }
    };

    await expect(retryOperation(3)).rejects.toThrow('Always fails');
    expect(attemptCount).toBe(3);
    expect(failingOperation).toHaveBeenCalledTimes(3);
  });

  it('should stop retrying on success', async () => {
    let attemptCount = 0;
    const flakyOperation = jest.fn(() => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Temporary failure');
      }
      return 'success';
    });

    const retryOperation = async (maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await flakyOperation();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
        }
      }
    };

    const result = await retryOperation(5);
    expect(result).toBe('success');
    expect(attemptCount).toBe(2); // Stopped after success
    expect(flakyOperation).toHaveBeenCalledTimes(2);
  });
});
```

### 3.2 Testing Delay Between Retries

```typescript
describe('Retry Delay Testing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should wait specified delay between retries', async () => {
    const delays: number[] = [];

    // Wrap setTimeout to capture delays
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((fn: Function, delay: number) => {
      delays.push(delay);
      return originalSetTimeout(fn, delay);
    }) as any;

    let attemptCount = 0;
    const retryWithDelay = async (maxRetries: number, delay: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          attemptCount++;
          if (attemptCount < maxRetries) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return 'success';
        } catch (error) {
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    };

    const promise = retryWithDelay(3, 1000);

    // Fast-forward through delays
    jest.advanceTimersByTime(2000);
    await promise;

    expect(delays).toEqual([1000, 1000]);
    expect(attemptCount).toBe(3);
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((fn: Function, delay: number) => {
      delays.push(delay);
      return originalSetTimeout(fn, delay);
    }) as any;

    let attemptCount = 0;
    const retryWithBackoff = async (maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          attemptCount++;
          if (attemptCount < maxRetries) {
            throw new Error(`Attempt ${attemptCount} failed`);
          }
          return 'success';
        } catch (error) {
          if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 100; // 100, 200, 400
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    };

    const promise = retryWithBackoff(4);

    jest.advanceTimersByTime(100 + 200 + 400);
    await promise;

    expect(delays).toEqual([100, 200, 400]);
  });
});
```

### 3.3 Testing Event Emission on Retries

```typescript
describe('Retry Event Emission', () => {
  it('should emit retry event with attempt info', async () => {
    interface RetryEvent {
      attempt: number;
      error: Error;
      timestamp: number;
    }

    const retryEvents: RetryEvent[] = [];

    class RetryTracker {
      onRetry(callback: (event: RetryEvent) => void) {
        this.retryCallback = callback;
      }

      private retryCallback?: (event: RetryEvent) => void;

      async retryableOperation<T>(
        operation: () => Promise<T>,
        maxRetries: number
      ): Promise<T> {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await operation();
          } catch (error) {
            const event: RetryEvent = {
              attempt: i + 1,
              error: error as Error,
              timestamp: Date.now()
            };

            if (this.retryCallback) {
              this.retryCallback(event);
            }

            if (i === maxRetries - 1) throw error;
          }
        }
        throw new Error('Should not reach here');
      }
    }

    const tracker = new RetryTracker();
    tracker.onRetry(event => retryEvents.push(event));

    let attemptCount = 0;
    const flakyOperation = () => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
      }
      return Promise.resolve('success');
    };

    await tracker.retryableOperation(flakyOperation, 3);

    expect(retryEvents).toHaveLength(2);
    expect(retryEvents[0]).toMatchObject({
      attempt: 1,
      error: { message: 'Attempt 1 failed' }
    });
    expect(retryEvents[1]).toMatchObject({
      attempt: 2,
      error: { message: 'Attempt 2 failed' }
    });
  });
});
```

### 3.4 Testing Error Conditions in Retry Loops

```typescript
describe('Retry Error Conditions', () => {
  it('should handle different error types', async () => {
    class NetworkError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
      }
    }

    class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    }

    let attemptCount = 0;
    const operation = jest.fn(() => {
      attemptCount++;
      if (attemptCount === 1) {
        throw new NetworkError('Connection lost');
      } else if (attemptCount === 2) {
        throw new ValidationError('Invalid data');
      }
      return Promise.resolve('success');
    });

    const retryWithFilter = async (
      operation: () => Promise<any>,
      retryableErrors: string[]
    ) => {
      for (let i = 0; i < 3; i++) {
        try {
          return await operation();
        } catch (error) {
          if (!retryableErrors.includes((error as Error).name)) {
            throw error; // Don't retry non-retryable errors
          }
        }
      }
    };

    // Only retry NetworkError
    await expect(
      retryWithFilter(operation, ['NetworkError'])
    ).rejects.toThrow('ValidationError');

    expect(attemptCount).toBe(2); // Stopped at non-retryable error
  });

  it('should preserve original error after all retries', async () => {
    const originalError = new Error('Original error message');
    const failingOperation = jest.fn(() => {
      throw originalError;
    });

    const retryOperation = async (maxRetries: number) => {
      let lastError: Error;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await failingOperation();
        } catch (error) {
          lastError = error as Error;
        }
      }
      throw lastError;
    };

    await expect(retryOperation(3)).rejects.toThrow('Original error message');
    expect(originalError.stack).toContain('Original error message');
  });
});
```

### 3.5 Testing Retry with Complex Conditions

```typescript
describe('Complex Retry Conditions', () => {
  it('should retry based on custom criteria', async () => {
    interface RetryCondition {
      shouldRetry: (error: Error, attempt: number) => boolean;
    }

    const retryWithCondition = async (
      operation: () => Promise<any>,
      condition: RetryCondition,
      maxRetries: number
    ) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          if (!condition.shouldRetry(error as Error, i + 1)) {
            throw error;
          }
        }
      }
    };

    // Retry only on 500 errors and max 3 times
    let attemptCount = 0;
    const apiCall = jest.fn(() => {
      attemptCount++;
      if (attemptCount === 1) {
        return Promise.reject({ status: 500, message: 'Server Error' });
      } else if (attemptCount === 2) {
        return Promise.reject({ status: 404, message: 'Not Found' });
      }
      return Promise.resolve({ status: 200, data: 'success' });
    });

    const condition: RetryCondition = {
      shouldRetry: (error: any, attempt) => {
        return error.status === 500 && attempt < 3;
      }
    };

    await expect(
      retryWithCondition(apiCall, condition, 3)
    ).rejects.toMatchObject({ status: 404 });

    expect(attemptCount).toBe(2); // Stopped at 404 (non-retryable)
  });
});
```

---

## 4. Event/Observables Testing

### 4.1 Testing Event Emission

```typescript
describe('Event Emission Testing', () => {
  it('should capture emitted events', () => {
    class EventEmitter {
      private events: Record<string, Function[]> = {};

      on(event: string, callback: Function) {
        if (!this.events[event]) {
          this.events[event] = [];
        }
        this.events[event].push(callback);
      }

      emit(event: string, ...args: any[]) {
        if (this.events[event]) {
          this.events[event].forEach(callback => callback(...args));
        }
      }
    }

    const emitter = new EventEmitter();
    const mockCallback = jest.fn();

    emitter.on('test-event', mockCallback);
    emitter.emit('test-event', { data: 'payload' });

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith({ data: 'payload' });
  });

  it('should emit multiple events', () => {
    const mockCallback1 = jest.fn();
    const mockCallback2 = jest.fn();

    class MultiEventEmitter extends EventEmitter {}
    const emitter = new MultiEventEmitter();

    emitter.on('event1', mockCallback1);
    emitter.on('event2', mockCallback2);

    emitter.emit('event1', 'first');
    emitter.emit('event2', 'second');
    emitter.emit('event1', 'third');

    expect(mockCallback1).toHaveBeenCalledTimes(2);
    expect(mockCallback1).toHaveBeenCalledWith('first');
    expect(mockCallback1).toHaveBeenCalledWith('third');

    expect(mockCallback2).toHaveBeenCalledTimes(1);
    expect(mockCallback2).toHaveBeenCalledWith('second');
  });
});
```

### 4.2 Mocking Observers for Event Capture

```typescript
describe('Observer Pattern Testing', () => {
  it('should notify all observers', () => {
    interface Observer {
      update(data: any): void;
    }

    class Subject {
      private observers: Observer[] = [];

      attach(observer: Observer) {
        this.observers.push(observer);
      }

      detach(observer: Observer) {
        this.observers = this.observers.filter(o => o !== observer);
      }

      notify(data: any) {
        this.observers.forEach(observer => observer.update(data));
      }
    }

    const mockObserver1: Observer = { update: jest.fn() };
    const mockObserver2: Observer = { update: jest.fn() };

    const subject = new Subject();
    subject.attach(mockObserver1);
    subject.attach(mockObserver2);

    subject.notify({ type: 'state-change', value: 42 });

    expect(mockObserver1.update).toHaveBeenCalledWith({
      type: 'state-change',
      value: 42
    });
    expect(mockObserver2.update).toHaveBeenCalledWith({
      type: 'state-change',
      value: 42
    });
  });

  it('should handle observer detachment', () => {
    interface Observer {
      update(data: any): void;
    }

    class Subject {
      private observers: Observer[] = [];

      attach(observer: Observer) {
        this.observers.push(observer);
      }

      detach(observer: Observer) {
        this.observers = this.observers.filter(o => o !== observer);
      }

      notify(data: any) {
        this.observers.forEach(observer => observer.update(data));
      }
    }

    const mockObserver1: Observer = { update: jest.fn() };
    const mockObserver2: Observer = { update: jest.fn() };

    const subject = new Subject();
    subject.attach(mockObserver1);
    subject.attach(mockObserver2);

    subject.notify('event1');
    subject.detach(mockObserver1);
    subject.notify('event2');

    expect(mockObserver1.update).toHaveBeenCalledTimes(1);
    expect(mockObserver1.update).toHaveBeenCalledWith('event1');

    expect(mockObserver2.update).toHaveBeenCalledTimes(2);
    expect(mockObserver2.update).toHaveBeenCalledWith('event1');
    expect(mockObserver2.update).toHaveBeenCalledWith('event2');
  });
});
```

### 4.3 Verifying Event Payloads

```typescript
describe('Event Payload Verification', () => {
  it('should verify event payload structure', () => {
    interface RetryEvent {
      timestamp: number;
      attempt: number;
      error: {
        message: string;
        code?: string;
      };
      context?: {
        operationName: string;
      };
    }

    const capturedEvents: RetryEvent[] = [];

    class RetryManager {
      emitRetryEvent(event: RetryEvent) {
        capturedEvents.push(event);
      }
    }

    const manager = new RetryManager();
    manager.emitRetryEvent({
      timestamp: Date.now(),
      attempt: 1,
      error: {
        message: 'Network timeout',
        code: 'ETIMEDOUT'
      },
      context: {
        operationName: 'fetchData'
      }
    });

    expect(capturedEvents).toHaveLength(1);
    expect(capturedEvents[0]).toMatchObject({
      attempt: 1,
      error: {
        message: 'Network timeout',
        code: 'ETIMEDOUT'
      },
      context: {
        operationName: 'fetchData'
      }
    });
    expect(capturedEvents[0].timestamp).toBeGreaterThan(0);
  });

  it('should verify event sequence', async () => {
    const eventSequence: string[] = [];

    class SequenceTracker {
      async operationWithEvents() {
        eventSequence.push('start');
        try {
          eventSequence.push('processing');
          throw new Error('Error occurred');
        } catch (error) {
          eventSequence.push('error');
          eventSequence.push('retry');
          eventSequence.push('processing');
          eventSequence.push('success');
        }
      }
    }

    const tracker = new SequenceTracker();
    await tracker.operationWithEvents();

    expect(eventSequence).toEqual([
      'start',
      'processing',
      'error',
      'retry',
      'processing',
      'success'
    ]);
  });
});
```

### 4.4 Testing Async Event Streams

```typescript
describe('Async Event Stream Testing', () => {
  it('should handle async event emission', async () => {
    interface AsyncEventEmitter {
      on(event: string, handler: (data: any) => Promise<void>): void;
      emit(event: string, data: any): Promise<void>;
    }

    class AsyncEventEmitterImpl implements AsyncEventEmitter {
      private handlers: Map<string, Function[]> = new Map();

      on(event: string, handler: (data: any) => Promise<void>) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
      }

      async emit(event: string, data: any) {
        const handlers = this.handlers.get(event) || [];
        await Promise.all(handlers.map(handler => handler(data)));
      }
    }

    const emitter = new AsyncEventEmitterImpl();
    const handler1 = jest.fn().mockResolvedValue(undefined);
    const handler2 = jest.fn().mockResolvedValue(undefined);

    emitter.on('async-event', handler1);
    emitter.on('async-event', handler2);

    await emitter.emit('async-event', { id: 1 });

    expect(handler1).toHaveBeenCalledWith({ id: 1 });
    expect(handler2).toHaveBeenCalledWith({ id: 1 });
  });
});
```

### 4.5 Testing Event-Driven Retry Logic

```typescript
describe('Event-Driven Retry Testing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should emit retry events during retry loop', async () => {
    interface RetryEvents {
      'retry:attempt': { attempt: number; error: Error };
      'retry:success': { attempt: number; result: any };
      'retry:failure': { attempts: number; error: Error };
    }

    class EventDrivenRetry {
      private listeners: Map<keyof RetryEvents, Function[]> = new Map();

      on<K extends keyof RetryEvents>(
        event: K,
        callback: (data: RetryEvents[K]) => void
      ) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
      }

      private emit<K extends keyof RetryEvents>(
        event: K,
        data: RetryEvents[K]
      ) {
        this.listeners.get(event)?.forEach(callback => callback(data));
      }

      async executeWithRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number,
        delay: number
      ): Promise<T> {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const result = await operation();
            this.emit('retry:success', { attempt: i + 1, result });
            return result;
          } catch (error) {
            this.emit('retry:attempt', {
              attempt: i + 1,
              error: error as Error
            });

            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        const finalError = new Error('Max retries exceeded');
        this.emit('retry:failure', { attempts: maxRetries, error: finalError });
        throw finalError;
      }
    }

    const retryManager = new EventDrivenRetry();
    const attemptEvents: any[] = [];
    const successEvents: any[] = [];

    retryManager.on('retry:attempt', event => attemptEvents.push(event));
    retryManager.on('retry:success', event => successEvents.push(event));

    let attemptCount = 0;
    const flakyOperation = () => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
      }
      return Promise.resolve('success');
    };

    const promise = retryManager.executeWithRetry(flakyOperation, 3, 1000);
    jest.advanceTimersByTime(2000);
    await promise;

    expect(attemptEvents).toHaveLength(2);
    expect(attemptEvents[0]).toMatchObject({
      attempt: 1,
      error: { message: 'Attempt 1 failed' }
    });

    expect(successEvents).toHaveLength(1);
    expect(successEvents[0]).toMatchObject({
      attempt: 3,
      result: 'success'
    });
  });
});
```

---

## 5. Common Gotchas

### 5.1 Timer-Related Gotchas

```typescript
describe('Timer Gotchas', () => {
  it('GOTCHA: Not advancing time enough', () => {
    jest.useFakeTimers();

    const callback = jest.fn();
    setTimeout(callback, 1000);

    // WRONG: Only advances 500ms
    jest.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled(); // Still not called!

    // CORRECT: Advance full duration
    jest.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('GOTCHA: Forgetting to await promises after advancing time', async () => {
    jest.useFakeTimers();

    let resolved = false;
    const promise = new Promise(resolve => {
      setTimeout(() => {
        resolved = true;
        resolve('done');
      }, 1000);
    });

    jest.advanceTimersByTime(1000);

    // WRONG: Not awaiting the promise
    expect(resolved).toBe(false); // Still false!

    // CORRECT: Wait for promise to resolve
    await promise;
    expect(resolved).toBe(true);

    jest.useRealTimers();
  });

  it('GOTCHA: Mixing fake timers with async operations', async () => {
    jest.useFakeTimers();

    const callback = jest.fn();

    // Create promise that resolves after timeout
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      callback();
    };

    const promise = operation();

    // WRONG: Just advancing time
    jest.advanceTimersByTime(1000);
    // Promise callbacks haven't run yet!

    // CORRECT: Advance time AND await promises
    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Let microtasks run
    await promise;
    expect(callback).toHaveBeenCalled();

    jest.useRealTimers();
  });
});
```

### 5.2 Decorator-Related Gotchas

```typescript
describe('Decorator Gotchas', () => {
  it('GOTCHA: Decorator execution order', () => {
    const executionOrder: string[] = [];

    function Decorator1() {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        executionOrder.push('Decorator1');
        return descriptor;
      };
    }

    function Decorator2() {
      return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        executionOrder.push('Decorator2');
        return descriptor;
      };
    }

    class TestClass {
      @Decorator1()
      @Decorator2()
      method() {}
    }

    // Decorators are applied bottom-to-top during class definition
    expect(executionOrder).toEqual(['Decorator2', 'Decorator1']);
  });

  it('GOTCHA: Not returning descriptor', () => {
    function BrokenDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      // WRONG: Not returning descriptor
      descriptor.value = function () {
        return 'broken';
      };
    }

    function CorrectDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      // CORRECT: Return the modified descriptor
      descriptor.value = function () {
        return 'correct';
      };
      return descriptor;
    }

    class BrokenClass {
      @BrokenDecorator
      method() {
        return 'original';
      }
    }

    class CorrectClass {
      @CorrectDecorator
      method() {
        return 'original';
      }
    }

    // Broken decorator may not work as expected
    // Correct decorator properly modifies behavior
  });

  it('GOTCHA: Losing `this` context', () => {
    function TimeoutDecorator(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      descriptor.value = async function (...args: any[]) {
        // WRONG: Arrow function loses `this` context
        setTimeout(() => {
          // `this` is not the class instance here!
        }, 1000);

        // CORRECT: Preserve context
        setTimeout(() => {
          originalMethod.apply(this, args);
        }, 1000);

        return originalMethod.apply(this, args);
      };
      return descriptor;
    }
  });
});
```

### 5.3 Retry Logic Gotchas

```typescript
describe('Retry Logic Gotchas', () => {
  it('GOTCHA: Not clearing previous timeout', async () => {
    jest.useFakeTimers();

    let timeoutId: NodeJS.Timeout;
    const delays: number[] = [];

    const retryWithTimeout = async () => {
      // WRONG: Not clearing previous timeout
      timeoutId = setTimeout(() => {
        delays.push(1000);
      }, 1000);

      timeoutId = setTimeout(() => {
        delays.push(2000);
      }, 2000);
    };

    await retryWithTimeout();

    jest.advanceTimersByTime(2000);

    // Both timeouts ran!
    expect(delays).toEqual([1000, 2000]);

    // CORRECT: Clear previous timeout
    const correctRetry = async () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        delays.push(1000);
      }, 1000);
    };

    jest.useRealTimers();
  });

  it('GOTCHA: Race conditions in retry loop', async () => {
    let inProgress = false;

    const retryOperation = async (maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        // WRONG: No guard against concurrent calls
        if (!inProgress) {
          inProgress = true;
          try {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'success';
          } finally {
            inProgress = false;
          }
        }
      }
    };

    // CORRECT: Use a mutex or lock
    let lock = Promise.resolve();

    const safeRetry = async (maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        await lock;
        lock = (async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'success';
          } finally {
            lock = Promise.resolve();
          }
        })();
        await lock;
      }
    };
  });
});
```

### 5.4 Event Testing Gotchas

```typescript
describe('Event Testing Gotchas', () => {
  it('GOTCHA: Event listener not being removed', () => {
    const listeners: Function[] = [];
    let callCount = 0;

    const on = (callback: Function) => {
      listeners.push(callback);
    };

    const emit = () => {
      listeners.forEach(cb => cb());
    };

    const handler = () => {
      callCount++;
      // WRONG: Trying to remove during iteration
      // This won't work as expected!
    };

    on(handler);
    emit();
    emit();

    expect(callCount).toBe(2); // Both calls happened
  });

  it('GOTCHA: Async event handlers not awaited', async () => {
    const events: any[] = [];

    class EventEmitter {
      on(event: string, handler: Function) {
        // Store handler
      }

      emit(event: string, data: any) {
        // WRONG: Not awaiting async handlers
        // handlers.forEach(h => h(data));
      }
    }

    // CORRECT: Await all handlers
    class CorrectEventEmitter {
      private handlers: Map<string, Function[]> = new Map();

      on(event: string, handler: Function) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
      }

      async emit(event: string, data: any) {
        const handlers = this.handlers.get(event) || [];
        await Promise.all(handlers.map(h => h(data)));
      }
    }
  });
});
```

---

## 6. Best Practices

### 6.1 Timer Mocking Best Practices

```typescript
describe('Timer Mocking Best Practices', () => {
  // ALWAYS: Use beforeEach/afterEach for timer setup
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('BEST PRACTICE: Test exact time scenarios', () => {
    const callback = jest.fn();

    setTimeout(callback, 1000);
    setTimeout(callback, 2000);

    // Test intermediate state
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Test final state
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('BEST PRACTICE: Combine fake timers with async/await', async () => {
    let result = '';

    const asyncOperation = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = 'done';
    };

    const promise = asyncOperation();
    jest.advanceTimersByTime(1000);
    await promise; // Wait for promise microtasks

    expect(result).toBe('done');
  });

  it('BEST PRACTICE: Clear timers between tests', () => {
    const callback = jest.fn();
    const timeoutId = setTimeout(callback, 1000);

    // Clear specific timer
    clearTimeout(timeoutId);
    jest.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();

    // Or clear all timers
    jest.clearAllTimers();
  });
});
```

### 6.2 Decorator Testing Best Practices

```typescript
describe('Decorator Testing Best Practices', () => {
  it('BEST PRACTICE: Test decorator in isolation', () => {
    // Create test class specifically for decorator
    @TestDecorator
    class TestDecoratorClass {
      method() {
        return 'result';
      }
    }

    const instance = new TestDecoratorClass();
    expect(instance.method()).toBe('result');
  });

  it('BEST PRACTICE: Test both success and failure paths', () => {
    class RetryTest {
      @Retry(3, 100)
      async flakyMethod(shouldFail: boolean) {
        if (shouldFail) {
          throw new Error('Failed');
        }
        return 'success';
      }
    }

    const instance = new RetryTest();

    // Test success
    expect(instance.flakyMethod(false)).resolves.toBe('success');

    // Test failure after retries
    expect(instance.flakyMethod(true)).rejects.toThrow('Failed');
  });

  it('BEST PRACTICE: Verify decorator preserves original method signature', () => {
    class OriginalMethod {
      @Log
      complexMethod(a: number, b: string, c?: boolean): number {
        return a;
      }
    }

    const instance = new OriginalMethod();

    // Decorator should preserve type signature
    const result: number = instance.complexMethod(1, 'test', true);
    expect(result).toBe(1);
  });
});
```

### 6.3 Retry Logic Best Practices

```typescript
describe('Retry Logic Best Practices', () => {
  it('BEST PRACTICE: Test with realistic failure scenarios', () => {
    const mockApi = {
      fetchData: jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: 'success' })
    };

    // Test realistic retry sequence
    const result = retryOperation(() => mockApi.fetchData(), 3);
    expect(result).resolves.toEqual({ data: 'success' });
    expect(mockApi.fetchData).toHaveBeenCalledTimes(3);
  });

  it('BEST PRACTICE: Test retry with different error types', () => {
    class RetryableError extends Error {}
    class NonRetryableError extends Error {}

    const operation = jest.fn()
      .mockRejectedValueOnce(new RetryableError('Retry me'))
      .mockRejectedValueOnce(new NonRetryableError('Do not retry'));

    const retryWithFilter = async (
      operation: () => Promise<any>,
      isRetryable: (error: Error) => boolean
    ) => {
      let lastError: Error;
      for (let i = 0; i < 3; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          if (!isRetryable(lastError)) throw lastError;
        }
      }
      throw lastError;
    };

    // Should stop at non-retryable error
    expect(
      retryWithFilter(operation, (e) => e instanceof RetryableError)
    ).rejects.toThrow('Do not retry');
  });

  it('BEST PRACTICE: Test retry cancellation', async () => {
    let shouldCancel = false;
    let attemptCount = 0;

    const cancellableRetry = async () => {
      while (attemptCount < 5) {
        if (shouldCancel) {
          throw new Error('Cancelled');
        }
        attemptCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    // Start retry
    const promise = cancellableRetry();

    // Advance some time
    jest.advanceTimersByTime(200);

    // Trigger cancellation
    shouldCancel = true;
    jest.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow('Cancelled');
    expect(attemptCount).toBeLessThan(5);
  });
});
```

### 6.4 Event Testing Best Practices

```typescript
describe('Event Testing Best Practices', () => {
  it('BEST PRACTICE: Use spies for event verification', () => {
    const eventSpy = {
      callback: jest.fn()
    };

    const emitter = new EventEmitter();
    emitter.on('test-event', eventSpy.callback);

    emitter.emit('test-event', { data: 'test' });
    emitter.emit('test-event', { data: 'test2' });

    expect(eventSpy.callback).toHaveBeenCalledTimes(2);
    expect(eventSpy.callback).toHaveBeenNthCalledWith(1, { data: 'test' });
    expect(eventSpy.callback).toHaveBeenNthCalledWith(2, { data: 'test2' });
  });

  it('BEST PRACTICE: Test event ordering', () => {
    const events: string[] = [];

    class OrderedEmitter {
      emitSequential() {
        events.push('start');
        events.push('processing');
        events.push('end');
      }
    }

    const emitter = new OrderedEmitter();
    emitter.emitSequential();

    expect(events).toEqual(['start', 'processing', 'end']);
  });

  it('BEST PRACTICE: Clean up event listeners', () => {
    const emitter = new EventEmitter();
    const handler = jest.fn();

    const subscription = emitter.on('event', handler);

    emitter.emit('event', 'data1');
    expect(handler).toHaveBeenCalledTimes(1);

    // Clean up
    subscription.unsubscribe();

    emitter.emit('event', 'data2');
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('BEST PRACTICE: Test event payload validation', () => {
    interface TypedEvent {
      id: number;
      timestamp: number;
      data: {
        value: string;
        count: number;
      };
    }

    const validator = (event: TypedEvent) => {
      expect(event.id).toBeGreaterThan(0);
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.data.value).toBeDefined();
      expect(event.data.count).toBeGreaterThanOrEqual(0);
    };

    const emitter = new TypedEventEmitter();
    emitter.on('typed-event', validator);

    emitter.emit('typed-event', {
      id: 1,
      timestamp: Date.now(),
      data: { value: 'test', count: 5 }
    });
  });
});
```

---

## Official Documentation URLs

### Jest Timer Mocks
- **Jest Fake Timers**: https://jestjs.io/docs/timer-mocks
- **Jest Timer APIs**: https://jestjs.io/docs/jest-object#jestadvancestimersbytimems
- **Jest Async Testing**: https://jestjs.io/docs/asynchronous

### TypeScript Decorators
- **TypeScript Decorators**: https://www.typescriptlang.org/docs/handbook/decorators.html
- **MDN Decorators Proposal**: https://github.com/tc39/proposal-decorators

### Testing Patterns
- **Jest Best Practices**: https://jestjs.io/docs/tutorial-react
- **Testing Async Code**: https://jestjs.io/docs/asynchronous

---

## Summary

### Key Takeaways

1. **Timer Mocks**: Always use `jest.useFakeTimers()` in `beforeEach` and restore with `jest.useRealTimers()` in `afterEach`. Remember to combine with `await` for promise resolution.

2. **Decorator Testing**: Create dedicated test classes, test both success/failure paths, and verify that decorators preserve original method signatures.

3. **Retry Logic**: Test realistic failure scenarios, implement retry filters for different error types, and verify retry counts and delays.

4. **Event Testing**: Use jest spies for event capture, test event ordering, implement proper cleanup, and validate event payloads.

5. **Common Pitfalls**: Watch for timer advancement amounts, preserve `this` context in decorators, handle race conditions in retry loops, and properly await async event handlers.

# Research: Testing Workflow Error State Capture and Error Handling in TypeScript/JavaScript

## Executive Summary

This document compiles external best practices for testing error state capture and error handling in workflow/orchestration systems using TypeScript and JavaScript. The research was conducted in January 2026 and includes current best practices, code examples, and authoritative sources.

---

## 1. Testing Error State in Workflow/Orchestration Systems

### Key Sources:

- **[Temporal TypeScript SDK - Failure Detection](https://docs.temporal.io/develop/typescript/failure-detection)** - Comprehensive guide on handling failures in workflows
- **[Temporal TypeScript SDK - Observability](https://docs.temporal.io/develop/typescript/observability)** - Workflow state observability patterns
- **[Workflow Orchestration: Building Complex AI Pipelines](https://medium.com/@omark.k.aly/workflow-orchestration-building-complex-ai-pipelines-c8504ab8306f)** - Error handling patterns including retry with back-off and persistent state

### Best Practices:

1. **Separate Activity Failures from Workflow Failures**
   - Activities should never directly cause workflow failure
   - Workflows should only fail when explicitly raising an `ApplicationFailure`
   - This allows for proper state capture before workflow termination

2. **Use ApplicationFailure for Intentional Failures**
   ```typescript
   // From Temporal docs
   throw ApplicationFailure.create({
     message: `Invalid charge amount: ${chargeAmount} (must be above zero)`,
     type: 'InvalidChargeError',
     nonRetryable: true
   });
   ```

3. **Capture State at Failure Points**
   - Use heartbeat details to capture activity progress
   - Store checkpoint data for potential recovery
   - Include context about what operations were in progress

---

## 2. Testing Error Objects with Custom Properties

### Key Sources:

- **[TypeScript Error Type Handling in Try-Catch Blocks - Convex](https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-catch-error-type)** - Comprehensive guide to custom error types
- **[Handling errors like a pro in TypeScript - Udacity Engineering](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)** - Production-tested custom error patterns
- **[StackOverflow: Add properties to JavaScript Error object](https://stackoverflow.com/questions/47248741/add-properties-to-javascript-error-object)** - Community best practices
- **[ts-custom-error npm package](https://www.npmjs.com/package/ts-custom-error)** - Library for creating custom errors

### Best Practices:

1. **Define Specific Error Types**
   ```typescript
   // From Convex guide
   interface NetworkError extends Error {
     statusCode: number;
   }

   class NetworkErrorClass extends Error {
     statusCode: number;

     constructor(message: string, statusCode: number) {
       super(message);
       this.statusCode = statusCode;
       // Important: Set the prototype explicitly
       Object.setPrototypeOf(this, NetworkErrorClass.prototype);
     }
   }
   ```

2. **Use Type Guards for Safe Error Checking**
   ```typescript
   function isNetworkError(error: unknown): error is NetworkErrorClass {
     return error instanceof NetworkErrorClass;
   }

   try {
     // code that might throw
   } catch (error: unknown) {
     if (isNetworkError(error)) {
       console.log(`Network error with status code ${error.statusCode}`);
     } else {
       console.log('Unknown error');
     }
   }
   ```

3. **Create Domain-Specific Error Base Classes**
   ```typescript
   // From Udacity Engineering
   abstract class ErrorBase<TName extends string> extends Error {
     readonly name: TName;
     readonly context?: Record<string, unknown>;

     constructor(name: TName, message: string, context?: Record<string, unknown>) {
       super(message);
       this.name = name;
       this.context = context;
       Object.setPrototypeOf(this, ErrorBase.prototype);
     }
   }

   // Usage
   class WorkflowError extends ErrorBase<'WORKFLOW_FAILED' | 'STATE_INVALID'> {
     constructor(name, message, state?: Record<string, unknown>) {
       super(name, message, { state });
     }
   }
   ```

4. **Test Custom Error Properties**
   ```typescript
   describe('CustomError', () => {
     it('should capture state in error context', () => {
       const state = { step: 'processing', data: { id: 123 } };
       const error = new WorkflowError('WORKFLOW_FAILED', 'Process failed', state);

       expect(error.name).toBe('WORKFLOW_FAILED');
       expect(error.context).toEqual(state);
       expect(error.context?.step).toBe('processing');
     });

     it('should be identifiable by type guard', () => {
       const error = new WorkflowError('STATE_INVALID', 'Invalid state');
       const isWorkflowError = error instanceof WorkflowError;

       expect(isWorkflowError).toBe(true);
       expect(error.name).toBe('STATE_INVALID');
     });
   });
   ```

---

## 3. Patterns for Testing Async Error Handling in Workflows

### Key Sources:

- **[The best way to handle errors in asynchronous JavaScript](https://medium.com/@m-mdy-m/the-best-way-to-handle-errors-in-asynchronous-javascript-16ce57a877d4)** - Async error patterns
- **[No more Try/Catch: a better way to handle errors in TypeScript](https://dev.to/noah-00/no-more-trycatch-a-better-way-to-handle-errors-in-typescript-5hbd)** - Alternative patterns (with community discussion)
- **[Error Handling in Workflows - Medusa Documentation](https://docs.medusajs.com/learn/fundamentals/workflows/errors)** - Workflow-specific error handling

### Best Practices:

1. **Use Result Types for Async Operations**
   ```typescript
   type Result<T, E = Error> =
     | { success: true; data: T }
     | { success: false; error: E };

   async function wrapAsync<T>(
     promise: Promise<T>
   ): Promise<Result<T>> {
     try {
       const data = await promise;
       return { success: true, data };
     } catch (error) {
       return { success: false, error: error as Error };
     }
   }

   // Test
   describe('async error handling', () => {
     it('should capture errors in Result type', async () => {
       const failingPromise = Promise.reject(new Error('Failed'));
       const result = await wrapAsync(failingPromise);

       if (!result.success) {
         expect(result.error.message).toBe('Failed');
       }
     });
   });
   ```

2. **Test Async Error State Transitions**
   ```typescript
   describe('workflow error state', () => {
     it('should capture state when workflow fails', async () => {
       const workflow = new Workflow();

       // Start workflow
       await workflow.start();

       // Capture initial state
       const initialState = workflow.getState();

       // Trigger error
       await expect(workflow.executeStep('failing-step'))
         .rejects.toThrow('Step failed');

       // Verify error state was captured
       const errorState = workflow.getState();
       expect(errorState.error).toBeDefined();
       expect(errorState.error?.step).toBe('failing-step');
       expect(errorState.error?.previousState).toEqual(initialState);
     });
   });
   ```

3. **Use Promise.allSettled for Parallel Operations**
   ```typescript
   // From dev.to article comments
   async () => {
     const myPromise = () => new Promise((resolve, reject) => {
       setTimeout(() => {
         resolve('Hello, world!');
       }, 1000);
     });

     const [result] = await Promise.allSettled([myPromise()]);

     if (result.status === 'rejected') {
       console.error('Error:', result.reason);
     }

     return result.status === 'fulfilled' ? result.value : undefined;
   };
   ```

---

## 4. Testing Decorator-Based State Capture

### Key Sources:

- **[Simplify Error Handling with TypeScript Decorators](https://stordahl.dev/writing/error-handling-decorators)** - Practical decorator pattern examples
- **[The power of TypeScript decorators: real cases](https://medium.com/@an.chmelev/the-power-of-typescript-decorators-real-cases-decorating-class-methods-c1496fed8a7)** - Real-world decorator use cases
- **[valjic1/catch-decorator-ts](https://github.com/valjic1/catch-decorator-ts)** - Library for exception handling decorators

### Best Practices:

1. **Use Decorator Factories for Error Handling**
   ```typescript
   // From stordahl.dev
   function wrapMethodFactory<
     This,
     Args extends unknown[],
     Return,
     Fn extends (this: This, ...args: Args) => Return
   >(callback: (error: Error) => void) {
     return function wrapMethod(
       target: Fn,
       context: ClassMethodDecoratorContext<This, Fn>
     ): (this: This, ...args: Args) => unknown {
       return function replacementMethod(this: This, ...args: Args): Return | Promise<void> | void {
         try {
           return target.call(this, ...args);
         } catch (error) {
           callback(error as Error);
         }
       };
     };
   }

   function myCallback(error: Error) {
     console.error(error);
   }

   class ExampleClass {
     @wrapMethodFactory(myCallback)
     add(a: number, b: number): number {
       return a + b;
     }
   }
   ```

2. **Decorators That Capture State**
   ```typescript
   function withErrorStateCapture<
     This,
     Args extends unknown[],
     Return,
     Fn extends (this: This, ...args: Args) => Return
   >(
     target: Fn,
     context: ClassMethodDecoratorContext<This, Fn>
   ) {
     return function replacementMethod(this: This, ...args: Args): Return | Promise<void> | void {
       const result = target.call(this, ...args);

       // Handle both sync and async
       if (result instanceof Promise) {
         return result.catch((error: Error) => {
           // Capture current state
           const currentState = (this as any).getState();

           // Augment error with state
           (error as any).state = {
             captured: currentState,
             method: String(context.name),
             timestamp: new Date().toISOString()
           };

           throw error;
         });
       }

       return result;
     };
   }

   // Test decorator
   describe('withErrorStateCapture', () => {
     it('should capture state when method fails', async () => {
       class TestWorkflow {
         private state = { step: 'initial', data: {} };

         getState() {
           return { ...this.state };
         }

         @withErrorStateCapture
         async failingMethod() {
           this.state.step = 'processing';
           throw new Error('Method failed');
         }
       }

       const workflow = new TestWorkflow();

       await expect(workflow.failingMethod()).rejects.toThrow('Method failed');

       // Verify state was captured
       try {
         await workflow.failingMethod();
       } catch (error: any) {
         expect(error.state).toBeDefined();
         expect(error.state.captured.step).toBe('processing');
         expect(error.state.method).toBe('failingMethod');
       }
     });
   });
   ```

3. **Test Decorators Independently**
   ```typescript
   describe('error handling decorator', () => {
     let errorCallback: jest.Mock;

     beforeEach(() => {
       errorCallback = jest.fn();
     });

     it('should call error callback on sync error', () => {
       class TestClass {
         @wrapMethodFactory(errorCallback)
         methodThatFails() {
           throw new Error('Sync error');
         }
       }

       const instance = new TestClass();
       instance.methodThatFails();

       expect(errorCallback).toHaveBeenCalledWith(
         expect.objectContaining({ message: 'Sync error' })
       );
     });

     it('should call error callback on async error', async () => {
       class TestClass {
         @wrapMethodFactory(errorCallback)
         async asyncMethodThatFails() {
           throw new Error('Async error');
         }
       }

       const instance = new TestClass();
       await instance.asyncMethodThatFails();

       expect(errorCallback).toHaveBeenCalledWith(
         expect.objectContaining({ message: 'Async error' })
       );
     });
   });
   ```

---

## 5. Observability and Error Metadata Capture

### Key Sources:

- **[Workflow Observability: Finding and Resolving Failures Fast](https://www.prefect.io/blog/workflow-observability-finding-and-resolving-failures-fast)** - Observability best practices for workflows
- **[Node.js Error Handling: Techniques & Best Practices](https://www.site24x7.com/learn/nodejs-error-handling-guide.html)** - Error context capture patterns
- **[Data Workflow Orchestration: Core Concepts and Practical Guide](https://www.advsyscon.com/blog/data-workflow-orchestration/)** - Real-time monitoring and logging

### Best Practices:

1. **Capture Comprehensive Error Context**
   ```typescript
   interface ErrorContext {
     // Basic error info
     message: string;
     stack?: string;
     code?: string;

     // Workflow state
     workflowId?: string;
     step?: string;
     state?: Record<string, unknown>;

     // Request context
     requestId?: string;
     userId?: string;
     correlationId?: string;

     // System state
     timestamp: string;
     environment: string;
     memoryUsage?: NodeJS.MemoryUsage;
   }

   function captureErrorContext(error: Error, additionalContext?: Partial<ErrorContext>): ErrorContext {
     return {
       message: error.message,
       stack: error.stack,
       timestamp: new Date().toISOString(),
       environment: process.env.NODE_ENV || 'unknown',
       memoryUsage: process.memoryUsage(),
       ...additionalContext
     };
   }
   ```

2. **Test Error Context Capture**
   ```typescript
   describe('error context capture', () => {
     it('should capture complete error context', () => {
       const originalError = new Error('Test error');

       const context = captureErrorContext(originalError, {
         workflowId: 'wf-123',
         step: 'processing',
         state: { data: 'test' }
       });

       expect(context).toMatchObject({
         message: 'Test error',
         workflowId: 'wf-123',
         step: 'processing',
         state: { data: 'test' },
         timestamp: expect.any(String),
         environment: expect.any(String)
       });

       expect(context.stack).toBeDefined();
       expect(context.memoryUsage).toBeDefined();
     });
   });
   ```

3. **Use Structured Logging for Errors**
   ```typescript
   interface Logger {
     error(message: string, meta: Record<string, unknown>): void;
   }

   function logWorkflowError(logger: Logger, error: Error, workflowState: Record<string, unknown>) {
     logger.error('Workflow error', {
       error: {
         name: error.name,
         message: error.message,
         stack: error.stack
       },
       workflow: {
         id: workflowState.id,
         step: workflowState.currentStep,
         state: workflowState
       },
       system: {
        timestamp: new Date().toISOString(),
         pid: process.pid
       }
     });
   }

   // Test
   describe('structured error logging', () => {
     it('should log error with workflow context', () => {
       const logger = { error: jest.fn() };
       const error = new Error('Workflow failed');
       const state = { id: 'wf-123', currentStep: 'step-1', data: {} };

       logWorkflowError(logger, error, state);

       expect(logger.error).toHaveBeenCalledWith(
         'Workflow error',
         expect.objectContaining({
           error: expect.objectContaining({
             name: 'Error',
             message: 'Workflow failed'
           }),
           workflow: expect.objectContaining({
             id: 'wf-123',
             step: 'step-1'
           })
         })
       );
     });
   });
   ```

---

## 6. Common Pitfalls to Avoid

### From Community Sources:

1. **Don't Use `any` for Error Types**
   - Source: [Convex TypeScript Guide](https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-catch-error-type)
   - Use `unknown` instead and narrow with type guards

2. **Don't Ignore Error State in Tests**
   - Tests should verify not just that an error was thrown, but what state was captured
   - Missing state can make debugging production issues nearly impossible

3. **Don't Mix Sync and Async Error Handling**
   - Source: [dev.to discussion](https://dev.to/noah-00/no-more-trycatch-a-better-way-to-handle-errors-in-typescript-5hbd)
   - Be consistent in your error handling patterns

4. **Don't Forget to Set Prototype for Custom Errors**
   - Source: Multiple sources
   - Always use `Object.setPrototypeOf(this, CustomError.prototype)` in constructors

5. **Don't Lose Context When Re-throwing**
   ```typescript
   // Bad
   try {
     await operation();
   } catch (error) {
     throw new Error('Operation failed'); // Loses original error
   }

   // Good
   try {
     await operation();
   } catch (error) {
     const newError = new Error('Operation failed');
     (newError as any).cause = error; // Preserve original error
     (newError as any).context = { state: currentState };
     throw newError;
   }
   ```

6. **Don't Test Error Messages, Test Error Types**
   ```typescript
   // Bad - brittle
   expect(error.message).toBe('Something went wrong');

   // Good - resilient
   expect(error).toBeInstanceOf(WorkflowError);
   expect(error.name).toBe('WORKFLOW_FAILED');
   ```

---

## 7. Testing Checklist

Based on the research, here's a checklist for testing workflow error state capture:

- [ ] Error objects contain custom properties (state, context, metadata)
- [ ] Custom error types are properly identified (instanceof checks)
- [ ] Type guards correctly narrow error types
- [ ] Async errors are captured and typed correctly
- [ ] Error state is captured at failure points
- [ ] Decorators capture state when errors occur
- [ ] Error context includes workflow state (step, data, id)
- [ ] Error context includes system state (timestamp, environment)
- [ ] Stack traces are preserved
- [ ] Original errors are preserved when wrapping
- [ ] Errors are logged with structured data
- [ ] Tests verify error properties, not just messages
- [ ] Both sync and async error paths are tested
- [ ] Error state is serializable (for logging/transmission)

---

## 8. Recommended Testing Libraries

Based on the research:

- **Jest** - Standard testing framework with good error matching
- **ts-custom-error** - For creating custom errors that work well with TypeScript
- **fp-ts** - For Result/Either patterns if you prefer functional error handling
- **Temporal TypeScript SDK** - Reference implementation for workflow error handling

---

## Sources Summary

### Documentation & Guides:
1. [Temporal TypeScript SDK - Failure Detection](https://docs.temporal.io/develop/typescript/failure-detection)
2. [Temporal TypeScript SDK - Observability](https://docs.temporal.io/develop/typescript/observability)
3. [TypeScript Error Type Handling - Convex](https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-catch-error-type)
4. [Error Handling in Workflows - Medusa](https://docs.medusajs.com/learn/fundamentals/workflows/errors)

### Articles & Blog Posts:
5. [Simplify Error Handling with TypeScript Decorators](https://stordahl.dev/writing/error-handling-decorators)
6. [Handling errors like a pro in TypeScript - Udacity](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)
7. [No more Try/Catch: a better way to handle errors - DEV.to](https://dev.to/noah-00/no-more-trycatch-a-better-way-to-handle-errors-in-typescript-5hbd)
8. [Workflow Orchestration: Building Complex AI Pipelines](https://medium.com/@omark.k.aly/workflow-orchestration-building-complex-ai-pipelines-c8504ab8306f)
9. [Workflow Observability - Prefect](https://www.prefect.io/blog/workflow-observability-finding-and-resolving-failures-fast)
10. [Data Workflow Orchestration Guide](https://www.advsyscon.com/blog/data-workflow-orchestration/)
11. [Node.js Error Handling Guide](https://www.site24x7.com/learn/nodejs-error-handling-guide.html)

### Libraries & Tools:
12. [ts-custom-error npm package](https://www.npmjs.com/package/ts-custom-error)
13. [catch-decorator-ts GitHub](https://github.com/valjic1/catch-decorator-ts)
14. [temporalio/samples-typescript GitHub](https://github.com/temporalio/samples-typescript)
15. [hotmeshio/temporal-patterns-typescript GitHub](https://github.com/hotmeshio/temporal-patterns-typescript)

### Community Discussions:
16. [StackOverflow: Add properties to JavaScript Error object](https://stackoverflow.com/questions/47248741/add-properties-to-javascript-error-object)

---

*Research conducted: January 11, 2026*
*Last updated: January 11, 2026*

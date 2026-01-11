# TypeScript Error Handling Best Practices Research

## Executive Summary

This document compiles research findings on TypeScript error handling best practices, with specific focus on:
1. Error state capture patterns in async/try-catch contexts
2. Proper object state capture in error handlers
3. Error enrichment patterns in TypeScript
4. Common gotchas when using 'this' in catch blocks
5. WeakMap-based state capture considerations

---

## 1. Error State Capture Patterns in Async/Try-Catch Contexts

### Key Resources

1. **[A guide to async/await in TypeScript](https://blog.logrocket.com/async-await-typescript/)** - LogRocket Blog (Updated January 2025)
   - **Section: Error handling with try/catch**
   - **Section: Error handling using higher-order functions**
   - Comprehensive coverage of async/await error handling patterns

2. **[TypeScript Error Handling: Tips and Best Practices](https://hupp.tech/blog/typescript/typescript-error-handling-tips-and-best-practices/)** - Hupp Technologies (April 7, 2025)
   - **Section: Use try…catch Blocks Wisely**
   - Modern TypeScript error handling approaches

3. **[Control flow and error handling - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)** - MDN Web Docs
   - **Section: try...catch statements**
   - Official documentation on error handling constructs

### Best Practices for State Capture in Async Contexts

#### 1.1 Local Error Handling Pattern

```typescript
async function fetchData(url: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    // State is captured locally in the error handler
  }
}
```

**Key Principles:**
- Handle errors locally within the function where they occur
- Allow functions to fail gracefully without crashing the application
- Capture context-specific state in the catch block

#### 1.2 Higher-Order Function Pattern for State Capture

```typescript
// Wrapper function that preserves state context
function handleAsyncErrors<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  ...args: Parameters<T>
): Promise<ReturnType<T> | null> {
  try {
    return await asyncFn(...args);
  } catch (error) {
    console.error(`Error in ${asyncFn.name}:`, error);
    return null;
  }
}

// Usage preserves state context
const safeFetchEmployees = (url: string) => handleAsyncErrors(fetchEmployees, url);
```

**Benefits:**
- Centralizes error handling logic
- Preserves state context through closure
- Reduces code duplication
- Maintains type safety

#### 1.3 State Preservation in Sequential Operations

```typescript
const runAsyncFunctions = async () => {
  try {
    const employees = await fetchAllEmployees(baseApi);
    // State is preserved between operations
    Promise.all(
      employees.map(async user => {
        const userName = await fetchEmployee(userApi, user.id);
        const emails = generateEmail(userName.name);
        return emails;
      })
    );
  } catch (error) {
    console.log(error);
    // Error has access to all state in the try block's scope
  }
};
```

---

## 2. Object State Capture in Error Handlers

### Key Resources

1. **[Custom errors, extending Error](https://javascript.info/custom-errors)** - JavaScript.info
   - **Section: Extending Error**
   - **Section: Further inheritance**
   - Comprehensive guide on custom error classes with state

2. **[Error - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)** - MDN Web Docs
   - **Section: Custom error types**
   - **Section: Differentiate between similar errors**
   - Official documentation on error object patterns

### Best Practices for Capturing Object State

#### 2.1 Custom Error Classes with State

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class PropertyRequiredError extends ValidationError {
  constructor(property: string) {
    super("No property: " + property);
    this.name = 'PropertyRequiredError';
    this.property = property; // State captured in error object
  }
}

// Usage
try {
  if (!user.age) {
    throw new PropertyRequiredError("age"); // State captured at throw site
  }
} catch (err) {
  if (err instanceof PropertyRequiredError) {
    console.error("Invalid data:", err.message);
    console.error("Missing property:", err.property); // Access captured state
  }
}
```

#### 2.2 Error Enrichment with Context

```typescript
class ContextualError extends Error {
  public context: Record<string, any>;

  constructor(message: string, context: Record<string, any>) {
    super(message);
    this.name = 'ContextualError';
    this.context = context; // Capture arbitrary state
  }
}

// Usage
try {
  performOperation();
} catch (error) {
  throw new ContextualError('Operation failed', {
    originalError: error,
    userId: user.id,
    timestamp: Date.now(),
    operationState: { /* ... */ }
  });
}
```

#### 2.3 Using the 'cause' Property (Modern Approach)

```typescript
// Error cause chain
try {
  doFailSomeWay();
} catch (err) {
  throw new Error("Failed in some way", { cause: err });
}

try {
  doFailAnotherWay();
} catch (err) {
  throw new Error("Failed in another way", { cause: err });
}

// Accessing the cause chain
try {
  doWork();
} catch (err) {
  switch (err.message) {
    case "Failed in some way":
      handleFailSomeWay(err.cause);
      break;
    case "Failed in another way":
      handleFailAnotherWay(err.cause);
      break;
  }
}
```

---

## 3. Error Enrichment Patterns in TypeScript

### Key Resources

1. **[Handling errors like a pro in TypeScript](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)** - Udacity Engineering
   - Focus on functional error handling with Result Pattern
   - Transform error handling from exceptions to predictable patterns

2. **[Error Handling in TypeScript: Best Practices](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)** - Medium
   - Custom error types and type-safe error objects
   - Safe and predictable error handling approaches

3. **[The 5 Commandments of Clean Error Handling in TypeScript](https://backstage.orus.eu/the-5-commandments-of-clean-error-handling-in-typescript/)**
   - Make sure Errors are Errors (extend Error class)
   - Don't lose your stack trace
   - Use constant error messages
   - Provide the right amount of context

### Error Enrichment Techniques

#### 3.1 Base Error Class Pattern

```typescript
class MyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name; // Automatic name assignment
  }
}

class ValidationError extends MyError {
  constructor(message: string) {
    super(message);
    // Name automatically set to 'ValidationError'
  }
}
```

#### 3.2 Wrapper Exception Pattern

```typescript
class ReadError extends Error {
  constructor(message: string, cause: Error) {
    super(message);
    this.cause = cause;
    this.name = 'ReadError';
  }
}

function readUser(json: string) {
  let user;

  try {
    user = JSON.parse(json);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ReadError("Syntax Error", err); // Wrap low-level error
    } else {
      throw err;
    }
  }

  try {
    validateUser(user);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new ReadError("Validation Error", err); // Wrap and enrich
    } else {
      throw err;
    }
  }
}
```

#### 3.3 Result Type Pattern (Functional Approach)

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

function performTask(): Result<number, string> {
  if (Math.random() > 0.5) {
    return { success: true, data: 42 };
  } else {
    return { success: false, error: 'Task failed' };
  }
}

// Usage
const result = performTask();
if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

#### 3.4 Union Types for Error Responses

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: string };

function performTask(): Result<number> {
  if (Math.random() > 0.5) {
    return { success: true, data: 42 };
  } else {
    return { success: false, error: 'Task failed' };
  }
}

const result = performTask();
if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## 4. Common Gotchas with 'this' in Catch Blocks

### Key Resources

1. **[Can you bind 'this' in an arrow function?](https://stackoverflow.com/questions/33308121/can-you-bind-this-in-an-arrow-function)** - Stack Overflow
   - Cannot rebind `this` in an arrow function
   - Always defined as the context in which it was defined

2. **[Arrow function expressions - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)** - MDN Web Docs
   - **Section: Lexical this**
   - Arrow functions have semantic differences and deliberate limitations

3. **[Access "this" in a Promise's Catch Block](https://www.pluralsight.com/resources/blog/guides/access-this-in-a-promises-catch-block)** - Pluralsight
   - Using arrow functions to access `this` in catch blocks
   - Context preservation patterns

### Common Pitfalls and Solutions

#### 4.1 Traditional Function in Catch Block (Problematic)

```typescript
class MyClass {
  private value: number = 42;

  async methodWithError() {
    try {
      await someAsyncOperation();
    } catch (error) {
      // PROBLEM: 'this' may not be what you expect
      function handleError() {
        console.log(this.value); // undefined or wrong context
      }
      handleError();
    }
  }
}
```

#### 4.2 Arrow Function Solution (Lexical this)

```typescript
class MyClass {
  private value: number = 42;

  async methodWithError() {
    try {
      await someAsyncOperation();
    } catch (error) {
      // SOLUTION: Arrow function preserves lexical 'this'
      const handleError = () => {
        console.log(this.value); // 42 - correct context
      };
      handleError();
    }
  }
}
```

#### 4.3 Promise Catch with Arrow Function

```typescript
class MyClass {
  private data: string = "important";

  methodWithPromise() {
    Promise.resolve()
      .then(() => {
        console.log(this.data); // Works - arrow function preserves 'this'
      })
      .catch((error) => {
        console.error(error); // 'this' is still preserved
        console.log(this.data); // Works - arrow function in catch
      });
  }
}
```

#### 4.4 Manual Binding Alternative

```typescript
class MyClass {
  private value: number = 42;

  async methodWithError() {
    try {
      await someAsyncOperation();
    } catch (error) {
      // ALTERNATIVE: Manually bind 'this'
      function handleError(this: MyClass) {
        console.log(this.value); // 42 - explicit binding
      }
      handleError.call(this);
    }
  }
}
```

#### 4.5 Async Method Context Preservation

```typescript
class Service {
  private serviceName: string = "MyService";

  async execute() {
    try {
      await this riskyOperation();
    } catch (error) {
      // 'this' is preserved in async method catch blocks
      console.error(`Error in ${this.serviceName}:`, error);
      this.logError(error); // 'this' works correctly
    }
  }

  private async riskyOperation() {
    // ...
  }

  private logError(error: any) {
    // ...
  }
}
```

### Key Takeaways for 'this' in Error Handlers

1. **Arrow functions preserve lexical `this`** - They inherit `this` from their surrounding scope
2. **Traditional functions create new `this` context** - They have their own dynamic `this` binding
3. **Async methods preserve `this`** - The async/await pattern maintains class instance context
4. **Arrow functions cannot be rebound** - Using `.bind()`, `.call()`, or `.apply()` has no effect
5. **Prefer arrow functions in catch blocks** - When you need access to class instance state

---

## 5. WeakMap-Based State Capture Considerations

### Key Resources

1. **[WeakMap - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)** - MDN Web Docs
   - **Section: Description**
   - Keys must be objects (not primitives)
   - Holds weak references to keys
   - Allows garbage collection when keys are no longer referenced

2. **Gradual typing research papers** - WeakMap mentioned as primitive for ES6
   - Helps "sidestep problems" in gradual typing scenarios
   - Useful for handling type system limitations

### WeakMap Characteristics for State Capture

```typescript
// WeakMap for state capture
const observedState = new WeakMap<object, any>();

function captureState(obj: object, state: any) {
  observedState.set(obj, state);
}

function getObservedState(obj: object): any | undefined {
  return observedState.get(obj);
}
```

### Benefits of WeakMap for Error State Capture

1. **Automatic Memory Management**
   - Objects can be garbage collected when no longer referenced
   - Prevents memory leaks in long-running applications
   - Ideal for temporary error state associations

2. **Privacy**
   - WeakMap entries are not enumerable
   - Provides true private data storage
   - Cannot be accessed through reflection

3. **No Memory Leak Risk**
   - Unlike regular Map, WeakMap doesn't prevent garbage collection
   - Safe to use for associating error metadata with objects

### Common Use Cases

```typescript
// 1. Caching computed error state
const errorCache = new WeakMap<object, ErrorState>();

function getErrorState(obj: object): ErrorState {
  let state = errorCache.get(obj);
  if (!state) {
    state = computeErrorState(obj);
    errorCache.set(obj, state);
  }
  return state;
}

// 2. DOM node metadata storage
const nodeErrors = new WeakMap<Element, ErrorInfo>();

function trackNodeError(element: Element, error: Error) {
  nodeErrors.set(element, {
    message: error.message,
    timestamp: Date.now(),
    stack: error.stack
  });
}

// 3. Instance-private error data
class MyClass {
  private errors = new WeakMap<object, ErrorDetails>();

  addError(target: object, details: ErrorDetails) {
    this.errors.set(target, details);
  }
}
```

### Potential Gotchas

1. **Keys must be objects** - Primitives cannot be used as WeakMap keys
2. **No size property** - Cannot determine how many entries exist
3. **Not iterable** - Cannot use for...of or spread operator
4. **No clear() method** - Must manually remove entries
5. **Weak references** - Entries can disappear unexpectedly during garbage collection

### Best Practices for WeakMap in Error Handling

```typescript
// GOOD: WeakMap for temporary error state
class ErrorTracker {
  private state = new WeakMap<object, ErrorContext>();

  capture(obj: object, context: ErrorContext) {
    this.state.set(obj, context);
  }

  getError(obj: object): ErrorContext | undefined {
    return this.state.get(obj);
  }
}

// GOOD: Automatic cleanup when objects are garbage collected
const errorMetadata = new WeakMap<object, ErrorMetadata>();

function attachErrorMetadata(obj: object, metadata: ErrorMetadata) {
  // Metadata automatically cleaned up when obj is garbage collected
  errorMetadata.set(obj, metadata);
}

// AVOID: Using WeakMap when you need persistent state
// Use regular Map instead if state must persist
```

---

## 6. Production-Ready Error Handling Patterns

### Key Resources

1. **[TypeScript Error Handling: Tips and Best Practices](https://hupp.tech/blog/typescript/typescript-error-handling-tips-and-best-practices/)** - Hupp Technologies
   - **Section: Implement Centralized Error Handling**
   - **Section: Integrate Error Monitoring Tools**

### Centralized Error Handling

```typescript
// Express middleware example
import express, { Request, Response, NextFunction } from 'express';

const app = express();

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});
```

### Error Monitoring Integration

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({ dsn: 'your-dsn' });

try {
  // Risky operation
} catch (error) {
  Sentry.captureException(error);
  console.error('Error captured:', error);
}
```

### Exhaustive Error Handling with 'never'

```typescript
type AppError = ValidationError | SyntaxError;

function handleAppError(error: AppError): void {
  switch (error.name) {
    case 'ValidationError':
      console.error('Validation error:', error.message);
      break;
    case 'SyntaxError':
      console.error('Syntax error:', error.message);
      break;
    default:
      const exhaustiveCheck: never = error;
      throw new Error(`Unhandled error: ${exhaustiveCheck}`);
  }
}
```

---

## 7. Summary of Key Findings

### Error State Capture Patterns
- **Local error handling** in async functions preserves state context
- **Higher-order functions** provide centralized state preservation
- **Sequential operations** maintain state through try-catch scope
- **WeakMap** offers automatic cleanup for temporary error state

### Object State Capture Best Practices
- **Custom error classes** capture state at throw site
- **Error enrichment** via context properties and cause chains
- **Wrapper exceptions** transform low-level errors into high-level ones
- **Result types** provide functional alternative to exceptions

### 'this' Context in Catch Blocks
- **Arrow functions** preserve lexical `this` binding
- **Traditional functions** create new `this` context (gotcha!)
- **Async methods** maintain class instance context
- **Manual binding** available via `.call()` or `.apply()`

### WeakMap Considerations
- **Automatic garbage collection** prevents memory leaks
- **Object-only keys** restrict usage patterns
- **Non-enumerable** entries provide privacy
- **No iteration methods** limit debugging capabilities
- **Ideal for temporary error metadata** associations

### Modern TypeScript Patterns (2025)
- **Result/Either pattern** gaining popularity as alternative to try-catch
- **Union types** for explicit error handling
- **never type** for exhaustive error checking
- **Error cause property** for error chaining
- **Functional error handling** complementing traditional exceptions

---

## 8. Actionable Recommendations

1. **Use arrow functions in catch blocks** when you need access to class instance state
2. **Implement custom error classes** to capture context-specific state
3. **Consider WeakMap** for temporary error state that should be garbage collected
4. **Use the cause property** for error enrichment and chaining
5. **Implement centralized error handling** to reduce code duplication
6. **Integrate error monitoring** tools for production debugging
7. **Consider Result types** for functional error handling patterns
8. **Use never type** to ensure exhaustive error handling

---

## Sources

### Primary Documentation
- [Error - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [Control flow and error handling - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [Custom errors, extending Error - JavaScript.info](https://javascript.info/custom-errors)
- [Arrow function expressions - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)

### TypeScript-Specific Resources
- [TypeScript Error Handling: Tips and Best Practices - Hupp Technologies](https://hupp.tech/blog/typescript/typescript-error-handling-tips-and-best-practices/)
- [A guide to async/await in TypeScript - LogRocket Blog](https://blog.logrocket.com/async-await-typescript/)
- [How to use a try-catch block in TypeScript - Convex](https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-try-catch)

### Error Enrichment Patterns
- [Handling errors like a pro in TypeScript - Udacity Engineering](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)
- [Error Handling in TypeScript: Best Practices - Medium](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)
- [The 5 Commandments of Clean Error Handling in TypeScript](https://backstage.orus.eu/the-5-commandments-of-clean-error-handling-in-typescript/)

### 'this' Context Resources
- [Can you bind 'this' in an arrow function? - Stack Overflow](https://stackoverflow.com/questions/33308121/can-you-bind-this-in-an-arrow-function)
- [Access "this" in a Promise's Catch Block - Pluralsight](https://www.pluralsight.com/resources/blog/guides/access-this-in-a-promises-catch-block)
- [this - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)

### Modern Patterns (2024-2025)
- [I Stopped Using Try-Catch in TypeScript and You Should Too - UserJot](https://userjot.com/blog/typescript-error-handling-return-vs-throw)
- [No more Try/Catch: a better way to handle errors in TypeScript - Dev.to](https://dev.to/noah-00/no-more-trycatch-a-better-way-to-handle-errors-in-typescript-5hbd)
- [Async/Await and Error Handling - JavaScript Plain English](https://javascript.plainenglish.io/should-you-use-try-catch-with-async-await-let-me-clear-this-up-78a13aa10568)

---

*Research compiled on January 10, 2026*
*Focus: TypeScript error handling best practices for async contexts, state capture, and WeakMap usage*

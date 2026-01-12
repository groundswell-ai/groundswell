# TypeScript Best Practices for Array Handling in Error Objects

**Research Date:** 2025-01-11
**Researcher:** Claude Code Agent
**Purpose:** Comprehensive research on TypeScript patterns for array handling in error objects, specifically for P1M1T1S3 bug fix

---

## Table of Contents

1. [Spread Operator Best Practices](#1-spread-operator-best-practices)
2. [Type Assertion Patterns](#2-type-assertion-patterns)
3. [Array Mutation Prevention](#3-array-mutation-prevention)
4. [LogEntry and Error Object Patterns](#4-logentry-and-error-object-patterns)
5. [Relevant Documentation URLs](#5-relevant-documentation-urls)
6. [Code Examples and Patterns](#6-code-examples-and-patterns)

---

## 1. Spread Operator Best Practices

### Core Principles

The spread operator (`...`) creates **shallow copies** by default - it copies references to array elements, not the elements themselves. This is critical to understand when working with error objects containing arrays.

### Best Practices

#### ✅ For Primitive Arrays
```typescript
// Works perfectly for primitive values
const logs = ['error1', 'error2', 'error3'];
const errorCopy = { ...errorObject, logs: [...logs] };
```

#### ✅ For Object Arrays (Deep Copy)
```typescript
// Required for arrays containing objects
const logEntries = [
  { timestamp: Date.now(), message: 'error1' },
  { timestamp: Date.now(), message: 'error2' }
];
const errorCopy = {
  ...errorObject,
  logs: logEntries.map(entry => ({ ...entry }))
};
```

#### ✅ Immutable Updates
```typescript
// Add to array without mutation
const updatedError = {
  ...errorObject,
  logs: [...errorObject.logs, newLogEntry]
};

// Update specific index
const withUpdate = {
  ...errorObject,
  logs: [
    ...errorObject.logs.slice(0, index),
    updatedLog,
    ...errorObject.logs.slice(index + 1)
  ]
};
```

### Common Pitfalls

#### ❌ Assuming Deep Copy
```typescript
// DANGEROUS: Only creates shallow copy
const errorCopy = { ...errorObject };
// errorCopy.logs and errorObject.logs reference the SAME array
```

#### ❌ Mutation After Copy
```typescript
// DANGEROUS: Mutates shared array reference
const errorCopy = { ...errorObject };
errorCopy.logs.push(newLog); // Affects original errorObject too!
```

### Performance Considerations

- **Small arrays (<100 elements)**: Spread operator is perfectly fine
- **Large arrays (>1000 elements)**: Consider performance implications
- **Frequent operations**: Each spread creates a new array (memory allocation)

### Resources

- [Spread Operator | TypeScript Guide by Convex](https://www.convex.dev/typescript/advanced/advanced-concepts/typescript-spread-operator)
- [Spread syntax (...) - JavaScript - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [Unleashing the Power of JavaScript Spread Operator](https://kinsta.com/blog/spread-operator-javascript/)
- [JavaScript Spread Operator: Advanced Techniques and Best Practices](https://dev.to/hkp22/javascript-spread-operator-advanced-techniques-and-best-practices-5cbn)
- [Typescript spread deep copy with arrays - Stack Overflow](https://stackoverflow.com/questions/46969895/typescript-spread-deep-copy-with-arrays)
- [How to Copy Arrays of Objects vs. Arrays of Primitives in TypeScript](https://tevpro.com/how-to-copy-arrays-of-objects-arrays-of-primititives-in-typescript/)
- [Copying Arrays in TypeScript: Spread vs Deep Linking](https://iamguidozam.blog/2025/12/03/copying-arrays-in-typescript-spread-vs-deep-linking/)
- [Rest Parameters and Spread Syntax in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/rest-parameters-spread/)

---

## 2. Type Assertion Patterns

### Syntax Options

TypeScript provides two syntaxes for type assertions:

#### Option 1: `as` Syntax (Recommended)
```typescript
const logs = errorObject.logs as LogEntry[];
```

#### Option 2: Angle Bracket Syntax
```typescript
const logs = <LogEntry[]>errorObject.logs;
```

**Best Practice:** Prefer the `as` syntax - it's more readable and works better with JSX/TSX files.

### When to Use Type Assertions

#### ✅ Appropriate Use Cases

1. **DOM Manipulation**
   ```typescript
   const element = document.getElementById('error-container') as HTMLElement;
   ```

2. **JSON Parsing**
   ```typescript
   const data = JSON.parse(jsonString) as ErrorData;
   ```

3. **Known API Responses**
   ```typescript
   const response = await fetch('/api/errors') as Error[];
   ```

4. **Better Type Inference**
   ```typescript
   const logs = (errorObject.logs || []) as LogEntry[];
   ```

#### ❌ Avoid Type Assertions When

- You can use proper type inference
- Working with completely unknown data types
- A type guard would be safer
- The assertion might mask actual type errors

### Best Practices

#### 1. Use Type Guards Instead (When Possible)
```typescript
function isLogEntryArray(value: unknown): value is LogEntry[] {
  return Array.isArray(value) &&
         value.every(item => 'timestamp' in item && 'message' in item);
}

if (isLogEntryArray(errorObject.logs)) {
  // TypeScript now knows errorObject.logs is LogEntry[]
  errorObject.logs.forEach(log => console.log(log.message));
}
```

#### 2. Combine Assertions with Runtime Validation
```typescript
import z from 'zod';

const LogEntrySchema = z.object({
  timestamp: z.number(),
  message: z.string()
});

const logs = LogEntrySchema.array().parse(errorObject.logs);
```

#### 3. Use `as const` for Literal Types
```typescript
const errorConfig = {
  maxLogs: 100,
  level: 'error'
} as const;
// errorConfig.level is typed as 'error', not string
```

#### 4. Understand Compile-time vs Runtime
```typescript
const logs = errorObject.logs as LogEntry[];
// This is removed during compilation - no runtime check!
// If errorObject.logs is not actually LogEntry[], you get runtime errors
```

### Type Assertion Anti-patterns

#### ❌ Over-using Assertions
```typescript
// BAD: Defeats TypeScript's type checking
const data = someUnknownValue as any as ComplexType;
```

#### ❌ Asserting Without Validation
```typescript
// DANGEROUS: No runtime validation
const logs = externalApiResponse.logs as LogEntry[];
```

### Resources

- [Mastering Type Assertion in TypeScript: Unleashing the Power of Type Safety](https://dev.to/vjnvisakh/mastering-type-assertion-in-typescript-unleashing-the-power-of-type-safety-364h)
- [TypeScript Type Assertion: Syntax, Behavior, and Practical Examples](https://mimo.org/glossary/typescript/type-assertion)
- [Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript: Understanding Type Assertion - Abhishek Wadalkar](https://abhishekw.medium.com/typescript-understanding-type-assertion-c06be90e1ba1)
- [Type Assertions and Type Casting in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/type-assertions-casting/)
- [Type Assertion | TypeScript Guide by Convex](https://www.convex.dev/typescript/typescript-101/type-conversion-checking/typescript-type-assertion)
- [Type Assertion | TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/type-assertion)
- [Documentation - Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
- [Avoid using Type Assertions in TypeScript](https://www.allthingstypescript.dev/p/avoid-using-type-assertions-in-typescript)

---

## 3. Array Mutation Prevention

### TypeScript Compile-time Solutions

#### 1. `readonly` Modifier
```typescript
interface ErrorObject {
  readonly logs: readonly LogEntry[];
  readonly timestamp: number;
}

const error: ErrorObject = {
  logs: [],
  timestamp: Date.now()
};

// Compile-time error: Cannot assign to 'logs' because it is read-only
error.logs.push(newLog);
```

#### 2. `ReadonlyArray<T>` Type
```typescript
interface ErrorObject {
  logs: ReadonlyArray<LogEntry>;
}

// Prevents:
// - push(), pop(), splice()
// - direct index assignment
// - length modification
```

#### 3. `Readonly<T>` Utility Type
```typescript
interface ErrorObject {
  logs: LogEntry[];
  metadata: {
    count: number;
  };
}

type ImmutableError = Readonly<ErrorObject>;
// All properties become readonly
```

#### 4. Const Assertions
```typescript
const initialError = {
  logs: [],
  timestamp: Date.now()
} as const;

// Creates deep readonly type
```

### Runtime Solutions

#### 1. `Object.freeze()`
```typescript
const errorObject = {
  logs: [log1, log2],
  timestamp: Date.now()
};

Object.freeze(errorObject);
Object.freeze(errorObject.logs);

// Runtime errors in strict mode:
errorObject.logs.push(newLog); // TypeError: Cannot add property
```

#### 2. Deep Freeze Utility
```typescript
function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);

  if (Array.isArray(obj)) {
    obj.forEach(item => deepFreeze(item));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(item => deepFreeze(item));
  }

  return obj;
}

const immutableError = deepFreeze(errorObject);
```

### Linting Rules

#### ESLint/TypeScript Rules
```json
{
  "rules": {
    "@typescript-eslint/prefer-readonly": "error",
    "@typescript-eslint/no-mutating-methods": "error",
    "functional/immutable-data": "error",
    "functional/no-let": "error"
  }
}
```

#### TSLint Immutable Rules
```bash
npm install tslint-immutable --save-dev
```

### Best Practices for Error Objects

#### ✅ Always Copy Arrays in Error Objects
```typescript
function addLogToError(error: ErrorObject, log: LogEntry): ErrorObject {
  return {
    ...error,
    logs: [...error.logs, log]
  };
}
```

#### ✅ Use Immutable Methods
```typescript
// GOOD: Returns new array
const filtered = error.logs.filter(log => log.level === 'error');

// BAD: Mutates original
error.logs.splice(0, 1);
```

#### ✅ Combine readonly with Copying
```typescript
interface ErrorObject {
  readonly logs: ReadonlyArray<LogEntry>;
}

function createError(logs: LogEntry[]): ErrorObject {
  return {
    logs: [...logs] // Create copy, then make readonly
  };
}
```

### Anti-patterns to Avoid

#### ❌ Direct Mutation
```typescript
// DANGEROUS: Mutates shared state
function logError(error: ErrorObject, message: string) {
  error.logs.push({ timestamp: Date.now(), message });
}
```

#### ❌ Exposing Mutable References
```typescript
// DANGEROUS: Caller can mutate internal array
class ErrorCollector {
  private logs: LogEntry[] = [];

  getLogs(): LogEntry[] {
    return this.logs; // Returns mutable reference!
  }
}

// BETTER: Return copy or readonly version
getLogs(): ReadonlyArray<LogEntry> {
  return [...this.logs];
}
```

### Resources

- [How to prevent object/array mutation? - Stack Overflow](https://stackoverflow.com/questions/34840334/how-to-prevent-object-array-mutation)
- [Simple Rules for Avoiding Mutation in JavaScript](https://medium.com/@edekobifrank/simple-rules-for-avoiding-mutation-in-javascript-24a492ffeb44)
- [Stop mutating in map, reduce and forEach](https://dev.to/smeijer/stop-mutating-in-map-reduce-and-foreach-58bf)
- [TSLint Immutable - GitHub](https://github.com/jonaskello/tslint-immutable)
- [Understanding readonly in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/ts-readonly/)
- [Mutability - Total TypeScript](https://www.totaltypescript.com/books/total-typescript-essentials/mutability)
- [Immutability with Const Assertions](https://typescript.tv/course/06-immutability-with-const-assertions)
- [Using the readonly Modifier in TypeScript](https://www.convex.dev/typescript/advanced/utility-types-mapped-types/typescript-readonly)
- [Why you'll love Typescript's ReadonlyArray](https://itnext.io/why-youll-love-typescript-s-readonlyarray-9d7f09971e4a)
- [Readonly Arrays in TypeScript](https://typestronglab.in/tutorial/readonly-arrays)
- [Handling readonly in TypeScript vs JavaScript](https://gist.github.com/dfkaye/9789c41a7d438355d564a186dc87c1f0)
- [A brief introduction to "Data Immutability" in TypeScript](https://medium.com/jspoint/typescript-data-immutability-71dc3e604426)
- [Readonly | TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/readonly)

---

## 4. LogEntry and Error Object Patterns

### LogEntry Interface Patterns

#### Basic LogEntry Pattern
```typescript
interface LogEntry {
  timestamp: number;
  message: string;
  level?: 'info' | 'warn' | 'error';
  context?: Record<string, unknown>;
}
```

#### Enhanced LogEntry with Metadata
```typescript
interface LogEntry {
  timestamp: number;
  message: string;
  level: LogLevel;
  category: string;
  context?: Readonly<Record<string, unknown>>;
  stack?: string;
  userId?: string;
  requestId?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
```

### Error Object Patterns

#### Pattern 1: Simple Error Object
```typescript
interface ErrorObject {
  message: string;
  logs: ReadonlyArray<LogEntry>;
  timestamp: number;
}
```

#### Pattern 2: Hierarchical Error Object
```typescript
interface ErrorObject {
  id: string;
  type: ErrorType;
  message: string;
  logs: ReadonlyArray<LogEntry>;
  metadata: Readonly<ErrorMetadata>;
  cause?: ErrorObject;
  timestamp: number;
}

interface ErrorMetadata {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  environment: 'development' | 'staging' | 'production';
}

type ErrorType =
  | 'validation'
  | 'network'
  | 'runtime'
  | 'business'
  | 'unknown';
```

#### Pattern 3: Functional Error Result
```typescript
type Result<T, E extends ErrorObject> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchData(): Promise<Result<Data, ErrorObject>> {
  try {
    const data = await apiCall();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        id: generateId(),
        type: 'network',
        message: error.message,
        logs: [],
        metadata: {
          environment: 'production'
        },
        timestamp: Date.now()
      }
    };
  }
}
```

### Logging System Patterns

#### Pattern 1: Immutable Logger
```typescript
class Logger {
  private readonly logs: ReadonlyArray<LogEntry>;

  constructor(logs: LogEntry[] = []) {
    this.logs = Object.freeze([...logs]);
  }

  addLog(entry: LogEntry): Logger {
    return new Logger([...this.logs, entry]);
  }

  getLogs(): ReadonlyArray<LogEntry> {
    return this.logs;
  }

  filter(predicate: (log: LogEntry) => boolean): Logger {
    return new Logger(this.logs.filter(predicate));
  }
}
```

#### Pattern 2: Error Collector
```typescript
class ErrorCollector {
  private readonly errors: ReadonlyArray<ErrorObject>;

  constructor(errors: ErrorObject[] = []) {
    this.errors = Object.freeze([...errors]);
  }

  addError(error: ErrorObject): ErrorCollector {
    return new ErrorCollector([...this.errors, error]);
  }

  addLogToLastError(log: LogEntry): ErrorCollector {
    if (this.errors.length === 0) {
      return this;
    }

    const lastError = this.errors[this.errors.length - 1];
    const updatedLastError: ErrorObject = {
      ...lastError,
      logs: [...lastError.logs, log]
    };

    return new ErrorCollector([
      ...this.errors.slice(0, -1),
      updatedLastError
    ]);
  }
}
```

### Error Handling Best Practices

#### 1. Always Initialize Empty Arrays
```typescript
// GOOD: Safe default
function createError(message: string): ErrorObject {
  return {
    message,
    logs: [], // Always initialize
    timestamp: Date.now()
  };
}

// BAD: Undefined logs
interface BadErrorObject {
  message: string;
  logs?: LogEntry[]; // Optional leads to constant null checks
}
```

#### 2. Use Readonly for Public APIs
```typescript
class ErrorHandler {
  private logs: LogEntry[] = [];

  // Public API returns readonly
  getLogs(): ReadonlyArray<LogEntry> {
    return this.logs;
  }

  // Returns new instance
  withLog(log: LogEntry): ErrorHandler {
    const newInstance = new ErrorHandler();
    newInstance.logs = [...this.logs, log];
    return newInstance;
  }
}
```

#### 3. Type Guard Validation
```typescript
function isValidLogEntry(entry: unknown): entry is LogEntry {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'timestamp' in entry &&
    'message' in entry &&
    typeof (entry as LogEntry).timestamp === 'number' &&
    typeof (entry as LogEntry).message === 'string'
  );
}

function safeAddLog(error: ErrorObject, entry: unknown): ErrorObject {
  if (!isValidLogEntry(entry)) {
    return error;
  }

  return {
    ...error,
    logs: [...error.logs, entry]
  };
}
```

#### 4. Immutable Error Builders
```typescript
class ErrorBuilder {
  private readonly error: Partial<ErrorObject>;

  constructor() {
    this.error = {
      logs: [],
      timestamp: Date.now()
    };
  }

  withMessage(message: string): ErrorBuilder {
    return new ErrorBuilder({
      ...this.error,
      message
    });
  }

  withLog(log: LogEntry): ErrorBuilder {
    return new ErrorBuilder({
      ...this.error,
      logs: [...(this.error.logs || []), log]
    });
  }

  build(): ErrorObject {
    if (!this.error.message || !this.error.logs) {
      throw new Error('Invalid error object');
    }

    return {
      ...this.error,
      logs: Object.freeze([...this.error.logs])
    } as ErrorObject;
  }
}
```

### Resources

- [Error Handling in TypeScript: Best Practices](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)
- [Handling errors like a pro in TypeScript](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)
- [TypeScript Error Handling: Tips and Best Practices](https://hupp.tech/blog/typescript/typescript-error-handling-tips-and-best-practices/)
- [JavaScript/TypeScript Error Handling: How Much Do You Know](https://betacraft.com/2025-01-15-js-ts-error-handling/)
- [Advanced Error Handling in TypeScript: Best Practices and Common Pitfalls](https://overctrl.com/advanced-error-handling-in-typescript-best-practices-and-common-pitfalls/)
- [The 5 commandments of clean error handling in TypeScript](https://backstage.orus.eu/the-5-commandments-of-clean-error-handling-in-typescript/)
- [TypeScript Error Handling](https://www.w3schools.com/typescript/typescript_error_handling.php)
- [How to Efficiently Handle Errors in TypeScript](https://dev.to/info_generalhazedawn_a3d/how-to-efficiently-handle-errors-in-typescript-3gf8)
- [Best Practices for Client-Side Logging and Error Handling in React](https://www.loggly.com/blog/best-practices-for-client-side-logging-and-error-handling-in-react/)
- [Understanding Error Handling in TypeScript: Strategies and Best Practices](https://blogs.perficient.com/2024/06/26/understanding-error-handling-in-typescript-strategies-and-best-practices/)
- [Building an Efficient Logging System for React + TypeScript](https://medium.com/@genildocs/building-an-efficient-logging-system-for-react-typescript-applications-3f000480a843)
- [Simple JavaScript Logger in TypeScript](https://blog.hellojs.org/simple-javascript-logger-in-typescript-demonstrating-interfaces-union-types-and-rest-parameters-6efc5aee2c97)
- [No more Try/Catch: a better way to handle errors in TypeScript](https://dev.to/noah-00/no-more-trycatch-a-better-way-to-handle-errors-in-typescript-5hbd)

---

## 5. Relevant Documentation URLs

### Official TypeScript Documentation
- [TypeScript Handbook - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript Handbook - Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
- [TypeScript 3.4 Release Notes - ReadonlyArray](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3.4.html)

### TypeScript Community Resources
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Total TypeScript](https://www.totaltypescript.com/)
- [TypeScript TV](https://typescript.tv/)

### JavaScript/MDN Documentation
- [Spread syntax (...) - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [Object.freeze() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)

### Tooling
- [TSLint Immutable](https://github.com/jonaskello/tslint-immutable)
- [ESLint TypeScript Rules](https://typescript-eslint.io/rules/)

---

## 6. Code Examples and Patterns

### Pattern 1: Safe Error Object Creation
```typescript
interface LogEntry {
  timestamp: number;
  message: string;
}

interface ErrorObject {
  message: string;
  logs: ReadonlyArray<LogEntry>;
  timestamp: number;
}

// GOOD: Always initialize with empty array
function createErrorObject(message: string): ErrorObject {
  return {
    message,
    logs: [],
    timestamp: Date.now()
  };
}

// GOOD: Safe log addition
function addLog(error: ErrorObject, log: LogEntry): ErrorObject {
  return {
    ...error,
    logs: [...error.logs, log]
  };
}
```

### Pattern 2: Immutable Error Handler
```typescript
class ErrorHandler {
  private readonly errors: ReadonlyArray<ErrorObject>;

  constructor(errors: ErrorObject[] = []) {
    this.errors = Object.freeze([...errors]);
  }

  addError(error: ErrorObject): ErrorHandler {
    return new ErrorHandler([...this.errors, error]);
  }

  getErrors(): ReadonlyArray<ErrorObject> {
    return this.errors;
  }

  getLast(): ErrorObject | undefined {
    return this.errors[this.errors.length - 1];
  }
}
```

### Pattern 3: Type-Safe Log Addition
```typescript
function addLogWithErrorHandling(
  error: ErrorObject | null,
  log: LogEntry
): ErrorObject {
  // Handle null/undefined error object
  if (!error) {
    return {
      message: 'Unknown error',
      logs: [log],
      timestamp: Date.now()
    };
  }

  // Handle missing logs array
  const currentLogs = error.logs || [];

  // Return new immutable error object
  return {
    ...error,
    logs: [...currentLogs, log]
  };
}
```

### Pattern 4: Deep Copy for Nested Objects
```typescript
interface LogEntry {
  timestamp: number;
  message: string;
  metadata?: Record<string, unknown>;
}

function deepCopyLogEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    metadata: entry.metadata ? { ...entry.metadata } : undefined
  };
}

function deepCopyLogs(logs: LogEntry[]): LogEntry[] {
  return logs.map(deepCopyLogEntry);
}
```

### Pattern 5: Runtime Validation
```typescript
function isLogEntry(value: unknown): value is LogEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.timestamp === 'number' &&
    typeof entry.message === 'string'
  );
}

function safeAddLog(
  error: ErrorObject,
  logEntry: unknown
): ErrorObject {
  if (!isLogEntry(logEntry)) {
    console.error('Invalid log entry:', logEntry);
    return error;
  }

  return {
    ...error,
    logs: [...error.logs, logEntry]
  };
}
```

---

## Summary and Key Takeaways

### For P1M1T1S3 Bug Fix

1. **Always Initialize Arrays**: Error objects should always have an initialized `logs: []` array, never `undefined` or optional.

2. **Use Spread Operator Correctly**: Remember that spread creates shallow copies. For error objects with arrays, always spread the array: `logs: [...error.logs]`

3. **Prevent Mutation**: Use `readonly` modifiers and `ReadonlyArray` types to prevent accidental mutations at compile time.

4. **Return New Objects**: Never mutate existing error objects. Always return new instances with updated arrays.

5. **Type Safety**: Use type guards and runtime validation when dealing with external data or unknown types.

### Recommended Pattern for Groundswell

```typescript
interface LogEntry {
  timestamp: number;
  message: string;
}

interface ErrorObject {
  message: string;
  logs: ReadonlyArray<LogEntry>; // Always defined, readonly
  timestamp: number;
}

function addLogToError(
  error: ErrorObject,
  log: LogEntry
): ErrorObject {
  return {
    ...error,
    logs: [...error.logs, log] // Always copy, never mutate
  };
}
```

---

## Research Sources

### Spread Operator Resources
- [Spread Operator | TypeScript Guide by Convex](https://www.convex.dev/typescript/advanced/advanced-concepts/typescript-spread-operator)
- [9 TypeScript Best Practices to Take Your Skills to the Next Level](https://medium.com/@kaant43/9-typescript-best-practices-to-take-your-skills-to-the-next-level-18f85fbb7fb1)
- [Unleashing the Power of JavaScript Spread Operator](https://kinsta.com/blog/spread-operator-javascript/)
- [Typescript spread deep copy with arrays](https://stackoverflow.com/questions/46969895/typescript-spread-deep-copy-with-arrays)
- [How to Copy Arrays of Objects vs. Arrays of Primitives in TypeScript](https://tevpro.com/how-to-copy-arrays-of-objects-arrays-of-primititives-in-typescript/)
- [JavaScript Spread Operator: Advanced Techniques and Best Practices](https://dev.to/hkp22/javascript-spread-operator-advanced-techniques-and-best-practices-5cbn)
- [Copying Arrays in TypeScript: Spread vs Deep Linking](https://iamguidozam.blog/2025/12/03/copying-arrays-in-typescript-spread-vs-deep-linking/)
- [Spread syntax (...) - JavaScript - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax)
- [Unlock the Power of JavaScript's Spread Operator: A Deep Dive](https://apurvupadhyay.medium.com/unlock-the-power-of-javascripts-spread-operator-a-deep-dive-c5c63d30a2e7)
- [Rest Parameters and Spread Syntax in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/rest-parameters-spread/)

### Type Assertion Resources
- [Mastering Type Assertion in TypeScript: Unleashing the Power of Type Safety](https://dev.to/vjnvisakh/mastering-type-assertion-in-typescript-unleashing-the-power-of-type-safety-364h)
- [TypeScript Type Assertion: Syntax, Behavior, and Practical Examples](https://mimo.org/glossary/typescript/type-assertion)
- [Documentation - Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [TypeScript: Understanding Type Assertion](https://abhishekw.medium.com/typescript-understanding-type-assertion-c06be90e1ba1)
- [Type Assertions and Type Casting in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/type-assertions-casting/)
- [Type Assertion | TypeScript Guide by Convex](https://www.convex.dev/typescript/typescript-101/type-conversion-checking/typescript-type-assertion)
- [Type Assertion | TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/type-assertion)
- [Documentation - Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
- [Avoid using Type Assertions in TypeScript](https://www.allthingstypescript.dev/p/avoid-using-type-assertions-in-typescript)
- [What is a good use of type assertions?](https://www.reddit.com/r/typescript/comments/1psvk03/what_is_a_good_use-of-type_assertions/)

### Array Mutation Prevention Resources
- [How to prevent object/array mutation?](https://stackoverflow.com/questions/34840334/how-to-prevent-object-array-mutation)
- [Simple Rules for Avoiding Mutation in JavaScript](https://medium.com/@edekobifrank/simple-rules-for-avoiding-mutation-in-javascript-24a492ffeb44)
- [Stop mutating in map, reduce and forEach](https://dev.to/smeijer/stop-mutating-in-map-reduce-and-foreach-58bf)
- [TSLint Immutable](https://github.com/jonaskello/tslint-immutable)
- [Understanding readonly in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/ts-readonly/)
- [Mutability - Total TypeScript](https://www.totaltypescript.com/books/total-typescript-essentials/mutability)
- [Immutability with Const Assertions](https://typescript.tv/course/06-immutability-with-const-assertions)
- [Using the readonly Modifier in TypeScript](https://www.convex.dev/typescript/advanced/utility-types-mapped-types/typescript-readonly)
- [Why you'll love Typescript's ReadonlyArray](https://itnext.io/why-youll-love-typescript-s-readonlyarray-9d7f09971e4a)
- [TypeScript return immutable/const/readonly Array](https://stackoverflow.com/questions/50003095/typescript-return-immutable-const-readonly-array)
- [Readonly Arrays in TypeScript](https://typestronglab.in/tutorial/readonly-arrays)
- [Handling readonly in TypeScript vs JavaScript](https://gist.github.com/dfkaye/9789c41a7d438355d564a186dc87c1f0)
- [A brief introduction to "Data Immutability" in TypeScript](https://medium.com/jspoint/typescript-data-immutability-71dc3e604426)
- [Readonly | TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/readonly)
- [Experiment: Making TypeScript immutable-by-default](https://news.ycombinator.com/item?id=45966018)
- [Documentation - TypeScript 3.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3.4.html)
- [Avoiding runtime errors with array indexing in TypeScript](https://blog.ignacemaes.com/avoiding-runtime-errors-with-array-indexing-in-typescript/)

### Error Handling and Logging Resources
- [Print | TypeScript Guide by Convex](https://www.convex.dev/typescript/best-practices/error-handling-debugging/typescript-print)
- [Building an Efficient Logging System for React + TypeScript](https://medium.com/@genildocs/building-an-efficient-logging-system-for-react-typescript-applications-3f000480a843)
- [Handling errors like a pro in TypeScript](https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991)
- [No more Try/Catch: a better way to handle errors in TypeScript](https://dev.to/noah-00/no-more-trycatch-a-better-way-to-handle-errors-in-typescript-5hbd)
- [What are the best practices to log an error?](https://stackoverflow.com/questions/296150/what-are-the-best-practices-to-log-an-error)
- [Understanding Error Handling in TypeScript: Strategies and Best Practices](https://blogs.perficient.com/2024/06/26/understanding-error-handling-in-typescript-strategies-and-best-practices/)
- [Simple JavaScript Logger in TypeScript](https://blog.hellojs.org/simple-javascript-logger-in-typescript-demonstrating-interfaces-union-types-and-rest-parameters-6efc5aee2c97)
- [How to Improve Error Handling in TypeScript](https://www.linkedin.com/posts/afaqjaved_typescript-errorhandling-functionalprogramming-activity-7382342152154017792-9gIy)
- [TypeScript Error Handling](https://www.w3schools.com/typescript/typescript_error_handling.php)
- [Mastering Data Validation and Error Handling](https://blog.codeminer42.com/zod-validation-101/)
- [Error Handling in TypeScript: Best Practices](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)
- [TypeScript Error Handling: Tips and Best Practices](https://hupp.tech/blog/typescript/typescript-error-handling-tips-and-best-practices/)
- [JavaScript/TypeScript Error Handling](https://betacraft.com/2025-01-15-js-ts-error-handling/)
- [A better way to handle exceptions](https://www.reddit.com/r/typescript/comments/1ka0ts5/a_better-way-to-handle-exceptions/)
- [Advanced Error Handling in TypeScript: Best Practices and Common Pitfalls](https://overctrl.com/advanced-error-handling-in-typescript-best-practices-and-common-pitfalls/)
- [The 5 commandments of clean error handling in TypeScript](https://backstage.orus.eu/the-5-commandments-of-clean-error-handling-in-typescript/)
- [How to Efficiently Handle Errors in TypeScript](https://dev.to/info_generalhazedawn_a3d/how-to-efficiently-handle-errors-in-typescript-3gf8)
- [Best Practices for Client-Side Logging and Error Handling in React](https://www.loggly.com/blog/best-practices-for-client-side-logging-and-error-handling-in-react/)

---

**End of Research Report**

**File:** `/home/dustin/projects/groundswell/plan_bugfix/P1M1T1S3/research/typescript_patterns.md`

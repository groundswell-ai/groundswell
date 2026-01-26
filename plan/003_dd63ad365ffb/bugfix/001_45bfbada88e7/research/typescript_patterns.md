# TypeScript Discriminated Union Patterns for Error Handling Criteria

**Research Date:** 2026-01-26
**Context:** Bugfix 001_45bfbada88e7 - Restart Logic Implementation
**Related Pattern:** `ErrorCriterion = { code: string } | { recoverable: boolean } | ((error: Error) => boolean)`

---

## Table of Contents

1. [Official TypeScript Documentation](#official-typescript-documentation)
2. [Discriminated Union Fundamentals](#discriminated-union-fundamentals)
3. [Error Handling Patterns](#error-handling-patterns)
4. [Retry/Restart Configuration Patterns](#retryrestart-configuration-patterns)
5. [Library Examples](#library-examples)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [Codebase Analysis](#codebase-analysis)

---

## Official TypeScript Documentation

### Primary Sources

| Topic | URL | Section |
|-------|-----|---------|
| **Handbook: Narrowing** | https://www.typescriptlang.org/docs/handbook/2/narrowing.html | Discriminated unions |
| **Handbook: Types from Types** | https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions | Creating discriminated unions |
| **Handbook: Type Narrowing** | https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates | Type guards and predicates |
| **Type Compatibility** | https://www.typescriptlang.org/docs/handbook/type-compatibility.html | Union type compatibility |
| **Release Notes** | https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2.8.html#prerequisites | Conditional types (related) |

### Key Documentation Excerpts

#### From "Types from Types" - Discriminated Unions

```typescript
interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

type Shape = Circle | Square;

function area(shape: Shape): number {
  // Discriminant property 'kind' narrows the type
  if (shape.kind === "circle") {
    return Math.PI * shape.radius ** 2;
  }
  return shape.sideLength ** 2;
}
```

**Key Principle:** A common property with literal types acts as a discriminant that TypeScript uses to narrow types in conditional blocks.

---

## Discriminated Union Fundamentals

### Definition

A **discriminated union** (also called **tagged union** or **algebraic data type**) is a TypeScript pattern where:

1. A union type contains multiple object types
2. Each type has a shared property with a **literal type** (the discriminant)
3. TypeScript uses the discriminant to narrow the type in conditional branches

### Basic Syntax

```typescript
// Three forms of error matching (similar to ErrorCriterion pattern)
type ErrorMatcher =
  | { type: 'code'; value: string }           // Discriminated object
  | { type: 'recoverable'; value: boolean }   // Discriminated object
  | { type: 'custom'; predicate: (e: Error) => boolean }; // Discriminated object

// Usage with type narrowing
function shouldRetry(matcher: ErrorMatcher, error: Error): boolean {
  if (matcher.type === 'code') {
    // TypeScript knows: matcher is { type: 'code'; value: string }
    return error.message.includes(matcher.value);
  }
  if (matcher.type === 'recoverable') {
    // TypeScript knows: matcher is { type: 'recoverable'; value: boolean }
    return matcher.value;
  }
  // TypeScript knows: matcher is { type: 'custom'; predicate: (e: Error) => boolean }
  return matcher.predicate(error);
}
```

### Discriminant vs. Non-Discriminated Properties

```typescript
// DISCRIMINATED - Has literal type on common property
type Validated =
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

// NOT DISCRIMINATED - No literal type on common property
type NotValidated =
  | { status: string; data: string }
  | { status: string; error: Error };

// DISCRIMINATED - Multiple literal properties create intersection
type MultiDiscriminated =
  | { category: 'network'; code: 500 | 502 | 503 | 504 }
  | { category: 'validation'; code: 400 | 422 }
  | { category: 'auth'; code: 401 | 403 };
```

---

## Error Handling Patterns

### Pattern 1: Result Type (Functional Error Handling)

**Source:** [Effect-TS](https://effect.website/docs/essentials/error-management)

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

function parseInput(input: string): Result<number> {
  const num = Number(input);
  if (isNaN(num)) {
    return { success: false, error: new Error('Invalid number') };
  }
  return { success: true, data: num };
}

// Usage with type narrowing
const result = parseInput("42");
if (result.success) {
  console.log(result.data); // TypeScript knows this is number
} else {
  console.error(result.error.message);
}
```

### Pattern 2: ErrorCriterion Pattern (Project's Use Case)

**File Reference:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md`

```typescript
// Core ErrorCriterion type
type ErrorCriterion =
  | { code: string }                  // Retry on specific error code
  | { recoverable: boolean }          // Retry on recoverable errors
  | ((error: WorkflowError) => boolean); // Custom predicate

// Implementation in restart logic
function matchesCriterion(
  error: WorkflowError,
  criterion: ErrorCriterion
): boolean {
  // Function predicate case (must check first!)
  if (typeof criterion === 'function') {
    return criterion(error);
  }

  // Discriminated union cases
  if ('code' in criterion) {
    return error.code === criterion.code;
  }

  if ('recoverable' in criterion) {
    return error.recoverable === criterion.recoverable;
  }

  return false;
}

// Usage examples
const criteria: ErrorCriterion[] = [
  { code: 'RATE_LIMIT_EXCEEDED' },
  { recoverable: true },
  (err) => err.message.includes('timeout')
];
```

**Why This Pattern Works:**

1. **Function First Check:** Functions are not discriminated unions, so check `typeof` first
2. **Discriminated Object Checks:** Use `'code' in criterion` for type narrowing
3. **Exhaustive Matching:** TypeScript ensures all cases are handled in strict mode

### Pattern 3: Error Code Classification

```typescript
// Error codes as literal types
type ErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'AUTH_FAILED'
  | 'UNKNOWN_ERROR';

// Discriminated error type
interface ClassifiedError {
  code: ErrorCode;
  recoverable: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// Error criterion with code matching
type TypedErrorCriterion =
  | { code: ErrorCode }
  | { recoverable: boolean }
  | { category: 'transient' | 'permanent' }
  | ((error: ClassifiedError) => boolean);

// Transient error categories
const TRANSIENT_ERRORS: Set<ErrorCode> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'RATE_LIMIT'
]);

function isTransient(error: ClassifiedError): boolean {
  return TRANSIENT_ERRORS.has(error.code);
}
```

### Pattern 4: Multi-Level Discrimination

```typescript
// Level 1: Outcome type
type OperationResult<T> =
  | { status: 'success'; value: T }
  | { status: 'failure'; error: ClassifiedError }
  | { status: 'retry'; after: number; error: ClassifiedError };

// Level 2: Error classification
type ClassifiedError =
  | { category: 'transient'; code: TransientCode; retryable: true }
  | { category: 'permanent'; code: PermanentCode; retryable: false };

type TransientCode = 'TIMEOUT' | 'RATE_LIMIT' | 'NETWORK_ERROR';
type PermanentCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'AUTH_FAILED';

// Multi-level narrowing
function handleResult<T>(result: OperationResult<T>) {
  switch (result.status) {
    case 'success':
      return result.value;
    case 'failure':
      if (result.error.category === 'transient') {
        // TypeScript knows: retryable is true
        console.log(`Transient error: ${result.error.code}`);
      }
      throw result.error;
    case 'retry':
      setTimeout(() => retry(), result.after);
      return null;
  }
}
```

---

## Retry/Restart Configuration Patterns

### Pattern 1: Retry Options with Error Criteria

**Source:** [async-retry](https://github.com/vercel/async-retry) inspiration

```typescript
interface RetryOptions {
  retries: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

// Extended with error criteria
interface RetryOptionsWithCriteria extends RetryOptions {
  retryOn?: ErrorCriterion[];
  retryIf?: (error: Error) => boolean;
  maxRetryTime?: number;
}

type ErrorCriterion =
  | { code: string | RegExp }
  | { instanceOf: { new (...args: unknown[]): Error } }
  | { message: string | RegExp }
  | { recoverable: boolean }
  | ((error: Error) => boolean);

// Implementation
class RetryHandler {
  constructor(private options: RetryOptionsWithCriteria) {}

  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.options.retries) {
      return false;
    }

    // Check retryIf first
    if (this.options.retryIf && !this.options.retryIf(error)) {
      return false;
    }

    // Check retryOn criteria
    if (this.options.retryOn) {
      return this.matchesAnyCriteria(error);
    }

    return true;
  }

  private matchesAnyCriteria(error: Error): boolean {
    return this.options.retryOn!.some(criterion => {
      if (typeof criterion === 'function') {
        return criterion(error);
      }
      if ('code' in criterion) {
        const errorCode = (error as { code?: string }).code;
        if (criterion.code instanceof RegExp) {
          return criterion.code.test(errorCode || '');
        }
        return errorCode === criterion.code;
      }
      if ('instanceOf' in criterion) {
        return error instanceof criterion.instanceOf;
      }
      if ('message' in criterion) {
        if (criterion.message instanceof RegExp) {
          return criterion.message.test(error.message);
        }
        return error.message.includes(criterion.message);
      }
      if ('recoverable' in criterion) {
        const isRecoverable = (error as { recoverable?: boolean }).recoverable;
        return isRecoverable === criterion.recoverable;
      }
      return false;
    });
  }
}
```

### Pattern 2: Exponential Backoff Configuration

```typescript
interface BackoffOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean | 'full' | 'equal';
  retryOn?: ErrorCriterion[];
}

type ErrorCriterion =
  | { code: string }
  | { status: number }
  | { recoverable: boolean }
  | ((error: Error) => boolean);

function calculateDelay(attempt: number, options: BackoffOptions): number {
  const factor = options.backoffFactor ?? 2;
  const initial = options.initialDelay ?? 100;
  const delay = initial * Math.pow(factor, attempt);

  // Apply jitter if configured
  if (options.jitter) {
    const jitterAmount = options.jitter === 'full' ? delay : delay / 2;
    return delay - Math.random() * jitterAmount;
  }

  return Math.min(delay, options.maxDelay ?? Infinity);
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: BackoffOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const shouldRetry = options.retryOn?.some(criterion => {
        if (typeof criterion === 'function') {
          return criterion(error as Error);
        }
        if ('code' in criterion) {
          return (error as { code?: string }).code === criterion.code;
        }
        if ('status' in criterion) {
          return (error as { status?: number }).status === criterion.status;
        }
        if ('recoverable' in criterion) {
          return (error as { recoverable?: boolean }).recoverable === criterion.recoverable;
        }
        return false;
      }) ?? true;

      if (!shouldRetry || attempt === maxAttempts - 1) {
        throw error;
      }

      const delay = calculateDelay(attempt, options);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max attempts exceeded');
}
```

### Pattern 3: Circuit Breaker Pattern

```typescript
type CircuitState =
  | { status: 'closed'; lastError: null }
  | { status: 'open'; openedAt: number; error: Error }
  | { status: 'half-open'; attempts: number };

interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenAttempts: number;
  retryOn?: ErrorCriterion[];
}

class CircuitBreaker {
  private state: CircuitState = { status: 'closed', lastError: null };
  private failureCount = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (Date.now() - this.state.openedAt > this.options.recoveryTimeout) {
        this.state = { status: 'half-open', attempts: 0 };
      } else {
        throw this.state.error;
      }
    }

    if (this.state.status === 'half-open' &&
        this.state.attempts >= this.options.halfOpenAttempts) {
      throw new Error('Circuit breaker in half-open: max attempts exceeded');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = { status: 'closed', lastError: null };
  }

  private async onFailure(error: Error) {
    const shouldCount = this.options.retryOn?.some(criterion => {
      if (typeof criterion === 'function') {
        return criterion(error);
      }
      if ('code' in criterion) {
        return (error as { code?: string }).code === criterion.code;
      }
      if ('recoverable' in criterion) {
        return (error as { recoverable?: boolean }).recoverable === criterion.recoverable;
      }
      return false;
    }) ?? true;

    if (shouldCount) {
      this.failureCount++;
      if (this.failureCount >= this.options.failureThreshold) {
        this.state = { status: 'open', openedAt: Date.now(), error };
      }
    }
  }
}
```

---

## Library Examples

### 1. Effect-TS (formerly fp-ts)

**URL:** https://effect.website/docs/essentials/error-management

Effect-TS uses discriminated unions extensively for error handling:

```typescript
import { Effect } from 'effect';

// Effect<E, A, R> - E is the error type (can be a union)
type EffectError =
  | { _tag: 'NetworkError'; message: string }
  | { _tag: 'ValidationError'; field: string };

// Pattern matching with Effect.match
const program = Effect.fail({ _tag: 'NetworkError', message: 'Failed' });

const matched = program.pipe(
  Effect.match({
    onFailure: (error) => {
      switch (error._tag) {
        case 'NetworkError':
          return `Network: ${error.message}`;
        case 'ValidationError':
          return `Validation: ${error.field}`;
      }
    },
    onSuccess: (value) => `Success: ${value}`
  })
);
```

**Key Takeaway:** Use a `_tag` property with literal types as the discriminant.

### 2. ts-pattern

**URL:** https://github.com/gvergnaud/ts-pattern

Library for exhaustive pattern matching:

```typescript
import { match } from 'ts-pattern';

type ErrorCriterion =
  | { type: 'code'; value: string }
  | { type: 'recoverable'; value: boolean }
  | { type: 'custom'; fn: (e: Error) => boolean };

const criterion: ErrorCriterion = { type: 'code', value: 'E123' };

const result = match(criterion)
  .with({ type: 'code' }, ({ value }) => `Code: ${value}`)
  .with({ type: 'recoverable' }, ({ value }) => `Recoverable: ${value}`)
  .with({ type: 'custom' }, ({ fn }) => 'Custom function')
  .exhaustive();
```

### 3. Zod Validation

**Codebase Reference:** `/home/dustin/projects/groundswell/package.json` - zod@^3.23.0

```typescript
import { z } from 'zod';

// Discriminated union validation
const ErrorCriterionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('code'),
    value: z.string()
  }),
  z.object({
    type: z.literal('recoverable'),
    value: z.boolean()
  }),
  z.object({
    type: z.literal('custom'),
    fn: z.function().args(z.custom<Error>()).returns(z.boolean())
  })
]);

// Runtime validation + type inference
type ErrorCriterion = z.infer<typeof ErrorCriterionSchema>;
```

### 4. Cockatiel (Resilience Library)

**URL:** https://github.com/alexaegis/cockatiel

```typescript
import { Policy } from 'cockatiel';

// Error handling with predicates
const retryPolicy = Policy.handleAll()
  .retry()
  .handle({
    // Predicate function
    handleWhen: (error) => {
      return error instanceof NetworkError ||
             error.code === 'RATE_LIMIT';
    },
    maxAttempts: 3,
    backoff: 'exponential'
  });

// Or use type guards
function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

const policy = Policy.handleWhen(isNetworkError)
  .retry()
  .maxAttempts(3);
```

### 5. async-retry (Vercel)

**URL:** https://github.com/vercel/async-retry

```typescript
import retry from 'async-retry';

// Custom retry logic with error matching
await retry(
  async () => {
    const response = await fetch(url);
    if (!response.ok) {
      const error = new Error(response.statusText);
      (error as any).status = response.status;
      throw error;
    }
    return response.json();
  },
  {
    retries: 5,
    onRetry: (error, attempt) => {
      console.log(`Attempt ${attempt}: ${error.message}`);
    },
    // Custom retry condition
    minTimeout: 100,
    maxTimeout: 1000,
    randomize: true
  }
);
```

---

## Best Practices

### 1. Use Literal Types for Discriminants

**Good:**
```typescript
type Result =
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

**Bad:**
```typescript
type Result =
  | { status: string; data: T }  // Not discriminated!
  | { status: string; error: Error };
```

### 2. Make Discriminants Required and Unique

**Good:**
```typescript
type ErrorCriterion =
  | { type: 'code'; value: string }
  | { type: 'recoverable'; value: boolean };
```

**Bad:**
```typescript
type ErrorCriterion =
  | { type?: 'code'; value: string }  // Optional discriminant
  | { type: 'recoverable'; value: boolean };
```

### 3. Check Function Types Before Discriminated Unions

**Good:**
```typescript
function check(criterion: ErrorCriterion, error: Error): boolean {
  if (typeof criterion === 'function') {
    return criterion(error);  // Check first
  }
  if ('code' in criterion) {
    return error.code === criterion.code;
  }
  return false;
}
```

**Bad:**
```typescript
function check(criterion: ErrorCriterion, error: Error): boolean {
  if ('code' in criterion) {  // Fails for functions!
    return error.code === criterion.code;
  }
  if (typeof criterion === 'function') {
    return criterion(error);
  }
  return false;
}
```

### 4. Use Exhaustive Matching

**Good:**
```typescript
function handle(result: Result<string>): string {
  return result.status === 'success'
    ? result.data
    : result.error.message;
}

// With ts-pattern
import { match } from 'ts-pattern';

function handle(result: Result<string>): string {
  return match(result)
    .with({ status: 'success' }, ({ data }) => data)
    .with({ status: 'error' }, ({ error }) => error.message)
    .exhaustive();
}
```

### 5. Narrow Error Types Effectively

**Good:**
```typescript
function isNetworkError(error: Error): error is NetworkError & { code: string } {
  return 'code' in error && typeof error.code === 'string';
}

if (isNetworkError(error)) {
  console.log(error.code);  // TypeScript knows this exists
}
```

### 6. Use Type Guards for Complex Conditions

**Good:**
```typescript
type ErrorCriterion =
  | { code: string | RegExp }
  | { recoverable: boolean }
  | ((error: Error) => boolean);

function matchesCriterion(
  error: Error,
  criterion: ErrorCriterion
): boolean {
  if (typeof criterion === 'function') {
    return criterion(error);
  }
  if ('code' in criterion) {
    const errorCode = (error as { code?: string }).code || '';
    return criterion.code instanceof RegExp
      ? criterion.code.test(errorCode)
      : errorCode === criterion.code;
  }
  if ('recoverable' in criterion) {
    return (error as { recoverable?: boolean }).recoverable === criterion.recoverable;
  }
  return false;
}
```

### 7. Discriminate at the Right Level

**Good:**
```typescript
// Top-level discrimination
type OperationResult<T> =
  | { success: true; value: T }
  | { success: false; error: { code: string; message: string } };
```

**Bad:**
```typescript
// Too many levels
type OperationResult<T> =
  | { outcome: { type: 'success'; value: T } }
  | { outcome: { type: 'failure'; error: { details: { code: string } } } };
```

### 8. Use Branded Types for Type Safety

**Good:**
```typescript
type ErrorCode = string & { readonly __brand: unique symbol };

function createErrorCode(code: string): ErrorCode {
  return code as ErrorCode;
}

const RATE_LIMIT: ErrorCode = createErrorCode('RATE_LIMIT');

type ErrorCriterion =
  | { code: ErrorCode }  // Only valid error codes
  | { recoverable: boolean };
```

---

## Common Pitfalls

### Pitfall 1: Missing Discriminant

```typescript
// BAD: No literal type
type BadResult =
  | { status: string; data: number }
  | { status: string; error: Error };

// TypeScript can't narrow these types!
function handle(result: BadResult) {
  if (result.status === 'success') {
    console.log(result.data);  // Error: 'data' doesn't exist on BadResult
  }
}
```

**Fix:**
```typescript
type GoodResult =
  | { status: 'success'; data: number }
  | { status: 'error'; error: Error };
```

### Pitfall 2: Wrong Order of Type Checks

```typescript
// BAD: Checking discriminated union before function
function check(criterion: ErrorCriterion, error: Error): boolean {
  if ('code' in criterion) {
    return true;
  }
  if (typeof criterion === 'function') {
    return criterion(error);  // Never reached!
  }
  return false;
}
```

**Fix:**
```typescript
function check(criterion: ErrorCriterion, error: Error): boolean {
  if (typeof criterion === 'function') {
    return criterion(error);  // Check functions first
  }
  if ('code' in criterion) {
    return true;
  }
  return false;
}
```

### Pitfall 3: Not Handling All Cases

```typescript
// BAD: Missing exhaustiveness check
function handle(result: Result<number>): number {
  if (result.status === 'success') {
    return result.data;
  }
  // What about error case?
  return 0;  // Default value - hiding potential issues
}
```

**Fix:**
```typescript
function handle(result: Result<number>): number {
  return result.status === 'success'
    ? result.data
    : throw result.error;  // Explicit handling
}

// Or use ts-pattern for exhaustive matching
```

### Pitfall 4: Overlapping Discriminants

```typescript
// BAD: Overlapping literal types
type BadCriterion =
  | { type: 'error'; code: string }
  | { type: 'error'; recoverable: boolean };  // Same discriminant value!

// TypeScript can't distinguish these
```

**Fix:**
```typescript
type GoodCriterion =
  | { type: 'byCode'; code: string }
  | { type: 'byRecoverable'; recoverable: boolean };
```

### Pitfall 5: Forgetting Type Assertions

```typescript
// BAD: Type not properly narrowed
function getCode(error: Error): string {
  if ('code' in error) {
    return error.code;  // Error: Property 'code' does not exist on type 'Error'
  }
  return 'UNKNOWN';
}
```

**Fix:**
```typescript
function getCode(error: Error): string {
  if ('code' in error && typeof error.code === 'string') {
    return error.code;  // OK: Type assertion via type guard
  }
  return 'UNKNOWN';
}

// Better: Use proper type guard
function hasCode(error: Error): error is Error & { code: string } {
  return 'code' in error && typeof error.code === 'string';
}

function getCode(error: Error): string {
  if (hasCode(error)) {
    return error.code;  // TypeScript knows this is safe
  }
  return 'UNKNOWN';
}
```

### Pitfall 6. Non-Exhaustive Switch Statements

```typescript
// BAD: No default case
function handleResult(result: Result): string {
  switch (result.status) {
    case 'success':
      return result.data;
    case 'error':
      return result.error.message;
    // Missing default - TypeScript may not catch this
  }
}
```

**Fix:**
```typescript
function handleResult(result: Result): string {
  switch (result.status) {
    case 'success':
      return result.data;
    case 'error':
      return result.error.message;
    default:
      const _exhaustive: never = result;  // Compile-time check
      throw new Error('Unhandled case');
  }
}
```

### Pitfall 7. Using 'any' Breaks Type Narrowing

```typescript
// BAD: Using 'any' breaks type narrowing
function process(result: Result): any {
  const value: any = result;
  if (value.status === 'success') {
    return value.data;  // No type safety
  }
}
```

**Fix:**
```typescript
function process(result: Result): string | Error {
  if (result.status === 'success') {
    return result.data;  // Properly typed
  }
  return result.error;
}
```

---

## Codebase Analysis

### Existing ErrorCriterion Pattern

**File:** `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md`

```typescript
// Lines 88-92
type ErrorCriterion =
  | { code: string }                  // Retry on specific error code
  | { recoverable: boolean }          // Retry on recoverable errors
  | ((error: WorkflowError) => boolean); // Custom predicate
```

**Analysis:**

1. **Pattern Type:** Mixed discriminated union with function type
2. **Discriminants:** `code` and `recoverable` properties
3. **Function Case:** Must be checked first with `typeof criterion === 'function'`
4. **Type Safety:** TypeScript 5.2+ can narrow this correctly

### Existing Error Type Structure

**Files:**
- `/home/dustin/projects/groundswell/src/types/agent.ts` (lines 389-415)
- `/home/dustin/projects/groundswell/src/types/providers.ts` (lines 199-225)

```typescript
// From src/types/agent.ts
interface AgentErrorResponse<TErrorDetails = null> {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
    recoverable: boolean;
  };
}

// Discriminated union used in provider responses
type ProviderExecutionResult =
  | { type: 'success'; output: unknown }
  | { type: 'error'; error: Error; code: string; retryable: boolean };
```

### Recommended Pattern for Groundswell

Based on codebase analysis and best practices:

```typescript
// Core error criterion type
type ErrorCriterion =
  | { type: 'code'; code: string | RegExp }
  | { type: 'recoverable'; value: boolean }
  | { type: 'category'; category: 'transient' | 'permanent' }
  | { type: 'custom'; predicate: (error: WorkflowError) => boolean };

// Helper functions
function matchesCriterion(
  error: WorkflowError,
  criterion: ErrorCriterion
): boolean {
  switch (criterion.type) {
    case 'code':
      return criterion.code instanceof RegExp
        ? criterion.code.test(error.code)
        : error.code === criterion.code;

    case 'recoverable':
      return error.recoverable === criterion.value;

    case 'category':
      return TRANSIENT_ERROR_CODES.has(error.code);

    case 'custom':
      return criterion.predicate(error);
  }
}

// Transient error classification
const TRANSIENT_ERROR_CODES: Set<string> = new Set([
  'TIMEOUT',
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'SERVICE_UNAVAILABLE',
  'CONFLICT'
]);

// Usage in StepOptions
interface StepOptions {
  restartable?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  retryOn?: ErrorCriterion[];
}

// Example usage
@Step({
  restartable: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  retryOn: [
    { type: 'code', code: 'RATE_LIMIT' },
    { type: 'category', category: 'transient' },
    { type: 'custom', predicate: (err) => err.message.includes('timeout') }
  ]
})
async processData() {
  // Step implementation
}
```

---

## Summary: Key Takeaways

### For ErrorCriterion Implementation

1. **Add a `type` discriminant** to make the union explicitly discriminated
2. **Check function predicates first** before discriminated union checks
3. **Use `typeof` and `in` operators** for type narrowing
4. **Support both string and RegExp** for error code matching
5. **Provide helper functions** for common error categories
6. **Consider using ts-pattern** for exhaustive matching
7. **Enable TypeScript strict mode** to catch exhaustiveness issues
8. **Use Zod discriminated unions** if runtime validation is needed

### Recommended Resources

- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- **Effect-TS Error Management:** https://effect.website/docs/essentials/error-management
- **ts-pattern Library:** https://github.com/gvergnaud/ts-pattern
- **Zod Discriminated Unions:** https://zod.dev/?id=discriminated-unions
- **Cockatiel Resilience:** https://github.com/alexaegis/cockatiel
- **async-retry:** https://github.com/vercel/async-retry

---

## References

1. TypeScript Handbook - Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
2. TypeScript Handbook - Types from Types: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
3. Effect-TS Error Management: https://effect.website/docs/essentials/error-management
4. ts-pattern: https://github.com/gvergnaud/ts-pattern
5. Zod Documentation: https://zod.dev
6. Cockatiel: https://github.com/alexaegis/cockatiel
7. async-retry: https://github.com/vercel/async-retry

---

*Generated for bugfix 001_45bfbada88e7 - Restart Logic Implementation*
*Groundswell Project - TypeScript 5.2+*

# TypeScript Error Wrapping Patterns Research

**Research Date:** 2025-01-24
**Task:** P1M1T1S3 - Research Result types and error wrapping patterns for agent responses

## Table of Contents
- [Overview](#overview)
- [Result Type Libraries](#result-type-libraries)
  - [neverthrow](#neverthrow)
  - [ts-results](#ts-results)
  - [Other Libraries](#other-libraries)
- [Core Patterns](#core-patterns)
- [Migration from Throws to Responses](#migration-from-throws-to-responses)
- [Type-Safe Error Handling](#type-safe-error-handling)
- [Integration with Agent Responses](#integration-with-agent-responses)
- [Recommendations](#recommendations)

---

## Overview

Error wrapping patterns in TypeScript focus on converting exception-based error handling into explicit, type-safe return values. This approach aligns with functional programming principles and provides better predictability in distributed systems like agent workflows.

### Key Benefits
- **Explicit error handling** - Errors are part of function signatures
- **Type safety** - Compiler enforces error handling
- **Composability** - Results can be chained and combined
- **Testability** - Both success and failure paths are testable
- **No unexpected exceptions** - Control flow is predictable

### Core Concept: The Result Type

The Result type represents a computation that can either succeed with a value or fail with an error:

```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };
```

Or using class-based representations:
```typescript
class Ok<T> {
  readonly value: T;
  constructor(value: T) { this.value = value; }
}

class Err<E> {
  readonly error: E;
  constructor(error: E) { this.error = error; }
}

type Result<T, E> = Ok<T> | Err<E>;
```

---

## Result Type Libraries

### neverthrow

**Repository:** [https://github.com/supermacro/neverthrow](https://github.com/supermacro/neverthrow)
**NPM:** `neverthrow` (latest: 8.2.0)
**Description:** "Stop throwing errors, and instead return Results!"
**Keywords:** typescript, functional, fp, error

#### Key Features
- Railway-oriented programming support
- Comprehensive functional API (map, andThen, orElse, etc.)
- TypeScript strict mode compatible
- Excellent error inference
- Promise utilities
- Utility functions for combining results

#### Basic Usage

```typescript
import { Result, ok, err } from 'neverthrow';

// Creating Results
const success: Result<number, Error> = ok(42);
const failure: Result<number, Error> = err(new Error('Failed'));

// Pattern matching
success
  .map(value => value * 2)
  .andThen(value => anotherOperation(value))
  .mapErr(error => new CustomError(error.message));
```

#### Async Operations

```typescript
import { fromSafePromise, fromPromise } from 'neverthrow';

// Wrap promises that never reject
const result = await fromSafePromise(fetch('/api/users'));

// Wrap promises that might reject
const result = await fromPromise(
  fetch('/api/users'),
  (error) => new NetworkError('Failed to fetch')
);
```

#### Chaining Operations

```typescript
async function getUser(id: string): Promise<Result<User, Error>> {
  return fromPromise(
    fetch(`/api/users/${id}`).then(r => r.json()),
    (error) => new ApiError(`Failed to fetch user: ${id}`)
  );
}

async function getUserPosts(userId: string): Promise<Result<Post[], Error>> {
  return fromPromise(
    fetch(`/api/users/${userId}/posts`).then(r => r.json()),
    (error) => new ApiError(`Failed to fetch posts for user: ${userId}`)
  );
}

// Compose operations
const result = await getUser('123')
  .andThen(user => getUserPosts(user.id))
  .map(posts => posts.length);

// Handle result
result.match(
  (count) => console.log(`User has ${count} posts`),
  (error) => console.error(error.message)
);
```

#### Combining Results

```typescript
import { ResultAsync, ok, err } from 'neverthrow';

// Combine multiple async results
const results = await ResultAsync.combine([
  getUser('1'),
  getUser('2'),
  getUser('3')
]);

// results is Ok<[User, User, User]> if all succeed
// or Err<Error> if any fail

// Combine with all or nothing semantics
const combined = await ResultAsync.combineWithAllErrors([
  fetchUser('1'),
  fetchUser('2'),
  fetchUser('3')
]);
// Returns Ok<[User, User, User]> or Err<Error[]>
```

#### Error Wrapping Patterns

```typescript
// Pattern 1: Try-catch wrapping
function safeOperation(): Result<Data, Error> {
  try {
    const data = riskyOperation();
    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Pattern 2: Async wrapper
async function safeAsyncOperation(): Promise<Result<Data, Error>> {
  try {
    const data = await riskyAsyncOperation();
    return ok(data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Pattern 3: Using fromPromise helper
const safeOperation = () => fromPromise(
  riskyAsyncOperation(),
  (error) => new OperationError('Operation failed', { cause: error })
);

// Pattern 4: Converting existing throwing functions
const safeJsonParse = <T = unknown>(json: string): Result<T, SyntaxError> => {
  return fromThrowable(
    () => JSON.parse(json) as T,
    (error) => error instanceof SyntaxError ? error : new SyntaxError('Invalid JSON')
  )();
};
```

---

### ts-results

**Repository:** [https://github.com/vultix/ts-results](https://github.com/vultix/ts-results)
**NPM:** `ts-results` (latest: 3.3.0)
**Description:** "A typescript implementation of Rust's Result and Option objects."
**Keywords:** Rust, Result, Option, Typescript, Ok, Err, Error Handling, Monad

#### Key Features
- Direct Rust-inspired API
- Lightweight (no dependencies)
- Pattern matching support
- Both Result and Option types
- Union type implementation

#### Basic Usage

```typescript
import { Result, Ok, Err } from 'ts-results';

// Creating Results
const success: Result<number, string> = new Ok(42);
const failure: Result<number, string> = new Err('Something went wrong');

// Pattern matching
const message = result.match({
  ok: (value) => `Success: ${value}`,
  err: (error) => `Error: ${error}`
});
```

#### Working with Results

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return new Err('Division by zero');
  }
  return new Ok(a / b);
}

// Using the result
const result = divide(10, 2);

// Check variant
if (result.ok) {
  console.log(result.val); // The value
} else {
  console.log(result.val); // The error
}

// Unwrap with default
const value = result.ok ? result.val : 0;

// Pattern matching
const message = result.match({
  ok: (value) => `Result: ${value}`,
  err: (error) => `Error: ${error}`
});
```

#### Chaining

```typescript
result
  .map(value => value * 2)
  .mapErr(error => error.toUpperCase());
```

#### Combining Results

```typescript
import { Result } from 'ts-results';

const combined = Result.combine([result1, result2, result3]);
// Returns Ok<[T1, T2, T3]> if all succeed, or Err<E> if any fail
```

---

### Other Libraries

#### Effect-TS
**Repository:** [https://github.com/Effect-TS/effect](https://github.com/Effect-TS/effect)
**Description:** A comprehensive functional effect system with built-in error handling

```typescript
import { Effect } from 'effect';

const program = Effect.tryPromise({
  try: () => fetch('/api/data'),
  catch: (error) => new NetworkError('Failed to fetch', { cause: error })
});

await Effect.runPromise(
  program.pipe(
    Effect.catchAll((error) => Effect.satisfy(() => console.error(error)))
  )
);
```

#### fp-ts
**Repository:** [https://github.com/gcanti/fp-ts](https://github.com/gcanti/fp-ts)
**Description:** Functional programming toolkit for TypeScript

```typescript
import { Either, tryCatch } from 'fp-ts/lib/Either';

const safeOperation = Either.tryCatch(
  () => JSON.parse(jsonString),
  (error) => new ParseError('Failed to parse JSON', { cause: error })
);
```

#### Plain-TypeScript Result Type

For minimal dependencies, a custom Result type can be implemented:

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Type guards
function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

// Factory functions
function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return err(new Error('Division by zero'));
  }
  return ok(a / b);
}

const result = divide(10, 2);
if (isSuccess(result)) {
  console.log(result.data); // Type narrowed to success case
}
```

---

## Core Patterns

### Pattern 1: Wrapper Functions

Convert existing throwing functions into Result-returning functions:

```typescript
// Original throwing function
function parseConfig(json: string): Config {
  return JSON.parse(json);
}

// Wrapped version
function parseConfigSafe(json: string): Result<Config, SyntaxError> {
  try {
    return ok(JSON.parse(json));
  } catch (error) {
    return err(error instanceof SyntaxError
      ? error
      : new SyntaxError('Invalid JSON configuration')
    );
  }
}

// Generic wrapper
function wrapThrowable<T, E extends Error = Error>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
}

// Usage
const result = wrapThrowable(
  () => JSON.parse(jsonString),
  (error) => new SyntaxError('Parse failed')
);
```

### Pattern 2: Async Wrapper

```typescript
async function wrapAsyncThrowable<T, E extends Error = Error>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(onError(error));
  }
}

// Usage
const result = await wrapAsyncThrowable(
  () => fetch('/api/data').then(r => r.json()),
  (error) => new NetworkError('API request failed', { cause: error })
);
```

### Pattern 3: Railway-Oriented Programming

Chain operations where errors short-circuit the pipeline:

```typescript
import { ok, err } from 'neverthrow';

type User = { id: string; name: string; email: string };

async function fetchUser(id: string): Promise<Result<User, Error>> {
  // Implementation
}

async function validateUser(user: User): Promise<Result<User, Error>> {
  if (!user.email.includes('@')) {
    return err(new Error('Invalid email'));
  }
  return ok(user);
}

async function sendWelcomeEmail(user: User): Promise<Result<void, Error>> {
  // Implementation
}

// Railway: if any step fails, subsequent steps are skipped
const result = await fetchUser('123')
  .andThen(validateUser)
  .andThen(sendWelcomeEmail);

result.match(
  () => console.log('Welcome email sent'),
  (error) => console.error('Failed:', error.message)
);
```

### Pattern 4: Error Transformation

Transform errors as they propagate up the call stack:

```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends Error {
  constructor(
    message: string,
    public query: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

async function createUser(userData: UserData): Promise<Result<User, DatabaseError>> {
  return validateUser(userData)
    .mapErr((error) => new DatabaseError(`Validation failed: ${error.message}`, 'INSERT INTO users'))
    .andThen((validData) => saveToDatabase(validData))
    .mapErr((error) =>
      error instanceof DatabaseError
        ? error
        : new DatabaseError(`Save failed: ${error.message}`, 'INSERT INTO users')
    );
}
```

### Pattern 5: Combining Independent Operations

```typescript
import { ResultAsync } from 'neverthrow';

// Execute multiple operations in parallel
async function fetchDashboardData(userId: string): Promise<Result<DashboardData, Error>> {
  const [userResult, postsResult, notificationsResult] = await Promise.all([
    fetchUser(userId),
    fetchUserPosts(userId),
    fetchNotifications(userId)
  ]);

  // Combine results - all must succeed
  return ResultAsync.combine([
    userResult,
    postsResult,
    notificationsResult
  ]).map(([user, posts, notifications]) => ({
    user,
    posts,
    notifications
  }));
}

// Alternative: combineWithAllErrors to collect all failures
async function fetchWithPartialSuccess(userId: string): Promise<Result<PartialData, Error[]>> {
  return ResultAsync.combineWithAllErrors([
    fetchUser(userId),
    fetchUserPosts(userId),
    fetchNotifications(userId)
  ]).map(([user, posts, notifications]) => ({
    user: user.ok ? user.value : undefined,
    posts: posts.ok ? posts.value : [],
    notifications: notifications.ok ? notifications.value : [],
    errors: [user, posts, notifications].filter(r => r.err).map(r => r.error)
  }));
}
```

### Pattern 6: Resource Cleanup

```typescript
import { fromSafePromise } from 'neverthrow';

async function withResource<T>(
  acquire: () => Promise<Resource>,
  use: (resource: Resource) => Promise<Result<T, Error>>,
  release: (resource: Resource) => Promise<void>
): Promise<Result<T, Error>> {
  const resourceResult = await fromSafePromise(acquire());

  if (resourceResult.isErr()) {
    return err(resourceResult.error);
  }

  const resource = resourceResult.value;

  try {
    const result = await use(resource);
    return result;
  } finally {
    await release(resource);
  }
}

// Usage
const result = await withResource(
  () => connectToDatabase(),
  async (db) => {
    return db.query('SELECT * FROM users');
  },
  async (db) => {
    await db.close();
  }
);
```

---

## Migration from Throws to Responses

### Step 1: Identify Throwing Functions

```typescript
// Before: throws on error
async function fetchAgentConfig(id: string): Promise<AgentConfig> {
  const response = await fetch(`/api/agents/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch agent config: ${response.statusText}`);
  }
  return response.json();
}
```

### Step 2: Create Result Type Signature

```typescript
// After: returns Result
type AgentConfigResult = Result<AgentConfig, FetchError>;
type AgentConfigResultAsync = Promise<Result<AgentConfig, FetchError>>;

async function fetchAgentConfig(id: string): AgentConfigResultAsync {
  // Implementation
}
```

### Step 3: Wrap Implementation

```typescript
import { fromPromise, ok } from 'neverthrow';

// Define error types
class FetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

async function fetchAgentConfig(id: string): Promise<Result<AgentConfig, FetchError>> {
  return fromPromise(
    fetch(`/api/agents/${id}`).then(r => {
      if (!r.ok) {
        throw new FetchError(
          `Failed to fetch agent config: ${r.statusText}`,
          r.status,
          `/api/agents/${id}`
        );
      }
      return r.json();
    }),
    (error) => error instanceof FetchError
      ? error
      : new FetchError(`Network error: ${error}`, undefined, `/api/agents/${id}`)
  );
}
```

### Step 4: Update Call Sites

```typescript
// Before: try-catch
try {
  const config = await fetchAgentConfig('agent-123');
  const agent = new Agent(config);
  await agent.initialize();
} catch (error) {
  logger.error('Failed to initialize agent', error);
}

// After: Result matching
const configResult = await fetchAgentConfig('agent-123');

const agentResult = configResult.andThen(async (config) => {
  return fromPromise(
    new Agent(config).initialize(),
    (error) => new InitializationError('Agent initialization failed', { cause: error })
  );
});

agentResult.match(
  (agent) => logger.info('Agent initialized successfully'),
  (error) => logger.error('Failed to initialize agent', error)
);
```

### Step 5: Refactor Chained Operations

```typescript
// Before: nested try-catch
async function runAgentWorkflow(agentId: string, task: string): Promise<string> {
  try {
    const config = await fetchAgentConfig(agentId);
    try {
      const agent = new Agent(config);
      try {
        await agent.initialize();
        try {
          return await agent.execute(task);
        } catch (error) {
          throw new ExecutionError('Task execution failed', { cause: error });
        }
      } catch (error) {
        throw new InitializationError('Agent initialization failed', { cause: error });
      }
    } catch (error) {
      throw new ConfigError('Invalid agent configuration', { cause: error });
    }
  } catch (error) {
    throw new FetchError('Failed to fetch agent', { cause: error });
  }
}

// After: flat Result chain
async function runAgentWorkflow(agentId: string, task: string): Promise<Result<string, WorkflowError>> {
  return fetchAgentConfig(agentId)
    .mapErr((error) => new WorkflowError('Fetch failed', { cause: error }))
    .andThen((config) =>
      fromSafePromise(
        Promise.resolve(new Agent(config)),
        (error) => new WorkflowError('Invalid config', { cause: error })
      )
    )
    .andThen((agent) =>
      fromPromise(
        agent.initialize(),
        (error) => new WorkflowError('Initialization failed', { cause: error })
      ).map(() => agent)
    )
    .andThen((agent) =>
      fromPromise(
        agent.execute(task),
        (error) => new WorkflowError('Execution failed', { cause: error })
      )
    );
}
```

### Migration Checklist

- [ ] Identify all functions that throw errors
- [ ] Define Result type signatures
- [ ] Create error type hierarchy
- [ ] Wrap implementations with Result returns
- [ ] Update call sites to handle Results
- [ ] Remove try-catch blocks
- [ ] Add type guards and match functions
- [ ] Update tests for both success and failure cases
- [ ] Document error types and their meanings

---

## Type-Safe Error Handling

### Discriminated Union Types

```typescript
type ApiError =
  | { type: 'network'; message: string; statusCode?: number }
  | { type: 'validation'; message: string; field: string }
  | { type: 'authentication'; message: string }
  | { type: 'not_found'; resource: string };

type Result<T, E extends ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Type guard
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    ['network', 'validation', 'authentication', 'not_found'].includes((error as any).type)
  );
}

// Usage with type narrowing
function handleResult<T>(result: Result<T, ApiError>): void {
  if (!result.success) {
    switch (result.error.type) {
      case 'network':
        console.error('Network error:', result.error.message);
        break;
      case 'validation':
        console.error(`Validation failed for ${result.error.field}:`, result.error.message);
        break;
      case 'authentication':
        console.error('Auth error:', result.error.message);
        break;
      case 'not_found':
        console.error(`Resource not found: ${result.error.resource}`);
        break;
    }
    return;
  }

  // TypeScript knows result.data is T here
  console.log('Success:', result.data);
}
```

### Error Class Hierarchy

```typescript
// Base error class
abstract class AppError extends Error {
  abstract readonly type: string;
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific error types
class ValidationError extends AppError {
  readonly type = 'validation' as const;
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field: string,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

class NetworkError extends AppError {
  readonly type = 'network' as const;
  readonly code = 'NETWORK_ERROR';

  constructor(
    message: string,
    public readonly statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, context);
  }
}

// Type guard for narrowing
function isValidationError(error: AppError): error is ValidationError {
  return error.type === 'validation';
}

function isNetworkError(error: AppError): error is NetworkError {
  return error.type === 'network';
}
```

### Generic Result Type with Type Guards

```typescript
type Result<TSuccess, TError extends Error = Error> =
  | { ok: true; value: TSuccess }
  | { ok: false; error: TError };

function isSuccess<T, E extends Error>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

function isFailure<T, E extends Error>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

// Usage
function processResult(result: Result<string, Error>): string {
  if (isSuccess(result)) {
    // TypeScript knows result.value is string
    return `Success: ${result.value}`;
  } else {
    // TypeScript knows result.error is Error
    return `Error: ${result.error.message}`;
  }
}
```

### Async Result Type

```typescript
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Helper for wrapping async functions
async function asyncResult<T, E extends Error>(
  fn: () => Promise<T>,
  errorFactory: (error: unknown) => E
): AsyncResult<T, E> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: errorFactory(error) };
  }
}

// Usage
const result = await asyncResult(
  () => fetch('/api/data').then(r => r.json()),
  (error) => new ApiError('Fetch failed', { cause: error })
);
```

### Combining Multiple Results

```typescript
// Combine with all-or-nothing semantics
async function combineAll<T extends unknown[], E extends Error>(
  results: { [K in keyof T]: AsyncResult<T[K], E> }
): AsyncResult<T, E> {
  try {
    const values = await Promise.all(results);

    for (const value of values) {
      if (!value.ok) return value as { ok: false; error: E };
    }

    return {
      ok: true,
      value: values.map(v => (v as { ok: true; value: any }).value) as T
    };
  } catch (error) {
    return {
      ok: false,
      error: error as E
    };
  }
}

// Combine collecting all errors
async function combineWithAllErrors<T extends unknown[], E extends Error>(
  results: { [K in keyof T]: AsyncResult<T[K], E> }
): Promise<{ ok: true; value: T } | { ok: false; errors: E[] }> {
  const settled = await Promise.allSettled(results);
  const values: any[] = [];
  const errors: E[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      if (result.value.ok) {
        values.push(result.value.value);
      } else {
        errors.push(result.value.error);
      }
    } else {
      errors.push(result.reason as E);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: values as T };
}
```

---

## Integration with Agent Responses

### AgentResponse as a Result Type

The existing AgentResponse type naturally maps to a Result pattern:

```typescript
// Existing AgentResponse type
type AgentResponse<T = unknown> =
  | {
      success: true;
      message: string;
      data?: T;
    }
  | {
      success: false;
      message: string;
      error?: Error;
      data?: T;
    };

// This is essentially a Result type!
type Result<T, E = Error> = AgentResponse<T>;
```

### Converting AgentResponse to/from Result

```typescript
import { Result as NeverThrowResult, ok, err } from 'neverthrow';

// Convert AgentResponse to neverthrow Result
function agentResponseToResult<T>(
  response: AgentResponse<T>
): NeverThrowResult<T, Error> {
  if (response.success) {
    return ok(response.data as T);
  }
  return err(response.error || new Error(response.message));
}

// Convert neverthrow Result to AgentResponse
function resultToAgentResponse<T>(
  result: NeverThrowResult<T, Error>,
  successMessage: string
): AgentResponse<T> {
  if (result.isOk()) {
    return {
      success: true,
      message: successMessage,
      data: result.value
    };
  }

  return {
    success: false,
    message: result.error.message,
    error: result.error
  };
}
```

### Error Wrapping in Agent Operations

```typescript
import { fromPromise, ok, err } from 'neverthrow';

class Agent {
  async executeTool<T>(toolName: string, input: unknown): Promise<AgentResponse<T>> {
    return fromPromise(
      this.toolRegistry.execute(toolName, input),
      (error) => new ToolExecutionError(
        `Tool ${toolName} failed`,
        { toolName, cause: error }
      )
    ).match(
      (result) => ({
        success: true as const,
        message: `Tool ${toolName} executed successfully`,
        data: result as T
      }),
      (error) => ({
        success: false as const,
        message: error.message,
        error
      })
    );
  }

  async processTask(task: Task): Promise<AgentResponse<TaskResult>> {
    return this.validateTask(task)
      .andThen((validated) => this.executeTask(validated))
      .andThen((result) => this.formatResult(result))
      .match(
        (result) => ({
          success: true as const,
          message: 'Task completed successfully',
          data: result
        }),
        (error) => ({
          success: false as const,
          message: error.message,
          error
        })
      );
  }

  private validateTask(task: Task): NeverThrowResult<ValidatedTask, ValidationError> {
    const errors: string[] = [];

    if (!task.name) errors.push('Task name is required');
    if (!task.instructions) errors.push('Task instructions are required');

    if (errors.length > 0) {
      return err(new ValidationError('Task validation failed', { errors }));
    }

    return ok(task as ValidatedTask);
  }

  private executeTask(task: ValidatedTask): NeverThrowResult<TaskResult, ExecutionError> {
    return fromPromise(
      this.llm.execute(task),
      (error) => new ExecutionError('Task execution failed', { task, cause: error })
    );
  }

  private formatResult(result: TaskResult): NeverThrowResult<TaskResult, FormatError> {
    try {
      const formatted = this.formatter.format(result);
      return ok(formatted);
    } catch (error) {
      return err(new FormatError('Failed to format result', { result, cause: error }));
    }
  }
}
```

### Error Type Hierarchy for Agents

```typescript
// Base agent error
abstract class AgentError extends Error {
  abstract readonly type: string;

  constructor(
    message: string,
    public readonly context: {
      taskId?: string;
      agentId?: string;
      timestamp: Date;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific agent errors
class TaskValidationError extends AgentError {
  readonly type = 'task_validation' as const;

  constructor(
    message: string,
    public readonly validationErrors: string[],
    context: Omit<AgentError['context'], 'cause'>
  ) {
    super(message, context);
  }
}

class ToolExecutionError extends AgentError {
  readonly type = 'tool_execution' as const;

  constructor(
    message: string,
    public readonly toolName: string,
    context: Omit<AgentError['context'], 'cause'>
  ) {
    super(message, context);
  }
}

class LLMError extends AgentError {
  readonly type = 'llm' as const;

  constructor(
    message: string,
    public readonly model: string,
    public readonly statusCode?: number,
    context: Omit<AgentError['context'], 'cause'>
  ) {
    super(message, context);
  }
}

// Error handler utility
class AgentErrorHandler {
  handle(error: unknown): AgentResponse {
    if (error instanceof AgentError) {
      return {
        success: false,
        message: error.message,
        error,
        data: {
          type: error.type,
          context: error.context
        }
      };
    }

    return {
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }

  // Create typed error responses
  validationError(errors: string[]): AgentResponse {
    return this.handle(new TaskValidationError(
      'Task validation failed',
      errors,
      { timestamp: new Date() }
    ));
  }

  toolExecutionError(toolName: string, cause: unknown): AgentResponse {
    return this.handle(new ToolExecutionError(
      `Tool ${toolName} failed`,
      toolName,
      { timestamp: new Date(), cause }
    ));
  }

  llmError(model: string, statusCode?: number, cause?: unknown): AgentResponse {
    return this.handle(new LLMError(
      `LLM request failed for model ${model}`,
      model,
      statusCode,
      { timestamp: new Date(), cause }
    ));
  }
}
```

### Workflow Error Wrapping

```typescript
import { ResultAsync, ok, err } from 'neverthrow';

class Workflow {
  async execute(input: WorkflowInput): Promise<AgentResponse<WorkflowOutput>> {
    const errorHandler = new AgentErrorHandler();

    return ResultAsync.combine([
      this.validateInput(input),
      this.initializeContext(input),
      this.loadAgents(input.agentIds)
    ])
      .andThen(([validatedInput, context, agents]) =>
        this.runWorkflow(validatedInput, context, agents)
      )
      .match(
        (output) => ({
          success: true as const,
          message: 'Workflow completed successfully',
          data: output
        }),
        (error) => errorHandler.handle(error)
      );
  }

  private validateInput(input: WorkflowInput): ResultAsync<ValidatedInput, AgentError> {
    return ResultAsync.fromPromise(
      Promise.resolve(this.validator.validate(input)),
      (error) => new TaskValidationError(
        'Input validation failed',
        [],
        { timestamp: new Date(), cause: error }
      )
    );
  }

  private initializeContext(input: WorkflowInput): ResultAsync<WorkflowContext, AgentError> {
    return ResultAsync.fromPromise(
      this.contextFactory.create(input),
      (error) => new AgentError(
        'Failed to initialize context',
        { timestamp: new Date(), cause: error }
      )
    );
  }

  private loadAgents(agentIds: string[]): ResultAsync<Agent[], AgentError> {
    return ResultAsync.combine(
      agentIds.map(id =>
        ResultAsync.fromPromise(
          this.agentRegistry.load(id),
          (error) => new AgentError(
            `Failed to load agent ${id}`,
            { agentId: id, timestamp: new Date(), cause: error }
          )
        )
      )
    );
  }

  private runWorkflow(
    input: ValidatedInput,
    context: WorkflowContext,
    agents: Agent[]
  ): ResultAsync<WorkflowOutput, AgentError> {
    return ResultAsync.fromPromise(
      this.executor.execute(input, context, agents),
      (error) => new AgentError(
        'Workflow execution failed',
        { taskId: input.taskId, timestamp: new Date(), cause: error }
      )
    );
  }
}
```

---

## Recommendations

### Library Selection

**For the Groundswell project, I recommend using `neverthrow` because:**

1. **Excellent TypeScript Support**
   - First-class TypeScript strict mode compatibility
   - Powerful type inference for error values
   - No any types in implementation

2. **Comprehensive API**
   - Rich set of combinators (map, andThen, orElse, match, etc.)
   - Promise utilities (fromPromise, fromSafePromise)
   - Result combining utilities

3. **Actively Maintained**
   - Recent releases (8.2.0 as of 2025)
   - Strong community and documentation
   - Backward compatibility guarantees

4. **Railway-Oriented Programming**
   - Natural fit for agent workflows
   - Error propagation is automatic
   - Easy to reason about control flow

### Implementation Strategy

**Phase 1: Setup and Foundation**
```bash
npm install neverthrow
```

Define base types:
```typescript
// src/types/result.ts
import { Result as NTResult, Ok as NTOk, Err as NTErr } from 'neverthrow';

// Re-export types
export type Result<T, E extends Error = Error> = NTResult<T, E>;
export const ok = NTOk;
export const err = NTErr;

// Export common utilities
export { fromPromise, fromSafePromise, ResultAsync } from 'neverthrow';
```

**Phase 2: Error Type Hierarchy**
```typescript
// src/types/errors.ts
export abstract class GroundswellError extends Error {
  abstract readonly type: string;
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly context: {
      taskId?: string;
      agentId?: string;
      workflowId?: string;
      timestamp: Date;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends GroundswellError {
  readonly type = 'validation' as const;
  readonly code = 'GS_VALIDATION_ERROR';
}

export class ExecutionError extends GroundswellError {
  readonly type = 'execution' as const;
  readonly code = 'GS_EXECUTION_ERROR';
}

export class ToolError extends GroundswellError {
  readonly type = 'tool' as const;
  readonly code = 'GS_TOOL_ERROR';

  constructor(
    message: string,
    public readonly toolName: string,
    context: Omit<GroundswellError['context'], 'cause'>
  ) {
    super(message, context);
  }
}
```

**Phase 3: AgentResponse Integration**
```typescript
// src/core/agent-response.ts
import { Result, ok, err } from '../types/result';
import { GroundswellError } from '../types/errors';

export type AgentResponse<T = unknown> = Result<T, GroundswellError>;

export function agentResponse<T>(
  result: Result<T, GroundswellError>,
  successMessage: string
): AgentResponse<T> {
  return result.match(
    (value) => ({
      success: true,
      message: successMessage,
      data: value
    }),
    (error) => ({
      success: false,
      message: error.message,
      error,
      data: error.context
    })
  );
}

export function fromAgentResponse<T>(
  response: AgentResponse<T>
): Result<T, GroundswellError> {
  if (response.success) {
    return ok(response.data as T);
  }
  return err(response.error);
}
```

**Phase 4: Gradual Migration**
1. Start with new features using Result types
2. Wrap existing throwing functions at boundaries
3. Refactor critical paths to use Results
4. Update tests to cover both success and failure paths
5. Gradually remove try-catch blocks

### Testing Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';

describe('Agent.execute', () => {
  it('should return success result on valid input', async () => {
    const agent = new Agent(testConfig);
    const result = await agent.execute('valid task');

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(expectedOutput);
    }
  });

  it('should return validation error for invalid input', async () => {
    const agent = new Agent(testConfig);
    const result = await agent.execute('');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.context.validationErrors).toContain('Task is required');
    }
  });

  it('should propagate tool errors', async () => {
    const mockTool = {
      execute: vi.fn().mockRejectedValue(new Error('Tool failed'))
    };
    const agent = new Agent(testConfig);
    agent.registerTool('testTool', mockTool);

    const result = await agent.execute('use testTool');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(ToolError);
      expect(result.error.toolName).toBe('testTool');
    }
  });
});
```

### Best Practices

1. **Always define specific error types** - Avoid generic Error when possible
2. **Use type guards** - Create type guards for discriminated unions
3. **Provide context** - Include relevant context in errors for debugging
4. **Handle errors at boundaries** - Convert external errors to internal types
5. **Test both paths** - Write tests for both success and failure cases
6. **Document error types** - Clearly document what errors can occur
7. **Use match for final handling** - Use match() for terminal error handling
8. **Chain with andThen** - Use andThen() for dependent operations
9. **Use combine for parallel** - Use combine() for independent operations
10. **Never ignore errors** - The type system will help, but be deliberate

---

## Resources

### Library Documentation
- **neverthrow**: [https://github.com/supermacro/neverthrow](https://github.com/supermacro/neverthrow)
- **ts-results**: [https://github.com/vultix/ts-results](https://github.com/vultix/ts-results)
- **Effect-TS**: [https://github.com/Effect-TS/effect](https://github.com/Effect-TS/effect)
- **fp-ts**: [https://github.com/gcanti/fp-ts](https://github.com/gcanti/fp-ts)

### Additional Reading
- Railway-Oriented Programming: [https://fsharpforfunandprofit.com/posts/recipe-part2/](https://fsharpforfunandprofit.com/posts/recipe-part2/)
- Result Type Pattern: [https://doc.rust-lang.org/book/ch09-00-recoverable-errors-with-result.html](https://doc.rust-lang.org/book/ch09-00-recoverable-errors-with-result.html)
- Error Handling Patterns: [https://martinfowler.com/articles/replaceThrowWithNotification.html](https://martinfowler.com/articles/replaceThrowWithNotification.html)

---

**End of Research Document**

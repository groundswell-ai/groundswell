# TypeScript Options and Request Interface Patterns - Research Findings

## Overview

This document compiles research findings on TypeScript best practices for Options and Request interface patterns in modern TypeScript libraries, based on analysis of popular npm packages and TypeScript documentation patterns.

**Research Date:** January 25, 2026
**Analyzed Libraries:** execa, cac, tinypool, tinybench, vitest, path utils, Anthropic SDK, Groundswell project

---

## Table of Contents

1. [Core Patterns Overview](#core-patterns-overview)
2. [Options Interface Patterns](#options-interface-patterns)
3. [Request Interface Patterns](#request-interface-patterns)
4. [JSDoc Documentation Best Practices](#jsdoc-documentation-best-practices)
5. [TypeScript Documentation Patterns](#typescript-documentation-patterns)
6. [Code Examples from Popular Libraries](#code-examples-from-popular-libraries)
7. [Key Insights and Recommendations](#key-insights-and-recommendations)

---

## Core Patterns Overview

### Pattern Categories

1. **Configuration Options Pattern** - Optional configuration objects
2. **Request/Message Wrapper Pattern** - Wrapping data with metadata
3. **Discriminated Union Pattern** - Type-safe state management
4. **Builder/Fluent Pattern** - Chainable configuration
5. **Partial/Required Pattern** - Combining mandatory and optional fields

---

## Options Interface Patterns

### 1. Basic Options Interface (Most Common)

**Pattern:** All properties are optional, using `?` modifier

**Source:** [execa](/home/dustin/projects/groundswell/node_modules/execa/index.d.ts) (lines 35-274)

```typescript
/**
 * Common options for process execution
 */
export type CommonOptions<EncodingType extends EncodingOption = DefaultEncodingOption> = {
  /**
   * Kill the spawned process when the parent process exits unless either:
   *   - the spawned process is detached
   *   - the parent process is terminated abruptly
   *
   * @default true
   */
  readonly cleanup?: boolean;

  /**
   * Prefer locally installed binaries when looking for a binary to execute.
   *
   * If you `$ npm install foo`, you can then `execa('foo')`.
   *
   * @default `true` with `$`, `false` otherwise
   */
  readonly preferLocal?: boolean;

  /**
   * Current working directory of the child process.
   *
   * @default process.cwd()
   */
  readonly cwd?: string | URL;

  /**
   * Environment key-value pairs. Extends automatically from `process.env`.
   *
   * @default process.env
   */
  readonly env?: NodeJS.ProcessEnv;

  /**
   * If `timeout` is greater than `0`, the parent will send the signal identified
   * by the `killSignal` property if the child runs longer than `timeout` milliseconds.
   *
   * @default 0
   */
  readonly timeout?: number;
};
```

**Key Characteristics:**
- All properties optional (`?`)
- Uses `readonly` modifier for immutability
- Extensive JSDoc with `@default` tags
- Type parameters for generic encoding types
- Clear descriptions of behavior and side effects

---

### 2. Hierarchical Options with Inheritance

**Pattern:** Base options extended by specific variants

**Source:** [tinybench](/home/dustin/projects/groundswell/node_modules/tinybench/dist/index.d.ts) (lines 185-222)

```typescript
/**
 * Benchmark configuration options
 */
type Options = {
  /**
   * time needed for running a benchmark task (milliseconds)
   * @default 500
   */
  time?: number;

  /**
   * number of times that a task should run if even the time option is finished
   * @default 10
   */
  iterations?: number;

  /**
   * function to get the current timestamp in milliseconds
   */
  now?: () => number;

  /**
   * An AbortSignal for aborting the benchmark
   */
  signal?: AbortSignal;

  /**
   * Throw if a task fails (events will not work if true)
   */
  throws?: boolean;

  /**
   * warmup time (milliseconds)
   * @default 100ms
   */
  warmupTime?: number;

  /**
   * warmup iterations
   * @default 5
   */
  warmupIterations?: number;

  /**
   * setup function to run before each benchmark task (cycle)
   */
  setup?: Hook;

  /**
   * teardown function to run after each benchmark task (cycle)
   */
  teardown?: Hook;
};

/**
 * Function-specific options (extends base Options)
 */
interface FnOptions {
  /**
   * An optional function that is run before iterations of this task begin
   */
  beforeAll?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run before each iteration of this task
   */
  beforeEach?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run after each iteration of this task
   */
  afterEach?: (this: Task) => void | Promise<void>;

  /**
   * An optional function that is run after all iterations of this task end
   */
  afterAll?: (this: Task) => void | Promise<void>;
}
```

**Key Characteristics:**
- Separation of global and function-specific options
- Hook functions use `this` context
- `void | Promise<void>` for sync/async compatibility
- Clear lifecycle: beforeAll → beforeEach → afterEach → afterAll

---

### 3. Intersection Pattern for Composed Options

**Pattern:** Using `&` to compose multiple option types

**Source:** [execa](/home/dustin/projects/groundswell/node_modules/execa/index.d.ts) (lines 276-306)

```typescript
export type Options<EncodingType extends EncodingOption = DefaultEncodingOption> = {
  /**
   * Write some input to the `stdin` of your binary.
   *
   * If the input is a file, use the `inputFile` option instead.
   */
  readonly input?: string | Buffer | ReadableStream;

  /**
   * Use a file as input to the the `stdin` of your binary.
   *
   * If the input is not a file, use the `input` option instead.
   */
  readonly inputFile?: string;
} & CommonOptions<EncodingType>;

export type SyncOptions<EncodingType extends EncodingOption = DefaultEncodingOption> = {
  /**
   * Write some input to the `stdin` of your binary.
   */
  readonly input?: string | Buffer;

  /**
   * Use a file as input to the the `stdin` of your binary.
   */
  readonly inputFile?: string;
} & CommonOptions<EncodingType>;

export type NodeOptions<EncodingType extends EncodingOption = DefaultEncodingOption> = {
  /**
   * The Node.js executable to use.
   *
   * @default process.execPath
   */
  readonly nodePath?: string;

  /**
   * List of CLI options passed to the Node.js executable.
   *
   * @default process.execArgv
   */
  readonly nodeOptions?: string[];
} & Options<EncodingType>;
```

**Key Characteristics:**
- Base `CommonOptions` shared across variants
- Specific options defined per variant
- Type narrowing via intersection
- `SyncOptions` removes `ReadableStream` (sync can't use streams)
- `NodeOptions` adds Node-specific properties

---

### 4. Required vs Optional with Filled Variant

**Pattern:** Separate interface for fully-specified options

**Source:** [tinypool](/home/dustin/projects/groundswell/node_modules/tinypool/dist/index.d.ts) (lines 149-181)

```typescript
interface Options {
  filename?: string | null;
  runtime?: 'worker_threads' | 'child_process';
  name?: string;
  minThreads?: number;
  maxThreads?: number;
  idleTimeout?: number;
  terminateTimeout?: number;
  maxQueue?: number | 'auto';
  concurrentTasksPerWorker?: number;
  useAtomics?: boolean;
  resourceLimits?: ResourceLimits;
  maxMemoryLimitBeforeRecycle?: number;
  argv?: string[];
  execArgv?: string[];
  env?: Record<string, string>;
  workerData?: any;
  taskQueue?: TaskQueue;
  trackUnmanagedFds?: boolean;
  isolateWorkers?: boolean;
}

/**
 * Filled options with all required fields populated
 * Used internally when defaults are applied
 */
interface FilledOptions extends Options {
  filename: string | null;
  name: string;
  runtime: NonNullable<Options['runtime']>;
  minThreads: number;
  maxThreads: number;
  idleTimeout: number;
  maxQueue: number;
  concurrentTasksPerWorker: number;
  useAtomics: boolean;
  taskQueue: TaskQueue;
}
```

**Key Characteristics:**
- `Options`: User-provided (all optional)
- `FilledOptions`: Internal (all required with defaults)
- Uses `NonNullable<T>` utility type
- Pattern: Public API accepts partial, internal uses filled

---

### 5. Test/Task Options with Modifiers

**Pattern:** Options with boolean mode switches

**Source:** [@vitest/runner](/home/dustin/projects/groundswell/node_modules/@vitest/runner/dist/tasks-K5XERDtv.d.ts) (lines 129-174)

```typescript
interface TestOptions {
  /**
   * Test timeout.
   */
  timeout?: number;

  /**
   * Times to retry the test if fails. Useful for making flaky tests more stable.
   * When retries is up, the last test error will be thrown.
   *
   * @default 0
   */
  retry?: number;

  /**
   * How many times the test will run.
   * Only inner tests will repeat if set on `describe()`, nested `describe()` will inherit parent's repeat by default.
   *
   * @default 0
   */
  repeats?: number;

  /**
   * Whether tests run concurrently.
   * Tests inherit `concurrent` from `describe()` and nested `describe()` will inherit from parent's `concurrent`.
   */
  concurrent?: boolean;

  /**
   * Whether tests run sequentially.
   * Tests inherit `sequential` from `describe()` and nested `describe()` will inherit from parent's `sequential`.
   */
  sequential?: boolean;

  /**
   * Whether the test should be skipped.
   */
  skip?: boolean;

  /**
   * Should this test be the only one running in a suite.
   */
  only?: boolean;

  /**
   * Whether the test should be skipped and marked as a todo.
   */
  todo?: boolean;

  /**
   * Whether the test is expected to fail. If it does, the test will pass, otherwise it will fail.
   */
  fails?: boolean;
}
```

**Key Characteristics:**
- Mode switches: `skip`, `only`, `todo`, `fails`
- Inheritance pattern: nested suites inherit parent options
- Retry/repeat mechanisms for flaky tests
- Clear JSDoc explaining inheritance behavior

---

## Request Interface Patterns

### 1. Message/Request Interfaces for IPC

**Pattern:** Structured messages with identifiers and payloads

**Source:** [tinypool](/home/dustin/projects/groundswell/node_modules/tinypool/dist/index.d.ts) (lines 64-89)

```typescript
/**
 * Tinypool's internal messaging between main thread and workers.
 * - Utilizers can use `__tinypool_worker_message__` property to identify
 *   these messages and ignore them.
 */
interface TinypoolWorkerMessage<T extends 'port' | 'pool' = 'port' | 'pool'> {
  __tinypool_worker_message__: true;
  source: T;
}

interface StartupMessage {
  filename: string | null;
  name: string;
  port: MessagePort;
  sharedBuffer: Int32Array;
  useAtomics: boolean;
}

interface RequestMessage {
  taskId: number;
  task: any;
  filename: string;
  name: string;
}

interface ReadyMessage {
  ready: true;
}

interface ResponseMessage {
  taskId: number;
  result: any;
  error: unknown | null;
  usedMemory: number;
}
```

**Key Characteristics:**
- Discriminator fields for message type identification
- `taskId` for request-response correlation
- Typed payloads per message type
- `error: unknown | null` pattern for error handling

---

### 2. Run Options (Request-time Options)

**Pattern:** Options specific to individual requests/operations

**Source:** [tinypool](/home/dustin/projects/groundswell/node_modules/tinypool/dist/index.d.ts) (lines 182-189)

```typescript
interface RunOptions {
  transferList?: TransferList;
  channel?: TinypoolChannel;
  filename?: string | null;
  signal?: AbortSignalAny | null;
  name?: string | null;
  runtime?: Options['runtime'];  // References parent Options type
}

// Usage in class:
declare class Tinypool extends EventEmitterAsyncResource {
  run(task: any, options?: RunOptions): Promise<any>;
}
```

**Key Characteristics:**
- Overrides/extends constructor options
- `signal` for cancellation (AbortController pattern)
- `transferList` for zero-copy transfers (worker threads)
- References parent `Options` type for shared properties

---

### 3. Agent Request Pattern with Options

**Pattern:** Request objects combining prompt content with configuration

**Source:** [Groundswell Agent Types](/home/dustin/projects/groundswell/src/types/agent.ts) (lines 9-91)

```typescript
/**
 * Configuration for creating an Agent instance
 * All Anthropic SDK properties pass through unchanged
 */
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;

  /** System prompt for the agent */
  system?: string;

  /** Tools available to the agent */
  tools?: Tool[];

  /** MCP servers to connect */
  mcps?: MCPServer[];

  /** Skills to load */
  skills?: Skill[];

  /** Lifecycle hooks */
  hooks?: AgentHooks;

  /** Environment variables for agent execution */
  env?: Record<string, string>;

  /** Enable reflection capability for this agent */
  enableReflection?: boolean;

  /** Enable caching of prompt responses */
  enableCache?: boolean;

  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;
}

/**
 * Overrides that can be applied at the prompt level
 * Takes precedence over AgentConfig values
 */
export interface PromptOverrides {
  /** Override system prompt for this prompt */
  system?: string;

  /** Override tools for this prompt */
  tools?: Tool[];

  /** Override MCPs for this prompt */
  mcps?: MCPServer[];

  /** Override skills for this prompt */
  skills?: Skill[];

  /** Override hooks for this prompt */
  hooks?: AgentHooks;

  /** Override environment variables */
  env?: Record<string, string>;

  /** Override temperature */
  temperature?: number;

  /** Override max tokens */
  maxTokens?: number;

  /** Stop sequences to use */
  stop?: string[];

  /** Disable cache for this prompt */
  disableCache?: boolean;

  /** Enable reflection for this prompt */
  enableReflection?: boolean;

  /** Override model for this prompt */
  model?: string;
}
```

**Key Characteristics:**
- `AgentConfig`: Constructor-level configuration
- `PromptOverrides`: Per-request configuration
- Override pattern: prompt-level takes precedence
- Clear documentation of precedence

---

## JSDoc Documentation Best Practices

### 1. Multi-line JSDoc with Examples

**Source:** [execa](/home/dustin/projects/groundswell/node_modules/execa/index.d.ts) (lines 231-249)

```typescript
/**
 * You can abort the spawned process using [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
 *
 * When `AbortController.abort()` is called, [`.isCanceled`](https://github.com/sindresorhus/execa#iscanceled) becomes `true`.
 *
 * @example
 * ```
 * import {execa} from 'execa';
 *
 * const abortController = new AbortController();
 * const subprocess = execa('node', [], {signal: abortController.signal});
 *
 * setTimeout(() => {
 *   abortController.abort();
 * }, 1000);
 *
 * try {
 *   await subprocess;
 * } catch (error) {
 *   console.log(subprocess.killed); // true
 *   console.log(error.isCanceled); // true
 * }
 * ```
 */
readonly signal?: AbortSignal;
```

**Best Practices:**
- Links to external documentation (MDN, GitHub)
- Complete runnable examples
- Shows both success and error cases
- Uses code blocks with language tags

---

### 2. Default Values with @default Tag

**Source:** [execa](/home/dustin/projects/groundswell/node_modules/execa/index.d.ts)

```typescript
/**
 * Kill the spawned process when the parent process exits unless either:
 *   - the spawned process is [`detached`](https://nodejs.org/api/child_process.html#child_process_options_detached)
 *   - the parent process is terminated abruptly, for example, with `SIGKILL` as opposed to `SIGTERM` or a normal exit
 *
 * @default true
 */
readonly cleanup?: boolean;

/**
 * Current working directory of the child process.
 *
 * @default process.cwd()
 */
readonly cwd?: string | URL;
```

**Best Practices:**
- Always use `@default` for optional properties
- Show computed defaults (e.g., `process.cwd()`)
- Document conditions affecting default value
- Use bulleted lists for complex conditions

---

### 3. Param, Returns, and Throws Documentation

**Source:** [execa](/home/dustin/projects/groundswell/node_modules/execa/index.d.ts) (lines 540-564)

```typescript
/**
 * Executes a command using `file ...arguments`. `arguments` are specified as an array of strings. Returns a `childProcess`.
 *
 * Arguments are automatically escaped. They can contain any character, including spaces.
 *
 * This is the preferred method when executing single commands.
 *
 * @param file - The program/script to execute.
 * @param arguments - Arguments to pass to `file` on execution.
 * @returns An `ExecaChildProcess` that is both:
 *  - a `Promise` resolving or rejecting with a `childProcessResult`.
 *  - a [`child_process` instance](https://nodejs.org/api/child_process.html#child_process_class_childprocess) with some additional methods and properties.
 * @throws A `childProcessResult` error
 *
 * @example <caption>Promise interface</caption>
 * ```
 * import {execa} from 'execa';
 *
 * const {stdout} = await execa('echo', ['unicorns']);
 * console.log(stdout);
 * //=> 'unicorns'
 * ```
 *
 * @example <caption>Redirect output to a file</caption>
 * ```
 * import {execa} from 'execa';
 *
 * // Similar to `echo unicorns > stdout.txt` in Bash
 * await execa('echo', ['unicorns']).pipeStdout('stdout.txt');
 * ```
 */
export function execa(
  file: string,
  arguments?: readonly string[],
  options?: Options
): ExecaChildProcess;
```

**Best Practices:**
- Clear description of behavior
- `@param` with parameter names and descriptions
- `@returns` with type and behavior description
- `@throws` documenting error conditions
- Multiple `@example` blocks with `<caption>` tags
- HTML entity encoding in examples (`&gt;` for `>`)

---

### 4. Interface-Level Documentation

**Source:** [Groundswell Agent Types](/home/dustin/projects/groundswell/src/types/agent.ts) (lines 96-160)

```typescript
/**
 * Response wrapper for agent execution results
 *
 * ## PRD 6.4 Response Requirements
 *
 * All AgentResponse instances MUST satisfy:
 *
 * 1. **Strict JSON** (PRD 6.4.1): Must be parseable by `JSON.parse()`
 * 2. **No Prose Wrapping** (PRD 6.4.2): No markdown code blocks or text
 * 3. **Consistent Structure** (PRD 6.4.3): Must conform to this interface
 * 4. **Null over Undefined** (PRD 6.4.4): Use `null` for absent values
 * 5. **Error Responses** (PRD 6.4.5): Failed operations return valid JSON
 *
 * ## Type Narrowing
 *
 * The `status` field is a discriminant. Use type guards to narrow types:
 * - `isSuccess(response)` → `SuccessResponse<T>` (data is T, error is null)
 * - `isError(response)` → `ErrorResponse` (data is null, error exists)
 * - `isPartial(response)` → `PartialResponse<T>` (data is T, error is null)
 *
 * @template T - The type of data returned on success (unknown by default)
 * @see {@link SuccessResponse}, {@link ErrorResponse}, {@link PartialResponse}
 *
 * @example <caption>Success response (PRD 6.5)</caption>
 * ```ts
 * const response: AgentResponse<{ result: string; artifacts: string[] }> = {
 *   status: 'success',
 *   data: { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
 *   error: null,
 *   metadata: { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
 * };
 * ```
 */
export interface AgentResponse<T = unknown> {
  // ...
}
```

**Best Practices:**
- Markdown sections with `##` headers
- Numbered lists for requirements
- Code snippets for type guards
- `@template` for generic type parameters
- `@see` tags for related types
- `@example` with `<caption>` for examples

---

### 5. Property-Level Documentation

**Source:** [Groundswell Agent Types](/home/dustin/projects/groundswell/src/types/agent.ts) (lines 284-339)

```typescript
export interface AgentResponseMetadata {
  /**
   * Agent identifier (required)
   *
   * Uniquely identifies the agent or workflow that generated this response.
   * Should be stable across multiple invocations of the same agent.
   */
  agentId: string;

  /**
   * Unix timestamp in milliseconds (required)
   *
   * The time when the response was generated, as a Unix timestamp in
   * milliseconds since the epoch (January 1, 1970). Use Date.now() to
   * generate current timestamps.
   *
   * @example
   * ```ts
   * timestamp: Date.now()  // Current time in milliseconds
   * timestamp: 1706140800000  // Fixed timestamp
   * ```
   */
  timestamp: number;

  /**
   * Execution duration in milliseconds (optional)
   *
   * The time taken to execute the agent prompt, from start to completion.
   * Useful for performance monitoring and debugging.
   */
  duration?: number | null;

  /**
   * Request correlation ID (optional)
   *
   * Used for tracing requests across distributed systems. Correlates
   * this response with the original request and any downstream calls.
   */
  requestId?: string | null;

  /**
   * Token usage from the API (optional, for backward compatibility)
   *
   * Breakdown of token usage including input, output, and cache tokens.
   * Only present when the API returns token usage information.
   */
  usage?: TokenUsage;

  /**
   * Number of tool invocations (optional, for backward compatibility)
   *
   * The count of tool/function calls made during agent execution.
   * Useful for tracking agent behavior and cost analysis.
   */
  toolCalls?: number;
}
```

**Best Practices:**
- First sentence: summary (what it is)
- Second sentence: details (why/how to use)
- `@example` blocks for non-obvious values
- Note if optional or required
- Document optional fields with `| null` pattern

---

## TypeScript Documentation Patterns

### 1. Discriminated Union Documentation

**Pattern:** Document discriminants and type narrowing

**Source:** [Groundswell Agent Types](/home/dustin/projects/groundswell/src/types/agent.ts) (lines 345-413)

```typescript
/**
 * Success response type - data is T (not null), error is null
 *
 * Use this type with type guards for type-safe access to response data.
 * When a response has status 'success', data is guaranteed to be T (not null).
 *
 * Per PRD 6.4.3: Consistent Structure - all success responses conform
 * to the AgentResponse interface with status 'success'.
 *
 * @template T - The type of data returned on success
 * @see {@link isSuccess} for the type guard that narrows to this type
 *
 * @example
 * ```ts
 * // Type narrowing with type guard
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 *   console.log(response.error); // TypeScript knows error is null
 * }
 * ```
 */
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };

/**
 * Error response type - data is null, error is AgentErrorDetails (not null)
 *
 * Use this type with type guards for type-safe access to error details.
 * When a response has status 'error', error is guaranteed to be AgentErrorDetails (not null).
 *
 * Per PRD 6.4.5: Error Responses - failed operations must still return
 * valid JSON with status 'error' and populated error field.
 *
 * @see {@link isError} for the type guard that narrows to this type
 * @see {@link AgentErrorDetails} for error details structure
 */
export type ErrorResponse = AgentResponse<null> & { status: 'error' };
```

---

### 2. Factory Function Documentation

**Pattern:** Document creation functions with PRD compliance notes

**Source:** [Groundswell Agent Types](/home/dustin/projects/groundswell/src/types/agent.ts) (lines 499-550)

```typescript
/**
 * Creates a success response with data and metadata.
 *
 * ## PRD 6.4 Compliance
 *
 * The returned response satisfies all PRD 6.4 requirements:
 * - Strict JSON parseable by `JSON.parse()` (PRD 6.4.1)
 * - No prose wrapping - pure JSON structure (PRD 6.4.2)
 * - Consistent with AgentResponse interface (PRD 6.4.3)
 * - Uses null instead of undefined (PRD 6.4.4)
 *
 * @template T - The type of the response data
 * @param data - The response data to return
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse with status 'success', provided data, null error
 *
 * @example <caption>Basic success response (PRD 6.5)</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
 *   { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
 * );
 *
 * // Guaranteed to be valid JSON (PRD 6.4.1)
 * const jsonString = JSON.stringify(response);
 * const parsed = JSON.parse(jsonString); // Always valid
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}
```

---

### 3. Constant Object Documentation

**Pattern:** Document constant enums/objects with inline JSDoc

**Source:** [Groundswell Agent Types](/home/dustin/projects/groundswell/src/types/agent.ts) (lines 419-493)

```typescript
/**
 * Standard error codes for agent responses
 *
 * All error codes use SCREAMING_SNAKE_CASE convention.
 *
 * Per PRD 6.6: Use `INVALID_RESPONSE_FORMAT` for responses that
 * don't conform to the AgentResponse schema. Validation failures
 * should be treated as errors with this code.
 *
 * @see {@link AgentErrorDetails} for error details structure
 * @see {@link createErrorResponse} for factory function
 *
 * @example
 * ```ts
 * import { AGENT_ERROR_CODES, createErrorResponse } from 'groundswell';
 *
 * const error = createErrorResponse(
 *   AGENT_ERROR_CODES.VALIDATION_FAILED,
 *   'Invalid input',
 *   { field: 'email', value: 'not-an-email' }
 * );
 * ```
 */
export const AGENT_ERROR_CODES = {
  /**
   * Response not valid JSON or doesn't match AgentResponse schema
   *
   * Per PRD 6.6: Invalid responses must be treated as errors with this code.
   * Use when response validation fails during parsing or schema checking.
   */
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',

  /**
   * Input validation failed
   *
   * Use when the provided inputs fail validation checks (e.g., wrong type,
   * missing required fields, out-of-range values).
   */
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  /**
   * Agent execution failed
   *
   * Use when the agent execution fails for reasons unrelated to validation
   * or API requests (e.g., compilation errors, runtime exceptions).
   */
  EXECUTION_FAILED: 'EXECUTION_FAILED',

  /**
   * API request to LLM provider failed
   *
   * Use when the HTTP request to the LLM provider fails (e.g., network errors,
   * timeout, rate limiting, provider-side errors).
   */
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',

  /**
   * Tool execution failed
   *
   * Use when a tool/function invocation fails during agent execution
   * (e.g., tool not found, tool returned error, tool timeout).
   */
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',

  /**
   * Internal validation or system error
   *
   * Use when an internal validation fails or a system error occurs.
   * This indicates a bug in the code (e.g., factory helper produced invalid response).
   * Non-recoverable because retrying with the same inputs will produce the same error.
   *
   * Per PRD 6.6: Internal validation failures should return this error code.
   */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

---

## Code Examples from Popular Libraries

### Example 1: CLI Option Pattern (cac)

**Source:** [cac](/home/dustin/projects/groundswell/node_modules/cac/dist/index.d.ts) (lines 3-19)

```typescript
interface OptionConfig {
  default?: any;
  type?: any[];
}

declare class Option {
  rawName: string;
  description: string;
  /** Option name */
  name: string;
  /** Option name and aliases */
  names: string[];
  isBoolean?: boolean;
  required?: boolean;
  config: OptionConfig;
  negated: boolean;
  constructor(rawName: string, description: string, config?: OptionConfig);
}

interface CommandConfig {
  allowUnknownOptions?: boolean;
  ignoreOptionDefaultValue?: boolean;
}

declare class Command {
  rawName: string;
  description: string;
  config: CommandConfig;
  cli: CAC;
  options: Option[];
  // ...

  /**
   * Add a option for this command
   * @param rawName Raw option name(s)
   * @param description Option description
   * @param config Option config
   */
  option(rawName: string, description: string, config?: OptionConfig): this;

  /**
   * Check if a command name is matched by this command
   * @param name Command name
   */
  isMatched(name: string): boolean;

  /**
   * Check if an option is registered in this command
   * @param name Option name
   */
  hasOption(name: string): Option | undefined;
}
```

**Key Patterns:**
- Class-based option system
- Fluent interface (`return this`)
- Config objects for complex options
- Method-level JSDoc

---

### Example 2: Worker Pool Options (tinypool)

**Source:** [tinypool](/home/dustin/projects/groundswell/node_modules/tinypool/dist/index.d.ts) (lines 149-209)

```typescript
interface Options {
  filename?: string | null;
  runtime?: 'worker_threads' | 'child_process';
  name?: string;
  minThreads?: number;
  maxThreads?: number;
  idleTimeout?: number;
  terminateTimeout?: number;
  maxQueue?: number | 'auto';
  concurrentTasksPerWorker?: number;
  useAtomics?: boolean;
  resourceLimits?: ResourceLimits;
  maxMemoryLimitBeforeRecycle?: number;
  argv?: string[];
  execArgv?: string[];
  env?: Record<string, string>;
  workerData?: any;
  taskQueue?: TaskQueue;
  trackUnmanagedFds?: boolean;
  isolateWorkers?: boolean;
}

interface FilledOptions extends Options {
  filename: string | null;
  name: string;
  runtime: NonNullable<Options['runtime']>;
  minThreads: number;
  maxThreads: number;
  idleTimeout: number;
  maxQueue: number;
  concurrentTasksPerWorker: number;
  useAtomics: boolean;
  taskQueue: TaskQueue;
}

declare class Tinypool extends EventEmitterAsyncResource {
  #private;
  constructor(options?: Options);
  run(task: any, options?: RunOptions): Promise<any>;
  destroy(): Promise<void>;
  get options(): FilledOptions;
  get threads(): TinypoolWorker[];
  get queueSize(): number;
  cancelPendingTasks(): void;
  recycleWorkers(options?: Pick<Options, 'runtime'>): Promise<void>;
  get completed(): number;
  get duration(): number;
}
```

**Key Patterns:**
- Constructor options vs runtime options
- `FilledOptions` for internal representation
- Getters for computed properties
- `Pick<Options, 'runtime'>` for option subsets

---

### Example 3: Provider Capabilities Pattern

**Source:** [Groundswell Providers](/home/dustin/projects/groundswell/src/types/providers.ts)

```typescript
/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId =
  | 'anthropic'
  | 'opencode';

/**
 * Provider capability flags
 * Indicates which features a provider supports
 */
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}
```

**Key Patterns:**
- Union type for string literals
- Boolean capability flags
- Simple, flat interface
- Clear purpose: feature detection

---

## Key Insights and Recommendations

### 1. Options Interface Best Practices

**DO:**
- Use `readonly` modifier for immutability
- Make all properties optional with `?`
- Use intersection (`&`) to compose option types
- Provide `@default` tags for all defaults
- Use type parameters for generic variants
- Create `FilledOptions` variant for internal use
- Use `NonNullable<T>` for required variant fields

**DON'T:**
- Mix required and optional properties in public Options
- Use `any` without documentation
- Forget to document inherited behavior
- Make options too nested (prefer flat structure)

---

### 2. Request Interface Best Practices

**DO:**
- Include discriminator fields for type narrowing
- Use correlation IDs for request-response matching
- Support `AbortSignal` for cancellation
- Separate request-time vs constructor-time options
- Use discriminated unions for variants
- Include metadata (timestamps, IDs, etc.)

**DON'T:**
- Create overly generic request types
- Forget to document the request lifecycle
- Mix concerns (e.g., config + data)
- Use opaque types without clear structure

---

### 3. JSDoc Best Practices

**DO:**
- Use `@param`, `@returns`, `@throws`, `@example`
- Provide complete runnable examples
- Use `@default` for default values
- Link to external docs with markdown links
- Use `<caption>` in `@example` blocks
- Document both "what" and "why"
- Include usage patterns in examples
- Use `@template` for generic parameters

**DON'T:**
- Write vague descriptions ("the options")
- Forget to document edge cases
- Use abbreviations without explanation
- Over-document obvious code
- Neglect error conditions

---

### 4. Type System Patterns

**DO:**
- Use discriminated unions for state machines
- Create type guards for runtime checking
- Use `as const` for immutable objects
- Leverage utility types (`Pick`, `Omit`, `Partial`, `Required`)
- Use `NonNullable<T>` for type narrowing
- Create factory functions for complex types

**DON'T:**
- Over-complicate type signatures
- Use type assertions without necessity
- Create circular type dependencies
- Ignore type safety for "convenience"

---

### 5. Documentation Structure

**Recommended Section Order:**
1. Brief description (1-2 sentences)
2. Behavioral notes (warnings, side effects)
3. Requirements/Constraints (numbered list)
4. Type narrowing information (if applicable)
5. `@template`, `@param`, `@returns`
6. `@example` blocks with `<caption>`
7. `@see` references

---

### 6. Naming Conventions

**Interface Naming:**
- Configuration: `*Options`, `*Config`, `*Settings`
- Requests/Messages: `*Request`, `*Message`, `*Command`
- Responses: `*Response`, `*Result`, `*Output`
- Metadata: `*Metadata`, `*Info`, `*Details`

**Property Naming:**
- Booleans: `is*`, `has*`, `should*`, `enable*`, `disable*`
- Callbacks: `on*`, `before*`, `after*`
- Counts: `*Count`, `*Number`, `num*`
- IDs: `*Id` (not `*ID` or `*Id`)

---

### 7. Common Patterns Summary

| Pattern | Use Case | Example Libraries |
|---------|----------|-------------------|
| All optional properties | Configuration objects | execa, tinypool, tinybench |
| Intersection composition | Shared base options | execa (CommonOptions) |
| Filled variant | Internal defaults | tinypool |
| Discriminated unions | State/response types | Groundswell AgentResponse |
| Builder/fluent | Chainable config | cac CLI |
| Request wrapper | IPC/messages | tinypool, vitest |
| Factory functions | Complex type creation | Groundswell AgentResponse |

---

### 8. Recommended Groundswell Patterns

Based on this research, here are recommended patterns for Groundswell:

**For Options:**
```typescript
export interface WorkflowOptions {
  /** Human-readable name */
  name?: string;

  /** Enable debug logging */
  enableDebug?: boolean;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Execution hooks */
  hooks?: WorkflowHooks;
}

export interface FilledWorkflowOptions extends WorkflowOptions {
  name: string;
  enableDebug: boolean;
  timeout: number;
  hooks: WorkflowHooks;
}
```

**For Request/Response:**
```typescript
export interface WorkflowRequest {
  /** Unique request identifier */
  requestId: string;

  /** Workflow to execute */
  workflow: string;

  /** Input data */
  input: unknown;

  /** Request options */
  options?: WorkflowRequestOptions;
}

export interface WorkflowResponse<T = unknown> {
  /** Response status */
  status: 'success' | 'error' | 'partial';

  /** Response data (null on error) */
  data: T | null;

  /** Error details (null on success) */
  error: WorkflowError | null;

  /** Response metadata */
  metadata: WorkflowMetadata;
}
```

---

## Sources and References

### Analyzed Libraries

1. **execa** - Process execution library
   - Path: `/home/dustin/projects/groundswell/node_modules/execa/index.d.ts`
   - Patterns: Comprehensive options, intersection types, JSDoc examples

2. **cac** - CLI argument parser
   - Path: `/home/dustin/projects/groundswell/node_modules/cac/dist/index.d.ts`
   - Patterns: Builder pattern, option config objects

3. **tinypool** - Worker thread pool
   - Path: `/home/dustin/projects/groundswell/node_modules/tinypool/dist/index.d.ts`
   - Patterns: Filled options, IPC message types

4. **tinybench** - Benchmark library
   - Path: `/home/dustin/projects/groundswell/node_modules/tinybench/dist/index.d.ts`
   - Patterns: Hierarchical options, hook functions

5. **@vitest/runner** - Test runner
   - Path: `/home/dustin/projects/groundswell/node_modules/@vitest/runner/dist/tasks-K5XERDtv.d.ts`
   - Patterns: Test options, task interfaces, chainable APIs

6. **Groundswell** - Project being analyzed
   - Path: `/home/dustin/projects/groundswell/src/types/`
   - Patterns: Agent response types, provider capabilities

### External Resources (Accessed via Knowledge)

While web search tools were unavailable during this research, the following resources are recommended for further reading:

- TypeScript Handbook: Interface documentation patterns
- Microsoft API Guidelines: Naming conventions
- TSDoc: Standard for TypeScript documentation
- Semantic Versioning: Version compatibility

---

## Conclusion

This research identifies consistent patterns across popular TypeScript libraries:

1. **Options interfaces** universally use optional properties with extensive JSDoc
2. **Request/Response patterns** favor discriminated unions for type safety
3. **Documentation** includes examples, defaults, and behavioral notes
4. **Type composition** uses intersections and utility types effectively
5. **Immutability** is enforced via `readonly` modifiers

The Groundswell project already follows many of these best practices, particularly in its AgentResponse types with discriminated unions and comprehensive JSDoc documentation.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-25
**Researcher:** Claude Agent (Groundswell Project)

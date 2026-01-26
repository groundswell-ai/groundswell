# Workflows

Workflows are hierarchical task containers with built-in logging, state observation, and event emission.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Functional Pattern](#functional-pattern)
- [Decorators](#decorators)
- [Parent-Child Workflows](#parent-child-workflows)
- [Observers](#observers)
- [Tree Debugger](#tree-debugger)
- [Error Handling](#error-handling)
- [Agent Response Validation](#agent-response-validation)
- [Concurrent Execution](#concurrent-execution)
- [API Reference](#api-reference)

## Basic Usage

Extend `Workflow` and implement `run()`:

```typescript
import { Workflow } from 'groundswell';

class DataProcessor extends Workflow {
  async run(): Promise<string[]> {
    this.setStatus('running');
    this.logger.info('Processing started');

    const result = await this.processData();

    this.setStatus('completed');
    return result;
  }

  private async processData(): Promise<string[]> {
    return ['item1', 'item2'];
  }
}

const workflow = new DataProcessor('MyProcessor');
const result = await workflow.run();
```

### Workflow Status

```
idle -> running -> completed
                -> failed
                -> cancelled
```

| Status | Description |
|--------|-------------|
| `idle` | Created but not started |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Terminated with error |
| `cancelled` | Manually cancelled |

### Logger

Every workflow has a built-in logger:

```typescript
this.logger.debug('Debug message', { data });
this.logger.info('Info message');
this.logger.warn('Warning message');
this.logger.error('Error message', { error });
```

## Functional Pattern

Create workflows without subclassing:

```typescript
import { createWorkflow } from 'groundswell';

const workflow = createWorkflow(
  { name: 'DataPipeline', enableReflection: true },
  async (ctx) => {
    const loaded = await ctx.step('load', async () => {
      return fetchData();
    });

    const processed = await ctx.step('process', async () => {
      return transform(loaded);
    });

    await ctx.step('save', async () => {
      return persist(processed);
    });

    return processed;
  }
);

const result = await workflow.run();
console.log(result.data);      // The actual result
console.log(result.duration);  // Execution time in ms
```

### WorkflowContext

The context provides methods for composing workflows:

| Method | Description |
|--------|-------------|
| `step(name, fn)` | Execute a named step with event tracking |
| `spawnWorkflow(workflow)` | Spawn and attach a child workflow |
| `replaceLastPromptResult(prompt, agent)` | Replace last prompt result without tree branching |

## Decorators

### @Step

Wraps methods with event emission and error handling.

```typescript
import { Step } from 'groundswell';

class MyWorkflow extends Workflow {
  // Default - emits stepStart/stepEnd events
  @Step()
  async basicStep(): Promise<void> {}

  // Custom name
  @Step({ name: 'CustomStepName' })
  async namedStep(): Promise<void> {}

  // Capture state after completion
  @Step({ snapshotState: true })
  async snapshotStep(): Promise<void> {}

  // Track execution duration
  @Step({ trackTiming: true })
  async timedStep(): Promise<void> {}

  // Log start/end messages
  @Step({ logStart: true, logFinish: true })
  async loggedStep(): Promise<void> {}

  // All options
  @Step({
    name: 'FullStep',
    snapshotState: true,
    trackTiming: true,
    logStart: true,
    logFinish: true,
  })
  async fullStep(): Promise<void> {}
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Custom step name (defaults to method name) |
| `snapshotState` | `boolean` | Capture state snapshot after step completion |
| `trackTiming` | `boolean` | Track and emit step duration |
| `logStart` | `boolean` | Log message when step starts |
| `logFinish` | `boolean` | Log message when step completes |

### @Task

Wraps methods that return child workflows.

```typescript
import { Task } from 'groundswell';

class ParentWorkflow extends Workflow {
  // Basic - attaches returned workflow as child
  @Task()
  async createChild(): Promise<ChildWorkflow> {
    return new ChildWorkflow('Child', this);
  }

  // Custom name
  @Task({ name: 'SpawnWorker' })
  async spawnWorker(): Promise<WorkerWorkflow> {
    return new WorkerWorkflow('Worker', this);
  }

  // Concurrent - runs all returned workflows in parallel
  @Task({ concurrent: true })
  async createWorkers(): Promise<WorkerWorkflow[]> {
    return [
      new WorkerWorkflow('W1', this),
      new WorkerWorkflow('W2', this),
      new WorkerWorkflow('W3', this),
    ];
  }

  async run(): Promise<void> {
    const child = await this.createChild();
    await child.run();
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Custom task name |
| `concurrent` | `boolean` | Run returned workflows in parallel |

### @ObservedState

Marks fields for inclusion in state snapshots.

```typescript
import { ObservedState, getObservedState } from 'groundswell';

class MyWorkflow extends Workflow {
  // Included in snapshots
  @ObservedState()
  progress = 0;

  // Shown as '***' in snapshots
  @ObservedState({ redact: true })
  apiKey = 'secret';

  // Excluded from snapshots
  @ObservedState({ hidden: true })
  internalState = {};

  async run(): Promise<void> {
    this.progress = 50;

    // Get current state snapshot
    const state = getObservedState(this);
    // { progress: 50, apiKey: '***' }
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `hidden` | `boolean` | Exclude field from snapshots entirely |
| `redact` | `boolean` | Show value as `'***'` in snapshots |

## Parent-Child Workflows

Workflows form a hierarchy. Pass the parent to the constructor:

```typescript
class ChildWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Child executing');
    this.setStatus('completed');
  }
}

class ParentWorkflow extends Workflow {
  @Task()
  async spawnChild(): Promise<ChildWorkflow> {
    return new ChildWorkflow('Child', this); // 'this' is parent
  }

  async run(): Promise<void> {
    this.setStatus('running');

    const child = await this.spawnChild();
    await child.run();

    // Access children
    console.log(this.children.length); // 1

    this.setStatus('completed');
  }
}
```

Events from children propagate to observers on the root workflow.

## Observers

Attach observers to the root workflow to receive all events:

```typescript
import { WorkflowObserver, LogEntry, WorkflowEvent, WorkflowNode } from 'groundswell';

const observer: WorkflowObserver = {
  onLog(entry: LogEntry): void {
    console.log(`[${entry.level}] ${entry.message}`);
  },

  onEvent(event: WorkflowEvent): void {
    console.log(`Event: ${event.type}`);
  },

  onStateUpdated(node: WorkflowNode): void {
    console.log(`State updated: ${node.name}`);
  },

  onTreeChanged(root: WorkflowNode): void {
    console.log('Tree structure changed');
  },
};

const workflow = new MyWorkflow('Root');
workflow.addObserver(observer);
await workflow.run();
```

### Event Types

| Type | Description |
|------|-------------|
| `stepStart` | Step execution started |
| `stepEnd` | Step completed, includes `duration` |
| `taskStart` | Task execution started |
| `taskEnd` | Task completed |
| `childAttached` | Child workflow attached |
| `stateSnapshot` | State snapshot captured |
| `error` | Error occurred |
| `invalidResponse` | Agent response validation failed |
| `treeUpdated` | Tree structure changed |

## Tree Debugger

Visualize workflow execution:

```typescript
import { WorkflowTreeDebugger } from 'groundswell';

const workflow = new ParentWorkflow('Root');
const debugger_ = new WorkflowTreeDebugger(workflow);

await workflow.run();

// ASCII tree
console.log(debugger_.toTreeString());
// Root [completed]
//   Child-1 [completed]
//   Child-2 [completed]

// Formatted logs
console.log(debugger_.toLogString());

// Statistics
console.log(debugger_.getStats());
// { totalNodes: 3, byStatus: { completed: 3 }, totalLogs: 10, totalEvents: 15 }

// Find node by ID
const node = debugger_.getNode(workflow.id);

// Subscribe to events
debugger_.events.subscribe({
  next: (event) => console.log(event.type),
});
```

### Status Symbols

| Symbol | Status |
|--------|--------|
| o | idle |
| - | running |
| + | completed |
| x | failed |
| / | cancelled |

## Error Handling

Errors in `@Step` methods are wrapped in `WorkflowError` with full context:

```typescript
import { WorkflowError } from 'groundswell';

class MyWorkflow extends Workflow {
  @ObservedState()
  currentItem = '';

  @Step({ snapshotState: true })
  async process(): Promise<void> {
    this.currentItem = 'item-1';
    throw new Error('Processing failed');
  }

  async run(): Promise<void> {
    try {
      await this.process();
    } catch (error) {
      const wfError = error as WorkflowError;

      console.log(wfError.message);     // 'Processing failed'
      console.log(wfError.workflowId);  // workflow ID
      console.log(wfError.state);       // { currentItem: 'item-1' }
      console.log(wfError.logs);        // logs up to error
      console.log(wfError.stack);       // stack trace
    }
  }
}
```

### Retry Pattern

```typescript
class RetryWorkflow extends Workflow {
  @ObservedState()
  attempt = 0;

  @Step()
  async unreliableOperation(): Promise<void> {
    this.attempt++;
    if (this.attempt < 3) {
      throw new Error('Temporary failure');
    }
  }

  async run(): Promise<void> {
    const maxAttempts = 3;

    while (this.attempt < maxAttempts) {
      try {
        await this.unreliableOperation();
        break;
      } catch (error) {
        if (this.attempt >= maxAttempts) throw error;
        await this.delay(1000 * this.attempt); // backoff
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
```

### Error Isolation

Parent workflows can catch and handle child errors:

```typescript
class ResilientParent extends Workflow {
  async run(): Promise<void> {
    for (const config of this.childConfigs) {
      const child = new ChildWorkflow(config, this);

      try {
        await child.run();
      } catch (error) {
        this.logger.warn(`Child failed: ${error.message}`);
        // Continue with other children
      }
    }
  }
}
```

**Advanced Retry Logic:** For intelligent retry patterns with state preservation, parent-driven restart decisions, and error analysis, see [Restart Pattern](./restart-pattern.md).

## Agent Response Validation

Workflows can validate agent responses to ensure they conform to expected schemas before processing. This is particularly useful when working with LLMs that may return malformed or unexpected data structures.

**PRD Requirement:** As specified in [PRD Section 6.6](../../PRD.md#66-validation), workflows receiving agent responses should validate against the `AgentResponse` schema to catch format errors early.

### Automatic vs Manual Validation

| Feature | Automatic Validation | Manual Validation |
|---------|---------------------|-------------------|
| **Used in** | Functional workflows (`createWorkflow`) | Class-based workflows (extend `Workflow`) |
| **Trigger** | `ctx.step()` automatically validates `AgentResponse` results | Call `this.validateAgentResponse()` explicitly |
| **Configuration** | `autoValidateResponses` option | N/A (opt-in per call) |
| **Error handling** | Throws `WorkflowError` automatically | Returns `boolean` (check return value) |
| **Event emission** | Emits `invalidResponse` event | Emits `invalidResponse` event |

### Automatic Validation (Functional Workflows)

When using functional workflows with `createWorkflow()`, you can enable automatic validation of `AgentResponse` objects returned by steps.

**Enabling Automatic Validation:**

```typescript
import { createWorkflow, type AgentResponse } from 'groundswell';
import { z } from 'zod';

const workflow = createWorkflow(
  {
    name: 'ValidationWorkflow',
    autoValidateResponses: true,  // Enable automatic validation
  },
  async (ctx) => {
    // This step returns an AgentResponse - validation happens automatically
    const result = await ctx.step('analyze', async () => {
      // Simulated agent call
      const response: AgentResponse<{ analysis: string }> = {
        status: 'success',
        data: { analysis: 'Complete' },
        error: null,
        metadata: {
          agentId: 'agent-123',
          timestamp: Date.now(),
        },
      };
      return response;
    });

    // If validation failed, WorkflowError is thrown before reaching this point
    return result.data;
  }
);

const result = await workflow.run();
```

**Default Behavior:**

- `autoValidateResponses` defaults to `true` for functional workflows
- Only validates values that match the `AgentResponse` structure
- Non-agent response values pass through unchanged
- Emits `invalidResponse` event before throwing `WorkflowError`

**Disabling Validation:**

```typescript
const workflow = createWorkflow(
  {
    name: 'NoValidationWorkflow',
    autoValidateResponses: false,  // Disable automatic validation
  },
  async (ctx) => {
    const result = await ctx.step('analyze', async () => {
      return { status: 'invalid', data: 'bypasses validation' };
    });
    return result;
  }
);
```

### Manual Validation (Class-Based Workflows)

For class-based workflows using the `@Step` decorator, use the `validateAgentResponse()` method to manually validate agent responses.

```typescript
import { Workflow, Step, type AgentResponse } from 'groundswell';
import { z } from 'zod';

class AnalysisWorkflow extends Workflow {
  @Step({ name: 'analyze' })
  async analyzeData(): Promise<AgentResponse<{ result: string }>> {
    // Simulated agent response
    return {
      status: 'success',
      data: { result: 'Analysis complete' },
      error: null,
      metadata: {
        agentId: 'agent-123',
        timestamp: Date.now(),
      },
    };
  }

  async run(): Promise<string> {
    this.setStatus('running');

    const response = await this.analyzeData();

    // Manually validate the response
    const isValid = this.validateAgentResponse(
      response,
      'agent-123',
      z.object({
        result: z.string(),
      })
    );

    if (!isValid) {
      this.logger.error('Response validation failed');
      throw new Error('Invalid agent response');
    }

    this.setStatus('completed');
    return response.data.result;
  }
}
```

**Method Signature:**

```typescript
validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema?: z.ZodTypeAny
): boolean
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `response` | `AgentResponse<T>` | The agent response to validate |
| `agentId` | `string` | ID of the agent that produced the response |
| `dataSchema` | `z.ZodTypeAny` | Optional schema for the `data` field (defaults to `z.unknown()`) |

**Returns:** `true` if validation passes, `false` if validation fails

**Side Effects:**

- Emits `invalidResponse` event on validation failure
- Does NOT throw - you must check the return value

### Validation Events

When validation fails (either automatic or manual), an `invalidResponse` event is emitted with detailed error information.

**Event Structure:**

```typescript
interface InvalidResponseEvent {
  type: 'invalidResponse';
  node: WorkflowNode;
  response: AgentResponse<unknown>;
  agentId: string;
  errors: z.ZodError;
  timestamp: number;
}
```

**Observing Validation Events:**

```typescript
import { createWorkflow, type WorkflowEvent, type WorkflowObserver } from 'groundswell';

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event: WorkflowEvent) => {
    if (event.type === 'invalidResponse') {
      console.error('Validation failed:', {
        agentId: event.agentId,
        errors: event.errors.errors,
        timestamp: event.timestamp,
      });
    }
  },
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

const workflow = createWorkflow(
  { name: 'MonitoredWorkflow' },
  async (ctx) => {
    return await ctx.step('analyze', async () => {
      return { status: 'invalid', data: null, error: null, metadata: {} };
    });
  }
);

workflow.addObserver(observer);
```

### Error Handling

When automatic validation fails, a `WorkflowError` is thrown with detailed context about the validation failure.

**Error Structure:**

```typescript
interface WorkflowError {
  message: string;
  original: z.ZodError;
  workflowId: string;
  stack?: string;
  state: Record<string, unknown>;
  logs: LogEntry[];
}
```

**Handling Validation Errors:**

```typescript
try {
  await workflow.run();
} catch (error) {
  const workflowError = error as WorkflowError;

  // Check if it's a validation error
  if (workflowError.original && 'errors' in workflowError.original) {
    const zodError = workflowError.original as z.ZodError;

    console.error('Validation failed:');
    zodError.errors.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });

    // Decide whether to retry or abort
    if (isRecoverable(zodError)) {
      // Retry with improved prompt
      return await retryWithBetterPrompt();
    }
  }

  throw error;
}
```

**ZodError Format:**

```typescript
interface ZodError {
  errors: Array<{
    path: (string | number)[];
    message: string;
    code: string;
  }>;
}
```

### Common Scenarios

#### Scenario 1: Validate in Production Only

Enable validation in production but skip it during development for faster iteration.

```typescript
const workflow = createWorkflow(
  {
    name: 'SmartWorkflow',
    autoValidateResponses: process.env.NODE_ENV === 'production',
  },
  async (ctx) => {
    const result = await ctx.step('analyze', async () => {
      return await agent.prompt(prompt);
    });
    return result.data;
  }
);
```

#### Scenario 2: Event-Driven Monitoring

Track validation failures for monitoring and alerting.

```typescript
import { createWorkflow, type WorkflowObserver } from 'groundswell';

class ValidationMonitor implements WorkflowObserver {
  private failures: Map<string, number> = new Map();

  onLog() {}
  onStateUpdated() {}
  onTreeChanged() {}

  onEvent(event: WorkflowEvent): void {
    if (event.type === 'invalidResponse') {
      const key = `${event.agentId}:${event.node.name}`;

      this.failures.set(key, (this.failures.get(key) || 0) + 1);

      // Alert on repeated failures
      if (this.failures.get(key)! > 3) {
        this.sendAlert(`Repeated validation failures for ${key}`);
      }
    }
  }

  private sendAlert(message: string): void {
    // Send to monitoring service
    console.error('ALERT:', message);
  }
}

const monitor = new ValidationMonitor();
workflow.addObserver(monitor);
```

#### Scenario 3: Retry with Validation Feedback

Improve prompts based on validation errors and retry.

```typescript
const workflow = createWorkflow(
  { name: 'RetryWorkflow' },
  async (ctx) => {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const result = await ctx.step('analyze', async () => {
          return await agent.prompt(prompt);
        });
        return result.data;
      } catch (error) {
        attempts++;

        const workflowError = error as WorkflowError;

        if (workflowError.original && 'errors' in workflowError.original) {
          // Extract validation errors to improve prompt
          const zodError = workflowError.original as z.ZodError;
          const errorDetails = zodError.errors
            .map((e) => `- ${e.path.join('.')}: ${e.message}`)
            .join('\n');

          // Update prompt with validation feedback
          prompt = createPrompt({
            user: `Previous attempt had validation errors:\n${errorDetails}\n\nPlease fix and retry.`,
            responseFormat: schema,
          });
        } else {
          throw error; // Not a validation error
        }
      }
    }

    throw new Error('Max retry attempts exceeded');
  }
);
```

#### Scenario 4: Conditional Schema Validation

Validate different data shapes based on response status.

```typescript
import { z } from 'zod';

const SuccessSchema = z.object({
  result: z.string(),
  confidence: z.number().min(0).max(1),
});

const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  recoverable: z.boolean(),
});

const workflow = createWorkflow(
  { name: 'ConditionalValidation' },
  async (ctx) => {
    const response = await ctx.step('analyze', async () => {
      return await agent.prompt(prompt);
    });

    // Validate based on response status
    if (response.status === 'success') {
      const isValid = this.validateAgentResponse(response, 'agent-123', SuccessSchema);
      if (!isValid) throw new Error('Invalid success response');
    } else if (response.status === 'error') {
      const isValid = this.validateAgentResponse(response, 'agent-123', ErrorSchema);
      if (!isValid) throw new Error('Invalid error response');
    }

    return response;
  }
);
```

### Configuration Reference

**WorkflowConfig Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoValidateResponses` | `boolean` | `true` | Enable automatic validation of `AgentResponse` objects in functional workflows |

**Notes:**

- Only applies to functional workflows created with `createWorkflow()`
- Class-based workflows must use manual validation via `validateAgentResponse()`
- Validation only applies to values matching the `AgentResponse` structure
- Non-agent response values pass through unchanged

### API Reference

**validateAgentResponse()**

```typescript
validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema?: z.ZodTypeAny
): boolean
```

Validates an `AgentResponse` against the `AgentResponse` schema and optional data schema.

**Parameters:**

- `response: AgentResponse<T>` - The agent response to validate
- `agentId: string` - ID of the agent that produced the response
- `dataSchema?: z.ZodTypeAny` - Optional schema for validating the `data` field (defaults to `z.unknown()`)

**Returns:** `boolean` - `true` if validation passes, `false` if validation fails

**Side Effects:**

- Emits `invalidResponse` event on validation failure
- Event includes: `node`, `response`, `agentId`, `errors` (ZodError), `timestamp`
- Does NOT throw - caller must check return value

**Example:**

```typescript
const isValid = this.validateAgentResponse(
  response,
  'my-agent',
  z.object({
    result: z.string(),
    score: z.number().min(0).max(100),
  })
);

if (!isValid) {
  // Handle validation failure
}
```

**Related:**

- [Agent Validation Documentation](./agent.md#validation) - Agent-level validation
- [Prompt Schema Validation](./prompt.md#schema-validation) - Using Zod schemas with prompts
- [WorkflowError Type](#api-reference) - Error structure for validation failures

## Concurrent Execution

### Sequential (default)

```typescript
for (const item of items) {
  const worker = await this.createWorker(item);
  await worker.run(); // waits for each
}
```

### Parallel with @Task

```typescript
@Task({ concurrent: true })
async createWorkers(): Promise<Worker[]> {
  return items.map(item => new Worker(item, this));
}

// All workers run in parallel when method completes
```

### Manual Parallel

```typescript
const workers = await Promise.all(
  items.map(item => this.createWorker(item))
);

const results = await Promise.all(
  workers.map(w => w.run())
);
```

### Fan-Out / Fan-In

```typescript
class Pipeline extends Workflow {
  @Step()
  async fanOut(): Promise<string[]> {
    const workers = this.items.map(
      item => new Worker(item, this)
    );

    // Run all in parallel
    return Promise.all(workers.map(w => w.run()));
  }

  @Step()
  async fanIn(results: string[]): Promise<void> {
    this.aggregatedResult = results.join(',');
  }

  async run(): Promise<void> {
    const results = await this.fanOut();
    await this.fanIn(results);
  }
}
```

## API Reference

### Workflow Class

```typescript
class Workflow<T = unknown> {
  readonly id: string;
  parent: Workflow | null;
  children: Workflow[];
  status: WorkflowStatus;

  constructor(name?: string, parent?: Workflow);
  constructor(config: WorkflowConfig, executor: WorkflowExecutor<T>);

  run(...args: unknown[]): Promise<T | WorkflowResult<T>>;

  protected setStatus(status: WorkflowStatus): void;
  protected readonly logger: WorkflowLogger;

  addObserver(observer: WorkflowObserver): void;
  removeObserver(observer: WorkflowObserver): void;
  attachChild(child: Workflow): void;
  snapshotState(): void;
  getNode(): WorkflowNode;
  emitEvent(event: WorkflowEvent): void;
  validateAgentResponse<T>(response: AgentResponse<T>, agentId: string, dataSchema?: z.ZodTypeAny): boolean;
}
```

### Types

```typescript
type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface WorkflowConfig {
  name?: string;
  enableReflection?: boolean;
  autoValidateResponses?: boolean;
}

interface WorkflowResult<T> {
  data: T;
  node: WorkflowNode;
  duration: number;
}

interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  parentLogId?: string;
}

interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: Record<string, unknown>;
  logs: LogEntry[];
}

interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];
  stateSnapshot: Record<string, unknown> | null;
}

interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

See [examples/07-agent-loops.ts](../examples/examples/07-agent-loops.ts) for workflow usage with agents.

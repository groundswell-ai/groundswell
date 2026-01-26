# Workflow Run Execution Patterns Analysis

## Overview

This research note documents the execution patterns of the Workflow class `run()` method in `src/core/workflow.ts`. The analysis covers sequential step execution, error handling, control flow, and event emission mechanisms.

## 1. The run() Method Location

The `run()` method is defined in the Workflow class at `/home/dustin/projects/groundswell/src/core/workflow.ts` starting at line 805:

```typescript
/**
 * Run the workflow
 *
 * For functional workflows (created with executor), runs the executor function.
 * For class-based workflows (subclasses), this should be overridden.
 *
 * @returns Workflow result
 */
public async run(..._args: unknown[]): Promise<T | WorkflowResult<T>> {
  if (this.executor) {
    return this.runFunctional();
  }

  // Class-based workflows must override this method
  throw new Error(
    'Workflow.run() must be overridden in subclass or provide executor in constructor'
  );
}
```

## 2. Two Execution Patterns

The workflow supports two distinct execution patterns:

### Functional Workflows
- Created with `new Workflow(config, executor)`
- Uses the `runFunctional()` method (line 819)
- Employs the `WorkflowContext` for step execution
- Sequential steps are executed using `ctx.step()` calls

### Class-based Workflows
- Created by extending the Workflow class
- Must override the `run()` method
- Direct method calls for sequential execution

## 3. Functional Workflow Execution (runFunctional)

### Key Implementation Details:

```typescript
private async runFunctional(): Promise<WorkflowResult<T>> {
  if (!this.executor) {
    throw new Error('No executor provided');
  }

  const startTime = Date.now();
  this.setStatus('running');

  // Create workflow context
  const ctx = createWorkflowContext(
    this as unknown as Parameters<typeof createWorkflowContext>[0],
    this.parent?.id,
    this.config.enableReflection ? { enabled: true } : undefined,
    this.config.autoValidateResponses ?? true
  );

  try {
    const result = await this.executor(ctx);
    this.setStatus('completed');

    return {
      data: result,
      node: this.node,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    this.setStatus('failed');

    // Emit error event
    this.emitEvent({
      type: 'error',
      node: this.node,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        original: error,
        workflowId: this.id,
        stack: error instanceof Error ? error.stack : undefined,
        state: getObservedState(this),
        logs: [...this.node.logs] as LogEntry[],
      },
    });

    throw error;
  }
}
```

### Sequential Step Execution Pattern:

Steps are executed through the WorkflowContext's `step()` method in `src/core/workflow-context.ts`:

```typescript
async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = this.reflectionManager.isEnabled()
    ? this.reflectionManager.getMaxAttempts()
    : 1;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Create step node for hierarchy tracking
    const stepNode: WorkflowNode = {
      id: generateId(),
      name: attempt > 1 ? `${name} (retry ${attempt - 1})` : name,
      parent: this.workflow.node,
      children: [],
      status: 'running',
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    // Attach to parent
    this.workflow.node.children.push(stepNode);

    // Emit step start
    this.workflow.emitEvent({
      type: 'stepStart',
      node: stepNode,
      step: name,
    });

    try {
      // Execute function in context
      const result = await runInContext(executionContext, fn);

      // Automatic validation for AgentResponse results
      if (this.autoValidateResponses && isAgentResponse(result)) {
        const validationResult = validateAgentResponse(result);
        
        if (!validationResult.valid) {
          // Handle validation failure - throw immediately
          throw validationError;
        }
      }

      // Update step node status
      stepNode.status = 'completed';

      // Emit step end
      const duration = Date.now() - startTime;
      this.workflow.emitEvent({
        type: 'stepEnd',
        node: stepNode,
        step: name,
        duration,
      });

      return result;
    } catch (error) {
      // Handle error case
      lastError = error as Error;
      
      // Update step node status
      stepNode.status = 'failed';

      // Emit error event
      this.workflow.emitEvent({
        type: 'error',
        node: stepNode,
        error: { ... }
      });

      // Handle reflection/retry logic
      if (!this.reflectionManager.isEnabled() || attempt === maxAttempts) {
        throw error;
      }

      // Try reflection for retry
      // ... reflection logic
    }
  }

  throw lastError ?? new Error('Max reflection attempts exceeded');
}
```

## 4. Class-based Workflow Execution

Class-based workflows must override the `run()` method:

```typescript
class MyWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    
    // Sequential step execution pattern
    await this.step1();
    await this.step2();
    // ... other steps
    
    this.setStatus('completed');
    return 'result';
  }

  @Step({ restartable: true })
  async step1() {
    // Step implementation
  }

  @Step({ logStart: true, logFinish: true })
  async step2() {
    // Step implementation
  }
}
```

## 5. Current Error Handling Flow

### Error Handling in Functional Workflows:

1. **Step-level errors**: 
   - Caught in `WorkflowContext.step()` 
   - Step marked as `failed`
   - Error event emitted
   - Automatic validation errors are thrown immediately (not retried)
   - Reflection may be attempted if enabled and configured

2. **Workflow-level errors**:
   - Caught in `runFunctional()`
   - Workflow marked as `failed`
   - Error event emitted
   - Error is rethrown

3. **Step Wrapper Errors**:
   - The `@Step` decorator handles retry logic
   - Errors are enriched with workflow context
   - Retry attempts are made based on step configuration

### Error Enrichment Pattern:

```typescript
const workflowError: WorkflowError = {
  message: error?.message ?? 'Unknown error',
  original: err,
  workflowId: wf.id,
  stack: error?.stack,
  state: snap,
  logs: [...wf.node.logs] as LogEntry[],
};
```

## 6. Control Flow When Step Throws Error

### For Functional Workflows:

1. Error is thrown in step function
2. Caught by `WorkflowContext.step()` try-catch
3. Step node status updated to `failed`
4. Error event emitted
5. Check if validation error → throw immediately
6. Check if reflection enabled and max attempts not reached
7. If reflection enabled, call `reflectionManager.reflect()`
8. If should retry, delay and continue loop
9. If no retry, throw error
10. Error bubbles up to `runFunctional()`
11. Workflow marked as `failed`
12. Error event emitted at workflow level
13. Error rethrown

### For Class-based Workflows:

1. Error thrown in decorated step method
2. Caught by `@Step` decorator wrapper
3. Step node updated to `failed`
4. Check retry criteria and max attempts
5. If should retry, emit retry event and delay
6. If no retry, throw enriched WorkflowError
7. Error bubbles up to `run()` method
8. Workflow marked as `failed`
9. Error rethrown

## 7. Existing Error Collection Mechanisms

### Current Error Collection:

1. **WorkflowError Structure**:
   ```typescript
   interface WorkflowError {
     message: string;
     original: unknown;
     workflowId: string;
     stack?: string;
     state: ObservedState;
     logs: LogEntry[];
   }
   ```

2. **Error Event Collection**:
   - Each error triggers an `error` event
   - Events are stored in `node.events` array
   - Events emitted to all observers

3. **Error Retry Collection**:
   - `@Step` decorator tracks retry attempts
   - Retry events emitted with `stepRetry` type
   - Retry counts and attempts recorded

4. **State and Log Capture**:
   - `getObservedState()` captures current workflow state
   - All logs captured in `node.logs` array
   - Error context preserved in WorkflowError

## 8. Event Emissions During Step Execution

### Event Types Emitted:

1. **stepStart**: When a step begins execution
   ```typescript
   { type: 'stepStart', node: stepNode, step: name }
   ```

2. **stepEnd**: When a step completes successfully
   ```typescript
   { type: 'stepEnd', node: stepNode, step: name, duration: number }
   ```

3. **stepRetry**: When a step is retried
   ```typescript
   {
     type: 'stepRetry',
     node: workflowNode,
     stepName: string,
     retryCount: number,
     analysis: RestartAnalysis,
     error: WorkflowError,
     timestamp: number
   }
   ```

4. **error**: When a step or workflow fails
   ```typescript
   {
     type: 'error',
     node: workflowNode,
     error: WorkflowError
   }
   ```

5. **invalidResponse**: When AgentResponse validation fails
   ```typescript
   {
     type: 'invalidResponse',
     node: stepNode,
     response: AgentResponse,
     agentId: string,
     errors: ZodError,
     timestamp: number
   }
   ```

6. **treeUpdated**: When workflow structure changes
   ```typescript
   { type: 'treeUpdated', root: WorkflowNode }
   ```

### Event Emission Points:

- **Step execution**: `WorkflowContext.step()`
- **Step decorator**: `@Step` wrapper
- **Workflow execution**: `runFunctional()`
- **Workflow methods**: `setStatus()`, `snapshotState()`, etc.

## 9. Configuration and State Variables

### Configuration Options:

1. **Functional Workflow Config**:
   ```typescript
   interface WorkflowConfig {
     name?: string;
     enableReflection?: boolean;
     autoValidateResponses?: boolean;
     // ... other config
   }
   ```

2. **Step Options**:
   ```typescript
   interface StepOptions {
     name?: string;
     restartable?: boolean;
     maxRetries?: number;
     retryOn?: ErrorCriterion[];
     retryDelayMs?: number;
     snapshotState?: boolean;
     trackTiming?: boolean;
     logStart?: boolean;
     logFinish?: boolean;
   }
   ```

### State Variables Used During Execution:

1. **Workflow Status**:
   - `this.status`: Current workflow status ('idle', 'running', 'completed', 'failed')
   - `this.node.status`: Mirrored status in node tree

2. **Step Tracking**:
   - `stepNode`: Individual step node in hierarchy
   - `retryCount`: Number of retry attempts
   - `maxAttempts`: Maximum attempts (1 + reflection attempts)

3. **Configuration State**:
   - `this.config.enableReflection`: Enable/disable reflection retry
   - `this.autoValidateResponses`: Enable/disable automatic response validation
   - `this.reflectionManager`: Reflection manager instance

4. **State Capture**:
   - `getObservedState()`: Captures @ObservedState decorated fields
   - `node.stateSnapshot`: Last state snapshot

## 10. Key Observations

1. **Two Parallel Systems**: Functional workflows use `WorkflowContext.step()` while class-based workflows use `@Step` decorator - both have similar but separate error handling logic

2. **Reflection Integration**: The system supports reflection-based retries through the ReflectionManager, which can analyze failures and suggest corrective actions

3. **Error Propagation**: Errors bubble up through multiple layers with enrichment at each level

4. **Event-Driven Architecture**: All state changes and errors are emitted as events for observer consumption

5. **State Consistency**: The system maintains a 1:1 mirror between workflow tree and node tree through careful event emission

6. **Validation Integration**: Automatic AgentResponse validation can be enabled/disabled per workflow

## 11. Potential Areas for Improvement

1. **Error Collection Consolidation**: Currently error handling is split between `@Step` decorator and `WorkflowContext.step()` - could be unified

2. **Error Event Deduplication**: Multiple error events may be emitted for the same error at different levels

3. **Configuration Complexity**: Many overlapping configuration options between decorators and context

4. **Retry Logic Complexity**: Multiple retry mechanisms (reflection, @Step retries) that could be better integrated

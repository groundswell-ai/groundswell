# AsyncLocalStorage Research

## Official Documentation URLs

| Resource | URL |
|----------|-----|
| **Node.js Async Context** | https://nodejs.org/api/async_context.html |
| **async_hooks Module** | https://nodejs.org/api/async_hooks.html |

## Core API Methods

### Creating Instance
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

interface WorkflowContext {
  executionId: string;
  agentId: string;
  stepName: string;
}

const workflowContext = new AsyncLocalStorage<WorkflowContext>();
```

### Establishing Context with .run()
```typescript
const result = await workflowContext.run(
  { executionId: 'exec-123', agentId: 'agent-1', stepName: 'init' },
  async () => {
    // Context is active here and in all nested async calls
    const store = workflowContext.getStore();
    console.log(store.executionId); // 'exec-123'

    await someAsyncOperation(); // Context propagates automatically
    return 'completed';
  }
);
```

### Accessing Context with .getStore()
```typescript
function doSomething() {
  const store = workflowContext.getStore();
  if (store === undefined) {
    throw new Error('Called outside workflow context');
  }
  console.log(`Execution: ${store.executionId}`);
}
```

### Other Methods
```typescript
// enterWith - persist context for sync execution
workflowContext.enterWith(store);

// exit - run code outside context
workflowContext.exit(() => {
  workflowContext.getStore(); // undefined
});

// snapshot - capture context for later use
const captured = workflowContext.run(123, () =>
  workflowContext.snapshot()
);

// disable - disable instance
workflowContext.disable();
```

## Usage Pattern for Agent/Prompt Context

### Workflow Step Context Propagation
```typescript
const workflowContext = new AsyncLocalStorage<WorkflowContext>();

// In workflow orchestrator
async function executeWorkflow(workflow: Workflow) {
  const context: WorkflowContext = {
    executionId: generateId(),
    workflowId: workflow.id,
    agentId: workflow.agentId,
    timestamp: Date.now()
  };

  return workflowContext.run(context, async () => {
    // All nested calls automatically inherit context
    await workflow.execute();
  });
}

// In Agent.prompt() - automatically has access to context
class Agent {
  async prompt(message: string): Promise<string> {
    const context = workflowContext.getStore();
    if (!context) {
      // Standalone call - no workflow context
      return await this.callLLMStandalone(message);
    }

    // Automatically includes execution context
    return await this.callLLMWithContext(message, context);
  }
}
```

### Nested Context Updates
```typescript
async function executeStep(step: WorkflowStep, parentContext: WorkflowContext) {
  const stepContext: WorkflowContext = {
    ...parentContext,
    stepName: step.name,
    metadata: {
      ...parentContext.metadata,
      stepStartTime: Date.now()
    }
  };

  return workflowContext.run(stepContext, () => step.execute());
}
```

## Best Practices

### Performance
- Overhead is < 10%, acceptable for most applications
- Do NOT create more than 10-15 instances per application
- Create ONE global instance per logical context type

```typescript
// Good: Single shared instance
export const workflowContext = new AsyncLocalStorage<WorkflowContext>();

// Bad: Creating instances per request
const context = new AsyncLocalStorage(); // Don't do this
```

### Error Handling
```typescript
// Errors propagate correctly
try {
  workflowContext.run({ data: 'test' }, () => {
    throw new Error('Something went wrong');
  });
} catch (e) {
  // Error thrown, context auto-exits
}

// Always check for undefined
function requireContext<T>(als: AsyncLocalStorage<T>, op: string): T {
  const store = als.getStore();
  if (store === undefined) {
    throw new Error(`${op} called outside context`);
  }
  return store;
}
```

### TypeScript Integration
```typescript
export const executionContext = new AsyncLocalStorage<ExecutionContext>();

// Type-safe getter
export function getExecutionContext(): ExecutionContext {
  const context = executionContext.getStore();
  if (!context) {
    throw new Error('Execution context not available');
  }
  return context;
}

// Type-safe runner
export async function runInContext<T>(
  context: ExecutionContext,
  fn: () => Promise<T>
): Promise<T> {
  return executionContext.run(context, fn);
}
```

## Testing Patterns

```typescript
describe('Agent with Context', () => {
  it('should have access to execution context', async () => {
    const testContext = { executionId: 'test-123', agentId: 'agent-1' };

    const result = await executionContext.run(testContext, async () => {
      return await agent.prompt('test message');
    });

    expect(result).toBeDefined();
  });

  it('should throw when called outside context', async () => {
    await expect(agent.prompt('test')).rejects.toThrow(
      'Execution context not available'
    );
  });
});
```

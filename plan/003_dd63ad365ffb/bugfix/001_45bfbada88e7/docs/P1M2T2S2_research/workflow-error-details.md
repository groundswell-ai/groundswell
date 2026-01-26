# WorkflowError and INVALID_RESPONSE_FORMAT Error Handling Research

## Overview
This research document provides a comprehensive analysis of the WorkflowError class structure and INVALID_RESPONSE_FORMAT error handling in the Groundswell codebase.

## 1. WorkflowError Class Definition

### Interface Structure
```typescript
interface WorkflowError {
  /** Error message */
  message: string;
  /** Original thrown error */
  original: unknown;
  /** ID of workflow where error occurred */
  workflowId: string;
  /** Stack trace if available */
  stack?: string;
  /** State snapshot at time of error */
  state: SerializedWorkflowState;
  /** Logs from the failing workflow node */
  logs: LogEntry[];
}
```

**Location:** `/home/dustin/projects/groundswell/src/types/error.ts`

### Key Properties:
1. **`message`**: Human-readable error description
2. **`original`**: The original thrown error (e.g., ZodError from validation)
3. **`workflowId`**: Unique identifier of the workflow where the error occurred
4. **`stack`**: Optional stack trace for debugging
5. **`state`**: Serialized workflow state at the time of error
6. **`logs`**: Array of log entries from the failing workflow node

## 2. INVALID_RESPONSE_FORMAT Error Code

### Definition
```typescript
export const AGENT_ERROR_CODES = {
  /**
   * Response not valid JSON or doesn't match AgentResponse schema
   *
   * Per PRD 6.6: Invalid responses must be treated as errors with this code.
   * Use when response validation fails during parsing or schema checking.
   */
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  // ... other error codes
} as const;
```

**Value:** `'INVALID_RESPONSE_FORMAT'` (string literal)

**Location:** `/home/dustin/projects/groundswell/src/types/agent.ts`

### Usage Context:
- Used when AgentResponse validation fails
- Applied to responses that don't conform to the AgentResponse schema
- Indicates the response is invalid JSON or doesn't match the expected structure

## 3. Construction Patterns for WorkflowError

### From Validation Failures
WorkflowError is constructed when agent response validation fails:

```typescript
// In Workflow.validateAgentResponse() method
const validationError: WorkflowError = {
  message: `Agent response validation failed for agent '${agentId}'`,
  original: zodError,  // ZodError from validation
  workflowId: this.id,
  stack: zodError.stack,
  state: getObservedState(this),
  logs: [...this.node.logs] as LogEntry[],
};
```

### Event Emission Pattern
When validation fails, two things happen:
1. **InvalidResponse Event Emitted**:
```typescript
this.emitEvent({
  type: 'invalidResponse',
  node: this.node,
  response,
  agentId,
  errors: zodError,
  timestamp: Date.now(),
});
```

2. **WorkflowError Created** (but not thrown):
```typescript
// Error is stored for potential use by analyzeError/restartStep
// The method returns false to indicate validation failure
```

### Error Merging Pattern
For concurrent task failures, multiple WorkflowErrors can be merged:

```typescript
function mergeWorkflowErrors(
  errors: WorkflowError[],
  taskName: string,
  parentWorkflowId: string,
  totalChildren: number
): WorkflowError {
  const message = `${errors.length} of ${totalChildren} concurrent child workflows failed in task '${taskName}'`;
  
  const mergedError: WorkflowError = {
    message,
    original: {
      name: 'WorkflowAggregateError',
      message,
      errors,
      totalChildren,
      failedChildren: errors.length,
      failedWorkflowIds,
    } as unknown,
    workflowId: parentWorkflowId,
    stack: errors[0]?.stack,
    state: errors[0]?.state || ({} as SerializedWorkflowState),
    logs: allLogs,
  };

  return mergedError;
}
```

## 4. Type Guard Patterns

### AgentResponse Type Guards
While there are no specific type guards for WorkflowError, there are comprehensive type guards for AgentResponse:

```typescript
// Type guard for success responses
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T> {
  return response.status === 'success';
}

// Type guard for error responses
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse {
  return response.status === 'error';
}

// Type guard for partial responses
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

### Event Type Discrimination
Workflow events use discriminated unions for type safety:

```typescript
export type WorkflowEvent =
  // ... other events
  | { type: 'invalidResponse'; node: WorkflowNode; response: AgentResponse<unknown>; agentId: string; errors: z.ZodError; timestamp: number }
  // ... other events
```

## 5. Code Examples

### Creating a WorkflowError from Validation
```typescript
// Validation utility
const result = validateAgentResponse(response, dataSchema);

if (!result.valid) {
  // Create WorkflowError
  const workflowError: WorkflowError = {
    message: `Agent response validation failed for agent '${agentId}'`,
    original: result.errors,
    workflowId: workflow.id,
    stack: result.errors?.stack,
    state: workflow.getState(),
    logs: workflow.getLogs(),
  };
  
  // Emit event
  workflow.emitEvent({
    type: 'invalidResponse',
    node: workflow.getNode(),
    response,
    agentId,
    errors: result.errors!,
    timestamp: Date.now(),
  });
  
  return false; // Validation failed
}
```

### Handling Validation in Workflow Steps
```typescript
async function processAgentResponse(ctx: WorkflowContext) {
  const response = await ctx.step('getAgentResponse', async () => {
    return await agent.prompt("Process data");
  });
  
  if (!ctx.validateAgentResponse(response, agent.id, MyDataSchema)) {
    // Handle validation failure - automatic retry or error propagation
    return; // Will trigger workflow error handling
  }
  
  // Process valid response
  return response.data;
}
```

### Automatic Validation in Workflow Context
When autoValidateResponses is enabled (default behavior), validation happens automatically:

```typescript
// Step execution with automatic validation
const result = await ctx.step('test-step', async () => {
  return createInvalidResponse();  // Will trigger validation failure
});

// If validation fails:
// 1. invalidResponse event is emitted
// 2. WorkflowError is created but not thrown
// 3. Step returns false to indicate failure
// 4. Workflow can retry or handle the error
```

## 6. Integration Points

### Validation Utility
The `validateAgentResponse` utility in `/home/dustin/projects/groundswell/src/utils/agent-validation.ts` provides pure validation:

```typescript
export function validateAgentResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny = z.unknown()
): ValidationResult {
  const schema = AgentResponseSchema(dataSchema);
  const validation = schema.safeParse(response);
  
  if (validation.success) {
    return { valid: true };
  }
  
  return { valid: false, errors: validation.error };
}
```

### Workflow Integration
The Workflow class integrates validation in the `validateAgentResponse` method:

```typescript
public validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema: z.ZodTypeAny = z.unknown()
): boolean {
  const result = validateAgentResponse(response, dataSchema);
  
  if (result.valid) {
    return true;
  }
  
  // Emit event and create error (but don't throw)
  // ... implementation details
  
  return false;
}
```

## 7. Key Findings

1. **WorkflowError is not thrown automatically** - It's created when validation fails but the workflow continues to handle the error
2. **INVALID_RESPONSE_FORMAT is used for schema validation failures** - Not for business logic errors
3. **Event-driven architecture** - Validation failures emit events rather than immediately throwing
4. **State preservation** - WorkflowError includes workflow state for debugging and recovery
5. **Pure validation utilities** - Validation logic is separated from error handling concerns

## 8. Related Files

- `/home/dustin/projects/groundswell/src/types/error.ts` - WorkflowError interface
- `/home/dustin/projects/groundswell/src/types/agent.ts` - AGENT_ERROR_CODES and AgentResponse types
- `/home/dustin/projects/groundswell/src/utils/agent-validation.ts` - Pure validation utilities
- `/home/dustin/projects/groundswell/src/core/workflow.ts` - Workflow validation integration
- `/home/dustin/projects/groundswell/src/types/events.ts` - Event type definitions
- `/home/dustin/projects/groundswell/src/utils/workflow-error-utils.ts` - Error merging utilities

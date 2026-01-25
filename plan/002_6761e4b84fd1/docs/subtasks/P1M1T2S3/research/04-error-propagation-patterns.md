# Error Propagation Patterns in Groundswell Codebase

**PRP**: P1.M1.T2.S3
**Research Date**: 2026-01-24
**Purpose**: Understand error handling patterns for AgentResponse integration

---

## Executive Summary

The codebase has well-established error handling patterns using **structured error objects** rather than traditional exception-based error handling. When integrating `AgentResponse` errors, the recommended approach is to:

1. **Use `WorkflowError`** for agent prompt failures in workflow context
2. **Preserve error context** through event-based propagation
3. **Leverage existing retry mechanisms** that respect error recoverability

---

## 1. Error Handling Patterns in Codebase

### 1.1 WorkflowError Interface

**File**: `src/types/error.ts`

```typescript
export interface WorkflowError {
  /** Error message */
  message: string;

  /** Error type/category */
  type: string;

  /** Node where error occurred */
  node?: WorkflowNode;

  /** Execution logs */
  logs: ExecutionLog[];

  /** Stack trace */
  stack?: string;

  /** Original error (if any) */
  cause?: Error;

  /** Timestamp */
  timestamp: number;
}
```

**Key Characteristics**:
- Rich context preservation (node, logs, stack trace)
- Event-based propagation through workflow system
- Supports cause chaining for original errors

### 1.2 AgentResponse Error Structure

**File**: `src/types/agent.ts`

```typescript
export interface AgentErrorDetails {
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: string;

  /** Human-readable error description */
  message: string;

  /** Additional error context */
  details?: Record<string, unknown> | null;

  /** Whether the error is recoverable (can retry) */
  recoverable: boolean;
}
```

**Key Characteristics**:
- Structured error details with code and message
- Recoverable flag for retry logic
- Optional details field for additional context

---

## 2. Current Error Propagation Patterns

### 2.1 Workflow Step Error Pattern

**File**: `src/decorators/step.ts`

```typescript
try {
  const result = await runInContext(executionContext, fn);

  // Update node status
  node.status = 'completed';

  return result;
} catch (error) {
  // Enrich error with context
  node.status = 'failed';
  const workflowError: WorkflowError = {
    message: error instanceof Error ? error.message : 'Unknown error',
    type: 'StepExecutionError',
    node,
    logs: executionContext.logs,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: Date.now(),
  };

  // Emit error event
  workflow.emitEvent({
    type: 'stepError',
    node,
    step: name,
    error: workflowError,
  });

  throw workflowError;
}
```

**Pattern**: Catch exception → Enrich with context → Emit event → Re-throw

### 2.2 Reflection Retry Pattern

**File**: `src/reflection/reflection.ts`

```typescript
// Error type awareness for retry decisions
const RETRYABLE_ERRORS = [
  'VALIDATION_FAILED',
  'JSON_PARSE_ERROR',
  'TIMEOUT_ERROR',
];

const NON_RETRYABLE_ERRORS = [
  'AUTHENTICATION_FAILED',
  'RATE_LIMIT_EXCEEDED',
  'INVALID_API_KEY',
];

// Check if error is retryable
if (error.response?.error?.recoverable) {
  return { shouldRetry: true, reason: '...' };
}
```

**Pattern**: Check error code → Determine retryability → Return retry decision

---

## 3. Recommended Error Propagation for AgentResponse

### 3.1 Pattern 1: Convert to WorkflowError (Recommended for Workflow Context)

```typescript
import type { WorkflowError } from '../types/error.js';

const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  const workflowError: WorkflowError = {
    message: `Agent prompt failed: ${response.error.message}`,
    type: 'AgentPromptError',
    node: currentNode,
    logs: executionContext.logs,
    timestamp: Date.now(),
    cause: new Error(response.error.message),
  };

  // Emit error event
  workflow.emitEvent({
    type: 'stepError',
    node: currentNode,
    step: stepName,
    error: workflowError,
  });

  throw workflowError;
}

return response.data!;
```

**Benefits**:
- Integrates with existing workflow error handling
- Preserves all context for debugging
- Supports event-based propagation
- Consistent with other workflow errors

### 3.2 Pattern 2: Throw Error with Details (Backward Compatible)

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  const { code, message, recoverable } = response.error;
  throw new Error(`[${code}] ${message}`);
}

return response.data!;
```

**Benefits**:
- Simple and straightforward
- Backward compatible with existing code
- Preserves error code and message

**Drawbacks**:
- Loses structured error context
- Less informative for debugging

### 3.3 Pattern 3: Return Structured Error Object (Functional Style)

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  return {
    success: false,
    error: response.error,
    data: null,
  };
}

return {
  success: true,
  error: null,
  data: response.data,
};
```

**Benefits**:
- No exceptions thrown
- Explicit error handling
- Type-safe error propagation

**Drawbacks**:
- Requires changes to return type
- Caller must check success flag

---

## 4. Error Message Conventions

### 4.1 Agent Error Message Format

**Pattern**: `[Agent Name] operation failed: [Error Details]`

**Examples**:
```typescript
// Good
"Agent 'CodeAnalyzer' prompt failed: VALIDATION_FAILED - Response validation failed"

// Good
"Agent 'DataProcessor' prompt failed: API_REQUEST_FAILED - Rate limit exceeded"

// Bad
"Error" // Too generic
"Prompt failed" // Missing context
```

### 4.2 Error Code Usage

**Available Error Codes** (`AGENT_ERROR_CODES`):
```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;
```

**Usage Pattern**:
```typescript
if (response.status === 'error') {
  const { code, message } = response.error;

  switch (code) {
    case AGENT_ERROR_CODES.VALIDATION_FAILED:
      // Handle validation errors
      break;
    case AGENT_ERROR_CODES.API_REQUEST_FAILED:
      // Handle API errors
      break;
    default:
      // Handle unknown errors
  }
}
```

---

## 5. Retry Integration

### 5.1 Respecting Recoverable Flag

```typescript
const response = await agent.prompt<T>(prompt);

if (response.status === 'error') {
  const { recoverable, code, message } = response.error;

  if (recoverable) {
    // Retry with backoff
    await delay(1000);
    return await agent.prompt<T>(prompt);
  } else {
    // Non-recoverable error - fail fast
    throw new Error(`[${code}] ${message}`);
  }
}
```

### 5.2 Reflection System Integration

The reflection system already has sophisticated retry logic that can leverage `AgentResponse` errors:

```typescript
// In reflection.ts, the retry logic checks:
if (error.response?.error?.recoverable) {
  return {
    shouldRetry: true,
    reason: `Recoverable error: ${error.response.error.message}`,
    revisedPromptData: {...},
  };
}
```

---

## 6. Error Propagation Through Call Chain

### 6.1 Current Chain (Broken)

```
Workflow Step
  ↓ calls
replaceLastPromptResult()
  ↓ calls
agent.prompt() → AgentResponse<T> (with error)
  ↓
Returns AgentResponse<T> instead of T ← TYPE MISMATCH
  ↓
Caller expects T but gets AgentResponse<T> ← RUNTIME ERROR
```

### 6.2 Fixed Chain (Recommended)

```
Workflow Step
  ↓ calls
replaceLastPromptResult()
  ↓ calls
agent.prompt() → AgentResponse<T> (with error)
  ↓
Checks response.status === 'error'
  ↓
Throws WorkflowError with AgentResponse details
  ↓
Step decorator catches, enriches, emits event
  ↓
Workflow handles error gracefully
```

---

## 7. Best Practices Summary

1. **Preserve Error Context**: Always include error code, message, and recoverable flag
2. **Use WorkflowError**: Integrate with existing workflow error system
3. **Emit Events**: Emit error events for observability
4. **Respect Recoverable Flag**: Check `response.error.recoverable` before deciding to retry
5. **Descriptive Messages**: Include agent name and operation in error messages
6. **Consistent Format**: Use `[Code] Message` format for error strings

---

## 8. Recommended Pattern for workflow-context.ts

```typescript
// In replaceLastPromptResult() method

const response = await runInContext(executionContext, () =>
  agent.prompt(newPrompt)
);

// Handle AgentResponse error
if (response.status === 'error') {
  const { code, message, recoverable } = response.error;

  // Create WorkflowError for integration with existing error handling
  const error: Error = new Error(
    `Agent prompt failed in replaceLastPromptResult: [${code}] ${message}`
  );
  error.name = 'AgentPromptError';

  // Log for debugging
  console.error(`[${code}] Agent prompt error:`, {
    message,
    recoverable,
    details: response.error.details,
  });

  // Throw to be caught by existing error handling
  throw error;
}

// Success case - extract data
const result = response.data!;

// Continue with success path...
revisionNode.status = 'completed';
// ... rest of success handling
return result;
```

---

## 9. Key Files for Error Handling

| File | Purpose | Pattern Used |
|------|---------|--------------|
| `src/types/error.ts` | WorkflowError interface definition | Structured error objects |
| `src/types/agent.ts` | AgentErrorDetails interface | Structured error details |
| `src/decorators/step.ts` | Step decorator error handling | Event-based propagation |
| `src/reflection/reflection.ts` | Retry logic | Recoverable flag checking |
| `src/core/workflow.ts` | Workflow error handling | WorkflowError creation |

---

## 10. Conclusion

The codebase has well-established error handling patterns. When updating source code to handle `AgentResponse`:

1. **Convert AgentResponse errors to exceptions** for backward compatibility
2. **Preserve error context** in error messages (code, message, recoverable)
3. **Integrate with WorkflowError** for workflow context updates
4. **Emit events** for observability
5. **Respect recoverable flag** for retry logic

The key is to maintain consistency with existing patterns while properly handling the structured `AgentResponse` error format.

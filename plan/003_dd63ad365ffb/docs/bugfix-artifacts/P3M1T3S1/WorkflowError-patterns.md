# WorkflowError Usage Patterns Research

## Summary

This document summarizes how `WorkflowError` is used throughout the codebase to determine the appropriate error handling approach for P3.M1.T3.S1.

## 1. WorkflowError Interface Definition

**File**: `/home/dustin/projects/groundswell/src/types/error.ts`

```typescript
export interface WorkflowError {
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

**Key characteristics**:
- Interface, not a class (created as object literals)
- Contains comprehensive context for debugging
- Includes workflow state and logs
- Used for runtime workflow execution failures

## 2. WorkflowError Usage Patterns

### When WorkflowError is Used

**WorkflowError is used for:**
- Step execution failures (max retries exceeded)
- Step not found errors
- Agent response validation failures
- Workflow execution errors
- Error collection for merge strategies

**WorkflowError is NOT used for:**
- Constructor validation failures
- Configuration validation failures
- Parameter type checking
- Input validation (before workflow execution)

### Example: Max Retries Exceeded

**File**: `/home/dustin/projects/groundswell/src/core/workflow.ts:543-550`

```typescript
const error: WorkflowError = {
  message: `Max retries (${maxRetries}) exceeded for step '${stepName}'`,
  original: new Error('Max retries exceeded'),
  workflowId: this.id,
  state: getObservedState(this),
  logs: [...this.node.logs] as LogEntry[],
};
throw error;
```

### Example: Agent Validation Failed

**File**: `/home/dustin/projects/groundswell/src/core/workflow-context.ts:176-183`

```typescript
const validationError: WorkflowError = {
  message: `Agent response validation failed in step '${name}'`,
  original: zodError,
  workflowId: this.workflowId,
  stack: zodError.stack,
  state: getObservedState(this.workflow),
  logs: [...this.workflow.node.logs] as LogEntry[],
};
throw validationError;
```

### Example: Step Not Found

**File**: `/home/dustin/projects/groundswell/src/core/workflow.ts:556-563`

```typescript
const error: WorkflowError = {
  message: `Step '${stepName}' not found`,
  original: new Error('Step not found'),
  workflowId: this.id,
  state: getObservedState(this),
  logs: [...this.node.logs] as LogEntry[],
};
throw error;
```

## 3. Plain Error Usage in Constructor Validation

### Current Workflow Constructor Validation

**File**: `/home/dustin/projects/groundswell/src/core/workflow.ts:127-135`

```typescript
// Validate workflow name (after config is normalized)
if (typeof this.config.name === 'string') {
  const trimmedName = this.config.name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  if (this.config.name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }
}
```

**Key observation**: Constructor validation uses plain `Error`, not `WorkflowError`.

### Provider Validation Examples

**Files**:
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
- `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts`

```typescript
// SDK initialization check
if (!this.sdk) {
  throw new Error("SDK not initialized. Call initialize() first.");
}

// Model format validation
throw new Error(`Model must be in 'provider/model' format: ${modelSpec.model}`);

// Session creation failure
throw new Error("Failed to create session: no data returned");
```

**Pattern**: All validation failures before workflow execution use plain `Error`.

## 4. Decision Matrix: Error vs WorkflowError

### Use Plain `Error` When:
- Validating constructor parameters
- Validating configuration before workflow execution
- Checking preconditions for method execution
- Input validation before workflow state is involved
- Type checking and basic validation

### Use `WorkflowError` When:
- Workflow execution has started
- Workflow state needs to be captured
- Logs from the failing step are relevant
- Error needs to be collected for merge strategies
- Error occurs during step execution
- Agent response validation fails (during execution)

## 5. Test Patterns for WorkflowError

### Helper Function for Creating Mock WorkflowError

**Pattern from**: Multiple test files

```typescript
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { stepName: 'testStep' },
    logs: [],
    ...overrides,
  };
}
```

### Test Files That Test WorkflowError

1. **`/home/dustin/projects/groundswell/src/__tests__/unit/utils/workflow-error-utils.test.ts`**
   - Tests `mergeWorkflowErrors` function
   - Verifies error aggregation and metadata preservation

2. **`/home/dustin/projects/groundswell/src/__tests__/unit/workflow-analyze-error.test.ts`**
   - Tests `analyzeError()` method
   - Tests error recovery logic and restart criteria

3. **`/home/dustin/projects/groundswell/src/__tests__/unit/workflow-error-merge.test.ts`**
   - Tests workflow-level error merge strategy
   - Tests event emission during error merging

## 6. Error Codes and Constants

### Transient Error Codes

**File**: `/home/dustin/projects/groundswell/src/utils/restart-analysis.ts`

```typescript
const TRANSIENT_ERROR_CODES = [
  'TIMEOUT',
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;
```

### Agent Error Codes

**File**: `/home/dustin/projects/groundswell/src/types/agent.ts`

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  // ... more codes
};
```

**Pattern**: SCREAMING_SNAKE_CASE for error codes (per PRD requirements).

## 7. Conclusion for P3.M1.T3.S1

### Recommended Approach

**For workflow name security validation in the constructor:**

Use **plain `Error`**, not `WorkflowError`.

**Rationale:**
1. Constructor validation happens before workflow execution begins
2. No workflow state to capture yet
3. No logs from failing steps (no steps have run)
4. Consistent with existing constructor validation pattern
5. WorkflowError is designed for runtime execution failures

**Implementation pattern:**

```typescript
// In constructor validation (lines 127-135 of workflow.ts)
if (typeof this.config.name === 'string') {
  const trimmedName = this.config.name.trim();

  // Existing validations
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  if (this.config.name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }

  // NEW: Security validations
  // Control characters
  if (/[\x00-\x1F\x7F]/.test(this.config.name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // HTML/JS injection patterns
  if (/<[^>]*>/.test(this.config.name) || /javascript:/i.test(this.config.name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // Path traversal patterns
  if (/\.\./.test(this.config.name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // File system operations
  if (/[\/\\:*?"<>|]/.test(this.config.name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // Allowed characters (allowlist)
  if (!/^[a-zA-Z0-9 _-]+$/.test(this.config.name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }
}
```

### Error Message Strategy

**Use a single, consistent error message:**

```typescript
const INVALID_NAME_MESSAGE =
  'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';
```

**Benefits:**
- Generic (doesn't reveal validation rules to attackers)
- User-friendly (tells users what they CAN use)
- Consistent (same message for all security violations)
- Secure (no information disclosure)

### Testing Strategy

**Test file**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

**Add to existing "Workflow Name Validation" describe block:**

```typescript
describe('Workflow Name Validation', () => {
  // ... existing tests ...

  // NEW: Security validation tests
  it('should reject names with control characters', () => {
    expect(() => new SimpleWorkflow('test\x00name')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with HTML tags', () => {
    expect(() => new SimpleWorkflow('<script>alert("xss")</script>')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with javascript: protocol', () => {
    expect(() => new SimpleWorkflow('javascript:alert(1)')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with path traversal patterns', () => {
    expect(() => new SimpleWorkflow('../etc/passwd')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with file system characters', () => {
    expect(() => new SimpleWorkflow('test/name')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should accept valid names with allowed characters', () => {
    expect(() => new SimpleWorkflow('My Workflow-123')).not.toThrow();
    expect(() => new SimpleWorkflow('test_workflow')).not.toThrow();
    expect(() => new SimpleWorkflow('Workflow Name')).not.toThrow();
  });
});
```

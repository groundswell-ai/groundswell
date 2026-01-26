# Codebase Validation Patterns Research

## Summary

This document summarizes the validation patterns found in the groundswell codebase, focusing on how validation is implemented, tested, and what conventions are followed.

## 1. Primary Validation Pattern: Zod Schema-Based

### Main Validation Utility

**File**: `/home/dustin/projects/groundswell/src/utils/agent-validation.ts`

The codebase uses Zod schemas as the primary validation mechanism:

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

**Key characteristics**:
- Non-throwing validation using `schema.safeParse()`
- Returns `ValidationResult` object with `{ valid: boolean, errors?: ZodError }`
- Used for agent response validation throughout

## 2. Validation Error Throwing Patterns

### Workflow Constructor Validation (Current Implementation)

**File**: `/home/dustin/projects/groundswell/src/core/workflow.ts` (lines 127-135)

Current validation for workflow names:

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

**Current validation covers**:
- Empty/whitespace names (via `trim()`)
- Maximum length (100 characters)

**Current validation does NOT cover**:
- Special characters (HTML tags, JavaScript)
- Control characters
- Path traversal patterns
- File system operations

### Provider Error Patterns

**Files**:
- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` (20+ throw statements)
- `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts` (15+ throw statements)

Common patterns:
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

**Key observation**: The codebase uses plain `Error` for most validation failures, not `WorkflowError`. `WorkflowError` is reserved for workflow execution failures, not constructor validation.

## 3. Validation in Agent and Workflow Classes

### Agent Class Validation

**File**: `/home/dustin/projects/groundswell/src/core/agent.ts`

```typescript
// validateResponse method (private)
validateResponse<T>(response: AgentResponse<T>, dataSchema: z.ZodTypeAny): T {
  const result = validateAgentResponse(response, dataSchema);

  if (!result.valid) {
    this.logger.error('Agent response validation failed', {
      agentId: this.id,
      errors: result.errors,
    });

    throw result.errors; // Throws ZodError
  }

  return response.data;
}
```

### Workflow Class Validation

**File**: `/home/dustin/projects/groundswell/src/core/workflow.ts`

```typescript
// validateAgentResponse method (public)
validateAgentResponse<T>(response: AgentResponse<T>, agentId: string, dataSchema: z.ZodTypeAny): boolean {
  const result = validateAgentResponse(response, dataSchema);

  if (!result.valid) {
    this.emitEvent({
      type: 'invalidResponse',
      timestamp: Date.now(),
      agentId,
      errors: result.errors,
    });

    const validationError: WorkflowError = {
      message: `Agent response validation failed in step '${name}'`,
      original: result.errors,
      workflowId: this.id,
      stack: result.errors.stack,
      state: getObservedState(this),
      logs: [...this.node.logs] as LogEntry[],
    };

    this.collectedErrors.push(validationError);
    return false;
  }

  return true;
}
```

**Key patterns**:
- Emits event on validation failure
- Creates `WorkflowError` for error collection
- Returns boolean for validation success
- Non-throwing (allows workflow to continue with error handling)

## 4. Test Patterns for Validation

### Test File Structure

```
src/__tests__/
├── unit/                          # Unit tests for individual components
│   ├── workflow.test.ts           # Main workflow tests
│   ├── workflow-validation.test.ts # Workflow-level validation
│   ├── agent-validation.test.ts   # Agent validation tests
│   └── utils/
│       └── agent-validation.test.ts # Validation utility tests
├── integration/                   # Integration tests
│   ├── agent-validation.test.ts   # Automatic validation integration
│   └── workflow-automatic-validation.test.ts
└── adversarial/                   # Edge case and security tests
    └── edge-case.test.ts
```

### Workflow Name Validation Tests

**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`

```typescript
describe('Workflow Name Validation', () => {
  it('should reject empty string name', () => {
    expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (spaces)', () => {
    expect(() => new SimpleWorkflow('   ')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (tabs)', () => {
    expect(() => new SimpleWorkflow('\t\t')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (newlines)', () => {
    expect(() => new SimpleWorkflow('\n\n')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() => new SimpleWorkflow(longName)).toThrow('Workflow name cannot exceed 100 characters');
  });

  it('should accept name with exactly 100 characters', () => {
    const exactly100 = 'a'.repeat(100);
    const wf = new SimpleWorkflow(exactly100);
    expect(wf.getNode().name).toBe(exactly100);
    expect(wf.getNode().name.length).toBe(100);
  });
});
```

### Test Structure Convention

```typescript
describe('Section Name', () => {
  // Setup helpers if needed
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  it('test description', async () => {
    // Arrange: Set up test data and mocks
    // Act: Execute the function being tested
    // Assert: Verify expected outcomes
  });
});
```

### Helper Functions for Testing

**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
function createSuccessResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: {
      agentId,
      timestamp: Date.now(),
    },
  };
}

function createErrorResponse(agentId: string = 'test-agent'): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: {
      code: 'TEST_ERROR',
      message: 'Test error message',
      details: null,
      recoverable: false,
    },
    metadata: {
      agentId,
      timestamp: Date.now(),
    },
  };
}
```

## 5. Key Validation Characteristics

1. **Non-blocking validation**: Most validation returns results rather than throwing
2. **Schema-driven**: Zod schemas for all data structure validation
3. **Comprehensive error reporting**: Detailed ZodError with paths and messages
4. **Defense-in-depth**: Multiple validation layers (agent → workflow → response)
5. **Event-driven**: Validation failures trigger workflow events
6. **Immutable results**: Validation functions don't mutate input data
7. **Plain Error for constructor validation**: Uses `throw new Error()` not `WorkflowError`
8. **WorkflowError for execution failures**: Reserved for runtime errors during workflow execution

## 6. Missing Patterns (Gaps)

The codebase **lacks**:
- Input sanitization utilities
- Security-focused validation (XSS, injection prevention)
- Rate limiting validation
- Size validation for large inputs
- Content-type validation for API inputs

**This is the gap that P3.M1.T3.S1 aims to fill.**

## 7. Naming Conventions

- Test files: `[component-name].test.ts` or `[component]-validation.test.ts`
- Test functions: `should[ExpectedBehavior]` or `reject[InvalidInput]`
- Error messages: Specific and descriptive, include context
- Error codes: SCREAMING_SNAKE_CASE for constants

## 8. Integration with Previous Work (P3.M1.T2.S2)

**Context from P3.M1.T2.S2 PRP**:
- P3.M1.T2.S2 improves JSDoc documentation across the codebase
- This includes improving JSDoc for the Workflow constructor
- Our new validation should include proper JSDoc documentation
- Follow the patterns established in P3.M1.T2.S2 for JSDoc clarity

**Files modified by P3.M1.T2.S2** (for reference):
- `src/core/workflow.ts` - Workflow class JSDoc improvements
- `src/core/agent.ts` - Agent class JSDoc improvements
- Provider implementations JSDoc improvements

Our implementation should:
1. Add clear JSDoc for the new validation logic
2. Document allowed characters explicitly
3. Follow the JSDoc patterns from P3.M1.T2.S2

## Summary for Implementation

When implementing P3.M1.T3.S1:
1. **Use `throw new Error()`** for constructor validation (not `WorkflowError`)
2. **Follow existing test patterns** from `workflow.test.ts`
3. **Add tests to** `src/__tests__/unit/workflow.test.ts` in the "Workflow Name Validation" section
4. **Use specific error messages** that match the existing pattern
5. **Add comprehensive JSDoc** following P3.M1.T2.S2 patterns
6. **Test both constructor patterns** (class-based and functional)

# AgentResponse Factory Functions and Error Handling Patterns

## Source: src/types/agent.ts

### 1. createSuccessResponse()

**Lines 540-550**: Factory function for success responses

```typescript
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

**Usage Example**:
```typescript
// Basic success response
const response = createSuccessResponse(
  { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
  { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
);

// With execution metadata
const response = createSuccessResponse(
  { items: [1, 2, 3] },
  {
    agentId: 'agent-123',
    timestamp: Date.now(),
    duration: 1523,
    requestId: 'req-abc123',
    usage: { inputTokens: 100, outputTokens: 50 },
    toolCalls: 3
  }
);
```

### 2. createErrorResponse()

**Lines 595-615**: Factory function for error responses

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: {
      code,
      message,
      details: details ?? null,
      recoverable,
    },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Usage Example**:
```typescript
// Basic error response
const response = createErrorResponse(
  'EXECUTION_FAILED',
  'Failed to compile TypeScript files',
  {
    failedFiles: ['src/index.ts'],
    compilerErrors: ['TS2307: Cannot find module \'foo\'']
  },
  true
);

// Using standard error codes
const response = createErrorResponse(
  AGENT_ERROR_CODES.VALIDATION_FAILED,
  'Invalid input',
  { field: 'email', value: 'not-an-email' },
  false
);
```

### 3. createPartialResponse()

**Lines 657-669**: Factory function for partial responses

```typescript
export function createPartialResponse<T>(
  data: T
): AgentResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Usage Example**:
```typescript
// Partial response for progress tracking
const response = createPartialResponse({
  completedSteps: 3,
  totalSteps: 5,
  intermediateResult: { progress: 'processing file2.ts' }
});
```

### 4. Type Guard Functions

#### isSuccess() - Lines 689-693

```typescript
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T> {
  return response.status === 'success';
}
```

**Usage**:
```typescript
if (isSuccess(response)) {
  console.log(response.data); // TypeScript knows data is T
  console.log(response.error); // TypeScript knows error is null
}
```

#### isError() - Lines 709-713

```typescript
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse {
  return response.status === 'error';
}
```

#### isPartial() - Lines 729-733

```typescript
export function isPartial<T>(
  response: AgentResponse<T>
): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

### 5. Error Codes Available (AGENT_ERROR_CODES)

**Lines 442-493**: Standard error code constants

```typescript
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

**Descriptions**:
- `INVALID_RESPONSE_FORMAT`: Response not valid JSON or doesn't match AgentResponse schema
- `VALIDATION_FAILED`: Input validation failed (wrong type, missing fields, etc.)
- `EXECUTION_FAILED`: Agent execution failed (compilation errors, runtime exceptions)
- `API_REQUEST_FAILED`: API request to LLM provider failed (network errors, timeouts)
- `TOOL_EXECUTION_FAILED`: Tool/function invocation failed during agent execution
- `INTERNAL_ERROR`: Internal validation or system error (indicates code bug)

### 6. Usage Examples in Codebase

#### From src/core/agent.ts

**Line 472**: No result message received
```typescript
return createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  'No result message received from Agent SDK',
  { duration },
  false
);
```

**Line 483**: Agent SDK execution failed
```typescript
return createErrorResponse(
  'EXECUTION_FAILED',
  `Agent SDK execution failed: ${errorResult.subtype}`,
  {
    errors: errorResult.errors ?? [],
    subtype: errorResult.subtype,
  },
  errorResult.subtype === 'error_max_turns' // Recoverable if just hit turn limit
);
```

**Line 515**: Response validation failed
```typescript
return createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  `Response validation failed: ${errorSummary}`,
  {
    validationErrors: zodError.errors.map((err) => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      code: err.code,
    })),
  },
  false
);
```

**Line 592**: Success response creation
```typescript
const agentResponse = createSuccessResponse(validated, metadata);
```

**Line 607**: API request failed
```typescript
return createErrorResponse(
  'API_REQUEST_FAILED',
  `Agent SDK error: ${message}`,
  { duration },
  true // API errors are typically recoverable
);
```

### 7. Metadata Structure (AgentResponseMetadata)

**Lines 284-339**: Response metadata interface

```typescript
export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;

  /** Token usage from the API (optional) */
  usage?: TokenUsage;

  /** Number of tool invocations (optional) */
  toolCalls?: number;
}
```

**Common metadata patterns**:

```typescript
// Basic required fields
const metadata: AgentResponseMetadata = {
  agentId: 'agent-123',
  timestamp: Date.now(),
};

// Full metadata with all fields
const metadata: AgentResponseMetadata = {
  agentId: 'agent-123',
  timestamp: 1706140800000,
  duration: 1523,
  requestId: 'req-abc123',
  usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 25 },
  toolCalls: 3
};
```

### 8. Key Patterns and Best Practices

1. **PRD 6.4 Compliance**: All factory functions ensure responses are:
   - Strict JSON parseable by `JSON.parse()`
   - No prose wrapping (pure JSON structure)
   - Consistent structure with the AgentResponse interface
   - Uses `null` instead of `undefined` for absent values

2. **Type Safety**: Type guards provide runtime type narrowing:
   ```typescript
   if (isSuccess(response)) {
     // TypeScript knows: response.data is T, response.error is null
   }
   ```

3. **Error Recovery**: The `recoverable` flag indicates if errors can be retried:
   - `true` for transient errors (rate limits, network issues)
   - `false` for permanent errors (validation, invalid format)

4. **Defense-in-Depth**: The agent.ts file validates all responses before returning them:
   ```typescript
   const validatedResponse = this.validateResponse(agentResponse, prompt.responseFormat);
   ```

5. **Descriptive Error Messages**: Always include context in error messages:
   ```typescript
   throw new Error(`SDK not initialized. Call initialize() first.`);
   ```

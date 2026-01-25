# Error Codes Reference - Research Notes

## AGENT_ERROR_CODES Definition

**File**: `/home/dustin/projects/groundswell/src/types/agent.ts` (lines 442-493)

```typescript
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

## AgentErrorDetails Interface

**File**: `/home/dustin/projects/groundswell/src/types/agent.ts` (lines 221-250)

```typescript
export interface AgentErrorDetails {
  /** Machine-readable error code (SCREAMING_SNAKE_CASE convention) */
  code: string;

  /** Human-readable error description suitable for display or logging */
  message: string;

  /** Additional error context - null if no details available */
  details?: Record<string, unknown> | null;

  /** Whether the error is recoverable (can retry) */
  recoverable: boolean;
}
```

## Error Code Naming Convention

All error codes follow **SCREAMING_SNAKE_CASE** format:
- Regex pattern: `/^[A-Z][A-Z_]*$/`
- Examples: `INVALID_RESPONSE_FORMAT`, `VALIDATION_FAILED`, `EXECUTION_FAILED`

## Recoverable Field Behavior

| Error Code | Typical Recoverable Value | Rationale |
|------------|--------------------------|-----------|
| `INVALID_RESPONSE_FORMAT` | `false` | Malformed responses won't fix themselves |
| `VALIDATION_FAILED` | `false` | Invalid inputs won't become valid on retry |
| `EXECUTION_FAILED` | Context-dependent | May be recoverable if transient (e.g., resource lock) |
| `API_REQUEST_FAILED` | `true` | Network/timeout issues often resolve on retry |
| `TOOL_EXECUTION_FAILED` | Context-dependent | Depends on tool failure type |
| `INTERNAL_ERROR` | `false` | Code bugs are not recoverable |

## Tool Failure Error Details Pattern

When tools fail, the `details` field should include:
```typescript
{
  toolName: string,      // Name of the failed tool
  toolInput: unknown,    // Input provided to the tool
  originalError?: string // Original error from tool
}
```

## PRD Section 6.2 Requirements

### Machine-Readable Error Codes
- Error codes must be **strings** (not numbers)
- Must follow consistent naming pattern (UPPER_SNAKE_CASE)
- Must be programmatically parsable by machines/automated systems

### Example Error Response (from PRD 6.5)
```json
{
  "status": "error",
  "data": null,
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Failed to compile TypeScript files",
    "details": {
      "failedFiles": ["src/index.ts"],
      "compilerErrors": ["TS2307: Cannot find module 'foo'"]
    },
    "recoverable": true
  },
  "metadata": {
    "agentId": "agent-abc123",
    "timestamp": 1706140800000,
    "duration": 892
  }
}
```

### PRD 6.6 Validation Requirement
"Workflows receiving agent responses SHOULD validate against the `AgentResponse` schema before processing. Invalid responses must be treated as errors with code `INVALID_RESPONSE_FORMAT`."

## Existing Test Files for Reference

1. **agent-response-factory.test.ts** - Lines 84-138: Error response factory tests
2. **agent-response.test.ts** - Lines 1014-1147: Error response schema validation tests
3. **agent-response-public-api.test.ts** - Lines 145-152: Error code export tests
4. **agent.test.ts** - Lines 603-684: Internal error handling tests

## createErrorResponse Factory Function

**File**: `/home/dustin/projects/groundswell/src/types/agent.ts` (lines 595-615)

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

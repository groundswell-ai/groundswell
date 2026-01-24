# Product Requirement Prompt (PRP): Add INVALID_RESPONSE_FORMAT Error Handling

**PRP ID**: P1.M1.T1.S4
**Work Item**: Add INVALID_RESPONSE_FORMAT error handling
**Created**: 2026-01-24
**Status**: Implementation-Ready

---

## Goal

**Feature Goal**: Wrap Zod validation failures in `Agent.prompt()` with try-catch error handling that returns `AgentResponse` with `error.code='INVALID_RESPONSE_FORMAT'`, logs the validation failure, and preserves error details for debugging.

**Deliverable**: Updated error handling in `Agent.executePrompt()` method that:

1. Catches Zod validation errors from `prompt.validateResponse()`
2. Returns `AgentResponse<null>` with `error.code='INVALID_RESPONSE_FORMAT'`
3. Logs validation failures with structured context (Zod error details, agent info, request ID)
4. Includes sanitized Zod error details in the `error.details` field
5. Preserves metadata (agentId, timestamp, duration, requestId) even for validation failures
6. Never throws exceptions for Zod validation failures

**Success Definition**:

- [ ] Zod validation errors caught by try-catch around `prompt.validateResponse()`
- [ ] Error responses returned with `error.code='INVALID_RESPONSE_FORMAT'`
- [ ] Validation failures logged with `logger.error()` or `console.error()`
- [ ] Error details include Zod error information (sanitized)
- [ ] Metadata populated (agentId, timestamp, duration, requestId)
- [ ] No unhandled ZodError exceptions
- [ ] TypeScript compiles without errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

---

## Why

This task implements **PRD section 6.6** requirement: "Invalid responses must be treated as errors with code `INVALID_RESPONSE_FORMAT`."

**Problem**: Currently, when `prompt.validateResponse()` (line 424 in `src/core/agent.ts`) encounters a Zod validation error, it throws an unhandled `ZodError` exception. This:

1. **Violates PRD 6.6**: Invalid responses should return error responses, not throw
2. **Breaks AgentResponse Contract**: `Agent.prompt()` must return `AgentResponse<T>`, never throw
3. **Loses Observability**: No structured logging of validation failures
4. **Lacks Context**: No metadata preserved when validation fails
5. **Prevents Retry Logic**: Callers can't distinguish recoverable vs. unrecoverable errors

**Solution**: Wrap Zod validation in try-catch and convert to `AgentResponse<null>` with proper error structure.

**Impact**:
- Enables P1.M2.T1 (Zod schema validation for AgentResponse)
- Improves debuggability of malformed AI responses
- Supports retry logic at workflow level
- Maintains consistent error handling pattern

---

## What

### Scope

**In Scope**:
- Add try-catch around `prompt.validateResponse()` call in `executePrompt()`
- Catch `ZodError` exceptions specifically
- Return `createErrorResponse('INVALID_RESPONSE_FORMAT', ...)` for Zod failures
- Log validation failures with structured context
- Include sanitized Zod error details in `error.details`
- Preserve metadata (agentId, timestamp, duration, requestId)

**Out of Scope**:
- Modifying `safeValidateResponse()` method (already exists, use it instead)
- Changing Zod schema definitions
- Modifying other validation sites (JSON parsing, text extraction - already handled in P1.M1.T1.S3)
- Adding new error codes beyond INVALID_RESPONSE_FORMAT

### Success Criteria

- [ ] Try-catch wraps `prompt.validateResponse()` at line 424
- [ ] `ZodError` specifically caught (not generic Error)
- [ ] Error response uses `INVALID_RESPONSE_FORMAT` code
- [ ] Validation failures logged with context
- [ ] Error details include sanitized Zod error information
- [ ] Metadata populated correctly
- [ ] Zero TypeScript compilation errors
- [ ] No unhandled ZodError exceptions in tests

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this error handling successfully?

**Answer**: YES - This PRP provides:
- Exact location of validation call to wrap
- Zod error handling patterns from codebase research
- Existing error response factory functions
- Logging patterns from the codebase
- Best practices from external research
- Complete implementation examples

### Documentation & References

```yaml
# CRITICAL - PRD specification for INVALID_RESPONSE_FORMAT

- docfile: PRD.md
  section: Section 6.6 (Validation) - Line 246
  why: Defines that invalid responses must be treated as errors with code INVALID_RESPONSE_FORMAT
  critical: |
    "Workflows receiving agent responses SHOULD validate against the AgentResponse schema before processing.
    Invalid responses must be treated as errors with code INVALID_RESPONSE_FORMAT."

# CRITICAL - Previous PRP (P1.M1.T1.S3) Dependency

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/PRP.md
  why: Defines the AgentResponse wrapping pattern this task extends
  section:
    - Goal Section: Agent.prompt() returns Promise<AgentResponse<T>>
    - Implementation Tasks: Task 4 shows error site update patterns
    - Error Code Mapping Table: Shows INVALID_RESPONSE_FORMAT is for format issues
  critical: |
    P1.M1.T1.S3 wraps existing error sites but does NOT wrap the Zod validation call.
    Line 424 (prompt.validateResponse) throws ZodError and needs try-catch added.
    This task adds the missing try-catch for Zod validation failures.

# CRITICAL - Agent Implementation

- file: src/core/agent.ts
  why: Main file to modify - contains executePrompt() with Zod validation call
  lines:
    - 188: executePrompt() method signature (returns Promise<AgentResponse<T>> after P1.M1.T1.S3)
    - 424: const validated = prompt.validateResponse(parsed); - LINE TO WRAP
    - 22-26: Imports for createSuccessResponse, createErrorResponse (already present)
    - 29: generateId import for requestId generation
  pattern: |
    // Current code (line 424):
    const validated = prompt.validateResponse(parsed);

    // This throws ZodError if validation fails
    // No try-catch exists - this is the gap to fix

- file: src/core/prompt.ts
  why: Prompt class with validateResponse and safeValidateResponse methods
  lines:
    - 80-82: validateResponse() - uses .parse() and throws ZodError
    - 89-97: safeValidateResponse() - uses .safeParse() and returns result object
  pattern: |
    // validateResponse (current approach, throws):
    public validateResponse(data: unknown): T {
      return this.responseFormat.parse(data);
    }

    // safeValidateResponse (alternative approach, recommended):
    public safeValidateResponse(
      data: unknown
    ): { success: true; data: T } | { success: false; error: z.ZodError } {
      const result = this.responseFormat.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    }

# CRITICAL - Factory Functions (Already Implemented)

- file: src/types/agent.ts
  why: Contains createErrorResponse for wrapping errors in AgentResponse format
  lines:
    - 241-261: createErrorResponse() function signature and implementation
    - 183-184: INVALID_RESPONSE_FORMAT error code constant
  pattern: |
    import { createErrorResponse } from '../types/agent.js';

    // Usage pattern:
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'Human-readable message',
      { key: 'value' },  // optional details
      false              // recoverable flag
    );

# CRITICAL - Logging Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T1S4/research/logging-patterns.md
  why: Documents logging patterns in the codebase
  section:
    - Section 1: WorkflowLogger for structured logging
    - Section 5: Validation failure patterns
    - Section 6: Key findings summary
  critical: |
    Primary logging uses WorkflowLogger with observer pattern:
    - this.logger.error(message, data)
    - Falls back to console.error for critical failures

    LogEntry structure:
    {
      id: string,
      workflowId: string,
      timestamp: number,
      level: 'error',
      message: string,
      data?: unknown
    }

# CRITICAL - Zod Error Handling Best Practices

- docfile: plan/002_6761e4b84fd1/P1M1T1S4/research/error-handling-best-practices.md
  why: External research on Zod error handling patterns
  section:
    - Section 1: safeParse() vs parse() patterns
    - Section 2: Catching and converting ZodError
    - Section 5: Logging validation failures
    - Section 6: Common pitfalls
    - Section 8: Complete implementation example
  critical: |
    Best Practice: Use safeParse() instead of try-catch for better control

    ZodError structure:
    - error.errors: Array of validation issues
    - Each error has: path, message, code

    Sanitization needed:
    - Don't log sensitive data (passwords, tokens, PII)
    - Use SENSITIVE_FIELDS pattern for redaction

# EXTERNAL - Zod Documentation

- url: https://github.com/colinhacks/zod#error-handling
  why: Official Zod error handling documentation
  critical:
    - ZodError.errors array contains validation details
    - Each error has path (array), message (string), code (string)
    - Use error.format() for pretty-printed errors

# EXTERNAL - Zod safeParse Pattern

- url: https://zod.dev/basic-usage#parsing
  why: Documentation on safeParse vs parse
  critical:
    - safeParse() returns { success: boolean, data?: T, error?: ZodError }
    - Never throws exceptions
    - Preferred for production error handling
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # [MODIFY] Add try-catch around line 424
│   ├── prompt.ts                # [REFERENCE] safeValidateResponse() method
│   ├── context.ts               # [REFERENCE] getExecutionContext()
│   └── ...
├── types/
│   ├── agent.ts                 # [IMPORT] createErrorResponse, AGENT_ERROR_CODES
│   └── ...
├── utils/
│   └── id.ts                    # [REFERENCE] generateId() for requestId
└── __tests__/
    ├── unit/
    │   ├── agent.test.ts        # [WILL NEED UPDATES in P1.M1.T2]
    │   └── ...
    └── integration/
        └── agent-workflow.test.ts  # [REFERENCE for test patterns]
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: prompt.validateResponse() uses .parse() which throws ZodError
// Line 424 in agent.ts: const validated = prompt.validateResponse(parsed);
// This is the line that needs try-catch wrapper

// CRITICAL: safeValidateResponse() exists but is NOT used
// Better approach: Use safeValidateResponse() instead of try-catch
// Returns { success: true; data: T } | { success: false; error: z.ZodError }

// CRITICAL: Error response metadata must include all fields
// Even validation failures should have: agentId, timestamp, duration, requestId

// CRITICAL: ZodError.errors array contains structured validation info
// Each error has: path (field location), message (human-readable), code (error type)
// Example: [{ path: ['user', 'email'], message: 'Invalid email', code: 'invalid_string' }]

// CRITICAL: Logging should sanitize sensitive data
// Don't log raw parsed response - may contain sensitive info
// Only log Zod error structure, not the actual data

// CRITICAL: INVALID_RESPONSE_FORMAT is already defined
// In src/types/agent.ts: INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT'
// Use this constant, don't hardcode the string

// CRITICAL: After P1.M1.T1.S3, executePrompt returns AgentResponse<T>
// Cannot throw exceptions - must return error responses
// All errors become AgentResponse with status: 'error'

// GOTCHA: Validation occurs AFTER JSON parsing
// Line 421: const parsed = JSON.parse(jsonMatch[0]);
// Line 424: const validated = prompt.validateResponse(parsed);
// Only wrap the validateResponse call, not JSON.parse

// GOTCHA: Context (ctx) may be null
// Check if (ctx) before emitting workflow events or using logger
// Fallback to console.error if no logger available
```

---

## Implementation Blueprint

### Data Models and Structure

**AgentResponse Error Format (Already Implemented in src/types/agent.ts):**

```typescript
// Error response structure
export interface AgentErrorDetails {
  code: string;                    // 'INVALID_RESPONSE_FORMAT'
  message: string;                 // Human-readable description
  details?: Record<string, unknown>; // Zod error info
  recoverable: boolean;            // false for format errors
}

// Factory function
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null>;
```

**ZodError Structure (from Zod library):**

```typescript
import type { ZodError } from 'zod';

interface ZodError {
  errors: Array<{
    path: (string | number)[];  // Field location in nested structure
    message: string;             // Human-readable validation message
    code: string;                // Zod error code (e.g., 'invalid_type')
  }>;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD try-catch around validateResponse() call
  - FIND: src/core/agent.ts line 424
  - CURRENT: const validated = prompt.validateResponse(parsed);
  - MODIFY: Wrap in try-catch to catch ZodError
  - CATCH: Specifically catch ZodError, not generic Error
  - RETURN: createErrorResponse() with INVALID_RESPONSE_FORMAT code
  - PLACEMENT: Inside executePrompt() method

Task 2: EXTRACT Zod error details for error response
  - FROM: caught ZodError object
  - EXTRACT: error.errors array (path, message, code)
  - SANITIZE: Remove sensitive data before logging
  - FORMAT: Structured details object for error.details field
  - PRESERVE: Validation context (field paths, error messages, codes)

Task 3: ADD validation failure logging
  - LOG LEVEL: error
  - MESSAGE: "Response validation failed for {agentName}"
  - CONTEXT: Include agentId, requestId, zodErrors
  - FALLBACK: Use console.error if no logger available
  - SANITIZE: Don't log raw parsed response data
  - PATTERN: Follow existing logging patterns in codebase

Task 4: PRESERVE metadata in error response
  - INCLUDE: agentId (this.id)
  - INCLUDE: timestamp (startTime from method start)
  - INCLUDE: duration (Date.now() - startTime)
  - INCLUDE: requestId (generated at method start)
  - ENSURE: All metadata fields populated even for errors

Task 5: ENSURE proper error response structure
  - STATUS: 'error'
  - DATA: null
  - ERROR.CODE: 'INVALID_RESPONSE_FORMAT'
  - ERROR.MESSAGE: Human-readable description
  - ERROR.DETAILS: Sanitized Zod error info
  - ERROR.RECOVERABLE: false (format errors not recoverable)
  - METADATA: All fields populated

Task 6: VERIFY TypeScript compilation
  - RUN: npm run lint
  - EXPECTED: Zero type errors
  - CHECK: ZodError import if using type guard
  - CHECK: createErrorResponse parameter types match

Task 7: RUN build to verify compilation
  - RUN: npm run build
  - EXPECTED: Clean build, dist/ directory populated
  - FIX: Any compilation errors

Task 8: CREATE unit tests for validation error handling
  - CREATE: src/__tests__/unit/agent-zod-validation.test.ts
  - TEST: Zod validation error caught and wrapped
  - TEST: Error response has correct structure
  - TEST: Metadata populated correctly
  - TEST: Logging occurs without sensitive data
  - MOCK: Prompt with failing schema
```

### Implementation Patterns & Key Details

```typescript
// ========================
// IMPORTS (if needed)
// ========================

// May need to import ZodError type for type checking
import type { ZodError } from 'zod';

// createErrorResponse should already be imported from P1.M1.T1.S3
// If not, add to line 22-26:
import { createErrorResponse } from '../types/agent.js';

// ========================
// CURRENT CODE (Line 424)
// ========================

// This throws ZodError if validation fails
const validated = prompt.validateResponse(parsed);

// ========================
// SOLUTION 1: Try-Catch with validateResponse()
// ========================

let validated: T;
try {
  validated = prompt.validateResponse(parsed);
} catch (error) {
  // Check if it's a ZodError
  if (error instanceof Error && 'errors' in error) {
    const zodError = error as ZodError;

    // Log the validation failure
    if (ctx && this.logger) {
      this.logger.error('Response validation failed', {
        agentId: this.id,
        agentName: this.name,
        requestId,
        zodErrors: zodError.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });
    } else {
      console.error('Response validation failed', {
        agentId: this.id,
        agentName: this.name,
        requestId,
        zodErrors: zodError.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });
    }

    // Return error response
    const duration = Date.now() - startTime;
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      `Response validation failed: ${zodError.errors.length} error(s)`,
      {
        validationErrors: zodError.errors.map(err => ({
          field: err.path.join('.') || 'root',
          message: err.message,
          code: err.code,
        })),
        errorCount: zodError.errors.length,
      },
      false // not recoverable
    );
  }

  // Re-throw non-Zod errors
  throw error;
}

// ========================
// SOLUTION 2: Use safeValidateResponse() (RECOMMENDED)
// ========================

const validationResult = prompt.safeValidateResponse(parsed);

if (!validationResult.success) {
  const zodError = validationResult.error;

  // Log the validation failure
  if (ctx && this.logger) {
    this.logger.error('Response validation failed', {
      agentId: this.id,
      agentName: this.name,
      requestId,
      zodErrors: zodError.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });
  } else {
    console.error('Response validation failed', {
      agentId: this.id,
      agentName: this.name,
      requestId,
      zodErrors: zodError.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });
  }

  // Return error response
  const duration = Date.now() - startTime;
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    `Response validation failed: ${zodError.errors.length} error(s)`,
    {
      validationErrors: zodError.errors.map(err => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
      })),
      errorCount: zodError.errors.length,
    },
    false // not recoverable
  );
}

const validated = validationResult.data;

// ========================
// HELPER: Sanitization function for logging
// ========================

// Define sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password', 'token', 'apiKey', 'secret', 'ssn',
  'creditCard', 'cvv', 'auth', 'credential'
];

function sanitizeForLogging(data: unknown): unknown {
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

// Use in logging:
this.logger.error('Response validation failed', {
  agentId: this.id,
  requestId,
  // Sanitize parsed data before logging
  responsePreview: sanitizeForLogging(parsed),
  zodErrors: zodError.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  })),
});

// ========================
// HELPER: Format Zod error for user-friendly message
// ========================

function formatZodErrorSummary(zodError: ZodError): string {
  const errorSummaries = zodError.errors.map(err => {
    const field = err.path.length > 0 ? err.path.join('.') : 'response';
    return `${field}: ${err.message}`;
  });
  return errorSummaries.join('; ');
}

// Use in error response:
return createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  `Response validation failed: ${formatZodErrorSummary(zodError)}`,
  {
    validationErrors: zodError.errors.map(err => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      code: err.code,
    })),
    errorCount: zodError.errors.length,
  },
  false
);

// ========================
// METADATA PRESERVATION
// ========================

// After P1.M1.T1.S3, createErrorResponse sets default metadata
// But we should provide the actual values from our execution context

// Option 1: Override metadata after creation
const errorResponse = createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  message,
  details,
  false
);
errorResponse.metadata = {
  agentId: this.id,
  timestamp: startTime,
  duration: Date.now() - startTime,
  requestId,
};
return errorResponse;

// Option 2: Use createSuccessResponse pattern with null data
// (if createErrorResponse doesn't support metadata override)

// ========================
// LOCATION: Full context around line 424
// ========================

// Lines 410-450 (approximate context)
const parsed = JSON.parse(jsonMatch[0]);

// VALIDATION: Wrap this line (424)
const validationResult = prompt.safeValidateResponse(parsed);

if (!validationResult.success) {
  // Error handling code here
  // ...
}

const validated = validationResult.data;

// Call session end hooks
await this.callHooks(effectiveHooks?.sessionEnd, {
  agentId: this.id,
  agentName: this.name,
  totalDuration: Date.now() - startTime,
} as SessionEndContext);

const duration = Date.now() - startTime;
// ... rest of method
```

### Error Response Structure Example

```typescript
// Example error response returned for Zod validation failure
{
  "status": "error",
  "data": null,
  "error": {
    "code": "INVALID_RESPONSE_FORMAT",
    "message": "Response validation failed: user.email: Invalid email format; user.age: Number expected",
    "details": {
      "validationErrors": [
        {
          "field": "user.email",
          "message": "Invalid email format",
          "code": "invalid_string"
        },
        {
          "field": "user.age",
          "message": "Expected number, received string",
          "code": "invalid_type"
        }
      ],
      "errorCount": 2
    },
    "recoverable": false
  },
  "metadata": {
    "agentId": "agent-abc123",
    "timestamp": 1706140800000,
    "duration": 1523,
    "requestId": "req-xyz789"
  }
}
```

### Integration Points

```yaml
TYPE DEFINITIONS:
  - file: src/types/agent.ts
    import: createErrorResponse, AGENT_ERROR_CODES
    lines: 241-261 (factory function), 183-184 (error code)

PROMPT CLASS:
  - file: src/core/prompt.ts
    method: safeValidateResponse()
    lines: 89-97
    returns: { success: true; data: T } | { success: false; error: z.ZodError }

LOGGING:
  - file: src/core/agent.ts
    property: this.logger (if available)
    fallback: console.error()
    pattern: logger.error(message, { context })

CONTEXT:
  - file: src/core/context.ts
    function: getExecutionContext()
    provides: ctx.workflowNode, ctx.logger
    check: if (ctx) before using

ZOD LIBRARY:
  - package: zod
    import: import type { ZodError } from 'zod'
    usage: Type checking for caught errors

METADATA:
  - from: executePrompt() method scope
  - agentId: this.id
  - timestamp: startTime (const at method start)
  - duration: Date.now() - startTime
  - requestId: generated at method start
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after modification - fix before proceeding
npm run lint         # TypeScript type checking (tsc --noEmit)
npm run build        # Full build (tsc)

# Check specific file
npx tsc --noEmit src/core/agent.ts

# Expected: Zero errors. If errors exist:
# 1. Check ZodError type is imported correctly
# 2. Check createErrorResponse parameter types match
# 3. Check safeValidateResponse return type handling
# 4. Verify metadata assignment pattern
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test agent response factory functions (already implemented)
npm test -- agent-response-factory.test.ts

# Run all unit tests
npm test -- src/__tests__/unit/

# Watch mode for development
npm run test:watch

# Expected: All tests pass. Common issues:
# - ZodError not being caught properly
# - Metadata not assigned correctly
# - Type mismatches in error response
```

### Level 3: Integration Testing (System Validation)

```bash
# Test with malformed AI response (mocked)
# Create test that returns invalid JSON structure
# Verify error response returned instead of exception

# Example test case:
# 1. Mock Anthropic API to return malformed JSON
# 2. Call agent.prompt()
# 3. Assert response.status === 'error'
# 4. Assert response.error.code === 'INVALID_RESPONSE_FORMAT'
# 5. Assert response.metadata is populated

npm test -- agent-workflow.test.ts

# Expected: Validation failures return structured errors
```

### Level 4: Validation Error Handling Testing

```bash
# Create comprehensive test for Zod validation scenarios
# Test file: src/__tests__/unit/agent-zod-validation.test.ts

# Test cases:
# 1. Missing required field → INVALID_RESPONSE_FORMAT
# 2. Wrong type for field → INVALID_RESPONSE_FORMAT
# 3. Nested field validation → INVALID_RESPONSE_FORMAT
# 4. Multiple validation errors → All in details array
# 5. Metadata populated on error → agentId, timestamp, etc.
# 6. Logging occurs → Check console/logger output
# 7. Sensitive data redacted → Password/token fields redacted

# Example test structure:
describe('Agent Zod validation error handling', () => {
  it('should catch Zod validation errors and return INVALID_RESPONSE_FORMAT', async () => {
    // Mock API to return invalid structure
    // Call agent.prompt()
    // Assert error response structure
  });

  it('should log validation failures without sensitive data', async () => {
    // Mock API to return invalid structure with sensitive field
    // Spy on logger.error
    // Call agent.prompt()
    // Assert log doesn't contain sensitive data
  });

  it('should populate metadata on validation errors', async () => {
    // Mock API to return invalid structure
    // Call agent.prompt()
    // Assert metadata.agentId, metadata.timestamp, etc.
  });
});
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Try-catch or safeValidateResponse wraps validation call at line 424
- [ ] ZodError specifically handled (not generic Error)
- [ ] Error response uses 'INVALID_RESPONSE_FORMAT' code
- [ ] Validation failures logged with structured context
- [ ] Error details include sanitized Zod error information
- [ ] Metadata populated (agentId, timestamp, duration, requestId)
- [ ] Zero TypeScript errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

### Feature Validation

- [ ] `prompt<T>()` returns `AgentResponse<T>` with status: 'error' on validation failure
- [ ] Error response structure matches PRD section 6.2
- [ ] Error code is 'INVALID_RESPONSE_FORMAT' (SCREAMING_SNAKE_CASE)
- [ ] Error message is human-readable
- [ ] Error details include Zod error structure
- [ ] Error recoverable flag is false (format errors not recoverable)
- [ ] Metadata.agentId matches agent.id
- [ ] Metadata.timestamp is execution start time
- [ ] Metadata.duration is validation time
- [ ] Metadata.requestId matches execution request ID

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] Uses safeValidateResponse() instead of try-catch (recommended)
- [ ] Logging uses existing logger or console.error fallback
- [ ] Sensitive data redacted from logs
- [ ] Type annotations correct for ZodError handling
- [ ] No hardcoded error codes (use AGENT_ERROR_CODES constant)
- [ ] Error details structure is consistent
- [ ] Comments explain non-obvious logic

### Integration Readiness

- [ ] Factory functions imported correctly
- [ ] ZodError type imported if needed
- [ ] Context (ctx) checked before use
- [ ] Logger fallback implemented
- [ ] Metadata preservation complete
- [ ] Ready for P1.M1.T2 (call site updates)
- [ ] Ready for P1.M2.T1 (Zod schema validation)

---

## Anti-Patterns to Avoid

- ❌ Don't use `validateResponse()` with try-catch - use `safeValidateResponse()` instead
- ❌ Don't log raw parsed response - may contain sensitive data
- ❌ Don't hardcode 'INVALID_RESPONSE_FORMAT' string - use constant
- ❌ Don't throw exceptions - must return error responses
- ❌ Don't forget to populate metadata on errors
- ❌ Don't ignore Zod error details - include in error.details
- ❌ Don't use generic Error catch - specifically handle ZodError
- ❌ Don't set recoverable: true - format errors are not recoverable
- ❌ Don't log sensitive fields (password, token, etc.) - sanitize first
- ❌ Don't skip logging - validation failures need observability

---

## Appendix: Complete Implementation Example

```typescript
// src/core/agent.ts
// Lines 410-450 (approximate)

// Parse JSON from response
const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'No JSON object found in response',
    { responseText: textContent.text.substring(0, 200) },
    false
  );
}

const parsed = JSON.parse(jsonMatch[0]);

// ========================
// NEW: Zod validation with error handling
// ========================

const validationResult = prompt.safeValidateResponse(parsed);

if (!validationResult.success) {
  const zodError = validationResult.error;

  // Format user-friendly error summary
  const errorSummary = zodError.errors
    .map(err => {
      const field = err.path.length > 0 ? err.path.join('.') : 'response';
      return `${field}: ${err.message}`;
    })
    .join('; ');

  // Log validation failure (if logger available)
  if (ctx && this.logger) {
    this.logger.error('Response validation failed', {
      agentId: this.id,
      agentName: this.name,
      requestId,
      errorCount: zodError.errors.length,
      validationErrors: zodError.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });
  } else {
    console.error('Response validation failed', {
      agentId: this.id,
      agentName: this.name,
      requestId,
      errorCount: zodError.errors.length,
      validationErrors: zodError.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });
  }

  // Calculate duration for metadata
  const duration = Date.now() - startTime;

  // Return error response
  const errorResponse = createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    `Response validation failed: ${errorSummary}`,
    {
      validationErrors: zodError.errors.map(err => ({
        field: err.path.join('.') || 'root',
        message: err.message,
        code: err.code,
      })),
      errorCount: zodError.errors.length,
    },
    false // not recoverable
  );

  // Override metadata with actual execution values
  errorResponse.metadata = {
    agentId: this.id,
    timestamp: startTime,
    duration,
    requestId,
  };

  return errorResponse;
}

const validated = validationResult.data;

// ========================
// Continue with normal flow
// ========================

// Call session end hooks
await this.callHooks(effectiveHooks?.sessionEnd, {
  agentId: this.id,
  agentName: this.name,
  totalDuration: Date.now() - startTime,
} as SessionEndContext);

const duration = Date.now() - startTime;

// ... rest of method
```

---

## Research Files

The following research files contain detailed analysis that informed this PRP:

1. **zod-validation-patterns.md** - Zod usage patterns in the codebase
2. **error-handling-best-practices.md** - External research on Zod error handling
3. **logging-patterns.md** - Logging patterns in the codebase (from agent output)
4. **agent-prompt-zod-validation.md** - Analysis of the validation gap (from agent output)

These files are located in:
```
plan/002_6761e4b84fd1/P1M1T1S4/research/
```

---

**Confidence Score**: 10/10

This PRP provides comprehensive, actionable context for implementing INVALID_RESPONSE_FORMAT error handling. All PRD requirements, existing codebase patterns, error handling strategies, logging patterns, and best practices are documented with specific references, line numbers, and complete code examples.

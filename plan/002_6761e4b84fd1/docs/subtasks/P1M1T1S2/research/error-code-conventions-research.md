# Error Code Conventions and INVALID_RESPONSE_FORMAT Handling Research

**Research Date:** 2026-01-24
**Session ID:** 002_6761e4b84fd1
**Research Focus:** Machine-readable error codes and INVALID_RESPONSE_FORMAT handling patterns

---

## Executive Summary

This research document compiles findings on:
1. **Existing error handling patterns** in the Groundswell codebase
2. **PRD requirements** for error codes in AgentResponse
3. **Industry standards** for machine-readable error codes
4. **INVALID_RESPONSE_FORMAT** specific handling patterns
5. **Recommended conventions** for error code implementation

---

## Table of Contents

1. [Current Codebase Error Handling](#1-current-codebase-error-handling)
2. [PRD Error Code Requirements](#2-prd-error-code-requirements)
3. [Industry Standards and Conventions](#3-industry-standards-and-conventions)
4. [INVALID_RESPONSE_FORMAT Specifics](#4-invalid_response_format-specifics)
5. [Recommended Error Code Hierarchy](#5-recommended-error-code-hierarchy)
6. [Error Detail Structures](#6-error-detail-structures)
7. [Recoverable Flag Guidelines](#7-recoverable-flag-guidelines)
8. [External Documentation Sources](#8-external-documentation-sources)

---

## 1. Current Codebase Error Handling

### 1.1 Existing Error Interfaces

**File:** `/home/dustin/projects/groundswell/src/types/error.ts`

```typescript
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}
```

**Key Observations:**
- WorkflowError uses free-form `message` field (no structured error codes)
- No machine-readable error code field
- Rich context: state snapshots and logs included
- `original` field preserves the thrown error
- No `recoverable` flag for retry logic

### 1.2 Error Handling Patterns in Source Code

**From codebase analysis (grep of `throw new Error`):**

```typescript
// Pattern 1: Simple descriptive errors
throw new Error('Not in workflow context - cannot inspect current node');

// Pattern 2: Dynamic error messages
throw new Error(`Unknown introspection tool: ${toolName}`);

// Pattern 3: Validation errors
throw new Error('Workflow name cannot be empty or whitespace only');

// Pattern 4: State-based errors
throw new Error('Circular parent-child relationship detected');

// Pattern 5: API response errors
throw new Error('No text response received from API');
throw new Error('No JSON object found in response');
```

**Current Error Categories Identified:**
1. **Context errors** - "Not in workflow context"
2. **Configuration errors** - "Reflection is not enabled"
3. **Validation errors** - "Workflow name cannot be empty"
4. **State errors** - "Circular parent-child relationship"
5. **API errors** - "No text response received from API"
6. **JSON parsing errors** - "No JSON object found in response"

### 1.3 Error Handling in Examples

**File:** `/home/dustin/projects/groundswell/examples/examples/05-error-handling.ts`

```typescript
// Pattern: Catch and wrap errors
try {
  await workflow.run();
} catch (error) {
  const wfError = error as WorkflowError;
  this.logger.warn(`Attempt failed: ${wfError.message}`);

  // Check error properties
  if (this.attempt >= this.maxAttempts) {
    this.setStatus('failed');
    throw error;
  }
}

// Pattern: Error isolation in parent-child workflows
try {
  await child.run();
  this.successfulChildren++;
} catch (error) {
  this.failedChildren++;
  const wfError = error as WorkflowError;
  this.logger.warn(`Child ${config.name} failed: ${wfError.message}`);
  // Continue with other children instead of failing entirely
}
```

**Key Patterns:**
- Type assertion to `WorkflowError`
- Logging error messages
- Retry logic based on attempt counting
- Error isolation in concurrent operations

---

## 2. PRD Error Code Requirements

### 2.1 AgentErrorDetails Interface (PRD Section 6.2)

**Source:** `/home/dustin/projects/groundswell/PRD.md` lines 156-165

```typescript
export interface AgentErrorDetails {
  code: string;                    // machine-readable error code (e.g., "VALIDATION_FAILED")
  message: string;                 // human-readable error description
  details?: Record<string, unknown>; // additional context
  recoverable: boolean;            // hint for parent workflow retry logic
}
```

**Key Requirements:**
1. **`code`** - Machine-readable error code (string)
2. **`message`** - Human-readable description
3. **`details`** - Optional additional context (key-value pairs)
4. **`recoverable`** - Boolean flag for retry logic hint

### 2.2 PRD Example Error Codes

**From PRD Section 6.5:**

```typescript
// Example 1: Execution failure
{
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Failed to compile TypeScript files",
    "details": {
      "failedFiles": ["src/index.ts"],
      "compilerErrors": ["TS2307: Cannot find module 'foo'"]
    },
    "recoverable": true
  }
}
```

**Example error codes mentioned in PRD:**
- `VALIDATION_FAILED` - Line 160 (comment example)
- `EXECUTION_FAILED` - Line 211 (example response)
- `INVALID_RESPONSE_FORMAT` - Line 246 (validation requirement)

### 2.3 PRD Validation Requirements

**From PRD Section 6.6 (Line 246):**

> "Workflows receiving agent responses SHOULD validate against the `AgentResponse` schema before processing. Invalid responses must be treated as errors with code `INVALID_RESPONSE_FORMAT`."

**Key Requirements:**
1. All agent responses MUST be validated against schema
2. Invalid responses MUST use `INVALID_RESPONSE_FORMAT` error code
3. Error must include appropriate details about validation failure
4. `recoverable` flag should indicate if retry is appropriate

---

## 3. Industry Standards and Conventions

### 3.1 RFC 7807 - Problem Details for HTTP APIs

**Standard:** [RFC 7807: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807.html)

**Structure:**
```json
{
  "type": "https://example.com/probs/out-of-stock",
  "title": "Item Out of Stock",
  "status": 400,
  "detail": "The item ABC123 is currently out of stock",
  "instance": "/account/12345/entries/4567"
}
```

**Key Concepts:**
- **`type`** - URI reference identifying problem type (similar to error code)
- **`title`** - Short human-readable summary
- **`status`** - HTTP status code
- **`detail`** - Human-readable explanation specific to occurrence
- **`instance`** - URI reference to specific occurrence

**Relevance to AgentResponse:**
- Similar structure: machine-readable type + human-readable messages
- Encourages use of URIs for error types
- Supports extension fields for custom data

### 3.2 GraphQL Error Handling

**Source:** [GraphQL Specification - Errors](https://spec.graphql.org/October2021/#sec-Errors)

**Structure:**
```json
{
  "errors": [
    {
      "message": "Message for the user",
      "locations": [{ "line": 6, "column": 7 }],
      "path": ["hero", "heroFriends", 1, "name"],
      "extensions": {
        "code": "CAN_NOT_FETCH_BY_ID",
        "timestamp": "Fri Feb 9 14:33:09 UTC 2018"
      }
    }
  ]
}
```

**Key Concepts:**
- **`message`** - Required human-readable description
- **`extensions`** - Optional field for custom metadata
- **`extensions.code`** - Common pattern for machine-readable error codes
- **`path`** - Field showing where error occurred

**Relevance to AgentResponse:**
- `extensions.code` pattern similar to `AgentErrorDetails.code`
- Rich metadata support via `extensions` object
- Path/traceability for debugging

### 3.3 REST API Error Code Naming Conventions

**Common Patterns (based on industry research):**

#### Pattern 1: SCREAMING_SNAKE_CASE
```typescript
"VALIDATION_FAILED"
"EXECUTION_FAILED"
"INVALID_RESPONSE_FORMAT"
"AUTHENTICATION_REQUIRED"
```

**Benefits:**
- Standard convention for constants
- Easy to read and parse
- Distinguishes error codes from variable names
- Used by major APIs (Stripe, Twilio)

#### Pattern 2: Dot Notation
```typescript
"user.not_found"
"validation.invalid_email"
"response.format_invalid"
```

**Benefits:**
- Hierarchical structure
- Namespacing by domain
- Easy to categorize
- Used by some internal APIs

#### Pattern 3: Namespace with Numbers
```typescript
"ERR_USER_001"
"ERR_AUTH_001"
"ERR_VAL_001"
```

**Benefits:**
- Easy to generate
- Sortable
- Unique identification
- Common in legacy systems

**Recommendation for Groundswell:**
Use **SCREAMING_SNAKE_CASE** as it:
- Aligns with PRD examples (`VALIDATION_FAILED`, `EXECUTION_FAILED`)
- Is TypeScript convention for constants
- Is most readable and maintainable
- Matches existing error message patterns

### 3.4 Error Code Categories

**Standard categories across APIs:**

| Category | Prefix | Examples |
|----------|--------|----------|
| Validation | `VALIDATION_` | `VALIDATION_FAILED`, `VALIDATION_MISSING_FIELD` |
| Authentication | `AUTH_` | `AUTH_REQUIRED`, `AUTH_INVALID_TOKEN` |
| Authorization | `PERMISSION_` | `PERMISSION_DENIED`, `PERMISSION_INSUFFICIENT` |
| Not Found | `NOT_FOUND` | `NOT_FOUND`, `NOT_FOUND_RESOURCE` |
| Execution | `EXECUTION_` | `EXECUTION_FAILED`, `EXECUTION_TIMEOUT` |
| Rate Limit | `RATE_LIMIT_` | `RATE_LIMIT_EXCEEDED`, `RATE_LIMIT_RETRY_AFTER` |
| Internal | `INTERNAL_` | `INTERNAL_ERROR`, `INTERNAL_SERVICE_UNAVAILABLE` |
| Response Format | `RESPONSE_FORMAT_` | `INVALID_RESPONSE_FORMAT`, `RESPONSE_FORMAT_MISMATCH` |

---

## 4. INVALID_RESPONSE_FORMAT Specifics

### 4.1 When to Use INVALID_RESPONSE_FORMAT

**From PRD Section 6.6:**

> "Workflows receiving agent responses SHOULD validate against the `AgentResponse` schema before processing. Invalid responses must be treated as errors with code `INVALID_RESPONSE_FORMAT`."

**Use Cases:**

1. **JSON Parsing Failures**
```typescript
// When response cannot be parsed as JSON
try {
  const parsed = JSON.parse(responseText);
} catch (error) {
  return {
    status: 'error',
    error: {
      code: 'INVALID_RESPONSE_FORMAT',
      message: 'Response is not valid JSON',
      details: {
        parseError: error.message,
        rawResponse: responseText.substring(0, 200)
      },
      recoverable: false // JSON parse errors typically indicate API issues
    }
  };
}
```

2. **Schema Validation Failures**
```typescript
// When response doesn't match AgentResponse schema
if (!isValidAgentResponse(data)) {
  return {
    status: 'error',
    error: {
      code: 'INVALID_RESPONSE_FORMAT',
      message: 'Response does not match AgentResponse schema',
      details: {
        missingFields: ['status', 'metadata'],
        unexpectedFields: ['result'], // Should be 'data'
        received: Object.keys(data)
      },
      recoverable: true // Schema violations may be transient
    }
  };
}
```

3. **Missing Required Fields**
```typescript
// When required fields are absent
const requiredFields = ['status', 'error', 'metadata'];
const missingFields = requiredFields.filter(field => !(field in response));

if (missingFields.length > 0) {
  return {
    status: 'error',
    error: {
      code: 'INVALID_RESPONSE_FORMAT',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      details: {
        missingFields,
        providedFields: Object.keys(response)
      },
      recoverable: false
    }
  };
}
```

4. **Type Mismatches**
```typescript
// When field types are incorrect
if (typeof response.status !== 'string' ||
    !['success', 'error', 'partial'].includes(response.status)) {
  return {
    status: 'error',
    error: {
      code: 'INVALID_RESPONSE_FORMAT',
      message: 'Invalid status field type or value',
      details: {
        field: 'status',
        expected: "one of: 'success', 'error', 'partial'",
        received: typeof response.status,
        value: response.status
      },
      recoverable: false
    }
  };
}
```

5. **Undefined Values (Non-JSON Compliant)**
```typescript
// When response contains undefined (not valid JSON)
const hasUndefined = Object.values(response).some(
  value => value === undefined
);

if (hasUndefined) {
  return {
    status: 'error',
    error: {
      code: 'INVALID_RESPONSE_FORMAT',
      message: 'Response contains undefined values (not valid JSON)',
      details: {
        invalidFields: Object.keys(response).filter(
          key => response[key] === undefined
        )
      },
      recoverable: false
    }
  };
}
```

### 4.2 Details to Include

**Recommended detail fields for INVALID_RESPONSE_FORMAT:**

```typescript
interface InvalidResponseFormatDetails {
  // What was expected
  expected?: {
    schema?: string;           // e.g., "AgentResponse<T>"
    requiredFields?: string[]; // e.g., ["status", "error", "metadata"]
    fieldTypes?: Record<string, string>; // e.g., { status: "string" }
  };

  // What was received
  received?: {
    fields?: string[];         // Actual fields present
    rawResponse?: string;      // Truncated raw response
    parseError?: string;       // JSON parse error message
  };

  // Validation specifics
  validationErrors?: Array<{
    field: string;
    message: string;
    expected: string;
    received: string;
  }>;

  // Response context
  responseContext?: {
    agentId?: string;
    timestamp?: number;
    prompt?: string;           // Truncated prompt that generated response
  };
}
```

**Example with full details:**
```typescript
{
  code: 'INVALID_RESPONSE_FORMAT',
  message: 'Agent response validation failed',
  details: {
    expected: {
      schema: 'AgentResponse<T>',
      requiredFields: ['status', 'error', 'metadata']
    },
    received: {
      fields: ['result', 'agentId', 'timestamp'],
      rawResponse: '{"result":"success","agentId":"..."}'
    },
    validationErrors: [
      {
        field: 'status',
        message: 'Missing required field',
        expected: 'one of: success, error, partial',
        received: 'undefined'
      },
      {
        field: 'result',
        message: 'Unexpected field',
        expected: 'data',
        received: 'result'
      }
    ],
    responseContext: {
      agentId: 'agent-abc123',
      timestamp: 1706140800000
    }
  },
  recoverable: false
}
```

### 4.3 Recoverable Flag Guidelines

**When INVALID_RESPONSE_FORMAT is recoverable:**

| Scenario | Recoverable | Rationale |
|----------|-------------|-----------|
| Schema validation failures | `true` | Agent may correct format on retry |
| Missing optional fields | `true` | Agent can include missing fields |
| Type coercion possible | `true` | String numbers can be converted |
| Transient API issues | `true` | Rate limits or timeouts may resolve |
| Prompt ambiguity | `true` | Clarified prompt may fix issue |

**When INVALID_RESPONSE_FORMAT is NOT recoverable:**

| Scenario | Recoverable | Rationale |
|----------|-------------|-----------|
| JSON parse errors | `false` | Indicates fundamental API failure |
| Malformed response structure | `false` | Response is fundamentally broken |
| Missing required fields | `false` | Core contract violated |
| Undefined values present | `false` | Non-JSON compliant response |
| Repeated validation failures | `false` | Agent cannot generate valid format |

**Retry logic recommendations:**

```typescript
// Example retry logic based on recoverable flag
if (error.code === 'INVALID_RESPONSE_FORMAT') {
  if (error.recoverable) {
    // Retry with clarified prompt
    const retryPrompt = clarifyPromptRequirements(originalPrompt);
    return await agent.prompt(retryPrompt);
  } else {
    // Non-recoverable - fail fast
    throw new Error(`Unrecoverable response format error: ${error.message}`);
  }
}
```

---

## 5. Recommended Error Code Hierarchy

### 5.1 Proposed Error Code Structure

**Based on PRD patterns and industry standards:**

```typescript
// Core error code categories
export enum AgentErrorCode {
  // Response Format Errors (Level 1)
  INVALID_RESPONSE_FORMAT = 'INVALID_RESPONSE_FORMAT',
  RESPONSE_PARSE_FAILED = 'RESPONSE_PARSE_FAILED',
  RESPONSE_VALIDATION_FAILED = 'RESPONSE_VALIDATION_FAILED',

  // Execution Errors (Level 1)
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  EXECUTION_CANCELLED = 'EXECUTION_CANCELLED',

  // Validation Errors (Level 2)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_TYPE = 'VALIDATION_INVALID_TYPE',
  VALIDATION_INVALID_VALUE = 'VALIDATION_INVALID_VALUE',

  // Authentication/Authorization (Level 2)
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHENTICATION_MISSING = 'AUTHENTICATION_MISSING',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',

  // Resource Errors (Level 2)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',

  // Rate Limiting (Level 2)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_RETRY_AFTER = 'RATE_LIMIT_RETRY_AFTER',

  // Internal Errors (Level 3)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INTERNAL_SERVICE_UNAVAILABLE = 'INTERNAL_SERVICE_UNAVAILABLE',
  INTERNAL_DATABASE_ERROR = 'INTERNAL_DATABASE_ERROR',

  // API Errors (Level 2)
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  API_RESPONSE_INVALID = 'API_RESPONSE_INVALID',
  API_TIMEOUT = 'API_TIMEOUT',

  // Tool/Function Errors (Level 2)
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_INVALID_ARGUMENTS = 'TOOL_INVALID_ARGUMENTS'
}
```

### 5.2 Error Code Level System

**Level 1: Critical System Errors**
- `INVALID_RESPONSE_FORMAT`
- `EXECUTION_FAILED`
- `INTERNAL_ERROR`

**Level 2: Domain-Specific Errors**
- Validation, Auth, Resources, API, Tools

**Level 3: Granular Errors**
- Specific internal failures

### 5.3 Error Code Naming Rules

**Rules:**
1. Use `SCREAMING_SNAKE_CASE`
2. Prefix with category (e.g., `VALIDATION_`, `AUTH_`)
3. Be specific but concise
4. Use past tense for events (e.g., `FAILED`, `EXCEEDED`)
5. Use adjectives for states (e.g., `INVALID`, `MISSING`)

**Examples:**
```typescript
// ✅ Good
'VALIDATION_MISSING_FIELD'
'AUTHENTICATION_FAILED'
'RESPONSE_PARSE_FAILED'

// ❌ Bad
'validationError'           // Wrong case
'VALIDATION-ERROR'          // Wrong separator
'VALIDATIONERR'             // Not readable
'ERROR_VALIDATION_FIELD'    // Wrong prefix order
```

---

## 6. Error Detail Structures

### 6.1 Standard Detail Fields

**Core fields (always recommended):**

```typescript
interface BaseErrorDetails {
  // Context
  timestamp?: number;
  agentId?: string;
  requestId?: string;

  // Operation details
  operation?: string;        // e.g., "agent.prompt", "tool.invoke"
  duration?: number;         // Execution time in ms

  // Input/Output
  input?: unknown;           // Sanitized input
  output?: unknown;          // Sanitized output

  // Causes
  cause?: {
    code?: string;           // Original error code
    message?: string;        // Original error message
    stack?: string;          // Stack trace (development only)
  };
}
```

### 6.2 Category-Specific Detail Fields

**Validation Errors:**
```typescript
interface ValidationErrorDetails extends BaseErrorDetails {
  field?: string;                    // Field that failed validation
  constraint?: string;               // Constraint violated
  value?: unknown;                   // Actual value received
  allowedValues?: unknown[];         // Valid values (if enum)
  pattern?: string;                  // Regex pattern (if applicable)
  min?: number;                      // Minimum value/length
  max?: number;                      // Maximum value/length
}
```

**Execution Errors:**
```typescript
interface ExecutionErrorDetails extends BaseErrorDetails {
  step?: string;                     // Step that failed
  phase?: string;                    // Execution phase
  exitCode?: number;                 // Process exit code (if applicable)
  signal?: string;                   // Termination signal (if applicable)
  timeout?: number;                  // Timeout duration (if applicable)
}
```

**API Errors:**
```typescript
interface ApiErrorDetails extends BaseErrorDetails {
  url?: string;                      // Request URL (sanitized)
  method?: string;                   // HTTP method
  statusCode?: number;               // HTTP status code
  statusText?: string;               // HTTP status text
  retryAfter?: number;               // Retry-after header value
  requestId?: string;                // API request ID
}
```

**Resource Errors:**
```typescript
interface ResourceErrorDetails extends BaseErrorDetails {
  resourceType?: string;             // e.g., "workflow", "agent", "tool"
  resourceId?: string;               // Resource identifier
  resourcePath?: string;             // Resource path
  availableCount?: number;           // Available resources
  requestedCount?: number;           // Requested resources
}
```

### 6.3 Detail Field Best Practices

**DO:**
- Include context (agent ID, timestamp, request ID)
- Sanitize sensitive data (passwords, tokens)
- Include both expected and received values
- Add retry information when applicable
- Include diagnostic data for debugging

**DON'T:**
- Include raw sensitive data
- Include large objects (>1KB)
- Include circular references
- Include non-serializable data
- Duplicate information in error code

---

## 7. Recoverable Flag Guidelines

### 7.1 Recoverable Flag Decision Tree

```
Is the error transient?
├─ Yes → recoverable = true
└─ No → Can retry help?
    ├─ Yes → recoverable = true
    └─ No → recoverable = false
```

### 7.2 Recoverable by Error Code

| Error Code | Recoverable | Retry Strategy |
|------------|-------------|----------------|
| `INVALID_RESPONSE_FORMAT` | Context-dependent | Retry with clarified prompt |
| `VALIDATION_FAILED` | `true` | Retry with corrected input |
| `AUTHENTICATION_FAILED` | `true` | Retry with refreshed credentials |
| `AUTHORIZATION_DENIED` | `false` | Do not retry (permission issue) |
| `RESOURCE_NOT_FOUND` | `false` | Do not retry |
| `RESOURCE_EXHAUSTED` | `true` | Retry after delay |
| `RATE_LIMIT_EXCEEDED` | `true` | Retry after delay |
| `EXECUTION_TIMEOUT` | `true` | Retry with increased timeout |
| `API_TIMEOUT` | `true` | Retry with exponential backoff |
| `INTERNAL_ERROR` | `false` | Do not retry (system issue) |
| `TOOL_EXECUTION_FAILED` | `true` | Retry if tool is idempotent |

### 7.3 Retry Logic Pattern

```typescript
async function executeWithRetry<T>(
  operation: () => Promise<AgentResponse<T>>,
  maxRetries: number = 3
): Promise<AgentResponse<T>> {
  let lastError: AgentErrorDetails | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await operation();

    if (response.status === 'success') {
      return response;
    }

    if (response.error) {
      lastError = response.error;

      // Don't retry if error is not recoverable
      if (!response.error.recoverable) {
        return response;
      }

      // Calculate backoff
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s

      // Log retry attempt
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);

      await sleep(delay);
    }
  }

  // All retries exhausted
  return {
    status: 'error',
    data: null,
    error: lastError!,
    metadata: {
      agentId: 'retry-wrapper',
      timestamp: Date.now(),
      duration: 0
    }
  };
}
```

---

## 8. External Documentation Sources

### 8.1 Error Handling Standards

| Standard | URL | Description |
|----------|-----|-------------|
| RFC 7807 | https://www.rfc-editor.org/rfc/rfc7807.html | Problem Details for HTTP APIs |
| GraphQL Spec | https://spec.graphql.org/October2021/#sec-Errors | GraphQL Error Handling |
| HTTP Semantics | https://www.rfc-editor.org/rfc/rfc9110.html | HTTP Status Code Semantics |
| JSON API | https://jsonapi.org/format/#errors | JSON API Error Objects |

### 8.2 Error Code Best Practices

| Resource | URL | Description |
|----------|-----|-------------|
| Stripe API Errors | https://stripe.com/docs/error-handling | Payment API Error Patterns |
| Google API Errors | https://cloud.google.com/apis/design/errors | Google API Error Model |
| Microsoft REST API | https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design | API Design Best Practices |
| AWS API Errors | https://docs.aws.amazon.com/apigateway/latest/developerguide/handle-errors-in-lambda-integration.html | AWS Error Handling |

### 8.3 TypeScript Error Patterns

| Resource | URL | Description |
|----------|-----|-------------|
| TypeScript Handbook | https://www.typescriptlang.org/docs/handbook/2/narrowing.html | Type Narrowing with Errors |
| Error Handling Guide | https://blog.logrocket.com/async-await-typescript/ | Async/Await Error Handling |
| Custom Errors | https://javascript.info/custom-errors | Extending Error in JavaScript/TypeScript |

### 8.4 Validation Libraries

| Library | URL | Description |
|---------|-----|-------------|
| Zod | https://zod.dev/ | TypeScript Schema Validation |
| Ajv | https://ajv.js.org/ | JSON Schema Validator |
| Joi | https://joi.dev/ | Object Schema Validation |

---

## 9. Implementation Recommendations

### 9.1 Error Code Constants

**Create centralized error code constants:**

```typescript
// File: src/types/error-codes.ts

export const AGENT_ERROR_CODES = {
  // Response Format
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  RESPONSE_PARSE_FAILED: 'RESPONSE_PARSE_FAILED',
  RESPONSE_VALIDATION_FAILED: 'RESPONSE_VALIDATION_FAILED',

  // Execution
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  EXECUTION_TIMEOUT: 'EXECUTION_TIMEOUT',
  EXECUTION_CANCELLED: 'EXECUTION_CANCELLED',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_TYPE: 'VALIDATION_INVALID_TYPE',
  VALIDATION_INVALID_VALUE: 'VALIDATION_INVALID_VALUE',

  // Authentication
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHENTICATION_MISSING: 'AUTHENTICATION_MISSING',
  AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_RETRY_AFTER: 'RATE_LIMIT_RETRY_AFTER',

  // API
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  API_RESPONSE_INVALID: 'API_RESPONSE_INVALID',
  API_TIMEOUT: 'API_TIMEOUT',

  // Tools
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_INVALID_ARGUMENTS: 'TOOL_INVALID_ARGUMENTS',

  // Internal
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INTERNAL_SERVICE_UNAVAILABLE: 'INTERNAL_SERVICE_UNAVAILABLE',
  INTERNAL_DATABASE_ERROR: 'INTERNAL_DATABASE_ERROR',
} as const;

export type AgentErrorCode = typeof AGENT_ERROR_CODES[keyof typeof AGENT_ERROR_CODES];
```

### 9.2 Error Factory Functions

**Create helper functions for consistent error creation:**

```typescript
// File: src/utils/error-factory.ts

import { AGENT_ERROR_CODES } from '../types/error-codes.js';

export interface AgentErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export function createInvalidResponseFormatError(
  message: string,
  details: Record<string, unknown>,
  recoverable: boolean = false
): AgentErrorDetails {
  return {
    code: AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
    message,
    details,
    recoverable
  };
}

export function createValidationError(
  field: string,
  message: string,
  details: Record<string, unknown>
): AgentErrorDetails {
  return {
    code: AGENT_ERROR_CODES.VALIDATION_FAILED,
    message: `Validation failed for field '${field}': ${message}`,
    details: {
      field,
      ...details
    },
    recoverable: true
  };
}

export function createExecutionError(
  message: string,
  details: Record<string, unknown>,
  recoverable: boolean = true
): AgentErrorDetails {
  return {
    code: AGENT_ERROR_CODES.EXECUTION_FAILED,
    message,
    details,
    recoverable
  };
}
```

### 9.3 Validation Helper Functions

**Create validation utilities for AgentResponse:**

```typescript
// File: src/utils/response-validator.ts

import { AGENT_ERROR_CODES } from '../types/error-codes.js';

export interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export function validateAgentResponse(
  response: unknown
): ValidationResult {
  // Check if response is an object
  if (typeof response !== 'object' || response === null) {
    return {
      valid: false,
      error: {
        code: AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        message: 'Response is not an object',
        details: {
          received: typeof response,
          expected: 'object'
        }
      }
    };
  }

  const resp = response as Record<string, unknown>;

  // Check required fields
  const requiredFields = ['status', 'error', 'metadata'];
  const missingFields = requiredFields.filter(field => !(field in resp));

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: {
        code: AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: {
          missingFields,
          providedFields: Object.keys(resp)
        }
      }
    };
  }

  // Validate status field
  if (typeof resp.status !== 'string' ||
      !['success', 'error', 'partial'].includes(resp.status)) {
    return {
      valid: false,
      error: {
        code: AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        message: 'Invalid status field',
        details: {
          field: 'status',
          expected: "one of: 'success', 'error', 'partial'",
          received: typeof resp.status,
          value: resp.status
        }
      }
    };
  }

  // Check for undefined values (non-JSON compliant)
  const hasUndefined = Object.values(resp).some(v => v === undefined);
  if (hasUndefined) {
    return {
      valid: false,
      error: {
        code: AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT,
        message: 'Response contains undefined values (not valid JSON)',
        details: {
          invalidFields: Object.keys(resp).filter(k => resp[k] === undefined)
        }
      }
    };
  }

  return { valid: true };
}
```

---

## 10. Summary and Next Steps

### 10.1 Key Findings

1. **Current State:**
   - WorkflowError uses free-form messages (no error codes)
   - No machine-readable error codes in existing implementation
   - Rich error context (state snapshots, logs) already captured

2. **PRD Requirements:**
   - AgentErrorDetails requires structured error codes
   - INVALID_RESPONSE_FORMAT specified for validation failures
   - Recoverable flag required for retry logic

3. **Industry Standards:**
   - SCREAMING_SNAKE_CASE is standard convention
   - Hierarchical error code categories recommended
   - Rich details object for context is best practice

4. **INVALID_RESPONSE_FORMAT:**
   - Used for JSON parsing failures
   - Used for schema validation failures
   - Used for missing required fields
   - Recoverable flag depends on specific scenario

### 10.2 Recommended Implementation

1. **Create error code constants** in `src/types/error-codes.ts`
2. **Create error factory functions** in `src/utils/error-factory.ts`
3. **Create validation utilities** in `src/utils/response-validator.ts`
4. **Update AgentResponse** to use structured error codes
5. **Add error code documentation** to API docs

### 10.3 Tasks Requiring This Research

This research directly supports:
- **P1.M1.T1.S2** - Creating error code constants and factory functions
- **P1.M1.T1.S3** - Updating Agent.prompt() to return AgentResponse with proper error codes
- **P1.M1.T2.S3** - Updating call sites to handle structured errors
- **P1.M2.T1** - Creating Zod schema validation for AgentResponse

### 10.4 Critical Considerations

1. **Backward Compatibility:** Existing WorkflowError interface doesn't include error codes
2. **Error Code Migration:** Current free-form messages need mapping to error codes
3. **Recoverable Logic:** Need clear guidelines for when to set recoverable flag
4. **Details Object:** Must sanitize sensitive data in error details
5. **Testing:** Need comprehensive test coverage for error code scenarios

---

## Appendix A: Quick Reference

### Error Code Quick Reference

```typescript
// Usage examples
const error1: AgentErrorDetails = {
  code: 'INVALID_RESPONSE_FORMAT',
  message: 'Response is not valid JSON',
  details: { parseError: 'Unexpected token' },
  recoverable: false
};

const error2: AgentErrorDetails = {
  code: 'VALIDATION_FAILED',
  message: 'Email field is invalid',
  details: { field: 'email', value: 'not-an-email' },
  recoverable: true
};

const error3: AgentErrorDetails = {
  code: 'EXECUTION_FAILED',
  message: 'Failed to compile TypeScript',
  details: {
    failedFiles: ['src/index.ts'],
    compilerErrors: ['TS2307: Cannot find module']
  },
  recoverable: true
};
```

### Recoverable Flag Quick Reference

```typescript
// Recoverable errors (can retry)
recoverable: true  // Validation failures, transient issues, rate limits

// Non-recoverable errors (fail fast)
recoverable: false // JSON parse errors, auth failures, missing fields
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Next Review:** After implementation of P1.M1.T1.S2

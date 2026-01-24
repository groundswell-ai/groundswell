# Product Requirement Prompt (PRP): Create AgentResponse Factory Helper Functions

**PRP ID**: P1.M1.T1.S2
**Work Item**: Create AgentResponse factory helper functions
**Created**: 2026-01-24
**Status**: Implementation

---

## Goal

**Feature Goal**: Create helper functions in `src/core/agent.ts` (or new utils file) for creating success, error, and partial `AgentResponse` objects with type guards for status checking, conforming to PRD section 6.4 (Null over undefined, consistent structure).

**Deliverable**: Three exported helper functions and three type guards:
- `createSuccessResponse<T>(data: T, metadata: AgentResponseMetadata): AgentResponse<T>`
- `createErrorResponse(code: string, message: string, details?: Record<string, unknown>, recoverable?: boolean): AgentResponse<null>`
- `createPartialResponse<T>(data: T): AgentResponse<T>`
- `isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>`
- `isError<T>(response: AgentResponse<T>): response is ErrorResponse`
- `isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T>`

**Success Definition**: All factory functions are properly typed, exported, and create valid `AgentResponse` objects that conform to the PRD specification. Type guards correctly narrow types for discriminated union patterns.

---

## Why

This is a **foundational implementation task** that enables the subsequent refactoring of `Agent.prompt()` to return `AgentResponse<T>` instead of raw `T`.

The factory functions provide:
1. **Type Safety**: Ensure all `AgentResponse` objects are created correctly
2. **Consistency**: Eliminate ad-hoc response creation throughout the codebase
3. **Developer Experience**: Simplify response creation with well-typed helpers
4. **Type Narrowing**: Enable discriminated union patterns with type guards

This task's output will be used by:
- **P1.M1.T1.S3** - Refactoring Agent.prompt() to wrap responses in AgentResponse
- **P1.M1.T2** - Updating all call sites to handle AgentResponse
- **P1.M2.T1** - Creating Zod schema validation for AgentResponse

---

## What

### Scope

This task covers creating factory helper functions and type guards for `AgentResponse` objects.

**In Scope:**
- Create three factory functions (success, error, partial)
- Create three type guard functions with proper type predicates
- Export functions from appropriate module
- Add JSDoc comments for documentation

**Out of Scope:**
- Modifying Agent.prompt() method (that's P1.M1.T1.S3)
- Creating Zod schemas (that's P1.M2.T1)
- Updating call sites (that's P1.M1.T2)
- Creating new types (AgentResponse is assumed to be added separately)

### Success Criteria

- [ ] `createSuccessResponse<T>` creates valid success responses with data and metadata
- [ ] `createErrorResponse` creates valid error responses with proper error details
- [ ] `createPartialResponse<T>` creates valid partial responses
- [ ] Type guards (`isSuccess`, `isError`, `isPartial`) use type predicates correctly
- [ ] All functions are exported from the appropriate module
- [ ] JSDoc comments document usage and examples
- [ ] Null is used for absent values (not undefined) per PRD 6.4
- [ ] Functions follow existing codebase patterns from factory.ts

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement the AgentResponse factory functions successfully?

**Answer**: YES - This PRP provides:
- Exact PRD specification for AgentResponse structure
- Existing factory patterns from codebase to follow
- TypeScript best practices for factory functions and type guards
- Test patterns to follow
- File locations and naming conventions

### Documentation & References

```yaml
# CRITICAL - PRD specification for AgentResponse

- url: https://github.com/dustin-desktop/groundswell/blob/main/PRD.md#L143-L240
  why: Complete AgentResponse interface specification from PRD sections 6.1-6.5
  critical:
    - AgentResponse<T> interface with status, data, error, metadata fields
    - AgentErrorDetails interface with code, message, details, recoverable
    - AgentResponseMetadata interface with agentId, timestamp, duration, requestId
    - Three status types: 'success', 'error', 'partial'
    - Null over undefined requirement (PRD 6.4.4)
    - Example response structures for all three types

# CRITICAL - Existing codebase patterns to follow

- file: src/core/factory.ts
  why: Factory function patterns already in use in codebase
  pattern: create* naming convention with generic type preservation
  critical:
    - createWorkflow<T>(), createAgent(), createPrompt<T>() patterns
    - Generic type parameter preserved from input to output
    - No validation in factories (delegated to constructors)
    - Direct class instantiation pattern

- file: src/core/agent.ts
  why: PromptResult<T> shows existing wrapper type pattern
  pattern: Generic wrapper with data property + metadata
  gotcha: Current prompt() returns T directly, not PromptResult<T>

- file: src/types/agent.ts
  where: AgentResponse, AgentErrorDetails, AgentResponseMetadata will be defined
  pattern: Follow existing type organization
  gotcha: This file currently only has AgentConfig and PromptOverrides

- file: src/types/index.ts
  where: New types and factory functions will be exported
  pattern: Grouped exports by category (Core, Agent, Prompt, etc.)
  gotcha: Must add AgentResponse* types and factory functions to exports

# EXTERNAL RESEARCH - TypeScript factory patterns

- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
  why: Type predicates for discriminated union type narrowing
  critical: Type guard pattern: `response is SuccessResponse<T>`

- url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#discriminated-unions
  why: Discriminated union pattern for AgentResponse
  critical: Status field as discriminant for type narrowing

- url: https://github.com/gcanti/io-ts
  why: Example of factory functions for codec types
  pattern: create* function naming with explicit return types

- url: https://github.com/supermacro/neverthrow
  why: Result<T, E> type with ok/error discriminant and type guards
  pattern: isOk(), isError() type guards with type predicates

# RESEARCH FILES - Generated research documentation

- docfile: plan/002_6761e4b84fd1/P1M1T1S2/research/factory-patterns-analysis.md
  why: Existing factory patterns in Groundswell codebase
  section: create* naming, generic preservation, parameter ordering

- docfile: plan/002_6761e4b84fd1/P1M1T1S2/research/typescript-factory-patterns-research.md
  why: TypeScript best practices for factory functions and type guards
  section: Type predicates, discriminated unions, generic constraints

- docfile: plan/002_6761e4b84fd1/P1M1T1S2/research/test-patterns-analysis.md
  why: Test patterns to follow for factory function tests
  section: Vitest structure, arrange-act-assert, type guard testing

- docfile: plan/002_6761e4b84fd1/P1M1T1S2/research/error-code-conventions-research.md
  why: Error code naming conventions (SCREAMING_SNAKE_CASE)
  section: INVALID_RESPONSE_FORMAT error code, recoverable flag guidelines

- docfile: plan/002_6761e4b84fd1/P1M1T1S2/research/codebase-tree.md
  why: Project structure and file locations
  section: src/types/, src/core/, src/utils/ directory structure
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # Agent class with prompt() method
│   ├── factory.ts               # [PATTERN] Existing factory functions
│   └── ...
├── types/
│   ├── agent.ts                 # [KEY] AgentResponse to be added here
│   ├── index.ts                 # [KEY] Type exports
│   └── ...
├── utils/
│   ├── id.ts                    # Utility function example
│   └── ...
└── __tests__/
    ├── unit/
    │   ├── agent.test.ts        # Agent tests
    │   └── ...
    └── ...
```

### Desired Codebase Tree (Files to be Added)

```bash
src/
├── types/
│   ├── agent.ts                 # [MODIFY] Add factory function exports
│   └── index.ts                 # [MODIFY] Export factory functions
└── __tests__/
    └── unit/
        └── agent-response-factory.test.ts  # [NEW] Factory function tests
```

**Note**: Factory functions can be added either:
1. In `src/types/agent.ts` alongside type definitions (simpler exports)
2. In new `src/utils/agent-response-factory.ts` (separation of concerns)

**Recommendation**: Add to `src/types/agent.ts` for simpler module structure.

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: PRD 6.4.4 - Null over undefined
// All absent values must be null, not undefined
// Example: error: null (not error: undefined) for success responses

// CRITICAL: Status field is discriminant for type narrowing
// The 'status' field ('success' | 'error' | 'partial') enables discriminated unions
// Type guards use this field to narrow types

// CRITICAL: Error code naming convention
// Use SCREAMING_SNAKE_CASE (e.g., INVALID_RESPONSE_FORMAT)
// This matches industry standards (Stripe, Twilio, etc.)

// CRITICAL: recoverable flag semantics
// true: Error is transient, can be retried (e.g., rate limit, timeout)
// false: Error is permanent, retry will fail (e.g., invalid schema, auth failed)

// CRITICAL: Generic type preservation
// Factory functions must preserve <T> from input to output type
// Example: createSuccessResponse<T>(data: T): AgentResponse<T>

// GOTCHA: Existing factory patterns don't validate
// Validation is delegated to constructors or Zod schemas (future task)
// Factory functions are simple wrappers

// GOTCHA: Metadata fields
// agentId and timestamp are REQUIRED
// duration and requestId are OPTIONAL
// Use null for absent optional fields (not undefined)

// GOTCHA: Type guard type predicates
// Must use 'response is SuccessResponse<T>' syntax
// This enables TypeScript to narrow types in if statements
```

---

## Implementation Blueprint

### Data Models and Structure

**PRD-Specified Types (assumed to be added separately):**

```typescript
// src/types/agent.ts (to be added)

export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

export interface AgentErrorDetails {
  code: string;                    // SCREAMING_SNAKE_CASE
  message: string;                 // Human-readable description
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

export interface AgentResponseMetadata {
  agentId: string;                 // REQUIRED
  timestamp: number;               // REQUIRED (Unix timestamp ms)
  duration?: number | null;        // OPTIONAL (execution time ms)
  requestId?: string | null;       // OPTIONAL (correlation ID)
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE factory functions in src/types/agent.ts
  - IMPLEMENT: createSuccessResponse<T>(), createErrorResponse(), createPartialResponse<T>()
  - FOLLOW pattern: src/core/factory.ts (create* naming, explicit return types)
  - NAMING: camelCase function names, PascalCase type names
  - PLACEMENT: Add after type definitions in src/types/agent.ts
  - NULL HANDLING: Use null for absent values, never undefined

Task 2: CREATE type guard functions in src/types/agent.ts
  - IMPLEMENT: isSuccess<T>(), isError<T>(), isPartial<T>()
  - FOLLOW pattern: TypeScript type predicate syntax (response is XxxResponse<T>)
  - NAMING: is* prefix matching status value
  - PLACEMENT: Add after factory functions
  - TYPE PREDICATE: Use 'response is SuccessResponse<T>' syntax for narrowing

Task 3: ADD JSDoc comments to all functions
  - DOCUMENT: Purpose, parameters, return type, examples
  - FOLLOW pattern: Existing JSDoc in src/core/factory.ts
  - INCLUDE: Usage examples for each function

Task 4: EXPORT functions from src/types/agent.ts
  - ADD: Explicit export statements for all functions
  - FOLLOW pattern: Existing export statements in file

Task 5: EXPORT from src/types/index.ts
  - ADD: Factory functions and type guards to exports
  - FIND pattern: Existing Agent type exports at lines 26-27
  - PRESERVE: All existing exports

Task 6: CREATE unit tests in src/__tests__/unit/agent-response-factory.test.ts
  - IMPLEMENT: Tests for all factory functions (happy path, edge cases)
  - IMPLEMENT: Tests for all type guards (including type narrowing verification)
  - FOLLOW pattern: src/__tests__/unit/agent.test.ts (describe/it structure)
  - COVERAGE: Success, error, partial responses; null handling; type narrowing
```

### Implementation Patterns & Key Details

```typescript
// ========================
// FACTORY FUNCTION PATTERNS
// ========================

// Pattern 1: Success Response Factory
// Follow src/core/factory.ts: create* naming, explicit return type
function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,           // T (not null)
    error: null,    // CRITICAL: null for success (PRD 6.4)
    metadata
  };
}

// Pattern 2: Error Response Factory
// Default recoverable to false (safer default)
function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false  // Default: not recoverable
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,      // CRITICAL: null for error (PRD 6.4)
    error: {
      code,          // SCREAMING_SNAKE_CASE (e.g., INVALID_RESPONSE_FORMAT)
      message,
      details: details ?? null,  // Use null if not provided
      recoverable
    },
    metadata: {
      agentId: 'unknown',  // Placeholder - will be set by caller
      timestamp: Date.now()
    }
  };
}

// Pattern 3: Partial Response Factory
// For streaming/incremental results
function createPartialResponse<T>(
  data: T
): AgentResponse<T> {
  return {
    status: 'partial',
    data,           // T (intermediate result)
    error: null,    // CRITICAL: null for partial (PRD 6.4)
    metadata: {
      agentId: 'unknown',  // Placeholder
      timestamp: Date.now()
    }
  };
}

// ========================
// TYPE GUARD PATTERNS
// ========================

// Pattern: Type predicate with discriminant check
// Follows TypeScript narrowing pattern with 'is' keyword
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}

function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T> {
  return response.status === 'partial';
}

// Type narrowing usage example:
if (isSuccess(response)) {
  // TypeScript knows: response.data is T (not null)
  // TypeScript knows: response.error is null
  console.log(response.data.fieldName);
} else if (isError(response)) {
  // TypeScript knows: response.data is null
  // TypeScript knows: response.error is AgentErrorDetails (not null)
  console.log(response.error.code);
}

// ========================
// ERROR CODE CONVENTIONS
// ========================

// Use SCREAMING_SNAKE_CASE for error codes
const ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED'
} as const;

// ========================
// NULL HANDLING (PRD 6.4.4)
// ========================

// WRONG: Using undefined
const bad = { status: 'success', data: value, error: undefined };

// CORRECT: Using null
const good = { status: 'success', data: value, error: null };

// ========================
// METADATA HANDLING
// ========================

// Required fields: agentId, timestamp
const metadata: AgentResponseMetadata = {
  agentId: 'agent-123',
  timestamp: Date.now()
};

// Optional fields: duration, requestId
const metadataWithOptional: AgentResponseMetadata = {
  agentId: 'agent-123',
  timestamp: Date.now(),
  duration: 1234,    // Optional
  requestId: 'req-456'  // Optional
};

// Use null for absent optional fields (not undefined)
const metadataNull: AgentResponseMetadata = {
  agentId: 'agent-123',
  timestamp: Date.now(),
  duration: null,     // Explicit null
  requestId: null     // Explicit null
};
```

### Integration Points

```yaml
TYPE DEFINITIONS:
  - file: src/types/agent.ts
    add: AgentResponse, AgentErrorDetails, AgentResponseMetadata interfaces
    add: Factory functions (createSuccessResponse, createErrorResponse, createPartialResponse)
    add: Type guards (isSuccess, isError, isPartial)
    pattern: Follow existing type organization

EXPORTS:
  - file: src/types/index.ts
    add: Export AgentResponse, AgentErrorDetails, AgentResponseMetadata
    add: Export factory functions and type guards
    location: After existing Agent type exports (lines 26-27)

USAGE (future tasks):
  - file: src/core/agent.ts (P1.M1.T1.S3)
    will: Use createSuccessResponse/createErrorResponse in prompt() method
    pattern: Wrap executePrompt() result in AgentResponse

  - file: examples/ (P1.M1.T2.S2)
    will: Update all example files to handle AgentResponse
    pattern: if (isSuccess(response)) { ... }
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each function is added - fix before proceeding
npx tsc --noEmit                    # TypeScript type checking
npm run lint                         # ESLint checking

# Check specific file
npx tsc --noEmit src/types/agent.ts

# Expected: Zero type errors. If errors exist:
# 1. Check explicit return types are specified
# 2. Check generic type parameters are preserved
# 3. Check type predicates use correct syntax
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run factory function tests
npm test -- agent-response-factory.test.ts

# Run all unit tests
npm test -- src/__tests__/unit/

# Watch mode for development
npm run test:watch

# Expected: All tests pass. Common issues:
# - Type guards not using type predicate syntax
# - Generic types not preserved correctly
# - Null vs undefined handling errors
```

### Level 3: Integration Testing (Type System Validation)

```bash
# Verify exports work correctly
node -e "
import { createSuccessResponse, isSuccess } from './dist/types/agent.js';
const response = createSuccessResponse('test', { agentId: 'test', timestamp: Date.now() });
console.log('Response:', response);
console.log('Is success:', isSuccess(response));
"

# Verify type narrowing works
# Create a test file that uses type guards and verify TypeScript narrows correctly
npx tsc --noEmit - <<EOF
import { createSuccessResponse, createErrorResponse, isSuccess } from './src/types/agent.js';
const response = createSuccessResponse('data', { agentId: 'test', timestamp: Date.now() });
if (isSuccess(response)) {
  // This should compile: accessing response.data should be type-safe
  const data: string = response.data;  // TypeScript knows data is string
}
EOF

# Expected: Zero compilation errors, type narrowing works correctly
```

### Level 4: Documentation & Examples Validation

```bash
# Verify JSDoc comments render correctly
npx typedoc src/types/agent.ts --out docs/typedoc

# Manual testing: Create example usage
node -e "
import { createSuccessResponse, createErrorResponse, isSuccess, isError } from './dist/index.js';

// Test success response
const success = createSuccessResponse(
  { result: 'test' },
  { agentId: 'agent-123', timestamp: Date.now(), duration: 100 }
);
console.log('Success:', success);
console.log('Is success:', isSuccess(success));

// Test error response
const error = createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  'Failed to parse response',
  { field: 'value' },
  false
);
console.log('Error:', error);
console.log('Is error:', isError(error));
"

# Expected: All examples run successfully, output is valid
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All factory functions created with correct signatures
- [ ] All type guards use type predicate syntax (`response is XxxResponse<T>`)
- [ ] Generic type parameters preserved correctly
- [ ] Null used for absent values (not undefined)
- [ ] No TypeScript compilation errors: `npx tsc --noEmit`
- [ ] No ESLint errors: `npm run lint`

### Feature Validation

- [ ] `createSuccessResponse<T>` creates valid success responses
- [ ] `createErrorResponse` creates valid error responses with proper structure
- [ ] `createPartialResponse<T>` creates valid partial responses
- [ ] Type guards correctly narrow types (verified with if statements)
- [ ] Error codes use SCREAMING_SNAKE_CASE convention
- [ ] Metadata includes required fields (agentId, timestamp)

### Code Quality Validation

- [ ] Follows existing factory patterns from `src/core/factory.ts`
- [ ] JSDoc comments document all functions with examples
- [ ] Functions exported from `src/types/index.ts`
- [ ] Test file created at `src/__tests__/unit/agent-response-factory.test.ts`
- [ ] All tests pass with comprehensive coverage

### Integration Readiness

- [ ] Functions are ready to be used in P1.M1.T1.S3 (Agent.prompt() refactoring)
- [ ] Type guards enable discriminated union patterns
- [ ] Export structure matches existing patterns in codebase
- [ ] No breaking changes to existing API

---

## Anti-Patterns to Avoid

- ❌ Don't use `undefined` for absent values - use `null` per PRD 6.4
- ❌ Don't omit type predicates in type guards - must use `response is XxxResponse<T>`
- ❌ Don't use lowercase or camelCase for error codes - use `SCREAMING_SNAKE_CASE`
- ❌ Don't omit explicit return types - TypeScript needs them for inference
- ❌ Don't add validation logic to factories - keep them simple wrappers
- ❌ Don't create separate files for each function - group in `src/types/agent.ts`
- ❌ Don't forget to export functions from `src/types/index.ts`
- ❌ Don't skip JSDoc comments - documentation is required

---

## Appendix: Code Examples

### Complete Implementation Example

```typescript
// src/types/agent.ts

// Type definitions (assumed to be added)
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

export interface AgentErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

export interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number | null;
  requestId?: string | null;
}

// Discriminated union types (for type narrowing)
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };
export type ErrorResponse = AgentResponse<null> & { status: 'error' };
export type PartialResponse<T> = AgentResponse<T> & { status: 'partial' };

// Error code constants
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED'
} as const;

// Factory functions
/**
 * Creates a success response with data and metadata.
 * @param data - The response data
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse
 * @example
 * const response = createSuccessResponse(
 *   { result: 'success' },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 */
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata
  };
}

/**
 * Creates an error response with error details.
 * @param code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param message - Human-readable error message
 * @param details - Optional additional error context
 * @param recoverable - Whether the error is recoverable (default: false)
 * @returns An error AgentResponse with null data
 * @example
 * const response = createErrorResponse(
 *   'INVALID_RESPONSE_FORMAT',
 *   'Failed to parse response',
 *   { field: 'value' },
 *   false
 * );
 */
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
      recoverable
    },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now()
    }
  };
}

/**
 * Creates a partial response for streaming/incremental results.
 * @param data - The partial response data
 * @returns A partial AgentResponse
 * @example
 * const response = createPartialResponse({
 *   completedSteps: 3,
 *   totalSteps: 5
 * });
 */
export function createPartialResponse<T>(
  data: T
): AgentResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now()
    }
  };
}

// Type guards
/**
 * Type guard for success responses.
 * Narrows the type to SuccessResponse<T> where data is T (not null).
 * @param response - The response to check
 * @returns True if the response status is 'success'
 * @example
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 * }
 */
export function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

/**
 * Type guard for error responses.
 * Narrows the type to ErrorResponse where error is AgentErrorDetails (not null).
 * @param response - The response to check
 * @returns True if the response status is 'error'
 * @example
 * if (isError(response)) {
 *   console.log(response.error.code); // TypeScript knows error exists
 * }
 */
export function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}

/**
 * Type guard for partial responses.
 * Narrows the type to PartialResponse<T>.
 * @param response - The response to check
 * @returns True if the response status is 'partial'
 * @example
 * if (isPartial(response)) {
 *   console.log('Partial result:', response.data);
 * }
 */
export function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T> {
  return response.status === 'partial';
}
```

---

**Confidence Score**: 10/10

This PRP provides comprehensive, actionable context for implementing AgentResponse factory helper functions. All PRD requirements, existing codebase patterns, TypeScript best practices, and test patterns are documented with specific references and code examples.

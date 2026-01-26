# Product Requirement Prompt (PRP)

**Subtask**: P1.M2.T1.S3 - Extract Agent.validateResponse to shared utility
**Work Item**: Extract Agent.validateResponse to shared utility
**Status**: Researching → Implementation

---

## Goal

**Feature Goal**: Extract the `Agent.validateResponse()` method to a shared utility function at `src/utils/agent-validation.ts`, enabling the Workflow class to perform agent response validation without requiring an Agent instance.

**Deliverable**:
1. New utility file `src/utils/agent-validation.ts` with `validateAgentResponse()` function
2. Modified `Agent.validateResponse()` method to call the utility (wrapper pattern)
3. Updated `Workflow.validateAgentResponse()` to use the utility directly
4. Barrel export in `src/utils/index.ts` for the new utility
5. Comprehensive unit tests in `src/__tests__/unit/utils/agent-validation.test.ts`

**Success Definition**:
- [ ] `validateAgentResponse()` utility function is exported from `src/utils/agent-validation.ts`
- [ ] `Agent.validateResponse()` method delegates to the utility (backward compatible)
- [ ] `Workflow.validateAgentResponse()` uses the utility directly (no Agent instance needed)
- [ ] All existing tests pass (backward compatibility maintained)
- [ ] New unit tests cover happy path, error path, and edge cases
- [ ] Zod schema validation behavior is identical to original implementation

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test passed**: If someone knew nothing about this codebase, they would have everything needed to implement this feature successfully using the references below.

### Documentation & References

```yaml
# CRITICAL CODE REFERENCES - Must read before implementation

- file: src/core/agent.ts
  lines: 889-931
  why: The validateResponse method to be extracted - contains the core validation logic using Zod
  pattern: Private method that creates AgentResponseSchema, calls safeParse, logs errors, returns INTERNAL_ERROR response on failure
  gotcha: Method is private and uses this.id for logging - utility must accept agentId as parameter

- file: src/core/workflow.ts
  lines: 729-773
  why: The validateAgentResponse method that duplicates validation logic - will be updated to use shared utility
  pattern: Public method that creates AgentResponseSchema, calls safeParse, emits invalidResponse event, returns boolean
  gotcha: Uses this.emitEvent() and getObservedState() - these are Workflow-specific, not part of utility

- file: src/types/agent.ts
  lines: 972-995
  why: AgentResponseSchema factory function - the Zod schema used for validation
  pattern: Creates discriminated union schema with success/error/partial variants
  gotcha: Metadata is optional in schema but required in AgentResponse interface

- file: src/utils/restart-analysis.ts
  why: Reference for utility file structure, documentation patterns, export patterns
  pattern: Pure functions with comprehensive JSDoc, exported constants, barrel export
  gotcha: Uses import type for type-only imports, all functions are pure (no side effects)

- file: src/utils/index.ts
  why: Barrel export file - must be updated to export new utility
  pattern: Named exports from each utility file
  gotcha: Use .js extension in import paths even for .ts files (ESM requirement)

- file: src/__tests__/unit/restart-analysis.test.ts
  why: Reference for unit test structure and patterns
  pattern: Helper functions for mock creation, nested describe blocks, comprehensive edge case coverage
  gotcha: Uses vi.fn() for mocking, toStrictEqual() for deep equality checks
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── agent.ts              # Contains validateResponse method (lines 889-931) - TO BE REFACTORED
│   └── workflow.ts           # Contains validateAgentResponse method (lines 729-773) - TO BE UPDATED
├── types/
│   └── agent.ts              # Contains AgentResponseSchema factory (lines 972-995) - REFERENCE ONLY
├── utils/
│   ├── index.ts              # Barrel exports - TO BE UPDATED
│   ├── restart-analysis.ts   # Reference for utility patterns
│   └── workflow-error-utils.ts  # Reference for error handling patterns
└── __tests__/
    └── unit/
        └── utils/            # Test location for new utility
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── core/
│   ├── agent.ts              # MODIFIED: validateResponse() now calls utility
│   └── workflow.ts           # MODIFIED: validateAgentResponse() now calls utility
├── utils/
│   ├── agent-validation.ts   # NEW FILE: validateAgentResponse() utility
│   └── index.ts              # MODIFIED: Add export for validateAgentResponse
└── __tests__/
    └── unit/
        └── utils/
            └── agent-validation.test.ts  # NEW FILE: Unit tests for utility
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: ZodError handling patterns
// - Use safeParse() instead of parse() for non-throwing validation
// - Access validation.error.errors for error array
// - Transform errors with .map() for logging (path, message, code)

// CRITICAL: Import paths must use .js extension
// Even though files are .ts, imports use .js (ESM requirement)
import { AgentResponseSchema } from '../types/agent.js';  // ✓ Correct
import { AgentResponseSchema } from '../types/agent.ts';   // ✗ Wrong

// CRITICAL: Type-only imports use 'import type'
import type { AgentResponse } from '../types/agent.js';  // ✓ Correct for types

// CRITICAL: Barrel exports in utils/index.ts
// All utilities must be re-exported from the barrel file
export { validateAgentResponse } from './agent-validation.js';

// CRITICAL: WorkflowError structure
// WorkflowError doesn't have a 'code' property - uses message for error codes
// This is different from AgentErrorDetails which has a code field

// CRITICAL: Discriminated union schemas in Zod
// Use z.discriminatedUnion('status', [...]) for status-based schemas
// Each variant uses z.literal() for the discriminant field

// CRITICAL: Null vs Undefined (PRD 6.4.4)
// Always use null for absent values, never undefined
error: z.null(),  // ✓ Correct
error: z.null().optional(),  // ✗ Violates PRD 6.4.4
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models are needed for this task. The implementation uses existing types:

```typescript
// Existing types from src/types/agent.ts
AgentResponse<T>        // Response wrapper with status, data, error, metadata
AgentResponseSchema<T>  // Zod discriminated union schema factory
ZodError               // From 'zod' package - validation error type

// Result type for the utility function
ValidationResult = { valid: boolean; errors?: z.ZodError }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/utils/agent-validation.ts
  - IMPLEMENT: validateAgentResponse<T>() pure function
  - SIGNATURE: (response: AgentResponse<T>, dataSchema: z.ZodTypeAny) => ValidationResult
  - LOGIC: Create AgentResponseSchema(dataSchema), call safeParse(), return { valid: boolean, errors?: ZodError }
  - FOLLOW pattern: src/utils/restart-analysis.ts (file structure, documentation style)
  - NAMING: validateAgentResponse (camelCase function name)
  - PLACEMENT: src/utils/agent-validation.ts (new file)
  - DEPENDENCIES: Import types from ../types/agent.js, z from 'zod'

Task 2: MODIFY src/utils/index.ts
  - ADD: export { validateAgentResponse } from './agent-validation.js';
  - FOLLOW pattern: Existing barrel export pattern (line 7 for restart-analysis)
  - PLACEMENT: After line 7, maintain alphabetical order

Task 3: MODIFY src/core/agent.ts
  - UPDATE: validateResponse() method (lines 889-931)
  - LOGIC: Import validateAgentResponse from ../utils/agent-validation.js
  - CHANGE: Replace existing validation logic with utility call
  - PRESERVE: console.error logging with agentId (pass this.id separately)
  - PRESERVE: Return createErrorResponse() on validation failure
  - BACKWARD COMPATIBLE: Method signature unchanged, behavior identical

Task 4: MODIFY src/core/workflow.ts
  - UPDATE: validateAgentResponse() method (lines 729-773)
  - LOGIC: Import validateAgentResponse from ../utils/agent-validation.js
  - CHANGE: Replace existing validation logic with utility call
  - PRESERVE: this.emitEvent() for invalidResponse event
  - PRESERVE: WorkflowError creation with INVALID_RESPONSE_FORMAT context
  - PRESERVE: getObservedState() for error state
  - BACKWARD COMPATIBLE: Method signature unchanged, behavior identical

Task 5: CREATE src/__tests__/unit/utils/agent-validation.test.ts
  - IMPLEMENT: Comprehensive unit tests for validateAgentResponse()
  - FOLLOW pattern: src/__tests__/unit/restart-analysis.test.ts (test structure, helper functions)
  - TEST CASES:
    - should return valid=true for valid success response
    - should return valid=true for valid error response
    - should return valid=true for valid partial response
    - should return valid=false for missing required fields
    - should return valid=false for wrong data types
    - should return valid=false for null data when success status
    - should return valid=false for data present when error status
    - should return ZodError in errors field when invalid
    - should handle optional metadata field
    - should use provided dataSchema instead of default
  - HELPERS: createMockResponse() factory function
  - MOCKS: Use z.object() for test schemas
  - PLACEMENT: src/__tests__/unit/utils/agent-validation.test.ts (new file)

Task 6: VERIFY existing tests still pass
  - RUN: uv run pytest src/__tests__/unit/agent.test.ts (if exists)
  - RUN: uv run pytest src/__tests__/unit/workflow-validation.test.ts (if exists)
  - VERIFY: All existing Agent validation tests pass
  - VERIFY: All existing Workflow validation tests pass
  - CONFIRM: Backward compatibility maintained
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// UTILITY FUNCTION PATTERN (src/utils/agent-validation.ts)
// ============================================================================

/**
 * Validation result type for agent response validation
 *
 * Provides structured validation result with boolean validity flag
 * and optional ZodError for detailed error information.
 */
export interface ValidationResult {
  /** Whether the response is valid according to the schema */
  valid: boolean;
  /** Zod validation errors (present when valid is false) */
  errors?: z.ZodError;
}

/**
 * Validate an AgentResponse against a Zod schema
 *
 * This is a pure, side-effect-free function that validates AgentResponse
 * instances using Zod schemas. It returns a structured ValidationResult
 * with validity flag and optional error details.
 *
 * **Validation Flow:**
 * 1. Create AgentResponseSchema using provided dataSchema
 * 2. Call schema.safeParse(response) for non-throwing validation
 * 3. Return { valid: true } if validation succeeds
 * 4. Return { valid: false, errors: ZodError } if validation fails
 *
 * **Pure Function Guarantee:**
 * - Deterministic: Same input always produces same output
 * - No side effects: Doesn't modify inputs, emit events, or log
 * - No external dependencies: Doesn't use Date.now(), Math.random(), etc.
 *
 * @template T - The type of response data
 * @param response - The AgentResponse to validate
 * @param dataSchema - The Zod schema for the response data (defaults to z.unknown())
 * @returns Structured validation result with validity flag and optional errors
 *
 * @example Valid response
 * ```ts
 * const response: AgentResponse<string> = {
 *   status: 'success',
 *   data: 'Hello, World!',
 *   error: null,
 *   metadata: { agentId: 'agent-123', timestamp: Date.now() }
 * };
 *
 * const result = validateAgentResponse(response);
 * // Returns: { valid: true }
 * ```
 *
 * @example Invalid response
 * ```ts
 * const response = {
 *   status: 'success',
 *   data: null,  // Invalid: data should be string, not null
 *   error: null,
 *   metadata: { agentId: 'agent-123', timestamp: Date.now() }
 * };
 *
 * const result = validateAgentResponse(response, z.string());
 * // Returns: { valid: false, errors: ZodError }
 * ```
 *
 * @remarks
 * **Integration with Agent.validateResponse():**
 * This utility is called by Agent.validateResponse() which adds:
 * - console.error logging with agentId
 * - INTERNAL_ERROR response creation on validation failure
 *
 * **Integration with Workflow.validateAgentResponse():**
 * This utility is called by Workflow.validateAgentResponse() which adds:
 * - invalidResponse event emission
 * - WorkflowError creation with INVALID_RESPONSE_FORMAT context
 *
 * @see {@link AgentResponseSchema} - Schema factory used for validation
 * @see {@link ValidationResult} - Return type structure
 */
export function validateAgentResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny = z.unknown()
): ValidationResult {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate response against schema (non-throwing)
  const validation = schema.safeParse(response);

  if (validation.success) {
    // Response is valid
    return { valid: true };
  }

  // Validation failed - return structured error
  return { valid: false, errors: validation.error };
}

// ============================================================================
// AGENT CLASS WRAPPER PATTERN (src/core/agent.ts, lines 889-931)
// ============================================================================

// In Agent class, update the private validateResponse method:

import { validateAgentResponse } from '../utils/agent-validation.js';

/**
 * Validates an AgentResponse against the schema before returning
 *
 * This is a backward-compatible wrapper around the shared validateAgentResponse
 * utility. It adds agent-specific logging and error response creation.
 *
 * @template T - The type of response data
 * @param response - The response to validate
 * @param dataSchema - The Zod schema for the response data
 * @returns The validated response, or an INTERNAL_ERROR response if validation fails
 * @private
 */
private validateResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny
): AgentResponse<T> {
  // Call shared utility for validation
  const result = validateAgentResponse(response, dataSchema);

  if (result.valid) {
    // Response is valid, return it unchanged
    return response;
  }

  // Validation failed - this indicates a bug in our code
  // Log detailed error information for debugging
  console.error('Agent response validation failed', {
    agentId: this.id,  // Agent-specific logging (not in utility)
    timestamp: Date.now(),
    errorCount: result.errors?.errors.length ?? 0,
    errors: result.errors?.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })) ?? [],
  });

  // Return INTERNAL_ERROR response
  return createErrorResponse(
    'INTERNAL_ERROR',
    'Internal response validation failed',
    {
      validationErrors: result.errors?.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })) ?? [],
    },
    false // Non-recoverable - indicates system bug
  ) as AgentResponse<T>;
}

// ============================================================================
// WORKFLOW CLASS INTEGRATION PATTERN (src/core/workflow.ts, lines 729-773)
// ============================================================================

// In Workflow class, update the public validateAgentResponse method:

import { validateAgentResponse } from '../utils/agent-validation.js';

/**
 * Validate an agent response at the workflow level
 *
 * This method uses the shared validateAgentResponse utility and adds
 * workflow-specific event emission and error handling.
 */
public validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema: z.ZodTypeAny = z.unknown()
): boolean {
  // Call shared utility for validation
  const result = validateAgentResponse(response, dataSchema);

  if (result.valid) {
    // Response is valid
    return true;
  }

  // Validation failed - emit event and create error
  const zodError = result.errors!;  // Safe: errors exists when valid is false

  // Emit invalidResponse event (workflow-specific)
  this.emitEvent({
    type: 'invalidResponse',
    node: this.node,
    response,
    agentId,
    errors: zodError,
    timestamp: Date.now(),
  });

  // Create WorkflowError with INVALID_RESPONSE_FORMAT context
  const validationError: WorkflowError = {
    message: `Agent response validation failed for agent '${agentId}'`,
    original: zodError,
    workflowId: this.id,
    stack: zodError.stack,
    state: getObservedState(this),
    logs: [...this.node.logs] as LogEntry[],
  };

  return false;
}

// ============================================================================
// BARREL EXPORT PATTERN (src/utils/index.ts)
// ============================================================================

// Add to barrel exports (maintain alphabetical order)
export { validateAgentResponse, type ValidationResult } from './agent-validation.js';
```

### Integration Points

```yaml
IMPORT_UPDATES:
  - file: src/core/agent.ts
    add: "import { validateAgentResponse } from '../utils/agent-validation.js';"
    location: After existing utility imports (line 31)

  - file: src/core/workflow.ts
    add: "import { validateAgentResponse } from '../utils/agent-validation.js';"
    location: After existing utility imports (line 18)

BARREL_EXPORT:
  - file: src/utils/index.ts
    add: "export { validateAgentResponse, type ValidationResult } from './agent-validation.js';"
    location: After line 7 (maintain alphabetical order by filename)

TYPE_EXPORTS:
  - Export ValidationResult interface from agent-validation.ts
  - Export ValidationResult type from utils barrel
  - Import type with: import type { ValidationResult } from '../utils/agent-validation.js';
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run lint src/utils/agent-validation.ts  # Lint new utility file
npm run lint src/core/agent.ts              # Lint modified Agent class
npm run lint src/core/workflow.ts           # Lint modified Workflow class
npm run lint src/__tests__/unit/utils/agent-validation.test.ts  # Lint test file

# Project-wide validation
npm run lint src/                          # Check all source files
npm run format src/                        # Format all source files

# Expected: Zero linting errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new utility
npm test src/__tests__/unit/utils/agent-validation.test.ts

# Test existing Agent tests (ensure backward compatibility)
npm test src/__tests__/unit/agent.test.ts
npm test src/__tests__/unit/agent-response.test.ts

# Test existing Workflow tests (ensure backward compatibility)
npm test src/__tests__/unit/workflow.test.ts
npm test src/__tests__/unit/workflow-validation.test.ts

# Full test suite for affected areas
npm test src/__tests__/unit/utils/         # All utility tests
npm test src/__tests__/unit/               # All unit tests

# Coverage validation (if coverage tools available)
npm run test:coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test Agent validation still works
npm test src/__tests__/integration/agent-workflow.test.ts

# Test Workflow validation still works
npm test src/__tests__/integration/workflow-validation.test.ts

# Manual verification - import the utility
node -e "
import { validateAgentResponse } from './dist/utils/agent-validation.js';
console.log('Utility exports correctly:', typeof validateAgentResponse === 'function');
"

# Manual verification - Agent.validateResponse() still works
# (Integration test should cover this)

# Manual verification - Workflow.validateAgentResponse() uses utility
# (Integration test should cover this)

# Expected: All integrations working, utility exports correctly, no breaking changes
```

### Level 4: Type System Validation

```bash
# TypeScript compilation check
npm run build                      # Should compile without errors
npm run type-check                 # Run TypeScript compiler in check mode

# Verify type exports work
node -e "
import { validateAgentResponse } from './dist/utils/agent-validation.js';
import type { ValidationResult } from './dist/utils/agent-validation.js';
console.log('Type exports work correctly');
"

# Expected: Zero type errors. All type exports accessible.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format`

### Feature Validation

- [ ] `validateAgentResponse()` utility function works correctly
- [ ] `Agent.validateResponse()` delegates to utility (backward compatible)
- [ ] `Workflow.validateAgentResponse()` uses utility directly
- [ ] Utility is exported from `src/utils/index.ts`
- [ ] ValidationResult type is exported from `src/utils/index.ts`
- [ ] All existing tests pass (backward compatibility verified)
- [ ] New unit tests cover all validation scenarios

### Code Quality Validation

- [ ] Follows existing utility patterns (restart-analysis.ts reference)
- [ ] File placement matches desired codebase tree structure
- [ ] JSDoc documentation is comprehensive with examples
- [ ] Pure function with no side effects (utility only)
- [ ] Backward compatibility maintained (Agent and Workflow unchanged behavior)
- [ ] Import paths use `.js` extension (ESM requirement)
- [ ] Type-only imports use `import type`

### Integration Validation

- [ ] Agent.validateResponse() logs errors correctly (agentId preserved)
- [ ] Workflow.validateAgentResponse() emits invalidResponse event
- [ ] Workflow.validateAgentResponse() creates WorkflowError correctly
- [ ] Zod schema validation behavior is identical to original
- [ ] No breaking changes to public APIs

### Documentation & Deployment

- [ ] Utility function has comprehensive JSDoc with examples
- [ ] Integration with Agent and Workflow documented in JSDoc
- [ ] Barrel export updated in src/utils/index.ts
- [ ] Test file follows project testing patterns
- [ ] Code is self-documenting with clear variable/function names

---

## Anti-Patterns to Avoid

- ❌ Don't modify the existing validateResponse() behavior - maintain backward compatibility
- ❌ Don't add side effects to the utility function - it must be pure
- ❌ Don't use `.ts` extension in import paths - use `.js` for ESM compatibility
- ❌ Don't forget to export ValidationResult type from barrel file
- ❌ Don't skip the wrapper pattern - Agent.validateResponse() must still exist
- ❌ Don't modify the Zod schema - use existing AgentResponseSchema factory
- ❌ Don't add agent-specific logic to the utility - keep it domain-agnostic
- ❌ Don't omit JSDoc documentation - utility must have comprehensive docs
- ❌ Don't skip updating the barrel export - utility must be re-exported
- ❌ Don't forget to import the utility in Agent and Workflow classes
- ❌ Don't break existing tests - all tests must pass after refactoring

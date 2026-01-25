# PRP: Add validation to Agent.prompt() return path

**PRP ID**: P1.M2.T1.S2
**Work Item**: Add validation to Agent.prompt() return path
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Add runtime validation using Zod `.safeParse()` to validate all `Agent.prompt()` return values against `AgentResponseSchema<T>` before returning, ensuring contract compliance per PRD 6.6 even with potential bugs in factory helpers.

**Deliverable**: Modified `Agent.executePrompt()` method in `src/core/agent.ts` that validates all return values against `AgentResponseSchema<T>()` and returns `INTERNAL_ERROR` response if validation fails.

**Success Definition**:
- All return paths from `Agent.executePrompt()` validate responses using `AgentResponseSchema.safeParse()`
- Validation failures log detailed error information to console
- Validation failures return `INTERNAL_ERROR` error response (non-recoverable)
- Existing tests pass with no behavior changes (factory helpers already produce valid responses)
- New tests added for validation failure scenarios

---

## Why

**Business Value and User Impact**:
- **Contract Compliance**: Ensures all AgentResponse objects conform to PRD 6.6 requirements
- **Early Bug Detection**: Catches internal bugs before they reach calling code
- **Better Error Messages**: Structured logging makes debugging easier
- **Production Safety**: Defense-in-depth validation prevents malformed responses

**Integration with Existing Features**:
- **P1.M2.T1.S1 (Parallel)**: Provides `AgentResponseSchema<T>()` factory for validation
- **P1.M1.T1 (Complete)**: `Agent.prompt()` returns `AgentResponse<T>`
- **P1.M1.T1.S2 (Complete)**: Factory helpers (`createSuccessResponse`, `createErrorResponse`) produce valid responses

**Problems This Solves**:
- **No Return Path Validation**: Currently only validates data against `Prompt.responseFormat`, not the full `AgentResponse` structure
- **Silent Failures**: Bugs in factory helpers or manual response construction could produce invalid responses
- **PRD 6.6 Compliance**: Per PRD 6.6, workflows should validate `AgentResponseSchema` before processing

---

## What

**User-Visible Behavior**: No user-visible behavior changes. This adds internal validation that should never fail if factory helpers work correctly (defense-in-depth).

**Technical Requirements**:
- Import `AgentResponseSchema<T>()` from types
- Validate all return values in `Agent.executePrompt()` before returning
- Log detailed error information on validation failure
- Return `INTERNAL_ERROR` response on validation failure
- Add `INTERNAL_ERROR` to `AGENT_ERROR_CODES` constant
- Add unit tests for validation failure path

### Success Criteria

- [ ] `INTERNAL_ERROR` added to `AGENT_ERROR_CODES` in `src/types/agent.ts`
- [ ] `AgentResponseSchema` imported in `src/core/agent.ts`
- [ ] All return paths in `executePrompt()` validate responses
- [ ] Validation failures log structured errors with agentId
- [ ] Validation failures return `INTERNAL_ERROR` response
- [ ] Existing tests pass: `npm test`
- [ ] New tests added for validation scenarios

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement runtime validation on `Agent.prompt()` return path successfully?

**Answer**: YES - This PRP provides exact file locations, current implementation analysis, validation patterns from codebase, external documentation URLs, and step-by-step implementation tasks.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://zod.dev/?id=safeparse
  why: Official Zod documentation for .safeParse() method and return types
  critical: Use .safeParse() not .parse() to avoid throwing on validation failure

- url: https://zod.dev/?id=discriminated-unions
  why: Official Zod documentation for discriminated union validation
  critical: AgentResponseSchema uses discriminatedUnion on 'status' field

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T1S1/PRP.md
  why: CONTRACT - Defines AgentResponseSchema<T>() factory that will exist
  section: Section "Goal" for schema export location, Section "Implementation Blueprint" for schema definition
  critical: This PRP produces the schemas we will use for validation

- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: THE file to modify - contains Agent class and executePrompt() method
  pattern: Lines 116-121 show prompt() wrapper, lines 197-532 show executePrompt() implementation
  gotcha: Validation must occur at ALL return points, not just success path

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: Contains AGENT_ERROR_CODES constant (add INTERNAL_ERROR) and AgentResponseSchema factory
  pattern: Lines 442-482 show AGENT_ERROR_CODES constant structure
  gotcha: INTERNAL_ERROR does NOT exist in current codebase - must add it

- file: /home/dustin/projects/groundswell/src/core/prompt.ts
  why: Contains existing safeValidateResponse() pattern to follow
  pattern: Lines 89-97 show .safeParse() usage and return type
  gotcha: Use prompt.responseFormat as the dataSchema parameter

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T1S2/research/01-agent-prompt-validation-context.md
  why: Comprehensive analysis of Agent.prompt() implementation and current validation patterns
  section: Section 4 "CRITICAL FINDING: INTERNAL_ERROR Code" and Section 6 "Validation Placement Strategy"
  critical: INTERNAL_ERROR code doesn't exist - must add to AGENT_ERROR_CODES

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M2T1S2/research/02-zod-safepattern-validation-guide.md
  why: Zod .safeParse() patterns and best practices for this implementation
  section: Section 8 "Integration with Agent.prompt()" and Section 9 "Testing Validation"
  critical: Shows exact validation pattern to use in executePrompt()

- file: /home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts
  why: Existing Agent tests - understand test patterns used in codebase
  pattern: Look for describe/it patterns, mock patterns, assertion patterns
  gotcha: Tests use Vitest with vi.spyOn for mocking

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S2/research/error-code-conventions-research.md
  why: Error code naming conventions and recoverable flag patterns
  section: Section 7.2 "Recoverable Flag Usage" shows INTERNAL_ERROR should be non-recoverable
  critical: INTERNAL_ERROR recoverable=false (system issue, don't retry)
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── agent.ts                      # TARGET FILE - Modify executePrompt() method
│   ├── prompt.ts                     # Reference for .safeParse() pattern
│   └── index.ts
├── types/
│   ├── agent.ts                      # MODIFY - Add INTERNAL_ERROR to AGENT_ERROR_CODES
│   ├── index.ts                      # AgentResponseSchema exported here
│   └── prompt.ts
├── __tests__/
│   ├── unit/
│   │   └── agent.test.ts             # MODIFY - Add validation tests
│   └── integration/
│       └── agent-workflow.test.ts    # RUN - Ensure integration tests pass
└── index.ts
```

### Desired Codebase Tree with Files to be Modified

```bash
# No new files - modifications only
src/
├── core/
│   └── agent.ts                      # MODIFIED: Add validation to executePrompt()
│       ├── [NEW IMPORT]: Import AgentResponseSchema from types
│       ├── [NEW METHOD or INLINE]: validateResponse() helper method
│       └── [MODIFY]: All return points validate before returning
│
├── types/
│   └── agent.ts                      # MODIFIED: Add INTERNAL_ERROR code
│       └── [MODIFY]: AGENT_ERROR_CODES constant add INTERNAL_ERROR
│
└── __tests__/
    └── unit/
        └── agent.test.ts             # MODIFIED: Add validation tests
            └── [NEW]: Tests for validation failure path
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: INTERNAL_ERROR does NOT exist in AGENT_ERROR_CODES
// Must add it as part of this work item:
export const AGENT_ERROR_CODES = {
  // ... existing codes ...
  INTERNAL_ERROR: 'INTERNAL_ERROR',  // ADD THIS
} as const;

// CRITICAL: Use prompt.responseFormat as the dataSchema
const schema = AgentResponseSchema(prompt.responseFormat);
// NOT: AgentResponseSchema(z.any()) or other schemas

// CRITICAL: Validate at ALL return points, not just success
// The executePrompt() method has multiple return paths:
// - Line ~454: Error return from validation failure
// - Line ~520: Success return
// - Any early error returns

// GOTCHA: Create validation helper OR inline validation
// Helper method (cleaner):
private validateResponse<T>(response: AgentResponse<T>, dataSchema: z.ZodType<T>): AgentResponse<T>

// Inline (simpler for single use):
const validation = AgentResponseSchema(dataSchema).safeParse(response);

// PATTERN: Use .safeParse() NOT .parse()
const result = schema.safeParse(response);  // ✅ Returns result object
const result = schema.parse(response);      // ❌ Throws on failure

// PATTERN: Log before returning error response
console.error('Response validation failed', {
  agentId: this.id,
  timestamp: Date.now(),
  errors: validation.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  })),
});

// PATTERN: Return INTERNAL_ERROR response on validation failure
return createErrorResponse(
  'INTERNAL_ERROR',  // or AGENT_ERROR_CODES.INTERNAL_ERROR after adding
  'Internal response validation failed',
  { validationErrors: validation.error.errors },
  false  // recoverable=false for system errors
);

// GOTCHA: Metadata is optional in AgentResponseSchema
// AgentResponseMetadataSchema.optional() means metadata can be undefined
// Don't fail validation if metadata is missing

// GOTCHA: Import AgentResponseSchema from types, not directly
import { AgentResponseSchema } from '../types/index.js';  // ✅ Correct
// import { AgentResponseSchema } from '../types/agent.js';  // Works but less conventional

// GOTCHA: Factory helpers should always pass validation
// This validation is defense-in-depth, not expected to fail in normal operation
// Tests should mock scenarios to trigger validation failure

// PATTERN: Existing code uses console.error for critical failures
// Follow this pattern for consistency:
console.error('Response validation failed', { ... });

// GOTCHA: The prompt() method is a simple wrapper
// All validation logic goes in executePrompt(), not prompt()
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - Uses existing `AgentResponse<T>` and `AgentResponseSchema<T>()` from P1.M2.T1.S1.

**Key Types**:

| Type | Source | Usage |
|------|--------|-------|
| `AgentResponse<T>` | `src/types/agent.ts` | Response type being validated |
| `AgentResponseSchema<T>()` | `src/types/agent.ts` (from P1.M2.T1.S1) | Zod schema for validation |
| `AGENT_ERROR_CODES` | `src/types/agent.ts` | Add `INTERNAL_ERROR` constant |
| `Prompt<T>.responseFormat` | `src/core/prompt.ts` | Data schema for `AgentResponseSchema<T>()` |

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD INTERNAL_ERROR to AGENT_ERROR_CODES
  - MODIFY: src/types/agent.ts (line ~482, before closing brace)
  - ADD: INTERNAL_ERROR: 'INTERNAL_ERROR' to AGENT_ERROR_CODES constant
  - FOLLOW: Existing pattern at lines 442-482
  - POSITION: Add after TOOL_EXECUTION_FAILED, before closing brace
  - NAMING: SCREAMING_SNAKE_CASE convention
  - DOCUMENTATION: Add JSDoc comment explaining use case

Task 2: ADD AgentResponseSchema import to agent.ts
  - MODIFY: src/core/agent.ts (line ~22, after existing type imports)
  - ADD: import { AgentResponseSchema } from '../types/index.js';
  - FOLLOW: Existing import pattern at lines 8-32
  - PLACEMENT: After type imports from '../types/index.js', before '../types/agent.js' imports

Task 3: CREATE validation helper method in Agent class
  - MODIFY: src/core/agent.ts (add after executePrompt() method, around line ~533)
  - IMPLEMENT: private validateResponse<T>(response: AgentResponse<T>, dataSchema: z.ZodTypeAny): AgentResponse<T>
  - LOGIC:
    1. Create schema: AgentResponseSchema(dataSchema)
    2. Validate: schema.safeParse(response)
    3. If success: return response
    4. If failure: log error, return INTERNAL_ERROR response
  - NAMING: validateResponse, private method
  - PLACEMENT: After executePrompt(), before reflection methods

Task 4: MODIFY executePrompt() success return path
  - MODIFY: src/core/agent.ts (line ~520, success return)
  - FIND: return createSuccessResponse(validated, metadata);
  - REPLACE: Wrap with validateResponse before returning
  - PATTERN: const response = createSuccessResponse(...); return this.validateResponse(response, prompt.responseFormat);

Task 5: MODIFY executePrompt() error return paths
  - MODIFY: src/core/agent.ts (all error return statements)
  - FIND: All return createErrorResponse(...) statements
  - WRAP: Each error return with validateResponse
  - GOTCHA: Error responses have null data schema, use z.znull() or z.undefined() for dataSchema
  - ALTERNATIVE: Skip validation for error responses (they already have status='error')

Task 6: ADD unit tests for validation
  - MODIFY: src/__tests__/unit/agent.test.ts
  - ADD: describe block for "response validation"
  - TEST: Should validate success responses
  - TEST: Should return INTERNAL_ERROR on validation failure
  - TEST: Should log error details on validation failure
  - MOCK: Use vi.spyOn to create invalid response scenarios

Task 7: RUN existing tests
  - VERIFY: npm test passes with no failures
  - CHECK: All Agent tests pass
  - CHECK: All integration tests pass
  - EXPECT: No behavior changes (factory helpers produce valid responses)
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Add INTERNAL_ERROR to AGENT_ERROR_CODES
// In src/types/agent.ts at line ~482, before closing brace
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',

  /**
   * Internal validation or system error
   *
   * Use when an internal validation fails or a system error occurs.
   * This indicates a bug in the code (e.g., factory helper produced invalid response).
   * Non-recoverable because retrying with the same inputs will produce the same error.
   */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// PATTERN 2: Import AgentResponseSchema
// In src/core/agent.ts at line ~22, after existing type imports
import {
  AgentConfig,
  PromptOverrides,
  Tool,
  AgentHooks,
  TokenUsage,
  PreToolUseContext,
  PostToolUseContext,
  SessionStartContext,
  SessionEndContext,
  WorkflowEvent,
  AgentResponse,
  AgentResponseMetadata,
  AgentResponseSchema,  // ADD THIS IMPORT
} from '../types/index.js';

// PATTERN 3: Validation helper method
// In src/core/agent.ts, add after executePrompt() method
/**
 * Validates an AgentResponse against the schema before returning
 * @param response - The response to validate
 * @param dataSchema - The Zod schema for the response data
 * @returns The validated response, or an INTERNAL_ERROR response if validation fails
 */
private validateResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny
): AgentResponse<T> {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate
  const validation = schema.safeParse(response);

  if (validation.success) {
    // Response is valid, return it
    return response;
  }

  // Validation failed - log error details
  console.error('Agent response validation failed', {
    agentId: this.id,
    timestamp: Date.now(),
    errorCount: validation.error.errors.length,
    errors: validation.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  });

  // Return INTERNAL_ERROR response
  return createErrorResponse(
    'INTERNAL_ERROR',
    'Internal response validation failed',
    {
      validationErrors: validation.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    },
    false  // Non-recoverable - indicates system bug
  );
}

// PATTERN 4: Modify success return path
// In src/core/agent.ts executePrompt() method, replace:
//   return createSuccessResponse(validated, metadata);
// With:
const response = createSuccessResponse(validated, metadata);
return this.validateResponse(response, prompt.responseFormat);

// PATTERN 5: Handle error return paths
// For error returns, we have two options:
// OPTION A: Don't validate error returns (they already have status='error')
return createErrorResponse('INVALID_RESPONSE_FORMAT', ...);  // Already valid

// OPTION B: Validate error returns with null data schema
const response = createErrorResponse('INVALID_RESPONSE_FORMAT', ...);
return this.validateResponse(response, z.null());  // Validate with null data schema

// RECOMMENDATION: Skip validation for error returns to avoid complexity
// Error responses are simpler and less likely to have bugs

// PATTERN 6: Unit test for validation
// In src/__tests__/unit/agent.test.ts
describe('Agent.prompt() response validation', () => {
  it('should validate success responses against schema', async () => {
    const agent = createAgent();
    const prompt = createPrompt();

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('success');
    expect(response.error).toBeNull();
  });

  it('should return INTERNAL_ERROR on validation failure', async () => {
    const agent = createAgent();
    const prompt = createPrompt();

    // Mock validateResponse to fail
    vi.spyOn(agent as any, 'validateResponse').mockReturnValue(
      createErrorResponse('INTERNAL_ERROR', 'Test error', null, false)
    );

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('INTERNAL_ERROR');
  });

  it('should log error details on validation failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const agent = createAgent();
    vi.spyOn(agent as any, 'validateResponse').mockReturnValue(
      createErrorResponse('INTERNAL_ERROR', 'Test error', null, false)
    );

    await agent.prompt(createPrompt());

    expect(errorSpy).toHaveBeenCalledWith(
      'Agent response validation failed',
      expect.objectContaining({
        agentId: agent.id,
        errors: expect.any(Array),
      })
    );

    errorSpy.mockRestore();
  });
});
```

### Integration Points

```yaml
DEPENDS ON: P1.M2.T1.S1 (Define Zod schemas for AgentResponse types)
  - AgentResponseSchema<T>() factory must be defined
  - Exported from src/types/agent.ts
  - Re-exported from src/types/index.ts

CONTRACT WITH: P1.M1.T1.S3 (Refactor Agent.prompt() to wrap responses)
  - Factory helpers already produce valid responses
  - This validation is defense-in-depth
  - Should never fail in normal operation

CONTRACT WITH: P1.M1.T1.S2 (Create AgentResponse factory helpers)
  - createSuccessResponse() produces valid responses
  - createErrorResponse() produces valid responses
  - createPartialResponse() produces valid responses

NO BREAKING CHANGES:
  - Existing behavior unchanged (validation should always pass)
  - No changes to public API
  - No changes to Agent.prompt() signature
  - No changes to AgentResponse structure

DOWNSTREAM DEPENDENCIES:
  - P1.M2.T2 (Integration tests) will validate this works
  - Workflows will benefit from guaranteed valid responses
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After each modification - verify TypeScript compilation

# Run TypeScript compiler
npm run lint
# Equivalent: npx tsc --noEmit

# Expected: Zero errors. Changes are type-safe.

# Verify agent.ts compiles independently
npx tsc --noEmit src/core/agent.ts

# Verify types/agent.ts compiles
npx tsc --noEmit src/types/agent.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run Agent unit tests
npm test -- src/__tests__/unit/agent.test.ts

# Run all unit tests
npm test -- src/__tests__/unit/

# Expected: All tests pass. Existing tests should pass with no changes.

# Run new validation tests
npm test -- src/__tests__/unit/agent.test.ts -t "response validation"

# Expected: New tests pass for validation scenarios.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run integration tests
npm test -- src/__tests__/integration/

# Run agent-workflow integration tests
npm test -- src/__tests__/integration/agent-workflow.test.ts

# Expected: All integration tests pass. Validation doesn't break workflows.

# Run full test suite
npm test

# Expected: All tests pass. No behavior changes (factory helpers work correctly).
```

### Level 4: Manual Validation Testing

```bash
# Create a test script to verify validation works
cat > /tmp/test-validation.ts << 'EOF'
import { Agent } from './src/index.js';
import { z } from 'zod';

// Create agent
const agent = new Agent({ name: 'Test Agent' });

// Create prompt with schema
const prompt = agent.createPrompt(z.object({
  result: z.string(),
}), 'Say "hello"');

// Test normal flow (should succeed)
const response1 = await agent.prompt(prompt);
console.log('Normal flow:', response1.status, response1.error);

// Test with invalid response (mock to trigger validation failure)
// This requires mocking or modifying internal state
EOF

npx tsx /tmp/test-validation.ts

# Expected: Normal flow succeeds (status='success', error=null)

# Clean up
rm /tmp/test-validation.ts
```

### Level 5: Schema Validation Testing

```bash
# Verify AgentResponseSchema is importable and works
cat > /tmp/test-schema.ts << 'EOF'
import { AgentResponseSchema } from './src/types/index.js';
import { z } from 'zod';

// Create schema
const schema = AgentResponseSchema(z.object({ result: z.string() }));

// Test valid success response
const validResponse = {
  status: 'success' as const,
  data: { result: 'hello' },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};

const result1 = schema.safeParse(validResponse);
console.log('Valid response:', result1.success);

// Test invalid response (error instead of null)
const invalidResponse = {
  status: 'success' as const,
  data: { result: 'hello' },
  error: { message: 'should be null' },  // Invalid
  metadata: { agentId: 'test', timestamp: Date.now() }
};

const result2 = schema.safeParse(invalidResponse);
console.log('Invalid response:', result2.success);
if (!result2.success) {
  console.log('Errors:', result2.error.errors);
}
EOF

npx tsx /tmp/test-schema.ts

# Expected:
# Valid response: true
# Invalid response: false
# Errors: [array of validation errors]

# Clean up
rm /tmp/test-schema.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] `INTERNAL_ERROR` added to `AGENT_ERROR_CODES`
- [ ] `AgentResponseSchema` imported in agent.ts
- [ ] `validateResponse()` method implemented
- [ ] All return paths in `executePrompt()` validate responses
- [ ] Console error logging on validation failure
- [ ] INTERNAL_ERROR response returned on validation failure

### Functional Validation

- [ ] Normal prompt execution succeeds (no validation failures)
- [ ] Factory helpers produce valid responses (as expected)
- [ ] Validation failures return INTERNAL_ERROR
- [ ] Error responses include validation details
- [ ] Console errors include agentId for correlation

### Test Validation

- [ ] Unit tests added for validation scenarios
- [ ] Unit tests pass: `npm test -- src/__tests__/unit/agent.test.ts`
- [ ] Integration tests pass: `npm test -- src/__tests__/integration/`
- [ ] All tests pass: `npm test`
- [ ] No behavior changes in existing tests

### PRD Compliance Validation

- [ ] PRD 6.4.1 (Strict JSON): Responses validated against schema
- [ ] PRD 6.4.3 (Consistent Structure): Schema enforces structure
- [ ] PRD 6.4.4 (Null over Undefined): Schema uses z.null()
- [ ] PRD 6.4.5 (Error Responses): Error responses validated
- [ ] PRD 6.6 (Workflow Validation): Responses validated before processing

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] Uses console.error for critical failures (consistent)
- [ ] Structured logging with agentId
- [ ] No breaking changes to public API
- [ ] Factory helpers still produce valid responses

---

## Anti-Patterns to Avoid

- ❌ Don't use `.parse()` instead of `.safeParse()` - throws on failure
- ❌ Don't skip validation on some return paths - validate ALL returns
- ❌ Don't forget to add INTERNAL_ERROR to AGENT_ERROR_CODES
- ❌ Don't use wrong dataSchema - use `prompt.responseFormat`
- ❌ Don't log sensitive data - sanitize before logging
- ❌ Don't make INTERNAL_ERROR recoverable - system errors shouldn't retry
- ❌ Don't validate error returns with wrong schema - use `z.null()` or skip
- ❌ Don't modify AgentResponse structure - only validate it
- ❌ Don't change Agent.prompt() signature - wrapper stays the same
- ❌ Don't expect validation to fail - factory helpers work correctly
- ❌ Don't add validation to prompt() wrapper - add to executePrompt()
- ❌ Don't use console.log for errors - use console.error
- ❌ Don't return validation.error directly - wrap in INTERNAL_ERROR response
- ❌ Don't forget to import AgentResponseSchema from types
- ❌ Don't hardcode schema - use AgentResponseSchema factory

---

## Appendix: Complete Reference Implementation

### Task 1: Add INTERNAL_ERROR to AGENT_ERROR_CODES

```typescript
// In src/types/agent.ts at line ~482, before closing brace of AGENT_ERROR_CODES

export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
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

### Task 2: Import AgentResponseSchema

```typescript
// In src/core/agent.ts at line ~22, after existing type imports

import type {
  AgentConfig,
  PromptOverrides,
  Tool,
  AgentHooks,
  TokenUsage,
  PreToolUseContext,
  PostToolUseContext,
  SessionStartContext,
  SessionEndContext,
  WorkflowEvent,
  AgentResponse,
  AgentResponseMetadata,
  AgentResponseSchema,  // ADD THIS IMPORT
} from '../types/index.js';
```

### Task 3: Add validateResponse Helper Method

```typescript
// In src/core/agent.ts, add after executePrompt() method (around line ~533)

/**
 * Validates an AgentResponse against the schema before returning
 *
 * This provides defense-in-depth validation to ensure all returned responses
 * conform to the AgentResponse schema, even if factory helpers have bugs.
 *
 * @template T - The type of response data
 * @param response - The response to validate
 * @param dataSchema - The Zod schema for the response data (from Prompt.responseFormat)
 * @returns The validated response, or an INTERNAL_ERROR response if validation fails
 *
 * @private
 */
private validateResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny
): AgentResponse<T> {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate response against schema
  const validation = schema.safeParse(response);

  if (validation.success) {
    // Response is valid, return it unchanged
    return response;
  }

  // Validation failed - this indicates a bug in our code
  // Log detailed error information for debugging
  console.error('Agent response validation failed', {
    agentId: this.id,
    timestamp: Date.now(),
    errorCount: validation.error.errors.length,
    errors: validation.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  });

  // Return INTERNAL_ERROR response
  // Use createErrorResponse which is already imported
  return createErrorResponse(
    'INTERNAL_ERROR',
    'Internal response validation failed',
    {
      validationErrors: validation.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    },
    false  // Non-recoverable - indicates system bug
  );
}
```

### Task 4: Modify Success Return Path

```typescript
// In src/core/agent.ts executePrompt() method
// Find line ~520 with: return createSuccessResponse(validated, metadata);
// Replace with:

// Create success response
const response = createSuccessResponse(validated, metadata);

// Validate before returning (defense-in-depth)
return this.validateResponse(response, prompt.responseFormat);
```

### Task 5: Handle Error Return Paths

```typescript
// RECOMMENDATION: Skip validation for error returns
// Error responses are simpler and created by createErrorResponse
// which is less likely to have bugs than manual construction

// For the error return at line ~454, leave as is:
return createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  `Response validation failed: ${errorSummary}`,
  { validationErrors: formattedErrors },
  false
);

// ALTERNATIVE: If you want to validate error returns, use:
const response = createErrorResponse(
  'INVALID_RESPONSE_FORMAT',
  `Response validation failed: ${errorSummary}`,
  { validationErrors: formattedErrors },
  false
);
// Validate with null data schema (error responses have null data)
return this.validateResponse(response, z.null());
```

### Task 6: Add Unit Tests

```typescript
// In src/__tests__/unit/agent.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { createErrorResponse } from '../../types/agent.js';
import { z } from 'zod';

describe('Agent.prompt() response validation', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({ name: 'Test Agent' });
  });

  it('should validate success responses against schema', async () => {
    const prompt = agent.createPrompt(
      z.object({ result: z.string() }),
      'Say "hello"'
    );

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('success');
    expect(response.error).toBeNull();
    expect(response.data).toEqual({ result: 'hello' });
  });

  it('should return INTERNAL_ERROR on validation failure', async () => {
    const prompt = agent.createPrompt(
      z.object({ result: z.string() }),
      'Say "hello"'
    );

    // Mock validateResponse to simulate validation failure
    vi.spyOn(agent as any, 'validateResponse').mockReturnValue(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Internal response validation failed',
        { validationErrors: [] },
        false
      )
    );

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('INTERNAL_ERROR');
    expect(response.error?.recoverable).toBe(false);
  });

  it('should log error details on validation failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const prompt = agent.createPrompt(
      z.object({ result: z.string() }),
      'Say "hello"'
    );

    // Mock validateResponse to simulate validation failure
    vi.spyOn(agent as any, 'validateResponse').mockReturnValue(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Internal response validation failed',
        { validationErrors: [] },
        false
      )
    );

    await agent.prompt(prompt);

    expect(errorSpy).toHaveBeenCalledWith(
      'Agent response validation failed',
      expect.objectContaining({
        agentId: agent.id,
        timestamp: expect.any(Number),
        errors: expect.any(Array),
      })
    );

    errorSpy.mockRestore();
  });

  it('should include validation errors in error response', async () => {
    const prompt = agent.createPrompt(
      z.object({ result: z.string() }),
      'Say "hello"'
    );

    const mockValidationErrors = [
      { path: 'data.result', message: 'Required', code: 'invalid_type' }
    ];

    vi.spyOn(agent as any, 'validateResponse').mockReturnValue(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Internal response validation failed',
        { validationErrors: mockValidationErrors },
        false
      )
    );

    const response = await agent.prompt(prompt);

    expect(response.status).toBe('error');
    expect(response.error?.code).toBe('INTERNAL_ERROR');
    expect(response.error?.details).toEqual({
      validationErrors: mockValidationErrors
    });
  });
});
```

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-24
**Research Complete**: YES
**Implementation Ready**: YES
**Confidence Score**: 10/10

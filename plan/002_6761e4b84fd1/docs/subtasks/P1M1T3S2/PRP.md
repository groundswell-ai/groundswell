# PRP: Add JSDoc Comments to AgentResponse Types

**PRP ID**: P1.M1.T3.S2
**Work Item**: Add JSDoc comments to AgentResponse types
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Add comprehensive JSDoc documentation to all AgentResponse-related types in `src/types/agent.ts`, documenting the PRD section 6 requirements for strict JSON structure, null-over-undefined handling, and type narrowing capabilities.

**Deliverable**: Fully documented AgentResponse types with:
- Enhanced JSDoc for existing documented items (adding PRD requirements)
- New JSDoc for undocumented discriminated unions (`SuccessResponse<T>`, `ErrorResponse`, `PartialResponse<T>`)
- New JSDoc for undocumented interfaces (`AgentErrorDetails`, `AgentResponseMetadata`)
- New JSDoc for undocumented constants (`AGENT_ERROR_CODES`)
- Usage examples from PRD section 6.5

**Success Definition**:
- All 17 AgentResponse-related items have comprehensive JSDoc documentation
- PRD 6.4 Response Requirements are documented in relevant types
- PRD 6.5 Example Responses are included as `@example` tags
- TypeScript compilation succeeds with no errors
- Documentation follows existing codebase patterns

---

## Why

**Business Value and User Impact**:
- Developers using AgentResponse types need clear documentation on JSON format requirements
- Type safety is enhanced when developers understand discriminated union type narrowing
- PRD compliance requires explicit documentation of strict JSON requirements
- Reduces integration errors by documenting null-over-undefined behavior

**Integration with Existing Features**:
- Agent.prompt() returns AgentResponse<T> (P1.M1.T1 complete)
- All call sites updated to handle AgentResponse (P1.M1.T2 complete)
- Public API exports verified (P1.M1.T3.S1 complete) - this PRP builds on that

**Problems This Solves**:
- Undocumented discriminated unions (3 types missing JSDoc)
- Undocumented interfaces (2 interfaces missing JSDoc)
- Undocumented error codes constant (1 constant missing JSDoc)
- PRD 6.4 requirements not explicitly documented in types

---

## What

**User-Visible Behavior**: No user-visible behavior changes. This is a documentation-only task.

**Technical Requirements**:
- Add JSDoc to 7 undocumented items
- Enhance JSDoc on 4 items with PRD requirements and examples
- Document PRD 6.4 Response Requirements in relevant types
- Include PRD 6.5 examples in `@example` tags
- Follow existing codebase JSDoc patterns

### Success Criteria

- [ ] All AgentResponse types have JSDoc comments
- [ ] All discriminated unions have type narrowing documentation
- [ ] All interfaces have property-level documentation
- [ ] PRD 6.4 requirements are documented in relevant types
- [ ] PRD 6.5 examples are included as `@example` tags
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to add comprehensive JSDoc to AgentResponse types successfully?

**Answer**: YES - This PRP provides exact line numbers, current documentation state, PRD requirements, code examples, and existing patterns to follow.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.typescriptlang.org/docs/handbook/intro-to-jsdoc.html
  why: Official TypeScript JSDoc documentation for syntax and tags
  critical: Use @template for generics, @example for usage examples

- url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
  why: JSDoc reference for all supported tags
  critical: @param, @returns, @example, @see, @template tags

- url: https://jsdoc.app/
  why: Official JSDoc toolkit documentation
  critical: @example with <caption> for descriptive examples

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: THE file to modify - contains all AgentResponse definitions (lines 92-359)
  pattern: Lines 96-359 contain all AgentResponse-related types
  gotcha: Some items already have JSDoc - preserve and enhance, don't replace

- file: /home/dustin/projects/groundswell/PRD.md
  why: PRD section 6 defines AgentResponse requirements and examples
  pattern: Lines 139-247 contain AgentResponse model (6.1-6.6)
  critical: PRD 6.4 Response Requirements MUST be documented in types
  critical: PRD 6.5 Example Responses MUST be included as @example tags

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M1T3S2/research/01-existing-jsdoc-patterns.md
  why: Existing JSDoc patterns in the codebase to follow
  section: Patterns for AgentResponse Types and Recommendations

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M1T3S2/research/02-typescript-jsdoc-best-practices.md
  why: TypeScript JSDoc best practices with code examples
  section: Section 9: Best Practices Specific to AgentResponse Types

- docfile: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M1T3S2/research/03-agentresponse-documentation-inventory.md
  why: Complete inventory of what needs documentation with line numbers
  section: Documentation Inventory and Summary of Documentation Tasks
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── agent.ts                      # TARGET FILE - AgentResponse types (lines 92-359)
│   ├── index.ts                      # Re-exports AgentResponse types (P1.M1.T3.S1 verified)
│   ├── sdk-primitives.ts             # TokenUsage type reference
│   └── ...
├── core/
│   └── agent.ts                      # Agent.prompt() returns AgentResponse<T>
├── index.ts                          # Main entry point (verified exports)
└── ...
```

### Desired Codebase Tree

```bash
# No new files - only JSDoc comments added to existing file
src/
├── types/
│   ├── agent.ts                      # MODIFIED: Add comprehensive JSDoc to lines 92-359
│   │   ├── Lines 96-100:    AgentResponseStatus (enhance existing)
│   │   ├── Lines 108-120:   AgentResponse<T> (enhance existing)
│   │   ├── Lines 125-137:   AgentErrorDetails (ADD JSDoc)
│   │   ├── Lines 142-160:   AgentResponseMetadata (ADD JSDoc)
│   │   ├── Lines 169:       SuccessResponse<T> (ADD JSDoc)
│   │   ├── Lines 174:       ErrorResponse (ADD JSDoc)
│   │   ├── Lines 179:       PartialResponse<T> (ADD JSDoc)
│   │   ├── Lines 189-195:   AGENT_ERROR_CODES (ADD JSDoc)
│   │   ├── Lines 216-226:   createSuccessResponse (enhance existing)
│   │   ├── Lines 247-267:   createErrorResponse (enhance existing)
│   │   ├── Lines 283-295:   createPartialResponse (enhance existing)
│   │   ├── Lines 315-319:   isSuccess (enhance existing)
│   │   ├── Lines 335-339:   isError (enhance existing)
│   │   └── Lines 355-359:   isPartial (enhance existing)
│   └── ...
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: JSDoc comments use /** */ syntax (two asterisks)
/** This is correct */  // ✅ Correct
/* This is wrong */     // ❌ Wrong (only one asterisk)

// CRITICAL: Property documentation uses inline /** */ comments
export interface AgentResponse<T> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;
}

// GOTCHA: Existing JSDoc should be preserved and ENHANCED, not replaced
// Lines 208-214 have good @example - add PRD examples alongside

// GOTCHA: PRD 6.4 requirements must be explicitly mentioned
// Use phrases like "Per PRD 6.4.1: Strict JSON requirement"

// GOTCHA: PRD 6.5 examples should be included as @example tags
// Use the exact JSON from PRD section 6.5

// CRITICAL: @template tag for generic types comes before @param
/**
 * @template T - The type of data
 * @param {T} data - The data
 */

// GOTCHA: Discriminated unions need explanation of type narrowing
// Document that status field is the discriminant

// GOTCHA: AgentErrorDetails has SCREAMING_SNAKE_CASE convention
// This must be documented

// GOTCHA: AgentResponseMetadata.timestamp is Unix milliseconds
// This must be documented (not Date, not seconds)
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - this is a documentation-only task adding JSDoc to existing types.

### Documentation Requirements by PRD Section

**PRD 6.1 - AgentResponse Interface** (Lines 108-120):
- Document as discriminated union with status as discriminant
- Explain data/error nullability based on status
- Reference PRD 6.4 for format requirements

**PRD 6.2 - AgentErrorDetails** (Lines 125-137):
- Document SCREAMING_SNAKE_CASE convention for code
- Document all fields: code, message, details, recoverable
- Include PRD 6.5 error example

**PRD 6.3 - AgentResponseMetadata** (Lines 142-160):
- Document all fields with types
- Explain timestamp is Unix milliseconds (not Date)
- Mark optional fields for backward compatibility

**PRD 6.4 - Response Requirements** (MUST be documented):
1. **Strict JSON**: Response must be parseable by `JSON.parse()`
2. **No Prose Wrapping**: No markdown or conversational text
3. **Consistent Structure**: Must conform to AgentResponse interface
4. **Null over Undefined**: Use `null` for absent values
5. **Error Responses**: Valid JSON with populated error field

**PRD 6.5 - Example Responses** (MUST be included as @example):
- Success response with data and artifacts
- Error response with EXECUTION_FAILED code
- Partial response with streaming progress

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD JSDoc to discriminated union types
  - MODIFY: src/types/agent.ts lines 169-179
  - ADD: Documentation for SuccessResponse<T> (line 169)
  - ADD: Documentation for ErrorResponse (line 174)
  - ADD: Documentation for PartialResponse<T> (line 179)
  - DOCUMENT: Type narrowing behavior for each
  - INCLUDE: @example showing type guard usage
  - REFERENCE: PRD 6.4.3 (Consistent Structure)

Task 2: ADD JSDoc to AgentErrorDetails interface
  - MODIFY: src/types/agent.ts lines 125-137
  - ADD: Interface-level JSDoc
  - ADD: Property-level JSDoc for all fields
  - DOCUMENT: SCREAMING_SNAKE_CASE convention for code
  - DOCUMENT: recoverable flag usage
  - INCLUDE: @example from PRD 6.5 error response
  - REFERENCE: PRD 6.2

Task 3: ADD JSDoc to AgentResponseMetadata interface
  - MODIFY: src/types/agent.ts lines 142-160
  - ADD: Interface-level JSDoc
  - ADD: Property-level JSDoc for all fields
  - DOCUMENT: Unix timestamp format (milliseconds)
  - DOCUMENT: Optional fields for backward compatibility
  - INCLUDE: @example from PRD 6.5
  - REFERENCE: PRD 6.3

Task 4: ADD JSDoc to AGENT_ERROR_CODES constant
  - MODIFY: src/types/agent.ts lines 189-195
  - ADD: Constant-level JSDoc
  - DOCUMENT: Each error code with inline comments
  - INCLUDE: @example showing usage with createErrorResponse
  - REFERENCE: PRD 6.4.5 (Error Responses)
  - REFERENCE: PRD 6.6 (Validation - INVALID_RESPONSE_FORMAT)

Task 5: ENHANCE AgentResponse<T> JSDoc
  - MODIFY: src/types/agent.ts lines 108-120
  - PRESERVE: Existing JSDoc structure
  - ADD: PRD 6.4 requirements documentation
  - ADD: @example with PRD 6.5 success and error responses
  - ADD: Note about null-over-undefined (PRD 6.4.4)
  - DOCUMENT: Discriminated union type narrowing

Task 6: ENHANCE factory function JSDoc
  - MODIFY: src/types/agent.ts lines 216-226, 247-267, 283-295
  - PRESERVE: Existing @param, @returns, @example
  - ADD: PRD 6.4 requirements notes
  - ADD: JSON serialization guarantee (PRD 6.4.1)
  - ENHANCE: @example with PRD 6.5 examples
  - createSuccessResponse: Add strict JSON note
  - createErrorResponse: Add PRD 6.5 error example
  - createPartialResponse: Add streaming context

Task 7: ENHANCE type guard JSDoc
  - MODIFY: src/types/agent.ts lines 315-319, 335-339, 355-359
  - PRESERVE: Existing documentation (it's good)
  - CONSIDER: Adding additional examples if useful
  - NOTE: Current documentation is already excellent
  - OPTIONAL: Add cross-references with @see
```

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Discriminated Union Documentation
/**
 * Success response type - data is T (not null), error is null
 *
 * Use this type with type guards for type-safe access to response data.
 * When a response has status 'success', data is guaranteed to be T (not null).
 *
 * @template T - The type of data returned on success
 * @see {@link isSuccess} for the type guard that narrows to this type
 *
 * @example
 * ```ts
 * // Type narrowing with type guard
 * if (isSuccess(response)) {
 *   console.log(response.data); // TypeScript knows data is T
 *   console.log(response.error); // TypeScript knows error is null
 * }
 * ```
 */
export type SuccessResponse<T> = AgentResponse<T> & { status: 'success' };

// PATTERN 2: Interface with Property Documentation
/**
 * Error details for agent error responses
 *
 * Per PRD 6.2: Error responses include machine-readable codes,
 * human-readable messages, and a recoverable flag for retry logic.
 *
 * @see {@link AGENT_ERROR_CODES} for standard error codes
 * @see {@link createErrorResponse} for factory function
 */
export interface AgentErrorDetails {
  /** Machine-readable error code (SCREAMING_SNAKE_CASE convention) */
  code: string;

  /** Human-readable error description */
  message: string;

  /** Additional error context - null if no details available */
  details?: Record<string, unknown> | null;

  /**
   * Whether the error is recoverable (can retry)
   *
   * Set to true for transient errors (rate limits, network issues).
   * Set to false for permanent errors (validation, invalid format).
   */
  recoverable: boolean;
}

// PATTERN 3: Enhanced Interface with PRD Requirements
/**
 * Response wrapper for agent execution results
 *
 * ## PRD 6.4 Response Requirements
 *
 * All AgentResponse instances MUST satisfy:
 *
 * 1. **Strict JSON** (PRD 6.4.1): Must be parseable by `JSON.parse()`
 * 2. **No Prose Wrapping** (PRD 6.4.2): No markdown code blocks or text
 * 3. **Consistent Structure** (PRD 6.4.3): Must conform to this interface
 * 4. **Null over Undefined** (PRD 6.4.4): Use `null` for absent values
 * 5. **Error Responses** (PRD 6.4.5): Failed operations return valid JSON
 *
 * ## Type Narrowing
 *
 * The `status` field is a discriminant. Use type guards to narrow types:
 * - `isSuccess(response)` → `SuccessResponse<T>` (data is T, error is null)
 * - `isError(response)` → `ErrorResponse` (data is null, error exists)
 * - `isPartial(response)` → `PartialResponse<T>` (data is T, error is null)
 *
 * @template T - The type of data returned on success (unknown by default)
 * @see {@link SuccessResponse}, {@link ErrorResponse}, {@link PartialResponse}
 *
 * @example <caption>Success response (PRD 6.5)</caption>
 * ```ts
 * const response: AgentResponse<{ result: string; artifacts: string[] }> = {
 *   status: 'success',
 *   data: { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
 *   error: null,
 *   metadata: { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
 * };
 * ```
 *
 * @example <caption>Error response (PRD 6.5)</caption>
 * ```ts
 * const response: AgentResponse<null> = {
 *   status: 'error',
 *   data: null,
 *   error: {
 *     code: 'EXECUTION_FAILED',
 *     message: 'Failed to compile TypeScript files',
 *     details: { failedFiles: ['src/index.ts'] },
 *     recoverable: true
 *   },
 *   metadata: { agentId: 'agent-abc123', timestamp: 1706140800000 }
 * };
 * ```
 */
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;

  /** Response data - null for error responses (per PRD 6.4.5) */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata including agent, timestamp, and execution details */
  metadata: AgentResponseMetadata;
}

// PATTERN 4: Constant with Property Documentation
/**
 * Standard error codes for agent responses
 *
 * All error codes use SCREAMING_SNAKE_CASE convention.
 * Per PRD 6.6, use `INVALID_RESPONSE_FORMAT` for responses that
 * don't conform to the AgentResponse schema.
 *
 * @see {@link AgentErrorDetails} for error details structure
 * @see {@link createErrorResponse} for factory function
 *
 * @example
 * ```ts
 * import { AGENT_ERROR_CODES, createErrorResponse } from 'groundswell';
 *
 * const error = createErrorResponse(
 *   AGENT_ERROR_CODES.VALIDATION_FAILED,
 *   'Invalid input',
 *   { field: 'email', value: 'not-an-email' }
 * );
 * ```
 */
export const AGENT_ERROR_CODES = {
  /** Response not valid JSON or doesn't match AgentResponse schema (PRD 6.6) */
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  /** Input validation failed */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** Agent execution failed */
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  /** API request to LLM provider failed */
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  /** Tool execution failed */
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;

// PATTERN 5: Enhanced Factory Function
/**
 * Creates a success response with data and metadata.
 *
 * ## PRD 6.4 Compliance
 *
 * The returned response satisfies all PRD 6.4 requirements:
 * - Strict JSON parseable by `JSON.parse()` (PRD 6.4.1)
 * - No prose wrapping - pure JSON structure (PRD 6.4.2)
 * - Consistent with AgentResponse interface (PRD 6.4.3)
 * - Uses null instead of undefined (PRD 6.4.4)
 *
 * @template T - The type of the response data
 * @param data - The response data to return
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse with status 'success', provided data, null error
 *
 * @example <caption>Basic success response</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'success', artifacts: ['file1.ts'] },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 *
 * // Guaranteed to be valid JSON (PRD 6.4.1)
 * const jsonString = JSON.stringify(response);
 * const parsed = JSON.parse(jsonString); // Always valid
 * ```
 *
 * @example <caption>Success response with execution metadata</caption>
 * ```ts
 * ```ts
 * const response = createSuccessResponse(
 *   { items: [1, 2, 3] },
 *   {
 *     agentId: 'agent-123',
 *     timestamp: Date.now(),
 *     duration: 1523,
 *     requestId: 'req-abc123'
 *   }
 * );
 * ```
 */
```

### Integration Points

```yaml
NO CODE CHANGES - Documentation Only:
  - This task only adds JSDoc comments
  - No TypeScript code is modified
  - No imports or exports change
  - No breaking changes

DOWNSTREAM DEPENDENCIES:
  - P1.M2.T1 (Zod schema) will reference documented types
  - P1.M3.T1 (Documentation) will use JSDoc for migration guide
  - Public API consumers will benefit from enhanced IntelliSense

CONTEXT FROM P1.M1.T3.S1:
  - Previous PRP verified all AgentResponse types are exported
  - This PRP adds documentation to those exported types
  - No export structure changes needed
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After adding JSDoc comments - verify TypeScript compilation

# Run TypeScript compiler - JSDoc comments don't affect compilation
npx tsc --noEmit

# Expected: Zero errors. JSDoc comments are ignored by TypeScript compiler.

# Verify JSDoc syntax is valid (optional - if using a JSDoc linter)
# npm run lint:jsdoc  # If project has JSDoc linting

# Quick check that file is still valid TypeScript
npx tsc --noEmit src/types/agent.ts
```

### Level 2: Documentation Quality Check

```bash
# Verify JSDoc comments are present and well-formed

# Count JSDoc comments in the file (should increase significantly)
grep -c "/**" src/types/agent.ts

# Verify specific JSDoc tags are present
grep "@example" src/types/agent.ts | wc -l  # Should have multiple @example tags
grep "@template" src/types/agent.ts | wc -l  # Should have @template for generics
grep "@see" src/types/agent.ts | wc -l       # Should have cross-references

# Check PRD requirements are documented
grep -i "PRD 6.4" src/types/agent.ts        # Should reference PRD 6.4
grep -i "Strict JSON" src/types/agent.ts     # Should document strict JSON
grep -i "null over undefined" src/types/agent.ts  # Should document null preference

# Expected: All checks show significant increase in documentation
```

### Level 3: Type Checking and IntelliSense

```bash
# Create a test file to verify JSDoc improves IntelliSense
cat > verify-jsdoc.ts << 'EOF'
import type {
  AgentResponse,
  AgentErrorDetails,
  AgentResponseMetadata,
  SuccessResponse,
  ErrorResponse,
  PartialResponse
} from './src/index.js';
import {
  AGENT_ERROR_CODES,
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse,
  isSuccess,
  isError,
  isPartial
} from './src/index.js';

// Hover over each type/import to see JSDoc in action
const testType: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// Test discriminated union - hover to see type narrowing
if (isSuccess(testType)) {
  // Hover over testType here - should show SuccessResponse<string>
  console.log(testType.data); // TypeScript knows data is string
}
EOF

# Compile test file - should succeed with no errors
npx tsc --noEmit verify-jsdoc.ts

# Clean up
rm verify-jsdoc.ts

# Expected: Zero errors. JSDoc enhances type checking but doesn't break it.
```

### Level 4: Documentation Generation (Optional)

```bash
# If project has TypeDoc or similar, generate documentation

# TypeDoc (if available)
npx typedoc src/types/agent.ts --out docs/agent-types

# Check that generated docs include JSDoc content
grep -r "PRD 6.4" docs/agent-types/  # Should find PRD references
grep -r "@example" docs/agent-types/  # Should find examples

# Alternative: Use VSCode to hover over types and verify JSDoc appears
# 1. Open src/types/agent.ts in VSCode
# 2. Hover over AgentResponse interface
# 3. Verify JSDoc appears in hover tooltip
# 4. Verify @example tags render correctly

# Expected: JSDoc content appears in IntelliSense hovers
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All 17 AgentResponse items have JSDoc documentation
- [ ] JSDoc comments use correct `/** */` syntax
- [ ] `@template` tags used for generic types
- [ ] `@example` tags included with code blocks
- [ ] `@see` tags for cross-references

### Documentation Quality Validation

- [ ] PRD 6.4 requirements documented in AgentResponse interface
- [ ] PRD 6.5 examples included as `@example` tags
- [ ] Discriminated unions explain type narrowing
- [ ] SCREAMING_SNAKE_CASE convention documented for error codes
- [ ] Unix timestamp format documented for metadata
- [ ] Null-over-undefined behavior documented

### Feature Validation

- [ ] All discriminated unions (`SuccessResponse<T>`, `ErrorResponse`, `PartialResponse<T>`) documented
- [ ] All interfaces (`AgentErrorDetails`, `AgentResponseMetadata`) documented
- [ ] Error codes constant (`AGENT_ERROR_CODES`) documented
- [ ] Factory functions enhanced with PRD requirements
- [ ] Type guards reference discriminated unions

### Code Quality Validation

- [ ] Follows existing codebase JSDoc patterns
- [ ] Preserves existing good documentation (enhances, doesn't replace)
- [ ] Uses consistent formatting and style
- [ ] No spelling or grammatical errors
- [ ] Examples are syntactically correct TypeScript

---

## Anti-Patterns to Avoid

- ❌ Don't remove or replace existing good JSDoc - enhance it instead
- ❌ Don't use `/* */` comments for JSDoc - must use `/** */`
- ❌ Don't forget `@template` for generic types
- ❌ Don't use `undefined` in examples - use `null` per PRD 6.4.4
- ❌ Don't skip documenting discriminated union type narrowing
- ❌ Don't omit PRD 6.4 requirements from main types
- ❌ Don't use conversational prose in `@example` - show code only
- ❌ Don't forget to document optional vs required properties
- ❌ Don't use markdown formatting in `@example` code blocks
- ❌ Don't create circular `@see` references

---

## Appendix: Complete Documentation Inventory

### Items to ADD JSDoc (7 items)

| Item | Lines | Type | Priority |
|------|-------|------|----------|
| `SuccessResponse<T>` | 169 | Discriminated union | High |
| `ErrorResponse` | 174 | Discriminated union | High |
| `PartialResponse<T>` | 179 | Discriminated union | High |
| `AgentErrorDetails` | 125-137 | Interface | High |
| `AgentResponseMetadata` | 142-160 | Interface | High |
| `AGENT_ERROR_CODES` | 189-195 | Constant | Medium |
| Property docs in interfaces | 125-160 | Inline comments | High |

### Items to ENHANCE JSDoc (4 items)

| Item | Lines | Enhancement Needed |
|------|-------|-------------------|
| `AgentResponse<T>` | 108-120 | Add PRD 6.4 requirements, more examples |
| `createSuccessResponse<T>` | 216-226 | Add PRD 6.4 notes, JSON guarantee |
| `createErrorResponse` | 247-267 | Add PRD 6.5 error example |
| `createPartialResponse<T>` | 283-295 | Add streaming context, PRD 6.5 example |

### Items Already Well Documented (6 items)

| Item | Lines | Status |
|------|-------|--------|
| `AgentResponseStatus` | 100 | ✅ Complete |
| `isSuccess<T>` | 315-319 | ✅ Complete |
| `isError<T>` | 335-339 | ✅ Complete |
| `isPartial<T>` | 355-359 | ✅ Complete |
| Factory function basic docs | 216-359 | ✅ Good structure |
| Type guard examples | 315-359 | ✅ Good examples |

---

**PRP Version**: 1.0
**Last Updated**: 2026-01-24
**Research Complete**: YES
**Implementation Ready**: YES
**Confidence Score**: 10/10

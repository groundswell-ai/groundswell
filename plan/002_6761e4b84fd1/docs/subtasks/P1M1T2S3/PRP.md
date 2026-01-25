# Product Requirement Prompt (PRP): Update source code prompt() call sites

**PRP ID**: P1.M1.T2.S3
**Work Item**: Update source code prompt() call sites
**Created**: 2026-01-24
**Status**: Research-Complete

---

## Goal

**Feature Goal**: Update all non-example source code files to properly handle `AgentResponse<T>` return type from `agent.prompt()` calls, ensuring type-safe data access and proper error propagation.

**Deliverable**: Updated source code in `src/core/workflow-context.ts` with proper `AgentResponse<T>` handling in the `replaceLastPromptResult()` method.

**Success Definition**:
- [ ] `replaceLastPromptResult()` checks `response.status` before accessing `response.data`
- [ ] Error responses are properly converted to exceptions with error details preserved
- [ ] `AgentLike` interface updated to match actual `Agent.prompt()` return type
- [ ] TypeScript compilation passes without type errors
- [ ] Unit tests verify both success and error response handling

---

## User Persona

**Target User**: Development team implementing the AgentResponse standardization across the codebase

**Use Case**: A developer is updating internal source code to handle the new `AgentResponse<T>` return type from `agent.prompt()`. They need to:
1. Identify which source files have `agent.prompt()` calls
2. Understand the correct pattern for handling `AgentResponse<T>`
3. Update the code to be type-safe and properly handle errors
4. Verify the changes work correctly

**User Journey**:
1. Read this PRP to understand what needs updating
2. Review the research findings for detailed context
3. Update `src/types/workflow-context.ts` to fix the `AgentLike` interface
4. Update `src/core/workflow-context.ts` to fix `replaceLastPromptResult()` method
5. Run tests to verify the changes work correctly

**Pain Points Addressed**:
- **Type mismatch**: Current code assumes `agent.prompt()` returns `T` but it returns `AgentResponse<T>`
- **Runtime errors**: Accessing `response.data` without checking status causes null pointer errors
- **Lost error context**: Not handling `response.error` loses valuable debugging information
- **Interface inconsistency**: `AgentLike` interface doesn't match actual `Agent` implementation

---

## Why

This task enables **PRD section 6.2** (Agent Response Standardization) by ensuring internal source code properly handles the new `AgentResponse<T>` return type.

**Problem**: After implementing `AgentResponse<T>` wrapping in `Agent.prompt()` (P1.M1.T1), internal source code that calls `agent.prompt()` is broken:
1. **Type mismatch**: Code expects `T` but gets `AgentResponse<T>`
2. **No status checking**: Code doesn't check `response.status` before accessing data
3. **Error information lost**: `response.error` details are not propagated
4. **Interface outdated**: `AgentLike` interface doesn't match actual behavior

**Solution**: Update `replaceLastPromptResult()` in `src/core/workflow-context.ts` to:
1. Check `response.status === 'error'` before accessing `response.data`
2. Convert error responses to exceptions with preserved error details
3. Extract data only after confirming successful status
4. Update `AgentLike` interface to return `Promise<AgentResponse<T>>`

**Impact**:
- Internal source code works correctly with the new `AgentResponse<T>` type
- Type safety is maintained throughout the call chain
- Error information is preserved for debugging
- Interface matches actual implementation

---

## What

### Scope

**In Scope**:
- Update `src/core/workflow-context.ts` line 295 in `replaceLastPromptResult()` method
- Update `src/types/workflow-context.ts` lines 74-76 to fix `AgentLike` interface
- Add proper `AgentResponse<T>` handling following the canonical pattern from `reflection.ts`
- Handle error responses by converting to exceptions with preserved error details
- Add unit tests to verify the updated behavior

**Out of Scope**:
- Example files (covered in P1.M1.T2.S2)
- Test files (covered in P1.M1.T2.S4)
- Documentation files (low priority, can be done separately)
- Reflection system (already updated - this is the reference pattern)

### Success Criteria

- [ ] `AgentLike.prompt()` return type updated to `Promise<AgentResponse<T>>`
- [ ] `replaceLastPromptResult()` checks `response.status === 'error'`
- [ ] Error responses throw exceptions with `response.error.message` preserved
- [ ] Success responses extract `response.data` correctly
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] Unit tests pass for both success and error cases
- [ ] Error messages include error code for debugging

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to update the source code correctly?

**Answer**: YES - This PRP provides:
- Exact file locations and line numbers requiring updates
- Current broken code with explanation of why it fails
- Correct code pattern to follow (from reflection.ts)
- Complete AgentResponse type system reference
- Error propagation patterns for the codebase
- Test patterns for validation

### Documentation & References

```yaml
# CRITICAL - Previous PRP (P1.M1.T2.S1) Research Findings

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T2S1/research/01-call-sites-inventory.md
  why: Complete inventory of all agent.prompt() call sites
  section:
    - "### 1. Source Code: src/core/workflow-context.ts (Line 295)"
    - Identifies this as the ONLY source file (excluding reflection.ts) that needs updating
  critical: |
    Previous research confirmed only 1 source code file needs updating:
    src/core/workflow-context.ts line 295 in replaceLastPromptResult() method.

# CRITICAL - Canonical AgentResponse Handling Pattern

- file: src/reflection/reflection.ts
  why: Shows the CORRECT pattern for handling AgentResponse<T>
  lines: 267-296
  pattern: |
    const response = await this.agent.prompt(reflectionPrompt);
    if (response.status === 'error') {
      return {
        shouldRetry: false,
        reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
      };
    }
    const data = response.data;
    if (!data) {
      return {
        shouldRetry: false,
        reason: 'Reflection analysis failed: No data returned',
      };
    }
    // Use data
  gotcha: |
    Use this as the TEMPLATE for all call site updates.
    Pattern: status check -> error handling -> data extraction -> use data.

# CRITICAL - AgentResponse Type Definition

- file: src/types/agent.ts
  why: Defines the AgentResponse<T> interface that call sites must handle
  lines:
    - 108-120: AgentResponse<T> interface
    - 125-137: AgentErrorDetails interface
    - 142-160: AgentResponseMetadata interface
    - 315-359: Type guard functions (isSuccess, isError, isPartial)
    - 189-195: AGENT_ERROR_CODES constants
  pattern: |
    export interface AgentResponse<T = unknown> {
      status: AgentResponseStatus;  // 'success' | 'error' | 'partial'
      data: T | null;
      error: AgentErrorDetails | null;
      metadata: AgentResponseMetadata;
    }

# CRITICAL - File to Update: workflow-context.ts

- file: src/core/workflow-context.ts
  why: The ONLY source file (excluding reflection.ts) with an agent.prompt() call
  lines: 230-336 (replaceLastPromptResult method)
  focus: 295 (agent.prompt call)
  current_code: |
    const result = await runInContext(executionContext, () =>
      agent.prompt(newPrompt)
    );
    return result;
  problem: |
    agent.prompt() returns AgentResponse<T> but code treats it as T.
    This causes runtime type errors when the method is called.
  fix: |
    const response = await runInContext(executionContext, () =>
      agent.prompt(newPrompt)
    );
    if (response.status === 'error') {
      throw new Error(response.error?.message ?? 'Agent prompt failed');
    }
    const result = response.data!;
    return result;

# CRITICAL - Interface to Update: workflow-context.ts (AgentLike)

- file: src/types/workflow-context.ts
  why: AgentLike interface doesn't match actual Agent implementation
  lines: 74-76
  current: |
    export interface AgentLike {
      prompt<T>(prompt: PromptLike<T>): Promise<T>;
    }
  fix: |
    import type { AgentResponse } from '../types/agent.js';
    export interface AgentLike {
      prompt<T>(prompt: PromptLike<T>): Promise<AgentResponse<T>>;
    }

# RESEARCH - workflow-context Analysis

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/research/01-workflow-context-analysis.md
  why: Deep analysis of the call chain and type mismatch
  section:
    - "## 5. Required Changes" - Exact code changes needed
    - "## 6. Recommended Fix Pattern" - Multiple fix options
  critical: |
    Provides complete analysis of the type mismatch and recommended fixes.
    The interface must be updated first, then the method implementation.

# RESEARCH - Canonical Pattern Analysis

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/research/02-canonical-pattern-analysis.md
  why: Complete breakdown of the reference pattern from reflection.ts
  section:
    - "## 2. Pattern Breakdown (Step by Step)" - Detailed pattern steps
    - "## 6. Template for Other Call Sites" - Ready-to-use templates
  critical: |
    Use the canonical pattern from reflection.ts as the template.
    Follow the exact steps: status check -> error handling -> data extraction.

# RESEARCH - Source Code Call Sites

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/research/03-source-code-call-sites.md
  why: Confirms only 1 source file needs updating
  section:
    - "## 1. Files Requiring Updates" - workflow-context.ts details
    - "## 4. Interface Updates Required" - AgentLike interface fix
  critical: |
    Only 1 source code file needs updating: src/core/workflow-context.ts.
    The interface fix is also required for type correctness.

# RESEARCH - Error Propagation Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/research/04-error-propagation-patterns.md
  why: Shows how to properly handle AgentResponse errors in this codebase
  section:
    - "## 3. Recommended Error Propagation for AgentResponse"
    - "## 8. Recommended Pattern for workflow-context.ts"
  critical: |
    Convert AgentResponse errors to exceptions for backward compatibility.
    Preserve error code and message in the thrown exception.

# RESEARCH - AgentResponse Type System

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/research/06-agentresponse-type-system.md
  why: Complete reference for the AgentResponse type system
  section:
    - "## 2. Type Guard Functions" - isSuccess, isError usage
    - "## 7. Type Narrowing Examples" - How to use type guards
  critical: |
    Use type guards (isSuccess, isError) for cleaner syntax.
    Always check status before accessing data or error fields.

# RESEARCH - Test Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/research/05-test-patterns-analysis.md
  why: Shows how to test AgentResponse handling
  section:
    - "## 5. Recommended Test Cases for Updated Call Sites"
    - Test patterns for success and error cases
  critical: |
    Create unit tests for replaceLastPromptResult() that verify
    both success and error response handling.
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # [REFERENCE] Agent.prompt() returns AgentResponse<T>
│   ├── workflow-context.ts      # [UPDATE] Line 295: fix replaceLastPromptResult()
│   └── factory.ts               # [LOW] JSDoc examples (optional update)
├── types/
│   ├── agent.ts                 # [REFERENCE] AgentResponse types, type guards
│   └── workflow-context.ts      # [UPDATE] Lines 74-76: fix AgentLike interface
├── reflection/
│   └── reflection.ts            # [REFERENCE] Canonical pattern (lines 267-296)
└── __tests__/
    └── unit/
        └── workflow-context.test.ts  # [CREATE] Tests for updated method

plan/
└── 002_6761e4b84fd1/
    └── P1M1T2S3/
        ├── PRP.md               # [THIS FILE] Product Requirement Prompt
        └── research/            # Research findings directory
            ├── 01-workflow-context-analysis.md
            ├── 02-canonical-pattern-analysis.md
            ├── 03-source-code-call-sites.md
            ├── 04-error-propagation-patterns.md
            ├── 05-test-patterns-analysis.md
            └── 06-agentresponse-type-system.md
```

### Desired Codebase Tree with Changes

```bash
src/
├── core/
│   └── workflow-context.ts      # [UPDATED] replaceLastPromptResult() handles AgentResponse
├── types/
│   └── workflow-context.ts      # [UPDATED] AgentLike.prompt() returns Promise<AgentResponse<T>>
└── __tests__/
    └── unit/
        └── workflow-context.test.ts  # [NEW] Tests for replaceLastPromptResult()
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: workflow-context.ts has a type mismatch
// AgentLike interface says prompt() returns Promise<T>
// But actual Agent.prompt() returns Promise<AgentResponse<T>>
// This must be fixed first before updating the method

// CRITICAL: replaceLastPromptResult() is called from workflow steps
// Error responses must be converted to exceptions for backward compatibility
// Don't change the method signature - it must still return Promise<T>

// CRITICAL: The reflection.ts file is the reference pattern
// It already handles AgentResponse correctly - use it as a template
// Location: src/reflection/reflection.ts lines 267-296

// CRITICAL: Error messages should include error code for debugging
// Pattern: `[${code}] ${message}`
// Example: `[VALIDATION_FAILED] Response validation failed`

// CRITICAL: Use type guards for cleaner syntax
// import { isError } from '../types/agent.js';
// if (isError(response)) { ... }

// GOTCHA: The prompt is wrapped in runInContext() for event capture
// Don't remove this wrapper - it's essential for workflow observability
// const response = await runInContext(executionContext, () =>
//   agent.prompt(newPrompt)
// );

// GOTCHA: There are revision node updates and event emissions
// These must happen AFTER the response is validated
// Don't move them before the status check

// GOTCHA: The method is part of the WorkflowContext API
// Other code may depend on it throwing exceptions on error
// Preserve this behavior for backward compatibility
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - This update uses existing `AgentResponse<T>` type.

**Key Types to Reference**:

```typescript
// AgentResponse interface (src/types/agent.ts)
interface AgentResponse<T = unknown> {
  status: 'success' | 'error' | 'partial';
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

// Error details (src/types/agent.ts)
interface AgentErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

// Type guards (src/types/agent.ts)
function isError<T>(response: AgentResponse<T>): response is ErrorResponse;
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>;
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE src/types/workflow-context.ts (AgentLike interface)
  - FILE: src/types/workflow-context.ts
  - LINES: 74-76
  - ADD: Import for AgentResponse type
  - CHANGE: AgentLike.prompt() return type from Promise<T> to Promise<AgentResponse<T>>
  - BEFORE: |
    export interface AgentLike {
      prompt<T>(prompt: PromptLike<T>): Promise<T>;
    }
  - AFTER: |
    import type { AgentResponse } from './agent.js';
    export interface AgentLike {
      prompt<T>(prompt: PromptLike<T>): Promise<AgentResponse<T>>;
    }

Task 2: UPDATE src/core/workflow-context.ts (replaceLastPromptResult method)
  - FILE: src/core/workflow-context.ts
  - LINES: 230-336 (replaceLastPromptResult method)
  - FOCUS: Line 295 (agent.prompt call)
  - CHANGE: Variable name from 'result' to 'response'
  - ADD: Status check after agent.prompt() call
  - ADD: Error handling that throws exception with preserved error details
  - CHANGE: Extract data from response.data after status check
  - PRESERVE: All existing logic (revision node updates, event emissions)
  - PATTERN: Follow canonical pattern from src/reflection/reflection.ts lines 267-296

Task 3: CREATE src/__tests__/unit/workflow-context.test.ts
  - FILE: src/__tests__/unit/workflow-context.test.ts
  - IMPLEMENT: Unit tests for replaceLastPromptResult() method
  - TEST CASES:
    - Success response: extracts data correctly
    - Error response: throws exception with error message
    - Error response: preserves error code in thrown exception
    - Recoverable errors: handled appropriately
  - FOLLOW: Pattern from src/__tests__/unit/agent-response-factory.test.ts

Task 4: VERIFY TypeScript compilation
  - COMMAND: npx tsc --noEmit src/core/workflow-context.ts
  - EXPECT: No type errors
  - VERIFY: Interface changes don't break other code

Task 5: RUN tests
  - COMMAND: npm test -- workflow-context.test.ts
  - EXPECT: All tests pass
  - VERIFY: Both success and error cases work correctly
```

### Implementation Patterns & Key Details

```typescript
// ========================================================================
// INTERFACE UPDATE - Task 1
// ========================================================================

// CURRENT (src/types/workflow-context.ts:74-76)
export interface AgentLike {
  prompt<T>(prompt: PromptLike<T>): Promise<T>;
}

// UPDATED
import type { AgentResponse } from './agent.js';

export interface AgentLike {
  prompt<T>(prompt: PromptLike<T>): Promise<AgentResponse<T>>;
}

// ========================================================================
// METHOD UPDATE - Task 2
// ========================================================================

// CURRENT (src/core/workflow-context.ts:292-309)
try {
  // Execute the new prompt in context
  const result = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );

  // Update revision node status
  revisionNode.status = 'completed';

  // Emit completion event
  this.workflow.emitEvent({
    type: 'stepEnd',
    node: revisionNode,
    step: `revision:${newPrompt.id}`,
    duration: 0,
  });

  // Rebuild event tree
  this.eventTreeImpl.rebuild(this.workflow.node);

  return result;
} catch (error) {
  // Error handling...
}

// UPDATED
try {
  // Execute the new prompt in context
  const response = await runInContext(executionContext, () =>
    agent.prompt(newPrompt)
  );

  // Handle AgentResponse error
  if (response.status === 'error') {
    const { code, message } = response.error;
    const error = new Error(`[${code}] ${message}`);
    error.name = 'AgentPromptError';
    throw error;
  }

  // Extract data (type narrowed to T after status check)
  const result = response.data!;

  // Update revision node status
  revisionNode.status = 'completed';

  // Emit completion event
  this.workflow.emitEvent({
    type: 'stepEnd',
    node: revisionNode,
    step: `revision:${newPrompt.id}`,
    duration: 0,
  });

  // Rebuild event tree
  this.eventTreeImpl.rebuild(this.workflow.node);

  return result;
} catch (error) {
  // Error handling...
}

// ========================================================================
// ALTERNATIVE: Using Type Guards (Cleaner Syntax)
// ========================================================================

import { isError } from '../types/agent.js';

const response = await runInContext(executionContext, () =>
  agent.prompt(newPrompt)
);

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  const { code, message } = response.error;
  throw new Error(`[${code}] ${message}`);
}

const result = response.data!;
// ... rest of success handling

// ========================================================================
// KEY DETAILS
// ========================================================================

// 1. Update the interface FIRST (Task 1) before the method (Task 2)
// This prevents TypeScript errors during the update process

// 2. Change variable name from 'result' to 'response'
// This clarifies that it's an AgentResponse, not the final data

// 3. Check status BEFORE accessing data
// if (response.status === 'error') { ... }

// 4. Preserve error details in thrown exception
// Include error code: `[${code}] ${message}`

// 5. Use non-null assertion after status check
// const result = response.data!;
// TypeScript knows data is not null when status !== 'error'

// 6. Keep all existing logic after status check
// Revision node updates, event emissions, etc.

// 7. Throw exception for backward compatibility
// The method signature returns Promise<T>, so we must throw on error
// Don't change the method signature

// 8. Follow the canonical pattern from reflection.ts
// Status check -> Error handling -> Data extraction -> Use data
```

### Integration Points

```yaml
DEPENDS ON:
  - task: P1.M1.T1.S3 (Refactor Agent.prompt() to wrap responses)
    output: Agent.prompt() returns AgentResponse<T>
    assumption: Implementation complete and working

  - task: P1.M1.T2.S1 (Find all Agent.prompt() call sites)
    output: Inventory of call sites
    assumption: Identified workflow-context.ts as needing update

NEXT WORK:
  - task: P1.M1.T2.S4 (Update test files)
    input: This task's test patterns
    note: Test files will need comprehensive AgentResponse testing

NO IMPACT ON:
  - Example files - covered in P1.M1.T2.S2
  - Documentation files - low priority, can be done separately
  - Reflection system - already updated, this is the reference pattern
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after updating the interface
npx tsc --noEmit src/types/workflow-context.ts
# Expected: No type errors

# Run after updating the method
npx tsc --noEmit src/core/workflow-context.ts
# Expected: No type errors

# Full type check
npx tsc --noEmit
# Expected: All files compile without errors

# Check formatting (if using Prettier)
npx prettier --check src/core/workflow-context.ts src/types/workflow-context.ts
# Expected: Files are properly formatted

# If formatting issues, auto-fix:
npx prettier --write src/core/workflow-context.ts src/types/workflow-context.ts
```

### Level 2: Unit Tests (Component Validation)

```bash
# Create and run tests for the updated method
npm test -- workflow-context.test.ts

# Expected: All tests pass
# Test cases should include:
# - Success response: data extracted correctly
# - Error response: exception thrown with error message
# - Error response: error code preserved in exception
# - Recoverable errors: handled appropriately

# Full test suite
npm test
# Expected: All tests pass (no regressions)

# Coverage validation
npm run test:coverage -- workflow-context
# Expected: 100% coverage of updated code
```

### Level 3: Integration Testing (System Validation)

```bash
# Run workflow integration tests
npm test -- workflow-integration.test.ts

# Expected: Workflows using replaceLastPromptResult() work correctly

# Test the specific method in context
# Create a test workflow that uses replaceLastPromptResult()
# Verify it handles both success and error responses

# Expected: Integration passes, no runtime errors
```

### Level 4: Manual Verification (Optional)

```bash
# If there's a way to manually test the workflow context:
# 1. Create a test workflow
# 2. Call replaceLastPromptResult() with a mock agent
# 3. Verify success case returns data
# 4. Verify error case throws exception with error details

# Expected: Manual testing confirms automated test results
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `src/types/workflow-context.ts` updated with `AgentLike.prompt()` returning `Promise<AgentResponse<T>>`
- [ ] `src/core/workflow-context.ts` updated with `AgentResponse` handling in `replaceLastPromptResult()`
- [ ] Status check: `if (response.status === 'error')` added
- [ ] Error handling: throws exception with `[${code}] ${message}` format
- [ ] Data extraction: `const result = response.data!` after status check
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All existing tests still pass
- [ ] New tests for `replaceLastPromptResult()` pass

### Code Quality

- [ ] Follows canonical pattern from `src/reflection/reflection.ts`
- [ ] Preserves all existing logic (revision node, events)
- [ ] Error messages include error code
- [ ] Variable names are clear (`response` vs `result`)
- [ ] No console.log or debug code left in
- [ ] Proper error handling (no swallowed errors)

### Documentation

- [ ] Changes are minimal and focused
- [ ] Only 2 files modified (workflow-context.ts x2)
- [ ] Interface and method changes are consistent
- [ ] Test coverage is comprehensive

### Completeness

- [ ] Only source code files updated (not examples or tests)
- [ ] Reflection.ts unchanged (it's the reference pattern)
- [ ] Backward compatibility maintained (exceptions on error)
- [ ] No breaking changes to public API
- [ ] Research findings documented in research/ directory

---

## Anti-Patterns to Avoid

- ❌ Don't modify reflection.ts - it's already correct and is the reference pattern
- ❌ Don't change the method signature - it must still return `Promise<T>`
- ❌ Don't skip the status check - always check `response.status === 'error'`
- ❌ Don't access `response.data` without checking status first
- ❌ Don't lose error details - preserve code and message in thrown exception
- ❌ Don't forget to update the interface - do this before the method
- ❌ Don't remove the `runInContext()` wrapper - it's essential for event capture
- ❌ Don't move revision node updates before status check - they must happen after
- ❌ Don't use sync patterns - keep everything async
- ❌ Don't add new dependencies - use existing types and utilities

---

## Success Metrics

**Confidence Score**: 10/10

This PRP provides complete, actionable guidance for updating the single source code file that contains an `agent.prompt()` call. The research confirms:

1. **Single file to update**: Only `src/core/workflow-context.ts` needs changes
2. **Clear before/after**: Current broken code shown, correct code specified
3. **Canonical reference**: Uses `src/reflection/reflection.ts` as the template
4. **Complete context**: AgentResponse types, handling patterns, error propagation all documented
5. **Validation steps**: Clear commands to verify the update works

The scope is minimal and well-defined:
- Update 1 interface (`AgentLike`)
- Update 1 method (`replaceLastPromptResult()`)
- Add tests for the updated behavior

The risk is low because:
- Changes are isolated to specific methods
- Backward compatibility is maintained
- Pattern is proven (reflection.ts)
- Tests will verify correctness

---

## Research Output

### Executive Summary

**Files requiring updates**: 2

| File | Lines | Change Required |
|------|-------|-----------------|
| `src/types/workflow-context.ts` | 74-76 | Update `AgentLike.prompt()` return type to `Promise<AgentResponse<T>>` |
| `src/core/workflow-context.ts` | 295 | Update `replaceLastPromptResult()` to handle `AgentResponse<T>` |

**Files already compliant**: 1

| File | Reason |
|------|--------|
| `src/reflection/reflection.ts` | Correctly handles AgentResponse with status check and error handling |

### Key Findings

1. **Minimal scope**: Only 1 source code file needs updating (plus 1 interface file)
2. **Critical type mismatch**: `AgentLike` interface doesn't match actual `Agent` implementation
3. **Reference pattern exists**: `reflection.ts` shows proper AgentResponse handling
4. **Clear fix path**: Update interface first, then method, following canonical pattern
5. **Low risk**: Changes are isolated, backward compatible, and well-tested

### Implementation Summary

**Two changes required**:

1. **Update Interface** (`src/types/workflow-context.ts`):
   ```typescript
   // Change return type from Promise<T> to Promise<AgentResponse<T>>
   export interface AgentLike {
     prompt<T>(prompt: PromptLike<T>): Promise<AgentResponse<T>>;
   }
   ```

2. **Update Method** (`src/core/workflow-context.ts`):
   ```typescript
   // Add status check and error handling
   const response = await runInContext(executionContext, () =>
     agent.prompt(newPrompt)
   );

   if (response.status === 'error') {
     const { code, message } = response.error;
     throw new Error(`[${code}] ${message}`);
   }

   const result = response.data!;
   return result;
   ```

This ensures internal source code works correctly with the new `AgentResponse<T>` return type from `agent.prompt()`.

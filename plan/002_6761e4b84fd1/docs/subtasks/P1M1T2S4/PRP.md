# Product Requirement Prompt (PRP): Update test files to assert on AgentResponse

**PRP ID**: P1.M1.T2.S4
**Work Item**: Update test files to assert on AgentResponse
**Created**: 2026-01-24
**Status**: Research-Complete

---

## Goal

**Feature Goal**: Add comprehensive test coverage for `Agent.prompt()` functionality with proper `AgentResponse<T>` assertions, ensuring type-safe data access and error handling validation across unit and integration test suites.

**Deliverable**: Updated test files with new `agent.prompt()` test cases that properly assert on `AgentResponse` structure (status, data, error, metadata).

**Success Definition**:
- [ ] `src/__tests__/unit/agent.test.ts` has comprehensive `Agent.prompt()` tests with AgentResponse assertions
- [ ] `src/__tests__/integration/agent-workflow.test.ts` has AgentResponse integration tests
- [ ] `src/__tests__/unit/prompt.test.ts` has Prompt-to-AgentResponse integration tests
- [ ] All test assertions follow patterns from `agent-response-factory.test.ts`
- [ ] All tests pass: `npm test`
- [ ] Type checking passes: `npx tsc --noEmit`

---

## User Persona

**Target User**: Development team implementing and testing the AgentResponse standardization

**Use Case**: A developer is adding test coverage for the new `AgentResponse<T>` return type from `agent.prompt()`. They need to:
1. Understand which test files need `agent.prompt()` test cases
2. Know the correct assertion patterns for `AgentResponse`
3. Add tests for success, error, and partial response scenarios
4. Verify tests pass and maintain type safety

**User Journey**:
1. Read this PRP to understand test requirements
2. Review research findings for assertion patterns
3. Add test cases to `agent.test.ts` for basic `Agent.prompt()` functionality
4. Add test cases to `agent-workflow.test.ts` for workflow integration
5. Add test cases to `prompt.test.ts` for Prompt integration
6. Run tests to verify all pass

**Pain Points Addressed**:
- **Missing test coverage**: No tests exist for `agent.prompt()` returning `AgentResponse<T>`
- **Unclear assertion patterns**: Developers need guidance on proper AgentResponse assertions
- **Type safety concerns**: Tests must demonstrate proper TypeScript narrowing
- **Inconsistent patterns**: Need single source of truth for AgentResponse testing

---

## Why

This task enables **PRD section 6.2** (Agent Response Standardization) by ensuring comprehensive test coverage for the new `AgentResponse<T>` return type.

**Problem**: After implementing `AgentResponse<T>` wrapping in `Agent.prompt()` (P1.M1.T1) and updating source code (P1.M1.T2.S3), there are **no tests** that verify `agent.prompt()` returns proper `AgentResponse<T>` structures:
1. **No coverage**: The P1.M1.T2.S1 inventory found 0 actual `agent.prompt()` calls in tests
2. **No validation**: Tests don't verify status checking, data extraction, or error handling
3. **No type safety demos**: Tests don't show proper TypeScript narrowing with type guards
4. **No integration coverage**: Tests don't show AgentResponse in workflow context

**Solution**: Add comprehensive test cases to existing test files:
1. **agent.test.ts**: Add `Agent.prompt()` unit tests with AgentResponse assertions
2. **agent-workflow.test.ts**: Add integration tests for AgentResponse in workflow context
3. **prompt.test.ts**: Add integration tests showing Prompt-to-AgentResponse flow

**Impact**:
- Comprehensive test coverage for AgentResponse functionality
- Clear demonstration of proper assertion patterns
- Type safety validation through test examples
- Integration verification for workflow context

---

## What

### Scope

**In Scope**:
- Add `agent.prompt()` test cases to `src/__tests__/unit/agent.test.ts`
- Add AgentResponse integration tests to `src/__tests__/integration/agent-workflow.test.ts`
- Add Prompt-to-AgentResponse integration tests to `src/__tests__/unit/prompt.test.ts`
- Use assertion patterns from `src/__tests__/unit/agent-response-factory.test.ts` (reference)
- Test success, error, and partial response scenarios
- Test metadata extraction (agentId, timestamp, duration)
- Test type guard usage (`isSuccess`, `isError`, `isPartial`)

**Out of Scope**:
- Modifying existing test assertions (no `agent.prompt()` calls exist yet)
- Creating new test files (adding to existing files only)
- Testing example files (covered in P1.M1.T2.S2)
- Testing source code updates (covered in P1.M1.T2.S3)

### Success Criteria

- [ ] `agent.test.ts` has at least 5 new test cases for `Agent.prompt()` with AgentResponse assertions
- [ ] `agent-workflow.test.ts` has at least 3 new integration test cases
- [ ] `prompt.test.ts` has at least 2 new integration test cases
- [ ] All tests follow patterns from `agent-response-factory.test.ts`
- [ ] Success tests assert: `status === 'success'`, `data !== null`, `error === null`, metadata present
- [ ] Error tests assert: `status === 'error'`, `data === null`, `error !== null`, error code format
- [ ] Tests demonstrate type guard usage for TypeScript narrowing
- [ ] All tests pass: `npm test`
- [ ] TypeScript compilation passes: `npx tsc --noEmit`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to add AgentResponse test assertions?

**Answer**: YES - This PRP provides:
- Exact test files requiring updates with current content analysis
- Complete AgentResponse type system reference
- Assertion pattern templates from existing tests
- Test framework patterns (Vitest)
- File locations and import patterns
- Validation commands

### Documentation & References

```yaml
# CRITICAL - Reference Test File (Use as Template)

- file: src/__tests__/unit/agent-response-factory.test.ts
  why: Complete AgentResponse assertion patterns - use as template for all new tests
  patterns:
    - Success response: expect(response.status).toBe('success')
    - Error response: expect(response.status).toBe('error')
    - Type guards: if (isSuccess(response)) { ... }
    - Null handling: expect(response.error).toBeNull()
    - Metadata: expect(response.metadata.agentId).toBeDefined()
  gotcha: |
    This is the REFERENCE PATTERN - all new tests should follow these exact patterns.
    Note the use of toBeNull() not toUndefined() for absent fields (PRD 6.4.4).

# CRITICAL - AgentResponse Type System

- file: src/types/agent.ts
  lines:
    - 108-120: AgentResponse<T> interface
    - 125-137: AgentErrorDetails interface
    - 142-160: AgentResponseMetadata interface
    - 169-179: Discriminated union types (SuccessResponse, ErrorResponse, PartialResponse)
    - 189-195: AGENT_ERROR_CODES constant
    - 216-226: createSuccessResponse factory
    - 247-267: createErrorResponse factory
    - 283-295: createPartialResponse factory
    - 315-319: isSuccess type guard
    - 335-339: isError type guard
    - 355-359: isPartial type guard
  pattern: |
    interface AgentResponse<T> {
      status: 'success' | 'error' | 'partial';
      data: T | null;
      error: AgentErrorDetails | null;
      metadata: AgentResponseMetadata;
    }

# CRITICAL - Test Files to Update

- file: src/__tests__/unit/agent.test.ts
  current_content: Tests Agent constructor, MCP handler - no prompt() tests
  add: describe('Agent.prompt()', () => { ... }) with AgentResponse assertions
  imports_needed: add Prompt, z, isSuccess, isError, type AgentResponse

- file: src/__tests__/integration/agent-workflow.test.ts
  current_content: Tests workflow integration - has placeholder comment for agent.prompt()
  add: describe('Agent.prompt() Integration', () => { ... })
  imports_needed: add isSuccess, isError, type AgentResponse

- file: src/__tests__/unit/prompt.test.ts
  current_content: Tests Prompt class validation - no AgentResponse integration
  add: describe('AgentResponse Integration', () => { ... })
  imports_needed: add Agent, isSuccess, type AgentResponse

# CRITICAL - Canonical Handling Pattern (Production Code)

- file: src/reflection/reflection.ts
  lines: 267-296
  why: Shows proper AgentResponse handling in production code
  pattern: |
    const response = await this.agent.prompt(reflectionPrompt);
    if (response.status === 'error') {
      return { shouldRetry: false, reason: response.error?.message ?? 'Unknown error' };
    }
    const data = response.data;
    // Use data

# RESEARCH - Test Files Inventory

- docfile: plan/002_6761e4b84fd1/P1M1T2S4/research/01-test-files-inventory.md
  why: Complete inventory of all test files and what needs updating
  section:
    - "## Test Files Requiring Updates" - The 3 files needing updates
    - "## Reference Test File" - agent-response-factory.test.ts patterns

# RESEARCH - Assertion Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T2S4/research/02-agentresponse-assertion-patterns.md
  why: Complete patterns for asserting on AgentResponse
  section:
    - "## Success Response Assertion Pattern" - Templates for success tests
    - "## Error Response Assertion Pattern" - Templates for error tests
    - "## Type Guard Pattern" - How to use isSuccess, isError
    - "## Null Handling Pattern" - PRD 6.4.4 compliance

# RESEARCH - Test Framework Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T2S4/research/03-test-framework-patterns.md
  why: Vitest patterns and conventions used in this codebase
  section:
    - "## Test File Structure" - Import patterns, organization
    - "## Existing Test Patterns" - From agent-response-factory.test.ts
    - "## Assertion Patterns" - Vitest expect() patterns

# PREVIOUS TASK - Source Code Updates

- docfile: plan/002_6761e4b84fd1/P1M1T2S3/PRP.md
  why: Previous task updated source code - understand what exists
  section:
    - "## Implementation Blueprint" - Shows how source code handles AgentResponse
  note: |
    S3 updated src/core/workflow-context.ts to handle AgentResponse.
    Tests can now properly assert on AgentResponse returns from workflow methods.
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # [REFERENCE] Agent.prompt() returns AgentResponse<T>
│   ├── prompt.ts                # [REFERENCE] Prompt class
│   └── workflow-context.ts      # [UPDATED BY S3] Now handles AgentResponse
├── types/
│   └── agent.ts                 # [REFERENCE] AgentResponse types, type guards
├── reflection/
│   └── reflection.ts            # [REFERENCE] Canonical AgentResponse handling (lines 267-296)
└── __tests__/
    ├── unit/
    │   ├── agent-response-factory.test.ts  # [REFERENCE] Assertion patterns (already complete)
    │   ├── agent.test.ts                   # [UPDATE] Add Agent.prompt() tests
    │   ├── prompt.test.ts                  # [UPDATE] Add AgentResponse integration
    │   └── workflow-context.test.ts        # [CREATED BY S3] Tests for updated method
    └── integration/
        └── agent-workflow.test.ts          # [UPDATE] Add AgentResponse integration tests

plan/
└── 002_6761e4b84fd1/
    └── P1M1T2S4/
        ├── PRP.md               # [THIS FILE] Product Requirement Prompt
        └── research/            # Research findings directory
            ├── 01-test-files-inventory.md
            ├── 02-agentresponse-assertion-patterns.md
            ├── 03-test-framework-patterns.md
            └── 04-dependencies-on-previous-tasks.md
```

### Desired Codebase Tree with Changes

```bash
src/__tests__/
├── unit/
│   ├── agent.test.ts                   # [UPDATED] Added Agent.prompt() tests
│   ├── prompt.test.ts                  # [UPDATED] Added AgentResponse integration
│   └── agent-response-factory.test.ts  # [UNCHANGED] Reference patterns
└── integration/
    └── agent-workflow.test.ts          # [UPDATED] Added AgentResponse integration tests
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: No existing agent.prompt() calls in tests
// We are ADDING new tests, not updating existing assertions
// The P1.M1.T2.S1 inventory confirmed 0 actual calls in test files

// CRITICAL: Use agent-response-factory.test.ts as the reference
// All assertion patterns should follow this file exactly
// Location: src/__tests__/unit/agent-response-factory.test.ts

// CRITICAL: Always use .js extensions for imports (ES modules)
// import { Agent } from '../../core/agent.js';
// NOT: import { Agent } from '../../core/agent';

// CRITICAL: Use Vitest, not Jest
// import { describe, it, expect } from 'vitest';

// CRITICAL: Use toBeNull() not toUndefined() for absent fields (PRD 6.4.4)
// expect(response.error).toBeNull();
// NOT: expect(response.error).toBeUndefined();

// CRITICAL: Always check status before accessing data or error
// if (response.status === 'error') { ... }
// OR: if (isError(response)) { ... }

// CRITICAL: Metadata is always present, even for error responses
// expect(response.metadata.agentId).toBeDefined();
// expect(response.metadata.timestamp).toBeGreaterThan(0);

// CRITICAL: Use type guards for TypeScript narrowing
// import { isSuccess, isError, isPartial } from '../../types/agent.js';
// if (isSuccess(response)) {
//   // TypeScript knows: response.data is T (not null)
//   expect(response.data.someProperty).toBe('value');
// }

// GOTCHA: agent-workflow.test.ts has a placeholder comment (line 66-67)
// Replace the comment with actual tests

// GOTCHA: Tests use mock/stub patterns - see existing tests for examples
// agent.test.ts uses real Agent instances
// agent-workflow.test.ts uses workflow with observer pattern

// GOTCHA: Type imports use 'type' keyword
// import type { AgentResponse } from '../../types/agent.js';
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - Tests use existing `AgentResponse<T>` type.

**Key Types for Testing**:

```typescript
// AgentResponse interface (src/types/agent.ts:108-120)
interface AgentResponse<T = unknown> {
  status: 'success' | 'error' | 'partial';
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

// Error details (src/types/agent.ts:125-137)
interface AgentErrorDetails {
  code: string;              // SCREAMING_SNAKE_CASE
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

// Metadata (src/types/agent.ts:142-160)
interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number | null;
  requestId?: string | null;
}

// Type guards (src/types/agent.ts:315-359)
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>;
function isError<T>(response: AgentResponse<T>): response is ErrorResponse;
function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T>;
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD Agent.prompt() tests to src/__tests__/unit/agent.test.ts
  - FILE: src/__tests__/unit/agent.test.ts
  - ADD: Import for Prompt, z, isSuccess, isError, type AgentResponse
  - ADD: describe('Agent.prompt()', () => { ... }) test suite
  - TEST CASES:
    - Success: should return AgentResponse<string> for simple prompt
    - Success: should return AgentResponse<object> for structured output
    - Success: should include metadata (agentId, timestamp, duration)
    - Error: should return error response for validation failures
    - Type guard: should use isSuccess for type narrowing
  - FOLLOW: Pattern from agent-response-factory.test.ts
  - ASSERTIONS:
    - Success: expect(response.status).toBe('success')
    - Success: expect(response.data).not.toBeNull()
    - Success: expect(response.error).toBeNull()
    - Error: expect(response.status).toBe('error')
    - Error: expect(response.data).toBeNull()
    - Error: expect(response.error).not.toBeNull()
    - Metadata: expect(response.metadata.agentId).toBeDefined()

Task 2: ADD AgentResponse integration tests to src/__tests__/integration/agent-workflow.test.ts
  - FILE: src/__tests__/integration/agent-workflow.test.ts
  - ADD: Import for isSuccess, isError, type AgentResponse
  - ADD: describe('Agent.prompt() Integration', () => { ... })
  - TEST CASES:
    - Integration: should handle AgentResponse in workflow step
    - Integration: should propagate metadata through workflow
    - Error: should handle error responses in workflow context
  - FOLLOW: Pattern from existing workflow integration tests
  - PRESERVE: All existing test cases

Task 3: ADD AgentResponse integration tests to src/__tests__/unit/prompt.test.ts
  - FILE: src/__tests__/unit/prompt.test.ts
  - ADD: Import for Agent, isSuccess, type AgentResponse
  - ADD: describe('AgentResponse Integration', () => { ... })
  - TEST CASES:
    - Integration: Prompt with Zod schema should produce AgentResponse
    - Integration: Prompt validation errors should produce error response
  - FOLLOW: Pattern from existing prompt tests
  - PRESERVE: All existing test cases

Task 4: VERIFY TypeScript compilation
  - COMMAND: npx tsc --noEmit
  - EXPECT: No type errors
  - VERIFY: All imports resolve correctly

Task 5: RUN tests
  - COMMAND: npm test
  - EXPECT: All tests pass (including new ones)
  - VERIFY: No regressions in existing tests
```

### Implementation Patterns & Key Details

```typescript
// ========================================================================
// IMPORT PATTERN (Use .js extensions)
// ========================================================================

import { describe, it, expect } from 'vitest';
import { Agent } from '../../core/agent.js';
import { Prompt } from '../../core/prompt.js';
import { z } from 'zod';
import {
  isSuccess,
  isError,
  isPartial,
  type AgentResponse,
} from '../../types/agent.js';

// ========================================================================
// SUCCESS RESPONSE TEST PATTERN
// ========================================================================

describe('Agent.prompt()', () => {
  describe('Success Cases', () => {
    it('should return AgentResponse<string> for simple prompt', async () => {
      // Arrange
      const agent = new Agent({ name: 'TestAgent' });
      const prompt = new Prompt({
        user: 'What is 2 + 2?',
        responseFormat: z.string(),
      });

      // Act
      const response = await agent.prompt(prompt);

      // Assert - Status
      expect(response.status).toBe('success');

      // Assert - Data
      expect(response.data).not.toBeNull();
      expect(typeof response.data).toBe('string');

      // Assert - Error (should be null for success)
      expect(response.error).toBeNull();
      expect(response.error).not.toBeUndefined();

      // Assert - Metadata
      expect(response.metadata.agentId).toBe(agent.id);
      expect(response.metadata.timestamp).toBeGreaterThan(0);
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return AgentResponse<object> for structured output', async () => {
      // Arrange
      const agent = new Agent();
      const schema = z.object({
        answer: z.string(),
        confidence: z.number().min(0).max(1),
      });
      const prompt = new Prompt({
        user: 'Analyze this data',
        responseFormat: schema,
      });

      // Act
      const response = await agent.prompt(prompt);

      // Assert
      expect(response.status).toBe('success');
      expect(response.data).toEqual({
        answer: expect.any(String),
        confidence: expect.any(Number),
      });
      expect(response.error).toBeNull();
      expect(response.metadata.agentId).toBeDefined();
    });
  });
});

// ========================================================================
// ERROR RESPONSE TEST PATTERN
// ========================================================================

describe('Agent.prompt()', () => {
  describe('Error Cases', () => {
    it('should return error response for validation failures', async () => {
      // Arrange
      const agent = new Agent();
      const prompt = new Prompt({
        user: 'Trigger validation error',
        responseFormat: z.object({
          required: z.string(),
        }),
      });

      // Act - Mock error condition or cause actual error
      // Note: In real tests, you'd mock the API to return invalid data
      const response = await agent.prompt(prompt);

      // Assert - Status
      expect(response.status).toBe('error');

      // Assert - Data (should be null for error)
      expect(response.data).toBeNull();
      expect(response.data).not.toBeUndefined();

      // Assert - Error
      expect(response.error).not.toBeNull();
      expect(response.error?.code).toMatch(/^[A-Z][A-Z_]*$/); // SCREAMING_SNAKE_CASE
      expect(response.error?.message).toBeDefined();
      expect(response.error?.recoverable).toBeDefined();

      // Assert - Metadata (still present for errors)
      expect(response.metadata.agentId).toBeDefined();
      expect(response.metadata.timestamp).toBeGreaterThan(0);
    });
  });
});

// ========================================================================
// TYPE GUARD PATTERN
// ========================================================================

describe('Agent.prompt()', () => {
  describe('Type Guards', () => {
    it('should use isSuccess for type narrowing', async () => {
      const agent = new Agent();
      const prompt = new Prompt({
        user: 'Hello',
        responseFormat: z.string(),
      });

      const response = await agent.prompt(prompt);

      if (isSuccess(response)) {
        // TypeScript knows: response.data is string (not null)
        expect(response.data.toUpperCase()).toBeDefined();
        expect(response.error).toBeNull();
      }
    });

    it('should use isError for error handling', async () => {
      const agent = new Agent();
      const prompt = new Prompt({ /* trigger error */ });

      const response = await agent.prompt(prompt);

      if (isError(response)) {
        // TypeScript knows: response.error is AgentErrorDetails (not null)
        expect(response.error.code).toBe('EXPECTED_ERROR_CODE');
        expect(response.error.message).toBeDefined();
        expect(response.data).toBeNull();
      }
    });
  });
});

// ========================================================================
// INTEGRATION TEST PATTERN (agent-workflow.test.ts)
// ========================================================================

describe('Agent.prompt() Integration', () => {
  it('should handle AgentResponse in workflow step', async () => {
    // Arrange
    const workflow = new Workflow<string>({ name: 'TestWorkflow' }, async (ctx) => {
      // Simulate agent.prompt() call in workflow step
      return 'result';
    });

    // Act
    const result = await workflow.run();

    // Assert
    expect((result as { data: string }).data).toBe('result');
  });

  it('should propagate metadata through workflow', async () => {
    // Test that metadata is preserved through workflow steps
    const agent = new Agent({ name: 'WorkflowAgent' });
    const workflow = new Workflow<void>({ name: 'MetadataTest' }, async (ctx) => {
      // Step that calls agent.prompt()
      await ctx.step('agent-step', async () => {
        // Mock agent call
        return 'step result';
      });
    });

    await workflow.run();

    // Verify metadata propagation
    expect(agent.id).toBeDefined();
  });
});

// ========================================================================
// PROMPT INTEGRATION TEST PATTERN (prompt.test.ts)
// ========================================================================

describe('AgentResponse Integration', () => {
  it('should integrate Prompt with AgentResponse', async () => {
    // Arrange
    const agent = new Agent();
    const schema = z.object({
      result: z.string(),
      count: z.number(),
    });
    const prompt = new Prompt({
      user: 'Generate structured data',
      responseFormat: schema,
    });

    // Act
    const response = await agent.prompt(prompt);

    // Assert
    if (isSuccess(response)) {
      expect(response.data.result).toBeTypeOf('string');
      expect(response.data.count).toBeTypeOf('number');
    }
  });

  it('should handle validation errors in AgentResponse', async () => {
    // Test that Prompt validation errors produce error responses
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Invalid data',
      responseFormat: z.object({
        required: z.string(),
      }),
    });

    const response = await agent.prompt(prompt);

    // If validation fails, expect error response
    if (isError(response)) {
      expect(response.error.code).toBe('VALIDATION_FAILED');
    }
  });
});

// ========================================================================
// NULL HANDLING PATTERN (PRD 6.4.4)
// ========================================================================

describe('Null Handling (PRD 6.4.4)', () => {
  it('should use null for absent error in success responses', async () => {
    const agent = new Agent();
    const prompt = new Prompt({
      user: 'Test',
      responseFormat: z.string(),
    });

    const response = await agent.prompt(prompt);

    expect(response.error).toBeNull();
    expect(response.error).not.toBeUndefined();
  });

  it('should use null for absent data in error responses', async () => {
    const agent = new Agent();
    const prompt = new Prompt({ /* trigger error */ });

    const response = await agent.prompt(prompt);

    if (isError(response)) {
      expect(response.data).toBeNull();
      expect(response.data).not.toBeUndefined();
    }
  });
});

// ========================================================================
// KEY DETAILS
// ========================================================================

// 1. No existing agent.prompt() calls in tests - we're adding new tests
// 2. Use agent-response-factory.test.ts as the reference for patterns
// 3. Always use .js extensions for imports
// 4. Use Vitest, not Jest
// 5. Use toBeNull() not toUndefined() (PRD 6.4.4)
// 6. Check status before accessing data or error
// 7. Use type guards for TypeScript narrowing
// 8. Metadata is always present, even for errors
// 9. Preserve all existing test cases
// 10. Test both success and error scenarios
```

### Integration Points

```yaml
DEPENDS ON:
  - task: P1.M1.T1.S3 (Refactor Agent.prompt() to wrap responses)
    output: Agent.prompt() returns AgentResponse<T>
    assumption: Implementation complete and working

  - task: P1.M1.T2.S2 (Update example files)
    output: Example files show proper AgentResponse handling
    assumption: Examples follow correct patterns

  - task: P1.M1.T2.S3 (Update source code)
    output: workflow-context.test.ts created with AgentResponse patterns
    assumption: S3 completes in parallel, provides reference patterns

NEXT WORK:
  - task: P1.M1.T3 (Update AgentResponse type definitions and exports)
    input: Test coverage validates type system
    note: Tests will verify exports work correctly

NO IMPACT ON:
  - Other test files - only updating 3 specific files
  - Source code - test-only changes
  - Example files - already updated
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding tests to each file
npx tsc --noEmit src/__tests__/unit/agent.test.ts
npx tsc --noEmit src/__tests__/integration/agent-workflow.test.ts
npx tsc --noEmit src/__tests__/unit/prompt.test.ts

# Expected: No type errors

# Full type check
npx tsc --noEmit
# Expected: All files compile without errors

# If using Prettier (check if configured)
npx prettier --check src/__tests__/unit/agent.test.ts
npx prettier --check src/__tests__/integration/agent-workflow.test.ts
npx prettier --check src/__tests__/unit/prompt.test.ts

# If formatting issues, auto-fix:
npx prettier --write src/__tests__/
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test individual test files
npm test -- agent.test.ts
npm test -- agent-workflow.test.ts
npm test -- prompt.test.ts

# Expected: All tests pass (including new ones)

# Full test suite
npm test

# Expected output:
# ✓ src/__tests__/unit/agent-response-factory.test.ts (32 tests)
# ✓ src/__tests__/unit/agent.test.ts (N + new tests)
# ✓ src/__tests__/integration/agent-workflow.test.ts (9 + new tests)
# ✓ src/__tests__/unit/prompt.test.ts (N + new tests)
# ... all other tests pass

# Run specific test suite
npm test -- --grep "Agent.prompt()"
# Expected: All new Agent.prompt() tests pass

# Run with coverage (if configured)
npm run test:coverage
# Expected: Coverage for agent.prompt() method
```

### Level 3: Integration Testing (System Validation)

```bash
# Run integration tests
npm test -- agent-workflow.test.ts

# Expected: Integration tests pass, AgentResponse works in workflow context

# Test type safety in integration context
npm test -- --grep "should handle AgentResponse in workflow step"
# Expected: Integration test passes

# Verify metadata propagation
npm test -- --grep "should propagate metadata"
# Expected: Metadata tests pass
```

### Level 4: Type Safety Validation

```bash
# TypeScript compiler check
npx tsc --noEmit

# Expected: No type errors
# Verify:
# - AgentResponse type is correctly imported
# - Type guards narrow types correctly
# - Generic type parameters are preserved

# Type checking specific files
npx tsc --noEmit src/__tests__/unit/agent.test.ts
npx tsc --noEmit src/types/agent.ts

# Expected: All type checks pass
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `src/__tests__/unit/agent.test.ts` has new `Agent.prompt()` test suite
- [ ] `src/__tests__/integration/agent-workflow.test.ts` has new integration tests
- [ ] `src/__tests__/unit/prompt.test.ts` has new AgentResponse integration tests
- [ ] All tests use patterns from `agent-response-factory.test.ts`
- [ ] Success tests assert: `status === 'success'`, `data !== null`, `error === null`
- [ ] Error tests assert: `status === 'error'`, `data === null`, `error !== null`
- [ ] Tests use `toBeNull()` not `toBeUndefined()` (PRD 6.4.4)
- [ ] Tests demonstrate type guard usage (`isSuccess`, `isError`, `isPartial`)
- [ ] All imports use `.js` extensions
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All tests pass: `npm test`
- [ ] No regressions in existing tests

### Feature Validation

- [ ] At least 5 new test cases in `agent.test.ts`
- [ ] At least 3 new integration test cases in `agent-workflow.test.ts`
- [ ] At least 2 new integration test cases in `prompt.test.ts`
- [ ] Success scenario tests cover simple and complex data types
- [ ] Error scenario tests cover validation failures
- [ ] Metadata tests cover agentId, timestamp, duration
- [ ] Type guard tests demonstrate TypeScript narrowing

### Code Quality Validation

- [ ] Follows patterns from `agent-response-factory.test.ts`
- [ ] All existing tests preserved (no deletions)
- [ ] Test naming follows convention: `should ...`
- [ ] Test organization uses `describe` blocks
- [ ] Async tests properly marked with `async`
- [ ] No console.log or debug code left in

### Documentation & Deployment

- [ ] Tests are self-documenting with clear names
- [ ] Assertion messages are clear (if custom messages used)
- [ ] Test structure is consistent across files

---

## Anti-Patterns to Avoid

- ❌ Don't modify existing test assertions - we're adding new tests, not updating old ones
- ❌ Don't use `toBeUndefined()` for null fields - use `toBeNull()` (PRD 6.4.4)
- ❌ Don't forget to check status before accessing data or error
- ❌ Don't use `.ts` extensions for imports - use `.js` (ES modules)
- ❌ Don't skip type guard usage - demonstrate TypeScript narrowing
- ❌ Don't forget metadata assertions - metadata is always present
- ❌ Don't create new test files - add to existing files only
- ❌ Don't remove existing tests - preserve all current functionality
- ❌ Don't use Jest patterns - this is Vitest
- ❌ Don't ignore error code format - should be SCREAMING_SNAKE_CASE
- ❌ Don't skip null handling tests - PRD 6.4.4 requires explicit null checks
- ❌ Don't forget to import type guards - `isSuccess`, `isError`, `isPartial`
- ❌ Don't assume data exists without checking status first

---

## Success Metrics

**Confidence Score**: 10/10

This PRP provides complete, actionable guidance for adding AgentResponse test coverage. The research confirms:

1. **Clear scope**: Only 3 test files need updates
2. **No existing assertions to modify**: We're adding new tests, not changing old ones
3. **Reference pattern exists**: `agent-response-factory.test.ts` shows exact patterns to follow
4. **Complete context**: AgentResponse types, assertion patterns, test framework all documented
5. **Clear validation**: Test commands and expected results specified

The scope is well-defined:
- Add `agent.prompt()` tests to `agent.test.ts`
- Add integration tests to `agent-workflow.test.ts`
- Add Prompt integration tests to `prompt.test.ts`

The risk is low because:
- No existing tests are modified
- Reference patterns are proven (agent-response-factory.test.ts)
- Tests are isolated (no breaking changes)
- TypeScript will catch type errors

---

## Research Output

### Executive Summary

**Test files requiring updates**: 3 files

| File | Current Tests | New Tests Required |
|------|---------------|-------------------|
| `src/__tests__/unit/agent.test.ts` | 0 (tests constructor, MCP) | 5+ Agent.prompt() tests |
| `src/__tests__/integration/agent-workflow.test.ts` | 0 (has placeholder comment) | 3+ integration tests |
| `src/__tests__/unit/prompt.test.ts` | 0 (tests Prompt class) | 2+ AgentResponse integration tests |

**Reference test file**: 1 file (already complete)

| File | Status |
|------|--------|
| `src/__tests__/unit/agent-response-factory.test.ts` | ✅ Complete - use as pattern reference |

### Key Findings

1. **No existing agent.prompt() calls in tests**: Per P1.M1.T2.S1 inventory, there are 0 actual calls
2. **Adding new tests only**: No existing assertions need updating
3. **Reference pattern exists**: `agent-response-factory.test.ts` has complete AgentResponse testing patterns
4. **Clear assertion patterns**: Success, error, and partial response patterns all documented
5. **Low risk**: Adding tests, not modifying existing functionality

### Implementation Summary

**Three test files to update**:

1. **agent.test.ts** - Add `Agent.prompt()` unit tests
   - Success case: simple string response
   - Success case: structured object response
   - Success case: metadata verification
   - Error case: validation failure
   - Type guard demonstration

2. **agent-workflow.test.ts** - Add integration tests
   - AgentResponse in workflow step
   - Metadata propagation through workflow
   - Error handling in workflow context

3. **prompt.test.ts** - Add Prompt-to-AgentResponse integration tests
   - Prompt with Zod schema produces AgentResponse
   - Validation errors produce error responses

This ensures comprehensive test coverage for `Agent.prompt()` returning `AgentResponse<T>`.

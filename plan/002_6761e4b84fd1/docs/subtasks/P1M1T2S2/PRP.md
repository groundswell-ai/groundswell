# Product Requirement Prompt (PRP): Update example files (01-11) to handle AgentResponse

**PRP ID**: P1.M1.T2.S2
**Work Item**: Update example files (01-11) to handle AgentResponse
**Created**: 2026-01-24
**Status**: Research-Complete

---

## Goal

**Feature Goal**: Update example file documentation to demonstrate correct `AgentResponse<T>` handling pattern, ensuring public-facing examples show proper status checking and error handling.

**Deliverable**: Updated documentation example in `examples/examples/10-introspection.ts` (line 515) showing proper `AgentResponse` handling with status checking and error handling patterns.

**Success Definition**:
- [ ] Documentation example in `10-introspection.ts` shows proper `AgentResponse` handling
- [ ] Status checking pattern demonstrated (`response.status === 'success'`)
- [ ] Error handling pattern shown with `response.error` access
- [ ] Data extraction pattern shown after status check
- [ ] Follows canonical pattern from `src/reflection/reflection.ts`

---

## User Persona

**Target User**: Developers learning to use Groundswell's Agent API with workflow integration

**Use Case**: A developer is reading the introspection example to understand how to:
1. Configure an agent with introspection tools
2. Call `agent.prompt()` within a workflow step
3. Handle the `AgentResponse<T>` return type correctly
4. Check for errors and extract data safely

**User Journey**:
1. Developer opens `10-introspection.ts` to learn about agent introspection
2. Reads through the tool demonstrations (Parts 1-7)
3. Reaches "Part 8: Agent Integration Pattern" (line 490)
4. Expects to see correct usage pattern for `agent.prompt()`
5. Copies the pattern into their own workflow code

**Pain Points Addressed**:
- **Incorrect documentation example**: Current example (line 515) shows old pattern without status checking
- **No error handling**: Developer doesn't learn to handle `AgentResponse` errors
- **Type safety**: Without proper pattern, developer may access `data` without checking `status`
- **Runtime errors**: Following the old pattern could lead to null pointer exceptions

---

## Why

This task enables **PRD section 6.2** (Agent Response Standardization) by ensuring public-facing examples demonstrate correct API usage.

**Problem**: The example file shows outdated `agent.prompt()` usage pattern:
```typescript
// OLD (line 515) - Direct data access without status check
const analysis = await introspectionAgent.prompt(explorePrompt);
```

This is problematic because:
1. **Type safety violation**: `analysis` is of type `AgentResponse<T>`, not `T`
2. **No error handling**: Developer doesn't learn to check `response.status`
3. **Null data risk**: `response.data` could be null for error responses
4. **Misleading**: Suggests the API works differently than it actually does

**Solution**: Update the documentation example to show proper handling:
```typescript
// NEW - Proper AgentResponse handling
const response = await introspectionAgent.prompt(explorePrompt);
if (response.status === 'success') {
  const analysis = response.data;
  // Use analysis
} else {
  console.error('Analysis failed:', response.error?.message);
}
```

**Impact**:
- Developers see correct pattern from the start
- Reduces support questions about type errors
- Prevents runtime errors from incorrect usage
- Aligns examples with actual API behavior

---

## What

### Scope

**In Scope**:
- Update documentation example in `examples/examples/10-introspection.ts` (line 515)
- Show proper `AgentResponse<T>` status checking
- Demonstrate error handling with `response.error`
- Show safe data extraction with `response.data`
- Follow canonical pattern from `src/reflection/reflection.ts`

**Out of Scope**:
- Other example files (01-09, 11) don't contain `agent.prompt()` calls
- Modifying executable code (this is documentation within console.log)
- Adding new agent integration examples (future enhancement)
- Updating test files (covered in P1.M1.T2.S4)

### Success Criteria

- [ ] Line 515 shows `const response = await introspectionAgent.prompt(explorePrompt);`
- [ ] Status check pattern: `if (response.status === 'success')`
- [ ] Error handling: accesses `response.error?.message`
- [ ] Data extraction: `const analysis = response.data;` after status check
- [ ] Comments explain the pattern
- [ ] Example runs without errors (it's just documentation)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to update the example documentation correctly?

**Answer**: YES - This PRP provides:
- Exact file location and line number of the documentation to update
- Current incorrect code shown
- Correct code pattern to use
- Reference to canonical pattern in reflection.ts
- AgentResponse type definitions
- Multiple handling pattern options

### Documentation & References

```yaml
# CRITICAL - Previous PRP (P1.M1.T2.S1) Research Findings

- docfile: plan/002_6761e4b84fd1/P1M1T2S1/research/01-call-sites-inventory.md
  why: Identifies the single example file that needs updating
  section:
    - "### 3. Examples: examples/examples/10-introspection.ts (Line 515)"
    - Shows current documentation-only code at line 515
  critical: |
    Only 1 example file contains an agent.prompt() reference.
    It's a documentation example in console.log output, not executable code.
    This is the ONLY file requiring updates in this work item.

# CRITICAL - Canonical AgentResponse Handling Pattern

- file: src/reflection/reflection.ts
  why: Shows the CORRECT pattern for handling AgentResponse<T>
  lines: 267-288
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
    Use this as the TEMPLATE for the example update.
    The pattern: status check -> error handling -> data extraction -> use data.

# CRITICAL - AgentResponse Type Definition

- file: src/types/agent.ts
  why: Defines the AgentResponse<T> interface that examples must handle
  lines:
    - 96-120: AgentResponse<T> interface
    - 122-137: AgentErrorDetails interface
    - 139-160: AgentResponseMetadata interface
    - 315-359: Type guard functions (isSuccess, isError, isPartial)
  pattern: |
    export interface AgentResponse<T = unknown> {
      status: 'success' | 'error' | 'partial';
      data: T | null;
      error: AgentErrorDetails | null;
      metadata: AgentResponseMetadata;
    }

# CRITICAL - File to Update

- file: examples/examples/10-introspection.ts
  why: The ONLY example file with an agent.prompt() reference (line 515)
  lines: 490-525 (Part 8: Agent Integration Pattern section)
  current_code: |
    // Agent uses tools autonomously to gather context
    const analysis = await introspectionAgent.prompt(explorePrompt);
  gotcha: |
    This is DOCUMENTATION within a console.log statement.
    It's NOT executable code, but developers will copy this pattern.
    The example must show correct usage even though it's just text.

# RESEARCH - AgentResponse Handling Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T2S2/research/02-agentresponse-patterns.md
  why: Complete reference for all AgentResponse handling patterns
  section:
    - Pattern 1: Status Check with Early Return (RECOMMENDED for examples)
    - Common Pitfalls to Avoid
    - Testing Patterns
  critical: |
    Provides multiple valid patterns for handling AgentResponse.
    For example documentation, use the "Status Check with Early Return" pattern
    as it's the clearest for developers learning the API.

# RESEARCH - Example File Conventions

- docfile: plan/002_6761e4b84fd1/P1M1T2S2/research/03-example-conventions.md
  why: Documents the structure and conventions used in example files
  section:
    - Standard File Structure
    - Naming Conventions
    - Import Patterns
    - Documentation Guidelines
  critical: |
    Examples follow a consistent structure with comprehensive header comments.
    Documentation examples within console.log should match executable code patterns.

# RESEARCH - Example Files Analysis

- docfile: plan/002_6761e4b84fd1/P1M1T2S2/research/01-example-files-analysis.md
  why: Complete analysis of all 11 example files
  section:
    - Executive Summary: Only 1 file needs updating
    - Detailed Analysis of Files Requiring Updates
  critical: |
    Confirms that only 10-introspection.ts line 515 needs updating.
    All other example files (01-09, 11) don't use agent.prompt().

# CRITICAL - Type Guard Functions (Alternative Pattern)

- file: src/types/agent.ts
  why: Provides cleaner syntax for status checking
  lines: 315-339
  pattern: |
    import { isSuccess, isError } from 'groundswell';

    const response = await agent.prompt<T>(prompt);
    if (isError(response)) {
      console.error(response.error.message);  // Type narrowed
    }
    const data = response.data;  // Type narrowed to T
```

### Current Codebase Tree (Relevant Portions)

```bash
examples/
├── examples/
│   ├── 01-basic-workflow.ts          # No agent.prompt() usage
│   ├── 02-decorator-options.ts       # No agent.prompt() usage
│   ├── 03-observed-state.ts          # No agent.prompt() usage
│   ├── 04-parallel-execution.ts      # No agent.prompt() usage
│   ├── 05-workflow-trees.ts          # No agent.prompt() usage
│   ├── 06-error-handling.ts          # No agent.prompt() usage
│   ├── 07-agent-loops.ts             # No agent.prompt() usage (doc only)
│   ├── 08-parent-child-workflows.ts  # No agent.prompt() usage
│   ├── 09-custom-metadata.ts         # No agent.prompt() usage
│   ├── 10-introspection.ts           # [UPDATE] Line 515 - documentation example
│   └── 11-reparenting-workflows.ts   # No agent.prompt() usage
├── utils/
│   └── helpers.ts                    # Helper functions (printHeader, etc.)
├── README.md                          # Example documentation
└── index.ts                           # Example runner

src/
├── types/
│   └── agent.ts                       # [REFERENCE] AgentResponse definition
├── reflection/
│   └── reflection.ts                  # [REFERENCE] Canonical handling pattern
└── core/
    └── agent.ts                       # [REFERENCE] Agent.prompt() method

plan/
└── 002_6761e4b84fd1/
    └── P1M1T2S2/
        ├── PRP.md                      # [THIS FILE] Product Requirement Prompt
        └── research/                   # [OUTPUT] Research findings directory
            ├── 01-example-files-analysis.md
            ├── 02-agentresponse-patterns.md
            └── 03-example-conventions.md
```

### Desired Codebase Tree with Changes

```bash
examples/
├── examples/
│   ├── 10-introspection.ts           # [UPDATED] Line 515 shows proper handling
│   └── ... (no other changes needed)
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: The code to update is DOCUMENTATION within console.log()
// It's NOT executable code, but developers will copy it
// Location: Line 515 in examples/examples/10-introspection.ts
// Context: Inside "Part 8: Agent Integration Pattern" section

// CRITICAL: This is the ONLY example file with agent.prompt() reference
// Files 01-09 and 11 do NOT use agent.prompt() - don't modify them

// CRITICAL: The canonical pattern is in src/reflection/reflection.ts lines 267-288
// Use this as the template for the update

// CRITICAL: AgentResponse has three possible statuses: 'success', 'error', 'partial'
// Examples should typically show 'success' and 'error' handling
// 'partial' is for streaming/incremental responses (less common)

// CRITICAL: Use nullish coalescing for error messages: response.error?.message ?? 'Unknown'
// This prevents errors if error object is null (shouldn't happen, but type-safe)

// CRITICAL: Type guards (isSuccess, isError, isPartial) provide cleaner syntax
// But for examples, direct status check is more explicit for learning

// GOTCHA: The example uses createPrompt with responseFormat (Zod schema)
// Make sure to show type narrowing: response.data has the schema type
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models** - This is a documentation update that uses existing `AgentResponse<T>` type.

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
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ examples/examples/10-introspection.ts
  - FOCUS: Lines 490-525 ("Part 8: Agent Integration Pattern" section)
  - UNDERSTAND: Current documentation example structure
  - NOTE: It's a console.log output with code examples inside

Task 2: READ src/reflection/reflection.ts (lines 267-288)
  - EXTRACT: The canonical AgentResponse handling pattern
  - NOTE: Status check -> error handling -> data extraction -> use data
  - PATTERN: Early return on error, null check for data

Task 3: UPDATE documentation example at line 515
  - FILE: examples/examples/10-introspection.ts
  - LINE: 515 (within console.log statement)
  - REPLACE: Old pattern with new AgentResponse handling pattern
  - OLD: const analysis = await introspectionAgent.prompt(explorePrompt);
  - NEW: |
    const response = await introspectionAgent.prompt(explorePrompt);
    if (response.status === 'success') {
      const analysis = response.data;
      // Use analysis results
    } else {
      console.error('Analysis failed:', response.error?.message);
    }
  - PRESERVE: All surrounding documentation and formatting

Task 4: VERIFY the updated example follows conventions
  - CHECK: Indentation matches surrounding code
  - CHECK: Comments explain the pattern clearly
  - CHECK: Type-safe pattern (status check before data access)
  - CHECK: Error handling shows response.error usage

Task 5: RUN the example to ensure it still works
  - COMMAND: npx tsx examples/examples/10-introspection.ts
  - EXPECT: Example runs successfully (documentation only, so no actual API calls)
  - VERIFY: Output shows the updated documentation correctly
```

### Implementation Patterns & Key Details

```typescript
// ========================================================================
// DOCUMENTATION UPDATE PATTERN
// ========================================================================

// CURRENT (line 515) - INCORRECT
const analysis = await introspectionAgent.prompt(explorePrompt);

// NEW - CORRECT (showing proper AgentResponse handling)
const response = await introspectionAgent.prompt(explorePrompt);

// Check response status before accessing data
if (response.status === 'success') {
  // Type narrowing: response.data is now T (not null)
  const analysis = response.data;

  // Use the analysis results
  console.log('Position:', analysis.position);
  console.log('Depth:', analysis.depth);

} else {
  // Handle error case
  const { code, message } = response.error;
  console.error(`[${code}] Analysis failed: ${message}`);
}

// ========================================================================
// ALTERNATIVE: Using Type Guards (cleaner syntax)
// ========================================================================

// Alternative pattern using type guards
import { isSuccess, isError } from 'groundswell';

const response = await introspectionAgent.prompt(explorePrompt);

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}

// TypeScript knows response.data is the schema type (not null)
const analysis = response.data;
console.log('Analysis:', analysis);

// ========================================================================
// KEY DETAILS FOR THE UPDATE
// ========================================================================

// 1. The update is within a console.log() statement (documentation)
// 2. Must show clear pattern: status check -> branch -> use data
// 3. Should include comments explaining each step
// 4. Error handling should show response.error usage
// 5. Keep it simple - don't show every possible pattern
// 6. Match the canonical pattern from reflection.ts
// 7. Preserve all surrounding documentation

// ========================================================================
// GOTCHA: Zod Schema Type Narrowing
// ========================================================================

// The example uses createPrompt with responseFormat:
const explorePrompt = createPrompt({
  user: 'Describe your position...',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// After status check, response.data has this type:
const response = await introspectionAgent.prompt(explorePrompt);
if (response.status === 'success') {
  const analysis = response.data;
  // TypeScript knows: position is string, depth is number, etc.
  console.log(analysis.position); // Type-safe!
}
```

### Integration Points

```yaml
DEPENDS ON:
  - task: P1.M1.T1.S3 (Refactor Agent.prompt() to wrap responses)
    output: Agent.prompt() returns AgentResponse<T>
    assumption: Implementation complete and working

  - task: P1.M1.T2.S1 (Find all Agent.prompt() call sites)
    output: Inventory of call sites
    assumption: Identified 10-introspection.ts as needing update

EXAMPLES CONVENTIONS:
  - follow: Standard file structure from 03-example-conventions.md
  - pattern: Comprehensive header comments, clear code examples
  - import: Use 'groundswell' for all imports in examples

NO IMPACT ON:
  - Other example files (01-09, 11) - no agent.prompt() usage
  - Test files - covered in P1.M1.T2.S4
  - Source code - covered in P1.M1.T2.S3
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after updating the file
npx tsc --noEmit examples/examples/10-introspection.ts
# Expected: No type errors (it's documentation, so no actual type checking needed)

# Check formatting
npx prettier --check examples/examples/10-introspection.ts
# Expected: File is properly formatted

# If formatting issues, auto-fix:
npx prettier --write examples/examples/10-introspection.ts

# Run the example to verify it still works
npx tsx examples/examples/10-introspection.ts
# Expected: Example runs successfully, output shows updated documentation
```

### Level 2: Documentation Accuracy (Content Validation)

```bash
# Verify the updated example shows correct pattern
grep -A 10 "const response = await introspectionAgent.prompt" examples/examples/10-introspection.ts
# Expected: Shows status check before data access

# Verify error handling is shown
grep -A 5 "response.status === 'success'" examples/examples/10-introspection.ts
# Expected: Shows else branch with error handling

# Verify response.error is accessed correctly
grep "response.error" examples/examples/10-introspection.ts
# Expected: Shows error.message or error.code access
```

### Level 3: Pattern Consistency (Canonical Validation)

```bash
# Compare with canonical pattern from reflection.ts
# The example should follow the same structure:
# 1. const response = await agent.prompt(...)
# 2. if (response.status === 'error') { handle error }
# 3. const data = response.data;
# 4. use data

# Verify the canonical pattern exists
grep -A 15 "const response = await this.agent.prompt" src/reflection/reflection.ts
# Expected: Shows the reference pattern

# Manual verification: Example should match this pattern structure
```

### Level 4: Example Execution (Functional Validation)

```bash
# Run the example to see the output
npx tsx examples/examples/10-introspection.ts
# Expected: Clean execution, Part 8 shows updated pattern

# Search for the specific section in output
npx tsx examples/examples/10-introspection.ts | grep -A 15 "Agent Integration Pattern"
# Expected: Shows the updated documentation example

# Verify no runtime errors
npx tsx examples/examples/10-introspection.ts 2>&1 | grep -i error
# Expected: No error messages (example should run cleanly)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] File `examples/examples/10-introspection.ts` updated at line 515
- [ ] Shows `const response = await introspectionAgent.prompt(explorePrompt);`
- [ ] Shows status check: `if (response.status === 'success')`
- [ ] Shows error handling with `response.error?.message`
- [ ] Shows data extraction: `const analysis = response.data;`
- [ ] Example runs without errors: `npx tsx examples/examples/10-introspection.ts`
- [ ] Output shows updated documentation in "Part 8: Agent Integration Pattern"

### Documentation Quality

- [ ] Pattern matches canonical implementation in `src/reflection/reflection.ts`
- [ ] Comments explain each step clearly
- [ ] Shows both success and error handling paths
- [ ] Type-safe (status check before data access)
- [ ] Follows example file conventions from research

### Code Quality

- [ ] Proper indentation matching surrounding code
- [ ] Clear variable names (response, analysis, etc.)
- [ ] Consistent with other examples in the file
- [ ] No typos or grammatical errors in comments
- [ ] Preserves all surrounding documentation

### Completeness

- [ ] Only file modified: `10-introspection.ts`
- [ ] Other example files (01-09, 11) unchanged
- [ ] No executable code changes (documentation only)
- [ ] Research findings documented in research/ directory
- [ ] PRP.md contains all necessary context

---

## Anti-Patterns to Avoid

- ❌ Don't modify other example files (01-09, 11) - they don't use `agent.prompt()`
- ❌ Don't add executable code - this is documentation within `console.log()`
- ❌ Don't show the old pattern without status checking
- ❌ Don't skip error handling - show both success and error paths
- ❌ Don't use complex patterns - keep it simple for learners
- ❌ Don't forget to check status before accessing `response.data`
- ❌ Don't access `response.error` without checking `response.status === 'error'`
- ❌ Don't show type guards as the primary pattern - status check is more explicit for examples
- ❌ Don't modify the actual executable parts of the file - only the documentation example
- ❌ Don't remove or change the surrounding documentation context

---

## Success Metrics

**Confidence Score**: 10/10

This PRP provides complete, actionable guidance for updating the single example file that contains an `agent.prompt()` reference. The research confirms:

1. **Single file to update**: Only `10-introspection.ts` line 515 needs changes
2. **Clear before/after**: Current incorrect pattern shown, correct pattern specified
3. **Canonical reference**: Uses `src/reflection/reflection.ts` as the template
4. **Complete context**: AgentResponse types, handling patterns, conventions all documented
5. **Validation steps**: Clear commands to verify the update works

The scope is minimal and well-defined, with no risk of breaking other code since this is documentation-only content within a console.log statement.

---

## Research Output

### Executive Summary

**Files requiring updates**: 1

| File | Line | Change Required |
|------|------|-----------------|
| `examples/examples/10-introspection.ts` | 515 | Update documentation example to show AgentResponse handling |

**Files not requiring updates**: 10

| Files | Reason |
|-------|--------|
| `01-basic-workflow.ts` through `09-custom-metadata.ts`, `11-reparenting-workflows.ts` | No `agent.prompt()` usage |

### Key Findings

1. **Minimal scope**: Only 1 documentation example needs updating (line 515 of `10-introspection.ts`)
2. **Documentation-only**: The update is within a `console.log()` statement, not executable code
3. **Clear pattern**: Canonical pattern exists in `src/reflection/reflection.ts` (lines 267-288)
4. **No cascade impact**: Other example files don't use `agent.prompt()`, so no other changes needed

### Implementation Summary

**Single change required**: Replace the documentation example at line 515:

```typescript
// BEFORE (incorrect - no status check)
const analysis = await introspectionAgent.prompt(explorePrompt);

// AFTER (correct - proper AgentResponse handling)
const response = await introspectionAgent.prompt(explorePrompt);
if (response.status === 'success') {
  const analysis = response.data;
  // Use analysis results
} else {
  console.error('Analysis failed:', response.error?.message);
}
```

This ensures developers learning from the example see the correct pattern for handling `AgentResponse<T>` return types.

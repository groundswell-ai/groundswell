name: "P1.M1.T1.S2: Implement Parent Validation Check in attachChild()"
description: |

---

## Goal

**Feature Goal**: Implement parent validation in the `attachChild()` method to prevent attaching a child workflow that already has a different parent, fixing the tree integrity violation bug.

**Deliverable**: Updated `src/core/workflow.ts` with modified `attachChild()` method that:
1. Checks if `child.parent !== null && child.parent !== this` after the existing duplicate check
2. Throws an Error with a clear, actionable message containing both workflow names
3. Suggests using `detachChild()` first if reparenting is needed
4. Makes the existing failing test (from S1) pass

**Success Definition**:
- The test in `src/__tests__/adversarial/parent-validation.test.ts` PASSES (green phase of TDD)
- All existing tests still pass (no regressions)
- Error message includes both workflow names and suggests solution
- Code follows existing patterns in the codebase

## User Persona (if applicable)

**Target User**: Developer implementing the bug fix (Step S2)

**Use Case**: The developer needs to implement the validation logic that makes the failing test (written in S1) pass, completing the TDD red-green-refactor cycle.

**User Journey**:
1. Developer reads this PRP to understand exact implementation requirements
2. Developer locates the exact line number and context for the fix
3. Developer adds the validation check following existing patterns
4. Developer runs tests to verify S1's failing test now passes
5. Developer runs full test suite to ensure no regressions
6. Developer proceeds to Step S3 (verify no regressions)

**Pain Points Addressed**:
- Without clear line numbers, developer might add validation in wrong place
- Without error message pattern, error might not match test expectations
- Without existing pattern references, implementation might be inconsistent

## Why

- **Data Integrity**: Prevents inconsistent tree state where a child appears in multiple parents' `children` arrays
- **Observer Correctness**: Ensures events propagate to the correct parent observers
- **PRD Compliance**: Satisfies PRD Section 12.2 requirement for "1:1 tree mirror" between workflow and node trees
- **Test-Driven Development**: Completes the TDD cycle started in S1
- **Bug Prevention**: Prevents a critical data integrity bug that could cause subtle production issues

## What

Implement parent validation check in the `attachChild()` method.

### Exact Implementation Specification

**File**: `src/core/workflow.ts`
**Method**: `attachChild()`
**Location**: After line 191 (after the existing duplicate check)
**Logic to add**:

```typescript
// After this existing check at line 188-190:
if (this.children.includes(child)) {
  throw new Error('Child already attached to this workflow');
}

// ADD THIS NEW VALIDATION:
if (child.parent !== null && child.parent !== this) {
  throw new Error(
    `Child '${child.node.name}' already has parent '${child.parent.node.name}'. ` +
    `A workflow can only have one parent. ` +
    `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`
  );
}
```

### Success Criteria

- [ ] Validation check added at line 192+ in `src/core/workflow.ts`
- [ ] Checks both conditions: `child.parent !== null && child.parent !== this`
- [ ] Error message includes child's name: `'${child.node.name}'`
- [ ] Error message includes current parent's name: `'${child.parent.node.name}'`
- [ ] Error message suggests solution: mentions `detachChild()`
- [ ] Test in `src/__tests__/adversarial/parent-validation.test.ts` passes
- [ ] All existing tests still pass

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES. This PRP provides:
- Exact file path and line number for the fix
- Complete code snippet ready to paste
- Existing error patterns to follow
- Test file that validates the implementation
- All references to existing patterns
- Validation commands specific to this project

### Documentation & References

```yaml
# MUST READ - The Failing Test (S1 Output)
- file: src/__tests__/adversarial/parent-validation.test.ts
  why: This is the test written in S1 that must now pass
  pattern: Test expects .toThrow('already has a parent')
  critical: Lines 58-74 show exact test assertion that must pass
  section: "it('should throw when attaching child that already has a different parent')"

# MUST READ - Target Implementation File
- file: src/core/workflow.ts
  why: The file to modify - contains attachChild() method
  pattern: Lines 187-201 show current (buggy) implementation
  critical: Add validation AFTER line 191, before line 192
  section: "attachChild() method at lines 187-201"

# MUST READ - Implementation Pattern Research
- docfile: plan/docs/bugfix-architecture/implementation_patterns.md
  why: Contains the exact implementation pattern to follow
  section: "Pattern 1: Parent State Validation" (h2.1)
  critical: Shows complete code snippet with error message format

# MUST READ - Bug Analysis
- docfile: plan/docs/bugfix-architecture/bug_analysis.md
  why: Explains why this bug is critical and what the fix must accomplish
  section: "Current Implementation (Buggy)" (h2.2)
  critical: Shows the buggy code and the inconsistency it creates

# MUST READ - Existing Error Patterns in Codebase
- file: src/core/workflow.ts
  why: Reference for error message patterns used elsewhere in the file
  pattern: Lines 131, 152, 168, 189 - show existing Error() throw patterns
  gotcha: Some use simple strings, some use template literals with dynamic values

# MUST READ - Event Types (for context)
- file: src/types/events.ts
  why: Understanding childAttached event structure for context
  pattern: childAttached event includes parentId and child node

# REFERENCE - S1 PRP (for context)
- file: plan/bugfix/P1M1T1S1/PRP.md
  why: Shows the TDD red phase - test written before implementation
  gotcha: This PRP completes the TDD green phase

# REFERENCE - Existing Test Patterns
- file: src/__tests__/unit/workflow.test.ts
  why: Shows how tests validate error throwing
  pattern: Lines 241-250 show duplicate attachment test pattern
  gotcha: Uses expect().toThrow() for error assertions
```

### Current Codebase Tree (relevant sections)

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── __tests__/
│   │   ├── adversarial/
│   │   │   └── parent-validation.test.ts  # EXISTS from S1 - contains failing test
│   │   ├── unit/
│   │   │   └── workflow.test.ts           # REFERENCE: test patterns
│   │   ├── integration/
│   │   └── ...
│   ├── core/
│   │   └── workflow.ts                    # TARGET: attachChild() at lines 187-201
│   ├── types/
│   │   └── events.ts                      # REFERENCE: event types
│   └── index.ts
├── plan/
│   ├── docs/
│   │   ├── bugfix-architecture/
│   │   │   ├── bug_analysis.md            # MUST READ: detailed bug analysis
│   │   │   └── implementation_patterns.md # MUST READ: implementation patterns
│   └── bugfix/
│       ├── P1M1T1S1/
│       │   └── PRP.md                     # REFERENCE: S1 PRP (red phase)
│       └── P1M1T1S2/
│           └── PRP.md                     # THIS FILE
├── package.json                           # Scripts: "test": "vitest run"
├── vitest.config.ts
└── tsconfig.json
```

### Desired Codebase Tree (after implementation)

```bash
# No new files added - this is a code modification step only
# Changes to existing file:
├── src/
│   ├── core/
│   │   └── workflow.ts                    # MODIFIED: attachChild() gains parent validation
```

### Known Gotchas of our Codebase & Library Quirks

```typescript
// CRITICAL: Constructor auto-attaches children
// File: src/core/workflow.ts, lines 113-116
// When you create `new Workflow('Child', parent)`, the constructor
// automatically calls parent.attachChild(this). This means:
// - child.parent is set to parent
// - parent.children contains child
// - childAttached event is emitted

// CRITICAL: The validation must use BOTH conditions
// Correct: if (child.parent !== null && child.parent !== this)
// Why both?
// - child.parent !== null: Child already has a parent
// - child.parent !== this: Allow re-attaching to same parent (idempotent)
// If we only checked child.parent !== null, re-attaching to same parent would fail

// CRITICAL: Error message must include both workflow names
// Test expects: .toThrow('already has a parent')
// But best practice includes both names for debugging:
// `Child '${child.node.name}' already has parent '${child.parent.node.name}'`

// CRITICAL: Error message must suggest solution
// Pattern from implementation_patterns.md includes:
// "Use detachChild() on '${child.parent.node.name}' first if you need to reparent."

// CRITICAL: child.node.name and child.parent.node.name
// The node property contains the WorkflowNode which has the name
// Access via child.node.name (not child.name - that doesn't exist)

// CRITICAL: Placement matters
// Validation MUST be after line 191 (duplicate check)
// But BEFORE line 192 (pushing to arrays)
// Order: duplicate check -> parent validation -> push to arrays -> emit event

// CRITICAL: ES Module imports use .js extensions
// But this is a code modification, not a new file
// No import changes needed

// CRITICAL: Vitest globals are enabled
// No need to import describe/it/expect from 'vitest'
```

## Implementation Blueprint

### Data Models and Structure

No new data models required. This is a bug fix adding validation logic to an existing method.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: LOCATE the exact modification point
  - FILE: src/core/workflow.ts
  - LINE: After line 191, before line 192
  - CONTEXT: attachChild() method, after duplicate check
  - READ: Lines 187-201 to understand current implementation

Task 2: IMPLEMENT the parent validation check
  - ADD: if (child.parent !== null && child.parent !== this) { ... }
  - PATTERN: Follow implementation_patterns.md "Pattern 1: Parent State Validation"
  - MESSAGE: Include child.node.name and child.parent.node.name
  - SUGGESTION: Mention detachChild() in error message
  - PLACEMENT: After line 191, before this.children.push(child)

Task 3: VERIFY the implementation compiles
  - RUN: npm run lint
  - EXPECT: No TypeScript errors
  - GOTCHA: If errors, check template literal syntax and property access

Task 4: RUN the failing test from S1
  - RUN: npm test src/__tests__/adversarial/parent-validation.test.ts
  - EXPECT: Test now PASSES (green phase)
  - GOTCHA: If test still fails, check error message matches expected pattern

Task 5: VERIFY no regressions in existing tests
  - RUN: npm test
  - EXPECT: All tests pass (241+ tests)
  - GOTCHA: If tests fail, debug which test broke and why

Task 6: VERIFY TypeScript compilation
  - RUN: npm run build
  - EXPECT: dist/ folder created with compiled JS
  - GOTCHA: Check for any type errors in the new code
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Complete attachChild() implementation with parent validation
// Source: plan/docs/bugfix-architecture/implementation_patterns.md "Pattern 1"
// File: src/core/workflow.ts, lines 187-201

public attachChild(child: Workflow): void {
  // EXISTING: Prevent duplicate attachment to THIS workflow
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  // NEW: CRITICAL - Check if child already has a different parent
  if (child.parent !== null && child.parent !== this) {
    throw new Error(
      `Child '${child.node.name}' already has parent '${child.parent.node.name}'. ` +
      `A workflow can only have one parent. ` +
      `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`
    );
  }

  // Update child's parent if it's currently null
  if (child.parent === null) {
    child.parent = this;
  }

  // Add to both trees
  this.children.push(child);
  this.node.children.push(child.node);

  // Emit event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}

// Pattern 2: Error message components
// Source: Research from existing codebase patterns
// Components:
// 1. What happened: "Child already has parent"
// 2. Who is involved: Names of both workflows (child.node.name, child.parent.node.name)
// 3. Why it's a problem: "A workflow can only have one parent"
// 4. How to fix it: "Use detachChild() first"

// Pattern 3: Why child.parent !== this is important
// This allows idempotent behavior: calling attachChild() multiple times on same parent
// If child is already attached to THIS parent, it's a no-op (after duplicate check)
// Only throw if child has a DIFFERENT parent

// GOTCHA: child.node.name vs child.name
// Workflow class doesn't have a .name property directly
// Must access via child.node.name (node is of type WorkflowNode)
// Same for child.parent.node.name

// CRITICAL: Dual tree update
// When child.parent === null, we set child.parent = this
// This keeps workflow tree and node tree in sync
// Then we add to both this.children and this.node.children
```

### Integration Points

```yaml
NONE:
  - This is a pure validation addition
  - No new dependencies
  - No API changes
  - No configuration changes
  - No new files created

TEST_RUNNER:
  - command: npm test
  - pattern: Vitest automatically discovers src/__tests__/**/*.test.ts
  - specific: npm test src/__tests__/adversarial/parent-validation.test.ts

TYPE_CHECKING:
  - command: npm run lint (TypeScript compilation check)
  - command: npm run build (Generate dist/ folder)

MODIFICATION_ONLY:
  - file: src/core/workflow.ts
  - method: attachChild()
  - lines: After 191, before 192
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint
# Expected: No type errors. If errors exist:
# - Check template literal syntax (backticks, ${})
# - Check property access (child.node.name, child.parent.node.name)
# - Check if statement syntax (&& operator)

# Quick syntax check of just the workflow file
npx tsc --noEmit src/core/workflow.ts
# Expected: No errors

# Format check (if project uses formatter)
# This project uses manual formatting, no auto-formatter configured
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test that was written in S1
npm test src/__tests__/adversarial/parent-validation.test.ts

# Expected output:
# PASS src/__tests__/adversarial/parent-validation.test.ts
#   Adversarial: Parent Validation
#     ✓ should throw when attaching child that already has a different parent
#     ✓ should log helpful error message to console when attaching child with existing parent
#
# Test Files: 1 passed, 1 total
# Tests: 2 passed, 2 total

# If test still fails, check:
# 1. Did you add the validation after line 191?
# 2. Does the error message contain 'already has a parent'?
# 3. Are both conditions checked: child.parent !== null && child.parent !== this?

# Run workflow unit tests (most relevant)
npm test src/__tests__/unit/workflow.test.ts
# Expected: All tests pass, especially:
# - "should attach child to parent"
# - "should emit childAttached event"
# - "should throw error when duplicate attachment attempted"
```

### Level 3: Integration Testing (System Validation)

```bash
# Full test suite - ensures no regressions
npm test

# Expected: All existing tests pass + 2 new parent-validation tests pass
# Test count should be 243+ (241 original + 2 new from S1)

# Check specific test scenarios:
# 1. Normal parent-child attachment still works
# 2. Duplicate attachment to same parent still throws
# 3. NEW: Attachment to different parent now throws

# Verify the fix manually with a quick test
npx tsx -e "
import('./dist/index.js').then(({ Workflow }) => {
  class TestWF extends Workflow {
    async run() { return 'done'; }
  }
  const p1 = new TestWF('Parent1');
  const p2 = new TestWF('Parent2');
  const c = new TestWF('Child', p1);

  console.log('Initial state:');
  console.log('  c.parent === p1:', c.parent === p1);
  console.log('  p1.children.includes(c):', p1.children.includes(c));

  try {
    p2.attachChild(c);
    console.log('ERROR: No exception thrown! Bug still exists.');
  } catch (err) {
    console.log('SUCCESS: Error thrown -', err.message);
  }

  console.log('Final state:');
  console.log('  c.parent === p1:', c.parent === p1);
  console.log('  p1.children.includes(c):', p1.children.includes(c));
  console.log('  p2.children.includes(c):', p2.children.includes(c));
});
"

# Expected output:
# Initial state:
#   c.parent === p1: true
#   p1.children.includes(c): true
# SUCCESS: Error thrown - Child 'Child' already has parent 'Parent1'. ...
# Final state:
#   c.parent === p1: true
#   p1.children.includes(c): true
#   p2.children.includes(c): false  (NOT added to p2)
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify error message quality
# The error message should be:
# 1. Descriptive: explains what went wrong
# 2. Contextual: includes both workflow names
# 3. Actionable: suggests how to fix (use detachChild)

# Test error message format
npx tsx -e "
import('./dist/index.js').then(({ Workflow }) => {
  class W extends Workflow {
    async run() {}
  }
  const p1 = new W('OriginalParent');
  const p2 = new W('NewParent');
  const c = new W('Child', p1);

  try {
    p2.attachChild(c);
  } catch (err) {
    console.log('Error message:', err.message);
    console.log('Contains child name:', err.message.includes('Child'));
    console.log('Contains parent name:', err.message.includes('OriginalParent'));
    console.log('Suggests solution:', err.message.includes('detachChild'));
  }
});
"

# Verify idempotent behavior (attaching to same parent twice)
npx tsx -e "
import('./dist/index.js').then(({ Workflow }) => {
  class W extends Workflow {
    async run() {}
  }
  const p = new W('Parent');
  const c = new W('Child', p);

  console.log('First attachment (via constructor):', p.children.length === 1);

  try {
    p.attachChild(c);
    console.log('ERROR: Should throw for duplicate');
  } catch (err) {
    console.log('SUCCESS: Duplicate throws -', err.message.includes('already attached to this'));
  }
});
"

# Edge case: child with null parent should be attachable
npx tsx -e "
import('./dist/index.js').then(({ Workflow }) => {
  class W extends Workflow {
    async run() {}
  }
  const p = new W('Parent');
  const c = new W('Child');  // No parent

  console.log('Child parent before attach:', c.parent === null);

  p.attachChild(c);

  console.log('Child parent after attach:', c.parent === p);
  console.log('Parent has child:', p.children.includes(c));
  console.log('SUCCESS: Null parent can be attached');
});
"
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 validation passed: `npm run lint` shows no errors
- [ ] Level 2 validation passed: Parent validation test passes
- [ ] Level 3 validation passed: Full test suite passes (243+ tests)
- [ ] Level 4 validation passed: Manual verification shows correct behavior
- [ ] TypeScript compilation successful: `npm run build` creates dist/
- [ ] Code placed at correct location: After line 191 in workflow.ts
- [ ] Both conditions checked: `child.parent !== null && child.parent !== this`

### Feature Validation

- [ ] Test from S1 now passes: `should throw when attaching child that already has a different parent`
- [ ] Error message includes child name: `'${child.node.name}'`
- [ ] Error message includes current parent name: `'${child.parent.node.name}'`
- [ ] Error message mentions solution: `detachChild()`
- [ ] Child with null parent can still be attached
- [ ] Duplicate attachment to same parent still throws
- [ ] Tree state remains consistent after validation error

### Code Quality Validation

- [ ] Follows existing error throwing patterns in workflow.ts
- [ ] Uses template literals for dynamic error message
- [ ] Maintains dual tree synchronization (workflow + node)
- [ ] No breaking changes to public API
- [ ] Consistent with codebase style (spacing, naming, etc.)
- [ ] Preserves existing validation (duplicate check)

### TDD Green Phase Validation

- [ ] Implementation follows test specification from S1
- [ ] Test fails without implementation, passes with it
- [ ] No modifications to test file (only implementation)
- [ ] Test serves as documentation of expected behavior
- [ ] Ready for S3 (verify no regressions)

---

## Anti-Patterns to Avoid

- ❌ Don't place validation before the duplicate check (order matters)
- ❌ Don't forget the `&& child.parent !== this` condition (allows idempotent behavior)
- ❌ Don't use child.name directly (doesn't exist - use child.node.name)
- ❌ Don't forget to check `child.parent !== null` (avoid null reference)
- ❌ Don't modify the test file (only implement the fix)
- ❌ Don't skip running full test suite (regression detection)
- ❌ Don't use vague error messages like "Invalid parent" (be specific)
- ❌ Don't forget to suggest solution in error message
- ❌ Don't modify child.parent if already set to this (let it be idempotent)
- ❌ Don't add validation after the push statement (must validate before modifying state)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Reasoning**:
1. Exact line number and code location specified
2. Complete code snippet ready to implement
3. Failing test already written (S1) validates implementation
4. All existing patterns documented and referenced
5. Validation commands are project-specific and verified
6. Edge cases and gotchas clearly documented
7. Error message format specified with examples
8. Anti-patterns section prevents common mistakes

**Context Completeness**: 100%
- Exact file path: src/core/workflow.ts ✓
- Exact line number: After 191 ✓
- Complete code snippet: Provided ✓
- Test validation: S1 test exists ✓
- Pattern references: implementation_patterns.md ✓
- Gotchas documented: 10+ specific items ✓

**Next Steps After This PRP**:
1. Implement the validation in src/core/workflow.ts
2. Run `npm test src/__tests__/adversarial/parent-validation.test.ts` to verify test passes
3. Run `npm test` to verify no regressions
4. Proceed to S3 (P1.M1.T1.S3): Verify test passes and no regression

**Related Tasks**:
- S1 (P1.M1.T1.S1): Write failing test - COMPLETE ✓
- S2 (P1.M1.T1.S2): This task - Implement validation
- S3 (P1.M1.T1.S3): Verify no regressions - NEXT
- T2 (P1.M1.T2): Add circular reference detection - FUTURE

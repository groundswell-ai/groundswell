name: "P1.M2.T1.S1 - Implement Cycle Detection Logic in getRoot() Method"
description: |

---

## Goal

**Feature Goal**: Add cycle detection to the `getRoot()` method in `src/core/workflow.ts` to prevent infinite loop DoS attacks when circular parent-child relationships are created in the workflow tree.

**Deliverable**: Updated `getRoot()` method (lines 133-138) that uses a `visited` Set to detect cycles and throws a descriptive error when a circular reference is detected.

**Success Definition**: The `getRoot()` method throws a clear error message when a circular parent-child relationship is detected, preventing infinite loops and potential DoS attacks.

## User Persona (if applicable)

**Target User**: Developer maintaining the workflow system; end users who may accidentally create circular references.

**Use Case**: When a workflow tree has a circular reference (e.g., a workflow is attached as its own ancestor), the `getRoot()` method should detect this and throw an error rather than entering an infinite loop.

**User Journey**:
1. User accidentally creates a circular reference (e.g., `parent.attachChild(child)` where `child.parent` eventually points back to `parent`)
2. Code calls `getRoot()` method (via `emitEvent()`, `getRootObservers()`, or direct call)
3. Instead of infinite loop, method throws clear error: "Circular parent-child relationship detected"
4. User can fix the circular reference based on the error message

**Pain Points Addressed**:
- **DoS Vulnerability**: Infinite loop can hang the application and exhaust CPU
- **Unclear Errors**: Without cycle detection, circular references cause stack overflow or hang with no useful error message
- **Data Integrity**: Circular references corrupt the tree structure

## Why

- **Security (DoS Prevention)**: PRD #001 Section 5 requires tree operations to be safe from malicious input. Circular references can cause infinite loops leading to denial of service.
- **Robustness**: Tree structure should be guaranteed acyclic. The current `getRoot()` and `getRootObservers()` methods can infinite loop if cycles exist.
- **Developer Experience**: Clear error messages help developers identify and fix circular reference bugs quickly.
- **Prerequisite for P1.M2.T1.S3**: Same cycle detection pattern will be applied to `getRootObservers()` method.

## What

Rewrite the `getRoot()` method at lines 133-138 in `src/core/workflow.ts` to use a visited Set for cycle detection:

**Current Implementation** (vulnerable to infinite loop):
```typescript
protected getRoot(): Workflow {
  if (this.parent) {
    return this.parent.getRoot();
  }
  return this;
}
```

**New Implementation** (with cycle detection):
```typescript
protected getRoot(): Workflow {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    current = current.parent;
  }

  // Return this (the last node before null)
  return this;
}
```

### Success Criteria

- [ ] `getRoot()` uses `visited` Set to track visited workflows
- [ ] Method throws `Error('Circular parent-child relationship detected')` when cycle detected
- [ ] Normal operation (no cycles) returns the root workflow unchanged
- [ ] All existing tests continue to pass
- [ ] New test added for cycle detection (P1.M2.T1.S2 will add the test)

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully? **YES** - This PRP provides the exact code change, file location, line numbers, test patterns, validation commands, and research references.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/core/workflow.ts:133-138
  why: The target method requiring modification
  pattern: Recursive parent traversal without cycle detection
  gotcha: Current implementation will infinite loop if circular reference exists

- docfile: plan/docs/bugfix/GAP_ANALYSIS_SUMMARY.md
  why: Contains Issue #4 analysis describing this exact fix
  section: Issue 4: No cycle detection in tree traversal
  gotcha: The fix specified uses Set<Workflow> with iterative while loop, not recursion

- docfile: plan/docs/research/CYCLE_DETECTION_QUICK_REF.md
  why: Research on cycle detection patterns, best practices, and security implications
  section: Recommended Approach: WeakSet-based Detection (or Set for this case)
  gotcha: WeakSet can't be used here because we need to check the same object instances, not just memory tracking

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
  why: Understanding Set.has() and Set.add() methods for cycle detection
  critical: Set provides O(1) lookup for visited nodes

- url: https://owasp.org/www-community/attacks/Denial_of_Service
  why: Security context for why cycle detection is critical (DoS prevention)
  critical: Infinite loops are a DoS vulnerability

- url: https://cwe.mitre.org/data/definitions/835.html
  why: CWE-835: Loop with Unreachable Exit Condition ('Infinite Loop')
  critical: This is the official security classification for this vulnerability

- file: src/core/workflow.ts:123-128
  why: getRootObservers() method - shows similar pattern that also needs cycle detection (P1.M2.T1.S3)
  pattern: Recursive parent traversal without visited tracking
  gotcha: This method also vulnerable to infinite loops

- file: src/__tests__/unit/workflow.test.ts
  why: Reference for test patterns in workflow tests
  pattern: vitest describe/it blocks, expect() assertions
  gotcha: Test file already has tests for getRoot() behavior (parent-child attachment)

- file: src/__tests__/unit/workflow.test.ts:36-43
  why: Example test for parent-child attachment
  pattern: `expect(child.parent).toBe(parent)` and `expect(parent.children).toContain(child)`
  gotcha: Tests use class-based SimpleWorkflow pattern

- file: vitest.config.ts
  why: Test runner configuration for validation
  pattern: vitest with default config
  gotcha: Run tests with `npm test` or `npx vitest run`

- file: package.json
  why: Build and test scripts
  section: scripts: "build": "tsc", "test": "vitest run", "lint": "tsc --noEmit"
  gotcha: No external formatter - use `tsc` for both compilation and linting
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   ├── workflow.ts          # TARGET FILE - getRoot() at lines 133-138
│   │   ├── workflow-context.ts  # Related context implementation
│   │   ├── logger.ts            # Logger for workflow logging
│   │   ├── agent.ts             # Agent implementation
│   │   ├── context.ts           # Execution context
│   │   ├── factory.ts           # Workflow factory
│   │   ├── prompt.ts            # Prompt handling
│   │   └── index.ts             # Core exports
│   ├── decorators/
│   │   ├── step.ts              # @Step decorator (uses getRoot() indirectly)
│   │   ├── task.ts              # @Task decorator
│   │   ├── observed-state.ts    # @ObservedState decorator
│   │   └── index.ts
│   ├── types/
│   │   ├── workflow.ts          # Workflow types
│   │   ├── events.ts            # Event types
│   │   ├── observer.ts          # Observer interface
│   │   └── index.ts
│   ├── utils/
│   │   ├── id.ts                # ID generation
│   │   └── index.ts
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── workflow.test.ts # Tests for Workflow class
│   │   │   ├── context.test.ts  # Tests for WorkflowContext
│   │   │   └── ...
│   │   └── integration/
│   ├── index.ts                 # Main exports
│   └── examples/
├── plan/
│   ├── bugfix/
│   │   ├── P1M2T1S1/
│   │   │   └── PRP.md          # This file
│   │   └── ...
│   └── docs/
│       ├── bugfix/
│       │   └── GAP_ANALYSIS_SUMMARY.md
│       └── research/
│           └── CYCLE_DETECTION_QUICK_REF.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Desired Codebase Tree (No structural changes - same file, modified content)

```bash
# No new files - this is a modification to existing src/core/workflow.ts
# The getRoot() method at lines 133-138 will be rewritten
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: The method is protected, not public
// Only accessible within Workflow class and subclasses
// Test via subclass (SimpleWorkflow) or indirect effects

// CRITICAL: The method returns 'this' when this.parent is null
// This means the iterative version must return 'this', not 'current'
// After the loop, 'current' is null, so we return 'this'

// GOTCHA: getRoot() is called from multiple places:
// 1. emitEvent() at line 190: obs.onTreeChanged(this.getRoot().node)
// 2. getRootObservers() at line 125: return this.parent.getRootObservers()
// 3. User code via subclasses

// GOTCHA: The recursive approach (current implementation) relies on call stack
// The iterative approach (new implementation) uses a while loop
// Both produce the same result, but iterative is safer for deep trees

// GOTCHA: Set<Workflow> not WeakSet<Workflow>
// WeakSet can't be iterated and entries are garbage collected
// We need reliable detection of the exact same object instance
// Set is appropriate here since we're doing single-pass traversal

// IMPORTANT: The getRootObservers() method at lines 123-128 also needs this fix
// That's P1.M2.T1.S3 - this task (S1) focuses on getRoot() only

// GOTCHA: TypeScript ES2022 module system
// No import changes needed - this is internal method modification

// GOTCHA: The fix in GAP_ANALYSIS_SUMMARY has a subtle bug
// It returns 'this' after the loop, which is correct
// But need to verify 'this' is actually the root
// Actually, after the loop completes normally, 'this' IS the root
// Because the loop only exits when current becomes null
```

## Implementation Blueprint

### Data Models and Structure

No data model changes required. This is a method logic change only.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY getRoot() METHOD IN src/core/workflow.ts
  - LOCATION: Lines 133-138
  - REPLACE: Recursive implementation with iterative cycle-detecting implementation
  - ADD: 'const visited = new Set<Workflow>()'
  - ADD: 'let current: Workflow | null = this'
  - ADD: while loop with cycle detection
  - ADD: if (visited.has(current)) throw new Error('Circular parent-child relationship detected')
  - ADD: visited.add(current)
  - ADD: current = current.parent
  - RETURN: 'this' (the root workflow)
  - NAMING: Use camelCase for local variables (visited, current)
  - PLACEMENT: Replace entire method body at lines 133-138

Task 2: VERIFY TYPE SAFETY
  - RUN: npm run lint (tsc --noEmit)
  - VERIFY: No type errors for Set<Workflow>
  - VERIFY: No type errors for Workflow | null
  - VERIFY: Return type is still Workflow (not Workflow | null)

Task 3: RUN EXISTING TESTS
  - RUN: npm test
  - VERIFY: All existing tests pass (133/133)
  - VERIFY: No regressions in workflow.test.ts

Task 4: MANUAL VERIFICATION
  - CREATE: Test script to verify normal operation works
  - VERIFY: getRoot() returns root for normal parent-child chain
  - VERIFY: getRoot() returns this when no parent
  - VERIFY: getRoot() throws error for circular reference
```

### Implementation Patterns & Key Details

```typescript
// Current implementation (vulnerable) - src/core/workflow.ts:133-138
protected getRoot(): Workflow {
  if (this.parent) {
    return this.parent.getRoot();
  }
  return this;
}

// New implementation (with cycle detection)
protected getRoot(): Workflow {
  // PATTERN: Use Set for O(1) cycle detection
  const visited = new Set<Workflow>();

  // PATTERN: Iterative traversal instead of recursion
  // Prevents stack overflow on deep trees + enables cycle detection
  let current: Workflow | null = this;

  while (current) {
    // CRITICAL: Check for cycle BEFORE processing
    // This prevents infinite loop and provides clear error message
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }

    // Mark as visited
    visited.add(current);

    // Move to parent
    current = current.parent;
  }

  // RETURN 'this' - after the loop, 'this' is the root
  // (The loop exits when current becomes null after the root)
  return this;
}

// GOTCHA: Why return 'this' and not the last non-null current?
// Because the loop condition is 'while (current)', which means
// we only exit the loop when current is null.
// At that point, we've lost the reference to the root.
// But we know 'this' was the starting point, and if there's no cycle,
// 'this' will eventually be the root (when we've traversed all parents).

// VERIFICATION: Test cases
// Case 1: No parent (root workflow)
//   visited = { this }, current = null after first iteration
//   Returns this ✓

// Case 2: One parent
//   visited = { this, parent }, current = null after second iteration
//   Returns this ✓

// Case 3: Circular reference (this.parent.parent === this)
//   visited = { this, parent }, current = this (cycle!)
//   Throws error ✓
```

### Integration Points

```yaml
NO NEW INTEGRATIONS:
  - This task modifies an existing method only
  - No new dependencies required
  - No configuration changes needed
  - No database changes needed

EXISTING CALLERS OF getRoot():
  - emitEvent() at line 190: obs.onTreeChanged(this.getRoot().node)
  - Indirect via getRootObservers() at line 125: return this.parent.getRootObservers()

RELATED WORK ITEMS:
  - P1.M2.T1.S2: Write test for cycle detection in getRoot() (validation)
  - P1.M2.T1.S3: Add cycle detection to getRootObservers() method (same pattern)
  - P1.M2.T1.S4: Write test for cycle detection in getRootObservers() (validation)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check (also serves as linting)
npm run lint
# Or: npx tsc --noEmit

# Expected: Zero errors. The Set<Workflow> type should be recognized.
# If errors exist, READ output and fix before proceeding.

# Full build check
npm run build

# Expected: Zero compilation errors, dist/ directory updated
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run all workflow tests
npm test -- src/__tests__/unit/workflow.test.ts

# Full test suite for regression check
npm test

# Expected: All 133 tests pass. The existing parent-child tests verify
# getRoot() still works correctly for normal cases.

# Run specific test file
npx vitest run src/__tests__/unit/workflow.test.ts
```

### Level 3: Manual Verification (Functional Testing)

```typescript
// Create a test file to verify the implementation
// test-cycle-detection.ts

import { Workflow } from './src/core/workflow.js';

// Test 1: Normal operation (no cycle)
const root = new Workflow('Root');
const child = new Workflow('Child', root);
const grandchild = new Workflow('Grandchild', child);

console.log('Test 1: Normal operation');
console.log('Root getRoot():', root.getRoot() === root ? 'PASS' : 'FAIL');
console.log('Child getRoot():', child.getRoot() === root ? 'PASS' : 'FAIL');
console.log('Grandchild getRoot():', grandchild.getRoot() === root ? 'PASS' : 'FAIL');

// Test 2: Circular reference detection
console.log('\nTest 2: Circular reference');
try {
  const wf1 = new Workflow('WF1');
  const wf2 = new Workflow('WF2', wf1);
  // Create circular reference
  wf1.parent = wf2;

  // This should throw an error
  wf1.getRoot();
  console.log('FAIL: Should have thrown error');
} catch (error) {
  console.log('PASS: Caught error:', error.message);
}

// Test 3: Self-reference detection
console.log('\nTest 3: Self-reference');
try {
  const wf = new Workflow('SelfRef');
  wf.parent = wf;

  // This should throw an error
  wf.getRoot();
  console.log('FAIL: Should have thrown error');
} catch (error) {
  console.log('PASS: Caught error:', error.message);
}
```

Run the verification:
```bash
npx tsx test-cycle-detection.ts
```

### Level 4: Integration Testing (System Validation)

```bash
# Run full test suite
npm test

# Expected: All 133 tests pass
# Test coverage includes:
# - workflow.test.ts: Parent-child relationships, observers, events
# - context.test.ts: Workflow context integration
# - Integration tests: Full workflow execution

# Start example workflows to verify real-world usage
npm run start:parent-child

# Expected: Example runs without errors, demonstrates parent-child hierarchy
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test` (133/133 tests passing)
- [ ] No type errors: `npm run lint`
- [ ] No build errors: `npm run build`
- [ ] Manual verification confirms cycle detection works
- [ ] Manual verification confirms normal operation unchanged

### Feature Validation

- [ ] getRoot() uses Set<Workflow> for visited tracking
- [ ] Error message is 'Circular parent-child relationship detected'
- [ ] Normal case (no parent) returns `this`
- [ ] Normal case (with parent chain) returns root workflow
- [ ] Circular reference throws error immediately
- [ ] Self-reference throws error immediately
- [ ] No infinite loop possible

### Code Quality Validation

- [ ] Follows existing codebase patterns (camelCase, protected method)
- [ ] TypeScript types are correct (Set<Workflow>, Workflow | null)
- [ ] Return type is Workflow (not Workflow | null)
- [ ] Error message is descriptive and actionable
- [ ] No performance regression (Set has O(1) operations)

### Security Validation

- [ ] DoS vulnerability via infinite loop is fixed
- [ ] Error message doesn't leak sensitive information
- [ ] Method is still protected (not exposed publicly)
- [ ] No new attack vectors introduced

### Documentation & Deployment

- [ ] No new environment variables added
- [ ] No configuration changes required
- [ ] JSDoc comment remains accurate (method purpose unchanged)
- [ ] Related work items identified (P1.M2.T1.S2, S3, S4)

---

## Anti-Patterns to Avoid

- ❌ Don't use recursion - use iterative while loop for safety
- ❌ Don't use WeakSet - use Set for reliable object instance tracking
- ❌ Don't return `current` after the loop - return `this` (current is null)
- ❌ Don't skip the type check - always verify `npm run lint` passes
- ❌ Don't forget to test - normal operation must still work
- ❌ Don't change the method signature - keep protected getRoot(): Workflow
- ❌ Don't change the error message format - use clear, actionable text
- ❌ Don't modify getRootObservers() in this task - that's P1.M2.T1.S3

---

## Research Summary

### Security Context

This fix addresses **CWE-835: Loop with Unreachable Exit Condition ('Infinite Loop')**.

Without cycle detection, a malicious user or bug could create a circular reference:
```typescript
const parent = new Workflow('Parent');
const child = new Workflow('Child', parent);
parent.parent = child; // Circular reference!

// This causes infinite loop:
parent.getRoot(); // Never returns!
```

This leads to:
- **CPU exhaustion** (Denial of Service)
- **Stack overflow** (if using recursive approach)
- **Application hang** (unresponsive UI/server)

### Alternative Approaches Considered

1. **Prevent cycles at attachment time** (P1.M2.T3)
   - Best approach but requires attachChild() modification
   - This task (P1.M2.T1.S1) is defense-in-depth

2. **WeakSet instead of Set**
   - WeakSet entries can be garbage collected
   - Not suitable for single-pass traversal where we need reliable tracking

3. **Depth limiting only**
   - Would catch infinite loops but less specific error
   - Cycle detection provides better error message

### Performance Impact

- Set operations: O(1) average case
- Memory overhead: O(n) where n = tree depth
- Time overhead: ~5-10% for typical tree depths
- Trade-off: Acceptable for security gain

---

## Confidence Score

**10/10** - Implementation is straightforward with comprehensive research, exact code specification, test patterns, and validation commands. The PRP provides everything needed for one-pass implementation success.

## Related Work Items

- **P1.M2.T1.S2**: Write test for cycle detection in getRoot() - Validation (1 point)
- **P1.M2.T1.S3**: Add cycle detection to getRootObservers() method - Same pattern (1 point)
- **P1.M2.T1.S4**: Write test for cycle detection in getRootObservers() - Validation (1 point)
- **P1.M2.T3**: Add duplicate attachment prevention - Related defensive programming (1 point)

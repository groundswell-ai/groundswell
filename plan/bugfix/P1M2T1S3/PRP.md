name: "P1.M2.T1.S3 - Add Cycle Detection to getRootObservers() Method"
description: |

---

## Goal

**Feature Goal**: Add cycle detection to the `getRootObservers()` method in `src/core/workflow.ts` to prevent infinite loop DoS attacks when circular parent-child relationships are created in the workflow tree.

**Deliverable**: Updated `getRootObservers()` method (lines 123-128) that uses a `visited` Set to detect cycles and returns the root workflow's observers safely.

**Success Definition**: The `getRootObservers()` method detects circular references and throws a descriptive error when a cycle is detected, preventing infinite loops and potential DoS attacks, while maintaining the same behavior for normal (non-cyclic) workflow trees.

## User Persona (if applicable)

**Target User**: Developer maintaining the workflow system; end users who may accidentally create circular references.

**Use Case**: When a workflow tree has a circular reference (e.g., a workflow is attached as its own ancestor), the `getRootObservers()` method should detect this and throw an error rather than entering an infinite loop.

**User Journey**:
1. User accidentally creates a circular reference (e.g., `parent.attachChild(child)` where `child.parent` eventually points back to `parent`)
2. Code calls `getRootObservers()` method (via `emitEvent()`, `snapshotState()`, or logger initialization)
3. Instead of infinite loop, method throws clear error: "Circular parent-child relationship detected"
4. User can fix the circular reference based on the error message

**Pain Points Addressed**:
- **DoS Vulnerability**: Infinite loop can hang the application and exhaust CPU
- **Unclear Errors**: Without cycle detection, circular references cause stack overflow or hang with no useful error message
- **Data Integrity**: Circular references corrupt the tree structure

## Why

- **Security (DoS Prevention)**: PRD #001 Section 5 requires tree operations to be safe from malicious input. Circular references can cause infinite loops leading to denial of service.
- **Robustness**: Tree structure should be guaranteed acyclic. The current `getRootObservers()` method can infinite loop if cycles exist.
- **Developer Experience**: Clear error messages help developers identify and fix circular reference bugs quickly.
- **Consistency**: The `getRoot()` method already has cycle detection (P1.M2.T1.S1). `getRootObservers()` has the same vulnerability and should have the same protection.

## What

Rewrite the `getRootObservers()` method at lines 123-128 in `src/core/workflow.ts` to use a visited Set for cycle detection:

**Current Implementation** (vulnerable to infinite loop):
```typescript
private getRootObservers(): WorkflowObserver[] {
  if (this.parent) {
    return this.parent.getRootObservers();
  }
  return this.observers;
}
```

**New Implementation** (with cycle detection):
```typescript
private getRootObservers(): WorkflowObserver[] {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this;
  let root: Workflow = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    root = current;
    current = current.parent;
  }

  return root.observers;
}
```

### Success Criteria

- [ ] `getRootObservers()` uses `visited` Set to track visited workflows
- [ ] Method throws `Error('Circular parent-child relationship detected')` when cycle detected
- [ ] Normal operation (no cycles) returns the root workflow's observers unchanged
- [ ] All existing tests continue to pass
- [ ] Implementation is consistent with `getRoot()` pattern (P1.M2.T1.S1)

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully? **YES** - This PRP provides the exact code change, file location, line numbers, test patterns, validation commands, and research references.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/core/workflow.ts:123-128
  why: The target method requiring modification
  pattern: Recursive parent traversal without cycle detection
  gotcha: Current implementation will infinite loop if circular reference exists

- file: src/core/workflow.ts:134-149
  why: Reference implementation showing the same pattern applied to getRoot()
  pattern: Iterative while loop with Set<Workflow> for visited tracking
  gotcha: Use this as the exact pattern to follow for consistency

- docfile: plan/bugfix/P1M2T1S1/PRP.md
  why: Completed PRP for getRoot() cycle detection - same pattern applies here
  section: Implementation Blueprint - Implementation Tasks & Implementation Patterns
  gotcha: This is the reference implementation that was already completed and tested

- docfile: plan/docs/research/CYCLE_DETECTION_QUICK_REF.md
  why: Research on cycle detection patterns, best practices, and security implications
  section: Recommended Approach: WeakSet-based Detection (or Set for this case)
  gotcha: WeakSet can't be used here because we need to check the same object instances

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
  why: Understanding Set.has() and Set.add() methods for cycle detection
  critical: Set provides O(1) lookup for visited nodes

- url: https://owasp.org/www-community/attacks/Denial_of_Service
  why: Security context for why cycle detection is critical (DoS prevention)
  critical: Infinite loops are a DoS vulnerability

- url: https://cwe.mitre.org/data/definitions/835.html
  why: CWE-835: Loop with Unreachable Exit Condition ('Infinite Loop')
  critical: This is the official security classification for this vulnerability

- file: src/__tests__/unit/workflow.test.ts:209-223
  why: Test pattern for cycle detection from P1.M2.T1.S2
  pattern: Create circular reference manually, expect error with specific message
  gotcha: Tests use (parent as any).getRoot() to access protected method

- file: src/__tests__/unit/workflow.test.ts
  why: Reference for test patterns in workflow tests
  pattern: vitest describe/it blocks, expect() assertions
  gotcha: Test file uses class-based SimpleWorkflow pattern

- file: vitest.config.ts
  why: Test runner configuration for validation
  pattern: vitest with default config
  gotcha: Run tests with `npm test` or `npx vitest run`

- file: package.json
  why: Build and test scripts
  section: scripts: "build": "tsc", "test": "vitest run", "lint": "tsc --noEmit"
  gotcha: No external formatter - use `tsc` for both compilation and linting

- docfile: plan/docs/bugfix/system_context.md
  why: Contains the research note about getRootObservers() vulnerability
  section: Lines 122-127 in workflow.ts also traverse parent chain and have same vulnerability
  gotcha: This is the source documentation identifying this specific issue
```

### Current Codebase Tree

```bash
groundswell/
├── src/
│   ├── core/
│   │   ├── workflow.ts          # TARGET FILE - getRootObservers() at lines 123-128
│   │   ├── workflow-context.ts  # Related context implementation
│   │   ├── logger.ts            # WorkflowLogger uses getRootObservers() in constructor
│   │   ├── agent.ts             # Agent implementation
│   │   ├── context.ts           # Execution context
│   │   ├── factory.ts           # Workflow factory
│   │   ├── prompt.ts            # Prompt handling
│   │   └── index.ts             # Core exports
│   ├── decorators/
│   │   ├── step.ts              # @Step decorator
│   │   ├── task.ts              # @Task decorator
│   │   ├── observed-state.ts    # @ObservedState decorator
│   │   └── index.ts
│   ├── types/
│   │   ├── workflow.ts          # Workflow types
│   │   ├── events.ts            # Event types
│   │   ├── observer.ts          # WorkflowObserver interface
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
│   │   ├── P1M2T1S3/
│   │   │   └── PRP.md          # This file
│   │   ├── P1M2T1S1/           # Reference PRP for getRoot() cycle detection
│   │   │   └── PRP.md
│   │   └── ...
│   └── docs/
│       ├── bugfix/
│       │   └── system_context.md
│       └── research/
│           └── CYCLE_DETECTION_QUICK_REF.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Desired Codebase Tree (No structural changes - same file, modified content)

```bash
# No new files - this is a modification to existing src/core/workflow.ts
# The getRootObservers() method at lines 123-128 will be rewritten
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: The method is private, not public or protected
// Only accessible within the Workflow class
// Called from: emitEvent(), snapshotState(), constructor (via WorkflowLogger)

// CRITICAL: getRootObservers() is called from multiple places:
// 1. Constructor at line 111: this.logger = new WorkflowLogger(this.node, this.getRootObservers())
// 2. emitEvent() at line 194: const observers = this.getRootObservers()
// 3. snapshotState() at line 217: const observers = this.getRootObservers()

// GOTCHA: The method returns WorkflowObserver[], not Workflow
// Must return root.observers, not just root

// GOTCHA: The recursive approach (current implementation) relies on call stack
// The iterative approach (new implementation) uses a while loop
// Both produce the same result, but iterative is safer for deep trees

// GOTCHA: Set<Workflow> not WeakSet<Workflow>
// WeakSet can't be iterated and entries are garbage collected
// We need reliable detection of the exact same object instance
// Set is appropriate here since we're doing single-pass traversal

// GOTCHA: Unlike getRoot() which returns 'this' after the loop,
// getRootObservers() must track 'root' variable and return root.observers
// This is because we need the root workflow's observers, not just this.observers

// CRITICAL: Follow the exact pattern from getRoot() (lines 134-149)
// This ensures consistency across the codebase
// The only difference is the return value: root.observers vs this

// GOTCHA: TypeScript ES2022 module system
// No import changes needed - this is internal method modification

// GOTCHA: The fix is identical to getRoot() but with different return
// getRoot() returns 'this' (which is the root)
// getRootObservers() returns 'root.observers' (the root's observers)

// IMPORTANT: Test will be added in P1.M2.T1.S4
// This task (S3) focuses only on the implementation
```

## Implementation Blueprint

### Data Models and Structure

No data model changes required. This is a method logic change only.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY getRootObservers() METHOD IN src/core/workflow.ts
  - LOCATION: Lines 123-128
  - REPLACE: Recursive implementation with iterative cycle-detecting implementation
  - ADD: 'const visited = new Set<Workflow>()'
  - ADD: 'let current: Workflow | null = this'
  - ADD: 'let root: Workflow = this'
  - ADD: while loop with cycle detection
  - ADD: if (visited.has(current)) throw new Error('Circular parent-child relationship detected')
  - ADD: visited.add(current)
  - ADD: root = current
  - ADD: current = current.parent
  - RETURN: 'root.observers' (the root workflow's observers)
  - NAMING: Use camelCase for local variables (visited, current, root)
  - PLACEMENT: Replace entire method body at lines 123-128
  - PATTERN: Follow exact pattern from getRoot() at lines 134-149

Task 2: VERIFY TYPE SAFETY
  - RUN: npm run lint (tsc --noEmit)
  - VERIFY: No type errors for Set<Workflow>
  - VERIFY: No type errors for Workflow | null
  - VERIFY: Return type is still WorkflowObserver[]

Task 3: RUN EXISTING TESTS
  - RUN: npm test
  - VERIFY: All existing tests pass
  - VERIFY: No regressions in workflow.test.ts
  - VERIFY: Logger initialization still works (constructor calls getRootObservers)

Task 4: MANUAL VERIFICATION
  - CREATE: Test script to verify normal operation works
  - VERIFY: getRootObservers() returns root.observers for normal parent-child chain
  - VERIFY: getRootObservers() returns this.observers when no parent
  - VERIFY: getRootObservers() throws error for circular reference
```

### Implementation Patterns & Key Details

```typescript
// Current implementation (vulnerable) - src/core/workflow.ts:123-128
private getRootObservers(): WorkflowObserver[] {
  if (this.parent) {
    return this.parent.getRootObservers();
  }
  return this.observers;
}

// New implementation (with cycle detection)
// FOLLOW THE EXACT PATTERN FROM getRoot() AT LINES 134-149
private getRootObservers(): WorkflowObserver[] {
  // PATTERN: Use Set for O(1) cycle detection (same as getRoot())
  const visited = new Set<Workflow>();

  // PATTERN: Track root separately since we need root.observers at the end
  // (Unlike getRoot() which returns 'this', we need to return root.observers)
  let root: Workflow = this;
  let current: Workflow | null = this;

  while (current) {
    // CRITICAL: Check for cycle BEFORE processing
    // This prevents infinite loop and provides clear error message
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }

    // Mark as visited
    visited.add(current);

    // Update root reference
    root = current;

    // Move to parent
    current = current.parent;
  }

  // RETURN root.observers - the root workflow's observers array
  return root.observers;
}

// GOTCHA: Why track 'root' separately?
// In getRoot(), we return 'this' because the method returns a Workflow
// In getRootObservers(), we need to return the root workflow's observers
// So we track 'root' through the traversal and return root.observers

// VERIFICATION: Test cases
// Case 1: No parent (root workflow)
//   visited = { this }, current = null, root = this
//   Returns this.observers ✓

// Case 2: One parent
//   visited = { this, parent }, current = null, root = parent
//   Returns parent.observers ✓

// Case 3: Two levels
//   visited = { this, parent, grandparent }, current = null, root = grandparent
//   Returns grandparent.observers ✓

// Case 4: Circular reference (this.parent.parent === this)
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

EXISTING CALLERS OF getRootObservers():
  - Constructor at line 111: new WorkflowLogger(this.node, this.getRootObservers())
    MUST CONTINUE TO WORK: Logger needs root observers for event propagation
  - emitEvent() at line 194: const observers = this.getRootObservers()
    MUST CONTINUE TO WORK: Event emission needs root observers
  - snapshotState() at line 217: const observers = this.getRootObservers()
    MUST CONTINUE TO WORK: State snapshot needs root observers

RELATED WORK ITEMS:
  - P1.M2.T1.S1: Implement cycle detection logic in getRoot() method (COMPLETED - reference)
  - P1.M2.T1.S2: Write test for cycle detection in getRoot() (COMPLETED - reference)
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

# Expected: All tests pass. The existing tests verify getRootObservers() works
# correctly for normal cases (via emitEvent, snapshotState, logger).

# Run specific test file
npx vitest run src/__tests__/unit/workflow.test.ts
```

### Level 3: Manual Verification (Functional Testing)

```typescript
// Create a test file to verify the implementation
// test-cycle-detection-observers.ts

import { Workflow, WorkflowObserver } from './src/index.js';

// Test 1: Normal operation (no cycle)
class TestWorkflow extends Workflow {
  async run() { return 'done'; }
}

const root = new TestWorkflow('Root');
const child = new TestWorkflow('Child', root);
const grandchild = new TestWorkflow('Grandchild', child);

// Add observer to root
const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: () => {},
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
root.addObserver(observer);

console.log('Test 1: Normal operation');
const rootObservers = (root as any).getRootObservers();
console.log('Root observers count:', rootObservers.length);
console.log('Child observers same as root:', (child as any).getRootObservers() === rootObservers ? 'PASS' : 'FAIL');
console.log('Grandchild observers same as root:', (grandchild as any).getRootObservers() === rootObservers ? 'PASS' : 'FAIL');

// Test 2: Circular reference detection
console.log('\nTest 2: Circular reference');
try {
  const wf1 = new TestWorkflow('WF1');
  const wf2 = new TestWorkflow('WF2', wf1);
  // Create circular reference
  wf1.parent = wf2;

  // This should throw an error
  (wf1 as any).getRootObservers();
  console.log('FAIL: Should have thrown error');
} catch (error) {
  console.log('PASS: Caught error:', error.message);
}

// Test 3: Self-reference detection
console.log('\nTest 3: Self-reference');
try {
  const wf = new TestWorkflow('SelfRef');
  wf.parent = wf;

  // This should throw an error
  (wf as any).getRootObservers();
  console.log('FAIL: Should have thrown error');
} catch (error) {
  console.log('PASS: Caught error:', error.message);
}
```

Run the verification:
```bash
npx tsx test-cycle-detection-observers.ts
```

### Level 4: Integration Testing (System Validation)

```bash
# Run full test suite
npm test

# Expected: All tests pass
# Test coverage includes:
# - workflow.test.ts: Parent-child relationships, observers, events
# - context.test.ts: Workflow context integration
# - Integration tests: Full workflow execution

# Verify logger initialization works (constructor calls getRootObservers)
npm test -- --reporter=verbose

# Expected: No errors in workflow construction
# Logger should successfully get root observers
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run lint`
- [ ] No build errors: `npm run build`
- [ ] Manual verification confirms cycle detection works
- [ ] Manual verification confirms normal operation unchanged

### Feature Validation

- [ ] getRootObservers() uses Set<Workflow> for visited tracking
- [ ] Error message is 'Circular parent-child relationship detected'
- [ ] Normal case (no parent) returns `this.observers`
- [ ] Normal case (with parent chain) returns root.observers
- [ ] Circular reference throws error immediately
- [ ] Self-reference throws error immediately
- [ ] No infinite loop possible
- [ ] Implementation matches getRoot() pattern exactly

### Code Quality Validation

- [ ] Follows existing codebase patterns (camelCase, private method)
- [ ] TypeScript types are correct (Set<Workflow>, Workflow | null)
- [ ] Return type is WorkflowObserver[] (unchanged)
- [ ] Error message is descriptive and actionable
- [ ] No performance regression (Set has O(1) operations)
- [ ] Consistent with getRoot() implementation

### Security Validation

- [ ] DoS vulnerability via infinite loop is fixed
- [ ] Error message doesn't leak sensitive information
- [ ] Method is still private (not exposed publicly)
- [ ] No new attack vectors introduced

### Documentation & Deployment

- [ ] No new environment variables added
- [ ] No configuration changes required
- [ ] JSDoc comment remains accurate (method purpose unchanged)
- [ ] Related work items identified (P1.M2.T1.S4 for test)

---

## Anti-Patterns to Avoid

- ❌ Don't use recursion - use iterative while loop for safety
- ❌ Don't use WeakSet - use Set for reliable object instance tracking
- ❌ Don't return `this.observers` - return `root.observers` (need root's observers)
- ❌ Don't skip the type check - always verify `npm run lint` passes
- ❌ Don't forget to test - normal operation must still work
- ❌ Don't change the method signature - keep private getRootObservers(): WorkflowObserver[]
- ❌ Don't change the error message format - use clear, actionable text
- ❌ Don't deviate from getRoot() pattern - consistency is critical

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
parent.getRootObservers(); // Never returns!
```

This leads to:
- **CPU exhaustion** (Denial of Service)
- **Stack overflow** (if using recursive approach)
- **Application hang** (unresponsive UI/server)

### Reference Implementation (P1.M2.T1.S1)

The `getRoot()` method (lines 134-149) was already fixed with the same pattern:
```typescript
protected getRoot(): Workflow {
  const visited = new Set<Workflow>();
  let root: Workflow = this;
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    root = current;
    current = current.parent;
  }

  return root;
}
```

This PRP applies the exact same pattern to `getRootObservers()`, with the only difference being the return value: `root.observers` instead of `root`.

### Alternative Approaches Considered

1. **Prevent cycles at attachment time** (P1.M2.T3)
   - Best approach but requires attachChild() modification
   - This task (P1.M2.T1.S3) is defense-in-depth

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

**10/10** - Implementation is straightforward with comprehensive research, exact code specification (following the completed P1.M2.T1.S1 pattern), test patterns, and validation commands. The PRP provides everything needed for one-pass implementation success.

## Related Work Items

- **P1.M2.T1.S1**: Implement cycle detection logic in getRoot() method (COMPLETED - reference)
- **P1.M2.T1.S2**: Write test for cycle detection in getRoot() (COMPLETED - test pattern reference)
- **P1.M2.T1.S4**: Write test for cycle detection in getRootObservers() - Validation (1 point)
- **P1.M2.T3**: Add duplicate attachment prevention - Related defensive programming (1 point)

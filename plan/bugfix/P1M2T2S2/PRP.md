# PRP: Write test for treeUpdated event emission on setStatus

## Goal

**Feature Goal**: Validate that the `treeUpdated` event is properly emitted and triggers `onTreeChanged()` observer callbacks when `setStatus()` is called.

**Deliverable**: A passing test case in `src/__tests__/unit/workflow.test.ts` that validates the treeUpdated event emission and observer notification chain.

**Success Definition**: Test passes, confirming that:
1. `treeUpdated` event is emitted with correct payload
2. `onTreeChanged()` callback is invoked with the root node
3. Observer pattern integration works correctly

## User Persona

**Target User**: Developer maintaining the workflow system (ensures event system reliability)

**Use Case**: Automated validation that status changes trigger tree structure updates for debuggers and observers

**User Journey**:
1. Developer runs test suite to validate bug fix
2. Test confirms `treeUpdated` event fires on `setStatus()` calls
3. Tree debugger rebuilds when status changes occur

**Pain Points Addressed**:
- Silent failures in observer notification chain
- Undetected regressions in event emission
- Tree debugger state desynchronization

## Why

- **Event System Reliability**: The treeUpdated event is critical for observers (especially TreeDebugger) to maintain synchronized state with workflow tree changes
- **Bug Fix Validation**: This test validates the fix implemented in P1.M2.T2.S1 where treeUpdated emission was added to setStatus()
- **Observer Pattern Contract**: Ensures the contract between workflow events and observer callbacks is upheld
- **Tree Debugger Integration**: From system_context.md, the tree debugger's rebuild() method is triggered via onTreeChanged(), making this validation essential

## What

Add a test case to validate that calling `setStatus()` emits a `treeUpdated` event and triggers the `onTreeChanged()` observer callback.

### Success Criteria

- [ ] Test added to `src/__tests__/unit/workflow.test.ts`
- [ ] Test validates treeUpdated event emission via onEvent
- [ ] Test validates onTreeChanged callback is invoked
- [ ] Test validates root node is passed to onTreeChanged
- [ ] All tests pass: `npm test`

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, they would have everything needed to implement this successfully because:
- Exact file location and test patterns are specified
- Observer interface and mock patterns are documented
- Event structure and emission pattern are defined
- Test framework and validation commands are specified
- Existing test examples serve as templates

### Documentation & References

```yaml
# MUST READ - Critical implementation context
- url: https://vitest.dev/api/expect.html
  why: Vitest assertion API for test validation
  critical: Use expect().toBeDefined(), expect().toHaveLength(), expect().toBe() for assertions

- file: src/__tests__/unit/workflow.test.ts
  why: Primary template for test structure and patterns
  pattern: Follow lines 45-61 for observer setup with array collection
  pattern: Follow lines 63-80 for event emission testing with type narrowing
  pattern: Follow lines 209-223 for circular detection test (error assertion pattern)
  gotcha: Always use describe/it blocks, observer methods must be mocked even if empty

- file: src/core/workflow.ts
  why: Contains setStatus() implementation and treeUpdated emission logic
  section: Lines 247-251 (setStatus method with treeUpdated emission)
  pattern: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })
  gotcha: Event includes root node payload, must validate this in test

- file: src/types/observer.ts
  why: WorkflowObserver interface definition
  pattern: onTreeChanged(root: WorkflowNode): void
  gotcha: All four methods (onLog, onEvent, onStateUpdated, onTreeChanged) must be implemented

- file: src/types/events.ts
  why: WorkflowEvent discriminated union type definition
  pattern: { type: 'treeUpdated'; root: WorkflowNode }
  gotcha: Use type narrowing before accessing root property

- file: src/debugger/tree-debugger.ts
  why: Shows how onTreeChanged() is used in production
  pattern: onTreeChanged(root: WorkflowNode) { this.root = root; this.nodeMap.clear(); this.buildNodeMap(root); }
  gotcha: Tree debugger rebuilds entire node map on tree changes

- file: plan/docs/architecture/system_context.md
  why: Architecture documentation for tree debugger integration
  section: "Observer Pattern" and "Event System"
  gotcha: Observers attach to ROOT workflow only, events propagate from any workflow

- file: examples/examples/04-observers-debugger.ts
  why: Production example of observer usage
  pattern: Shows TreeDebugger observing workflow tree
  gotcha: Demonstrates real-world observer integration
```

### Current Codebase tree

```bash
/home/dustin/projects/groundswell
├── src
│   ├── __tests__
│   │   └── unit
│   │       └── workflow.test.ts    # <-- ADD TEST HERE
│   ├── core
│   │   └── workflow.ts             # Contains setStatus() implementation
│   ├── types
│   │   ├── observer.ts             # WorkflowObserver interface
│   │   ├── events.ts               # WorkflowEvent types
│   │   └── index.ts                # Type exports
│   └── debugger
│       └── tree-debugger.ts        # Tree debugger using onTreeChanged
├── plan
│   └── bugfix
│       └── P1M2T2S2                # PRP directory
├── package.json                    # Contains test scripts
└── vitest.config.ts                # Test configuration
```

### Desired Codebase tree with files to be added

```bash
# No new files - test will be added to existing workflow.test.ts
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Vitest globals are enabled - no need to import describe, it, expect
// The test file imports these from vitest but they're available globally

// CRITICAL: Observer interface requires ALL methods to be implemented
// Even if you only test onTreeChanged, you must provide empty implementations for:
// - onLog: () => {}
// - onEvent: () => {}  (or use for collection)
// - onStateUpdated: () => {}
// - onTreeChanged: (root) => { /* test this */ }

// GOTCHA: WorkflowObserver methods are NOT optional
// Type error will occur if any method is missing from the observer object

// CRITICAL: Use type narrowing for discriminated union events
// BAD: const root = events.find(e => e.type === 'treeUpdated').root; // TypeScript error
// GOOD: const event = events.find(e => e.type === 'treeUpdated');
//       if (event?.type === 'treeUpdated') { expect(event.root).toBe(rootNode); }

// CRITICAL: SimpleWorkflow class already exists in workflow.test.ts (lines 4-11)
// Reuse this class instead of creating a new one

// CRITICAL: Import statement uses .js extension (ESM modules)
// import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

// CRITICAL: Use getNode() to get the WorkflowNode for comparison
// expect(event.root).toBe(workflow.getNode())

// CRITICAL: Test naming convention uses "should" prefix
// "should emit treeUpdated event when status changes"

// CRITICAL: Add test to existing 'Workflow' describe block (line 13)
// Do not create a new describe block

// CRITICAL: Mock onTreeChanged to capture calls for assertion
// const treeChangedCalls: WorkflowNode[] = [];
// onTreeChanged: (root) => treeChangedCalls.push(root)
```

## Implementation Blueprint

### Data models and structure

No new models needed - using existing types:

```typescript
// Existing types to import and use
import { Workflow, WorkflowObserver, WorkflowEvent, WorkflowNode } from '../../index.js';

// Observer pattern with callback tracking
const events: WorkflowEvent[] = [];
const treeChangedCalls: WorkflowNode[] = [];

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: (root) => treeChangedCalls.push(root),
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: LOCATE insertion point in workflow.test.ts
  - FIND: The 'Workflow' describe block (line 13)
  - POSITION: After line 239 (after "should detect circular relationship in getRootObservers" test)
  - PATTERN: Maintain test ordering - observer tests are grouped together (lines 45-80)
  - PLACEMENT: Add within existing describe block, no new describe needed

Task 2: CREATE test case 'should emit treeUpdated event when status changes'
  - ARRANGE: Create SimpleWorkflow instance
  - ARRANGE: Initialize events array and treeChangedCalls array
  - ARRANGE: Create observer with mock implementations
  - ARRANGE: Add observer to workflow
  - ACT: Call workflow.setStatus('running')
  - ASSERT: Verify treeUpdated event exists in events array
  - ASSERT: Verify onTreeChanged was called with root node
  - ASSERT: Use type narrowing for treeUpdated event
  - NAMING: Follow "should [verb phrase]" convention

Task 3: VALIDATE test passes
  - RUN: npm test or vitest run
  - VERIFY: Test passes without errors
  - VERIFY: No existing tests are broken
  - CHECK: All assertions pass

Task 4: OPTIONAL - Add second test for multiple status changes
  - CREATE: Test validating multiple setStatus calls emit multiple events
  - VALIDATE: Each status change triggers treeUpdated event
  - VALIDATE: onTreeChanged is called for each change
```

### Implementation Patterns & Key Details

```typescript
// EXACT TEST IMPLEMENTATION PATTERN - Add to workflow.test.ts after line 239

it('should emit treeUpdated event when status changes', () => {
  // Arrange: Create workflow instance
  const wf = new SimpleWorkflow();

  // Arrange: Create arrays to track event emissions and callback invocations
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: WorkflowNode[] = [];

  // Arrange: Create observer with callbacks
  const observer: WorkflowObserver = {
    onLog: () => {},  // Empty - not testing logs
    onEvent: (event) => events.push(event),  // Capture events
    onStateUpdated: () => {},  // Empty - not testing state updates
    onTreeChanged: (root) => treeChangedCalls.push(root),  // Capture tree changes
  };

  // Act: Attach observer and trigger status change
  wf.addObserver(observer);
  wf.setStatus('running');

  // Assert: Verify treeUpdated event was emitted
  const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined();

  // Assert: Verify event payload contains root node (type narrowing for discriminated union)
  expect(treeUpdatedEvent?.type === 'treeUpdated' && treeUpdatedEvent.root).toBe(wf.getNode());

  // Assert: Verify onTreeChanged callback was invoked with root node
  expect(treeChangedCalls).toHaveLength(1);
  expect(treeChangedCalls[0]).toBe(wf.getNode());
});

// OPTIONAL: Test for multiple status changes
it('should emit treeUpdated event on multiple status changes', () => {
  const wf = new SimpleWorkflow();
  const events: WorkflowEvent[] = [];
  const treeChangedCalls: WorkflowNode[] = [];

  const observer: WorkflowObserver = {
    onLog: () => {},
    onEvent: (event) => events.push(event),
    onStateUpdated: () => {},
    onTreeChanged: (root) => treeChangedCalls.push(root),
  };

  wf.addObserver(observer);

  // Act: Change status multiple times
  wf.setStatus('running');
  wf.setStatus('completed');

  // Assert: Verify multiple treeUpdated events
  const treeUpdatedEvents = events.filter((e) => e.type === 'treeUpdated');
  expect(treeUpdatedEvents).toHaveLength(2);

  // Assert: Verify onTreeChanged called twice
  expect(treeChangedCalls).toHaveLength(2);
  expect(treeChangedCalls[0]).toBe(wf.getNode());
  expect(treeChangedCalls[1]).toBe(wf.getNode());
});
```

### Integration Points

```yaml
TEST_FILE:
  - add to: src/__tests__/unit/workflow.test.ts
  - position: After line 239, within existing 'Workflow' describe block
  - pattern: "Follow existing test structure with describe/it blocks"

IMPORTS:
  - existing: Workflow, WorkflowObserver, WorkflowEvent are already imported
  - add: WorkflowNode if not already in imports (line 2)
  - pattern: "import { Workflow, WorkflowObserver, WorkflowEvent, WorkflowNode } from '../../index.js';"

RUNNER:
  - command: npm test
  - framework: Vitest with globals enabled
  - config: vitest.config.ts
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run type checking to verify no TypeScript errors
npx tsc --noEmit

# Run linter to check code style (if configured)
npm run lint  # or: npx eslint src/__tests__/unit/workflow.test.ts

# Expected: Zero TypeScript errors, zero linting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the specific test file
npx vitest run src/__tests__/unit/workflow.test.ts

# Run all workflow tests
npx vitest run src/__tests__/unit/

# Run entire test suite
npm test

# Expected: All tests pass, specifically the new test "should emit treeUpdated event when status changes"

# Coverage validation (optional)
npx vitest run --coverage

# Expected: Test coverage for setStatus() event emission increases
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all tests to ensure no regressions
npm test

# Verify no existing tests are broken by the addition
npx vitest run --reporter=verbose

# Expected: All existing tests still pass, new test passes

# Integration verification - check that tree debugger still works
node -e "
const { Workflow, WorkflowTreeDebugger } = require('./dist/index.js');
const wf = new Workflow();
const debugger = new WorkflowTreeDebugger(wf);
wf.setStatus('running');
console.log('Tree debugger root:', debugger.root);
"

# Expected: Tree debugger receives treeUpdated event and rebuilds successfully
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual verification of observer callback behavior
node -e "
const { Workflow, WorkflowObserver } = require('./dist/index.js');

let treeChangedCount = 0;
const observer = {
  onLog: () => {},
  onEvent: () => {},
  onStateUpdated: () => {},
  onTreeChanged: () => { treeChangedCount++; }
};

const wf = new Workflow();
wf.addObserver(observer);
console.log('Before setStatus:', treeChangedCount);
wf.setStatus('running');
console.log('After setStatus:', treeChangedCount);
console.log('Expected: 1, Actual:', treeChangedCount);
"

# Expected: treeChangedCount is 1 after setStatus call

# Verify event payload structure
node -e "
const { Workflow, WorkflowObserver } = require('./dist/index.js');

let capturedRoot = null;
const observer = {
  onLog: () => {},
  onEvent: (e) => {
    if (e.type === 'treeUpdated') {
      capturedRoot = e.root;
    }
  },
  onStateUpdated: () => {},
  onTreeChanged: (root) => {
    console.log('onTreeChanged root ID:', root.id);
  }
};

const wf = new Workflow();
wf.addObserver(observer);
wf.setStatus('running');
console.log('Captured root:', capturedRoot ? capturedRoot.id : 'null');
console.log('Workflow node ID:', wf.getNode().id);
console.log('Match:', capturedRoot?.id === wf.getNode().id);
"

# Expected: Captured root ID matches workflow node ID

# Performance check - ensure no performance regression
npx vitest run --benchmark  # If benchmarking is configured

# Expected: No significant performance degradation in setStatus() calls
```

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] Test file compiles without TypeScript errors: `npx tsc --noEmit`
- [ ] Test passes in isolation: `npx vitest run src/__tests__/unit/workflow.test.ts`
- [ ] All tests pass: `npm test`
- [ ] No existing tests broken by addition
- [ ] Code follows existing patterns in workflow.test.ts

### Feature Validation

- [ ] Test validates treeUpdated event emission via onEvent callback
- [ ] Test validates onTreeChanged callback is invoked
- [ ] Test validates root node is passed correctly
- [ ] Type narrowing used for discriminated union (event.type === 'treeUpdated')
- [ ] Test follows "should [verb phrase]" naming convention
- [ ] Test placed in correct location (after line 239)

### Code Quality Validation

- [ ] Observer mock includes all four required methods
- [ ] Arrays used for event and callback tracking
- [ ] Assertions use expect().toBeDefined(), expect().toHaveLength(), expect().toBe()
- [ ] Type-safe access to event.root via type narrowing
- [ ] Reuses existing SimpleWorkflow class

### Documentation & Deployment

- [ ] No new documentation required (test is self-documenting)
- [ ] Test serves as documentation for expected behavior
- [ ] Integration with existing test suite maintained

---

## Anti-Patterns to Avoid

- [ ] Don't create a new describe block - add to existing 'Workflow' block
- [ ] Don't skip mocking untested observer methods (onLog, onEvent, onStateUpdated)
- [ ] Don't use unsafe type assertions (as any) - use type narrowing
- [ ] Don't forget to attach observer before calling setStatus
- [ ] Don't test onEvent only - must also test onTreeChanged callback
- [ ] Don't use vi.fn() unless necessary - array collection is simpler
- [ ] Don't create a new test class - reuse SimpleWorkflow
- [ ] Don't place test outside the existing describe block
- [ ] Don't use sync assertions for async operations (not applicable here, but good practice)
- [ ] Don't skip validation of the root node payload in the event

## Confidence Score

**9/10** - This PRP provides:
- Exact file location and test patterns to follow
- Complete observer interface and mock patterns
- Event structure with type safety guidance
- Test framework configuration details
- Existing test examples as templates
- Complete validation strategy

The only reason this isn't a perfect 10/10 is that the test is very straightforward and the PRP may be slightly over-detailed for such a simple addition. However, this ensures one-pass implementation success.

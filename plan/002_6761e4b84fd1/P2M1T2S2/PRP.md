---
name: "PRP for P2.M1.T2.S2: Integrate WorkflowEventReplayer with Debugger"
description: "Add static replay API to WorkflowTreeDebugger for time-travel debugging"
---

## Goal

**Feature Goal**: Add a static factory method `WorkflowTreeDebugger.replay(path: string)` that loads saved event history from a JSON file and returns a reconstructed workflow tree root node for time-travel debugging.

**Deliverable**: A new static method `WorkflowTreeDebugger.replay(path: string): Promise<WorkflowNode>` on the `WorkflowTreeDebugger` class.

**Success Definition**:
- Calling `WorkflowTreeDebugger.replay('workflow-events.json')` loads events from file and replays them using `WorkflowEventReplayer`
- Returns a `WorkflowNode` representing the reconstructed workflow tree root
- The returned tree is read-only (no live workflow attached)
- All event types are properly replayed (structural, state, and metadata events)
- Proper error handling with descriptive error messages for file operations and replay failures

## User Persona

**Target User**: Developer debugging workflow execution issues

**Use Case**: A developer runs a workflow that produces unexpected behavior. They save the event history during execution, then use `WorkflowTreeDebugger.replay()` to reconstruct the workflow tree and inspect what happened.

**User Journey**:
1. Developer creates a `WorkflowTreeDebugger` with `persistEvents: true` during workflow execution
2. Developer calls `debugger.saveEventHistory('./workflow-events.json')` to save events
3. Later, developer calls `const tree = await WorkflowTreeDebugger.replay('./workflow-events.json')` to reconstruct the tree
4. Developer inspects the reconstructed tree structure, node states, and accumulated events
5. Developer can use `debugger.toTreeString(tree)` and `debugger.getStats(tree)` on the reconstructed node

**Pain Points Addressed**:
- No ability to reconstruct workflow tree from saved events
- Difficult to debug workflow issues after execution completes
- No time-travel debugging capability for post-mortem analysis

## Why

- **Debugging Capability**: Enables developers to analyze workflow execution after completion without requiring the live workflow instance
- **Integration**: Builds on existing `WorkflowEventReplayer` class from P2.M1.T1 and `loadEventHistory()` from P2.M1.T2.S1
- **Completes Time-Travel Debugging**: Provides the final piece of the event persistence/replay system

## What

Add a static factory method `WorkflowTreeDebugger.replay(path: string): Promise<WorkflowNode>` that:

1. Loads event history from the specified JSON file path
2. Replays the events using `WorkflowEventReplayer`
3. Returns the reconstructed workflow tree root node

The method should:
- Use existing `WorkflowTreeDebugger.loadEventHistory(path)` to load events
- Create a new `WorkflowEventReplayer` instance
- Call `replayer.replay(events)` with the loaded events
- Return the resulting `WorkflowNode`

### Success Criteria

- [ ] Static method `WorkflowTreeDebugger.replay(path: string)` exists
- [ ] Method returns `Promise<WorkflowNode>`
- [ ] Method loads events from file using `loadEventHistory()`
- [ ] Method creates `WorkflowEventReplayer` and calls `replay()`
- [ ] Method properly handles errors (file not found, invalid JSON, replay failures)
- [ ] Method includes comprehensive JSDoc documentation with examples
- [ ] Method is exported from `src/index.ts`
- [ ] Tests cover: successful replay, file errors, invalid JSON, empty events, replay errors

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES - This PRP includes:
- Exact file paths and line numbers for all referenced code
- Complete code snippets showing patterns to follow
- Type definitions for all interfaces and types
- Test patterns and validation commands
- External research references with specific URLs
- Known gotchas and constraints

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.typescriptlang.org/docs/handbook/functions.html#static-methods
  why: TypeScript static method syntax and patterns
  critical: Static methods are called on the class, not instances

- url: https://martinfowler.com/eaaDev/EventSourcing.html
  why: Event sourcing pattern for time-travel debugging
  critical: Events are the source of truth for state reconstruction

- url: https://redux.js.org/usage/configure-your-store
  why: Time-travel debugging API patterns from Redux DevTools
  critical: Reference for replay API design patterns

- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: Complete WorkflowTreeDebugger class implementation with loadEventHistory pattern
  pattern: Static method using fs/promises readFile with error handling for ENOENT, EACCES, SyntaxError
  gotcha: loadEventHistory returns unknown[] - caller must assert to WorkflowEvent[]

- file: /home/dustin/projects/groundswell/src/debugger/event-replayer.ts
  why: WorkflowEventReplayer class with replay() method
  pattern: Instance method replay(events: WorkflowEvent[]): WorkflowNode
  gotcha: replay() throws if events array is empty or root cannot be established

- file: /home/dustin/projects/groundswell/src/types/events.ts
  why: Complete WorkflowEvent discriminated union type definition
  pattern: Discriminated union with type field for all event types
  gotcha: All events contain WorkflowNode references with circular parent/children

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: WorkflowNode interface definition
  pattern: Interface with id, name, parent, children, status, logs, events, stateSnapshot
  gotcha: parent and children create circular references - serialization extracts only id/name

- file: /home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger-persistence.test.ts
  why: Existing test patterns for loadEventHistory and saveEventHistory
  pattern: afterEach cleanup with unlink, error testing with rejects.toThrow
  gotcha: Use /tmp/ for test files to avoid conflicts

- file: /home/dustin/projects/groundswell/src/__tests__/unit/event-replayer.test.ts
  why: Comprehensive test patterns for replay functionality
  pattern: createMockNode helper, event creation patterns, tree validation
  gotcha: Tests verify bidirectional links, deep cloning, error accumulation

- docfile: plan/002_6761e4b84fd1/P2M1T2S2/research/10-typescript-static-method-patterns.md
  why: TypeScript static method best practices including JSDoc patterns
  section: Static Factory Methods, Async Static Method Patterns, JSDoc Documentation Patterns

- docfile: plan/002_6761e4b84fd1/P2M1T2S2/research/11-time-travel-debugging-api-patterns.md
  why: Time-travel debugging API design patterns from production systems
  section: API Design Patterns, Read-Only State Reconstruction, Best Practices

- docfile: plan/002_6761e4b84fd1/P2M1T2S1/research/00-time-travel-debugging-quick-ref.md
  why: Time-travel debugging quick reference with patterns and naming conventions
  section: Static Factory Method Naming, Event Sourcing Pattern

- docfile: plan/002_6761e4b84fd1/P2M1T2S1/research/01-workflowtree-debugger-analysis.md
  why: Complete WorkflowTreeDebugger class analysis from previous subtask
  section: Existing Static Methods, Constructor Signature, Event Management
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                          # Compiled JavaScript output
├── docs/                          # User documentation
├── examples/
│   └── examples/
│       └── 04-observers-debugger.ts  # Example WorkflowTreeDebugger usage
├── plan/
│   └── 002_6761e4b84fd1/
│       ├── architecture/          # Architecture research
│       ├── P2M1T2S1/              # Previous subtask (event persistence)
│       │   └── research/          # Research documents
│       └── P2M1T2S2/              # Current subtask
│           └── PRP.md             # THIS FILE
├── src/
│   ├── __tests__/
│   │   ├── unit/
│   │   │   ├── tree-debugger.test.ts
│   │   │   ├── tree-debugger-persistence.test.ts
│   │   │   ├── event-replayer.test.ts
│   │   │   └── helpers/
│   │   │       └── tree-verification.ts
│   ├── core/
│   │   ├── workflow.ts
│   │   └── factory.ts
│   ├── debugger/
│   │   ├── tree-debugger.ts       # MODIFICATION: Add replay() static method
│   │   ├── event-replayer.ts      # REFERENCE: Used by replay()
│   │   └── index.ts
│   ├── types/
│   │   ├── workflow.ts            # REFERENCE: WorkflowNode type
│   │   ├── events.ts              # REFERENCE: WorkflowEvent type
│   │   └── observer.ts
│   └── index.ts                   # MODIFICATION: Export replay method
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Desired Codebase Tree (Changes Only)

```bash
# No new files - only modifications to existing files
src/
  ├── debugger/
  │   └── tree-debugger.ts         # ADD: static replay(path: string) method
  └── index.ts                     # VERIFY: replay is accessible via WorkflowTreeDebugger export
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: loadEventHistory returns unknown[], not WorkflowEvent[]
// The caller must type assert: events as WorkflowEvent[]
// This is intentional - validation happens at replay boundaries
const events = await WorkflowTreeDebugger.loadEventHistory('./file.json');
const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(events as WorkflowEvent[]); // Type assertion required

// CRITICAL: WorkflowNode has circular references (parent <-> children)
// Never JSON.stringify a WorkflowNode directly
// Use serializeEvent() method which extracts only id/name from node references
// See tree-debugger.ts lines 368-543 for serialization patterns

// CRITICAL: WorkflowEventReplayer.replay() throws on empty events or no root
// Always try-catch replay calls and provide descriptive error messages
try {
  const tree = replayer.replay(events);
} catch (error) {
  // Enhance error with context about which file failed
  throw new Error(`Failed to replay events from ${path}: ${error.message}`);
}

// CRITICAL: Error handling must check specific error codes
// Use NodeJS.ErrnoException type checking for ENOENT, EACCES, etc.
const err = error as NodeJS.ErrnoException;
if (err.code === 'ENOENT') {
  throw new Error(`Event history file not found: ${path}`);
}

// CRITICAL: Test file cleanup in afterEach
// Always unlink test files even if test fails
afterEach(async () => {
  try {
    await unlink(testFilePath);
  } catch {
    // File may not exist - ignore
  }
});

// CRITICAL: Use vi.spyOn for console mocking in tests
// Always restore mocks in afterEach
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

// CRITICAL: The custom Observable from utils/observable.ts
// NOT RxJS - do not import RxJS operators
// Events flow: Workflow.emitEvent() -> WorkflowTreeDebugger.onEvent() -> events.next()

// CRITICAL: Vitest is the test framework, not Jest
// Import from 'vitest', not 'jest'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// CRITICAL: File path type is always string
// No PathLike or Buffer types for file paths
path: string
```

## Implementation Blueprint

### Data Models and Structure

No new data models required - using existing types:

```typescript
// Existing type from src/types/workflow.ts
interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];
  stateSnapshot: SerializedWorkflowState | null;
}

// Existing type from src/types/events.ts
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'treeUpdated'; root: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  // ... other event types
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD static replay() method to WorkflowTreeDebugger class
  - LOCATION: src/debugger/tree-debugger.ts (after loadEventHistory method, ~line 678)
  - IMPLEMENT: static async replay(path: string): Promise<WorkflowNode>
  - SIGNATURE:
    ```typescript
    /**
     * Replay workflow execution from saved event history file.
     *
     * This is a convenience method that combines loadEventHistory and
     * WorkflowEventReplayer.replay() for one-call restoration of workflow trees.
     *
     * @param path - File path to saved event history JSON file
     * @returns Reconstructed workflow tree root node
     * @throws {Error} If file cannot be read or parsed
     * @throws {Error} If events cannot be replayed (empty events, no root established)
     *
     * @example
     * ```typescript
     * // Save event history during execution
     * const debugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
     * await workflow.run();
     * await debugger.saveEventHistory('./workflow-events.json');
     *
     * // Later, replay the events to reconstruct the tree
     * const tree = await WorkflowTreeDebugger.replay('./workflow-events.json');
     * console.log(`Restored tree with ${tree.children.length} children`);
     * ```
     */
    static async replay(path: string): Promise<WorkflowNode>
    ```
  - NAMING: snake_case for parameter, PascalCase for method (static method convention)
  - IMPORTS: Add import for WorkflowEventReplayer at top of file
  - DEPENDENCIES: Uses existing loadEventHistory(), requires WorkflowEventReplayer import
  - PLACEMENT: In WorkflowTreeDebugger class, after loadEventHistory static method

Task 2: IMPLEMENT replay() method body
  - CALL: await WorkflowTreeDebugger.loadEventHistory(path) to load events
  - CREATE: new WorkflowEventReplayer() instance
  - CALL: replayer.replay(events as WorkflowEvent[]) with type assertion
  - WRAP: In try-catch to enhance error messages with file path context
  - ERROR HANDLING:
    - loadEventHistory already throws descriptive errors for file issues
    - Wrap replay errors with context: `Failed to replay events from ${path}`
  - RETURN: The WorkflowNode returned by replayer.replay()
  - PATTERN: Follow error handling pattern from loadEventHistory (lines 637-678)

Task 3: VERIFY export from src/index.ts
  - CHECK: WorkflowTreeDebugger is already exported (line 108)
  - VERIFY: No changes needed - static methods are automatically available on exported class
  - LOCATION: src/index.ts
  - PATTERN: Classes with static methods don't need special export handling

Task 4: CREATE unit tests for replay() method
  - LOCATION: src/__tests__/unit/tree-debugger-persistence.test.ts
  - ADD: New describe('replay', ...) test suite
  - TEST CASES:
    1. should replay events from file and return tree root
    2. should throw descriptive error for non-existent file
    3. should throw descriptive error for invalid JSON
    4. should throw descriptive error for empty events array
    5. should reconstruct tree structure correctly (verify parent-child links)
    6. should reconstruct node states (stateSnapshot, events)
    7. should handle error events correctly
    8. should return read-only node (no live workflow attached)
  - FOLLOW: Pattern from existing loadEventHistory tests (lines 129-157)
  - PATTERN: AAA (Arrange-Act-Assert), createMockNode helper, afterEach cleanup
  - COVERAGE: All success paths and error cases

Task 5: CREATE integration test for save/replay cycle
  - LOCATION: src/__tests__/unit/tree-debugger-persistence.test.ts
  - TEST: Round-trip test - save events, then replay and verify tree matches
  - VERIFY: Tree structure, node counts, state snapshots, event counts match
  - PATTERN: Follow existing round-trip test pattern (lines 159-186)
  - USE: verifyTreeMirror helper from tree-verification.ts for validation

Task 6: CREATE example usage in examples/04-observers-debugger.ts
  - LOCATION: examples/examples/04-observers-debugger.ts
  - ADD: Commented example showing replay() usage
  - SHOW: saveEventHistory() followed by replay() call
  - DEMONSTRATE: Inspecting reconstructed tree with toTreeString() and getStats()
  - PATTERN: Follow existing example patterns in the file
```

### Implementation Patterns & Key Details

```typescript
// CRITICAL PATTERNS - Keep concise, focus on non-obvious details

// Pattern 1: Static replay() method implementation
// Location: src/debugger/tree-debugger.ts (after loadEventHistory, ~line 678)
static async replay(path: string): Promise<WorkflowNode> {
  // Load events from file using existing static method
  const events = await WorkflowTreeDebugger.loadEventHistory(path);

  // Create replayer instance
  const replayer = new WorkflowEventReplayer();

  // Replay events with type assertion (loadEventHistory returns unknown[])
  // GOTCHA: Wrap in try-catch to enhance error messages
  try {
    return replayer.replay(events as WorkflowEvent[]);
  } catch (error) {
    const err = error as Error;
    throw new Error(
      `Failed to replay events from ${path}: ${err.message}`
    );
  }
}

// Pattern 2: Import for WorkflowEventReplayer
// Location: Top of src/debugger/tree-debugger.ts (~line 13)
import { WorkflowEventReplayer } from './event-replayer.js';

// Pattern 3: Type import for WorkflowNode (already imported)
// Location: Top of src/debugger/tree-debugger.ts (~line 4)
import type { WorkflowNode } from '../types/index.js';

// Pattern 4: Test helper for creating mock events (use existing pattern)
// Location: src/__tests__/unit/event-replayer.test.ts
function createMockNode(id: string, parent: WorkflowNode | null): WorkflowNode {
  return {
    id,
    name: id,
    parent,
    children: [],
    status: 'idle',
    logs: [],
    events: [],
    stateSnapshot: null
  };
}

// Pattern 5: Test structure for replay tests
describe('replay', () => {
  const testFilePath = '/tmp/test-replay-events.json';

  afterEach(async () => {
    try {
      await unlink(testFilePath);
    } catch {
      // File may not exist
    }
  });

  it('should replay events from file and return tree root', async () => {
    // ARRANGE: Create and save test events
    const events = [
      { type: 'treeUpdated', root: createMockNode('root-1', null) },
      { type: 'childAttached', parentId: 'root-1', child: createMockNode('child-1', null) }
    ];
    await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

    // ACT: Replay events
    const tree = await WorkflowTreeDebugger.replay(testFilePath);

    // ASSERT: Verify tree structure
    expect(tree.id).toBe('root-1');
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].id).toBe('child-1');
    expect(tree.children[0].parent).toBe(tree); // Bidirectional link
  });

  it('should throw descriptive error for non-existent file', async () => {
    await expect(
      WorkflowTreeDebugger.replay('/tmp/non-existent-file.json')
    ).rejects.toThrow('Event history file not found');
  });
});

// Pattern 6: Round-trip integration test
it('should preserve tree through save/replay cycle', async () => {
  // ARRANGE: Create workflow with debugger
  const workflow = new TestWorkflow('Root');
  const debugger1 = new WorkflowTreeDebugger(workflow, { persistEvents: true });

  // ACT: Run workflow and save events
  await workflow.run();
  const originalTree = workflow.getNode();
  await debugger1.saveEventHistory(testFilePath);

  // REPLAY: Load and reconstruct tree
  const replayedTree = await WorkflowTreeDebugger.replay(testFilePath);

  // ASSERT: Verify trees match
  expect(replayedTree.id).toBe(originalTree.id);
  expect(replayedTree.name).toBe(originalTree.name);
  expect(replayedTree.children.length).toBe(originalTree.children.length);
  verifyTreeMirror(replayedTree); // Use tree verification helper
});
```

### Integration Points

```yaml
EXISTING CODE:
  - uses: src/debugger/tree-debugger.ts (WorkflowTreeDebugger.loadEventHistory)
    pattern: "static async loadEventHistory(path: string): Promise<unknown[]>"
    location: "lines 637-678"

  - uses: src/debugger/event-replayer.ts (WorkflowEventReplayer.replay)
    pattern: "replay(events: WorkflowEvent[]): WorkflowNode"
    location: "lines 85-110"

  - uses: src/types/events.ts (WorkflowEvent type)
    pattern: "Discriminated union with type field"

NEW IMPORTS:
  - add to: src/debugger/tree-debugger.ts
    import: "import { WorkflowEventReplayer } from './event-replayer.js';"
    location: "Top of file, after other debugger imports (~line 13)"

NO OTHER CHANGES NEEDED:
  - Export is automatic (class already exported from src/index.ts)
  - No database changes
  - No config changes
  - No routing changes
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementing the replay() method - fix before proceeding
npx tsc --noEmit                    # TypeScript type checking
npx eslint src/debugger/tree-debugger.ts  # Linting (if eslint is configured)

# Project-wide validation
npx tsc --noEmit
npx eslint src/

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
# Common issues:
# - Missing import for WorkflowEventReplayer
# - Wrong return type (should be Promise<WorkflowNode>)
# - Missing await on loadEventHistory call
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new replay() method
npm test -- src/__tests__/unit/tree-debugger-persistence.test.ts

# Test related functionality (event replayer)
npm test -- src/__tests__/unit/event-replayer.test.ts

# Full test suite for debugger
npm test -- src/__tests__/unit/tree-debugger*.test.ts

# Coverage validation (if coverage tools available)
npm run test:coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# Common issues:
# - Type assertion missing: events as WorkflowEvent[]
# - Error messages not descriptive enough
# - Test file not cleaned up in afterEach
```

### Level 3: Integration Testing (System Validation)

```bash
# Test the full save/replay cycle
node -e "
const { WorkflowTreeDebugger, createWorkflow } = require('./dist/index.js');
const fs = require('fs/promises');

async function test() {
  const workflow = createWorkflow('Test', async (ctx) => {
    ctx.log('Test message');
  });
  const debugger1 = new WorkflowTreeDebugger(workflow, { persistEvents: true });
  await workflow.run();
  await debugger1.saveEventHistory('/tmp/test-replay.json');

  const tree = await WorkflowTreeDebugger.replay('/tmp/test-replay.json');
  console.log('Replay successful!');
  console.log('Tree ID:', tree.id);
  console.log('Tree stats:', JSON.stringify(debugger1.getStats()));
}

test().catch(console.error);
"

# Verify the reconstructed tree structure
node -e "
const { WorkflowTreeDebugger } = require('./dist/index.js');

async function test() {
  const tree = await WorkflowTreeDebugger.replay('/tmp/test-replay.json');
  console.log('Root:', tree.id, tree.name);
  console.log('Children:', tree.children.map(c => c.id));
  console.log('Events:', tree.events.length);
}

test().catch(console.error);
"

# Expected:
# - "Replay successful!" message
# - Valid tree ID and name
# - Children array with correct IDs
# - Events array with all event types

# Cleanup test file
rm -f /tmp/test-replay.json
```

### Level 4: Creative & Domain-Specific Validation

```bash
# WorkflowTreeDebugger Validation Examples:

# Test 1: Replay complex event sequence
node -e "
const { WorkflowTreeDebugger, createWorkflow } = require('./dist/index.js');
const fs = require('fs/promises');

async function test() {
  // Create workflow with multiple children and state changes
  const root = createWorkflow('Root', async (ctx) => {
    ctx.log('Root started');
  });

  const child1 = createWorkflow('Child1', async (ctx) => {
    ctx.log('Child1 started');
    ctx.snapshotState({ step: 1 });
  }, root);

  const child2 = createWorkflow('Child2', async (ctx) => {
    ctx.log('Child2 started');
    throw new Error('Test error');
  }, root);

  const debugger1 = new WorkflowTreeDebugger(root, { persistEvents: true });
  await root.run();

  const tree = root.getNode();
  console.log('Original tree:');
  console.log('  Nodes:', debugger1.getStats().totalNodes);
  console.log('  Errors:', tree.events.filter(e => e.type === 'error').length);

  await debugger1.saveEventHistory('/tmp/complex-test.json');
  const replayed = await WorkflowTreeDebugger.replay('/tmp/complex-test.json');

  console.log('Replayed tree:');
  console.log('  Nodes:', replayed.children.length + 1); // root + children
  console.log('  Errors:', replayed.events.concat(
    replayed.children[0].events,
    replayed.children[1].events
  ).filter(e => e.type === 'error').length);
}

test().catch(console.error);
"

# Test 2: Verify read-only nature (no live workflow)
node -e "
const { WorkflowTreeDebugger } = require('./dist/index.js');

async function test() {
  const tree = await WorkflowTreeDebugger.replay('/tmp/complex-test.json');

  // Verify tree has no live workflow attached
  console.log('Tree is standalone:', tree.parent === null || tree.parent !== undefined);
  console.log('Can access children:', tree.children.length > 0);
  console.log('Can access events:', tree.events !== undefined);

  // Try to modify (should not affect any live workflow)
  tree.name = 'Modified';
  console.log('Name changed (read-only modification allowed):', tree.name);
}

test().catch(console.error);
"

# Test 3: Performance test with large event history
node -e "
const { WorkflowTreeDebugger } = require('./dist/index.js');
const { performance } = require('perf_hooks');

async function test() {
  const startTime = performance.now();
  const tree = await WorkflowTreeDebugger.replay('/tmp/complex-test.json');
  const duration = performance.now() - startTime;

  console.log('Replay duration:', duration.toFixed(2), 'ms');
  console.log('Performance acceptable:', duration < 1000);
}

test().catch(console.error);
"

# Test 4: Error handling validation
node -e "
const { WorkflowTreeDebugger } = require('./dist/index.js');

async function test() {
  try {
    await WorkflowTreeDebugger.replay('/tmp/non-existent.json');
  } catch (error) {
    console.log('Error message:', error.message);
    console.log('Contains file path:', error.message.includes('/tmp/non-existent.json'));
    console.log('Contains helpful info:', error.message.includes('not found') || error.message.includes('file'));
  }
}

test().catch(console.error);
"

# Test 5: Tree visualization after replay
node -e "
const { WorkflowTreeDebugger } = require('./dist/index.js');

async function test() {
  const tree = await WorkflowTreeDebugger.replay('/tmp/complex-test.json');

  // Create a temporary debugger to use toTreeString and getStats
  const debugger2 = new WorkflowTreeDebugger({ getNode: () => tree });
  console.log('\\nReplayed Tree Structure:');
  console.log(debugger2.toTreeString(tree));
  console.log('\\nReplayed Tree Stats:');
  console.log(JSON.stringify(debugger2.getStats(), null, 2));
}

test().catch(console.error);
"

# Expected:
# - All tests run without crashes
# - Tree structure is correctly reconstructed
# - Events are properly accumulated
# - Error messages are descriptive
# - Performance is acceptable (< 1 second for typical workflows)
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] No linting errors: `npx eslint src/debugger/tree-debugger.ts` (if configured)
- [ ] All new tests pass: `npm test -- src/__tests__/unit/tree-debugger-persistence.test.ts`
- [ ] All existing tests still pass: `npm test`
- [ ] Method signature matches specification: `static async replay(path: string): Promise<WorkflowNode>`
- [ ] JSDoc documentation is complete with @param, @returns, @throws, @example

### Feature Validation

- [ ] Successfully loads events from file using `loadEventHistory()`
- [ ] Successfully creates `WorkflowEventReplayer` instance
- [ ] Successfully calls `replayer.replay(events as WorkflowEvent[])`
- [ ] Returns correct `WorkflowNode` type
- [ ] Throws descriptive error for non-existent file (includes file path)
- [ ] Throws descriptive error for invalid JSON
- [ ] Throws descriptive error for empty events array
- [ ] Reconstructed tree has correct structure (parent-child bidirectional links)
- [ ] Reconstructed tree has correct node states (stateSnapshot, events)
- [ ] Reconstructed tree is read-only (no live workflow attached)

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches `loadEventHistory` structure)
- [ ] Uses `async/await` consistently
- [ ] Error handling wraps and enhances error messages with context
- [ ] Type assertion `events as WorkflowEvent[]` is used correctly
- [ ] Import for `WorkflowEventReplayer` is added at top of file
- [ ] No circular reference issues
- [ ] No RxJS imports (uses custom Observable)
- [ ] Test file cleanup in `afterEach` hook
- [ ] Console mocking with `vi.spyOn` and `vi.restoreAllMocks`

### Documentation & Deployment

- [ ] JSDoc includes @example showing save/replay cycle
- [ ] JSDoc includes @throws for all error cases
- [ ] JSDoc clearly states the method is a convenience wrapper
- [ ] Code is self-documenting with clear variable names
- [ ] Error messages are informative and include file path

---

## Anti-Patterns to Avoid

- ❌ Don't create instance method - this MUST be a static method
- ❌ Don't skip type assertion - must use `events as WorkflowEvent[]`
- ❌ Don't catch and swallow errors - must rethrow with enhanced context
- ❌ Don't use synchronous file operations - must use `fs/promises`
- ❌ Don't create new Workflow instance - replay returns ONLY the node tree
- ❌ Don't modify existing test patterns - follow AAA structure
- ❌ Don't forget test file cleanup in `afterEach` - causes test pollution
- ❌ Don't use RxJS - codebase uses custom Observable
- ❌ Don't hardcode file paths - use `/tmp/` for tests
- ❌ Don't skip JSDoc documentation - public API requires docs
- ❌ Don't return `unknown` - must return `Promise<WorkflowNode>`
- ❌ Don't create new files - only modify existing files
- ❌ Don't modify `tasks.json`, `prd_snapshot.md`, or `.gitignore` - FORBIDDEN

## Context Completeness Validation

### "No Prior Knowledge" Test Results

If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:

1. **Exact File Locations**:
   - `src/debugger/tree-debugger.ts` - line numbers for where to add code
   - `src/debugger/event-replayer.ts` - reference for replay() method
   - `src/__tests__/unit/tree-debugger-persistence.test.ts` - test patterns
   - All type definitions with file paths

2. **Complete Code Patterns**:
   - Full `loadEventHistory()` implementation to follow
   - `WorkflowEventReplayer.replay()` signature and usage
   - Test helper functions (`createMockNode`)
   - Error handling patterns with specific error codes

3. **Type Definitions**:
   - `WorkflowNode` interface fully specified
   - `WorkflowEvent` discriminated union documented
   - Return type `Promise<WorkflowNode>` specified

4. **Test Patterns**:
   - AAA structure examples
   - Test file cleanup pattern
   - Mock patterns for console and file operations
   - Validation helpers from `tree-verification.ts`

5. **External Research**:
   - TypeScript static method best practices (URL included)
   - Time-travel debugging patterns (URL included)
   - Event sourcing reference (URL included)
   - Redux DevTools patterns (URL included)

6. **Gotchas and Constraints**:
   - Type assertion requirement for `events as WorkflowEvent[]`
   - Circular reference handling in WorkflowNode
   - Error code checking with `NodeJS.ErrnoException`
   - Custom Observable (not RxJS)
   - Vitest (not Jest) test framework

### Confidence Score

**9/10** - One-pass implementation success likelihood is very high.

**Remaining 1 point deduction**: Minor - Implementation requires careful attention to type assertion (`events as WorkflowEvent[]`) which could be missed without thorough review of the code. The PRP clearly documents this requirement multiple times, so a careful implementer should succeed.

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement the feature successfully using only the PRP content and codebase access.

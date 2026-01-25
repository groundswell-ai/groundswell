# PRP: Implement Replay Logic for Tree Structure Events

**PRP ID**: P2.M1.T1.S2
**Work Item**: Implement replay logic for tree structure events
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Implement the replay logic for tree structure events (`childAttached`, `childDetached`, `treeUpdated`) in the `WorkflowEventReplayer` class, enabling time-travel debugging by reconstructing workflow tree hierarchy from event streams.

**Deliverable**: Updated `src/debugger/event-replayer.ts` containing:
1. Implemented `replay()` method with sequential event processing
2. Implemented `handleChildAttached()` method with deep cloning and parent-child linking
3. Implemented `handleChildDetached()` method with BFS subtree removal
4. Implemented `handleTreeUpdated()` method with root reference updates
5. Implemented `buildNodeMap()` helper method for recursive map population
6. Implemented `removeSubtreeNodes()` helper method for iterative BFS removal
7. Cycle detection validation to prevent circular references
8. Comprehensive JSDoc documentation for all methods

**Success Definition**:
- `replay()` method processes events sequentially and returns reconstructed `WorkflowNode` root
- `childAttached` events add child nodes to parent's children array with bidirectional parent-child references
- `childDetached` events remove child nodes and all descendants from tree and nodeMap
- `treeUpdated` events update root reference
- All tree invariants maintained (single-parent rule, bidirectional links, no circular references)
- Deep cloning prevents mutation of original event data
- Code compiles without TypeScript errors
- All unit tests pass

---

## User Persona (if applicable)

**Target User**: Development team building time-travel debugging capabilities for workflow observability

**Use Case**: Developers need to replay past workflow executions to debug issues, understand failure modes, and reconstruct tree state at arbitrary points in event history

**User Journey**:
1. Developer observes a workflow execution failure in production
2. Developer retrieves the event stream from the failed workflow (persisted events)
3. Developer passes events to `WorkflowEventReplayer.replay()` to reconstruct the workflow tree
4. Developer inspects the reconstructed tree to understand the failure context
5. Developer uses tree for debugging, visualization, or testing

**Pain Points Addressed**:
- Cannot reproduce past workflow failures offline
- Cannot inspect workflow state at arbitrary points in execution
- Cannot test event-driven architecture without running actual workflows
- No way to "rewind" and inspect workflow state at specific events

---

## Why

**Business Value and User Impact**:
- **Time-travel debugging**: Reconstruct workflow state at any point in execution history
- **Offline repro**: Debug past failures without needing to re-run workflows
- **Testing**: Test event-driven architecture with recorded event streams
- **Observability**: Understand workflow evolution through event replay

**Integration with Existing Features**:
- **Extends**: `WorkflowEventReplayer` - adds implementation to interface defined in P2.M1.T1.S1
- **Leverages**: `WorkflowEvent` types - uses structural events (childAttached, childDetached, treeUpdated)
- **Follows**: Map-based node tracking pattern from `WorkflowTreeDebugger`
- **Reuses**: Tree mutation patterns from `Workflow.attachChild()` and `Workflow.detachChild()`

**Problems This Solves**:
- P2.M1.T1.S1 defined the interface but threw "Not implemented" errors
- No existing way to reconstruct workflow state from events
- Current `WorkflowTreeDebugger` only shows real-time state, not historical
- Cannot debug workflows that have already completed

---

## What

**User-Visible Behavior**:
After implementation, developers will be able to:
```typescript
import { WorkflowEventReplayer } from 'groundswell';

// Reconstruct workflow tree from events
const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(eventStream);

// Inspect reconstructed tree
console.log(tree.status);
console.log(tree.children.length);
console.log(tree.children[0].parent === tree); // true - bidirectional link maintained
```

**Technical Requirements**:
1. **Sequential Event Processing**: Process events in order, maintaining accumulated state
2. **Deep Cloning**: Clone nodes from events to prevent mutation of original data
3. **Bidirectional Parent-Child Links**: Maintain `parent.children` AND `child.parent` consistency
4. **Map-Based Node Tracking**: Use `Map<string, WorkflowNode>` for O(1) lookups
5. **BFS Subtree Removal**: Remove subtrees iteratively to prevent stack overflow
6. **Cycle Detection**: Validate no circular references before attaching nodes
7. **Root Establishment**: Track and return root node from replay

**Event Handlers to Implement**:

| Event Type | Handler Method | Action |
|------------|----------------|--------|
| `childAttached` | `handleChildAttached()` | Deep clone child, set parent bidirectionally, add to nodeMap |
| `childDetached` | `handleChildDetached()` | Remove from parent.children, clear parent refs, remove subtree from nodeMap |
| `treeUpdated` | `handleTreeUpdated()` | Update root reference |

**Helper Methods to Implement**:

| Method | Purpose |
|--------|---------|
| `buildNodeMap()` | Recursively add subtree to nodeMap (DFS) |
| `removeSubtreeNodes()` | Iteratively remove subtree from nodeMap (BFS) |
| `isNodeDescendantOf()` | Check for circular references before attach |

### Success Criteria

- [ ] `replay()` method processes event stream and returns root `WorkflowNode`
- [ ] `childAttached` events correctly add children with bidirectional links
- [ ] `childDetached` events correctly remove children and descendants
- [ ] `treeUpdated` events correctly update root reference
- [ ] All tree invariants maintained (verified by tests)
- [ ] Deep cloning prevents event data mutation
- [ ] Cycle detection prevents circular references
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All tests pass: `npm test`

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact implementation patterns from the codebase, specific code snippets to follow, validation logic requirements, performance considerations, gotchas to avoid, and comprehensive test patterns. An implementer unfamiliar with the codebase can implement the replay logic using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P2M1T1S1/PRP.md
  why: Defines the interface - assumes WorkflowEventReplayer class skeleton exists
  critical: replay() method signature, handler method stubs, internal state structure (nodeMap, root)

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P2M1T1S2/research/tree-structure-patterns.md
  why: Complete analysis of tree manipulation patterns in codebase
  section: Pattern 1.1 (Dual Tree Synchronization), Pattern 1.3 (BFS Subtree Removal), Gotcha 5.2 (Reparenting), Gotcha 5.8 (Mirror Invariant)
  critical: Always update both workflow tree AND node tree; use BFS for subtree removal; validate before mutate

- docfile: plan/002_6761e4b84fd1/P2M1T1S2/research/event-handling-patterns.md
  why: Event processing patterns, discriminated union handling, error isolation
  section: Section 2.2 (TypeScript Narrowing), Section 6.1 (Recommended Architecture)
  critical: Switch statement for event dispatch; try-catch per event; continue on error

- docfile: plan/002_6761e4b84fd1/P2M1T1S2/research/event-replay-best-practices.md
  why: Deep cloning strategies, immutability patterns, reducer patterns
  section: Section 4.1 (structuredClone), Section 5.3 (Immutability Gotchas), code.1 (Reducer Pattern)
  critical: Use structuredClone() for deep cloning; never mutate event data; pure functions only

- docfile: plan/002_6761e4b84fd1/P2M1T1S2/research/test-patterns.md
  why: Test patterns for validation, helper functions to use
  section: Section 3 (Event Testing Patterns), Section 7 (Event Replay Specific Patterns), code.3 (verifyBidirectionalLink)
  critical: Test event stream creation; verify bidirectional links; use tree-verification helpers

# Core Source Files (IMPLEMENTATION PATTERNS)
- file: src/debugger/tree-debugger.ts
  why: Reference implementation for buildNodeMap and removeSubtreeNodes patterns
  section: Lines 53-58 (buildNodeMap), lines 65-84 (removeSubtreeNodes), lines 92-117 (onEvent switch statement)
  pattern: Recursive DFS for map building; iterative BFS for subtree removal; switch on event.type

- file: src/core/workflow.ts
  why: Reference implementation for attachChild and detachChild (validation + mutation)
  section: Lines 316-355 (attachChild), lines 379-408 (detachChild), lines 201-219 (isDescendantOf)
  pattern: Validate first (duplicate, single-parent, cycle); then mutate both trees; emit event after

# Type Definitions
- file: src/types/events.ts
  why: Complete WorkflowEvent discriminated union with all 15+ event types
  section: Lines 10-11 (childAttached, childDetached), line 18 (treeUpdated)
  critical: childAttached has `child: WorkflowNode`; childDetached has only `childId: string`

- file: src/types/workflow.ts
  why: WorkflowNode interface structure
  section: Lines 20-37 (WorkflowNode interface)
  critical: id, name, parent, children, status, logs, events, stateSnapshot fields

# Test Helpers (for validation)
- file: src/__tests__/helpers/tree-verification.ts
  why: Reusable verification functions for tree invariants
  section: verifyBidirectionalLink(), verifyTreeMirror(), verifyOrphaned(), validateTreeConsistency()
  pattern: Helper functions throw descriptive errors if invariants violated

# Test Files (for reference patterns)
- file: src/__tests__/unit/tree-debugger-incremental.test.ts
  why: Tests for incremental tree update patterns
  section: Lines 11-39 (childDetached removes entire subtree test)
  pattern: Verify nodeMap size after operations; verify parent/child relationships

- file: src/__tests__/integration/bidirectional-consistency.test.ts
  why: Tests for 1:1 tree mirror invariant
  pattern: Verify both workflow tree AND node tree stay synchronized

# Previous Research (S1 context)
- docfile: plan/002_6761e4b84fd1/P2M1T1S1/research/debugger-patterns-research.md
  why: High-level patterns from S1 research
  section: "Key Patterns to Reuse"
  critical: buildNodeMap() DFS pattern; removeSubtreeNodes() BFS pattern; onEvent() switch pattern

- docfile: plan/002_6761e4b84fd1/P2M1T1S1/research/event-replay-best-practices.md
  why: Event replay architecture patterns from S1
  section: "Reducer-Based Replay" pattern
  critical: Sequential event processing; state accumulation; return final state
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── debugger/
│   │   ├── tree-debugger.ts           # EXISTING - Reference patterns
│   │   └── event-replayer.ts          # MODIFY - Add implementation to stubs from S1
│   ├── types/
│   │   ├── events.ts                  # REFERENCE - WorkflowEvent types
│   │   ├── workflow.ts                # REFERENCE - WorkflowNode interface
│   │   └── ...
│   ├── core/
│   │   └── workflow.ts                # REFERENCE - Tree mutation patterns
│   └── __tests__/
│       ├── unit/
│       │   └── event-replayer.test.ts # CREATE - Tests for replay logic
│       └── helpers/
│           └── tree-verification.ts   # REFERENCE - Verification helpers
└── plan/002_6761e4b84fd1/
    ├── P2M1T1S1/
    │   └── PRP.md                     # REFERENCE - Interface contract from S1
    └── P2M1T1S2/
        ├── PRP.md                     # THIS FILE
        └── research/
            ├── tree-structure-patterns.md         # Created - Tree manipulation patterns
            ├── event-handling-patterns.md         # Created - Event processing patterns
            ├── event-replay-best-practices.md     # Created - Deep cloning, immutability
            └── test-patterns.md                   # Created - Test patterns
```

### Desired Codebase Tree

```bash
# No new files - implementation goes into existing event-replayer.ts
# All handler methods get full implementations (replacing throw new Error stubs)
# New test file created for validation
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Dual Tree Architecture (The 1:1 Mirror Invariant)
// - The codebase maintains TWO synchronized trees: Workflow tree and Node tree
// - EVERY operation must update BOTH trees
// - Pattern: child.parent = parent AND child.node.parent = parent.node
// - Pattern: this.children.push(child) AND this.node.children.push(child.node)
// - Gotcha 5.8: Forgetting to update node tree breaks mirror invariant
// Reference: src/core/workflow.ts:343-347

// CRITICAL: childAttached Event Has Full Node, childDetached Has Only ID
// - childAttached: { type: 'childAttached', parentId: string, child: WorkflowNode }
// - childDetached: { type: 'childDetached', parentId: string, childId: string }
// - Reason: Detached node may have been garbage collected, ID is sufficient
// - Gotcha 5.9: Don't try to access event.child in childDetached handler
// Reference: src/types/events.ts:10-11

// CRITICAL: Deep Cloning Required to Prevent Event Data Mutation
// - Events contain references to nodes from original execution
// - Must clone before adding to replay tree to avoid mutating original
// - Use structuredClone() for deep cloning (modern, fast, handles most types)
// - Gotcha: Shallow copy ({...node}) creates shared references to nested objects
// - Reference: plan/002_6761e4b84fd1/P2M1T1S2/research/event-replay-best-practices.md Section 4.1

// CRITICAL: Single-Parent Rule Must Be Enforced
// - A node can have at most one parent
// - If child already has a different parent, must detach first
// - Gotcha 5.2: Attaching child with different parent throws error
// - Validation: Check if child.parent exists and is not current parent
// - Reference: src/core/workflow.ts:322-329

// CRITICAL: Circular Reference Detection Required
// - Attaching ancestor as its own descendant creates cycle
// - Must check with isDescendantOf() before attaching
// - Gotcha 5.5: Cycle detection uses visited Set to detect infinite loops
// - Pattern: Traverse parent chain, track visited nodes, throw if cycle found
// - Reference: src/core/workflow.ts:201-219

// CRITICAL: BFS for Subtree Removal (Not DFS)
// - Use iterative BFS to prevent stack overflow on deep trees
// - Pattern: Queue-based traversal with array.shift() and array.push()
// - Collect all descendant IDs first, then batch delete
// - Gotcha 5.6: Recursive buildNodeMap() is OK, but removal must be iterative
// - Reference: src/debugger/tree-debugger.ts:65-84

// CRITICAL: Map Must Stay Synchronized with Tree Structure
// - After attach: Add child and all descendants to nodeMap
// - After detach: Remove child and all descendants from nodeMap
// - Gotcha 5.3: If map not updated, lookups return stale/orphaned nodes
// - Pattern: Call buildNodeMap(child) on attach; removeSubtreeNodes(childId) on detach
// - Reference: src/debugger/tree-debugger.ts:95-103

// CRITICAL: Array indexOf vs includes
// - indexOf() returns index (needed for splice)
// - includes() returns boolean (for existence check)
// - Gotcha 5.10: Use indexOf when you need index for splice operation
// - Reference: src/core/workflow.ts:317 (includes) vs :381 (indexOf)

// CRITICAL: Discriminated Union Type Narrowing
// - WorkflowEvent uses 'type' field as discriminant
// - TypeScript narrows type in switch statement automatically
// - Pattern: switch (event.type) { case 'childAttached': /* can access event.child */ }
// - Use Extract<WorkflowEvent, { type: 'childAttached' }> for method signatures
// - Reference: plan/002_6761e4b84fd1/P2M1T1S2/research/event-handling-patterns.md Section 2.2

// CRITICAL: Error Isolation During Replay
// - Catch errors per-event, don't let one event fail entire replay
// - Log error with console.error(), continue processing subsequent events
// - Only throw if root cannot be established after all events processed
// - Reference: plan/002_6761e4b84fd1/P2M1T1S2/research/event-handling-patterns.md Section 6.1

// CRITICAL: Root Node Tracking
// - First childAttached with parentId that doesn't exist in map establishes root
// - Or treeUpdated event sets root explicitly
// - Must track root separately (private root field)
// - Return root at end of replay()
// - Reference: P2.M1.T1.S1 PRP, Internal State Structure section

// CRITICAL: No Existing Root Helper in EventReplayer
// - Workflow class has getRoot() method that traverses parent chain
// - EventReplayer doesn't have Workflow instances, only WorkflowNode
// - Must track root manually via private root field and treeUpdated events
// - Root is the node with parent === null

// CRITICAL: Validation Order Matters
// - Check simple conditions before expensive traversals
// - Order: 1) Duplicate check, 2) Single-parent check, 3) Cycle detection
// - Fail fast: throw immediately on first validation failure
// - Reference: src/core/workflow.ts:317-338

// CRITICAL: Event Contains Different Data Types
// - childAttached: event.child is WorkflowNode (full object)
// - childDetached: event.childId is string (only ID)
// - treeUpdated: event.root is WorkflowNode (full object)
// - Handlers must access correct properties based on event type
// - Reference: src/types/events.ts:10-11, :18

// CRITICAL: Bidirectional Links Must Be Set Correctly
// - Attach: child.parent = parent; parent.children.push(child)
// - Detach: child.parent = null; parent.children.splice(index, 1)
// - Both directions must be updated atomically
// - Gotcha 5.8: Forgetting one direction breaks mirror invariant
// - Reference: src/core/workflow.ts:343-347 (attach) and :399-400 (detach)

// CRITICAL: treeUpdated Event Represents Full Tree Replacement
// - Rare in practice; most updates use childAttached/childDetached
// - Sets this.root = event.root directly
// - Should rebuild nodeMap from new root (call buildNodeMap(event.root))
// - Reference: src/debugger/tree-debugger.ts:105-108

// CRITICAL: State Events Not Implemented in This PRP
// - stateSnapshot and error events are handled in P2.M1.T1.S3
// - This PRP only implements structural events (childAttached, childDetached, treeUpdated)
// - Non-structural events should be logged but don't modify tree
// - Reference: P2.M1.T1.S1 PRP, Phase 1 vs Phase 2 Scope section
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - uses existing types from P2.M1.T1.S1:

```typescript
// INPUT TYPE (from src/types/events.ts)
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }  // Has full node
  | { type: 'childDetached'; parentId: string; childId: string }      // Has only ID
  | { type: 'treeUpdated'; root: WorkflowNode }
  // ... other event types (handled in P2.M1.T1.S3)

// OUTPUT TYPE (from src/types/workflow.ts)
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

// INTERNAL STATE (from P2.M1.T1.S1 PRP)
class WorkflowEventReplayer {
  private nodeMap: Map<string, WorkflowNode> = new Map();  // O(1) node lookups
  private root: WorkflowNode | null = null;                 // Root reference
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: IMPLEMENT buildNodeMap() helper method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private buildNodeMap(node: WorkflowNode): void
  - IMPLEMENTATION: Recursive DFS traversal to add node and descendants to nodeMap
  - PATTERN: Follow tree-debugger.ts:53-58 exactly
  - LOGIC:
    * Set nodeMap.set(node.id, node)
    * For each child: recurse with buildNodeMap(child)
  - COMPLEXITY: O(k) where k = number of nodes in subtree
  - PLACEMENT: After constructor, before handler methods

Task 2: IMPLEMENT removeSubtreeNodes() helper method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private removeSubtreeNodes(nodeId: string): void
  - IMPLEMENTATION: Iterative BFS traversal to remove subtree from nodeMap
  - PATTERN: Follow tree-debugger.ts:65-84 exactly
  - LOGIC:
    * Get node from nodeMap, return if not found (no-op safe)
    * Initialize queue with node, toRemove array
    * While queue not empty: shift current, add ID to toRemove, push children
    * Batch delete all collected keys
  - COMPLEXITY: O(k) where k = number of nodes in subtree
  - PLACEMENT: After buildNodeMap()

Task 3: IMPLEMENT isNodeDescendantOf() helper method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private isNodeDescendantOf(node: WorkflowNode, potentialAncestor: WorkflowNode): boolean
  - IMPLEMENTATION: Traverse parent chain with visited Set for cycle detection
  - PATTERN: Follow workflow.ts:201-219 (isDescendantOf method)
  - LOGIC:
    * Initialize visited Set, start at node.parent
    * While current not null: check if visited (throw), check if ancestor (return true), add to visited, move to parent
    * Return false if end of chain reached
  - COMPLEXITY: O(d) where d = depth of hierarchy
  - PLACEMENT: After removeSubtreeNodes()

Task 4: IMPLEMENT handleChildAttached() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleChildAttached(event: Extract<WorkflowEvent, { type: 'childAttached' }>): void
  - PARAMETER: Extract<WorkflowEvent, { type: 'childAttached' }> for type safety
  - IMPLEMENTATION: Deep clone child, set bidirectional parent-child links, add to nodeMap
  - VALIDATION (before mutation):
    * Check if parent exists in nodeMap (throw clear error if not)
    * Check if child already exists in nodeMap with different parent (single-parent rule)
    * Check if child is ancestor of parent (circular reference)
  - CLONING: Use structuredClone(event.child) for deep clone
  - LOGIC (after validation):
    * Set clonedChild.parent = parent
    * Set parent.children.push(clonedChild)
    * Add to nodeMap via buildNodeMap(clonedChild)
    * If this.root is null and parent.parent is null, set this.root = parent (root establishment)
  - PATTERN: Follow workflow.ts:316-355 for validation and mutation
  - PLACEMENT: After helper methods

Task 5: IMPLEMENT handleChildDetached() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void
  - PARAMETER: Extract<WorkflowEvent, { type: 'childDetached' }> for type safety
  - IMPLEMENTATION: Remove child from parent, clear parent reference, remove subtree from nodeMap
  - VALIDATION:
    * Check if parent exists in nodeMap (log warning if not, return early)
    * Check if child exists in nodeMap (log warning if not, return early)
    * Check if child is direct child of parent (verify parent.children includes child)
  - LOGIC (after validation):
    * Find child index in parent.children: parent.children.indexOf(child)
    * Remove from parent.children: parent.children.splice(index, 1)
    * Clear child.parent = null
    * Remove subtree from nodeMap: removeSubtreeNodes(event.childId)
  - PATTERN: Follow tree-debugger.ts:100-103 and workflow.ts:379-408
  - PLACEMENT: After handleChildAttached()

Task 6: IMPLEMENT handleTreeUpdated() method
  - FILE: src/debugger/event-replayer.ts
  - METHOD: private handleTreeUpdated(event: Extract<WorkflowEvent, { type: 'treeUpdated' }>): void
  - PARAMETER: Extract<WorkflowEvent, { type: 'treeUpdated' }> for type safety
  - IMPLEMENTATION: Update root reference and rebuild nodeMap
  - VALIDATION: Verify event.root is not null/undefined
  - LOGIC:
    * Set this.root = event.root
    * Clear nodeMap: this.nodeMap.clear()
    * Rebuild nodeMap: buildNodeMap(event.root)
  - PATTERN: Follow tree-debugger.ts:105-108
  - PLACEMENT: After handleChildDetached()

Task 7: IMPLEMENT replay() method main logic
  - FILE: src/debugger/event-replayer.ts
  - METHOD: replay(events: WorkflowEvent[]): WorkflowNode
  - IMPLEMENTATION: Sequential event processing with error isolation
  - LOGIC:
    * Initialize empty nodeMap and null root
    * Validate events array not empty
    * For each event in events:
      - Wrap in try-catch
      - Switch on event.type
      - Case 'childAttached': call handleChildAttached(event)
      - Case 'childDetached': call handleChildDetached(event)
      - Case 'treeUpdated': call handleTreeUpdated(event)
      - Default: skip (non-structural event)
      - Catch: console.error with event type and error, continue processing
    * After loop, verify this.root is not null
    * Return this.root
  - PATTERN: Follow plan/002_6761e4b84fd1/P2M1T1S2/research/event-handling-patterns.md Section 6.1
  - PLACEMENT: Replace existing stub implementation

Task 8: UPDATE JSDoc documentation
  - Add comprehensive JSDoc to all implemented methods
  - Include @param, @returns, @throws tags
  - Include usage examples in @example tags
  - Document invariants maintained
  - Document complexity characteristics
  - PATTERN: Follow P2.M1.T1.S1 PRP JSDoc style

Task 9: CREATE unit tests
  - FILE: src/__tests__/unit/event-replayer.test.ts (NEW FILE)
  - TEST SUITES:
    * describe('WorkflowEventReplayer', () => { ... })
    * describe('replay()', () => { ... })
    * describe('handleChildAttached()', () => { ... })
    * describe('handleChildDetached()', () => { ... })
    * describe('handleTreeUpdated()', () => { ... })
  - TEST CASES:
    * should reconstruct tree from childAttached events
    * should maintain bidirectional parent-child links
    * should remove subtree on childDetached events
    * should update root on treeUpdated events
    * should handle missing parent gracefully (log warning, continue)
    * should throw error if events array is empty
    * should throw error if root not established after replay
    * should detect and prevent circular references
    * should enforce single-parent rule
    * should deep clone nodes to prevent event mutation
  - PATTERN: Follow test-patterns.md Section 7 (Event Replay Specific Patterns)
  - HELPERS: Use verifyBidirectionalLink() from tree-verification.ts

Task 10: VERIFY TypeScript compilation
  - RUN: npm run build
  - CHECK: No compilation errors
  - VERIFY: dist/debugger/event-replayer.js is created
  - VERIFY: dist/index.js exports WorkflowEventReplayer

Task 11: VERIFY all tests pass
  - RUN: npm test
  - CHECK: All new tests pass
  - CHECK: No existing tests broken

Task 12: VERIFY linting and formatting
  - RUN: npm run lint (if configured)
  - RUN: npm run format (if configured)
  - EXPECTED: Zero linting errors
```

### Implementation Patterns & Key Details

```typescript
/**
 * FILE: src/debugger/event-replayer.ts
 *
 * PATTERN: Follow existing tree-debugger.ts and workflow.ts patterns
 */

// Pattern 1: buildNodeMap() - Recursive DFS for map population
/**
 * Build node lookup map recursively.
 * Follows tree-debugger.ts:53-58 pattern exactly.
 *
 * @param node - Root of subtree to add to nodeMap
 * @complexity O(k) where k = number of nodes in subtree
 */
private buildNodeMap(node: WorkflowNode): void {
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);  // Recurse
  }
}

// Pattern 2: removeSubtreeNodes() - Iterative BFS for subtree removal
/**
 * Remove entire subtree from node map using BFS traversal.
 * Follows tree-debugger.ts:65-84 pattern exactly.
 *
 * @param nodeId - ID of root node of subtree to remove
 * @complexity O(k) where k = number of nodes in subtree
 */
private removeSubtreeNodes(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;  // No-op safe

  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);  // Add children for BFS
  }

  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}

// Pattern 3: isNodeDescendantOf() - Cycle detection with visited Set
/**
 * Check if node is descendant of potential ancestor.
 * Follows workflow.ts:201-219 pattern (isDescendantOf method).
 *
 * @param node - Node to check
 * @param potentialAncestor - Potential ancestor to search for
 * @returns true if ancestor found in parent chain
 * @throws {Error} If circular reference detected
 * @complexity O(d) where d = depth of hierarchy
 */
private isNodeDescendantOf(node: WorkflowNode, potentialAncestor: WorkflowNode): boolean {
  const visited = new Set<WorkflowNode>();
  let current: WorkflowNode | null = node.parent;

  while (current !== null) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);

    if (current === potentialAncestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

// Pattern 4: handleChildAttached() - Deep clone + validate + attach
/**
 * Handle childAttached event - add subtree to tree.
 *
 * **Strategy:**
 * 1. Deep clone event.child to avoid mutating original
 * 2. Validate: parent exists, single-parent rule, no circular references
 * 3. Set bidirectional parent-child links
 * 4. Add child and descendants to nodeMap via buildNodeMap()
 * 5. Establish root if this is the first attachment
 *
 * **Deep Cloning:** Uses structuredClone() for safe deep copy
 *
 * **Invariants:**
 * - Parent must exist in nodeMap (throw if not)
 * - Child must not already have a different parent (single-parent rule)
 * - No circular references (child must not be ancestor of parent)
 * - Bidirectional links: child.parent = parent AND parent.children includes child
 *
 * @param event - ChildAttachedEvent with parentId and child node
 * @throws {Error} If parent node not found
 * @throws {Error} If child already has a parent
 * @throws {Error} If attaching would create circular reference
 */
private handleChildAttached(event: Extract<WorkflowEvent, { type: 'childAttached' }>): void {
  // Deep clone child to prevent mutation of event data
  const child = structuredClone(event.child);

  // Find parent
  const parent = this.nodeMap.get(event.parentId);
  if (!parent) {
    throw new Error(`Parent node '${event.parentId}' not found in nodeMap during childAttached event`);
  }

  // Validation 1: Check if child already has a different parent (single-parent rule)
  if (child.parent !== null && child.parent !== parent) {
    throw new Error(
      `Child '${child.name}' already has a parent. A node can only have one parent.`
    );
  }

  // Validation 2: Check for circular references
  if (this.isNodeDescendantOf(parent, child)) {
    throw new Error(
      `Cannot attach '${child.name}' as child of '${parent.name}' - would create circular reference`
    );
  }

  // Set bidirectional parent-child links
  child.parent = parent;
  parent.children.push(child);

  // Add child and all descendants to nodeMap
  this.buildNodeMap(child);

  // Establish root if this is the first attachment and parent has no parent
  if (this.root === null && parent.parent === null) {
    this.root = parent;
  }
}

// Pattern 5: handleChildDetached() - Validate + remove + cleanup
/**
 * Handle childDetached event - remove subtree from tree.
 *
 * **Strategy:**
 * 1. Validate: parent and child exist in nodeMap, child is direct child of parent
 * 2. Remove child from parent.children array
 * 3. Clear child.parent reference
 * 4. Remove child and all descendants from nodeMap via removeSubtreeNodes()
 *
 * **Invariants:**
 * - Both parent and child must exist in nodeMap
 * - Child must be a direct child of parent (not just any descendant)
 *
 * **Error Handling:**
 * - Logs warning and returns early if parent or child not found
 * - Does not throw for missing nodes (replay continues)
 *
 * @param event - ChildDetachedEvent with parentId and childId
 */
private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void {
  // Find parent and child
  const parent = this.nodeMap.get(event.parentId);
  const child = this.nodeMap.get(event.childId);

  if (!parent) {
    console.warn(`Parent node '${event.parentId}' not found in nodeMap during childDetached event`);
    return;
  }

  if (!child) {
    console.warn(`Child node '${event.childId}' not found in nodeMap during childDetached event`);
    return;
  }

  // Validate child is direct child of parent
  const index = parent.children.indexOf(child);
  if (index === -1) {
    console.warn(
      `Child '${child.name}' is not a direct child of parent '${parent.name}' during childDetached event`
    );
    return;
  }

  // Remove from parent's children array
  parent.children.splice(index, 1);

  // Clear child's parent reference
  child.parent = null;

  // Remove child and all descendants from nodeMap
  this.removeSubtreeNodes(event.childId);
}

// Pattern 6: handleTreeUpdated() - Root update + map rebuild
/**
 * Handle treeUpdated event - update root reference.
 *
 * **Strategy:**
 * 1. Validate event.root is not null/undefined
 * 2. Update this.root reference
 * 3. Clear and rebuild nodeMap from new root
 *
 * **Use Case:**
 * - Represents a complete tree replacement (not incremental update)
 * - Rare in practice; most updates use childAttached/childDetached
 *
 * @param event - TreeUpdatedEvent with new root node
 * @throws {Error} If event.root is null or undefined
 */
private handleTreeUpdated(event: Extract<WorkflowEvent, { type: 'treeUpdated' }>): void {
  if (!event.root) {
    throw new Error('treeUpdated event has null or undefined root');
  }

  this.root = event.root;

  // Clear and rebuild nodeMap from new root
  this.nodeMap.clear();
  this.buildNodeMap(event.root);
}

// Pattern 7: replay() - Sequential event processing with error isolation
/**
 * Replay a sequence of workflow events to reconstruct the workflow tree.
 *
 * **Event Processing Strategy:**
 * - Processes events sequentially in order
 * - Uses try-catch per event to isolate errors
 * - Logs errors and continues processing on failure
 * - Throws only if root cannot be established
 *
 * **Phase 1 - Structural Events** (this PRP):
 * - `childAttached`: Add new child node to parent's children array
 * - `childDetached`: Remove child and all descendants from tree
 * - `treeUpdated`: Update root reference to new tree
 *
 * **Phase 2 - State Events** (future PRP P2.M1.T1.S3):
 * - `stateSnapshot`: Update node's stateSnapshot field
 * - `error`: Record error information on node
 *
 * **Phase 3 - Metadata Events** (logged but don't modify tree):
 * - `agentPromptStart/End`, `toolInvocation`, `mcpEvent`, etc.
 *
 * @param events - Array of workflow events in chronological order
 * @returns Root node of the reconstructed workflow tree
 * @throws {Error} If events array is empty
 * @throws {Error} If root cannot be established from events
 */
replay(events: WorkflowEvent[]): WorkflowNode {
  // Validate input
  if (!events || events.length === 0) {
    throw new Error('Events array is empty or null');
  }

  // Initialize state
  this.nodeMap.clear();
  this.root = null;

  // Process events sequentially
  for (const event of events) {
    try {
      switch (event.type) {
        case 'childAttached':
          this.handleChildAttached(event);
          break;

        case 'childDetached':
          this.handleChildDetached(event);
          break;

        case 'treeUpdated':
          this.handleTreeUpdated(event);
          break;

        default:
          // Non-structural events - skip for now (handled in P2.M1.T1.S3)
          break;
      }
    } catch (error) {
      // Log error but continue processing subsequent events
      console.error(`Error processing event type '${event.type}':`, error);
    }
  }

  // Verify root was established
  if (!this.root) {
    throw new Error('No root node established from event stream');
  }

  return this.root;
}
```

### Integration Points

```yaml
NO NEW INTEGRATION POINTS
  - This PRP only adds implementation to existing event-replayer.ts file
  - No modifications to other files required
  - No new dependencies
  - Exports already configured in P2.M1.T1.S1

TEST FILE CREATION:
  - file: src/__tests__/unit/event-replayer.test.ts (NEW)
  - pattern: Follow tree-debugger.test.ts structure
  - helpers: Use tree-verification.ts for invariant validation
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementation - fix before proceeding
npm run build                    # TypeScript compilation
# Expected: Zero errors. dist/debugger/event-replayer.js is created

# Linting (if configured)
npm run lint                    # ESLint or equivalent
# Expected: Zero errors

# Formatting (if configured)
npm run format                  # Prettier or equivalent
# Expected: Consistent formatting applied

# Manual verification
grep -c "private buildNodeMap" src/debugger/event-replayer.ts  # Should be 1
grep -c "private removeSubtreeNodes" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleChildAttached" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleChildDetached" src/debugger/event-replayer.ts  # Should be 1
grep -c "private handleTreeUpdated" src/debugger/event-replayer.ts  # Should be 1
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the event replayer
npm test src/__tests__/unit/event-replayer.test.ts

# Full test suite for affected areas
npm test

# Expected: All tests pass
# - childAttached events correctly add children
# - childDetached events correctly remove subtrees
# - treeUpdated events correctly update root
# - Bidirectional links maintained
# - Single-parent rule enforced
# - Circular references prevented
# - Deep cloning prevents event mutation
# - Error handling is graceful (log and continue)
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify replayer integrates with existing code
npm test src/__tests__/integration/

# Manual integration test (create test script)
# Create a simple workflow, capture events, replay them, verify tree matches

# Expected: Integration tests pass, replayer works with real event streams
```

### Level 4: Manual Verification (Domain-Specific Validation)

```bash
# Create test script to verify replay manually
cat > test-replay.js << 'EOF'
import { WorkflowEventReplayer } from './dist/index.js';

// Create mock event stream
const events = [
  {
    type: 'childAttached',
    parentId: 'root',
    child: {
      id: 'child1',
      name: 'Child1',
      parent: null,
      children: [],
      status: 'idle',
      logs: [],
      events: [],
      stateSnapshot: null
    }
  }
];

const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(events);
console.log('Root:', tree.name);
console.log('Children:', tree.children.length);
console.log('Child name:', tree.children[0].name);
console.log('Bidirectional link:', tree.children[0].parent === tree);
EOF

node test-replay.js
# Expected: Output shows correct tree structure and bidirectional links
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `buildNodeMap()` method implemented with recursive DFS
- [ ] `removeSubtreeNodes()` method implemented with iterative BFS
- [ ] `isNodeDescendantOf()` method implemented with cycle detection
- [ ] `handleChildAttached()` method implemented with deep cloning and validation
- [ ] `handleChildDetached()` method implemented with graceful error handling
- [ ] `handleTreeUpdated()` method implemented with root update and map rebuild
- [ ] `replay()` method implemented with sequential event processing
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All methods have comprehensive JSDoc documentation
- [ ] Test file created at `src/__tests__/unit/event-replayer.test.ts`

### Feature Validation

- [ ] `childAttached` events add children with bidirectional links
- [ ] `childDetached` events remove children and descendants
- [ ] `treeUpdated` events update root reference
- [ ] Single-parent rule enforced (validation throws error)
- [ ] Circular references prevented (validation throws error)
- [ ] Deep cloning prevents event data mutation
- [ ] Missing parent/child handled gracefully (log warning, continue)
- [ ] Root established from first attachment or treeUpdated event

### Code Quality Validation

- [ ] Follows existing patterns from `tree-debugger.ts` and `workflow.ts`
- [ ] Uses Map-based node tracking for O(1) lookups
- [ ] Uses discriminated union pattern (Extract<WorkflowEvent, ...>)
- [ ] Deep cloning with `structuredClone()`
- [ ] Error isolation with try-catch per event
- [ ] No modification to existing types
- [ ] No new dependencies added

### Test Coverage Validation

- [ ] Test for basic replay of childAttached events
- [ ] Test for replay of childDetached events
- [ ] Test for replay of treeUpdated events
- [ ] Test for bidirectional link verification
- [ ] Test for single-parent rule enforcement
- [ ] Test for circular reference prevention
- [ ] Test for deep cloning (event data not mutated)
- [ ] Test for error handling (missing nodes, empty events array)
- [ ] Test for root establishment

---

## Anti-Patterns to Avoid

- ❌ Don't mutate event data - always deep clone with `structuredClone()`
- ❌ Don't use shallow copy (`{...node}`) - creates shared references
- ❌ Don't forget to update BOTH parent and child references (bidirectional links)
- ❌ Don't use recursion for `removeSubtreeNodes()` - use iterative BFS to prevent stack overflow
- ❌ Don't throw errors for missing nodes in replay - log warning and continue
- ❌ Don't skip validation before mutations - validate first (duplicate, single-parent, cycle)
- ❌ Don't forget to add children to `nodeMap` on attach
- ❌ Don't forget to remove children from `nodeMap` on detach
- ❌ Don't use `event.child` in `childDetached` handler - it only has `childId`
- ❌ Don't process state events (stateSnapshot, error) in this PRP - that's P2.M1.T1.S3
- ❌ Don't let one event error fail entire replay - use try-catch per event
- ❌ Don't forget to establish root - track via `this.root` field
- ❌ Don't rebuild entire map on every event - use incremental updates
- ❌ Don't use `includes()` when you need `indexOf()` for splice operation
- ❌ Don't clear `nodeMap` on `treeUpdated` without rebuilding it

---

## References

### Research Files (plan/002_6761e4b84fd1/P2M1T1S2/research/)

- `tree-structure-patterns.md` - Tree manipulation patterns, dual tree architecture, validation logic, gotchas
- `event-handling-patterns.md` - Event processing patterns, discriminated union handling, error isolation
- `event-replay-best-practices.md` - Deep cloning strategies, immutability patterns, reducer patterns
- `test-patterns.md` - Test patterns, helper functions, verification patterns

### Source Files Referenced

- `src/debugger/tree-debugger.ts` - buildNodeMap, removeSubtreeNodes, onEvent patterns
- `src/core/workflow.ts` - attachChild, detachChild, isDescendantOf patterns
- `src/types/events.ts` - WorkflowEvent discriminated union
- `src/types/workflow.ts` - WorkflowNode interface
- `src/__tests__/helpers/tree-verification.ts` - Verification helper functions

### Previous PRP

- `plan/002_6761e4b84fd1/P2M1T1.S1/PRP.md` - Interface contract, method signatures, internal state structure

### External References

- MDN structuredClone(): https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html#discriminated-unions
- Event Sourcing Pattern: https://martinfowler.com/eaaDev/EventSourcing.html

---

**End of PRP**

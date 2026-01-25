# PRP: Define Replayer Interface and Event Handling Strategy

**PRP ID**: P2.M1.T1.S1
**Work Item**: Define replayer interface and event handling strategy
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Create a `WorkflowEventReplayer` class skeleton with a well-defined interface and documented event handling strategy, enabling time-travel debugging by replaying workflow events to reconstruct workflow tree state.

**Deliverable**: `src/debugger/event-replayer.ts` containing:
1. `WorkflowEventReplayer` class with `replay()` method signature
2. Comprehensive JSDoc documentation of event handling strategy for all 15+ event types
3. Type-safe discriminated union event handling pattern
4. Clear documentation of which events are handled in Phase 1 vs future phases

**Success Definition**:
- New file `src/debugger/event-replayer.ts` exists with `WorkflowEventReplayer` class
- `replay(events: WorkflowEvent[]): WorkflowNode` method is defined with clear signature
- JSDoc comments document the event handling strategy for each event type
- Code compiles without TypeScript errors
- Follows existing patterns from `WorkflowTreeDebugger` (Map-based node tracking, discriminated union handling)
- No implementation logic yet (this is Phase 1: interface definition only; Phase 2 will implement full replay logic)

---

## User Persona (if applicable)

**Target User**: Development team building time-travel debugging capabilities for workflow observability

**Use Case**: Developers need to replay past workflow executions to debug issues, understand failure modes, and reconstruct tree state from event history

**User Journey**:
1. Developer observes a workflow execution failure in production
2. Developer retrieves the event stream from the failed workflow
3. Developer passes events to `WorkflowEventReplayer.replay()` to reconstruct the workflow tree
4. Developer inspects the reconstructed tree to understand the failure context
5. Developer uses the tree for debugging, visualization, or testing

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
- **Extends**: `WorkflowTreeDebugger` - adds replay capability to existing real-time debugger
- **Leverages**: `WorkflowEvent` types - uses existing 15+ event types
- **Follows**: Observer pattern from `WorkflowObserver` interface
- **Reuses**: Map-based node tracking pattern from `WorkflowTreeDebugger`

**Testing**:
- Phase 1: Interface definition (this PRP) - verify TypeScript compilation
- Phase 2: Implementation (future PRP P2.M1.T1.S2) - unit tests for replay logic
- Phase 3: Integration (future PRP P2.M1.T2.S2) - integration tests with debugger

**Problems This Solves**:
- No existing way to reconstruct workflow state from events
- Current `WorkflowTreeDebugger` only shows real-time state, not historical
- Cannot debug workflows that have already completed
- No way to validate event stream correctness

---

## What

**User-Visible Behavior**:
After implementation (Phase 2), developers will be able to:
```typescript
import { WorkflowEventReplayer } from 'groundswell';

// Reconstruct workflow tree from events
const replayer = new WorkflowEventReplayer();
const tree = replayer.replay(eventStream);

// Inspect reconstructed tree
console.log(tree.status);
console.log(tree.children);
```

**Technical Requirements (Phase 1 - This PRP)**:
1. Create `src/debugger/event-replayer.ts` with `WorkflowEventReplayer` class
2. Define `replay(events: WorkflowEvent[]): WorkflowNode` method signature
3. Document event handling strategy with JSDoc for each event type
4. Define internal state structure (`Map<string, WorkflowNode>`, `root`)
5. Follow discriminated union pattern for type-safe event handling
6. No implementation logic (just interface and documentation)

**Technical Requirements (Phase 2 - Future PRP)**:
7. Implement event handlers for structural events (`childAttached`, `childDetached`, `treeUpdated`)
8. Implement event handlers for state events (`stateSnapshot`, `error`)
9. Add tree validation after replay
10. Handle edge cases (missing parents, out-of-order events)

### Success Criteria

- [ ] File `src/debugger/event-replayer.ts` exists
- [ ] `WorkflowEventReplayer` class is exported
- [ ] `replay(events: WorkflowEvent[]): WorkflowNode` method defined
- [ ] JSDoc documentation describes event handling strategy
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] Code follows existing patterns from `WorkflowTreeDebugger`
- [ ] Phase 1 events clearly documented vs future events

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact file paths, type definitions, event handling strategies, existing patterns to follow, and comprehensive JSDoc examples. An implementer unfamiliar with the codebase can implement the interface using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P1M4T3S1/PRP.md
  why: Defines verified build output - assumes TypeScript compilation works
  critical: dist/ will be populated; use existing type definitions

# WorkflowEvent Type Definition (INPUT)
- file: src/types/events.ts
  why: Complete list of 15+ event types that replayer must handle
  section: Lines 8-75 (complete WorkflowEvent discriminated union)
  critical: Structural events (childAttached, childDetached, treeUpdated) modify tree; state events (stateSnapshot, error) update nodes; metadata events (agentPrompt*, toolInvocation, etc.) can be skipped in Phase 1
  pattern: Discriminated union with `type` field as discriminant

# WorkflowNode Structure (OUTPUT)
- file: src/types/workflow.ts
  why: Target data structure that replay() returns
  section: Lines 20-37 (WorkflowNode interface)
  critical: id, name, parent, children, status, logs, events, stateSnapshot fields
  pattern: Tree structure with bidirectional parent-child references

# Existing Pattern: WorkflowTreeDebugger
- file: src/debugger/tree-debugger.ts
  why: Reference implementation for Map-based node tracking and event handling
  section: Lines 25-255 (complete class implementation)
  critical: nodeMap: Map<string, WorkflowNode> pattern (line 33); buildNodeMap() recursive pattern (lines 53-58); removeSubtreeNodes() BFS pattern (lines 65-84); onEvent() discriminated union pattern (lines 92-117)
  pattern: Observer pattern implementation with Observable<WorkflowEvent>

# Observer Interface
- file: src/types/observer.ts
  why: WorkflowObserver interface that WorkflowTreeDebugger implements
  section: Lines 1-7 (WorkflowObserver interface)
  critical: onLog(), onEvent(), onStateUpdated(), onTreeChanged() methods
  pattern: Observer pattern for event-driven updates

# SerializedWorkflowState (for stateSnapshot events)
- file: src/types/snapshot.ts
  why: Type definition for state snapshot data in events
  section: Lines 1-14 (SerializedWorkflowState, StateFieldMetadata)
  critical: Record<string, unknown> - simple key-value structure

# WorkflowError (for error events)
- file: src/types/error.ts
  why: Error structure in error events
  section: Lines 7-20 (WorkflowError interface)
  critical: message, original, workflowId, stack, state, logs fields

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P2M1T1S1/research/debugger-patterns-research.md
  why: Complete analysis of existing debugger patterns, tree mutation patterns, test patterns
  section: All sections - especially "Key Patterns to Reuse" and "Replayer Design Recommendations"
  critical: buildNodeMap() pattern for subtree addition; removeSubtreeNodes() pattern for subtree removal; onEvent() switch statement pattern

- docfile: plan/002_6761e4b84fd1/P2M1T1S1/research/event-replay-best-practices.md
  why: Industry best practices for event replay systems, TypeScript patterns, testing approaches
  section: "Reducer-Based Replay" pattern for simple implementation; "TypeScript-Specific Patterns" for discriminated union handling
  critical: Reducer pattern for sequential event processing; Map vs Object performance guidance

# Architecture Research
- docfile: plan/002_6761e4b84fd1/architecture/OBSERVABILITY_PATTERNS_RESEARCH.md
  why: High-level architecture context for event replay system
  section: Lines 428-467 (Phase 2: Event Replay section)
  critical: "Time-travel debugging" use case; example WorkflowEventReplayer interface

# Test Patterns (for future implementation phase)
- file: src/__tests__/unit/tree-debugger.test.ts
  why: Reference test patterns for debugger testing
  section: All sections - test structure, assertions
  pattern: expect(debugger_.getNode(id)).toBe() for node lookup validation

- file: src/__tests__/unit/tree-debugger-incremental.test.ts
  why: Tests for incremental tree update patterns
  section: Lines 11-39 (childDetached removes entire subtree test)
  pattern: Verify nodeMap size after operations; verify parent/child relationships

# EventTreeHandleImpl (related tree building pattern)
- file: src/core/event-tree.ts
  why: Shows tree building from WorkflowNode pattern (similar to replay)
  section: Lines 102-130 (buildEventNode method)
  pattern: Recursive tree construction with parent reference handling
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── debugger/
│   │   ├── tree-debugger.ts           # EXISTING - Map-based node tracking pattern
│   │   └── event-replayer.ts          # TO CREATE - This PRP
│   ├── types/
│   │   ├── events.ts                  # REFERENCE - WorkflowEvent discriminated union
│   │   ├── workflow.ts                # REFERENCE - WorkflowNode interface
│   │   ├── observer.ts                # REFERENCE - WorkflowObserver interface
│   │   ├── snapshot.ts                # REFERENCE - SerializedWorkflowState type
│   │   └── error.ts                   # REFERENCE - WorkflowError interface
│   └── __tests__/
│       ├── unit/
│       │   ├── tree-debugger.test.ts  # REFERENCE - Test patterns
│       │   └── tree-debugger-incremental.test.ts  # REFERENCE - Incremental update tests
└── plan/002_6761e4b84fd1/
    ├── P2M1T1S1/
    │   ├── PRP.md                     # THIS FILE
    │   └── research/
    │       ├── debugger-patterns-research.md       # Created - Existing patterns analysis
    │       └── event-replay-best-practices.md      # Created - Industry best practices
    └── architecture/
        └── OBSERVABILITY_PATTERNS_RESEARCH.md  # REFERENCE - Event replay context
```

### Desired Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── debugger/
│   │   ├── tree-debugger.ts           # EXISTING
│   │   └── event-replayer.ts          # NEW - WorkflowEventReplayer class (this PRP)
│   └── types/
│       └── ...                        # EXISTING - No changes
└── src/index.ts                       # MODIFY - Export WorkflowEventReplayer
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Discriminated Union Handling
// - WorkflowEvent is a discriminated union with 'type' field as discriminant
// - TypeScript requires type narrowing before accessing event-specific fields
// - Pattern: switch (event.type) { case 'childAttached': /* can access event.child */ }

// CRITICAL: Map-Based Node Tracking
// - Use Map<string, WorkflowNode> for O(1) node lookups
// - Pattern from WorkflowTreeDebugger: private nodeMap: Map<string, WorkflowNode> = new Map()
// - Key pattern: nodeMap.set(node.id, node) for adding; nodeMap.get(id) for lookup

// CRITICAL: Tree Consistency Invariants
// - Single-parent rule: each node has at most one parent
// - Bidirectional references: parent.children includes child AND child.parent points to parent
// - No circular references: tree is a Directed Acyclic Graph (DAG)
// - During replay, must maintain these invariants

// CRITICAL: Event Categorization
// - Structural events (modify tree): childAttached, childDetached, treeUpdated
// - State events (update node): stateSnapshot, error
// - Metadata events (skip in Phase 1): agentPrompt*, toolInvocation, mcpEvent, reflection*, cache*, task*
// - This PRP (Phase 1) documents ALL events but only implements structural/state handlers later

// CRITICAL: Root Identification
// - First childAttached event with no parent reference establishes the root
// - All events should reference nodes that exist (or are being added)
// - Handle missing parent case gracefully (throw clear error)

// CRITICAL: Deep Cloning
// - Events contain references to WorkflowNode objects from the original execution
// - For replay, must deep clone nodes to avoid mutating original state
// - Pattern: JSON.parse(JSON.stringify(node)) or structuredClone() for deep copy

// CRITICAL: Phase 1 vs Phase 2 Scope
// - Phase 1 (this PRP): Interface definition, method signatures, JSDoc documentation only
// - Phase 2 (future PRP P2.M1.T1.S2): Implementation of structural event handlers
// - Phase 3 (future PRP P2.M1.T1.S3): Implementation of state event handlers
// - This PRP should NOT include implementation logic, only skeleton code

// CRITICAL: TypeScript Module System
// - Project uses ESM (import/export, not require/module.exports)
// - File extension required: import { WorkflowEvent } from './types/events.js'
// - Export from index.ts: export { WorkflowEventReplayer } from './debugger/event-replayer.js'

// CRITICAL: JSDoc Documentation Standards
// - Use JSDoc comments for all public methods
// - Include @param tags with types
// - Include @returns tags with types
// - Include @throws tags for error conditions
// - Include examples for complex methods

// CRITICAL: Test Patterns (for future implementation phase)
// - Use Vitest for testing (already configured)
// - Test file naming: event-replayer.test.ts
// - Test location: src/__tests__/unit/event-replayer.test.ts
// - Pattern: Given-When-Then structure in test descriptions

// CRITICAL: Observable Pattern (from WorkflowTreeDebugger)
// - WorkflowTreeDebugger has: public readonly events: Observable<WorkflowEvent>
// - Replayer may not need Observable (it's passive, not observing live events)
// - Replayer takes events as input, doesn't subscribe to event streams

// CRITICAL: stateSnapshot is Optional
// - WorkflowNode.stateSnapshot can be null
// - Not all nodes have state snapshots
// - Handle null case in event handlers

// CRITICAL: Error Context is Rich
// - WorkflowError includes state (SerializedWorkflowState) and logs (LogEntry[])
// - Preserve this context during replay for debugging
// - Don't strip error information
```

---

## Implementation Blueprint

### Data Models and Structure

This PRP creates an interface class. No new data models - uses existing types:

```typescript
// INPUT TYPE (from src/types/events.ts)
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  | { type: 'agentPromptStart'; agentId: string; agentName: string; promptId: string; node: WorkflowNode }
  | { type: 'agentPromptEnd'; agentId: string; agentName: string; promptId: string; node: WorkflowNode; duration: number; tokenUsage?: TokenUsage }
  | { type: 'toolInvocation'; toolName: string; input: unknown; output: unknown; duration: number; node: WorkflowNode }
  | { type: 'mcpEvent'; serverName: string; event: string; payload?: unknown; node: WorkflowNode }
  | { type: 'reflectionStart'; level: 'workflow' | 'agent' | 'prompt'; node: WorkflowNode }
  | { type: 'reflectionEnd'; level: 'workflow' | 'agent' | 'prompt'; success: boolean; node: WorkflowNode }
  | { type: 'cacheHit'; key: string; node: WorkflowNode }
  | { type: 'cacheMiss'; key: string; node: WorkflowNode };

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
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/debugger/event-replayer.ts
  - IMPLEMENT: WorkflowEventReplayer class with basic structure
  - FILE_LOCATION: /home/dustin/projects/groundswell/src/debugger/event-replayer.ts
  - NAMING: PascalCase class name (WorkflowEventReplayer), camelCase methods
  - EXPORT: export class WorkflowEventReplayer
  - STRUCTURE:
    * Private fields: nodeMap, root
    * Public method: replay()
    * Private method stubs: handleChildAttached(), handleChildDetached(), etc. (with JSDoc only)
  - DEPENDENCIES: Import types from src/types/
  - PLACEMENT: Alongside tree-debugger.ts in src/debugger/

Task 2: IMPLEMENT replay() method signature
  - METHOD: replay(events: WorkflowEvent[]): WorkflowNode
  - PARAM: events - Array of workflow events to replay
  - RETURNS: WorkflowNode - Root of reconstructed workflow tree
  - THROWS: Error if events array is empty or if root cannot be established
  - JSDOC: Complete documentation including parameters, returns, throws, examples
  - IMPLEMENTATION: Empty return statement with TODO comment (Phase 2 will implement)
  - PATTERN: Follow existing method documentation style from tree-debugger.ts

Task 3: DOCUMENT event handling strategy with JSDoc
  - FOR EACH of 15+ event types:
    * Add JSDoc comment describing handling strategy
    * Categorize: Structural (modifies tree) / State (updates node) / Metadata (skip in Phase 1)
    * Document: What fields are accessed, what mutations occur
    * Example: childAttached - "Deep clone child node, set parent reference, add to parent's children array, add to nodeMap"
  - PHASE 1 EVENTS (to be implemented in P2.M1.T1.S2):
    * childAttached: Add subtree to tree
    * childDetached: Remove subtree from tree
    * treeUpdated: Update root reference
  - PHASE 2 EVENTS (to be implemented in P2.M1.T1.S3):
    * stateSnapshot: Update node's stateSnapshot field
    * error: Add error to node (implementation TBD)
  - PHASE 3 EVENTS (future, skip for now):
    * agentPromptStart/End, toolInvocation, mcpEvent, reflectionStart/End, cacheHit/Miss, taskStart/End, stepStart/End

Task 4: DEFINE internal state structure
  - FIELD: private nodeMap: Map<string, WorkflowNode> = new Map()
  - FIELD: private root: WorkflowNode | null = null
  - PURPOSE: nodeMap for O(1) lookups (pattern from WorkflowTreeDebugger)
  - PURPOSE: root reference for return value
  - PATTERN: Follow WorkflowTreeDebugger structure exactly

Task 5: ADD method stubs with JSDoc (no implementation)
  - METHOD: private handleChildAttached(event: ChildAttachedEvent): void
  - METHOD: private handleChildDetached(event: ChildDetachedEvent): void
  - METHOD: private handleTreeUpdated(event: TreeUpdatedEvent): void
  - METHOD: private handleStateSnapshot(event: StateSnapshotEvent): void
  - METHOD: private handleErrorEvent(event: ErrorEvent): void
  - IMPLEMENTATION: Empty method bodies with throw new Error('Not implemented')
  - JSDOC: Full documentation of what each method WILL do in Phase 2/3

Task 6: MODIFY src/index.ts to export WorkflowEventReplayer
  - ADD: export { WorkflowEventReplayer } from './debugger/event-replayer.js'
  - LOCATION: After WorkflowTreeDebugger export (around line 50)
  - PRESERVE: All existing exports
  - VERIFY: Export matches ESM import pattern (.js extension)

Task 7: VERIFY TypeScript compilation
  - RUN: npm run build
  - CHECK: No compilation errors
  - VERIFY: src/debugger/event-replayer.ts is compiled to dist/debugger/event-replayer.js
  - VERIFY: dist/index.js exports WorkflowEventReplayer
  - EXPECTED: Clean build with no errors

Task 8: VERIFY linting and formatting
  - RUN: npm run lint (or equivalent ruff check command)
  - FIX: Any linting issues (indentation, spacing, quotes)
  - RUN: npm run format (or equivalent ruff format command)
  - EXPECTED: Zero linting errors, consistent formatting
```

### Implementation Patterns & Key Details

```typescript
/**
 * FILE: src/debugger/event-replayer.ts
 *
 * PATTERN: Follow WorkflowTreeDebugger structure exactly
 *
 * 1. Import all required types
 * 2. Define class with private fields
 * 3. Define replay() method with full JSDoc
 * 4. Define private handler stubs with JSDoc
 * 5. Export class
 */

// Pattern 1: Imports (ESM with .js extensions)
import type {
  WorkflowNode,
  WorkflowEvent,
  WorkflowStatus,
  LogEntry,
} from '../types/workflow.js';
import type { SerializedWorkflowState } from '../types/snapshot.js';
import type { WorkflowError } from '../types/error.js';

// Pattern 2: Class Structure
export class WorkflowEventReplayer {
  /** Node lookup map for O(1) access */
  private nodeMap: Map<string, WorkflowNode> = new Map();

  /** Root node of reconstructed tree */
  private root: WorkflowNode | null = null;

  // Pattern 3: replay() Method Signature with JSDoc
  /**
   * Replay a sequence of workflow events to reconstruct the workflow tree.
   *
   * Processes events chronologically to build an in-memory representation
   * of the workflow tree at the point of the last event.
   *
   * **Event Handling Strategy:**
   *
   * **Phase 1 - Structural Events** (modify tree structure):
   * - `childAttached`: Add new child node to parent's children array
   * - `childDetached`: Remove child and all descendants from tree
   * - `treeUpdated`: Update root reference to new tree
   *
   * **Phase 1 - State Events** (update node properties):
   * - `stateSnapshot`: Update node's stateSnapshot field
   * - `error`: Add error information to node
   *
   * **Phase 2 - Metadata Events** (logged but don't modify tree):
   * - `agentPromptStart/End`: Track agent prompt lifecycle
   * - `toolInvocation`: Track tool executions
   * - `mcpEvent`: Track MCP server events
   * - `reflectionStart/End`: Track reflection operations
   * - `cacheHit/Miss`: Track cache operations
   * - `taskStart/End`: Track task execution
   * - `stepStart/End`: Track step execution
   *
   * **Tree Invariants Maintained:**
   * - Single-parent rule: Each node has at most one parent
   * - Bidirectional references: parent.children and child.parent are consistent
   * - No circular references: Tree is a Directed Acyclic Graph (DAG)
   *
   * **Performance:**
   * - Uses Map<string, WorkflowNode> for O(1) node lookups
   * - Processes events sequentially (O(n) where n = event count)
   * - Incremental tree updates (O(k) for subtree operations)
   *
   * @param events - Array of workflow events in chronological order
   * @returns Root node of the reconstructed workflow tree
   * @throws {Error} If events array is empty
   * @throws {Error} If root cannot be established from events
   * @throws {Error} If event references missing parent node
   *
   * @example
   * ```typescript
   * const replayer = new WorkflowEventReplayer();
   * const tree = replayer.replay(eventStream);
   * console.log(`Tree has ${tree.children.length} root children`);
   * ```
   */
  replay(events: WorkflowEvent[]): WorkflowNode {
    // Phase 1: Return stub (implementation in P2.M1.T1.S2)
    throw new Error('Not implemented: Event replay logic will be added in P2.M1.T1.S2');
  }

  // Pattern 4: Handler Stubs with JSDoc (implementation in Phase 2/3)
  /**
   * Handle childAttached event - add subtree to tree.
   *
   * **Strategy:**
   * 1. Deep clone event.child to avoid mutating original
   * 2. Find parent node via nodeMap.get(event.parentId)
   * 3. Set child.parent = parent
   * 4. Add child to parent.children array
   * 5. Add child and all descendants to nodeMap via buildNodeMap()
   *
   * **Invariants:**
   * - Parent must exist in nodeMap (throw if not)
   * - Child must not already have a different parent (single-parent rule)
   * - No circular references (child must not be ancestor of parent)
   *
   * @param event - ChildAttachedEvent with parentId and child node
   * @throws {Error} If parent node not found
   * @throws {Error} If child already has a parent
   * @throws {Error} If attaching would create circular reference
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'childAttached', parentId: 'workflow-123', child: { id: 'workflow-456', ... } }
   * // Result: workflow-456 is added as child of workflow-123
   * ```
   */
  private handleChildAttached(event: Extract<WorkflowEvent, { type: 'childAttached' }>): void {
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: childAttached handler');
  }

  /**
   * Handle childDetached event - remove subtree from tree.
   *
   * **Strategy:**
   * 1. Find child node via nodeMap.get(event.childId)
   * 2. Find parent node via nodeMap.get(event.parentId)
   * 3. Remove child from parent.children array
   * 4. Remove child and all descendants from nodeMap via removeSubtreeNodes()
   * 5. Clear child.parent reference
   *
   * **Invariants:**
   * - Both parent and child must exist in nodeMap
   * - Child must be a direct child of parent (not just any descendant)
   *
   * **Performance:**
   * - O(k) where k = number of nodes in subtree (BFS traversal)
   *
   * @param event - ChildDetachedEvent with parentId and childId
   * @throws {Error} If parent or child node not found
   * @throws {Error} If child is not a direct child of parent
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'childDetached', parentId: 'workflow-123', childId: 'workflow-456' }
   * // Result: workflow-456 and its descendants are removed from tree
   * ```
   */
  private handleChildDetached(event: Extract<WorkflowEvent, { type: 'childDetached' }>): void {
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: childDetached handler');
  }

  /**
   * Handle treeUpdated event - update root reference.
   *
   * **Strategy:**
   * 1. Verify event.root is a valid WorkflowNode
   * 2. Update this.root = event.root
   * 3. Rebuild nodeMap from new root via buildNodeMap()
   *
   * **Use Case:**
   * - Represents a complete tree replacement (not incremental update)
   * - Rare in practice; most updates use childAttached/childDetached
   *
   * @param event - TreeUpdatedEvent with new root node
   * @throws {Error} If event.root is null or undefined
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'treeUpdated', root: { id: 'workflow-123', children: [], ... } }
   * // Result: this.root points to new tree, nodeMap rebuilt
   * ```
   */
  private handleTreeUpdated(event: Extract<WorkflowEvent, { type: 'treeUpdated' }>): void {
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: treeUpdated handler');
  }

  /**
   * Handle stateSnapshot event - update node's state snapshot.
   *
   * **Strategy:**
   * 1. Find node via nodeMap.get(event.node.id)
   * 2. Update node.stateSnapshot = event.node.stateSnapshot
   *
   * **Invariants:**
   * - Node must exist in nodeMap
   * - stateSnapshot can be null (no snapshot captured)
   *
   * @param event - StateSnapshotEvent with updated node
   * @throws {Error} If node not found in nodeMap
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'stateSnapshot', node: { id: 'workflow-123', stateSnapshot: { count: 42 }, ... } }
   * // Result: node.stateSnapshot is updated with new snapshot
   * ```
   */
  private handleStateSnapshot(event: Extract<WorkflowEvent, { type: 'stateSnapshot' }>): void {
    // Implementation in P2.M1.T1.S3
    throw new Error('Not implemented: stateSnapshot handler');
  }

  /**
   * Handle error event - record error on node.
   *
   * **Strategy:**
   * 1. Find node via nodeMap.get(event.node.id)
   * 2. Append event.error to node's error collection
   *    (Implementation note: WorkflowNode doesn't have errors[] field,
   *     so this may require adding the field or storing errors in events array)
   *
   * **Invariants:**
   * - Node must exist in nodeMap
   * - Error includes rich context (state, logs, stack)
   *
   * @param event - ErrorEvent with error details
   * @throws {Error} If node not found in nodeMap
   *
   * @example
   * ```typescript
   * // Event structure
   * { type: 'error', node: {...}, error: { message: 'Failed', state: {...}, logs: [...] } }
   * // Result: Error is recorded for debugging
   * ```
   */
  private handleErrorEvent(event: Extract<WorkflowEvent, { type: 'error' }>): void {
    // Implementation in P2.M1.T1.S3
    throw new Error('Not implemented: error handler');
  }

  // Pattern 5: Helper Method Stubs (with JSDoc, implementation in Phase 2)

  /**
   * Build node lookup map recursively (pattern from WorkflowTreeDebugger).
   *
   * **Strategy:**
   * - Depth-first traversal of subtree
   * - Add each node to nodeMap: nodeMap.set(node.id, node)
   * - Recurse for all children
   *
   * **Complexity:** O(k) where k = number of nodes in subtree
   *
   * @param node - Root of subtree to add to nodeMap
   *
   * @example
   * ```typescript
   * // After attaching a child, add it and descendants to map
   * this.buildNodeMap(event.child);
   * // Result: child and all descendants are now in nodeMap
   * ```
   */
  private buildNodeMap(node: WorkflowNode): void {
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: buildNodeMap');
  }

  /**
   * Remove entire subtree from node map using BFS traversal.
   *
   * **Strategy:**
   * - BFS traversal to collect all descendant IDs
   * - Batch delete all collected keys from nodeMap
   * - Iterative (not recursive) to avoid stack overflow on deep trees
   *
   * **Complexity:** O(k) where k = number of nodes in subtree
   *
   * @param nodeId - ID of root node of subtree to remove
   *
   * @example
   * ```typescript
   * // After detaching a child, remove it and descendants from map
   * this.removeSubtreeNodes(event.childId);
   * // Result: child and all descendants removed from nodeMap
   * ```
   */
  private removeSubtreeNodes(nodeId: string): void {
    // Implementation in P2.M1.T1.S2
    throw new Error('Not implemented: removeSubtreeNodes');
  }
}
```

### Integration Points

```yaml
EXPORTS:
  - add to: src/index.ts
  - pattern: export { WorkflowEventReplayer } from './debugger/event-replayer.js'
  - location: After WorkflowTreeDebugger export (around line 50)

IMPORTS:
  - from: ./types/workflow.js
  - types: WorkflowNode, WorkflowEvent, WorkflowStatus, LogEntry
  - from: ./types/snapshot.js
  - types: SerializedWorkflowState
  - from: ./types/error.js
  - types: WorkflowError

FUTURE_INTEGRATION:
  - P2.M1.T1.S2: Implement handleChildAttached, handleChildDetached, handleTreeUpdated
  - P2.M1.T1.S3: Implement handleStateSnapshot, handleErrorEvent
  - P2.M1.T2.S2: Integrate with WorkflowTreeDebugger for event persistence
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file creation - fix before proceeding
npm run build                    # TypeScript compilation
# Expected: Zero errors. dist/debugger/event-replayer.js is created

# If using ruff for linting (check package.json for actual command)
npm run lint                    # Linting check
# Expected: Zero errors

# If using ruff for formatting
npm run format                  # Format code
# Expected: Consistent formatting applied

# Manual verification
cat src/debugger/event-replayer.ts | grep "export class WorkflowEventReplayer"
# Expected: Class is exported

# Verify export in index.ts
cat src/index.ts | grep "WorkflowEventReplayer"
# Expected: export { WorkflowEventReplayer } from './debugger/event-replayer.js'
```

### Level 2: Type Checking (Component Validation)

```bash
# TypeScript type checking
npx tsc --noEmit                # Type check without emitting files
# Expected: Zero type errors

# Verify imports work
node -e "import('./src/index.ts').then(m => console.log(Object.keys(m)))"
# Expected: WorkflowEventReplayer appears in exports list

# Verify discriminated union types work
npx tsc --noEmit src/debugger/event-replayer.ts
# Expected: Extract<WorkflowEvent, { type: 'childAttached' }> types resolve correctly
```

### Level 3: Build Verification (System Validation)

```bash
# Full project build
npm run build                   # Compile entire project
# Expected: Clean build, dist/ populated

# Check compiled output exists
test -f dist/debugger/event-replayer.js && echo "event-replayer.js exists"
# Expected: File exists

test -f dist/debugger/event-replayer.d.ts && echo "event-replayer.d.ts exists"
# Expected: Type declaration file exists

# Verify dist/index.js exports WorkflowEventReplayer
cat dist/index.js | grep "WorkflowEventReplayer"
# Expected: Export present in compiled output
```

### Level 4: Documentation Validation (Domain-Specific Validation)

```bash
# Verify JSDoc comments are present and complete
grep -c "\/\*\*" src/debugger/event-replayer.ts
# Expected: At least 7 JSDoc blocks (class + 6 methods)

# Verify method signatures match PRP
grep "replay(events: WorkflowEvent\[\]): WorkflowNode" src/debugger/event-replayer.ts
# Expected: Method signature is present

# Verify all handler stubs exist
grep "private handleChildAttached" src/debugger/event-replayer.ts
grep "private handleChildDetached" src/debugger/event-replayer.ts
grep "private handleTreeUpdated" src/debugger/event-replayer.ts
grep "private handleStateSnapshot" src/debugger/event-replayer.ts
grep "private handleErrorEvent" src/debugger/event-replayer.ts
# Expected: All 5 handler methods defined

# Verify Extract types are used correctly
grep "Extract<WorkflowEvent" src/debugger/event-replayer.ts | wc -l
# Expected: At least 5 (one per handler)

# Verify TODO comments for Phase 2/3
grep -c "Not implemented" src/debugger/event-replayer.ts
# Expected: At least 7 (class replay + 6 methods)
```

---

## Final Validation Checklist

### Technical Validation

- [ ] File `src/debugger/event-replayer.ts` exists
- [ ] `WorkflowEventReplayer` class is defined and exported
- [ ] `replay(events: WorkflowEvent[]): WorkflowNode` method defined
- [ ] `nodeMap: Map<string, WorkflowNode>` field defined
- [ ] `root: WorkflowNode | null` field defined
- [ ] All handler stubs defined (handleChildAttached, handleChildDetached, handleTreeUpdated, handleStateSnapshot, handleErrorEvent)
- [ ] All helper stubs defined (buildNodeMap, removeSubtreeNodes)
- [ ] JSDoc comments on class and all methods
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] Export added to `src/index.ts`
- [ ] dist/debugger/event-replayer.js exists after build
- [ ] dist/index.js exports WorkflowEventReplayer

### Documentation Validation

- [ ] replay() method has complete JSDoc (params, returns, throws, example)
- [ ] Event handling strategy documented for all 15+ event types
- [ ] Phase 1 vs Phase 2 vs Phase 3 events clearly distinguished
- [ ] Tree invariants documented in JSDoc
- [ ] Performance characteristics documented
- [ ] All handler methods have JSDoc explaining strategy
- [ ] Helper methods have JSDoc explaining purpose

### Code Quality Validation

- [ ] Follows existing patterns from WorkflowTreeDebugger
- [ ] Uses Map-based node tracking pattern
- [ ] Uses discriminated union pattern (Extract<WorkflowEvent, ...>)
- [ ] ESM imports with .js extensions
- [ ] Consistent naming (PascalCase class, camelCase methods)
- [ ] No implementation logic (stubs only with throw new Error)
- [ ] Proper error messages in stubs indicate future implementation phase
- [ ] No linting errors
- [ ] Consistent code formatting

### Scope Validation

- [ ] Phase 1 scope: Interface definition only (no implementation)
- [ ] No modification to existing files (except src/index.ts export)
- [ ] No new types created (uses existing WorkflowEvent, WorkflowNode)
- [ ] No modification to src/types/ directory
- [ ] Handler stubs indicate correct phase for implementation
- [ ] TODO comments point to future PRP tasks

---

## Anti-Patterns to Avoid

- ❌ Don't implement replay logic in Phase 1 (this PRP is interface definition only)
- ❌ Don't modify existing types (WorkflowEvent, WorkflowNode are read-only)
- ❌ Don't use Object instead of Map for nodeMap (follow WorkflowTreeDebugger pattern)
- ❌ Don't forget ESM import syntax (.js extensions required)
- ❌ Don't skip JSDoc comments (documentation is critical for Phase 2/3)
- ❌ Don't mix Phase 1/2/3 event handling (document which phase handles each event)
- ❌ Don't forget to export from src/index.ts
- ❌ Don't use deep cloning in Phase 1 (that's Phase 2 implementation)
- ❌ Don't add new fields to WorkflowNode (use existing structure)
- ❌ Don't implement tree validation in Phase 1 (that's Phase 2)

---

## References

### Research Files (plan/002_6761e4b84fd1/P2M1T1S1/research/)

- `debugger-patterns-research.md` - Complete analysis of existing debugger patterns, tree mutation patterns, test patterns
- `event-replay-best-practices.md` - Industry best practices for event replay systems, TypeScript patterns, testing approaches

### Source Files Referenced

- `src/debugger/tree-debugger.ts` - Reference implementation for Map-based node tracking and event handling
- `src/types/events.ts` - WorkflowEvent discriminated union (15+ event types)
- `src/types/workflow.ts` - WorkflowNode interface (output of replay)
- `src/types/observer.ts` - WorkflowObserver interface (context for observer pattern)
- `src/types/snapshot.ts` - SerializedWorkflowState type
- `src/types/error.ts` - WorkflowError interface
- `src/__tests__/unit/tree-debugger.test.ts` - Test patterns for reference
- `src/__tests__/unit/tree-debugger-incremental.test.ts` - Incremental update test patterns
- `src/core/event-tree.ts` - Tree building pattern (buildEventNode method)
- `src/core/workflow.ts` - Tree mutation patterns (attachChild, detachChild)

### Architecture Research

- `plan/002_6761e4b84fd1/architecture/OBSERVABILITY_PATTERNS_RESEARCH.md` - Event replay system context, Phase 2 roadmap

### External References

- TypeScript Handbook - Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-1.html
- MDN Map Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
- JSDoc Documentation: https://jsdoc.app/

---

**End of PRP**

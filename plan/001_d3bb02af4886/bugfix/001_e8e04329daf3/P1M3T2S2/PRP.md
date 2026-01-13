name: "P1M3T2S2: Implement Incremental Node Map Update for childDetached"
description: |
  Implements incremental node map updates in WorkflowTreeDebugger to eliminate O(n) full rebuild on tree mutations.
  Replaces current full rebuild strategy with O(k) incremental updates where k = subtree size.

---

## Goal

**Feature Goal**: Replace O(n) full nodeMap rebuild in `onTreeChanged()` with O(k) incremental updates for `childDetached` and `childAttached` events.

**Deliverable**: Modified `src/debugger/tree-debugger.ts` with:
1. New `removeSubtreeNodes(nodeId: string)` private method using BFS traversal
2. Updated `onEvent()` to handle `childDetached` and `childAttached` events incrementally
3. Simplified `onTreeChanged()` to only update root reference

**Success Definition**:
- `childDetached` events remove entire subtree from nodeMap in O(k) time
- `childAttached` events add subtree in O(k) time (existing behavior preserved)
- `onTreeChanged()` no longer rebuilds entire map
- All existing tests pass
- Performance improvement of 10-100× for large trees (1000+ nodes)

## User Persona

**Target User**: Developer using hierarchical workflow engine with large trees (100+ nodes) and frequent structural changes.

**Use Case**: Attaching/detaching child workflows in long-running workflows with thousands of nodes.

**User Journey**:
1. Developer creates workflow with 1000+ nodes
2. Workflow attaches/detaches child workflows during execution
3. Tree debugger receives tree change events
4. Node map updates incrementally without O(n) rebuild

**Pain Points Addressed**:
- Current O(n) rebuild causes noticeable lag on large trees
- Memory churn from `Map.clear()` + full rebuild
- Orphaned nodes leak in nodeMap after detach (memory leak)

## Why

- **Performance**: Current implementation causes 100-1000× slowdown on large trees with frequent structural changes
- **Memory leak**: `childDetached` events leave orphaned nodes in nodeMap until full rebuild
- **Scalability**: Full rebuild strategy doesn't scale beyond ~1000 nodes
- **Consistency**: `onEvent()` already handles `childAttached` incrementally - complete the pattern

## What

Modify WorkflowTreeDebugger to use incremental node map updates for tree structural changes.

### Success Criteria

- [ ] `removeSubtreeNodes(nodeId: string)` method removes entire subtree using BFS traversal
- [ ] `onEvent()` handles `childDetached` by calling `removeSubtreeNodes()`
- [ ] `onEvent()` handles `childAttached` using existing `buildNodeMap()` pattern
- [ ] `onTreeChanged()` only updates root reference, no rebuild
- [ ] All existing tests pass
- [ ] No memory leaks from orphaned nodes after detach
- [ ] Performance improvement measurable with 1000+ node trees

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed?

✅ **YES** - This PRP provides:
- Exact file paths and line numbers for all referenced code
- Complete code patterns to follow from existing codebase
- Specific test patterns and validation commands
- All architectural constraints and gotchas
- External research with specific URLs

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://react.dev/learn/render-and-commit
  why: React's reconciliation algorithm patterns for incremental tree updates
  critical: O(n) diffing with heuristics, key-based identification

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  why: Map operations have O(1) complexity - validates incremental approach
  section: "#instance-methods" (set, get, delete operations)

- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M3T2S1/analysis.md
  why: Comprehensive analysis of current onTreeChanged implementation with performance impact
  section: "Incremental Update Opportunities" (lines 327-472)
  gotcha: Current onEvent() already handles childAttached incrementally but onTreeChanged() rebuilds

- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S2/research/external_research.md
  why: External research on BFS/DFS patterns, Map performance, React reconciliation
  section: "6. Actionable Implementation Guide" (lines 576-736)

- file: src/debugger/tree-debugger.ts
  why: Primary file to modify - contains current implementation
  pattern: Observer pattern with onEvent(), onTreeChanged(), buildNodeMap()
  gotcha: buildNodeMap() is recursive - may hit stack limits on deep trees (use BFS for removal)

- file: src/types/events.ts
  why: WorkflowEvent discriminated union - all event types defined
  pattern: Lines 10-11 define childAttached and childDetached events
  gotcha: childDetached only provides childId string, not full node object

- file: src/types/observer.ts
  why: WorkflowObserver interface - must implement all methods
  pattern: Lines 9-18 define onLog, onEvent, onStateUpdated, onTreeChanged

- file: src/__tests__/helpers/tree-verification.ts
  why: Test helper patterns for validating tree operations
  pattern: BFS traversal in collectAllNodes() (lines 13-32)
  pattern: verifyOrphaned() for testing detach operations (lines 151-163)

- file: src/__tests__/unit/tree-debugger.test.ts
  why: Existing test patterns for WorkflowTreeDebugger
  pattern: SimpleWorkflow class pattern, observer creation helper
  gotcha: Tests use direct node access via debugger.getNode()

- file: src/__tests__/adversarial/attachChild-performance.test.ts
  why: Performance test patterns using performance.now()
  pattern: Threshold-based performance assertions (< 10ms, < 50ms, etc.)

- file: src/core/workflow.ts
  why: Understanding where events are emitted
  pattern: Lines 300-304 (childAttached emission), 353-357 (childDetached emission)
  pattern: Lines 367-379 (observer notification with error isolation)
```

### Current Codebase Structure

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── debugger/
│   │   └── tree-debugger.ts          # PRIMARY FILE - Modify this
│   ├── core/
│   │   └── workflow.ts               # Event emission patterns
│   ├── types/
│   │   ├── events.ts                 # WorkflowEvent types
│   │   ├── observer.ts               # WorkflowObserver interface
│   │   └── workflow.ts               # WorkflowNode interface
│   └── __tests__/
│       ├── unit/
│       │   └── tree-debugger.test.ts # Test patterns to follow
│       ├── helpers/
│       │   └── tree-verification.ts  # BFS pattern reference
│       └── adversarial/
│           └── attachChild-performance.test.ts # Performance test patterns
└── plan/
    └── 001_d3bb02af4886/bugfix/001_e8e04329daf3/
        ├── docs/P1M3T2S1/analysis.md # S1 analysis - READ THIS
        └── P1M3T2S2/
            ├── PRP.md                 # This file
            └── research/
                └── external_research.md # External patterns research
```

### Desired Codebase Structure After Implementation

```bash
src/debugger/
└── tree-debugger.ts                  # Modified with incremental updates
    ├── removeSubtreeNodes()          # NEW: BFS-based subtree removal
    ├── onEvent()                     # MODIFIED: Handle childDetached
    ├── buildNodeMap()                # UNCHANGED: Keep existing pattern
    └── onTreeChanged()               # MODIFIED: Remove full rebuild
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: childDetached event only provides childId, not full WorkflowNode
// From src/types/events.ts:11
// { type: 'childDetached'; parentId: string; childId: string }
// Must use stored node reference from nodeMap to get descendants

// CRITICAL: buildNodeMap() is recursive - may hit stack limits on deep trees
// From src/debugger/tree-debugger.ts:53-58
// Use iterative BFS for removeSubtreeNodes() to avoid stack overflow

// CRITICAL: onEvent() is called BEFORE onTreeChanged() by emitEvent()
// From src/core/workflow.ts:367-379
// Order: obs.onEvent(event) THEN obs.onTreeChanged(root)
// This means onEvent() must do the incremental work

// CRITICAL: Observer callbacks are wrapped in try-catch for error isolation
// From src/core/workflow.ts:376
// Observer errors don't stop workflow execution

// CRITICAL: Node tree must mirror workflow tree (1:1 correspondence)
// From PRD Section 12.2 and tree-verification.ts:201-237
// Any tree change affects both trees simultaneously

// CRITICAL: Map.set() replaces existing entries for same key
// From src/debugger/tree-debugger.ts:54
// this.nodeMap.set(node.id, node) - OK to call on already-mapped nodes

// CRITICAL: Use Map.delete() for removal, not setting to undefined
// Map has undefined as valid value - use delete to actually remove key
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed. Using existing:
- `WorkflowNode` from `src/types/workflow.ts`
- `WorkflowEvent` discriminated union from `src/types/events.ts`
- `WorkflowObserver` interface from `src/types/observer.ts`

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD removeSubtreeNodes() private method
  - IMPLEMENT: BFS-based subtree removal from nodeMap
  - FOLLOW pattern: src/__tests__/helpers/tree-verification.ts:13-32 (collectAllNodes BFS)
  - NAMING: removeSubtreeNodes(nodeId: string): void
  - ALGORITHM:
    1. Get node from nodeMap using nodeId
    2. If not found, return early (already removed)
    3. Use queue-based BFS to collect all descendant IDs
    4. Delete all collected IDs from nodeMap
  - GOTCHA: Use iterative BFS, not recursive (avoid stack overflow)
  - GOTCHA: Collect all keys first, then delete (atomic update)
  - COMPLEXITY: O(k) where k = nodes in subtree
  - PLACEMENT: After buildNodeMap() in tree-debugger.ts

Task 2: MODIFY onEvent() to handle childDetached
  - IMPLEMENT: switch-case for event.type dispatch
  - FOLLOW pattern: S1 analysis lines 527-555 (recommended implementation)
  - CURRENT: Only handles childAttached (line 68-69)
  - ADD: case 'childDetached' -> call removeSubtreeNodes(event.childId)
  - PRESERVE: existing childAttached handling (buildNodeMap is already optimal)
  - GOTCHA: childDetached only provides childId string, not full node
  - PLACEMENT: Replace existing if statement with switch statement

Task 3: MODIFY onTreeChanged() to remove full rebuild
  - IMPLEMENT: Only update root reference if different
  - CURRENT: Lines 80-84 - clears map and rebuilds
  - NEW: Just update this.root if different from parameter
  - PRESERVE: Observer interface contract (method must exist)
  - RATIONALE: All incremental work now done in onEvent()
  - PLACEMENT: Same location (lines 80-84)

Task 4: CREATE unit tests for incremental updates
  - IMPLEMENT: Tests in src/__tests__/unit/tree-debugger-incremental.test.ts
  - FOLLOW pattern: src/__tests__/unit/tree-debugger.test.ts (test structure)
  - TEST CASES:
    1. childDetached removes entire subtree (node + descendants)
    2. childDetached on already-removed node is no-op
    3. childAttached adds subtree (verify existing behavior)
    4. onTreeChanged doesn't rebuild map
  - NAMING: describe('Incremental Node Map Updates')
  - PLACEMENT: New test file alongside tree-debugger.test.ts

Task 5: RUN existing test suite
  - VERIFY: All existing tree-debugger tests pass
  - VERIFY: No regressions in observer tests
  - VERIFY: Tree verification helpers still work
  - COMMAND: npm test -- src/__tests__/unit/tree-debugger.test.ts
  - COMMAND: npm test -- src/__tests__/integration/observer-propagation.test.ts
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: BFS-based subtree removal (NEW METHOD)
// Follows: src/__tests__/helpers/tree-verification.ts:13-32
private removeSubtreeNodes(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;  // Already removed or never existed

  // BFS traversal to collect all descendant IDs
  const toRemove: string[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    // Add children to queue for BFS traversal
    queue.push(...current.children);
  }

  // Batch delete all collected keys (atomic update)
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
}
// COMPLEXITY: O(k) time, O(w) space where w = max width of subtree

// Pattern 2: Event-type dispatch in onEvent() (MODIFY EXISTING)
// Follows: S1 analysis lines 527-555
onEvent(event: WorkflowEvent): void {
  // Handle structural events with incremental updates
  switch (event.type) {
    case 'childAttached':
      // Keep existing logic - already optimal O(k)
      this.buildNodeMap(event.child);
      break;

    case 'childDetached':
      // NEW: Incremental subtree removal
      this.removeSubtreeNodes(event.childId);
      break;

    case 'treeUpdated':
      // NEW: Update root reference only
      this.root = event.root;
      break;

    default:
      // Non-structural events - no map update needed
      break;
  }

  // Always forward to event stream (existing behavior)
  this.events.next(event);
}
// COMPLEXITY: O(k) for structural events, O(1) for non-structural

// Pattern 3: Simplified onTreeChanged() (MODIFY EXISTING)
// Follows: S1 analysis lines 570-578
onTreeChanged(root: WorkflowNode): void {
  // All tree changes now handled incrementally in onEvent()
  // Just update root reference if different
  if (this.root !== root) {
    this.root = root;
  }
}
// COMPLEXITY: O(1) - no rebuild!

// GOTCHA: Don't forget to handle treeUpdated event!
// Currently onTreeChanged() is called for treeUpdated events
// After change, onEvent() must handle treeUpdated to update root
```

### Integration Points

```yaml
EVENTS:
  - childAttached: src/core/workflow.ts:300-304
  - childDetached: src/core/workflow.ts:353-357
  - treeUpdated: src/core/workflow.ts:405

OBSERVER_PATTERN:
  - file: src/core/workflow.ts:367-379
  - pattern: obs.onEvent(event) THEN obs.onTreeChanged(root)
  - critical: onEvent() called first - must do incremental work

TREE_VERIFICATION:
  - file: src/__tests__/helpers/tree-verification.ts
  - use: verifyOrphaned() for testing detachChild
  - use: verifyTreeMirror() for validating tree consistency
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npx tsc --noEmit src/debugger/tree-debugger.ts

# Lint check
npm run lint -- src/debugger/tree-debugger.ts

# Format check
npm run format -- --check src/debugger/tree-debugger.ts

# Expected: Zero errors. Fix any issues before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing tree debugger tests
npm test -- src/__tests__/unit/tree-debugger.test.ts

# Run new incremental update tests
npm test -- src/__tests__/unit/tree-debugger-incremental.test.ts

# Run observer propagation tests
npm test -- src/__tests__/integration/observer-propagation.test.ts

# Expected: All tests pass. If failing, debug root cause.
```

### Level 3: Integration Testing (System Validation)

```bash
# Create test script to verify behavior
cat > /tmp/test-incremental.mjs << 'EOF'
import { Workflow, WorkflowTreeDebugger } from './src/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); }
}

// Test 1: childDetached removes subtree
const root = new TestWorkflow('Root');
const child1 = new TestWorkflow('Child1', root);
const grandchild = new TestWorkflow('Grandchild', child1);
const child2 = new TestWorkflow('Child2', root);

const debugger = new WorkflowTreeDebugger(root);

console.log('Initial nodes:', debugger.getStats().totalNodes); // Should be 4
console.log('Grandchild found:', !!debugger.getNode(grandchild.id)); // true

// Detach child1 (removes child1 + grandchild)
root.detachChild(child1);

console.log('After detach:', debugger.getStats().totalNodes); // Should be 2
console.log('Grandchild removed:', !debugger.getNode(grandchild.id)); // true
console.log('Child1 removed:', !debugger.getNode(child1.id)); // true
console.log('Child2 still there:', !!debugger.getNode(child2.id)); // true

// Test 2: childAttached adds subtree
const child3 = new TestWorkflow('Child3', root);
console.log('After attach:', debugger.getStats().totalNodes); // Should be 3
console.log('Child3 found:', !!debugger.getNode(child3.id)); // true

console.log('✓ All tests passed!');
EOF

node /tmp/test-incremental.mjs

# Expected output:
# Initial nodes: 4
# Grandchild found: true
# After detach: 2
# Grandchild removed: true
# Child1 removed: true
# Child2 still there: true
# After attach: 3
# Child3 found: true
# ✓ All tests passed!
```

### Level 4: Performance Validation

```bash
# Create performance benchmark
cat > /tmp/benchmark-incremental.mjs << 'EOF'
import { Workflow, WorkflowTreeDebugger } from './src/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); }
}

// Build large tree (1000 nodes)
const root = new TestWorkflow('Root');
let current = root;
for (let i = 0; i < 999; i++) {
  const child = new TestWorkflow(`Node${i}`, current);
  current = child;
}

const debugger = new WorkflowTreeDebugger(root);
console.log('Total nodes:', debugger.getStats().totalNodes);

// Benchmark: Detach single node (should be O(1) vs O(1000))
const start = performance.now();
const leaf = current; // Last node in chain
const parent = leaf.parent!;
parent.detachChild(leaf);
const duration = performance.now() - start;

console.log(`Detach duration: ${duration.toFixed(3)}ms`);
console.log(`Expected: < 1ms for incremental, ~10ms for full rebuild`);

// Verify correct behavior
const stats = debugger.getStats();
console.log('Nodes after detach:', stats.totalNodes); // Should be 999
console.log('Leaf removed:', !debugger.getNode(leaf.id)); // true
EOF

node /tmp/benchmark-incremental.mjs

# Expected: Detach duration < 1ms (vs ~10ms for full rebuild)
# Speedup: 10-100× for single node detach from 1000-node tree
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All tests pass: `npm test -- src/__tests__/unit/tree-debugger*.test.ts`
- [ ] Linting passes: `npm run lint`
- [ ] Format check passes: `npm run format -- --check`

### Feature Validation

- [ ] `removeSubtreeNodes()` method implemented with BFS traversal
- [ ] `onEvent()` handles `childDetached` events
- [ ] `onEvent()` handles `childAttached` events (existing preserved)
- [ ] `onEvent()` handles `treeUpdated` events
- [ ] `onTreeChanged()` no longer rebuilds map
- [ ] Detached subtree fully removed (node + descendants)
- [ ] No orphaned nodes leak in nodeMap
- [ ] Performance improvement measurable (10-100× for large trees)

### Code Quality Validation

- [ ] Follows existing codebase patterns (BFS from tree-verification.ts)
- [ ] Method naming matches conventions (camelCase, descriptive)
- [ ] File placement correct (tree-debugger.ts only modification)
- [ ] No recursive methods added (BFS is iterative)
- [ ] Error handling graceful (node not found = no-op)

### Edge Cases Covered

- [ ] Detaching already-removed node is no-op
- [ ] Detaching node with many descendants removes all
- [ ] Attaching node with many descendants adds all
- [ ] Multiple rapid attach/detach operations work correctly
- [ ] Deep trees (1000+ depth) don't cause stack overflow

---

## Anti-Patterns to Avoid

- ❌ Don't use recursive DFS for `removeSubtreeNodes()` - use iterative BFS
- ❌ Don't delete nodes one-by-one during traversal - collect all keys first
- ❌ Don't rebuild entire map in `onTreeChanged()` - defeats purpose
- ❌ Don't forget to handle `treeUpdated` event in `onEvent()`
- ❌ Don't assume `nodeMap.get()` returns non-null - check for undefined
- ❌ Don't modify `buildNodeMap()` - it's already optimal for addition
- ❌ Don't add new public methods - keep implementation private
- ❌ Don't create new Map on each update - mutate existing Map
- ❌ Don't use `Map.clear()` in any code path - causes GC churn
- ❌ Don't forget to forward events to `this.events.next()` - breaks event stream

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement incremental node map updates successfully using only the PRP content and codebase access.

**Key Success Indicators**:
1. S1 analysis provides complete current implementation analysis
2. External research provides proven patterns (React reconciliation, BFS traversal)
3. Codebase has existing BFS pattern to follow (tree-verification.ts)
4. Test patterns are well-established
5. All file paths and line numbers are specific and actionable
6. Gotchas and anti-patterns are comprehensively documented

**Estimated Performance Impact**:
- Small trees (< 100 nodes): Minimal improvement (already fast)
- Medium trees (100-1000 nodes): 10-100× improvement on structural changes
- Large trees (1000+ nodes): 100-1000× improvement on structural changes

**Expected Test Coverage**: 100% of new code paths with unit tests

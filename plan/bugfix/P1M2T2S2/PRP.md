# Product Requirement Prompt (PRP): Verify Tree Consistency After Reparenting

---

## Goal

**Feature Goal**: Add a test to the existing reparenting integration test suite that uses `WorkflowTreeDebugger` to programmatically verify bidirectional tree consistency (workflow tree to node tree mirror) after reparenting operations.

**Deliverable**: A new test case added to `src/__tests__/integration/workflow-reparenting.test.ts` that validates the 1:1 tree mirror invariant between workflow tree and node tree after reparenting.

**Success Definition**:
- Test creates parent1, parent2, and child workflows
- Test attaches WorkflowTreeDebugger to inspect tree structure
- Test performs reparenting operation (detachChild + attachChild)
- Test uses debugger API to verify four critical consistency checks:
  1. `child.parent` points to new parent
  2. `new parent.children` includes child
  3. `old parent.children` does NOT include child
  4. `node tree mirrors workflow tree exactly` (via debugger verification)
- All assertions pass, proving tree integrity is maintained after reparenting

## User Persona

**Target User**: Developers and QA engineers validating the core tree integrity invariant of the Workflow library.

**Use Case**: Automated validation that reparenting operations maintain the critical 1:1 mirror relationship between workflow tree and node tree, preventing subtle state corruption bugs.

**User Journey**:
1. Developer runs the reparenting test suite to verify tree integrity
2. Test uses WorkflowTreeDebugger to programmatically inspect tree structure
3. Test validates both workflow-level and node-level consistency after reparenting
4. Any tree corruption is caught immediately with clear error messages

**Pain Points Addressed**:
- Manual tree inspection is error-prone and doesn't scale
- Tree mirroring bugs can be subtle and go undetected until production
- Existing S1 test validates observer propagation but not tree structure
- No automated validation that workflow tree and node tree stay synchronized

## Why

- **1:1 Tree Mirror Invariant**: Per system architecture, the workflow tree (Workflow instances with parent/children references) and node tree (WorkflowNode instances with parent/children references) must maintain exact 1:1 correspondence. This is a core invariant of the system.
- **Reparenting Integrity Risk**: Reparenting (detachChild + attachChild) modifies both trees simultaneously. If not synchronized correctly, the trees can diverge, causing subtle bugs in observer routing, tree traversal, and serialization.
- **Completes P1.M2.T2**: Subtask S1 validates observer propagation; S2 validates tree structure. Together they provide complete reparenting validation.
- **Debugging API Validation**: WorkflowTreeDebugger provides programmatic tree inspection (getTree(), getNode(), toTreeString(), getStats()). This test demonstrates debugger API usage for automated validation.
- **Prevents Regressions**: Future changes to attachChild/detachChild could break tree mirroring. This test catches such regressions immediately.
- **Documentation Serves as Example**: Shows how to use WorkflowTreeDebugger for automated tree validation in user code.

## What

Add a new test case to the existing `src/__tests__/integration/workflow-reparenting.test.ts` file that:

1. **Setup**: Creates parent1, parent2 (root workflows), and child (attached to parent1)
2. **Debugger Attachment**: Creates WorkflowTreeDebugger attached to parent1 (original root)
3. **Initial State Verification**: Uses debugger to verify initial tree structure
4. **Reparenting**: Performs detachChild + attachChild to move child from parent1 to parent2
5. **Post-Reparenting Validation**: Uses debugger API and direct assertions to verify tree consistency:
   - Direct assertions on workflow objects
   - Debugger API to verify node tree structure
   - Validates 1:1 mirror between workflow tree and node tree

### Success Criteria

- [ ] New test case added to `src/__tests__/integration/workflow-reparenting.test.ts`
- [ ] Test uses WorkflowTreeDebugger for tree inspection
- [ ] Test verifies child.parent points to new parent after reparenting
- [ ] Test verifies new parent.children includes child
- [ ] Test verifies old parent.children does NOT include child
- [ ] Test uses debugger.getNode() to verify node tree mirrors workflow tree
- [ ] Test may use debugger.toTreeString() for visual validation
- [ ] Test may use debugger.getStats() for statistical validation
- [ ] All assertions pass
- [ ] No regressions in existing tests

---

## All Needed Context

### Context Completeness Check

Before writing this PRP, validate: **"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"**

**Answer**: YES. This PRP includes:
- Exact file paths and line references for all relevant code
- Complete WorkflowTreeDebugger API documentation
- Existing test patterns to follow
- Specific assertion patterns for tree validation
- Tree mirroring implementation details
- Validation commands for this specific project

### Documentation & References

```yaml
# MUST READ - Contract definition from bug_fix_tasks.json
- file: bug_fix_tasks.json
  why: Contains the exact contract definition for P1.M2.T2.S2
  section: P1.M2.T2.S2 (lines 186-194 based on plan status)
  critical: Must use WorkflowTreeDebugger to inspect tree structure
  gotcha: Test must verify 1:1 tree mirror between workflow tree and node tree

# MUST READ - WorkflowTreeDebugger implementation
- file: src/debugger/tree-debugger.ts
  why: Complete API for programmatic tree inspection
  lines: 25-210 (full class implementation)
  pattern: constructor(workflow), getTree(), getNode(id), toTreeString(), getStats()
  critical: debugger automatically rebuilds nodeMap on structural changes via onTreeChanged()
  gotcha: debugger observes tree changes in real-time via WorkflowObserver interface

# MUST READ - WorkflowTreeDebugger usage examples
- file: src/__tests__/unit/tree-debugger.test.ts
  why: Shows how to use debugger API in tests
  pattern: const debugger_ = new WorkflowTreeDebugger(workflow); const tree = debugger_.getTree();
  gotcha: Use getNode(id) for O(1) node lookup by ID

# MUST READ - Tree mirroring implementation
- file: src/core/workflow.ts
  why: Shows how workflow tree and node tree are kept synchronized
  lines: 278-306 (detachChild), 216-254 (attachChild)
  pattern: Both methods update this.children AND this.node.children simultaneously
  critical: 1:1 mirror invariant is maintained by updating both trees in each operation
  gotcha: detachChild removes from both trees; attachChild adds to both trees

# MUST READ - Existing reparenting test (S1)
- file: src/__tests__/integration/workflow-reparenting.test.ts
  why: Shows existing test patterns, parent/child setup, reparenting workflow
  pattern: Phase-based testing with parent1, parent2, child; AAA pattern
  gotcha: This test validates observer propagation; new test validates tree structure
  critical: Add new test case to SAME file, don't create new file

# MUST READ - Integration test patterns
- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Reference for integration tests with WorkflowTreeDebugger
  lines: 10-41 (basic debugger usage), 115-151 (observer + tree validation)
  pattern: Create debugger, use getTree(), verify structure with assertions
  gotcha: Integration tests validate full workflows, not individual methods

# MUST READ - Node tree structure
- file: src/types/workflow.ts
  why: WorkflowNode interface definition showing tree structure
  pattern: WorkflowNode has parent, children, id, name, status, logs, events, stateSnapshot
  gotcha: Node tree uses same parent/children pattern as workflow tree

# MUST READ - bidirectional consistency validation patterns
- file: src/__tests__/unit/workflow-detachChild.test.ts
  why: Shows pattern for validating bidirectional parent-child relationships
  lines: 43-56 (node tree validation), 13-26 (workflow tree validation)
  pattern: expect(child.parent).toBe(newParent); expect(newParent.children).toContain(child);
  gotcha: Must validate BOTH directions: parent.children and child.parent

# REFERENCE - SimpleWorkflow extension pattern
- file: src/__tests__/unit/workflow-detachChild.test.ts
  why: Lines 4-10 show SimpleWorkflow class for testing
  pattern: class SimpleWorkflow extends Workflow { async run() { this.setStatus('completed'); return 'done'; } }
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   │   ├── tree-mirroring.test.ts           # REFERENCE - Debugger usage patterns
│   │   │   ├── workflow-reparenting.test.ts      # MODIFY THIS FILE - Add new test case
│   │   │   ├── agent-workflow.test.ts
│   │   │   └── tree-mirroring.test.ts
│   │   ├── unit/
│   │   │   ├── workflow-detachChild.test.ts      # REFERENCE - Bidirectional validation
│   │   │   ├── tree-debugger.test.ts             # REFERENCE - Debugger API usage
│   │   │   └── ...
│   │   └── adversarial/
│   ├── debugger/
│   │   ├── tree-debugger.ts                      # MUST READ - Debugger implementation
│   │   └── index.ts
│   ├── core/
│   │   └── workflow.ts                           # MUST READ - attachChild/detachChild
│   ├── types/
│   │   ├── workflow.ts                           # WorkflowNode interface
│   │   ├── events.ts
│   │   └── observer.ts
│   └── index.ts                                  # Main exports
├── plan/
│   └── bugfix/
│       └── P1M2T2S2/
│           └── PRP.md                            # This file
└── package.json
```

### Desired Codebase Tree (No New Files - Modify Existing)

```bash
# MODIFY existing file:
├── src/
│   └── __tests__/
│       └── integration/
│           └── workflow-reparenting.test.ts      # MODIFY - Add new test case for tree consistency
#               ADD: New test case "should verify tree consistency after reparenting using debugger"
#               Validates 1:1 mirror between workflow tree and node tree after reparenting
#               Uses WorkflowTreeDebugger API for programmatic tree inspection
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: 1:1 Tree Mirror Invariant
// The workflow tree (Workflow instances) and node tree (WorkflowNode instances)
// must maintain exact correspondence:
//   - workflow.children[i] corresponds to workflow.node.children[i]
//   - workflow.parent corresponds to workflow.node.parent
// This is maintained by attachChild/detachChild updating BOTH trees simultaneously

// CRITICAL: WorkflowTreeDebugger observes tree changes automatically
// debugger is a WorkflowObserver, so it receives onTreeChanged() callbacks
// When tree structure changes, debugger rebuilds its internal nodeMap
// Key behavior: debugger.root updates automatically via onTreeChanged()

// CRITICAL: After reparenting, debugger attached to OLD parent shows OLD tree
// If you attach debugger to parent1, then reparent child to parent2:
//   - debugger.getTree() returns parent1's tree (without child)
//   - To see new tree, attach debugger to parent2 OR create new debugger
// Gotcha: debugger only sees the tree it's attached to

// CRITICAL: getNode() uses internal nodeMap for O(1) lookup
// debugger.getNode(id) looks up node by ID in cached nodeMap
// nodeMap is rebuilt on onTreeChanged() events
// Use getNode() instead of traversing tree manually

// PATTERN: Bidirectional consistency validation
// Always validate BOTH directions of parent-child relationship:
//   expect(child.parent).toBe(newParent);           // workflow level
//   expect(newParent.children).toContain(child);     // workflow level
//   expect(child.node.parent).toBe(newParent.node); // node level
//   expect(newParent.node.children).toContain(child.node); // node level

// PATTERN: Debugger creation and attachment
// const debugger_ = new WorkflowTreeDebugger(rootWorkflow);
// debugger_ automatically registers as observer on rootWorkflow
// No need to call addObserver() manually - constructor does it

// PATTERN: Tree string validation for debugging
// const treeString = debugger_.toTreeString();
// expect(treeString).toContain('Parent2');  // Verify new parent in tree
// expect(treeString).toContain('Child');    // Verify child in tree
// This provides visual validation of tree structure

// PATTERN: Statistical validation
// const stats = debugger_.getStats();
// expect(stats.totalNodes).toBe(2);  // After reparenting: parent1 + parent2 + child = 3 (if debugger sees all)
// Note: Stats depend on which tree debugger is attached to

// GOTCHA: Import paths with .js extension (ES modules)
// import { WorkflowTreeDebugger } from '../../debugger/index.js';
// OR import from main export: import { WorkflowTreeDebugger } from '../../index.js';

// GOTCHA: Reparenting workflow order
// WRONG: parent2.attachChild(child) → throws Error (child already has parent)
// RIGHT: parent1.detachChild(child); parent2.attachChild(child);

// GOTCHA: WorkflowTreeDebugger in workflow-reparenting.test.ts
// Existing tests don't import WorkflowTreeDebugger
// Need to add import: import { WorkflowTreeDebugger } from '../../index.js';

// TESTING: Multi-phase test structure
// PHASE 1: Initial state validation
// PHASE 2: Reparenting operation
// PHASE 3: Post-reparenting validation
// Each phase has clear ARRANGE-ACT-ASSERT structure

// TESTING: Use debugger API for validation
// Don't just check child.parent === parent2
// Also verify via debugger: debugger.getNode(child.id)?.parent === parent2.node
// This validates node tree mirrors workflow tree
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed. Test uses existing types:

```typescript
// From src/debugger/tree-debugger.ts:
class WorkflowTreeDebugger implements WorkflowObserver {
  constructor(workflow: Workflow)
  getTree(): WorkflowNode
  getNode(id: string): WorkflowNode | undefined
  toTreeString(node?: WorkflowNode): string
  getStats(): { totalNodes, byStatus, totalLogs, totalEvents }
  readonly events: Observable<WorkflowEvent>
}

// From src/types/workflow.ts:
interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];
  stateSnapshot: any;
}

// From src/core/workflow.ts:
class Workflow {
  parent: Workflow | null;
  children: Workflow[];
  node: WorkflowNode;  // Corresponds to this workflow's node
  attachChild(child: Workflow): void
  detachChild(child: Workflow): void
  getRoot(): Workflow
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD WorkflowTreeDebugger import to existing test file
  - MODIFY: src/__tests__/integration/workflow-reparenting.test.ts
  - ADD_IMPORT: WorkflowTreeDebugger to existing imports from '../../index.js'
  - CURRENT_IMPORTS: Workflow, WorkflowObserver, WorkflowEvent
  - NEW_IMPORT: WorkflowTreeDebugger
  - PLACEMENT: Line 13-17 (existing import block)

Task 2: CREATE new test case structure
  - ADD: New it() block to existing describe('Integration: Reparenting Observer Propagation')
  - NAME: "should verify tree consistency after reparenting using debugger"
  - FOLLOW: Pattern from existing test "should update observer propagation after reparenting"
  - STRUCTURE: ARRANGE (setup) → ACT (reparenting) → ASSERT (validation)

Task 3: IMPLEMENT test setup phase
  - ARRANGE: Create parent1, parent2 as root workflows (SimpleWorkflow)
  - ARRANGE: Create child attached to parent1 (via constructor)
  - ARRANGE: Create WorkflowTreeDebugger attached to parent1
  - ARRANGE: Verify initial tree structure using debugger
  - FOLLOW: Pattern from existing test lines 36-46

Task 4: IMPLEMENT reparenting operation
  - ACT: Detach child from parent1 using parent1.detachChild(child)
  - ACT: Attach child to parent2 using parent2.attachChild(child)
  - ASSERT: Verify basic reparenting succeeded
  - FOLLOW: Pattern from existing test lines 88-97

Task 5: IMPLEMENT workflow-level validation
  - ASSERT: child.parent === parent2
  - ASSERT: parent2.children.includes(child)
  - ASSERT: !parent1.children.includes(child)
  - FOLLOW: Pattern from workflow-detachChild.test.ts lines 43-56

Task 6: IMPLEMENT node tree validation using debugger
  - CREATE: New debugger for parent2 (or use existing if applicable)
  - ASSERT: debugger.getNode(child.id) returns child's node
  - ASSERT: debugger.getNode(child.id)?.parent === parent2.node
  - ASSERT: debugger.getNode(parent2.id)?.children.includes(child.node)
  - VALIDATE: Node tree mirrors workflow tree exactly

Task 7: OPTIONAL - Visual validation using toTreeString()
  - CALL: debugger.toTreeString() to get ASCII tree representation
  - ASSERT: treeString contains 'Parent2' (new parent)
  - ASSERT: treeString contains 'Child' (moved child)
  - ASSERT: treeString shows correct parent-child relationship
  - BENEFIT: Provides visual debugging output if test fails

Task 8: RUN test to validate implementation
  - EXECUTE: npm test -- workflow-reparenting.test.ts
  - VERIFY: New test case passes
  - VERIFY: All existing test cases still pass (no regressions)
  - DEBUG: If fails, check debugger attachment and node lookup

Task 9: RUN full integration test suite
  - EXECUTE: npm test -- src/__tests__/integration/
  - VERIFY: All integration tests pass
  - VERIFY: No regressions in tree-mirroring.test.ts
  - FIX: Any issues before marking complete
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// COMPLETE IMPLEMENTATION TEMPLATE
// Location: Add to src/__tests__/integration/workflow-reparenting.test.ts
// ============================================================

// ============================================================
// STEP 1: Add WorkflowTreeDebugger to imports (Line 13-17)
// ============================================================
// BEFORE:
import {
  Workflow,
  WorkflowObserver,
  WorkflowEvent,
} from '../../index.js';

// AFTER:
import {
  Workflow,
  WorkflowObserver,
  WorkflowEvent,
  WorkflowTreeDebugger,  // ADD THIS
} from '../../index.js';

// ============================================================
// STEP 2: Add new test case to existing describe block
// ============================================================
// Add this after the last test in 'Integration: Reparenting Observer Propagation'

it('should verify tree consistency after reparenting using debugger', () => {
  // ============================================================
  // PHASE 1: Setup - Create parent1, parent2, and child
  // ============================================================
  // ARRANGE: Create two root workflows
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');

  // ARRANGE: Create child attached to parent1
  const child = new SimpleWorkflow('Child', parent1);

  // ARRANGE: Create debugger attached to parent1
  const parent1Debugger = new WorkflowTreeDebugger(parent1);

  // ASSERT: Verify initial tree structure
  expect(child.parent).toBe(parent1);
  expect(parent1.children).toContain(child);
  expect(parent2.children).not.toContain(child);

  // ASSERT: Verify debugger sees initial structure
  const initialTree = parent1Debugger.getTree();
  expect(initialTree.name).toBe('Parent1');
  expect(initialTree.children.length).toBe(1);
  expect(initialTree.children[0].name).toBe('Child');

  // ============================================================
  // PHASE 2: Reparenting operation
  // ============================================================
  // ACT: Reparent child from parent1 to parent2
  parent1.detachChild(child);
  parent2.attachChild(child);

  // ASSERT: Verify basic reparenting succeeded
  expect(child.parent).toBe(parent2);
  expect(parent2.children).toContain(child);
  expect(parent1.children).not.toContain(child);

  // ============================================================
  // PHASE 3: Verify workflow tree structure
  // ============================================================
  // ASSERT: Verify child.parent points to new parent
  expect(child.parent).toBe(parent2);

  // ASSERT: Verify new parent.children includes child
  expect(parent2.children).toContain(child);

  // ASSERT: Verify old parent.children does NOT include child
  expect(parent1.children).not.toContain(child);

  // ============================================================
  // PHASE 4: Verify node tree structure using debugger
  // ============================================================
  // NOTE: parent1Debugger is still attached to parent1, so it shows parent1's tree
  // Create debugger for parent2 to see the new tree structure
  const parent2Debugger = new WorkflowTreeDebugger(parent2);

  // ASSERT: Verify debugger can find child node
  const childNode = parent2Debugger.getNode(child.id);
  expect(childNode).toBeDefined();
  expect(childNode?.name).toBe('Child');

  // ASSERT: Verify child's node parent is parent2's node (node tree mirrors workflow tree)
  expect(childNode?.parent).toBe(parent2.node);

  // ASSERT: Verify parent2's node children includes child's node
  const parent2Node = parent2Debugger.getNode(parent2.id);
  expect(parent2Node?.children).toContain(child.node);

  // ASSERT: Verify parent1's node children does NOT include child's node
  const parent1Node = parent1Debugger.getNode(parent1.id);
  expect(parent1Node?.children).not.toContain(child.node);

  // ============================================================
  // PHASE 5 (OPTIONAL): Visual validation using toTreeString()
  // ============================================================
  // ACT: Get tree string for visual debugging
  const parent2TreeString = parent2Debugger.toTreeString();

  // ASSERT: Verify tree structure in ASCII representation
  expect(parent2TreeString).toContain('Parent2');
  expect(parent2TreeString).toContain('Child');
  expect(parent2TreeString).toContain('├──');  // Tree connector symbol

  // ============================================================
  // PHASE 6 (OPTIONAL): Statistical validation
  // ============================================================
  const parent2Stats = parent2Debugger.getStats();
  expect(parent2Stats.totalNodes).toBe(2);  // parent2 + child = 2

  // ============================================================
  // CRITICAL VALIDATION: 1:1 Tree Mirror Invariant
  // ============================================================
  // Verify workflow tree and node tree are perfectly synchronized
  // This is the core invariant that must be maintained

  // Workflow tree state:
  expect(child.parent).toBe(parent2);
  expect(parent2.children).toEqual([child]);
  expect(parent1.children).toEqual([]);

  // Node tree state (via debugger):
  expect(child.node.parent).toBe(parent2.node);
  expect(parent2.node.children).toEqual([child.node]);
  expect(parent1.node.children).toEqual([]);

  // Cross-verification: debugger lookup matches direct access
  expect(parent2Debugger.getNode(child.id)).toBe(child.node);
  expect(parent2Debugger.getNode(parent2.id)).toBe(parent2.node);
});

// ============================================================
// REFERENCE: Tree Mirroring Implementation
// ============================================================
// How attachChild maintains 1:1 mirror (from src/core/workflow.ts:216-254):
//   this.children.push(child);           // Workflow tree
//   this.node.children.push(child.node);  // Node tree
//   child.parent = this;                  // Workflow tree
//
// How detachChild maintains 1:1 mirror (from src/core/workflow.ts:278-306):
//   this.children.splice(index, 1);      // Workflow tree
//   this.node.children.splice(nodeIndex, 1);  // Node tree
//   child.parent = null;                  // Workflow tree
//
// This test verifies both operations maintain the invariant.
```

### Integration Points

```yaml
MODIFY: src/__tests__/integration/workflow-reparenting.test.ts
  - add_import: WorkflowTreeDebugger to existing imports
  - add_test_case: "should verify tree consistency after reparenting using debugger"
  - pattern: Follow existing test structure in same file
  - dependencies: Requires WorkflowTreeDebugger class (already implemented)

NO CHANGES NEEDED:
  - src/debugger/tree-debugger.ts (debugger already implemented)
  - src/core/workflow.ts (attachChild/detachChild already implemented)
  - src/types/ (all types already defined)

TEST EXECUTION:
  - Run: npm test -- workflow-reparenting.test.ts
  - Run all integration tests: npm test -- src/__tests__/integration/
  - Full test suite: npm test
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding test case - fix before proceeding
cd /home/dustin/projects/groundswell

# Type checking (TypeScript compiler)
npx tsc --noEmit

# Expected: Zero type errors
# If errors exist, check:
#   - WorkflowTreeDebugger is imported from '../../index.js'
#   - WorkflowTreeDebugger constructor receives Workflow argument
#   - debugger methods (getTree, getNode, toTreeString, getStats) exist
#   - Type guards used correctly for optional returns

# Run the specific test file
npm test -- workflow-reparenting.test.ts

# Expected output:
#   ✓ src/__tests__/integration/workflow-reparenting.test.ts (3)
#   ✓ should update observer propagation after reparenting
#   ✓ should handle multiple reparenting cycles correctly
#   ✓ should verify tree consistency after reparenting using debugger  <-- NEW TEST

# If new test fails, debug:
#   1. Check debugger attachment (attached to correct parent)
#   2. Check node lookup (getNode returns correct nodes)
#   3. Check parent-child relationships after reparenting
#   4. Check workflow tree vs node tree synchronization
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the reparenting integration with tree consistency check
cd /home/dustin/projects/groundswell
npm test -- workflow-reparenting.test.ts

# Expected: All 3 tests pass (2 existing + 1 new)
# Focus on:
#   - Basic reparenting workflow
#   - Observer propagation (existing tests)
#   - Tree consistency validation (new test)

# Run related unit tests for regression check
npm test -- workflow-detachChild.test.ts
npm test -- tree-debugger.test.ts

# Expected: All existing tests still pass
# If regressions found, investigate:
#   - Did new test modify shared state?
#   - Are debugger instances isolated?

# Full test suite for comprehensive regression check
npm test

# Expected: All tests pass (260+ tests)
# Pay attention to:
#   - Tree integrity tests
#   - Integration tests
#   - Debugger tests
```

### Level 3: Integration Testing (System Validation)

```bash
# Test tree consistency validation manually
cd /home/dustin/projects/groundswell

cat > /tmp/test-tree-consistency.ts << 'EOF'
import { Workflow, WorkflowTreeDebugger } from './dist/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); return 'done'; }
}

// Create parents and child
const parent1 = new TestWorkflow('Parent1');
const parent2 = new TestWorkflow('Parent2');
const child = new TestWorkflow('Child', parent1);

// Create debugger for parent1
const debugger1 = new WorkflowTreeDebugger(parent1);

console.log('=== Initial State ===');
console.log('Tree structure:');
console.log(debugger1.toTreeString());

// Verify initial state
console.log('\\nValidation:');
console.log('  child.parent === parent1:', child.parent === parent1);
console.log('  parent1.children.includes(child):', parent1.children.includes(child));
console.log('  parent1.children.length:', parent1.children.length);

// Reparent
console.log('\\n=== Reparenting ===');
parent1.detachChild(child);
parent2.attachChild(child);

console.log('Reparented child from Parent1 to Parent2');

// Create debugger for parent2
const debugger2 = new WorkflowTreeDebugger(parent2);

console.log('\\n=== Post-Reparenting State ===');
console.log('Tree structure (Parent2):');
console.log(debugger2.toTreeString());

// Verify workflow tree
console.log('\\nWorkflow Tree Validation:');
console.log('  child.parent === parent2:', child.parent === parent2);
console.log('  parent2.children.includes(child):', parent2.children.includes(child));
console.log('  parent1.children.includes(child):', parent1.children.includes(child));

// Verify node tree
console.log('\\nNode Tree Validation (via debugger):');
const childNode = debugger2.getNode(child.id);
console.log('  debugger.getNode(child.id) exists:', !!childNode);
console.log('  child.node.parent === parent2.node:', child.node.parent === parent2.node);
console.log('  parent2.node.children.includes(child.node):', parent2.node.children.includes(child.node));
console.log('  parent1.node.children.includes(child.node):', parent1.node.children.includes(child.node));

// Final validation
const workflowTreeValid =
  child.parent === parent2 &&
  parent2.children.includes(child) &&
  !parent1.children.includes(child);

const nodeTreeValid =
  child.node.parent === parent2.node &&
  parent2.node.children.includes(child.node) &&
  !parent1.node.children.includes(child.node);

if (workflowTreeValid && nodeTreeValid) {
  console.log('\\n✓ Tree consistency validation PASSED');
  console.log('✓ 1:1 mirror invariant maintained');
  process.exit(0);
} else {
  console.log('\\n✗ Tree consistency validation FAILED');
  console.log('  Workflow tree valid:', workflowTreeValid);
  console.log('  Node tree valid:', nodeTreeValid);
  process.exit(1);
}
EOF

# Build first (if needed)
npm run build

# Run the manual test
npx tsx /tmp/test-tree-consistency.ts

# Expected output:
#   === Initial State ===
#   Tree structure:
#   ○ Parent1 [idle]
#   └── ○ Child [idle]
#
#   === Post-Reparenting State ===
#   Tree structure (Parent2):
#   ○ Parent2 [idle]
#   └── ○ Child [idle]
#
#   ✓ Tree consistency validation PASSED
#   ✓ 1:1 mirror invariant maintained

# If fails, check:
#   - attachChild/detachChild implementation
#   - Node tree updates in both methods
#   - Parent reference clearing
```

### Level 4: Debugger API Deep Dive

```bash
# Test WorkflowTreeDebugger API capabilities for tree validation
cd /home/dustin/projects/groundswell

cat > /tmp/test-debugger-api.ts << 'EOF'
import { Workflow, WorkflowTreeDebugger } from './dist/index.js';

class TestWorkflow extends Workflow {
  async run() { this.setStatus('completed'); return 'done'; }
}

// Setup
const parent1 = new TestWorkflow('Parent1');
const parent2 = new TestWorkflow('Parent2');
const child = new TestWorkflow('Child', parent1);

// Test 1: getTree() returns root node
console.log('=== Test 1: getTree() API ===');
const debugger1 = new WorkflowTreeDebugger(parent1);
const tree = debugger1.getTree();
console.log('  getTree() returns root:', tree.name === 'Parent1');
console.log('  Root has children:', tree.children.length > 0);
console.log('  Child name:', tree.children[0].name);

// Test 2: getNode() lookup by ID
console.log('\\n=== Test 2: getNode() API ===');
const foundChild = debugger1.getNode(child.id);
console.log('  getNode(child.id) found:', !!foundChild);
console.log('  Found node name:', foundChild?.name);
console.log('  Found node ID matches:', foundChild?.id === child.id);

// Test 3: toTreeString() visual representation
console.log('\\n=== Test 3: toTreeString() API ===');
const treeString = debugger1.toTreeString();
console.log('Tree string:');
console.log(treeString);
console.log('  Contains Parent1:', treeString.includes('Parent1'));
console.log('  Contains Child:', treeString.includes('Child'));
console.log('  Contains tree connectors:', treeString.includes('└──'));

// Test 4: getStats() statistical summary
console.log('\\n=== Test 4: getStats() API ===');
const stats = debugger1.getStats();
console.log('  Total nodes:', stats.totalNodes);
console.log('  Nodes by status:', stats.byStatus);
console.log('  Total logs:', stats.totalLogs);
console.log('  Total events:', stats.totalEvents);

// Test 5: Debugger updates on tree changes
console.log('\\n=== Test 5: Debugger Auto-Update ===');
console.log('Before reparenting:');
console.log('  parent1Debugger.getTree().children.length:', debugger1.getTree().children.length);

parent1.detachChild(child);
parent2.attachChild(child);

console.log('After reparenting:');
console.log('  parent1Debugger.getTree().children.length:', debugger1.getTree().children.length);
console.log('  Parent1 no longer has child:', debugger1.getTree().children.length === 0);

const debugger2 = new WorkflowTreeDebugger(parent2);
console.log('  parent2Debugger.getTree().children.length:', debugger2.getTree().children.length);
console.log('  Parent2 has child:', debugger2.getTree().children.length === 1);

// Test 6: Verify 1:1 mirror invariant
console.log('\\n=== Test 6: 1:1 Mirror Invariant ===');
console.log('Workflow tree:');
console.log('  child.parent:', child.parent?.node.name);
console.log('  parent2.children:', parent2.children.map(c => c.node.name));
console.log('  parent1.children:', parent1.children.map(c => c.node.name));

console.log('\\nNode tree (via debugger):');
const childNode = debugger2.getNode(child.id);
console.log('  child.node.parent:', childNode?.parent?.name);
console.log('  parent2.node.children:', parent2.node.children.map(n => n.name));
console.log('  parent1.node.children:', parent1.node.children.map(n => n.name));

const mirrorValid =
  child.parent === parent2 &&
  child.node.parent === parent2.node &&
  parent2.children.length === parent2.node.children.length &&
  parent1.children.length === parent1.node.children.length;

console.log('\\nMirror invariant valid:', mirrorValid);

if (mirrorValid) {
  console.log('\\n✓ All debugger API tests PASSED');
  process.exit(0);
} else {
  console.log('\\n✗ Mirror invariant check FAILED');
  process.exit(1);
}
EOF

npx tsx /tmp/test-debugger-api.ts

# Expected: All tests pass, demonstrating debugger API capabilities
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **All 4 validation levels completed successfully**
- [ ] **TypeScript compilation passes**: `npx tsc --noEmit` has zero errors
- [ ] **WorkflowTreeDebugger imported**: Added to imports in workflow-reparenting.test.ts
- [ ] **New test case added**: "should verify tree consistency after reparenting using debugger"
- [ ] **All tests pass**: `npm test -- workflow-reparenting.test.ts` shows 3 passing tests
- [ ] **No regressions**: Full integration test suite passes

### Feature Validation

- [ ] **child.parent points to new parent**: `expect(child.parent).toBe(parent2)` passes
- [ ] **new parent.children includes child**: `expect(parent2.children).toContain(child)` passes
- [ ] **old parent.children does NOT include child**: `expect(parent1.children).not.toContain(child)` passes
- [ ] **debugger.getNode() finds child**: Debugger can lookup child node by ID
- [ ] **node tree mirrors workflow tree**: `child.node.parent === parent2.node` and `parent2.node.children.includes(child.node)` pass
- [ ] **1:1 mirror invariant maintained**: Both workflow tree and node tree show consistent structure
- [ ] **Visual validation (optional)**: `toTreeString()` shows correct tree structure
- [ ] **Statistical validation (optional)**: `getStats()` shows expected node counts

### Code Quality Validation

- [ ] **Follows existing test patterns**: Uses AAA (Arrange-Act-Assert) pattern
- [ ] **Multi-phase test structure**: Clear PHASE 1, PHASE 2, etc. comments
- [ ] **Descriptive assertions**: Each expect() has clear description
- [ ] **Debugger API usage**: Uses getTree(), getNode(), toTreeString(), getStats() appropriately
- [ ] **Cross-verification**: Validates both workflow tree (direct) and node tree (via debugger)
- [ ] **No test pollution**: Each test creates fresh workflows, no shared state

### Integration & Debugger

- [ ] **Debugger attachment**: WorkflowTreeDebugger constructor receives correct workflow
- [ ] **Node lookup by ID**: `debugger.getNode(child.id)` returns correct node
- [ ] **Parent-child verification**: Debugger API validates parent-child relationships
- [ ] **Tree mirror validation**: Workflow tree and node tree show identical structure
- [ ] **Multiple debuggers**: Can create separate debuggers for parent1 and parent2
- [ ] **Auto-update behavior**: Debugger tree updates when structure changes (via onTreeChanged)

---

## Anti-Patterns to Avoid

- **Don't create new test file**: Add test case to existing `workflow-reparenting.test.ts`, don't create `workflow-tree-consistency.test.ts`
- **Don't forget to import WorkflowTreeDebugger**: Must add to imports at top of file
- **Don't use debugger attached to old parent**: After reparenting, debugger on parent1 won't see child - create new debugger for parent2
- **Don't only validate workflow tree**: Must also validate node tree via debugger to prove 1:1 mirror
- **Don't skip bidirectional checks**: Validate BOTH `child.parent === parent2` AND `parent2.children.includes(child)`
- **Don't ignore node tree validation**: Use `debugger.getNode()` to verify node tree mirrors workflow tree
- **Don't mix up debugger instances**: Keep `parent1Debugger` and `parent2Debugger` separate, clear variable names
- **Don't assume debugger auto-migrates**: Debugger attached to parent1 stays on parent1, doesn't follow child to parent2
- **Don't skip the 1:1 mirror check**: This is the critical invariant - verify workflow tree and node tree match exactly
- **Don't use wrong import path**: ES modules require .js extension: `import { WorkflowTreeDebugger } from '../../index.js'`

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
1. **Complete contract definition**: bug_fix_tasks.json P1.M2.T2.S2 specifies exact requirements
2. **Existing test patterns**: workflow-reparenting.test.ts (S1) provides structure to follow
3. **Debugger API well-documented**: tree-debugger.ts implementation is clear and tested
4. **Tree mirroring understood**: attachChild/detachChild implementation shows 1:1 mirror maintenance
5. **Validation commands specific**: All test commands are project-specific and executable
6. **Context completeness**: File paths, line numbers, patterns all specified
7. **No new dependencies**: Only needs existing WorkflowTreeDebugger class
8. **Small scope**: Single test case addition, not new file or complex feature

**Expected Outcome**: An AI agent implementing this PRP should:
- Add single test case (~80-100 lines) to existing file
- Import WorkflowTreeDebugger correctly
- Use debugger API for programmatic tree validation
- Verify 1:1 mirror invariant after reparenting
- Pass all tests on first run
- Complete in under 30 minutes

---

## Quick Reference Summary

| Aspect | Specification |
|--------|---------------|
| **File to Modify** | `src/__tests__/integration/workflow-reparenting.test.ts` |
| **Import to Add** | `WorkflowTreeDebugger` from `../../index.js` |
| **Test Name** | "should verify tree consistency after reparenting using debugger" |
| **Key Debugger Methods** | `getTree()`, `getNode(id)`, `toTreeString()`, `getStats()` |
| **Critical Validations** | child.parent, parent.children, node.parent, node.children |
| **1:1 Mirror Check** | Verify workflow tree and node tree show identical structure |
| **Test Command** | `npm test -- workflow-reparenting.test.ts` |
| **Expected Output** | 3 passing tests (2 existing + 1 new) |

---

## Appendix: Test Scenarios

### Primary Test Scenario (Complete Template)

```typescript
it('should verify tree consistency after reparenting using debugger', () => {
  // PHASE 1: Setup
  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);
  const parent1Debugger = new WorkflowTreeDebugger(parent1);

  // PHASE 2: Verify initial state
  expect(child.parent).toBe(parent1);
  expect(parent1.children).toContain(child);
  expect(parent1Debugger.getTree().children[0].name).toBe('Child');

  // PHASE 3: Reparent
  parent1.detachChild(child);
  parent2.attachChild(child);

  // PHASE 4: Validate workflow tree
  expect(child.parent).toBe(parent2);
  expect(parent2.children).toContain(child);
  expect(parent1.children).not.toContain(child);

  // PHASE 5: Validate node tree via debugger
  const parent2Debugger = new WorkflowTreeDebugger(parent2);
  const childNode = parent2Debugger.getNode(child.id);

  expect(childNode).toBeDefined();
  expect(childNode?.parent).toBe(parent2.node);
  expect(parent2.node.children).toContain(child.node);
  expect(parent1.node.children).not.toContain(child.node);

  // PHASE 6: Verify 1:1 mirror invariant
  expect(child.parent).toBe(parent2);
  expect(child.node.parent).toBe(parent2.node);
  expect(parent2.children).toEqual([child]);
  expect(parent2.node.children).toEqual([child.node]);
});
```

### Visual Validation Example (Optional Enhancement)

```typescript
// Optional: Visual tree validation
const treeString = parent2Debugger.toTreeString();
console.log('Tree structure after reparenting:');
console.log(treeString);

// Expected output:
// ○ Parent2 [idle]
// └── ○ Child [idle]

expect(treeString).toContain('Parent2');
expect(treeString).toContain('Child');
expect(treeString).toMatch(/Parent2.*Child/);  // Parent2 contains Child
```

### Statistical Validation Example (Optional Enhancement)

```typescript
// Optional: Statistical validation
const stats = parent2Debugger.getStats();
expect(stats.totalNodes).toBe(2);  // parent2 + child
expect(stats.byStatus.idle).toBe(2);  // Both workflows are idle
```

---

**PRP Version**: 1.0
**Created**: 2026-01-11
**For**: Subtask P1.M2.T2.S2 - Verify Tree Consistency After Reparenting
**PRD Reference**: Bug Fix Plan P1.M2 - Reparenting Support
**Dependencies**: P1.M2.T2.S1 (must complete first - provides test file to modify)

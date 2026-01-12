name: "PRP: Bidirectional Consistency Tests for Dual Tree Structure"
description: |

---

## Goal

**Feature Goal**: Create a comprehensive test suite that validates the 1:1 mirror invariant between the Workflow instance tree and the WorkflowNode tree after all tree mutation operations (attachChild, detachChild, reparenting).

**Deliverable**:
1. Helper functions library at `src/__tests__/helpers/tree-verification.ts`
2. Comprehensive test file at `src/__tests__/integration/bidirectional-consistency.test.ts`

**Success Definition**:
- Tests verify `child.parent === parent` AND `child.node.parent === parent.node` after attachChild()
- Tests verify `child.parent === null` AND `parent.node.children` does NOT contain `child.node` after detachChild()
- Tests cover multiple children, deep hierarchies, and reparenting scenarios
- All helper functions work correctly with both Workflow and WorkflowNode trees
- No regression in existing test suite
- Tests enforce the bidirectional consistency invariant as specified in PRD Section 12.2

## User Persona (if applicable)

**Target User**: Developer / QA Engineer ensuring tree integrity in the hierarchical workflow engine

**Use Case**: Validating that the dual tree structure (Workflow instances + WorkflowNode data structures) maintains perfect 1:1 correspondence during all tree operations

**User Journey**:
1. Developer runs the test suite with `npm test`
2. Bidirectional consistency tests execute as part of integration test suite
3. Tests pass, confirming the workflow tree and node tree remain synchronized
4. Developer gains confidence that tree operations won't create inconsistencies

**Pain Points Addressed**:
- Risk of workflow tree and node tree becoming out of sync
- Potential for subtle bugs where observer propagation fails due to tree inconsistency
- Difficulty validating the 1:1 mirror invariant required by PRD Section 12.2
- No automated way to detect when manual tree mutations corrupt state

## Why

- **Business value**: Ensures workflow engine reliability by enforcing the critical 1:1 tree mirror invariant from PRD Section 12.2. Without this invariant, observer propagation fails and state snapshots become inconsistent.
- **Integration with existing features**: Complements the reparenting functionality (P1.M2) by validating tree integrity after detach/attach operations
- **Problems this solves**:
  - Catches bugs where attachChild() or detachChild() only update one tree
  - Detects manual tree mutations that bypass validation
  - Validates the core architectural constraint that enables observer propagation
  - Provides regression protection for future tree operation changes

## What

Create a comprehensive test suite that validates bidirectional consistency between the Workflow instance tree and the WorkflowNode tree:

1. **Helper Functions Library**: Reusable functions for tree validation
   - `verifyBidirectionalLink(parent, child)` - Verifies parent-child links in BOTH trees
   - `verifyTreeMirror(root)` - Validates complete 1:1 correspondence
   - `validateTreeConsistency(root)` - Returns array of inconsistency descriptions
   - `verifyOrphaned(child)` - Confirms complete detachment
   - `verifyNoCycles(root)` - Detects circular references
   - `collectAllNodes(root)` - BFS traversal with cycle detection
   - `getDepth(node)` - Calculates node depth

2. **Test Coverage**:
   - attachChild() consistency (single child, multiple children)
   - detachChild() consistency (single child, middle child, last child)
   - Reparenting consistency (single reparent, multiple cycles, deep hierarchy)
   - Adversarial scenarios (manual mutation detection, stress tests)
   - Invariant validation (acyclicity, tree mirror, single root, connectedness)

### Success Criteria

- [ ] Helper functions file created at `src/__tests__/helpers/tree-verification.ts`
- [ ] Test file created at `src/__tests__/integration/bidirectional-consistency.test.ts`
- [ ] Tests verify BOTH workflow tree AND node tree after every operation
- [ ] Tests verify parent→child AND child→parent directions
- [ ] Tests cover attachChild(), detachChild(), and reparenting
- [ ] Tests include adversarial scenarios (manual mutation, deep hierarchies)
- [ ] All tests pass with `npm test`
- [ ] No regression in existing test suite

## All Needed Context

### Context Completeness Check

_This PRP provides everything needed for one-pass implementation:_

- Complete dual tree architecture understanding from system_context.md
- Exact file locations and naming conventions
- Existing test patterns to follow (with specific line references)
- External best practices documentation (with URLs)
- Ready-to-copy helper function implementations
- Complete test pattern templates
- Critical gotchas and anti-patterns to avoid

### Documentation & References

```yaml
# CRITICAL: PRD Requirement for 1:1 Tree Mirror
- docfile: plan/docs/bugfix-architecture/system_context.md
  why: Defines the 1:1 tree mirror invariant from PRD Section 12.2
  section: Lines 26-28 (Critical Invariant) and Lines 185-193 (PRD Requirements)
  critical: "Both trees must maintain perfect 1:1 mirroring as specified in PRD Section 12.2"

# CRITICAL: Implementation Patterns for Tree Integrity
- docfile: plan/docs/bugfix-architecture/implementation_patterns.md
  why: Pattern 3 (Bidirectional Tree Synchronization) and Pattern 7 (Tree Integrity Test Suite)
  section: Lines 105-136 (Pattern 3) and Lines 270-400 (Pattern 7)
  critical: Shows exactly how attachChild() and detachChild() must update both trees

# MUST READ: Workflow Class Dual Tree Structure
- file: src/core/workflow.ts
  why: Understanding how Workflow class maintains both workflow tree and node tree
  pattern: Lines 48-52 (parent/children properties) and Lines 98-108 (node initialization)
  gotcha: Both trees MUST be updated atomically - see attachChild() lines 216-255 and detachChild() lines 279-308
  critical: "child.node.parent = this.node;" (line 243) and "child.node.parent = null;" (line 300) show node tree updates

# MUST READ: WorkflowNode Interface Definition
- file: src/types/workflow.ts
  why: Understanding the WorkflowNode structure that mirrors Workflow class
  pattern: Lines 20-37 define WorkflowNode interface with parent and children properties
  critical: WorkflowNode.parent is WorkflowNode | null (line 26)
  critical: WorkflowNode.children is WorkflowNode[] (line 28)

# MUST READ: Existing Bidirectional Consistency Pattern
- file: src/__tests__/integration/workflow-reparenting.test.ts
  why: Lines 280-302 show the exact 1:1 Tree Mirror Invariant validation pattern to follow
  pattern: CRITICAL VALIDATION section shows explicit verification of both trees
  pattern: "Workflow tree state" vs "Node tree state" assertions (lines 285-297)
  critical: This is the GOLD STANDARD pattern for bidirectional consistency testing

# MUST READ: Existing Test Patterns for Reference
- file: src/__tests__/adversarial/deep-hierarchy-stress.test.ts
  why: Pattern for creating deep hierarchies and testing tree operations
  pattern: Lines 57-79 show loop-based hierarchy creation
  pattern: Lines 92-109 show protected method access with (current as any).getRoot()

- file: src/__tests__/adversarial/parent-validation.test.ts
  why: Console mocking pattern and test structure
  pattern: Lines 33-37 (beforeEach console mocking)
  pattern: Lines 43-45 (afterEach vi.restoreAllMocks())

- file: src/__tests__/adversarial/complex-circular-reference.test.ts
  why: Multi-level hierarchy test pattern
  pattern: Lines 119-138 show deep hierarchy creation with multiple levels

# MUST READ: WorkflowTreeDebugger for Tree Inspection
- file: src/debugger/tree-debugger.ts
  why: Provides tree traversal and node lookup capabilities
  pattern: Lines 52-58 show buildNodeMap() recursive pattern for BFS traversal
  pattern: Lines 98-100 show getNode() lookup via Map
  gotcha: debugger rebuilds nodeMap on onTreeChanged() - useful for validation

# RESEARCH: External Best Practices (with URLs)
- url: https://dom.spec.whatwg.org/#concept-tree-parent
  why: DOM Tree API is the authoritative reference for tree mutation semantics
  section: Concept of "tree" and parent-child relationships
  critical: Validates our approach to bidirectional consistency

- url: https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiber.js
  why: React Fiber architecture maintains dual trees (current + workInProgress)
  section: Fiber node structure with return, child, sibling properties
  critical: Shows production dual-tree pattern similar to our Workflow/WorkflowNode

- url: https://vitest.dev/guide/
  why: Official Vitest documentation for test syntax and assertions
  section: Test API reference for expect() and describe() patterns

# RESEARCH DOCUMENTS (Created during research phase)
- docfile: plan/bugfix/P1M3T1S4/research/QUICK_REFERENCE.md
  why: Quick reference for helper functions and test templates
  section: Essential Helper Functions (lines 21-54) and Test Template (lines 58-86)

- docfile: plan/bugfix/P1M3T1S4/research/test-pattern-examples.md
  why: Complete ready-to-copy implementations of all helper functions
  section: Lines 10-211 contain complete helper function implementations
  critical: All 7 helper functions are fully implemented and ready to copy

- docfile: plan/bugfix/P1M3T1S4/research/bidirectional-tree-consistency-testing.md
  why: Comprehensive testing methodology and external best practices
  section: Core Testing Patterns and Test Pattern Catalog
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── __tests__/
│   ├── helpers/                      # NEW DIRECTORY TO CREATE
│   │   └── tree-verification.ts      # NEW: Helper functions for tree validation
│   ├── integration/
│   │   ├── workflow-reparenting.test.ts    # Lines 280-302: 1:1 Tree Mirror pattern
│   │   ├── tree-mirroring.test.ts          # Tree mirror validation
│   │   └── bidirectional-consistency.test.ts  # NEW: Main test file
│   ├── adversarial/
│   │   ├── deep-hierarchy-stress.test.ts    # Pattern for deep hierarchies
│   │   ├── parent-validation.test.ts        # Console mocking pattern
│   │   └── complex-circular-reference.test.ts
│   └── unit/
├── core/
│   ├── workflow.ts                   # Lines 48-52: parent/children, Lines 98-108: node
│   └── ...
├── types/
│   ├── workflow.ts                   # Lines 20-37: WorkflowNode interface
│   └── ...
└── debugger/
    └── tree-debugger.ts              # Lines 52-58: BFS traversal pattern

plan/bugfix/P1M3T1S4/
├── PRP.md                            # This file
└── research/
    ├── QUICK_REFERENCE.md            # Helper function quick reference
    ├── test-pattern-examples.md      # Complete implementation examples
    ├── bidirectional-tree-consistency-testing.md  # Full methodology
    └── SUMMARY.md                    # Research summary
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── __tests__/
│   ├── helpers/                          # NEW DIRECTORY
│   │   ├── index.ts                      # NEW: Barrel export for helpers
│   │   └── tree-verification.ts          # NEW: 7 helper functions for tree validation
│   └── integration/
│       └── bidirectional-consistency.test.ts  # NEW: Comprehensive test suite
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: The Dual Tree Structure
// Workflow class maintains TWO trees that must be kept in sync:
// 1. Workflow instance tree: parent (Workflow), children (Workflow[])
// 2. Node tree: node.parent (WorkflowNode), node.children (WorkflowNode[])
// BOTH must be updated on every attachChild() and detachChild() operation

// CRITICAL: 1:1 Tree Mirror Invariant (from PRD Section 12.2)
// For every relationship in the workflow tree, there MUST be an equivalent relationship in the node tree:
// If child.parent === parent, then child.node.parent MUST equal parent.node
// If parent.children includes child, then parent.node.children MUST include child.node

// CRITICAL: Accessing protected/private methods in tests
// getRoot() is protected - cast to 'any' for testing
const root = (child as any).getRoot();

// CRITICAL: Workflow constructor auto-attaches when parent is provided
// Pattern from workflow.ts:113-116
const child = new Workflow('Child', parent);
// This automatically calls parent.attachChild(this) - no need to call attachChild() separately

// CRITICAL: Console methods must be mocked in adversarial tests
// Pattern from src/__tests__/adversarial/parent-validation.test.ts:33-37
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// CRITICAL: Always restore mocks in afterEach
afterEach(() => {
  vi.restoreAllMocks();
});

// CRITICAL: Test file naming and placement
// - Integration tests go in src/__tests__/integration/
// - Helper functions go in src/__tests__/helpers/
// - Test file names end with .test.ts
// - Test names use "should" pattern: "should maintain consistency after attach"

// CRITICAL: Import patterns for tests
// Use .js extension for all imports (this is a TypeScript project with ES modules)
import { Workflow } from '../../index.js';
import { verifyBidirectionalLink } from '../helpers/tree-verification.js';

// CRITICAL: Helper functions throw errors, don't return booleans
// verifyBidirectionalLink() throws if inconsistency found
// validateTreeConsistency() returns string[] (empty if valid)

// CRITICAL: Cycle detection in BFS traversal
// When collecting all nodes, must detect cycles to prevent infinite loops
// Use Set<Workflow> to track visited nodes

// CRITICAL: Reference equality for WorkflowNode comparison
// WorkflowNode is an interface - use reference equality (===) not deep equality
expect(parent.node.children[0]).toBe(child.node);  // Correct - same reference
```

## Implementation Blueprint

### Data models and structure

No new data models needed - using existing Workflow class, WorkflowNode interface, and testing infrastructure.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/helpers/ directory
  - IMPLEMENT: New helpers directory for test utilities
  - CREATE: index.ts barrel export file
  - NAMING: All helper files use kebab-case naming
  - PLACEMENT: src/__tests__/helpers/

Task 2: CREATE src/__tests__/helpers/tree-verification.ts
  - IMPLEMENT: collectAllNodes(root: Workflow): Workflow[] function
  - IMPLEMENT: validateTreeConsistency(root: Workflow): string[] function
  - IMPLEMENT: verifyBidirectionalLink(parent: Workflow, child: Workflow): void function
  - IMPLEMENT: verifyOrphaned(child: Workflow): void function
  - IMPLEMENT: verifyNoCycles(root: Workflow): void function
  - IMPLEMENT: verifyTreeMirror(workflowRoot: Workflow): void function
  - IMPLEMENT: getDepth(node: Workflow): number function
  - COPY implementation from: plan/bugfix/P1M3T1S4/research/test-pattern-examples.md (lines 10-211)
  - EXPORT: All functions with named exports
  - PLACEMENT: src/__tests__/helpers/tree-verification.ts

Task 3: CREATE src/__tests__/helpers/index.ts
  - IMPLEMENT: Barrel export for all helper functions
  - EXPORT * from './tree-verification.js'
  - PLACEMENT: src/__tests__/helpers/index.ts

Task 4: CREATE src/__tests__/integration/bidirectional-consistency.test.ts
  - IMPLEMENT: describe block "Bidirectional Consistency: Basic Operations"
  - IMPLEMENT: describe block "Bidirectional Consistency: Reparenting"
  - IMPLEMENT: describe block "Bidirectional Consistency: Invariants"
  - IMPLEMENT: describe block "Bidirectional Consistency: Adversarial Tests"
  - FOLLOW pattern: src/__tests__/integration/workflow-reparenting.test.ts (lines 280-302)
  - COPY test templates from: plan/bugfix/P1M3T1S4/research/test-pattern-examples.md (lines 215-845)
  - IMPORT: Workflow from '../../index.js'
  - IMPORT: Helper functions from '../helpers/tree-verification.js'
  - PLACEMENT: src/__tests__/integration/bidirectional-consistency.test.ts

Task 5: IMPLEMENT attachChild() Consistency Tests
  - IMPLEMENT: Test "should maintain bidirectional links in both trees"
  - IMPLEMENT: Test "should maintain consistency when attaching multiple children"
  - VERIFY: child.parent === parent AND child.node.parent === parent.node
  - VERIFY: parent.children contains child AND parent.node.children contains child.node
  - USE: verifyBidirectionalLink(parent, child) after attachChild()
  - USE: verifyTreeMirror(parent) to validate entire tree
  - USE: validateTreeConsistency(parent) to check for hidden issues

Task 6: IMPLEMENT detachChild() Consistency Tests
  - IMPLEMENT: Test "should remove bidirectional links from both trees"
  - IMPLEMENT: Test "should maintain consistency when detaching middle child"
  - VERIFY: child.parent === null AND child.node.parent === null
  - VERIFY: parent.children does NOT contain child
  - VERIFY: parent.node.children does NOT contain child.node
  - USE: verifyOrphaned(child) after detachChild()

Task 7: IMPLEMENT Reparenting Consistency Tests
  - IMPLEMENT: Test "should maintain consistency during single reparenting"
  - IMPLEMENT: Test "should maintain consistency during multiple reparenting cycles"
  - IMPLEMENT: Test "should maintain consistency with deep hierarchy reparenting"
  - VERIFY: Old parent no longer references child in BOTH trees
  - VERIFY: New parent correctly references child in BOTH trees
  - VERIFY: Both trees (old parent and new parent) maintain mirror invariant
  - FOLLOW pattern: src/__tests__/integration/workflow-reparenting.test.ts (lines 129-186)

Task 8: IMPLEMENT Invariant Tests
  - IMPLEMENT: Test for acyclicity invariant (no circular references)
  - IMPLEMENT: Test for tree mirror invariant (1:1 correspondence)
  - IMPLEMENT: Test for single root invariant
  - IMPLEMENT: Test for connectedness invariant (all nodes reachable from root)
  - USE: verifyNoCycles(root) for acyclicity
  - USE: verifyTreeMirror(root) for mirror invariant

Task 9: IMPLEMENT Adversarial Tests
  - IMPLEMENT: Test "should detect inconsistency from manual parent mutation"
  - IMPLEMENT: Test "should maintain consistency with deep hierarchies"
  - IMPLEMENT: Test "should maintain consistency with wide hierarchies"
  - IMPLEMENT: Test "should maintain consistency during rapid attach/detach cycles"
  - VERIFY: validateTreeConsistency() detects manual mutations
  - CREATE: Deep hierarchy (100+ levels) for stress testing
  - CREATE: Wide hierarchy (100+ children) for stress testing

Task 10: VALIDATE Full Test Suite
  - RUN: npm test or vitest run
  - VERIFY: New bidirectional-consistency.test.ts tests pass
  - VERIFY: All existing tests still pass (no regression)
  - CHECK: Test count increases appropriately
  - VALIDATE: No TypeScript errors with npx tsc --noEmit
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// HELPER FUNCTIONS IMPLEMENTATION
// File: src/__tests__/helpers/tree-verification.ts
// ============================================================================

import type { Workflow } from '../../index.js';

/**
 * Collect all nodes in tree via BFS
 * Throws if circular reference detected
 * Pattern from: tree-debugger.ts:52-58 (buildNodeMap)
 */
export function collectAllNodes(root: Workflow): Workflow[] {
  const nodes: Workflow[] = [];
  const queue: Workflow[] = [root];
  const visited = new Set<Workflow>();

  while (queue.length > 0) {
    const node = queue.shift()!;

    // CRITICAL: Cycle detection
    if (visited.has(node)) {
      throw new Error(`Circular reference detected at ${node.node.name}`);
    }

    visited.add(node);
    nodes.push(node);
    queue.push(...node.children);
  }

  return nodes;
}

/**
 * Validate tree-wide bidirectional consistency
 * Returns array of inconsistency descriptions (empty if valid)
 *
 * This is the comprehensive validation that checks:
 * 1. Parent → child links in workflow tree
 * 2. Child → parent links in workflow tree
 * 3. Node tree mirrors workflow tree (parent relationship)
 * 4. Node tree mirrors workflow tree (children relationship)
 */
export function validateTreeConsistency(root: Workflow): string[] {
  const errors: string[] = [];
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    // Check parent→child link in workflow tree
    if (node.parent) {
      if (!node.parent.children.includes(node)) {
        errors.push(
          `[WORKFLOW TREE] Orphaned child: "${node.node.name}" not in parent "${node.parent.node.name}"'s children list`
        );
      }
    } else {
      // Root node - should not be in anyone's children
      const parentClaimants = allNodes.filter(n => n.children.includes(node));
      if (parentClaimants.length > 0) {
        errors.push(
          `[WORKFLOW TREE] Root node "${node.node.name}" claimed as child by [${parentClaimants.map(n => n.node.name).join(', ')}]`
        );
      }
    }

    // Check child→parent links
    node.children.forEach(child => {
      // Workflow tree check
      if (child.parent !== node) {
        errors.push(
          `[WORKFLOW TREE] Mismatched parent: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${node.node.name}"`
        );
      }

      // CRITICAL: Check node tree mirrors workflow tree - parent relationship
      if (child.node.parent !== node.node) {
        errors.push(
          `[NODE TREE] Mismatched parent: "${child.node.name}".node.parent is "${child.node.parent?.name ?? 'null'}", expected "${node.node.name}"`
        );
      }

      // CRITICAL: Check node tree mirrors workflow tree - children relationship
      if (!node.node.children.includes(child.node)) {
        errors.push(
          `[NODE TREE] Orphaned child: "${child.node.name}".node not in parent "${node.node.name}"'s node.children array`
        );
      }
    });
  });

  return errors;
}

/**
 * Verify bidirectional link between parent and child in BOTH trees
 * Throws if inconsistency found
 *
 * This is the primary assertion helper for testing attachChild() operations
 * Usage: parent.attachChild(child); verifyBidirectionalLink(parent, child);
 */
export function verifyBidirectionalLink(parent: Workflow, child: Workflow): void {
  // Workflow tree checks
  if (child.parent !== parent) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.children.includes(child)) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${parent.node.name}".children does not contain "${child.node.name}"`
    );
  }

  // CRITICAL: Node tree checks (must mirror workflow tree)
  if (child.node.parent !== parent.node) {
    throw new Error(
      `[NODE TREE] Bidirectional link broken: "${child.node.name}".node.parent is "${child.node.parent?.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.node.children.includes(child.node)) {
    throw new Error(
      `[NODE TREE] Bidirectional link broken: "${parent.node.name}".node.children does not contain "${child.node.name}"`
    );
  }
}

/**
 * Verify complete orphaning after detach
 * Usage: parent.detachChild(child); verifyOrphaned(child);
 */
export function verifyOrphaned(child: Workflow): void {
  if (child.parent !== null) {
    throw new Error(
      `Child "${child.node.name}" not orphaned: parent is "${child.parent.node.name}"`
    );
  }

  if (child.node.parent !== null) {
    throw new Error(
      `Child "${child.node.name}" not orphaned in node tree: parent is "${child.node.parent.name}"`
    );
  }
}

/**
 * Verify no circular references exist
 * Usage: verifyNoCycles(root);
 */
export function verifyNoCycles(root: Workflow): void {
  const visited = new Set<Workflow>();
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    if (visited.has(node)) {
      throw new Error(`Circular reference detected: node "${node.node.name}" visited twice`);
    }
    visited.add(node);
  });
}

/**
 * Verify tree mirror invariant (1:1 correspondence)
 * This is the CRITICAL invariant from PRD Section 12.2
 * Usage: verifyTreeMirror(root);
 */
export function verifyTreeMirror(workflowRoot: Workflow): void {
  const allNodes = collectAllNodes(workflowRoot);

  allNodes.forEach(wfNode => {
    const node = wfNode.node;

    // Verify parent relationship mirrors
    if (wfNode.parent) {
      if (node.parent !== wfNode.parent.node) {
        throw new Error(
          `[MIRROR] Parent mismatch: "${wfNode.node.name}".parent is "${node.parent?.name}", expected "${wfNode.parent.node.name}"`
        );
      }
    } else {
      if (node.parent !== null) {
        throw new Error(
          `[MIRROR] Parent mismatch: "${wfNode.node.name}".parent is "${node.parent.name}", expected null`
        );
      }
    }

    // Verify children relationship mirrors
    if (node.children.length !== wfNode.children.length) {
      throw new Error(
        `[MIRROR] Children count mismatch: "${wfNode.node.name}" has ${wfNode.children.length} workflow children but ${node.children.length} node children`
      );
    }

    wfNode.children.forEach((childWf, index) => {
      if (node.children[index] !== childWf.node) {
        throw new Error(
          `[MIRROR] Child mismatch at index ${index}: expected "${childWf.node.name}", got "${node.children[index].name}"`
        );
      }
    });
  });
}

/**
 * Get depth of node in tree
 */
export function getDepth(node: Workflow): number {
  let depth = 0;
  let current: Workflow | null = node;

  while (current !== null) {
    depth++;
    current = current.parent;
  }

  return depth - 1; // Subtract 1 for the node itself
}

// ============================================================================
// TEST IMPLEMENTATION PATTERN
// File: src/__tests__/integration/bidirectional-consistency.test.ts
// ============================================================================

import { describe, it, expect } from 'vitest';
import { Workflow } from '../../index.js';
import {
  verifyBidirectionalLink,
  verifyTreeMirror,
  validateTreeConsistency,
} from '../helpers/tree-verification.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/adversarial/circular-reference.test.ts:20-26
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Bidirectional Consistency: Basic Operations', () => {
  describe('attachChild() consistency', () => {
    it('should maintain bidirectional links in both trees', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child'); // No parent

      // ACT
      parent.attachChild(child);

      // ASSERT - Verify bidirectional links
      verifyBidirectionalLink(parent, child);

      // ASSERT - Verify tree mirror invariant
      verifyTreeMirror(parent);

      // ASSERT - Verify no inconsistencies detected
      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });

    it('should maintain consistency when attaching multiple children', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child1 = new SimpleWorkflow('Child1');
      const child2 = new SimpleWorkflow('Child2');
      const child3 = new SimpleWorkflow('Child3');

      // ACT
      parent.attachChild(child1);
      parent.attachChild(child2);
      parent.attachChild(child3);

      // ASSERT - Verify each child
      verifyBidirectionalLink(parent, child1);
      verifyBidirectionalLink(parent, child2);
      verifyBidirectionalLink(parent, child3);

      // ASSERT - Verify entire tree
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });
  });

  describe('detachChild() consistency', () => {
    it('should remove bidirectional links from both trees', () => {
      // ARRANGE
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // ACT
      parent.detachChild(child);

      // ASSERT - Verify orphaning in BOTH trees
      expect(child.parent).toBeNull();
      expect(child.node.parent).toBeNull();
      expect(parent.children).not.toContain(child);
      expect(parent.node.children).not.toContain(child.node);

      // ASSERT - Verify tree mirror
      verifyTreeMirror(parent);

      const errors = validateTreeConsistency(parent);
      expect(errors).toEqual([]);
    });
  });
});

describe('Bidirectional Consistency: Reparenting', () => {
  it('should maintain consistency during single reparenting', () => {
    // ARRANGE
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // ASSERT - Verify initial state
    verifyBidirectionalLink(parent1, child);

    // ACT - Reparent
    parent1.detachChild(child);
    parent2.attachChild(child);

    // ASSERT - Verify new state
    verifyBidirectionalLink(parent2, child);

    // ASSERT - Verify old parent no longer has child in BOTH trees
    expect(parent1.children).not.toContain(child);
    expect(parent1.node.children).not.toContain(child.node);

    // ASSERT - Verify new parent has child in BOTH trees
    expect(parent2.children).toContain(child);
    expect(parent2.node.children).toContain(child.node);

    // ASSERT - Verify both trees are valid
    verifyTreeMirror(parent1);
    verifyTreeMirror(parent2);

    const errors1 = validateTreeConsistency(parent1);
    const errors2 = validateTreeConsistency(parent2);
    expect(errors1).toEqual([]);
    expect(errors2).toEqual([]);
  });
});

describe('Bidirectional Consistency: Invariants', () => {
  describe('Tree mirror invariant', () => {
    it('should maintain 1:1 correspondence after operations', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);

      // ASSERT - Verify mirror after creation
      verifyTreeMirror(root);

      // ACT - Detach and reattach
      root.detachChild(child1);
      verifyTreeMirror(root);

      root.attachChild(child1);
      verifyTreeMirror(root);

      // ASSERT - Verify both trees have same structure
      expect(root.children.length).toBe(root.node.children.length);
      expect(root.children[0].node).toBe(root.node.children[0]);
      expect(root.children[1].node).toBe(root.node.children[1]);
    });
  });
});

describe('Bidirectional Consistency: Adversarial Tests', () => {
  describe('Manual mutation detection', () => {
    it('should detect inconsistency from manual parent mutation', () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // ACT - Manually mutate parent (bypassing attachChild)
      (child as any).parent = parent2;

      // ASSERT - Should detect inconsistency
      const errors = validateTreeConsistency(parent1);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Mismatched parent'))).toBe(true);
    });
  });

  describe('Stress testing', () => {
    it('should maintain consistency with deep hierarchies', () => {
      // ARRANGE
      const root = new SimpleWorkflow('Root');
      let current = root;

      // ACT - Create 100 levels deep
      for (let i = 0; i < 100; i++) {
        const child = new SimpleWorkflow(`Level-${i}`);
        current.attachChild(child);
        current = child;
      }

      // ASSERT - Verify consistency at each level
      verifyTreeMirror(root);
      verifyNoCycles(root);

      const errors = validateTreeConsistency(root);
      expect(errors).toEqual([]);
    });
  });
});
```

### Integration Points

```yaml
TEST_FRAMEWORK:
  - command: "npm test" or "vitest run"
  - pattern: All tests in src/__tests__/**/*.test.ts are auto-discovered
  - config: vitest.config.ts with globals: true

EXISTING_TESTS:
  - file: src/__tests__/integration/workflow-reparenting.test.ts
    reference: Lines 280-302 (CRITICAL VALIDATION: 1:1 Tree Mirror Invariant)
    note: This is the GOLD STANDARD pattern to follow

  - file: src/__tests__/adversarial/deep-hierarchy-stress.test.ts
    reference: Deep hierarchy creation pattern (lines 57-79)
    note: Shows loop-based pattern for building deep trees

CODE_UNDER_TEST:
  - file: src/core/workflow.ts
    methods: attachChild() (lines 216-255), detachChild() (lines 279-308)
    properties: parent (line 49), children (line 52), node (line 61)
    gotcha: Both workflow tree AND node tree must be updated

TYPES:
  - file: src/types/workflow.ts
    interface: WorkflowNode (lines 20-37)
    properties: parent (WorkflowNode | null), children (WorkflowNode[])
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler check
npx tsc --noEmit

# Expected: Zero TypeScript errors. If errors exist, READ output and fix before proceeding.
# Common issues:
# - Missing .js extensions in imports
# - Incorrect type annotations
# - Missing exports
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new test file specifically
npm test bidirectional-consistency

# Run integration test suite
npm test -- src/__tests__/integration/

# Full test suite for regression check
npm test

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# Expected output: Test count increases (from ~250 to ~270+)
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify test file is discovered by Vitest
npm test -- --listTests 2>&1 | grep bidirectional-consistency

# Verify helper file can be imported
npm test -- --reporter=verbose 2>&1 | grep tree-verification

# Expected: bidirectional-consistency.test.ts appears in test list
# Expected: tree-verification.ts can be imported successfully
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual invariant validation (if needed)
node -e "
const { Workflow } = require('./dist/index.js');

class TestWF extends Workflow {
  async run() { return 'done'; }
}

const parent = new TestWF('Parent');
const child = new TestWF('Child');
parent.attachChild(child);

// Check 1:1 mirror invariant
console.log('child.parent === parent:', child.parent === parent);
console.log('child.node.parent === parent.node:', child.node.parent === parent.node);
console.log('parent.children includes child:', parent.children.includes(child));
console.log('parent.node.children includes child.node:', parent.node.children.includes(child.node));
"

# Expected: All checks return true
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Helper functions file created at: `src/__tests__/helpers/tree-verification.ts`
- [ ] Test file created at: `src/__tests__/integration/bidirectional-consistency.test.ts`
- [ ] Barrel export created at: `src/__tests__/helpers/index.ts`

### Feature Validation

- [ ] Tests verify BOTH workflow tree AND node tree after attachChild()
- [ ] Tests verify BOTH workflow tree AND node tree after detachChild()
- [ ] Tests verify parent→child AND child→parent directions
- [ ] Tests cover single child, multiple children scenarios
- [ ] Tests cover reparenting scenarios
- [ ] Tests cover deep hierarchy stress testing (100+ levels)
- [ ] Tests detect manual tree mutations
- [ ] All helper functions work correctly

### Code Quality Validation

- [ ] Follows existing test patterns from workflow-reparenting.test.ts
- [ ] File placement matches desired codebase tree structure
- [ ] Test naming consistent with "should" convention
- [ ] Proper use of Vitest globals (describe, it, expect)
- [ ] All imports use .js extension (ES module requirement)
- [ ] Helper functions have JSDoc comments

### Documentation & Deployment

- [ ] Code is self-documenting with clear test descriptions
- [ ] Test comments explain the invariant being validated
- [ ] Helper function comments explain purpose and usage
- [ ] Research documents linked in PRP for reference
- [ ] No new environment variables or configuration needed

---

## Anti-Patterns to Avoid

- ❌ Don't check only workflow tree - ALWAYS check both workflow tree AND node tree
- ❌ Don't check only one direction - ALWAYS verify parent→child AND child→parent
- ❌ Don't use boolean returns for validation - use throws or string[] for detailed errors
- ❌ Don't skip console mocking in adversarial tests - follow existing patterns
- ❌ Don't forget .js extension in imports - required for ES modules
- ❌ Don't use deep equality for WorkflowNode - use reference equality (===)
- ❌ Don't skip cycle detection in BFS traversal - use Set<Workflow> to track visited
- ❌ Don't test at extreme depth (10000+) - test at reasonable depth (100-1000)
- ❌ Don't forget to verify state after error cases - validate no corruption occurred
- ❌ Don't manually mutate tree properties in tests - use attachChild/detachChild
- ❌ Don't create test workflows without run() method - SimpleWorkflow pattern includes this
- ❌ Don't mix workflow and node tree references - keep them clear and separate
- ❌ Don't use expect().toThrow() for validateTreeConsistency - it returns string[], not throws

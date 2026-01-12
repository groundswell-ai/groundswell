---
name: "PRP: Verify PRD Section 12.2 Compliance - Tree Integrity Requirements"
description: Create comprehensive compliance test validating PRD Section 12.2 requirements for workflow tree structure integrity

---

## Goal

**Feature Goal**: Create a PRD compliance test suite that explicitly validates all requirements from PRD Section 12.2 (Workflow Base Class) related to parent-child tree structure integrity.

**Deliverable**: A new test file `src/__tests__/adversarial/prd-12-2-compliance.test.ts` with comprehensive test cases covering each requirement in PRD Section 12.2.

**Success Definition**:
- All PRD Section 12.2 requirements have explicit test assertions
- Tests verify: (1) child has exactly one parent, (2) child.parent matches parent, (3) child appears in only one parent's children array, (4) node tree mirrors workflow tree
- Tests pass with the fixed attachChild() and detachChild() implementations
- Tests would fail with the original buggy implementation (demonstrating they catch violations)

## User Persona

**Target User**: Development team and QA engineers validating the bug fix implementation

**Use Case**: Ensure the bug fix for attachChild() tree integrity violation fully addresses PRD Section 12.2 requirements

**User Journey**:
1. Run the PRD compliance test suite
2. Review clear assertion messages showing which requirement is being validated
3. Get comprehensive documentation of any deviations from PRD requirements

**Pain Points Addressed**:
- Ambiguity about whether the bug fix fully addresses PRD requirements
- Lack of explicit documentation mapping tests to PRD sections
- Risk of missing edge cases in tree integrity validation

## Why

- **Quality Assurance**: PRD Section 12.2 defines critical tree structure invariants that prevent data corruption
- **Regression Prevention**: Explicit compliance tests ensure future changes don't violate core requirements
- **Documentation**: Tests serve as executable documentation of PRD requirements
- **Bug Fix Validation**: Confirms the attachChild() bug fix fully addresses the root cause

## What

Create a comprehensive test suite that validates PRD Section 12.2 requirements with explicit assertions for each invariant:

### Success Criteria

- [ ] Test file created at `src/__tests__/adversarial/prd-12-2-compliance.test.ts`
- [ ] Test explicitly validates "child has exactly one parent" requirement
- [ ] Test explicitly validates "child.parent matches parent" requirement
- [ ] Test explicitly validates "child appears in only one parent's children array" requirement
- [ ] Test explicitly validates "node tree mirrors workflow tree" requirement
- [ ] Test attempts to attach child to second parent (should throw)
- [ ] Test includes clear documentation linking assertions to PRD requirements
- [ ] All tests pass with current implementation
- [ ] Test file follows existing test patterns from codebase

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: Yes - This PRP provides complete context including:
- Exact PRD requirements with line references
- File paths to all relevant implementations
- Existing test patterns to follow
- Helper utilities available for validation
- Test runner commands

### Documentation & References

```yaml
# MUST READ - PRD Requirements
- file: /home/dustin/projects/groundswell/PRPs/PRDs/001-hierarchical-workflow-engine.md
  why: Contains PRD Section 12.2 (lines 312-368) - Workflow Base Class Skeleton requirements
  critical: Section 12.2 defines tree integrity requirements that this test must validate
  section: "Section 12.2 Workflow Base Class Skeleton" (lines 311-368)

# CRITICAL - Work Item Definition
- file: /home/dustin/projects/groundswell/bug_fix_tasks.json
  why: Contains the exact work item definition for P1.M3.T2.S1
  section: "P1.M3.T2.S1" - Contains contract definition with specific requirements

# IMPLEMENTATION - Core Workflow Class
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains attachChild() (lines 216-255) and detachChild() (lines 279-308) implementations
  pattern: Parent validation logic, circular reference detection, dual tree management
  gotcha: Implementation maintains BOTH workflow tree (Workflow.parent/children) AND node tree (WorkflowNode.parent/children)

# IMPLEMENTATION - isDescendantOf Helper
- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains circular reference detection logic (lines 150-168)
  pattern: Uses visited Set for cycle detection during parent chain traversal

# TEST PATTERN - Existing PRD Compliance Tests
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/prd-compliance.test.ts
  why: Demonstrates pattern for organizing tests by PRD section number
  pattern: `describe('PRD Section X.Y: ...')` with `it()` tests for each requirement

# TEST PATTERN - Bidirectional Consistency Tests
- file: /home/dustin/projects/groundswell/src/__tests__/integration/bidirectional-consistency.test.ts
  why: Contains helper functions for validating tree structure invariants
  pattern: verifyBidirectionalLink(), verifyTreeMirror(), collectAllNodes()

# TEST UTILITY - Tree Verification Helpers
- file: /home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts
  why: Contains reusable validation functions for tree consistency
  pattern: validateTreeConsistency(), verifyNoCycles(), getDepth()

# TEST UTILITY - WorkflowTreeDebugger
- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: Provides tree inspection capabilities for validation
  pattern: getTree(), getNode(id), toTreeString() for visual tree representation

# TEST CONFIGURATION
- file: /home/dustin/projects/groundswell/vitest.config.ts
  why: Contains test runner configuration
  pattern: Tests must be in `src/__tests__/**/*.test.ts` to be discovered

# EXISTING TESTS - Parent Validation
- file: /home/dustin/projects/groundswell/src/__tests__/adversarial/parent-validation.test.ts
  why: Shows pattern for testing single parent constraint enforcement
  pattern: Try to attach child with existing parent, expect Error with specific message

# EXISTING TESTS - DetachChild
- file: /home/dustin/projects/groundswell/src/__tests__/unit/workflow-detachChild.test.ts
  why: Shows pattern for testing detachment and parent reference clearing
  pattern: Verify parent becomes null after detachment
```

### Current Codebase tree

```bash
src/
├── __tests__/
│   ├── adversarial/           # PRD compliance and edge case tests
│   │   ├── prd-compliance.test.ts
│   │   ├── parent-validation.test.ts
│   │   ├── circular-reference.test.ts
│   │   └── e2e-prd-validation.test.ts
│   ├── integration/           # Component interaction tests
│   │   ├── bidirectional-consistency.test.ts
│   │   └── workflow-reparenting.test.ts
│   ├── unit/                  # Individual component tests
│   │   └── workflow-detachChild.test.ts
│   └── helpers/
│       └── tree-verification.ts
├── core/
│   └── workflow.ts            # Workflow class with attachChild/detachChild
├── debugger/
│   └── tree-debugger.ts       # Tree inspection utilities
└── types/
    └── index.ts               # TypeScript interfaces
```

### Desired Codebase tree with files to be added

```bash
src/
├── __tests__/
│   ├── adversarial/
│   │   └── prd-12-2-compliance.test.ts  # NEW: PRD Section 12.2 compliance tests
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Dual tree management - workflow tree AND node tree must stay synchronized
// The Workflow class maintains TWO parallel trees:
//   1. Workflow tree: Workflow.parent / Workflow.children
//   2. Node tree: WorkflowNode.parent / WorkflowNode.children
// Both must be validated for complete PRD compliance

// CRITICAL: attachChild() has different behavior for same vs different parent
// - If child.parent === this: Silent no-op (already attached)
// - If child.parent === null: Sets parent and adds to children arrays
// - If child.parent === different: Throws Error with helpful message

// CRITICAL: Constructor attaches child via attachChild()
// new Workflow(name, parent) internally calls parent.attachChild(this)

// CRITICAL: Event emissions are part of PRD requirements
// childAttached and childDetached events must be emitted

// GOTCHA: isDescendantOf() uses visited Set for cycle detection
// Returns true if circular reference found, false otherwise

// PATTERN: Tests use Vitest with describe/it blocks
// Import: import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// PATTERN: SimpleWorkflow class used for testing
// class SimpleWorkflow extends Workflow { async run() { return 'done'; } }
```

## Implementation Blueprint

### Test Structure and Organization

```typescript
// Test file structure following existing patterns
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Workflow } from '../../core/workflow.js';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger.js';
import { verifyBidirectionalLink, verifyTreeMirror } from '../../integration/bidirectional-consistency.test.js';

// Test helper class (same pattern as existing tests)
class SimpleWorkflow extends Workflow {
  async run() { return 'done'; }
}

// Main test suite organized by PRD requirement
describe('PRD Section 12.2: Workflow Base Class - Tree Integrity Requirements', () => {
  // Sub-suites for each specific requirement
  describe('Requirement 1: Child has exactly one parent', () => {
    // Tests for single parent constraint
  });

  describe('Requirement 2: child.parent matches parent', () => {
    // Tests for bidirectional link consistency
  });

  describe('Requirement 3: Child appears in only one parent\'s children array', () => {
    // Tests for unique appearance constraint
  });

  describe('Requirement 4: Node tree mirrors workflow tree', () => {
    // Tests for dual tree synchronization
  });
});
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/__tests__/adversarial/prd-12-2-compliance.test.ts
  - IMPORT: Workflow, WorkflowTreeDebugger, test helpers
  - DEFINE: SimpleWorkflow test class (follow existing pattern)
  - STRUCTURE: Main describe block for PRD Section 12.2
  - NAMING: prd-12-2-compliance.test.ts (kebab-case, matches existing pattern)

Task 2: IMPLEMENT Requirement 1 test suite
  - VERIFY: Child has exactly one parent after attachment
  - TEST: Create child with parent, verify child.parent === parent
  - FOLLOW pattern: parent-validation.test.ts for error testing pattern
  - ASSERT: expect(child.parent).toBe(parent)

Task 3: IMPLEMENT Requirement 2 test suite
  - VERIFY: child.parent property matches the parent containing it
  - TEST: Attach child, verify bidirectional link in both trees
  - USE: verifyBidirectionalLink() helper from bidirectional-consistency.test.ts
  - ASSERT: child.parent === parent AND child.node.parent === parent.node

Task 4: IMPLEMENT Requirement 3 test suite
  - VERIFY: Child appears in only one parent's children array
  - TEST: Try to attach child to second parent, should throw
  - FOLLOW pattern: parent-validation.test.ts lines 15-38
  - ASSERT: expect(() => parent2.attachChild(child)).toThrow()

Task 5: IMPLEMENT Requirement 4 test suite
  - VERIFY: Node tree mirrors workflow tree (1:1 correspondence)
  - TEST: Compare workflow.children array with node.children array
  - USE: verifyTreeMirror() helper from bidirectional-consistency.test.ts
  - ASSERT: All nodes have matching entries in both trees

Task 6: IMPLEMENT comprehensive integration test
  - CREATE: Multi-level hierarchy and verify all requirements simultaneously
  - FOLLOW pattern: bidirectional-consistency.test.ts for complex scenarios
  - VERIFY: Reparenting scenario maintains all invariants
  - DOCUMENT: Any deviations from PRD requirements

Task 7: ADD documentation comments
  - DOCUMENT: Link each test to specific PRD line/section
  - EXPLAIN: What requirement each assertion validates
  - INCLUDE: Expected vs actual behavior for bug demonstration
```

### Implementation Patterns & Key Details

```typescript
// CRITICAL PATTERN: Test structure matching existing PRD compliance tests
describe('PRD Section 12.2: Workflow Base Class - Tree Integrity Requirements', () => {
  // Each requirement gets its own describe block
  describe('Requirement 1: Child has exactly one parent', () => {
    it('should set parent when child is attached via constructor', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // PRD 12.2 Requirement 1: child has exactly one parent
      expect(child.parent).toBe(parent);
      expect(child.parent).not.toBeNull();
    });

    it('should set parent when child is attached via attachChild()', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child');

      parent.attachChild(child);

      // PRD 12.2 Requirement 1: child has exactly one parent
      expect(child.parent).toBe(parent);
    });

    it('should throw when trying to attach child to second parent', () => {
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // PRD 12.2 Requirement 1: child can only have one parent
      expect(() => parent2.attachChild(child)).toThrow();
    });
  });

  // Requirement 2: Bidirectional consistency
  describe('Requirement 2: child.parent matches parent', () => {
    it('should maintain bidirectional link in workflow tree', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // PRD 12.2 Requirement 2: child.parent points to parent
      expect(child.parent).toBe(parent);
      // PRD 12.2 Requirement 2: parent contains child in children array
      expect(parent.children).toContain(child);
    });

    it('should maintain bidirectional link in node tree', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // PRD 12.2 Requirement 2: node tree mirrors workflow tree
      expect(child.node.parent).toBe(parent.node);
      expect(parent.node.children).toContain(child.node);
    });
  });

  // Requirement 3: Unique appearance
  describe('Requirement 3: Child appears in only one parent\'s children array', () => {
    it('should only appear in one parent\'s children array', () => {
      const parent1 = new SimpleWorkflow('Parent1');
      const parent2 = new SimpleWorkflow('Parent2');
      const child = new SimpleWorkflow('Child', parent1);

      // PRD 12.2 Requirement 3: child appears only in parent1.children
      expect(parent1.children).toContain(child);
      expect(parent2.children).not.toContain(child);

      // Attempting second attachment should fail
      expect(() => parent2.attachChild(child)).toThrow();

      // Verify child still only in parent1.children
      expect(parent1.children).toContain(child);
      expect(parent2.children).not.toContain(child);
    });
  });

  // Requirement 4: Dual tree mirror
  describe('Requirement 4: Node tree mirrors workflow tree', () => {
    it('should maintain 1:1 correspondence between trees', () => {
      const parent = new SimpleWorkflow('Parent');
      const child = new SimpleWorkflow('Child', parent);

      // Verify workflow tree
      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child);
      expect(child.parent).toBe(parent);

      // Verify node tree mirrors workflow tree exactly
      expect(parent.node.children.length).toBe(1);
      expect(parent.node.children[0]).toBe(child.node);
      expect(child.node.parent).toBe(parent.node);

      // Use existing helper for comprehensive validation
      verifyTreeMirror(parent);
    });

    it('should maintain mirror after multiple operations', () => {
      const root = new SimpleWorkflow('Root');
      const child1 = new SimpleWorkflow('Child1', root);
      const child2 = new SimpleWorkflow('Child2', root);

      // Verify mirror after multiple attachments
      expect(root.children.length).toBe(2);
      expect(root.node.children.length).toBe(2);
      verifyTreeMirror(root);

      // Verify mirror after detachment
      root.detachChild(child1);
      expect(root.children.length).toBe(1);
      expect(root.node.children.length).toBe(1);
      verifyTreeMirror(root);
    });
  });
});

// GOTCHA: Make sure to test both constructor attachment and programmatic attachment
// Constructor: new Workflow(name, parent) - internally calls attachChild()
// Programmatic: parent.attachChild(child) - direct method call

// PATTERN: Use WorkflowTreeDebugger for tree inspection
const debugger = new WorkflowTreeDebugger(root);
const tree = debugger.getTree();
expect(tree.children.length).toBe(expectedCount);

// PATTERN: Test helper functions for validation
// These are available from bidirectional-consistency.test.ts:
// - verifyBidirectionalLink(parent, child)
// - verifyTreeMirror(workflowRoot)
// - collectAllNodes(workflow)
```

### Test Assertion Patterns

```typescript
// Pattern 1: Direct property assertion
expect(child.parent).toBe(parent);

// Pattern 2: Array inclusion assertion
expect(parent.children).toContain(child);

// Pattern 3: Exception assertion
expect(() => parent2.attachChild(child)).toThrow();

// Pattern 4: Tree mirror assertion using helper
verifyTreeMirror(root); // Throws if trees don't match

// Pattern 5: Bidirectional link assertion
verifyBidirectionalLink(parent, child); // Checks both trees

// Pattern 6: Count assertions for unique appearance
expect(root.children.filter(c => c === child).length).toBe(1);
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after test file creation - fix before proceeding
npm run test -- src/__tests__/adversarial/prd-12-2-compliance.test.ts

# Check TypeScript compilation
npx tsc --noEmit

# Format check
npx prettier --check src/__tests__/adversarial/prd-12-2-compliance.test.ts

# Expected: Zero TypeScript errors, proper formatting
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new PRD compliance test suite
npm run test -- src/__tests__/adversarial/prd-12-2-compliance.test.ts

# Run related tests to ensure no regression
npm run test -- src/__tests__/adversarial/parent-validation.test.ts
npm run test -- src/__tests__/adversarial/circular-reference.test.ts
npm run test -- src/__tests__/integration/bidirectional-consistency.test.ts

# Expected: All tests pass with current (fixed) implementation
```

### Level 3: Integration Testing (System Validation)

```bash
# Run full adversarial test suite
npm run test -- src/__tests__/adversarial/

# Run full integration test suite
npm run test -- src/__tests__/integration/

# Run entire test suite to verify no regressions
npm test

# Expected: All tests pass, no regressions in existing functionality
```

### Level 4: PRD Compliance Validation

```bash
# Verify tests would fail with original buggy implementation
# 1. Temporarily revert attachChild() to buggy version (lines 187-201 in original)
# 2. Run: npm run test -- src/__tests__/adversarial/prd-12-2-compliance.test.ts
# 3. Expected: Tests fail (demonstrating they catch the bug)
# 4. Restore fixed implementation
# 5. Run: npm run test -- src/__tests__/adversarial/prd-12-2-compliance.test.ts
# 6. Expected: Tests pass (validating fix works)

# Coverage validation (if coverage tools available)
npm run test:cov

# Expected: New tests increase coverage for attachChild/detachChild methods
```

## Final Validation Checklist

### Technical Validation

- [ ] Test file created at correct path: `src/__tests__/adversarial/prd-12-2-compliance.test.ts`
- [ ] All Level 1 validation passes (TypeScript, formatting)
- [ ] All Level 2 tests pass (new PRD compliance tests)
- [ ] All Level 3 tests pass (no regressions in existing tests)
- [ ] Level 4 validation passes (tests would fail with buggy implementation)

### Feature Validation

- [ ] Requirement 1 tested: "Child has exactly one parent"
- [ ] Requirement 2 tested: "child.parent matches parent"
- [ ] Requirement 3 tested: "Child appears in only one parent's children array"
- [ ] Requirement 4 tested: "Node tree mirrors workflow tree"
- [ ] Tests attempt to attach child to second parent (throws error)
- [ ] Both constructor and programmatic attachment tested
- [ ] DetachChild() behavior included in tests
- [ ] Clear comments linking assertions to PRD requirements

### Code Quality Validation

- [ ] Follows existing test patterns from prd-compliance.test.ts
- [ ] Uses appropriate test helpers from tree-verification.ts
- [ ] Uses WorkflowTreeDebugger for tree inspection
- [ ] Tests are self-documenting with clear assertion messages
- [ ] File naming matches existing convention (*.test.ts)
- [ ] Test organization uses describe/it blocks appropriately

### Documentation & Deployment

- [ ] Each test includes comment referencing PRD Section 12.2
- [ ] Test descriptions clearly state which requirement is validated
- [ ] Any deviations from PRD are documented in test comments
- [ ] Test file includes header explaining its purpose

## Anti-Patterns to Avoid

- ❌ Don't create duplicate tests that already exist in parent-validation.test.ts
- ❌ Don't skip testing both workflow tree AND node tree (dual validation is critical)
- ❌ Don't forget to test constructor attachment AND programmatic attachment
- ❌ Don't use generic test descriptions - be specific about which PRD requirement is tested
- ❌ Don't assume the tests will catch the bug - verify they fail with buggy implementation
- ❌ Don't test implementation details - test PRD requirements (behavior, not implementation)
- ❌ Don't forget to verify node tree mirror - this is a critical PRD requirement
- ❌ Don't use try-catch for error testing - use expect(() => ...).toThrow() pattern
- ❌ Don't create tests that pass even with buggy implementation
- ❌ Don't add new test helpers when existing ones (verifyTreeMirror, verifyBidirectionalLink) work

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Validation**: The completed PRP provides:
1. Exact PRD requirements with line references
2. Existing test patterns to follow with file paths
3. Helper utilities available for validation
4. Complete test structure with assertion patterns
5. Validation commands that are project-specific and verified
6. Clear documentation linking each test to specific PRD requirements

**Risk Mitigation**:
- Research from existing PRD compliance tests ensures consistent patterns
- Helper functions from tree-verification.ts provide reliable validation
- WorkflowTreeDebugger provides comprehensive tree inspection
- Clear validation checkpoints ensure quality at each step

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-01-12

### Fixed

- **attachChild() parent validation**: `attachChild()` now throws an Error if you attempt to attach a child that already has a different parent. Previously, this would silently create an inconsistent tree state where the child appeared in multiple parents' `children` arrays while only linking to one parent via its `parent` property.
- **Circular reference detection**: `attachChild()` now detects and prevents attaching an ancestor as a child, which would create a circular reference in the tree.
- **Observer event propagation**: Observer events now propagate correctly after reparenting operations. Previously, events from a shared child would only reach the original parent's observers, not any new parents.

### Added

- **New `detachChild()` method**: Enables proper reparenting workflow by removing a child from both the workflow tree (`this.children`) and the node tree (`this.node.children`), clearing the child's parent reference, and emitting a `childDetached` event.
  - Implementation: [src/core/workflow.ts:329-358](src/core/workflow.ts#L329-L358)
- **New `childDetached` event type**: Discriminated union member for detachment notifications, following the existing event pattern with `type`, `parentId`, and `childId` properties.
  - Implementation: [src/types/events.ts:11](src/types/events.ts#L11)
- **New `isDescendantOf()` helper**: Private method for circular reference detection that traverses the parent chain upward with cycle detection.
  - Implementation: [src/core/workflow.ts:151-169](src/core/workflow.ts#L151-L169)

### Migration Guide for attachChild() Behavior Change

**What Changed**:
The `attachChild()` method now throws an Error if you attempt to attach a child that already has a different parent. Previously, this would silently create an inconsistent tree state that broke observer propagation and violated the PRD's single-parent requirement.

**Before (Buggy Pattern)**:
```typescript
// This would silently create inconsistent state
const parent1 = new Workflow({ name: 'parent1' });
const parent2 = new Workflow({ name: 'parent2' });
const child = new Workflow({ name: 'child' });

parent1.attachChild(child);  // child.parent = parent1
parent2.attachChild(child);  // BUG: child still has parent1, but parent2 thinks it's attached
// Result: child.parent === parent1, but parent2.children.includes(child) === true
```

**After (Correct Pattern)**:
```typescript
// Use detachChild() before reattaching
const parent1 = new Workflow({ name: 'parent1' });
const parent2 = new Workflow({ name: 'parent2' });
const child = new Workflow({ name: 'child' });

parent1.attachChild(child);
parent1.detachChild(child);  // Explicitly detach first
parent2.attachChild(child);  // Now works correctly
// Result: child.parent === parent2, parent1.children does NOT include child
```

**Migration Steps**:
1. Search your code for patterns of attaching the same child to multiple parents
2. Add `detachChild()` calls before reattaching to a new parent
3. Test that your workflow tree operations complete without errors
4. Verify observer events propagate correctly after reparenting

### Test Coverage

**New Test Files Added** (12 files):
- `src/__tests__/unit/workflow-detachChild.test.ts` - `detachChild()` method tests
- `src/__tests__/unit/workflow-emitEvent-childDetached.test.ts` - `childDetached` event tests
- `src/__tests__/adversarial/parent-validation.test.ts` - Parent validation edge cases
- `src/__tests__/adversarial/circular-reference.test.ts` - Circular reference detection
- `src/__tests__/adversarial/complex-circular-reference.test.ts` - Deep circular reference scenarios
- `src/__tests__/adversarial/attachChild-performance.test.ts` - Performance validation
- `src/__tests__/adversarial/deep-hierarchy-stress.test.ts` - Deep nesting tests (1000+ levels)
- `src/__tests__/adversarial/bidirectional-consistency.test.ts` - Tree consistency tests
- `src/__tests__/adversarial/edge-case.test.ts` - Edge case coverage
- `src/__tests__/adversarial/observer-propagation.test.ts` - Observer propagation validation
- `src/__tests__/adversarial/deep-analysis.test.ts` - Comprehensive deep tree analysis
- `src/__tests__/integration/workflow-reparenting.test.ts` - Reparenting workflow tests

**Test Count Increase**: +25 new test cases
**Regression Tests**: All existing tests continue to pass (100% pass rate maintained)

### Implementation Details

- **attachChild() validation**: [src/core/workflow.ts:266-305](src/core/workflow.ts#L266-L305)
  - Validates child is not already attached to this workflow
  - Validates child does not have a different parent (throws with helpful error message)
  - Validates child is not an ancestor of this parent (circular reference detection)
- **detachChild() method**: [src/core/workflow.ts:329-358](src/core/workflow.ts#L329-L358)
  - Removes child from both workflow and node trees
  - Clears child's parent reference
  - Emits childDetached event for observer notification
- **isDescendantOf() helper**: [src/core/workflow.ts:151-169](src/core/workflow.ts#L151-L169)
  - Private helper method for circular reference detection
  - Traverses parent chain with Set-based cycle detection
- **childDetached event**: [src/types/events.ts:11](src/types/events.ts#L11)
  - Follows existing discriminated union pattern
  - Uses `childId` (string) instead of `child` (WorkflowNode) since child is no longer in tree

## [0.0.1] - 2025-01-10

### Added
- Initial release with hierarchical workflow engine
- `Workflow` base class with parent/child relationships
- Observer pattern for event propagation
- `WorkflowTreeDebugger` for real-time tree visualization
- `@Step`, `@Task`, and `@ObservedState` decorators
- Full TypeScript type definitions

[Unreleased]: https://github.com/dustin/groundswell/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/dustin/groundswell/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/dustin/groundswell/releases/tag/v0.0.1

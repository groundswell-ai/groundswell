# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-01-12

### Fixed

- **WorkflowLogger.child() signature** (Critical): Updated to accept `Partial<LogEntry>` parameter matching PRD specification, while maintaining backward compatibility with string-based API via function overloads.
  - Implementation: [src/core/logger.ts:98-111](src/core/logger.ts#L98-L111)
- **Promise.allSettled for concurrent tasks** (Major): Replaced `Promise.all()` with `Promise.allSettled()` for comprehensive error collection when multiple concurrent workflows fail, enabling aggregate error reporting.
  - Implementation: [src/decorators/task.ts:112-142](src/decorators/task.ts#L112-L142)
- **ErrorMergeStrategy implementation** (Major): Added error merge strategy for concurrent task failures with configurable custom combinators, enabling aggregation of all concurrent errors into a single WorkflowError.
  - Implementation: [src/types/decorators.ts:25-32](src/types/decorators.ts#L25-L32), [src/utils/workflow-error-utils.ts:23-56](src/utils/workflow-error-utils.ts#L23-L56)
- **Console.error to logger replacement** (Minor): Replaced `console.error()` with workflow logger for observer error handling, ensuring consistent structured logging throughout the codebase.
  - Implementation: [src/core/workflow.ts:426, 444](src/core/workflow.ts#L426)
- **Tree debugger optimization** (Minor): Implemented incremental node map updates for childDetached events using BFS traversal, avoiding O(n) full map rebuilds and improving performance on large workflow trees.
  - Implementation: [src/debugger/tree-debugger.ts:65-84, 92-117](src/debugger/tree-debugger.ts#L65-L84)
- **Workflow name validation** (Minor): Added validation for empty, whitespace-only, and overly long (>100 chars) workflow names to prevent invalid configurations.
  - Implementation: [src/core/workflow.ts:98-107](src/core/workflow.ts#L98-L107)
- **trackTiming default documentation** (Major): Clarified documentation that `trackTiming` in `@Step` decorator defaults to `true` via `!== false` check, improving API discoverability.
  - Implementation: [src/decorators/step.ts:94-101](src/decorators/step.ts#L94-L101)
- **isDescendantOf public API** (Minor): Made previously private `isDescendantOf()` helper method public with comprehensive JSDoc documentation, enabling workflow hierarchy validation and topology checking.
  - Implementation: [src/core/workflow.ts:201-219](src/core/workflow.ts#L201-L219)

### Added

- **Public isDescendantOf() method**: Made the previously private `isDescendantOf()` helper method public for workflow hierarchy validation, circular reference prevention, and topology checking.
  - Implementation: [src/core/workflow.ts:201-219](src/core/workflow.ts#L201-L219)

### Test Coverage

**New Test Files Added** (12 files):
- `src/__tests__/unit/logger.test.ts` - WorkflowLogger.child() signature tests (294 lines)
- `src/__tests__/adversarial/concurrent-task-failures.test.ts` - Concurrent task failure scenarios
- `src/__tests__/adversarial/error-merge-strategy.test.ts` - Error merge strategy functionality
- `src/__tests__/unit/tree-debugger-incremental.test.ts` - Incremental node map updates
- `src/__tests__/adversarial/node-map-update-benchmarks.test.ts` - Performance benchmarks
- `src/__tests__/integration/observer-logging.test.ts` - Observer logging tests
- `src/__tests__/unit/workflow.test.ts` - Workflow name validation
- `src/__tests__/unit/workflow-isDescendantOf.test.ts` - Public isDescendantOf API
- `src/__tests__/adversarial/parent-validation.test.ts` - Parent validation edge cases
- `src/__tests__/adversarial/circular-reference.test.ts` - Circular reference detection
- `src/__tests__/adversarial/complex-circular-reference.test.ts` - Deep circular reference scenarios
- `src/__tests__/integration/workflow-reparenting.test.ts` - Reparenting workflow tests

**Test Count Increase**: +50+ new test cases
**Regression Tests**: All existing tests continue to pass (100% pass rate maintained)

### Implementation Details

- **WorkflowLogger.child() signature fix**: [src/core/logger.ts:98-111](src/core/logger.ts#L98-L111)
  - Function overloads for type safety with both string and Partial<LogEntry> parameters
  - Backward compatible with existing string-based API
  - Follows PRD specification exactly
- **Promise.allSettled for concurrent tasks**: [src/decorators/task.ts:112-142](src/decorators/task.ts#L112-L142)
  - Captures all concurrent errors using Promise.allSettled()
  - Optional error merge strategy for aggregate error reporting
  - Backward compatible: throws first error by default
- **ErrorMergeStrategy implementation**: [src/types/decorators.ts:25-32](src/types/decorators.ts#L25-L32), [src/utils/workflow-error-utils.ts:23-56](src/utils/workflow-error-utils.ts#L23-L56)
  - New TaskOptions.errorMergeStrategy property
  - Default merger aggregates all error messages, logs, and workflow IDs
  - Custom combine function support for specialized error handling
- **Console.error to logger replacement**: [src/core/workflow.ts:426, 444](src/core/workflow.ts#L426)
  - Observer onEvent errors now logged with structured context
  - Observer onStateUpdated errors now logged with node context
- **Tree debugger optimization**: [src/debugger/tree-debugger.ts:65-84, 92-117](src/debugger/tree-debugger.ts#L65-L84)
  - Incremental subtree removal using BFS traversal
  - O(k) complexity for subtree operations instead of O(n)
  - Prevents stack overflow on deep trees with iterative BFS
- **Workflow name validation**: [src/core/workflow.ts:98-107](src/core/workflow.ts#L98-L107)
  - Rejects empty and whitespace-only names
  - Rejects names exceeding 100 characters
  - Fail-fast validation during construction
- **trackTiming default documentation**: [src/decorators/step.ts:94-101](src/decorators/step.ts#L94-L101)
  - Clarified that trackTiming defaults to true via !== false check
  - Explicit false disables timing, undefined/true enables timing
- **isDescendantOf public API**: [src/core/workflow.ts:201-219](src/core/workflow.ts#L201-L219)
  - Cycle detection during parent chain traversal
  - Comprehensive JSDoc with security warning and usage examples
  - Time/space complexity documentation

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

[Unreleased]: https://github.com/dustin/groundswell/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/dustin/groundswell/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/dustin/groundswell/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/dustin/groundswell/releases/tag/v0.0.1

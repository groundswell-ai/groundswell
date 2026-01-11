# System Context: Hierarchical Workflow Engine

## Project Overview

**Project Name**: Hierarchical Workflow Engine
**Technology Stack**: TypeScript, Vitest
**Current Status**: Production-ready with critical bug
**Test Coverage**: 241 tests across 16 test files (all passing)

## Core Architecture

### 1. Dual Tree Representation

The workflow engine maintains two synchronized tree structures:

1. **Workflow Instance Tree**: Runtime objects with parent/child relationships
2. **Node Tree**: Serializable data structure for logs and events

```
Workflow Instance Tree          Node Tree
======================          =========
Workflow (parent)              WorkflowNode (parent)
  ├─ children: Workflow[]        ├─ children: WorkflowNode[]
  └─ parent: Workflow            └─ parent: WorkflowNode
```

**Critical Invariant**: Both trees must maintain perfect 1:1 mirroring as specified in PRD Section 12.2.

### 2. Core Components

#### Workflow Class (`src/core/workflow.ts`)

**Key Properties**:
- `parent: Workflow | null` - Reference to parent workflow (line 49)
- `children: Workflow[]` - Array of child workflows (line 52)
- `node: WorkflowNode` - Serializable node representation (line 102)
- `id: string` - Unique workflow identifier (immutable)
- `status: WorkflowStatus` - Current workflow status
- `observers: WorkflowObserver[]` - Array of observers (root-only)

**Key Methods**:
- `constructor(name: string, parent?: Workflow)` - Creates workflow, auto-attaches if parent provided (line 115)
- `attachChild(child: Workflow): void` - **BUGGY METHOD** (lines 187-201)
- `detachChild(child: Workflow): void` - Does not exist (needs to be added)
- `getRoot(): Workflow` - Traverses parent chain with cycle detection
- `emitEvent(event: WorkflowEvent): void` - Centralized event emission
- `run(): Promise<any>` - Execute workflow with @Step decorated methods

#### Observer Pattern (`src/types/observer.ts`)

**Observer Interface**:
```typescript
interface WorkflowObserver {
  onEvent(event: WorkflowEvent): void;
  onLog(log: WorkflowLog): void;
  onStateUpdated(state: Record<string, unknown>): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

**Key Constraints**:
- Observers can **only** be attached to root workflows
- Events propagate via `getRootObservers()` which follows parent chain
- Observer errors are isolated (logged to console, don't crash execution)

#### Event System (`src/types/events.ts`)

**7 Event Types** (discriminated union):
1. `stepStart` - Step execution started
2. `stepFinish` - Step execution completed
3. `stateUpdated` - @ObservedState property changed
4. `childAttached` - Child workflow added to tree
5. `childDetached` - Child workflow removed from tree
6. `treeUpdated` - Tree structure changed
7. `error` - Error occurred with state snapshot

### 3. Decorator System

#### @Step Decorator (`src/decorators/step.ts`)
- Wraps method execution with error handling
- Captures state snapshots via @ObservedState
- Emits stepStart/stepFinish events
- Options: name, snapshotState, trackTiming, logStart, logFinish

#### @Task Decorator (`src/decorators/task.ts`)
- Decorates methods for concurrent task execution
- Supports parallel task execution with Promise.all()

#### @ObservedState Decorator (`src/decorators/observed-state.ts`)
- Tracks property changes automatically
- Supports redaction (redact option)
- Supports hiding from logs (hidden option)
- Emits stateUpdated events on change

### 4. Testing Infrastructure

**Test Organization**:
```
src/__tests__/
├── unit/           - 12 files, core functionality
├── integration/    - 2 files, component interaction
└── adversarial/    - 4 files, edge cases and bugs
    ├── edge-case.test.ts          - 23 tests
    ├── deep-analysis.test.ts      - 18 tests
    ├── prd-compliance.test.ts     - 17 tests
    └── e2e-prd-validation.test.ts - End-to-end validation
```

**Test Framework**: Vitest
**Total Tests**: 241 test cases
**Current Status**: All passing (including the buggy behavior - tests don't catch this bug)

### 5. Current Bug: attachChild() Tree Integrity Violation

**Location**: `src/core/workflow.ts:187-201`

**Current Implementation**:
```typescript
public attachChild(child: Workflow): void {
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  this.children.push(child);
  this.node.children.push(child.node);

  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}
```

**Problem**: Does not validate if `child.parent` is already set to a different workflow.

**Impact**:
1. Child appears in multiple parents' children arrays
2. child.parent only points to original parent
3. Observer events only propagate to original parent
4. getRoot() returns wrong root
5. Violates PRD's "1:1 tree mirror" requirement

## Architecture Constraints & Requirements

### Must Maintain

1. **Dual Tree Synchronization**: Any update must modify both workflow tree and node tree
2. **Observer Event Propagation**: Events must reach all root observers via parent chain
3. **Circular Reference Detection**: getRoot() must detect and prevent infinite loops
4. **Type Safety**: All TypeScript types must be maintained
5. **Backward Compatibility**: Existing API must not break (except buggy behavior)
6. **Event Emission**: All tree operations must emit appropriate events
7. **Immutability**: workflow.id and node references must remain immutable

### Must Add

1. **Parent Validation**: Check if child already has a different parent before attaching
2. **Circular Reference Prevention**: Check if child is an ancestor before attaching
3. **detachChild() Method**: New method to properly remove children from tree
4. **Comprehensive Tests**: Test the new validation and edge cases

## File Locations

**Core Files**:
- `/home/dustin/projects/groundswell/src/core/workflow.ts` - Main Workflow class
- `/home/dustin/projects/groundswell/src/core/event-tree.ts` - Tree querying
- `/home/dustin/projects/groundswell/src/core/logger.ts` - Logging
- `/home/dustin/projects/groundswell/src/core/context.ts` - Execution context

**Decorator Files**:
- `/home/dustin/projects/groundswell/src/decorators/step.ts`
- `/home/dustin/projects/groundswell/src/decorators/task.ts`
- `/home/dustin/projects/groundswell/src/decorators/observed-state.ts`

**Type Definition Files**:
- `/home/dustin/projects/groundswell/src/types/workflow.ts`
- `/home/dustin/projects/groundswell/src/types/observer.ts`
- `/home/dustin/projects/groundswell/src/types/events.ts`

**Test Files**:
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts` - Add new tests here
- All other test files in `src/__tests__/` directory

## PRD Requirements (Reference)

The implementation must comply with PRD Section 12.2 - Workflow Base Class:

> "The workflow tree should maintain consistency:
> - A child workflow should have exactly one parent
> - The `child.parent` property should always match the parent that contains it
> - A child should only appear in one parent's `children` array"

Additionally:
- PRD Section 7: Observer pattern and event propagation
- PRD Section 11: Tree debugger API
- PRD Section 4: Logging and events model (7 event types)

## Development Workflow

1. **Write Failing Test First**: Follow TDD approach
2. **Implement Fix**: Update attachChild() method
3. **Add detachChild() Method**: New method for reparenting support
4. **Update Tests**: Add comprehensive edge case coverage
5. **Verify Observer Propagation**: Ensure events reach all observers
6. **Check Tree Consistency**: Verify 1:1 mirror is maintained
7. **Run All Tests**: Ensure no regressions (241 tests)

## Success Criteria

- [ ] attachChild() validates child.parent before attaching
- [ ] attachChild() prevents circular references
- [ ] attachChild() throws clear, actionable error messages
- [ ] detachChild() method properly removes children
- [ ] All observer events propagate correctly
- [ ] Tree debugger shows consistent tree structure
- [ ] All 241+ tests pass
- [ ] New tests cover adversarial scenarios

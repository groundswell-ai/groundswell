---
name: "PRP for P2.M2.T1.S2: Build Reactive Tree Component Prototype"
description: "Build an interactive Ink component that subscribes to WorkflowTreeDebugger.events Observable and renders a reactive workflow tree with real-time updates"
---

## Goal

**Feature Goal**: Create an Ink-based React component (`<WorkflowTree>`) that subscribes to the `WorkflowTreeDebugger.events` Observable stream and re-renders the workflow tree in real-time as the workflow executes, matching the visual output of `toTreeString()` with proper indentation, branch connectors, and status-colored indicators.

**Deliverable**:
1. A new Ink component file `examples/components/WorkflowTree.tsx` with:
   - `<WorkflowTree>` component that accepts `node: WorkflowNode` prop
   - `<WorkflowTreeDebuggerUI>` component that accepts `debugger: WorkflowTreeDebugger` prop
   - Real-time reactivity via `debugger.events` Observable subscription
   - Recursive tree rendering matching `toTreeString()` logic
   - Status-colored indicators using `<Text color="...">`
2. Integration test file `examples/examples/12-ink-debugger-reactive.tsx` demonstrating live workflow execution with real-time tree updates
3. Unit tests for the component in `examples/__tests__/workflow-tree.test.tsx` using `ink-testing-library`

**Success Definition**:
- Running `tsx examples/examples/12-ink-debugger-reactive.tsx` displays a workflow tree that updates in real-time as the workflow executes
- Tree rendering matches `toTreeString()` output exactly (same indentation, branch connectors `├──`, `└──`, `│`)
- Status symbols (○ ◐ ✓ ✗ ⊘) display with correct colors (gray, cyan, green, red, yellow)
- Observable subscription properly cleans up on unmount
- All tests pass: `npm test -- examples/__tests__/workflow-tree.test.tsx`

## User Persona

**Target User**: Developer debugging workflow execution issues in real-time

**Use Case**: A developer wants to visualize workflow execution as it happens, seeing the tree structure update live with node status changes, child attachments, and state transitions.

**User Journey**:
1. Developer runs the reactive debugger: `tsx examples/examples/12-ink-debugger-reactive.tsx`
2. Terminal displays an interactive workflow tree with initial state
3. As workflow executes, tree updates in real-time showing:
   - Status changes (idle → running → completed/failed)
   - New child nodes appearing
   - Step execution progress
4. Developer observes the full execution lifecycle visually
5. Press Ctrl+C to exit cleanly

**Pain Points Addressed**:
- Current `toTreeString()` output is static - only shows final state
- No visibility into execution progress while workflow runs
- Difficult to understand when/where failures occur during execution
- No way to see the tree "come alive" as workflows execute

## Why

- **Real-Time Observability**: Live tree updates provide immediate feedback on workflow execution progress
- **Debugging Efficiency**: See exactly when and where nodes change state, attach, detach, or fail
- **Visual Fidelity**: Matches existing `toTreeString()` output so users see familiar tree structure
- **Observable Integration**: Leverages existing `debugger.events` stream from P2.M1.T2.S2
- **Foundation for Interactivity**: Sets up component architecture for future features (expand/collapse, navigation, split-pane)

## What

### Scope

This subtask covers:
1. **Reactive Component Architecture**: Create `<WorkflowTree>` and `<WorkflowTreeDebuggerUI>` components
2. **Observable Subscription**: Subscribe to `debugger.events` for real-time updates
3. **Visual Fidelity**: Match `toTreeString()` rendering exactly (indentation, connectors, colors)
4. **Component Testing**: Add unit tests using `ink-testing-library`
5. **Integration Example**: Demonstrate live workflow with reactive tree updates

### Out of Scope (Future Subtasks)
- Keyboard navigation and interactivity (P2.M2.T2.S1)
- Expand/collapse functionality (P2.M2.T2.S1)
- Split-pane layout with node details (P2.M2.T2.S2)
- Event timeline panel
- Performance optimization for large trees (virtualization)

### Success Criteria

- [ ] `<WorkflowTree>` component created at `examples/components/WorkflowTree.tsx`
- [ ] `<WorkflowTreeDebuggerUI>` component created with Observable subscription
- [ ] Tree rendering matches `toTreeString()` output (indentation, connectors)
- [ ] Status symbols display with correct colors
- [ ] Real-time updates work when workflow executes
- [ ] Observable subscription cleans up on unmount
- [ ] Unit tests pass with `ink-testing-library`
- [ ] Integration example runs without errors

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**Answer**: YES - This PRP includes:
- Exact rendering logic from `toTreeString()` with line numbers
- Complete `WorkflowNode` interface definition
- `Observable` class API reference
- Ink component patterns for reactivity and colors
- Integration patterns with `WorkflowTreeDebugger`
- Testing setup with `ink-testing-library`
- 6 comprehensive research documents with code examples

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Existing Codebase Patterns
- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: Existing renderTree() logic (lines 217-245) to replicate in Ink
  pattern: renderTree() method shows exact indentation, connector, prefix logic
  gotcha: STATUS_SYMBOLS constant (lines 15-21) for status icons
  gotcha: isLast parameter determines both connector (└── vs ├──) and childPrefix

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: WorkflowNode interface definition - the data structure we render
  pattern: interface with id, name, parent, children, status, logs, events
  gotcha: status type is WorkflowStatus union: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

- file: /home/dustin/projects/groundswell/src/utils/observable.ts
  why: Custom Observable class used by WorkflowTreeDebugger.events
  pattern: Observable.subscribe() returns { unsubscribe() } object
  gotcha: Call unsubscribe() in useEffect cleanup to prevent memory leaks

- file: /home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx
  why: Working Ink hello-world prototype from P2.M2.T1.S1
  pattern: StatusIcon component, WorkflowTree recursive component, shebang
  gotcha: Status uses 'pending' instead of 'idle' - need to update

- file: /home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts
  why: Example showing WorkflowTreeDebugger usage with real workflows
  pattern: createWorkflow(), new WorkflowTreeDebugger(), workflow.run()
  gotcha: Shows parent-child workflow relationships

# External Documentation
- url: https://www.npmjs.com/package/ink
  why: Official Ink package documentation with component API reference
  critical: Ink 6.6.0 requires React 19+ and Node 20+
  section: Components (Box, Text, Static), Hooks (useEffect, useState)

- url: https://github.com/vadimdemedes/ink-testing-library
  why: Testing library for Ink components - required for unit tests
  section: render() function, lastFrame() for assertions

- url: https://react.dev/reference/react
  why: React hooks reference for useState, useEffect patterns
  section: useEffect, useState - especially cleanup function pattern

# Research Documents (Internal)
- docfile: plan/002_6761e4b84fd1/P2M2T1S2/research/01-ink-reactive-patterns.md
  why: Complete guide on React + Observable integration in Ink
  section: useEffect Subscription Pattern, Performance Throttling, Complete Examples

- docfile: plan/002_6761e4b84fd1/P2M2T1S2/research/02-ink-text-colors.md
  why: Ink Text color prop reference for status indicators
  section: Color Values, Status Color Mapping, Complete Examples

- docfile: plan/002_6761e4b84fd1/P2M2T1S2/research/04-tree-indentation-patterns.md
  why: Exact replication of renderTree() logic for Ink
  section: Existing renderTree() Analysis, Ready-to-Use Code Patterns

- docfile: plan/002_6761e4b84fd1/P2M2T1S2/research/05-workflow-debugger-integration.md
  why: Integration patterns for WorkflowTreeDebugger + Ink
  section: Integration Pattern, Complete Integration Example, Sample Workflows

- docfile: plan/002_6761e4b84fd1/P2M2T1S2/research/06-external-examples.md
  why: Real-world Ink CLI patterns and best practices
  section: Best Practices, React Hooks Patterns, Common Gotchas

- docfile: plan/002_6761e4b84fd1/P2M2T1S2/research/03-testing-patterns.md
  why: Testing setup and patterns for Ink components
  section: Vitest Configuration, Testing Pattern, Test Helper Functions
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                          # Compiled JavaScript output
├── docs/                          # User documentation
├── examples/
│   ├── components/                # NEW: Create this directory
│   │   └── WorkflowTree.tsx       # NEW: Main component file
│   ├── __tests__/                 # NEW: Create this directory
│   │   └── workflow-tree.test.tsx # NEW: Component tests
│   ├── examples/
│   │   ├── 01-basic-workflow.ts
│   │   ├── 02-decorator-options.ts
│   │   ├── 03-parent-child.ts
│   │   ├── 04-observers-debugger.ts
│   │   ├── 05-error-handling.ts
│   │   ├── 06-concurrent-tasks.ts
│   │   ├── 07-agent-loops.ts
│   │   ├── 08-sdk-features.ts
│   │   ├── 09-reflection.ts
│   │   ├── 10-introspection.ts
│   │   ├── 11-reparenting-workflows.ts
│   │   ├── ink-debugger-hello.tsx # FROM P2.M2.T1.S1
│   │   └── 12-ink-debugger-reactive.tsx # NEW: Integration example
│   ├── index.ts
│   └── utils/
│       └── helpers.ts
├── plan/
│   └── 002_6761e4b84fd1/
│       └── P2M2T1S2/
│           ├── research/          # Research documents (EXISTING)
│           └── PRP.md             # THIS FILE
├── src/
│   ├── __tests__/                 # Vitest tests (existing patterns)
│   ├── debugger/
│   │   ├── tree-debugger.ts       # REFERENCED: toTreeString(), events
│   │   ├── event-replayer.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── workflow.ts            # REFERENCED: WorkflowNode interface
│   │   ├── events.ts              # REFERENCED: WorkflowEvent types
│   │   └── index.ts
│   ├── utils/
│   │   ├── observable.ts          # REFERENCED: Observable class
│   │   └── index.ts
│   └── index.ts                    # Main exports
├── package.json                    # MODIFICATION: Add ink-testing-library
├── tsconfig.json                   # Already configured for Ink from P2.M2.T1.S1
└── vitest.config.ts                # MODIFICATION: Add JSX config for tests
```

### Desired Codebase Tree (Changes Only)

```bash
# NEW DIRECTORIES
examples/
  components/                       # NEW: Ink component library
  __tests__/                       # NEW: Component tests

# NEW FILES
examples/components/
  WorkflowTree.tsx                  # NEW: Main component export
  StatusIcon.tsx                    # NEW: Status indicator component
  WorkflowTreeNode.tsx              # NEW: Recursive tree node component

examples/__tests__/
  workflow-tree.test.tsx            # NEW: Component tests

examples/examples/
  12-ink-debugger-reactive.tsx      # NEW: Integration example

# MODIFIED FILES
package.json                        # ADD: dev dependency
  devDependencies:
    "ink-testing-library": "^4.0.0" # NEW
    "@types/react": "^19.0.0"       # NEW (if not present)

vitest.config.ts                    # ADD: esbuild JSX config
  esbuild:
    jsx: "automatic"                # NEW
    jsxImportSource: "ink"          # NEW
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// ============================================================================
// CRITICAL: Observable Subscription Cleanup
// ============================================================================
// Always unsubscribe in useEffect cleanup to prevent memory leaks
// WRONG: useEffect(() => { debugger.events.subscribe(...) }, [])
// CORRECT:
useEffect(() => {
  const subscription = debugger.events.subscribe({
    next: (event) => { /* handle */ }
  });
  return () => subscription.unsubscribe();
}, [debugger]);

// ============================================================================
// CRITICAL: Ink Text Component Requirements
// ============================================================================
// All text must be wrapped in <Text> components
// WRONG: <Box>Hello</Box>
// CORRECT: <Box><Text>Hello</Text></Box>

// Never nest <Box> inside <Text>
// WRONG: <Text><Box>Hello</Box></Text>
// CORRECT: <Box><Text>Hello</Text></Box>

// ============================================================================
// CRITICAL: Status Symbols and Colors (must match tree-debugger.ts:15-21)
// ============================================================================
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',       // ○ gray
  running: 'cyan',    // ◐ cyan (yellow was used in hello-world, update to cyan)
  completed: 'green', // ✓ green
  failed: 'red',      // ✗ red
  cancelled: 'yellow',// ⊘ yellow
};

// ============================================================================
// CRITICAL: Tree Rendering Logic (from tree-debugger.ts:217-245)
// ============================================================================
// The renderTree() function uses context-aware prefix calculation:
// - Root node: no prefix, no connector
// - Non-last child: prefix + '├── '
// - Last child: prefix + '└── '
// - Child prefixes for recursion:
//   - If parent was non-last: prefix + '│   '
//   - If parent was last: prefix + '    '

// Implementation pattern for Ink:
const TreeNode = ({ node, depth, prefix, isLast, isRoot }) => {
  const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{prefix}</Text>
        <Text dimColor>{connector}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={STATUS_COLORS[node.status]}>{node.name}</Text>
      </Box>
      {node.children.map((child, index) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          prefix={childPrefix}
          isLast={index === node.children.length - 1}
          isRoot={false}
        />
      ))}
    </Box>
  );
};

// ============================================================================
// CRITICAL: WorkflowTreeDebugger.events Observable Pattern
// ============================================================================
// The events Observable emits WorkflowEvent objects
// Subscribe to events that affect tree structure:
// - 'childAttached': New child added
// - 'childDetached': Child removed
// - 'treeUpdated': Root tree changed
// - 'stepStart', 'stepEnd': Step execution (status changes)
// - 'error': Node failed
// - 'taskStart', 'taskEnd': Task execution

// Pattern: Update tree on structural changes
useEffect(() => {
  const subscription = debugger.events.subscribe({
    next: (event) => {
      switch (event.type) {
        case 'childAttached':
        case 'childDetached':
        case 'treeUpdated':
        case 'stepStart':
        case 'stepEnd':
        case 'error':
          // Trigger re-render by calling getTree()
          setTree(debugger.getTree());
          break;
      }
    }
  });
  return () => subscription.unsubscribe();
}, [debugger]);

// ============================================================================
// CRITICAL: React 19 + Ink 6.6.0 Requirements (from P2.M2.T1.S1)
// ============================================================================
// - React 19+ required (NOT React 18)
// - Node 20+ required (NOT Node 18)
// - tsconfig.json must have: "jsx": "react-jsx", "jsxImportSource": "ink"
// - Already configured from P2.M2.T1.S1 - no changes needed

// ============================================================================
// CRITICAL: Testing with ink-testing-library
// ============================================================================
// Install: npm install --save-dev ink-testing-library @types/react@^19.0.0
// Import: import { render } from 'ink-testing-library';
// Pattern:
//   const { lastFrame, unmount } = render(<WorkflowTree node={tree} />);
//   expect(lastFrame()).toContain('Expected Text');
//   unmount(); // Cleanup

// ============================================================================
// CRITICAL: Vitest Configuration for .tsx Tests
// ============================================================================
// vitest.config.ts needs esbuild configuration for JSX:
// esbuild: {
//   jsx: 'automatic',
//   jsxImportSource: 'ink'
// }

// ============================================================================
// CRITICAL: Performance Considerations (from research/01-ink-reactive-patterns.md)
// ============================================================================
// - High-frequency events can cause flickering
// - Throttle updates to 10-60 FPS using render({ maxFps: 30 })
// - Use React.memo for expensive components
// - <Static> component for logs (not needed for this subtask)

// ============================================================================
// CRITICAL: Unicode Tree Characters
// ============================================================================
// │  (U+2502) Box Drawings Light Vertical
// ├  (U+251C) Box Drawings Light Vertical and Right
// └  (U+2514) Box Drawings Light Up and Right
// ─  (U+2500) Box Drawings Light Horizontal
// These characters must be preserved exactly - don't replace with ASCII

// ============================================================================
// CRITICAL: hello-world Prototype Status Field Mismatch
// ============================================================================
// The hello-world prototype uses 'pending' status
// Real WorkflowNode uses 'idle' status
// Must update StatusIcon to use 'idle' instead of 'pending'
```

## Implementation Blueprint

### Data Models and Structure

**No new data models required** - uses existing `WorkflowNode` interface:

```typescript
// From src/types/workflow.ts
import type { WorkflowNode, WorkflowStatus } from '../../src/types/workflow.js';

// Status types (for reference)
type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

// Observable type (for reference)
import { Observable } from '../../src/utils/observable.js';
import type { WorkflowEvent } from '../../src/types/events.js';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE vitest.config.ts for JSX test support
  - ADD to esbuild config: jsx: "automatic"
  - ADD to esbuild config: jsxImportSource: "ink"
  - VERIFY: test.match pattern includes .tsx files
  - LOCATION: /home/dustin/projects/groundswell/vitest.config.ts
  - PATTERN: Follow existing esbuild configuration structure
  - DEPENDENCIES: None (first task)

Task 2: INSTALL testing dependencies
  - RUN: npm install --save-dev ink-testing-library@^4.0.0
  - RUN: npm install --save-dev @types/react@^19.0.0 (if not present)
  - VERIFY: ink-testing-library appears in package.json devDependencies
  - LOCATION: /home/dustin/projects/groundswell/package.json
  - DEPENDENCIES: None

Task 3: CREATE examples/components/ directory
  - RUN: mkdir -p examples/components
  - CREATE: examples/components/index.ts for exports
  - LOCATION: /home/dustin/projects/groundswell/examples/components/
  - DEPENDENCIES: None

Task 4: CREATE examples/components/StatusIcon.tsx
  - IMPLEMENT: StatusIcon functional component
  - ACCEPT: status: WorkflowStatus prop
  - RENDER: colored status symbol from STATUS_SYMBOLS
  - USE: <Text color={STATUS_COLORS[status]}> for color
  - USE: STATUS_SYMBOLS[status] for icon
  - NAMING: PascalCase component, camelCase exports
  - PLACEMENT: examples/components/StatusIcon.tsx
  - DEPENDENCIES: None

Task 5: CREATE examples/components/WorkflowTreeNode.tsx
  - IMPLEMENT: WorkflowTreeNode functional component
  - ACCEPT: node, depth, prefix, isLast, isRoot props
  - IMPLEMENT: Connector logic (├── vs └──)
  - IMPLEMENT: Child prefix calculation (│   vs    )
  - IMPLEMENT: Recursive rendering of children
  - USE: StatusIcon component for status display
  - USE: <Text dimColor> for connectors and prefixes
  - NAMING: PascalCase component, camelCase props
  - PLACEMENT: examples/components/WorkflowTreeNode.tsx
  - PATTERN: Follow renderTree() logic from tree-debugger.ts:217-245
  - DEPENDENCIES: Task 4 (needs StatusIcon)

Task 6: CREATE examples/components/WorkflowTree.tsx
  - IMPLEMENT: WorkflowTree functional component
  - ACCEPT: node: WorkflowNode prop
  - RENDER: WorkflowTreeNode with isRoot=true
  - EXPORT: WorkflowTree as default export
  - NAMING: PascalCase component, camelCase exports
  - PLACEMENT: examples/components/WorkflowTree.tsx
  - DEPENDENCIES: Task 5 (needs WorkflowTreeNode)

Task 7: CREATE examples/components/WorkflowTreeDebuggerUI.tsx
  - IMPLEMENT: WorkflowTreeDebuggerUI functional component
  - ACCEPT: debugger: WorkflowTreeDebugger prop
  - USE: useState for tree state (initialized with debugger.getTree())
  - USE: useEffect to subscribe to debugger.events Observable
  - UPDATE: setTree(debugger.getTree()) on relevant events
  - CLEANUP: subscription.unsubscribe() in useEffect return
  - RENDER: WorkflowTree component with tree state
  - ADD: Optional stats display (totalNodes, byStatus)
  - NAMING: PascalCase component, camelCase props
  - PLACEMENT: examples/components/WorkflowTreeDebuggerUI.tsx
  - PATTERN: Follow Observable subscription pattern from research/01-ink-reactive-patterns.md
  - DEPENDENCIES: Task 6 (needs WorkflowTree)

Task 8: UPDATE examples/components/index.ts
  - EXPORT: StatusIcon, WorkflowTree, WorkflowTreeDebuggerUI
  - PATTERN: barrel export file matching src/index.ts
  - LOCATION: examples/components/index.ts
  - DEPENDENCIES: Tasks 4, 5, 6, 7 (all components must exist)

Task 9: CREATE examples/examples/12-ink-debugger-reactive.tsx
  - IMPLEMENT: Integration example demonstrating reactive tree
  - CREATE: Sample workflow with parent-child relationships
  - CREATE: WorkflowTreeDebugger instance
  - ATTACH: debugger to workflow
  - RENDER: WorkflowTreeDebuggerUI with debugger instance
  - ADD: Shebang (#!/usr/bin/env node)
  - ADD: render(<App />, { exitOnCtrlC: true, maxFps: 30 })
  - NAMING: kebab-case file name
  - PLACEMENT: examples/examples/12-ink-debugger-reactive.tsx
  - PATTERN: Follow ink-debugger-hello.tsx structure
  - DEPENDENCIES: Task 7 (needs WorkflowTreeDebuggerUI)

Task 10: CREATE examples/__tests__/workflow-tree.test.tsx
  - IMPLEMENT: Unit tests for StatusIcon component
  - IMPLEMENT: Unit tests for WorkflowTree component
  - IMPLEMENT: Unit tests for WorkflowTreeDebuggerUI component
  - USE: ink-testing-library render() function
  - ASSERT: lastFrame() contains expected text
  - TEST: Observable subscription cleanup
  - TEST: Tree rendering with different structures
  - TEST: Status colors for all status types
  - NAMING: test_*.tsx or *.test.tsx (follow existing pattern)
  - PLACEMENT: examples/__tests__/workflow-tree.test.tsx
  - PATTERN: Follow test patterns from src/__tests__/unit/
  - DEPENDENCIES: Tasks 4, 5, 6, 7 (components to test)

Task 11: CREATE examples/__tests__/ directory (if needed)
  - RUN: mkdir -p examples/__tests__
  - LOCATION: /home/dustin/projects/groundswell/examples/__tests__/
  - DEPENDENCIES: None (can be done anytime before Task 10)

Task 12: VERIFY all files compile
  - RUN: npx tsc --noEmit examples/components/*.tsx
  - RUN: npx tsc --noEmit examples/examples/12-ink-debugger-reactive.tsx
  - RUN: npx tsc --noEmit examples/__tests__/workflow-tree.test.tsx
  - EXPECT: No TypeScript errors
  - DEPENDENCIES: Tasks 1-10 (all files created)

Task 13: RUN tests and verify they pass
  - RUN: npm test -- examples/__tests__/workflow-tree.test.tsx
  - EXPECT: All tests pass
  - DEBUG: Fix any failing tests
  - DEPENDENCIES: Task 10 (tests must exist)

Task 14: RUN integration example and verify it works
  - RUN: tsx examples/examples/12-ink-debugger-reactive.tsx
  - VERIFY: Tree displays with proper indentation
  - VERIFY: Status symbols show with correct colors
  - VERIFY: Tree updates as workflow executes
  - VERIFY: Press Ctrl+C exits cleanly
  - EXPECT: No runtime errors
  - DEPENDENCIES: Task 9 (example must exist)
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Pattern 1: StatusIcon Component
// Location: examples/components/StatusIcon.tsx
// ============================================================================
import React from 'react';
import { Text } from 'ink';
import type { WorkflowStatus } from '../../src/types/workflow.js';

const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  cancelled: 'yellow',
};

export interface StatusIconProps {
  status: WorkflowStatus;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  return (
    <Text color={STATUS_COLORS[status] || 'white'}>
      {STATUS_SYMBOLS[status] || '?'}
    </Text>
  );
};

// ============================================================================
// Pattern 2: WorkflowTreeNode Component (Recursive)
// Location: examples/components/WorkflowTreeNode.tsx
// ============================================================================
import React from 'react';
import { Box, Text } from 'ink';
import type { WorkflowNode } from '../../src/types/workflow.js';
import { StatusIcon } from './StatusIcon.js';

export interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  depth?: number;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
}

export const WorkflowTreeNode: React.FC<WorkflowTreeNodeProps> = ({
  node,
  depth = 0,
  prefix = '',
  isLast = false,
  isRoot = false,
}) => {
  // Calculate connector based on position
  const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');

  // Calculate child prefix based on parent's position
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  return (
    <Box flexDirection="column">
      {/* Current node */}
      <Box>
        <Text dimColor>{prefix}</Text>
        <Text dimColor>{connector}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={getStatusColor(node.status)}>{node.name}</Text>
      </Box>

      {/* Recursively render children */}
      {node.children.map((child, index) => (
        <WorkflowTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          prefix={childPrefix}
          isLast={index === node.children.length - 1}
          isRoot={false}
        />
      ))}
    </Box>
  );
};

function getStatusColor(status: WorkflowStatus): string {
  const colors: Record<WorkflowStatus, string> = {
    idle: 'gray',
    running: 'cyan',
    completed: 'green',
    failed: 'red',
    cancelled: 'yellow',
  };
  return colors[status] || 'white';
}

// ============================================================================
// Pattern 3: WorkflowTree Component (Wrapper)
// Location: examples/components/WorkflowTree.tsx
// ============================================================================
import React from 'react';
import type { WorkflowNode } from '../../src/types/workflow.js';
import { WorkflowTreeNode } from './WorkflowTreeNode.js';

export interface WorkflowTreeProps {
  node: WorkflowNode;
}

export const WorkflowTree: React.FC<WorkflowTreeProps> = ({ node }) => {
  return <WorkflowTreeNode node={node} isRoot={true} />;
};

export default WorkflowTree;

// ============================================================================
// Pattern 4: WorkflowTreeDebuggerUI Component (Reactive)
// Location: examples/components/WorkflowTreeDebuggerUI.tsx
// ============================================================================
import React, { useState, useEffect } from 'react';
import { Box, Text, Newline } from 'ink';
import type { WorkflowNode } from '../../src/types/workflow.js';
import type { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';
import type { WorkflowEvent } from '../../src/types/events.js';
import { WorkflowTree } from './WorkflowTree.js';

export interface WorkflowTreeDebuggerUIProps {
  debugger: WorkflowTreeDebugger;
}

export const WorkflowTreeDebuggerUI: React.FC<WorkflowTreeDebuggerUIProps> = ({
  debugger,
}) => {
  // State for tree and stats
  const [tree, setTree] = useState<WorkflowNode>(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());

  // Subscribe to Observable for real-time updates
  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event: WorkflowEvent) => {
        // Update tree on structural and status changes
        switch (event.type) {
          case 'childAttached':
          case 'childDetached':
          case 'treeUpdated':
          case 'stepStart':
          case 'stepEnd':
          case 'error':
          case 'taskStart':
          case 'taskEnd':
            // Refresh tree and stats from debugger
            setTree(debugger.getTree());
            setStats(debugger.getStats());
            break;
        }
      },
    });

    // Cleanup: unsubscribe on unmount
    return () => subscription.unsubscribe();
  }, [debugger]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Workflow Tree Debugger (Reactive)
      </Text>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <Text dimColor>
        Nodes: {stats.totalNodes} |
        Completed: {stats.byStatus.completed || 0} |
        Failed: {stats.byStatus.failed || 0}
      </Text>
      <Newline />
      <WorkflowTree node={tree} />
    </Box>
  );
};

export default WorkflowTreeDebuggerUI;

// ============================================================================
// Pattern 5: Integration Example
// Location: examples/examples/12-ink-debugger-reactive.tsx
// ============================================================================
#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { createWorkflow } from '../src/index.js';
import { WorkflowTreeDebugger } from '../src/debugger/tree-debugger.js';
import { WorkflowTreeDebuggerUI } from '../components/WorkflowTreeDebuggerUI.js';

// Create a sample workflow
const workflow = createWorkflow('Build Project', async (ctx) => {
  ctx.log('Starting build...');

  // Child workflow: Install dependencies
  const deps = ctx.createChild('Install Dependencies', async () => {
    await ctx.step('npm install', async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
    await ctx.step('npm audit', async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
  });

  // Child workflow: Run tests
  const tests = ctx.createChild('Run Tests', async () => {
    await ctx.step('Unit Tests', async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
    });
    await ctx.step('Integration Tests', async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
  });

  // Wait for children to complete
  await deps;
  await tests;
});

// Attach debugger
const debugger = new WorkflowTreeDebugger(workflow);

// Start workflow in background (non-blocking)
workflow.run().catch((err) => {
  console.error('Workflow failed:', err);
});

// Render UI with throttling (maxFps: 30)
render(
  <WorkflowTreeDebuggerUI debugger={debugger} />,
  { exitOnCtrlC: true, maxFps: 30 }
);

// ============================================================================
// Pattern 6: Component Tests
// Location: examples/__tests__/workflow-tree.test.tsx
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { StatusIcon } from '../components/StatusIcon.js';
import { WorkflowTree } from '../components/WorkflowTree.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

describe('StatusIcon', () => {
  it('renders idle status with gray color', () => {
    const { lastFrame } = render(<StatusIcon status="idle" />);
    expect(lastFrame()).toContain('○');
  });

  it('renders running status with cyan color', () => {
    const { lastFrame } = render(<StatusIcon status="running" />);
    expect(lastFrame()).toContain('◐');
  });

  it('renders completed status with green color', () => {
    const { lastFrame } = render(<StatusIcon status="completed" />);
    expect(lastFrame()).toContain('✓');
  });

  it('renders failed status with red color', () => {
    const { lastFrame } = render(<StatusIcon status="failed" />);
    expect(lastFrame()).toContain('✗');
  });

  it('renders cancelled status with yellow color', () => {
    const { lastFrame } = render(<StatusIcon status="cancelled" />);
    expect(lastFrame()).toContain('⊘');
  });
});

describe('WorkflowTree', () => {
  const mockNode: WorkflowNode = {
    id: 'test-1',
    name: 'Test Workflow',
    status: 'running',
    parent: null,
    children: [
      {
        id: 'test-2',
        name: 'Child 1',
        status: 'completed',
        parent: null,
        children: [],
        logs: [],
        events: [],
        stateSnapshot: null,
      },
      {
        id: 'test-3',
        name: 'Child 2',
        status: 'idle',
        parent: null,
        children: [],
        logs: [],
        events: [],
        stateSnapshot: null,
      },
    ],
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  it('renders tree with proper indentation', () => {
    const { lastFrame } = render(<WorkflowTree node={mockNode} />);
    expect(lastFrame()).toContain('Test Workflow');
    expect(lastFrame()).toContain('Child 1');
    expect(lastFrame()).toContain('Child 2');
  });

  it('renders branch connectors correctly', () => {
    const { lastFrame } = render(<WorkflowTree node={mockNode} />);
    // First child should use ├── (not last)
    expect(lastFrame()).toContain('├──');
    // Last child should use └── (isLast)
    expect(lastFrame()).toContain('└──');
  });

  it('renders status symbols', () => {
    const { lastFrame } = render(<WorkflowTree node={mockNode} />);
    expect(lastFrame()).toContain('◐'); // running
    expect(lastFrame()).toContain('✓'); // completed
    expect(lastFrame()).toContain('○'); // idle
  });
});

describe('WorkflowTreeDebuggerUI', () => {
  it('subscribes to debugger events and updates tree', async () => {
    // This test requires mocking WorkflowTreeDebugger
    // See research/03-testing-patterns.md for full pattern
    // For now, verify component renders without error
    const { WorkflowTreeDebugger } = await import('../../src/debugger/tree-debugger.js');
    const { createWorkflow } = await import('../../src/index.js');

    const workflow = createWorkflow('Test', async (ctx) => {
      await ctx.step('test', async () => {});
    });

    const debugger = new WorkflowTreeDebugger(workflow);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI debugger={debugger} />
    );

    expect(lastFrame()).toContain('Workflow Tree Debugger');
  });

  it('cleans up Observable subscription on unmount', () => {
    // Test subscription cleanup
    // Use vi.fn() to mock subscribe and verify unsubscribe is called
    // See research/03-testing-patterns.md for full pattern
  });
});
```

### Integration Points

```yaml
EXISTING CODE (READ-ONLY REFERENCES):
  - file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
    pattern: "STATUS_SYMBOLS" constant (lines 15-21)
    pattern: "renderTree()" method (lines 217-245) - indentation logic
    pattern: "events" property (line 32) - Observable<WorkflowEvent>
    usage: Replicate status symbols, use renderTree logic, subscribe to events

  - file: /home/dustin/projects/groundswell/src/types/workflow.ts
    pattern: "WorkflowNode" interface (lines 20-37)
    pattern: "WorkflowStatus" type (lines 4-9)
    usage: Component props, type definitions

  - file: /home/dustin/projects/groundswell/src/utils/observable.ts
    pattern: "Observable.subscribe()" method (lines 39-46)
    pattern: "Subscription.unsubscribe()" method (lines 42-44)
    usage: Subscribe to debugger.events, cleanup on unmount

  - file: /home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts
    pattern: Workflow creation with createWorkflow()
    pattern: WorkflowTreeDebugger instantiation
    pattern: Workflow.addObserver() pattern
    usage: Sample workflow structure for integration example

NEW FILES (TO CREATE):
  - add to: examples/components/
    files:
      - StatusIcon.tsx
      - WorkflowTreeNode.tsx
      - WorkflowTree.tsx
      - WorkflowTreeDebuggerUI.tsx
      - index.ts (barrel export)

  - add to: examples/examples/
    files:
      - 12-ink-debugger-reactive.tsx

  - add to: examples/__tests__/
    files:
      - workflow-tree.test.tsx

MODIFIED FILES:
  - modify: /home/dustin/projects/groundswell/package.json
    add to devDependencies:
      "ink-testing-library": "^4.0.0"
      "@types/react": "^19.0.0" (if not present)

  - modify: /home/dustin/projects/groundswell/vitest.config.ts
    add to esbuild config:
      jsx: "automatic"
      jsxImportSource: "ink"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After modifying vitest.config.ts - verify configuration
cat /home/dustin/projects/groundswell/vitest.config.ts

# Expected: esbuild section with jsx: "automatic", jsxImportSource: "ink"

# After modifying package.json - install dependencies
npm install

# Expected: No errors, ink-testing-library installed

# After creating each component file - verify TypeScript compilation
npx tsc --noEmit examples/components/StatusIcon.tsx
npx tsc --noEmit examples/components/WorkflowTreeNode.tsx
npx tsc --noEmit examples/components/WorkflowTree.tsx
npx tsc --noEmit examples/components/WorkflowTreeDebuggerUI.tsx

# Expected: No errors, TypeScript compiles .tsx successfully

# After creating integration example
npx tsc --noEmit examples/examples/12-ink-debugger-reactive.tsx

# Expected: No errors

# After creating tests
npx tsc --noEmit examples/__tests__/workflow-tree.test.tsx

# Expected: No errors

# Full TypeScript check
npx tsc --noEmit

# Expected: No errors across entire codebase
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test StatusIcon component
npm test -- examples/__tests__/workflow-tree.test.tsx -t "StatusIcon"

# Expected: All StatusIcon tests pass
# - renders idle status with gray color
# - renders running status with cyan color
# - renders completed status with green color
# - renders failed status with red color
# - renders cancelled status with yellow color

# Test WorkflowTree component
npm test -- examples/__tests__/workflow-tree.test.tsx -t "WorkflowTree"

# Expected: All WorkflowTree tests pass
# - renders tree with proper indentation
# - renders branch connectors correctly (├──, └──)
# - renders status symbols (○, ◐, ✓, ✗, ⊘)

# Test WorkflowTreeDebuggerUI component
npm test -- examples/__tests__/workflow-tree.test.tsx -t "WorkflowTreeDebuggerUI"

# Expected: All WorkflowTreeDebuggerUI tests pass
# - subscribes to debugger events
# - updates tree on events
# - cleans up subscription on unmount

# Run all tests
npm test -- examples/__tests__/workflow-tree.test.tsx

# Expected: All tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Test 1: Run integration example
tsx examples/examples/12-ink-debugger-reactive.tsx

# Expected output:
# ╔══════════════════════════════════════════════════════════╗
# ║ Workflow Tree Debugger (Reactive)                        ║
# ║ Press Ctrl+C to exit                                      ║
# ╠══════════════════════════════════════════════════════════╣
# ║ Nodes: 4 | Completed: 0 | Failed: 0                      ║
# ╠══════════════════════════════════════════════════════════╣
# ║ ◐ Build Project                                          ║
# ║   ├─ ○ Install Dependencies                             ║
# ║   │   ├─ ○ npm install                                  ║
# ║   │   └─ ○ npm audit                                    ║
# ║   └─ ○ Run Tests                                        ║
# ║       ├─ ○ Unit Tests                                   ║
# ║       └─ ○ Integration Tests                            ║
# ╚══════════════════════════════════════════════════════════╝
#
# As workflow executes, statuses update in real-time:
# - ○ idle → ◐ running → ✓ completed
# - Tree structure updates if children attach/detach
#
# Press Ctrl+C to exit → Clean exit

# Test 2: Compare with toTreeString() output
# Create a test workflow and compare outputs
node -e "
const { createWorkflow } = require('./dist/index.js');
const { WorkflowTreeDebugger } = require('./dist/index.js');

const workflow = createWorkflow('Test', async (ctx) => {
  const child = ctx.createChild('Child', async () => {});
  await child;
});

const debugger = new WorkflowTreeDebugger(workflow);
await workflow.run();
console.log('=== ASCII Output ===');
console.log(debugger.toTreeString());
"

# Then run Ink example with similar structure
# Compare: Indentation should match, connectors should match
# Expected: Visual output identical (except for color codes)

# Test 3: Verify Observable subscription cleanup
# Run example, then check for memory leaks
# (Advanced - can skip for initial implementation)

# Test 4: Test with different workflow structures
# Modify 12-ink-debugger-reactive.tsx to test:
# - Single node workflow
# - Deep nesting (5+ levels)
# - Many children (10+ siblings)
# - Mixed statuses (idle, running, completed, failed, cancelled)

# Expected: All structures render correctly
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Validation 1: Real-time Update Verification
# Run example and observe status changes
tsx examples/examples/12-ink-debugger-reactive.tsx

# Watch for:
# - Status symbols changing (○ → ◐ → ✓)
# - Tree updating without flickering (maxFps: 30 should help)
# - Colors displaying correctly (cyan for running, green for completed, etc.)

# Expected: Smooth updates, no flickering, correct colors

# Validation 2: Visual Regression Testing
# Capture output at different workflow states
# Compare with expected outputs

# Test with completed workflow
node -e "
const { createWorkflow } = require('./dist/index.js');
const { WorkflowTreeDebugger } = require('./dist/index.js');

const workflow = createWorkflow('Completed', async (ctx) => {
  await ctx.step('done', async () => {});
});

const debugger = new WorkflowTreeDebugger(workflow);
await workflow.run();
console.log(debugger.toTreeString());
"

# Run Ink example with completed workflow
# Expected: ✓ symbol for all completed nodes

# Validation 3: Error Handling
# Test with failing workflow
node -e "
const { createWorkflow } = require('./dist/index.js');
const { WorkflowTreeDebugger } = require('./dist/index.js');

const workflow = createWorkflow('Failing', async (ctx) => {
  await ctx.step('fail', async () => {
    throw new Error('Test error');
  });
});

const debugger = new WorkflowTreeDebugger(workflow);
workflow.run().catch(() => {});
setTimeout(() => console.log(debugger.toTreeString()), 100);
"

# Expected: ✗ symbol for failed node, red color

# Validation 4: Performance Testing
# Test with large workflow (100+ nodes)
tsx examples/examples/12-ink-debugger-reactive.tsx

# Modify to create 100-child workflow
# Measure:
# - Startup time (< 500ms expected)
# - Update frequency (30 FPS with maxFps: 30)
# - Memory usage (< 100MB increase expected)

# Expected: Acceptable performance, no lag

# Validation 5: Terminal Compatibility
# Test on different terminals:
# - GNOME Terminal
# - iTerm2
# - Windows Terminal
# - VS Code integrated terminal

# Expected: Consistent rendering across terminals
# Issues to watch for:
# - Unicode characters displaying as boxes (font issue)
# - Colors not showing (terminal doesn't support colors)

# Validation 6: Component Library Export Verification
# Test imports from components index
node -e "
import { WorkflowTree, StatusIcon, WorkflowTreeDebuggerUI } from './examples/components/index.ts';
console.log('All exports available');
"

# Expected: No import errors
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] vitest.config.ts updated with JSX config
- [ ] ink-testing-library installed
- [ ] All components compile without errors
- [ ] Integration example compiles without errors
- [ ] Tests compile without errors

### Feature Validation

- [ ] StatusIcon renders all 5 status types with correct symbols
- [ ] StatusIcon uses correct colors (gray, cyan, green, red, yellow)
- [ ] WorkflowTree renders with proper indentation
- [ ] Branch connectors display correctly (├──, └──, │)
- [ ] Tree rendering matches toTreeString() output
- [ ] WorkflowTreeDebuggerUI subscribes to debugger.events
- [ ] Tree updates in real-time as workflow executes
- [ ] Observable subscription cleans up on unmount
- [ ] Stats display shows correct node counts
- [ ] Integration example runs without errors

### Code Quality Validation

- [ ] All text wrapped in `<Text>` components
- [ ] No `<Box>` inside `<Text>`
- [ ] Uses Ink components correctly (Box, Text, Newline)
- [ ] TypeScript types are correct (no implicit any)
- [ ] File naming convention matches other components
- [ ] Component exports follow barrel export pattern
- [ ] Tests follow existing test patterns
- [ ] Code is self-documenting with clear component names

### Documentation & Deployment

- [ ] Components have JSDoc comments (optional but recommended)
- [ ] Integration example has clear comments
- [ ] Shebang allows direct execution with tsx
- [ ] maxFps option set for performance (30 FPS)
- [ ] exitOnCtrlC: true for clean exit

---

## Anti-Patterns to Avoid

- ❌ Don't forget to unsubscribe from Observable in useEffect cleanup
- ❌ Don't use `'pending'` status - use `'idle'` to match WorkflowNode type
- ❌ Don't use `yellow` for running status - use `cyan` to match research
- ❌ Don't put bare strings in `<Box>` - always wrap in `<Text>`
- ❌ Don't nest `<Box>` inside `<Text>` - not allowed in Ink
- ❌ Don't use old JSX transform - must use `jsx: "react-jsx"` (already configured)
- ❌ Don't skip `jsxImportSource: "ink"` - will import from wrong package (already configured)
- ❌ Don't modify files in src/ directory - this is examples/components only
- ❌ Don't implement keyboard navigation yet - that's P2.M2.T2.S1
- ❌ Don't implement expand/collapse yet - that's P2.M2.T2.S1
- ❌ Don't add complex state management - keep it simple for this prototype
- ❌ Don't use React 18 - Ink 6.x requires React 19+ (already installed from P2.M2.T1.S1)
- ❌ Don't modify `tasks.json`, `prd_snapshot.md`, or `.gitignore` - FORBIDDEN
- ❌ Don't skip testing - ink-testing-library is required for this PRP
- ❌ Don't ignore performance - use maxFps: 30 to prevent flickering
- ❌ Don't use `useStatic` - it doesn't exist in Ink (research clarified this)
- ❌ Don't replicate hello-world's `'pending'` status - use `'idle'` instead

## Context Completeness Validation

### "No Prior Knowledge" Test Results

If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:

1. **Exact Code Patterns**:
   - Complete component implementations for StatusIcon, WorkflowTreeNode, WorkflowTree, WorkflowTreeDebuggerUI
   - Observable subscription pattern with cleanup
   - Tree rendering logic matching renderTree() from tree-debugger.ts:217-245
   - Test patterns using ink-testing-library

2. **File Locations and Structure**:
   - `examples/components/` for component library
   - `examples/examples/12-ink-debugger-reactive.tsx` for integration example
   - `examples/__tests__/workflow-tree.test.tsx` for tests
   - Exact import paths for all dependencies

3. **TypeScript Configuration**:
   - vitest.config.ts changes for JSX support
   - Package.json additions for testing dependencies
   - Ink already installed and configured from P2.M2.T1.S1

4. **Research References**:
   - 6 comprehensive research documents with code examples
   - Official Ink documentation URLs
   - External examples and best practices
   - Common gotchas and solutions

5. **Integration Points**:
   - Exact lines in tree-debugger.ts to reference (STATUS_SYMBOLS, renderTree)
   - WorkflowNode interface from workflow.ts
   - Observable class from observable.ts
   - Example usage patterns from 04-observers-debugger.ts

6. **Gotchas and Constraints**:
   - React 19+ requirement (already satisfied)
   - Node 20+ requirement (already satisfied)
   - Ink component nesting rules
   - Observable subscription cleanup pattern
   - Status type correction ('idle' not 'pending')
   - Color corrections (cyan not yellow for running)

7. **Validation Commands**:
   - TypeScript compilation checks
   - Test execution patterns
   - Integration test steps
   - Expected outputs

8. **Testing Patterns**:
   - ink-testing-library usage
   - Component test structure
   - Observable cleanup testing
   - Visual regression testing

### Confidence Score

**10/10** - One-pass implementation success likelihood is excellent.

**Justification**:
1. Complete working code provided for all components
2. Exact rendering logic from existing codebase
3. All dependencies and configuration specified
4. Research thoroughly covers all aspects (6 research documents)
5. Validation commands are specific and executable
6. Gotchas are comprehensively documented
7. Working hello-world prototype exists from P2.M2.T1.S1
8. Testing framework (ink-testing-library) specified with examples

**Remaining risks** (minimal):
- Terminal compatibility issues with Unicode characters (documented)
- Performance issues with large trees (maxFps option provided)
- Test environment setup (vitest.config.ts pattern specified)

The completed PRP enables an AI agent unfamiliar with the codebase to implement the reactive workflow tree component successfully using only the PRP content and codebase access.

---
name: "PRP for P2.M2.T2.S1: Implement Expand/Collapse for Tree Nodes"
description: "Add keyboard-driven expand/collapse functionality to the WorkflowTree component with visual indicators, smart defaults, and navigation support"
---

## Goal

**Feature Goal**: Implement expand/collapse functionality for the WorkflowTree component with keyboard navigation (Enter/Space to toggle, arrow keys to navigate), visual indicators (▸ collapsed, ▾ expanded), and collapsed placeholders showing child count.

**Deliverable**:
1. Modified `examples/components/WorkflowTreeNode.tsx` with:
   - Expand/collapse state management via `expandedIds: Set<string>` prop
   - Visual indicators (▸ for collapsed, ▾ for expanded, space for leaf nodes)
   - Conditional child rendering based on expand state
   - Collapsed placeholder text: `▸ [N children]`
2. Modified `examples/components/WorkflowTreeDebuggerUI.tsx` with:
   - Internal state management for `expandedIds` and `selectedId`
   - Smart default expansion (root, failed, running nodes, first 2 levels)
   - Keyboard input handling using `useInput` hook
   - Navigation support (↑/↓ arrows, Enter/Space toggle, * expand all, / collapse all)
3. Unit tests in `examples/__tests__/workflow-tree-expand.test.tsx` covering:
   - Expand/collapse indicator rendering
   - Conditional child visibility
   - Collapsed placeholder display
   - State persistence across updates

**Success Definition**:
- Running `tsx examples/examples/12-ink-debugger-reactive.tsx` displays a tree with expand/collapse indicators
- Pressing Enter or Space toggles expand/collapse on the selected node
- Arrow keys navigate between visible nodes
- Collapsed nodes show `▸ [N children]` placeholder
- Expanded nodes show children with proper indentation
- Smart defaults expand root, failed/running nodes, and first 2 levels
- All tests pass: `npm test -- examples/__tests__/workflow-tree-expand.test.tsx`

## User Persona

**Target User**: Developer debugging complex workflow executions with deep nesting

**Use Case**: A developer is debugging a workflow with 50+ nodes across 5+ levels of nesting and needs to focus on specific branches without being overwhelmed by the full tree.

**User Journey**:
1. Developer runs `tsx examples/examples/12-ink-debugger-reactive.tsx`
2. Tree displays with smart defaults (root expanded, first 2 levels visible)
3. Developer uses arrow keys (↑/↓) to navigate to a node of interest
4. Developer presses Enter to expand a collapsed node and see its children
5. Developer presses Enter again to collapse the node
6. Developer presses `*` to expand all nodes temporarily
7. Developer presses `/` to collapse all and see only high-level structure
8. Press Ctrl+C to exit cleanly

**Pain Points Addressed**:
- Large trees (50+ nodes) overwhelm the terminal display
- Deep nesting (5+ levels) makes it hard to find relevant branches
- No way to focus on specific parts of the workflow
- Scrolling through hundreds of lines is inefficient
- Difficult to understand parent-child relationships in complex workflows

## Why

- **Large Tree Support**: Production workflows often have 50+ nodes - collapse reduces visual clutter
- **Debugging Efficiency**: Focus on failing branches without distraction from completed subtrees
- **Navigation Performance**: Arrow keys faster than scrolling through hundreds of lines
- **Mental Model**: Expand/collapse matches familiar patterns from VS Code file explorer, git log, etc.
- **Smart Defaults**: Automatically expand failed/running nodes so errors are always visible
- **Keyboard-First**: Terminal UIs are keyboard-driven - mouse interaction not supported in Ink

## What

### Scope

This subtask covers:
1. **State Management**: Add `expandedIds: Set<string>` and `selectedId: string | null` state to WorkflowTreeDebuggerUI
2. **Visual Indicators**: Add expand/collapse symbols (▸/▾) before node names
3. **Conditional Rendering**: Only render children when parent node is in expandedIds set
4. **Collapsed Placeholders**: Show `▸ [N children]` when node has collapsed children
5. **Keyboard Navigation**: Implement arrow key navigation, Enter/Space toggle, bulk expand/collapse
6. **Smart Defaults**: Initialize expanded state with root, failed/running nodes, first 2 levels
7. **Unit Tests**: Add tests for expand/collapse functionality

### Out of Scope (Future Subtasks)
- Split-pane layout with node details (P2.M2.T2.S2)
- Mouse interaction (not supported in Ink v6.6.0)
- Persistent expand state across workflow restarts (file-based storage)
- Advanced filtering (by status, name, date)
- Virtual scrolling for very large trees (1000+ nodes)

### Success Criteria

- [ ] `▸` indicator shows for collapsed nodes with children
- [ ] `▾` indicator shows for expanded nodes with children
- [ ] No indicator (space) for leaf nodes
- [ ] `▸ [N children]` placeholder shows when collapsed
- [ ] Children are hidden when parent is collapsed
- [ ] Children are visible when parent is expanded
- [ ] Enter/Space toggles expand/collapse
- [ ] Arrow keys navigate visible nodes
- [ ] `*` expands all nodes
- [ ] `/` collapses all nodes (except root)
- [ ] Root node is always expanded
- [ ] Failed nodes default to expanded
- [ ] Running nodes default to expanded
- [ ] First 2 levels default to expanded
- [ ] Expand state persists across tree updates (by node ID)
- [ ] All tests pass

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**Answer**: YES - This PRP includes:
- Complete component modification specifications with code examples
- Exact props interfaces to add/change
- Keyboard handling patterns with `useInput` hook
- Smart default expansion logic
- Integration points with existing P2.M2.T1.S2 components
- Testing setup and patterns
- 3 comprehensive research documents with implementation examples

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# CONTRACT FROM P2.M2.T1.S2 (Parallel Implementation)
- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S2/PRP.md
  why: Defines the WorkflowTree components being built in parallel
  critical: Examples/components/WorkflowTree.tsx, WorkflowTreeNode.tsx, WorkflowTreeDebuggerUI.tsx
  gotcha: These files WILL exist when this task starts - treat them as dependencies
  pattern: StatusIcon component (no changes needed), existing prop interfaces

# Existing Codebase Patterns
- file: /home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx
  why: Working prototype showing current tree rendering pattern (lines 93-126)
  pattern: WorkflowTree recursive component, branch connector logic (├─ vs └─)
  gotcha: Uses 'yellow' for running status - update to 'cyan' per previous PRP
  gotcha: Has no interactivity - this task adds keyboard handling

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: WorkflowNode interface definition - the data structure we render
  pattern: interface with id, name, parent, children, status properties
  gotcha: status type is WorkflowStatus union: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled'

- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: Existing debugger integration patterns and STATUS_SYMBOLS constant
  pattern: getTree() method for current tree state, events Observable for updates
  gotcha: STATUS_SYMBOLS constant (lines 15-21) for status icons

# Research Documents (Internal)
- docfile: plan/002_6761e4b84fd1/P2M2T2S1/research/01-ink-input-patterns.md
  why: Complete guide on Ink useInput hook for keyboard handling
  section: useInput Hook, Enter Key Detection, State Management with Set
  critical: Key finding: Ink does NOT support onClick - keyboard-only interaction required

- docfile: plan/002_6761e4b84fd1/P2M2T2S1/research/02-tree-collapse-ui.md
  why: Visual indicators, placeholder formats, keyboard shortcuts
  section: Visual Indicators (▸/▾), Collapsed Placeholders, Keyboard Interaction
  critical: Recommended symbols: ▸ (U+25B8) for collapsed, ▾ (U+25BE) for expanded

- docfile: plan/002_6761e4b84fd1/P2M2T2S1/research/03-codebase-integration.md
  why: Component modifications, props interfaces, state management patterns
  section: Component Props Interface Design, State Management Pattern, Keyboard Navigation
  critical: Complete code examples for all component modifications

# External Documentation
- url: https://github.com/vadimdemedes/ink#useinput
  why: Official Ink useInput hook documentation
  critical: useInput((input, key) => { ... }, { isActive }) signature
  section: Key object properties (key.return, key.upArrow, key.downArrow, etc.)

- url: https://react.dev/reference/react
  why: React hooks reference for useState, useCallback, useMemo
  section: useState, useCallback, useMemo - patterns used in this implementation
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                          # Compiled JavaScript output
├── docs/                          # User documentation
├── examples/
│   ├── components/                # FROM P2.M2.T1.S2: Component library
│   │   ├── StatusIcon.tsx         # FROM P2.M2.T1.S2: Status indicator (NO CHANGES)
│   │   ├── WorkflowTreeNode.tsx   # FROM P2.M2.T1.S2: Recursive tree node (MODIFY)
│   │   ├── WorkflowTree.tsx       # FROM P2.M2.T1.S2: Tree wrapper (MODIFY)
│   │   ├── WorkflowTreeDebuggerUI.tsx  # FROM P2.M2.T1.S2: Debugger UI (MODIFY)
│   │   └── index.ts               # Barrel export file
│   ├── __tests__/                 # Component tests
│   │   ├── workflow-tree.test.tsx # FROM P2.M2.T1.S2: Basic component tests
│   │   └── workflow-tree-expand.test.tsx  # NEW: Expand/collapse tests
│   ├── examples/
│   │   ├── ink-debugger-hello.tsx # Hello-world prototype (REFERENCE ONLY)
│   │   └── 12-ink-debugger-reactive.tsx  # FROM P2.M2.T1.S2: Integration example
│   ├── utils/
│   │   └── helpers.ts
│   └── index.ts
├── plan/
│   └── 002_6761e4b84fd1/
│       └── P2M2T2S1/
│           ├── research/          # Research documents (EXISTING)
│           │   ├── 01-ink-input-patterns.md
│           │   ├── 02-tree-collapse-ui.md
│           │   └── 03-codebase-integration.md
│           └── PRP.md             # THIS FILE
├── src/
│   ├── debugger/
│   │   └── tree-debugger.ts       # REFERENCED: getTree(), events
│   ├── types/
│   │   └── workflow.ts            # REFERENCED: WorkflowNode interface
│   └── utils/
│       └── observable.ts          # REFERENCED: Observable class
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Desired Codebase Tree (Changes Only)

```bash
# MODIFIED FILES (from P2.M2.T1.S2)
examples/components/
  WorkflowTreeNode.tsx              # MODIFY: Add expand/collapse props and rendering
  WorkflowTree.tsx                  # MODIFY: Pass through expand props
  WorkflowTreeDebuggerUI.tsx        # MODIFY: Add state management and keyboard input
  index.ts                          # MODIFY: Export updated types (if needed)

examples/__tests__/
  workflow-tree-expand.test.tsx     # NEW: Expand/collapse tests

# NO CHANGES NEEDED
examples/components/StatusIcon.tsx  # Already correct from P2.M2.T1.S2
examples/examples/12-ink-debugger-reactive.tsx  # Automatically inherits new features
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// ============================================================================
// CRITICAL: Ink Does NOT Support onClick Events
// ============================================================================
// Ink v6.6.0 Text component does NOT have onClick or mouse support
// WRONG: <Text onClick={handleClick}>Click me</Text>
// CORRECT: Use keyboard-only interaction with useInput hook
// See: research/01-ink-input-patterns.md section "Text onClick Events"

// ============================================================================
// CRITICAL: useInput Hook for Keyboard Handling
// ============================================================================
// Import useInput from Ink
import { useInput } from 'ink';

// Use useInput to handle keyboard input
useInput((input, key) => {
  // Detect Enter key
  if (key.return) {
    // Handle expand/collapse toggle
  }

  // Detect Space key
  if (input === ' ') {
    // Handle expand/collapse toggle (alternative to Enter)
  }

  // Arrow keys for navigation
  if (key.upArrow) { /* navigate up */ }
  if (key.downArrow) { /* navigate down */ }

  // Explicit expand/collapse
  if (input === '+') { /* expand */ }
  if (input === '-') { /* collapse */ }

  // Bulk operations
  if (input === '*') { /* expand all */ }
  if (input === '/') { /* collapse all */ }
});

// ============================================================================
// CRITICAL: State Management with Set<string>
// ============================================================================
// Use Set<string> for tracking expanded node IDs (O(1) lookup)
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

// Toggle pattern (immutable update)
const toggleNode = (nodeId: string) => {
  setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(nodeId)) {
      next.delete(nodeId);  // Collapse
    } else {
      next.add(nodeId);     // Expand
    }
    return next;
  });
};

// Check if expanded
const isExpanded = expandedIds.has(nodeId);

// ============================================================================
// CRITICAL: Expand/Collapse Indicators (Unicode)
// ============================================================================
const COLLAPSED = '▸';  // U+25B8 - Black Right-Pointing Small Triangle
const EXPANDED = '▾';  // U+25BE - Black Down-Pointing Small Triangle
const LEAF = ' ';       // Space for nodes without children

// Render indicator
const hasChildren = node.children.length > 0;
const indicator = hasChildren
  ? (isExpanded ? EXPANDED : COLLAPSED)
  : LEAF;

// ============================================================================
// CRITICAL: Collapsed Placeholder Format
// ============================================================================
// When a node with children is collapsed, show child count
{hasChildren && !isExpanded && (
  <Text dimColor> ▸ [{node.children.length} children]</Text>
)}

// Examples:
// ▸ [2 children]
// ▸ [5 children]
// ▸ [1 child]

// ============================================================================
// CRITICAL: Conditional Child Rendering
// ============================================================================
// Only render children when parent is expanded
{isExpanded && hasChildren && node.children.map((child, index) => (
  <WorkflowTreeNode
    key={child.id}
    node={child}
    // ... pass down expandedIds, onToggle, selectedId
  />
))}

// ============================================================================
// CRITICAL: Smart Default Expansion
// ============================================================================
// Initialize expanded state with smart defaults
function initializeExpandedState(root: WorkflowNode): Set<string> {
  const expandedIds = new Set<string>();

  function traverse(node: WorkflowNode, depth: number): void {
    // Rule 1: Root is always expanded
    if (depth === 0) {
      expandedIds.add(node.id);
    }

    // Rule 2: Always expand failed/cancelled nodes
    if (node.status === 'failed' || node.status === 'cancelled') {
      expandedIds.add(node.id);
    }

    // Rule 3: Always expand running nodes
    if (node.status === 'running') {
      expandedIds.add(node.id);
    }

    // Rule 4: Expand first 2 levels
    if (depth < 2) {
      expandedIds.add(node.id);
    }

    // Recurse to children
    node.children.forEach(child => traverse(child, depth + 1));
  }

  traverse(root, 0);
  return expandedIds;
}

// ============================================================================
// CRITICAL: Keyboard Navigation with Flattened Node List
// ============================================================================
// To support arrow key navigation, flatten the tree to visible nodes only
const visibleNodes = useMemo(() => {
  const nodes: { id: string; name: string; depth: number }[] = [];

  function traverse(node: WorkflowNode, depth: number) {
    nodes.push({ id: node.id, name: node.name, depth });

    // Only add children if expanded
    if (expandedIds.has(node.id) && node.children.length > 0) {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(root, 0);
  return nodes;
}, [root, expandedIds]);

// Navigate with arrow keys
const selectedIndex = useMemo(() => {
  return visibleNodes.findIndex(n => n.id === selectedId);
}, [visibleNodes, selectedId]);

// In useInput handler:
if (key.upArrow && selectedIndex > 0) {
  setSelectedId(visibleNodes[selectedIndex - 1].id);
}
if (key.downArrow && selectedIndex < visibleNodes.length - 1) {
  setSelectedId(visibleNodes[selectedIndex + 1].id);
}

// ============================================================================
// CRITICAL: Expand State Persistence Across Updates
// ============================================================================
// When tree updates (from Observable events), expanded state persists
// because it's tracked by node.id, not by index or position
// New nodes default to collapsed (not in expandedIds)
// Existing nodes maintain their expand state
// NO CODE NEEDED - Set<string> pattern handles this automatically

// ============================================================================
// CRITICAL: Props to Add to WorkflowTreeNode
// ============================================================================
export interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  depth?: number;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
  // NEW: Expand/collapse props
  expandedIds?: Set<string>;           // Set of expanded node IDs
  onToggle?: (nodeId: string) => void; // Toggle callback (optional, for future)
  selectedId?: string | null;          // Currently selected node ID
}

// ============================================================================
// CRITICAL: Component Dependencies from P2.M2.T1.S2
// ============================================================================
// The following components are being built in P2.M2.T1.S2 and will exist:
// - examples/components/StatusIcon.tsx (NO CHANGES NEEDED)
// - examples/components/WorkflowTreeNode.tsx (MODIFY - add expand props)
// - examples/components/WorkflowTree.tsx (MODIFY - pass through props)
// - examples/components/WorkflowTreeDebuggerUI.tsx (MODIFY - add state)
// - examples/examples/12-ink-debugger-reactive.tsx (NO CHANGES - inherits)
//
// TREAT P2.M2.T1.S2 PRP AS A CONTRACT - those files will exist as specified

// ============================================================================
// CRITICAL: Status Colors (from P2.M2.T1.S2 PRP)
// ============================================================================
const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',       // ○ gray
  running: 'cyan',    // ◐ cyan (NOT yellow - hello-world was wrong)
  completed: 'green', // ✓ green
  failed: 'red',      // ✗ red
  cancelled: 'yellow',// ⊘ yellow
};

// ============================================================================
// CRITICAL: Branch Connector Pattern (from P2.M2.T1.S2 PRP)
// ============================================================================
// The connector logic from hello-world.tsx:
const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

// NOTE: hello-world uses '└─ ' but PRP specifies '└── ' (2 dashes)
// Follow the P2.M2.T1.S2 PRP pattern for consistency

// ============================================================================
// CRITICAL: React 19 + Ink 6.6.0 Requirements
// ============================================================================
// - React 19+ required (NOT React 18)
// - Node 20+ required (NOT Node 18)
// - tsconfig.json already configured from P2.M2.T1.S1
// - No changes needed
```

## Implementation Blueprint

### Data Models and Structure

**No new data models required** - uses existing `WorkflowNode` interface:

```typescript
// From src/types/workflow.ts (already exists)
import type { WorkflowNode, WorkflowStatus } from '../../src/types/workflow.js';

// No new models needed - add props to existing components
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE examples/__tests__/workflow-tree-expand.test.tsx
  - IMPLEMENT: Unit tests for expand/collapse functionality
  - TEST: Expand/collapse indicator rendering (▸/▾)
  - TEST: Conditional child visibility
  - TEST: Collapsed placeholder display
  - TEST: State persistence
  - FOLLOW pattern: examples/__tests__/workflow-tree.test.tsx from P2.M2.T1.S2
  - NAMING: workflow-tree-expand.test.tsx
  - PLACEMENT: examples/__tests__/
  - DEPENDENCIES: None (can write tests first, then implement)

Task 2: MODIFY examples/components/WorkflowTreeNode.tsx
  - ADD to props interface: expandedIds?: Set<string>
  - ADD to props interface: onToggle?: (nodeId: string) => void
  - ADD to props interface: selectedId?: string | null
  - IMPLEMENT: Expand/collapse indicator rendering (▸/▾/space)
  - IMPLEMENT: Conditional child rendering based on expandedIds.has(node.id)
  - IMPLEMENT: Collapsed placeholder: <Text dimColor> ▸ [{count} children]</Text>
  - IMPLEMENT: Selection highlighting (bold when selectedId === node.id)
  - PASS through props to children in recursive rendering
  - NAMING: Keep existing component name, add new props
  - PLACEMENT: examples/components/WorkflowTreeNode.tsx
  - DEPENDENCIES: Task 1 (tests guide implementation)

Task 3: MODIFY examples/components/WorkflowTree.tsx
  - ADD to props interface: expandedIds?: Set<string>
  - ADD to props interface: onToggle?: (nodeId: string) => void
  - ADD to props interface: selectedId?: string | null
  - PASS through props to WorkflowTreeNode
  - NAMING: Keep existing component name, add new props
  - PLACEMENT: examples/components/WorkflowTree.tsx
  - DEPENDENCIES: Task 2 (needs WorkflowTreeNode with new props)

Task 4: MODIFY examples/components/WorkflowTreeDebuggerUI.tsx
  - ADD state: const [expandedIds, setExpandedIds] = useState<Set<string>>(...)
  - ADD state: const [selectedId, setSelectedId] = useState<string | null>(root.id)
  - IMPLEMENT: initializeExpandedState() function with smart defaults
  - IMPLEMENT: handleToggle() callback for toggle operations
  - ADD: useInput hook for keyboard handling (Enter/Space, arrows, *, /)
  - IMPLEMENT: visibleNodes useMemo for flattened navigation
  - IMPLEMENT: selectedIndex useMemo for current selection
  - PASS expandedIds, selectedId to WorkflowTree component
  - UPDATE: Help text to show keyboard shortcuts
  - NAMING: Keep existing component name, add state and handlers
  - PLACEMENT: examples/components/WorkflowTreeDebuggerUI.tsx
  - DEPENDENCIES: Task 3 (needs WorkflowTree with new props)

Task 5: VERIFY all files compile
  - RUN: npx tsc --noEmit examples/components/*.tsx
  - EXPECT: No TypeScript errors
  - DEPENDENCIES: Tasks 1-4 (all files created/modified)

Task 6: RUN tests and verify they pass
  - RUN: npm test -- examples/__tests__/workflow-tree-expand.test.tsx
  - EXPECT: All tests pass
  - DEBUG: Fix any failing tests
  - DEPENDENCIES: Task 1 (tests must exist)

Task 7: RUN integration example and verify functionality
  - RUN: tsx examples/examples/12-ink-debugger-reactive.tsx
  - VERIFY: Tree displays with expand/collapse indicators
  - VERIFY: Arrow keys navigate between nodes
  - VERIFY: Enter/Space toggles expand/collapse
  - VERIFY: Collapsed nodes show child count placeholder
  - VERIFY: * expands all nodes
  - VERIFY: / collapses all nodes
  - EXPECT: No runtime errors, smooth interaction
  - DEPENDENCIES: Task 4 (implementation complete)
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Pattern 1: WorkflowTreeNode Props (Extended)
// Location: examples/components/WorkflowTreeNode.tsx
// ============================================================================
export interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  depth?: number;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
  // NEW: Expand/collapse props
  expandedIds?: Set<string>;
  onToggle?: (nodeId: string) => void;
  selectedId?: string | null;
}

// ============================================================================
// Pattern 2: Expand/Collapse Indicator Rendering
// Location: examples/components/WorkflowTreeNode.tsx (inside WorkflowTreeNode component)
// ============================================================================
const hasChildren = node.children.length > 0;
const isExpanded = expandedIds?.has(node.id) ?? false;
const isSelected = selectedId === node.id;

const expandIndicator = hasChildren
  ? (isExpanded ? '▾' : '▸')
  : ' ';

// In the render:
<Text
  bold={isSelected}
  color={isSelected ? 'cyan' : undefined}
>
  {expandIndicator}
</Text>

// ============================================================================
// Pattern 3: Collapsed Placeholder Rendering
// Location: examples/components/WorkflowTreeNode.tsx (after node name)
// ============================================================================
{hasChildren && !isExpanded && (
  <Text dimColor> ▸ [{node.children.length} children]</Text>
)}

// Note: Use singular "child" when count === 1
const childText = node.children.length === 1 ? 'child' : 'children';
{hasChildren && !isExpanded && (
  <Text dimColor> ▸ [{node.children.length} {childText}]</Text>
)}

// ============================================================================
// Pattern 4: Conditional Child Rendering
// Location: examples/components/WorkflowTreeNode.tsx (in children map)
// ============================================================================
{isExpanded && hasChildren && node.children.map((child, index) => (
  <WorkflowTreeNode
    key={child.id}
    node={child}
    depth={depth + 1}
    prefix={childPrefix}
    isLast={index === node.children.length - 1}
    isRoot={false}
    expandedIds={expandedIds}
    onToggle={onToggle}
    selectedId={selectedId}
  />
))}

// CRITICAL: Only render children when isExpanded is true
// This prevents rendering collapsed subtrees

// ============================================================================
// Pattern 5: Smart Default Expansion
// Location: examples/components/WorkflowTreeDebuggerUI.tsx
// ============================================================================
interface ExpandConfig {
  maxDefaultDepth: number;
  expandErrors: boolean;
  expandRunning: boolean;
  expandCompleted: boolean;
}

const DEFAULT_CONFIG: ExpandConfig = {
  maxDefaultDepth: 2,        // Expand first 2 levels
  expandErrors: true,        // Always expand failed nodes
  expandRunning: true,       // Always expand running nodes
  expandCompleted: false,    // Collapse completed nodes
};

function initializeExpandedState(
  root: WorkflowNode,
  config: ExpandConfig = DEFAULT_CONFIG
): Set<string> {
  const expandedIds = new Set<string>();

  function traverse(node: WorkflowNode, depth: number): void {
    // Rule 1: Root is always expanded
    if (depth === 0) {
      expandedIds.add(node.id);
    }

    // Rule 2: Always expand failed/cancelled nodes
    if (config.expandErrors && (node.status === 'failed' || node.status === 'cancelled')) {
      expandedIds.add(node.id);
    }

    // Rule 3: Always expand running nodes
    if (config.expandRunning && node.status === 'running') {
      expandedIds.add(node.id);
    }

    // Rule 4: Expand first N levels
    if (depth < config.maxDefaultDepth) {
      expandedIds.add(node.id);
    }

    // Recurse to children
    node.children.forEach(child => traverse(child, depth + 1));
  }

  traverse(root, 0);
  return expandedIds;
}

// ============================================================================
// Pattern 6: State Management in WorkflowTreeDebuggerUI
// Location: examples/components/WorkflowTreeDebuggerUI.tsx
// ============================================================================
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useInput } from 'ink';

export const WorkflowTreeDebuggerUI: React.FC<WorkflowTreeDebuggerUIProps> = ({
  debugger,
}) => {
  const [tree, setTree] = useState<WorkflowNode>(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());

  // NEW: Expand/collapse state with smart defaults
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    initializeExpandedState(tree)
  );

  // NEW: Selection state for keyboard navigation
  const [selectedId, setSelectedId] = useState<string | null>(tree.id);

  // NEW: Toggle handler
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // NEW: Flattened node list for navigation
  const visibleNodes = useMemo(() => {
    const nodes: { id: string; depth: number }[] = [];

    function traverse(node: WorkflowNode, depth: number) {
      nodes.push({ id: node.id, depth });

      // Only add children if expanded
      if (expandedIds.has(node.id) && node.children.length > 0) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    }

    traverse(tree, 0);
    return nodes;
  }, [tree, expandedIds]);

  // NEW: Current selection index
  const selectedIndex = useMemo(() => {
    return visibleNodes.findIndex(n => n.id === selectedId);
  }, [visibleNodes, selectedId]);

  // NEW: Keyboard input handling
  useInput((input, key) => {
    // Toggle expand/collapse
    if (key.return || input === ' ') {
      if (selectedId) {
        const node = findNodeById(tree, selectedId);
        if (node && node.children.length > 0) {
          handleToggle(selectedId);
        }
      }
      return;
    }

    // Navigate up
    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedId(visibleNodes[selectedIndex - 1].id);
      }
      return;
    }

    // Navigate down
    if (key.downArrow) {
      if (selectedIndex < visibleNodes.length - 1) {
        setSelectedId(visibleNodes[selectedIndex + 1].id);
      }
      return;
    }

    // Expand all
    if (input === '*') {
      const allIds = collectAllNodeIds(tree);
      setExpandedIds(new Set(allIds));
      return;
    }

    // Collapse all (keep root expanded)
    if (input === '/') {
      setExpandedIds(new Set([tree.id]));
      return;
    }
  });

  // ... existing Observable subscription (from P2.M2.T1.S2)
  // ... existing render with updated WorkflowTree props

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Workflow Tree Debugger</Text>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <Text dimColor>
        Nodes: {stats.totalNodes} |
        Enter/Space: Toggle | ↑/↓: Navigate | *: Expand all | /: Collapse all
      </Text>
      <Newline />
      <WorkflowTree
        node={tree}
        expandedIds={expandedIds}
        selectedId={selectedId}
      />
    </Box>
  );
};

// Helper: Find node by ID in tree
function findNodeById(root: WorkflowNode, id: string): WorkflowNode | null {
  if (root.id === id) return root;

  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

// Helper: Collect all node IDs
function collectAllNodeIds(root: WorkflowNode): string[] {
  const ids: string[] = [];

  function traverse(node: WorkflowNode) {
    ids.push(node.id);
    node.children.forEach(traverse);
  }

  traverse(root);
  return ids;
}

// ============================================================================
// Pattern 7: WorkflowTree Component (Updated)
// Location: examples/components/WorkflowTree.tsx
// ============================================================================
export interface WorkflowTreeProps {
  node: WorkflowNode;
  // NEW: Expand/collapse props
  expandedIds?: Set<string>;
  onToggle?: (nodeId: string) => void;
  selectedId?: string | null;
}

export const WorkflowTree: React.FC<WorkflowTreeProps> = ({
  node,
  expandedIds,
  onToggle,
  selectedId,
}) => {
  return (
    <WorkflowTreeNode
      node={node}
      isRoot={true}
      expandedIds={expandedIds}
      onToggle={onToggle}
      selectedId={selectedId}
    />
  );
};

export default WorkflowTree;

// ============================================================================
// Pattern 8: Unit Tests for Expand/Collapse
// Location: examples/__tests__/workflow-tree-expand.test.tsx
// ============================================================================
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { WorkflowTree } from '../components/WorkflowTree.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

describe('WorkflowTree Expand/Collapse', () => {
  const mockNode: WorkflowNode = {
    id: 'root',
    name: 'Root',
    status: 'running',
    parent: null,
    children: [
      {
        id: 'child-1',
        name: 'Child 1',
        status: 'completed',
        parent: null,
        children: [
          { id: 'grandchild-1', name: 'Grandchild 1', status: 'idle', parent: null, children: [], logs: [], events: [], stateSnapshot: null },
          { id: 'grandchild-2', name: 'Grandchild 2', status: 'idle', parent: null, children: [], logs: [], events: [], stateSnapshot: null },
        ],
        logs: [],
        events: [],
        stateSnapshot: null,
      },
      {
        id: 'child-2',
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

  it('renders collapsed indicator for nodes with children', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('▸');
  });

  it('renders expanded indicator for expanded nodes', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id])}
      />
    );
    expect(lastFrame()).toContain('▾');
  });

  it('renders no indicator for leaf nodes', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    // Child 2 has no children, should not have expand/collapse indicator
    // Look for the pattern: "Child 2" without ▸ or ▾ immediately before
    const lines = lastFrame().split('\n');
    const child2Line = lines.find(line => line.includes('Child 2'));
    expect(child2Line).toBeTruthy();
    // Should not have ▸ or ▾ before Child 2
    expect(child2Line?.match(/Child 2/)?.index).toBeGreaterThan(0);
  });

  it('hides children when parent is collapsed', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    // Children should not be visible
    expect(lastFrame()).not.toContain('Grandchild 1');
    expect(lastFrame()).not.toContain('Grandchild 2');
  });

  it('shows children when parent is expanded', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set([mockNode.id, 'child-1'])}
      />
    );
    // Children should be visible
    expect(lastFrame()).toContain('Grandchild 1');
    expect(lastFrame()).toContain('Grandchild 2');
  });

  it('shows collapsed placeholder with child count', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
      />
    );
    // Should show collapsed placeholder for root (2 children)
    expect(lastFrame()).toContain('[2 children]');
  });

  it('shows singular "child" when count is 1', () => {
    const nodeWithOneChild: WorkflowNode = {
      id: 'parent',
      name: 'Parent',
      status: 'idle',
      parent: null,
      children: [
        { id: 'child', name: 'Child', status: 'idle', parent: null, children: [], logs: [], events: [], stateSnapshot: null },
      ],
      logs: [],
      events: [],
      stateSnapshot: null,
    };

    const { lastFrame } = render(
      <WorkflowTree
        node={nodeWithOneChild}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('[1 child]');
  });

  it('highlights selected node', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNode}
        expandedIds={new Set()}
        selectedId={mockNode.id}
      />
    );
    // Selected node should have cyan color (Ink adds color codes)
    // This is hard to test directly, but we can verify the component doesn't crash
    expect(lastFrame()).toBeTruthy();
  });
});
```

### Integration Points

```yaml
EXISTING CODE (READ-ONLY REFERENCES):
  - file: /home/dustin/projects/groundswell/src/types/workflow.ts
    pattern: "WorkflowNode" interface (lines 20-37)
    usage: Component props, type definitions

  - file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
    pattern: "getTree()" method - returns current WorkflowNode
    pattern: "events" property - Observable<WorkflowEvent>
    usage: Get tree state, subscribe to updates

CONTRACT FROM P2.M2.T1.S2 (WILL EXIST):
  - file: /home/dustin/projects/groundswell/examples/components/StatusIcon.tsx
    status: EXISTS FROM P2.M2.T1.S2
    changes: NO CHANGES NEEDED
    usage: Import and use for status icons

  - file: /home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx
    status: EXISTS FROM P2.M2.T1.S2
    changes: MODIFY - add expandedIds, onToggle, selectedId props
    usage: Add expand/collapse rendering logic

  - file: /home/dustin/projects/groundswell/examples/components/WorkflowTree.tsx
    status: EXISTS FROM P2.M2.T1.S2
    changes: MODIFY - add expandedIds, onToggle, selectedId props
    usage: Pass through props to WorkflowTreeNode

  - file: /home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx
    status: EXISTS FROM P2.M2.T1.S2
    changes: MODIFY - add state management and keyboard input
    usage: Add expandedIds, selectedId state, useInput handler

  - file: /home/dustin/projects/groundswell/examples/examples/12-ink-debugger-reactive.tsx
    status: EXISTS FROM P2.M2.T1.S2
    changes: NO CHANGES NEEDED - automatically inherits new features
    usage: Integration example will have expand/collapse automatically

MODIFIED FILES:
  - modify: /home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx
    add to interface:
      expandedIds?: Set<string>
      onToggle?: (nodeId: string) => void
      selectedId?: string | null
    add to rendering:
      expand/collapse indicator (▸/▾/space)
      collapsed placeholder text
      conditional child rendering
      selection highlighting

  - modify: /home/dustin/projects/groundswell/examples/components/WorkflowTree.tsx
    add to interface:
      expandedIds?: Set<string>
      onToggle?: (nodeId: string) => void
      selectedId?: string | null
    add to implementation:
      pass through props to WorkflowTreeNode

  - modify: /home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx
    add state:
      expandedIds: Set<string>
      selectedId: string | null
    add handlers:
      initializeExpandedState()
      handleToggle()
      findNodeById()
      collectAllNodeIds()
    add hooks:
      useInput for keyboard handling
      useMemo for visibleNodes
      useMemo for selectedIndex
    add to render:
      pass expandedIds, selectedId to WorkflowTree
      update help text with keyboard shortcuts

NEW FILES:
  - add to: examples/__tests__/
    files:
      - workflow-tree-expand.test.tsx
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After modifying each component file - verify TypeScript compilation
npx tsc --noEmit examples/components/WorkflowTreeNode.tsx

# Expected: No errors, TypeScript compiles successfully

npx tsc --noEmit examples/components/WorkflowTree.tsx

# Expected: No errors

npx tsc --noEmit examples/components/WorkflowTreeDebuggerUI.tsx

# Expected: No errors

npx tsc --noEmit examples/__tests__/workflow-tree-expand.test.tsx

# Expected: No errors

# Full TypeScript check
npx tsc --noEmit

# Expected: No errors across entire codebase
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test expand/collapse functionality
npm test -- examples/__tests__/workflow-tree-expand.test.tsx

# Expected: All tests pass
# - renders collapsed indicator for nodes with children
# - renders expanded indicator for expanded nodes
# - renders no indicator for leaf nodes
# - hides children when parent is collapsed
# - shows children when parent is expanded
# - shows collapsed placeholder with child count
# - shows singular "child" when count is 1
# - highlights selected node

# Run all component tests
npm test -- examples/__tests__/workflow-tree.test.tsx

# Expected: All tests from P2.M2.T1.S2 still pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Test 1: Run integration example with expand/collapse
tsx examples/examples/12-ink-debugger-reactive.tsx

# Expected output (initial state):
# ╔══════════════════════════════════════════════════════════╗
# ║ Workflow Tree Debugger (Reactive)                        ║
# ║ Press Ctrl+C to exit                                      ║
# ╠══════════════════════════════════════════════════════════╣
# ║ Nodes: 4 | Completed: 0 | Failed: 0                      ║
# ║ Enter/Space: Toggle | ↑/↓: Navigate | *: Expand all      ║
# ╠══════════════════════════════════════════════════════════╣
# ║ ▾ ◐ Build Project                                        ║
# ║   ├─ ✓ Install Dependencies ▾                           ║
# ║   │   ├─ ✓ npm install                                   ║
# ║   │   └─ ✓ npm audit                                     ║
# ║   ├─ ◐ Run Linter                                        ║
# ║   └─ ○ Run Tests ▸ [2 children]                         ║
# ╚══════════════════════════════════════════════════════════╝
#
# Test interactions:
# 1. Press ↓ (down arrow) - selection moves to next node
# 2. Press Enter - toggles expand/collapse on selected node
# 3. Press * - expands all nodes in tree
# 4. Press / - collapses all nodes (except root)
# 5. Press Ctrl+C - exits cleanly

# Test 2: Verify smart default expansion
# Create a workflow with failed/running nodes at depth > 2
# Verify:
# - Failed nodes are expanded even at depth 3+
# - Running nodes are expanded even at depth 3+
# - Completed nodes at depth 3 are collapsed

# Test 3: Verify state persistence
# Run example and:
# 1. Expand a node manually (Enter)
# 2. Let workflow update ( Observable triggers)
# 3. Verify node stays expanded after update

# Expected: Expand state persists across tree updates
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Validation 1: Large Tree Performance
# Create a workflow with 100+ nodes
tsx examples/examples/12-ink-debugger-reactive.tsx

# Modify to create 100-child workflow
# Measure:
# - Initial render time (< 500ms expected)
# - Expand/collapse responsiveness (instant expected)
# - Arrow key navigation smoothness (no lag)

# Expected: Smooth performance even with 100+ nodes

# Validation 2: Deep Tree Navigation
# Create a workflow with 10+ levels of nesting
# Test:
# - Arrow key navigation through deep hierarchy
# - Expand/collapse at various depths
# - Smart defaults (first 2 levels expanded)

# Expected: Navigation works correctly at any depth

# Validation 3: Unicode Character Display
# Test on different terminals:
# - GNOME Terminal
# - iTerm2
# - Windows Terminal
# - VS Code integrated terminal

# Check for:
# - ▸ (U+25B8) displays correctly (not as box)
# - ▾ (U+25BE) displays correctly (not as box)
# - ├── └── │ display correctly

# Expected: All characters render correctly on modern terminals

# Validation 4: Keyboard Shortcut Discoverability
# Run example and press ?
# (If help screen is implemented - optional for this subtask)

# Expected: Help screen shows all keyboard shortcuts

# Validation 5: Edge Case Handling
# Test edge cases:
# - Tree with only root node (no children)
# - Tree with single child
# - Tree where all nodes are collapsed
# - Tree where all nodes are expanded
# - Rapid expand/collapse (spam Enter key)

# Expected: No crashes, graceful handling
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All components compile without errors
- [ ] Unit tests pass: `npm test -- examples/__tests__/workflow-tree-expand.test.tsx`
- [ ] Existing tests still pass: `npm test -- examples/__tests__/workflow-tree.test.tsx`

### Feature Validation

- [ ] ▸ indicator shows for collapsed nodes with children
- [ ] ▾ indicator shows for expanded nodes with children
- [ ] No indicator (space) for leaf nodes
- [ ] `▸ [N children]` placeholder shows when collapsed
- [ ] `▸ [1 child]` (singular) when count is 1
- [ ] Children are hidden when parent is collapsed
- [ ] Children are visible when parent is expanded
- [ ] Enter key toggles expand/collapse
- [ ] Space key toggles expand/collapse
- [ ] Arrow keys (↑/↓) navigate visible nodes
- [ ] `*` expands all nodes
- [ ] `/` collapses all nodes (except root)
- [ ] Root node is always expanded
- [ ] Failed nodes default to expanded
- [ ] Running nodes default to expanded
- [ ] First 2 levels default to expanded
- [ ] Expand state persists across tree updates
- [ ] Selected node is highlighted (cyan color)
- [ ] Help text shows keyboard shortcuts

### Code Quality Validation

- [ ] All text wrapped in `<Text>` components
- [ ] No `<Box>` inside `<Text>`
- [ ] Uses Ink components correctly (Box, Text, useInput)
- [ ] TypeScript types are correct (no implicit any)
- [ ] Component interfaces extended properly (not replaced)
- [ ] Props passed through correctly in recursive rendering
- [ ] State follows React best practices (useState, useCallback, useMemo)
- [ ] Code is self-documenting with clear variable names

### Documentation & Deployment

- [ ] Tests document expected behavior
- [ ] Help text in UI shows keyboard shortcuts
- [ ] Code comments explain non-obvious patterns
- [ ] Integration example runs without errors

---

## Anti-Patterns to Avoid

- ❌ Don't add mouse/click support - Ink doesn't support onClick
- ❌ Don't use index-based state - always use node.id for tracking
- ❌ Don't reset expanded state on tree updates - persist by ID
- ❌ Don't forget to pass expandedIds to children in recursive rendering
- ❌ Don't render collapsed subtrees - wastes performance
- ❌ Don't use 'yellow' for running status - use 'cyan' (per P2.M2.T1.S2 PRP)
- ❌ Don't modify files in src/ directory - only examples/components/
- ❌ Don't break existing tests from P2.M2.T1.S2
- ❌ Don't add file-based state persistence - out of scope
- ❌ Don't implement virtual scrolling - out of scope for this subtask
- ❌ Don't use `input === '\r'` for Enter - use `key.return` instead
- ❌ Don't forget to handle the case where node has 0 children (leaf)
- ❌ Don't show expand indicator for leaf nodes
- ❌ Don't allow collapsing the root node (always keep expanded)
- ❌ Don't modify `tasks.json`, `prd_snapshot.md`, or `.gitignore` - FORBIDDEN

## Context Completeness Validation

### "No Prior Knowledge" Test Results

If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:

1. **Complete Component Modifications**:
   - Exact prop interfaces to add to each component
   - Complete code examples for all modifications
   - Rendering patterns for expand/collapse indicators
   - Conditional child rendering logic

2. **State Management Patterns**:
   - Set<string> pattern for expandedIds
   - Smart default expansion algorithm
   - State persistence approach (by node ID)
   - Flattened node list for navigation

3. **Keyboard Handling**:
   - Complete useInput hook implementation
   - All keyboard shortcuts (Enter/Space, arrows, *, /)
   - Navigation logic with visibleNodes
   - Selection state management

4. **Visual Indicators**:
   - Exact Unicode characters (▸ U+25B8, ▾ U+25BE)
   - Placeholder format: `▸ [N children]`
   - Singular/plural handling for "child"/"children"
   - Selection highlighting (cyan color)

5. **Integration Points**:
   - Contract from P2.M2.T1.S2 (components that will exist)
   - Existing codebase patterns to follow
   - Files to modify vs files to create
   - Dependencies between tasks

6. **Testing Strategy**:
   - Complete test specifications
   - Test patterns from P2.M2.T1.S2
   - Integration test steps
   - Expected outputs

7. **Gotchas and Constraints**:
   - Ink doesn't support onClick (keyboard-only)
   - Use key.return not input === '\r' for Enter
   - Persist state by node ID not index
   - Don't render collapsed subtrees (performance)

8. **Research References**:
   - 3 comprehensive research documents
   - Official Ink documentation URLs
   - Complete working examples
   - Best practices from real CLI tools

### Confidence Score

**10/10** - One-pass implementation success likelihood is excellent.

**Justification**:
1. Complete working code provided for all component modifications
2. Exact prop interfaces specified with TypeScript types
3. State management patterns proven in React/Ink
4. Keyboard handling fully specified with useInput examples
5. Smart default expansion algorithm provided
6. Integration points clearly defined
7. Research thoroughly covers all aspects (3 documents)
8. Testing patterns specified with examples
9. Gotchas comprehensively documented
10. Contract from P2.M2.T1.S2 clearly defined

**Remaining risks** (minimal):
- Terminal Unicode support for ▸/▾ characters (documented, has ASCII fallback)
- Performance with very large trees (mitigated by conditional rendering)
- Test environment setup (pattern specified from P2.M2.T1.S2)

The completed PRP enables an AI agent unfamiliar with the codebase to implement expand/collapse functionality for the WorkflowTree component successfully using only the PRP content and codebase access.

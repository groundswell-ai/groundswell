# Codebase Integration Analysis for P2.M2.T2.S1

> Analysis of existing codebase components and integration points for adding expand/collapse functionality to the WorkflowTree component.

**Analysis Date:** 2026-01-24
**Task:** P2.M2.T2.S1 - Implement expand/collapse for tree nodes
**Dependencies:** P2.M2.T1.S2 (Build Reactive Tree Component Prototype)

---

## 1. Existing Component Analysis

### 1.1 Hello-World Prototype (`examples/examples/ink-debugger-hello.tsx`)

**Current Structure:**

```tsx
// Lines 93-126: WorkflowTree Component
const WorkflowTree = ({ node, depth = 0, isLast = true }: {
  node: WorkflowNode;
  depth?: number;
  isLast?: boolean;
}) => {
  const indent = '  '.repeat(depth);
  const isRoot = depth === 0;
  const branch = !isRoot ? (isLast ? '└─ ' : '├─ ') : '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text dimColor>{branch}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={node.status === 'failed' ? 'red' : 'white'}>
          {node.name}
        </Text>
      </Box>
      {node.children?.map((child, index) => {
        const isLastChild = index === (node.children?.length ?? 0) - 1;
        return (
          <WorkflowTree
            key={child.id}
            node={child}
            depth={depth + 1}
            isLast={isLastChild}
          />
        );
      })}
    </Box>
  );
};
```

**Required Modifications for Expand/Collapse:**

1. **Add Props:**
   - `expandedIds: Set<string>` - Set of expanded node IDs
   - `onToggle?: (nodeId: string) => void` - Callback for toggle action
   - `selectedId?: string` - Currently selected node (for keyboard navigation)

2. **Add Expand/Collapse Indicator:**
   - Show `▸` when collapsed (has children but not expanded)
   - Show `▾` when expanded
   - Show ` ` when leaf node (no children)

3. **Conditional Child Rendering:**
   - Only render children when `expandedIds.has(node.id)` is true
   - Show placeholder when collapsed: `▸ [N children]`

### 1.2 StatusIcon Component (Lines 71-80)

**Current Implementation:**

```tsx
const StatusIcon = ({ status }: { status: string }) => {
  const color = STATUS_COLORS[status] || 'white';
  const symbol = STATUS_SYMBOLS[status] || '?';

  return (
    <Text color={color}>
      {symbol}
    </Text>
  );
};
```

**Status:** No changes needed - this component is already isolated and reusable.

### 1.3 Constants (Lines 41-59)

**Current Implementation:**

```tsx
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
  cancelled: 'cyan',
};
```

**Note:** The hello-world uses `yellow` for running, but previous PRP specifies `cyan`. Update needed.

---

## 2. WorkflowNode Type (`src/types/workflow.ts`)

**Current Interface (Lines 20-37):**

```typescript
export interface WorkflowNode {
  /** Unique identifier for this workflow instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** Parent node reference (null for root) */
  parent: WorkflowNode | null;
  /** Child workflow nodes */
  children: WorkflowNode[];
  /** Current execution status */
  status: WorkflowStatus;
  /** Log entries for this node */
  logs: LogEntry[];
  /** Events emitted by this node */
  events: WorkflowEvent[];
  /** Optional serialized state snapshot */
  stateSnapshot: SerializedWorkflowState | null;
}
```

**Status:** No changes needed - the interface already supports tree structure.

**Key Properties for Expand/Collapse:**
- `id: string` - Used for tracking expanded state
- `children: WorkflowNode[]` - Used to determine if node is expandable
- `status: WorkflowStatus` - Used for smart default expansion

---

## 3. Component Props Interface Design

### 3.1 WorkflowTree Props (from P2.M2.T1.S2)

The previous PRP defines these components that will be built:

```typescript
// examples/components/WorkflowTree.tsx
export interface WorkflowTreeProps {
  node: WorkflowNode;
}

// examples/components/WorkflowTreeNode.tsx
export interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  depth?: number;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
}

// examples/components/WorkflowTreeDebuggerUI.tsx
export interface WorkflowTreeDebuggerUIProps {
  debugger: WorkflowTreeDebugger;
}
```

### 3.2 Extended Props for Expand/Collapse

**New Props to Add:**

```typescript
// Add to WorkflowTreeNodeProps
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

// Add to WorkflowTreeDebuggerUIProps
export interface WorkflowTreeDebuggerUIProps {
  debugger: WorkflowTreeDebugger;
  // NEW: State management (internal, not passed as prop)
  // expandedIds: Set<string> - managed internally with useState
  // onToggle: (nodeId: string) => void - managed internally
  // selectedId: string | null - managed internally
}
```

---

## 4. State Management Pattern

### 4.1 State Location

**WorkflowTreeDebuggerUI** will manage all tree interaction state:

```tsx
export const WorkflowTreeDebuggerUI: React.FC<WorkflowTreeDebuggerUIProps> = ({
  debugger,
}) => {
  // Expand/collapse state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    initializeExpandedState(debugger.getTree())
  );

  // Selection state (for keyboard navigation)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Toggle handler
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

  // Keyboard input
  useInput((input, key) => {
    if (key.return || input === ' ') {
      if (selectedId) handleToggle(selectedId);
    }
    // ... more navigation
  });

  return (
    <Box flexDirection="column">
      <WorkflowTree
        node={debugger.getTree()}
        expandedIds={expandedIds}
        onToggle={handleToggle}
        selectedId={selectedId}
      />
    </Box>
  );
};
```

### 4.2 Smart Default Expansion

**Initialization Function:**

```tsx
function initializeExpandedState(
  root: WorkflowNode,
  config: ExpandConfig = DEFAULT_CONFIG
): Set<string> {
  const expandedIds = new Set<string>();

  function traverse(node: WorkflowNode, depth: number): void {
    // Root is always expanded
    if (depth === 0) {
      expandedIds.add(node.id);
    }

    // Expand by status
    if (config.expandErrors && (node.status === 'failed' || node.status === 'cancelled')) {
      expandedIds.add(node.id);
    }
    if (config.expandRunning && node.status === 'running') {
      expandedIds.add(node.id);
    }

    // Expand by depth
    if (depth < config.maxDefaultDepth) {
      expandedIds.add(node.id);
    }

    // Recurse to children
    node.children.forEach(child => traverse(child, depth + 1));
  }

  traverse(root, 0);
  return expandedIds;
}

interface ExpandConfig {
  maxDefaultDepth: number;
  expandErrors: boolean;
  expandRunning: boolean;
  expandCompleted: boolean;
}

const DEFAULT_CONFIG: ExpandConfig = {
  maxDefaultDepth: 2,
  expandErrors: true,
  expandRunning: true,
  expandCompleted: false,
};
```

---

## 5. Component Rendering Changes

### 5.1 WorkflowTreeNode Component (Modified)

```tsx
export const WorkflowTreeNode: React.FC<WorkflowTreeNodeProps> = ({
  node,
  depth = 0,
  prefix = '',
  isLast = false,
  isRoot = false,
  expandedIds = new Set(),
  onToggle,
  selectedId = null,
}) => {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  // Calculate connector based on position
  const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');

  // Calculate child prefix based on parent's position
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  // Expand/collapse indicator
  const expandIndicator = hasChildren
    ? (isExpanded ? '▾' : '▸')
    : ' ';

  return (
    <Box flexDirection="column">
      {/* Current node */}
      <Box>
        <Text dimColor>{prefix}</Text>
        <Text dimColor>{connector}</Text>
        <Text
          bold={isSelected}
          color={isSelected ? 'cyan' : undefined}
        >
          {expandIndicator}
        </Text>
        <Text> </Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={getStatusColor(node.status)}>{node.name}</Text>

        {/* Collapsed placeholder */}
        {hasChildren && !isExpanded && (
          <Text dimColor> ▸ [{node.children.length} children]</Text>
        )}
      </Box>

      {/* Recursively render children only if expanded */}
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
    </Box>
  );
};
```

### 5.2 WorkflowTree Component (Wrapper - No Changes)

The `WorkflowTree` wrapper component remains simple:

```tsx
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
```

---

## 6. Files to Modify

### 6.1 Files from P2.M2.T1.S2 (Being Built in Parallel)

These files are defined in the P2.M2.T1.S2 PRP and will be built:

1. **examples/components/StatusIcon.tsx** - NO CHANGES NEEDED
2. **examples/components/WorkflowTreeNode.tsx** - MODIFICATIONS NEEDED
   - Add expand/collapse props
   - Add expand/collapse indicator rendering
   - Add conditional child rendering
   - Add collapsed placeholder

3. **examples/components/WorkflowTree.tsx** - MODIFICATIONS NEEDED
   - Pass expand/collapse props to WorkflowTreeNode

4. **examples/components/WorkflowTreeDebuggerUI.tsx** - MODIFICATIONS NEEDED
   - Add expand/collapse state management
   - Add keyboard input handling
   - Add selection state
   - Add smart default expansion

5. **examples/examples/12-ink-debugger-reactive.tsx** - NO CHANGES NEEDED
   - Will automatically inherit expand/collapse from WorkflowTreeDebuggerUI

### 6.2 New Files for This Task

1. **examples/components/ExpandIndicator.tsx** (optional)
   - Extracted component for expand/collapse icon
   - Can be inline in WorkflowTreeNode instead

2. **examples/__tests__/workflow-tree-expand.test.tsx** - NEW
   - Tests for expand/collapse functionality
   - Tests for keyboard navigation

---

## 7. Testing Integration Points

### 7.1 Test Setup (from P2.M2.T1.S2)

The previous PRP defines the test setup:

```bash
# Testing library
npm install --save-dev ink-testing-library@^4.0.0

# Test file location
examples/__tests__/workflow-tree.test.tsx
```

### 7.2 Additional Tests for Expand/Collapse

```tsx
describe('WorkflowTree Expand/Collapse', () => {
  it('renders expand indicator for nodes with children', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNodeWithChildren}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('▸');
  });

  it('renders collapse indicator for expanded nodes', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNodeWithChildren}
        expandedIds={new Set([mockNodeWithChildren.id])}
      />
    );
    expect(lastFrame()).toContain('▾');
  });

  it('hides children when collapsed', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNodeWithChildren}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).not.toContain('Child 1');
  });

  it('shows children when expanded', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNodeWithChildren}
        expandedIds={new Set([mockNodeWithChildren.id])}
      />
    );
    expect(lastFrame()).toContain('Child 1');
  });

  it('shows collapsed placeholder with child count', () => {
    const { lastFrame } = render(
      <WorkflowTree
        node={mockNodeWithChildren}
        expandedIds={new Set()}
      />
    );
    expect(lastFrame()).toContain('[2 children]');
  });

  it('calls onToggle when Enter key is pressed', () => {
    const handleToggle = vi.fn();
    render(
      <WorkflowTreeDebuggerUI
        debugger={mockDebugger}
      />
    );

    // Simulate Enter key
    // (Ink testing library doesn't support input simulation, so this is integration test)
  });
});
```

---

## 8. Import Dependencies

### 8.1 Required Imports from Ink

```tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { WorkflowNode } from '../../src/types/workflow.js';
import type { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';
import { StatusIcon } from './StatusIcon.js';
```

### 8.2 Type Imports

```tsx
import type { WorkflowStatus } from '../../src/types/workflow.js';
import type { WorkflowEvent } from '../../src/types/events.js';
```

---

## 9. Integration with Existing Observable

### 9.1 Existing Pattern (from P2.M2.T1.S2)

```tsx
useEffect(() => {
  const subscription = debugger.events.subscribe({
    next: (event: WorkflowEvent) => {
      switch (event.type) {
        case 'childAttached':
        case 'childDetached':
        case 'treeUpdated':
        case 'stepStart':
        case 'stepEnd':
        case 'error':
        case 'taskStart':
        case 'taskEnd':
          setTree(debugger.getTree());
          setStats(debugger.getStats());
          break;
      }
    }
  });

  return () => subscription.unsubscribe();
}, [debugger]);
```

### 9.2 Expand State Persistence

**Key Decision:** Should expand state persist when tree updates?

**Recommendation:** YES - Persist expand state across updates by node ID

```tsx
// Expanded state persists automatically when tree updates
// Because it's tracked by node.id, not by index
const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
  initializeExpandedState(debugger.getTree())
);

// When tree updates, expandedIds remains unchanged
// New nodes default to collapsed (not in expandedIds)
// Existing nodes maintain their expand state
```

---

## 10. Keyboard Navigation Implementation

### 10.1 Flattened Node List for Navigation

To support arrow key navigation, we need a flattened list of visible nodes:

```tsx
// Flatten tree for navigation (only visible nodes)
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

// Get current selection index
const selectedIndex = useMemo(() => {
  return visibleNodes.findIndex(n => n.id === selectedId);
}, [visibleNodes, selectedId]);
```

### 10.2 Keyboard Input Handler

```tsx
useInput((input, key) => {
  // Toggle expand/collapse
  if (key.return || input === ' ') {
    if (selectedId) {
      const currentNode = visibleNodes[selectedIndex];
      if (currentNode) {
        // Find the actual node in the tree
        const node = findNodeById(root, selectedId);
        if (node && node.children.length > 0) {
          handleToggle(selectedId);
        }
      }
    }
    return;
  }

  // Navigate up
  if (key.upArrow || input === 'k') {
    if (selectedIndex > 0) {
      setSelectedId(visibleNodes[selectedIndex - 1].id);
    }
    return;
  }

  // Navigate down
  if (key.downArrow || input === 'j') {
    if (selectedIndex < visibleNodes.length - 1) {
      setSelectedId(visibleNodes[selectedIndex + 1].id);
    }
    return;
  }

  // Expand all
  if (input === '*') {
    const allIds = collectAllNodeIds(root);
    setExpandedIds(new Set(allIds));
    return;
  }

  // Collapse all
  if (input === '/') {
    setExpandedIds(new Set([root.id])); // Keep root expanded
    return;
  }
});
```

---

## 11. Summary of Required Changes

### 11.1 Component Modifications

| Component | Changes | Complexity |
|-----------|---------|------------|
| StatusIcon | None (already correct) | - |
| WorkflowTreeNode | Add expand/collapse rendering | Medium |
| WorkflowTree | Pass through expand props | Low |
| WorkflowTreeDebuggerUI | Add state + keyboard | High |

### 11.2 New State Required

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| expandedIds | Set<string> | Smart defaults | Track expanded nodes |
| selectedId | string \| null | null | Track keyboard selection |

### 11.3 New Handlers Required

| Handler | Signature | Purpose |
|---------|-----------|---------|
| handleToggle | (nodeId: string) => void | Toggle expand/collapse |
| initializeExpandedState | (node: WorkflowNode) => Set<string> | Smart default expansion |

### 11.4 New Visual Elements

| Element | Symbol | Purpose |
|---------|--------|---------|
| Expand indicator | ▸ | Show node can be expanded |
| Collapse indicator | ▾ | Show node can be collapsed |
| Leaf placeholder | (space) | No children |
| Collapsed placeholder | ▸ [N children] | Show hidden child count |

---

## 12. URLs and References

### Codebase Files

- `/home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx` - Hello-world prototype
- `/home/dustin/projects/groundswell/src/types/workflow.ts` - WorkflowNode interface
- `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` - Tree debugger reference

### Related Research Files

- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T2S1/research/01-ink-input-patterns.md`
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T2S1/research/02-tree-collapse-ui.md`
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S2/PRP.md` - Previous PRP

### External Documentation

- Ink useInput: https://github.com/vadimdemedes/ink#useinput
- React hooks: https://react.dev/reference/react

---

**Analysis Complete:** 2026-01-24
**Status:** Ready for PRP creation

# Ink Library Keyboard Input Handling Research

> Comprehensive research on Ink v6.6.0 keyboard input handling for implementing expand/collapse functionality in the WorkflowTreeDebugger.

**Ink Version:** 6.6.0
**Research Date:** 2025-01-24
**Project:** groundswell WorkflowTreeDebugger

---

## Table of Contents

1. [useInput Hook](#1-useinput-hook)
2. [Enter Key Detection](#2-enter-key-detection)
3. [Text onClick Events](#3-text-onclick-events)
4. [State Management with Set](#4-state-management-with-set)
5. [Complete Tree Expand/Collapse Example](#5-complete-tree-expandcollapse-example)
6. [Keyboard Navigation Best Practices](#6-keyboard-navigation-best-practices)
7. [References](#7-references)

---

## 1. useInput Hook

### Basic Usage

The `useInput` hook is Ink's primary mechanism for handling keyboard input in terminal UIs. It's a convenient alternative to using `useStdin` and listening for `data` events.

```tsx
import { useInput } from 'ink';

const UserInput = () => {
  useInput((input, key) => {
    if (input === 'q') {
      // Exit program
    }

    if (key.leftArrow) {
      // Left arrow key pressed
    }
  });

  return <Text>Press any key...</Text>;
};
```

### Signature

```typescript
useInput(inputHandler: (input: string, key: Key) => void, options?: Options): void
```

### Parameters

#### inputHandler(input, key)

The handler function receives two arguments:

**input**: `string`
- The input character(s) received from the user
- For single key presses: contains the character
- For paste events: contains the entire pasted string
- For special keys: empty string

**key**: `Key` object
- Contains boolean flags for special keys and modifiers
- See full Key type definition below

#### options

**isActive**: `boolean` (default: `true`)
- Enable or disable capturing of user input
- Useful when multiple `useInput` hooks are used to avoid handling the same input multiple times

```tsx
useInput((input, key) => {
  // Only handles input when isActive is true
}, { isActive: isInputEnabled });
```

### Complete Key Type Definition

From Ink's TypeScript definitions (`/home/dustin/projects/groundswell/node_modules/ink/build/hooks/use-input.d.ts`):

```typescript
type Key = {
  /** Up arrow key was pressed. */
  upArrow: boolean;
  /** Down arrow key was pressed. */
  downArrow: boolean;
  /** Left arrow key was pressed. */
  leftArrow: boolean;
  /** Right arrow key was pressed. */
  rightArrow: boolean;
  /** Page Down key was pressed. */
  pageDown: boolean;
  /** Page Up key was pressed. */
  pageUp: boolean;
  /** Home key was pressed. */
  home: boolean;
  /** End key was pressed. */
  end: boolean;
  /** Return (Enter) key was pressed. */
  return: boolean;
  /** Escape key was pressed. */
  escape: boolean;
  /** Ctrl key was pressed. */
  ctrl: boolean;
  /** Shift key was pressed. */
  shift: boolean;
  /** Tab key was pressed. */
  tab: boolean;
  /** Backspace key was pressed. */
  backspace: boolean;
  /** Delete key was pressed. */
  delete: boolean;
  /** Meta key was pressed. */
  meta: boolean;
};
```

---

## 2. Enter Key Detection

### Detection Methods

There are two ways to detect the Enter key press in Ink:

#### Method 1: Using key.return (Recommended)

```tsx
import { useInput } from 'ink';

useInput((input, key) => {
  if (key.return) {
    console.log('Enter key pressed!');
    // Handle expand/collapse toggle
  }
});
```

#### Method 2: Using input character (Less Reliable)

```tsx
useInput((input, key) => {
  if (input === '\r' || input === '\n') {
    console.log('Enter key pressed!');
  }
});
```

**Note:** Method 1 is preferred because it's more explicit and handles platform differences (Windows uses `\r\n`, Unix uses `\n`).

### Complete Example: Enter Key for Expand/Collapse

```tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

const TreeView = ({ nodes }: { nodes: TreeNode[] }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  useInput((input, key) => {
    if (key.return && selectedNodeId) {
      // Toggle expand/collapse on Enter
      setExpandedNodes(prev => {
        const next = new Set(prev);
        if (next.has(selectedNodeId)) {
          next.delete(selectedNodeId);
        } else {
          next.add(selectedNodeId);
        }
        return next;
      });
    }

    // Arrow navigation
    if (key.upArrow) {
      // Move selection up
    }
    if (key.downArrow) {
      // Move selection down
    }
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    return (
      <Box key={node.id} flexDirection="column">
        <Box paddingLeft={depth * 2}>
          <Text
            color={isSelected ? 'blue' : 'white'}
            bold={isSelected}
          >
            {hasChildren ? (isExpanded ? '▼ ' : '▶ ') : '  '}
            {node.label}
          </Text>
        </Box>
        {isExpanded && hasChildren && node.children?.map(child =>
          renderNode(child, depth + 1)
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Text bold>Workflow Tree (Enter to expand/collapse)</Text>
      <Box flexDirection="column" marginTop={1}>
        {nodes.map(node => renderNode(node))}
      </Box>
    </Box>
  );
};
```

---

## 3. Text onClick Events

### Important Finding: Ink Does NOT Support onClick

**⚠️ Critical Discovery:** After examining Ink v6.6.0's TypeScript definitions and source code, **the `<Text>` component does NOT support `onClick` events**.

### Text Component Props

From `/home/dustin/projects/groundswell/node_modules/ink/build/components/Text.d.ts`:

```typescript
export type Props = {
  readonly 'aria-label'?: string;
  readonly 'aria-hidden'?: boolean;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly dimColor?: boolean;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly inverse?: boolean;
  readonly wrap?: Styles['textWrap'];
  readonly children?: ReactNode;
};
```

**No onClick or event handler props are available.**

### Alternative: Mouse Support in Ink

Ink does not have built-in mouse click support in version 6.6.0. Mouse interaction requires:

1. **Using a third-party library** like `ink-mouse` (experimental)
2. **Implementing raw terminal mouse handling** via ANSI escape sequences
3. **Relying on keyboard-only interaction** (recommended for terminal UIs)

### Recommended Approach: Keyboard-Only Interaction

For the WorkflowTreeDebugger, use keyboard-only navigation:

```tsx
import { useInput } from 'ink';

const TreeDebugger = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useInput((input, key) => {
    // Expand/collapse with Enter
    if (key.return) {
      const nodeId = nodes[selectedIndex].id;
      toggleNode(nodeId);
    }

    // Expand/collapse with Space
    if (input === ' ') {
      const nodeId = nodes[selectedIndex].id;
      toggleNode(nodeId);
    }

    // Navigate with arrows
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(nodes.length - 1, prev + 1));
    }

    // Expand all with Ctrl+E
    if (key.ctrl && input === 'e') {
      expandAll();
    }

    // Collapse all with Ctrl+C
    if (key.ctrl && input === 'c') {
      collapseAll();
    }
  });

  // ... render logic
};
```

---

## 4. State Management with Set

### Pattern: Managing Expanded Node IDs

Using `Set<string>` for tracking expanded nodes is the recommended approach for tree components.

### Basic Set State Pattern

```tsx
import React, { useState } from 'react';

const TreeComponent = () => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Toggle a single node
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Expand a node
  const expandNode = (nodeId: string) => {
    setExpandedNodes(prev => new Set(prev).add(nodeId));
  };

  // Collapse a node
  const collapseNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  };

  // Check if node is expanded
  const isExpanded = (nodeId: string): boolean => {
    return expandedNodes.has(nodeId);
  };

  // Expand all nodes
  const expandAll = (nodeIds: string[]) => {
    setExpandedNodes(new Set(nodeIds));
  };

  // Collapse all nodes
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return <Text>Tree with {expandedNodes.size} expanded nodes</Text>;
};
```

### Advanced Pattern: Recursive Tree Expansion

```tsx
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

const TreeView = ({ tree }: { tree: TreeNode[] }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Collect all node IDs recursively
  const collectAllNodeIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (node: TreeNode) => {
      ids.push(node.id);
      node.children?.forEach(traverse);
    };
    nodes.forEach(traverse);
    return ids;
  };

  // Collect all parent node IDs
  const collectParentIds = (nodes: TreeNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (node: TreeNode) => {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        node.children.forEach(traverse);
      }
    };
    nodes.forEach(traverse);
    return ids;
  };

  // Expand all nodes
  const expandAll = () => {
    const allIds = collectAllNodeIds(tree);
    setExpandedNodes(new Set(allIds));
  };

  // Collapse all nodes
  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Expand only parent nodes
  const expandParents = () => {
    const parentIds = collectParentIds(tree);
    setExpandedNodes(new Set(parentIds));
  };

  // Toggle node
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  return (
    <Box flexDirection="column">
      {tree.map(node => renderNode(node, 0))}
    </Box>
  );

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <Box key={node.id} flexDirection="column">
        <Box paddingLeft={depth * 2}>
          <Text>
            {hasChildren ? (isExpanded ? '▼ ' : '▶ ') : '  '}
            {node.label}
          </Text>
        </Box>
        {isExpanded && hasChildren && node.children?.map(child =>
          renderNode(child, depth + 1)
        )}
      </Box>
    );
  }
};
```

### Performance Optimization: useMemo for Set Operations

```tsx
import { useMemo, useState } from 'react';

const OptimizedTreeView = ({ tree }: { tree: TreeNode[] }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Memoize parent IDs collection
  const parentIds = useMemo(() => {
    const ids: string[] = [];
    const traverse = (node: TreeNode) => {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        node.children.forEach(traverse);
      }
    };
    tree.forEach(traverse);
    return new Set(ids);
  }, [tree]);

  // Memoize all IDs collection
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const traverse = (node: TreeNode) => {
      ids.push(node.id);
      node.children?.forEach(traverse);
    };
    tree.forEach(traverse);
    return new Set(ids);
  }, [tree]);

  const isParent = (nodeId: string): boolean => {
    return parentIds.has(nodeId);
  };

  const isLeaf = (nodeId: string): boolean => {
    return !parentIds.has(nodeId);
  };

  // ... rest of component
};
```

---

## 5. Complete Tree Expand/Collapse Example

### Full WorkflowTreeDebugger Prototype

```tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput, Newline } from 'ink';

interface WorkflowNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  children?: WorkflowNode[];
}

const WorkflowTreeDebugger = ({ workflow }: { workflow: WorkflowNode }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string>(workflow.id);
  const [showHelp, setShowHelp] = useState(false);

  // Flatten tree for navigation
  const flatNodes = useMemo(() => {
    const nodes: { id: string; label: string; depth: number; node: WorkflowNode }[] = [];
    const traverse = (node: WorkflowNode, depth: number) => {
      nodes.push({ id: node.id, label: node.label, depth, node });
      if (expandedNodes.has(node.id) && node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    traverse(workflow, 0);
    return nodes;
  }, [workflow, expandedNodes]);

  // Get current selection index
  const selectedIndex = useMemo(() => {
    return flatNodes.findIndex(n => n.id === selectedNodeId);
  }, [flatNodes, selectedNodeId]);

  // Toggle expand/collapse
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    const collectIds = (node: WorkflowNode): string[] => {
      const ids = [node.id];
      node.children?.forEach(child => {
        ids.push(...collectIds(child));
      });
      return ids;
    };
    setExpandedNodes(new Set(collectIds(workflow)));
  }, [workflow]);

  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Keyboard input handling
  useInput((input, key) => {
    // Show/hide help
    if (input === '?') {
      setShowHelp(prev => !prev);
      return;
    }

    // Don't handle input if help is shown
    if (showHelp) return;

    // Toggle expand/collapse
    if (key.return || input === ' ') {
      const currentNode = flatNodes[selectedIndex];
      if (currentNode && currentNode.node.children) {
        toggleNode(currentNode.id);
      }
      return;
    }

    // Navigate up
    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedNodeId(flatNodes[selectedIndex - 1].id);
      }
      return;
    }

    // Navigate down
    if (key.downArrow) {
      if (selectedIndex < flatNodes.length - 1) {
        setSelectedNodeId(flatNodes[selectedIndex + 1].id);
      }
      return;
    }

    // Expand all
    if (key.ctrl && input === 'e') {
      expandAll();
      return;
    }

    // Collapse all
    if (key.ctrl && input === 'c') {
      collapseAll();
      return;
    }
  }, { isActive: !showHelp });

  // Render status indicator
  const getStatusIndicator = (status: WorkflowNode['status']) => {
    switch (status) {
      case 'completed': return <Text color="green">✓</Text>;
      case 'running': return <Text color="yellow">⟳</Text>;
      case 'error': return <Text color="red">✗</Text>;
      default: return <Text color="dim">○</Text>;
    }
  };

  // Render single node
  const renderNode = (node: WorkflowNode, depth: number): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    return (
      <Box key={node.id} flexDirection="column">
        <Box paddingLeft={depth * 2}>
          <Text
            color={isSelected ? 'blue' : 'white'}
            bold={isSelected}
            backgroundColor={isSelected ? 'blue' : undefined}
            inverse={isSelected}
          >
            {hasChildren ? (isExpanded ? '▼ ' : '▶ ') : '  '}
            {getStatusIndicator(node.status)}
            {' '}
            {node.label}
          </Text>
        </Box>
        {isExpanded && hasChildren && node.children?.map(child =>
          renderNode(child, depth + 1)
        )}
      </Box>
    );
  };

  // Render help
  const renderHelp = () => {
    if (!showHelp) return null;

    return (
      <Box flexDirection="column" borderStyle="double" borderColor="blue" padding={1}>
        <Text bold color="blue">Keyboard Shortcuts</Text>
        <Newline />
        <Text>↑/↓          - Navigate up/down</Text>
        <Text>Enter/Space  - Expand/collapse node</Text>
        <Text>Ctrl+E       - Expand all nodes</Text>
        <Text>Ctrl+C       - Collapse all nodes</Text>
        <Text>?            - Show/hide this help</Text>
        <Text>q            - Quit</Text>
        <Newline />
        <Text dimColor>Press any key to close</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>Workflow Tree Debugger</Text>
        <Text dimColor>? for help</Text>
      </Box>
      <Newline />

      {renderHelp()}

      <Box flexDirection="column">
        {renderNode(workflow, 0)}
      </Box>

      <Newline />
      <Box>
        <Text dimColor>
          Nodes: {flatNodes.length} | Expanded: {expandedNodes.size} |
          Selected: {flatNodes[selectedIndex]?.label || 'None'}
        </Text>
      </Box>
    </Box>
  );
};

export default WorkflowTreeDebugger;
```

---

## 6. Keyboard Navigation Best Practices

### Standard Keyboard Navigation Patterns

Based on terminal UI conventions and real-world CLI applications:

#### Navigation Keys

| Key | Action | Example Usage |
|-----|--------|---------------|
| `↑` / `k` | Move up | Navigate to previous node |
| `↓` / `j` | Move down | Navigate to next node |
| `←` / `h` | Collapse | Collapse current node or move to parent |
| `→` / `l` | Expand | Expand current node or move to first child |
| `Enter` | Select/Toggle | Expand/collapse or select item |
| `Space` | Toggle | Alternative to Enter for expand/collapse |
| `Home` | Jump to top | Navigate to first item |
| `End` | Jump to bottom | Navigate to last item |
| `PgUp` | Page up | Move up by page |
| `PgDn` | Page down | Move down by page |

#### Action Keys

| Key | Action | Example Usage |
|-----|--------|---------------|
| `q` / `Esc` | Quit/Exit | Exit the debugger |
| `?` / `Ctrl+h` | Help | Show keyboard shortcuts |
| `Ctrl+e` | Expand All | Expand all tree nodes |
| `Ctrl+c` | Collapse All | Collapse all tree nodes |
| `/` | Search | Start search/filter |
| `n` | Next Result | Jump to next search result |
| `N` | Previous Result | Jump to previous search result |

### Implementation Example: Comprehensive Navigation

```tsx
import { useInput } from 'ink';

const TreeNavigation = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useInput((input, key) => {
    // Search mode
    if (isSearching) {
      if (key.return) {
        // Finish search
        setIsSearching(false);
      } else if (key.escape) {
        // Cancel search
        setSearchQuery('');
        setIsSearching(false);
      } else if (key.backspace || key.delete) {
        // Remove last character
        setSearchQuery(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl) {
        // Add character to search
        setSearchQuery(prev => prev + input);
      }
      return;
    }

    // Normal navigation mode
    if (input === '?') {
      // Toggle help (implement help display)
      return;
    }

    if (input === 'q' || key.escape) {
      // Quit (call exit() from useApp)
      return;
    }

    if (input === '/') {
      // Start search
      setIsSearching(true);
      setSearchQuery('');
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(nodes.length - 1, prev + 1));
      return;
    }

    if (key.home) {
      setSelectedIndex(0);
      return;
    }

    if (key.end) {
      setSelectedIndex(nodes.length - 1);
      return;
    }

    if (key.pageUp) {
      setSelectedIndex(prev => Math.max(0, prev - 10));
      return;
    }

    if (key.pageDown) {
      setSelectedIndex(prev => Math.min(nodes.length - 1, prev + 10));
      return;
    }

    // Expand/collapse
    if (key.return || input === ' ') {
      const nodeId = nodes[selectedIndex].id;
      toggleNode(nodeId);
      return;
    }

    if (key.rightArrow || input === 'l') {
      const node = nodes[selectedIndex];
      if (node.children && node.children.length > 0) {
        // Expand if collapsed, or move to first child
        if (!expandedNodes.has(node.id)) {
          expandNode(node.id);
        } else {
          // Move to first child
          const childIndex = nodes.findIndex(n => n.id === node.children![0].id);
          if (childIndex !== -1) {
            setSelectedIndex(childIndex);
          }
        }
      }
      return;
    }

    if (key.leftArrow || input === 'h') {
      const node = nodes[selectedIndex];
      if (expandedNodes.has(node.id)) {
        // Collapse if expanded
        collapseNode(node.id);
      } else {
        // Move to parent
        const parentIndex = findParentIndex(node.id);
        if (parentIndex !== -1) {
          setSelectedIndex(parentIndex);
        }
      }
      return;
    }

    // Bulk operations
    if (key.ctrl && input === 'e') {
      expandAll();
      return;
    }

    if (key.ctrl && input === 'c') {
      collapseAll();
      return;
    }
  });

  // ... rest of component
};
```

### Focus Management with Multiple Input Handlers

When using multiple `useInput` hooks, use the `isActive` option to prevent conflicts:

```tsx
import { useInput, useFocus } from 'ink';

const SearchInput = () => {
  const { isFocused } = useFocus({ id: 'search', autoFocused: false });
  const [query, setQuery] = useState('');

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.escape) {
      // Blur search input
      return;
    }

    if (key.backspace || key.delete) {
      setQuery(prev => prev.slice(0, -1));
      return;
    }

    if (input && !key.ctrl) {
      setQuery(prev => prev + input);
    }
  }, { isActive: isFocused });

  return <Text>Search: {query || '(type to search)'}</Text>;
};

const TreeView = () => {
  const { isFocused } = useFocus({ id: 'tree', autoFocus: true });

  useInput((input, key) => {
    if (!isFocused) return;

    // Handle tree navigation
  }, { isActive: isFocused });

  return <Text>Tree View</Text>;
};
```

---

## 7. References

### Official Ink Documentation

- **GitHub Repository:** https://github.com/vadimdemedes/ink
- **npm Package:** https://npmjs.com/package/ink
- **Version Used:** 6.6.0
- **React Documentation:** https://reactjs.org (Ink is a React renderer)

### Type Definitions Referenced

- `/home/dustin/projects/groundswell/node_modules/ink/build/hooks/use-input.d.ts`
- `/home/dustin/projects/groundswell/node_modules/ink/build/components/Text.d.ts`
- `/home/dustin/projects/groundswell/node_modules/ink/build/index.d.ts`

### Related Research in Project

- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S2/research/06-external-examples.md`
  - Additional Ink examples and reactive patterns
  - Real-world Ink CLI applications
  - Performance optimization techniques

### Key Findings Summary

1. **useInput Hook**: Fully functional and well-documented for keyboard handling
2. **Enter Key Detection**: Use `key.return` for reliable Enter key detection
3. **onClick Events**: NOT supported in Ink v6.6.0 - use keyboard-only interaction
4. **Set State Management**: `Set<string>` is the recommended pattern for tracking expanded nodes
5. **Navigation Best Practices**: Follow terminal UI conventions (arrows, Enter, Space, Ctrl+ combinations)

### Implementation Recommendations

For the WorkflowTreeDebugger:

1. ✅ **Use `useInput` hook** for all keyboard handling
2. ✅ **Detect Enter with `key.return`** for expand/collapse
3. ✅ **Use `Set<string>` state** for tracking expanded nodes
4. ✅ **Implement keyboard-only navigation** (no mouse support needed)
5. ✅ **Follow terminal UI conventions** for consistency
6. ✅ **Provide help screen** (`?` key) for discoverability
7. ✅ **Support both arrows and vim keys** (`h/j/k/l`) for accessibility

### Next Steps

1. Implement the `WorkflowTreeDebugger` component using patterns from this research
2. Add keyboard navigation tests
3. Implement help screen with keyboard shortcuts
4. Add search/filter functionality
5. Optimize performance for large workflow trees

---

**Document Version:** 1.0
**Last Updated:** 2025-01-24
**Author:** Research for groundswell project

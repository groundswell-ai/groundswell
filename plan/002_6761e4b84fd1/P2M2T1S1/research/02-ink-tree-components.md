# Ink Tree Components and Interactive CLI Patterns

## Executive Summary

Research findings for building an interactive workflow tree debugger using Ink. While there are no dedicated Ink tree components available, there are excellent building blocks and patterns available.

**Key Finding**: The best approach is to build a custom tree component using `@inkjs/ui` components (particularly `Select`/`MultiSelect`) and Ink's `useInput()` hook for keyboard navigation.

---

## 1. Existing Libraries

### 1.1 Official Ink UI Components

**@inkjs/ui** (v2.0.0) - Official component collection
```bash
npm install @inkjs/ui
```

**Key Components**:
- `Select` - Scrollable list with arrow key navigation
- `MultiSelect` - Multiple selection with checkboxes
- `TextInput` - Single-line input with autocomplete
- `Spinner` - Loading indicator
- `ProgressBar` - Progress tracking
- `Badge` - Status indicators
- `StatusMessage` - Longer status explanations
- `Alert` - Important messages
- `UnorderedList` - Nested lists (supports recursion!)
- `OrderedList` - Numbered nested lists

**Repository**: https://github.com/vadimdemedes/ink-ui

### 1.2 Specialized Select Components

**ink-select-input** (v6.2.0)
```bash
npm install ink-select-input
```
- Single-select with arrow key navigation
- Supports j/k keys (vim-style)
- Number key shortcuts
- Custom indicator and item components
- `limit` prop for virtualization

**Repository**: https://github.com/vadimdemedes/ink-select-input

**ink-multi-select** (v2.0.0)
```bash
npm install ink-multi-select
```
- Multiple selection with checkboxes
- Based on ink-select-input
- Controlled/uncontrolled modes
- Space to toggle selection

**Repository**: https://github.com/karaggeorge/ink-multi-select

### 1.3 Tree Visualization Libraries (Non-Ink)

**cli-tree** (v0.0.1)
```bash
npm install cli-tree
```
- Simple tree visualization
- Box-drawing characters
- Read-only display
- No interactivity

**Repository**: https://github.com/morishitter/cli-tree

**terminal-tree** (v0.0.3)
```bash
npm install terminal-tree
```
- JSON object visualization
- Symbol/highlight options
- Read-only display

**Repository**: https://github.com/zaftzaft/terminal-tree

---

## 2. Code Examples

### 2.1 Basic Ink Select with Navigation

```jsx
import React, {useState} from 'react';
import {render, Text} from 'ink';
import Select from 'ink-select-input';

const Demo = () => {
  const handleSelect = (item) => {
    console.log('Selected:', item);
  };

  const items = [
    { label: 'First', value: 'first' },
    { label: 'Second', value: 'second' },
    { label: 'Third', value: 'third' }
  ];

  return <Select items={items} onSelect={handleSelect} />;
};

render(<Demo />);
```

**Navigation**: Arrow up/down, j/k, number keys, Enter to select

### 2.2 Custom Keyboard Navigation with useInput()

```jsx
import React, {useState, useEffect} from 'react';
import {render, Text, Box, useInput} from 'ink';

const TreeNavigator = () => {
  const [focusedNode, setFocusedNode] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  useInput((input, key) => {
    if (key.upArrow) {
      setFocusedNode(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setFocusedNode(prev => Math.min(nodes.length - 1, prev + 1));
    } else if (key.return) {
      // Toggle expand/collapse
      setExpandedNodes(prev => {
        const next = new Set(prev);
        if (next.has(focusedNode)) {
          next.delete(focusedNode);
        } else {
          next.add(focusedNode);
        }
        return next;
      });
    } else if (key.escape) {
      process.exit(0);
    }
  });

  const nodes = [
    { id: 1, label: 'Node 1', children: [
      { id: 2, label: 'Child 1.1' },
      { id: 3, label: 'Child 1.2' }
    ]},
    { id: 4, label: 'Node 2', children: [
      { id: 5, label: 'Child 2.1' }
    ]}
  ];

  return (
    <Box flexDirection="column">
      <Text>Arrow keys: navigate | Enter: expand/collapse | Esc: exit</Text>
      <Box flexDirection="column" marginTop={1}>
        {nodes.map((node, index) => (
          <TreeNode
            key={node.id}
            node={node}
            isFocused={focusedNode === index}
            isExpanded={expandedNodes.has(node.id)}
          />
        ))}
      </Box>
    </Box>
  );
};

const TreeNode = ({ node, isFocused, isExpanded }) => {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isFocused ? 'green' : 'white'}>
          {isExpanded ? '▼' : '▶'} {node.label}
        </Text>
      </Box>
      {isExpanded && node.children && (
        <Box paddingLeft={2} flexDirection="column">
          {node.children.map(child => (
            <Text key={child.id}>  └─ {child.label}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

render(<TreeNavigator />);
```

### 2.3 Recursive Tree with Expand/Collapse

```jsx
import React, {useState} from 'react';
import {render, Text, Box} from 'ink';

const TreeView = ({ data, level = 0 }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box flexDirection="column">
      <Box paddingLeft={level * 2}>
        <Text
          color="cyan"
          bold
          onPress={() => setExpanded(!expanded)}
        >
          {data.children ? (expanded ? '▼ ' : '▶ ') : '  '}
          {data.label}
        </Text>
      </Box>
      {expanded && data.children && (
        <Box flexDirection="column">
          {data.children.map(child => (
            <TreeView
              key={child.id}
              data={child}
              level={level + 1}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

// Usage
const treeData = {
  id: 'root',
  label: 'Root Workflow',
  children: [
    {
      id: '1',
      label: 'Task 1',
      children: [
        { id: '1-1', label: 'Subtask 1.1' },
        { id: '1-2', label: 'Subtask 1.2' }
      ]
    },
    {
      id: '2',
      label: 'Task 2',
      children: [
        { id: '2-1', label: 'Subtask 2.1' }
      ]
    }
  ]
};

render(<TreeView data={treeData} />);
```

### 2.4 Using @inkjs/ui Select Component

```jsx
import React, {useState} from 'react';
import {render, Text, Box} from 'ink';
import {Select} from '@inkjs/ui';

const WorkflowTree = () => {
  const [selected, setSelected] = useState(null);

  // Flatten tree for Select component
  const flattenTree = (node, path = []) => {
    const currentPath = [...path, node.label];
    const items = [{
      label: '  '.repeat(path.length) + '└─ ' + node.label,
      value: node.id,
      path: currentPath
    }];

    if (node.children) {
      node.children.forEach(child => {
        items.push(...flattenTree(child, currentPath));
      });
    }

    return items;
  };

  const treeData = {
    id: 'root',
    label: 'Root Workflow',
    children: [
      { id: '1', label: 'Task 1', children: [
        { id: '1-1', label: 'Subtask 1.1' },
        { id: '1-2', label: 'Subtask 1.2' }
      ]},
      { id: '2', label: 'Task 2', children: [
        { id: '2-1', label: 'Subtask 2.1' }
      ]}
    ]
  };

  const options = flattenTree(treeData);

  return (
    <Box flexDirection="column">
      <Text bold>Workflow Tree Debugger</Text>
      <Text dimColor>Use arrow keys to navigate, Enter to select</Text>
      <Box marginTop={1}>
        <Select
          options={options}
          onChange={setSelected}
        />
      </Box>
      {selected && (
        <Box marginTop={1}>
          <Text>Selected: {selected}</Text>
        </Box>
      )}
    </Box>
  );
};

render(<WorkflowTree />);
```

### 2.5 Advanced Pattern: Virtual Scrolling for Large Trees

```jsx
import React, {useState, useMemo} from 'react';
import {render, Text, Box} from 'ink';
import {useInput} from 'ink';

const VirtualizedTree = ({ data }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const pageSize = 20; // Number of visible items

  // Flatten tree to array
  const flatNodes = useMemo(() => {
    const result = [];
    const flatten = (node, level = 0, expanded = new Set()) => {
      result.push({ ...node, level, visible: true });

      if (node.children && expanded.has(node.id)) {
        node.children.forEach(child => flatten(child, level + 1, expanded));
      }
    };
    flatten(data);
    return result;
  }, [data]);

  // Virtual slice
  const visibleNodes = flatNodes.slice(scrollTop, scrollTop + pageSize);

  useInput((input, key) => {
    if (key.upArrow) {
      setFocusedIndex(prev => {
        const next = Math.max(0, prev - 1);
        if (next < scrollTop) setScrollTop(next);
        return next;
      });
    } else if (key.downArrow) {
      setFocusedIndex(prev => {
        const next = Math.min(flatNodes.length - 1, prev + 1);
        if (next >= scrollTop + pageSize) setScrollTop(next - pageSize + 1);
        return next;
      });
    }
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>Showing {visibleNodes.length} of {flatNodes.length} nodes</Text>
      {visibleNodes.map((node, index) => (
        <Box key={node.id} paddingLeft={node.level * 2}>
          <Text color={focusedIndex === scrollTop + index ? 'green' : 'white'}>
            {focusedIndex === scrollTop + index ? '→ ' : '  '}
            {node.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
```

---

## 3. Expand/Collapse Patterns

### 3.1 State Management Pattern

```jsx
const [expandedNodes, setExpandedNodes] = useState(new Set());

const toggleNode = (nodeId) => {
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

// Usage
<TreeNode
  isExpanded={expandedNodes.has(node.id)}
  onToggle={() => toggleNode(node.id)}
/>
```

### 3.2 Recursive Expand/Collapse

```jsx
const toggleAll = (node, expand) => {
  const set = new Set(expand ? [node.id] : []);

  if (node.children) {
    node.children.forEach(child => {
      if (expand) {
        set.add(child.id);
        if (child.children) {
          toggleAll(child, expand).forEach(id => set.add(id));
        }
      }
    });
  }

  return set;
};

// Expand all
setExpandedNodes(toggleAll(rootNode, true));

// Collapse all
setExpandedNodes(toggleAll(rootNode, false));
```

### 3.3 Visual Indicators

```jsx
const ExpandIndicator = ({ isExpanded, hasChildren }) => {
  if (!hasChildren) return <Text>  </Text>;
  return (
    <Text color={isExpanded ? 'yellow' : 'gray'}>
      {isExpanded ? '▼' : '▶'}
    </Text>
  );
};
```

---

## 4. Keyboard Navigation Patterns

### 4.1 Basic Navigation

```jsx
useInput((input, key) => {
  if (key.upArrow) {
    // Move up
  } else if (key.downArrow) {
    // Move down
  } else if (key.leftArrow) {
    // Collapse or move to parent
  } else if (key.rightArrow) {
    // Expand or move to first child
  } else if (key.return) {
    // Select or toggle expand
  } else if (key.escape) {
    // Exit or cancel
  }
});
```

### 4.2 Vim-Style Navigation

```jsx
useInput((input, key) => {
  if (input === 'k') {
    // Move up
  } else if (input === 'j') {
    // Move down
  } else if (input === 'h') {
    // Collapse or move to parent
  } else if (input === 'l') {
    // Expand or move to first child
  } else if (input === 'o') {
    // Toggle expand/collapse
  } else if (input === 'q') {
    // Quit
  }
});
```

### 4.3 Focus Management with useFocus

```jsx
import {useFocus} from 'ink';

const TreeNode = ({ node }) => {
  const {isFocused} = useFocus();

  useInput((input, key) => {
    if (!isFocused) return;

    // Handle input only when focused
  });

  return (
    <Text color={isFocused ? 'green' : 'white'}>
      {node.label}
    </Text>
  );
};
```

---

## 5. Selected/Focused Node Patterns

### 5.1 Single Selection

```jsx
const [selectedNode, setSelectedNode] = useState(null);

const TreeNode = ({ node, isSelected, onSelect }) => {
  return (
    <Box>
      <Text
        backgroundColor={isSelected ? 'green' : undefined}
        color={isSelected ? 'black' : 'white'}
        onPress={() => onSelect(node)}
      >
        {node.label}
      </Text>
    </Box>
  );
};
```

### 5.2 Visual Focus Indicator

```jsx
const FocusIndicator = ({ isFocused }) => {
  return (
    <Text color={isFocused ? 'green' : 'gray'}>
      {isFocused ? '→' : ' '}
    </Text>
  );
};

// Usage
<Box>
  <FocusIndicator isFocused={isFocused} />
  <Text>{node.label}</Text>
</Box>
```

### 5.3 Multi-Selection Pattern

```jsx
const [selectedNodes, setSelectedNodes] = useState(new Set());

const toggleSelection = (nodeId) => {
  setSelectedNodes(prev => {
    const next = new Set(prev);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    return next;
  });
};

// Usage
<Text
  backgroundColor={selectedNodes.has(node.id) ? 'blue' : undefined}
  onPress={() => toggleSelection(node.id)}
>
  {node.label}
</Text>
```

---

## 6. Performance Considerations for Large Trees

### 6.1 Virtual Scrolling

```jsx
// Only render visible nodes
const visibleNodes = useMemo(() => {
  return allNodes.slice(scrollTop, scrollTop + pageSize);
}, [allNodes, scrollTop, pageSize]);
```

### 6.2 Memoization

```jsx
const TreeNode = React.memo(({ node, isExpanded, onToggle }) => {
  return (
    <Box flexDirection="column">
      <Text onPress={onToggle}>
        {isExpanded ? '▼' : '▶'} {node.label}
      </Text>
      {isExpanded && node.children && (
        <Box paddingLeft={2}>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              isExpanded={expandedNodes.has(child.id)}
              onToggle={() => onToggle(child.id)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
});
```

### 6.3 Lazy Loading

```jsx
const [loadedNodes, setLoadedNodes] = useState(new Set(['root']));

const loadNodeChildren = async (nodeId) => {
  // Fetch children from API or compute
  const children = await fetchChildren(nodeId);
  setLoadedNodes(prev => new Set([...prev, nodeId]));
  return children;
};
```

### 6.4 Incremental Rendering

```jsx
const [visibleCount, setVisibleCount] = useState(100);

useEffect(() => {
  const interval = setInterval(() => {
    setVisibleCount(prev => Math.min(totalNodes, prev + 50));
  }, 100);

  return () => clearInterval(interval);
}, [totalNodes]);
```

---

## 7. Virtual Scrolling Solutions

### 7.1 No Native Virtual Scrolling

**Finding**: Ink does not have built-in virtual scrolling. However, the `limit` prop in `ink-select-input` provides basic pagination.

```jsx
<Select
  items={items}
  limit={20} // Only show 20 items at a time
/>
```

### 7.2 Manual Virtual Scrolling Implementation

```jsx
const VirtualScrollList = ({ items, pageSize = 20 }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setFocusedIndex(prev => {
        const next = Math.max(0, prev - 1);
        if (next < scrollTop) setScrollTop(next);
        return next;
      });
    } else if (key.downArrow) {
      setFocusedIndex(prev => {
        const next = Math.min(items.length - 1, prev + 1);
        if (next >= scrollTop + pageSize) {
          setScrollTop(next - pageSize + 1);
        }
        return next;
      });
    }
  });

  const visibleItems = items.slice(scrollTop, scrollTop + pageSize);

  return (
    <Box flexDirection="column">
      <Text dimColor>
        Showing {scrollTop + 1}-{Math.min(scrollTop + pageSize, items.length)} of {items.length}
      </Text>
      {visibleItems.map((item, index) => (
        <Text
          key={item.id}
          color={focusedIndex === scrollTop + index ? 'green' : 'white'}
        >
          {focusedIndex === scrollTop + index ? '→ ' : '  '}
          {item.label}
        </Text>
      ))}
    </Box>
  );
};
```

### 7.3 Performance Benchmarks

Based on npm package research and Ink patterns:
- **Small trees (< 100 nodes)**: No virtualization needed
- **Medium trees (100-1000 nodes)**: Manual virtual scrolling recommended
- **Large trees (1000+ nodes)**: Implement virtual scrolling + lazy loading

---

## 8. Recommended Approach for Workflow Tree Debugger

### 8.1 Architecture

```jsx
import React, {useState, useMemo} from 'react';
import {render, Box, Text, useInput} from 'ink';

const WorkflowTreeDebugger = ({ workflowData }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [focusedNode, setFocusedNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [view, setView] = useState('tree'); // 'tree' | 'details' | 'events'

  // Flatten tree for navigation
  const flatNodes = useMemo(() => {
    const result = [];
    const flatten = (node, level = 0, parentPath = []) => {
      const path = [...parentPath, node.id];
      result.push({
        ...node,
        level,
        path,
        hasChildren: Boolean(node.children?.length)
      });

      if (node.children) {
        node.children.forEach(child => flatten(child, level + 1, path));
      }
    };
    flatten(workflowData);
    return result;
  }, [workflowData]);

  useInput((input, key) => {
    if (key.upArrow) {
      // Navigate up
    } else if (key.downArrow) {
      // Navigate down
    } else if (key.return) {
      // Toggle expand/collapse or select
    } else if (key.leftArrow) {
      // Collapse
    } else if (key.rightArrow) {
      // Expand
    } else if (input === 'd') {
      // Show details
      setView('details');
    } else if (input === 'e') {
      // Show events
      setView('events');
    } else if (input === 't') {
      // Back to tree
      setView('tree');
    } else if (key.escape || input === 'q') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text bold>Workflow Tree Debugger</Text>
        <Text dimColor>
          ↑↓: navigate | Enter: select | d: details | e: events | q: quit
        </Text>
      </Box>

      {view === 'tree' && (
        <TreeView
          nodes={flatNodes}
          expandedNodes={expandedNodes}
          focusedNode={focusedNode}
          selectedNode={selectedNode}
          onToggleExpand={setExpandedNodes}
          onFocus={setFocusedNode}
          onSelect={setSelectedNode}
        />
      )}

      {view === 'details' && selectedNode && (
        <NodeDetails node={selectedNode} onBack={() => setView('tree')} />
      )}

      {view === 'events' && selectedNode && (
        <NodeEvents node={selectedNode} onBack={() => setView('tree')} />
      )}
    </Box>
  );
};
```

### 8.2 Component Structure

```
WorkflowTreeDebugger
├── Header
├── TreeView
│   ├── TreeNode (recursive)
│   │   ├── ExpandIndicator
│   │   ├── NodeLabel
│   │   └── NodeStatus
│   └── VirtualScroller
├── DetailsPanel
└── EventsPanel
```

### 8.3 State Management

```jsx
const state = {
  // Tree structure
  root: workflowData,

  // UI state
  expandedNodes: Set<nodeId>,
  focusedNode: nodeId,
  selectedNode: nodeId,

  // View state
  currentView: 'tree' | 'details' | 'events',

  // Performance
  scrollTop: number,
  pageSize: 20,

  // Filters
  filterByStatus: 'all' | 'running' | 'completed' | 'failed',
  searchQuery: string
};
```

---

## 9. Implementation Checklist

- [ ] Install dependencies: `npm install ink @inkjs/ui`
- [ ] Create recursive TreeNode component
- [ ] Implement expand/collapse state management
- [ ] Add keyboard navigation with useInput()
- [ ] Implement focus management
- [ ] Add visual indicators (arrows, colors, status)
- [ ] Implement node selection
- [ ] Add details panel for selected nodes
- [ ] Add events viewer for workflow events
- [ ] Implement virtual scrolling for large trees
- [ ] Add search/filter functionality
- [ ] Add status indicators (running, completed, failed)
- [ ] Implement error display
- [ ] Add keyboard shortcuts help
- [ ] Test with 1000+ node trees

---

## 10. References and Resources

### Official Documentation
- **Ink**: https://github.com/vadimdemedes/ink
- **@inkjs/ui**: https://github.com/vadimdemedes/ink-ui
- **ink-select-input**: https://github.com/vadimdemedes/ink-select-input
- **ink-multi-select**: https://github.com/karaggeorge/ink-multi-select

### Community Examples
- **Ink Examples**: https://github.com/vadimdemedes/ink/tree/master/examples
- **create-ink-app**: https://github.com/vadimdemedes/create-ink-app

### Related Libraries
- **cli-tree**: https://github.com/morishitter/cli-tree
- **terminal-tree**: https://github.com/zaftzaft/terminal-tree

### Keyboard Navigation Reference
- Vim-style: h/j/k/l for navigation
- Arrow keys: ↑/↓ for navigate, ←/→ for expand/collapse
- Enter: Select/toggle
- Escape/q: Quit
- d: Details view
- e: Events view

### Performance Tips
- Use React.memo for TreeNode components
- Implement virtual scrolling for 100+ nodes
- Use useMemo for expensive computations
- Lazy load child nodes
- Debounce search/filter operations

---

## 11. Next Steps

1. **Prototype**: Build a basic tree view with expand/collapse
2. **Navigation**: Add keyboard navigation with useInput()
3. **Virtual Scrolling**: Implement for large datasets
4. **Details View**: Add node details and events viewer
5. **Polish**: Add colors, status indicators, and help text
6. **Test**: Test with 1000+ node workflow trees
7. **Optimize**: Profile and optimize performance

---

## Conclusion

While there are no dedicated Ink tree components, the combination of:
- `@inkjs/ui` Select/MultiSelect components
- Ink's `useInput()` hook
- React patterns (memo, useMemo, useState)
- Manual virtual scrolling implementation

Provides all the building blocks needed to create an interactive, performant workflow tree debugger.

The key is to start with a simple recursive tree component and add features incrementally: navigation, selection, virtual scrolling, and finally the details/events views.

# Tree Indentation and Branch Connector Patterns

## Overview

This document researches tree indentation and branch connector patterns for replicating the `toTreeString()` rendering in Ink (React for CLI). It covers the exact logic from the existing implementation, Ink rendering equivalents, ASCII tree patterns, and code examples for proper tree connector logic.

## 1. Existing renderTree() Function Analysis

### Location
**File:** `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` (lines 217-245)

### Exact Logic Breakdown

```typescript
private renderTree(
  node: WorkflowNode,
  prefix: string,
  isLast: boolean,
  isRoot: boolean
): string {
  let result = '';

  // Status symbol and color indicator
  const statusSymbol = STATUS_SYMBOLS[node.status] || '?';
  const nodeInfo = `${statusSymbol} ${node.name} [${node.status}]`;

  if (isRoot) {
    result += nodeInfo + '\n';
  } else {
    const connector = isLast ? '└── ' : '├── ';
    result += prefix + connector + nodeInfo + '\n';
  }

  // Render children
  const childCount = node.children.length;
  node.children.forEach((child, index) => {
    const isLastChild = index === childCount - 1;
    const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
    result += this.renderTree(child, childPrefix, isLastChild, false);
  });

  return result;
}
```

### Key Logic Elements

#### 1.1 Connector Selection
- **Last child:** `└── ` (U+2514 U+2500 U+2500)
- **Non-last child:** `├── ` (U+251C U+2500 U+2500)
- **Root node:** No connector (just the node name)

```typescript
const connector = isLast ? '└── ' : '├── ';
```

#### 1.2 Prefix Calculation Based on Depth

The prefix accumulates as we traverse deeper:

- **Root level:** Empty string `''`
- **Child of last node:** Parent prefix + 4 spaces (`'    '`)
- **Child of non-last node:** Parent prefix + `│   ` (vertical bar + 3 spaces)

```typescript
const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
```

#### 1.3 isLast Handling

The `isLast` parameter determines:
1. Which connector to use for the current node
2. How much indentation to provide for its children

```typescript
const isLastChild = index === childCount - 1;
```

#### 1.4 Example Output Structure

```
✓ RootNode [completed]
├── ○ Child1 [idle]
│   ├── ○ Grandchild1.1 [idle]
│   └── ○ Grandchild1.2 [idle]
└── ✓ Child2 [completed]
    └── ✓ Grandchild2.1 [completed]
```

### Unicode Box Drawing Characters Used

| Character | Unicode | Description | Usage |
|-----------|---------|-------------|-------|
| `│` | U+2502 | Box Drawings Light Vertical | Vertical line for non-last branches |
| `├` | U+251C | Box Drawings Light Vertical and Right | Branch connector for non-last children |
| `└` | U+2514 | Box Drawings Light Up and Right | Branch connector for last children |
| `─` | U+2500 | Box Drawings Light Horizontal | Horizontal line in connectors |

## 2. Ink Tree Rendering Equivalents

### 2.1 Basic Approach: Static Text Rendering

The simplest approach is to use the existing `toTreeString()` method and display it in Ink:

```typescript
import { Box, Text } from 'ink';

const WorkflowTreeView = ({ debugger }: { debugger: WorkflowTreeDebugger }) => {
  return (
    <Box flexDirection="column">
      <Text>{debugger.toTreeString()}</Text>
    </Box>
  );
};
```

**Advantages:**
- Reuses existing, tested logic
- Minimal code changes
- Exact visual match

**Disadvantages:**
- Not reactive (requires re-render on state changes)
- Can't interact with individual nodes

### 2.2 Reactive Approach: Component-Based Tree

For a fully reactive implementation, recreate the tree logic using Ink components:

```typescript
import React from 'react';
import { Box, Text } from 'ink';

interface TreeNodeProps {
  node: WorkflowNode;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
}

const STATUS_COLORS = {
  idle: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
  cancelled: 'red',
};

const TreeNode = ({ node, prefix = '', isLast = true, isRoot = true }: TreeNodeProps) => {
  const statusSymbol = {
    idle: '○',
    running: '◐',
    completed: '✓',
    failed: '✗',
    cancelled: '⊘',
  }[node.status] || '?';

  const connector = isLast ? '└── ' : '├── ';
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  return (
    <Box flexDirection="column">
      <Box>
        {!isRoot && (
          <>
            <Text dimColor>{prefix}</Text>
            <Text dimColor>{connector}</Text>
          </>
        )}
        <Text color={STATUS_COLORS[node.status]}>{statusSymbol}</Text>
        <Text> </Text>
        <Text>{node.name}</Text>
        <Text dimColor> [{node.status}]</Text>
      </Box>
      {node.children.map((child, index) => (
        <TreeNode
          key={child.id}
          node={child}
          prefix={childPrefix}
          isLast={index === node.children.length - 1}
          isRoot={false}
        />
      ))}
    </Box>
  );
};
```

### 2.3 Ink Layout Considerations

#### flexDirection="column"
Essential for vertical stacking of tree nodes:

```typescript
<Box flexDirection="column">
  {/* Nodes stack vertically */}
</Box>
```

#### Text dimColor
Use for less prominent elements like connectors:

```typescript
<Text dimColor>│   </Text>
```

#### No explicit indentation needed
Unlike the string-based approach, Ink handles layout through components. However, for tree connectors, we still use the exact same prefix strings.

## 3. ASCII Tree Patterns

### 3.1 Standard Tree Drawing Pattern

The most common pattern in CLI tools uses a 4-column grid:

```
Column 0-3:   Prefix (│ or spaces)
Column 4-6:   Connector (├── or └──)
Column 7+:    Node content
```

### 3.2 Examples from Popular CLIs

#### git tree (git log --graph)
```
* 4bd3db8 feat: add Ink library integration
* 0a7bb62 feat: complete WorkflowTreeDebugger
* 0eba88a feat: complete event persistence
```

#### npm ls (dependency tree)
```
├─┬ package@1.0.0
│ ├── dependency1@^1.0.0
│ └── dependency2@^2.0.0
```

#### tree command
```
.
├── CHANGELOG.md
├── src
│   ├── core
│   └── debugger
└── tests
```

### 3.3 Pattern Variations

#### Variation A: Compact (2-space indent)
```
root
├─ child1
│  └─ grandchild
└─ child2
```

#### Variation B: Standard (4-space indent, used in this project)
```
root
├── child1
│   └── grandchild
└── child2
```

#### Variation C: Extended (8-space indent)
```
root
├── child1
│       └── grandchild
└── child2
```

**Our implementation uses Variation B (4-space indent).**

## 4. Test the Hello-World Prototype

### 4.1 Existing Prototype Analysis

**File:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/prototype/cli.tsx`

The prototype uses a simplified tree rendering approach:

```typescript
const WorkflowTree = ({ node, depth = 0 }: { node: WorkflowNode; depth?: number }) => {
  const indent = '  '.repeat(depth);
  const branch = depth > 0 ? '├─ ' : '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text dimColor>{branch}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={node.status === 'failed' ? 'red' : 'white'}>
          {node.label}
        </Text>
      </Box>
      {node.children?.map((child) => (
        <WorkflowTree key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
};
```

### 4.2 Prototype vs renderTree() Comparison

| Aspect | Prototype | renderTree() |
|--------|-----------|--------------|
| Indentation | `'  '.repeat(depth)` | `prefix + (isLast ? '    ' : '│   ')` |
| Connector | Always `├─ ` | `├── ` or `└── ` based on isLast |
| Vertical lines | None | `│` for non-last branches |
| isLast handling | Not implemented | Fully implemented |
| Visual accuracy | ~60% | 100% |

### 4.3 Key Differences

1. **No vertical continuation lines:** The prototype doesn't show `│` to connect siblings
2. **No last-child distinction:** All children use `├─` instead of `└──` for the last
3. **Simpler indentation:** Uses repeated 2-space indent instead of context-aware prefix

## 5. Code Patterns for Ink Implementation

### 5.1 Pattern 1: Direct String Rendering (Recommended for V1)

```typescript
import { Box, Text } from 'ink';

const WorkflowTreeView = ({ debugger }: { debugger: WorkflowTreeDebugger }) => {
  const [tree, setTree] = React.useState(debugger.toTreeString());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTree(debugger.toTreeString());
    }, 100);

    return () => clearInterval(interval);
  }, [debugger]);

  return (
    <Box flexDirection="column">
      <Text bold>Workflow Tree</Text>
      <Newline />
      <Text>{tree}</Text>
    </Box>
  );
};
```

### 5.2 Pattern 2: Component-Based Rendering (Recommended for V2)

```typescript
interface TreeBranchProps {
  prefix: string;
  isLast: boolean;
}

const TreeBranch = ({ prefix, isLast }: TreeBranchProps) => {
  const connector = isLast ? '└── ' : '├── ';
  return (
    <>
      <Text dimColor>{prefix}</Text>
      <Text dimColor>{connector}</Text>
    </>
  );
};

const WorkflowTreeNode = ({
  node,
  prefix = '',
  isLast = true,
  isRoot = true,
}: {
  node: WorkflowNode;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
}) => {
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  return (
    <Box flexDirection="column">
      <Box>
        {!isRoot && <TreeBranch prefix={prefix} isLast={isLast} />}
        <NodeStatus node={node} />
      </Box>
      {node.children.map((child, index) => (
        <WorkflowTreeNode
          key={child.id}
          node={child}
          prefix={childPrefix}
          isLast={index === node.children.length - 1}
          isRoot={false}
        />
      ))}
    </Box>
  );
};
```

### 5.3 Pattern 3: Hybrid (String generation with React re-render)

```typescript
const useWorkflowTree = (debugger: WorkflowTreeDebugger) => {
  const [treeString, setTreeString] = React.useState('');

  React.useEffect(() => {
    const updateTree = () => {
      setTreeString(debugger.toTreeString());
    };

    updateTree();
    const interval = setInterval(updateTree, 100);

    return () => clearInterval(interval);
  }, [debugger]);

  return treeString;
};

const WorkflowTreeDisplay = ({ debugger }: { debugger: WorkflowTreeDebugger }) => {
  const tree = useWorkflowTree(debugger);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        Workflow Tree Debugger
      </Text>
      <Newline />
      <Text>{tree}</Text>
    </Box>
  );
};
```

## 6. Implementation Guidelines

### 6.1 Indentation Spacing

Always use **4 spaces** for each level of indentation:

```typescript
// Correct
'│   '  // vertical bar + 3 spaces = 4 chars
'    '  // 4 spaces

// Incorrect (will misalign)
'│  '   // vertical bar + 2 spaces = 3 chars
'   '   // 3 spaces
```

### 6.2 Connector Width

Connectors are always **4 characters**:

```typescript
├──   // 4 chars
└──   // 4 chars
```

### 6.3 Prefix Calculation Formula

For each child node:

```typescript
childPrefix = parentPrefix + (parentIsLast ? '    ' : '│   ');
```

### 6.4 Special Cases

1. **Root node:** No prefix, no connector
2. **Last child:** Uses `└──` and spaces for children
3. **Non-last child:** Uses `├──` and `│` for children

## 7. Testing Tree Rendering

### 7.1 Unit Test Pattern

```typescript
describe('Tree Indentation', () => {
  it('should render last child with └── connector', () => {
    const tree = createWorkflowTree({
      name: 'root',
      children: [
        { name: 'child1' },
        { name: 'child2' },  // last
      ],
    });

    const output = tree.toTreeString();

    expect(output).toContain('└── child2');
  });

  it('should render non-last child with ├── connector', () => {
    const tree = createWorkflowTree({
      name: 'root',
      children: [
        { name: 'child1' },  // not last
        { name: 'child2' },
      ],
    });

    const output = tree.toTreeString();

    expect(output).toContain('├── child1');
  });

  it('should show vertical line for grandchildren of non-last child', () => {
    const tree = createWorkflowTree({
      name: 'root',
      children: [
        {
          name: 'child1',
          children: [{ name: 'grandchild' }],
        },
        { name: 'child2' },
      ],
    });

    const output = tree.toTreeString();

    expect(output).toContain('│   └── grandchild');
  });

  it('should show spaces for grandchildren of last child', () => {
    const tree = createWorkflowTree({
      name: 'root',
      children: [
        { name: 'child1' },
        {
          name: 'child2',  // last
          children: [{ name: 'grandchild' }],
        },
      ],
    });

    const output = tree.toTreeString();

    // Should be '    ' (4 spaces), not '│   '
    expect(output).toMatch(/└── child2\n    └── grandchild/);
  });
});
```

### 7.2 Visual Regression Test Pattern

```typescript
describe('Tree Visual Output', () => {
  it('should match expected tree structure', () => {
    const tree = createWorkflowTree({
      name: 'Build',
      status: 'running',
      children: [
        {
          name: 'Compile',
          status: 'completed',
          children: [
            { name: 'Parse', status: 'completed' },
            { name: 'Transform', status: 'completed' },
          ],
        },
        {
          name: 'Test',
          status: 'pending',
          children: [
            { name: 'Unit', status: 'pending' },
            { name: 'Integration', status: 'pending' },
          ],
        },
      ],
    });

    const output = tree.toTreeString();

    const expected = `
◐ Build [running]
├── ✓ Compile [completed]
│   ├── ✓ Parse [completed]
│   └── ✓ Transform [completed]
└── ○ Test [pending]
    ├── ○ Unit [pending]
    └── ○ Integration [pending]
`.trim();

    expect(output).toBe(expected);
  });
});
```

## 8. Best Practices Summary

### 8.1 DO
- Use 4-character indentation for each level
- Distinguish between last and non-last children
- Show vertical lines (`│`) for non-last branches
- Use `dimColor` for connectors in Ink
- Test with various tree depths and branching factors

### 8.2 DON'T
- Mix indentation styles (2-space vs 4-space)
- Forget the vertical continuation lines
- Use `├──` for all children (should use `└──` for last)
- Overcomplicate with custom spacing calculations
- Hardcode tree depth limits

## 9. Quick Reference

### Unicode Characters
```
│   U+2502   Vertical line
├   U+251C   Branch (non-last)
└   U+2514   Branch (last)
─   U+2500   Horizontal line
```

### Connector Patterns
```
Non-last:   prefix + '├── ' + nodeInfo
Last:       prefix + '└── ' + nodeInfo
```

### Child Prefix Patterns
```
Non-last parent:  prefix + '│   '
Last parent:      prefix + '    '
Root:             ''
```

### Status Symbols
```
○   idle
◐   running
✓   completed
✗   failed
⊘   cancelled
```

## 10. Implementation Checklist

- [ ] Copy exact renderTree() logic for prefix calculation
- [ ] Use 4-character spacing consistently
- [ ] Implement isLast detection for proper connector selection
- [ ] Add vertical lines (`│`) for non-last branches
- [ ] Test with single node
- [ ] Test with linear chain
- [ ] Test with multiple children
- [ ] Test with deep nesting (5+ levels)
- [ ] Test with mixed completed/failed/running statuses
- [ ] Verify alignment at all depths

## References

- **Source File:** `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` (lines 217-245)
- **Prototype:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/prototype/cli.tsx`
- **Related Research:** `plan/002_6761e4b84fd1/architecture/OBSERVABILITY_PATTERNS_RESEARCH.md`

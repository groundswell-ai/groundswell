# Ink Split-Pane Layouts Research

## Executive Summary

Ink provides flexbox-based layout capabilities through the `<Box>` component, making split-pane layouts straightforward. This research covers how to create a 60/40 split-pane debugger UI with independent scrolling using Ink's layout system.

**Key Findings:**
- Ink uses Yoga (Facebook's flexbox layout engine) for layouts
- `flexDirection="row"` creates horizontal layouts
- Width can be set via percentages (e.g., `"60%"`) or numbers
- **Ink does NOT have a built-in ScrollView component** - scrolling is handled via terminal overflow
- Overflow properties exist (`overflow`, `overflowX`, `overflowY`) but only support `visible` or `hidden`

---

## 1. Box flexDirection="row" Documentation

### TypeScript Definition

From `/home/dustin/projects/groundswell/node_modules/ink/build/components/Box.d.ts`:

```typescript
readonly flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined;
```

### Source Reference

**File:** `/home/dustin/projects/groundswell/node_modules/ink/readme.md`
**Section:** Flexbox > flexDirection
**Lines:** ~650-700

### flexDirection Documentation

```jsx
// Default row layout (items left to right)
<Box flexDirection="row">
  <Box marginRight={1}>
    <Text>X</Text>
  </Box>
  <Text>Y</Text>
</Box>
// Output: X Y

// Row reverse (items right to left)
<Box flexDirection="row-reverse">
  <Text>X</Text>
  <Box marginRight={1}>
    <Text>Y</Text>
  </Box>
</Box>
// Output: Y X

// Column layout (items top to bottom)
<Box flexDirection="column">
  <Text>X</Text>
  <Text>Y</Text>
</Box>
// Output:
// X
// Y

// Column reverse (items bottom to top)
<Box flexDirection="column-reverse">
  <Text>X</Text>
  <Text>Y</Text>
</Box>
// Output:
// Y
// X
```

### Reference URL
- **GitHub Repository:** https://github.com/vadimdemedes/ink
- **README Section:** `flexDirection` under Flexbox properties
- **CSS-Tricks Reference:** https://css-tricks.com/almanac/properties/f/flex-direction/

---

## 2. Creating Split-Pane Layouts in Ink

### Method 1: Using Percentage Widths (Recommended)

```tsx
import { Box, Text } from 'ink';

const SplitPaneDebugger = () => {
  return (
    <Box flexDirection="row" height="100%">
      {/* Left pane: Tree view - 60% width */}
      <Box width="60%" flexDirection="column" paddingRight={1}>
        <Text bold color="cyan">Workflow Tree</Text>
        <Text>Tree content here...</Text>
      </Box>

      {/* Right pane: Node details - 40% width */}
      <Box width="40%" flexDirection="column" borderStyle="single" padding={1}>
        <Text bold color="cyan">Node Details</Text>
        <Text>Details content here...</Text>
      </Box>
    </Box>
  );
};
```

**Output:**
```
Workflow Tree                    │ Node Details
Tree content here...             │ Details content here...
                                 │
```

### Method 2: Using flexGrow for Proportional Widths

```tsx
import { Box, Text } from 'ink';

const SplitPaneDebugger = () => {
  return (
    <Box flexDirection="row" flexGrow={1}>
      {/* Left pane: 60% via flexGrow ratio */}
      <Box flexGrow={3} flexDirection="column" paddingRight={1}>
        <Text bold color="cyan">Workflow Tree</Text>
        <Text>Tree content here...</Text>
      </Box>

      {/* Right pane: 40% via flexGrow ratio */}
      <Box flexGrow={2} flexDirection="column" borderStyle="single" padding={1}>
        <Text bold color="cyan">Node Details</Text>
        <Text>Details content here...</Text>
      </Box>
    </Box>
  );
};
```

**Explanation:** Using `flexGrow={3}` and `flexGrow={2}` creates a 3:2 ratio (60%:40%).

### Method 3: Using Flex Basis

```tsx
const SplitPaneDebugger = () => {
  return (
    <Box flexDirection="row" width="100%">
      {/* Left pane: explicit flexBasis */}
      <Box flexBasis="60%" paddingRight={1}>
        <Text>Tree</Text>
      </Box>

      {/* Right pane: explicit flexBasis */}
      <Box flexBasis="40%">
        <Text>Details</Text>
      </Box>
    </Box>
  );
};
```

---

## 3. Existing Split-Pane Example in Codebase

**File:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/TREE_DEBUGGER_PATTERNS_RESEARCH.md`
**Lines:** 2180-2230

```tsx
function SplitPaneDebugger(debugger_: WorkflowTreeDebugger) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  useEffect(() => {
    const subscription = debugger_.events.subscribe({
      next: () => {
        if (selectedNodeId) {
          setSelectedNode(debugger_.getNode(selectedNodeId) ?? null);
        }
      },
    });
    return () => subscription.unsubscribe();
  }, [debugger_, selectedNodeId]);

  return (
    <Box flexDirection="row">
      {/* Left pane: Tree view */}
      <Box width="50%" flexDirection="column">
        <Text bold>Workflow Tree</Text>
        <Box flexDirection="column">
          {debugger_.toTreeString()
            .split('\n')
            .map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
        </Box>
      </Box>

      {/* Right pane: Node details */}
      <Box width="50%" flexDirection="column" borderStyle="single">
        <Text bold>Node Details</Text>
        {selectedNode ? (
          <Box flexDirection="column">
            <Text>Name: {selectedNode.name}</Text>
            <Text>Status: {selectedNode.status}</Text>
            <Text>ID: {selectedNode.id}</Text>
            <Text>Logs: {selectedNode.logs.length}</Text>
            <Text>Events: {selectedNode.events.length}</Text>
            {selectedNode.stateSnapshot && (
              <Box flexDirection="column">
                <Text bold>State:</Text>
                <Text>{JSON.stringify(selectedNode.stateSnapshot, null, 2)}</Text>
              </Box>
            )}
          </Box>
        ) : (
          <Text dimColor>Select a node to view details</Text>
        )}
      </Box>
    </Box>
  );
}
```

---

## 4. Width Percentages in Ink

### TypeScript Definition

From `/home/dustin/projects/groundswell/node_modules/ink/build/styles.d.ts`:

```typescript
/**
 * Width of the element in spaces. You can also set it as a percentage,
 * which will calculate the width based on the width of the parent element.
 */
readonly width?: number | string;
```

### width vs flexGrow Comparison

| Property | Type | Behavior | Best For |
|----------|------|----------|----------|
| `width="60%"` | string | Fixed 60% of parent | Explicit split-pane layouts |
| `width={60}` | number | Fixed 60 character width | Fixed-size panes |
| `flexGrow={3}` | number | Proportional (3:2 ratio with flexGrow=2) | Responsive layouts |
| `flexBasis="60%"` | string | Initial 60% before flex adjustment | Complex flex layouts |

### Documentation Reference

**File:** `/home/dustin/projects/groundswell/node_modules/ink/readme.md`
**Section:** Dimensions > width

```jsx
<Box width={4}>
  <Text>X</Text>
</Box>
//=> 'X   '

<Box width={10}>
  <Box width="50%">
    <Text>X</Text>
  </Box>
  <Text>Y</Text>
</Box>
//=> 'X    Y'
```

---

## 5. Scrolling in Ink Components

### Critical Finding: No ScrollView Component

**Ink does NOT include a built-in ScrollView component.**

Based on:
- `/home/dustin/projects/groundswell/node_modules/ink/build/index.d.ts` - No ScrollView export
- `/home/dustin/projects/groundswell/node_modules/ink/readme.md` - No ScrollView section

### Available Overflow Properties

```typescript
readonly overflow?: 'visible' | 'hidden';
readonly overflowX?: 'visible' | 'hidden';
readonly overflowY?: 'visible' | 'hidden';
```

### Overflow Behavior

From Ink README (Lines ~900-950):

```jsx
// overflowX - horizontal overflow
<Box overflowX="hidden">
  <Text>Long text that will be clipped</Text>
</Box>

// overflowY - vertical overflow
<Box overflowY="hidden" height={5}>
  <Text>Tall content that will be clipped</Text>
</Box>

// overflow - both directions
<Box overflow="hidden" width={10} height={5}>
  <Text>Content that will be clipped</Text>
</Box>
```

**Important:** Overflow only supports `visible` (default) or `hidden`. There is NO `scroll` value.

### How Terminal Scrolling Works in Ink

Ink relies on the **terminal's native scrolling**:

1. **Terminal Scrolling:** When content exceeds terminal height, the terminal itself scrolls
2. **No Component-Level Scroll:** Ink doesn't provide scrollable regions/panes
3. **Full-Page Rendering:** Ink renders the entire output; the terminal handles overflow

### Workaround for "Scrollable" Panes

Since Ink doesn't support independent scrolling regions, you have these options:

#### Option 1: Pagination

```tsx
const PaginatedTree = ({ nodes }: { nodes: WorkflowNode[] }) => {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const pageCount = Math.ceil(nodes.length / pageSize);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>Page {page + 1} of {pageCount}</Text>
      </Box>
      {nodes
        .slice(page * pageSize, (page + 1) * pageSize)
        .map(node => <Text key={node.id}>{node.name}</Text>)}
      <Box marginTop={1}>
        <Text onPress={() => setPage(Math.max(0, page - 1))}>Prev </Text>
        <Text onPress={() => setPage(Math.min(pageCount - 1, page + 1))}>Next</Text>
      </Box>
    </Box>
  );
};
```

#### Option 2: Virtual Window

```tsx
const VirtualScrollList = ({ items, height }: { items: string[]; height: number }) => {
  const [offset, setOffset] = useState(0);

  return (
    <Box flexDirection="column" height={height} borderStyle="single">
      {items.slice(offset, offset + height).map((item, i) => (
        <Text key={i}>{item}</Text>
      ))}
    </Box>
  );
};
```

#### Option 3: Use External Package

```bash
npm install ink-scroll-list
```

```tsx
import { ScrollList } from 'ink-scroll-list';

const ScrollingPane = () => (
  <ScrollList items={workflowNodes} height={20} />
);
```

---

## 6. Width/Spacing Patterns

### Gap Property (Modern Approach)

```tsx
<Box flexDirection="row" gap={2}>
  <Box width="60%">
    <Text>Left</Text>
  </Box>
  <Box width="40%">
    <Text>Right</Text>
  </Box>
</Box>
```

### Traditional Margin Approach

```tsx
<Box flexDirection="row">
  <Box width="60%" marginRight={1}>
    <Text>Left</Text>
  </Box>
  <Box width="40%">
    <Text>Right</Text>
  </Box>
</Box>
```

### Padding for Internal Spacing

```tsx
<Box width="60%" paddingX={1} paddingY={1}>
  <Text>Content with internal spacing</Text>
</Box>
```

### Border with Padding

```tsx
<Box
  width="40%"
  borderStyle="single"
  borderColor="gray"
  padding={1}
>
  <Text>Bordered content</Text>
</Box>
```

---

## 7. Best Practices for Split-Pane Terminal UIs

### 1. Use Percentage Widths for Responsiveness

```tsx
// ✅ Good - Adapts to terminal size
<Box width="60%" />

// ⚠️ Fixed - May overflow on small terminals
<Box width={80} />
```

### 2. Add Borders to Separate Panes

```tsx
<Box flexDirection="row">
  <Box width="60%" borderStyle="single" borderRight={false}>
    <Text>Tree</Text>
  </Box>
  <Box width="40%" borderStyle="single" borderLeft={false}>
    <Text>Details</Text>
  </Box>
</Box>
```

### 3. Use gap for Consistent Spacing

```tsx
// ✅ Good - Consistent gap
<Box flexDirection="row" gap={1}>
  <Box width="60%" />
  <Box width="40%" />
</Box>

// ⚠️ Verbose - Manual margins
<Box flexDirection="row">
  <Box width="60%" marginRight={1} />
  <Box />
</Box>
```

### 4. Add Visual Separators

```tsx
<Box flexDirection="row">
  <Box width="60%">
    <Text>Tree</Text>
  </Box>
  <Box width={1} backgroundColor="gray" />
  <Box flexGrow={1}>
    <Text>Details</Text>
  </Box>
</Box>
```

### 5. Handle Minimum Widths

```tsx
<Box flexDirection="row">
  <Box width="60%" minWidth={40}>
    <Text>Tree</Text>
  </Box>
  <Box width="40%" minWidth={30}>
    <Text>Details</Text>
  </Box>
</Box>
```

### 6. Column Layout Within Each Pane

```tsx
<Box flexDirection="row" height="100%">
  {/* Left pane */}
  <Box width="60%" flexDirection="column" paddingRight={1}>
    <Box marginBottom={1}>
      <Text bold>Header</Text>
    </Box>
    <Box flexGrow={1}>
      <Text>Content</Text>
    </Box>
  </Box>

  {/* Right pane */}
  <Box width="40%" flexDirection="column">
    <Box marginBottom={1}>
      <Text bold>Header</Text>
    </Box>
    <Box flexGrow={1}>
      <Text>Content</Text>
    </Box>
  </Box>
</Box>
```

---

## 8. Complete Split-Pane Debugger Example

```tsx
#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

interface WorkflowNode {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  children?: WorkflowNode[];
}

const SplitPaneDebugger = ({ workflow }: { workflow: WorkflowNode }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Find selected node
  const findNode = (node: WorkflowNode, id: string): WorkflowNode | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = selectedNodeId ? findNode(workflow, selectedNodeId) : null;

  // Render tree
  const renderTree = (node: WorkflowNode, depth = 0) => {
    const indent = '  '.repeat(depth);
    const isSelected = node.id === selectedNodeId;

    return (
      <Box key={node.id} flexDirection="column">
        <Box
          backgroundColor={isSelected ? 'blue' : undefined}
          paddingLeft={1}
          onPress={() => setSelectedNodeId(node.id)}
        >
          <Text>{indent}</Text>
          <Text color={
            node.status === 'completed' ? 'green' :
            node.status === 'running' ? 'yellow' :
            node.status === 'failed' ? 'red' : 'gray'
          }>
            {node.status === 'completed' ? '✓' :
             node.status === 'running' ? '◉' :
             node.status === 'failed' ? '✗' : '○'}
          </Text>
          <Text> </Text>
          <Text bold={isSelected}>{node.name}</Text>
        </Box>
        {node.children?.map(child => renderTree(child, depth + 1))}
      </Box>
    );
  };

  return (
    <Box flexDirection="row" padding={1}>
      {/* Left Pane: Tree View (60%) */}
      <Box
        width="60%"
        flexDirection="column"
        paddingRight={1}
        borderStyle="single"
        borderRight={false}
        padding={1}
      >
        <Box marginBottom={1}>
          <Text bold color="cyan">Workflow Tree</Text>
        </Box>
        {renderTree(workflow)}
      </Box>

      {/* Right Pane: Node Details (40%) */}
      <Box
        width="40%"
        flexDirection="column"
        borderStyle="single"
        borderLeft={false}
        padding={1}
      >
        <Box marginBottom={1}>
          <Text bold color="cyan">Node Details</Text>
        </Box>
        {selectedNode ? (
          <Box flexDirection="column" gap={1}>
            <Text>
              <Text bold>Name: </Text>
              <Text>{selectedNode.name}</Text>
            </Text>
            <Text>
              <Text bold>Status: </Text>
              <Text color={
                selectedNode.status === 'completed' ? 'green' :
                selectedNode.status === 'running' ? 'yellow' :
                selectedNode.status === 'failed' ? 'red' : 'gray'
              }>
                {selectedNode.status}
              </Text>
            </Text>
            <Text>
              <Text bold>ID: </Text>
              <Text dimColor>{selectedNode.id}</Text>
            </Text>
            <Text>
              <Text bold>Children: </Text>
              <Text>{selectedNode.children?.length || 0}</Text>
            </Text>
          </Box>
        ) : (
          <Box justifyContent="center" alignItems="center" height={10}>
            <Text dimColor>← Select a node to view details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// Example usage
const workflow: WorkflowNode = {
  id: 'root',
  name: 'Build Application',
  status: 'running',
  children: [
    {
      id: 'deps',
      name: 'Install Dependencies',
      status: 'completed',
      children: [
        { id: 'npm', name: 'npm install', status: 'completed' },
        { id: 'audit', name: 'npm audit', status: 'completed' },
      ],
    },
    {
      id: 'lint',
      name: 'Run Linter',
      status: 'running',
      children: [],
    },
  ],
};

render(<SplitPaneDebugger workflow={workflow} />);
```

---

## 9. Summary and Recommendations

### For 60/40 Split-Pane Layout:

**Recommended Approach:**
```tsx
<Box flexDirection="row" width="100%">
  <Box width="60%" flexDirection="column" paddingRight={1}>
    {/* Tree pane */}
  </Box>
  <Box width="40%" flexDirection="column">
    {/* Details pane */}
  </Box>
</Box>
```

### For Independent Scrolling:

**Limitation:** Ink does NOT support independent scrolling regions.

**Workarounds:**
1. **Pagination** - Show chunks of content with prev/next navigation
2. **Virtual window** - Show a sliding window of content
3. **External package** - Use `ink-scroll-list` or similar
4. **Accept terminal scrolling** - Let the whole terminal scroll

### Key Takeaways:

1. ✅ Use `flexDirection="row"` for horizontal split-pane layouts
2. ✅ Use `width="60%"` and `width="40%"` for explicit percentage widths
3. ✅ Use `flexGrow` ratios for proportional widths (e.g., `flexGrow={3}` vs `flexGrow={2}`)
4. ✅ Add `borderStyle` and `padding` for visual separation
5. ✅ Use `gap` property for consistent spacing between panes
6. ⚠️ Ink does NOT have ScrollView - scrolling is terminal-level only
7. ⚠️ Overflow only supports `visible` or `hidden`, not `scroll`

---

## 10. References

### Official Documentation
- **Ink GitHub:** https://github.com/vadimdemedes/ink
- **Ink README:** `/home/dustin/projects/groundswell/node_modules/ink/readme.md`
- **Box Component:** `/home/dustin/projects/groundswell/node_modules/ink/build/components/Box.d.ts`
- **Styles:** `/home/dustin/projects/groundswell/node_modules/ink/build/styles.d.ts`

### Flexbox Reference
- **CSS-Tricks flex-direction:** https://css-tricks.com/almanac/properties/f/flex-direction/
- **CSS-Tricks flex-grow:** https://css-tricks.com/almanac/properties/f/flex-grow/
- **CSS-Tricks flex-basis:** https://css-tricks.com/almanac/properties/f/flex-basis/
- **Yoga Layout:** https://github.com/facebook/yoga

### Codebase Examples
- **Split-Pane Example:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/TREE_DEBUGGER_PATTERNS_RESEARCH.md` (lines 2180-2230)
- **Existing UI Component:** `/home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx`

# Tree Node Expand/Collapse UI Best Practices

> Research on terminal and web interface patterns for tree node expand/collapse interactions.

## Executive Summary

This document compiles best practices for tree node expand/collapse UI patterns from various sources including terminal CLI tools, web interfaces (VS Code), and Unicode standards. It focuses on visual indicators, keyboard interactions, state persistence, and default states.

---

## 1. Visual Indicators

### 1.1 Terminal/CLI Tree Indicators

#### Box Drawing Characters (Unicode)

**Most Common for Tree Structure:**

| Symbol | Unicode | Name | Usage | Example |
|--------|---------|------|-------|---------|
| `│` | U+2502 | Box Drawings Light Vertical | Vertical line continuation | `│   ` (prefix for non-last branches) |
| `├` | U+251C | Box Drawings Light Vertical and Right | Branch connector (non-last) | `├── child` |
| `└` | U+2514 | Box Drawings Light Up and Right | Branch connector (last) | `└── child` |
| `─` | U+2500 | Box Drawings Light Horizontal | Horizontal line | Part of `├──` or `└──` |
| `┬` | U+252C | Box Drawings Light Down and Horizontal | T-junction | Rarely used in trees |

**Expand/Collapse Indicators:**

| Collapsed | Expanded | Unicode | Name | Recommended Use |
|-----------|----------|---------|------|-----------------|
| `▸` | `▾` | U+25B8, U+25BE | Black Small Triangle | **RECOMMENDED** - Modern, compact |
| `▶` | `▼` | U+25B6, U+25BC | Black Triangle | Alternative - more prominent |
| `►` | `◢` | U+25BA, U+25E2 | Triangle variants | Less common |
| `+` | `-` | ASCII | Plus/Minus | **CLASSIC** - Works everywhere |
| `[+]` | `[-]` | ASCII with brackets | Bracketed | Clear semantic meaning |
| `>` | `v` | ASCII | Greater-than/Lowercase v | Minimalist |
| `⯈` | `⯆` | U+2BC8, U+2BC6 | Triangle with bar | Modern, unambiguous |
| `📂` | `📁` | U+1F4C2, U+1F4C1 | Folder emojis | Visual but wide (2 cols) |

#### ASCII-Only Fallback (for legacy terminals)

```
Collapsed: [+], >, [展开]
Expanded:  [-], v, [收起]
```

### 1.2 Web Interface Indicators (VS Code Pattern)

**VS Code File Explorer Standard:**

| State | Symbol | Description |
|-------|--------|-------------|
| Collapsed folder | `▸` (chevron-right) | Right-pointing triangle |
| Expanded folder | `▾` (chevron-down) | Down-pointing triangle |
| File | No chevron | Files are not expandable |

**Folder Icons:**
- Colllosed: `📄` (document) or custom folder icon
- Expanded: `📂` (open folder) or `📁` (folder)

### 1.3 Recommended Symbol Set

**For Groundswell Workflow Tree Debugger:**

```typescript
// Primary recommendation (Unicode triangles)
const COLLAPSED = '▸';  // U+25B8 - Black Right-Pointing Small Triangle
const EXPANDED = '▾';  // U+25BE - Black Down-Pointing Small Triangle

// Fallback for ASCII-only terminals
const COLLAPSED_ASCII = '+';
const EXPANDED_ASCII = '-';

// For branch connectors (existing pattern)
const VERTICAL = '│';      // U+2502
const BRANCH = '├──';      // U+251C + U+2500 + U+2500
const LAST_BRANCH = '└──'; // U+2514 + U+2500 + U+2500
```

---

## 2. Collapsed Placeholders

### 2.1 Standard Placeholder Formats

#### Format A: Count in brackets
```
parent ▾
├── child1
└── child2 ▸ [3 children]
```

#### Format B: Count with ellipsis
```
parent ▾
├── child1
└── child2 ▸ ... 3 items
```

#### Format C: Semantic description
```
parent ▾
├── child1
└── child2 ▸ (3 sub-tasks)
```

#### Format D: Compact count
```
parent ▾
├── child1
└── child2 ▸ 3
```

### 2.2 Real-World Examples

#### npm ls (Dependency Tree)
```
groundswell@0.0.4
├─┬ @anthropic-ai/sdk@0.71.2
│ ├── json-schema-to-ts@3.1.1
│ └── zod@3.25.76 deduped
└─┬ @types/node@20.19.25
│ └── undici-types@6.21.0
```
**Pattern:** Shows count implicitly through indentation, no explicit placeholders.

#### tree command
```
.
├── CHANGELOG.md
├── dist
│   ├── cache
│   ├── core
│   └── debugger
└── src
```
**Pattern:** No placeholders - shows all by default.

#### VS Code (collapsed)
```
📁 src
  📁 core        (3 items)
  📁 debugger    (5 items)
  📁 types       (2 items)
```
**Pattern:** Shows count in parentheses when collapsed.

### 2.3 Recommended Placeholder Format

**For Groundswell Workflow Tree Debugger:**

```typescript
// Format A: Semantic count (RECOMMENDED)
interface TreeNode {
  name: string;
  children: TreeNode[];
  isExpanded: boolean;
}

function renderCollapsedPlaceholder(node: TreeNode): string {
  const childCount = node.children.length;
  if (childCount === 0) return '';

  // Primary format
  return `▾ [${childCount} ${childCount === 1 ? 'child' : 'children'}]`;

  // Alternative formats:
  // return `▾ ... ${childCount} items`;
  // return `▾ (${childCount})`;
}
```

**Visual Examples:**

```
✓ Build Application [running]
├── ✓ Install Dependencies [completed]
│   ├── ✓ npm install [completed]
│   └── ✓ npm audit [completed]
├── ◐ Run Linter [running]
└── ○ Run Tests [idle] ▸ [2 children]

# When collapsed:
✓ Build Application [running]
├── ✓ Install Dependencies [completed] ▸ [2 children]
├── ◐ Run Linter [running]
└── ○ Run Tests [idle] ▸ [2 children]
```

---

## 3. Keyboard Interaction

### 3.1 Standard Keyboard Shortcuts

#### Primary Actions

| Action | Key | Alternative | Description |
|--------|-----|-------------|-------------|
| Toggle expand/collapse | `Enter` | `Space` | Most common pattern |
| Expand | `+` | `→` (right arrow) | Expand current node |
| Collapse | `-` | `←` (left arrow) | Collapse current node |
| Expand all | `*` | `E` | Expand all descendants |
| Collapse all | `/` | `W` | Collapse all descendants |
| Navigate down | `↓` | `j` (vim) | Move to next node |
| Navigate up | `↑` | `k` (vim) | Move to previous node |

#### VS Code File Explorer Shortcuts

| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| Toggle expand/collapse | `Ctrl`+`+` / `Ctrl`+`-` | `Cmd`+`+` / `Cmd`+`-` | Folder focus |
| Expand all | `Ctrl`+`K` `Ctrl`+`]` | `Cmd`+`K` `Cmd`+`]` | Recursive expand |
| Collapse all | `Ctrl`+`K` `Ctrl`+`[` | `Cmd`+`K` `Cmd`+`[` | Recursive collapse |
| Single toggle | `Enter`/`Space` | `Enter`/`Space` | Toggle selection |

#### Terminal CLI Patterns

**git log --graph navigation:**
- Arrow keys for navigation (if pager supports it)
- `q` to quit
- Space to page down

**Ink useInput hook patterns:**
```typescript
import {useInput} from 'ink';

const TreeView = () => {
  useInput((input, key) => {
    // Toggle expand/collapse
    if (input === ' ' || key.return) {
      toggleSelectedNode();
    }

    // Arrow key navigation
    if (key.upArrow) navigateUp();
    if (key.downArrow) navigateDown();

    // Expand/Collapse with arrow keys
    if (key.leftArrow) collapseSelectedNode();
    if (key.rightArrow) expandSelectedNode();

    // Explicit expand/collapse
    if (input === '+') expandSelectedNode();
    if (input === '-') collapseSelectedNode();

    // Expand/Collapse all
    if (input === '*') expandAll();
    if (input === '/') collapseAll();

    // Exit
    if (input === 'q') exit();
  });

  return <Tree />;
};
```

### 3.2 Recommended Keyboard Scheme

**For Groundswell Workflow Tree Debugger:**

```typescript
interface KeyboardShortcuts {
  // Primary (most discoverable)
  toggle: ['Enter', 'Space'],
  expand: ['+', 'ArrowRight'],
  collapse: ['-', 'ArrowLeft'],

  // Navigation
  navigateUp: ['ArrowUp', 'k'],
  navigateDown: ['ArrowDown', 'j'],

  // Bulk operations
  expandAll: ['*', 'E'],
  collapseAll: ['/', 'W'],

  // Exit
  exit: ['q', 'Ctrl+C'],
}
```

**Priority order (for UI hints):**
```
Press Enter/Space to toggle
↑/↓ to navigate
+/- to expand/collapse
* to expand all, / to collapse all
q to quit
```

---

## 4. State Persistence

### 4.1 Best Practices

#### DO: Persist expanded state across updates
- When tree structure updates (new nodes added), preserve existing expand/collapse state
- Track expanded state by node ID, not index
- Maintain state when filtering/searching

#### DON'T: Reset state unnecessarily
- Don't collapse all when adding/removing nodes
- Don't lose state when node names change
- Don't reset on tree refresh unless user requests it

### 4.2 State Tracking Patterns

#### Pattern A: ID-based Set (Recommended)
```typescript
interface TreeState {
  expandedNodeIds: Set<string>;
  selectedNodeId: string | null;
}

function toggleNode(nodeId: string, state: TreeState): TreeState {
  const newExpanded = new Set(state.expandedNodeIds);

  if (newExpanded.has(nodeId)) {
    newExpanded.delete(nodeId);  // Collapse
  } else {
    newExpanded.add(nodeId);     // Expand
  }

  return { ...state, expandedNodeIds: newExpanded };
}

function isNodeExpanded(nodeId: string, state: TreeState): boolean {
  return state.expandedNodeIds.has(nodeId);
}
```

#### Pattern B: Path-based Map
```typescript
interface TreeState {
  expandedPaths: Map<string, boolean>;
  selectedPath: string | null;
}

// Useful for trees with duplicate IDs
const nodePath = getNodePath(node); // "root/parent/child"
```

#### Pattern C: Node property (React-style)
```typescript
interface TreeNode {
  id: string;
  isExpanded: boolean;  // Stored on node itself
  children: TreeNode[];
}
```

### 4.3 Persistence Strategies

#### In-Memory (Session)
```typescript
// Default for single-session CLI
let expandedState = new Set<string>();
```

#### File-Based (Across restarts)
```typescript
// Save to ~/.groundswell/tree-state.json
import fs from 'fs';
import os from 'os';
import path from 'path';

const STATE_FILE = path.join(os.homedir(), '.groundswell', 'tree-state.json');

function saveState(state: TreeState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(Array.from(state.expandedNodeIds)));
}

function loadState(): TreeState {
  try {
    const data = fs.readFileSync(STATE_FILE, 'utf-8');
    return { expandedNodeIds: new Set(JSON.parse(data)) };
  } catch {
    return { expandedNodeIds: new Set() };
  }
}
```

### 4.4 Recommended State Management

**For Groundswell Workflow Tree Debugger:**

```typescript
interface TreeExpandState {
  // Use Set for O(1) lookup
  expandedIds: Set<string>;
  selectedId: string | null;
}

class TreeStateManager {
  private state: TreeExpandState;

  constructor() {
    this.state = {
      expandedIds: new Set(),
      selectedId: null,
    };
  }

  toggle(nodeId: string): void {
    if (this.state.expandedIds.has(nodeId)) {
      this.state.expandedIds.delete(nodeId);
    } else {
      this.state.expandedIds.add(nodeId);
    }
  }

  expand(nodeId: string): void {
    this.state.expandedIds.add(nodeId);
  }

  collapse(nodeId: string): void {
    this.state.expandedIds.delete(nodeId);
  }

  expandAll(nodeIds: string[]): void {
    nodeIds.forEach(id => this.state.expandedIds.add(id));
  }

  collapseAll(): void {
    this.state.expandedIds.clear();
  }

  isExpanded(nodeId: string): boolean {
    return this.state.expandedIds.has(nodeId);
  }

  // Persist state across tree updates
  updateTree(newTree: WorkflowNode): void {
    // State is preserved automatically (IDs don't change)
    // No action needed unless IDs changed
  }
}
```

---

## 5. Default State

### 5.1 Best Practices

#### General Rules

| Scenario | Default State | Rationale |
|----------|--------------|-----------|
| Small trees (< 10 nodes) | All expanded | User can see everything |
| Medium trees (10-50 nodes) | Root expanded, children collapsed | Balanced view |
| Large trees (> 50 nodes) | Root + first level expanded, rest collapsed | Avoid overwhelming |
| Deep trees (> 5 levels) | First 2 levels expanded | Show structure without clutter |
| Failed/error nodes | Always expanded | Errors need attention |
| Running/active nodes | Expanded | Activity is relevant |
| Completed nodes | Collapsed | Less relevant |

### 5.2 Smart Expansion Strategies

#### Strategy A: Expand by Status (Recommended)
```typescript
function getDefaultExpandState(node: WorkflowNode): boolean {
  // Always expand root
  if (node.depth === 0) return true;

  // Always expand nodes with errors
  if (node.status === 'failed' || node.status === 'cancelled') return true;

  // Always expand running nodes
  if (node.status === 'running') return true;

  // Collapse completed/idle nodes by default
  if (node.status === 'completed' || node.status === 'idle') return false;

  return false;
}
```

#### Strategy B: Expand by Depth
```typescript
const MAX_DEFAULT_DEPTH = 2;

function getDefaultExpandState(node: WorkflowNode): boolean {
  return node.depth < MAX_DEFAULT_DEPTH;
}
```

#### Strategy C: Expand by Path Importance
```typescript
function getDefaultExpandState(node: WorkflowNode): boolean {
  // Critical path nodes
  const criticalPaths = ['Build', 'Test', 'Deploy'];
  return criticalPaths.some(path => node.name.includes(path));
}
```

#### Strategy D: Hybrid (Best Practice)
```typescript
function getDefaultExpandState(node: WorkflowNode): boolean {
  // Rule 1: Always expand root
  if (node.depth === 0) return true;

  // Rule 2: Always expand error/failed nodes
  if (node.status === 'failed' || node.status === 'cancelled') return true;

  // Rule 3: Always expand running nodes
  if (node.status === 'running') return true;

  // Rule 4: Expand first 2 levels
  if (node.depth < 2) return true;

  // Rule 5: Collapse beyond depth 2
  return false;
}
```

### 5.3 Recommended Default State

**For Groundswell Workflow Tree Debugger:**

```typescript
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

function shouldExpandByDefault(node: WorkflowNode, config: ExpandConfig): boolean {
  // Root is always expanded
  if (node.depth === 0) return true;

  // Expand by status
  if (config.expandErrors && node.status === 'failed') return true;
  if (config.expandErrors && node.status === 'cancelled') return true;
  if (config.expandRunning && node.status === 'running') return true;
  if (config.expandCompleted && node.status === 'completed') return true;

  // Expand by depth
  return node.depth < config.maxDefaultDepth;
}

// Initialize state with smart defaults
function initializeTreeState(root: WorkflowNode, config: ExpandConfig): Set<string> {
  const expandedIds = new Set<string>();

  function traverse(node: WorkflowNode): void {
    if (shouldExpandByDefault(node, config)) {
      expandedIds.add(node.id);
    }
    node.children.forEach(traverse);
  }

  traverse(root);
  return expandedIds;
}
```

---

## 6. Code Examples

### 6.1 Complete Ink Component with Expand/Collapse

```typescript
import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface TreeNode {
  id: string;
  name: string;
  status: string;
  children: TreeNode[];
}

interface TreeViewProps {
  root: TreeNode;
}

const TreeView: React.FC<TreeViewProps> = ({ root }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    initializeTreeState(root, DEFAULT_CONFIG)
  );
  const [selectedId, setSelectedId] = useState<string>(root.id);

  const allNodeIds = useCallback(() => {
    const ids: string[] = [];
    function traverse(node: TreeNode): void {
      ids.push(node.id);
      node.children.forEach(traverse);
    }
    traverse(root);
    return ids;
  }, [root]);

  useInput((input, key) => {
    // Toggle expand/collapse
    if (input === ' ' || key.return) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(selectedId)) {
          next.delete(selectedId);
        } else {
          next.add(selectedId);
        }
        return next;
      });
    }

    // Expand/Collapse with arrows
    if (key.leftArrow) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(selectedId);
        return next;
      });
    }

    if (key.rightArrow) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.add(selectedId);
        return next;
      });
    }

    // Explicit expand/collapse
    if (input === '+') {
      setExpandedIds(prev => new Set(prev).add(selectedId));
    }

    if (input === '-') {
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.delete(selectedId);
        return next;
      });
    }

    // Expand/Collapse all
    if (input === '*') {
      setExpandedIds(new Set(allNodeIds()));
    }

    if (input === '/') {
      setExpandedIds(new Set());
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>Workflow Tree</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Enter: Toggle | +/-: Expand/Collapse | * / : All</Text>
      </Box>
      <TreeNodeComponent
        node={root}
        expandedIds={expandedIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        depth={0}
        isLast={true}
        isRoot={true}
        prefix=""
      />
    </Box>
  );
};

interface TreeNodeComponentProps {
  node: TreeNode;
  expandedIds: Set<string>;
  selectedId: string;
  onSelect: (id: string) => void;
  depth: number;
  isLast: boolean;
  isRoot: boolean;
  prefix: string;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  expandedIds,
  selectedId,
  onSelect,
  depth,
  isLast,
  isRoot,
  prefix,
}) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;

  const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  const expandIcon = hasChildren
    ? (isExpanded ? '▾' : '▸')
    : ' ';

  return (
    <Box flexDirection="column">
      <Box>
        {!isRoot && <Text dimColor>{prefix}</Text>}
        {!isRoot && <Text dimColor>{connector}</Text>}
        <Text
          bold={isSelected}
          color={isSelected ? 'cyan' : undefined}
        >
          {expandIcon}
        </Text>
        <Text> </Text>
        <Text color={getStatusColor(node.status)}>
          {getStatusLabel(node.status)}
        </Text>
        <Text> {node.name}</Text>
        {hasChildren && !isExpanded && (
          <Text dimColor> ▸ [{node.children.length} children]</Text>
        )}
      </Box>
      {isExpanded && hasChildren && node.children.map((child, index) => (
        <TreeNodeComponent
          key={child.id}
          node={child}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
          isLast={index === node.children.length - 1}
          isRoot={false}
          prefix={childPrefix}
        />
      ))}
    </Box>
  );
};

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    idle: 'gray',
    running: 'yellow',
    completed: 'green',
    failed: 'red',
    cancelled: 'cyan',
  };
  return colors[status] || 'white';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle: '○',
    running: '◐',
    completed: '✓',
    failed: '✗',
    cancelled: '⊘',
  };
  return labels[status] || '?';
}
```

### 6.2 ASCII-Only Fallback Version

```typescript
// For terminals that don't support Unicode box drawing
const ASCII_TREE = {
  VERTICAL: '|',
  BRANCH: '+--',
  LAST_BRANCH: '+--',
  COLLAPSED: '[+]',
  EXPANDED: '[-]',
  SPACE: '  ',
};

function renderASCIITree(node: TreeNode): string {
  // Implementation using ASCII characters only
}
```

---

## 7. Quick Reference

### 7.1 Symbol Summary

```
Expand/Collapse Indicators:
  Primary:   ▸ (collapsed) / ▾ (expanded) - Unicode U+25B8/U+25BE
  Alternate: ▶ (collapsed) / ▼ (expanded) - Unicode U+25B6/U+25BC
  Classic:   + (collapsed)  / - (expanded)  - ASCII
  Folder:    📂 (collapsed) / 📁 (expanded) - Emoji

Tree Structure:
  Vertical line:    │  (U+2502)
  Branch (middle):  ├── (U+251C + U+2500 + U+2500)
  Branch (last):    └── (U+2514 + U+2500 + U+2500)
```

### 7.2 Keyboard Shortcuts Summary

```
Primary:
  Enter / Space    Toggle expand/collapse
  Arrow Up / Down  Navigate nodes
  + / ArrowRight   Expand node
  - / ArrowLeft    Collapse node

Bulk:
  *                Expand all
  /                Collapse all

Exit:
  q / Ctrl+C       Quit
```

### 7.3 Placeholder Formats

```
Recommended: ▸ [3 children]
Alternate:  ▾ ... 3 items
Minimal:    ▾ (3)
```

---

## 8. Examples from Popular Tools

### 8.1 tree command

```bash
$ tree -L 2
.
├── CHANGELOG.md
├── dist
│   ├── cache
│   ├── core
│   └── debugger
└── src
```

**Characteristics:**
- No expand/collapse (shows all)
- Uses box-drawing characters
- 4-space indentation

### 8.2 git log --graph

```bash
* 4bd3db8 (HEAD -> main) feat: add Ink library
* 0a7bb62 feat: complete WorkflowTreeDebugger
* 0eba88a feat: complete event persistence
```

**Characteristics:**
- No expand/collapse (linear history)
- Uses asterisk for nodes
- Static display

### 8.3 npm ls

```bash
$ npm ls
groundswell@0.0.4
├─┬ @anthropic-ai/sdk@0.71.2
│ ├── json-schema-to-ts@3.1.1
│ └── zod@3.25.76
└─┬ @types/node@20.19.25
  └── undici-types@6.21.0
```

**Characteristics:**
- Shows all by default
- Uses └─┬ / ├── / └── pattern
- Depdenency tree structure

### 8.4 VS Code File Explorer

```
📁 src
  ▸ 📁 core        (3 items)
  ▾ 📁 debugger
    📄 tree-debugger.ts
    📄 event-replayer.ts
  📄 index.ts
```

**Characteristics:**
- ▸ / ▾ for expand/collapse
- (N items) placeholder when collapsed
- Icons for file types

---

## 9. Implementation Checklist

- [ ] Choose expand/collapse symbols (▸/▾ recommended)
- [ ] Implement toggle on Enter/Space
- [ ] Implement +/- keys for explicit expand/collapse
- [ ] Implement arrow key navigation (↑↓←→)
- [ ] Add collapsed placeholder: `▸ [N children]`
- [ ] Track expanded state with Set<string>
- [ ] Persist state across tree updates (by ID)
- [ ] Implement smart default expansion:
  - [ ] Root always expanded
  - [ ] Failed nodes expanded
  - [ ] Running nodes expanded
  - [ ] First 2 levels expanded
- [ ] Add keyboard shortcut hints in UI
- [ ] Test with ASCII-only terminal fallback

---

## 10. URLs and References

### Documentation URLs

1. **Ink (React for CLI)**
   - GitHub: https://github.com/vadimdemedes/ink
   - npm: https://www.npmjs.com/package/ink
   - useInput documentation: https://github.com/vadimdemedes/ink#useinput

2. **VS Code File Explorer**
   - Keyboard shortcuts: https://code.visualstudio.com/docs/getstarted/keybindings
   - File explorer: https://code.visualstudio.com/docs/getstarted/userinterface

3. **Unicode Characters**
   - Box Drawing: https://unicode.org/charts/PDF/U2500.pdf
   - Miscellaneous Symbols: https://unicode.org/charts/PDF/U2600.pdf

4. **CLI Tool Documentation**
   - tree command: https://linux.die.net/man/1/tree
   - git log: https://git-scm.com/docs/git-log
   - npm ls: https://docs.npmjs.com/cli/v9/commands/npm-ls

### Related Research Files

- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S2/research/04-tree-indentation-patterns.md`
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S2/research/06-external-examples.md`
- `/home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx`

### Example Implementations

- VS Code source (file explorer): https://github.com/microsoft/vscode (search "explorer")
- Ink examples: https://github.com/vadimdemedes/ink/tree/master/examples
- terminal-tree npm package: https://www.npmjs.com/package/terminal-tree

---

## 11. Key Recommendations

### For Groundswell Workflow Tree Debugger

1. **Symbols:** Use `▸` (collapsed) / `▾` (expanded) with ASCII fallback `+` / `-`

2. **Placeholder:** Use `▸ [N children]` format when collapsed

3. **Keyboard:**
   - Enter/Space to toggle
   - Arrow keys for navigation
   - +/- for explicit expand/collapse
   - */ for expand/collapse all

4. **State:** Persist with `Set<string>` of expanded IDs

5. **Defaults:**
   - Expand root
   - Expand failed/running nodes
   - Expand first 2 levels
   - Collapse completed nodes

---

**Research completed:** 2026-01-24
**Status:** Ready for implementation

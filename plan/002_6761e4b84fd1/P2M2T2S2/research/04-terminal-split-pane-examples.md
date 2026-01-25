# Terminal UI Split-Pane Layout Research

**Project:** Groundswell Workflow Tree Debugger
**Date:** 2025-01-24
**Purpose:** Research existing terminal UI tools with split-pane layouts to inform design of interactive debugger

---

## Executive Summary

This document compiles research on terminal UI tools that use split-pane layouts, focusing on implementations relevant to building an interactive workflow tree debugger. Key findings include common width ratios, border patterns, navigation models, and inspiring examples from popular CLI tools.

---

## 1. CLI Tools with Split-Pane Debug UIs

### 1.1 htop / btop (Process Monitors)

**Repository:** https://github.com/htop-dev/htop
**Repository:** https://github.com/aristocratos/btop

**Layout Characteristics:**
- **Main Panel (70-80%):** Process list with tree view (F5 toggle)
- **Header/Function Bar (20-30%):** CPU, memory, tasks, uptime meters
- **Split Type:** Horizontal split (header + main content)
- **Dynamic:** Meters adjust based on terminal width

**Key Takeaways:**
- Tree view (F5) shows process hierarchy with expand/collapse
- Function keys (F1-F10) provide quick access to views
- Color-coded by status (running, sleeping, zombie, etc.)
- Sorting and filtering available

### 1.2 lazygit (Git Terminal UI)

**Repository:** https://github.com/jesseduffield/lazygit

**Layout Characteristics:**
- **Multi-pane layout** (typically 4-5 panels)
- **Navigation:** Vim-style (hjkl arrow keys, Tab)
- **Panes:**
  - Files panel (30% width)
  - Commit history (40% width)
  - Branches/tags (15% width)
  - Stash view (15% width)
  - Details view (bottom panel, context-aware)

**Key Takeaways:**
- **Status indicators** (✓, ✗, ○, etc.) for git states
- **Modal interactions** - different views for different contexts
- **Context-sensitive actions** - keybindings change based on selected item
- **Panel navigation:** Tab/Shift+Tab to cycle between panes

### 1.3 gotop / bashtop (Activity Monitors)

**Repositories:**
- https://github.com/xxxserxxx/gotop
- https://github.com/aristocratos/bashtop

**Layout Characteristics:**
- **Primary panel:** CPU graph (largest)
- **Secondary panels:** Memory, disk, network (smaller, stacked)
- **Ratio:** Typically 60/40 or 70/30 for primary vs secondary
- **Box drawing borders:** Single and double lines

### 1.4 tig (Git Text Interface)

**Repository:** https://github.com/jonas/tig

**Layout Characteristics:**
- **Split-pane git log viewer:**
  - Left panel: Commit graph/log (60%)
  - Right panel: Commit details/diff (40%)
- **Navigation:** Arrow keys, Enter to view details
- **Horizontal split:** Details panel below main view (option)

---

## 2. Common Width Ratios

Based on analysis of popular tools, these are the most common split-pane ratios:

| Ratio | Use Case | Examples |
|-------|----------|----------|
| **70/30** | Tree/details, list/preview | lazygit (files/main), tig (log/details) |
| **60/40** | Primary content + context | htop (process/meters), IDE-style layouts |
| **50/50** | Equal importance views | git diff viewers, comparison tools |
| **75/25** | Sidebar navigation | File browsers, some debuggers |
| **80/20** | Status bar, metadata panel | Most CLI tools for status/info |

**Recommendation for Workflow Tree Debugger:**
- **Left pane (tree):** 60-70% - primary navigation
- **Right pane (details):** 30-40% - context-aware information

**Minimum usable widths:**
- Tree panel: minimum 25 characters (for indentation + node name)
- Details panel: minimum 30 characters (for key-value pairs)

---

## 3. Border and Separator Patterns

### 3.1 Box Drawing Characters (Unicode)

Terminal UIs commonly use Unicode box-drawing characters (U+2500-U+257F):

```
Single Line:
┌─────────┐  ─ ━ │ ┃
│ Panel 1 │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
├─────────┤
│ Panel 2 │
└─────────┘

Double Line:
╔═════════╗  ═ ║ ╗ ╝ ╣ ╦ ╩ ╬
║ Panel 1 ║
╠═════════╣
║ Panel 2 ║
╚═════════╝

Mixed:
╔═══ ═══╗  ┏ ┓ ┗ ┛ ┳ ┻ ┣
║ ─ ─ ─ ║
╠═══ ═══╣
```

**Common patterns for vertical splits:**

```
Tree Panel │ Details Panel
           │
┌──────────┤────────────┐
│ Root     │ Status:    │
│   ├─ A   │ Running    │
│   └─ B   │            │
│          │ Snapshot:  │
│          │ {...}      │
└──────────┴────────────┘
```

**Simple separator pattern (most common):**
```
Tree Panel │ Details Panel
```
or
```
Tree Panel │ Details Panel
           │
```

### 3.2 ASCII-Style Borders

For broader compatibility, some tools use ASCII:
```
+---------+---------+
| Panel 1 | Panel 2 |
+---------+---------+
```

### 3.3 Invisible Separators

Modern tools (like Ink apps) often use spacing instead of visible borders:
```tsx
<Box flexDirection="row" gap={2}>
  <Box width="60%">Tree</Box>
  <Box width="40%">Details</Box>
</Box>
```

**Recommendation:** Use invisible separator with spacing (`<Box width={2} />`) for cleaner look, or single vertical bar (`│`) for clear visual separation.

---

## 4. Navigation Patterns

### 4.1 Vim-Style Navigation (lazygit, tig)

```
h/j/k/l      - Left/Down/Up/Right
Tab/Shift+Tab- Cycle between panes
Enter        - Select/focus on item
Esc          - Return to previous context
q            - Quit/exit
```

### 4.2 Arrow Key Navigation (htop, btop)

```
↑/↓          - Navigate up/down in list
←/→          - Change tabs/panels
Enter        - Expand/collapse or select
F1-F10       - Function keys
q            - Quit
```

### 4.3 Emacs-Style (some tools)

```
C-n/C-p      - Next/previous line
C-f/C-b      - Forward/backward
C-x C-q      - Quit
```

### 4.4 Common Panel Navigation Patterns

| Pattern | Description | Used By |
|---------|-------------|---------|
| **Tab cycling** | Tab moves focus to next pane | lazygit, tig |
| **Arrow keys** | Arrow keys navigate within and between panes | htop, btop |
| **Modal** | Different modes for navigation vs action | vim-style tools |
| **Mouse** | Click to select (terminal-dependent) | Some modern tools |

**Recommendation for Workflow Tree Debugger:**
- **Arrow keys:** Navigate tree nodes
- **Tab:** Switch between tree and details panel
- **Enter:** Expand/collapse node
- **Escape:** Return to tree from details
- **q:** Quit

---

## 5. Node.js/Ink Split-Pane Examples

### 5.1 Existing Ink Ecosystem

**Available from npm:**
- **ink** (v6.6.0) - React for CLI - https://npm.im/ink
- **ink-table** (v3.1.0) - Table component - https://npm.im/ink-table
- **ink-text-input** (v6.0.0) - Text input - https://npm.im/ink-text-input
- **ink-select-input** (v6.2.0) - Select input - https://npm.im/ink-select-input

**Note:** No dedicated `ink-split-pane` package exists (404). Split-pane must be implemented manually using Ink's Box flexbox.

### 5.2 Ink Split-Pane Implementation Pattern

Based on existing codebase analysis (`/home/dustin/projects/groundswell/examples/components/`):

```tsx
// Basic split-pane using Ink's Box flexbox
<Box flexDirection="row">
  {/* Left panel - tree */}
  <Box width="60%" flexDirection="column">
    <WorkflowTree node={tree} />
  </Box>

  {/* Separator */}
  <Box width={1}>
    <Text dimColor>|</Text>
  </Box>

  {/* Right panel - details */}
  <Box width="39%" flexDirection="column">
    <NodeDetails node={selectedNode} />
  </Box>
</Box>
```

### 5.3 Current WorkflowTreeDebuggerUI Structure

**File:** `/home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx`

Current implementation:
- Single-column layout
- Header with title
- Stats line (Nodes, Completed, Failed)
- Tree view using WorkflowTree component

**Structure:**
```tsx
<Box flexDirection="column" padding={1}>
  <Box marginBottom={1}>
    <Text bold color="cyan">Workflow Tree Debugger (Reactive)</Text>
  </Box>
  <Text dimColor>Press Ctrl+C to exit</Text>
  <Newline />
  <Text dimColor>Nodes: {stats.totalNodes} | ...</Text>
  <Newline />
  <WorkflowTree node={tree} />
</Box>
```

### 5.4 Existing WorkflowTreeNode Component

**File:** `/home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx`

Key features:
- **Recursive tree rendering** with proper indentation
- **Tree structure connectors:** `├──` for non-last, `└──` for last child
- **Vertical continuation:** `│` for non-last branches
- **Status icons:** ○ ◐ ✓ ✗ ⊘ with color coding
- **Already supports:** `expandedIds`, `onToggle`, `selectedId` props (for future expand/collapse)

**Tree rendering pattern:**
```
Root Node
├── Child 1
│   ├── Grandchild 1.1
│   └── Grandchild 1.2
└── Child 2
```

---

## 6. Best Practices for Terminal UI Width Ratios

### 6.1 Content-Based Ratios

| Content Type | Recommended Ratio | Reasoning |
|--------------|-------------------|-----------|
| **Tree navigation** | 60/40 to 70/30 | Tree needs space for indentation (2-4 spaces per level) |
| **Code review** | 50/50 | Equal importance for both sides |
| **Log viewing** | 70/30 | Logs need horizontal space |
| **Status dashboard** | 80/20 | Minimal space for status bar |

### 6.2 Terminal Size Considerations

**Minimum viable terminal width:** 80 columns
- 80 columns: 48/32 split (60/40)
- 100 columns: 60/40 split
- 120 columns: 70/40 split + separator

**Responsive strategy:**
```tsx
// Calculate panel widths based on terminal width
const usePanelWidths = () => {
  const { columns } = useStdoutDimensions();

  if (columns < 80) {
    return { tree: 40, details: 40 }; // Overflow with separator
  } else if (columns < 100) {
    return { tree: 50, details: 30 };
  } else {
    return { tree: 65, details: 35 };
  }
};
```

### 6.3 Dynamic Adjustment

Some tools allow users to adjust ratios:
- **htop:** Interactive resize not available, but panel width adapts to terminal
- **tmux:** `resize-pane -L/R` for manual adjustment
- **lazygit:** Fixed ratios, panel selection changes content

**Recommendation:** Start with fixed 65/35 ratio, consider adding configurable ratios later.

---

## 7. Inspiring Examples & URLs

### 7.1 Terminal UI Libraries

| Library | Language | URL | Notes |
|---------|----------|-----|-------|
| **Ink** | TypeScript/Node.js | https://github.com/vadimdemedes/ink | React for CLI - used in this project |
| **blessed** | Node.js | https://github.com/chjj/blessed | Low-level terminal UI |
| **terminal-kit** | Node.js | https://github.com/cronvel/terminal-kit | Comprehensive terminal library |
| **tcell** | Go | https://github.com/gdamore/tcell | Cell-based terminal (htop rewrite) |
| **rich** | Python | https://github.com/Textualize/rich | Python terminal formatting |

### 7.2 Split-Pane CLI Tools

| Tool | URL | Split Style |
|------|-----|-------------|
| **lazygit** | https://github.com/jesseduffield/lazygit | Multi-pane, vim-style |
| **htop** | https://github.com/htop-dev/htop | Horizontal split (meters + process list) |
| **btop** | https://github.com/aristocratos/btop | Multiple panels, boxed |
| **tig** | https://github.com/jonas/tig | Git log + diff split |
| **gotop** | https://github.com/xxxserxxx/gotop | Meter + main panel |
| **k9s** | https://github.com/derailed/k9s | Kubernetes, multi-pane |
| **glances** | https://github.com/nicolargo/glances | System monitoring, table + stats |

### 7.3 Debug UI Examples

| Tool | URL | Debug Features |
|------|-----|----------------|
| **gdb-dashboard** | https://github.com/cyrus-and/gdb-dashboard | GDB TUI with split panes |
| **lldb-vscode** | https://github.com/vadimcn/vscode-lldb | VS Code debugger integration |
| **node-inspect** | https://nodejs.org/en/docs/inspector | Node.js built-in inspector |

### 7.4 Git Tools with Split Views

| Tool | URL | Layout |
|------|-----|--------|
| **lazygit** | https://github.com/jesseduffield/lazygit | Files | History | Branches |
| **tig** | https://github.com/jonas/tig | Log \| Diff |
| **gitui** | https://github.com/extrawurst/gitui | Similar to lazygit, Rust-based |
| **git-cola** | https://github.com/git-cola/git-cola | GUI with split panes |

---

## 8. Design Recommendations for Workflow Tree Debugger

### 8.1 Proposed Layout

```
┌─────────────────────────────────┬────────────────────────────┐
│ Workflow Tree Debugger          │ Node Details               │
│ Press Ctrl+C to exit            │                            │
│                                 │                            │
│ Nodes: 15 | ✓: 12 | ✗: 1        │ ID: abc123                 │
│                                 │ Status: Running            │
│ ┌──────────────────────────┐   │ Parent: Build Project      │
│ │ └─ Build Project        │   │                            │
│ │   ├─ Install Deps       │   │ State Snapshot:            │
│ │   │ └─ npm install ✓   │   │ { progress: 75 }           │
│ │   └─ Run Tests ◐        │   │                            │
│ │     ├─ Unit Tests ✓     │   │ Events (3):                │
│ │     └─ Integration ◐    │   │ • stepStart (10ms ago)     │
│ │                          │   │ • taskStart (8ms ago)      │
│ └──────────────────────────┘   │ • progress (5ms ago)       │
│                                 │                            │
│ ↑/↓: Navigate  Enter: Expand   │ Logs (2):                  │
│ Tab: Panels    q: Quit         │ • Installing packages...   │
│                                 │ • Running test suite...    │
└─────────────────────────────────┴────────────────────────────┘
        65% width                        35% width
```

### 8.2 Recommended Width Ratios

**Primary configuration:** 65/35 (Tree/Details)
- Tree panel: 65% - adequate space for 3-4 indentation levels
- Details panel: 35% - sufficient for key-value pairs and short logs
- Separator: 1 column (`│`)

**Alternative for smaller terminals:** 60/40
- When terminal width < 100 columns

**Full-screen alternative:** 50/50
- For side-by-side code comparison or large logs

### 8.3 Separator Style

**Recommended:** Single vertical bar with padding
```
Tree Panel │ Details Panel
           │
```

**Implementation:**
```tsx
<Box width={2} paddingLeft={1} paddingRight={1}>
  <Text dimColor>│</Text>
</Box>
```

**Alternative:** Spacing only (cleaner)
```tsx
<Box width={2} />
```

### 8.4 Navigation Design

| Key | Action | Context |
|-----|--------|---------|
| **↑/↓** | Navigate tree nodes | Always |
| **→** | Expand node (show children) | Tree panel |
| **←** | Collapse node | Tree panel |
| **Enter** | Expand/collapse or select | Tree panel |
| **Tab** | Switch to details panel | Tree → Details |
| **Shift+Tab** | Switch to tree panel | Details → Tree |
| **Home/End** | First/last node | Tree panel |
| **PgUp/PgDn** | Page up/down | Details panel (scrolling) |
| **q** | Quit | Always |
| **?** | Show help | Always |

### 8.5 Panel Focus States

**Visual indicators for active panel:**
1. **Bright border** around active panel
2. **Dimmed text** in inactive panel
3. **Cursor position indicator** (▶ or ►)
4. **Status bar showing active panel**

```tsx
// Active panel indicator
<Box borderStyle="single" borderColor={isActive ? "green" : "dim"}>
  {/* Panel content */}
</Box>
```

### 8.6 Scrolling Strategy

**Tree panel:**
- Arrow keys navigate (tree can grow beyond viewport)
- Consider virtualization for very large trees (>100 nodes)
- Show "..." indicator for collapsed sections

**Details panel:**
- Truncate long content with `...`
- Use `<Static>` for scrollable regions (Ink feature)
- Show "▼ more" indicator for truncated content

---

## 9. Implementation Considerations

### 9.1 Ink-Specific Patterns

**Use `useStdoutDimensions()` for responsive sizing:**
```tsx
import { useStdoutDimensions } from 'ink';

const { columns } = useStdoutDimensions();
const treeWidth = Math.floor(columns * 0.65);
const detailsWidth = columns - treeWidth - 2; // -2 for separator
```

**Use `useInput()` for keyboard handling:**
```tsx
import { useInput } from 'ink';

useInput((input, key) => {
  if (key.tab) {
    // Switch panel focus
  } else if (key.return) {
    // Expand/collapse
  } else if (input === 'q') {
    // Quit
  }
});
```

**Use `<Static>` for scrollable content:**
```tsx
import { Static } from 'ink';

<Static items={logs}>
  {(log, index) => <Text key={index}>{log}</Text>}
</Static>
```

### 9.2 State Management

**Required state for split-pane UI:**
```tsx
interface DebuggerUIState {
  // Tree state
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;

  // Panel state
  activePanel: 'tree' | 'details';

  // Terminal state
  terminalWidth: number;
  terminalHeight: number;
}
```

### 9.3 Performance Considerations

**Re-render optimization:**
- Use `React.memo` for TreeNode components
- Use `useStatic` hook for immutable tree data
- Throttle event updates (use `maxFps: 30` in `render()`)

**Event handling:**
- Debounce rapid state changes
- Batch multiple tree updates per frame

---

## 10. Appendix: Box Drawing Character Reference

### 10.1 Single Line Characters (U+2500-U+257F)

| Code | Char | Name | Usage |
|------|------|------|-------|
| U+2500 | ─ | Light horizontal | Horizontal lines |
| U+2502 | │ | Light vertical | Vertical separators |
| U+250C | ┌ | Light down and right | Top-left corner |
| U+2510 | ┐ | Light down and left | Top-right corner |
| U+2514 | └ | Light up and right | Bottom-left corner |
| U+2518 | ┘ | Light up and left | Bottom-right corner |
| U+251C | ├ | Light vertical and right | Tree branch (middle) |
| U+2524 | ┤ | Light vertical and left | Tree branch (middle) |
| U+252C | ┬ | Light down and horizontal | Horizontal line down |
| U+2534 | ┴ | Light up and horizontal | Horizontal line up |
| U+253C | ┼ | Light cross | Intersections |
| U+2574 | ╴ | Light right | Simple right connector |
| U+2576 | ╶ | Light left | Simple left connector |

### 10.2 Tree Structure Patterns

**Standard tree (used by htop, git, etc.):**
```
└── Root
    ├── Child 1
    │   ├── Grandchild 1.1
    │   └── Grandchild 1.2
    └── Child 2
```

**Alternative (compact):**
```
└─ Root
  ├─ Child 1
  │ ├─ GC 1.1
  │ └─ GC 1.2
  └─ Child 2
```

**Current implementation in WorkflowTreeNode:**
```tsx
const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
```

---

## 11. Key Takeaways

1. **Width Ratio:** Use 65/35 split for tree/details, adjust to 60/40 for smaller terminals
2. **Separator:** Single vertical bar (`│`) with padding, or pure spacing for cleaner look
3. **Navigation:** Arrow keys for tree, Tab to switch panels, Enter for expand/collapse
4. **Borders:** Use box-drawing characters (─ │ └ ├ └) for tree structure
5. **Focus Indicators:** Bright border or cursor indicator for active panel
6. **Scrolling:** Use `<Static>` for details panel, virtualize if needed for large trees
7. **Performance:** Use `maxFps: 30` throttle, memoize components, batch updates

---

## 12. Next Steps

1. **Prototype split-pane layout** using Ink's Box flexbox
2. **Implement panel navigation** with Tab/Shift+Tab
3. **Add node selection** with arrow keys
4. **Create details panel** showing selected node info
5. **Test with various terminal sizes** (80, 100, 120 columns)
6. **Add expand/collapse** with Enter key
7. **Optimize rendering** for large trees (100+ nodes)

---

## Sources and References

### Projects Analyzed
- **Ink:** https://github.com/vadimdemedes/ink - React for CLI
- **lazygit:** https://github.com/jesseduffield/lazygit - Git terminal UI
- **htop:** https://github.com/htop-dev/htop - Process monitor
- **btop:** https://github.com/aristocratos/btop - System monitor
- **tig:** https://github.com/jonas/tig - Git interface
- **ink-table:** https://github.com/maticzav/ink-table - Table component for Ink

### Existing Implementation References
- `/home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx`
- `/home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx`
- `/home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx`
- `/home/dustin/projects/groundswell/examples/examples/12-ink-debugger-reactive.tsx`

### NPM Packages
- `ink@6.6.0` - https://npm.im/ink
- `ink-table@3.1.0` - https://npm.im/ink-table
- `ink-text-input@6.0.0` - https://npm.im/ink-text-input
- `ink-select-input@6.2.0` - https://npm.im/ink-select-input

---

**Document Version:** 1.0
**Last Updated:** 2025-01-24
**Status:** Research Complete

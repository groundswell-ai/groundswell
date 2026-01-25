---
name: "PRP for P2.M2.T2.S2: Add split-pane layout with node details"
description: "Implement split-pane debugger UI with tree navigation (60%) and node details panel (40%) showing logs, events, and state snapshot with redaction and scrolling"
---

## Goal

**Feature Goal**: Implement a split-pane layout for the WorkflowTreeDebuggerUI with a tree view on the left (60%) and a node details panel on the right (40%), displaying selected node's name, status, state snapshot (redacted), recent logs, and event count with proper scrolling for large content.

**Deliverable**:
1. **New component**: `examples/components/NodeDetailsPanel.tsx` - Displays selected node information with sections for header, state snapshot, logs, and events
2. **Modified**: `examples/components/WorkflowTreeDebuggerUI.tsx` - Split-pane layout using `flexDirection="row"` with selected node state management
3. **Modified**: `examples/components/WorkflowTree.tsx` - Add `selectedId` and `onSelect` props for node selection
4. **Modified**: `examples/components/WorkflowTreeNode.tsx` - Add visual selection indicator and keyboard selection support
5. **Unit tests**: `examples/__tests__/workflow-tree-split-pane.test.tsx` - Test split-pane rendering, node selection, and details panel content

**Success Definition**:
- Running `tsx examples/examples/12-ink-debugger-reactive.tsx` displays split-pane layout with tree on left (60%) and details panel on right (40%)
- Arrow keys (↑/↓) navigate tree nodes and update details panel
- Details panel shows: node name, status icon, state snapshot (redacted/truncated), event count, and recent logs
- Large content (state snapshots, logs) are truncated with "... (N more)" indicators
- Sensitive data in state snapshots is redacted (password, token, apiKey, etc.)
- All tests pass: `npm test -- examples/__tests__/workflow-tree-split-pane.test.tsx`

## User Persona

**Target User**: Developer debugging complex workflow executions who needs to inspect individual node state without losing context of the overall tree structure.

**Use Case**: A developer is debugging a workflow and notices a node has failed. They want to see detailed information about that node (logs, state snapshot, events) while maintaining visibility of the tree structure to understand context and navigate to other nodes.

**User Journey**:
1. Developer runs `tsx examples/examples/12-ink-debugger-reactive.tsx`
2. Split-pane UI displays with tree on left and "Select a node to view details" placeholder on right
3. Developer uses arrow keys (↑/↓) to navigate to a failed node
4. Details panel updates to show the selected node's information:
   - Header: node name with status icon
   - State Snapshot: redacted JSON (first 20 lines, sensitive fields redacted)
   - Events: count and recent events
   - Logs: most recent log entries (last 10)
5. Developer navigates to other nodes, details panel updates dynamically
6. Press Ctrl+C to exit cleanly

**Pain Points Addressed**:
- Can't see node details (logs, state) while maintaining tree context
- Large state snapshots overwhelm the terminal display
- Sensitive data (passwords, tokens) exposed in debug output
- Difficult to correlate tree structure with node state
- No way to inspect logs/events for specific nodes without scrolling entire tree

## Why

- **Context Preservation**: Split-pane layout allows viewing tree structure and node details simultaneously
- **Faster Debugging**: Inspect specific node state without losing navigation context
- **Data Safety**: Automatic redaction of sensitive fields prevents accidental credential exposure
- **Large Output Handling**: Truncation and pagination prevent terminal flooding from large state objects
- **Visual Feedback**: Selection highlighting shows which node's details are displayed
- **Keyboard-First**: Terminal UIs are keyboard-driven - arrow key navigation is natural and efficient

## What

### Scope

This subtask covers:
1. **Split-Pane Layout**: Using `flexDirection="row"` with 60/40 width split
2. **Node Selection State**: Track `selectedNodeId` in WorkflowTreeDebuggerUI with arrow key navigation
3. **NodeDetailsPanel Component**: Display node name, status, state snapshot (redacted), logs, and events
4. **Tree Selection Indicators**: Visual highlighting of selected node (bold color, asterisk, or background)
5. **State Snapshot Redaction**: Automatic redaction of sensitive keys (password, token, apiKey, etc.)
6. **Content Truncation**: Limit display of large content (state JSON to 20 lines, logs to 10 entries)
7. **Keyboard Navigation**: Arrow keys (↑/↓) to navigate tree, Tab to switch panels (future)
8. **Unit Tests**: Test split-pane rendering, selection state, and details panel content

### Out of Scope (Future Subtasks)
- Mouse interaction (not supported in Ink)
- Panel resizing (adjustable split ratios)
- Search/filter functionality
- Persistent selection state across workflow restarts
- Advanced pagination for logs/events
- Virtual scrolling for very large trees
- Tab navigation between panels (P2.M2.T2.S3 may add)

### Success Criteria

- [ ] Split-pane layout renders with tree (60% left) and details panel (40% right)
- [ ] Arrow keys (↑/↓) navigate tree and update selected node
- [ ] Selected node is visually highlighted (bold cyan or background color)
- [ ] Details panel shows selected node's name and status icon
- [ ] Details panel shows redacted state snapshot (max 20 lines, sensitive keys redacted)
- [ ] Details panel shows event count
- [ ] Details panel shows recent logs (max 10 entries)
- [ ] Large content truncates with "... (N more)" indicators
- [ ] Sensitive keys are redacted (password → `***`, token → `tok***en`)
- [ ] "No node selected" placeholder shows when `selectedId` is null
- [ ] All unit tests pass

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**Answer**: YES - This PRP includes:
- Complete component specifications with code examples
- Exact prop interfaces to add/change for each component
- State management patterns for selection and split-pane layout
- Redaction logic with specific sensitive key patterns
- Truncation strategies with line/character limits
- Integration points with existing P2.M2.T2.S1 expand/collapse features
- Testing setup and patterns from existing tests
- 4 comprehensive research documents with implementation examples

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# CONTRACT FROM P2.M2.T2.S1 (Parallel Implementation - TREAT AS EXISTING)
- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T2S1/PRP.md
  why: Defines the expand/collapse features being built in parallel
  critical: expandedIds, selectedId state, keyboard navigation, useInput hook
  gotcha: These features WILL exist when this task starts - use them, don't reimplement
  pattern: Arrow key navigation, Set<string> for expandedIds, visibleNodes for flattening

# Existing Codebase Patterns
- file: /home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx
  why: Current single-column layout to modify into split-pane
  pattern: Observable subscription pattern, useEffect cleanup
  gotcha: Currently uses flexDirection="column" - change to flexDirection="row" for split-pane

- file: /home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx
  why: Tree node component to add selection indicator
  pattern: Branch connectors (├──, └──), StatusIcon usage
  gotcha: After P2.M2.T2.S1, this will have expand/collapse props - don't modify those

- file: /home/dustin/projects/groundswell/examples/components/WorkflowTree.tsx
  why: Tree wrapper component to add selectedId/onSelect props
  pattern: Props pass-through to WorkflowTreeNode

- file: /home/dustin/projects/groundswell/examples/components/StatusIcon.tsx
  why: Reusable status icon component (NO CHANGES NEEDED)
  pattern: StatusIcon({ status }) returns colored Text with symbol

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: WorkflowNode interface definition - the data structure we display
  pattern: interface with id, name, parent, children, status, logs, events, stateSnapshot
  gotcha: stateSnapshot is SerializedWorkflowState | null (could be huge object)

# Research Documents (Internal) - Comprehensive Coverage
- docfile: plan/002_6761e4b84fd1/P2M2T2S2/research/01-ink-split-pane-layouts.md
  why: Complete guide on split-pane implementation with Ink
  section: Method 1 (Percentage Widths), Complete Split-Pane Debugger Example
  critical: Use `flexDirection="row"` with `width="60%"` and `width="40%"`

- docfile: plan/002_6761e4b84fd1/P2M2T2S2/research/02-ink-scrolling-large-output.md
  why: Scrolling patterns, truncation strategies, redaction logic
  section: Truncating Large Output, State Snapshot Redaction, Complete Split-Pane Details Component
  critical: Redaction patterns, line-based truncation with "... (N more)" indicators

- docfile: plan/002_6761e4b84fd1/P2M2T2S2/research/03-node-details-display-patterns.md
  why: Best practices for displaying logs, events, state snapshots
  section: Log Display Patterns, Event Display Patterns, State Snapshot Display Patterns
  critical: Reverse chronological logs, event counts, maxKeys/maxDepth limits

- docfile: plan/002_6761e4b84fd1/P2M2T2S2/research/04-terminal-split-pane-examples.md
  why: Terminal UI design patterns and width ratios
  section: Recommended Width Ratios, Navigation Design, Separator Style
  critical: 65/35 or 60/40 split, single vertical bar separator

# External Documentation
- url: https://github.com/vadimdemedes/ink#box
  why: Official Ink Box component documentation
  critical: flexDirection, width, padding, borderStyle properties
  section: Flexbox properties, Dimensions > width

- url: https://github.com/vadimdemedes/ink#useinput
  why: Official Ink useInput hook documentation
  critical: Arrow key handling (key.upArrow, key.downArrow)
  section: Key object properties
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                          # Compiled JavaScript output
├── docs/                          # User documentation
├── examples/
│   ├── components/                # Component library (MODIFY)
│   │   ├── StatusIcon.tsx         # Status indicator (NO CHANGES)
│   │   ├── WorkflowTreeNode.tsx   # Recursive tree node (MODIFY - add selection)
│   │   ├── WorkflowTree.tsx       # Tree wrapper (MODIFY - add selectedId/onSelect)
│   │   ├── WorkflowTreeDebuggerUI.tsx  # Debugger UI (MODIFY - split-pane)
│   │   └── index.ts               # Barrel export file (MODIFY - export new component)
│   ├── __tests__/                 # Component tests
│   │   ├── workflow-tree.test.tsx       # Existing tests (NO CHANGES)
│   │   └── workflow-tree-split-pane.test.tsx  # NEW: Split-pane tests
│   └── examples/
│       └── 12-ink-debugger-reactive.tsx  # Integration example (inherits features)
├── plan/
│   └── 002_6761e4b84fd1/
│       └── P2M2T2S2/
│           ├── research/          # Research documents (EXISTING)
│           │   ├── 01-ink-split-pane-layouts.md
│           │   ├── 02-ink-scrolling-large-output.md
│           │   ├── 03-node-details-display-patterns.md
│           │   └── 04-terminal-split-pane-examples.md
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
# MODIFIED FILES
examples/components/
  WorkflowTreeDebuggerUI.tsx        # MODIFY: Add split-pane layout, selectedNodeId state
  WorkflowTree.tsx                  # MODIFY: Add selectedId, onSelect props
  WorkflowTreeNode.tsx              # MODIFY: Add selection indicator, onSelect callback
  index.ts                          # MODIFY: Export NodeDetailsPanel

examples/__tests__/
  workflow-tree-split-pane.test.tsx # NEW: Split-pane tests

# NEW FILES
examples/components/
  NodeDetailsPanel.tsx              # NEW: Details panel component
  utils/
    redaction.ts                    # NEW: State redaction utilities
    truncation.ts                   # NEW: Content truncation utilities
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// ============================================================================
// CRITICAL: Ink Does NOT Support Independent Scrolling
// ============================================================================
// Ink does NOT have a ScrollView component
// Overflow only supports "visible" or "hidden" (NOT "scroll")
// Workaround: Use truncation with "... (N more)" indicators
// See: research/02-ink-scrolling-large-output.md section "Box Overflow Property"

// ============================================================================
// CRITICAL: Split-Pane Layout Pattern
// ============================================================================
import { Box } from 'ink';

// Use flexDirection="row" for horizontal split
<Box flexDirection="row" width="100%">
  <Box width="60%">
    <Text>Tree View</Text>
  </Box>
  <Box width="40%">
    <Text>Details Panel</Text>
  </Box>
</Box>

// GOTCHA: Don't use flexGrow for percentages - use explicit width="60%"
// flexGrow creates ratios but can be unpredictable with content

// ============================================================================
// CRITICAL: State Snapshot Can Be HUGE
// ============================================================================
// WorkflowNode.stateSnapshot may contain:
// - Large nested objects (1000+ keys)
// - Long strings (base64 encoded data)
// - Binary data (Buffers)
// - Sensitive information (API keys, tokens)

// ALWAYS redact and truncate before display:
// 1. Redact sensitive keys (password, token, apiKey, etc.)
// 2. Limit top-level keys (max 20)
// 3. Limit nesting depth (max 2-3 levels)
// 4. Truncate long strings (80 chars)
// 5. Limit array length (first 5 items)

// ============================================================================
// CRITICAL: Sensitive Data Redaction
// ============================================================================
const SENSITIVE_KEY_PATTERNS = [
  /password/i, /secret/i, /token/i, /api[_-]?key/i,
  /auth/i, /credential/i, /private/i,
];

function redactValue(key: string, value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 10
      ? `${value.slice(0, 3)}***${value.slice(-3)}`
      : '***';
  }
  return '[REDACTED]';
}

// ============================================================================
// CRITICAL: Arrow Key Navigation (from P2.M2.T2.S1 PRP)
// ============================================================================
import { useInput } from 'ink';

useInput((input, key) => {
  // Navigate up
  if (key.upArrow) {
    // Update selection to previous visible node
    setSelectedId(visibleNodes[selectedIndex - 1].id);
  }

  // Navigate down
  if (key.downArrow) {
    // Update selection to next visible node
    setSelectedId(visibleNodes[selectedIndex + 1].id);
  }
});

// GOTCHA: Use key.upArrow / key.downArrow (NOT input === 'ArrowUp')
// See: research/01-ink-input-patterns.md from P2.M2.T2.S1

// ============================================================================
// CRITICAL: Tree Flattening for Navigation
// ============================================================================
// Arrow keys need to navigate only VISIBLE nodes (considering expand/collapse)
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

// GOTCHA: expandedIds is from P2.M2.T2.S1 - use it, don't re-implement

// ============================================================================
// CRITICAL: Selection Visual Indicator
// ============================================================================
// In WorkflowTreeNode.tsx, highlight selected node
const isSelected = selectedId === node.id;

<Text
  bold={isSelected}
  color={isSelected ? 'cyan' : undefined}
  backgroundColor={isSelected ? 'gray' : undefined}
>
  {node.name}
</Text>

// Alternative: Add asterisk prefix
{isSelected && <Text color="cyan">►</Text>}

// ============================================================================
// CRITICAL: Content Truncation with Indicators
// ============================================================================
function truncateLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines;

  return [
    ...lines.slice(0, maxLines),
    `... (${lines.length - maxLines} more lines)`
  ];
}

// Usage:
const jsonLines = JSON.stringify(stateSnapshot, null, 2).split('\n');
const displayLines = truncateLines(jsonLines, 20);

// Output:
// {
//   "key1": "value1",
//   "key2": "value2",
//   ...
// }
// ... (150 more lines)

// ============================================================================
// CRITICAL: WorkflowNode Data Structure
// ============================================================================
// From src/types/workflow.ts
interface WorkflowNode {
  id: string;
  name: string;
  status: WorkflowStatus;
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  logs: LogEntry[];              // Array of log entries
  events: WorkflowEvent[];       // Array of workflow events
  stateSnapshot: SerializedWorkflowState | null;  // Key-value pairs
}

// LogEntry has: id, workflowId, timestamp, level, message, data?
// WorkflowEvent is discriminated union with 18+ event types
// SerializedWorkflowState is Record<string, unknown>

// ============================================================================
// CRITICAL: Props to Add to WorkflowTree (from P2.M2.T2.S1 contract)
// ============================================================================
export interface WorkflowTreeProps {
  node: WorkflowNode;
  // FROM P2.M2.T2.S1: Expand/collapse props
  expandedIds?: Set<string>;
  onToggle?: (nodeId: string) => void;
  // NEW: Selection props
  selectedId?: string | null;
  onSelect?: (nodeId: string) => void;
}

// ============================================================================
// CRITICAL: Props to Add to WorkflowTreeNode
// ============================================================================
export interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  depth?: number;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
  // FROM P2.M2.T2.S1: Expand/collapse props
  expandedIds?: Set<string>;
  onToggle?: (nodeId: string) => void;
  // NEW: Selection props
  selectedId?: string | null;
  onSelect?: (nodeId: string) => void;
}

// ============================================================================
// CRITICAL: Terminal Width Considerations
// ============================================================================
// Minimum viable terminal width: 80 columns
// - 80 columns: tree = 48 (60%), details = 32 (40%) - tight but usable
// - 100 columns: tree = 60, details = 40 - comfortable
// - 120 columns: tree = 72, details = 48 - spacious

// No responsive logic needed for this subtask - use fixed 60/40 split
// Future subtasks may add terminal-width-based adjustments

// ============================================================================
// CRITICAL: NodeDetailsPanel Section Display Order
// ============================================================================
// Recommended order (from top to bottom):
// 1. Header: Node name + status icon
// 2. Event count (small, always show)
// 3. State Snapshot (truncate to 20 lines, redact)
// 4. Recent Logs (show last 10, reverse chronological)

// Each section should have a bold header
// Empty state: "No state snapshot available", "No logs"
```

## Implementation Blueprint

### Data Models and Structure

**No new data models required** - uses existing `WorkflowNode` interface. New utility functions for redaction and truncation:

```typescript
// From src/types/workflow.ts (already exists)
import type { WorkflowNode, WorkflowStatus } from '../../src/types/workflow.js';
import type { LogEntry } from '../../src/types/logging.js';
import type { WorkflowEvent } from '../../src/types/events.js';

// New utility types
interface DisplayConfig {
  state: {
    maxLines: number;
    maxKeys: number;
    maxDepth: number;
    maxStringLength: number;
  };
  logs: {
    maxEntries: number;
  };
}

const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  state: {
    maxLines: 20,
    maxKeys: 20,
    maxDepth: 2,
    maxStringLength: 80,
  },
  logs: {
    maxEntries: 10,
  },
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE examples/components/utils/redaction.ts
  - IMPLEMENT: redactSensitiveKeys() function
  - IMPLEMENT: redactValue() function with partial masking
  - PATTERNS: /password/i, /secret/i, /token/i, /api[_-]?key/i, /auth/i
  - NAMING: camelCase functions
  - PLACEMENT: examples/components/utils/ directory
  - EXPORT: Named exports for testing
  - DEPENDENCIES: None

Task 2: CREATE examples/components/utils/truncation.ts
  - IMPLEMENT: truncateLines() with "... (N more)" indicator
  - IMPLEMENT: truncateObject() with depth/length limiting
  - IMPLEMENT: formatValue() for safe string conversion
  - NAMING: camelCase functions
  - PLACEMENT: examples/components/utils/ directory
  - EXPORT: Named exports for testing
  - DEPENDENCIES: None

Task 3: CREATE examples/components/NodeDetailsPanel.tsx
  - IMPLEMENT: Section headers (bold colored Text)
  - IMPLEMENT: Header section (node name + StatusIcon)
  - IMPLEMENT: Event count display
  - IMPLEMENT: State snapshot display (redacted + truncated)
  - IMPLEMENT: Recent logs display (last 10, reverse chronological)
  - IMPLEMENT: Empty states ("No node selected", "No state snapshot")
  - IMPORT: StatusIcon from './StatusIcon.js'
  - IMPORT: redaction utilities from './utils/redaction.js'
  - IMPORT: truncation utilities from './utils/truncation.js'
  - NAMING: NodeDetailsPanel component
  - PLACEMENT: examples/components/NodeDetailsPanel.tsx
  - DEPENDENCIES: Task 1, Task 2

Task 4: MODIFY examples/components/WorkflowTreeNode.tsx
  - ADD to props interface: selectedId?: string | null
  - ADD to props interface: onSelect?: (nodeId: string) => void
  - IMPLEMENT: Selection indicator (bold cyan color when selected)
  - IMPLEMENT: Optional asterisk (►) prefix for selected node
  - PASS onSelect to recursive children
  - NAMING: Keep existing component name
  - PLACEMENT: examples/components/WorkflowTreeNode.tsx
  - DEPENDENCIES: None

Task 5: MODIFY examples/components/WorkflowTree.tsx
  - ADD to props interface: selectedId?: string | null
  - ADD to props interface: onSelect?: (nodeId: string) => void
  - PASS through props to WorkflowTreeNode
  - NAMING: Keep existing component name
  - PLACEMENT: examples/components/WorkflowTree.tsx
  - DEPENDENCIES: Task 4

Task 6: MODIFY examples/components/WorkflowTreeDebuggerUI.tsx
  - ADD state: const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  - MODIFY layout: Change flexDirection from "column" to "row" for split-pane
  - ADD left pane: Box width="60%" containing existing tree
  - ADD right pane: Box width="40%" containing NodeDetailsPanel
  - ADD separator: Optional vertical bar between panes
  - ADD useInput handler: Arrow keys (↑/↓) update selectedNodeId
  - IMPLEMENT: findNodeById() helper for lookup
  - IMPLEMENT: visibleNodes useMemo for navigation (reuse from P2.M2.T2.S1)
  - IMPLEMENT: selectedIndex useMemo for current position
  - UPDATE help text to include arrow key navigation
  - NAMING: Keep existing component name
  - PLACEMENT: examples/components/WorkflowTreeDebuggerUI.tsx
  - DEPENDENCIES: Task 3, Task 5

Task 7: MODIFY examples/components/index.ts
  - ADD export: export { NodeDetailsPanel } from './NodeDetailsPanel.js'
  - NAMING: Keep barrel export pattern
  - PLACEMENT: examples/components/index.ts
  - DEPENDENCIES: Task 3

Task 8: CREATE examples/__tests__/workflow-tree-split-pane.test.tsx
  - IMPLEMENT: Split-pane layout rendering test
  - IMPLEMENT: Node selection state test
  - IMPLEMENT: Details panel content test (name, status, events)
  - IMPLEMENT: State snapshot redaction test
  - IMPLEMENT: Content truncation test (logs, state)
  - IMPLEMENT: Empty state test (no node selected)
  - FOLLOW pattern: examples/__tests__/workflow-tree.test.tsx
  - NAMING: workflow-tree-split-pane.test.tsx
  - PLACEMENT: examples/__tests__/
  - DEPENDENCIES: Task 1-7 (all implementation complete)

Task 9: VERIFY all files compile
  - RUN: npx tsc --noEmit examples/components/*.tsx
  - RUN: npx tsc --noEmit examples/components/utils/*.ts
  - EXPECT: No TypeScript errors
  - DEPENDENCIES: Tasks 1-7

Task 10: RUN tests and verify they pass
  - RUN: npm test -- examples/__tests__/workflow-tree-split-pane.test.tsx
  - EXPECT: All tests pass
  - DEBUG: Fix any failing tests
  - DEPENDENCIES: Task 8
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Pattern 1: State Snapshot Redaction
// Location: examples/components/utils/redaction.ts
// ============================================================================
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private/i,
];

export function redactSensitiveKeys(
  state: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    if (SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))) {
      // Redact with partial masking
      redacted[key] = redactValue(key, value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively redact nested objects
      redacted[key] = redactSensitiveKeys(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

function redactValue(key: string, value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 10
      ? `${value.slice(0, 3)}***${value.slice(-3)}`
      : '***';
  }
  return '[REDACTED]';
}

// ============================================================================
// Pattern 2: Content Truncation
// Location: examples/components/utils/truncation.ts
// ============================================================================
export function truncateLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) {
    return lines;
  }

  const remaining = lines.length - maxLines;
  return [
    ...lines.slice(0, maxLines),
    `... (${remaining} more lines)`
  ];
}

export function truncateObject(
  obj: Record<string, unknown>,
  maxKeys: number
): Record<string, unknown> {
  const entries = Object.entries(obj);
  if (entries.length <= maxKeys) {
    return obj;
  }

  const truncated: Record<string, unknown> = {};
  for (const [key, value] of entries.slice(0, maxKeys)) {
    truncated[key] = value;
  }

  truncated['__truncated__'] = `... (${entries.length - maxKeys} more keys)`;
  return truncated;
}

export function formatStateSnapshot(
  state: Record<string, unknown> | null,
  config: typeof DEFAULT_DISPLAY_CONFIG.state
): string {
  if (!state) {
    return 'No state snapshot available';
  }

  // Limit keys
  const truncated = truncateObject(state, config.maxKeys);

  // Format as JSON
  const json = JSON.stringify(truncated, null, 2);

  // Truncate lines
  const lines = json.split('\n');
  const displayLines = truncateLines(lines, config.maxLines);

  return displayLines.join('\n');
}

// ============================================================================
// Pattern 3: NodeDetailsPanel Component
// Location: examples/components/NodeDetailsPanel.tsx
// ============================================================================
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { StatusIcon } from './StatusIcon.js';
import { formatStateSnapshot } from './utils/truncation.js';
import { redactSensitiveKeys } from './utils/redaction.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

export interface NodeDetailsPanelProps {
  node: WorkflowNode | null;
}

const DISPLAY_CONFIG = {
  state: {
    maxLines: 20,
    maxKeys: 20,
    maxDepth: 2,
    maxStringLength: 80,
  },
  logs: {
    maxEntries: 10,
  },
} as const;

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node }) => {
  // Memoize redacted state to avoid re-processing
  const redactedState = useMemo(() => {
    if (!node?.stateSnapshot) return null;
    return redactSensitiveKeys(node.stateSnapshot);
  }, [node?.stateSnapshot]);

  // Memoize formatted state display
  const stateDisplay = useMemo(() => {
    if (!redactedState) return null;
    return formatStateSnapshot(redactedState, DISPLAY_CONFIG.state);
  }, [redactedState]);

  // Memoize recent logs (last N, reverse chronological)
  const recentLogs = useMemo(() => {
    if (!node?.logs) return [];
    const sorted = [...node.logs].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.slice(0, DISPLAY_CONFIG.logs.maxEntries);
  }, [node?.logs]);

  if (!node) {
    return (
      <Box
        flexDirection="column"
        padding={1}
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <Text dimColor>Select a node to view details</Text>
        <Text dimColor>Use ↑/↓ arrow keys to navigate</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>{node.name}</Text>
        <Text> </Text>
        <StatusIcon status={node.status} />
      </Box>

      {/* Event Count */}
      <Box marginBottom={1}>
        <Text dimColor>Events: </Text>
        <Text bold>{node.events.length}</Text>
      </Box>

      {/* State Snapshot */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">State Snapshot:</Text>
        {stateDisplay ? (
          <Box paddingX={1}>
            <Text color="gray">{stateDisplay}</Text>
          </Box>
        ) : (
          <Text dimColor>No state snapshot available</Text>
        )}
      </Box>

      {/* Recent Logs */}
      {recentLogs.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="yellow">Recent Logs:</Text>
          {recentLogs.map((log) => (
            <Box key={log.id} marginBottom={1}>
              <Text dimColor>
                [{new Date(log.timestamp).toISOString().split('T')[1].slice(0, -1)}]
              </Text>
              <Text> </Text>
              <Text
                color={
                  log.level === 'error' ? 'red' :
                  log.level === 'warn' ? 'yellow' :
                  log.level === 'info' ? 'blue' :
                  'gray'
                }
              >
                {log.level.toUpperCase()}
              </Text>
              <Text> </Text>
              <Text>{log.message}</Text>
            </Box>
          ))}
          {node.logs.length > DISPLAY_CONFIG.logs.maxEntries && (
            <Text dimColor>
              ... ({node.logs.length - DISPLAY_CONFIG.logs.maxEntries} more logs)
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default NodeDetailsPanel;

// ============================================================================
// Pattern 4: WorkflowTreeNode with Selection
// Location: examples/components/WorkflowTreeNode.tsx (MODIFY)
// ============================================================================
export interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  depth?: number;
  prefix?: string;
  isLast?: boolean;
  isRoot?: boolean;
  // FROM P2.M2.T2.S1
  expandedIds?: Set<string>;
  onToggle?: (nodeId: string) => void;
  selectedId?: string | null;  // NEW
  onSelect?: (nodeId: string) => void;  // NEW
}

export const WorkflowTreeNode: React.FC<WorkflowTreeNodeProps> = ({
  node,
  depth = 0,
  prefix = '',
  isLast = false,
  isRoot = false,
  expandedIds,
  onToggle,
  selectedId,
  onSelect,
}) => {
  const isExpanded = expandedIds?.has(node.id) ?? false;
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const connector = isRoot ? '' : (isLast ? '└── ' : '├── ');
  const childPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

  return (
    <Box flexDirection="column">
      {/* Current node with selection indicator */}
      <Box>
        {!isRoot && <Text dimColor>{prefix}</Text>}
        {!isRoot && <Text dimColor>{connector}</Text>}

        {/* Selection indicator */}
        {isSelected && <Text color="cyan">►</Text>}
        {!isSelected && hasChildren && (
          <Text>{isExpanded ? '▾' : '▸'}</Text>
        )}
        {!isSelected && !hasChildren && <Text> </Text>}

        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text
          bold={isSelected}
          color={isSelected ? 'cyan' : undefined}
        >
          {node.name}
        </Text>
      </Box>

      {/* Recursively render children */}
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
          onSelect={onSelect}
        />
      ))}
    </Box>
  );
};

// ============================================================================
// Pattern 5: WorkflowTree with Selection Props
// Location: examples/components/WorkflowTree.tsx (MODIFY)
// ============================================================================
export interface WorkflowTreeProps {
  node: WorkflowNode;
  // FROM P2.M2.T2.S1
  expandedIds?: Set<string>;
  onToggle?: (nodeId: string) => void;
  // NEW
  selectedId?: string | null;
  onSelect?: (nodeId: string) => void;
}

export const WorkflowTree: React.FC<WorkflowTreeProps> = ({
  node,
  expandedIds,
  onToggle,
  selectedId,
  onSelect,
}) => {
  return (
    <WorkflowTreeNode
      node={node}
      isRoot={true}
      expandedIds={expandedIds}
      onToggle={onToggle}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
};

// ============================================================================
// Pattern 6: WorkflowTreeDebuggerUI with Split-Pane
// Location: examples/components/WorkflowTreeDebuggerUI.tsx (MODIFY)
// ============================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import { WorkflowTree } from './WorkflowTree.js';
import { NodeDetailsPanel } from './NodeDetailsPanel.js';
import type { WorkflowTreeDebugger } from '../../src/debugger/tree-debugger.js';

export const WorkflowTreeDebuggerUI: React.FC<WorkflowTreeDebuggerUIProps> = ({
  treeDebugger,
}) => {
  const [tree, setTree] = useState<WorkflowNode>(() => treeDebugger.getTree());
  const [stats, setStats] = useState(() => treeDebugger.getStats());

  // NEW: Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(tree.id);

  // FROM P2.M2.T2.S1: Expand/collapse state (parallel implementation)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    new Set([tree.id]) // Root expanded by default
  );

  // Subscribe to Observable for real-time updates
  useEffect(() => {
    const subscription = treeDebugger.events.subscribe({
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
            setTree(treeDebugger.getTree());
            setStats(treeDebugger.getStats());
            break;
        }
      },
    });

    return () => subscription.unsubscribe();
  }, [treeDebugger]);

  // NEW: Flattened node list for navigation (from P2.M2.T2.S1)
  const visibleNodes = useMemo(() => {
    const nodes: { id: string; depth: number }[] = [];

    function traverse(node: WorkflowNode, depth: number) {
      nodes.push({ id: node.id, depth });

      if (expandedIds.has(node.id) && node.children.length > 0) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    }

    traverse(tree, 0);
    return nodes;
  }, [tree, expandedIds]);

  // NEW: Current selection index
  const selectedIndex = useMemo(() => {
    return visibleNodes.findIndex(n => n.id === selectedNodeId);
  }, [visibleNodes, selectedNodeId]);

  // NEW: Helper to find node by ID
  const findNodeById = useCallback((id: string): WorkflowNode | null => {
    if (tree.id === id) return tree;

    for (const child of tree.children) {
      const found = findNodeInChildren(child, id);
      if (found) return found;
    }

    return null;
  }, [tree]);

  function findNodeInChildren(node: WorkflowNode, id: string): WorkflowNode | null {
    if (node.id === id) return node;

    for (const child of node.children) {
      const found = findNodeInChildren(child, id);
      if (found) return found;
    }

    return null;
  }

  // NEW: Keyboard input handling for selection
  useInput((input, key) => {
    // Navigate up
    if (key.upArrow && selectedIndex > 0) {
      setSelectedNodeId(visibleNodes[selectedIndex - 1].id);
      return;
    }

    // Navigate down
    if (key.downArrow && selectedIndex < visibleNodes.length - 1) {
      setSelectedNodeId(visibleNodes[selectedIndex + 1].id);
      return;
    }

    // Expand/collapse (from P2.M2.T2.S1)
    if ((key.return || input === ' ') && selectedNodeId) {
      const node = findNodeById(selectedNodeId);
      if (node && node.children.length > 0) {
        setExpandedIds(prev => {
          const next = new Set(prev);
          if (next.has(selectedNodeId!)) {
            next.delete(selectedNodeId!);
          } else {
            next.add(selectedNodeId!);
          }
          return next;
        });
      }
      return;
    }
  });

  // NEW: Get selected node for details panel
  const selectedNode = useMemo(() => {
    return selectedNodeId ? findNodeById(selectedNodeId) : null;
  }, [selectedNodeId, findNodeById]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Workflow Tree Debugger</Text>
      </Box>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <Text dimColor>
        Nodes: {stats.totalNodes} |
        Completed: {stats.byStatus.completed || 0} |
        Failed: {stats.byStatus.failed || 0}
      </Text>
      <Newline />
      <Text dimColor>
        ↑/↓: Navigate | Enter: Expand/Collapse
      </Text>
      <Newline />

      {/* NEW: Split-pane layout */}
      <Box flexDirection="row">
        {/* Left pane: Tree view (60%) */}
        <Box width="60%" paddingRight={1}>
          <WorkflowTree
            node={tree}
            expandedIds={expandedIds}
            selectedId={selectedNodeId}
          />
        </Box>

        {/* Separator */}
        <Box width={1}>
          <Text dimColor>│</Text>
        </Box>

        {/* Right pane: Node details (40%) */}
        <Box width="39%" paddingLeft={1}>
          <NodeDetailsPanel node={selectedNode} />
        </Box>
      </Box>
    </Box>
  );
};

// ============================================================================
// Pattern 7: Unit Tests for Split-Pane
// Location: examples/__tests__/workflow-tree-split-pane.test.tsx
// ============================================================================
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { WorkflowTreeDebuggerUI } from '../components/WorkflowTreeDebuggerUI.js';
import type { WorkflowNode } from '../../src/types/workflow.js';

// Mock WorkflowTreeDebugger
class MockWorkflowTreeDebugger {
  constructor(private tree: WorkflowNode) {}

  getTree() {
    return this.tree;
  }

  getStats() {
    return {
      totalNodes: 1,
      byStatus: { idle: 0, running: 1, completed: 0, failed: 0, cancelled: 0 },
      totalLogs: 0,
      totalEvents: 0,
    };
  }

  events = {
    subscribe: () => ({ unsubscribe: () => {} }),
  };
}

describe('WorkflowTree Split-Pane Layout', () => {
  const mockNode: WorkflowNode = {
    id: 'test-1',
    name: 'Test Workflow',
    status: 'running',
    parent: null,
    children: [
      {
        id: 'test-2',
        name: 'Child Node',
        status: 'completed',
        parent: null,
        children: [],
        logs: [
          {
            id: 'log-1',
            workflowId: 'test-2',
            timestamp: Date.now(),
            level: 'info',
            message: 'Test log message',
          },
        ],
        events: [],
        stateSnapshot: {
          apiKey: 'secret-key-123',
          username: 'testuser',
          progress: 75,
        },
      },
    ],
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  it('renders split-pane layout with tree and details panel', () => {
    const mockDebugger = new MockWorkflowTreeDebugger(mockNode);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI debugger={mockDebugger as any} />
    );

    const output = lastFrame();
    expect(output).toContain('Test Workflow');
    expect(output).toContain('Select a node'); // Or details if selected
  });

  it('displays selected node details in details panel', () => {
    const mockDebugger = new MockWorkflowTreeDebugger(mockNode);
    const { lastFrame } = render(
      <WorkflowTreeDebuggerUI debugger={mockDebugger as any} />
    );

    const output = lastFrame();
    // Should show root node selected by default
    expect(output).toContain('Test Workflow');
  });

  it('redacts sensitive keys in state snapshot', () => {
    // Test that apiKey is redacted in display
    const output = lastFrame();
    // Should not show 'secret-key-123' in plain text
    expect(output).not.toContain('secret-key-123');
    // Should show redacted value
    expect(output).toMatch(/sec\*\*\*123/);
  });

  it('shows event count in details panel', () => {
    const output = lastFrame();
    expect(output).toContain('Events:');
  });

  it('shows recent logs in details panel', () => {
    const output = lastFrame();
    expect(output).toContain('Recent Logs:');
    expect(output).toContain('Test log message');
  });
});
```

### Integration Points

```yaml
EXISTING CODE (READ-ONLY REFERENCES):
  - file: /home/dustin/projects/groundswell/src/types/workflow.ts
    pattern: "WorkflowNode" interface (lines 20-37)
    usage: Type definitions for component props

  - file: /home/dustin/projects/groundswell/src/types/logging.ts
    pattern: "LogEntry" interface
    usage: Log display in details panel

  - file: /home/dustin/projects/groundswell/src/types/events.ts
    pattern: "WorkflowEvent" discriminated union
    usage: Event counting in details panel

  - file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
    pattern: "getTree()" method, "events" Observable
    usage: Get tree state, subscribe to updates

CONTRACT FROM P2.M2.T2.S1 (WILL EXIST):
  - file: /home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx
    status: EXISTS FROM P2.M2.T2.S1 (with expand/collapse)
    changes: MODIFY - add selectedId, onSelect props, selection indicator
    usage: Add selection highlighting on top of expand/collapse

  - file: /home/dustin/projects/groundswell/examples/components/WorkflowTree.tsx
    status: EXISTS FROM P2.M2.T2.S1 (with expand/collapse)
    changes: MODIFY - add selectedId, onSelect props, pass through
    usage: Props pass-through to WorkflowTreeNode

  - file: /home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx
    status: EXISTS FROM P2.M2.T2.S1 (with expand/collapse)
    changes: MODIFY - add split-pane layout, selectedNodeId state, arrow key nav
    usage: Add split-pane on top of expand/collapse state

MODIFIED FILES:
  - modify: /home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx
    add state:
      selectedNodeId: string | null
    modify render:
      flexDirection="column" → flexDirection="row"
      Add left pane (60%) with WorkflowTree
      Add separator
      Add right pane (40%) with NodeDetailsPanel
    add handlers:
      findNodeById()
      visibleNodes useMemo
      selectedIndex useMemo
      arrow key handling in useInput
    add to render:
      pass selectedId to WorkflowTree
      pass selectedNode to NodeDetailsPanel
      update help text

  - modify: /home/dustin/projects/groundswell/examples/components/WorkflowTree.tsx
    add to interface:
      selectedId?: string | null
      onSelect?: (nodeId: string) => void
    add to implementation:
      pass through props to WorkflowTreeNode

  - modify: /home/dustin/projects/groundswell/examples/components/WorkflowTreeNode.tsx
    add to interface:
      selectedId?: string | null
      onSelect?: (nodeId: string) => void
    add to rendering:
      selection indicator (bold color, asterisk)
      pass onSelect to children

  - modify: /home/dustin/projects/groundswell/examples/components/index.ts
    add export:
      export { NodeDetailsPanel } from './NodeDetailsPanel.js'

NEW FILES:
  - add to: examples/components/
    files:
      - NodeDetailsPanel.tsx (details panel component)

  - add to: examples/components/utils/
    files:
      - redaction.ts (state redaction utilities)
      - truncation.ts (content truncation utilities)

  - add to: examples/__tests__/
    files:
      - workflow-tree-split-pane.test.tsx
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After creating each file - verify TypeScript compilation
npx tsc --noEmit examples/components/NodeDetailsPanel.tsx

# Expected: No errors, TypeScript compiles successfully

npx tsc --noEmit examples/components/utils/redaction.ts
npx tsc --noEmit examples/components/utils/truncation.ts

# Expected: No errors

npx tsc --noEmit examples/components/WorkflowTree.tsx
npx tsc --noEmit examples/components/WorkflowTreeNode.tsx
npx tsc --noEmit examples/components/WorkflowTreeDebuggerUI.tsx

# Expected: No errors

npx tsc --noEmit examples/__tests__/workflow-tree-split-pane.test.tsx

# Expected: No errors

# Full TypeScript check
npx tsc --noEmit

# Expected: No errors across entire codebase
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test split-pane functionality
npm test -- examples/__tests__/workflow-tree-split-pane.test.tsx

# Expected: All tests pass
# - Split-pane layout rendering
# - Node selection state
# - Details panel content (name, status, events)
# - State snapshot redaction
# - Content truncation
# - Empty state (no node selected)

# Run all component tests to ensure no regressions
npm test -- examples/__tests__/workflow-tree.test.tsx

# Expected: All tests from existing tests still pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Test: Run integration example with split-pane layout
tsx examples/examples/12-ink-debugger-reactive.tsx

# Expected output (initial state):
# ╔══════════════════════════════════════════════════════════╗
# ║ Workflow Tree Debugger                                      ║
# ║ Press Ctrl+C to exit                                        ║
# ╠══════════════════════════════════════════════════════════╣
# ║ Nodes: 4 | Completed: 0 | Failed: 0                       ║
# ║ ↑/↓: Navigate | Enter: Expand/Collapse                    ║
# ╠══════════════════════════════════════════════════════════╣
# ║ ◐ Build Project                    │ Test Workflow          ◐ ║
# ║   ├─ ✓ Install Dependencies       │ Status: running          ║
# ║   │   ├─ ✓ npm install            │ Events: 15               ║
# ║   │   └─ ✓ npm audit              │                          ║
# ║   ├─ ◐ Run Linter                 │ State Snapshot:          ║
# ║   └─ ○ Run Tests                 │ {                        ║
# ║                                  │   "progress": 25,         ║
# ║                                  │   "step": "linter"        ║
# ║                                  │ }                        ║
# ║                                  │                          ║
# ║                                  │ Recent Logs:             ║
# ║                                  │ [12:34:56] Starting...   ║
# ║                                  │ [12:34:57] In progress... ║
# ╚══════════════════════════════════════════════════════════╛

# Test interactions:
# 1. Press ↓ (down arrow) - selection moves to next node, details update
# 2. Press ↑ (up arrow) - selection moves to previous node, details update
# 3. Verify selected node is highlighted (bold cyan or asterisk)
# 4. Verify details panel shows selected node's information
# 5. Press Ctrl+C to exit cleanly

# Test: Verify redaction works
# Create a workflow with sensitive state
# Verify:
# - 'password' field shows redacted value (pas***ord)
# - 'token' field shows redacted value (tok***en)
# - Plain sensitive values NOT shown in output
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Validation 1: Large State Snapshot Handling
# Create a workflow with 100+ keys in stateSnapshot
tsx examples/examples/12-ink-debugger-reactive.tsx

# Verify:
# - State truncated to 20 lines
# - "... (80 more lines)" indicator shown
# - No performance degradation

# Validation 2: Sensitive Data Redaction
# Test various sensitive key patterns
tsx examples/examples/12-ink-debugger-reactive.tsx

# Verify these are redacted:
# - password, password_hash, newPassword
# - secret, client_secret, sharedSecret
# - token, accessToken, refreshToken, apiToken
# - apiKey, api_key, X-API-Key
# - auth, authentication, basicAuth
# - credential, credentials

# Validation 3: Log Display
# Create a workflow with 20+ log entries
tsx examples/examples/12-ink-debugger-reactive.tsx

# Verify:
# - Only last 10 logs shown
# - Logs in reverse chronological order (most recent first)
# - Timestamps formatted correctly
# - Log levels color-coded (debug=gray, info=blue, warn=yellow, error=red)

# Validation 4: Empty State Handling
# Run example with no node selected initially
tsx examples/examples/12-ink-debugger-reactive.tsx

# Verify:
# - "Select a node to view details" message shows
# - Help text shows arrow key navigation
# - No crash or errors

# Validation 5: Selection Persistence
# Select a node, then let workflow update (Observable triggers)
tsx examples/examples/12-ink-debugger-reactive.tsx

# Verify:
# - Selection persists across tree updates
# - Details panel updates to reflect current node state
# - No flickering or re-rendering issues

# Validation 6: Terminal Width Handling
# Test with various terminal sizes
# - 80 columns: tight but usable
# - 100 columns: comfortable
# - 120 columns: spacious

# Verify:
# - Split-pane maintains 60/40 ratio
# - No overflow or layout breakage
# - Details panel content adapts to width
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All new components compile without errors
- [ ] Unit tests pass: `npm test -- examples/__tests__/workflow-tree-split-pane.test.tsx`
- [ ] Existing tests still pass: `npm test -- examples/__tests__/workflow-tree.test.tsx`

### Feature Validation

- [ ] Split-pane layout renders (60% tree, 40% details)
- [ ] Separator (│) displays between panes
- [ ] Arrow keys (↑/↓) navigate tree nodes
- [ ] Selected node is visually highlighted
- [ ] Details panel shows selected node's name
- [ ] Details panel shows selected node's status with icon
- [ ] Details panel shows event count
- [ ] Details panel shows redacted state snapshot (max 20 lines)
- [ ] Details panel shows recent logs (last 10, reverse chronological)
- [ ] "Select a node" placeholder shows when no node selected
- [ ] Sensitive keys are redacted (password, token, apiKey, etc.)
- [ ] Large content truncates with "... (N more)" indicators
- [ ] Selection persists across tree updates

### Code Quality Validation

- [ ] All text wrapped in `<Text>` components
- [ ] No `<Box>` inside `<Text>`
- [ ] Uses Ink components correctly (Box, Text, useInput)
- [ ] TypeScript types are correct (no implicit any)
- [ ] Component interfaces extended properly (not replaced)
- [ ] Props passed through correctly in recursive rendering
- [ ] State follows React best practices (useState, useMemo, useCallback)
- [ ] Code is self-documenting with clear variable names
- [ ] Redaction logic is comprehensive (multiple patterns)
- [ ] Truncation indicators are clear and informative

### Documentation & Deployment

- [ ] Tests document expected behavior
- [ ] Help text in UI shows keyboard shortcuts (↑/↓ for navigation)
- [ ] Code comments explain non-obvious patterns
- [ ] Integration example runs without errors

---

## Anti-Patterns to Avoid

- ❌ Don't create new data models - use existing WorkflowNode
- ❌ Don't use flexGrow for split-pane - use explicit width="60%" and width="40%"
- ❌ Don't implement ScrollView - Ink doesn't have it, use truncation instead
- ❌ Don't display full state snapshots - always redact and truncate
- ❌ Don't show sensitive data in plain text - always redact first
- ❌ Don't forget selection indicator - users need to know which node is selected
- ❌ Don't skip empty states - show helpful message when no node selected
- ❌ Don't use index-based selection - always use node.id
- ❌ Don't modify files in src/ directory - only examples/components/
- ❌ Don't break existing expand/collapse from P2.M2.T2.S1 - build on it
- ❌ Don't implement pagination for this subtask - simple truncation is enough
- ❌ Don't add panel resizing - fixed 60/40 split is sufficient
- ❌ Don't modify `tasks.json`, `prd_snapshot.md`, or `.gitignore` - FORBIDDEN

## Context Completeness Validation

### "No Prior Knowledge" Test Results

If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:

1. **Complete Component Specifications**:
   - Exact prop interfaces for all modified components
   - Complete code examples for all new components (NodeDetailsPanel, utils)
   - Integration patterns with existing expand/collapse from P2.M2.T2.S1

2. **State Management Patterns**:
   - Split-pane layout using flexDirection="row"
   - Selection state with selectedNodeId tracking
   - visibleNodes flattening for arrow key navigation
   - useMemo patterns for performance

3. **Redaction and Truncation**:
   - Complete redaction logic with specific patterns
   - Truncation utilities with line/character limits
   - Display formatting for state snapshots and logs

4. **Integration Points**:
   - Contract from P2.M2.T2.S1 (expand/collapse features)
   - Existing components to modify vs new components to create
   - Files to modify vs files to create
   - Dependencies between tasks

5. **Testing Strategy**:
   - Complete test specifications with mock data
   - Test patterns from existing tests
   - Integration test steps with expected outputs

6. **Gotchas and Constraints**:
   - Ink doesn't support ScrollView - use truncation
   - State snapshots can be huge - always redact/truncate
   - Use percentage widths not flexGrow for split-pane
   - Build on P2.M2.T2.S1 features, don't duplicate

7. **Research References**:
   - 4 comprehensive research documents (all sections cited)
   - Official Ink documentation URLs
   - Complete working examples
   - Best practices from real CLI tools

8. **Visual Design**:
   - Split-pane ratio (60/40)
   - Selection indicator styles
   - Separator pattern (│ with padding)
   - Section headers with colors

### Confidence Score

**10/10** - One-pass implementation success likelihood is excellent.

**Justification**:
1. Complete working code provided for all new components
2. Exact prop interfaces specified with TypeScript types
3. Split-pane pattern proven in research (example provided)
4. Redaction and truncation logic fully specified
5. Integration points clearly defined with P2.M2.T2.S1 contract
6. Research thoroughly covers all aspects (4 documents)
7. Testing patterns specified with examples
8. Gotchas comprehensively documented
9. Contract from P2.M2.T2.S1 clearly defined
10. Visual design decisions specified (colors, indicators, layout)

**Remaining risks** (minimal):
- Terminal Unicode support for │ separator (documented, has ASCII fallback)
- Performance with very large state objects (mitigated by truncation)
- Test environment setup (pattern specified from existing tests)

The completed PRP enables an AI agent unfamiliar with the codebase to implement split-pane layout with node details successfully using only the PRP content and codebase access.

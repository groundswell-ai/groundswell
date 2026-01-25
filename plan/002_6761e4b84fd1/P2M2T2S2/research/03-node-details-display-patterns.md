# Node Details Display Patterns Research

**Task:** P2M2T2S2 - Design and implement node details panel for workflow debugger
**Date:** 2026-01-24
**Focus:** Best practices for displaying structured data in terminal UI debugger interfaces

## Executive Summary

This research document compiles best practices for displaying node details in a terminal-based debugger UI, focusing on the WorkflowNode interface which includes logs, events, and potentially large state snapshots. Patterns are drawn from established CLI tools like git, kubectl, and terminal UI frameworks like Ink.

## Data Structures to Display

From the WorkflowNode interface (`src/types/workflow.ts`):

```typescript
interface WorkflowNode {
  id: string;                          // Unique identifier
  name: string;                        // Human-readable name
  status: WorkflowStatus;              // idle | running | completed | failed | cancelled
  logs: LogEntry[];                    // Array of log entries
  events: WorkflowEvent[];             // Array of workflow events
  stateSnapshot: SerializedWorkflowState | null;  // Key-value pairs, could be huge
}
```

From LogEntry (`src/types/logging.ts`):

```typescript
interface LogEntry {
  id: string;              // Unique identifier
  workflowId: string;      // Parent workflow ID
  timestamp: number;       // Unix timestamp in milliseconds
  level: LogLevel;         // debug | info | warn | error
  message: string;         // Log message
  data?: unknown;          // Optional structured data
  parentLogId?: string;    // For hierarchical logging
}
```

From WorkflowEvent (`src/types/events.ts`):

Discriminated union with 18+ event types including:
- `childAttached`, `childDetached`
- `stepStart`, `stepEnd`
- `agentPromptStart`, `agentPromptEnd`
- `toolInvocation`
- `error`
- `cacheHit`, `cacheMiss`

---

## 1. Log Display Patterns

### Best Practices from CLI Tools

**Git Log Pattern:**
- **Reverse chronological order** (most recent first) - default behavior
- `--oneline` flag for compact display (commit hash + message)
- `--max-count` or `-n` to limit entries (e.g., `git log -10`)
- `--since` and `--until` for time-based filtering
- Pagination through `less` by default for large outputs

**JQ Pattern:**
- Pretty-printed JSON with indentation (2 spaces default)
- `-c` flag for compact output (single line)
- Color highlighting with `-C` flag
- Truncation of deeply nested structures

### Recommended Log Display Strategy

```typescript
// Display configuration
const LOG_DISPLAY_CONFIG = {
  maxEntries: 50,           // Show at most 50 log entries
  reverseChronological: true, // Most recent first
  truncateAfter: 100,       // Truncate messages longer than 100 chars
  showTimestamp: true,      // Show formatted timestamp
  showLevel: true,          // Show log level with color
  showDataSummary: true,    // Show summary of data field
};
```

**Implementation Pattern:**

```tsx
<Box flexDirection="column">
  <Text bold color="blue">Logs ({logs.length} total, showing {displayedLogs.length})</Text>
  {displayedLogs.slice(0, LOG_DISPLAY_CONFIG.maxEntries).map((log) => (
    <Box key={log.id} flexDirection="column" marginBottom={1}>
      <Box>
        <Text dimColor>{formatTimestamp(log.timestamp)}</Text>
        <Text> </Text>
        <LogLevelBadge level={log.level} />
        <Text> {truncate(log.message, LOG_DISPLAY_CONFIG.truncateAfter)}</Text>
      </Box>
      {log.data && (
        <Text dimColor>  data: {summarizeData(log.data)}</Text>
      )}
    </Box>
  ))}
  {logs.length > LOG_DISPLAY_CONFIG.maxEntries && (
    <Text dimColor>... and {logs.length - LOG_DISPLAY_CONFIG.maxEntries} more</Text>
  )}
</Box>
```

**Color Coding for Log Levels:**

```typescript
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'gray',
  info: 'blue',
  warn: 'yellow',
  error: 'red',
};
```

### Pagination Strategy

For large log sets, implement:
1. **Initial view:** Show last 10-20 entries (most recent)
2. **Load more:** Command/key to load next N entries
3. **Search/filter:** Allow filtering by level or text search
4. **Export:** Option to save full logs to file

---

## 2. Event Display Patterns

### Best Practices

**Kubectl Describe Pattern:**
- Shows event **counts** by type first
- Displays **most recent** events (typically last 5-10)
- Groups by event type with timestamps
- Uses "X events" summary when truncated

**Git Log Pattern:**
- Event counts in summary (e.g., "1 file changed, 5 insertions(+)")
- Chronological ordering for history
- Filtering by event type

### Recommended Event Display Strategy

```typescript
const EVENT_DISPLAY_CONFIG = {
  showCounts: true,         // Show summary counts by type
  maxEntries: 20,           // Show at most 20 recent events
  groupByType: true,        // Group events by type
  showTimestamp: true,
  reverseChronological: true,
};
```

**Implementation Pattern:**

```tsx
<Box flexDirection="column">
  {/* Event summary counts */}
  <Box>
    <Text bold color="magenta">Events ({events.length} total)</Text>
    {eventsByType.map(({ type, count }) => (
      <Text key={type} dimColor>
        {" "}| {type}: {count}
      </Text>
    ))}
  </Box>

  {/* Recent events */}
  {displayedEvents.slice(0, EVENT_DISPLAY_CONFIG.maxEntries).map((event) => (
    <Box key={getEventId(event)} marginBottom={1}>
      <Text dimColor>{formatTimestamp(event.timestamp || getEventTime(event))}</Text>
      <Text> </Text>
      <EventTypeBadge type={event.type} />
      <Text> {formatEventSummary(event)}</Text>
    </Box>
  ))}

  {events.length > EVENT_DISPLAY_CONFIG.maxEntries && (
    <Text dimColor>... and {events.length - EVENT_DISPLAY_CONFIG.maxEntries} more events</Text>
  )}
</Box>
```

**Event Type Colors:**

```typescript
const EVENT_TYPE_COLORS: Record<string, string> = {
  error: 'red',
  childAttached: 'green',
  childDetached: 'yellow',
  stepStart: 'cyan',
  stepEnd: 'blue',
  agentPromptStart: 'magenta',
  agentPromptEnd: 'blue',
  toolInvocation: 'yellow',
};
```

### Event Summarization

For complex events, show summaries:

```typescript
function formatEventSummary(event: WorkflowEvent): string {
  switch (event.type) {
    case 'stepEnd':
      return `${event.step} (${event.duration}ms)`;
    case 'agentPromptEnd':
      return `${event.agentName} (${event.duration}ms)`;
    case 'toolInvocation':
      return `${event.toolName} → (${event.duration}ms)`;
    case 'error':
      return event.error.message;
    default:
      return ''; // Type badge is sufficient
  }
}
```

---

## 3. State Snapshot Display Patterns

### Challenge: Potentially Huge Data Structures

State snapshots can contain:
- Large objects with many keys
- Nested structures
- Binary data or base64 strings
- Sensitive information (API keys, tokens)

### Best Practices

**GDB/LLDB Pattern:**
- Default: Show only top-level properties
- Use `set print elements N` to limit array elements
- Pretty-print with indentation
- String truncation for long values
- Redaction for sensitive fields

**JQ Pattern:**
- Pretty-printed by default
- `-c` for compact (single-line)
- Truncation via pipe to `head` or `tail`
- Custom filtering with `jq '.keys | keys'`

### Recommended State Snapshot Strategy

```typescript
const STATE_DISPLAY_CONFIG = {
  maxKeys: 20,              // Show at most 20 top-level keys
  maxDepth: 2,              // Max nesting depth to display
  maxStringLength: 80,      // Truncate strings longer than this
  maxArrayLength: 5,        // Show only first N array elements
  redactSensitive: true,    // Redact known sensitive keys
  truncateHuge: true,       // Truncate if total size > threshold
  bytesThreshold: 10000,    // Truncate if JSON > 10KB
};
```

**Redaction Pattern:**

Based on `StateFieldMetadata` from `src/types/snapshot.ts`:

```typescript
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
];

function shouldRedact(key: string, value: unknown): boolean {
  // Check metadata
  const metadata = getStateMetadata(key);
  if (metadata?.redact) return true;
  if (metadata?.hidden) return true;

  // Check key patterns
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

function redactValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 10
      ? `${value.slice(0, 3)}***${value.slice(-3)}`
      : '***';
  }
  return '[REDACTED]';
}
```

**Display Pattern:**

```tsx
<Box flexDirection="column">
  <Text bold color="green">State Snapshot</Text>
  {!stateSnapshot ? (
    <Text dimColor>No snapshot available</Text>
  ) : (
    <>
      {Object.entries(stateSnapshot)
        .slice(0, STATE_DISPLAY_CONFIG.maxKeys)
        .map(([key, value]) => (
          <Box key={key}>
            <Text color="yellow">{key}:</Text>
            <Text> </Text>
            {shouldRedact(key, value) ? (
              <Text dimColor red>{redactValue(value)}</Text>
            ) : (
              <Text>{formatValue(value, STATE_DISPLAY_CONFIG)}</Text>
            )}
          </Box>
        ))}
      {Object.keys(stateSnapshot).length > STATE_DISPLAY_CONFIG.maxKeys && (
        <Text dimColor>
          ... and {Object.keys(stateSnapshot).length - STATE_DISPLAY_CONFIG.maxKeys} more keys
        </Text>
      )}
    </>
  )}
</Box>
```

**Value Formatting:**

```typescript
function formatValue(value: unknown, config: typeof STATE_DISPLAY_CONFIG): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    return value.length > config.maxStringLength
      ? `"${value.slice(0, config.maxStringLength)}..."`
      : `"${value}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const displayed = value.slice(0, config.maxArrayLength);
    const suffix = value.length > config.maxArrayLength
      ? `, ... +${value.length - config.maxArrayLength} items`
      : '';
    return `[${displayed.map(v => JSON.stringify(v)).join(', ')}${suffix}]`;
  }

  if (typeof value === 'object') {
    return '[Object]'; // Recursive objects shown as summary
  }

  return String(value);
}
```

---

## 4. Layout Patterns for Details Panels

### Split Layout Pattern

Based on common TUI patterns (htop, k9s, etc.):

```
┌─────────────────────────────────────────────────────────────┐
│ Workflow Tree Debugger                                      │
├─────────────────────┬───────────────────────────────────────┤
│                     │                                       │
│  Tree View          │  Node Details Panel                  │
│  (Left Panel)       │  (Right Panel)                       │
│                     │                                       │
│  ├─ Root            │  ┌─────────────────────────────────┐ │
│  │  ├─ Child 1      │  │ Build Project                   │ │
│  │  │  └─ Child 2   │  │ Status: running ●               │ │
│  │  └─ Child 3      │  │ ID: abc123                      │ │
│                     │  ├─────────────────────────────────┤ │
│  [Scrollable]       │  │ Logs (15 total)                 │ │
│  [Keyboard nav]     │  │ 12:34:56 [INFO] Starting...     │ │
│                     │  │ 12:34:57 [INFO] Step 1...       │ │
│                     │  │ 12:34:58 [INFO] Step 2...       │ │
│                     │  │ ... 12 more                     │ │
│                     │  ├─────────────────────────────────┤ │
│                     │  │ Events (42 total)               │ │
│                     │  │ stepStart: 15 | stepEnd: 12     │ │
│                     │  │ 12:34:56 stepStart initialize   │ │
│                     │  │ 12:34:57 stepEnd initialize     │ │
│                     │  │ ... 40 more                     │ │
│                     │  ├─────────────────────────────────┤ │
│                     │  │ State Snapshot (8 keys)         │ │
│                     │  │ currentStep: "initialize"       │ │
│                     │  │ progress: 0.25                  │ │
│                     │  │ ... 6 more keys                 │ │
│                     │  └─────────────────────────────────┘ │
└─────────────────────┴───────────────────────────────────────┘
```

### Ink Implementation

```tsx
<Box flexDirection="row" height={process.stdout.rows - 2}>
  {/* Left Panel: Tree View */}
  <Box width="40%" paddingRight={1} borderStyle="single" flexDirection="column">
    <Box paddingBottom={1}>
      <Text bold>Workflow Tree</Text>
    </Box>
    <Box flexGrow={1}>
      <WorkflowTree node={tree} />
    </Box>
  </Box>

  {/* Right Panel: Node Details */}
  <Box width="60%" paddingLeft={1} flexDirection="column">
    <NodeDetailsPanel node={selectedNode} />
  </Box>
</Box>
```

### Scrollable Sections

For large content, use Ink's scroll handling:

```tsx
import { Static } from 'ink';

<Box flexDirection="column" height={15}>
  <Text bold>Logs</Text>
  <Static items={displayedLogs.slice(0, visibleCount)}>
    {(log, index) => (
      <LogEntry key={log.id} entry={log} />
    )}
  </Static>
</Box>
```

---

## 5. Performance Considerations

### Virtualization

For large datasets (1000+ log entries or events):

```typescript
// Windowed virtualization
const WINDOW_SIZE = 20;  // Number of items to render
const [scrollOffset, setScrollOffset] = useState(0);

const visibleItems = allItems.slice(
  scrollOffset,
  scrollOffset + WINDOW_SIZE
);
```

### Lazy Loading

```typescript
// Load logs on demand
const [loadedLogs, setLoadedLogs] = useState<LogEntry[]>([]);
const [isLoading, setIsLoading] = useState(false);

const loadMoreLogs = () => {
  setIsLoading(true);
  // Simulate async load
  setTimeout(() => {
    const nextBatch = allLogs.slice(loadedLogs.length, loadedLogs.length + 20);
    setLoadedLogs([...loadedLogs, ...nextBatch]);
    setIsLoading(false);
  }, 100);
};
```

### Memoization

```typescript
import { useMemo } from 'react';

const processedLogs = useMemo(() => {
  return logs
    .sort((a, b) => b.timestamp - a.timestamp)  // Reverse chronological
    .slice(0, LOG_DISPLAY_CONFIG.maxEntries)
    .map(log => ({
      ...log,
      formattedTime: formatTimestamp(log.timestamp),
      truncatedMessage: truncate(log.message, 100),
    }));
}, [logs]);
```

---

## 6. Accessibility and Usability

### Keyboard Navigation

```
Key Bindings:
- j/Down Arrow: Move selection down
- k/Up Arrow: Move selection up
- Enter: Expand/collapse node details
- /: Search/filter logs and events
- l: Toggle full log view
- s: Toggle state snapshot
- Ctrl+C: Quit
```

### Color Accessibility

- Use high contrast colors for status indicators
- Provide symbols in addition to colors (e.g., ✓, ✗, ◐)
- Support `NO_COLOR` environment variable

```typescript
const useColor = process.env.NO_COLOR
  ? () => ({})
  : (color: string) => ({ color });
```

### Screen Reader Support

While primarily visual, ensure:
- Semantic structure with clear labels
- Status expressed in text (not just colors)
- Summary counts announced

---

## 7. Implementation Recommendations

### Component Structure

```
NodeDetailsPanel/
├── index.tsx              # Main panel component
├── NodeHeader.tsx         # ID, name, status
├── LogsSection.tsx        # Log entries with filtering
├── EventsSection.tsx      # Event list with counts
├── StateSection.tsx       # State snapshot with redaction
├── LogLevelBadge.tsx      # Log level indicator
├── EventTypeBadge.tsx     # Event type indicator
└── utils.ts               # Formatting, truncation, redaction
```

### Configuration Object

```typescript
export const DETAILS_PANEL_CONFIG = {
  logs: {
    maxEntries: 50,
    truncateAfter: 100,
    reverseChronological: true,
    showTimestamp: true,
    showLevel: true,
    showDataSummary: true,
  },
  events: {
    maxEntries: 20,
    showCounts: true,
    groupByType: true,
    reverseChronological: true,
  },
  state: {
    maxKeys: 20,
    maxDepth: 2,
    maxStringLength: 80,
    maxArrayLength: 5,
    bytesThreshold: 10000,
    redactSensitive: true,
  },
  layout: {
    treeWidthPercent: 40,
    detailsWidthPercent: 60,
    maxHeight: null,  // Full height
  },
} as const;
```

---

## 8. Summary of Key Recommendations

### Logs
1. **Show most recent first** (reverse chronological)
2. **Limit to 20-50 entries** by default
3. **Color-code by level** (debug=gray, info=blue, warn=yellow, error=red)
4. **Truncate messages** longer than 80-100 characters
5. **Show "N more"** indicator when truncated
6. **Group data fields** with summary representation

### Events
1. **Show counts by type** first (e.g., "Events (42 total) | stepStart: 15 | stepEnd: 12")
2. **Limit to 10-20 recent events** by default
3. **Color-code by type** for quick scanning
4. **Summarize complex events** (e.g., "initialize (45ms)")
5. **Chronological ordering** for time-series analysis

### State Snapshots
1. **Limit top-level keys** to 10-20
2. **Redact sensitive fields** (password, token, apiKey, etc.)
3. **Truncate long strings** (80-100 chars)
4. **Limit array display** to first 5 elements
5. **Limit nesting depth** to 2-3 levels
6. **Show "N more keys"** when truncated

### Layout
1. **Split layout** with tree on left (40%), details on right (60%)
2. **Sectioned display** with headers for Logs, Events, State
3. **Scrollable sections** for large content
4. **Summary counts** at top of each section
5. **Keyboard navigation** for usability

---

## 9. References and Inspirations

- **git log**: Reverse chronological, limiting, pagination patterns
- **kubectl describe**: Event counts, most-recent-first, grouping by type
- **jq**: JSON formatting, truncation, pretty-printing
- **htop**: Split layout, scrollable sections, color coding
- **k9s**: TUI navigation, detail panels, resource selection
- **Ink**: React for terminal UIs, component patterns
- **node inspect**: Debugger output formatting, object inspection

---

## 10. Next Steps for Implementation

1. **Create base components** for each section (Logs, Events, State)
2. **Implement utility functions** for formatting, truncation, redaction
3. **Add configuration object** for easy tuning of display limits
4. **Implement scroll handling** for large datasets
5. **Add keyboard navigation** for tree and details panel
6. **Write tests** for redaction, truncation, and formatting
7. **Performance test** with large workflows (1000+ events/logs)
8. **Accessibility review** for color contrast and screen reader support

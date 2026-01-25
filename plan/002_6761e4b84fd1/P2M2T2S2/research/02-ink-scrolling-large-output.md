# Ink Scrolling and Large Output Handling Research

> Research for handling scrolling and large output in Ink split-pane details panel.
>
> **Context**: The split-pane details panel will display:
> - `node.name`
> - `node.status`
> - `node.stateSnapshot` (redacted/large data)
> - Recent logs
> - Event count
>
> This document covers scrolling patterns, truncation strategies, and best practices for displaying large content in terminal UIs.

---

## Table of Contents

1. [Core Ink Scrolling Patterns](#1-core-ink-scrolling-patterns)
2. [The `<Static>` Component](#2-the-static-component)
3. [Third-Party Scroll Components](#3-third-party-scroll-components)
4. [Truncating Large Output](#4-truncating-large-output)
5. [Pagination Patterns](#5-pagination-patterns)
6. [State Snapshot Redaction](#6-state-snapshot-redaction)
7. [Best Practices](#7-best-practices)
8. [Code Examples](#8-code-examples)
9. [References](#9-references)

---

## 1. Core Ink Scrolling Patterns

### 1.1 Box Overflow Property

Ink's `<Box>` component supports basic overflow control:

```tsx
import { Box, Text } from 'ink';

// Hide overflow content (clip to box dimensions)
<Box overflow="hidden" height={10}>
  <Text>Long content that will be clipped...</Text>
</Box>

// Default behavior: content expands freely
<Box>
  <Text>Content will expand as needed</Text>
</Box>
```

**Key Points:**
- `overflow="hidden"` clips content to the specified `height`
- No built-in scroll controls (no native scrollbar in terminals)
- Content is simply cut off at the boundary
- Works well for static content with known maximum height

**Limitations:**
- No interactive scrolling (can't scroll with arrow keys)
- No visual indication that content is clipped
- Not suitable for content that users need to navigate

### 1.2 Manual Scrolling with State

Implement scrolling by tracking an offset and rendering a window of content:

```tsx
import { useState } from 'react';
import { Box, Text } from 'ink';

const ScrollableList = ({ items, visibleCount = 10 }) => {
  const [offset, setOffset] = useState(0);

  return (
    <Box flexDirection="column" height={visibleCount}>
      {items.slice(offset, offset + visibleCount).map((item, index) => (
        <Text key={index}>
          {offset + index + 1}. {item}
        </Text>
      ))}
      <Text dimColor>
        Showing {offset + 1}-{Math.min(offset + visibleCount, items.length)} of {items.length}
      </Text>
    </Box>
  );
};
```

**Use Case**: Simple list display when you need to show many items in limited space.

---

## 2. The `<Static>` Component

### 2.1 Purpose and Behavior

The `<Static>` component is designed for content that:
- Doesn't change frequently
- Should remain fixed in position
- Accumulates over time (logs, completed tasks)

**Key Characteristics:**
- Items are **not re-rendered** once added
- Only new items are rendered
- Prevents flickering for historical data
- Perfect for logs, test results, output history

### 2.2 Basic Usage

```tsx
import { Static, Box, Text } from 'ink';
import { useState, useEffect } from 'react';

const LogViewer = () => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => [...prev, `Log entry ${prev.length + 1}`]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Static items={logs}>
        {(log, index) => (
          <Box key={index}>
            <Text dimColor>[{index}]</Text>
            <Text> {log}</Text>
          </Box>
        )}
      </Static>

      <Box marginTop={1}>
        <Text color="yellow" bold>
          Total logs: {logs.length}
        </Text>
      </Box>
    </>
  );
};
```

### 2.3 Static vs. Dynamic Content

```tsx
// Static: Historical logs (don't re-render)
<Static items={historicalLogs}>
  {(log) => <LogEntry key={log.id} log={log} />}
</Static>

// Dynamic: Current status (re-renders on change)
<Box>
  <Text>Status: {currentStatus}</Text>
</Box>
```

**Best Practice**: Use `<Static>` for any content that:
- Accumulates over time
- Has already been processed/completed
- Doesn't need to update its display

### 2.4 Limitations of `<Static>`

- **No scrolling**: Items stay in place as they're added
- **No truncation**: Old items remain visible (can push content off-screen)
- **Not interactive**: Can't navigate through historical items

**Workaround**: Combine `<Static>` with manual pagination for large logs:

```tsx
const PaginatedLogs = ({ logs, pageSize = 50 }) => {
  const [page, setPage] = useState(0);

  const paginatedLogs = logs.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <>
      <Static items={paginatedLogs}>
        {(log) => <LogEntry log={log} />}
      </Static>
      <Text>
        Page {page + 1} of {Math.ceil(logs.length / pageSize)}
      </Text>
    </>
  );
};
```

---

## 3. Third-Party Scroll Components

### 3.1 ink-scroll-view

**Repository**: https://github.com/jbrowne5/ink-scroll-view

A scrollable container component for Ink that supports:
- Arrow key navigation
- Mouse wheel scrolling
- Customizable scroll indicators

```tsx
import ScrollView from 'ink-scroll-view';

<ScrollView height={10}>
  <Text>
    Very long content that can be scrolled with arrow keys or mouse wheel...
  </Text>
</ScrollView>
```

**Features:**
- Keyboard navigation (up/down arrows)
- Mouse wheel support
- Configurable height
- Scroll position indicators

**Installation:**
```bash
npm install ink-scroll-view
```

### 3.2 ink-scroll-list

**Repository**: https://github.com/cameronhunter/ink-scroll-list

A scrollable list component with item selection:

```tsx
import ScrollList from 'ink-scroll-list';

<ScrollList items={items} onSelect={(item) => console.log(item)} />
```

**Features:**
- Arrow key navigation
- Item selection
- Custom item rendering
- Scroll position tracking

### 3.3 Pros and Cons

| Component | Pros | Cons |
|-----------|------|------|
| **ink-scroll-view** | Full scrolling support, mouse support | Additional dependency |
| **ink-scroll-list** | Optimized for lists, selection built-in | Less flexible for custom layouts |
| **Manual implementation** | Full control, no dependencies | More code to maintain |

**Recommendation**: Use third-party components for complex scrolling needs, manual implementation for simple cases.

---

## 4. Truncating Large Output

### 4.1 Line-Based Truncation

Simple line counting with indicator:

```tsx
import { Text } from 'ink';

interface TruncatedTextProps {
  text: string;
  maxLines: number;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({ text, maxLines }) => {
  const lines = text.split('\n');

  if (lines.length <= maxLines) {
    return <Text>{text}</Text>;
  }

  const visibleLines = lines.slice(0, maxLines);
  const remainingCount = lines.length - maxLines;

  return (
    <>
      <Text>{visibleLines.join('\n')}</Text>
      <Text dimColor color="yellow">
        {'\n'}... ({remainingCount} more lines)
      </Text>
    </>
  );
};
```

### 4.2 Character-Based Truncation

Truncate by total character count:

```tsx
interface TruncateByCharsProps {
  text: string;
  maxChars: number;
  suffix?: string;
}

const TruncateByChars: React.FC<TruncateByCharsProps> = ({
  text,
  maxChars,
  suffix = '...'
}) => {
  if (text.length <= maxChars) {
    return <Text>{text}</Text>;
  }

  const truncated = text.slice(0, maxChars - suffix.length);

  return (
    <Text>
      {truncated}
      <Text dimColor>{suffix}</Text>
    </Text>
  );
};
```

### 4.3 JSON Pretty-Print Truncation

For formatted JSON output:

```tsx
interface TruncatedJsonProps {
  data: unknown;
  maxLines: number;
}

const TruncatedJson: React.FC<TruncatedJsonProps> = ({ data, maxLines }) => {
  const jsonString = JSON.stringify(data, null, 2);
  const lines = jsonString.split('\n');

  if (lines.length <= maxLines) {
    return <Text>{jsonString}</Text>;
  }

  const visibleLines = lines.slice(0, maxLines);

  return (
    <Box flexDirection="column">
      <Text color="cyan">{visibleLines.join('\n')}</Text>
      <Text dimColor color="yellow">
        ... ({lines.length - maxLines} more lines, {jsonString.length} chars total)
      </Text>
    </Box>
  );
};
```

### 4.4 Smart Truncation (Middle)

Truncate from the middle (useful for long strings):

```tsx
interface TruncateMiddleProps {
  text: string;
  maxChars: number;
  separator?: string;
}

const TruncateMiddle: React.FC<TruncateMiddleProps> = ({
  text,
  maxChars,
  separator = '...'
}) => {
  if (text.length <= maxChars) {
    return <Text>{text}</Text>;
  }

  const startLength = Math.floor((maxChars - separator.length) / 2);
  const endLength = maxChars - separator.length - startLength;

  return (
    <Text>
      {text.slice(0, startLength)}
      <Text dimColor>{separator}</Text>
      {text.slice(-endLength)}
    </Text>
  );
};

// Usage: <TruncateMiddle text="very-long-string..." maxChars={20} />
// Result: "very-l...ng-string"
```

---

## 5. Pagination Patterns

### 5.1 Simple Page Navigation

```tsx
import { useState } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';

interface PaginatedContentProps {
  items: string[];
  pageSize: number;
}

const PaginatedContent: React.FC<PaginatedContentProps> = ({ items, pageSize }) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / pageSize);

  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleItems = items.slice(startIndex, endIndex);

  useInput((input, key) => {
    if (key.rightArrow || input === 'l') {
      setPage((p) => Math.min(p + 1, totalPages - 1));
    }
    if (key.leftArrow || input === 'h') {
      setPage((p) => Math.max(p - 1, 0));
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Page {page + 1} of {totalPages}</Text>
        <Text dimColor> (Use arrow keys to navigate)</Text>
      </Box>

      {visibleItems.map((item, index) => (
        <Text key={startIndex + index}>
          {startIndex + index + 1}. {item}
        </Text>
      ))}

      <Box marginTop={1}>
        <Text dimColor>
          Showing {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length}
        </Text>
      </Box>
    </Box>
  );
};
```

### 5.2 Scroll-Based Pagination (Virtual Scrolling)

Show a window of content that scrolls with the data:

```tsx
interface VirtualScrollProps {
  items: string[];
  visibleCount: number;
}

const VirtualScroll: React.FC<VirtualScrollProps> = ({ items, visibleCount }) => {
  const [offset, setOffset] = useState(0);

  useInput((input, key) => {
    if (key.downArrow || input === 'j') {
      setOffset((o) => Math.min(o + 1, items.length - visibleCount));
    }
    if (key.upArrow || input === 'k') {
      setOffset((o) => Math.max(o - 1, 0));
    }
  });

  const visibleItems = items.slice(offset, offset + visibleCount);

  return (
    <Box flexDirection="column">
      {visibleItems.map((item, index) => (
        <Text key={offset + index}>{item}</Text>
      ))}
      <Text dimColor>
        [{offset + 1}-{offset + visibleItems.length}] / {items.length}
      </Text>
    </Box>
  );
};
```

### 5.3 Infinite Scroll Pattern

Load more content as user reaches the end:

```tsx
interface InfiniteScrollProps {
  loadData: (page: number) => Promise<string[]>;
  initialPageSize?: number;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  loadData,
  initialPageSize = 20
}) => {
  const [items, setItems] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadData(page).then((newItems) => {
      setItems((prev) => [...prev, ...newItems]);
      setLoading(false);
    });
  }, [page, loadData]);

  // Auto-load more when approaching end
  useEffect(() => {
    if (items.length > 0 && !loading) {
      const triggerPoint = items.length - 5;
      // Assume user is viewing near the end
    }
  }, [items, loading]);

  return (
    <Box flexDirection="column">
      {items.map((item, index) => (
        <Text key={index}>{item}</Text>
      ))}
      {loading && <Text dimColor>Loading more...</Text>}
    </Box>
  );
};
```

---

## 6. State Snapshot Redaction

### 6.1 Sensitive Data Redaction

State snapshots may contain sensitive data (API keys, tokens, PII). Redact before displaying:

```tsx
interface RedactedStateProps {
  state: Record<string, unknown>;
  sensitiveKeys?: string[];
}

const DEFAULT_SENSITIVE_KEYS = [
  'password', 'token', 'apiKey', 'secret', 'credentials',
  'accessToken', 'refreshToken', 'privateKey', 'sessionId'
];

const RedactedState: React.FC<RedactedStateProps> = ({
  state,
  sensitiveKeys = DEFAULT_SENSITIVE_KEYS
}) => {
  const redacted = Object.entries(state).reduce((acc, [key, value]) => {
    const isSensitive = sensitiveKeys.some((sensitive) =>
      key.toLowerCase().includes(sensitive.toLowerCase())
    );

    if (isSensitive) {
      acc[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively redact nested objects
      acc[key] = redactObject(value, sensitiveKeys);
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as Record<string, unknown>);

  return <TruncatedJson data={redacted} maxLines={20} />;
};

function redactObject(
  obj: unknown,
  sensitiveKeys: string[]
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, sensitiveKeys));
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const isSensitive = sensitiveKeys.some((sensitive) =>
        key.toLowerCase().includes(sensitive.toLowerCase())
      );

      acc[key] = isSensitive
        ? '[REDACTED]'
        : redactObject(value, sensitiveKeys);

      return acc;
    }, {} as Record<string, unknown>);
  }

  return obj;
}
```

### 6.2 Large Object Truncation

For very large objects, truncate nested structures:

```tsx
interface TruncatedObjectProps {
  data: Record<string, unknown>;
  maxDepth: number;
  maxArrayLength: number;
}

const TruncatedObject: React.FC<TruncatedObjectProps> = ({
  data,
  maxDepth = 3,
  maxArrayLength = 10
}) => {
  const truncated = truncateObject(data, maxDepth, maxArrayLength);

  return <Text color="cyan">{JSON.stringify(truncated, null, 2)}</Text>;
};

function truncateObject(
  obj: unknown,
  maxDepth: number,
  maxArrayLength: number,
  currentDepth = 0
): unknown {
  if (currentDepth >= maxDepth) {
    return '[...]';
  }

  if (Array.isArray(obj)) {
    if (obj.length > maxArrayLength) {
      return [
        ...obj.slice(0, maxArrayLength).map((item) =>
          truncateObject(item, maxDepth, maxArrayLength, currentDepth + 1)
        ),
        `... (${obj.length - maxArrayLength} more items)`
      ];
    }
    return obj.map((item) =>
      truncateObject(item, maxDepth, maxArrayLength, currentDepth + 1)
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        truncateObject(value, maxDepth, maxArrayLength, currentDepth + 1)
      ])
    );
  }

  return obj;
}
```

### 6.3 Binary/Large Value Handling

Skip or summarize binary/large values:

```tsx
interface LargeValue {
  data: unknown;
  size?: number;
}

const formatLargeValue = (value: unknown): string => {
  // Buffers
  if (value instanceof Buffer || value instanceof Uint8Array) {
    return `<Buffer ${value.length} bytes>`;
  }

  // Large strings
  if (typeof value === 'string' && value.length > 100) {
    return `"${value.slice(0, 100)}..." (${value.length} chars)`;
  }

  // Large arrays
  if (Array.isArray(value) && value.length > 50) {
    return `[Array(${value.length})]`;
  }

  // Unknown objects
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    if (keys.length > 20) {
      return `{Object with ${keys.length} keys}`;
    }
  }

  return String(value);
};
```

---

## 7. Best Practices

### 7.1 Display State Guidelines

For the split-pane details panel showing:
- `node.name` - Always show (small)
- `node.status` - Always show (small)
- `node.stateSnapshot` - Redact and truncate (potentially huge)
- Recent logs - Paginate or show last N entries
- Event count - Always show (small)

### 7.2 Performance Considerations

```tsx
// BAD: Re-renders entire tree on every update
<BigComponent data={hugeObject} />

// GOOD: Memoize expensive computations
const displayData = useMemo(() => {
  return processHugeObject(hugeObject);
}, [hugeObject]);

<BigComponent data={displayData} />
```

### 7.3 Memory Management

```tsx
// BAD: Accumulates all logs forever
const [logs, setLogs] = useState<string[]>([]);

useEffect(() => {
  const interval = setInterval(() => {
    setLogs(prev => [...prev, newLog]); // Grows unbounded
  }, 1000);
  return () => clearInterval(interval);
}, []);

// GOOD: Keep only recent logs
const MAX_LOGS = 1000;

useEffect(() => {
  const interval = setInterval(() => {
    setLogs(prev => {
      const updated = [...prev, newLog];
      return updated.slice(-MAX_LOGS); // Keep only last 1000
    });
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

### 7.4 User Experience Guidelines

1. **Always show content indicators** when truncating:
   ```tsx
   <Text>... (50 more lines)</Text>
   ```

2. **Provide navigation hints** for scrollable content:
   ```tsx
   <Text dimColor>Use arrow keys to scroll</Text>
   ```

3. **Show size information** for large content:
   ```tsx
   <Text dimColor>Total: 1500 lines, 85KB</Text>
   ```

4. **Use color coding** for content types:
   ```tsx
   <Text color="cyan">{JSON.stringify(data)}</Text>
   <Text color="red">{error.message}</Text>
   <Text color="yellow">{warning}</Text>
   ```

### 7.5 Split-Pane Layout Pattern

```tsx
const SplitPaneDetailsPanel = ({ node }) => {
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header - Always Visible */}
      <Box marginBottom={1}>
        <Text bold>{node.name}</Text>
        <Text> </Text>
        <StatusIcon status={node.status} />
      </Box>

      {/* State Snapshot - Redacted & Truncated */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">State Snapshot:</Text>
        <RedactedState
          state={node.stateSnapshot}
          maxLines={15}
          maxDepth={3}
        />
      </Box>

      {/* Event Count - Always Visible */}
      <Box marginBottom={1}>
        <Text>Events: {node.eventCount}</Text>
      </Box>

      {/* Recent Logs - Paginated */}
      <Box flexDirection="column">
        <Text bold color="yellow">Recent Logs:</Text>
        <PaginatedLogs
          logs={node.recentLogs}
          pageSize={10}
        />
      </Box>
    </Box>
  );
};
```

---

## 8. Code Examples

### 8.1 Complete Split-Pane Details Component

```tsx
import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

interface NodeDetailsPanelProps {
  node: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    stateSnapshot: Record<string, unknown>;
    recentLogs: string[];
    eventCount: number;
  };
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const icons = {
    pending: <Text color="gray">○</Text>,
    running: <Text color="yellow">◉</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status] || <Text>?</Text>;
};

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ node }) => {
  const [logPage, setLogPage] = useState(0);
  const LOG_PAGE_SIZE = 10;

  // Memoize redacted state to avoid re-processing
  const redactedState = useMemo(() => {
    return redactSensitiveData(node.stateSnapshot);
  }, [node.stateSnapshot]);

  // Memoize truncated state JSON
  const stateDisplay = useMemo(() => {
    const json = JSON.stringify(redactedState, null, 2);
    const lines = json.split('\n');
    if (lines.length <= 20) return json;

    return [
      ...lines.slice(0, 20),
      `... (${lines.length - 20} more lines)`
    ].join('\n');
  }, [redactedState]);

  // Paginate logs
  const paginatedLogs = useMemo(() => {
    const start = logPage * LOG_PAGE_SIZE;
    return node.recentLogs.slice(start, start + LOG_PAGE_SIZE);
  }, [node.recentLogs, logPage]);

  const totalLogPages = Math.ceil(node.recentLogs.length / LOG_PAGE_SIZE);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (key.rightArrow && logPage < totalLogPages - 1) {
      setLogPage((p) => p + 1);
    }
    if (key.leftArrow && logPage > 0) {
      setLogPage((p) => p - 1);
    }
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="single">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>{node.name}</Text>
        <Text> </Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text dimColor>({node.status})</Text>
      </Box>

      {/* Event Count */}
      <Box marginBottom={1}>
        <Text dimColor>Events: </Text>
        <Text bold>{node.eventCount}</Text>
      </Box>

      {/* State Snapshot */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">State Snapshot:</Text>
        <Box paddingX={1}>
          <Text color="gray">{stateDisplay}</Text>
        </Box>
      </Box>

      {/* Recent Logs */}
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="yellow">Recent Logs:</Text>
          <Text dimColor> (Page {logPage + 1}/{totalLogPages})</Text>
        </Box>

        {paginatedLogs.map((log, index) => (
          <Text key={index} dimColor>
            [{logPage * LOG_PAGE_SIZE + index + 1}] {log}
          </Text>
        ))}

        {node.recentLogs.length > LOG_PAGE_SIZE && (
          <Text dimColor marginTop={1}>
            Use ← → to paginate logs
          </Text>
        )}
      </Box>
    </Box>
  );
};

function redactSensitiveData(
  obj: unknown,
  sensitiveKeys = DEFAULT_SENSITIVE_KEYS
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, sensitiveKeys));
  }

  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        const isSensitive = sensitiveKeys.some((sensitive) =>
          key.toLowerCase().includes(sensitive.toLowerCase())
        );

        return [
          key,
          isSensitive
            ? '[REDACTED]'
            : redactSensitiveData(value, sensitiveKeys)
        ];
      })
    );
  }

  return obj;
}

const DEFAULT_SENSITIVE_KEYS = [
  'password', 'token', 'apiKey', 'secret', 'credentials',
  'accessToken', 'refreshToken', 'privateKey', 'sessionId',
  'authorization', 'cookie'
];

export default NodeDetailsPanel;
```

### 8.2 Scrollable State Viewer

```tsx
import { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

const ScrollableStateViewer = ({
  state,
  maxLines = 20
}: {
  state: Record<string, unknown>;
  maxLines?: number;
}) => {
  const [offset, setOffset] = useState(0);

  // Format state as JSON lines
  const jsonLines = useMemo(() => {
    const json = JSON.stringify(state, null, 2);
    return json.split('\n');
  }, [state]);

  // Calculate visible range
  const visibleLines = useMemo(() => {
    return jsonLines.slice(offset, offset + maxLines);
  }, [jsonLines, offset, maxLines]);

  // Keyboard navigation
  useInput((input, key) => {
    const maxOffset = Math.max(0, jsonLines.length - maxLines);

    if (key.downArrow || input === 'j') {
      setOffset((o) => Math.min(o + 1, maxOffset));
    }
    if (key.upArrow || input === 'k') {
      setOffset((o) => Math.max(o - 1, 0));
    }
    if (key.ctrl && (input === 'd' || input === 'u')) {
      // Page down/up
      const pageSize = Math.floor(maxLines / 2);
      if (input === 'd') {
        setOffset((o) => Math.min(o + pageSize, maxOffset));
      } else {
        setOffset((o) => Math.max(o - pageSize, 0));
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} borderStyle="single" paddingX={1}>
        <Text bold color="cyan">State Viewer</Text>
        <Text dimColor>
          {' '}[{offset + 1}-{Math.min(offset + maxLines, jsonLines.length)} / {jsonLines.length}]
        </Text>
      </Box>

      <Box flexDirection="column">
        {visibleLines.map((line, index) => (
          <Text key={offset + index} color="gray">
            {line}
          </Text>
        ))}
      </Box>

      {jsonLines.length > maxLines && (
        <Text dimColor marginTop={1}>
          Scroll: ↑↓ or j/k | Page: Ctrl+D/U
        </Text>
      )}
    </Box>
  );
};
```

---

## 9. References

### 9.1 Official Ink Documentation

#### GitHub Repository
- **URL**: https://github.com/vadimdemedes/ink
- **Section**: Components API
- **Description**: Official Ink repository with documentation for `<Static>`, `<Box>`, and other components

#### Static Component Documentation
- **URL**: https://github.com/vadimdemedes/ink#static
- **Description**: Official documentation for the `<Static>` component

#### Box Component Documentation
- **URL**: https://github.com/vadimdemedes/ink#box
- **Description**: Official documentation for the `<Box>` component including `overflow` prop

### 9.2 Third-Party Scroll Components

#### ink-scroll-view
- **URL**: https://github.com/jbrowne5/ink-scroll-view
- **Description**: Scrollable container component with keyboard and mouse support
- **Installation**: `npm install ink-scroll-view`

#### ink-scroll-list
- **URL**: https://github.com/cameronhunter/ink-scroll-list
- **Description**: Scrollable list component with item selection
- **Installation**: `npm install ink-scroll-list`

### 9.3 Related Libraries

#### cli-truncate
- **URL**: https://github.com/sindresorhus/cli-truncate
- **npm**: https://www.npmjs.com/package/cli-truncate
- **Description**: Truncate a string to a specific width in the terminal
- **Already in dependencies**: Listed in `package-lock.json`

#### ink-text-input
- **URL**: https://github.com/vadimdemedes/ink-text-input
- **Description**: Text input component for Ink (useful for search/filter)

### 9.4 Best Practices Resources

#### Ink Performance Patterns
- **Source**: `/plan/002_6761e4b84fd1/P2M2T1S2/research/06-external-examples.md`
- **Section**: Performance Optimization Patterns
- **Topics**: React.memo, useMemo, virtualization

#### Static Output Pattern
- **Source**: `/plan/002_6761e4b84fd1/P2M2T1S2/research/06-external-examples.md`
- **Section**: Static Output Pattern (from Tap, Gatsby)
- **Pattern**: Using `<Static>` for historical data

#### Terminal Output Flickering Prevention
- **Source**: `/plan/002_6761e4b84fd1/P2M2T1S2/research/06-external-examples.md`
- **Section**: Terminal Output Flickering Prevention
- **Techniques**: `overflow="hidden"`, incremental rendering

### 9.5 Real-World Examples

#### Claude Code
- **URL**: https://github.com/anthropics/claude-code
- **Relevance**: AI coding tool with real-time output display
- **Patterns to Study**: How they handle large code blocks, truncation, scrolling

#### Gatsby
- **URL**: https://www.gatsbyjs.org
- **Relevance**: Build tool with progress bars and task lists
- **Patterns**: Using `<Static>` for build output, progress indicators

#### Tap (Test Runner)
- **URL**: https://node-tap.org
- **Relevance**: Test runner with real-time test results
- **Patterns**: Test result display, summary statistics

### 9.6 Key Implementation Files

#### Existing Workflow Tree Debugger UI
- **Path**: `/home/dustin/projects/groundswell/examples/components/WorkflowTreeDebuggerUI.tsx`
- **Relevance**: Current implementation of reactive tree display
- **Patterns**: Observable subscription, real-time updates

#### Advanced Ink Patterns
- **Path**: `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/research/02-ink-advanced-patterns.md`
- **Relevance**: Interactive patterns, navigation, state management
- **Patterns**: Keyboard navigation, tree expansion, selection

### 9.7 Additional Resources

#### React Documentation
- **URL**: https://reactjs.org/docs/hooks-intro.html
- **Relevance**: Ink is a React renderer - standard React patterns apply
- **Key Hooks**: useState, useEffect, useMemo, useCallback

#### Terminal Size Handling
- **Ink Hook**: `useStdoutDimensions()`
- **Description**: Get terminal width/height for responsive layouts
- **Usage**: Adjust content based on available space

#### Ink Testing Library
- **URL**: https://github.com/vadimdemedes/ink-testing-library
- **Already in dependencies**: `devDependencies` in `package.json`
- **Usage**: Test scrollable components, pagination, truncation

---

## Summary of Key Findings

### Scrolling in Ink

1. **No Native Scrolling**: Terminals don't have native scrollbars
2. **Box overflow="hidden"**: Clips content but doesn't provide scrolling
3. **Manual Scrolling**: Implement with state + offset/slice pattern
4. **Third-Party Components**: `ink-scroll-view`, `ink-scroll-list` available

### Large Output Handling

1. **Truncation**: Line-based, character-based, or smart middle truncation
2. **Pagination**: Page-based navigation with keyboard controls
3. **Virtual Scrolling**: Show window of content, scroll through data
4. **Redaction**: Always redact sensitive data before display

### Best Practices

1. **Use `<Static>`**: For historical data that doesn't change
2. **Memoize**: Use `useMemo` for expensive transformations
3. **Limit Growth**: Keep only recent data (e.g., last 1000 logs)
4. **Show Indicators**: Always indicate when content is truncated
5. **Provide Navigation**: Show keyboard shortcuts for scrollable content

### Recommended Approach for Split-Pane Details Panel

```tsx
// node.name - Always show
<Text bold>{node.name}</Text>

// node.status - Always show with icon
<StatusIcon status={node.status} />

// node.stateSnapshot - Redact + truncate
<RedactedState state={node.stateSnapshot} maxLines={15} maxDepth={3} />

// Recent logs - Paginate
<PaginatedLogs logs={node.recentLogs} pageSize={10} />

// Event count - Always show
<Text>Events: {node.eventCount}</Text>
```

---

## Next Steps

1. **Implement TruncatedState component** with redaction and truncation
2. **Add PaginatedLogs component** with keyboard navigation
3. **Integrate with split-pane layout** in WorkflowTreeDebuggerUI
4. **Test with large state snapshots** (1000+ lines, 1MB+ JSON)
5. **Add unit tests** for truncation and redaction logic

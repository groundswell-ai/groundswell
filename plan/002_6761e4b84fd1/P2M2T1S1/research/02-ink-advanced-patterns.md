# Ink Advanced Patterns for Workflow Debugger

## 1. INTERACTIVE WORKFLOW DEBUGGER

### Full Interactive Example with Hooks

```tsx
#!/usr/bin/env node
import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, Newline, useInput, useApp } from 'ink';

interface WorkflowNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  children?: WorkflowNode[];
  expanded?: boolean;
}

const StatusIcon = ({ status }: { status: WorkflowNode['status'] }) => {
  const icons = {
    pending: <Text color="gray">○</Text>,
    running: <Text color="yellow">◉</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status];
};

const ExpandIcon = ({ expanded }: { expanded: boolean }) => (
  <Text color="cyan">{expanded ? '▼' : '▶'}</Text>
);

const WorkflowTree = ({
  node,
  depth = 0,
  onToggle,
  selectedId,
  onSelect,
}: {
  node: WorkflowNode;
  depth?: number;
  onToggle: (id: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  const indent = '  '.repeat(depth);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isExpanded = node.expanded;

  return (
    <Box flexDirection="column">
      <Box
        backgroundColor={isSelected ? 'blue' : undefined}
        paddingLeft={1}
      >
        <Text dimColor>{indent}</Text>
        {hasChildren && (
          <Box onClick={() => onToggle(node.id)}>
            <ExpandIcon expanded={isExpanded} />
          </Box>
        )}
        {!hasChildren && <Text>  </Text>}
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text
          bold={isSelected}
          color={node.status === 'failed' ? 'red' : 'white'}
          underline={isSelected}
        >
          {node.label}
        </Text>
      </Box>

      {isExpanded &&
        node.children?.map((child) => (
          <WorkflowTree
            key={child.id}
            node={child}
            depth={depth + 1}
            onToggle={onToggle}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}

      {isSelected && node.details && (
        <Box paddingLeft={depth + 2} marginTop={1}>
          <Box borderStyle="single" padding={1} flexDirection="column">
            <Text bold color="cyan">
              Details:
            </Text>
            <Text>{node.details}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const InteractiveDebugger = () => {
  const { exit } = useApp();
  const [workflow, setWorkflow] = useState<WorkflowNode>({
    id: 'root',
    label: 'Build Application',
    status: 'running',
    expanded: true,
    children: [
      {
        id: 'deps',
        label: 'Install Dependencies',
        status: 'completed',
        expanded: true,
        details: 'Installed 234 packages in 2.3s',
        children: [
          {
            id: 'npm',
            label: 'npm install',
            status: 'completed',
            details: 'All packages installed successfully',
          },
          {
            id: 'audit',
            label: 'npm audit',
            status: 'completed',
            details: 'No vulnerabilities found',
          },
        ],
      },
      {
        id: 'lint',
        label: 'Run Linter',
        status: 'running',
        details: 'Checking 42 files...',
        children: [],
      },
      {
        id: 'test',
        label: 'Run Tests',
        status: 'pending',
        expanded: false,
        children: [
          {
            id: 'unit',
            label: 'Unit Tests',
            status: 'pending',
            details: '45 tests pending',
          },
          {
            id: 'int',
            label: 'Integration Tests',
            status: 'pending',
            details: '12 tests pending',
          },
        ],
      },
    ],
  });

  const [selectedId, setSelectedId] = useState('root');
  const [helpVisible, setHelpVisible] = useState(true);

  // Toggle node expansion
  const toggleNode = useCallback(
    (id: string) => {
      const updateNode = (node: WorkflowNode): WorkflowNode => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map(updateNode),
          };
        }
        return node;
      };

      setWorkflow(updateNode(workflow));
    },
    [workflow]
  );

  // Navigate through nodes
  const navigate = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      // Find all visible nodes
      const visibleNodes: string[] = [];
      const collectVisible = (node: WorkflowNode) => {
        visibleNodes.push(node.id);
        if (node.expanded && node.children) {
          node.children.forEach(collectVisible);
        }
      };
      collectVisible(workflow);

      const currentIndex = visibleNodes.indexOf(selectedId);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;
      switch (direction) {
        case 'up':
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case 'down':
          newIndex = Math.min(visibleNodes.length - 1, currentIndex + 1);
          break;
        case 'left':
          toggleNode(selectedId);
          return;
        case 'right':
          toggleNode(selectedId);
          return;
      }

      setSelectedId(visibleNodes[newIndex]);
    },
    [selectedId, workflow, toggleNode]
  );

  // Handle keyboard input
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }

    if (key.return) {
      setHelpVisible(!helpVisible);
      return;
    }

    switch (key.name) {
      case 'up':
      case 'k':
        navigate('up');
        break;
      case 'down':
      case 'j':
        navigate('down');
        break;
      case 'left':
      case 'h':
        navigate('left');
        break;
      case 'right':
      case 'l':
        navigate('right');
        break;
      case 'q':
        exit();
        break;
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Workflow Tree Debugger
        </Text>
        <Text dimColor> - Interactive Mode</Text>
      </Box>

      {helpVisible && (
        <Box
          marginBottom={1}
          borderStyle="single"
          padding={1}
          flexDirection="column"
        >
          <Text bold>Controls:</Text>
          <Text>↑/k - Up</Text>
          <Text>↓/j - Down</Text>
          <Text>←/h - Collapse</Text>
          <Text>→/l - Expand</Text>
          <Text>Enter - Toggle help</Text>
          <Text>q/Ctrl+C - Quit</Text>
        </Box>
      )}

      <WorkflowTree
        node={workflow}
        onToggle={toggleNode}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </Box>
  );
};

render(<InteractiveDebugger />, { exitOnCtrlC: false });
```

## 2. REAL-TIME DATA UPDATES

### Using useEffect for Polling

```tsx
import { useState, useEffect } from 'react';
import { Text } from 'ink';

const LiveWorkflow = () => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const interval = setInterval(async () => {
      // Fetch workflow status from API
      const response = await fetch('/api/workflow/status');
      const data = await response.json();
      setStatus(data.status);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <Text>Status: {status}</Text>;
};
```

### WebSocket Integration

```tsx
import { useState, useEffect } from 'react';
import { Text } from 'ink';

const WebSocketWorkflow = () => {
  const [workflow, setWorkflow] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/workflow');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWorkflow(data);
    };

    return () => ws.close();
  }, []);

  if (!workflow) return <Text>Connecting...</Text>;

  return <Text>{JSON.stringify(workflow)}</Text>;
};
```

## 3. PROGRESS BARS

### Custom Progress Component

```tsx
interface ProgressBarProps {
  percent: number;
  width?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percent, width = 40 }) => {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="blue">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {percent}%</Text>
    </Box>
  );
};

// Usage
<ProgressBar percent={75} width={30} />
```

## 4. TABLES

### Table Component for Workflows

```tsx
interface Column {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

interface TableProps {
  columns: Column[];
  rows: string[][];
}

const Table: React.FC<TableProps> = ({ columns, rows }) => {
  const renderRow = (row: string[], isHeader = false) => (
    <Box key={row.join('-')}>
      {columns.map((col, i) => (
        <Box key={i} width={col.width}>
          <Text
            bold={isHeader}
            color={isHeader ? 'cyan' : 'white'}
            align={col.align}
          >
            {row[i]}
          </Text>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box flexDirection="column">
      {renderRow(columns.map((c) => c.header), true)}
      <Text dimColor>{'─'.repeat(columns.reduce((sum, c) => sum + c.width, 0))}</Text>
      {rows.map((row) => renderRow(row))}
    </Box>
  );
};

// Usage
<Table
  columns={[
    { header: 'Task', width: 20 },
    { header: 'Status', width: 10 },
    { header: 'Duration', width: 10 },
  ]}
  rows={[
    ['Build', '✓ Success', '2.3s'],
    ['Test', '◉ Running', '1.1s'],
    ['Deploy', '○ Pending', '-'],
  ]}
/>
```

## 5. FILTERING AND SEARCH

### Searchable Workflow Tree

```tsx
const SearchableWorkflow = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [workflow] = useState(/* your workflow data */);

  const filterNodes = (nodes: WorkflowNode[], query: string): WorkflowNode[] => {
    if (!query) return nodes;

    return nodes
      .filter((node) =>
        node.label.toLowerCase().includes(query.toLowerCase())
      )
      .map((node) => ({
        ...node,
        children: node.children
          ? filterNodes(node.children, query)
          : undefined,
      }));
  };

  const filteredWorkflow = {
    ...workflow,
    children: workflow.children
      ? filterNodes(workflow.children, searchQuery)
      : [],
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Search: </Text>
        <Text color="yellow">{searchQuery}</Text>
        <Text dimColor> (Type to filter)</Text>
      </Box>
      <WorkflowTree node={filteredWorkflow} />
    </Box>
  );
};
```

## 6. ERROR DISPLAY

### Error Details Component

```tsx
interface ErrorDisplayProps {
  error: Error;
  context?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, context }) => (
  <Box
    borderStyle="double"
    borderColor="red"
    padding={1}
    flexDirection="column"
    marginBottom={1}
  >
    <Text bold color="red">
      ✗ Error
    </Text>
    {context && (
      <>
        <Text dimColor>Context: {context}</Text>
        <Newline />
      </>
    )}
    <Text color="red">{error.message}</Text>
    {error.stack && (
      <>
        <Newline />
        <Text dimColor>{error.stack}</Text>
      </>
    )}
  </Box>
);
```

## 7. TIMESTAMPS AND DURATION

### Time Formatting Utilities

```tsx
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Usage
<Text>{formatTimestamp(new Date())} - {formatDuration(2345)}</Text>
```

## 8. ANIMATIONS

### Loading Spinner

```tsx
const Spinner = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const frames = ['◴', '◷', '◶', '◵'];
  return <Text color="yellow">{frames[frame]}</Text>;
};

// Usage
<Box>
  <Spinner />
  <Text> Loading...</Text>
</Box>
```

## 9. PERSISTING STATE

### Save/Load Workflow State

```tsx
import { useEffect } from 'react';
import { Text } from 'ink';

const PersistentWorkflow = () => {
  const [workflow, setWorkflow] = useState(null);

  // Save to file on change
  useEffect(() => {
    if (workflow) {
      fs.writeFileSync(
        '/tmp/workflow-state.json',
        JSON.stringify(workflow, null, 2)
      );
    }
  }, [workflow]);

  // Load from file on mount
  useEffect(() => {
    try {
      const saved = fs.readFileSync('/tmp/workflow-state.json', 'utf8');
      setWorkflow(JSON.parse(saved));
    } catch {
      // No saved state, use default
      setWorkflow(defaultWorkflow);
    }
  }, []);

  if (!workflow) return <Text>Loading...</Text>;

  return <WorkflowTree node={workflow} />;
};
```

## 10. TESTING PATTERNS

### Testing with ink-testing-library

```tsx
import { render } from 'ink-testing-library';
import { WorkflowTree } from './WorkflowTree';

test('renders workflow tree', () => {
  const workflow = {
    id: 'root',
    label: 'Test',
    status: 'completed',
    children: [],
  };

  const { lastFrame } = render(<WorkflowTree node={workflow} />);

  expect(lastFrame()).toContain('Test');
  expect(lastFrame()).toContain('✓');
});

test('handles node expansion', () => {
  const workflow = {
    id: 'root',
    label: 'Test',
    status: 'completed',
    children: [{ id: 'child', label: 'Child', status: 'pending' }],
  };

  const { lastFrame } = render(
    <WorkflowTree node={workflow} expanded={false} />
  );

  expect(lastFrame()).not.toContain('Child');
});
```

## KEY TAKEAWAYS

1. **State Management**: Use `useState` for tree state, `useCallback` for handlers
2. **Input Handling**: `useInput` hook for keyboard navigation
3. **Effects**: `useEffect` for polling, WebSockets, and cleanup
4. **Performance**: Memoize callbacks to prevent re-renders
5. **Testing**: Use `ink-testing-library` for unit tests
6. **Layout**: Leverage Flexbox in `<Box>` for complex layouts
7. **Styling**: Chain style props on `<Text>` for rich formatting

# Ink Reactive Patterns: Observable Streams and Real-Time Updates

**Research Date:** 2026-01-24
**Purpose:** Comprehensive guide for building reactive Ink components that subscribe to Observable streams
**Target:** Groundswell WorkflowTreeDebugger CLI implementation

---

## Table of Contents

1. [Ink useStatic Hook](#1-ink-usestatic-hook)
2. [React + Observable Integration Patterns](#2-react--observable-integration-patterns)
3. [Ink Reactivity Patterns](#3-ink-reactivity-patterns)
4. [RxJS/Custom Observable with Ink](#4-rxjscustom-observable-with-ink)
5. [Complete Examples](#5-complete-examples)
6. [Best Practices Checklist](#6-best-practices-checklist)

---

## 1. Ink useStatic Hook

### What is useStatic in Ink?

**IMPORTANT FINDING:** `useStatic` is **NOT a standard Ink hook**. After comprehensive research:

- ✅ Ink exports: `render`, `Box`, `Text`, `Static`, `useInput`, `useApp`, `useStdin`, `useStdout`, `useStderr`, `useFocus`
- ❌ `useStatic` does **NOT exist** in Ink v6.6.0 API
- ⚠️ Previous research mentioning `useStatic` appears to be incorrect or refers to a custom hook

**Correct approach for non-reactive values in Ink:**

```tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';

// ❌ INCORRECT - useStatic doesn't exist
// const tree = useStatic(() => debugger.getTree(), [debugger]);

// ✅ CORRECT - Use useMemo for derived values
function TreeDebuggerApp({ debugger }) {
  const tree = useMemo(() => debugger.getTree(), [debugger]);

  return (
    <Box flexDirection="column">
      <Text>{debugger.toTreeString(tree)}</Text>
    </Box>
  );
}

// ✅ CORRECT - Use useState for reactive updates
function TreeDebuggerApp({ debugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        if (event.type === 'treeChanged') {
          setTree(debugger.getTree());
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger]);

  return (
    <Box flexDirection="column">
      <Text>{debugger.toTreeString(tree)}</Text>
    </Box>
  );
}
```

### Ink's Static Component (Not a Hook)

**IMPORTANT:** Ink does have a `<Static>` component, but it serves a different purpose:

```tsx
import { Static, Box, Text } from 'ink';

// Static items don't re-render - useful for logs/history
function EventLog({ events }) {
  return (
    <Box flexDirection="column">
      <Text bold>Event Log:</Text>
      <Static items={events}>
        {(event, index) => (
          <Box key={index}>
            <Text dimColor>{event.timestamp}</Text>
            <Text> {event.type}</Text>
          </Box>
        )}
      </Static>
    </Box>
  );
}
```

**Purpose of `<Static>`:**
- Prevents re-rendering of historical items
- Optimizes scrolling output (logs, timelines)
- Items are "pinned" once rendered
- Only new items are rendered to the terminal

**When to use `<Static>`:**
- Event logs that grow over time
- Command output history
- Any list where old items don't change
- Performance optimization for 100+ items

**When NOT to use `<Static>`:**
- Interactive elements that need updates
- Status indicators that change
- Data that needs to be modified in-place

### useStatic vs useState vs useMemo

| Hook/Purpose | Re-renders? | Use Case |
|--------------|-------------|----------|
| **useState** | ✅ Yes | Reactive state that triggers updates |
| **useMemo** | ❌ No | Derived values, expensive calculations |
| **useCallback** | ❌ No | Stable function references |
| **`<Static>`** | ❌ No | Non-updating list items |
| **useStatic** | ❌ Doesn't exist | ~~Non-reactive values~~ |

**Documentation URLs:**
- **Ink GitHub:** https://github.com/vadimdemedes/ink
- **Ink NPM:** https://www.npmjs.com/package/ink
- **Ink API Documentation:** https://github.com/vadimdemedes/ink/tree/main#api
- **Static Component:** https://github.com/vadimdemedes/ink#static

---

## 2. React + Observable Integration Patterns

### Best Practice: useEffect for Observable Subscription

The standard pattern for subscribing to Observables in React components:

```tsx
import { useState, useEffect } from 'react';
import { Observable } from '../utils/observable'; // Custom Observable

interface ObservableComponentProps {
  observable: Observable<string>;
}

function ObservableComponent({ observable }: ObservableComponentProps) {
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 1. Create the subscription
    const subscription = observable.subscribe({
      next: (value) => {
        setData(value);
        setError(null); // Clear error on successful update
      },
      error: (err) => {
        setError(err as Error);
      },
      complete: () => {
        console.log('Observable completed');
      }
    });

    // 2. Return cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }, [observable]); // Dependency array

  if (error) {
    return <Text color="red">Error: {error.message}</Text>;
  }

  if (data === null) {
    return <Text dimColor>Waiting for data...</Text>;
  }

  return <Text>Received: {data}</Text>;
}
```

### Pattern: Triggering Re-renders on Observable Emission

**Key Pattern:** Use `useState` to store Observable values, triggering re-renders on each emission.

```tsx
import { useState, useEffect } from 'react';
import { Text, Box } from 'ink';

function RealTimeCounter({ counterObservable }: { counterObservable: Observable<number> }) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const subscription = counterObservable.subscribe({
      next: (value) => setCount(value)
    });

    return () => subscription.unsubscribe();
  }, [counterObservable]);

  return (
    <Box>
      <Text>Current count: </Text>
      <Text bold color="green">{count}</Text>
    </Box>
  );
}
```

### Pattern: Multiple Observable Values

```tsx
import { useState, useEffect } from 'react';

interface WorkflowState {
  status: string;
  progress: number;
  currentNode: string;
}

function WorkflowMonitor({
  statusObservable,
  progressObservable,
  nodeObservable
}: {
  statusObservable: Observable<string>;
  progressObservable: Observable<number>;
  nodeObservable: Observable<string>;
}) {
  const [state, setState] = useState<WorkflowState>({
    status: 'idle',
    progress: 0,
    currentNode: ''
  });

  useEffect(() => {
    // Subscribe to all three observables
    const statusSub = statusObservable.subscribe({
      next: (status) => setState((prev) => ({ ...prev, status }))
    });

    const progressSub = progressObservable.subscribe({
      next: (progress) => setState((prev) => ({ ...prev, progress }))
    });

    const nodeSub = nodeObservable.subscribe({
      next: (currentNode) => setState((prev) => ({ ...prev, currentNode }))
    });

    // Cleanup all subscriptions
    return () => {
      statusSub.unsubscribe();
      progressSub.unsubscribe();
      nodeSub.unsubscribe();
    };
  }, [statusObservable, progressObservable, nodeObservable]);

  return (
    <Box flexDirection="column">
      <Text>Status: {state.status}</Text>
      <Text>Progress: {state.progress}%</Text>
      <Text>Current: {state.currentNode}</Text>
    </Box>
  );
}
```

### Pattern: Debouncing High-Frequency Updates

**Problem:** Observables emitting at >60 FPS cause flickering
**Solution:** Debounce state updates

```tsx
import { useState, useEffect, useRef } from 'react';

function DebouncedObservable({ observable }: { observable: Observable<string> }) {
  const [data, setData] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => {
        // Clear previous timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Debounce: only update after 100ms of silence
        timeoutRef.current = setTimeout(() => {
          setData(value);
        }, 100);
      }
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [observable]);

  return <Text>{data}</Text>;
}
```

### Pattern: Throttling Updates

**Alternative:** Throttle to maximum update rate

```tsx
import { useState, useEffect, useRef } from 'react';

function ThrottledObservable({ observable }: { observable: Observable<string> }) {
  const [data, setData] = useState<string>('');
  const lastUpdateRef = useRef<number>(0);
  const throttleMs = 50; // Max 20 FPS

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;

        if (timeSinceLastUpdate >= throttleMs) {
          setData(value);
          lastUpdateRef.current = now;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [observable]);

  return <Text>{data}</Text>;
}
```

### Code Examples: Observable Subscription in React

**Example 1: Simple Counter**

```tsx
import { useState, useEffect } from 'react';
import { Observable } from './observable';

function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const counter = new Observable<number>();

    // Emit values every second
    const interval = setInterval(() => {
      counter.next(count + 1);
    }, 1000);

    const subscription = counter.subscribe({
      next: (value) => setCount(value)
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return <Text>Count: {count}</Text>;
}
```

**Example 2: Workflow Status Stream**

```tsx
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Observable } from './observable';

interface WorkflowEvent {
  type: 'stepStart' | 'stepEnd' | 'error';
  step: string;
  timestamp: number;
}

function WorkflowStatus({ eventStream }: { eventStream: Observable<WorkflowEvent> }) {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [status, setStatus] = useState<string>('idle');

  useEffect(() => {
    const subscription = eventStream.subscribe({
      next: (event) => {
        switch (event.type) {
          case 'stepStart':
            setCurrentStep(event.step);
            setStatus('running');
            break;
          case 'stepEnd':
            setStatus('completed');
            break;
          case 'error':
            setStatus('failed');
            break;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [eventStream]);

  return (
    <Box>
      <Text>Status: </Text>
      <Text color={status === 'failed' ? 'red' : 'green'}>{status}</Text>
      <Text dimColor> | Step: {currentStep}</Text>
    </Box>
  );
}
```

**Documentation URLs:**
- **React useEffect:** https://react.dev/reference/react/useEffect
- **React useState:** https://react.dev/reference/react/useState
- **Observable Pattern:** https://github.com/ReactiveX/rxjs/blob/6.x/spec/adapters/observable.md
- **RxJS with React:** https://rxjs.dev/guide/overview

---

## 3. Ink Reactivity Patterns

### How Ink Handles Re-rendering

Ink uses React's reconciliation model adapted for terminal output:

```
State Change → Re-render → Virtual DOM Diff → ANSI Escape Codes → Terminal Update
```

**Key Points:**

1. **State changes trigger re-renders**
   - `setState()` schedules a re-render
   - Ink diffs the new virtual DOM
   - Only changed portions are updated via ANSI escapes

2. **Re-render performance**
   - Average: 0.26ms per re-render (from benchmarks)
   - Acceptable for <60 FPS updates
   - Problematic for >100 updates/sec

3. **Terminal output optimization**
   - Ink minimizes ANSI escape sequences
   - Cursor positioning for partial updates
   - Flicker above 60 FPS (throttle recommended)

### Patterns for Real-Time Updates in Ink CLI Apps

#### Pattern 1: Polling with useEffect

```tsx
import { useState, useEffect } from 'react';
import { Text } from 'ink';

function PollingWorkflowStatus({ apiEndpoint }: { apiEndpoint: string }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(apiEndpoint);
        const data = await response.json();
        setStatus(data.status);
      } catch (err) {
        setStatus('error');
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [apiEndpoint]);

  return <Text>Status: {status}</Text>;
}
```

#### Pattern 2: Event-Driven Updates (Recommended)

```tsx
import { useState, useEffect } from 'react';
import { Observable } from './observable';
import { Box, Text } from 'ink';

function EventDrivenWorkflow({ eventStream }: { eventStream: Observable<WorkflowEvent> }) {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [latestStatus, setLatestStatus] = useState<string>('idle');

  useEffect(() => {
    const subscription = eventStream.subscribe({
      next: (event) => {
        setEvents((prev) => [...prev, event]);
        setLatestStatus(event.type);
      }
    });

    return () => subscription.unsubscribe();
  }, [eventStream]);

  return (
    <Box flexDirection="column">
      <Text bold>Latest Status: {latestStatus}</Text>
      <Text dimColor>Total Events: {events.length}</Text>
    </Box>
  );
}
```

#### Pattern 3: Hybrid Polling + Event Stream

```tsx
import { useState, useEffect } from 'react';
import { Observable } from './observable';

function HybridWorkflowMonitor({
  workflow
}: {
  workflow: Workflow;
}) {
  const [state, setState] = useState<WorkflowState>(() => workflow.getState());

  useEffect(() => {
    // Subscribe to workflow event stream
    const subscription = workflow.events.subscribe({
      next: (event) => {
        setState(workflow.getState());
      }
    });

    // Fallback: Poll every 5 seconds in case events are missed
    const pollInterval = setInterval(() => {
      setState(workflow.getState());
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [workflow]);

  return <Text>State: {state.status}</Text>;
}
```

### Using useState with Observable Streams

**Correct Pattern:**

```tsx
import { useState, useEffect } from 'react';
import { Observable } from './observable';

function ObservableReader<T>({
  observable,
  initialValue
}: {
  observable: Observable<T>;
  initialValue: T;
}) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: setValue
    });

    return () => subscription.unsubscribe();
  }, [observable]);

  return <Text>{JSON.stringify(value)}</Text>;
}
```

**Common Pitfall: Stale Closures**

```tsx
// ❌ WRONG - Stale closure
function BrokenComponent({ observable }: { observable: Observable<number> }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // This captures count=0 in closure
    const subscription = observable.subscribe({
      next: (value) => {
        console.log(`Previous count: ${count}`); // Always 0!
        setCount(value);
      }
    });

    return () => subscription.unsubscribe();
  }, [observable]);

  return <Text>{count}</Text>;
}

// ✅ CORRECT - Use functional updates
function FixedComponent({ observable }: { observable: Observable<number> }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => {
        setCount((prevCount) => {
          console.log(`Previous count: ${prevCount}`); // Correct!
          return value;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [observable]);

  return <Text>{count}</Text>;
}
```

### Examples of Reactive Ink Components

#### Example 1: Real-Time Progress Bar

```tsx
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

function ProgressBar({ progressObservable }: { progressObservable: Observable<number> }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const subscription = progressObservable.subscribe({
      next: setProgress
    });

    return () => subscription.unsubscribe();
  }, [progressObservable]);

  const width = 30;
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="blue">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {progress}%</Text>
    </Box>
  );
}
```

#### Example 2: Live Workflow Tree

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, Newline } from 'ink';
import { Observable } from './observable';

interface WorkflowNode {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  children?: WorkflowNode[];
}

function LiveWorkflowTree({
  treeObservable
}: {
  treeObservable: Observable<WorkflowNode>
}) {
  const [tree, setTree] = useState<WorkflowNode | null>(null);

  useEffect(() => {
    const subscription = treeObservable.subscribe({
      next: setTree
    });

    return () => subscription.unsubscribe();
  }, [treeObservable]);

  if (!tree) {
    return <Text dimColor>Loading workflow tree...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Workflow Tree (Live)</Text>
      <Newline />
      <WorkflowTreeNode node={tree} depth={0} />
    </Box>
  );
}

function WorkflowTreeNode({
  node,
  depth
}: {
  node: WorkflowNode;
  depth: number;
}) {
  const indent = '  '.repeat(depth);
  const statusIcon = {
    idle: '○',
    running: '◐',
    completed: '✓',
    failed: '✗'
  }[node.status];

  const statusColor = {
    idle: 'gray',
    running: 'yellow',
    completed: 'green',
    failed: 'red'
  }[node.status];

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text color={statusColor}>{statusIcon}</Text>
        <Text> {node.name}</Text>
      </Box>
      {node.children?.map((child) => (
        <WorkflowTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
}
```

#### Example 3: Live Event Log with Static

```tsx
import { useState, useEffect } from 'react';
import { Box, Text, Static } from 'ink';
import { Observable } from './observable';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

function LiveEventLog({ eventObservable }: { eventObservable: Observable<LogEntry> }) {
  const [events, setEvents] = useState<LogEntry[]>([]);

  useEffect(() => {
    const subscription = eventObservable.subscribe({
      next: (event) => {
        setEvents((prev) => [...prev, event]);
      }
    });

    return () => subscription.unsubscribe();
  }, [eventObservable]);

  return (
    <Box flexDirection="column">
      <Text bold>Event Log:</Text>
      <Static items={events}>
        {(event, index) => (
          <Box key={index}>
            <Text dimColor>{event.timestamp}</Text>
            <Text> </Text>
            <Text color={
              event.level === 'error' ? 'red' :
              event.level === 'warn' ? 'yellow' : 'white'
            }>
              [{event.level.toUpperCase()}]
            </Text>
            <Text> {event.message}</Text>
          </Box>
        )}
      </Static>
    </Box>
  );
}
```

**Performance Note:** Using `<Static>` for logs prevents re-rendering historical entries, significantly improving performance for 100+ log lines.

**Documentation URLs:**
- **Ink Reactivity:** https://github.com/vadimdemedes/ink#how-it-works
- **Ink Static Component:** https://github.com/vadimdemedes/ink#static
- **React Re-rendering:** https://react.dev/learn/render-and-commit

---

## 4. RxJS/Custom Observable with Ink

### Custom Observable Implementation (Groundswell)

**Location:** `/home/dustin/projects/groundswell/src/utils/observable.ts`

**Current Implementation:**

```typescript
export interface Subscription {
  unsubscribe(): void;
}

export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}

export class Observable<T> {
  private subscribers: Set<Observer<T>> = new Set();
  private logger?: ObservableLogger;

  constructor(logger?: ObservableLogger) {
    this.logger = logger;
  }

  subscribe(observer: Observer<T>): Subscription {
    this.subscribers.add(observer);
    return {
      unsubscribe: () => {
        this.subscribers.delete(observer);
      },
    };
  }

  next(value: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.next?.(value);
      } catch (err) {
        this.logError('Observable subscriber error', err);
      }
    }
  }

  error(err: unknown): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.error?.(err);
      } catch (e) {
        this.logError('Observable error handler failed', e);
      }
    }
  }

  complete(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.complete?.();
      } catch (err) {
        this.logError('Observable complete handler failed', err);
      }
    }
    this.subscribers.clear();
  }

  private logError(message: string, error: unknown): void {
    if (this.logger) {
      this.logger.error(message, { error });
    } else {
      console.error(message, error);
    }
  }

  get subscriberCount(): number {
    return this.subscribers.size;
  }
}
```

**Key Features:**
- ✅ Lightweight (no RxJS dependency)
- ✅ Error isolation (subscriber errors don't crash)
- ✅ Logger injection support
- ✅ TypeScript generics
- ✅ Simple subscription/cleanup pattern

### Integration with Ink Components

#### Example 1: Subscribing to Custom Observable

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Observable } from '../utils/observable';

function WorkflowTreeDebugger({ debugger }: { debugger: WorkflowTreeDebugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());

  useEffect(() => {
    // Subscribe to the event Observable
    const subscription = debugger.events.subscribe({
      next: (event) => {
        switch (event.type) {
          case 'childAttached':
          case 'childDetached':
          case 'treeUpdated':
            // Re-fetch tree on structural changes
            setTree(debugger.getTree());
            break;
          case 'stepEnd':
          case 'error':
            // Update stats on step completion
            setStats(debugger.getStats());
            break;
        }
      },
      error: (err) => {
        console.error('Debugger event error:', err);
      }
    });

    // Cleanup on unmount
    return () => subscription.unsubscribe();
  }, [debugger]);

  return (
    <Box flexDirection="column">
      <Text bold>Workflow Tree Debugger</Text>
      <Text>Nodes: {stats.nodeCount}</Text>
      <Text>Events: {stats.eventCount}</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>{debugger.toTreeString(tree)}</Text>
      </Box>
    </Box>
  );
}
```

#### Example 2: Real-Time Event Timeline

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text, Static } from 'ink';
import { Observable } from '../utils/observable';

interface EventTimelineProps {
  events: Observable<WorkflowEvent>;
}

function EventTimeline({ events }: EventTimelineProps) {
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    const subscription = events.subscribe({
      next: (event) => {
        const logLine = formatEvent(event);
        setEventLog((prev) => [...prev, logLine]);
      }
    });

    return () => subscription.unsubscribe();
  }, [events]);

  return (
    <Box flexDirection="column">
      <Text bold>Event Timeline</Text>
      <Static items={eventLog}>
        {(logLine, index) => (
          <Box key={index}>
            <Text dimColor>{logLine}</Text>
          </Box>
        )}
      </Static>
    </Box>
  );
}

function formatEvent(event: WorkflowEvent): string {
  const timestamp = new Date(event.timestamp).toISOString().split('T')[1];
  return `${timestamp} [${event.type}] ${'node' in event ? event.node.name : 'N/A'}`;
}
```

### Handling Subscription Cleanup on Unmount

**Critical Pattern:** Always unsubscribe in `useEffect` cleanup function.

```tsx
useEffect(() => {
  const subscription = observable.subscribe({
    next: (value) => console.log(value)
  });

  // ✅ CRITICAL: Return cleanup function
  return () => {
    subscription.unsubscribe();
  };
}, [observable]);
```

**Why Cleanup Matters:**

1. **Memory leaks:** Subscriptions hold component references
2. **Stale updates:** Unmounted components trying to setState
3. **Resource leaks:** Event listeners, timers, connections

**Example of Memory Leak (Without Cleanup):**

```tsx
// ❌ WRONG - Memory leak!
function LeakyComponent({ observable }: { observable: Observable<number> }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // No cleanup returned!
    observable.subscribe({
      next: setValue // Will keep running after unmount
    });
  }, [observable]);

  return <Text>{value}</Text>;
}

// ✅ CORRECT - Proper cleanup
function CleanComponent({ observable }: { observable: Observable<number> }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: setValue
    });

    return () => subscription.unsubscribe();
  }, [observable]);

  return <Text>{value}</Text>;
}
```

### Performance Considerations for Frequent Updates

#### Issue: High-Frequency Updates

**Problem:** Observables emitting >60 times/second cause:
- Terminal flickering
- Increased CPU usage
- Poor user experience

**Solution 1: Throttle Updates**

```tsx
import { useState, useEffect, useRef } from 'react';

function ThrottledObservableComponent({
  observable,
  throttleMs = 50
}: {
  observable: Observable<string>;
  throttleMs?: number;
}) {
  const [value, setValue] = useState<string>('');
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (newValue) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= throttleMs) {
          setValue(newValue);
          lastUpdateRef.current = now;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [observable, throttleMs]);

  return <Text>{value}</Text>;
}
```

**Solution 2: Batch Updates**

```tsx
import { useState, useEffect, useRef } from 'react';

function BatchedObservableComponent({
  observable,
  batchMs = 100
}: {
  observable: Observable<string[]>;
  batchMs?: number;
}) {
  const [values, setValues] = useState<string[]>([]);
  const batchRef = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (newValue) => {
        batchRef.current.push(newValue);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setValues([...batchRef.current]);
          batchRef.current = [];
        }, batchMs);
      }
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [observable, batchMs]);

  return (
    <Box flexDirection="column">
      {values.map((v, i) => (
        <Text key={i}>{v}</Text>
      ))}
    </Box>
  );
}
```

**Solution 3: Use requestAnimationFrame Pattern**

```tsx
import { useState, useEffect, useRef } from 'react';

function RAFObservableComponent({
  observable
}: {
  observable: Observable<number>
}) {
  const [value, setValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const pendingValueRef = useRef<number>(0);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (newValue) => {
        pendingValueRef.current = newValue;

        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            setValue(pendingValueRef.current);
            rafRef.current = null;
          });
        }
      }
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      subscription.unsubscribe();
    };
  }, [observable]);

  return <Text>{value}</Text>;
}
```

#### Performance Benchmarks

From Ink performance research (see: `/plan/002_6761e4b84fd1/P2M2T1S1/research/04-ink-performance.md`):

| Update Rate | Performance | Recommendation |
|-------------|-------------|----------------|
| **<10/sec** | ✅ Excellent | No throttling needed |
| **10-60/sec** | ✅ Good | Optional throttling |
| **60-100/sec** | ⚠️ Fair | Throttle to 30 FPS |
| **>100/sec** | ❌ Poor | Throttle to 10-20 FPS |

**Optimization Tips:**

1. **Measure first:** Use `performance.now()` to measure actual update rate
2. **Throttle proactively:** Don't exceed 60 FPS for UI updates
3. **Use `<Static>` for logs:** Prevent re-rendering historical items
4. **Memoize components:** Use `React.memo` to prevent unnecessary re-renders
5. **Batch state updates:** Combine multiple updates into single setState

### RxJS Integration (Optional)

If using RxJS instead of custom Observable:

```bash
npm install rxjs
```

**RxJS with Ink Example:**

```tsx
import { useState, useEffect } from 'react';
import { Text } from 'ink';
import { Observable } from 'rxjs';
import { throttleTime, distinctUntilChanged } from 'rxjs/operators';

function RxJSCObservableComponent({
  rxObservable$
}: {
  rxObservable$: Observable<string>;
}) {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    const subscription = rxObservable$.pipe(
      throttleTime(50), // Throttle to 20 FPS
      distinctUntilChanged() // Only emit on value changes
    ).subscribe({
      next: setValue
    });

    return () => subscription.unsubscribe();
  }, [rxObservable$]);

  return <Text>{value}</Text>;
}
```

**RxJS Advantages:**
- Rich operators (throttle, debounce, filter, map, etc.)
- Memory leak protection built-in
- Testable with marbles
- Large ecosystem

**RxJS Disadvantages:**
- Large bundle size (~1.9MB uncompressed)
- Steeper learning curve
- Overkill for simple use cases
- Groundswell already has custom Observable

**Recommendation:** Use Groundswell's custom Observable for now. Add RxJS only if advanced operators are needed.

**Documentation URLs:**
- **Groundswell Observable:** `/home/dustin/projects/groundswell/src/utils/observable.ts`
- **RxJS Documentation:** https://rxjs.dev/
- **RxJS Operators:** https://rxjs.dev/guide/operators
- **RxJS with React:** https://blog.logrocket.com/rxjs-in-react-with-hooks/

---

## 5. Complete Examples

### Example 1: Full WorkflowTreeDebugger with Observable Stream

```tsx
#!/usr/bin/env node
/**
 * WorkflowTreeDebugger - Observable Stream Integration
 *
 * This example demonstrates:
 * - Subscribing to Observable event streams
 * - Re-rendering on tree changes
 * - Performance optimization with throttling
 * - Proper subscription cleanup
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { render, Box, Text, Newline, Static } from 'ink';
import { WorkflowTreeDebugger } from 'groundswell';
import { Observable } from './observable';

// ============================================================================
// Types
// ============================================================================

interface DebuggerProps {
  debugger: WorkflowTreeDebugger;
  events: Observable<WorkflowEvent>;
}

interface WorkflowEvent {
  type: string;
  timestamp: number;
  node?: WorkflowNode;
  data?: unknown;
}

interface WorkflowNode {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  children?: WorkflowNode[];
}

// ============================================================================
// Components
// ============================================================================

/**
 * StatusIcon - Colored status indicator
 */
const StatusIcon = ({ status }: { status: WorkflowNode['status'] }) => {
  const icons = {
    idle: <Text color="gray">○</Text>,
    running: <Text color="yellow">◐</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status];
};

/**
 * WorkflowTreeNode - Recursive tree renderer
 */
const WorkflowTreeNode = React.memo(({
  node,
  depth = 0
}: {
  node: WorkflowNode;
  depth?: number;
}) => {
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
          {node.name}
        </Text>
      </Box>
      {node.children?.map((child) => (
        <WorkflowTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
        />
      ))}
    </Box>
  );
});

/**
 * EventTimeline - Live event log with Static optimization
 */
const EventTimeline = ({ events }: { events: Observable<WorkflowEvent> }) => {
  const [eventLog, setEventLog] = useState<string[]>([]);

  useEffect(() => {
    const subscription = events.subscribe({
      next: (event) => {
        const timestamp = new Date(event.timestamp)
          .toISOString()
          .split('T')[1]
          .slice(0, -1);

        const node = event.node ? event.node.name : 'N/A';
        const logLine = `${timestamp} [${event.type}] ${node}`;

        setEventLog((prev) => [...prev, logLine]);
      }
    });

    return () => subscription.unsubscribe();
  }, [events]);

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Event Timeline</Text>
      <Static items={eventLog}>
        {(logLine, index) => (
          <Box key={index}>
            <Text dimColor>{logLine}</Text>
          </Box>
        )}
      </Static>
    </Box>
  );
};

/**
 * WorkflowTreeDebugger - Main debugger component
 */
const WorkflowTreeDebuggerComponent = ({
  debugger,
  events
}: DebuggerProps) => {
  const [tree, setTree] = useState<WorkflowNode>(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());

  // Throttle updates to prevent flickering
  const updateTree = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - (lastUpdate ? new Date(lastUpdate).getTime() : 0);

    if (timeSinceLastUpdate > 100) { // Throttle to 10 FPS
      setTree(debugger.getTree());
      setStats(debugger.getStats());
      setLastUpdate(new Date().toISOString());
    }
  }, [debugger, lastUpdate]);

  useEffect(() => {
    const subscription = events.subscribe({
      next: (event) => {
        // Update tree on structural changes
        if (
          event.type === 'childAttached' ||
          event.type === 'childDetached' ||
          event.type === 'treeUpdated'
        ) {
          updateTree();
        }

        // Update stats on events
        if (
          event.type === 'stepEnd' ||
          event.type === 'error' ||
          event.type === 'taskEnd'
        ) {
          updateTree();
        }
      },
      error: (err) => {
        console.error('Event stream error:', err);
      }
    });

    return () => subscription.unsubscribe();
  }, [events, updateTree]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Workflow Tree Debugger</Text>
        <Text dimColor> - Observable Stream Integration</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Nodes: </Text>
        <Text bold>{stats.nodeCount}</Text>
        <Text dimColor> | </Text>
        <Text>Events: </Text>
        <Text bold>{stats.eventCount}</Text>
        <Text dimColor> | </Text>
        <Text>Updated: </Text>
        <Text dimColor>{lastUpdate}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">Tree Structure</Text>
        <WorkflowTreeNode node={tree} />
      </Box>

      <EventTimeline events={events} />
    </Box>
  );
};

// ============================================================================
// Main
// ============================================================================

/**
 * Run the debugger with Observable stream
 */
export function runObservableDebugger(
  workflow: Workflow
): void {
  const debugger = new WorkflowTreeDebugger(workflow);

  render(
    <WorkflowTreeDebuggerComponent
      debugger={debugger}
      events={debugger.events}
    />,
    { exitOnCtrlC: true }
  );
}

// Export for testing
export { WorkflowTreeDebuggerComponent };
```

### Example 2: Real-Time Progress Monitor

```tsx
#!/usr/bin/env node
/**
 * Real-Time Progress Monitor with Observable Stream
 *
 * Demonstrates:
 * - Subscribing to progress updates
 * - Throttling high-frequency updates
 * - Multiple Observable streams
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Newline } from 'ink';
import { Observable } from './observable';

// ============================================================================
// Types
// ============================================================================

interface ProgressState {
  current: number;
  total: number;
  percent: number;
  status: 'running' | 'completed' | 'failed';
  message: string;
}

// ============================================================================
// Components
// ============================================================================

/**
 * ProgressBar - Visual progress indicator
 */
const ProgressBar = ({ percent, width = 40 }: { percent: number; width?: number }) => {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="blue">{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text> {percent.toFixed(1)}%</Text>
    </Box>
  );
};

/**
 * ProgressMonitor - Main progress component
 */
const ProgressMonitor = ({
  progressObservable,
  statusObservable,
  messageObservable
}: {
  progressObservable: Observable<number>;
  statusObservable: Observable<string>;
  messageObservable: Observable<string>;
}) => {
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 100,
    percent: 0,
    status: 'running',
    message: 'Initializing...'
  });

  // Throttle ref to prevent excessive updates
  const lastUpdateRef = useRef<number>(0);
  const throttleMs = 50; // 20 FPS

  useEffect(() => {
    // Subscribe to progress updates
    const progressSub = progressObservable.subscribe({
      next: (current) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= throttleMs) {
          setProgress((prev) => ({
            ...prev,
            current,
            percent: (current / prev.total) * 100
          }));
          lastUpdateRef.current = now;
        }
      }
    });

    // Subscribe to status updates
    const statusSub = statusObservable.subscribe({
      next: (status) => {
        setProgress((prev) => ({
          ...prev,
          status: status as ProgressState['status']
        }));
      }
    });

    // Subscribe to message updates
    const messageSub = messageObservable.subscribe({
      next: (message) => {
        setProgress((prev) => ({
          ...prev,
          message
        }));
      }
    });

    return () => {
      progressSub.unsubscribe();
      statusSub.unsubscribe();
      messageSub.unsubscribe();
    };
  }, [progressObservable, statusObservable, messageObservable]);

  const statusColor = {
    running: 'yellow',
    completed: 'green',
    failed: 'red'
  }[progress.status];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Progress Monitor</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Status: </Text>
        <Text bold color={statusColor}>{progress.status}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Message: </Text>
        <Text>{progress.message}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>Progress: </Text>
        <Text bold>{progress.current}</Text>
        <Text dimColor> / {progress.total}</Text>
      </Box>

      <ProgressBar percent={progress.percent} />
    </Box>
  );
};

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Create progress observables
 */
function exampleUsage() {
  const progressObservable = new Observable<number>();
  const statusObservable = new Observable<string>();
  const messageObservable = new Observable<string>();

  // Simulate progress
  let current = 0;
  const interval = setInterval(() => {
    current += 1;
    progressObservable.next(current);
    messageObservable.next(`Processing step ${current}...`);

    if (current >= 100) {
      clearInterval(interval);
      statusObservable.next('completed');
      messageObservable.next('Complete!');
    }
  }, 100);

  return {
    progressObservable,
    statusObservable,
    messageObservable
  };
}

export { ProgressMonitor, exampleUsage };
```

### Example 3: Interactive Debugger with Observable Events

```tsx
#!/usr/bin/env node
/**
 * Interactive Workflow Debugger with Observable Events
 *
 * Demonstrates:
 * - Real-time tree updates from Observable
 * - Interactive navigation with keyboard
 * - Event timeline with Static optimization
 * - Performance optimization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Newline, Static, useInput } from 'ink';
import { WorkflowTreeDebugger } from 'groundswell';
import { Observable } from './observable';

// ============================================================================
// Types
// ============================================================================

interface DebuggerState {
  selectedNodeId: string | null;
  showHelp: boolean;
  showEvents: boolean;
}

// ============================================================================
// Components
// ============================================================================

/**
 * InteractiveDebugger - Main debugger component
 */
const InteractiveDebugger = ({
  debugger,
  events
}: {
  debugger: WorkflowTreeDebugger;
  events: Observable<WorkflowEvent>;
}) => {
  const [tree, setTree] = useState(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [state, setState] = useState<DebuggerState>({
    selectedNodeId: null,
    showHelp: true,
    showEvents: true
  });

  // Update tree on events (throttled)
  useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 100;

    const subscription = events.subscribe({
      next: (event) => {
        const now = Date.now();
        if (now - lastUpdate >= throttleMs) {
          setTree(debugger.getTree());
          setStats(debugger.getStats());
          lastUpdate = now;
        }

        // Add to event log
        const timestamp = new Date(event.timestamp).toISOString().split('T')[1];
        const node = event.node ? event.node.name : 'N/A';
        const logLine = `${timestamp} [${event.type}] ${node}`;
        setEventLog((prev) => [...prev, logLine]);
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger, events]);

  // Keyboard navigation
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }

    if (input === 'h') {
      setState((prev) => ({ ...prev, showHelp: !prev.showHelp }));
    }

    if (input === 'e') {
      setState((prev) => ({ ...prev, showEvents: !prev.showEvents }));
    }

    if (key.return && state.selectedNodeId) {
      // Show node details
      const node = debugger.getNode(state.selectedNodeId);
      if (node) {
        console.log(`\nNode Details:\n${JSON.stringify(node, null, 2)}`);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Interactive Workflow Debugger</Text>
      </Box>

      {state.showHelp && (
        <Box
          marginBottom={1}
          borderStyle="single"
          borderColor="gray"
          padding={1}
          flexDirection="column"
        >
          <Text bold>Controls:</Text>
          <Text dimColor>h - Toggle help</Text>
          <Text dimColor>e - Toggle events</Text>
          <Text dimColor>Enter - Show node details</Text>
          <Text dimColor>Ctrl+C - Exit</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>Nodes: </Text>
        <Text bold>{stats.nodeCount}</Text>
        <Text dimColor> | </Text>
        <Text>Events: </Text>
        <Text bold>{stats.eventCount}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">Tree Structure</Text>
        <WorkflowTree
          tree={tree}
          selectedNodeId={state.selectedNodeId}
          onSelect={(nodeId) => setState((prev) => ({ ...prev, selectedNodeId: nodeId }))}
        />
      </Box>

      {state.showEvents && (
        <Box flexDirection="column">
          <Text bold color="yellow">Event Timeline</Text>
          <Static items={eventLog}>
            {(logLine, index) => (
              <Box key={index}>
                <Text dimColor>{logLine}</Text>
              </Box>
            )}
          </Static>
        </Box>
      )}
    </Box>
  );
};

/**
 * WorkflowTree - Interactive tree component
 */
const WorkflowTree = ({
  tree,
  selectedNodeId,
  onSelect,
  depth = 0
}: {
  tree: WorkflowNode;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  depth?: number;
}) => {
  return (
    <Box flexDirection="column">
      <TreeNode
        node={tree}
        depth={depth}
        isSelected={selectedNodeId === tree.id}
        onSelect={onSelect}
      />
      {tree.children?.map((child) => (
        <WorkflowTree
          key={child.id}
          tree={child}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </Box>
  );
};

/**
 * TreeNode - Single tree node
 */
const TreeNode = ({
  node,
  depth,
  isSelected,
  onSelect
}: {
  node: WorkflowNode;
  depth: number;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
}) => {
  const indent = '  '.repeat(depth);
  const branch = depth > 0 ? '├─ ' : '';

  return (
    <Box
      backgroundColor={isSelected ? 'blue' : undefined}
      onClick={() => onSelect(node.id)}
    >
      <Text dimColor>{indent}</Text>
      <Text dimColor>{branch}</Text>
      <StatusIcon status={node.status} />
      <Text> </Text>
      <Text
        bold={isSelected}
        color={node.status === 'failed' ? 'red' : 'white'}
      >
        {node.name}
      </Text>
      {isSelected && (
        <Text dimColor> ← Selected</Text>
      )}
    </Box>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  const icons = {
    idle: <Text color="gray">○</Text>,
    running: <Text color="yellow">◐</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status as keyof typeof icons] || <Text>?</Text>;
};

export { InteractiveDebugger };
```

---

## 6. Best Practices Checklist

### Subscription Management

- [x] **Always unsubscribe in useEffect cleanup**
  ```tsx
  useEffect(() => {
    const subscription = observable.subscribe({ next: setValue });
    return () => subscription.unsubscribe();
  }, [observable]);
  ```

- [x] **Handle all Observer callbacks**
  ```tsx
  observable.subscribe({
    next: (value) => { /* handle value */ },
    error: (err) => { /* handle error */ },
    complete: () => { /* handle completion */ }
  });
  ```

- [x] **Check for null/undefined in callbacks**
  ```tsx
  observable.subscribe({
    next: (value) => {
      if (value != null) {
        setValue(value);
      }
    }
  });
  ```

### Performance Optimization

- [x] **Throttle high-frequency updates**
  ```tsx
  const lastUpdateRef = useRef(0);
  const throttleMs = 50;

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= throttleMs) {
          setValue(value);
          lastUpdateRef.current = now;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [observable]);
  ```

- [x] **Use `<Static>` for logs and timelines**
  ```tsx
  <Static items={events}>
    {(event, index) => <Text key={index}>{event.message}</Text>}
  </Static>
  ```

- [x] **Memoize expensive components**
  ```tsx
  const ExpensiveTree = React.memo(({ node }) => {
    return <Box>{/* expensive rendering */}</Box>;
  });
  ```

- [x] **Use functional state updates to avoid stale closures**
  ```tsx
  // ❌ Wrong - stale closure
  setCount(count + 1);

  // ✅ Correct - functional update
  setCount((prev) => prev + 1);
  ```

### React Patterns

- [x] **Initialize state with function to avoid recalculation**
  ```tsx
  const [tree, setTree] = useState(() => debugger.getTree());
  ```

- [x] **Use useCallback for stable function references**
  ```tsx
  const handleSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);
  ```

- [x] **Use useMemo for expensive calculations**
  ```tsx
  const filteredEvents = useMemo(() => {
    return events.filter(e => e.type === 'error');
  }, [events]);
  ```

- [x] **Include all dependencies in useEffect**
  ```tsx
  useEffect(() => {
    // All used variables in dependency array
  }, [observable, callback, value]);
  ```

### Ink-Specific Patterns

- [x] **Always set exitOnCtrlC: true**
  ```tsx
  render(<App />, { exitOnCtrlC: true });
  ```

- [x] **Wrap text in `<Text>` component**
  ```tsx
  // ❌ Wrong
  <Box>Hello</Box>

  // ✅ Correct
  <Box><Text>Hello</Text></Box>
  ```

- [x] **Don't nest `<Box>` inside `<Text>`**
  ```tsx
  // ❌ Wrong
  <Text><Box>Hello</Box></Text>

  // ✅ Correct
  <Text><Text bold>Hello</Text></Text>
  ```

- [x] **Use flexbox for layout, not manual spacing**
  ```tsx
  // ❌ Wrong - manual spacing
  <Text>   Name</Text>

  // ✅ Correct - flexbox
  <Box justifyContent="space-between">
    <Text>Name</Text>
  </Box>
  ```

### Error Handling

- [x] **Handle errors in Observable subscriptions**
  ```tsx
  observable.subscribe({
    next: (value) => setValue(value),
    error: (err) => {
      console.error('Observable error:', err);
      setError(err as Error);
    }
  });
  ```

- [x] **Provide error boundaries**
  ```tsx
  class ErrorBoundary extends React.Component {
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('React error:', error, errorInfo);
    }

    render() {
      return this.props.children;
    }
  }
  ```

- [x] **Validate Observable input**
  ```tsx
  useEffect(() => {
    if (!observable || typeof observable.subscribe !== 'function') {
      console.error('Invalid Observable provided');
      return;
    }

    const subscription = observable.subscribe({ next: setValue });
    return () => subscription.unsubscribe();
  }, [observable]);
  ```

### Testing

- [x] **Test subscription cleanup**
  ```tsx
  test('cleans up subscription on unmount', () => {
    const unsubscribe = vi.fn();
    const observable = { subscribe: vi.fn(() => ({ unsubscribe })) };

    const { unmount } = render(<ObservableComponent observable={observable} />);
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
  ```

- [x] **Test error handling**
  ```tsx
  test('handles Observable errors', () => {
    const observable = new Observable<number>();
    const { getByText } = render(<ObservableComponent observable={observable} />);

    observable.error(new Error('Test error'));

    expect(getByText(/Error: Test error/)).toBeInTheDocument();
  });
  ```

---

## Summary and Key Takeaways

### Critical Findings

1. **`useStatic` does NOT exist in Ink**
   - Previous research mentioning `useStatic` was incorrect
   - Use `useMemo` for derived values
   - Use `useState` for reactive state
   - Use `<Static>` component for non-updating lists

2. **Observable + React integration pattern**
   ```tsx
   useEffect(() => {
     const subscription = observable.subscribe({ next: setValue });
     return () => subscription.unsubscribe();
   }, [observable]);
   ```

3. **Performance optimization is critical**
   - Throttle updates to 10-60 FPS for UI
   - Use `<Static>` for logs (100+ lines)
   - Memoize expensive components
   - Batch state updates

4. **Groundswell's custom Observable is sufficient**
   - Lightweight implementation
   - Error isolation built-in
   - No need for RxJS unless advanced operators needed

### Recommended Implementation Pattern

For the Groundswell WorkflowTreeDebugger:

```tsx
function WorkflowTreeDebugger({ debugger }: { debugger: WorkflowTreeDebugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= 100) { // Throttle to 10 FPS
          setTree(debugger.getTree());
          setStats(debugger.getStats());
          lastUpdateRef.current = now;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger]);

  return (
    <Box flexDirection="column">
      <Text>Nodes: {stats.nodeCount}</Text>
      <WorkflowTreeNode node={tree} />
    </Box>
  );
}
```

### Documentation URLs

- **Ink GitHub:** https://github.com/vadimdemedes/ink
- **Ink NPM:** https://www.npmjs.com/package/ink
- **React Hooks:** https://react.dev/reference/react
- **Observable Spec:** https://github.com/tc39/proposal-observable
- **RxJS Documentation:** https://rxjs.dev/
- **Groundswell Observable:** `/home/dustin/projects/groundswell/src/utils/observable.ts`
- **Ink Performance Research:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/research/04-ink-performance.md`
- **Observable Example:** `/home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts`

---

*Generated: 2026-01-24*
*Ink Version: 6.6.0*
*React Version: 19.0.0*
*Groundswell Version: 0.0.4*

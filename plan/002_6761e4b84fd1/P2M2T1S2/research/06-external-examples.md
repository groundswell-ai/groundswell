# External Examples and Best Practices for Reactive Ink CLI Applications

> Research on building reactive, real-time updating CLI applications using Ink (React for CLIs).

## 1. GitHub Examples of Reactive Ink CLIs

### Popular Real-World Ink-Based CLIs

The following notable projects use Ink for real-time updates, dashboards, and progress monitoring:

| Project | URL | Use Case |
|---------|-----|----------|
| **Claude Code** | https://github.com/anthropics/claude-code | Agentic coding tool with real-time output |
| **GitHub Copilot CLI** | https://githubnext.com/projects/copilot-cli | Command execution with live feedback |
| **Cloudflare Wrangler** | https://github.com/cloudflare/wrangler2 | Workers CLI with deployment progress |
| **Kubelive** | https://github.com/ameerthehacker/kubelive | Live Kubernetes cluster monitoring |
| **Tap** | https://node-tap.org | Test runner with real-time test results |
| **Gatsby** | https://www.gatsbyjs.org | Build tool with progress bars and task lists |
| **Tasuku** | https://github.com/privatenumber/tasuku | Minimal task runner |
| **Ink Task List** | https://github.com/privatenumber/ink-task-list | Task list component |
| **Listr2** | - | Task list with progress (uses Ink renderer) |
| **Fast CLI** | https://github.com/sindresorhus/fast-cli | Speed test with real-time updates |

### Key Patterns from Real-World Projects

#### Static Output Pattern (from Tap, Gatsby)
Uses `<Static>` component for permanent output above dynamic content:

```jsx
import {Static, Box, Text} from 'ink';
import {useState, useEffect} from 'react';

const TestRunner = () => {
  const [tests, setTests] = useState([]);

  useEffect(() => {
    // Simulate running tests
    const interval = setInterval(() => {
      if (tests.length < 10) {
        setTests(prev => [...prev, {id: prev.length, title: `Test #${prev.length + 1}`}]);
      } else {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [tests.length]);

  return (
    <>
      {/* Static: Tests don't re-render, only new items are added */}
      <Static items={tests}>
        {test => (
          <Box key={test.id}>
            <Text color="green">✔ {test.title}</Text>
          </Box>
        )}
      </Static>

      {/* Dynamic: Always shows current count */}
      <Box marginTop={1}>
        <Text dimColor>Completed tests: {tests.length}</Text>
      </Box>
    </>
  );
};
```

#### Counter Pattern (Basic Real-Time Updates)
From Ink's built-in examples:

```jsx
import {useState, useEffect} from 'react';
import {Text} from 'ink';

const Counter = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(previousCounter => previousCounter + 1);
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return <Text color="green">{counter} tests passed</Text>;
};
```

---

## 2. Ink Documentation for Reactive Patterns

### Built-In Hooks for Real-Time Updates

#### `useApp()` - App Lifecycle Control
```jsx
import {useApp} from 'ink';

const Example = () => {
  const {exit} = useApp();

  useEffect(() => {
    setTimeout(() => exit(), 5000);
  }, []);

  return <Text>Exiting in 5 seconds...</Text>;
};
```

#### `useStdout()` - Direct Output Control
```jsx
import {useStdout} from 'ink';

const Example = () => {
  const {write} = useStdout();

  useEffect(() => {
    write('Hello from Ink to stdout\n');
  }, []);

  return <Text>Regular output</Text>;
};
```

#### `useInput()` - Real-Time User Input
```jsx
import {useInput} from 'ink';

const UserInput = () => {
  useInput((input, key) => {
    if (input === 'q') {
      // Exit program
    }
    if (key.leftArrow) {
      // Handle arrow key
    }
    if (key.ctrl && input === 'c') {
      // Handle Ctrl+C
    }
  });

  return <Text>Press 'q' to quit</Text>;
};
```

#### `useFocus()` - Focus Management
```jsx
import {useFocus, Text} from 'ink';

const FocusableComponent = () => {
  const {isFocused} = useFocus({autoFocus: true});

  return (
    <Text>
      {isFocused ? 'I am focused' : 'I am not focused'}
    </Text>
  );
};
```

### Key Ink Components for Reactive UIs

| Component | Purpose | Use Case |
|-----------|---------|----------|
| `<Static>` | Permanent output | Completed tasks, logs |
| `<Box>` | Layout container | Flexbox layouts |
| `<Text>` | Text display | Formatted output |
| `<Transform>` | String transformation | Gradients, links, effects |
| `<Spacer>` | Flexible space | Pushing elements apart |

### Render Options for Performance

```jsx
import {render} from 'ink';

render(<App />, {
  // Max FPS for render updates (default: 30)
  maxFps: 30,

  // Enable incremental rendering to reduce flicker
  incrementalRendering: true,

  // Patch console to avoid mixing output
  patchConsole: true,

  // Callback after each render
  onRender: ({renderTime}) => {
    console.log(`Render took ${renderTime}ms`);
  }
});
```

---

## 3. Best Practices for Real-Time CLI Updates

### Throttling and Debouncing Strategies

#### 1. Use `maxFps` Option (Built-In)
```jsx
render(<App />, {
  maxFps: 10, // Limit to 10 FPS for high-frequency updates
});
```

#### 2. Custom Throttle for Updates
```jsx
import {useState, useEffect, useRef} from 'react';
import {throttle} from 'lodash';

const FastUpdatingComponent = ({dataStream}) => {
  const [data, setData] = useState(null);
  const throttledUpdate = useRef(
    throttle((newData) => {
      setData(newData);
    }, 100) // Update at most every 100ms
  ).current;

  useEffect(() => {
    const subscription = dataStream.subscribe(throttledUpdate);

    return () => {
      subscription.unsubscribe();
      throttledUpdate.cancel(); // Clean up throttle
    };
  }, [dataStream, throttledUpdate]);

  return <Text>{JSON.stringify(data)}</Text>;
};
```

#### 3. Debounce for User Input
```jsx
import {useState, useEffect} from 'react';
import {debounce} from 'lodash';

const SearchInput = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Debounce search to avoid excessive updates
  const debouncedSearch = useRef(
    debounce((q) => {
      // Perform search
      setResults(performSearch(q));
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  // ... rest of component
};
```

### Performance Optimization Patterns

#### 1. Use `React.memo` for Expensive Components
```jsx
const ExpensiveRow = React.memo(({data}) => {
  return (
    <Box>
      <Text>{complexCalculation(data)}</Text>
    </Box>
  );
});
```

#### 2. Use `useMemo` for Derived State
```jsx
const Dashboard = ({events}) => {
  const stats = useMemo(() => {
    return {
      total: events.length,
      errors: events.filter(e => e.type === 'error').length,
      warnings: events.filter(e => e.type === 'warning').length,
    };
  }, [events]);

  return (
    <Box>
      <Text>Total: {stats.total}, Errors: {stats.errors}</Text>
    </Box>
  );
};
```

#### 3. Virtualize Large Lists
```jsx
const VirtualList = ({items, visibleCount = 10}) => {
  const [offset, setOffset] = useState(0);

  return (
    <Box flexDirection="column" height={visibleCount}>
      {items.slice(offset, offset + visibleCount).map(item => (
        <Box key={item.id}>
          <Text>{item.name}</Text>
        </Box>
      ))}
    </Box>
  );
};
```

### Terminal Output Flickering Prevention

#### 1. Use `<Static>` for Historical Data
```jsx
<Static items={logs}>
  {log => <LogEntry key={log.id} log={log} />}
</Static>
```

#### 2. Enable Incremental Rendering
```jsx
render(<App />, {
  incrementalRendering: true, // Only update changed lines
});
```

#### 3. Batch Updates
```jsx
const [updates, setUpdates] = useState([]);

useEffect(() => {
  const interval = setInterval(() => {
    // Batch multiple updates into single state change
    setUpdates(prev => [...prev, ...getNewUpdates()]);
  }, 500); // Less frequent updates

  return () => clearInterval(interval);
}, []);
```

#### 4. Use `overflow` to Hide Partial Updates
```jsx
<Box overflow="hidden" height={10}>
  <Text>Long content that won't cause reflow</Text>
</Box>
```

---

## 4. React Hooks Patterns for Observables

### Custom `useObservable` Hook

#### Basic Implementation
```jsx
import {useState, useEffect} from 'react';

export function useObservable(observable, initialValue) {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: (value) => setState(value),
      error: (err) => console.error('Observable error:', err),
      complete: () => console.log('Observable complete'),
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable]);

  return state;
}

// Usage
const MyComponent = () => {
  const value = useObservable(dataStream$, null);
  return <Text>{value}</Text>;
};
```

#### Advanced Implementation with Error and Complete States
```jsx
import {useState, useEffect} from 'react';

export function useObservable(observable$, initialValue) {
  const [state, setState] = useState({
    data: initialValue,
    error: null,
    isLoading: true,
    isComplete: false,
  });

  useEffect(() => {
    const subscription = observable$.subscribe({
      next: (data) => setState(prev => ({
        ...prev,
        data,
        isLoading: false,
      })),
      error: (error) => setState(prev => ({
        ...prev,
        error,
        isLoading: false,
      })),
      complete: () => setState(prev => ({
        ...prev,
        isComplete: true,
        isLoading: false,
      })),
    });

    return () => subscription.unsubscribe();
  }, [observable$]);

  return state;
}

// Usage
const DataComponent = () => {
  const {data, error, isLoading, isComplete} = useObservable(dataStream$, null);

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text color="red">Error: {error.message}</Text>;
  if (isComplete) return <Text color="green">Complete: {data}</Text>;
  return <Text>{data}</Text>;
};
```

### RxJS Integration Pattern

```jsx
import {useState, useEffect, useMemo} from 'react';
import {interval, Subject} from 'rxjs';
import {scan, throttleTime, filter} from 'rxjs/operators';

const MetricsDashboard = ({eventStream}) => {
  const [metrics, setMetrics] = useState({count: 0, errors: 0});

  const metrics$ = useMemo(() => {
    return eventStream.pipe(
      throttleTime(100), // Throttle high-frequency events
      scan((acc, event) => ({
        count: acc.count + 1,
        errors: acc.errors + (event.type === 'error' ? 1 : 0),
      }), {count: 0, errors: 0})
    );
  }, [eventStream]);

  useEffect(() => {
    const subscription = metrics$.subscribe(setMetrics);
    return () => subscription.unsubscribe();
  }, [metrics$]);

  return (
    <Box>
      <Text>Events: {metrics.count} | Errors: {metrics.errors}</Text>
    </Box>
  );
};
```

### Observable-like Subject Pattern (Without RxJS)

```jsx
import {useState, useEffect, useRef} from 'react';

class SimpleSubject {
  constructor() {
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  next(value) {
    this.subscribers.forEach(callback => callback(value));
  }

  complete() {
    this.subscribers.forEach(callback => callback({complete: true}));
  }
}

export function useSubject(subject, initialValue) {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    const unsubscribe = subject.subscribe((value) => {
      if (value.complete) {
        setState(prev => ({...prev, isComplete: true}));
      } else {
        setState(value);
      }
    });

    return unsubscribe;
  }, [subject]);

  return state;
}

// Usage
const eventBus = new SimpleSubject();

const Producer = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      eventBus.next({timestamp: Date.now()});
    }, 1000);

    return () => {
      clearInterval(interval);
      eventBus.complete();
    };
  }, []);

  return <Text>Producing events...</Text>;
};

const Consumer = () => {
  const event = useSubject(eventBus, null);
  if (!event) return <Text>Waiting for events...</Text>;
  if (event.isComplete) return <Text color="green">Complete!</Text>;
  return <Text>Event: {event.timestamp}</Text>;
};
```

### WebSocket/Streaming Pattern

```jsx
import {useState, useEffect, useRef} from 'react';

function useWebSocket(url) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);

  useEffect(() => {
    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => setStatus('connected');
    wsRef.current.onclose = () => setStatus('disconnected');
    wsRef.current.onerror = () => setStatus('error');
    wsRef.current.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return {data, status};
}
```

---

## 5. Common Gotchas and Solutions

### 1. Memory Leaks from Uncleared Subscriptions

**Problem:** Subscriptions not cleaned up on unmount

**Solution:** Always return cleanup function
```jsx
// ❌ BAD
useEffect(() => {
  observable.subscribe(data => setData(data));
}, []);

// ✅ GOOD
useEffect(() => {
  const subscription = observable.subscribe(data => setData(data));
  return () => subscription.unsubscribe();
}, []);
```

### 2. Re-render Loops

**Problem:** State updates trigger subscriptions which trigger state updates

**Solution:** Use `useRef` or `useMemo` for stable references
```jsx
// ❌ BAD - Creates new observable on every render
useEffect(() => {
  const obs$ = createObservable();
  const sub = obs$.subscribe(setData);
  return () => sub.unsubscribe();
});

// ✅ GOOD - Observable reference is stable
const obs$ = useMemo(() => createObservable(), []);

useEffect(() => {
  const sub = obs$.subscribe(setData);
  return () => sub.unsubscribe();
}, [obs$]);
```

### 3. Performance Issues with Large Trees

**Problem:** Re-rendering entire tree for small updates

**Solutions:**

a) Use `<Static>` for historical items
```jsx
<Static items={logs}>
  {log => <LogEntry key={log.id} log={log} />}
</Static>
```

b) Memoize expensive components
```jsx
const ExpensiveRow = React.memo(({data}) => {
  // Complex rendering
});
```

c) Limit update frequency
```jsx
render(<App />, {maxFps: 10});
```

### 4. Missing Dependency Arrays

**Problem:** Subscriptions recreated unnecessarily

**Solution:** Proper dependency management
```jsx
useEffect(() => {
  // Only recreate when observable$ changes
  const subscription = observable$.subscribe(setData);
  return () => subscription.unsubscribe();
}, [observable$]); // Include dependencies
```

### 5. Stale Closures in Event Handlers

**Problem:** Event handlers reference old state

**Solution:** Use functional state updates or refs
```jsx
// ❌ BAD - May have stale state
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count); // Stale count
  }, 1000);
  return () => clearInterval(interval);
}, [count]);

// ✅ GOOD - Functional update
useEffect(() => {
  const interval = setInterval(() => {
    setCount(prev => prev + 1); // Always fresh
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

### 6. Console Output Mixing with Ink

**Problem:** Console.log appears over Ink output

**Solutions:**

a) Use `patchConsole` (default enabled)
```jsx
render(<App />, {patchConsole: true});
```

b) Use `useStdout().write()` for external output
```jsx
const {write} = useStdout();
useEffect(() => {
  write('External output\n');
}, []);
```

c) Use `<Static>` for logs
```jsx
<Static items={consoleLogs}>
  {log => <Text key={log.id}>{log.message}</Text>}
</Static>
```

### 7. Terminal Size Changes

**Problem:** Layout breaks when terminal resizes

**Solution:** Listen to resize events
```jsx
import {useStdoutDimensions} from 'ink';

const ResponsiveComponent = () => {
  const {columns, rows} = useStdoutDimensions();

  return (
    <Box width={columns > 80 ? "50%" : "100%"}>
      <Text>Responsive content</Text>
    </Box>
  );
};
```

### 8. Focus Management Issues

**Problem:** Input not captured correctly

**Solution:** Use `isActive` flag
```jsx
const {isFocused} = useFocus({isActive: isInputEnabled});

useInput((input, key) => {
  if (!isFocused) return; // Ignore when not focused
  // Handle input
});
```

---

## 6. Summary of Key Resources

### Official Ink Resources
- **GitHub**: https://github.com/vadimdemedes/ink
- **npm**: https://npmjs.com/package/ink
- **React Docs**: https://reactjs.org (Ink is a React renderer)

### Useful Ink Components
- `ink-text-input` - Text input component
- `ink-spinner` - Loading spinner
- `ink-select-input` - Dropdown selection
- `ink-progress-bar` - Progress indication
- `ink-task-list` - Task list with real-time updates
- `ink-table` - Table component
- `ink-testing-library` - Testing utilities

### Performance Checklist
- [ ] Use `maxFps` to limit update frequency
- [ ] Use `<Static>` for historical output
- [ ] Enable `incrementalRendering` to reduce flicker
- [ ] Memoize expensive components with `React.memo`
- [ ] Use `useMemo` for derived state
- [ ] Throttle/debounce high-frequency updates
- [ ] Always cleanup subscriptions in useEffect
- [ ] Use stable references with `useMemo`/`useRef`

---

## 7. References

### URLs Referenced

#### Core Ink Resources
- https://github.com/vadimdemedes/ink - Official Ink repository
- https://github.com/facebook/yoga - Flexbox layout engine used by Ink
- https://npmjs.com/package/ink - Ink npm package
- https://reactjs.org - React documentation (Ink is a React renderer)

#### Real-World Ink CLI Projects (from Official README)
**AI/Agent-Based CLIs:**
- https://github.com/anthropics/claude-code - Anthropic's agentic coding tool
- https://github.com/google-gemini/gemini-cli - Google's agentic coding tool
- https://githubnext.com/projects/copilot-cli - GitHub Copilot for CLI
- https://github.com/qodo-ai/command - Qodo Command - Build, run, and manage AI agents
- https://github.com/nano-collective/nanocoder - Community-built local-first AI coding agent
- https://github.com/neovateai/neovate-code - AntGroup's agentic coding tool

**Infrastructure & DevOps CLIs:**
- https://github.com/cloudflare/wrangler2 - Cloudflare Workers CLI
- https://github.com/hashicorp/terraform-cdk - Terraform Cloud Development Kit
- https://github.com/Shopify/cli - Shopify CLI for apps, themes, and storefronts
- https://github.com/darksworm/argonaut - Argo CD resource management
- https://github.com/ameerthehacker/kubelive - Kubernetes live cluster monitoring
- https://github.com/t1mmen/srtd - Live-reloading SQL templates for Supabase

**Build Tools & Task Runners:**
- https://www.gatsbyjs.org - Gatsby build tool with progress bars
- https://node-tap.org - Test runner with real-time test results
- https://github.com/privatenumber/tasuku - Minimal task runner
- https://github.com/nytimes/kyt - NYT's configuration toolkit
- https://github.com/npm/tink - Next-generation runtime and package manager

**Interactive Games:**
- https://github.com/jrr/inkle - Wordle game
- https://github.com/mordv/mnswpr - Minesweeper game
- https://github.com/mynameisankit/turdle - Wordle game
- https://github.com/mrozio13pl/sudoku-in-terminal - Sudoku game
- https://github.com/zyishai/sea-trader - Trading simulator game

**Developer Tools:**
- https://github.com/sindresorhus/fast-cli - Speed test with real-time updates
- https://github.com/segmentio/typewriter - Generates analytics clients
- https://github.com/oblador/loki - Visual regression testing for Storybook
- https://github.com/teambit/bit - Component distribution and collaboration
- https://github.com/twilio-labs/plugin-signal2020 - Twilio SIGNAL CLI
- https://github.com/sindresorhus/emoj - Emoji finder
- https://github.com/maticzav/emma-cli - npm package finder
- https://github.com/akgondber/npm-check-extras - Dependency checker
- https://github.com/GitGud-org/GitGud - Interactive Git GUI
- https://github.com/pranshuchittora/autarky - Old node_modules cleaner

**Package Management & Configuration:**
- https://github.com/loki/loki - Visual regression testing
- https://github.com/mishieck/ink-titled-box - Box with title component
- https://github.com/goliney/garson - Config-based CLI builder

**Specialized CLIs:**
- https://github.com/Pobepto/walle - Crypto wallet for EVM networks
- https://github.com/elevenlabs/cli - ElevenLabs agents client
- https://github.com/supreme-gg-gg/instagram-cli - Instagram client
- https://github.com/krychu/lrn - Learning by repetition tool
- https://github.com/jdeniau/changelog-view - Changelog viewer
- https://github.com/mgrip/startd - React component to web app converter
- https://github.com/hexrcs/wiki-cli - Wikipedia search CLI

**Related Libraries:**
- https://github.com/vadimdemedes/create-ink-app - Ink CLI scaffolding
- https://github.com/vadimdemedes/import-jsx - JSX import/transformation
- https://github.com/esbuild-kit/esm-loader - ESM loader
- https://github.com/privatenumber/ink-task-list - Task list component

**Ink Ecosystem Components:**
- ink-text-input - Text input component
- ink-spinner - Loading spinner
- ink-select-input - Dropdown selection
- ink-progress-bar - Progress indication
- ink-table - Table component
- ink-testing-library - Testing utilities
- ink-gradient - Color gradients
- ink-big-text - Large text effects
- ink-link - Clickable links
- ink-picture - Image display
- ink-tab - Tab component
- ink-multi-select - Multi-select input
- ink-divider - Divider component
- ink-ascii - ASCII art text
- ink-markdown - Markdown rendering
- ink-quicksearch-input - Quick search navigation
- ink-confirm-input - Yes/No confirmation
- ink-syntax-highlight - Code highlighting
- ink-form - Form component
- ink-spawn - Child process management
- ink-titled-box - Titled box component
- ink-chart - Charts (sparkline, bar)
- ink-scroll-view - Scrollable container
- ink-scroll-list - Scrollable list
- ink-use-stdout-dimensions - Terminal dimensions hook

### Key Implementation Files
This research document focuses on external patterns and examples. For implementation details, see:
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/prototype/` - Prototype implementation
- Ink source: `/home/dustin/projects/groundswell/node_modules/ink/`

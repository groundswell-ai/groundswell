# Testing Patterns for Ink Components - Research Document

**Created:** 2026-01-24
**Purpose:** Analyze existing test patterns in the codebase to understand how to test Ink components
**Context:** P2M2T1S2 - Testing Strategy for Ink CLI Components

---

## Executive Summary

This document analyzes the existing test setup in the groundswell codebase and provides patterns for testing Ink components. The codebase uses **Vitest** as the test framework and currently has **no existing Ink component tests**. Testing Ink components requires **`ink-testing-library`**, which is not yet installed.

---

## 1. Existing Test Setup

### 1.1 Test Framework: Vitest

**File:** `/home/dustin/projects/groundswell/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for TypeScript files
    },
  },
  esbuild: {
    target: 'node18',
  },
});
```

**Key Findings:**
- Test files use `.test.ts` extension
- Tests are located in `src/__tests__/` directory
- `globals: true` - no need to import vitest functions
- `esbuild` target is `node18`
- Currently only tests `.ts` files (not `.tsx`)

### 1.2 Test Scripts

**File:** `/home/dustin/projects/groundswell/package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.21.0",
    "typescript": "^5.2.0",
    "vitest": "^1.0.0"
  }
}
```

**Key Findings:**
- Vitest version: `^1.0.0`
- TypeScript: `^5.2.0`
- Node.js: `>=20` (engines field)
- No `ink-testing-library` installed yet
- No `@types/react` or `@types/react-dom` installed

### 1.3 Dependencies Status

**Current Dependencies:**
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.1",
    "ink": "^6.6.0",
    "lru-cache": "^10.4.3",
    "react": "^19.0.0",
    "zod": "^3.23.0"
  }
}
```

**Missing for Testing:**
- `ink-testing-library` - NOT installed
- `@types/react` - NOT installed (required for Ink 6.x + React 19)

**Required Install:**
```bash
npm install --save-dev ink-testing-library @types/react
```

---

## 2. Existing Test Patterns in Codebase

### 2.1 Unit Test Structure

**Example:** `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Observable, ObservableLogger } from '../../utils/observable';

describe('Observable', () => {
  describe('with logger injection', () => {
    let mockLogger: ObservableLogger;

    beforeEach(() => {
      mockLogger = {
        error: vi.fn(),
      };
    });

    it('should log subscriber next() errors via logger', () => {
      const observable = new Observable<number>(mockLogger);
      const testError = new Error('Next error');

      const throwingSubscriber = {
        next: () => {
          throw testError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.next(42);

      expect(mockLogger.error).toHaveBeenCalledWith('Observable subscriber error', {
        error: testError,
      });
    });
  });
});
```

**Key Patterns:**
1. **Nested `describe` blocks** for organizing related tests
2. **`beforeEach`** for test setup
3. **`vi.fn()`** for creating mock functions
4. **`expect().toHaveBeenCalledWith()`** for verifying function calls
5. **Test data factories** for creating test objects

### 2.2 Integration Test Structure

**Example:** `/home/dustin/projects/groundswell/src/__tests__/integration/workflow-reparenting.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowTreeDebugger } from '../../index.js';

describe('WorkflowTreeDebugger', () => {
  it('should render tree string', () => {
    const wf = new DebugTestWorkflow('Root');
    const debugger_ = new WorkflowTreeDebugger(wf);

    const tree = debugger_.toTreeString();
    expect(tree).toContain('Root');
    expect(tree).toContain('[idle]');
  });

  it('should show child nodes in tree', () => {
    const parent = new DebugTestWorkflow('Parent');
    const child1 = new DebugTestWorkflow('Child1', parent);
    const child2 = new DebugTestWorkflow('Child2', parent);

    const debugger_ = new WorkflowTreeDebugger(parent);
    const tree = debugger_.toTreeString();

    expect(tree).toContain('Parent');
    expect(tree).toContain('Child1');
    expect(tree).toContain('Child2');
    expect(tree).toContain('├──');
    expect(tree).toContain('└──');
  });
});
```

**Key Patterns:**
1. **Import from `../../index.js`** for main exports
2. **Class-based test workflows** extending `Workflow`
3. **String-based assertions** (`toContain()`)
4. **Visual output verification** (tree structure)

### 2.3 Test Helper Functions

**File:** `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`

```typescript
export function collectAllNodes(root: Workflow): Workflow[] {
  const nodes: Workflow[] = [];
  const queue: Workflow[] = [root];
  const visited = new Set<Workflow>();

  while (queue.length > 0) {
    const node = queue.shift()!;

    if (visited.has(node)) {
      throw new Error(`Circular reference detected at ${node.node.name}`);
    }

    visited.add(node);
    nodes.push(node);
    queue.push(...node.children);
  }

  return nodes;
}

export function verifyBidirectionalLink(parent: Workflow, child: Workflow): void {
  if (child.parent !== parent) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.children.includes(child)) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${parent.node.name}".children does not contain "${child.node.name}"`
    );
  }
}
```

**Key Patterns:**
1. **Reusable helper functions** for common assertions
2. **Descriptive error messages** for debugging
3. **Tree traversal utilities**
4. **Invariant verification** functions

---

## 3. Testing Ink Components

### 3.1 Installation

**Step 1: Install ink-testing-library**

```bash
npm install --save-dev ink-testing-library
```

**Step 2: Install @types/react for React 19**

```bash
npm install --save-dev @types/react@^19.0.0
```

**Step 3: Update vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for TypeScript files
    },
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic',      // ADD: Required for Ink
    jsxImportSource: 'ink' // ADD: Required for Ink
  },
});
```

### 3.2 Basic Ink Component Test

**File:** `src/components/StatusIcon.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusIcon } from './StatusIcon';

describe('StatusIcon', () => {
  it('should render completed status icon', () => {
    const { lastFrame } = render(<StatusIcon status="completed" />);

    expect(lastFrame()).toContain('✓');
  });

  it('should render failed status icon in red', () => {
    const { lastFrame } = render(<StatusIcon status="failed" />);

    const output = lastFrame();
    expect(output).toContain('✗');
    // Note: Color codes are ANSI escape sequences, harder to test directly
  });

  it('should render running status icon', () => {
    const { lastFrame } = render(<StatusIcon status="running" />);

    expect(lastFrame()).toContain('◐');
  });

  it('should render idle status icon', () => {
    const { lastFrame } = render(<StatusIcon status="idle" />);

    expect(lastFrame()).toContain('○');
  });

  it('should render cancelled status icon', () => {
    const { lastFrame } = render(<StatusIcon status="cancelled" />);

    expect(lastFrame()).toContain('⊘');
  });
});
```

### 3.3 Testing Workflow Tree Component

**File:** `src/components/WorkflowTree.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { WorkflowTree } from './WorkflowTree';

describe('WorkflowTree', () => {
  it('should render single node tree', () => {
    const mockNode = {
      id: 'root',
      name: 'TestWorkflow',
      status: 'idle',
      children: [],
    };

    const { lastFrame } = render(<WorkflowTree node={mockNode} />);

    expect(lastFrame()).toContain('TestWorkflow');
    expect(lastFrame()).toContain('○');
    expect(lastFrame()).toContain('[idle]');
  });

  it('should render tree with children', () => {
    const mockNode = {
      id: 'root',
      name: 'Parent',
      status: 'running',
      children: [
        { id: 'child1', name: 'Child1', status: 'completed', children: [] },
        { id: 'child2', name: 'Child2', status: 'idle', children: [] },
      ],
    };

    const { lastFrame } = render(<WorkflowTree node={mockNode} />);

    const output = lastFrame();
    expect(output).toContain('Parent');
    expect(output).toContain('Child1');
    expect(output).toContain('Child2');
    expect(output).toContain('├──');
    expect(output).toContain('└──');
  });

  it('should render nested tree structure', () => {
    const mockNode = {
      id: 'root',
      name: 'Root',
      status: 'completed',
      children: [
        {
          id: 'child1',
          name: 'Child1',
          status: 'completed',
          children: [
            { id: 'grandchild1', name: 'Grandchild1', status: 'failed', children: [] },
          ],
        },
      ],
    };

    const { lastFrame } = render(<WorkflowTree node={mockNode} />);

    const output = lastFrame();
    expect(output).toContain('Root');
    expect(output).toContain('Child1');
    expect(output).toContain('Grandchild1');
    expect(output).toContain('    '); // Indentation for grandchild
  });
});
```

### 3.4 Testing with Real Workflow Data

**File:** `src/debugger/InkWorkflowTreeDebugger.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Workflow } from '../core/workflow';
import { InkWorkflowTreeDebugger } from './InkWorkflowTreeDebugger';

class TestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('completed');
  }
}

describe('InkWorkflowTreeDebugger', () => {
  it('should render workflow tree', () => {
    const root = new TestWorkflow('Root');
    const child1 = new TestWorkflow('Child1', root);
    const child2 = new TestWorkflow('Child2', root);

    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} />);

    const output = lastFrame();
    expect(output).toContain('Root');
    expect(output).toContain('Child1');
    expect(output).toContain('Child2');
  });

  it('should update when workflow status changes', async () => {
    const root = new TestWorkflow('Root');

    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} />);

    // Initial state
    expect(lastFrame()).toContain('[idle]');

    // Run workflow
    await root.run();

    // Updated state
    expect(lastFrame()).toContain('[completed]');
  });

  it('should display error messages for failed workflows', async () => {
    class FailingWorkflow extends Workflow {
      async run(): Promise<void> {
        throw new Error('Test error');
      }
    }

    const root = new FailingWorkflow('Root');
    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} />);

    await root.run().catch(() => {}); // Ignore error

    const output = lastFrame();
    expect(output).toContain('[failed]');
    expect(output).toContain('Test error');
  });
});
```

### 3.5 Testing User Input

**File:** `src/components/InteractiveDebugger.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { InteractiveDebugger } from './InteractiveDebugger';

describe('InteractiveDebugger', () => {
  it('should handle keyboard input', async () => {
    const mockWorkflow = {
      id: 'root',
      name: 'Test',
      status: 'idle',
      children: [],
    };

    const { lastFrame, stdin } = render(
      <InteractiveDebugger workflow={mockWorkflow} />
    );

    // Simulate 'q' key press
    stdin.write('q');

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify exit (component should unmount or show exit message)
  });

  it('should toggle node expansion on Enter', async () => {
    const mockWorkflow = {
      id: 'root',
      name: 'Test',
      status: 'idle',
      children: [
        { id: 'child1', name: 'Child1', status: 'idle', children: [] },
      ],
      expanded: false,
    };

    const { lastFrame, stdin } = render(
      <InteractiveDebugger workflow={mockWorkflow} />
    );

    // Child should not be visible initially
    expect(lastFrame()).not.toContain('Child1');

    // Press Enter to expand
    stdin.write('\r'); // Enter key

    await new Promise(resolve => setTimeout(resolve, 100));

    // Child should now be visible
    expect(lastFrame()).toContain('Child1');
  });
});
```

---

## 4. Vitest Configuration for Ink Tests

### 4.1 Updated vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      // Handle .js extensions in imports for TypeScript files
    },
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic',
    jsxImportSource: 'ink',
  },
});
```

### 4.2 Test File Naming Conventions

```
src/__tests__/
├── unit/
│   ├── workflow.test.ts           # Regular unit tests
│   ├── observable.test.ts         # Regular unit tests
│   └── components/
│       ├── StatusIcon.test.tsx    # Ink component tests
│       └── WorkflowTree.test.tsx  # Ink component tests
├── integration/
│   ├── workflow-reparenting.test.ts
│   └── debugger/
│       └── InkWorkflowTreeDebugger.test.tsx  # Integration tests with Ink
└── helpers/
    ├── tree-verification.ts
    └── ink-test-helpers.ts        # Helper functions for Ink tests
```

---

## 5. Common Test Patterns for Ink

### 5.1 Testing Component Output

```typescript
import { render } from 'ink-testing-library';

const { lastFrame } = render(<MyComponent />);
const output = lastFrame();

// String-based assertions
expect(output).toContain('Expected Text');
expect(output).toMatch(/regex pattern/);
expect(output).toContain('✓'); // Unicode symbols
```

### 5.2 Testing Component Updates

```typescript
const { lastFrame } = render(<MyComponent data={initialData} />);

// Initial render
expect(lastFrame()).toContain('Initial');

// Update props
rerender(<MyComponent data={updatedData} />);

// Check update
expect(lastFrame()).toContain('Updated');
```

### 5.3 Testing User Input

```typescript
const { stdin, lastFrame } = render(<InteractiveComponent />);

// Simulate key press
stdin.write('q');

// Wait for update
await waitFor(() => {
  expect(lastFrame()).toContain('Quit');
});
```

### 5.4 Testing Async Components

```typescript
const { lastFrame } = render(<AsyncComponent />);

// Loading state
expect(lastFrame()).toContain('Loading...');

// Wait for completion
await waitFor(() => {
  expect(lastFrame()).toContain('Complete');
});
```

### 5.5 Testing Error States

```typescript
const { lastFrame } = render(<ErrorComponent />);

// Trigger error
const errorButton = findButton(lastFrame(), 'Trigger Error');
errorButton.click();

// Check error display
expect(lastFrame()).toContain('Error:');
expect(lastFrame()).toContain('Test error message');
```

---

## 6. Testing Observable with Ink

### 6.1 Testing Observable Integration

**File:** `src/__tests__/unit/ink-observable-integration.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { Observable } from '../utils/observable';
import { ObservableInkComponent } from '../components/ObservableInkComponent';

describe('Observable + Ink Integration', () => {
  it('should update UI when observable emits', async () => {
    const observable = new Observable<number>();
    const { lastFrame } = render(<ObservableInkComponent observable={observable} />);

    // Initial state
    expect(lastFrame()).toContain('Value: 0');

    // Emit new value
    observable.next(42);

    // Wait for re-render
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check updated state
    expect(lastFrame()).toContain('Value: 42');
  });

  it('should handle errors in subscribers', () => {
    const mockLogger = { error: vi.fn() };
    const observable = new Observable<number>(mockLogger);

    const throwingSubscriber = {
      next: () => {
        throw new Error('Test error');
      },
    };

    observable.subscribe(throwingSubscriber);
    observable.next(42);

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

---

## 7. Test Helper Functions for Ink

### 7.1 Custom Test Helpers

**File:** `src/__tests__/helpers/ink-test-helpers.ts`

```typescript
import type { RenderOptions } from 'ink-testing-library';

/**
 * Render Ink component with default options
 */
export function renderInk(component: React.ReactElement, options?: RenderOptions) {
  return render(component, {
    debug: false,
    ...options,
  });
}

/**
 * Wait for text to appear in output
 */
export async function waitForText(
  renderer: { lastFrame: () => string },
  text: string,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (renderer.lastFrame().includes(text)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Text "${text}" not found within ${timeout}ms`);
}

/**
 * Count occurrences of text in output
 */
export function countOccurrences(output: string, text: string): number {
  const matches = output.match(new RegExp(text, 'g'));
  return matches ? matches.length : 0;
}

/**
 * Extract tree structure from output
 */
export function extractTreeStructure(output: string): string[] {
  const lines = output.split('\n');
  return lines
    .filter(line => line.includes('├──') || line.includes('└──'))
    .map(line => line.trim());
}

/**
 * Check if node is expanded in tree output
 */
export function isNodeExpanded(output: string, nodeName: string): boolean {
  const nodeLine = output.split('\n').find(line => line.includes(nodeName));
  if (!nodeLine) return false;

  // Check if there are child nodes after this line
  const nodeIndex = output.split('\n').indexOf(nodeLine);
  const lines = output.split('\n');

  for (let i = nodeIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('├──') || line.includes('└──')) {
      // Check if indentation is greater than current node
      if (line.length > nodeLine.length) {
        return true;
      }
      break;
    }
  }

  return false;
}
```

### 7.2 Using Test Helpers

```typescript
import { renderInk, waitForText, extractTreeStructure } from '../helpers/ink-test-helpers';

describe('WorkflowTree with helpers', () => {
  it('should show children after expansion', async () => {
    const mockNode = {
      id: 'root',
      name: 'Root',
      children: [
        { id: 'child1', name: 'Child1', children: [] },
      ],
    };

    const { lastFrame } = renderInk(<WorkflowTree node={mockNode} />);

    // Wait for child to appear
    await waitForText(lastFrame, 'Child1');

    // Extract tree structure
    const structure = extractTreeStructure(lastFrame());
    expect(structure).toHaveLength(1);
    expect(structure[0]).toContain('Child1');
  });
});
```

---

## 8. Snapshot Testing for Ink

### 8.1 Basic Snapshot Test

```typescript
import { render } from 'ink-testing-library';

describe('WorkflowTree snapshots', () => {
  it('should match snapshot for simple tree', () => {
    const mockNode = {
      id: 'root',
      name: 'Root',
      status: 'idle',
      children: [],
    };

    const { lastFrame } = render(<WorkflowTree node={mockNode} />);

    expect(lastFrame()).toMatchSnapshot();
  });

  it('should match snapshot for complex tree', () => {
    const mockNode = {
      id: 'root',
      name: 'Root',
      status: 'running',
      children: [
        {
          id: 'child1',
          name: 'Child1',
          status: 'completed',
          children: [
            { id: 'grandchild1', name: 'Grandchild1', status: 'failed', children: [] },
          ],
        },
        { id: 'child2', name: 'Child2', status: 'idle', children: [] },
      ],
    };

    const { lastFrame } = render(<WorkflowTree node={mockNode} />);

    expect(lastFrame()).toMatchSnapshot();
  });
});
```

### 8.2 Inline Snapshots

```typescript
it('should match inline snapshot', () => {
  const { lastFrame } = render(<StatusIcon status="completed" />);

  expect(lastFrame()).toMatchInlineSnapshot('✓');
});
```

---

## 9. Performance Testing

### 9.1 Testing Large Trees

```typescript
describe('WorkflowTree performance', () => {
  it('should render large tree efficiently', () => {
    // Create large tree
    const createLargeTree = (depth: number, breadth: number): WorkflowNode => {
      let counter = 0;

      const createNode = (currentDepth: number): WorkflowNode => {
        const id = `node-${counter++}`;
        const node: WorkflowNode = {
          id,
          name: `Node ${counter}`,
          status: 'idle',
          children: [],
        };

        if (currentDepth < depth) {
          for (let i = 0; i < breadth; i++) {
            node.children.push(createNode(currentDepth + 1));
          }
        }

        return node;
      };

      return createNode(0);
    };

    const largeTree = createLargeTree(5, 5); // 5 levels, 5 children each

    const startTime = performance.now();
    const { lastFrame } = render(<WorkflowTree node={largeTree} />);
    const endTime = performance.now();

    // Render should complete in reasonable time
    expect(endTime - startTime).toBeLessThan(100); // 100ms threshold

    // Verify tree is rendered
    const output = lastFrame();
    expect(output).toContain('Node 1');
  });
});
```

---

## 10. Testing WorkflowTreeDebugger Integration

### 10.1 Testing with WorkflowTreeDebugger

**File:** `src/__tests__/integration/ink-tree-debugger.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Workflow, WorkflowTreeDebugger } from '../../index.js';
import { InkWorkflowTreeDebugger } from '../../debugger/InkWorkflowTreeDebugger';

class TestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('completed');
  }
}

describe('InkWorkflowTreeDebugger Integration', () => {
  it('should mirror WorkflowTreeDebugger output', () => {
    const root = new TestWorkflow('Root');
    const child1 = new TestWorkflow('Child1', root);
    const child2 = new TestWorkflow('Child2', root);

    // Get string output from WorkflowTreeDebugger
    const stringDebugger = new WorkflowTreeDebugger(root);
    const stringOutput = stringDebugger.toTreeString();

    // Get visual output from Ink component
    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} />);
    const inkOutput = lastFrame();

    // Both should contain same node names
    expect(stringOutput).toContain('Root');
    expect(inkOutput).toContain('Root');
    expect(stringOutput).toContain('Child1');
    expect(inkOutput).toContain('Child1');
    expect(stringOutput).toContain('Child2');
    expect(inkOutput).toContain('Child2');
  });

  it('should show status changes', async () => {
    const root = new TestWorkflow('Root');
    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} />);

    // Initial status
    expect(lastFrame()).toContain('○');

    // Run workflow
    await root.run();

    // Updated status
    expect(lastFrame()).toContain('✓');
  });

  it('should handle errors', async () => {
    class FailingWorkflow extends Workflow {
      async run(): Promise<void> {
        throw new Error('Test error');
      }
    }

    const root = new FailingWorkflow('Root');
    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} />);

    await root.run().catch(() => {});

    const output = lastFrame();
    expect(output).toContain('✗');
    expect(output).toContain('Test error');
  });

  it('should display logs', async () => {
    const root = new TestWorkflow('Root');
    root.info('Test log message');

    const { lastFrame } = render(<InkWorkflowTreeDebugger workflow={root} showLogs={true} />);

    expect(lastFrame()).toContain('Test log message');
  });
});
```

---

## 11. Recommended Test Structure

### 11.1 File Organization

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── StatusIcon.test.tsx
│   │   │   ├── WorkflowTree.test.tsx
│   │   │   └── LogPanel.test.tsx
│   │   └── debugger/
│   │       └── InkWorkflowTreeDebugger.test.tsx
│   ├── integration/
│   │   └── ink-debugger.test.tsx
│   └── helpers/
│       ├── tree-verification.ts
│       └── ink-test-helpers.ts
└── debugger/
    ├── InkWorkflowTreeDebugger.tsx
    └── components/
        ├── StatusIcon.tsx
        ├── WorkflowTree.tsx
        └── LogPanel.tsx
```

### 11.2 Test Template

```typescript
// Template for Ink component tests
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  // Setup
  const defaultProps = {
    // Default props
  };

  // Helper to create test data
  const createTestData = () => ({
    // Test data
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { lastFrame } = render(<MyComponent {...defaultProps} />);
      expect(lastFrame()).toBeDefined();
    });

    it('should render important content', () => {
      const { lastFrame } = render(<MyComponent {...defaultProps} />);
      expect(lastFrame()).toContain('Expected Content');
    });
  });

  describe('interactions', () => {
    it('should handle user input', async () => {
      const { stdin, lastFrame } = render(<MyComponent {...defaultProps} />);

      stdin.write('q');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert behavior
    });
  });

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const { lastFrame } = render(<MyComponent {...defaultProps} data={[]} />);
      expect(lastFrame()).toContain('No data');
    });

    it('should handle errors gracefully', () => {
      const { lastFrame } = render(<MyComponent {...defaultProps} error={new Error('Test')} />);
      expect(lastFrame()).toContain('Error');
    });
  });
});
```

---

## 12. Key Takeaways

### 12.1 Installation Requirements

```bash
# Required packages
npm install --save-dev ink-testing-library @types/react@^19.0.0
```

### 12.2 Configuration Changes

**vitest.config.ts:**
- Add `.tsx` to test include pattern
- Configure `jsx: 'automatic'` and `jsxImportSource: 'ink'`

### 12.3 Testing Patterns

1. **Use `render()` from `ink-testing-library`**
2. **Test output via `lastFrame()`**
3. **String-based assertions** (`toContain()`, `toMatch()`)
4. **Async testing** with `waitFor()` or `setTimeout`
5. **Mock stdin** for user input testing
6. **Snapshot testing** for visual regression

### 12.4 Integration with Existing Tests

- Follow existing patterns: `describe`/`it` structure
- Use helper functions from `src/__tests__/helpers/`
- Test with real `Workflow` instances
- Mirror `WorkflowTreeDebugger` functionality

### 12.5 Testing Best Practices

1. **Test user-visible behavior**, not implementation
2. **Test error states** and edge cases
3. **Use test helpers** to reduce duplication
4. **Mock external dependencies** (e.g., Observables)
5. **Test performance** for large trees
6. **Snapshot test** for stable visual output

---

## 13. Next Steps

1. **Install dependencies:**
   ```bash
   npm install --save-dev ink-testing-library @types/react@^19.0.0
   ```

2. **Update vitest.config.ts** to support `.tsx` files and JSX

3. **Create test helper file:**
   - `src/__tests__/helpers/ink-test-helpers.ts`

4. **Write first Ink component test:**
   - Start with `StatusIcon.test.tsx`
   - Test basic rendering and status changes

5. **Write integration test:**
   - Test `InkWorkflowTreeDebugger` with real `Workflow` instances
   - Verify output matches `WorkflowTreeDebugger.toTreeString()`

6. **Add CI configuration:**
   - Ensure tests run in CI/CD pipeline
   - Add test coverage reporting

---

**Related Research:**
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/research/01-ink-library-basics.md` - Ink library basics
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/research/02-ink-advanced-patterns.md` - Advanced Ink patterns
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/research/03-ink-typescript-patterns.md` - TypeScript + Ink patterns

**Example Files Referenced:**
- `/home/dustin/projects/groundswell/src/__tests__/unit/observable.test.ts` - Observable test patterns
- `/home/dustin/projects/groundswell/src/__tests__/unit/tree-debugger.test.ts` - TreeDebugger test patterns
- `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts` - Test helper patterns
- `/home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx` - Ink prototype example

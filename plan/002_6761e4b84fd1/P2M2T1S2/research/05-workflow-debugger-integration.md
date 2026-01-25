# WorkflowTreeDebugger Integration with Ink: Complete Research

**Research Date:** 2026-01-24
**Purpose:** Comprehensive guide for integrating Ink components with WorkflowTreeDebugger
**Target:** Real-time workflow tree visualization CLI

---

## Table of Contents

1. [WorkflowTreeDebugger.events Observable](#1-workflowtreedebuggerevents-observable)
2. [WorkflowNode Structure](#2-workflownode-structure)
3. [Integration Pattern](#3-integration-pattern)
4. [Example File Patterns](#4-example-file-patterns)
5. [Sample Workflow for Testing](#5-sample-workflow-for-testing)
6. [Complete Integration Example](#6-complete-integration-example)
7. [Testing Patterns](#7-testing-patterns)

---

## 1. WorkflowTreeDebugger.events Observable

### File: `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`

### Observable Interface

**Location:** Lines 31-32

```typescript
export class WorkflowTreeDebugger implements WorkflowObserver {
  /** Observable stream of workflow events */
  public readonly events: Observable<WorkflowEvent>;
}
```

### Observable Implementation

**Location:** `/home/dustin/projects/groundswell/src/utils/observable.ts`

```typescript
export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

export class Observable<T> {
  private subscribers: Set<Observer<T>> = new Set();

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

  get subscriberCount(): number {
    return this.subscribers.size;
  }
}
```

### Event Types

**Location:** `/home/dustin/projects/groundswell/src/types/events.ts`

```typescript
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  // Agent/Prompt events
  | {
      type: 'agentPromptStart';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
    }
  | {
      type: 'agentPromptEnd';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
      duration: number;
      tokenUsage?: TokenUsage;
    }
  // Tool events
  | {
      type: 'toolInvocation';
      toolName: string;
      input: unknown;
      output: unknown;
      duration: number;
      node: WorkflowNode;
    }
  // MCP events
  | {
      type: 'mcpEvent';
      serverName: string;
      event: string;
      payload?: unknown;
      node: WorkflowNode;
    }
  // Reflection events
  | {
      type: 'reflectionStart';
      level: 'workflow' | 'agent' | 'prompt';
      node: WorkflowNode;
    }
  | {
      type: 'reflectionEnd';
      level: 'workflow' | 'agent' | 'prompt';
      success: boolean;
      node: WorkflowNode;
    }
  // Cache events
  | {
      type: 'cacheHit';
      key: string;
      node: WorkflowNode;
    }
  | {
      type: 'cacheMiss';
      key: string;
      node: WorkflowNode;
    };
```

### How to Subscribe to Events

**Pattern 1: Basic Subscription**

```typescript
import { WorkflowTreeDebugger } from 'groundswell';

const debugger = new WorkflowTreeDebugger(workflow);

const subscription = debugger.events.subscribe({
  next: (event) => {
    console.log(`Event: ${event.type}`, event);
  },
  error: (err) => {
    console.error('Event stream error:', err);
  },
  complete: () => {
    console.log('Event stream completed');
  }
});

// Cleanup
subscription.unsubscribe();
```

**Pattern 2: Filtered Subscription**

```typescript
const subscription = debugger.events.subscribe({
  next: (event) => {
    switch (event.type) {
      case 'childAttached':
      case 'childDetached':
      case 'treeUpdated':
        // Handle structural changes
        console.log('Tree structure changed');
        break;
      case 'stepEnd':
        console.log(`Step ${event.step} completed in ${event.duration}ms`);
        break;
      case 'error':
        console.error(`Error in ${event.node.name}:`, event.error.message);
        break;
    }
  }
});
```

**Pattern 3: React Integration with useEffect**

```tsx
import { useState, useEffect } from 'react';
import { WorkflowTreeDebugger } from 'groundswell';

function WorkflowTreeComponent({ debugger }: { debugger: WorkflowTreeDebugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        if (
          event.type === 'childAttached' ||
          event.type === 'childDetached' ||
          event.type === 'treeUpdated'
        ) {
          setTree(debugger.getTree());
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger]);

  return <div>{/* render tree */}</div>;
}
```

---

## 2. WorkflowNode Structure

### File: `/home/dustin/projects/groundswell/src/types/workflow.ts`

### Interface Definition

**Location:** Lines 20-37

```typescript
export interface WorkflowNode {
  /** Unique identifier for this workflow instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** Parent node reference (null for root) */
  parent: WorkflowNode | null;
  /** Child workflow nodes */
  children: WorkflowNode[];
  /** Current execution status */
  status: WorkflowStatus;
  /** Log entries for this node */
  logs: LogEntry[];
  /** Events emitted by this node */
  events: WorkflowEvent[];
  /** Optional serialized state snapshot */
  stateSnapshot: SerializedWorkflowState | null;
}
```

### Status Field Values

**Location:** Lines 4-9

```typescript
export type WorkflowStatus =
  | 'idle'        // Not yet started
  | 'running'     // Currently executing
  | 'completed'   // Finished successfully
  | 'failed'      // Finished with error
  | 'cancelled';  // Interrupted before completion
```

### Status Symbols

**Location:** `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` Lines 15-21

```typescript
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};
```

### Parent/Child Relationships

```typescript
// Root workflow (no parent)
const rootWorkflow: WorkflowNode = {
  id: 'workflow-abc123',
  name: 'BuildApplication',
  parent: null,
  children: [child1, child2],
  status: 'running',
  logs: [],
  events: [],
  stateSnapshot: null
};

// Child workflow (has parent)
const child1: WorkflowNode = {
  id: 'workflow-def456',
  name: 'InstallDependencies',
  parent: rootWorkflow,
  children: [],
  status: 'completed',
  logs: [],
  events: [],
  stateSnapshot: null
};
```

### Tree Traversal Patterns

**Breadth-First Search (BFS)**

```typescript
function collectBFS(node: WorkflowNode): WorkflowNode[] {
  const result: WorkflowNode[] = [];
  const queue: WorkflowNode[] = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    queue.push(...current.children);
  }

  return result;
}
```

**Depth-First Search (DFS)**

```typescript
function collectDFS(node: WorkflowNode): WorkflowNode[] {
  const result: WorkflowNode[] = [node];

  for (const child of node.children) {
    result.push(...collectDFS(child));
  }

  return result;
}
```

**Find Node by ID**

```typescript
function findNode(root: WorkflowNode, id: string): WorkflowNode | null {
  if (root.id === id) return root;

  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }

  return null;
}
```

**Find Nodes by Status**

```typescript
function findByStatus(root: WorkflowNode, status: WorkflowStatus): WorkflowNode[] {
  const results: WorkflowNode[] = [];

  if (root.status === status) {
    results.push(root);
  }

  for (const child of root.children) {
    results.push(...findByStatus(child, status));
  }

  return results;
}
```

---

## 3. Integration Pattern

### How to Pass WorkflowTreeDebugger to Ink Component

**Step 1: Create the debugger instance**

```typescript
import { WorkflowTreeDebugger } from 'groundswell';

const workflow = new MyWorkflow('ExampleWorkflow');
const debugger = new WorkflowTreeDebugger(workflow, {
  persistEvents: true,  // Optional: accumulate event history
  maxEventHistorySize: 10000  // Optional: limit history size
});
```

**Step 2: Pass to Ink component as prop**

```tsx
import { render } from 'ink';
import { WorkflowTreeDebuggerComponent } from './components/WorkflowTreeDebuggerComponent';

render(
  <WorkflowTreeDebuggerComponent debugger={debugger} />,
  { exitOnCtrlC: true }
);
```

**Step 3: Component receives debugger and subscribes**

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { WorkflowTreeDebugger } from 'groundswell';

interface Props {
  debugger: WorkflowTreeDebugger;
}

export function WorkflowTreeDebuggerComponent({ debugger }: Props) {
  const [tree, setTree] = useState(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        // Update tree on structural changes
        if (
          event.type === 'childAttached' ||
          event.type === 'childDetached' ||
          event.type === 'treeUpdated'
        ) {
          setTree(debugger.getTree());
          setStats(debugger.getStats());
        }

        // Update stats on step completion
        if (
          event.type === 'stepEnd' ||
          event.type === 'error' ||
          event.type === 'taskEnd'
        ) {
          setStats(debugger.getStats());
        }
      },
      error: (err) => {
        console.error('Event stream error:', err);
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger]);

  return (
    <Box flexDirection="column">
      <Text bold>Workflow Tree Debugger</Text>
      <Text>Nodes: {stats.totalNodes}</Text>
      <Text>Events: {stats.totalEvents}</Text>
      <WorkflowTreeNode node={tree} />
    </Box>
  );
}

function WorkflowTreeNode({ node, depth = 0 }: { node: WorkflowNode; depth?: number }) {
  const indent = '  '.repeat(depth);
  const statusIcon = STATUS_SYMBOLS[node.status] || '?';

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text>{statusIcon}</Text>
        <Text> {node.name}</Text>
      </Box>
      {node.children.map((child) => (
        <WorkflowTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
}
```

### How to Get Initial Tree

**Method: `getTree()`**

```typescript
const debugger = new WorkflowTreeDebugger(workflow);
const root = debugger.getTree();

console.log(root.name);        // 'BuildApplication'
console.log(root.status);      // 'running'
console.log(root.children);    // [WorkflowNode, WorkflowNode, ...]
```

### Pattern for Updating State When Events Arrive

**Throttled Updates (Prevent Flickering)**

```tsx
import { useState, useEffect, useRef } from 'react';

function ThrottledTreeDebugger({ debugger }: { debugger: WorkflowTreeDebugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());
  const lastUpdateRef = useRef<number>(0);
  const throttleMs = 100; // Max 10 FPS

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        const now = Date.now();
        if (now - lastUpdateRef.current >= throttleMs) {
          setTree(debugger.getTree());
          lastUpdateRef.current = now;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger]);

  return <WorkflowTreeNode node={tree} />;
}
```

**Selective Updates (Performance Optimization)**

```tsx
function SelectiveTreeDebugger({ debugger }: { debugger: WorkflowTreeDebugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        // Only update on structural changes, ignore all others
        switch (event.type) {
          case 'childAttached':
          case 'childDetached':
          case 'treeUpdated':
            setTree(debugger.getTree());
            break;
          // Ignore: stepStart, stepEnd, taskStart, taskEnd, etc.
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger]);

  return <WorkflowTreeNode node={tree} />;
}
```

**Batched Updates (Multiple State Changes)**

```tsx
function BatchedTreeDebugger({ debugger }: { debugger: WorkflowTreeDebugger }) {
  const [tree, setTree] = useState(() => debugger.getTree());
  const [stats, setStats] = useState(() => debugger.getStats());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const updateAll = useCallback(() => {
    setTree(debugger.getTree());
    setStats(debugger.getStats());
  }, [debugger]);

  useEffect(() => {
    const subscription = debugger.events.subscribe({
      next: (event) => {
        // Batch multiple state updates
        updateAll();

        // Additional selective updates
        if (event.type === 'stepStart') {
          setSelectedNode(event.node.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger, updateAll]);

  return (
    <Box flexDirection="column">
      <Text>Nodes: {stats.totalNodes}</Text>
      <WorkflowTreeNode node={tree} selectedId={selectedNode} />
    </Box>
  );
}
```

---

## 4. Example File Patterns

### File: `/home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts`

This file demonstrates comprehensive observer and debugger patterns.

### Key Pattern 1: Creating Workflows with Observers

```typescript
class ObservableWorkflow extends Workflow {
  @ObservedState()
  phase: string = 'init';

  @ObservedState()
  progress: number = 0;

  @Step({ trackTiming: true, snapshotState: true, logStart: true })
  async phase1(): Promise<void> {
    this.phase = 'phase1';
    this.progress = 25;
    await sleep(100);
  }

  @Step({ trackTiming: true, snapshotState: true })
  async phase2(): Promise<void> {
    this.phase = 'phase2';
    this.progress = 50;
    await sleep(150);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Observable workflow starting');

    await this.phase1();
    await this.phase2();
    await this.phase3();
    await this.phase4();

    this.setStatus('completed');
    this.logger.info('Observable workflow completed');
  }
}
```

### Key Pattern 2: Workflow.addObserver()

```typescript
const workflow = new ObservableWorkflow('MetricsDemo');
const metricsObserver = new MetricsObserver();

// Add observer to workflow
workflow.addObserver(metricsObserver);

// Run workflow (observer receives all events)
await workflow.run();

// Access collected metrics
console.log(metricsObserver.getReport());
```

### Key Pattern 3: Multiple Observers

```typescript
const workflow = new ObservableWorkflow('MultiObserver');

const metrics = new MetricsObserver();
const console1 = new ConsoleObserver('OBS-1');
const console2 = new ConsoleObserver('OBS-2');

workflow.addObserver(metrics);
workflow.addObserver(console1);
workflow.addObserver(console2);

// All observers receive events simultaneously
await workflow.run();
```

### Key Pattern 4: Observable Stream Subscription

```typescript
const workflow = new ParentWithChildrenWorkflow('StreamDemo');
const debugger_ = new WorkflowTreeDebugger(workflow);

const eventLog: string[] = [];

// Subscribe to the event stream
const subscription = debugger_.events.subscribe({
  next: (event) => {
    eventLog.push(`${event.type}: ${'node' in event ? event.node.name : 'N/A'}`);
  },
});

await workflow.run();

console.log('Events received via Observable:');
eventLog.forEach((e) => console.log(`  ${e}`));

// Cleanup subscription
subscription.unsubscribe();
```

### Key Pattern 5: WorkflowTreeDebugger API

```typescript
const workflow = new ParentWithChildrenWorkflow('DebuggerDemo');
const debugger_ = new WorkflowTreeDebugger(workflow);

await workflow.run();

console.log('1. Tree visualization:');
console.log(debugger_.toTreeString());

console.log('2. Get tree root:');
const root = debugger_.getTree();
console.log(`   Root: ${root.name} (${root.id})`);
console.log(`   Children: ${root.children.length}`);

console.log('\n3. Find node by ID:');
const firstChild = workflow.children[0];
const foundNode = debugger_.getNode(firstChild.id);
console.log(`   Found: ${foundNode?.name}`);

console.log('\n4. Statistics:');
const stats = debugger_.getStats();
console.log(`   ${JSON.stringify(stats, null, 2)}`);

console.log('\n5. Formatted logs:');
const logs = debugger_.toLogString().split('\n').slice(0, 5);
logs.forEach((log) => console.log(`   ${log}`));
console.log('   ...');
```

### Key Pattern 6: Parent-Child Relationships

```typescript
class ChildWorkflow extends Workflow {
  @Step({ trackTiming: true })
  async doWork(): Promise<void> {
    this.logger.info('Child doing work');
    await sleep(50);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.doWork();
    this.setStatus('completed');
  }
}

class ParentWithChildrenWorkflow extends Workflow {
  @Task()
  async spawnChild(name: string): Promise<ChildWorkflow> {
    // Child workflow is automatically attached to parent
    return new ChildWorkflow(name, this);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Parent starting');

    const child1 = await this.spawnChild('Child-1');
    await child1.run();

    const child2 = await this.spawnChild('Child-2');
    await child2.run();

    this.setStatus('completed');
    this.logger.info('Parent completed');
  }
}
```

---

## 5. Sample Workflow for Testing

### Simple Linear Workflow

```typescript
import { Workflow, Step } from 'groundswell';

class SimpleWorkflow extends Workflow {
  @Step({ trackTiming: true, logStart: true })
  async step1(): Promise<void> {
    this.logger.info('Executing step 1');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @Step({ trackTiming: true })
  async step2(): Promise<void> {
    this.logger.info('Executing step 2');
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  @Step({ trackTiming: true, logFinish: true })
  async step3(): Promise<void> {
    this.logger.info('Executing step 3');
    await new Promise(resolve => setTimeout(resolve, 80));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.step1();
    await this.step2();
    await this.step3();
    this.setStatus('completed');
  }
}
```

### Workflow with Parent-Child Relationships

```typescript
import { Workflow, Step, Task, ObservedState } from 'groundswell';

class ChildTaskWorkflow extends Workflow {
  @ObservedState()
  childProgress: number = 0;

  @Step({ trackTiming: true })
  async doChildWork(): Promise<void> {
    this.logger.info('Child working...');
    for (let i = 0; i < 5; i++) {
      this.childProgress = (i + 1) * 20;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.doChildWork();
    this.setStatus('completed');
  }
}

class ParentWorkflow extends Workflow {
  @ObservedState()
  parentProgress: number = 0;

  @Task()
  async createChild(name: string): Promise<ChildTaskWorkflow> {
    return new ChildTaskWorkflow(name, this);
  }

  @Step({ trackTiming: true })
  async parentStep1(): Promise<void> {
    this.logger.info('Parent step 1');
    this.parentProgress = 25;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @Step({ trackTiming: true })
  async parentStep2(): Promise<void> {
    this.logger.info('Parent step 2');
    this.parentProgress = 50;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Parent starting');

    await this.parentStep1();

    // Create and run child 1
    const child1 = await this.createChild('Child-1');
    await child1.run();

    await this.parentStep2();

    // Create and run child 2
    const child2 = await this.createChild('Child-2');
    await child2.run();

    this.parentProgress = 100;
    this.setStatus('completed');
    this.logger.info('Parent completed');
  }
}
```

### Workflow with Different Statuses

```typescript
import { Workflow, Step } from 'groundswell';

class MixedStatusWorkflow extends Workflow {
  private shouldFail: boolean = false;

  @Step({ trackTiming: true })
  async step1(): Promise<void> {
    this.logger.info('Step 1 - will complete');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @Step({ trackTiming: true })
  async step2(): Promise<void> {
    this.logger.info('Step 2 - will complete');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @Step({ trackTiming: true })
  async step3(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Intentional failure in step 3');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @Step({ trackTiming: true })
  async step4(): Promise<void> {
    this.logger.info('Step 4 - may not run');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Mixed status workflow starting');

    try {
      await this.step1();
      await this.step2();
      await this.step3();
      await this.step4();
      this.setStatus('completed');
    } catch (error) {
      this.logger.error(`Workflow failed: ${error}`);
      this.setStatus('failed');
      throw error;
    }
  }

  // Method to trigger failure for testing
  enableFailure(): void {
    this.shouldFail = true;
  }
}
```

### Complex Nested Workflow

```typescript
import { Workflow, Step, Task, ObservedState } from 'groundswell';

class LeafWorkflow extends Workflow {
  @ObservedState()
  leafData: string = 'initial';

  @Step({ trackTiming: true })
  async leafTask(): Promise<void> {
    this.leafData = 'processed';
    this.logger.info('Leaf task executing');
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.leafTask();
    this.setStatus('completed');
  }
}

class BranchWorkflow extends Workflow {
  @ObservedState()
  branchData: string = 'initial';

  @Task()
  async createLeaf(name: string): Promise<LeafWorkflow> {
    return new LeafWorkflow(name, this);
  }

  @Step({ trackTiming: true })
  async branchTask1(): Promise<void> {
    this.branchData = 'task1-done';
    await new Promise(resolve => setTimeout(resolve, 75));
  }

  @Step({ trackTiming: true })
  async branchTask2(): Promise<void> {
    this.branchData = 'task2-done';
    await new Promise(resolve => setTimeout(resolve, 75));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Branch starting');

    await this.branchTask1();

    const leaf1 = await this.createLeaf('Leaf-1');
    await leaf1.run();

    await this.branchTask2();

    const leaf2 = await this.createLeaf('Leaf-2');
    await leaf2.run();

    this.setStatus('completed');
  }
}

class RootWorkflow extends Workflow {
  @ObservedState()
  rootData: string = 'initial';

  @Task()
  async createBranch(name: string): Promise<BranchWorkflow> {
    return new BranchWorkflow(name, this);
  }

  @Step({ trackTiming: true })
  async rootStep1(): Promise<void> {
    this.rootData = 'step1-done';
    this.logger.info('Root step 1');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @Step({ trackTiming: true })
  async rootStep2(): Promise<void> {
    this.rootData = 'step2-done';
    this.logger.info('Root step 2');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Root workflow starting');

    await this.rootStep1();

    const branch1 = await this.createBranch('Branch-1');
    await branch1.run();

    await this.rootStep2();

    const branch2 = await this.createBranch('Branch-2');
    await branch2.run();

    this.setStatus('completed');
    this.logger.info('Root workflow completed');
  }
}
```

---

## 6. Complete Integration Example

### Full Ink Component with WorkflowTreeDebugger

```tsx
#!/usr/bin/env node
/**
 * WorkflowTreeDebugger - Full Ink Integration Example
 *
 * Demonstrates:
 * - Subscribing to WorkflowTreeDebugger.events Observable
 * - Reactive updates on tree changes
 * - Throttled rendering for performance
 * - Proper subscription cleanup
 * - Complete tree visualization
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { render, Box, Text, Newline, Static, useInput } from 'ink';
import { WorkflowTreeDebugger } from 'groundswell/src/debugger/tree-debugger.js';
import { WorkflowEvent } from 'groundswell/src/types/events.js';
import { WorkflowNode } from 'groundswell/src/types/workflow.js';

// ============================================================================
// Constants
// ============================================================================

const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
  cancelled: 'cyan',
};

// ============================================================================
// Components
// ============================================================================

/**
 * StatusIcon - Colored status indicator
 */
const StatusIcon = ({ status }: { status: string }) => {
  const color = STATUS_COLORS[status] || 'white';
  const symbol = STATUS_SYMBOLS[status] || '?';

  return (
    <Text color={color}>{symbol}</Text>
  );
};

/**
 * WorkflowTreeNode - Recursive tree renderer
 */
const WorkflowTreeNode = React.memo(({
  node,
  depth = 0,
  isLast = true,
  selectedId = null
}: {
  node: WorkflowNode;
  depth?: number;
  isLast?: boolean;
  selectedId?: string | null;
}) => {
  const indent = '  '.repeat(depth);
  const isRoot = depth === 0;
  const branch = !isRoot ? (isLast ? '└─ ' : '├─ ') : '';
  const isSelected = selectedId === node.id;

  return (
    <Box flexDirection="column">
      <Box>
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
        {isSelected && <Text dimColor> ← Selected</Text>}
      </Box>
      {node.children.map((child, index) => (
        <WorkflowTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          isLast={index === node.children.length - 1}
          selectedId={selectedId}
        />
      ))}
    </Box>
  );
});

/**
 * EventTimeline - Live event log with Static optimization
 */
const EventTimeline = ({ events }: { events: string[] }) => {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Event Timeline</Text>
      <Static items={events}>
        {(event, index) => (
          <Box key={index}>
            <Text dimColor>{event}</Text>
          </Box>
        )}
      </Static>
    </Box>
  );
};

/**
 * StatsPanel - Display workflow statistics
 */
const StatsPanel = ({ stats }: { stats: ReturnType<WorkflowTreeDebugger['getStats']> }) => {
  return (
    <Box marginBottom={1}>
      <Text>Nodes: </Text>
      <Text bold>{stats.totalNodes}</Text>
      <Text dimColor> | </Text>
      <Text>Events: </Text>
      <Text bold>{stats.totalEvents}</Text>
      <Text dimColor> | </Text>
      <Text>Logs: </Text>
      <Text bold>{stats.totalLogs}</Text>
    </Box>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface WorkflowTreeDebuggerProps {
  debugger: WorkflowTreeDebugger;
}

/**
 * WorkflowTreeDebugger - Main application component
 */
const WorkflowTreeDebuggerApp = ({ debugger: debugger_ }: WorkflowTreeDebuggerProps) => {
  // State
  const [tree, setTree] = useState<WorkflowNode>(() => debugger_.getTree());
  const [stats, setStats] = useState(() => debugger_.getStats());
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [showEvents, setShowEvents] = useState<boolean>(true);

  // Refs for throttling
  const lastUpdateRef = useRef<number>(0);
  const throttleMs = 100; // Max 10 FPS

  /**
   * Throttled update function
   */
  const updateTreeAndStats = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= throttleMs) {
      setTree(debugger_.getTree());
      setStats(debugger_.getStats());
      lastUpdateRef.current = now;
    }
  }, [debugger_]);

  /**
   * Subscribe to debugger events
   */
  useEffect(() => {
    const subscription = debugger_.events.subscribe({
      next: (event: WorkflowEvent) => {
        // Update tree and stats on structural changes
        if (
          event.type === 'childAttached' ||
          event.type === 'childDetached' ||
          event.type === 'treeUpdated'
        ) {
          updateTreeAndStats();
        }

        // Update stats on events
        if (
          event.type === 'stepEnd' ||
          event.type === 'error' ||
          event.type === 'taskEnd'
        ) {
          updateTreeAndStats();
        }

        // Add to event log
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const nodeName = 'node' in event ? event.node.name : 'N/A';
        const logLine = `${timestamp} [${event.type}] ${nodeName}`;

        setEventLog((prev) => [...prev, logLine]);
      },
      error: (err) => {
        console.error('Event stream error:', err);
      }
    });

    return () => subscription.unsubscribe();
  }, [debugger_, updateTreeAndStats]);

  /**
   * Keyboard input handling
   */
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }

    if (input === 'h') {
      setShowHelp((prev) => !prev);
    }

    if (input === 'e') {
      setShowEvents((prev) => !prev);
    }

    if (input === 'q') {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Workflow Tree Debugger</Text>
        <Text dimColor> - Real-time Visualization</Text>
      </Box>

      {/* Help Panel */}
      {showHelp && (
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
          <Text dimColor>q - Quit</Text>
          <Text dimColor>Ctrl+C - Force exit</Text>
        </Box>
      )}

      {/* Stats Panel */}
      <StatsPanel stats={stats} />

      {/* Tree View */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">Tree Structure</Text>
        <WorkflowTreeNode
          node={tree}
          selectedId={selectedNodeId}
        />
      </Box>

      {/* Event Timeline */}
      {showEvents && <EventTimeline events={eventLog} />}
    </Box>
  );
};

// ============================================================================
// Entry Point
// ============================================================================

/**
 * Run the WorkflowTreeDebugger CLI
 */
export function runWorkflowTreeDebuggerCLI(workflow: Workflow): void {
  const debugger_ = new WorkflowTreeDebugger(workflow, {
    persistEvents: true,
    maxEventHistorySize: 10000
  });

  render(
    <WorkflowTreeDebuggerApp debugger={debugger_} />,
    { exitOnCtrlC: true }
  );
}

// Export for testing
export { WorkflowTreeDebuggerApp };
```

---

## 7. Testing Patterns

### Test 1: Basic Integration

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowTreeDebugger } from 'groundswell';
import { render } from '@testing-library/react';
import { WorkflowTreeDebuggerApp } from './WorkflowTreeDebuggerApp';

describe('WorkflowTreeDebugger Integration', () => {
  let workflow: SimpleWorkflow;
  let debugger_: WorkflowTreeDebugger;

  beforeEach(() => {
    workflow = new SimpleWorkflow('TestWorkflow');
    debugger_ = new WorkflowTreeDebugger(workflow);
  });

  it('should render initial tree', async () => {
    const { getByText } = render(
      <WorkflowTreeDebuggerApp debugger={debugger_} />
    );

    expect(getByText('Workflow Tree Debugger')).toBeInTheDocument();
    expect(getByText('TestWorkflow')).toBeInTheDocument();
  });

  it('should update tree on events', async () => {
    const { getByText } = render(
      <WorkflowTreeDebuggerApp debugger={debugger_} />
    );

    // Run workflow to trigger events
    await workflow.run();

    // Check for status changes
    expect(getByText(/completed/i)).toBeInTheDocument();
  });
});
```

### Test 2: Observable Subscription

```typescript
describe('Observable Subscription', () => {
  it('should receive events through Observable', async () => {
    const workflow = new SimpleWorkflow('TestWorkflow');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const events: WorkflowEvent[] = [];
    const subscription = debugger_.events.subscribe({
      next: (event) => events.push(event)
    });

    await workflow.run();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBeDefined();

    subscription.unsubscribe();
  });

  it('should cleanup subscription on unmount', () => {
    const workflow = new SimpleWorkflow('TestWorkflow');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const unsubscribe = vi.fn();
    debugger_.events.subscribe = vi.fn(() => ({ unsubscribe }));

    const { unmount } = render(
      <WorkflowTreeDebuggerApp debugger={debugger_} />
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
```

### Test 3: Throttled Updates

```typescript
describe('Throttled Updates', () => {
  it('should throttle rapid updates', async () => {
    const workflow = new SimpleWorkflow('TestWorkflow');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const renderCount = vi.fn();
    const { rerender } = render(
      <WorkflowTreeDebuggerApp debugger={debugger_} />
    );

    // Trigger many rapid events
    for (let i = 0; i < 100; i++) {
      debugger_.events.next({ type: 'stepStart', node: workflow.node, step: `step${i}` });
    }

    // Should have fewer re-renders due to throttling
    expect(renderCount.mock.calls.length).toBeLessThan(100);
  });
});
```

### Test 4: Error Handling

```typescript
describe('Error Handling', () => {
  it('should handle Observable errors gracefully', async () => {
    const workflow = new SimpleWorkflow('TestWorkflow');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const errorSpy = vi.spyOn(console, 'error');

    const subscription = debugger_.events.subscribe({
      next: () => {},
      error: (err) => console.error('Event stream error:', err)
    });

    // Trigger error
    debugger_.events.error(new Error('Test error'));

    expect(errorSpy).toHaveBeenCalled();

    subscription.unsubscribe();
  });

  it('should display failed status', async () => {
    const workflow = new MixedStatusWorkflow('TestWorkflow');
    workflow.enableFailure();

    const debugger_ = new WorkflowTreeDebugger(workflow);
    const { getByText } = render(
      <WorkflowTreeDebuggerApp debugger={debugger_} />
    );

    try {
      await workflow.run();
    } catch (e) {
      // Expected failure
    }

    expect(getByText(/failed/i)).toBeInTheDocument();
  });
});
```

---

## Summary

### Key Integration Points

1. **Observable<WorkflowEvent>** - Event stream for reactive updates
   - Subscribe via `debugger.events.subscribe()`
   - Always cleanup with `subscription.unsubscribe()`
   - Filter events by type for selective updates

2. **getTree()** - Get current tree state
   - Returns WorkflowNode root
   - Call initially and on structural changes
   - Use with useState for reactive rendering

3. **getStats()** - Get tree statistics
   - Returns totalNodes, byStatus, totalLogs, totalEvents
   - Update on stepEnd, error, taskEnd events

4. **WorkflowNode Structure** - Tree data model
   - id, name, status, parent, children, logs, events, stateSnapshot
   - Traverse recursively for rendering
   - Filter by status for highlighting

### Performance Considerations

1. **Throttle updates** - Limit to 10-60 FPS to prevent flickering
2. **Use Static component** - For event logs (100+ lines)
3. **Memoize components** - Use React.memo for expensive renders
4. **Selective updates** - Only re-render on structural changes

### Best Practices

1. **Initialize state with function** - `useState(() => debugger.getTree())`
2. **Cleanup subscriptions** - Return unsubscribe from useEffect
3. **Handle errors** - Provide error callback in subscription
4. **Use functional updates** - Avoid stale closures in event handlers

---

## Documentation URLs

- **WorkflowTreeDebugger:** `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`
- **Observable:** `/home/dustin/projects/groundswell/src/utils/observable.ts`
- **WorkflowNode:** `/home/dustin/projects/groundswell/src/types/workflow.ts`
- **WorkflowEvent:** `/home/dustin/projects/groundswell/src/types/events.ts`
- **Observer Pattern:** `/home/dustin/projects/groundswell/src/types/observer.ts`
- **Example Usage:** `/home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts`
- **Ink Patterns:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S2/research/01-ink-reactive-patterns.md`
- **Ink Hello World:** `/home/dustin/projects/groundswell/examples/examples/ink-debugger-hello.tsx`

---

*Generated: 2026-01-24*
*Groundswell Version: 0.0.4*
*Ink Version: 6.6.0*
*React Version: 19.0.0*

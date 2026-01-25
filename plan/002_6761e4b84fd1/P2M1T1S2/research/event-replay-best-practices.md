# Event Replay Systems and State Reconstruction - Best Practices Research

**Research Date**: 2025-01-24
**Context**: Tree Structure Event Replay for Groundswell Project
**PRD Reference**: PRD 6.4.4 - Time-travel debugging and state reconstruction

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Reducer Pattern for Event Processing](#reducer-pattern-for-event-processing)
3. [Immutability Patterns for Tree Structures](#immutability-patterns-for-tree-structures)
4. [Deep Cloning Strategies](#deep-cloning-strategies)
5. [Best Practices and Common Gotchas](#best-practices-and-common-gotchas)
6. [Implementation Examples](#implementation-examples)
7. [URL References](#url-references)

---

## 1. Core Concepts

### 1.1 Event Sourcing

**Event Sourcing** is a pattern where state changes are stored as a sequence of immutable events rather than just the current state. The current state is derived by replaying these events.

**Key Principles**:
- **Events are immutable**: Once written, events never change
- **Events are the source of truth**: Current state is a derived projection
- **Temporal querying**: Can reconstruct state at any point in time
- **Audit trail**: Complete history of all changes

**Benefits for Tree Structures**:
```typescript
// Traditional approach (state only)
interface TreeState {
  nodes: Map<string, TreeNode>;
}

// Event sourcing approach
interface TreeEvent {
  type: 'NODE_ADDED' | 'NODE_REMOVED' | 'NODE_UPDATED' | 'NODE_MOVED';
  nodeId: string;
  timestamp: number;
  payload: any;
}

// Reconstruct state by replaying events
function reconstructTree(events: TreeEvent[]): TreeState {
  return events.reduce(reducer, initialState);
}
```

### 1.2 CQRS (Command Query Responsibility Segregation)

**CQRS** separates read and write operations, allowing different models for each.

**For Event Replay**:
- **Command side**: Events that modify state (write model)
- **Query side**: Reconstructed state for reading (read model)
- **Replay**: Convert command events → read model state

```typescript
// Command (write model)
type TreeCommand =
  | { type: 'ADD_NODE'; nodeId: string; parentId: string | null }
  | { type: 'REMOVE_NODE'; nodeId: string }
  | { type: 'UPDATE_NODE'; nodeId: string; data: any };

// Query (read model)
interface TreeReadModel {
  getNode(nodeId: string): TreeNode | null;
  getChildren(parentId: string): TreeNode[];
  getAllNodes(): TreeNode[];
}

// Replay builds read model from command events
class TreeProjection implements TreeReadModel {
  private nodes: Map<string, TreeNode> = new Map();

  apply(event: TreeEvent): void {
    // Apply event to build read model
  }
}
```

### 1.3 Event Replay Concepts

**Replay** is the process of re-executing events to reconstruct state.

**Types of Replay**:
1. **Full Replay**: Replay all events from beginning
2. **Snapshot Replay**: Replay from last snapshot + subsequent events
3. **Time-Travel Replay**: Replay to a specific point in time
4. **Incremental Replay**: Replay only new events

```typescript
enum ReplayMode {
  FULL,           // Replay all events
  FROM_SNAPSHOT,  // From snapshot + delta events
  TO_TIMESTAMP,   // Replay until specific time
  INCREMENTAL     // Replay only new events
}

interface ReplayOptions {
  mode: ReplayMode;
  snapshot?: TreeSnapshot;
  targetTimestamp?: number;
  fromVersion?: number;
}
```

---

## 2. Reducer Pattern for Event Processing

### 2.1 Reducer Fundamentals

A **reducer** is a pure function that takes state and an event, then returns new state.

**Signature**:
```typescript
type Reducer<State, Event> = (state: State, event: Event) => State;
```

**Key Characteristics**:
- **Pure**: No side effects, same input = same output
- **Immutable**: Never mutates input state, returns new state
- **Composable**: Can be combined with other reducers
- **Predictable**: Easy to test and reason about

### 2.2 Basic Reducer Implementation

```typescript
// State definition
interface TreeNode {
  id: string;
  parentId: string | null;
  children: string[];
  data: any;
}

interface TreeState {
  nodes: Map<string, TreeNode>;
  rootId: string | null;
}

// Event types
type TreeEvent =
  | { type: 'NODE_CREATED'; nodeId: string; parentId: string | null; data: any; timestamp: number }
  | { type: 'NODE_DELETED'; nodeId: string; timestamp: number }
  | { type: 'NODE_UPDATED'; nodeId: string; data: any; timestamp: number }
  | { type: 'NODE_MOVED'; nodeId: string; newParentId: string; timestamp: number };

// Initial state
const initialTreeState: TreeState = {
  nodes: new Map(),
  rootId: null
};

// Reducer function
function treeReducer(state: TreeState, event: TreeEvent): TreeState {
  switch (event.type) {
    case 'NODE_CREATED':
      return handleNodeCreated(state, event);
    case 'NODE_DELETED':
      return handleNodeDeleted(state, event);
    case 'NODE_UPDATED':
      return handleNodeUpdated(state, event);
    case 'NODE_MOVED':
      return handleNodeMoved(state, event);
    default:
      return state;
  }
}

// Individual handlers (all return new immutable state)
function handleNodeCreated(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_CREATED' }>
): TreeState {
  const newNode: TreeNode = {
    id: event.nodeId,
    parentId: event.parentId,
    children: [],
    data: event.data
  };

  const newNodes = new Map(state.nodes);
  newNodes.set(event.nodeId, newNode);

  // Update parent's children list
  if (event.parentId) {
    const parent = newNodes.get(event.parentId);
    if (parent) {
      newNodes.set(event.parentId, {
        ...parent,
        children: [...parent.children, event.nodeId]
      });
    }
  }

  return {
    ...state,
    nodes: newNodes,
    rootId: event.parentId === null ? event.nodeId : state.rootId
  };
}

function handleNodeDeleted(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_DELETED' }>
): TreeState {
  const newNodes = new Map(state.nodes);
  const node = newNodes.get(event.nodeId);

  if (!node) return state;

  // Remove from parent's children
  if (node.parentId) {
    const parent = newNodes.get(node.parentId);
    if (parent) {
      newNodes.set(node.parentId, {
        ...parent,
        children: parent.children.filter(id => id !== event.nodeId)
      });
    }
  }

  // Remove the node
  newNodes.delete(event.nodeId);

  return {
    ...state,
    nodes: newNodes
  };
}

function handleNodeUpdated(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_UPDATED' }>
): TreeState {
  const newNodes = new Map(state.nodes);
  const existingNode = newNodes.get(event.nodeId);

  if (!existingNode) return state;

  newNodes.set(event.nodeId, {
    ...existingNode,
    data: { ...existingNode.data, ...event.data }
  });

  return {
    ...state,
    nodes: newNodes
  };
}

function handleNodeMoved(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_MOVED' }>
): TreeState {
  const newNodes = new Map(state.nodes);
  const node = newNodes.get(event.nodeId);

  if (!node) return state;

  // Remove from old parent
  if (node.parentId) {
    const oldParent = newNodes.get(node.parentId);
    if (oldParent) {
      newNodes.set(node.parentId, {
        ...oldParent,
        children: oldParent.children.filter(id => id !== event.nodeId)
      });
    }
  }

  // Add to new parent
  const newParent = newNodes.get(event.newParentId);
  if (newParent) {
    newNodes.set(event.newParentId, {
      ...newParent,
      children: [...newParent.children, event.nodeId]
    });
  }

  // Update node's parent reference
  newNodes.set(event.nodeId, {
    ...node,
    parentId: event.newParentId
  });

  return {
    ...state,
    nodes: newNodes
  };
}
```

### 2.3 Event Replay Function

```typescript
/**
 * Replay events to reconstruct state
 */
function replayEvents(
  events: TreeEvent[],
  initialState: TreeState = initialTreeState
): TreeState {
  return events.reduce(treeReducer, initialState);
}

/**
 * Replay to specific timestamp
 */
function replayToTimestamp(
  events: TreeEvent[],
  targetTimestamp: number,
  initialState: TreeState = initialTreeState
): TreeState {
  const eventsUpToTimestamp = events.filter(e => e.timestamp <= targetTimestamp);
  return replayEvents(eventsUpToTimestamp, initialState);
}

/**
 * Replay from snapshot
 */
function replayFromSnapshot(
  events: TreeEvent[],
  snapshot: { state: TreeState; version: number },
  initialState: TreeState = initialTreeState
): TreeState {
  const eventsAfterSnapshot = events.slice(snapshot.version);
  return replayEvents(eventsAfterSnapshot, snapshot.state);
}
```

### 2.4 Composing Reducers

For complex systems, compose multiple reducers:

```typescript
// Combine multiple reducers
function combineReducers<State extends Record<string, any>, Event>(
  reducers: { [K in keyof State]: Reducer<State[K], Event> }
): Reducer<State, Event> {
  return (state: State, event: Event): State => {
    const newState = { ...state };
    let hasChanges = false;

    for (const key in reducers) {
      const reducer = reducers[key];
      const prevSubState = state[key];
      const nextSubState = reducer(prevSubState, event);

      if (nextSubState !== prevSubState) {
        newState[key] = nextSubState;
        hasChanges = true;
      }
    }

    return hasChanges ? newState : state;
  };
}

// Usage
interface AppState {
  tree: TreeState;
  selection: SelectionState;
  ui: UIState;
}

const appReducer = combineReducers<AppState, TreeEvent>({
  tree: treeReducer,
  selection: selectionReducer,
  ui: uiReducer
});
```

---

## 3. Immutability Patterns for Tree Structures

### 3.1 Core Immutability Principles

**Why Immutability Matters**:
- **Predictability**: Easier to reason about state changes
- **Change Detection**: Can use reference equality for optimization
- **Time-travel**: Easy to store and replay state history
- **Concurrency**: No race conditions from shared mutable state

### 3.2 Pattern 1: Spread Operator (Shallow Copy)

```typescript
// Shallow copy with spread
function updateNodeData(
  tree: TreeState,
  nodeId: string,
  newData: Partial<TreeNode['data']>
): TreeState {
  const node = tree.nodes.get(nodeId);
  if (!node) return tree;

  const updatedNode = {
    ...node,
    data: { ...node.data, ...newData }
  };

  const newNodes = new Map(tree.nodes);
  newNodes.set(nodeId, updatedNode);

  return { ...tree, nodes: newNodes };
}
```

**Pros**:
- Simple and readable
- Native JavaScript/TypeScript
- Good for shallow updates

**Cons**:
- Manual for nested structures
- Can be verbose for deep updates

### 3.3 Pattern 2: Recursive Tree Update

```typescript
/**
 * Recursively update a node in a tree structure
 */
function updateTreeNode<T>(
  nodes: T[],
  nodeId: string,
  updater: (node: T) => T,
  childrenKey: keyof T = 'children' as any
): T[] {
  return nodes.map(node => {
    const id = (node as any).id;
    if (id === nodeId) {
      // Found the node, apply updater
      return updater(node);
    }

    // Check children
    const children = node[childrenKey] as T[];
    if (children && children.length > 0) {
      const updatedChildren = updateTreeNode(children, nodeId, updater, childrenKey);
      if (updatedChildren !== children) {
        return {
          ...node,
          [childrenKey]: updatedChildren
        };
      }
    }

    return node;
  });
}

// Usage
interface DirectoryNode {
  id: string;
  name: string;
  children: DirectoryNode[];
}

const tree: DirectoryNode[] = [
  {
    id: 'root',
    name: 'Root',
    children: [
      { id: 'folder1', name: 'Folder 1', children: [] },
      { id: 'folder2', name: 'Folder 2', children: [] }
    ]
  }
];

const updatedTree = updateTreeNode(tree, 'folder1', node => ({
  ...node,
  name: 'Updated Folder 1'
}));
```

### 3.4 Pattern 3: Path-Based Updates

```typescript
type TreePath = string[];

/**
 * Update node at specific path
 */
function updateAtPath<T extends object>(
  tree: T,
  path: TreePath,
  updater: (node: any) => any,
  childrenKey: keyof T = 'children' as any
): T {
  if (path.length === 0) {
    return updater(tree) as T;
  }

  const [currentId, ...rest] = path;
  const children = (tree as any)[childrenKey] as any[];

  if (!children) return tree;

  const updatedChildren = children.map((child: any) => {
    if (child.id === currentId) {
      return updateAtPath(child, rest, updater, childrenKey);
    }
    return child;
  });

  return {
    ...tree,
    [childrenKey]: updatedChildren
  } as T;
}

// Usage
const tree2: DirectoryNode[] = [...];
const updated = updateAtPath(
  tree2,
  ['root', 'folder1'],
  node => ({ ...node, name: 'Updated via Path' })
);
```

### 3.5 Pattern 4: Using Immer (Recommended for Complex Trees)

**Immer** allows you to write mutable-style code that produces immutable updates:

```typescript
import produce from 'immer';

function updateWithImmer<T>(
  tree: T,
  recipe: (draft: T) => void
): T {
  return produce(tree, recipe);
}

// Usage becomes much simpler
const updatedTree = updateWithImmer(tree, draft => {
  const node = findNode(draft, 'folder1');
  if (node) {
    node.name = 'Updated with Immer';
    node.metadata = { ...node.metadata, lastModified: Date.now() };
  }
});

// Helper to find node in draft
function findNode(nodes: any[], id: string): any {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
```

**Pros**:
- Much cleaner syntax for deep updates
- Automatic immutability
- Excellent TypeScript support
- Performance optimizations

**Cons**:
- Additional dependency (though small)
- Slight runtime overhead

### 3.6 Immutable Map Pattern (For Large Trees)

```typescript
/**
 * Use Immutable.js Map for better performance on large trees
 */
import { Map, List } from 'immutable';

interface ImmutableTreeState {
  nodes: Map<string, ImmutableTreeNode>;
}

interface ImmutableTreeNode {
  id: string;
  parentId: string | null;
  children: List<string>;
  data: Map<string, any>;
}

function updateImmutableNode(
  state: ImmutableTreeState,
  nodeId: string,
  updater: (node: ImmutableTreeNode) => ImmutableTreeNode
): ImmutableTreeState {
  const node = state.nodes.get(nodeId);
  if (!node) return state;

  return {
    ...state,
    nodes: state.nodes.set(nodeId, updater(node))
  };
}

// Immutable.js provides structural sharing
// Only the modified path is copied, rest is shared
```

### 3.7 Immutable Update Cheat Sheet

```typescript
// 1. Update simple property
{ ...obj, prop: newValue }

// 2. Update nested property
{ ...obj, nested: { ...obj.nested, prop: newValue } }

// 3. Update array element
[ ...arr.slice(0, index), newValue, ...arr.slice(index + 1) ]

// 4. Update Map entry
const newMap = new Map(map);
newMap.set(key, value);
{ ...state, map: newMap }

// 5. Update Set entry
const newSet = new Set(set);
newSet.add(value);
{ ...state, set: newSet }

// 6. Update tree node recursively (using helper)
updateTreeNode(tree, nodeId, node => ({ ...node, updated: true }))

// 7. Using Immer (recommended for complex updates)
produce(state, draft => { draft.node.prop = value })
```

---

## 4. Deep Cloning Strategies

### 4.1 structuredClone() (Modern, Recommended)

**structuredClone()** is the browser/Node.js built-in for deep cloning.

```typescript
// Basic usage
const cloned = structuredClone(original);

// Cloning complex object with special types
const original = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  arrayBuffer: new ArrayBuffer(8),
  nested: { deep: { value: 42 } }
};

const cloned = structuredClone(original);

// All types are preserved
console.log(cloned.date instanceof Date); // true
console.log(cloned.map instanceof Map);   // true
```

**Supported Types**:
- Primitives (string, number, boolean, null, undefined)
- Object, Array
- Date, RegExp
- Map, Set
- ArrayBuffer, typed arrays
- Error objects

**Not Supported**:
- Functions
- DOM nodes
- Class instances (loses prototype)
- Symbols
- WeakMap, WeakSet

**Performance**: Fast, uses native implementation

### 4.2 JSON.parse(JSON.stringify()) (Limited, Fast)

```typescript
const cloned = JSON.parse(JSON.stringify(original));
```

**Pros**:
- No dependencies
- Very fast
- Simple

**Cons**:
- Loses type information (Date → string, RegExp → {})
- Drops undefined values
- Cannot handle circular references
- Cannot clone functions, Map, Set, etc.

**When to Use**:
- Simple POJO (Plain Old JavaScript Object) data
- No special types
- Performance-critical code

### 4.3 Lodash cloneDeep (Popular Library)

```typescript
import cloneDeep from 'lodash/cloneDeep';

const cloned = cloneDeep(original);
```

**Pros**:
- Handles more edge cases
- Widely used and tested
- Good TypeScript support

**Cons**:
- Additional dependency
- Slower than structuredClone
- Doesn't preserve some built-in types perfectly

### 4.4 Manual Recursive Clone (Full Control)

```typescript
/**
 * Manual deep clone with custom logic
 */
function deepClone<T>(obj: T, seen = new WeakMap()): T {
  // Handle primitives
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj as object)) {
    return seen.get(obj as object);
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const clone = new Map();
    seen.set(obj as object, clone as any);
    obj.forEach((value, key) => {
      clone.set(deepClone(key, seen), deepClone(value, seen));
    });
    return clone as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const clone = new Set();
    seen.set(obj as object, clone as any);
    obj.forEach(value => {
      clone.add(deepClone(value, seen));
    });
    return clone as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const clone: any = [];
    seen.set(obj as object, clone);
    for (let i = 0; i < obj.length; i++) {
      clone[i] = deepClone(obj[i], seen);
    }
    return clone;
  }

  // Handle Object
  const clone = Object.create(Object.getPrototypeOf(obj));
  seen.set(obj as object, clone);

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone((obj as any)[key], seen);
    }
  }

  return clone;
}
```

### 4.5 Comparison Table

| Method | Speed | Type Support | Circular Ref | Dependencies | Use Case |
|--------|-------|--------------|--------------|--------------|----------|
| **structuredClone** | ⭐⭐⭐⭐⭐ | Good | ✅ | None | **Recommended** - Most cases |
| **JSON** | ⭐⭐⭐⭐⭐ | Poor | ❌ | None | Simple POJOs only |
| **Lodash** | ⭐⭐⭐ | Very Good | ✅ | lodash | Legacy projects |
| **Manual** | ⭐⭐ | Complete | ✅ | None | Custom requirements |
| **Immer** | ⭐⭐⭐⭐ | Complete | ✅ | immer | Complex updates |

### 4.6 Deep Cloning for Event Replay

```typescript
/**
 * Clone strategy for event replay
 */
class ReplayStateManager<T> {
  private stateHistory: T[] = [];
  private cloneStrategy: (obj: T) => T;

  constructor(
    initialState: T,
    cloneStrategy: (obj: T) => T = structuredClone
  ) {
    this.stateHistory.push(cloneStrategy(initialState));
    this.cloneStrategy = cloneStrategy;
  }

  /**
   * Save state snapshot (before applying event)
   */
  saveSnapshot(state: T): void {
    this.stateHistory.push(this.cloneStrategy(state));
  }

  /**
   * Get state at specific index
   */
  getStateAt(index: number): T {
    return this.cloneStrategy(this.stateHistory[index]);
  }

  /**
   * Get current state
   */
  getCurrentState(): T {
    return this.cloneStrategy(
      this.stateHistory[this.stateHistory.length - 1]
    );
  }
}

// Usage with different clone strategies
const manager1 = new ReplayManager(initialState, structuredClone);
const manager2 = new ReplayManager(initialState, obj => deepClone(obj));
const manager3 = new ReplayManager(initialState, obj =>
  produce(obj, draft => {}) // Immer creates immutable copy
);
```

### 4.7 Performance Considerations

```typescript
/**
 * Benchmark different clone strategies
 */
function benchmarkCloning() {
  const largeObject = {
    // Large nested object...
  };

  console.time('structuredClone');
  const a = structuredClone(largeObject);
  console.timeEnd('structuredClone');

  console.time('JSON');
  const b = JSON.parse(JSON.stringify(largeObject));
  console.timeEnd('JSON');

  console.time('Lodash');
  const c = cloneDeep(largeObject);
  console.timeEnd('Lodash');
}

// Results (typical):
// structuredClone: ~10ms
// JSON: ~15ms
// Lodash: ~25ms
```

**Recommendation**: Use `structuredClone()` by default. It's:
- Fastest
- Built-in
- Handles most cases
- Preserves types

---

## 5. Best Practices and Common Gotchas

### 5.1 Event Design Best Practices

**DO**:
```typescript
// ✅ Good: Immutable, timestamped, typed events
interface Event {
  type: string;
  timestamp: number;
  version: number;
  aggregateId: string;
  payload: unknown;
}

// ✅ Good: Specific event types
interface NodeCreatedEvent {
  type: 'NODE_CREATED';
  timestamp: number;
  nodeId: string;
  parentId: string | null;
  data: Record<string, unknown>;
}
```

**DON'T**:
```typescript
// ❌ Bad: Mutable payload
interface BadEvent {
  type: string;
  payload: any; // Too generic
  data: Record<string, unknown>; // Mutable reference
}

// ❌ Bad: No timestamp
interface UntimedEvent {
  type: string;
  data: unknown;
}
```

### 5.2 Reducer Best Practices

**DO**:
```typescript
// ✅ Good: Pure functions
function reducer(state: State, event: Event): State {
  // No side effects
  // No mutation of input
  // Returns new state
  return { ...state, updated: true };
}

// ✅ Good: Early returns for no-ops
function reducer(state: State, event: Event): State {
  if (event.type === 'UNKNOWN') {
    return state; // No change
  }
  // ... handle event
}

// ✅ Good: Type-safe event handling
function reducer(state: State, event: Event): State {
  switch (event.type) {
    case 'NODE_CREATED':
      return handleNodeCreated(state, event);
    case 'NODE_DELETED':
      return handleNodeDeleted(state, event);
    default:
      const _exhaustive: never = event;
      return state;
  }
}
```

**DON'T**:
```typescript
// ❌ Bad: Mutating state
function badReducer(state: State, event: Event): State {
  state.nodes.push(newNode); // Mutation!
  return state;
}

// ❌ Bad: Side effects
function badReducer(state: State, event: Event): State {
  console.log('Processing event', event); // Side effect!
  fetch('/api/log', { body: JSON.stringify(event) }); // Side effect!
  return state;
}

// ❌ Bad: Not handling all cases
function badReducer(state: State, event: Event): State {
  if (event.type === 'IMPORTANT') {
    return handleImportant(state, event);
  }
  // Missing default case!
}
```

### 5.3 Immutability Gotchas

**Gotcha 1: Shallow Copy is Not Deep Copy**
```typescript
// ❌ Wrong: Shallow copy
const newState = { ...oldState };
newState.nested.value = 'changed'; // Mutates oldState.nested!

// ✅ Correct: Deep copy
const newState = {
  ...oldState,
  nested: { ...oldState.nested, value: 'changed' }
};

// Or use structuredClone
const newState = structuredClone(oldState);
newState.nested.value = 'changed';
```

**Gotcha 2: Array Mutation**
```typescript
// ❌ Wrong: Array methods that mutate
const newArray = oldArray;
newArray.push(item); // Mutates oldArray!
newArray.splice(0, 1); // Mutates oldArray!

// ✅ Correct: Immutable array operations
const newArray = [...oldArray, item]; // Add
const newArray = oldArray.filter(x => x !== item); // Remove
const newArray = [...oldArray.slice(0, index), newItem, ...oldArray.slice(index + 1)]; // Update
```

**Gotcha 3: Map/Set Mutation**
```typescript
// ❌ Wrong: Map methods mutate
const newMap = oldMap;
newMap.set(key, value); // Mutates oldMap!

// ✅ Correct: Create new Map
const newMap = new Map(oldMap);
newMap.set(key, value);

// Or use spread (requires modern JS)
const newMap = new Map([...oldMap, [key, value]]);
```

**Gotcha 4: Object References**
```typescript
// ❌ Wrong: Sharing references
const newObj = { ...oldObj };
newObj.nested.deep = 'changed'; // Affects oldObj.nested.deep!

// ✅ Correct: Deep clone or update path
const newObj = structuredClone(oldObj);
newObj.nested.deep = 'changed';

// Or use Immer
const newObj = produce(oldObj, draft => {
  draft.nested.deep = 'changed';
});
```

### 5.4 Performance Best Practices

**1. Use Snapshots for Long Histories**
```typescript
interface Snapshot {
  state: TreeState;
  eventVersion: number;
  timestamp: number;
}

class SnapshotManager {
  private snapshots: Snapshot[] = [];
  private snapshotInterval = 100; // Every 100 events

  shouldSnapshot(eventVersion: number): boolean {
    return eventVersion % this.snapshotInterval === 0;
  }

  getLatestSnapshot(eventVersion: number): Snapshot | null {
    const snapshot = this.snapshots
      .filter(s => s.eventVersion <= eventVersion)
      .pop();
    return snapshot || null;
  }
}
```

**2. Lazy Replay**
```typescript
/**
 * Only replay when state is accessed
 */
class LazyReplayManager {
  private events: TreeEvent[] = [];
  private cachedState: TreeState | null = null;
  private cacheVersion = -1;

  getState(): TreeState {
    if (this.cachedState && this.cacheVersion === this.events.length) {
      return this.cachedState;
    }

    this.cachedState = this.replayEvents();
    this.cacheVersion = this.events.length;
    return this.cachedState;
  }
}
```

**3. Memoized Selectors**
```typescript
/**
 * Cache computed values from state
 */
function createSelector<T, U>(
  selector: (state: T) => U
): (state: T) => U {
  let lastState: T | null = null;
  let lastResult: U | null = null;

  return (state: T): U => {
    if (state === lastState && lastResult !== null) {
      return lastResult;
    }
    lastState = state;
    lastResult = selector(state);
    return lastResult;
  };
}

// Usage
const getRootNode = createSelector((state: TreeState) => {
  return state.nodes.get(state.rootId || '');
});
```

**4. Structural Sharing**
```typescript
/**
 * Share unchanged parts of state
 */
interface SharedTreeNode {
  value: any;
  children?: SharedTreeNode[];
}

function updateTree(
  node: SharedTreeNode,
  path: number[],
  updater: (value: any) => any
): SharedTreeNode {
  if (path.length === 0) {
    return { ...node, value: updater(node.value) };
  }

  const [index, ...rest] = path;
  const children = node.children || [];

  return {
    ...node,
    children: [
      ...children.slice(0, index),
      updateTree(children[index], rest, updater),
      ...children.slice(index + 1)
    ]
  };
}
```

### 5.5 Error Handling Best Practices

**1. Event Validation**
```typescript
/**
 * Validate events before processing
 */
function validateEvent(event: TreeEvent): ValidationResult {
  if (!event.type) {
    return { valid: false, error: 'Missing event type' };
  }
  if (!event.timestamp) {
    return { valid: false, error: 'Missing timestamp' };
  }
  // Type-specific validation
  switch (event.type) {
    case 'NODE_CREATED':
      if (!event.nodeId) {
        return { valid: false, error: 'Missing nodeId' };
      }
      break;
  }
  return { valid: true };
}
```

**2. Error Recovery**
```typescript
/**
 * Handle errors during replay without losing state
 */
interface ReplayResult {
  success: boolean;
  state: TreeState;
  errors: Array<{ event: TreeEvent; error: Error }>;
}

function safeReplay(
  events: TreeEvent[],
  initialState: TreeState
): ReplayResult {
  const errors: Array<{ event: TreeEvent; error: Error }> = [];
  let state = initialState;

  for (const event of events) {
    try {
      state = treeReducer(state, event);
    } catch (error) {
      errors.push({
        event,
        error: error as Error
      });
      // Continue replaying despite errors
    }
  }

  return {
    success: errors.length === 0,
    state,
    errors
  };
}
```

**3. Event Schema Validation**
```typescript
/**
 * Use a schema library for validation
 */
import { z } from 'zod';

const NodeCreatedEventSchema = z.object({
  type: z.literal('NODE_CREATED'),
  timestamp: z.number(),
  nodeId: z.string(),
  parentId: z.string().nullable(),
  data: z.record(z.unknown())
});

function parseEvent(raw: unknown): TreeEvent {
  const result = NodeCreatedEventSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid event: ${result.error.message}`);
  }
  return result.data;
}
```

### 5.6 Testing Best Practices

**1. Test Reducers in Isolation**
```typescript
describe('treeReducer', () => {
  it('should create node', () => {
    const initialState: TreeState = {
      nodes: new Map(),
      rootId: null
    };

    const event: TreeEvent = {
      type: 'NODE_CREATED',
      nodeId: 'node1',
      parentId: null,
      data: { name: 'Root' },
      timestamp: Date.now()
    };

    const newState = treeReducer(initialState, event);

    expect(newState.nodes.has('node1')).toBe(true);
    expect(newState.rootId).toBe('node1');
  });
});
```

**2. Test Replay Scenarios**
```typescript
describe('Event Replay', () => {
  it('should replay events in order', () => {
    const events: TreeEvent[] = [
      { type: 'NODE_CREATED', nodeId: '1', parentId: null, data: {}, timestamp: 1 },
      { type: 'NODE_CREATED', nodeId: '2', parentId: '1', data: {}, timestamp: 2 },
      { type: 'NODE_DELETED', nodeId: '2', timestamp: 3 }
    ];

    const state = replayEvents(events);

    expect(state.nodes.has('1')).toBe(true);
    expect(state.nodes.has('2')).toBe(false);
  });
});
```

**3. Test Immutability**
```typescript
describe('Immutability', () => {
  it('should not mutate original state', () => {
    const original: TreeState = {
      nodes: new Map([['1', { id: '1', parentId: null, children: [], data: {} }]]),
      rootId: '1'
    };

    const event: TreeEvent = {
      type: 'NODE_UPDATED',
      nodeId: '1',
      data: { updated: true },
      timestamp: Date.now()
    };

    const newState = treeReducer(original, event);

    expect(newState).not.toBe(original);
    expect(newState.nodes).not.toBe(original.nodes);
    expect(original.nodes.get('1')?.data.updated).toBeUndefined();
  });
});
```

---

## 6. Implementation Examples

### 6.1 Complete Event Replay System

```typescript
/**
 * Complete event replay system for tree structures
 */

// Type definitions
interface TreeNode {
  id: string;
  parentId: string | null;
  children: string[];
  data: Record<string, unknown>;
}

interface TreeState {
  nodes: Map<string, TreeNode>;
  rootId: string | null;
  version: number;
}

type TreeEvent =
  | { type: 'NODE_CREATED'; nodeId: string; parentId: string | null; data: Record<string, unknown>; timestamp: number; version: number }
  | { type: 'NODE_DELETED'; nodeId: string; timestamp: number; version: number }
  | { type: 'NODE_UPDATED'; nodeId: string; data: Partial<Record<string, unknown>>; timestamp: number; version: number }
  | { type: 'NODE_MOVED'; nodeId: string; newParentId: string; timestamp: number; version: number };

interface Snapshot {
  state: TreeState;
  version: number;
  timestamp: number;
}

// Event store
class EventStore {
  private events: TreeEvent[] = [];
  private snapshots: Snapshot[] = [];
  private snapshotInterval = 100;

  append(event: TreeEvent): void {
    this.events.push(event);

    // Create snapshot if needed
    if (event.version % this.snapshotInterval === 0) {
      this.createSnapshot();
    }
  }

  getEvents(fromVersion = 0): TreeEvent[] {
    return this.events.filter(e => e.version >= fromVersion);
  }

  getLatestSnapshot(beforeVersion: number): Snapshot | null {
    return this.snapshots
      .filter(s => s.version <= beforeVersion)
      .pop() || null;
  }

  private createSnapshot(): void {
    const state = this.replay(this.events.length);
    this.snapshots.push({
      state,
      version: this.events.length,
      timestamp: Date.now()
    });
  }

  private replay(count: number): TreeState {
    return replayEvents(this.events.slice(0, count));
  }
}

// Replay engine
class ReplayEngine {
  constructor(private eventStore: EventStore) {}

  /**
   * Replay all events
   */
  replayAll(): TreeState {
    const events = this.eventStore.getEvents();
    return replayEvents(events);
  }

  /**
   * Replay from latest snapshot
   */
  replayFromSnapshot(): TreeState {
    const snapshot = this.eventStore.getLatestSnapshot(Infinity);
    if (!snapshot) {
      return this.replayAll();
    }

    const events = this.eventStore.getEvents(snapshot.version);
    return replayEvents(events, snapshot.state);
  }

  /**
   * Replay to specific version
   */
  replayToVersion(version: number): TreeState {
    const snapshot = this.eventStore.getLatestSnapshot(version);
    const fromVersion = snapshot?.version || 0;
    const events = this.eventStore.getEvents(fromVersion)
      .filter(e => e.version <= version);

    return replayEvents(events, snapshot?.state);
  }

  /**
   * Replay to specific timestamp
   */
  replayToTimestamp(timestamp: number): TreeState {
    const events = this.eventStore.getEvents()
      .filter(e => e.timestamp <= timestamp);
    return replayEvents(events);
  }
}

// Reducer
function treeReducer(state: TreeState, event: TreeEvent): TreeState {
  switch (event.type) {
    case 'NODE_CREATED':
      return handleNodeCreated(state, event);
    case 'NODE_DELETED':
      return handleNodeDeleted(state, event);
    case 'NODE_UPDATED':
      return handleNodeUpdated(state, event);
    case 'NODE_MOVED':
      return handleNodeMoved(state, event);
    default:
      return state;
  }
}

// Helper functions
function handleNodeCreated(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_CREATED' }>
): TreeState {
  const newNode: TreeNode = {
    id: event.nodeId,
    parentId: event.parentId,
    children: [],
    data: event.data
  };

  const newNodes = new Map(state.nodes);
  newNodes.set(event.nodeId, newNode);

  if (event.parentId) {
    const parent = newNodes.get(event.parentId);
    if (parent) {
      newNodes.set(event.parentId, {
        ...parent,
        children: [...parent.children, event.nodeId]
      });
    }
  }

  return {
    nodes: newNodes,
    rootId: event.parentId === null ? event.nodeId : state.rootId,
    version: event.version
  };
}

function handleNodeDeleted(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_DELETED' }>
): TreeState {
  const newNodes = new Map(state.nodes);
  const node = newNodes.get(event.nodeId);

  if (!node) return state;

  if (node.parentId) {
    const parent = newNodes.get(node.parentId);
    if (parent) {
      newNodes.set(node.parentId, {
        ...parent,
        children: parent.children.filter(id => id !== event.nodeId)
      });
    }
  }

  newNodes.delete(event.nodeId);

  return {
    nodes: newNodes,
    rootId: state.rootId,
    version: event.version
  };
}

function handleNodeUpdated(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_UPDATED' }>
): TreeState {
  const newNodes = new Map(state.nodes);
  const node = newNodes.get(event.nodeId);

  if (!node) return state;

  newNodes.set(event.nodeId, {
    ...node,
    data: { ...node.data, ...event.data }
  });

  return {
    nodes: newNodes,
    rootId: state.rootId,
    version: event.version
  };
}

function handleNodeMoved(
  state: TreeState,
  event: Extract<TreeEvent, { type: 'NODE_MOVED' }>
): TreeState {
  const newNodes = new Map(state.nodes);
  const node = newNodes.get(event.nodeId);

  if (!node) return state;

  if (node.parentId) {
    const oldParent = newNodes.get(node.parentId);
    if (oldParent) {
      newNodes.set(node.parentId, {
        ...oldParent,
        children: oldParent.children.filter(id => id !== event.nodeId)
      });
    }
  }

  const newParent = newNodes.get(event.newParentId);
  if (newParent) {
    newNodes.set(event.newParentId, {
      ...newParent,
      children: [...newParent.children, event.nodeId]
    });
  }

  newNodes.set(event.nodeId, {
    ...node,
    parentId: event.newParentId
  });

  return {
    nodes: newNodes,
    rootId: state.rootId,
    version: event.version
  };
}

function replayEvents(
  events: TreeEvent[],
  initialState: TreeState = {
    nodes: new Map(),
    rootId: null,
    version: 0
  }
): TreeState {
  return events.reduce(treeReducer, initialState);
}

// Usage example
const eventStore = new EventStore();
const engine = new ReplayEngine(eventStore);

// Add events
eventStore.append({
  type: 'NODE_CREATED',
  nodeId: 'root',
  parentId: null,
  data: { name: 'Root' },
  timestamp: Date.now(),
  version: 1
});

eventStore.append({
  type: 'NODE_CREATED',
  nodeId: 'child1',
  parentId: 'root',
  data: { name: 'Child 1' },
  timestamp: Date.now(),
  version: 2
});

// Replay
const currentState = engine.replayFromSnapshot();
console.log(currentState);
```

### 6.2 Time-Travel Debugging Implementation

```typescript
/**
 * Time-travel debugging implementation
 */
interface TimeTravelState<T> {
  past: T[];
  present: T;
  future: T[];
}

class TimeTravelManager<T> {
  private state: TimeTravelState<T>;
  private eventLog: TreeEvent[] = [];

  constructor(initialState: T) {
    this.state = {
      past: [],
      present: initialState,
      future: []
    };
  }

  /**
   * Apply new event and update state
   */
  dispatch(event: TreeEvent, reducer: (state: T, event: TreeEvent) => T): void {
    this.eventLog.push(event);

    // Save current state to past
    this.state.past.push(this.state.present);

    // Apply event
    this.state.present = reducer(this.state.present, event);

    // Clear future (new branch)
    this.state.future = [];
  }

  /**
   * Undo to previous state
   */
  undo(): boolean {
    if (this.state.past.length === 0) return false;

    // Move present to future
    this.state.future.unshift(this.state.present);

    // Move last past to present
    this.state.present = this.state.past.pop()!;

    return true;
  }

  /**
   * Redo to next state
   */
  redo(): boolean {
    if (this.state.future.length === 0) return false;

    // Move present to past
    this.state.past.push(this.state.present);

    // Move first future to present
    this.state.present = this.state.future.shift()!;

    return true;
  }

  /**
   * Jump to specific point in time
   */
  jumpTo(index: number): boolean {
    if (index < 0 || index >= this.state.past.length + this.state.future.length + 1) {
      return false;
    }

    const allStates = [...this.state.past, this.state.present, ...this.state.future];
    const targetState = allStates[index];

    this.state.past = allStates.slice(0, index);
    this.state.present = targetState;
    this.state.future = allStates.slice(index + 1);

    return true;
  }

  /**
   * Get current state
   */
  getCurrentState(): T {
    return this.state.present;
  }

  /**
   * Get state history
   */
  getHistory(): T[] {
    return [...this.state.past, this.state.present, ...this.state.future];
  }

  /**
   * Get event log
   */
  getEventLog(): TreeEvent[] {
    return [...this.eventLog];
  }

  /**
   * Can undo?
   */
  canUndo(): boolean {
    return this.state.past.length > 0;
  }

  /**
   * Can redo?
   */
  canRedo(): boolean {
    return this.state.future.length > 0;
  }
}

// Usage
const manager = new TimeTravelManager<TreeState>(initialState);

manager.dispatch(event1, treeReducer);
manager.dispatch(event2, treeReducer);

console.log(manager.getCurrentState());

manager.undo();
console.log(manager.getCurrentState());

manager.redo();
console.log(manager.getCurrentState());
```

### 6.3 Integration with Tree Operations

```typescript
/**
 * Tree operations that emit events for replay
 */
class EventSourcedTree {
  private state: TreeState;
  private eventStore: EventStore;
  private version = 0;

  constructor() {
    this.state = {
      nodes: new Map(),
      rootId: null,
      version: 0
    };
    this.eventStore = new EventStore();
  }

  /**
   * Create node
   */
  createNode(
    id: string,
    parentId: string | null,
    data: Record<string, unknown>
  ): void {
    const event: TreeEvent = {
      type: 'NODE_CREATED',
      nodeId: id,
      parentId,
      data,
      timestamp: Date.now(),
      version: ++this.version
    };

    this.eventStore.append(event);
    this.state = treeReducer(this.state, event);
  }

  /**
   * Delete node
   */
  deleteNode(id: string): void {
    const event: TreeEvent = {
      type: 'NODE_DELETED',
      nodeId: id,
      timestamp: Date.now(),
      version: ++this.version
    };

    this.eventStore.append(event);
    this.state = treeReducer(this.state, event);
  }

  /**
   * Update node
   */
  updateNode(id: string, data: Partial<Record<string, unknown>>): void {
    const event: TreeEvent = {
      type: 'NODE_UPDATED',
      nodeId: id,
      data,
      timestamp: Date.now(),
      version: ++this.version
    };

    this.eventStore.append(event);
    this.state = treeReducer(this.state, event);
  }

  /**
   * Move node
   */
  moveNode(id: string, newParentId: string): void {
    const event: TreeEvent = {
      type: 'NODE_MOVED',
      nodeId: id,
      newParentId,
      timestamp: Date.now(),
      version: ++this.version
    };

    this.eventStore.append(event);
    this.state = treeReducer(this.state, event);
  }

  /**
   * Get current state
   */
  getState(): TreeState {
    return this.state;
  }

  /**
   * Replay from events
   */
  replay(): void {
    const engine = new ReplayEngine(this.eventStore);
    this.state = engine.replayFromSnapshot();
  }
}
```

---

## 7. URL References

### 7.1 Official Documentation

- **MDN: structuredClone()**
  - https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
  - Official documentation for the native deep cloning API

- **MDN: Spread Syntax**
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
  - Documentation on object/array spread for immutability

- **TypeScript Handbook**
  - https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
  - Best practices for TypeScript type definitions

### 7.2 Event Sourcing & CQRS

- **Martin Fowler: Event Sourcing**
  - https://martinfowler.com/eaaDev/EventSourcing.html
  - Classic article introducing event sourcing concepts

- **CQRS Pattern**
  - https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs
  - Microsoft's CQRS pattern documentation

- **Event Sourcing in TypeScript**
  - https://auth0.com/blog/introduction-to-event-sourcing/
  - Practical guide to implementing event sourcing

### 7.3 Reducer Patterns

- **Redux Documentation**
  - https://redux.js.org/tutorials/fundamentals/part-3-state-actions-reducers
  - Comprehensive reducer pattern documentation

- **Reducer Pattern Best Practices**
  - https://blog.logrocket.com/redux-persist-the-good-parts/
  - State management and reducer patterns

### 7.4 Immutability

- **Immer Documentation**
  - https://immerjs.github.io/immer/
  - Official Immer library for immutable updates

- **Immutable.js Documentation**
  - https://immutable-js.com/
  - Persistent immutable data structures

- **Immutability in React/TypeScript**
  - https://react.dev/learn/updating-objects-in-state
  - Modern React immutability patterns

### 7.5 Deep Cloning

- **structuredClone Browser Support**
  - https://caniuse.com/?search=structuredClone
  - Browser compatibility table

- **Lodash cloneDeep Documentation**
  - https://lodash.com/docs/4.17.15#cloneDeep
  - Lodash deep cloning documentation

### 7.6 Testing & Best Practices

- **Testing Reducers**
  - https://redux.js.org/usage/writing-tests#reducers
  - Best practices for testing reducer functions

- **Event Sourcing Testing Strategies**
  - https://www.eventstore.com/blog/testing-event-sourced-systems
  - Testing approaches for event-sourced systems

### 7.7 Performance Optimization

- **Snapshot Strategies**
  - https://www.eventstore.com/blog/snapshots-in-event-sourcing
  - When and how to use snapshots

- **Event Replay Optimization**
  - https://www.eventstore.com/blog/optimizing-event-replay
  - Performance techniques for event replay

---

## Summary & Recommendations

### For Groundswell Tree Structure Event Replay:

1. **Use structuredClone()** for deep cloning state snapshots
2. **Implement pure reducers** that return new immutable state
3. **Use Immer** for complex tree updates to reduce verbosity
4. **Implement snapshots** every N events to optimize replay performance
5. **Type events strictly** using TypeScript discriminated unions
6. **Validate events** before processing to ensure replay integrity
7. **Support time-travel** with undo/redo capabilities for debugging

### Architecture Recommendation:

```typescript
// Core components
EventStore → stores events
ReplayEngine → replays events to build state
Reducer → pure function for state transitions
SnapshotManager → periodic state snapshots
TimeTravelManager → undo/redo functionality
```

### Key Takeaway:
Event replay systems combine **immutability**, **pure functions**, and **event logs** to enable powerful debugging and state reconstruction capabilities. The reducer pattern provides a clean, testable way to process events sequentially, while modern JavaScript APIs like `structuredClone()` make deep cloning efficient and straightforward.

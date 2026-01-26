# Event Emission Patterns Research
## TypeScript/JavaScript Observer Pattern Best Practices

**Research Date:** 2026-01-26
**Context:** Groundswell Workflow Tree Update Audit
**Goal:** Identify industry best practices for consistent event emission after state changes

---

## Executive Summary

This document compiles industry best practices for event emission patterns in TypeScript/JavaScript, with specific focus on observer pattern implementations. The research covers timing conventions (before vs after state change), JSDoc documentation patterns, and consistency patterns for tree structure change notifications.

**Key Finding:** Industry consensus strongly favors **emitting events AFTER state changes complete** to ensure observers receive valid, updated state.

---

## 1. Event Emission Timing Best Practices

### 1.1 Golden Rule: Emit After State Change

**Industry Standard:** Always update state first, then emit events.

```typescript
// ✅ CORRECT: State change → Then emit
class Observable {
  private _state: any;

  setState(newState: any) {
    // Step 1: Update state
    this._state = newState;

    // Step 2: Emit event
    this.emit('stateChanged', newState);
  }
}

// ❌ INCORRECT: Emit before state update
class Observable {
  private _state: any;

  setState(newState: any) {
    // BAD: Observers receive old state
    this.emit('stateChanged', this._state);
    this._state = newState;
  }
}
```

**Rationale:**
- Observers can read the new state immediately
- Prevents race conditions in async scenarios
- Aligns with MutationObserver, EventEmitter, and Redux patterns
- Ensures consistency across all observers

### 1.2 Node.js EventEmitter Pattern

Node.js EventEmitter emits synchronously after state changes:

```typescript
import { EventEmitter } from 'events';

class MyEmitter extends EventEmitter {
  private _data: any = null;

  setData(data: any) {
    // 1. Update state
    this._data = data;

    // 2. Emit event (synchronously)
    this.emit('dataUpdated', this._data);
  }
}
```

**Documentation Source:** [Node.js Events Documentation](https://nodejs.org/api/events.html)

### 1.3 Redux Pattern (State Management)

Redux dispatches actions AFTER state updates:

```typescript
// Reducer updates state first
const newState = reducer(currentState, action);

// Then notify subscribers
store.subscribers.forEach(subscriber => subscriber(newState));
```

**Key Insight:** Subscribers receive the new state, not the transition event.

### 1.4 DOM MutationObserver Pattern

MutationObserver fires AFTER DOM mutations complete:

```javascript
const observer = new MutationObserver((mutations) => {
  // mutations reflect completed changes
  // DOM is already in new state
});

observer.observe(target, config);
```

---

## 2. Tree Structure Change Notification Patterns

### 2.1 Best Practice: Emit After Tree Modification

When modifying tree structures, emit events after all tree updates complete:

```typescript
class TreeNode {
  private _children: TreeNode[] = [];

  addChild(child: TreeNode) {
    // 1. Validate
    if (this._children.includes(child)) {
      throw new Error('Child already exists');
    }

    // 2. Update tree structure
    child.parent = this;
    this._children.push(child);

    // 3. Emit event (after tree is consistent)
    this.emit('childAdded', {
      parent: this,
      child: child,
      timestamp: Date.now()
    });
  }

  removeChild(child: TreeNode) {
    // 1. Validate
    const index = this._children.indexOf(child);
    if (index === -1) {
      throw new Error('Child not found');
    }

    // 2. Update tree structure
    this._children.splice(index, 1);
    child.parent = null;

    // 3. Emit event (after tree is consistent)
    this.emit('childRemoved', {
      parent: this,
      childId: child.id,
      timestamp: Date.now()
    });
  }
}
```

### 2.2 Composite Pattern Best Practices

From the Gang of Four Composite Pattern:

```typescript
abstract class Component {
  protected parent: Component | null = null;

  attach(parent: Component) {
    // Update state first
    this.parent = parent;

    // Then notify
    this.onAttached(parent);
  }

  detach() {
    // Update state first
    const oldParent = this.parent;
    this.parent = null;

    // Then notify
    this.onDetached(oldParent);
  }

  protected onAttached(parent: Component): void {}
  protected onDetached(oldParent: Component | null): void {}
}
```

**Key Principle:** Tree structure is always in a consistent state when events fire.

### 2.3 Git/Version Control Pattern

Git notifies watchers AFTER tree updates:

```typescript
class GitTree {
  addNode(path: string, content: string) {
    // 1. Update index
    this.index.set(path, content);

    // 2. Write tree object
    const tree = this.writeTree();

    // 3. Notify hooks (post-update)
    this.runHooks('post-commit', tree);
  }
}
```

---

## 3. JSDoc Documentation Patterns for Events

### 3.1 Event Documentation Tags

Use `@event` or `@fires` tags to document events:

```typescript
/**
 * Observable state manager
 *
 * @fires StateManager#stateChanged - Emitted when state changes
 * @fires StateManager#childAdded - Emitted when a child is added
 * @fires StateManager#childRemoved - Emitted when a child is removed
 */
class StateManager extends EventEmitter {
  /**
   * Update the state
   *
   * @fires StateManager#stateChanged
   * @param {any} newState - The new state value
   * @example
   * ```ts
   * const manager = new StateManager();
   * manager.on('stateChanged', (newState) => {
   *   console.log('State updated:', newState);
   * });
   * manager.setState({ foo: 'bar' });
   * ```
   */
  setState(newState: any) {
    this._state = newState;
    this.emit('stateChanged', newState);
  }
}
```

### 3.2 Event Type Definition Pattern

Document event payloads with TypeScript interfaces:

```typescript
/**
 * Event payload for state changes
 * @typedef {Object} StateChangedEvent
 * @property {string} type - Event type identifier
 * @property {any} currentState - The new state value
 * @property {any} previousState - The previous state value
 * @property {number} timestamp - Unix timestamp when change occurred
 */

/**
 * @param {StateChangedEvent} event - The state change event
 * @returns {void}
 */
function handleStateChanged(event: StateChangedEvent): void {
  // Handle event
}
```

### 3.3 TypeScript Event Interfaces

Use discriminated unions for type-safe events:

```typescript
/**
 * Workflow event types
 *
 * @remarks
 * All events are emitted AFTER the corresponding state change completes.
 * Observers can safely read the updated state when handling events.
 */
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: TreeNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateChanged'; node: TreeNode; newState: any };

/**
 * Workflow observer interface
 *
 * @example
 * ```ts
 * const observer: WorkflowObserver = {
 *   onEvent: (event: WorkflowEvent) => {
 *     switch (event.type) {
 *       case 'childAttached':
 *         console.log('Child attached:', event.child.id);
 *         break;
 *     }
 *   }
 * };
 * ```
 */
interface WorkflowObserver {
  /** Called when any workflow event occurs (after state update) */
  onEvent(event: WorkflowEvent): void;
}
```

### 3.4 JSDoc Event Examples from TypeScript Community

```typescript
/**
 * Manages a collection of items
 *
 * @example
 * ```ts
 * const collection = new Collection();
 * collection.on('add', (item) => {
 *   console.log('Item added:', item.id);
 * });
 * ```
 */
class Collection extends EventEmitter {
  /**
   * Add an item to the collection
   *
   * @fires Collection#add - Emitted after item is added
   * @fires Collection#change - Emitted after any modification
   * @param {T} item - The item to add
   * @throws {Error} If item already exists
   */
  add<T>(item: T): void {
    if (this.has(item)) {
      throw new Error('Item already exists');
    }

    this.items.push(item);

    // Emit after state change
    this.emit('add', item);
    this.emit('change', { type: 'add', item });
  }
}
```

---

## 4. Consistency Patterns

### 4.1 Single Source of Truth Pattern

Ensure state is the single source of truth:

```typescript
class TreeNode {
  private _children: TreeNode[] = [];
  private _parent: TreeNode | null = null;

  get children(): TreeNode[] {
    // Return readonly view
    return Object.freeze([...this._children]);
  }

  addChild(child: TreeNode) {
    // Update both sides of relationship
    this._children.push(child);
    child._parent = this;

    // Emit after consistent state achieved
    this.emit('childAdded', { parent: this, child });
  }
}
```

### 4.2 Transaction Pattern for Batch Updates

For complex updates, use transactions:

```typescript
class TreeNode {
  beginUpdate() {
    this._updating = true;
    this._pendingEvents = [];
  }

  endUpdate() {
    this._updating = false;

    // Emit all pending events after all updates complete
    for (const event of this._pendingEvents) {
      this.emit(event.type, event.payload);
    }

    this._pendingEvents = [];
  }

  addChild(child: TreeNode) {
    this._children.push(child);

    if (this._updating) {
      // Queue event for later
      this._pendingEvents.push({
        type: 'childAdded',
        payload: { parent: this, child }
      });
    } else {
      // Emit immediately
      this.emit('childAdded', { parent: this, child });
    }
  }
}
```

### 4.3 Immutability Pattern

For maximum consistency, use immutable state:

```typescript
class ImmutableNode {
  private _state: Readonly<NodeState>;

  addChild(child: ImmutableNode): ImmutableNode {
    // Create new state (immutable)
    const newState: NodeState = {
      ...this._state,
      children: [...this._state.children, child]
    };

    // Update atomically
    this._state = Object.freeze(newState);

    // Emit after immutable update
    this.emit('updated', this._state);

    return this;
  }
}
```

---

## 5. Error Handling Patterns

### 5.1 Try-Catch Around Event Emission

Always wrap event emission in error handlers:

```typescript
class EventEmitter {
  emit(event: string, ...args: any[]) {
    for (const listener of this.listeners(event)) {
      try {
        listener(...args);
      } catch (err) {
        // Log error but continue notifying other listeners
        console.error(`Error in ${event} listener:`, err);

        // Emit error event
        this.emit('error', err);
      }
    }
  }
}
```

### 5.2 Validation Before State Change

Validate before modifying state, then emit:

```typescript
class TreeNode {
  addChild(child: TreeNode) {
    // Validate first (state unchanged)
    this.validateChild(child);

    // Update state
    this._children.push(child);
    child._parent = this;

    // Emit after successful update
    this.emit('childAdded', { parent: this, child });
  }

  private validateChild(child: TreeNode) {
    if (child._parent) {
      throw new Error('Child already has a parent');
    }
    if (this._children.includes(child)) {
      throw new Error('Child already attached');
    }
  }
}
```

---

## 6. Performance Considerations

### 6.1 Debounce High-Frequency Events

```typescript
class TreeNode {
  private _emitScheduled = false;

  private _scheduleEmit() {
    if (this._emitScheduled) return;

    this._emitScheduled = true;
    queueMicrotask(() => {
      this.emit('treeUpdated');
      this._emitScheduled = false;
    });
  }

  addChild(child: TreeNode) {
    this._children.push(child);
    this._scheduleEmit(); // Debounced emit
  }
}
```

### 6.2 Lazy Event Creation

Create event objects only if listeners exist:

```typescript
class EventEmitter {
  emit(type: string, ...args: any[]) {
    if (this.listenerCount(type) === 0) {
      return; // No listeners, skip event creation
    }

    const event = { type, payload: args, timestamp: Date.now() };
    // ... emit to listeners
  }
}
```

---

## 7. Testing Event Emission

### 7.1 Test Event Timing

```typescript
describe('TreeNode', () => {
  it('should emit event after state change', async () => {
    const parent = new TreeNode('parent');
    const child = new TreeNode('child');

    let eventReceived = false;
    let childHasParent = false;

    parent.on('childAdded', (event) => {
      eventReceived = true;
      // Verify state is already updated
      childHasParent = child.parent === parent;
    });

    parent.addChild(child);

    expect(eventReceived).toBe(true);
    expect(childHasParent).toBe(true);
  });
});
```

### 7.2 Test Event Payloads

```typescript
it('should include complete state in event payload', () => {
  const parent = new TreeNode('parent');
  const child = new TreeNode('child');

  const receivedEvents: any[] = [];
  parent.on('childAdded', (event) => {
    receivedEvents.push(event);
  });

  parent.addChild(child);

  expect(receivedEvents).toHaveLength(1);
  expect(receivedEvents[0]).toMatchObject({
    type: 'childAdded',
    parentId: parent.id,
    child: expect.objectContaining({
      id: child.id,
      parent: parent.id
    })
  });
});
```

---

## 8. Industry Examples

### 8.1 Node.js File System

```typescript
fs.writeFile('file.txt', 'content', (err) => {
  if (err) throw err;
  // File system state updated first
  // Then 'change' events are emitted to watchers
});
```

### 8.2 React State Updates

```typescript
const [state, setState] = useState(initialState);

setState(newState); // State update queued
// Effects run AFTER state update completes
useEffect(() => {
  console.log('State updated:', state);
}, [state]);
```

### 8.3 Vue Watchers

```typescript
watch(source, (newValue, oldValue) => {
  // Callback runs AFTER state change
  console.log('New value:', newValue);
});
```

### 8.4 MobX Observables

```typescript
import { observable, action, reaction } from 'mobx';

class Store {
  @observable count = 0;

  @action
  increment() {
    this.count++; // State change
    // Reactions run AFTER action completes
  }
}

reaction(
  () => store.count,
  (count) => console.log('Count updated:', count)
);
```

---

## 9. Anti-Patterns to Avoid

### 9.1 Emitting Before State Change

```typescript
// ❌ WRONG
class TreeNode {
  addChild(child: TreeNode) {
    this.emit('beforeChildAdd', child); // Don't do this
    this._children.push(child);
  }
}
```

**Problem:** Observers can't read the new state yet.

### 9.2 Emitting During State Change

```typescript
// ❌ WRONG
class TreeNode {
  addChild(child: TreeNode) {
    this._children.push(child);
    this.emit('childAdding', child); // Ambiguous state
    child._parent = this;
  }
}
```

**Problem:** Tree is in inconsistent state during emission.

### 9.3 Async State Changes Without Synchronization

```typescript
// ❌ WRONG
class TreeNode {
  async addChild(child: TreeNode) {
    this._children.push(child);
    this.emit('childAdded', child); // Fires immediately

    await this.validateTree(); // Validation happens later
  }
}
```

**Problem:** Observers see state before validation completes.

---

## 10. Key Insights for Groundswell

### 10.1 Current Implementation Analysis

Based on the codebase review:

**Good Patterns Found:**
- `/home/dustin/projects/groundswell/src/core/workflow.ts` - `attachChild()` updates state before emitting (lines 364-372)
- `detachChild()` updates state before emitting (lines 407-425)
- `setStatus()` updates both `this.status` and `this.node.status` before emitting (lines 775-778)

**Current Event Pattern:**
```typescript
// From workflow.ts:364-372
this.children.push(child);
this.node.children.push(child.node);

// Emit child attached event
this.emitEvent({
  type: 'childAttached',
  parentId: this.id,
  child: child.node,
});
```

This follows the best practice: **State change first, then emit event**.

### 10.2 Recommendations

1. **Maintain Current Pattern:** Continue emitting events after state changes
2. **Add JSDoc Documentation:** Document event emission timing in method signatures
3. **Add Event Type Definitions:** Create comprehensive `@event` documentation
4. **Add Timing Tests:** Verify events fire after state updates in tests
5. **Consider Tree Update Events:** Add `treeUpdated` event after all tree modifications

### 10.3 Suggested JSDoc Pattern

```typescript
/**
 * Attach a child workflow to this parent workflow.
 *
 * **Event Emission Timing:** The `childAttached` event is emitted AFTER
 * the child is successfully attached and both workflow tree and node tree
 * are in a consistent state. Observers can safely read `child.parent` and
 * `parent.children` when handling this event.
 *
 * @fires {WorkflowEvent} WorkflowEvent#childAttached - Emitted after child is attached
 * @param {Workflow} child - The child workflow to attach
 * @throws {Error} If child is already attached or would create circular reference
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child');
 * parent.on('childAttached', (e) => {
 *   console.log('Child attached:', e.child.id);
 *   console.log('Parent has child:', parent.children.includes(child));
 * });
 * parent.attachChild(child);
 * ```
 */
public attachChild(child: Workflow): void {
  // ... implementation
}
```

---

## 11. Relevant Documentation URLs

### Node.js
- [Node.js EventEmitter Documentation](https://nodejs.org/api/events.html)
- [Node.js Events Best Practices](https://nodejs.org/en/docs/guides/event-emitters/)

### TypeScript
- [TypeScript Handbook - Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

### Web APIs
- [MutationObserver API](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [EventTarget API](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)

### Design Patterns
- [Observer Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/observer)
- [Gang of Four Composite Pattern](https://en.wikipedia.org/wiki/Composite_pattern)

### State Management
- [Redux Documentation](https://redux.js.org/)
- [MobX Documentation](https://mobx.js.org/)

### JSDoc
- [JSDoc @event Tag](https://jsdoc.app/tags-event.html)
- [JSDoc @fires Tag](https://jsdoc.app/tags-fires.html)

---

## 12. Conclusion

**Consensus:** The industry overwhelmingly favors emitting events **after** state changes complete. This pattern ensures:

1. **Consistency:** Observers always see valid state
2. **Reliability:** No race conditions or intermediate states
3. **Predictability:** Event handlers can read updated state immediately
4. **Testability:** Easy to verify state before event emission

**For Groundswell:** The current implementation already follows this best practice. The focus should be on:

1. Adding comprehensive JSDoc documentation for events
2. Creating tests that verify event timing
3. Documenting the "state first, then emit" pattern in developer guidelines
4. Adding `@event` tags to all event-emitting methods

---

**Next Steps:**
1. Review current event emission points in workflow.ts
2. Add JSDoc `@event` documentation
3. Create tests for event timing consistency
4. Document pattern in architecture documentation

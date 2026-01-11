# Workflow Class Research: P1.M1.T2.S1

## File Locations

- **Main Implementation**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Type Definitions**: `/home/dustin/projects/groundswell/src/types/workflow.ts`
- **Event Types**: `/home/dustin/projects/groundswell/src/types/events.ts`

## Current Class Structure

```typescript
export class Workflow<T = unknown> {
  // Properties
  public readonly id: string;
  public parent: Workflow | null = null;
  public children: Workflow[] = [];
  public status: WorkflowStatus = 'idle';
  protected readonly logger: WorkflowLogger;
  protected readonly node: WorkflowNode;
  private observers: WorkflowObserver[] = [];
  private executor?: WorkflowExecutor<T>;
  private config: WorkflowConfig;

  // Constructor with overloads for both class-based and functional patterns
  constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>)

  // Key Methods
  public attachChild(child: Workflow): void
  public emitEvent(event: WorkflowEvent): void
  public setStatus(status: WorkflowStatus): void
  public snapshotState(): void
  public addObserver(observer: WorkflowObserver): void
  public removeObserver(observer: WorkflowObserver): void
  public getNode(): WorkflowNode
  public async run(...args: unknown[]): Promise<T | WorkflowResult<T>

  // Private Methods
  private getRootObservers(): WorkflowObserver[]
  private getRoot(): Workflow
  private async runFunctional(): Promise<WorkflowResult<T>>
}
```

## Current attachChild() Implementation (lines 187-216)

```typescript
public attachChild(child: Workflow): void {
  if (this.children.includes(child)) {
    throw new Error('Child already attached to this workflow');
  }

  // Check if child already has a different parent
  if (child.parent !== null && child.parent !== this) {
    const errorMessage =
      `Child '${child.node.name}' already has a parent '${child.parent.node.name}'. ` +
      `A workflow can only have one parent. ` +
      `Use detachChild() on '${child.parent.node.name}' first if you need to reparent.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Update child's parent if it's currently null
  if (child.parent === null) {
    child.parent = this;
  }

  this.children.push(child);
  this.node.children.push(child.node);

  // Emit child attached event
  this.emitEvent({
    type: 'childAttached',
    parentId: this.id,
    child: child.node,
  });
}
```

## Key Observations

1. **Parent Validation Already Implemented**: Lines 193-200 check if child has a different parent
2. **No Circular Reference Detection**: The method does NOT check if `child` is an ancestor of `this`
3. **Cycle Detection Exists**: `getRoot()` method uses Set-based cycle detection but only for traversal
4. **Missing Helper Method**: `isDescendantOf()` is NOT implemented yet

## Parent/Child Relationship Properties

```typescript
// Workflow class properties
public parent: Workflow | null = null;
public children: Workflow[] = [];

// WorkflowNode interface properties
export interface WorkflowNode {
  parent: WorkflowNode | null;
  children: WorkflowNode[];
  // ... other properties
}
```

## Existing Cycle Detection Pattern (from getRoot())

```typescript
private getRootObservers(): WorkflowObserver[] {
  const visited = new Set<Workflow>();
  let root: Workflow = this;
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    root = current;
    current = current.parent;
  }

  return root.observers;
}
```

## Constructor Auto-Attach Behavior

From `workflow.ts` lines 113-116:
```typescript
if (parentOrExecutor instanceof Workflow) {
  parentOrExecutor.attachChild(this);
  this.parent = parentOrExecutor;
}
```

**CRITICAL**: When creating `new Workflow(name, parent)`, the constructor automatically calls `parent.attachChild(this)`.

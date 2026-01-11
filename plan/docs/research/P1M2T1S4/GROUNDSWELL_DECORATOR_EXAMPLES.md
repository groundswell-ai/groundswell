# Groundswell Decorator Documentation Examples

**Purpose:** Concrete examples from the Groundswell codebase showing current vs recommended documentation patterns

---

## Example 1: @Step Decorator Documentation

### Current Implementation

**File:** `/home/dustin/projects/groundswell/docs/workflow.md` (lines 114-163)

```markdown
### @Step

Wraps methods with event emission and error handling.

```typescript
import { Step } from 'groundswell';

class MyWorkflow extends Workflow {
  // Default - emits stepStart/stepEnd events
  @Step()
  async basicStep(): Promise<void> {}

  // Custom name
  @Step({ name: 'CustomStepName' })
  async namedStep(): Promise<void> {}

  // Capture state after completion
  @Step({ snapshotState: true })
  async snapshotStep(): Promise<void> {}

  // Track execution duration
  @Step({ trackTiming: true })
  async timedStep(): Promise<void> {}

  // Log start/end messages
  @Step({ logStart: true, logFinish: true })
  async loggedStep(): Promise<void> {}

  // All options
  @Step({
    name: 'FullStep',
    snapshotState: true,
    trackTiming: true,
    logStart: true,
    logFinish: true,
  })
  async fullStep(): Promise<void> {}
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Custom step name (defaults to method name) |
| `snapshotState` | `boolean` | Capture state snapshot after step completion |
| `trackTiming` | `boolean` | Track and emit step duration |
| `logStart` | `boolean` | Log message when step starts |
| `logFinish` | `boolean` | Log message when step completes |
```

### Recommended Improvement

```markdown
### @Step

Wraps methods with event emission and error handling.

#### Default Behavior

Without any options, `@Step()` emits `stepStart` and `stepEnd` events with automatic timing tracking.

```typescript
class MyWorkflow extends Workflow {
  @Step()  // All defaults: trackTiming=true, snapshotState=false
  async basicStep(): Promise<void> {}
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom step name for logs and events |
| `snapshotState` | `boolean` | `false` | Capture state snapshot after step completion |
| `trackTiming` | `boolean` | `true` | Track and emit step duration in stepEnd event |
| `logStart` | `boolean` | `false` | Log info message when step starts |
| `logFinish` | `boolean` | `false` | Log info message when step completes |

#### Examples

**Custom Step Name**
```typescript
@Step({ name: 'CustomStepName' })
async namedStep(): Promise<void> {}
```

**Capture State Snapshot**
```typescript
@Step({ snapshotState: true })
async snapshotStep(): Promise<void> {}
```

**Enable Logging**
```typescript
@Step({ logStart: true, logFinish: true })
async loggedStep(): Promise<void> {}
```

**All Options Combined**
```typescript
@Step({
  name: 'FullStep',
  snapshotState: true,
  trackTiming: true,
  logStart: true,
  logFinish: true,
})
async fullStep(): Promise<void> {}
```

#### Type Definition

```typescript
interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}
```
```

### Key Improvements

1. **Added "Default" column** - Makes defaults immediately visible
2. **Added "Default Behavior" section** - Explains what happens with no options
3. **Restructured examples** - Grouped by feature instead of progressive
4. **Added Type Definition** - Shows the TypeScript interface
5. **Improved descriptions** - More detailed and consistent

---

## Example 2: @Task Decorator Documentation

### Current Implementation

**File:** `/home/dustin/projects/groundswell/docs/workflow.md` (lines 164-207)

```markdown
### @Task

Wraps methods that return child workflows.

```typescript
import { Task } from 'groundswell';

class ParentWorkflow extends Workflow {
  // Basic - attaches returned workflow as child
  @Task()
  async createChild(): Promise<ChildWorkflow> {
    return new ChildWorkflow('Child', this);
  }

  // Custom name
  @Task({ name: 'SpawnWorker' })
  async spawnWorker(): Promise<WorkerWorkflow> {
    return new WorkerWorkflow('Worker', this);
  }

  // Concurrent - runs all returned workflows in parallel
  @Task({ concurrent: true })
  async createWorkers(): Promise<WorkerWorkflow[]> {
    return [
      new WorkerWorkflow('W1', this),
      new WorkerWorkflow('W2', this),
      new WorkerWorkflow('W3', this),
    ];
  }

  async run(): Promise<void> {
    const child = await this.createChild();
    await child.run();
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Custom task name |
| `concurrent` | `boolean` | Run returned workflows in parallel |
```

### Recommended Improvement

```markdown
### @Task

Wraps methods that return child workflows and automatically attaches them to the parent workflow.

#### Default Behavior

By default, `@Task()` attaches the returned workflow(s) as children of the parent workflow. Single workflows run sequentially; multiple workflows run in parallel when returned as an array.

```typescript
class ParentWorkflow extends Workflow {
  @Task()  // Default: concurrent=false, uses method name
  async createChild(): Promise<ChildWorkflow> {
    return new ChildWorkflow('Child', this);
  }

  async run(): Promise<void> {
    const child = await this.createChild();
    await child.run();
  }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom task name for logs and events |
| `concurrent` | `boolean` | `false` | Run returned workflows in parallel (requires array return type) |

#### Examples

**Custom Task Name**
```typescript
@Task({ name: 'SpawnWorker' })
async spawnWorker(): Promise<WorkerWorkflow> {
  return new WorkerWorkflow('Worker', this);
}
```

**Concurrent Execution**
```typescript
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> {
  return [
    new WorkerWorkflow('W1', this),
    new WorkerWorkflow('W2', this),
    new WorkerWorkflow('W3', this),
  ];
}
```

#### Sequential vs Concurrent

```typescript
// Sequential (default) - waits for each
@Task()
async createChild(): Promise<ChildWorkflow> {
  return new ChildWorkflow('Child', this);
}

// Concurrent - runs all in parallel
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> {
  return [
    new WorkerWorkflow('W1', this),
    new WorkerWorkflow('W2', this),
  ];
}
```

#### Type Definition

```typescript
interface TaskOptions {
  name?: string;
  concurrent?: boolean;
}
```
```

---

## Example 3: @ObservedState Decorator Documentation

### Current Implementation

**File:** `/home/dustin/projects/groundswell/docs/workflow.md` (lines 208-244)

```markdown
### @ObservedState

Marks fields for inclusion in state snapshots.

```typescript
import { ObservedState, getObservedState } from 'groundswell';

class MyWorkflow extends Workflow {
  // Included in snapshots
  @ObservedState()
  progress = 0;

  // Shown as '***' in snapshots
  @ObservedState({ redact: true })
  apiKey = 'secret';

  // Excluded from snapshots
  @ObservedState({ hidden: true })
  internalState = {};

  async run(): Promise<void> {
    this.progress = 50;

    // Get current state snapshot
    const state = getObservedState(this);
    // { progress: 50, apiKey: '***' }
  }
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `hidden` | `boolean` | Exclude field from snapshots entirely |
| `redact` | `boolean` | Show value as `'***'` in snapshots |
```

### Recommended Improvement

```markdown
### @ObservedState

Marks fields for inclusion in state snapshots captured during workflow execution.

#### Default Behavior

Without options, `@ObservedState()` includes the field's value in all state snapshots.

```typescript
class MyWorkflow extends Workflow {
  @ObservedState()  // Default: hidden=false, redact=false
  progress = 0;

  async run(): Promise<void> {
    this.progress = 50;
    const state = getObservedState(this);
    // { progress: 50 }
  }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hidden` | `boolean` | `false` | Exclude field from snapshots entirely |
| `redact` | `boolean` | `false` | Show value as `'***'` in snapshots (for secrets) |

#### Examples

**Regular Observed Field**
```typescript
@ObservedState()
progress = 0;
```

**Redacted Field (Secrets)**
```typescript
@ObservedState({ redact: true })
apiKey = 'secret-key';  // Shows as '***' in snapshots
```

**Hidden Field**
```typescript
@ObservedState({ hidden: true })
internalState = {};  // Not included in snapshots
```

#### Security Pattern

```typescript
class SecureWorkflow extends Workflow {
  @ObservedState()
  publicData: string = 'visible';

  @ObservedState({ redact: true })
  apiKey: string = 'secret';  // Redacted in logs

  @ObservedState({ redact: true })
  password: string = 'password';  // Redacted in logs

  @ObservedState({ hidden: true })
  internalCounter: number = 0;  // Never logged

  async run(): Promise<void> {
    const snapshot = getObservedState(this);
    // {
    //   publicData: 'visible',
    //   apiKey: '***',
    //   password: '***'
    // }
    // Note: internalCounter is not present
  }
}
```

#### Type Definition

```typescript
interface ObservedStateOptions {
  hidden?: boolean;
  redact?: boolean;
}
```
```

---

## Example 4: README Quick Start

### Current Implementation

**File:** `/home/dustin/projects/groundswell/README.md` (lines 114-131)

```typescript
## Decorators

```typescript
// Emit lifecycle events and track timing
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }

// Spawn and manage child workflows
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }

// Mark fields for state snapshots
@ObservedState()
progress: number = 0;

@ObservedState({ redact: true })  // Shown as '***'
apiKey: string = 'secret';
```
```

### Recommended Addition

Add inline comments explaining defaults:

```typescript
## Decorators

```typescript
// Basic step with automatic timing (default: trackTiming=true)
@Step()
async processData(): Promise<void> { }

// Capture state when step completes
@Step({ snapshotState: true })
async processData(): Promise<void> { }

// Spawn child workflows (default: sequential)
@Task()
async createChild(): Promise<ChildWorkflow> { }

// Spawn child workflows in parallel
@Task({ concurrent: true })
async createWorkers(): Promise<WorkerWorkflow[]> { }

// Include field in state snapshots
@ObservedState()
progress: number = 0;

// Redact sensitive values (shown as '***')
@ObservedState({ redact: true })
apiKey: string = 'secret';
```

**See:** [Decorator Documentation](docs/workflow.md#decorators) for full options
```

---

## Example 5: Executable Example File

### Current Implementation

**File:** `/home/dustin/projects/groundswell/examples/examples/02-decorator-options.ts` (lines 1-20)

```typescript
/**
 * Example 2: Decorator Options
 *
 * Demonstrates all decorator configuration options:
 *
 * @Step options:
 * - name: Custom step name (defaults to method name)
 * - snapshotState: Capture state snapshot after step completion
 * - trackTiming: Track and emit step duration
 * - logStart: Log message at step start
 * - logFinish: Log message at step end
 *
 * @Task options:
 * - name: Custom task name
 * - concurrent: Run returned workflows concurrently
 *
 * @ObservedState options:
 * - hidden: Field not included in snapshots
 * - redact: Value shown as '***' in snapshots
 */
```

### Recommended Improvement

```typescript
/**
 * Example 2: Decorator Options
 *
 * Demonstrates all decorator configuration options with their defaults:
 *
 * @Step(options) - Wraps methods with event emission and error handling
 *   Options:
 *   - name: string (default: method name)
 *     Custom step name for logs and events
 *   - snapshotState: boolean (default: false)
 *     Capture state snapshot after step completion
 *   - trackTiming: boolean (default: true)
 *     Track and emit step duration
 *   - logStart: boolean (default: false)
 *     Log info message when step starts
 *   - logFinish: boolean (default: false)
 *     Log info message when step completes
 *
 * @Task(options) - Wraps methods that return child workflows
 *   Options:
 *   - name: string (default: method name)
 *     Custom task name for logs and events
 *   - concurrent: boolean (default: false)
 *     Run returned workflows in parallel
 *
 * @ObservedState(options) - Marks fields for state snapshots
 *   Options:
 *   - hidden: boolean (default: false)
 *     Exclude field from snapshots entirely
 *   - redact: boolean (default: false)
 *     Show value as '***' in snapshots (for secrets)
 *
 * @see docs/workflow.md for complete documentation
 */
```

---

## Implementation Checklist

Use this checklist when updating documentation:

### For @Step Decorator

- [ ] Add "Default" column with `trackTiming: true`
- [ ] Add "Default Behavior" section explaining automatic timing
- [ ] Update examples to show default vs explicit `true`
- [ ] Add type definition section

### For @Task Decorator

- [ ] Add "Default" column with `concurrent: false`
- [ ] Explain sequential vs concurrent behavior
- [ ] Show array return type requirement for concurrent
- [ ] Add type definition section

### For @ObservedState Decorator

- [ ] Add "Default" column with `hidden: false, redact: false`
- [ ] Add security pattern example
- [ ] Explain difference between hidden and redact
- [ ] Add type definition section

### General Improvements

- [ ] Ensure all code examples use consistent formatting
- [ ] Add cross-references between decorators
- [ ] Include "See Also" sections
- [ ] Add type definitions for all options interfaces
- [ ] Keep examples executable

---

## File Reference Summary

| File | Purpose | Key Sections |
|------|---------|--------------|
| `docs/workflow.md` | Main documentation | Lines 114-244 |
| `README.md` | Quick start | Lines 114-131 |
| `src/types/decorators.ts` | Type definitions | Lines 1-26 |
| `examples/02-decorator-options.ts` | Executable examples | Lines 1-20 |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Related Research:** `DECORATOR_DOCUMENTATION_BEST_PRACTICES.md`

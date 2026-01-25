# Integration Test Failure Patterns Catalog
**AgentResponse and Workflow Code Analysis**

**Research Date:** 2026-01-24
**Scope:** Integration test failure patterns for AgentResponse<T> in multi-step workflow scenarios
**Sources:** /home/dustin/projects/groundswell/src/__tests__/integration/

---

## Executive Summary

This catalog documents common integration test failure patterns identified through comprehensive analysis of existing integration tests and code patterns. The failures are categorized into five major areas:

1. **Response Propagation Failures** - AgentResponse not flowing correctly through nested workflows
2. **Type Guard Failures** - Issues with `isSuccess`, `isError`, and `isPartial` in workflow contexts
3. **Zod Validation Failures** - Schema validation issues in integration contexts
4. **Workflow State Consistency** - Bidirectional tree consistency violations
5. **Observer Error Handling** - Failures in observer notification patterns

Each pattern includes:
- **Symptom** - What the failure looks like
- **Root Cause** - Why it happens
- **Detection** - How to identify it
- **Fix** - Concrete solution
- **Prevention** - How to avoid it

---

## 1. Response Propagation Failures

### Pattern 1.1: AgentResponse Lost in Nested Workflow Execution

**Symptom:**
- Child workflow returns `AgentResponse<T>` but parent workflow receives `undefined` or wrong type
- Type assertion errors when accessing response data in parent workflow

**Root Cause:**
```typescript
// PROBLEMATIC: Child workflow returns AgentResponse
class ChildWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    return createSuccessResponse('result', { agentId: 'child', timestamp: Date.now() });
  }
}

// PROBLEMATIC: Parent doesn't await or handle AgentResponse properly
class ParentWorkflow extends Workflow {
  async run(): Promise<void> {
    const child = new ChildWorkflow('child', this);
    await child.run(); // AgentResponse is lost here
    // Expected: const response = await child.run();
  }
}
```

**Detection:**
```typescript
// Test fails with:
expect(result.data).toBeDefined(); // undefined
// TypeError: Cannot read properties of undefined
```

**Fix:**
```typescript
// CORRECT: Capture and propagate AgentResponse
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const child = new ChildWorkflow('child', this);
    const childResponse = await child.run();

    if (isError(childResponse)) {
      return createErrorResponse(
        'CHILD_FAILED',
        'Child workflow failed',
        { childError: childResponse.error },
        childResponse.error.recoverable
      );
    }

    // Transform or propagate child's success response
    return createSuccessResponse(
      childResponse.data,
      { agentId: 'parent', timestamp: Date.now() }
    );
  }
}
```

**Prevention:**
- Always capture return values from child workflow execution
- Type workflow `run()` methods to return `AgentResponse<T>` not `Promise<void>`
- Use type guards before accessing response data

---

### Pattern 1.2: Metadata Not Propagated Through Workflow Chain

**Symptom:**
- `metadata.agentId` shows wrong workflow
- `metadata.timestamp` doesn't reflect actual execution time
- Missing `requestId` correlation through nested calls

**Root Cause:**
```typescript
// PROBLEMATIC: Metadata not updated when propagating response
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const childResponse = await child.run();

    // Re-using child's metadata - loses parent context
    return childResponse; // WRONG: metadata still shows child agentId
  }
}
```

**Detection:**
```typescript
// Test shows:
expect(response.metadata.agentId).toBe('parent-workflow'); // fails, shows 'child-workflow'
```

**Fix:**
```typescript
// CORRECT: Create new response with updated metadata
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const childResponse = await child.run();

    if (isSuccess(childResponse)) {
      return createSuccessResponse(
        childResponse.data,
        {
          agentId: this.id, // Use parent's agentId
          timestamp: Date.now(), // Update timestamp
          requestId: childResponse.metadata.requestId, // Preserve correlation
          duration: childResponse.metadata.duration, // Preserve child timing
        }
      );
    }

    return childResponse; // Re-throw errors as-is or transform
  }
}
```

**Prevention:**
- Always create new AgentResponse when changing workflow scope
- Preserve `requestId` for correlation tracing
- Update `agentId` and `timestamp` to reflect current workflow

---

### Pattern 1.3: Partial Responses Not Handled in Multi-Step Workflows

**Symptom:**
- Workflow hangs waiting for completion
- Partial results discarded instead of accumulated
- `isPartial` type guard not used

**Root Cause:**
```typescript
// PROBLEMATIC: Assuming only success/error states
class MultiStepWorkflow extends Workflow {
  async run(): Promise<void> {
    const response = await agent.prompt('Generate full report');

    // WRONG: Only checks success/error
    if (isSuccess(response)) {
      console.log(response.data);
    } else if (isError(response)) {
      console.error(response.error.message);
    }
    // Partial responses fall through and are ignored
  }
}
```

**Detection:**
```typescript
// Test shows agent returning partial responses but workflow not progressing
expect(workflow.status).toBe('running'); // Still running after timeout
```

**Fix:**
```typescript
// CORRECT: Handle all three response types
class MultiStepWorkflow extends Workflow {
  private accumulatedData: string[] = [];

  async run(): Promise<AgentResponse<string>> {
    const response = await agent.prompt('Generate full report');

    if (isSuccess(response)) {
      return createSuccessResponse(
        this.accumulatedData.join('\n') + response.data,
        { agentId: this.id, timestamp: Date.now() }
      );
    } else if (isPartial(response)) {
      // Accumulate partial results and continue
      this.accumulatedData.push(response.data.partialContent);
      // Continue workflow or request next chunk
      return this.run(); // Recursive call for next chunk
    } else { // isError
      return response; // Propagate error
    }
  }
}
```

**Prevention:**
- Always handle all three states: `success`, `error`, `partial`
- Use `isPartial` type guard for incremental results
- Document partial response behavior in workflow contracts

---

## 2. Type Guard Failures

### Pattern 2.1: Type Guard Not Used Before Data Access

**Symptom:**
- Runtime error: `Cannot read properties of null`
- TypeScript type narrowing not working
- Accessing `.data` on error responses or `.error` on success responses

**Root Cause:**
```typescript
// PROBLEMATIC: Accessing data without type guard
const response: AgentResponse<string> = await agent.prompt('test');
console.log(response.data.toUpperCase()); // CRASHES if response is error

// TypeScript allows this because AgentResponse<string> allows both success and error
```

**Detection:**
```typescript
// Test failure:
TypeError: Cannot read properties of null (reading 'toUpperCase')
```

**Fix:**
```typescript
// CORRECT: Always use type guards
const response: AgentResponse<string> = await agent.prompt('test');

if (isSuccess(response)) {
  // TypeScript knows: response.data is string (not null)
  console.log(response.data.toUpperCase());
} else if (isError(response)) {
  // TypeScript knows: response.error exists
  console.error(`Error: ${response.error.code} - ${response.error.message}`);
} else if (isPartial(response)) {
  // TypeScript knows: response.data exists for partial
  console.log(`Partial: ${response.data}`);
}

// ALTERNATIVE: Use assertion helper (but type guard is preferred)
const data = response.data ?? 'fallback'; // Works but loses type safety
```

**Prevention:**
- Enable TypeScript strict mode and `strictNullChecks`
- Use ESLint rule to enforce type guard usage
- Never access `response.data` or `response.error` without type guard

---

### Pattern 2.2: Type Guard After Async Boundary Loses Narrowing

**Symptom:**
- TypeScript complains about null access after `await`
- Type narrowing "lost" across async operations

**Root Cause:**
```typescript
// PROBLEMATIC: Type guard doesn't persist across await
async function processResponse(response: AgentResponse<string>) {
  if (isSuccess(response)) {
    // TypeScript knows response.data is string here

    await someAsyncOperation();

    // WRONG: TypeScript may lose narrowing after await
    console.log(response.data.toUpperCase()); // Type error possible
  }
}
```

**Detection:**
```typescript
// TypeScript error:
Object is possibly 'null'
```

**Fix:**
```typescript
// CORRECT: Capture data before async boundary
async function processResponse(response: AgentResponse<string>) {
  if (isSuccess(response)) {
    // Capture data in local variable before await
    const data = response.data; // Type: string

    await someAsyncOperation();

    // Use captured variable - type is preserved
    console.log(data.toUpperCase()); // Safe
  }
}

// ALTERNATIVE: Use type assertion if you're certain (rarely needed)
if (isSuccess(response)) {
  const data = response.data; // Capture
  await something();
  console.log(data!); // Non-null assertion (use sparingly)
}
```

**Prevention:**
- Capture narrowed values in local variables before async operations
- Avoid non-null assertions (`!`) - prefer capturing
- Document async boundaries in code comments

---

### Pattern 2.3: Discriminated Union Mismatch in Workflow Context

**Symptom:**
- Schema validation fails: `data must be null for error responses`
- Zod error: `Invalid discriminator value`

**Root Cause:**
```typescript
// PROBLEMATIC: Creating malformed responses in workflow
class WorkflowWithBugs extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    try {
      const result = await someOperation();
      return {
        status: 'success',
        data: result,
        error: null,
        metadata: { agentId: this.id, timestamp: Date.now() }
      };
    } catch (err) {
      return {
        status: 'error',
        data: result, // WRONG: data should be null for error
        error: { code: 'FAILED', message: 'Failed', details: null, recoverable: false },
        metadata: { agentId: this.id, timestamp: Date.now() }
      };
    }
  }
}
```

**Detection:**
```typescript
// Zod validation error:
ZodError: [
  {
    "code": "invalid_union",
    "path": ["response"],
    "message": "Discriminator mismatch"
  }
]
```

**Fix:**
```typescript
// CORRECT: Use factory functions or discriminated union properly
class WorkflowFixed extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    try {
      const result = await someOperation();

      // Use factory function - guarantees correct structure
      return createSuccessResponse(
        result,
        { agentId: this.id, timestamp: Date.now() }
      );
    } catch (err) {
      // Use factory function - guarantees data is null
      return createErrorResponse(
        'OPERATION_FAILED',
        err instanceof Error ? err.message : 'Unknown error',
        { originalError: err },
        true // recoverable
      );
    }
  }
}
```

**Prevention:**
- Always use `createSuccessResponse()` and `createErrorResponse()` factory functions
- Never manually construct AgentResponse objects
- Run Zod schema validation in tests

---

## 3. Zod Validation Failures

### Pattern 3.1: Undefined Fields Violate PRD 6.4.4 (Null Over Undefined)

**Symptom:**
- Schema validation fails with `undefined` not allowed
- Error: `Invalid undefined value for field`

**Root Cause:**
```typescript
// PROBLEMATIC: Using undefined instead of null
const badResponse: AgentResponse<string> = {
  status: 'success',
  data: 'result',
  error: undefined, // WRONG: should be null per PRD 6.4.4
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Detection:**
```typescript
// Zod error:
ZodError: [
  {
    "code": "invalid_type",
    "expected": "null",
    "received": "undefined",
    "path": ["error"]
  }
]
```

**Fix:**
```typescript
// CORRECT: Always use null for absent values
const goodResponse: AgentResponse<string> = {
  status: 'success',
  data: 'result',
  error: null, // CORRECT: null not undefined
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// BETTER: Use factory functions (handle null automatically)
const response = createSuccessResponse('result', { agentId: 'test', timestamp: Date.now() });
// response.error is automatically null
```

**Prevention:**
- Use factory functions (`createSuccessResponse`, `createErrorResponse`)
- Enable ESLint rule: `no-undefined`
- Document PRD 6.4.4 requirement in code reviews

---

### Pattern 3.2: Wrong Status Value (Case Sensitivity)

**Symptom:**
- Zod validation error: `Invalid discriminator value`
- Status must be lowercase: `'success'` not `'Success'` or `'SUCCESS'`

**Root Cause:**
```typescript
// PROBLEMATIC: Wrong case in status
const response = {
  status: 'Success', // WRONG: case-sensitive
  data: 'result',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Detection:**
```typescript
// Zod error:
ZodError: Invalid discriminator value. Expected 'success' | 'error' | 'partial'
```

**Fix:**
```typescript
// CORRECT: Use exact lowercase values
const response = {
  status: 'success', // CORRECT: lowercase
  data: 'result',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// BEST: Use const assertion for type safety
const status = 'success' as const;
const response = { status, data: 'result', error: null, ... };
```

**Prevention:**
- Use `AgentResponseStatus` type: `type Status = 'success' | 'error' | 'partial'`
- Use const assertions: `status: 'success' as const`
- Factory functions prevent this error entirely

---

### Pattern 3.3: Schema Mismatch Between Expected and Actual Data

**Symptom:**
- Runtime validation fails during workflow execution
- Agent returns data that doesn't match expected Zod schema

**Root Cause:**
```typescript
// PROBLEMATIC: Schema doesn't match agent output
const ResponseSchema = z.object({
  title: z.string(),
  count: z.number(),
});

// Agent returns different structure
const actualResponse = {
  title: 'Report',
  count: 5,
  extraField: 'not in schema', // May be OK with passthrough
  // BUT: Missing required fields will fail
};

// Agent returns:
const badResponse = {
  name: 'Report', // WRONG field name
  value: 5, // WRONG field name
};
```

**Detection:**
```typescript
// Test fails with:
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["title"]
  }
]
```

**Fix:**
```typescript
// CORRECT: Match schema to actual agent output
// Option 1: Update schema to match reality
const CorrectResponseSchema = z.object({
  name: z.string(),
  value: z.number(),
});

// Option 2: Use transform to map agent output to expected schema
const ResponseSchema = z.object({
  title: z.string(),
  count: z.number(),
}).transform((data) => ({
  title: data.name,
  count: data.value,
}));

// Option 3: Use loose schema with validation
const LooseResponseSchema = z.object({
  title: z.string().optional(),
  count: z.number().optional(),
  name: z.string().optional(),
  value: z.number().optional(),
}).refine((data) => {
  // Custom validation: either (title,count) OR (name,value)
  return (data.title && data.count) || (data.name && data.value);
});
```

**Prevention:**
- Document expected agent response format in schema comments
- Use `zod-to-ts` to generate TypeScript types from Zod schemas
- Test agent prompts with schema validation before integration

---

### Pattern 3.4: Circular Reference in Response Data

**Symptom:**
- `JSON.stringify()` throws `TypeError: Converting circular structure to JSON`
- Response serialization fails during workflow logging

**Root Cause:**
```typescript
// PROBLEMATIC: Circular reference in data
const workflowData: any = { id: '123' };
workflowData.self = workflowData; // Circular reference

const response = createSuccessResponse(
  workflowData,
  { agentId: 'test', timestamp: Date.now() }
);

// Later, workflow tries to log response:
this.logger.info('Response:', response); // CRASHES on circular reference
```

**Detection:**
```typescript
// Test failure:
TypeError: Converting circular structure to JSON
    at JSON.stringify (<anonymous>)
```

**Fix:**
```typescript
// CORRECT: Remove circular references before creating response
function sanitizeCircular(obj: any): any {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }));
}

const cleanData = sanitizeCircular(workflowData);
const response = createSuccessResponse(
  cleanData,
  { agentId: 'test', timestamp: Date.now() }
);

// OR: Use structuredClone (Node.js 17+)
const cleanData = structuredClone(workflowData); // Throws on circular references
```

**Prevention:**
- Validate data is JSON-serializable before creating AgentResponse
- Use `JSON.parse(JSON.stringify(data))` as serialization test
- Document data structure requirements in workflow contracts

---

## 4. Workflow State Consistency Failures

### Pattern 4.1: Bidirectional Tree Mirror Violation (PRD 12.2)

**Symptom:**
- `child.parent` doesn't match `child.node.parent`
- `parent.children` doesn't match `parent.node.children`
- Tree consistency validation fails

**Root Cause:**
```typescript
// PROBLEMATIC: Manual mutation breaks tree mirror invariant
const parent = new Workflow('Parent');
const child = new Workflow('Child', parent);

// Manual mutation bypasses attachChild
(child as any).parent = otherParent; // BREAKS mirror invariant
// Now: child.parent === otherParent BUT child.node.parent === parent.node
```

**Detection:**
```typescript
// Tree consistency check fails:
validateTreeConsistency(parent);
// Throws: MIRROR_VIOLATION: child.parent !== child.node.parent
```

**Fix:**
```typescript
// CORRECT: Always use proper attach/detach methods
const parent = new Workflow('Parent');
const child = new Workflow('Child');

// Use attachChild - maintains both trees
parent.attachChild(child);

// To reparent: detach first, then attach
parent.detachChild(child);
otherParent.attachChild(child);

// NEVER manually mutate parent or children arrays
```

**Prevention:**
- Make `parent` and `children` properties private (if possible)
- Use `attachChild`/`detachChild` exclusively
- Run tree consistency validation in tests
- Use bidirectional consistency test suite from `/src/__tests__/integration/bidirectional-consistency.test.ts`

---

### Pattern 4.2: Observer Not Notified After Reparenting

**Symptom:**
- Tree events not reaching observers after `detachChild`/`attachChild`
- Observer thinks child is still attached to old parent

**Root Cause:**
```typescript
// PROBLEMATIC: Detaching without proper event emission
const parent1 = new Workflow('Parent1');
const parent2 = new Workflow('Parent2');
const child = new Workflow('Child', parent1);

parent1.detachChild(child);
parent2.attachChild(child);

// Observer on parent1 doesn't know child is gone
// Observer on parent2 doesn't know child arrived
```

**Detection:**
```typescript
// Test from workflow-reparenting.test.ts:
const parent1Events: WorkflowEvent[] = [];
parent1.addObserver({ onEvent: (e) => parent1Events.push(e), ... });

parent1.detachChild(child);
parent2.attachChild(child);

child.setStatus('running');
const treeUpdatedEvent = parent1Events.find(e => e.type === 'treeUpdated');
expect(treeUpdatedEvent).toBeUndefined(); // PASSES - no event received

// BUT: parent1 should NOT receive events after reparenting
const parent2ReceivedEvent = parent2Events.find(e => e.type === 'treeUpdated');
expect(parent2ReceivedEvent).toBeDefined(); // MUST receive event
```

**Fix:**
```typescript
// This is actually CORRECT behavior in the codebase
// The fix is in the TEST - verify parent1 does NOT receive events
// The observer propagation automatically updates after reparenting

// Validation test:
it('should not notify old parent after reparenting', () => {
  const parent1Events: WorkflowEvent[] = [];
  const parent2Events: WorkflowEvent[] = [];

  parent1.addObserver({ onEvent: (e) => parent1Events.push(e), ... });
  parent2.addObserver({ onEvent: (e) => parent2Events.push(e), ... });

  parent1.detachChild(child);
  parent2.attachChild(child);

  // Clear events before testing
  parent1Events.length = 0;
  parent2Events.length = 0;

  child.setStatus('running');

  // parent1 should NOT receive event
  expect(parent1Events.some(e => e.type === 'treeUpdated')).toBe(false);

  // parent2 SHOULD receive event
  expect(parent2Events.some(e => e.type === 'treeUpdated')).toBe(true);
});
```

**Prevention:**
- Always clear event arrays after setup operations
- Test both positive (new parent receives) and negative (old parent doesn't)
- Use test patterns from `/src/__tests__/integration/workflow-reparenting.test.ts`

---

### Pattern 4.3: Workflow Status Inconsistent After Error

**Symptom:**
- `workflow.status` shows `'running'` but workflow threw error
- Node status not updated when step fails
- Parent workflow doesn't know child failed

**Root Cause:**
```typescript
// PROBLEMATIC: Error thrown without status update
class BuggyWorkflow extends Workflow {
  @Step({ name: 'failing-step' })
  async failingStep(): Promise<void> {
    throw new Error('Step failed');
    // Status never set to 'failed'
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.failingStep(); // Throws
    // setStatus('failed') never reached
  }
}
```

**Detection:**
```typescript
// Test shows:
expect(workflow.status).toBe('failed'); // FAILS - status is 'running'
```

**Fix:**
```typescript
// CORRECT: Use try-catch to ensure status update
class FixedWorkflow extends Workflow {
  @Step({ name: 'risky-step' })
  async riskyStep(): Promise<void> {
    try {
      await someRiskyOperation();
    } catch (error) {
      this.setStatus('failed');
      this.logger.error('Step failed', { error });
      throw error; // Re-throw for parent to handle
    }
  }

  async run(): Promise<void> {
    this.setStatus('running');

    try {
      await this.riskyStep();
      this.setStatus('completed');
    } catch (error) {
      this.setStatus('failed');
      throw error; // Propagate to parent
    }
  }
}

// OR: Use decorator to auto-handle status
@Step({ name: 'auto-step', setStatusOnError: true })
async autoStep(): Promise<void> {
  await riskyOperation();
  // Status automatically set to 'failed' if this throws
}
```

**Prevention:**
- Always use try-catch in workflow `run()` methods
- Set status to `'failed'` before re-throwing errors
- Use observer error logging to track failures
- Test error paths explicitly

---

## 5. Observer Error Handling Failures

### Pattern 5.1: Observer Throws Error, Breaking Workflow

**Symptom:**
- Workflow crashes when observer throws
- One observer failing prevents others from being notified
- Error propagation breaks workflow execution

**Root Cause:**
```typescript
// PROBLEMATIC: Observer throws uncaught error
const badObserver: WorkflowObserver = {
  onLog: (entry) => {
    if (entry.level === 'error') {
      throw new Error('Observer cannot handle errors');
    }
  },
  onEvent: () => {},
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

workflow.addObserver(badObserver);
workflow.logger.error('Test error'); // CRASHES workflow
```

**Detection:**
```typescript
// Test from observer-logging.test.ts:
it('should log observer errors and continue workflow', async () => {
  const throwingObserver: WorkflowObserver = {
    onLog: () => { throw new Error('Observer error'); },
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);

  // Should complete without throwing
  await expect(workflow.run()).resolves.toBeUndefined();
});
```

**Fix:**
```typescript
// The codebase ALREADY implements this fix correctly
// Observer errors are caught and logged to workflow.node.logs

// Implementation in WorkflowLogger:
onLog(entry: LogEntry): void {
  for (const observer of this.observers) {
    try {
      observer.onLog?.(entry);
    } catch (error) {
      // Log observer error WITHOUT triggering another notification
      // (prevents infinite recursion)
      this.node.logs.push({
        level: 'error',
        message: 'Observer onLog error',
        timestamp: Date.now(),
        data: { error },
      });
    }
  }
}

// Test validates this behavior:
it('should not crash workflow when observer onLog throws', async () => {
  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);

  // Should complete without throwing
  await expect(workflow.run()).resolves.toBeUndefined();

  // Should log the observer error
  expect(workflow.node.logs.some(l => l.message === 'Observer onLog error')).toBe(true);
});
```

**Prevention:**
- Always wrap observer callbacks in try-catch
- Log observer errors to `workflow.node.logs` not console.error
- Never re-throw observer errors (breaks isolation)
- Test with throwing observers (adversarial testing)

---

### Pattern 5.2: Infinite Recursion in Observer Error Logging

**Symptom:**
- Stack overflow when observer error triggers another observer error
- Test hangs or crashes with `Maximum call stack size exceeded`

**Root Cause:**
```typescript
// PROBLEMATIC: Error logging triggers observer notification
class WorkflowLogger {
  onLog(entry: LogEntry): void {
    for (const observer of this.observers) {
      try {
        observer.onLog?.(entry);
      } catch (error) {
        // WRONG: This triggers onLog again -> infinite recursion
        this.logError('Observer onLog error', { error });
      }
    }
  }
}
```

**Detection:**
```typescript
// Test from observer-logging.test.ts:
it('should avoid infinite recursion when observer onLog throws', async () => {
  let callCount = 0;
  const throwingObserver: WorkflowObserver = {
    onLog: () => {
      callCount++;
      if (callCount < 10) {
        throw new Error('Recursive error');
      }
    },
    ...
  };

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  await workflow.run();

  // Should only call once, then stop
  expect(callCount).toBe(1);
});
```

**Fix:**
```typescript
// CORRECT: Push directly to node.logs without observer notification
class WorkflowLogger {
  onLog(entry: LogEntry): void {
    for (const observer of this.observers) {
      try {
        observer.onLog?.(entry);
      } catch (error) {
        // CORRECT: Direct push - bypasses observer notification
        this.node.logs.push({
          level: 'error',
          message: 'Observer onLog error',
          timestamp: Date.now(),
          data: { error },
        });
        // No observer notification for this error log
        // Prevents infinite recursion
      }
    }
  }
}
```

**Prevention:**
- Observer error logs must bypass observer notification
- Use direct `node.logs.push()` for observer errors
- Test with recursive throwing observers
- Add safety limit: max observer calls per log entry

---

### Pattern 5.3: Multiple Observers - One Failing Affects Others

**Symptom:**
- When one observer throws, subsequent observers not notified
- Observer order affects which ones receive events

**Root Cause:**
```typescript
// PROBLEMATIC: Early return or break in observer loop
class WorkflowLogger {
  onLog(entry: LogEntry): void {
    for (const observer of this.observers) {
      try {
        observer.onLog?.(entry);
      } catch (error) {
        // WRONG: Returning early prevents other observers from being called
        this.logError('Observer error', { error });
        return; // BUG: exits loop
      }
    }
  }
}
```

**Detection:**
```typescript
// Test from observer-logging.test.ts:
it('should continue notifying other observers after one throws', async () => {
  let observer2Called = false;
  let observer3Called = false;

  const throwingObserver: WorkflowObserver = {
    onLog: () => { throw new Error('Observer 1 failed'); },
    ...
  };

  const workingObserver2: WorkflowObserver = {
    onLog: () => { observer2Called = true; },
    ...
  };

  const workingObserver3: WorkflowObserver = {
    onLog: () => { observer3Called = true; },
    ...
  };

  const workflow = new TestWorkflow();
  workflow.addObserver(throwingObserver);
  workflow.addObserver(workingObserver2);
  workflow.addObserver(workingObserver3);

  await workflow.run();

  // Both working observers should have been called
  expect(observer2Called).toBe(true);
  expect(observer3Called).toBe(true);
});
```

**Fix:**
```typescript
// CORRECT: Continue loop after observer error
class WorkflowLogger {
  onLog(entry: LogEntry): void {
    for (const observer of this.observers) {
      try {
        observer.onLog?.(entry);
      } catch (error) {
        // CORRECT: Log error but CONTINUE loop
        this.node.logs.push({
          level: 'error',
          message: 'Observer onLog error',
          timestamp: Date.now(),
          data: { error },
        });
        // No return - continues to next observer
      }
    }
  }
}
```

**Prevention:**
- Never use early return in observer notification loops
- Test with multiple observers, some throwing
- Verify all observers called even when one fails
- Log all observer failures before returning

---

## 6. Error Code Handling Failures

### Pattern 6.1: Wrong Error Code for Scenario

**Symptom:**
- Generic error codes used instead of specific ones
- `INTERNAL_ERROR` overused for validation failures

**Root Cause:**
```typescript
// PROBLEMATIC: Using generic error codes
const response = createErrorResponse(
  'INTERNAL_ERROR', // WRONG: Should be VALIDATION_FAILED
  'Invalid email address',
  { field: 'email', value: 'not-an-email' }
);
```

**Detection:**
```typescript
// Test checks error code specificity:
expect(response.error.code).toBe('VALIDATION_FAILED'); // FAILS
expect(response.error.code).not.toBe('INTERNAL_ERROR'); // FAILS
```

**Fix:**
```typescript
// CORRECT: Use specific error codes
import { AGENT_ERROR_CODES } from 'groundswell';

// Validation failure
const validationError = createErrorResponse(
  AGENT_ERROR_CODES.VALIDATION_FAILED,
  'Invalid email address',
  { field: 'email', value: 'not-an-email' },
  false // Non-recoverable
);

// API request failure
const apiError = createErrorResponse(
  AGENT_ERROR_CODES.API_REQUEST_FAILED,
  'Network timeout',
  { timeout: 30000 },
  true // Recoverable
);

// Tool execution failure
const toolError = createErrorResponse(
  AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED,
  'Tool not found: database-query',
  { availableTools: ['search', 'calculator'] },
  false // Non-recoverable
);
```

**Prevention:**
- Import and use `AGENT_ERROR_CODES` constants
- Document error code selection in decision matrix
- Test error code specificity
- Never use `INTERNAL_ERROR` for expected failures

---

### Pattern 6.2: Recoverable Flag Mis-set

**Symptom:**
- Non-recoverable errors marked as recoverable (infinite retry loop)
- Recoverable errors marked as non-recoverable (missed retry opportunity)

**Root Cause:**
```typescript
// PROBLEMATIC: Wrong recoverable flag
const badResponse = createErrorResponse(
  AGENT_ERROR_CODES.VALIDATION_FAILED,
  'Invalid email',
  null,
  true // WRONG: Validation errors are NOT recoverable
);

const badResponse2 = createErrorResponse(
  AGENT_ERROR_CODES.API_REQUEST_FAILED,
  'Rate limit exceeded',
  null,
  false // WRONG: Rate limits ARE recoverable (retry after delay)
);
```

**Detection:**
```typescript
// Retry logic test:
function shouldRetry(response: AgentResponse<unknown>): boolean {
  return response.status === 'error' && response.error?.recoverable === true;
}

expect(shouldRetry(validationError)).toBe(false); // FAILS - incorrectly true
expect(shouldRetry(rateLimitError)).toBe(true); // FAILS - incorrectly false
```

**Fix:**
```typescript
// CORRECT: Set recoverable based on error type
const errorRecoverability: Record<string, boolean> = {
  [AGENT_ERROR_CODES.VALIDATION_FAILED]: false,
  [AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT]: false,
  [AGENT_ERROR_CODES.INTERNAL_ERROR]: false,
  [AGENT_ERROR_CODES.EXECUTION_FAILED]: true, // May be recoverable if transient
  [AGENT_ERROR_CODES.API_REQUEST_FAILED]: true,
  [AGENT_ERROR_CODES.TOOL_EXECUTION_FAILED]: true, // Depends on tool error
};

const response = createErrorResponse(
  errorCode,
  message,
  details,
  errorRecoverability[errorCode] ?? false
);
```

**Prevention:**
- Document recoverability criteria for each error code
- Use retry logic tests to verify flag
- Consider tool-specific context for `TOOL_EXECUTION_FAILED`
- Default to non-recoverable for validation/format errors

---

## 7. Integration Test Anti-Patterns

### Pattern 7.1: Testing Implementation Instead of Behavior

**Symptom:**
- Tests mock internal implementation details
- Tests break when implementation changes but behavior doesn't
- Fragile tests that need constant updating

**Root Cause:**
```typescript
// PROBLEMATIC: Testing implementation
it('should call attachChild method', () => {
  const attachChildSpy = vi.spyOn(parent, 'attachChild');
  const child = new Workflow('Child', parent);

  expect(attachChildSpy).toHaveBeenCalledWith(child); // BRITTLE
});

// PROBLEMATIC: Mocking internals
it('should update node.children', () => {
  const child = new Workflow('Child', parent);

  expect(parent.node.children).toContain(child.node); // IMPLEMENTATION DETAIL
});
```

**Fix:**
```typescript
// CORRECT: Test behavior/outcomes
it('should establish parent-child relationship', () => {
  const child = new Workflow('Child', parent);

  // Test PUBLIC API behavior
  expect(child.parent).toBe(parent);
  expect(parent.children).toContain(child);

  // Test bidirectional consistency invariant
  expect(child.node.parent).toBe(parent.node);
  expect(parent.node.children).toContain(child.node);
});

// CORRECT: Test observable effects
it('should notify observers of tree change', () => {
  const events: WorkflowEvent[] = [];
  parent.addObserver({
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  const child = new Workflow('Child', parent);

  expect(events.some(e => e.type === 'childAttached')).toBe(true);
});
```

**Prevention:**
- Test public APIs, not internal methods
- Test invariants and contracts, not implementation
- Use integration tests to verify system behavior
- Unit tests can test implementation, integration tests test behavior

---

### Pattern 7.2: Over-Mocking in Integration Tests

**Symptom:**
- Tests pass but real code fails
- Mocks don't match actual behavior
- False sense of security

**Root Cause:**
```typescript
// PROBLEMATIC: Mocking AgentResponse
it('should handle agent response', async () => {
  const mockResponse: AgentResponse<string> = {
    status: 'success',
    data: 'result',
    error: null,
    metadata: { agentId: 'test', timestamp: Date.now() }
  };

  vi.spyOn(agent, 'prompt').mockResolvedValue(mockResponse);

  const workflow = new TestWorkflow();
  await workflow.run();

  // Test passes but real agent.prompt() might return different structure
});
```

**Fix:**
```typescript
// CORRECT: Use real factory functions in tests
it('should handle agent response', async () => {
  // Use real factory function
  const mockResponse = createSuccessResponse(
    'result',
    { agentId: 'test', timestamp: Date.now() }
  );

  vi.spyOn(agent, 'prompt').mockResolvedValue(mockResponse);

  // OR: Test with real agent (slower but more accurate)
  it('integration: should handle real agent response', async () => {
    // Use simulated agent responses like in examples/07-agent-loops.ts
    const result = await simulateClassification('apple');
    expect(result.category).toBe('fruit');
  });
});
```

**Prevention:**
- Use factory functions (`createSuccessResponse`) in mocks
- Validate mock responses against Zod schemas
- Include real integration tests alongside mocked tests
- Document mock behavior vs real behavior

---

### Pattern 7.3: Not Testing Async Error Paths

**Symptom:**
- Tests only cover happy path
- Error handling code never tested
- Failures discovered in production

**Root Cause:**
```typescript
// PROBLEMATIC: Only testing success
it('should complete workflow', async () => {
  const workflow = new TestWorkflow();
  const result = await workflow.run();

  expect(workflow.status).toBe('completed');
  // Missing: error path tests
});
```

**Fix:**
```typescript
// CORRECT: Test all paths
describe('Workflow execution', () => {
  it('should complete successfully on normal path', async () => {
    const workflow = new SuccessWorkflow();
    await workflow.run();

    expect(workflow.status).toBe('completed');
  });

  it('should handle step errors and set status to failed', async () => {
    const workflow = new FailingWorkflow();
    await expect(workflow.run()).rejects.toThrow();

    expect(workflow.status).toBe('failed');
    expect(workflow.node.logs.some(l => l.level === 'error')).toBe(true);
  });

  it('should propagate child errors to parent', async () => {
    const parent = new ParentWorkflow();
    const child = new FailingWorkflow('child', parent);

    await expect(parent.run()).rejects.toThrow();

    expect(parent.status).toBe('failed');
    expect(child.status).toBe('failed');
  });

  it('should continue after recoverable errors', async () => {
    const workflow = new RetryWorkflow();
    await workflow.run();

    expect(workflow.status).toBe('completed');
    expect(workflow.retryCount).toBeGreaterThan(0);
  });
});
```

**Prevention:**
- Use test coverage tools to identify untested code
- Write error path tests first (TDD)
- Use adversarial test patterns
- Test all three AgentResponse states

---

## 8. Metadata and Tracing Failures

### Pattern 8.1: Missing Request ID in Nested Calls

**Symptom:**
- Cannot trace request through workflow tree
- Logs don't correlate across nested workflows
- Debugging distributed execution impossible

**Root Cause:**
```typescript
// PROBLEMATIC: requestId not propagated
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const response = await child.run();

    // response.metadata.requestId is lost
    return createSuccessResponse(
      response.data,
      {
        agentId: this.id,
        timestamp: Date.now()
        // MISSING: requestId: response.metadata.requestId
      }
    );
  }
}
```

**Fix:**
```typescript
// CORRECT: Preserve requestId through chain
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const childResponse = await child.run();

    if (isSuccess(childResponse)) {
      return createSuccessResponse(
        childResponse.data,
        {
          agentId: this.id,
          timestamp: Date.now(),
          requestId: childResponse.metadata.requestId, // PRESERVE correlation
          duration: childResponse.metadata.duration,   // Preserve timing
        }
      );
    }

    return childResponse;
  }
}
```

**Prevention:**
- Always preserve `requestId` when propagating responses
- Generate `requestId` at entry point and propagate down
- Use `requestId` in all log entries
- Test request tracing in integration tests

---

### Pattern 8.2: Duration Not Accumulated in Nested Workflows

**Symptom:**
- Total duration doesn't include child workflow time
- Performance analysis incomplete
- Parent duration < child duration (impossible)

**Root Cause:**
```typescript
// PROBLEMATIC: Duration doesn't include child execution
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const startTime = Date.now();

    const childResponse = await child.run();

    const duration = Date.now() - startTime; // WRONG: Missing child's duration

    return createSuccessResponse(
      childResponse.data,
      { agentId: this.id, timestamp: Date.now(), duration }
    );
  }
}
```

**Fix:**
```typescript
// CORRECT: Accumulate child durations
class ParentWorkflow extends Workflow {
  async run(): Promise<AgentResponse<string>> {
    const startTime = Date.now();
    let totalChildDuration = 0;

    const childResponse = await child.run();

    if (childResponse.metadata.duration) {
      totalChildDuration += childResponse.metadata.duration;
    }

    const duration = (Date.now() - startTime) + totalChildDuration;

    return createSuccessResponse(
      childResponse.data,
      {
        agentId: this.id,
        timestamp: Date.now(),
        duration // Includes parent overhead + child execution
      }
    );
  }
}
```

**Prevention:**
- Always include child duration in parent total
- Document whether duration is "self" or "cumulative"
- Use nested timing in performance analysis
- Test duration accumulation

---

## 9. Common Test Setup Failures

### Pattern 9.1: Not Clearing Arrays Between Test Phases

**Symptom:**
- Test assertions fail due to stale data
- Events from setup phase counted in assertions
- Flaky tests that depend on execution order

**Root Cause:**
```typescript
// PROBLEMATIC: Events array not cleared
it('should emit event after reparenting', () => {
  const events: WorkflowEvent[] = [];

  parent1.addObserver({ onEvent: (e) => events.push(e), ... });

  // Setup phase generates events
  const child = new Workflow('Child', parent1); // Emits childAttached event

  parent1.detachChild(child);
  parent2.attachChild(child);

  // WRONG: events array still has setup events
  child.setStatus('running');

  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined(); // FAILS - finds setup event instead
});
```

**Fix:**
```typescript
// CORRECT: Clear arrays before test phase
it('should emit event after reparenting', () => {
  const events: WorkflowEvent[] = [];
  parent1.addObserver({ onEvent: (e) => events.push(e), ... });

  // Setup phase
  const child = new Workflow('Child', parent1);
  parent1.detachChild(child);
  parent2.attachChild(child);

  // CLEAR setup events before test phase
  events.length = 0;

  // Test phase
  child.setStatus('running');

  const treeUpdatedEvent = events.find(e => e.type === 'treeUpdated');
  expect(treeUpdatedEvent).toBeDefined(); // PASS - only test phase events
});
```

**Prevention:**
- Always clear arrays between test phases
- Use descriptive variable names: `setupEvents`, `testEvents`
- Comment test phases clearly
- Use `beforeEach` to reset state

---

### Pattern 9.2: Testing Internal State Instead of Public APIs

**Symptom:**
- Tests break when internals refactored
- Testing private properties with `(obj as any).privateProp`
- Brittle tests that couple to implementation

**Root Cause:**
```typescript
// PROBLEMATIC: Testing internal state
it('should update observers array', () => {
  const observer = { onEvent: () => {}, ... };
  parent.addObserver(observer);

  expect((parent as any).observers).toContain(observer); // BRITTLE
});
```

**Fix:**
```typescript
// CORRECT: Test through public API
it('should notify observer of events', () => {
  const events: WorkflowEvent[] = [];
  const observer: WorkflowObserver = {
    onEvent: (e) => events.push(e),
    onLog: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  parent.addObserver(observer);
  parent.emitEvent({ type: 'testEvent' } as any);

  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('testEvent');
});
```

**Prevention:**
- Test behavior, not state
- Use public APIs to verify internal changes
- Avoid `(obj as any)` casts
- Integration tests verify contracts, unit tests verify internals

---

## 10. Summary and Quick Reference

### Top 10 Most Common Failures

| # | Pattern | Frequency | Severity |
|---|---------|-----------|----------|
| 1 | Type guard not used before data access (2.1) | High | High |
| 2 | Wrong status value case (3.2) | High | Medium |
| 3 | Undefined instead of null (3.1) | High | Medium |
| 4 | AgentResponse lost in nested workflows (1.1) | Medium | High |
| 5 | Metadata not propagated (1.2) | Medium | Medium |
| 6 | Circular reference in data (3.4) | Medium | High |
| 7 | Wrong error code used (6.1) | Medium | Medium |
| 8 | Recoverable flag mis-set (6.2) | Medium | Medium |
| 9 | Test arrays not cleared (9.1) | Low | Medium |
| 10 | Not testing error paths (7.3) | Low | High |

### Prevention Checklist

**Before Creating AgentResponse:**
- [ ] Using factory function (`createSuccessResponse`/`createErrorResponse`)
- [ ] Data is JSON-serializable (test with `JSON.parse(JSON.stringify())`)
- [ ] Error code matches scenario (using `AGENT_ERROR_CODES`)
- [ ] `recoverable` flag set correctly
- [ ] `metadata.requestId` preserved from parent
- [ ] `metadata.agentId` set to current workflow

**Before Accessing Response Data:**
- [ ] Type guard used (`isSuccess`, `isError`, `isPartial`)
- [ ] Data captured before async boundaries
- [ ] Schema validation passed (if using Zod)

**Before Writing Tests:**
- [ ] Test all three response states (success, error, partial)
- [ ] Test error paths, not just happy path
- [ ] Clear arrays between test phases
- [ ] Test public APIs, not private state
- [ ] Use factory functions in mocks

**In Workflow Error Handling:**
- [ ] Try-catch in `run()` method
- [ ] Status set to `'failed'` before re-throw
- [ ] Parent workflow handles child errors
- [ ] Errors logged to `workflow.node.logs`

### Recommended Test Patterns

**Template for AgentResponse Integration Test:**

```typescript
describe('WorkflowName Integration', () => {
  describe('Success path', () => {
    it('should return success response with valid data', async () => {
      const workflow = new WorkflowName('test');
      const result = await workflow.run();

      expect(isSuccess(result)).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(result.metadata.agentId).toBe(workflow.id);
    });
  });

  describe('Error path', () => {
    it('should return error response on failure', async () => {
      const workflow = new FailingWorkflowName('test');
      const result = await workflow.run();

      expect(isError(result)).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('EXPECTED_ERROR_CODE');
    });
  });

  describe('Partial path', () => {
    it('should handle partial responses', async () => {
      const workflow = new StreamingWorkflowName('test');
      const result = await workflow.run();

      expect(isPartial(result)).toBe(true);
      expect(result.data.partialContent).toBeDefined();
    });
  });

  describe('Nested workflows', () => {
    it('should propagate child responses correctly', async () => {
      const parent = new ParentWorkflow('parent');
      const result = await parent.run();

      expect(isSuccess(result)).toBe(true);
      expect(result.metadata.requestId).toBeDefined(); // Correlation preserved
    });
  });
});
```

---

## Related Documentation

- **PRD 6.1-6.5**: AgentResponse specification
- **PRD 6.6**: Error code requirements
- **PRD 12.2**: Bidirectional tree consistency
- **Agent Response Migration Guide**: `/plan/002_6761e4b84fd1/P1M4T1S1/research/agent-response-migration-guide.md`
- **Integration Test Examples**: `/home/dustin/projects/groundswell/src/__tests__/integration/`

---

## Appendix: Code Locations Referenced

- **Integration Tests**: `/home/dustin/projects/groundswell/src/__tests__/integration/`
- **AgentResponse Types**: `/home/dustin/projects/groundswell/src/types/agent.ts`
- **Workflow Core**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Agent Implementation**: `/home/dustin/projects/groundswell/src/core/agent.ts`
- **Test Examples**: `/home/dustin/projects/groundswell/examples/examples/`

---

**End of Catalog**

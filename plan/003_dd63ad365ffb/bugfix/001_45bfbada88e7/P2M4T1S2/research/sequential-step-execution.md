# Sequential Step Execution Flow Research

### Overview

This research note provides a comprehensive analysis of the sequential step execution flow in the Workflow class, specifically focusing on where and how errors are currently handled. This analysis is critical for implementing workflow-level error collection in P2.M4.T1.S2.

### 1. Sequential Step Execution Loop Location

**Class-Based Workflows** (`src/core/workflow.ts`, lines 805-814):
- The `run()` method is overridden in subclasses
- Sequential execution happens in the overridden method
- No built-in loop - manual step-by-step execution

**Functional Workflows** (`src/core/workflow-context.ts`, lines 107-268):
- Sequential execution via `ctx.step()` method
- For-loop for reflection attempts, not for sequential steps
- Each step is explicitly awaited in sequence

### 2. Individual Step Execution Method

**Class-Based**: Direct method calls
```typescript
await this.loadData();     // Direct call
await this.processData();  // Direct call
await this.saveResults();   // Direct call
```

**Functional**: Via context (`ctx.step()`)
```typescript
const result = await ctx.step('step1', async () => { /* ... */ });
const result2 = await ctx.step('step2', async () => { /* ... */ });
```

### 3. Try-Catch Block Location

**Class-Based**: At workflow level (`src/core/workflow.ts`, lines 844-862)
- Single try-catch around entire workflow execution
- Error thrown immediately after setting status to 'failed'

**Functional**: At step level (`src/core/workflow-context.ts`, lines 207-267)
- Try-catch inside each step execution
- Reflection retry logic before final throw

### 4. Error Propagation Behavior

**Sequential Steps**: Errors are thrown immediately - NO collection
- Execution stops completely on first failure
- No partial results preserved
- Subsequent steps never executed

**Concurrent Steps** (`@Task` decorator): Errors are collected
- `Promise.allSettled()` collects all results
- Error merging strategy available
- Can continue with successful tasks

### 5. Error Collection Mechanisms

**Sequential**: NONE - immediate throw pattern
```typescript
try {
  await step1();
  await step2();
  await step3(); // Fails → throws, stops everything
} catch (error) {
  setStatus('failed');
  throw error; // No collection
}
```

**Concurrent**: YES via Promise.allSettled
```typescript
const results = await Promise.allSettled(tasks);
const rejected = results.filter(r => r.status === 'rejected');
if (rejected.length > 0) {
  // Handle collected errors
}
```

### 6. Key Differences from Concurrent Execution

| Aspect | Sequential | Concurrent |
|--------|------------|------------|
| Error Handling | Immediate throw | Collection + optional merge |
| Failure Impact | Stops all execution | Continues with successful tasks |
| Retry Mechanism | Manual or reflection | Manual only |
| State Complexity | Simple linear state | Complex concurrent state |
| Event Granularity | Workflow-level | Per-step + workflow-level |

### 7. Control Flow on Step Failure

**Class-Based Sequential Flow**:
1. `await failingStep()` throws error
2. Caught in workflow try-catch (line 844)
3. `setStatus('failed')` (line 845)
4. Error event emitted (lines 847-859)
5. Error re-thrown (line 861)
6. Execution stops completely

**Functional Sequential Flow**:
1. `ctx.step()` catches error (line 207)
2. Step node marked 'failed' (line 211)
3. Step error event emitted (lines 214-225)
4. Reflection check (line 244)
5. May retry via reflection (lines 249-261)
6. Final throw if no retry (line 245/260)

### 8. State Variables During Execution

**Class-Based**:
- `status: WorkflowStatus` (line 73)
- `node: WorkflowNode` (line 79)
- `logger: WorkflowLogger` (line 76)

**Functional**:
- `workflow: WorkflowLike` (line 77)
- `reflectionManager: ReflectionManager` (line 79)
- `autoValidateResponses: boolean` (line 80)

**Step Context**:
- `executionContext: AgentExecutionContext` (lines 140-148)
- `stepNode: WorkflowNode` (lines 118-127)

### 9. Key Finding: No Error Collection in Sequential Execution

The critical finding is that **sequential execution has no error collection mechanism**. When a step fails:
- Execution stops immediately
- Error is thrown without collection
- No partial results preserved
- Subsequent steps never executed

This is fundamentally different from concurrent execution which can collect and handle multiple errors simultaneously.

### 10. Implementation Implications for P2.M4.T1.S2

To implement workflow-level error collection for sequential steps, we need to:

1. **Add error collection state**: `collectedErrors: WorkflowError[] = []`
2. **Modify step execution**: Wrap each step in try-catch that collects instead of throws
3. **Check merge strategy**: Only collect when `config.errorMergeStrategy?.enabled === true`
4. **Continue execution**: Allow subsequent steps to run when errors are collected
5. **Merge at end**: Call `mergeWorkflowErrors()` after all steps complete
6. **Emit event**: Emit error event with merged error before throwing
7. **Backward compatibility**: When merge strategy is disabled, throw immediately (current behavior)

### 11. Exact Code Locations

- **Class-based workflow run()**: `src/core/workflow.ts:805-814`
- **Class-based error handling**: `src/core/workflow.ts:844-862`
- **Functional step execution**: `src/core/workflow-context.ts:107-268`
- **Functional error handling**: `src/core/workflow-context.ts:207-267`
- **@Task concurrent execution**: `src/decorators/task.ts:106-145`
- **mergeWorkflowErrors utility**: `src/utils/workflow-error-utils.ts`

### Summary

Sequential step execution currently throws errors immediately without collection. To implement workflow-level error merge (P2.M4.T1.S2), we need to modify the execution flow to optionally collect errors and continue execution when `errorMergeStrategy.enabled` is true, following the pattern established by the @Task decorator for concurrent execution.

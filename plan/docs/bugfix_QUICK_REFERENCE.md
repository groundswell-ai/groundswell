# Bug Fix Implementation - Quick Reference

## 🚀 Quick Start

```bash
# View the backlog
cat bug_fix_tasks.json | jq '.backlog[0].milestones[] | {title, status}'

# Start first task
# Task: P1.M1.T1.S1 - Add getObservedState import to workflow.ts
```

## 📋 Task Structure

Every subtask has:
- **ID**: Unique identifier (e.g., `P1.M1.T1.S1`)
- **Title**: What to do
- **SP**: Story points (0.5, 1, or 2)
- **Dependencies**: Must complete these first
- **context_scope**: Complete implementation contract

## 🔍 Reading a Subtask Contract

```json
"context_scope": "CONTRACT DEFINITION:\n1. RESEARCH NOTE: ... \n2. INPUT: ... \n3. LOGIC: ... \n4. OUTPUT: ..."
```

**Example**: P1.M1.T1.S2
```
INPUT: getObservedState function from dependency P1.M1.T1.S1
LOGIC: Replace 'state: {}' with 'state: getObservedState(this)'
OUTPUT: Updated error object with actual captured state
```

## 📁 File Locations

| Component | File |
|-----------|------|
| Main Workflow | `src/core/workflow.ts` |
| Workflow Context | `src/core/workflow-context.ts` |
| @Step Decorator | `src/decorators/step.ts` |
| @Task Decorator | `src/decorators/task.ts` |
| Observed State | `src/decorators/observed-state.ts` |
| Unit Tests | `src/__tests__/unit/*.test.ts` |
| Integration Tests | `src/__tests__/integration/*.test.ts` |

## 🔑 Reference Implementations

### Error Handling (Follow This Pattern)
```typescript
// ✅ CORRECT - From src/decorators/step.ts:109-134
catch (err: unknown) {
  const snap = getObservedState(this as object);
  const workflowError: WorkflowError = {
    state: snap,                        // ✅ Captured
    logs: [...wf.node.logs],           // ✅ Captured
    // ... other fields
  };
  wf.emitEvent({ type: 'error', node: wf.node, error: workflowError });
  throw workflowError;
}
```

### Event Emission
```typescript
// ✅ CORRECT - From src/decorators/step.ts:94-101
if (opts.trackTiming !== false) {
  wf.emitEvent({
    type: 'stepEnd',
    node: wf.node,
    step: stepName,
    duration,
  });
}
```

## 📊 Milestone Overview

### M1: Error Handling & State Capture (10 SP)
- Fix empty `state: {}` → `state: getObservedState(this)`
- Fix empty `logs: []` → `logs: [...this.node.logs]`
- Files: `workflow.ts`, `workflow-context.ts`

### M2: Tree Structure & Events (12 SP)
- Add cycle detection to `getRoot()`
- Emit `treeUpdated` events in `setStatus()`
- Prevent duplicate attachments
- File: `workflow.ts`

### M3: Documentation (4 SP)
- Document `trackTiming` default (true)
- Document `@Task` lenient validation
- Files: JSDoc comments, README.md

## ⚠️ Common Pitfalls

1. **Forgetting imports**: Add `import { getObservedState }` before using it
2. **Wrong context**: Use `this.workflow` in WorkflowContext, not `this`
3. **Missing spread**: Use `[...this.node.logs]` to copy array
4. **Type assertions**: Add `as LogEntry[]` for type safety
5. **Event emission**: Always emit events after state changes

## ✅ Definition of Done

- [ ] Code implements `context_scope` LOGIC exactly
- [ ] Tests pass (new test written)
- [ ] TypeScript compiles (no errors)
- [ ] No existing tests broken
- [ ] Follows patterns from system_context.md

## 🆘 Getting Help

| Question | Answer Location |
|----------|-----------------|
| What's the architecture? | `plan_bugfix/architecture/system_context.md` |
| Why this fix? | `plan_bugfix/architecture/GAP_ANALYSIS_SUMMARY.md` |
| Full details? | `plan_bugfix/architecture/ANALYSIS_PRD_VS_IMPLEMENTATION.md` |
| What's the contract? | `bug_fix_tasks.json` - subtask `context_scope` |

## 📈 Progress Tracking

```bash
# Count completed subtasks
cat bug_fix_tasks.json | jq '[.backlog[].milestones[].tasks[].subtasks[] | select(.status == "Complete")] | length'

# View pending subtasks
cat bug_fix_tasks.json | jq '.backlog[].milestones[].tasks[].subtasks[] | select(.status == "Planned") | {id, title}'
```

## 🎯 First 5 Subtasks

1. **P1.M1.T1.S1** (1 SP) - Add getObservedState import
2. **P1.M1.T1.S2** (1 SP) - Fix state capture in runFunctional()
3. **P1.M1.T1.S3** (1 SP) - Fix logs capture in runFunctional()
4. **P1.M1.T1.S4** (2 SP) - Write test for functional workflow errors
5. **P1.M1.T2.S1** (1 SP) - Add import to workflow-context.ts

**Total**: 6 SP to complete Milestone 1.1, Task 1

---

**Pro Tip**: Always read the `context_scope` before starting. It tells you exactly what to implement!

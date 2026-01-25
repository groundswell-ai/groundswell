# Example Scripts Research Summary

## Overview
This document summarizes research on the 11 example scripts in the Groundswell project for PRP P1.M4.T3.S1.

## Example Scripts Inventory

### 1. 01-basic-workflow.ts
- **Purpose**: Basic workflow concepts, WorkflowLogger, status management
- **Uses Agent.prompt()**: No
- **Key Features**: DataProcessingWorkflow class, loadData/processData/saveResults
- **Expected Output**: Status changes, tree visualization, logs, statistics

### 2. 02-decorator-options.ts
- **Purpose**: All @Step, @Task, @ObservedState options
- **Uses Agent.prompt()**: No
- **Key Features**: Decorator configuration demonstration
- **Expected Output**: Step timing, state snapshots, logging outputs

### 3. 03-parent-child.ts
- **Purpose**: Hierarchical workflow structures
- **Uses Agent.prompt()**: No
- **Key Features**: Multi-level hierarchies, @Task decorator
- **Expected Output**: Tree structure with parent-child relationships

### 4. 04-observers-debugger.ts
- **Purpose**: Real-time monitoring and debugging
- **Uses Agent.prompt()**: No
- **Key Features**: Custom observers, MetricsObserver, ConsoleObserver
- **Expected Output**: Real-time event logging, statistics

### 5. 05-error-handling.ts
- **Purpose**: Error management patterns
- **Uses Agent.prompt()**: No
- **Key Features**: WorkflowError structure, retry patterns
- **Expected Output**: Error messages, state snapshots, retry attempts

### 6. 06-concurrent-tasks.ts
- **Purpose**: Parallel execution patterns
- **Uses Agent.prompt()**: No
- **Key Features**: @Task({ concurrent: true }), Promise.all patterns
- **Expected Output**: Sequential vs concurrent timing comparison

### 7. 07-agent-loops.ts
- **Purpose**: Agent.prompt() within workflow loops
- **Uses Agent.prompt()**: Simulated only (simulateClassification, simulateTextAnalysis, simulateNumberAnalysis)
- **Key Features**: Loop processing, multiple agents, cache tracking
- **Expected Output**: Classification results, timing, cache metrics
- **Status**: Uses simulated responses, not actual Agent.prompt() calls

### 8. 08-sdk-features.ts
- **Purpose**: SDK features integration
- **Uses Agent.prompt()**: Unknown (requires reading file)
- **Key Features**: Tools, MCPs, hooks, skills
- **Expected Output**: Tool invocation results

### 9. 09-reflection.ts
- **Purpose**: Multi-level reflection
- **Uses Agent.prompt()**: Unknown (requires reading file)
- **Key Features**: Prompt-level, agent-level, workflow-level reflection
- **Expected Output**: Reflection events, error recovery

### 10. 10-introspection.ts
- **Purpose**: Agent self-awareness and hierarchy navigation
- **Uses Agent.prompt()**: No (uses mock contexts and handlers)
- **Key Features**: INTROSPECTION_TOOLS, 6 introspection handlers
- **Expected Output**: Tool results, hierarchy information, cache status
- **AgentResponse Pattern**: Lines 554-562 show correct AgentResponse usage pattern with status checking

### 11. 11-reparenting-workflows.ts
- **Purpose**: Workflow reparenting with detach-then-attach pattern
- **Uses Agent.prompt()**: Unknown (requires reading file)
- **Key Features**: Reparenting, dual-tree synchronization
- **Expected Output**: Tree structure before/after reparenting

## Exit Code Pattern Issue

**CRITICAL FINDING**: All example scripts have the same exit code issue at the bottom:

```typescript
// Current (WRONG - exits with 0 even on error)
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicWorkflowExample().catch(console.error);
}
```

This should be:
```typescript
// Correct (exits with 1 on error)
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicWorkflowExample()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
```

However, this is OUT OF SCOPE for P1.M4.T3.S1. The task is to **run and verify** the examples, not to modify them.

## NPM Scripts

All example scripts are configured in package.json (lines 37-48):
- `start:all` - Runs all examples via examples/index.ts
- `start:basic` - tsx examples/examples/01-basic-workflow.ts
- `start:decorators` - tsx examples/examples/02-decorator-options.ts
- `start:parent-child` - tsx examples/examples/03-parent-child.ts
- `start:observers` - tsx examples/examples/04-observers-debugger.ts
- `start:errors` - tsx examples/examples/05-error-handling.ts
- `start:concurrent` - tsx examples/examples/06-concurrent-tasks.ts
- `start:agent-loops` - tsx examples/examples/07-agent-loops.ts
- `start:sdk-features` - tsx examples/examples/08-sdk-features.ts
- `start:reflection` - tsx examples/examples/09-reflection.ts
- `start:introspection` - tsx examples/examples/10-introspection.ts
- `start:reparenting` - tsx examples/examples/11-reparenting-workflows.ts

## Expected Console Output Patterns

### Success Output
- Status: completed/failed
- Results with timing information
- Tree visualization with ASCII symbols (○ ◐ ✓ ✗ ⊘)
- Statistics (totalNodes, completedSteps, etc.)

### Error Output
- Error messages with WorkflowError structure
- State snapshots at error time
- Retry attempt counts
- Stack traces

### AgentResponse Output Pattern (from 10-introspection.ts)
```typescript
if (response.status === 'error') {
  console.error(`[${response.error.code}] Analysis failed: ${response.error.message}`);
  throw new Error(response.error.message);
}

// Type narrowing: response.data is the schema type when status is 'success'
const analysis = response.data;
console.log('Position:', analysis.position);
console.log('Depth:', analysis.depth);
```

## Verification Approach

1. **Manual Execution**: Run each script individually via npm
2. **Console Output Verification**: Check for expected output patterns
3. **Exit Code**: Verify scripts complete without throwing (though exit code 0 issue exists)
4. **AgentResponse Usage**: Verify proper status checking pattern (for scripts that use it)
5. **No Runtime Errors**: Ensure scripts execute without uncaught exceptions

## Files Requiring Further Analysis

- 08-sdk-features.ts
- 09-reflection.ts
- 11-reparenting-workflows.ts

These files were not fully analyzed in this research phase.

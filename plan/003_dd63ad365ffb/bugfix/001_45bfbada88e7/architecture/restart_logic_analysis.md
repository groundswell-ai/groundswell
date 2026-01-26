# Restart Logic Analysis - Critical Gap

## PRD Requirement (Section 11)

### Expected Behavior
> "Restart logic handled at correct parent level"
> "A parent step decides whether restart is needed by analyzing:
> - all captured WorkflowErrors
> - descendant state snapshots
> - logs from failing nodes"
>
> "Parent step may:
> - Retry the step
> - Abort the workflow
> - Rebuild the plan and continue"
>
> "Restartability is opt-in at the step method level; not global"

### Key Requirements
1. **Parent-Driven**: Parent workflow analyzes child errors and decides
2. **State Restoration**: Restore workflow state from snapshots
3. **Opt-In**: Steps must be marked as restartable
4. **Decision Framework**: Parent chooses retry, abort, or rebuild

## Current Implementation

### What Exists: Reflection-Based Retry

**File**: `src/core/reflection.ts`, `src/core/workflow-context.ts`

```typescript
interface ReflectionConfig {
  enabled: boolean;
  maxAttempts: number;
  retryDelayMs?: number;
}

// Current retry mechanism
class ReflectionManager {
  async shouldRetry(error: WorkflowError): Promise<boolean> {
    // AI-powered error analysis
    // Determines if error is transient vs fundamental
    // NOT traditional restart logic
  }
}
```

### What's Missing: Traditional Restart Logic

**No implementation exists for**:
1. Step-level `restartable` option in `@Step` decorator
2. `restartStep(stepName, options)` method in Workflow base class
3. Error analysis utility for restart decisions (separate from reflection)
4. Workflow state restoration from snapshots
5. Retry counters and max retry limits
6. Parent-level restart decision framework

## Architecture for Implementation

### 1. Step-Level Restart Configuration

**File**: `src/decorators/step.ts`

**Current State**:
```typescript
export interface StepOptions {
  trackTiming?: boolean;
  redact?: boolean;
  onError?: ErrorHandler;
  // NO restartable option
}
```

**Required Addition**:
```typescript
export interface StepOptions {
  trackTiming?: boolean;
  redact?: boolean;
  onError?: ErrorHandler;

  // NEW: Restart configuration
  restartable?: boolean;              // Default: false
  maxRetries?: number;                // Default: 3
  retryDelayMs?: number;              // Default: 1000
  retryOn?: ErrorCriterion[];         // Conditional retry
}

type ErrorCriterion =
  | { code: string }                  // Retry on specific error code
  | { recoverable: boolean }          // Retry on recoverable errors
  | ((error: WorkflowError) => boolean); // Custom predicate
```

### 2. Restart Method in Workflow Base Class

**File**: `src/core/workflow.ts`

**Required Addition**:
```typescript
class Workflow {
  // NEW: Restart a specific step
  async restartStep(
    stepName: string,
    options?: {
      retryCount?: number;          // Current retry attempt
      maxRetries?: number;          // Maximum retries
      stateOverride?: SerializedWorkflowState; // Override state
    }
  ): Promise<unknown> {
    // 1. Find step metadata
    const stepMeta = this.stepMetadata.get(stepName);
    if (!stepMeta || !stepMeta.options.restartable) {
      throw new Error(`Step ${stepName} is not restartable`);
    }

    // 2. Restore state from snapshot
    const snapshot = this.snapshotState();
    const state = options?.stateOverride || snapshot;

    // 3. Increment retry counter
    const retryCount = (options?.retryCount || 0) + 1;
    if (retryCount > (options?.maxRetries ?? stepMeta.options.maxRetries ?? 3)) {
      throw new WorkflowError(
        `Max retries exceeded for step ${stepName}`,
        { retryCount, lastError: state.lastError }
      );
    }

    // 4. Re-execute step with restored state
    const stepFn = this[stepName];
    return await stepFn.call(this, { retryCount, restoredState: state });
  }

  // NEW: Analyze error and decide restart action
  analyzeError(error: WorkflowError): 'retry' | 'abort' | 'rebuild' {
    // Check if error is recoverable
    if (!error.original.recoverable) {
      return 'abort';
    }

    // Check if step is restartable
    const stepName = error.stepName;
    const stepMeta = this.stepMetadata.get(stepName);
    if (!stepMeta?.options.restartable) {
      return 'abort';
    }

    // Check retry criteria
    const criteria = stepMeta.options.retryOn || [];
    const shouldRetry = criteria.some(criterion => {
      if (typeof criterion === 'function') {
        return criterion(error);
      }
      if ('code' in criterion) {
        return error.code === criterion.code;
      }
      if ('recoverable' in criterion) {
        return error.recoverable === criterion.recoverable;
      }
      return false;
    });

    return shouldRetry ? 'retry' : 'abort';
  }
}
```

### 3. Error Analysis Utility

**File**: `src/utils/restart-analysis.ts` (NEW)

**Required Implementation**:
```typescript
export interface RestartAnalysis {
  shouldRestart: boolean;
  reason: string;
  suggestedAction: 'retry' | 'abort' | 'rebuild';
  estimatedSuccessProbability: number; // 0-1
}

export function analyzeErrorForRestart(
  error: WorkflowError,
  stepOptions?: StepOptions
): RestartAnalysis {
  // 1. Check error recoverability
  if (!error.recoverable) {
    return {
      shouldRestart: false,
      reason: 'Error is not recoverable',
      suggestedAction: 'abort',
      estimatedSuccessProbability: 0,
    };
  }

  // 2. Check error type
  const transientErrors = [
    'TIMEOUT',
    'RATE_LIMIT',
    'NETWORK_ERROR',
    'SERVICE_UNAVAILABLE',
  ];

  if (transientErrors.includes(error.code)) {
    return {
      shouldRestart: true,
      reason: 'Transient error detected',
      suggestedAction: 'retry',
      estimatedSuccessProbability: 0.7,
    };
  }

  // 3. Check custom criteria
  if (stepOptions?.retryOn) {
    const matchesCriteria = stepOptions.retryOn.some(criterion => {
      if (typeof criterion === 'function') {
        return criterion(error);
      }
      if ('code' in criterion) {
        return error.code === criterion.code;
      }
      return false;
    });

    if (matchesCriteria) {
      return {
        shouldRestart: true,
        reason: 'Error matches retry criteria',
        suggestedAction: 'retry',
        estimatedSuccessProbability: 0.5,
      };
    }
  }

  // 4. Default: don't restart
  return {
    shouldRestart: false,
    reason: 'Error does not meet restart criteria',
    suggestedAction: 'abort',
    estimatedSuccessProbability: 0,
  };
}
```

### 4. Step Decorator Modification

**File**: `src/decorators/step.ts`

**Current Error Handling**:
```typescript
try {
  const result = await originalMethod.apply(this, args);
  // ... emit events, update state
  return result;
} catch (error) {
  const workflowError = createWorkflowError(error, this, stepName);
  // Emit error event
  this.emit('error', workflowError);
  // Re-throw - NO restart logic
  throw workflowError;
}
```

**Required Modification**:
```typescript
try {
  let retryCount = 0;
  let lastError: WorkflowError | null = null;

  while (retryCount <= (opts.maxRetries ?? 3)) {
    try {
      const result = await originalMethod.apply(this, args);
      // ... emit events, update state
      return result;
    } catch (error) {
      lastError = createWorkflowError(error, this, stepName);

      // Check if step is restartable
      if (!opts.restartable || retryCount >= (opts.maxRetries ?? 3)) {
        this.emit('error', lastError);
        throw lastError;
      }

      // Analyze error for restart
      const analysis = analyzeErrorForRestart(lastError, opts);

      if (!analysis.shouldRestart) {
        this.emit('error', lastError);
        throw lastError;
      }

      // Emit retry event
      this.emit('stepRetry', {
        stepName,
        retryCount: retryCount + 1,
        analysis,
        error: lastError,
      });

      // Wait before retry
      if (opts.retryDelayMs) {
        await delay(opts.retryDelayMs);
      }

      retryCount++;
    }
  }

  // Max retries exceeded
  throw lastError;
} catch (error) {
  this.emit('error', error);
  throw error;
}
```

## Implementation Complexity

### Phased Approach

**Phase 1: Basic Restart** (1-2 weeks)
1. Add `restartable` option to `@Step` decorator
2. Implement simple retry loop in decorator
3. Add `retryDelayMs` and `maxRetries` options
4. Emit `stepRetry` events

**Phase 2: Error Analysis** (1 week)
1. Create `analyzeErrorForRestart()` utility
2. Add `retryOn` criteria support
3. Implement transient error detection
4. Add success probability estimation

**Phase 3: Parent-Level Decisions** (1-2 weeks)
1. Add `restartStep()` method to Workflow base class
2. Implement state restoration from snapshots
3. Add `analyzeError()` method for parent workflows
4. Support parent-driven restart decisions

**Phase 4: Advanced Features** (1-2 weeks)
1. Add state override capabilities
2. Implement "rebuild plan" option
3. Add exponential backoff
4. Implement circuit breaker pattern

**Total Effort**: 4-7 weeks for full implementation

## Testing Requirements

### Unit Tests
- `src/__tests__/unit/restart-analysis.test.ts` (NEW)
- `src/__tests__/unit/decorators/step-restart.test.ts` (EXTEND)
- `src/__tests__/unit/workflow-restart.test.ts` (NEW)

### Integration Tests
- `src/__tests__/integration/restart-scenarios.test.ts` (NEW)
- `src/__tests__/integration/parent-restart-decisions.test.ts` (NEW)

### Adversarial Tests
- `src/__tests__/adversarial/restart-edge-cases.test.ts` (NEW)
- Test max retry limits
- Test infinite retry prevention
- Test state restoration failures

## Interaction with Existing Systems

### With Reflection System
- **Reflection**: AI-powered error analysis and prompt revision
- **Restart**: Traditional retry with state restoration
- **Relationship**: Complementary, not redundant
- **Recommendation**: Keep both systems separate

### With Error Merge Strategy
- **Error Merge**: Aggregates concurrent task failures
- **Restart**: Retries individual failed steps
- **Relationship**: Independent features
- **Integration**: Restart can use merged error context

### With State Snapshots
- **Snapshots**: Capture workflow state at specific points
- **Restart**: Restore state from snapshots
- **Relationship**: Restart depends on snapshots
- **Requirement**: Snapshots must be serializable

## Risks and Mitigations

### Risk 1: Infinite Retry Loops
**Mitigation**: Enforce max retry limits, add circuit breaker

### Risk 2: State Restoration Failures
**Mitigation**: Validate snapshot schema, handle deserialization errors

### Risk 3: Parent-Child Deadlocks
**Mitigation**: Detect circular restart dependencies, timeout mechanism

### Risk 4: Performance Impact
**Mitigation**: Make restart opt-in, add monitoring/metrics

## Conclusion

**Critical Gap**: No traditional restart logic exists (only reflection-based retry)
**PRD Compliance**: Major violation of Section 11 requirements
**Implementation Effort**: 4-7 weeks for full feature set
**Priority**: CRITICAL - blocks release
**Recommendation**: Implement phased approach starting with basic restart

**Key Files to Modify**:
- `src/decorators/step.ts` - Add restartable option
- `src/core/workflow.ts` - Add restartStep() method
- `src/utils/restart-analysis.ts` - NEW: Error analysis utility
- `src/types/decorators.ts` - Extend StepOptions interface

# StepOptions Interface Analysis for PRP

## Overview
This analysis documents the StepOptions interface extension with restart configuration properties as specified in PRP P1.M1.T1.S1.

## StepOptions Interface Structure

### Current Complete Interface Definition

```typescript
// Located in: src/types/decorators.ts
import type { ErrorMergeStrategy } from './error-strategy.js';
import type { WorkflowError } from './error.js';
import type { ErrorCriterion } from './restart.js';

/**
 * Configuration options for @Step decorator
 */
export interface StepOptions {
  // Original StepOptions Fields (Backward Compatible)
  /** Custom step name (defaults to method name) */
  name?: string;
  /** If true, capture state snapshot after step completion */
  snapshotState?: boolean;
  /** Track and emit step duration (default: true) */
  trackTiming?: boolean;
  /** If true, log message at step start */
  logStart?: boolean;
  /** If true, log message at step end */
  logFinish?: boolean;
  
  // Restart Configuration Properties (New)
  /** If true, step can be restarted on failure (default: false) */
  restartable?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Error criteria that trigger retry attempts (default: all errors if restartable) */
  retryOn?: ErrorCriterion[];
}
```

### Restart Configuration Properties Added

Four new optional properties were added to enable step restart functionality:

1. **`restartable?: boolean`**
   - **Purpose**: Enables step-level restart capability
   - **Default**: `false`
   - **Behavior**: When `true`, the step can be restarted on failure

2. **`maxRetries?: number`**
   - **Purpose**: Limits the number of retry attempts
   - **Default**: `3`
   - **Behavior**: Maximum number of times a restartable step can be retried

3. **`retryDelayMs?: number`**
   - **Purpose**: Configures delay between retry attempts
   - **Default**: `1000` (1 second)
   - **Behavior**: Milliseconds to wait before retrying a failed step

4. **`retryOn?: ErrorCriterion[]`**
   - **Purpose**: Defines which errors should trigger retries
   - **Default**: `undefined` (all errors if restartable)
   - **Behavior**: Array of error criteria that determine retry eligibility

## ErrorCriterion Type Definition

```typescript
// Located in: src/types/restart.ts
import type { WorkflowError } from './error.js';

/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. **By error code** - Exact string match or regex pattern matching
 * 2. **By recoverable flag** - Match recoverable vs non-recoverable errors
 * 3. **Custom predicate** - Function for complex matching logic
 *
 * @example Match by exact error code
 * ```ts
 * const criterion: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };
 * ```
 *
 * @example Match by regex pattern
 * ```ts
 * const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };
 * ```
 *
 * @example Match by recoverable flag
 * ```ts
 * const criterion: ErrorCriterion = { recoverable: true };
 * ```
 *
 * @example Custom predicate with complex logic
 * ```ts
 * const criterion: ErrorCriterion = (error) => {
 *   const isTemporary = error.message.includes('temporary');
 *   const isTimeout = error.code === 'TIMEOUT';
 *   const hasRetryableStatus = error.original?.status >= 500;
 *   return isTemporary || isTimeout || hasRetryableStatus;
 * };
 * ```
 */
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code (string or regex)
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate function (must be last)
```

## Usage Examples in Codebase

### Example 1: Basic Restartable Step
```typescript
@Step({ restartable: true })
async retryableStep() { /* ... */ }
```

### Example 2: Restartable Step with Custom Retry Count
```typescript
@Step({ restartable: true, maxRetries: 5 })
async configurableRetryStep() { /* ... */ }
```

### Example 3: Restartable Step with Delay
```typescript
@Step({
  restartable: true,
  retryDelayMs: 2000
})
async delayedRetryStep() { /* ... */ }
```

### Example 4: Conditional Restart Based on Error Type
```typescript
@Step({
  restartable: true,
  retryOn: [
    { code: 'RATE_LIMIT_EXCEEDED' },
    { recoverable: true },
    (error) => error.message.includes('temporary')
  ]
})
async conditionalRetryStep() { /* ... */ }
```

### Example 5: Complete Configuration
```typescript
@Step({
  restartable: true,
  maxRetries: 2,
  retryDelayMs: 100,
  retryOn: [
    { code: /TRANSIENT_ERROR|TIMEOUT/ },
    { recoverable: true }
  ]
})
async fullyConfiguredStep() { /* ... */ }
```

### Example from Integration Test
```typescript
@Step({ restartable: true, maxRetries: 0, retryOn: [{ code: /TRANSIENT_ERROR/ }] })
async flakyOperation() {
  this.attemptCount++;
  this.lastError = `Error on attempt ${this.attemptCount}`;
  this.stepName = 'flakyOperation';
  throw new Error(this.lastError);
}
```

## Integration with WorkflowError

The ErrorCriterion type integrates with the WorkflowError interface:

```typescript
// Located in: src/types/error.ts
export interface WorkflowError {
  message: string;
  code?: string;
  original?: Error;
  recoverable?: boolean;
  timestamp?: Date;
}
```

This integration allows restart decisions to be based on:
- Exact error codes (string comparison or regex matching)
- Recoverable flag (boolean indicating error recoverability)
- Custom error analysis (complex predicates examining error properties)

## Key Implementation Details

1. **Discriminated Union Ordering**: Function types must come last in the ErrorCriterion union for proper TypeScript type narrowing.

2. **Backward Compatibility**: All new properties are optional, ensuring existing code continues to work.

3. **Default Values**: Defaults are documented in JSDoc comments rather than TypeScript defaults, following codebase conventions.

4. **Import Pattern**: ErrorCriterion is imported from `./restart.js` and re-exported from `src/types/index.js`.

5. **Runtime Behavior**: The interface defines the configuration but runtime implementation is handled by the @Step decorator and workflow engine.

## File Locations

- **StepOptions Interface**: `/home/dustin/projects/groundswell/src/types/decorators.ts`
- **ErrorCriterion Type**: `/home/dustin/projects/groundswell/src/types/restart.ts`
- **WorkflowError Interface**: `/home/dustin/projects/groundswell/src/types/error.ts`
- **Type Exports**: `/home/dustin/projects/groundswell/src/types/index.js`

## Validation Status

The implementation has been validated through:
- TypeScript compilation (`npm run build`)
- Type checking (`npm run lint`)
- Test suite validation
- Integration testing of parent-child restart scenarios

The interface successfully enables opt-in restart configuration for workflow steps while maintaining full backward compatibility.

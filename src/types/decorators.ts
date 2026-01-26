import type { ErrorMergeStrategy } from './error-strategy.js';
import type { WorkflowError } from './error.js';

/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. By error code - exact string or regex match
 * 2. By recoverable flag - match recoverable/non-recoverable errors
 * 3. Custom predicate - function for complex matching logic
 *
 * @example Match by error code
 * ```ts
 * const criterion: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };
 * ```
 *
 * @example Match by regex
 * ```ts
 * const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };
 * ```
 *
 * @example Match by recoverable flag
 * ```ts
 * const criterion: ErrorCriterion = { recoverable: true };
 * ```
 *
 * @example Custom predicate
 * ```ts
 * const criterion: ErrorCriterion = (error) =>
 *   error.message.includes('temporary') || error.code === 'TIMEOUT';
 * ```
 *
 * @remarks
 * Function types must come last in the discriminated union for proper TypeScript type narrowing.
 * When checking criteria at runtime, always check `typeof criterion === 'function'` first.
 */
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code (string or regex)
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate function (must be last)

/**
 * Configuration options for @Step decorator
 */
export interface StepOptions {
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
  /** If true, step can be restarted on failure (default: false) */
  restartable?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Error criteria that trigger retry attempts (default: all errors if restartable) */
  retryOn?: ErrorCriterion[];
}

/**
 * Configuration options for @Task decorator
 *
 * @note The decorator uses lenient validation - non-Workflow returns are
 *       silently skipped. See the @Task decorator JSDoc for details.
 */
export interface TaskOptions {
  /** Custom task name (defaults to method name) */
  name?: string;
  /** If true, run returned workflows concurrently */
  concurrent?: boolean;
  /** Strategy for merging errors from concurrent task execution */
  errorMergeStrategy?: ErrorMergeStrategy;
}

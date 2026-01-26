import type { ErrorMergeStrategy } from './error-strategy.js';
import type { WorkflowError } from './error.js';
import type { ErrorCriterion } from './restart.js';

/**
 * Configuration options for @Step decorator
 */
export interface StepOptions {
  /** Custom step name (defaults to method name) */
  name?: string;
  /** If true, capture state snapshot after step completion */
  snapshotState?: boolean;
  /** Track and emit step duration (default: true, tracked unless explicitly set to false) */
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

import type { WorkflowError } from './error.js';

/**
 * Restart analysis result
 *
 * Provides error classification and restart recommendations for step retry logic.
 * This interface encapsulates the decision-making process for determining whether
 * a failed step should be retried, aborted, or require plan rebuilding.
 *
 * **Probability Interpretation**:
 * - `0.0 - 0.3`: Low success probability - consider abort or rebuild
 * - `0.4 - 0.6`: Moderate probability - retry with caution
 * - `0.7 - 1.0`: High probability - safe to retry
 *
 * @example Transient error - safe to retry
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: true,
 *   reason: 'Network timeout - likely transient',
 *   suggestedAction: 'retry',
 *   estimatedSuccessProbability: 0.8
 * };
 * ```
 *
 * @example Permanent error - should abort
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: false,
 *   reason: 'Invalid API key - authentication will never succeed',
 *   suggestedAction: 'abort',
 *   estimatedSuccessProbability: 0.0
 * };
 * ```
 *
 * @example Recoverable but requires intervention
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: true,
 *   reason: 'Rate limit exceeded - retry after backoff',
 *   suggestedAction: 'retry',
 *   estimatedSuccessProbability: 0.6
 * };
 * ```
 *
 * @see {@link ErrorCriterion} - For defining error matching criteria
 * @remarks Used in stepRetry events and error analysis utilities
 */
export interface RestartAnalysis {
  /** Whether the step should be restarted */
  shouldRestart: boolean;

  /** Human-readable reason for the restart decision */
  reason: string;

  /** Suggested action to take */
  suggestedAction: 'retry' | 'abort' | 'rebuild';

  /** Estimated probability of success (0-1) */
  estimatedSuccessProbability: number;
}

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
 *
 * @remarks
 * **IMPORTANT**: Function types must come last in the discriminated union for proper
 * TypeScript type narrowing. When checking criteria at runtime, always check
 * `typeof criterion === 'function'` first before discriminant property checks.
 *
 * **Why functions must be last**:
 * In JavaScript, functions can have properties. If a function has a `code` property,
 * the discriminant check `'code' in criterion` would return `true`, causing TypeScript
 * to incorrectly narrow the type. By placing functions last and checking them first
 * at runtime, we ensure type safety.
 *
 * **Runtime checking pattern**:
 * ```ts
 * function matchesCriterion(
 *   criterion: ErrorCriterion,
 *   error: WorkflowError
 * ): boolean {
 *   // Check function FIRST
 *   if (typeof criterion === 'function') {
 *     return criterion(error);
 *   }
 *   // Now safe to use discriminant checks
 *   if ('code' in criterion) {
 *     const codeMatch = criterion.code instanceof RegExp
 *       ? criterion.code.test(error.code || '')
 *       : error.code === criterion.code;
 *     return codeMatch;
 *   }
 *   if ('recoverable' in criterion) {
 *     return error.original?.recoverable === criterion.recoverable;
 *   }
 *   return false;
 * }
 * ```
 *
 * @see {@link RestartAnalysis} - For restart decision result type
 */
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code (string or regex)
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate function (must be last)

/**
 * Error analysis utilities for step restart decisions
 *
 * Provides pure, side-effect-free functions for analyzing WorkflowError instances
 * to determine if a step should be restarted, with structured restart analysis
 * including reason, suggested action, and success probability estimation.
 *
 * @module restart-analysis
 */

import type { WorkflowError } from '../types/error.js';
import type { RestartAnalysis, ErrorCriterion } from '../types/restart.js';

/**
 * Transient error codes that typically indicate temporary failures
 *
 * These errors are usually resolved by retrying the operation after a delay.
 * The constant uses const assertion for type safety and better TypeScript inference.
 *
 * **Error Categories:**
 * - `TIMEOUT`: Operation timed out waiting for response
 * - `RATE_LIMIT`: API rate limit exceeded (HTTP 429)
 * - `NETWORK_ERROR`: Network connectivity issues
 * - `SERVICE_UNAVAILABLE`: Service temporarily unavailable (HTTP 503)
 *
 * @example
 * ```ts
 * if (TRANSIENT_ERROR_SET.has('TIMEOUT')) {
 *   // This is a transient error, safe to retry
 * }
 * ```
 */
const TRANSIENT_ERROR_CODES = [
  'TIMEOUT',
  'RATE_LIMIT',
  'NETWORK_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

/**
 * Set-based lookup for O(1) transient error code checking
 *
 * Using a Set provides constant-time lookup performance compared to
 * array includes() which is O(n). This is important for hot paths
 * in retry logic.
 */
const TRANSIENT_ERROR_SET = new Set(TRANSIENT_ERROR_CODES);

/**
 * Check if an error is a transient (temporary) error
 *
 * Transient errors are temporary faults that typically resolve themselves
 * quickly without intervention. These are safe to retry with a high
 * probability of success.
 *
 * **Detection Strategy:**
 * 1. Check error.message against transient error codes (most reliable)
 * 2. WorkflowError doesn't have a 'code' property, so message is used as fallback
 *
 * @param error - The WorkflowError to analyze
 * @returns `true` if the error is transient and should be retried
 *
 * @example
 * ```ts
 * const error: WorkflowError = {
 *   message: 'TIMEOUT',
 *   original: new Error('Request timeout'),
 *   workflowId: 'wf-123',
 *   state: {},
 *   logs: []
 * };
 *
 * if (isTransientError(error)) {
 *   // Safe to retry with high success probability
 * }
 * ```
 *
 * @remarks
 * **Gotcha:** WorkflowError interface doesn't have a 'code' property,
 * so this function uses error.message as fallback. This is consistent
 * with the pattern used in src/decorators/step.ts:48.
 */
function isTransientError(error: WorkflowError): boolean {
  // GOTCHA: WorkflowError doesn't have 'code' property
  // Use error.message as fallback (consistent with step decorator pattern)
  const errorCode = error.message;
  return TRANSIENT_ERROR_CODES.includes(errorCode as any);
}

/**
 * Check if an error matches a specific error criterion
 *
 * Handles all three ErrorCriterion variants:
 * 1. **By error code** - Exact string match or regex pattern matching
 * 2. **By recoverable flag** - Match recoverable vs non-recoverable errors
 * 3. **Custom predicate** - Function for complex matching logic
 *
 * **CRITICAL:** Function criteria MUST be checked first at runtime.
 * Functions can have properties in JavaScript, so discriminant checks like
 * `'code' in criterion` will return `true` for functions with a `code` property,
 * breaking type narrowing.
 *
 * @param error - The WorkflowError to check against the criterion
 * @param criterion - The ErrorCriterion to match against
 * @returns `true` if the error matches the criterion
 *
 * @example String code matching
 * ```ts
 * const criterion: ErrorCriterion = { code: 'TIMEOUT' };
 * const error: WorkflowError = { message: 'TIMEOUT', ... };
 * matchesCriterion(error, criterion); // true
 * ```
 *
 * @example Regex code matching
 * ```ts
 * const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };
 * const error: WorkflowError = { message: 'TIMEOUT', ... };
 * matchesCriterion(error, criterion); // true
 * ```
 *
 * @example Recoverable flag matching
 * ```ts
 * const criterion: ErrorCriterion = { recoverable: true };
 * const error: WorkflowError = {
 *   message: 'Temporary failure',
 *   original: { recoverable: true },
 *   ...
 * };
 * matchesCriterion(error, criterion); // true
 * ```
 *
 * @example Custom predicate
 * ```ts
 * const criterion: ErrorCriterion = (error) => {
 *   return error.message.includes('timeout') ||
 *          error.message.includes('network');
 * };
 * matchesCriterion(error, criterion); // true if message contains keywords
 * ```
 *
 * @remarks
 * **Runtime Safety Pattern:**
 * ```ts
 * // CORRECT: Check function FIRST
 * if (typeof criterion === 'function') {
 *   return criterion(error);
 * }
 * // Now safe to use discriminant checks
 * if ('code' in criterion) { ... }
 * ```
 *
 * **Why this matters:**
 * ```ts
 * const func = () => true;
 * func.code = 'TIMEOUT'; // Functions can have properties!
 * 'code' in func // true! (TypeScript would incorrectly narrow type)
 * ```
 */
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  // CRITICAL: Check typeof first for function type narrowing
  // Functions can have properties, breaking discriminant checks
  if (typeof criterion === 'function') {
    return criterion(error);
  }

  // Object type checks (type narrowing works after typeof check)
  if ('code' in criterion) {
    // GOTCHA: Use error.message as fallback for error.code
    // WorkflowError doesn't have a code property (step.ts:48 pattern)
    const errorCode = error.message;
    return typeof criterion.code === 'string'
      ? errorCode === criterion.code
      : criterion.code.test(errorCode);
  }

  if ('recoverable' in criterion) {
    // Check error.original for recoverable property
    const original = error.original as Error | undefined;
    if (original && 'recoverable' in original) {
      return (original as { recoverable: boolean }).recoverable === criterion.recoverable;
    }
    // If no recoverable field, default to true for backward compatibility
    return criterion.recoverable;
  }

  return false;
}

/**
 * Estimate the probability of success for a retry attempt
 *
 * Returns a value between 0.0 and 1.0 indicating the likelihood that
 * retrying the operation will succeed.
 *
 * **Probability Interpretation:**
 * - `0.0 - 0.3`: Low probability - consider abort or rebuild
 * - `0.4 - 0.6`: Moderate probability - retry with caution
 * - `0.7 - 1.0`: High probability - safe to retry
 *
 * **Estimation Strategy:**
 * 1. Transient errors: 0.8 (high probability - these typically resolve)
 * 2. Permanent errors (auth, validation): 0.0 (no chance - won't fix themselves)
 * 3. Unknown errors: 0.5 (moderate probability - best effort guess)
 *
 * @param error - The WorkflowError to analyze
 * @returns Success probability estimate (0.0 to 1.0)
 *
 * @example
 * ```ts
 * const timeoutError: WorkflowError = { message: 'TIMEOUT', ... };
 * estimateSuccessProbability(timeoutError); // 0.8 (high)
 *
 * const authError: WorkflowError = { message: 'UNAUTHORIZED', ... };
 * estimateSuccessProbability(authError); // 0.0 (none)
 *
 * const unknownError: WorkflowError = { message: 'UNKNOWN_ERROR', ... };
 * estimateSuccessProbability(unknownError); // 0.5 (moderate)
 * ```
 */
function estimateSuccessProbability(error: WorkflowError): number {
  // Check if transient error first
  if (isTransientError(error)) {
    return 0.8; // High probability for transient errors
  }

  // Check error message for permanent error patterns
  const msg = error.message.toLowerCase();
  if (
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('invalid') ||
    msg.includes('authentication') ||
    msg.includes('auth')
  ) {
    return 0.0; // No chance for auth/validation errors
  }

  // Default: moderate probability
  return 0.5;
}

/**
 * Analyze a WorkflowError to determine if a step should be restarted
 *
 * This is a pure, side-effect-free function that provides intelligent error
 * analysis for step retry decisions. It returns a structured `RestartAnalysis`
 * object with the restart decision, reasoning, suggested action, and success
 * probability estimation.
 *
 * **Analysis Flow:**
 * 1. Check `error.original?.recoverable` - if `false`, return abort immediately
 * 2. Check if error is transient - if yes, return retry with high probability
 * 3. If `stepOptions.retryOn` provided, iterate through criteria
 * 4. For each criterion, call `matchesCriterion(error, criterion)`
 * 5. If any criterion matches, return restart with analysis
 * 6. Default: return no restart with abort action
 *
 * **Pure Function Guarantee:**
 * - Deterministic: Same input always produces same output
 * - No side effects: Doesn't modify inputs or external state
 * - No external dependencies: Doesn't use Date.now(), Math.random(), etc.
 *
 * @param error - The WorkflowError to analyze
 * @param stepOptions - Optional step configuration with retry criteria
 * @returns Structured restart analysis with decision and reasoning
 *
 * @example Transient error - automatic restart
 * ```ts
 * const error: WorkflowError = {
 *   message: 'TIMEOUT',
 *   original: new Error('Request timeout'),
 *   workflowId: 'wf-123',
 *   state: {},
 *   logs: []
 * };
 *
 * const analysis = analyzeErrorForRestart(error);
 * // Returns:
 * // {
 * //   shouldRestart: true,
 * //   reason: 'Transient error detected: TIMEOUT',
 * //   suggestedAction: 'retry',
 * //   estimatedSuccessProbability: 0.8
 * // }
 * ```
 *
 * @example Non-recoverable error - abort
 * ```ts
 * const error: WorkflowError = {
 *   message: 'Invalid configuration',
 *   original: { recoverable: false },
 *   workflowId: 'wf-123',
 *   state: {},
 *   logs: []
 * };
 *
 * const analysis = analyzeErrorForRestart(error);
 * // Returns:
 * // {
 * //   shouldRestart: false,
 * //   reason: 'Error is marked as non-recoverable: Invalid configuration',
 * //   suggestedAction: 'abort',
 * //   estimatedSuccessProbability: 0.0
 * // }
 * ```
 *
 * @example Custom retry criteria
 * ```ts
 * const error: WorkflowError = {
 *   message: 'ETIMEDOUT',
 *   original: new Error('Connection timeout'),
 *   workflowId: 'wf-123',
 *   state: {},
 *   logs: []
 * };
 *
 * const stepOptions = {
 *   retryOn: [
 *     { code: 'ETIMEDOUT' },
 *     { code: /NETWORK_ERROR/ },
 *     { recoverable: true }
 *   ]
 * };
 *
 * const analysis = analyzeErrorForRestart(error, stepOptions);
 * // Returns:
 * // {
 * //   shouldRestart: true,
 * //   reason: 'Error matches retry criteria: ETIMEDOUT',
 * //   suggestedAction: 'retry',
 * //   estimatedSuccessProbability: 0.5
 * // }
 * ```
 *
 * @example No matching criteria - default abort
 * ```ts
 * const error: WorkflowError = {
 *   message: 'AUTH_FAILED',
 *   original: new Error('Authentication failed'),
 *   workflowId: 'wf-123',
 *   state: {},
 *   logs: []
 * };
 *
 * const stepOptions = {
 *   retryOn: [{ code: 'TIMEOUT' }]
 * };
 *
 * const analysis = analyzeErrorForRestart(error, stepOptions);
 * // Returns:
 * // {
 * //   shouldRestart: false,
 * //   reason: 'No matching retry criteria for error: AUTH_FAILED',
 * //   suggestedAction: 'abort',
 * //   estimatedSuccessProbability: 0.0
 * // }
 * ```
 *
 * @remarks
 * **Integration with @Step Decorator:**
 * This function is designed to be used by the @Step decorator's retry loop
 * (src/decorators/step.ts:115-228) to provide structured analysis for
 * stepRetry events.
 *
 * **ErrorCriterion Pattern:**
 * The function follows the existing pattern in src/decorators/step.ts:40-65
 * for matching criteria against errors.
 *
 * **Gotchas:**
 * - WorkflowError doesn't have a 'code' property - uses message as fallback
 * - Always check `typeof criterion === 'function'` FIRST for type safety
 * - Check error.original?.recoverable for recoverable flag
 *
 * @see {@link RestartAnalysis} - Return type structure
 * @see {@link ErrorCriterion} - Retry criterion types
 * @see {@link WorkflowError} - Input error type
 */
export function analyzeErrorForRestart(
  error: WorkflowError,
  stepOptions?: { retryOn?: ErrorCriterion[] }
): RestartAnalysis {
  // STEP 1: Check recoverable flag (if available)
  const original = error.original as Error | undefined;
  if (original && 'recoverable' in original && !original.recoverable) {
    return {
      shouldRestart: false,
      reason: `Error is marked as non-recoverable: ${error.message}`,
      suggestedAction: 'abort',
      estimatedSuccessProbability: 0.0,
    };
  }

  // STEP 2: Check if transient error
  if (isTransientError(error)) {
    return {
      shouldRestart: true,
      reason: `Transient error detected: ${error.message}`,
      suggestedAction: 'retry',
      estimatedSuccessProbability: 0.8,
    };
  }

  // STEP 3: Check retry criteria if provided
  if (stepOptions?.retryOn && stepOptions.retryOn.length > 0) {
    for (const criterion of stepOptions.retryOn) {
      if (matchesCriterion(error, criterion)) {
        return {
          shouldRestart: true,
          reason: `Error matches retry criteria: ${error.message}`,
          suggestedAction: 'retry',
          estimatedSuccessProbability: estimateSuccessProbability(error),
        };
      }
    }
  }

  // STEP 4: Default: no restart
  return {
    shouldRestart: false,
    reason: `No matching retry criteria for error: ${error.message}`,
    suggestedAction: 'abort',
    estimatedSuccessProbability: 0.0,
  };
}

/**
 * Transient error codes constant
 *
 * Exported for testing and external use. Use TRANSIENT_ERROR_SET
 * for O(1) lookup performance.
 *
 * @example
 * ```ts
 * import { TRANSIENT_ERROR_CODES } from './restart-analysis.js';
 *
 * if (TRANSIENT_ERROR_CODES.includes('TIMEOUT')) {
 *   // Handle transient error
 * }
 * ```
 */
export { TRANSIENT_ERROR_CODES };

/**
 * Transient error code set for O(1) lookup
 *
 * Exported for testing and external use. Prefer this over
 * TRANSIENT_ERROR_CODES for performance-critical code.
 */
export { TRANSIENT_ERROR_SET };

/**
 * Restart analysis result
 * Provides error classification and restart recommendations for step retry logic
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

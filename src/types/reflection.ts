/**
 * Reflection types - Interfaces for multi-level reflection and self-correction
 *
 * Reflection allows agents to analyze errors and retry with modified approaches.
 * Supports workflow, agent, and prompt level reflection with configurable limits.
 */

import type { WorkflowNode } from './workflow.js';

/**
 * Configuration for reflection behavior
 */
export interface ReflectionConfig {
  /** Whether reflection is enabled */
  enabled: boolean;
  /** Maximum number of reflection attempts (default: 3) */
  maxAttempts: number;
  /** Delay between retry attempts in milliseconds (default: 0) */
  retryDelayMs?: number;
}

/**
 * Context provided to the reflection process
 */
export interface ReflectionContext {
  /** Level at which reflection is occurring */
  level: 'workflow' | 'agent' | 'prompt';
  /** The workflow node that failed */
  failedNode: WorkflowNode;
  /** The error that triggered reflection */
  error: Error;
  /** Current attempt number (1-indexed) */
  attemptNumber: number;
  /** History of previous reflection attempts */
  previousAttempts: ReflectionEntry[];
}

/**
 * Result from a reflection analysis
 */
export interface ReflectionResult {
  /** Whether to retry the operation */
  shouldRetry: boolean;
  /** Revised prompt data for retry */
  revisedPromptData?: Record<string, unknown>;
  /** Revised system prompt for retry */
  revisedSystemPrompt?: string;
  /** Explanation of the reflection decision */
  reason: string;
}

/**
 * Record of a single reflection attempt
 */
export interface ReflectionEntry {
  /** Timestamp when reflection occurred */
  timestamp: number;
  /** Level at which reflection occurred */
  level: 'workflow' | 'agent' | 'prompt';
  /** Reason for the reflection */
  reason: string;
  /** Original error that triggered reflection */
  error: Error;
  /** Resolution action taken */
  resolution: 'retry' | 'skip' | 'abort';
  /** Whether the retry was successful */
  success: boolean;
}

/**
 * Full ReflectionAPI interface for workflow contexts
 */
export interface ReflectionAPI {
  /**
   * Check if reflection is enabled
   */
  isEnabled(): boolean;

  /**
   * Trigger a reflection on the current context
   * @param reason Optional reason for the reflection
   */
  triggerReflection(reason?: string): Promise<void>;

  /**
   * Get the history of reflection attempts
   */
  getReflectionHistory(): ReflectionEntry[];

  /**
   * Perform reflection analysis on an error
   * @param context The reflection context with error details
   * @returns Result indicating whether to retry
   */
  reflect(context: ReflectionContext): Promise<ReflectionResult>;
}

/**
 * Default reflection configuration
 */
export const DEFAULT_REFLECTION_CONFIG: ReflectionConfig = {
  enabled: false,
  maxAttempts: 3,
  retryDelayMs: 0,
};

/**
 * Create a reflection config with defaults
 */
export function createReflectionConfig(
  partial?: Partial<ReflectionConfig>
): ReflectionConfig {
  return {
    ...DEFAULT_REFLECTION_CONFIG,
    ...partial,
  };
}

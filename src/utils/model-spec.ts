/**
 * Model specification parsing utility
 *
 * Provides parsing and validation of model specification strings
 * per PRD §7.8 (Model & Provider Specification).
 *
 * The provider axis is an OPEN set (PRD §7.8): any non-empty provider string
 * is valid. The harness (pi | claude-code) is NEVER part of the model string —
 * harness-qualified strings (e.g. `pi/anthropic/x`) are rejected.
 */

import type { ModelSpec, ModelProviderId } from '../types/harnesses.js';

/**
 * Parse a model specification string into a ModelSpec object
 *
 * ## Supported Formats
 *
 * ### Qualified Format (provider/model)
 * Explicit provider specification with "/" separator.
 * - Input: `"anthropic/claude-3-5-sonnet"`
 * - Output: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`
 *
 * ### Plain Format (model only)
 * Uses default provider when no provider specified.
 * - Input: `"claude-sonnet-4"` with defaultProvider: `'anthropic'`
 * - Output: `{ provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }`
 *
 * ## Validation Rules
 *
 * 1. Input cannot be empty or whitespace-only
 * 2. Provider must be a non-empty string (open set — any LLM provider accepted)
 * 3. Model name cannot be empty after provider split
 * 4. Harness-qualified strings (3+ segments, e.g. `pi/anthropic/x`) are REJECTED
 *    (PRD §7.8 critical rule: the harness must never appear in the model string)
 * 5. Input is trimmed before parsing, original preserved in `raw` field
 *
 * @param model - Model specification string to parse
 * @param defaultProvider - Default provider to use when none specified (default: 'anthropic')
 * @returns Parsed ModelSpec object with provider, model, and raw string
 * @throws {Error} When model specification is invalid:
 * - Empty or whitespace-only input
 * - Empty provider or model parts
 * - Harness-qualified strings (3+ segments)
 *
 * @example
 * ```ts
 * // Qualified format with known provider
 * const spec1 = parseModelSpec('anthropic/claude-3-5-sonnet');
 * // Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }
 *
 * // Qualified format with custom provider (open set)
 * const spec2 = parseModelSpec('openai/gpt-4o');
 * // Returns: { provider: 'openai', model: 'gpt-4o', raw: 'openai/gpt-4o' }
 *
 * // Plain format — resolved against default provider
 * const spec3 = parseModelSpec('claude-sonnet-4');
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * // Harness-qualified — REJECTED (PRD §7.8 critical rule)
 * parseModelSpec('pi/anthropic/claude-sonnet-4');
 * // Throws: "Harness must not appear in model string …"
 * ```
 *
 * @see {@link ModelSpec} for the return type structure
 * @see {@link ModelProviderId} for the open provider set
 */
export function parseModelSpec(
  model: string,
  defaultProvider: ModelProviderId = 'anthropic',
): ModelSpec {
  // Preserve ORIGINAL (untrimmed) input — existing consumers rely on raw being exact.
  const raw = model;

  // Trim for parsing — raw stays untouched.
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. Expected format: "provider/model" or "model"',
    );
  }

  // Split WITHOUT a limit — must observe ALL segments to detect harness-qualified forms.
  const parts = trimmed.split('/');

  if (parts.length === 1) {
    // Plain format — resolve against defaultProvider (open set).
    return { provider: defaultProvider, model: parts[0], raw };
  }

  if (parts.length === 2) {
    const [provider, modelName] = parts;

    if (provider.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Provider cannot be empty. Expected format: "provider/model"',
      );
    }

    if (modelName.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Model name cannot be empty. Expected format: "provider/model"',
      );
    }

    // Open set: ANY non-empty provider string is a valid ModelProviderId (PRD §7.8).
    // No closed-union check — the harness enforces provider constraints at initialize/execute.
    return { provider, model: modelName, raw };
  }

  // parts.length >= 3 → harness-qualified form (e.g. pi/anthropic/x, cc/anthropic/...).
  // PRD §7.8 critical rule: the harness must NEVER appear in the model string.
  throw new Error(
    `Harness must not appear in model string. ` +
    `Expected format "provider/model" (e.g. "anthropic/claude-sonnet-4-20250514"), got "${raw}".`,
  );
}

/**
 * Format a ModelSpec for a specific target provider
 *
 * ## Behavior
 *
 * ### Same Provider (Pass-Through)
 * When `spec.provider` matches `targetProvider`, returns the model name only.
 *
 * **Example:**
 * - Input: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`, `'anthropic'`
 * - Output: `"claude-3-5-sonnet"`
 *
 * ### Different Providers (Error)
 * When providers differ, throws an error. Cross-provider model translation
 * is not supported in the MVP.
 *
 * @param spec - ModelSpec from parseModelSpec() or Provider.normalizeModel()
 * @param targetProvider - The provider to format the model for
 * @returns Formatted model string for target provider (model name only)
 * @throws {Error} When providers differ with message:
 *   "Cannot translate {source}/{model} to {target} provider. Cross-provider model translation is not supported."
 *
 * @example
 * ```ts
 * // Same provider: pass-through
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * const model = formatModelForProvider(spec, 'anthropic');
 * console.log(model); // "claude-3-5-sonnet"
 *
 * // Different provider: error
 * try {
 *   formatModelForProvider(spec, 'openai');
 * } catch (error) {
 *   console.error((error as Error).message);
 *   // "Cannot translate anthropic/claude-3-5-sonnet to openai provider. ..."
 * }
 * ```
 *
 * @see {@link parseModelSpec} for creating ModelSpec objects
 * @see {@link ModelSpec} for the input type structure
 * @see {@link ModelProviderId} for the open provider set
 */
export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ModelProviderId,
): string {
  // Pass-through: same provider
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Error: different providers (translation not supported in MVP).
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    'Cross-provider model translation is not supported.',
  );
}

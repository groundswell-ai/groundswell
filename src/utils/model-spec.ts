/**
 * Model specification parsing utility
 *
 * Provides parsing and validation of model specification strings
 * per PRD 7.8 and Decision 6.
 */

import type { ProviderId, ModelSpec } from '../types/providers.js';

/**
 * Type guard to check if a string is a valid ProviderId
 *
 * Use this function to validate and narrow string types to ProviderId.
 *
 * @param value - The string value to check
 * @returns True if the value is a valid ProviderId ('anthropic' | 'opencode')
 *
 * @example
 * ```ts
 * const value: string = getUserInput();
 *
 * if (isValidProviderId(value)) {
 *   // TypeScript knows value is ProviderId here
 *   console.log(`Valid provider: ${value}`);
 * } else {
 *   console.error(`Invalid provider: ${value}`);
 * }
 * ```
 */
function isValidProviderId(value: string): value is ProviderId {
  return value === 'anthropic' || value === 'opencode';
}

/**
 * Get comma-separated list of supported providers for error messages
 *
 * @returns Formatted list of valid provider IDs
 */
function getSupportedProvidersList(): string {
  return '"anthropic", "opencode"';
}

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
 * 2. Provider must be one of: `'anthropic'`, `'opencode'`
 * 3. Model name cannot be empty after provider split
 * 4. Only the first slash is considered the provider/model separator
 * 5. Input is trimmed before parsing, original preserved in `raw` field
 *
 * @param model - Model specification string to parse
 * @param defaultProvider - Default provider to use when none specified (default: 'anthropic')
 * @returns Parsed ModelSpec object with provider, model, and raw string
 * @throws {Error} When model specification is invalid:
 * - Empty or whitespace-only input
 * - Invalid provider (not 'anthropic' or 'opencode')
 * - Empty provider or model parts
 *
 * @example
 * ```ts
 * // Qualified format with explicit provider
 * const spec1 = parseModelSpec('anthropic/claude-3-5-sonnet');
 * // Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }
 *
 * // Qualified format with opencode
 * const spec2 = parseModelSpec('opencode/gpt-4');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
 *
 * // Plain format with explicit default provider
 * const spec3 = parseModelSpec('gpt-4', 'opencode');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 *
 * // Plain format with default provider (anthropic)
 * const spec4 = parseModelSpec('claude-sonnet-4');
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * // Error case: invalid provider
 * try {
 *   parseModelSpec('invalid/model');
 * } catch (error) {
 *   console.error(error.message);
 *   // "Invalid provider: "invalid". Supported providers: "anthropic", "opencode""
 * }
 * ```
 *
 * @see {@link ModelSpec} for the return type structure
 * @see {@link ProviderId} for valid provider identifiers
 */
export function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Preserve original input for raw field
  const raw = model;

  // Step 1: Trim and validate input
  const trimmed = model.trim();

  if (trimmed.length === 0) {
    throw new Error(
      'Model specification cannot be empty. ' +
      'Expected format: "provider/model" or "model"'
    );
  }

  // Step 2: Split on first slash only
  const parts = trimmed.split('/', 2);

  // Step 3: Handle qualified format (provider/model)
  if (parts.length === 2) {
    const [provider, modelName] = parts;

    // Validate provider part is not empty
    if (provider.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Provider cannot be empty. Expected format: "provider/model"'
      );
    }

    // Validate model part is not empty
    if (modelName.length === 0) {
      throw new Error(
        `Invalid model specification: "${trimmed}". ` +
        'Model name cannot be empty. Expected format: "provider/model"'
      );
    }

    // Validate provider is in union type
    if (!isValidProviderId(provider)) {
      throw new Error(
        `Invalid provider: "${provider}". ` +
        `Supported providers: ${getSupportedProvidersList()}`
      );
    }

    // Return ModelSpec for qualified format
    return {
      provider,
      model: modelName,
      raw
    };
  }

  // Step 4: Handle plain format (model only)
  const modelName = parts[0];

  return {
    provider: defaultProvider,
    model: modelName,
    raw
  };
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
 * **Example:**
 * - Input: `{ provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }`, `'opencode'`
 * - Output: Throws `Error` with message:
 *   `"Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported."`
 *
 * ## Use Cases
 *
 * 1. **Model Validation**: Validate that a model spec is compatible with a target provider
 * 2. **API Preparation**: Format model names for provider-specific API requests
 * 3. **Configuration**: Prepare model strings for provider initialization
 *
 * ## Future Enhancements (Out of Scope)
 *
 * - Cross-provider model mapping table (e.g., claude-3-5-sonnet → gpt-4-turbo)
 * - Capability-based model matching (tier-based translation)
 * - Alias support for model name variants
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
 * const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
 * try {
 *   formatModelForProvider(spec, 'opencode');
 * } catch (error) {
 *   console.error((error as Error).message);
 *   // "Cannot translate anthropic/claude-3-5-sonnet to opencode provider. Cross-provider model translation is not supported."
 * }
 *
 * // Use with Provider.normalizeModel()
 * const provider = new AnthropicProvider();
 * const spec = provider.normalizeModel('claude-opus-4');
 * const model = formatModelForProvider(spec, 'anthropic');
 * console.log(model); // "claude-opus-4"
 * ```
 *
 * @see {@link parseModelSpec} for creating ModelSpec objects
 * @see {@link ModelSpec} for the input type structure
 * @see {@link ProviderId} for valid provider identifiers
 */
export function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  // Pass-through: same provider
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Error: different providers (translation not supported in MVP)
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider} provider. ` +
    'Cross-provider model translation is not supported.'
  );
}

/**
 * State Redaction Utilities
 *
 * Utilities for redacting sensitive data from state snapshots
 * to prevent credential exposure in debug output.
 */

/**
 * Sensitive key patterns that should be redacted
 * Matches common naming patterns for credentials and secrets
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private/i,
];

/**
 * Redact a value with partial masking for strings
 *
 * Shows first 3 and last 3 characters with *** in between for strings > 10 chars.
 * For shorter strings or non-strings, returns generic redaction marker.
 *
 * @param key - The key name (for logging/validation)
 * @param value - The value to redact
 * @returns Redacted string representation
 *
 * @example
 * redactValue('apiKey', 'secret-key-123') // 'sec***123'
 * redactValue('password', 'pass') // '***'
 * redactValue('secret', { data: 'hidden' }) // '[REDACTED]'
 */
export function redactValue(key: string, value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 10
      ? `${value.slice(0, 3)}***${value.slice(-3)}`
      : '***';
  }
  return '[REDACTED]';
}

/**
 * Check if a key matches any sensitive pattern
 *
 * @param key - The key to check
 * @returns true if the key should be redacted
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Recursively redact sensitive keys from a state object
 *
 * Traverses the state object and redacts values for keys matching
 * sensitive patterns. Nested objects are recursively processed.
 * Arrays are processed element-wise.
 *
 * @param state - The state object to redact (can be null)
 * @returns A new object with sensitive values redacted
 *
 * @example
 * const state = {
 *   username: 'alice',
 *   password: 'secret123',
 *   apiKey: 'sk-1234567890abcdef',
 *   nested: { secret: 'hidden' }
 * };
 * redactSensitiveKeys(state);
 * // {
 * //   username: 'alice',
 * //   password: '***',
 * //   apiKey: 'sk-***def',
 * //   nested: { secret: '***' }
 * // }
 */
export function redactSensitiveKeys(
  state: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    if (isSensitiveKey(key)) {
      // Redact sensitive values
      redacted[key] = redactValue(key, value);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Process array elements
        redacted[key] = value.map(item => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return redactSensitiveKeys(item as Record<string, unknown>);
          }
          return item;
        });
      } else {
        // Recursively redact nested objects
        redacted[key] = redactSensitiveKeys(value as Record<string, unknown>);
      }
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

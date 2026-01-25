/**
 * Content Truncation Utilities
 *
 * Utilities for truncating large content (state snapshots, logs, etc.)
 * to prevent terminal flooding while preserving useful information.
 */

/**
 * Display configuration for truncation
 */
export interface DisplayConfig {
  state: {
    maxLines: number;
    maxKeys: number;
    maxDepth: number;
    maxStringLength: number;
  };
  logs: {
    maxEntries: number;
  };
}

/**
 * Default display configuration
 */
export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  state: {
    maxLines: 20,
    maxKeys: 20,
    maxDepth: 2,
    maxStringLength: 80,
  },
  logs: {
    maxEntries: 10,
  },
} as const;

/**
 * Truncate an array of lines with "... (N more)" indicator
 *
 * @param lines - Array of strings to truncate
 * @param maxLines - Maximum number of lines to keep
 * @returns Truncated array with indicator if needed
 *
 * @example
 * truncateLines(['a', 'b', 'c', 'd', 'e'], 3)
 * // ['a', 'b', 'c', '... (2 more lines)']
 */
export function truncateLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) {
    return lines;
  }

  const remaining = lines.length - maxLines;
  return [
    ...lines.slice(0, maxLines),
    `... (${remaining} more line${remaining === 1 ? '' : 's'})`
  ];
}

/**
 * Truncate an object to a maximum number of top-level keys
 *
 * @param obj - Object to truncate
 * @param maxKeys - Maximum number of keys to keep
 * @returns New object with at most maxKeys entries
 *
 * @example
 * truncateObject({ a: 1, b: 2, c: 3, d: 4, e: 5 }, 3)
 * // { a: 1, b: 2, c: 3, __truncated__: '... (2 more keys)' }
 */
export function truncateObject(
  obj: Record<string, unknown>,
  maxKeys: number
): Record<string, unknown> {
  const entries = Object.entries(obj);
  if (entries.length <= maxKeys) {
    return obj;
  }

  const truncated: Record<string, unknown> = {};
  for (const [key, value] of entries.slice(0, maxKeys)) {
    truncated[key] = value;
  }

  const remaining = entries.length - maxKeys;
  truncated['__truncated__'] = `... (${remaining} more key${remaining === 1 ? '' : 's'})`;
  return truncated;
}

/**
 * Format a state snapshot for display with redaction and truncation
 *
 * This function takes a state snapshot and formats it as a JSON string
 * suitable for terminal display. It handles:
 * - Null/undefined states
 * - Key truncation (maxKeys)
 * - Line truncation (maxLines)
 *
 * Note: This function does NOT handle redaction - redaction should be
 * applied before calling this function using redactSensitiveKeys().
 *
 * @param state - The state snapshot to format (can be null)
 * @param config - Display configuration
 * @returns Formatted string ready for display
 *
 * @example
 * const state = { a: 1, b: 2, c: { nested: 'value' } };
 * formatStateSnapshot(state, DEFAULT_DISPLAY_CONFIG.state);
 * // Returns JSON string truncated to 20 lines and 20 keys
 */
export function formatStateSnapshot(
  state: Record<string, unknown> | null,
  config: DisplayConfig['state']
): string {
  if (!state) {
    return 'No state snapshot available';
  }

  // Limit keys
  const truncated = truncateObject(state, config.maxKeys);

  // Format as JSON
  const json = JSON.stringify(truncated, null, 2);

  // Truncate lines
  const lines = json.split('\n');
  const displayLines = truncateLines(lines, config.maxLines);

  return displayLines.join('\n');
}

/**
 * Format a single value for safe display
 *
 * Handles circular references, large objects, and long strings.
 * Converts any value to a string representation suitable for logging.
 *
 * @param value - The value to format
 * @param maxStringLength - Maximum string length before truncation
 * @returns Formatted string representation
 *
 * @example
 * formatValue({ a: 1, b: 2 }, 50) // '{"a":1,"b":2}'
 * formatValue('a'.repeat(100), 10) // 'aaaaaaaaaa... (90 more chars)'
 */
export function formatValue(value: unknown, maxStringLength: number = 80): string {
  // Handle null/undefined
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  // Handle primitives
  if (typeof value === 'string') {
    if (value.length > maxStringLength) {
      const remaining = value.length - maxStringLength;
      return `${value.slice(0, maxStringLength)}... (${remaining} more char${remaining === 1 ? '' : 's'})`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Handle objects and arrays
  try {
    const json = JSON.stringify(value);
    if (json.length > maxStringLength) {
      const remaining = json.length - maxStringLength;
      return `${json.slice(0, maxStringLength)}... (${remaining} more char${remaining === 1 ? '' : 's'})`;
    }
    return json;
  } catch {
    // Handle circular references or non-serializable objects
    return '[Object]';
  }
}

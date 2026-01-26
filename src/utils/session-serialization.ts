/**
 * Session serialization utilities
 *
 * @module
 * @remarks
 * Provides safe serialization/deserialization of SessionState objects
 * containing SDK message types with circular reference handling.
 *
 * Handles edge cases including:
 * - Circular references from application code
 * - Non-serializable values (functions, Symbols)
 * - Unknown type fields in SDK messages
 * - Type validation during deserialization
 *
 * @example
 * ```ts
 * import { serializeSession, deserializeSession } from 'groundswell';
 *
 * const state: SessionState = { history: [], lastResult: null };
 * const json = serializeSession(state);
 * const restored = deserializeSession(json);
 * console.log(restored); // { history: [], lastResult: null }
 * ```
 */

import type { SessionState } from "../types/providers.js";

/**
 * Error thrown when session serialization fails
 *
 * @remarks
 * Provides detailed error context for debugging serialization issues.
 * Includes the property path and value that caused the failure.
 *
 * @public
 */
export class SessionSerializationError extends Error {
  /**
   * Creates a new SessionSerializationError
   *
   * @param message - Human-readable error message
   * @param path - Property path where the error occurred (e.g., "history.0.tool_use_result")
   * @param value - The value that caused the serialization failure
   */
  constructor(
    message: string,
    public readonly path: string,
    public readonly value: unknown,
  ) {
    super(message);
    this.name = "SessionSerializationError";
  }
}

/**
 * Creates a custom replacer function for JSON.stringify
 *
 * @remarks
 * The replacer handles non-serializable values and circular references:
 * - Functions become `[Function:name]` strings
 * - Symbols become `[Symbol:description]` strings
 * - Circular references become `[Circular:key]` strings
 * - Undefined becomes null (JSON-compatible)
 * - Uses WeakSet for circular reference tracking to avoid memory leaks
 *
 * @returns A replacer function for use with JSON.stringify
 *
 * @internal
 */
function createReplacer(): (key: string, value: unknown) => unknown {
  const seen = new WeakSet<object>();

  return (key: string, value: unknown): unknown => {
    // CRITICAL: Check circular references FIRST
    // Using WeakSet allows garbage collection of tracked objects
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return `[Circular:${key}]`;
      }
      seen.add(value);
    }

    // Handle functions - cannot be serialized to JSON
    if (typeof value === "function") {
      return `[Function:${value.name || "anonymous"}]`;
    }

    // Handle symbols - cannot be serialized to JSON
    if (typeof value === "symbol") {
      return `[Symbol:${value.description || "unknown"}]`;
    }

    // Handle undefined - becomes null in JSON
    if (value === undefined) {
      return null;
    }

    return value;
  };
}

/**
 * Type guard for validating SessionState structure
 *
 * @remarks
 * Validates that the parsed object has the required structure
 * for a SessionState. Performs runtime type checking to ensure
 * data integrity during deserialization.
 *
 * @param value - The value to validate
 * @returns True if the value is a valid SessionState structure
 *
 * @internal
 */
function isValidSessionState(value: unknown): value is SessionState {
  // Check if value is an object
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // Check for required history property
  if (!("history" in obj) || !Array.isArray(obj.history)) {
    return false;
  }

  // Check for required lastResult property
  if (!("lastResult" in obj)) {
    return false;
  }

  // lastResult can be null or an object
  if (obj.lastResult !== null && typeof obj.lastResult !== "object") {
    return false;
  }

  return true;
}

/**
 * Serialize a SessionState to JSON string
 *
 * @remarks
 * Converts a SessionState object to a JSON string with special handling
 * for non-serializable values and circular references. The resulting JSON
 * is pretty-printed with 2-space indentation for readability.
 *
 * Handles edge cases from SDK message types:
 * - `SDKUserMessage.tool_use_result` (unknown type)
 * - `SDKResultMessage.result` (unknown type)
 * - `SDKResultMessage.structured_output` (unknown type)
 *
 * Throws {@link SessionSerializationError} if serialization fails,
 * with contextual information about the failure.
 *
 * @param state - The session state to serialize
 * @returns JSON string representation of the session
 * @throws {SessionSerializationError} If serialization fails
 *
 * @example
 * ```ts
 * import { serializeSession, deserializeSession } from 'groundswell';
 *
 * const state: SessionState = {
 *   history: [],
 *   lastResult: null
 * };
 *
 * const json = serializeSession(state);
 * console.log(json); // Pretty-printed JSON string
 *
 * // Round-trip serialization
 * const restored = deserializeSession(json);
 * expect(restored).toEqual(state);
 * ```
 */
export function serializeSession(state: SessionState): string {
  try {
    const replacer = createReplacer();
    // Pretty-print with 2-space indentation (matches session-store.ts pattern)
    return JSON.stringify(state, replacer, 2);
  } catch (error) {
    throw new SessionSerializationError(
      `Failed to serialize session: ${error instanceof Error ? error.message : "Unknown error"}`,
      "root",
      state,
    );
  }
}

/**
 * Reconstruct a SessionState from JSON string
 *
 * @remarks
 * Parses a JSON string and validates that it has the correct SessionState
 * structure. Performs runtime type validation to ensure data integrity
 * and catch corrupted or malformed session data early.
 *
 * Throws {@link SessionSerializationError} if deserialization fails or
 * if the data doesn't match the expected SessionState structure.
 *
 * @param data - JSON string representation of the session
 * @returns Reconstructed SessionState object
 * @throws {SessionSerializationError} If deserialization fails or data is invalid
 *
 * @example
 * ```ts
 * import { serializeSession, deserializeSession } from 'groundswell';
 *
 * const state: SessionState = {
 *   history: [],
 *   lastResult: null
 * };
 *
 * const json = serializeSession(state);
 * const restored = deserializeSession(json);
 *
 * // Round-trip equality test
 * expect(restored.history).toEqual(state.history);
 * expect(restored.lastResult).toEqual(state.lastResult);
 * ```
 */
export function deserializeSession(data: string): SessionState {
  try {
    const parsed = JSON.parse(data);

    // CRITICAL: Validate structure before returning
    if (!isValidSessionState(parsed)) {
      throw new Error(
        "Invalid session state structure: missing or malformed required properties",
      );
    }

    return parsed as SessionState;
  } catch (error) {
    throw new SessionSerializationError(
      `Failed to deserialize session: ${error instanceof Error ? error.message : "Unknown error"}`,
      "root",
      data,
    );
  }
}

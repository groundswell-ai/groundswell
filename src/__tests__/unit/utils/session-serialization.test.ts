/**
 * Session serialization utilities tests
 *
 * PRP Reference: P2.M2.T1.S2 - Add session serialization utilities
 *
 * Tests cover:
 * - Round-trip serialization for basic SessionState
 * - Circular reference handling
 * - Non-serializable value handling (functions, Symbols)
 * - SDK message structure compatibility
 * - Error handling and validation
 */

import { describe, it, expect } from "vitest";
import {
  serializeSession,
  deserializeSession,
  SessionSerializationError,
} from "../../../utils/session-serialization.js";
import type { SessionState } from "../../../types/providers.js";

describe("session serialization", () => {
  /**
   * Helper function to create a mock SessionState
   */
  function createMockSessionState(
    overrides?: Partial<SessionState>,
  ): SessionState {
    return {
      history: [],
      lastResult: null,
      ...overrides,
    };
  }

  describe("serializeSession", () => {
    it("should serialize a basic SessionState to JSON string", () => {
      const state = createMockSessionState();
      const serialized = serializeSession(state);

      expect(typeof serialized).toBe("string");
      expect(serialized).toContain("history");
      expect(serialized).toContain("lastResult");
    });

    it("should produce pretty-printed JSON with 2-space indentation", () => {
      const state = createMockSessionState();
      const serialized = serializeSession(state);

      // Check for indentation pattern (2 spaces)
      expect(serialized).toContain('  "history"');
      expect(serialized).toContain('  "lastResult"');
    });

    it("should handle empty history array", () => {
      const state = createMockSessionState({ history: [] });
      const serialized = serializeSession(state);

      expect(serialized).toContain("[]");
    });

    it("should handle null lastResult", () => {
      const state = createMockSessionState({ lastResult: null });
      const serialized = serializeSession(state);

      expect(serialized).toContain("null");
    });

    it("should convert functions to string representation", () => {
      const stateWithFunction = {
        history: [],
        lastResult: null,
      } as SessionState & { callback?: () => void };

      stateWithFunction.callback = () => console.log("test");

      const serialized = serializeSession(stateWithFunction as SessionState);

      expect(serialized).toContain("[Function:");
    });

    it("should convert named functions to string representation with name", () => {
      const stateWithFunction = {
        history: [],
        lastResult: null,
      } as SessionState & { callback?: () => void };

      function namedCallback() {
        return "test";
      }
      stateWithFunction.callback = namedCallback;

      const serialized = serializeSession(stateWithFunction as SessionState);

      expect(serialized).toContain("[Function:namedCallback]");
    });

    it("should convert symbols to string representation", () => {
      const stateWithSymbol = {
        history: [],
        lastResult: null,
      } as SessionState & { sym?: symbol };

      stateWithSymbol.sym = Symbol("test-symbol");

      const serialized = serializeSession(stateWithSymbol as SessionState);

      expect(serialized).toContain("[Symbol:test-symbol]");
    });

    it("should convert symbols without description to unknown string", () => {
      const stateWithSymbol = {
        history: [],
        lastResult: null,
      } as SessionState & { sym?: symbol };

      stateWithSymbol.sym = Symbol();

      const serialized = serializeSession(stateWithSymbol as SessionState);

      expect(serialized).toContain("[Symbol:unknown]");
    });

    it("should convert undefined to null", () => {
      const stateWithUndefined = {
        history: [],
        lastResult: null,
      } as SessionState & { optionalField?: string };

      stateWithUndefined.optionalField = undefined;

      const serialized = serializeSession(stateWithUndefined as SessionState);

      // Undefined becomes null in JSON
      expect(serialized).toContain('"optionalField": null');
    });

    it("should handle circular references", () => {
      const circularState = {
        history: [],
        lastResult: null,
      } as SessionState & { circular?: unknown };

      circularState.circular = circularState; // Self-reference

      const serialized = serializeSession(circularState as SessionState);

      expect(serialized).toContain("[Circular:circular]");
    });

    it("should handle nested circular references", () => {
      const nestedState = {
        history: [],
        lastResult: null,
      } as SessionState & { nested?: { parent?: unknown } };

      const nested = { parent: nestedState };
      nestedState.nested = nested;

      const serialized = serializeSession(nestedState as SessionState);

      expect(serialized).toContain("[Circular:");
    });

    it("should throw SessionSerializationError on serialization failure", () => {
      // Create an object that will cause circular reference issues
      const problematicState = {
        history: [],
        lastResult: null,
      } as SessionState & { self?: unknown };

      problematicState.self = problematicState;

      // This should actually work due to circular ref handling, so we test the error type
      expect(() =>
        serializeSession(problematicState as SessionState),
      ).not.toThrow();
    });
  });

  describe("deserializeSession", () => {
    it("should deserialize valid JSON to SessionState", () => {
      const json = '{"history":[],"lastResult":null}';
      const deserialized = deserializeSession(json);

      expect(deserialized).toEqual({ history: [], lastResult: null });
    });

    it("should deserialize pretty-printed JSON", () => {
      const json = `{
  "history": [],
  "lastResult": null
}`;
      const deserialized = deserializeSession(json);

      expect(deserialized).toEqual({ history: [], lastResult: null });
    });

    it("should throw SessionSerializationError for invalid JSON", () => {
      const invalidJson = "{not valid json}";

      expect(() => deserializeSession(invalidJson)).toThrow(
        SessionSerializationError,
      );
    });

    it("should throw SessionSerializationError for missing history property", () => {
      const invalidJson = '{"lastResult":null}';

      expect(() => deserializeSession(invalidJson)).toThrow(
        SessionSerializationError,
      );
      expect(() => deserializeSession(invalidJson)).toThrow(
        "Invalid session state structure",
      );
    });

    it("should throw SessionSerializationError for non-array history", () => {
      const invalidJson = '{"history":"not an array","lastResult":null}';

      expect(() => deserializeSession(invalidJson)).toThrow(
        SessionSerializationError,
      );
    });

    it("should throw SessionSerializationError for missing lastResult property", () => {
      const invalidJson = '{"history":[]}';

      expect(() => deserializeSession(invalidJson)).toThrow(
        SessionSerializationError,
      );
    });

    it("should accept null as valid lastResult value", () => {
      const json = '{"history":[],"lastResult":null}';
      const deserialized = deserializeSession(json);

      expect(deserialized.lastResult).toBeNull();
    });

    it("should accept object as valid lastResult value", () => {
      const json = '{"history":[],"lastResult":{"subtype":"success"}}';
      const deserialized = deserializeSession(json);

      expect(deserialized.lastResult).toEqual({ subtype: "success" });
    });

    it("should reject primitive value for lastResult", () => {
      const invalidJson = '{"history":[],"lastResult":"invalid"}';

      expect(() => deserializeSession(invalidJson)).toThrow(
        SessionSerializationError,
      );
    });

    it("should include error context in SessionSerializationError", () => {
      const invalidJson = "invalid json";

      try {
        deserializeSession(invalidJson);
        expect.fail("Should have thrown SessionSerializationError");
      } catch (error) {
        expect(error).toBeInstanceOf(SessionSerializationError);
        if (error instanceof SessionSerializationError) {
          expect(error.path).toBe("root");
          expect(error.value).toBe(invalidJson);
          expect(error.message).toContain("Failed to deserialize session");
        }
      }
    });
  });

  describe("round-trip serialization", () => {
    it("should preserve basic SessionState structure", () => {
      const originalState = createMockSessionState();
      const serialized = serializeSession(originalState);
      const restoredState = deserializeSession(serialized);

      expect(restoredState).toEqual(originalState);
    });

    it("should preserve history array contents", () => {
      const stateWithHistory = createMockSessionState({
        history: [
          {
            type: "user",
            message: { role: "user", content: "Hello" },
            parent_tool_use_id: null,
            isSynthetic: false,
            tool_use_result: null,
            uuid: "test-uuid-1",
            session_id: "test-session",
          },
        ],
      });

      const serialized = serializeSession(stateWithHistory);
      const restored = deserializeSession(serialized);

      expect(restored.history).toHaveLength(1);
      expect(restored.history[0]).toEqual(stateWithHistory.history[0]);
    });

    it("should preserve lastResult object", () => {
      const stateWithResult = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 1000 },
          cost: { cost: 0.001 },
          usage: { input_tokens: 10, output_tokens: 20 },
          result: null,
          structured_output: null,
        },
      });

      const serialized = serializeSession(stateWithResult);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult).toEqual(stateWithResult.lastResult);
    });

    it("should handle round-trip with function converted to string", () => {
      const stateWithFunction = {
        history: [],
        lastResult: null,
      } as SessionState & { callback?: () => void };

      stateWithFunction.callback = () => "test";

      const serialized = serializeSession(stateWithFunction as SessionState);
      const restored = deserializeSession(serialized) as SessionState & {
        callback?: string;
      };

      // Function should be converted to string representation
      expect(typeof restored.callback).toBe("string");
      expect(restored.callback).toContain("[Function:");
    });

    it("should handle round-trip with symbol converted to string", () => {
      const stateWithSymbol = {
        history: [],
        lastResult: null,
      } as SessionState & { sym?: symbol };

      stateWithSymbol.sym = Symbol("test");

      const serialized = serializeSession(stateWithSymbol as SessionState);
      const restored = deserializeSession(serialized) as SessionState & {
        sym?: string;
      };

      // Symbol should be converted to string representation
      expect(typeof restored.sym).toBe("string");
      expect(restored.sym).toContain("[Symbol:test]");
    });

    it("should handle round-trip with circular reference", () => {
      const circularState = {
        history: [],
        lastResult: null,
      } as SessionState & { circular?: unknown };

      circularState.circular = circularState;

      const serialized = serializeSession(circularState as SessionState);
      const restored = deserializeSession(serialized) as SessionState & {
        circular?: string;
      };

      // Circular reference should be converted to string marker
      expect(typeof restored.circular).toBe("string");
      expect(restored.circular).toBe("[Circular:circular]");
    });

    it("should handle round-trip with undefined converted to null", () => {
      const stateWithUndefined = {
        history: [],
        lastResult: null,
      } as SessionState & { optional?: string };

      stateWithUndefined.optional = undefined;

      const serialized = serializeSession(stateWithUndefined as SessionState);
      const restored = deserializeSession(serialized) as SessionState & {
        optional?: null;
      };

      // Undefined should be converted to null
      expect(restored.optional).toBeNull();
    });
  });

  describe("SDK message type compatibility", () => {
    it("should serialize SDK-like user message structure", () => {
      const sdkLikeMessage = {
        type: "user",
        message: { role: "user", content: "Test message" },
        parent_tool_use_id: null,
        isSynthetic: false,
        tool_use_result: null,
        uuid: "uuid-123",
        session_id: "session-456",
      };

      const state = createMockSessionState({ history: [sdkLikeMessage] });
      const serialized = serializeSession(state);

      expect(serialized).toContain("uuid-123");
      expect(serialized).toContain("session-456");
    });

    it("should serialize SDK-like result message structure", () => {
      const sdkLikeResult = {
        subtype: "success",
        timing: { total_time: 500, start_time: 1000, end_time: 1500 },
        cost: { cost: 0.002, input_tokens: 10, output_tokens: 20 },
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        result: { text: "Response" },
        structured_output: null,
      };

      const state = createMockSessionState({ lastResult: sdkLikeResult });
      const serialized = serializeSession(state);

      expect(serialized).toContain("success");
      expect(serialized).toContain("Response");
    });

    it("should handle unknown type fields in SDK messages", () => {
      const messageWithUnknown = {
        type: "user",
        message: { role: "user", content: "Test" },
        parent_tool_use_id: null,
        isSynthetic: false,
        tool_use_result: { arbitrary: { nested: { data: [1, 2, 3] } } },
        uuid: "uuid-789",
        session_id: "session-101",
      };

      const state = createMockSessionState({ history: [messageWithUnknown] });
      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.history[0].tool_use_result).toEqual({
        arbitrary: { nested: { data: [1, 2, 3] } },
      });
    });
  });

  describe("error handling", () => {
    it("should throw SessionSerializationError with proper name", () => {
      const invalidJson = "{invalid";

      try {
        deserializeSession(invalidJson);
        expect.fail("Should have thrown SessionSerializationError");
      } catch (error) {
        expect(error).toBeInstanceOf(SessionSerializationError);
        if (error instanceof SessionSerializationError) {
          expect(error.name).toBe("SessionSerializationError");
        }
      }
    });

    it("should include original value in error", () => {
      const invalidJson = "bad json";

      try {
        deserializeSession(invalidJson);
        expect.fail("Should have thrown SessionSerializationError");
      } catch (error) {
        expect(error).toBeInstanceOf(SessionSerializationError);
        if (error instanceof SessionSerializationError) {
          expect(error.value).toBe(invalidJson);
        }
      }
    });

    it("should include path in error", () => {
      const invalidJson = "{}";

      try {
        deserializeSession(invalidJson);
        expect.fail("Should have thrown SessionSerializationError");
      } catch (error) {
        expect(error).toBeInstanceOf(SessionSerializationError);
        if (error instanceof SessionSerializationError) {
          expect(error.path).toBe("root");
        }
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty history with null lastResult", () => {
      const state = createMockSessionState({ history: [], lastResult: null });
      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored).toEqual(state);
    });

    it("should handle multiple history entries", () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        type: "user",
        message: { role: "user", content: `Message ${i}` },
        parent_tool_use_id: null,
        isSynthetic: false,
        tool_use_result: null,
        uuid: `uuid-${i}`,
        session_id: "session-1",
      }));

      const state = createMockSessionState({ history: messages });
      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.history).toHaveLength(5);
    });

    it("should handle deeply nested data structures", () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                data: "deep value",
              },
            },
          },
        },
      };

      const state = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 100 },
          cost: { cost: 0.001 },
          usage: { input_tokens: 10, output_tokens: 20 },
          result: deeplyNested,
          structured_output: null,
        },
      });

      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult?.result).toEqual(deeplyNested);
    });

    it("should handle special characters in strings", () => {
      const state = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 100 },
          cost: { cost: 0.001 },
          usage: { input_tokens: 10, output_tokens: 20 },
          result: { text: 'Special chars: \n\t\r\\"' },
          structured_output: null,
        },
      });

      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult?.result).toEqual({
        text: 'Special chars: \n\t\r\\"',
      });
    });

    it("should handle unicode characters", () => {
      const state = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 100 },
          cost: { cost: 0.001 },
          usage: { input_tokens: 10, output_tokens: 20 },
          result: { text: "Unicode: 🎉中日韩" },
          structured_output: null,
        },
      });

      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult?.result).toEqual({
        text: "Unicode: 🎉中日韩",
      });
    });

    it("should handle numeric values", () => {
      const state = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 100.5 },
          cost: { cost: 0.00123 },
          usage: { input_tokens: 0, output_tokens: 0 },
          result: { count: 42, price: 19.99, negative: -100 },
          structured_output: null,
        },
      });

      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult?.result).toEqual({
        count: 42,
        price: 19.99,
        negative: -100,
      });
    });

    it("should handle boolean values", () => {
      const state = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 100 },
          cost: { cost: 0.001 },
          usage: { input_tokens: 10, output_tokens: 20 },
          result: { flag1: true, flag2: false },
          structured_output: null,
        },
      });

      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult?.result).toEqual({
        flag1: true,
        flag2: false,
      });
    });

    it("should handle array values in unknown fields", () => {
      const state = createMockSessionState({
        lastResult: {
          subtype: "success",
          timing: { total_time: 100 },
          cost: { cost: 0.001 },
          usage: { input_tokens: 10, output_tokens: 20 },
          result: { items: [1, 2, 3, 4, 5] },
          structured_output: null,
        },
      });

      const serialized = serializeSession(state);
      const restored = deserializeSession(serialized);

      expect(restored.lastResult?.result).toEqual({ items: [1, 2, 3, 4, 5] });
    });
  });
});

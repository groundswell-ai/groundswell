/**
 * Unit tests for MCPHandler.toAgentToolResultFromExecResult() — the
 * ToolExecutionResult → AgentToolResult converter.
 *
 * Pure synchronous method, no mocks needed — construct MCPHandler, call the
 * public method directly, assert shape.
 *
 * PRP: P1.M2.T1.S1
 */

import { describe, it, expect } from 'vitest';
import { MCPHandler } from '../../../core/mcp-handler.js';
import type { ToolExecutionResult } from '../../../types/harnesses.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MCPHandler.toAgentToolResultFromExecResult()', () => {
  const handler = new MCPHandler();

  // ── String content (passthrough) ────────────────────────────────────────

  describe('string content', () => {
    it('should pass through string content unchanged and set isError:false', () => {
      const result: ToolExecutionResult = { content: 'hello', isError: false };
      const r = handler.toAgentToolResultFromExecResult(result);

      expect(r.content).toHaveLength(1);
      expect(r.content[0]).toEqual({ type: 'text', text: 'hello' });
      expect(r.details.isError).toBe(false);
    });
  });

  // ── Object content (JSON.stringify) ────────────────────────────────────

  describe('object content', () => {
    it('should JSON.stringify object content and set isError:true', () => {
      const result: ToolExecutionResult = { content: { foo: 1 }, isError: true };
      const r = handler.toAgentToolResultFromExecResult(result);

      expect(r.content[0]).toEqual({ type: 'text', text: '{"foo":1}' });
      expect(r.details.isError).toBe(true);
    });
  });

  // ── Primitive (number) content ─────────────────────────────────────────

  describe('primitive number content', () => {
    it('should JSON.stringify a number to its string representation', () => {
      const result: ToolExecutionResult = { content: 42, isError: false };
      const r = handler.toAgentToolResultFromExecResult(result);

      expect(r.content[0].text).toBe('42');
      expect(r.details.isError).toBe(false);
    });
  });

  // ── Array content ─────────────────────────────────────────────────────

  describe('array content', () => {
    it('should JSON.stringify array content', () => {
      const result: ToolExecutionResult = { content: ['a', 'b'], isError: false };
      const r = handler.toAgentToolResultFromExecResult(result);

      expect(r.content[0].text).toBe('["a","b"]');
      expect(r.details.isError).toBe(false);
    });
  });

  // ── Empty string content (edge case) ────────────────────────────────────

  describe('empty string content', () => {
    it('should pass through empty string without wrapping in quotes', () => {
      const result: ToolExecutionResult = { content: '', isError: false };
      const r = handler.toAgentToolResultFromExecResult(result);

      // Empty string must stay '' — NOT '""' (which JSON.stringify would produce)
      expect(r.content[0].text).toBe('');
      expect(r.details.isError).toBe(false);
    });
  });

  // ── isError flag mirroring ─────────────────────────────────────────────

  describe('isError flag mirroring', () => {
    it('should mirror isError:false when object content is provided', () => {
      const result: ToolExecutionResult = { content: { data: true }, isError: false };
      const r = handler.toAgentToolResultFromExecResult(result);

      expect(r.content[0].text).toBe('{"data":true}');
      expect(r.details.isError).toBe(false);
    });
  });
});

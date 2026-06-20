/**
 * Unit tests for ClaudeCodeHarness.normalizeModel()
 *
 * Purpose: Comprehensive tests for normalizeModel() method per P2.M1.T1.S4
 *
 * Tests:
 * - Plain format normalization (model without provider prefix)
 * - Qualified format normalization (provider/model prefix)
 * - Provider validation (rejects non-anthropic providers)
 * - Error delegation to parseModelSpec()
 * - Edge cases (whitespace, special characters, etc.)
 * - Type safety
 *
 * PRP: P2.M1.T1.S4 - Implement normalizeModel() method
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeCodeHarness } from '../../../harnesses/claude-code-harness.js';
import type { ModelSpec } from '../../../types/providers.js';

describe('ClaudeCodeHarness.normalizeModel()', () => {
  let provider: ClaudeCodeHarness;

  // Setup: Create provider instance before each test
  beforeEach(() => {
    provider = new ClaudeCodeHarness();
  });

  describe('plain format (model without provider prefix)', () => {
    it('should normalize plain model string with default provider', () => {
      const result = provider.normalizeModel('claude-sonnet-4');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
      } as ModelSpec);
    });

    it('should handle claude-opus-4 model name', () => {
      const result = provider.normalizeModel('claude-opus-4');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-opus-4');
      expect(result.raw).toBe('claude-opus-4');
    });

    it('should handle claude-haiku-4 model name', () => {
      const result = provider.normalizeModel('claude-haiku-4');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-haiku-4');
    });

    it('should preserve original input in raw field (whitespace)', () => {
      const result = provider.normalizeModel('  claude-sonnet-4  ');

      expect(result.raw).toBe('  claude-sonnet-4  ');
      expect(result.model).toBe('claude-sonnet-4'); // trimmed
    });
  });

  describe('qualified format (provider/model prefix)', () => {
    it('should normalize anthropic/claude-sonnet-4', () => {
      const result = provider.normalizeModel('anthropic/claude-sonnet-4');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      } as ModelSpec);
    });

    it('should normalize anthropic/claude-opus-4', () => {
      const result = provider.normalizeModel('anthropic/claude-opus-4');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-opus-4');
      expect(result.raw).toBe('anthropic/claude-opus-4');
    });

    it('should handle qualified format with date suffix', () => {
      const result = provider.normalizeModel('anthropic/claude-sonnet-4-20250514');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4-20250514');
    });

    it('should handle qualified format with whitespace', () => {
      const result = provider.normalizeModel('  anthropic/claude-sonnet-4  ');

      expect(result.raw).toBe('  anthropic/claude-sonnet-4  ');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4');
    });
  });

  describe('provider validation', () => {
    it('should throw on opencode provider', () => {
      expect(() => provider.normalizeModel('opencode/gpt-4')).toThrow(
        /Cannot normalize opencode\/gpt-4 with ClaudeCodeHarness/
      );
    });

    it('should throw with helpful error message for wrong provider', () => {
      try {
        provider.normalizeModel('opencode/gpt-4');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Cannot normalize');
        expect((error as Error).message).toContain('opencode/gpt-4');
        expect((error as Error).message).toContain('ClaudeCodeHarness');
        expect((error as Error).message).toContain('HarnessRegistry');
      }
    });

    it('should suggest using correct provider registry', () => {
      expect(() => provider.normalizeModel('opencode/gpt-4')).toThrow(
        /HarnessRegistry/
      );
    });
  });

  describe('error delegation to parseModelSpec', () => {
    it('should throw on empty string (delegated to parseModelSpec)', () => {
      expect(() => provider.normalizeModel('')).toThrow(/cannot be empty/i);
    });

    it('should throw on whitespace-only input', () => {
      expect(() => provider.normalizeModel('   ')).toThrow(/cannot be empty/i);
    });

    it('should accept arbitrary provider via parseModelSpec (open set) but throw on provider mismatch', () => {
      // parseModelSpec now accepts any non-empty provider (open set per PRD §7.8).
      // ClaudeCodeHarness rejects non-anthropic providers in its own normalizeModel wrapper.
      expect(() => provider.normalizeModel('invalid/model')).toThrow();
    });

    it('should throw on empty provider part', () => {
      expect(() => provider.normalizeModel('/model')).toThrow(/provider cannot be empty/i);
    });

    it('should throw on empty model part', () => {
      expect(() => provider.normalizeModel('anthropic/')).toThrow(/model name cannot be empty/i);
    });
  });

  describe('edge cases', () => {
    it('should handle model names with special characters', () => {
      const result = provider.normalizeModel('claude-3.5-sonnet_20250514');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3.5-sonnet_20250514');
    });

    it('should handle model names with numbers', () => {
      const result = provider.normalizeModel('claude-sonnet-4-20250514');

      expect(result.model).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('type safety', () => {
    it('should return ModelSpec with correct types', () => {
      const result = provider.normalizeModel('claude-sonnet-4');

      expect(result.provider).toBe('anthropic');
      expect(typeof result.model).toBe('string');
      expect(typeof result.raw).toBe('string');
    });
  });
});

/**
 * Unit tests for parseModelSpec()
 */

import { describe, it, expect } from 'vitest';
import { parseModelSpec } from '../../../utils/model-spec.js';
import type { ModelSpec, ProviderId } from '../../../types/providers.js';

describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    it('should parse anthropic model', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet'
      } as ModelSpec);
    });

    it('should parse opencode model', () => {
      const result = parseModelSpec('opencode/gpt-4');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4');
      expect(result.raw).toBe('opencode/gpt-4');
    });

    it('should preserve trimmed whitespace in raw but trim parts', () => {
      const result = parseModelSpec('  anthropic/claude-3-5-sonnet  ');

      expect(result.raw).toBe('  anthropic/claude-3-5-sonnet  ');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });
  });

  describe('plain format (model only)', () => {
    it('should use default provider for plain model', () => {
      const result = parseModelSpec('claude-sonnet-4', 'anthropic');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4'
      } as ModelSpec);
    });

    it('should use opencode as default provider', () => {
      const result = parseModelSpec('gpt-4', 'opencode');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4');
    });

    it('should default to anthropic when no default specified', () => {
      const result = parseModelSpec('claude-opus-4');

      expect(result.provider).toBe('anthropic');
    });
  });

  describe('edge cases', () => {
    it('should handle model names with special characters', () => {
      const result = parseModelSpec('anthropic/claude-3.5-sonnet_20250514');

      expect(result.model).toBe('claude-3.5-sonnet_20250514');
    });

    it('should handle multiple slashes (limit to first slash)', () => {
      const result = parseModelSpec('anthropic/claude/3/5');

      // split('/', 2) returns at most 2 elements: ['anthropic', 'claude']
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude');
    });

    it('should handle whitespace around input', () => {
      const result = parseModelSpec('  claude-sonnet-4  ');

      // raw preserves original input with whitespace
      expect(result.raw).toBe('  claude-sonnet-4  ');
      expect(result.model).toBe('claude-sonnet-4'); // model is trimmed
    });
  });

  describe('error cases', () => {
    it('should throw on empty string', () => {
      expect(() => parseModelSpec('')).toThrow(/cannot be empty/i);
    });

    it('should throw on whitespace-only input', () => {
      expect(() => parseModelSpec('   ')).toThrow(/cannot be empty/i);
    });

    it('should throw on invalid provider', () => {
      expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);
    });

    it('should throw on empty provider part', () => {
      expect(() => parseModelSpec('/model')).toThrow(/provider cannot be empty/i);
    });

    it('should throw on empty model part', () => {
      expect(() => parseModelSpec('anthropic/')).toThrow(/model name cannot be empty/i);
    });

    it('should include supported providers in error message', () => {
      try {
        parseModelSpec('invalid/model');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('anthropic');
        expect((error as Error).message).toContain('opencode');
      }
    });

    it('should include original input in error message for empty provider', () => {
      try {
        parseModelSpec('/model');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('/model');
      }
    });

    it('should include original input in error message for empty model', () => {
      try {
        parseModelSpec('anthropic/');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('anthropic/');
      }
    });

    it('should include original input in error message for invalid provider', () => {
      try {
        parseModelSpec('invalid/model');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"invalid"');
      }
    });
  });

  describe('type safety', () => {
    it('should return ModelSpec with correct ProviderId type', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');
      const provider: ProviderId = result.provider;
      expect(provider).toBe('anthropic');
    });

    it('should narrow provider type correctly', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');

      if (result.provider === 'anthropic') {
        expect(result.provider).toBe('anthropic');
      } else {
        expect.fail('Provider should be anthropic');
      }
    });
  });
});

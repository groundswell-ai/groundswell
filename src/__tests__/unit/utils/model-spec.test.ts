/**
 * Unit tests for parseModelSpec() and formatModelForProvider()
 *
 * Tests the open-set model-spec parsing contract per PRD §7.8:
 * - Any non-empty provider string is accepted (open ModelProviderId set).
 * - Harness-qualified strings (3+ segments, e.g. pi/anthropic/x) are REJECTED.
 * - No closed-union provider check exists.
 */

import { describe, it, expect } from 'vitest';
import { parseModelSpec, formatModelForProvider } from '../../../utils/model-spec.js';
import type { ModelSpec, ModelProviderId } from '../../../types/harnesses.js';

describe('parseModelSpec', () => {
  describe('qualified format (provider/model)', () => {
    it('should parse anthropic model', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');

      expect(result).toStrictEqual({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet',
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

  describe('open-set provider acceptance', () => {
    it('should accept openai provider', () => {
      const result = parseModelSpec('openai/gpt-4o');

      expect(result).toStrictEqual({
        provider: 'openai',
        model: 'gpt-4o',
        raw: 'openai/gpt-4o',
      });
    });

    it('should accept google provider', () => {
      const result = parseModelSpec('google/gemini-2.5-pro');

      expect(result).toStrictEqual({
        provider: 'google',
        model: 'gemini-2.5-pro',
        raw: 'google/gemini-2.5-pro',
      });
    });

    it('should accept zai provider', () => {
      const result = parseModelSpec('zai/glm-4.6');

      expect(result).toStrictEqual({
        provider: 'zai',
        model: 'glm-4.6',
        raw: 'zai/glm-4.6',
      });
    });

    it('should accept arbitrary custom provider (open set)', () => {
      const result = parseModelSpec('custom-llm/my-model');

      expect(result).toStrictEqual({
        provider: 'custom-llm',
        model: 'my-model',
        raw: 'custom-llm/my-model',
      });
    });

    it('should accept previously-invalid provider (open set — no closed-union check)', () => {
      const result = parseModelSpec('invalid/model');

      expect(result.provider).toBe('invalid');
      expect(result.model).toBe('model');
      expect(result.raw).toBe('invalid/model');
    });
  });

  describe('harness-qualified rejection (PRD §7.8 critical rule)', () => {
    it('should reject pi/anthropic/claude-sonnet-4', () => {
      expect(() => parseModelSpec('pi/anthropic/claude-sonnet-4')).toThrow(
        /harness must not appear in model string/i,
      );
    });

    it('should reject cc/anthropic/x', () => {
      expect(() => parseModelSpec('cc/anthropic/x')).toThrow(
        /harness must not appear in model string/i,
      );
    });

    it('should reject pi/openai/gpt-4o', () => {
      expect(() => parseModelSpec('pi/openai/gpt-4o')).toThrow(
        /harness must not appear in model string/i,
      );
    });

    it('should reject strings with 4+ segments', () => {
      expect(() => parseModelSpec('anthropic/claude/3/5')).toThrow(
        /harness must not appear in model string/i,
      );
    });

    it('should include original raw input in harness rejection message', () => {
      try {
        parseModelSpec('pi/anthropic/x');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('pi/anthropic/x');
      }
    });
  });

  describe('plain format (model only)', () => {
    it('should use default provider for plain model', () => {
      const result = parseModelSpec('claude-sonnet-4', 'anthropic');

      expect(result).toStrictEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
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

    it('should throw on empty provider part', () => {
      expect(() => parseModelSpec('/model')).toThrow(/provider cannot be empty/i);
    });

    it('should throw on empty model part', () => {
      expect(() => parseModelSpec('anthropic/')).toThrow(/model name cannot be empty/i);
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
  });

  describe('regression — v1.1 valid strings parse identically', () => {
    it('anthropic/claude-sonnet-4 parses the same as before', () => {
      const result = parseModelSpec('anthropic/claude-sonnet-4');

      expect(result).toStrictEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      });
    });

    it('plain claude-sonnet-4 resolves to default anthropic', () => {
      const result = parseModelSpec('claude-sonnet-4');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.raw).toBe('claude-sonnet-4');
    });
  });

  describe('type safety', () => {
    it('should return ModelSpec with correct ModelProviderId type', () => {
      const result = parseModelSpec('anthropic/claude-3-5-sonnet');
      const provider: ModelProviderId = result.provider;
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

describe('formatModelForProvider', () => {
  describe('same provider pass-through', () => {
    it('should return model name when providers match (anthropic)', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet',
      };

      const result = formatModelForProvider(spec, 'anthropic');

      expect(result).toBe('claude-3-5-sonnet');
    });

    it('should return model name when providers match (opencode)', () => {
      const spec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4-turbo',
        raw: 'opencode/gpt-4-turbo',
      };

      const result = formatModelForProvider(spec, 'opencode');

      expect(result).toBe('gpt-4-turbo');
    });

    it('should work with specs from parseModelSpec', () => {
      const spec = parseModelSpec('anthropic/claude-opus-4');

      const result = formatModelForProvider(spec, 'anthropic');

      expect(result).toBe('claude-opus-4');
    });

    it('should work with plain format specs from parseModelSpec', () => {
      const spec = parseModelSpec('claude-sonnet-4', 'opencode');

      const result = formatModelForProvider(spec, 'opencode');

      expect(result).toBe('claude-sonnet-4');
    });
  });

  describe('cross-provider translation error', () => {
    it('should throw when converting anthropic to opencode', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        raw: 'anthropic/claude-3-5-sonnet',
      };

      expect(() => formatModelForProvider(spec, 'opencode')).toThrow(
        /Cannot translate.*anthropic\/claude-3-5-sonnet.*to.*opencode/,
      );
    });

    it('should throw when converting opencode to anthropic', () => {
      const spec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4',
        raw: 'opencode/gpt-4',
      };

      expect(() => formatModelForProvider(spec, 'anthropic')).toThrow(
        /Cannot translate.*opencode\/gpt-4.*to.*anthropic/,
      );
    });

    it('should include helpful error message', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      expect(() => formatModelForProvider(spec, 'opencode')).toThrow(
        'Cross-provider model translation is not supported',
      );
    });

    it('should include all context in error message', () => {
      const spec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4-turbo',
        raw: 'opencode/gpt-4-turbo',
      };

      expect(() => formatModelForProvider(spec, 'anthropic')).toThrow(
        /Cannot translate opencode\/gpt-4-turbo to anthropic provider/,
      );
    });
  });
});

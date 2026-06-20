/**
 * OpenCodeProvider Tests (DEPRECATED)
 *
 * OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.
 * These tests verify the deprecation warning works correctly.
 *
 * @see AnthropicProvider
 * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
 *
 * Unit tests for OpenCodeProvider.normalizeModel()
 *
 * Purpose: Comprehensive tests for normalizeModel() method per P3.M2.T1.S5
 *
 * Tests:
 * - Plain format normalization (model without provider prefix)
 * - Qualified format normalization (provider/model prefix)
 * - Multi-provider support (accepts any provider - unlike AnthropicProvider)
 * - Error delegation to parseModelSpec()
 * - Edge cases (whitespace, special characters, etc.)
 * - Type safety
 *
 * PRP: P3.M2.T1.S5 - Implement normalizeModel() with provider validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCodeProvider } from '../../../harnesses/opencode-provider.js';
import type { ModelSpec } from '../../../types/providers.js';

describe('OpenCodeProvider.normalizeModel()', () => {
  let provider: OpenCodeProvider;

  // Setup: Create provider instance before each test
  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('plain format (model without provider prefix)', () => {
    it('should normalize plain model string with default provider', () => {
      const result = provider.normalizeModel('gpt-4');

      expect(result).toEqual({
        provider: 'opencode',
        model: 'gpt-4',
        raw: 'gpt-4',
      } as ModelSpec);
    });

    it('should handle claude-3-5-sonnet model name', () => {
      const result = provider.normalizeModel('claude-3-5-sonnet');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('claude-3-5-sonnet');
      expect(result.raw).toBe('claude-3-5-sonnet');
    });

    it('should handle model names with version numbers', () => {
      const result = provider.normalizeModel('gpt-4-turbo');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4-turbo');
      expect(result.raw).toBe('gpt-4-turbo');
    });

    it('should preserve original input in raw field (whitespace)', () => {
      const result = provider.normalizeModel('  gpt-4  ');

      expect(result.raw).toBe('  gpt-4  ');
      expect(result.model).toBe('gpt-4'); // trimmed
    });
  });

  describe('qualified format (provider/model prefix)', () => {
    it('should normalize opencode/gpt-4', () => {
      const result = provider.normalizeModel('opencode/gpt-4');

      expect(result).toEqual({
        provider: 'opencode',
        model: 'gpt-4',
        raw: 'opencode/gpt-4',
      } as ModelSpec);
    });

    it('should normalize anthropic/claude-3-5-sonnet', () => {
      const result = provider.normalizeModel('anthropic/claude-3-5-sonnet');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
      expect(result.raw).toBe('anthropic/claude-3-5-sonnet');
    });

    it('should handle qualified format with date suffix', () => {
      const result = provider.normalizeModel('anthropic/claude-3-5-sonnet-20250514');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet-20250514');
      expect(result.raw).toBe('anthropic/claude-3-5-sonnet-20250514');
    });

    it('should handle qualified format with whitespace', () => {
      const result = provider.normalizeModel('  anthropic/claude-3-5-sonnet  ');

      expect(result.raw).toBe('  anthropic/claude-3-5-sonnet  ');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });

    it('should accept qualified format with opencode provider', () => {
      const result = provider.normalizeModel('opencode/custom-model');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('custom-model');
      expect(result.raw).toBe('opencode/custom-model');
    });
  });

  describe('multi-provider support (key difference from AnthropicProvider)', () => {
    it('should accept anthropic provider (unlike AnthropicProvider which rejects opencode)', () => {
      // AnthropicProvider would throw if given 'opencode/gpt-4'
      // OpenCodeProvider should accept 'anthropic/claude-3-5-sonnet'
      const result = provider.normalizeModel('anthropic/claude-3-5-sonnet');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });

    it('should accept opencode provider', () => {
      const result = provider.normalizeModel('opencode/gpt-4');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4');
    });

    // NOTE: parseModelSpec accepts any non-empty provider (open set per PRD §7.8).
    // This is correct — the provider axis is open. OpenCodeProvider is a multi-provider
    // gateway and does not constrain providers at normalizeModel time.
    it('should accept arbitrary provider via parseModelSpec (open set)', () => {
      const result = provider.normalizeModel('openai/gpt-4');
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
    });
  });

  describe('error delegation to parseModelSpec', () => {
    it('should throw on empty string (delegated to parseModelSpec)', () => {
      expect(() => provider.normalizeModel('')).toThrow(/cannot be empty/i);
    });

    it('should throw on whitespace-only input', () => {
      expect(() => provider.normalizeModel('   ')).toThrow(/cannot be empty/i);
    });

    it('should accept arbitrary provider string via parseModelSpec (open set)', () => {
      // parseModelSpec accepts any non-empty provider. OpenCodeProvider does not restrict.
      const result = provider.normalizeModel('invalid/model');
      expect(result.provider).toBe('invalid');
      expect(result.model).toBe('model');
    });

    it('should throw on empty provider part', () => {
      expect(() => provider.normalizeModel('/model')).toThrow(/Provider cannot be empty/i);
    });

    it('should throw on empty model part', () => {
      expect(() => provider.normalizeModel('opencode/')).toThrow(/Model name cannot be empty/i);
    });

    it('should throw on anthropic/ with empty model', () => {
      expect(() => provider.normalizeModel('anthropic/')).toThrow(/Model name cannot be empty/i);
    });
  });

  describe('edge cases', () => {
    it('should handle model names with special characters', () => {
      const result = provider.normalizeModel('gpt-4-turbo_preview');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('gpt-4-turbo_preview');
    });

    it('should handle model names with dots', () => {
      const result = provider.normalizeModel('claude-3.5-sonnet');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('claude-3.5-sonnet');
    });

    it('should handle model names with underscores', () => {
      const result = provider.normalizeModel('model_name_v2');

      expect(result.provider).toBe('opencode');
      expect(result.model).toBe('model_name_v2');
    });

    it('should handle model names with numbers', () => {
      const result = provider.normalizeModel('gpt-4-0314');

      expect(result.model).toBe('gpt-4-0314');
    });
  });

  describe('type safety', () => {
    it('should return ModelSpec with correct types', () => {
      const result = provider.normalizeModel('gpt-4');

      expect(result.provider).toBe('opencode');
      expect(typeof result.model).toBe('string');
      expect(typeof result.raw).toBe('string');
    });

    it('should have all required ModelSpec fields', () => {
      const result = provider.normalizeModel('anthropic/claude-3-5-sonnet');

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('raw');
    });

    it('should preserve raw input exactly', () => {
      const rawInput = '  gpt-4  ';
      const result = provider.normalizeModel(rawInput);

      expect(result.raw).toBe(rawInput);
    });
  });

  describe('behavior differences from AnthropicProvider', () => {
    it('should NOT throw on provider mismatch (unlike AnthropicProvider)', () => {
      // AnthropicProvider.normalizeModel('opencode/gpt-4') would throw
      // OpenCodeProvider.normalizeModel('anthropic/claude-3-5-sonnet') should work
      const result = provider.normalizeModel('anthropic/claude-3-5-sonnet');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-5-sonnet');
    });

    it('should accept both anthropic and opencode providers', () => {
      const anthropicResult = provider.normalizeModel('anthropic/claude-3-5-sonnet');
      const opencodeResult = provider.normalizeModel('opencode/gpt-4');

      expect(anthropicResult.provider).toBe('anthropic');
      expect(opencodeResult.provider).toBe('opencode');
    });
  });
});

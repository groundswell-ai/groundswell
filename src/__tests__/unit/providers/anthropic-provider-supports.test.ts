/**
 * Unit tests for AnthropicProvider.supports() and requiresFeatures()
 *
 * Purpose: Comprehensive tests for capability checking methods per P3.M1.T1.S2
 *
 * Tests:
 * - supports() returns true for all 6 capabilities (mcp, skills, lsp, streaming, sessions, extendedThinking)
 * - requiresFeatures() returns true when all features supported
 * - requiresFeatures() returns true for empty array
 * - requiresFeatures() handles single-element arrays
 * - requiresFeatures() handles all-capabilities array
 * - Edge cases and type safety
 *
 * PRP: P3.M1.T1.S2 - Write Tests for Capability Helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../providers/anthropic-provider.js';

describe('AnthropicProvider.supports()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('positive cases - all capabilities supported', () => {
    it('should return true for "mcp" capability', () => {
      expect(provider.supports('mcp')).toBe(true);
    });

    it('should return true for "skills" capability', () => {
      expect(provider.supports('skills')).toBe(true);
    });

    it('should return true for "lsp" capability', () => {
      expect(provider.supports('lsp')).toBe(true);
    });

    it('should return true for "streaming" capability', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should return true for "sessions" capability', () => {
      expect(provider.supports('sessions')).toBe(true);
    });

    it('should return true for "extendedThinking" capability', () => {
      expect(provider.supports('extendedThinking')).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should accept only valid capability keys', () => {
      // These should all be valid capability keys
      expect(() => provider.supports('mcp')).not.toThrow();
      expect(() => provider.supports('skills')).not.toThrow();
      expect(() => provider.supports('lsp')).not.toThrow();
      expect(() => provider.supports('streaming')).not.toThrow();
      expect(() => provider.supports('sessions')).not.toThrow();
      expect(() => provider.supports('extendedThinking')).not.toThrow();
    });

    it('should return boolean type for valid capabilities', () => {
      const result = provider.supports('mcp');
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('AnthropicProvider.requiresFeatures()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
  });

  describe('all features supported', () => {
    it('should return true when all requested features are supported', () => {
      const result = provider.requiresFeatures(['mcp', 'skills', 'streaming']);
      expect(result).toBe(true);
    });

    it('should return true for single supported feature', () => {
      const result = provider.requiresFeatures(['mcp']);
      expect(result).toBe(true);
    });

    it('should return true for all capabilities', () => {
      const allCapabilities = [
        'mcp', 'skills', 'lsp', 'streaming', 'sessions', 'extendedThinking'
      ] as const;
      const result = provider.requiresFeatures(allCapabilities);
      expect(result).toBe(true);
    });

    it('should return true for mixed capability combinations', () => {
      expect(provider.requiresFeatures(['mcp', 'lsp'])).toBe(true);
      expect(provider.requiresFeatures(['streaming', 'sessions'])).toBe(true);
      expect(provider.requiresFeatures(['skills', 'extendedThinking'])).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return true for empty array (no requirements)', () => {
      const result = provider.requiresFeatures([]);
      expect(result).toBe(true);
    });

    it('should handle single-element array', () => {
      const result = provider.requiresFeatures(['mcp']);
      expect(result).toBe(true);
    });

    it('should handle array with all capabilities in different order', () => {
      const result = provider.requiresFeatures([
        'extendedThinking', 'sessions', 'streaming', 'lsp', 'skills', 'mcp'
      ]);
      expect(result).toBe(true);
    });

    it('should handle duplicate capability keys', () => {
      const result = provider.requiresFeatures(['mcp', 'mcp', 'skills']);
      expect(result).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should accept only valid capability key arrays', () => {
      expect(() => provider.requiresFeatures(['mcp', 'skills'])).not.toThrow();
      expect(() => provider.requiresFeatures(['lsp', 'streaming'])).not.toThrow();
    });

    it('should return boolean type', () => {
      const result = provider.requiresFeatures(['mcp']);
      expect(typeof result).toBe('boolean');
    });

    it('should handle readonly arrays', () => {
      const features = ['mcp', 'skills'] as const;
      expect(() => provider.requiresFeatures(features)).not.toThrow();
    });
  });
});

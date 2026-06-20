/**
 * Unit tests for OpenCodeProvider.supports() and requiresFeatures()
 *
 * Purpose: Comprehensive tests for capability checking methods per P3.M1.T1.S2
 *
 * Tests:
 * - supports() returns false for mcp (disabled in OpenCode)
 * - supports() returns false for lsp (disabled in OpenCode)
 * - supports() returns true for skills, streaming, sessions, extendedThinking
 * - requiresFeatures() returns false when mcp or lsp in requirements
 * - requiresFeatures() returns true when only requesting enabled features
 * - Edge cases and provider capability differences
 *
 * PRP: P3.M1.T1.S2 - Write Tests for Capability Helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenCodeProvider } from '../../../harnesses/opencode-provider.js';

describe('OpenCodeProvider.supports()', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('disabled capabilities', () => {
    it('should return false for "mcp" capability', () => {
      expect(provider.supports('mcp')).toBe(false);
    });

    it('should return false for "lsp" capability', () => {
      expect(provider.supports('lsp')).toBe(false);
    });
  });

  describe('enabled capabilities', () => {
    it('should return true for "skills" capability', () => {
      expect(provider.supports('skills')).toBe(true);
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
      const result = provider.supports('skills');
      expect(typeof result).toBe('boolean');
    });
  });
});

describe('OpenCodeProvider.requiresFeatures()', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('some features unsupported', () => {
    it('should return false when any feature is unsupported', () => {
      const result = provider.requiresFeatures(['mcp', 'streaming']);
      expect(result).toBe(false); // mcp is false
    });

    it('should return false when multiple features are unsupported', () => {
      const result = provider.requiresFeatures(['mcp', 'lsp']);
      expect(result).toBe(false); // both are false
    });

    it('should return false when lsp is in requirements', () => {
      const result = provider.requiresFeatures(['skills', 'lsp']);
      expect(result).toBe(false); // lsp is false
    });

    it('should return true when only checking supported features', () => {
      const result = provider.requiresFeatures(['streaming', 'sessions']);
      expect(result).toBe(true); // both are true
    });

    it('should return true for single supported feature', () => {
      const result = provider.requiresFeatures(['skills']);
      expect(result).toBe(true);
    });

    it('should return true for all enabled capabilities', () => {
      const enabledCapabilities = [
        'skills', 'streaming', 'sessions', 'extendedThinking'
      ] as const;
      const result = provider.requiresFeatures(enabledCapabilities);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return true for empty array (no requirements)', () => {
      const result = provider.requiresFeatures([]);
      expect(result).toBe(true);
    });

    it('should handle single-element array with unsupported capability', () => {
      const result = provider.requiresFeatures(['mcp']);
      expect(result).toBe(false);
    });

    it('should handle array with all capabilities', () => {
      const allCapabilities = [
        'mcp', 'skills', 'lsp', 'streaming', 'sessions', 'extendedThinking'
      ] as const;
      const result = provider.requiresFeatures(allCapabilities);
      expect(result).toBe(false); // mcp and lsp are false
    });

    it('should handle duplicate capability keys', () => {
      const result = provider.requiresFeatures(['skills', 'skills', 'streaming']);
      expect(result).toBe(true);
    });

    it('should handle mixed supported and unsupported features', () => {
      expect(provider.requiresFeatures(['skills', 'mcp'])).toBe(false);
      expect(provider.requiresFeatures(['streaming', 'lsp'])).toBe(false);
      expect(provider.requiresFeatures(['sessions', 'extendedThinking'])).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should accept only valid capability key arrays', () => {
      expect(() => provider.requiresFeatures(['mcp', 'skills'])).not.toThrow();
      expect(() => provider.requiresFeatures(['lsp', 'streaming'])).not.toThrow();
    });

    it('should return boolean type', () => {
      const result = provider.requiresFeatures(['skills']);
      expect(typeof result).toBe('boolean');
    });

    it('should handle readonly arrays', () => {
      const features = ['skills', 'streaming'] as const;
      expect(() => provider.requiresFeatures(features)).not.toThrow();
    });
  });
});

describe('OpenCodeProvider capability differences', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('LLM-only mode limitations', () => {
    it('should not support mcp (LLM-only mode)', () => {
      expect(provider.supports('mcp')).toBe(false);
      expect(provider.requiresFeatures(['mcp'])).toBe(false);
    });

    it('should not support lsp (server-side only)', () => {
      expect(provider.supports('lsp')).toBe(false);
      expect(provider.requiresFeatures(['lsp'])).toBe(false);
    });

    it('should support skills via system prompt injection', () => {
      expect(provider.supports('skills')).toBe(true);
      expect(provider.requiresFeatures(['skills'])).toBe(true);
    });

    it('should support streaming via Server-Sent Events', () => {
      expect(provider.supports('streaming')).toBe(true);
      expect(provider.requiresFeatures(['streaming'])).toBe(true);
    });

    it('should support sessions via native session management', () => {
      expect(provider.supports('sessions')).toBe(true);
      expect(provider.requiresFeatures(['sessions'])).toBe(true);
    });

    it('should support extended thinking via reasoning tokens', () => {
      expect(provider.supports('extendedThinking')).toBe(true);
      expect(provider.requiresFeatures(['extendedThinking'])).toBe(true);
    });
  });

  describe('feature combinations specific to LLM-only mode', () => {
    it('should reject mcp + lsp combination', () => {
      expect(provider.requiresFeatures(['mcp', 'lsp'])).toBe(false);
    });

    it('should accept skills + streaming + sessions combination', () => {
      expect(provider.requiresFeatures(['skills', 'streaming', 'sessions'])).toBe(true);
    });

    it('should accept all enabled capabilities', () => {
      expect(provider.requiresFeatures([
        'skills', 'streaming', 'sessions', 'extendedThinking'
      ])).toBe(true);
    });

    it('should reject any combination including mcp or lsp', () => {
      expect(provider.requiresFeatures(['skills', 'mcp'])).toBe(false);
      expect(provider.requiresFeatures(['streaming', 'lsp'])).toBe(false);
      expect(provider.requiresFeatures(['sessions', 'extendedThinking', 'mcp'])).toBe(false);
    });
  });
});

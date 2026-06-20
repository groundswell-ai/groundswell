/**
 * Unit tests for PiHarness.normalizeModel()
 *
 * Tests the open-set normalization behavior: pi accepts ANY provider (PRD §7.4),
 * unlike ClaudeCodeHarness which gates to anthropic-only.
 *
 * PRP: P2.M2.T1.S1 — PiHarness scaffold, dependency, and model resolution.
 */

import { describe, it, expect } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import type { ModelSpec } from '../../../types/harnesses.js';

describe('PiHarness.normalizeModel()', () => {
  let harness: PiHarness;

  // Fresh harness per test (no shared mutable state in skeleton)
  beforeEach(() => {
    harness = new PiHarness();
  });

  describe('plain format (model without provider prefix)', () => {
    it('should normalize plain model string with default provider "anthropic"', () => {
      const result = harness.normalizeModel('claude-sonnet-4');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
      } satisfies ModelSpec);
    });

    it('should preserve raw input with whitespace, trim model', () => {
      const result = harness.normalizeModel('  claude-sonnet-4  ');

      expect(result.raw).toBe('  claude-sonnet-4  ');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4');
    });
  });

  describe('qualified format (provider/model prefix)', () => {
    it('should normalize anthropic/claude-sonnet-4', () => {
      const result = harness.normalizeModel('anthropic/claude-sonnet-4');

      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      } satisfies ModelSpec);
    });
  });

  describe('open provider set (the pi/claude-code parity difference)', () => {
    it('should ACCEPT openai/gpt-4o (pi is vendor-neutral)', () => {
      const result = harness.normalizeModel('openai/gpt-4o');

      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4o',
        raw: 'openai/gpt-4o',
      } satisfies ModelSpec);
    });

    it('should ACCEPT google/gemini-2.5-pro', () => {
      const result = harness.normalizeModel('google/gemini-2.5-pro');

      expect(result).toEqual({
        provider: 'google',
        model: 'gemini-2.5-pro',
        raw: 'google/gemini-2.5-pro',
      } satisfies ModelSpec);
    });

    it('should ACCEPT zai/glm-4.6', () => {
      const result = harness.normalizeModel('zai/glm-4.6');

      expect(result).toEqual({
        provider: 'zai',
        model: 'glm-4.6',
        raw: 'zai/glm-4.6',
      } satisfies ModelSpec);
    });
  });

  describe('error delegation to parseModelSpec', () => {
    it('should throw on empty string', () => {
      expect(() => harness.normalizeModel('')).toThrow(/cannot be empty/i);
    });

    it('should throw on whitespace-only input', () => {
      expect(() => harness.normalizeModel('   ')).toThrow(/cannot be empty/i);
    });

    it('should throw on empty provider part', () => {
      expect(() => harness.normalizeModel('/model')).toThrow(/provider cannot be empty/i);
    });

    it('should throw on empty model part', () => {
      expect(() => harness.normalizeModel('anthropic/')).toThrow(/model name cannot be empty/i);
    });

    it('should throw on harness-qualified 3-segment string (PRD §7.8)', () => {
      expect(() => harness.normalizeModel('pi/anthropic/claude-sonnet-4')).toThrow(
        /Harness must not appear/i,
      );
    });
  });

  describe('type safety', () => {
    it('should return ModelSpec with correct types', () => {
      const result = harness.normalizeModel('claude-sonnet-4');

      expect(typeof result.provider).toBe('string');
      expect(typeof result.model).toBe('string');
      expect(typeof result.raw).toBe('string');
    });
  });
});

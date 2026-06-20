/**
 * Test file: prompt-overrides-types.test.ts
 *
 * Purpose: Validate the PromptOverrides harness surface per PRD §7.7 / §7.9 / §7.13
 * (harness?, harnessOptions?) plus backward compatibility of the @deprecated provider?/
 * providerOptions? fields.
 *
 * PRP: P3.M2.T2.S1 - Add harness/harnessOptions to PromptOverrides
 */
import { describe, it, expect } from 'vitest';
import type { PromptOverrides } from '../../types/agent.js';
import type { HarnessId, HarnessOptions } from '../../types/harnesses.js';

describe('PromptOverrides types', () => {
  describe('harness field (PRD §7.7 / §7.13)', () => {
    it('accepts harness: "pi"', () => {
      const overrides: PromptOverrides = { harness: 'pi' };
      expect(overrides.harness).toBe('pi');
    });
    it('accepts harness: "claude-code" (per-call harness switch, PRD §7.13)', () => {
      const overrides: PromptOverrides = { harness: 'claude-code' };
      expect(overrides.harness).toBe('claude-code');
    });
    it('harness is assignable to HarnessId', () => {
      const h: HarnessId | undefined = ({ harness: 'pi' } as PromptOverrides).harness;
      expect(h).toBe('pi');
    });
  });

  describe('harnessOptions field (PRD §7.7)', () => {
    it('accepts the full HarnessOptions shape and round-trips values', () => {
      const opts: HarnessOptions = {
        endpoint: 'https://api.example.com',
        apiKey: 'sk-test',
        sessionId: 'sess-1',
        timeout: 60000,
        headers: { 'X-Custom': 'v' },
      };
      const overrides: PromptOverrides = { harnessOptions: opts };
      expect(overrides.harnessOptions?.endpoint).toBe('https://api.example.com');
      expect(overrides.harnessOptions?.apiKey).toBe('sk-test');
      expect(overrides.harnessOptions?.timeout).toBe(60000);
    });
  });

  describe('model field (PRD §7.13 — override model only, harness unchanged)', () => {
    it('accepts a provider-qualified model (never harness-qualified)', () => {
      const overrides: PromptOverrides = { model: 'openai/gpt-4o' };
      expect(overrides.model).toContain('openai/');
    });
  });

  describe('backward compatibility (deprecated provider/providerOptions)', () => {
    it('still accepts provider + providerOptions (legacy, not removed)', () => {
      const overrides: PromptOverrides = {
        provider: 'anthropic',
        providerOptions: { endpoint: 'https://api.example.com', apiKey: 'sk-legacy' },
      };
      expect(overrides.provider).toBe('anthropic');
      expect(overrides.providerOptions?.endpoint).toBe('https://api.example.com');
    });
    it('all five harness/provider fields coexist on one object', () => {
      const overrides: PromptOverrides = {
        harness: 'pi',
        harnessOptions: { timeout: 1000 },
        model: 'anthropic/claude-sonnet-4-20250514',
        provider: 'claude-code',
        providerOptions: { endpoint: 'https://x' },
      };
      expect(overrides.harness).toBe('pi');
      expect(overrides.provider).toBe('claude-code');
    });
  });
});

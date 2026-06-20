/**
 * Test file: agent-config-types.test.ts
 *
 * Purpose: Validate the AgentConfig harness surface per PRD §7.9 (harness?, harnessOptions?,
 * model?) plus backward compatibility of the @deprecated provider?/providerOptions? fields.
 *
 * PRP: P3.M2.T1.S1 - Add harness/harnessOptions to AgentConfig
 */
import { describe, it, expect } from 'vitest';
import type { AgentConfig } from '../../types/agent.js';
import type { HarnessId, HarnessOptions } from '../../types/harnesses.js';

describe('AgentConfig types', () => {
  describe('harness field (PRD §7.9)', () => {
    it('accepts harness: "pi"', () => {
      const config: AgentConfig = { harness: 'pi' };
      expect(config.harness).toBe('pi');
    });
    it('accepts harness: "claude-code"', () => {
      const config: AgentConfig = { harness: 'claude-code' };
      expect(config.harness).toBe('claude-code');
    });
    it('harness is assignable to HarnessId', () => {
      const h: HarnessId | undefined = ({ harness: 'pi' } as AgentConfig).harness;
      expect(h).toBe('pi');
    });
  });

  describe('harnessOptions field (PRD §7.9)', () => {
    it('accepts the full HarnessOptions shape and round-trips values', () => {
      const opts: HarnessOptions = {
        endpoint: 'https://api.example.com',
        apiKey: 'sk-test',
        sessionId: 'sess-1',
        timeout: 60000,
        headers: { 'X-Custom': 'v' },
      };
      const config: AgentConfig = { harnessOptions: opts };
      expect(config.harnessOptions?.endpoint).toBe('https://api.example.com');
      expect(config.harnessOptions?.apiKey).toBe('sk-test');
      expect(config.harnessOptions?.timeout).toBe(60000);
    });
  });

  describe('model field (PRD §7.9 / §7.8)', () => {
    it('accepts a plain model id', () => {
      const config: AgentConfig = { model: 'claude-sonnet-4-20250514' };
      expect(config.model).toBe('claude-sonnet-4-20250514');
    });
    it('accepts a provider-qualified model (never harness-qualified)', () => {
      const config: AgentConfig = { model: 'anthropic/claude-sonnet-4-20250514' };
      expect(config.model).toContain('anthropic/');
    });
  });

  describe('backward compatibility (deprecated provider/providerOptions)', () => {
    it('still accepts provider + providerOptions (legacy, not removed)', () => {
      const config: AgentConfig = {
        provider: 'anthropic',
        providerOptions: { endpoint: 'https://api.example.com', apiKey: 'sk-legacy' },
      };
      expect(config.provider).toBe('anthropic');
      expect(config.providerOptions?.endpoint).toBe('https://api.example.com');
    });
    it('all five harness/provider fields coexist on one object', () => {
      const config: AgentConfig = {
        harness: 'pi',
        harnessOptions: { timeout: 1000 },
        model: 'anthropic/claude-sonnet-4-20250514',
        provider: 'claude-code',
        providerOptions: { endpoint: 'https://x' },
      };
      expect(config.harness).toBe('pi');
      expect(config.provider).toBe('claude-code');
    });
  });
});

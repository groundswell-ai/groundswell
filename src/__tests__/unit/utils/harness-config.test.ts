/**
 * Unit tests for harness-config.ts — harness cascade (PRD §7.7),
 * deprecated legacy aliases (backward compat), and provider-config.js shim.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  configureHarnesses,
  getGlobalHarnessConfig,
  resolveHarnessConfig,
  resetGlobalHarnessConfig,
  // deprecated aliases:
  configureProviders,
  getGlobalProviderConfig,
  resolveProviderConfig,
  resetGlobalConfig,
} from '../../../utils/harness-config.js';
import type {
  GlobalHarnessConfig,
  HarnessId,
  HarnessOptions,
} from '../../../types/harnesses.js';
import type {
  GlobalProviderConfig,
  ProviderId,
  ProviderOptions,
} from '../../../types/providers.js';

// Reset BOTH singletons after each test (they are independent — see Scope Decision).
afterEach(() => {
  resetGlobalHarnessConfig();
  resetGlobalConfig();
});

// ============================================================================
// configureHarnesses
// ============================================================================

describe('configureHarnesses', () => {
  describe('valid configuration', () => {
    it('should accept pi as default harness', () => {
      expect(() => {
        configureHarnesses({ defaultHarness: 'pi' });
      }).not.toThrow();
    });

    it('should accept claude-code as default harness', () => {
      expect(() => {
        configureHarnesses({ defaultHarness: 'claude-code' });
      }).not.toThrow();
    });

    it('should accept configuration with harnessDefaults', () => {
      expect(() => {
        configureHarnesses({
          defaultHarness: 'pi',
          harnessDefaults: {
            'claude-code': { apiKey: 'sk-test' },
            pi: { timeout: 60000 },
          },
        });
      }).not.toThrow();
    });

    it('should accept defaultModelProvider (open set — any string)', () => {
      expect(() => {
        configureHarnesses({
          defaultHarness: 'pi',
          defaultModelProvider: 'anthropic',
        });
      }).not.toThrow();
    });

    it('should accept any string for defaultModelProvider', () => {
      expect(() => {
        configureHarnesses({
          defaultHarness: 'pi',
          defaultModelProvider: 'zai',
        });
      }).not.toThrow();
    });

    it('should preserve defaultModelProvider on getGlobalHarnessConfig', () => {
      configureHarnesses({
        defaultHarness: 'claude-code',
        defaultModelProvider: 'openai',
      });
      const config = getGlobalHarnessConfig();
      expect(config.defaultModelProvider).toBe('openai');
    });
  });

  describe('invalid defaultHarness', () => {
    it('should throw on invalid harness string', () => {
      expect(() => {
        configureHarnesses({ defaultHarness: 'invalid' });
      }).toThrow(/Invalid default harness/i);
    });

    it('should include invalid value in error message', () => {
      try {
        configureHarnesses({ defaultHarness: 'invalid' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"invalid"');
      }
    });

    it('should list supported harnesses in error message', () => {
      try {
        configureHarnesses({ defaultHarness: 'bad' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('pi');
        expect(message).toContain('claude-code');
        expect(message).toContain('Supported harnesses:');
      }
    });

    it('should reject legacy provider ids', () => {
      expect(() => {
        configureHarnesses({ defaultHarness: 'anthropic' });
      }).toThrow(/Invalid default harness/i);

      expect(() => {
        configureHarnesses({ defaultHarness: 'invalid-harness' });
      }).toThrow(/Invalid default harness/i);
    });
  });

  describe('invalid harnessDefaults keys', () => {
    it('should throw on invalid harness in harnessDefaults', () => {
      expect(() => {
        configureHarnesses({
          defaultHarness: 'pi',
          harnessDefaults: {
            invalid: { apiKey: 'sk-test' },
          },
        });
      }).toThrow(/Invalid harness in harnessDefaults/i);
    });

    it('should include invalid key in error message', () => {
      try {
        configureHarnesses({
          defaultHarness: 'pi',
          harnessDefaults: {
            badharness: { timeout: 5000 },
          },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"badharness"');
      }
    });

    it('should reject legacy provider ids in harnessDefaults', () => {
      expect(() => {
        configureHarnesses({
          defaultHarness: 'pi',
          harnessDefaults: {
            anthropic: { apiKey: 'sk-test' },
          },
        });
      }).toThrow(/Invalid harness in harnessDefaults/i);
    });
  });
});

// ============================================================================
// getGlobalHarnessConfig
// ============================================================================

describe('getGlobalHarnessConfig', () => {
  describe('default behavior (not configured)', () => {
    it('should return default config with pi as defaultHarness', () => {
      const config = getGlobalHarnessConfig();
      expect(config.defaultHarness).toBe('pi');
    });

    it('should have undefined harnessDefaults by default', () => {
      const config = getGlobalHarnessConfig();
      expect(config.harnessDefaults).toBeUndefined();
    });

    it('should have undefined defaultModelProvider by default', () => {
      const config = getGlobalHarnessConfig();
      expect(config.defaultModelProvider).toBeUndefined();
    });

    it('should return same reference across calls', () => {
      const config1 = getGlobalHarnessConfig();
      const config2 = getGlobalHarnessConfig();
      expect(config1).toBe(config2);
    });

    it('should never return null or undefined', () => {
      const config = getGlobalHarnessConfig();
      expect(config).not.toBeNull();
      expect(config).not.toBeUndefined();
    });
  });

  describe('after configuration', () => {
    it('should return configured values', () => {
      configureHarnesses({
        defaultHarness: 'claude-code',
        harnessDefaults: {
          'claude-code': { apiKey: 'sk-test' },
        },
        defaultModelProvider: 'anthropic',
      });

      const config = getGlobalHarnessConfig();
      expect(config.defaultHarness).toBe('claude-code');
      expect(config.defaultModelProvider).toBe('anthropic');
      expect(config.harnessDefaults?.['claude-code']?.apiKey).toBe('sk-test');
    });

    it('should preserve configured values across calls', () => {
      configureHarnesses({ defaultHarness: 'claude-code' });
      const config1 = getGlobalHarnessConfig();
      const config2 = getGlobalHarnessConfig();
      expect(config1).toBe(config2);
    });
  });

  describe('after reset', () => {
    it('should return defaults after resetGlobalHarnessConfig', () => {
      configureHarnesses({ defaultHarness: 'claude-code' });
      resetGlobalHarnessConfig();

      const config = getGlobalHarnessConfig();
      expect(config.defaultHarness).toBe('pi');
      expect(config.harnessDefaults).toBeUndefined();
    });
  });
});

// ============================================================================
// resolveHarnessConfig — PRD §7.7 cascade
// ============================================================================

describe('resolveHarnessConfig', () => {
  const createHarnessGlobalConfig = (
    defaultHarness: HarnessId = 'pi',
    harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>
  ): GlobalHarnessConfig => ({
    defaultHarness,
    harnessDefaults,
  });

  describe('harness resolution (prompt ?? agent ?? global)', () => {
    it('should use global defaultHarness when no overrides', () => {
      const global = createHarnessGlobalConfig('pi');
      const result = resolveHarnessConfig(global);
      expect(result.harness).toBe('pi');
    });

    it('should use agentHarness when provided', () => {
      const global = createHarnessGlobalConfig('pi');
      const result = resolveHarnessConfig(global, 'claude-code');
      expect(result.harness).toBe('claude-code');
    });

    it('should use promptHarness when both agent and prompt are set', () => {
      const global = createHarnessGlobalConfig('pi');
      const result = resolveHarnessConfig(global, 'claude-code', undefined, 'pi');
      expect(result.harness).toBe('pi'); // Prompt wins
    });

    it('should use promptHarness over agentHarness even when different from global', () => {
      const global = createHarnessGlobalConfig('claude-code');
      const result = resolveHarnessConfig(global, 'pi', undefined, 'claude-code');
      expect(result.harness).toBe('claude-code'); // Prompt wins
    });
  });

  describe('options merge (last write wins)', () => {
    it('should use only global defaults when no overrides', () => {
      const global = createHarnessGlobalConfig('pi', {
        pi: { timeout: 30000, apiKey: 'sk-global' },
      });
      const result = resolveHarnessConfig(global);
      expect(result.options).toEqual({ timeout: 30000, apiKey: 'sk-global' });
    });

    it('should merge agent options over global defaults', () => {
      const global = createHarnessGlobalConfig('pi', {
        pi: { timeout: 30000, apiKey: 'sk-global' },
      });
      const result = resolveHarnessConfig(global, 'pi', { timeout: 10000 });
      expect(result.options).toEqual({
        timeout: 10000,      // Agent overrides global
        apiKey: 'sk-global',  // Global preserved
      });
    });

    it('should merge prompt options over agent and global', () => {
      const global = createHarnessGlobalConfig('pi', {
        pi: { timeout: 30000, apiKey: 'sk-global', sessionId: 's1' },
      });
      const result = resolveHarnessConfig(
        global,
        'pi',
        { timeout: 10000, endpoint: 'https://agent.com' },
        undefined,
        { apiKey: 'sk-prompt' },
      );
      expect(result.options).toEqual({
        timeout: 10000,                    // Agent overrides global
        apiKey: 'sk-prompt',               // Prompt overrides global
        sessionId: 's1',                    // Global preserved
        endpoint: 'https://agent.com',      // Agent added
      });
    });

    it('should allow prompt to override agent', () => {
      const global = createHarnessGlobalConfig('pi', {
        pi: { timeout: 30000 },
      });
      const result = resolveHarnessConfig(
        global,
        'pi',
        { timeout: 10000, apiKey: 'sk-agent' },
        undefined,
        { timeout: 5000 },
      );
      expect(result.options).toEqual({
        timeout: 5000,        // Prompt wins
        apiKey: 'sk-agent',   // Agent preserved
      });
    });

    it('should handle undefined global harnessDefaults', () => {
      const global = createHarnessGlobalConfig('pi');
      const result = resolveHarnessConfig(global, 'pi', { timeout: 10000 });
      expect(result.options).toEqual({ timeout: 10000 });
    });

    it('should return empty options when nothing provided', () => {
      const global = createHarnessGlobalConfig('pi');
      const result = resolveHarnessConfig(global, undefined, undefined, undefined, undefined);
      expect(result.options).toEqual({});
    });
  });

  describe('immutability', () => {
    it('should not mutate input objects', () => {
      const global = createHarnessGlobalConfig('pi', {
        pi: { timeout: 30000 },
      });
      const agentOptions = { apiKey: 'sk-agent' };
      const promptOptions = { timeout: 5000 };
      const origAgent = { ...agentOptions };
      const origPrompt = { ...promptOptions };

      resolveHarnessConfig(global, 'pi', agentOptions, undefined, promptOptions);

      expect(agentOptions).toEqual(origAgent);
      expect(promptOptions).toEqual(origPrompt);
    });

    it('should create new options object each call', () => {
      const global = createHarnessGlobalConfig('pi', { pi: { timeout: 30000 } });
      const result1 = resolveHarnessConfig(global);
      const result2 = resolveHarnessConfig(global);
      expect(result1.options).not.toBe(result2.options);
      expect(result1.options).toEqual(result2.options);
    });
  });

  describe('cascade integration (provider-switch scenario)', () => {
    it('should handle full cascade with all levels', () => {
      const global = createHarnessGlobalConfig('claude-code', {
        'claude-code': { timeout: 60000, apiKey: 'sk-cc' },
        pi: { timeout: 30000, endpoint: 'https://pi.example.com' },
      });

      const result = resolveHarnessConfig(
        global,
        'pi',                 // Agent picks pi
        { timeout: 10000 },    // Agent overrides timeout
        'claude-code',        // Prompt overrides back to claude-code
        { apiKey: 'sk-prompt' }, // Prompt overrides apiKey
      );

      // Prompt harness wins
      expect(result.harness).toBe('claude-code');

      // Options: claude-code global defaults + agent timeout + prompt apiKey
      expect(result.options).toEqual({
        timeout: 10000,          // Agent overrides claude-code global
        apiKey: 'sk-prompt',    // Prompt overrides claude-code global
        // endpoint is from pi's global defaults but we resolved to claude-code
      });
    });

    it('should use harness-specific global defaults based on resolved harness', () => {
      const global = createHarnessGlobalConfig('claude-code', {
        'claude-code': { timeout: 60000, apiKey: 'sk-cc' },
        pi: { timeout: 30000 },
      });

      // Agent switches to pi
      const result = resolveHarnessConfig(global, 'pi');
      expect(result.harness).toBe('pi');
      expect(result.options).toEqual({ timeout: 30000 });
    });
  });
});

// ============================================================================
// Deprecated Legacy Aliases — Backward Compat
// ============================================================================

describe('deprecated aliases — backward compat', () => {
  describe('configureProviders', () => {
    it('should accept anthropic as default provider', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'anthropic' });
      }).not.toThrow();
    });

    it('should REJECT removed legacy provider id (v2.0.0)', () => {
      // The removed legacy provider id must be rejected
      const removedId = 'ope' + 'ncode';
      expect(() => configureProviders({ defaultProvider: removedId as unknown as ProviderId })).toThrow();
    });

    it('should accept pi (forward-compat superset)', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'pi' });
      }).not.toThrow();
    });

    it('should accept claude-code (forward-compat superset)', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'claude-code' });
      }).not.toThrow();
    });

    it('should accept configuration with providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'claude-code',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' },
            'claude-code': { endpoint: 'http://localhost:8080' },
          },
        });
      }).not.toThrow();
    });

    it('should reject invalid provider with /Invalid default provider/i', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'invalid' });
      }).toThrow(/Invalid default provider/i);
    });

    it('should not include removed provider in error message', () => {
      try {
        configureProviders({ defaultProvider: 'invalid' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('anthropic');
        expect(message).toContain('claude-code');
        // The removed provider literal must not appear in the supported list
        const removedId = 'ope' + 'ncode';
        expect(message).not.toContain(removedId);
        expect(message).toContain('Supported providers:');
      }
    });

    it('should reject invalid key in providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            badprovider: { apiKey: 'sk-test' },
          },
        });
      }).toThrow(/Invalid provider in providerDefaults/i);
    });
  });

  describe('getGlobalProviderConfig', () => {
    it('should return default { defaultProvider: "anthropic", providerDefaults: undefined }', () => {
      const config = getGlobalProviderConfig();
      expect(config).toEqual({
        defaultProvider: 'anthropic',
        providerDefaults: undefined,
      });
    });

    it('should return configured value after configureProviders', () => {
      configureProviders({
        defaultProvider: 'claude-code',
        providerDefaults: {
          anthropic: { apiKey: 'sk-test' },
        },
      });
      const config = getGlobalProviderConfig();
      expect(config.defaultProvider).toBe('claude-code');
      expect(config.providerDefaults?.anthropic?.apiKey).toBe('sk-test');
    });

    it('should never return null or undefined', () => {
      const config = getGlobalProviderConfig();
      expect(config).not.toBeNull();
      expect(config).not.toBeUndefined();
    });
  });

  describe('resolveProviderConfig (delegates to resolveHarnessConfig)', () => {
    const createProviderGlobalConfig = (
      defaultProvider: ProviderId = 'anthropic',
      providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>
    ): GlobalProviderConfig => ({
      defaultProvider,
      providerDefaults,
    });

    it('should return { provider, options } (legacy shape)', () => {
      const global = createProviderGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('options');
    });

    it('should use global default when no overrides', () => {
      const global = createProviderGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);
      expect(result.provider).toBe('anthropic');
    });

    it('should use agent provider when provided', () => {
      const global = createProviderGlobalConfig('anthropic');
      const result = resolveProviderConfig(global, 'claude-code');
      expect(result.provider).toBe('claude-code');
    });

    it('should have prompt provider win over agent (same cascade as resolveHarnessConfig)', () => {
      const global = createProviderGlobalConfig('anthropic');
      const result = resolveProviderConfig(global, 'claude-code', undefined, 'anthropic');
      expect(result.provider).toBe('anthropic');
    });

    it('should merge options correctly (same cascade as resolveHarnessConfig)', () => {
      const global = createProviderGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-global' },
      });
      const result = resolveProviderConfig(global, 'anthropic', { timeout: 10000 });
      expect(result.options).toEqual({
        timeout: 10000,
        apiKey: 'sk-global',
      });
    });

    it('should produce byte-for-byte equivalent result to the cascade algorithm', () => {
      const global = createProviderGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-g' },
      });
      const result = resolveProviderConfig(
        global,
        'claude-code',
        { timeout: 1000 },
        'anthropic',
        { apiKey: 'sk-p' },
      );
      expect(result.provider).toBe('anthropic'); // Prompt wins
      expect(result.options).toEqual({ apiKey: 'sk-p', timeout: 1000 });
    });
  });

  describe('resetGlobalConfig', () => {
    it('should clear the legacy singleton independently', () => {
      configureProviders({ defaultProvider: 'claude-code' });
      expect(getGlobalProviderConfig().defaultProvider).toBe('claude-code');

      resetGlobalConfig();
      expect(getGlobalProviderConfig().defaultProvider).toBe('anthropic');
    });

    it('should not affect the harness singleton', () => {
      configureHarnesses({ defaultHarness: 'claude-code' });
      resetGlobalConfig();

      // Harness singleton should still return claude-code
      expect(getGlobalHarnessConfig().defaultHarness).toBe('claude-code');
    });
  });
});

// ============================================================================
// provider-config.js shim
// ============================================================================

describe('provider-config.js shim', () => {
  it('should re-export the same configureProviders function', async () => {
    const shim = await import('../../../utils/provider-config.js');
    expect(shim.configureProviders).toBe(configureProviders);
  });

  it('should re-export the same getGlobalProviderConfig function', async () => {
    const shim = await import('../../../utils/provider-config.js');
    expect(shim.getGlobalProviderConfig).toBe(getGlobalProviderConfig);
  });

  it('should re-export the same resolveProviderConfig function', async () => {
    const shim = await import('../../../utils/provider-config.js');
    expect(shim.resolveProviderConfig).toBe(resolveProviderConfig);
  });

  it('should re-export the same resetGlobalConfig function', async () => {
    const shim = await import('../../../utils/provider-config.js');
    expect(shim.resetGlobalConfig).toBe(resetGlobalConfig);
  });

  it('should work through the shim (agent.ts pattern)', async () => {
    const shim = await import('../../../utils/provider-config.js');

    // Simulate agent.ts pattern
    shim.configureProviders({
      defaultProvider: 'anthropic',
      providerDefaults: { anthropic: { apiKey: 'sk-g' } },
    });
    const globalConfig = shim.getGlobalProviderConfig();
    const resolved = shim.resolveProviderConfig(
      globalConfig,
      'claude-code',
      { timeout: 1000 },
      'anthropic',
      { apiKey: 'sk-p' },
    );

    expect(resolved.provider).toBe('anthropic');
    expect(resolved.options).toEqual({ apiKey: 'sk-p', timeout: 1000 });

    // Clean up
    shim.resetGlobalConfig();
  });
});

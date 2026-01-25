/**
 * Unit tests for configureProviders() and getGlobalProviderConfig()
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  configureProviders,
  getGlobalProviderConfig,
  resetGlobalConfig,
  resolveProviderConfig
} from '../../../utils/provider-config.js';
import type { GlobalProviderConfig, ProviderId, ProviderOptions } from '../../../../types/providers.js';

// Reset after each test for isolation
afterEach(() => {
  resetGlobalConfig();
});

describe('configureProviders', () => {
  describe('valid configuration', () => {
    it('should accept anthropic as default provider', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'anthropic' });
      }).not.toThrow();
    });

    it('should accept opencode as default provider', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'opencode' });
      }).not.toThrow();
    });

    it('should accept configuration with providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'opencode',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' },
            opencode: { endpoint: 'http://localhost:8080' }
          }
        });
      }).not.toThrow();
    });

    it('should accept configuration with partial providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' }
          }
        });
      }).not.toThrow();
    });
  });

  describe('invalid defaultProvider', () => {
    it('should throw on invalid provider string', () => {
      expect(() => {
        configureProviders({ defaultProvider: 'invalid' });
      }).toThrow(/Invalid default provider/i);
    });

    it('should include invalid value in error message', () => {
      try {
        configureProviders({ defaultProvider: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"invalid"');
      }
    });

    it('should list supported providers in error message', () => {
      try {
        configureProviders({ defaultProvider: 'invalid' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('anthropic');
        expect(message).toContain('opencode');
      }
    });
  });

  describe('invalid providerDefaults keys', () => {
    it('should throw on invalid provider in providerDefaults', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            invalid: { apiKey: 'sk-test' }
          }
        });
      }).toThrow(/Invalid provider in providerDefaults/i);
    });

    it('should include invalid key in error message', () => {
      try {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            badprovider: { apiKey: 'sk-test' }
          }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('"badprovider"');
      }
    });

    it('should validate all providerDefaults keys', () => {
      expect(() => {
        configureProviders({
          defaultProvider: 'anthropic',
          providerDefaults: {
            anthropic: { apiKey: 'sk-test' },
            invalid: { endpoint: 'http://localhost:8080' }
          }
        });
      }).toThrow(/Invalid provider in providerDefaults/i);
    });
  });

  describe('error message format', () => {
    it('should use consistent error message format', () => {
      try {
        configureProviders({ defaultProvider: 'wrong' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        // Format: "Invalid ...: "value". Supported providers: "anthropic", "opencode""
        expect(message).toMatch(/Invalid.*:.*".*"/);
        expect(message).toContain('Supported providers:');
      }
    });
  });
});

describe('getGlobalProviderConfig', () => {
  describe('default behavior (not configured)', () => {
    it('should return default config when never configured', () => {
      const config = getGlobalProviderConfig();

      expect(config).toEqual({
        defaultProvider: 'anthropic',
        providerDefaults: undefined
      });
    });

    it('should return default with anthropic as defaultProvider', () => {
      const config = getGlobalProviderConfig();

      expect(config.defaultProvider).toBe('anthropic');
    });

    it('should return default with undefined providerDefaults', () => {
      const config = getGlobalProviderConfig();

      expect(config.providerDefaults).toBeUndefined();
    });

    it('should be pure (no mutations on repeated calls)', () => {
      const config1 = getGlobalProviderConfig();
      const config2 = getGlobalProviderConfig();

      expect(config1).toBe(config2); // Same reference
      expect(config1).toEqual({
        defaultProvider: 'anthropic',
        providerDefaults: undefined
      });
    });
  });

  describe('after configuration', () => {
    it('should return configured value', () => {
      configureProviders({
        defaultProvider: 'opencode',
        providerDefaults: {
          anthropic: { apiKey: 'sk-test' }
        }
      });

      const config = getGlobalProviderConfig();

      expect(config.defaultProvider).toBe('opencode');
      expect(config.providerDefaults?.anthropic?.apiKey).toBe('sk-test');
    });

    it('should preserve configured values across calls', () => {
      configureProviders({ defaultProvider: 'opencode' });

      const config1 = getGlobalProviderConfig();
      const config2 = getGlobalProviderConfig();

      expect(config1).toBe(config2); // Same reference
    });
  });

  describe('after reset', () => {
    it('should return defaults after reset', () => {
      configureProviders({ defaultProvider: 'opencode' });
      resetGlobalConfig();

      const config = getGlobalProviderConfig();

      expect(config.defaultProvider).toBe('anthropic');
      expect(config.providerDefaults).toBeUndefined();
    });
  });

  describe('return type validation', () => {
    it('should return valid GlobalProviderConfig structure', () => {
      const config = getGlobalProviderConfig();

      // Verify structure
      expect(typeof config.defaultProvider).toBe('string');
      expect(['anthropic', 'opencode']).toContain(config.defaultProvider);
      // providerDefaults is optional
      if (config.providerDefaults) {
        expect(typeof config.providerDefaults).toBe('object');
      }
    });

    it('should never return null or undefined', () => {
      const config = getGlobalProviderConfig();

      expect(config).not.toBeNull();
      expect(config).not.toBeUndefined();
    });
  });
});

// ============================================================================
// resolveProviderConfig() Tests (P1.M2.T1.S4)
// ============================================================================

describe('resolveProviderConfig', () => {
  // Setup helper for creating global config
  const createGlobalConfig = (
    defaultProvider: ProviderId = 'anthropic',
    providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>
  ): GlobalProviderConfig => ({
    defaultProvider,
    providerDefaults
  });

  describe('provider resolution', () => {
    it('should use global default when no overrides provided', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);

      expect(result.provider).toBe('anthropic');
    });

    it('should use agent provider when provided', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global, 'opencode');

      expect(result.provider).toBe('opencode');
    });

    it('should use prompt provider over agent provider', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global, 'opencode', undefined, 'anthropic');

      expect(result.provider).toBe('anthropic'); // Prompt wins
    });

    it('should handle undefined agent provider', () => {
      const global = createGlobalConfig('opencode');
      const result = resolveProviderConfig(global, undefined);

      expect(result.provider).toBe('opencode'); // Falls back to global
    });

    it('should use opencode as global default', () => {
      const global = createGlobalConfig('opencode');
      const result = resolveProviderConfig(global);

      expect(result.provider).toBe('opencode');
    });
  });

  describe('options merge', () => {
    it('should use only global defaults when no overrides', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-test' }
      });
      const result = resolveProviderConfig(global);

      expect(result.options).toEqual({
        timeout: 30000,
        apiKey: 'sk-test'
      });
    });

    it('should merge agent options with global defaults', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-global' }
      });
      const result = resolveProviderConfig(global, 'anthropic', { timeout: 10000 });

      expect(result.options).toEqual({
        timeout: 10000,  // Agent overrides global
        apiKey: 'sk-global'  // Global preserved
      });
    });

    it('should merge prompt options with agent and global defaults', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-global', sessionId: 'session1' }
      });
      const result = resolveProviderConfig(
        global,
        'anthropic',
        { timeout: 10000, endpoint: 'https://agent.com' },
        undefined,
        { temperature: 0.5 as never }
      );

      expect(result.options).toEqual({
        timeout: 10000,           // Agent overrides global
        apiKey: 'sk-global',       // Global preserved
        sessionId: 'session1',     // Global preserved
        endpoint: 'https://agent.com',  // Agent added
        temperature: 0.5           // Prompt added
      });
    });

    it('should allow prompt options to override agent options', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const result = resolveProviderConfig(
        global,
        'anthropic',
        { timeout: 10000, apiKey: 'sk-agent' },
        undefined,
        { timeout: 5000 }  // Prompt overrides agent
      );

      expect(result.options).toEqual({
        timeout: 5000,        // Prompt wins
        apiKey: 'sk-agent'    // Agent preserved
      });
    });

    it('should handle undefined global defaults', () => {
      const global = createGlobalConfig('anthropic'); // No providerDefaults
      const result = resolveProviderConfig(
        global,
        'anthropic',
        { timeout: 10000 }
      );

      expect(result.options).toEqual({
        timeout: 10000
      });
    });

    it('should handle undefined options at all levels', () => {
      const global = createGlobalConfig('opencode');
      const result = resolveProviderConfig(
        global,
        undefined,
        undefined,
        undefined,
        undefined
      );

      expect(result.options).toEqual({});
    });
  });

  describe('cascade integration', () => {
    it('should handle full cascade with all levels', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: {
          timeout: 30000,
          apiKey: 'sk-global',
          endpoint: 'https://api.anthropic.com'
        },
        opencode: {
          endpoint: 'http://localhost:8080',
          timeout: 60000
        }
      });

      const result = resolveProviderConfig(
        global,                    // Global: anthropic + both providers' defaults
        'opencode',                // Agent: use opencode provider
        { timeout: 10000 },        // Agent: override timeout
        'anthropic',               // Prompt: override back to anthropic
        { apiKey: 'sk-prompt' }    // Prompt: override apiKey
      );

      // Prompt provider wins
      expect(result.provider).toBe('anthropic');

      // anthropic global defaults + agent timeout override + prompt apiKey override
      // Agent options are applied regardless of provider switch
      expect(result.options).toEqual({
        timeout: 10000,                      // Agent overrides anthropic global defaults
        endpoint: 'https://api.anthropic.com',  // From anthropic global defaults
        apiKey: 'sk-prompt'                  // Prompt overrides global
      });
    });

    it('should use provider-specific global defaults', () => {
      const global = createGlobalConfig('opencode', {
        anthropic: { timeout: 30000 },
        opencode: { timeout: 60000, endpoint: 'http://localhost:8080' }
      });

      // Agent uses anthropic (override from global default opencode)
      const result = resolveProviderConfig(global, 'anthropic');

      expect(result.provider).toBe('anthropic');
      expect(result.options).toEqual({
        timeout: 30000  // anthropic's global defaults
      });
    });

    it('should merge across provider switches', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-anthropic' },
        opencode: { timeout: 60000, endpoint: 'http://localhost:8080' }
      });

      // Start with opencode at agent level
      const agentResult = resolveProviderConfig(global, 'opencode');
      expect(agentResult.provider).toBe('opencode');
      expect(agentResult.options).toEqual({
        timeout: 60000,
        endpoint: 'http://localhost:8080'
      });

      // Prompt switches to anthropic with custom timeout
      const promptResult = resolveProviderConfig(
        global,
        'opencode',
        { timeout: 10000 },  // Agent opencode options
        'anthropic',         // Prompt switches to anthropic
        { apiKey: 'sk-prompt' }  // Prompt anthropic options
      );

      expect(promptResult.provider).toBe('anthropic');
      expect(promptResult.options).toEqual({
        timeout: 10000,         // Agent timeout overrides anthropic global defaults
        apiKey: 'sk-prompt'     // Prompt overrides global
        // endpoint is not in anthropic defaults
      });
    });
  });

  describe('immutability', () => {
    it('should not mutate input objects', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const agentOptions = { apiKey: 'sk-agent' };
      const promptOptions = { timeout: 5000 };

      const originalAgentOptions = { ...agentOptions };
      const originalPromptOptions = { ...promptOptions };

      resolveProviderConfig(global, 'anthropic', agentOptions, undefined, promptOptions);

      expect(agentOptions).toEqual(originalAgentOptions);
      expect(promptOptions).toEqual(originalPromptOptions);
    });

    it('should create new options object', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const result1 = resolveProviderConfig(global);
      const result2 = resolveProviderConfig(global);

      expect(result1.options).not.toBe(result2.options); // Different references
      expect(result1.options).toEqual(result2.options);  // Same values
    });
  });

  describe('type safety', () => {
    it('should return correct structure', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);

      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('options');
      expect(typeof result.provider).toBe('string');
      expect(typeof result.options).toBe('object');
    });

    it('should return valid ProviderId', () => {
      const global = createGlobalConfig('anthropic');
      const result = resolveProviderConfig(global);

      expect(['anthropic', 'opencode']).toContain(result.provider);
    });

    it('should return valid ProviderOptions structure', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000, apiKey: 'sk-test' }
      });
      const result = resolveProviderConfig(global);

      // ProviderOptions can have any of these properties
      const validKeys = ['endpoint', 'apiKey', 'sessionId', 'timeout', 'headers'];
      const resultKeys = Object.keys(result.options);
      for (const key of resultKeys) {
        expect(validKeys).toContain(key);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle all undefined parameters', () => {
      const global = createGlobalConfig();
      const result = resolveProviderConfig(global);

      expect(result.provider).toBe('anthropic');
      expect(result.options).toEqual({});
    });

    it('should handle global with undefined providerDefaults', () => {
      const global: GlobalProviderConfig = {
        defaultProvider: 'opencode',
        providerDefaults: undefined
      };
      const result = resolveProviderConfig(global, 'opencode', { timeout: 5000 });

      expect(result.provider).toBe('opencode');
      expect(result.options).toEqual({ timeout: 5000 });
    });

    it('should handle empty options objects', () => {
      const global = createGlobalConfig('anthropic', {
        anthropic: { timeout: 30000 }
      });
      const result = resolveProviderConfig(
        global,
        'anthropic',
        {},  // Empty agent options
        undefined,
        {}   // Empty prompt options
      );

      expect(result.options).toEqual({ timeout: 30000 });
    });
  });
});

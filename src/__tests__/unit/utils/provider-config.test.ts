/**
 * Unit tests for configureProviders() and getGlobalProviderConfig()
 */

import { describe, it, expect, afterEach } from 'vitest';
import { configureProviders, getGlobalProviderConfig, resetGlobalConfig } from '../../../utils/provider-config.js';

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

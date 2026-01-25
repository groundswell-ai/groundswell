/**
 * Unit tests for configureProviders()
 */

import { describe, it, expect } from 'vitest';
import { configureProviders } from '../../../utils/provider-config.js';

// Note: No special reset needed - ES module scoping provides isolation

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

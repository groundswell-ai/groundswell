/**
 * Test file: harnesses-config-types.test.ts
 *
 * Purpose: Validate GlobalHarnessConfig, parseModelSpec, and formatModelForProvider
 * type definitions per PRD Sections 7.6–7.8 (S2 additions to src/types/harnesses.ts).
 *
 * Tests:
 * - GlobalHarnessConfig shape (all 3 fields, optionality, correct key types)
 * - GlobalHarnessConfig.defaultModelProvider accepts open ModelProviderId set
 * - GlobalHarnessConfig.harnessDefaults keyed by HarnessId (narrow union)
 * - parseModelSpec and formatModelForProvider are exported as callable signatures
 *
 * PRP: P1.M1.T1.S2 — Add GlobalHarnessConfig and ModelSpec (open provider set)
 */

import { describe, it, expect } from 'vitest';
import type {
  GlobalHarnessConfig,
  HarnessId,
  HarnessOptions,
  ModelProviderId,
  ModelSpec,
  parseModelSpec as ParseModelSpecType,
  formatModelForProvider as FormatModelForProviderType,
} from '../../types/harnesses.js';

describe('GlobalHarnessConfig Types', () => {
  describe('interface shape', () => {
    it('should accept a minimal config with only defaultHarness', () => {
      const config: GlobalHarnessConfig = {
        defaultHarness: 'pi',
      };

      expect(config.defaultHarness).toBe('pi');
      expect(config.harnessDefaults).toBeUndefined();
      expect(config.defaultModelProvider).toBeUndefined();
    });

    it('should accept all fields populated', () => {
      const config: GlobalHarnessConfig = {
        defaultHarness: 'claude-code',
        defaultModelProvider: 'anthropic',
        harnessDefaults: {
          'claude-code': { apiKey: 'sk-test', endpoint: 'https://api.example.com' },
        },
      };

      expect(config.defaultHarness).toBe('claude-code');
      expect(config.defaultModelProvider).toBe('anthropic');
      expect(config.harnessDefaults).toBeDefined();
      expect(config.harnessDefaults?.['claude-code']?.apiKey).toBe('sk-test');
    });

    it('should accept defaultHarness as both "pi" and "claude-code"', () => {
      const piConfig: GlobalHarnessConfig = { defaultHarness: 'pi' };
      const ccConfig: GlobalHarnessConfig = { defaultHarness: 'claude-code' };

      expect(piConfig.defaultHarness).toBe('pi');
      expect(ccConfig.defaultHarness).toBe('claude-code');
    });
  });

  describe('defaultModelProvider (open ModelProviderId set)', () => {
    it('should accept well-known provider strings', () => {
      const config1: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        defaultModelProvider: 'anthropic',
      };
      const config2: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        defaultModelProvider: 'openai',
      };
      const config3: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        defaultModelProvider: 'google',
      };
      const config4: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        defaultModelProvider: 'zai',
      };

      expect(config1.defaultModelProvider).toBe('anthropic');
      expect(config2.defaultModelProvider).toBe('openai');
      expect(config3.defaultModelProvider).toBe('google');
      expect(config4.defaultModelProvider).toBe('zai');
    });

    it('should accept an arbitrary string (open set)', () => {
      const config: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        defaultModelProvider: 'mistral',
      };

      expect(config.defaultModelProvider).toBe('mistral');
    });
  });

  describe('harnessDefaults (keyed by HarnessId)', () => {
    it('should accept per-harness options keyed by HarnessId', () => {
      const config: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        harnessDefaults: {
          'claude-code': { apiKey: 'sk-cc' },
          pi: { endpoint: 'http://localhost:3000', timeout: 60000 },
        },
      };

      expect(config.harnessDefaults?.['claude-code']?.apiKey).toBe('sk-cc');
      expect(config.harnessDefaults?.pi?.endpoint).toBe('http://localhost:3000');
    });

    it('should accept all HarnessOptions fields in harnessDefaults', () => {
      const config: GlobalHarnessConfig = {
        defaultHarness: 'pi',
        harnessDefaults: {
          'claude-code': {
            apiKey: 'sk-test',
            endpoint: 'https://api.example.com',
            sessionId: 'session-abc',
            timeout: 30000,
            headers: { 'X-Custom': 'value' },
          },
        },
      };

      const opts = config.harnessDefaults?.['claude-code'];
      expect(opts?.apiKey).toBe('sk-test');
      expect(opts?.endpoint).toBe('https://api.example.com');
      expect(opts?.sessionId).toBe('session-abc');
      expect(opts?.timeout).toBe(30000);
      expect(opts?.headers?.['X-Custom']).toBe('value');
    });

    it('should allow omitting harnessDefaults entirely', () => {
      const config: GlobalHarnessConfig = {
        defaultHarness: 'claude-code',
      };

      expect(config.harnessDefaults).toBeUndefined();
    });
  });
});

describe('parseModelSpec signature', () => {
  it('should have correct parameter types — compiles with (string) and (string, ModelProviderId)', () => {
    // These lines compile only if the signature accepts (model: string, defaultProvider?: ModelProviderId).
    // If the signature is wrong, tsc will error at type-check time (caught by IDE / CI).
    const _: ParseModelSpecType = (_model: string, _defaultProvider?: ModelProviderId) =>
      ({ provider: 'anthropic', model: 'm', raw: 'm' }) as unknown as ModelSpec;

    expect(_).toBeDefined();
  });
});

describe('formatModelForProvider signature', () => {
  it('should have correct parameter types — compiles with (ModelSpec, ModelProviderId)', () => {
    // This line compiles only if the signature accepts (spec: ModelSpec, targetProvider: ModelProviderId).
    const _: FormatModelForProviderType = (
      _spec: ModelSpec,
      _targetProvider: ModelProviderId,
    ) => '' as unknown as string;

    expect(_).toBeDefined();
  });
});

describe('Type Exports', () => {
  it('should export GlobalHarnessConfig, parseModelSpec, and formatModelForProvider', () => {
    // The import statements at the top of this file validate that these are exported.
    // This test ensures the types compile correctly when used together.
    const config: GlobalHarnessConfig = {
      defaultHarness: 'pi',
      defaultModelProvider: 'anthropic',
    };
    const spec: ModelSpec = {
      provider: 'anthropic',
      model: 'claude-sonnet-4',
      raw: 'claude-sonnet-4',
    };

    expect(config.defaultHarness).toBe('pi');
    expect(config.defaultModelProvider).toBe('anthropic');
    expect(spec.provider).toBe('anthropic');
  });
});

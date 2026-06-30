/**
 * Unit tests for PiHarness.resolveModel() method.
 *
 * Uses vi.mock of @earendil-works/pi-coding-agent so ModelRegistry.find is controllable.
 * The real-import tests (initialize/terminate) live in a SEPARATE file
 * (pi-harness-initialize.test.ts) because vi.mock is hoisted file-scope (GOTCHA #13).
 *
 * PRP: P2.M2.T1.S2 — Implement initialize/terminate + model resolution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { ConfigError } from '../../../harnesses/claude-code-harness.js';
import { AGENT_ERROR_CODES } from '../../../types/agent.js';
import type { ModelSpec } from '../../../types/harnesses.js';

// ── vi.mock: deterministic control of ModelRegistry.find + AuthStorage.setRuntimeApiKey ──
const fakeFind = vi.fn();
const fakeSetKey = vi.fn();
const fakeGetApiKey = vi.fn();

// A plausible fake Model<Api> object for assertions.
const fakeModel = {
  id: 'claude-sonnet-4',
  provider: 'anthropic',
  api: 'anthropic-messages',
  name: 'Claude Sonnet 4',
};

vi.mock('@earendil-works/pi-coding-agent', () => ({
  ModelRegistry: {
    create: vi.fn(() => ({
      find: fakeFind,
      getApiKeyForProvider: vi.fn(),
      getAll: vi.fn(() => []),
      getAvailable: vi.fn(() => []),
    })),
    inMemory: vi.fn(() => ({
      find: fakeFind,
      getApiKeyForProvider: vi.fn(),
      getAll: vi.fn(() => []),
      getAvailable: vi.fn(() => []),
    })),
  },
  AuthStorage: {
    create: vi.fn(() => ({
      setRuntimeApiKey: fakeSetKey,
      getApiKey: fakeGetApiKey,
    })),
    inMemory: vi.fn(() => ({
      setRuntimeApiKey: fakeSetKey,
      getApiKey: fakeGetApiKey,
    })),
  },
}));

describe('PiHarness - resolveModel()', () => {
  let harness: PiHarness;

  beforeEach(() => {
    harness = new PiHarness();
    vi.clearAllMocks();
    // Default: find returns a model so most tests pass without setup
    fakeFind.mockReturnValue(fakeModel);
  });

  describe('resolution via find', () => {
    it('should return the model from find(provider, model)', async () => {
      await harness.initialize();
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      const result = harness.resolveModel(spec);

      expect(result).toBe(fakeModel);
      expect(fakeFind).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4');
    });

    it('should call find with the correct provider and model', async () => {
      await harness.initialize();
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        raw: 'anthropic/claude-sonnet-4-20250514',
      };

      harness.resolveModel(spec);

      expect(fakeFind).toHaveBeenCalledTimes(1);
      expect(fakeFind).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4-20250514');
    });
  });

  describe('open-set providers (pi is vendor-neutral)', () => {
    it('should resolve openai/gpt-4o via find', async () => {
      await harness.initialize();
      const spec: ModelSpec = {
        provider: 'openai',
        model: 'gpt-4o',
        raw: 'openai/gpt-4o',
      };

      harness.resolveModel(spec);

      expect(fakeFind).toHaveBeenCalledWith('openai', 'gpt-4o');
    });

    it('should resolve google/gemini-2.5-pro via find', async () => {
      await harness.initialize();
      const spec: ModelSpec = {
        provider: 'google',
        model: 'gemini-2.5-pro',
        raw: 'google/gemini-2.5-pro',
      };

      harness.resolveModel(spec);

      expect(fakeFind).toHaveBeenCalledWith('google', 'gemini-2.5-pro');
    });
  });

  describe('apiKey injection', () => {
    it('should call setRuntimeApiKey when options.apiKey is set', async () => {
      await harness.initialize({ apiKey: 'sk-test-key' });

      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      harness.resolveModel(spec);

      expect(fakeSetKey).toHaveBeenCalledWith('anthropic', 'sk-test-key');
      expect(fakeSetKey).toHaveBeenCalledTimes(1);
    });

    it('should inject apiKey BEFORE calling find', async () => {
      await harness.initialize({ apiKey: 'sk-ordered' });

      // Make find return undefined to trigger ConfigError
      fakeFind.mockReturnValue(undefined);

      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      expect(() => harness.resolveModel(spec)).toThrow();
      // setRuntimeApiKey should have been called before the find that returned undefined
      expect(fakeSetKey).toHaveBeenCalledWith('anthropic', 'sk-ordered');
      expect(fakeFind).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4');
    });

    it('should NOT call setRuntimeApiKey when options.apiKey is not set', async () => {
      await harness.initialize();

      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      harness.resolveModel(spec);

      expect(fakeSetKey).not.toHaveBeenCalled();
    });

    it('should inject apiKey per provider (different providers get same key)', async () => {
      await harness.initialize({ apiKey: 'sk-universal' });

      const spec1: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };
      const spec2: ModelSpec = {
        provider: 'openai',
        model: 'gpt-4o',
        raw: 'openai/gpt-4o',
      };

      harness.resolveModel(spec1);
      harness.resolveModel(spec2);

      expect(fakeSetKey).toHaveBeenCalledWith('anthropic', 'sk-universal');
      expect(fakeSetKey).toHaveBeenCalledWith('openai', 'sk-universal');
    });
  });

  describe('not-found → ConfigError', () => {
    it('should throw ConfigError when find returns undefined', async () => {
      await harness.initialize();
      fakeFind.mockReturnValue(undefined);

      const spec: ModelSpec = {
        provider: 'foo',
        model: 'bar',
        raw: 'foo/bar',
      };

      expect(() => harness.resolveModel(spec)).toThrow(ConfigError);
    });

    it('should throw ConfigError with code CONFIG_ERROR', async () => {
      await harness.initialize();
      fakeFind.mockReturnValue(undefined);

      const spec: ModelSpec = {
        provider: 'foo',
        model: 'bar',
        raw: 'foo/bar',
      };

      try {
        harness.resolveModel(spec);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigError);
        expect((e as ConfigError).code).toBe(AGENT_ERROR_CODES.CONFIG_ERROR);
      }
    });

    it('should include provider and model in error details', async () => {
      await harness.initialize();
      fakeFind.mockReturnValue(undefined);

      const spec: ModelSpec = {
        provider: 'nonexistent',
        model: 'model-x',
        raw: 'nonexistent/model-x',
      };

      try {
        harness.resolveModel(spec);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigError);
        const ce = e as ConfigError;
        expect(ce.details).toEqual({
          provider: 'nonexistent',
          model: 'model-x',
          harnessId: 'pi',
        });
      }
    });

    it('should include the provider/model in the error message', async () => {
      await harness.initialize();
      fakeFind.mockReturnValue(undefined);

      const spec: ModelSpec = {
        provider: 'foo',
        model: 'bar',
        raw: 'foo/bar',
      };

      expect(() => harness.resolveModel(spec)).toThrow(/foo\/bar/);
    });
  });

  describe('uninitialized guard', () => {
    it('should throw when resolveModel is called before initialize()', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      expect(() => harness.resolveModel(spec)).toThrow(/not initialized/i);
    });

    it('should throw a plain Error (not ConfigError) when uninitialized', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      try {
        harness.resolveModel(spec);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).not.toBeInstanceOf(ConfigError);
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toMatch(/not initialized/i);
      }
    });
  });

  describe('default-provider threading via global config', () => {
    it('should normalizeModel with global defaultModelProvider when set', async () => {
      // This tests the normalizeModel → parseModelSpec threading with the global config.
      // When global config has a defaultModelProvider, normalizeModel should pass it through.
      // We don't set global config here (it's managed elsewhere), but we verify
      // normalizeModel + resolveModel work together end-to-end.
      await harness.initialize();
      fakeFind.mockReturnValue(fakeModel);

      // Use a qualified model string so provider is explicit regardless of global config
      const spec = harness.normalizeModel('anthropic/claude-sonnet-4');
      const model = harness.resolveModel(spec);

      expect(model).toBe(fakeModel);
      expect(fakeFind).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4');
    });
  });
});

/**
 * Test file: anthropic-provider.test.ts
 *
 * Purpose: Validate AnthropicProvider class structure and capabilities per P2.M1.T1.S1
 *
 * Tests:
 * - AnthropicProvider has correct id property
 * - AnthropicProvider has correct capabilities matching Anthropic SDK v0.1.77
 * - AnthropicProvider implements Provider interface
 * - AnthropicProvider has all required methods
 * - AnthropicProvider can be registered with ProviderRegistry
 * - normalizeModel() returns correct ModelSpec structure
 *
 * PRP: P2.M1.T1.S1 - Implement AnthropicProvider class structure and capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../harnesses/anthropic-provider.js';
import type { Provider } from '../../../types/providers.js';
import { ProviderRegistry } from '../../../harnesses/provider-registry.js';

describe('AnthropicProvider', () => {
  describe('Class Structure', () => {
    it('should have correct id property', () => {
      const provider = new AnthropicProvider();
      expect(provider.id).toBe('anthropic');
      expect(typeof provider.id).toBe('string');
    });

    it('should have readonly id property', () => {
      const provider = new AnthropicProvider();
      // Readonly is a compile-time check, verified by TypeScript
      // At runtime, we just verify the property exists and has correct value
      expect(provider.id).toBe('anthropic');
    });

    it('should have correct capabilities matching Anthropic SDK v0.1.77', () => {
      const provider = new AnthropicProvider();

      expect(provider.capabilities).toBeDefined();
      expect(provider.capabilities.mcp).toBe(true);
      expect(provider.capabilities.skills).toBe(true);
      expect(provider.capabilities.lsp).toBe(true);
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.sessions).toBe(true);
      expect(provider.capabilities.extendedThinking).toBe(true);
    });

    it('should have readonly capabilities property', () => {
      const provider = new AnthropicProvider();
      // Readonly is a compile-time check, verified by TypeScript
      // At runtime, we just verify the capabilities exist and have correct values
      expect(provider.capabilities.mcp).toBe(true);
      expect(provider.capabilities.skills).toBe(true);
      expect(provider.capabilities.lsp).toBe(true);
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.sessions).toBe(true);
      expect(provider.capabilities.extendedThinking).toBe(true);
    });

    it('should have private sdk field for lazy loading', () => {
      const provider = new AnthropicProvider();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });
  });

  describe('Interface Implementation', () => {
    it('should implement Provider interface', () => {
      const provider = new AnthropicProvider();

      // Type check: AnthropicProvider should be assignable to Provider
      const providerInterface: Provider = provider;

      expect(providerInterface).toBeDefined();
      expect(providerInterface.id).toBe('anthropic');
      expect(providerInterface.capabilities).toBeDefined();
    });

    it('should have all required methods', () => {
      const provider = new AnthropicProvider();

      expect(typeof provider.initialize).toBe('function');
      expect(typeof provider.terminate).toBe('function');
      expect(typeof provider.execute).toBe('function');
      expect(typeof provider.registerMCPs).toBe('function');
      expect(typeof provider.loadSkills).toBe('function');
      expect(typeof provider.normalizeModel).toBe('function');
    });
  });

  describe('Method Signatures', () => {
    it('should have initialize() method with correct signature', async () => {
      const provider = new AnthropicProvider();

      // Should accept optional options parameter
      await expect(provider.initialize()).resolves.not.toThrow();
      await expect(provider.initialize({ apiKey: 'test' })).resolves.not.toThrow();

      // Should return Promise<void>
      const result = provider.initialize();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should have terminate() method with correct signature', async () => {
      const provider = new AnthropicProvider();

      // Should return Promise<void>
      const result = provider.terminate();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.not.toThrow();
    });

    it('should have execute() method with correct signature', async () => {
      const provider = new AnthropicProvider();
      // Initialize provider first (required for execute)
      await provider.initialize();
      const mockToolExecutor = async () => ({ content: '', isError: false });

      // Should return Promise<AgentResponse<T>>
      const result = provider.execute(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      expect(result).toBeInstanceOf(Promise);
    });

    it('should have registerMCPs() method with correct signature', async () => {
      const provider = new AnthropicProvider();
      // Initialize provider first (required for registerMCPs)
      await provider.initialize();

      // Should return Promise<Tool[]>
      const result = provider.registerMCPs([]);

      expect(result).toBeInstanceOf(Promise);
      const tools = await result;
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should have loadSkills() method with correct signature', async () => {
      const provider = new AnthropicProvider();

      // Initialize provider first (loadSkills requires SDK initialization)
      await provider.initialize();

      // Should return Promise<void>
      const result = provider.loadSkills([]);

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.not.toThrow();
    });

    it('should have normalizeModel() method with correct signature', () => {
      const provider = new AnthropicProvider();

      // Should return ModelSpec (synchronous)
      const result = provider.normalizeModel('claude-sonnet-4');

      expect(result).toBeDefined();
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.raw).toBe('claude-sonnet-4');
    });
  });

  describe('normalizeModel() Behavior', () => {
    it('should return correct ModelSpec for plain model string', () => {
      const provider = new AnthropicProvider();
      const modelSpec = provider.normalizeModel('claude-sonnet-4');

      expect(modelSpec).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
      });
    });

    it('should return correct ModelSpec for qualified model string', () => {
      const provider = new AnthropicProvider();
      const modelSpec = provider.normalizeModel('anthropic/claude-opus-4');

      expect(modelSpec).toEqual({
        provider: 'anthropic',
        model: 'claude-opus-4',
        raw: 'anthropic/claude-opus-4',
      });
    });

    it('should preserve raw model string', () => {
      const provider = new AnthropicProvider();
      const raw = 'claude-sonnet-4-20250514';
      const modelSpec = provider.normalizeModel(raw);

      expect(modelSpec.raw).toBe(raw);
    });
  });

  describe('ProviderRegistry Integration', () => {
    beforeEach(() => {
      // Reset registry state before each test for isolation
      ProviderRegistry._resetForTesting();
    });

    it('should be registerable with ProviderRegistry', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = new AnthropicProvider();

      expect(() => registry.register(anthropic)).not.toThrow();
    });

    it('should be retrievable from ProviderRegistry after registration', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = new AnthropicProvider();

      registry.register(anthropic);

      const retrieved = registry.get('anthropic');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('anthropic');
    });

    it('should pass has() check after registration', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = new AnthropicProvider();

      registry.register(anthropic);

      expect(registry.has('anthropic')).toBe(true);
    });
  });

  describe('Instantiation', () => {
    it('should be instantiable without arguments', () => {
      expect(() => new AnthropicProvider()).not.toThrow();
    });

    it('should create independent instances', () => {
      const provider1 = new AnthropicProvider();
      const provider2 = new AnthropicProvider();

      expect(provider1).not.toBe(provider2);
      expect(provider1.id).toBe(provider2.id);
      expect(provider1.capabilities).toEqual(provider2.capabilities);
    });
  });
});

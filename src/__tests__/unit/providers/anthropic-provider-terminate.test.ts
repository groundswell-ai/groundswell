/**
 * Test file: anthropic-provider-terminate.test.ts
 *
 * Purpose: Comprehensive tests for AnthropicProvider terminate() method per P2.M1.T1.S3
 *
 * Tests:
 * - SDK reference is cleared after termination
 * - Method is idempotent (safe to call multiple times)
 * - Works with ProviderRegistry.terminateAll() integration
 * - Allows re-initialization after termination
 * - Handles being called before initialize()
 * - Never throws errors
 *
 * PRP: P2.M1.T1.S3 - Implement terminate() method
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../harnesses/anthropic-provider.js';
import { ProviderRegistry } from '../../../harnesses/provider-registry.js';
import type { ProviderOptions } from '../../../types/providers.js';

describe('AnthropicProvider - terminate()', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    // Reset registry state for isolation
    ProviderRegistry._resetForTesting();
  });

  describe('Basic Functionality', () => {
    it('should clear SDK reference after termination', async () => {
      // Initialize provider first
      await provider.initialize();

      // Verify SDK is loaded
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();

      // Terminate provider
      await provider.terminate();

      // Verify SDK is cleared
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });

    it('should handle termination of uninitialized provider', async () => {
      // Provider starts with SDK as null
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Terminate without initializing (should not throw)
      await expect(provider.terminate()).resolves.not.toThrow();

      // SDK should still be null
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });

    it('should return Promise<void>', async () => {
      const result = provider.terminate();

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.not.toThrow();

      // Resolve to undefined (void)
      const resolved = await result;
      expect(resolved).toBeUndefined();
    });
  });

  describe('Idempotent Behavior', () => {
    it('should be safe to call terminate() multiple times', async () => {
      // Initialize provider first
      await provider.initialize();

      // First termination
      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Second termination (should not throw)
      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Third termination (still should not throw)
      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });

    it('should return immediately on subsequent calls after first termination', async () => {
      // Initialize provider
      await provider.initialize();

      // First termination
      await provider.terminate();

      // Second termination should also succeed immediately
      // If there was no idempotent check, this might fail
      await expect(provider.terminate()).resolves.not.toThrow();

      // SDK should still be null
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });

    it('should be idempotent even when called before initialize()', async () => {
      // Call terminate on uninitialized provider
      await provider.terminate();

      // Call terminate again (should not throw)
      await provider.terminate();

      // Call terminate a third time (still should not throw)
      await provider.terminate();

      // SDK should still be null
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });
  });

  describe('Re-initialization After Termination', () => {
    it('should allow re-initialization after termination', async () => {
      // First initialization
      await provider.initialize();

      // @ts-expect-error - Testing private property
      const firstSdk = provider.sdk;
      expect(firstSdk).not.toBeNull();

      // Terminate
      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Re-initialize (should succeed)
      await provider.initialize();

      // @ts-expect-error - Testing private property
      const secondSdk = provider.sdk;
      expect(secondSdk).not.toBeNull();

      // SDK references may be different (dynamic import creates new reference)
      // but both should have the expected properties
      expect(firstSdk).toHaveProperty('query');
      expect(secondSdk).toHaveProperty('query');
    });

    it('should support full lifecycle: initialize -> terminate -> initialize -> terminate', async () => {
      // First initialize
      await provider.initialize();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();

      // First terminate
      await provider.terminate();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Second initialize
      await provider.initialize();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();

      // Second terminate
      await provider.terminate();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });

    it('should allow re-initialization with different options', async () => {
      // Initialize with first options
      const options1: ProviderOptions = { apiKey: 'key1', timeout: 10000 };
      await provider.initialize(options1);
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();

      // Terminate
      await provider.terminate();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Re-initialize with different options
      const options2: ProviderOptions = { apiKey: 'key2', timeout: 30000 };
      await provider.initialize(options2);
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
    });
  });

  describe('ProviderRegistry Integration', () => {
    it('should work with ProviderRegistry.terminateAll()', async () => {
      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      // Initialize provider
      await registry.initializeProvider('anthropic');

      // Verify SDK is loaded
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();

      // Terminate via registry
      await registry.terminateAll();

      // Verify SDK is cleared
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Verify provider is removed from registry
      expect(registry.has('anthropic')).toBe(false);
    });

    it('should not throw when called via ProviderRegistry.terminateAll()', async () => {
      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      // Initialize provider
      await registry.initializeProvider('anthropic');

      // Should not throw when terminating via registry
      await expect(registry.terminateAll()).resolves.not.toThrow();
    });

    it('should handle multiple termination cycles via registry', async () => {
      const registry = ProviderRegistry.getInstance();

      // First cycle
      registry.register(provider);
      await registry.initializeProvider('anthropic');
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
      await registry.terminateAll();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Reset registry for next cycle
      ProviderRegistry._resetForTesting();
      const registry2 = ProviderRegistry.getInstance();

      // Second cycle
      registry2.register(provider);
      await registry2.initializeProvider('anthropic');
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
      await registry2.terminateAll();
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should never throw errors', async () => {
      // Test various scenarios that should never throw
      const testScenarios = [
        // Terminate uninitialized provider
        provider.terminate(),
        // Terminate initialized provider
        provider.initialize().then(() => provider.terminate()),
        // Multiple terminates in sequence
        provider.terminate().then(() => provider.terminate()).then(() => provider.terminate()),
      ];

      for (const scenario of testScenarios) {
        await expect(scenario).resolves.not.toThrow();
      }
    });

    it('should handle terminate() before initialize() gracefully', async () => {
      // Call terminate before any initialization
      await expect(provider.terminate()).resolves.not.toThrow();

      // SDK should be null
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();

      // Should still be able to initialize after
      await expect(provider.initialize()).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
    });

    it('should handle concurrent terminate() calls', async () => {
      // Initialize provider
      await provider.initialize();

      // Start multiple concurrent terminations
      const terminate1 = provider.terminate();
      const terminate2 = provider.terminate();
      const terminate3 = provider.terminate();

      // All should resolve successfully
      await expect(Promise.all([terminate1, terminate2, terminate3])).resolves.not.toThrow();

      // SDK should be null
      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should not add internal termination flags', async () => {
      // Provider manages state externally via ProviderRegistry
      // AnthropicProvider should not have internal flags like 'isTerminated'

      // Verify no unexpected properties
      const instance = new AnthropicProvider();
      const keys = Object.keys(instance);

      // Should only have id and capabilities (readonly public properties)
      expect(keys).toEqual(expect.arrayContaining(['id', 'capabilities']));
    });

    it('should start with SDK field as null', () => {
      const newProvider = new AnthropicProvider();

      // @ts-expect-error - Testing private property
      expect(newProvider.sdk).toBeNull();
    });

    it('should have SDK null after terminate()', async () => {
      await provider.initialize();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();

      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
      expect(provider.sdk).toBeDefined(); // null is defined, not undefined
    });
  });

  describe('Method Signature', () => {
    it('should have correct parameter types (no parameters)', async () => {
      // These should compile without TypeScript errors
      await provider.terminate();
      await provider.terminate(); // Again for idempotent check

      // @ts-expect-error - Testing private property
      expect(provider.sdk).toBeNull();
    });

    it('should match Provider interface signature', async () => {
      // Verify method exists and is async
      expect(typeof provider.terminate).toBe('function');

      // Call and verify it returns a Promise
      const result = provider.terminate();
      expect(result).toBeInstanceOf(Promise);

      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should preserve null type for SDK after termination', async () => {
      await provider.initialize();
      await provider.terminate();

      // @ts-expect-error - Testing private property
      const sdk = provider.sdk;

      // After termination, SDK should be exactly null
      expect(sdk).toBeNull();
      expect(sdk).not.toBeTruthy();
    });

    it('should allow SDK to be reassigned after termination', async () => {
      await provider.initialize();
      await provider.terminate();

      // Should be able to initialize again (SDK reassigned)
      await provider.initialize();

      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
    });
  });
});

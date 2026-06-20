/**
 * Unit tests for ProviderRegistry singleton class
 *
 * Tests:
 * - getInstance() returns same instance on multiple calls (singleton pattern)
 * - register() successfully registers provider
 * - register() throws on duplicate provider id
 * - get() returns registered provider
 * - get() returns undefined for unregistered provider
 * - has() returns true for registered provider
 * - has() returns false for unregistered provider
 * - _resetForTesting() clears singleton state
 * - registry maintains state across getInstance() calls
 *
 * PRP: P1.M3.T1.S1 - Implement ProviderRegistry Singleton Class Structure
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { ProviderRegistry, InitializationStatus } from '../../../harnesses/harness-registry.js';
import type { Provider, ProviderId, ProviderCapabilities } from '../../../types/providers.js';
import type { AgentResponse } from '../../../types/agent.js';
import type { ProviderRequest, ToolExecutor, ProviderHookEvents, ModelSpec } from '../../../types/providers.js';
import type { MCPServer, Tool, Skill } from '../../../types/sdk-primitives.js';

// Reset after each test for isolation
afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();
  ProviderRegistry._resetForTesting();
});

/**
 * Helper function to create mock Provider for testing
 */
function createMockProvider(id: ProviderId): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: false,
    streaming: true,
    sessions: false,
    extendedThinking: false,
  };

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn(),
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}

describe('ProviderRegistry', () => {
  describe('getInstance() - Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const registry1 = ProviderRegistry.getInstance();
      const registry2 = ProviderRegistry.getInstance();

      expect(registry1).toBe(registry2);
      expect(Object.is(registry1, registry2)).toBe(true);
    });

    it('should create instance on first call (lazy initialization)', () => {
      // Reset to ensure clean state
      ProviderRegistry._resetForTesting();

      const registry = ProviderRegistry.getInstance();

      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(ProviderRegistry);
    });

    it('should maintain instance across multiple getInstance calls', () => {
      const instances: ProviderRegistry[] = [];

      for (let i = 0; i < 5; i++) {
        instances.push(ProviderRegistry.getInstance());
      }

      // All instances should be the same reference
      expect(instances[0]).toBe(instances[1]);
      expect(instances[1]).toBe(instances[2]);
      expect(instances[2]).toBe(instances[3]);
      expect(instances[3]).toBe(instances[4]);
    });
  });

  describe('register() - Provider Registration', () => {
    it('should successfully register a provider', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      expect(() => {
        registry.register(anthropicProvider);
      }).not.toThrow();
    });

    it('should register multiple providers', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');
      const opencodeProvider = createMockProvider('opencode');

      registry.register(anthropicProvider);
      registry.register(opencodeProvider);

      expect(registry.has('anthropic')).toBe(true);
      expect(registry.has('opencode')).toBe(true);
    });

    it('should throw on duplicate provider id', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      expect(() => {
        registry.register(anthropicProvider);
      }).toThrow(Error);
    });

    it('should include provider id in duplicate error message', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      try {
        registry.register(anthropicProvider);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('anthropic');
        expect((error as Error).message).toContain('already registered');
      }
    });

    it('should use provider.id as map key', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      // Verify we can retrieve by the provider's id
      expect(registry.has('anthropic')).toBe(true);
      expect(registry.get('anthropic')).toBe(anthropicProvider);
    });
  });

  describe('get() - Provider Retrieval', () => {
    it('should return registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      const retrieved = registry.get('anthropic');

      expect(retrieved).toBeDefined();
      expect(retrieved).toBe(anthropicProvider);
    });

    it('should return undefined for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();

      const retrieved = registry.get('anthropic');

      expect(retrieved).toBeUndefined();
    });

    it('should return undefined after retrieving non-existent provider (no throw)', () => {
      const registry = ProviderRegistry.getInstance();

      expect(() => {
        const provider = registry.get('opencode');
        expect(provider).toBeUndefined();
      }).not.toThrow();
    });

    it('should return correct provider when multiple registered', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');
      const opencodeProvider = createMockProvider('opencode');

      registry.register(anthropicProvider);
      registry.register(opencodeProvider);

      expect(registry.get('anthropic')).toBe(anthropicProvider);
      expect(registry.get('opencode')).toBe(opencodeProvider);
    });
  });

  describe('has() - Existence Check', () => {
    it('should return true for registered provider', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      expect(registry.has('anthropic')).toBe(true);
    });

    it('should return false for unregistered provider', () => {
      const registry = ProviderRegistry.getInstance();

      expect(registry.has('anthropic')).toBe(false);
      expect(registry.has('opencode')).toBe(false);
    });

    it('should return false after reset', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);
      expect(registry.has('anthropic')).toBe(true);

      ProviderRegistry._resetForTesting();

      const newRegistry = ProviderRegistry.getInstance();
      expect(newRegistry.has('anthropic')).toBe(false);
    });

    it('should handle multiple provider existence checks', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      expect(registry.has('anthropic')).toBe(true);
      expect(registry.has('opencode')).toBe(false);
    });
  });

  describe('_resetForTesting() - Test Isolation', () => {
    it('should clear singleton state', () => {
      const registry1 = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry1.register(anthropicProvider);
      expect(registry1.has('anthropic')).toBe(true);

      ProviderRegistry._resetForTesting();

      const registry2 = ProviderRegistry.getInstance();
      expect(registry2.has('anthropic')).toBe(false);
    });

    it('should allow fresh registration after reset', () => {
      const registry1 = ProviderRegistry.getInstance();
      const provider1 = createMockProvider('anthropic');

      registry1.register(provider1);

      ProviderRegistry._resetForTesting();

      const registry2 = ProviderRegistry.getInstance();
      const provider2 = createMockProvider('anthropic');

      expect(() => {
        registry2.register(provider2);
      }).not.toThrow();
    });

    it('should create new instance after reset', () => {
      const registry1 = ProviderRegistry.getInstance();

      ProviderRegistry._resetForTesting();

      const registry2 = ProviderRegistry.getInstance();

      expect(registry1).not.toBe(registry2);
    });
  });

  describe('State Persistence Across getInstance() Calls', () => {
    it('should maintain registered providers across getInstance calls', () => {
      const registry1 = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry1.register(anthropicProvider);

      const registry2 = ProviderRegistry.getInstance();

      expect(registry2.has('anthropic')).toBe(true);
      expect(registry2.get('anthropic')).toBe(anthropicProvider);
    });

    it('should share provider map between instances', () => {
      const registry1 = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry1.register(anthropicProvider);

      const registry2 = ProviderRegistry.getInstance();
      const opencodeProvider = createMockProvider('opencode');

      registry2.register(opencodeProvider);

      // Both "instances" should see both providers
      expect(registry1.has('anthropic')).toBe(true);
      expect(registry1.has('opencode')).toBe(true);
      expect(registry2.has('anthropic')).toBe(true);
      expect(registry2.has('opencode')).toBe(true);
    });
  });

  describe('Provider Type Safety', () => {
    it('should accept valid ProviderId values', () => {
      const registry = ProviderRegistry.getInstance();

      expect(() => {
        registry.register(createMockProvider('anthropic'));
      }).not.toThrow();

      expect(() => {
        registry.register(createMockProvider('opencode'));
      }).not.toThrow();
    });

    it('should return Provider | undefined from get()', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      const found = registry.get('anthropic');
      const notFound = registry.get('opencode');

      // Type should be Provider | undefined
      if (found) {
        expect(found.id).toBe('anthropic');
      }

      expect(notFound).toBeUndefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical usage pattern', () => {
      // Typical application startup pattern
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Register providers
      registry.register(anthropic);
      registry.register(opencode);

      // Check availability
      expect(registry.has('anthropic')).toBe(true);
      expect(registry.has('opencode')).toBe(true);

      // Retrieve providers
      const retrievedAnthropic = registry.get('anthropic');
      const retrievedOpenCode = registry.get('opencode');

      expect(retrievedAnthropic).toBe(anthropic);
      expect(retrievedOpenCode).toBe(opencode);
    });

    it('should prevent duplicate registration in typical workflow', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');

      registry.register(anthropic);

      // Attempting to register again should fail
      expect(() => {
        registry.register(anthropic);
      }).toThrow(/already registered/);
    });

    it('should support conditional provider retrieval', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');

      registry.register(anthropic);

      // Conditional usage pattern
      const provider = registry.get('anthropic');
      if (provider) {
        expect(provider.id).toBe('anthropic');
        expect(provider.capabilities.mcp).toBe(true);
      }

      const missing = registry.get('opencode');
      if (missing) {
        expect.fail('Should not have opencode provider');
      }
    });
  });

  describe('Map-Based Storage Behavior', () => {
    it('should store providers by id in Map', () => {
      const registry = ProviderRegistry.getInstance();
      const anthropicProvider = createMockProvider('anthropic');

      registry.register(anthropicProvider);

      // Verify the provider is stored and retrievable
      expect(registry.get('anthropic')).toBe(anthropicProvider);
    });

    it('should overwrite on duplicate set (prevented by register check)', () => {
      const registry = ProviderRegistry.getInstance();
      const provider1 = createMockProvider('anthropic');
      const provider2 = createMockProvider('anthropic');

      registry.register(provider1);

      // The register method should prevent this
      expect(() => {
        registry.register(provider2);
      }).toThrow();

      // Original provider should still be there
      expect(registry.get('anthropic')).toBe(provider1);
    });
  });

  // ============================================================================
  // Provider Initialization Tests (P1.M3.T1.S2)
  // ============================================================================

  describe('initializeProvider()', () => {
    it('should successfully initialize a provider', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      await registry.initializeProvider('anthropic');

      expect(provider.initialize).toHaveBeenCalledTimes(1);
      expect(provider.initialize).toHaveBeenCalledWith(undefined);
      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
      expect(registry.isReady('anthropic')).toBe(true);
    });

    it('should pass options to provider.initialize()', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      const options = { apiKey: 'sk-test', timeout: 5000 };
      await registry.initializeProvider('anthropic', options);

      expect(provider.initialize).toHaveBeenCalledTimes(1);
      expect(provider.initialize).toHaveBeenCalledWith(options);
    });

    it('should cache promise to prevent duplicate initialization', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      // Track concurrent initialization calls
      let initCallCount = 0;
      provider.initialize = vi.fn().mockImplementation(async () => {
        initCallCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Start multiple concurrent initializations
      const promise1 = registry.initializeProvider('anthropic');
      const promise2 = registry.initializeProvider('anthropic');
      const promise3 = registry.initializeProvider('anthropic');

      // All promises should resolve
      await Promise.all([promise1, promise2, promise3]);

      // Provider should only be initialized once (promise caching worked)
      expect(provider.initialize).toHaveBeenCalledTimes(1);
    });

    it('should return immediately if already initialized', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      await registry.initializeProvider('anthropic');
      expect(provider.initialize).toHaveBeenCalledTimes(1);

      // Second call should return immediately without re-initializing
      await registry.initializeProvider('anthropic');
      expect(provider.initialize).toHaveBeenCalledTimes(1);
    });

    it('should throw if provider is not registered', async () => {
      const registry = ProviderRegistry.getInstance();

      await expect(registry.initializeProvider('anthropic')).rejects.toThrow(
        "Provider 'anthropic' is not registered"
      );
    });

    it('should store error on initialization failure', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      const initError = new Error('Initialization failed');
      provider.initialize = vi.fn().mockRejectedValue(initError);
      registry.register(provider);

      await expect(registry.initializeProvider('anthropic')).rejects.toThrow('Initialization failed');

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.FAILED);
      expect(registry.isReady('anthropic')).toBe(false);

      const statuses = registry.getAllStatuses();
      const state = statuses.get('anthropic');
      expect(state?.error).toBe(initError);
    });

    it('should track initialization state transitions', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      // Initially uninitialized
      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);

      // During initialization (hard to test directly, but we can check after)
      const initPromise = registry.initializeProvider('anthropic');

      // After completion
      await initPromise;
      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    });
  });

  describe('initializeAll()', () => {
    it('should initialize all registered providers in parallel', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      registry.register(anthropic);
      registry.register(opencode);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: {
          anthropic: { apiKey: 'sk-anthropic' },
          opencode: { endpoint: 'http://localhost:8080' }
        }
      };

      const result = await registry.initializeAll(config);

      expect(result.success).toContain('anthropic');
      expect(result.success).toContain('opencode');
      expect(result.failed).toHaveLength(0);

      expect(anthropic.initialize).toHaveBeenCalledWith({ apiKey: 'sk-anthropic' });
      expect(opencode.initialize).toHaveBeenCalledWith({ endpoint: 'http://localhost:8080' });
    });

    it('should allow partial success - one failure should not prevent others', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Make opencode fail
      const opencodeError = new Error('OpenCode connection failed');
      opencode.initialize = vi.fn().mockRejectedValue(opencodeError);

      registry.register(anthropic);
      registry.register(opencode);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: undefined
      };

      const result = await registry.initializeAll(config);

      expect(result.success).toContain('anthropic');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].providerId).toBe('opencode');
      expect(result.failed[0].error).toBe(opencodeError);
    });

    it('should aggregate all errors in failed array', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      const anthropicError = new Error('Anthropic auth failed');
      const opencodeError = new Error('OpenCode connection failed');

      anthropic.initialize = vi.fn().mockRejectedValue(anthropicError);
      opencode.initialize = vi.fn().mockRejectedValue(opencodeError);

      registry.register(anthropic);
      registry.register(opencode);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: undefined
      };

      const result = await registry.initializeAll(config);

      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(2);

      const failedProviderIds = result.failed.map(f => f.providerId).sort();
      expect(failedProviderIds).toEqual(['anthropic', 'opencode']);
    });

    it('should return empty results for empty registry', async () => {
      const registry = ProviderRegistry.getInstance();

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: undefined
      };

      const result = await registry.initializeAll(config);

      expect(result.success).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('should resolve options from config.providerDefaults', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      registry.register(anthropic);
      registry.register(opencode);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: {
          anthropic: { apiKey: 'sk-123', timeout: 10000 },
          opencode: { endpoint: 'http://localhost:9000' }
        }
      };

      await registry.initializeAll(config);

      expect(anthropic.initialize).toHaveBeenCalledWith({ apiKey: 'sk-123', timeout: 10000 });
      expect(opencode.initialize).toHaveBeenCalledWith({ endpoint: 'http://localhost:9000' });
    });

    it('should handle undefined providerDefaults', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      registry.register(anthropic);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: undefined
      };

      await registry.initializeAll(config);

      expect(anthropic.initialize).toHaveBeenCalledWith(undefined);
    });

    it('should use Promise.allSettled for parallel execution', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Track timing to verify parallel execution
      let anthropicStartTime = 0;
      let opencodeStartTime = 0;

      anthropic.initialize = vi.fn().mockImplementation(async () => {
        anthropicStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      opencode.initialize = vi.fn().mockImplementation(async () => {
        opencodeStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      registry.register(anthropic);
      registry.register(opencode);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: undefined
      };

      const overallStart = Date.now();
      await registry.initializeAll(config);
      const overallDuration = Date.now() - overallStart;

      // Both should have started at roughly the same time (parallel)
      expect(Math.abs(anthropicStartTime - opencodeStartTime)).toBeLessThan(20);

      // Total time should be close to single provider time (not sum of both)
      expect(overallDuration).toBeLessThan(120); // 50ms + overhead, not 100ms
    });
  });

  describe('getStatus()', () => {
    it('should return UNINITIALIZED for unknown provider', () => {
      const registry = ProviderRegistry.getInstance();
      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);
    });

    it('should return correct status after initialization', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);

      await registry.initializeProvider('anthropic');

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    });

    it('should return FAILED after initialization failure', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      provider.initialize = vi.fn().mockRejectedValue(new Error('Failed'));
      registry.register(provider);

      try {
        await registry.initializeProvider('anthropic');
      } catch {
        // Expected to fail
      }

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.FAILED);
    });
  });

  describe('isReady()', () => {
    it('should return false for uninitialized provider', () => {
      const registry = ProviderRegistry.getInstance();
      expect(registry.isReady('anthropic')).toBe(false);
    });

    it('should return true for initialized provider', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      await registry.initializeProvider('anthropic');

      expect(registry.isReady('anthropic')).toBe(true);
    });

    it('should return false for failed provider', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      provider.initialize = vi.fn().mockRejectedValue(new Error('Failed'));
      registry.register(provider);

      try {
        await registry.initializeProvider('anthropic');
      } catch {
        // Expected to fail
      }

      expect(registry.isReady('anthropic')).toBe(false);
    });
  });

  describe('getAllStatuses()', () => {
    it('should return empty map for empty registry', () => {
      const registry = ProviderRegistry.getInstance();
      const statuses = registry.getAllStatuses();

      expect(statuses).toBeInstanceOf(Map);
      expect(statuses.size).toBe(0);
    });

    it('should return all provider statuses', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      registry.register(anthropic);
      registry.register(opencode);

      // Initialize both providers to create state entries
      await registry.initializeProvider('anthropic');
      await registry.initializeProvider('opencode');

      const statuses = registry.getAllStatuses();

      expect(statuses.size).toBe(2);
      expect(statuses.get('anthropic')?.status).toBe(InitializationStatus.INITIALIZED);
      expect(statuses.get('opencode')?.status).toBe(InitializationStatus.INITIALIZED);
    });

    it('should return a copy (not internal Map)', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      // Initialize to create state entry
      await registry.initializeProvider('anthropic');

      const statuses1 = registry.getAllStatuses();
      const statuses2 = registry.getAllStatuses();

      // Should be different Map instances
      expect(statuses1).not.toBe(statuses2);

      // Modifying returned map should not affect internal state
      statuses1.clear();
      const statuses3 = registry.getAllStatuses();
      expect(statuses3.size).toBe(1);
    });
  });

  describe('_resetInitStateForTesting()', () => {
    it('should clear all initialization states', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      await registry.initializeProvider('anthropic');
      expect(registry.isReady('anthropic')).toBe(true);

      registry._resetInitStateForTesting();

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);
      expect(registry.isReady('anthropic')).toBe(false);
    });

    it('should allow re-initialization after reset', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      // First initialization
      await registry.initializeProvider('anthropic');
      expect(provider.initialize).toHaveBeenCalledTimes(1);

      // Reset
      registry._resetInitStateForTesting();

      // Second initialization should work
      await registry.initializeProvider('anthropic');
      expect(provider.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('Initialization Integration Scenarios', () => {
    it('should handle typical initialization workflow', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      registry.register(anthropic);
      registry.register(opencode);

      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: {
          anthropic: { apiKey: 'sk-test' },
          opencode: { endpoint: 'http://localhost:8080' }
        }
      };

      // Initialize all
      const result = await registry.initializeAll(config);
      expect(result.success).toHaveLength(2);

      // Check readiness
      expect(registry.isReady('anthropic')).toBe(true);
      expect(registry.isReady('opencode')).toBe(true);

      // Get all statuses
      const statuses = registry.getAllStatuses();
      expect(statuses.size).toBe(2);
    });

    it('should handle concurrent initialization calls', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      registry.register(provider);

      // Fire multiple concurrent initializations
      const promises = [
        registry.initializeProvider('anthropic'),
        registry.initializeProvider('anthropic'),
        registry.initializeProvider('anthropic'),
        registry.initializeProvider('anthropic')
      ];

      await Promise.all(promises);

      // Should only initialize once
      expect(provider.initialize).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Provider Termination Tests (P1.M3.T1.S3)
  // ============================================================================

  describe('terminateAll()', () => {
    it('should terminate all registered providers', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      registry.register(anthropic);
      registry.register(opencode);

      await registry.terminateAll();

      expect(anthropic.terminate).toHaveBeenCalledTimes(1);
      expect(opencode.terminate).toHaveBeenCalledTimes(1);
    });

    it('should call terminate() on each provider', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');

      registry.register(provider);

      await registry.terminateAll();

      expect(provider.terminate).toHaveBeenCalledWith();
      expect(provider.terminate).toHaveBeenCalledTimes(1);
    });

    it('should continue on error - one provider failure should not prevent others', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Make anthropic fail
      const anthropicError = new Error('Anthropic terminate failed');
      anthropic.terminate = vi.fn().mockRejectedValue(anthropicError);

      registry.register(anthropic);
      registry.register(opencode);

      // Should not throw despite failure
      await expect(registry.terminateAll()).resolves.not.toThrow();

      // Both terminate() should be called despite failure
      expect(anthropic.terminate).toHaveBeenCalledTimes(1);
      expect(opencode.terminate).toHaveBeenCalledTimes(1);
    });

    it('should clear providers map after termination', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      registry.register(anthropic);
      registry.register(opencode);

      expect(registry.has('anthropic')).toBe(true);
      expect(registry.has('opencode')).toBe(true);

      await registry.terminateAll();

      expect(registry.has('anthropic')).toBe(false);
      expect(registry.has('opencode')).toBe(false);
    });

    it('should clear states map after termination', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');

      registry.register(anthropic);
      await registry.initializeProvider('anthropic');

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
      expect(registry.getAllStatuses().size).toBe(1);

      await registry.terminateAll();

      expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);
      expect(registry.getAllStatuses().size).toBe(0);
    });

    it('should handle empty registry gracefully', async () => {
      const registry = ProviderRegistry.getInstance();

      // Should not throw on empty registry
      await expect(registry.terminateAll()).resolves.not.toThrow();
    });

    it('should use Promise.allSettled for parallel termination', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Track timing to verify parallel execution
      let anthropicStartTime = 0;
      let opencodeStartTime = 0;

      anthropic.terminate = vi.fn().mockImplementation(async () => {
        anthropicStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      opencode.terminate = vi.fn().mockImplementation(async () => {
        opencodeStartTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      registry.register(anthropic);
      registry.register(opencode);

      const overallStart = Date.now();
      await registry.terminateAll();
      const overallDuration = Date.now() - overallStart;

      // Both should have started at roughly the same time (parallel)
      expect(Math.abs(anthropicStartTime - opencodeStartTime)).toBeLessThan(20);

      // Total time should be close to single provider time (not sum of both)
      expect(overallDuration).toBeLessThan(120); // 50ms + overhead, not 100ms
    });

    it('should log errors for failed terminations', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const terminateError = new Error('Termination failed');
      provider.terminate = vi.fn().mockRejectedValue(terminateError);

      registry.register(provider);

      await registry.terminateAll();

      // Verify error was logged with provider ID
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to terminate provider 'anthropic':",
        terminateError
      );

      errorSpy.mockRestore();
    });

    it('should never throw - always resolves successfully', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Make both fail
      anthropic.terminate = vi.fn().mockRejectedValue(new Error('Anthropic failed'));
      opencode.terminate = vi.fn().mockRejectedValue(new Error('OpenCode failed'));

      registry.register(anthropic);
      registry.register(opencode);

      // Method should resolve without throwing
      await expect(registry.terminateAll()).resolves.not.toThrow();
      await expect(registry.terminateAll()).resolves.toBeUndefined();

      // Maps should still be cleared despite failures
      expect(registry.has('anthropic')).toBe(false);
      expect(registry.has('opencode')).toBe(false);
    });

    it('should clear maps after all terminations complete (not before)', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');

      let providersCleared = false;
      provider.terminate = vi.fn().mockImplementation(async () => {
        // During termination, providers should still be accessible
        expect(registry.has('anthropic')).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 10));
        // After terminate, maps might be cleared but check timing
      });

      registry.register(provider);

      await registry.terminateAll();

      // Only after terminateAll completes should maps be cleared
      expect(registry.has('anthropic')).toBe(false);
    });

    it('should allow registry reuse after termination', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider1 = createMockProvider('anthropic');

      registry.register(provider1);
      expect(registry.has('anthropic')).toBe(true);

      await registry.terminateAll();
      expect(registry.has('anthropic')).toBe(false);

      // Should be able to register new providers
      const provider2 = createMockProvider('anthropic');
      expect(() => {
        registry.register(provider2);
      }).not.toThrow();

      expect(registry.has('anthropic')).toBe(true);
    });
  });

  describe('Termination Integration Scenarios', () => {
    it('should handle full lifecycle: register, initialize, terminate', async () => {
      const registry = ProviderRegistry.getInstance();
      const anthropic = createMockProvider('anthropic');
      const opencode = createMockProvider('opencode');

      // Register
      registry.register(anthropic);
      registry.register(opencode);

      // Initialize
      const config = {
        defaultProvider: 'anthropic' as const,
        providerDefaults: {
          anthropic: { apiKey: 'sk-test' }
        }
      };
      await registry.initializeAll(config);

      expect(registry.isReady('anthropic')).toBe(true);
      expect(registry.isReady('opencode')).toBe(true);

      // Terminate
      await registry.terminateAll();

      expect(anthropic.terminate).toHaveBeenCalledTimes(1);
      expect(opencode.terminate).toHaveBeenCalledTimes(1);
      expect(registry.has('anthropic')).toBe(false);
      expect(registry.has('opencode')).toBe(false);
    });

    it('should support re-initialization after termination', async () => {
      const registry = ProviderRegistry.getInstance();
      const provider = createMockProvider('anthropic');

      // First lifecycle
      registry.register(provider);
      await registry.initializeProvider('anthropic');
      await registry.terminateAll();

      expect(provider.initialize).toHaveBeenCalledTimes(1);
      expect(provider.terminate).toHaveBeenCalledTimes(1);

      // Reset test state to allow re-registration
      registry._resetInitStateForTesting();

      // Second lifecycle
      const provider2 = createMockProvider('anthropic');
      registry.register(provider2);
      await registry.initializeProvider('anthropic');

      expect(provider2.initialize).toHaveBeenCalledTimes(1);
      expect(registry.isReady('anthropic')).toBe(true);
    });
  });
});

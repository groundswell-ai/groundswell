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
import { ProviderRegistry } from '../../../providers/provider-registry.js';
import type { Provider, ProviderId, ProviderCapabilities } from '../../../types/providers.js';
import type { AgentResponse } from '../../../types/agent.js';
import type { ProviderRequest, ToolExecutor, ProviderHookEvents, ModelSpec } from '../../../types/providers.js';
import type { MCPServer, Tool, Skill } from '../../../types/sdk-primitives.js';

// Reset after each test for isolation
afterEach(() => {
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
});

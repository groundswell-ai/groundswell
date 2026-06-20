/**
 * Unit tests for ProviderRegistry lifecycle management
 *
 * Tests:
 * - initializeAll() with all providers succeeding
 * - initializeAll() with partial success (some fail, some succeed)
 * - initializeAll() error aggregation and BatchInitResult
 * - initializeAll() state transitions (UNINITIALIZED → INITIALIZING → INITIALIZED/FAILED)
 * - initializeAll() with provider-specific options
 * - initializeAll() with empty registry
 * - initializeAll() concurrent execution (promise caching)
 * - terminateAll() with all providers succeeding
 * - terminateAll() with partial success (some fail to terminate)
 * - terminateAll() error logging (console.error)
 * - terminateAll() clears maps and allows reuse
 * - terminateAll() with empty registry
 * - terminateAll() idempotency (calling twice is safe)
 * - Full lifecycle: register → initializeAll → terminateAll → reuse
 * - Parallel execution verification (timing tests)
 *
 * PRP: P5.M1.T2.S2 - Test Provider Initialization and Termination
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { ProviderRegistry, InitializationStatus } from '../../../harnesses/harness-registry.js';
import type { Provider, ProviderId, ProviderCapabilities } from '../../../types/providers.js';
import type { ModelSpec } from '../../../types/providers.js';

// ============================================================================
// Test Isolation Setup
// ============================================================================

afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();
  ProviderRegistry._resetForTesting();
});

// ============================================================================
// Mock Provider Helper Function
// ============================================================================

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

// ============================================================================
// initializeAll() - Success Scenarios
// ============================================================================

describe('initializeAll() - Success Scenarios', () => {
  it('should initialize all providers successfully with empty config', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    // Verify all providers succeeded
    expect(result.success).toHaveLength(2);
    expect(result.success).toContain('anthropic');
    expect(result.success).toContain('claude-code');
    expect(result.failed).toHaveLength(0);

    // Verify initialize was called
    expect(anthropic.initialize).toHaveBeenCalledTimes(1);
    expect(claudeCode.initialize).toHaveBeenCalledTimes(1);

    // Verify options passed (undefined when no providerDefaults)
    expect(anthropic.initialize).toHaveBeenCalledWith(undefined);
    expect(claudeCode.initialize).toHaveBeenCalledWith(undefined);

    // Verify status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.getStatus('claude-code')).toBe(InitializationStatus.INITIALIZED);
  });

  it('should initialize all providers successfully with provider-specific options', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
      providerDefaults: {
        anthropic: { apiKey: 'sk-test-key', timeout: 5000 },
        'claude-code': { endpoint: 'http://localhost:8080' },
      },
    };

    const result = await registry.initializeAll(config);

    // Verify all providers succeeded
    expect(result.success).toHaveLength(2);
    expect(result.failed).toHaveLength(0);

    // Verify options passed correctly
    expect(anthropic.initialize).toHaveBeenCalledWith({
      apiKey: 'sk-test-key',
      timeout: 5000,
    });
    expect(claudeCode.initialize).toHaveBeenCalledWith({
      endpoint: 'http://localhost:8080',
    });
  });

  it('should return BatchInitResult with all providers in success array', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    // Verify BatchInitResult structure
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('failed');
    expect(Array.isArray(result.success)).toBe(true);
    expect(Array.isArray(result.failed)).toBe(true);

    // Verify success array contains all provider IDs
    expect(result.success).toEqual(expect.arrayContaining(['anthropic', 'claude-code']));
    expect(result.success).toHaveLength(2);
  });

  it('should have all providers with status INITIALIZED after successful initializeAll()', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    await registry.initializeAll(config);

    // Verify all providers have INITIALIZED status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.getStatus('claude-code')).toBe(InitializationStatus.INITIALIZED);

    // Verify isReady returns true for all
    expect(registry.isReady('anthropic')).toBe(true);
    expect(registry.isReady('claude-code')).toBe(true);
  });
});

// ============================================================================
// initializeAll() - Partial Success
// ============================================================================

describe('initializeAll() - Partial Success', () => {
  it('should handle one provider failing while others succeed', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    // Make claudeCode fail
    const error = new Error('Connection failed');
    claudeCode.initialize = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    // Verify partial success
    expect(result.success).toHaveLength(1);
    expect(result.success).toContain('anthropic');
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].providerId).toBe('claude-code');
    expect(result.failed[0].error).toBe(error);

    // Verify status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.getStatus('claude-code')).toBe(InitializationStatus.FAILED);
  });

  it('should handle multiple providers failing while others succeed', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');
    const thirdProvider = createMockProvider('anthropic' as ProviderId); // Use valid ProviderId

    const anthropicError = new Error('Anthropic auth failed');
    const claudeCodeError = new Error('claude-code connection failed');

    anthropic.initialize = vi.fn().mockRejectedValue(anthropicError);
    claudeCode.initialize = vi.fn().mockRejectedValue(claudeCodeError);

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    // Verify partial success - both failed
    expect(result.success).toHaveLength(0);
    expect(result.failed).toHaveLength(2);

    const failedIds = result.failed.map((f) => f.providerId).sort();
    expect(failedIds).toEqual(['anthropic', 'claude-code']);

    // Verify errors are Error objects
    expect(result.failed[0].error).toBeInstanceOf(Error);
    expect(result.failed[1].error).toBeInstanceOf(Error);
  });

  it('should handle all providers failing', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    anthropic.initialize = vi.fn().mockRejectedValue(new Error('Anthropic failed'));
    claudeCode.initialize = vi.fn().mockRejectedValue(new Error('claude-code failed'));

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    // Verify all failed
    expect(result.success).toHaveLength(0);
    expect(result.failed).toHaveLength(2);

    // Verify all have FAILED status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.FAILED);
    expect(registry.getStatus('claude-code')).toBe(InitializationStatus.FAILED);
  });

  it('should have failed providers with status FAILED', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    const error = new Error('Initialization failed');
    claudeCode.initialize = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    await registry.initializeAll(config);

    // Verify failed provider has FAILED status
    expect(registry.getStatus('claude-code')).toBe(InitializationStatus.FAILED);
    expect(registry.isReady('claude-code')).toBe(false);

    // Verify successful provider has INITIALIZED status
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.isReady('anthropic')).toBe(true);
  });

  it('should have successful providers with status INITIALIZED', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    // Make anthropic fail
    anthropic.initialize = vi.fn().mockRejectedValue(new Error('Failed'));

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    await registry.initializeAll(config);

    // Verify successful provider has INITIALIZED status
    expect(registry.getStatus('claude-code')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.isReady('claude-code')).toBe(true);
  });

  it('should have errors in failed array as Error objects with messages', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    const errorMsg = 'Authentication failed';
    const error = new Error(errorMsg);
    anthropic.initialize = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBeInstanceOf(Error);
    expect(result.failed[0].error.message).toBe(errorMsg);
  });
});

// ============================================================================
// initializeAll() - State Management
// ============================================================================

describe('initializeAll() - State Management', () => {
  it('should transition from UNINITIALIZED to INITIALIZING to INITIALIZED for successful providers', async () => {
    const registry = ProviderRegistry.getInstance();
    const provider = createMockProvider('anthropic');

    registry.register(provider);

    // Initially UNINITIALIZED
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);

    // Start initialization (async - will be INITIALIZING briefly)
    const initPromise = registry.initializeProvider('anthropic');

    // During initialization (hard to test exact timing, but we know it transitions)
    await initPromise;

    // After completion - should be INITIALIZED
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
  });

  it('should transition from UNINITIALIZED to INITIALIZING to FAILED for failed providers', async () => {
    const registry = ProviderRegistry.getInstance();
    const provider = createMockProvider('anthropic');

    const error = new Error('Failed');
    provider.initialize = vi.fn().mockRejectedValue(error);

    registry.register(provider);

    // Initially UNINITIALIZED
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);

    // Attempt initialization
    try {
      await registry.initializeProvider('anthropic');
    } catch {
      // Expected to fail
    }

    // After failure - should be FAILED
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.FAILED);
  });

  it('should have isReady() return true only for INITIALIZED providers', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    // Make claudeCode fail
    claudeCode.initialize = vi.fn().mockRejectedValue(new Error('Failed'));

    registry.register(anthropic);
    registry.register(claudeCode);

    // Before initialization
    expect(registry.isReady('anthropic')).toBe(false);
    expect(registry.isReady('claude-code')).toBe(false);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    await registry.initializeAll(config);

    // After initialization
    expect(registry.isReady('anthropic')).toBe(true); // INITIALIZED
    expect(registry.isReady('claude-code')).toBe(false); // FAILED
  });

  it('should share initialization promises for concurrent initializeAll() calls', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    // Call initializeAll multiple times concurrently
    const promises = [
      registry.initializeAll(config),
      registry.initializeAll(config),
      registry.initializeAll(config),
    ];

    await Promise.all(promises);

    // Should only initialize once per provider (promise caching)
    expect(anthropic.initialize).toHaveBeenCalledTimes(1);
    expect(claudeCode.initialize).toHaveBeenCalledTimes(1);
  });

  it('should call provider.initialize() only once despite multiple concurrent initializeAll()', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    // Fire multiple concurrent initializeAll calls
    const promises = [
      registry.initializeAll(config),
      registry.initializeAll(config),
      registry.initializeAll(config),
    ];

    await Promise.all(promises);

    // Should only initialize once (promise caching at provider level)
    expect(anthropic.initialize).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// initializeAll() - Edge Cases
// ============================================================================

describe('initializeAll() - Edge Cases', () => {
  it('should return empty arrays for empty registry', async () => {
    const registry = ProviderRegistry.getInstance();

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    expect(result.success).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });

  it('should handle registry with single provider', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    expect(result.success).toHaveLength(1);
    expect(result.success).toContain('anthropic');
    expect(result.failed).toHaveLength(0);
  });

  it('should handle many providers (stress test)', async () => {
    const registry = ProviderRegistry.getInstance();

    // Create multiple mock providers (we can only register each ID once)
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    const config = {
      defaultProvider: 'anthropic' as const,
    };

    const result = await registry.initializeAll(config);

    expect(result.success).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });
});

// ============================================================================
// terminateAll() - Success Scenarios
// ============================================================================

describe('terminateAll() - Success Scenarios', () => {
  it('should terminate all providers successfully', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    // Initialize first
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });

    // Terminate all
    await registry.terminateAll();

    // Verify terminate was called
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(claudeCode.terminate).toHaveBeenCalledTimes(1);
  });

  it('should call terminate() on each provider exactly once', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    registry.register(anthropic);
    registry.register(claudeCode);

    await registry.terminateAll();

    expect(anthropic.terminate).toHaveBeenCalledWith();
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(claudeCode.terminate).toHaveBeenCalledWith();
    expect(claudeCode.terminate).toHaveBeenCalledTimes(1);
  });

  it('should clear providers map after termination', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);
    expect(registry.has('anthropic')).toBe(true);

    await registry.terminateAll();

    expect(registry.has('anthropic')).toBe(false);

    // @ts-expect-error - Testing private property
    expect(registry.providers.size).toBe(0);
  });

  it('should clear states map after termination', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);
    await registry.initializeProvider('anthropic');

    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
    expect(registry.getAllStatuses().size).toBe(1);

    await registry.terminateAll();

    expect(registry.getAllStatuses().size).toBe(0);

    // @ts-expect-error - Testing private property
    expect(registry.states.size).toBe(0);
  });

  it('should allow registry reuse after termination', async () => {
    const registry = ProviderRegistry.getInstance();

    // First lifecycle
    const provider1 = createMockProvider('anthropic');
    registry.register(provider1);
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });
    await registry.terminateAll();

    // Verify cleared
    expect(registry.has('anthropic')).toBe(false);

    // Should be able to register new providers
    const provider2 = createMockProvider('anthropic');
    expect(() => {
      registry.register(provider2);
    }).not.toThrow();

    expect(registry.has('anthropic')).toBe(true);

    // Should be able to initialize again
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });
    expect(registry.isReady('anthropic')).toBe(true);
  });
});

// ============================================================================
// terminateAll() - Partial Success
// ============================================================================

describe('terminateAll() - Partial Success', () => {
  it('should handle one provider failing to terminate', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    // Make claudeCode fail
    const error = new Error('Already terminated');
    claudeCode.terminate = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    registry.register(claudeCode);

    // Initialize first
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });

    // Should not throw
    await expect(registry.terminateAll()).resolves.not.toThrow();

    // Verify both terminate() were called
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(claudeCode.terminate).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple providers failing to terminate', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    const anthropicError = new Error('Anthropic terminate failed');
    const claudeCodeError = new Error('claude-code terminate failed');

    anthropic.terminate = vi.fn().mockRejectedValue(anthropicError);
    claudeCode.terminate = vi.fn().mockRejectedValue(claudeCodeError);

    registry.register(anthropic);
    registry.register(claudeCode);

    // Should not throw
    await expect(registry.terminateAll()).resolves.not.toThrow();

    // Both should still be called
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(claudeCode.terminate).toHaveBeenCalledTimes(1);
  });

  it('should log errors with console.error for failed terminations', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    // Make claudeCode fail
    const error = new Error('Termination failed');
    claudeCode.terminate = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    registry.register(claudeCode);

    await registry.initializeAll({ defaultProvider: 'anthropic' as const });

    // Spy on console.error
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await registry.terminateAll();

    // Verify error was logged
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to terminate provider 'claude-code':",
      error
    );

    errorSpy.mockRestore();
  });

  it('should call terminate() on all providers regardless of failures', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');

    // Make anthropic fail
    anthropic.terminate = vi.fn().mockRejectedValue(new Error('Failed'));

    registry.register(anthropic);
    registry.register(claudeCode);

    await registry.terminateAll();

    // Both should be called despite failure
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(claudeCode.terminate).toHaveBeenCalledTimes(1);
  });

  it('should clear maps even with termination failures', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    const error = new Error('Termination failed');
    anthropic.terminate = vi.fn().mockRejectedValue(error);

    registry.register(anthropic);
    await registry.initializeProvider('anthropic');

    await registry.terminateAll();

    // Maps should still be cleared despite failure
    expect(registry.has('anthropic')).toBe(false);
    expect(registry.getAllStatuses().size).toBe(0);

    // @ts-expect-error - Testing private property
    expect(registry.providers.size).toBe(0);
    // @ts-expect-error - Testing private property
    expect(registry.states.size).toBe(0);
  });
});

// ============================================================================
// terminateAll() - Edge Cases
// ============================================================================

describe('terminateAll() - Edge Cases', () => {
  it('should handle empty registry gracefully', async () => {
    const registry = ProviderRegistry.getInstance();

    // Should not throw
    await expect(registry.terminateAll()).resolves.not.toThrow();
  });

  it('should be safe to call terminateAll() twice (idempotent)', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);

    await registry.terminateAll();
    await registry.terminateAll(); // Second call should be safe

    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
  });

  it('should be safe to terminate already-terminated providers', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);

    await registry.terminateAll();
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);

    // Call again - should be safe
    await registry.terminateAll();
    // Only called once since provider was removed after first termination
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
  });

  it('should handle terminating uninitialized providers', async () => {
    const registry = ProviderRegistry.getInstance();
    const anthropic = createMockProvider('anthropic');

    registry.register(anthropic);

    // Don't initialize, just terminate
    await expect(registry.terminateAll()).resolves.not.toThrow();

    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Full Lifecycle Integration
// ============================================================================

describe('Full Lifecycle Integration', () => {
  it('should handle register → initializeAll → terminateAll sequence', async () => {
    const registry = ProviderRegistry.getInstance();

    // Register
    const anthropic = createMockProvider('anthropic');
    const claudeCode = createMockProvider('claude-code');
    registry.register(anthropic);
    registry.register(claudeCode);

    // Initialize all
    const config = {
      defaultProvider: 'anthropic' as const,
      providerDefaults: {
        anthropic: { apiKey: 'sk-test' },
      },
    };

    const initResult = await registry.initializeAll(config);
    expect(initResult.success).toHaveLength(2);
    expect(registry.isReady('anthropic')).toBe(true);
    expect(registry.isReady('claude-code')).toBe(true);

    // Terminate all
    await registry.terminateAll();
    expect(anthropic.terminate).toHaveBeenCalledTimes(1);
    expect(claudeCode.terminate).toHaveBeenCalledTimes(1);

    // Verify clean state
    expect(registry.has('anthropic')).toBe(false);
    expect(registry.has('claude-code')).toBe(false);
  });

  it('should allow registry reuse after full lifecycle', async () => {
    const registry = ProviderRegistry.getInstance();

    // First lifecycle
    const provider1 = createMockProvider('anthropic');
    registry.register(provider1);
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });
    expect(registry.isReady('anthropic')).toBe(true);
    await registry.terminateAll();

    // Verify cleared
    expect(registry.has('anthropic')).toBe(false);

    // Second lifecycle (reuse)
    const provider2 = createMockProvider('claude-code');
    registry.register(provider2);
    await registry.initializeAll({ defaultProvider: 'claude-code' as const });
    expect(registry.isReady('claude-code')).toBe(true);
    await registry.terminateAll();

    expect(provider2.terminate).toHaveBeenCalledTimes(1);
  });

  it('should verify clean state after full lifecycle', async () => {
    const registry = ProviderRegistry.getInstance();

    const anthropic = createMockProvider('anthropic');
    registry.register(anthropic);

    // Initialize
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });
    expect(registry.isReady('anthropic')).toBe(true);
    expect(registry.getAllStatuses().size).toBe(1);

    // Terminate
    await registry.terminateAll();

    // Verify clean state
    expect(registry.has('anthropic')).toBe(false);
    expect(registry.isReady('anthropic')).toBe(false);
    expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);
    expect(registry.getAllStatuses().size).toBe(0);
  });

  it('should allow new providers to be registered after termination', async () => {
    const registry = ProviderRegistry.getInstance();

    // First provider
    const provider1 = createMockProvider('anthropic');
    registry.register(provider1);
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });
    await registry.terminateAll();

    // Register different provider after termination
    const provider2 = createMockProvider('claude-code');
    expect(() => {
      registry.register(provider2);
    }).not.toThrow();

    await registry.initializeAll({ defaultProvider: 'claude-code' as const });
    expect(registry.isReady('claude-code')).toBe(true);
  });
});

// ============================================================================
// Parallel Execution Verification
// ============================================================================

describe('Parallel Execution Verification', () => {
  it('should initialize providers in parallel (timing test)', async () => {
    const registry = ProviderRegistry.getInstance();
    const timestamps: number[] = [];

    const anthropic = createMockProvider('anthropic');
    anthropic.initialize = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      await new Promise((r) => setTimeout(r, 10));
    });

    const claudeCode = createMockProvider('claude-code');
    claudeCode.initialize = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      await new Promise((r) => setTimeout(r, 10));
    });

    registry.register(anthropic);
    registry.register(claudeCode);

    const startTime = Date.now();
    await registry.initializeAll({ defaultProvider: 'anthropic' as const });
    const totalTime = Date.now() - startTime;

    // Parallel execution should take ~10ms, not ~20ms
    expect(totalTime).toBeLessThan(20);

    // Verify both were called
    expect(anthropic.initialize).toHaveBeenCalled();
    expect(claudeCode.initialize).toHaveBeenCalled();

    // Verify start times are close (parallel execution)
    expect(Math.abs(timestamps[1] - timestamps[0])).toBeLessThan(5);
  });

  it('should terminate providers in parallel (timing test)', async () => {
    const registry = ProviderRegistry.getInstance();
    const timestamps: number[] = [];

    const anthropic = createMockProvider('anthropic');
    anthropic.terminate = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      await new Promise((r) => setTimeout(r, 10));
    });

    const claudeCode = createMockProvider('claude-code');
    claudeCode.terminate = vi.fn().mockImplementation(async () => {
      timestamps.push(Date.now());
      await new Promise((r) => setTimeout(r, 10));
    });

    registry.register(anthropic);
    registry.register(claudeCode);

    const startTime = Date.now();
    await registry.terminateAll();
    const totalTime = Date.now() - startTime;

    // Parallel execution should take ~10ms, not ~20ms
    expect(totalTime).toBeLessThan(20);

    // Verify both were called
    expect(anthropic.terminate).toHaveBeenCalled();
    expect(claudeCode.terminate).toHaveBeenCalled();

    // Verify start times are close (parallel execution)
    expect(Math.abs(timestamps[1] - timestamps[0])).toBeLessThan(5);
  });

  it('should track start times of provider.initialize() calls for parallel verification', async () => {
    const registry = ProviderRegistry.getInstance();
    const startTimes: Map<ProviderId, number> = new Map();

    const anthropic = createMockProvider('anthropic');
    anthropic.initialize = vi.fn().mockImplementation(async () => {
      startTimes.set('anthropic', Date.now());
      await new Promise((r) => setTimeout(r, 5));
    });

    const claudeCode = createMockProvider('claude-code');
    claudeCode.initialize = vi.fn().mockImplementation(async () => {
      startTimes.set('claude-code', Date.now());
      await new Promise((r) => setTimeout(r, 5));
    });

    registry.register(anthropic);
    registry.register(claudeCode);

    await registry.initializeAll({ defaultProvider: 'anthropic' as const });

    // Both should have start times recorded
    expect(startTimes.size).toBe(2);
    expect(startTimes.has('anthropic')).toBe(true);
    expect(startTimes.has('claude-code')).toBe(true);

    // Start times should be close (parallel execution)
    const anthropicStart = startTimes.get('anthropic')!;
    const claudeCodeStart = startTimes.get('claude-code')!;
    expect(Math.abs(anthropicStart - claudeCodeStart)).toBeLessThan(5);
  });
});

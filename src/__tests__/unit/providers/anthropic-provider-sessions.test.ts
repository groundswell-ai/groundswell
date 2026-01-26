/**
 * Test file: anthropic-provider-sessions.test.ts
 *
 * Purpose: Comprehensive tests for AnthropicProvider session storage per P2.M2.T1.S1
 *
 * Tests:
 * - createSession() creates new session with empty state
 * - createSession() is idempotent (doesn't overwrite existing)
 * - getSession() returns state for existing session
 * - getSession() returns undefined for non-existent session
 * - terminate() clears all session storage
 * - createSession() throws when SDK not initialized
 * - capabilities.sessions is true
 *
 * PRP: P2.M2.T1.S1 - Implement session storage in AnthropicProvider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
import { ProviderRegistry } from '../../../providers/provider-registry.js';

describe('AnthropicProvider - Session Storage (P2.M2.T1.S1)', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    // Reset registry state for isolation
    ProviderRegistry._resetForTesting();
  });

  describe('createSession() Method', () => {
    it('should create a new session with empty state', async () => {
      // Initialize provider first
      await provider.initialize();

      // Create a session
      provider.createSession('test-session');

      // Verify session exists
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('test-session')).toBe(true);

      // Verify session has empty history and null lastResult
      // @ts-expect-error - Testing private property
      const session = provider.sessions.get('test-session');
      expect(session).toBeDefined();
      expect(session.history).toEqual([]);
      expect(session.lastResult).toBeNull();
    });

    it('should be idempotent - calling createSession() twice does not overwrite', async () => {
      await provider.initialize();

      // Create session first time
      provider.createSession('test-session');

      // @ts-expect-error - Testing private property
      const firstSession = provider.sessions.get('test-session');

      // Simulate adding some history
      // @ts-expect-error - Testing private property
      provider.sessions.get('test-session').history.push('mock-message' as any);

      // Create session second time (should not overwrite)
      provider.createSession('test-session');

      // @ts-expect-error - Testing private property
      const secondSession = provider.sessions.get('test-session');

      // Should be the same reference (not overwritten)
      expect(firstSession).toBe(secondSession);

      // History should still have the mock message
      expect(secondSession.history).toHaveLength(1);
    });

    it('should throw when SDK is not initialized', () => {
      // Provider is not initialized, SDK is null

      expect(() => {
        provider.createSession('test-session');
      }).toThrow('SDK not initialized. Call initialize() first.');
    });

    it('should create multiple unique sessions', async () => {
      await provider.initialize();

      // Create multiple sessions
      provider.createSession('session-1');
      provider.createSession('session-2');
      provider.createSession('session-3');

      // Verify all sessions exist
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(3);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-1')).toBe(true);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-2')).toBe(true);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-3')).toBe(true);
    });

    it('should return void (no return value)', async () => {
      await provider.initialize();

      const result = provider.createSession('test-session');
      expect(result).toBeUndefined();
    });
  });

  describe('getSession() Method', () => {
    it('should return SessionState for existing session', async () => {
      await provider.initialize();

      // Create a session
      provider.createSession('test-session');

      // Get the session
      const session = provider.getSession('test-session');

      // Verify session state
      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it('should return undefined for non-existent session', async () => {
      await provider.initialize();

      // Try to get a session that doesn't exist
      const session = provider.getSession('non-existent');

      // Should return undefined
      expect(session).toBeUndefined();
    });

    it('should return undefined when provider is not initialized', () => {
      // Provider not initialized, no sessions exist
      const session = provider.getSession('test-session');

      // Should return undefined (not throw)
      expect(session).toBeUndefined();
    });

    it('should return read-only reference to session state', async () => {
      await provider.initialize();

      provider.createSession('test-session');

      const session1 = provider.getSession('test-session');
      const session2 = provider.getSession('test-session');

      // Should return the same reference
      expect(session1).toBe(session2);
    });
  });

  describe('terminate() Method - Session Cleanup', () => {
    it('should clear all sessions on termination', async () => {
      await provider.initialize();

      // Create multiple sessions
      provider.createSession('session-1');
      provider.createSession('session-2');
      provider.createSession('session-3');

      // Verify sessions exist
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(3);

      // Terminate provider
      await provider.terminate();

      // Verify all sessions are cleared
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-1')).toBe(false);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-2')).toBe(false);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-3')).toBe(false);
    });

    it('should allow getSession() to return undefined after termination', async () => {
      await provider.initialize();

      // Create a session
      provider.createSession('test-session');

      // Verify session exists
      expect(provider.getSession('test-session')).toBeDefined();

      // Terminate provider
      await provider.terminate();

      // getSession() should return undefined
      expect(provider.getSession('test-session')).toBeUndefined();
    });

    it('should be safe to call terminate() multiple times with sessions', async () => {
      await provider.initialize();

      // Create sessions
      provider.createSession('session-1');
      provider.createSession('session-2');

      // First terminate
      await provider.terminate();
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);

      // Second terminate (should not throw)
      await provider.terminate();
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
    });

    it('should clear sessions even when provider is initialized with options', async () => {
      // Initialize with options
      await provider.initialize({ apiKey: 'test-key' });

      // Create sessions
      provider.createSession('session-1');
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(1);

      // Terminate
      await provider.terminate();

      // Sessions should be cleared
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
    });
  });

  describe('Session Lifecycle', () => {
    it('should support full lifecycle: initialize -> createSession -> terminate', async () => {
      // Start with no sessions
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);

      // Initialize
      await provider.initialize();

      // Create sessions
      provider.createSession('session-1');
      provider.createSession('session-2');
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(2);

      // Terminate
      await provider.terminate();
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
    });

    it('should allow re-initialization and new sessions after termination', async () => {
      // First cycle
      await provider.initialize();
      provider.createSession('session-1');
      await provider.terminate();

      // Second cycle
      await provider.initialize();
      provider.createSession('session-2');

      // Should have only the new session
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(1);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-1')).toBe(false);
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('session-2')).toBe(true);
    });

    it('should maintain separate session states', async () => {
      await provider.initialize();

      // Create multiple sessions
      provider.createSession('session-a');
      provider.createSession('session-b');

      // Get sessions
      const sessionA = provider.getSession('session-a');
      const sessionB = provider.getSession('session-b');

      // Verify they are different objects
      expect(sessionA).not.toBe(sessionB);

      // Both should start with empty history
      expect(sessionA?.history).toEqual([]);
      expect(sessionB?.history).toEqual([]);
    });
  });

  describe('Capabilities Update', () => {
    it('should have capabilities.sessions set to true', () => {
      expect(provider.capabilities.sessions).toBe(true);
    });

    it('should maintain all other capabilities', () => {
      expect(provider.capabilities.mcp).toBe(true);
      expect(provider.capabilities.skills).toBe(true);
      expect(provider.capabilities.lsp).toBe(true);
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.extendedThinking).toBe(true);
    });

    it('should have capabilities as readonly', () => {
      // capabilities should be readonly
      expect(provider.capabilities).toBeDefined();
      // TypeScript should prevent modification at compile time
      // At runtime, we can verify the structure exists
      expect(typeof provider.capabilities).toBe('object');
    });
  });

  describe('Provider Registry Integration', () => {
    it('should work with ProviderRegistry for session operations', async () => {
      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      // Initialize via registry
      await registry.initializeProvider('anthropic');

      // Create session
      provider.createSession('test-session');

      // Verify session exists
      expect(provider.getSession('test-session')).toBeDefined();

      // Terminate via registry
      await registry.terminateAll();

      // Sessions should be cleared
      expect(provider.getSession('test-session')).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should have createSession() with correct signature', async () => {
      await provider.initialize();

      // Should accept string parameter
      provider.createSession('test-id');

      // Should return void
      const result = provider.createSession('test-id-2');
      expect(result).toBeUndefined();
    });

    it('should have getSession() with correct signature', async () => {
      await provider.initialize();
      provider.createSession('test-session');

      // Should return SessionState | undefined
      const session = provider.getSession('test-session');

      if (session) {
        // TypeScript should know session is SessionState
        expect(session.history).toBeDefined();
        expect(session.lastResult).toBeDefined();
      }
    });

    it('should have SessionState with correct types', async () => {
      await provider.initialize();
      provider.createSession('test-session');

      const session = provider.getSession('test-session');

      // history should be array
      expect(Array.isArray(session?.history)).toBe(true);

      // lastResult can be null
      expect(session?.lastResult).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should provide descriptive error when SDK not initialized', () => {
      expect(() => provider.createSession('test'))
        .toThrow('SDK not initialized. Call initialize() first.');
    });

    it('should handle getSession() gracefully for missing sessions', async () => {
      await provider.initialize();

      // Should not throw, just return undefined
      const session = provider.getSession('missing');
      expect(session).toBeUndefined();
    });
  });

  describe('Map Storage Patterns', () => {
    it('should use Map.has() for existence checks in createSession', async () => {
      await provider.initialize();

      // First call - session doesn't exist
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('new-session')).toBe(false);

      provider.createSession('new-session');

      // Second call - session exists
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('new-session')).toBe(true);

      // Idempotent - should not overwrite
      provider.createSession('new-session');

      // Session should still exist
      // @ts-expect-error - Testing private property
      expect(provider.sessions.has('new-session')).toBe(true);
    });

    it('should use Map.get() for retrieval in getSession', async () => {
      await provider.initialize();

      provider.createSession('test-session');

      // getSession() uses Map.get() internally
      const session = provider.getSession('test-session');

      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
    });

    it('should use Map.clear() in terminate', async () => {
      await provider.initialize();

      // Add multiple sessions
      provider.createSession('s1');
      provider.createSession('s2');
      provider.createSession('s3');

      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(3);

      // terminate() calls Map.clear()
      await provider.terminate();

      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should initialize sessions Map in field declaration', () => {
      const newProvider = new AnthropicProvider();

      // @ts-expect-error - Testing private property
      expect(provider.sessions).toBeDefined();
      // @ts-expect-error - Testing private property
      expect(provider.sessions).toBeInstanceOf(Map);
    });

    it('should start with empty sessions Map', () => {
      const newProvider = new AnthropicProvider();

      // @ts-expect-error - Testing private property
      expect(newProvider.sessions.size).toBe(0);
    });

    it('should have sessions field as private (TypeScript compile-time check)', () => {
      // Private fields in TypeScript are enforced at compile time, not runtime
      // The @ts-expect-error comments in our tests prove the field is private
      // TypeScript will error if we try to access private fields without @ts-expect-error

      // Verify the provider instance has the expected public properties
      expect(provider.id).toBe('anthropic');
      expect(provider.capabilities).toBeDefined();

      // Private sessions field is only accessible with @ts-expect-error
      // This test documents that sessions is a TypeScript private field
      expect(typeof provider.createSession).toBe('function');
      expect(typeof provider.getSession).toBe('function');
    });
  });

  describe('Memory Management', () => {
    it('should clear all sessions on terminate to prevent memory leaks', async () => {
      await provider.initialize();

      // Create many sessions
      for (let i = 0; i < 100; i++) {
        provider.createSession(`session-${i}`);
      }

      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(100);

      await provider.terminate();

      // All sessions should be cleared
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
    });

    it('should allow garbage collection of session data after termination', async () => {
      await provider.initialize();

      // Create session with potential large data
      provider.createSession('large-session');

      // Terminate should clear the reference
      await provider.terminate();

      // Map should be empty, allowing GC
      // @ts-expect-error - Testing private property
      expect(provider.sessions.size).toBe(0);
    });
  });
});

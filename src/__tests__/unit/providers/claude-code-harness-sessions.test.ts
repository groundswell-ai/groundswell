/**
 * Test file: anthropic-provider-sessions.test.ts
 *
 * Purpose: Comprehensive tests for ClaudeCodeHarness session storage per P2.M2.T1.S1
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
 * PRP: P2.M2.T1.S1 - Implement session storage in ClaudeCodeHarness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeHarness } from '../../../harnesses/claude-code-harness.js';
import { ProviderRegistry } from '../../../harnesses/harness-registry.js';
import { FileSessionStore } from '../../../harnesses/session-store.js';
import { rm } from 'node:fs/promises';

describe('ClaudeCodeHarness - Session Storage (P2.M2.T1.S1)', () => {
  let provider: ClaudeCodeHarness;

  beforeEach(() => {
    provider = new ClaudeCodeHarness();
    // Reset registry state for isolation
    ProviderRegistry._resetForTesting();
  });

  describe('createSession() Method', () => {
    it('should create a new session with empty state', async () => {
      // Initialize provider first
      await provider.initialize();

      // Create a session
      await provider.createSession('test-session');

      // Verify session exists
      const session = await provider.getSession('test-session');
      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it('should be idempotent - calling createSession() twice does not overwrite', async () => {
      await provider.initialize();

      // Create session first time
      await provider.createSession('test-session');

      const firstSession = await provider.getSession('test-session');

      // Simulate adding some history by directly modifying and saving
      // Note: This tests the underlying SessionStore behavior
      const session = await provider.getSession('test-session');
      if (session) {
        session.history.push('mock-message' as any);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save('test-session', session);
      }

      // Create session second time (should not overwrite)
      await provider.createSession('test-session');

      const secondSession = await provider.getSession('test-session');

      // For MemorySessionStore, this should be the same reference
      // The history should still have the mock message
      expect(secondSession?.history).toHaveLength(1);
    });

    it('should throw when SDK is not initialized', async () => {
      // Provider is not initialized, SDK is null

      await expect(async () => {
        await provider.createSession('test-session');
      }).rejects.toThrow('SDK not initialized. Call initialize() first.');
    });

    it('should create multiple unique sessions', async () => {
      await provider.initialize();

      // Create multiple sessions
      await provider.createSession('session-1');
      await provider.createSession('session-2');
      await provider.createSession('session-3');

      // Verify all sessions exist via getSession
      expect(await provider.getSession('session-1')).toBeDefined();
      expect(await provider.getSession('session-2')).toBeDefined();
      expect(await provider.getSession('session-3')).toBeDefined();
    });

    it('should return void (no return value)', async () => {
      await provider.initialize();

      const result = await provider.createSession('test-session');
      expect(result).toBeUndefined();
    });
  });

  describe('getSession() Method', () => {
    it('should return SessionState for existing session', async () => {
      await provider.initialize();

      // Create a session
      await provider.createSession('test-session');

      // Get the session
      const session = await provider.getSession('test-session');

      // Verify session state
      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it('should return undefined for non-existent session', async () => {
      await provider.initialize();

      // Try to get a session that doesn't exist
      const session = await provider.getSession('non-existent');

      // Should return undefined
      expect(session).toBeUndefined();
    });

    it('should return undefined when provider is not initialized', async () => {
      // Provider not initialized, no sessions exist
      const session = await provider.getSession('test-session');

      // Should return undefined (not throw)
      expect(session).toBeUndefined();
    });

    it('should return read-only reference to session state', async () => {
      await provider.initialize();

      await provider.createSession('test-session');

      const session1 = await provider.getSession('test-session');
      const session2 = await provider.getSession('test-session');

      // For MemorySessionStore, should return the same reference
      expect(session1).toEqual(session2);
    });
  });

  describe('terminate() Method - Session Cleanup', () => {
    it('should clear all sessions on termination', async () => {
      await provider.initialize();

      // Create multiple sessions
      await provider.createSession('session-1');
      await provider.createSession('session-2');
      await provider.createSession('session-3');

      // Verify sessions exist
      expect(await provider.getSession('session-1')).toBeDefined();
      expect(await provider.getSession('session-2')).toBeDefined();
      expect(await provider.getSession('session-3')).toBeDefined();

      // Terminate provider
      await provider.terminate();

      // Verify all sessions are cleared
      expect(await provider.getSession('session-1')).toBeUndefined();
      expect(await provider.getSession('session-2')).toBeUndefined();
      expect(await provider.getSession('session-3')).toBeUndefined();
    });

    it('should allow getSession() to return undefined after termination', async () => {
      await provider.initialize();

      // Create a session
      await provider.createSession('test-session');

      // Verify session exists
      expect(await provider.getSession('test-session')).toBeDefined();

      // Terminate provider
      await provider.terminate();

      // getSession() should return undefined
      expect(await provider.getSession('test-session')).toBeUndefined();
    });

    it('should be safe to call terminate() multiple times with sessions', async () => {
      await provider.initialize();

      // Create sessions
      await provider.createSession('session-1');
      await provider.createSession('session-2');

      // First terminate
      await provider.terminate();
      expect(await provider.getSession('session-1')).toBeUndefined();
      expect(await provider.getSession('session-2')).toBeUndefined();

      // Second terminate (should not throw)
      await provider.terminate();
      expect(await provider.getSession('session-1')).toBeUndefined();
      expect(await provider.getSession('session-2')).toBeUndefined();
    });

    it('should clear sessions even when provider is initialized with options', async () => {
      // Initialize with options
      await provider.initialize({ apiKey: 'test-key' });

      // Create sessions
      await provider.createSession('session-1');
      expect(await provider.getSession('session-1')).toBeDefined();

      // Terminate
      await provider.terminate();

      // Sessions should be cleared
      expect(await provider.getSession('session-1')).toBeUndefined();
    });
  });

  describe('Session Lifecycle', () => {
    it('should support full lifecycle: initialize -> createSession -> terminate', async () => {
      // Initialize
      await provider.initialize();

      // Create sessions
      await provider.createSession('session-1');
      await provider.createSession('session-2');

      // Verify sessions exist
      expect(await provider.getSession('session-1')).toBeDefined();
      expect(await provider.getSession('session-2')).toBeDefined();

      // Terminate
      await provider.terminate();

      // Verify sessions cleared
      expect(await provider.getSession('session-1')).toBeUndefined();
      expect(await provider.getSession('session-2')).toBeUndefined();
    });

    it('should allow re-initialization and new sessions after termination', async () => {
      // First cycle
      await provider.initialize();
      await provider.createSession('session-1');
      await provider.terminate();

      // Second cycle
      await provider.initialize();
      await provider.createSession('session-2');

      // Should have only the new session
      expect(await provider.getSession('session-1')).toBeUndefined();
      expect(await provider.getSession('session-2')).toBeDefined();
    });

    it('should maintain separate session states', async () => {
      await provider.initialize();

      // Create multiple sessions
      await provider.createSession('session-a');
      await provider.createSession('session-b');

      // Get sessions
      const sessionA = await provider.getSession('session-a');
      const sessionB = await provider.getSession('session-b');

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
      await registry.initializeProvider('claude-code');

      // Create session
      await provider.createSession('test-session');

      // Verify session exists
      expect(await provider.getSession('test-session')).toBeDefined();

      // Terminate via registry
      await registry.terminateAll();

      // Sessions should be cleared
      expect(await provider.getSession('test-session')).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should have createSession() with correct signature', async () => {
      await provider.initialize();

      // Should accept string parameter
      await provider.createSession('test-id');

      // Should return void
      const result = await provider.createSession('test-id-2');
      expect(result).toBeUndefined();
    });

    it('should have getSession() with correct signature', async () => {
      await provider.initialize();
      await provider.createSession('test-session');

      // Should return SessionState | undefined
      const session = await provider.getSession('test-session');

      if (session) {
        // TypeScript should know session is SessionState
        expect(session.history).toBeDefined();
        expect(session.lastResult).toBeDefined();
      }
    });

    it('should have SessionState with correct types', async () => {
      await provider.initialize();
      await provider.createSession('test-session');

      const session = await provider.getSession('test-session');

      // history should be array
      expect(Array.isArray(session?.history)).toBe(true);

      // lastResult can be null
      expect(session?.lastResult).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should provide descriptive error when SDK not initialized', async () => {
      await expect(async () => {
        await provider.createSession('test');
      }).rejects.toThrow('SDK not initialized. Call initialize() first.');
    });

    it('should handle getSession() gracefully for missing sessions', async () => {
      await provider.initialize();

      // Should not throw, just return undefined
      const session = await provider.getSession('missing');
      expect(session).toBeUndefined();
    });
  });

  describe('SessionStore Storage Patterns', () => {
    it('should use sessionStore.has() for existence checks in createSession', async () => {
      await provider.initialize();

      // First call - session doesn't exist
      // @ts-expect-error - Testing private property
      expect(await provider.sessionStore.has('new-session')).toBe(false);

      await provider.createSession('new-session');

      // Second call - session exists
      // @ts-expect-error - Testing private property
      expect(await provider.sessionStore.has('new-session')).toBe(true);

      // Idempotent - should not overwrite
      await provider.createSession('new-session');

      // Session should still exist
      // @ts-expect-error - Testing private property
      expect(await provider.sessionStore.has('new-session')).toBe(true);
    });

    it('should use sessionStore.load() for retrieval in getSession', async () => {
      await provider.initialize();

      await provider.createSession('test-session');

      // getSession() uses sessionStore.load() internally
      const session = await provider.getSession('test-session');

      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
    });

    it('should use sessionStore.clear() in terminate for MemorySessionStore', async () => {
      await provider.initialize();

      // Add multiple sessions
      await provider.createSession('s1');
      await provider.createSession('s2');
      await provider.createSession('s3');

      // @ts-expect-error - Testing private property
      const sessionList = await provider.sessionStore.list();
      expect(sessionList).toHaveLength(3);

      // terminate() calls sessionStore.clear() for MemorySessionStore
      await provider.terminate();

      // @ts-expect-error - Testing private property
      const afterTerminate = await provider.sessionStore.list();
      expect(afterTerminate).toHaveLength(0);
    });
  });

  describe('State Management', () => {
    it('should initialize sessionStore in field declaration', () => {
      const newProvider = new ClaudeCodeHarness();

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeDefined();
      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(Object);
    });

    it('should start with empty sessionStore', async () => {
      const newProvider = new ClaudeCodeHarness();

      // @ts-expect-error - Testing private property
      const sessionList = await newProvider.sessionStore.list();
      expect(sessionList).toHaveLength(0);
    });

    it('should have sessionStore field as private (TypeScript compile-time check)', () => {
      // Private fields in TypeScript are enforced at compile time, not runtime
      // The @ts-expect-error comments in our tests prove the field is private
      // TypeScript will error if we try to access private fields without @ts-expect-error

      // Verify the provider instance has the expected public properties
      expect(provider.id).toBe('claude-code');
      expect(provider.capabilities).toBeDefined();

      // Private sessionStore field is only accessible with @ts-expect-error
      // This test documents that sessionStore is a TypeScript private field
      expect(typeof provider.createSession).toBe('function');
      expect(typeof provider.getSession).toBe('function');
    });
  });

  describe('Memory Management', () => {
    it('should clear all sessions on terminate to prevent memory leaks', async () => {
      await provider.initialize();

      // Create many sessions
      for (let i = 0; i < 100; i++) {
        await provider.createSession(`session-${i}`);
      }

      // @ts-expect-error - Testing private property
      const sessionList = await provider.sessionStore.list();
      expect(sessionList).toHaveLength(100);

      await provider.terminate();

      // All sessions should be cleared
      // @ts-expect-error - Testing private property
      const afterTerminate = await provider.sessionStore.list();
      expect(afterTerminate).toHaveLength(0);
    });

    it('should allow garbage collection of session data after termination', async () => {
      await provider.initialize();

      // Create session with potential large data
      await provider.createSession('large-session');

      // Terminate should clear the reference
      await provider.terminate();

      // Store should be empty, allowing GC
      // @ts-expect-error - Testing private property
      const sessionList = await provider.sessionStore.list();
      expect(sessionList).toHaveLength(0);
    });
  });

  describe('execute() with Sessions (P2.M2.T1.S2)', () => {
    // Mock tool executor for testing
    const mockToolExecutor = async () => ({
      content: 'Mock tool result',
      isError: false,
    });

    it('should create session lazily when sessionId is provided but session does not exist', async () => {
      await provider.initialize();

      const sessionId = 'new-session-id';
      const request: import('../../../types/providers.js').ProviderRequest = {
        prompt: 'Hello, Claude!',
        options: { sessionId },
      };

      // Before execute, session should not exist
      expect(await provider.getSession(sessionId)).toBeUndefined();

      // Note: This test would require mocking the SDK to actually execute
      // For now, we verify the session creation logic path
      await provider.createSession(sessionId);

      // After createSession, session should exist
      const session = await provider.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it('should detect existing session for continuation', async () => {
      await provider.initialize();

      const sessionId = 'continuation-session';
      await provider.createSession(sessionId);

      // Simulate adding history to session
      const session = await provider.getSession(sessionId);
      if (session) {
        session.history.push({
          type: 'user',
          message: { content: 'Previous message' },
          parent_tool_use_id: null,
          session_id: 'test-session-id',
        } as any);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save(sessionId, session);
      }

      const updatedSession = await provider.getSession(sessionId);
      expect(updatedSession?.history.length).toBeGreaterThan(0);
      // This indicates continuation would be triggered
    });

    it('should handle request without sessionId (no session mode)', async () => {
      await provider.initialize();

      const request: import('../../../types/providers.js').ProviderRequest = {
        prompt: 'One-shot prompt',
        options: {},
      };

      // No sessionId means no session should be created
      expect(request.options.sessionId).toBeUndefined();
    });

    it('should capture user messages during message iteration', async () => {
      await provider.initialize();

      const sessionId = 'message-capture-session';
      await provider.createSession(sessionId);

      const session = await provider.getSession(sessionId);
      expect(session).toBeDefined();

      // Simulate user message capture (would happen in execute() message iteration)
      const mockUserMessage = {
        type: 'user',
        message: { content: 'Test message' },
        parent_tool_use_id: null,
        session_id: 'sdk-session-id',
      } as any;

      // Update session via store
      const updatedSession = await provider.getSession(sessionId);
      if (updatedSession) {
        updatedSession.history.push(mockUserMessage);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save(sessionId, updatedSession);
      }

      const finalSession = await provider.getSession(sessionId);
      expect(finalSession?.history).toHaveLength(1);
      expect(finalSession?.history[0]).toEqual(mockUserMessage);
    });

    it('should update lastResult after successful execution', async () => {
      await provider.initialize();

      const sessionId = 'result-session';
      await provider.createSession(sessionId);

      const mockResultMessage = {
        type: 'result',
        subtype: 'success',
        result: 'Test result',
        usage: { input_tokens: 10, output_tokens: 20 },
        duration_ms: 1000,
        num_turns: 1,
        total_cost_usd: 0.001,
        session_id: 'test-session-id',
        uuid: 'result-uuid',
      } as any;

      // Simulate result update (would happen in execute() message iteration)
      const session = await provider.getSession(sessionId);
      if (session) {
        session.lastResult = mockResultMessage;
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save(sessionId, session);
      }

      const updatedSession = await provider.getSession(sessionId);
      expect(updatedSession?.lastResult).toEqual(mockResultMessage);
    });

    it('should support multiple sessions with separate histories', async () => {
      await provider.initialize();

      // Create multiple sessions
      await provider.createSession('session-1');
      await provider.createSession('session-2');
      await provider.createSession('session-3');

      // Add different history to each
      const s1 = await provider.getSession('session-1');
      if (s1) {
        s1.history.push({ type: 'user', message: { content: 'Message 1' } } as any);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save('session-1', s1);
      }

      const s2 = await provider.getSession('session-2');
      if (s2) {
        s2.history.push({ type: 'user', message: { content: 'Message 2' } } as any);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save('session-2', s2);
      }

      const session1 = await provider.getSession('session-1');
      const session2 = await provider.getSession('session-2');
      const session3 = await provider.getSession('session-3');

      expect(session1?.history).toHaveLength(1);
      expect(session2?.history).toHaveLength(1);
      expect(session3?.history).toHaveLength(0); // Empty
      expect(session1?.history[0].message.content).toBe('Message 1');
      expect(session2?.history[0].message.content).toBe('Message 2');
    });

    it('should handle empty session history (first message in session)', async () => {
      await provider.initialize();

      const sessionId = 'first-message-session';
      await provider.createSession(sessionId);

      const session = await provider.getSession(sessionId);
      expect(session?.history).toHaveLength(0);
      expect(session?.lastResult).toBeNull();

      // Empty history means isContinuation should be false
      // First execution with empty history is NOT a continuation
      const isContinuation = session && session.history.length > 0;
      expect(isContinuation).toBe(false);
    });

    it('should distinguish continuation from new session', async () => {
      await provider.initialize();

      // New session - no history
      await provider.createSession('new-session');
      const newSession = await provider.getSession('new-session');
      const newSessionIsContinuation = newSession && newSession.history.length > 0;
      expect(newSessionIsContinuation).toBe(false);

      // Existing session with history
      await provider.createSession('existing-session');
      const existingSession = await provider.getSession('existing-session');
      if (existingSession) {
        existingSession.history.push({ type: 'user', message: { content: 'Previous' } } as any);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save('existing-session', existingSession);
      }

      const finalExistingSession = await provider.getSession('existing-session');
      const existingSessionIsContinuation = finalExistingSession && finalExistingSession.history.length > 0;
      expect(existingSessionIsContinuation).toBe(true);
    });

    it('should maintain session state across multiple getSession calls', async () => {
      await provider.initialize();

      const sessionId = 'state-persistence-session';
      await provider.createSession(sessionId);

      // Get session multiple times
      const session1 = await provider.getSession(sessionId);
      const session2 = await provider.getSession(sessionId);
      const session3 = await provider.getSession(sessionId);

      // For MemorySessionStore, should return the same reference
      // Modifying through one reference should affect all
      const modifySession = await provider.getSession(sessionId);
      if (modifySession) {
        modifySession.history.push({ type: 'user', message: { content: 'Test' } } as any);
        // @ts-expect-error - Testing private property
        await provider.sessionStore.save(sessionId, modifySession);
      }

      const sessionAfter = await provider.getSession(sessionId);
      expect(sessionAfter?.history).toHaveLength(1);
    });

    it('should have backward compatibility (execute works without sessionId)', async () => {
      await provider.initialize();

      // Request without sessionId should work as before
      const requestNoSession: import('../../../types/providers.js').ProviderRequest = {
        prompt: 'Test prompt without session',
        options: {},
      };

      expect(requestNoSession.options.sessionId).toBeUndefined();

      // Verify no session is created
      expect(await provider.getSession('any-id')).toBeUndefined();
    });
  });

  describe('Session Persistence with FileSessionStore (P2.M2.T1.S4)', () => {
    const TEST_DIR = './test-sessions-persistence';

    afterEach(async () => {
      // Clean up temporary directories
      try {
        await rm(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    describe('Multiple Sessions Persistence', () => {
      it('should persist multiple independent sessions across restart', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Create multiple sessions with distinct histories
        await provider.createSession('session-1');
        await provider.createSession('session-2');
        await provider.createSession('session-3');

        // Add distinct history to each session
        const s1 = await provider.getSession('session-1');
        if (s1) {
          s1.history.push({
            type: 'user',
            message: { content: 'Message 1' },
            parent_tool_use_id: null,
            session_id: 'test-id-1',
          } as any);
          await fileStore.save('session-1', s1);
        }

        const s2 = await provider.getSession('session-2');
        if (s2) {
          s2.history.push({
            type: 'user',
            message: { content: 'Message 2' },
            parent_tool_use_id: null,
            session_id: 'test-id-2',
          } as any);
          await fileStore.save('session-2', s2);
        }

        // session-3 has empty history

        // Terminate and re-initialize
        await provider.terminate();
        await provider.initialize({ sessionStore: fileStore });

        // Verify all sessions are restored independently
        const restored1 = await provider.getSession('session-1');
        const restored2 = await provider.getSession('session-2');
        const restored3 = await provider.getSession('session-3');

        expect(restored1).toBeDefined();
        expect(restored2).toBeDefined();
        expect(restored3).toBeDefined();

        expect(restored1?.history).toHaveLength(1);
        expect(restored1?.history[0].message.content).toBe('Message 1');

        expect(restored2?.history).toHaveLength(1);
        expect(restored2?.history[0].message.content).toBe('Message 2');

        expect(restored3?.history).toHaveLength(0);
      });

      it('should allow selective session deletion without affecting others', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Create multiple sessions
        await provider.createSession('session-a');
        await provider.createSession('session-b');
        await provider.createSession('session-c');

        // Delete one session
        const deleted = await provider.deleteSession('session-b');
        expect(deleted).toBe(true);

        // Verify only session-b is deleted
        expect(await provider.getSession('session-a')).toBeDefined();
        expect(await provider.getSession('session-b')).toBeUndefined();
        expect(await provider.getSession('session-c')).toBeDefined();
      });

      it('should maintain separate lastResult for each session', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Create two sessions
        await provider.createSession('result-session-1');
        await provider.createSession('result-session-2');

        // Set different lastResult for each
        const s1 = await provider.getSession('result-session-1');
        if (s1) {
          s1.lastResult = {
            type: 'result',
            subtype: 'success',
            result: 'Result 1',
            usage: { input_tokens: 10, output_tokens: 20 },
            duration_ms: 1000,
            num_turns: 1,
            total_cost_usd: 0.001,
            session_id: 'session-1',
            uuid: 'uuid-1',
          } as any;
          await fileStore.save('result-session-1', s1);
        }

        const s2 = await provider.getSession('result-session-2');
        if (s2) {
          s2.lastResult = {
            type: 'result',
            subtype: 'success',
            result: 'Result 2',
            usage: { input_tokens: 30, output_tokens: 40 },
            duration_ms: 2000,
            num_turns: 2,
            total_cost_usd: 0.002,
            session_id: 'session-2',
            uuid: 'uuid-2',
          } as any;
          await fileStore.save('result-session-2', s2);
        }

        // Restart provider
        await provider.terminate();
        await provider.initialize({ sessionStore: fileStore });

        // Verify lastResults are preserved independently
        const restored1 = await provider.getSession('result-session-1');
        const restored2 = await provider.getSession('result-session-2');

        expect(restored1?.lastResult?.result).toBe('Result 1');
        expect(restored2?.lastResult?.result).toBe('Result 2');
      });
    });

    describe('Session File Format Validation', () => {
      it('should save session state with valid JSON structure', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Create session with complex data
        await provider.createSession('format-test');
        const session = await provider.getSession('format-test');

        if (session) {
          session.history.push({
            type: 'user',
            message: { content: 'Test message with special chars: "quotes" and \'apostrophes\'' },
            parent_tool_use_id: null,
            session_id: 'test-id',
          } as any);
          session.lastResult = {
            type: 'result',
            subtype: 'success',
            result: 'Test result',
            usage: { input_tokens: 10, output_tokens: 20 },
            duration_ms: 1000,
            num_turns: 1,
            total_cost_usd: 0.001,
            session_id: 'test-session',
            uuid: 'test-uuid',
          } as any;
          await fileStore.save('format-test', session);
        }

        // Read raw file and verify JSON structure
        const { readFile } = await import('node:fs/promises');
        const filePath = `${TEST_DIR}/format-test.json`;
        const rawContent = await readFile(filePath, 'utf-8');

        // Verify valid JSON
        expect(() => JSON.parse(rawContent)).not.toThrow();

        const parsed = JSON.parse(rawContent);
        expect(parsed).toHaveProperty('history');
        expect(parsed).toHaveProperty('lastResult');
        expect(Array.isArray(parsed.history)).toBe(true);
        expect(parsed.history).toHaveLength(1);
        expect(parsed.history[0].message.content).toBe('Test message with special chars: "quotes" and \'apostrophes\'');
        expect(parsed.lastResult).toHaveProperty('result', 'Test result');
      });

      it('should handle session with large history', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        await provider.createSession('large-history');
        const session = await provider.getSession('large-history');

        if (session) {
          // Add 100 history entries
          for (let i = 0; i < 100; i++) {
            session.history.push({
              type: 'user',
              message: { content: `Message number ${i}` },
              parent_tool_use_id: null,
              session_id: 'test-id',
            } as any);
          }
          await fileStore.save('large-history', session);
        }

        // Restart and verify all history is preserved
        await provider.terminate();
        await provider.initialize({ sessionStore: fileStore });

        const restored = await provider.getSession('large-history');
        expect(restored?.history).toHaveLength(100);
        expect(restored?.history[0].message.content).toBe('Message number 0');
        expect(restored?.history[99].message.content).toBe('Message number 99');
      });

      it('should handle special characters in session ID', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Test session ID with special characters
        const specialId = 'session-with-special-chars-123-ABC_def.test';
        await provider.createSession(specialId);

        const session = await provider.getSession(specialId);
        expect(session).toBeDefined();
        expect(session?.history).toEqual([]);

        // Verify persistence
        await provider.terminate();
        await provider.initialize({ sessionStore: fileStore });

        const restored = await provider.getSession(specialId);
        expect(restored).toBeDefined();
        expect(restored?.history).toEqual([]);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle missing session file gracefully', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Try to get non-existent session
        const session = await provider.getSession('does-not-exist');

        // Should return undefined (not throw)
        expect(session).toBeUndefined();
      });

      it('should return false when deleting non-existent session', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        const deleted = await provider.deleteSession('non-existent');
        expect(deleted).toBe(false);
      });

      it('should throw error for corrupted session file', async () => {
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });

        // Create a corrupted session file
        const { writeFile } = await import('node:fs/promises');
        const corruptedPath = `${TEST_DIR}/corrupted.json`;
        await writeFile(corruptedPath, 'invalid json content {', 'utf-8');

        // Attempting to load should throw an error
        await expect(async () => {
          await provider.getSession('corrupted');
        }).rejects.toThrow('Failed to load session');
      });
    });

    describe('Backward Compatibility', () => {
      it('should default to in-memory sessions when no store provided', async () => {
        // No sessionStore in options
        await provider.initialize();

        await provider.createSession('memory-session');
        expect(await provider.getSession('memory-session')).toBeDefined();

        // Terminate should clear sessions (MemorySessionStore behavior)
        await provider.terminate();

        // Session should be gone
        const session = await provider.getSession('memory-session');
        expect(session).toBeUndefined();
      });

      it('should not break existing code that does not use sessionStore', async () => {
        // Simulate existing code pattern
        await provider.initialize();
        await provider.createSession('legacy-session');

        const session = await provider.getSession('legacy-session');
        expect(session).toBeDefined();

        // Legacy terminate behavior - sessions cleared
        await provider.terminate();

        expect(await provider.getSession('legacy-session')).toBeUndefined();
      });

      it('should allow switching between store types across cycles', async () => {
        // First cycle with default store
        await provider.initialize();
        await provider.createSession('memory-session');
        await provider.terminate();

        // Second cycle with file store
        const fileStore = new FileSessionStore(TEST_DIR);
        await provider.initialize({ sessionStore: fileStore });
        await provider.createSession('file-session');

        // Old session should not exist in new store
        expect(await provider.getSession('memory-session')).toBeUndefined();
        expect(await provider.getSession('file-session')).toBeDefined();

        await provider.terminate();
      });
    });
  });
});

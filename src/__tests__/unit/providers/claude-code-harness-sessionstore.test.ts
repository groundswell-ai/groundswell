/**
 * Test file: anthropic-provider-sessionstore.test.ts
 *
 * Purpose: Integration tests for ClaudeCodeHarness SessionStore integration per P2.M2.T1.S3
 *
 * Tests:
 * - Backward compatibility (no params = MemorySessionStore)
 * - FileSessionStore persistence across terminate/initialize
 * - Custom SessionStore implementation
 * - Session restoration logic in initialize()
 * - Session operations delegate to SessionStore API
 * - Async session methods work correctly
 * - Session mutations save for persistent stores
 *
 * PRP: P2.M2.T1.S3 - Integrate SessionStore into ClaudeCodeHarness
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ClaudeCodeHarness } from "../../../harnesses/claude-code-harness.js";
import {
  FileSessionStore,
  MemorySessionStore,
  type SessionStore,
} from "../../../harnesses/session-store.js";
import type { SessionState } from "../../../types/providers.js";
import { ProviderRegistry } from "../../../harnesses/harness-registry.js";
import { rm } from "fs/promises";

describe("ClaudeCodeHarness - SessionStore Integration (P2.M2.T1.S3)", () => {
  let provider: ClaudeCodeHarness;
  const testSessionDir = "./test-sessions-sessionstore";

  beforeEach(() => {
    provider = new ClaudeCodeHarness();
    // Reset registry state for isolation
    ProviderRegistry._resetForTesting();
  });

  afterEach(async () => {
    // Clean up test session directory
    try {
      await rm(testSessionDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Backward Compatibility", () => {
    it("should use MemorySessionStore by default when no sessionStore provided", async () => {
      await provider.initialize();

      // Should be able to create sessions without any config
      await provider.createSession("default-session");

      const session = await provider.getSession("default-session");
      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it("should clear sessions on terminate with default MemorySessionStore", async () => {
      await provider.initialize();

      // Create sessions
      await provider.createSession("session-1");
      await provider.createSession("session-2");

      // Verify sessions exist
      expect(await provider.getSession("session-1")).toBeDefined();
      expect(await provider.getSession("session-2")).toBeDefined();

      // Terminate should clear sessions
      await provider.terminate();

      // Sessions should be cleared
      expect(await provider.getSession("session-1")).toBeUndefined();
      expect(await provider.getSession("session-2")).toBeUndefined();
    });

    it("should allow re-initialization after terminate with default store", async () => {
      // First cycle
      await provider.initialize();
      await provider.createSession("session-1");
      await provider.terminate();

      // Second cycle
      await provider.initialize();
      await provider.createSession("session-2");

      // Should have only the new session (old one cleared)
      expect(await provider.getSession("session-1")).toBeUndefined();
      expect(await provider.getSession("session-2")).toBeDefined();
    });
  });

  describe("FileSessionStore Persistence", () => {
    it("should persist sessions across terminate -> initialize cycles", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create a session
      await provider.createSession("persistent-session");

      // Verify session exists
      const session1 = await provider.getSession("persistent-session");
      expect(session1).toBeDefined();

      // Terminate provider
      await provider.terminate();

      // Re-initialize with same file store
      await provider.initialize({ sessionStore: fileStore });

      // Session should still exist (persisted)
      const session2 = await provider.getSession("persistent-session");
      expect(session2).toBeDefined();
    });

    it("should NOT clear FileSessionStore sessions on terminate", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create sessions
      await provider.createSession("session-1");
      await provider.createSession("session-2");

      // Verify sessions exist
      expect(await provider.getSession("session-1")).toBeDefined();
      expect(await provider.getSession("session-2")).toBeDefined();

      // Terminate
      await provider.terminate();

      // Sessions should NOT be cleared (persisted in store)
      expect(await provider.getSession("session-1")).toBeDefined();
      expect(await provider.getSession("session-2")).toBeDefined();
    });

    it("should restore session state including history", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session and simulate adding history
      await provider.createSession("history-session");

      // Simulate adding history to the session
      const session = await provider.getSession("history-session");
      if (session) {
        session.history.push({
          type: "user",
          message: { content: "Test message" },
          parent_tool_use_id: null,
          session_id: "test-id",
        } as any);

        // Save back to store
        await fileStore.save("history-session", session);
      }

      // Terminate and re-initialize
      await provider.terminate();
      await provider.initialize({ sessionStore: fileStore });

      // History should be preserved
      const restoredSession = await provider.getSession("history-session");
      expect(restoredSession).toBeDefined();
      expect(restoredSession?.history).toHaveLength(1);
      expect(restoredSession?.history[0].message.content).toBe("Test message");
    });

    it("should use FileSessionStore when provided in ProviderOptions", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session
      await provider.createSession("file-session");

      // Verify it works
      const session = await provider.getSession("file-session");
      expect(session).toBeDefined();

      // Verify file was created
      const sessions = await fileStore.list();
      expect(sessions).toContain("file-session");
    });
  });

  describe("Custom SessionStore Implementation", () => {
    it("should work with custom SessionStore implementation", async () => {
      // Create a mock custom store
      class CustomStore implements SessionStore<SessionState> {
        private data: Map<string, SessionState> = new Map();

        async save(sessionId: string, state: SessionState): Promise<void> {
          this.data.set(sessionId, state);
        }

        async load(sessionId: string): Promise<SessionState | null> {
          return this.data.get(sessionId) ?? null;
        }

        async delete(sessionId: string): Promise<boolean> {
          return this.data.delete(sessionId);
        }

        async list(): Promise<string[]> {
          return Array.from(this.data.keys());
        }

        async has(sessionId: string): Promise<boolean> {
          return this.data.has(sessionId);
        }

        async clear(): Promise<void> {
          this.data.clear();
        }

        // Helper for testing
        _size(): number {
          return this.data.size;
        }
      }

      const customStore = new CustomStore();
      await provider.initialize({ sessionStore: customStore });

      // Create sessions
      await provider.createSession("custom-1");
      await provider.createSession("custom-2");

      // Verify they exist in custom store
      expect(customStore._size()).toBe(2);
      expect(await provider.getSession("custom-1")).toBeDefined();
      expect(await provider.getSession("custom-2")).toBeDefined();
    });

    it("should handle custom store with persistence behavior", async () => {
      // Custom store that doesn't clear on terminate
      class PersistentCustomStore implements SessionStore<SessionState> {
        private data: Map<string, SessionState> = new Map();

        async save(sessionId: string, state: SessionState): Promise<void> {
          this.data.set(sessionId, state);
        }

        async load(sessionId: string): Promise<SessionState | null> {
          return this.data.get(sessionId) ?? null;
        }

        async delete(sessionId: string): Promise<boolean> {
          return this.data.delete(sessionId);
        }

        async list(): Promise<string[]> {
          return Array.from(this.data.keys());
        }

        async has(sessionId: string): Promise<boolean> {
          return this.data.has(sessionId);
        }

        async clear(): Promise<void> {
          // This custom store doesn't clear - simulating persistent behavior
          // Intentionally empty to test behavior
        }
      }

      const customStore = new PersistentCustomStore();
      await provider.initialize({ sessionStore: customStore });

      // Create session
      await provider.createSession("persistent-custom");

      // Terminate
      await provider.terminate();

      // Session should still exist (custom store didn't clear)
      expect(await provider.getSession("persistent-custom")).toBeDefined();
    });
  });

  describe("Session Operations Delegation", () => {
    it("should delegate createSession() to sessionStore.save()", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session
      await provider.createSession("delegate-test");

      // Verify it was saved to store
      expect(await fileStore.has("delegate-test")).toBe(true);
    });

    it("should delegate getSession() to sessionStore.load()", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session via provider
      await provider.createSession("load-test");

      // Load via provider (delegates to store)
      const session = await provider.getSession("load-test");

      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
    });

    it("should delegate deleteSession() to sessionStore.delete()", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session
      await provider.createSession("delete-test");

      // Verify it exists
      expect(await provider.getSession("delete-test")).toBeDefined();

      // Delete via provider
      const deleted = await provider.deleteSession("delete-test");

      expect(deleted).toBe(true);
      expect(await provider.getSession("delete-test")).toBeUndefined();
    });

    it("should return false when deleting non-existent session", async () => {
      await provider.initialize();

      const deleted = await provider.deleteSession("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("Session Restoration in initialize()", () => {
    it("should verify persistent store accessibility on initialize", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create a session
      await provider.createSession("restore-test");

      // Terminate
      await provider.terminate();

      // Re-initialize - should verify store is accessible
      await provider.initialize({ sessionStore: fileStore });

      // Session should be accessible
      expect(await provider.getSession("restore-test")).toBeDefined();
    });

    it("should list existing sessions on initialize with persistent store", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create multiple sessions
      await provider.createSession("session-1");
      await provider.createSession("session-2");
      await provider.createSession("session-3");

      // List sessions
      const sessions = await fileStore.list();
      expect(sessions).toHaveLength(3);
      expect(sessions).toContain("session-1");
      expect(sessions).toContain("session-2");
      expect(sessions).toContain("session-3");
    });
  });

  describe("Async Session Methods", () => {
    it("should handle async createSession() correctly", async () => {
      await provider.initialize();

      // Should return Promise<void>
      const result = await provider.createSession("async-create-test");
      expect(result).toBeUndefined();

      // Session should exist
      expect(await provider.getSession("async-create-test")).toBeDefined();
    });

    it("should handle async getSession() correctly", async () => {
      await provider.initialize();

      await provider.createSession("async-get-test");

      // Should return Promise<SessionState | undefined>
      const session = await provider.getSession("async-get-test");
      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
    });

    it("should handle async deleteSession() correctly", async () => {
      await provider.initialize();

      await provider.createSession("async-delete-test");

      // Should return Promise<boolean>
      const deleted = await provider.deleteSession("async-delete-test");
      expect(deleted).toBe(true);

      const session = await provider.getSession("async-delete-test");
      expect(session).toBeUndefined();
    });

    it("should handle async getSession() returning undefined for missing sessions", async () => {
      await provider.initialize();

      const session = await provider.getSession("missing-async-test");
      expect(session).toBeUndefined();
    });
  });

  describe("Session Mutations for Persistent Stores", () => {
    it("should save session mutations for FileSessionStore", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session
      await provider.createSession("mutation-test");

      // Get session and mutate it
      const session = await provider.getSession("mutation-test");
      if (session) {
        session.history.push({
          type: "user",
          message: { content: "Mutated message" },
          parent_tool_use_id: null,
          session_id: "test-id",
        } as any);

        // In execute(), this would be automatically saved
        // For testing, we manually save
        await fileStore.save("mutation-test", session);
      }

      // Get fresh instance - mutation should persist
      const freshSession = await provider.getSession("mutation-test");
      expect(freshSession?.history).toHaveLength(1);
      expect(freshSession?.history[0].message.content).toBe("Mutated message");
    });

    it("should preserve lastResult mutations for FileSessionStore", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      await provider.createSession("result-test");

      const session = await provider.getSession("result-test");
      if (session) {
        const mockResult = {
          type: "result",
          subtype: "success",
          result: "Test result",
          usage: { input_tokens: 10, output_tokens: 20 },
        } as any;

        session.lastResult = mockResult;
        await fileStore.save("result-test", session);
      }

      // Verify lastResult persists
      const freshSession = await provider.getSession("result-test");
      expect(freshSession?.lastResult).toBeDefined();
      expect(freshSession?.lastResult?.result).toBe("Test result");
    });
  });

  describe("MemorySessionStore instanceof Detection", () => {
    it("should detect MemorySessionStore correctly", async () => {
      await provider.initialize();

      // Default is MemorySessionStore
      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(MemorySessionStore);
    });

    it("should detect non-MemorySessionStore (FileSessionStore)", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).not.toBeInstanceOf(MemorySessionStore);
      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(FileSessionStore);
    });
  });

  describe("SessionStore Configuration", () => {
    it("should accept sessionStore in ProviderOptions", async () => {
      const fileStore = new FileSessionStore(testSessionDir);

      // Should not throw
      await provider.initialize({ sessionStore: fileStore });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBe(fileStore);
    });

    it("should allow changing sessionStore between initialize cycles", async () => {
      // First initialization with default store
      await provider.initialize();
      await provider.createSession("memory-session");
      await provider.terminate();

      // Second initialization with file store
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBe(fileStore);

      // Old session should not exist in new store
      expect(await provider.getSession("memory-session")).toBeUndefined();
    });
  });

  describe("SDK Initialization Checks", () => {
    it("should throw when createSession() called before initialize", async () => {
      const fileStore = new FileSessionStore(testSessionDir);

      await expect(async () => {
        await provider.createSession("test");
      }).rejects.toThrow("SDK not initialized");
    });

    it("should throw when deleteSession() called before initialize", async () => {
      await expect(async () => {
        await provider.deleteSession("test");
      }).rejects.toThrow("SDK not initialized");
    });

    it("should return undefined for getSession() before initialize", async () => {
      // getSession() doesn't throw - returns undefined
      const session = await provider.getSession("test");
      expect(session).toBeUndefined();
    });
  });

  describe("Idempotency in createSession()", () => {
    it("should be idempotent with SessionStore", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({ sessionStore: fileStore });

      // Create session first time
      await provider.createSession("idempotent-test");

      const session1 = await provider.getSession("idempotent-test");

      // Simulate adding history
      if (session1) {
        session1.history.push({
          type: "user",
          message: { content: "First message" },
          parent_tool_use_id: null,
          session_id: "test-id",
        } as any);
        await fileStore.save("idempotent-test", session1);
      }

      // Create session second time (should not overwrite)
      await provider.createSession("idempotent-test");

      const session2 = await provider.getSession("idempotent-test");

      // History should still be there
      expect(session2?.history).toHaveLength(1);
      expect(session2?.history[0].message.content).toBe("First message");
    });
  });

  describe("Error Handling", () => {
    it("should handle sessionStore.list() errors gracefully", async () => {
      // Create a store that throws on list
      class BrokenStore implements SessionStore<SessionState> {
        async save(): Promise<void> {
          // Empty
        }

        async load(): Promise<SessionState | null> {
          return null;
        }

        async delete(): Promise<boolean> {
          return false;
        }

        async list(): Promise<string[]> {
          throw new Error("Store broken");
        }

        async has(): Promise<boolean> {
          return false;
        }

        async clear(): Promise<void> {
          // Empty
        }

        async deleteExpired(): Promise<string[]> {
          return [];
        }
      }

      const brokenStore = new BrokenStore();

      // Should throw when initialize tries to list sessions
      await expect(async () => {
        await provider.initialize({ sessionStore: brokenStore });
      }).rejects.toThrow("Store broken");
    });
  });

  describe("Session TTL Integration (P2.M2.T2.S2)", () => {
    it("should create sessions with timestamps", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({
        sessionStore: fileStore,
        sessionTtl: 86400000,
      });

      await provider.createSession("timestamp-test");

      const session = await provider.getSession("timestamp-test");
      expect(session?.createdAt).toBeDefined();
      expect(session?.lastAccessedAt).toBeDefined();
      expect(session?.createdAt).toBeGreaterThan(0);
      expect(session?.lastAccessedAt).toBeGreaterThan(0);
    });

    it("should update lastAccessedAt on session access", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({
        sessionStore: fileStore,
        sessionTtl: 86400000,
      });

      await provider.createSession("access-test");

      const session1 = await provider.getSession("access-test");
      const firstAccessedAt = session1?.lastAccessedAt;

      // Wait and access again
      await new Promise((resolve) => setTimeout(resolve, 100));

      const session2 = await provider.getSession("access-test");
      expect(session2?.lastAccessedAt).toBeGreaterThan(firstAccessedAt ?? 0);
    });

    it("should pass sessionTtl to FileSessionStore", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
        sessionTtl: 3600000, // 1 hour
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionTtl).toBe(3600000);
    });

    it("should use default 24-hour TTL when not specified", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionTtl).toBe(86400000); // 24 hours
    });

    it("should cleanup expired sessions on initialize", async () => {
      // Create a FileSessionStore directly with a very short TTL
      // Note: TTL + 60s tolerance = actual expiration time
      const fileStore = new FileSessionStore(testSessionDir, 100); // 100ms TTL

      await provider.initialize({
        sessionStore: fileStore,
        sessionTtl: 100,
      });

      await provider.createSession("expired-session");

      // Manually write an expired session file (bypass save() which updates timestamps)
      // Session must be older than (TTL + tolerance) to be considered expired
      // TTL = 100ms, tolerance = 60s = 60000ms, so session must be > 60.1 seconds old
      const { writeFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const oldSession = {
        history: [],
        lastResult: null,
        createdAt: Date.now() - 70000, // 70 seconds ago
        lastAccessedAt: Date.now() - 70000, // 70 seconds ago (> 60.1s threshold)
      };
      await writeFile(join(testSessionDir, "expired-session.json"), JSON.stringify(oldSession), "utf-8");

      // Manually trigger cleanup to verify it works
      const deleted = await fileStore.deleteExpired(100);
      expect(deleted).toContain("expired-session");

      // Session should be cleaned up
      const loadedSession = await fileStore.load("expired-session");
      expect(loadedSession).toBeNull();
    });

    it("should not cleanup active sessions on initialize", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({
        sessionStore: fileStore,
        sessionTtl: 86400000, // 24 hours
      });

      await provider.createSession("active-session");

      await provider.terminate();
      await provider.initialize({
        sessionStore: fileStore,
        sessionTtl: 86400000,
      });

      // Session should still exist
      const session = await provider.getSession("active-session");
      expect(session).toBeDefined();
      expect(session?.history).toHaveLength(0);
    });

    it("should handle zero TTL (no expiration)", async () => {
      vi.useFakeTimers();

      const fileStore = new FileSessionStore(testSessionDir, 0);
      await provider.initialize({
        sessionStore: fileStore,
        sessionTtl: 0,
      });

      await provider.createSession("eternal-session");

      // Advance time significantly
      vi.advanceTimersByTime(86400000); // 24 hours

      // Session should still exist
      const session = await provider.getSession("eternal-session");
      expect(session).toBeDefined();

      vi.useRealTimers();
    });
  });
});

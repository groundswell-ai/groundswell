/**
 * Test file: anthropic-provider-sessionconfig.test.ts
 *
 * Purpose: Comprehensive tests for session configuration options per P2.M2.T2.S1
 *
 * Tests:
 * - sessionPersistence: 'memory' creates MemorySessionStore
 * - sessionPersistence: 'file' creates FileSessionStore
 * - sessionPersistence: 'file' with custom sessionPath uses custom path
 * - sessionPersistence: 'redis' throws clear error message
 * - Direct sessionStore injection still works (backward compatibility)
 * - sessionStore takes priority over sessionPersistence
 * - Default sessionStore (MemorySessionStore) when no options provided
 *
 * PRP: P2.M2.T2.S1 - Session Configuration Options
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AnthropicProvider } from "../../../harnesses/anthropic-provider.js";
import {
  FileSessionStore,
  MemorySessionStore,
  type SessionStore,
} from "../../../harnesses/session-store.js";
import type { SessionState } from "../../../types/providers.js";
import { ProviderRegistry } from "../../../harnesses/harness-registry.js";
import { rm } from "fs/promises";

describe("AnthropicProvider - Session Configuration (P2.M2.T2.S1)", () => {
  let provider: AnthropicProvider;
  const testSessionDir = "./test-sessions-sessionconfig";

  beforeEach(() => {
    provider = new AnthropicProvider();
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

  describe("sessionPersistence option", () => {
    it("should accept sessionPersistence: 'memory'", async () => {
      await provider.initialize({ sessionPersistence: "memory" });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(MemorySessionStore);
    });

    it("should accept sessionPersistence: 'file'", async () => {
      await provider.initialize({ sessionPersistence: "file" });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(FileSessionStore);
    });

    it("should accept sessionPersistence: 'file' with custom sessionPath", async () => {
      const customPath = testSessionDir;
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: customPath,
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(FileSessionStore);

      // Verify FileSessionStore was created with custom path by creating a session
      await provider.createSession("test-session");
      const session = await provider.getSession("test-session");
      expect(session).toBeDefined();
    });

    it("should use default sessionPath when not specified", async () => {
      await provider.initialize({ sessionPersistence: "file" });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(FileSessionStore);

      // Create a session to verify the store works
      await provider.createSession("default-path-test");
      const session = await provider.getSession("default-path-test");
      expect(session).toBeDefined();
    });

    it("should accept sessionPersistence with sessionTtl (forward compatibility)", async () => {
      // sessionTtl is accepted for forward compatibility with P2.M2.T2.S2
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
        sessionTtl: 3600000, // 1 hour
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(FileSessionStore);
    });

    it("should throw error for redis sessionPersistence", async () => {
      await expect(
        provider.initialize({ sessionPersistence: "redis" }),
      ).rejects.toThrow(/not yet implemented/);
    });

    it("should throw descriptive error message for redis", async () => {
      try {
        await provider.initialize({ sessionPersistence: "redis" });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Redis session storage not yet implemented',
        );
        expect((error as Error).message).toContain('"memory"');
        expect((error as Error).message).toContain('"file"');
      }
    });
  });

  describe("Backward Compatibility", () => {
    it("should accept direct sessionStore injection", async () => {
      const customStore = new MemorySessionStore<SessionState>();
      await provider.initialize({ sessionStore: customStore });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBe(customStore);
    });

    it("should prioritize sessionStore over sessionPersistence", async () => {
      const customStore = new MemorySessionStore<SessionState>();
      await provider.initialize({
        sessionStore: customStore,
        sessionPersistence: "file",
      });

      // Should use injected store, not create FileSessionStore
      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBe(customStore);
      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).not.toBeInstanceOf(FileSessionStore);
    });

    it("should work with custom SessionStore implementation", async () => {
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

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBe(customStore);

      // Verify it works
      await provider.createSession("custom-test");
      expect(customStore._size()).toBe(1);
    });
  });

  describe("Default Behavior", () => {
    it("should use MemorySessionStore by default when no options provided", async () => {
      await provider.initialize();

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(MemorySessionStore);
    });

    it("should use MemorySessionStore when empty options provided", async () => {
      await provider.initialize({});

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(MemorySessionStore);
    });

    it("should keep default MemorySessionStore when only other options provided", async () => {
      await provider.initialize({ apiKey: "sk-test" });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(MemorySessionStore);
    });
  });

  describe("Session Operations with Configuration", () => {
    it("should create sessions with memory persistence", async () => {
      await provider.initialize({ sessionPersistence: "memory" });

      await provider.createSession("memory-session");
      const session = await provider.getSession("memory-session");

      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it("should create sessions with file persistence", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
      });

      await provider.createSession("file-session");
      const session = await provider.getSession("file-session");

      expect(session).toBeDefined();
      expect(session?.history).toEqual([]);
      expect(session?.lastResult).toBeNull();
    });

    it("should delete sessions with memory persistence", async () => {
      await provider.initialize({ sessionPersistence: "memory" });

      await provider.createSession("delete-test");
      expect(await provider.getSession("delete-test")).toBeDefined();

      const deleted = await provider.deleteSession("delete-test");
      expect(deleted).toBe(true);
      expect(await provider.getSession("delete-test")).toBeUndefined();
    });

    it("should delete sessions with file persistence", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
      });

      await provider.createSession("delete-file-test");
      expect(await provider.getSession("delete-file-test")).toBeDefined();

      const deleted = await provider.deleteSession("delete-file-test");
      expect(deleted).toBe(true);
      expect(await provider.getSession("delete-file-test")).toBeUndefined();
    });
  });

  describe("File Persistence Across Cycles", () => {
    it("should persist sessions across terminate -> initialize with file persistence", async () => {
      const fileStore = new FileSessionStore(testSessionDir);
      await provider.initialize({
        sessionStore: fileStore,
      });

      // Create a session
      await provider.createSession("persistent-session");
      const session1 = await provider.getSession("persistent-session");
      expect(session1).toBeDefined();

      // Terminate provider
      await provider.terminate();

      // Re-initialize with same file store
      await provider.initialize({
        sessionStore: fileStore,
      });

      // Session should still exist (persisted)
      const session2 = await provider.getSession("persistent-session");
      expect(session2).toBeDefined();
    });

    it("should persist sessions across terminate -> initialize with sessionPersistence", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
      });

      // Create a session
      await provider.createSession("persistent-session-2");
      const session1 = await provider.getSession("persistent-session-2");
      expect(session1).toBeDefined();

      // Terminate provider
      await provider.terminate();

      // Re-initialize with same sessionPersistence
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
      });

      // Session should still exist (persisted)
      const session2 = await provider.getSession("persistent-session-2");
      expect(session2).toBeDefined();
    });
  });

  describe("Type Safety", () => {
    it("should have correct type for sessionPersistence option", async () => {
      // These should all compile without TypeScript errors
      await provider.initialize({ sessionPersistence: "memory" });
      await provider.initialize({ sessionPersistence: "file" });
      // "redis" is a valid type but throws at runtime
      await provider.initialize({ sessionPersistence: "redis" }).catch(() => {
        // Expected to throw - not yet implemented
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeDefined();
    });

    it("should have correct type for sessionPath option", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeDefined();
    });

    it("should have correct type for sessionTtl option", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionTtl: 86400000,
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeDefined();
    });

    it("should have correct type for sessionStore option", async () => {
      const customStore = new MemorySessionStore<SessionState>();
      await provider.initialize({ sessionStore: customStore });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBe(customStore);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing sessionPath with file persistence (uses default)", async () => {
      // Should not throw - uses default './sessions'
      await expect(
        provider.initialize({ sessionPersistence: "file" }),
      ).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(FileSessionStore);
    });

    it("should provide helpful error message for redis", async () => {
      try {
        await provider.initialize({ sessionPersistence: "redis" });
        expect.fail("Should have thrown");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toMatch(/not yet implemented/);
        expect(message).toMatch(/memory/);
        expect(message).toMatch(/file/);
        expect(message).toMatch(/sessionStore/);
      }
    });
  });

  describe("Integration with ProviderOptions", () => {
    it("should work alongside other ProviderOptions", async () => {
      await provider.initialize({
        apiKey: "sk-test",
        endpoint: "https://custom.anthropic.com",
        timeout: 30000,
        sessionPersistence: "memory",
      });

      // @ts-expect-error - Testing private property
      expect(provider.sessionStore).toBeInstanceOf(MemorySessionStore);
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
    });

    it("should work with sessionPersistence and sessionId", async () => {
      await provider.initialize({
        sessionPersistence: "file",
        sessionPath: testSessionDir,
        sessionId: "session-123", // Accepted but not used for session creation
      });

      // sessionId doesn't auto-create session - must call createSession()
      const session = await provider.getSession("session-123");
      expect(session).toBeUndefined();

      // But can create it explicitly
      await provider.createSession("session-123");
      const createdSession = await provider.getSession("session-123");
      expect(createdSession).toBeDefined();
    });
  });
});

/**
 * Test file: session-store.test.ts
 *
 * Purpose: Comprehensive tests for SessionStore implementations per P2.M2.T1.S1
 *
 * Tests:
 * - MemorySessionStore: CRUD operations, backward compatibility
 * - FileSessionStore: Persistence, error handling, atomic writes
 * - Generic type parameter: Type safety with custom session types
 *
 * PRP: P2.M2.T1.S1 - Define SessionStore interface and implementations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlink, rm } from 'node:fs/promises';
import {
  SessionStore,
  MemorySessionStore,
  FileSessionStore,
  RedisSessionStore,
} from '../../../providers/session-store.js';
import type { SessionState } from '../../../../types/providers.js';

describe('SessionStore Implementations (P2.M2.T1.S1)', () => {
  describe('SessionStore Interface', () => {
    it('should define all required methods', () => {
      const store: SessionStore = {
        save: async () => {},
        load: async () => null,
        delete: async () => true,
        list: async () => [],
        has: async () => false,
        clear: async () => {},
      };

      expect(typeof store.save).toBe('function');
      expect(typeof store.load).toBe('function');
      expect(typeof store.delete).toBe('function');
      expect(typeof store.list).toBe('function');
      expect(typeof store.has).toBe('function');
      expect(typeof store.clear).toBe('function');
    });

    it('should support generic type parameter', async () => {
      interface CustomSession {
        customField: string;
        count: number;
      }

      const store: SessionStore<CustomSession> = {
        save: async () => {},
        load: async () => null,
        delete: async () => true,
        list: async () => [],
        has: async () => false,
        clear: async () => {},
      };

      // Type-safe usage
      const customSession: CustomSession = { customField: 'test', count: 42 };
      await store.save('test', customSession);

      const loaded = await store.load('test');
      if (loaded) {
        expect(loaded.customField).toBe('test');
        expect(loaded.count).toBe(42);
      }
    });
  });

  describe('MemorySessionStore', () => {
    let store: MemorySessionStore<SessionState>;

    beforeEach(() => {
      store = new MemorySessionStore<SessionState>();
    });

    describe('save() and load()', () => {
      it('should save and load session state', async () => {
        const sessionState: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('test-session', sessionState);

        const loaded = await store.load('test-session');
        expect(loaded).toEqual(sessionState);
      });

      it('should return null for non-existent session', async () => {
        const loaded = await store.load('non-existent');
        expect(loaded).toBeNull();
      });

      it('should overwrite existing session on save', async () => {
        const firstState: SessionState = {
          history: [{ type: 'user', message: { content: 'first' } } as any],
          lastResult: null,
        };

        const secondState: SessionState = {
          history: [{ type: 'user', message: { content: 'second' } } as any],
          lastResult: null,
        };

        await store.save('test', firstState);
        await store.save('test', secondState);

        const loaded = await store.load('test');
        expect(loaded).toEqual(secondState);
      });

      it('should save multiple sessions', async () => {
        const session1: SessionState = { history: [], lastResult: null };
        const session2: SessionState = { history: [], lastResult: null };
        const session3: SessionState = { history: [], lastResult: null };

        await store.save('session-1', session1);
        await store.save('session-2', session2);
        await store.save('session-3', session3);

        expect(await store.load('session-1')).toEqual(session1);
        expect(await store.load('session-2')).toEqual(session2);
        expect(await store.load('session-3')).toEqual(session3);
      });
    });

    describe('delete()', () => {
      it('should delete existing session and return true', async () => {
        const sessionState: SessionState = { history: [], lastResult: null };
        await store.save('test', sessionState);

        const result = await store.delete('test');
        expect(result).toBe(true);

        const loaded = await store.load('test');
        expect(loaded).toBeNull();
      });

      it('should return false for non-existent session', async () => {
        const result = await store.delete('non-existent');
        expect(result).toBe(false);
      });

      it('should handle delete of multiple sessions', async () => {
        await store.save('s1', { history: [], lastResult: null });
        await store.save('s2', { history: [], lastResult: null });
        await store.save('s3', { history: [], lastResult: null });

        await store.delete('s1');
        await store.delete('s3');

        expect(await store.load('s1')).toBeNull();
        expect(await store.load('s2')).not.toBeNull();
        expect(await store.load('s3')).toBeNull();
      });
    });

    describe('list()', () => {
      it('should return empty array when no sessions', async () => {
        const sessions = await store.list();
        expect(sessions).toEqual([]);
      });

      it('should list all session IDs', async () => {
        await store.save('session-1', { history: [], lastResult: null });
        await store.save('session-2', { history: [], lastResult: null });
        await store.save('session-3', { history: [], lastResult: null });

        const sessions = await store.list();
        expect(sessions).toHaveLength(3);
        expect(sessions).toContain('session-1');
        expect(sessions).toContain('session-2');
        expect(sessions).toContain('session-3');
      });

      it('should reflect deletions in list', async () => {
        await store.save('s1', { history: [], lastResult: null });
        await store.save('s2', { history: [], lastResult: null });

        expect(await store.list()).toHaveLength(2);

        await store.delete('s1');

        const sessions = await store.list();
        expect(sessions).toHaveLength(1);
        expect(sessions).toContain('s2');
      });
    });

    describe('has()', () => {
      it('should return true for existing session', async () => {
        await store.save('test', { history: [], lastResult: null });

        const exists = await store.has('test');
        expect(exists).toBe(true);
      });

      it('should return false for non-existent session', async () => {
        const exists = await store.has('non-existent');
        expect(exists).toBe(false);
      });

      it('should return false after deletion', async () => {
        await store.save('test', { history: [], lastResult: null });
        expect(await store.has('test')).toBe(true);

        await store.delete('test');
        expect(await store.has('test')).toBe(false);
      });
    });

    describe('clear()', () => {
      it('should clear all sessions', async () => {
        await store.save('s1', { history: [], lastResult: null });
        await store.save('s2', { history: [], lastResult: null });
        await store.save('s3', { history: [], lastResult: null });

        await store.clear();

        expect(await store.list()).toHaveLength(0);
        expect(await store.load('s1')).toBeNull();
        expect(await store.load('s2')).toBeNull();
        expect(await store.load('s3')).toBeNull();
      });

      it('should be safe to call clear on empty store', async () => {
        await store.clear();
        await store.clear();

        expect(await store.list()).toHaveLength(0);
      });
    });

    describe('Backward Compatibility with Map', () => {
      it('should provide access to underlying Map', () => {
        const map = store._getMap();
        expect(map).toBeInstanceOf(Map);
      });

      it('should maintain Map-based behavior', async () => {
        const sessionState: SessionState = { history: [], lastResult: null };

        await store.save('test', sessionState);

        const map = store._getMap();
        expect(map.has('test')).toBe(true);
        expect(map.get('test')).toEqual(sessionState);
        expect(map.size).toBe(1);
      });

      it('should support direct Map operations through _getMap()', async () => {
        await store.save('s1', { history: [], lastResult: null });

        const map = store._getMap();

        // Direct Map set
        map.set('s2', { history: [], lastResult: null });

        expect(await store.has('s2')).toBe(true);
        expect(await store.load('s2')).not.toBeNull();
      });
    });

    describe('Async-First Design', () => {
      it('should return Promise from all methods', async () => {
        const savePromise = store.save('test', { history: [], lastResult: null });
        const loadPromise = store.load('test');
        const deletePromise = store.delete('test');
        const listPromise = store.list();
        const hasPromise = store.has('test');
        const clearPromise = store.clear();

        expect(savePromise).toBeInstanceOf(Promise);
        expect(loadPromise).toBeInstanceOf(Promise);
        expect(deletePromise).toBeInstanceOf(Promise);
        expect(listPromise).toBeInstanceOf(Promise);
        expect(hasPromise).toBeInstanceOf(Promise);
        expect(clearPromise).toBeInstanceOf(Promise);

        // All should resolve without error
        await Promise.all([
          savePromise,
          loadPromise,
          deletePromise,
          listPromise,
          hasPromise,
          clearPromise,
        ]);
      });
    });

    describe('Type Safety with Generic Parameter', () => {
      it('should work with custom session types', async () => {
        interface CustomSession {
          foo: string;
          bar: number;
        }

        const customStore = new MemorySessionStore<CustomSession>();

        await customStore.save('test', { foo: 'hello', bar: 42 });

        const loaded = await customStore.load('test');
        expect(loaded?.foo).toBe('hello');
        expect(loaded?.bar).toBe(42);
      });

      it('should default to SessionState type', async () => {
        const defaultStore = new MemorySessionStore();

        const sessionState: SessionState = {
          history: [],
          lastResult: null,
        };

        await defaultStore.save('test', sessionState);

        const loaded = await defaultStore.load('test');
        expect(loaded).toEqual(sessionState);
      });
    });
  });

  describe('FileSessionStore', () => {
    const TEST_DIR = './test-sessions';
    let store: FileSessionStore<SessionState>;

    beforeEach(() => {
      store = new FileSessionStore<SessionState>(TEST_DIR);
    });

    afterEach(async () => {
      try {
        await rm(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    describe('save() and load()', () => {
      it('should save and load session from disk', async () => {
        const sessionState: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('test-session', sessionState);

        const loaded = await store.load('test-session');
        expect(loaded).toEqual(sessionState);
      });

      it('should return null for non-existent session', async () => {
        const loaded = await store.load('non-existent');
        expect(loaded).toBeNull();
      });

      it('should persist data across store instances', async () => {
        const sessionState: SessionState = {
          history: [],
          lastResult: null,
        };

        // Save with first instance
        await store.save('test', sessionState);

        // Create new instance (simulates restart)
        const newStore = new FileSessionStore<SessionState>(TEST_DIR);
        const loaded = await newStore.load('test');

        expect(loaded).toEqual(sessionState);
      });

      it('should overwrite existing session file', async () => {
        const firstState: SessionState = {
          history: [{ type: 'user', message: { content: 'first' } } as any],
          lastResult: null,
        };

        const secondState: SessionState = {
          history: [{ type: 'user', message: { content: 'second' } } as any],
          lastResult: null,
        };

        await store.save('test', firstState);
        await store.save('test', secondState);

        const loaded = await store.load('test');
        expect(loaded).toEqual(secondState);
      });

      it('should save multiple sessions as separate files', async () => {
        await store.save('s1', { history: [], lastResult: null });
        await store.save('s2', { history: [], lastResult: null });
        await store.save('s3', { history: [], lastResult: null });

        expect(await store.load('s1')).not.toBeNull();
        expect(await store.load('s2')).not.toBeNull();
        expect(await store.load('s3')).not.toBeNull();
      });
    });

    describe('delete()', () => {
      it('should delete session file and return true', async () => {
        await store.save('test', { history: [], lastResult: null });

        const result = await store.delete('test');
        expect(result).toBe(true);

        const loaded = await store.load('test');
        expect(loaded).toBeNull();
      });

      it('should return false for non-existent session', async () => {
        const result = await store.delete('non-existent');
        expect(result).toBe(false);
      });
    });

    describe('list()', () => {
      it('should return empty array when no sessions', async () => {
        const sessions = await store.list();
        expect(sessions).toEqual([]);
      });

      it('should list all session IDs from directory', async () => {
        await store.save('session-1', { history: [], lastResult: null });
        await store.save('session-2', { history: [], lastResult: null });
        await store.save('session-3', { history: [], lastResult: null });

        const sessions = await store.list();
        expect(sessions).toHaveLength(3);
        expect(sessions).toContain('session-1');
        expect(sessions).toContain('session-2');
        expect(sessions).toContain('session-3');
      });

      it('should filter only .json files', async () => {
        await store.save('session-1', { history: [], lastResult: null });
        await store.save('session-2', { history: [], lastResult: null });

        const sessions = await store.list();
        sessions.forEach((id) => {
          expect(id).not.toContain('.json');
          expect(id).not.toContain('.tmp');
        });
      });
    });

    describe('has()', () => {
      it('should return true for existing session file', async () => {
        await store.save('test', { history: [], lastResult: null });

        const exists = await store.has('test');
        expect(exists).toBe(true);
      });

      it('should return false for non-existent session', async () => {
        const exists = await store.has('non-existent');
        expect(exists).toBe(false);
      });
    });

    describe('clear()', () => {
      it('should delete all session files', async () => {
        await store.save('s1', { history: [], lastResult: null });
        await store.save('s2', { history: [], lastResult: null });
        await store.save('s3', { history: [], lastResult: null });

        await store.clear();

        expect(await store.list()).toHaveLength(0);
        expect(await store.load('s1')).toBeNull();
        expect(await store.load('s2')).toBeNull();
        expect(await store.load('s3')).toBeNull();
      });

      it('should be safe to call clear on empty directory', async () => {
        await store.clear();
        await store.clear();

        expect(await store.list()).toHaveLength(0);
      });
    });

    describe('JSON Serialization', () => {
      it('should properly serialize complex session data', async () => {
        const complexState: SessionState = {
          history: [
            {
              type: 'user',
              message: { content: 'Test message with nested data' },
              parent_tool_use_id: null,
              session_id: 'test-id',
            } as any,
          ],
          lastResult: {
            type: 'result',
            subtype: 'success',
            result: 'Test result',
            usage: { input_tokens: 10, output_tokens: 20 },
            duration_ms: 1000,
            num_turns: 1,
            total_cost_usd: 0.001,
            session_id: 'test-session-id',
            uuid: 'test-uuid',
          } as any,
        };

        await store.save('complex', complexState);

        const loaded = await store.load('complex');
        expect(loaded).toEqual(complexState);
      });
    });

    describe('Error Handling', () => {
      it('should handle file read errors gracefully', async () => {
        const loaded = await store.load('non-existent');
        expect(loaded).toBeNull();
      });

      it('should throw descriptive errors for invalid paths', async () => {
        const invalidStore = new FileSessionStore<SessionState>('/invalid/path/that/does/not/exist');

        await expect(
          invalidStore.save('test', { history: [], lastResult: null })
        ).rejects.toThrow();
      });
    });

    describe('Directory Creation', () => {
      it('should create directory if it does not exist', async () => {
        const newDirStore = new FileSessionStore<SessionState>('./new-test-dir');

        await newDirStore.save('test', { history: [], lastResult: null });

        const loaded = await newDirStore.load('test');
        expect(loaded).not.toBeNull();

        // Cleanup
        await rm('./new-test-dir', { recursive: true, force: true });
      });

      it('should use custom directory from constructor', () => {
        const customDirStore = new FileSessionStore<SessionState>('./custom-sessions');
        expect(customDirStore).toBeDefined();
      });
    });

    describe('Default Directory', () => {
      it('should use "./sessions" as default directory', async () => {
        const defaultStore = new FileSessionStore<SessionState>();

        await defaultStore.save('test', { history: [], lastResult: null });

        const loaded = await defaultStore.load('test');
        expect(loaded).not.toBeNull();

        // Cleanup
        await rm('./sessions', { recursive: true, force: true });
      });
    });
  });

  describe('RedisSessionStore Interface', () => {
    it('should extend SessionStore with additional methods', () => {
      const redisStore: RedisSessionStore = {
        save: async () => {},
        load: async () => null,
        delete: async () => true,
        list: async () => [],
        has: async () => false,
        clear: async () => {},
        connect: async () => {},
        disconnect: async () => {},
        setTTL: async () => {},
      };

      expect(typeof redisStore.connect).toBe('function');
      expect(typeof redisStore.disconnect).toBe('function');
      expect(typeof redisStore.setTTL).toBe('function');
    });

    it('should include all SessionStore methods', () => {
      const redisStore: RedisSessionStore = {
        save: async () => {},
        load: async () => null,
        delete: async () => true,
        list: async () => [],
        has: async () => false,
        clear: async () => {},
        connect: async () => {},
        disconnect: async () => {},
        setTTL: async () => {},
      };

      expect(typeof redisStore.save).toBe('function');
      expect(typeof redisStore.load).toBe('function');
      expect(typeof redisStore.delete).toBe('function');
      expect(typeof redisStore.list).toBe('function');
      expect(typeof redisStore.has).toBe('function');
      expect(typeof redisStore.clear).toBe('function');
    });
  });

  describe('SessionState Type Export', () => {
    it('should have SessionState type available', () => {
      const sessionState: SessionState = {
        history: [],
        lastResult: null,
      };

      expect(sessionState.history).toEqual([]);
      expect(sessionState.lastResult).toBeNull();
    });
  });
});

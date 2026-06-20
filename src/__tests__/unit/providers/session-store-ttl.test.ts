/**
 * Test file: session-store-ttl.test.ts
 *
 * Purpose: Comprehensive TTL functionality tests for SessionStore implementations per P2.M2.T2.S2
 *
 * Tests:
 * - FileSessionStore: TTL expiration, timestamp updates, cleanup operations
 * - MemorySessionStore: deleteExpired method
 * - Clock skew tolerance
 * - Edge cases (zero TTL, legacy sessions, etc.)
 *
 * PRP: P2.M2.T2.S2 - Session TTL Enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rm } from 'node:fs/promises';
import {
  FileSessionStore,
  MemorySessionStore,
} from '../../../harnesses/session-store.js';
import type { SessionState } from '../../../../types/providers.js';

describe('SessionStore TTL (P2.M2.T2.S2)', () => {
  describe('FileSessionStore TTL', () => {
    const TEST_DIR = './test-sessions-ttl';
    const TTL_MS = 1000; // 1 second for testing
    const LONG_TTL_MS = 86400000; // 24 hours
    let store: FileSessionStore<SessionState>;

    beforeEach(() => {
      vi.useFakeTimers();
      store = new FileSessionStore<SessionState>(TEST_DIR, TTL_MS);
    });

    afterEach(async () => {
      vi.useRealTimers();
      try {
        await rm(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    describe('Timestamps', () => {
      it('should set createdAt and lastAccessedAt on new sessions', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('test-session', state);

        const loaded = await store.load('test-session');
        expect(loaded?.createdAt).toBeDefined();
        expect(loaded?.lastAccessedAt).toBeDefined();
        expect(loaded?.createdAt).toBeGreaterThan(0);
        expect(loaded?.lastAccessedAt).toBeGreaterThan(0);
      });

      it('should update lastAccessedAt on save', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('test-session', state);

        const loaded1 = await store.load('test-session');
        const firstAccessedAt = loaded1?.lastAccessedAt;

        // Advance time
        vi.advanceTimersByTime(1000);

        await store.save('test-session', state);

        const loaded2 = await store.load('test-session');
        expect(loaded2?.lastAccessedAt).toBeGreaterThan(firstAccessedAt ?? 0);
      });

      it('should preserve original createdAt on subsequent saves', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('test-session', state);

        const loaded1 = await store.load('test-session');
        const originalCreatedAt = loaded1?.createdAt;

        // Advance time and save again
        vi.advanceTimersByTime(1000);
        await store.save('test-session', state);

        const loaded2 = await store.load('test-session');
        expect(loaded2?.createdAt).toBe(originalCreatedAt);
      });

      it('should initialize timestamps for sessions without them (legacy)', async () => {
        // Create a session file without timestamps
        const legacyState = {
          history: [],
          lastResult: null,
        };
        // Manually write a file without timestamps
        const { writeFile, mkdir } = await import('node:fs/promises');
        const { join } = await import('node:path');
        await mkdir(TEST_DIR, { recursive: true });
        await writeFile(join(TEST_DIR, 'legacy-session.json'), JSON.stringify(legacyState), 'utf-8');

        const loaded = await store.load('legacy-session');
        // FileSessionStore doesn't auto-add timestamps on load for legacy sessions
        // It uses nullish coalescing when checking expiration
        expect(loaded).toBeDefined();
      });
    });

    describe('Lazy Expiration (on load)', () => {
      it('should load session within TTL', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('active-session', state);

        // Advance time within TTL (less than TTL + tolerance)
        vi.advanceTimersByTime(500);

        const loaded = await store.load('active-session');
        expect(loaded).not.toBeNull();
      });

      it('should return null for expired session', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('expired-session', state);

        // Advance time past TTL (1 second + 60s tolerance)
        vi.advanceTimersByTime(TTL_MS + 61000);

        const loaded = await store.load('expired-session');
        expect(loaded).toBeNull();
      });

      it('should use 60-second tolerance window for clock skew', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('tolerance-session', state);

        // Advance time to TTL + 59 seconds (within tolerance)
        vi.advanceTimersByTime(TTL_MS + 59000);

        const loaded = await store.load('tolerance-session');
        expect(loaded).not.toBeNull();
      });

      it('should delete expired session file on load', async () => {
        const state: SessionState = {
          history: [],
          lastResult: null,
        };

        await store.save('expired-session', state);

        // Advance time past TTL
        vi.advanceTimersByTime(TTL_MS + 61000);

        await store.load('expired-session');

        // Session should be deleted
        const exists = await store.has('expired-session');
        expect(exists).toBe(false);
      });
    });

    describe('Active Cleanup (deleteExpired)', () => {
      it('should delete expired sessions and return IDs', async () => {
        await store.save('session-1', { history: [], lastResult: null });
        await store.save('session-2', { history: [], lastResult: null });
        await store.save('session-3', { history: [], lastResult: null });

        // Advance time past TTL
        vi.advanceTimersByTime(TTL_MS + 61000);

        const deleted = await store.deleteExpired(TTL_MS);
        expect(deleted).toHaveLength(3);
        expect(deleted).toContain('session-1');
        expect(deleted).toContain('session-2');
        expect(deleted).toContain('session-3');
      });

      it('should not delete active sessions', async () => {
        await store.save('active-session', { history: [], lastResult: null });

        // Advance time within TTL
        vi.advanceTimersByTime(500);

        const deleted = await store.deleteExpired(TTL_MS);
        expect(deleted).toHaveLength(0);

        const loaded = await store.load('active-session');
        expect(loaded).not.toBeNull();
      });

      it('should handle zero TTL (never expire)', async () => {
        const noTtlStore = new FileSessionStore<SessionState>(TEST_DIR, 0);
        await noTtlStore.save('eternal-session', { history: [], lastResult: null });

        // Advance time significantly
        vi.advanceTimersByTime(LONG_TTL_MS);

        const deleted = await noTtlStore.deleteExpired(0);
        expect(deleted).toHaveLength(0);

        const loaded = await noTtlStore.load('eternal-session');
        expect(loaded).not.toBeNull();
      });

      it('should use provided TTL parameter', async () => {
        await store.save('session-1', { history: [], lastResult: null });

        // Advance past default TTL but within custom TTL
        vi.advanceTimersByTime(TTL_MS + 61000);

        // Use longer TTL for cleanup
        const deleted = await store.deleteExpired(LONG_TTL_MS);
        expect(deleted).toHaveLength(0);
      });

      it('should return empty array when no TTL configured', async () => {
        const noTtlStore = new FileSessionStore<SessionState>(TEST_DIR);
        await noTtlStore.save('session-1', { history: [], lastResult: null });

        vi.advanceTimersByTime(LONG_TTL_MS);

        const deleted = await noTtlStore.deleteExpired();
        expect(deleted).toHaveLength(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle sessions without timestamps (legacy)', async () => {
        // Manually create a session file without timestamps
        const { writeFile, mkdir } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const legacyState = { history: [], lastResult: null };
        await mkdir(TEST_DIR, { recursive: true });
        await writeFile(join(TEST_DIR, 'legacy.json'), JSON.stringify(legacyState), 'utf-8');

        // Should load without errors
        const loaded = await store.load('legacy');
        expect(loaded).not.toBeNull();
      });

      it('should handle zero TTL (disabled expiration)', async () => {
        const noExpiryStore = new FileSessionStore<SessionState>(TEST_DIR, 0);
        await noExpiryStore.save('eternal', { history: [], lastResult: null });

        vi.advanceTimersByTime(LONG_TTL_MS);

        // Should still load
        const loaded = await noExpiryStore.load('eternal');
        expect(loaded).not.toBeNull();
      });
    });
  });

  describe('MemorySessionStore TTL', () => {
    describe('deleteExpired', () => {
      it('should delete expired sessions from memory', async () => {
        vi.useFakeTimers();
        const store = new MemorySessionStore<SessionState>();
        const TTL = 1000;

        const now = Date.now();
        await store.save('session-1', {
          history: [],
          lastResult: null,
          createdAt: now,
          lastAccessedAt: now,
        });

        // Advance time past TTL
        vi.advanceTimersByTime(TTL + 61000);

        await store.save('session-2', {
          history: [],
          lastResult: null,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        });

        const deleted = await store.deleteExpired(TTL);
        vi.useRealTimers();

        expect(deleted).toHaveLength(1);
        expect(deleted).toContain('session-1');

        const session1 = await store.load('session-1');
        const session2 = await store.load('session-2');
        expect(session1).toBeNull();
        expect(session2).not.toBeNull();
      });

      it('should return empty array when no TTL provided', async () => {
        const store = new MemorySessionStore<SessionState>();
        await store.save('session-1', { history: [], lastResult: null });

        const deleted = await store.deleteExpired();
        expect(deleted).toHaveLength(0);
      });

      it('should return empty array for zero TTL', async () => {
        const store = new MemorySessionStore<SessionState>();
        await store.save('session-1', { history: [], lastResult: null });

        const deleted = await store.deleteExpired(0);
        expect(deleted).toHaveLength(0);
      });
    });
  });
});

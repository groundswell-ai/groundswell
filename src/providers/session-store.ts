/**
 * Session store implementations
 *
 * Provides pluggable session storage backends for maintaining conversation
 * state across requests. Supports in-memory, file-based, and future Redis
 * storage.
 *
 * PRP: P2.M2.T1.S1 - Session Persistence Implementation
 * @module
 */

import type { SessionState } from '../types/providers.js';
import { writeFile, readFile, mkdir, unlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generic session store interface
 *
 * @template T - The session state type (defaults to SessionState)
 *
 * @remarks
 * Defines the contract for session storage backends. Implementations
 * can provide in-memory, file-based, or distributed storage.
 *
 * All methods are async to support I/O operations and network requests.
 *
 * @public
 */
export interface SessionStore<T = SessionState> {
  /**
   * Save session state to storage
   *
   * @param sessionId - Unique session identifier
   * @param state - Session state to save
   * @throws {Error} If save operation fails
   */
  save(sessionId: string, state: T): Promise<void>;

  /**
   * Load session state from storage
   *
   * @param sessionId - Unique session identifier
   * @returns Session state or null if not found
   * @throws {Error} If load operation fails
   */
  load(sessionId: string): Promise<T | null>;

  /**
   * Delete session from storage
   *
   * @param sessionId - Unique session identifier
   * @returns true if deleted, false if not found
   * @throws {Error} If delete operation fails
   */
  delete(sessionId: string): Promise<boolean>;

  /**
   * List all session IDs in storage
   *
   * @returns Array of session IDs
   * @throws {Error} If list operation fails
   */
  list(): Promise<string[]>;

  /**
   * Check if session exists
   *
   * @param sessionId - Unique session identifier
   * @returns true if session exists, false otherwise
   */
  has(sessionId: string): Promise<boolean>;

  /**
   * Clear all sessions from storage
   *
   * @throws {Error} If clear operation fails
   */
  clear(): Promise<void>;
}

/**
 * In-memory session store using Map
 *
 * @remarks
 * Wraps a Map for in-memory session storage. No persistence.
 * Maintains backward compatibility with existing Map-based usage.
 *
 * Thread-safety: Not thread-safe (single-threaded Node.js environment).
 *
 * @template T - The session state type
 * @public
 */
export class MemorySessionStore<T = SessionState> implements SessionStore<T> {
  private sessions: Map<string, T>;

  constructor() {
    this.sessions = new Map();
  }

  async save(sessionId: string, state: T): Promise<void> {
    this.sessions.set(sessionId, state);
  }

  async load(sessionId: string): Promise<T | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async has(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }

  /**
   * Get the underlying Map (for backward compatibility)
   *
   * @internal
   */
  _getMap(): Map<string, T> {
    return this.sessions;
  }
}

/**
 * File-based session store with JSON persistence
 *
 * @remarks
 * Persists sessions to disk as JSON files. Each session is stored
 * as a separate file: `{directory}/{sessionId}.json`
 *
 * Uses atomic writes (temp file + rename) for data safety.
 *
 * @template T - The session state type
 * @public
 */
export class FileSessionStore<T = SessionState> implements SessionStore<T> {
  private directory: string;

  constructor(directory: string = './sessions') {
    this.directory = directory;
  }

  private getPath(sessionId: string): string {
    return join(this.directory, `${sessionId}.json`);
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  async save(sessionId: string, state: T): Promise<void> {
    await this.ensureDirectory();

    const path = this.getPath(sessionId);
    const json = JSON.stringify(state, null, 2);
    const tempPath = `${path}.tmp`;

    try {
      // Atomic write: temp file + rename
      await writeFile(tempPath, json, 'utf-8');
      await writeFile(path, json, 'utf-8');
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      throw new Error(`Failed to save session: ${err.message}`);
    }
  }

  async load(sessionId: string): Promise<T | null> {
    const path = this.getPath(sessionId);

    try {
      const content = await readFile(path, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return null; // File not found
      }
      throw new Error(`Failed to load session: ${err.message}`);
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    const path = this.getPath(sessionId);

    try {
      await unlink(path);
      return true;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return false; // File not found
      }
      throw new Error(`Failed to delete session: ${err.message}`);
    }
  }

  async list(): Promise<string[]> {
    try {
      await this.ensureDirectory();
      const files = await readdir(this.directory);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''));
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      throw new Error(`Failed to list sessions: ${err.message}`);
    }
  }

  async has(sessionId: string): Promise<boolean> {
    const state = await this.load(sessionId);
    return state !== null;
  }

  async clear(): Promise<void> {
    try {
      const sessions = await this.list();
      await Promise.all(sessions.map((id) => this.delete(id)));
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      throw new Error(`Failed to clear sessions: ${err.message}`);
    }
  }
}

/**
 * Redis-based session store (interface stub)
 *
 * @remarks
 * Interface definition for future Redis implementation.
 * Not implemented in this PRP - reserved for future work.
 *
 * @template T - The session state type
 * @public
 */
export interface RedisSessionStore<T = SessionState> extends SessionStore<T> {
  /**
   * Connect to Redis server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from Redis server
   */
  disconnect(): Promise<void>;

  /**
   * Set TTL for session
   *
   * @param sessionId - Session identifier
   * @param ttlSeconds - Time to live in seconds
   */
  setTTL(sessionId: string, ttlSeconds: number): Promise<void>;
}

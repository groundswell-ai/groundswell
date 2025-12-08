/**
 * Unit tests for ReflectionManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReflectionManager } from '../../reflection/reflection.js';
import type { ReflectionContext, WorkflowNode } from '../../types/index.js';

describe('ReflectionManager', () => {
  const createTestNode = (): WorkflowNode => ({
    id: 'test-node-1',
    name: 'Test Node',
    parent: null,
    children: [],
    status: 'failed',
    logs: [],
    events: [],
    stateSnapshot: null,
  });

  const createContext = (
    error: Error,
    attemptNumber: number = 1
  ): ReflectionContext => ({
    level: 'workflow',
    failedNode: createTestNode(),
    error,
    attemptNumber,
    previousAttempts: [],
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      expect(manager.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const manager = new ReflectionManager({ enabled: false, maxAttempts: 3 });
      expect(manager.isEnabled()).toBe(false);
    });
  });

  describe('getMaxAttempts', () => {
    it('should return configured maxAttempts', () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 5 });
      expect(manager.getMaxAttempts()).toBe(5);
    });
  });

  describe('getRetryDelayMs', () => {
    it('should return 0 when not configured', () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      expect(manager.getRetryDelayMs()).toBe(0);
    });

    it('should return configured delay', () => {
      const manager = new ReflectionManager({
        enabled: true,
        maxAttempts: 3,
        retryDelayMs: 1000,
      });
      expect(manager.getRetryDelayMs()).toBe(1000);
    });
  });

  describe('triggerReflection', () => {
    it('should throw when reflection is disabled', async () => {
      const manager = new ReflectionManager({ enabled: false, maxAttempts: 3 });

      await expect(manager.triggerReflection()).rejects.toThrow(
        'Reflection is not enabled'
      );
    });

    it('should record reflection in history', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });

      await manager.triggerReflection('test reason');

      const history = manager.getReflectionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].reason).toBe('test reason');
    });
  });

  describe('getReflectionHistory', () => {
    it('should return empty array initially', () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      expect(manager.getReflectionHistory()).toEqual([]);
    });

    it('should return copy of history (not reference)', () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const history1 = manager.getReflectionHistory();
      const history2 = manager.getReflectionHistory();

      expect(history1).not.toBe(history2);
    });
  });

  describe('reflect (heuristic mode)', () => {
    it('should not retry rate limit errors', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const context = createContext(new Error('rate limit exceeded'));

      const result = await manager.reflect(context);

      expect(result.shouldRetry).toBe(false);
      expect(result.reason).toContain('Non-retryable error');
    });

    it('should not retry authentication errors', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const context = createContext(new Error('authentication failed'));

      const result = await manager.reflect(context);

      expect(result.shouldRetry).toBe(false);
    });

    it('should retry validation errors', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const context = createContext(new Error('validation failed: missing field'));

      const result = await manager.reflect(context);

      expect(result.shouldRetry).toBe(true);
      expect(result.reason).toContain('Validation/parsing error');
    });

    it('should retry JSON parse errors', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const context = createContext(new Error('JSON parse error at position 10'));

      const result = await manager.reflect(context);

      expect(result.shouldRetry).toBe(true);
    });

    it('should retry timeout errors (up to limit)', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });

      const context1 = createContext(new Error('timeout'), 1);
      const result1 = await manager.reflect(context1);
      expect(result1.shouldRetry).toBe(true);

      const context2 = createContext(new Error('timeout'), 2);
      const result2 = await manager.reflect(context2);
      expect(result2.shouldRetry).toBe(false);
    });

    it('should stop retrying after max attempts', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 2 });
      const context = createContext(new Error('generic error'), 2);

      const result = await manager.reflect(context);

      expect(result.shouldRetry).toBe(false);
      expect(result.reason).toContain('Max attempts');
    });

    it('should record reflection in history', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const context = createContext(new Error('test error'));

      await manager.reflect(context);

      const history = manager.getReflectionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].level).toBe('workflow');
      expect(history[0].error.message).toBe('test error');
    });
  });

  describe('markLastReflectionSuccessful', () => {
    it('should mark last entry as successful', async () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      const context = createContext(new Error('test error'));

      await manager.reflect(context);
      manager.markLastReflectionSuccessful();

      const history = manager.getReflectionHistory();
      expect(history[0].success).toBe(true);
    });

    it('should do nothing when history is empty', () => {
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });

      // Should not throw
      expect(() => manager.markLastReflectionSuccessful()).not.toThrow();
    });
  });

  describe('event emission', () => {
    it('should emit reflectionStart and reflectionEnd events', async () => {
      const events: { type: string }[] = [];
      const manager = new ReflectionManager({ enabled: true, maxAttempts: 3 });
      manager.setEventEmitter((event) => events.push(event));

      const context = createContext(new Error('test error'));
      await manager.reflect(context);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('reflectionStart');
      expect(events[1].type).toBe('reflectionEnd');
    });
  });
});

/**
 * Unit tests for LLMCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMCache } from '../../cache/cache.js';

describe('LLMCache', () => {
  let cache: LLMCache;

  beforeEach(() => {
    cache = new LLMCache({ maxItems: 10 });
  });

  describe('get/set', () => {
    it('should store and retrieve values', async () => {
      await cache.set('key1', { data: 'test' });
      const result = await cache.get('key1');

      expect(result).toEqual({ data: 'test' });
    });

    it('should return undefined for missing keys', async () => {
      const result = await cache.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should update existing keys', async () => {
      await cache.set('key1', 'first');
      await cache.set('key1', 'second');

      const result = await cache.get('key1');
      expect(result).toBe('second');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', async () => {
      await cache.set('key1', 'value');

      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('bust', () => {
    it('should remove specific key', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.bust('key1');

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(true);
    });

    it('should not throw for missing keys', async () => {
      await expect(cache.bust('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('bustPrefix', () => {
    it('should remove all keys with given prefix', async () => {
      await cache.set('key1', 'value1', { prefix: 'group-a' });
      await cache.set('key2', 'value2', { prefix: 'group-a' });
      await cache.set('key3', 'value3', { prefix: 'group-b' });

      await cache.bustPrefix('group-a');

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });

    it('should not throw for nonexistent prefix', async () => {
      await expect(cache.bustPrefix('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      expect(cache.size).toBe(0);
    });

    it('should reset metrics', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1'); // hit
      await cache.get('key2'); // miss

      await cache.clear();

      const metrics = cache.metrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
    });
  });

  describe('metrics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');

      await cache.get('key1'); // hit
      await cache.get('key1'); // hit
      await cache.get('key2'); // miss

      const metrics = cache.metrics();
      expect(metrics.hits).toBe(2);
      expect(metrics.misses).toBe(1);
      expect(metrics.hitRate).toBeCloseTo(66.67, 0);
    });

    it('should track size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const metrics = cache.metrics();
      expect(metrics.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when maxItems exceeded', async () => {
      const smallCache = new LLMCache({ maxItems: 3 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');
      await smallCache.set('key4', 'value4');

      // key1 should be evicted (least recently used)
      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key4')).toBe(true);
    });

    it('should update LRU order on get', async () => {
      const smallCache = new LLMCache({ maxItems: 3 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 to make it most recently used
      await smallCache.get('key1');

      // Add new item, should evict key2 instead of key1
      await smallCache.set('key4', 'value4');

      expect(smallCache.has('key1')).toBe(true);
      expect(smallCache.has('key2')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return iterator of all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const keys = Array.from(cache.keys());
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });
});

/**
 * LLMCache - LRU cache for LLM responses with size and TTL limits
 *
 * Wraps the lru-cache package to provide:
 * - Item count limits
 * - Memory size limits
 * - Time-based expiration (TTL)
 * - Prefix-based cache busting for related entries
 */

import { LRUCache } from 'lru-cache';

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of items in cache (default: 1000) */
  maxItems?: number;
  /** Maximum cache size in bytes (default: 50MB) */
  maxSizeBytes?: number;
  /** Default TTL in milliseconds (default: 1 hour) */
  defaultTTLMs?: number;
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current number of items in cache */
  size: number;
  /** Current cache size in bytes (estimated) */
  sizeBytes: number;
  /** Hit rate percentage */
  hitRate: number;
}

/**
 * Internal cache entry wrapper
 */
interface CacheEntry<T> {
  value: T;
  prefix?: string;
}

/**
 * LLMCache - High-performance LRU cache for LLM responses
 */
export class LLMCache<T = unknown> {
  private readonly cache: LRUCache<string, CacheEntry<T>>;
  private readonly prefixIndex: Map<string, Set<string>>;
  private readonly config: Required<CacheConfig>;

  private hitCount = 0;
  private missCount = 0;

  /**
   * Create a new LLMCache instance
   * @param config Cache configuration
   */
  constructor(config: CacheConfig = {}) {
    this.config = {
      maxItems: config.maxItems ?? 1000,
      maxSizeBytes: config.maxSizeBytes ?? 52_428_800, // 50MB
      defaultTTLMs: config.defaultTTLMs ?? 3_600_000, // 1 hour
    };

    this.prefixIndex = new Map();

    this.cache = new LRUCache<string, CacheEntry<T>>({
      max: this.config.maxItems,
      maxSize: this.config.maxSizeBytes,
      sizeCalculation: (entry) => {
        // Estimate size based on JSON serialization
        try {
          return JSON.stringify(entry.value).length;
        } catch {
          // Fallback for non-serializable values
          return 1000;
        }
      },
      ttl: this.config.defaultTTLMs,
      updateAgeOnGet: true,
      allowStale: false,
      dispose: (entry, key) => {
        // Clean up prefix index on eviction
        if (entry.prefix) {
          const keys = this.prefixIndex.get(entry.prefix);
          if (keys) {
            keys.delete(key);
            if (keys.size === 0) {
              this.prefixIndex.delete(entry.prefix);
            }
          }
        }
      },
    });
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found
   */
  async get(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (entry) {
      this.hitCount++;
      return entry.value;
    }
    this.missCount++;
    return undefined;
  }

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param options Optional TTL override and prefix for grouping
   */
  async set(
    key: string,
    value: T,
    options?: { ttl?: number; prefix?: string }
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      prefix: options?.prefix,
    };

    const cacheOptions: { ttl?: number } = {};
    if (options?.ttl !== undefined) {
      cacheOptions.ttl = options.ttl;
    }

    this.cache.set(key, entry, cacheOptions);

    // Track prefix for bulk invalidation
    if (options?.prefix) {
      let keys = this.prefixIndex.get(options.prefix);
      if (!keys) {
        keys = new Set();
        this.prefixIndex.set(options.prefix, keys);
      }
      keys.add(key);
    }
  }

  /**
   * Check if a key exists in the cache (without affecting LRU order)
   * @param key Cache key
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a specific key from the cache
   * @param key Cache key to remove
   */
  async bust(key: string): Promise<void> {
    const entry = this.cache.peek(key);
    if (entry?.prefix) {
      const keys = this.prefixIndex.get(entry.prefix);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.prefixIndex.delete(entry.prefix);
        }
      }
    }
    this.cache.delete(key);
  }

  /**
   * Remove all keys with a given prefix
   * @param prefix Prefix to match
   */
  async bustPrefix(prefix: string): Promise<void> {
    const keys = this.prefixIndex.get(prefix);
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key);
      }
      this.prefixIndex.delete(prefix);
    }
  }

  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.prefixIndex.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache performance metrics
   * @returns Current cache metrics
   */
  metrics(): CacheMetrics {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      size: this.cache.size,
      sizeBytes: this.cache.calculatedSize ?? 0,
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
    };
  }

  /**
   * Get the number of items in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
}

/**
 * Default singleton cache instance
 */
export const defaultCache = new LLMCache();

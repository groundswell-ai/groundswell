# LRU Cache Code Patterns for LLM Caching

**Quick Reference Guide with Copy-Paste Ready Examples**

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start Pattern](#quick-start-pattern)
3. [Cache Key Generation Patterns](#cache-key-generation-patterns)
4. [Configuration Patterns](#configuration-patterns)
5. [Usage Patterns](#usage-patterns)
6. [Testing Patterns](#testing-patterns)
7. [Monitoring Patterns](#monitoring-patterns)

---

## Installation

```bash
# Core dependencies
npm install lru-cache safe-stable-stringify zod

# Optional: For semantic caching
npm install @xenova/transformers  # For embeddings

# TypeScript support
npm install --save-dev typescript @types/node
```

**Package.json:**

```json
{
  "dependencies": {
    "lru-cache": "^10.0.0",
    "safe-stable-stringify": "^2.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Quick Start Pattern

### Minimal Working Example

```typescript
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import safeStringify from 'safe-stable-stringify';

// 1. Create cache
const cache = new LRUCache<string, string>({
  max: 100,
  ttl: 3600000  // 1 hour
});

// 2. Generate deterministic key
function cacheKey(input: any): string {
  const normalized = safeStringify(input);
  const hash = createHash('sha256');
  hash.update(normalized);
  return hash.digest('hex');
}

// 3. Use cache
async function getCachedResponse(prompt: string): Promise<string> {
  const key = cacheKey({ prompt });

  return cache.fetch(
    key,
    async () => {
      // This only runs on cache miss
      const response = await expensiveOperation(prompt);
      return response;
    }
  );
}
```

---

## Cache Key Generation Patterns

### Pattern 1: Simple String Hashing

```typescript
function simpleKeyHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Usage
const key = simpleKeyHash('user prompt text');
```

### Pattern 2: Object Hashing (Most Common)

```typescript
function objectKeyHash(obj: Record<string, any>): string {
  const normalized = safeStringify(obj);
  const hash = createHash('sha256');
  hash.update(normalized);
  return hash.digest('hex').substring(0, 16);  // 16 chars for readability
}

// Usage
const key = objectKeyHash({
  model: 'gpt-4',
  temperature: 0.7,
  prompt: 'What is AI?'
});
```

### Pattern 3: Composite Keys with Prefix

```typescript
function compositeKey(
  model: string,
  version: string,
  input: Record<string, any>
): string {
  const hash = objectKeyHash(input);
  return `${model}:${version}:${hash}`;
}

// Usage
const key = compositeKey('gpt-4', 'v1', { prompt: '...' });
// Output: gpt-4:v1:a1b2c3d4e5f6g7h8
```

### Pattern 4: Semantic Cache Key (Embedding-based)

```typescript
async function semanticCacheKey(
  prompt: string,
  embeddingModel: any
): Promise<string> {
  // Get embedding vector
  const embedding = await embeddingModel.embed(prompt);

  // Round to 2 decimal places for compression
  const compressed = embedding
    .slice(0, 10)  // Take first 10 dimensions
    .map((v: number) => Math.round(v * 100) / 100);

  return safeStringify({
    type: 'semantic',
    embedding: compressed
  });
}
```

### Pattern 5: Versioned Keys (Auto-invalidate on schema change)

```typescript
class VersionedKeyGenerator {
  private version: number = 1;

  constructor(private modelName: string) {}

  generate(input: any): string {
    const normalized = safeStringify({
      version: this.version,
      model: this.modelName,
      input
    });

    const hash = createHash('sha256');
    hash.update(normalized);
    return hash.digest('hex');
  }

  // Bump version to invalidate all old cache entries
  invalidateAll(): void {
    this.version++;
  }
}

// Usage
const keyGen = new VersionedKeyGenerator('gpt-4');
const key1 = keyGen.generate({ prompt: 'hello' });

keyGen.invalidateAll();  // All old keys now invalid

const key2 = keyGen.generate({ prompt: 'hello' });
// key1 !== key2 (different version)
```

---

## Configuration Patterns

### Pattern 1: Development Cache (Small, Short-lived)

```typescript
const devCache = new LRUCache<string, any>({
  max: 100,
  ttl: 600000,  // 10 minutes
  updateAgeOnGet: true
});
```

### Pattern 2: Production Cache (Large, Long-lived)

```typescript
const prodCache = new LRUCache<string, any>({
  max: 5000,
  maxSize: 500 * 1024 * 1024,  // 500 MB
  ttl: 24 * 3600 * 1000,        // 24 hours
  sizeCalculation: (val) => {
    const json = JSON.stringify(val);
    return Buffer.byteLength(json, 'utf8') + 100;
  },
  updateAgeOnGet: true
});
```

### Pattern 3: Memory-Constrained Cache

```typescript
const memoryConstrainedCache = new LRUCache<string, any>({
  max: 500,  // Limit by item count instead of size
  ttl: 3600000,  // 1 hour
  updateAgeOnGet: false  // Don't refresh on every access
});
```

### Pattern 4: High-Throughput Cache

```typescript
const highThroughputCache = new LRUCache<string, any>({
  max: 10000,
  ttl: 1800000,  // 30 minutes
  updateAgeOnGet: true,  // Keep hot items fresh

  // Optional: Track evictions
  dispose: (value, key, reason) => {
    if (reason === 'evict') {
      console.log(`Evicted key: ${key.substring(0, 8)}...`);
    }
  }
});
```

### Pattern 5: Persistent + In-Memory Hybrid

```typescript
import { promises as fs } from 'node:fs';

class HybridCache {
  private memory: LRUCache<string, any>;
  private persistDir = './cache';

  constructor() {
    this.memory = new LRUCache<string, any>({
      max: 1000,
      maxSize: 100 * 1024 * 1024
    });
  }

  async get(key: string): Promise<any | undefined> {
    // L1: Memory
    const memValue = this.memory.get(key);
    if (memValue) return memValue;

    // L2: Disk
    try {
      const filePath = `${this.persistDir}/${key}.json`;
      const data = await fs.readFile(filePath, 'utf8');
      const value = JSON.parse(data);

      // Promote to memory
      this.memory.set(key, value);
      return value;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: any): Promise<void> {
    this.memory.set(key, value);

    // Persist to disk
    const filePath = `${this.persistDir}/${key}.json`;
    await fs.mkdir(this.persistDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value));
  }
}
```

---

## Usage Patterns

### Pattern 1: Basic Fetch (Recommended)

```typescript
async function fetchWithCache(
  prompt: string,
  cache: LRUCache<string, string>
): Promise<string> {
  const key = createHash('sha256').update(prompt).digest('hex');

  return cache.fetch(
    key,
    async () => {
      // Only executes on cache miss
      const response = await callLLM(prompt);
      return response;
    },
    {
      ttl: 24 * 3600 * 1000  // Per-item override
    }
  );
}

async function callLLM(prompt: string): Promise<string> {
  // Your LLM API call
  return 'LLM response...';
}
```

### Pattern 2: Conditional Fetch

```typescript
async function fetchWithExpiry(
  key: string,
  fetchFn: () => Promise<any>,
  cache: LRUCache<string, any>,
  forceRefresh = false
): Promise<any> {
  if (forceRefresh) {
    // Force refresh even if cached
    const value = await fetchFn();
    cache.set(key, value);
    return value;
  }

  return cache.fetch(key, fetchFn);
}

// Usage
const result = await fetchWithExpiry(
  key,
  async () => expensiveOperation(),
  cache,
  false  // Set true to force refresh
);
```

### Pattern 3: Batch Operations

```typescript
async function cacheBatchLookups(
  prompts: string[],
  cache: LRUCache<string, string>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Process in parallel with cache deduplication
  await Promise.all(
    prompts.map(async (prompt) => {
      const key = createHash('sha256').update(prompt).digest('hex');

      const response = await cache.fetch(
        key,
        async () => callLLM(prompt)
      );

      results.set(prompt, response);
    })
  );

  return results;
}
```

### Pattern 4: Stale-While-Revalidate Pattern

```typescript
async function staleWhileRevalidate(
  key: string,
  cache: LRUCache<string, any>,
  fetchFn: () => Promise<any>
): Promise<any> {
  // Return stale value immediately if available
  const cached = cache.get(key);
  if (cached) {
    // Refresh in background
    fetchFn().then((fresh) => {
      cache.set(key, fresh);
    }).catch(console.error);

    return cached;
  }

  // No cached value, wait for fetch
  return fetchFn().then((value) => {
    cache.set(key, value);
    return value;
  });
}
```

### Pattern 5: Cache Warming

```typescript
async function warmCache(
  cache: LRUCache<string, any>,
  prompts: string[]
): Promise<void> {
  console.log(`Warming cache with ${prompts.length} entries...`);

  for (const prompt of prompts) {
    const key = createHash('sha256').update(prompt).digest('hex');

    try {
      await cache.fetch(
        key,
        async () => callLLM(prompt),
        { ttl: 7 * 24 * 3600 * 1000 }  // 7 days
      );
    } catch (error) {
      console.error(`Failed to warm cache for prompt: ${prompt}`, error);
    }
  }

  console.log('Cache warming complete');
}

// Usage
const commonPrompts = [
  'What is AI?',
  'Explain machine learning',
  'Define neural networks'
];

await warmCache(cache, commonPrompts);
```

---

## Testing Patterns

### Pattern 1: Cache Hit/Miss Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('LLM Cache', () => {
  let cache: LRUCache<string, string>;

  beforeEach(() => {
    cache = new LRUCache({ max: 100 });
  });

  it('should have cache hit on repeated prompt', async () => {
    const prompt = 'What is AI?';
    let callCount = 0;

    const fetchFn = async () => {
      callCount++;
      return 'AI is...';
    };

    // First call - miss
    const result1 = await cache.fetch(
      createHash('sha256').update(prompt).digest('hex'),
      fetchFn
    );

    // Second call - hit
    const result2 = await cache.fetch(
      createHash('sha256').update(prompt).digest('hex'),
      fetchFn
    );

    expect(result1).toBe(result2);
    expect(callCount).toBe(1);  // Only called once
  });

  it('should evict LRU items', () => {
    const cache = new LRUCache({ max: 2 });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    expect(cache.get('key1')).toBeUndefined();  // Evicted
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });
});
```

### Pattern 2: Key Generation Testing

```typescript
describe('Cache Key Generation', () => {
  it('should produce same key for equivalent inputs', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, b: 2, a: 1 };

    const key1 = objectKeyHash(obj1);
    const key2 = objectKeyHash(obj2);

    expect(key1).toBe(key2);
  });

  it('should handle circular references', () => {
    const obj: any = { value: 42 };
    obj.self = obj;

    expect(() => {
      objectKeyHash(obj);
    }).not.toThrow();
  });

  it('should produce different keys for different inputs', () => {
    const key1 = objectKeyHash({ prompt: 'hello' });
    const key2 = objectKeyHash({ prompt: 'world' });

    expect(key1).not.toBe(key2);
  });
});
```

### Pattern 3: Performance Testing

```typescript
import { performance } from 'node:perf_hooks';

describe('Cache Performance', () => {
  it('should handle 10k cache hits in < 100ms', () => {
    const cache = new LRUCache<string, string>({ max: 1000 });
    cache.set('key', 'value');

    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      cache.get('key');
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('should deterministically stringify in < 1ms', () => {
    const obj = {
      messages: Array(10).fill({ role: 'user', content: 'x'.repeat(100) }),
      model: 'gpt-4',
      temperature: 0.7
    };

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      safeStringify(obj);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);  // 1000 iterations < 1 second
  });
});
```

---

## Monitoring Patterns

### Pattern 1: Basic Metrics Collection

```typescript
class CacheMetrics {
  hits = 0;
  misses = 0;
  latencies: number[] = [];

  recordHit(latency: number): void {
    this.hits++;
    this.latencies.push(latency);
    this.trimLatencies();
  }

  recordMiss(latency: number): void {
    this.misses++;
    this.latencies.push(latency);
    this.trimLatencies();
  }

  private trimLatencies(): void {
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-5000);
    }
  }

  getStats() {
    const total = this.hits + this.misses;
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      avgLatency: avgLatency.toFixed(3) + ' ms',
      p95Latency: this.percentile(95) + ' ms',
      p99Latency: this.percentile(99) + ' ms'
    };
  }

  private percentile(p: number): string {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[idx]?.toFixed(3) || '0';
  }
}
```

### Pattern 2: Periodic Logging

```typescript
function setupCacheMonitoring(
  cache: LRUCache<string, any>,
  metrics: CacheMetrics,
  intervalMs = 60000
): () => void {
  const timer = setInterval(() => {
    const stats = metrics.getStats();
    console.log('[Cache Status]', {
      timestamp: new Date().toISOString(),
      size: cache.size,
      ...stats
    });
  }, intervalMs);

  return () => clearInterval(timer);
}

// Usage
const metrics = new CacheMetrics();
const stopMonitoring = setupCacheMonitoring(cache, metrics, 30000);

// Later
stopMonitoring();
```

### Pattern 3: Alert on Low Hit Rate

```typescript
function monitorHitRate(
  metrics: CacheMetrics,
  minHitRate = 0.3,  // 30% minimum
  checkIntervalMs = 60000
): () => void {
  const timer = setInterval(() => {
    const stats = metrics.getStats();
    const hitRate = parseFloat(stats.hitRate);

    if (hitRate < minHitRate * 100) {
      console.warn(
        `⚠️  Low cache hit rate: ${stats.hitRate} (threshold: ${minHitRate * 100}%)`
      );
    }
  }, checkIntervalMs);

  return () => clearInterval(timer);
}
```

### Pattern 4: Export Metrics to JSON

```typescript
async function exportMetrics(
  metrics: CacheMetrics,
  filePath: string
): Promise<void> {
  const stats = metrics.getStats();
  const data = JSON.stringify(stats, null, 2);

  await fs.promises.writeFile(filePath, data, 'utf8');
  console.log(`Metrics exported to ${filePath}`);
}

// Usage
await exportMetrics(metrics, './cache-metrics.json');
```

---

## Edge Cases and Solutions

### Handling Large Prompts

```typescript
// For very large prompts, use streaming hash
async function hashLargePrompt(prompt: string): Promise<string> {
  const hash = createHash('sha256');
  const chunkSize = 65536;  // 64 KB

  for (let i = 0; i < prompt.length; i += chunkSize) {
    hash.update(prompt.slice(i, i + chunkSize));
  }

  return hash.digest('hex');
}
```

### Handling Special Characters

```typescript
// Ensure UTF-8 encoding for consistent hashing
function hashWithEncoding(input: string): string {
  const buffer = Buffer.from(input, 'utf8');
  const hash = createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}
```

### Handling Null/Undefined Values

```typescript
function safeKeyHash(value: any): string {
  if (value === null || value === undefined) {
    return createHash('sha256').update('null').digest('hex');
  }

  const str = safeStringify(value);
  const hash = createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
}
```

---

## Complete Integration Example

```typescript
// cache.service.ts
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import safeStringify from 'safe-stable-stringify';

export interface CacheConfig {
  maxItems?: number;
  maxSizeMB?: number;
  ttlHours?: number;
}

export class LLMCacheService {
  private cache: LRUCache<string, any>;
  private metrics = {
    hits: 0,
    misses: 0,
    latencies: [] as number[]
  };

  constructor(config: CacheConfig = {}) {
    const {
      maxItems = 5000,
      maxSizeMB = 500,
      ttlHours = 24
    } = config;

    this.cache = new LRUCache({
      max: maxItems,
      maxSize: maxSizeMB * 1024 * 1024,
      sizeCalculation: (val) => {
        const json = JSON.stringify(val);
        return Buffer.byteLength(json, 'utf8') + 100;
      },
      ttl: ttlHours * 3600 * 1000,
      updateAgeOnGet: true
    });
  }

  async fetch<T>(
    input: Record<string, any>,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const key = this.generateKey(input);

    const result = await this.cache.fetch(key, fetcher);

    const latency = performance.now() - start;
    const cached = this.cache.get(key) !== undefined;

    if (cached) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    this.metrics.latencies.push(latency);

    return result;
  }

  private generateKey(input: Record<string, any>): string {
    const normalized = safeStringify(input);
    const hash = createHash('sha256');
    hash.update(normalized);
    return hash.digest('hex');
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : '0',
      size: this.cache.size
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage in your application
const cacheService = new LLMCacheService({
  maxItems: 5000,
  maxSizeMB: 500,
  ttlHours: 24
});

// Use in your LLM service
const response = await cacheService.fetch(
  {
    model: 'gpt-4',
    prompt: 'What is AI?',
    temperature: 0.7
  },
  async () => {
    return callOpenAIAPI(...);
  }
);

// Monitor
console.log(cacheService.getMetrics());
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-08

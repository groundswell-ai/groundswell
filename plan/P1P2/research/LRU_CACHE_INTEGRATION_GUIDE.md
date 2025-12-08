# LRU Cache Integration Guide for Groundswell

**Framework Integration Patterns and Decision Matrix**

---

## Table of Contents

1. [Quick Decision Matrix](#quick-decision-matrix)
2. [Integration Strategies](#integration-strategies)
3. [Framework-Specific Integration](#framework-specific-integration)
4. [Migration Path](#migration-path)
5. [Troubleshooting](#troubleshooting)

---

## Quick Decision Matrix

### Choose Your Caching Strategy

| Requirement | Exact Cache | Semantic Cache | Hybrid | Comment |
|-------------|------------|----------------|--------|---------|
| **Hit Rate** | 30-40% | 60-70% | 65-75% | Semantic better for paraphrased queries |
| **Latency** | <1ms | 10-50ms | 5-30ms | Exact fastest, semantic requires embedding |
| **Memory** | Low | High | Medium | Semantic stores embeddings |
| **Setup** | Easy | Complex | Medium | Semantic needs embedding model |
| **Use Case** | Repeated identical queries | Similar meaning queries | Production | Choose based on user patterns |

### Deployment Environment

| Environment | Recommendation | Config |
|-------------|-----------------|--------|
| **Development** | Single-process in-memory | max: 100, ttl: 10min |
| **Staging** | Single-process with monitoring | max: 1000, ttl: 1hr |
| **Production (Single Node)** | In-memory with persistence | max: 5000, maxSize: 500MB |
| **Production (Multi-Node)** | Redis + in-memory L1 | L1: max 1000, L2: Redis |
| **High-Load** | Redis + semantic cache | Consider GPTCache library |

### Package Selection

| Package | When to Use | Performance | Notes |
|---------|------------|-------------|-------|
| **lru-cache** | v10+ for all cases | Excellent | Built-in types, recommended |
| **safe-stable-stringify** | Production LLM cache | Fast (~13k ops/sec) | Handles circular refs, zero deps |
| **fast-json-stable-stringify** | Performance-critical | Fastest (~17k ops/sec) | No circular ref support |
| **Redis (node-redis)** | Multi-node deployment | Depends on network | Shared cache across processes |
| **SQLite** | Persistent cache | Slow but durable | Good for offline testing |

---

## Integration Strategies

### Strategy 1: Minimal Integration (Recommended for MVP)

**When:** Simple LLM query caching, single-node deployment, starting out

**Implementation:**

```typescript
// src/services/llm-cache.ts
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import safeStringify from 'safe-stable-stringify';

export class LLMCacheService {
  private static instance: LLMCacheService;
  private cache: LRUCache<string, any>;

  private constructor() {
    this.cache = new LRUCache({
      max: 5000,
      ttl: 24 * 3600 * 1000,
      maxSize: 100 * 1024 * 1024  // 100 MB
    });
  }

  static getInstance(): LLMCacheService {
    if (!LLMCacheService.instance) {
      LLMCacheService.instance = new LLMCacheService();
    }
    return LLMCacheService.instance;
  }

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    return this.cache.fetch(key, fetcher);
  }

  private generateKey(input: any): string {
    const normalized = safeStringify(input);
    return createHash('sha256').update(normalized).digest('hex');
  }
}
```

**Usage in workflow:**

```typescript
// src/workflows/llm-query.workflow.ts
import { LLMCacheService } from '../services/llm-cache';

export class LLMQueryWorkflow {
  private cacheService = LLMCacheService.getInstance();

  async executeQuery(prompt: string, model: string): Promise<string> {
    const cacheKey = this.generateKey(prompt, model);

    return this.cacheService.get(
      cacheKey,
      async () => {
        // Only called on cache miss
        return this.callLLM(prompt, model);
      }
    );
  }

  private generateKey(prompt: string, model: string): string {
    return createHash('sha256')
      .update(JSON.stringify({ prompt, model }))
      .digest('hex');
  }

  private async callLLM(prompt: string, model: string): Promise<string> {
    // Your LLM API call
    return 'response...';
  }
}
```

**Pros:**
- Simple, minimal dependencies
- Easy to test
- Singleton pattern ensures single cache instance

**Cons:**
- Only works with single process
- No distributed caching
- Manual key generation in each workflow

---

### Strategy 2: Service-Based Integration (Recommended for Production)

**When:** Complex caching needs, multiple workflows, monitoring required

**Implementation:**

```typescript
// src/cache/cache.config.ts
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxItems?: number;
  maxSizeMB?: number;
  ttlHours?: number;
  enableMetrics?: boolean;
}

export const getCacheConfig = (env: string): CacheOptions => {
  switch (env) {
    case 'development':
      return { maxItems: 100, maxSizeMB: 50, ttlHours: 1 };
    case 'staging':
      return { maxItems: 1000, maxSizeMB: 200, ttlHours: 4 };
    case 'production':
      return { maxItems: 5000, maxSizeMB: 500, ttlHours: 24, enableMetrics: true };
    default:
      return { maxItems: 500, maxSizeMB: 100, ttlHours: 2 };
  }
};

// src/cache/cache.service.ts
import { createHash } from 'node:crypto';
import safeStringify from 'safe-stable-stringify';

export class CacheService {
  private cache: LRUCache<string, any>;
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    latencies: [] as number[]
  };

  constructor(options: CacheOptions) {
    this.cache = new LRUCache({
      max: options.maxItems || 1000,
      maxSize: (options.maxSizeMB || 100) * 1024 * 1024,
      sizeCalculation: (val) => {
        const json = JSON.stringify(val);
        return Buffer.byteLength(json, 'utf8') + 100;
      },
      ttl: (options.ttlHours || 24) * 3600 * 1000,
      updateAgeOnGet: true,

      dispose: (value, key, reason) => {
        if (reason === 'evict' && options.enableMetrics) {
          this.metrics.evictions++;
        }
      }
    });
  }

  async fetch<T>(
    input: Record<string, any>,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const key = this.generateKey(input);

    try {
      const result = await this.cache.fetch(key, fetcher);
      this.recordHit(performance.now() - start);
      return result;
    } catch (error) {
      this.recordMiss(performance.now() - start);
      throw error;
    }
  }

  private generateKey(input: Record<string, any>): string {
    const normalized = safeStringify(input);
    const hash = createHash('sha256');
    hash.update(normalized);
    return hash.digest('hex');
  }

  private recordHit(latency: number): void {
    this.metrics.hits++;
    this.recordLatency(latency);
  }

  private recordMiss(latency: number): void {
    this.metrics.misses++;
    this.recordLatency(latency);
  }

  private recordLatency(latency: number): void {
    this.metrics.latencies.push(latency);
    if (this.metrics.latencies.length > 10000) {
      this.metrics.latencies.shift();
    }
  }

  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + '%' : '0%',
      avgLatency: avgLatency.toFixed(3) + ' ms',
      cacheSize: this.cache.size,
      evictions: this.metrics.evictions
    };
  }

  clear(): void {
    this.cache.clear();
  }
}
```

**Usage in dependency injection:**

```typescript
// src/index.ts (main entry point)
import { CacheService } from './cache/cache.service';
import { getCacheConfig } from './cache/cache.config';

// Setup
const env = process.env.NODE_ENV || 'development';
const cacheConfig = getCacheConfig(env);
const cacheService = new CacheService(cacheConfig);

// Export for dependency injection
export { cacheService };

// src/workflows/llm-query.workflow.ts
import { cacheService } from '../index';

export class LLMQueryWorkflow {
  constructor(private cache = cacheService) {}

  async query(input: any): Promise<string> {
    return this.cache.fetch(
      input,
      async () => this.callLLMAPI(input)
    );
  }

  private async callLLMAPI(input: any): Promise<string> {
    // Implementation
    return 'response...';
  }
}
```

**Pros:**
- Centralized cache configuration
- Easy to swap implementations (Redis, etc.)
- Metrics built-in
- Testable (can inject mock)

**Cons:**
- More boilerplate
- Slightly more complex setup

---

### Strategy 3: Multi-Layer Caching (For High Performance)

**When:** Multi-node deployment, critical performance requirements

**Implementation:**

```typescript
// src/cache/multi-layer.cache.ts
import { LRUCache } from 'lru-cache';
import { createClient, RedisClientType } from 'redis';

export class MultiLayerCache {
  private l1: LRUCache<string, any>;  // In-process
  private l2: RedisClientType | null = null;  // Redis

  constructor(
    l1Config: any,
    redisUrl?: string
  ) {
    this.l1 = new LRUCache(l1Config);

    // Optional Redis
    if (redisUrl) {
      this.initRedis(redisUrl);
    }
  }

  private async initRedis(url: string): Promise<void> {
    this.l2 = createClient({ url });
    await this.l2.connect();
  }

  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl?: number } = {}
  ): Promise<T> {
    // L1: In-process (nanoseconds)
    const l1Hit = this.l1.get(key);
    if (l1Hit !== undefined) {
      return l1Hit;
    }

    // L2: Redis (milliseconds)
    if (this.l2) {
      try {
        const l2Data = await this.l2.get(key);
        if (l2Data) {
          const value = JSON.parse(l2Data);
          this.l1.set(key, value);  // Promote to L1
          return value;
        }
      } catch (error) {
        console.error('L2 cache error:', error);
        // Fall through to fetcher
      }
    }

    // Cache miss - fetch and store
    const value = await fetcher();

    this.l1.set(key, value);
    if (this.l2) {
      try {
        const ttl = options.ttl || 24 * 3600;
        await this.l2.setEx(
          key,
          Math.floor(ttl / 1000),
          JSON.stringify(value)
        );
      } catch (error) {
        console.error('Failed to store in L2:', error);
      }
    }

    return value;
  }

  async disconnect(): Promise<void> {
    if (this.l2) {
      await this.l2.disconnect();
    }
  }
}
```

**Usage:**

```typescript
// src/index.ts
const cache = new MultiLayerCache(
  {
    max: 1000,
    maxSize: 100 * 1024 * 1024
  },
  process.env.REDIS_URL  // Optional
);

export { cache };
```

**Pros:**
- Fast L1 lookups
- Distributed caching with L2
- Transparent failover

**Cons:**
- Redis dependency
- Additional latency on L1 miss
- Network overhead for L2

---

## Framework-Specific Integration

### Integration with Groundswell Workflow Engine

```typescript
// src/plugins/cache.plugin.ts
import { WorkflowPlugin } from '@groundswell/core';
import { CacheService } from '../cache/cache.service';

export class CachePlugin implements WorkflowPlugin {
  private cache: CacheService;

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
  }

  async onTaskStart(context: any): Promise<void> {
    context.cache = this.cache;
  }

  async onTaskComplete(context: any): Promise<void> {
    // Optional: log metrics
    if (context.taskName === 'llm-query') {
      console.log('[LLM Cache]', this.cache.getMetrics());
    }
  }
}

// src/index.ts
import { createWorkflow } from '@groundswell/core';
import { CachePlugin } from './plugins/cache.plugin';

const workflow = createWorkflow()
  .use(new CachePlugin(cacheService))
  .define(/* ... */);
```

### Decorator-Based Integration

```typescript
// src/decorators/cacheable.ts
import { CacheService } from '../cache/cache.service';

export function Cacheable(options: { ttlHours?: number } = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = (this as any).cache || CacheService.getInstance();

      const cacheKey = {
        method: propertyKey,
        args: args
      };

      return cache.fetch(
        cacheKey,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

// Usage
class LLMService {
  @Cacheable({ ttlHours: 24 })
  async query(prompt: string): Promise<string> {
    // Implementation
    return 'response...';
  }
}
```

### OpenAI Integration Example

```typescript
// src/services/openai-cached.service.ts
import { OpenAI } from 'openai';
import { CacheService } from '../cache/cache.service';

export class CachedOpenAIService {
  private openai = new OpenAI();
  private cache: CacheService;

  constructor(cacheService: CacheService) {
    this.cache = cacheService;
  }

  async chat(params: OpenAI.Chat.ChatCompletionCreateParams): Promise<string> {
    return this.cache.fetch(
      {
        model: params.model,
        messages: params.messages,
        temperature: params.temperature
      },
      async () => {
        const response = await this.openai.chat.completions.create(params);
        return response.choices[0]?.message.content || '';
      }
    );
  }

  async embed(input: string | string[]): Promise<number[][]> {
    return this.cache.fetch(
      { input },
      async () => {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input
        });
        return response.data.map(d => d.embedding);
      }
    );
  }
}
```

---

## Migration Path

### Phase 1: Evaluation (Week 1)

```typescript
// Minimal cache in test environment
const testCache = new LRUCache({
  max: 100,
  ttl: 600000  // 10 minutes
});

// Measure baseline metrics
// - API call latency
// - Query patterns
// - Cache hit rates
```

### Phase 2: Pilot (Week 2-3)

```typescript
// Single workflow with caching enabled
// Monitor:
// - Hit rate (target: 30%+)
// - Memory usage
// - Performance improvement
```

### Phase 3: Rollout (Week 4-8)

```typescript
// Progressive rollout to all LLM workflows
// Week 4: Critical paths only
// Week 5: 50% of workflows
// Week 6-8: 100% with monitoring
```

### Phase 4: Optimization (Week 8+)

```typescript
// Add semantic caching
// Tune configuration
// Add distributed caching if needed
```

---

## Troubleshooting

### Issue 1: Low Cache Hit Rate (< 20%)

**Diagnosis:**

```typescript
// Check if keys are deterministic
const key1 = objectKeyHash({ a: 1, b: 2 });
const key2 = objectKeyHash({ b: 2, a: 1 });
console.log(key1 === key2);  // Should be true
```

**Solutions:**
1. Verify using `safe-stable-stringify` (not `JSON.stringify`)
2. Check if prompts vary slightly (space differences, case sensitivity)
3. Consider semantic caching for variations
4. Normalize prompts before caching

### Issue 2: High Memory Usage

**Diagnosis:**

```typescript
// Check actual cache memory consumption
const metrics = cache.getMetrics();
console.log(`Size: ${metrics.cacheSize} items`);
console.log(`Memory: ${metrics.estimatedMemory} MB`);
```

**Solutions:**
1. Reduce `maxSize` limit
2. Reduce `ttl` for faster expiration
3. Implement `sizeCalculation` correctly
4. Add memory monitoring: `process.memoryUsage()`

### Issue 3: Stale Data

**Diagnosis:**

```typescript
// TTL items aren't deleted until accessed
// This is expected behavior
const cached = cache.get(key);  // Triggers TTL check
```

**Solutions:**
1. Use shorter TTL (24 hours instead of 30)
2. Implement active cache purging
3. Use external validation (check API for updates)
4. Version cache keys

### Issue 4: Cache Not Working in Tests

**Solution:**

```typescript
// Mock or provide clean cache instance for each test
beforeEach(() => {
  cache = new LRUCache({ max: 100 });
});

afterEach(() => {
  cache.clear();
});
```

### Issue 5: Race Conditions

**Diagnosis:**

```typescript
// ❌ Wrong: Manual lookup allows duplicates
if (!cache.has(key)) {
  const value = await expensiveOp();
  cache.set(key, value);
}

// ✅ Correct: fetch() deduplicates
const value = await cache.fetch(key, expensiveOp);
```

**Solution:**
Always use `fetch()` method instead of manual lookup + set.

### Issue 6: Keys Too Long

**Problem:** 64-char SHA-256 keys add overhead

**Solution:**

```typescript
// Use shorter hash (8 chars) for readability
const key = hash.digest('hex').substring(0, 8);

// Or use composite key with prefix
const key = `gpt4:${hash.digest('hex').substring(0, 8)}`;
```

---

## Performance Tuning Checklist

- [ ] Using `safe-stable-stringify` (not `JSON.stringify`)
- [ ] Using `fetch()` method (not manual lookup)
- [ ] `max` or `maxSize` configured
- [ ] Appropriate `ttl` set (24 hours for LLM responses)
- [ ] `sizeCalculation` implemented correctly
- [ ] Metrics collection enabled
- [ ] Hit rate > 30% (exact) or > 60% (semantic)
- [ ] Memory usage < budget
- [ ] Monitoring/alerting configured
- [ ] Cache warming for common queries

---

## Decision Flowchart

```
Start: Need to cache LLM responses?
│
├─ Single node, simple? → Strategy 1 (Minimal)
│
├─ Multiple nodes?
│  ├─ Yes → Strategy 3 (Multi-layer)
│  └─ No → Strategy 2 (Service-based)
│
├─ Hit rate < 30%?
│  ├─ Yes, add Semantic Caching
│  └─ No, optimize existing
│
├─ Memory limited?
│  ├─ Yes → Use maxSize, reduce maxItems
│  └─ No → Configure generously
│
└─ Ready for production? → Add monitoring, metrics, alerts
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-08

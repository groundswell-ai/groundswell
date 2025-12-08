# LRU Cache Research Summary

## Recommended Stack

```json
{
  "dependencies": {
    "lru-cache": "^10.0.0"
  }
}
```

## Key Patterns

### 1. Deterministic Cache Key Generation

```typescript
import { createHash } from 'node:crypto';

function deterministicStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  function stringify(val: unknown): string {
    if (val === null) return 'null';
    if (typeof val === 'string') return JSON.stringify(val);
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'undefined') return 'undefined';

    if (typeof val === 'object') {
      if (seen.has(val as object)) {
        throw new TypeError('Converting circular structure to JSON');
      }
      seen.add(val as object);

      let result: string;
      if (Array.isArray(val)) {
        result = '[' + val.map(stringify).join(',') + ']';
      } else {
        const keys = Object.keys(val as Record<string, unknown>).sort();
        const pairs = keys.map(k =>
          JSON.stringify(k) + ':' + stringify((val as Record<string, unknown>)[k])
        );
        result = '{' + pairs.join(',') + '}';
      }

      seen.delete(val as object);
      return result;
    }

    return String(val);
  }

  return stringify(value);
}

function generateCacheKey(data: unknown): string {
  const hash = createHash('sha256');
  const serialized = deterministicStringify(data);
  hash.update(serialized, 'utf8');
  return hash.digest('hex');
}
```

### 2. LRU Cache Implementation with lru-cache

```typescript
import LRU from 'lru-cache';

const cache = new LRU<string, CacheValue>({
  max: 1000,                    // Maximum number of items
  maxSize: 52428800,            // 50MB memory limit
  sizeCalculation: (entry, key) => {
    return JSON.stringify(entry).length;
  },
  ttl: 1000 * 60 * 60,         // 1 hour default TTL
  updateAgeOnGet: true,
  allowStale: false
});
```

### 3. Cache Interface (PRD Section 9.2)

```typescript
interface Cache {
  get(key: string): Promise<any | undefined>;
  set(key: string, value: any): Promise<void>;
  bust(key: string): Promise<void>;
  bustPrefix(prefix: string): Promise<void>;
}
```

### 4. Cache Key Fields (PRD Section 9.1)

SHA-256 of deterministic JSON encoding of:
- user message
- data
- system value
- model settings
- temperature
- tools (names sorted)
- mcps (names sorted)
- skills (names sorted)
- schema version/hash (from Zod responseFormat._def)

## Gotchas

1. **Non-deterministic JSON.stringify** - Must sort keys!
2. **Memory exhaustion** - Set both `max` and `maxSize`
3. **Stale data** - Include model version in cache key
4. **Circular references** - Handle with WeakSet tracking

## Sources

- https://www.npmjs.com/package/lru-cache
- https://nodejs.org/api/crypto.html
- https://www.npmjs.com/package/json-stringify-deterministic

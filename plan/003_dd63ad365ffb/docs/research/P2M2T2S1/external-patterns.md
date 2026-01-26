# External Research: Configuration and TTL Patterns

## Overview

This document summarizes external research on TypeScript configuration interface design patterns, TTL implementation patterns, and best practices from popular libraries.

## 1. TypeScript Configuration Interface Patterns

### 1.1 Discriminated Union Pattern for Implementation Selection

**Best Practice Pattern:**

```typescript
type StorageType = 'memory' | 'file' | 'redis';

interface BaseStorageConfig {
  type: StorageType;
  ttl?: number;
}

interface MemoryStorageConfig extends BaseStorageConfig {
  type: 'memory';
  maxSize?: number;
}

interface FileStorageConfig extends BaseStorageConfig {
  type: 'file';
  path: string;
  syncInterval?: number;
}

interface RedisStorageConfig extends BaseStorageConfig {
  type: 'redis';
  host: string;
  port: number;
  password?: string;
  db?: number;
}

type StorageConfig =
  | MemoryStorageConfig
  | FileStorageConfig
  | RedisStorageConfig;

// Type-safe factory function
function createStorage(config: StorageConfig): Storage {
  switch (config.type) {
    case 'memory':
      return new MemoryStorage(config.maxSize);
    case 'file':
      return new FileStorage(config.path, config.syncInterval);
    case 'redis':
      return new RedisStorage(config.host, config.port, config.password, config.db);
    default:
      const exhaustiveCheck: never = config;
      throw new Error(`Unknown storage type: ${exhaustiveCheck}`);
  }
}
```

**Key Benefits:**
- Compile-time type safety
- Exhaustive checking ensures all cases handled
- Clear error messages for missing cases

### 1.2 String Shorthand + Full Configuration Pattern

**Pattern 1: Union of String and Config Object**

```typescript
// Allow simple string
type StorageConfigSimple = 'memory' | 'file' | 'redis';

// Or full config
type StorageConfig = StorageConfigSimple | {
  type: StorageConfigSimple;
  // ... additional options
};

function normalizeStorageConfig(config: StorageConfig): NormalizedStorageConfig {
  if (typeof config === 'string') {
    return { type: config, ttl: 3600000 };
  }
  return { ttl: 3600000, ...config };
}
```

**Pattern 2: Factory with Smart Defaults**

```typescript
interface SessionStoreOptions {
  store?: 'memory' | 'file' | 'redis';
  storeOptions?: Record<string, unknown>;
  secret?: string;
  ttl?: number;
}

function createSessionStore(options: SessionStoreOptions = {}): SessionStore {
  const store = options.store || 'memory';
  const ttl = options.ttl || 3600000;

  switch (store) {
    case 'memory':
      return new MemorySessionStore({ maxSize: 1000, ttl });
    case 'file':
      return new FileSessionStore({
        path: (options.storeOptions as FileOptions)?.path || './sessions',
        ttl
      });
    case 'redis':
      return new RedisSessionStore({
        host: (options.storeOptions as RedisOptions)?.host || 'localhost',
        port: (options.storeOptions as RedisOptions)?.port || 6379,
        ttl
      });
  }
}
```

### 1.3 Popular Library Patterns

#### Express.js Pattern
```typescript
interface ExpressOptions {
  caseSensitive?: boolean;
  strictRouting?: boolean;
  etag?: string | boolean | { weak: boolean };
}
```
**Characteristics:** Simple options object with optional properties

#### TypeORM Pattern
```typescript
type ConnectionOptions =
  | MysqlConnectionOptions
  | PostgresConnectionOptions
  | SqliteConnectionOptions;

interface MysqlConnectionOptions {
  type: 'mysql';
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
}
```
**Characteristics:** Discriminated unions for connection types

#### Prisma Pattern
```typescript
interface PrismaClientOptions {
  datasources?: {
    db?: {
      url: EnvValue | string;
    };
  };
  log?: Array<LogLevel | QueryLog>;
  errorFormat?: 'pretty' | 'minimal' | 'colorless';
}
```
**Characteristics:** URL string + options override

#### Redis (ioredis) Pattern
```typescript
type RedisOptions = string | {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
};

const redis = new Redis(); // Uses defaults
const redis = new Redis('redis://localhost:6379');
const redis = new Redis({ host: 'localhost', port: 6379 });
```
**Characteristics:** Accepts both string URL and config object

### 1.4 TypeScript Utility Types for Configuration

```typescript
// Partial<T> - Makes all properties optional
interface AppConfig {
  apiUrl: string;
  timeout: number;
  retries: number;
}

function createConfig(userConfig: Partial<AppConfig>): AppConfig {
  return {
    apiUrl: '/api',
    timeout: 30000,
    retries: 3,
    ...userConfig
  };
}

// DeepPartial - Recursively make all properties optional
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

// Helper type for string or full config
type StringOrConfig<T extends string, C> = T | (C & { type: T });
```

## 2. Session TTL Implementation Patterns

### 2.1 How Popular Libraries Handle TTL

#### Express-Session
- **Property:** `maxAge` in cookie configuration
- **Unit:** **milliseconds**
- **Default:** No default (session expires when browser closes)
- **Location:** `cookie.maxAge` option

```typescript
app.use(session({
  cookie: {
    maxAge: 3600000 // 1 hour in milliseconds
  }
}));
```

#### connect-redis (Redis store for express-session)
- **Property:** `ttl` in store options
- **Unit:** **seconds** (different from cookie!)
- **Default:** Uses cookie's `maxAge` converted to seconds
- **Pattern:** Separate TTL for storage vs cookie

```typescript
const store = new RedisStore({
  client: redisClient,
  ttl: 86400, // 24 hours in seconds
  prefix: 'sess:'
});
```

#### node-cache
- **Property:** `stdTTL` in constructor
- **Unit:** **seconds**
- **Default:** 0 (no expiration)
- **Pattern:** Global default with per-key override

```typescript
const cache = new NodeCache({
  stdTTL: 100, // 100 seconds default
  checkperiod: 600 // Cleanup every 600 seconds
});

cache.set('key', 'value', 200); // Override with 200 seconds
```

### 2.2 Standard Units for Session TTL

| Library | Property | Unit | Context |
|---------|----------|------|---------|
| express-session | `maxAge` | **milliseconds** | Cookie expiration |
| connect-redis | `ttl` | **seconds** | Redis storage |
| node-cache | `stdTTL` | **seconds** | In-memory cache |
| cache-manager | `ttl` | **seconds** | Unified API |
| Redis | `EX` | **seconds** | Native command |
| Redis | `PX` | **milliseconds** | Native command |

**Pattern:**
- **Cookie-based:** Always milliseconds (web standard)
- **Cache/storage:** Mostly seconds (simpler numbers)
- **Consistency:** Use milliseconds in TypeScript/Node.js for consistency

### 2.3 Common Default Values

```typescript
const SESSION_TTL_DEFAULTS = {
  SHORT: 15 * 60 * 1000,       // 15 minutes (high security)
  MEDIUM: 1 * 60 * 60 * 1000,  // 1 hour (typical web app)
  LONG: 24 * 60 * 60 * 1000,   // 24 hours (remember me)
  WEEK: 7 * 24 * 60 * 60 * 1000 // 7 days (persistent)
};
```

### 2.4 TTL Validation Patterns

```typescript
class SessionStoreWithTTL {
  private static readonly MIN_TTL = 1000; // 1 second
  private static readonly MAX_TTL = 365 * 24 * 60 * 60 * 1000; // 1 year
  private static readonly DEFAULT_TTL = 3600000; // 1 hour

  validateTTL(ttl?: number): number {
    if (ttl === undefined) {
      return this.DEFAULT_TTL;
    }

    if (typeof ttl !== 'number' || isNaN(ttl)) {
      throw new Error('TTL must be a valid number');
    }

    if (ttl < this.MIN_TTL) {
      throw new Error(`TTL must be at least ${this.MIN_TTL}ms`);
    }

    if (ttl > this.MAX_TTL) {
      throw new Error(`TTL cannot exceed ${this.MAX_TTL}ms`);
    }

    return ttl;
  }
}
```

### 2.5 TTL Expiration vs Manual Cleanup

#### Automatic Expiration (Redis)
```typescript
class RedisSessionStore {
  async save(sessionId: string, data: any, ttl: number): Promise<void> {
    await this.client.set(
      `session:${sessionId}`,
      JSON.stringify(data),
      {
        EX: ttl, // Auto-expire after TTL seconds
        NX // Only set if not exists
      }
    );
    // No cleanup needed - Redis removes expired keys automatically
  }
}
```

#### Lazy Expiration (File Store)
```typescript
class FileSessionStore {
  async save(sessionId: string, data: any, ttl: number): Promise<void> {
    const sessionData = {
      data,
      expiresAt: Date.now() + ttl
    };
    await writeFile(this.getPath(sessionId), JSON.stringify(sessionData));
  }

  async get(sessionId: string): Promise<any> {
    const content = await readFile(this.getPath(sessionId), 'utf-8');
    const sessionData = JSON.parse(content);

    // Check expiration on access (lazy expiration)
    if (Date.now() > sessionData.expiresAt) {
      await this.delete(sessionId); // Clean up expired file
      return null;
    }

    return sessionData.data;
  }
}
```

#### Active Cleanup (Memory Store)
```typescript
class MemorySessionStore {
  private sessions = new Map<string, { data: any; expiresAt: number }>();
  private cleanupTimer: NodeJS.Timeout;

  constructor(ttl: number = 3600000, cleanupInterval: number = 60000) {
    // Periodic cleanup of expired sessions
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, { expiresAt }] of this.sessions) {
      if (now > expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.sessions.delete(key);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
```

#### Hybrid Approach (Recommended)
```typescript
class HybridTTLStore {
  private sessions = new Map<string, { data: any; expiresAt: number }>();
  private cleanupTimer: NodeJS.Timeout;

  constructor(ttl: number = 3600000, cleanupInterval: number = 300000) {
    // Cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  // Lazy expiration check on access
  async get(sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }

  // Active cleanup of expired sessions
  private cleanup(): void {
    const now = Date.now();
    for (const [key, { expiresAt }] of this.sessions) {
      if (now > expiresAt) {
        this.sessions.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
```

## 3. Recommended Implementation Pattern

### 3.1 Configuration Type Definition

```typescript
/**
 * Storage type discriminator
 */
type SessionStoreType = 'memory' | 'file' | 'redis';

/**
 * Base configuration shared by all storage types
 */
interface BaseSessionStoreConfig {
  /**
   * Time-to-live for sessions in milliseconds
   * @default 86400000 (24 hours)
   */
  ttl?: number;
}

/**
 * Memory storage configuration
 */
interface MemorySessionStoreConfig extends BaseSessionStoreConfig {
  type: 'memory';
  /**
   * Maximum number of sessions to store
   * @default 1000
   */
  maxSize?: number;
}

/**
 * File storage configuration
 */
interface FileSessionStoreConfig extends BaseSessionStoreConfig {
  type: 'file';
  /**
   * Directory path for session files
   * @default './sessions'
   */
  path?: string;
}

/**
 * Union type for all session store configurations
 */
type SessionStoreConfig =
  | MemorySessionStoreConfig
  | FileSessionStoreConfig;

/**
 * Accepts either simple string or full config
 */
type SessionStoreOptions = SessionStoreType | SessionStoreConfig;

/**
 * Default TTL presets for convenience
 */
export const SESSION_TTL = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;
```

### 3.2 Normalization Function

```typescript
function normalizeSessionStoreConfig(
  options: SessionStoreOptions = 'memory'
): SessionStoreConfig {
  const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  if (typeof options === 'string') {
    // Simple string shorthand
    switch (options) {
      case 'memory':
        return { type: 'memory', ttl: DEFAULT_TTL, maxSize: 1000 };
      case 'file':
        return { type: 'file', ttl: DEFAULT_TTL, path: './sessions' };
      case 'redis':
        throw new Error('Redis not yet implemented');
    }
  }

  // Full config object - apply defaults
  return { ttl: DEFAULT_TTL, ...options };
}
```

### 3.3 Factory Function

```typescript
export function createSessionStore<T>(
  options?: SessionStoreOptions
): SessionStore<T> {
  const config = normalizeSessionStoreConfig(options);

  switch (config.type) {
    case 'memory':
      return new MemorySessionStore<T>({
        maxSize: config.maxSize,
        ttl: config.ttl
      });

    case 'file':
      return new FileSessionStore<T>({
        path: config.path ?? './sessions',
        ttl: config.ttl
      });

    default:
      const _exhaustiveCheck: never = config;
      throw new Error(`Unknown storage type: ${_exhaustiveCheck}`);
  }
}
```

## 4. Key Best Practices Summary

1. **Use discriminated unions** for implementation selection
2. **Provide sensible defaults** - make the "easy path" work
3. **Support string shorthand** - allow `'memory'` in addition to full config
4. **Use JSDoc comments** - document defaults inline
5. **Provide constant presets** - like `SESSION_TTL.DAY`
6. **Normalize configuration** - single function applies all defaults
7. **Use factory pattern** - hide implementation details
8. **Type narrowing** - use switch statements with discriminated unions
9. **Exhaustive checks** - use `never` type to catch missing cases
10. **Clear error messages** - when required fields are missing

## 5. Sources

**Official Documentation:**
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Discriminated Unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html

**Library Documentation:**
- express-session: https://github.com/expressjs/session
- connect-redis: https://github.com/tj/connect-redis
- node-cache: https://github.com/node-cache/node-cache
- cache-manager: https://github.com/node-cache-manager/node-cache-manager

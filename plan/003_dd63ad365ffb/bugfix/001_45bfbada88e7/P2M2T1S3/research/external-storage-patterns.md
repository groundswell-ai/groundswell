# Research: Pluggable Storage Backend Patterns in TypeScript/JavaScript

**Document ID:** P2.M2.T1.S3.RESEARCH.001
**Date:** 2026-01-26
**Purpose:** Research external patterns for integrating SessionStore into AnthropicProvider
**Target:** PRP creation for session persistence with pluggable storage backends

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Express Session Store Pattern](#express-session-store-pattern)
3. [ORM Adapter Patterns](#orm-adapter-patterns)
4. [Cache Library Patterns](#cache-library-patterns)
5. [Dependency Injection Patterns](#dependency-injection-patterns)
6. [Factory Patterns](#factory-patterns)
7. [Best Practices Summary](#best-practices-summary)
8. [Common Pitfalls](#common-pitfalls)
9. [Application to SessionStore Integration](#application-to-sessionstore-integration)

---

## Executive Summary

This research analyzes pluggable storage backend patterns from established TypeScript/JavaScript libraries to inform the integration of SessionStore into AnthropicProvider. Key findings:

**Primary Pattern:** Interface-based abstraction with constructor injection and factory-based instantiation

**Key Libraries Analyzed:**
- express-session (session management)
- connect-redis (Redis adapter for express-session)
- TypeORM (database abstraction)
- Prisma (ORM with adapters)
- node-cache & ioredis (caching backends)

**Recommended Approach:**
1. Define storage interface (already done: `SessionStore<T>`)
2. Constructor injection with default implementation
3. Factory pattern for complex instantiation
4. Configuration-based store selection

---

## 1. Express Session Store Pattern

### 1.1 Core Pattern: Base Class Extension

**Source:** [express-session GitHub](https://github.com/expressjs/session)

Express-session uses a base `Store` class that all session stores extend:

```typescript
// express-session pattern (simplified)
import { Store } from 'express-session';

interface SessionData {
  cookie: { maxAge: number };
  [key: string]: any;
}

interface StoreOptions {
  // Store-specific options
}

class CustomStore extends Store {
  constructor(options: StoreOptions = {}) {
    super(options);
    this.options = options;
  }

  // Required methods
  get(sid: string, callback: (err: any, session?: SessionData) => void): void {
    // Retrieve session by session ID
  }

  set(sid: string, session: SessionData, callback: (err?: any) => void): void {
    // Store session data
  }

  destroy(sid: string, callback: (err?: any) => void): void {
    // Delete session
  }

  // Optional methods
  touch(sid: string, session: SessionData, callback: (err?: any) => void): void {
    // Update session expiration (recommended)
  }

  all(callback: (err: any, obj?: SessionData[]) => void): void {
    // Get all sessions (optional)
  }

  clear(callback: (err?: any) => void): void {
    // Delete all sessions (optional)
  }

  length(callback: (err: any, length?: number) => void): void {
    // Get session count (optional)
  }
}
```

**Key Characteristics:**
- **Callback-based:** All operations use callbacks (async/await compatible)
- **Inheritance:** Stores extend base `Store` class
- **Optional methods:** Core CRUD required, convenience methods optional
- **Error-first callbacks:** Standard Node.js pattern
- **Serialization:** Sessions auto-serialized to JSON

### 1.2 Store Registration Pattern

**Usage Pattern:**

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import FileStore from 'session-file-store';

// Pattern 1: Direct instantiation (most common)
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'keyboard-cat',
  resave: false,
  saveUninitialized: false
}));

// Pattern 2: Factory function
app.use(session({
  store: RedisStore.create({ client: redisClient }),
  secret: 'keyboard-cat'
}));
```

**Best Practices from express-session:**

1. **Constructor Injection:** Store instance passed to session middleware
2. **Default Store:** MemoryStore (development-only) is default
3. **Backward Compatibility:** New stores don't break existing code
4. **Interface Contract:** All stores implement same methods
5. **Error Handling:** Stores must handle errors gracefully

### 1.3 connect-redis Implementation

**Source:** [connect-redis GitHub](https://github.com/tj/connect-redis)

```typescript
// connect-redis pattern
import { createClient } from 'redis';
import RedisStore from 'connect-redis';

const redisClient = createClient({
  url: 'redis://localhost:6379'
});

await redisClient.connect();

// Constructor injection
const store = new RedisStore({
  client: redisClient,
  prefix: 'sess:',
  ttl: 86400,
  disableTouch: false
});

// Factory pattern (alternative)
const store = RedisStore.create({
  client: redisClient,
  prefix: 'sess:'
});

app.use(session({
  store: store,
  secret: 'keyboard-cat'
}));
```

**Key Design Decisions:**

1. **Client Injection:** Redis client passed to store, not created internally
2. **Constructor + Factory:** Both patterns supported
3. **Configuration Object:** Single options parameter
4. **Connection Management:** Store doesn't manage client lifecycle
5. **Prefix Support:** Keyspaced session keys

### 1.4 Evaluation for SessionStore

**Similarities to Current Implementation:**
- ✅ Interface-based design (SessionStore<T>)
- ✅ CRUD operations (save, load, delete, list)
- ✅ Async operations (Promise-based)
- ✅ Multiple implementations (Memory, File, Redis)

**Differences:**
- ❌ express-session uses callbacks, SessionStore uses Promises (modern improvement)
- ❌ express-session uses inheritance, SessionStore uses interface implementation (flexible)
- ❌ express-session serializes automatically, SessionStore requires manual serialization

**Recommendation:** Adopt express-session's **constructor injection pattern** for AnthropicProvider integration.

---

## 2. ORM Adapter Patterns

### 2.1 TypeORM Repository Pattern

**Source:** [TypeORM Documentation](https://typeorm.io/)

TypeORM uses repository pattern with pluggable database drivers:

```typescript
// TypeORM pattern
import { EntityRepository, Repository } from 'typeorm';
import { DataSource } from 'typeorm';

// Abstract repository interface
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  delete(id: string): Promise<void>;
}

// PostgreSQL implementation
class PostgresUserRepository implements IUserRepository {
  constructor(private repository: Repository<UserEntity>) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async create(data: CreateUserDto): Promise<User> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}

// MySQL implementation
class MySQLUserRepository implements IUserRepository {
  constructor(private repository: Repository<UserEntity>) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async create(data: CreateUserDto): Promise<User> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }
}

// Service layer uses interface
class UserService {
  constructor(private userRepository: IUserRepository) {}

  async getUser(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}

// Dependency injection
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  entities: [UserEntity],
  synchronize: true
});

const userRepository = new PostgresUserRepository(
  dataSource.getRepository(UserEntity)
);

const userService = new UserService(userRepository);
```

**Key Patterns:**

1. **Interface Segregation:** Repositories implement domain-specific interfaces
2. **Constructor Injection:** Dependencies injected via constructor
3. **Adapter Pattern:** Database-specific implementations behind interface
4. **Service Layer:** Business logic depends on interfaces, not implementations
5. **DataSource Configuration:** Connection details separate from repository

### 2.2 TypeORM DataSource Pattern

**Configuration-based driver selection:**

```typescript
// typeorm.config.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: process.env.DB_TYPE as 'postgres' | 'mysql' | 'sqlite',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Post, Comment],
  synchronize: process.env.NODE_ENV !== 'production'
});

// Factory pattern for multiple databases
export function createDataSource(type: 'postgres' | 'mysql' | 'sqlite') {
  const config = {
    postgres: { type: 'postgres', host: 'localhost', port: 5432 },
    mysql: { type: 'mysql', host: 'localhost', port: 3306 },
    sqlite: { type: 'sqlite', database: './data.sqlite' }
  };

  return new DataSource(config[type]);
}
```

**Best Practices:**

1. **Environment-based Configuration:** DB type from environment variables
2. **Factory Function:** Centralized datasource creation
3. **Single DataSource:** One datasource per application
4. **Connection Pooling:** Managed by datasource
5. **Entity Registration:** Entities registered once at startup

### 2.3 Prisma Client Pattern

**Source:** [Prisma Documentation](https://www.prisma.io/docs)

```typescript
// Prisma pattern (code generation)
import { PrismaClient } from '@prisma/client';

// Singleton pattern
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Direct usage (no repository layer needed)
async function getUser(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

// With adapter pattern (for testing/abstraction)
interface IPrismaAdapter {
  user: {
    findUnique(args: { where: { id: string } }): Promise<User | null>;
    create(args: { data: CreateUserDto }): Promise<User>;
  };
}

class PrismaAdapter implements IPrismaAdapter {
  user = {
    findUnique: (args) => prisma.user.findUnique(args),
    create: (args) => prisma.user.create(args)
  };
}

// Mock adapter for testing
class MockPrismaAdapter implements IPrismaAdapter {
  private users: Map<string, User> = new Map();

  user = {
    findUnique: async ({ where }) => this.users.get(where.id) || null,
    create: async ({ data }) => {
      const user = { ...data, id: crypto.randomUUID() };
      this.users.set(user.id, user);
      return user;
    }
  };
}
```

**Key Patterns:**

1. **Singleton Client:** Single PrismaClient instance
2. **Generated API:** Type-safe database access
3. **Adapter Pattern:** Optional abstraction layer for testing
4. **Connection Pooling:** Built-in client management
5. **Transaction Support:** Prisma-level transaction handling

### 2.4 Evaluation for SessionStore

**Applicable Patterns:**

1. ✅ **Interface-based abstraction** - Already implemented in SessionStore
2. ✅ **Constructor injection** - Should be used in AnthropicProvider
3. ✅ **Factory pattern** - Recommended for store creation
4. ✅ **Singleton pattern** - Consider for FileSessionStore directory management
5. ❌ **Code generation** - Not applicable (no schema)

**Recommendation:**
- Use TypeORM-style **constructor injection** for AnthropicProvider
- Implement **factory function** for store creation (similar to createDataSource)
- Consider **singleton pattern** if FileSessionStore needs shared directory state

---

## 3. Cache Library Patterns

### 3.1 node-cache Pattern

**Source:** [node-cache GitHub](https://github.com/node-cache/node-cache)

In-memory caching with simple API:

```typescript
import NodeCache from 'node-cache';

// Constructor with configuration
const cache = new NodeCache({
  stdTTL: 100, // Default TTL in seconds
  checkperiod: 600, // Delete expired keys every 600 seconds
  useClones: true, // Clone data before returning
  deleteOnExpire: true,
  maxKeys: -1 // Unlimited keys
});

// CRUD operations
cache.set('key', { data: 'value' });
cache.set('key', { data: 'value' }, 100); // With TTL

const value = cache.get('key'); // Returns value or undefined
const value2 = cache.get('key', true); // Return tuple [value, found]

cache.del('key');
cache.delAll(); // Clear all

// Advanced operations
cache.ttl('key', 200); // Update TTL
cache.getTtl('key'); // Get remaining TTL
cache.keys(); // Get all keys
cache.has('key'); // Check existence

// Statistics
cache.getStats(); // { keys: 10, hits: 100, misses: 5, ksize: 1024, vsize: 2048 }
cache.flushAll(); // Clear all and reset stats
```

**Key Patterns:**

1. **Constructor Configuration:** All options in constructor
2. **Synchronous API:** No async operations (in-memory)
3. **TTL Support:** Built-in expiration
4. **Statistics:** Built-in metrics
5. **Clone Option:** Optional deep cloning for safety

### 3.2 cache-manager Pattern

**Source:** [cache-manager GitHub](https://github.com/node-cache-manager/node-cache-manager)

Pluggable cache backends with unified API:

```typescript
import cacheManager from 'cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { memoryStore } from 'cache-manager';

// Single store
const cache = cacheManager.caching({
  store: memoryStore,
  ttl: 100, // Default TTL
  max: 1000 // Max items (memory store only)
});

await cache.set('key', { data: 'value' });
const value = await cache.get('key');

// Multi-tier caching (cascading)
const multiCache = cacheManager.multiCaching([
  memoryStore,
  redisStore
]);

await multiCache.set('key', { data: 'value' });
// Tries memory first, then redis

// Factory pattern for store creation
const redisCache = await cacheManager.caching({
  store: redisStore,
  host: 'localhost',
  port: 6379,
  ttl: 600,
  db: 0,
  password: 'auth'
});

// Custom store implementation
import { Store } from 'cache-manager';

class CustomStore extends Store {
  constructor(options: any) {
    super(options);
  }

  async get<T>(key: string): Promise<T | undefined> {
    // Custom get logic
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Custom set logic
  }

  async del(key: string): Promise<void> {
    // Custom delete logic
  }

  async reset(): Promise<void> {
    // Clear all
  }
}

// Use custom store
const customCache = cacheManager.caching({
  store: CustomStore,
  option1: 'value1'
});
```

**Key Patterns:**

1. **Factory Function:** `caching()` creates store instances
2. **Unified Interface:** All stores implement get/set/del/reset
3. **Async/Promise-based:** All operations async
4. **Multi-tier Caching:** Cascading fallback strategy
5. **Extensibility:** Custom stores via inheritance

### 3.3 ioredis Pattern

**Source:** [ioredis GitHub](https://github.com/luin/ioredis)

Redis client with connection management:

```typescript
import Redis from 'ioredis';

// Constructor with configuration
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0,
  password: 'auth',
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true
});

// Event-driven connection handling
redis.on('connect', () => console.log('Connected'));
redis.on('error', (err) => console.error('Error:', err));
redis.on('close', () => console.log('Connection closed'));
redis.on('reconnecting', (delay) => console.log(`Reconnecting in ${delay}ms`));

// Redis operations
await redis.set('key', 'value');
await redis.set('key', 'value', 'EX', 60); // With 60s expiration
const value = await redis.get('key');
await redis.del('key');

// Connection management
await redis.quit(); // Graceful shutdown
await redis.disconnect(); // Force close

// Cluster support
const cluster = new Redis.Cluster([
  { host: '127.0.0.1', port: 7000 },
  { host: '127.0.0.1', port: 7001 },
  { host: '127.0.0.1', port: 7002 }
]);
```

**Key Patterns:**

1. **Constructor Injection:** Connection config in constructor
2. **Connection Lifecycle:** Explicit connect/disconnect
3. **Event Emitters:** Connection state events
4. **Retry Strategy:** Configurable retry logic
5. **Offline Queue:** Commands queued while disconnected

### 3.4 Evaluation for SessionStore

**Applicable Patterns:**

1. ✅ **Factory Function** - cache-manager's `caching()` pattern is ideal
2. ✅ **Async API** - All stores use Promises (already implemented)
3. ✅ **TTL Support** - Built-in expiration (should add to SessionStore)
4. ❌ **Synchronous API** - Not applicable (SessionStore is async)
5. ⚠️ **Connection Management** - May need for RedisSessionStore

**Recommendation:**

1. Implement **factory function** for store creation (cache-manager style)
2. Add **TTL support** to SessionStore interface
3. Add **connection lifecycle** methods to RedisSessionStore interface
4. Consider **multi-tier caching** for session persistence fallback

---

## 4. Dependency Injection Patterns

### 4.1 Constructor Injection (Recommended)

**Most common and recommended pattern:**

```typescript
// Interface
interface IStorage<T> {
  save(id: string, data: T): Promise<void>;
  load(id: string): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Implementation
class FileStorage<T> implements IStorage<T> {
  constructor(private directory: string) {}

  async save(id: string, data: T): Promise<void> {
    // Implementation
  }

  async load(id: string): Promise<T | null> {
    // Implementation
  }

  async delete(id: string): Promise<boolean> {
    // Implementation
  }
}

// Consumer
class Service {
  constructor(private storage: IStorage<MyData>) {}

  async process(id: string) {
    const data = await this.storage.load(id);
    // Process data
    await this.storage.save(id, data);
  }
}

// Dependency injection
const storage = new FileStorage<MyData>('./data');
const service = new Service(storage);
```

**Advantages:**
- ✅ Explicit dependencies (clear from constructor)
- ✅ Immutable (can't change after construction)
- ✅ Testable (easy to mock)
- ✅ Type-safe (TypeScript validates)

**Disadvantages:**
- ❌ Constructor can get large with many dependencies

### 4.2 Property Injection (Not Recommended)

```typescript
class Service {
  storage?: IStorage<MyData>;

  async process(id: string) {
    if (!this.storage) {
      throw new Error('Storage not set');
    }
    const data = await this.storage.load(id);
  }
}

const service = new Service();
service.storage = new FileStorage('./data');
```

**Advantages:**
- ✅ Flexible (can change at runtime)

**Disadvantages:**
- ❌ Optional dependencies (runtime errors)
- ❌ Not type-safe (can forget to set)
- ❌ Harder to test

**Verdict:** Not recommended for SessionStore integration

### 4.3 Factory Injection (Complex Scenarios)

```typescript
// Factory interface
interface IStorageFactory<T> {
  create(config: StorageConfig): IStorage<T>;
}

// Factory implementation
class StorageFactory<T> implements IStorageFactory<T> {
  create(config: StorageConfig): IStorage<T> {
    switch (config.type) {
      case 'memory':
        return new MemoryStorage<T>();
      case 'file':
        return new FileStorage<T>(config.directory);
      case 'redis':
        return new RedisStorage<T>(config.redis);
      default:
        throw new Error(`Unknown storage type: ${config.type}`);
    }
  }
}

// Consumer with factory
class Service {
  constructor(
    private storageFactory: IStorageFactory<MyData>,
    private config: StorageConfig
  ) {}

  async process(id: string) {
    const storage = this.storageFactory.create(this.config);
    const data = await storage.load(id);
    await storage.save(id, data);
  }
}

// Usage
const factory = new StorageFactory<MyData>();
const service = new Service(factory, { type: 'file', directory: './data' });
```

**Advantages:**
- ✅ Flexible (can create different instances)
- ✅ Configurable (storage type from config)
- ✅ Lazy creation (create only when needed)

**Disadvantages:**
- ❌ More complex than constructor injection
- ❌ May create unnecessary instances

**Verdict:** Good for configuration-based store selection

### 4.4 DI Container Patterns (Overkill for this use case)

**InversifyJS example:**

```typescript
import { injectable, inject, Container } from 'inversify';

const TYPES = {
  IStorage: Symbol.for('IStorage'),
  IService: Symbol.for('IService')
};

@injectable()
class FileStorage<T> implements IStorage<T> {
  constructor(@inject(TYPES.Config) private config: StorageConfig) {}
  // Implementation
}

@injectable()
class Service {
  constructor(@inject(TYPES.IStorage) private storage: IStorage<MyData>) {}
  // Implementation
}

const container = new Container();
container.bind<IStorage<MyData>>(TYPES.IStorage).to(FileStorage);
container.bind<IService>(TYPES.IService).to(Service);

const service = container.get<IService>(TYPES.IService);
```

**Advantages:**
- ✅ Automatic dependency resolution
- ✅ Lifecycle management
- ✅ Scoped dependencies

**Disadvantages:**
- ❌ Heavy dependency (adds library)
- ❌ Over-engineering for simple cases
- ❌ Learning curve

**Verdict:** Not recommended for SessionStore (too complex)

### 4.5 Evaluation for SessionStore

**Recommended Pattern:** Constructor Injection with Factory Function

```typescript
// Pattern for AnthropicProvider
class AnthropicProvider {
  private sessionStore: SessionStore<SessionState>;

  constructor(options: ProviderOptions = {}) {
    // Default implementation
    this.sessionStore = options.sessionStore ?? new MemorySessionStore();
  }

  async initialize(config: ProviderConfig) {
    // Use sessionStore
    await this.sessionStore.save('session-id', sessionState);
  }
}

// Alternative: Factory injection
class AnthropicProvider {
  constructor(
    private sessionStoreFactory: SessionStoreFactory<SessionState>,
    private config: ProviderConfig
  ) {}

  async initialize() {
    const store = this.sessionStoreFactory.create(this.config.sessionStore);
    await store.save('session-id', sessionState);
  }
}

// Recommended approach: Constructor with factory function
function createSessionStore(config: SessionStoreConfig): SessionStore<SessionState> {
  switch (config.type) {
    case 'memory':
      return new MemorySessionStore();
    case 'file':
      return new FileSessionStore(config.directory);
    case 'redis':
      return new RedisSessionStore(config.redis);
    default:
      return new MemorySessionStore(); // Default
  }
}

class AnthropicProvider {
  constructor(options: ProviderOptions = {}) {
    const config = options.sessionStore ?? { type: 'memory' };
    this.sessionStore = createSessionStore(config);
  }
}
```

---

## 5. Factory Patterns

### 5.1 Simple Factory Function

**Recommended for SessionStore:**

```typescript
// Factory function
type SessionStoreType = 'memory' | 'file' | 'redis';

interface SessionStoreConfig {
  type: SessionStoreType;
  directory?: string; // For file store
  redis?: RedisConfig; // For redis store
}

function createSessionStore(
  config: SessionStoreConfig = { type: 'memory' }
): SessionStore<SessionState> {
  switch (config.type) {
    case 'memory':
      return new MemorySessionStore();

    case 'file':
      if (!config.directory) {
        throw new Error('File store requires directory option');
      }
      return new FileSessionStore(config.directory);

    case 'redis':
      if (!config.redis) {
        throw new Error('Redis store requires redis config');
      }
      return new RedisSessionStore(config.redis);

    default:
      // Exhaustive check (TypeScript will error if missing case)
      const _exhaustive: never = config;
      throw new Error(`Unknown store type: ${_exhaustive}`);
  }
}

// Usage
const memoryStore = createSessionStore({ type: 'memory' });
const fileStore = createSessionStore({ type: 'file', directory: './sessions' });
const redisStore = createSessionStore({ type: 'redis', redis: { host: 'localhost' } });
```

**Advantages:**
- ✅ Simple and clear
- ✅ Centralized store creation logic
- ✅ Easy to add new store types
- ✅ Type-safe with exhaustive checks

### 5.2 Abstract Factory Pattern

**For complex scenarios with multiple related objects:**

```typescript
// Abstract factory interface
interface ISessionStoreFactory {
  createStore(): SessionStore<SessionState>;
  createSerializer(): SessionSerializer;
}

// Memory store factory
class MemoryStoreFactory implements ISessionStoreFactory {
  createStore(): SessionStore<SessionState> {
    return new MemorySessionStore();
  }

  createSerializer(): SessionSerializer {
    return new IdentitySerializer();
  }
}

// File store factory
class FileStoreFactory implements ISessionStoreFactory {
  constructor(private config: FileStoreConfig) {}

  createStore(): SessionStore<SessionState> {
    return new FileSessionStore(this.config.directory);
  }

  createSerializer(): SessionSerializer {
    return new JSONSerializer();
  }
}

// Client code
class SessionManager {
  constructor(private factory: ISessionStoreFactory) {}

  initialize() {
    const store = this.factory.createStore();
    const serializer = this.factory.createSerializer();
    // Use store and serializer
  }
}

// Usage
const factory = new FileStoreFactory({ directory: './sessions' });
const manager = new SessionManager(factory);
manager.initialize();
```

**Advantages:**
- ✅ Creates families of related objects
- ✅ Consistent objects from same factory
- ✅ Easy to swap entire families

**Disadvantages:**
- ❌ More complex than simple factory
- ❌ Overkill for single object creation

**Verdict:** Not needed for SessionStore (simple factory sufficient)

### 5.3 Builder Pattern

**For complex object construction:**

```typescript
class SessionStoreBuilder {
  private config: SessionStoreConfig = {
    type: 'memory'
  };

  withType(type: SessionStoreType): this {
    this.config.type = type;
    return this;
  }

  withDirectory(directory: string): this {
    this.config.directory = directory;
    return this;
  }

  withRedis(redis: RedisConfig): this {
    this.config.redis = redis;
    return this;
  }

  build(): SessionStore<SessionState> {
    return createSessionStore(this.config);
  }
}

// Usage
const store = new SessionStoreBuilder()
  .withType('file')
  .withDirectory('./sessions')
  .build();
```

**Advantages:**
- ✅ Fluent API
- ✅ Clear parameter names
- ✅ Optional parameters clear

**Disadvantages:**
- ❌ More verbose than simple config object
- ❌ Extra class to maintain

**Verdict:** Optional (config object is sufficient)

### 5.4 Evaluation for SessionStore

**Recommended:** Simple Factory Function

```typescript
// Recommended pattern
function createSessionStore(config?: SessionStoreConfig): SessionStore<SessionState> {
  const actualConfig = config ?? { type: 'memory' };

  switch (actualConfig.type) {
    case 'memory': return new MemorySessionStore();
    case 'file': return new FileSessionStore(actualConfig.directory);
    case 'redis': return new RedisSessionStore(actualConfig.redis);
  }
}
```

**Reasoning:**
- Simple enough for single object creation
- Type-safe with discriminated unions
- Easy to extend with new store types
- No need for abstract factory (single object)
- Builder pattern overkill (config object sufficient)

---

## 6. Best Practices Summary

### 6.1 Interface Design

**DO:**
- ✅ Use generic interfaces for type flexibility: `SessionStore<T>`
- ✅ Define all CRUD operations clearly
- ✅ Use async/await for I/O operations
- ✅ Return consistent types (Promise<T> for success, Promise<null> for not found)
- ✅ Document error conditions in JSDoc

**DON'T:**
- ❌ Mix callbacks and Promises
- ❌ Use synchronous operations for I/O
- ❌ Return undefined (use null for missing values)
- ❌ Throw for expected conditions (use null return)

### 6.2 Constructor Injection

**DO:**
- ✅ Inject dependencies via constructor
- ✅ Provide sensible defaults
- ✅ Use optional parameters with `??` operator
- ✅ Make dependencies readonly
- ✅ Use interface types, not concrete classes

**Example:**
```typescript
class AnthropicProvider {
  readonly sessionStore: SessionStore<SessionState>;

  constructor(options: ProviderOptions = {}) {
    this.sessionStore = options.sessionStore ?? new MemorySessionStore();
  }
}
```

**DON'T:**
- ❌ Use property injection
- ❌ Make dependencies mutable
- ❌ Require all dependencies (provide defaults)
- ❌ Use concrete class types (use interfaces)

### 6.3 Factory Functions

**DO:**
- ✅ Create factory functions for complex instantiation
- ✅ Use discriminated unions for type safety
- ✅ Validate required configuration parameters
- ✅ Throw clear errors for invalid config
- ✅ Export factory alongside implementations

**Example:**
```typescript
export function createSessionStore(
  config: SessionStoreConfig = { type: 'memory' }
): SessionStore<SessionState> {
  switch (config.type) {
    case 'memory': return new MemorySessionStore();
    case 'file':
      if (!config.directory) throw new Error('directory required');
      return new FileSessionStore(config.directory);
  }
}
```

**DON'T:**
- ❌ Create factories for simple objects (use constructors)
- ❌ Use magic strings (use discriminated unions)
- ❌ Ignore invalid config (fail fast)
- ❌ Return different types (use interface return type)

### 6.4 Configuration Objects

**DO:**
- ✅ Use single config object parameter
- ✅ Support partial config with defaults
- ✅ Discriminate by type field
- ✅ Make optional fields explicit with `?`
- ✅ Provide config type inference

**Example:**
```typescript
interface BaseSessionStoreConfig {
  ttl?: number;
}

interface MemoryStoreConfig extends BaseSessionStoreConfig {
  type: 'memory';
}

interface FileStoreConfig extends BaseSessionStoreConfig {
  type: 'file';
  directory: string;
}

type SessionStoreConfig = MemoryStoreConfig | FileStoreConfig;
```

**DON'T:**
- ❌ Use multiple parameters (use single config object)
- ❌ Mix unrelated options (group by store type)
- ❌ Make all fields required (use sensible defaults)
- ❌ Use `any` type (use discriminated unions)

### 6.5 Error Handling

**DO:**
- ✅ Throw descriptive errors
- ✅ Include context in error messages
- ✅ Use custom error types for domain errors
- ✅ Document error conditions
- ✅ Handle expected errors gracefully

**Example:**
```typescript
export class SessionStoreError extends Error {
  constructor(
    message: string,
    public operation: string,
    public sessionId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'SessionStoreError';
  }
}

// Usage
async load(sessionId: string): Promise<T | null> {
  try {
    return await this.internalLoad(sessionId);
  } catch (error) {
    throw new SessionStoreError(
      'Failed to load session',
      'load',
      sessionId,
      error as Error
    );
  }
}
```

**DON'T:**
- ❌ Throw generic Error (use custom types)
- ❌ Lose error context (chain errors)
- ❌ Crash on expected errors (handle gracefully)
- ❌ Return errors (use exceptions)

### 6.6 Backward Compatibility

**DO:**
- ✅ Provide default implementations
- ✅ Make new features optional
- ✅ Deprecate old APIs gracefully
- ✅ Maintain existing behavior
- ✅ Document migration paths

**Example:**
```typescript
class AnthropicProvider {
  constructor(options: ProviderOptions = {}) {
    // Backward compatible: defaults to in-memory
    this.sessionStore = options.sessionStore ?? new MemorySessionStore();
  }
}

// Old code still works
const provider = new AnthropicProvider();

// New code can customize
const provider = new AnthropicProvider({
  sessionStore: new FileSessionStore('./sessions')
});
```

**DON'T:**
- ❌ Break existing APIs
- ❌ Remove old features immediately (deprecate first)
- ❌ Make required changes to existing code
- ❌ Change default behavior unexpectedly

### 6.7 Testing

**DO:**
- ✅ Inject mock stores for testing
- ✅ Create in-memory test implementations
- ✅ Test all store implementations
- ✅ Test error conditions
- ✅ Use interface types in tests

**Example:**
```typescript
// Mock store for testing
class MockSessionStore<T> implements SessionStore<T> {
  private data = new Map<string, T>();

  async save(id: string, value: T): Promise<void> {
    this.data.set(id, value);
  }

  async load(id: string): Promise<T | null> {
    return this.data.get(id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id);
  }

  async list(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async has(id: string): Promise<boolean> {
    return this.data.has(id);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

// Test with mock
const mockStore = new MockSessionStore<SessionState>();
const provider = new AnthropicProvider({ sessionStore: mockStore });
```

**DON'T:**
- ❌ Test with real filesystem/Redis in unit tests
- ❌ Create production-only stores in tests
- ❌ Skip error path testing
- ❌ Use concrete types (use interfaces)

---

## 7. Common Pitfalls

### 7.1 Blocking the Event Loop

**Pitfall:** Synchronous file operations

```typescript
// BAD: Blocks event loop
class BadFileStore {
  save(id: string, data: any) {
    fs.writeFileSync(`${id}.json`, JSON.stringify(data)); // Blocking!
  }
}

// GOOD: Async operations
class GoodFileStore {
  async save(id: string, data: any) {
    await fs.promises.writeFile(`${id}.json`, JSON.stringify(data));
  }
}
```

### 7.2 Race Conditions

**Pitfall:** Check-then-act race conditions

```typescript
// BAD: Race condition
async saveIfNotExists(id: string, data: any) {
  if (!this.has(id)) {  // ← Another process might create here
    await this.save(id, data);
  }
}

// GOOD: Use atomic operations
async saveIfNotExists(id: string, data: any) {
  try {
    await this.save(id, data);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
```

### 7.3 Memory Leaks

**Pitfall:** Unbounded caches

```typescript
// BAD: Unbounded growth
class BadMemoryStore {
  private cache = new Map<string, any>();

  async set(key: string, value: any) {
    this.cache.set(key, value); // Never expires
  }
}

// GOOD: TTL and size limits
class GoodMemoryStore {
  private cache = new Map<string, { value: any, expires: number }>();

  async set(key: string, value: any, ttl = 3600000) {
    this.cache.set(key, { value, expires: Date.now() + ttl });
    this.cleanup();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, { expires }] of this.cache) {
      if (expires < now) this.cache.delete(key);
    }
  }
}
```

### 7.4 Circular Dependencies

**Pitfall:** Store depends on Provider, Provider depends on Store

```typescript
// BAD: Circular dependency
class AnthropicProvider {
  constructor(store: SessionStore) {
    store.setProvider(this); // ← Circular!
  }
}

// GOOD: Store is independent
class AnthropicProvider {
  constructor(private store: SessionStore) {}
}
```

### 7.5 Serialization Issues

**Pitfall:** Non-serializable data

```typescript
// BAD: Crashes on functions, circular refs
class BadFileStore {
  async save(id: string, data: any) {
    const json = JSON.stringify(data); // ← Crash on functions/cycles
    await fs.writeFile(`${id}.json`, json);
  }
}

// GOOD: Handle serialization
class GoodFileStore {
  async save(id: string, data: any) {
    try {
      const json = JSON.stringify(data, (key, value) => {
        // Skip functions
        if (typeof value === 'function') return undefined;
        // Handle circular refs
        if (value instanceof Set) return Array.from(value);
        return value;
      });
      await fs.writeFile(`${id}.json`, json);
    } catch (error) {
      throw new SerializationError('Failed to serialize session', error);
    }
  }
}
```

### 7.6 Forgotten Error Handling

**Pitfall:** Swallowed errors

```typescript
// BAD: Errors swallowed
store.save(id, data); // No await, error lost

// GOOD: Handle errors
try {
  await store.save(id, data);
} catch (error) {
  logger.error('Failed to save session', error);
  throw new SessionStoreError('Save failed', 'save', id, error);
}
```

### 7.7 Tight Coupling

**Pitfall:** Concrete class dependencies

```typescript
// BAD: Tight coupling
class AnthropicProvider {
  constructor(private store: FileSessionStore) {} // ← Concrete type
}

// GOOD: Loose coupling
class AnthropicProvider {
  constructor(private store: SessionStore) {} // ← Interface
}
```

---

## 8. Application to SessionStore Integration

### 8.1 Recommended Integration Pattern

Based on research, here's the recommended pattern for integrating SessionStore into AnthropicProvider:

```typescript
// 1. Define configuration types
type SessionStoreType = 'memory' | 'file' | 'redis';

interface BaseSessionStoreConfig {
  ttl?: number;
}

interface MemoryStoreConfig extends BaseSessionStoreConfig {
  type: 'memory';
}

interface FileStoreConfig extends BaseSessionStoreConfig {
  type: 'file';
  directory?: string;
}

interface RedisStoreConfig extends BaseSessionStoreConfig {
  type: 'redis';
  host?: string;
  port?: number;
  db?: number;
  password?: string;
}

type SessionStoreConfig =
  | MemoryStoreConfig
  | FileStoreConfig
  | RedisStoreConfig;

// 2. Factory function (export from session-store.ts)
export function createSessionStore(
  config: SessionStoreConfig = { type: 'memory' }
): SessionStore<SessionState> {
  switch (config.type) {
    case 'memory':
      return new MemorySessionStore();

    case 'file':
      return new FileSessionStore(config.directory ?? './sessions');

    case 'redis':
      if (!RedisSessionStore.isAvailable()) {
        throw new Error('Redis not available. Install ioredis package.');
      }
      return new RedisSessionStore({
        host: config.host ?? 'localhost',
        port: config.port ?? 6379,
        db: config.db ?? 0,
        password: config.password
      });
  }
}

// 3. Update ProviderOptions
interface ProviderOptions {
  apiKey?: string;
  model?: string;
  sessionStore?: SessionStore<SessionState> | SessionStoreConfig;
  // ... other options
}

// 4. Update AnthropicProvider constructor
class AnthropicProvider implements Provider {
  private sessionStore: SessionStore<SessionState>;

  constructor(options: ProviderOptions = {}) {
    // Handle both SessionStore instance and config
    if (options.sessionStore) {
      if ('save' in options.sessionStore) {
        // Already a SessionStore instance
        this.sessionStore = options.sessionStore;
      } else {
        // Config object - create store
        this.sessionStore = createSessionStore(options.sessionStore);
      }
    } else {
      // Default to memory store
      this.sessionStore = new MemorySessionStore();
    }
  }

  async initialize(config: ProviderConfig) {
    // Restore sessions if using persistent store
    if (!(this.sessionStore instanceof MemorySessionStore)) {
      const sessionIds = await this.sessionStore.list();
      for (const sessionId of sessionIds) {
        const state = await this.sessionStore.load(sessionId);
        if (state) {
          this.restoreSession(sessionId, state);
        }
      }
    }
  }

  async terminate() {
    // Save sessions if using persistent store
    if (!(this.sessionStore instanceof MemorySessionStore)) {
      for (const [sessionId, state] of this.sessions) {
        await this.sessionStore.save(sessionId, state);
      }
    }

    // Always clear in-memory sessions
    this.sessions.clear();
  }
}
```

### 8.2 Usage Examples

**Default behavior (backward compatible):**
```typescript
// Uses in-memory store (default)
const provider = new AnthropicProvider();
await provider.initialize({ apiKey: 'sk-...' });
// Sessions are lost on terminate
```

**File-based persistence:**
```typescript
// Option 1: Direct instantiation
const provider = new AnthropicProvider({
  sessionStore: new FileSessionStore('./sessions')
});

// Option 2: Config object (recommended)
const provider = new AnthropicProvider({
  sessionStore: {
    type: 'file',
    directory: './sessions'
  }
});
```

**Redis persistence:**
```typescript
// Option 1: Direct instantiation
const redisStore = new RedisSessionStore({ host: 'localhost' });
const provider = new AnthropicProvider({
  sessionStore: redisStore
});

// Option 2: Config object (recommended)
const provider = new AnthropicProvider({
  sessionStore: {
    type: 'redis',
    host: 'localhost',
    port: 6379,
    db: 0
  }
});
```

**Custom store:**
```typescript
// Custom implementation
class CloudSessionStore implements SessionStore<SessionState> {
  async save(id: string, state: SessionState): Promise<void> {
    await cloudStorage.upload(`sessions/${id}.json`, JSON.stringify(state));
  }

  async load(id: string): Promise<SessionState | null> {
    try {
      const data = await cloudStorage.download(`sessions/${id}.json`);
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    await cloudStorage.delete(`sessions/${id}.json`);
    return true;
  }

  async list(): Promise<string[]> {
    const files = await cloudStorage.list('sessions/');
    return files.map(f => f.replace('.json', ''));
  }

  async has(id: string): Promise<boolean> {
    return (await this.list()).includes(id);
  }

  async clear(): Promise<void> {
    const ids = await this.list();
    await Promise.all(ids.map(id => this.delete(id)));
  }
}

// Use custom store
const provider = new AnthropicProvider({
  sessionStore: new CloudSessionStore()
});
```

### 8.3 Testing Strategy

```typescript
// Mock store for testing
class MockSessionStore<T> implements SessionStore<T> {
  private data = new Map<string, T>();

  async save(id: string, value: T): Promise<void> {
    this.data.set(id, value);
  }

  async load(id: string): Promise<T | null> {
    return this.data.get(id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    return this.data.delete(id);
  }

  async list(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async has(id: string): Promise<boolean> {
    return this.data.has(id);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

// Test with mock
describe('AnthropicProvider sessions', () => {
  it('should persist sessions across terminate/initialize', async () => {
    const store = new MockSessionStore<SessionState>();
    const provider = new AnthropicProvider({ sessionStore: store });

    await provider.initialize({ apiKey: 'test' });
    const sessionId = await provider.createSession();
    await provider.terminate();

    // Sessions should be in store
    expect(await store.has(sessionId)).toBe(true);

    // Reinitialize should restore sessions
    await provider.initialize({ apiKey: 'test' });
    const session = await provider.getSession(sessionId);
    expect(session).not.toBeNull();
  });
});
```

---

## 9. Recommended Implementation Checklist

### Phase 1: Factory Function (P2.M2.T1.S3)

- [ ] Add `createSessionStore()` factory function to `session-store.ts`
- [ ] Support discriminated union config types
- [ ] Validate required configuration parameters
- [ ] Export factory function alongside implementations
- [ ] Add JSDoc documentation

### Phase 2: AnthropicProvider Integration (P2.M2.T1.S3)

- [ ] Extend `ProviderOptions` with `sessionStore` field
- [ ] Update constructor to accept `SessionStore | SessionStoreConfig`
- [ ] Default to `MemorySessionStore` for backward compatibility
- [ ] Update `initialize()` to restore sessions from persistent stores
- [ ] Update `terminate()` to save sessions to persistent stores

### Phase 3: Testing (P2.M2.T1.S4)

- [ ] Create `MockSessionStore` for testing
- [ ] Test backward compatibility (no options = memory store)
- [ ] Test file store persistence across terminate/initialize
- [ ] Test error handling for invalid config
- [ ] Test custom store implementations

### Phase 4: Documentation (P2.M2.T2.S3)

- [ ] Document session persistence in providers.md
- [ ] Provide usage examples for each store type
- [ ] Document custom store implementation
- [ ] Document migration from in-memory to persistent stores
- [ ] Add configuration examples

---

## 10. Sources and References

### Libraries Analyzed

1. **express-session**
   - GitHub: https://github.com/expressjs/session
   - Documentation: https://github.com/expressjs/session#session-store-implementation
   - Pattern: Base class extension with constructor injection

2. **connect-redis**
   - GitHub: https://github.com/tj/connect-redis
   - Pattern: Constructor injection + factory function

3. **TypeORM**
   - Documentation: https://typeorm.io/
   - Pattern: Repository pattern with interface abstraction

4. **Prisma**
   - Documentation: https://www.prisma.io/docs
   - Pattern: Generated client with optional adapter layer

5. **cache-manager**
   - GitHub: https://github.com/node-cache-manager/node-cache-manager
   - Pattern: Factory function with unified interface

6. **node-cache**
   - GitHub: https://github.com/node-cache/node-cache
   - Pattern: Constructor configuration with synchronous API

7. **ioredis**
   - GitHub: https://github.com/luin/ioredis
   - Pattern: Constructor injection with event-driven lifecycle

### Design Patterns Referenced

1. **Adapter Pattern**: Converting different storage backends to common interface
2. **Factory Pattern**: Creating store instances from configuration
3. **Dependency Injection**: Constructor injection of store dependencies
4. **Strategy Pattern**: Interchangeable storage algorithms
5. **Singleton Pattern**: Single store instance per provider

### Books and Resources

1. **"Design Patterns: Elements of Reusable Object-Oriented Software"** by Gang of Four
2. **"Node.js Design Patterns"** by Mario Casciaro
3. **"Clean Architecture"** by Robert C. Martin
4. **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html

---

## Conclusion

The research indicates that **constructor injection with factory-based instantiation** is the most widely adopted pattern for pluggable storage backends in the TypeScript/JavaScript ecosystem. Key libraries like express-session, TypeORM, and cache-manager all use this pattern.

**Recommended approach for SessionStore integration:**

1. ✅ Use constructor injection in AnthropicProvider
2. ✅ Provide MemorySessionStore as default implementation
3. ✅ Implement factory function for store creation
4. ✅ Support both store instances and config objects
5. ✅ Maintain backward compatibility with existing code
6. ✅ Follow async/await patterns (not callbacks)
7. ✅ Use interface types for dependencies
8. ✅ Include comprehensive error handling

This pattern balances simplicity, flexibility, and maintainability while aligning with established best practices in the ecosystem.

# External Research: Session TTL and Cleanup Best Practices

**Research Date:** 2026-01-26
**Research Focus:** TTL storage patterns, expiration strategies, clock skew handling, and cleanup performance for TypeScript/Node.js applications

---

## Table of Contents

1. [TTL Storage Patterns](#1-ttl-storage-patterns)
2. [Expiration Strategies](#2-expiration-strategies)
3. [Clock Skew Handling](#3-clock-skew-handling)
4. [Edge Cases and Validation](#4-edge-cases-and-validation)
5. [File-Based Session Cleanup](#5-file-based-session-cleanup)
6. [Performance Considerations](#6-performance-considerations)
7. [Implementation Patterns from Popular Libraries](#7-implementation-patterns-from-popular-libraries)
8. [Code Examples](#8-code-examples)
9. [Sources and References](#9-sources-and-references)

---

## 1. TTL Storage Patterns

### 1.1 Inline Timestamp vs Separate Metadata

#### Pattern 1: Inline Timestamp (Recommended for Simple Use Cases)

Store TTL directly within the session object:

```typescript
interface SessionState {
  messages: Message[];
  metadata: {
    createdAt: number;
    expiresAt: number;  // Inline TTL
    lastAccessed: number;
  };
}
```

**Pros:**
- Simple to implement
- Atomic with session data
- Easy to serialize/deserialize
- Single file read for session + expiration check

**Cons:**
- Couples expiration logic with session data
- Cannot modify TTL without rewriting entire session
- Metadata pollution in session objects

#### Pattern 2: Separate Metadata Store (Recommended for Complex Systems)

Store TTL in parallel structure:

```typescript
// Session data
interface SessionState {
  messages: Message[];
  // ... session-specific data
}

// Separate metadata
interface SessionMetadata {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
  ttl: number;
  accessCount: number;
}

// Storage
class SessionStoreWithMetadata {
  private sessions: Map<string, SessionState>;
  private metadata: Map<string, SessionMetadata>;
}
```

**Pros:**
- Clean separation of concerns
- Can update metadata without touching session data
- Enables complex expiration policies
- Easier to implement sliding expiration

**Cons:**
- Two lookups required (can be mitigated with caching)
- More complex synchronization
- Potential for data inconsistency

#### Pattern 3: Wrapper Object (Hybrid Approach)

Wrap session with metadata:

```typescript
interface SessionWrapper<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  lastAccessed: number;
}

// Usage
class MemorySessionStore<T> {
  private sessions: Map<string, SessionWrapper<T>>;
}
```

**Pros:**
- Maintains single lookup
- Clear separation between data and metadata
- Easy to implement sliding expiration
- Type-safe with generics

**Cons:**
- Slightly more complex deserialization
- Wrapper overhead

**Recommendation:** Use Pattern 3 (Wrapper Object) for new implementations. It provides the best balance of simplicity and functionality.

### 1.2 Timestamp Precision and Units

#### Standard Practices

| Use Case | Precision | Unit | Example |
|----------|-----------|------|---------|
| Session Expiration | Millisecond | `number` | `Date.now()` |
| Cookie maxAge | Millisecond | `number` | `3600000` (1 hour) |
| Redis TTL | Second | `number` | `3600` (1 hour) |
| Database timestamps | Millisecond | `number` | `1706265600000` |

**Best Practice:** Always use **milliseconds** for application-level timestamps. Only convert to seconds when interfacing with external systems (Redis, databases).

```typescript
// Good: Milliseconds throughout
const expiresAt = Date.now() + ttl;  // ttl in milliseconds

// Acceptable: Convert at boundaries
const redisTTL = Math.floor(ttl / 1000);  // Convert to seconds for Redis
await redis.setex(key, redisTTL, value);
```

### 1.3 Absolute vs Relative Timestamps

#### Absolute Timestamps (Recommended)

```typescript
interface Session {
  data: T;
  expiresAt: number;  // Absolute timestamp: 1706265600000
}
```

**Pros:**
- No calculation needed to check expiration
- Can detect clock skew (expiresAt < createdAt)
- Works across server restarts
- Easier to debug (human-readable dates)

**Cons:**
- Requires clock sync (mitigated by tolerance windows)

#### Relative Timestamps

```typescript
interface Session {
  data: T;
  ttl: number;  // Relative: 3600000
  createdAt: number;
}
```

**Pros:**
- Clock-independent
- Easy to extend TTL

**Cons:**
- Must calculate on every access
- Cannot detect stale sessions without clock reference
- More complex expiration logic

**Recommendation:** Use absolute timestamps with tolerance windows for clock skew.

---

## 2. Expiration Strategies

### 2.1 Lazy Expiration (Check on Load)

#### Pattern: Check-Then-Load

```typescript
class LazyExpirationStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number }>;

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check expiration on access
    if (Date.now() > session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session.data;
  }
}
```

**Pros:**
- No background process needed
- Zero overhead when sessions not accessed
- Simple implementation
- Resource-efficient

**Cons:**
- Expired sessions accumulate until accessed
- Storage never truly cleaned up
- Potential for thousands of stale files/entries

**Best For:**
- Low-traffic applications
- Memory-constrained environments
- Development/testing

### 2.2 Active Expiration (Periodic Cleanup)

#### Pattern 1: Fixed Interval Cleanup

```typescript
class ActiveExpirationStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number }>;
  private cleanupTimer: NodeJS.Timeout;

  constructor(ttl: number, cleanupInterval: number = 300000) {
    // Cleanup every 5 minutes by default
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

**Pros:**
- Storage stays clean
- Predictable resource usage
- Prevents accumulation of stale data

**Cons:**
- Continuous CPU overhead
- Wakes up even when no sessions exist
- Must manage timer lifecycle

**Best For:**
- Production applications
- High-traffic systems
- File-based storage

#### Pattern 2: Adaptive Cleanup

```typescript
class AdaptiveCleanupStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number }>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private cleanupInterval: number;
  private lastCleanup: number = 0;
  private readonly MIN_CLEANUP_INTERVAL = 60000;  // 1 minute
  private readonly MAX_CLEANUP_INTERVAL = 600000;  // 10 minutes

  constructor() {
    this.cleanupInterval = this.MAX_CLEANUP_INTERVAL;
    this.scheduleCleanup();
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }

    this.cleanupTimer = setTimeout(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredCount = this.performCleanup();
    const duration = Date.now() - now;

    // Adapt interval based on cleanup results
    if (expiredCount > 100) {
      // Many expired sessions - cleanup more frequently
      this.cleanupInterval = Math.max(
        this.MIN_CLEANUP_INTERVAL,
        this.cleanupInterval / 2
      );
    } else if (expiredCount === 0 && duration < 10) {
      // No expired sessions and quick cleanup - cleanup less frequently
      this.cleanupInterval = Math.min(
        this.MAX_CLEANUP_INTERVAL,
        this.cleanupInterval * 1.5
      );
    }

    this.lastCleanup = now;
    this.scheduleCleanup();
  }

  private performCleanup(): number {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, { expiresAt }] of this.sessions) {
      if (now > expiresAt) {
        this.sessions.delete(key);
        expiredCount++;
      }
    }

    return expiredCount;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
```

**Pros:**
- Optimizes resource usage
- Scales with session churn
- Reduces unnecessary cleanups

**Cons:**
- More complex implementation
- May delay cleanup during rapid changes

**Best For:**
- Variable-load applications
- Resource-constrained environments

### 2.3 Hybrid Expiration (Recommended)

Combine lazy and active expiration:

```typescript
class HybridExpirationStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number }>;
  private cleanupTimer: NodeJS.Timeout;

  constructor(ttl: number, cleanupInterval: number = 300000) {
    // Active cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  // Lazy expiration check on every load
  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session.data;
  }

  // Active cleanup in background
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

**Pros:**
- Best of both worlds
- Immediate cleanup on access
- Background cleanup prevents accumulation
- Production-ready pattern

**Cons:**
- Slightly more complex
- Dual expiration logic

**Recommendation:** Use hybrid expiration for all production implementations.

### 2.4 Sliding vs Absolute Expiration

#### Sliding Expiration (Session Reset)

```typescript
class SlidingExpirationStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number }>;
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Reset expiration on access
    session.expiresAt = Date.now() + this.ttl;
    return session.data;
  }
}
```

**Use Cases:**
- User sessions (keep alive while active)
- Shopping carts
- Interactive applications

#### Absolute Expiration (Fixed Window)

```typescript
class AbsoluteExpirationStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number }>;

  constructor(ttl: number) {}

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Does NOT reset expiration
    return session.data;
  }
}
```

**Use Cases:**
- Cache entries
- Rate limiting
- Security tokens
- Time-sensitive data

**Recommendation:** Implement both patterns and allow configuration:

```typescript
interface SessionStoreOptions {
  ttl: number;
  expirationPolicy?: 'sliding' | 'absolute';
  cleanupInterval?: number;
}
```

---

## 3. Clock Skew Handling

### 3.1 The Problem

Clock skew occurs when:
- System clock is manually adjusted
- NTP synchronization jumps time
- Container clock drifts from host
- Distributed systems have unsynchronized clocks

**Impact on TTL:**
```typescript
// Without clock skew handling
const now = Date.now();  // 1706265600000
const expiresAt = 1706269200000;  // 1 hour from now

// Clock jumps back 1 hour
const now = Date.now();  // 1706262000000 (1 hour ago)
// Session appears to have 2 hours remaining!
```

### 3.2 Tolerance Windows

Add buffer to expiration checks:

```typescript
class ClockSkewTolerantStore<T> {
  private sessions: Map<string, { data: T; expiresAt: number; createdAt: number }>;
  private readonly CLOCK_SKEW_TOLERANCE = 60000;  // 1 minute

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    const now = Date.now();

    // Add tolerance window
    if (now > session.expiresAt + this.CLOCK_SKEW_TOLERANCE) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Detect clock skew (expiresAt < createdAt = impossible)
    if (session.expiresAt < session.createdAt) {
      console.warn(`Clock skew detected for session ${sessionId}`);
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }
}
```

**Pros:**
- Handles minor clock adjustments
- Catches severe clock skew
- Simple implementation

**Cons:**
- Extends session lifetime by tolerance amount
- May not handle large time jumps

### 3.3 Monotonic Clocks

Use monotonic timestamps when available:

```typescript
class MonotonicClockStore<T> {
  private sessions: Map<string, {
    data: T;
    expiresAt: number;
    monotonicExpiresAt: number;
  }>;

  async save(sessionId: string, data: T, ttl: number): Promise<void> {
    const now = Date.now();
    const monotonicNow = process.hrtime.bigint();

    this.sessions.set(sessionId, {
      data,
      expiresAt: now + ttl,
      monotonicExpiresAt: Number(monotonicNow + BigInt(ttl * 1000000))
    });
  }

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Use monotonic clock for comparison
    const monotonicNow = Number(process.hrtime.bigint());

    if (monotonicNow > session.monotonicExpiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }
}
```

**Pros:**
- Immune to system clock changes
- Precise timing
- Guaranteed monotonic

**Cons:**
- `process.hrtime.bigint()` is relative to process start
- Cannot persist across restarts
- More complex

**Best For:** In-memory caches with short TTLs.

### 3.4 NTP-Based Synchronization

For distributed systems:

```typescript
class NTPSynchronizedStore<T> {
  private clockOffset: number = 0;
  private lastSyncTime: number = 0;
  private readonly SYNC_INTERVAL = 600000;  // 10 minutes
  private readonly MAX_SKEW = 5000;  // 5 seconds

  constructor(private ntpServer: string) {
    this.syncClock();
    setInterval(() => this.syncClock(), this.SYNC_INTERVAL);
  }

  private async syncClock(): Promise<void> {
    try {
      const start = Date.now();
      const response = await fetch(`http://${this.ntpServer}/time`);
      const serverTime = await response.json();
      const end = Date.now();

      // Calculate round-trip delay
      const delay = (end - start) / 2;
      this.clockOffset = serverTime - start - delay;
      this.lastSyncTime = end;

      // Warn if skew is too large
      if (Math.abs(this.clockOffset) > this.MAX_SKEW) {
        console.warn(`Large clock skew detected: ${this.clockOffset}ms`);
      }
    } catch (error) {
      console.error('Failed to sync clock:', error);
    }
  }

  getAdjustedTime(): number {
    return Date.now() + this.clockOffset;
  }

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Use adjusted time
    if (this.getAdjustedTime() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }
}
```

**Best For:** Distributed systems with accurate time requirements.

### 3.5 Recommended Strategy

Combine tolerance windows with validation:

```typescript
interface SessionWrapper<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
}

class RobustSessionStore<T> {
  private sessions: Map<string, SessionWrapper<T>>;
  private readonly CLOCK_SKEW_TOLERANCE = 30000;  // 30 seconds
  private readonly MIN_SESSION_AGE = 1000;  // 1 second

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    const now = Date.now();

    // Validate timestamps are sane
    if (session.expiresAt < session.createdAt) {
      console.warn(`Invalid timestamps for session ${sessionId}`);
      this.sessions.delete(sessionId);
      return null;
    }

    // Check if session is too young (clock just jumped forward)
    if (now < session.createdAt && (now - session.createdAt) < -this.MIN_SESSION_AGE) {
      console.warn(`Clock jumped forward detected for session ${sessionId}`);
      // Consider session valid
      return session.data;
    }

    // Check expiration with tolerance
    if (now > session.expiresAt + this.CLOCK_SKEW_TOLERANCE) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session.data;
  }
}
```

**Recommendation:** Use tolerance windows (30-60 seconds) with timestamp validation for most applications. Use monotonic clocks only for in-memory caches with short TTLs.

---

## 4. Edge Cases and Validation

### 4.1 Negative TTL

**Problem:** Negative TTL values cause immediate expiration or negative timestamps.

```typescript
// Bad: Negative TTL creates expiresAt in the past
const ttl = -1000;
const expiresAt = Date.now() + ttl;  // Already expired!
```

**Solution:**

```typescript
function validateTTL(ttl: number): number {
  if (ttl < 0) {
    throw new Error(
      `TTL must be non-negative. Received: ${ttl}. ` +
      `Use 0 for no expiration or a positive value.`
    );
  }
  return ttl;
}

// Or clamp to 0
function sanitizeTTL(ttl: number): number {
  return Math.max(0, ttl);
}
```

### 4.2 Zero TTL (No Expiration)

**Problem:** TTL = 0 should mean "never expire" or "immediately expire"?

**Solution:** Define semantics clearly:

```typescript
interface SessionStoreOptions {
  /**
   * Time-to-live for sessions in milliseconds.
   * - 0: Sessions never expire (manual deletion only)
   * - > 0: Sessions expire after specified milliseconds
   * @default 3600000 (1 hour)
   */
  ttl: number;
}

class SessionStore<T> {
  private readonly ttl: number;

  constructor(options: SessionStoreOptions) {
    this.ttl = options.ttl;
  }

  async save(sessionId: string, data: T): Promise<void> {
    const wrapper: SessionWrapper<T> = {
      data,
      createdAt: Date.now(),
      expiresAt: this.ttl === 0
        ? Number.MAX_SAFE_INTEGER  // Never expire
        : Date.now() + this.ttl
    };

    this.sessions.set(sessionId, wrapper);
  }
}
```

### 4.3 Very Large TTL Values

**Problem:** Extremely large TTL values can cause:

1. **Number Overflow:**
   ```typescript
   const ttl = Number.MAX_SAFE_INTEGER;
   const expiresAt = Date.now() + ttl;  // Could overflow!
   ```

2. **Practical Issues:**
   - Sessions persist effectively forever
   - Storage never cleaned up
   - Potential for confusion

**Solution:**

```typescript
class SessionStore<T> {
  private static readonly MAX_TTL = 365 * 24 * 60 * 60 * 1000;  // 1 year
  private static readonly DEFAULT_TTL = 3600000;  // 1 hour

  constructor(private ttl: number = SessionStore.DEFAULT_TTL) {
    this.ttl = this.validateTTL(ttl);
  }

  private validateTTL(ttl: number): number {
    // Check for overflow
    if (ttl > SessionStore.MAX_TTL) {
      console.warn(
        `TTL ${ttl}ms exceeds maximum (${SessionStore.MAX_TTL}ms). ` +
        `Clamping to maximum.`
      );
      return SessionStore.MAX_TTL;
    }

    // Check for negative
    if (ttl < 0) {
      throw new Error(`TTL cannot be negative. Received: ${ttl}`);
    }

    // Check for overflow when added to Date.now()
    const now = Date.now();
    const expiresAt = now + ttl;
    if (expiresAt > Number.MAX_SAFE_INTEGER) {
      console.warn(`TTL would cause timestamp overflow. Clamping.`);
      return Number.MAX_SAFE_INTEGER - now - 1;
    }

    return ttl;
  }
}
```

### 4.4 Special Values (-1 for Disabled)

Common pattern: Use -1 to indicate "disabled TTL"

```typescript
interface SessionStoreOptions {
  /**
   * Time-to-live for sessions in milliseconds.
   * - -1: TTL disabled (sessions never expire)
   * - 0: Alias for -1 (never expire)
   * - > 0: Sessions expire after specified milliseconds
   * @default 3600000 (1 hour)
   */
  ttl: number;
}

function normalizeTTL(ttl: number): number {
  if (ttl === -1 || ttl === 0) {
    return 0;  // 0 means never expire in our implementation
  }
  if (ttl < 0) {
    throw new Error(`Invalid TTL: ${ttl}. Use -1 for disabled, 0 for no expiration, or > 0.`);
  }
  return ttl;
}
```

### 4.5 Validation Helper

Comprehensive TTL validation:

```typescript
interface TTLValidationResult {
  isValid: boolean;
  normalizedTTL: number;
  error?: string;
  warning?: string;
}

function validateAndNormalizeTTL(ttl: number): TTLValidationResult {
  const MIN_TTL = 0;
  const MAX_TTL = 365 * 24 * 60 * 60 * 1000;  // 1 year
  const DEFAULT_TTL = 3600000;  // 1 hour

  // Check type
  if (typeof ttl !== 'number' || isNaN(ttl)) {
    return {
      isValid: false,
      normalizedTTL: DEFAULT_TTL,
      error: `TTL must be a valid number. Received: ${typeof ttl}`
    };
  }

  // Handle negative (disabled)
  if (ttl === -1) {
    return {
      isValid: true,
      normalizedTTL: 0,
      warning: 'TTL explicitly disabled (-1)'
    };
  }

  // Check for negative (other than -1)
  if (ttl < 0) {
    return {
      isValid: false,
      normalizedTTL: DEFAULT_TTL,
      error: `TTL cannot be negative (except -1 for disabled). Received: ${ttl}`
    };
  }

  // Check for zero (no expiration)
  if (ttl === 0) {
    return {
      isValid: true,
      normalizedTTL: 0,
      warning: 'TTL set to 0 (sessions will not expire)'
    };
  }

  // Check for too large
  if (ttl > MAX_TTL) {
    return {
      isValid: true,
      normalizedTTL: MAX_TTL,
      warning: `TTL ${ttl}ms exceeds maximum ${MAX_TTL}ms. Clamping to maximum.`
    };
  }

  // Check for minimum
  if (ttl < MIN_TTL) {
    return {
      isValid: true,
      normalizedTTL: MIN_TTL,
      warning: `TTL ${ttl}ms below minimum ${MIN_TTL}ms. Clamping to minimum.`
    };
  }

  return {
    isValid: true,
    normalizedTTL: ttl
  };
}

// Usage
class SessionStore<T> {
  constructor(ttl: number = 3600000) {
    const result = validateAndNormalizeTTL(ttl);

    if (result.warning) {
      console.warn(`TTL Warning: ${result.warning}`);
    }

    if (!result.isValid) {
      throw new Error(`Invalid TTL: ${result.error}`);
    }

    this.ttl = result.normalizedTTL;
  }
}
```

### 4.6 Edge Case Summary

| TTL Value | Semantic | Action |
|-----------|----------|--------|
| `ttl < -1` | Invalid | Throw error |
| `ttl === -1` | Disabled | Set to 0 (never expire) |
| `ttl === 0` | No expiration | Keep as 0 |
| `0 < ttl < 1000` | Too short | Warn or clamp to 1000ms |
| `1000 ≤ ttl ≤ MAX_TTL` | Valid | Use as-is |
| `ttl > MAX_TTL` | Too large | Clamp to MAX_TTL (1 year) |

---

## 5. File-Based Session Cleanup

### 5.1 Challenges with File-Based Storage

1. **No native expiration** - Files don't expire automatically
2. **Performance overhead** - File I/O is expensive
3. **Accumulation** - Stale files accumulate over time
4. **Atomic operations** - Must handle concurrent access
5. **Directory scanning** - Listing files can be slow

### 5.2 Strategy 1: Lazy Cleanup on Load

```typescript
class FileSessionStoreLazy<T> {
  private directory: string;

  async load(sessionId: string): Promise<T | null> {
    const path = this.getPath(sessionId);

    try {
      const content = await readFile(path, 'utf-8');
      const wrapper = JSON.parse(content) as SessionWrapper<T>;

      // Check expiration
      if (Date.now() > wrapper.expiresAt) {
        await this.delete(sessionId);  // Clean up expired file
        return null;
      }

      return wrapper.data;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}
```

**Pros:**
- No background process
- Only processes accessed files
- Simple implementation

**Cons:**
- Stale files accumulate
- Directory grows unbounded
- No proactive cleanup

**Best For:**
- Development environments
- Low-traffic applications

### 5.3 Strategy 2: Periodic Directory Scanning

```typescript
class FileSessionStorePeriodic<T> {
  private directory: string;
  private cleanupTimer: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 3600000;  // 1 hour

  constructor(directory: string = './sessions') {
    this.directory = directory;

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);

    // Initial cleanup
    this.cleanupExpiredSessions();
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const startTime = Date.now();
    let deletedCount = 0;
    let errorCount = 0;

    try {
      const files = await readdir(this.directory);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const sessionId = file.replace('.json', '');
        const path = join(this.directory, file);

        try {
          const content = await readFile(path, 'utf-8');
          const wrapper = JSON.parse(content) as SessionWrapper<T>;

          if (Date.now() > wrapper.expiresAt) {
            await unlink(path);
            deletedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`Failed to cleanup session file ${file}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `File cleanup complete: ${deletedCount} deleted, ` +
        `${errorCount} errors, ${duration}ms`
      );
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
```

**Pros:**
- Regular cleanup prevents accumulation
- Configurable interval
- Logs cleanup statistics

**Cons:**
- Scans entire directory every time
- Blocks on file I/O
- May be slow with many files

**Optimization:** Use file modification time as a filter:

```typescript
private async cleanupExpiredSessions(): Promise<void> {
  const files = await readdir(this.directory);
  const now = Date.now();

  for (const file of files) {
    const path = join(this.directory, file);

    // Use stat to check modification time first (faster than reading file)
    const stats = await stat(path);
    const fileAge = now - stats.mtimeMs;

    // If file is older than max possible TTL, delete without reading
    if (fileAge > this.MAX_TTL) {
      await unlink(path);
      continue;
    }

    // Otherwise, read and check actual expiration
    const content = await readFile(path, 'utf-8');
    const wrapper = JSON.parse(content);

    if (now > wrapper.expiresAt) {
      await unlink(path);
    }
  }
}
```

### 5.4 Strategy 3: Sharded Cleanup (For Large Scale)

Split cleanup across multiple intervals:

```typescript
class ShardedFileSessionStore<T> {
  private directory: string;
  private shardCount: number;
  private cleanupTimers: NodeJS.Timeout[] = [];

  constructor(
    directory: string = './sessions',
    shardCount: number = 12  // 12 shards = 2-hour cycle with 10-min intervals
  ) {
    this.directory = directory;
    this.shardCount = shardCount;

    // Start cleanup for each shard at different intervals
    const shardInterval = 600000;  // 10 minutes

    for (let shard = 0; shard < shardCount; shard++) {
      const timer = setInterval(
        () => this.cleanupShard(shard),
        shardInterval * shardCount
      );

      // Stagger initial cleanup
      setTimeout(() => this.cleanupShard(shard), shardInterval * shard);

      this.cleanupTimers.push(timer);
    }
  }

  private getShard(sessionId: string): number {
    // Consistent hashing
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % this.shardCount;
  }

  private async cleanupShard(shard: number): Promise<void> {
    const files = await readdir(this.directory);
    const now = Date.now();

    for (const file of files) {
      const sessionId = file.replace('.json', '');

      // Only process files belonging to this shard
      if (this.getShard(sessionId) !== shard) {
        continue;
      }

      const path = join(this.directory, file);

      try {
        const content = await readFile(path, 'utf-8');
        const wrapper = JSON.parse(content);

        if (now > wrapper.expiresAt) {
          await unlink(path);
        }
      } catch (error) {
        console.error(`Failed to cleanup ${file}:`, error);
      }
    }
  }

  destroy(): void {
    this.cleanupTimers.forEach(timer => clearInterval(timer));
    this.cleanupTimers = [];
  }
}
```

**Pros:**
- Spreads cleanup load over time
- No single long-running cleanup
- Scales to millions of files

**Cons:**
- More complex
- Slower overall cleanup cycle
- May expire files less precisely

**Best For:** High-traffic applications with millions of sessions.

### 5.5 Strategy 4: Background Worker Process

Offload cleanup to separate process:

```typescript
// Main process
class FileSessionStore<T> {
  private directory: string;
  private cleanupWorker?: Worker;

  constructor(directory: string = './sessions') {
    this.directory = directory;

    // Spawn cleanup worker
    this.cleanupWorker = new Worker('./cleanup-worker.js', {
      workerData: { directory: this.directory }
    });
  }

  async save(sessionId: string, data: T, ttl: number): Promise<void> {
    const wrapper: SessionWrapper<T> = {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl
    };

    const path = join(this.directory, `${sessionId}.json`);
    await writeFile(path, JSON.stringify(wrapper), 'utf-8');
  }

  destroy(): void {
    this.cleanupWorker?.terminate();
  }
}

// cleanup-worker.js
import { readdir, readFile, unlink, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { workerData, parentPort } from 'node:worker_threads';

const { directory } = workerData;
const CLEANUP_INTERVAL = 600000;  // 10 minutes

async function cleanup(): Promise<void> {
  const files = await readdir(directory);
  const now = Date.now();

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const path = join(directory, file);

    try {
      const content = await readFile(path, 'utf-8');
      const wrapper = JSON.parse(content);

      if (now > wrapper.expiresAt) {
        await unlink(path);
        parentPort?.postMessage({ type: 'deleted', file });
      }
    } catch (error) {
      parentPort?.postMessage({ type: 'error', file, error: error.message });
    }
  }
}

// Run cleanup periodically
setInterval(cleanup, CLEANUP_INTERVAL);

// Initial cleanup
cleanup();
```

**Pros:**
- Doesn't block main thread
- Can run at lower priority
- Isolated from application crashes

**Cons:**
- More complex deployment
- Additional memory overhead
- Worker process management

**Best For:** Production applications with high session volume.

### 5.6 Recommended File-Based Cleanup Strategy

Hybrid approach with lazy + periodic cleanup:

```typescript
class RobustFileSessionStore<T> {
  private directory: string;
  private cleanupTimer: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 1800000;  // 30 minutes

  constructor(directory: string = './sessions') {
    this.directory = directory;

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  // Lazy cleanup on load
  async load(sessionId: string): Promise<T | null> {
    const path = join(this.directory, `${sessionId}.json`);

    try {
      const content = await readFile(path, 'utf-8');
      const wrapper = JSON.parse(content) as SessionWrapper<T>;

      // Check expiration
      if (Date.now() > wrapper.expiresAt) {
        await unlink(path);  // Delete expired file
        return null;
      }

      return wrapper.data;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // Periodic background cleanup
  private async cleanupExpiredSessions(): Promise<void> {
    const startTime = Date.now();
    let deletedCount = 0;

    try {
      const files = await readdir(this.directory);
      const now = Date.now();

      // Process in batches to avoid blocking
      const batchSize = 100;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            if (!file.endsWith('.json')) return;

            const path = join(this.directory, file);

            try {
              // Quick check: use mtime as a filter
              const stats = await stat(path);
              if (now - stats.mtimeMs < this.MIN_TTL) {
                return;  // File too young to be expired
              }

              // Read and check actual expiration
              const content = await readFile(path, 'utf-8');
              const wrapper = JSON.parse(content);

              if (now > wrapper.expiresAt) {
                await unlink(path);
                deletedCount++;
              }
            } catch (error) {
              // Ignore errors during cleanup
            }
          })
        );

        // Yield to event loop between batches
        await new Promise(resolve => setImmediate(resolve));
      }

      const duration = Date.now() - startTime;
      console.log(`Cleanup: ${deletedCount} files deleted in ${duration}ms`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
```

**Recommendation:** Use lazy cleanup for small-scale applications and hybrid lazy + periodic cleanup for production.

---

## 6. Performance Considerations

### 6.1 Cleanup Frequency vs Performance

| Cleanup Interval | Pros | Cons | Use Case |
|-----------------|------|------|----------|
| 1 minute | Always clean | High CPU overhead | High-churn apps |
| 5 minutes | Balanced | Moderate overhead | **Recommended default** |
| 15 minutes | Low overhead | More stale data | Low-traffic apps |
| 1 hour | Minimal overhead | Accumulation | Background jobs |
| Never | Zero overhead | Unbounded growth | Not recommended |

**Recommendation:** Start with 5-minute cleanup interval, adjust based on monitoring.

### 6.2 Batch Processing

Don't process all sessions at once:

```typescript
// Bad: Blocks on entire cleanup
async cleanup(): Promise<void> {
  const sessions = Array.from(this.sessions.entries());
  for (const [key, session] of sessions) {
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(key);
    }
  }
}

// Good: Process in batches with yielding
async cleanup(): Promise<void> {
  const sessions = Array.from(this.sessions.entries());
  const batchSize = 100;

  for (let i = 0; i < sessions.length; i += batchSize) {
    const batch = sessions.slice(i, i + batchSize);
    const now = Date.now();

    for (const [key, session] of batch) {
      if (now > session.expiresAt) {
        this.sessions.delete(key);
      }
    }

    // Yield to event loop
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

### 6.3 Metrics and Monitoring

Track cleanup performance:

```typescript
interface CleanupMetrics {
  lastCleanupTime: number;
  lastCleanupDuration: number;
  sessionsDeleted: number;
  sessionsRemaining: number;
  totalCleanups: number;
  averageDuration: number;
}

class MonitoredSessionStore<T> {
  private metrics: CleanupMetrics = {
    lastCleanupTime: 0,
    lastCleanupDuration: 0,
    sessionsDeleted: 0,
    sessionsRemaining: 0,
    totalCleanups: 0,
    averageDuration: 0
  };

  private async cleanup(): Promise<void> {
    const startTime = Date.now();
    let deletedCount = 0;

    for (const [key, session] of this.sessions) {
      if (Date.now() > session.expiresAt) {
        this.sessions.delete(key);
        deletedCount++;
      }
    }

    const duration = Date.now() - startTime;

    // Update metrics
    this.metrics.lastCleanupTime = Date.now();
    this.metrics.lastCleanupDuration = duration;
    this.metrics.sessionsDeleted = deletedCount;
    this.metrics.sessionsRemaining = this.sessions.size;
    this.metrics.totalCleanups++;
    this.metrics.averageDuration =
      ((this.metrics.averageDuration * (this.metrics.totalCleanups - 1)) + duration) /
      this.metrics.totalCleanups;

    // Log if cleanup took too long
    if (duration > 1000) {
      console.warn(
        `Slow cleanup: ${duration}ms, ` +
        `deleted ${deletedCount}, ` +
        `remaining ${this.sessions.size}`
      );
    }
  }

  getMetrics(): CleanupMetrics {
    return { ...this.metrics };
  }
}
```

### 6.4 Memory vs CPU Trade-off

More frequent cleanup = less memory usage but more CPU:

```typescript
interface PerformanceProfile {
  memoryOptimized: {
    cleanupInterval: 60000;  // 1 minute
    maxSessions: 10000;
  };
  balanced: {
    cleanupInterval: 300000;  // 5 minutes
    maxSessions: 50000;
  };
  cpuOptimized: {
    cleanupInterval: 1800000;  // 30 minutes
    maxSessions: 100000;
  };
}

function createSessionStore<T>(
  profile: keyof PerformanceProfile,
  ttl: number
): SessionStore<T> {
  const config = performanceProfiles[profile];
  return new MemorySessionStore<T>({
    ttl,
    cleanupInterval: config.cleanupInterval,
    maxSessions: config.maxSessions
  });
}
```

### 6.5 Async Cleanup with Throttling

Prevent cleanup from monopolizing event loop:

```typescript
class ThrottledCleanupStore<T> {
  private isCleaningUp = false;
  private cleanupScheduled = false;

  async scheduleCleanup(): Promise<void> {
    if (this.isCleaningUp) {
      // Already cleaning up, schedule another
      this.cleanupScheduled = true;
      return;
    }

    this.isCleaningUp = true;

    try {
      await this.performCleanup();
    } finally {
      this.isCleaningUp = false;

      if (this.cleanupScheduled) {
        this.cleanupScheduled = false;
        await this.scheduleCleanup();
      }
    }
  }

  private async performCleanup(): Promise<void> {
    const maxDuration = 100;  // Max 100ms per cleanup cycle
    const startTime = Date.now();

    for (const [key, session] of this.sessions) {
      if (Date.now() - startTime > maxDuration) {
        // Time budget exhausted, yield
        break;
      }

      if (Date.now() > session.expiresAt) {
        this.sessions.delete(key);
      }
    }

    // Schedule next batch if more work remains
    if (this.sessions.size > 0) {
      setImmediate(() => this.scheduleCleanup());
    }
  }
}
```

### 6.6 File I/O Optimization

For file-based stores:

1. **Use stat() as a filter:**
   ```typescript
   const stats = await stat(path);
   if (now - stats.mtimeMs < this.MIN_TTL) {
     continue;  // Skip reading file
   }
   ```

2. **Batch file operations:**
   ```typescript
   // Read multiple files in parallel
   await Promise.all(
     files.map(file => this.checkAndDelete(file))
   );
   ```

3. **Use streaming for large directories:**
   ```typescript
   import { opendir } from 'node:fs/promises';

   async cleanup(): Promise<void> {
     const dir = await opendir(this.directory);

     for await (const entry of dir) {
       if (entry.name.endsWith('.json')) {
         await this.checkAndDelete(entry.name);
       }
     }
   }
   ```

---

## 7. Implementation Patterns from Popular Libraries

### 7.1 Express-Session

**Source:** https://github.com/expressjs/session

**Key Patterns:**
- Uses `maxAge` in cookie configuration (milliseconds)
- Separate session ID generation
- Rolling sessions (optional)
- Touch method for updating expiration

```typescript
interface SessionOptions {
  secret: string;
  cookie?: {
    maxAge?: number;  // milliseconds
    expires?: Date;
  };
  rolling?: boolean;  // Reset expiration on every request
  resave?: boolean;
  saveUninitialized?: boolean;
}
```

### 7.2 connect-redis

**Source:** https://github.com/tj/connect-redis

**Key Patterns:**
- Uses Redis native TTL (seconds)
- Separate `ttl` option from cookie `maxAge`
- Automatic expiration via Redis

```typescript
interface RedisStoreOptions {
  client: RedisClient;
  ttl?: number;  // seconds (not milliseconds!)
  prefix?: string;
  disableTTL?: boolean;
}
```

### 7.3 node-cache

**Source:** https://github.com/node-cache/node-cache

**Key Patterns:**
- `stdTTL` for default TTL (seconds)
- `checkperiod` for cleanup interval (seconds)
- Per-key TTL override
- `get()` returns `undefined` for expired keys

```typescript
interface NodeCacheOptions {
  stdTTL?: number;  // seconds, default 0
  checkperiod?: number;  // seconds, default 600
  useClones?: boolean;
}

const cache = new NodeCache({
  stdTTL: 3600,  // 1 hour
  checkperiod: 600  // 10 minutes
});
```

### 7.4 cache-manager

**Source:** https://github.com/node-cache-manager/node-cache-manager

**Key Patterns:**
- Unified cache interface
- Multiple stores (memory, Redis, MongoDB)
- TTL in seconds
- Lazy expiration + optional periodic cleanup

```typescript
interface CacheOptions {
  ttl?: number;  // seconds
  isCacheableValue?: (value: any) => boolean;
}

const cache = await caching({
  store: memoryStore,
  ttl: 3600,  // 1 hour
  max: 1000  // max keys
});
```

### 7.5 Key Insights from Popular Libraries

1. **Units vary widely:**
   - Cookie-based: milliseconds (express-session)
   - Cache/storage: seconds (node-cache, cache-manager)
   - Redis: seconds (connect-redis)

2. **Cleanup is optional:**
   - Many rely on lazy expiration
   - Periodic cleanup is configurable
   - Redis has native expiration

3. **TTL flexibility:**
   - Global default TTL
   - Per-key TTL override
   - Disable TTL option

4. **Rolling expiration:**
   - Express-session supports rolling sessions
   - Reset TTL on access

---

## 8. Code Examples

### 8.1 Complete Memory Session Store with TTL

```typescript
interface SessionWrapper<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  lastAccessed: number;
}

interface MemoryStoreOptions {
  ttl?: number;  // milliseconds
  cleanupInterval?: number;  // milliseconds
  expirationPolicy?: 'sliding' | 'absolute';
  maxSessions?: number;
}

export class MemorySessionStore<T> {
  private sessions: Map<string, SessionWrapper<T>>;
  private ttl: number;
  private cleanupInterval: number;
  private expirationPolicy: 'sliding' | 'absolute';
  private maxSessions: number;
  private cleanupTimer: NodeJS.Timeout;
  private static readonly DEFAULT_TTL = 3600000;  // 1 hour
  private static readonly DEFAULT_CLEANUP_INTERVAL = 300000;  // 5 minutes
  private static readonly CLOCK_SKEW_TOLERANCE = 30000;  // 30 seconds

  constructor(options: MemoryStoreOptions = {}) {
    this.sessions = new Map();
    this.ttl = options.ttl ?? MemorySessionStore.DEFAULT_TTL;
    this.cleanupInterval = options.cleanupInterval ?? MemorySessionStore.DEFAULT_CLEANUP_INTERVAL;
    this.expirationPolicy = options.expirationPolicy ?? 'absolute';
    this.maxSessions = options.maxSessions ?? 10000;

    // Validate TTL
    this.ttl = this.validateTTL(this.ttl);

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  private validateTTL(ttl: number): number {
    const MAX_TTL = 365 * 24 * 60 * 60 * 1000;  // 1 year

    if (ttl < 0) {
      throw new Error(`TTL cannot be negative. Received: ${ttl}`);
    }

    if (ttl > MAX_TTL) {
      console.warn(`TTL ${ttl}ms exceeds maximum ${MAX_TTL}ms. Clamping.`);
      return MAX_TTL;
    }

    return ttl;
  }

  async save(sessionId: string, data: T): Promise<void> {
    // Enforce max sessions limit (LRU eviction)
    if (this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      this.sessions.delete(oldestKey);
    }

    const now = Date.now();

    this.sessions.set(sessionId, {
      data,
      createdAt: now,
      expiresAt: this.ttl === 0 ? Number.MAX_SAFE_INTEGER : now + this.ttl,
      lastAccessed: now
    });
  }

  async load(sessionId: string): Promise<T | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Lazy expiration check
    const now = Date.now();

    if (now > session.expiresAt + MemorySessionStore.CLOCK_SKEW_TOLERANCE) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessed = now;

    // Sliding expiration: reset TTL on access
    if (this.expirationPolicy === 'sliding' && this.ttl > 0) {
      session.expiresAt = now + this.ttl;
    }

    return session.data;
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

  private cleanup(): void {
    const startTime = Date.now();
    let deletedCount = 0;
    const now = Date.now();

    for (const [key, session] of this.sessions) {
      if (now > session.expiresAt + MemorySessionStore.CLOCK_SKEW_TOLERANCE) {
        this.sessions.delete(key);
        deletedCount++;
      }
    }

    const duration = Date.now() - startTime;

    if (deletedCount > 0) {
      console.log(`Cleanup: ${deletedCount} sessions deleted in ${duration}ms`);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.sessions.clear();
  }

  getSize(): number {
    return this.sessions.size;
  }

  getTTL(): number {
    return this.ttl;
  }
}
```

### 8.2 Complete File Session Store with TTL

```typescript
export class FileSessionStore<T> {
  private directory: string;
  private ttl: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout;
  private static readonly DEFAULT_TTL = 86400000;  // 24 hours
  private static readonly DEFAULT_CLEANUP_INTERVAL = 1800000;  // 30 minutes
  private static readonly CLOCK_SKEW_TOLERANCE = 30000;  // 30 seconds

  constructor(
    directory: string = './sessions',
    options: {
      ttl?: number;
      cleanupInterval?: number;
    } = {}
  ) {
    this.directory = directory;
    this.ttl = options.ttl ?? FileSessionStore.DEFAULT_TTL;
    this.cleanupInterval = options.cleanupInterval ?? FileSessionStore.DEFAULT_CLEANUP_INTERVAL;

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);

    // Initial cleanup
    this.cleanupExpiredSessions();
  }

  private getPath(sessionId: string): string {
    return join(this.directory, `${sessionId}.json`);
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  async save(sessionId: string, data: T): Promise<void> {
    await this.ensureDirectory();

    const now = Date.now();
    const wrapper: SessionWrapper<T> = {
      data,
      createdAt: now,
      expiresAt: this.ttl === 0 ? Number.MAX_SAFE_INTEGER : now + this.ttl,
      lastAccessed: now
    };

    const path = this.getPath(sessionId);
    const json = JSON.stringify(wrapper, null, 2);

    try {
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
      const wrapper = JSON.parse(content) as SessionWrapper<T>;

      // Lazy expiration check
      const now = Date.now();

      if (now > wrapper.expiresAt + FileSessionStore.CLOCK_SKEW_TOLERANCE) {
        await unlink(path);
        return null;
      }

      return wrapper.data;
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return null;
      }
      throw error;
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
        return false;
      }
      throw error;
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

  private async cleanupExpiredSessions(): Promise<void> {
    const startTime = Date.now();
    let deletedCount = 0;

    try {
      await this.ensureDirectory();
      const files = await readdir(this.directory);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const path = join(this.directory, file);

        try {
          // Quick check: use mtime as a filter
          const stats = await stat(path);
          if (now - stats.mtimeMs < this.ttl) {
            continue;  // File too young to be expired
          }

          // Read and check actual expiration
          const content = await readFile(path, 'utf-8');
          const wrapper = JSON.parse(content) as SessionWrapper<T>;

          if (now > wrapper.expiresAt + FileSessionStore.CLOCK_SKEW_TOLERANCE) {
            await unlink(path);
            deletedCount++;
          }
        } catch (error) {
          // Ignore individual file errors
        }
      }

      const duration = Date.now() - startTime;

      if (deletedCount > 0) {
        console.log(`File cleanup: ${deletedCount} files deleted in ${duration}ms`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}
```

---

## 9. Sources and References

### 9.1 Official Documentation

**TypeScript/Node.js:**
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Node.js File System: https://nodejs.org/api/fs.html
- Node.js Timers: https://nodejs.org/api/timers.html

**Session Management Libraries:**
- express-session: https://github.com/expressjs/session
- connect-redis: https://github.com/tj/connect-redis
- node-cache: https://github.com/node-cache/node-cache
- cache-manager: https://github.com/node-cache-manager/node-cache-manager

### 9.2 Best Practices Articles

**Session Management:**
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Session Management Best Practices: https://auth0.com/docs/secure/authenticate/session-lifecycle

**Memory Management:**
- Node.js Memory Leaks: https://nodejs.org/en/docs/guides/simple-profiling/
- V8 Garbage Collection: https://v8.dev/blog/trash-talk

**TTL and Expiration:**
- Redis EXPIRE Documentation: https://redis.io/commands/expire/
- Cache Expiration Strategies: https://aws.amazon.com/caching/best-practices/

### 9.3 Implementation References

**File-Based Cleanup:**
- Node.js File System Best Practices: https://nodejs.org/en/docs/guides/simple-profiling/
- Atomic File Operations: https://nodejs.org/api/fs.html#fs_fsync_fd_callback

**Clock Skew Handling:**
- NTP Documentation: https://www.ntp.org/documentation/
- Monotonic Clocks: https://nodejs.org/api/process.html#processhrtime-bigint

### 9.4 Code Examples

**Express-Session Implementation:**
- Source: https://github.com/expressjs/session/blob/master/session/store.js
- Reference for cookie maxAge and rolling sessions

**connect-redis Implementation:**
- Source: https://github.com/tj/connect-redis/blob/master/lib/connect-redis.ts
- Reference for Redis TTL integration

---

## Key Takeaways

### TTL Storage
1. **Use wrapper objects** combining data and metadata
2. **Absolute timestamps** are preferred over relative
3. **Milliseconds** are standard for application-level TTL

### Expiration Strategies
1. **Hybrid expiration** (lazy + active) is recommended
2. **Sliding expiration** for user sessions, **absolute** for cache
3. **Adaptive cleanup** intervals based on load

### Clock Skew
1. **Tolerance windows** of 30-60 seconds handle most issues
2. **Validate timestamps** for sanity checks
3. **Monotonic clocks** for short-lived in-memory caches

### Edge Cases
1. **Validate TTL range**: 0 (disabled) to MAX_TTL (1 year)
2. **Reject negative TTL** (except -1 for disabled)
3. **Clamp excessively large values**

### File-Based Cleanup
1. **Hybrid approach**: lazy on load + periodic background
2. **Use stat()** as a quick filter before reading
3. **Batch processing** to avoid blocking
4. **Yield to event loop** between batches

### Performance
1. **Default cleanup interval**: 5 minutes
2. **Batch size**: 100-1000 items per cycle
3. **Monitor metrics**: duration, deleted count, remaining count
4. **Adjust intervals** based on monitoring data

---

**Note:** This research document compiles best practices from industry standards, popular library implementations, and common patterns. For specific library implementations, refer to the official documentation and source code links provided.

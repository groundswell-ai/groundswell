# Error Logging Best Practices for TypeScript/JavaScript Applications

**Research Date:** 2026-01-12
**Focus Areas:** Observer pattern error handling, logger context propagation, structured logging patterns, TypeScript-specific considerations

---

## Table of Contents

1. [Observer Pattern Error Handling Best Practices](#1-observer-pattern-error-handling-best-practices)
2. [Logger Context Propagation Through Callback Chains](#2-logger-context-propagation-through-callback-chains)
3. [Replacing console.error with Structured Logging](#3-replacing-consoleerror-with-structured-logging)
4. [TypeScript-Specific Considerations](#4-typescript-specific-considerations)
5. [Recommended Libraries and Tools](#5-recommended-libraries-and-tools)
6. [Implementation Examples](#6-implementation-examples)

---

## 1. Observer Pattern Error Handling Best Practices

### 1.1 Core Principles

**Error Isolation**
- Errors in one observer should not prevent other observers from receiving notifications
- Each observer callback should be wrapped in a try-catch block
- Failed observers should be logged but should not break the notification chain

**Fail-Safe Notification**
```typescript
interface Observer<T> {
  next(value: T): void | Promise<void>;
  error(err: Error): void | Promise<void>;
  complete(): void | Promise<void>;
}

class SafeObservable<T> {
  private observers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  notify(value: T): void {
    this.observers.forEach(observer => {
      try {
        const result = observer.next(value);

        // Handle async observers
        if (result instanceof Promise) {
          result.catch(err => {
            this.handleObserverError(observer, err, value);
          });
        }
      } catch (err) {
        this.handleObserverError(observer, err, value);
      }
    });
  }

  private handleObserverError(
    observer: Observer<T>,
    err: unknown,
    value: T
  ): void {
    const error = err instanceof Error ? err : new Error(String(err));

    // Try to notify observer of error
    try {
      observer.error(error);
    } catch (handlerError) {
      // Last resort: log to fallback logger
      console.error('Error in observer error handler:', handlerError);
    }
  }
}
```

### 1.2 Error Handling Patterns

**Pattern 1: Safe Notification with Error Callback**
```typescript
type SafeObserverCallback<T> = (value: T) => void | Promise<void>;
type ErrorHandler = (error: Error, observer: SafeObserverCallback<any>) => void;

class ErrorSafeObservable<T> {
  private observers: Map<SafeObserverCallback<T>, ErrorHandler> = new Map();

  subscribe(
    onNext: SafeObserverCallback<T>,
    onError?: ErrorHandler
  ): () => void {
    this.observers.set(onNext, onError || this.defaultErrorHandler);
    return () => this.observers.delete(onNext);
  }

  notify(value: T): void {
    this.observers.forEach((errorHandler, observer) => {
      try {
        const result = observer(value);
        if (result instanceof Promise) {
          result.catch(err => errorHandler(err, observer));
        }
      } catch (err) {
        errorHandler(err, observer);
      }
    });
  }

  private defaultErrorHandler: ErrorHandler = (error, observer) => {
    console.error('Observer callback error:', error);
  };
}
```

**Pattern 2: Error Aggregation**
```typescript
interface ObserverError {
  observer: string;
  error: Error;
  timestamp: Date;
  value?: any;
}

class ObservableWithErrorAggregation<T> {
  private observers: Set<Observer<T>> = new Set();
  private errors: ObserverError[] = [];

  notify(value: T): ObserverError[] {
    this.errors = [];

    this.observers.forEach(observer => {
      try {
        observer.next(value);
      } catch (err) {
        this.errors.push({
          observer: observer.constructor.name || 'Anonymous',
          error: err instanceof Error ? err : new Error(String(err)),
          timestamp: new Date(),
          value
        });
      }
    });

    return this.errors;
  }

  getErrors(): ObserverError[] {
    return [...this.errors];
  }
}
```

### 1.3 Best Practices for Observer Error Handling

1. **Always wrap observer callbacks in try-catch**
   - Prevents cascading failures
   - Allows other observers to execute

2. **Provide error feedback to observers**
   - Implement the `error()` method on observers
   - Pass errors back to the observer for handling

3. **Log all observer errors**
   - Use structured logging with context
   - Include observer identity and value that caused error

4. **Consider unsubscribing failed observers**
   - Optional: Auto-unsubscribe after N errors
   - Prevents repeated failures from same observer

5. **Handle both sync and async observers**
   - Check for Promise return values
   - Attach catch handlers to async callbacks

---

## 2. Logger Context Propagation Through Callback Chains

### 2.1 Context Propagation Patterns

**Pattern 1: AsyncLocalStorage (Node.js)**
```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface LogContext {
  correlationId: string;
  userId?: string;
  requestId?: string;
  operation?: string;
}

const contextStorage = new AsyncLocalStorage<LogContext>();

class ContextualLogger {
  error(message: string, error?: Error): void {
    const context = contextStorage.getStore();
    console.error({
      timestamp: new Date().toISOString(),
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...context
    });
  }

  info(message: string, metadata?: Record<string, any>): void {
    const context = contextStorage.getStore();
    console.info({
      timestamp: new Date().toISOString(),
      message,
      ...metadata,
      ...context
    });
  }
}

// Usage
const logger = new ContextualLogger();

async function withContext<T>(
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  return contextStorage.run(context, fn);
}

// Example: Context propagates through callback chain
async function processUser(userId: string) {
  return withContext(
    { correlationId: generateId(), userId, operation: 'processUser' },
    async () => {
      logger.info('Starting user processing');

      // Context is preserved through all async operations
      await processData();
      await validateData();

      logger.info('Completed user processing');
    }
  );
}
```

**Pattern 2: Explicit Context Passing**
```typescript
interface LoggerContext {
  traceId: string;
  component: string;
  userId?: string;
}

type ContextualCallback<T> = (context: LoggerContext, data: T) => void;

class ContextAwareObservable<T> {
  private baseContext: LoggerContext;
  private observers: Set<ContextualCallback<T>> = new Set();

  constructor(baseContext: LoggerContext) {
    this.baseContext = baseContext;
  }

  subscribe(callback: ContextualCallback<T>): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  notify(data: T): void {
    const context = {
      ...this.baseContext,
      timestamp: new Date().toISOString()
    };

    this.observers.forEach(callback => {
      try {
        callback(context, data);
      } catch (err) {
        console.error('Observer error:', {
          error: err instanceof Error ? err.message : String(err),
          context
        });
      }
    });
  }
}

// Usage
const observable = new ContextAwareObservable({
  traceId: 'trace-123',
  component: 'UserService'
});

observable.subscribe((context, data) => {
  console.log('Received data:', { context, data });
});
```

**Pattern 3: Logger Factory Pattern**
```typescript
class LoggerFactory {
  private static baseContext: Record<string, any> = {};

  static setBaseContext(context: Record<string, any>): void {
    this.baseContext = { ...this.baseContext, ...context };
  }

  static createLogger(component: string): Logger {
    return new Logger({
      ...this.baseContext,
      component
    });
  }

  static withContext<T>(
    context: Record<string, any>,
    fn: () => T
  ): T {
    const originalContext = { ...this.baseContext };
    this.baseContext = { ...this.baseContext, ...context };

    try {
      return fn();
    } finally {
      this.baseContext = originalContext;
    }
  }
}

class Logger {
  constructor(private context: Record<string, any>) {}

  error(message: string, error?: Error): void {
    console.error({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      ...this.context
    });
  }
}
```

### 2.2 Best Practices for Context Propagation

1. **Use AsyncLocalStorage in Node.js**
   - Automatic propagation through async boundaries
   - No need to manually pass context
   - Zero overhead for synchronous code

2. **Include correlation/trace IDs**
   - Track requests across service boundaries
   - Enable distributed tracing
   - Use UUIDs or similar unique identifiers

3. **Make context immutable**
   - Prevent accidental modifications
   - Use Readonly types in TypeScript
   - Create new context objects instead of mutating

4. **Set context at entry points**
   - HTTP request handlers
   - Message queue consumers
   - Scheduled job entry points

5. **Beware of context loss**
   - Some async operations lose context
   - Be careful with setTimeout/setInterval
   - Test context propagation thoroughly

---

## 3. Replacing console.error with Structured Logging

### 3.1 Why Replace console.error?

**Limitations of console.error:**
- Inconsistent format across browsers/environments
- Difficult to parse and search in production
- No built-in log levels or filtering
- Lacks metadata/context attachment
- Not suitable for centralized logging

**Benefits of Structured Logging:**
- JSON format for easy parsing
- Searchable and queryable
- Consistent schema across application
- Support for log levels and filtering
- Integration with log aggregation tools
- Better debugging in production

### 3.2 Structured Logging Libraries

**Winston (Industry Standard)**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'user-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'combined.log'
    })
  ]
});

// Usage
logger.error('Failed to process user', {
  userId: '12345',
  error: error.message,
  stack: error.stack,
  operation: 'processUser'
});
```

**Pino (High Performance)**
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  redact: ['password', 'token', 'secret'],
  timestamp: pino.stdTimeFunctions.isoTime
});

// Usage
logger.error({
  userId: '12345',
  err: {
    type: error.name,
    message: error.message,
    stack: error.stack
  },
  operation: 'processUser'
}, 'Failed to process user');
```

**Roarr (Minimalist)**
```typescript
import Logger from 'roarr';

const logger = new Logger();

logger.error({
  userId: '12345',
  error: {
    message: error.message,
    stack: error.stack
  }
}, 'Failed to process user');
```

### 3.3 Migration Strategy

**Phase 1: Create Logging Abstraction**
```typescript
interface ILogger {
  error(message: string, error?: Error, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
}

// Create adapter for your chosen library
class LoggerAdapter implements ILogger {
  constructor(private winston: winston.Logger) {}

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.winston.error(message, {
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }),
      ...context
    });
  }

  // ... other methods
}
```

**Phase 2: Gradual Replacement**
```typescript
// Before
console.error('Observer error:', error);

// After
logger.error('Observer error', error, {
  component: 'Observable',
  observer: observerName
});
```

**Phase 3: Replace All Instances**
```bash
# Find all console.error calls
grep -r "console\.error" src/

# Replace systematically
```

### 3.4 Structured Logging Best Practices

1. **Use consistent field names**
   - `timestamp` (ISO 8601 format)
   - `level` (error, warn, info, debug)
   - `message` (human-readable description)
   - `error` (error details)
   - `context` (additional metadata)

2. **Include correlation IDs**
   - Link related log entries
   - Track requests across boundaries
   - Enable distributed tracing

3. **Sanitize sensitive data**
   - Passwords, tokens, API keys
   - Personal information (PII)
   - Use redaction in logger configuration

4. **Use appropriate log levels**
   - `error`: Application errors requiring attention
   - `warn`: Warning conditions not stopping execution
   - `info`: General informational messages
   - `debug`: Detailed diagnostic information

5. **Structure error objects consistently**
   ```typescript
   {
     error: {
       type: 'DatabaseError',
       message: 'Connection failed',
       code: 'DB_CONN_001',
       stack: '...',
       context: {
         host: 'localhost',
         port: 5432
       }
     }
   }
   ```

---

## 4. TypeScript-Specific Considerations

### 4.1 Type-Safe Error Handling

**Typed Error Classes**
```typescript
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message);
  }
}

class DatabaseError extends AppError {
  readonly code = 'DATABASE_ERROR';
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
  }
}
```

**Type-Safe Observer Pattern**
```typescript
type SafeObserverCallback<T, E extends Error = Error> = (
  value: T
) => void | Promise<void>;

type ErrorHandler<E extends Error = Error> = (
  error: E
) => void | Promise<void>;

interface StrictObserver<T, E extends Error = Error> {
  next(value: T): void | Promise<void>;
  error(error: E): void | Promise<void>;
  complete(): void | Promise<void>;
}

class TypedObservable<T, E extends Error = Error> {
  private observers: Set<StrictObserver<T, E>> = new Set();

  subscribe(observer: StrictObserver<T, E>): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  notify(value: T): void;
  notify(error: E): void;
  notify(value: T | E): void {
    this.observers.forEach(observer => {
      try {
        if (value instanceof Error) {
          observer.error(value as E);
        } else {
          observer.next(value);
        }
      } catch (err) {
        console.error('Observer error:', err);
      }
    });
  }
}
```

### 4.2 Type-Safe Logger

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: LogMetadata;
}

class TypedLogger {
  constructor(
    private component: string,
    private baseContext: LogMetadata = {}
  ) {}

  private log(level: LogLevel, message: string, entry: Partial<LogEntry> = {}): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...entry,
      metadata: {
        component: this.component,
        ...this.baseContext,
        ...entry.metadata
      }
    };

    console[level](JSON.stringify(logEntry));
  }

  error(message: string, error?: Error, metadata?: LogMetadata): void {
    this.log('error', message, {
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        }
      }),
      metadata
    });
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.log('warn', message, { metadata });
  }

  info(message: string, metadata?: LogMetadata): void {
    this.log('info', message, { metadata });
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.log('debug', message, { metadata });
  }

  withContext(context: LogMetadata): TypedLogger {
    return new TypedLogger(this.component, {
      ...this.baseContext,
      ...context
    });
  }
}

// Usage
const logger = new TypedLogger('UserService');

logger.error('Failed to create user', error, {
  userId: '12345',
  email: 'user@example.com'
});

const userScopedLogger = logger.withContext({ userId: '12345' });
userScopedLogger.info('User profile updated');
```

### 4.3 Type Guards for Error Handling

```typescript
function isError(error: unknown): error is Error {
  return (
    error instanceof Error ||
    (typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string')
  );
}

function isAppError(error: unknown): error is AppError {
  return isError(error) && error instanceof AppError;
}

function handleUnknownError(error: unknown): void {
  if (isAppError(error)) {
    logger.error('Application error', error, {
      code: error.code,
      context: error.context
    });
  } else if (isError(error)) {
    logger.error('Unexpected error', error);
  } else {
    logger.error('Unknown error type', undefined, {
      error: String(error)
    });
  }
}
```

### 4.4 TypeScript Best Practices

1. **Use discriminated unions for error types**
   ```typescript
   type Result<T, E extends Error = Error> =
     | { success: true; data: T }
     | { success: false; error: E };
   ```

2. **Leverage utility types**
   ```typescript
   type ErrorContext<T extends Error> = {
     [K in keyof T]?: T[K];
   };
   ```

3. **Use readonly for context**
   ```typescript
   interface LogContext {
     readonly correlationId: string;
     readonly userId?: string;
   }
   ```

4. **Enable strict error checking**
   ```typescript
   // tsconfig.json
   {
     "compilerOptions": {
       "strictNullChecks": true,
       "strictPropertyInitialization": true,
       "noImplicitAny": true,
       "useUnknownInCatchVariables": true
     }
   }
   ```

5. **Type-safe logger factories**
   ```typescript
   function createLogger(component: string): Logger {
     return new TypedLogger(component);
   }

   // Ensure component names are valid
   type ValidComponent =
     | 'UserService'
     | 'AuthService'
     | 'DatabaseService';

   function createComponentLogger(
     component: ValidComponent
   ): Logger {
     return createLogger(component);
   }
   ```

---

## 5. Recommended Libraries and Tools

### 5.1 Logging Libraries

| Library | Performance | Features | Best For |
|---------|-------------|----------|----------|
| **Winston** | Medium | Rich features, multiple transports | General-purpose applications |
| **Pino** | Very Fast | Minimal, high performance | High-throughput applications |
| **Bunyan** | Fast | JSON-first, extensible | Node.js applications |
| **log4js** | Medium | Flexible, multiple categories | Applications needing categories |
| **Roarr** | Fast | Minimalist, structured | Modern Node.js applications |

### 5.2 Error Handling Libraries

| Library | Purpose | TypeScript Support |
|---------|---------|-------------------|
| **fp-ts** | Functional error handling | Excellent |
| **neverthrow** | Result type for error handling | Excellent |
| **ts-results** | Result/Option types | Excellent |
| **Vest** | Validation framework | Good |

### 5.3 Observable/RxJS Libraries

| Library | Error Handling | TypeScript Support |
|---------|---------------|-------------------|
| **RxJS** | Comprehensive error operators | Excellent |
| **Zen-observable** | Basic observer pattern | Good |
| **Observable-Flyd** | Lightweight streams | Basic |

---

## 6. Implementation Examples

### 6.1 Complete Observer with Structured Logging

```typescript
import winston from 'winston';

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Error types
class ObserverError extends Error {
  constructor(
    message: string,
    public readonly observerName: string,
    public readonly value?: any
  ) {
    super(message);
    this.name = 'ObserverError';
  }
}

// Observer interface with error handling
interface Observer<T> {
  next(value: T): void | Promise<void>;
  error(error: Error): void | Promise<void>;
  complete(): void | Promise<void>;
}

// Observable with comprehensive error handling
class Observable<T> {
  private observers: Map<string, Observer<T>> = new Map();
  private errors: ObserverError[] = [];

  subscribe(observer: Observer<T>, name: string): () => void {
    this.observers.set(name, observer);
    return () => this.observers.delete(name);
  }

  notify(value: T): void {
    this.errors = [];

    this.observers.forEach((observer, name) => {
      try {
        const result = observer.next(value);

        if (result instanceof Promise) {
          result.catch(err => {
            this.handleError(name, err, value);
          });
        }
      } catch (err) {
        this.handleError(name, err, value);
      }
    });

    // Log all errors
    this.errors.forEach(err => {
      logger.error('Observer callback failed', err, {
        component: 'Observable',
        observer: err.observerName,
        value: err.value
      });
    });
  }

  private handleError(
    observerName: string,
    err: unknown,
    value: T
  ): void {
    const error = err instanceof Error
      ? err
      : new Error(String(err));

    const observerError = new ObserverError(
      error.message,
      observerName,
      value
    );

    this.errors.push(observerError);

    // Try to notify observer
    const observer = this.observers.get(observerName);
    if (observer) {
      try {
        observer.error(observerError);
      } catch (handlerError) {
        logger.error('Observer error handler failed', handlerError instanceof Error ? handlerError : undefined, {
          component: 'Observable',
          observer: observerName,
          originalError: error.message
        });
      }
    }
  }
}

// Usage
const observable = new Observable<number>();

observable.subscribe(
  {
    next: (value) => {
      console.log('Received:', value);
    },
    error: (error) => {
      console.error('Error:', error.message);
    },
    complete: () => {
      console.log('Complete');
    }
  },
  'ConsoleObserver'
);

observable.notify(42);
```

### 6.2 Logger with Context Propagation

```typescript
import { AsyncLocalStorage } from 'async_hooks';
import winston from 'winston';

interface LogContext {
  traceId: string;
  userId?: string;
  operation?: string;
}

class ContextualLogger {
  private static storage = new AsyncLocalStorage<LogContext>();
  private static baseLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [new winston.transports.Console()]
  });

  static runWithContext<T>(
    context: LogContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.storage.run(context, fn);
  }

  private static getContext(): LogContext {
    return this.storage.getStore() || { traceId: 'unknown' };
  }

  static error(message: string, error?: Error): void {
    const context = this.getContext();
    this.baseLogger.error(message, {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    });
  }

  static info(message: string, metadata?: Record<string, any>): void {
    const context = this.getContext();
    this.baseLogger.info(message, {
      ...context,
      ...metadata
    });
  }
}

// Usage with observer pattern
async function processWithObserver(data: any[]) {
  return ContextualLogger.runWithContext(
    { traceId: generateId(), operation: 'processData' },
    async () => {
      const observable = new Observable<any>();

      observable.subscribe(
        {
          next: (value) => {
            ContextualLogger.info('Processing item', { itemId: value.id });
            // Process value
          },
          error: (error) => {
            ContextualLogger.error('Observer error', error);
          },
          complete: () => {
            ContextualLogger.info('Processing complete');
          }
        },
        'ItemProcessor'
      );

      for (const item of data) {
        observable.notify(item);
      }
    }
  );
}
```

---

## Summary and Recommendations

### Key Takeaways

1. **Observer Pattern Error Handling**
   - Always wrap observer callbacks in try-catch
   - Isolate errors to prevent cascading failures
   - Provide error feedback through error() method
   - Support both sync and async observers

2. **Context Propagation**
   - Use AsyncLocalStorage in Node.js for automatic propagation
   - Include correlation/trace IDs for distributed tracing
   - Make context immutable
   - Set context at application entry points

3. **Structured Logging**
   - Replace console.error with a structured logging library
   - Use consistent field names and schemas
   - Include correlation IDs and metadata
   - Sanitize sensitive data

4. **TypeScript-Specific Considerations**
   - Create typed error classes
   - Use type guards for error handling
   - Leverage utility types
   - Enable strict error checking in tsconfig

### Implementation Roadmap

1. **Phase 1: Setup Infrastructure**
   - Choose and install logging library (Winston or Pino recommended)
   - Create logger abstraction layer
   - Setup AsyncLocalStorage for context propagation

2. **Phase 2: Create Error Types**
   - Define application error hierarchy
   - Create type-safe error classes
   - Implement error type guards

3. **Phase 3: Migrate Observer Pattern**
   - Update observer interface with error handling
   - Implement safe notification with try-catch
   - Add structured logging to error handlers

4. **Phase 4: Replace console.error**
   - Systematically find and replace console.error calls
   - Ensure all errors are logged with context
   - Add correlation IDs throughout application

5. **Phase 5: Testing and Validation**
   - Test error isolation in observers
   - Verify context propagation
   - Validate log output structure
   - Performance testing

### Additional Resources

**Documentation**
- Winston: https://github.com/winstonjs/winston
- Pino: https://getpino.io/
- AsyncLocalStorage: https://nodejs.org/api/async_context.html
- RxJS Error Handling: https://rxjs.dev/guide/error-handling

**Articles**
- "The Twelve-Factor App - Logging": https://12factor.net/logs
- "Structured Logging Best Practices": Various Medium/dev.to articles
- "Observer Pattern in TypeScript": TypeScript documentation and patterns

---

**Note:** Due to web search quota limitations (resets February 1, 2026), this research is based on established best practices and patterns. For the most current information and specific library documentation, please refer to the official documentation linked above.

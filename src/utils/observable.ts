/**
 * Lightweight Observable implementation for event streaming
 * No external dependencies
 */
export interface Subscription {
  unsubscribe(): void;
}

export interface Observer<T> {
  next?: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}

/**
 * Logger interface for Observable error logging
 * Matches WorkflowLogger.error() signature for compatibility
 */
export interface ObservableLogger {
  error(message: string, data?: unknown): void;
}

export class Observable<T> {
  private subscribers: Set<Observer<T>> = new Set();
  private logger?: ObservableLogger;

  /**
   * Create a new Observable
   * @param logger Optional logger for error reporting (falls back to console.error)
   */
  constructor(logger?: ObservableLogger) {
    this.logger = logger;
  }

  /**
   * Subscribe to this observable
   * @returns Subscription with unsubscribe method
   */
  subscribe(observer: Observer<T>): Subscription {
    this.subscribers.add(observer);
    return {
      unsubscribe: () => {
        this.subscribers.delete(observer);
      },
    };
  }

  /**
   * Log errors using injected logger or fallback to console.error
   */
  private logError(message: string, error: unknown): void {
    if (this.logger) {
      this.logger.error(message, { error });
    } else {
      // Fallback for backward compatibility
      console.error(message, error);
    }
  }

  /**
   * Emit a value to all subscribers
   */
  next(value: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.next?.(value);
      } catch (err) {
        this.logError('Observable subscriber error', err);
      }
    }
  }

  /**
   * Signal an error to all subscribers
   */
  error(err: unknown): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.error?.(err);
      } catch (e) {
        this.logError('Observable error handler failed', e);
      }
    }
  }

  /**
   * Signal completion to all subscribers
   */
  complete(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber.complete?.();
      } catch (err) {
        this.logError('Observable complete handler failed', err);
      }
    }
    this.subscribers.clear();
  }

  /**
   * Get current subscriber count
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }
}

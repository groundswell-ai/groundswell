import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Observable, ObservableLogger } from '../../utils/observable';

describe('Observable', () => {
  describe('with logger injection', () => {
    let mockLogger: ObservableLogger;

    beforeEach(() => {
      mockLogger = {
        error: vi.fn(),
      };
    });

    it('should log subscriber next() errors via logger', () => {
      const observable = new Observable<number>(mockLogger);
      const testError = new Error('Next error');

      const throwingSubscriber = {
        next: () => {
          throw testError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.next(42);

      expect(mockLogger.error).toHaveBeenCalledWith('Observable subscriber error', {
        error: testError,
      });
    });

    it('should log subscriber error() errors via logger', () => {
      const observable = new Observable<number>(mockLogger);
      const testError = new Error('Error handler failed');
      const handlerError = new Error('Handler threw');

      const throwingSubscriber = {
        error: () => {
          throw handlerError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.error(testError);

      expect(mockLogger.error).toHaveBeenCalledWith('Observable error handler failed', {
        error: handlerError,
      });
    });

    it('should log subscriber complete() errors via logger', () => {
      const observable = new Observable<number>(mockLogger);
      const completeError = new Error('Complete handler failed');

      const throwingSubscriber = {
        complete: () => {
          throw completeError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.complete();

      expect(mockLogger.error).toHaveBeenCalledWith('Observable complete handler failed', {
        error: completeError,
      });
    });

    it('should continue notifying other subscribers after one throws', () => {
      const observable = new Observable<number>(mockLogger);
      const testError = new Error('First subscriber error');

      const results: number[] = [];

      const throwingSubscriber = {
        next: () => {
          throw testError;
        },
      };

      const workingSubscriber = {
        next: (value: number) => {
          results.push(value);
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.subscribe(workingSubscriber);
      observable.next(42);

      expect(results).toEqual([42]);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle multiple throwing subscribers', () => {
      const observable = new Observable<number>(mockLogger);
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      const throwingSubscriber1 = {
        next: () => {
          throw error1;
        },
      };

      const throwingSubscriber2 = {
        next: () => {
          throw error2;
        },
      };

      observable.subscribe(throwingSubscriber1);
      observable.subscribe(throwingSubscriber2);
      observable.next(42);

      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Observable subscriber error', {
        error: error1,
      });
      expect(mockLogger.error).toHaveBeenNthCalledWith(2, 'Observable subscriber error', {
        error: error2,
      });
    });
  });

  describe('without logger (fallback)', () => {
    it('should fall back to console.error when no logger provided', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const observable = new Observable<number>();
      const testError = new Error('Next error');

      const throwingSubscriber = {
        next: () => {
          throw testError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.next(42);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Observable subscriber error', testError);
      consoleErrorSpy.mockRestore();
    });

    it('should fall back to console.error for error() method', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const observable = new Observable<number>();
      const handlerError = new Error('Handler threw');

      const throwingSubscriber = {
        error: () => {
          throw handlerError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.error(new Error('Original error'));

      expect(consoleErrorSpy).toHaveBeenCalledWith('Observable error handler failed', handlerError);
      consoleErrorSpy.mockRestore();
    });

    it('should fall back to console.error for complete() method', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const observable = new Observable<number>();
      const completeError = new Error('Complete threw');

      const throwingSubscriber = {
        complete: () => {
          throw completeError;
        },
      };

      observable.subscribe(throwingSubscriber);
      observable.complete();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Observable complete handler failed', completeError);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('backward compatibility', () => {
    it('should work without any constructor arguments', () => {
      const observable = new Observable<number>();
      const results: number[] = [];

      const subscriber = {
        next: (value: number) => {
          results.push(value);
        },
      };

      observable.subscribe(subscriber);
      observable.next(1);
      observable.next(2);
      observable.next(3);

      expect(results).toEqual([1, 2, 3]);
    });

    it('should support subscribe/unsubscribe cycle', () => {
      const observable = new Observable<number>();
      const results: number[] = [];

      const subscriber = {
        next: (value: number) => {
          results.push(value);
        },
      };

      const subscription = observable.subscribe(subscriber);
      observable.next(1);
      subscription.unsubscribe();
      observable.next(2);

      expect(results).toEqual([1]);
    });

    it('should report subscriber count correctly', () => {
      const observable = new Observable<number>();

      const subscriber1 = { next: () => {} };
      const subscriber2 = { next: () => {} };

      expect(observable.subscriberCount).toBe(0);

      const sub1 = observable.subscribe(subscriber1);
      expect(observable.subscriberCount).toBe(1);

      const sub2 = observable.subscribe(subscriber2);
      expect(observable.subscriberCount).toBe(2);

      sub1.unsubscribe();
      expect(observable.subscriberCount).toBe(1);

      sub2.unsubscribe();
      expect(observable.subscriberCount).toBe(0);
    });

    it('should clear subscribers on complete', () => {
      const observable = new Observable<number>();
      const subscriber = { next: () => {}, complete: () => {} };

      observable.subscribe(subscriber);
      expect(observable.subscriberCount).toBe(1);

      observable.complete();
      expect(observable.subscriberCount).toBe(0);
    });
  });

  describe('error isolation', () => {
    let mockLogger: ObservableLogger;

    beforeEach(() => {
      mockLogger = {
        error: vi.fn(),
      };
    });

    it('should not propagate errors outside try-catch', () => {
      const observable = new Observable<number>(mockLogger);
      const testError = new Error('Subscriber error');

      const throwingSubscriber = {
        next: () => {
          throw testError;
        },
      };

      observable.subscribe(throwingSubscriber);

      // This should not throw
      expect(() => {
        observable.next(42);
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle undefined optional callbacks', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const observable = new Observable<number>();

      const subscriberWithMissingCallbacks = {
        // next is undefined
        // error is undefined
        // complete is undefined
      };

      observable.subscribe(subscriberWithMissingCallbacks);

      // Should not throw when callbacks are undefined
      expect(() => {
        observable.next(42);
        observable.error(new Error('test'));
        observable.complete();
      }).not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('ObservableLogger interface', () => {
    it('should match WorkflowLogger.error() signature', () => {
      const mockLogger: ObservableLogger = {
        error: vi.fn(),
      };

      const observable = new Observable<number>(mockLogger);

      // Test the signature matches: error(message: string, data?: unknown): void
      mockLogger.error('test message');
      mockLogger.error('test message', { key: 'value' });
      mockLogger.error('test message', { error: new Error('test') });
      mockLogger.error('test message', undefined);

      expect(mockLogger.error).toHaveBeenCalledTimes(4);
    });
  });
});

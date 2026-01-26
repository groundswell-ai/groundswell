import { describe, it, expect } from 'vitest';
import { Workflow, Step, WorkflowEvent, type WorkflowError } from '../../index.js';

describe('@Step decorator with retry options', () => {
  it('should not retry when restartable is false', async () => {
    class FailingWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: false })
      async failingStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Step failed');
      }

      async run(): Promise<void> {
        await this.failingStep();
      }
    }

    const wf = new FailingWorkflow();

    await expect(wf.run()).rejects.toThrow('Step failed');
    expect(wf.attemptCount).toBe(1);  // Only one attempt
  });

  it('should not retry when restartable is undefined', async () => {
    class NoOptionsWorkflow extends Workflow {
      attemptCount = 0;

      @Step()  // No options - should NOT retry
      async failingStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Step failed');
      }

      async run(): Promise<void> {
        await this.failingStep();
      }
    }

    const wf = new NoOptionsWorkflow();

    await expect(wf.run()).rejects.toThrow('Step failed');
    expect(wf.attemptCount).toBe(1);  // Only one attempt
  });

  it('should retry when restartable is true', async () => {
    class RetryWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 3 })
      async retryableStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 3) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        await this.retryableStep();
      }
    }

    const wf = new RetryWorkflow();
    await wf.run();

    expect(wf.attemptCount).toBe(3);  // Initial + 2 retries
  });

  it('should stop retrying after maxRetries exceeded', async () => {
    class MaxRetriesWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 2 })
      async failingStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Persistent failure');
      }

      async run(): Promise<void> {
        await this.failingStep();
      }
    }

    const wf = new MaxRetriesWorkflow();

    await expect(wf.run()).rejects.toThrow('Persistent failure');
    expect(wf.attemptCount).toBe(3);  // Initial + 2 retries (maxRetries = 2 means 3 total attempts)
  });

  it('should emit stepRetry event on each retry', async () => {
    const events: WorkflowEvent[] = [];

    class RetryWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 3 })
      async retryableStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        this.addObserver({
          onLog: () => {},
          onEvent: (e) => events.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });

        await this.retryableStep();
      }
    }

    const wf = new RetryWorkflow();
    await wf.run();

    const retryEvents = events.filter(e => e.type === 'stepRetry');
    expect(retryEvents.length).toBe(1);  // One retry event

    if (retryEvents[0]?.type === 'stepRetry') {
      expect(retryEvents[0].retryCount).toBe(1);
      expect(retryEvents[0].step).toBe('retryableStep');
    }
  });

  it('should respect retryDelayMs delay between retries', async () => {
    const timestamps: number[] = [];

    class DelayWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 2, retryDelayMs: 100 })
      async delayedStep(): Promise<void> {
        timestamps.push(Date.now());
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        await this.delayedStep();
      }
    }

    const wf = new DelayWorkflow();
    await wf.run();

    expect(timestamps.length).toBe(2);
    const delay = timestamps[1] - timestamps[0];
    expect(delay).toBeGreaterThanOrEqual(100);  // At least 100ms delay
  });

  it('should not retry when error does not match retryOn criteria', async () => {
    class CriteriaWorkflow extends Workflow {
      attemptCount = 0;

      @Step({
        restartable: true,
        maxRetries: 3,
        retryOn: [
          { code: 'TEMPORARY_FAILURE' }  // Only retry on this specific code
        ]
      })
      async conditionalStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Different error');  // Does not match criteria
      }

      async run(): Promise<void> {
        await this.conditionalStep();
      }
    }

    const wf = new CriteriaWorkflow();

    await expect(wf.run()).rejects.toThrow('Different error');
    expect(wf.attemptCount).toBe(1);  // Only one attempt (no retry)
  });

  it('should retry when error matches retryOn code criterion (string)', async () => {
    class CodeMatchWorkflow extends Workflow {
      attemptCount = 0;

      @Step({
        restartable: true,
        maxRetries: 3,
        retryOn: [
          { code: 'TEMPORARY_FAILURE' }
        ]
      })
      async conditionalStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('TEMPORARY_FAILURE');  // Matches criteria
        }
      }

      async run(): Promise<void> {
        await this.conditionalStep();
      }
    }

    const wf = new CodeMatchWorkflow();
    await wf.run();

    expect(wf.attemptCount).toBe(2);  // Initial + 1 retry
  });

  it('should retry when error matches retryOn code criterion (regex)', async () => {
    class RegexMatchWorkflow extends Workflow {
      attemptCount = 0;

      @Step({
        restartable: true,
        maxRetries: 3,
        retryOn: [
          { code: /TIMEOUT|NETWORK_ERROR/ }
        ]
      })
      async conditionalStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('NETWORK_ERROR occurred');  // Matches regex
        }
      }

      async run(): Promise<void> {
        await this.conditionalStep();
      }
    }

    const wf = new RegexMatchWorkflow();
    await wf.run();

    expect(wf.attemptCount).toBe(2);  // Initial + 1 retry
  });

  it('should retry when error matches retryOn function criterion', async () => {
    class FunctionMatchWorkflow extends Workflow {
      attemptCount = 0;

      @Step({
        restartable: true,
        maxRetries: 3,
        retryOn: [
          (error: WorkflowError) => error.message.includes('timeout')
        ]
      })
      async conditionalStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('Network timeout occurred');  // Matches function
        }
      }

      async run(): Promise<void> {
        await this.conditionalStep();
      }
    }

    const wf = new FunctionMatchWorkflow();
    await wf.run();

    expect(wf.attemptCount).toBe(2);  // Initial + 1 retry
  });

  it('should retry when error matches any of multiple retryOn criteria', async () => {
    class MultipleCriteriaWorkflow extends Workflow {
      attemptCount = 0;

      @Step({
        restartable: true,
        maxRetries: 5,
        retryOn: [
          { code: 'TEMPORARY_FAILURE' },
          { code: /timeout/i },  // Case-insensitive regex for timeout
          (error: WorkflowError) => error.message.includes('network')
        ]
      })
      async conditionalStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount === 1) {
          throw new Error('TEMPORARY_FAILURE');  // Matches first criterion
        }
        if (this.attemptCount === 2) {
          throw new Error('Connection timeout');  // Matches second criterion (regex)
        }
        if (this.attemptCount === 3) {
          throw new Error('network error occurred');  // Matches third criterion (function)
        }
      }

      async run(): Promise<void> {
        await this.conditionalStep();
      }
    }

    const wf = new MultipleCriteriaWorkflow();
    await wf.run();

    expect(wf.attemptCount).toBe(4);  // Initial + 3 retries
  });

  it('should emit stepStart, stepRetry, and stepEnd events in order', async () => {
    const events: WorkflowEvent[] = [];

    class EventsWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 2 })
      async retryableStep(): Promise<void> {
        this.attemptCount++;
        if (this.attemptCount < 2) {
          throw new Error('Temporary failure');
        }
      }

      async run(): Promise<void> {
        this.addObserver({
          onLog: () => {},
          onEvent: (e) => events.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });

        await this.retryableStep();
      }
    }

    const wf = new EventsWorkflow();
    await wf.run();

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('stepStart');
    expect(eventTypes).toContain('stepRetry');
    expect(eventTypes).toContain('stepEnd');

    // Verify ordering: stepStart comes before stepRetry, stepRetry comes before stepEnd
    const startIdx = eventTypes.indexOf('stepStart');
    const retryIdx = eventTypes.indexOf('stepRetry');
    const endIdx = eventTypes.indexOf('stepEnd');

    expect(startIdx).toBeLessThan(retryIdx);
    expect(retryIdx).toBeLessThan(endIdx);
  });

  it('should work with existing @Step options (backward compatibility)', async () => {
    class BackwardCompatWorkflow extends Workflow {
      @Step({ trackTiming: true, logStart: true, logFinish: true })
      async oldOptionsStep(): Promise<string> {
        return 'success';
      }

      async run(): Promise<string> {
        return this.oldOptionsStep();
      }
    }

    const wf = new BackwardCompatWorkflow();
    const result = await wf.run();

    expect(result).toBe('success');
  });

  it('should handle zero maxRetries (no retries)', async () => {
    class ZeroRetriesWorkflow extends Workflow {
      attemptCount = 0;

      @Step({ restartable: true, maxRetries: 0 })
      async noRetryStep(): Promise<void> {
        this.attemptCount++;
        throw new Error('Failed immediately');
      }

      async run(): Promise<void> {
        await this.noRetryStep();
      }
    }

    const wf = new ZeroRetriesWorkflow();

    await expect(wf.run()).rejects.toThrow('Failed immediately');
    expect(wf.attemptCount).toBe(1);  // Only one attempt
  });
});

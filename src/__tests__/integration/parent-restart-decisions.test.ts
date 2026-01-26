/**
 * Integration Test: Parent-Child Restart Decisions
 *
 * Validates the complete parent-driven child workflow restart pattern using:
 * - @Step(restartable: true) decorator on child workflow steps
 * - analyzeError() method for intelligent error analysis
 * - restartStep() method for targeted step re-execution
 * - Event emission and propagation through parent-child hierarchy
 * - State preservation across restart boundaries
 *
 * This test demonstrates the full error flow from child failure through
 * parent analysis to successful restart and re-execution.
 */

import { describe, it, expect } from 'vitest';
import {
  Workflow,
  Step,
  Task,
  ObservedState,
  WorkflowObserver,
  WorkflowEvent,
  WorkflowTreeDebugger,
  type WorkflowError,
} from '../../index.js';

/**
 * Child workflow with a restartable step that fails transiently
 *
 * Pattern from: examples/03-parent-child.ts
 * - Uses @ObservedState for state tracking
 * - Uses @Step decorator with restartable option
 * - Fails on first attempt, succeeds on second
 *
 * CRITICAL: maxRetries: 0 means no automatic retry - the step will fail immediately
 * This allows the parent to catch the error and drive the restart manually
 */
class ChildWorkflow extends Workflow {
  @ObservedState()
  attemptCount = 0;

  @ObservedState()
  lastError: string | null = null;

  // CRITICAL: stepName is needed for analyzeError to work
  // analyzeError looks for error.state.stepName to determine which step failed
  @ObservedState()
  stepName: string | null = null;

  constructor(name: string, parent?: Workflow) {
    super(name, parent);
  }

  @Step({ restartable: true, maxRetries: 0, retryOn: [{ code: /TRANSIENT_ERROR/ }] })
  async flakyOperation(): Promise<string> {
    this.stepName = 'flakyOperation';
    this.attemptCount++;
    if (this.attemptCount === 1) {
      this.lastError = 'TRANSIENT_ERROR';
      throw new Error('TRANSIENT_ERROR: Temporary failure');
    }
    return 'success';
  }

  async run(): Promise<string> {
    return await this.flakyOperation();
  }
}

/**
 * Parent workflow that manages child restart
 *
 * Pattern from: examples/03-parent-child.ts
 * - Uses @Task decorator for child spawning
 * - Catches child errors and analyzes them using child's analyzeError
 * - Calls restartStep() based on analysis decision
 *
 * CRITICAL: Parent calls child.analyzeError() because:
 * - The child has the stepMetadata for its own steps
 * - The analyzeError method requires stepMetadata to work
 */
class ParentWorkflow extends Workflow {
  @ObservedState()
  restartAttempts = 0;

  @ObservedState()
  lastDecision: string | null = null;

  constructor(name: string) {
    super(name);
  }

  @Task()
  async spawnChild(): Promise<ChildWorkflow> {
    return new ChildWorkflow('Child', this);
  }

  async run(): Promise<string> {
    const child = await this.spawnChild();

    try {
      return await child.run();
    } catch (error) {
      const wfError = error as WorkflowError;
      // CRITICAL: Call child's analyzeError, not parent's
      // The child has the stepMetadata for flakyOperation
      const decision = child.analyzeError(wfError);
      this.lastDecision = decision;

      if (decision === 'retry') {
        this.restartAttempts++;
        // CRITICAL: restartStep executes the step, don't call child.run() again
        const result = await child.restartStep('flakyOperation', { retryCount: 1 }) as string;
        return result;
      }

      throw error;
    }
  }
}

describe('Integration: Parent-Child Restart Decisions', () => {
  describe('Error propagation from child to parent', () => {
    it('should propagate error from child to parent with full context', async () => {
      // ARRANGE: Create parent workflow
      const parent = new ParentWorkflow('Parent');

      // ARRANGE: Create child manually for this test
      const child = new ChildWorkflow('Child', parent);

      // ARRANGE: Populate stepMetadata for analyzeError to work
      // CRITICAL: @Step decorator doesn't populate this automatically
      (child as any).stepMetadata = new Map([
        ['flakyOperation', { options: { restartable: true, maxRetries: 0 } }],
      ]);

      // ACT & ASSERT: Run child and expect it to fail on first attempt
      await expect(child.run()).rejects.toThrow();

      // ASSERT: Verify child state reflects the failure
      expect(child.attemptCount).toBe(1);
      expect(child.lastError).toBe('TRANSIENT_ERROR');

      // ASSERT: Verify parent-child relationship
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    it('should include state, logs, and workflowId in WorkflowError', async () => {
      // ARRANGE: Create child workflow
      const child = new ChildWorkflow('TestChild');

      // ARRANGE: Populate stepMetadata
      (child as any).stepMetadata = new Map([
        ['flakyOperation', { options: { restartable: true, maxRetries: 0 } }],
      ]);

      // ACT: Run child and capture error
      let caughtError: WorkflowError | undefined;
      try {
        await child.run();
      } catch (error) {
        caughtError = error as WorkflowError;
      }

      // ASSERT: Verify WorkflowError structure
      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toContain('TRANSIENT_ERROR');
      expect(caughtError!.workflowId).toBe(child.id);
      expect(caughtError!.state).toBeDefined();
      expect(caughtError!.logs).toBeInstanceOf(Array);
      expect(caughtError!.original).toBeInstanceOf(Error);
    });
  });

  describe('Error analysis and restart decision', () => {
    it('should analyze error and return retry for transient errors', async () => {
      // ARRANGE: Create parent and child
      const parent = new ParentWorkflow('Parent');
      const child = new ChildWorkflow('Child', parent);

      // ARRANGE: Populate stepMetadata with transient error criterion
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 0,
            retryOn: [{ code: /TRANSIENT_ERROR/ }],
          },
        }],
      ]);

      // ARRANGE: Run child to generate error
      let caughtError: WorkflowError | undefined;
      try {
        await child.run();
      } catch (error) {
        caughtError = error as WorkflowError;
      }

      // ACT: Analyze the error using child's analyzeError
      // CRITICAL: Child has the stepMetadata, not parent
      const decision = child.analyzeError(caughtError!);

      // ASSERT: Verify retry decision for transient error
      expect(decision).toBe('retry');
    });

    it('should return abort for non-recoverable errors', async () => {
      // ARRANGE: Create parent and child
      const parent = new ParentWorkflow('Parent');
      const child = new ChildWorkflow('Child', parent);

      // ARRANGE: Populate stepMetadata without retry criteria
      (child as any).stepMetadata = new Map([
        ['flakyOperation', { options: { restartable: true, maxRetries: 0 } }],
      ]);

      // ARRANGE: Create a non-recoverable error
      const permanentError: WorkflowError = {
        message: 'PERMANENT_ERROR: Invalid configuration',
        original: { recoverable: false },
        workflowId: child.id,
        state: { stepName: 'flakyOperation' },
        logs: [],
      };

      // ACT: Analyze the error
      const decision = parent.analyzeError(permanentError);

      // ASSERT: Verify abort decision for non-recoverable error
      expect(decision).toBe('abort');
    });

    it('should return abort when step is not restartable', async () => {
      // ARRANGE: Create parent and child
      const parent = new ParentWorkflow('Parent');
      const child = new ChildWorkflow('Child', parent);

      // ARRANGE: Populate stepMetadata with restartable: false and maxRetries: 0
      (child as any).stepMetadata = new Map([
        ['flakyOperation', { options: { restartable: false, maxRetries: 0 } }],
      ]);

      // ARRANGE: Create a transient error
      const error: WorkflowError = {
        message: 'TRANSIENT_ERROR: Temporary failure',
        original: new Error('TRANSIENT_ERROR'),
        workflowId: child.id,
        state: { stepName: 'flakyOperation' },
        logs: [],
      };

      // ACT: Analyze the error
      const decision = parent.analyzeError(error);

      // ASSERT: Verify abort decision when step is not restartable
      expect(decision).toBe('abort');
    });
  });

  describe('Step restart and re-execution', () => {
    it('should restart child step and succeed on retry', async () => {
      // ARRANGE: Create parent workflow
      const parent = new ParentWorkflow('Parent');

      // ARRANGE: Create child and populate stepMetadata
      const child = new ChildWorkflow('Child', parent);
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 0,
            retryOn: [{ code: /TRANSIENT_ERROR/ }],
          },
        }],
      ]);

      // ARRANGE: Run child to generate first failure
      let caughtError: WorkflowError | undefined;
      try {
        await child.run();
      } catch (error) {
        caughtError = error as WorkflowError;
      }

      // ACT: Restart the step with retryCount
      const result = await child.restartStep('flakyOperation', { retryCount: 1 }) as string;

      // ASSERT: Verify step succeeded on second attempt
      expect(result).toBe('success');
      expect(child.attemptCount).toBe(2);
      expect(child.lastError).toBe('TRANSIENT_ERROR');
    });

    it('should preserve observed state across restart', async () => {
      // ARRANGE: Create child workflow
      const child = new ChildWorkflow('StateTest');
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 3,
            retryOn: [{ code: 'TRANSIENT_ERROR' }],
          },
        }],
      ]);

      // ACT: Run to first failure
      try {
        await child.run();
      } catch {
        // Expected failure
      }

      // ASSERT: Verify state after first attempt
      expect(child.attemptCount).toBe(1);
      expect(child.lastError).toBe('TRANSIENT_ERROR');

      // ACT: Restart the step
      await child.restartStep('flakyOperation', { retryCount: 1 });

      // ASSERT: Verify state preserved across restart
      expect(child.attemptCount).toBe(2);
      expect(child.lastError).toBe('TRANSIENT_ERROR');
    });

    it('should complete full parent-run flow with restart', async () => {
      // ARRANGE: Create parent workflow
      const parent = new ParentWorkflow('Parent');

      // ARRANGE: Intercept spawnChild to set stepMetadata on the created child
      const originalSpawnChild = parent.spawnChild.bind(parent);
      let childRef: ChildWorkflow | undefined;

      parent.spawnChild = async function(): Promise<ChildWorkflow> {
        const child = await originalSpawnChild();
        childRef = child;
        (child as any).stepMetadata = new Map([
          ['flakyOperation', {
            options: {
              restartable: true,
              maxRetries: 0,
              retryOn: [{ code: /TRANSIENT_ERROR/ }],
            },
          }],
        ]);
        return child;
      };

      // ACT: Run parent (which manages child restart)
      const result = await parent.run();

      // ASSERT: Verify successful execution after restart
      expect(result).toBe('success');
      expect(parent.restartAttempts).toBe(1);
      expect(parent.lastDecision).toBe('retry');
      expect(childRef).toBeDefined();
      expect(childRef!.attemptCount).toBe(2);
    });
  });

  describe('Event emission during restart flow', () => {
    it('should emit all expected events during restart flow', async () => {
      // ARRANGE: Create parent and child
      const parent = new ParentWorkflow('Parent');
      const child = new ChildWorkflow('Child', parent);
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 3,
            retryOn: [{ code: 'TRANSIENT_ERROR' }],
          },
        }],
      ]);

      // ARRANGE: Collect events using WorkflowTreeDebugger
      const debugger_ = new WorkflowTreeDebugger(parent);
      const events: WorkflowEvent[] = [];

      debugger_.events.subscribe({
        next: (event) => events.push(event),
      });

      // ACT: Run child to first failure
      try {
        await child.run();
      } catch {
        // Expected failure
      }

      // ACT: Restart the step
      await child.restartStep('flakyOperation', { retryCount: 1 });

      // ASSERT: Verify stepStart event emitted
      const stepStartEvents = events.filter(e => e.type === 'stepStart');
      expect(stepStartEvents.length).toBeGreaterThan(0);

      // ASSERT: Verify error event emitted
      const errorEvents = events.filter(e => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);

      // ASSERT: Verify stepRestarted event emitted
      const stepRestartedEvents = events.filter(e => e.type === 'stepRestarted');
      expect(stepRestartedEvents.length).toBe(1);

      // ASSERT: Verify stepRestarted event structure with type guard
      const stepRestartedEvent = stepRestartedEvents[0];
      if (stepRestartedEvent.type === 'stepRestarted') {
        expect(stepRestartedEvent.stepName).toBe('flakyOperation');
        expect(stepRestartedEvent.retryCount).toBe(2);
        expect(stepRestartedEvent.restoredState).toBeDefined();
        expect(stepRestartedEvent.timestamp).toBeGreaterThan(0);
      }
    });

    it('should propagate child events to parent observer', async () => {
      // ARRANGE: Create parent workflow
      const parent = new ParentWorkflow('Parent');

      // ARRANGE: Create observer and attach to parent (root workflow)
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      parent.addObserver(observer);

      // ARRANGE: Create child and populate stepMetadata
      const child = new ChildWorkflow('Child', parent);
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 0,
            retryOn: [{ code: /TRANSIENT_ERROR/ }],
          },
        }],
      ]);

      // ACT: Run child to generate error event
      try {
        await child.run();
      } catch {
        // Expected failure
      }

      // ASSERT: Verify parent observer received child's error event
      const errorEvents = events.filter(e => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);

      // ASSERT: Verify error event is from child workflow
      const childErrorEvent = errorEvents.find(e => {
        if (e.type === 'error') {
          return e.node.name === 'Child';
        }
        return false;
      });
      expect(childErrorEvent).toBeDefined();
    });

    it('should emit events in correct order during restart', async () => {
      // ARRANGE: Create parent and child
      const parent = new ParentWorkflow('Parent');
      const child = new ChildWorkflow('Child', parent);
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 3,
            retryOn: [{ code: 'TRANSIENT_ERROR' }],
          },
        }],
      ]);

      // ARRANGE: Collect events
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      parent.addObserver(observer);

      // ACT: Execute restart flow
      try {
        await child.run();
      } catch {
        // Expected failure
      }
      await child.restartStep('flakyOperation', { retryCount: 1 });

      // ASSERT: Verify event order
      const eventTypes = events.map(e => e.type);

      // Find indices of key events
      const stepStartIndex = eventTypes.indexOf('stepStart');
      const errorIndex = eventTypes.indexOf('error');
      const stepRestartedIndex = eventTypes.indexOf('stepRestarted');
      const stepEndIndex = eventTypes.indexOf('stepEnd');

      // ASSERT: Verify stepStart came before error
      expect(stepStartIndex).toBeLessThan(errorIndex);

      // ASSERT: Verify error came before stepRestarted
      expect(errorIndex).toBeLessThan(stepRestartedIndex);

      // ASSERT: Verify stepRestarted exists
      expect(stepRestartedIndex).toBeGreaterThanOrEqual(0);
    });
  });

  describe('State preservation and restoration', () => {
    it('should preserve @ObservedState fields across restart', async () => {
      // ARRANGE: Create child workflow
      const child = new ChildWorkflow('StatePreservationTest');
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 3,
            retryOn: [{ code: 'TRANSIENT_ERROR' }],
          },
        }],
      ]);

      // ACT: Run to first failure
      try {
        await child.run();
      } catch {
        // Expected failure
      }

      // ASSERT: Capture state before restart
      const attemptCountBefore = child.attemptCount;
      const lastErrorBefore = child.lastError;

      // ACT: Restart the step
      await child.restartStep('flakyOperation', { retryCount: 1 });

      // ASSERT: Verify state preserved (not reset)
      expect(child.attemptCount).toBe(attemptCountBefore + 1);
      expect(child.lastError).toBe(lastErrorBefore);
    });

    it('should include restoredState in stepRestarted event', async () => {
      // ARRANGE: Create child workflow
      const child = new ChildWorkflow('RestoredStateTest');
      (child as any).stepMetadata = new Map([
        ['flakyOperation', {
          options: {
            restartable: true,
            maxRetries: 3,
            retryOn: [{ code: 'TRANSIENT_ERROR' }],
          },
        }],
      ]);

      // ARRANGE: Collect events
      const events: WorkflowEvent[] = [];
      const observer: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => events.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      child.addObserver(observer);

      // ACT: Run to first failure, then restart
      try {
        await child.run();
      } catch {
        // Expected failure
      }
      await child.restartStep('flakyOperation', { retryCount: 1 });

      // ASSERT: Find stepRestarted event and verify restoredState
      const stepRestartedEvent = events.find(e => e.type === 'stepRestarted');
      expect(stepRestartedEvent).toBeDefined();

      if (stepRestartedEvent && stepRestartedEvent.type === 'stepRestarted') {
        expect(stepRestartedEvent.restoredState).toBeDefined();
        expect(typeof stepRestartedEvent.restoredState).toBe('object');
      }
    });
  });

  describe('Integration with @Task decorator', () => {
    it('should auto-attach child spawned from @Task method', async () => {
      // ARRANGE: Create parent workflow
      const parent = new ParentWorkflow('Parent');

      // ACT: Spawn child using @Task decorator
      const child = await parent.spawnChild();

      // ASSERT: Verify automatic attachment
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
    });

    it('should work with full parent-run flow including @Task', async () => {
      // ARRANGE: Create parent workflow
      const parent = new ParentWorkflow('FullFlowParent');

      // ARRANGE: Intercept child creation to populate stepMetadata
      const originalSpawnChild = parent.spawnChild.bind(parent);
      let childRef: ChildWorkflow | undefined;

      parent.spawnChild = async function(): Promise<ChildWorkflow> {
        const child = await originalSpawnChild();
        childRef = child;
        // Populate stepMetadata for analyzeError
        (child as any).stepMetadata = new Map([
          ['flakyOperation', {
            options: {
              restartable: true,
              maxRetries: 0,
              retryOn: [{ code: /TRANSIENT_ERROR/ }],
            },
          }],
        ]);
        return child;
      };

      // ACT: Run parent workflow
      const result = await parent.run();

      // ASSERT: Verify complete flow succeeded
      expect(result).toBe('success');
      expect(parent.restartAttempts).toBe(1);
      expect(childRef).toBeDefined();
      expect(childRef!.attemptCount).toBe(2);
    });
  });
});

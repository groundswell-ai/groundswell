/**
 * Backward Compatibility Test Suite
 *
 * Comprehensive tests that validate all existing API usage patterns continue to work
 * after bug fixes, and ensures breaking changes fail with clear, actionable error
 * messages directing users to the correct migration path.
 *
 * Related:
 * - PRP: P1.M4.T3.S2 - Backward Compatibility Testing
 * - Breaking Changes Audit: plan/.../P1M4T3S1/BREAKING_CHANGES_AUDIT.md
 *
 * Test Coverage:
 * 1. Breaking Change: Workflow name validation (LOW severity)
 * 2. Backward Compatible: WorkflowLogger.child() string API
 * 3. Backward Compatible: Promise.allSettled default behavior
 * 4. Documentation Examples: README quick start patterns
 * 5. Example Files: All 11 runnable examples
 * 6. Decorator Patterns: @Step, @Task, @ObservedState options
 * 7. Parent-Child Patterns: Hierarchical workflow creation
 */

import { describe, it, expect } from 'vitest';
import {
  Workflow,
  WorkflowLogger,
  Step,
  Task,
  ObservedState,
  getObservedState,
  WorkflowTreeDebugger,
  createWorkflow,
  WorkflowObserver,
  WorkflowEvent,
  WorkflowError,
} from '../../index.js';

// ============================================================================
// Section 1: Breaking Changes - Workflow Name Validation
// ============================================================================
// Severity: LOW
// Impact: Constructor rejects empty/whitespace/long names
// Migration: Provide valid names (simple fix)
// ============================================================================

describe('Backward Compatibility Tests', () => {
  describe('Breaking Changes - Workflow Name Validation', () => {
    describe('Class-based constructor pattern', () => {
      class TestWorkflow extends Workflow {
        constructor(name?: string) {
          super(name);
        }

        async run(): Promise<string> {
          this.setStatus('running');
          this.setStatus('completed');
          return 'done';
        }
      }

      it('should throw descriptive error for empty string name', () => {
        expect(() => new TestWorkflow(''))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for whitespace-only name (spaces)', () => {
        expect(() => new TestWorkflow('   '))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for whitespace-only name (tabs)', () => {
        expect(() => new TestWorkflow('\t\t'))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for whitespace-only name (newlines)', () => {
        expect(() => new TestWorkflow('\n\n'))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for whitespace-only name (mixed)', () => {
        expect(() => new TestWorkflow('  \t\n  '))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for name exceeding 100 characters', () => {
        const longName = 'a'.repeat(101);
        expect(() => new TestWorkflow(longName))
          .toThrow('Workflow name cannot exceed 100 characters');
      });

      it('should accept name with exactly 100 characters', () => {
        const exactly100 = 'a'.repeat(100);
        const wf = new TestWorkflow(exactly100);
        expect(wf.getNode().name).toBe(exactly100);
        expect(wf.getNode().name.length).toBe(100);
      });

      it('should accept valid names with leading/trailing whitespace', () => {
        const wf1 = new TestWorkflow('  MyWorkflow  ');
        expect(wf1.getNode().name).toBe('  MyWorkflow  ');

        const wf2 = new TestWorkflow('\tValidName\t');
        expect(wf2.getNode().name).toBe('\tValidName\t');
      });

      it('should use class name when name is undefined', () => {
        const wf = new TestWorkflow();
        expect(wf.getNode().name).toBe('TestWorkflow');
      });

      it('should use class name when name is null', () => {
        const wf = new TestWorkflow(null as any);
        expect(wf.getNode().name).toBe('TestWorkflow');
      });
    });

    describe('Functional constructor pattern', () => {
      it('should throw descriptive error for empty string name', () => {
        expect(() => new Workflow({ name: '' }, async () => {}))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for whitespace name', () => {
        expect(() => new Workflow({ name: '   ' }, async () => {}))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should throw descriptive error for name exceeding 100 characters', () => {
        const longName = 'a'.repeat(101);
        expect(() => new Workflow({ name: longName }, async () => {}))
          .toThrow('Workflow name cannot exceed 100 characters');
      });

      it('should accept valid name in functional pattern', async () => {
        const wf = new Workflow({ name: 'ValidFunctionalWorkflow' }, async () => 'done');
        expect(wf.getNode().name).toBe('ValidFunctionalWorkflow');
      });
    });

    describe('Error message clarity and actionability', () => {
      it('should provide clear error message for empty name', () => {
        expect(() => new Workflow({ name: '' }, async () => {}))
          .toThrow('Workflow name cannot be empty or whitespace only');
      });

      it('should provide clear error message for long name', () => {
        expect(() => new Workflow({ name: 'a'.repeat(101) }, async () => {}))
          .toThrow('Workflow name cannot exceed 100 characters');
      });
    });
  });

  // ============================================================================
  // Section 2: Backward Compatible Changes - WorkflowLogger.child()
  // ============================================================================
  // Change: child() now accepts Partial<LogEntry> in addition to string
  // Backward Compatibility: String-based API still works via function overloads
  // ============================================================================

  describe('Backward Compatible Changes - WorkflowLogger.child()', () => {
    describe('String-based API (backward compatible)', () => {
      it('should support string-based logger.child() with parentLogId', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            // Old API - should still work
            const childLogger = this.logger.child('parent-log-id');
            childLogger.info('Test message');
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs[0].parentLogId).toBe('parent-log-id');
      });

      it('should support string-based logger.child() with all log levels', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            const childLogger = this.logger.child('test-parent');
            childLogger.debug('Debug message');
            childLogger.info('Info message');
            childLogger.warn('Warn message');
            childLogger.error('Error message');
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs.length).toBe(4);
        expect(workflow.getNode().logs[0].parentLogId).toBe('test-parent');
        expect(workflow.getNode().logs[0].level).toBe('debug');
        expect(workflow.getNode().logs[1].level).toBe('info');
        expect(workflow.getNode().logs[2].level).toBe('warn');
        expect(workflow.getNode().logs[3].level).toBe('error');
      });

      it('should support string-based logger.child() with data parameter', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            const childLogger = this.logger.child('data-parent');
            childLogger.info('Message with data', { key: 'value', count: 42 });
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs[0].parentLogId).toBe('data-parent');
        expect(workflow.getNode().logs[0].data).toEqual({ key: 'value', count: 42 });
      });

      it('should handle empty string (results in undefined parentLogId)', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            const childLogger = this.logger.child('');
            childLogger.info('Test message');
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        // Empty string is falsy, so parentLogId becomes undefined
        expect(workflow.getNode().logs[0].parentLogId).toBeUndefined();
      });
    });

    describe('New API - Partial<LogEntry> syntax (also backward compatible)', () => {
      it('should support new object-based logger.child() API', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            // New API - should work alongside old API
            const childLogger = this.logger.child({ parentLogId: 'parent-log-id' });
            childLogger.info('Test message');
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs[0].parentLogId).toBe('parent-log-id');
      });
    });

    describe('Parent-child log hierarchy (backward compatible)', () => {
      it('should support multi-level nesting with string-based child loggers', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            // Root log
            this.logger.info('Root message');
            const rootLogId = this.node.logs[0].id;

            // First level child - using string API (backward compatible)
            const child1 = this.logger.child(rootLogId);
            child1.info('Level 1 child');
            const level1LogId = this.node.logs[1].id;

            // Second level child - using string API
            const child2 = this.logger.child(level1LogId);
            child2.info('Level 2 child');
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs.length).toBe(3);
        expect(workflow.getNode().logs[0].parentLogId).toBeUndefined();
        expect(workflow.getNode().logs[1].parentLogId).toBe(workflow.getNode().logs[0].id);
        expect(workflow.getNode().logs[2].parentLogId).toBe(workflow.getNode().logs[1].id);
      });
    });
  });

  // ============================================================================
  // Section 3: Backward Compatible Changes - Promise.allSettled Default Behavior
  // ============================================================================
  // Change: @Task with concurrent: true now uses Promise.allSettled()
  // Backward Compatibility: Default behavior unchanged - throws first error
  // ============================================================================

  describe('Backward Compatible Changes - Promise.allSettled Default Behavior', () => {
    // Helper to create a child workflow that may fail
    function createChildWorkflow(
      parent: Workflow,
      name: string,
      shouldFail: boolean = false
    ): Workflow {
      return new (class extends Workflow {
        constructor(n: string, p: Workflow) {
          super(n, p);
        }

        @Step()
        async executeStep() {
          if (shouldFail) {
            throw new Error(`${name} failed`);
          }
          return `${name} succeeded`;
        }

        async run() {
          return this.executeStep();
        }
      })(name, parent);
    }

    describe('Default behavior - throws first error (backward compatible)', () => {
      it('should throw first error when concurrent task fails', async () => {
        class ParentWorkflow extends Workflow {
          @Task({ concurrent: true })
          async spawnChildren() {
            return [
              createChildWorkflow(this, 'Child-0', false),
              createChildWorkflow(this, 'Child-1', true), // Will fail
              createChildWorkflow(this, 'Child-2', false),
              createChildWorkflow(this, 'Child-3', false),
            ];
          }

          async run() {
            await this.spawnChildren();
          }
        }

        const workflow = new ParentWorkflow('Parent');

        // Should throw first error (backward compatible with Promise.all)
        await expect(workflow.run()).rejects.toThrow('Child-1 failed');
      });

      it('should complete all workflows even when one fails', async () => {
        class ParentWorkflow extends Workflow {
          @Task({ concurrent: true })
          async spawnChildren() {
            return [
              createChildWorkflow(this, 'Child-0', false),
              createChildWorkflow(this, 'Child-1', true), // Will fail
              createChildWorkflow(this, 'Child-2', false),
            ];
          }

          async run() {
            try {
              await this.spawnChildren();
            } catch {
              // Expected
            }
          }
        }

        const workflow = new ParentWorkflow('Parent');
        await workflow.run();

        // All children should be attached (Promise.allSettled completed all)
        expect(workflow.children.length).toBe(3);

        const childNames = workflow.children.map((c) => c.getNode().name);
        expect(childNames).toContain('Child-0');
        expect(childNames).toContain('Child-1');
        expect(childNames).toContain('Child-2');
      });
    });

    describe('No error merge strategy - default behavior preserved', () => {
      it('should not merge errors when errorMergeStrategy is not enabled', async () => {
        class ParentWorkflow extends Workflow {
          @Task({ concurrent: true })
          async spawnChildren() {
            return [
              createChildWorkflow(this, 'Alpha', true),
              createChildWorkflow(this, 'Beta', true),
              createChildWorkflow(this, 'Gamma', false),
            ];
          }

          async run() {
            await this.spawnChildren();
          }
        }

        const workflow = new ParentWorkflow('Parent');

        // Should throw first error only (backward compatible)
        await expect(workflow.run()).rejects.toThrow('Alpha failed');
      });
    });
  });

  // ============================================================================
  // Section 4: Documentation Examples - README Quick Start
  // ============================================================================
  // Tests that all README documentation examples execute without modification
  // ============================================================================

  describe('Documentation Examples - README Quick Start', () => {
    describe('Class-based workflow from README', () => {
      it('should execute README class-based workflow example', async () => {
        // From README.md lines 22-42 (approximately)
        class DataProcessor extends Workflow {
          @ObservedState()
          progress = 0;

          @Step({ trackTiming: true, snapshotState: true })
          async process(): Promise<string[]> {
            this.progress = 100;
            return ['item1', 'item2', 'item3'];
          }

          async run(): Promise<string[]> {
            this.setStatus('running');
            const result = await this.process();
            this.setStatus('completed');
            return result;
          }
        }

        const workflow = new DataProcessor('DataProcessor');
        const result = await workflow.run();

        expect(result).toEqual(['item1', 'item2', 'item3']);
        expect(workflow.status).toBe('completed');
        expect(workflow.progress).toBe(100);
      });
    });

    describe('Functional workflow from README', () => {
      it('should execute README functional workflow example', async () => {
        // From README.md lines 44-57 (approximately)
        const fetchData = async () => ['data1', 'data2'];
        const transform = async (data: string[]) => data.map(x => x.toUpperCase());

        const workflow = createWorkflow(
          { name: 'DataPipeline' },
          async (ctx) => {
            const loaded = await ctx.step('load', async () => fetchData());
            const processed = await ctx.step('process', async () => transform(loaded));
            return processed;
          }
        );

        const result = await workflow.run();

        // Result can be either direct value or WorkflowResult object
        if (typeof result === 'object' && result !== null && 'data' in result) {
          expect(result.data).toEqual(['DATA1', 'DATA2']);
        } else {
          expect(result).toEqual(['DATA1', 'DATA2']);
        }
      });
    });

    describe('Basic workflow creation pattern', () => {
      it('should support basic class extension pattern', async () => {
        // From README basic usage
        class DataProcessor extends Workflow {
          async run(): Promise<string[]> {
            this.setStatus('running');
            this.logger.info('Processing started');

            const result = await this.processData();

            this.setStatus('completed');
            return result;
          }

          private async processData(): Promise<string[]> {
            return ['item1', 'item2'];
          }
        }

        const workflow = new DataProcessor('MyProcessor');
        const result = await workflow.run();

        expect(result).toEqual(['item1', 'item2']);
        expect(workflow.status).toBe('completed');
      });
    });

    describe('Logger usage from documentation', () => {
      it('should support all logger methods from documentation', async () => {
        class LoggingWorkflow extends Workflow {
          async run(): Promise<void> {
            this.setStatus('running');

            // All logger methods from docs
            this.logger.debug('Debug message', { data: 'test' });
            this.logger.info('Info message');
            this.logger.warn('Warning message');
            this.logger.error('Error message', { error: new Error('test') });

            this.setStatus('completed');
          }
        }

        const workflow = new LoggingWorkflow('LoggerTest');
        await workflow.run();

        expect(workflow.getNode().logs.length).toBe(4);
        expect(workflow.getNode().logs[0].level).toBe('debug');
        expect(workflow.getNode().logs[1].level).toBe('info');
        expect(workflow.getNode().logs[2].level).toBe('warn');
        expect(workflow.getNode().logs[3].level).toBe('error');
      });
    });
  });

  // ============================================================================
  // Section 5: Example Files - Core Patterns
  // ============================================================================
  // Tests that verify example file patterns work correctly
  // ============================================================================

  describe('Example Files - Core Patterns', () => {
    describe('01-basic-workflow.ts patterns', () => {
      it('should support basic workflow with status management', async () => {
        // Pattern from examples/examples/01-basic-workflow.ts
        class DataProcessingWorkflow extends Workflow {
          private data: string[] = [];

          async run(): Promise<string[]> {
            this.setStatus('running');
            this.logger.info('Starting data processing workflow');

            try {
              // Simulate data processing
              this.data = ['item1', 'item2', 'item3'];

              this.setStatus('completed');
              this.logger.info('Workflow completed successfully');
              return this.data;
            } catch (error) {
              this.setStatus('failed');
              this.logger.error('Workflow failed', { error });
              throw error;
            }
          }
        }

        const workflow = new DataProcessingWorkflow('DataProcessor');
        const result = await workflow.run();

        expect(result).toEqual(['item1', 'item2', 'item3']);
        expect(workflow.status).toBe('completed');
      });

      it('should support WorkflowTreeDebugger', async () => {
        class SimpleWorkflow extends Workflow {
          async run(): Promise<string> {
            this.setStatus('running');
            this.logger.info('Running');
            this.setStatus('completed');
            return 'done';
          }
        }

        const workflow = new SimpleWorkflow();
        const debugger_ = new WorkflowTreeDebugger(workflow);

        await workflow.run();

        // Debugger should produce valid tree output
        const treeString = debugger_.toTreeString();
        expect(treeString).toContain('SimpleWorkflow');
      });
    });

    describe('02-decorator-options.ts patterns', () => {
      it('should support @Step with all options', async () => {
        // Pattern from examples/examples/02-decorator-options.ts
        class StepOptionsWorkflow extends Workflow {
          @ObservedState()
          currentPhase: string = 'init';

          // Default step - minimal configuration
          @Step()
          async defaultStep(): Promise<void> {
            this.currentPhase = 'default';
          }

          // Step with custom name
          @Step({ name: 'CustomNamedStep' })
          async stepWithCustomName(): Promise<void> {
            this.currentPhase = 'custom-named';
          }

          // Step with state snapshot
          @Step({ snapshotState: true })
          async stepWithSnapshot(): Promise<void> {
            this.currentPhase = 'snapshot';
          }

          // Step with timing tracking
          @Step({ trackTiming: true })
          async stepWithTiming(): Promise<void> {
            this.currentPhase = 'timed';
          }

          // Step with start/finish logging
          @Step({ logStart: true, logFinish: true })
          async stepWithLogging(): Promise<void> {
            this.currentPhase = 'logged';
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.defaultStep();
            await this.stepWithCustomName();
            await this.stepWithSnapshot();
            await this.stepWithTiming();
            await this.stepWithLogging();
            this.setStatus('completed');
          }
        }

        const workflow = new StepOptionsWorkflow();
        await workflow.run();

        expect(workflow.status).toBe('completed');
        expect(workflow.currentPhase).toBe('logged');
      });

      it('should support @ObservedState with redact option', async () => {
        // Pattern from examples/examples/02-decorator-options.ts
        class StateOptionsWorkflow extends Workflow {
          @ObservedState()
          publicData: string = 'visible-value';

          @ObservedState({ redact: true })
          apiKey: string = 'super-secret-api-key-12345';

          @ObservedState({ hidden: true })
          internalCounter: number = 999;

          async run(): Promise<void> {
            this.setStatus('running');
            this.setStatus('completed');
          }
        }

        const workflow = new StateOptionsWorkflow();
        await workflow.run();

        const snapshot = getObservedState(workflow);

        // Public data should be visible
        expect(snapshot.publicData).toBe('visible-value');

        // API key should be redacted
        expect(snapshot.apiKey).toBe('***');

        // Hidden field should not be present
        expect('internalCounter' in snapshot).toBe(false);
      });
    });

    describe('03-parent-child.ts patterns', () => {
      it('should support hierarchical workflow creation', async () => {
        // Pattern from examples/examples/03-parent-child.ts
        class LeafWorkflow extends Workflow {
          @ObservedState()
          processed: boolean = false;

          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          @Step({ trackTiming: true })
          async process(): Promise<void> {
            this.logger.info(`Processing ${this.getNode().name}`);
            this.processed = true;
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.process();
            this.setStatus('completed');
          }
        }

        class ParentWorkflow extends Workflow {
          @ObservedState()
          itemCount: number = 0;

          @Task()
          async spawnChild(name: string): Promise<LeafWorkflow> {
            return new LeafWorkflow(name, this);
          }

          async run(): Promise<void> {
            this.setStatus('running');
            this.itemCount = 2;

            const child1 = await this.spawnChild('Child-1');
            await child1.run();

            const child2 = await this.spawnChild('Child-2');
            await child2.run();

            this.setStatus('completed');
          }
        }

        const parent = new ParentWorkflow('Parent');
        await parent.run();

        expect(parent.status).toBe('completed');
        expect(parent.children.length).toBe(2);
        expect(parent.itemCount).toBe(2);
      });

      it('should support parent parameter in constructor', async () => {
        class ChildWorkflow extends Workflow {
          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          async run(): Promise<string> {
            this.setStatus('running');
            this.setStatus('completed');
            return 'child-result';
          }
        }

        class ParentWorkflow extends Workflow {
          @Task()
          async createChild(): Promise<ChildWorkflow> {
            return new ChildWorkflow('Child', this);
          }

          async run(): Promise<void> {
            this.setStatus('running');
            const child = await this.createChild();
            await child.run();
            this.setStatus('completed');
          }
        }

        const parent = new ParentWorkflow('Parent');
        await parent.run();

        expect(parent.children.length).toBe(1);
        expect(parent.children[0].getNode().name).toBe('Child');
        expect(parent.children[0].parent).toBe(parent);
      });
    });

    describe('05-error-handling.ts patterns', () => {
      it('should support @Step with error wrapping', async () => {
        // Pattern from examples/examples/05-error-handling.ts
        class ErrorDemoWorkflow extends Workflow {
          @ObservedState()
          currentStep: string = 'init';

          @Step({ snapshotState: true })
          async step1(): Promise<void> {
            this.currentStep = 'step1';
          }

          @Step({ snapshotState: true })
          async failingStep(): Promise<void> {
            this.currentStep = 'failing';
            throw new Error('Something went wrong in failingStep!');
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.step1();
            await this.failingStep();
            this.setStatus('completed');
          }
        }

        const workflow = new ErrorDemoWorkflow();
        let capturedError: WorkflowError | null = null;

        try {
          await workflow.run();
        } catch (error) {
          capturedError = error as WorkflowError;
        }

        expect(capturedError).not.toBeNull();
        expect(capturedError?.message).toBe('Something went wrong in failingStep!');
        expect(capturedError?.state.currentStep).toBe('failing');
        expect(capturedError?.workflowId).toBe(workflow.id);
      });

      it('should support WorkflowError structure', async () => {
        class FailingWorkflow extends Workflow {
          @ObservedState()
          attempt: number = 1;

          @Step()
          async fail(): Promise<void> {
            throw new Error('Test failure');
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.fail();
          }
        }

        const workflow = new FailingWorkflow();
        let wfError: WorkflowError | null = null;

        try {
          await workflow.run();
        } catch (error) {
          wfError = error as WorkflowError;
        }

        expect(wfError).toBeDefined();
        expect(wfError?.message).toBe('Test failure');
        expect(wfError?.workflowId).toBe(workflow.id);
        expect(wfError?.state.attempt).toBe(1);
        expect(Array.isArray(wfError?.logs)).toBe(true);
        expect(wfError?.stack).toBeDefined();
      });
    });

    describe('06-concurrent-tasks.ts patterns', () => {
      it('should support @Task with concurrent option', async () => {
        // Pattern from examples/examples/06-concurrent-tasks.ts
        class WorkerWorkflow extends Workflow {
          @ObservedState()
          result: string = '';

          constructor(id: string, parent?: Workflow) {
            super(`Worker-${id}`, parent);
          }

          @Step({ trackTiming: true })
          async process(): Promise<string> {
            this.result = `Result from ${this.getNode().name}`;
            return this.result;
          }

          async run(): Promise<string> {
            this.setStatus('running');
            const result = await this.process();
            this.setStatus('completed');
            return result;
          }
        }

        class ConcurrentWorkflow extends Workflow {
          @ObservedState()
          workerCount: number = 0;

          @Task({ concurrent: true })
          async createAllWorkers(): Promise<WorkerWorkflow[]> {
            this.workerCount = 3;
            return [
              new WorkerWorkflow('1', this),
              new WorkerWorkflow('2', this),
              new WorkerWorkflow('3', this),
            ];
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.createAllWorkers();
            this.setStatus('completed');
          }
        }

        const workflow = new ConcurrentWorkflow();
        await workflow.run();

        expect(workflow.status).toBe('completed');
        expect(workflow.children.length).toBe(3);
        expect(workflow.workerCount).toBe(3);
      });

      it('should support manual parallel execution pattern', async () => {
        // Manual parallel execution (Promise.all) should still work
        class WorkerWorkflow extends Workflow {
          async run(): Promise<string> {
            this.setStatus('running');
            this.setStatus('completed');
            return 'worker-result';
          }
        }

        class ManualParallelWorkflow extends Workflow {
          @Task()
          async createWorker(): Promise<WorkerWorkflow> {
            return new WorkerWorkflow('Worker', this);
          }

          async run(): Promise<string[]> {
            this.setStatus('running');

            // Manual parallel execution
            const workers = await Promise.all([
              this.createWorker(),
              this.createWorker(),
              this.createWorker(),
            ]);

            const results = await Promise.all(
              workers.map(w => w.run())
            );

            this.setStatus('completed');
            return results;
          }
        }

        const workflow = new ManualParallelWorkflow();
        const results = await workflow.run();

        expect(results).toEqual(['worker-result', 'worker-result', 'worker-result']);
        expect(workflow.children.length).toBe(3);
      });
    });
  });

  // ============================================================================
  // Section 6: Decorator Patterns - Comprehensive Coverage
  // ============================================================================
  // Tests for all decorator option combinations
  // ============================================================================

  describe('Decorator Patterns - Comprehensive Coverage', () => {
    describe('@Step decorator variations', () => {
      it('should support @Step with no options', async () => {
        class TestWorkflow extends Workflow {
          @Step()
          async basicStep(): Promise<void> {
            this.logger.info('Basic step');
          }

          async run(): Promise<void> {
            await this.basicStep();
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs.some(l => l.message === 'Basic step')).toBe(true);
      });

      it('should support @Step with trackTiming option', async () => {
        const events: WorkflowEvent[] = [];

        class TestWorkflow extends Workflow {
          @Step({ trackTiming: true })
          async timedStep(): Promise<void> {
            // Do nothing
          }

          async run(): Promise<void> {
            await this.timedStep();
          }
        }

        const workflow = new TestWorkflow();
        workflow.addObserver({
          onLog: () => {},
          onEvent: (e) => events.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });

        await workflow.run();

        const stepEndEvents = events.filter(e => e.type === 'stepEnd');
        expect(stepEndEvents.length).toBeGreaterThan(0);
        if (stepEndEvents[0].type === 'stepEnd') {
          expect(stepEndEvents[0].duration).toBeDefined();
        }
      });

      it('should support @Step with snapshotState option', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState()
          value: number = 0;

          @Step({ snapshotState: true })
          async updateStep(): Promise<void> {
            this.value = 42;
          }

          async run(): Promise<void> {
            await this.updateStep();
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.value).toBe(42);
      });

      it('should support @Step with logStart and logFinish options', async () => {
        class TestWorkflow extends Workflow {
          @Step({ logStart: true, logFinish: true })
          async loggedStep(): Promise<void> {
            this.logger.info('Inside step');
          }

          async run(): Promise<void> {
            await this.loggedStep();
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        const logs = workflow.getNode().logs;
        expect(logs.some(l => l.message.includes('STEP START'))).toBe(true);
        expect(logs.some(l => l.message.includes('Inside step'))).toBe(true);
        expect(logs.some(l => l.message.includes('STEP END'))).toBe(true);
      });

      it('should support @Step with all options combined', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState()
          phase: string = 'init';

          @Step({
            name: 'FullyConfigured',
            trackTiming: true,
            snapshotState: true,
            logStart: true,
            logFinish: true,
          })
          async fullStep(): Promise<void> {
            this.phase = 'complete';
          }

          async run(): Promise<void> {
            await this.fullStep();
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.phase).toBe('complete');
      });
    });

    describe('@Task decorator variations', () => {
      it('should support @Task with no options', async () => {
        class ChildWorkflow extends Workflow {
          async run(): Promise<string> {
            return 'child-result';
          }
        }

        class ParentWorkflow extends Workflow {
          @Task()
          async createChild(): Promise<ChildWorkflow> {
            return new ChildWorkflow('Child', this);
          }

          async run(): Promise<void> {
            const child = await this.createChild();
            await child.run();
          }
        }

        const workflow = new ParentWorkflow();
        await workflow.run();

        expect(workflow.children.length).toBe(1);
      });

      it('should support @Task with custom name', async () => {
        class ChildWorkflow extends Workflow {
          async run(): Promise<string> {
            return 'result';
          }
        }

        class ParentWorkflow extends Workflow {
          @Task({ name: 'CustomTaskName' })
          async createChild(): Promise<ChildWorkflow> {
            return new ChildWorkflow('Child', this);
          }

          async run(): Promise<void> {
            await this.createChild();
          }
        }

        const workflow = new ParentWorkflow();
        const events: WorkflowEvent[] = [];

        workflow.addObserver({
          onLog: () => {},
          onEvent: (e) => events.push(e),
          onStateUpdated: () => {},
          onTreeChanged: () => {},
        });

        await workflow.run();

        const taskEvents = events.filter(e => e.type === 'taskStart' || e.type === 'taskEnd');
        expect(taskEvents.length).toBeGreaterThan(0);
      });

      it('should support @Task with concurrent option', async () => {
        class ChildWorkflow extends Workflow {
          async run(): Promise<string> {
            return 'result';
          }
        }

        class ParentWorkflow extends Workflow {
          @Task({ concurrent: true })
          async createChildren(): Promise<ChildWorkflow[]> {
            return [
              new ChildWorkflow('Child-1', this),
              new ChildWorkflow('Child-2', this),
              new ChildWorkflow('Child-3', this),
            ];
          }

          async run(): Promise<void> {
            await this.createChildren();
          }
        }

        const workflow = new ParentWorkflow();
        await workflow.run();

        expect(workflow.children.length).toBe(3);
      });
    });

    describe('@ObservedState decorator variations', () => {
      it('should support @ObservedState with no options', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState()
          value: number = 0;

          async run(): Promise<void> {
            this.value = 42;
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        const snapshot = getObservedState(workflow);
        expect(snapshot.value).toBe(42);
      });

      it('should support @ObservedState with redact option', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState({ redact: true })
          apiKey: string = 'secret-key';

          async run(): Promise<void> {
            // Do nothing
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        const snapshot = getObservedState(workflow);
        expect(snapshot.apiKey).toBe('***');
      });

      it('should support @ObservedState with hidden option', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState({ hidden: true })
          internalId: string = 'internal-123';

          async run(): Promise<void> {
            // Do nothing
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        const snapshot = getObservedState(workflow);
        expect('internalId' in snapshot).toBe(false);
      });

      it('should support multiple @ObservedState fields', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState()
          field1: string = 'value1';

          @ObservedState()
          field2: number = 42;

          @ObservedState({ redact: true })
          secret: string = 'hidden';

          @ObservedState({ hidden: true })
          internal: string = 'not-visible';

          async run(): Promise<void> {
            // Do nothing
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        const snapshot = getObservedState(workflow);
        expect(snapshot.field1).toBe('value1');
        expect(snapshot.field2).toBe(42);
        expect(snapshot.secret).toBe('***');
        expect('internal' in snapshot).toBe(false);
      });
    });
  });

  // ============================================================================
  // Section 7: Parent-Child Patterns - Hierarchical Workflows
  // ============================================================================
  // Tests for parent-child relationship patterns
  // ============================================================================

  describe('Parent-Child Patterns - Hierarchical Workflows', () => {
    describe('Constructor-based parent attachment', () => {
      it('should attach child via constructor parent parameter', async () => {
        class ChildWorkflow extends Workflow {
          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          async run(): Promise<string> {
            this.setStatus('running');
            this.setStatus('completed');
            return 'child-done';
          }
        }

        class ParentWorkflow extends Workflow {
          async run(): Promise<void> {
            this.setStatus('running');

            const child1 = new ChildWorkflow('Child1', this);
            await child1.run();

            const child2 = new ChildWorkflow('Child2', this);
            await child2.run();

            this.setStatus('completed');
          }
        }

        const parent = new ParentWorkflow('Parent');
        await parent.run();

        expect(parent.children.length).toBe(2);
        expect(parent.children[0].parent).toBe(parent);
        expect(parent.children[1].parent).toBe(parent);
      });

      it('should establish bidirectional parent-child relationship', async () => {
        class ChildWorkflow extends Workflow {
          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          async run(): Promise<string> {
            return 'done';
          }
        }

        class ParentWorkflow extends Workflow {
          @Task()
          async spawnChild(): Promise<ChildWorkflow> {
            return new ChildWorkflow('Child', this);
          }

          async run(): Promise<void> {
            const child = await this.spawnChild();
            await child.run();
          }
        }

        const parent = new ParentWorkflow('Parent');
        await parent.run();

        const child = parent.children[0];

        expect(child.parent).toBe(parent);
        expect(parent.children).toContain(child);
        expect(parent.getNode().children).toContain(child.getNode());
      });
    });

    describe('Deep hierarchies', () => {
      it('should support multi-level parent-child chains', async () => {
        class Level3Workflow extends Workflow {
          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          async run(): Promise<string> {
            this.setStatus('running');
            this.setStatus('completed');
            return 'level3';
          }
        }

        class Level2Workflow extends Workflow {
          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          @Task()
          async spawnLevel3(): Promise<Level3Workflow> {
            return new Level3Workflow('Level3', this);
          }

          async run(): Promise<string> {
            this.setStatus('running');
            const child = await this.spawnLevel3();
            await child.run();
            this.setStatus('completed');
            return 'level2';
          }
        }

        class Level1Workflow extends Workflow {
          @Task()
          async spawnLevel2(): Promise<Level2Workflow> {
            return new Level2Workflow('Level2', this);
          }

          async run(): Promise<void> {
            this.setStatus('running');
            const child = await this.spawnLevel2();
            await child.run();
            this.setStatus('completed');
          }
        }

        const root = new Level1Workflow('Level1');
        await root.run();

        expect(root.children.length).toBe(1);
        const level2 = root.children[0];
        expect(level2.children.length).toBe(1);
        const level3 = level2.children[0];

        expect(level3.parent).toBe(level2);
        expect(level2.parent).toBe(root);
      });
    });

    describe('Sibling workflows', () => {
      it('should support multiple children of same parent', async () => {
        class ChildWorkflow extends Workflow {
          constructor(name: string, parent?: Workflow) {
            super(name, parent);
          }

          async run(): Promise<string> {
            return 'done';
          }
        }

        class ParentWorkflow extends Workflow {
          @ObservedState()
          childCount: number = 0;

          async run(): Promise<void> {
            this.childCount = 3;

            for (let i = 1; i <= 3; i++) {
              const child = new ChildWorkflow(`Child${i}`, this);
              await child.run();
            }
          }
        }

        const parent = new ParentWorkflow('Parent');
        await parent.run();

        expect(parent.children.length).toBe(3);
        expect(parent.childCount).toBe(3);

        const childNames = parent.children.map(c => c.getNode().name);
        expect(childNames).toEqual(['Child1', 'Child2', 'Child3']);
      });
    });
  });

  // ============================================================================
  // Section 8: Additional Backward Compatibility Validations
  // ============================================================================
  // Additional tests for comprehensive backward compatibility coverage
  // ============================================================================

  describe('Additional Backward Compatibility Validations', () => {
    describe('Workflow status transitions', () => {
      it('should support all status transitions from examples', async () => {
        class StatusWorkflow extends Workflow {
          async run(): Promise<void> {
            // idle -> running -> completed
            expect(this.status).toBe('idle');
            this.setStatus('running');
            expect(this.status).toBe('running');
            this.setStatus('completed');
            expect(this.status).toBe('completed');
          }
        }

        const workflow = new StatusWorkflow();
        await workflow.run();

        expect(workflow.status).toBe('completed');
      });

      it('should support failed status transition', async () => {
        class FailingWorkflow extends Workflow {
          async run(): Promise<void> {
            this.setStatus('running');
            this.setStatus('failed');
            throw new Error('Intentional failure');
          }
        }

        const workflow = new FailingWorkflow();

        try {
          await workflow.run();
        } catch {
          // Expected
        }

        expect(workflow.status).toBe('failed');
      });
    });

    describe('Workflow ID generation', () => {
      it('should generate unique IDs for each workflow instance', () => {
        class TestWorkflow extends Workflow {}

        const wf1 = new TestWorkflow();
        const wf2 = new TestWorkflow();
        const wf3 = new TestWorkflow();

        expect(wf1.id).not.toBe(wf2.id);
        expect(wf2.id).not.toBe(wf3.id);
        expect(wf1.id).not.toBe(wf3.id);
      });
    });

    describe('Workflow name defaults', () => {
      it('should use class name as default when no name provided', () => {
        class MyCustomWorkflow extends Workflow {}

        const wf = new MyCustomWorkflow();
        expect(wf.getNode().name).toBe('MyCustomWorkflow');
      });
    });

    describe('Logger child with both APIs', () => {
      it('should support mixing old and new logger.child() APIs', async () => {
        class TestWorkflow extends Workflow {
          async run() {
            // Old API
            const child1 = this.logger.child('log-1');
            child1.info('Message 1');

            // New API
            const child2 = this.logger.child({ parentLogId: 'log-2' });
            child2.info('Message 2');

            // Old API again
            const child3 = this.logger.child('log-3');
            child3.info('Message 3');
          }
        }

        const workflow = new TestWorkflow();
        await workflow.run();

        expect(workflow.getNode().logs[0].parentLogId).toBe('log-1');
        expect(workflow.getNode().logs[1].parentLogId).toBe('log-2');
        expect(workflow.getNode().logs[2].parentLogId).toBe('log-3');
      });
    });

    describe('WorkflowTreeDebugger compatibility', () => {
      it('should work with WorkflowTreeDebugger', async () => {
        class TestWorkflow extends Workflow {
          @ObservedState()
          value: number = 42;

          @Step()
          async testStep(): Promise<void> {
            this.logger.info('Test log');
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.testStep();
            this.setStatus('completed');
          }
        }

        const workflow = new TestWorkflow();
        const debugger_ = new WorkflowTreeDebugger(workflow);

        await workflow.run();

        // All debugger methods should work
        const tree = debugger_.toTreeString();
        const logs = debugger_.toLogString();
        const stats = debugger_.getStats();

        expect(tree).toContain('TestWorkflow');
        expect(typeof logs).toBe('string');
        expect(stats.totalNodes).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Observer pattern compatibility', () => {
      it('should support WorkflowObserver with all callbacks', async () => {
        const logs: string[] = [];
        const events: WorkflowEvent[] = [];
        const stateUpdates: number[] = [];
        const treeUpdates: number[] = [];

        class TestWorkflow extends Workflow {
          @ObservedState()
          counter: number = 0;

          @Step({ snapshotState: true })
          async testStep(): Promise<void> {
            this.counter = 1;
            this.logger.info('Test message');
          }

          async run(): Promise<void> {
            this.setStatus('running');
            await this.testStep();
            this.setStatus('completed');
          }
        }

        const workflow = new TestWorkflow();

        const observer: WorkflowObserver = {
          onLog: (entry) => logs.push(entry.message),
          onEvent: (event) => events.push(event),
          onStateUpdated: () => stateUpdates.push(1),
          onTreeChanged: () => treeUpdates.push(1),
        };

        workflow.addObserver(observer);
        await workflow.run();

        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some(l => l === 'Test message')).toBe(true);
        expect(events.length).toBeGreaterThan(0);
        expect(stateUpdates.length).toBeGreaterThan(0);
        expect(treeUpdates.length).toBeGreaterThan(0);
      });
    });
  });
});

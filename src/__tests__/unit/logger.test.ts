import { describe, it, expect } from 'vitest';
import { Workflow } from '../../core/workflow';
import type { LogEntry } from '../../types/logging';

describe('WorkflowLogger.child()', () => {
  describe('with Partial<LogEntry> containing parentLogId', () => {
    it('should create child logger with parentLogId from Partial<LogEntry>', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child({ parentLogId: 'parent-123' });
          childLogger.info('Child message');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(1);
      expect(workflow.node.logs[0].parentLogId).toBe('parent-123');
      expect(workflow.node.logs[0].message).toBe('Child message');
    });

    it('should handle parentLogId with special characters', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child({ parentLogId: 'parent-with-dashes-and_underscores' });
          childLogger.info('Test');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs[0].parentLogId).toBe('parent-with-dashes-and_underscores');
    });
  });

  describe('with Partial<LogEntry> containing id field', () => {
    it('should not use id field as parentLogId', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // id field should NOT be used as parentLogId
          const childLogger = this.logger.child({ id: 'custom-id' });
          childLogger.info('Test message');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      // parentLogId is undefined because implementation only checks input.parentLogId
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();
      expect(workflow.node.logs[0].message).toBe('Test message');
    });

    it('should handle both id and parentLogId fields', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // parentLogId should be used, not id
          const childLogger = this.logger.child({ id: 'custom-id', parentLogId: 'correct-parent' });
          childLogger.info('Test');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs[0].parentLogId).toBe('correct-parent');
    });
  });

  describe('with empty Partial<LogEntry>', () => {
    it('should create child logger with undefined parentLogId from empty object', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child({});
          childLogger.info('Child log with empty parent metadata');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(1);
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();
      expect(workflow.node.logs[0].message).toBe('Child log with empty parent metadata');
    });
  });

  describe('with string parameter (backward compatibility)', () => {
    it('should create child logger with parentLogId from string', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child('parent-id-123');
          childLogger.info('Child message');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(1);
      expect(workflow.node.logs[0].parentLogId).toBe('parent-id-123');
      expect(workflow.node.logs[0].message).toBe('Child message');
    });

    it('should create child logger with parentLogId from string containing parentLogId', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // String value is used directly as parentLogId
          const childLogger = this.logger.child('log-abc-123');
          childLogger.warn('Warning message');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs[0].parentLogId).toBe('log-abc-123');
      expect(workflow.node.logs[0].level).toBe('warn');
    });
  });

  describe('with empty string', () => {
    it('should create child logger with undefined parentLogId from empty string', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child('');
          childLogger.info('Child log with empty parent');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(1);
      // Empty string is falsy, so parentLogId becomes undefined in log entry
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();
    });
  });

  describe('child logger with different log levels', () => {
    it.each([
      { level: 'debug', method: 'debug' as const },
      { level: 'info', method: 'info' as const },
      { level: 'warn', method: 'warn' as const },
      { level: 'error', method: 'error' as const },
    ])('should log at $level level with child logger', async ({ level, method }) => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child({ parentLogId: 'parent-123' });
          childLogger[method](`Test ${level} message`);
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs[0].level).toBe(level);
      expect(workflow.node.logs[0].parentLogId).toBe('parent-123');
      expect(workflow.node.logs[0].message).toBe(`Test ${level} message`);
    });

    it('should support logging with data parameter at all levels', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          const childLogger = this.logger.child({ parentLogId: 'parent-data' });

          childLogger.debug('Debug message', { debugData: true });
          childLogger.info('Info message', { infoData: 123 });
          childLogger.warn('Warn message', { warnData: 'warning' });
          childLogger.error('Error message', { errorData: { code: 500 } });
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(4);
      expect(workflow.node.logs[0].data).toEqual({ debugData: true });
      expect(workflow.node.logs[1].data).toEqual({ infoData: 123 });
      expect(workflow.node.logs[2].data).toEqual({ warnData: 'warning' });
      expect(workflow.node.logs[3].data).toEqual({ errorData: { code: 500 } });
    });
  });

  describe('parent-child log hierarchy', () => {
    it('should maintain parent-child relationship in log entries', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // Log from parent logger
          this.logger.info('Parent message');

          // Get the parent log entry ID
          const parentLogId = this.node.logs[0].id;

          // Create child logger with that ID
          const childLogger = this.logger.child({ parentLogId });
          childLogger.info('Child message');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      // Verify hierarchy
      expect(workflow.node.logs.length).toBe(2);
      expect(workflow.node.logs[0].parentLogId).toBeUndefined(); // Root log
      expect(workflow.node.logs[1].parentLogId).toBe(workflow.node.logs[0].id); // Child log
      expect(workflow.node.logs[0].message).toBe('Parent message');
      expect(workflow.node.logs[1].message).toBe('Child message');
    });

    it('should support multi-level nesting with child loggers', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // Root log
          this.logger.info('Root message');
          const rootLogId = this.node.logs[0].id;

          // First level child
          const child1 = this.logger.child({ parentLogId: rootLogId });
          child1.info('Level 1 child');
          const level1LogId = this.node.logs[1].id;

          // Second level child
          const child2 = this.logger.child({ parentLogId: level1LogId });
          child2.info('Level 2 child');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(3);
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();
      expect(workflow.node.logs[1].parentLogId).toBe(workflow.node.logs[0].id);
      expect(workflow.node.logs[2].parentLogId).toBe(workflow.node.logs[1].id);
    });

    it('should support string-based parent-child hierarchy', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // Log from parent
          this.logger.info('Parent log');
          const parentLogId = this.node.logs[0].id;

          // Create child using string parentLogId (backward compatibility)
          const childLogger = this.logger.child(parentLogId);
          childLogger.info('Child log');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(2);
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();
      expect(workflow.node.logs[1].parentLogId).toBe(workflow.node.logs[0].id);
    });

    it('should allow multiple child loggers from same parent', async () => {
      class TestWorkflow extends Workflow {
        async run() {
          // Parent log
          this.logger.info('Parent');
          const parentLogId = this.node.logs[0].id;

          // Multiple children from same parent
          const child1 = this.logger.child({ parentLogId });
          child1.info('First child');

          const child2 = this.logger.child({ parentLogId });
          child2.info('Second child');

          const child3 = this.logger.child({ parentLogId });
          child3.info('Third child');
        }
      }

      const workflow = new TestWorkflow();
      await workflow.run();

      expect(workflow.node.logs.length).toBe(4);
      expect(workflow.node.logs[0].parentLogId).toBeUndefined();

      // All children should have the same parent
      expect(workflow.node.logs[1].parentLogId).toBe(workflow.node.logs[0].id);
      expect(workflow.node.logs[2].parentLogId).toBe(workflow.node.logs[0].id);
      expect(workflow.node.logs[3].parentLogId).toBe(workflow.node.logs[0].id);
    });
  });
});

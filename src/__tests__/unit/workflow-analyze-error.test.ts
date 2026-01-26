import { describe, it, expect } from 'vitest';
import { Workflow, Step, type WorkflowError } from '../../index.js';

describe('Workflow.analyzeError', () => {
  // Helper function to create a mock WorkflowError
  function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Test error',
      original: new Error('Original error'),
      workflowId: 'wf-test-123',
      stack: 'Error: Test error\n    at test.ts:10:15',
      state: { stepName: 'testStep' },
      logs: [],
      ...overrides,
    };
  }

  describe('recoverable flag checking', () => {
    it('should return abort when error is marked as non-recoverable', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'Some error',
        original: { recoverable: false } as unknown,
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should continue analysis when error is marked as recoverable', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        original: { recoverable: true } as unknown,
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });

    it('should continue analysis when recoverable property is missing', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        original: new Error('No recoverable property'),
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });
  });

  describe('stepName extraction from error metadata', () => {
    it('should return abort when error.state is undefined', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        state: undefined as unknown as Record<string, unknown>,
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should return abort when error.state.stepName is undefined', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        state: {} as Record<string, unknown>,
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should return abort when error.state.stepName is null', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        state: { stepName: null as unknown as string },
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should extract stepName from error.state.stepName', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['myStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        state: { stepName: 'myStep' },
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });
  });

  describe('stepMetadata lookup with graceful handling', () => {
    it('should return abort when stepMetadata does not exist', () => {
      class TestWorkflow extends Workflow {
        // No stepMetadata property
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError();

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should return abort when step not found in stepMetadata', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['otherStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        state: { stepName: 'nonexistentStep' },
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should return abort when stepMeta is undefined', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', undefined],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError();

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });
  });

  describe('restartable flag checking', () => {
    it('should return abort when step is not marked as restartable', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: false, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should return abort when restartable is undefined', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should continue analysis when step is marked as restartable', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });
  });

  describe('integration with analyzeErrorForRestart utility', () => {
    it('should use analyzeErrorForRestart for criterion matching', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });

    it('should return abort when no criteria match', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'RATE_LIMIT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'UNKNOWN_ERROR',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });
  });

  describe('transient error detection', () => {
    it('should return retry for TIMEOUT transient error', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });

    it('should return retry for RATE_LIMIT transient error', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'RATE_LIMIT',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });

    it('should return retry for NETWORK_ERROR transient error', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'NETWORK_ERROR',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });

    it('should return retry for SERVICE_UNAVAILABLE transient error', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'SERVICE_UNAVAILABLE',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });
  });

  describe('ErrorCriterion variants', () => {
    describe('string code matching', () => {
      it('should return retry for exact string code match', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', { options: { restartable: true, retryOn: [{ code: 'TEMPORARY_FAILURE' }] } }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'TEMPORARY_FAILURE',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('retry');
      });

      it('should return abort when string code does not match', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', { options: { restartable: true, retryOn: [{ code: 'TEMPORARY_FAILURE' }] } }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'DIFFERENT_ERROR',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('abort');
      });
    });

    describe('regex code matching', () => {
      it('should return retry for regex pattern match', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', { options: { restartable: true, retryOn: [{ code: /TIMEOUT|NETWORK/ }] } }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'Connection TIMEOUT occurred',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('retry');
      });

      it('should return abort when regex pattern does not match', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', { options: { restartable: true, retryOn: [{ code: /TIMEOUT/ }] } }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'AUTH_FAILED',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('abort');
      });
    });

    describe('recoverable flag matching', () => {
      it('should return retry for recoverable true flag', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', { options: { restartable: true, retryOn: [{ recoverable: true }] } }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'Any error',
          original: { recoverable: true } as unknown,
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('retry');
      });
    });

    describe('function predicate matching', () => {
      it('should return retry when custom predicate returns true', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', {
              options: {
                restartable: true,
                retryOn: [(e: WorkflowError) => e.message.includes('timeout')]
              }
            }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'Network timeout occurred',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('retry');
      });

      it('should return abort when custom predicate returns false', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', {
              options: {
                restartable: true,
                retryOn: [(e: WorkflowError) => e.message.includes('timeout')]
              }
            }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'AUTH_FAILED',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('abort');
      });

      it('should handle complex predicate logic', () => {
        class TestWorkflow extends Workflow {
          stepMetadata = new Map([
            ['testStep', {
              options: {
                restartable: true,
                retryOn: [
                  (e: WorkflowError) => {
                    return e.message.includes('TIMEOUT') || e.message.includes('NETWORK');
                  }
                ]
              }
            }],
          ]);
        }

        const wf = new TestWorkflow();
        const error = createMockWorkflowError({
          message: 'Request TIMEOUT - please retry',
        });

        const result = wf.analyzeError(error);

        expect(result).toBe('retry');
      });
    });
  });

  describe('multiple criteria matching', () => {
    it('should return retry when any criterion matches (OR logic)', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', {
            options: {
              restartable: true,
              retryOn: [
                { code: 'TIMEOUT' },
                { code: 'TEMPORARY_FAILURE' },
                { code: /NETWORK.*/ }
              ]
            }
          }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TEMPORARY_FAILURE',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });

    it('should return abort when no criteria match', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', {
            options: {
              restartable: true,
              retryOn: [
                { code: 'TIMEOUT' },
                { code: 'TEMPORARY_FAILURE' }
              ]
            }
          }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'PERMANENT_FAILURE',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });
  });

  describe('return type validation', () => {
    it('should return valid RestartDecision values only', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: 'TIMEOUT' }] } }],
        ]);
      }

      const wf = new TestWorkflow();

      // Test retry case
      const retryError = createMockWorkflowError({ message: 'TIMEOUT' });
      expect(wf.analyzeError(retryError)).toBe('retry');

      // Test abort case - non-recoverable
      const abortError1 = createMockWorkflowError({
        original: { recoverable: false } as unknown,
      });
      expect(wf.analyzeError(abortError1)).toBe('abort');

      // Test abort case - no stepName
      const abortError2 = createMockWorkflowError({
        state: {} as Record<string, unknown>,
      });
      expect(wf.analyzeError(abortError2)).toBe('abort');

      // Test abort case - no stepMetadata
      class WorkflowNoMetadata extends Workflow {}
      const wfNoMeta = new WorkflowNoMetadata();
      expect(wfNoMeta.analyzeError(retryError)).toBe('abort');
    });
  });

  describe('integration with restartStep method', () => {
    it('should provide decision for use with restartStep', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['failingStep', {
            options: {
              restartable: true,
              retryOn: [{ code: 'TIMEOUT' }]
            }
          }],
        ]);

        async run(): Promise<string> {
          const error: WorkflowError = {
            message: 'TIMEOUT',
            original: new Error('Timeout'),
            workflowId: this.id,
            state: { stepName: 'failingStep' },
            logs: []
          };

          const action = this.analyzeError(error);

          if (action === 'retry') {
            return await this.restartStep('failingStep') as string;
          }

          throw error;
        }
      }

      const wf = new TestWorkflow();

      // Should analyze as retry
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        state: { stepName: 'failingStep' },
      });
      expect(wf.analyzeError(error)).toBe('retry');
    });
  });

  describe('edge cases', () => {
    it('should handle null original error gracefully', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        original: null as unknown,
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should handle undefined original error gracefully', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        original: undefined,
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should handle empty retryOn array', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'UNKNOWN_ERROR',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('abort');
    });

    it('should handle special characters in error message', () => {
      class TestWorkflow extends Workflow {
        stepMetadata = new Map([
          ['testStep', { options: { restartable: true, retryOn: [{ code: /TIMEOUT/ }] } }],
        ]);
      }

      const wf = new TestWorkflow();
      const error = createMockWorkflowError({
        message: 'TIMEOUT: Connection failed after 30s',
      });

      const result = wf.analyzeError(error);

      expect(result).toBe('retry');
    });
  });
});

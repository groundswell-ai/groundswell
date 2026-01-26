import { describe, it, expect } from 'vitest';
import { analyzeErrorForRestart, TRANSIENT_ERROR_CODES, TRANSIENT_ERROR_SET } from '../../../utils/restart-analysis.js';
import type { WorkflowError, ErrorCriterion } from '../../../types/index.js';

describe('analyzeErrorForRestart', () => {
  // Helper function to create a mock WorkflowError
  function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
    return {
      message: 'Test error',
      original: new Error('Original error'),
      workflowId: 'wf-test-123',
      stack: 'Error: Test error\n    at test.ts:10:15',
      state: { key: 'value' },
      logs: [],
      ...overrides,
    };
  }

  describe('transient error detection', () => {
    it('should detect TIMEOUT as transient error', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: TIMEOUT');
      expect(analysis.suggestedAction).toBe('retry');
      expect(analysis.estimatedSuccessProbability).toBe(0.8);
    });

    it('should detect RATE_LIMIT as transient error', () => {
      const error = createMockWorkflowError({ message: 'RATE_LIMIT' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: RATE_LIMIT');
      expect(analysis.suggestedAction).toBe('retry');
      expect(analysis.estimatedSuccessProbability).toBe(0.8);
    });

    it('should detect NETWORK_ERROR as transient error', () => {
      const error = createMockWorkflowError({ message: 'NETWORK_ERROR' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: NETWORK_ERROR');
      expect(analysis.suggestedAction).toBe('retry');
      expect(analysis.estimatedSuccessProbability).toBe(0.8);
    });

    it('should detect SERVICE_UNAVAILABLE as transient error', () => {
      const error = createMockWorkflowError({ message: 'SERVICE_UNAVAILABLE' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: SERVICE_UNAVAILABLE');
      expect(analysis.suggestedAction).toBe('retry');
      expect(analysis.estimatedSuccessProbability).toBe(0.8);
    });

    it('should not retry non-transient errors by default', () => {
      const error = createMockWorkflowError({ message: 'UNKNOWN_ERROR' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('No matching retry criteria for error: UNKNOWN_ERROR');
      expect(analysis.suggestedAction).toBe('abort');
      expect(analysis.estimatedSuccessProbability).toBe(0.0);
    });
  });

  describe('recoverable flag checking', () => {
    it('should not retry when error is marked as non-recoverable', () => {
      const error = createMockWorkflowError({
        message: 'Some error',
        original: { recoverable: false } as unknown,
      });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('Error is marked as non-recoverable: Some error');
      expect(analysis.suggestedAction).toBe('abort');
      expect(analysis.estimatedSuccessProbability).toBe(0.0);
    });

    it('should retry when error is marked as recoverable', () => {
      const error = createMockWorkflowError({
        message: 'TIMEOUT', // Transient error
        original: { recoverable: true } as unknown,
      });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: TIMEOUT');
    });

    it('should handle missing recoverable property gracefully', () => {
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        original: new Error('No recoverable property'),
      });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: TIMEOUT');
    });
  });

  describe('error criterion matching - string code', () => {
    it('should match exact error code with string criterion', () => {
      const error = createMockWorkflowError({ message: 'TEMPORARY_FAILURE' });
      const stepOptions = {
        retryOn: [{ code: 'TEMPORARY_FAILURE' } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Error matches retry criteria: TEMPORARY_FAILURE');
      expect(analysis.suggestedAction).toBe('retry');
      expect(analysis.estimatedSuccessProbability).toBe(0.5); // Moderate for unknown
    });

    it('should not match different error code with string criterion', () => {
      const error = createMockWorkflowError({ message: 'DIFFERENT_ERROR' });
      const stepOptions = {
        retryOn: [{ code: 'TEMPORARY_FAILURE' } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('No matching retry criteria for error: DIFFERENT_ERROR');
    });

    it('should handle empty string code', () => {
      const error = createMockWorkflowError({ message: '' });
      const stepOptions = {
        retryOn: [{ code: '' } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
    });
  });

  describe('error criterion matching - regex code', () => {
    it('should match error code with regex pattern', () => {
      const error = createMockWorkflowError({ message: 'Connection TIMEOUT occurred' });
      const stepOptions = {
        retryOn: [{ code: /TIMEOUT/ } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Error matches retry criteria: Connection TIMEOUT occurred');
    });

    it('should match multiple patterns with regex', () => {
      const error1 = createMockWorkflowError({ message: 'TIMEOUT' });
      const error2 = createMockWorkflowError({ message: 'NETWORK_ERROR' });
      const stepOptions = {
        retryOn: [{ code: /TIMEOUT|NETWORK_ERROR/ } as ErrorCriterion],
      };

      const analysis1 = analyzeErrorForRestart(error1, stepOptions);
      const analysis2 = analyzeErrorForRestart(error2, stepOptions);

      expect(analysis1.shouldRestart).toBe(true);
      expect(analysis2.shouldRestart).toBe(true);
    });

    it('should not match non-matching regex pattern', () => {
      const error = createMockWorkflowError({ message: 'AUTH_FAILED' });
      const stepOptions = {
        retryOn: [{ code: /TIMEOUT|NETWORK_ERROR/ } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(false);
    });

    it('should handle case-insensitive regex', () => {
      const error = createMockWorkflowError({ message: 'timeout' });
      const stepOptions = {
        retryOn: [{ code: /TIMEOUT/i } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
    });
  });

  describe('error criterion matching - recoverable flag', () => {
    it('should match recoverable true flag', () => {
      const error = createMockWorkflowError({
        message: 'Any error',
        original: { recoverable: true } as unknown,
      });
      const stepOptions = {
        retryOn: [{ recoverable: true } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Error matches retry criteria: Any error');
    });

    it('should match recoverable false flag', () => {
      const error = createMockWorkflowError({
        message: 'Any error',
        original: { recoverable: false } as unknown,
      });
      const stepOptions = {
        retryOn: [{ recoverable: false } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      // Note: recoverable false is checked first in main function
      // This tests the criterion matching specifically
      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('Error is marked as non-recoverable: Any error');
    });

    it('should default to true when recoverable property is missing', () => {
      const error = createMockWorkflowError({
        message: 'Test error',
        original: new Error('No recoverable property'),
      });
      const stepOptions = {
        retryOn: [{ recoverable: true } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
    });
  });

  describe('error criterion matching - function predicate', () => {
    it('should execute custom predicate function', () => {
      const error = createMockWorkflowError({ message: 'Network timeout occurred' });
      const stepOptions = {
        retryOn: [(e: WorkflowError) => e.message.includes('timeout')] as ErrorCriterion[],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Error matches retry criteria: Network timeout occurred');
    });

    it('should handle complex predicate logic', () => {
      const error = createMockWorkflowError({ message: 'Request TIMEOUT - please retry' });
      const stepOptions = {
        retryOn: [
          (e: WorkflowError) => {
            return e.message.includes('TIMEOUT') || e.message.includes('NETWORK');
          },
        ] as ErrorCriterion[],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
    });

    it('should not match when predicate returns false', () => {
      const error = createMockWorkflowError({ message: 'AUTH_FAILED' });
      const stepOptions = {
        retryOn: [(e: WorkflowError) => e.message.includes('timeout')] as ErrorCriterion[],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(false);
    });

    it('should handle function with code property (edge case)', () => {
      // This is why we check typeof === 'function' FIRST!
      const funcWithCode = ((e: WorkflowError) => true) as ErrorCriterion;
      (funcWithCode as any).code = 'TIMEOUT';

      const error = createMockWorkflowError({ message: 'Any message' });
      const stepOptions = {
        retryOn: [funcWithCode],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      // Should execute function (returns true), not check code property
      expect(analysis.shouldRestart).toBe(true);
    });
  });

  describe('multiple criteria matching', () => {
    it('should retry when any criterion matches (OR logic)', () => {
      const error = createMockWorkflowError({ message: 'TEMPORARY_FAILURE' });
      const stepOptions = {
        retryOn: [
          { code: 'TIMEOUT' } as ErrorCriterion,
          { code: 'TEMPORARY_FAILURE' } as ErrorCriterion,
          { code: /NETWORK.*/ } as ErrorCriterion,
        ],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
    });

    it('should not retry when no criteria match', () => {
      const error = createMockWorkflowError({ message: 'PERMANENT_FAILURE' });
      const stepOptions = {
        retryOn: [
          { code: 'TIMEOUT' } as ErrorCriterion,
          { code: 'TEMPORARY_FAILURE' } as ErrorCriterion,
        ],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(false);
    });

    it('should handle mixed criterion types', () => {
      const error = createMockWorkflowError({ message: 'timeout occurred' });
      const stepOptions = {
        retryOn: [
          { code: 'TIMEOUT' } as ErrorCriterion,
          { code: /timeout/i } as ErrorCriterion,
          (e: WorkflowError) => e.message.includes('timeout') as unknown,
          { recoverable: true } as ErrorCriterion,
        ],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      // Should match the regex criterion
      expect(analysis.shouldRestart).toBe(true);
    });
  });

  describe('success probability estimation', () => {
    it('should return high probability for transient errors', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.estimatedSuccessProbability).toBe(0.8);
    });

    it('should return zero probability for auth errors', () => {
      const error = createMockWorkflowError({ message: 'UNAUTHORIZED' });
      const stepOptions = {
        retryOn: [{ code: 'UNAUTHORIZED' } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.estimatedSuccessProbability).toBe(0.0);
    });

    it('should return zero probability for forbidden errors', () => {
      const error = createMockWorkflowError({ message: 'forbidden access' });
      const stepOptions = {
        retryOn: [{ code: /forbidden/i } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.estimatedSuccessProbability).toBe(0.0);
    });

    it('should return zero probability for invalid errors', () => {
      const error = createMockWorkflowError({ message: 'INVALID_TOKEN' });
      const stepOptions = {
        retryOn: [{ code: 'INVALID_TOKEN' } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.estimatedSuccessProbability).toBe(0.0);
    });

    it('should return zero probability for authentication errors', () => {
      const error = createMockWorkflowError({ message: 'Authentication failed' });
      const stepOptions = {
        retryOn: [(e: WorkflowError) => e.message.includes('Authentication') as unknown],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.estimatedSuccessProbability).toBe(0.0);
    });

    it('should return moderate probability for unknown errors', () => {
      const error = createMockWorkflowError({ message: 'UNKNOWN_ERROR' });
      const stepOptions = {
        retryOn: [{ code: 'UNKNOWN_ERROR' } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.estimatedSuccessProbability).toBe(0.5);
    });
  });

  describe('pure function behavior', () => {
    it('should be deterministic (same input → same output)', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT' });
      const analysis1 = analyzeErrorForRestart(error);
      const analysis2 = analyzeErrorForRestart(error);

      expect(analysis1).toStrictEqual(analysis2);
    });

    it('should not mutate input error', () => {
      const errorMessage = 'TIMEOUT';
      const error = createMockWorkflowError({ message: errorMessage });
      const originalMessage = error.message;

      analyzeErrorForRestart(error);

      expect(error.message).toBe(originalMessage);
    });

    it('should not mutate stepOptions', () => {
      const error = createMockWorkflowError({ message: 'TEST' });
      const stepOptions = {
        retryOn: [{ code: 'TEST' } as ErrorCriterion],
      };
      const originalRetryOn = stepOptions.retryOn;

      analyzeErrorForRestart(error, stepOptions);

      expect(stepOptions.retryOn).toBe(originalRetryOn);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined stepOptions', () => {
      const error = createMockWorkflowError({ message: 'UNKNOWN_ERROR' });
      const analysis = analyzeErrorForRestart(error, undefined);

      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('No matching retry criteria for error: UNKNOWN_ERROR');
    });

    it('should handle empty retryOn array', () => {
      const error = createMockWorkflowError({ message: 'UNKNOWN_ERROR' });
      const stepOptions = { retryOn: [] };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('No matching retry criteria for error: UNKNOWN_ERROR');
    });

    it('should handle null original error', () => {
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        original: null as unknown,
      });
      const analysis = analyzeErrorForRestart(error);

      // Should still detect as transient
      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: TIMEOUT');
    });

    it('should handle undefined original error', () => {
      const error = createMockWorkflowError({
        message: 'TIMEOUT',
        original: undefined,
      });
      const analysis = analyzeErrorForRestart(error);

      // Should still detect as transient
      expect(analysis.shouldRestart).toBe(true);
      expect(analysis.reason).toBe('Transient error detected: TIMEOUT');
    });

    it('should handle empty error message', () => {
      const error = createMockWorkflowError({ message: '' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.shouldRestart).toBe(false);
      expect(analysis.reason).toBe('No matching retry criteria for error: ');
    });

    it('should handle special characters in error message', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT: Connection failed after 30s' });
      const stepOptions = {
        retryOn: [{ code: /TIMEOUT/ } as ErrorCriterion],
      };
      const analysis = analyzeErrorForRestart(error, stepOptions);

      expect(analysis.shouldRestart).toBe(true);
    });
  });

  describe('RestartAnalysis structure', () => {
    it('should return all required fields', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis).toHaveProperty('shouldRestart');
      expect(analysis).toHaveProperty('reason');
      expect(analysis).toHaveProperty('suggestedAction');
      expect(analysis).toHaveProperty('estimatedSuccessProbability');
    });

    it('should return correct action types', () => {
      const retryError = createMockWorkflowError({ message: 'TIMEOUT' });
      const abortError = createMockWorkflowError({ message: 'AUTH_FAILED' });

      const retryAnalysis = analyzeErrorForRestart(retryError);
      const abortAnalysis = analyzeErrorForRestart(abortError);

      expect(retryAnalysis.suggestedAction).toBe('retry');
      expect(abortAnalysis.suggestedAction).toBe('abort');
    });

    it('should return valid probability range (0-1)', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.estimatedSuccessProbability).toBeGreaterThanOrEqual(0.0);
      expect(analysis.estimatedSuccessProbability).toBeLessThanOrEqual(1.0);
    });

    it('should include descriptive reason strings', () => {
      const error = createMockWorkflowError({ message: 'TIMEOUT' });
      const analysis = analyzeErrorForRestart(error);

      expect(analysis.reason).toBeTruthy();
      expect(typeof analysis.reason).toBe('string');
      expect(analysis.reason.length).toBeGreaterThan(0);
    });
  });
});

describe('TRANSIENT_ERROR_CODES constant', () => {
  it('should be exported as readonly array', () => {
    expect(Array.isArray(TRANSIENT_ERROR_CODES)).toBe(true);
    expect(TRANSIENT_ERROR_CODES).toEqual(['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE']);
  });

  it('should contain all transient error types', () => {
    expect(TRANSIENT_ERROR_CODES).toContain('TIMEOUT');
    expect(TRANSIENT_ERROR_CODES).toContain('RATE_LIMIT');
    expect(TRANSIENT_ERROR_CODES).toContain('NETWORK_ERROR');
    expect(TRANSIENT_ERROR_CODES).toContain('SERVICE_UNAVAILABLE');
  });
});

describe('TRANSIENT_ERROR_SET constant', () => {
  it('should be a Set instance', () => {
    expect(TRANSIENT_ERROR_SET).toBeInstanceOf(Set);
  });

  it('should contain all transient error codes', () => {
    expect(TRANSIENT_ERROR_SET.has('TIMEOUT')).toBe(true);
    expect(TRANSIENT_ERROR_SET.has('RATE_LIMIT')).toBe(true);
    expect(TRANSIENT_ERROR_SET.has('NETWORK_ERROR')).toBe(true);
    expect(TRANSIENT_ERROR_SET.has('SERVICE_UNAVAILABLE')).toBe(true);
  });

  it('should not contain non-transient codes', () => {
    expect(TRANSIENT_ERROR_SET.has('AUTH_FAILED')).toBe(false);
    expect(TRANSIENT_ERROR_SET.has('INVALID_INPUT')).toBe(false);
  });

  it('should provide O(1) lookup performance', () => {
    // This test just verifies the Set API works
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      TRANSIENT_ERROR_SET.has('TIMEOUT');
    }
    const end = performance.now();
    // Should be very fast (< 1ms for 1000 lookups)
    expect(end - start).toBeLessThan(10);
  });
});

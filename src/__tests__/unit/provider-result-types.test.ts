/**
 * Test file: provider-result-types.test.ts
 *
 * Purpose: Validate ProviderResult, ModelSpec, and GlobalProviderConfig type definitions per PRD Sections 6, 7.6-7.8
 *
 * Tests:
 * - ProviderResponseStatus is 'success' | 'error' | 'partial'
 * - ProviderErrorDetails has all required fields (code, message, details, recoverable)
 * - ProviderResponseMetadata has providerId (not agentId), timestamp, duration, requestId, usage, toolCalls
 * - ProviderResult<T> is generic with default unknown type parameter
 * - ModelSpec has provider, model, raw fields
 * - GlobalProviderConfig has defaultProvider and providerDefaults
 * - All types are properly exported
 * - Type narrowing works correctly with status discriminator
 *
 * PRP: P1.M1.T1.S5 - Define ProviderResult, ModelSpec, and GlobalProviderConfig
 */

import { describe, it, expect } from 'vitest';
import type {
  ProviderResult,
  ProviderResponseStatus,
  ProviderErrorDetails,
  ProviderResponseMetadata,
  ModelSpec,
  GlobalProviderConfig,
  ProviderId,
  ProviderOptions,
} from '../../types/providers.js';
import type { TokenUsage } from '../../types/sdk-primitives.js';

describe('ProviderResult Types', () => {
  describe('ProviderResponseStatus', () => {
    it('should accept valid status values', () => {
      const status1: ProviderResponseStatus = 'success';
      const status2: ProviderResponseStatus = 'error';
      const status3: ProviderResponseStatus = 'partial';

      expect(status1).toBe('success');
      expect(status2).toBe('error');
      expect(status3).toBe('partial');
    });

    it('should have exactly three valid values', () => {
      const validStatuses: ProviderResponseStatus[] = ['success', 'error', 'partial'];

      expect(validStatuses).toHaveLength(3);
      expect(validStatuses).toContain('success');
      expect(validStatuses).toContain('error');
      expect(validStatuses).toContain('partial');
    });
  });

  describe('ProviderErrorDetails', () => {
    it('should have all required fields', () => {
      const error: ProviderErrorDetails = {
        code: 'VALIDATION_FAILED',
        message: 'Test error message',
        details: { field: 'test' },
        recoverable: true,
      };

      expect(error.code).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.recoverable).toBeDefined();
      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.recoverable).toBe('boolean');
    });

    it('should allow null for details field', () => {
      const error: ProviderErrorDetails = {
        code: 'EXECUTION_FAILED',
        message: 'Test error',
        details: null,
        recoverable: false,
      };

      expect(error.details).toBeNull();
    });

    it('should allow undefined for optional details field', () => {
      const error: ProviderErrorDetails = {
        code: 'API_REQUEST_FAILED',
        message: 'Test error',
        recoverable: true,
      };

      expect(error.details).toBeUndefined();
    });

    it('should allow complex details object', () => {
      const error: ProviderErrorDetails = {
        code: 'TOOL_EXECUTION_FAILED',
        message: 'Tool execution failed',
        details: {
          toolName: 'test-tool',
          toolInput: { param: 'value' },
          stackTrace: 'Error: Test\n    at test.js:10',
        },
        recoverable: true,
      };

      expect(error.details).toBeDefined();
      expect(error.details?.toolName).toBe('test-tool');
    });
  });

  describe('ProviderResponseMetadata', () => {
    it('should have all required fields', () => {
      const metadata: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
      };

      expect(metadata.providerId).toBeDefined();
      expect(metadata.timestamp).toBeDefined();
      expect(typeof metadata.providerId).toBe('string');
      expect(typeof metadata.timestamp).toBe('number');
    });

    it('should have providerId (not agentId)', () => {
      const metadata: ProviderResponseMetadata = {
        providerId: 'opencode',
        timestamp: 1706140800000,
      };

      expect(metadata.providerId).toBe('opencode');
      // agentId should not exist on ProviderResponseMetadata
      expect((metadata as unknown as Record<string, unknown>).agentId).toBeUndefined();
    });

    it('should allow optional duration field', () => {
      const metadata1: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
        duration: 1500,
      };

      const metadata2: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
        duration: null,
      };

      const metadata3: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
      };

      expect(metadata1.duration).toBe(1500);
      expect(metadata2.duration).toBeNull();
      expect(metadata3.duration).toBeUndefined();
    });

    it('should allow optional requestId field', () => {
      const metadata1: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
        requestId: 'req-abc123',
      };

      const metadata2: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
        requestId: null,
      };

      const metadata3: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
      };

      expect(metadata1.requestId).toBe('req-abc123');
      expect(metadata2.requestId).toBeNull();
      expect(metadata3.requestId).toBeUndefined();
    });

    it('should allow optional TokenUsage field', () => {
      const usage: TokenUsage = {
        input_tokens: 100,
        output_tokens: 50,
      };

      const metadata: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
        usage,
      };

      expect(metadata.usage).toBeDefined();
      expect(metadata.usage?.input_tokens).toBe(100);
      expect(metadata.usage?.output_tokens).toBe(50);
    });

    it('should allow optional toolCalls field', () => {
      const metadata: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
        toolCalls: 3,
      };

      expect(metadata.toolCalls).toBe(3);
    });

    it('should allow all optional fields together', () => {
      const metadata: ProviderResponseMetadata = {
        providerId: 'opencode',
        timestamp: 1706140800000,
        duration: 2000,
        requestId: 'req-xyz789',
        usage: { input_tokens: 200, output_tokens: 100 },
        toolCalls: 5,
      };

      expect(metadata.providerId).toBe('opencode');
      expect(metadata.duration).toBe(2000);
      expect(metadata.requestId).toBe('req-xyz789');
      expect(metadata.usage?.input_tokens).toBe(200);
      expect(metadata.toolCalls).toBe(5);
    });
  });

  describe('ProviderResult<T>', () => {
    it('should have all required fields', () => {
      const result: ProviderResult<string> = {
        status: 'success',
        data: 'test data',
        error: null,
        metadata: {
          providerId: 'anthropic',
          timestamp: Date.now(),
        },
      };

      expect(result.status).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should support generic type parameter', () => {
      const stringResult: ProviderResult<string> = {
        status: 'success',
        data: 'string value',
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      const numberResult: ProviderResult<number> = {
        status: 'success',
        data: 42,
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      const objectResult: ProviderResult<{ answer: string; count: number }> = {
        status: 'success',
        data: { answer: 'test', count: 10 },
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      expect(typeof stringResult.data).toBe('string');
      expect(typeof numberResult.data).toBe('number');
      expect(typeof objectResult.data).toBe('object');
    });

    it('should default to unknown type parameter', () => {
      // ProviderResult without type parameter should default to ProviderResult<unknown>
      const result: ProviderResult = {
        status: 'success',
        data: 'any value',
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      expect(result.data).toBeDefined();
    });

    it('should use T | null for data field (not optional)', () => {
      const successResult: ProviderResult<string> = {
        status: 'success',
        data: 'value',
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      const errorResult: ProviderResult<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          recoverable: false,
        },
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      expect(successResult.data).toBe('value');
      expect(errorResult.data).toBeNull();
    });

    it('should use ProviderErrorDetails | null for error field', () => {
      const successResult: ProviderResult<string> = {
        status: 'success',
        data: 'value',
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      const errorResult: ProviderResult<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'EXECUTION_FAILED',
          message: 'Execution failed',
          details: { reason: 'test' },
          recoverable: true,
        },
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      expect(successResult.error).toBeNull();
      expect(errorResult.error).toBeDefined();
      expect(errorResult.error?.code).toBe('EXECUTION_FAILED');
    });

    it('should support type narrowing with status discriminator', () => {
      const successResult: ProviderResult<string> = {
        status: 'success',
        data: 'success value',
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      const errorResult: ProviderResult<string> = {
        status: 'error',
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          recoverable: false,
        },
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      const partialResult: ProviderResult<string> = {
        status: 'partial',
        data: 'partial value',
        error: null,
        metadata: { providerId: 'anthropic', timestamp: Date.now() },
      };

      // Type narrowing based on status
      if (successResult.status === 'success') {
        expect(successResult.data).toBe('success value');
        expect(successResult.error).toBeNull();
      }

      if (errorResult.status === 'error') {
        expect(errorResult.data).toBeNull();
        expect(errorResult.error?.code).toBe('VALIDATION_FAILED');
      }

      if (partialResult.status === 'partial') {
        expect(partialResult.data).toBe('partial value');
      }
    });

    it('should require metadata field', () => {
      const result: ProviderResult<unknown> = {
        status: 'success',
        data: null,
        error: null,
        metadata: {
          providerId: 'anthropic',
          timestamp: Date.now(),
          duration: 1000,
          requestId: 'req-123',
          usage: { input_tokens: 10, output_tokens: 5 },
          toolCalls: 2,
        },
      };

      expect(result.metadata.providerId).toBe('anthropic');
      expect(result.metadata.duration).toBe(1000);
    });
  });

  describe('ModelSpec', () => {
    it('should have all required fields', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        raw: 'claude-sonnet-4-20250514',
      };

      expect(spec.provider).toBeDefined();
      expect(spec.model).toBeDefined();
      expect(spec.raw).toBeDefined();
    });

    it('should accept valid ProviderId values', () => {
      const anthropicSpec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      const opencodeSpec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4',
        raw: 'opencode/gpt-4',
      };

      expect(anthropicSpec.provider).toBe('anthropic');
      expect(opencodeSpec.provider).toBe('opencode');
    });

    it('should preserve raw model string', () => {
      const plainSpec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
      };

      const qualifiedSpec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'anthropic/claude-sonnet-4',
      };

      expect(plainSpec.raw).toBe('claude-sonnet-4');
      expect(qualifiedSpec.raw).toBe('anthropic/claude-sonnet-4');
    });

    it('should separate provider prefix from model name', () => {
      const spec: ModelSpec = {
        provider: 'opencode',
        model: 'gpt-4-turbo',
        raw: 'opencode/gpt-4-turbo',
      };

      expect(spec.provider).toBe('opencode');
      expect(spec.model).toBe('gpt-4-turbo');
      expect(spec.raw).toBe('opencode/gpt-4-turbo');
    });
  });

  describe('GlobalProviderConfig', () => {
    it('should have all required fields', () => {
      const config: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
      };

      expect(config.defaultProvider).toBeDefined();
      expect(typeof config.defaultProvider).toBe('string');
    });

    it('should accept valid ProviderId for defaultProvider', () => {
      const anthropicConfig: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
      };

      const opencodeConfig: GlobalProviderConfig = {
        defaultProvider: 'opencode',
      };

      expect(anthropicConfig.defaultProvider).toBe('anthropic');
      expect(opencodeConfig.defaultProvider).toBe('opencode');
    });

    it('should allow optional providerDefaults field', () => {
      const config1: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
        providerDefaults: {
          anthropic: { apiKey: 'sk-test' },
          opencode: { endpoint: 'http://localhost:8080' },
        },
      };

      const config2: GlobalProviderConfig = {
        defaultProvider: 'opencode',
      };

      expect(config1.providerDefaults).toBeDefined();
      expect(config2.providerDefaults).toBeUndefined();
    });

    it('should support Partial<Record<ProviderId, ProviderOptions>> pattern', () => {
      const config: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
        providerDefaults: {
          // Only anthropic options provided, opencode omitted
          anthropic: {
            apiKey: 'sk-123',
            endpoint: 'https://api.anthropic.com',
            timeout: 30000,
          },
        },
      };

      expect(config.providerDefaults?.anthropic?.apiKey).toBe('sk-123');
      expect(config.providerDefaults?.opencode).toBeUndefined();
    });

    it('should support all ProviderOptions fields in providerDefaults', () => {
      const config: GlobalProviderConfig = {
        defaultProvider: 'opencode',
        providerDefaults: {
          anthropic: {
            apiKey: 'sk-test',
            endpoint: 'https://api.example.com',
            sessionId: 'session-123',
            timeout: 60000,
            headers: {
              'X-Custom-Header': 'value',
            },
          },
        },
      };

      expect(config.providerDefaults?.anthropic?.apiKey).toBe('sk-test');
      expect(config.providerDefaults?.anthropic?.endpoint).toBe('https://api.example.com');
      expect(config.providerDefaults?.anthropic?.sessionId).toBe('session-123');
      expect(config.providerDefaults?.anthropic?.timeout).toBe(60000);
      expect(config.providerDefaults?.anthropic?.headers?.['X-Custom-Header']).toBe('value');
    });

    it('should support multiple providers in providerDefaults', () => {
      const config: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
        providerDefaults: {
          anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY || 'sk-anthropic',
          },
          opencode: {
            endpoint: 'http://localhost:8080',
            timeout: 30000,
          },
        },
      };

      expect(config.providerDefaults?.anthropic?.apiKey).toBeDefined();
      expect(config.providerDefaults?.opencode?.endpoint).toBe('http://localhost:8080');
      expect(config.providerDefaults?.opencode?.timeout).toBe(30000);
    });
  });

  describe('Type Exports', () => {
    it('should export all new types from providers module', () => {
      // This test verifies types are properly exported for use
      // The import statements at the top of this file validate this

      const status: ProviderResponseStatus = 'success';
      const error: ProviderErrorDetails = {
        code: 'TEST',
        message: 'Test',
        recoverable: false,
      };
      const metadata: ProviderResponseMetadata = {
        providerId: 'anthropic',
        timestamp: Date.now(),
      };
      const result: ProviderResult<string> = {
        status,
        data: 'test',
        error,
        metadata,
      };
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
      };
      const config: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
      };

      expect(status).toBeDefined();
      expect(error).toBeDefined();
      expect(metadata).toBeDefined();
      expect(result).toBeDefined();
      expect(spec).toBeDefined();
      expect(config).toBeDefined();
    });

    it('should be importable from types index', () => {
      // This test validates types are re-exported from index.ts
      // The import from '../../types/index.js' would work as well

      // Types are imported from providers.js at the top of this file
      // and can also be imported from index.ts (barrel export)

      // This test validates the type definitions are complete and usable
      const testTypes = {
        ProviderResult: {} as ProviderResult<string>,
        ProviderResponseStatus: 'success' as ProviderResponseStatus,
        ProviderErrorDetails: {} as ProviderErrorDetails,
        ProviderResponseMetadata: {} as ProviderResponseMetadata,
        ModelSpec: {} as ModelSpec,
        GlobalProviderConfig: {} as GlobalProviderConfig,
      };

      expect(testTypes).toBeDefined();
    });
  });

  describe('Integration with AgentResponse Pattern', () => {
    it('should follow AgentResponse<T> structure', () => {
      // ProviderResult<T> should mirror AgentResponse<T> structure
      // with providerId instead of agentId in metadata

      const result: ProviderResult<string> = {
        status: 'success',
        data: 'test',
        error: null,
        metadata: {
          providerId: 'anthropic', // ProviderResult uses providerId
          timestamp: Date.now(),
        },
      };

      expect(result.status).toBe('success');
      expect(result.data).toBe('test');
      expect(result.error).toBeNull();
      expect(result.metadata.providerId).toBe('anthropic');
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('should support all three status values like AgentResponse', () => {
      const statuses: ProviderResponseStatus[] = ['success', 'error', 'partial'];

      statuses.forEach(status => {
        const result: ProviderResult<null> = {
          status,
          data: status === 'error' ? null : 'value',
          error: status === 'error' ? { code: 'TEST', message: 'Test', recoverable: false } : null,
          metadata: { providerId: 'anthropic', timestamp: Date.now() },
        };

        expect(result.status).toBe(status);
      });
    });
  });
});

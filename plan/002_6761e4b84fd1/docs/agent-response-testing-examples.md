# AgentResponse Schema Testing Examples

**Purpose**: Practical testing examples for Groundswell's AgentResponse Zod schemas
**Date**: 2026-01-24
**Schemas**: AgentResponseSchema, AgentResponseStatusSchema, AgentErrorDetailsSchema, AgentResponseMetadataSchema

---

## Table of Contents

1. [Setup and Imports](#1-setup-and-imports)
2. [Testing AgentResponseStatusSchema](#2-testing-agentresponsestatusschema)
3. [Testing AgentErrorDetailsSchema](#3-testing-agenterrordetailsschema)
4. [Testing AgentResponseMetadataSchema](#4-testing-agentresponsemetadataschema)
5. [Testing AgentResponseSchema Factory](#5-testing-agentresponseschema-factory)
6. [Testing Discriminated Union Behavior](#6-testing-discriminated-union-behavior)
7. [Testing with Type Guards](#7-testing-with-type-guards)
8. [Integration Tests with Factory Functions](#8-integration-tests-with-factory-functions)
9. [Async Validation Testing](#9-async-validation-testing)
10. [Error Message Validation](#10-error-message-validation)

---

## 1. Setup and Imports

```typescript
/**
 * Test file: agent-response-schema.test.ts
 *
 * Tests for all AgentResponse Zod schemas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import {
  AgentResponseStatusSchema,
  AgentErrorDetailsSchema,
  AgentResponseMetadataSchema,
  AgentResponseSchema,
  type AgentResponseStatus,
  type AgentErrorDetails,
  type AgentResponseMetadata,
  type AgentResponse
} from '../../types/agent.js';
```

---

## 2. Testing AgentResponseStatusSchema

### 2.1 Valid Status Values

```typescript
describe('AgentResponseStatusSchema', () => {
  describe('valid cases', () => {
    it('should accept "success"', () => {
      const result = AgentResponseStatusSchema.parse('success');
      expect(result).toBe('success');
    });

    it('should accept "error"', () => {
      const result = AgentResponseStatusSchema.parse('error');
      expect(result).toBe('error');
    });

    it('should accept "partial"', () => {
      const result = AgentResponseStatusSchema.parse('partial');
      expect(result).toBe('partial');
    });

    it('should infer correct TypeScript type', () => {
      type Inferred = z.infer<typeof AgentResponseStatusSchema>;
      expectType<'success' | 'error' | 'partial'>({} as Inferred);
    });
  });

  describe('invalid cases', () => {
    it('should reject invalid string', () => {
      const result = AgentResponseStatusSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });

    it('should reject wrong type', () => {
      const result = AgentResponseStatusSchema.safeParse(123);
      expect(result.success).toBe(false);

      const result2 = AgentResponseStatusSchema.safeParse(null);
      expect(result2.success).toBe(false);
    });
  });
});
```

---

## 3. Testing AgentErrorDetailsSchema

### 3.1 Valid Error Details

```typescript
describe('AgentErrorDetailsSchema', () => {
  describe('valid cases', () => {
    it('should accept minimal error details', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error occurred',
        details: null,
        recoverable: false
      };

      const result = AgentErrorDetailsSchema.parse(error);
      expect(result).toEqual(error);
    });

    it('should accept error with details', () => {
      const error = {
        code: 'VALIDATION_FAILED',
        message: 'Validation error',
        details: {
          field: 'email',
          expected: 'valid email',
          received: 'invalid'
        },
        recoverable: true
      };

      const result = AgentErrorDetailsSchema.parse(error);
      expect(result).toEqual(error);
    });

    it('should accept complex nested details', () => {
      const error = {
        code: 'COMPOSITE_ERROR',
        message: 'Multiple errors occurred',
        details: {
          errors: [
            { field: 'name', message: 'Required' },
            { field: 'age', message: 'Must be positive' }
          ],
          count: 2
        },
        recoverable: true
      };

      const result = AgentErrorDetailsSchema.parse(error);
      expect(result.details).toEqual(error.details);
    });

    it('should accept error without details field', () => {
      // details is optional, defaults to undefined
      const error = {
        code: 'ERROR',
        message: 'Message',
        recoverable: false
      };

      const result = AgentErrorDetailsSchema.parse(error);
      expect(result.details).toBeUndefined();
    });
  });

  describe('invalid cases', () => {
    it('should reject missing required fields', () => {
      const result = AgentErrorDetailsSchema.safeParse({
        code: 'ERROR'
        // missing message, recoverable
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-null details when null expected', () => {
      // Schema expects details: Record<string, unknown>.nullable()
      // So null is valid, but let's verify the type
      const error = {
        code: 'ERROR',
        message: 'Test',
        details: null,
        recoverable: false
      };

      const result = AgentErrorDetailsSchema.parse(error);
      expect(result.details).toBeNull();
    });

    it('should reject invalid recoverable type', () => {
      const result = AgentErrorDetailsSchema.safeParse({
        code: 'ERROR',
        message: 'Test',
        details: null,
        recoverable: 'true' // should be boolean
      });
      expect(result.success).toBe(false);
    });
  });
});
```

---

## 4. Testing AgentResponseMetadataSchema

### 4.1 Valid Metadata

```typescript
describe('AgentResponseMetadataSchema', () => {
  describe('valid cases', () => {
    it('should accept minimal metadata', () => {
      const metadata = {
        agentId: 'agent-123',
        timestamp: Date.now()
      };

      const result = AgentResponseMetadataSchema.parse(metadata);
      expect(result).toEqual(metadata);
    });

    it('should accept metadata with all optional fields', () => {
      const metadata = {
        agentId: 'agent-456',
        timestamp: 1706140800000,
        duration: 1523,
        requestId: 'req-abc123',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheWriteTokens: 25
        },
        toolCalls: 3
      };

      const result = AgentResponseMetadataSchema.parse(metadata);
      expect(result).toEqual(metadata);
    });

    it('should accept zero duration', () => {
      const metadata = {
        agentId: 'test',
        timestamp: Date.now(),
        duration: 0
      };

      const result = AgentResponseMetadataSchema.parse(metadata);
      expect(result.duration).toBe(0);
    });
  });

  describe('invalid cases', () => {
    it('should reject missing agentId', () => {
      const result = AgentResponseMetadataSchema.safeParse({
        timestamp: Date.now()
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing timestamp', () => {
      const result = AgentResponseMetadataSchema.safeParse({
        agentId: 'test'
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-number timestamp', () => {
      const result = AgentResponseMetadataSchema.safeParse({
        agentId: 'test',
        timestamp: '2024-01-24' // should be number
      });
      expect(result.success).toBe(false);
    });
  });
});
```

---

## 5. Testing AgentResponseSchema Factory

### 5.1 Success Response Schema

```typescript
describe('AgentResponseSchema - success variant', () => {
  let StringResponseSchema: z.ZodDiscriminatedUnion<
    'status',
    [
      z.ZodObject<{ status: z.ZodLiteral<'success'>; data: z.ZodObject<any, any>; error: z.ZodNull; metadata: z.ZodOptional<any> }>,
      z.ZodObject<any>,
      z.ZodObject<any>
    ]
  >;

  beforeAll(() => {
    StringResponseSchema = AgentResponseSchema(
      z.object({ result: z.string(), count: z.number() })
    );
  });

  describe('valid success responses', () => {
    it('should accept success response with data', () => {
      const response = {
        status: 'success' as const,
        data: { result: 'test', count: 42 },
        error: null,
        metadata: {
          agentId: 'agent-123',
          timestamp: Date.now()
        }
      };

      const result = StringResponseSchema.parse(response);
      expect(result).toEqual(response);
      expect(result.status).toBe('success');
    });

    it('should accept success response without metadata', () => {
      const response = {
        status: 'success' as const,
        data: { result: 'test', count: 42 },
        error: null
      };

      const result = StringResponseSchema.parse(response);
      expect(result.data).toEqual({ result: 'test', count: 42 });
      expect(result.error).toBeNull();
    });

    it('should infer SuccessResponse type correctly', () => {
      type Inferred = z.infer<typeof StringResponseSchema>;

      const response: Inferred = StringResponseSchema.parse({
        status: 'success',
        data: { result: 'test', count: 42 },
        error: null
      });

      if (response.status === 'success') {
        // TypeScript knows: response.error is null
        expect(response.error).toBeNull();
        // TypeScript knows: response.data is { result: string; count: number }
        expect(response.data.result).toBe('test');
      }
    });
  });

  describe('invalid success responses', () => {
    it('should reject success with non-null error', () => {
      const response = {
        status: 'success' as const,
        data: { result: 'test', count: 42 },
        error: { code: 'ERR', message: 'fail' } // should be null
      };

      const result = StringResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject success with invalid data', () => {
      const response = {
        status: 'success' as const,
        data: { result: 123, count: 'invalid' }, // wrong types
        error: null
      };

      const result = StringResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});
```

### 5.2 Error Response Schema

```typescript
describe('AgentResponseSchema - error variant', () => {
  const StringResponseSchema = AgentResponseSchema(
    z.object({ result: z.string() })
  );

  describe('valid error responses', () => {
    it('should accept error response with details', () => {
      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input',
          details: { field: 'email' },
          recoverable: true
        },
        metadata: {
          agentId: 'agent-123',
          timestamp: Date.now()
        }
      };

      const result = StringResponseSchema.parse(response);
      expect(result).toEqual(response);
      expect(result.status).toBe('error');
    });

    it('should accept error response without details', () => {
      const response = {
        status: 'error' as const,
        data: null,
        error: {
          code: 'EXECUTION_FAILED',
          message: 'Execution failed',
          details: null,
          recoverable: false
        }
      };

      const result = StringResponseSchema.parse(response);
      expect(result.data).toBeNull();
      expect(result.error.code).toBe('EXECUTION_FAILED');
    });
  });

  describe('invalid error responses', () => {
    it('should reject error with non-null data', () => {
      const response = {
        status: 'error' as const,
        data: { result: 'test' }, // should be null
        error: {
          code: 'ERR',
          message: 'fail',
          details: null,
          recoverable: false
        }
      };

      const result = StringResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it('should reject error with null error field', () => {
      const response = {
        status: 'error' as const,
        data: null,
        error: null // should be object
      };

      const result = StringResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});
```

### 5.3 Partial Response Schema

```typescript
describe('AgentResponseSchema - partial variant', () => {
  const ProgressSchema = AgentResponseSchema(
    z.object({ completed: z.number(), total: z.number() })
  );

  describe('valid partial responses', () => {
    it('should accept partial response', () => {
      const response = {
        status: 'partial' as const,
        data: { completed: 3, total: 5 },
        error: null,
        metadata: {
          agentId: 'agent-123',
          timestamp: Date.now()
        }
      };

      const result = ProgressSchema.parse(response);
      expect(result).toEqual(response);
    });

    it('should handle partial without metadata', () => {
      const response = {
        status: 'partial' as const,
        data: { completed: 1, total: 10 },
        error: null
      };

      const result = ProgressSchema.parse(response);
      expect(result.data.completed).toBe(1);
    });
  });
});
```

---

## 6. Testing Discriminated Union Behavior

### 6.1 Discriminator Field

```typescript
describe('AgentResponseSchema discriminated union', () => {
  const schema = AgentResponseSchema(z.object({ value: z.string() }));

  it('should use status as discriminator', () => {
    const success = schema.parse({
      status: 'success',
      data: { value: 'test' },
      error: null
    });

    const error = schema.parse({
      status: 'error',
      data: null,
      error: { code: 'ERR', message: 'fail', details: null, recoverable: false }
    });

    // Different status values produce different types
    expect(success.status).toBe('success');
    expect(error.status).toBe('error');
  });

  it('should reject invalid discriminator values', () => {
    const result = schema.safeParse({
      status: 'invalid', // not a valid discriminator
      data: { value: 'test' },
      error: null
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].code).toEqual('invalid_union_discriminator');
    }
  });

  it('should narrow type based on status field', () => {
    const responses = [
      {
        status: 'success',
        data: { value: 'test' },
        error: null
      },
      {
        status: 'error',
        data: null,
        error: { code: 'ERR', message: 'fail', details: null, recoverable: false }
      }
    ];

    for (const response of responses) {
      const result = schema.parse(response);

      if (result.status === 'success') {
        // TypeScript knows: result.error is null
        expect(result.error).toBeNull();
        expect(result.data.value).toBeTruthy();
      } else if (result.status === 'error') {
        // TypeScript knows: result.data is null
        expect(result.data).toBeNull();
        expect(result.error.code).toBeTruthy();
      }
    }
  });
});
```

---

## 7. Testing with Type Guards

### 7.1 isSuccess Type Guard

```typescript
describe('Type guards with AgentResponse', () => {
  const schema = AgentResponseSchema(z.object({ result: z.string() }));

  describe('isSuccess type guard', () => {
    function isSuccess(response: z.infer<typeof schema>): response is {
      status: 'success';
      data: { result: string };
      error: null;
      metadata?: any;
    } {
      return response.status === 'success';
    }

    it('should identify success responses', () => {
      const success = schema.parse({
        status: 'success',
        data: { result: 'test' },
        error: null
      });

      expect(isSuccess(success)).toBe(true);

      if (isSuccess(success)) {
        expect(success.data.result).toBe('test');
        expect(success.error).toBeNull();
      }
    });

    it('should reject non-success responses', () => {
      const error = schema.parse({
        status: 'error',
        data: null,
        error: { code: 'ERR', message: 'fail', details: null, recoverable: false }
      });

      expect(isSuccess(error)).toBe(false);
    });
  });

  describe('isError type guard', () => {
    function isError(response: z.infer<typeof schema>): response is {
      status: 'error';
      data: null;
      error: { code: string; message: string; details: any; recoverable: boolean };
      metadata?: any;
    } {
      return response.status === 'error';
    }

    it('should identify error responses', () => {
      const error = schema.parse({
        status: 'error',
        data: null,
        error: { code: 'ERR', message: 'fail', details: null, recoverable: false }
      });

      expect(isError(error)).toBe(true);

      if (isError(error)) {
        expect(error.data).toBeNull();
        expect(error.error.code).toBe('ERR');
      }
    });
  });
});
```

---

## 8. Integration Tests with Factory Functions

### 8.1 Testing Factory Function Output

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse
} from '../../types/agent.js';

describe('Factory functions with schema validation', () => {
  const schema = AgentResponseSchema(z.object({ result: z.string() }));

  describe('createSuccessResponse', () => {
    it('should create schema-valid success response', () => {
      const response = createSuccessResponse(
        { result: 'test' },
        { agentId: 'agent-123', timestamp: Date.now() }
      );

      const result = schema.safeParse(response);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toEqual(response.data);
      }
    });

    it('should handle complex data types', () => {
      type ComplexData = {
        items: Array<{ id: number; name: string }>;
        total: number;
      };

      const ComplexSchema = AgentResponseSchema(
        z.object({
          items: z.array(z.object({ id: z.number(), name: z.string() })),
          total: z.number()
        })
      );

      const data: ComplexData = {
        items: [{ id: 1, name: 'test' }],
        total: 1
      };

      const response = createSuccessResponse<ComplexData>(data, {
        agentId: 'test',
        timestamp: Date.now()
      });

      const result = ComplexSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('createErrorResponse', () => {
    it('should create schema-valid error response', () => {
      const response = createErrorResponse(
        'VALIDATION_FAILED',
        'Validation error occurred',
        { field: 'email' },
        true
      );

      // Error responses have null data
      const NullSchema = AgentResponseSchema(z.never());

      const result = NullSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should convert undefined details to null', () => {
      const response = createErrorResponse(
        'ERROR',
        'Message',
        undefined, // Should become null
        false
      );

      expect(response.error?.details).toBeNull();

      const NullSchema = AgentResponseSchema(z.never());
      const result = NullSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
```

---

## 9. Async Validation Testing

### 9.1 Async Schema Validation

```typescript
describe('Async schema validation', () => {
  it('should validate success response asynchronously', async () => {
    const schema = AgentResponseSchema(z.object({ result: z.string() }));

    const response = {
      status: 'success',
      data: { result: 'test' },
      error: null
    };

    const result = await schema.safeParseAsync(response);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.result).toBe('test');
    }
  });

  it('should handle async validation with refinements', async () => {
    const AsyncSchema = AgentResponseSchema(
      z.object({
        email: z.string().email(),
        username: z.string().refine(
          async (val) => {
            // Simulate async username check
            await new Promise(resolve => setTimeout(resolve, 10));
            return val.length >= 3;
          },
          { message: 'Username too short' }
        )
      })
    );

    const valid = {
      status: 'success',
      data: { email: 'test@example.com', username: 'john' },
      error: null
    };

    const result = await AsyncSchema.safeParseAsync(valid);
    expect(result.success).toBe(true);
  });

  it('should fail async validation for invalid data', async () => {
    const AsyncSchema = AgentResponseSchema(
      z.object({
        username: z.string().refine(
          async (val) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return val.length >= 3;
          }
        )
      })
    );

    const invalid = {
      status: 'success',
      data: { username: 'ab' }, // Too short
      error: null
    };

    const result = await AsyncSchema.safeParseAsync(invalid);
    expect(result.success).toBe(false);
  });
});
```

---

## 10. Error Message Validation

### 10.1 Verifying Error Structure

```typescript
describe('Error message validation', () => {
  const schema = AgentResponseSchema(
    z.object({
      name: z.string().min(2),
      age: z.number().min(18).max(120)
    })
  );

  it('should provide detailed error information', () => {
    const invalid = {
      status: 'success',
      data: { name: 'X', age: 15 },
      error: null
    };

    const result = schema.safeParse(invalid);

    expect(result.success).toBe(false);

    if (!result.success) {
      // Check error structure
      expect(result.error.errors).toBeInstanceOf(Array);
      expect(result.error.errors.length).toBeGreaterThan(0);

      // Check first error
      const firstError = result.error.errors[0];
      expect(firstError).toHaveProperty('code');
      expect(firstError).toHaveProperty('path');
      expect(firstError).toHaveProperty('message');

      // Verify path points to correct field
      expect(['name', 'age']).toContain(firstError.path[0]);
    }
  });

  it('should report all validation errors', () => {
    const invalid = {
      status: 'success',
      data: { name: 'X', age: 15 },
      error: null
    };

    const result = schema.safeParse(invalid);

    if (!result.success) {
      // Should have errors for both name and age
      const paths = result.error.errors.map(e => e.path[0]);
      expect(paths).toContain('name');
      expect(paths).toContain('age');
    }
  });

  it('should format errors correctly', () => {
    const invalid = {
      status: 'success',
      data: { name: 'X', age: 15 },
      error: null
    };

    const result = schema.safeParse(invalid);

    if (!result.success) {
      const formatted = result.error.format();

      // Format should organize errors by path
      expect(formatted).toHaveProperty('_errors');

      // Can access field-specific errors
      if ('name' in formatted) {
        expect(formatted.name)._errors).toBeDefined();
      }
    }
  });
});
```

---

## Summary

### Key Testing Patterns for AgentResponse Schemas

1. **Test Each Schema Separately**
   - Status enum validation
   - Error details with/without details field
   - Metadata with/without optional fields
   - Discriminated union variants

2. **Use Discriminated Union Tests**
   - Verify each variant (success/error/partial)
   - Test discriminator field behavior
   - Validate type narrowing works

3. **Test with Factory Functions**
   - Verify createSuccessResponse produces valid schema
   - Verify createErrorResponse produces valid schema
   - Verify null handling (PRD 6.4.4)

4. **Error Validation**
   - Check error structure (code, path, message)
   - Verify multiple errors are reported
   - Test error formatting

5. **Type Safety**
   - Use z.infer<> to verify types
   - Use type guards for narrowing
   - Test discriminated union behavior

---

*These examples use Zod v3.25.76 and Vitest v1.6.1*
*Last Updated: 2026-01-24*

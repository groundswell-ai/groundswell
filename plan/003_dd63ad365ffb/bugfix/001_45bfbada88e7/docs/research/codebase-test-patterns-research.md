# Codebase Test Patterns Research for Zod Schema Validation

**Date:** January 26, 2026
**Task:** P3.M2.T1.S3 - Research existing Zod schema validation tests and testing patterns
**Purpose:** Catalog existing test patterns to follow when writing tests for workflow name validation

---

## Executive Summary

This document catalogs the existing Zod schema validation testing patterns used throughout the Groundswell codebase. These patterns should be followed when writing tests for the new workflow name security validation schema with refinements.

**Key Findings:**
- Tests use Vitest with `describe`, `it`, `expect` (globals enabled)
- Schema tests use `.safeParse()` not `.parse()` for validation tests
- Error assertions check `result.success`, `result.error.errors[]`, and error properties
- Helper functions create test data (valid/invalid responses)
- Tests organized by scenario: "successful validation" vs "validation failures"
- Tests check ZodError structure: path, code, message

---

## Table of Contents

1. [Testing Framework Setup](#1-testing-framework-setup)
2. [Test File Organization](#2-test-file-organization)
3. [Schema Validation Test Patterns](#3-schema-validation-test-patterns)
4. [Error Assertion Patterns](#4-error-assertion-patterns)
5. [Refinement Testing Patterns](#5-refinement-testing-patterns)
6. [Helper Functions Used in Tests](#6-helper-functions-used-in-tests)
7. [Test Organization Patterns](#7-test-organization-patterns)
8. [Complete Test File Examples](#8-complete-test-file-examples)

---

## 1. Testing Framework Setup

### Framework: Vitest

**Configuration:** `vitest.config.ts`
**Globals:** Enabled (describe, it, expect available globally)

**Import Pattern:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
```

**Running Tests:**
```bash
npm test                          # Run all tests
npm test -- workflow-name.test.ts # Run specific file
npm run test:watch                # Watch mode
npm test -- --coverage            # With coverage
```

---

## 2. Test File Organization

### Directory Structure

```
src/__tests__/
├── unit/                    # Unit tests for individual functions/classes
│   ├── agent-response.test.ts
│   ├── workflow-validation.test.ts
│   └── utils/
│       └── agent-validation.test.ts
├── integration/             # Integration tests for component interactions
│   ├── workflow-automatic-validation.test.ts
│   └── agent-validation.test.ts
└── adversarial/             # Edge case and adversarial testing
    └── agent-response-edge-cases.test.ts
```

### File Naming Conventions

- Unit tests: `{feature}.test.ts` or `{class}.test.ts`
- Integration tests: `{integration-point}.test.ts`
- Adversarial tests: `{feature}-edge-cases.test.ts`

---

## 3. Schema Validation Test Patterns

### Pattern 1: Helper Functions for Test Data

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('validateAgentResponse', () => {
  // Helper function to create a valid success response
  function createSuccessResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
    return {
      status: 'success',
      data,
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  // Helper function to create a valid error response
  function createErrorResponse(agentId: string = 'test-agent'): AgentResponse<null> {
    return {
      status: 'error',
      data: null,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: null,
        recoverable: false,
      },
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  // Use helpers in tests
  it('should return valid=true for valid success response', () => {
    const response = createSuccessResponse({ result: 'test' });
    const result = validateAgentResponse(response);

    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });
});
```

**Best Practices:**
- Create helper functions for common test data
- Provide default values for optional parameters
- Use descriptive names that indicate the response type
- Include all required fields

---

### Pattern 2: Arrange-Act-Assert Structure

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`

```typescript
describe('AgentResponse Schema Validation', () => {
  describe('Success Response Validation', () => {
    it('should validate success response with all required fields', () => {
      // Arrange
      const schema = AgentResponseSchema(z.object({ result: z.string() }));
      const response = {
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() },
      };

      // Act
      const result = schema.safeParse(response);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(response);
        expect(result.data.status).toBe('success');
        expect(result.data.error).toBeNull();
      }
    });
  });
});
```

**Best Practices:**
- Use comments to mark Arrange, Act, Assert sections
- Use `safeParse()` for validation tests (not `parse()`)
- Check `result.success` before accessing `result.data`
- Use `toEqual` for deep equality checks
- Use type guards (`if (result.success)`) for type narrowing

---

### Pattern 3: Testing Invalid Inputs

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('validation failures - wrong data types', () => {
  it('should return valid=false when data type does not match schema', () => {
    // Arrange
    const response = createSuccessResponse({ result: 42 }); // number, not string
    const schema = z.object({
      result: z.string(),  // Expects string, but got number
    });

    // Act
    const result = validateAgentResponse(response, schema);

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.errors).toBeInstanceOf(Array);
    expect(result.errors?.errors.length).toBeGreaterThan(0);
    expect(result.errors?.errors[0].code).toBe('invalid_type');
  });

  it('should return valid=false for missing nested fields', () => {
    const response = createSuccessResponse({
      name: 'John'
      // missing age field
    });

    const schema = z.object({
      name: z.string(),
      age: z.number(),  // Required field missing
    });

    const result = validateAgentResponse(response, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
```

**Best Practices:**
- Test specific failure scenarios
- Group related failures in describe blocks
- Check that errors array is populated
- Verify error code (e.g., 'invalid_type', 'custom')
- Use descriptive test names

---

### Pattern 4: Testing Discriminated Unions

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`

```typescript
describe('AgentResponse Schema Validation', () => {
  it('should handle discriminated unions', () => {
    const response1 = createSuccessResponse({ type: 'a', value: 'test' });
    const response2 = createSuccessResponse({ type: 'b', count: 42 });

    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('a'), value: z.string() }),
      z.object({ type: z.literal('b'), count: z.number() }),
    ]);

    const result1 = validateAgentResponse(response1, schema);
    const result2 = validateAgentResponse(response2, schema);

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });
});
```

**Best Practices:**
- Test each union member separately
- Test invalid discriminator values
- Test wrong fields for correct discriminator
- Check for 'invalid_union_discriminator' error code

---

### Pattern 5: Testing Schema Refinements

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('data schema customization', () => {
  it('should respect schema refinements', () => {
    // Arrange
    const response = createSuccessResponse(5);
    const schema = z.number().refine(n => n >= 10, {
      message: 'Number must be at least 10'
    });

    // Act
    const result = validateAgentResponse(response, schema);

    // Assert
    expect(result.valid).toBe(false);
    expect(result.errors?.errors[0].message).toContain('at least 10');
  });
});
```

**Best Practices:**
- Test refinement failure conditions
- Verify error message content
- Test refinement success conditions
- Test edge cases (boundary values)

---

## 4. Error Assertion Patterns

### Pattern 1: Comprehensive Error Checking

**Source:** Multiple test files

```typescript
// Basic validation failure check
expect(result.success).toBe(false);
expect(result.error).toBeDefined();

// Check error structure
expect(result.error?.errors).toBeInstanceOf(Array);
expect(result.error?.errors.length).toBeGreaterThan(0);

// For ValidationResult type (used in validateAgentResponse)
expect(result.valid).toBe(false);
expect(result.errors).toBeDefined();
expect(result.errors?.errors).toBeInstanceOf(Array);
expect(result.errors?.errors.length).toBeGreaterThan(0);
```

---

### Pattern 2: Specific Error Property Checks

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
// Check error code
expect(result.errors?.errors[0].code).toBe('invalid_type');
expect(result.errors?.errors[0].code).toBe('custom');        // For refinements
expect(result.errors?.errors[0].code).toBe('invalid_union_discriminator');

// Check error path
expect(result.errors?.errors[0].path).toEqual(['data', 'field']);
expect(result.errors?.errors[0].path).toEqual(['data', 'user', 'age']);

// Check error message
expect(result.errors?.errors[0].message).toContain('at least 10');
expect(result.errors?.errors[0].message).toBeTruthy();
expect(typeof result.errors?.errors[0].message).toBe('string');
```

---

### Pattern 3: ZodError Structure Verification

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('ZodError structure', () => {
  it('should include ZodError in errors field when invalid', () => {
    const response = {
      status: 'invalid' as any,
      data: 'test',
      error: null,
      metadata: { agentId: 'test-agent', timestamp: Date.now() },
    };

    const result = validateAgentResponse(response);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.name).toBe('ZodError');
    expect(result.errors?.errors).toBeInstanceOf(Array);
    expect(result.errors?.errors.length).toBeGreaterThan(0);
  });

  it('should include error path in ZodError', () => {
    const response = createSuccessResponse({
      user: {
        name: 'John',
        // age is missing
      }
    });

    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    const result = validateAgentResponse(response, schema);

    expect(result.valid).toBe(false);
    expect(result.errors?.errors[0].path).toEqual(['data', 'user', 'age']);
  });

  it('should include error message in ZodError', () => {
    const response = createSuccessResponse('not a number');
    const result = validateAgentResponse(response, z.number());

    expect(result.valid).toBe(false);
    expect(result.errors?.errors[0].message).toBeTruthy();
    expect(typeof result.errors?.errors[0].message).toBe('string');
  });

  it('should include error code in ZodError', () => {
    const response = createSuccessResponse('not a number');
    const result = validateAgentResponse(response, z.number());

    expect(result.valid).toBe(false);
    expect(result.errors?.errors[0].code).toBe('invalid_type');
  });
});
```

---

### Pattern 4: Multiple Errors Handling

```typescript
it('should handle multiple validation errors', () => {
  const response = createSuccessResponse({
    name: 'John',
    // missing required 'count' field
    // extra 'unexpected' field
  });

  const schema = z.object({
    name: z.string(),
    count: z.number(),  // Required but missing
  }).strict();  // Disallows extra fields

  const result = validateAgentResponse(response, schema);

  expect(result.valid).toBe(false);
  expect(result.errors?.errors.length).toBeGreaterThan(0);

  // Check for specific errors
  const countError = result.errors?.errors.find(
    err => err.path.includes('count')
  );
  expect(countError).toBeDefined();
});
```

---

## 5. Refinement Testing Patterns

### Pattern 1: Basic Refinement Testing

```typescript
describe('refinement validation', () => {
  it('should fail refinement when condition not met', () => {
    const schema = z.string().refine(
      val => val.length >= 5,
      { message: 'String must be at least 5 characters' }
    );

    const result = schema.safeParse('abc');

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].code).toBe('custom');
    expect(result.error?.errors[0].message).toContain('at least 5');
  });

  it('should pass refinement when condition is met', () => {
    const schema = z.string().refine(
      val => val.length >= 5,
      { message: 'String must be at least 5 characters' }
    );

    const result = schema.safeParse('abcdef');

    expect(result.success).toBe(true);
  });
});
```

---

### Pattern 2: Refinement with Custom Path

```typescript
describe('refinement with custom path', () => {
  it('should add error at custom path', () => {
    const schema = z.object({
      username: z.string().refine(
        val => /^[a-zA-Z0-9]+$/.test(val),
        {
          message: 'Username must be alphanumeric',
          path: ['username']  // Custom path for error
        }
      )
    });

    const result = schema.safeParse({ username: 'user@name' });

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toEqual(['username']);
    expect(result.error?.errors[0].message).toContain('alphanumeric');
  });
});
```

---

### Pattern 3: Multiple Refinements

```typescript
describe('multiple refinements', () => {
  it('should check all refinements', () => {
    const schema = z.string()
      .refine(val => val.length >= 5, { message: 'Too short' })
      .refine(val => val.length <= 20, { message: 'Too long' })
      .refine(val => /^[a-z]+$/.test(val), { message: 'Lowercase only' });

    const result = schema.safeParse('ABC');

    expect(result.success).toBe(false);
    expect(result.error?.errors.length).toBeGreaterThan(0);
    // May have multiple errors
  });
});
```

---

### Pattern 4: Context-Based Refinement (.superRefine())

**Note:** This pattern is less common in the codebase but important for workflow name validation

```typescript
describe('superRefine validation', () => {
  it('should validate cross-field constraints', () => {
    const schema = z.object({
      password: z.string(),
      confirmPassword: z.string(),
    }).superRefine((data, ctx) => {
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match',
          path: ['confirmPassword']
        });
      }
    });

    const result = schema.safeParse({
      password: 'secret123',
      confirmPassword: 'different'
    });

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].code).toBe('custom');
    expect(result.error?.errors[0].path).toEqual(['confirmPassword']);
  });
});
```

---

## 6. Helper Functions Used in Tests

### Pattern 1: Create Valid/Invalid Responses

**Source:** Multiple test files

```typescript
// Create valid response
function createValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: { agentId, timestamp: Date.now() },
  };
}

// Create invalid response
function createInvalidResponse(agentId: string = 'test-agent'): AgentResponse<unknown> {
  return {
    status: 'invalid' as any,  // Wrong status
    data: 'some data',
    error: null,
    metadata: { agentId, timestamp: Date.now() },
  };
}
```

---

### Pattern 2: Create Mock Objects

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-validation.test.ts`

```typescript
function createMockProvider(id: ProviderId = 'anthropic'): Provider {
  const capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: true,
    extendedThinking: true,
  };

  const mockExecute = vi.fn();
  mockExecute.mockImplementation(async () => {
    return createSuccessResponse(
      { result: `${id} response` },
      { agentId: `test-${id}`, timestamp: Date.now() }
    );
  });

  return {
    id,
    capabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    execute: mockExecute,
    registerMCPs: vi.fn().mockResolvedValue([]),
    loadSkills: vi.fn().mockResolvedValue(undefined),
    normalizeModel: vi.fn((model: string): ModelSpec => ({
      provider: id,
      model,
      raw: model,
    })),
  };
}

function createMockAgent(agentId: string = 'test-agent'): { agent: Agent; agentId: string } {
  const agent = new Agent({ name: 'TestAgent', provider: 'anthropic' });
  vi.spyOn(agent, 'prompt').mockResolvedValue(
    createSuccessResponse({ result: 'default' }, { agentId, timestamp: Date.now() })
  );
  return { agent, agentId };
}
```

---

### Pattern 3: Setup and Teardown

**Source:** Multiple test files

```typescript
describe('Test Suite', () => {
  let events: WorkflowEvent[];
  let observer: WorkflowObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    events = [];
    observer = {
      onLog: vi.fn(),
      onEvent: (e) => events.push(e),
      onStateUpdated: vi.fn(),
      onTreeChanged: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should do something', () => {
    // Test implementation
  });
});
```

---

## 7. Test Organization Patterns

### Pattern 1: Nested Describe Blocks

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('validateAgentResponse', () => {
  describe('successful validation - success status', () => {
    it('should return valid=true for valid success response', () => {
      // Test implementation
    });

    it('should return valid=true for valid success response with custom schema', () => {
      // Test implementation
    });
  });

  describe('successful validation - error status', () => {
    it('should return valid=true for valid error response', () => {
      // Test implementation
    });
  });

  describe('successful validation - partial status', () => {
    it('should return valid=true for valid partial response', () => {
      // Test implementation
    });
  });

  describe('validation failures - missing required fields', () => {
    it('should return valid=false for response missing status field', () => {
      // Test implementation
    });
  });

  describe('validation failures - wrong data types', () => {
    it('should return valid=false when data type does not match schema', () => {
      // Test implementation
    });
  });
});
```

---

### Pattern 2: Scenario-Based Organization

```typescript
describe('Workflow Name Validation', () => {
  describe('valid workflow names', () => {
    it('should accept alphanumeric names', () => {
      // Test
    });

    it('should accept names with hyphens', () => {
      // Test
    });

    it('should accept names with underscores', () => {
      // Test
    });
  });

  describe('invalid workflow names - control characters', () => {
    it('should reject names with null bytes', () => {
      // Test
    });

    it('should reject names with newlines', () => {
      // Test
    });
  });

  describe('invalid workflow names - XSS attempts', () => {
    it('should reject names with script tags', () => {
      // Test
    });

    it('should reject names with javascript: protocol', () => {
      // Test
    });
  });
});
```

---

### Pattern 3: Edge Case Testing

**Source:** `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`

```typescript
describe('edge cases', () => {
  it('should handle empty object response', () => {
    const response = createSuccessResponse({});
    const result = validateAgentResponse(response, z.object({}));

    expect(result.valid).toBe(true);
  });

  it('should handle empty array response', () => {
    const response = createSuccessResponse([]);
    const result = validateAgentResponse(response, z.array(z.unknown()));

    expect(result.valid).toBe(true);
  });

  it('should handle null values in nested objects', () => {
    const response = createSuccessResponse({
      name: 'John',
      email: null  // Explicitly null
    });

    const schema = z.object({
      name: z.string(),
      email: z.string().nullable(),
    });

    const result = validateAgentResponse(response, schema);

    expect(result.valid).toBe(true);
  });
});
```

---

## 8. Complete Test File Examples

### Example 1: Simple Schema Validation Test

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Simple String Schema', () => {
  describe('valid inputs', () => {
    it('should accept valid string', () => {
      const schema = z.string();
      const result = schema.safeParse('hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('hello');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject number', () => {
      const schema = z.string();
      const result = schema.safeParse(123);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].code).toBe('invalid_type');
    });

    it('should reject null', () => {
      const schema = z.string();
      const result = schema.safeParse(null);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].code).toBe('invalid_type');
    });
  });
});
```

---

### Example 2: Object Schema with Refinement

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Username Schema', () => {
  const schema = z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .refine(
        val => /^[a-zA-Z0-9_-]+$/.test(val),
        { message: 'Username can only contain letters, numbers, hyphens, and underscores' }
      )
  });

  describe('valid usernames', () => {
    it('should accept alphanumeric username', () => {
      const result = schema.safeParse({ username: 'user123' });

      expect(result.success).toBe(true);
    });

    it('should accept username with hyphen', () => {
      const result = schema.safeParse({ username: 'user-123' });

      expect(result.success).toBe(true);
    });

    it('should accept username with underscore', () => {
      const result = schema.safeParse({ username: 'user_123' });

      expect(result.success).toBe(true);
    });
  });

  describe('invalid usernames', () => {
    it('should reject username less than 3 characters', () => {
      const result = schema.safeParse({ username: 'ab' });

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('at least 3');
    });

    it('should reject username more than 20 characters', () => {
      const result = schema.safeParse({ username: 'a'.repeat(21) });

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('at most 20');
    });

    it('should reject username with special characters', () => {
      const result = schema.safeParse({ username: 'user@123' });

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].code).toBe('custom');
      expect(result.error?.errors[0].message).toContain('letters, numbers');
    });
  });
});
```

---

### Example 3: Complex Validation with .superRefine()

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Password Confirmation Schema', () => {
  const schema = z.object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  }).superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match',
        path: ['confirmPassword']
      });
    }
  });

  describe('valid password confirmation', () => {
    it('should accept matching passwords', () => {
      const result = schema.safeParse({
        password: 'secret123',
        confirmPassword: 'secret123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('invalid password confirmation', () => {
    it('should reject non-matching passwords', () => {
      const result = schema.safeParse({
        password: 'secret123',
        confirmPassword: 'different'
      });

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].code).toBe('custom');
      expect(result.error?.errors[0].path).toEqual(['confirmPassword']);
      expect(result.error?.errors[0].message).toBe('Passwords do not match');
    });

    it('should reject short password', () => {
      const result = schema.safeParse({
        password: 'short',
        confirmPassword: 'short'
      });

      expect(result.success).toBe(false);
      // Error is on password field for being too short
      expect(result.error?.errors[0].path).toEqual(['password']);
    });
  });
});
```

---

## Summary: Key Testing Patterns for Workflow Name Validation

When writing tests for workflow name validation with refinements, follow these patterns:

### 1. Test Structure
```typescript
describe('WorkflowNameSchema', () => {
  describe('valid workflow names', () => {
    // Tests for valid inputs
  });

  describe('invalid workflow names - control characters', () => {
    // Tests for control character rejection
  });

  describe('invalid workflow names - XSS attempts', () => {
    // Tests for XSS pattern rejection
  });

  describe('invalid workflow names - path traversal', () => {
    // Tests for path traversal rejection
  });
});
```

### 2. Helper Function
```typescript
function createWorkflowName(name: string): { name: string } {
  return { name };
}
```

### 3. Validation Assertion Pattern
```typescript
// For valid input
const result = schema.safeParse(validInput);
expect(result.success).toBe(true);

// For invalid input
const result = schema.safeParse(invalidInput);
expect(result.success).toBe(false);
expect(result.error?.errors).toBeInstanceOf(Array);
expect(result.error?.errors.length).toBeGreaterThan(0);
expect(result.error?.errors[0].code).toBe('custom'); // For refinements
expect(result.error?.errors[0].path).toEqual(['name']);
```

### 4. Test Specific Refinement Messages
```typescript
expect(result.error?.errors[0].message).toContain('control character');
expect(result.error?.errors[0].message).toContain('XSS');
expect(result.error?.errors[0].message).toContain('path traversal');
```

### 5. Test Edge Cases
- Empty string
- Very long strings
- Unicode characters
- Mixed valid/invalid patterns
- Boundary conditions

---

## References

### Key Test Files Analyzed

1. `/home/dustin/projects/groundswell/src/__tests__/unit/utils/agent-validation.test.ts`
   - Helper functions for creating test data
   - Comprehensive error assertion patterns
   - Refinement testing examples

2. `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`
   - Schema validation with discriminated unions
   - Type guard testing
   - Null handling patterns

3. `/home/dustin/projects/groundswell/src/__tests__/unit/workflow-validation.test.ts`
   - Integration test patterns
   - Mock object creation
   - Event emission testing

4. `/home/dustin/projects/groundswell/src/__tests__/integration/agent-validation.test.ts`
   - Workflow-level validation
   - Error context verification
   - ZodError structure validation

### Documentation References

1. `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/vitest-zod-testing-quick-reference.md`
   - Quick reference for common patterns

2. `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/vitest-zod-testing-guide.md`
   - Comprehensive testing guide

3. `/home/dustin/projects/groundswell/src/utils/agent-validation.ts`
   - Example ValidationResult type
   - Pure validation function pattern

---

**End of Research Document**

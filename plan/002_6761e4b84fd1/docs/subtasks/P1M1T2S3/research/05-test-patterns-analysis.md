# Test Patterns Analysis for AgentResponse Validation

**PRP**: P1.M1.T2.S3
**Research Date**: 2026-01-24
**Purpose**: Understand existing test patterns for validating AgentResponse handling

---

## Executive Summary

**Test Framework**: Vitest v1.0.0 with TypeScript support

**Test Location**: `src/__tests__/` directory

**Key Test File**: `src/__tests__/unit/agent-response-factory.test.ts` - Contains existing patterns for testing `AgentResponse`

**Test Patterns Identified**:
- Factory function testing
- Type preservation testing
- Type guard testing
- Discriminated union testing
- Mocking patterns

---

## 1. Test Framework Configuration

### 1.1 Vitest Configuration

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

**Key Features**:
- Globals enabled for cleaner test syntax
- Node environment for backend testing
- TypeScript support
- Coverage reporting with v8

---

## 2. Existing AgentResponse Tests

### 2.1 agent-response-factory.test.ts

**Location**: `src/__tests__/unit/agent-response-factory.test.ts`

**Test Categories**:

#### Factory Function Tests
```typescript
describe('createSuccessResponse', () => {
  it('should create a success response with data', () => {
    const data = { result: 'success' };
    const metadata = {
      agentId: 'test-agent',
      timestamp: Date.now(),
    };

    const response = createSuccessResponse(data, metadata);

    expect(response.status).toBe('success');
    expect(response.data).toEqual(data);
    expect(response.error).toBeNull();
    expect(response.metadata).toEqual(metadata);
  });
});
```

#### Type Guard Tests
```typescript
describe('isSuccess', () => {
  it('should return true for success responses', () => {
    const response = createSuccessResponse(data, metadata);
    expect(isSuccess(response)).toBe(true);
  });

  it('should narrow type correctly', () => {
    const response = createSuccessResponse(data, metadata);

    if (isSuccess(response)) {
      // TypeScript knows response.data is not null
      expect(response.data).toBeDefined();
    }
  });
});
```

---

## 3. Mocking Patterns

### 3.1 Simple Agent Mock

```typescript
const mockAgent = {
  prompt: vi.fn().mockResolvedValue({
    status: 'success',
    data: { result: 'test' },
    error: null,
    metadata: { agentId: 'mock', timestamp: Date.now() }
  })
};
```

### 3.2 Method Mocking

```typescript
import { Agent } from '../../core/agent.js';

vi.spyOn(agent, 'prompt').mockResolvedValue({
  status: 'success',
  data: { result: 'test' },
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
});
```

---

## 4. Recommended Test Cases for Updated Call Sites

### 4.1 For workflow-context.ts replaceLastPromptResult()

```typescript
describe('replaceLastPromptResult', () => {
  it('should extract data from successful AgentResponse', async () => {
    // Arrange
    const mockAgent = {
      prompt: vi.fn().mockResolvedValue({
        status: 'success' as const,
        data: { result: 'test' },
        error: null,
        metadata: { agentId: 'test', timestamp: Date.now() }
      })
    };

    // Act
    const result = await context.replaceLastPromptResult(prompt, mockAgent);

    // Assert
    expect(result).toEqual({ result: 'test' });
  });

  it('should throw error for error AgentResponse', async () => {
    // Arrange
    const mockAgent = {
      prompt: vi.fn().mockResolvedValue({
        status: 'error' as const,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Test error',
          recoverable: false
        },
        metadata: { agentId: 'test', timestamp: Date.now() }
      })
    };

    // Act & Assert
    await expect(context.replaceLastPromptResult(prompt, mockAgent))
      .rejects
      .toThrow('Test error');
  });

  it('should preserve error code in thrown error', async () => {
    // Arrange
    const mockAgent = {
      prompt: vi.fn().mockResolvedValue({
        status: 'error' as const,
        data: null,
        error: {
          code: 'INVALID_RESPONSE_FORMAT',
          message: 'Format error',
          recoverable: false
        },
        metadata: { agentId: 'test', timestamp: Date.now() }
      })
    };

    // Act & Assert
    await expect(context.replaceLastPromptResult(prompt, mockAgent))
      .rejects
      .toThrow('[INVALID_RESPONSE_FORMAT]');
  });
});
```

---

## 5. Test Utilities

### 5.1 Mock AgentResponse Factory

```typescript
// test-utils/agent-response-mock.ts
export function createMockSuccessResponse<T>(data: T): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata: {
      agentId: 'mock-agent',
      timestamp: Date.now(),
    }
  };
}

export function createMockErrorResponse(
  code: string,
  message: string,
  recoverable = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: { code, message, recoverable },
    metadata: {
      agentId: 'mock-agent',
      timestamp: Date.now(),
    }
  };
}
```

---

## 6. Running Tests

### 6.1 Run All Tests

```bash
npm test
```

### 6.2 Run Specific Test File

```bash
npm test -- workflow-context.test.ts
```

### 6.3 Run with Coverage

```bash
npm run test:coverage
```

---

## 7. Key Takeaways

1. **Use Vitest** - The framework is already set up and configured
2. **Follow Existing Patterns** - `agent-response-factory.test.ts` shows the way
3. **Test All Response Types** - Success, error, and partial responses
4. **Use Type Guards** - Test `isSuccess()`, `isError()` behavior
5. **Mock Properly** - Use the mock factory functions for consistent test data
6. **Assert Structure** - Check status, data/error, and metadata separately

---

## 8. Next Steps

1. **Create Test File**: `src/__tests__/unit/workflow-context.test.ts`
2. **Add Tests**: For `replaceLastPromptResult()` method
3. **Run Tests**: Verify all tests pass
4. **Check Coverage**: Ensure 100% coverage of updated code

The existing test infrastructure provides a solid foundation. Follow the patterns from `agent-response-factory.test.ts` for consistency.

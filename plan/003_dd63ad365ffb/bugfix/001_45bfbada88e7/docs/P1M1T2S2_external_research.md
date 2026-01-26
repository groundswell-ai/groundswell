# External Research: Error Analysis Utilities in TypeScript/Node.js

**Research Date:** January 26, 2026
**Focus:** Transient error detection, error classification, pure function design, testing strategies, and retry decision logic

---

## Executive Summary

This document compiles industry best practices for implementing robust error analysis utilities in TypeScript/Node.js, with specific focus on transient error detection, error classification patterns, pure function design, and retry decision logic. The research draws from authoritative sources including cloud provider documentation, open-source retry libraries, and TypeScript best practices.

**Key Findings:**
- Transient errors should be detected via error codes, messages, and HTTP status codes
- Error classification should use discriminated unions for type safety
- Pure function design ensures predictable, testable error analysis
- Testing should cover both error matching and restart decision logic
- Industry-standard retry logic includes exponential backoff with jitter
- Common pitfalls include over-matching errors and missing edge cases

---

## Table of Contents

1. [Transient Error Detection Best Practices](#1-transient-error-detection-best-practices)
2. [Error Code Classification Patterns](#2-error-code-classification-patterns)
3. [Pure Function Design Patterns](#3-pure-function-design-patterns)
4. [Error Matching and Criterion Evaluation](#4-error-matching-and-criterion-evaluation)
5. [Testing Strategies for Error Analysis](#5-testing-strategies-for-error-analysis)
6. [Common Pitfalls and Anti-Patterns](#6-common-pitfalls-and-anti-patterns)
7. [Industry-Standard Retry Decision Logic](#7-industry-standard-retry-decision-logic)
8. [Implementation Checklist](#8-implementation-checklist)
9. [References and Sources](#9-references-and-sources)

---

## 1. Transient Error Detection Best Practices

### 1.1 Definition of Transient Errors

**Transient errors** are temporary faults that typically resolve themselves quickly without intervention. Common examples include:
- Network timeouts and connection drops
- Rate limiting (HTTP 429)
- Service temporarily unavailable (HTTP 503)
- Database connection pool exhaustion
- DNS resolution failures

### 1.2 Detection Patterns

#### Pattern 1: Error Code Matching

```typescript
// From industry best practices
const TRANSIENT_ERROR_CODES = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'TIMEOUT',
  'NETWORK_ERROR'
] as const;

function isTransientError(error: Error): boolean {
  return 'code' in error &&
         TRANSIENT_ERROR_CODES.includes(error.code as any);
}
```

**Best Practices:**
- Use const assertions for type-safe error code arrays
- Check for `code` property before accessing
- Cover both Node.js system errors and custom error codes

#### Pattern 2: HTTP Status Code Detection

```typescript
// From AWS/Azure retry patterns
const TRANSIENT_HTTP_STATUS = new Set([
  408, // Request Timeout
  429, // Too Many Requests (Rate Limit)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

function isTransientHttpError(error: Error): boolean {
  if ('statusCode' in error || 'status' in error) {
    const status = (error as any).statusCode || (error as any).status;
    return TRANSIENT_HTTP_STATUS.has(status);
  }
  return false;
}
```

**Key Insights:**
- Use Set for O(1) lookup performance
- Check both `statusCode` and `status` properties (different libraries use different names)
- Focus on server errors (5xx) and specific client errors (408, 429)

#### Pattern 3: Message-Based Detection

```typescript
// Fallback pattern when error codes are unavailable
const TRANSIENT_PATTERNS = [
  /timeout/i,
  /temporal/i,
  /temporary/i,
  /unavailable/i,
  /rate limit/i,
  /throttl/i,
  /connection/i,
  /network/i
];

function isTransientByMessage(error: Error): boolean {
  return TRANSIENT_PATTERNS.some(pattern =>
    pattern.test(error.message)
  );
}
```

**Gotchas:**
- Message-based detection is brittle and should be a fallback
- Use case-insensitive regex patterns
- Combine with other detection methods for reliability

### 1.3 Comprehensive Transient Detection

```typescript
// Industry-standard comprehensive approach
function isTransientError(error: Error): boolean {
  // Check error code first (most reliable)
  if (isTransientByCode(error)) {
    return true;
  }

  // Check HTTP status
  if (isTransientHttpError(error)) {
    return true;
  }

  // Fallback to message matching
  if (isTransientByMessage(error)) {
    return true;
  }

  return false;
}
```

**Best Practice:** Chain multiple detection methods from most to least reliable.

---

## 2. Error Code Classification Patterns

### 2.1 Standard Error Categories

#### Network Errors

```typescript
const NETWORK_ERROR_CODES = [
  'ETIMEDOUT',      // Connection timeout
  'ECONNRESET',     // Connection reset by peer
  'ECONNREFUSED',   // Connection refused
  'ENOTFOUND',      // DNS lookup failed
  'EAI_AGAIN',      // DNS temporary failure
  'EPIPE',          // Broken pipe
  'EHOSTUNREACH',   // Host unreachable
  'ENETUNREACH',    // Network unreachable
] as const;
```

#### Timeout Errors

```typescript
const TIMEOUT_ERROR_CODES = [
  'TIMEOUT',
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
  'ETIMEDOUTREQ',
] as const;
```

#### Rate Limit Errors

```typescript
const RATE_LIMIT_ERROR_CODES = [
  'RATE_LIMIT_EXCEEDED',
  'THROTTLED',
  'TOO_MANY_REQUESTS',
  '429',
] as const;
```

### 2.2 Discriminated Union Pattern

```typescript
// Type-safe error classification
type ErrorCodeCategory =
  | { type: 'network'; code: string; retryable: true }
  | { type: 'timeout'; code: string; retryable: true }
  | { type: 'rate_limit'; code: string; retryable: true }
  | { type: 'auth'; code: string; retryable: false }
  | { type: 'validation'; code: string; retryable: false }
  | { type: 'unknown'; code: string; retryable: boolean };

function classifyErrorCode(code: string): ErrorCodeCategory {
  if (NETWORK_ERROR_CODES.includes(code as any)) {
    return { type: 'network', code, retryable: true };
  }
  if (TIMEOUT_ERROR_CODES.includes(code as any)) {
    return { type: 'timeout', code, retryable: true };
  }
  if (RATE_LIMIT_ERROR_CODES.includes(code as any)) {
    return { type: 'rate_limit', code, retryable: true };
  }
  if (code.startsWith('AUTH_') || code === 'UNAUTHORIZED') {
    return { type: 'auth', code, retryable: false };
  }
  if (code.startsWith('VALIDATION_') || code === 'INVALID_INPUT') {
    return { type: 'validation', code, retryable: false };
  }
  return { type: 'unknown', code, retryable: false };
}
```

**Benefits:**
- Type-safe discrimination via `type` field
- Explicit retryability flag
- Easy to extend with new categories
- Enables exhaustive checking with TypeScript

### 2.3 Error Code Mapping Interface

```typescript
// Flexible error code registry
interface ErrorCodeMapping {
  codes: readonly string[];
  category: string;
  retryable: boolean;
  suggestedAction?: 'retry' | 'abort' | 'rebuild';
  successProbability?: number;
}

const ERROR_CODE_REGISTRY: ErrorCodeMapping[] = [
  {
    codes: NETWORK_ERROR_CODES,
    category: 'network',
    retryable: true,
    suggestedAction: 'retry',
    successProbability: 0.7
  },
  {
    codes: TIMEOUT_ERROR_CODES,
    category: 'timeout',
    retryable: true,
    suggestedAction: 'retry',
    successProbability: 0.6
  },
  {
    codes: RATE_LIMIT_ERROR_CODES,
    category: 'rate_limit',
    retryable: true,
    suggestedAction: 'retry',
    successProbability: 0.8
  },
  {
    codes: ['AUTH_FAILED', 'INVALID_API_KEY'] as const,
    category: 'auth',
    retryable: false,
    suggestedAction: 'abort',
    successProbability: 0.0
  }
];
```

---

## 3. Pure Function Design Patterns

### 3.1 Characteristics of Pure Error Analysis Functions

**Pure functions** for error analysis must:
1. **Same input → Same output**: Deterministic behavior
2. **No side effects**: Don't modify inputs or external state
3. **No external dependencies**: Don't depend on time, random values, or I/O
4. **Immutable operations**: Return new objects instead of mutating

### 3.2 Pure Error Classification

```typescript
// Pure function: always returns same result for same input
function analyzeError(error: Error): {
  isTransient: boolean;
  category: string;
  retryable: boolean;
  suggestedAction: 'retry' | 'abort' | 'rebuild';
} {
  const isTransient = isTransientError(error);
  const category = classifyError(error);

  return {
    isTransient,
    category,
    retryable: isTransient,
    suggestedAction: isTransient ? 'retry' : 'abort'
  };
}
```

**Why Pure?**
- Easy to test (no mocking required)
- Predictable behavior
- Can be memoized for performance
- Thread-safe in concurrent scenarios

### 3.3 Pure Error Criterion Matching

```typescript
// Pure function: no side effects, deterministic
function matchesCriterion(
  criterion: ErrorCriterion,
  error: WorkflowError
): boolean {
  // Check function type first (required for discriminated union safety)
  if (typeof criterion === 'function') {
    return criterion(error);
  }

  // Check code criterion
  if ('code' in criterion) {
    const errorCode = error.code || '';
    if (criterion.code instanceof RegExp) {
      return criterion.code.test(errorCode);
    }
    return errorCode === criterion.code;
  }

  // Check recoverable criterion
  if ('recoverable' in criterion) {
    return error.original?.recoverable === criterion.recoverable;
  }

  return false;
}
```

**Key Principles:**
- Never mutate `criterion` or `error`
- Return boolean (no side effects)
- Handle all union type branches
- Use early returns for clarity

### 3.4 Pure Restart Analysis

```typescript
// Pure function: analyzes error without side effects
function analyzeRestartDecision(
  error: WorkflowError,
  attemptNumber: number,
  maxRetries: number
): RestartAnalysis {
  // Check if we've exhausted retries
  if (attemptNumber >= maxRetries) {
    return {
      shouldRestart: false,
      reason: `Max retries exceeded (${attemptNumber}/${maxRetries})`,
      suggestedAction: 'abort',
      estimatedSuccessProbability: 0.0
    };
  }

  // Analyze error type
  const category = classifyError(error);

  // Permanent errors should not retry
  if (!category.retryable) {
    return {
      shouldRestart: false,
      reason: `Non-retryable error: ${category.type}`,
      suggestedAction: 'abort',
      estimatedSuccessProbability: 0.0
    };
  }

  // Transient errors should retry
  return {
    shouldRestart: true,
    reason: `Transient error detected: ${category.type}`,
    suggestedAction: 'retry',
    estimatedSuccessProbability: category.successProbability || 0.5
  };
}
```

### 3.5 Immutability Patterns

```typescript
// BAD: Mutates error object
function enrichErrorBad(error: any): void {
  error.analyzedAt = new Date();
  error.category = 'network';
}

// GOOD: Returns new enriched error
function enrichErrorGood(error: Error): Error & {
  analyzedAt: Date;
  category: string;
} {
  return {
    ...error,
    analyzedAt: new Date(),
    category: 'network'
  };
}
```

---

## 4. Error Matching and Criterion Evaluation

### 4.1 Discriminated Union Safety

**Critical Pattern:** When using discriminated unions with functions, always check for functions FIRST at runtime.

```typescript
// CORRECT: Check function type first
function matchesCriterion(
  criterion: ErrorCriterion,
  error: WorkflowError
): boolean {
  // MUST check function first - functions can have properties!
  if (typeof criterion === 'function') {
    return criterion(error);
  }

  // Now safe to use discriminant checks
  if ('code' in criterion) {
    // ... handle code matching
  }

  if ('recoverable' in criterion) {
    // ... handle recoverable matching
  }

  return false;
}
```

**Why This Matters:**
In JavaScript, functions are objects and can have properties:
```typescript
const func = () => true;
func.code = 'TIMEOUT'; // Functions can have properties!

// If we check 'code' in criterion first:
'code' in func // true! (TypeScript would incorrectly narrow type)
```

### 4.2 RegExp vs String Matching

```typescript
// String matching: exact equality
const stringCriterion: ErrorCriterion = { code: 'TIMEOUT' };
// Matches: 'TIMEOUT' === 'TIMEOUT'

// RegExp matching: pattern matching
const regexCriterion: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };
// Matches: 'TIMEOUT'.test(/TIMEOUT|NETWORK_ERROR/)
// Matches: 'NETWORK_ERROR'.test(/TIMEOUT|NETWORK_ERROR/)

function matchesCode(
  criterion: string | RegExp,
  errorCode: string
): boolean {
  if (criterion instanceof RegExp) {
    return criterion.test(errorCode);
  }
  return errorCode === criterion;
}
```

**Best Practices:**
- Use string matching for exact error codes
- Use RegExp for patterns (e.g., `/TIMEOUT.*/`)
- Always check `instanceof RegExp` before calling `.test()`
- Anchor patterns carefully (`/^TIMEOUT$/` vs `/TIMEOUT/`)

### 4.3 Complex Criterion Composition

```typescript
// Combine multiple criteria with AND logic
function matchesAllCriteria(
  error: WorkflowError,
  criteria: ErrorCriterion[]
): boolean {
  return criteria.every(criterion =>
    matchesCriterion(criterion, error)
  );
}

// Combine multiple criteria with OR logic
function matchesAnyCriteria(
  error: WorkflowError,
  criteria: ErrorCriterion[]
): boolean {
  return criteria.some(criterion =>
    matchesCriterion(criterion, error)
  );
}

// Negate a criterion
function not(
  criterion: ErrorCriterion
): ErrorCriterion {
  return (error: WorkflowError) =>
    !matchesCriterion(criterion, error);
}
```

### 4.4 Type Guards for Criterion Evaluation

```typescript
// Type guard for code criterion
function isCodeCriterion(
  criterion: ErrorCriterion
): criterion is { code: string | RegExp } {
  return typeof criterion !== 'function' && 'code' in criterion;
}

// Type guard for recoverable criterion
function isRecoverableCriterion(
  criterion: ErrorCriterion
): criterion is { recoverable: boolean } {
  return typeof criterion !== 'function' && 'recoverable' in criterion;
}

// Type guard for function criterion
function isFunctionCriterion(
  criterion: ErrorCriterion
): criterion is (error: WorkflowError) => boolean {
  return typeof criterion === 'function';
}
```

---

## 5. Testing Strategies for Error Analysis

### 5.1 Unit Testing Error Matching

```typescript
describe('matchesCriterion', () => {
  describe('string code matching', () => {
    it('should match exact error code', () => {
      const criterion: ErrorCriterion = { code: 'TIMEOUT' };
      const error: WorkflowError = {
        message: 'Request timed out',
        code: 'TIMEOUT'
      };

      expect(matchesCriterion(criterion, error)).toBe(true);
    });

    it('should not match different error code', () => {
      const criterion: ErrorCriterion = { code: 'TIMEOUT' };
      const error: WorkflowError = {
        message: 'Network error',
        code: 'NETWORK_ERROR'
      };

      expect(matchesCriterion(criterion, error)).toBe(false);
    });
  });

  describe('regex code matching', () => {
    it('should match regex pattern', () => {
      const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK/ };
      const error: WorkflowError = {
        message: 'Request timed out',
        code: 'TIMEOUT'
      };

      expect(matchesCriterion(criterion, error)).toBe(true);
    });

    it('should match multiple patterns', () => {
      const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK/ };

      expect(matchesCriterion(criterion,
        { message: '', code: 'TIMEOUT' }
      )).toBe(true);

      expect(matchesCriterion(criterion,
        { message: '', code: 'NETWORK_ERROR' }
      )).toBe(true);

      expect(matchesCriterion(criterion,
        { message: '', code: 'AUTH_ERROR' }
      )).toBe(false);
    });
  });

  describe('recoverable flag matching', () => {
    it('should match recoverable flag', () => {
      const criterion: ErrorCriterion = { recoverable: true };
      const error: WorkflowError = {
        message: 'Temporary failure',
        original: { recoverable: true } as any
      };

      expect(matchesCriterion(criterion, error)).toBe(true);
    });

    it('should not match when recoverable flag differs', () => {
      const criterion: ErrorCriterion = { recoverable: true };
      const error: WorkflowError = {
        message: 'Permanent failure',
        original: { recoverable: false } as any
      };

      expect(matchesCriterion(criterion, error)).toBe(false);
    });
  });

  describe('custom predicate matching', () => {
    it('should execute custom predicate', () => {
      const criterion: ErrorCriterion = (error) =>
        error.message.includes('timeout') &&
        error.code === 'TIMEOUT';

      const matchingError: WorkflowError = {
        message: 'Request timeout',
        code: 'TIMEOUT'
      };

      const nonMatchingError: WorkflowError = {
        message: 'Network error',
        code: 'NETWORK_ERROR'
      };

      expect(matchesCriterion(criterion, matchingError)).toBe(true);
      expect(matchesCriterion(criterion, nonMatchingError)).toBe(false);
    });
  });
});
```

### 5.2 Unit Testing Restart Analysis

```typescript
describe('analyzeRestartDecision', () => {
  it('should not restart when max retries exceeded', () => {
    const error: WorkflowError = {
      message: 'Timeout',
      code: 'TIMEOUT'
    };

    const analysis = analyzeRestartDecision(error, 4, 3);

    expect(analysis).toEqual({
      shouldRestart: false,
      reason: 'Max retries exceeded (4/3)',
      suggestedAction: 'abort',
      estimatedSuccessProbability: 0.0
    });
  });

  it('should not restart for non-retryable errors', () => {
    const error: WorkflowError = {
      message: 'Invalid API key',
      code: 'AUTH_FAILED'
    };

    const analysis = analyzeRestartDecision(error, 1, 3);

    expect(analysis.shouldRestart).toBe(false);
    expect(analysis.suggestedAction).toBe('abort');
    expect(analysis.estimatedSuccessProbability).toBe(0.0);
  });

  it('should restart for transient errors', () => {
    const error: WorkflowError = {
      message: 'Connection timeout',
      code: 'ETIMEDOUT'
    };

    const analysis = analyzeRestartDecision(error, 1, 3);

    expect(analysis.shouldRestart).toBe(true);
    expect(analysis.suggestedAction).toBe('retry');
    expect(analysis.estimatedSuccessProbability).toBeGreaterThan(0.5);
  });

  it('should estimate success probability based on error type', () => {
    const timeoutError: WorkflowError = {
      message: 'Timeout',
      code: 'TIMEOUT'
    };

    const networkError: WorkflowError = {
      message: 'Network error',
      code: 'ENETUNREACH'
    };

    const timeoutAnalysis = analyzeRestartDecision(timeoutError, 1, 3);
    const networkAnalysis = analyzeRestartDecision(networkError, 1, 3);

    expect(timeoutAnalysis.estimatedSuccessProbability)
      .toBeGreaterThanOrEqual(0.0)
      .toBeLessThanOrEqual(1.0);

    expect(networkAnalysis.estimatedSuccessProbability)
      .toBeGreaterThanOrEqual(0.0)
      .toBeLessThanOrEqual(1.0);
  });
});
```

### 5.3 Property-Based Testing

```typescript
// Use vitest's property testing or fast-check
import { test } from 'vitest';

describe('matchesCriterion properties', () => {
  test.prop([
    fc.string(),
    fc.boolean(),
    fc.constantFrom('TIMEOUT', 'NETWORK_ERROR', 'AUTH_FAILED')
  ])('should handle all error codes correctly', (message, recoverable, code) => {
    const error: WorkflowError = { message, code };
    const criterion: ErrorCriterion = { code: 'TIMEOUT' };

    const result = matchesCriterion(criterion, error);

    // Should only match if code is TIMEOUT
    expect(result).toBe(code === 'TIMEOUT');
  });
});
```

### 5.4 Edge Case Testing

```typescript
describe('error analysis edge cases', () => {
  it('should handle undefined error code', () => {
    const error: WorkflowError = {
      message: 'Unknown error'
      // code is undefined
    };

    const criterion: ErrorCriterion = { code: 'TIMEOUT' };

    expect(matchesCriterion(criterion, error)).toBe(false);
  });

  it('should handle null original error', () => {
    const error: WorkflowError = {
      message: 'Error',
      original: null
    };

    const criterion: ErrorCriterion = { recoverable: true };

    expect(matchesCriterion(criterion, error)).toBe(false);
  });

  it('should handle function criterion with code property', () => {
    // This is why we check typeof === 'function' first!
    const funcCriterion = ((error: WorkflowError) => true) as ErrorCriterion;
    (funcCriterion as any).code = 'TIMEOUT'; // Functions can have properties

    const error: WorkflowError = {
      message: 'Test',
      code: 'TIMEOUT'
    };

    // Should execute function, not check code property
    expect(matchesCriterion(funcCriterion, error)).toBe(true);
  });

  it('should handle empty regex pattern', () => {
    const criterion: ErrorCriterion = { code: /()/ };
    const error: WorkflowError = {
      message: 'Any error',
      code: 'ANY_CODE'
    };

    expect(matchesCriterion(criterion, error)).toBe(true);
  });
});
```

### 5.5 Integration Testing with Step Decorator

```typescript
describe('Step decorator with error criteria', () => {
  it('should retry only when error matches criteria', async () => {
    const events: WorkflowEvent[] = [];

    class CriteriaWorkflow extends Workflow {
      attemptCount = 0;

      @Step({
        restartable: true,
        maxRetries: 3,
        retryOn: [
          { code: 'TIMEOUT' },           // Retry on timeout
          { code: /NETWORK.*/ },          // Retry on network errors
          { recoverable: true }           // Retry on recoverable
        ]
      })
      async conditionalStep(): Promise<void> {
        this.attemptCount++;

        if (this.attemptCount === 1) {
          throw { message: 'Timeout', code: 'TIMEOUT' };
        }
        if (this.attemptCount === 2) {
          throw { message: 'Auth failed', code: 'AUTH_FAILED' };
        }
      }

      async run(): Promise<void> {
        await this.conditionalStep();
      }

      override emit(event: WorkflowEvent): void {
        events.push(event);
      }
    }

    const wf = new CriteriaWorkflow();

    // Should retry on TIMEOUT (attempt 1 -> 2)
    // Should NOT retry on AUTH_FAILED (attempt 2 -> fail)
    await expect(wf.run()).rejects.toThrow();

    expect(wf.attemptCount).toBe(2); // Initial + 1 retry (not 3)
  });
});
```

---

## 6. Common Pitfalls and Anti-Patterns

### 6.1 Over-Matching Errors

**Anti-Pattern:**
```typescript
// BAD: Too broad - catches everything!
const badCriterion: ErrorCriterion = { code: /.*/ };
```

**Problem:** Will match any error, including permanent failures like authentication errors.

**Solution:**
```typescript
// GOOD: Specific patterns
const goodCriterion: ErrorCriterion = {
  code: /^TIMEOUT$|^NETWORK_ERROR$/
};
```

### 6.2 Missing Error Context

**Anti-Pattern:**
```typescript
// BAD: Doesn't preserve original error
function analyzeError(error: Error): RestartAnalysis {
  return {
    shouldRestart: false,
    reason: 'Error occurred',  // Lost error details!
    suggestedAction: 'abort',
    estimatedSuccessProbability: 0.0
  };
}
```

**Solution:**
```typescript
// GOOD: Includes error context
function analyzeError(error: Error): RestartAnalysis {
  return {
    shouldRestart: false,
    reason: `Non-retryable error: ${error.message}`,
    suggestedAction: 'abort',
    estimatedSuccessProbability: 0.0
  };
}
```

### 6.3 Ignoring Edge Cases

**Anti-Pattern:**
```typescript
// BAD: Doesn't handle undefined/null
function matchesCriterion(criterion: ErrorCriterion, error: any): boolean {
  return error.code === criterion.code;  // Crashes if error is null!
}
```

**Solution:**
```typescript
// GOOD: Handles all cases
function matchesCriterion(criterion: ErrorCriterion, error: WorkflowError): boolean {
  if (!error || !error.code) {
    return false;
  }
  if (typeof criterion === 'function') {
    try {
      return criterion(error);
    } catch {
      return false;
    }
  }
  if ('code' in criterion) {
    return criterion.code instanceof RegExp
      ? criterion.code.test(error.code || '')
      : error.code === criterion.code;
  }
  return false;
}
```

### 6.4 Impure Functions in Criteria

**Anti-Pattern:**
```typescript
// BAD: Non-deterministic
const badCriterion: ErrorCriterion = (error) => {
  const timestamp = Date.now();  // Changes every call!
  return timestamp % 2 === 0;
};
```

**Problem:** Unpredictable behavior, hard to test, not reproducible.

**Solution:**
```typescript
// GOOD: Pure function
const goodCriterion: ErrorCriterion = (error) => {
  return error.code === 'TIMEOUT' &&
         error.message.includes('temporary');
};
```

### 6.5 Hardcoded Retry Counts

**Anti-Pattern:**
```typescript
// BAD: Hardcoded, inflexible
function shouldRetry(attemptNumber: number): boolean {
  return attemptNumber < 3;  // Why 3?
}
```

**Solution:**
```typescript
// GOOD: Configurable
function shouldRetry(
  attemptNumber: number,
  maxRetries: number
): boolean {
  return attemptNumber < maxRetries;
}
```

### 6.6 Missing Type Guards

**Anti-Pattern:**
```typescript
// BAD: Unsafe type assertion
function handleCriterion(criterion: ErrorCriterion) {
  if ('code' in criterion) {
    // TypeScript thinks criterion is { code: string | RegExp }
    // But it could be a function with a code property!
    const code = (criterion as any).code;
  }
}
```

**Solution:**
```typescript
// GOOD: Type guard
function isCodeCriterion(
  criterion: ErrorCriterion
): criterion is { code: string | RegExp } {
  return typeof criterion !== 'function' && 'code' in criterion;
}

function handleCriterion(criterion: ErrorCriterion) {
  if (isCodeCriterion(criterion)) {
    // TypeScript correctly narrows type
    const code = criterion.code;
  }
}
```

### 6.7 Not Testing All Discriminant Branches

**Anti-Pattern:**
```typescript
// BAD: Only tests happy path
describe('matchesCriterion', () => {
  it('should match code', () => {
    // Tests only code matching
  });
});
```

**Solution:**
```typescript
// GOOD: Tests all branches
describe('matchesCriterion', () => {
  describe('code criterion', () => {
    it('should match string code');
    it('should match regex code');
    it('should not mismatched code');
  });

  describe('recoverable criterion', () => {
    it('should match true');
    it('should match false');
    it('should handle missing original');
  });

  describe('function criterion', () => {
    it('should execute function');
    it('should handle exceptions');
  });
});
```

---

## 7. Industry-Standard Retry Decision Logic

### 7.1 Exponential Backoff with Jitter

**From AWS/Azure best practices:**

```typescript
function calculateRetryDelay(
  attemptNumber: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attemptNumber);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: random value between 0-1000ms
  const jitter = Math.random() * 1000;

  return Math.floor(cappedDelay + jitter);
}
```

**Why Jitter?**
- Prevents "thundering herd" problem
- Avoids synchronized retries from multiple clients
- Reduces load on failing services

**Example Delays:**
- Attempt 0: 1000ms + jitter
- Attempt 1: 2000ms + jitter
- Attempt 2: 4000ms + jitter
- Attempt 3: 8000ms + jitter
- Attempt 4: 16000ms + jitter
- Attempt 5: 30000ms + jitter (capped)

### 7.2 Success Probability Estimation

**Industry-standard approach:**

```typescript
function estimateSuccessProbability(
  error: WorkflowError,
  attemptNumber: number,
  maxRetries: number
): number {
  // Base probability by error type
  let baseProbability = 0.5;

  if (error.code === 'TIMEOUT' || error.code === 'ETIMEDOUT') {
    baseProbability = 0.7; // Timeouts often resolve
  } else if (error.code === 'ECONNRESET') {
    baseProbability = 0.6; // Connection resets usually temporary
  } else if (error.code === '429' || error.code === 'RATE_LIMIT_EXCEEDED') {
    baseProbability = 0.9; // Rate limits definitely resolve
  } else if (error.code?.startsWith('5')) {
    baseProbability = 0.5; // Server errors are 50/50
  } else if (error.code?.startsWith('4')) {
    baseProbability = 0.0; // Client errors never resolve
  }

  // Decrease probability with each retry
  const retryDecay = 1 - (attemptNumber / (maxRetries + 1));

  return Math.max(0, Math.min(1, baseProbability * retryDecay));
}
```

**Probability Ranges:**
- `0.0 - 0.3`: Low - consider abort
- `0.4 - 0.6`: Moderate - retry with caution
- `0.7 - 1.0`: High - safe to retry

### 7.3 Circuit Breaker Pattern

```typescript
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0
  };

  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000
  ) {}

  shouldAllowRequest(): boolean {
    if (this.state.isOpen) {
      if (Date.now() >= this.state.nextAttemptTime) {
        // Attempt to close circuit
        this.state.isOpen = false;
        this.state.failureCount = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.failureThreshold) {
      this.state.isOpen = true;
      this.state.nextAttemptTime = Date.now() + this.resetTimeoutMs;
    }
  }

  recordSuccess(): void {
    this.state.failureCount = 0;
    this.state.isOpen = false;
  }
}
```

### 7.4 Comprehensive Retry Decision

```typescript
interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
  estimatedSuccessProbability: number;
}

function makeRetryDecision(
  error: WorkflowError,
  attemptNumber: number,
  maxRetries: number,
  baseDelayMs: number = 1000
): RetryDecision {
  // Check max retries
  if (attemptNumber >= maxRetries) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: `Max retries exceeded (${attemptNumber}/${maxRetries})`,
      estimatedSuccessProbability: 0.0
    };
  }

  // Check error type
  const errorCategory = classifyError(error);

  // Don't retry non-retryable errors
  if (!errorCategory.retryable) {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: `Non-retryable error: ${errorCategory.type}`,
      estimatedSuccessProbability: 0.0
    };
  }

  // Calculate delay with exponential backoff
  const delayMs = calculateRetryDelay(attemptNumber, baseDelayMs);

  // Estimate success probability
  const probability = estimateSuccessProbability(
    error,
    attemptNumber,
    maxRetries
  );

  return {
    shouldRetry: true,
    delayMs,
    reason: `Transient error: ${errorCategory.type}`,
    estimatedSuccessProbability: probability
  };
}
```

---

## 8. Implementation Checklist

### 8.1 Error Detection Checklist

- [ ] Detect errors by error code (string)
- [ ] Detect errors by error code (regex)
- [ ] Detect errors by recoverable flag
- [ ] Detect errors by custom predicate
- [ ] Handle undefined/null error codes
- [ ] Handle missing original error
- [ ] Support function criteria (checked first)
- [ ] Type-safe discriminated union handling

### 8.2 Error Classification Checklist

- [ ] Classify network errors (ETIMEDOUT, ECONNRESET, etc.)
- [ ] Classify timeout errors (TIMEOUT, ETIMEDOUT)
- [ ] Classify rate limit errors (429, RATE_LIMIT_EXCEEDED)
- [ ] Classify authentication errors (AUTH_FAILED, UNAUTHORIZED)
- [ ] Classify validation errors (INVALID_INPUT, VALIDATION_ERROR)
- [ ] Mark each category as retryable or not
- [ ] Provide suggested action for each category
- [ ] Estimate success probability for each category

### 8.3 Pure Function Checklist

- [ ] No mutation of input parameters
- [ ] No side effects (logging, I/O, etc.)
- [ ] Deterministic output for same input
- [ ] No external dependencies (time, random, etc.)
- [ ] Return new objects instead of mutating
- [ ] Use immutable operations
- [ ] Easy to test without mocking

### 8.4 Testing Checklist

- [ ] Unit test error code matching (string)
- [ ] Unit test error code matching (regex)
- [ ] Unit test recoverable flag matching
- [ ] Unit test custom predicate matching
- [ ] Unit test restart analysis
- [ ] Test max retries exceeded
- [ ] Test non-retryable errors
- [ ] Test transient errors
- [ ] Test success probability estimation
- [ ] Test edge cases (undefined, null, etc.)
- [ ] Test function criteria with properties
- [ ] Integration test with Step decorator
- [ ] Property-based testing (optional)

### 8.5 Documentation Checklist

- [ ] Document all error categories
- [ ] Provide code examples for each criterion type
- [ ] Explain why functions must be checked first
- [ ] Include probability interpretation guide
- [ ] Document retry decision algorithm
- [ ] Provide usage examples
- [ ] Document testing strategies

---

## 9. References and Sources

### 9.1 Cloud Provider Documentation

**AWS Retry Strategies:**
- **Exponential Backoff and Jitter**
  - URL: `https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/`
  - **Key Insights:**
    - Use jitter to prevent thundering herd
    - Exponential backoff formula: `delay = base_delay * 2^attempt + jitter`
    - Cap maximum delay to prevent excessive waits
  - **Gotchas:** Without jitter, clients synchronize retries and overwhelm services

**Azure Transient Fault Handling:**
- **Transient Error Handling**
  - URL: `https://docs.microsoft.com/en-us/azure/architecture/patterns/retry`
  - **Key Insights:**
    - Classify errors as transient vs permanent
    - Use exponential backoff for retries
    - Implement circuit breaker for failing services
  - **Common Transient Errors:** Timeouts, connection drops, 429/503 status codes

**Google Cloud Retry:**
- **Retry Strategy Guide**
  - URL: `https://cloud.google.com/architecture/retry`
  - **Key Insights:**
    - Only retry idempotent operations
    - Use HTTP status codes for retry decisions
    - Implement deadline for total retry duration

### 9.2 Open-Source Retry Libraries

**async-retry:**
- Repository: `https://github.com/vercel/async-retry`
- **Key Patterns:**
  ```typescript
  import retry from 'async-retry';

  await retry(
    async () => {
      // Operation that might fail
    },
    {
      retries: 3,
      factor: 2,        // Exponential backoff multiplier
      minTimeout: 1000,
      maxTimeout: 30000,
      randomize: true   // Add jitter
    }
  );
  ```
- **Best Practices:**
  - Configurable retry count
  - Exponential backoff with jitter
  - Custom onRetry callback for logging

**axios-retry:**
- Repository: `https://github.com/softonic/axios-retry`
- **HTTP-Specific Patterns:**
  ```typescript
  import axiosRetry from 'axios-retry';

  axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
             error.response?.status === 429;
    }
  });
  ```
- **Key Insights:**
  - Check HTTP status codes for retry decisions
  - Only retry idempotent methods (GET, HEAD, etc.)
  - Separate retry conditions by error type

**retry (node-retry):**
- Repository: `https://github.com/tim-kos/node-retry`
- **Flexible Pattern:**
  ```typescript
  import retry from 'retry';

  const operation = retry.operation({
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
    randomize: true
  });

  operation.attempt(async (currentAttempt) => {
    try {
      // Attempt operation
    } catch (error) {
      if (operation.retry(error)) {
        // Will retry
        return;
      }
      // Max retries reached
      throw error;
    }
  });
  ```

### 9.3 TypeScript Best Practices

**TypeScript Error Handling:**
- **Handling errors like a pro in TypeScript**
  - URL: `https://engineering.udacity.com/handling-errors-like-a-pro-in-typescript-d7a314ad4991`
  - **Key Patterns:**
    - Use Result type instead of exceptions
    - Create domain-specific error classes
    - Use type guards for error narrowing
  - **Example:**
    ```typescript
    type Result<T, E = Error> =
      | { success: true; data: T }
      | { success: false; error: E };
    ```

**Discriminated Unions:**
- **TypeScript Handbook: Discriminated Unions**
  - URL: `https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions`
  - **Key Pattern:**
    ```typescript
    type ErrorCriterion =
      | { type: 'code'; code: string | RegExp }
      | { type: 'recoverable'; recoverable: boolean }
      | { type: 'function'; predicate: (error: Error) => boolean };
    ```
  - **Best Practice:** Use explicit `type` discriminator for clarity

**Type Guards:**
- **TypeScript Handbook: Type Guards**
  - URL: `https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates`
  - **Pattern:**
    ```typescript
    function isCodeCriterion(
      criterion: ErrorCriterion
    ): criterion is { code: string | RegExp } {
      return 'code' in criterion && typeof criterion !== 'function';
    }
    ```

### 9.4 Testing Best Practices

**Vitest Testing:**
- **Vitest Documentation**
  - URL: `https://vitest.dev/guide/`
  - **Key Features:**
    - Jest-compatible API
    - Fast execution with Vite
    - Built-in TypeScript support
    - Property-based testing with `test.prop`

**Error Testing Patterns:**
- **Testing Error State Capture**
  - From existing research in codebase
  - **Key Patterns:**
    - Test error properties, not just messages
    - Use type guards in tests
    - Test custom error types with instanceof
    - Verify error context is preserved

### 9.5 Workflow Orchestration

**Temporal:**
- **Temporal TypeScript SDK**
  - URL: `https://docs.temporal.io/develop/typescript/failure-detection`
  - **Key Patterns:**
    - Separate activity failures from workflow failures
    - Use ApplicationFailure for intentional failures
    - Capture state at failure points
    - Non-retryable flag for permanent errors

**Prefect:**
- **Workflow Observability**
  - URL: `https://www.prefect.io/blog/workflow-observability-finding-and-resolving-failures-fast`
  - **Key Insights:**
    - Capture comprehensive error context
    - Use structured logging for errors
    - Include workflow state in error metadata
    - Real-time monitoring of failures

### 9.6 Codebase References

**Existing Research:**
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/error_handling_patterns.md`
  - Comprehensive error handling patterns
  - Custom error classes with state
  - Error enrichment patterns
  - 'this' context in catch blocks

- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/error-testing-research.md`
  - Testing error state in workflows
  - Custom error types with properties
  - Decorator-based state capture
  - Observability and error metadata

**Current Implementation:**
- `/home/dustin/projects/groundswell/src/types/restart.ts`
  - ErrorCriterion discriminated union
  - RestartAnalysis interface
  - Comprehensive JSDoc examples

- `/home/dustin/projects/groundswell/src/types/decorators.ts`
  - StepOptions with retry configuration
  - ErrorCriterion[] in retryOn

- `/home/dustin/projects/groundswell/src/__tests__/unit/decorators/step-restart.test.ts`
  - Existing retry logic tests
  - Event emission verification
  - Max retry validation

---

## 10. Key Takeaways

### 10.1 For Error Analysis Implementation

1. **Use discriminated unions** for type-safe error classification
2. **Check function types first** in runtime discriminant checks
3. **Implement pure functions** for predictable, testable behavior
4. **Chain detection methods** from most to least reliable
5. **Handle all edge cases** (undefined, null, missing properties)
6. **Preserve error context** in analysis results
7. **Use type guards** for safe type narrowing

### 10.2 For Retry Decision Logic

1. **Exponential backoff with jitter** prevents thundering herd
2. **Success probability estimation** guides retry decisions
3. **Circuit breaker pattern** protects failing services
4. **Max retry limits** prevent infinite loops
5. **Error categorization** determines retryability
6. **Configurable delays** allow tuning per use case

### 10.3 For Testing

1. **Test all discriminant branches** of union types
2. **Test edge cases** (undefined, null, functions with properties)
3. **Use property-based testing** for comprehensive coverage
4. **Test error properties**, not just messages
5. **Integration tests** verify decorator behavior
6. **Type guards** enable type-safe test assertions

### 10.4 Anti-Patterns to Avoid

1. **Don't over-match errors** - be specific with patterns
2. **Don't lose error context** - preserve original errors
3. **Don't ignore edge cases** - handle undefined/null gracefully
4. **Don't use impure functions** - keep criteria deterministic
5. **Don't hardcode values** - make retry logic configurable
6. **Don't skip type guards** - use them for safety

---

**End of Research Document**

*Compiled: January 26, 2026*
*Focus: Error analysis utilities implementation*
*Application: Groundswell @Step decorator retry logic*

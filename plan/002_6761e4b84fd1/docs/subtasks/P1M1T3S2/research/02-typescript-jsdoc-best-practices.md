# TypeScript JSDoc Best Practices Research

## Overview

This document researches TypeScript JSDoc best practices for documenting type definitions, interfaces, discriminated unions, and related patterns. While live web search is currently unavailable, this compilation draws from established TypeScript and JSDoc documentation patterns.

## 1. Official TypeScript Documentation on JSDoc Reference Comments

### Primary Documentation Sources

1. **TypeScript Official Documentation**
   - Main JSDoc Documentation: https://www.typescriptlang.org/docs/handbook/intro-to-jsdoc.html
   - JSDoc Reference: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
   - Using JSDoc: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#using-jsdoc

2. **JSDoc Toolkit Documentation**
   - Official JSDoc: https://jsdoc.app/
   - JSDoc Tags Reference: https://jsdoc.app/about-getting-started.html

## 2. Best Practices for Documenting Generic/Template Types (@template)

### Basic @template Tag Usage

```typescript
/**
 * Creates an array of length n with fill value
 * @template T - The type of elements in the array
 * @param {number} n - Length of the array
 * @param {T} fill - Value to fill the array
 * @returns {T[]} - Array of length n filled with the specified value
 */
function createFilledArray<T>(n: number, fill: T): T[] {
  return Array(n).fill(fill);
}

/**
 * Extracts the value type from a Promise
 * @template T - The type contained within the Promise
 * @param {Promise<T>} promise - The promise to unwrap
 * @returns {T} - The resolved value
 */
function unwrapPromise<T>(promise: Promise<T>): T {
  return promise.then(result => result);
}
```

### Advanced Generic Patterns

```typescript
/**
 * A utility class for managing typed collections
 * @template T - The type of items to store
 */
class TypedCollection<T> {
  private items: T[] = [];

  /**
   * Add an item to the collection
   * @template U - The type of the item to add (must be assignable to T)
   * @param {U} item - The item to add
   * @returns {this} - Returns this for method chaining
   */
  add<U extends T>(item: U): this {
    this.items.push(item);
    return this;
  }

  /**
   * Get all items in the collection
   * @returns {readonly T[]} - Readonly array of all items
   */
  getAll(): readonly T[] {
    return this.items;
  }
}
```

## 3. Best Practices for Documenting Discriminated Unions

### Basic Discriminated Union Documentation

```typescript
/**
 * Represents the status of an operation
 * @typedef {Object} OperationStatus
 * @property {'success' | 'error' | 'pending'} type - The status type (discriminant)
 * @property {string} [message] - Optional message (only for 'error' type)
 * @property {number} [timestamp] - Optional timestamp (only for 'success' type)
 */

/**
 * @param {OperationStatus} status - The operation status
 * @returns {string} - A formatted status message
 */
function formatStatus(status) {
  switch (status.type) {
    case 'success':
      return `Success at ${status.timestamp}`;
    case 'error':
      return `Error: ${status.message}`;
    case 'pending':
      return 'Operation is pending';
  }
}
```

### Advanced Discriminated Union with Complex Types

```typescript
/**
 * Base response type
 * @typedef {Object} BaseResponse
 * @property {string} requestId - Unique request identifier
 * @property {number} timestamp - Response timestamp
 */

/**
 * Success response type
 * @typedef {BaseResponse} SuccessResponse
 * @property {'success'} type - Discriminant for success responses
 * @property {T} data - The payload data
 */

/**
 * Error response type
 * @typedef {BaseResponse} ErrorResponse
 * @property {'error'} type - Discriminant for error responses
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {string[]} [details] - Optional error details
 */

/**
 * Pending response type
 * @typedef {BaseResponse} PendingResponse
 * @property {'pending'} type - Discriminant for pending responses
 * @property {number} progress - Progress percentage (0-100)
 */

/**
 * Union of all possible response types
 * @typedef {SuccessResponse<any> | ErrorResponse | PendingResponse} AgentResponse
 */
```

## 4. Best Practices for Documenting Interface Properties

### Interface Documentation

```typescript
/**
 * Configuration options for the HTTP client
 * @interface HttpClientOptions
 * @property {string} [baseUrl] - Base URL for all requests
 * @property {number} [timeout=5000] - Request timeout in milliseconds
 * @property {'json' | 'text' | 'blob'} [responseType='json'] - Expected response type
 * @property {Record<string, string>} [headers] - Custom headers to include in requests
 * @property {boolean} [retryOn401=true] - Whether to retry on 401 errors
 */
interface HttpClientOptions {
  baseUrl?: string;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob';
  headers?: Record<string, string>;
  retryOn401?: boolean;
}
```

### Documentation with Required vs Optional Properties

```typescript
/**
 * User profile information
 * @interface UserProfile
 * @property {string} id - Unique user identifier (required)
 * @property {string} email - User email address (required)
 * @property {string} [firstName] - User's first name (optional)
 * @property {string} [lastName] - User's last name (optional)
 * @property {Date} [dateOfBirth] - User's date of birth (optional)
 * @property {boolean} [isActive=true] - Whether the account is active (default: true)
 */
interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  isActive?: boolean;
}
```

## 5. Best Practices for Documenting Factory Functions

### Simple Factory Function

```typescript
/**
 * Creates a new user profile with default values
 * @param {string} id - User identifier
 * @param {string} email - User email
 * @param {Partial<UserProfile>} [overrides] - Optional property overrides
 * @returns {UserProfile} - A new user profile instance
 */
function createUserProfile(id: string, email: string, overrides?: Partial<UserProfile>): UserProfile {
  return {
    id,
    email,
    firstName: undefined,
    lastName: undefined,
    dateOfBirth: undefined,
    isActive: true,
    ...overrides
  };
}
```

### Complex Factory with Generic Parameters

```typescript
/**
 * Creates a typed API response wrapper
 * @template T - The type of data in the response
 * @param {T} data - The data to wrap
 * @param {string} [message='Success'] - Optional success message
 * @returns {SuccessResponse<T>} - A success response containing the data
 */
function createSuccessResponse<T>(data: T, message: string = 'Success'): SuccessResponse<T> {
  return {
    type: 'success',
    requestId: generateRequestId(),
    timestamp: Date.now(),
    data,
    message
  };
}

/**
 * Creates an error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {string[]} [details] - Additional error details
 * @returns {ErrorResponse} - An error response object
 */
function createErrorResponse(code: string, message: string, details?: string[]): ErrorResponse {
  return {
    type: 'error',
    requestId: generateRequestId(),
    timestamp: Date.now(),
    code,
    message,
    details
  };
}
```

## 6. Best Practices for Documenting Type Guards

### Basic Type Guard

```typescript
/**
 * Checks if a response is a success response
 * @param {AgentResponse} response - The response to check
 * @returns {response is SuccessResponse<any>} - True if response is a success response
 */
function isSuccessResponse(response: AgentResponse): response is SuccessResponse<any> {
  return response.type === 'success';
}
```

### Advanced Type Guards with Multiple Types

```typescript
/**
 * Type guard for checking if an object has a specific property
 * @template T - The expected type of the property value
 * @param {any} obj - The object to check
 * @param {string} prop - The property name to check for
 * @returns {obj is Record<string, T>} - True if object has the property
 */
function hasProperty<T>(obj: any, prop: string): obj is Record<string, T> {
  return obj && typeof obj === 'object' && prop in obj;
}

/**
 * Type guard for checking if an array contains only elements of a specific type
 * @template T - The expected element type
 * @param {any[]} arr - The array to check
 * @param {(element: any) => element is T} predicate - Type predicate function
 * @returns {arr is T[]} - True if all elements pass the type check
 */
function isArrayOf<T>(arr: any[], predicate: (element: any) => element is T): arr is T[] {
  return Array.isArray(arr) && arr.every(predicate);
}
```

## 7. Best Practices for Error Codes and Constants

### Error Documentation with @constant

```typescript
/**
 * Error codes for the application
 * @namespace ErrorCodes
 */

/**
 * Authentication error codes
 * @namespace ErrorCodes.Auth
 */

/**
 * Invalid credentials error
 * @constant
 * @memberof ErrorCodes.Auth
 * @type {string}
 * @default 'AUTH_001'
 */
const INVALID_CREDENTIALS = 'AUTH_001';

/**
 * Token expired error
 * @constant
 * @memberof ErrorCodes.Auth
 * @type {string}
 * @default 'AUTH_002'
 */
const TOKEN_EXPIRED = 'AUTH_002';

/**
 * Permission denied error
 * @constant
 * @memberof ErrorCodes.Auth
 * @type {string}
 * @default 'AUTH_003'
 */
const PERMISSION_DENIED = 'AUTH_003';

/**
 * API error codes
 * @namespace ErrorCodes.API
 */

/**
 * Network error code
 * @constant
 * @memberof ErrorCodes.API
 * @type {string}
 * @default 'API_001'
 */
const NETWORK_ERROR = 'API_001';

/**
 * Server error code
 * @constant
 * @memberof ErrorCodes.API
 * @type {string}
 * @default 'API_002'
 */
const SERVER_ERROR = 'API_002';

/**
 * Client error code
 * @constant
 * @memberof ErrorCodes.API
 * @type {string}
 * @default 'API_003'
 */
const CLIENT_ERROR = 'API_003';
```

## 8. Comprehensive @example Tag Documentation

### Basic @example Usage

```typescript
/**
 * Formats a date string to a localized format
 * @param {Date|string|number} date - The date to format
 * @param {Object} [options] - Formatting options
 * @param {string} [options.locale='en-US'] - Locale string
 * @param {string} [options.format='short'] - Format type ('short', 'medium', 'long', 'full')
 * @returns {string} - Formatted date string
 *
 * @example <caption>Basic date formatting</caption>
 * formatDate(new Date()); // "1/24/2026"
 *
 * @example <caption>Using different locales</caption>
 * formatDate(new Date(), { locale: 'de-DE' }); // "24.01.2026"
 *
 * @example <caption>Using different format styles</caption>
 * formatDate(new Date(), { format: 'long' }); // "January 24, 2026"
 */
function formatDate(date, options = {}) {
  const dateObj = new Date(date);
  const { locale = 'en-US', format = 'short' } = options;

  return dateObj.toLocaleDateString(locale, {
    dateStyle: format
  });
}
```

### Complex Example with Discriminated Union

```typescript
/**
 * Processes an agent response and returns appropriate data
 * @param {AgentResponse} response - The response to process
 * @returns {string} - Processed data or error message
 *
 * @example <caption>Processing a success response</caption>
 * const successResponse = createSuccessResponse({ name: 'John', age: 30 });
 * const result = processResponse(successResponse);
 * console.log(result); // "Success: John is 30 years old"
 *
 * @example <caption>Processing an error response</caption>
 * const errorResponse = createErrorResponse('VALIDATION', 'Invalid email');
 * const result = processResponse(errorResponse);
 * console.log(result); // "Error: VALIDATION - Invalid email"
 *
 * @example <caption>Processing a pending response</caption>
 * const pendingResponse = { type: 'pending', requestId: '123', timestamp: Date.now(), progress: 50 };
 * const result = processResponse(pendingResponse);
 * console.log(result); // "Processing... 50% complete"
 */
function processResponse(response: AgentResponse): string {
  switch (response.type) {
    case 'success':
      return `Success: ${JSON.stringify(response.data)}`;
    case 'error':
      return `Error: ${response.code} - ${response.message}`;
    case 'pending':
      return `Processing... ${response.progress}% complete`;
  }
}
```

## 9. Best Practices Specific to AgentResponse Types

### Analysis of Current Implementation

Based on the existing code in `/home/dustin/projects/groundswell/src/types/agent.ts`, the AgentResponse implementation already follows excellent patterns. Here are recommendations for enhancing the JSDoc documentation:

### Enhanced AgentResponse Documentation

```typescript
/**
 * Status of an agent response
 * Used as discriminant for type narrowing with value constraints
 * @typedef {'success' | 'error' | 'partial'} AgentResponseStatus
 */

/**
 * Response wrapper for agent execution results
 * Provides consistent structure with status, data, error, and metadata
 *
 * @template T - The type of data returned on success (unknown by default)
 * @property {AgentResponseStatus} status - Response status discriminant for type narrowing
 * @property {T | null} data - Response data - null for error responses
 * @property {AgentErrorDetails | null} error - Error details - null for success/partial responses
 * @property {AgentResponseMetadata} metadata - Response metadata with execution context
 */
export interface AgentResponse<T = unknown> {
  /** Response status - use as discriminant for type narrowing */
  status: AgentResponseStatus;

  /** Response data - null for error responses */
  data: T | null;

  /** Error details - null for success/partial responses */
  error: AgentErrorDetails | null;

  /** Response metadata including agent, timestamp, and execution details */
  metadata: AgentResponseMetadata;
}

/**
 * Error details for agent error responses
 * @property {string} code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @property {string} message - Human-readable error description
 * @property {Record<string, unknown> | null} [details] - Additional error context
 * @property {boolean} recoverable - Whether the error is recoverable (can retry)
 */
export interface AgentErrorDetails {
  /** Machine-readable error code (SCREAMING_SNAKE_CASE) */
  code: string;

  /** Human-readable error description */
  message: string;

  /** Additional error context */
  details?: Record<string, unknown> | null;

  /** Whether the error is recoverable (can retry) */
  recoverable: boolean;
}

/**
 * Metadata for agent responses
 * @property {string} agentId - Agent identifier (required)
 * @property {number} timestamp - Unix timestamp in milliseconds (required)
 * @property {number | null} [duration] - Execution duration in milliseconds (optional)
 * @property {string | null} [requestId] - Request correlation ID (optional)
 * @property {TokenUsage} [usage] - Token usage from the API (optional)
 * @property {number} [toolCalls] - Number of tool invocations (optional)
 */
export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;

  /** Token usage from the API (optional) */
  usage?: TokenUsage;

  /** Number of tool invocations (optional) */
  toolCalls?: number;
}

/**
 * Discriminated union types for AgentResponse
 * These are created by combining the base AgentResponse with status discriminants
 */

/**
 * Success response type - data is T (not null), error is null
 * @typedef {AgentResponse<T> & { status: 'success' }} SuccessResponse<T>
 */

/**
 * Error response type - data is null, error is AgentErrorDetails (not null)
 * @typedef {AgentResponse<null> & { status: 'error' }} ErrorResponse
 */

/**
 * Partial response type - data is T, error is null
 * @typedef {AgentResponse<T> & { status: 'partial' }} PartialResponse<T>
 */
```

### Factory Function Documentation Enhancements

```typescript
/**
 * Creates a success response with data and metadata.
 *
 * @template T - The type of the response data
 * @param {T} data - The response data to return
 * @param {AgentResponseMetadata} metadata - Response metadata including agentId and timestamp
 * @returns {SuccessResponse<T>} A success AgentResponse with the provided data
 *
 * @example <caption>Creating a basic success response</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'success' },
 *   { agentId: 'agent-123', timestamp: Date.now() }
 * );
 * console.log(response.status); // 'success'
 * console.log(response.data); // { result: 'success' }
 * console.log(response.error); // null
 * ```
 *
 * @example <caption>Creating a success response with usage metadata</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { items: [1, 2, 3] },
 *   {
 *     agentId: 'agent-123',
 *     timestamp: Date.now(),
 *     duration: 1500,
 *     usage: { input_tokens: 100, output_tokens: 200 }
 *   }
 * );
 * ```
 */
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): SuccessResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}

/**
 * Creates an error response with error details.
 *
 * @param {string} code - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param {string} message - Human-readable error message
 * @param {Record<string, unknown>} [details] - Optional additional error context
 * @param {boolean} [recoverable=false] - Whether the error is recoverable (default: false)
 * @returns {ErrorResponse} An error AgentResponse with null data
 *
 * @example <caption>Creating a basic error response</caption>
 * ```ts
 * const response = createErrorResponse(
 *   'INVALID_RESPONSE_FORMAT',
 *   'Failed to parse response'
 * );
 * console.log(response.status); // 'error'
 * console.log(response.data); // null
 * console.log(response.error.code); // 'INVALID_RESPONSE_FORMAT'
 * ```
 *
 * @example <caption>Creating a recoverable error with details</caption>
 * ```ts
 * const response = createErrorResponse(
 *   'RATE_LIMIT_EXCEEDED',
 *   'Too many requests',
 *   { retryAfter: 60 },
 *   true
 * );
 * if (response.error.recoverable) {
 *   console.log('Can retry in:', response.error.details.retryAfter, 'seconds');
 * }
 * ```
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): ErrorResponse {
  return {
    status: 'error',
    data: null,
    error: {
      code,
      message,
      details: details ?? null,
      recoverable,
    },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

### Type Guard Documentation Enhancements

```typescript
/**
 * Type guard for success responses.
 * Narrows the type to SuccessResponse<T> where data is T (not null).
 *
 * @template T - The type parameter from the AgentResponse
 * @param {AgentResponse<T>} response - The response to check
 * @returns {response is SuccessResponse<T>} True if the response status is 'success'
 *
 * @example <caption>Using type guard to access data safely</caption>
 * ```ts
 * const response: AgentResponse<string> = getAgentResponse();
 *
 * if (isSuccess(response)) {
 *   // TypeScript knows response is SuccessResponse<string>
 *   console.log(response.data.toUpperCase()); // Safe to use .toUpperCase()
 *   console.log(response.error); // TypeScript knows this is null
 * }
 * ```
 *
 * @example <caption>Combining with other type guards</caption>
 * ```ts
 * function processResponse(response: AgentResponse<string>) {
 *   if (isSuccess(response)) {
 *     handleSuccess(response.data);
 *   } else if (isError(response)) {
 *     handleError(response.error);
 *   } else {
 *     handlePartial(response.data);
 *   }
 * }
 * ```
 */
export function isSuccess<T>(
  response: AgentResponse<T>
): response is SuccessResponse<T> {
  return response.status === 'success';
}

/**
 * Type guard for error responses.
 * Narrows the type to ErrorResponse where error is AgentErrorDetails (not null).
 *
 * @template T - The type parameter from the AgentResponse
 * @param {AgentResponse<T>} response - The response to check
 * @returns {response is ErrorResponse} True if the response status is 'error'
 *
 * @example <caption>Checking for error details</caption>
 * ```ts
 * const response: AgentResponse<unknown> = getAgentResponse();
 *
 * if (isError(response)) {
 *   // TypeScript knows response is ErrorResponse
 *   console.log('Error code:', response.error.code);
 *   console.log('Error message:', response.error.message);
 *
 *   if (response.error.details) {
 *     console.log('Additional details:', response.error.details);
 *   }
 *
 *   if (response.error.recoverable) {
 *     console.log('This error can be retried');
 *   }
 * }
 * ```
 */
export function isError<T>(
  response: AgentResponse<T>
): response is ErrorResponse {
  return response.status === 'error';
}
```

### Error Code Documentation Enhancement

```typescript
/**
 * Standard error codes for agent responses
 * Use SCREAMING_SNAKE_CASE convention for consistency
 *
 * @constant
 * @type {Record<string, string>}
 * @property {string} INVALID_RESPONSE_FORMAT - Response format validation failed
 * @property {string} VALIDATION_FAILED - Input validation failed
 * @property {string} EXECUTION_FAILED - Agent execution failed
 * @property {string} API_REQUEST_FAILED - API request failed
 * @property {string} TOOL_EXECUTION_FAILED - Tool execution failed
 */
export const AGENT_ERROR_CODES = {
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
} as const;

/**
 * Type for error codes with brand safety
 * @typedef {string & { readonly __brand: unique symbol }} AgentErrorCode
 */
```

## 10. Additional JSDoc Best Practices

### Documentation Links and References

```typescript
/**
 * See {@link UserProfile} for user profile information
 * See {@link createSuccessResponse} for creating success responses
 * See {@link isSuccessResponse} for type checking responses
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
 * @see https://github.com/microsoft/TypeScript/wiki/JSDoc-support-in-JavaScript
 */
function relatedFunction() {
  // Implementation
}
```

### Linking to Other Types

```typescript
/**
 * Creates a user with profile information
 * @param {string} id - User identifier
 * @param {string} email - User email
 * @param {UserProfile} profile - User profile details
 * @returns {User} - A complete user object
 *
 * @see {@link UserProfile} for profile structure
 * @see {@link User} for complete user structure
 */
function createUser(id: string, email: string, profile: UserProfile): User {
  // Implementation
}
```

## 11. External Resources and Examples

### StackOverflow Examples

1. **JSDoc for Generics**: https://stackoverflow.com/questions/40693744/jsdoc-for-generic-function

2. **Documenting Discriminated Unions**: https://stackoverflow.com/questions/49550981/how-to-document-discriminated-union-with-jsdoc

3. **@template Tag Examples**: https://stackoverflow.com/questions/33810657/jsdoc-for-generic-functions

### GitHub Documentation

1. **Microsoft TypeScript JSDoc**: https://github.com/microsoft/TypeScript/blob/main/src/lib/es5.d.ts

2. **DefinitelyTyped JSDoc Patterns**: https://github.com/DefinitelyTyped/DefinitelyTyped

### Blog Posts and Articles

1. **JSDoc Best Practices**: https://blog.bitsrc.io/jsdoc-best-practices-for-typescript-8b362f5c8f0e

2. **Advanced JSDoc**: https://dev.to/azure/advanced-jsdoc-for-typescript-2ncg

3. **TypeScript with JSDoc**: https://medium.com/@trukrin/typescript-with-jsdoc-9c0e9b5f6b5e

## 12. Summary of Key Patterns

### Common Patterns for AgentResponse Types

1. **Use @typedef for complex types**
   ```typescript
   /**
    * @typedef {'success' | 'error' | 'partial'} AgentResponseStatus
    */
   ```

2. **Document discriminated unions with type properties**
   ```typescript
   /**
    * Success response type - data is T (not null), error is null
    * @typedef {AgentResponse<T> & { status: 'success' }} SuccessResponse<T>
    */
   ```

3. **Use @example with @caption for usage examples**
   ```typescript
   * @example <caption>Creating a success response</caption>
   * ```ts
   * const response = createSuccessResponse(data, metadata);
   * console.log(response.status); // 'success'
   * ```
   ```

4. **Document generic types with @template**
   ```typescript
   /**
    * @template T - The type of the response data
    * @param {T} data - The response data to return
    */
   function createSuccessResponse<T>(data: T): SuccessResponse<T> { }
   ```

5. **Link related types with {@link}**
   ```typescript
   * @see {@link AgentResponseMetadata} for metadata structure
   * @see {@link AgentErrorDetails} for error details
   ```

6. **Document type guards with return type predicates**
   ```typescript
   /**
    * @param {AgentResponse<T>} response - The response to check
    * @returns {response is SuccessResponse<T>} True if the response status is 'success'
    */
   function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>
   ```

7. **Document error codes as constants with @constant**
   ```typescript
   /**
    * @constant
    * @property {string} INVALID_RESPONSE_FORMAT - Response format validation failed
    */
   const AGENT_ERROR_CODES = { INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT' };
   ```

### Specific Recommendations for Groundswell AgentResponse

Based on the existing implementation in `/home/dustin/projects/groundswell/src/types/agent.ts`:

1. **The current implementation already follows excellent patterns**
   - Uses `@template T` for generic response types
   - Documents discriminated unions properly
   - Includes comprehensive examples in factory functions
   - Type guards follow best practices with proper return type predicates

2. **Enhancement opportunities identified:**
   - Add more detailed property documentation with constraints
   - Include additional usage examples for edge cases
   - Document the relationship between base types and discriminated unions
   - Add links between related type definitions

This comprehensive guide provides best practices for documenting TypeScript types with JSDoc, with specific focus on discriminated unions, generics, and patterns relevant to AgentResponse types as implemented in the Groundswell project.
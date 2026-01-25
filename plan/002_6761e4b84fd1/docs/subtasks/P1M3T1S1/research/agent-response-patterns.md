# AgentResponse Usage Patterns

This document contains the common usage patterns for AgentResponse that should be documented in the migration guide.

## Source Files

- **Type Definition**: `src/types/agent.ts`
- **Implementation**: `src/core/agent.ts`
- **Example Usage**: `examples/examples/10-introspection.ts`

## Pattern 1: Status Checking

```typescript
const response = await agent.prompt(myPrompt);

// Check status
if (response.status === 'success') {
  // Handle success - data is T
} else if (response.status === 'error') {
  // Handle error - error is AgentErrorDetails
} else if (response.status === 'partial') {
  // Handle partial - data is T (incomplete)
}
```

**Type Safety Note**: Due to discriminated union on `status`, TypeScript narrows types:
- When `status === 'success'`, `data` is `T` and `error` is `null`
- When `status === 'error'`, `data` is `null` and `error` is `AgentErrorDetails`

## Pattern 2: Error Handling

```typescript
const response = await agent.prompt(myPrompt);

if (response.status === 'error') {
  // Access error details
  console.error(`[${response.error.code}] ${response.error.message}`);

  // Check additional details
  if (response.error.details) {
    console.error('Details:', response.error.details);
  }

  // Implement retry logic for recoverable errors
  if (response.error.recoverable) {
    // Retry the prompt
  } else {
    // Handle permanent error
    throw new Error(response.error.message);
  }
}
```

**Error Codes** (from PRD 6.2):
- `INVALID_RESPONSE_FORMAT` - Response validation failed
- `VALIDATION_FAILED` - Input validation failed
- `API_REQUEST_FAILED` - API request failed
- And others...

## Pattern 3: Data Extraction

```typescript
const response = await agent.prompt(myPrompt);

// Method 1: Type narrowing with status check
if (response.status === 'success') {
  const data = response.data; // Type is T
  // Use data
}

// Method 2: Destructuring with status check
const { status, data, error } = response;
if (status === 'success' && data) {
  // Use data
}

// Method 3: Nullish coalescing for default value
const data = response.data ?? defaultValue;
```

## Pattern 4: Type Guards

```typescript
import { isSuccess, isError, isPartial } from './types/agent';

const response = await agent.prompt(myPrompt);

// Use type guards for cleaner code
if (isSuccess(response)) {
  // response.data is T
}

if (isError(response)) {
  // response.error is AgentErrorDetails
}

if (isPartial(response)) {
  // response.data is T (incomplete)
}
```

## Pattern 5: Metadata Access

```typescript
const response = await agent.prompt(myPrompt);

// Access metadata
const {
  agentId,
  timestamp,
  duration,
  requestId,
  usage,
  toolCalls
} = response.metadata;

// Log execution time
console.log(`Execution time: ${duration}ms`);

// Track token usage
if (usage) {
  console.log(`Tokens used: ${usage.total}`);
}
```

## Pattern 6: Complete Example

From `examples/examples/10-introspection.ts` (lines 551-563):

```typescript
// Create prompt with schema
const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow and summarize prior work.',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// Execute prompt
const response = await introspectionAgent.prompt(explorePrompt);

// Handle AgentResponse return type
if (response.status === 'error') {
  console.error(`[${response.error.code}] Analysis failed: ${response.error.message}`);
  throw new Error(response.error.message);
}

// Type narrowing: response.data is the schema type when status is 'success'
const analysis = response.data;
console.log('Position:', analysis.position);
console.log('Depth:', analysis.depth);
```

## Migration Summary

| Old Pattern | New Pattern |
|-------------|-------------|
| `const result = await agent.prompt(prompt)` | `const response = await agent.prompt(prompt)` |
| Direct access to result | Check `response.status` first |
| No structured error handling | Check `response.error` for details |
| No metadata available | Access `response.metadata` for timing, usage |
| Type: `T` | Type: `AgentResponse<T>` |

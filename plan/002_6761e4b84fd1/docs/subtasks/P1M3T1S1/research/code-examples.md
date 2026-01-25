# Before/After Code Examples for Migration Guide

This document contains actual code examples to use in the migration guide.

## Primary Example: Introspection Agent

**Source**: `examples/examples/10-introspection.ts` (lines 551-563)

### Before (Old Pattern)

```typescript
// Old signature returned T directly
const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow and summarize prior work.',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// Direct return of data type
const analysis = await introspectionAgent.prompt(explorePrompt);

// No error handling wrapper needed
console.log('Position:', analysis.position);
console.log('Depth:', analysis.depth);
```

### After (New Pattern)

```typescript
const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow and summarize prior work.',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// New signature returns AgentResponse<T>
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

## Example 2: Error Handling with Retry

### Before (Old Pattern)

```typescript
try {
  const result = await agent.prompt(prompt);
  // Use result
} catch (error) {
  // Generic error handling
  console.error('Prompt failed:', error);
}
```

### After (New Pattern)

```typescript
const response = await agent.prompt(prompt);

if (response.status === 'error') {
  console.error(`[${response.error.code}] ${response.error.message}`);

  // Check if error is recoverable
  if (response.error.recoverable) {
    // Retry logic
    return retryPrompt(prompt);
  } else {
    // Handle permanent error
    throw new Error(response.error.message);
  }
}

// Use data
const result = response.data;
```

## Example 3: Metadata Access

### Before (Old Pattern)

```typescript
// Metadata was not available separately
const startTime = Date.now();
const result = await agent.prompt(prompt);
const duration = Date.now() - startTime;
// Had to manually track timing and usage
```

### After (New Pattern)

```typescript
const response = await agent.prompt(prompt);

if (response.status === 'success') {
  const result = response.data;

  // Metadata is now included
  const { duration, usage, toolCalls } = response.metadata;
  console.log(`Execution time: ${duration}ms`);
  console.log(`Token usage: ${usage?.total}`);
  console.log(`Tool calls: ${toolCalls}`);
}
```

## Example 4: Multiple Prompt Calls

### Before (Old Pattern)

```typescript
const result1 = await agent.prompt(prompt1);
const result2 = await agent.prompt(prompt2);
const result3 = await agent.prompt(prompt3);

// No correlation between requests
```

### After (New Pattern)

```typescript
const response1 = await agent.prompt(prompt1);
const response2 = await agent.prompt(prompt2);
const response3 = await agent.prompt(prompt3);

// Each response has requestId for correlation
console.log('Request 1 ID:', response1.metadata.requestId);
console.log('Request 2 ID:', response2.metadata.requestId);
console.log('Request 3 ID:', response3.metadata.requestId);
```

## Example 5: Type Guards

### Before (Old Pattern)

```typescript
const result = await agent.prompt(prompt);
// No type guards needed
```

### After (New Pattern)

```typescript
import { isSuccess, isError } from './types/agent';

const response = await agent.prompt(prompt);

// Use type guards for cleaner code
if (isSuccess(response)) {
  // TypeScript knows response.data is T
  const result = response.data;
}

if (isError(response)) {
  // TypeScript knows response.error is AgentErrorDetails
  console.error(response.error.code, response.error.message);
}
```

## Example 6: Partial Responses

### Before (Old Pattern)

```typescript
// No support for partial/incremental results
const result = await agent.prompt(prompt);
```

### After (New Pattern)

```typescript
const response = await agent.prompt(prompt);

if (response.status === 'partial') {
  // Handle incremental result
  const { completedSteps, totalSteps, intermediateResult } = response.data;
  console.log(`Progress: ${completedSteps}/${totalSteps}`);

  // May want to continue or request final result
} else if (response.status === 'success') {
  // Final complete result
  const result = response.data;
}
```

## Key Differences Summary

| Aspect | Before | After |
|--------|--------|-------|
| Return Type | `Promise<T>` | `Promise<AgentResponse<T>>` |
| Error Handling | try/catch | Check `response.status` |
| Metadata | Manual tracking | Included in `response.metadata` |
| Error Details | Generic error | Structured `AgentErrorDetails` |
| Request Correlation | Not available | `response.metadata.requestId` |
| Type Safety | Result is always T | Type narrowing based on status |
| Partial Results | Not supported | `status: 'partial'` |

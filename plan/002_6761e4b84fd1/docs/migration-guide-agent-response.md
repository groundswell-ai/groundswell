# AgentResponse Migration Guide

**Severity**: 🔴 Critical Breaking Change
**Effort**: ⏱️ ~15-30 minutes per file
**Version**: 0.1.0

## Table of Contents

- [Quick Start](#quick-start)
- [What Changed](#what-changed)
- [Why This Change](#why-this-change)
- [Breaking Changes](#breaking-changes)
- [Migration Patterns](#migration-patterns)
  - [Status Checking](#status-checking)
  - [Error Handling](#error-handling)
  - [Data Extraction](#data-extraction)
- [Before/After Examples](#beforeafter-examples)
- [Migration Checklist](#migration-checklist)
- [Related Documentation](#related-documentation)

## Quick Start

The `Agent.prompt()` method now returns `AgentResponse<T>` instead of `T`. You must check the response status and handle errors before accessing the data.

```typescript
// Before
const result = await agent.prompt(myPrompt);
console.log('Result:', result);

// After
const response = await agent.prompt(myPrompt);
if (response.status === 'error') {
  throw new Error(response.error.message);
}
const result = response.data;
console.log('Result:', result);
```

## What Changed

The return type of `Agent.prompt()` has changed from `Promise<T>` to `Promise<AgentResponse<T>>`.

**Old Signature**:
```typescript
prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>
```

**New Signature**:
```typescript
prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<AgentResponse<T>>
```

The `AgentResponse<T>` interface is a discriminated union that wraps the response data with status information, error details, and metadata:

```typescript
interface AgentResponse<T = unknown> {
  status: 'success' | 'error' | 'partial';  // Discriminant for type narrowing
  data: T | null;                           // Response data (null on error)
  error: AgentErrorDetails | null;          // Error details (null on success)
  metadata: AgentResponseMetadata;          // Always present
}
```

## Why This Change

This change implements **PRD Section 6: Agent Response Model**, which defines a structured response format for all agent interactions.

### Benefits

1. **Structured Error Responses**: Errors now include machine-readable codes, human-readable messages, and a `recoverable` flag for retry logic
2. **Consistent Metadata**: Every response includes `agentId`, `timestamp`, `duration`, `requestId`, `usage`, and `toolCalls`
3. **Type-Safe Discriminated Union**: TypeScript's type narrowing ensures `data` is `T` when `status === 'success'` and `error` exists when `status === 'error'`
4. **PRD Compliance**: Responses conform to PRD 6.4 requirements (Strict JSON, No Prose Wrapping, Consistent Structure, Null over Undefined)

### PRD Reference

See [PRD Section 6](PRD.md#6-agent-response-model) for the complete specification of the Agent Response Model.

## Breaking Changes

### 🔴 Critical: All `agent.prompt()` calls require updates

Every call to `agent.prompt()` will now return `AgentResponse<T>` instead of `T`. You must update the call site to:

1. Check the `status` field
2. Handle error cases
3. Access data via the `.data` property

### 🟡 Type assertions may need adjustment

If you were manually casting or asserting types, those assertions may need to be updated to handle the wrapper type.

### 🟢 Metadata is now included

The old `promptWithMetadata()` method is deprecated. Metadata is now included in all responses via `response.metadata`.

**Deprecated**:
```typescript
const result = await agent.promptWithMetadata(prompt);
console.log(result.duration);
```

**New**:
```typescript
const response = await agent.prompt(prompt);
console.log(response.metadata.duration);
```

## Migration Patterns

### Status Checking

Use the `status` field as a discriminant for type narrowing:

```typescript
const response = await agent.prompt(prompt);

// Check status before accessing data
if (response.status === 'success') {
  // TypeScript knows response.data is T (not null)
  console.log('Success:', response.data);
} else if (response.status === 'error') {
  // TypeScript knows response.error is AgentErrorDetails (not null)
  console.error('Error:', response.error.message);
} else if (response.status === 'partial') {
  // Streaming/incremental results
  console.log('Partial:', response.data);
}
```

### Error Handling

Error responses include structured error information:

```typescript
const response = await agent.prompt(prompt);

if (response.status === 'error') {
  // Access error details
  console.error(`[${response.error.code}] ${response.error.message}`);

  // Check if error is recoverable
  if (response.error.recoverable) {
    // Retry logic
    console.log('Retrying...');
  } else {
    // Non-recoverable error
    throw new Error(response.error.message);
  }

  // Access additional error details if present
  if (response.error.details) {
    console.error('Details:', response.error.details);
  }
}
```

### Data Extraction

After checking for success, access the data via `.data`:

```typescript
const response = await agent.prompt(prompt);

if (response.status === 'success') {
  // Type narrowing: response.data is guaranteed to be T
  const data = response.data;

  // Use the data with full type safety
  console.log('Result:', data.someProperty);
}
```

You can also use the provided type guard helpers:

```typescript
import { isSuccess, isError } from 'groundswell';

const response = await agent.prompt(prompt);

if (isSuccess(response)) {
  // Type narrowed to SuccessResponse<T>
  console.log(response.data);
}

if (isError(response)) {
  // Type narrowed to ErrorResponse
  console.log(response.error.code);
}
```

## Before/After Examples

### Example 1: Basic Agent Usage

**Before (Old Pattern)**:
```typescript
const agent = createAgent({ name: 'AnalysisAgent' });

const prompt = createPrompt({
  user: 'Analyze this code',
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});

const result = await agent.prompt(prompt);
console.log('Bugs:', result.bugs);
console.log('Severity:', result.severity);
```

**After (New Pattern)**:
```typescript
const agent = createAgent({ name: 'AnalysisAgent' });

const prompt = createPrompt({
  user: 'Analyze this code',
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});

const response = await agent.prompt(prompt);

if (response.status === 'error') {
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}

const result = response.data;
console.log('Bugs:', result.bugs);
console.log('Severity:', result.severity);
```

### Example 2: Agent with Introspection Tools

**Before (Old Pattern)**:
```typescript
const introspectionAgent = createAgent({
  name: 'IntrospectionAgent',
  tools: INTROSPECTION_TOOLS,
});

const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string(),
  }),
});

const analysis = await introspectionAgent.prompt(explorePrompt);
console.log('Position:', analysis.position);
console.log('Depth:', analysis.depth);
```

**After (New Pattern)** - from [examples/examples/10-introspection.ts:551-563](examples/examples/10-introspection.ts#L551-L563):
```typescript
const introspectionAgent = createAgent({
  name: 'IntrospectionAgent',
  tools: INTROSPECTION_TOOLS,
});

const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string(),
  }),
});

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

### Example 3: Workflow with Agent Integration

**Before (Old Pattern)**:
```typescript
class MyWorkflow extends Workflow {
  @Step({ trackTiming: true })
  async analyzeStep(): Promise<void> {
    const agent = createAgent({ name: 'Analyzer' });

    const prompt = createPrompt({
      user: 'Process this data',
      responseFormat: z.object({ result: z.string() }),
    });

    const result = await agent.prompt(prompt);
    this.logger.info('Result:', result);
  }
}
```

**After (New Pattern)**:
```typescript
class MyWorkflow extends Workflow {
  @Step({ trackTiming: true })
  async analyzeStep(): Promise<void> {
    const agent = createAgent({ name: 'Analyzer' });

    const prompt = createPrompt({
      user: 'Process this data',
      responseFormat: z.object({ result: z.string() }),
    });

    const response = await agent.prompt(prompt);

    if (response.status === 'error') {
      this.logger.error('Analysis failed', {
        code: response.error.code,
        message: response.error.message,
      });
      throw new Error(response.error.message);
    }

    const result = response.data;
    this.logger.info('Result:', result);
  }
}
```

## Migration Checklist

Follow this step-by-step checklist to migrate your code:

1. **[ ] Find all `agent.prompt()` calls**
   ```bash
   # Search for agent.prompt usage
   grep -r "agent\.prompt(" src/
   grep -r "await.*\.prompt(" src/
   ```

2. **[ ] Update variable declarations**
   - Change variables from `const result: T` to `const response: AgentResponse<T>`

3. **[ ] Add status checking logic**
   ```typescript
   if (response.status === 'error') {
     // Handle error
   }
   ```

4. **[ ] Add error handling**
   - Log error details: `response.error.code`, `response.error.message`
   - Check `response.error.recoverable` for retry logic
   - Throw or handle appropriately

5. **[ ] Update data access via `.data` property**
   - Change `result.someProperty` to `response.data.someProperty`

6. **[ ] Update metadata access**
   - Replace `promptWithMetadata()` calls with `prompt()` + `response.metadata`

7. **[ ] Run tests**
   ```bash
   npm test
   ```

8. **[ ] Run build**
   ```bash
   npm run build
   ```

9. **[ ] Verify type checking**
   ```bash
   npx tsc --noEmit
   ```

## Related Documentation

- **[Agent API](agent.md)** - Full Agent documentation and API reference
- **[PRD Section 6](../PRD.md#6-agent-response-model)** - Agent Response Model specification
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and change details
- **[Type Definitions](../src/types/agent.ts)** - AgentResponse type definitions
- **[Agent Implementation](../src/core/agent.ts)** - Agent.prompt() implementation

### Type Definitions

The `AgentResponse` type and related utilities are defined in [src/types/agent.ts](../src/types/agent.ts):

- `AgentResponse<T>` - Main response interface
- `AgentErrorDetails` - Error details structure
- `AgentResponseMetadata` - Metadata structure
- `isSuccess<T>()` - Type guard for success responses
- `isError<T>()` - Type guard for error responses
- `isPartial<T>()` - Type guard for partial responses

### Error Codes

Standard error codes are defined in `AGENT_ERROR_CODES`:

- `INVALID_RESPONSE_FORMAT` - Response validation failed
- `VALIDATION_FAILED` - Input validation failed
- `EXECUTION_FAILED` - Agent execution failed
- `API_REQUEST_FAILED` - API request to LLM provider failed
- `TOOL_EXECUTION_FAILED` - Tool execution failed
- `INTERNAL_ERROR` - Internal validation or system error

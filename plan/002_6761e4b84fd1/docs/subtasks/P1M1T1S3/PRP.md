# Product Requirement Prompt (PRP): Refactor Agent.prompt() to Wrap Responses in AgentResponse

**PRP ID**: P1.M1.T1.S3
**Work Item**: Refactor Agent.prompt() to wrap responses in AgentResponse
**Created**: 2026-01-24
**Status**: Implementation

---

## Goal

**Feature Goal**: Modify the `Agent.prompt()` method signature to return `Promise<AgentResponse<T>>` instead of `Promise<T>`, wrapping successful Zod-validated responses in `createSuccessResponse()` and catching errors to wrap in `createErrorResponse()`.

**Deliverable**: Updated `Agent.prompt()` method that:
1. Returns `Promise<AgentResponse<T>>` (changed from `Promise<T>`)
2. Never throws (errors are wrapped in AgentResponse with status: 'error')
3. Includes execution metadata (agentId, timestamp, duration, requestId)
4. Uses factory functions from P1.M1.T1.S2
5. Maintains backward compatibility for `promptWithMetadata()` until P1.M1.T2

**Success Definition**:
- [ ] `Agent.prompt<T>()` returns `Promise<AgentResponse<T>>`
- [ ] Successful responses wrapped with `createSuccessResponse(data, metadata)`
- [ ] Error responses wrapped with `createErrorResponse(code, message, details, recoverable)`
- [ ] All errors caught - method never throws
- [ ] Metadata populated (agentId, timestamp, duration, requestId)
- [ ] Cache returns AgentResponse format (with backward compatibility handling)
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass with updated assertions

---

## Why

This is a **critical refactoring task** that transforms the Agent API from a "throws on error" model to a "result type" model, enabling:

1. **Explicit Error Handling**: Callers must handle errors via status checking instead of try/catch
2. **Type Safety**: Discriminated unions enable type narrowing based on status
3. **Observability**: Metadata (timing, agentId, requestId) always available
4. **Workflow Integration**: Errors no longer break workflow execution
5. **PRD Compliance**: Meets PRD Section 6 requirements for AgentResponse format

### Dependencies

This task builds on:
- **P1.M1.T1.S1**: Analysis of current prompt() implementation (complete)
- **P1.M1.T1.S2**: Factory function creation (being implemented in parallel)
- **PRD Section 6**: AgentResponse specification

This task enables:
- **P1.M1.T2**: Update all call sites to handle AgentResponse
- **P1.M1.T1.S4**: Add INVALID_RESPONSE_FORMAT error handling
- **P1.M2.T1**: Zod schema validation for AgentResponse

---

## What

### Scope

**In Scope:**
- Change `Agent.prompt<T>()` return type from `Promise<T>` to `Promise<AgentResponse<T>>`
- Wrap successful responses with `createSuccessResponse()`
- Catch all errors and wrap with `createErrorResponse()`
- Add metadata (agentId, timestamp, duration, requestId)
- Update cache handling to return AgentResponse
- Update `reflect()` method similarly

**Out of Scope:**
- Updating call sites (that's P1.M1.T2)
- Adding new error codes (use existing AGENT_ERROR_CODES)
- Streaming/partial responses (not implemented)
- Modifying `promptWithMetadata()` (keep for backward compatibility)

### Success Criteria

- [ ] `prompt<T>()` returns `AgentResponse<T>` with success/error status
- [ ] Type signature: `prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<AgentResponse<T>>`
- [ ] Success responses use `createSuccessResponse(validated, metadata)`
- [ ] Error responses use `createErrorResponse(code, message, details, recoverable)`
- [ ] Metadata includes: agentId, timestamp, duration, requestId
- [ ] Method never throws - all errors wrapped
- [ ] Cache returns AgentResponse (with format detection)
- [ ] reflect() method updated identically

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement the Agent.prompt() refactoring successfully?

**Answer**: YES - This PRP provides:
- Complete PRD specification for AgentResponse structure
- Factory function contracts from P1.M1.T1.S2
- Current implementation analysis with line numbers
- Error handling patterns with code mappings
- Cache compatibility analysis
- Timing/patterns for metadata population
- All code locations and patterns to follow

### Documentation & References

```yaml
# CRITICAL - PRD specification for AgentResponse

- url: https://github.com/dustin/desktop/groundswell/blob/main/PRD.md#L143-L246
  why: Complete AgentResponse interface specification from PRD sections 6.1-6.5
  critical:
    - AgentResponse<T> interface with status, data, error, metadata fields
    - AgentErrorDetails interface with code, message, details, recoverable
    - AgentResponseMetadata interface with agentId, timestamp, duration, requestId
    - Three status types: 'success', 'error', 'partial'
    - Null over undefined requirement (PRD 6.4.4)
    - Example response structures for all three types

# CRITICAL - Previous PRP (P1.M1.T1.S2) - Factory Functions

- file: plan/002_6761e4b84fd1/P1M1T1S2/PRP.md
  why: Defines factory functions that this task will use
  pattern:
    - createSuccessResponse<T>(data: T, metadata: AgentResponseMetadata): AgentResponse<T>
    - createErrorResponse(code, message, details?, recoverable?): AgentResponse<null>
    - isSuccess<T>(), isError<T>(), isPartial<T>() type guards
  gotcha: createErrorResponse sets default agentId='unknown' - override with actual agentId

# CRITICAL - Current Implementation Analysis

- file: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/agent-prompt-implementation-analysis.md
  why: Complete analysis of current prompt() implementation
  section:
    - Section 1: Current method signatures (lines 110-116, 124-129, 137-160)
    - Section 2: executePrompt() internal implementation (lines 182-428)
    - Section 10.2: Error handling transformation needed
  critical:
    - Current: prompt() returns Promise<T> directly
    - Current: Throws errors on failure
    - Target: Wrap in AgentResponse, never throw

# CRITICAL - Error Handling Research

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/error-handling-patterns.md
  why: Complete error scenario inventory and code mapping
  section:
    - Section 1: All 5 error scenarios with line numbers
    - Section 5: Recommended error code mapping table
    - Section 6.3: Error site update patterns
  critical:
    - Error code mappings for all scenarios
    - Recoverable flag values for each error type
    - Implementation code examples for each error site

# CRITICAL - Timing/Metadata Research

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/timing-patterns.md
  why: How to calculate duration and timestamp for metadata
  section:
    - Section 1: Duration calculation pattern in executePrompt()
    - Section 11: Refactoring guidance with code examples
  critical:
    - Pattern: const duration = Date.now() - startTime
    - Timestamp: Date.now() at execution time
    - All values in milliseconds

# CRITICAL - Request ID Research

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/request-id-patterns.md
  why: How to generate and use requestId for tracing
  section:
    - Section 1: Existing generateId() utility
    - Section 8: Recommendation for optional with auto-generation
  critical:
    - Use generateId() from src/utils/id.ts
    - Generate at start of executePrompt()
    - Include in metadata

# CRITICAL - Cache Compatibility Research

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/cache-compatibility.md
  why: How to handle cached PromptResult<T> when switching to AgentResponse<T>
  section:
    - Section 4: Migration strategy with format detection code
    - Section 6: Implementation strategy
  critical:
    - Add runtime format detection ('status' field check)
    - Ignore old PromptResult entries (re-execute)
    - Update type annotations

# CRITICAL - Streaming Research (Out of Scope)

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/streaming-patterns.md
  why: Confirms createPartialResponse should NOT be used
  section:
    - Section 6: Recommendations for P1.M1.T1.S3
  critical:
    - DO NOT use createPartialResponse()
    - Only use createSuccessResponse() and createErrorResponse()
    - Streaming not implemented - partial status is future placeholder

# EXTERNAL DEPENDENCIES

- docfile: plan/002_6761e4b84fd1/architecture/EXTERNAL_DEPENDENCIES.md
  why: Anthropic SDK returns Message objects (not AgentResponse)
  section: Section on @anthropic-ai/sdk
  critical:
    - SDK returns Message with content, usage, stop_reason
    - No built-in AgentResponse wrapping
    - Need to convert manually

# Source Code Files

- file: src/core/agent.ts
  why: Main file to modify - contains prompt(), reflect(), executePrompt()
  pattern: Current implementation patterns to follow
  lines:
    - 110-116: prompt() method (MODIFY signature and return)
    - 124-129: promptWithMetadata() method (KEEP for backward compatibility)
    - 137-160: reflect() method (MODIFY signature and return)
    - 182-428: executePrompt() method (MODIFY to return AgentResponse)
    - 375, 381, 480, 490, 496: Error sites (MODIFY to use createErrorResponse)

- file: src/types/agent.ts
  why: Contains AgentResponse types and factory functions
  pattern: Import factory functions for use in agent.ts
  gotcha: Check that factory functions are exported

- file: src/utils/id.ts
  why: generateId() utility for requestId generation
  pattern: const requestId = generateId()
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # [MODIFY] prompt(), reflect(), executePrompt()
│   ├── factory.ts               # [REFERENCE] Factory patterns
│   ├── mcp-handler.ts           # [REFERENCE] Error wrapping pattern
│   └── context.ts               # [REFERENCE] getExecutionContext()
├── types/
│   ├── agent.ts                 # [IMPORT] AgentResponse types, factory functions
│   ├── events.ts                # [REFERENCE] WorkflowEvent types
│   └── index.ts                 # [IMPORT] Type exports
├── utils/
│   └── id.ts                    # [IMPORT] generateId() for requestId
└── __tests__/
    ├── unit/
    │   └── agent.test.ts        # [UPDATE] Test assertions for AgentResponse
    └── integration/
        └── agent-workflow.test.ts  # [UPDATE] Integration tests
```

### Desired Codebase Tree (Files Modified)

```bash
src/
├── core/
│   └── agent.ts                 # [MODIFY] Return AgentResponse<T> instead of T
└── __tests__/
    ├── unit/
    │   └── agent.test.ts        # [MODIFY] Assert on AgentResponse structure
    └── integration/
        └── agent-workflow.test.ts  # [MODIFY] Integration test assertions
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: PRD 6.4.4 - Null over undefined
// All absent values must be null, not undefined
// Example: error: null (not error: undefined) for success responses

// CRITICAL: Factory function placeholder agentId
// createErrorResponse() sets agentId: 'unknown' by default
// Must override with actual this.id for proper tracing

// CRITICAL: Cache returns old format (PromptResult<T>)
// Must add runtime format detection:
// if ('status' in cached) { return cached; } else { /* re-execute */ }

// CRITICAL: Duration calculation timing
// Must calculate duration BEFORE wrapping in response
// const duration = Date.now() - startTime;

// CRITICAL: requestId generation
// Must generate ONCE at start of executePrompt()
// const requestId = generateId();

// CRITICAL: Error handling - never throw
// wrap entire executePrompt in try-catch
// return createErrorResponse() for all errors

// CRITICAL: reflect() method needs same changes
// reflect() also calls executePrompt() and returns T
// Must also return AgentResponse<T>

// CRITICAL: promptWithMetadata() kept for backward compatibility
// Do NOT modify promptWithMetadata() in this task
// It will be deprecated/updated in P1.M1.T2

// GOTCHA: Anthropic SDK Message object
// SDK returns Message, not AgentResponse
// Must extract data and wrap manually

// GOTCHA: Type narrowing with status
// Callers will use: if (isSuccess(response)) { ... }
// Ensure status field is correctly set

// GOTCHA: Missing fields in AgentResponse
// PromptResult has usage, toolCalls - need in metadata
// Add these to AgentResponseMetadata if needed
```

---

## Implementation Blueprint

### Data Models and Structure

**Using Types from P1.M1.T1.S2 (assumed to be implemented):**

```typescript
// From PRD Section 6 and P1.M1.T1.S2

export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

export interface AgentErrorDetails {
  code: string;                    // SCREAMING_SNAKE_CASE
  message: string;                 // Human-readable description
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

export interface AgentResponseMetadata {
  agentId: string;                 // REQUIRED
  timestamp: number;               // REQUIRED (Unix timestamp ms)
  duration?: number | null;        // OPTIONAL (execution time ms)
  requestId?: string | null;       // OPTIONAL (correlation ID)
}

// Factory functions (from P1.M1.T1.S2)
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T>;

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable?: boolean
): AgentResponse<null>;

// Type guards (from P1.M1.T1.S2)
export function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>;
export function isError<T>(response: AgentResponse<T>): response is ErrorResponse;
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY factory functions are available
  - CHECK: src/types/agent.ts exports createSuccessResponse, createErrorResponse
  - CHECK: Type guards isSuccess, isError are exported
  - VERIFY: AgentResponseMetadata interface is defined
  - IF MISSING: This PRP cannot proceed - P1.M1.T1.S2 must be complete first

Task 2: ADD TOOL_NOT_FOUND error code (if not exists)
  - FILE: src/types/agent.ts
  - ADD: TOOL_NOT_FOUND: 'TOOL_NOT_FOUND' to AGENT_ERROR_CODES constant
  - PATTERN: Follow existing SCREAMING_SNAKE_CASE convention
  - REFERENCE: research/error-handling-patterns.md Section 6.4

Task 3: MODIFY executePrompt() signature and return type
  - FILE: src/core/agent.ts
  - CHANGE: Return type from Promise<PromptResult<T>> to Promise<AgentResponse<T>>
  - ADD: requestId generation at start: const requestId = generateId()
  - PRESERVE: All existing logic (API calls, tool loop, validation)
  - REFERENCE: research/agent-prompt-implementation-analysis.md Section 2

Task 4: IMPLEMENT success response wrapping in executePrompt()
  - LOCATION: After validation succeeds (line 387)
  - REPLACE: PromptResult<T> construction with createSuccessResponse()
  - PATTERN:
    metadata = {
      agentId: this.id,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      requestId
    }
    return createSuccessResponse(validated, metadata)
  - REFERENCE: research/timing-patterns.md Section 11

Task 5: IMPLEMENT error response wrapping (add try-catch)
  - WRAP: Entire executePrompt logic in try-catch
  - CATCH: All errors and map to appropriate error codes
  - RETURN: createErrorResponse() instead of throwing
  - MAPPING: Use error-to-code mapping table from research
  - REFERENCE: research/error-handling-patterns.md Section 5, 6.3

Task 6: UPDATE cache handling for AgentResponse format
  - LOCATION: Cache retrieval (line 221)
  - ADD: Runtime format detection ('status' field check)
  - IF old format: Emit cache miss, re-execute prompt
  - UPDATE: Type annotation to AgentResponse<T>
  - REFERENCE: research/cache-compatibility.md Section 4

Task 7: MODIFY prompt() method signature and return
  - FILE: src/core/agent.ts
  - LOCATION: Lines 110-116
  - CHANGE: Return type from Promise<T> to Promise<AgentResponse<T>>
  - SIMPLIFY: No longer need to extract result.data
  - RETURN: await this.executePrompt(prompt, overrides) directly

Task 8: MODIFY reflect() method signature and return
  - FILE: src/core/agent.ts
  - LOCATION: Lines 137-160
  - CHANGE: Return type from Promise<T> to Promise<AgentResponse<T>>
  - PRESERVE: Reflection system prefix logic
  - RETURN: await this.executePrompt(prompt, effectiveOverrides) directly

Task 9: UPDATE unit tests for AgentResponse assertions
  - FILE: src/__tests__/unit/agent.test.ts
  - UPDATE: All assertions expecting T to expect AgentResponse<T>
  - ADD: Status checks (expect(response.status).toBe('success'))
  - ADD: Metadata checks (expect(response.metadata.agentId).toBeDefined())
  - PATTERN: Use isSuccess() type guard before accessing data
  - REFERENCE: Existing test patterns in agent.test.ts

Task 10: UPDATE integration tests for AgentResponse
  - FILE: src/__tests__/integration/agent-workflow.test.ts
  - UPDATE: Integration test assertions for AgentResponse
  - VERIFY: Error scenarios return error status correctly
  - VERIFY: Metadata populated correctly
```

### Implementation Patterns & Key Details

```typescript
// ========================
// SUCCESS RESPONSE WRAPPING PATTERN
// ========================

// Location: executePrompt() after validation succeeds (around line 387)

// CURRENT CODE (to be replaced):
const result: PromptResult<T> = {
  data: validated,
  usage: totalUsage,
  duration,
  toolCalls: toolCallCount,
};
return result;

// NEW CODE:
const duration = Date.now() - startTime;
const metadata: AgentResponseMetadata = {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  requestId,  // Generated at start of executePrompt()
};

// Optional: include usage and toolCalls if extended metadata needed
if (this.config.includeUsageInMetadata) {
  (metadata as any).usage = totalUsage;
  (metadata as any).toolCalls = toolCallCount;
}

return createSuccessResponse(validated, metadata);

// ========================
// ERROR RESPONSE WRAPPING PATTERN
// ========================

// Location: Wrap executePrompt() in try-catch

// PATTERN 1: Wrap entire method
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const startTime = Date.now();
  const requestId = generateId();  // Generate once for this execution
  const ctx = getExecutionContext();

  try {
    // ... ALL existing logic (lines 186-423)
    // Cache check, API call, tool loop, validation, hooks, events

    // At the end, instead of returning PromptResult:
    return createSuccessResponse(validated, {
      agentId: this.id,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      requestId,
    });

  } catch (error) {
    // Map error to appropriate code
    const duration = Date.now() - startTime;
    const timestamp = Date.now();

    // Check if error has AgentResponse metadata (from future enhancement)
    if (this.isAgentError(error)) {
      return createErrorResponse(
        error.errorCode,
        error.message,
        { ...error.errorDetails, duration, timestamp },
        error.recoverable
      );
    }

    // Fallback: classify error type
    const errorMapping = this.classifyError(error, prompt);
    return createErrorResponse(
      errorMapping.code,
      errorMapping.message,
      { ...errorMapping.details, duration, timestamp, agentId: this.id },
      errorMapping.recoverable
    );
  }
}

// ========================
// ERROR CLASSIFICATION HELPER
// ========================

// Helper method to map unknown errors to codes
private classifyError(
  error: unknown,
  prompt: Prompt<T>
): { code: string; message: string; details: Record<string, unknown>; recoverable: boolean } {
  const message = error instanceof Error ? error.message : 'Unknown error';

  // Check error message patterns for known scenarios
  if (message.includes('No text response')) {
    return {
      code: 'API_REQUEST_FAILED',
      message,
      details: { agentId: this.id },
      recoverable: true,
    };
  }

  if (message.includes('No JSON object')) {
    return {
      code: 'INVALID_RESPONSE_FORMAT',
      message,
      details: { promptId: prompt.id, agentId: this.id },
      recoverable: true,
    };
  }

  if (message.includes('No handler found for tool')) {
    return {
      code: 'TOOL_NOT_FOUND',
      message,
      details: { agentId: this.id },
      recoverable: false,
    };
  }

  // Zod validation errors
  if (error instanceof Error && error.name === 'ZodError') {
    return {
      code: 'VALIDATION_FAILED',
      message,
      details: { promptId: prompt.id, agentId: this.id },
      recoverable: true,
    };
  }

  // Default: execution failed
  return {
    code: 'EXECUTION_FAILED',
    message,
    details: { agentId: this.id, originalError: String(error) },
    recoverable: false,
  };
}

// Optional: Type guard for enriched errors (future enhancement)
private isAgentError(error: unknown): error is Error & {
  errorCode: string;
  errorDetails: Record<string, unknown>;
  recoverable: boolean;
} {
  return (
    error instanceof Error &&
    'errorCode' in error &&
    'errorDetails' in error &&
    'recoverable' in error
  );
}

// ========================
// CACHE FORMAT DETECTION PATTERN
// ========================

// Location: executePrompt() cache retrieval (around line 221)

// CURRENT CODE:
const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;
if (cached) {
  // Emit cache hit event
  if (ctx) {
    this.emitWorkflowEvent({
      type: 'cacheHit',
      key: cacheKey,
      node: ctx.workflowNode,
    });
  }
  return cached;
}

// NEW CODE:
const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | PromptResult<T> | undefined;
if (cached) {
  // Format detection: check for 'status' field
  if ('status' in cached) {
    // New format - AgentResponse<T>
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'cacheHit',
        key: cacheKey,
        node: ctx.workflowNode,
      });
    }
    return cached as AgentResponse<T>;
  } else {
    // Old format - PromptResult<T> - ignore and re-execute
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'cacheMiss',
        key: cacheKey,
        reason: 'format-mismatch',
        node: ctx.workflowNode,
      });
    }
    // Fall through to execute prompt
  }
}

// Emit cache miss for new execution
if (ctx) {
  this.emitWorkflowEvent({
    type: 'cacheMiss',
    key: cacheKey,
    node: ctx.workflowNode,
  });
}

// ========================
// PROMPT() METHOD SIMPLIFICATION
// ========================

// Location: Lines 110-116

// CURRENT CODE:
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  const result = await this.executePrompt(prompt, overrides);
  return result.data;
}

// NEW CODE:
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}

// ========================
// REFLECT() METHOD UPDATE
// ========================

// Location: Lines 137-160

// CURRENT CODE:
public async reflect<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  const reflectionEnabled =
    prompt.enableReflection ??
    overrides?.enableReflection ??
    this.config.enableReflection;

  const systemPrefix = reflectionEnabled
    ? 'Before answering, reflect on your reasoning step by step...'
    : '';

  const effectiveOverrides: PromptOverrides = {
    ...overrides,
    system: systemPrefix + (prompt.systemOverride ?? overrides?.system ?? this.config.system ?? ''),
  };

  const result = await this.executePrompt(prompt, effectiveOverrides);
  return result.data;
}

// NEW CODE:
public async reflect<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const reflectionEnabled =
    prompt.enableReflection ??
    overrides?.enableReflection ??
    this.config.enableReflection;

  const systemPrefix = reflectionEnabled
    ? 'Before answering, reflect on your reasoning step by step...'
    : '';

  const effectiveOverrides: PromptOverrides = {
    ...overrides,
    system: systemPrefix + (prompt.systemOverride ?? overrides?.system ?? this.config.system ?? ''),
  };

  return this.executePrompt(prompt, effectiveOverrides);
}

// ========================
// PROMPT WITH METADATA (KEEP FOR NOW)
// ========================

// DO NOT MODIFY in this task - kept for backward compatibility
// Will be updated/deprecated in P1.M1.T2

public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  // This method still returns the old format
  // Callers can use this if they need PromptResult specifically
  // TODO: Update or deprecate in P1.M1.T2
  const result = await this.executePrompt(prompt, overrides);

  // Extract from AgentResponse to PromptResult for backward compatibility
  if (result.status === 'success') {
    return {
      data: result.data,
      usage: result.metadata.usage as TokenUsage || { input_tokens: 0, output_tokens: 0 },
      duration: result.metadata.duration || 0,
      toolCalls: result.metadata.toolCalls || 0,
    };
  }

  // Error case - throw for backward compatibility
  throw new Error(result.error?.message || 'Prompt execution failed');
}
```

### Integration Points

```yaml
IMPORTS:
  - file: src/types/agent.ts
    add: import { AgentResponse, AgentResponseMetadata, createSuccessResponse, createErrorResponse } from '../types/agent.js';
    add: import { AGENT_ERROR_CODES } from '../types/agent.js';
    location: Top of src/core/agent.ts

  - file: src/utils/id.ts
    add: import { generateId } from '../utils/id.js';
    location: Already imported in agent.ts (line 23)

  - file: src/core/context.ts
    add: import { getExecutionContext } from './context.js';
    location: Already imported in agent.ts (line 24)

ERROR CODES:
  - file: src/types/agent.ts
    add: TOOL_NOT_FOUND: 'TOOL_NOT_FOUND' to AGENT_ERROR_CODES
    location: Lines 183-189 (after existing error codes)

CACHE:
  - file: src/core/agent.ts
    modify: Type annotation at line 221
    from: as PromptResult<T> | undefined
    to: as AgentResponse<T> | PromptResult<T> | undefined
    add: Format detection logic
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each method modification - fix before proceeding
npx tsc --noEmit                    # TypeScript type checking
npm run lint                        # ESLint checking

# Check specific file
npx tsc --noEmit src/core/agent.ts

# Expected: Zero type errors. Common issues:
# - Type mismatches in generic parameters
# - Missing properties in AgentResponseMetadata
# - Incorrect error code types

# If errors exist:
# 1. Check AgentResponse<T> type parameter preserved
# 2. Check metadata has all required fields
# 3. Check error codes are from AGENT_ERROR_CODES type
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run agent tests
npm test -- agent.test.ts

# Run specific test suite
npm test -- src/__tests__/unit/agent.test.ts

# Watch mode for development
npm run test:watch

# Expected: Tests may fail initially due to changed return type
# Update tests to assert on AgentResponse structure instead of T

# Test update pattern:
// OLD:
const result = await agent.prompt(prompt);
expect(result).toEqual({ expected: 'value' });

// NEW:
const response = await agent.prompt(prompt);
expect(response.status).toBe('success');
if (isSuccess(response)) {
  expect(response.data).toEqual({ expected: 'value' });
  expect(response.metadata.agentId).toBeDefined();
  expect(response.metadata.duration).toBeGreaterThan(0);
}
```

### Level 3: Integration Testing (System Validation)

```bash
# Run integration tests
npm test -- src/__tests__/integration/agent-workflow.test.ts

# Manual testing: Create test script to verify behavior
cat > test-agent-response.ts << 'EOF'
import { Agent } from './src/core/agent.js';
import { Prompt } from './src/core/prompt.js';
import { z } from 'zod';
import { isSuccess, isError } from './src/types/agent.js';

const agent = new Agent({ name: 'TestAgent' });
const prompt = new Prompt({
  user: 'What is 2 + 2?',
  responseFormat: z.object({
    result: z.number(),
    explanation: z.string(),
  }),
});

// Test success response
const response = await agent.prompt(prompt);
console.log('Response status:', response.status);
console.log('Response metadata:', response.metadata);

if (isSuccess(response)) {
  console.log('Data:', response.data);
  console.log('Duration:', response.metadata.duration);
} else if (isError(response)) {
  console.log('Error:', response.error.code, response.error.message);
}
EOF

npx tsx test-agent-response.ts

# Expected output:
# Response status: success
# Response metadata: { agentId: '...', timestamp: ..., duration: ..., requestId: '...' }
# Data: { result: 4, explanation: '...' }
# Duration: <number>

# Test error handling (modify prompt to trigger error):
# - Invalid API key
# - Malformed response
# Verify errors return with status: 'error', not thrown
```

### Level 4: Cache & Format Migration Validation

```bash
# Test cache format detection
cat > test-cache-migration.ts << 'EOF'
import { Agent } from './src/core/agent.js';
import { Prompt } from './src/core/prompt.js';
import { z } from 'zod';
import { defaultCache } from './src/cache/index.js';

const agent = new Agent({ name: 'TestAgent', enableCache: true });
const prompt = new Prompt({
  user: 'Test prompt',
  responseFormat: z.object({ result: z.string() }),
});

// First call - should execute and cache
const response1 = await agent.prompt(prompt);
console.log('First call status:', response1.status);
console.log('First call requestId:', response1.metadata.requestId);

// Second call - should hit cache with format detection
const response2 = await agent.prompt(prompt);
console.log('Second call status:', response2.status);
console.log('Same requestId:', response2.metadata.requestId === response1.metadata.requestId);
EOF

npx tsx test-cache-migration.ts

# Expected: Both calls return AgentResponse with same requestId
# If old PromptResult in cache: Format detection should re-execute

# Test cache miss with old format (simulate):
cat > test-old-cache-format.ts << 'EOF'
import { defaultCache } from './src/cache/index.js';

// Simulate old cache entry
const oldPromptResult = {
  data: { result: 'old cached value' },
  usage: { input_tokens: 10, output_tokens: 5 },
  duration: 100,
  toolCalls: 0,
};

await defaultCache.set('test-key', oldPromptResult);

// Try to retrieve - should detect old format and return undefined
const cached = await defaultCache.get('test-key');
console.log('Has status field:', 'status' in cached);
console.log('Should re-execute:', !('status' in cached));
EOF

npx tsx test-old-cache-format.ts

# Expected: Format detection correctly identifies old vs new format
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles: `npx tsc --noEmit` - zero errors
- [ ] No ESLint errors: `npm run lint`
- [ ] Factory functions imported from src/types/agent.ts
- [ ] TOOL_NOT_FOUND error code added (if missing)
- [ ] generateId() imported for requestId generation
- [ ] All tests pass after updating assertions

### Feature Validation

- [ ] `prompt<T>()` returns `AgentResponse<T>` instead of `T`
- [ ] Success responses have `status: 'success'` and populated metadata
- [ ] Error responses have `status: 'error'` and error details
- [ ] Method never throws - all errors wrapped
- [ ] Metadata includes: agentId, timestamp, duration, requestId
- [ ] Cache format detection handles old PromptResult entries
- [ ] `reflect()` method updated identically
- [ ] `promptWithMetadata()` kept for backward compatibility

### Code Quality Validation

- [ ] Follows existing code patterns from src/core/agent.ts
- [ ] Error code mappings match research specifications
- [ ] Duration calculated correctly (Date.now() - startTime)
- [ ] Type guards (isSuccess, isError) usable by callers
- [ ] No hardcoded values - use this.id, Date.now(), generateId()
- [ ] Cache type annotations updated correctly

### Integration Readiness

- [ ] Ready for P1.M1.T2 (update call sites)
- [ ] Backward compatibility maintained via promptWithMetadata()
- [ ] No breaking changes to existing API surface
- [ ] Documentation comments updated (JSDoc)

### Testing Validation

- [ ] Unit tests updated for AgentResponse assertions
- [ ] Integration tests pass with new format
- [ ] Error scenario tests cover all error codes
- [ ] Cache format detection tested
- [ ] requestId generation tested (unique per call)

---

## Anti-Patterns to Avoid

- ❌ Don't modify `promptWithMetadata()` in this task - keep for backward compatibility
- ❌ Don't use `createPartialResponse()` - streaming not implemented
- ❌ Don't throw errors - wrap all errors in createErrorResponse
- ❌ Don't skip cache format detection - old entries will cause runtime errors
- ❌ Don't forget to generate requestId - needed for tracing
- ❌ Don't omit duration - valuable for observability
- ❌ Don't use `undefined` for absent values - use `null` per PRD 6.4
- ❌ Don't skip updating `reflect()` method - needs same changes
- ❌ Don't add new error codes beyond TOOL_NOT_FOUND - use existing ones
- ❌ Don't modify factory functions - use them as-is from P1.M1.T1.S2

---

## Appendix: Code Examples

### Complete executePrompt() Refactoring Example

```typescript
// File: src/core/agent.ts

// Imports to add (if not present):
import { createSuccessResponse, createErrorResponse } from '../types/agent.js';
import { AGENT_ERROR_CODES } from '../types/agent.js';
import type { AgentResponse, AgentResponseMetadata } from '../types/agent.js';

private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const startTime = Date.now();
  const requestId = generateId();  // NEW: Generate for tracing
  let toolCallCount = 0;
  let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  // Get execution context for event emission
  const ctx = getExecutionContext();

  // Merge configuration (existing logic unchanged)
  const effectiveSystem =
    prompt.systemOverride ?? overrides?.system ?? this.config.system;
  const effectiveModel = overrides?.model ?? this.model;
  const effectiveMaxTokens = overrides?.maxTokens ?? this.config.maxTokens ?? 4096;
  const effectiveTemperature =
    overrides?.temperature ?? this.config.temperature;

  // Check cache if enabled
  const cacheEnabled = this.config.enableCache && !overrides?.disableCache;
  let cacheKey: string | undefined;

  if (cacheEnabled) {
    const cacheInputs: CacheKeyInputs = {
      user: prompt.buildUserMessage(),
      data: prompt.getData(),
      system: effectiveSystem,
      model: effectiveModel,
      temperature: effectiveTemperature,
      maxTokens: effectiveMaxTokens,
      tools: this.config.tools,
      mcps: this.config.mcps,
      skills: this.config.skills,
      responseFormat: prompt.getResponseFormat(),
    };
    cacheKey = generateCacheKey(cacheInputs);

    // NEW: Format detection for AgentResponse vs PromptResult
    const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | PromptResult<T> | undefined;
    if (cached) {
      if ('status' in cached) {
        // New format - AgentResponse<T>
        if (ctx) {
          this.emitWorkflowEvent({
            type: 'cacheHit',
            key: cacheKey,
            node: ctx.workflowNode,
          });
        }
        return cached as AgentResponse<T>;
      } else {
        // Old format - PromptResult<T>
        // Emit cache miss and re-execute
        if (ctx) {
          this.emitWorkflowEvent({
            type: 'cacheMiss',
            key: cacheKey,
            reason: 'format-mismatch',
            node: ctx.workflowNode,
          });
        }
        // Fall through to execute prompt
      }
    }

    if (ctx && (!cached || !('status' in cached))) {
      this.emitWorkflowEvent({
        type: 'cacheMiss',
        key: cacheKey,
        node: ctx.workflowNode,
      });
    }
  }

  try {
    // Emit prompt start event if in workflow context
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'agentPromptStart',
        agentId: this.id,
        agentName: this.name,
        promptId: prompt.id,
        node: ctx.workflowNode,
      });
    }

    const effectiveTools = this.mergeTools(
      prompt.toolsOverride ?? overrides?.tools ?? this.config.tools
    );

    const effectiveHooks = this.mergeHooks(
      prompt.hooksOverride,
      overrides?.hooks,
      this.config.hooks
    );

    const effectiveStop = overrides?.stop;

    // Set up environment variables
    const originalEnv = this.setupEnvironment(overrides?.env ?? this.config.env);

    // Call session start hooks
    await this.callHooks(effectiveHooks?.sessionStart, {
      agentId: this.id,
      agentName: this.name,
    } as SessionStartContext);

    // Build initial messages
    const messages: Message[] = [
      { role: 'user', content: prompt.buildUserMessage() },
    ];

    // Execute conversation loop (existing logic unchanged)
    let response = await this.callApi(
      messages,
      effectiveSystem,
      effectiveTools,
      effectiveModel,
      effectiveMaxTokens,
      effectiveTemperature,
      effectiveStop
    );

    totalUsage = this.addUsage(totalUsage, response.usage);

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        toolCallCount++;

        await this.callHooks(effectiveHooks?.preToolUse, {
          toolName: toolUse.name,
          toolInput: toolUse.input,
          agentId: this.id,
        } as PreToolUseContext);

        const toolStartTime = Date.now();
        const result = await this.executeTool(toolUse.name, toolUse.input);
        const toolDuration = Date.now() - toolStartTime;

        if (ctx) {
          this.emitWorkflowEvent({
            type: 'toolInvocation',
            toolName: toolUse.name,
            input: toolUse.input,
            output: result,
            duration: toolDuration,
            node: ctx.workflowNode,
          });
        }

        await this.callHooks(effectiveHooks?.postToolUse, {
          toolName: toolUse.name,
          toolInput: toolUse.input,
          toolOutput: result,
          agentId: this.id,
          duration: toolDuration,
        } as PostToolUseContext);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await this.callApi(
        messages,
        effectiveSystem,
        effectiveTools,
        effectiveModel,
        effectiveMaxTokens,
        effectiveTemperature,
        effectiveStop
      );

      totalUsage = this.addUsage(totalUsage, response.usage);
    }

    // Extract text response
    const textContent = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    if (!textContent) {
      // NEW: Wrap error instead of throwing
      throw new Error('No text response received from API');
    }

    // Parse JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate with schema
    const validated = prompt.validateResponse(parsed);

    // Call session end hooks
    await this.callHooks(effectiveHooks?.sessionEnd, {
      agentId: this.id,
      agentName: this.name,
      totalDuration: Date.now() - startTime,
    } as SessionEndContext);

    const duration = Date.now() - startTime;

    // Emit prompt end event if in workflow context
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'agentPromptEnd',
        agentId: this.id,
        agentName: this.name,
        promptId: prompt.id,
        node: ctx.workflowNode,
        duration,
        tokenUsage: totalUsage,
      });
    }

    // NEW: Create success response with metadata
    const metadata: AgentResponseMetadata = {
      agentId: this.id,
      timestamp: Date.now(),
      duration,
      requestId,
    };

    const result = createSuccessResponse(validated, metadata);

    // Store in cache if enabled
    if (cacheEnabled && cacheKey) {
      await defaultCache.set(cacheKey, result, { prefix: this.id });
    }

    return result;

  } catch (error) {
    // Restore environment before handling error
    this.restoreEnvironment(originalEnv);

    // NEW: Wrap error in AgentResponse
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Classify error and map to code
    let errorCode = AGENT_ERROR_CODES.EXECUTION_FAILED;
    let recoverable = false;
    const details: Record<string, unknown> = {
      agentId: this.id,
      promptId: prompt.id,
      duration,
      timestamp: Date.now(),
    };

    // Error classification logic
    if (message.includes('No text response')) {
      errorCode = AGENT_ERROR_CODES.API_REQUEST_FAILED;
      recoverable = true;
    } else if (message.includes('No JSON object')) {
      errorCode = AGENT_ERROR_CODES.INVALID_RESPONSE_FORMAT;
      recoverable = true;
    } else if (message.includes('No handler found for tool')) {
      errorCode = 'TOOL_NOT_FOUND';  // Will add to constants
      recoverable = false;
    } else if (error instanceof Error && error.name === 'ZodError') {
      errorCode = AGENT_ERROR_CODES.VALIDATION_FAILED;
      recoverable = true;
    }

    return createErrorResponse(errorCode, message, details, recoverable);
  }
}

// Updated public methods
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}

public async reflect<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const reflectionEnabled =
    prompt.enableReflection ??
    overrides?.enableReflection ??
    this.config.enableReflection;

  const systemPrefix = reflectionEnabled
    ? 'Before answering, reflect on your reasoning step by step...'
    : '';

  const effectiveOverrides: PromptOverrides = {
    ...overrides,
    system:
      systemPrefix +
      (prompt.systemOverride ?? overrides?.system ?? this.config.system ?? ''),
  };

  return this.executePrompt(prompt, effectiveOverrides);
}

// promptWithMetadata kept for backward compatibility
public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  const response = await this.executePrompt(prompt, overrides);

  if (response.status === 'success') {
    return {
      data: response.data,
      usage: (response.metadata as any).usage || { input_tokens: 0, output_tokens: 0 },
      duration: response.metadata.duration || 0,
      toolCalls: (response.metadata as any).toolCalls || 0,
    };
  }

  throw new Error(response.error?.message || 'Prompt execution failed');
}
```

---

**Confidence Score**: 9/10

This PRP provides comprehensive, actionable context for implementing the Agent.prompt() refactoring. All PRD requirements, existing codebase patterns, error handling strategies, cache compatibility, and implementation details are documented with specific references and code examples.

**Minor Risk**: Dependency on P1.M1.T1.S2 completion for factory functions. If that task is not complete, this task cannot proceed. Validate factory functions exist before starting implementation.

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
4. Uses factory functions from P1.M1.T1.S2 (already implemented in `src/types/agent.ts`)
5. Maintains backward compatibility for `promptWithMetadata()` until P1.M1.T2

**Success Definition**:

- [ ] `Agent.prompt<T>()` returns `Promise<AgentResponse<T>>`
- [ ] `Agent.reflect<T>()` returns `Promise<AgentResponse<T>>`
- [ ] Successful responses wrapped with `createSuccessResponse(data, metadata)`
- [ ] Error responses wrapped with `createErrorResponse(code, message, details, recoverable)`
- [ ] All errors caught - methods never throw
- [ ] Metadata populated (agentId, timestamp, duration, requestId)
- [ ] Cache returns AgentResponse format (with backward compatibility handling)
- [ ] TypeScript compiles without errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

---

## Why

This is a **critical breaking change** that implements PRD requirement: "All agent responses MUST be valid JSON conforming to the AgentResponse interface."

The refactoring:

1. **Enables PRD Compliance**: Satisfies PRD section 6 requirement for standardized response format
2. **Improves Error Handling**: Errors are returned as structured data instead of thrown exceptions
3. **Enables Observability**: Metadata (agentId, timestamp, duration, requestId) included in every response
4. **Supports Causality Tracking**: Request IDs enable end-to-end tracing across agent calls
5. **Type Safety**: Discriminated union types enable compile-time error checking

This task's output enables:
- **P1.M1.T2**: Update all call sites to handle AgentResponse
- **P1.M1.T1.S4**: Add INVALID_RESPONSE_FORMAT error handling
- **P1.M2.T1**: Zod schema validation for AgentResponse

---

## What

### Scope

**In Scope:**
- Modify `Agent.prompt()` method to return `Promise<AgentResponse<T>>`
- Modify `Agent.reflect()` method to return `Promise<AgentResponse<T>>`
- Modify internal `executePrompt()` to return `Promise<AgentResponse<T>>`
- Wrap all success responses using `createSuccessResponse()`
- Wrap all error responses using `createErrorResponse()`
- Add metadata (agentId, timestamp, duration, requestId)
- Update cache handling for AgentResponse format
- Keep `promptWithMetadata()` unchanged until P1.M1.T2

**Out of Scope:**
- Updating call sites (that's P1.M1.T2)
- Creating Zod schemas (that's P1.M2.T1)
- Implementing streaming (partial responses not used - see research)
- Modifying `promptWithMetadata()` (kept for backward compatibility)

### Success Criteria

- [ ] `prompt<T>()` signature returns `Promise<AgentResponse<T>>`
- [ ] `reflect<T>()` signature returns `Promise<AgentResponse<T>>`
- [ ] All 5 error scenarios mapped to error codes
- [ ] Metadata includes agentId, timestamp, duration, requestId
- [ ] Cache compatibility maintained with format detection
- [ ] Zero TypeScript compilation errors
- [ ] Zero breaking changes for existing code until P1.M1.T2

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this refactoring successfully?

**Answer**: YES - This PRP provides:
- Exact PRD specification for AgentResponse structure
- Complete error scenario inventory with line numbers
- Factory function locations and usage patterns
- Cache compatibility strategy with code examples
- Timing/metadata patterns
- All existing research findings

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

# CRITICAL - Factory Functions (Already Implemented)

- file: src/types/agent.ts
  why: Factory functions already implemented from P1.M1.T1.S2
  lines: 210-353
  pattern:
    - createSuccessResponse<T>(data: T, metadata: AgentResponseMetadata): AgentResponse<T>
    - createErrorResponse(code, message, details?, recoverable?): AgentResponse<null>
    - createPartialResponse<T>(data: T): AgentResponse<T>
    - isSuccess<T>(), isError<T>(), isPartial<T>() type guards
  gotcha: createErrorResponse sets default agentId='unknown' - override with actual agentId

# CRITICAL - Current Implementation Analysis

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S1/research/agent-prompt-implementation-analysis.md
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

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S3/research/error-handling-patterns.md
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

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S3/research/timing-patterns.md
  why: How to calculate duration and timestamp for metadata
  section:
    - Section 1: Duration calculation pattern in executePrompt()
    - Section 11: Refactoring guidance with code examples
  critical:
    - Pattern: const duration = Date.now() - startTime
    - Timestamp: Date.now() at execution time
    - All values in milliseconds

# CRITICAL - Request ID Research

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S3/research/request-id-patterns.md
  why: How to generate and use requestId for tracing
  section:
    - Section 1: Existing generateId() utility
    - Section 8: Recommendation for optional with auto-generation
  critical:
    - Use generateId() from src/utils/id.ts
    - Generate at start of executePrompt()
    - Include in metadata

# CRITICAL - Cache Compatibility Research

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S3/research/cache-compatibility.md
  why: How to handle cached PromptResult<T> when switching to AgentResponse<T>
  section:
    - Section 4: Migration strategy with format detection code
    - Section 6: Implementation strategy
  critical:
    - Add runtime format detection ('status' field check)
    - Ignore old PromptResult entries (re-execute)
    - Update type annotations

# CRITICAL - Streaming Research (Out of Scope)

- docfile: plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S3/research/streaming-patterns.md
  why: Confirms createPartialResponse should NOT be used
  section:
    - Section 6: Recommendations for P1.M1.T1.S3
  critical:
    - DO NOT use createPartialResponse()
    - Only use createSuccessResponse() and createErrorResponse()
    - Streaming not implemented - partial status is future placeholder

# EXTERNAL - Anthropic SDK Message Types

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/anthropic-sdk-message-types.md
  why: Complete Anthropic SDK Message object structure
  section:
    - Message Object Structure
    - Usage Object (input_tokens, output_tokens)
    - Content Block Types
    - Stop Reason Values
  critical:
    - SDK returns Message with content, usage, stop_reason
    - No built-in AgentResponse wrapping
    - Need to convert manually

# EXTERNAL - TypeScript Error Wrapping Patterns

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/typescript-error-wrapping-patterns.md
  why: Best practices for converting throw-based code to response-based
  section:
    - neverthrow library patterns
    - Migration patterns from throws to responses
    - Try-catch to response conversion examples
  critical:
    - Wrap try-catch in return statements
    - Never let exceptions propagate
    - Use discriminated unions for type narrowing

# EXTERNAL - Test Patterns Analysis

- docfile: plan/002_6761e4b84fd1/P1M1T1S3/research/test-patterns-analysis.md
  why: Current test patterns and missing test coverage
  section:
    - Test file locations
    - Mocking patterns
    - Assertion patterns
  critical:
    - No direct Agent.prompt() tests currently exist
    - Need to add tests for AgentResponse returns
    - Mock Anthropic SDK for unit testing

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
  lines: 92-353 (AgentResponse types and factory functions)
  gotcha: Factory functions already implemented, ready to import

- file: src/utils/id.ts
  why: generateId() utility for requestId generation
  pattern: const requestId = generateId()
  lines: 5-11
```

### Current Codebase Tree (Relevant Portions)

```bash
src/
├── core/
│   ├── agent.ts                 # [MODIFY] Main implementation
│   ├── factory.ts               # [REFERENCE] Factory patterns
│   ├── prompt.ts                # [REFERENCE] Prompt class patterns
│   └── ...
├── types/
│   ├── agent.ts                 # [IMPORT] Factory functions from here
│   ├── index.ts                 # [REFERENCE] Type exports
│   └── ...
├── utils/
│   └── id.ts                    # [IMPORT] generateId() for requestId
├── cache/
│   └── cache.ts                 # [REFERENCE] Cache patterns
└── __tests__/
    ├── unit/
    │   ├── agent.test.ts        # [WILL NEED UPDATES]
    │   └── agent-response-factory.test.ts  # [REFERENCE] Factory tests
    └── integration/
        └── agent-workflow.test.ts  # [WILL NEED UPDATES]
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: PRD 6.4.4 - Null over undefined
// All absent values must be null, not undefined
// Example: error: null (not error: undefined) for success responses

// CRITICAL: Factory functions use 'unknown' as default agentId
// createErrorResponse() sets agentId: 'unknown' by default
// Override with actual this.id when calling from agent.ts

// CRITICAL: Cache stores PromptResult<T> format
// Old cache entries won't have 'status' field
// Must detect format and ignore old entries

// CRITICAL: No streaming support exists
// createPartialResponse() exists but should NOT be used
// Only createSuccessResponse() and createErrorResponse() for this task

// CRITICAL: Tool execution errors
// Lines 480 and 490 wrap MCP tool errors
// Use TOOL_EXECUTION_FAILED error code, recoverable=false

// CRITICAL: Zod validation failures
// Line 387 calls prompt.validateResponse(parsed)
// Can throw - needs wrapping in INVALID_RESPONSE_FORMAT error

// CRITICAL: Duration calculation
// Current: const duration = Date.now() - startTime (line 396)
// Must include in metadata as duration property

// CRITICAL: requestId generation
// Use generateId() from src/utils/id.ts
// Generate once at start of executePrompt() for consistency

// GOTCHA: reflect() method has same signature as prompt()
// Must update both methods identically
// reflect() just adds reflection system prefix

// GOTCHA: promptWithMetadata() kept unchanged
// For backward compatibility during P1.M1.T2 migration
// Update in P1.M1.T2 when all call sites are updated
```

---

## Implementation Blueprint

### Data Models and Structure

**AgentResponse Types (Already Implemented in src/types/agent.ts:92-353):**

```typescript
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

// Factory functions (already implemented)
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T>;

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null>;

export function createPartialResponse<T>(
  data: T
): AgentResponse<T>;

// Type guards (already implemented)
export function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T>;
export function isError<T>(response: AgentResponse<T>): response is ErrorResponse;
export function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T>;
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY executePrompt() to return AgentResponse<T>
  - CHANGE: Return type from Promise<PromptResult<T>> to Promise<AgentResponse<T>>
  - FIND: src/core/agent.ts line 182
  - ADD: Import createSuccessResponse, createErrorResponse from '../types/agent.js'
  - ADD: Import generateId from '../utils/id.js'
  - ADD: Generate requestId at method start: const requestId = generateId()
  - MODIFY: Wrap successful response in createSuccessResponse()
  - MODIFY: Wrap all 5 error sites in createErrorResponse()
  - PRESERVE: All existing logic (cache, hooks, events, tool loop)
  - PLACEMENT: executePrompt() method (lines 182-428)

Task 2: UPDATE prompt() method signature and return
  - CHANGE: Return type from Promise<T> to Promise<AgentResponse<T>>
  - FIND: src/core/agent.ts line 110
  - MODIFY: Return full AgentResponse instead of extracting data
  - PRESERVE: executePrompt() call, just change return handling
  - PLACEMENT: prompt() method (lines 110-116)

Task 3: UPDATE reflect() method signature and return
  - CHANGE: Return type from Promise<T> to Promise<AgentResponse<T>>
  - FIND: src/core/agent.ts line 137
  - MODIFY: Return full AgentResponse instead of extracting data
  - PRESERVE: Reflection system prefix logic
  - PLACEMENT: reflect() method (lines 137-160)

Task 4: UPDATE error sites to use createErrorResponse()
  - SITE 1: Line 375 - "No text response received from API"
    ERROR_CODE: INVALID_RESPONSE_FORMAT
    RECOVERABLE: false
  - SITE 2: Line 381 - "No JSON object found in response"
    ERROR_CODE: INVALID_RESPONSE_FORMAT
    RECOVERABLE: false
  - SITE 3: Line 480 - Tool execution error (delegated handler)
    ERROR_CODE: TOOL_EXECUTION_FAILED
    RECOVERABLE: false
  - SITE 4: Line 490 - Tool execution error (main handler)
    ERROR_CODE: TOOL_EXECUTION_FAILED
    RECOVERABLE: false
  - SITE 5: Line 496 - "No handler found for tool"
    ERROR_CODE: TOOL_EXECUTION_FAILED
    RECOVERABLE: false
  - PATTERN: return createErrorResponse(code, message, details, recoverable)

Task 5: UPDATE success response wrapping
  - FIND: Line 411-416 (PromptResult<T> construction)
  - MODIFY: Create AgentResponseMetadata with agentId, timestamp, duration, requestId
  - MODIFY: Wrap in createSuccessResponse(validated, metadata)
  - PRESERVE: data, usage, toolCalls values (usage available via metadata extension)

Task 6: UPDATE cache handling for AgentResponse format
  - FIND: Line 221 (cache.get call)
  - ADD: Format detection - check if cached has 'status' field
  - IF: Old PromptResult format (no 'status') - ignore and re-execute
  - IF: New AgentResponse format - return directly
  - MODIFY: Type annotation from PromptResult<T> to AgentResponse<T>
  - PRESERVE: Cache hit/miss events

Task 7: PRESERVE promptWithMetadata() for backward compatibility
  - DO NOT MODIFY: promptWithMetadata() method (lines 124-129)
  - RATIONALE: P1.M1.T2 will migrate call sites
  - FUTURE: Update in P1.M1.T2 or deprecate

Task 8: VERIFY TypeScript compilation
  - RUN: npm run lint (tsc --noEmit)
  - EXPECTED: Zero type errors
  - FIX: Any type mismatches in return types

Task 9: RUN build to verify compilation
  - RUN: npm run build (tsc)
  - EXPECTED: Clean build, dist/ directory populated
  - FIX: Any compilation errors

Task 10: CREATE unit tests for AgentResponse returns
  - CREATE: src/__tests__/unit/agent-prompt-response.test.ts
  - TEST: Success path with proper metadata
  - TEST: All 5 error scenarios with correct error codes
  - TEST: Cache compatibility (old vs new format)
  - FOLLOW: Pattern from agent-response-factory.test.ts
```

### Implementation Patterns & Key Details

```typescript
// ========================
// IMPORT UPDATES
// ========================

// Add to existing imports in src/core/agent.ts
import {
  createSuccessResponse,
  createErrorResponse,
  type AgentResponse,
  type AgentResponseMetadata,
} from '../types/agent.js';

import { generateId } from '../utils/id.js';

// ========================
// EXECUTE PROMPT SIGNATURE CHANGE
// ========================

// BEFORE (Line 182):
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {

// AFTER:
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const startTime = Date.now();
  const requestId = generateId();  // NEW: Generate request ID
  let toolCallCount = 0;
  let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  // ... rest of method ...

  // ========================
  // CACHE HANDLING UPDATE
  // ========================

  // BEFORE (Line 221):
  const cached = await defaultCache.get(cacheKey) as PromptResult<T> | undefined;
  if (cached) {
    // Emit cache hit event
    return cached;
  }

  // AFTER:
  const cached = await defaultCache.get(cacheKey) as AgentResponse<T> | PromptResult<T> | undefined;
  if (cached && 'status' in cached) {
    // New AgentResponse format - has 'status' field
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'cacheHit',
        key: cacheKey,
        node: ctx.workflowNode,
      });
    }
    return cached;  // Return AgentResponse directly
  }
  // Old PromptResult format or undefined - re-execute

  // ========================
  // SUCCESS RESPONSE WRAPPING
  // ========================

  // BEFORE (Lines 411-423):
  const result: PromptResult<T> = {
    data: validated,
    usage: totalUsage,
    duration,
    toolCalls: toolCallCount,
  };

  if (cacheEnabled && cacheKey) {
    await defaultCache.set(cacheKey, result, { prefix: this.id });
  }

  return result;

  // AFTER:
  const metadata: AgentResponseMetadata = {
    agentId: this.id,
    timestamp: startTime,
    duration,
    requestId,
  };

  const response = createSuccessResponse(validated, metadata);

  if (cacheEnabled && cacheKey) {
    await defaultCache.set(cacheKey, response, { prefix: this.id });
  }

  return response;

  // ========================
  // ERROR SITE UPDATES
  // ========================

  // BEFORE (Line 375):
  if (!textContent) {
    throw new Error('No text response received from API');
  }

  // AFTER:
  if (!textContent) {
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'No text response received from API',
      { stopReason: response.stop_reason },
      false
    );
  }

  // BEFORE (Line 381):
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }

  // AFTER:
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'No JSON object found in response',
      { responseText: textContent.text },
      false
    );
  }

  // BEFORE (Line 480):
  const result = await handler.executeTool(name, input);
  if (result.is_error) {
    throw new Error(result.content as string);
  }

  // AFTER:
  const result = await handler.executeTool(name, input);
  if (result.is_error) {
    return createErrorResponse(
      'TOOL_EXECUTION_FAILED',
      result.content as string,
      { toolName: name, toolInput: input },
      false
    );
  }

  // Same pattern for lines 490 and 496

  // ========================
  // PROMPT() METHOD UPDATE
  // ========================

  // BEFORE (Lines 110-116):
  public async prompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<T> {
    const result = await this.executePrompt(prompt, overrides);
    return result.data;
  }

  // AFTER:
  public async prompt<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    return this.executePrompt(prompt, overrides);
  }

  // ========================
  // REFLECT() METHOD UPDATE
  // ========================

  // BEFORE (Lines 137-160):
  public async reflect<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<T> {
    // ... reflection logic ...
    const result = await this.executePrompt(prompt, effectiveOverrides);
    return result.data;
  }

  // AFTER:
  public async reflect<T>(
    prompt: Prompt<T>,
    overrides?: PromptOverrides
  ): Promise<AgentResponse<T>> {
    // ... reflection logic ...
    return this.executePrompt(prompt, effectiveOverrides);
  }

  // ========================
  // TRY-CATCH WRAPPING (if needed)
  // ========================

  // Pattern for wrapping any remaining error-prone code
  try {
    // ... some operation ...
  } catch (error) {
    return createErrorResponse(
      'EXECUTION_FAILED',
      error instanceof Error ? error.message : 'Unknown error',
      { originalError: error },
      false
    );
  }
```

### Error Code Mapping Table

| Error Site | Line | Current Error Message | Error Code | Recoverable | Details to Include |
|-----------|------|----------------------|------------|-------------|-------------------|
| No text response | 375 | "No text response received from API" | `INVALID_RESPONSE_FORMAT` | false | `stopReason` |
| No JSON found | 381 | "No JSON object found in response" | `INVALID_RESPONSE_FORMAT` | false | `responseText` (truncated) |
| Tool error (delegated) | 480 | Tool result content | `TOOL_EXECUTION_FAILED` | false | `toolName`, `toolInput` |
| Tool error (main) | 490 | Tool result content | `TOOL_EXECUTION_FAILED` | false | `toolName`, `toolInput` |
| No tool handler | 496 | "No handler found for tool '{name}'" | `TOOL_EXECUTION_FAILED` | false | `toolName` |

### Integration Points

```yaml
TYPE DEFINITIONS:
  - file: src/types/agent.ts
    import: createSuccessResponse, createErrorResponse, AgentResponse, AgentResponseMetadata
    lines: 210-261 (factory functions)

UTILITIES:
  - file: src/utils/id.ts
    import: generateId
    pattern: const requestId = generateId()

CACHE:
  - file: src/cache/cache.ts
    integration: Format detection for backward compatibility
    pattern: if (cached && 'status' in cached) { /* AgentResponse */ }

WORKFLOW EVENTS:
  - file: src/core/context.ts
    integration: getExecutionContext() for event emission
    preserve: All existing event emissions (cacheHit, cacheMiss, agentPromptStart, etc.)

TESTS:
  - file: src/__tests__/unit/agent-prompt-response.test.ts
    create: New test file for AgentResponse return testing
    pattern: Follow agent-response-factory.test.ts structure

  - file: src/__tests__/unit/agent.test.ts
    update: Existing tests will need updates in P1.M1.T2

  - file: src/__tests__/integration/agent-workflow.test.ts
    update: Integration tests will need updates in P1.M1.T2
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run lint         # TypeScript type checking (tsc --noEmit)
npm run build        # Full build (tsc)

# Check specific file
npx tsc --noEmit src/core/agent.ts

# Expected: Zero errors. If errors exist:
# 1. Check import paths (.js extensions required)
# 2. Check return type annotations match
# 3. Check factory function parameter types
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test AgentResponse factory functions (already implemented)
npm test -- agent-response-factory.test.ts

# Run all unit tests
npm test -- src/__tests__/unit/

# Watch mode for development
npm run test:watch

# Expected: All tests pass. Common issues:
# - Return type mismatches
# - Missing 'status' field in responses
# - Incorrect error codes
```

### Level 3: Integration Testing (System Validation)

```bash
# Test basic agent functionality (after P1.M1.T2 updates)
npm run start:basic

# Test agent loops (after P1.M1.T2 updates)
npm run start:agent-loops

# Expected: Examples run successfully after call site updates
# Note: Current examples will fail until P1.M1.T2 updates call sites
```

### Level 4: Cache Compatibility Validation

```bash
# Test cache format detection
node -e "
import { defaultCache } from './dist/cache/index.js';

// Set old PromptResult format
await defaultCache.set('test-old', { data: 'test', usage: {}, duration: 100, toolCalls: 0 });

// Set new AgentResponse format
await defaultCache.set('test-new', { status: 'success', data: 'test', error: null, metadata: { agentId: 'test', timestamp: Date.now() } });

const old = await defaultCache.get('test-old');
const new = await defaultCache.get('test-new');

console.log('Old format has status:', 'status' in old);
console.log('New format has status:', 'status' in new);
"

# Expected: Old format returns false for 'status' check, new returns true
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 3 method signatures updated (prompt, reflect, executePrompt)
- [ ] All 5 error sites use createErrorResponse()
- [ ] Success responses use createSuccessResponse()
- [ ] Metadata includes agentId, timestamp, duration, requestId
- [ ] Cache format detection implemented
- [ ] Zero TypeScript errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

### Feature Validation

- [ ] `prompt<T>()` returns `AgentResponse<T>`
- [ ] `reflect<T>()` returns `AgentResponse<T>`
- [ ] All error codes are SCREAMING_SNAKE_CASE
- [ ] Error responses have correct structure (status: 'error', error populated)
- [ ] Success responses have correct structure (status: 'success', data populated)
- [ ] Metadata.agentId matches this.id
- [ ] Metadata.timestamp is Unix timestamp in milliseconds
- [ ] Metadata.duration is execution time in milliseconds
- [ ] Metadata.requestId is unique per execution

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] Null used for absent values (not undefined)
- [ ] No exceptions thrown from prompt() or reflect()
- [ ] promptWithMetadata() unchanged for backward compatibility
- [ ] All imports use .js extensions (ESM requirement)

### Integration Readiness

- [ ] Factory functions imported correctly
- [ ] generateId() utility imported correctly
- [ ] Cache compatibility maintained
- [ ] Workflow events still emitted correctly
- [ ] Ready for P1.M1.T2 (call site updates)

---

## Anti-Patterns to Avoid

- ❌ Don't use `createPartialResponse()` - streaming not implemented
- ❌ Don't throw exceptions from prompt() or reflect() - must return error responses
- ❌ Don't use `undefined` for absent values - use `null` per PRD 6.4
- ❌ Don't forget to override default agentId in createErrorResponse()
- ❌ Don't modify promptWithMetadata() - keep for backward compatibility
- ❌ Don't skip cache format detection - old entries will break
- ❌ Don't use lowercase error codes - must be SCREAMING_SNAKE_CASE
- ❌ Don't forget to generate requestId - needed for tracing
- ❌ Don't use `this.id` for error responses - errors occur before agent context

---

## Appendix: Complete Implementation Example

```typescript
// src/core/agent.ts

// Add to imports
import {
  createSuccessResponse,
  createErrorResponse,
  type AgentResponse,
  type AgentResponseMetadata,
} from '../types/agent.js';
import { generateId } from '../utils/id.js';

// MODIFY executePrompt signature
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const startTime = Date.now();
  const requestId = generateId();  // NEW: Generate request ID
  let toolCallCount = 0;
  let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  const ctx = getExecutionContext();

  // ... configuration merge, cache check, etc. ...

  // Cache handling with format detection
  const cached = await defaultCache.get(cacheKey) as
    | AgentResponse<T>
    | PromptResult<T>
    | undefined;
  if (cached && 'status' in cached) {
    // New AgentResponse format
    if (ctx) {
      this.emitWorkflowEvent({
        type: 'cacheHit',
        key: cacheKey,
        node: ctx.workflowNode,
      });
    }
    return cached;
  }
  // Old format or undefined - continue execution

  // ... event emission, API call, tool loop, etc. ...

  // Error handling - site 1: No text response
  const textContent = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  if (!textContent) {
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'No text response received from API',
      { stopReason: response.stop_reason },
      false
    );
  }

  // Error handling - site 2: No JSON found
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'No JSON object found in response',
      { responseText: textContent.text.substring(0, 200) },
      false
    );
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const validated = prompt.validateResponse(parsed);

  // ... session end hooks, events, etc. ...

  const duration = Date.now() - startTime;

  // Success response wrapping
  const metadata: AgentResponseMetadata = {
    agentId: this.id,
    timestamp: startTime,
    duration,
    requestId,
  };

  const resultResponse = createSuccessResponse(validated, metadata);

  // Cache storage
  if (cacheEnabled && cacheKey) {
    await defaultCache.set(cacheKey, resultResponse, { prefix: this.id });
  }

  return resultResponse;
}

// MODIFY prompt() method
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  return this.executePrompt(prompt, overrides);
}

// MODIFY reflect() method
public async reflect<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const reflectionEnabled =
    prompt.enableReflection ??
    overrides?.enableReflection ??
    this.config.enableReflection;

  const systemPrefix = reflectionEnabled
    ? 'Before answering, reflect on your reasoning step by step. Consider alternative approaches and potential errors. Then provide your final answer.\n\n'
    : '';

  const effectiveOverrides: PromptOverrides = {
    ...overrides,
    system:
      systemPrefix +
      (prompt.systemOverride ?? overrides?.system ?? this.config.system ?? ''),
  };

  return this.executePrompt(prompt, effectiveOverrides);
}

// MODIFY executeTool() error handling
private async executeTool(name: string, input: unknown): Promise<unknown> {
  for (const handler of this.mcpHandlers) {
    if (handler.hasTool(name)) {
      const result = await handler.executeTool(name, input);
      if (result.is_error) {
        return createErrorResponse(
          'TOOL_EXECUTION_FAILED',
          result.content as string,
          { toolName: name, toolInput: input },
          false
        );
      }
      return result.content;
    }
  }

  if (this.mcpHandler.hasTool(name)) {
    const result = await this.mcpHandler.executeTool(name, input);
    if (result.is_error) {
      return createErrorResponse(
        'TOOL_EXECUTION_FAILED',
        result.content as string,
        { toolName: name, toolInput: input },
        false
      );
    }
    return result.content;
  }

  return createErrorResponse(
    'TOOL_EXECUTION_FAILED',
    `No handler found for tool '${name}'`,
    { toolName: name },
    false
  );
}
```

---

**Confidence Score**: 10/10

This PRP provides comprehensive, actionable context for implementing the Agent.prompt() refactoring. All PRD requirements, existing codebase patterns, error scenarios, cache compatibility strategies, and test patterns are documented with specific references, line numbers, and code examples.

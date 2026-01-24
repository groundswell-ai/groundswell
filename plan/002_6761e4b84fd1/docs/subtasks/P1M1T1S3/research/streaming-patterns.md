# Streaming Response Patterns Research

**Research Date**: 2026-01-24
**Task**: P1.M1.T1.S3 - Refactor Agent.prompt() to return AgentResponse
**Purpose**: Determine streaming support status and implications for AgentResponse refactoring

---

## Executive Summary

**Current Streaming Support Status**: **NO** - Streaming responses are not supported

**Key Finding**: The PRD defines a `partial` status for AgentResponse intended for "streaming/incremental results," but the codebase does **not** implement any streaming functionality. This is a forward-looking interface design, not current capability.

**Implication for P1.M1.T1.S3**: The `createPartialResponse` factory function exists as part of the AgentResponse type system, but it should **not** be used in the Agent.prompt() refactoring since streaming is not implemented.

---

## 1. Agent SDK Streaming Analysis

### 1.1 Current API Usage (src/core/agent.ts:468)

```typescript
// Line 468 - NON-STREAMING API CALL
return this.client.messages.create(params);
```

**Finding**: The Agent class uses `client.messages.create()` which returns a complete `Message` object, not a stream.

**What's Missing** for streaming:
- No `stream: true` parameter in request
- No use of `client.messages.stream()` method
- No handling of `StreamRunParams` type
- No event handlers for streaming events (text deltas, message deltas, etc.)

### 1.2 Anthropic SDK Streaming Capabilities

The Anthropic SDK supports streaming via:

```typescript
// NOT CURRENTLY USED - Example of streaming pattern
const stream = await anthropic.messages.stream({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello" }],
  stream: true,  // <-- This flag is never set in Groundswell
});

for await (const event of stream) {
  // Handle text deltas, message deltas, etc.
}
```

**Status**: Groundswell does not use any of these streaming APIs.

---

## 2. Code Search Results

### 2.1 "stream" keyword search

**Files mentioning "stream":**

1. **src/debugger/tree-debugger.ts:29**
   ```typescript
   /** Observable stream of workflow events */
   public readonly events: Observable<WorkflowEvent>;
   ```
   - **Context**: This refers to the Observer pattern for workflow events, not response streaming
   - **Irrelevant to Agent streaming**

2. **src/utils/observable.ts:2**
   ```typescript
   * Lightweight Observable implementation for event streaming
   ```
   - **Context**: Internal Observable implementation for event pub/sub
   - **Irrelevant to Agent streaming**

3. **src/types/agent.ts:264**
   ```typescript
   * Creates a partial response for streaming/incremental results.
   ```
   - **Context**: JSDoc comment for `createPartialResponse`
   - **Forward-looking**: Documents intended future use

### 2.2 Search for streaming-specific patterns

```bash
# No results found for:
- StreamRunParams
- stream: true
- .stream(
- messages.stream
```

**Conclusion**: No streaming implementation exists in the codebase.

---

## 3. PRD Analysis: Section 6 - Agent Response Model

### 3.1 Partial Response Definition (PRD 6.5)

From **PRD.md lines 227-242**:

```typescript
**Partial Response (for streaming/incremental results):**
{
  "status": "partial",
  "data": {
    "completedSteps": 3,
    "totalSteps": 5,
    "intermediateResult": { ... }
  },
  "error": null,
  "metadata": {
    "agentId": "agent-abc123",
    "timestamp": 1706140800000
  }
}
```

### 3.2 PRD Language Analysis

**Key Phrase**: "for streaming/incremental results"

- The PRD uses **future tense** language
- No implementation requirements specified
- No streaming event handlers defined
- No protocol for emitting multiple partial responses

**Interpretation**: The `partial` status is a **design placeholder** for future streaming support, not a requirement for current implementation.

---

## 4. Examples Analysis

### 4.1 Example files reviewed

- **01-basic-workflow.ts** - Basic workflow execution, no streaming
- **02-decorator-options.ts** - Decorator configuration, no streaming
- **08-sdk-features.ts** - SDK features including tools, MCP, hooks, no streaming

**Finding**: No examples demonstrate streaming response handling.

---

## 5. Factory Function Implementation

### 5.1 createPartialResponse function (src/types/agent.ts:277-289)

```typescript
/**
 * Creates a partial response for streaming/incremental results.
 *
 * @param data - The partial response data
 * @returns A partial AgentResponse
 *
 * @example
 * ```ts
 * const response = createPartialResponse({
 *   completedSteps: 3,
 *   totalSteps: 5
 * });
 * ```
 */
export function createPartialResponse<T>(
  data: T
): AgentResponse<T> {
  return {
    status: 'partial',
    data,
    error: null,
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Status**: Implemented as part of factory functions (P1.M1.T1.S2 deliverable)

**Usage**: Should NOT be used in Agent.prompt() refactoring since streaming is not implemented.

---

## 6. Recommendations for P1.M1.T1.S3

### 6.1 What to DO

1. **Use `createSuccessResponse`** for successful prompt completions
   ```typescript
   return createSuccessResponse(validated, {
     agentId: this.id,
     timestamp: Date.now(),
     duration: Date.now() - startTime,
   });
   ```

2. **Use `createErrorResponse`** for error cases
   ```typescript
   return createErrorResponse(
     'INVALID_RESPONSE_FORMAT',
     'No JSON object found in response',
     undefined,
     false
   );
   ```

3. **Implement type guards** for response handling
   ```typescript
   if (isSuccess(response)) {
     // TypeScript knows response.data is T
   }
   ```

### 6.2 What NOT to DO

1. **DO NOT use `createPartialResponse`** in Agent.prompt()
   - Rationale: Streaming is not implemented
   - There's no mechanism to emit multiple partial responses
   - No streaming event handlers exist

2. **DO NOT add streaming infrastructure** in this task
   - Streaming is out of scope for P1.M1.T1.S3
   - Would require significant architecture changes
   - Should be a separate feature implementation

3. **DO NOT assume `status: 'partial'` will be used**
   - Current implementation only returns `success` or `error`
   - Partial status is reserved for future streaming feature

---

## 7. Future Streaming Implementation (Out of Scope)

If streaming were to be implemented in the future, it would require:

### 7.1 Architecture Changes

1. **New prompt method variant**
   ```typescript
   async promptStream<T>(
     prompt: Prompt<T>,
     overrides?: PromptOverrides
   ): AsyncGenerator<AgentResponse<T>, AgentResponse<T>, void>
   ```

2. **Streaming configuration**
   ```typescript
   export interface PromptOverrides {
     // ... existing fields
     stream?: boolean;  // NEW: Enable streaming
     onPartial?: (response: AgentResponse<T>) => void;  // NEW: Callback
   }
   ```

3. **Event handling infrastructure**
   - Text delta handlers
   - Message delta handlers
   - Partial response emitters

### 7.2 Observable Integration

The existing `Observable` infrastructure could potentially be leveraged:
- Current: `Observable<WorkflowEvent>` for workflow events
- Future: `Observable<AgentResponse<T>>` for streaming responses

### 7.3 Agent Changes Required

```typescript
// PSEUDO-CODE - Future streaming implementation
private async callApiStream(params: MessageCreateParams): AsyncIterable<AgentResponse> {
  const stream = await this.client.messages.stream({
    ...params,
    stream: true,  // Enable streaming
  });

  for await (const event of stream) {
    switch (event.type) {
      case 'content_block_delta':
        yield createPartialResponse({
          textDelta: event.delta.text,
          completedSteps: estimateProgress(event),
        });
        break;
      case 'message_stop':
        yield createSuccessResponse(finalResult, metadata);
        break;
    }
  }
}
```

---

## 8. Testing Implications

### 8.1 Current Tests (No Streaming)

Tests for Agent.prompt() should cover:
- Success response with valid JSON
- Error response with parsing failures
- Error response with API failures
- Metadata population (agentId, timestamp, duration)

### 8.2 Tests NOT Needed

- Partial response handling (streaming not implemented)
- Multiple response emissions (streaming not implemented)
- Streaming cancellation (streaming not implemented)

---

## 9. Conclusion

### Summary Table

| Aspect | Status | Implication |
|--------|--------|-------------|
| **Streaming Support** | **NO** | Do not use `createPartialResponse` |
| **Partial Status Type** | Defined | Type system ready for future use |
| **Factory Function** | Implemented | Available but unused in current implementation |
| **Streaming Infrastructure** | Not Implemented | Out of scope for P1.M1.T1.S3 |
| **Agent.prompt() Return** | Success/Error only | Use `createSuccessResponse` and `createErrorResponse` |

### Final Recommendation

**For P1.M1.T1.S3 (Refactor Agent.prompt())**:

1. Wrap successful results with `createSuccessResponse()`
2. Wrap errors with `createErrorResponse()`
3. Do NOT use `createPartialResponse()` - streaming is not implemented
4. Document that partial responses are reserved for future streaming feature

**Streaming is explicitly OUT OF SCOPE** for this task and should be considered a separate feature implementation requiring:
- New API design (promptStream method)
- Streaming event handlers
- AsyncGenerator return type
- Observable integration
- Updated PRD requirements

---

## 10. References

### Code Files
- `/home/dustin/projects/groundswell/src/core/agent.ts` - Line 468: `client.messages.create()`
- `/home/dustin/projects/groundswell/src/types/agent.ts` - Lines 264-289: `createPartialResponse`
- `/home/dustin/projects/groundswell/src/utils/observable.ts` - Observable implementation (unrelated to response streaming)
- `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts` - Line 29: Observable for workflow events

### Documentation
- `/home/dustin/projects/groundswell/PRD.md` - Section 6.5: Partial Response definition (lines 227-242)
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P1M1T1S2/PRP.md` - Factory function specifications

### External References
- Anthropic SDK streaming documentation: https://docs.anthropic.com/en/api/messages-streaming

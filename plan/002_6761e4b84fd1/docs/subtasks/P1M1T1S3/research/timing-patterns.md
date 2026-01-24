# Timing and Duration Tracking Patterns Research

**Session:** 002_6761e4b84fd1
**Subtask:** P1M1T1S3 - Refactor Agent.prompt() to wrap responses in AgentResponse
**Date:** 2026-01-24

---

## Executive Summary

This document catalogs all timing and duration tracking patterns in the Groundswell codebase to support the refactoring of `Agent.prompt()` to return `AgentResponse<T>` objects with proper metadata.

**Key Findings:**
- **Consistent Pattern:** Duration is calculated using `Date.now() - startTime` throughout the codebase
- **Unix Timestamps:** All timestamps use `Date.now()` (milliseconds since Unix epoch)
- **No performance.now():** Only used in test benchmarks, not in production code
- **Metadata Fields:** `AgentResponseMetadata` requires `timestamp` (Unix ms) and optional `duration` (ms)

---

## 1. Duration Calculation Pattern in executePrompt()

**Location:** `/home/dustin/projects/groundswell/src/core/agent.ts`

### Current Implementation (Lines 186-414)

```typescript
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  const startTime = Date.now();  // Line 186
  let toolCallCount = 0;
  let totalUsage: TokenUsage = { input_tokens: 0, output_tokens: 0 };

  // ... API call logic ...

  // Tool execution timing (Lines 313-318)
  const toolStartTime = Date.now();
  const result = await this.executeTool(toolUse.name, toolUse.input);
  const toolDuration = Date.now() - toolStartTime;

  // Total duration calculation (Line 396)
  const duration = Date.now() - startTime;

  // Return result with duration (Lines 411-416)
  const result: PromptResult<T> = {
    data: validated,
    usage: totalUsage,
    duration,
    toolCalls: toolCallCount,
  };

  return result;
}
```

**Pattern:**
1. Capture `startTime` with `Date.now()` at method entry
2. Calculate `duration = Date.now() - startTime` before return
3. Duration is in **milliseconds**

---

## 2. PromptResult<T> Interface (Current)

**Location:** `/home/dustin/projects/groundswell/src/core/agent.ts:31-40`

```typescript
export interface PromptResult<T> {
  /** Validated response data */
  data: T;
  /** Token usage from the API */
  usage: TokenUsage;
  /** Total duration in milliseconds */
  duration: number;
  /** Number of tool invocations */
  toolCalls: number;
}
```

**Key Points:**
- `duration` is **required** (not optional)
- Type is `number` (milliseconds)
- Already being populated correctly in `executePrompt()`

---

## 3. AgentResponseMetadata Interface (Target)

**Location:** `/home/dustin/projects/groundswell/src/types/agent.ts:142-154`

```typescript
export interface AgentResponseMetadata {
  /** Agent identifier (required) */
  agentId: string;

  /** Unix timestamp in milliseconds (required) */
  timestamp: number;

  /** Execution duration in milliseconds (optional) */
  duration?: number | null;

  /** Request correlation ID (optional) */
  requestId?: string | null;
}
```

**Requirements:**
- `timestamp`: **Required** - Unix timestamp in milliseconds
- `duration`: **Optional** - Execution time in milliseconds
- Both use `number` type (milliseconds)

---

## 4. Factory Functions and Duration Handling

**Location:** `/home/dustin/projects/groundswell/src/types/agent.ts:210-261`

### createSuccessResponse()

```typescript
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}
```

**Usage Pattern:**
```typescript
const response = createSuccessResponse(
  { result: 'success' },
  {
    agentId: 'agent-123',
    timestamp: Date.now(),
    duration: 1523  // milliseconds
  }
);
```

### createErrorResponse()

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): AgentResponse<null> {
  return {
    status: 'error',
    data: null,
    error: { code, message, details: details ?? null, recoverable },
    metadata: {
      agentId: 'unknown',
      timestamp: Date.now(),
    },
  };
}
```

**Note:** Error responses don't include duration in the factory function's default metadata.

---

## 5. Timing Patterns in Workflow Context

**Location:** `/home/dustin/projects/groundswell/src/core/workflow-context.ts`

### Step Execution Timing (Lines 87-136)

```typescript
async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startTime = Date.now();  // Line 87

  // ... step execution ...

  const duration = Date.now() - startTime;  // Line 130
  this.workflow.emitEvent({
    type: 'stepEnd',
    node: stepNode,
    step: name,
    duration,  // milliseconds
  });

  return result;
}
```

### Revision Timing (Lines 230-336)

```typescript
async replaceLastPromptResult<T>(...): Promise<T> {
  // ... revision logic ...

  this.workflow.emitEvent({
    type: 'stepEnd',
    node: revisionNode,
    step: `revision:${newPrompt.id}`,
    duration: 0, // Could track actual duration if needed (Line 306)
  });
}
```

**Note:** Revision steps currently use `duration: 0` as a placeholder.

---

## 6. Step Decorator Timing Pattern

**Location:** `/home/dustin/projects/groundswell/src/decorators/step.ts`

```typescript
export function Step(opts: StepOptions = {}) {
  return function (originalMethod, context) {
    async function stepWrapper(this, ...args) {
      const startTime = Date.now();  // Line 41

      // ... method execution ...

      const duration = Date.now() - startTime;  // Line 93
      if (opts.trackTiming !== false) {
        wf.emitEvent({
          type: 'stepEnd',
          node: wf.node,
          step: stepName,
          duration,
        });
      }

      if (opts.logFinish) {
        wf.logger.info(`STEP END: ${stepName} (${duration}ms)`);
      }

      return result;
    }
  };
}
```

**Pattern:**
- Always calculates duration
- Only emits event if `trackTiming !== false` (default: true)
- Logs duration in message if `logFinish` is true

---

## 7. Event Timing Patterns

**Location:** `/home/dustin/projects/groundswell/src/types/events.ts`

### stepEnd Event

```typescript
export type WorkflowEvent =
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  // ... other events
```

### agentPromptEnd Event

```typescript
| {
    type: 'agentPromptEnd';
    agentId: string;
    agentName: string;
    promptId: string;
    node: WorkflowNode;
    duration: number;  // milliseconds
    tokenUsage?: TokenUsage;
  }
```

### toolInvocation Event

```typescript
| {
    type: 'toolInvocation';
    toolName: string;
    input: unknown;
    output: unknown;
    duration: number;  // milliseconds
    node: WorkflowNode;
  }
```

---

## 8. Workflow Result Duration

**Location:** `/home/dustin/projects/groundswell/src/types/workflow-context.ts:154-163`

```typescript
export interface WorkflowResult<T = unknown> {
  /** The result value */
  data: T;

  /** The workflow node */
  node: WorkflowNode;

  /** Total duration in milliseconds */
  duration: number;
}
```

**Usage in workflow.ts (Line 518):**
```typescript
duration: Date.now() - startTime,
```

---

## 9. Timestamp Patterns Across Codebase

### LogEntry Timestamp

**Location:** `/home/dustin/projects/groundswell/src/types/logging.ts:14-15`

```typescript
export interface LogEntry {
  // ...
  /** Unix timestamp in milliseconds */
  timestamp: number;
}
```

### EventNode Timestamp

**Location:** `/home/dustin/projects/groundswell/src/types/workflow-context.ts:51`

```typescript
export interface EventNode {
  id: string;
  type: string;
  timestamp: number;  // Unix milliseconds
  // ...
}
```

### AgentResponseMetadata Timestamp

**Location:** `/home/dustin/projects/groundswell/src/types/agent.ts:146-147`

```typescript
export interface AgentResponseMetadata {
  // ...
  /** Unix timestamp in milliseconds (required) */
  timestamp: number;
}
```

---

## 10. Date.now() vs performance.now() Patterns

### Date.now() (Production Code)

**Used for:**
- All duration calculations in production code
- All timestamps in production code
- Event timestamps
- Log entry timestamps
- Metadata timestamps

**Pattern:**
```typescript
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;
const timestamp = Date.now();
```

### performance.now() (Test Code Only)

**Used in:**
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/node-map-update-benchmarks.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/incremental-performance.test.ts`
- `/home/dustin/projects/groundswell/src/__tests__/adversarial/attachChild-performance.test.ts`

**Pattern:**
```typescript
const start = performance.now();
// ... operation ...
const duration = performance.now() - start;
```

**Why:** `performance.now()` provides sub-millisecond precision for benchmarking, but `Date.now()` is sufficient for production timing and provides Unix timestamps.

---

## 11. Refactoring Guidance for P1M1T1S3

### How Duration Should Be Passed to createSuccessResponse

```typescript
private async executePrompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<AgentResponse<T>> {
  const startTime = Date.now();

  // ... existing logic ...

  const duration = Date.now() - startTime;
  const timestamp = Date.now();  // Capture current timestamp for response

  const response = createSuccessResponse(validated, {
    agentId: this.id,
    timestamp,        // Unix timestamp in milliseconds
    duration,         // Execution duration in milliseconds
    requestId: prompt.id,  // Optional correlation ID
  });

  return response;
}
```

### For Error Responses

```typescript
catch (error) {
  const duration = Date.now() - startTime;
  const timestamp = Date.now();

  return createErrorResponse(
    'EXECUTION_FAILED',
    error.message,
    { originalError: error },
    false
  );
  // Note: createErrorResponse sets default metadata with agentId='unknown'
  // We may need to enhance it to accept custom metadata
}
```

---

## 12. Summary Table

| Context | Start Time | Duration Calculation | Timestamp | Unit |
|---------|-----------|---------------------|-----------|------|
| `Agent.executePrompt()` | `Date.now()` | `Date.now() - startTime` | `Date.now()` | ms |
| `WorkflowContext.step()` | `Date.now()` | `Date.now() - startTime` | `Date.now()` | ms |
| `@Step decorator` | `Date.now()` | `Date.now() - startTime` | N/A | ms |
| Tool execution | `Date.now()` | `Date.now() - startTime` | N/A | ms |
| Events | N/A | N/A | `Date.now()` | ms |
| Log entries | N/A | N/A | `Date.now()` | ms |
| `AgentResponseMetadata` | N/A | Optional: `Date.now() - startTime` | Required: `Date.now()` | ms |

---

## 13. Key Implementation Notes

1. **Timestamp Capture:** Always use `Date.now()` for `AgentResponseMetadata.timestamp`
2. **Duration Calculation:** Use pattern `const duration = Date.now() - startTime`
3. **Unit Consistency:** All timing values are in **milliseconds**
4. **Optional Duration:** `duration` in metadata is optional - can include if useful for observability
5. **Factory Function Enhancement:** Consider updating `createErrorResponse()` to accept custom metadata parameter

---

## 14. Related Files

- `/home/dustin/projects/groundswell/src/core/agent.ts` - Agent implementation with executePrompt()
- `/home/dustin/projects/groundswell/src/types/agent.ts` - AgentResponse, AgentResponseMetadata, factory functions
- `/home/dustin/projects/groundswell/src/types/events.ts` - Event types with duration fields
- `/home/dustin/projects/groundswell/src/core/workflow-context.ts` - Workflow context timing patterns
- `/home/dustin/projects/groundswell/src/decorators/step.ts` - Step decorator timing
- `/home/dustin/projects/groundswell/src/types/logging.ts` - LogEntry timestamp pattern
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/delta_prd.md` - PRD requirements for AgentResponse

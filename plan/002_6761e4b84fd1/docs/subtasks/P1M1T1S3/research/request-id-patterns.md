# Request ID Generation and Tracing Patterns Research

**Research Date:** 2026-01-24
**Purpose:** Inform PRP for agent response metadata implementation (P1M1T1S3)

---

## Executive Summary

**Key Finding:** Groundswell has a comprehensive ID generation and tracing infrastructure, but `requestId` in `AgentResponseMetadata` is currently **optional** and not automatically generated.

**Recommendation:** `requestId` should remain **optional** (`requestId?: string`) but can be **automatically generated** for each `agent.prompt()` call to enable end-to-end tracing.

---

## 1. Existing ID Generation Utilities

### Location: `/home/dustin/projects/groundswell/src/utils/id.ts`

```typescript
/**
 * Generate a unique identifier
 * Uses crypto.randomUUID if available, falls back to timestamp + random
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}
```

### Usage Across Codebase

| Component | Property | Generation Method |
|-----------|----------|-------------------|
| `Workflow` | `id` | `generateId()` in constructor (line 84) |
| `Prompt` | `id` | `generateId()` in constructor (line 58) |
| `Agent` | `id` | `generateId()` in constructor (line 77) |
| `WorkflowNode` | `id` | Inherited from parent Workflow |
| `LogEntry` | `id` | `generateId()` (via logger) |
| Step nodes | `id` | `generateId()` in `WorkflowContextImpl.step()` (line 91) |

### ID Generation Pattern

- **Primary:** `crypto.randomUUID()` - RFC 4122 UUID v4 format
- **Fallback:** Timestamp + random string for environments without Web Crypto API
- **Format:** UUID (e.g., "550e8400-e29b-41d4-a716-446655440000") or "lw1abcd2ef-3ghij45k6"

---

## 2. Existing Tracing Infrastructure

### Workflow Event System

**Location:** `/home/dustin/projects/groundswell/src/types/events.ts`

#### Agent/Prompt Events

```typescript
// Agent/Prompt events
| {
    type: 'agentPromptStart';
    agentId: string;
    agentName: string;
    promptId: string;
    node: WorkflowNode;
  }
| {
    type: 'agentPromptEnd';
    agentId: string;
    agentName: string;
    promptId: string;
    node: WorkflowNode;
    duration: number;
    tokenUsage?: TokenUsage;
  }
```

#### Key Tracing Fields in Events

| Field | Type | Purpose |
|-------|------|---------|
| `agentId` | string | Identifies which agent executed the prompt |
| `promptId` | string | Identifies the prompt definition (immutable) |
| `node.id` | string | Workflow node ID for hierarchy tracking |
| `workflowId` | string | From execution context |

### AgentExecutionContext

**Location:** `/home/dustin/projects/groundswell/src/core/context.ts`

```typescript
export interface AgentExecutionContext {
  /** Current workflow node in the hierarchy */
  workflowNode: WorkflowNode;

  /** Function to emit events to the workflow tree */
  emitEvent: (event: WorkflowEvent) => void;

  /** Workflow ID for tracking */
  workflowId: string;

  /** Parent workflow ID if nested */
  parentWorkflowId?: string;
}
```

### Execution Context Propagation

**Mechanism:** AsyncLocalStorage (Node.js async_hooks)

```typescript
// From agent.ts executePrompt()
const ctx = getExecutionContext();  // Gets current context from AsyncLocalStorage

// Events are emitted with full context
this.emitWorkflowEvent({
  type: 'agentPromptStart',
  agentId: this.id,
  agentName: this.name,
  promptId: prompt.id,
  node: ctx.workflowNode,
});
```

---

## 3. Current AgentResponseMetadata Specification

**Location:** `/home/dustin/projects/groundswell/PRD.md` (lines 170-176)

```typescript
export interface AgentResponseMetadata {
  agentId: string;                 // ID of the responding agent/workflow
  timestamp: number;               // Unix timestamp (ms)
  duration?: number;               // execution time in ms
  requestId?: string;              // correlation ID for tracing
}
```

### Key Observations

1. **`requestId` is OPTIONAL** (`requestId?: string`)
2. **No automatic generation** - requestId must be manually provided if needed
3. **Purpose:** "correlation ID for tracing"

---

## 4. How requestId Relates to Workflow Event Tracing

### Current Tracing Chain (Without requestId)

```
Workflow.id (root)
  └─ WorkflowContext.workflowId
      └─ WorkflowNode.id (step)
          └─ agentPromptStart event
              ├─ agentId: Agent.id
              ├─ promptId: Prompt.id
              └─ node: WorkflowNode (with id)
          └─ agentPromptEnd event
              └─ tokenUsage, duration
```

### Proposed Tracing Chain (With requestId)

```
External Request / User Action
  └─ requestId: "req-abc123"  (NEW: top-level correlation)
      └─ Workflow.id
          └─ agent.prompt() call
              ├─ agentPromptStart event
              │   └─ (implicit correlation via requestId)
              └─ AgentResponse
                  └─ metadata.requestId: "req-abc123"
```

### Cross-System Tracing Use Cases

1. **External Request Tracking:** API request -> workflow -> agent response
2. **Multi-Workflows:** Single requestId across spawned child workflows
3. **Async Operations:** Correlate delayed responses with original requests
4. **Debugging:** Trace a single request across multiple services/logs

---

## 5. ID Generation Points for agent.prompt()

### Current Flow (in Agent.executePrompt)

```typescript
// Location: src/core/agent.ts:182-428
private async executePrompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<PromptResult<T>> {
  const startTime = Date.now();
  const ctx = getExecutionContext();  // Line 191

  // ... cache checking ...

  // Emit prompt start event (line 244-253)
  if (ctx) {
    this.emitWorkflowEvent({
      type: 'agentPromptStart',
      agentId: this.id,
      agentName: this.name,
      promptId: prompt.id,  // ← Prompt's immutable ID
      node: ctx.workflowNode,
    });
  }

  // ... API call and tool execution ...

  // Emit prompt end event (line 398-409)
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

  return {
    data: validated,
    usage: totalUsage,
    duration,
    toolCalls: toolCallCount,
  };
}
```

### Proposed requestId Generation Point

```typescript
// Option 1: Generate at prompt execution time
private async executePrompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<PromptResult<T>> {
  // Generate requestId for this specific prompt invocation
  const requestId = generateId();  // NEW

  // ... existing code ...

  return {
    data: validated,
    usage: totalUsage,
    duration,
    toolCalls: toolCallCount,
    requestId,  // NEW: include in result
  };
}

// Option 2: Accept from execution context (for cross-workflow tracing)
private async executePrompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<PromptResult<T>> {
  const ctx = getExecutionContext();
  const requestId = ctx?.requestId ?? generateId();  // NEW: use context or generate

  // ... existing code ...
}
```

---

## 6. Hierarchical Logging with Correlation

### Current Pattern (from Observability Research)

**Location:** `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/architecture/OBSERVABILITY_PATTERNS_RESEARCH.md` (lines 174-227)

```typescript
export interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  parentLogId?: string;  // ✅ Causal relationship
}
```

### Enhancement: Correlation IDs (Future - mentioned in research)

```typescript
interface LogEntry {
  id: string;
  workflowId: string;
  correlationId?: string;  // Cross-workflow tracing (PROPOSED)
  parentLogId?: string;    // Parent-child relationship (EXISTING)
  // ...
}
```

### Alignment with requestId

- `correlationId` in logs ≈ `requestId` in AgentResponseMetadata
- Both serve the same purpose: cross-cutting concern for distributed tracing
- **Recommendation:** Use the same term consistently (prefer "requestId" as it's in PRD)

---

## 7. Correlation with Existing ID Patterns

### Similar Pattern: SpawnWorkflowRequest

**Location:** `/home/dustin/projects/groundswell/src/tools/introspection.ts` (lines 81-86)

```typescript
export interface SpawnWorkflowRequest {
  name: string;
  description: string;
  requestId: string;        // ← REQUIRED (not optional)
  status: 'pending';
}
```

**Key Difference:** SpawnWorkflowRequest **requires** requestId (for async workflow spawn tracking), while AgentResponseMetadata has it **optional**.

---

## 8. Recommendation: Required, Optional, or Null?

### Analysis

| Option | Pros | Cons |
|--------|------|------|
| **Required** | Enforces tracing discipline, no missing IDs | Breaking change, may not always have meaningful requestId |
| **Optional** | Backward compatible, flexible for different use cases | Requires manual management,容易遗漏 |
| **Null** | Explicit "no ID" state | Same as optional, less TypeScript-friendly |

### Recommendation: **Optional with Auto-Generation**

```typescript
export interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number;
  requestId?: string;              // KEEP OPTIONAL
}

// Implementation: Auto-generate if not provided
function createMetadata(agentId: string, duration: number, requestId?: string): AgentResponseMetadata {
  return {
    agentId,
    timestamp: Date.now(),
    duration,
    requestId: requestId ?? generateId(),  // Auto-generate if omitted
  };
}
```

### Rationale

1. **Backward Compatibility:** Existing code without requestId continues to work
2. **Auto-Tracing:** New code gets automatic requestId without changes
3. **Flexibility:** External requestId can still be passed (e.g., from HTTP request)
4. **Consistency:** Aligns with PRD specification (optional field)
5. **No Breaking Changes:** PRD already specifies `requestId?: string`

---

## 9. Implementation Strategy

### Phase 1: Add requestId to PromptResult

```typescript
// src/core/agent.ts
export interface PromptResult<T> {
  data: T;
  usage: TokenUsage;
  duration: number;
  toolCalls: number;
  requestId: string;  // NEW: Always present
}
```

### Phase 2: Generate in executePrompt

```typescript
private async executePrompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<PromptResult<T>> {
  const requestId = generateId();  // Generate once per prompt call
  // ... existing code ...
  return { data, usage, duration, toolCalls, requestId };
}
```

### Phase 3: Add to Execution Context (Optional Enhancement)

```typescript
// src/core/context.ts
export interface AgentExecutionContext {
  workflowNode: WorkflowNode;
  emitEvent: (event: WorkflowEvent) => void;
  workflowId: string;
  parentWorkflowId?: string;
  requestId?: string;  // NEW: for cross-workflow tracing
}
```

### Phase 4: Update Event Types (Future Enhancement)

```typescript
// src/types/events.ts
| {
    type: 'agentPromptStart';
    agentId: string;
    agentName: string;
    promptId: string;
    requestId: string;  // NEW: correlation ID
    node: WorkflowNode;
  }
```

---

## 10. Testing Considerations

### Unit Tests

```typescript
describe('Agent requestId generation', () => {
  it('should generate unique requestId for each prompt call', async () => {
    const agent = new Agent({ name: 'Test' });
    const prompt = new Prompt({
      user: 'test',
      responseFormat: z.object({ result: z.string() }),
    });

    const result1 = await agent.executePrompt(prompt);
    const result2 = await agent.executePrompt(prompt);

    expect(result1.requestId).toBeDefined();
    expect(result2.requestId).toBeDefined();
    expect(result1.requestId).not.toBe(result2.requestId);
  });

  it('should use provided requestId from context', async () => {
    const customRequestId = 'custom-req-123';
    // Test with execution context that has requestId
  });
});
```

### Integration Tests

```typescript
describe('End-to-end requestId tracing', () => {
  it('should trace requestId from workflow to agent response', async () => {
    // Create workflow
    // Execute agent.prompt()
    // Verify requestId in events and response
  });
});
```

---

## 11. Open Questions

1. **Should requestId be added to WorkflowEvent?**
   - Current: Events have `agentId`, `promptId`, `node.id`
   - Proposal: Add `requestId` to `agentPromptStart` and `agentPromptEnd` events
   - Impact: Enables querying all events for a specific request

2. **Should requestId be in AgentExecutionContext?**
   - Enables cross-workflow tracing (parent requestId propagated to children)
   - Requires context enhancement
   - Useful for async workflow spawning scenarios

3. **How does requestId relate to correlationId in observability research?**
   - Research mentions `correlationId` as optional enhancement for logs
   - Recommendation: Use consistent terminology (`requestId` everywhere)

---

## 12. Files Requiring Changes

### Core Files

| File | Change |
|------|--------|
| `src/core/agent.ts` | Add `requestId` to `PromptResult`, generate in `executePrompt` |
| `src/types/events.ts` | (Optional) Add `requestId` to agent events |
| `src/core/context.ts` | (Optional) Add `requestId` to `AgentExecutionContext` |

### Type Definitions

| File | Change |
|------|--------|
| `src/types/agent.ts` (if exists) | Export `AgentResponseMetadata` interface |
| `src/index.ts` | Export metadata types if needed |

### Test Files

| File | Change |
|------|--------|
| `src/__tests__/unit/agent.test.ts` | Add requestId generation tests |
| `src/__tests__/integration/agent-workflow.test.ts` | Add tracing tests |

---

## Conclusion

**Summary:**

1. **Existing Infrastructure:** Groundswell has excellent ID generation (`generateId()`) and tracing (workflow events, execution context)
2. **Current State:** `requestId` in `AgentResponseMetadata` is **optional** and not auto-generated
3. **Recommendation:** Keep `requestId` **optional** but **auto-generate** in `agent.executePrompt()`
4. **Benefits:** Automatic tracing without breaking changes, enables cross-system correlation
5. **Implementation:** Single function call to `generateId()` in existing `executePrompt` method

**Action Items for PRP:**

1. Add `requestId` to `PromptResult` interface (required field)
2. Generate `requestId` in `Agent.executePrompt()` using existing `generateId()`
3. Include `requestId` in returned metadata
4. (Optional) Add `requestId` to workflow events for enhanced tracing
5. (Optional) Add `requestId` to `AgentExecutionContext` for cross-workflow tracing

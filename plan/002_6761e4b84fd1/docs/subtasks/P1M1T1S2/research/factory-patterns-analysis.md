# Factory Patterns Analysis - Groundswell Codebase

**Work Item:** P1.M1.T1.S2 - Create AgentResponse factory helper functions
**Research Date:** 2026-01-24
**Status:** Complete

---

## Executive Summary

The Groundswell codebase follows consistent factory function patterns that should be emulated when creating AgentResponse helper functions. Key patterns include `create*` naming convention, generic type preservation, and delegation of validation to constructors.

---

## 1. Factory Function Patterns

### Location: `src/core/factory.ts`

#### `createWorkflow<T>(config, executor)`

```typescript
// Lines 35-40
export function createWorkflow<T>(
  config: WorkflowConfig,
  executor: WorkflowExecutor<T>
): Workflow<T> {
  return new WorkflowImpl(config, executor);
}
```

**Pattern Analysis:**
- **Naming:** `create` + TypeName (lowercase first letter)
- **Generic Preservation:** `<T>` flows from input to output type
- **No Validation:** Factory delegates validation to constructor
- **Direct Instantiation:** Returns `new ClassName(...)` directly

#### `createAgent(config)`

```typescript
// Lines 60-62
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
```

**Pattern Analysis:**
- **Simple Configuration:** Single config parameter
- **Return Type:** Interface type (not implementation class)
- **No Generic:** Agent is not generic

#### `createPrompt<T>(config)`

```typescript
// Lines 84-86
export function createPrompt<T>(config: PromptConfig<T>): Prompt<T> {
  return new Prompt(config);
}
```

**Pattern Analysis:**
- **Generic Preservation:** `<T>` preserved from config to return type
- **Frozen Value Object:** Prompt is immutable (Object.freeze)

#### `quickWorkflow<T>(name, executor)` and `quickAgent(name, system?)`

```typescript
// Lines 102-107
export function quickWorkflow<T>(
  name: string,
  executor: WorkflowExecutor<T>
): Workflow<T> {
  return new WorkflowImpl({ name }, executor);
}

// Lines 121-123
export function quickAgent(name: string, system?: string): Agent {
  return new Agent({ name, system });
}
```

**Pattern Analysis:**
- **Naming:** `quick` + TypeName for shorthand variants
- **Minimal Parameters:** Only essential parameters, uses defaults
- **Inline Config:** Config object created inline

---

## 2. Utility Functions

### Location: `src/utils/id.ts`

#### `generateId(): string`

```typescript
// Lines 5-11
export function generateId(): string {
  // Try crypto.randomUUID() (Node.js 19+)
  // Fall back to Date.now() + random string
}
```

**Pattern:** Graceful fallback for missing features

### Location: `src/utils/observable.ts`

#### `Observable<T>` class

```typescript
export class Observable<T> {
  // Event streaming with error isolation
  // subscribe() returns Subscription with unsubscribe()
}
```

**Pattern:** Error isolation in event handlers

### Location: `src/utils/error-strategy.ts`

#### `mergeWorkflowErrors()`

```typescript
// Lines 23-56
export function mergeWorkflowErrors(
  errors: WorkflowError[],
  strategy?: ErrorMergeStrategy
): WorkflowError
```

**Pattern:** Error aggregation utility with configurable strategy

---

## 3. Result/Wrapper Types in Codebase

### `PromptResult<T>` - `src/core/agent.ts` (Lines 31-40)

```typescript
export interface PromptResult<T> {
  data: T;           // Validated response data
  usage: TokenUsage; // Token usage from API
  duration: number;  // Total duration in milliseconds
  toolCalls: number; // Number of tool invocations
}
```

**Key Pattern:** Generic wrapper with `data` property + metadata

### `WorkflowResult<T>` - `src/core/workflow-context.ts` (Lines 154-163)

```typescript
export interface WorkflowResult<T> {
  data: T;
  node: WorkflowNode;
  duration: number;
}
```

**Key Pattern:** Similar structure - `data` + execution metadata

---

## 4. Error Handling Patterns

### Simple Error Throwing

```typescript
// Pattern throughout codebase
throw new Error('Descriptive message');
```

### WorkflowError Interface

```typescript
// src/types/error.ts
export interface WorkflowError {
  message: string;
  originalError?: unknown;
  workflowId: string;
  stack?: string;
  stateSnapshot?: SerializedWorkflowState;
  logs?: LogEntry[];
}
```

**Pattern:** Rich context captured for errors

---

## 5. Naming Conventions Summary

| Type | Convention | Examples |
|------|-----------|----------|
| Factory Functions | `createXxx` | `createWorkflow`, `createAgent`, `createPrompt` |
| Shorthand Factories | `quickXxx` | `quickWorkflow`, `quickAgent` |
| Type Guards | `isXxx` | `isAgent`, `isWorkflow` |
| Result Types | `XxxResult<T>` | `PromptResult<T>`, `WorkflowResult<T>` |
| Utilities | `verbNoun` | `generateId`, `mergeWorkflowErrors` |

---

## 6. Validation Patterns

### Delegated Validation

**Observation:** Factory functions do NOT validate - constructors do

```typescript
// Factory - NO validation
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);  // Constructor handles validation
}

// Constructor - HAS validation
constructor(config: AgentConfig = {}) {
  // Validation and setup here
  this.name = config.name ?? 'Agent';
  // ...
}
```

### Runtime Validation

```typescript
// Prompt validation using Zod
const validated = prompt.validateResponse(parsed);
```

---

## 7. Recommended Patterns for AgentResponse Factory

Based on codebase analysis, the implementation should follow:

### 7.1 Naming Convention

```typescript
// Primary factory functions
createSuccessResponse<T>(data, metadata): AgentResponse<T>
createErrorResponse(code, message, details?, recoverable?): AgentResponse<null>
createPartialResponse<T>(data): AgentResponse<T>

// Type guards
isSuccess<T>(response): response is SuccessResponse<T>
isError<T>(response): response is ErrorResponse
isPartial<T>(response): response is PartialResponse<T>
```

### 7.2 Parameter Ordering

**Pattern:** Data-first, metadata-last (follows functional programming)

```typescript
createSuccessResponse<T>(
  data: T,                    // Primary data first
  metadata: AgentResponseMetadata  // Metadata last
): AgentResponse<T>
```

### 7.3 Return Type Pattern

**Always explicit return types with proper generic constraints**

```typescript
function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  // Explicit return type
}
```

### 7.4 Error Handling

```typescript
// Include graceful fallbacks where appropriate
function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false  // Default value
): AgentErrorDetails {
  return {
    code,
    message,
    details: details ?? null,
    recoverable
  };
}
```

---

## 8. Files to Reference During Implementation

| File | Purpose | Lines |
|------|---------|-------|
| `src/core/factory.ts` | Factory patterns to follow | 35-123 |
| `src/core/agent.ts` | PromptResult pattern | 31-40 |
| `src/core/workflow-context.ts` | WorkflowResult pattern | 154-163 |
| `src/types/error.ts` | Error patterns | All |
| `src/utils/id.ts` | Utility function pattern | 5-11 |

---

## 9. Key Gotchas

1. **No validation in factories** - Delegates to constructors/Zod schemas
2. **Generic type preservation** - Must maintain `<T>` through the function
3. **Null vs undefined** - Codebase uses `null` for absent values
4. **Explicit return types** - Always specify return type, don't rely on inference
5. **Metadata-first structure** - Result types include metadata alongside data

---

## 10. Integration Points

### When creating factory functions, integrate with:

1. **`src/types/agent.ts`** - Where AgentResponse interface will be defined
2. **`src/types/index.ts`** - Where factory functions will be exported
3. **`src/core/agent.ts`** - Will use factory functions in `prompt()` method
4. **`src/__tests__/unit/agent.test.ts`** - Tests for factory functions

---

## Conclusion

The Groundswell codebase demonstrates consistent, well-structured patterns for factory functions. The AgentResponse factory functions should follow these established patterns:

- `create*` naming with generic type preservation
- Data-first, metadata-last parameter ordering
- Explicit return types
- Delegated validation (to Zod schemas in next milestone)
- Null for absent values (not undefined)

This ensures consistency with the existing codebase and maintains the architectural patterns already in use.

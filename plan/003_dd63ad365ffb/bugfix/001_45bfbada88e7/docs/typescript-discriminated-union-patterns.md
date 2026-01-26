# TypeScript Discriminated Union Patterns - Research Report

**Research Date:** 2026-01-26
**Focus:** Event system patterns and best practices for implementing new event types

---

## Executive Summary

This research document covers TypeScript discriminated union patterns, best practices, and their application in event systems. While web search was unavailable at the time of research, this document synthesizes best practices from the codebase analysis and TypeScript language fundamentals.

---

## Table of Contents

1. [Official TypeScript Documentation](#official-typescript-documentation)
2. [Discriminated Union Fundamentals](#discriminated-union-fundamentals)
3. [Type Narrowing and Type Guards](#type-narrowing-and-type-guards)
4. [Event System Patterns](#event-system-patterns)
5. [Best Practices](#best-practices)
6. [Common Pitfalls and Anti-Patterns](#common-pitfalls-and-anti-patterns)
7. [Implementing New Event Types](#implementing-new-event-types)
8. [Code Examples from Groundswell](#code-examples-from-groundswell)

---

## Official TypeScript Documentation

### Primary Documentation URLs

1. **TypeScript Handbook - Narrowing**
   - URL: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
   - Section: Discriminated Unions
   - Covers: How TypeScript uses discriminant properties for type narrowing

2. **TypeScript Handbook - Type Narrowing**
   - URL: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
   - Sections: Discriminated Unions, Using type predicates
   - Covers: Control flow analysis and type guards

3. **TypeScript Utility Types**
   - URL: https://www.typescriptlang.org/docs/handbook/utility-types.html
   - Section: Extract<T, U>
   - Covers: Extracting specific types from unions

4. **TypeScript in 5 Minutes**
   - URL: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html
   - Section: Discriminated Unions
   - Covers: Quick introduction to discriminated union syntax

---

## Discriminated Union Fundamentals

### Definition

A **discriminated union** (also called a **tagged union**) is a TypeScript pattern where:
1. A union type shares a common property with a literal type (the discriminant)
2. TypeScript uses this discriminant to narrow the union type in conditional blocks
3. Each variant can have different properties specific to that state

### Basic Structure

```typescript
// The discriminant property (e.g., 'type', 'kind', 'status') must be:
// - Present in all union members
// - A literal type (string literal, number literal, or boolean)

type State =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };
```

### Key Characteristics

1. **Discriminant Property**: Must be a literal type, not `string`
2. **Shared Property Name**: All members must have the same property name
3. **Type Narrowing**: TypeScript automatically narrows types in conditionals
4. **Exhaustive Checking**: Can enforce handling all cases with `never` type

---

## Type Narrowing and Type Guards

### Automatic Discriminant Narrowing

TypeScript automatically narrows types when checking discriminant properties:

```typescript
function handleEvent(event: WorkflowEvent) {
  // TypeScript knows 'event' is WorkflowEvent (union)
  if (event.type === 'stepStart') {
    // TypeScript narrows to { type: 'stepStart'; node: WorkflowNode; step: string }
    console.log(event.step);  // ✅ Type-safe
    console.log(event.node);   // ✅ Type-safe
    // console.log(event.duration); // ❌ Compile-time error
  }
}
```

### Switch Statement Narrowing

Switch statements provide exhaustive type narrowing:

```typescript
function handleStreamEvent(event: StreamEvent): string {
  switch (event.type) {
    case 'text_delta':
      return `Text: ${event.delta}`;  // ✅ delta exists
    case 'tool_call_start':
      return `Tool: ${event.name}`;   // ✅ name exists
    case 'error':
      return `Error: ${event.error.message}`; // ✅ error exists
    // TypeScript enforces handling all cases
    default:
      const _exhaustive: never = event;  // ✅ Exhaustive check
      return _exhaustive;
  }
}
```

### Type Predicates (User-Defined Type Guards)

Create reusable type guard functions using the `is` keyword:

```typescript
// From src/types/streaming.ts
export function isTextDeltaEvent(event: StreamEvent): event is Extract<StreamEvent, { type: 'text_delta' }> {
  return event.type === 'text_delta';
}

// Usage
if (isTextDeltaEvent(event)) {
  console.log(event.delta);  // ✅ TypeScript knows this is text_delta
  console.log(event.index);  // ✅ TypeScript knows index exists
}
```

### Extract Utility Type

Use `Extract<T, U>` to narrow to specific union members:

```typescript
type StepStartEvent = Extract<WorkflowEvent, { type: 'stepStart' }>;
// Result: { type: 'stepStart'; node: WorkflowNode; step: string }

type StepEvents = Extract<WorkflowEvent, { type: 'stepStart' | 'stepRetry' | 'stepEnd' }>;
// Result: Union of all three step events
```

**Best Practice:** Use `Extract` in function signatures for type safety:

```typescript
private handleStepStart(event: Extract<WorkflowEvent, { type: 'stepStart' }>): void {
  // Function signature guarantees event is stepStart
  console.log(event.step);  // ✅ Type-safe without additional checks
}
```

---

## Event System Patterns

### Pattern 1: Hierarchical Event Organization

Organize events by category using inline comments:

```typescript
// From src/types/events.ts
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }

  // Agent/Prompt events
  | { type: 'agentPromptStart'; agentId: string; agentName: string; promptId: string; node: WorkflowNode }
  | { type: 'agentPromptEnd'; agentId: string; agentName: string; promptId: string; node: WorkflowNode; duration: number; tokenUsage?: TokenUsage }

  // Tool events
  | { type: 'toolInvocation'; toolName: string; input: unknown; output: unknown; duration: number; node: WorkflowNode }

  // MCP events
  | { type: 'mcpEvent'; serverName: string; event: string; payload?: unknown; node: WorkflowNode }

  // Reflection events
  | { type: 'reflectionStart'; level: 'workflow' | 'agent' | 'prompt'; node: WorkflowNode }
  | { type: 'reflectionEnd'; level: 'workflow' | 'agent' | 'prompt'; success: boolean; node: WorkflowNode }

  // Cache events
  | { type: 'cacheHit'; key: string; node: WorkflowNode }
  | { type: 'cacheMiss'; key: string; node: WorkflowNode };
```

### Pattern 2: Discriminated Union with Object Discriminants

For complex event systems, use objects as discriminants:

```typescript
// From src/types/decorators.ts
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate (must be last)

// Runtime check pattern
function isErrorCriterionMatch(criteria: ErrorCriterion, error: WorkflowError): boolean {
  if (typeof criteria === 'function') {
    return criteria(error);
  } else if ('code' in criteria) {
    const errorCode = error.original?.code;
    if (typeof criteria.code === 'string') {
      return errorCode === criteria.code;
    } else {
      return criteria.code.test(errorCode);
    }
  } else if ('recoverable' in criteria) {
    return error.recoverable === criteria.recoverable;
  }
  return false;
}
```

### Pattern 3: Async Event Streams

Use discriminated unions with AsyncGenerator for streaming:

```typescript
// From src/types/streaming.ts
export interface AsyncStream<T> {
  stream: AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
  controller?: AbortController;
}

// Consumption pattern
for await (const event of streamResult.stream) {
  switch (event.type) {
    case 'text_delta':
      process.stdout.write(event.delta);
      break;
    case 'error':
      if (event.retryable) {
        // Retry logic
      }
      break;
  }
}
```

### Pattern 4: Event Handler Registry

Create type-safe event handler registries:

```typescript
type EventHandler<TEvent extends WorkflowEvent> = (event: TEvent) => void;

class EventBus {
  private handlers = new Map<string, EventHandler<WorkflowEvent>[]>();

  on<TType extends WorkflowEvent['type']>(
    eventType: TType,
    handler: EventHandler<Extract<WorkflowEvent, { type: TType }>>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler<WorkflowEvent>);
  }

  emit(event: WorkflowEvent): void {
    const handlers = this.handlers.get(event.type);
    handlers?.forEach(handler => handler(event));
  }
}
```

---

## Best Practices

### 1. Discriminant Property Naming

**DO:** Use descriptive, consistent discriminant names
```typescript
type Event =
  | { type: 'click' }    // ✅ Clear
  | { type: 'keydown' }; // ✅ Clear
```

**DON'T:** Use vague or inconsistent names
```typescript
type Event =
  | { kind: 'click' }    // ❌ Inconsistent with 'type'
  | { event: 'keydown' }; // ❌ Inconsistent
```

### 2. Literal Types, Not Strings

**DO:** Use string literals
```typescript
type State = { status: 'loading' } | { status: 'success' }; // ✅
```

**DON'T:** Use bare string type
```typescript
type State = { status: string }; // ❌ Not a discriminated union
```

### 3. Consistent Property Ordering

**DO:** Place discriminant first, then required properties
```typescript
type Event =
  | { type: 'click'; x: number; y: number; target: string } // ✅ Clear order
  | { type: 'keydown'; key: string; code: string; ctrlKey: boolean }; // ✅ Consistent
```

### 4. Exhaustive Checking

**DO:** Use `never` type for exhaustive checks
```typescript
function handleEvent(event: Event): void {
  switch (event.type) {
    case 'click':
      // handle click
      break;
    case 'keydown':
      // handle keydown
      break;
    default:
      const _exhaustive: never = event; // ✅ Compile-time safety
      break;
  }
}
```

### 5. Type Guards for Reusable Checks

**DO:** Create type guard functions for common checks
```typescript
// From src/types/streaming.ts
export function isToolCallEvent(
  event: StreamEvent
): event is Extract<StreamEvent, { type: 'tool_call_start' | 'tool_call_delta' | 'tool_call_done' }> {
  return event.type === 'tool_call_start' ||
         event.type === 'tool_call_delta' ||
         event.type === 'tool_call_done';
}
```

### 6. Use Extract for Handler Signatures

**DO:** Use `Extract` in function parameters
```typescript
private handleStepStart(
  event: Extract<WorkflowEvent, { type: 'stepStart' }>
): void {
  // TypeScript knows event.step exists without additional checks
  console.log(event.step); // ✅
}
```

### 7. Document with JSDoc Examples

**DO:** Include usage examples in JSDoc
```typescript
/**
 * Stream event types for LLM streaming responses
 *
 * Discriminated union for type-safe event handling during streaming.
 * Each event type has a unique `type` field for TypeScript narrowing.
 *
 * @example
 * ```ts
 * for await (const event of streamResult.stream) {
 *   switch (event.type) {
 *     case 'text_delta':
 *       console.log(event.delta); // Type-safe access to delta
 *       break;
 *     case 'tool_call_start':
 *       console.log(event.name); // Type-safe access to name
 *       break;
 *   }
 * }
 * ```
 */
export type StreamEvent = /* ... */;
```

---

## Common Pitfalls and Anti-Patterns

### Pitfall 1: Missing Discriminant in Some Variants

**Problem:** Incomplete union members break type narrowing
```typescript
// ❌ BAD - Missing discriminant
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown' }  // Missing properties
  | { type: 'scroll'; scrollTop: number };
```

**Solution:** Ensure all variants have discriminant
```typescript
// ✅ GOOD - All variants complete
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string; code: string }
  | { type: 'scroll'; scrollTop: number };
```

### Pitfall 2: Shared Property Names with Different Types

**Problem:** Same property name with incompatible types
```typescript
// ❌ BAD - 'value' has different types
type Result =
  | { status: 'success'; value: string }
  | { status: 'error'; value: Error }; // Confusing!
```

**Solution:** Use distinct property names
```typescript
// ✅ GOOD - Distinct names
type Result =
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };
```

### Pitfall 3: Forgetting Exhaustiveness Checks

**Problem:** Non-exhaustive switch statements miss new cases
```typescript
// ❌ BAD - Missing case
function handleEvent(event: Event): string {
  switch (event.type) {
    case 'click': return 'click';
    case 'keydown': return 'keydown';
    // Missing 'scroll' - no compile error!
  }
}
```

**Solution:** Add exhaustive check
```typescript
// ✅ GOOD - Exhaustive
function handleEvent(event: Event): string {
  switch (event.type) {
    case 'click': return 'click';
    case 'keydown': return 'keydown';
    case 'scroll': return 'scroll';
    default:
      const _exhaustive: never = event; // ✅ Catches missing cases
      return _exhaustive;
  }
}
```

### Pitfall 4: Function Discriminants Must Come Last

**Problem:** Function types in unions can break type narrowing
```typescript
// ❌ BAD - Function not last
type Criteria =
  | ((error: Error) => boolean)
  | { code: string }
  | { recoverable: boolean };

// TypeScript can't narrow properly in switch/if
```

**Solution:** Always place function types last
```typescript
// ✅ GOOD - Function last
type Criteria =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean);

// Check for function first
function matches(criteria: Criteria, error: Error): boolean {
  if (typeof criteria === 'function') {
    return criteria(error);
  } else if ('code' in criteria) {
    return error.message.includes(criteria.code);
  } else {
    return error.recoverable === criteria.recoverable;
  }
}
```

### Pitfall 5: Using `any` or `unknown` for Payloads

**Problem:** Losing type safety in event payloads
```typescript
// ❌ BAD - Type information lost
type Event = {
  type: string;
  payload: unknown;
};
```

**Solution:** Use discriminated union with specific payloads
```typescript
// ✅ GOOD - Type-safe payloads
type Event =
  | { type: 'click'; payload: { x: number; y: number } }
  | { type: 'keydown'; payload: { key: string; code: string } };
```

### Pitfall 6: Inconsistent Property Types Across Variants

**Problem:** Optional properties in some variants but not others
```typescript
// ❌ BAD - Inconsistent optionality
type Event =
  | { type: 'start'; timestamp: number }
  | { type: 'end'; timestamp?: number }; // Why optional?
```

**Solution:** Be explicit about optionality
```typescript
// ✅ GOOD - Clear intent
type Event =
  | { type: 'start'; timestamp: number }
  | { type: 'end'; timestamp: number | null }; // Explicitly nullable
```

---

## Implementing New Event Types

### Step-by-Step Guide

When adding a new event type to an existing discriminated union:

#### Step 1: Define the Event Type

Add to the appropriate section of the union:

```typescript
export type WorkflowEvent =
  // ... existing events ...

  // New section or existing section
  | { type: 'newEventType'; requiredProp: string; optionalProp?: number }
```

#### Step 2: Create Type Guards (Optional but Recommended)

```typescript
export function isNewEventType(
  event: WorkflowEvent
): event is Extract<WorkflowEvent, { type: 'newEventType' }> {
  return event.type === 'newEventType';
}
```

#### Step 3: Update Handler Signatures

```typescript
private handleNewEventType(
  event: Extract<WorkflowEvent, { type: 'newEventType' }>
): void {
  console.log(event.requiredProp); // Type-safe access
}
```

#### Step 4: Update Switch Statements

TypeScript will error on non-exhaustive switches:

```typescript
function handleEvent(event: WorkflowEvent): void {
  switch (event.type) {
    // ... existing cases ...
    case 'newEventType':
      // Handle new event
      console.log(event.requiredProp);
      break;
    default:
      const _exhaustive: never = event; // ✅ Catches missing cases
      break;
  }
}
```

#### Step 5: Document with Examples

```typescript
/**
 * New event type description
 *
 * @example
 * ```ts
 * const event: WorkflowEvent = {
 *   type: 'newEventType',
 *   requiredProp: 'value',
 *   optionalProp: 42
 * };
 *
 * if (isNewEventType(event)) {
 *   console.log(event.requiredProp); // Type-safe
 * }
 * ```
 */
```

### Implementation Checklist

- [ ] Added event type to discriminated union with literal type
- [ ] All required properties are present (no `any` or `unknown` without reason)
- [ ] Discriminant property is first and uses literal type
- [ ] Created type guard if event needs reusable narrowing
- [ ] Updated all switch statements with exhaustive checks
- [ ] Added JSDoc documentation with usage examples
- [ ] Verified TypeScript compilation with strict mode
- [ ] Added tests for event handling

---

## Code Examples from Groundswell

### Example 1: Stream Events (src/types/streaming.ts)

```typescript
/**
 * Stream event types for LLM streaming responses
 *
 * Discriminated union for type-safe event handling during streaming.
 * Each event type has a unique `type` field for TypeScript narrowing.
 */
export type StreamEvent =
  // Text content events
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'text_done'; text: string; index: number }

  // Tool/function call events
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'tool_call_delta'; id: string; input: Record<string, unknown> }
  | { type: 'tool_call_done'; id: string; result: unknown }

  // Metadata events
  | { type: 'metadata'; metadata: { requestId?: string; model?: string; provider: string } }

  // Usage events
  | { type: 'usage'; inputTokens: number; outputTokens: number; cacheTokens?: number }

  // Completion events
  | { type: 'done'; finishReason: 'stop' | 'length' | 'tool_calls' | 'error' }

  // Error events
  | { type: 'error'; error: Error; code?: string; retryable?: boolean };

/**
 * Type guard for text delta events
 */
export function isTextDeltaEvent(
  event: StreamEvent
): event is Extract<StreamEvent, { type: 'text_delta' }> {
  return event.type === 'text_delta';
}

/**
 * Type guard for tool call events
 */
export function isToolCallEvent(
  event: StreamEvent
): event is Extract<StreamEvent, { type: 'tool_call_start' | 'tool_call_delta' | 'tool_call_done' }> {
  return event.type === 'tool_call_start' ||
         event.type === 'tool_call_delta' ||
         event.type === 'tool_call_done';
}

/**
 * Type guard for error events
 */
export function isErrorEvent(
  event: StreamEvent
): event is Extract<StreamEvent, { type: 'error' }> {
  return event.type === 'error';
}
```

### Example 2: Error Criterion (src/types/decorators.ts)

```typescript
/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. By error code - exact string or regex match
 * 2. By recoverable flag - match recoverable/non-recoverable errors
 * 3. Custom predicate - function for complex matching logic
 *
 * @remarks
 * Function types must come last in the discriminated union for proper TypeScript type narrowing.
 * When checking criteria at runtime, always check `typeof criterion === 'function'` first.
 */
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code (string or regex)
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate function (must be last)
```

### Example 3: Workflow Events (src/types/events.ts)

See full example in [Event System Patterns](#pattern-1-hierarchical-event-organization) above.

---

## Specific Recommendations for Event Type Systems

### 1. Use Consistent Discriminant Names

Choose one convention and stick to it:
- `type` (most common for events)
- `kind` (common for state/state machines)
- `status` (common for lifecycle states)

### 2. Group Related Events

Use inline comments to group events by category:
```typescript
export type Event =
  // Lifecycle events
  | { type: 'start'; timestamp: number }
  | { type: 'end'; timestamp: number }

  // Data events
  | { type: 'data'; payload: unknown }
  | { type: 'error'; error: Error };
```

### 3. Provide Type Guards for Common Groups

Create type guards for event categories:
```typescript
function isLifecycleEvent(
  event: Event
): event is Extract<Event, { type: 'start' | 'end' }> {
  return event.type === 'start' || event.type === 'end';
}

function isErrorEvent(
  event: Event
): event is Extract<Event, { type: 'error' }> {
  return event.type === 'error';
}
```

### 4. Use Extract in Handler Registration

```typescript
class EventEmitter<T extends { type: string }> {
  on<K extends T['type']>(
    eventType: K,
    handler: (event: Extract<T, { type: K }>) => void
  ): void {
    // TypeScript knows handler receives correct event type
  }
}
```

### 5. Document Event Lifecycle

Include lifecycle information in JSDoc:
```typescript
/**
 * Step start event
 *
 * Emitted when a step begins execution. Always followed by a 'stepEnd' or 'stepRetry' event.
 * Will be followed by 'stepRetry' if retryable and maxRetries not exhausted.
 *
 * @see stepEnd - Emitted on successful completion
 * @see stepRetry - Emitted on retryable failure
 * @see error - Emitted on final failure
 */
export type StepStartEvent = { type: 'stepStart'; node: WorkflowNode; step: string };
```

---

## Advanced Patterns

### Pattern: Recursive Discriminated Unions

For tree structures or nested events:

```typescript
type TreeNode =
  | { type: 'leaf'; value: string }
  | { type: 'branch'; left: TreeNode; right: TreeNode };
```

### Pattern: Generic Discriminated Unions

For reusable event patterns:

```typescript
type Result<T, E> =
  | { type: 'success'; data: T }
  | { type: 'error'; error: E };

type ApiResult = Result<string, Error>;
```

### Pattern: Discriminated Union with Mapped Types

For event handler registries:

```typescript
type EventHandlers<T extends { type: string }> = {
  [K in T['type']]: (event: Extract<T, { type: K }>) => void;
};

type WorkflowEventHandlers = EventHandlers<WorkflowEvent>;
```

---

## Testing Discriminated Unions

### Test Strategy

1. **Test Type Guards**: Verify correct narrowing
2. **Test Exhaustive Switches**: Ensure all cases handled
3. **Test Event Construction**: Verify type safety
4. **Test Runtime Behavior**: Ensure correct dispatch

### Example Test

```typescript
describe('StreamEvent', () => {
  test('type guard narrows correctly', () => {
    const event: StreamEvent = { type: 'text_delta', delta: 'hello', index: 0 };

    if (isTextDeltaEvent(event)) {
      // TypeScript knows event.delta exists
      expect(event.delta).toBe('hello');
      expect(event.index).toBe(0);
      // TypeScript errors on non-existent properties
      // @ts-expect-error - Property 'name' does not exist
      expect(event.name).toBeUndefined();
    }
  });

  test('exhaustive switch handles all cases', () => {
    const events: StreamEvent[] = [
      { type: 'text_delta', delta: 'test', index: 0 },
      { type: 'done', finishReason: 'stop' },
      { type: 'error', error: new Error('test') }
    ];

    events.forEach(event => {
      let handled = false;
      switch (event.type) {
        case 'text_delta':
          handled = true;
          break;
        case 'done':
          handled = true;
          break;
        case 'error':
          handled = true;
          break;
        default:
          // TypeScript ensures this is never reached
          const _exhaustive: never = event;
          handled = false;
      }
      expect(handled).toBe(true);
    });
  });
});
```

---

## Compilation Verification

Enable strict TypeScript settings for maximum safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Summary

### Key Takeaways

1. **Use Literal Types**: Discriminants must be literal types, not `string`
2. **Consistent Naming**: Use the same property name across all variants
3. **Exhaustive Checks**: Use `never` type to ensure all cases are handled
4. **Type Guards**: Create reusable type guards with `Extract` utility type
5. **Document Patterns**: Include JSDoc examples for complex unions
6. **Function Last**: Place function types last in discriminated unions
7. **Avoid `any`**: Use specific types instead of `any` or `unknown`
8. **Test Narrowing**: Verify type guards and switch statements

### Quick Reference

```typescript
// Basic discriminated union
type Event = { type: 'A'; value: string } | { type: 'B'; count: number };

// Type guard
function isTypeA(event: Event): event is Extract<Event, { type: 'A' }> {
  return event.type === 'A';
}

// Handler with Extract
function handleA(event: Extract<Event, { type: 'A' }>) {
  console.log(event.value);
}

// Exhaustive switch
function handleEvent(event: Event): void {
  switch (event.type) {
    case 'A': console.log(event.value); break;
    case 'B': console.log(event.count); break;
    default: const _exhaustive: never = event;
  }
}
```

---

## Additional Resources

### TypeScript Documentation

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Type Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Type Declarations](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)

### Community Resources

- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/type-system/discriminated-unions)
- [Effective TypeScript](https://effectivetypescript.com/) - Book by Dan Vanderkam
- [TypeScript Evolution](https://github.com/Microsoft/TypeScript/blob/main/README.md)

### Related Patterns

- State Machines with Discriminated Unions
- Result Types (Either pattern)
- Command Pattern with Discriminated Unions
- Event Sourcing with Type-Safe Events

---

**End of Research Report**

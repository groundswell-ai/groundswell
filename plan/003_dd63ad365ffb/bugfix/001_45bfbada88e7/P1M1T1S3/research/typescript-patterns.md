# TypeScript Patterns: Discriminated Unions for Event Systems

## Executive Summary

This document provides comprehensive guidance on TypeScript discriminated union patterns, specifically tailored for implementing event type systems like the Groundswell `WorkflowEvent` union.

---

## 1. Discriminated Union Fundamentals

### 1.1 Definition

A **discriminated union** (also called **tagged union**) is a TypeScript pattern where:
1. A union type has a common property (the **discriminant**)
2. TypeScript uses the discriminant to narrow the type in conditional blocks
3. Each union variant has a unique literal value for the discriminant

### 1.2 Basic Structure

```typescript
// Define a discriminated union
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string; ctrlKey: boolean }
  | { type: 'scroll'; scrollTop: number };

// The 'type' field is the discriminant
// TypeScript uses it to narrow which properties are available
```

### 1.3 Type Narrowing

```typescript
function handleEvent(event: Event) {
  // Before narrowing: TypeScript only knows 'type' exists
  console.log(event.type);

  // After narrowing: TypeScript knows all properties
  if (event.type === 'click') {
    // TypeScript knows: type, x, y
    console.log(`Clicked at (${event.x}, ${event.y})`);
  } else if (event.type === 'keydown') {
    // TypeScript knows: type, key, ctrlKey
    console.log(`Pressed ${event.key} with Ctrl: ${event.ctrlKey}`);
  } else {
    // TypeScript knows: type, scrollTop
    console.log(`Scrolled to ${event.scrollTop}`);
  }
}
```

---

## 2. Discriminated Union Best Practices

### 2.1 Discriminant Field Naming

**✅ DO**: Use consistent naming across all variants
```typescript
type WorkflowEvent =
  | { type: 'stepStart'; /* ... */ }
  | { type: 'stepRetry'; /* ... */ }
  | { type: 'stepEnd'; /* ... */ };
```

**❌ DON'T**: Mix discriminant names
```typescript
type WorkflowEvent =
  | { type: 'stepStart'; /* ... */ }
  | { eventType: 'stepRetry'; /* ... */ }  // INCONSISTENT!
  | { kind: 'stepEnd'; /* ... */ };        // INCONSISTENT!
```

### 2.2 Discriminant Value Types

**✅ DO**: Use string literal types for discriminant values
```typescript
type Event =
  | { type: 'start'; /* ... */ }
  | { type: 'progress'; /* ... */ }
  | { type: 'complete'; /* ... */ };
```

**❌ DON'T**: Use loose types or enums (unless necessary)
```typescript
type Event =
  | { type: string; /* ... */ }  // TOO LOOSE!
  | { type: EventType.Start; /* ... */ };  // ENUM IS OVERKILL
```

### 2.3 Property Consistency

**✅ DO**: Keep shared properties consistent across variants
```typescript
type Event =
  | { type: 'start'; timestamp: number; data: string }
  | { type: 'progress'; timestamp: number; percent: number }
  | { type: 'complete'; timestamp: number; result: boolean };
// 'timestamp' is consistent across all variants
```

**❌ DON'T**: Change property types across variants
```typescript
type Event =
  | { type: 'start'; timestamp: number }
  | { type: 'progress'; timestamp: string }  // INCONSISTENT TYPE!
  | { type: 'complete'; time: number };      // INCONSISTENT NAME!
```

### 2.4 Multi-Line Formatting

**✅ DO**: Use multi-line format with pipe prefix for clarity
```typescript
export type WorkflowEvent =
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number };
```

**❌ DON'T**: Use single line for complex unions (hard to read)
```typescript
export type WorkflowEvent = { type: 'stepStart'; /* ... */ } | { type: 'stepRetry'; /* ... */ } | { type: 'stepEnd'; /* ... */ };
```

### 2.5 Exhaustive Checking

**✅ DO**: Use `never` type to ensure exhaustiveness
```typescript
function handleEvent(event: WorkflowEvent): string {
  switch (event.type) {
    case 'stepStart':
      return `Starting ${event.step}`;
    case 'stepRetry':
      return `Retrying ${event.step} (attempt ${event.retryCount})`;
    case 'stepEnd':
      return `Completed ${event.step} in ${event.duration}ms`;
    default:
      // TypeScript will error if any case is missing
      const _exhaustiveCheck: never = event;
      return _exhaustiveCheck;
  }
}
```

**❌ DON'T**: Skip the default case
```typescript
function handleEvent(event: WorkflowEvent): string {
  switch (event.type) {
    case 'stepStart':
      return `Starting ${event.step}`;
    case 'stepRetry':
      return `Retrying ${event.step}`;
    // Missing cases won't be caught by TypeScript!
  }
}
```

---

## 3. Type Guards and Predicates

### 3.1 User-Defined Type Guards

**Purpose**: Create reusable type checking functions

```typescript
// Type guard for stepRetry events
function isStepRetry(event: WorkflowEvent): event is Extract<WorkflowEvent, { type: 'stepRetry' }> {
  return event.type === 'stepRetry';
}

// Usage
const events: WorkflowEvent[] = getEvents();
const retryEvents = events.filter(isStepRetry);
// TypeScript knows retryEvents are stepRetry events
```

### 3.2 Extract Utility Type

**Purpose**: Extract a specific variant from a union

```typescript
// Extract the stepRetry variant
type StepRetryEvent = Extract<WorkflowEvent, { type: 'stepRetry' }>;

// StepRetryEvent is exactly:
// { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }

// Usage in function signatures
function handleRetry(event: StepRetryEvent) {
  console.log(`Retrying ${event.step}, attempt ${event.retryCount}`);
}
```

### 3.3 Type Guard Combinations

```typescript
// Multiple type guards
function isStepEvent(event: WorkflowEvent): event is Extract<WorkflowEvent, { type: 'stepStart' | 'stepRetry' | 'stepEnd' }> {
  return event.type === 'stepStart' || event.type === 'stepRetry' || event.type === 'stepEnd';
}

// Usage
if (isStepEvent(event)) {
  // TypeScript knows event has 'step' property
  console.log(`Step: ${event.step}`);
}
```

---

## 4. Event System Patterns

### 4.1 Hierarchical Event Organization

**Pattern**: Group related events with comments

```typescript
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }

  // Step lifecycle events
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number; error: WorkflowError }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }

  // Agent events
  | { type: 'agentPromptStart'; /* ... */ }
  | { type: 'agentPromptEnd'; /* ... */ };
```

### 4.2 Event Handler Registry

**Pattern**: Type-safe event handler mapping

```typescript
type EventHandler<T extends WorkflowEvent['type']> = (event: Extract<WorkflowEvent, { type: T }>) => void;

interface EventHandlers {
  stepStart: EventHandler<'stepStart'>;
  stepRetry: EventHandler<'stepRetry'>;
  stepEnd: EventHandler<'stepEnd'>;
  // ... other handlers
}

// Usage
const handlers: EventHandlers = {
  stepStart: (event) => console.log(`Starting ${event.step}`),
  stepRetry: (event) => console.log(`Retrying ${event.step}`),
  stepEnd: (event) => console.log(`Completed ${event.step}`),
};

function dispatchEvent(event: WorkflowEvent, handlers: EventHandlers) {
  const handler = handlers[event.type];
  handler(event as any); // Type assertion needed due to TypeScript limitations
}
```

### 4.3 Event Stream Pattern

**Pattern**: Async event streaming with discriminated unions

```typescript
async function* eventStream(workflow: Workflow): AsyncGenerator<WorkflowEvent> {
  const events: WorkflowEvent[] = [];

  workflow.addObserver({
    onLog: () => {},
    onEvent: (e) => events.push(e),
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  });

  await workflow.run();

  for (const event of events) {
    yield event;
  }
}

// Usage
for await (const event of eventStream(workflow)) {
  if (event.type === 'stepRetry') {
    console.log(`Retry detected for step: ${event.step}`);
  }
}
```

---

## 5. Common Pitfalls and Anti-Patterns

### 5.1 Missing Discriminant

**❌ ANTI-PATTERN**: Some variants lack the discriminant

```typescript
type Event =
  | { type: 'click'; x: number; y: number }
  | { x: number; y: number };  // NO TYPE FIELD!
  | { type: 'scroll'; scrollTop: number };
```

**Problem**: TypeScript cannot narrow the second variant

**✅ SOLUTION**: All variants must have the discriminant

```typescript
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'drag'; x: number; y: number }  // Added type field
  | { type: 'scroll'; scrollTop: number };
```

### 5.2 Shared Properties with Different Types

**❌ ANTI-PATTERN**: Same property name, different types

```typescript
type Event =
  | { type: 'data'; payload: string }
  | { type: 'data'; payload: number };  // Same discriminant value!
  | { type: 'error'; payload: Error };
```

**Problem**: TypeScript cannot distinguish between the two 'data' variants

**✅ SOLUTION**: Use unique discriminant values

```typescript
type Event =
  | { type: 'stringData'; payload: string }
  | { type: 'numberData'; payload: number }  // Unique discriminant
  | { type: 'error'; payload: Error };
```

### 5.3 Function Discriminants Not Last

**❌ ANTI-PATTERN**: Function discriminant in non-final position

```typescript
type Event =
  | { type: 'click'; handler: () => void; x: number; y: number }
  | { type: 'scroll'; handler: () => void; scrollTop: number };
```

**Problem**: Function properties can complicate type narrowing

**✅ SOLUTION**: Place function discriminants at the end

```typescript
type Event =
  | { type: 'click'; x: number; y: number; handler?: () => void }
  | { type: 'scroll'; scrollTop: number; handler?: () => void };
```

### 5.4 Using `any` or `unknown` for Payloads

**❌ ANTI-PATTERN**: Loose typing for flexibility

```typescript
type Event =
  | { type: 'data'; payload: any }  // Loses type safety
  | { type: 'error'; payload: unknown };  // Requires type guards everywhere
```

**✅ SOLUTION**: Use specific types or generics

```typescript
type Event<T> =
  | { type: 'data'; payload: T }
  | { type: 'error'; payload: Error };

// Or use union of specific types
type Event =
  | { type: 'stringData'; payload: string }
  | { type: 'numberData'; payload: number }
  | { type: 'objectData'; payload: Record<string, unknown> };
```

### 5.5 Forgetting Exhaustiveness Checks

**❌ ANTI-PATTERN**: Incomplete switch statements

```typescript
function handleEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'stepStart':
      console.log('Starting');
      break;
    case 'stepRetry':
      console.log('Retrying');
      break;
    // Missing cases for other event types!
  }
}
```

**✅ SOLUTION**: Add default case with `never` type

```typescript
function handleEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'stepStart':
      console.log('Starting');
      break;
    case 'stepRetry':
      console.log('Retrying');
      break;
    // ... other cases
    default:
      const _exhaustiveCheck: never = event;
      return _exhaustiveCheck;
  }
}
```

---

## 6. Advanced Patterns

### 6.1 Branded Types for Events

```typescript
// Brand events with unique identifiers
type StepStartEvent = { type: 'stepStart' } & WorkflowEvent & { __brand: 'StepStartEvent' };

// Use in type-safe APIs
function emitStepStart(event: StepStartEvent) {
  // Only stepStart events can be passed
}
```

### 6.2 Event Inheritance with Interfaces

```typescript
// Base event interface
interface BaseEvent {
  timestamp: number;
  source: string;
}

// Discriminated union with base properties
type Event = BaseEvent & (
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string }
  | { type: 'scroll'; scrollTop: number }
);

// All events have timestamp and source
function handleEvent(event: Event) {
  console.log(`Event at ${event.timestamp} from ${event.source}`);

  if (event.type === 'click') {
    console.log(`Clicked at (${event.x}, ${event.y})`);
  }
}
```

### 6.3 Recursive Event Types

```typescript
// Events can contain nested events
type NestedEvent =
  | { type: 'simple'; value: string }
  | { type: 'nested'; events: NestedEvent[] };

// Usage
const complexEvent: NestedEvent = {
  type: 'nested',
  events: [
    { type: 'simple', value: 'a' },
    { type: 'simple', value: 'b' }
  ]
};
```

### 6.4 Event Transformations

```typescript
// Transform events while preserving discriminant
type TransformedEvent<T extends WorkflowEvent> = T & {
  transformedAt: number;
  transformId: string;
};

// Usage
function transformEvent<T extends WorkflowEvent>(event: T): TransformedEvent<T> {
  return {
    ...event,
    transformedAt: Date.now(),
    transformId: generateId(),
  };
}
```

---

## 7. TypeScript Compiler Options

### 7.1 Required tsconfig Settings

```json
{
  "compilerOptions": {
    "strictNullChecks": true,      // Catch null/undefined errors
    "noImplicitAny": true,         // Prevent implicit any types
    "strictFunctionTypes": true,   // Strict function type checking
    "noUnusedLocals": true,        // Catch unused variables
    "noUnusedParameters": true,    // Catch unused parameters
    "exhaustiveSwitchCheck": true  // Enable exhaustiveness checks (if available)
  }
}
```

### 7.2 Type Checking Commands

```bash
# Check entire project
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/types/events.ts

# Check with strict settings
npx tsc --strict --noEmit

# Generate declaration files
npx tsc --declaration
```

---

## 8. JSDoc Documentation Patterns

### 8.1 Documenting Discriminated Unions

```typescript
/**
 * Workflow event discriminated union
 *
 * @remarks
 * All events have a `type` field that acts as the discriminant.
 * Use type narrowing to access event-specific properties.
 *
 * @example
 * ```typescript
 * function handleEvent(event: WorkflowEvent) {
 *   if (event.type === 'stepRetry') {
 *     console.log(`Retrying ${event.step}, attempt ${event.retryCount}`);
 *   }
 * }
 * ```
 */
export type WorkflowEvent =
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; step: string; retryCount: number }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number };
```

### 8.2 Documenting Event Variants

```typescript
/**
 * Step retry event
 *
 * @remarks
 * Emitted when a step fails and is being retried.
 * Contains retry count and error information.
 *
 * @example
 * ```typescript
 * if (event.type === 'stepRetry') {
 *   console.log(`Retry ${event.retryCount} for step: ${event.step}`);
 *   console.log(`Error: ${event.error.message}`);
 * }
 * ```
 */
| {
    type: 'stepRetry';
    node: WorkflowNode;
    step: string;
    retryCount: number;
    error: WorkflowError;
  }
```

---

## 9. Testing Discriminated Unions

### 9.1 Type narrowing tests

```typescript
it('should narrow type correctly', () => {
  const event: WorkflowEvent = { type: 'stepRetry', /* ... */ };

  if (event.type === 'stepRetry') {
    // TypeScript should know event has: node, step, retryCount, error
    expect(event.step).toBeDefined();
    expect(event.retryCount).toBeGreaterThan(0);
    expect(event.error).toBeDefined();
  }
});
```

### 9.2 Exhaustiveness tests

```typescript
it('should handle all event types', () => {
  const allEventTypes: WorkflowEvent['type'][] = [
    'stepStart',
    'stepRetry',
    'stepEnd',
    // ... all other types
  ];

  allEventTypes.forEach(eventType => {
    const event: WorkflowEvent = createEvent(eventType);
    expect(event.type).toBe(eventType);
  });
});
```

---

## 10. Quick Reference

### 10.1 Creating a Discriminated Union

```typescript
// 1. Define the union
type Event =
  | { type: 'A'; propA: string }
  | { type: 'B'; propB: number };

// 2. Use type narrowing
function handle(event: Event) {
  if (event.type === 'A') {
    // TypeScript knows: type, propA
  } else {
    // TypeScript knows: type, propB
  }
}
```

### 10.2 Extracting a Variant

```typescript
type VariantA = Extract<Event, { type: 'A' }>;
// Result: { type: 'A'; propA: string }
```

### 10.3 Creating a Type Guard

```typescript
function isVariantA(event: Event): event is Extract<Event, { type: 'A' }> {
  return event.type === 'A';
}
```

### 10.4 Exhaustive Switch

```typescript
function handle(event: Event): string {
  switch (event.type) {
    case 'A': return event.propA;
    case 'B': return String(event.propB);
    default: const _exhaustive: never = event; return _exhaustive;
  }
}
```

---

## 11. References

### Official TypeScript Documentation

- [TypeScript Handbook - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions)
- [TypeScript Handbook - Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)

### Community Resources

- [Basarat's TypeScript Deep Dive - Discriminated Unions](https://basarat.gitbook.io/typescript/type-system/discriminated-unions)
- [Marius Schulz - TypeScript Discriminated Union Types](https://mariusschulz.com/blog/typescript-discriminated-union-types)

### Groundswell Codebase Examples

- `src/types/events.ts` - Complete WorkflowEvent discriminated union
- `src/types/streaming.ts` - StreamEvent discriminated union with type guards
- `src/types/decorators.ts` - ErrorCriterion with function discriminant pattern

---

**Document Version**: 1.0
**Last Updated**: 2025-01-26
**Author**: PRP Research Agent
**Status**: Ready for PRP Generation

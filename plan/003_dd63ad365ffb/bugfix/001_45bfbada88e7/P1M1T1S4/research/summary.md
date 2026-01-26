# Research Summary: TypeScript Discriminated Union Patterns

**Research Date:** 2026-01-26
**Focus:** Discriminated unions, function types as last element, and best practices

---

## Research Objective

Investigate current best practices and documentation for TypeScript discriminated union patterns, with special focus on:
1. How to properly define discriminated unions
2. Type narrowing patterns with discriminated unions
3. **Function types as last element in discriminated unions** (critical constraint)
4. Best practices for discriminated union type definitions
5. Common pitfalls and how to avoid them

---

## Key Findings

### 1. Official TypeScript Documentation URLs

**Primary Documentation:**
- **TypeScript Handbook - Narrowing:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- **TypeScript Handbook - Creating Types:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
- **TypeScript Utility Types - Extract:** https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union
- **TypeScript Compiler Options:** https://www.typescriptlang.org/tsconfig

**Community Resources:**
- **TypeScript Deep Dive:** https://basarat.gitbook.io/typescript/type-system/discriminated-unions
- **Marius Schulz Blog:** https://mariusschulz.com/blog/typescript-discriminated-union-types
- **Effective TypeScript:** https://effectivetypescript.com/

---

## The Critical Rule: Function Types Must Be Last

### Why This Rule Exists

When a discriminated union includes a function type alongside object types with discriminant properties:

1. **Functions are objects** in JavaScript and can have properties
2. **Type guards** like `'prop' in value` return `true` for functions with that property
3. **Discriminant checking** becomes ambiguous when functions are mixed with objects
4. **TypeScript's control flow analysis** cannot distinguish between function types and object types with similar properties

### The Pattern

**❌ WRONG - Function Not Last:**

```typescript
type Criterion =
  | ((error: Error) => boolean)  // ❌ Breaks type narrowing
  | { code: string }
  | { recoverable: boolean };

function matches(criteria: Criterion, error: Error): boolean {
  // This check passes even for functions with a 'code' property!
  if ('code' in criteria) {
    return error.message.includes(criteria.code); // Potentially unsafe!
  }
  // ...
}
```

**✅ CORRECT - Function Last:**

```typescript
type Criterion =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean); // ✅ Function last

function matches(criteria: Criterion, error: Error): boolean {
  // Check for function FIRST
  if (typeof criteria === 'function') {
    return criteria(error);
  }
  // Now safe to use discriminant checks
  else if ('code' in criteria) {
    return error.message.includes(criteria.code);
  } else {
    return error.recoverable === criteria.recoverable;
  }
}
```

### Runtime Type Checking Pattern

When working with discriminated unions that include function types:

```typescript
function isErrorCriterionMatch(
  criteria: ErrorCriterion,
  error: WorkflowError
): boolean {
  // 1. Check for function FIRST (must be before discriminant checks)
  if (typeof criteria === 'function') {
    return criteria(error);
  }

  // 2. Now safe to use discriminant checks
  else if ('code' in criteria) {
    const errorCode = error.original?.code;
    if (typeof criteria.code === 'string') {
      return errorCode === criteria.code;
    } else {
      return criteria.code.test(errorCode || '');
    }
  }

  // 3. Final discriminant check
  else if ('recoverable' in criteria) {
    return error.recoverable === criteria.recoverable;
  }

  // 4. Exhaustive check
  else {
    const _exhaustiveCheck: never = criteria;
    return _exhaustiveCheck;
  }
}
```

---

## Discriminated Union Fundamentals

### Definition

A **discriminated union** (also called a **tagged union**) is a TypeScript pattern where:

1. A union type shares a common property with a literal type (the **discriminant**)
2. TypeScript uses this discriminant to narrow the union type in conditional blocks
3. Each variant can have different properties specific to that state
4. The discriminant property must be a **literal type** (not `string`, `number`, etc.)

### Basic Structure

```typescript
// The discriminant property must be:
// - Present in all union members
// - A literal type (string literal, number literal, or boolean)
// - Consistently named across all members

type State =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };
```

---

## Type Narrowing Patterns

### 1. Discriminant Property Narrowing

TypeScript automatically narrows types when checking discriminant properties:

```typescript
function handleEvent(event: WorkflowEvent) {
  if (event.type === 'stepStart') {
    // TypeScript knows: { type: 'stepStart'; node: WorkflowNode; step: string }
    console.log(event.step);  // ✅ Type-safe
    console.log(event.node);   // ✅ Type-safe
  }
}
```

### 2. Switch Statement Narrowing

```typescript
function handleStreamEvent(event: StreamEvent): string {
  switch (event.type) {
    case 'text_delta':
      return `Text: ${event.delta}`;
    case 'tool_call_start':
      return `Tool: ${event.name}`;
    case 'error':
      return `Error: ${event.error.message}`;
    default:
      const _exhaustive: never = event;  // ✅ Exhaustive check
      return _exhaustive;
  }
}
```

### 3. Type Predicates (User-Defined Type Guards)

```typescript
function isStepRetry(
  event: WorkflowEvent
): event is Extract<WorkflowEvent, { type: 'stepRetry' }> {
  return event.type === 'stepRetry';
}

// Usage
const retryEvents = events.filter(isStepRetry);
// TypeScript knows retryEvents are stepRetry events
```

### 4. Extract Utility Type

```typescript
// Extract a single variant
type StepStartEvent = Extract<WorkflowEvent, { type: 'stepStart' }>;

// Extract multiple variants
type StepEvents = Extract<WorkflowEvent, {
  type: 'stepStart' | 'stepRetry' | 'stepEnd'
}>;

// Use in function signatures
function handleStepStart(
  event: Extract<WorkflowEvent, { type: 'stepStart' }>
): void {
  console.log(event.step);  // ✅ Type-safe without additional checks
}
```

---

## Best Practices

### 1. Discriminant Property Naming

**✅ DO:** Use descriptive, consistent discriminant names

```typescript
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string; code: string };
```

**❌ DON'T:** Use vague or inconsistent names

```typescript
type Event =
  | { kind: 'click'; x: number; y: number }
  | { event: 'keydown'; key: string };
```

### 2. Literal Types, Not Strings

**✅ DO:** Use string literal types

```typescript
type State =
  | { status: 'loading' }
  | { status: 'success'; data: string };
```

**❌ DON'T:** Use bare string type

```typescript
type State = { status: string }; // ❌ Not a discriminated union
```

### 3. Exhaustive Checking

**✅ DO:** Use `never` type for exhaustive checks

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

### 4. Function Types Must Be Last

**✅ DO:** Place function types last

```typescript
type Criteria =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean); // ✅ Function last

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

**❌ DON'T:** Place function types first

```typescript
type Criteria =
  | ((error: Error) => boolean)  // ❌ Function not last
  | { code: string }
  | { recoverable: boolean };

function matches(criteria: Criteria, error: Error): boolean {
  // Type narrowing is unreliable!
  if ('code' in criteria) {
    // This might be a function with a 'code' property
    return error.message.includes(criteria.code);
  }
}
```

### 5. Type Guards for Reusable Checks

**✅ DO:** Create type guard functions

```typescript
function isToolCallEvent(
  event: StreamEvent
): event is Extract<StreamEvent, {
  type: 'tool_call_start' | 'tool_call_delta' | 'tool_call_done'
}> {
  return event.type === 'tool_call_start' ||
         event.type === 'tool_call_delta' ||
         event.type === 'tool_call_done';
}
```

### 6. Use Extract for Handler Signatures

**✅ DO:** Use `Extract` in function parameters

```typescript
function handleStepStart(
  event: Extract<WorkflowEvent, { type: 'stepStart' }>
): void {
  console.log(event.step); // ✅ Type-safe
}
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Missing Discriminant in Some Variants

**❌ BAD:**
```typescript
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown' }  // Missing properties
  | { type: 'scroll'; scrollTop: number };
```

**✅ GOOD:**
```typescript
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown'; key: string; code: string }
  | { type: 'scroll'; scrollTop: number };
```

### Pitfall 2: Shared Property Names with Different Types

**❌ BAD:**
```typescript
type Result =
  | { status: 'success'; value: string }
  | { status: 'error'; value: Error }; // Confusing!
```

**✅ GOOD:**
```typescript
type Result =
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };
```

### Pitfall 3: Forgetting Exhaustiveness Checks

**❌ BAD:**
```typescript
function handleEvent(event: Event): string {
  switch (event.type) {
    case 'click': return 'click';
    case 'keydown': return 'keydown';
    // Missing 'scroll' - no compile error!
  }
}
```

**✅ GOOD:**
```typescript
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

### Pitfall 4: Function Discriminants Not Last

**❌ BAD:**
```typescript
type Criteria =
  | ((error: Error) => boolean)
  | { code: string }
  | { recoverable: boolean };
```

**✅ GOOD:**
```typescript
type Criteria =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean);
```

### Pitfall 5: Using `any` or `unknown` for Payloads

**❌ BAD:**
```typescript
type Event = {
  type: string;  // Not a literal type!
  payload: unknown;
};
```

**✅ GOOD:**
```typescript
type Event =
  | { type: 'click'; payload: { x: number; y: number } }
  | { type: 'keydown'; payload: { key: string; code: string } };
```

---

## Groundswell Codebase Examples

### Example 1: ErrorCriterion (Function Type Last Pattern)

**File:** `/home/dustin/projects/groundswell/src/types/decorators.ts`

```typescript
/**
 * Error matching criterion for step restart decisions
 *
 * @remarks
 * Function types must come last in the discriminated union for proper
 * TypeScript type narrowing. When checking criteria at runtime, always
 * check `typeof criterion === 'function'` first.
 */
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate (MUST BE LAST)
```

### Example 2: StreamEvent with Type Guards

**File:** `/home/dustin/projects/groundswell/src/types/streaming.ts`

```typescript
export type StreamEvent =
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'error'; error: Error; code?: string; retryable?: boolean };

export function isTextDeltaEvent(
  event: StreamEvent
): event is Extract<StreamEvent, { type: 'text_delta' }> {
  return event.type === 'text_delta';
}
```

---

## Quick Reference

### Creating a Discriminated Union

```typescript
type Event =
  | { type: 'A'; propA: string }
  | { type: 'B'; propB: number };
```

### Type Guard

```typescript
function isVariantA(event: Event): event is Extract<Event, { type: 'A' }> {
  return event.type === 'A';
}
```

### Exhaustive Switch

```typescript
function handle(event: Event): string {
  switch (event.type) {
    case 'A': return event.propA;
    case 'B': return String(event.propB);
    default: const _exhaustive: never = event; return _exhaustive;
  }
}
```

### Function Type as Last Element

```typescript
type Criteria =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean); // ✅ Function last

function matches(criteria: Criteria, error: Error): boolean {
  if (typeof criteria === 'function') {  // ✅ Check function first
    return criteria(error);
  } else if ('code' in criteria) {
    return error.message.includes(criteria.code);
  } else {
    return error.recoverable === criteria.recoverable;
  }
}
```

---

## TypeScript Compiler Configuration

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Key Takeaways

1. **Use Literal Types:** Discriminants must be literal types (`'value'`), not `string`
2. **Consistent Naming:** Use the same property name across all variants
3. **Function Types Last:** Always place function types as the last element in discriminated unions
4. **Check Functions First:** When runtime checking, use `typeof value === 'function'` before discriminant checks
5. **Exhaustive Checks:** Use `never` type to ensure all cases are handled
6. **Type Guards:** Create reusable type guards with `Extract` utility type
7. **Document Patterns:** Include JSDoc examples for complex unions
8. **Avoid `any`:** Use specific types instead of `any` or `unknown`

---

## Research Files

- **Comprehensive Report:** `typescript-discriminated-unions-2026.md` (this directory)
- **Existing Research:** `../P1M1T1S3/research/typescript-patterns.md`
- **Groundswell Examples:** `/home/dustin/projects/groundswell/src/types/decorators.ts` (ErrorCriterion)

---

**Research Status:** Complete
**Last Updated:** 2026-01-26

# TypeScript Discriminated Union Patterns - Comprehensive Research 2026

**Research Date:** 2026-01-26
**Focus:** Current best practices, function types as last element, and avoiding common pitfalls
**Status:** Comprehensive research report with official documentation references

---

## Executive Summary

This document provides comprehensive research on TypeScript discriminated union patterns, with special focus on the constraint that **function types must be the last element in discriminated unions**. This pattern is critical for proper type narrowing and is used in the Groundswell codebase's `ErrorCriterion` type.

---

## Table of Contents

1. [Official TypeScript Documentation](#official-typescript-documentation)
2. [Discriminated Union Fundamentals](#discriminated-union-fundamentals)
3. [Function Types as Last Element - Deep Dive](#function-types-as-last-element---deep-dive)
4. [Type Narrowing Patterns](#type-narrowing-patterns)
5. [Best Practices](#best-practices)
6. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
7. [Groundswell Codebase Examples](#groundswell-codebase-examples)
8. [Quick Reference](#quick-reference)

---

## Official TypeScript Documentation

### Primary Documentation URLs

#### 1. TypeScript Handbook - Narrowing
- **URL:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- **Section:** Discriminated Unions
- **Covers:** How TypeScript uses discriminant properties for type narrowing
- **Key Topics:**
  - Discriminated unions basics
  - Type narrowing with discriminant properties
  - Control flow analysis
  - The `typeof` type guard
  - Truthiness narrowing
  - Equality narrowing

#### 2. TypeScript Handbook - Creating Types from Types
- **URL:** https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
- **Section:** Discriminated Unions
- **Covers:** Advanced patterns for creating discriminated unions
- **Key Topics:**
  - Discriminated union syntax
  - Union type composition
  - Intersection types
  - Type manipulation utilities

#### 3. TypeScript Handbook - Type Guards and Type Predicates
- **URL:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
- **Covers:** User-defined type guards with the `is` keyword
- **Key Topics:**
  - Type predicate syntax
  - Parameter type narrowing
  - Custom type guard functions
  - Type assertion functions

#### 4. TypeScript Utility Types - Extract
- **URL:** https://www.typescriptlang.org/docs/handbook/utility-types.html#extracttype-union
- **Covers:** Extracting specific types from unions
- **Key Topics:**
  - `Extract<T, U>` utility type
  - Narrowing union members
  - Type manipulation patterns

#### 5. TypeScript Release Notes
- **URL:** https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
- **Section:** Conditional Types
- **Covers:** Advanced conditional type patterns for discriminated unions

#### 6. TypeScript Compiler Options
- **URL:** https://www.typescriptlang.org/tsconfig
- **Covers:** Compiler settings for strict type checking
- **Key Options:**
  - `strict`: Enables all strict type checking options
  - `strictNullChecks`: Ensures null/undefined safety
  - `noImplicitAny`: Prevents implicit any types
  - `noFallthroughCasesInSwitch`: Ensures exhaustive switch statements

### Community Resources

#### 7. TypeScript Deep Dive - Discriminated Unions
- **URL:** https://basarat.gitbook.io/typescript/type-system/discriminated-unions
- **Author:** Basarat Ali Syed
- **Covers:** Comprehensive guide to discriminated union patterns
- **Key Topics:**
  - Discriminated union fundamentals
  - Real-world examples
  - Common patterns and anti-patterns

#### 8. Marius Schulz - TypeScript Discriminated Union Types
- **URL:** https://mariusschulz.com/blog/typescript-discriminated-union-types
- **Covers:** In-depth exploration of discriminated union syntax and patterns

#### 9. Effective TypeScript
- **URL:** https://effectivetypescript.com/
- **Author:** Dan Vanderkam
- **Book:** "Effective TypeScript" (O'Reilly)
- **Relevant Chapters:** Item 39 (Use function types as last element in discriminated unions)

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
// The discriminant property (e.g., 'type', 'kind', 'status') must be:
// - Present in all union members
// - A literal type (string literal, number literal, or boolean)
// - Consistently named across all members

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
5. **Function Types Last**: When including function types, they must come last

---

## Function Types as Last Element - Deep Dive

### The Critical Constraint

**Why must function types be last in discriminated unions?**

When a discriminated union includes a function type alongside object types with discriminant properties, TypeScript cannot reliably narrow the type based on property checks. This is because:

1. **Functions are objects** in JavaScript and can have properties
2. **Type guards** like `'prop' in value` return `true` for functions with that property
3. **Discriminant checking** becomes ambiguous when functions are mixed with objects
4. **Control flow analysis** cannot distinguish between function types and object types with similar properties

### The Problem: Function Not Last

```typescript
// ❌ PROBLEMATIC: Function type first
type Criterion =
  | ((error: Error) => boolean)
  | { code: string }
  | { recoverable: boolean };

function matches(criteria: Criterion, error: Error): boolean {
  // TypeScript cannot narrow properly here
  if ('code' in criteria) {
    // This check passes even for functions with a 'code' property!
    // Type narrowing is unreliable
    return error.message.includes(criteria.code);
  }
  // ...
}
```

**Why this fails:**
- Functions can have properties: `const fn = () => true; fn.code = 'ERROR';`
- The `'code' in criteria` check returns `true` for such functions
- TypeScript's control flow analysis cannot guarantee type safety
- Runtime behavior may not match compile-time expectations

### The Solution: Function Last

```typescript
// ✅ CORRECT: Function type last
type Criterion =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean);

function matches(criteria: Criterion, error: Error): boolean {
  // Check for function FIRST
  if (typeof criteria === 'function') {
    return criteria(error);
  }
  // Now TypeScript knows it's not a function
  else if ('code' in criteria) {
    return error.message.includes(criteria.code);
  }
  else {
    return error.recoverable === criteria.recoverable;
  }
}
```

**Why this works:**
- `typeof criteria === 'function'` is checked first
- Once we rule out function, object discriminant checks are safe
- TypeScript's control flow analysis properly narrows the type
- Runtime behavior matches compile-time expectations

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

### TypeScript Behavior Analysis

#### Case 1: Function Not Last

```typescript
type BadUnion =
  | ((x: number) => string)
  | { type: 'a'; value: number }
  | { type: 'b'; value: string };

function process(value: BadUnion): string {
  // TypeScript's type narrowing is unreliable here
  if ('type' in value) {
    // TypeScript thinks value is { type: 'a' } | { type: 'b' }
    // But functions can have 'type' property too!
    return value.type; // Potentially unsafe
  }
  // ...
}
```

#### Case 2: Function Last

```typescript
type GoodUnion =
  | { type: 'a'; value: number }
  | { type: 'b'; value: string }
  | ((x: number) => string);

function process(value: GoodUnion): string {
  // Check for function first
  if (typeof value === 'function') {
    return value(42); // Safe: TypeScript knows it's a function
  }

  // Now discriminant checks are safe
  if (value.type === 'a') {
    return String(value.value); // Safe: TypeScript knows value is number
  } else {
    return value.value; // Safe: TypeScript knows value is string
  }
}
```

### Best Practice Summary

**✅ DO:**
1. Always place function types last in discriminated unions
2. Check for function type first using `typeof value === 'function'`
3. Use discriminant checks only after ruling out function types
4. Use exhaustive checks with `never` type

**❌ DON'T:**
1. Place function types before object types with discriminants
2. Use property checks (`'prop' in value`) without ruling out functions first
3. Assume functions cannot have properties
4. Skip exhaustive checks

---

## Type Narrowing Patterns

### 1. Discriminant Property Narrowing

TypeScript automatically narrows types when checking discriminant properties:

```typescript
function handleEvent(event: WorkflowEvent) {
  // Before narrowing: event is WorkflowEvent (union type)
  console.log(event.type); // ✅ Works: 'type' exists in all variants

  // After narrowing: event is specific variant
  if (event.type === 'stepStart') {
    // TypeScript knows: { type: 'stepStart'; node: WorkflowNode; step: string }
    console.log(event.step);  // ✅ Type-safe
    console.log(event.node);   // ✅ Type-safe
    // console.log(event.duration); // ❌ Compile-time error
  }
}
```

### 2. Switch Statement Narrowing

Switch statements provide clean exhaustive type narrowing:

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

### 3. Type Predicates (User-Defined Type Guards)

Create reusable type guard functions using the `is` keyword:

```typescript
// Type guard for stepRetry events
function isStepRetry(
  event: WorkflowEvent
): event is Extract<WorkflowEvent, { type: 'stepRetry' }> {
  return event.type === 'stepRetry';
}

// Usage
const events: WorkflowEvent[] = getEvents();
const retryEvents = events.filter(isStepRetry);
// TypeScript knows retryEvents are stepRetry events
```

### 4. Extract Utility Type

Use `Extract<T, U>` to narrow to specific union members:

```typescript
// Extract a single variant
type StepStartEvent = Extract<WorkflowEvent, { type: 'stepStart' }>;
// Result: { type: 'stepStart'; node: WorkflowNode; step: string }

// Extract multiple variants
type StepEvents = Extract<WorkflowEvent, {
  type: 'stepStart' | 'stepRetry' | 'stepEnd'
}>;
// Result: Union of all three step events

// Use in function signatures for type safety
function handleStepStart(
  event: Extract<WorkflowEvent, { type: 'stepStart' }>
): void {
  // Function signature guarantees event is stepStart
  console.log(event.step);  // ✅ Type-safe without additional checks
}
```

### 5. Type Guard Combinations

```typescript
// Check for multiple event types
function isStepEvent(
  event: WorkflowEvent
): event is Extract<WorkflowEvent, {
  type: 'stepStart' | 'stepRetry' | 'stepEnd'
}> {
  return event.type === 'stepStart' ||
         event.type === 'stepRetry' ||
         event.type === 'stepEnd';
}

// Usage
if (isStepEvent(event)) {
  // TypeScript knows event has 'step' property
  console.log(`Step: ${event.step}`);
}
```

---

## Best Practices

### 1. Discriminant Property Naming

**✅ DO:** Use descriptive, consistent discriminant names

```typescript
type Event =
  | { type: 'click'; x: number; y: number }      // ✅ Clear
  | { type: 'keydown'; key: string; code: string }; // ✅ Clear
```

**❌ DON'T:** Use vague or inconsistent names

```typescript
type Event =
  | { kind: 'click'; x: number; y: number }    // ❌ Inconsistent with 'type'
  | { event: 'keydown'; key: string };         // ❌ Inconsistent
```

### 2. Literal Types, Not Strings

**✅ DO:** Use string literal types

```typescript
type State =
  | { status: 'loading' }   // ✅ Literal type
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };
```

**❌ DON'T:** Use bare string type

```typescript
type State = { status: string }; // ❌ Not a discriminated union
```

### 3. Consistent Property Ordering

**✅ DO:** Place discriminant first, then required properties

```typescript
type Event =
  | { type: 'click'; x: number; y: number; target: string }     // ✅ Clear order
  | { type: 'keydown'; key: string; code: string; ctrlKey: boolean }; // ✅ Consistent
```

### 4. Exhaustive Checking

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

**❌ DON'T:** Skip exhaustive checks

```typescript
function handleEvent(event: Event): void {
  switch (event.type) {
    case 'click':
      // handle click
      break;
    case 'keydown':
      // handle keydown
      break;
    // Missing cases won't be caught!
  }
}
```

### 5. Function Types Must Be Last

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
  // ...
}
```

### 6. Type Guards for Reusable Checks

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

// Usage
if (isToolCallEvent(event)) {
  // TypeScript knows event is a tool call event
  console.log(`Tool: ${event.name || event.id}`);
}
```

### 7. Use Extract for Handler Signatures

**✅ DO:** Use `Extract` in function parameters

```typescript
function handleStepStart(
  event: Extract<WorkflowEvent, { type: 'stepStart' }>
): void {
  // TypeScript knows event.step exists without additional checks
  console.log(event.step); // ✅
}
```

### 8. Document with JSDoc Examples

**✅ DO:** Include usage examples in JSDoc

```typescript
/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. By error code - exact string or regex match
 * 2. By recoverable flag - match recoverable/non-recoverable errors
 * 3. Custom predicate - function for complex matching logic
 *
 * @example Match by error code
 * ```ts
 * const criterion: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };
 * ```
 *
 * @example Custom predicate
 * ```ts
 * const criterion: ErrorCriterion = (error) =>
 *   error.message.includes('temporary') || error.code === 'TIMEOUT';
 * ```
 *
 * @remarks
 * Function types must come last in the discriminated union for proper
 * TypeScript type narrowing. When checking criteria at runtime, always
 * check `typeof criterion === 'function'` first.
 */
export type ErrorCriterion =
  | { code: string | RegExp }
  | { recoverable: boolean }
  | ((error: WorkflowError) => boolean);
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Missing Discriminant in Some Variants

**Problem:** Incomplete union members break type narrowing

```typescript
// ❌ BAD - Missing discriminant or incomplete types
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'keydown' }  // Missing properties
  | { type: 'scroll'; scrollTop: number };
```

**Solution:** Ensure all variants have discriminant and complete properties

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

### Pitfall 4: Function Discriminants Not Last

**Problem:** Function types in unions break type narrowing

```typescript
// ❌ BAD - Function not last
type Criteria =
  | ((error: Error) => boolean)
  | { code: string }
  | { recoverable: boolean };

function matches(criteria: Criteria, error: Error): boolean {
  // TypeScript can't narrow properly in switch/if
  if ('code' in criteria) {
    // This might be a function with a 'code' property!
    return error.message.includes(criteria.code);
  }
  // ...
}
```

**Solution:** Always place function types last

```typescript
// ✅ GOOD - Function last
type Criteria =
  | { code: string }
  | { recoverable: boolean }
  | ((error: Error) => boolean);

function matches(criteria: Criteria, error: Error): boolean {
  // Check for function first
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
  type: string;  // Not a literal type!
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

### Pitfall 7: Using String Instead of String Literals

**Problem:** Discriminant is not a literal type

```typescript
// ❌ BAD - 'type' is not a literal type
type Event = {
  type: string;  // This is NOT a discriminated union!
  data: unknown;
};
```

**Solution:** Use string literal types

```typescript
// ✅ GOOD - 'type' is a literal type
type Event =
  | { type: 'start'; data: string }
  | { type: 'end'; result: boolean };
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

**Runtime Implementation Pattern:**

```typescript
function isErrorCriterionMatch(
  criteria: ErrorCriterion,
  error: WorkflowError
): boolean {
  // 1. Check for function FIRST (critical!)
  if (typeof criteria === 'function') {
    return criteria(error);
  }

  // 2. Safe to use discriminant checks now
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

### Example 2: StreamEvent with Type Guards

**File:** `/home/dustin/projects/groundswell/src/types/streaming.ts`

```typescript
/**
 * Stream event types for LLM streaming responses
 */
export type StreamEvent =
  // Text content events
  | { type: 'text_delta'; delta: string; index: number }
  | { type: 'text_done'; text: string; index: number }

  // Tool/function call events
  | { type: 'tool_call_start'; id: string; name: string; index: number }
  | { type: 'tool_call_delta'; id: string; input: Record<string, unknown> }
  | { type: 'tool_call_done'; id: string; result: unknown }

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
): event is Extract<StreamEvent, {
  type: 'tool_call_start' | 'tool_call_delta' | 'tool_call_done'
}> {
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

### Example 3: WorkflowEvent Hierarchical Organization

**File:** `/home/dustin/projects/groundswell/src/types/events.ts`

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

---

## Quick Reference

### Creating a Discriminated Union

```typescript
// 1. Define the union with literal discriminant
type Event =
  | { type: 'A'; propA: string }
  | { type: 'B'; propB: number };

// 2. Use type narrowing
function handle(event: Event) {
  if (event.type === 'A') {
    // TypeScript knows: type, propA
    console.log(event.propA);
  } else {
    // TypeScript knows: type, propB
    console.log(event.propB);
  }
}
```

### Extracting a Variant

```typescript
type VariantA = Extract<Event, { type: 'A' }>;
// Result: { type: 'A'; propA: string }
```

### Creating a Type Guard

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
    default:
      const _exhaustive: never = event;
      return _exhaustive;
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

### Recommended tsconfig.json Settings

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

### Type Checking Commands

```bash
# Check entire project
npx tsc --noEmit

# Check with strict settings
npx tsc --strict --noEmit

# Check specific file
npx tsc --noEmit src/types/events.ts

# Generate declaration files
npx tsc --declaration
```

---

## Summary

### Key Takeaways

1. **Use Literal Types:** Discriminants must be literal types (`'value'`), not `string`
2. **Consistent Naming:** Use the same property name across all variants
3. **Function Types Last:** Always place function types as the last element in discriminated unions
4. **Check Functions First:** When runtime checking, use `typeof value === 'function'` before discriminant checks
5. **Exhaustive Checks:** Use `never` type to ensure all cases are handled
6. **Type Guards:** Create reusable type guards with `Extract` utility type
7. **Document Patterns:** Include JSDoc examples for complex unions
8. **Avoid `any`:** Use specific types instead of `any` or `unknown`

### The "Function Types Last" Rule

**Why it's critical:**
- Functions can have properties in JavaScript
- Property checks (`'prop' in value`) return `true` for functions with that property
- TypeScript cannot reliably narrow types when functions are mixed with objects
- Runtime behavior may not match compile-time expectations

**The pattern:**
1. Place function types last in the union
2. Check for function type first using `typeof value === 'function'`
3. Use discriminant checks only after ruling out functions
4. Use exhaustive checks to catch all cases

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Comprehensive research report ready for use

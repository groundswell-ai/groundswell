# TypeScript Compiler Best Practices & Common Error Fixing Strategies

**Date**: 2026-01-24
**Context**: P1.M4.T2.S1 - TypeScript Compiler Research
**Focus**: Discriminated Unions, Generic Types, and AgentResponse<T> Patterns
**Researcher**: Claude Code Agent

---

## Table of Contents

1. [TypeScript Compiler Errors](#1-typescript-compiler-errors)
2. [Best Practices](#2-best-practices)
3. [Essential Documentation URLs](#3-essential-documentation-urls)
4. [Error Fixing Strategies](#4-error-fixing-strategies)
5. [AgentResponse<T> Specific Patterns](#5-agentresponset-specific-patterns)
6. [Quick Reference](#6-quick-reference)

---

## 1. TypeScript Compiler Errors

### 1.1 Discriminated Union Errors

#### Error: Accessing Properties Without Narrowing

**Error Message:**
```
TS2339: Property 'data' does not exist on type 'AgentResponse<string>'.
  Property 'data' does not exist on type 'ErrorResponse'.
```

**Cause:** Accessing properties that vary across union members without narrowing the type first.

**Bad Pattern:**
```typescript
function processResponse(response: AgentResponse<string>) {
  // ❌ ERROR: TypeScript doesn't know which variant
  console.log(response.data);  // data could be string | null

  // ❌ ERROR: TypeScript knows error might be null
  console.log(response.error.message);  // Object is possibly 'null'
}
```

**Fix - Method 1: Direct Discriminant Check**
```typescript
function processResponse(response: AgentResponse<string>) {
  // ✅ GOOD: Check the discriminant property
  if (response.status === 'success') {
    // TypeScript narrows to SuccessResponse<string>
    // response.data is string (not null)
    // response.error is null
    console.log(response.data.toUpperCase());
  }

  if (response.status === 'error') {
    // TypeScript narrows to ErrorResponse
    // response.data is null
    // response.error is AgentErrorDetails (not null)
    console.log(response.error.code);
  }
}
```

**Fix - Method 2: Type Guard Function**
```typescript
function processResponse(response: AgentResponse<string>) {
  // ✅ GOOD: Use type guard function
  if (isSuccess(response)) {
    // response is narrowed to SuccessResponse<string>
    console.log(response.data.toUpperCase());
    return response.data;
  }

  if (isError(response)) {
    // response is narrowed to ErrorResponse
    throw new Error(response.error.message);
  }
}
```

#### Error: Missing Exhaustiveness Checks

**Error Message:**
```
TS2366: Type 'ErrorResponse' is not assignable to type 'never'.
```

**Cause:** Not handling all union members in a switch statement.

**Bad Pattern:**
```typescript
function handleResponse(response: AgentResponse<string>): string {
  // ❌ ERROR: Not all cases handled
  switch (response.status) {
    case 'success':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    // Missing 'partial' case!
  }
}
```

**Fix - Exhaustive Switch:**
```typescript
function handleResponse(response: AgentResponse<string>): string {
  switch (response.status) {
    case 'success':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    case 'partial':
      return 'Partial: ' + response.data;
    default:
      // ✅ GOOD: TypeScript ensures exhaustiveness
      const _exhaustiveCheck: never = response;
      return _exhaustiveCheck;
  }
}
```

**Fix - Assert Never Function:**
```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

function handleResponse(response: AgentResponse<string>): string {
  switch (response.status) {
    case 'success':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    case 'partial':
      return response.data;
    default:
      // ✅ GOOD: Compile-time check for missing cases
      return assertNever(response);
  }
}
```

---

### 1.2 Generic Type Parameter Inference Failures

#### Error: Type Argument Cannot Be Inferred

**Error Message:**
```
TS2345: Argument of type 'string' is not assignable to parameter of type 'T'.
  Type 'T' could not be inferred from usage.
```

**Cause:** TypeScript cannot infer the generic type from the function call.

**Bad Pattern:**
```typescript
// ❌ ERROR: Cannot infer T
function wrapData<T>() {
  return { data: null as T | null };
}

const result = wrapData();  // What is T?
```

**Fix - Provide Explicit Type Argument:**
```typescript
function wrapData<T>() {
  return { data: null as T | null };
}

// ✅ GOOD: Explicit type parameter
const result = wrapData<string>();
```

**Fix - Use Default Type Parameter:**
```typescript
// ✅ GOOD: Default type parameter
function wrapData<T = unknown>() {
  return { data: null as T | null };
}

const result = wrapData();  // T is unknown
const specific = wrapData<string>();  // T is string
```

**Fix - Inference from Parameter:**
```typescript
// ✅ GOOD: Type inferred from parameter
function wrapData<T>(data: T) {
  return { data };
}

const result = wrapData('hello');  // T inferred as string
```

#### Error: Partial Type Inference

**Error Message:**
```
TS2314: Generic type 'Response<T, U>' requires 2 type argument(s).
```

**Cause:** Some types can be inferred but others cannot.

**Bad Pattern:**
```typescript
function createResponse<T, U>(data: T, error: U): { data: T; error: U } {
  return { data, error };
}

// ❌ ERROR: Must specify both T and U
const result = createResponse<string>({ code: 'ERROR' });
```

**Fix - Type Parameter Inference Guides (TypeScript 4.7+):**
```typescript
// ✅ GOOD: Use inference helper
type FirstType<T> = T extends { data: infer F } ? F : never;

function createResponse<T, U>(data: T, error: U): { data: T; error: U } {
  return { data, error };
}

// Specify all or none
const result1 = createResponse('hello', { code: 'ERROR' });  // Both inferred
const result2 = createResponse<string, { code: string }>('hello', { code: 'ERROR' });  // Both explicit
```

---

### 1.3 Missing Type Annotations on Return Values

#### Error: Implicit Any Return Type

**Error Message:**
```
TS7010: Return type annotation not found for function.
  OR (with noImplicitAny)
TS7005: Function implicitly has return type 'any'.
```

**Cause:** Missing return type annotation with strict mode enabled.

**Bad Pattern:**
```typescript
// ❌ ERROR: No return type annotation
function createResponse() {
  return {
    status: 'success',
    data: 'test',
    error: null
  };
}
```

**Fix - Explicit Return Type:**
```typescript
// ✅ GOOD: Explicit return type
function createResponse(): AgentResponse<string> {
  return {
    status: 'success',
    data: 'test',
    error: null,
    metadata: {
      agentId: 'test',
      timestamp: Date.now()
    }
  };
}
```

**Fix - Type Inference from Return:**
```typescript
// ✅ GOOD: Let TypeScript infer from return
const createResponse = (): AgentResponse<string> => ({
  status: 'success',
  data: 'test',
  error: null,
  metadata: {
    agentId: 'test',
    timestamp: Date.now()
  }
});
```

---

### 1.4 Type 'undefined is not assignable to type' Errors

#### Error: Undefined Not Assignable to Null

**Error Message:**
```
TS2345: Argument of type 'undefined' is not assignable to parameter of type 'AgentResponse<unknown>'.
  Type 'undefined' is not assignable to type '{ status: ...; data: ...; error: ...; metadata: ... }'.
```

**Cause:** Using `undefined` where `null` is expected (PRD 6.4.4 compliance).

**Bad Pattern:**
```typescript
// ❌ ERROR: undefined is not null
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: undefined,  // WRONG
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Fix - Use Null Instead of Undefined:**
```typescript
// ✅ GOOD: Use null (PRD 6.4.4 compliant)
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,  // CORRECT
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Fix - Nullish Coalescing:**
```typescript
function createResponse(error?: AgentErrorDetails | null): AgentResponse<string> {
  return {
    status: error ? 'error' : 'success',
    data: 'test',
    // ✅ GOOD: Coalesce undefined to null
    error: error ?? null,
    metadata: { agentId: 'test', timestamp: Date.now() }
  };
}
```

#### Error: Optional Properties and Undefined

**Error Message:**
```
TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

**Cause:** Optional property access might return `undefined`.

**Bad Pattern:**
```typescript
interface Metadata {
  duration?: number;
}

function getDuration(meta: Metadata): number {
  // ❌ ERROR: Could be undefined
  return meta.duration;
}
```

**Fix - Nullish Coalescing:**
```typescript
function getDuration(meta: Metadata): number {
  // ✅ GOOD: Provide default value
  return meta.duration ?? 0;
}
```

**Fix - Optional Chaining with Coalescing:**
```typescript
function getDuration(meta?: Metadata): number {
  // ✅ GOOD: Handle undefined metadata
  return meta?.duration ?? 0;
}
```

---

### 1.5 Property Access on Possibly-Undefined Values

#### Error: Object is Possibly 'null' or 'undefined'

**Error Message:**
```
TS2531: Object is possibly 'null'.
TS2532: Object is possibly 'undefined'.
TS2533: Object is possibly 'null' or 'undefined'.
```

**Cause:** Accessing properties on values that might be null/undefined.

**Bad Pattern:**
```typescript
function processData(response: AgentResponse<string>) {
  // ❌ ERROR: response.data could be null
  console.log(response.data.length);

  // ❌ ERROR: response.error could be null
  console.log(response.error.message);
}
```

**Fix - Type Narrowing:**
```typescript
function processData(response: AgentResponse<string>) {
  // ✅ GOOD: Narrow type first
  if (isSuccess(response)) {
    // TypeScript knows response.data is string (not null)
    console.log(response.data.length);
  }

  if (isError(response)) {
    // TypeScript knows response.error is AgentErrorDetails (not null)
    console.log(response.error.message);
  }
}
```

**Fix - Optional Chaining:**
```typescript
function getErrorMessage(response: AgentResponse<string>): string {
  // ✅ GOOD: Use optional chaining
  return response.error?.message ?? 'No error';
}
```

**Fix - Non-Null Assertion (Use Sparingly):**
```typescript
function processData(response: SuccessResponse<string>) {
  // ✅ OK: Already narrowed, but can be explicit
  console.log(response.data!.length);  // Not recommended if already narrowed
}
```

---

### 1.6 Strict Null Checks Errors

#### Error: Null/Undefined Not Assigned to Expected Type

**Error Message:**
```
TS2345: Argument of type 'null' is not assignable to parameter of type 'string'.
```

**Cause:** `strictNullChecks` enabled, treating null as distinct type.

**Bad Pattern:**
```typescript
function printMessage(msg: string) {
  console.log(msg);
}

// ❌ ERROR: null is not string
printMessage(null);
```

**Fix - Union Type:**
```typescript
function printMessage(msg: string | null) {
  console.log(msg ?? 'No message');
}

printMessage(null);  // ✅ GOOD
```

**Fix - Type Guard:**
```typescript
function printMessage(msg: string | null) {
  if (msg !== null) {
    // TypeScript knows msg is string here
    console.log(msg.toUpperCase());
  }
}
```

---

## 2. Best Practices

### 2.1 TypeScript Strict Mode Requirements

**Location in tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    // Strict mode enables:
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "strictBindCallApply": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

**Best Practices for Strict Mode:**

1. **Enable All Strict Options:**
   ```json
   {
     "compilerOptions": {
       "strict": true,  // Enables all strict options
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```

2. **Handle Null Explicitly:**
   ```typescript
   // ✅ GOOD: Explicit null handling
   function getData(): Data | null {
     return null;
   }

   const data = getData();
   if (data !== null) {
     // Safe to use data
   }
   ```

3. **Initialize Class Properties:**
   ```typescript
   class Agent {
     // ✅ GOOD: Explicit initialization
     private id: string = 'default';

     // ✅ GOOD: Definitely assigned assertion
     private status!: string;

     // ✅ GOOD: Constructor initialization
     private config: AgentConfig;

     constructor(config: AgentConfig) {
       this.config = config;
     }
   }
   ```

---

### 2.2 Proper Discriminated Union Usage Patterns

#### Pattern 1: Common Discriminant Property

**Good Pattern:**
```typescript
type AgentResponse<T> =
  | { status: 'success'; data: T; error: null; metadata: AgentResponseMetadata }
  | { status: 'error'; data: null; error: AgentErrorDetails; metadata: AgentResponseMetadata }
  | { status: 'partial'; data: T; error: null; metadata: AgentResponseMetadata };
```

**Key Principles:**
- Single discriminant property (`status`)
- Literal types for discriminant values
- Mutually exclusive properties (data vs error)

#### Pattern 2: Type Guard Functions

**Good Pattern:**
```typescript
// ✅ GOOD: Type predicate for narrowing
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}

// Usage
function process(response: AgentResponse<string>) {
  if (isSuccess(response)) {
    // TypeScript knows: response.data is string (not null)
    // TypeScript knows: response.error is null
    return response.data;
  }

  if (isError(response)) {
    // TypeScript knows: response.error is AgentErrorDetails (not null)
    // TypeScript knows: response.data is null
    throw new Error(response.error.message);
  }
}
```

#### Pattern 3: Exhaustive Matching

**Good Pattern:**
```typescript
function handleResponse<T>(response: AgentResponse<T>): T {
  switch (response.status) {
    case 'success':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    case 'partial':
      return response.data;
    default:
      // ✅ Compile-time check for missing cases
      const _exhaustive: never = response;
      return _exhaustive;
  }
}
```

#### Pattern 4: Discriminated Union with Generic Factory

**Good Pattern:**
```typescript
// ✅ GOOD: Generic factory function
function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata
  };
}

// Type inference works
const response = createSuccessResponse(
  { result: 'test' },
  { agentId: 'test', timestamp: Date.now() }
);
// response is AgentResponse<{ result: string }>
```

---

### 2.3 Type Guard Best Practices

#### Pattern 1: User-Defined Type Guards

**Good Pattern:**
```typescript
// ✅ GOOD: Type predicate (parameterName is Type)
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Usage
function process(value: unknown) {
  if (isString(value)) {
    // TypeScript knows value is string
    console.log(value.toUpperCase());
  }
}
```

#### Pattern 2: Assertion Functions (TypeScript 3.7+)

**Good Pattern:**
```typescript
// ✅ GOOD: Assertion function for validation
function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
}

// Usage
function process(response: AgentResponse<string>) {
  assertDefined(response.data, 'Data must be defined');
  // TypeScript knows response.data is string (not null)
  console.log(response.data.toUpperCase());
}
```

#### Pattern 3: Discriminant Type Guards

**Good Pattern:**
```typescript
// ✅ GOOD: Check discriminant property
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

// ✅ GOOD: Multiple discriminant checks
function isNotError<T>(response: AgentResponse<T>): response is SuccessResponse<T> | PartialResponse<T> {
  return response.status !== 'error';
}
```

#### Pattern 4: Type Guard Composition

**Good Pattern:**
```typescript
// ✅ GOOD: Compose type guards
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

// Combine guards
function hasValidData<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return isSuccess(response) && isDefined(response.data);
}
```

---

### 2.4 Type Narrowing Best Practices

#### Pattern 1: Discriminant Narrowing

**Good Pattern:**
```typescript
function process(response: AgentResponse<string>) {
  // ✅ GOOD: Narrow by discriminant
  if (response.status === 'success') {
    // TypeScript narrows to SuccessResponse<string>
    console.log(response.data);  // string (not null)
  }
}
```

#### Pattern 2: Truthiness Narrowing

**Good Pattern:**
```typescript
function process(value: string | null | undefined) {
  // ✅ GOOD: Truthiness check narrows to string
  if (value) {
    // TypeScript knows value is string
    console.log(value.toUpperCase());
  }
}
```

#### Pattern 3: Equality Narrowing

**Good Pattern:**
```typescript
function process(value: string | number) {
  // ✅ GOOD: Equality check narrows type
  if (value === 'special') {
    // TypeScript knows value is string
    console.log(value.toUpperCase());
  }
}
```

#### Pattern 4: instanceof Narrowing

**Good Pattern:**
```typescript
function process(error: unknown) {
  // ✅ GOOD: instanceof narrows to specific class
  if (error instanceof Error) {
    console.log(error.message);  // TypeScript knows error is Error
  }
}
```

#### Pattern 5: in Operator Narrowing

**Good Pattern:**
```typescript
function process(value: { success: boolean } | { error: string }) {
  // ✅ GOOD: 'in' operator narrows type
  if ('success' in value) {
    console.log(value.success);  // TypeScript knows this property exists
  } else {
    console.log(value.error);
  }
}
```

---

### 2.5 tsc --noEmit for Type Checking vs tsc for Building

**Type Checking Only (--noEmit):**

```bash
# ✅ GOOD: Type check without generating files
tsc --noEmit

# ✅ GOOD: Watch mode for continuous type checking
tsc --noEmit --watch

# ✅ GOOD: Type check specific files
tsc --noEmit src/types/agent.ts
```

**When to Use --noEmit:**
- Continuous Integration (CI) pipelines
- Pre-commit hooks
- IDE integration (language server)
- Projects using bundlers (webpack, rollup, vite)
- Quick validation during development

**Full Build (With Emit):**

```bash
# Full compilation with file generation
tsc

# Incremental build (faster subsequent builds)
tsc --incremental

# Build with source maps
tsc --sourceMap
```

**When to Use Full Build:**
- Production deployments
- Projects without bundlers
- When you need standalone JavaScript output
- Publishing npm packages
- Type declaration file generation (.d.ts)

**Best Practice - Development Workflow:**
```bash
# Development: Use bundler with type checking
vite build --mode development
# OR
webpack --mode development --watch

# Type checking separately
tsc --noEmit --watch

# Production: Full TypeScript build
tsc && vite build --mode production
```

**tsconfig.json for Different Environments:**

```json
{
  "compilerOptions": {
    // Shared options
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "strict": true,

    // Development: Skip emit for faster builds
    "noEmit": false,

    // Production: Generate declarations
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

### 2.6 Common Fixes for TypeScript Compiler Errors

#### Fix 1: Add Type Annotations

**Problem:** Implicit any error
```typescript
// ❌ ERROR: Implicit any
function process(value) {
  return value.toString();
}
```

**Solution:** Add explicit type
```typescript
// ✅ GOOD: Explicit type annotation
function process(value: unknown): string {
  return String(value);
}
```

#### Fix 2: Handle Null/Undefined

**Problem:** Object is possibly null
```typescript
// ❌ ERROR: Object is possibly 'null'
function getValue(obj: { value: string } | null) {
  return obj.value;
}
```

**Solution:** Type guard or optional chaining
```typescript
// ✅ GOOD: Type guard
function getValue(obj: { value: string } | null) {
  if (obj !== null) {
    return obj.value;
  }
  return '';
}

// ✅ GOOD: Optional chaining
function getValue(obj: { value: string } | null) {
  return obj?.value ?? '';
}
```

#### Fix 3: Use Type Assertions Wisely

**Problem:** TypeScript can't infer type
```typescript
// ❌ BAD: Excessive type assertions
const value = document.getElementById('test') as HTMLInputElement;
value.value = 'test';  // Runtime error if element is not input
```

**Solution:** Type guard first
```typescript
// ✅ GOOD: Type guard before assertion
function setInputValue(id: string, value: string) {
  const element = document.getElementById(id);
  if (element instanceof HTMLInputElement) {
    element.value = value;
  }
}
```

#### Fix 4: Narrow Union Types

**Problem:** Property doesn't exist on all union members
```typescript
// ❌ ERROR: Property 'length' does not exist on type 'number'
function process(value: string | number) {
  return value.length;
}
```

**Solution:** Type narrowing
```typescript
// ✅ GOOD: Narrow type before property access
function process(value: string | number) {
  if (typeof value === 'string') {
    return value.length;
  }
  return String(value).length;
}
```

---

## 3. Essential Documentation URLs

### 3.1 Official TypeScript Documentation

**TypeScript Handbook:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
  - Comprehensive guide to TypeScript features
  - Start here for foundational knowledge

**Discriminated Unions:**
- [Handbook: Discriminated Unions](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions)
  - Official documentation on discriminated union patterns
  - Examples of using discriminant properties for type narrowing

**Type Narrowing:**
- [Handbook: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
  - Complete guide to type narrowing techniques
  - Covers typeof, instanceof, in operator, discriminant checks

**Type Guards:**
- [Handbook: Type Guards and Differentiating Types](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
  - User-defined type guards with type predicates
  - Assertion functions for validation

**Generics:**
- [Handbook: Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
  - Generic functions, classes, and types
  - Type parameter inference and constraints

**Compiler Options:**
- [tsconfig.json Reference](https://www.typescriptlang.org/tsconfig)
  - Complete reference for all compiler options
  - Strict mode options and their effects

- [Compiler Options Documentation](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
  - Detailed explanation of each compiler option
  - Best practices for configuration

### 3.2 Type System Documentation

**Utility Types:**
- [Utility Types Reference](https://www.typescriptlang.org/docs/handbook/utility-types.html)
  - Built-in utility types (Partial, Required, Pick, Omit, etc.)
  - Type manipulation techniques

**Advanced Types:**
- [Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
  - Type guards, discriminated unions, conditional types
  - Mapped types and type inference

**Type Inference:**
- [Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
  - How TypeScript infers types
  - Best practices for type inference

### 3.3 Error Handling Resources

**Common TypeScript Errors:**
- [TypeScript Error Index](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#error-codes)
  - Complete list of TypeScript error codes
  - Explanations and solutions for common errors

**Declaration Merging:**
- [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
  - Merging interfaces and namespaces
  - Augmenting module declarations

### 3.4 Community Resources

**Stack Overflow Tags:**
- [TypeScript Tag on Stack Overflow](https://stackoverflow.com/questions/tagged/typescript)
  - Community Q&A for TypeScript issues
  - Search for specific error codes

**TypeScript Deep Dive (Basarat):**
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
  - Comprehensive TypeScript guide
  - Advanced patterns and best practices

**Matt Pocock's TypeScript Tips:**
- [TotalTypeScript](https://www.totaltypescript.com/)
  - Advanced TypeScript tutorials
  - Type system deep dives

### 3.5 URLs Specific to This Project

**AgentResponse Implementation:**
- `/home/dustin/projects/groundswell/src/types/agent.ts`
  - Complete AgentResponse<T> implementation
  - Type guards and factory functions
  - Zod validation schemas

**Migration Guide:**
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/migration-guide-agent-response.md`
  - PRD 6.4 compliance patterns
  - Before/after examples for AgentResponse migration

**Test Examples:**
- `/home/dustin/projects/groundswell/src/__tests__/unit/agent-response.test.ts`
  - Comprehensive AgentResponse tests
  - Type narrowing examples
  - Error handling patterns

---

## 4. Error Fixing Strategies

### 4.1 How to Interpret TypeScript Error Messages

**Error Message Structure:**

```
TS[Error Code]: [Error Message]
  [Additional Context]
  [Suggested Fix]
```

**Example:**
```
TS2339: Property 'data' does not exist on type 'AgentResponse<string>'.
  Property 'data' does not exist on type 'ErrorResponse'.
```

**Interpretation:**
1. **TS2339**: Property access error
2. **Property 'data' does not exist**: Trying to access 'data' property
3. **on type 'AgentResponse<string>'**: The type of the object
4. **Property 'data' does not exist on type 'ErrorResponse'**: Specific union member missing property

**Strategy:**
1. Identify the error code (TS####)
2. Read the error message carefully
3. Check the additional context (which union member)
4. Determine the fix (type narrowing needed)

---

### 4.2 Common Patterns for Fixing Type Errors

#### Pattern 1: Type Narrowing

**When to Use:** Accessing properties that vary across union members

**Steps:**
1. Identify the discriminant property
2. Check the discriminant value
3. Access the property inside the narrowed scope

**Example:**
```typescript
// Before: Error
function process(response: AgentResponse<string>) {
  return response.data.toUpperCase();  // ERROR
}

// After: Fixed
function process(response: AgentResponse<string>) {
  if (response.status === 'success') {
    return response.data.toUpperCase();  // OK
  }
  return '';
}
```

#### Pattern 2: Type Guards

**When to Use:** Reusable type checking logic

**Steps:**
1. Create a type guard function with type predicate
2. Use the guard to narrow the type
3. Access properties in the narrowed scope

**Example:**
```typescript
// Before: Error
function process(response: AgentResponse<string>) {
  if (response.status === 'success') {
    return response.data;
  }
}

// After: Fixed with type guard
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

function process(response: AgentResponse<string>) {
  if (isSuccess(response)) {
    return response.data;  // TypeScript knows this is string
  }
  return '';
}
```

#### Pattern 3: Null Checks

**When to Use:** Accessing properties on nullable values

**Steps:**
1. Check for null/undefined
2. Narrow the type in the if block
3. Provide default value if needed

**Example:**
```typescript
// Before: Error
function getValue(obj: { value: string } | null) {
  return obj.value;  // ERROR: obj is possibly null
}

// After: Fixed
function getValue(obj: { value: string } | null) {
  if (obj !== null) {
    return obj.value;  // OK
  }
  return '';  // Default value
}
```

#### Pattern 4: Optional Chaining

**When to Use:** Safe property access on nullable values

**Steps:**
1. Use optional chaining operator (?.)
2. Provide default with nullish coalescing (??)

**Example:**
```typescript
// Before: Error
function getError(response: AgentResponse<string>) {
  return response.error.message;  // ERROR: error is possibly null
}

// After: Fixed
function getError(response: AgentResponse<string>) {
  return response.error?.message ?? 'No error';  // OK
}
```

#### Pattern 5: Type Assertions

**When to Use:** You know more than TypeScript (use sparingly!)

**Steps:**
1. Ensure the assertion is correct (runtime check preferred)
2. Use type assertion operator (as or angle brackets)
3. Consider refactoring to avoid assertions

**Example:**
```typescript
// Before: Error
function process(value: unknown) {
  return value.toString();  // ERROR: value is unknown
}

// After: Fixed with assertion (better: use type guard)
function process(value: unknown) {
  return (value as { toString: () => string }).toString();  // OK but risky
}

// Better: Type guard
function process(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return value.toString();  // OK and safe
  }
  return String(value);
}
```

---

### 4.3 Using Type Assertions Wisely

**When to Use Type Assertions:**

✅ **Appropriate Use Cases:**

1. **After Runtime Validation:**
   ```typescript
   function process(value: unknown) {
     if (typeof value === 'string') {
       // ✅ OK: Already validated
       return (value as string).toUpperCase();
     }
   }
   ```

2. **Third-Party Library Types:**
   ```typescript
   // ✅ OK: Library missing proper types
   const result = (externalLib as any).getValue();
   ```

3. **DOM Elements:**
   ```typescript
   // ✅ OK: With runtime check
   const input = document.getElementById('myInput');
   if (input instanceof HTMLInputElement) {
     input.value = 'test';  // No assertion needed!
   }
   ```

❌ **Avoid Type Assertions When:**

1. **Type Guard Available:**
   ```typescript
   // ❌ BAD: Unnecessary assertion
   if (typeof value === 'string') {
     return (value as string).toUpperCase();
   }

   // ✅ GOOD: TypeScript already knows
   if (typeof value === 'string') {
     return value.toUpperCase();
   }
   ```

2. **Bypassing Compiler Errors:**
   ```typescript
   // ❌ BAD: Hiding real type errors
   const response = (wrongData as AgentResponse<string>);

   // ✅ GOOD: Fix the data structure
   const response: AgentResponse<string> = {
     status: 'success',
     data: correctData,
     error: null,
     metadata: { agentId: 'test', timestamp: Date.now() }
   };
   ```

3. **Complex Type Assertions:**
   ```typescript
   // ❌ BAD: Hard to read and maintain
   const value = (data as unknown as { nested: { value: string } }).nested.value;

   // ✅ GOOD: Type guard
   function isNestedValue(value: unknown): value is { nested: { value: string } } {
     return typeof value === 'object' &&
            value !== null &&
            'nested' in value &&
            typeof (value as any).nested?.value === 'string';
   }
   ```

---

### 4.4 Debugging TypeScript Type Errors

**Strategy 1: Use TypeScript Playground**

- Visit [TypeScript Playground](https://www.typescriptlang.org/play)
- Paste your code to see error messages with tooltips
- Experiment with fixes in real-time

**Strategy 2: Enable Verbose Compiler Output**

```bash
# Show detailed type information
tsc --noEmit --verbose

# Show explanation of errors
tsc --noEmit --explainFiles
```

**Strategy 3: Use IDE Features**

- **VS Code:**
  - Hover over types to see inferred types
  - Use "Go to Definition" (F12) to see type definitions
  - Use "Peek Definition" (Alt+F12) for inline type info
  - Enable "Type Checking Mode" in settings

- **WebStorm/IntelliJ:**
  - Use "Show Type Info" (Ctrl+Shift+P)
  - Use "Go to Declaration" (Ctrl+B)
  - Enable TypeScript type checking in settings

**Strategy 4: Isolate the Problem**

```typescript
// Create minimal reproduction
function testError() {
  const response: AgentResponse<string> = {
    status: 'success',
    data: 'test',
    error: null,
    metadata: { agentId: 'test', timestamp: Date.now() }
  };

  // Isolate the problematic line
  const result = response.data;  // Check type here
}
```

**Strategy 5: Use Type Annotations Explicitly**

```typescript
// Add explicit types to see what TypeScript thinks
function process(response: AgentResponse<string>): string {
  // Explicit return type helps catch errors
  if (response.status === 'success') {
    return response.data;  // Check: is this string?
  }
  return '';  // Check: is this string?
}
```

---

## 5. AgentResponse<T> Specific Patterns

### 5.1 Common AgentResponse Errors and Fixes

#### Error 1: Missing Metadata Property

**Error Message:**
```
TS2739: Type '{ status: string; data: T; error: null; }' is missing the following properties from type 'AgentResponse<T>': metadata
```

**Bad Pattern:**
```typescript
// ❌ ERROR: Missing metadata property
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null
};
```

**Fix - Use Factory Function:**
```typescript
// ✅ GOOD: Factory function ensures all properties
import { createSuccessResponse } from './types/agent.js';

const response = createSuccessResponse('test', {
  agentId: 'test-agent',
  timestamp: Date.now(),
  duration: 100
});
```

#### Error 2: Using Undefined Instead of Null

**Error Message:**
```
TS2322: Type 'undefined' is not assignable to type 'AgentResponse<...>'.
```

**Bad Pattern:**
```typescript
// ❌ ERROR: Using undefined (violates PRD 6.4.4)
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: undefined,  // WRONG
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Fix - Use Null (PRD 6.4.4 Compliant):**
```typescript
// ✅ GOOD: Use null instead of undefined
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,  // CORRECT (PRD 6.4.4)
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

#### Error 3: Accessing Data Without Type Narrowing

**Error Message:**
```
TS2531: Object is possibly 'null'.
```

**Bad Pattern:**
```typescript
// ❌ ERROR: data could be null
function processResponse(response: AgentResponse<string>) {
  return response.data.toUpperCase();
}
```

**Fix - Type Guard:**
```typescript
// ✅ GOOD: Use type guard before accessing data
function processResponse(response: AgentResponse<string>) {
  if (isSuccess(response)) {
    // TypeScript knows response.data is string (not null)
    return response.data.toUpperCase();
  }

  if (isError(response)) {
    throw new Error(response.error.message);
  }

  return '';  // Should not reach here if all cases handled
}
```

#### Error 4: Incorrect Status Value

**Error Message:**
```
TS2820: Type '"Success"' is not assignable to type 'AgentResponseStatus'.
```

**Bad Pattern:**
```typescript
// ❌ ERROR: Wrong case (must be lowercase)
const response: AgentResponse<string> = {
  status: 'Success',  // WRONG CASE
  data: 'test',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};
```

**Fix - Use Correct Literal Values:**
```typescript
// ✅ GOOD: Use correct lowercase values
const response: AgentResponse<string> = {
  status: 'success',  // CORRECT (lowercase)
  data: 'test',
  error: null,
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// ✅ BETTER: Use type alias or constant
type AgentResponseStatus = 'success' | 'error' | 'partial';
const status: AgentResponseStatus = 'success';
```

---

### 5.2 Best Practices for AgentResponse<T>

#### Practice 1: Always Use Type Guards

```typescript
// ✅ GOOD: Use type guards for type narrowing
import { isSuccess, isError, isPartial } from './types/agent.js';

function handleResponse<T>(response: AgentResponse<T>): T {
  if (isSuccess(response)) {
    // response is SuccessResponse<T>
    return response.data;
  }

  if (isError(response)) {
    // response is ErrorResponse
    throw new Error(response.error.message);
  }

  if (isPartial(response)) {
    // response is PartialResponse<T>
    return response.data;
  }

  // Exhaustive check
  const _exhaustive: never = response;
  return _exhaustive;
}
```

#### Practice 2: Use Factory Functions

```typescript
// ✅ GOOD: Factory functions ensure type safety
import {
  createSuccessResponse,
  createErrorResponse,
  createPartialResponse
} from './types/agent.js';

// Success response
const success = createSuccessResponse(
  { result: 'Operation complete' },
  { agentId: 'agent-1', timestamp: Date.now(), duration: 100 }
);

// Error response
const error = createErrorResponse(
  'VALIDATION_FAILED',
  'Invalid input',
  { field: 'email', value: 'not-an-email' },
  false  // Not recoverable
);

// Partial response
const partial = createPartialResponse({
  progress: 0.5,
  message: 'Processing...'
});
```

#### Practice 3: Provide Generic Type Parameters

```typescript
// ✅ GOOD: Explicit type parameter for clarity
function fetchData(): AgentResponse<{ id: string; name: string }> {
  return createSuccessResponse(
    { id: '123', name: 'Test' },
    { agentId: 'fetcher', timestamp: Date.now() }
  );
}

// ✅ GOOD: Type inference works too
const response = createSuccessResponse(
  { id: '123', name: 'Test' },
  { agentId: 'fetcher', timestamp: Date.now() }
);
// response inferred as AgentResponse<{ id: string; name: string }>
```

#### Practice 4: Handle All Response Cases

```typescript
// ✅ GOOD: Handle all status cases
async function processAgentPrompt(agent: Agent, prompt: Prompt<string>) {
  const response = await agent.prompt(prompt);

  switch (response.status) {
    case 'success':
      console.log('Success:', response.data);
      return response.data;

    case 'error':
      console.error('Error:', response.error.code, response.error.message);
      if (response.error.recoverable) {
        // Retry logic
        return await retryPrompt(agent, prompt);
      }
      throw new Error(response.error.message);

    case 'partial':
      console.log('Partial:', response.data);
      // Wait for more data or handle partial result
      return response.data;

    default:
      // TypeScript ensures exhaustiveness
      const _exhaustive: never = response;
      return _exhaustive;
  }
}
```

#### Practice 5: Validate Responses with Zod

```typescript
// ✅ GOOD: Use Zod for runtime validation
import { AgentResponseSchema, z } from './types/agent.js';

const DataSchema = z.object({
  result: z.string(),
  artifacts: z.array(z.string())
});

const ResponseSchema = AgentResponseSchema(DataSchema);

function validateResponse(data: unknown): AgentResponse<{ result: string; artifacts: string[] }> {
  try {
    return ResponseSchema.parse(data);
  } catch (error) {
    return createErrorResponse(
      'INVALID_RESPONSE_FORMAT',
      'Response does not match expected schema',
      { validationError: error },
      false
    );
  }
}
```

---

### 5.3 AgentResponse Type Examples

#### Example 1: Success Response

```typescript
// ✅ GOOD: Properly structured success response
const successResponse: AgentResponse<{ bugs: string[]; severity: 'low' | 'medium' | 'high' }> = {
  status: 'success',
  data: {
    bugs: ['Issue in component', 'Missing validation'],
    severity: 'high'
  },
  error: null,
  metadata: {
    agentId: 'bug-finder-123',
    timestamp: 1706140800000,
    duration: 1523,
    requestId: 'req-abc123',
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheWriteTokens: 25
    },
    toolCalls: 3
  }
};

// ✅ GOOD: Type narrowed access
if (isSuccess(successResponse)) {
  // TypeScript knows:
  // - successResponse.data is { bugs: string[]; severity: ... }
  // - successResponse.error is null
  console.log(`Found ${successResponse.data.bugs.length} bugs`);
  console.log(`Severity: ${successResponse.data.severity}`);
}
```

#### Example 2: Error Response

```typescript
// ✅ GOOD: Properly structured error response
const errorResponse: AgentResponse<null> = {
  status: 'error',
  data: null,
  error: {
    code: 'EXECUTION_FAILED',
    message: 'Failed to compile TypeScript files',
    details: {
      failedFiles: ['src/index.ts'],
      compilerErrors: ['TS2307: Cannot find module \'foo\'']
    },
    recoverable: true
  },
  metadata: {
    agentId: 'compiler-agent-456',
    timestamp: 1706140800000,
    duration: 500,
    requestId: 'req-def456'
  }
};

// ✅ GOOD: Type narrowed access
if (isError(errorResponse)) {
  // TypeScript knows:
  // - errorResponse.data is null
  // - errorResponse.error is AgentErrorDetails
  console.error(`[${errorResponse.error.code}] ${errorResponse.error.message}`);

  if (errorResponse.error.details) {
    console.error('Failed files:', errorResponse.error.details.failedFiles);
  }

  if (errorResponse.error.recoverable) {
    console.log('Retrying...');
  }
}
```

#### Example 3: Partial Response

```typescript
// ✅ GOOD: Properly structured partial response
const partialResponse: AgentResponse<{ completedSteps: number; totalSteps: number }> = {
  status: 'partial',
  data: {
    completedSteps: 3,
    totalSteps: 5
  },
  error: null,
  metadata: {
    agentId: 'multi-step-agent-789',
    timestamp: 1706140800000,
    duration: 1000,
    requestId: 'req-ghi789'
  }
};

// ✅ GOOD: Type narrowed access
if (isPartial(partialResponse)) {
  // TypeScript knows:
  // - partialResponse.data is { completedSteps: number; totalSteps: number }
  // - partialResponse.error is null
  const progress = (partialResponse.data.completedSteps / partialResponse.data.totalSteps) * 100;
  console.log(`Progress: ${progress.toFixed(1)}%`);
}
```

---

## 6. Quick Reference

### 6.1 Common TypeScript Error Codes

| Error Code | Message | Common Cause | Quick Fix |
|------------|---------|--------------|-----------|
| TS2339 | Property does not exist | Accessing property without narrowing | Use type guard or check discriminant |
| TS2345 | Argument not assignable | Type mismatch | Check types, add type annotation |
| TS2531 | Object is possibly 'null' | Property on nullable value | Add null check or optional chaining |
| TS2532 | Object is possibly 'undefined' | Property on optional value | Add undefined check or default value |
| TS2366 | Type not assignable to 'never' | Not exhaustive switch | Add default case or handle all members |
| TS2322 | Type not assignable | Type mismatch in assignment | Check types, use type assertion carefully |
| TS7005 | Implicit any return | Missing return type annotation | Add explicit return type |
| TS7010 | Return type not found | Missing return type (strict mode) | Add explicit return type |

---

### 6.2 Type Guard Functions Reference

```typescript
// Discriminated union type guards
function isSuccess<T>(response: AgentResponse<T>): response is SuccessResponse<T> {
  return response.status === 'success';
}

function isError<T>(response: AgentResponse<T>): response is ErrorResponse {
  return response.status === 'error';
}

function isPartial<T>(response: AgentResponse<T>): response is PartialResponse<T> {
  return response.status === 'partial';
}

// Null/undefined type guards
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

// Type predicate guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
```

---

### 6.3 Compiler Options Quick Reference

```json
{
  "compilerOptions": {
    // Strict mode (enable all)
    "strict": true,

    // Individual strict options
    "strictNullChecks": true,      // null/undefined are distinct types
    "strictPropertyInitialization": true,  // Class properties must be initialized
    "strictBindCallApply": true,    // Correct bind/call/apply typing
    "strictFunctionTypes": true,    // Strict function type checking
    "noImplicitAny": true,          // Disallow implicit any
    "noImplicitThis": true,         // Error on implicit this
    "alwaysStrict": true,           // Parse in strict mode

    // Additional checks
    "noUnusedLocals": true,         // Error on unused variables
    "noUnusedParameters": true,     // Error on unused parameters
    "noImplicitReturns": true,      // Error on missing returns
    "noFallthroughCasesInSwitch": true,  // Error on fallthrough
    "noUncheckedIndexedAccess": true,  // Add undefined to indexed access

    // Module resolution
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,

    // Emit options
    "declaration": true,            // Generate .d.ts files
    "declarationMap": true,         // Generate .d.ts.map files
    "sourceMap": true,              // Generate .js.map files
    "noEmit": false,                // Set true for type checking only

    // Target and lib
    "target": "ES2022",
    "lib": ["ES2022"],

    // Path mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

---

### 6.4 Command-Line Quick Reference

```bash
# Type checking (no output files)
tsc --noEmit

# Type checking with watch mode
tsc --noEmit --watch

# Full build
tsc

# Build with specific config
tsc --project tsconfig.json

# Incremental build (faster)
tsc --incremental

# Show detailed errors
tsc --noEmit --pretty false

# Type check specific files
tsc --noEmit src/types/agent.ts

# Generate declaration files only
tsc --declaration --emitDeclarationOnly
```

---

### 6.5 Best Practices Checklist

- [ ] Enable strict mode in tsconfig.json
- [ ] Use type guards for discriminated unions
- [ ] Handle all union members (exhaustiveness)
- [ ] Use null instead of undefined (PRD 6.4.4)
- [ ] Provide explicit return type annotations
- [ ] Use factory functions for complex types
- [ ] Add type guards before property access
- [ ] Use optional chaining (?.) for safe access
- [ ] Avoid excessive type assertions
- [ ] Use Zod for runtime validation
- [ ] Run tsc --noEmit in CI/CD
- [ ] Use type inference where possible
- [ ] Document complex types with JSDoc

---

## Summary

This research document provides comprehensive guidance on TypeScript compiler best practices and error fixing strategies, with specific focus on discriminated unions and generic types like AgentResponse<T>.

### Key Takeaways:

1. **Discriminated Unions**: Always narrow types using the discriminant property before accessing variant-specific properties
2. **Type Guards**: Use user-defined type guards with type predicates for reusable type checking logic
3. **Strict Mode**: Enable all strict options for better type safety and early error detection
4. **Factory Functions**: Use factory functions to ensure correct type construction
5. **Exhaustiveness**: Handle all union members in switch statements with default cases
6. **Null Handling**: Use null instead of undefined for PRD 6.4.4 compliance
7. **Type Assertions**: Use sparingly and only when you have more information than TypeScript
8. **Compiler Options**: Use tsc --noEmit for type checking during development

### Resources:

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- tsconfig Reference: https://www.typescriptlang.org/tsconfig
- Type Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- AgentResponse Implementation: `/home/dustin/projects/groundswell/src/types/agent.ts`

---

**Document Status**: Complete
**Last Updated**: 2026-01-24
**Next Review**: When TypeScript version updates or new patterns emerge

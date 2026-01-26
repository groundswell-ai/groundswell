# TypeScript Discriminated Union Research

## Table of Contents
1. [Official Documentation Resources](#official-documentation-resources)
2. [Best Practices](#best-practices)
3. [Code Examples and Patterns](#code-examples-and-patterns)
4. [Success/Error Response Types](#successerror-response-types)
5. [Backward Compatibility Strategies](#backward-compatibility-strategies)
6. [Migration Patterns](#migration-patterns)
7. [Common Pitfalls](#common-pitfalls)
8. [Type Narrowing Patterns](#type-narrowing-patterns)
9. [Example Refactoring Scenarios](#example-refactoring-scenarios)

---

## Official Documentation Resources

### TypeScript Official Documentation
- **TypeScript Handbook - Discriminated Unions**: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions
- **TypeScript Handbook - Type Narrowing**: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- **TypeScript Deep Dive - Discriminated Unions**: https://basarat.gitbook.io/typescript/type-system/discriminated-unions

### Key Concepts from Official Docs
Discriminated unions (also called tagged unions or algebraic data types) are a pattern where:
1. A common property (the "discriminator") exists in all types
2. The discriminator has a literal type that uniquely identifies each variant
3. TypeScript uses this discriminator to narrow types in conditional blocks

---

## Best Practices

### 1. Use Descriptive Discriminator Property Names
```typescript
// Good: Clear and semantic
type Result =
  | { status: 'success'; data: User }
  | { status: 'error'; error: Error };

// Acceptable: Generic but widely understood
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; sideLength: number };

// Avoid: Too generic
type Thing =
  | { type: 'a'; value: string }
  | { type: 'b'; value: number };
```

### 2. Make Discriminators Mandatory and Literal
```typescript
// Good: Required literal types
interface SuccessResponse<T> {
  readonly status: 'success';
  readonly data: T;
}

interface ErrorResponse {
  readonly status: 'error';
  readonly error: Error;
}

// Bad: Optional or non-literal discriminators
interface BadResponse {
  status?: string;  // Not required, not literal
  data?: unknown;
}
```

### 3. Use Exhaustiveness Checking with `never`
```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}

function handleResult(result: Result<string>) {
  switch (result.status) {
    case 'success':
      return result.data;
    case 'error':
      throw result.error;
    default:
      return assertNever(result); // Compile-time check for missing cases
  }
}
```

### 4. Keep Unions Focused and Manageable
```typescript
// Good: Focused, single-purpose unions
type AsyncTask =
  | { state: 'idle' }
  | { state: 'loading'; progress: number }
  | { state: 'success'; result: Data }
  | { state: 'error'; error: Error };

// Avoid: Overly complex unions mixing concerns
type BadUnion =
  | { type: 'user'; name: string; isAdmin: boolean }
  | { type: 'product'; price: number; discount: number }
  | { type: 'settings'; theme: 'dark' | 'light'; notifications: boolean };
// Split into separate unions for different domains
```

### 5. Leverage Readonly Properties for Immutability
```typescript
type Event =
  | { readonly type: 'CLICK'; readonly x: number; readonly y: number }
  | { readonly type: 'KEYPRESS'; readonly key: string };
```

### 6. Document Union Variants with JSDoc
```typescript
/**
 * Represents the result of an async operation that may fail.
 *
 * @template T The success data type
 * @template E The error type (defaults to Error)
 */
type AsyncResult<T, E = Error> =
  | {
      /** The operation completed successfully */
      success: true;
      /** The resulting data */
      data: T;
    }
  | {
      /** The operation failed */
      success: false;
      /** The error that occurred */
      error: E;
    };
```

---

## Code Examples and Patterns

### Basic Discriminated Union
```typescript
interface Circle {
  kind: 'circle';
  radius: number;
}

interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
}

type Shape = Circle | Rectangle;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
  }
}
```

### Generic Discriminated Union
```typescript
type ApiResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchData<T>(
  url: string
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Nested Discriminated Unions
```typescript
type DatabaseAction =
  | { type: 'query'; action: { type: 'SELECT'; table: string } }
  | { type: 'query'; action: { type: 'INSERT'; table: string; data: object } }
  | { type: 'query'; action: { type: 'UPDATE'; table: string; where: object } }
  | { type: 'transaction'; actions: DatabaseAction[] };
```

### Discriminated Union with Type Guards
```typescript
type Value =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean };

function isString(value: Value): value is { type: 'string'; value: string } {
  return value.type === 'string';
}

function processValue(value: Value): string {
  if (isString(value)) {
    return value.value.toUpperCase();
  }
  // TypeScript knows value is not a string here
  return String(value.value);
}
```

---

## Success/Error Response Types

### Pattern 1: Status Field Discriminator
```typescript
type ApiResponse<T> =
  | { status: 200; data: T }
  | { status: 400; error: string }
  | { status: 401; error: 'Unauthorized' }
  | { status: 404; error: 'Not Found' }
  | { status: 500; error: 'Internal Server Error' };

async function handleResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case 200:
      return response.data;
    case 401:
      throw new Error('Please log in');
    case 404:
      throw new Error('Resource not found');
    default:
      throw new Error(response.error);
  }
}
```

### Pattern 2: Boolean Success Flag
```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Utility functions
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Usage
async function divide(a: number, b: number): Promise<Result<number>> {
  if (b === 0) {
    return err(new Error('Division by zero'));
  }
  return ok(a / b);
}

// Chaining results
async function performCalculation(): Promise<Result<number>> {
  const result1 = await divide(10, 2);
  if (!result1.ok) return result1;

  const result2 = await divide(result1.value, 5);
  if (!result2.ok) return result2;

  return ok(result2.value);
}
```

### Pattern 3: Loading/Success/Error States
```typescript
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading'; progress?: number }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

class DataLoader<T> {
  private state: AsyncState<T> = { status: 'idle' };

  async load(url: string): Promise<void> {
    this.state = { status: 'loading' };

    try {
      const response = await fetch(url);
      const data = await response.json();
      this.state = { status: 'success', data };
    } catch (error) {
      this.state = { status: 'error', error: error as Error };
    }
  }

  getState(): AsyncState<T> {
    return this.state;
  }

  render(): string {
    switch (this.state.status) {
      case 'idle':
        return 'Not loaded';
      case 'loading':
        return this.state.progress
          ? `Loading: ${this.state.progress}%`
          : 'Loading...';
      case 'success':
        return `Data: ${JSON.stringify(this.state.data)}`;
      case 'error':
        return `Error: ${this.state.error.message}`;
    }
  }
}
```

### Pattern 4: Validation Results
```typescript
type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; errors: string[] };

function validateEmail(email: string): ValidationResult<string> {
  const errors: string[] = [];

  if (!email.includes('@')) {
    errors.push('Email must contain @');
  }

  if (!email.endsWith('.com')) {
    errors.push('Email must end with .com');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, value: email };
}

function validateUser(data: unknown): ValidationResult<User> {
  // Implementation
  return { valid: true, value: data as User };
}
```

---

## Backward Compatibility Strategies

### Strategy 1: Intersection with Original Type
```typescript
// Original interface
interface UserResponse {
  id: string;
  name: string;
  email?: string;
  active?: boolean;
}

// New discriminated union
type UserResponseV2 =
  | { type: 'full'; user: UserResponse }
  | { type: 'partial'; user: Partial<UserResponse> };

// Backward compatible function
function processUser(response: UserResponseV2 | UserResponse): string {
  if ('type' in response) {
    // New format
    return response.type === 'full'
      ? response.user.name
      : response.user.name || 'Unknown';
  }
  // Old format
  return response.name;
}
```

### Strategy 2: Type Guard for Version Detection
```typescript
interface OldFormat {
  id: string;
  value: string;
}

type NewFormat =
  | { version: 1; data: string }
  | { version: 2; data: { text: string; metadata: object } };

function isNewFormat(obj: OldFormat | NewFormat): obj is NewFormat {
  return 'version' in obj;
}

function processData(obj: OldFormat | NewFormat): string {
  if (isNewFormat(obj)) {
    return obj.version === 1 ? obj.data : obj.data.text;
  }
  return obj.value;
}
```

### Strategy 3: Adapter Pattern
```typescript
// Legacy interface
interface LegacyConfig {
  apiUrl: string;
  timeout?: number;
}

// New discriminated union
type Config =
  | { type: 'production'; api: string; retries: number }
  | { type: 'development'; api: string; debug: boolean };

// Adapter function
function adaptConfig(legacy: LegacyConfig): Config {
  return {
    type: 'development',
    api: legacy.apiUrl,
    debug: true
  };
}

// Use adapter in existing code
function initializeApp(config: LegacyConfig | Config) {
  const finalConfig = 'type' in config ? config : adaptConfig(config);
  // Work with finalConfig
}
```

### Strategy 4: Union with Optional Discriminator
```typescript
type TransitionType =
  | { type?: 'legacy'; id: string; name: string }
  | { type: 'v2'; id: string; name: string; metadata: object };

function handleTransition(data: TransitionType) {
  if (data.type === 'v2') {
    console.log(data.metadata);
  }
  // Works with both legacy and v2
  console.log(data.name);
}
```

### Strategy 5: Default Fallback
```typescript
type ModernResponse<T> =
  | { kind: 'success'; data: T }
  | { kind: 'error'; code: number; message: string };

type LegacyResponse<T> = {
  data?: T;
  error?: string;
};

type Response<T> = ModernResponse<T> | LegacyResponse<T>;

function isSuccess<T>(res: Response<T>): res is ModernResponse<T> & { kind: 'success' } {
  return 'kind' in res && res.kind === 'success';
}

function getData<T>(res: Response<T>): T | null {
  if (isSuccess(res)) {
    return res.data;
  }
  if ('data' in res && res.data) {
    return res.data;
  }
  return null;
}
```

---

## Migration Patterns

### Pattern 1: Add Discriminator First
```typescript
// Step 1: Original interface
interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

// Step 2: Add discriminator
interface UserV1 {
  _version: 'v1';
  id: string;
  name: string;
  role: 'admin' | 'user';
}

// Step 3: Create discriminated union
type UserV2 =
  | { _version: 'v2'; id: string; name: string; role: 'admin'; permissions: string[] }
  | { _version: 'v2'; id: string; name: string; role: 'user'; preferences: object };

type User = UserV1 | UserV2;

// Step 4: Update consumers gradually
function getUserPermissions(user: User): string[] {
  if (user._version === 'v2' && user.role === 'admin') {
    return user.permissions;
  }
  if (user._version === 'v1' && user.role === 'admin') {
    return ['*']; // Legacy admin has all permissions
  }
  return [];
}
```

### Pattern 2: Parallel Implementation
```typescript
// Old implementation
interface PaymentMethod {
  type: string;
  details: object;
}

function processPayment(method: PaymentMethod): Promise<boolean> {
  // Old logic
  return Promise.resolve(true);
}

// New implementation
type NewPaymentMethod =
  | { type: 'credit-card'; cardNumber: string; expiry: string; cvv: string }
  | { type: 'paypal'; email: string }
  | { type: 'bank-transfer'; accountNumber: string; routingNumber: string };

function processPaymentV2(method: NewPaymentMethod): Promise<boolean> {
  switch (method.type) {
    case 'credit-card':
      // Process credit card
      return Promise.resolve(true);
    case 'paypal':
      // Process PayPal
      return Promise.resolve(true);
    case 'bank-transfer':
      // Process bank transfer
      return Promise.resolve(true);
  }
}

// Unified function with feature flag
async function processPaymentUnified(
  method: PaymentMethod | NewPaymentMethod,
  useV2: boolean
): Promise<boolean> {
  if (useV2 && isNewPaymentMethod(method)) {
    return processPaymentV2(method);
  }
  return processPayment(method);
}

function isNewPaymentMethod(method: PaymentMethod | NewPaymentMethod): method is NewPaymentMethod {
  return ['credit-card', 'paypal', 'bank-transfer'].includes(method.type);
}
```

### Pattern 3: Factory Function Migration
```typescript
// Before
function createEvent(type: string, data: object): Event {
  return { type, data } as Event;
}

// After - use factory to create discriminated unions
type AppEvent =
  | { type: 'USER_LOGIN'; userId: string; timestamp: number }
  | { type: 'USER_LOGOUT'; userId: string; timestamp: number }
  | { type: 'DATA_UPDATE'; dataset: string; records: number };

function createEvent(type: 'USER_LOGIN', data: { userId: string }): AppEvent;
function createEvent(type: 'USER_LOGOUT', data: { userId: string }): AppEvent;
function createEvent(type: 'DATA_UPDATE', data: { dataset: string; records: number }): AppEvent;
function createEvent(type: string, data: any): AppEvent {
  const base = { timestamp: Date.now() };

  switch (type) {
    case 'USER_LOGIN':
      return { type, ...base, userId: data.userId };
    case 'USER_LOGOUT':
      return { type, ...base, userId: data.userId };
    case 'DATA_UPDATE':
      return { type, ...base, dataset: data.dataset, records: data.records };
    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}
```

### Pattern 4: Gradual Property Migration
```typescript
// Step 1: Start with optional properties
interface Task {
  id: string;
  title: string;
  status?: 'todo' | 'in-progress' | 'done';
}

// Step 2: Add discriminator with default
type TaskV2 =
  | { id: string; title: string; status: 'todo' }
  | { id: string; title: string; status: 'in-progress'; assignee: string }
  | { id: string; title: string; status: 'done'; completedAt: Date };

// Step 3: Type guard to handle both
function isTaskV2(task: Task | TaskV2): task is TaskV2 {
  return 'status' in task && task.status !== undefined;
}

function renderTask(task: Task | TaskV2): string {
  if (!isTaskV2(task) || task.status === 'todo') {
    return task.title;
  }
  if (task.status === 'in-progress') {
    return `${task.title} (assigned to ${task.assignee})`;
  }
  return `${task.title} (done at ${task.completedAt})`;
}
```

### Pattern 5: Database Schema Migration
```typescript
// Represents database rows during migration
type DbUser =
  | { schema_version: 1; id: number; name: string }
  | { schema_version: 2; id: number; firstName: string; lastName: string; email: string };

function migrateUser(user: DbUser): DbUser {
  if (user.schema_version === 1) {
    const [firstName, ...lastNameParts] = user.name.split(' ');
    return {
      schema_version: 2,
      id: user.id,
      firstName,
      lastName: lastNameParts.join(' ') || '',
      email: `${firstName.toLowerCase()}@example.com`
    };
  }
  return user;
}

function getUserName(user: DbUser): string {
  const migrated = migrateUser(user);
  if (migrated.schema_version === 2) {
    return `${migrated.firstName} ${migrated.lastName}`;
  }
  return user.name;
}
```

---

## Common Pitfalls

### Pitfall 1: Missing Discriminator
```typescript
// Bad: No common discriminator
type BadUnion =
  | { kind: 'circle'; radius: number }
  | { type: 'square'; size: number };  // Different property name

// Good: Consistent discriminator
type GoodUnion =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number };
```

### Pitfall 2: Overlapping Types
```typescript
// Bad: Types overlap, TypeScript can't narrow
type BadState =
  | { status: 'loading'; data?: unknown }
  | { status: 'success'; data: unknown };
// Both can have data, making narrowing difficult

// Good: Mutually exclusive properties
type GoodState =
  | { status: 'loading' }
  | { status: 'success'; data: unknown };
```

### Pitfall 3: Optional Discriminator
```typescript
// Bad: Discriminator is optional
type BadUnion =
  | { type?: 'a'; value: string }
  | { type?: 'b'; value: number };

// Good: Discriminator is required
type GoodUnion =
  | { type: 'a'; value: string }
  | { type: 'b'; value: number };
```

### Pitfall 4: Using `any` or `unknown` in Discriminator
```typescript
// Bad: Discriminator is not a literal type
type BadUnion =
  | { type: string; value: string }
  | { type: string; value: number };

// Good: Discriminator is a literal union
type GoodUnion =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number };
```

### Pitfall 5: Forgetting Exhaustiveness Checks
```typescript
// Bad: No exhaustiveness check
function badHandle(shape: Shape) {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    // What if we add 'triangle' later? This won't catch it.
  }
}

// Good: With exhaustiveness check
function goodHandle(shape: Shape) {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;
  }
}
```

### Pitfall 6: Discriminated Union in Object Keys
```typescript
// Bad: Discriminated unions as object keys cause issues
const badHandlers = {
  'success': (data: string) => console.log(data),
  'error': (error: Error) => console.error(error)
} satisfies Record<string, Function>;

// Good: Use explicit mapping or objects
type Handler =
  | { type: 'success'; handle: (data: string) => void }
  | { type: 'error'; handle: (error: Error) => void };

function getHandler(type: 'success' | 'error'): Handler {
  if (type === 'success') {
    return {
      type: 'success',
      handle: (data) => console.log(data)
    };
  }
  return {
    type: 'error',
    handle: (error) => console.error(error)
  };
}
```

### Pitfall 7: Circular Type Dependencies
```typescript
// Bad: Circular dependencies
type BadExpression =
  | { type: 'literal'; value: number }
  | { type: 'binary'; left: BadExpression; right: BadExpression };

// Good: Use interface for forward reference
interface Expression {
  kind: 'literal' | 'binary';
}

type Expression =
  | { kind: 'literal'; value: number }
  | { kind: 'binary'; left: Expression; right: Expression };
```

### Pitfall 8: Discriminator Value Conflicts
```typescript
// Bad: Same discriminator value in different types
type BadUnion =
  | { type: 'event'; data: string }
  | { type: 'event'; data: number };  // Conflict!

// Good: Unique discriminator values
type GoodUnion =
  | { type: 'string-event'; data: string }
  | { type: 'number-event'; data: number };
```

---

## Type Narrowing Patterns

### Pattern 1: Switch Statement with Exhaustiveness
```typescript
function handleEvent(event: Event): void {
  switch (event.type) {
    case 'click':
      console.log(`Clicked at ${event.x}, ${event.y}`);
      break;
    case 'keypress':
      console.log(`Key pressed: ${event.key}`);
      break;
    case 'scroll':
      console.log(`Scrolled to ${event.scrollY}`);
      break;
    default:
      const _exhaustiveCheck: never = event;
      throw new Error(`Unknown event type: ${_exhaustiveCheck}`);
  }
}
```

### Pattern 2: If-Else Chains
```typescript
function processResult(result: Result<string, Error>): string {
  if (result.success) {
    return result.data;
  } else {
    throw result.error;
  }
}
```

### Pattern 3: Custom Type Guards
```typescript
function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

function isError<E>(result: Result<never, E>): result is { success: false; error: E } {
  return result.success === false;
}

function useResult<T>(result: Result<T>): T {
  if (isSuccess(result)) {
    return result.data; // TypeScript knows this is safe
  }
  throw result.error;
}
```

### Pattern 4: Property Checking
```typescript
type User =
  | { type: 'guest' }
  | { type: 'registered'; email: string }
  | { type: 'admin'; email: string; permissions: string[] };

function getUserEmail(user: User): string | null {
  if ('email' in user) {
    return user.email; // TypeScript knows this is registered or admin
  }
  return null;
}
```

### Pattern 5: Discriminator Mapping
```typescript
type Command =
  | { type: 'add'; a: number; b: number }
  | { type: 'subtract'; a: number; b: number }
  | { type: 'multiply'; a: number; b: number }
  | { type: 'divide'; a: number; b: number };

const commandHandlers = {
  add: (cmd: Command) => cmd.a + cmd.b,
  subtract: (cmd: Command) => cmd.a - cmd.b,
  multiply: (cmd: Command) => cmd.a * cmd.b,
  divide: (cmd: Command) => cmd.a / cmd.b,
};

function executeCommand(command: Command): number {
  const handler = commandHandlers[command.type];
  return handler(command);
}
```

### Pattern 6: Predicate Functions
```typescript
type Value =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean };

const predicates = {
  isString: (v: Value): v is { type: 'string'; value: string } => v.type === 'string',
  isNumber: (v: Value): v is { type: 'number'; value: number } => v.type === 'number',
  isBoolean: (v: Value): v is { type: 'boolean'; value: boolean } => v.type === 'boolean',
};

function formatValue(value: Value): string {
  if (predicates.isString(value)) {
    return value.value.toUpperCase();
  }
  if (predicates.isNumber(value)) {
    return value.value.toFixed(2);
  }
  return value.value.toString();
}
```

---

## Example Refactoring Scenarios

### Scenario 1: Refactoring Optional Properties to Discriminated Union

**Before:**
```typescript
interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  isVerified?: boolean;
}

function sendNotification(user: User): void {
  if (user.email) {
    sendEmail(user.email);
  } else if (user.phoneNumber) {
    sendSMS(user.phoneNumber);
  }
}
```

**After:**
```typescript
type User =
  | {
      id: string;
      name: string;
      contactMethod: 'email';
      email: string;
      isVerified: boolean;
    }
  | {
      id: string;
      name: string;
      contactMethod: 'sms';
      phoneNumber: string;
      isVerified: boolean;
    }
  | {
      id: string;
      name: string;
      contactMethod: 'none';
    };

function sendNotification(user: User): void {
  switch (user.contactMethod) {
    case 'email':
      sendEmail(user.email);
      break;
    case 'sms':
      sendSMS(user.phoneNumber);
      break;
    case 'none':
      console.log('No contact method available');
      break;
  }
}
```

### Scenario 2: Refactoring Status Strings to Discriminated Union

**Before:**
```typescript
interface Order {
  id: string;
  items: OrderItem[];
  status: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

function processOrder(order: Order): void {
  if (order.status === 'shipped') {
    sendTrackingInfo(order);
  } else if (order.status === 'delivered') {
    requestReview(order);
  } else if (order.status === 'cancelled') {
    processRefund(order);
  }
}
```

**After:**
```typescript
type Order =
  | {
      id: string;
      items: OrderItem[];
      status: 'pending';
    }
  | {
      id: string;
      items: OrderItem[];
      status: 'shipped';
      shippedAt: Date;
      trackingNumber: string;
    }
  | {
      id: string;
      items: OrderItem[];
      status: 'delivered';
      shippedAt: Date;
      deliveredAt: Date;
      trackingNumber: string;
    }
  | {
      id: string;
      items: OrderItem[];
      status: 'cancelled';
      cancelledAt: Date;
      reason: string;
    };

function processOrder(order: Order): void {
  switch (order.status) {
    case 'pending':
      console.log('Order is pending');
      break;
    case 'shipped':
      sendTrackingInfo(order.trackingNumber);
      break;
    case 'delivered':
      requestReview(order.id);
      break;
    case 'cancelled':
      processRefund(order.id, order.reason);
      break;
  }
}
```

### Scenario 3: Refactoring API Response Handling

**Before:**
```typescript
interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  errorCode?: number;
}

async function fetchUser(id: string): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  const json: ApiResponse = await response.json();

  if (json.success && json.data) {
    return json.data as User;
  }

  if (json.error) {
    console.error(json.error);
  }

  return null;
}
```

**After:**
```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode: number };

async function fetchUser(id: string): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    return {
      success: false,
      error: 'User not found',
      errorCode: response.status
    };
  }

  const data = await response.json();
  return { success: true, data };
}

// Usage
const result = await fetchUser('123');

if (result.success) {
  console.log(`User: ${result.data.name}`);
} else {
  console.error(`Error ${result.errorCode}: ${result.error}`);
}
```

### Scenario 4: Refactoring Configuration Objects

**Before:**
```typescript
interface DatabaseConfig {
  type: string;
  host: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  connectionString?: string;
}

function connectToDatabase(config: DatabaseConfig): Connection {
  if (config.type === 'postgres') {
    // Use individual connection params
  } else if (config.type === 'mongodb') {
    // Use connection string
  }
  // ...
}
```

**After:**
```typescript
type DatabaseConfig =
  | {
      type: 'postgresql';
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      ssl?: boolean;
    }
  | {
      type: 'mongodb';
      connectionString: string;
      replicaSet?: string;
    }
  | {
      type: 'redis';
      host: string;
      port: number;
      password?: string;
      db?: number;
    };

function connectToDatabase(config: DatabaseConfig): Connection {
  switch (config.type) {
    case 'postgresql':
      return createPostgresConnection({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl
      });
    case 'mongodb':
      return createMongoConnection(config.connectionString);
    case 'redis':
      return createRedisConnection({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db
      });
  }
}
```

### Scenario 5: Refactoring Form Validation

**Before:**
```typescript
interface FormField {
  name: string;
  value: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean | string;
}

function validateField(field: FormField): string | null {
  if (field.required && !field.value) {
    return `${field.name} is required`;
  }

  if (field.minLength && field.value.length < field.minLength) {
    return `${field.name} must be at least ${field.minLength} characters`;
  }

  if (field.maxLength && field.value.length > field.maxLength) {
    return `${field.name} must be no more than ${field.maxLength} characters`;
  }

  if (field.pattern && !field.pattern.test(field.value)) {
    return `${field.name} format is invalid`;
  }

  if (field.customValidator) {
    const result = field.customValidator(field.value);
    if (result !== true) {
      return typeof result === 'string' ? result : `${field.name} is invalid`;
    }
  }

  return null;
}
```

**After:**
```typescript
type ValidationRule =
  | { type: 'required' }
  | { type: 'minLength'; length: number }
  | { type: 'maxLength'; length: number }
  | { type: 'pattern'; regex: RegExp; message?: string }
  | { type: 'custom'; validator: (value: string) => boolean | string };

type FormField = {
  name: string;
  value: string;
  rules: ValidationRule[];
};

function validateRule(rule: ValidationRule, value: string, fieldName: string): string | null {
  switch (rule.type) {
    case 'required':
      if (!value) {
        return `${fieldName} is required`;
      }
      break;

    case 'minLength':
      if (value.length < rule.length) {
        return `${fieldName} must be at least ${rule.length} characters`;
      }
      break;

    case 'maxLength':
      if (value.length > rule.length) {
        return `${fieldName} must be no more than ${rule.length} characters`;
      }
      break;

    case 'pattern':
      if (!rule.regex.test(value)) {
        return rule.message || `${fieldName} format is invalid`;
      }
      break;

    case 'custom':
      const result = rule.validator(value);
      if (result !== true) {
        return typeof result === 'string' ? result : `${fieldName} is invalid`;
      }
      break;
  }

  return null;
}

function validateField(field: FormField): string[] {
  const errors: string[] = [];

  for (const rule of field.rules) {
    const error = validateRule(rule, field.value, field.name);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

// Usage
const emailField: FormField = {
  name: 'Email',
  value: 'user@example.com',
  rules: [
    { type: 'required' },
    { type: 'pattern', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' }
  ]
};
```

---

## Additional Resources

### Community Resources
- **TypeScript Community Discord**: https://discord.gg/typescript
- **Stack Overflow - TypeScript Tag**: https://stackoverflow.com/questions/tagged/typescript
- **Reddit - r/typescript**: https://www.reddit.com/r/typescript/

### Recommended Libraries
- **ts-pattern**: https://github.com/gvergnaud/ts-pattern - Pattern matching library for TypeScript
- **@prisma/client**: Uses discriminated unions extensively for database models
- **@tanstack/react-query**: Uses discriminated unions for mutation results

### Related Patterns
- **State Machines**: https://statecharts.github.io/
- **Algebraic Data Types**: Functional programming pattern
- **Tagged Unions**: Same concept, different name
- **Variant Types**: C++ concept, similar to discriminated unions

---

## Summary

Discriminated unions are a powerful TypeScript pattern that enables:
- **Type Safety**: Compile-time guarantees that all cases are handled
- **Self-Documenting Code**: The type definition describes all possible states
- **Better IDE Support**: Autocomplete works correctly after type narrowing
- **Refactoring Safety**: Adding new union members causes compile errors at usage sites

Key takeaways for successful migration:
1. Start by adding discriminator properties to existing types
2. Use type guards and assertion functions for gradual migration
3. Implement exhaustiveness checking with `never` type
4. Keep discriminated unions focused and manageable
5. Document the purpose of each variant with JSDoc
6. Consider backward compatibility during transition periods
7. Use factory functions to ensure valid union creation

Common use cases:
- API response handling (success/error states)
- State management (loading/success/error)
- Configuration objects with different modes
- Event handling systems
- Form validation results
- Database schema migrations

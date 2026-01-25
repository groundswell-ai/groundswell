# TypeScript Static Method Best Practices Research

> Research Date: 2025-01-24
> Topic: TypeScript static method patterns, best practices, and common pitfalls

## Table of Contents

1. [Static Factory Methods](#1-static-factory-methods)
2. [Async Static Method Patterns](#2-async-static-method-patterns)
3. [File Loading/Parsing Static Methods](#3-file-loadingparsing-static-methods)
4. [JSDoc Documentation Patterns](#4-jsdoc-documentation-patterns)
5. [Type Safety Patterns](#5-type-safety-patterns)
6. [Common Pitfalls](#6-common-pitfalls)
7. [References](#7-references)

---

## 1. Static Factory Methods

### Overview

Static factory methods are a creational pattern that provides an alternative to direct constructor instantiation. They offer several advantages over constructors:

- **Descriptive naming**: `from`, `create`, `parse` vs generic constructor
- **Caching/instance control**: Can return cached instances
- **Type inference**: Better generic type inference
- **Validation**: Can validate before instantiation
- **Return subtypes**: Can return different implementations

### Basic Pattern

```typescript
class Product {
  private constructor(
    private id: string,
    private name: string,
    private price: number
  ) {}

  // Static factory method
  static create(name: string, price: number): Product {
    const id = crypto.randomUUID();
    return new Product(id, name, price);
  }
}

// Usage
const product = Product.create("Widget", 29.99);
```

### Named Factory Methods

```typescript
class User {
  private constructor(
    private email: string,
    private passwordHash: string,
    private role: 'admin' | 'user' | 'guest'
  ) {}

  static createAdmin(email: string, password: string): User {
    const hash = bcrypt.hash(password, 10);
    return new User(email, hash, 'admin');
  }

  static createUser(email: string, password: string): User {
    const hash = bcrypt.hash(password, 10);
    return new User(email, hash, 'user');
  }

  static createGuest(email: string): User {
    return new User(email, '', 'guest');
  }
}
```

### Generic Factory Methods

```typescript
class EntityFactory {
  static create<T>(
    constructor: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    return new constructor(...args);
  }
}

// Usage
class Product {
  constructor(public name: string, public price: number) {}
}

const product = EntityFactory.create(Product, "Widget", 29.99);
```

### Factory with Validation

```typescript
type Result<T> =
  | { success: true; value: T }
  | { success: false; error: string };

class Order {
  private constructor(private items: OrderItem[]) {}

  static create(items: OrderItem[]): Result<Order> {
    if (items.length === 0) {
      return {
        success: false,
        error: 'Order must have at least one item'
      };
    }

    const total = items.reduce((sum, item) => sum + item.price, 0);
    if (total > 10000) {
      return {
        success: false,
        error: 'Order total exceeds maximum allowed'
      };
    }

    return {
      success: true,
      value: new Order(items)
    };
  }
}

// Usage
const result = Order.create(items);
if (result.success) {
  // result.value is Order
} else {
  // result.error is string
}
```

### From Methods (Deserialization)

```typescript
class DateTime {
  private constructor(private value: Date) {}

  static fromISO(isoString: string): DateTime {
    return new DateTime(new Date(isoString));
  }

  static fromTimestamp(timestamp: number): DateTime {
    return new DateTime(new Date(timestamp));
  }

  static fromParts(
    year: number,
    month: number,
    day: number,
    hours = 0,
    minutes = 0,
    seconds = 0
  ): DateTime {
    return new DateTime(new Date(year, month - 1, day, hours, minutes, seconds));
  }
}
```

### Best Practices for Factory Methods

1. **Make constructor private** when using factory methods exclusively
2. **Use descriptive names** (`create`, `from`, `parse`, `of`)
3. **Handle validation** before returning instance
4. **Return Result/Either types** for fallible operations
5. **Consider async factory methods** for operations requiring I/O
6. **Document factory methods** with JSDoc including examples

---

## 2. Async Static Method Patterns

### Overview

Async static methods in TypeScript follow the same patterns as async functions but are scoped to the class. They're commonly used for:

- Data fetching and API calls
- File I/O operations
- Database operations
- Resource initialization

### Basic Async Static Method

```typescript
class UserService {
  static async getUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error(`User not found: ${id}`);
    }

    return response.json();
  }
}

// Usage
const user = await UserService.getUser("123");
```

### Generic Async Static Method

```typescript
class ApiClient {
  static async get<T>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async post<T, U>(url: string, data: U): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage
interface User {
  id: string;
  name: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

const user = await ApiClient.get<User>('/api/users/123');
const newUser = await ApiClient.post<User, CreateUserRequest>('/api/users', {
  name: 'John',
  email: 'john@example.com'
});
```

### Error Handling Pattern

```typescript
class DatabaseService {
  static async query<T>(sql: string, params: any[] = []): Promise<T> {
    try {
      const result = await db.execute(sql, params);
      return result as T;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw new QueryError(`Query failed: ${sql}`, error);
      }
      throw error;
    }
  }
}

// Usage with error handling
try {
  const users = await DatabaseService.query<User[]>('SELECT * FROM users');
} catch (error) {
  if (error instanceof QueryError) {
    // Handle query error
  }
}
```

### Async Static Factory Method

```typescript
class Configuration {
  private constructor(private settings: Record<string, any>) {}

  static async load(path: string): Promise<Configuration> {
    try {
      const content = await fs.promises.readFile(path, 'utf-8');
      const settings = JSON.parse(content);
      return new Configuration(settings);
    } catch (error) {
      throw new ConfigurationLoadError(`Failed to load config from ${path}`, error);
    }
  }

  static async loadFromUrl(url: string): Promise<Configuration> {
    try {
      const response = await fetch(url);
      const settings = await response.json();
      return new Configuration(settings);
    } catch (error) {
      throw new ConfigurationLoadError(`Failed to load config from ${url}`, error);
    }
  }
}

// Usage
const config = await Configuration.load('./config.json');
```

### Caching Pattern

```typescript
class Cache {
  private static cache = new Map<string, { value: any; expires: number }>();

  static async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 60000
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.value as T;
    }

    const value = await fetcher();
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });

    return value;
  }

  static invalidate(key: string): void {
    this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
  }
}

// Usage
const user = await Cache.get(
  `user:${userId}`,
  () => fetchUser(userId),
  300000 // 5 minute TTL
);
```

### Promise.all Pattern

```typescript
class BatchProcessor {
  static async processAll<T, U>(
    items: T[],
    processor: (item: T) => Promise<U>
  ): Promise<U[]> {
    return Promise.all(items.map(processor));
  }

  static async processAllWithErrors<T, U>(
    items: T[],
    processor: (item: T) => Promise<U>
  ): Promise<Array<{ success: true; value: U } | { success: false; error: Error }>> {
    return Promise.all(
      items.map(async (item) => {
        try {
          const value = await processor(item);
          return { success: true, value };
        } catch (error) {
          return { success: false, error: error as Error };
        }
      })
    );
  }
}
```

### Best Practices for Async Static Methods

1. **Always return Promise<T>** explicitly for clarity
2. **Use generics** for type-safe return values
3. **Handle errors appropriately** - wrap or rethrow
4. **Document async behavior** in JSDoc
5. **Consider timeouts** for long-running operations
6. **Use AbortController** for cancellable operations
7. **Cache results** when appropriate
8. **Validate inputs** before async operations

---

## 3. File Loading/Parsing Static Methods

### Overview

Static methods are ideal for file I/O operations in TypeScript, providing clean APIs for loading and parsing various file formats.

### Basic File Loading Pattern

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

class FileLoader {
  static async loadText(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new FileLoadError(`Failed to load file: ${filePath}`, error);
    }
  }

  static async loadBinary(filePath: string): Promise<Buffer> {
    try {
      return await fs.promises.readFile(filePath);
    } catch (error) {
      throw new FileLoadError(`Failed to load file: ${filePath}`, error);
    }
  }
}
```

### JSON Loading Pattern

```typescript
class JsonLoader {
  static async load<T>(filePath: string): Promise<T> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      return parsed as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new JsonParseError(`Invalid JSON in file: ${filePath}`, error);
      }
      throw new FileLoadError(`Failed to load JSON from: ${filePath}`, error);
    }
  }

  static async save<T>(filePath: string, data: T): Promise<void> {
    try {
      const content = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new FileSaveError(`Failed to save JSON to: ${filePath}`, error);
    }
  }

  static loadSync<T>(filePath: string): T {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new JsonParseError(`Invalid JSON in file: ${filePath}`, error);
      }
      throw new FileLoadError(`Failed to load JSON from: ${filePath}`, error);
    }
  }

  static saveSync<T>(filePath: string, data: T): void {
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      throw new FileSaveError(`Failed to save JSON to: ${filePath}`, error);
    }
  }
}

// Usage
interface Config {
  port: number;
  host: string;
}

const config = await JsonLoader.load<Config>('./config.json');
await JsonLoader.save('./config.json', config);
```

### Generic File Parser Pattern

```typescript
type Parser<T> = (content: string) => T;

class FileParser {
  private static parsers = new Map<string, Parser<any>>([
    ['.json', (content) => JSON.parse(content)],
    ['.yaml', (content) => parseYaml(content)],
    ['.toml', (content) => parseToml(content)],
  ]);

  static registerParser(extension: string, parser: Parser<any>): void {
    this.parsers.set(extension, parser);
  }

  static async parse<T>(filePath: string): Promise<T> {
    const extension = path.extname(filePath);
    const parser = this.parsers.get(extension);

    if (!parser) {
      throw new UnsupportedFormatError(`No parser for extension: ${extension}`);
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return parser(content) as T;
    } catch (error) {
      throw new FileParseError(`Failed to parse file: ${filePath}`, error);
    }
  }

  static parseSync<T>(filePath: string): T {
    const extension = path.extname(filePath);
    const parser = this.parsers.get(extension);

    if (!parser) {
      throw new UnsupportedFormatError(`No parser for extension: ${extension}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return parser(content) as T;
    } catch (error) {
      throw new FileParseError(`Failed to parse file: ${filePath}`, error);
    }
  }
}
```

### Static Factory from File

```typescript
class WorkflowConfig {
  private constructor(
    public name: string,
    public steps: WorkflowStep[],
    public settings: WorkflowSettings
  ) {}

  static async fromFile(filePath: string): Promise<WorkflowConfig> {
    const data = await JsonLoader.load<WorkflowConfigData>(filePath);

    // Validate
    if (!data.name) {
      throw new ValidationError('Workflow config must have a name');
    }

    if (!Array.isArray(data.steps) || data.steps.length === 0) {
      throw new ValidationError('Workflow config must have at least one step');
    }

    return new WorkflowConfig(
      data.name,
      data.steps,
      data.settings || {}
    );
  }

  static fromFileSync(filePath: string): WorkflowConfig {
    const data = JsonLoader.loadSync<WorkflowConfigData>(filePath);

    // Validate
    if (!data.name) {
      throw new ValidationError('Workflow config must have a name');
    }

    if (!Array.isArray(data.steps) || data.steps.length === 0) {
      throw new ValidationError('Workflow config must have at least one step');
    }

    return new WorkflowConfig(
      data.name,
      data.steps,
      data.settings || {}
    );
  }

  static async fromDirectory(directoryPath: string): Promise<WorkflowConfig[]> {
    const files = await fs.promises.readdir(directoryPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const configs = await Promise.all(
      jsonFiles.map(file =>
        this.fromFile(path.join(directoryPath, file))
      )
    );

    return configs;
  }
}
```

### Streaming File Parser

```typescript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

class StreamParser {
  static async parseLines<T>(
    filePath: string,
    parser: (line: string, index: number) => T
  ): Promise<T[]> {
    const results: T[] = [];

    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let index = 0;
    for await (const line of rl) {
      try {
        const parsed = parser(line, index);
        results.push(parsed);
        index++;
      } catch (error) {
        throw new LineParseError(`Failed to parse line ${index + 1}`, error);
      }
    }

    return results;
  }

  static async parseCSV(filePath: string): Promise<Record<string, string>[]> {
    const lines = await this.parseLines(filePath, (line) => line);
    if (lines.length === 0) return [];

    const headers = lines[0].split(',');
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }

      rows.push(row);
    }

    return rows;
  }
}
```

### Best Practices for File Loading Static Methods

1. **Provide both sync and async versions** when appropriate
2. **Use generics** for type-safe parsing
3. **Validate file contents** after parsing
4. **Provide clear error messages** with file paths
5. **Handle encoding explicitly** (utf-8, etc.)
6. **Support multiple formats** through parser registry
7. **Consider streaming** for large files
8. **Document file format requirements** in JSDoc

---

## 4. JSDoc Documentation Patterns

### Overview

Proper JSDoc documentation is crucial for static methods, as they often serve as API entry points. TypeScript provides excellent JSDoc support with type checking.

### Basic Static Method Documentation

```typescript
class MathUtils {
  /**
   * Calculates the factorial of a number
   * @param {number} n - The number to calculate factorial for
   * @returns {number} The factorial of n
   * @static
   * @example
   * ```typescript
   * MathUtils.factorial(5) // Returns 120
   * ```
   */
  static factorial(n: number): number {
    if (n < 0) throw new Error('Negative numbers not supported');
    if (n === 0) return 1;
    return n * this.factorial(n - 1);
  }
}
```

### TypeScript-Specific Tags

```typescript
class CollectionUtils {
  /**
   * Filters an array based on a predicate function
   * @template T - The type of elements in the array
   * @param {T[]} array - The array to filter
   * @param {(item: T, index: number) => boolean} predicate - Function to test each element
   * @returns {T[]} A new array with only elements that pass the predicate
   * @static
   */
  static filter<T>(
    array: T[],
    predicate: (item: T, index: number) => boolean
  ): T[] {
    return array.filter(predicate);
  }

  /**
   * Maps array elements to a new type
   * @template T - The input type
   * @template U - The output type
   * @param {T[]} array - The array to map
   * @param {(item: T, index: number) => U} mapper - Function to transform elements
   * @returns {U[]} A new array with transformed elements
   * @static
   */
  static map<T, U>(
    array: T[],
    mapper: (item: T, index: number) => U
  ): U[] {
    return array.map(mapper);
  }
}
```

### Async Method Documentation

```typescript
class Database {
  /**
   * Executes a query and returns the results
   * @template T - The expected return type
   * @param {string} sql - The SQL query to execute
   * @param {any[]} [params=[]] - Query parameters
   * @returns {Promise<T>} Promise resolving to query results
   * @throws {QueryError} If the query fails
   * @static
   * @example
   * ```typescript
   * const users = await Database.query<User[]>(
   *   'SELECT * FROM users WHERE active = ?',
   *   [true]
   * )
   * ```
   */
  static async query<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    // Implementation
  }
}
```

### Factory Method Documentation

```typescript
class User {
  private constructor(
    private email: string,
    private passwordHash: string,
    private role: UserRole
  ) {}

  /**
   * Creates a new admin user
   * @param {string} email - Admin email address
   * @param {string} password - Plain text password (will be hashed)
   * @returns {Promise<User>} Promise resolving to created admin user
   * @throws {ValidationError} If email or password is invalid
   * @static
   */
  static async createAdmin(
    email: string,
    password: string
  ): Promise<User> {
    // Implementation
  }

  /**
   * Creates a user from a JSON object
   * @param {UserData} data - User data object
   * @returns {User} New user instance
   * @static
   */
  static fromJSON(data: UserData): User {
    // Implementation
  }
}
```

### Method Overload Documentation

```typescript
class Converter {
  /**
   * Converts a value to a different type
   * @overload
   * @param {string} value - String value to convert
   * @returns {number} Converted number
   * @static
   */

  /**
   * Converts a value to a different type
   * @overload
   * @param {number} value - Number value to convert
   * @returns {string} Converted string
   * @static
   */

  /**
   * Converts a value to a different type
   * @param {string | number} value - Value to convert
   * @returns {string | number} Converted value
   * @static
   */
  static convert(value: string | number): string | number {
    return typeof value === 'string'
      ? parseFloat(value)
      : String(value);
  }
}
```

### Error Documentation

```typescript
class FileReader {
  /**
   * Reads and parses a JSON file
   * @template T - Expected type of parsed JSON
   * @param {string} filePath - Path to the JSON file
   * @param {Object} [options] - Optional settings
   * @param {boolean} [options.strict=true] - Enable strict parsing
   * @param {string} [options.encoding='utf-8'] - File encoding
   * @returns {Promise<T>} Promise resolving to parsed JSON
   * @throws {FileNotFoundError} If the file doesn't exist
   * @throws {JsonParseError} If the file contains invalid JSON
   * @throws {ValidationError} If the file doesn't match expected schema
   * @static
   */
  static async readJSON<T>(
    filePath: string,
    options?: {
      strict?: boolean;
      encoding?: string;
    }
  ): Promise<T> {
    // Implementation
  }
}
```

### Documentation Best Practices

1. **Always document static methods** - they're part of your public API
2. **Use `@static` tag** - explicitly marks the method as static
3. **Document all parameters** with `@param` and types
4. **Document return types** with `@returns`
5. **Use `@template`** for generic type parameters
6. **Document thrown errors** with `@throws`
7. **Provide examples** with `@example` for complex methods
8. **Document all overloads** when using method overloading
9. **Use proper formatting** - consistent indentation and spacing
10. **Keep descriptions concise** but informative

---

## 5. Type Safety Patterns

### Overview

TypeScript static methods can leverage advanced type system features for maximum type safety. Let's explore patterns for generics, return type inference, and type guards.

### Generic Static Methods

```typescript
class ArrayUtils {
  /**
   * Creates an array from an iterable
   */
  static from<T>(iterable: Iterable<T> | ArrayLike<T>): T[] {
    return Array.from(iterable);
  }

  /**
   * Creates an array of a specific length filled with a value
   */
  static fill<T>(length: number, value: T): T[] {
    return Array(length).fill(value);
  }

  /**
   * Zips multiple arrays together
   */
  static zip<T, U>(a: T[], b: U[]): Array<[T, U]> {
    return a.map((value, index) => [value, b[index]]);
  }
}
```

### Type Parameter Inference

```typescript
class Collection {
  /**
   * Type inference works automatically when called
   */
  static of<T>(...items: T[]): T[] {
    return items;
  }

  /**
   * Explicit type parameter when needed
   */
  static empty<T>(): T[] {
    return [];
  }
}

// Type inference
const numbers = Collection.of(1, 2, 3); // number[]
const strings = Collection.of('a', 'b', 'c'); // string[]

// Explicit type
const users: User[] = Collection.empty<User>();
```

### Generic Constraints

```typescript
class EntityUtils {
  /**
   * Requires T to have an id property
   */
  static findById<T extends { id: string }>(
    entities: T[],
    id: string
  ): T | undefined {
    return entities.find(e => e.id === id);
  }

  /**
   * Requires T to have a specific method
   */
  static sortByKey<T extends { getKey(): string }>(
    items: T[]
  ): T[] {
    return [...items].sort((a, b) =>
      a.getKey().localeCompare(b.getKey())
    );
  }

  /**
   * Requires T to be a class constructor
   */
  static createInstance<T>(
    constructor: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    return new constructor(...args);
  }
}
```

### Return Type Inference

```typescript
class ObjectMapper {
  /**
   * Infers return type based on input type
   */
  static pick<T, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      result[key] = obj[key];
    });
    return result;
  }

  /**
   * Returns partial type
   */
  static partial<T>(obj: T): Partial<T> {
    return obj;
  }

  /**
   * Returns required type
   */
  static required<T>(obj: T): Required<T> {
    return obj as Required<T>;
  }
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

const user: User = {
  id: '1',
  name: 'John',
  email: 'john@example.com',
  age: 30
};

const partial = ObjectMapper.pick(user, ['id', 'name']);
// Type: Pick<User, 'id' | 'name'> = { id: string; name: string; }
```

### Conditional Return Types

```typescript
class Validator {
  /**
   * Returns different types based on validation result
   */
  static validate<T>(
    value: unknown,
    guard: (value: unknown) => value is T
  ): value is T {
    return guard(value);
  }

  /**
   * Type guard with assertion
   */
  static assertIs<T>(
    value: unknown,
    guard: (value: unknown) => value is T,
    message = 'Type assertion failed'
  ): asserts value is T {
    if (!guard(value)) {
      throw new TypeError(message);
    }
  }
}

// Usage
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

const value: unknown = 'hello';

if (Validator.validate(value, isString)) {
  // value is now string
  value.toUpperCase();
}

Validator.assertIs(value, isString);
// value is now string
```

### Fluent Interface Pattern

```typescript
class QueryBuilder<T> {
  private constructor(
    private query: string,
    private params: any[]
  ) {}

  static create<T>(): QueryBuilder<T> {
    return new QueryBuilder<T>('', []);
  }

  select(columns: string[]): this {
    this.query = `SELECT ${columns.join(', ')}`;
    return this;
  }

  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }

  where(condition: string, ...params: any[]): this {
    this.query += ` WHERE ${condition}`;
    this.params.push(...params);
    return this;
  }

  async execute(): Promise<T[]> {
    // Execute query and return results
    return [];
  }
}

// Usage with type inference
const users = await QueryBuilder.create<User>()
  .select(['id', 'name'])
  .from('users')
  .where('active = ?', true)
  .execute();
// Type: User[]
```

### Discriminated Union Pattern

```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

class ResultFactory {
  /**
   * Creates a successful result
   */
  static success<T>(value: T): Result<T> {
    return { success: true, value };
  }

  /**
   * Creates a failed result
   */
  static failure<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  }

  /**
   * Wraps a function call in a Result
   */
  static async fromAsync<T>(
    fn: () => Promise<T>
  ): Promise<Result<T>> {
    try {
      const value = await fn();
      return this.success(value);
    } catch (error) {
      return this.failure(error as Error);
    }
  }

  /**
   * Type guard for success
   */
  static isSuccess<T, E>(
    result: Result<T, E>
  ): result is { success: true; value: T } {
    return result.success;
  }

  /**
   * Type guard for failure
   */
  static isFailure<T, E>(
    result: Result<T, E>
  ): result is { success: false; error: E } {
    return !result.success;
  }
}

// Usage
const result = await ResultFactory.fromAsync(async () => {
  return await fetchUser(userId);
});

if (ResultFactory.isSuccess(result)) {
  // result.value is User
  console.log(result.value.name);
} else {
  // result.error is Error
  console.error(result.error.message);
}
```

### Type Safety Best Practices

1. **Use generics** for reusable static methods
2. **Leverage type inference** when possible
3. **Use generic constraints** to limit type parameters
4. **Provide type guards** for runtime type checking
5. **Use conditional types** for complex type relationships
6. **Document type parameters** with `@template`
7. **Consider readonly** for immutable return types
8. **Use utility types** (Partial, Required, Pick, etc.)
9. **Prefer type guards** over type assertions
10. **Test type safety** with TypeScript compiler

---

## 6. Common Pitfalls

### 1. Losing `this` Context

**Problem:**
```typescript
class MyClass {
  static value = 42;

  static getValue() {
    return this.value; // 'this' refers to MyClass, works fine
  }

  static getDoubleValue() {
    return this.value * 2; // Works
  }
}
```

**Better:**
```typescript
class MyClass {
  private static value = 42;

  static getValue() {
    return MyClass.value; // Explicit class reference
  }
}
```

### 2. Overusing Static Methods

**Problem:**
```typescript
// Everything is static - no encapsulation
class UserService {
  static users: User[] = [];

  static async fetchUsers() { }
  static async saveUser(user: User) { }
  static validateUser(user: User) { }
}
```

**Better:**
```typescript
// Instance-based for state, static for utilities
class UserService {
  private users: User[] = [];

  async fetchUsers() { }
  async saveUser(user: User) { }
  validateUser(user: User) { }

  static fromConfig(config: Config): UserService {
    // Factory method
    return new UserService();
  }
}
```

### 3. Not Handling Async Errors

**Problem:**
```typescript
class DataLoader {
  static async load<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json(); // No error handling
  }
}
```

**Better:**
```typescript
class DataLoader {
  static async load<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new NetworkError(`Failed to load from ${url}`, error);
    }
  }
}
```

### 4. Missing Type Parameters

**Problem:**
```typescript
class Parser {
  static parse(json: string): any {
    return JSON.parse(json);
  }
}
```

**Better:**
```typescript
class Parser {
  static parse<T>(json: string): T {
    return JSON.parse(json) as T;
  }
}

const user = Parser.parse<User>(jsonString);
```

### 5. Not Validating in Factory Methods

**Problem:**
```typescript
class Email {
  private constructor(private value: string) {}

  static create(value: string): Email {
    return new Email(value); // No validation
  }
}
```

**Better:**
```typescript
class Email {
  private constructor(private value: string) {}

  static create(value: string): Email {
    if (!this.isValid(value)) {
      throw new ValidationError(`Invalid email: ${value}`);
    }
    return new Email(value);
  }

  private static isValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
```

### 6. Mixing Instance and Static State

**Problem:**
```typescript
class Counter {
  static count = 0; // Shared across all instances

  constructor() {
    Counter.count++; // Modifies static state
  }
}
```

**Better:**
```typescript
class Counter {
  private count = 0; // Instance state

  increment(): void {
    this.count++;
  }

  // Static only for class-level operations
  static createWithCount(start: number): Counter {
    const counter = new Counter();
    counter['count'] = start; // Only in factory
    return counter;
  }
}
```

### 7. Not Documenting Static Methods

**Problem:**
```typescript
class Utils {
  static format(date: Date, fmt: string): string {
    // What format strings are supported?
    // What does this return?
  }
}
```

**Better:**
```typescript
class DateUtils {
  /**
   * Formats a date according to the specified format string
   * @param {Date} date - The date to format
   * @param {string} format - Format string (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')
   * @returns {string} Formatted date string
   * @throws {Error} If format string is invalid
   * @static
   * @example
   * ```typescript
   * DateUtils.format(new Date(), 'YYYY-MM-DD') // '2025-01-24'
   * ```
   */
  static format(date: Date, format: string): string {
    // Implementation
  }
}
```

### 8. Ignoring Return Types

**Problem:**
```typescript
class Calculator {
  static add(a: number, b: number) {
    return a + b; // What's the return type?
  }
}
```

**Better:**
```typescript
class Calculator {
  static add(a: number, b: number): number {
    return a + b;
  }

  static sum(...numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0);
  }
}
```

---

## 7. References

### Official TypeScript Documentation

- **Classes and Static Members**: https://www.typescriptlang.org/docs/handbook/2/classes.html
- **Generics**: https://www.typescriptlang.org/docs/handbook/2/generics.html
- **Type Inference**: https://www.typescriptlang.org/docs/handbook/type-inference.html
- **Utility Types**: https://www.typescriptlang.org/docs/handbook/utility-types.html
- **JSDoc Reference**: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **Declaration Files**: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html

### Community Resources

- **Pattern: Static Factory Methods** (Effective TypeScript)
  - Provides best practices for factory method patterns
  - Discusses when to use static methods vs constructors

- **Async/Await Best Practices** (TypeScript Deep Dive)
  - Patterns for async static methods
  - Error handling strategies

- **JSDoc Documentation** (TypeScript Handbook)
  - Official JSDoc tag reference
  - Type checking with JSDoc

### Additional Reading

- **Design Patterns: Factory Pattern**
  - Classic factory pattern implementation in TypeScript
  - Static method roles in creational patterns

- **Type-Safe File Loading**
  - Generic file parser implementations
  - Type guard patterns for runtime validation

- **TypeScript Utility Types**
  - `Partial<T>`, `Required<T>`, `Pick<T>`, `Omit<T>`
  - Using utility types with static methods

---

## Key Takeaways

### When to Use Static Methods

1. **Factory methods** - Object creation with validation or logic
2. **Utility functions** - Stateless operations (e.g., `MathUtils`)
3. **File I/O** - Loading/parsing operations
4. **API clients** - Singleton service interfaces
5. **Constants/Config** - Shared configuration values

### Best Practices Summary

1. ✅ **Make constructors private** when using factory methods
2. ✅ **Use descriptive names** (`create`, `from`, `parse`, `load`)
3. ✅ **Return explicit types** with generics for type safety
4. ✅ **Document thoroughly** with JSDoc including examples
5. ✅ **Handle errors appropriately** - wrap or rethrow
6. ✅ **Validate inputs** in factory methods
7. ✅ **Provide both sync/async** versions when appropriate
8. ✅ **Use type guards** for runtime type checking

### Common Anti-Patterns

1. ❌ Overusing static methods for stateful operations
2. ❌ Mixing instance and static state
3. ❌ Not handling async errors
4. ❌ Missing type parameters
5. ❌ Skipping validation in factory methods
6. ❌ Poor or missing documentation
7. ❌ Ignoring return types

### Recommended Patterns

1. **Static Factory** with validation
2. **Generic static methods** with type inference
3. **Result types** for error handling
4. **Type guards** for runtime validation
5. **Builder pattern** with fluent interface
6. **Registry pattern** for extensible parsers

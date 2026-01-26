# JSDoc/TypeScript Documentation Quick Reference

## Parameter Documentation Patterns

### Required Parameter
```typescript
/**
 * @param {string} name - The user's name (required)
 */
function greet(name: string) {}
```

### Optional Parameter
```typescript
/**
 * @param {string} [name] - The user's name (optional)
 */
function greet(name?: string) {}
```

### Optional with Default Value
```typescript
/**
 * @param {string} [name="Guest"] - The user's name (defaults to "Guest")
 */
function greet(name: string = "Guest") {}
```

### Object Parameter with Optional Properties
```typescript
/**
 * @param {Object} options - Configuration options
 * @param {boolean} [options.verbose=false] - Enable verbose output
 * @param {number} [options.timeout=5000] - Timeout in milliseconds
 */
function configure(options: { verbose?: boolean; timeout?: number }) {}
```

### Function Parameter
```typescript
/**
 * @param {(error: Error | null, data: string) => void} callback - Callback function
 */
function fetchData(callback: (error: Error | null, data: string) => void) {}
```

## Return Value Documentation

### Simple Return
```typescript
/**
 * @returns {string} The formatted string
 */
function format(): string {}
```

### Union Return
```typescript
/**
 * @returns {User | null} The user object, or null if not found
 */
function getUser(): User | null {}
```

### Promise Return
```typescript
/**
 * @returns {Promise<Data>} A promise that resolves to the data
 */
async function fetchData(): Promise<Data> {}
```

## Side Effect Documentation

### Mutation
```typescript
/**
 * Sorts the array in place in ascending order.
 * @param {number[]} arr - The array to sort
 * @returns {void}
 * @modifies arr
 */
function sortInPlace(arr: number[]): void {}
```

### Event Emission
```typescript
/**
 * Processes the data and emits a 'complete' event.
 * @param {Data} data - The data to process
 * @fires Event#complete
 */
function process(data: Data): void {}
```

### State Change
```typescript
/**
 * Updates the internal cache and triggers a re-render.
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 */
function updateCache(key: string, value: any): void {}
```

## Complete Examples

### Simple Function
```typescript
/**
 * Creates a new user account with the provided credentials.
 *
 * @param username - The desired username (must be unique)
 * @param email - The user's email address
 * @param [isAdmin=false] - Whether the user should have admin privileges
 * @returns The newly created user object
 * @throws {ValidationError} If username or email is invalid
 * @throws {ConflictError} If username already exists
 *
 * @example
 * ```ts
 * const user = createUser('john_doe', 'john@example.com');
 * console.log(user.id); // '12345'
 * ```
 */
function createUser(
  username: string,
  email: string,
  isAdmin: boolean = false
): User {}
```

### Configuration Object
```typescript
/**
 * Configures the application with the specified options.
 *
 * @param options - Configuration options
 * @param [options.verbose=false] - Enable verbose logging output
 * @param [options.timeout=5000] - Request timeout in milliseconds
 * @param [options.retries=3] - Number of retry attempts for failed requests
 * @param [options.logLevel='info'] - Logging level ('debug', 'info', 'warn', 'error')
 * @returns {void}
 *
 * @example
 * ```ts
 * configure({
 *   verbose: true,
 *   timeout: 10000,
 *   logLevel: 'debug'
 * });
 * ```
 */
function configure(options: {
  verbose?: boolean;
  timeout?: number;
  retries?: number;
  logLevel?: string;
}): void {}
```

### Async Function with Error Handling
```typescript
/**
 * Fetches user data from the remote server.
 *
 * @param userId - The unique identifier of the user
 * @param [includeProfile=false] - Whether to include profile data
 * @returns A promise that resolves to the user data, or null if not found
 * @throws {NetworkError} If the request fails due to network issues
 * @throws {AuthenticationError} If the request is not authenticated
 *
 * @example
 * ```ts
 * try {
 *   const user = await fetchUser('user123', true);
 *   console.log(user.profile);
 * } catch (error) {
 *   console.error('Failed to fetch user:', error);
 * }
 * ```
 */
async function fetchUser(
  userId: string,
  includeProfile: boolean = false
): Promise<User | null> {}
```

### Method with Side Effects
```typescript
/**
 * Adds a new policy to the pipeline and returns the updated pipeline.
 *
 * This method modifies the pipeline in place and also returns it for
 * method chaining. The policy will be applied to all requests going
 * through the pipeline.
 *
 * @param policy - The policy to add to the pipeline
 * @param [phase='request'] - When to apply the policy ('request' or 'response')
 * @returns The modified pipeline instance for chaining
 * @modifies this
 *
 * @example
 * ```ts
 * pipeline
 *   .addPolicy(retryPolicy, 'request')
 *   .addPolicy(loggingPolicy, 'response')
 *   .sendRequest(request);
 * ```
 */
addPolicy(policy: PipelinePolicy, phase?: 'request' | 'response'): Pipeline {}
```

## Common Tags Reference

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param` | Document a parameter | `@param {string} name - The name` |
| `@returns` | Document return value | `@returns {boolean} True if successful` |
| `@throws` | Document thrown errors | `@throws {Error} When invalid input` |
| `@example` | Provide usage example | `@example const x = fn();` |
| `@deprecated` | Mark as deprecated | `@deprecated Use newFn() instead` |
| `@see` | Cross-reference | `@see OtherFunction` |
| `@internal` | Internal API | `@internal` |
| `@fires` | Document events | `@fires Event#complete` |
| `@modifies` | Document mutations | `@modifies arr` |
| `@default` | Default value | `@default 100` |
| `@template` | Generic type | `@template T` |

## Best Practices Summary

1. **Always** document public APIs with clear descriptions
2. **Use** square brackets `[param]` for optional parameters
3. **Mention** default values in parameter descriptions
4. **Document** all side effects (mutations, events, state changes)
5. **Specify** exact types, avoid `any` or `Object`
6. **Include** `@throws` for functions that can throw
7. **Add** `@example` for complex or non-obvious functions
8. **Use** present tense: "gets", "sets", "creates", "returns"
9. **Be** consistent with terminology across your codebase
10. **Focus** on user's perspective, not implementation details

## Common Anti-Patterns to Avoid

❌ **Don't:** Repeat the function name in the description
```typescript
// Bad
/**
 * getUser - Gets the user
 */
function getUser() {}

// Good
/**
 * Retrieves the user from the database by ID
 */
function getUser() {}
```

❌ **Don't:** Use vague types
```typescript
// Bad
@param {Object} options - Options

// Good
@param {{ timeout: number, retries?: number }} options - Request options
```

❌ **Don't:** Forget default values
```typescript
// Bad
@param {number} [timeout]

// Good
@param {number} [timeout=5000] - Request timeout in milliseconds
```

❌ **Don't:** Hide side effects
```typescript
// Bad
/**
 * Processes the data
 */
function process(data) {
  emit('done');
  cache.set(data.id, data);
}

// Good
/**
 * Processes the data, updates the cache, and emits a 'done' event.
 * @fires Event#done
 * @modifies cache
 */
function process(data) {}
```

## TypeScript-Specific Tips

1. **Prefer** TypeScript types over JSDoc types when possible
2. **Use** type inference for simple cases
3. **Document** generic constraints:
   ```typescript
   /**
    * @template T - The type of items in the array
    * @param {T[]} items - Array of items
    * @returns {T} The first item
    */
   function first<T>(items: T[]): T | undefined {}
   ```

4. **Document** complex return types with interfaces:
   ```typescript
   /**
    * @returns {Result<User>} The operation result with user data
    */
   interface Result<T> {
     success: boolean;
     data?: T;
     error?: Error;
   }
   ```

---

For more detailed information, see [jsdoc-typescript-best-practices.md](./jsdoc-typescript-best-practices.md)

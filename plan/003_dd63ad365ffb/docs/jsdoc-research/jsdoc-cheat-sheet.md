# JSDoc/TypeScript Documentation Cheat Sheet

## Quick Syntax Reference

### Parameters
```
@param {Type} name          - Required parameter
@param {Type} [name]        - Optional parameter
@param {Type} [name=default]- Optional with default
```

### Returns
```
@returns {Type} Description
@returns {Type | null} Description
@returns {Promise<Type>} Description
```

### Other Common Tags
```
@throws {ErrorType} Description
@example code here
@deprecated Use newFunction() instead
@see OtherFunction
@internal
@fires Event#name
@modifies variable
```

## Standard Patterns

### 1. Simple Function
```typescript
/**
 * One-line summary of what the function does.
 *
 * @param param1 - Description of param1
 * @param [param2] - Description of optional param2
 * @returns Description of return value
 */
function myFunction(param1: string, param2?: number): boolean {}
```

### 2. Configuration Object
```typescript
/**
 * Summary of function.
 *
 * @param options - Configuration options
 * @param [options.verbose=false] - Enable verbose output
 * @param [options.timeout=5000] - Timeout in ms
 */
function configure(options: {
  verbose?: boolean;
  timeout?: number;
}): void {}
```

### 3. Async Function
```typescript
/**
 * Summary of async operation.
 *
 * @param id - The identifier
 * @returns Promise that resolves to the result
 * @throws {NetworkError} If request fails
 */
async function fetchData(id: string): Promise<Result> {}
```

### 4. Function with Side Effects
```typescript
/**
 * Summary with side effects noted.
 * Modifies the cache and emits an event.
 *
 * @param key - The cache key
 * @param value - The value to store
 * @fires Event#cached
 * @modifies cache
 */
function updateCache(key: string, value: any): void {}
```

## Best Practices Checklist

- [ ] Summary line starts with a verb (gets, sets, creates, etc.)
- [ ] All params have types and descriptions
- [ ] Optional params use `[name]` syntax
- [ ] Default values mentioned in description
- [ ] Return value documented with `@returns`
- [ ] Side effects clearly described
- [ ] Throwing conditions with `@throws`
- [ ] Examples for complex functions
- [ ] Consistent terminology
- [ ] No `any` types (use specific types)

## Common Mistakes to Avoid

❌ Don't repeat function name in description
❌ Don't use `Object` or `any` - be specific
❌ Don't forget to document optional param defaults
❌ Don't hide side effects
❌ Don't omit return types for public APIs
❌ Don't use past tense (use present tense)

## Type Examples

```typescript
{string}              // Simple type
{string | number}     // Union type
{string[]}            // Array of strings
{Object}              // Generic object (avoid)
{{a: string, b?: number}}  // Object with properties
{(n: number) => void} // Function type
{Promise<Type>}       // Promise
{Type | null}         // Nullable
```

## Key Sources to Reference

- **TypeScript**: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **TSDoc**: https://tsdoc.org/
- **Node.js examples**: https://github.com/nodejs/node/blob/main/lib/fs.js
- **TypeScript source**: https://github.com/microsoft/TypeScript/tree/main/src/compiler

---

For complete documentation, see:
- `/home/dustin/projects/groundswell/research/jsdoc-typescript-best-practices.md`
- `/home/dustin/projects/groundswell/research/jsdoc-quick-reference.md`

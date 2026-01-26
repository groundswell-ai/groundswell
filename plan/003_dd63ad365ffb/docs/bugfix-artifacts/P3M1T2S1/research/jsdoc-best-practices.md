# JSDoc Best Practices for Default Parameter Documentation

## Official Documentation

1. **JSDoc Official Documentation - @param tag**: https://jsdoc.app/tags-param.html
2. **TypeScript JSDoc Reference**: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
3. **JSDoc Getting Started**: https://jsdoc.app/about-getting-started.html

## Recommended Patterns

### Pattern 1: Inline Default in Parameter Signature (Most Common)

```javascript
/**
 * Creates a user account
 * @param {string} username - The username
 * @param {boolean} [isActive=true] - Whether the account is active
 * @param {string} [role="user"] - User role
 */
function createUser(username, isActive = true, role = "user") {
  // implementation
}
```

### Pattern 2: Default in Description with "(default: value)"

```javascript
/**
 * Formats a number
 * @param {number} num - The number to format
 * @param {number} [decimals] - Number of decimal places (default: 2)
 * @param {string} [locale] - Locale for formatting (default: "en-US")
 */
function formatNumber(num, decimals = 2, locale = "en-US") {
  // implementation
}
```

### Pattern 3: Explicit @default Tag

```javascript
/**
 * Sends an HTTP request
 * @param {string} url - The URL to request
 * @param {Object} [options] - Request options
 * @param {number} [options.timeout] - Request timeout in milliseconds
 * @default 5000
 * @param {boolean} [options.retry] - Whether to retry on failure
 * @default true
 */
function fetch(url, options = {}) {
  // implementation
}
```

### Pattern 4: Object Property Defaults

```javascript
/**
 * Configures the logger
 * @param {Object} [config={}] - Configuration object
 * @param {string} [config.level="info"] - Log level
 * @param {boolean} [config.timestamp=true] - Include timestamps
 * @param {string[]} [config.transports=[]] - Output transports
 */
function configureLogger(config = {}) {
  const { level = "info", timestamp = true, transports = [] } = config;
  // implementation
}
```

## Concrete Examples from Real Projects

### Example 1: Express.js Style Middleware

```javascript
/**
 * Middleware to parse JSON bodies
 * @param {Object} [options] - Parser options
 * @param {number} [options.limit=100kb] - Maximum body size
 * @param {boolean} [options.inflate=true] - Handle inflated bodies
 * @param {string} [options.reviver] - Reviver function for parsing
 */
function jsonParser(options = {}) {
  // implementation
}
```

### Example 2: Lodash/Underscore Style Utility Functions

```javascript
/**
 * Creates an array of elements split into groups the length of size
 * @param {Array} array - The array to process
 * @param {number} [size=1] - The length of each chunk
 * @returns {Array} The new array of chunks
 */
function chunk(array, size = 1) {
  // implementation
}
```

### Example 3: TypeScript JSDoc Pattern with Type Definitions

```javascript
/**
 * Represents a user in the system
 * @typedef {Object} User
 * @property {string} name - The user's name
 * @property {number} [age] - The user's age
 * @property {boolean} [active=true] - Whether the user is active
 */

/**
 * Creates a new user
 * @param {string} name - User's name
 * @param {Partial<User>} [options] - Additional user properties
 * @returns {User} The created user
 */
function createUser(name, options = {}) {
  return { name, active: true, ...options };
}
```

### Example 4: VS Code Extension API Style

```javascript
/**
 * Shows a selection dialog
 * @param {Object} options - Configuration options
 * @param {string} [options.title] - Title of the selection dialog
 * @param {string[]} [options.items] - Items to select from
 * @param {number} [options.selectedItem=0] - Index of the selected item
 * @param {boolean} [options.canPickMany=false] - Allow multiple selections
 */
function showQuickPick(options = {}) {
  // implementation
}
```

## Best Practices Summary

1. **Always use square brackets `[]` for optional parameters**: `[paramName]` indicates the parameter is optional
2. **Include default values in the parameter signature**: `[paramName=defaultValue]` shows the default inline
3. **Be consistent across your codebase** - choose one pattern and stick to it
4. **For complex objects**, document each property separately with its own default
5. **For boolean defaults**, always explicitly state the default value as it can be ambiguous
6. **Use the `@default` tag** for complex or lengthy default values that don't fit well inline
7. **TypeScript users**: Ensure JSDoc types match the actual default value types for proper type checking

## Syntax Quick Reference

```javascript
// String default
@param {string} [name="Guest"]

// Number default
@param {number} [count=0]

// Boolean default
@param {boolean} [enabled=true]

// Array default
@param {Array} [items=[]]

// Object default
@param {Object} [config={}]

// Null/undefined default
@param {string|null} [value=null]

// Function default
@param {Function} [callback=() => {}]

// Union type with default
@param {string|number} [id=0]

// Optional without explicit default (documented in description)
@param {string} [type] - Element type (default: "div")
```

## Key Takeaways for trackTiming Update

1. **The most common pattern** is `[paramName=defaultValue]` in the @param signature
2. **Alternative pattern**: Use `(default: value)` in the description for clarity
3. **For boolean defaults**, consider adding extra context when the default is "opt-out" (true by default, false to disable)
4. **Always match JSDoc types to actual implementation** for TypeScript users
5. **Consistency matters more than the specific pattern** - pick one and use it throughout

## Sources

- [JSDoc Official Documentation - @param](https://jsdoc.app/tags-param.html)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [JSDoc Getting Started](https://jsdoc.app/about-getting-started.html)

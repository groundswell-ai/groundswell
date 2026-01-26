# JSDoc/TypeScript Documentation Best Practices Research

## Research Date
2026-01-26

## Overview
This document compiles industry best practices for JSDoc and TypeScript documentation, focusing on:
1. Documenting default values clearly
2. Indicating required vs optional parameters
3. Documenting side effects
4. API documentation clarity

## Research Sources

### Primary Sources Analyzed:
- **TypeScript Compiler Source Code** - https://github.com/microsoft/TypeScript
- **Node.js Core Library** - https://github.com/nodejs/node
- **Azure SDK for JavaScript** - https://github.com/Azure/azure-sdk-for-js
- **ESLint** - https://github.com/eslint/eslint

---

## 1. Documenting Default Values

### Standard Patterns Found

#### Pattern 1: Inline in Parameter Description
```typescript
/**
 * Creates a unique temporary variable.
 * @param recordTempVariable An optional callback used to record the temporary variable name. This
 * should usually be a reference to `hoistVariableDeclaration` from a `TransformationContext`, but
 * can be `undefined` if you plan to record the temporary variable manually.
 * @param reservedInNestedScopes When `true`, reserves the temporary variable name in all nested scopes
 * during emit so that the variable can be referenced in a nested function body.
 */
```
**Source**: TypeScript `src/compiler/transformer.ts`

#### Pattern 2: Using `@default` Tag (Not commonly found in practice)
```javascript
/**
 * Tests a user's permissions for the file or directory
 * @param {string | Buffer | URL} path
 * @param {number} [mode]
 * @param {(err?: Error) => any} callback
 * @returns {void}
 */
function access(path, mode, callback) {
  if (typeof mode === 'function') {
    callback = mode;
    mode = F_OK;
  }
  // ...
}
```
**Source**: Node.js `lib/fs.js`

#### Pattern 3: Default in Implementation with Brackets in JSDoc
```javascript
/**
 * Sets the max listeners.
 * @param {number} n
 * @param {EventTarget[] | EventEmitter[]} [eventTargets]
 * @returns {void}
 */
EventEmitter.setMaxListeners =
  function(n = defaultMaxListeners, ...eventTargets) {
    // ...
  }
```
**Source**: Node.js `lib/events.js`

### Best Practices for Default Values

**✅ DO:**
- Use square brackets `[paramName]` to indicate optional parameters in JSDoc
- Mention default values in the parameter description when not obvious
- For boolean flags, describe the behavior when `true` vs `false`
- Use `@default` tag for complex default objects or when the default is non-obvious
- Show default values in the implementation: `function foo(param = defaultValue)`

**❌ DON'T:**
- Rely solely on the implementation to show defaults
- Use ambiguous language like "optional parameter" without explaining the default
- Document defaults that don't match the implementation
- Omit default values for configuration objects

---

## 2. Required vs Optional Parameters

### Standard Patterns Found

#### Pattern 1: Square Brackets for Optional (Universal Standard)
```javascript
/**
 * Creates a new `EventEmitter` instance.
 * @param {{ captureRejections?: boolean; }} [opts]
 * @constructs EventEmitter
 */
function EventEmitter(opts) {
  EventEmitter.init.call(this, opts);
}
```
**Source**: Node.js `lib/events.js`

#### Pattern 2: Inline Type Definitions with Optional Markers
```javascript
/**
 * Removes all listeners from the event emitter. (Only
 * removes listeners for a specific event name if specified
 * as `type`).
 * @param {string | symbol} [type]
 * @returns {EventEmitter}
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
```
**Source**: Node.js `lib/events.js`

#### Pattern 3: Union Types for Optionals
```javascript
/**
 * Asynchronously reads the entire contents of a file.
 * @param {string | Buffer | URL | number} path
 * @param {{
 *   encoding?: string | null;
 *   flag?: string;
 *   signal?: AbortSignal;
 *   } | string} [options]
 * @param {(
 *   err?: Error,
 *   data?: string | Buffer
 *   ) => any} callback
 * @returns {void}
 */
```
**Source**: Node.js `lib/fs.js`

#### Pattern 4: TypeScript Type System
```typescript
/**
 * Transforms an array of SourceFiles by passing them through each transformer.
 *
 * @param resolver The emit resolver provided by the checker.
 * @param host The emit host object used to interact with the file system.
 * @param options Compiler options to surface in the `TransformationContext`.
 * @param nodes An array of nodes to transform.
 * @param transforms An array of `TransformerFactory` callbacks.
 * @param allowDtsFiles A value indicating whether to allow the transformation of .d.ts files.
 *
 * @internal
 */
export function transformNodes<T extends Node>(
  resolver: EmitResolver | undefined,
  host: EmitHost | undefined,
  factory: NodeFactory,
  options: CompilerOptions,
  nodes: readonly T[],
  transformers: readonly TransformerFactory<T>[],
  allowDtsFiles: boolean
): TransformationResult<T>
```
**Source**: TypeScript `src/compiler/transformer.ts`

### Best Practices for Required/Optional

**✅ DO:**
- Use `[]` around parameter names in JSDoc: `[optionalParam]`
- Use `?` in TypeScript type annotations: `param?: Type`
- Explicitly document "optional" in description for complex cases
- Group optional parameters at the end of the parameter list
- Document what happens when optional parameters are omitted
- Use `| undefined` in TypeScript union types for clarity

**❌ DON'T:**
- Mix required and optional parameters (required params should come first)
- Use confusing naming like `optionalParam` without proper syntax
- Forget to document behavior when optional is omitted
- Overuse optional parameters - consider options objects instead

---

## 3. Documenting Side Effects

### Standard Patterns Found

#### Pattern 1: Explicit Description in Main Comment
```typescript
/**
 * Emits a node with possible substitution.
 *
 * @param hint A hint as to the intended usage of the node.
 * @param node The node to emit.
 * @param emitCallback The callback used to emit the node or its substitute.
 */
function substituteNode(hint: EmitHint, node: Node) {
  Debug.assert(state < TransformationState.Disposed, "Cannot substitute a node after the result is disposed.");
  return node && isSubstitutionEnabled(node) && onSubstituteNode(hint, node) || node;
}
```
**Source**: TypeScript `src/compiler/transformer.ts`

#### Pattern 2: Behavior Documentation
```javascript
/**
 * Enables before/after emit notifications in the pretty printer for the provided SyntaxKind.
 */
function enableEmitNotification(kind: SyntaxKind) {
  Debug.assert(state < TransformationState.Completed, "Cannot modify the transformation context after transformation has completed.");
  enabledSyntaxKindFeatures[kind] |= SyntaxKindFeatureFlags.EmitNotifications;
}
```
**Source**: TypeScript `src/compiler/transformer.ts`

#### Pattern 3: State Modification Documentation
```javascript
/**
 * Synchronously calls each of the listeners registered
 * for the event.
 * @param {string | symbol} type
 * @param {...any} [args]
 * @returns {boolean}
 */
EventEmitter.prototype.emit = function emit(type, ...args) {
  let doError = (type === 'error');
  // ...
}
```
**Source**: Node.js `lib/events.js`

#### Pattern 4: Mutation Documentation
```typescript
/**
 * Add a new policy to the pipeline.
 * @param policy - A policy that manipulates a request.
 * @param options - A set of options for when the policy should run.
 */
addPolicy(policy: PipelinePolicy, options?: AddPolicyOptions): void;
```
**Source**: Azure SDK `sdk/core/core-rest-pipeline/src/pipeline.ts`

### Best Practices for Side Effects

**✅ DO:**
- Document mutations clearly in the main description
- Use action verbs: "modifies", "transforms", "emits", "triggers"
- Document what gets modified (parameters, internal state, external resources)
- Document return values for methods with side effects
- Mention async side effects: "emits event", "writes to disk", "triggers callback"
- Use `@fires` or `@emits` tags for event emitters (if supported)
- Document validation/assertions that may throw

**❌ DON'T::**
- Hide side effects in implementation without documentation
- Use vague terms like "does something" without specifics
- Forget to document error throwing behavior
- Omit documentation of external state changes
- Assume side effects are obvious from function names

---

## 4. API Documentation Clarity

### Standard Patterns Found

#### Pattern 1: Clear Action-Oriented Descriptions
```typescript
/**
 * Gets a value indicating whether the specified path exists and is a file.
 * @param path The path to test.
 */
fileExists(path: string): boolean;
```
**Source**: TypeScript `src/compiler/types.ts`

#### Pattern 2: Comprehensive Parameter Documentation
```typescript
/**
 * Create a unique temporary variable.
 * @param recordTempVariable An optional callback used to record the temporary variable name. This
 * should usually be a reference to `hoistVariableDeclaration` from a `TransformationContext`, but
 * can be `undefined` if you plan to record the temporary variable manually.
 * @param reservedInNestedScopes When `true`, reserves the temporary variable name in all nested scopes
 * during emit so that the variable can be referenced in a nested function body. This is an alternative to
 * setting `EmitFlags.ReuseTempVariableScope` on the nested function itself.
 */
```
**Source**: TypeScript `src/compiler/transformer.ts`

#### Pattern 3: Return Value Documentation
```javascript
/**
 * Checks if the given node is the argument of a typeof operator.
 * @param {ASTNode} node The AST node being checked.
 * @returns {boolean} Whether or not the node is the argument of a typeof operator.
 */
function hasTypeOfOperator(node) {
  // ...
}
```
**Source**: ESLint `lib/rules/no-undef.js`

#### Pattern 4: Usage Context in Description
```javascript
/**
 * Tests whether or not the given path exists.
 * @param {string | Buffer | URL} path
 * @param {(exists?: boolean) => any} callback
 * @returns {void}
 */
function exists(path, callback) {
  // ...
}
```
**Source**: Node.js `lib/fs.js`

#### Pattern 5: Complex Type Documentation
```typescript
/**
 * Represents a pipeline for making a HTTP request to a URL.
 * Pipelines can have multiple policies to manage manipulating each request
 * before and after it is made to the server.
 */
export interface Pipeline {
  /**
   * Add a new policy to the pipeline.
   * @param policy - A policy that manipulates a request.
   * @param options - A set of options for when the policy should run.
   */
  addPolicy(policy: PipelinePolicy, options?: AddPolicyOptions): void;
  /**
   * Remove a policy from the pipeline.
   * @param options - Options that let you specify which policies to remove.
   */
  removePolicy(options: { name?: string; phase?: PipelinePhase }): PipelinePolicy[];
}
```
**Source**: Azure SDK `sdk/core/core-rest-pipeline/src/pipeline.ts`

### Best Practices for API Clarity

**✅ DO:**
- Start with a clear, action-oriented summary (verb-first)
- Use present tense: "gets", "sets", "creates", "transforms"
- Document all parameters with clear descriptions
- Always document return types with `@returns`
- Explain what the function does, not just how to call it
- Provide context for why/when to use the function
- Document constraints and requirements
- Use examples for complex APIs (in separate `@example` blocks)
- Keep descriptions concise but informative
- Document error conditions with `@throws`
- Use consistent terminology across related functions

**❌ DON'T:**
- Write descriptions that just repeat the function name
- Use overly technical jargon without explanation
- Omit parameter descriptions for "obvious" parameters
- Write novels - keep it focused on essential information
- Use abbreviations without defining them
- Document implementation details unless relevant to API users
- Forget to document non-obvious behaviors

---

## Common Anti-Patterns Found

### Anti-Pattern 1: Vague Optional Parameters
```javascript
// ❌ BAD
/**
 * @param {string} name
 * @param {Object} options
 */
function configure(name, options) {}

// ✅ GOOD
/**
 * @param {string} name - The configuration name
 * @param {Object} [options] - Optional configuration settings
 * @param {boolean} [options.verbose=false] - Enable verbose output
 * @param {number} [options.timeout=5000] - Request timeout in ms
 */
function configure(name, options) {}
```

### Anti-Pattern 2: Undocumented Side Effects
```javascript
// ❌ BAD
/**
 * Processes the request
 */
function process(req) {
  cache.set(req.id, req);
  emit('processed', req);
}

// ✅ GOOD
/**
 * Processes the request and caches the result.
 * Emits a 'processed' event upon completion.
 * @param {Request} req - The request to process
 * @fires Event#processed
 */
function process(req) {
  cache.set(req.id, req);
  emit('processed', req);
}
```

### Anti-Pattern 3: Missing Default Documentation
```javascript
// ❌ BAD
/**
 * @param {number} [retries]
 */
function fetch(url, retries) {}

// ✅ GOOD
/**
 * @param {number} [retries=3] - Number of retry attempts
 */
function fetch(url, retries = 3) {}
```

### Anti-Pattern 4: Unclear Return Values
```javascript
// ❌ BAD
/**
 * Gets the user data
 * @returns {Object}
 */
function getUser(id) {}

// ✅ GOOD
/**
 * Gets the user data for the given ID
 * @param {string} id - The user ID
 * @returns {User | null} The user object, or null if not found
 */
function getUser(id) {}
```

---

## Summary of Key Tags

### Essential JSDoc Tags:
- `@param {Type} paramName - Description` - Parameter documentation
- `@param {Type} [paramName] - Description` - Optional parameter
- `@param {Type} [paramName=default] - Description` - Optional with default
- `@returns {Type} Description` - Return value documentation
- `@throws {ErrorType} Description` - Exception documentation
- `@example Description \n code()` - Usage examples
- `@deprecated Description` - Deprecation notice
- `@see OtherFunction` - Cross-reference
- `@internal` - Internal API (not for public use)

### TypeScript-Specific:
- Use actual TypeScript types instead of JSDoc type annotations when possible
- Leverage type inference for simple cases
- Use `@template` for generic types in pure JSDoc

---

## Recommended Resources

### Official Documentation:
- **TypeScript JSDoc Reference**: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **TSDoc Standard**: https://tsdoc.org/
- **JSDoc Official Documentation**: https://jsdoc.app/

### Well-Documented Libraries to Study:
- **Node.js Core**: https://github.com/nodejs/node/tree/main/lib
- **TypeScript Compiler**: https://github.com/microsoft/TypeScript/tree/main/src/compiler
- **Azure SDK for JS**: https://github.com/Azure/azure-sdk-for-js
- **VSCode Extensions**: https://github.com/microsoft/vscode-extension-samples

### Tools:
- **TypeDoc**: https://typedoc.org/ - Documentation generator for TypeScript
- **TSDoc**: https://tsdoc.org/ - Standard for TypeScript API documentation
- **ESDoc**: https://esdoc.org/ - Good documentation generator for JSDoc

---

## Quick Reference Card

### Parameter Documentation
```typescript
// Required parameter
@param {string} name - The name (required)

// Optional parameter
@param {string} [name] - The name (optional)

// Optional with default
@param {string} [name="default"] - The name (defaults to "default")

// Optional union type
@param {string | number} [name] - The name (optional)

// Destructured parameter
@param {{ name: string, age?: number }} person - Person object

// Array parameter
@param {string[]} names - Array of names

// Function parameter
@param {(n: number) => void} callback - Callback function
```

### Return Documentation
```typescript
// Simple return
@returns {string} The result string

// Union return
@returns {string | null} The result, or null if not found

// Promise return
@returns {Promise<User>} A promise that resolves to the user

// Void return (can omit for obvious cases)
@returns {void}
```

### Special Tags
```typescript
/** @internal - Internal API, not for public use */
/** @deprecated - Use newFunction() instead */
/** @see getRelatedData - Related function */
/** @example const result = myFunction("test"); */
/** @throws {ValidationError} When validation fails */
```

---

## Implementation Checklist

When writing JSDoc/TypeScript documentation:

- [ ] Every public function/method has a clear summary
- [ ] All parameters are documented with types
- [ ] Optional parameters use `[paramName]` syntax
- [ ] Default values are mentioned in description or with `@default`
- [ ] Return values are documented with `@returns`
- [ ] Side effects are clearly described
- [ ] Throwing conditions documented with `@throws`
- [ ] Complex functions include `@example`
- [ ] Related functions linked with `@see`
- [ ] Internal APIs marked with `@internal`
- [ ] Deprecated items marked with `@deprecated`
- [ ] Consistent terminology used across module
- [ ] Types are specific (not just `Object`, `any`)
- [ ] Array types specify contents: `Type[]`
- [ ] Function types specify signatures

---

## Conclusion

The industry standard for JSDoc/TypeScript documentation emphasizes:
1. **Clarity over brevity** - Better to be slightly verbose than unclear
2. **Consistency** - Use the same patterns throughout your codebase
3. **Completeness** - Document all parameters, returns, and side effects
4. **Type specificity** - Use precise types, not generic `Object` or `any`
5. **User perspective** - Document what users need to know, not implementation details

The most common pattern across major libraries (Node.js, TypeScript, Azure SDK) is:
- Clear action-oriented summary
- Parameter types in braces, optional params in square brackets
- Descriptive parameter names and explanations
- Explicit return type documentation
- Side effects described in the main comment or with specific tags

Following these patterns ensures your documentation is consistent, clear, and follows industry best practices.

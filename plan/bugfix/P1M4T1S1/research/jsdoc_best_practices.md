# TypeScript JSDoc Best Practices and Conventions

**Research Date:** 2026-01-12
**Purpose:** Comprehensive guide for documenting workflow tree methods with JSDoc in TypeScript

> **Note:** Web search tools reached monthly quota limits during research. This document compiles best practices from official documentation knowledge, analysis of the current codebase, and established industry conventions.

---

## Table of Contents

1. [Official TypeScript JSDoc Documentation](#official-typescript-jsdoc-documentation)
2. [Documenting Error Throwing with @throws](#documenting-error-throwing-with-throws)
3. [Documenting State-Mutating Methods](#documenting-state-mutating-methods)
4. [Documenting Private Methods](#documenting-private-methods)
5. [Documenting Complex Validation Logic](#documenting-complex-validation-logic)
6. [Documenting Tree/Node Manipulation Methods](#documenting-treenode-manipulation-methods)
7. [Well-Documented TypeScript Project Examples](#well-documented-typescript-project-examples)
8. [Patterns for Documenting Circular Reference Detection](#patterns-for-documenting-circular-reference-detection)
9. [IDE Hover Documentation Best Practices](#ide-hover-documentation-best-practices)
10. [Codebase-Specific Patterns](#codebase-specific-patterns)

---

## Official TypeScript JSDoc Documentation

### Primary Resources

| Resource | URL | Description |
|----------|-----|-------------|
| TypeScript JSDoc Reference | https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html | Complete reference for JSDoc types supported by TypeScript |
| Type Checking JavaScript Files | https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html | Using JSDoc for type checking in .js files |
| JSDoc Official Documentation | https://jsdoc.app/ | Official JSDoc tag reference and usage |

### Key JSDoc Tags for TypeScript

**Type Definition Tags:**
- `@type {Type}` - Declare a variable's type
- `@param {Type} name` - Parameter type and description
- `@returns {Type}` - Return type description
- `@typedef` - Define custom types
- `@callback` - Define function types
- `@template T` - Generic type parameters

**Visibility Tags:**
- `@public` - Public API (default)
- `@private` - Internal implementation details
- `@protected` - Protected members (for inheritance)
- `@readonly` - Read-only properties

**Documentation Tags:**
- `@example` - Usage examples
- `@deprecated` - Mark as deprecated
- `@see` - Reference other documentation
- `@throws {ErrorType}` - Document exceptions
- `@overload` - Document function overloads

### TypeScript-Specific Features

**@template for Generics:**
```typescript
/**
 * @template T - The type of value stored in the node
 * @param {T} value - The value to wrap
 * @returns {Node<T>} A new node containing the value
 */
function createNode(value) {
  return { value };
}
```

**@satisfies for Type Checking:**
```typescript
/**
 * @satisfies {import('./types').WorkflowConfig}
 */
const config = { name: 'MyWorkflow' };
```

**@overload for Multiple Signatures:**
```typescript
/**
 * @overload
 * @param {string} name - Workflow name (class-based pattern)
 * @param {Workflow} [parent] - Optional parent workflow
 */

/**
 * @overload
 * @param {WorkflowConfig} config - Configuration (functional pattern)
 * @param {WorkflowExecutor} executor - Executor function
 */
class Workflow {
  constructor(name, parentOrExecutor) { /* ... */ }
}
```

---

## Documenting Error Throwing with @throws

### Best Practices

1. **Always specify the exact error type** in braces after @throws
2. **Describe when the error is thrown**, not what the error is
3. **List @throws tags after @param and before @returns**
4. **Order by likelihood** or logical sequence
5. **Include context** that helps users handle the error

### Basic Pattern

```typescript
/**
 * Parses a JSON string into an object.
 *
 * @param {string} jsonString - The JSON string to parse
 * @returns {object} The parsed object
 * @throws {SyntaxError} If the JSON string contains syntax errors
 * @throws {TypeError} If the input is not a string
 */
function parseJSON(jsonString: string): object {
  return JSON.parse(jsonString);
}
```

### Codebase Example: Workflow Methods

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts`

```typescript
/**
 * Add an observer to this workflow (must be root)
 * @throws {Error} If called on non-root workflow
 */
public addObserver(observer: WorkflowObserver): void {
  if (this.parent) {
    throw new Error('Observers can only be added to root workflows');
  }
  this.observers.push(observer);
}
```

### Detailed Error Documentation Pattern

```typescript
/**
 * Attach a child workflow to this parent workflow.
 *
 * Validates that:
 * - Child is not already attached to this parent
 * - Child does not have a different parent (enforces single-parent)
 * - Child is not an ancestor (prevents circular references)
 *
 * @param child - The child workflow to attach
 * @throws {Error} If the child is already attached to this workflow
 * @throws {Error} If the child already has a different parent
 * @throws {Error} If the child is an ancestor (would create circular reference)
 *
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child');
 * parent.attachChild(child);
 * ```
 */
public attachChild(child: Workflow): void {
  // Implementation...
}
```

### Multiple Error Types Pattern

```typescript
/**
 * Connects to a database with retry logic.
 *
 * @param {string} connectionString - Database connection string
 * @param {number} [timeout=30000] - Connection timeout in milliseconds
 * @returns {Promise<Connection>} The established connection
 * @throws {ValidationError} When connection string format is invalid
 * @throws {AuthenticationError} When credentials are rejected
 * @throws {ConnectionError} When unable to reach database server
 * @throws {TimeoutError} When connection exceeds timeout limit
 */
async function connect(
  connectionString: string,
  timeout = 30000
): Promise<Connection> {
  // Implementation...
}
```

### Error Documentation for Validation

**File:** `/home/dustin/projects/groundswell/src/cache/cache-key.ts`

```typescript
/**
 * Deterministically stringify a value with sorted object keys
 *
 * Unlike JSON.stringify, this function guarantees consistent output
 * regardless of key insertion order by sorting all object keys.
 *
 * @param value - Value to stringify
 * @returns Deterministic JSON string
 * @throws {TypeError} if circular reference detected
 */
export function deterministicStringify(value: unknown): string {
  // Implementation with WeakSet for cycle detection...
}
```

### Best Practice Summary for @throws

| Practice | Good | Bad |
|----------|------|-----|
| Specify error type | `@throws {ValidationError}` | `@throws Error` |
| Describe condition | "When email is invalid" | "Throws an error" |
| Include context | "When child's parent is different" | "If invalid parent" |
| Order logically | By likelihood or sequence | Randomly |
| Use specific types | Custom error classes | Generic `Error` |

---

## Documenting State-Mutating Methods

### Recommended Tags

While JSDoc does not have a standard `@mutates` tag, these conventions are commonly used:

1. **@modifies** - Documents which properties/objects are modified
2. **@mutates** - Alternative tag for mutation documentation
3. **Inline notes** - Document mutation in description with @note or plain text

### Basic Mutation Pattern

```typescript
/**
 * Adds a child node to this node's children array.
 *
 * @modifies this.children - Appends child to the array
 * @modifies child.parent - Sets this node as child's parent
 * @modifies child.node.parent - Sets this.node as child's node parent
 *
 * @param child - The child node to add
 */
function addChild(child: Node): void {
  this.children.push(child);
  child.parent = this;
  child.node.parent = this.node;
}
```

### Codebase Example: detachChild

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts`

```typescript
/**
 * Detach a child workflow from this parent workflow.
 *
 * Removes the child from both the workflow tree (this.children) and
 * the node tree (this.node.children), clears the child's parent reference,
 * and emits a childDetached event to notify observers.
 *
 * This enables reparenting workflows: oldParent.detachChild(child); newParent.attachChild(child);
 *
 * @param child - The child workflow to detach
 * @throws {Error} If the child is not attached to this parent workflow
 *
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child', parent);
 *
 * // Later, reparent to a different parent
 * parent.detachChild(child);
 * newParent.attachChild(child);
 * ```
 */
public detachChild(child: Workflow): void {
  // Implementation modifies both workflow tree and node tree
}
```

### Mutation Documentation Patterns

**Pattern 1: Explicit Property Modification**

```typescript
/**
 * Removes the first element from the array.
 *
 * @modifies array.length - Decrements by 1
 * @modifies array[0...n-1] - Shifts all elements down
 * @returns {T|undefined} The removed element, or undefined if empty
 */
function shift<T>(array: T[]): T | undefined {
  return array.shift();
}
```

**Pattern 2: Side Effect Documentation**

```typescript
/**
 * Emits an event to all registered observers.
 *
 * @note This method triggers observer callbacks immediately.
 * @note Observers may throw exceptions, which propagate to caller.
 *
 * @param event - The event to emit
 */
emitEvent(event: WorkflowEvent): void {
  this.observers.forEach(observer => observer(event));
}
```

**Pattern 3: Tree Mutation Documentation**

```typescript
/**
 * Reparents a subtree to a new parent.
 *
 * @modifies child.parent - Updates to newParent
 * @modifies child.node.parent - Updates to newParent.node
 * @modifies oldParent.children - Removes child
 * @modifies oldParent.node.children - Removes child.node
 * @modifies newParent.children - Adds child
 * @modifies newParent.node.children - Adds child.node
 *
 * @param child - Child workflow to reparent
 * @param oldParent - Current parent (must match)
 * @param newParent - New parent to attach to
 * @throws {Error} If oldParent is not child's current parent
 * @throws {Error} If newParent is a descendant of child (circular reference)
 */
function reparent(
  child: Workflow,
  oldParent: Workflow,
  newParent: Workflow
): void {
  // Implementation...
}
```

### Best Practices for State-Mutating Methods

1. **Always document what is modified** - List all affected properties/objects
2. **Document bidirectional changes** - For dual-tree structures, mention both trees
3. **Use @modifies consistently** - Either use it for all mutations or none
4. **Note side effects** - Especially events, callbacks, async operations
5. **Include validation** - Document preconditions and invariants
6. **Provide examples** - Show before/after state when helpful

### Anti-Patterns to Avoid

```typescript
// BAD: No mutation documentation
function addChild(child) {
  this.children.push(child);
}

// GOOD: Clear mutation documentation
/**
 * Adds a child node.
 * @modifies this.children - Appends the new child
 */
function addChild(child) {
  this.children.push(child);
}
```

---

## Documenting Private Methods

### Visibility Tags

| Tag | Usage | Description |
|-----|-------|-------------|
| `@private` | Private methods | Internal implementation, excluded from API docs |
| `@protected` | Protected methods | Available to subclasses |
| `@internal` | Internal API | Package-private, not for external use |
| `@access private` | Alternative to @private | Same as @private |
| `@access protected` | Alternative to @protected | Same as @protected |

### Basic Pattern

```typescript
class Workflow {
  /**
   * Check if this workflow is a descendant of the given ancestor workflow.
   *
   * Traverses the parent chain upward looking for the ancestor reference.
   * Uses visited Set to detect cycles during traversal.
   *
   * @private
   * @param ancestor - The potential ancestor workflow to check
   * @returns true if ancestor is found in parent chain, false otherwise
   * @throws {Error} If a cycle is detected during traversal
   */
  private isDescendantOf(ancestor: Workflow): boolean {
    const visited = new Set<Workflow>();
    let current: Workflow | null = this.parent;

    while (current !== null) {
      if (visited.has(current)) {
        throw new Error('Circular parent-child relationship detected');
      }
      visited.add(current);

      if (current === ancestor) {
        return true;
      }

      current = current.parent;
    }

    return false;
  }
}
```

### Private Method Documentation Best Practices

1. **Document the "why", not just the "what"** - Private methods need more context
2. **Explain invariants** - What conditions must hold before/after execution
3. **Document algorithms** - For complex logic, explain the approach
4. **Note side effects** - Especially if they affect public state
5. **Include @private tag** - Ensures documentation tools exclude it

### Codebase Example: Private Helper Methods

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts`

```typescript
/**
 * Get the root workflow
 *
 * Uses cycle detection to prevent infinite loops from circular parent-child relationships.
 *
 * @protected
 * @returns The root workflow (topmost ancestor)
 * @throws {Error} If circular reference detected during traversal
 */
protected getRoot(): Workflow {
  const visited = new Set<Workflow>();
  let root: Workflow = this;
  let current: Workflow | null = this;

  while (current) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    root = current;
    current = current.parent;
  }

  return root;
}
```

### Private vs Public Documentation Differences

| Aspect | Public Methods | Private Methods |
|--------|---------------|-----------------|
| Focus | How to use | Why it exists |
| Examples | Essential | Optional |
| Implementation details | Minimal | Extensive |
| Algorithm explanation | Rare | Common |
| Invariants | Implied by contract | Explicitly stated |

### Advanced: Package-Private Pattern

```typescript
/**
 * Internal helper for cache key generation.
 *
 * This function is exported for testing but is not part of the public API.
 * It may change without notice in minor/patch versions.
 *
 * @internal
 * @param value - Value to serialize
 * @returns Deterministic JSON string representation
 */
export function _internalSerialize(value: unknown): string {
  // Implementation...
}
```

---

## Documenting Complex Validation Logic

### Validation Documentation Strategy

1. **List validation rules explicitly** - Use bullet points or numbered lists
2. **Group related validations** - Separate preconditions, postconditions, invariants
3. **Document error messages** - Show what errors are thrown and when
4. **Provide valid/invalid examples** - Show edge cases
5. **Use @requires or @precondition** - For input requirements

### Basic Validation Pattern

```typescript
/**
 * Validates user registration data.
 *
 * Validation rules:
 * - Username: 3-20 characters, alphanumeric + underscore
 * - Email: Must match RFC 5322 format
 * - Password: Minimum 8 chars, must include uppercase, lowercase, number, special char
 * - Age: Must be between 13 and 120
 *
 * @param data - User registration data
 * @returns Object containing isValid boolean and errors array
 * @returns {boolean} returns.isValid - True if all validations pass
 * @returns {string[]} returns.errors - Array of error messages (empty if valid)
 */
function validateRegistration(data: {
  username: string;
  email: string;
  password: string;
  age: number;
}): { isValid: boolean; errors: string[] } {
  // Implementation...
}
```

### Codebase Example: Tree Validation

**File:** `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`

```typescript
/**
 * Validate tree-wide bidirectional consistency.
 *
 * Returns array of inconsistency descriptions (empty if valid).
 *
 * This is the comprehensive validation that checks:
 * 1. Parent → child links in workflow tree
 * 2. Child → parent links in workflow tree
 * 3. Node tree mirrors workflow tree (parent relationship)
 * 4. Node tree mirrors workflow tree (children relationship)
 *
 * @param root - The root workflow to validate
 * @returns Array of error descriptions (empty if tree is consistent)
 */
export function validateTreeConsistency(root: Workflow): string[] {
  const errors: string[] = [];
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    // Check parent→child link in workflow tree
    if (node.parent) {
      if (!node.parent.children.includes(node)) {
        errors.push(
          `[WORKFLOW TREE] Orphaned child: "${node.node.name}" not in parent "${node.parent.node.name}"'s children list`
        );
      }
    }

    // Additional validation checks...
  });

  return errors;
}
```

### @throws for Validation

```typescript
/**
 * Validates and attaches a child workflow.
 *
 * Preconditions:
 * - child must not already be attached to this parent
 * - child.parent must be null or equal to this parent
 * - child must not be an ancestor of this parent (no circular references)
 *
 * Postconditions:
 * - child.parent === this
 * - child.node.parent === this.node
 * - this.children.includes(child)
 * - this.node.children.includes(child.node)
 *
 * @param child - The child workflow to validate and attach
 * @throws {Error} If child is already attached to this workflow
 * @throws {Error} If child has a different parent (single-parent invariant)
 * @throws {Error} If child is an ancestor (circular reference invariant)
 */
function attachChild(child: Workflow): void {
  // Implementation...
}
```

### Complex Validation Example: Multi-Stage Validation

```typescript
/**
 * Validates workflow configuration before execution.
 *
 * Performs validation in three stages:
 *
 * **Stage 1: Structural Validation**
 * - All workflows have unique IDs
 * - No cycles in parent-child relationships
 * - Node tree mirrors workflow tree
 *
 * **Stage 2: Configuration Validation**
 * - Workflow names are non-empty strings
 * - Required configuration keys are present
 * - Configuration values match expected types
 *
 * **Stage 3: Dependency Validation**
 * - All referenced children are attached
 * - Observer callbacks are valid functions
 * - No duplicate observers registered
 *
 * @param root - Root workflow to validate
 * @returns Object with validation results
 * @returns {boolean} return.isValid - Overall validation status
 * @returns {string[]} return.errors - Array of validation error messages
 * @returns {string[]} return.warnings - Array of non-critical warnings
 *
 * @example
 * ```ts
 * const result = validateWorkflow(root);
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
function validateWorkflow(root: Workflow): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  // Multi-stage implementation...
}
```

### Validation Documentation with Custom Types

```typescript
/**
 * @typedef {Object} ValidationError
 * @property {string} field - The field that failed validation
 * @property {string} message - Descriptive error message
 * @property {'error'|'warning'} severity - Validation severity level
 * @property {string} [code] - Optional error code for programmatic handling
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Overall validation status
 * @property {ValidationError[]} errors - Array of validation errors
 * @property {ValidationError[]} warnings - Array of validation warnings
 */

/**
 * Validates prompt execution inputs.
 *
 * @param inputs - Inputs to validate
 * @returns {ValidationResult} Detailed validation results
 */
function validatePromptInputs(inputs: CacheKeyInputs): ValidationResult {
  // Implementation...
}
```

---

## Documenting Tree/Node Manipulation Methods

### Tree-Specific Documentation Patterns

Tree data structures require special documentation considerations:

1. **Structure invariants** - What properties must always be true
2. **Dual-tree synchronization** - When multiple trees mirror each other
3. **Traversal behavior** - BFS vs DFS, cycle detection
4. **Mutation atomicity** - Are changes rolled back on failure?

### Basic Tree Method Documentation

```typescript
/**
 * Represents a node in a tree data structure.
 *
 * @template T - The type of value stored in the node
 *
 * Invariants:
 * - If node.parent exists, node must be in node.parent.children
 * - If child is in node.children, child.parent must equal node
 * - No cycles: A node cannot be its own ancestor
 */
class TreeNode<T> {
  /**
   * The value stored in this node.
   */
  value: T;

  /**
   * Reference to the parent node, or null if this is the root node.
   */
  parent: TreeNode<T> | null;

  /**
   * Array of child nodes.
   */
  children: TreeNode<T>[];
}
```

### Tree Traversal Documentation

**File:** `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`

```typescript
/**
 * Collect all nodes in tree via BFS traversal.
 *
 * Throws if circular reference detected during traversal.
 *
 * Traversal strategy:
 * - Uses breadth-first search (BFS)
 * - Maintains visited Set for cycle detection
 * - Processes nodes level by level
 *
 * @param root - The root workflow node to start traversal from
 * @returns Array of all workflow nodes in the tree
 * @throws {Error} if circular reference is detected
 *
 * @example
 * ```ts
 * const nodes = collectAllNodes(root);
 * console.log(`Tree has ${nodes.length} nodes`);
 * ```
 */
export function collectAllNodes(root: Workflow): Workflow[] {
  const nodes: Workflow[] = [];
  const queue: Workflow[] = [root];
  const visited = new Set<Workflow>();

  while (queue.length > 0) {
    const node = queue.shift()!;

    // CRITICAL: Cycle detection
    if (visited.has(node)) {
      throw new Error(`Circular reference detected at ${node.node.name}`);
    }

    visited.add(node);
    nodes.push(node);
    queue.push(...node.children);
  }

  return nodes;
}
```

### Dual-Tree Synchronization Documentation

```typescript
/**
 * Attach a child workflow.
 *
 * This method maintains synchronization between two parallel tree structures:
 * 1. The **workflow tree** (Workflow instances with parent/children references)
 * 2. The **node tree** (WorkflowNode objects with parent/children references)
 *
 * Both trees must remain perfectly synchronized:
 * - workflow.parent <-> node.parent
 * - workflow.children <-> node.children
 *
 * Synchronization invariants:
 * - For every parent-child link in workflow tree, identical link exists in node tree
 * - Adding/removing children updates both trees atomically
 * - No orphaned nodes in either tree
 *
 * @param child - The child workflow to attach
 * @throws {Error} If child already attached to this workflow
 * @throws {Error} If child has different parent (single-parent invariant)
 * @throws {Error} If child is ancestor (circular reference invariant)
 *
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child');
 *
 * // Both trees are synchronized:
 * // parent.children === [child]
 * // parent.node.children === [child.node]
 * // child.parent === parent
 * // child.node.parent === parent.node
 * parent.attachChild(child);
 * ```
 */
public attachChild(child: Workflow): void {
  // Implementation...
}
```

### Tree Mutation Documentation Template

```typescript
/**
 * [Verb] [tree component] [operation description].
 *
 * [Detailed paragraph explaining what the operation does and why].
 *
 * **Structural effects:**
 * - [What changes occur in the tree structure]
 * - [How invariants are maintained]
 * - [Any side effects like events or callbacks]
 *
 * **Time complexity:** O([notation])
 * **Space complexity:** O([notation])
 *
 * [Additional implementation notes if relevant]
 *
 * @param [paramName] - [Description]
 * @returns [Description of return value]
 * @throws {[ErrorType]} [When this error is thrown]
 *
 * @example
 * ```ts
 * // [Short example showing usage]
 * ```
 */
```

### Advanced: Tree Validation Documentation

```typescript
/**
 * Verify bidirectional link between parent and child in BOTH trees.
 *
 * Throws if inconsistency found in either:
 * - Workflow tree: parent.children.includes(child) && child.parent === parent
 * - Node tree: node.children.includes(child.node) && child.node.parent === node
 *
 * @param parent - Parent workflow/node
 * @param child - Child workflow/node
 * @throws {Error} if bidirectional link is broken in either tree
 *
 * @example
 * ```ts
 * // Verify parent-child relationship is consistent
 * verifyBidirectionalLink(parent, parent.children[0]);
 * ```
 */
export function verifyBidirectionalLink(
  parent: Workflow,
  child: Workflow
): void {
  // Check workflow tree
  if (!parent.children.includes(child)) {
    throw new Error(
      `[WORKFLOW TREE] "${child.node.name}" not in parent "${parent.node.name}".children`
    );
  }
  if (child.parent !== parent) {
    throw new Error(
      `[WORKFLOW TREE] "${child.node.name}".parent is "${child.parent?.node.name}", expected "${parent.node.name}"`
    );
  }

  // Check node tree
  if (!parent.node.children.includes(child.node)) {
    throw new Error(
      `[NODE TREE] "${child.node.name}" not in parent "${parent.node.name}".node.children`
    );
  }
  if (child.node.parent !== parent.node) {
    throw new Error(
      `[NODE TREE] "${child.node.name}".node.parent is "${child.node.parent?.name}", expected "${parent.node.name}"`
    );
  }
}
```

---

## Well-Documented TypeScript Project Examples

### Recommended Projects to Study

| Project | URL | Why Study It |
|---------|-----|--------------|
| TypeScript | https://github.com/microsoft/TypeScript | Comprehensive JSDoc in compiler source |
| VS Code | https://github.com/microsoft/vscode | Extension API documentation |
| Angular | https://github.com/angular/angular | Framework API documentation |
| Jest | https://github.com/jestjs/jest | Testing framework docs |
| RxJS | https://github.com/ReactiveX/rxjs | Observable pattern documentation |

### TypeScript Compiler Example

**Pattern:** Complex type system documentation

```typescript
/**
 * Creates a shallow copy of a type.
 *
 * @template T - The type to copy
 * @param type - The type to copy
 * @returns A new type that is a shallow copy of the input
 * @remarks This function does not copy symbols or non-enumerable properties
 */
function copyType<T>(type: T): T {
  // Implementation...
}
```

### Node.js Example

**Pattern:** Error-first callback documentation

```typescript
/**
 * Reads the entire contents of a file.
 *
 * @param {string | Buffer | URL} path - Filename or file descriptor
 * @param {{
 *   encoding?: string | null;
 *   flag?: string;
 *   }} [options] - Options object
 * @param {(
 *   err: NodeJS.ErrnoException | null,
 *   data: string
 * ) => void} callback - Callback function
 * @returns {void}
 *
 * @example
 * ```js
 * fs.readFile('/etc/passwd', (err, data) => {
 *   if (err) throw err;
 *   console.log(data);
 * });
 * ```
 */
```

### Codebase Example: Task Decorator

**File:** `/home/dustin/projects/groundswell/src/decorators/task.ts`

```typescript
/**
 * @Task decorator
 *
 * Wraps a method that returns child workflow(s), automatically attaching them.
 *
 * @example
 * ```ts
 * class ParentWorkflow extends Workflow {
 *   @Task({ concurrent: true })
 *   async createChildren(): Promise<ChildWorkflow[]> {
 *     return [
 *       new ChildWorkflow('child1', this),
 *       new ChildWorkflow('child2', this),
 *     ];
 *   }
 * }
 * ```
 *
 * @example Non-workflow return (silently skipped)
 * ```ts
 * class MyWorkflow extends Workflow {
 *   @Task()
 *   async returnsString(): Promise<string> {
 *     return 'not a workflow';  // Returned as-is, not attached
 *   }
 * }
 * ```
 *
 * @example Mixed return (only workflows attached)
 * ```ts
 * class MyWorkflow extends Workflow {
 *   @Task()
 *   async mixedReturn(): Promise<(Workflow | string)[]> {
 *     return [
 *       new ChildWorkflow('child1', this),  // Attached
 *       'some string',                       // Skipped
 *       new ChildWorkflow('child2', this),  // Attached
 *     ];
 *   }
 * }
 * ```
 *
 * **Validation Behavior**
 *
 * The decorator uses lenient validation for return values:
 * - Workflow objects (with 'id' property) are automatically attached
 * - Non-workflow objects are silently skipped (not attached)
 * - The original return value is always preserved
 *
 * This lenient approach enables:
 * - **Duck-typing:** Works with workflow-like objects, not just Workflow instances
 * - **Flexible signatures:** Methods can return any type without breaking
 * - **Graceful handling:** Edge cases (null, undefined, primitives) don't throw errors
 */
export function Task(opts: TaskOptions = {}) {
  // Implementation...
}
```

---

## Patterns for Documenting Circular Reference Detection

### Why Circular Reference Documentation Matters

In tree structures, circular references cause:
- Infinite loops in traversal
- Stack overflow errors
- Memory leaks from unreachable cycles
- Silent data corruption

### Documentation Pattern: Cycle Detection in Traversal

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts`

```typescript
/**
 * Check if this workflow is a descendant of the given ancestor workflow.
 *
 * Traverses the parent chain upward looking for the ancestor reference.
 * Uses visited Set to detect cycles during traversal.
 *
 * **Cycle Detection:**
 * - Maintains a Set of visited workflow references
 * - Throws immediately if a workflow is encountered twice
 * - Prevents infinite loops from corrupted parent chains
 *
 * @param ancestor - The potential ancestor workflow to check
 * @returns true if ancestor is found in parent chain, false otherwise
 * @throws {Error} If a cycle is detected during traversal
 */
private isDescendantOf(ancestor: Workflow): boolean {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;

  while (current !== null) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);

    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
```

### Documentation Pattern: Circular Reference Prevention

```typescript
/**
 * Attach a child workflow.
 *
 * **Circular Reference Prevention:**
 * - Checks if child is an ancestor before attaching
 * - Prevents creation of cycles in the tree
 * - Throws descriptive error explaining the circular relationship
 *
 * **Error Message Format:**
 * When a circular reference is detected, the error message includes:
 * - The child's name
 * - The parent's name
 * - The relationship that would create the cycle
 *
 * @param child - The child workflow to attach
 * @throws {Error} If child is an ancestor (would create circular reference)
 */
public attachChild(child: Workflow): void {
  // Check if child is an ancestor (would create circular reference)
  if (this.isDescendantOf(child)) {
    const errorMessage =
      `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'. ` +
      `This would create a circular reference.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  // ... rest of implementation
}
```

### Documentation Pattern: WeakSet for Cycle Detection

**File:** `/home/dustin/projects/groundswell/src/cache/cache-key.ts`

```typescript
/**
 * Deterministically stringify a value with sorted object keys.
 *
 * Unlike JSON.stringify, this function detects circular references:
 * - Uses WeakSet to track visited objects (memory-efficient)
 * - Throws TypeError with clear message on cycle detection
 * - Handles all JavaScript types including Map, Set, Date
 *
 * **Cycle Detection Strategy:**
 * - WeakSet allows garbage collection of unreachable objects
 * - Throws on first cycle detection (not a cycle detector)
 * - Error message matches JSON.stringify() behavior
 *
 * @param value - Value to stringify
 * @returns Deterministic JSON string
 * @throws {TypeError} if circular reference detected
 *
 * @example
 * ```ts
 * const obj = { a: 1 };
 * obj.self = obj;
 * deterministicStringify(obj); // Throws: TypeError: Converting circular structure to JSON
 * ```
 */
export function deterministicStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  function stringify(val: unknown): string {
    // ... type handling ...

    if (typeof val === 'object') {
      if (seen.has(val as object)) {
        throw new TypeError('Converting circular structure to JSON');
      }
      seen.add(val as object);
      // ... rest of implementation ...
    }
  }

  return stringify(value);
}
```

### Cycle Detection Documentation Template

```typescript
/**
 * [Operation description].
 *
 * **Cycle Detection:**
 * - [Algorithm used: Set/WeakSet/visited flag]
 * - [When cycle detection runs: every traversal/validate only]
 * - [Action on cycle: throw error/skip/return special value]
 *
 * @param [param] - [Description]
 * @throws {[ErrorType]} [When circular reference detected]
 */
```

### Advanced: Circular Reference Detection vs Prevention

```typescript
/**
 * Validates tree structure for circular references.
 *
 * This function provides two modes of operation:
 *
 * **Detection Mode (validateOnly: true):**
 * - Returns all circular reference paths found
 * - Does not modify the tree
 * - Useful for diagnostics and testing
 *
 * **Prevention Mode (validateOnly: false):**
 * - Throws on first circular reference found
 * - Used to prevent invalid state changes
 * - Includes full path in error message
 *
 * @param root - Root node to validate
 * @param validateOnly - If true, return errors instead of throwing
 * @returns Array of circular reference paths (empty if none found)
 * @throws {Error} If circular reference detected and validateOnly is false
 *
 * @example
 * ```ts
 * // Prevention mode (throws on error)
 * validateCircularReferences(root, false);
 *
 * // Detection mode (collects all errors)
 * const cycles = validateCircularReferences(root, true);
 * if (cycles.length > 0) {
 *   console.warn('Found circular references:', cycles);
 * }
 * ```
 */
function validateCircularReferences(
  root: Workflow,
  validateOnly: boolean
): string[] {
  // Implementation...
}
```

### Best Practices for Circular Reference Documentation

| Practice | Description |
|----------|-------------|
| **Document the algorithm** | Set vs WeakSet, recursion vs iteration |
| **Explain why cycles are bad** | Infinite loops, memory leaks |
| **Show error messages** | Include actual error text in examples |
| **Document recovery** | Can the cycle be fixed? How? |
| **Note performance** | Time/space complexity of cycle detection |

---

## IDE Hover Documentation Best Practices

### What Makes Good Hover Documentation

When developers hover over a function/type in their IDE, they need:

1. **Quick understanding** - One sentence summary
2. **Usage patterns** - How to call it correctly
3. **Gotchas** - Common mistakes to avoid
4. **Examples** - Copy-pasteable code snippets
5. **Related items** - @see tags to related functions

### TypeScript IntelliSense Optimization

**File:** `/home/dustin/projects/groundswell/src/core/factory.ts`

```typescript
/**
 * Creates a new workflow with the given name.
 *
 * @param name - Human-readable name for the workflow
 * @returns A new Workflow instance
 *
 * @example
 * ```ts
 * const workflow = createWorkflow('MyWorkflow');
 * await workflow.run();
 * ```
 */
export function createWorkflow(name: string): Workflow {
  return new Workflow({ name });
}
```

### Hover Documentation Structure

```typescript
/**
 * [One-line summary - what appears in autocomplete]
 *
 * [Optional: Detailed paragraph explaining behavior]
 *
 * [Optional: Notes about edge cases, side effects, or important details]
 *
 * @param [param] - [Brief description - appears in parameter tooltip]
 * @returns [Brief description - appears in type tooltip]
 *
 * @example
 * ```ts
 * // [Concise example showing primary usage]
 * [functionCall];
 * ```
 */
```

### Codebase Example: Multi-Example Documentation

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts`

```typescript
/**
 * Base class for all workflows.
 *
 * Supports both class-based (subclass with run()) and functional (executor) patterns.
 *
 * @example Class-based pattern:
 * ```ts
 * class MyWorkflow extends Workflow {
 *   async run() {
 *     this.setStatus('running');
 *     // workflow logic
 *     this.setStatus('completed');
 *   }
 * }
 * ```
 *
 * @example Functional pattern:
 * ```ts
 * const workflow = new Workflow({ name: 'MyWorkflow' }, async (ctx) => {
 *   await ctx.step('step1', async () => {
 *     // step logic
 *   });
 * });
 * await workflow.run();
 * ```
 */
export class Workflow<T = unknown> {
  // Implementation...
}
```

### @see Tag for Related Documentation

```typescript
/**
 * Detach a child workflow from this parent workflow.
 *
 * @see attachChild - For attaching children to a parent
 * @see reparent - For moving children between parents
 *
 * @param child - The child workflow to detach
 * @throws {Error} If the child is not attached to this parent workflow
 */
public detachChild(child: Workflow): void {
  // Implementation...
}
```

### @deprecated Tag for Migration Guidance

```typescript
/**
 * Adds a child to this workflow.
 *
 * @deprecated Use attachChild() instead for clearer semantics.
 * This method will be removed in v2.0.
 *
 * @see attachChild
 *
 * @param child - Child workflow to add
 * @deprecated
 */
public addChild(child: Workflow): void {
  this.attachChild(child);
}
```

### Best Practices for IDE Hover

1. **Keep summaries short** - Autocomplete truncates long text
2. **Put important info first** - Developers skim, not read deeply
3. **Use code examples** - Show, don't just tell
4. **Include parameter descriptions** - Appears in parameter hints
5. **Document generics** - @template tags show in type tooltips
6. **Link related items** - @see tags enable navigation
7. **Mark deprecated items** - Show migration path

### Anti-Patterns to Avoid

```typescript
// BAD: Too verbose for hover
/**
 * This method performs the operation of detaching a child workflow instance
 * from its parent workflow instance by removing the reference from the
 * parent's children array and also clearing the child's parent property...
 */
function detachChild(child) { }

// GOOD: Concise with examples
/**
 * Detach a child workflow.
 *
 * @example
 * ```ts
 * parent.detachChild(child); // child.parent becomes null
 * ```
 */
function detachChild(child) { }
```

---

## Codebase-Specific Patterns

### Current Documentation Patterns in Groundswell

Based on analysis of the codebase, these patterns are already established:

#### Pattern 1: Dual-Tree Structure Documentation

**Files:** `src/core/workflow.ts`, `src/__tests__/helpers/tree-verification.ts`

```typescript
/**
 * [Method description]
 *
 * Updates both the workflow tree and node tree to maintain synchronization.
 * - [Workflow tree change description]
 * - [Node tree change description]
 *
 * @param [param] - [Description]
 * @throws {Error} [Condition]
 */
```

#### Pattern 2: Cycle Detection Documentation

**Found in:** Traversal methods, validation functions

```typescript
/**
 * [Traverse/validate description]
 *
 * Uses visited Set to detect cycles during traversal.
 * Throws if circular reference detected.
 *
 * @param root - [Description]
 * @throws {Error} if circular reference is detected
 */
```

#### Pattern 3: Multi-Example Documentation

**Found in:** Decorators, factory functions

```typescript
/**
 * [Decorator/function description]
 *
 * @example [Example scenario 1]
 * @example [Example scenario 2]
 * @example [Edge case handling]
 */
```

### Recommended Patterns for Task P1.M4.T1.S1

#### For Workflow Tree Manipulation Methods:

```typescript
/**
 * [Verb] [tree component] [what and why].
 *
 * **Tree Structure Changes:**
 * - [Workflow tree mutation]
 * - [Node tree mutation]
 * - [Event emission if applicable]
 *
 * **Invariants Maintained:**
 * - [Invariant 1]
 * - [Invariant 2]
 *
 * **Cycle Detection:**
 * - [How cycles are prevented/detected]
 *
 * @param [name] - [Description]
 * @returns [Description]
 * @throws {[ErrorType]} [When thrown]
 *
 * @example
 * ```ts
 * // [Concise usage example]
 * ```
 */
```

#### For Validation Methods:

```typescript
/**
 * Validate [what] against [criteria].
 *
 * **Validation Rules:**
 * 1. [Rule 1]
 * 2. [Rule 2]
 * 3. [Rule 3]
 *
 * @param [input] - [Description]
 * @returns {[Result type]} [Description including error format]
 *
 * @example
 * ```ts
 * // [Valid input example]
 * // [Invalid input example showing error]
 * ```
 */
```

#### For Private Helper Methods:

```typescript
/**
 * [What the method does] and why it exists.
 *
 * [Algorithm or approach explanation if non-trivial]
 *
 * @private
 * @param [param] - [Description]
 * @returns [Description]
 * @throws {[ErrorType]} [When thrown - if applicable]
 */
```

### Codebase Example: Comprehensive Documentation

**File:** `/home/dustin/projects/groundswell/src/core/workflow.ts` (lines 257-278)

```typescript
/**
 * Detach a child workflow from this parent workflow.
 *
 * Removes the child from both the workflow tree (this.children) and
 * the node tree (this.node.children), clears the child's parent reference,
 * and emits a childDetached event to notify observers.
 *
 * This enables reparenting workflows: oldParent.detachChild(child); newParent.attachChild(child);
 *
 * @param child - The child workflow to detach
 * @throws {Error} If the child is not attached to this parent workflow
 *
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child', parent);
 *
 * // Later, reparent to a different parent
 * parent.detachChild(child);
 * newParent.attachChild(child);
 * ```
 */
public detachChild(child: Workflow): void {
  // Implementation...
}
```

**Key strengths of this example:**
1. Clear one-sentence summary
2. Explains both tree mutations
3. Notes side effect (event emission)
4. Shows reparenting use case
5. Documents error condition
6. Provides complete example

---

## Summary and Quick Reference

### Essential JSDoc Tags for Tree Documentation

| Tag | Usage | Example |
|-----|-------|---------|
| `@param {Type} name` | Parameter type and description | `@param {Workflow} child - Child to attach` |
| `@returns {Type}` | Return type description | `@returns {Workflow[]} All nodes in tree` |
| `@throws {ErrorType}` | Exception documentation | `@throws {Error} If circular reference detected` |
| `@example` | Usage examples | `@example \`const node = root.find(id)\`` |
| `@private` | Internal methods | `@private` (before description) |
| `@template T` | Generic types | `@template T - Node value type` |
| `@modifies` | State mutation | `@modifies this.children - Adds new child` |
| `@see` | Related items | `@see attachChild - For attaching children` |

### Documentation Checklist

For each tree manipulation method:

- [ ] Clear one-line summary
- [ ] Dual-tree mutations documented (if applicable)
- [ ] All @throws tags with specific error types
- [ ] @modifies or mutation description
- [ ] Cycle detection documented (if relevant)
- [ ] @example for primary usage
- [ ] @see for related methods
- [ ] Private methods marked @private
- [ ] Generic types documented with @template
- [ ] Complexity notes for non-trivial algorithms

### Common Documentation Errors to Avoid

1. **Missing @throws** - Always document thrown errors
2. **Vague error descriptions** - "If invalid" → "If child has different parent"
3. **No mutation documentation** - Always state what changes
4. **Missing examples** - Show how to use the method
5. **Undocumented private methods** - Explain why they exist
6. **No cycle detection notes** - Document detection strategy
7. **Generic error types** - Use specific types, not just `Error`

---

## Additional Resources

### TypeScript-Specific Resources

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [TypeScript Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### JSDoc Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [JSDoc Tag Reference](https://jsdoc.app/index.html)

### Documentation Tools

- [TypeDoc](https://typedoc.org/) - Documentation generator for TypeScript
- [API Extractor](https://api-extractor.com/) - Extract API documentation
- [TSDoc](https://tsdoc.org/) - Standard TypeScript documentation syntax

---

## Appendix: Complete Documentation Template

```typescript
/**
 * [One-line summary of what the method does].
 *
 * [Optional detailed paragraph explaining behavior, algorithm, or rationale.
 * Include information about dual-tree synchronization, invariants, or
 * other structural considerations.]
 *
 * **Structural Effects:**
 * - [Workflow tree mutation description]
 * - [Node tree mutation description]
 * - [Event emission or other side effects]
 *
 * **Invariants:**
 * - [Invariant 1 maintained]
 * - [Invariant 2 maintained]
 *
 * **Cycle Detection:**
 * - [Method used: Set/WeakSet/algorithm]
 * - [When detection occurs: always/on validate]
 *
 * **Time Complexity:** O([notation])
 * **Space Complexity:** O([notation])
 *
 * @template T - [Generic type description]
 *
 * @param [paramName] - [Parameter description]
 * @param [paramName2] - [Parameter description with default value]
 *
 * @returns {[ReturnType]} [Return value description]
 *
 * @throws {[ErrorType]} [When this error is thrown]
 * @throws {[AnotherErrorType]} [When this error is thrown]
 *
 * @example
 * ```ts
 * // [Primary usage example]
 * const [result] = [methodName]([args]);
 * ```
 *
 * @example [Alternative scenario]
 * ```ts
 * // [Edge case or alternative usage]
 * ```
 *
 * @see [relatedMethod] - [Relationship description]
 *
 * @private | @protected
 */
[methodSignature] {
  // Implementation...
}
```

---

**End of Research Document**

*Compiled for: P1.M4.T1.S1 - JSDoc Documentation Best Practices*
*Date: 2026-01-12*
*Repository: /home/dustin/projects/groundswell*

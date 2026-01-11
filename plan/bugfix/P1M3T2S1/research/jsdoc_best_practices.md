# JSDoc Best Practices for TypeScript Decorators

## Overview

JSDoc for TypeScript decorators requires special attention due to their unique nature as both runtime functions and compile-time transformations. This document outlines best practices based on current TypeScript ecosystem patterns and the implementation found in the groundswell project.

## Official Documentation Sources

### TypeScript Official Documentation
- [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html) - Official TypeScript decorators documentation
- [JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) - Supported JSDoc types in TypeScript
- [Experimental Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html#experimental-decorators) - Current experimental status

### Microsoft Developer Documentation
- [Decorators in JavaScript/TypeScript](https://learn.microsoft.com/en-us/azure/devops/learn/devops/best-practices/typescript-decorators) - Azure DevOps best practices guide

## Quality Examples from GitHub

### Well-Documented Decorator Projects

1. **TypeORM Decorators**
   - Repository: [https://github.com/typeorm/typeorm](https://github.com/typeorm/typeorm)
   - Pattern: Comprehensive JSDoc with parameter types, return types, and usage examples
   - Best practices observed:
     ```typescript
     /**
      * Column decorator allows to map entity property to database table column.
      */
     function Column(options?: ColumnOptions): Function;
     ```

2. **NestJS Decorators**
   - Repository: [https://github.com/nestjs/nest](https://github.com/nestjs/nest)
   - Pattern: Clear separation between decorator parameters and class metadata
   - Best practices observed:
     ```typescript
     /**
      * Route handler decorator
      * @param path URL path
      * @param method HTTP method
      */
     function Get(path?: string | string[], method?: string): MethodDecorator;
     ```

3. **class-validator**
   - Repository: [https://github.com/typestack/class-validator](https://github.com/typestack/class-validator)
   - Pattern: Detailed validation behavior documentation
   - Best practices observed:
     ```typescript
     /**
      * Checks if the value is a boolean.
      * If given value is not a boolean, throws an AssertionError.
      */
     function IsBoolean(validationOptions?: ValidationOptions): PropertyDecorator;
     ```

## Best Practice Recommendations

### 1. Documenting Decorator Functions

#### Essential JSDoc Tags
```typescript
/**
 * Decorator function description
 *
 * @param {DecoratorOptions} opts - Configuration options for the decorator
 * @returns {MethodDecorator} - A method decorator function
 *
 * @example
 * class MyClass {
 *   @MyDecorator({ option1: 'value' })
 *   myMethod() {
 *     // implementation
 *   }
 * }
 *
 * @since 1.0.0
 * @deprecated Use `NewDecorator` instead - deprecated since 2.0.0
 */
export function MyDecorator(opts: DecoratorOptions): MethodDecorator { ... }
```

#### Key Elements to Include:
- **Purpose**: What the decorator does
- **Parameters**: Each option with type and description
- **Return type**: The decorator function type
- **Examples**: Complete usage examples
- **Since/deprecated**: Versioning information
- **See also**: Related decorators or concepts

### 2. Documenting Decorator Options/Interfaces

#### Interface Documentation Pattern
```typescript
/**
 * Configuration options for the @Step decorator
 */
export interface StepOptions {
  /** Custom step name (defaults to method name) */
  name?: string;
  /** If true, capture state snapshot after step completion */
  snapshotState?: boolean;
  /** Track and emit step duration (default: true) */
  trackTiming?: boolean;
  /** If true, log message at step start */
  logStart?: boolean;
  /** If true, log message at step end */
  logFinish?: boolean;
}
```

#### Best Practices:
- Use JSDoc comments for each property
- Include default values in descriptions
- Explain behavioral side effects
- Document validation rules
- Mention interactions with other decorators

### 3. Documenting Validation Behavior

#### Validation Documentation Example
```typescript
/**
 * @Step decorator with validation behavior
 *
 * Validates:
 * - Method must be async (returns Promise)
 * - Method must be defined on a class with workflow-like interface
 * - Options must conform to StepOptions interface
 *
 * Throws:
 * - {TypeError} if decorated method is not async
 * - {ValidationError} if options contain invalid values
 */
export function Step(opts: StepOptions = {}): MethodDecorator { ... }
```

### 4. Documenting Lenient vs Strict Behavior

#### Behavior Documentation Patterns
```typescript
/**
 * @DecoratorName configuration options
 */
export interface DecoratorOptions {
  /** Enable lenient mode (default: true)
   *
   * Lenient mode:
   * - Logs warnings instead of throwing errors
   * - Allows partial configuration
   * - Provides fallback behaviors
   *
   * Strict mode:
   * - Throws errors on invalid configuration
   * - Requires all mandatory options
   * - No fallback behaviors
   */
  lenient?: boolean;

  /** Skip validation (default: false)
   *
   * WARNING: Use with caution. Skipping validation may lead to:
   * - Runtime errors
   * - Unexpected behavior
   * - Difficult-to-debug scenarios
   */
  skipValidation?: boolean;
}
```

## Common Patterns for Documenting Behavior Nuances

### 1. Error Handling Patterns
```typescript
/**
 * @ErrorBehavior
 *
 * The decorator handles errors as follows:
 * - Validation errors: Immediately throws TypeError
 * - Runtime errors: Wraps in WorkflowError and enriches with context
 * - Async errors: Properly awaits before error handling
 * - Edge cases: Special handling for circular references
 */
```

### 2. Performance Considerations
```typescript
/**
 * @Performance
 *
 * Performance characteristics:
 * - Minimal overhead when no options provided
 * - Additional cost when snapshotState enabled
 * - Memory usage scales with event count
 * - Timing tracking has <1ms overhead
 */
```

### 3. Interaction Patterns
```typescript
/**
 * @Interactions
 *
 * Decorator interactions:
 * - Safe to use with other @Step decorators
 * - Combines with @ObservedState for state tracking
 * - Works with multiple inheritance scenarios
 * - May conflict with other method decorators
 */
```

### 4. Context-Aware Documentation
```typescript
/**
 * @Context
 *
 * Behavior varies based on context:
 * - On class methods: Full workflow integration
 * - On static methods: Limited event emission
 * - On getters/setters: No timing tracking
 * - On arrow functions: Unsupported (throws error)
 */
```

## Advanced Patterns

### 1. Conditional Behavior Documentation
```typescript
/**
 * @ConditionalBehavior
 *
 * Behavior changes based on:
 * - `trackTiming: true`: Emits stepEnd events
 * - `snapshotState: true`: Captures post-execution state
 * - `logStart: true`: Logs step initiation
 * - Combination of options: Enables complex workflows
 */
```

### 2. Migration Guidelines
```typescript
/**
 * @Migration
 *
 * Breaking changes:
 * - v1.0: Initial implementation
 * - v2.0: Changed default of `trackTiming` to true
 *   - Migration: Remove `trackTiming: true` from configurations
 *
 * Deprecation warnings:
 * - `oldOption`: Use `newOption` instead
 * - `legacyMode`: Will be removed in v3.0
 */
```

## Template for New Decorators

```typescript
/**
 * @DecoratorName
 *
 * Description of what the decorator does and its purpose.
 *
 * @param {DecoratorOptions} opts - Configuration options
 * @returns {MethodDecorator|ClassDecorator} - Decorator function
 *
 * @example Basic usage
 * class MyClass {
 *   @DecoratorName()
 *   myMethod() { ... }
 * }
 *
 * @example With options
 * class MyClass {
 *   @DecoratorName({ option1: 'value', option2: true })
 *   myMethod() { ... }
 * }
 *
 * @Validation
 * - Method must be async when using certain options
 * - Options must be of correct type
 * - Class must implement required interface
 *
 * @Behavior
 * - Lenient mode: Logs warnings, provides defaults
 * - Strict mode: Throws on invalid configuration
 *
 * @Interactions
 * - Safe to combine with other decorators
 * - May conflict with property decorators
 *
 * @since 2.0.0
 */
export function DecoratorName(opts: DecoratorOptions = {}): MethodDecorator { ... }
```

## Resources for Further Learning

1. [JSDoc TypeScript Support](https://github.com/Microsoft/TypeScript/wiki/JSDoc-support-in-TypeScript)
2. [Decorator Design Patterns](https://medium.com/@davidhoman/decorator-pattern-in-javascript-typescript-355252fe54b3)
3. [Advanced TypeScript Patterns](https://github.com/basarat/typescript-book/blob/master/docs/advanced/decorator.md)
4. [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) - Decorators chapter

## Summary

Good JSDoc for decorators should:
1. Clearly explain what the decorator does
2. Document all configuration options with defaults
3. Show comprehensive usage examples
4. Explain validation and error handling
5. Document behavior in different contexts
6. Provide migration and versioning information
7. Explain interactions with other decorators
8. Document performance implications

Following these patterns ensures that decorators are both easy to use and maintainable in large codebases.
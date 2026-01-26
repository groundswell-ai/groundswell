# External Research: Automatic Validation Hook Patterns

## Summary of Validation Hook Patterns in TypeScript/Node.js

### 1. Opt-In Configuration Pattern (Best Practice)

**Pattern**: Boolean flag in configuration with default value of `false`

```typescript
export interface ValidationConfig {
  enabled: boolean;
  strict: boolean;
  skipValidationIf?: (context: any) => boolean;
}

// Default with opt-in pattern
export const defaultValidationOptions: ValidationConfig = {
  enabled: false, // Opt-in by default
  strict: true,
};
```

**Key Insights**:
- Always default to `false` for new features to avoid breaking changes
- Provide clear naming convention: `autoValidate`, `enableValidation`, etc.
- Consider override pattern for granular control

### 2. Middleware/Interceptor Pattern

**Pattern**: Higher-order function that wraps execution

```typescript
export function withValidation<T, R>(
  fn: (arg: T) => R,
  validator: (result: R) => void
) {
  return async (arg: T): Promise<R> => {
    const result = await fn(arg);
    validator(result);
    return result;
  };
}
```

**Key Insights**:
- Non-breaking: wraps existing behavior
- Flexible: validator can be pure function
- Composable: can be combined with other wrappers

### 3. Response Type Detection Pattern

**Pattern**: Check result type before applying validation

```typescript
const result = await fn(arg);

// Check if result needs validation
if (isAgentResponse(result)) {
  const validation = validateAgentResponse(result);
  if (!validation.valid) {
    throw new WorkflowError(...);
  }
}

return result;
```

**Key Insights**:
- Type guards prevent validation errors on wrong types
- Graceful fallback for non-matching results
- Preserves existing behavior for other return types

### 4. Event-Driven Validation Pattern

**Pattern**: Emit events for validation failures

```typescript
if (!validation.valid) {
  this.emitEvent({
    type: 'invalidResponse',
    response: result,
    errors: validation.errors,
    timestamp: Date.now(),
  });

  throw new WorkflowError(...);
}
```

**Key Insights**:
- Events enable monitoring and debugging
- Separates validation logic from error handling
- Allows observers to react to validation failures

### 5. Configuration Cascade Pattern

**Pattern**: Configuration flows through multiple layers

```
WorkflowConfig (workflow level)
    ↓
WorkflowContext (context level)
    ↓
Validation check (execution level)
```

**Key Insights**:
- Single source of truth at workflow level
- Propagates through context for efficiency
- Local checks avoid deep prop drilling

## Common Pitfalls to Avoid

1. **Breaking Changes**: Never enable validation by default
2. **Performance Overhead**: Make validation opt-in, especially in production
3. **Error Leaks**: Don't expose sensitive data in validation errors
4. **Type Safety Mismatch**: Ensure validation schemas match TypeScript types
5. **Inconsistent Behavior**: All validation should follow same pattern

## Best Practices

1. **Non-Breaking Integration**: Use wrapper pattern, don't modify existing flows
2. **Clear Naming**: Use descriptive names like `autoValidateResponses`
3. **Graceful Degradation**: Fall back to original behavior on errors
4. **Comprehensive Logging**: Emit events for monitoring
5. **Type Guards**: Use type guards before validation

## References (Based on General Knowledge)

- NestJS Validation Pipes: Global opt-in validation with configuration
- Express Middleware: Request/response validation with route-specific control
- Zod Schema Validation: Runtime type checking with TypeScript inference
- Class Validator: Decorator-based validation with opt-in behavior

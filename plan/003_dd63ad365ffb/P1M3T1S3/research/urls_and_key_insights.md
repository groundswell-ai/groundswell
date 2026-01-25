# URLs and Key Insights for Async Cleanup

## MDN Web Docs - Promise.allSettled()

**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled

**Key Insight**: `Promise.allSettled()` never rejects - it waits for all promises to settle (fulfill or reject) and returns an array of result objects with `status` ('fulfilled' or 'rejected') and `value` or `reason`.

**Critical for cleanup**: Unlike `Promise.all()` which fails fast, `Promise.allSettled()` ensures all cleanup operations complete regardless of individual failures.

## V8 Blog - Promise Combinators

**URL**: https://v8.dev/features/promise-combinators

**Key Insight**: `Promise.allSettled` is designed for scenarios where you want to wait for multiple promises to complete but don't need the entire operation to fail if one promise rejects.

**Quote**: "Use `Promise.allSettled` when you have multiple asynchronous operations that you want to complete, but you don't care if some of them fail."

## Node.js - Process Exit Events

**URL**: https://nodejs.org/api/process.html#process_event_exit

**Key Insight**: The `'exit'` event is emitted when Node.js empties its event loop. Cannot perform async operations in exit handler - cleanup must complete before event loop empties.

**Alternative**: Use `'SIGTERM'` and `'SIGINT'` signals for graceful shutdown with async cleanup.

## Node.js Best Practices - Graceful Shutdown

**Repository**: https://github.com/goldbergyoni/nodebestpractices

**Section**: Error Handling and Clean Shutdown

**Key Insights**:
1. **Set a shutdown timeout**: Don't let cleanup hang forever
2. **Close server connections**: Stop accepting new connections
3. **Drain ongoing operations**: Let in-flight requests complete
4. **Release resources**: Close database connections, file handles
5. **Log but continue**: Don't let cleanup errors prevent full shutdown

## TC39 Proposal - Explicit Resource Management

**URL**: https://tc39.es/proposal-explicit-resource-management/

**Key Insight**: Stage 3 proposal for `using` and `await using` declarations for automatic resource cleanup (similar to C# `using` or Python `with`).

**Note**: Not yet standard in Node.js, but pattern of explicit cleanup is relevant.

## TypeScript - Discriminated Unions

**URL**: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions

**Key Insight**: Use discriminated unions for type-safe result handling in batch operations.

**Example**:
```typescript
type Result =
  | { status: 'success'; providerId: ProviderId }
  | { status: 'failed'; providerId: ProviderId; error: Error };

// TypeScript narrows type in conditional
if (result.status === 'success') {
  // result.error doesn't exist here
}
```

## Refactoring.guru - Singleton Pattern

**URL**: https://refactoring.guru/design-patterns/singleton/typescript/example

**Key Insight**: Singleton pattern for registry ensures single source of truth for provider lifecycle.

**Relevance**: ProviderRegistry uses singleton - cleanup should reset internal state without resetting the singleton instance itself.

## MDN - Map.prototype.clear()

**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear

**Key Insight**: `Map.clear()` removes all entries from the Map object. Use this after provider termination to reset registry state.

## MDN - Async/Await Error Handling

**URL**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function

**Key Insight**: Always use try/catch in async functions to handle errors gracefully.

**For cleanup**:
```typescript
try {
  await provider.terminate();
} catch (error) {
  // Log but continue
  console.error('Provider termination failed:', error);
}
```

## Summary of Key Patterns

1. **Promise.allSettled**: Use for parallel cleanup with error tolerance
2. **Discriminated Unions**: Type-safe result aggregation
3. **Map.clear()**: Reset internal state after cleanup
4. **Error Logging**: Log errors but continue cleanup
5. **Singleton State**: Keep instance, clear internal maps
6. **Testing**: Mock terminate() to verify behavior

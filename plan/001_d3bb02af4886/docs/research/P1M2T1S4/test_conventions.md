# Test Conventions for Workflow Tests

## Test Framework
- **Framework**: Vitest
- **Config File**: `vitest.config.ts`
- **Test Pattern**: `src/__tests__/**/*.test.ts`

## Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Run in watch mode
```

## Test File Organization
- **Unit Tests**: `src/__tests__/unit/*.test.ts`
- **Integration Tests**: `src/__tests__/integration/*.test.ts`
- Test file names match source: `workflow.ts` → `workflow.test.ts`

## Standard Imports
```typescript
import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowObserver, /* ... */ } from '../../index.js';
```

## Test Structure Pattern
```typescript
describe('Workflow', () => {
  it('should [expected behavior]', () => {
    // Arrange: Set up test data
    // Act: Execute the behavior
    // Assert: Verify the result
  });
});
```

## Mock Observer Pattern
```typescript
const observer: WorkflowObserver = {
  onLog: (entry) => logs.push(entry),
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
```

## Error Testing Pattern
```typescript
expect(() => (workflow as any).privateMethod()).toThrow('Expected error message');
```

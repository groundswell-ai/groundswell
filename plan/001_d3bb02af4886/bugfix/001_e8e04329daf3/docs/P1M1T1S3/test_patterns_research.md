# Logger Test Patterns Research

## Codebase Test Pattern Analysis

### Existing Test Files Using Logger

| File | Lines | Pattern | Purpose |
|------|-------|---------|---------|
| src/__tests__/unit/workflow.test.ts | Basic logging | Observer pattern | Tests log emission to observers |
| src/__tests__/adversarial/deep-analysis.test.ts | 61 | `this.logger.child('')` | Tests empty parentLogId handling |
| src/__tests__/adversarial/edge-case.test.ts | 96 | `this.logger.child('parent-id-123')` | Tests normal parent ID passing |

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
  esbuild: {
    target: 'node18',
  },
});
```

### Test Scripts

```json
// package.json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### Key Test Patterns

#### 1. Basic Logging Test Pattern
```typescript
it('should emit logs to observers', async () => {
  const wf = new SimpleWorkflow();
  const logs: LogEntry[] = [];

  const observer: WorkflowObserver = {
    onLog: (entry) => logs.push(entry),
    onEvent: () => {},
    onStateUpdated: () => {},
    onTreeChanged: () => {},
  };

  wf.addObserver(observer);
  await wf.run();

  expect(logs.length).toBeGreaterThan(0);
  expect(logs[0].message).toBe('Running simple workflow');
});
```

#### 2. Child Logger Test Pattern
```typescript
it('should handle logger.child() with empty parentLogId', async () => {
  class TestWorkflow extends Workflow {
    async run() {
      const childLogger = this.logger.child('');
      childLogger.info('Child log with empty parent');
    }
  }

  const workflow = new TestWorkflow();
  await workflow.run();

  expect(workflow.node.logs.length).toBe(1);
  expect(workflow.node.logs[0].parentLogId).toBeUndefined();
});
```

#### 3. Mock Pattern for Console
```typescript
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### Test File Naming Conventions

- Unit tests: `[feature].test.ts` (e.g., `workflow.test.ts`)
- Adversarial tests: `[topic].test.ts` (e.g., `deep-analysis.test.ts`)
- Integration tests: `[scenario].test.ts`

### parentLogId Verification Pattern
```typescript
// Direct access to node logs
expect(workflow.node.logs.length).toBe(1);
expect(workflow.node.logs[0].parentLogId).toBeUndefined();
// OR
expect(workflow.node.logs[0].parentLogId).toBe('expected-id');
```

### Gaps Identified

1. **No dedicated logger test file** - Tests scattered across multiple files
2. **No comprehensive child() method tests** - Only one adversarial test exists
3. **No parent-child hierarchy tests** - Tests don't verify parentLogId propagation
4. **No logger method variants tested** - Only `info` method commonly tested
5. **No backward compatibility tests** - No tests covering multiple call patterns

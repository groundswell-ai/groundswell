# Vitest Testing Best Practices Research

## Official Documentation URLs

- **Main Documentation**: https://vitest.dev
- **API Reference**: https://vitest.dev/api/
- **Mocking**: https://vitest.dev/guide/mocking.html
- **Mock Functions**: https://vitest.dev/api/mock.html
- **test.each()**: https://vitest.dev/api/test.html#test-each
- **expectTypeOf()**: https://vitest.dev/api/expect.html#expecttypeof

## Parameterized Tests with test.each()

### Array-Based Pattern
```typescript
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [10, 20, 30],
])('add(%i, %i) = %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});
```

### Object-Based Pattern
```typescript
test.each([
  { level: 'info', method: 'info', message: 'info message' },
  { level: 'warn', method: 'warn', message: 'warn message' },
  { level: 'error', method: 'error', message: 'error message' },
])('should log $level correctly', ({ level, method, message }) => {
  const consoleSpy = vi.spyOn(console, level).mockImplementation(() => {});
  logger[method](message);
  expect(consoleSpy).toHaveBeenCalledWith(message);
  consoleSpy.mockRestore();
});
```

### Template String Pattern
```typescript
test.each`
  a    | b    | expected
  ${1} | ${2} | ${3}
  ${2} | ${3} | ${5}
`('returns $expected when adding $a and $b', ({ a, b, expected }) => {
  expect(add(a, b)).toBe(expected);
});
```

## Mock Patterns

### vi.fn() for Mock Functions
```typescript
const mockFn = vi.fn();
const mockTransport = { write: vi.fn() };
```

### vi.spyOn() for Spying
```typescript
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
// ... test code
consoleSpy.mockRestore();
```

### beforeEach/afterEach for Setup
```typescript
describe('Logger tests', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('test case', () => {
    // consoleLogSpy is already set up
  });
});
```

## Testing Hierarchical Relationships

```typescript
describe('HierarchicalLogger', () => {
  it('should create child logger with parent reference', () => {
    const root = new HierarchicalLogger('root');
    const child = new HierarchicalLogger('child', root);

    expect(child.getParent()).toBe(root);
  });

  it('should calculate full path for nested children', () => {
    const root = new HierarchicalLogger('root');
    const child = new HierarchicalLogger('child', root);
    const grandchild = new HierarchicalLogger('grandchild', child);

    expect(grandchild.getFullPath()).toBe('root.child.grandchild');
  });
});
```

## Testing Backward Compatibility

```typescript
describe('Backward compatibility', () => {
  it('should support old method signature', () => {
    const logger = new Logger();
    expect(() => logger.log('message')).not.toThrow();
  });

  it('should support new method signature', () => {
    const logger = new Logger();
    expect(() => logger.log('info', 'message')).not.toThrow();
  });

  it('should maintain old behavior with signature change', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger();

    logger.log('message');

    expect(consoleSpy).toHaveBeenCalledWith('message');
    consoleSpy.mockRestore();
  });
});
```

## Testing Type Safety

```typescript
import { expectTypeOf } from 'vitest';

describe('Type testing', () => {
  it('should have correct types', () => {
    const logger = new Logger();

    expectTypeOf(logger.log).toBeFunction();
    expectTypeOf(logger.log).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(logger.log).returns.toBeVoid();
  });

  it('should support interface compatibility', () => {
    expectTypeOf<Logger>().toMatchTypeOf<ILogger>();
  });
});
```

## Best Practices

1. **Group related tests with `describe`**
2. **Use descriptive test names** that explain what is being tested
3. **Follow AAA pattern** (Arrange, Act, Assert)
4. **Keep tests independent and isolated**
5. **Always restore mocks** in `afterEach`
6. **Prefer spies over mocks** when possible
7. **Mock at the boundary** of your code

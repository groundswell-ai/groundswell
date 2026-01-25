# npm Script Testing and Verification Research

## Best Practices for TypeScript Example Script Verification

### 1. Exit Code Validation

Exit codes are the primary signal for script success/failure:
- `0` = success
- Non-zero = failure

**Current Issue in Examples**: All examples use `.catch(console.error)` which logs errors but exits with code 0.

**For Verification Purposes**: We need to detect failures through:
1. Console error output (even if exit code is 0)
2. Uncaught exceptions that cause script termination
3. Timeout detection (hanging scripts)

### 2. tsx (TypeScript Execute) Usage

**tsx Documentation**: https://tsx.is

**Key Features**:
- Runs TypeScript files directly without compilation
- ESM support (matches `"type": "module"`)
- Fast execution via esbuild
- Handles tsconfig.json automatically

**Current Usage** (correct):
```json
"start:basic": "tsx examples/examples/01-basic-workflow.ts"
```

### 3. Console Output Validation Patterns

From the codebase's existing test patterns (`src/__tests__/integration/observer-logging.test.ts`):

```typescript
import { vi, expect } from 'vitest';

it('should validate console output', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Run code
  runExample();

  // Validate
  expect(consoleErrorSpy).not.toHaveBeenCalled();

  consoleErrorSpy.mockRestore();
});
```

### 4. Automated Example Testing Approaches

**Approach 1: Direct CLI Execution**
```bash
npm run start:basic
# Verify: Script runs without errors, produces expected output
```

**Approach 2: Vitest Console Spying**
```typescript
import { runBasicWorkflowExample } from '../../../examples/examples/01-basic-workflow.js';

it('should run without errors', async () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  await runBasicWorkflowExample();

  expect(consoleErrorSpy).not.toHaveBeenCalled();
  consoleErrorSpy.mockRestore();
});
```

**Approach 3: Child Process Execution**
```typescript
import { execSync } from 'child_process';

it('should exit successfully', () => {
  expect(() => {
    execSync('npm run start:basic', { stdio: 'pipe' });
  }).not.toThrow();
});
```

### 5. Common Pitfalls to Avoid

**Pitfall 1: Not Restoring Console Spies**
```typescript
// BAD
vi.spyOn(console, 'log').mockImplementation(() => {});

// GOOD
const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
// ... test code ...
spy.mockRestore();
```

**Pitfall 2: Not Handling Async Properly**
```typescript
// BAD
it('should run', () => {
  runExample(); // Not awaited!
});

// GOOD
it('should run', async () => {
  await runExample();
});
```

**Pitfall 3: Testing Implementation Instead of Behavior**
```typescript
// BAD - tests internal details
expect(example.status).toBe('completed');

// GOOD - tests observable behavior
expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('completed'));
```

### 6. Recommended Verification Commands for This PRP

**Individual Script Testing**:
```bash
# Test each example individually
npm run start:basic
npm run start:decorators
npm run start:parent-child
# ... etc
```

**Sequential Testing**:
```bash
# Run all examples sequentially
npm run start:all
```

**Timeout Protection** (for CI/CD):
```bash
# Prevent hanging examples
timeout 30s npm run start:basic
timeout 30s npm run start:decorators
# ... etc
```

### 7. Expected Output Validation

For each example, verify:
1. **No console.error calls** (except for intentional error demonstrations in 05-error-handling.ts)
2. **Status completion messages** (Workflow completed, etc.)
3. **Tree visualization output** (ASCII trees)
4. **Statistics output** (timing, node counts, etc.)

### 8. AgentResponse-Specific Validation

For examples that use AgentResponse patterns:
1. **Status checking before data access**: `if (response.status === 'success')`
2. **Error handling**: `if (response.status === 'error')`
3. **Type-safe data access**: After status check, access response.data

## References

- tsx GitHub: https://github.com/privatenumber/tsx
- tsx Documentation: https://tsx.is
- npm Scripts: https://docs.npmjs.com/cli/v9/using-npm/scripts
- Node.js Exit Codes: https://nodejs.org/api/process.html#process_exit_codes
- Vitest Documentation: https://vitest.dev
- Testing Best Practices: https://github.com/goldbergyoni/javascript-testing-best-practices

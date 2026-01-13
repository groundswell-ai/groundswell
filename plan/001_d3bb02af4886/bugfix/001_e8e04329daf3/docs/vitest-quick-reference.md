# Vitest Quick Reference

> Quick command reference for Vitest testing in the Groundswell project.

## Basic Commands

```bash
# Watch mode (default, for development)
vitest

# CI mode (run once)
vitest run

# Project script (runs vitest run)
npm test

# Watch mode project script
npm run test:watch
```

## Filtering Tests

```bash
# Run specific test file
vitest run src/__tests__/workflow.test.ts

# Run tests by name pattern
vitest run -t "authentication"
vitest run --testNamePattern="should.*pass"

# Run tests in directory
vitest run src/__tests__/unit/

# Multiple patterns (regex OR)
vitest run --testNamePattern="auth|login"
```

## Reporters & Output

```bash
# Verbose console output
vitest run --reporter=verbose

# JSON report
vitest run --reporter=json --outputFile=test-results.json

# JUnit report (CI/CD)
vitest run --reporter=junit --outputFile=test-results.xml

# HTML report
vitest run --reporter=html --outputFile=test-report/index.html

# Multiple reporters
vitest run \
  --reporter=verbose \
  --reporter=json \
  --reporter=junit \
  --outputFile.json=test-results.json \
  --outputFile.junit=test-results.xml
```

## Coverage

```bash
# Generate coverage
vitest run --coverage

# HTML coverage report
vitest run --coverage --coverage.reporter=html

# Multiple coverage formats
vitest run \
  --coverage \
  --coverage.reporter=text \
  --coverage.reporter=json \
  --coverage.reporter=html \
  --coverage.reportsDirectory=./coverage
```

## Common CLI Flags

| Flag | Description |
|------|-------------|
| `--run` | Run tests once (CI mode) |
| `--watch` | Enable watch mode |
| `--silent` | Reduce output |
| `--ui` | Launch Vitest UI |
| `--config <path>` | Custom config file |
| `--coverage` | Enable coverage |
| `--no-coverage` | Disable coverage |
| `--threads` | Run in parallel (default) |
| `--no-threads` | Run sequentially |
| `--help` | Show help |
| `--version` | Show version |

## In-Code Filtering

```typescript
import { test, describe } from 'vitest';

// Run only this test
test.only('exclusive test', () => {});

// Skip this test
test.skip('skipped test', () => {});

// Run only this suite
describe.only('exclusive suite', () => {});

// Skip this suite
describe.skip('skipped suite', () => {});
```

## Exit Codes

- `0` - All tests passed
- `1` - Tests failed

## Configuration File

**Location:** `/home/dustin/projects/groundswell/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    reporters: ['verbose'],
  },
});
```

## Recommended NPM Scripts to Add

```json
{
  "test:report": "vitest run --reporter=verbose --reporter=json --outputFile=test-results.json",
  "test:ci": "vitest run --reporter=junit --outputFile=test-results.xml",
  "test:coverage": "vitest run --coverage --coverage.reporter=html",
  "test:ui": "vitest --ui"
}
```

## Project-Specific Info

- **Test Location:** `src/__tests__/**/*.test.ts`
- **Config File:** `vitest.config.ts`
- **Current Scripts:** `test`, `test:watch`
- **Node Target:** node18

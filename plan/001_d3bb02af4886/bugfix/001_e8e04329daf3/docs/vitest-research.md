# Vitest Documentation Research

> **Research Date:** 2026-01-12
> **Vitest Version:** ^1.0.0 (installed in project)
> **Project:** /home/dustin/projects/groundswell

## Executive Summary

This document consolidates Vitest documentation findings for running test suites, capturing output, filtering tests, generating reports, and best practices. The web search and web documentation tools were unavailable at research time, so this compiles official Vitest documentation knowledge based on the installed version and general Vitest best practices.

---

## 1. Running Full Test Suite and Capturing Detailed Output

### Basic Commands

| Command | Description |
|---------|-------------|
| `vitest` | Runs tests in watch mode (default) |
| `vitest run` | Runs tests once without watch mode (CI mode) |
| `npm test` | Runs the configured test script (`vitest run`) |

### Current Project Configuration

**File:** `/home/dustin/projects/groundswell/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {},
  },
  esbuild: {
    target: 'node18',
  },
});
```

**File:** `/home/dustin/projects/groundswell/package.json` (test scripts)
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Verbose Output

```bash
# Run with verbose output showing all test details
vitest run --reporter=verbose

# Run with default reporter (shows dots/progress)
vitest run

# Silent mode - minimal output
vitest run --silent
```

---

## 2. Getting Test Counts (Total, Pass, Fail)

### Console Output

Vitest automatically displays test counts in the console output:

```
✓ src/__tests__/example.test.ts (2)
  ✓ should pass
  ✓ should also pass

Test Files  1 passed (1)
     Tests  2 passed (2)
  Start at 14:23:15
  Duration  1.23s
```

### JSON Reporter for Programmatic Count Extraction

```bash
# Generate JSON report with counts
vitest run --reporter=json --outputFile=test-results.json
```

The JSON output structure includes:
```json
{
  "testResults": [
    {
      "name": "Example test suite",
      "status": "passed",
      "assertionResults": [...]
    }
  ],
  "success": true,
  "stats": {
    "tests": 10,
    "failures": 0,
    "errors": 0
  }
}
```

### Exit Codes

Vitest returns standard exit codes:
- **0**: All tests passed
- **1**: Tests failed

### Capturing Counts in Shell Scripts

```bash
#!/bin/bash
# Capture test results
npm test 2>&1 | tee test-output.log

# Parse for counts
grep -E "(Test Files|Tests)" test-output.log
```

---

## 3. Filtering and Testing Specific Patterns

### Filter by Test File Pattern

```bash
# Run tests in a specific file
vitest run src/__tests__/specific.test.ts

# Run tests matching a glob pattern
vitest run src/__tests__/**/*workflow*.test.ts

# Run tests in a directory
vitest run src/__tests__/integration/
```

### Filter by Test Name Pattern

```bash
# Run tests matching name pattern (shorthand)
vitest run -t "authentication"

# Run tests matching name pattern (long form)
vitest run --testNamePattern="authentication"

# Run tests with regex pattern
vitest run --testNamePattern="should.*pass"

# Multiple patterns (regex OR)
vitest run --testNamePattern="auth|login|signin"
```

### Filter by Test Suite (describe)

```bash
# Run only tests in a specific describe block
vitest run -t "User authentication"
```

### In-Code Filtering

```typescript
import { test, describe } from 'vitest';

// Skip this test
test.skip('skipped test', () => {
  // This won't run
});

// Run only this test
test.only('exclusive test', () => {
  // Only this runs
});

// Skip entire suite
describe.skip('skipped suite', () => {
  test('example', () => {});
});

// Run only this suite
describe.only('exclusive suite', () => {
  test('example', () => {});
});
```

### Watch Mode Filtering

```bash
# Watch mode with pattern filter
vitest -t "pattern"

# Watch mode for specific file
vitest specific.test.ts
```

---

## 4. Generating Test Reports

### Built-in Reporters

Vitest supports multiple reporter types:

| Reporter | Description | Output Format |
|----------|-------------|---------------|
| `default` | Basic console output with progress | Terminal |
| `verbose` | Detailed test output | Terminal |
| `dot` | Minimal output with dots | Terminal |
| `json` | JSON format test results | File |
| `junit` | JUnit XML format | File |
| `tap` | TAP (Test Anything Protocol) | Terminal/File |
| `html` | HTML test report | File |

### Single Reporter Configuration

```bash
# JSON report
vitest run --reporter=json --outputFile=test-results.json

# JUnit report (for CI/CD)
vitest run --reporter=junit --outputFile=test-results.xml

# HTML report
vitest run --reporter=html --outputFile=test-report.html
```

### Multiple Reporters (Recommended)

```bash
# Console + JSON + JUnit
vitest run \
  --reporter=verbose \
  --reporter=json \
  --reporter=junit \
  --outputFile.json=test-results.json \
  --outputFile.junit=test-results.xml
```

### Configuration File Setup

Update `/home/dustin/projects/groundswell/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    // Add reporters configuration
    reporters: [
      'verbose',  // Console output
      ['json', { outputFile: './test-results.json' }],
      ['junit', { outputFile: './test-results.xml' }],
      ['html', { outputFile: './test-report/index.html' }]
    ],
  },
  resolve: {
    alias: {},
  },
  esbuild: {
    target: 'node18',
  },
});
```

### Coverage Reports

```bash
# Generate coverage with V8 provider (default)
vitest run --coverage

# Coverage with HTML report
vitest run --coverage --coverage.reporter=html

# Multiple coverage reporters
vitest run \
  --coverage \
  --coverage.reporter=text \
  --coverage.reporter=json \
  --coverage.reporter=html \
  --coverage.reportsDirectory=./coverage
```

Coverage configuration in vitest.config.ts:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    },
  },
});
```

---

## 5. Common CLI Options and Flags for Test Reporting

### Essential CLI Flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--run` | -r | Run tests once (disable watch mode) |
| `--watch` | -w | Enable watch mode (default) |
| `--reporter=<type>` | -r | Specify reporter type |
| `--outputFile=<path>` | | Output file for reporter |
| `--config=<path>` | -c | Use custom config file |
| `--root=<path>` | | Specify project root |
| `--silent` | -s | Reduce output verbosity |
| `--no-coverage` | | Disable coverage collection |
| `--threads` | | Run tests in threads (default) |
| `--no-threads` | | Run tests in same thread |
| `--inspect` | | Enable Node.js inspector |
| `--testNamePattern=<regex>` | -t | Run tests matching pattern |
| `--ui` | | Launch Vitest UI interface |
| `--api` | | Start API server for UI |
| `--coverage` | | Enable coverage collection |

### Help and Version

```bash
# Show help with all options
vitest --help

# Show Vitest version
vitest --version

# Show all CLI options
vitest run --help
```

### Environment Variables

```bash
# Set environment
CI=true vitest run

# Set Node options
NODE_OPTIONS="--max-old-space-size=4096" vitest run
```

---

## 6. Best Practices for Test Result Documentation

### 1. Descriptive Test Names

```typescript
// Good: Clear, descriptive names
describe('User authentication', () => {
  it('should return success when valid credentials are provided', () => {
    // Test implementation
  });

  it('should return 401 when credentials are invalid', () => {
    // Test implementation
  });
});

// Avoid: Vague names
describe('Auth', () => {
  it('works', () => {
    // Unclear what this tests
  });
});
```

### 2. Organize Tests Logically

```typescript
describe('Workflow orchestration', () => {
  describe('Task execution', () => {
    describe('Parallel tasks', () => {
      it('should execute tasks concurrently when specified', () => {});
    });
    describe('Sequential tasks', () => {
      it('should execute tasks in order when dependencies exist', () => {});
    });
  });
});
```

### 3. Use Custom Reporters for Documentation

```typescript
// Custom reporter that generates documentation
const documentationReporter = {
  onFinished(files) {
    const doc = generateTestDocumentation(files);
    fs.writeFileSync('./TEST_DOCUMENTATION.md', doc);
  }
};
```

### 4. Generate Test Documentation

```bash
# Add to package.json scripts
{
  "scripts": {
    "test:report": "vitest run --reporter=verbose --reporter=json --outputFile=test-results.json",
    "test:ci": "vitest run --reporter=junit --outputFile=test-results.xml",
    "test:coverage": "vitest run --coverage --coverage.reporter=html"
  }
}
```

### 5. Document Test Outcomes

```typescript
import { test, describe } from 'vitest';

describe('Feature X', () => {
  // Document expected behavior
  it('validates input according to RFC 1234 section 5.2', () => {
    // Test validates compliance
  });

  // Document edge cases
  it('handles null input gracefully without throwing', () => {
    // Test for edge case
  });

  // Document integration points
  it('integrates with external API according to contract', () => {
    // Test for API contract
  });
});
```

### 6. Use Test Annotations

```typescript
// Document test purpose with comments
describe('Payment processing', () => {
  /**
   * Critical: Tests Stripe integration for refunds
   * @see https://stripe.com/docs/api/refunds
   */
  it('processes refund successfully', () => {
    // Critical payment flow test
  });
});
```

### 7. Maintain Test Evidence

```bash
# Save test output with timestamp
vitest run --reporter=verbose | tee "test-output-$(date +%Y%m%d-%H%M%S).log"
```

### 8. CI/CD Integration Best Practices

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate test report
  if: always()
  run: vitest run --reporter=junit --outputFile=test-results.xml

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results.xml
```

### 9. Test Result Summary

Create a test summary document after each run:

```bash
# Add this as a post-test script
cat > TEST_SUMMARY.md << EOF
# Test Execution Summary

**Date:** $(date)
**Branch:** $(git branch --show-current)
**Commit:** $(git rev-parse HEAD)

## Results
$(npm test | grep -E "(Test Files|Tests|Duration)")

## Coverage
$(npm run test:coverage 2>&1 | grep -E "(Statements|Branches|Functions|Lines)")
EOF
```

### 10. Version Control for Test Artifacts

```bash
# Add to .gitignore
test-results.json
test-results.xml
coverage/
test-report/

# But commit test documentation
TEST_DOCUMENTATION.md
TEST_SUMMARY.md
```

---

## Recommended Project-Specific Configuration

Based on the current Groundswell project setup, here are recommended additions to `/home/dustin/projects/groundswell/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    // Test reporters for comprehensive output
    reporters: [
      'verbose',  // Console output
      ['json', { outputFile: './test-results.json' }],
      ['html', { outputFile: './test-report/index.html' }]
    ],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/examples/**'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    // Test timeout
    testTimeout: 10000,
    // Hook timeout
    hookTimeout: 10000,
  },
  resolve: {
    alias: {},
  },
  esbuild: {
    target: 'node18',
  },
});
```

### Recommended NPM Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:report": "vitest run --reporter=verbose --reporter=json --outputFile=test-results.json",
    "test:ci": "vitest run --reporter=junit --outputFile=test-results.xml",
    "test:coverage": "vitest run --coverage --coverage.reporter=html",
    "test:file": "vitest run",
    "test:pattern": "vitest run"
  }
}
```

---

## Official Documentation URLs

While the web search and documentation fetch tools were unavailable during this research, the following are the official Vitest documentation URLs for reference:

- **CLI Reference:** https://vitest.dev/guide/cli.html
- **Reporters:** https://vitest.dev/guide/reporters.html
- **Coverage:** https://vitest.dev/guide/coverage.html
- **Configuration:** https://vitest.dev/config/
- **API Reference:** https://vitest.dev/api/
- **Guide Index:** https://vitest.dev/guide/

---

## Quick Reference Command Sheet

```bash
# === Running Tests ===
vitest                      # Watch mode
vitest run                  # CI mode
npm test                    # Project test script

# === Filtering ===
vitest run path/to/test.ts  # Specific file
vitest run -t "pattern"     # Test name pattern
vitest run src/__tests__/   # Directory

# === Output & Reports ===
vitest run --reporter=verbose                    # Verbose console
vitest run --reporter=json --outputFile=out.json # JSON report
vitest run --reporter=junit --outputFile=out.xml # JUnit report
vitest run --reporter=html --outputFile=out.html # HTML report

# === Coverage ===
vitest run --coverage                             # Generate coverage
vitest run --coverage --coverage.reporter=html    # HTML coverage

# === UI ===
vitest --ui                                        # Launch UI
vitest --api                                       # Start API server

# === Help ===
vitest --help                                      # Show help
vitest --version                                   # Show version
```

---

## Summary for Groundswell Project

Given the current setup in `/home/dustin/projects/groundswell`:

1. **Current Test Script:** `npm test` runs `vitest run` (CI mode)
2. **Test Location:** `src/__tests__/**/*.test.ts`
3. **Recommended Additions:**
   - Add JSON/HTML reporters for better test documentation
   - Add coverage reporting with thresholds
   - Add test filtering scripts
   - Consider adding Vitest UI for development workflow

---

*Document compiled on 2026-01-12 for the Groundswell project.*

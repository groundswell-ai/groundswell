# Product Requirement Prompt (PRP): Write Tests for Workflow Name Security Validation

---

## Goal

**Feature Goal**: Add comprehensive test coverage for the workflow name security validation implemented in P3.M1.T3.S1, covering all security patterns (control characters, HTML/JavaScript injection, path traversal, file system characters, and allowlist validation).

**Deliverable**: Extended test suite in `src/__tests__/unit/workflow.test.ts` with comprehensive security validation tests covering all attack vectors, edge cases, and both constructor patterns.

**Success Definition**:
- [ ] All security validation patterns have test coverage (control chars, XSS, path traversal, FS chars, allowlist)
- [ ] Tests cover both positive (valid names) and negative (invalid names) cases
- [ ] Both constructor patterns tested (class-based and functional)
- [ ] Edge cases covered (boundaries, positions, combinations)
- [ ] All tests pass: `npm test -- src/__tests__/unit/workflow.test.ts`
- [ ] Linting passes: `npm run lint`
- [ ] No existing tests broken

---

## User Persona

**Target User**: Implementation agent working on P3.M1.T3.S2 (workflow name security validation tests).

**Use Case**: Writing comprehensive unit tests for security validation to ensure the workflow name validation implementation from P3.M1.T3.S1 is properly tested and maintained.

**User Journey**:
1. Review existing workflow name validation tests
2. Study the security validation implementation from P3.M1.T3.S1
3. Add security validation tests following existing patterns
4. Test both constructor patterns (class-based and functional)
5. Verify with test runner and linter

**Pain Points Addressed**:
- **Security Gap**: Existing tests don't cover security validation patterns
- **Incomplete Coverage**: No tests for XSS, path traversal, control characters
- **Pattern Inconsistency**: Need to ensure tests follow existing codebase patterns
- **Constructor Patterns**: Both class-based and functional patterns need testing

---

## Why

**Business Value and User Impact**:
- Ensures security validation is properly tested and maintained
- Prevents regression of security fixes
- Documents expected security behavior through tests
- Catches security issues before they reach production
- Provides confidence that malicious inputs are rejected

**Integration with Existing Features**:
- Builds on existing workflow name validation tests
- Follows existing test patterns in the codebase
- Uses existing SimpleWorkflow test class pattern
- Consistent with toThrow() assertion patterns
- Extends existing "Workflow Name Validation" describe block

**Problems Solved**:
- **Issue 10**: Workflow constructor validates empty/whitespace/length but security validation needs tests
- **Testing Gap**: P3.M1.T3.S1 added security validation but no comprehensive tests
- **Coverage Gap**: Control characters, XSS, path traversal, file system characters untested
- **Maintenance Risk**: Without tests, security validation could regress

---

## What

**User-Visible Behavior and Technical Requirements**:

### Test Coverage Requirements

Extend the existing "Workflow Name Validation" describe block in `src/__tests__/unit/workflow.test.ts` (starting at line 13) with comprehensive security validation tests:

**1. Control Character Tests**
- Test ASCII control characters (0x00-0x1F, 0x7F)
- Test null byte, bell, escape, delete characters
- Test control characters embedded within valid content
- Test all control characters in range using parameterized tests

**2. HTML/JavaScript Injection Tests**
- Test script tags (`<script>alert("xss")</script>`)
- Test HTML tags (`<img>`, `<div>`, `<iframe>`, etc.)
- Test javascript: protocol (case variations)
- Test JavaScript event handlers (`onerror`, `onload`, etc.)
- Test partial/incomplete HTML tags

**3. Path Traversal Tests**
- Test Unix path traversal (`../`)
- Test Windows path traversal (`..\`)
- Test multiple consecutive parent references
- Test path traversal at beginning, middle, and end
- Test mixed separators

**4. File System Character Tests**
- Test forward slash (`/`)
- Test backslash (`\`)
- Test colon (`:`)
- Test asterisk (`*`)
- Test question mark (`?`)
- Test double quote (`"`)
- Test angle brackets (`<`, `>`)
- Test pipe (`|`)
- Test characters at different positions

**5. Allowlist Validation Tests**
- Test valid alphanumeric names
- Test names with spaces, hyphens, underscores
- Test combinations of allowed characters
- Test invalid characters rejected by allowlist
- Test single character edge cases

**6. Both Constructor Patterns**
- Test all security validations in class-based pattern
- Test all security validations in functional pattern
- Verify consistent error messages across patterns
- Verify consistent behavior across patterns

### Success Criteria

- [ ] All security validation patterns have test coverage
- [ ] Tests use existing SimpleWorkflow class pattern
- [ ] Tests follow existing toThrow() assertion pattern
- [ ] Both constructor patterns tested for each security pattern
- [ ] Generic error message used consistently
- [ ] Parameterized tests used for repetitive cases
- [ ] All existing tests still pass
- [ ] Test count increases appropriately
- [ ] No linting errors

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file location and line numbers for test modifications
- Existing test patterns to follow
- Complete security validation implementation details
- Test constants and helper patterns
- Both constructor patterns to test
- Error messages to use in assertions
- External testing best practices references

---

### Documentation & References

```yaml
# MUST READ - Existing workflow tests
- file: src/__tests__/unit/workflow.test.ts
  why: Contains existing workflow name validation tests to extend
  lines: 1-85 (imports, SimpleWorkflow class, existing name validation tests)
  pattern: SimpleWorkflow class extends Workflow, toThrow() assertions, specific error messages
  critical: New security tests must be added to existing "Workflow Name Validation" describe block

# MUST READ - Security validation implementation (from P3.M1.T3.S1)
- file: src/core/workflow.ts
  why: Contains the security validation that needs test coverage
  lines: 127-161 (validation logic), 62-85 (security validations)
  pattern: Multiple validation checks with same generic error message
  critical: Tests must validate all 7 validation layers

# MUST READ - Security validation analysis
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S2/research/workflow-constructor-validation-analysis.md
  why: Complete analysis of validation implementation with exact code and test requirements
  section: Complete sections 2 (Security Validation Patterns), 6 (Test Requirements), 10 (Code Snippets)
  critical: Contains exact validation patterns, error messages, and test templates

# MUST READ - Security testing best practices
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S2/research/security-testing-research.md
  why: Comprehensive security testing patterns and best practices
  section: Section 1 (Testing Security Validation Patterns), Section 3 (Vitest/Jest Patterns)
  critical: Contains parameterized test patterns, test constants, helper functions

# MUST READ - Previous PRP (P3.M1.T3.S1)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/PRP.md
  why: Understand what validation was implemented and needs testing
  section: Implementation Blueprint, Implementation Patterns & Key Details
  critical: Contains exact validation code and test patterns specified in previous PRP

# EXTERNAL REFERENCES - Security testing resources
- url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
  why: OWASP input validation guidelines
  section: Allowlist Validation, Testing
  critical: Industry standard for input validation testing

- url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
  why: OWASP XSS prevention guidelines
  section: Testing for XSS
  critical: Understanding XSS attack patterns to test

- url: https://vitest.dev/guide/
  why: Vitest testing framework documentation
  section: toThrow(), it.each()
  critical: Framework-specific testing patterns
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   └── workflow.ts              # READ: Security validation implementation (lines 127-161)
├── __tests__/
│   └── unit/
│       └── workflow.test.ts     # MODIFY: Add security validation tests (after line 85)
└── types/
    └── workflow.ts              # REFERENCE: WorkflowConfig type
```

---

### Desired Codebase Tree with Tests to be Added

```bash
# MODIFIED FILE:

# src/__tests__/unit/workflow.test.ts
# - Lines 13-85: Existing "Workflow Name Validation" describe block
# - After line 85: ADD security validation tests
#   - Control character tests (parameterized)
#   - HTML/JavaScript injection tests (parameterized)
#   - Path traversal tests (parameterized)
#   - File system character tests (parameterized)
#   - Allowlist validation tests (positive and negative)
#   - Both constructor patterns tests
#   - Edge case tests
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use existing SimpleWorkflow class pattern
// Pattern from src/__tests__/unit/workflow.test.ts:4-11
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}
// Use this pattern for all security validation tests

// CRITICAL: Error messages from P3.M1.T3.S1 implementation
// All security validations use SAME generic message (security best practice)
const ERROR_INVALID_CHARS = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';
const ERROR_EMPTY = 'Workflow name cannot be empty or whitespace only';
const ERROR_TOO_LONG = 'Workflow name cannot exceed 100 characters';

// CRITICAL: Both constructor patterns must be tested
// Class-based: new SimpleWorkflow('name')
// Functional: new Workflow({ name: 'name' }, async () => {})
// Security validation applies identically to both (both normalize to this.config.name)

// CRITICAL: toThrow() pattern from existing tests
// Pattern: expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
// Use arrow function wrapper with toThrow()
// Don't call constructor directly in expect()

// CRITICAL: Test organization
// Add tests to existing "Workflow Name Validation" describe block
// Use nested describe blocks for each security category
// Follow existing test naming convention: 'should reject...' or 'should accept...'

// CRITICAL: Parameterized tests (it.each) for repetitive cases
// Reduces code duplication for multiple similar test cases
// Improves test maintainability
// Pattern from security-testing-research.md

// CRITICAL: Test constants at top of describe block
// Define ERROR_INVALID_CHARS constant for reuse
// Define test payload constants for XSS, path traversal, control chars
// Single source of truth for test data

// CRITICAL: Both positive and negative cases
// Positive: Valid names that should be accepted
// Negative: Invalid names that should be rejected
// Test both to ensure validation works correctly

// CRITICAL: Edge cases to test
- Single character names
- Characters at beginning, middle, end
- Multiple consecutive special characters
- Case variations (for javascript:)
- Combinations of allowed characters
- Boundary conditions (100 chars, 101 chars)

// CRITICAL: Validation uses trimmedName for security checks
// Security validations apply to trimmedName (after .trim())
// Length check uses original this.config.name (not trimmed)
// Tests should verify this behavior

// CRITICAL: Existing tests must still pass
- Don't modify existing tests
- Only add new security validation tests
- All existing functionality must continue to work

// CRITICAL: Test structure pattern
describe('Workflow Name Validation', () => {
  // ... existing tests (lines 14-85) ...

  // NEW: Security validation tests
  describe('Security - Control Characters', () => {
    // Control character tests here
  });

  describe('Security - HTML/JavaScript Injection', () => {
    // XSS tests here
  });

  // ... more security categories ...
});

// CRITICAL: Helper functions for testing both patterns
// Create helper to test both class-based and functional patterns
// Reduces duplication in constructor pattern tests
// Pattern from security-testing-research.md section 4.3

// CRITICAL: Generic error message (security best practice)
// All security violations use same error message
// Don't reveal which specific validation failed
// Prevents information disclosure to attackers

// CRITICAL: Vitest/Jest specific patterns
- Use toThrow() for error testing
- Use it.each() for parameterized tests
- Use describe() for grouping related tests
- Use expect().not.toThrow() for positive cases

// CRITICAL: Test naming convention
- 'should reject [description]' for negative cases
- 'should accept [description]' for positive cases
- Descriptive names that explain what is being tested
- Include security category in describe block

// CRITICAL: Coverage requirements
- Every security validation pattern must be tested
- Both constructor patterns for each validation
- Positive and negative cases
- Edge cases and boundaries
- At least 50+ new test cases expected

// CRITICAL: Don't break existing tests
- Run tests after adding each test block
- Verify existing tests still pass
- Check test count increases appropriately
- No regressions in existing functionality
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - tests validate existing validation logic:

```typescript
// Test constants to define at top of describe block
const ERROR_INVALID_CHARS = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

// Control character test payloads
const CONTROL_CHAR_TEST_CASES = [
  ['\x00', 'null byte'],
  ['\x07', 'bell'],
  ['\x1B', 'escape'],
  ['\x7F', 'delete'],
  // ... more control characters
];

// XSS payload test cases
const XSS_TEST_CASES = [
  ['<script>alert("xss")</script>', 'script tag'],
  ['<iframe>evil</iframe>', 'iframe tag'],
  ['<img onerror=alert(1)>', 'img with onerror'],
  ['javascript:alert(1)', 'javascript protocol'],
  // ... more XSS payloads
];

// Path traversal test cases
const PATH_TRAVERSAL_TEST_CASES = [
  ['../etc/passwd', 'Unix parent directory'],
  ['..\\windows\\system32', 'Windows parent directory'],
  ['../../etc/passwd', 'double parent Unix'],
  // ... more path traversal payloads
];

// File system character test cases
const FS_CHAR_TEST_CASES = [
  ['my/workflow', 'forward slash'],
  ['my\\workflow', 'backslash'],
  ['my:workflow', 'colon'],
  // ... more file system characters
];
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ existing test file and understand patterns
  - FILE: src/__tests__/unit/workflow.test.ts
  - LINES: 1-85 (imports, SimpleWorkflow class, existing tests)
  - UNDERSTAND: Test structure, toThrow() pattern, SimpleWorkflow usage
  - PATTERN: Arrow function wrapper with toThrow(), specific error messages

Task 2: READ security validation implementation
  - FILE: src/core/workflow.ts
  - LINES: 127-161 (validation logic), 62-85 (security validations)
  - UNDERSTAND: All 7 validation layers, error messages, trimmedName usage
  - REFERENCE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S2/research/workflow-constructor-validation-analysis.md

Task 3: ADD test constants at top of describe block
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After line 13 (inside "Workflow Name Validation" describe)
  - ADD: ERROR_INVALID_CHARS constant
  - ADD: Test payload constants for each security category
  - PATTERN: Follow security-testing-research.md patterns

Task 4: ADD control character tests
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After existing tests (after line 85)
  - ADD: describe('Security - Control Characters', () => { ... })
  - ADD: Tests for null byte, bell, escape, delete
  - ADD: Parameterized tests for all control characters (0x00-0x1F, 0x7F)
  - PATTERN: it.each() for comprehensive coverage
  - COVERAGE: ASCII control characters range

Task 5: ADD HTML/JavaScript injection tests
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After control character tests
  - ADD: describe('Security - HTML/JavaScript Injection', () => { ... })
  - ADD: Tests for script tags, iframe tags, img tags
  - ADD: Tests for javascript: protocol (case variations)
  - ADD: Tests for JavaScript event handlers
  - ADD: Parameterized tests for comprehensive XSS coverage
  - PATTERN: it.each() for multiple XSS payloads
  - COVERAGE: OWASP XSS payload list

Task 6: ADD path traversal tests
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: after XSS tests
  - ADD: describe('Security - Path Traversal', () => { ... })
  - ADD: Tests for Unix path traversal (../)
  - ADD: Tests for Windows path traversal (..\)
  - ADD: Tests for multiple parent references
  - ADD: Tests for path traversal at different positions
  - ADD: Parameterized tests for comprehensive coverage
  - PATTERN: it.each() for multiple path traversal payloads
  - COVERAGE: Unix and Windows path traversal patterns

Task 7: ADD file system character tests
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After path traversal tests
  - ADD: describe('Security - File System Characters', () => { ... })
  - ADD: Individual tests for each FS character (/, \, :, *, ?, ", <, >, |)
  - ADD: Tests for characters at different positions
  - ADD: Parameterized tests for all FS characters
  - PATTERN: it.each() for systematic character testing
  - COVERAGE: All file system special characters

Task 8: ADD allowlist validation tests (positive cases)
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After FS character tests
  - ADD: describe('Security - Allowed Characters (Positive)', () => { ... })
  - ADD: Tests for alphanumeric names
  - ADD: Tests for names with spaces, hyphens, underscores
  - ADD: Tests for combinations of allowed characters
  - ADD: Tests for single character edge cases
  - PATTERN: expect().not.toThrow() for positive cases
  - COVERAGE: All allowed character combinations

Task 9: ADD allowlist validation tests (negative cases)
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After positive allowlist tests
  - ADD: describe('Security - Allowed Characters (Negative)', () => { ... })
  - ADD: Tests for punctuation characters (., @, #, $, etc.)
  - ADD: Tests for other invalid characters
  - ADD: Parameterized tests for systematic coverage
  - PATTERN: it.each() for multiple invalid characters
  - COVERAGE: Characters not in allowlist

Task 10: ADD both constructor patterns tests
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: After allowlist tests
  - ADD: describe('Security - Both Constructor Patterns', () => { ... })
  - ADD: Tests for class-based pattern (new SimpleWorkflow(name))
  - ADD: Tests for functional pattern (new Workflow({ name }, executor))
  - ADD: Consistency tests across patterns
  - ADD: Helper function for pattern-agnostic testing
  - PATTERN: testBothPatterns helper function
  - COVERAGE: All security validations in both patterns

Task 11: VERIFY all changes with test runner
  - COMMAND: npm test -- src/__tests__/unit/workflow.test.ts
  - EXPECTED: All tests pass (existing + new security tests)
  - VERIFY: Test count increased by expected amount
  - VERIFY: No existing tests broken

Task 12: VERIFY linter passes
  - COMMAND: npm run lint
  - EXPECTED: No errors
  - FIX: Any linting issues if they arise

Task 13: RUN full test suite
  - COMMAND: npm test
  - EXPECTED: All tests pass
  - VERIFY: No other tests broken by changes
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Test constants definition
// Location: Top of "Workflow Name Validation" describe block (after line 13)

describe('Workflow Name Validation', () => {
  // Test constants
  const ERROR_INVALID_CHARS = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';
  const ERROR_EMPTY = 'Workflow name cannot be empty or whitespace only';
  const ERROR_TOO_LONG = 'Workflow name cannot exceed 100 characters';

  // ... existing tests (lines 14-85) ...

  // NEW: Security validation tests
});

// PATTERN 2: Control character tests
// Location: After existing tests (after line 85)

describe('Security - Control Characters', () => {
  it('should reject names with null byte', () => {
    expect(() => new SimpleWorkflow('test\x00name')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with bell character', () => {
    expect(() => new SimpleWorkflow('test\x07name')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with escape character', () => {
    expect(() => new SimpleWorkflow('test\x1bname')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with delete character', () => {
    expect(() => new SimpleWorkflow('test\x7fname')).toThrow(ERROR_INVALID_CHARS);
  });

  // Parameterized tests for all control characters
  it.each([
    ['\x00', 'null byte'],
    ['\x01', 'start of heading'],
    ['\x02', 'start of text'],
    ['\x03', 'end of text'],
    ['\x04', 'end of transmission'],
    ['\x05', 'enquiry'],
    ['\x06', 'acknowledge'],
    ['\x07', 'bell'],
    ['\x08', 'backspace'],
    ['\x09', 'horizontal tab'],
    ['\x0A', 'line feed'],
    ['\x0B', 'vertical tab'],
    ['\x0C', 'form feed'],
    ['\x0D', 'carriage return'],
    ['\x0E', 'shift out'],
    ['\x0F', 'shift in'],
    ['\x10', 'data link escape'],
    ['\x11', 'device control 1'],
    ['\x12', 'device control 2'],
    ['\x13', 'device control 3'],
    ['\x14', 'device control 4'],
    ['\x15', 'negative acknowledge'],
    ['\x16', 'synchronous idle'],
    ['\x17', 'end of transmission block'],
    ['\x18', 'cancel'],
    ['\x19', 'end of medium'],
    ['\x1A', 'substitute'],
    ['\x1B', 'escape'],
    ['\x1C', 'file separator'],
    ['\x1D', 'group separator'],
    ['\x1E', 'record separator'],
    ['\x1F', 'unit separator'],
    ['\x7F', 'delete'],
  ])('should reject names with %s (0x%s)', (char, name) => {
    expect(() => new SimpleWorkflow(`test${char}name`)).toThrow(ERROR_INVALID_CHARS);
  });
});

// PATTERN 3: HTML/JavaScript injection tests
describe('Security - HTML/JavaScript Injection', () => {
  it('should reject names with script tags', () => {
    expect(() => new SimpleWorkflow('<script>alert("xss")</script>')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with iframe tags', () => {
    expect(() => new SimpleWorkflow('<iframe>evil</iframe>')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with javascript: protocol', () => {
    expect(() => new SimpleWorkflow('javascript:alert(1)')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with JAVASCRIPT: (uppercase)', () => {
    expect(() => new SimpleWorkflow('JAVASCRIPT:alert(1)')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with JavaScript event handlers', () => {
    expect(() => new SimpleWorkflow('<img onerror=alert(1)>')).toThrow(ERROR_INVALID_CHARS);
  });

  // Parameterized tests for comprehensive XSS coverage
  it.each([
    ['<script>alert("xss")</script>', 'script tag'],
    ['<iframe>evil</iframe>', 'iframe tag'],
    ['<img src=x onerror=alert(1)>', 'img with onerror'],
    ['<svg onload=alert(1)>', 'svg with onload'],
    ['javascript:alert(1)', 'javascript protocol'],
    ['JAVASCRIPT:alert(1)', 'javascript protocol uppercase'],
    ['JavaSCriPt:alert(1)', 'javascript protocol mixed case'],
    ['<div onclick="alert(1)">click</div>', 'div with onclick'],
    ['<a href="javascript:alert(1)">link</a>', 'anchor with javascript'],
    ['<style>body{background:red}</style>', 'style tag'],
    ['<link rel="stylesheet" href="evil.css">', 'link tag'],
  ])('should reject XSS payload: %s', (payload, description) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(ERROR_INVALID_CHARS);
  });
});

// PATTERN 4: Path traversal tests
describe('Security - Path Traversal', () => {
  it('should reject names with ../ pattern', () => {
    expect(() => new SimpleWorkflow('../etc/passwd')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with ..\\ pattern', () => {
    expect(() => new SimpleWorkflow('..\\windows\\system32')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with multiple .. patterns', () => {
    expect(() => new SimpleWorkflow('../../etc/passwd')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with .. in the middle', () => {
    expect(() => new SimpleWorkflow('my../workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  // Parameterized tests for comprehensive path traversal coverage
  it.each([
    ['../etc/passwd', 'Unix parent directory'],
    ['..\\windows\\system32', 'Windows parent directory'],
    ['../../etc/passwd', 'double parent Unix'],
    ['..\\..\\windows\\system32', 'double parent Windows'],
    ['./../etc/passwd', 'current then parent'],
    ['..\\./windows\\system32', 'mixed separators'],
    ['my../workflow', 'embedded parent reference'],
    ['workflow..../test', 'trailing parent reference'],
    ['.../test', 'multiple dots with slash'],
    ['....\\test', 'multiple dots with backslash'],
    ['/../test', 'absolute with parent'],
    ['\\..\\test', 'Windows absolute with parent'],
  ])('should reject path traversal: %s', (payload, description) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(ERROR_INVALID_CHARS);
  });
});

// PATTERN 5: File system character tests
describe('Security - File System Characters', () => {
  it('should reject names with forward slash', () => {
    expect(() => new SimpleWorkflow('my/workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with backslash', () => {
    expect(() => new SimpleWorkflow('my\\workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with colon', () => {
    expect(() => new SimpleWorkflow('my:workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with asterisk', () => {
    expect(() => new SimpleWorkflow('my*workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with question mark', () => {
    expect(() => new SimpleWorkflow('my?workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with double quote', () => {
    expect(() => new SimpleWorkflow('my"workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with angle brackets', () => {
    expect(() => new SimpleWorkflow('my<wor>flow')).toThrow(ERROR_INVALID_CHARS);
  });

  it('should reject names with pipe', () => {
    expect(() => new SimpleWorkflow('my|workflow')).toThrow(ERROR_INVALID_CHARS);
  });

  // Parameterized tests for all file system characters
  it.each([
    ['/', 'forward slash', 'my/workflow'],
    ['\\', 'backslash', 'my\\workflow'],
    [':', 'colon', 'my:workflow'],
    ['*', 'asterisk', 'my*workflow'],
    ['?', 'question mark', 'my?workflow'],
    ['"', 'double quote', 'my"workflow'],
    ['<', 'less than', 'my<workflow'],
    ['>', 'greater than', 'my>workflow'],
    ['|', 'pipe', 'my|workflow'],
  ])('should reject names with %s', (char, name, payload) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(ERROR_INVALID_CHARS);
  });
});

// PATTERN 6: Allowlist validation (positive cases)
describe('Security - Allowed Characters (Positive)', () => {
  it('should accept alphanumeric names', () => {
    expect(() => new SimpleWorkflow('Workflow123')).not.toThrow();
    expect(new SimpleWorkflow('Workflow123').getNode().name).toBe('Workflow123');
  });

  it('should accept names with spaces', () => {
    expect(() => new SimpleWorkflow('My Workflow')).not.toThrow();
    expect(new SimpleWorkflow('My Workflow').getNode().name).toBe('My Workflow');
  });

  it('should accept names with hyphens', () => {
    expect(() => new SimpleWorkflow('my-workflow')).not.toThrow();
    expect(new SimpleWorkflow('my-workflow').getNode().name).toBe('my-workflow');
  });

  it('should accept names with underscores', () => {
    expect(() => new SimpleWorkflow('my_workflow')).not.toThrow();
    expect(new SimpleWorkflow('my_workflow').getNode().name).toBe('my_workflow');
  });

  it('should accept names with mixed allowed characters', () => {
    expect(() => new SimpleWorkflow('My_Workflow-123 Test')).not.toThrow();
    expect(new SimpleWorkflow('My_Workflow-123 Test').getNode().name).toBe('My_Workflow-123 Test');
  });

  it('should accept uppercase letters', () => {
    expect(() => new SimpleWorkflow('UPPERCASE')).not.toThrow();
  });

  it('should accept lowercase letters', () => {
    expect(() => new SimpleWorkflow('lowercase')).not.toThrow();
  });

  it('should accept numbers', () => {
    expect(() => new SimpleWorkflow('123456')).not.toThrow();
  });

  it('should accept consecutive allowed characters', () => {
    expect(() => new SimpleWorkflow('my--workflow__test  123')).not.toThrow();
  });

  // Parameterized tests for valid names
  it.each([
    ['Workflow123', 'alphanumeric'],
    ['My Workflow', 'with spaces'],
    ['my-workflow', 'with hyphens'],
    ['my_workflow', 'with underscores'],
    ['My-Workflow_123 Test', 'all allowed characters'],
    ['ABC', 'uppercase only'],
    ['abc', 'lowercase only'],
    ['123', 'numbers only'],
    ['a', 'single letter'],
    ['_', 'single underscore'],
    ['-', 'single hyphen'],
  ])('should accept valid name: %s', (name, description) => {
    expect(() => new SimpleWorkflow(name)).not.toThrow();
    const wf = new SimpleWorkflow(name);
    expect(wf.getNode().name).toBe(name);
  });
});

// PATTERN 7: Allowlist validation (negative cases)
describe('Security - Allowed Characters (Negative)', () => {
  it.each([
    ['my.workflow', 'period'],
    ['my@workflow', 'at sign'],
    ['my#workflow', 'hash'],
    ['my$workflow', 'dollar sign'],
    ['my%workflow', 'percent'],
    ['my&workflow', 'ampersand'],
    ['my*workflow', 'asterisk'],
    ['my+workflow', 'plus sign'],
    ['my=workflow', 'equals sign'],
    ['my,workflow', 'comma'],
    ['my;workflow', 'semicolon'],
    ['my:workflow', 'colon'],
    ['my!workflow', 'exclamation mark'],
    ['my?workflow', 'question mark'],
    ['my(workflow', 'left parenthesis'],
    ['my)workflow', 'right parenthesis'],
    ['my{workflow', 'left brace'],
    ['my}workflow', 'right brace'],
    ['my[workflow', 'left bracket'],
    ['my]workflow', 'right bracket'],
    ['my|workflow', 'pipe'],
    ['my\\workflow', 'backslash'],
    ['my/workflow', 'forward slash'],
    ['my<workflow', 'less than'],
    ['my>workflow', 'greater than'],
    ["my'workflow", 'single quote'],
    ['my"workflow', 'double quote'],
    ['my`workflow', 'backtick'],
    ['my~workflow', 'tilde'],
  ])('should reject names with %s', (payload, description) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(ERROR_INVALID_CHARS);
  });
});

// PATTERN 8: Both constructor patterns tests
describe('Security - Both Constructor Patterns', () => {
  // Helper function to test both patterns
  const testBothPatterns = (name: string, shouldThrow: boolean, expectedMessage?: string) => {
    // Class-based pattern
    if (shouldThrow) {
      expect(() => new SimpleWorkflow(name)).toThrow(expectedMessage || ERROR_INVALID_CHARS);
    } else {
      expect(() => new SimpleWorkflow(name)).not.toThrow();
      const wf = new SimpleWorkflow(name);
      expect(wf.getNode().name).toBe(name);
    }

    // Functional pattern
    if (shouldThrow) {
      expect(() => new Workflow({ name }, async () => {})).toThrow(expectedMessage || ERROR_INVALID_CHARS);
    } else {
      expect(() => new Workflow({ name }, async () => {})).not.toThrow();
      const wf = new Workflow({ name }, async () => {});
      expect(wf.getNode().name).toBe(name);
    }
  };

  it('should reject control characters in both patterns', () => {
    testBothPatterns('test\x00name', true);
  });

  it('should reject XSS in both patterns', () => {
    testBothPatterns('<script>alert(1)</script>', true);
  });

  it('should reject path traversal in both patterns', () => {
    testBothPatterns('../etc/passwd', true);
  });

  it('should reject file system characters in both patterns', () => {
    testBothPatterns('my/workflow', true);
  });

  it('should accept valid names in both patterns', () => {
    testBothPatterns('My-Workflow_123', false);
  });

  it('should have consistent error messages across patterns', () => {
    const invalidNames = ['<script>', '../etc/passwd', 'test\x00name', 'my/workflow'];

    invalidNames.forEach(name => {
      let classError: Error | undefined;
      let functionalError: Error | undefined;

      try {
        new SimpleWorkflow(name);
      } catch (e) {
        classError = e as Error;
      }

      try {
        new Workflow({ name }, async () => {});
      } catch (e) {
        functionalError = e as Error;
      }

      expect(classError?.message).toBe(functionalError?.message);
      expect(classError?.message).toBe(ERROR_INVALID_CHARS);
    });
  });

  // Parameterized tests for both patterns
  describe.each([
    ['control character', 'test\x00name', true],
    ['script tag', '<script>alert(1)</script>', true],
    ['path traversal', '../etc/passwd', true],
    ['slash', 'my/workflow', true],
    ['valid alphanumeric', 'Workflow123', false],
    ['valid with spaces', 'My Workflow', false],
    ['valid with hyphens', 'my-workflow', false],
    ['valid with underscores', 'my_workflow', false],
  ])('Security validation: %s', (description, name, shouldThrow) => {
    it('should work in class-based pattern', () => {
      if (shouldThrow) {
        expect(() => new SimpleWorkflow(name)).toThrow(ERROR_INVALID_CHARS);
      } else {
        expect(() => new SimpleWorkflow(name)).not.toThrow();
        const wf = new SimpleWorkflow(name);
        expect(wf.getNode().name).toBe(name);
      }
    });

    it('should work in functional pattern', () => {
      if (shouldThrow) {
        expect(() => new Workflow({ name }, async () => {})).toThrow(ERROR_INVALID_CHARS);
      } else {
        expect(() => new Workflow({ name }, async () => {})).not.toThrow();
        const wf = new Workflow({ name }, async () => {});
        expect(wf.getNode().name).toBe(name);
      }
    });
  });
});

// GOTCHA 1: Use arrow function wrapper with toThrow()
// Correct: expect(() => new SimpleWorkflow('')).toThrow()
// Incorrect: expect(new SimpleWorkflow('')).toThrow() // This fails

// GOTCHA 2: Generic error message for all security violations
// All security validations use same error message (security best practice)
// Don't test for specific error messages like "control character detected"
// Use ERROR_INVALID_CHARS constant for all security tests

// GOTCHA 3: Test both constructor patterns
// Class-based: new SimpleWorkflow('name')
// Functional: new Workflow({ name: 'name' }, async () => {})
// Both must be tested for each security validation

// GOTCHA 4: Parameterized tests (it.each) for repetitive cases
// Reduces code duplication
// Improves maintainability
// Format: it.each([['input1', 'desc1'], ['input2', 'desc2']])('test %s', (input, desc) => { ... })

// GOTCHA 5: Positive and negative cases
// Positive: Valid names that should be accepted (expect().not.toThrow())
// Negative: Invalid names that should be rejected (expect().toThrow())
// Test both to ensure validation works correctly

// GOTCHA 6: Existing tests must still pass
// Don't modify existing tests
// Only add new security validation tests
// Verify no regressions

// GOTCHA 7: Test organization
// Add tests to existing "Workflow Name Validation" describe block
// Use nested describe blocks for each security category
// Follow existing test naming convention

// GOTCHA 8: Edge cases to test
// Single character names
// Characters at beginning, middle, end
// Multiple consecutive special characters
// Case variations (for javascript:)
// Combinations of allowed characters
// Boundary conditions (100 chars vs 101 chars)

// GOTCHA 9: Helper functions for constructor patterns
// Create testBothPatterns helper to reduce duplication
// Test both class-based and functional patterns consistently
// Verify error messages are identical across patterns

// GOTCHA 10: Vitest/Jest specific patterns
// Use toThrow() for error testing
// Use it.each() for parameterized tests
// Use describe() for grouping related tests
// Use expect().not.toThrow() for positive cases
```

---

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - This is a test-only change
  - No dependencies on external services
  - No configuration changes
  - No new dependencies

INTERNAL INTEGRATIONS:
  - Extends existing "Workflow Name Validation" test suite
  - Uses existing SimpleWorkflow test class
  - Follows existing toThrow() assertion patterns
  - Consistent with existing test organization
  - Uses existing test framework (Vitest)

SCOPE BOUNDARIES:
  - ONLY add tests to src/__tests__/unit/workflow.test.ts
  - DON'T modify existing tests
  - DON'T modify source code (workflow.ts)
  - DON'T create new test files
  - DON'T change test framework configuration

RELATED WORK:
  - P3.M1.T3.S1: Security validation implementation (tests verify this work)
  - Existing workflow name tests (extend these tests)
  - Existing SimpleWorkflow test class (use this pattern)

FILES TO MODIFY:
  - src/__tests__/unit/workflow.test.ts (ADD security validation tests)

FILES NOT TO MODIFY:
  - PRD.md (read-only)
  - tasks.json (read-only)
  - src/core/workflow.ts (read-only, tests validate it)
  - Other source files (focus only on tests)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each test block addition - fix before proceeding
npm run lint

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Verify changes with git diff
git diff src/__tests__/unit/workflow.test.ts

# Expected: Only security validation tests added
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run workflow tests specifically
npm test -- src/__tests__/unit/workflow.test.ts

# Expected: All tests pass (existing + new security tests)
# Verify: Test count increased by expected amount (should add 50+ tests)

# Check test output for:
# - All existing tests still pass
# - New security tests pass
# - Test count increased appropriately
# - No skipped or pending tests
```

### Level 3: Full Test Suite (System Validation)

```bash
# Run full test suite
npm test

# Expected: All tests pass
# Verify: No other tests broken by new tests
# Verify: No test conflicts or naming issues

# Coverage check (if coverage tools available)
npm test -- --coverage

# Expected: Coverage for validation code increased
# Verify: Security validation code is now covered by tests
```

### Level 4: Manual Verification (Quality Check)

```bash
# Run tests in watch mode to verify stability
npm test -- --watch src/__tests__/unit/workflow.test.ts

# Run tests multiple times to ensure consistency
npm test -- src/__tests__/unit/workflow.test.ts --run

# Expected: Tests pass consistently across multiple runs
# No flaky tests
# No intermittent failures
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All security validation patterns have test coverage
- [ ] Control character tests: ASCII 0x00-0x1F, 0x7F
- [ ] HTML/JS injection tests: script tags, HTML tags, javascript: protocol
- [ ] Path traversal tests: ../, ..\, multiple variations
- [ ] File system character tests: / \ : * ? " < > |
- [ ] Allowlist tests: positive (valid) and negative (invalid) cases
- [ ] Both constructor patterns tested
- [ ] Linting passes: `npm run lint`
- [ ] All tests pass: `npm test`

### Feature Validation

- [ ] Test count increased by 50+ tests
- [ ] Tests use existing SimpleWorkflow class pattern
- [ ] Tests follow existing toThrow() assertion pattern
- [ ] Generic error message used consistently
- [ ] Parameterized tests used for repetitive cases
- [ ] Both positive and negative cases tested
- [ ] Edge cases covered (boundaries, positions, combinations)
- [ ] Existing tests still pass
- [ ] No test conflicts or naming issues

### Code Quality Validation

- [ ] Tests added to existing "Workflow Name Validation" describe block
- [ ] Nested describe blocks for each security category
- [ ] Test constants defined at top of describe block
- [ ] Test naming convention followed
- [ ] Helper functions used to reduce duplication
- [ ] Parameterized tests (it.each) used appropriately
- [ ] No code duplication beyond what's necessary
- [ ] Tests are maintainable and readable

### Security Validation

- [ ] All security validation patterns from P3.M1.T3.S1 are tested
- [ ] Control character validation tested
- [ ] XSS attack vectors tested
- [ ] Path traversal tested
- [ ] File system characters tested
- [ ] Allowlist validation tested
- [ ] Both constructor patterns tested
- [ ] Error messages verified to be generic and safe

### Documentation & Deployment

- [ ] Test organization follows codebase patterns
- [ ] Test names are descriptive and self-documenting
- [ ] Test constants are well-named
- [ ] No test documentation needed (tests are self-documenting)
- [ ] No deployment notes needed (test-only change)

---

## Anti-Patterns to Avoid

- ❌ Don't modify existing tests (only add new ones)
- ❌ Don't modify source code (workflow.ts is read-only for this task)
- ❌ Don't use specific error messages for security violations (use generic)
- ❌ Don't test only one constructor pattern (test both)
- ❌ Don't skip edge cases (boundaries, positions, combinations)
- ❌ Don't skip positive cases (test valid names too)
- ❌ Don't duplicate test logic (use parameterized tests and helpers)
- ❌ Don't forget to verify existing tests still pass
- ❌ Don't modify PRD.md or tasks.json (read-only files)
- ❌ Don't create new test files (add to existing workflow.test.ts)
- ❌ Don't use different test patterns than existing codebase
- ❌ Don't skip linting validation
- ❌ Don't write flaky or inconsistent tests

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Exact file location and line numbers provided
- ✅ Existing test patterns well-documented
- ✅ Complete security validation implementation analyzed
- ✅ Test templates and patterns provided
- ✅ Research documents with specific examples
- ✅ Both constructor patterns documented
- ✅ Error messages and constants specified
- ✅ External best practices research included
- ✅ Parameterized test patterns demonstrated
- ✅ Helper function patterns provided
- ✅ Clear task ordering with dependencies
- ✅ Comprehensive validation checklist

**Validation**: This is a test-only task with comprehensive context. The implementation adds security validation tests to an existing test file. All context is provided: exact file location, existing test patterns, security validation implementation details, test templates, error messages, constructor patterns, and external best practices. No architectural decisions required. Highest confidence for one-pass implementation success.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**

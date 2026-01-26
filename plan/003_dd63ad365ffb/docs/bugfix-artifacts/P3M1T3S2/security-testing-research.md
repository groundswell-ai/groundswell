# Security Validation Testing Best Practices for TypeScript/JavaScript

**Research Date:** 2026-01-26
**Focus:** Input validation testing patterns for security vulnerabilities
**Frameworks:** Vitest/Jest, TypeScript
**Context:** Groundswell Workflow Framework

---

## Table of Contents

1. [Testing Security Validation Patterns](#1-testing-security-validation-patterns)
2. [Best Practices for Security Testing](#2-best-practices-for-security-testing)
3. [Vitest/Jest Specific Patterns](#3-vitestjest-specific-patterns)
4. [Testing Both Constructor Patterns](#4-testing-both-constructor-patterns)
5. [Anti-Patterns to Avoid](#5-anti-patterns-to-avoid)
6. [Online Resources](#6-online-resources)

---

## 1. Testing Security Validation Patterns

### 1.1 Control Character Validation

**Purpose:** Prevent log injection and terminal manipulation attacks by rejecting control characters (ASCII 0x00-0x1F, 0x7F).

#### Pattern to Test
```typescript
// Security validation: control characters (ASCII 0x00-0x1F, 0x7F)
if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}
```

#### Test Implementation
```typescript
describe('Security - Control Characters', () => {
  const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  it('should reject names with null byte', () => {
    expect(() => new SimpleWorkflow('test\x00name')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with bell character', () => {
    expect(() => new SimpleWorkflow('test\x07name')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with escape character', () => {
    expect(() => new SimpleWorkflow('test\x1bname')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with delete character', () => {
    expect(() => new SimpleWorkflow('test\x7fname')).toThrow(INVALID_NAME_MESSAGE);
  });

  // Edge case: Test all control characters in range
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
    expect(() => new SimpleWorkflow(`test${char}name`)).toThrow(INVALID_NAME_MESSAGE);
  });
});
```

**Key Principles:**
- Test each control character individually
- Use parameterized tests (`it.each`) for comprehensive coverage
- Test characters embedded within valid content (not just standalone)
- Include descriptive test names for each character

---

### 1.2 HTML/XSS Injection Pattern Validation

**Purpose:** Prevent Cross-Site Scripting (XSS) attacks by rejecting HTML tags and JavaScript patterns.

#### Pattern to Test
```typescript
// Security validation: HTML/JavaScript injection patterns
if (/<[^>]*>/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}
```

#### Test Implementation
```typescript
describe('Security - HTML/JavaScript Injection', () => {
  const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  it('should reject names with script tags', () => {
    expect(() => new SimpleWorkflow('<script>alert("xss")</script>')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with iframe tags', () => {
    expect(() => new SimpleWorkflow('<iframe>evil</iframe>')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with javascript: protocol', () => {
    expect(() => new SimpleWorkflow('javascript:alert(1)')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with JAVASCRIPT: (uppercase)', () => {
    expect(() => new SimpleWorkflow('JAVASCRIPT:alert(1)')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with JavaScript event handlers', () => {
    expect(() => new SimpleWorkflow('<img onerror=alert(1)>')).toThrow(INVALID_NAME_MESSAGE);
  });

  // Comprehensive XSS payload tests
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
    ['<meta http-equiv="refresh" content="0;url=evil.com">', 'meta refresh'],
  ])('should reject XSS payload: %s', (payload, description) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
  });

  // Edge cases: partial tags that should still be caught
  it('should reject incomplete HTML tags', () => {
    expect(() => new SimpleWorkflow('workflow<script>')).toThrow(INVALID_NAME_MESSAGE);
    expect(() => new SimpleWorkflow('<script>workflow')).toThrow(INVALID_NAME_MESSAGE);
  });
});
```

**Key Principles:**
- Test common XSS payloads from OWASP
- Test case variations (uppercase, mixed case)
- Test tags embedded within valid content
- Include event handlers and less common tags
- Test both complete and partial HTML patterns

---

### 1.3 Path Traversal Validation

**Purpose:** Prevent directory traversal attacks that could access files outside intended directories.

#### Pattern to Test
```typescript
// Security validation: path traversal patterns
if (/\.\./.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}
```

#### Test Implementation
```typescript
describe('Security - Path Traversal', () => {
  const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  it('should reject names with ../ pattern', () => {
    expect(() => new SimpleWorkflow('../etc/passwd')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with ..\\ pattern', () => {
    expect(() => new SimpleWorkflow('..\\windows\\system32')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with multiple .. patterns', () => {
    expect(() => new SimpleWorkflow('../../etc/passwd')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with .. in the middle', () => {
    expect(() => new SimpleWorkflow('my../workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  // Comprehensive path traversal payload tests
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
    expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
  });

  // Edge cases: URL encoding and encoding variations
  it('should reject URL-encoded path traversal attempts', () => {
    // Note: These may not be caught by simple regex, but should be tested
    // Depending on your decoding strategy, you may need to test these
    expect(() => new SimpleWorkflow('%2e%2e%2fetc%2fpasswd')).toThrow();
    expect(() => new SimpleWorkflow('%2e%2e%5cwindows%5csystem32')).toThrow();
  });
});
```

**Key Principles:**
- Test both Unix (`/`) and Windows (`\`) path separators
- Test path traversal at beginning, middle, and end
- Test multiple consecutive `..` patterns
- Test mixed separators
- Consider URL encoding variations
- Test absolute path combinations

---

### 1.4 File System Character Validation

**Purpose:** Prevent file system injection by rejecting characters with special meaning in file systems.

#### Pattern to Test
```typescript
// Security validation: file system special characters
if (/[\/\\:*?"<>|]/.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}
```

#### Test Implementation
```typescript
describe('Security - File System Characters', () => {
  const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  it('should reject names with forward slash', () => {
    expect(() => new SimpleWorkflow('my/workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with backslash', () => {
    expect(() => new SimpleWorkflow('my\\workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with colon', () => {
    expect(() => new SimpleWorkflow('my:workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with asterisk', () => {
    expect(() => new SimpleWorkflow('my*workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with question mark', () => {
    expect(() => new SimpleWorkflow('my?workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with double quote', () => {
    expect(() => new SimpleWorkflow('my"workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with angle brackets', () => {
    expect(() => new SimpleWorkflow('my<wor>flow')).toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject names with pipe', () => {
    expect(() => new SimpleWorkflow('my|workflow')).toThrow(INVALID_NAME_MESSAGE);
  });

  // Comprehensive file system character tests
  it.each([
    ['forward slash', '/', 'my/workflow'],
    ['backslash', '\\', 'my\\workflow'],
    ['colon', ':', 'my:workflow'],
    ['asterisk', '*', 'my*workflow'],
    ['question mark', '?', 'my?workflow'],
    ['double quote', '"', 'my"workflow'],
    ['less than', '<', 'my<workflow'],
    ['greater than', '>', 'my>workflow'],
    ['pipe', '|', 'my|workflow'],
    ['multiple special chars', '/\\:*?"<>|', 'all/special\\chars:*?"<>|'],
  ])('should reject names with %s (%s)', (name, char, payload) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
  });

  // Edge cases: characters in different positions
  it.each([
    ['at beginning', '/workflow'],
    ['in middle', 'work/flow'],
    ['at end', 'workflow/'],
    ['multiple', 'work/flow/test'],
  ])('should reject slashes %s', (position, payload) => {
    expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
  });
});
```

**Key Principles:**
- Test each restricted character individually
- Test characters at beginning, middle, and end
- Test multiple restricted characters together
- Understand which characters are problematic on which platforms
- Document platform-specific considerations

---

### 1.5 Allowlist Validation

**Purpose:** Implement defense-in-depth by explicitly allowing only known-safe characters.

#### Pattern to Test
```typescript
// Security validation: allowed characters (allowlist - defense in depth)
if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}
```

#### Test Implementation
```typescript
describe('Security - Allowed Characters (Allowlist)', () => {
  const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  // Positive test cases - these should all PASS
  describe('Positive Cases - Should Accept', () => {
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

    it('should accept names with all allowed characters', () => {
      const wf = new SimpleWorkflow('My-Workflow_123 Test');
      expect(wf.getNode().name).toBe('My-Workflow_123 Test');
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
  });

  // Negative test cases - these should all REJECT
  describe('Negative Cases - Should Reject', () => {
    it.each([
      ['exclamation mark', 'my!workflow'],
      ['at sign', 'my@workflow'],
      ['hash', 'my#workflow'],
      ['dollar sign', 'my$workflow'],
      ['percent', 'my%workflow'],
      ['ampersand', 'my&workflow'],
      ['single quote', "my'workflow"],
      ['left parenthesis', 'my(workflow'],
      ['right parenthesis', 'my)workflow'],
      ['plus sign', 'my+workflow'],
      ['equals sign', 'my=workflow'],
      ['left brace', 'my{workflow'],
      ['right brace', 'my}workflow'],
      ['left bracket', 'my[workflow'],
      ['right bracket', 'my]workflow'],
      ['semicolon', 'my;workflow'],
      ['single quote', "my'workflow"],
      ['comma', 'my,workflow'],
      ['period', 'my.workflow'],
      ['backtick', 'my`workflow'],
      ['tilde', 'my~workflow'],
    ])('should reject names with %s', (name, payload) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('should accept single character names', () => {
      expect(() => new SimpleWorkflow('a')).not.toThrow();
      expect(() => new SimpleWorkflow('Z')).not.toThrow();
      expect(() => new SimpleWorkflow('0')).not.toThrow();
      expect(() => new SimpleWorkflow('_')).not.toThrow();
      expect(() => new SimpleWorkflow('-')).not.toThrow();
      expect(() => new SimpleWorkflow(' ')).not.toThrow();
    });

    it('should handle Unicode letters correctly', () => {
      // Depending on requirements, Unicode may or may not be allowed
      // If not allowed, these should throw
      expect(() => new SimpleWorkflow('workflowé')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow日本語')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow中文')).toThrow(INVALID_NAME_MESSAGE);
    });
  });
});
```

**Key Principles:**
- Define clear positive test cases for all allowed characters
- Test combinations of allowed characters
- Test edge cases (single characters, consecutive characters)
- Test Unicode characters if not explicitly allowed
- Use parameterized tests for systematic coverage
- Verify that both positive and negative cases are comprehensive

---

## 2. Best Practices for Security Testing

### 2.1 Test Organization Patterns

Organize security tests into logical describe blocks for maintainability and clarity.

#### Recommended Structure
```typescript
describe('Workflow Name Validation', () => {
  // Basic validation tests
  describe('Basic Validation', () => {
    it('should reject empty string name', () => { /* ... */ });
    it('should reject whitespace-only name', () => { /* ... */ });
    it('should reject name exceeding 100 characters', () => { /* ... */ });
  });

  // Security validation grouped by category
  describe('Security - Control Characters', () => {
    it('should reject names with null byte', () => { /* ... */ });
    // ... more tests
  });

  describe('Security - HTML/JavaScript Injection', () => {
    it('should reject names with script tags', () => { /* ... */ });
    // ... more tests
  });

  describe('Security - Path Traversal', () => {
    it('should reject names with ../ pattern', () => { /* ... */ });
    // ... more tests
  });

  describe('Security - File System Characters', () => {
    it('should reject names with forward slash', () => { /* ... */ });
    // ... more tests
  });

  describe('Security - Allowed Characters (Allowlist)', () => {
    describe('Positive Cases - Should Accept', () => {
      // Tests for valid input
    });
    describe('Negative Cases - Should Reject', () => {
      // Tests for invalid input
    });
  });

  // Constructor pattern tests
  describe('Constructor Pattern Tests', () => {
    describe('Class-based Pattern', () => {
      // Tests for `new SimpleWorkflow('name')`
    });
    describe('Functional Pattern', () => {
      // Tests for `new Workflow({ name: 'name' }, executor)`
    });
  });
});
```

**Benefits:**
- Clear separation of concerns
- Easy to run specific test categories
- Better test output organization
- Simplifies test maintenance
- Makes security tests discoverable

---

### 2.2 Positive vs Negative Test Case Patterns

Always test both what should be accepted (positive) and what should be rejected (negative).

#### Positive Test Pattern
```typescript
describe('Positive Cases - Should Accept', () => {
  it('should accept valid alphanumeric name', () => {
    const wf = new SimpleWorkflow('ValidWorkflow123');
    expect(wf.getNode().name).toBe('ValidWorkflow123');
  });

  it('should accept name with spaces', () => {
    const wf = new SimpleWorkflow('My Valid Workflow');
    expect(wf.getNode().name).toBe('My Valid Workflow');
  });

  it('should accept name with hyphens', () => {
    const wf = new SimpleWorkflow('my-valid-workflow');
    expect(wf.getNode().name).toBe('my-valid-workflow');
  });

  it('should accept name with underscores', () => {
    const wf = new SimpleWorkflow('my_valid_workflow');
    expect(wf.getNode().name).toBe('my_valid_workflow');
  });

  // Verify the object is properly created
  it('should create valid workflow with allowed characters', () => {
    const wf = new SimpleWorkflow('Test-Workflow_123');
    expect(wf).toBeInstanceOf(Workflow);
    expect(wf.getNode().name).toBe('Test-Workflow_123');
    expect(wf.id).toBeDefined();
  });
});
```

#### Negative Test Pattern
```typescript
describe('Negative Cases - Should Reject', () => {
  const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  it('should reject name with control characters', () => {
    expect(() => new SimpleWorkflow('test\x00name'))
      .toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject name with HTML tags', () => {
    expect(() => new SimpleWorkflow('<script>alert(1)</script>'))
      .toThrow(INVALID_NAME_MESSAGE);
  });

  it('should reject name with path traversal', () => {
    expect(() => new SimpleWorkflow('../etc/passwd'))
      .toThrow(INVALID_NAME_MESSAGE);
  });

  // Verify the error message is generic (doesn't reveal implementation)
  it('should throw generic error message for invalid input', () => {
    expect(() => new SimpleWorkflow('test\x00name'))
      .toThrow(/Invalid workflow name/);
  });
});
```

**Key Principles:**
- Positive tests verify valid input works correctly
- Negative tests verify invalid input is rejected
- Always verify the error message is appropriate
- Positive tests should verify the object state
- Negative tests should use `toThrow()` matcher

---

### 2.3 Edge Case Testing for Security Validations

Security tests must cover edge cases that attackers might exploit.

#### Edge Case Categories

##### 2.3.1 Boundary Conditions
```typescript
describe('Edge Cases - Boundary Conditions', () => {
  it('should accept name with exactly 100 characters', () => {
    const exactly100 = 'a'.repeat(100);
    const wf = new SimpleWorkflow(exactly100);
    expect(wf.getNode().name).toBe(exactly100);
    expect(wf.getNode().name.length).toBe(100);
  });

  it('should reject name with exactly 101 characters', () => {
    const exactly101 = 'a'.repeat(101);
    expect(() => new SimpleWorkflow(exactly101))
      .toThrow('Workflow name cannot exceed 100 characters');
  });

  it('should reject empty string after trimming', () => {
    expect(() => new SimpleWorkflow('   '))
      .toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should accept single character names', () => {
    expect(() => new SimpleWorkflow('a')).not.toThrow();
    expect(() => new SimpleWorkflow('Z')).not.toThrow();
    expect(() => new SimpleWorkflow('0')).not.toThrow();
  });

  it('should handle very long valid names', () => {
    // Just under the limit but with many allowed characters
    const longValid = 'a'.repeat(50) + '-' + 'b'.repeat(49);
    expect(() => new SimpleWorkflow(longValid)).not.toThrow();
  });
});
```

##### 2.3.2 Character Position Variations
```typescript
describe('Edge Cases - Character Positions', () => {
  it.each([
    ['at beginning', '../workflow'],
    ['in middle', 'work../flow'],
    ['at end', 'workflow../'],
  ])('should reject path traversal %s', (position, payload) => {
    expect(() => new SimpleWorkflow(payload)).toThrow();
  });

  it.each([
    ['at beginning', '-workflow'],
    ['in middle', 'work-flow'],
    ['at end', 'workflow-'],
  ])('should accept hyphens %s', (position, payload) => {
    expect(() => new SimpleWorkflow(payload)).not.toThrow();
  });
});
```

##### 2.3.3 Encoding Variations
```typescript
describe('Edge Cases - Encoding Variations', () => {
  it('should handle Unicode normalization', () => {
    // Test for homograph attacks if applicable
    const normalized = 'workflow'; // NFKC normalized
    const denormalized = 'workflow'; // Same visual, different bytes
    // Both should be treated the same
  });

  it('should reject URL-encoded malicious payloads', () => {
    // If you decode input before validation
    expect(() => new SimpleWorkflow(decodeURIComponent('%2e%2e%2f')))
      .toThrow();
  });

  it('should handle mixed encoding', () => {
    // Some characters encoded, some not
    expect(() => new SimpleWorkflow('test%2Fworkflow'))
      .toThrow();
  });
});
```

##### 2.3.4 Case Variations
```typescript
describe('Edge Cases - Case Variations', () => {
  it('should reject javascript: in any case', () => {
    expect(() => new SimpleWorkflow('javascript:alert(1)')).toThrow();
    expect(() => new SimpleWorkflow('JAVASCRIPT:alert(1)')).toThrow();
    expect(() => new SimpleWorkflow('JavaScript:alert(1)')).toThrow();
    expect(() => new SimpleWorkflow('JaVaScRiPt:alert(1)')).toThrow();
  });

  it('should be case-sensitive for allowed characters', () => {
    // Both uppercase and lowercase letters should be allowed
    expect(() => new SimpleWorkflow('ABC')).not.toThrow();
    expect(() => new SimpleWorkflow('abc')).not.toThrow();
    expect(() => new SimpleWorkflow('AbC')).not.toThrow();
  });
});
```

##### 2.3.5 Combinations and Variations
```typescript
describe('Edge Cases - Combinations', () => {
  it('should reject multiple vulnerability types combined', () => {
    // XSS + path traversal
    expect(() => new SimpleWorkflow('<script>../')).toThrow();

    // Control chars + HTML
    expect(() => new SimpleWorkflow('\x00<script>')).toThrow();

    // File system chars + path traversal
    expect(() => new SimpleWorkflow('../etc/passwd|')).toThrow();
  });

  it('should handle repeated patterns', () => {
    expect(() => new SimpleWorkflow('...')).toThrow();
    expect(() => new SimpleWorkflow('---')).not.toThrow();
    expect(() => new SimpleWorkflow('___')).not.toThrow();
    expect(() => new SimpleWorkflow('   ')).not.toThrow(); // spaces only
  });
});
```

**Key Principles:**
- Test at boundaries (0, 1, max-1, max, max+1)
- Test malicious patterns at different positions
- Test case variations for case-insensitive validations
- Test encoding variations if input is decoded
- Test combinations of multiple attack vectors
- Test repeated patterns and edge cases

---

### 2.4 Error Message Testing for Security

Error messages should be generic and not reveal implementation details that could help attackers.

#### Generic Error Message Pattern
```typescript
describe('Error Message Security', () => {
  const GENERIC_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  it('should use generic error message for control characters', () => {
    expect(() => new SimpleWorkflow('test\x00name'))
      .toThrow(GENERIC_MESSAGE);
  });

  it('should use generic error message for XSS attempts', () => {
    expect(() => new SimpleWorkflow('<script>alert(1)</script>'))
      .toThrow(GENERIC_MESSAGE);
  });

  it('should use generic error message for path traversal', () => {
    expect(() => new SimpleWorkflow('../etc/passwd'))
      .toThrow(GENERIC_MESSAGE);
  });

  it('should not reveal specific validation rule that failed', () => {
    // All security violations should have the same message
    const controlCharError = () => new SimpleWorkflow('test\x00name');
    const xssError = () => new SimpleWorkflow('<script>');
    const pathTraversalError = () => new SimpleWorkflow('../');

    expect(controlCharError).toThrow(GENERIC_MESSAGE);
    expect(xssError).toThrow(GENERIC_MESSAGE);
    expect(pathTraversalError).toThrow(GENERIC_MESSAGE);
  });

  it('should not leak file system paths', () => {
    // Error messages shouldn't include file paths or system information
    expect(() => new SimpleWorkflow('../etc/passwd'))
      .toThrow(/Invalid workflow name/);
    expect(() => new SimpleWorkflow('../etc/passwd'))
      .not.toThrow(/\/etc\/passwd/);
    expect(() => new SimpleWorkflow('../etc/passwd'))
      .not.toThrow(/file system/);
  });

  it('should not reveal regex patterns or validation logic', () => {
    expect(() => new SimpleWorkflow('test\x00name'))
      .not.toThrow(/[\x00-\x1F]/); // Don't reveal regex
    expect(() => new SimpleWorkflow('<script>'))
      .not.toThrow(/<[^>]*>/); // Don't reveal regex
  });
});
```

**Anti-Patterns to Avoid:**
```typescript
// ❌ BAD - Reveals which validation failed
throw new Error(`Control character detected at position ${position}: ${char}`);

// ❌ BAD - Reveals regex pattern
throw new Error(`Name does not match pattern /^[a-zA-Z0-9 _-]+$/`);

// ❌ BAD - Echoes back malicious input
throw new Error(`Invalid characters in name: ${maliciousInput}`);

// ❌ BAD - Reveals file system structure
throw new Error(`Path traversal attempt detected: ../etc/passwd`);

// ✅ GOOD - Generic message
throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
```

**Key Principles:**
- Use consistent, generic error messages for all security violations
- Don't reveal which specific validation rule failed
- Don't echo back malicious input
- Don't reveal file system paths or structure
- Don't reveal regex patterns or validation logic
- Error messages should be user-friendly, not developer-oriented

---

## 3. Vitest/Jest Specific Patterns

### 3.1 Using toThrow() for Error Testing

The `toThrow()` matcher is essential for testing security validations.

#### Basic Usage
```typescript
describe('toThrow() Patterns', () => {
  it('should throw error for invalid input', () => {
    expect(() => new SimpleWorkflow('<script>')).toThrow();
  });

  it('should throw specific error message', () => {
    expect(() => new SimpleWorkflow('<script>'))
      .toThrow('Invalid workflow name');
  });

  it('should throw error matching regex', () => {
    expect(() => new SimpleWorkflow('<script>'))
      .toThrow(/Invalid workflow name/);
  });

  it('should throw specific error type', () => {
    expect(() => new SimpleWorkflow('<script>'))
      .toThrow(Error);
  });
});
```

#### Advanced toThrow() Patterns
```typescript
describe('Advanced toThrow() Patterns', () => {
  it('should extract and verify error message', () => {
    let error: Error | undefined;
    try {
      new SimpleWorkflow('test\x00name');
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  });

  it('should verify error does not contain sensitive info', () => {
    let error: Error | undefined;
    try {
      new SimpleWorkflow('../etc/passwd');
    } catch (e) {
      error = e as Error;
    }

    expect(error?.message).not.toContain('../');
    expect(error?.message).not.toContain('passwd');
    expect(error?.message).not.toContain('/etc/');
  });

  it('should test multiple invalid inputs with toThrow', () => {
    const invalidInputs = [
      '<script>',
      '../etc/passwd',
      'test\x00name',
      'my/workflow',
    ];

    invalidInputs.forEach(input => {
      expect(() => new SimpleWorkflow(input)).toThrow();
    });
  });
});
```

#### toThrow() with async/await
```typescript
describe('toThrow() with Async', () => {
  it('should await async constructor that throws', async () => {
    // If you have async validation
    await expect(async () => {
      await new AsyncWorkflow('<script>');
    }).rejects.toThrow('Invalid workflow name');
  });

  it('should handle async validation in methods', async () => {
    const wf = new SimpleWorkflow('ValidWorkflow');

    await expect(wf.validateAsyncInput('<script>'))
      .rejects.toThrow('Invalid input');
  });
});
```

**Best Practices:**
- Use arrow functions with `toThrow()` to catch errors
- Don't call the function directly - wrap it in an arrow function
- Test both the error existence and the error message
- Verify error messages don't leak information
- Use regex for partial message matching when appropriate

---

### 3.2 Test Constants and Helpers for Cleaner Tests

Define constants and helper functions to reduce duplication and improve maintainability.

#### Test Constants
```typescript
// At the top of your test file
const INVALID_NAME_MESSAGE = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';
const EMPTY_NAME_MESSAGE = 'Workflow name cannot be empty or whitespace only';
const MAX_LENGTH_MESSAGE = 'Workflow name cannot exceed 100 characters';

// Control character constants
const CONTROL_CHARS = {
  NULL: '\x00',
  BELL: '\x07',
  BACKSPACE: '\x08',
  TAB: '\x09',
  NEWLINE: '\x0A',
  ESCAPE: '\x1B',
  DELETE: '\x7F',
} as const;

// XSS payload constants
const XSS_PAYLOADS = {
  SCRIPT_TAG: '<script>alert("xss")</script>',
  IFRAME_TAG: '<iframe>evil</iframe>',
  IMG_ONERROR: '<img src=x onerror=alert(1)>',
  SVG_ONLOAD: '<svg onload=alert(1)>',
  JAVASCRIPT_PROTOCOL: 'javascript:alert(1)',
  JAVASCRIPT_UPPER: 'JAVASCRIPT:alert(1)',
  DIV_ONCLICK: '<div onclick="alert(1)">click</div>',
} as const;

// Path traversal constants
const PATH_TRAVERSAL_PAYLOADS = {
  UNIX_PARENT: '../etc/passwd',
  WINDOWS_PARENT: '..\\windows\\system32',
  DOUBLE_UNIX: '../../etc/passwd',
  DOUBLE_WINDOWS: '..\\..\\windows\\system32',
  EMBEDDED: 'my../workflow',
} as const;

// File system character constants
const FS_CHARS = {
  SLASH: '/',
  BACKSLASH: '\\',
  COLON: ':',
  ASTERISK: '*',
  QUESTION: '?',
  QUOTE: '"',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  PIPE: '|',
} as const;
```

#### Helper Functions
```typescript
// Helper to create workflow and verify it's valid
function createValidWorkflow(name: string): SimpleWorkflow {
  const wf = new SimpleWorkflow(name);
  expect(wf).toBeInstanceOf(Workflow);
  expect(wf.getNode().name).toBe(name);
  return wf;
}

// Helper to assert invalid name is rejected
function expectInvalidName(name: string, expectedMessage: string = INVALID_NAME_MESSAGE) {
  expect(() => new SimpleWorkflow(name)).toThrow(expectedMessage);
}

// Helper to assert valid name is accepted
function expectValidName(name: string) {
  expect(() => new SimpleWorkflow(name)).not.toThrow();
  const wf = new SimpleWorkflow(name);
  expect(wf.getNode().name).toBe(name);
}

// Helper for parameterized tests
interface InvalidTestCase {
  name: string;
  input: string;
  description: string;
}

function createInvalidTests(cases: InvalidTestCase[]) {
  return cases.map(testCase =>
    it(testCase.description, () => {
      expectInvalidName(testCase.input);
    })
  );
}

// Helper to test all control characters
function testControlCharacters() {
  describe('Control Characters', () => {
    Object.entries(CONTROL_CHARS).forEach(([name, char]) => {
      it(`should reject ${name} character`, () => {
        expectInvalidName(`test${char}name`);
      });
    });
  });
}
```

#### Using Constants and Helpers
```typescript
describe('Workflow Security Validation - Using Helpers', () => {
  describe('Control Character Tests', () => {
    it('should reject null byte', () => {
      expectInvalidName(`test${CONTROL_CHARS.NULL}name`);
    });

    it('should reject all control characters', () => {
      Object.values(CONTROL_CHARS).forEach(char => {
        expectInvalidName(`test${char}name`);
      });
    });
  });

  describe('XSS Payload Tests', () => {
    it('should reject script tag', () => {
      expectInvalidName(XSS_PAYLOADS.SCRIPT_TAG);
    });

    it('should reject all XSS payloads', () => {
      Object.values(XSS_PAYLOADS).forEach(payload => {
        expectInvalidName(payload);
      });
    });
  });

  describe('Valid Name Tests', () => {
    it('should accept alphanumeric', () => {
      expectValidName('Workflow123');
    });

    it('should accept all allowed characters', () => {
      expectValidName('My-Workflow_123 Test');
    });
  });

  describe('Parameterized Invalid Tests', () => {
    const invalidCases: InvalidTestCase[] = [
      { name: 'script', input: '<script>', description: 'should reject script tag' },
      { name: 'path', input: '../etc/passwd', description: 'should reject path traversal' },
      { name: 'control', input: 'test\x00name', description: 'should reject control char' },
    ];

    createInvalidTests(invalidCases);
  });
});
```

**Benefits:**
- Single source of truth for test data
- Easier to update test data
- Reduced code duplication
- More readable tests
- Easier to maintain
- Consistent error messages

---

### 3.3 Parameterized Tests for Multiple Similar Cases

Use `it.each()` or `test.each()` to test multiple similar cases with less code.

#### Basic Parameterized Tests
```typescript
describe('Parameterized Security Tests', () => {
  describe('Control Characters', () => {
    it.each([
      ['\x00', 'null byte'],
      ['\x07', 'bell'],
      ['\x1B', 'escape'],
      ['\x7F', 'delete'],
    ])('should reject %s character', (char, name) => {
      expect(() => new SimpleWorkflow(`test${char}name`))
        .toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('XSS Payloads', () => {
    it.each([
      ['<script>alert("xss")</script>', 'script tag'],
      ['<iframe>evil</iframe>', 'iframe tag'],
      ['<img src=x onerror=alert(1)>', 'img with onerror'],
      ['<svg onload=alert(1)>', 'svg with onload'],
      ['javascript:alert(1)', 'javascript protocol'],
      ['JAVASCRIPT:alert(1)', 'javascript protocol uppercase'],
    ])('should reject XSS payload: %s', (payload, description) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('Path Traversal', () => {
    it.each([
      ['../etc/passwd', 'Unix parent directory'],
      ['..\\windows\\system32', 'Windows parent directory'],
      ['../../etc/passwd', 'double parent Unix'],
      ['..\\..\\windows\\system32', 'double parent Windows'],
      ['my../workflow', 'embedded parent reference'],
    ])('should reject path traversal: %s', (payload, description) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('File System Characters', () => {
    it.each([
      ['/', 'forward slash'],
      ['\\', 'backslash'],
      [':', 'colon'],
      ['*', 'asterisk'],
      ['?', 'question mark'],
      ['"', 'double quote'],
      ['<', 'less than'],
      ['>', 'greater than'],
      ['|', 'pipe'],
    ])('should reject %s (%s)', (char, name) => {
      expect(() => new SimpleWorkflow(`my${char}workflow`)).toThrow(INVALID_NAME_MESSAGE);
    });
  });
});
```

#### Advanced Parameterized Tests
```typescript
describe('Advanced Parameterized Tests', () => {
  // Test with object-based parameters
  describe('Comprehensive Security Tests', () => {
    interface SecurityTestCase {
      input: string;
      category: string;
      description: string;
    }

    const securityTestCases: SecurityTestCase[] = [
      // Control characters
      { input: 'test\x00name', category: 'control', description: 'null byte' },
      { input: 'test\x1Bname', category: 'control', description: 'escape character' },
      { input: 'test\x7Fname', category: 'control', description: 'delete character' },

      // XSS
      { input: '<script>alert(1)</script>', category: 'xss', description: 'script tag' },
      { input: '<img onerror=alert(1)>', category: 'xss', description: 'img onerror' },
      { input: 'javascript:alert(1)', category: 'xss', description: 'javascript protocol' },

      // Path traversal
      { input: '../etc/passwd', category: 'path', description: 'Unix parent' },
      { input: '..\\windows\\system32', category: 'path', description: 'Windows parent' },
      { input: '../../etc/passwd', category: 'path', description: 'double parent' },

      // File system
      { input: 'my/workflow', category: 'filesystem', description: 'forward slash' },
      { input: 'my\\workflow', category: 'filesystem', description: 'backslash' },
      { input: 'my:workflow', category: 'filesystem', description: 'colon' },
    ];

    it.each(securityTestCases)('$category: should reject $description', ({ input }) => {
      expect(() => new SimpleWorkflow(input)).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  // Test with template for custom output
  describe('Position-Based Security Tests', () => {
    it.each([
      ['beginning', '../workflow'],
      ['middle', 'work../flow'],
      ['end', 'workflow../'],
    ])('should reject path traversal at %s', (position, payload) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  // Test valid names parameterized
  describe('Valid Names Parameterized', () => {
    it.each([
      ['Workflow123', 'alphanumeric'],
      ['My Workflow', 'with spaces'],
      ['my-workflow', 'with hyphens'],
      ['my_workflow', 'with underscores'],
      ['My-Workflow_123 Test', 'all allowed characters'],
      ['ABC', 'uppercase only'],
      ['abc', 'lowercase only'],
      ['123', 'numbers only'],
      ['a', 'single character'],
      ['_', 'single underscore'],
      ['-', 'single hyphen'],
    ])('should accept valid name: %s', (name, description) => {
      expect(() => new SimpleWorkflow(name)).not.toThrow();
      const wf = new SimpleWorkflow(name);
      expect(wf.getNode().name).toBe(name);
    });
  });
});
```

#### Conditional Parameterized Tests
```typescript
describe('Conditional Parameterized Tests', () => {
  // Test different scenarios based on input properties
  describe.each([
    ['short', 'a'],
    ['medium', 'a'.repeat(50)],
    ['max', 'a'.repeat(100)],
  ])('Length validation: %s names', (type, name) => {
    it('should be accepted', () => {
      expect(() => new SimpleWorkflow(name)).not.toThrow();
    });

    it('should have correct length', () => {
      const wf = new SimpleWorkflow(name);
      expect(wf.getNode().name.length).toBe(name.length);
    });
  });

  // Test different categories with shared validation
  describe.each([
    ['control characters', ['\x00', '\x1B', '\x7F']],
    ['XSS payloads', ['<script>', '<img onerror=alert(1)>', 'javascript:alert(1)']],
    ['path traversal', ['../', '..\\', '../../']],
    ['file system chars', ['/', '\\', ':', '*', '?', '"', '<', '>', '|']],
  ])('Security category: %s', (category, payloads) => {
    it.each(payloads)('should reject payload: %s', (payload) => {
      expect(() => new SimpleWorkflow(`test${payload}name`)).toThrow(INVALID_NAME_MESSAGE);
    });
  });
});
```

**Best Practices:**
- Use `it.each()` for repetitive test cases
- Provide descriptive names for parameters
- Group related tests in describe blocks
- Use object-based parameters for complex cases
- Include descriptions for better test output
- Keep test data separate from test logic

---

## 4. Testing Both Constructor Patterns

When a class supports multiple constructor patterns (e.g., class-based and functional), test both patterns thoroughly.

### 4.1 Pattern Overview

```typescript
// Class-based pattern
class SimpleWorkflow extends Workflow {
  async run() { /* ... */ }
}
const wf1 = new SimpleWorkflow('MyWorkflow');

// Functional pattern
const wf2 = new Workflow({ name: 'MyWorkflow' }, async (ctx) => {
  // workflow logic
});
```

### 4.2 Test Implementation

#### Test Both Patterns for Each Validation Rule
```typescript
describe('Constructor Pattern Security Validation', () => {
  describe('Control Character Validation', () => {
    it('should reject control characters in class-based pattern', () => {
      expect(() => new SimpleWorkflow('test\x00name'))
        .toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject control characters in functional pattern', () => {
      expect(() => new Workflow({ name: 'test\x00name' }, async () => {}))
        .toThrow(INVALID_NAME_MESSAGE);
    });

    it('should have consistent error messages across patterns', () => {
      const classError = () => new SimpleWorkflow('test\x00name');
      const functionalError = () => new Workflow({ name: 'test\x00name' }, async () => {});

      expect(classError).toThrow(INVALID_NAME_MESSAGE);
      expect(functionalError).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('XSS Validation', () => {
    it('should reject script tags in class-based pattern', () => {
      expect(() => new SimpleWorkflow('<script>alert(1)</script>'))
        .toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject script tags in functional pattern', () => {
      expect(() => new Workflow({ name: '<script>alert(1)</script>' }, async () => {}))
        .toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('Path Traversal Validation', () => {
    it('should reject path traversal in class-based pattern', () => {
      expect(() => new SimpleWorkflow('../etc/passwd'))
        .toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject path traversal in functional pattern', () => {
      expect(() => new Workflow({ name: '../etc/passwd' }, async () => {}))
        .toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('File System Character Validation', () => {
    it('should reject slashes in class-based pattern', () => {
      expect(() => new SimpleWorkflow('my/workflow'))
        .toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject slashes in functional pattern', () => {
      expect(() => new Workflow({ name: 'my/workflow' }, async () => {}))
        .toThrow(INVALID_NAME_MESSAGE);
    });
  });
});
```

#### Parameterized Tests for Constructor Patterns
```typescript
describe('Constructor Pattern Parameterized Tests', () => {
  describe.each([
    ['control character', 'test\x00name'],
    ['script tag', '<script>alert(1)</script>'],
    ['path traversal', '../etc/passwd'],
    ['slash', 'my/workflow'],
  ])('Security validation: %s', (description, invalidName) => {
    it('should reject in class-based pattern', () => {
      expect(() => new SimpleWorkflow(invalidName)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject in functional pattern', () => {
      expect(() => new Workflow({ name: invalidName }, async () => {}))
        .toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe.each([
    ['alphanumeric', 'Workflow123'],
    ['with spaces', 'My Workflow'],
    ['with hyphens', 'my-workflow'],
    ['with underscores', 'my_workflow'],
  ])('Valid names: %s', (description, validName) => {
    it('should accept in class-based pattern', () => {
      expect(() => new SimpleWorkflow(validName)).not.toThrow();
      const wf = new SimpleWorkflow(validName);
      expect(wf.getNode().name).toBe(validName);
    });

    it('should accept in functional pattern', () => {
      expect(() => new Workflow({ name: validName }, async () => {})).not.toThrow();
      const wf = new Workflow({ name: validName }, async () => {});
      expect(wf.getNode().name).toBe(validName);
    });
  });
});
```

#### Helper Function for Pattern Testing
```typescript
describe('Constructor Pattern Helper Functions', () => {
  // Helper to test both constructor patterns
  function testBothPatterns(
    description: string,
    name: string,
    shouldThrow: boolean,
    expectedMessage?: string
  ) {
    describe(description, () => {
      it('class-based pattern', () => {
        if (shouldThrow) {
          expect(() => new SimpleWorkflow(name))
            .toThrow(expectedMessage || INVALID_NAME_MESSAGE);
        } else {
          expect(() => new SimpleWorkflow(name)).not.toThrow();
          const wf = new SimpleWorkflow(name);
          expect(wf.getNode().name).toBe(name);
        }
      });

      it('functional pattern', () => {
        if (shouldThrow) {
          expect(() => new Workflow({ name }, async () => {}))
            .toThrow(expectedMessage || INVALID_NAME_MESSAGE);
        } else {
          expect(() => new Workflow({ name }, async () => {})).not.toThrow();
          const wf = new Workflow({ name }, async () => {});
          expect(wf.getNode().name).toBe(name);
        }
      });
    });
  }

  // Use the helper
  testBothPatterns('should accept valid alphanumeric name', 'Workflow123', false);
  testBothPatterns('should reject script tag', '<script>', true);
  testBothPatterns('should reject path traversal', '../etc/passwd', true);
  testBothPatterns('should reject control character', 'test\x00name', true);
});
```

#### Consistency Tests Across Patterns
```typescript
describe('Constructor Pattern Consistency', () => {
  it('should create equivalent workflows for same valid name', () => {
    const name = 'TestWorkflow';

    const classBased = new SimpleWorkflow(name);
    const functional = new Workflow({ name }, async () => {});

    expect(classBased.getNode().name).toBe(functional.getNode().name);
    expect(classBased.getNode().name).toBe(name);
  });

  it('should have identical validation logic', () => {
    const testNames = [
      'ValidName',
      '<script>',
      '../etc/passwd',
      'test\x00name',
      'my/workflow',
    ];

    testNames.forEach(name => {
      const classBasedThrows = () => new SimpleWorkflow(name);
      const functionalThrows = () => new Workflow({ name }, async () => {});

      // Both should throw or both should not throw
      const classThrows = classBasedThrows !== undefined;
      const functionalThrows = functionalThrows !== undefined;

      // Verify they behave the same
      try {
        new SimpleWorkflow(name);
        new Workflow({ name }, async () => {});
        // Neither threw - consistent
      } catch (e) {
        // Class-based threw, functional should too
        expect(() => new Workflow({ name }, async () => {})).toThrow();
      }
    });
  });

  it('should have identical error messages', () => {
    const invalidInputs = [
      '<script>',
      '../etc/passwd',
      'test\x00name',
    ];

    invalidInputs.forEach(input => {
      let classError: Error | undefined;
      let functionalError: Error | undefined;

      try {
        new SimpleWorkflow(input);
      } catch (e) {
        classError = e as Error;
      }

      try {
        new Workflow({ name: input }, async () => {});
      } catch (e) {
        functionalError = e as Error;
      }

      expect(classError?.message).toBe(functionalError?.message);
    });
  });
});
```

**Key Principles:**
- Test every security validation in both constructor patterns
- Verify error messages are identical across patterns
- Ensure validation behavior is consistent
- Use parameterized tests to reduce duplication
- Create helper functions for pattern-agnostic testing
- Test edge cases in both patterns

---

## 5. Anti-Patterns to Avoid

### 5.1 Test Anti-Patterns

#### ❌ Anti-Pattern: Testing Implementation Details
```typescript
// ❌ BAD - Tests internal regex pattern
it('should reject names matching /<[^>]*>/', () => {
  expect(() => new SimpleWorkflow('<script>')).toThrow();
});

// ✅ GOOD - Tests security behavior
it('should reject names with HTML tags', () => {
  expect(() => new SimpleWorkflow('<script>')).toThrow();
});
```

#### ❌ Anti-Pattern: Only Testing Negative Cases
```typescript
// ❌ BAD - Only tests what should be rejected
describe('Security Tests', () => {
  it('should reject script tags', () => { /* ... */ });
  it('should reject path traversal', () => { /* ... */ });
  // Missing: tests for valid input
});

// ✅ GOOD - Tests both positive and negative cases
describe('Security Tests', () => {
  describe('Positive Cases', () => {
    it('should accept valid names', () => { /* ... */ });
  });
  describe('Negative Cases', () => {
    it('should reject script tags', () => { /* ... */ });
    it('should reject path traversal', () => { /* ... */ });
  });
});
```

#### ❌ Anti-Pattern: Revealing Error Details in Tests
```typescript
// ❌ BAD - Tests reveal that path traversal was detected
it('should reject path traversal attempts', () => {
  expect(() => new SimpleWorkflow('../etc/passwd'))
    .toThrow('Path traversal detected: ../etc/passwd');
});

// ✅ GOOD - Tests use generic error message
it('should reject invalid names', () => {
  expect(() => new SimpleWorkflow('../etc/passwd'))
    .toThrow('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
});
```

#### ❌ Anti-Pattern: Incomplete Coverage
```typescript
// ❌ BAD - Only tests one control character
describe('Control Character Tests', () => {
  it('should reject null byte', () => {
    expect(() => new SimpleWorkflow('\x00')).toThrow();
  });
  // Missing: tests for other control characters
});

// ✅ GOOD - Tests comprehensive control character range
describe('Control Character Tests', () => {
  it.each([
    ['\x00', 'null byte'],
    ['\x07', 'bell'],
    ['\x1B', 'escape'],
    // ... more control characters
  ])('should reject %s', (char, name) => {
    expect(() => new SimpleWorkflow(`test${char}name`)).toThrow();
  });
});
```

#### ❌ Anti-Pattern: Duplicated Test Logic
```typescript
// ❌ BAD - Duplicated test logic
describe('XSS Tests', () => {
  it('should reject script tag', () => {
    expect(() => new SimpleWorkflow('<script>')).toThrow();
  });
  it('should reject iframe tag', () => {
    expect(() => new SimpleWorkflow('<iframe>')).toThrow();
  });
  it('should reject img tag', () => {
    expect(() => new SimpleWorkflow('<img>')).toThrow();
  });
  // ... many more duplicated lines
});

// ✅ GOOD - Parameterized tests
describe('XSS Tests', () => {
  it.each([
    ['<script>', 'script tag'],
    ['<iframe>', 'iframe tag'],
    ['<img>', 'img tag'],
    // ... more cases
  ])('should reject %s', (payload, description) => {
    expect(() => new SimpleWorkflow(payload)).toThrow();
  });
});
```

### 5.2 Implementation Anti-Patterns

#### ❌ Anti-Pattern: Error Messages Reveal System Information
```typescript
// ❌ BAD - Reveals file system structure
throw new Error(`Path traversal attempt detected: ${input} tried to access /etc/passwd`);

// ❌ BAD - Reveals validation logic
throw new Error(`Input failed regex: /<[^>]*>/ at position ${input.indexOf('<')}`);

// ✅ GOOD - Generic error message
throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and );
```

#### ❌ Anti-Pattern: Echoing Malicious Input
```typescript
// ❌ BAD - Echoes back malicious input
throw new Error(`Invalid characters in name: ${maliciousInput}`);

// ❌ BAD - Includes malicious input in error context
const error = new ValidationError('Invalid name');
error.details = { input: maliciousInput }; // This could be logged!

// ✅ GOOD - Generic error, no input echo
throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
```

#### ❌ Anti-Pattern: Relying on Single Validation Layer
```typescript
// ❌ BAD - Only blocks specific patterns
if (input.includes('<script>')) {
  throw new Error('Invalid');
}

// ✅ GOOD - Multiple validation layers (defense in depth)
if (/[\x00-\x1F\x7F]/.test(input)) { // Control characters
  throw new Error('Invalid');
}
if (/<[^>]*>/.test(input) || /javascript:/i.test(input)) { // XSS
  throw new Error('Invalid');
}
if (!/^[a-zA-Z0-9 _-]+$/.test(input)) { // Allowlist
  throw new Error('Invalid');
}
```

#### ❌ Anti-Pattern: Inconsistent Validation Across Patterns
```typescript
// ❌ BAD - Different validation for different constructor patterns
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  if (typeof name === 'object') {
    // Functional pattern - no validation!
    this.config = name;
  } else {
    // Class-based pattern - validation here
    this.validateName(name);
  }
}

// ✅ GOOD - Consistent validation across all patterns
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  if (typeof name === 'object') {
    this.config = name;
  } else {
    this.config = { name };
  }
  // Validate for both patterns
  this.validateName(this.config.name);
}
```

### 5.3 Testing Anti-Patterns

#### ❌ Anti-Pattern: Not Testing Both Constructor Patterns
```typescript
// ❌ BAD - Only tests class-based pattern
describe('Security Tests', () => {
  it('should reject XSS', () => {
    expect(() => new SimpleWorkflow('<script>')).toThrow();
  });
  // Missing: tests for functional pattern
});

// ✅ GOOD - Tests both patterns
describe('Security Tests', () => {
  it('should reject XSS in class-based pattern', () => {
    expect(() => new SimpleWorkflow('<script>')).toThrow();
  });
  it('should reject XSS in functional pattern', () => {
    expect(() => new Workflow({ name: '<script>' }, async () => {})).toThrow();
  });
});
```

#### ❌ Anti-Pattern: Brittle Test Data
```typescript
// ❌ BAD - Hardcoded test values scattered throughout
it('should reject XSS', () => {
  expect(() => new SimpleWorkflow('<script>alert("xss")</script>')).toThrow();
});
it('should reject script', () => {
  expect(() => new SimpleWorkflow('<script>alert("xss")</script>')).toThrow();
});

// ✅ GOOD - Centralized test constants
const XSS_PAYLOADS = {
  SCRIPT: '<script>alert("xss")</script>',
} as const;

it('should reject XSS', () => {
  expect(() => new SimpleWorkflow(XSS_PAYLOADS.SCRIPT)).toThrow();
});
```

---

## 6. Online Resources

### 6.1 Security Testing Resources

**Note:** Web search was unavailable at time of research. The following are authoritative resources for security testing best practices:

#### OWASP (Open Web Application Security Project)
- **OWASP Testing Guide:** https://owasp.org/www-project-web-security-testing-guide/
- **OWASP XSS Prevention Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- **OWASP Input Validation Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **OWASP Path Traversal:** https://owasp.org/www-community/attacks/Path_Traversal

#### TypeScript/JavaScript Security
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/
- **TypeScript Security:** https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- **JavaScript Security:** https://developer.mozilla.org/en-US/docs/Web/Security

#### Testing Framework Documentation
- **Vitest Security Testing:** https://vitest.dev/guide/
- **Jest Security Testing:** https://jestjs.io/docs/getting-started
- **Testing Library Security:** https://testing-library.com/docs/dom-testing-library/intro/

#### Security Research
- **CWE (Common Weakness Enumeration):** https://cwe.mitre.org/
- **CVE (Common Vulnerabilities and Exposures):** https://cve.mitre.org/
- **SANS Institute Security Resources:** https://www.sans.org/security-resources/

### 6.2 Key Security Concepts

#### Control Character Injection
- **Attack Vector:** Inserting control characters to manipulate terminal output or logs
- **Prevention:** Reject ASCII 0x00-0x1F and 0x7F
- **Testing:** Test all control characters individually and in combinations

#### Cross-Site Scripting (XSS)
- **Attack Vector:** Injecting HTML/JavaScript to execute in user's browser
- **Prevention:** Reject HTML tags, JavaScript protocols, event handlers
- **Testing:** Test OWASP XSS payload list, case variations, partial tags

#### Path Traversal
- **Attack Vector:** Using `../` to access files outside intended directory
- **Prevention:** Reject `..` patterns, normalize paths, validate against allowlist
- **Testing:** Test Unix and Windows separators, encoding variations, positions

#### File System Injection
- **Attack Vector:** Using file system special characters to manipulate paths
- **Prevention:** Reject `/ \ : * ? " < > |` and other platform-specific characters
- **Testing:** Test each character individually, at different positions

#### Allowlist Validation
- **Approach:** Only allow known-safe characters (defense in depth)
- **Pattern:** `^[a-zA-Z0-9 _-]+$` for alphanumeric, spaces, hyphens, underscores
- **Testing:** Comprehensive positive and negative test cases

### 6.3 Testing Best Practices References

#### General Testing Principles
- **Arrange-Act-Assert Pattern:** Structure tests clearly
- **Test Naming:** Use descriptive test names that describe behavior
- **Test Independence:** Each test should be independent
- **Fast Tests:** Security tests should run quickly
- **Clear Assertions:** Use specific, clear assertions

#### Vitest/Jest Best Practices
- **Use toThrow() for errors:** Don't call functions directly in expect
- **Parameterized tests:** Use `it.each()` for similar test cases
- **Test constants:** Define constants for test data
- **Helper functions:** Create reusable test helpers
- **Describe blocks:** Organize tests logically
- **Before/After:** Use setup/teardown appropriately

---

## Summary

### Key Takeaways

1. **Comprehensive Coverage:** Test all security validation patterns with both positive and negative cases
2. **Parameterized Tests:** Use `it.each()` for repetitive test cases
3. **Generic Error Messages:** Error messages should not reveal implementation details
4. **Both Constructor Patterns:** Test all patterns (class-based and functional) consistently
5. **Test Organization:** Use describe blocks to organize tests by security category
6. **Edge Cases:** Test boundaries, positions, encodings, and combinations
7. **Anti-Patterns:** Avoid testing implementation details and revealing system information
8. **Test Helpers:** Create reusable helpers and constants for maintainable tests
9. **Security in Depth:** Use multiple validation layers (control chars, XSS, path traversal, allowlist)
10. **Documentation:** Document security validation rules and testing approach

### Testing Checklist

- [ ] Control character validation (ASCII 0x00-0x1F, 0x7F)
- [ ] HTML/XSS injection pattern validation
- [ ] Path traversal validation
- [ ] File system character validation
- [ ] Allowlist validation (positive and negative cases)
- [ ] Both constructor patterns tested
- [ ] Error messages are generic and safe
- [ ] Edge cases tested (boundaries, positions, encodings)
- [ ] Parameterized tests for similar cases
- [ ] Test constants and helpers defined
- [ ] Tests organized in describe blocks
- [ ] No implementation details tested
- [ ] No system information revealed

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Complete
**Next Steps:** Apply these patterns to test security validations in the Groundswell workflow framework

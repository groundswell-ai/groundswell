# Product Requirement Prompt (PRP): Implement Workflow Name Security Validation

---

## Goal

**Feature Goal**: Add comprehensive security validation to the Workflow constructor to prevent XSS, injection attacks, and path traversal vulnerabilities in workflow names.

**Deliverable**: Enhanced workflow name validation in the Workflow constructor that validates against control characters, HTML/JavaScript injection patterns, path traversal sequences, and file system operation characters, with clear JSDoc documentation.

**Success Definition**:
- [ ] Workflow constructor validates all security patterns defined in contract
- [ ] Control characters are rejected (regex: `/[\x00-\x1F\x7F]/`)
- [ ] HTML/JS injection patterns are rejected (`/<[^>]*>/`, `/javascript:/i`)
- [ ] Path traversal patterns are rejected (`/\.\./`)
- [ ] File system operation characters are rejected (`/[\/\\:*?"<>|]/`)
- [ ] JSDoc documents allowed characters (alphanumeric, spaces, hyphens, underscores)
- [ ] Tests cover all security validation patterns
- [ ] Error messages are user-friendly and secure (no information disclosure)
- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

---

## User Persona

**Target User**: Implementation agent working on P3.M1.T3.S1 (workflow name security validation).

**Use Case**: Adding security validation to prevent malicious workflow names that could be used for XSS attacks, path traversal, or other security vulnerabilities.

**User Journey**:
1. Review existing workflow constructor validation logic
2. Study codebase validation patterns and security best practices
3. Implement security validations following existing patterns
4. Add comprehensive JSDoc documentation
5. Write tests for all security patterns
6. Verify with linting, build, and test suite

**Pain Points Addressed**:
- **Security Vulnerability**: Workflow names like `<script>alert('xss')</script>` are currently allowed
- **Missing Validation**: No validation for control characters, HTML tags, or path traversal
- **Documentation Gap**: No documentation of allowed characters in workflow names
- **Testing Gap**: No tests for security-related validation

---

## Why

**Business Value and User Impact**:
- Prevents security vulnerabilities in workflow names (XSS, injection attacks)
- Protects against path traversal attacks that could expose system files
- Improves overall security posture of the workflow system
- Provides clear guidance on valid workflow names through documentation
- Catches security issues early (at workflow creation time)

**Integration with Existing Features**:
- Builds on existing workflow constructor validation (empty/whitespace/length)
- Follows existing validation patterns in the codebase
- Consistent with error handling patterns in constructor
- No behavioral changes to valid workflow names
- Extends existing test suite in `workflow.test.ts`

**Problems Solved**:
- **Issue 10**: Workflow constructor validates empty/whitespace/length but not special characters
- **Security Gap**: Names like `<script>alert('xss')</script>` are currently allowed
- **Path Traversal**: No detection of `../` or similar patterns
- **Control Characters**: No validation for ASCII control characters (0x00-0x1F, 0x7F)
- **HTML Injection**: No detection of HTML tags or JavaScript patterns

---

## What

**User-Visible Behavior and Technical Requirements**:

### Security Validation Requirements

The Workflow constructor (lines 99-156 of `src/core/workflow.ts`) will be enhanced with the following security validations:

**1. Control Character Validation**
- Reject names containing ASCII control characters (0x00-0x1F, 0x7F)
- Regex pattern: `/[\x00-\x1F\x7F]/`
- Prevents log injection, string termination attacks, format string attacks

**2. HTML/JavaScript Injection Validation**
- Reject names containing HTML tags
- Regex pattern: `/<[^>]*>/`
- Reject names containing `javascript:` protocol
- Regex pattern: `/javascript:/i` (case-insensitive)
- Prevents XSS attacks when workflow names are displayed or logged

**3. Path Traversal Validation**
- Reject names containing `..` (parent directory patterns)
- Regex pattern: `/\.\./`
- Prevents path traversal attacks
- Note: This also blocks valid uses of `..` in names (acceptable trade-off for security)

**4. File System Operation Validation**
- Reject names containing file system special characters
- Regex pattern: `/[\/\\:*?"<>|]/`
- Characters: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
- Prevents confusion with file paths and shell commands

**5. Allowed Characters (Allowlist)**
- Final validation using allowlist approach
- Allowed: Alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_)
- Regex pattern: `/^[a-zA-Z0-9 _-]+$/`
- Provides defense-in-depth

**6. JSDoc Documentation**
- Document allowed characters explicitly
- Follow patterns from P3.M1.T2.S2 (JSDoc clarity improvements)
- Add `@remarks` section for security validation details

### Success Criteria

- [ ] All security validation patterns implemented in constructor
- [ ] Error messages are generic and user-friendly
- [ ] No information disclosure in error messages
- [ ] JSDoc documentation is clear and comprehensive
- [ ] Tests cover all validation patterns (positive and negative cases)
- [ ] Both constructor patterns tested (class-based and functional)
- [ ] All existing tests still pass
- [ ] Linting passes with no new issues
- [ ] Build succeeds with no type errors

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file paths and line numbers for modification
- Current validation code to extend
- Security patterns with specific regex implementations
- Test file location and existing test patterns
- Error handling patterns from codebase
- JSDoc documentation patterns from previous work item
- Complete validation command sequence
- External security research references

---

### Documentation & References

```yaml
# MUST READ - Current workflow constructor implementation
- file: src/core/workflow.ts
  why: Contains the workflow constructor that needs enhancement
  lines: 99-156 (constructor), 127-135 (existing name validation)
  pattern: Constructor validation using plain Error (not WorkflowError)
  critical: This is where all new security validations must be added

# MUST READ - Existing validation tests
- file: src/__tests__/unit/workflow.test.ts
  why: Contains existing workflow name validation tests
  section: "Workflow Name Validation" describe block
  pattern: Error testing with toThrow() and specific error messages
  critical: New security tests must be added here following same pattern

# MUST READ - Codebase validation patterns
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/research/codebase-validation-patterns.md
  why: Summary of validation patterns used throughout the codebase
  section: Summary, Test Patterns for Validation
  critical: Shows how to structure validation and tests in this codebase

# MUST READ - Security validation research
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/research/security-validation-research.md
  why: Comprehensive security best practices for workflow name validation
  section: Complete Implementation Example, Implementation Summary
  critical: Contains specific regex patterns and validation logic to use

# MUST READ - WorkflowError usage patterns
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/research/WorkflowError-patterns.md
  why: Shows when to use plain Error vs WorkflowError
  section: Decision Matrix, Conclusion for P3.M1.T3.S1
  critical: Constructor validation should use plain Error, not WorkflowError

# MUST READ - Previous work context (P3.M1.T2.S2)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S2/PRP.md
  why: Understand JSDoc patterns established in previous work item
  section: Implementation Patterns & Key Details, JSDoc patterns
  critical: Follow same JSDoc clarity patterns for consistency

# MUST READ - WorkflowError interface
- file: src/types/error.ts
  why: Understand WorkflowError structure to know NOT to use it for constructor validation
  pattern: Interface with message, original, workflowId, state, logs
  critical: WorkflowError is for runtime execution failures, not constructor validation

# MUST READ - Test helper patterns
- file: src/__tests__/unit/workflow.test.ts
  why: See existing test structure and SimpleWorkflow test class pattern
  lines: 1-50 (imports, test class setup)
  pattern: SimpleWorkflow extends Workflow for testing
  critical: Use same pattern for testing security validations

# EXTERNAL REFERENCES - Security best practices
- url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
  why: OWASP input validation guidelines
  section: Allowlist Validation, Canonicalization
  critical: Industry standard for input validation

- url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
  why: OWASP XSS prevention guidelines
  section: Output Encoding, Input Validation
  critical: Understanding XSS attack patterns

- url: https://cheatsheetseries.owasp.org/cheatsheets/Path_Traversal_Cheat_Sheet.html
  why: OWASP path traversal prevention
  section: Path Traversal Detection, Encoding Variants
  critical: Detecting path traversal patterns including encoded variants
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # MODIFY: Add security validation in constructor (lines 127-135)
│   ├── agent.ts                 # REFERENCE: JSDoc patterns from P3.M1.T2.S2
│   └── workflow-context.ts      # REFERENCE: See WorkflowError usage pattern
├── types/
│   ├── error.ts                 # READ: WorkflowError interface (don't use for constructor)
│   └── workflow.ts              # READ: WorkflowConfig interface
├── __tests__/
│   └── unit/
│       ├── workflow.test.ts     # MODIFY: Add security validation tests
│       └── utils/               # REFERENCE: Test helper patterns
└── utils/
    └── agent-validation.ts      # REFERENCE: Validation pattern examples
```

---

### Desired Codebase Tree with Files to be Modified

```bash
# MODIFIED FILES:

# src/core/workflow.ts
# - Lines 127-135: Extend existing name validation with security checks
# - Lines 100-110: Add JSDoc documenting allowed characters
# - Add validation for: control characters, HTML/JS injection, path traversal, FS characters
# - Add allowlist validation for allowed characters

# src/__tests__/unit/workflow.test.ts
# - Add security validation tests to existing "Workflow Name Validation" section
# - Test all security patterns with both positive and negative cases
# - Test both constructor patterns (class-based and functional)
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Constructor validation uses plain Error, NOT WorkflowError
// WorkflowError is reserved for runtime execution failures
// Pattern from src/core/workflow.ts:127-135
if (trimmedName.length === 0) {
  throw new Error('Workflow name cannot be empty or whitespace only');
}
// Follow this pattern for all new security validations

// CRITICAL: Workflow constructor has two patterns
// Class-based: constructor(name?: string, parent?: Workflow)
// Functional: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)
// Security validation must work for BOTH patterns
// The config normalization happens first (lines 115-124), then validation (lines 127-135)

// CRITICAL: Test structure uses SimpleWorkflow class
// Pattern from src/__tests__/unit/workflow.test.ts
class SimpleWorkflow extends Workflow {
  constructor(name?: string) {
    super(name);
  }

  @Step()
  async testStep(): Promise<void> {
    // Test step implementation
  }
}
// Use this pattern for testing security validations

// CRITICAL: Error message pattern in this codebase
// Existing messages: 'Workflow name cannot be empty or whitespace only'
// Existing messages: 'Workflow name cannot exceed 100 characters'
// Use similar pattern: 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.'

// CRITICAL: Security - use generic error messages
// Don't reveal: "HTML tag detected", "Path traversal detected"
// DO reveal: "Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores."
// This prevents information disclosure to attackers

// CRITICAL: Test pattern for error validation
// Pattern from src/__tests__/unit/workflow.test.ts
it('should reject empty string name', () => {
  expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
});
// Follow this pattern: expect(() => new SimpleWorkflow(invalid)).toThrow(expectedMessage)

// CRITICAL: JSDoc patterns from P3.M1.T2.S2
// P3.M1.T2.S2 improved JSDoc clarity across codebase
// Follow those patterns for new JSDoc documentation
// Use @remarks for additional context
// Use (default: value) for defaults
// Document side effects if any

// CRITICAL: Previous work context - P3.M1.T2.S2
// P3.M1.T2.S2: JSDoc clarity improvements across codebase
// Files modified: src/core/workflow.ts (JSDoc improvements)
// Our implementation should include proper JSDoc following those patterns
// Don't duplicate JSDoc work already done in P3.M1.T2.S2

// CRITICAL: Validation happens AFTER config normalization
// Lines 115-124: Config normalization (convert overloaded constructor args to config)
// Lines 127-135: Validation (validate this.config.name)
// New security validations must go in the validation section, after normalization

// CRITICAL: Trim happens before length check
// const trimmedName = this.config.name.trim();
// if (trimmedName.length === 0) { ... }
// Security validations should use this.config.name (not trimmed)
// OR use trimmedName and add validation after trim
// Recommendation: Use trimmedName for security checks (more restrictive)

// CRITICAL: Both constructor patterns must work
// Pattern 1: new Workflow('My Workflow')
// Pattern 2: new Workflow({ name: 'My Workflow' }, executor)
// Security validation must work for both
// Current code handles this by normalizing to this.config.name first

// CRITICAL: TypeScript compilation
// npm run build must succeed
// No new type errors allowed
// All existing code must continue to compile

// CRITICAL: Existing tests must still pass
// All tests in src/__tests__/unit/workflow.test.ts must pass
// No breaking changes to valid workflow names
// Valid names: alphanumeric, spaces, hyphens, underscores

// CRITICAL: Test both positive and negative cases
// Negative: Names that should be rejected (XSS, path traversal, etc.)
// Positive: Names that should be accepted (valid characters)
// Edge cases: Empty strings, null, undefined, very long names

// CRITICAL: Security validations are additive
// Don't remove existing validations (empty, whitespace, length)
// Add new security validations alongside existing ones
// Maintain backward compatibility for valid names

// CRITICAL: Validation order matters for error messages
// Most specific validation first (control characters)
// Then HTML/JS injection patterns
// Then path traversal patterns
// Then file system characters
// Finally, allowlist validation (catch-all)
// This gives users the most helpful error for their specific case

// CRITICAL: Don't over-validate
// Alphanumeric + space/hyphen/underscore is reasonable
// Don't block legitimate use cases
// Document allowed characters clearly in JSDoc

// CRITICAL: Follow existing naming conventions
// Test function: should[ExpectedBehavior] or reject[InvalidInput]
// Error messages: Clear, descriptive, consistent
// JSDoc: Follow P3.M1.T2.S2 patterns
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - this extends existing constructor validation:

```typescript
// EXAMPLE: Current validation (lines 127-135)
if (typeof this.config.name === 'string') {
  const trimmedName = this.config.name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  if (this.config.name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }
}

// EXAMPLE: New security validations to add
// Control characters
if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}

// HTML/JS injection
if (/<[^>]*>/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}

// Path traversal
if (/\.\./.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}

// File system characters
if (/[\/\\:*?"<>|]/.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}

// Allowed characters (allowlist - defense in depth)
if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
  throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ existing constructor and validation code
  - FILE: src/core/workflow.ts
  - LINES: 99-156 (constructor), 127-135 (validation)
  - UNDERSTAND: Two constructor patterns, config normalization, existing validation
  - PATTERN: Plain Error for constructor validation (not WorkflowError)

Task 2: READ existing test patterns
  - FILE: src/__tests__/unit/workflow.test.ts
  - SECTION: "Workflow Name Validation" describe block
  - PATTERN: SimpleWorkflow class, toThrow() assertions, specific error messages
  - UNDERSTAND: How to structure validation tests

Task 3: ADD security validation regex constants
  - FILE: src/core/workflow.ts
  - LOCATION: Before constructor (around line 95-98, near other private properties)
  - ADD: Private readonly regex constants for security patterns
  - NAMING: CONTROL_CHAR_PATTERN, HTML_TAG_PATTERN, JAVASCRIPT_PATTERN, PATH_TRAVERSAL_PATTERN, FS_CHARS_PATTERN, ALLOWED_CHARS_PATTERN
  - PATTERN: Follow existing code style for constants

Task 4: ENHANCE constructor JSDoc documentation
  - FILE: src/core/workflow.ts
  - LOCATION: Lines 100-110 (constructor JSDoc)
  - ADD: Document allowed characters in @param description
  - ADD: @remarks section explaining security validation
  - PATTERN: Follow JSDoc patterns from P3.M1.T2.S2
  - CONTENT: "Allowed characters: alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_). Security validation rejects control characters, HTML tags, JavaScript patterns, path traversal sequences, and file system special characters."

Task 5: ADD security validation to constructor
  - FILE: src/core/workflow.ts
  - LOCATION: Lines 127-135 (after existing validation, before line 136)
  - ADD: Control character validation using CONTROL_CHAR_PATTERN
  - ADD: HTML/JS injection validation using HTML_TAG_PATTERN and JAVASCRIPT_PATTERN
  - ADD: Path traversal validation using PATH_TRAVERSAL_PATTERN
  - ADD: File system characters validation using FS_CHARS_PATTERN
  - ADD: Allowlist validation using ALLOWED_CHARS_PATTERN
  - ERROR: Use single generic error message for all security violations
  - PATTERN: Follow existing plain Error pattern, not WorkflowError

Task 6: CREATE security validation tests
  - FILE: src/__tests__/unit/workflow.test.ts
  - LOCATION: Add to existing "Workflow Name Validation" describe block
  - ADD: Test for control characters (null byte, bell, escape, etc.)
  - ADD: Test for HTML tags (script, iframe, etc.)
  - ADD: Test for javascript: protocol (case variations)
  - ADD: Test for path traversal patterns (../, ..\, encoded variants)
  - ADD: Test for file system characters (/, \, :, *, ?, ", <, >, |)
  - ADD: Test for allowed characters (valid names should pass)
  - ADD: Test both constructor patterns (class-based and functional)
  - PATTERN: Follow existing test patterns with SimpleWorkflow class

Task 7: VERIFY all changes with git diff
  - COMMAND: git diff src/core/workflow.ts
  - COMMAND: git diff src/__tests__/unit/workflow.test.ts
  - VERIFY: Only constructor validation and tests changed
  - VERIFY: No other code modified

Task 8: RUN linter
  - COMMAND: npm run lint
  - EXPECTED: No errors (following existing code patterns)
  - FIX: Any linting issues if they arise

Task 9: RUN build
  - COMMAND: npm run build
  - EXPECTED: No type errors
  - FIX: Any type errors if they arise

Task 10: RUN tests
  - COMMAND: npm test
  - EXPECTED: All tests pass (existing + new security tests)
  - VERIFY: Test count increased by number of new tests
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Constructor validation using plain Error
// Location: src/core/workflow.ts lines 127-135

// Before (existing):
if (typeof this.config.name === 'string') {
  const trimmedName = this.config.name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  if (this.config.name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }
}

// After (with security validation):
if (typeof this.config.name === 'string') {
  const trimmedName = this.config.name.trim();

  // Existing: Empty/whitespace validation
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }

  // Existing: Length validation
  if (this.config.name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }

  // NEW: Security validation
  // Control characters (ASCII 0x00-0x1F, 0x7F)
  if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // HTML/JS injection patterns
  if (/<[^>]*>/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // Path traversal patterns
  if (/\.\./.test(trimmedName)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // File system special characters
  if (/[\/\\:*?"<>|]/.test(trimmedName)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // Allowed characters (allowlist - defense in depth)
  if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }
}

// PATTERN 2: JSDoc documentation for constructor
// Location: src/core/workflow.ts lines 100-110

// Before (existing - from P3.M1.T2.S2):
/**
 * Create a new workflow instance
 *
 * @overload Class-based pattern
 * @param name Human-readable name (defaults to class name)
 * @param parent Optional parent workflow
 *
 * @overload Functional pattern
 * @param config Workflow configuration
 * @param executor Executor function
 */

// After (with security documentation):
/**
 * Create a new workflow instance
 *
 * @overload Class-based pattern
 * @param name Human-readable name. Allowed characters: alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_). (defaults to class name)
 * @param parent Optional parent workflow
 *
 * @overload Functional pattern
 * @param config Workflow configuration
 * @param executor Executor function
 *
 * @remarks Security validation rejects names containing control characters, HTML tags, JavaScript patterns, path traversal sequences (..), and file system special characters (/ \ : * ? " < > |). This prevents XSS attacks, injection attacks, and path traversal vulnerabilities.
 */

// PATTERN 3: Test structure for security validation
// Location: src/__tests__/unit/workflow.test.ts

// Add to existing "Workflow Name Validation" describe block:

describe('Workflow Name Validation', () => {
  // ... existing tests ...

  // NEW: Security validation tests

  describe('Security - Control Characters', () => {
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
  });

  describe('Security - HTML/JavaScript Injection', () => {
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
  });

  describe('Security - Path Traversal', () => {
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
  });

  describe('Security - File System Characters', () => {
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
  });

  describe('Security - Allowed Characters (Positive Cases)', () => {
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

    it('should preserve leading/trailing whitespace in config but trim for validation', () => {
      const wf = new SimpleWorkflow('  My Workflow  ');
      expect(wf.getNode().name).toBe('My Workflow'); // trimmed version stored
    });
  });

  describe('Security - Both Constructor Patterns', () => {
    it('should reject invalid names in class-based pattern', () => {
      expect(() => new SimpleWorkflow('<script>alert(1)</script>')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject invalid names in functional pattern', () => {
      const executor = async () => {};
      expect(() => new Workflow({ name: '../etc/passwd' }, executor)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should accept valid names in class-based pattern', () => {
      expect(() => new SimpleWorkflow('My-Workflow_123')).not.toThrow();
    });

    it('should accept valid names in functional pattern', () => {
      const executor = async () => {};
      expect(() => new Workflow({ name: 'My-Workflow_123' }, executor)).not.toThrow();
    });
  });
});

// Test helper constant:
const INVALID_NAME_MESSAGE =
  'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

// GOTCHA 1: Use plain Error, not WorkflowError
// Constructor validation = plain Error
// Runtime execution failures = WorkflowError
// Pattern from src/core/workflow.ts:127-135

// GOTCHA 2: Single generic error message
// Don't reveal specific patterns to attackers
// All security violations use same message
// This prevents information disclosure

// GOTCHA 3: Test both constructor patterns
// Class-based: new SimpleWorkflow('name')
// Functional: new Workflow({ name: 'name' }, executor)
// Security validation must work for both

// GOTCHA 4: Follow existing test patterns
// Use SimpleWorkflow class for testing
// Use toThrow() for error assertions
// Use specific error messages in assertions

// GOTCHA 5: JSDoc patterns from P3.M1.T2.S2
// Document allowed characters explicitly
// Use @remarks for security validation details
// Follow established JSDoc conventions

// GOTCHA 6: Validation order
// Existing validations first (empty, length)
// Then security validations (control chars, HTML/JS, path traversal, FS chars)
// Finally allowlist validation (defense in depth)

// GOTCHA 7: Use trimmedName for security checks
// Consistent with existing validation pattern
// More restrictive (validates trimmed version)

// GOTCHA 8: Don't break existing functionality
// All existing tests must still pass
// Valid workflow names must continue to work
// No breaking changes to public API

// GOTCHA 9: Security validation is additive
// Don't remove existing validations
// Add new security validations alongside
// Maintain backward compatibility

// GOTCHA 10: Test coverage
// Test each security pattern separately
// Test both positive and negative cases
// Test both constructor patterns
// Test edge cases
```

---

### Integration Points

```yaml
NO EXTERNAL INTEGRATIONS:
  - This is a standalone validation enhancement
  - No dependencies on external services
  - No configuration changes
  - No new dependencies

INTERNAL INTEGRATIONS:
  - Extends existing constructor validation
  - Follows existing error handling patterns
  - Uses existing test infrastructure
  - Consistent with JSDoc patterns from P3.M1.T2.S2

SCOPE BOUNDARIES:
  - ONLY validate workflow names in constructor
  - DON'T modify WorkflowError interface
  - DON'T create new validation utilities
  - DON'T modify other validation code
  - DON'T change existing behavior for valid names

RELATED WORK:
  - P3.M1.T2.S2: JSDoc clarity improvements (follow same patterns)
  - Existing workflow constructor validation (extend, don't replace)
  - Existing workflow name tests (add to existing section)

FILES NOT TO MODIFY:
  - PRD.md (read-only)
  - tasks.json (read-only)
  - src/types/error.ts (read-only, understand only)
  - src/utils/agent-validation.ts (reference only)
  - Other source files (focus only on workflow.ts)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run lint

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Verify changes with git diff
git diff src/core/workflow.ts
git diff src/__tests__/unit/workflow.test.ts

# Expected: Only constructor validation and tests changed
```

### Level 2: TypeScript Compilation (Component Validation)

```bash
# Run TypeScript compiler
npm run build

# Expected: No type errors
# If errors exist, READ output and fix before proceeding
# Check for: Type mismatches, missing imports, incorrect parameter types
```

### Level 3: Unit Tests (Component Validation)

```bash
# Run workflow tests specifically
npm test -- src/__tests__/unit/workflow.test.ts

# Expected: All tests pass (existing + new security tests)
# Verify: Test count increased by number of new security tests

# Run full test suite
npm test

# Expected: All tests pass
# Verify: No other tests broken by changes
```

### Level 4: Manual Testing (System Validation)

```bash
# Create a test script to verify validation behavior
cat > test-workflow-name-validation.ts << 'EOF'
import { Workflow } from './src/core/workflow';

// Test invalid names (should throw)
const invalidNames = [
  '<script>alert("xss")</script>',
  'javascript:alert(1)',
  '../etc/passwd',
  'test\x00name',
  'my/workflow',
  'my:workflow',
];

console.log('Testing invalid names...');
for (const name of invalidNames) {
  try {
    new Workflow({ name: name }, async () => {});
    console.error(`FAIL: "${name}" should have been rejected`);
  } catch (error) {
    console.log(`PASS: "${name}" rejected with: ${(error as Error).message}`);
  }
}

// Test valid names (should succeed)
const validNames = [
  'My Workflow',
  'my-workflow',
  'my_workflow',
  'Workflow123',
  'My_Workflow-123 Test',
];

console.log('\nTesting valid names...');
for (const name of validNames) {
  try {
    const wf = new Workflow({ name: name }, async () => {});
    console.log(`PASS: "${name}" accepted (stored as: "${wf.getNode().name}")`);
  } catch (error) {
    console.error(`FAIL: "${name}" should have been accepted but got: ${(error as Error).message}`);
  }
}
EOF

# Run the test script
npx tsx test-workflow-name-validation.ts

# Expected: All invalid names rejected, all valid names accepted
# Clean up test script
rm test-workflow-name-validation.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All security validation patterns implemented in constructor
- [ ] Control character validation: `/[\x00-\x1F\x7F]/`
- [ ] HTML tag validation: `/<[^>]*>/`
- [ ] JavaScript protocol validation: `/javascript:/i`
- [ ] Path traversal validation: `/\.\./`
- [ ] File system characters validation: `/[\/\\:*?"<>|]/`
- [ ] Allowlist validation: `/^[a-zA-Z0-9 _-]+$/`
- [ ] JSDoc documentation added with allowed characters
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm test`

### Feature Validation

- [ ] Error messages are generic and user-friendly
- [ ] No information disclosure in error messages
- [ ] Both constructor patterns tested (class-based and functional)
- [ ] All security patterns have test coverage
- [ ] Valid workflow names still work (backward compatible)
- [ ] Invalid workflow names are properly rejected
- [ ] Edge cases covered (empty, null, very long names)
- [ ] JSDoc follows P3.M1.T2.S2 patterns

### Code Quality Validation

- [ ] Only constructor validation modified (not other code)
- [ ] Tests added to existing "Workflow Name Validation" section
- [ ] Follows existing codebase patterns and conventions
- [ ] Uses plain Error (not WorkflowError) for constructor validation
- [ ] No breaking changes to public API
- [ ] No new dependencies added
- [ ] No configuration changes required
- [ ] Code is self-documenting with clear variable names

### Security Validation

- [ ] XSS attack vectors blocked (script tags, event handlers, javascript:)
- [ ] Path traversal blocked (../ patterns)
- [ ] Control characters blocked (log injection prevention)
- [ ] File system characters blocked (prevents confusion with paths)
- [ ] Allowlist validation provides defense-in-depth
- [ ] Error messages don't reveal validation patterns to attackers
- [ ] All validation happens before workflow execution begins

### Documentation & Deployment

- [ ] JSDoc documents allowed characters clearly
- [ ] @remarks section explains security validation
- [ ] Code comments explain security rationale
- [ ] No migration notes needed (backward compatible)
- [ ] No user-facing documentation changes required

---

## Anti-Patterns to Avoid

- ❌ Don't use WorkflowError for constructor validation (use plain Error)
- ❌ Don't reveal specific validation patterns in error messages (security)
- ❌ Don't modify other parts of workflow.ts (only constructor validation)
- ❌ Don't create separate validation utility files (add to constructor)
- ❌ Don't break existing valid workflow names (maintain compatibility)
- ❌ Don't remove existing validations (add to them)
- ❌ Don't use different error message patterns (follow existing)
- ❌ Don't skip testing both constructor patterns
- ❌ Don't forget to add JSDoc documentation
- ❌ Don't modify PRD.md or tasks.json (read-only files)
- ❌ Don't add new dependencies (use existing patterns)
- ❌ Don't over-validate (alphanumeric + space/hyphen/underscore is reasonable)
- ❌ Don't skip validation levels (lint → build → test → manual)
- ❌ Don't ignore failing tests (fix root cause before proceeding)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Exact file paths and line numbers provided
- ✅ Current validation code well-understood
- ✅ Security patterns with specific regex implementations
- ✅ Clear test patterns and structure
- ✅ No external dependencies or integrations
- ✅ Minimal scope (single enhancement to existing validation)
- ✅ Comprehensive research on codebase patterns
- ✅ External security best practices research
- ✅ Clear error handling pattern (plain Error, not WorkflowError)
- ✅ JSDoc patterns from previous work item (P3.M1.T2.S2)
- ✅ Test file location and existing test patterns documented
- ✅ No breaking changes to valid workflow names
- ✅ Backward compatible implementation

**Validation**: This is a straightforward, well-scoped security enhancement. The implementation extends existing constructor validation with proven security patterns. All context is provided: exact file locations, current code, security regex patterns, test structure, error handling patterns, and JSDoc conventions. The changes are localized to a single validation block in the constructor and tests. No architectural decisions or external dependencies required. Highest confidence for one-pass implementation success.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**

# Workflow Constructor Validation Analysis

**Created**: 2026-01-26
**Purpose**: Analyze workflow constructor implementation for P3.M1.T3.S2 test development
**Source File**: `/home/dustin/projects/groundswell/src/core/workflow.ts`

---

## Executive Summary

The Workflow constructor implements comprehensive security validation across two patterns (class-based and functional). This analysis provides the exact validation implementation, error messages, and test requirements for P3.M1.T3.S2.

---

## 1. Current Validation Implementation (Post P3.M1.T3.S1)

### Constructor Location
- **File**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Constructor Lines**: 112-182
- **Validation Logic Lines**: 127-161

### Complete Constructor Code

```typescript
/**
 * Create a new workflow instance
 *
 * @overload Class-based pattern: constructor(name?: string, parent?: Workflow)
 * @overload Functional pattern: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)
 * @param name For class-based pattern, human-readable name. Allowed characters: alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_). (default: class name).
 * For functional pattern, config object with workflow settings.
 * @param parentOrExecutor For class-based pattern, optional parent workflow.
 * For functional pattern, executor function.
 *
 * @remarks Security validation rejects names containing control characters, HTML tags, JavaScript patterns, path traversal sequences (..), and file system special characters (/ \ : * ? " < > |). This prevents XSS attacks, injection attacks, and path traversal vulnerabilities.
 */
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  this.id = generateId();

  // Parse overloaded arguments
  if (typeof name === 'object' && name !== null) {
    // Functional pattern: constructor(config, executor)
    this.config = name;
    this.executor = parentOrExecutor as WorkflowExecutor<T>;
    this.parent = null;
  } else {
    // Class-based pattern: constructor(name, parent)
    this.config = { name: name ?? this.constructor.name };
    this.parent = (parentOrExecutor as Workflow) ?? null;
  }

  // Validate workflow name (after config is normalized)
  if (typeof this.config.name === 'string') {
    const trimmedName = this.config.name.trim();
    if (trimmedName.length === 0) {
      throw new Error('Workflow name cannot be empty or whitespace only');
    }
    if (this.config.name.length > 100) {
      throw new Error('Workflow name cannot exceed 100 characters');
    }

    // Security validation: control characters (ASCII 0x00-0x1F, 0x7F)
    if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
      throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
    }

    // Security validation: HTML/JavaScript injection patterns
    if (/<[^>]*>/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
      throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
    }

    // Security validation: path traversal patterns
    if (/\.\./.test(trimmedName)) {
      throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
    }

    // Security validation: file system special characters
    if (/[\/\\:*?"<>|]/.test(trimmedName)) {
      throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
    }

    // Security validation: allowed characters (allowlist - defense in depth)
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
      throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
    }
  }

  // Create the node representation
  this.node = {
    id: this.id,
    name: this.config.name ?? this.constructor.name,
    parent: this.parent?.node ?? null,
    children: [],
    status: 'idle',
    logs: [],
    events: [],
    stateSnapshot: null,
  };

  // Create logger with root observers
  this.logger = new WorkflowLogger(this.node, this.getRootObservers());

  // Attach to parent if provided
  if (this.parent) {
    this.attachChild(this);
  }
}
```

---

## 2. Security Validation Patterns

### Validation Order (Lines 137-160)

The validations execute in this specific order:

1. **Empty/Whitespace Check** (Line 130-132)
   ```typescript
   if (trimmedName.length === 0) {
     throw new Error('Workflow name cannot be empty or whitespace only');
   }
   ```

2. **Length Check** (Line 133-135)
   ```typescript
   if (this.config.name.length > 100) {
     throw new Error('Workflow name cannot exceed 100 characters');
   }
   ```

3. **Control Character Validation** (Line 138-140)
   ```typescript
   if (/[\x00-\x1F\x7F]/.test(trimmedName)) {
     throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
   }
   ```
   - **Pattern**: `/[\x00-\x1F\x7F]/`
   - **Detects**: ASCII control characters (0x00-0x1F, 0x7F)
   - **Prevents**: Log injection, string termination, format string attacks

4. **HTML/JavaScript Injection Validation** (Line 143-145)
   ```typescript
   if (/<[^>]*>/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
     throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
   }
   ```
   - **Patterns**: `/<[^>]*>/` (HTML tags), `/javascript:/i` (JS protocol, case-insensitive)
   - **Detects**: `<script>`, `<img>`, `javascript:alert(1)`, etc.
   - **Prevents**: XSS attacks, HTML injection

5. **Path Traversal Validation** (Line 148-150)
   ```typescript
   if (/\.\./.test(trimmedName)) {
     throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
   }
   ```
   - **Pattern**: `/\.\./`
   - **Detects**: `..`, `../`, `..\`, `a..b`, etc.
   - **Prevents**: Path traversal attacks

6. **File System Characters Validation** (Line 153-155)
   ```typescript
   if (/[\/\\:*?"<>|]/.test(trimmedName)) {
     throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
   }
   ```
   - **Pattern**: `/[\/\\:*?"<>|]/`
   - **Characters**: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`
   - **Prevents**: File system confusion, shell command injection

7. **Allowlist Validation** (Line 158-160) - **Defense in Depth**
   ```typescript
   if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
     throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
   }
   ```
   - **Pattern**: `/^[a-zA-Z0-9 _-]+$/`
   - **Allows**: a-z, A-Z, 0-9, space, hyphen (-), underscore (_)
   - **Purpose**: Final check to ensure only allowed characters pass

---

## 3. Both Constructor Patterns

### Pattern 1: Class-Based Constructor

```typescript
// Constructor signature
constructor(name?: string, parent?: Workflow)

// Usage examples
const wf1 = new SimpleWorkflow();                              // Default name
const wf2 = new SimpleWorkflow('MyWorkflow');                  // Custom name
const wf3 = new SimpleWorkflow('ChildWorkflow', parentWorkflow); // With parent
```

**Implementation** (Lines 122-125):
```typescript
// Class-based pattern: constructor(name, parent)
this.config = { name: name ?? this.constructor.name };
this.parent = (parentOrExecutor as Workflow) ?? null;
```

### Pattern 2: Functional Constructor

```typescript
// Constructor signature
constructor(config: WorkflowConfig, executor?: WorkflowExecutor)

// Usage examples
const wf1 = new Workflow({ name: 'MyWorkflow' }, async (ctx) => {
  await ctx.step('step1', async () => { /* ... */ });
  return 'done';
});

const wf2 = new Workflow({ name: 'Workflow2' }, async (ctx) => 'result');
```

**Implementation** (Lines 116-120):
```typescript
// Functional pattern: constructor(config, executor)
this.config = name;
this.executor = parentOrExecutor as WorkflowExecutor<T>;
this.parent = null;
```

### Pattern Detection Logic (Lines 116-125)

```typescript
// Parse overloaded arguments
if (typeof name === 'object' && name !== null) {
  // Functional pattern: constructor(config, executor)
  this.config = name;
  this.executor = parentOrExecutor as WorkflowExecutor<T>;
  this.parent = null;
} else {
  // Class-based pattern: constructor(name, parent)
  this.config = { name: name ?? this.constructor.name };
  this.parent = (parentOrExecutor as Workflow) ?? null;
}
```

**Key Insight**: Both patterns normalize to `this.config.name`, so all validation applies identically.

---

## 4. Error Message Constants

### Error Messages to Use in Tests

```typescript
// Empty/whitespace validation
const ERROR_EMPTY = 'Workflow name cannot be empty or whitespace only';

// Length validation
const ERROR_TOO_LONG = 'Workflow name cannot exceed 100 characters';

// Security validation (all security checks use same message)
const ERROR_INVALID_CHARS = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';
```

### When Each Error Is Thrown

| Error | Thrown When | Line |
|-------|-------------|------|
| `ERROR_EMPTY` | `trimmedName.length === 0` | 131 |
| `ERROR_TOO_LONG` | `this.config.name.length > 100` | 134 |
| `ERROR_INVALID_CHARS` | Any security validation fails | 139, 144, 149, 154, 159 |

---

## 5. JSDoc Documentation Patterns

### Constructor JSDoc (Lines 100-111)

```typescript
/**
 * Create a new workflow instance
 *
 * @overload Class-based pattern: constructor(name?: string, parent?: Workflow)
 * @overload Functional pattern: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)
 * @param name For class-based pattern, human-readable name. Allowed characters: alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_). (default: class name).
 * For functional pattern, config object with workflow settings.
 * @param parentOrExecutor For class-based pattern, optional parent workflow.
 * For functional pattern, executor function.
 *
 * @remarks Security validation rejects names containing control characters, HTML tags, JavaScript patterns, path traversal sequences (..), and file system special characters (/ \ : * ? " < > |). This prevents XSS attacks, injection attacks, and path traversal vulnerabilities.
 */
```

### Key JSDoc Elements

1. **`@overload`**: Documents both constructor patterns
2. **`@param`**: Documents allowed characters explicitly
3. **`@remarks`**: Documents security validation and what's rejected
4. **Default behavior**: `(default: class name)` clearly stated

---

## 6. Test Requirements

### Test File Location
- **File**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`
- **Section**: "Workflow Name Validation" (starting at line 13)

### Existing Test Pattern (Lines 13-85)

```typescript
describe('Workflow Name Validation', () => {
  // Empty/whitespace tests
  it('should reject empty string name', () => {
    expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  // Length tests
  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() => new SimpleWorkflow(longName)).toThrow('Workflow name cannot exceed 100 characters');
  });

  // Both constructor patterns
  it('should validate both constructor patterns - class-based with empty name', () => {
    expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should validate both constructor patterns - functional with empty name', () => {
    expect(() => new Workflow({ name: '' }, async () => {})).toThrow('Workflow name cannot be empty or whitespace only');
  });
});
```

### Required Test Coverage for Security Validations

#### 1. Control Character Tests
```typescript
// Test cases needed:
- Null byte: '\x00'
- Control chars: '\x01', '\x02', '\x1F'
- Delete char: '\x7F'
- Mixed: 'Work\x00flow'
- Tab/newline before trim: '\tValid\n' (should pass after trim)
```

#### 2. HTML/JavaScript Injection Tests
```typescript
// Test cases needed:
- Script tags: '<script>alert(1)</script>'
- HTML tags: '<img>', '<div>', '<span>'
- JavaScript protocol: 'javascript:alert(1)'
- Case variants: 'JavaScript:alert(1)', 'JAVASCRIPT:alert(1)'
- Mixed: 'Workflow<script>'
```

#### 3. Path Traversal Tests
```typescript
// Test cases needed:
- Parent dir: '../'
- Backslash parent: '..\\'
- In name: 'My..Workflow'
- Multiple: '../../'
- Mixed: 'Workflow../Child'
```

#### 4. File System Characters Tests
```typescript
// Test cases needed:
- Forward slash: 'My/Workflow'
- Backslash: 'My\\Workflow'
- Colon: 'My:Workflow'
- Asterisk: 'My*Workflow'
- Question mark: 'My?Workflow'
- Quotes: 'My"Workflow', "My'Workflow"
- Angle brackets: 'My<Workflow>', 'My>Workflow'
- Pipe: 'My|Workflow'
- Combined: 'My/Workflow:Test'
```

#### 5. Allowlist Tests
```typescript
// Test cases needed:
- Valid: 'MyWorkflow', 'my-workflow', 'my_workflow', 'my workflow'
- Valid: 'My-Work_Flow 123'
- Invalid special chars: 'My.Workflow', 'My@Workflow', 'My#Workflow'
- Invalid punctuation: 'My,Workflow', 'My;Workflow', 'My!Workflow'
```

#### 6. Both Constructor Patterns
```typescript
// All security tests must verify BOTH patterns:
- Class-based: new SimpleWorkflow(invalidName)
- Functional: new Workflow({ name: invalidName }, async () => {})
```

### Test Helper Class Pattern

```typescript
// From workflow.test.ts lines 4-11
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}
```

---

## 7. Validation Flow Summary

```
Constructor Called (Line 112)
    │
    ├─ Parse Arguments (Lines 116-125)
    │   ├─ Is 'name' an object? → Functional Pattern
    │   └─ Is 'name' string/undefined? → Class-based Pattern
    │
    ├─ Normalize to this.config.name
    │
    └─ Validate Name (Lines 127-161)
        │
        ├─ Is this.config.name a string?
        │   ├─ No → Skip validation
        │   └─ Yes → Continue
        │
        ├─ Trim name: trimmedName = this.config.name.trim()
        │
        ├─ Check 1: Empty? (trimmedName.length === 0)
        │   └─ Yes → Throw ERROR_EMPTY
        │
        ├─ Check 2: Too long? (this.config.name.length > 100)
        │   └─ Yes → Throw ERROR_TOO_LONG
        │
        ├─ Check 3: Control chars? (/[\x00-\x1F\x7F]/)
        │   └─ Yes → Throw ERROR_INVALID_CHARS
        │
        ├─ Check 4: HTML/JS? (/<[^>]*>/ or /javascript:/i)
        │   └─ Yes → Throw ERROR_INVALID_CHARS
        │
        ├─ Check 5: Path traversal? (/\.\./)
        │   └─ Yes → Throw ERROR_INVALID_CHARS
        │
        ├─ Check 6: File system chars? (/[\/\\:*?"<>|]/)
        │   └─ Yes → Throw ERROR_INVALID_CHARS
        │
        ├─ Check 7: Allowlist? (!/^[a-zA-Z0-9 _-]+$/)
        │   └─ Yes → Throw ERROR_INVALID_CHARS
        │
        └─ All checks passed → Create node (Line 164)
```

---

## 8. Key Insights for Test Development

### 1. Validation Uses `trimmedName` for Security Checks
- **Critical**: Lines 129-160 use `trimmedName` (after `.trim()`)
- **Length check exception**: Line 133 uses `this.config.name` (original, not trimmed)
- **Implication**: Leading/trailing whitespace is preserved but not validated for security

### 2. All Security Checks Share Same Error Message
- **Why**: Security best practice (don't reveal which specific check failed)
- **Message**: `'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.'`
- **Test implication**: Cannot distinguish which security pattern triggered the error

### 3. Validation Order Matters
- Empty/whitespace checked first
- Length checked second
- Security patterns checked third
- Tests should verify this ordering when multiple violations exist

### 4. Both Patterns Must Be Tested
- Class-based: `new SimpleWorkflow(name)`
- Functional: `new Workflow({ name }, executor)`
- Each security test case needs both variations

### 5. Edge Cases to Consider
- **Whitespace preservation**: `'  ValidName  '` passes (whitespace not trimmed in stored name)
- **Class name default**: `new SimpleWorkflow()` uses 'SimpleWorkflow' (always valid)
- **Null handling**: `null as any` treated as undefined, uses class name
- **Unicode characters**: Rejected by allowlist (only ASCII a-z, A-Z, 0-9)

---

## 9. Character Set Reference

### Allowed Characters (Allowlist)
```
a-z          (lowercase letters)
A-Z          (uppercase letters)
0-9          (digits)
(space)      (space character)
-            (hyphen/minus)
_            (underscore)
```

### ASCII Control Characters (Rejected)
```
\x00-\x1F    (control characters 0-31)
\x7F         (delete character)
```

### HTML/JS Patterns (Rejected)
```
<[^>]*>      (any HTML tag)
javascript:  (JavaScript protocol, case-insensitive)
```

### Path Traversal (Rejected)
```
..           (double dot, anywhere in string)
```

### File System Characters (Rejected)
```
/ \ : * ? " < > |
```

### Other Invalid Characters (Rejected by Allowlist)
```
. @ # $ % ^ & * ( ) + = { } [ ] | \ : ; ' " < > , ? / ` ~
```

---

## 10. Code Snippets for Test Development

### Test Template for Security Validation

```typescript
describe('Workflow Name Security Validation', () => {
  const ERROR_MSG = 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

  // Helper to test both patterns
  const testBothPatterns = (name: string, expectedError: string) => {
    // Class-based pattern
    expect(() => new SimpleWorkflow(name)).toThrow(expectedError);

    // Functional pattern
    expect(() => new Workflow({ name }, async () => {})).toThrow(expectedError);
  };

  describe('should reject control characters', () => {
    it('null byte', () => {
      testBothPatterns('Work\x00flow', ERROR_MSG);
    });

    it('control characters in range 0x01-0x1F', () => {
      testBothPatterns('Work\x01flow', ERROR_MSG);
      testBothPatterns('Work\x1Fflow', ERROR_MSG);
    });

    it('delete character 0x7F', () => {
      testBothPatterns('Work\x7Fflow', ERROR_MSG);
    });
  });

  describe('should reject HTML/JavaScript injection', () => {
    it('script tags', () => {
      testBothPatterns('<script>alert(1)</script>', ERROR_MSG);
    });

    it('HTML tags', () => {
      testBothPatterns('<img>', ERROR_MSG);
      testBothPatterns('Workflow<div>', ERROR_MSG);
    });

    it('javascript protocol', () => {
      testBothPatterns('javascript:alert(1)', ERROR_MSG);
      testBothPatterns('JavaScript:alert(1)', ERROR_MSG); // case-insensitive
    });
  });

  describe('should reject path traversal', () => {
    it('double dot patterns', () => {
      testBothPatterns('../', ERROR_MSG);
      testBothPatterns('..\\', ERROR_MSG);
      testBothPatterns('My..Workflow', ERROR_MSG);
      testBothPatterns('../../etc/passwd', ERROR_MSG);
    });
  });

  describe('should reject file system characters', () => {
    it.each([
      ['My/Workflow', '/'],
      ['My\\Workflow', '\\'],
      ['My:Workflow', ':'],
      ['My*Workflow', '*'],
      ['My?Workflow', '?'],
      ['My"Workflow', '"'],
      ['My<Workflow>', '<>'],
      ['My|Workflow', '|'],
    ])('rejects %s', (name) => {
      testBothPatterns(name, ERROR_MSG);
    });
  });

  describe('should reject invalid characters (allowlist)', () => {
    it.each([
      ['My.Workflow', '.'],
      ['My@Workflow', '@'],
      ['My#Workflow', '#'],
      ['My$Workflow', '$'],
      ['My%Workflow', '%'],
      ['My&Workflow', '&'],
      ['My+Workflow', '+'],
      ['My=Workflow', '='],
      ['My,Workflow', ','],
      ['My;Workflow', ';'],
    ])('rejects %s', (name) => {
      testBothPatterns(name, ERROR_MSG);
    });
  });

  describe('should accept valid characters', () => {
    it.each([
      ['MyWorkflow'],
      ['my-workflow'],
      ['my_workflow'],
      ['my workflow'],
      ['My-Work_Flow 123'],
      ['Workflow123'],
      ['UPPERCASE'],
      ['lowercase'],
      ['12345'],
      ['Test-Workflow_123 With Spaces'],
    ])('accepts %s', (name) => {
      // Class-based pattern
      const wf1 = new SimpleWorkflow(name);
      expect(wf1.getNode().name).toBe(name);

      // Functional pattern
      const wf2 = new Workflow({ name }, async () => 'done');
      expect(wf2.getNode().name).toBe(name);
    });
  });
});
```

---

## 11. References

### Source Files
- **Workflow Implementation**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Test File**: `/home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts`
- **WorkflowConfig Type**: `/home/dustin/projects/groundswell/src/types/workflow-context.ts` (lines 145-190)

### Related Research Documents
- **Codebase Validation Patterns**: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/research/codebase-validation-patterns.md`
- **Security Validation Research**: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/research/security-validation-research.md`
- **WorkflowError Patterns**: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/research/WorkflowError-patterns.md`

### PRP Reference
- **P3.M1.T3.S1 PRP**: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T3S1/PRP.md`

---

## Summary

This analysis provides:

1. **Exact code implementation** of all validation logic (lines 127-161)
2. **Security validation patterns** with regex patterns and error messages
3. **Both constructor patterns** (class-based and functional) with detection logic
4. **JSDoc documentation** structure and patterns
5. **Test requirements** with specific test cases and code templates
6. **Character set reference** for allowed/rejected characters
7. **Validation flow** with order and error handling
8. **Key insights** for test development (trimmedName usage, shared error messages, etc.)

**Next Step**: Use this analysis to develop comprehensive test suite in P3.M1.T3.S2.

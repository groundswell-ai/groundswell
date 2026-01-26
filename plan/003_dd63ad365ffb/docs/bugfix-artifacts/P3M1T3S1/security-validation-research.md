# Security Validation Research for Workflow Names

## Summary

Comprehensive security best practices for validating workflow names to prevent XSS, injection attacks, and other security vulnerabilities.

## 1. HTML/JavaScript Injection Prevention

### Common XSS Patterns in String Inputs

**Dangerous patterns to detect:**
- `<script>` tags and variations
- Event handlers: `onclick`, `onload`, `onerror`, etc.
- `javascript:` URLs
- CSS expressions: `expression()`
- SVG-based XSS
- Data URIs with malicious content

### Regex Patterns for HTML/JS Injection

```typescript
// Detect HTML tags (comprehensive)
const htmlTagPattern = /<[^>]*>/g;

// Detect script tags specifically
const scriptTagPattern = /<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gis;

// Detect all potentially dangerous HTML tags
const dangerousHtmlPattern = /<\s*(script|iframe|object|embed|link|meta|style|form|input|button)[^>]*>/gi;

// Detect event handlers
const eventHandlerPattern = /on\w+\s*=\s*["']?[^"'\s>]+/gi;

// Detect javascript: protocol (case-insensitive)
const javascriptProtocol = /javascript:\s*/gi;

// Detect dangerous protocols (javascript:, data:, vbscript:)
const dangerousProtocols = /^(javascript|data|vbscript):/gi;
```

### Best Practices

**Primary Defense Strategy (OWASP-recommended):**

1. **Allowlist validation** (preferred approach):
```typescript
function validateWorkflowName(name: string): boolean {
  // Allowlist: alphanumeric, spaces, hyphens, underscores
  const allowedPattern = /^[a-zA-Z0-9 _-]+$/;
  return allowedPattern.test(name);
}
```

2. **Output encoding** (if name is displayed in UI):
```typescript
function encodeForHTML(str: string): string {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag]));
}
```

## 2. Path Traversal Prevention

### Detecting Path Traversal Patterns

```typescript
// Basic path traversal detection
const basicPathTraversal = /\.\.[\/\\]/;

// Comprehensive path traversal pattern
const pathTraversalPattern = /(\.\.[\/\\])|(%2e%2e[\/\\])|(\.\.%2f)|(\.\.%5c)|(%252e%252e[\/\\])/gi;

// Detect encoded variants
const encodedPathTraversal = /(%2e%2e)|(\.\.%2[fF])|(\.\.%5[cC])|(%252e%252e)/gi;

// Detect obfuscated patterns
const obfuscatedPathTraversal = /(\.\.[\/\\]{2,})|([\/\\]\.\.[\/\\])|(\.\.\.)/gi;
```

### Path Traversal Attack Patterns

**Patterns to reject:**
- `../` and `..\` (parent directory)
- `/../` and `\..\` (absolute with parent)
- `....//` (obfuscated parent)
- `..././` (obfuscated parent)
- URL encoded: `%2e%2e`, `%2e%2e%2f`, `%2e%2e%5c`
- Double encoded: `%252e%252e`
- Mixed encoding: `.%2e`, `%2e.`, `..%2f`
- Null bytes: `%00` (string termination attacks)

### Comprehensive Detection Function

```typescript
function detectPathTraversal(input: string): boolean {
  const patterns = [
    /\.\.[\/\\]/,                    // ../ or ..\
    /%2e%2e[\/\\]/i,                // URL-encoded ../
    /\.\.%2[56][fFcC]/,              // Partially encoded
    /%252e%252e/i,                  // Double-encoded
    /\.\.\.%2f/i,                    // Triple dot with encoded slash
    /\.\.[%]2[56][fFcC]/,            // Various encoding combos
    /[\/\\]\.\.[\/\\]/,              // /../ or /..\
    /\.\.\.\//,                      // Obfuscated
    /\x00/,                          // Null byte injection
  ];

  return patterns.some(pattern => pattern.test(input));
}
```

## 3. Control Character Validation

### ASCII Control Characters

**Control characters to validate:**
```
0x00 - Null character
0x01-0x08 - Control characters (SOH, STX, ETX, EOT, ENQ, ACK, BEL, BS)
0x09 - Horizontal tab (often allowed)
0x0A - Line feed (often allowed)
0x0B - Vertical tab
0x0C - Form feed
0x0D - Carriage return (often allowed)
0x0E-0x1F - Control characters
0x7F - Delete character
```

### Why These Are Problematic

**Security Issues:**
- **Log injection**: Control characters can forge log entries
- **String termination**: Null bytes can terminate strings early
- **Format string attacks**: In C/C++ environments
- **Command injection**: In shell contexts

**Data Integrity:**
- **Database corruption**: Can break SQL queries
- **File system issues**: Invalid in filenames
- **Display problems**: Break UI rendering
- **Parsing errors**: Break JSON/XML parsers

### Filtering Patterns

```typescript
// Strict - remove all control characters
function removeControlChars(str: string): string {
  return str.replace(/[\x00-\x1F\x7F]/g, '');
}

// Permissive - allow tab, newline, carriage return
function removeDangerousControlChars(str: string): string {
  // Allow: \t (0x09), \n (0x0A), \r (0x0D)
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Allowlist approach (recommended for workflow names)
function validateControlChars(str: string): boolean {
  // Only allow printable ASCII plus tab, newline, CR
  // For workflow names, we want to be more restrictive
  const validPattern = /^[\x20-\x7E]+$/; // Printable ASCII only
  return validPattern.test(str);
}
```

### Recommended Pattern for Workflow Names

```typescript
// Control character regex from specification
const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/;

function hasControlCharacters(str: string): boolean {
  return CONTROL_CHAR_PATTERN.test(str);
}
```

## 4. Allowed Character Patterns

### Alphanumeric Plus Spaces, Hyphens, Underscores

```typescript
// Basic pattern - alphanumeric, spaces, hyphens, underscores
const basicPattern = /^[a-zA-Z0-9 _-]+$/;

// More restrictive - must start with alphanumeric
const strictPattern = /^[a-zA-Z0-9][a-zA-Z0-9 _-]*[a-zA-Z0-9]$/;

// Allow single spaces only (no consecutive spaces)
const noConsecutiveSpaces = /^[a-zA-Z0-9]+(?:[ _-][a-zA-Z0-9]+)*$/;

// Very restrictive - no spaces, only hyphens and underscores
const identifierPattern = /^[a-zA-Z0-9_-]+$/;
```

### Recommended Pattern for Workflow Names

Based on the contract definition:
- **Allowed characters**: Alphanumeric (a-z, A-Z, 0-9), spaces, hyphens (-), underscores (_)
- **Recommended regex**: `/^[a-zA-Z0-9 _-]+$/`

```typescript
const ALLOWED_CHARS_PATTERN = /^[a-zA-Z0-9 _-]+$/;

function hasOnlyAllowedCharacters(str: string): boolean {
  return ALLOWED_CHARS_PATTERN.test(str);
}
```

### Maximum Length Best Practices

**Recommended length limits:**
- **Minimum**: 1 character (existing code)
- **Maximum**: 100 characters (already enforced in existing code)
- **Optimal**: 30-50 characters (most workflows)

```typescript
const LENGTH_LIMITS = {
  MIN: 1,
  MAX: 100, // Already enforced in existing code
};
```

## 5. Error Message Best Practices

### Security-Focused Error Messages

**Principles:**
1. **Don't reveal internal implementation details**
2. **Don't expose system information**
3. **Be vague about exact validation rules to attackers**
4. **Log detailed errors internally**
5. **Show generic errors to users**

### What to Reveal vs What to Hide

**✓ Safe to reveal:**
- Generic validation requirements
- User-friendly guidance
- Success confirmations
- General error categories

**✗ Never reveal:**
- Stack traces
- File paths
- Database queries
- Internal function names
- Detailed regex patterns
- System architecture details
- Exact character that triggered rejection

### User-Friendly Security Error Messages

```typescript
// Bad - reveals too much
function badValidation(name: string) {
  if (/<script/.test(name)) {
    throw new Error('Input contains <script> tag detected by regex /<script/');
  }
}

// Good - generic and helpful
function goodValidation(name: string) {
  const errors: string[] = [];

  if (/<[^>]*>/.test(name)) {
    errors.push('Invalid characters detected');
  }

  if (/\.\.[\/\\]/.test(name)) {
    errors.push('Invalid path characters');
  }

  if (/[\x00-\x1F\x7F]/.test(name)) {
    errors.push('Invalid special characters');
  }

  if (errors.length > 0) {
    // Log detailed error internally
    console.error('[Security]', 'Workflow name validation failed', { input: name, errors });

    // Return generic error to user
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }
}
```

### Recommended Error Message Pattern

```typescript
// Single, clear error message for all security violations
const SECURITY_ERROR_MESSAGE =
  'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.';

// Or more specific (but still secure) messages
const ERROR_MESSAGES = {
  HTML_TAGS: 'Invalid workflow name. HTML tags are not allowed.',
  JAVASCRIPT: 'Invalid workflow name. JavaScript patterns are not allowed.',
  PATH_TRAVERSAL: 'Invalid workflow name. Path traversal patterns are not allowed.',
  CONTROL_CHARS: 'Invalid workflow name. Special characters are not allowed.',
  INVALID_CHARS: 'Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.',
};
```

## 6. Complete Implementation Example

```typescript
/**
 * Validate workflow name with comprehensive security checks
 * Based on OWASP guidelines and industry standards
 */
function validateWorkflowName(name: string): void {
  // Type check
  if (typeof name !== 'string') {
    throw new Error('Workflow name must be a string');
  }

  // Existing validations (preserve these)
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  if (name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }

  // NEW: Security validations

  // 1. Control characters
  const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/;
  if (CONTROL_CHAR_PATTERN.test(name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // 2. HTML/JavaScript injection patterns
  const HTML_TAG_PATTERN = /<[^>]*>/;
  if (HTML_TAG_PATTERN.test(name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  const JAVASCRIPT_PATTERN = /javascript:/i;
  if (JAVASCRIPT_PATTERN.test(name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // 3. Path traversal patterns
  const PATH_TRAVERSAL_PATTERN = /\.\./;
  if (PATH_TRAVERSAL_PATTERN.test(name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // 4. File system operations (additional safety)
  const FS_PATTERNS = /[\/\\:*?"<>|]/;
  if (FS_PATTERNS.test(name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }

  // 5. Allowed characters (allowlist - final check)
  const ALLOWED_CHARS_PATTERN = /^[a-zA-Z0-9 _-]+$/;
  if (!ALLOWED_CHARS_PATTERN.test(name)) {
    throw new Error('Invalid workflow name. Please use only letters, numbers, spaces, hyphens, and underscores.');
  }
}
```

## 7. Authoritative Sources

### OWASP Cheat Sheets

1. **Cross Site Scripting Prevention Cheat Sheet**
   - URL: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
   - Key insights: Output encoding, allowlist validation, context-aware encoding

2. **Input Validation Cheat Sheet**
   - URL: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
   - Key insights: Allowlist > blacklist, canonicalization, validate at trust boundaries

3. **Path Traversal Cheat Sheet**
   - URL: https://cheatsheetseries.owasp.org/cheatsheets/Path_Traversal_Cheat_Sheet.html
   - Key insights: Detect encoded variants, use path normalization, validate against base directory

### MDN Web Security

1. **MDN Web Security Guide**
   - URL: https://developer.mozilla.org/en-US/docs/Web/Security
   - Key insights: Content Security Policy, secure input handling

2. **Content Security Policy**
   - URL: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
   - Key insights: Defense in depth, limiting attack surface

### Security Libraries

1. **DOMPurify** - HTML sanitization
   - URL: https://github.com/cure53/DOMPurify
   - Use case: If workflow names are ever rendered in HTML context

2. **validator.js** - Input validation
   - URL: https://github.com/validatorjs/validator.js
   - Use case: Additional validation utilities if needed

## 8. Common Pitfalls to Avoid

1. **❌ Relying solely on blacklist validation**
   - Use allowlist instead
   - Blacklists are easily bypassed with encoding variations

2. **❌ Validating but not sanitizing**
   - For this PRP: validation is sufficient (workflow names are internal identifiers)
   - If displayed in UI: use output encoding

3. **❌ Revealing detailed errors**
   - Keep error messages generic
   - Log details internally
   - Don't help attackers understand validation rules

4. **❌ Forgetting to normalize**
   - Normalize before validation (trim, etc.)
   - The existing code already does this

5. **❌ Client-side only validation**
   - This is server-side (library) code - good
   - If a web UI is added, validate server-side too

6. **❌ Using regex for complex security**
   - For this use case, regex is appropriate
   - For more complex scenarios, use established libraries

7. **❌ Over-validating**
   - Don't block legitimate use cases
   - Alphanumeric + space/hyphen/underscore is reasonable for workflow names

## 9. Implementation Summary for P3.M1.T3.S1

### Required Validations (from contract definition)

1. **Control characters**: `/[\x00-\x1F\x7F]/`
2. **HTML/JS injection patterns**: `/<[^>]*>/`, `/javascript:/`
3. **Path traversal**: `/\.\./`
4. **File system operations**: Detect common FS patterns
5. **Allowed characters**: Document in JSDoc (alphanumeric, spaces, hyphens, underscores)

### Error Handling

- Use `throw new Error()` (not `WorkflowError`)
- Use generic, user-friendly error messages
- Don't reveal specific patterns or internal details

### Testing

- Test each validation pattern separately
- Test edge cases (empty strings, null, undefined)
- Test both valid and invalid inputs
- Follow existing test patterns from `workflow.test.ts`

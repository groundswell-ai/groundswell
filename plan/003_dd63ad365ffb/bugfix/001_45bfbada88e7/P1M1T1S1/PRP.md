# PRP: Extend StepOptions Interface with Restart Configuration

---

## Goal

**Feature Goal**: Extend the `StepOptions` interface to support opt-in restart configuration with retry limits, delay, and error-based criteria, enabling parent-driven step restartability per PRD Section 11.

**Deliverable**: Extended `StepOptions` interface in `src/types/decorators.ts` with:
- `restartable?: boolean` (default: false)
- `maxRetries?: number` (default: 3)
- `retryDelayMs?: number` (default: 1000)
- `retryOn?: ErrorCriterion[]` (new discriminated union type)
- `ErrorCriterion` type definition as discriminated union

**Success Definition**:
1. New type definition compiles without errors: `npm run build`
2. Type checking passes: `npm run lint`
3. New types are exported from `src/types/decorators.ts`
4. Backward compatibility maintained - existing `@Step()` usage unchanged
5. Type definition is properly documented with JSDoc comments

---

## Why

- **PRD Compliance**: PRD Section 11 specifies "Restartability is opt-in at the step method level; not global" - this interface extension enables that opt-in mechanism
- **Foundation for Restart Logic**: This type definition is the foundation for implementing restart logic in the `@Step` decorator (future subtask)
- **Type Safety**: Provides compile-time safety for restart configuration options
- **Backward Compatibility**: Optional fields with defaults ensure existing code continues to work

**Integration with Existing Features**:
- Works with existing `WorkflowError` type (`src/types/error.ts`) which already has `recoverable: boolean` field
- Complements existing `ReflectionConfig` pattern (`src/types/reflection.ts`) which uses `maxAttempts` and `retryDelayMs`
- Follows existing `TaskOptions` extension pattern (`src/types/decorators.ts`) which added `errorMergeStrategy` as optional field

**Problems This Solves**:
- Enables step-level restartability declaration (missing from current implementation)
- Provides type-safe error criterion matching for retry decisions
- Establishes contract for future restart implementation

---

## What

### User-Visible Behavior

This PRP is a type definition change only - no runtime behavior changes. Users will be able to write:

```typescript
class MyWorkflow extends Workflow {
  @Step({ restartable: true })
  async retryableStep() { /* ... */ }

  @Step({
    restartable: true,
    maxRetries: 5,
    retryDelayMs: 2000
  })
  async configurableRetryStep() { /* ... */ }

  @Step({
    restartable: true,
    retryOn: [
      { code: 'RATE_LIMIT_EXCEEDED' },
      { recoverable: true },
      (error) => error.message.includes('temporary')
    ]
  })
  async conditionalRetryStep() { /* ... */ }
}
```

### Technical Requirements

1. **Type Definition**: Add 4 new optional fields to `StepOptions` interface
2. **Discriminated Union**: Create `ErrorCriterion` type with 3 variants
3. **JSDoc Documentation**: Document all new types with examples
4. **Export**: Ensure types are exported from `src/types/index.ts`
5. **Backward Compatibility**: All new fields optional with sensible defaults

### Success Criteria

- [ ] TypeScript compiles successfully: `npm run build`
- [ ] Type checking passes: `npm run lint`
- [ ] New types accessible via import: `import type { StepOptions, ErrorCriterion } from './types/index.js'`
- [ ] Existing tests still pass: `npm run test`
- [ ] JSDoc comments present on all new types

---

## All Needed Context

### Context Completeness Check

✓ **Passes "No Prior Knowledge" test**: A developer unfamiliar with the codebase has everything needed to implement this type extension.

✓ **All YAML references are specific and accessible**: All file paths, line numbers, and URLs are provided.

✓ **Implementation tasks include exact naming and placement guidance**: Specific field names, types, defaults, and file locations specified.

✓ **Validation commands are project-specific and verified working**: Using actual npm scripts from package.json.

---

### Documentation & References

```yaml
# MUST READ - PRD Specification
- file: /home/dustin/projects/groundswell/PRD.md
  section: "Section 11: Restart Semantics"
  lines: 608-624
  why: Defines restart behavior requirements - parent-driven, opt-in, three actions (retry/abort/rebuild)
  critical: "Restartability is opt-in at the step method level; not global"

# MUST READ - Existing Type Definition
- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  lines: 1-33
  why: Current StepOptions interface structure - MUST preserve existing fields, follow same pattern
  pattern: "Optional fields with JSDoc comments, camelCase naming"
  gotcha: "TrackTiming defaults to true (not false) - follow pattern of explicit defaults in JSDoc"

# MUST READ - Related Type for ErrorCriterion
- file: /home/dustin/projects/groundswell/src/types/error.ts
  lines: 1-21
  why: WorkflowError interface definition - ErrorCriterion will operate on this type
  pattern: "Comprehensive JSDoc with descriptions for each field"
  critical: "WorkflowError has recoverable: boolean field which matches ErrorCriterion { recoverable: boolean } variant"

# MUST READ - Similar Extension Pattern
- file: /home/dustin/projects/groundswell/src/types/decorators.ts
  lines: 25-32
  why: TaskOptions interface shows how to add optional fields to existing decorator options
  pattern: "errorMergeStrategy?: ErrorMergeStrategy - optional field added after initial interface"
  gotcha: "Follow same JSDoc formatting and import pattern"

# MUST READ - Retry Configuration Pattern
- file: /home/dustin/projects/groundswell/src/types/reflection.ts
  lines: 10-20
  why: ReflectionConfig uses maxAttempts and retryDelayMs - same naming convention for consistency
  pattern: "maxAttempts: number, retryDelayMs?: number"
  gotcha: "Reflection uses 'maxAttempts' but StepOptions uses 'maxRetries' - use maxRetries for clarity in step context"

# MUST READ - Discriminated Union Pattern
- file: /home/dustin/projects/groundswell/src/types/agent.ts
  lines: 360-412
  why: AgentErrorDetails shows error pattern with recoverable field
  pattern: "recoverable: boolean field used as hint for parent workflow retry logic"
  gotcha: "Per PRD 6.2: recoverable is a hint for parent workflow retry logic - same concept applies to ErrorCriterion"

# MUST READ - TypeScript Research
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/research/typescript_patterns.md
  section: "Discriminated Union Fundamentals"
  why: TypeScript best practices for discriminated unions in error handling
  critical: "Function types must come AFTER discriminated objects in union for proper type narrowing"

# MUST READ - Architecture Analysis
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  lines: 1-92
  why: Detailed architecture for restart logic, shows exact type definition needed
  critical: "Lines 75-92 show exact type definition to implement"

# MUST READ - Test Patterns
- file: /home/dustin/projects/groundswell/src/__tests__/unit/decorators.test.ts
  lines: 1-67
  why: Testing pattern for @Step decorator - will need similar tests when implementing runtime logic
  pattern: "Vitest with describe/it, expect().toBeDefined(), expect().toBe()"

# EXTERNAL REFERENCES - TypeScript Documentation
- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
  why: TypeScript type narrowing patterns for discriminated unions
  critical: "Function types in discriminated unions must come last for proper type narrowing"

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#discriminated-unions
  why: Official TypeScript discriminated union documentation
  critical: "Use literal types for discriminants, make discriminants required and unique"
```

---

### Current Codebase Tree

```bash
src/
├── decorators/
│   ├── step.ts          # StepOptions used here (implementation, future task)
│   ├── task.ts          # TaskOptions pattern reference
│   └── index.ts         # Exports Step decorator
├── types/
│   ├── decorators.ts    # TARGET FILE - Extend StepOptions here
│   ├── error.ts         # WorkflowError definition
│   ├── agent.ts         # AgentErrorDetails with recoverable field
│   ├── reflection.ts    # ReflectionConfig with retry pattern
│   └── index.ts         # Re-exports all types
└── __tests__/
    └── unit/
        └── decorators.test.ts  # Test patterns
```

---

### Desired Codebase Tree (changes only)

```bash
src/types/
└── decorators.ts        # MODIFIED - Add ErrorCriterion type, extend StepOptions
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript discriminated union ordering
// Function types MUST come AFTER object types for proper type narrowing
// BAD:
type ErrorCriterion =
  | ((error: WorkflowError) => boolean)
  | { code: string };
// GOOD:
type ErrorCriterion =
  | { code: string }
  | { recoverable: boolean }
  | ((error: WorkflowError) => boolean);

// CRITICAL: Default values convention
// This codebase uses JSDoc comments to document defaults, not TypeScript default values
// Pattern from src/types/decorators.ts line 11:
/** Track and emit step duration (default: true) */
trackTiming?: boolean;

// CRITICAL: Import/export pattern
// All types are re-exported from src/types/index.ts
// New ErrorCriterion type MUST be added to that re-export

// CRITICAL: JSDoc formatting
// Multi-line JSDoc uses @example tags for code examples
// See src/types/agent.ts lines 426-445 for complex JSDoc pattern

// CRITICAL: Naming convention differences
// ReflectionConfig uses "maxAttempts" but StepOptions uses "maxRetries"
// Use "maxRetries" for step context - more explicit and different from reflection

// CRITICAL: WorkflowError.recoverable is required field
// src/types/error.ts line 19 shows: recoverable: boolean (not optional)
// ErrorCriterion { recoverable: boolean } matches this pattern
```

---

## Implementation Blueprint

### Data Models and Structure

**ErrorCriterion Type** - New discriminated union for matching errors:

```typescript
/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. By error code - exact string match
 * 2. By recoverable flag - match any recoverable/non-recoverable error
 * 3. Custom predicate - function that receives WorkflowError and returns boolean
 *
 * @example Error by code
 * ```ts
 * const criterion: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };
 * ```
 *
 * @example Error by recoverable flag
 * ```ts
 * const criterion: ErrorCriterion = { recoverable: true };
 * ```
 *
 * @example Custom predicate
 * ```ts
 * const criterion: ErrorCriterion = (error) =>
 *   error.message.includes('temporary') || error.code === 'TIMEOUT';
 * ```
 */
export type ErrorCriterion =
  | { code: string | RegExp }              // Match by error code (string or regex)
  | { recoverable: boolean }               // Match by recoverable flag
  | ((error: WorkflowError) => boolean);  // Custom predicate function
```

**StepOptions Interface** - Extend existing:

```typescript
export interface StepOptions {
  // EXISTING FIELDS (DO NOT MODIFY)
  /** Custom step name (defaults to method name) */
  name?: string;
  /** If true, capture state snapshot after step completion */
  snapshotState?: boolean;
  /** Track and emit step duration (default: true) */
  trackTiming?: boolean;
  /** If true, log message at step start */
  logStart?: boolean;
  /** If true, log message at step end */
  logFinish?: boolean;

  // NEW FIELDS - Add these after existing fields
  /** If true, step can be restarted on failure (default: false) */
  restartable?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Error criteria that trigger retry attempts */
  retryOn?: ErrorCriterion[];
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE ErrorCriterion type definition
  - IMPLEMENT: ErrorCriterion discriminated union type in src/types/decorators.ts
  - PATTERN: Follow discriminated union pattern - objects first, function last
  - NAMING: PascalCase type name, camelCase properties
  - DOCUMENTATION: Comprehensive JSDoc with @example tags for each variant
  - PLACEMENT: Add before StepOptions interface (line ~18 in current file)
  - DEPENDENCIES: Import WorkflowError type from './error.js'
  - GOTCHA: Function type MUST come last in union for type narrowing

Task 2: EXTEND StepOptions interface
  - IMPLEMENT: Add 4 new optional fields to StepOptions interface
  - PATTERN: Follow existing field pattern (see lines 7-16 of src/types/decorators.ts)
  - NAMING: restartable, maxRetries, retryDelayMs, retryOn (camelCase)
  - DEFAULTS: Document in JSDoc comments (false, 3, 1000, undefined)
  - PLACEMENT: Add after existing fields, maintain alphabetical order of new fields
  - DEPENDENCIES: Requires Task 1 (ErrorCriterion type)
  - PRESERVE: All existing fields and their order
  - GOTCHA: Use "maxRetries" not "maxAttempts" to distinguish from ReflectionConfig

Task 3: VERIFY type exports from src/types/decorators.ts
  - CHECK: ErrorCriterion is exported (should be automatic with 'export type')
  - CHECK: StepOptions export unchanged (already exported)
  - PATTERN: All types in this file use 'export interface' or 'export type'
  - GOTCHA: Type exports are re-exported from src/types/index.ts

Task 4: VERIFY re-export from src/types/index.ts
  - FIND: src/types/index.ts file
  - CHECK: Export pattern uses 'export * from' or named exports
  - ENSURE: New ErrorCriterion type is accessible via import from './types/index.js'
  - PATTERN: See how TaskOptions is exported and follow same pattern
  - GOTCHA: Some exports are explicit, some use wildcard - verify ErrorCriterion is included

Task 5: TYPE CHECKING validation
  - RUN: npm run lint (TypeScript compiler check --noEmit)
  - VERIFY: No type errors in src/types/decorators.ts
  - VERIFY: No import errors (WorkflowError imported correctly)
  - VERIFY: Discriminated union narrows correctly (test with sample usage)
  - EXPECTED: Zero type errors

Task 6: BUILD validation
  - RUN: npm run build (tsc compilation)
  - VERIFY: Declaration files generated correctly (.d.ts)
  - VERIFY: ErrorCriterion type appears in dist/types/decorators.d.ts
  - VERIFY: StepOptions extension appears in declaration file
  - EXPECTED: Clean build with no errors

Task 7: BACKWARD COMPATIBILITY validation
  - VERIFY: Existing @Step() usage patterns still type-check
  - VERIFY: @Step({ trackTiming: true }) still valid
  - VERIFY: @Step() with no options still valid
  - VERIFY: No breaking changes to existing StepOptions interface
  - EXPECTED: All existing code continues to work

Task 8: DOCUMENTATION verification
  - VERIFY: All new types have JSDoc comments
  - VERIFY: JSDoc includes @example tags for ErrorCriterion variants
  - VERIFY: Default values documented in JSDoc
  - PATTERN: Follow JSDoc style from src/types/agent.ts
  - EXPECTED: IDE autocomplete shows helpful documentation
```

---

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Discriminated Union with Type Narrowing
// ============================================================
// CRITICAL: Function types must come LAST in union
// This enables TypeScript to narrow types correctly in conditional checks

// CORRECT pattern (function last):
export type ErrorCriterion =
  | { code: string | RegExp }              // Object type 1
  | { recoverable: boolean }               // Object type 2
  | ((error: WorkflowError) => boolean);  // Function type LAST

// Type narrowing usage:
function matchesCriterion(error: WorkflowError, criterion: ErrorCriterion): boolean {
  // TypeScript can narrow type here because function is last
  if (typeof criterion === 'function') {
    return criterion(error);  // Type narrowed to function
  }
  if ('code' in criterion) {
    return typeof criterion.code === 'string'
      ? error.message === criterion.code
      : criterion.code.test(error.message);
  }
  if ('recoverable' in criterion) {
    return error.recoverable === criterion.recoverable;
  }
  return false;
}

// ============================================================
// PATTERN 2: JSDoc Documentation with Examples
// ============================================================
// Follow pattern from src/types/agent.ts (lines 426-445)

/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. By error code - exact string or regex match
 * 2. By recoverable flag - match recoverable/non-recoverable errors
 * 3. Custom predicate - function for complex matching logic
 *
 * @example Match by error code
 * ```ts
 * const criterion: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };
 * ```
 *
 * @example Match by regex
 * ```ts
 * const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };
 * ```
 *
 * @example Match by recoverable flag
 * ```ts
 * const criterion: ErrorCriterion = { recoverable: true };
 * ```
 *
 * @example Custom predicate
 * ```ts
 * const criterion: ErrorCriterion = (error) =>
 *   error.message.includes('temporary') || error.code === 'TIMEOUT';
 * ```
 */
export type ErrorCriterion = /* ... */

// ============================================================
// PATTERN 3: Interface Extension with Optional Fields
// ============================================================
// Follow pattern from src/types/decorators.ts (lines 25-32)
// Add new fields at end, maintain existing field order

export interface StepOptions {
  // Existing fields - DO NOT MODIFY ORDER
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;

  // New fields - add after existing
  /** If true, step can be restarted on failure (default: false) */
  restartable?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Error criteria that trigger retry attempts (default: all errors if restartable) */
  retryOn?: ErrorCriterion[];
}

// ============================================================
// PATTERN 4: Import Statement Placement
// ============================================================
// Add imports at top of file, maintain existing import order

// Current imports in src/types/decorators.ts:
import type { ErrorMergeStrategy } from './error-strategy.js';

// Add WorkflowError import after existing imports:
import type { ErrorMergeStrategy } from './error-strategy.js';
import type { WorkflowError } from './error.js';  // NEW IMPORT

// ============================================================
// PATTERN 5: Type Export Verification
// ============================================================
// Check src/types/index.ts for export pattern
// Usually uses: export * from './decorators.js';
// This automatically exports ErrorCriterion and StepOptions

// Verify with import in other files:
import type { StepOptions, ErrorCriterion } from './types/index.js';
```

---

### Integration Points

```yaml
NO RUNTIME INTEGRATION - This is a type-only change:
  - No decorator implementation changes (future task)
  - No workflow class changes (future task)
  - No test changes needed (yet - tests will be added when implementing runtime logic)

TYPE SYSTEM INTEGRATION:
  - type: Add ErrorCriterion to src/types/decorators.ts exports
  - type: Import WorkflowError from './error.js' for type annotation
  - type: Verify re-export from src/types/index.ts

BUILD SYSTEM:
  - validation: npm run build must succeed
  - validation: npm run lint must succeed
  - validation: No .d.ts declaration file errors

FUTURE INTEGRATION (not this task):
  - decorator: src/decorators/step.ts will use these types for runtime logic
  - workflow: src/core/workflow.ts may use ErrorCriterion for restart decisions
  - tests: src/__tests__/unit/decorators.test.ts will need tests for restart logic
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after completing implementation - fix before proceeding
npm run lint
# Expected: Zero errors. If errors exist, READ output and fix.
# This runs: tsc --noEmit (TypeScript compiler check)

# Build declaration files
npm run build
# Expected: Clean build, .d.ts files generated in dist/
# Check: dist/types/decorators.d.ts contains ErrorCriterion type

# Verify type exports
grep -r "ErrorCriterion" dist/
# Expected: Type definition appears in declaration files

# Manual type check - create test file to verify type works
echo "import { StepOptions, ErrorCriterion } from './src/types/index.js';" > /tmp/type-test.ts
npx tsc --noEmit /tmp/type-test.ts
# Expected: No import errors
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Note: No NEW tests needed for type-only change
# Existing tests should continue to pass

# Run existing test suite
npm run test
# Expected: All existing tests pass
# Location: src/__tests__/unit/decorators.test.ts

# Verify backward compatibility - existing @Step usage still works
# The test file uses @Step({ trackTiming: true }) - should still compile

# Type-level tests (manual verification in IDE or separate test file):
# 1. @Step() with no options - should work
# 2. @Step({ restartable: true }) - should accept new field
# 3. @Step({ maxRetries: 5 }) - should accept number
# 4. @Step({ retryOn: [{ code: 'ERROR' }] }) - should accept ErrorCriterion[]
# 5. @Step({ restartable: true, maxRetries: 2, retryDelayMs: 500, retryOn: [...] })
```

---

### Level 3: Integration Testing (System Validation)

```bash
# No runtime integration tests needed for type-only change

# Verify types can be imported from main index
cat > /tmp/import-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';
import type { StepOptions, ErrorCriterion } from './src/index.js';

class TestWorkflow extends Workflow {
  @Step({ restartable: true })
  async restartableStep() {}

  @Step({ restartable: true, maxRetries: 5, retryDelayMs: 2000 })
  async configuredStep() {}

  @Step({
    restartable: true,
    retryOn: [
      { code: 'RATE_LIMIT' },
      { recoverable: true },
      (err) => err.message.includes('temp')
    ]
  })
  async conditionalStep() {}

  async run() {}
}
EOF

npx tsc --noEmit /tmp/import-test.ts
# Expected: No type errors, all variants accepted

# Verify backward compatibility
cat > /tmp/compat-test.ts << 'EOF'
import { Workflow, Step } from './src/index.js';

class OldWorkflow extends Workflow {
  @Step()  // No options - should still work
  async noOptionsStep() {}

  @Step({ trackTiming: true })  // Old option - should still work
  async oldOptionsStep() {}

  async run() {}
}
EOF

npx tsc --noEmit /tmp/compat-test.ts
# Expected: No errors, backward compatible
```

---

### Level 4: Creative & Domain-Specific Validation

```bash
# Type-level unit tests for ErrorCriterion discriminated union
cat > /tmp/error-criterion-tests.ts << 'EOF'
import type { WorkflowError } from './src/types/error.js';
import type { ErrorCriterion } from './src/types/decorators.js';

// Test 1: Code criterion (string)
const codeCriterion: ErrorCriterion = { code: 'RATE_LIMIT' };

// Test 2: Code criterion (RegExp)
const regexCriterion: ErrorCriterion = { code: /TIMEOUT|ERROR/ };

// Test 3: Recoverable criterion
const recoverableCriterion: ErrorCriterion = { recoverable: true };

// Test 4: Function criterion
const functionCriterion: ErrorCriterion = (error: WorkflowError) =>
  error.message.includes('temp');

// Test 5: Type narrowing verification
function testNarrowing(criterion: ErrorCriterion, error: WorkflowError): boolean {
  if (typeof criterion === 'function') {
    // TypeScript should know this is a function
    return criterion(error);
  }
  if ('code' in criterion) {
    // TypeScript should know this has 'code' property
    return typeof criterion.code === 'string'
      ? error.message === criterion.code
      : criterion.code.test(error.message);
  }
  if ('recoverable' in criterion) {
    // TypeScript should know this has 'recoverable' property
    return error.recoverable === criterion.recoverable;
  }
  return false;
}

// Test 6: Array of criteria
const criteria: ErrorCriterion[] = [
  { code: 'RATE_LIMIT' },
  { recoverable: true },
  (err) => err.message.includes('timeout')
];
EOF

npx tsc --noEmit /tmp/error-criterion-tests.ts
# Expected: No type errors, all type narrowing works correctly

# Documentation verification
# Open src/types/decorators.ts in IDE and verify:
# 1. Hover over ErrorCriterion shows JSDoc
# 2. Autocomplete shows all variants
# 3. @example tags render correctly
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Type checking passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Existing tests pass: `npm run test`
- [ ] ErrorCriterion type exported and accessible
- [ ] StepOptions extension exported and accessible
- [ ] Discriminated union type narrowing works correctly
- [ ] No import/export errors

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Type definition matches specification exactly
- [ ] JSDoc documentation present with examples
- [ ] Default values documented in comments
- [ ] Backward compatibility verified
- [ ] TypeScript declaration files generated correctly

### Code Quality Validation

- [ ] Follows existing codebase patterns (TaskOptions extension)
- [ ] Type naming convention correct (PascalCase, camelCase)
- [ ] Import statement placement correct
- [ ] JSDoc formatting matches existing style
- [ ] Function type comes last in discriminated union (critical)

### Documentation & Completeness

- [ ] All new types have comprehensive JSDoc
- [ ] JSDoc includes @example tags for each variant
- [ ] Default values clearly documented
- [ ] Type is accessible from main index export
- [ ] IDE autocomplete shows helpful information

---

## Anti-Patterns to Avoid

- ❌ **Don't** modify existing StepOptions fields or their order
- ❌ **Don't** use "maxAttempts" instead of "maxRetries" - be consistent with restart terminology
- ❌ **Don't** put function type before object types in discriminated union - breaks type narrowing
- ❌ **Don't** forget to import WorkflowError type for type annotation
- ❌ **Don't** add runtime implementation in decorator - this is types only
- ❌ **Don't** create tests that test runtime behavior - types can't be tested at runtime
- ❌ **Don't** use `any` type - be specific with discriminated union
- ❌ **Don't** skip JSDoc documentation - types are API, need documentation
- ❌ **Don't** forget to verify re-export from src/types/index.ts
- ❌ **Don't** make fields required - all must be optional for backward compatibility

---

## Confidence Score

**8/10** - One-pass implementation success likelihood is high

**Reasoning**:
- ✅ All required context gathered and documented
- ✅ Specific file paths and line numbers provided
- ✅ Existing patterns identified to follow
- ✅ Validation commands are project-specific
- ✅ Type-only change reduces implementation complexity
- ✅ Backward compatibility requirements clear
- ⚠️ Minor risk: Discriminated union ordering might be missed (documented in gotchas)
- ⚠️ Minor risk: Re-export from index.ts might need verification (documented in tasks)

**Validation**: The completed PRP provides everything needed to implement this type extension successfully. A developer unfamiliar with the codebase can follow the implementation tasks verbatim and produce the correct type definition.

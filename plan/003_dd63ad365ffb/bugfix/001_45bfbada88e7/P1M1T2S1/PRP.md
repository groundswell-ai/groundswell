# Product Requirement Prompt (PRP): Define RestartAnalysis and ErrorCriterion Interfaces

## Goal

**Feature Goal**: Define comprehensive TypeScript interfaces for error analysis and restart decision-making that enable the step decorator retry loop implementation.

**Deliverable**: A new TypeScript file `src/types/restart.ts` containing:
- `RestartAnalysis` interface with complete type definitions
- `ErrorCriterion` discriminated union type with proper TypeScript patterns
- Full JSDoc documentation with usage examples
- Proper exports and integration with existing type system

**Success Definition**:
- Both types are properly defined and exported
- Types are importable by decorator and workflow modules
- All code compiles without TypeScript errors
- JSDoc examples are clear and comprehensive
- Discriminated union follows TypeScript best practices (function types last)

## Why

- **Integration with Step Decorator Retry Logic**: The `@Step` decorator retry loop (P1.M1.T2.S3) requires these interfaces to emit `stepRetry` events with proper type safety
- **Error Analysis Foundation**: Provides the type foundation for parent workflows to analyze errors and make restart decisions per PRD Section 11
- **Type Safety Across Modules**: Multiple modules (decorators, events, workflows) need to share these type definitions
- **Existing Code Already References These Types**: The stepRetry event in `src/types/events.ts` already references `RestartAnalysis`, and the `ErrorCriterion` type is referenced in decorator options

## What

### RestartAnalysis Interface

**Purpose**: Encapsulates the result of error analysis for restart decisions.

**Required Fields**:
```typescript
export interface RestartAnalysis {
  /** Whether the step should be restarted */
  shouldRestart: boolean;

  /** Human-readable reason for the restart decision */
  reason: string;

  /** Suggested action to take */
  suggestedAction: 'retry' | 'abort' | 'rebuild';

  /** Estimated probability of success (0-1) */
  estimatedSuccessProbability: number;
}
```

**Usage Context**: Emitted in `stepRetry` events, returned by error analysis functions, used by retry logic to determine whether to continue retrying.

### ErrorCriterion Discriminated Union

**Purpose**: Defines flexible error matching criteria for conditional retry logic.

**Required Definition**:
```typescript
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code (string or regex)
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate function (must be last)
```

**Critical Constraint**: Function type MUST be last in the discriminated union for proper TypeScript type narrowing.

**Usage Context**: Used in `StepOptions` to specify which errors should trigger retry attempts.

### Success Criteria

- [ ] `src/types/restart.ts` file exists with both types defined
- [ ] `RestartAnalysis` interface has all 4 required fields with correct types
- [ ] `ErrorCriterion` is a proper discriminated union with function type last
- [ ] Both types have comprehensive JSDoc documentation
- [ ] Types are exported from `src/types/index.ts`
- [ ] No TypeScript compilation errors
- [ ] Code follows existing codebase patterns

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

✅ **YES** - This PRP provides:
- Complete interface specifications with field types
- Existing codebase patterns to follow
- File location and structure
- Import/export conventions
- JSDoc documentation patterns
- Validation commands to verify success

### Documentation & References

```yaml
# MUST READ - Critical TypeScript Patterns
- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  why: Understanding type narrowing with discriminated unions
  critical: Function types must be last in discriminated unions for proper narrowing

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
  why: Creating union types and discriminated unions
  critical: Use literal types for discriminants, not generic string

- url: https://basarat.gitbook.io/typescript/type-system/discriminated-unions
  why: Deep dive on discriminated union patterns and best practices
  critical: Shows exhaustive checking patterns with never type

# CODEBASE PATTERNS - Follow These Exactly
- file: src/types/error.ts
  why: Pattern for interface definition with JSDoc comments
  pattern: Brief interface description, field-level JSDoc, clean type structure
  gotcha: Uses `import type` with `.js` extensions for TypeScript imports

- file: src/types/decorators.ts
  why: Example of discriminated union with function type last (ErrorCriterion)
  pattern: Object variants first, function variant last, comprehensive JSDoc with examples
  gotcha: Function type MUST be last - TypeScript cannot narrow when functions have properties

- file: src/types/events.ts
  why: Shows how RestartAnalysis is imported and used in stepRetry event
  pattern: `import type { RestartAnalysis } from './restart.js';`
  gotcha: Must use `.js` extension even in `.ts` files (TS moduleResolution: bundler)

- file: src/types/index.ts
  why: Central export file - add exports here for public API
  pattern: Type exports grouped by category, then value exports
  gotcha: RestartAnalysis already exported at line 10, ErrorCriterion at line 12

- file: src/__tests__/unit/decorators-retry.test.ts
  why: Shows how RestartAnalysis is used in practice for testing
  pattern: Create analysis objects with all fields, verify in event payloads
  gotcha: Tests verify exact structure matches interface definition

# RESEARCH DOCUMENTS - Created for this work item
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M1T1S4/research/typescript-discriminated-unions-2026.md
  why: Comprehensive research on discriminated unions with function types last
  section: "Function Types as Last Element - The Critical Rule"
  critical: Explains WHY function types must be last and how to check at runtime

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/restart_logic_analysis.md
  why: Architecture analysis showing RestartAnalysis as critical gap
  section: "Required Implementation" -> "Error Analysis Utility"
  critical: Shows the exact interface specification from architectural analysis
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── index.ts              # Central export file - already exports these types
│   ├── error.ts              # WorkflowError interface - referenced by ErrorCriterion
│   ├── decorators.ts         # StepOptions, TaskOptions, ErrorCriterion (partial)
│   ├── events.ts             # WorkflowEvent union - references RestartAnalysis
│   ├── logging.ts            # LogEntry type
│   ├── snapshot.ts           # SerializedWorkflowState type
│   └── workflow.ts           # WorkflowNode, WorkflowStatus types
├── decorators/
│   └── step.ts               # @Step decorator - uses ErrorCriterion in StepOptions
└── __tests__/
    └── unit/
        ├── decorators-retry.test.ts    # Tests retry with RestartAnalysis
        └── decorators/step-restart.test.ts
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── types/
│   ├── index.ts              # MODIFICATION: Ensure RestartAnalysis, ErrorCriterion exported
│   └── restart.ts            # NEW FILE: Contains RestartAnalysis and ErrorCriterion definitions
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript import convention - ALWAYS use .js extensions
// This project uses moduleResolution: "bundler" which requires .js extensions
import type { WorkflowError } from './error.js';     // CORRECT
import type { WorkflowError } from './error';        // WRONG - will cause error

// CRITICAL: Function types MUST be last in discriminated unions
// Functions can have properties in JS, breaking discriminant checks
type ErrorCriterion =
  | { code: string }                    // Object variant - check first
  | { recoverable: boolean }            // Object variant - check second
  | ((error: WorkflowError) => boolean); // Function - MUST be last

// At runtime, ALWAYS check for function FIRST before discriminant checks
function matchesCriterion(criteria: ErrorCriterion, error: WorkflowError): boolean {
  if (typeof criteria === 'function') {  // Check function FIRST
    return criteria(error);
  } else if ('code' in criteria) {       // Now safe to use discriminant
    return error.message.includes(criteria.code);
  } else if ('recoverable' in criteria) {
    return error.original?.recoverable === criteria.recoverable;
  }
  return false;
}

// CRITICAL: JSDoc pattern - use multi-line comments with examples
/**
 * Brief one-line description
 *
 * Detailed explanation with markdown formatting
 *
 * @example Basic usage
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: true,
 *   reason: 'Transient error',
 *   suggestedAction: 'retry',
 *   estimatedSuccessProbability: 0.7
 * };
 * ```
 *
 * @remarks Additional implementation notes
 */
export interface RestartAnalysis {
  /** Field description */
  field: Type;
}

// CRITICAL: Type-only imports use 'import type'
import type { WorkflowError } from './error.js';      // Type-only import
import { SomeClass } from './some-module.js';         // Value import
```

## Implementation Blueprint

### Data Models and Structure

**No ORM or database models** - These are pure TypeScript type definitions used for compile-time type checking and runtime value validation.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY src/types/restart.ts file state
  - CHECK: File may already exist with partial or complete definitions
  - IF file exists: Read current state and determine if modifications needed
  - IF file missing: Create new file with proper structure
  - REFERENCE: Git shows src/types/restart.ts exists in recent commits
  - OUTPUT: Clear understanding of what needs to be created vs modified

Task 2: DEFINE RestartAnalysis interface in src/types/restart.ts
  - IMPLEMENT: RestartAnalysis interface with 4 required fields
  - FIELD shouldRestart: boolean (whether to restart the step)
  - FIELD reason: string (human-readable explanation)
  - FIELD suggestedAction: 'retry' | 'abort' | 'rebuild' (literal union type)
  - FIELD estimatedSuccessProbability: number (0-1 range, not enforced at runtime)
  - FOLLOW pattern: src/types/error.ts (interface structure and JSDoc style)
  - DOCUMENT: Add comprehensive JSDoc with @example for each usage scenario
  - EXPORT: Use named export for interface

Task 3: DEFINE ErrorCriterion discriminated union in src/types/restart.ts
  - IMPLEMENT: ErrorCriterion as discriminated union type
  - VARIANT 1: { code: string | RegExp } - match by error code or pattern
  - VARIANT 2: { recoverable: boolean } - match by error recoverable flag
  - VARIANT 3: (error: WorkflowError) => boolean - custom predicate (MUST BE LAST)
  - FOLLOW pattern: src/types/decorators.ts (existing ErrorCriterion pattern)
  - CRITICAL: Function type MUST be last for proper TypeScript narrowing
  - DOCUMENT: Add JSDoc explaining why function is last and runtime checking pattern
  - EXPORT: Use named export for type

Task 4: ADD required imports to src/types/restart.ts
  - IMPORT: WorkflowError type for ErrorCriterion function signature
  - PATTERN: import type { WorkflowError } from './error.js';
  - PLACEMENT: Top of file, before type definitions
  - GOTCHA: Must use .js extension even in .ts files

Task 5: VERIFY exports in src/types/index.ts
  - CHECK: RestartAnalysis and ErrorCriterion are already exported (lines 10, 12)
  - IF missing: Add exports in appropriate sections
  - PATTERN: export type { RestartAnalysis, ErrorCriterion } from './restart.js';
  - PRESERVE: Existing export organization and structure

Task 6: RUN TypeScript compiler validation
  - EXECUTE: pnpm run build or npx tsc --noEmit
  - VERIFY: No type errors in src/types/restart.ts
  - VERIFY: No import/export errors in dependent files
  - CHECK: Decorator files can import and use the new types
  - EXPECTED: Zero TypeScript errors
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN 1: RestartAnalysis Interface Definition
// ============================================================================
// Location: src/types/restart.ts
// Follow: JSDoc style from src/types/error.ts

/**
 * Restart analysis result
 *
 * Provides error classification and restart recommendations for step retry logic.
 * This interface encapsulates the decision-making process for determining whether
 * a failed step should be retried, aborted, or require plan rebuilding.
 *
 * **Probability Interpretation**:
 * - `0.0 - 0.3`: Low success probability - consider abort or rebuild
 * - `0.4 - 0.6`: Moderate probability - retry with caution
 * - `0.7 - 1.0`: High probability - safe to retry
 *
 * @example Transient error - safe to retry
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: true,
 *   reason: 'Network timeout - likely transient',
 *   suggestedAction: 'retry',
 *   estimatedSuccessProbability: 0.8
 * };
 * ```
 *
 * @example Permanent error - should abort
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: false,
 *   reason: 'Invalid API key - authentication will never succeed',
 *   suggestedAction: 'abort',
 *   estimatedSuccessProbability: 0.0
 * };
 * ```
 *
 * @example Recoverable but requires intervention
 * ```ts
 * const analysis: RestartAnalysis = {
 *   shouldRestart: true,
 *   reason: 'Rate limit exceeded - retry after backoff',
 *   suggestedAction: 'retry',
 *   estimatedSuccessProbability: 0.6
 * };
 * ```
 *
 * @see {@link ErrorCriterion} - For defining error matching criteria
 * @remarks Used in stepRetry events and error analysis utilities
 */
export interface RestartAnalysis {
  /** Whether the step should be restarted */
  shouldRestart: boolean;

  /** Human-readable reason for the restart decision */
  reason: string;

  /** Suggested action to take */
  suggestedAction: 'retry' | 'abort' | 'rebuild';

  /** Estimated probability of success (0-1) */
  estimatedSuccessProbability: number;
}

// ============================================================================
// PATTERN 2: ErrorCriterion Discriminated Union Definition
// ============================================================================
// Location: src/types/restart.ts
// Follow: Discriminated union pattern from src/types/decorators.ts
// CRITICAL: Function type MUST be last for proper TypeScript type narrowing

/**
 * Error matching criterion for step restart decisions
 *
 * Supports three patterns for error matching:
 * 1. **By error code** - Exact string match or regex pattern matching
 * 2. **By recoverable flag** - Match recoverable vs non-recoverable errors
 * 3. **Custom predicate** - Function for complex matching logic
 *
 * @example Match by exact error code
 * ```ts
 * const criterion: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };
 * ```
 *
 * @example Match by regex pattern
 * ```ts
 * const criterion: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };
 * ```
 *
 * @example Match by recoverable flag
 * ```ts
 * const criterion: ErrorCriterion = { recoverable: true };
 * ```
 *
 * @example Custom predicate with complex logic
 * ```ts
 * const criterion: ErrorCriterion = (error) => {
 *   const isTemporary = error.message.includes('temporary');
 *   const isTimeout = error.code === 'TIMEOUT';
 *   const hasRetryableStatus = error.original?.status >= 500;
 *   return isTemporary || isTimeout || hasRetryableStatus;
 * };
 * ```
 *
 * @remarks
 * **IMPORTANT**: Function types must come last in the discriminated union for proper
 * TypeScript type narrowing. When checking criteria at runtime, always check
 * `typeof criterion === 'function'` first before discriminant property checks.
 *
 * **Why functions must be last**:
 * In JavaScript, functions can have properties. If a function has a `code` property,
 * the discriminant check `'code' in criterion` would return `true`, causing TypeScript
 * to incorrectly narrow the type. By placing functions last and checking them first
 * at runtime, we ensure type safety.
 *
 * **Runtime checking pattern**:
 * ```ts
 * function matchesCriterion(
 *   criterion: ErrorCriterion,
 *   error: WorkflowError
 * ): boolean {
 *   // Check function FIRST
 *   if (typeof criterion === 'function') {
 *     return criterion(error);
 *   }
 *   // Now safe to use discriminant checks
 *   if ('code' in criterion) {
 *     const codeMatch = criterion.code instanceof RegExp
 *       ? criterion.code.test(error.code || '')
 *       : error.code === criterion.code;
 *     return codeMatch;
 *   }
 *   if ('recoverable' in criterion) {
 *     return error.original?.recoverable === criterion.recoverable;
 *   }
 *   return false;
 * }
 * ```
 *
 * @see {@link RestartAnalysis} - For restart decision result type
 */
export type ErrorCriterion =
  | { code: string | RegExp }               // Match by error code (string or regex)
  | { recoverable: boolean }                // Match by recoverable flag
  | ((error: WorkflowError) => boolean);   // Custom predicate function (must be last)

// ============================================================================
// PATTERN 3: Import Statement
// ============================================================================
// Location: Top of src/types/restart.ts
// CRITICAL: Use .js extension for TypeScript imports

import type { WorkflowError } from './error.js';
import type { SerializedWorkflowState } from './snapshot.js';
import type { LogEntry } from './logging.js';

// ============================================================================
// PATTERN 4: Type Export Verification
// ============================================================================
// Location: src/types/index.ts (lines 10-12)
// NOTE: These exports already exist - verify they remain

// Restart types
export type { RestartAnalysis } from './restart.js';
export type { ErrorCriterion } from './decorators.js';  // May need to update path
```

### Integration Points

```yaml
TYPES:
  - file: src/types/events.ts
    import: "import type { RestartAnalysis } from './restart.js';"
    usage: "stepRetry event includes analysis: RestartAnalysis field"

  - file: src/types/decorators.ts
    import: "import type { ErrorCriterion } from './restart.js';"  # May need updating
    usage: "StepOptions.retryOn?: ErrorCriterion[]"

DECORATORS:
  - file: src/decorators/step.ts
    import: "import type { ErrorCriterion } from '../types/decorators.js';"
    usage: "StepOptions interface uses ErrorCriterion for retryOn field"

EVENTS:
  - file: src/types/events.ts
    import: "import type { RestartAnalysis } from './restart.js';"
    usage: "stepRetry event type includes analysis field"

TESTS:
  - file: src/__tests__/unit/decorators-retry.test.ts
    import: "import type { RestartAnalysis } from '../../types/restart.js';"
    usage: "Test helpers create RestartAnalysis objects for verification"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
pnpm run build

# Expected: Zero compilation errors
# If errors exist, READ output and fix before proceeding

# Type checking without emitting files
npx tsc --noEmit

# Expected: Zero type errors
# Common issues to check:
# - Missing imports (WorkflowError, SerializedWorkflowState, LogEntry)
# - Wrong import paths (missing .js extensions)
# - Type mismatches in RestartAnalysis fields

# Linting check (if project uses ESLint)
pnpm run lint 2>/dev/null || echo "No lint script configured"

# Expected: Zero linting errors
# Check for:
# - Unused imports
# - Inconsistent JSDoc formatting
# - Missing type annotations
```

### Level 2: Type Usage Validation (Component Validation)

```bash
# Verify types can be imported in dependent files
# Create a temporary test file to validate imports
cat > /tmp/test-imports.ts << 'EOF'
import type { RestartAnalysis, ErrorCriterion } from './src/types/restart.js';
import type { WorkflowError } from './src/types/error.js';

// Test RestartAnalysis can be instantiated
const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Test',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.5
};

// Test ErrorCriterion variants work
const criterion1: ErrorCriterion = { code: 'TEST_ERROR' };
const criterion2: ErrorCriterion = { code: /TIMEOUT|NETWORK/ };
const criterion3: ErrorCriterion = { recoverable: true };
const criterion4: ErrorCriterion = (error: WorkflowError) => true;

// Test function type narrowing works
function checkCriterion(criterion: ErrorCriterion, error: WorkflowError): boolean {
  if (typeof criterion === 'function') {
    return criterion(error);
  } else if ('code' in criterion) {
    return true;
  }
  return false;
}

console.log('Imports and types work correctly');
EOF

# Compile the test file
npx tsc /tmp/test-imports.ts --noEmit

# Expected: Zero errors
# If errors occur, check type definitions and imports
rm /tmp/test-imports.ts

# Verify exports from index.ts
cat > /tmp/test-exports.ts << 'EOF'
import type {
  RestartAnalysis,
  ErrorCriterion
} from './src/types/index.js';

const analysis: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Test',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.5
};

const criterion: ErrorCriterion = { code: 'TEST' };
console.log('Exports work correctly');
EOF

npx tsc /tmp/test-exports.ts --noEmit
rm /tmp/test-exports.ts

# Expected: Zero errors
# If errors occur, verify exports in src/types/index.ts
```

### Level 3: Integration Testing (System Validation)

```bash
# Build the entire project
pnpm run build

# Verify no downstream compilation errors
# These files import the types:
# - src/types/events.ts (imports RestartAnalysis)
# - src/types/decorators.ts (uses ErrorCriterion)
# - src/decorators/step.ts (uses StepOptions with ErrorCriterion)

# Run existing tests to ensure no regressions
pnpm test -- src/__tests__/unit/decorators-retry.test.ts

# Expected: All tests pass
# These tests create RestartAnalysis objects and verify event emissions

# Run type tests if they exist
pnpm test -- src/__tests__/types/ 2>/dev/null || echo "No type tests found"

# Expected: All type tests pass
```

### Level 4: Documentation & Usage Examples

```bash
# Verify JSDoc examples are valid TypeScript
# Extract code blocks from JSDoc and test compilation

# For RestartAnalysis:
cat > /tmp/jsdoc-test.ts << 'EOF'
import type { RestartAnalysis } from './src/types/restart.js';

// Example from JSDoc - Transient error
const analysis1: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Network timeout - likely transient',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.8
};

// Example from JSDoc - Permanent error
const analysis2: RestartAnalysis = {
  shouldRestart: false,
  reason: 'Invalid API key - authentication will never succeed',
  suggestedAction: 'abort',
  estimatedSuccessProbability: 0.0
};

// Example from JSDoc - Recoverable with intervention
const analysis3: RestartAnalysis = {
  shouldRestart: true,
  reason: 'Rate limit exceeded - retry after backoff',
  suggestedAction: 'retry',
  estimatedSuccessProbability: 0.6
};
EOF

npx tsc /tmp/jsdoc-test.ts --noEmit
rm /tmp/jsdoc-test.ts

# Expected: Zero errors
# If errors occur, JSDoc examples don't match type definition

# For ErrorCriterion:
cat > /tmp/jsdoc-test2.ts << 'EOF'
import type { ErrorCriterion } from './src/types/restart.js';
import type { WorkflowError } from './src/types/error.js';

// Example from JSDoc - Exact code match
const criterion1: ErrorCriterion = { code: 'RATE_LIMIT_EXCEEDED' };

// Example from JSDoc - Regex pattern
const criterion2: ErrorCriterion = { code: /TIMEOUT|NETWORK_ERROR/ };

// Example from JSDoc - Recoverable flag
const criterion3: ErrorCriterion = { recoverable: true };

// Example from JSDoc - Custom predicate
const criterion4: ErrorCriterion = (error: WorkflowError) => {
  const isTemporary = error.message.includes('temporary');
  const isTimeout = error.code === 'TIMEOUT';
  return isTemporary || isTimeout;
};
EOF

npx tsc /tmp/jsdoc-test2.ts --noEmit
rm /tmp/jsdoc-test2.ts

# Expected: Zero errors
# If errors occur, JSDoc examples don't match type definition
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] No TypeScript compilation errors: `pnpm run build`
- [ ] No type errors in test imports: `npx tsc --noEmit`
- [ ] All existing tests still pass: `pnpm test`
- [ ] JSDoc examples compile without errors

### Feature Validation

- [ ] RestartAnalysis has all 4 required fields with correct types
  - [ ] `shouldRestart: boolean`
  - [ ] `reason: string`
  - [ ] `suggestedAction: 'retry' | 'abort' | 'rebuild'`
  - [ ] `estimatedSuccessProbability: number`
- [ ] ErrorCriterion is a proper discriminated union
  - [ ] Variant 1: `{ code: string | RegExp }`
  - [ ] Variant 2: `{ recoverable: boolean }`
  - [ ] Variant 3: `(error: WorkflowError) => boolean` (last)
- [ ] Both types have comprehensive JSDoc documentation
- [ ] Types are exported from src/types/index.ts
- [ ] All dependent files can import and use the types

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches src/types/error.ts style)
- [ ] File structure matches desired codebase tree
- [ ] Import statements use `.js` extensions
- [ ] JSDoc includes @example tags for each usage scenario
- [ ] Discriminated union has function type last with explanation
- [ ] No anti-patterns from below section

### Documentation & Deployment

- [ ] Code is self-documenting with clear field names
- [ ] JSDoc explains "why" not just "what"
- [ ] Examples are practical and cover real use cases
- [ ] Runtime checking pattern documented for ErrorCriterion
- [ ] Type exports are organized in src/types/index.ts

## Anti-Patterns to Avoid

- ❌ **Don't put function type first** in ErrorCriterion union - breaks TypeScript type narrowing
- ❌ **Don't skip JSDoc examples** - consumers need to understand how to use these types
- ❌ **Don't forget .js extensions** in imports - this project uses moduleResolution: "bundler"
- ❌ **Don't use `string` instead of literal unions** for `suggestedAction` - use `'retry' | 'abort' | 'rebuild'`
- ❌ **Don't add runtime validation** for `estimatedSuccessProbability` range - TypeScript doesn't enforce at runtime
- ❌ **Don't export from wrong file** - types go in src/types/, not src/decorators/
- ❌ **Don't mix type and value exports** - use `export type` for types, `export` for values
- ❌ **Don't skip documenting the function-last pattern** - future maintainers need to understand why
- ❌ **Don't create circular dependencies** - restart.ts imports from error.ts, not vice versa
- ❌ **Don't forget to update src/types/index.ts** - centralized exports are required for public API

---

## Confidence Score

**9/10** for one-pass implementation success

**Rationale**:
- ✅ Complete type specifications provided
- ✅ Existing codebase patterns identified
- ✅ Comprehensive JSDoc examples included
- ✅ All validation commands specified
- ✅ Critical gotchas documented (function-last pattern)
- ✅ File location and structure clear
- ⚠️ Minor uncertainty: File may already exist (needs verification during Task 1)

**Risk Mitigation**:
- Task 1 explicitly checks for existing file state
- Validation includes checking for conflicts with existing definitions
- Anti-patterns section warns against common mistakes

# PRP: P1.M2.T2.S1 - Add errorMergeStrategy to TaskOptions Interface

---

## Goal

**Feature Goal**: Extend the `TaskOptions` interface to include `errorMergeStrategy?: ErrorMergeStrategy` field, enabling configuration of concurrent error aggregation behavior in the @Task decorator.

**Deliverable**: Modified `src/types/decorators.ts` with:
1. Import statement for `ErrorMergeStrategy` type
2. New optional `errorMergeStrategy` field added to `TaskOptions` interface
3. TypeScript compilation successful with no type errors

**Success Definition**:
- TypeScript compiler (`tsc --noEmit`) completes without errors
- `TaskOptions` interface includes the new field with correct type annotation
- Export of `TaskOptions` from `src/types/index.ts` continues to work
- The field is properly optional (can be omitted when using @Task decorator)

---

## User Persona (if applicable)

**Target User**: Library Developer / Architect

**Use Case**: A developer implementing concurrent workflow tasks needs to configure how multiple errors from failed concurrent operations should be merged and propagated.

**User Journey**:
1. Developer reads @Task decorator documentation
2. Developer discovers `errorMergeStrategy` option in TaskOptions
3. Developer passes `errorMergeStrategy` configuration to @Task decorator
4. Concurrent task failures are aggregated according to the specified strategy

**Pain Points Addressed**:
- Currently no way to configure error merging for concurrent tasks
- ErrorMergeStrategy type exists but is completely unused (zero imports in codebase)
- Developers cannot opt-in to multi-error aggregation behavior

---

## Why

- **Architectural Foundation**: This change enables P1.M2.T2.S2 (implement error aggregation logic in @Task decorator). Without this field, there is no configuration hook to pass ErrorMergeStrategy into the decorator.
- **PRD Compliance**: PRD Section 10 specifies "Optional Multi-Error Merging" as a feature. The type exists but has no implementation path.
- **Backward Compatibility**: Adding an optional field maintains existing behavior (undefined = default behavior unchanged) while enabling future functionality.
- **Dependency Chain**: This is the first subtask in P1.M2.T2, the parent task depends on this interface change being complete before error aggregation logic can be implemented.

---

## What

Add `errorMergeStrategy?: ErrorMergeStrategy` field to the `TaskOptions` interface in `src/types/decorators.ts`.

### Current State
```typescript
// src/types/decorators.ts
export interface TaskOptions {
  /** Custom task name (defaults to method name) */
  name?: string;
  /** If true, run returned workflows concurrently */
  concurrent?: boolean;
}
```

### Target State
```typescript
// src/types/decorators.ts
import type { ErrorMergeStrategy } from './error-strategy.js';

export interface TaskOptions {
  /** Custom task name (defaults to method name) */
  name?: string;
  /** If true, run returned workflows concurrently */
  concurrent?: boolean;
  /** Strategy for merging errors from concurrent task execution */
  errorMergeStrategy?: ErrorMergeStrategy;
}
```

### Success Criteria

- [ ] `import type { ErrorMergeStrategy } from './error-strategy.js';` added at top of file
- [ ] `errorMergeStrategy?: ErrorMergeStrategy;` field added to TaskOptions interface
- [ ] Field placed after `concurrent` (maintains logical ordering)
- [ ] JSDoc comment included: `/** Strategy for merging errors from concurrent task execution */`
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] No linting errors: `npm run lint` (if available)
- [ ] Export verification: `TaskOptions` still exports correctly from `src/types/index.ts`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

- [X] Exact file path and current content of target file (`src/types/decorators.ts`)
- [X] Exact definition of type to import (`ErrorMergeStrategy` from `src/types/error-strategy.ts`)
- [X] Import syntax pattern used in codebase (`import type` with `.js` extension)
- [X] JSDoc comment formatting pattern from existing code
- [X] Validation commands that work in this project

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- file: src/types/decorators.ts
  why: Target file to modify - contains TaskOptions interface that needs the new field
  pattern: Interface definition with optional fields using `?` syntax, JSDoc comments above each field
  gotcha: File uses no imports currently - this will be the first import added
  current_content: |
    export interface StepOptions {
      name?: string;
      snapshotState?: boolean;
      trackTiming?: boolean;
      logStart?: boolean;
      logFinish?: boolean;
    }

    export interface TaskOptions {
      name?: string;
      concurrent?: boolean;
    }

- file: src/types/error-strategy.ts
  why: Contains the ErrorMergeStrategy interface definition that needs to be imported
  pattern: Type-only import with `.js` extension (TypeScript module resolution)
  gotcha: The file itself imports WorkflowError from './error.js'
  current_content: |
    import type { WorkflowError } from './error.js';

    export interface ErrorMergeStrategy {
      /** Enable error merging (default: false, first error wins) */
      enabled: boolean;
      /** Maximum depth to merge errors */
      maxMergeDepth?: number;
      /** Custom function to combine multiple errors */
      combine?(errors: WorkflowError[]): WorkflowError;
    }

- file: src/types/index.ts
  why: Central export barrel - verify TaskOptions export continues to work
  pattern: Re-exports using `export type { TaskOptions } from './decorators.js';`
  gotcha: This file already exports both StepOptions and TaskOptions from decorators.ts

- docfile: plan/001_d3bb02af4886/bugfix/architecture/error_handling_patterns.md
  why: Architectural context explaining why ErrorMergeStrategy exists but isn't used
  section: Lines 101-105 ("Status: Defined But Unused"), Lines 163-168 ("Recommended Extension")
  critical: |
    - ErrorMergeStrategy is exported from src/index.ts
    - ZERO imports anywhere in implementation files
    - Only appears in type definitions and documentation
    - TaskOptions interface does not include errorMergeStrategy property
    - @Task decorator has no way to receive ErrorMergeStrategy configuration

- url: https://www.typescriptlang.org/docs/handbook/2/objects.html#optional-properties
  why: TypeScript official documentation on optional properties syntax
  section: Optional Properties section
  critical: Use `propertyName?: Type` syntax for optional fields

- url: https://www.typescriptlang.org/docs/handbook/modules.html#importing-types
  why: TypeScript official documentation on type-only imports
  section: Importing Types section
  critical: Use `import type { TypeName } from './module.js';` for type-only imports

- file: src/types/workflow-context.ts
  why: Example of proper type import pattern in codebase
  pattern: Lines 8-9 show `import type { WorkflowNode } from './workflow.js';`
  gotcha: All type imports in this codebase use `.js` extension (TypeScript module resolution to .js files)

- file: src/types/agent.ts
  why: Example of optional configuration interface pattern similar to TaskOptions
  pattern: AgentConfig interface shows multiple optional boolean and complex type fields
  gotcha: Optional fields for feature flags and configuration options follow consistent naming
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── plan/
│   └── 001_d3bb02af4886/
│       └── bugfix/
│           └── 001_e8e04329daf3/
│               ├── architecture/
│               │   └── error_handling_patterns.md      # READ: Architectural context
│               ├── P1M2T2S1/
│               │   ├── research/                        # External research storage
│               │   └── PRP.md                          # ← CREATE THIS FILE
│               └── docs/
├── src/
│   ├── types/
│   │   ├── decorators.ts                               # ← MODIFY: Add field here
│   │   ├── error-strategy.ts                           # READ: ErrorMergeStrategy definition
│   │   ├── error.ts                                    # REFERENCE: WorkflowError type
│   │   └── index.ts                                    # VERIFY: Export still works
│   ├── decorators/
│   │   └── task.ts                                     # FUTURE: Will use this field (P1.M2.T2.S2)
└── tsconfig.json                                       # REFERENCE: TypeScript config
```

### Desired Codebase Tree with Files to be Modified

```bash
# No new files - modification only
# Modified: src/types/decorators.ts
#   - Add: import type { ErrorMergeStrategy } from './error-strategy.js';
#   - Add: errorMergeStrategy?: ErrorMergeStrategy; field to TaskOptions interface
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript Module Resolution
// This codebase uses .js extensions in import statements even though source files are .ts
// This is because TypeScript compiles to .js and the import paths reflect the output structure
// WRONG: import type { ErrorMergeStrategy } from './error-strategy';
// CORRECT: import type { ErrorMergeStrategy } from './error-strategy.js';

// CRITICAL: Type-Only Imports
// This codebase consistently uses 'import type' for type imports, not regular imports
// WRONG: import { ErrorMergeStrategy } from './error-strategy.js';
// CORRECT: import type { ErrorMergeStrategy } from './error-strategy.js';

// CRITICAL: No Interface Extension Pattern
// This codebase does NOT use 'interface Child extends Parent'
// Types remain independent and reference each other through imports
// This avoids circular dependencies in complex type graphs

// CRITICAL: JSDoc Comment Format
// Each field in the interface has a JSDoc comment above it
// Use /** ... */ syntax (not // comments)
// Comment format: /** [Brief description of what the field does] */

// CRITICAL: Optional Field Ordering
// Existing TaskOptions fields: name, concurrent
// Add new field after existing fields (maintains append pattern)
// Keep related fields grouped (errorMergeStrategy relates to concurrent)

// CRITICAL: This File Currently Has No Imports
// src/types/decorators.ts is standalone - this will be its FIRST import
// Verify the import is placed at the very top of the file, before any interface definitions
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed. Using existing types:
- `ErrorMergeStrategy` from `src/types/error-strategy.ts` (already defined)
- `TaskOptions` from `src/types/decorators.ts` (being extended)

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD import statement to src/types/decorators.ts
  - ADD: import type { ErrorMergeStrategy } from './error-strategy.js';
  - PLACEMENT: Top of file, before any interface definitions
  - PATTERN: Follow src/types/workflow-context.ts import pattern (lines 8-9)
  - SYNTAX: Use 'import type' for type-only import
  - EXTENSION: Must use '.js' extension (TypeScript module resolution)
  - DEPENDENCIES: None (first task)

Task 2: MODIFY TaskOptions interface in src/types/decorators.ts
  - ADD: errorMergeStrategy?: ErrorMergeStrategy; field
  - PLACEMENT: After 'concurrent?: boolean;' field
  - JSDOC: /** Strategy for merging errors from concurrent task execution */
  - PATTERN: Follow existing field format (name + JSDoc above, same indentation)
  - TYPE: ErrorMergeStrategy (imported in Task 1)
  - OPTIONAL: Use '?' to make field optional (backward compatibility)
  - DEPENDENCIES: Task 1 must complete first

Task 3: VERIFY TypeScript compilation
  - RUN: npx tsc --noEmit
  - EXPECTED: No errors, clean compilation
  - VERIFY: TaskOptions type includes new field
  - DEPENDENCIES: Task 1 and Task 2 complete
```

### Implementation Patterns & Key Details

```typescript
// FILE: src/types/decorators.ts
// This is the complete target file after modification

// ============================================================================
// IMPORTS (new - this file previously had no imports)
// ============================================================================
import type { ErrorMergeStrategy } from './error-strategy.js';

// ============================================================================
// STEP OPTIONS (unchanged - for reference)
// ============================================================================
/**
 * Configuration options for @Step decorator
 */
export interface StepOptions {
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
}

// ============================================================================
// TASK OPTIONS (modified - new field added)
// ============================================================================
/**
 * Configuration options for @Task decorator
 *
 * @note The decorator uses lenient validation - non-Workflow returns are
 *       silently skipped. See the @Task decorator JSDoc for details.
 */
export interface TaskOptions {
  /** Custom task name (defaults to method name) */
  name?: string;
  /** If true, run returned workflows concurrently */
  concurrent?: boolean;
  /** Strategy for merging errors from concurrent task execution */
  errorMergeStrategy?: ErrorMergeStrategy;
}

// ============================================================================
// PATTERN NOTES
// ============================================================================
// 1. Import is type-only: 'import type { ... }'
// 2. Import uses .js extension: './error-strategy.js'
// 3. Import is at top of file, before any code
// 4. New field uses '?' for optional
// 5. New field has JSDoc comment above (same format as other fields)
// 6. New field placed after existing fields (append pattern)
// 7. Indentation matches existing code (2 spaces)
```

### Integration Points

```yaml
TYPE_SYSTEM:
  - verify: "TaskOptions export from src/types/index.ts still works"
  - verify: "TypeScript compiler recognizes the new field"
  - verify: "Type inference works when using @Task decorator with new option"

FUTURE_INTEGRATION:
  - reference: "src/decorators/task.ts will read this field in P1.M2.T2.S2"
  - reference: "ErrorMergeStrategy.combine() will be called during error aggregation"
  - reference: "Promise.allSettled implementation will check this field (P1.M2.T1.S2)"
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file modification - fix before proceeding

# TypeScript type checking
npx tsc --noEmit

# Expected: Zero errors. Output should be silent with exit code 0.

# If you see errors like:
# - "Cannot find module './error-strategy.js'" → Check the import path and .js extension
# - "Duplicate identifier" → Check for accidental duplicate field or interface declaration
# - "Property 'errorMergeStrategy' does not exist" → Check field name and type spelling

# Linting (if project has linting configured)
npm run lint 2>/dev/null || npx eslint src/types/decorators.ts 2>/dev/null || echo "No linter configured"

# Expected: Zero linting errors. If ESLint is configured, it should pass.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Verify TaskOptions type exports correctly
node -e "
const ts = require('typescript');
const program = ts.createProgram('./src/types/decorators.ts', { module: ts.ModuleKind.ESNext });
const source = program.getSourceFile('./src/types/decorators.ts');
console.log('File parsed successfully');
console.log('Exports:', source.statements.filter(s => s.modifiers?.some(m => m.kind === 83)).map(s => s.name.text));
" 2>/dev/null || echo "TypeScript API test skipped"

# Manual type verification using TypeScript compiler API
cat > /tmp/test-taskoptions-type.ts << 'EOF'
import type { TaskOptions } from './src/types/decorators.js';
import type { ErrorMergeStrategy } from './src/types/error-strategy.js';

// This should compile without errors
const options1: TaskOptions = {};
const options2: TaskOptions = { name: 'myTask' };
const options3: TaskOptions = { concurrent: true };
const options4: TaskOptions = { errorMergeStrategy: { enabled: true } };
const options5: TaskOptions = {
  name: 'myTask',
  concurrent: true,
  errorMergeStrategy: {
    enabled: true,
    maxMergeDepth: 5,
    combine: (errors) => errors[0]
  }
};

// This should fail type checking (uncomment to verify error handling)
// const invalid: TaskOptions = { errorMergeStrategy: 'not an object' };

console.log('All type checks passed!');
EOF

npx tsc --noEmit /tmp/test-taskoptions-type.ts

# Expected: Zero errors. All test cases should compile successfully.
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify export chain from src/types/index.ts
cat > /tmp/test-export.ts << 'EOF'
// Test that TaskOptions still exports correctly
import type { TaskOptions } from './src/types/index.js';

const test: TaskOptions = {
  concurrent: true,
  errorMergeStrategy: { enabled: true }
};

console.log('TaskOptions export verified:', test);
EOF

npx tsc --noEmit /tmp/test-export.ts

# Expected: Zero errors. Export chain should work.

# Verify no breaking changes to existing code
# (This ensures backward compatibility - existing @Task usage still works)
grep -r "@Task" src/ --include="*.ts" | grep -v "node_modules" | head -5

# Expected: Existing @Task decorator usage should still be valid.
# The new field is optional, so all existing usage is unaffected.
```

### Level 4: Domain-Specific Validation

```bash
# Type shape verification - ensure ErrorMergeStrategy type is correctly imported
cat > /tmp/test-type-shape.ts << 'EOF'
import type { TaskOptions } from './src/types/decorators.js';
import type { ErrorMergeStrategy } from './src/types/error-strategy.js';

// Verify the type shape matches expectations
const testStrategy: ErrorMergeStrategy = {
  enabled: true,
  maxMergeDepth: 10,
  combine: (errors) => errors[0]
};

const testOptions: TaskOptions = {
  errorMergeStrategy: testStrategy
};

// Type-level test: ensure the field is actually optional
const optionalTest: TaskOptions = {}; // Should work - all fields optional

console.log('Type shape verification passed');
EOF

npx tsc --noEmit /tmp/test-type-shape.ts

# Expected: Zero errors. Type shape should match ErrorMergeStrategy interface.

# Verify module resolution (the .js extension in imports)
node -e "console.log('Module resolution test: OK')" 2>/dev/null

# Check for any circular dependency issues
npx tsc --noEmit --listFiles /tmp/test-type-shape.ts 2>&1 | grep -i "circular\|cycle" || echo "No circular dependencies detected"

# Expected: No circular dependency warnings.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit` (zero errors)
- [ ] Import statement uses `import type` syntax (not regular import)
- [ ] Import statement uses `.js` extension (not `.ts`)
- [ ] Field is optional (`errorMergeStrategy?: ErrorMergeStrategy`)
- [ ] Field type is `ErrorMergeStrategy` (exact interface name)
- [ ] JSDoc comment included above the field
- [ ] Export from `src/types/index.ts` still works
- [ ] No circular dependencies introduced

### Feature Validation

- [ ] `TaskOptions` interface has exactly 3 fields: name, concurrent, errorMergeStrategy
- [ ] Field ordering is logical (errorMergeStrategy after concurrent)
- [ ] All existing @Task decorator usage still compiles (backward compatibility)
- [ ] New field can be used with ErrorMergeStrategy objects
- [ ] Type inference works correctly when field is provided

### Code Quality Validation

- [ ] Follows existing codebase patterns (JSDoc format, indentation, naming)
- [ ] File placement unchanged (still in src/types/decorators.ts)
- [ ] No additional changes beyond the specified field and import
- [ ] No anti-patterns introduced (no interface extension, no circular deps)

### Documentation & Deployment

- [ ] PRP is self-documenting with clear step-by-step instructions
- [ ] All file references include exact paths
- [ ] All gotchas are documented for future reference
- [ ] Validation commands are project-specific and executable

---

## Anti-Patterns to Avoid

- ❌ **Don't use regular import**: Use `import type { ErrorMergeStrategy }` not `import { ErrorMergeStrategy }`
- ❌ **Don't use .ts extension**: Use `./error-strategy.js` not `./error-strategy.ts` in imports
- ❌ **Don't make field required**: Use `errorMergeStrategy?:` not `errorMergeStrategy:` (must be optional for backward compatibility)
- ❌ **Don't skip JSDoc**: Add comment above the field like other fields have
- ❌ **Don't use interface extension**: Don't do `interface ExtendedTaskOptions extends TaskOptions` - modify TaskOptions directly
- ❌ **Don't place import in middle of file**: Import must be at top of file, before interface definitions
- ❌ **Don't change existing fields**: Only add the new field, don't modify name or concurrent fields
- ❌ **Don't forget .js extension**: TypeScript module resolution requires .js in source imports

---

## Success Metrics

**Confidence Score**: 10/10

**Validation Rationale**:
1. **Single File Modification**: Only one file needs changes (`src/types/decorators.ts`)
2. **Simple Change**: Add import + add field (2 lines of code)
3. **Clear Type Definition**: ErrorMergeStrategy is already well-defined
4. **No Runtime Impact**: This is a type-only change, no runtime behavior changes
5. **Backward Compatible**: Optional field means all existing code continues to work
6. **Well-Researched**: All patterns and gotchas documented from codebase analysis
7. **Clear Validation**: TypeScript compiler provides immediate feedback

**One-Pass Implementation Success Factors**:
- Exact file path and current content provided
- Exact type definition to import provided
- Import syntax pattern documented with examples
- JSDoc format pattern documented
- Validation commands that work in this project
- All gotchas documented (module resolution, type-only imports, no extension pattern)
- Success criteria is specific and measurable

# Product Requirement Prompt (PRP): Extend WorkflowConfig with errorMergeStrategy

---

## Goal

**Feature Goal**: Extend the `WorkflowConfig` interface to support optional error merge strategy configuration, enabling workflow-level error handling configuration (currently only available at @Task decorator level).

**Deliverable**: Extended `WorkflowConfig` interface in `src/types/workflow-context.ts` with `errorMergeStrategy?: ErrorMergeStrategy` field.

**Success Definition**:
- [ ] `WorkflowConfig` interface includes `errorMergeStrategy?: ErrorMergeStrategy;` field
- [ ] Proper JSDoc comment with clear default behavior documentation
- [ ] Import statement added for `ErrorMergeStrategy` type
- [ ] TypeScript compiles without errors: `npm run lint`
- [ ] No breaking changes to existing code
- [ ] Field follows existing optional field patterns in codebase

---

## User Persona

**Target User**: Implementation agent working on P2.M4.T1.S1 (interface extension only).

**Use Case**: Adding the `errorMergeStrategy` field to `WorkflowConfig` to enable workflow-level error merge configuration. This is a pure interface extension task - no implementation logic changes in this subtask.

**User Journey**:
1. Read existing `WorkflowConfig` interface in `src/types/workflow-context.ts`
2. Import `ErrorMergeStrategy` type from `./error-strategy.js`
3. Add `errorMergeStrategy?: ErrorMergeStrategy;` field to interface
4. Add JSDoc comment explaining default behavior
5. Run TypeScript compilation to verify no errors
6. Verify no breaking changes to existing code

**Pain Points Addressed**:
- **Limited Error Merge Scope**: Error merge currently only available in @Task decorator, not workflow-level
- **Configuration Inconsistency**: Can't configure error handling at workflow level for all operations
- **Incomplete Type System**: WorkflowConfig missing error merge option that exists in TaskOptions

---

## Why

**Business Value and User Impact**:
- Enables PRD P2.M4 milestone ("Workflow-Level Error Merge Strategy")
- Provides consistent error handling configuration across workflow and task levels
- Sets foundation for P2.M4.T1.S2 (error collection implementation) and P2.M4.T1.S3 (tests)
- Aligns with PRD requirement for workflow-level error merge support

**Integration with Existing Features**:
- Reuses existing `ErrorMergeStrategy` interface from `src/types/error-strategy.ts`
- Follows optional field extension pattern from `TaskOptions` (same field name and type)
- Maintains backward compatibility (optional field defaults to "first error wins")
- No breaking changes to existing WorkflowConfig usage

**Problems Solved**:
- **Type System Completeness**: WorkflowConfig now has same error merge option as TaskOptions
- **Configuration Consistency**: Error merge can be configured at both task and workflow levels
- **Foundation for Future**: Enables P2.M4.T1.S2 to implement workflow-level error collection

---

## What

**User-Visible Behavior and Technical Requirements**:

This PRP adds a SINGLE optional field to the `WorkflowConfig` interface. No other files are modified. No implementation logic is changed in this subtask.

**Scope of Changes**:

**1. Target File**: `src/types/workflow-context.ts` (MODIFY ONLY)

**2. Changes to Make**:

   a. **Add Import Statement** (after line 11, with other imports):
   ```typescript
   import type { ErrorMergeStrategy } from './error-strategy.js';
   ```

   b. **Add Field to WorkflowConfig Interface** (after line 152, after `autoValidateResponses` field):
   ```typescript
   /**
    * Strategy for merging multiple errors
    *
    * @remarks
    * When provided, enables workflow-level error merge for multiple failures.
    * Default: undefined (first error wins behavior).
    *
    * @example
    * ```ts
    * // Enable error merging with default strategy
    * const config: WorkflowConfig = {
    *   name: 'MyWorkflow',
    *   errorMergeStrategy: { enabled: true }
    * };
    *
    * // Enable with custom combine function
    * const config: WorkflowConfig = {
    *   name: 'MyWorkflow',
    *   errorMergeStrategy: {
    *     enabled: true,
    *     combine: (errors) => ({
    *       message: `Custom: ${errors.length} failures`,
    *       // ... custom error object
    *     })
    *   }
    * };
    *
    * // Default behavior (first error wins)
    * const config: WorkflowConfig = {
    *   name: 'MyWorkflow'
    *   // errorMergeStrategy not provided = first error wins
    * };
    * ```
    */
   errorMergeStrategy?: ErrorMergeStrategy;
   ```

**3. No Other Changes**:
- Do NOT modify `src/core/workflow.ts` (that's P2.M4.T1.S2)
- Do NOT create tests (that's P2.M4.T1.S3)
- Do NOT modify any other files
- This is a PURE interface extension task

**Success Criteria**:
- [ ] Import statement added for `ErrorMergeStrategy`
- [ ] Field added to `WorkflowConfig` interface
- [ ] Proper JSDoc with examples and default behavior
- [ ] TypeScript compiles: `npm run lint`
- [ ] No breaking changes (existing code still compiles)
- [ ] Field is optional (`?` suffix)
- [ ] Field follows existing WorkflowConfig field ordering

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file path and line numbers for changes
- Complete code to add (import + field + JSDoc)
- Existing patterns to follow (TaskOptions, ProviderOptions, AgentConfig)
- JSDoc format with examples
- Validation command (npm run lint)
- Clear scope boundaries (what NOT to modify)

---

### Documentation & References

```yaml
# MUST READ - Target interface to modify
- file: src/types/workflow-context.ts
  why: Target file for adding errorMergeStrategy field
  pattern: Optional fields with JSDoc comments
  lines: 1-13 (import statements), 144-153 (WorkflowConfig interface)
  gotcha: Follow existing field ordering: name, enableReflection, autoValidateResponses, errorMergeStrategy

# MUST READ - ErrorMergeStrategy type to import
- file: src/types/error-strategy.ts
  why: Type definition for errorMergeStrategy field
  pattern: Simple interface with enabled boolean and optional combine function
  lines: 6-13
  gotcha: Import as type: `import type { ErrorMergeStrategy } from './error-strategy.js';`

# MUST READ - Same field in TaskOptions (pattern reference)
- file: src/types/decorators.ts
  why: Shows how errorMergeStrategy is used in @Task decorator
  pattern: Optional field with same name and type
  lines: 31-32 (TaskOptions.errorMergeStrategy)
  gotcha: This is the pattern we're following for WorkflowConfig

# MUST READ - @Task decorator error merge implementation
- file: src/decorators/task.ts
  why: Shows how errorMergeStrategy is consumed (for future P2.M4.T1.S2)
  pattern: Optional chaining check: `opts.errorMergeStrategy?.enabled`
  lines: 121-138 (error merge logic)
  gotcha: Future task (S2) will implement similar logic in workflow execution

# MUST READ - WorkflowConfig usage in constructor
- file: src/core/workflow.ts
  why: Shows how WorkflowConfig is processed (for context, NOT to modify)
  pattern: Config stored directly in `this.config`
  lines: 105-114 (constructor argument parsing)
  gotcha: DO NOT modify this file in P2.M4.T1.S1 (that's P2.M4.T1.S2)

# MUST READ - Optional field extension patterns
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S1/research/optional-field-patterns.md
  why: Complete patterns for adding optional fields to interfaces
  section: Pattern 1: TaskOptions Extension, JSDoc Patterns, Import Patterns
  critical: Shows exact code patterns to follow

# MUST READ - Error merge strategy research
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S1/research/error-merge-strategy-research.md
  why: Complete context on ErrorMergeStrategy and how it's used
  section: Key Findings 1-7, Import Pattern, Test Patterns
  critical: Shows existing ErrorMergeStrategy interface and usage patterns

# MUST READ - Parallel context from previous task
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S3/PRP.md
  why: Previous PRP running in parallel - understand what it produces
  section: Goal, What
  gotcha: No direct dependency, but aware of parallel work

# MUST READ - PRD context for this milestone
- docfile: plan/003_dd63ad365ffb/prd_snapshot.md
  why: PRD requirement for workflow-level error merge
  section: Search for "errorMergeStrategy" or "P2.M4"
  critical: PRD Issue description shows this is about extending @Task feature to workflow level
```

---

### Current Codebase Tree

```bash
src/
├── types/
│   ├── error-strategy.ts              # ErrorMergeStrategy interface (IMPORT FROM HERE)
│   ├── workflow-context.ts            # TARGET FILE - WorkflowConfig interface (MODIFY THIS)
│   ├── decorators.ts                  # TaskOptions with errorMergeStrategy (PATTERN REFERENCE)
│   ├── agent.ts                       # AgentConfig optional fields (PATTERN REFERENCE)
│   └── providers.ts                   # ProviderOptions optional fields (PATTERN REFERENCE)
├── core/
│   ├── workflow.ts                    # Workflow class (DO NOT MODIFY - P2.M4.T1.S2)
│   └── workflow-context.ts            # WorkflowContext implementation (DO NOT MODIFY)
├── decorators/
│   └── task.ts                        # @Task decorator error merge (PATTERN REFERENCE)
└── utils/
    └── workflow-error-utils.ts        # mergeWorkflowErrors function (FOR P2.M4.T1.S2)

plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/
├── P2M3T1S3/
│   └── PRP.md                         # Parallel task - tree update tests
└── P2M4T1S1/
    ├── PRP.md                         # THIS FILE - Output of this task
    └── research/                      # Research findings directory
        ├── error-merge-strategy-research.md
        └── optional-field-patterns.md
```

---

### Desired Codebase Tree with Files to be Added

```bash
# No new files - MODIFY existing src/types/workflow-context.ts

# Changes to workflow-context.ts:
# - Line ~11: Add import: `import type { ErrorMergeStrategy } from './error-strategy.js';`
# - Line ~153: Add field: `errorMergeStrategy?: ErrorMergeStrategy;`
# - Line ~153: Add JSDoc comment with examples

# No changes to:
# - src/core/workflow.ts (P2.M4.T1.S2 will modify)
# - Any test files (P2.M4.T1.S3 will create)
# - Any other source files
```

---

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: Scope Boundaries

# 1. ONLY modify src/types/workflow-context.ts
# This is a pure interface extension task.
# DO NOT modify src/core/workflow.ts (that's P2.M4.T1.S2)
# DO NOT create test files (that's P2.M4.T1.S3)
# DO NOT implement error collection logic (that's P2.M4.T1.S2)

# 2. Import ErrorMergeStrategy as TYPE
# import type { ErrorMergeStrategy } from './error-strategy.js';  # ✅ CORRECT
# import { ErrorMergeStrategy } from './error-strategy.js';       # ❌ WRONG (not a value)

# 3. Field must be OPTIONAL
# errorMergeStrategy?: ErrorMergeStrategy;  # ✅ CORRECT (optional)
# errorMergeStrategy: ErrorMergeStrategy;   # ❌ WRONG (breaking change)

# 4. Follow existing field ORDERING in WorkflowConfig
# Current order: name, enableReflection, autoValidateResponses
# New order: name, enableReflection, autoValidateResponses, errorMergeStrategy
# Add new field AFTER existing fields, not before

# 5. Use detailed JSDoc with EXAMPLES
# Follow ProviderOptions and AgentConfig JSDoc patterns
# Include @remarks section
# Include @example section with code samples
# Document default behavior (undefined = first error wins)

# 6. Default behavior is UNDEFINED (not { enabled: false })
# undefined means "not configured" = "first error wins"
# Don't set default in interface (types can't have executable logic)
# Implementation will handle undefined in P2.M4.T1.S2

# 7. Field naming matches TaskOptions exactly
# TaskOptions uses: errorMergeStrategy?: ErrorMergeStrategy
# WorkflowConfig should use: errorMergeStrategy?: ErrorMergeStrategy
# Same name, same type, same optional pattern

# 8. Import path uses RELATIVE path with .js extension
# import type { ErrorMergeStrategy } from './error-strategy.js';  # ✅ CORRECT
# import type { ErrorMergeStrategy } from './error-strategy';     # ❌ WRONG (missing .js)
# import type { ErrorMergeStrategy } from 'src/types/error-strategy.js';  # ❌ WRONG (absolute)

# 9. TypeScript compilation is validation
# Run: npm run lint (runs tsc --noEmit)
# This verifies type correctness
# If errors exist, check import syntax and field declaration

# 10. No breaking changes
# Existing code without errorMergeStrategy must still compile
// These should all compile without errors:
const config1: WorkflowConfig = {};
const config2: WorkflowConfig = { name: 'Test' };
const config3: WorkflowConfig = { enableReflection: true };
const config4: WorkflowConfig = { autoValidateResponses: false };
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - using existing type:

```typescript
// Existing type from src/types/error-strategy.ts
export interface ErrorMergeStrategy {
  /** Enable error merging (default: false, first error wins) */
  enabled: boolean;
  /** Maximum depth to merge errors */
  maxMergeDepth?: number;
  /** Custom function to combine multiple errors */
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ TARGET FILE
  - READ: src/types/workflow-context.ts
  - UNDERSTAND: Current WorkflowConfig interface structure
  - UNDERSTAND: Existing import patterns (lines 1-13)
  - NOTE: Field ordering: name, enableReflection, autoValidateResponses

Task 2: ADD IMPORT STATEMENT
  - FILE: src/types/workflow-context.ts
  - LOCATION: After line 11, with other type imports
  - ADD: import type { ErrorMergeStrategy } from './error-strategy.js';
  - VERIFY: Import uses 'type' keyword (not value import)
  - VERIFY: Path is relative './error-strategy.js' (not absolute)

Task 3: ADD FIELD TO INTERFACE
  - FILE: src/types/workflow-context.ts
  - LOCATION: After line 152, after autoValidateResponses field
  - ADD: errorMergeStrategy?: ErrorMergeStrategy;
  - VERIFY: Field is optional (? suffix)
  - VERIFY: Field name matches TaskOptions exactly
  - VERIFY: Type name matches import

Task 4: ADD JSDOC COMMENT
  - FILE: src/types/workflow-context.ts
  - LOCATION: Before errorMergeStrategy field (line ~153)
  - ADD: Comprehensive JSDoc with:
    - Brief description
    - @remarks section with behavior details
    - @example section with code samples
    - Default behavior documentation
  - PATTERN: Follow ProviderOptions/AgentConfig JSDoc style

Task 5: RUN TYPESCRIPT COMPILATION
  - COMMAND: npm run lint
  - VERIFY: Zero type errors
  - VERIFY: No "Cannot find name" errors
  - VERIFY: No "Module not found" errors
  - DEBUG: If errors, check import path and type declaration

Task 6: VERIFY NO BREAKING CHANGES
  - MANUAL: Check that existing WorkflowConfig usage still compiles
  - VERIFY: Empty config works: const config: WorkflowConfig = {};
  - VERIFY: Partial configs work: { name: 'Test' }, { enableReflection: true }
  - VERIFY: New field works: { errorMergeStrategy: { enabled: true } }

Task 7: FINAL VALIDATION
  - COMMAND: npm run lint (final check)
  - VERIFY: All TypeScript errors resolved
  - VERIFY: Import statement present
  - VERIFY: Field declaration present
  - VERIFY: JSDoc comment present
  - VERIFY: No other files modified
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Import Statement (after line 11 in workflow-context.ts)
// Existing imports:
import type { WorkflowNode } from './workflow.js';
import type { ReflectionAPI } from './reflection.js';
import type { AgentResponse } from './agent.js';

// Add new import (maintain alphabetical/logical ordering):
import type { ErrorMergeStrategy } from './error-strategy.js';

// PATTERN 2: Field Declaration (after autoValidateResponses in WorkflowConfig)
export interface WorkflowConfig {
  /** Human-readable workflow name */
  name?: string;

  /** Enable reflection for this workflow */
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;

  /**
   * Strategy for merging multiple errors
   *
   * @remarks
   * When provided, enables workflow-level error merge for multiple failures.
   * Default: undefined (first error wins behavior).
   *
   * @example
   * ```ts
   * // Enable error merging with default strategy
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   errorMergeStrategy: { enabled: true }
   * };
   *
   * // Enable with custom combine function
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow',
   *   errorMergeStrategy: {
   *     enabled: true,
   *     combine: (errors) => ({
   *       message: `Custom: ${errors.length} failures`,
   *       original: { custom: true, errors },
   *       workflowId: 'parent-id',
   *       stack: errors[0]?.stack,
   *       state: errors[0]?.state,
   *       logs: errors.flatMap(e => e.logs)
   *     })
   *   }
   * };
   *
   * // Default behavior (first error wins)
   * const config: WorkflowConfig = {
   *   name: 'MyWorkflow'
   *   // errorMergeStrategy not provided = first error wins
   * };
   * ```
   */
  errorMergeStrategy?: ErrorMergeStrategy;
}

// PATTERN 3: TaskOptions Reference (same field in existing codebase)
// From src/types/decorators.ts (lines 31-32)
export interface TaskOptions {
  /** Strategy for merging errors from concurrent task execution */
  errorMergeStrategy?: ErrorMergeStrategy;
}

// GOTCHA 1: Use 'type' keyword for import
// import type { ErrorMergeStrategy } from './error-strategy.js';  // ✅ CORRECT
// import { ErrorMergeStrategy } from './error-strategy.js';       // ❌ WRONG

// GOTCHA 2: Field must be optional
// errorMergeStrategy?: ErrorMergeStrategy;  // ✅ CORRECT
// errorMergeStrategy: ErrorMergeStrategy;   // ❌ WRONG (breaking change)

// GOTCHA 3: Import path with .js extension
// import type { ErrorMergeStrategy } from './error-strategy.js';  // ✅ CORRECT
// import type { ErrorMergeStrategy } from './error-strategy';     // ❌ WRONG

// GOTCHA 4: Follow field ordering
// Add AFTER existing fields, not before
// Order: name, enableReflection, autoValidateResponses, errorMergeStrategy

// GOTCHA 5: Only modify workflow-context.ts
// DO NOT modify workflow.ts (that's P2.M4.T1.S2)
// DO NOT create test files (that's P2.M4.T1.S3)
// This is a pure interface extension task
```

---

### Integration Points

```yaml
NO NEW INTEGRATIONS - This is type-only work

MODIFIED FILES:
  - src/types/workflow-context.ts:
    add: Import statement for ErrorMergeStrategy type
    add: errorMergeStrategy field to WorkflowConfig interface
    add: JSDoc comment with examples
    preserve: All existing imports and fields

DEPENDENCIES:
  - ErrorMergeStrategy interface (src/types/error-strategy.ts) - already exists
  - TaskOptions pattern (src/types/decorators.ts) - reference for naming/type

NO CHANGES TO:
  - src/core/workflow.ts (P2.M4.T1.S2 will modify)
  - Test files (P2.M4.T1.S3 will create)
  - Implementation logic (P2.M4.T1.S2 will add)
  - Any other source files

SCOPE BOUNDARIES:
  - This task: Interface extension ONLY
  - Next task (P2.M4.T1.S2): Implementation logic
  - Final task (P2.M4.T1.S3): Tests
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after making changes - fix before proceeding
npm run lint       # TypeScript type checking via tsc --noEmit

# Expected: Zero type errors. If errors exist:
# - Check import statement uses 'type' keyword
# - Check import path is './error-strategy.js' (not absolute)
# - Check field declaration uses '?' (optional)
# - Check type name matches import

# Common errors and fixes:
# "Cannot find name 'ErrorMergeStrategy'" → Add import statement
# "Module './error-strategy' not found" → Add .js extension to path
# "Property 'errorMergeStrategy' conflicts" → Field already added (done)
```

### Level 2: Type System Validation (Component Validation)

```bash
# Verify TypeScript accepts the new field
cat > /tmp/test-config.ts << 'EOF'
import type { WorkflowConfig } from './src/types/workflow-context.js';

// These should all compile without errors:
const config1: WorkflowConfig = {};
const config2: WorkflowConfig = { name: 'Test' };
const config3: WorkflowConfig = { enableReflection: true };
const config4: WorkflowConfig = { autoValidateResponses: false };
const config5: WorkflowConfig = {
  errorMergeStrategy: { enabled: true }
};
const config6: WorkflowConfig = {
  name: 'Test',
  errorMergeStrategy: {
    enabled: true,
    combine: (errors) => ({
      message: `Custom: ${errors.length} failures`,
      original: { custom: true, errors },
      workflowId: 'test',
      logs: []
    })
  }
};
EOF

npx tsc --noEmit /tmp/test-config.ts

# Expected: Zero errors
# If errors exist, check field declaration and JSDoc syntax
```

### Level 3: Backward Compatibility Validation (System Validation)

```bash
# Verify existing code still compiles
npm run lint

# Expected: All existing code compiles without errors
# This confirms no breaking changes were introduced

# Verify import doesn't break module resolution
npm run lint -- --moduleResolution bundler

# Expected: Zero module resolution errors
```

### Level 4: Code Quality Validation

```bash
# Verify file structure is correct
grep -n "import type { ErrorMergeStrategy }" src/types/workflow-context.ts
# Expected: Line number near other imports (line ~12)

grep -n "errorMergeStrategy?: ErrorMergeStrategy" src/types/workflow-context.ts
# Expected: Line number in WorkflowConfig interface (line ~153)

# Verify JSDoc comment exists
grep -B 10 "errorMergeStrategy" src/types/workflow-context.ts | grep -E "^\s+\*"
# Expected: Multi-line JSDoc comment with @remarks and @example

# Verify no other files were modified
git status --porcelain | grep -v "plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M4T1S1/"
# Expected: Only src/types/workflow-context.ts modified
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Import statement added: `import type { ErrorMergeStrategy } from './error-strategy.js';`
- [ ] Field added to interface: `errorMergeStrategy?: ErrorMergeStrategy;`
- [ ] JSDoc comment present with @remarks and @example
- [ ] TypeScript compiles: `npm run lint`
- [ ] No type errors in output
- [ ] Import uses 'type' keyword (not value import)
- [ ] Field is optional (? suffix present)
- [ ] Field name matches TaskOptions exactly
- [ ] Import path uses .js extension
- [ ] Only src/types/workflow-context.ts modified

### Feature Validation

- [ ] Field ordering follows existing pattern (after autoValidateResponses)
- [ ] JSDoc includes brief description
- [ ] JSDoc includes @remarks section
- [ ] JSDoc includes @example section with code samples
- [ ] JSDoc documents default behavior (undefined = first error wins)
- [ ] Empty config compiles: `const config: WorkflowConfig = {};`
- [ ] Config with new field compiles: `{ errorMergeStrategy: { enabled: true } }`

### Code Quality Validation

- [ ] Follows existing optional field patterns (TaskOptions, ProviderOptions)
- [ ] No breaking changes to existing code
- [ ] No implementation logic added (interface only)
- [ ] No test files created (P2.M4.T1.S3 will create)
- [ ] No workflow.ts modifications (P2.M4.T1.S2 will modify)
- [ ] Import path is relative (not absolute)
- [ ] Import statement follows existing import ordering

### Documentation & Deployment

- [ ] JSDoc examples are valid TypeScript code
- [ ] JSDoc examples demonstrate all usage patterns
- [ ] Default behavior clearly documented
- [ ] Field purpose clearly explained

---

## Anti-Patterns to Avoid

- ❌ Don't modify src/core/workflow.ts (that's P2.M4.T1.S2)
- ❌ Don't create test files (that's P2.M4.T1.S3)
- ❌ Don't make field required (must be optional)
- ❌ Don't use value import (use `import type`)
- ❌ Don't forget .js extension in import path
- ❌ Don't add implementation logic (interface only)
- ❌ Don't modify other interface fields
- ❌ Don't change field ordering (add at end)
- ❌ Don't use absolute import paths
- ❌ Don't skip JSDoc documentation
- ❌ Don't assume it works without running `npm run lint`
- ❌ Don't add default value in type (types can't have executable logic)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Clear deliverable (add single optional field to interface)
- ✅ Complete code examples provided (import + field + JSDoc)
- ✅ Exact file path and line numbers specified
- ✅ Existing patterns to follow (TaskOptions same field)
- ✅ Research covers all necessary patterns
- ✅ No implementation complexity (type-only change)
- ✅ Clear validation command (npm run lint)
- ✅ Clear scope boundaries (what NOT to modify)
- ✅ No breaking changes (optional field)
- ✅ Minimal dependencies (existing type only)

**Validation**: The completed interface extension will enable workflow-level error merge configuration, setting the foundation for P2.M4.T1.S2 (error collection implementation) and P2.M4.T1.S3 (tests). The change is backward compatible and follows established codebase patterns.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**

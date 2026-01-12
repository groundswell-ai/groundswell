# Product Requirement Prompt (PRP): Update WorkflowLogger.child() to accept Partial<LogEntry>

**Work Item**: P1.M1.T1.S2 - Update WorkflowLogger.child() to accept Partial<LogEntry>
**PRD Reference**: Section 12.1 - WorkflowLogger Skeleton
**Implementation Target**: src/core/logger.ts:84

---

## Goal

**Feature Goal**: Update the `WorkflowLogger.child()` method signature from `child(parentLogId: string)` to `child(meta: Partial<LogEntry>)` while maintaining backward compatibility with existing string-based calls.

**Deliverable**: Modified `src/core/logger.ts:84` child() method that:
1. Accepts either `string` (legacy) or `Partial<LogEntry>` (new) via function overloads
2. Extracts `parentLogId` from the parameter
3. Maintains 100% backward compatibility with existing test files
4. Follows TypeScript best practices for method overloading

**Success Definition**:
- All existing tests pass without modification
- New functionality allows `logger.child({ parentLogId: 'id', data: {...} })`
- TypeScript compilation succeeds with no type errors
- Method signature matches PRD specification `child(meta: Partial<LogEntry>)`

## User Persona

**Target User**: Developer implementing hierarchical logging in workflow applications

**Use Case**: Creating child loggers that include parent log references and optional metadata

**User Journey**:
1. Developer calls `this.logger.child('parent-id')` for simple parent reference (existing pattern)
2. Developer calls `this.logger.child({ parentLogId: 'parent-id', data: { userId: '123' } })` for extended metadata (new pattern)
3. Child logger inherits parentLogId and attaches to all log entries

**Pain Points Addressed**:
- **PRD Compliance**: Current implementation doesn't match PRD specification
- **Extensibility**: Cannot pass additional metadata when creating child loggers
- **Type Safety**: String parameter doesn't convey intent as clearly as object parameter

## Why

- **PRD Compliance**: Section 12.1 specifies `child(meta: Partial<LogEntry>)` but implementation uses `child(parentLogId: string)`
- **API Consistency**: Aligns implementation with architectural design documented in PRD
- **Future Extensibility**: `Partial<LogEntry>` signature allows passing additional metadata (data, level, etc.) without future breaking changes
- **Minimal Breaking Change**: Only 2 test files affected; can maintain backward compatibility via overloads

## What

### Success Criteria

- [ ] child() method updated in src/core/logger.ts:84
- [ ] Function overloads support both `string` and `Partial<LogEntry>` parameters
- [ ] Existing tests at src/__tests__/adversarial/deep-analysis.test.ts:61 pass
- [ ] Existing tests at src/__tests__/adversarial/edge-case.test.ts:96 pass
- [ ] TypeScript compilation succeeds with no type errors
- [ ] Method signature matches PRD specification for Partial<LogEntry> parameter

---

## All Needed Context

### Context Completeness Check

_This PRP passes the "No Prior Knowledge" test - someone unfamiliar with the codebase would have everything needed to implement this successfully._

### Documentation & References

```yaml
# MUST READ - PRD Specification
- file: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/architecture/logger_child_signature_analysis.md
  why: Complete analysis of signature mismatch with implementation recommendation
  section: Section 1 - PRD Specification, Section 6 - Recommended Implementation Approach
  critical: Confirms Option 2 (backward compatible overload) is recommended

# MUST READ - TypeScript Function Overloads Documentation
- url: https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads
  why: Official documentation on function overload syntax and best practices
  critical: Implementation must follow overload ordering rules (specific to general)

# MUST READ - TypeScript Partial<T> Documentation
- url: https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype
  why: Official documentation on Partial<T> utility type behavior
  critical: Partial<T> makes ALL properties optional, including required ones

# CRITICAL - Current Implementation
- file: src/core/logger.ts
  why: Current WorkflowLogger.child() implementation at line 84-86
  pattern: Hierarchical logging with parentLogId passed to constructor
  gotcha: Current signature `child(parentLogId: string)` is incompatible with object parameter

# CRITICAL - Type Definitions
- file: src/types/logging.ts
  why: LogEntry interface definition required to understand Partial<LogEntry>
  section: Lines 9-24 define complete LogEntry interface with 7 fields
  gotcha: parentLogId is optional (parentLogId?: string), other fields are required

# CRITICAL - Existing Usage Sites (must remain compatible)
- file: src/__tests__/adversarial/deep-analysis.test.ts
  why: Test file using child() with empty string at line 61
  pattern: `const childLogger = this.logger.child('');`
  gotcha: Empty string test expects parentLogId to be undefined in resulting log

- file: src/__tests__/adversarial/edge-case.test.ts
  why: Test file using child() with parent ID at line 96
  pattern: `const childLogger = this.logger.child('parent-id-123');`
  gotcha: Test verifies child logger is created and parentLogId is set correctly

# REFERENCE - Partial<T> Usage Pattern in Codebase
- file: src/types/reflection.ts
  why: Example of how Partial<T> is used elsewhere in the codebase
  pattern: createReflectionConfig() with spread operator merging
  section: Lines 110-117 show { ...defaults, ...partial } pattern

# REFERENCE - Testing Patterns
- file: src/__tests__/adversarial/deep-analysis.test.ts
  why: Test patterns for union types and method overloads
  pattern: Tests at lines 186-284 show @Task decorator testing multiple return types

# REFERENCE - Research Document
- docfile: plan/001_d3bb02af4886/research_typescript_partial_and_overloads.md
  why: Comprehensive research on Partial<T>, overloads, and backward compatibility
  section: Section 3 - Backward-Compatible Method Signature Evolution, Section 8 - Recommended Approach

# REFERENCE - Codebase Structure
- docfile: plan/001_d3bb02af4886/bugfix/architecture/codebase_structure.md
  why: Architecture documentation showing logger location and observer patterns
  section: Section 7 - Logger Architecture
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── logger.ts              # TARGET FILE - child() at line 84
│   ├── workflow.ts            # Creates root logger at line 111
│   └── index.ts               # Public API exports
├── types/
│   ├── logging.ts             # LogEntry, LogLevel definitions
│   ├── observer.ts            # WorkflowObserver interface
│   └── index.ts               # Type exports
├── utils/
│   └── id.ts                  # generateId() utility
└── __tests__/
    └── adversarial/
        ├── deep-analysis.test.ts    # Uses child('') at line 61
        └── edge-case.test.ts        # Uses child('parent-id-123') at line 96
```

### Desired Codebase Tree with Files to be Modified

```bash
# MODIFY: src/core/logger.ts
# Responsibility: Update child() method signature with overloads
#
# Changes:
#   Line 84-86: Replace current child() implementation with:
#     - Overload 1: child(parentLogId: string): WorkflowLogger;
#     - Overload 2: child(meta: Partial<LogEntry>): WorkflowLogger;
#     - Implementation: child(input: string | Partial<LogEntry>): WorkflowLogger
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Function overloads must be ordered from most specific to most general
// Incorrect order will cause TypeScript to never match the specific overload

// CRITICAL: Implementation signature must be compatible with ALL overloads
// Implementation parameter type must be a union of all overload parameter types

// CRITICAL: Partial<LogEntry> makes ALL properties optional, including required ones
// Partial<LogEntry> allows: {}, { parentLogId: 'x' }, { id: 'x', parentLogId: 'y' }

// GOTCHA: typeof value === 'string' type guard is required for narrowing
// TypeScript cannot automatically narrow string | Partial<LogEntry>

// GOTCHA: Empty string '' in current test expects parentLogId to be undefined
// Test verifies: workflow.node.logs[0].parentLogId).toBeUndefined()
// Implementation should treat empty string as falsy (existing behavior)

// PATTERN: Codebase uses spread operator for merging Partial objects:
// { ...DEFAULT_CONFIG, ...partial }  // From reflection.ts lines 110-117

// GOTCHA: The @Step decorator only uses logger.info(), not child()
// Logger interface in step.ts line 10-12 is minimal: { info(message, data?) }

// CRITICAL: Observer errors are caught with console.error (line 27 in logger.ts)
// This is P1.M3.T1 - separate bug fix, do not modify in this task
```

---

## Implementation Blueprint

### Data Models and Structure

The `LogEntry` interface is already defined and must remain unchanged:

```typescript
// From src/types/logging.ts lines 9-24
export interface LogEntry {
  id: string;                  // Unique identifier
  workflowId: string;          // Workflow that created log
  timestamp: number;           // Unix timestamp in ms
  level: LogLevel;             // 'debug' | 'info' | 'warn' | 'error'
  message: string;             // Log message
  data?: unknown;              // Optional structured data
  parentLogId?: string;        // Parent log ID for hierarchy
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Partial<LogEntry> makes ALL 7 properties optional:
type PartialLogEntry = Partial<LogEntry>;
// Equivalent to:
// {
//   id?: string;
//   workflowId?: string;
//   timestamp?: number;
//   level?: LogLevel;
//   message?: string;
//   data?: unknown;
//   parentLogId?: string;
// }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ current implementation and understand constructor
  - EXAMINE: src/core/logger.ts lines 8-16 (constructor)
  - EXAMINE: src/core/logger.ts lines 84-86 (current child() method)
  - UNDERSTAND: Constructor accepts optional parentLogId parameter
  - UNDERSTAND: child() passes parentLogId to constructor
  - NO CHANGES: This is research/understanding only

Task 2: MODIFY src/core/logger.ts:84 - Add function overload signatures
  - ADD: Overload signature for backward compatibility
    child(parentLogId: string): WorkflowLogger;
  - ADD: Overload signature for PRD compliance
    child(meta: Partial<LogEntry>): WorkflowLogger;
  - PLACEMENT: Immediately before the existing child() method (line 84)
  - ORDER: String overload first (more specific), then object overload

Task 3: MODIFY src/core/logger.ts:86 - Update implementation signature
  - CHANGE: From child(parentLogId: string): WorkflowLogger
  - TO: child(input: string | Partial<LogEntry>): WorkflowLogger
  - IMPLEMENT: Type guard to narrow input type
    const parentLogId = typeof input === 'string' ? input : input.parentLogId;
  - PRESERVE: Existing constructor call return new WorkflowLogger(...)

Task 4: VERIFY existing tests pass without modification
  - RUN: npm test -- src/__tests__/adversarial/deep-analysis.test.ts
  - RUN: npm test -- src/__tests__/adversarial/edge-case.test.ts
  - VERIFY: Test at line 61 (empty string) passes
  - VERIFY: Test at line 96 (normal parent ID) passes
  - NO CHANGES: Test files should NOT require modification

Task 5: RUN TypeScript compilation check
  - RUN: npx tsc --noEmit
  - VERIFY: No type errors related to child() method
  - VERIFY: Overload signatures are correctly ordered
  - VERIFY: Implementation signature is compatible with all overloads
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: Function overload structure from TypeScript documentation
// MUST be in this order: specific overloads first, general implementation last

// ============================================
// OVERLOAD SIGNATURES (declaration only, no body)
// ============================================

// Overload 1: Backward compatible with existing string parameter
child(parentLogId: string): WorkflowLogger;

// Overload 2: New PRD-compliant signature with Partial<LogEntry>
child(meta: Partial<LogEntry>): WorkflowLogger;

// ============================================
// IMPLEMENTATION (must accept all overload types)
// ============================================

child(input: string | Partial<LogEntry>): WorkflowLogger {
  // PATTERN: Type guard for narrowing union type
  const parentLogId = typeof input === 'string'
    ? input
    : input.parentLogId;

  // PRESERVE: Existing constructor call pattern
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}

// ============================================
// USAGE EXAMPLES (both work after implementation)
// ============================================

// Legacy string usage (existing test files)
const child1 = logger.child('parent-id-123');
const child2 = logger.child('');  // Empty string - parentLogId will be undefined

// New object usage (PRD compliant)
const child3 = logger.child({ parentLogId: 'parent-id-456' });
const child4 = logger.child({});  // No parentLogId
const child5 = logger.child({
  parentLogId: 'parent-id-789',
  data: { userId: 'user-123', requestId: 'req-456' }
});

// GOTCHA: Additional fields in Partial<LogEntry> are accepted but not used
// The PRD skeleton shows meta is accepted but NOT USED in implementation
// Future enhancement could store and use additional metadata fields
```

### Integration Points

```yaml
NO NEW FILES: This task modifies only src/core/logger.ts

NO CONFIG CHANGES: No configuration files modified

NO ROUTE CHANGES: No routing or API changes

DEPENDENCIES:
  - type: Type definition import
  - from: src/types/logging.ts
  - import: LogEntry type
  - existing: true

AFFECTED FILES:
  - modify: src/core/logger.ts (lines 84-86)
  - no_changes: src/__tests__/adversarial/deep-analysis.test.ts
  - no_changes: src/__tests__/adversarial/edge-case.test.ts
  - no_changes: src/types/logging.ts
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after modification - fix before proceeding
npm run build              # Verify TypeScript compilation succeeds
npx tsc --noEmit           # Type checking with no output
npm run lint              # Run ESLint if configured

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Common TypeScript errors and fixes:
# Error: "Overload signatures must all be optional or all necessary"
# Fix: Ensure all overload signatures have no default values (implementation can have default)

# Error: "This overload signature is not compatible with its implementation signature"
# Fix: Ensure implementation signature accepts all overload parameter types (union type)

# Error: "Function implementation name must be 'child'"
# Fix: Ensure implementation function name matches overload signatures
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each affected test file
npm test -- src/__tests__/adversarial/deep-analysis.test.ts
npm test -- src/__tests__/adversarial/edge-case.test.ts

# Test broader logging functionality
npm test -- --grep "WorkflowLogger"
npm test -- --grep "logger"

# Full test suite for affected area
npm test

# Expected: All tests pass. If failing, debug root cause and fix implementation.

# Specific test verification:
# 1. deep-analysis.test.ts:61 - "should handle logger.child() with empty parentLogId"
#    Expects: workflow.node.logs[0].parentLogId).toBeUndefined()
#
# 2. edge-case.test.ts:96 - Normal parentLogId test
#    Expects: childLogger is defined and parentLogId is set correctly
```

### Level 3: Integration Testing (System Validation)

```bash
# Test that logger still works in full workflow context
npm test -- src/__tests__/integration/

# Test workflow creation with root logger
npm test -- src/__tests__/unit/workflow.test.ts

# Verify logger integration with observers
npm test -- --grep "observer"

# Expected: All integrations working, proper log entries created, parentLogId correctly set

# Manual verification (if needed):
# 1. Create a workflow
# 2. Get root logger
# 3. Create child logger with string: logger.child('test-parent')
# 4. Create child logger with object: logger.child({ parentLogId: 'test-parent-2' })
# 5. Log messages with both child loggers
# 6. Verify workflow.node.logs has correct parentLogId values
```

### Level 4: Type Safety Validation

```bash
# TypeScript type checking
npx tsc --noEmit --strict

# Verify overload type inference works correctly
# Create temporary test file to verify type behavior:
cat > type-check-test.ts << 'EOF'
import { WorkflowLogger } from './src/core/logger.js';
import type { LogEntry } from './src/types/logging.js';

declare const logger: WorkflowLogger;

// These should all type-check correctly
const child1 = logger.child('string-parent');        // string overload
const child2 = logger.child({ parentLogId: 'obj' });  // Partial<LogEntry> overload
const child3 = logger.child({});                     // Empty Partial<LogEntry>

// This should cause type error
// const child4 = logger.child(123);                  // ERROR: number not assignable
// const child5 = logger.child(true);                 // ERROR: boolean not assignable

console.log('Type check passed');
EOF

npx tsc --noEmit type-check-test.ts
rm type-check-test.ts

# Expected: No type errors for valid usage, type errors for invalid usage
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] No linting errors: `npm run lint` (if configured)

### Feature Validation

- [ ] Function overload signatures added before implementation
- [ ] Overload order is correct (specific to general)
- [ ] Implementation signature accepts `string | Partial<LogEntry>`
- [ ] Type guard correctly narrows input type
- [ ] Existing tests pass without modification
- [ ] Test at deep-analysis.test.ts:61 passes (empty string)
- [ ] Test at edge-case.test.ts:96 passes (normal parent ID)

### Code Quality Validation

- [ ] Follows existing codebase patterns (constructor call preserved)
- [ ] File placement unchanged (src/core/logger.ts)
- [ ] No new files created
- [ ] No unnecessary complexity added
- [ ] Backward compatibility maintained (string calls still work)

### Documentation & Deployment

- [ ] JSDoc comment updated if present
- [ ] No environment changes required
- [ ] No configuration changes required

---

## Anti-Patterns to Avoid

- ❌ Don't modify existing test files - they should pass unchanged
- ❌ Don't change the constructor or other methods in WorkflowLogger
- ❌ Don't use `any` type - use proper union type `string | Partial<LogEntry>`
- ❌ Don't forget type guard - use `typeof input === 'string'` for narrowing
- ❌ Don't reverse overload order - specific signatures must come first
- ❌ Don't make implementation parameter type narrower than overload union
- ❌ Don't add default values to overload signatures (only implementation can have defaults)
- ❌ Don't modify observer error handling (separate bug P1.M3.T1)
- ❌ Don't add new functionality beyond accepting Partial<LogEntry>
- ❌ Don't break the dual tree architecture (workflow/node trees)

---

## Appendix: Quick Reference

### Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| src/core/logger.ts | 84-86 | child() method implementation target |
| src/types/logging.ts | 9-24 | LogEntry interface definition |
| src/__tests__/adversarial/deep-analysis.test.ts | 61 | Empty string test site |
| src/__tests__/adversarial/edge-case.test.ts | 96 | Normal parent ID test site |
| plan/.../logger_child_signature_analysis.md | All | Complete signature analysis |

### Signature Comparison

```typescript
// BEFORE (current implementation)
child(parentLogId: string): WorkflowLogger {
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}

// AFTER (with backward compatible overloads)
child(parentLogId: string): WorkflowLogger;                              // Overload 1
child(meta: Partial<LogEntry>): WorkflowLogger;                          // Overload 2
child(input: string | Partial<LogEntry>): WorkflowLogger {               // Implementation
  const parentLogId = typeof input === 'string' ? input : input.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

### Existing Usage Patterns (Must Preserve)

```typescript
// Pattern 1: Empty string (deep-analysis.test.ts:61)
this.logger.child('');
// After change: Works via string overload, parentLogId = '' → falsy → undefined

// Pattern 2: Parent ID string (edge-case.test.ts:96)
this.logger.child('parent-id-123');
// After change: Works via string overload, parentLogId = 'parent-id-123'
```

### New Usage Patterns (Enabled by This Change)

```typescript
// New Pattern 1: Object with parentLogId
this.logger.child({ parentLogId: 'parent-id-456' });

// New Pattern 2: Object with additional metadata (future extensibility)
this.logger.child({
  parentLogId: 'parent-id-789',
  data: { userId: 'user-123', action: 'process' }
});

// New Pattern 3: Empty object (no parentLogId)
this.logger.child({});
```

### Confidence Score

**8/10** for one-pass implementation success likelihood

**Rationale**:
- Clear implementation target (single method, 3 lines)
- Comprehensive research and context provided
- Backward compatibility approach minimizes risk
- Only 2 test files to validate
- Well-documented TypeScript patterns to follow

**Risk Factors**:
- Function overload syntax can be tricky (order matters)
- Type guard implementation must be correct
- TypeScript compiler strictness may reveal edge cases

**Mitigation**:
- Follow TypeScript documentation exactly
- Use proven patterns from research document
- Validate with TypeScript compiler before testing

---

**PRP Version**: 1.0
**Created**: 2026-01-12
**For**: P1.M1.T1.S2 - Update WorkflowLogger.child() to accept Partial<LogEntry>
**Next Task**: P1.M1.T1.S3 - Add tests for new child() signature with Partial<LogEntry>

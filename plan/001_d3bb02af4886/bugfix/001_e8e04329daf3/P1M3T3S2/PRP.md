name: "P1.M3.T3.S2 - Implement Workflow Name Validation in Constructor"
description: |

---

## Goal

**Feature Goal**: Add validation to the Workflow constructor to reject empty and whitespace-only workflow names while preserving existing behavior for undefined/null names.

**Deliverable**: Updated `src/core/workflow.ts` constructor with name validation logic that throws descriptive errors for invalid names.

**Success Definition**:
- Workflow constructor throws `Error` when name is empty string or whitespace-only
- Workflow constructor throws `Error` when name exceeds 100 characters
- Workflow constructor preserves existing fallback behavior when name is `undefined` or `null` (uses class name)
- TypeScript compiles without errors
- All tests pass including updated edge-case test

## User Persona (if applicable)

**Target User**: Developer using the Groundswell workflow engine

**Use Case**: Creating Workflow instances with custom or default names for identification in tree debugger and logging

**User Journey**:
1. Developer creates a `new Workflow('MyWorkflowName')` or extends Workflow class
2. If the name is invalid (empty/whitespace), they receive immediate, clear error feedback
3. If the name is valid or omitted, the workflow is created successfully

**Pain Points Addressed**:
- Empty workflow names appear as blank entries in tree debugger, causing confusion
- No validation feedback when developers accidentally use empty strings
- Inconsistent with industry best practices (all major workflow engines validate names)

## Why

- **User Experience**: Empty workflow names provide no useful information and create confusion in the tree debugger
- **Bug Fix**: Issue 8 explicitly frames empty names as a bug ("should probably be non-empty")
- **Industry Alignment**: All major workflow engines (Kubernetes, Airflow, AWS Step Functions) require non-empty names
- **Consistency**: Codebase already validates other critical inputs (circular references, duplicate registrations)
- **PRD Compliance**: PRD specifies name as "Human-readable name" - empty string is not human-readable

## What

Add validation logic to the Workflow constructor that:
1. Rejects empty strings (`''`)
2. Rejects whitespace-only strings (`'   '`, `'\t\n'`)
3. Rejects names exceeding 100 characters
4. Preserves existing fallback behavior for `undefined`/`null` (uses class name)
5. Does NOT auto-trim leading/trailing whitespace (preserves user intent)

### Success Criteria

- [ ] Empty string names throw `Error` with message: "Workflow name cannot be empty or whitespace only"
- [ ] Whitespace-only names throw `Error` with message: "Workflow name cannot be empty or whitespace only"
- [ ] Names exceeding 100 characters throw `Error` with message: "Workflow name cannot exceed 100 characters"
- [ ] `undefined`/`null` names still use class name (existing behavior preserved)
- [ ] Valid names with leading/trailing whitespace are accepted as-is
- [ ] Both constructor patterns (class-based and functional) are validated

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

✅ **YES** - This PRP includes:
- Exact file path and line numbers for the modification
- Complete validation rules from S1 decision document
- Existing constructor code patterns to follow
- Error handling patterns used throughout codebase
- Test file that needs updating with specific line numbers
- Both constructor patterns that must be validated
- TypeScript compilation validation steps

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: file:///home/dustin/projects/groundswell/plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M3T3S1/DECISION.md
  why: Contains complete validation rules decided in S1 (5 rules with examples)
  critical: Implementation location specified as line ~98, after config normalization, before node creation

- file: src/core/workflow.ts
  why: Contains the Workflow class constructor that needs modification
  pattern: Constructor uses overloaded parameters (class-based: name, parent | functional: config, executor)
  gotcha: Validation MUST apply to both constructor patterns - name comes from different sources

- file: src/core/workflow.ts:94
  why: Line where `this.config = { name: name ?? this.constructor.name }` is set (class-based pattern)
  pattern: Nullish coalescing preserves undefined fallback - must NOT break this

- file: src/core/workflow.ts:98-117
  why: Constructor body - validation must be added AFTER line 94 (config set), BEFORE line 101 (node created)
  pattern: Existing validation patterns in codebase use standard `Error` with descriptive messages

- file: src/__tests__/adversarial/edge-case.test.ts:107-117
  why: This test currently EXPECTS empty names to work - must be updated to expect error thrown
  pattern: Uses `expect(workflow.node.name).toBe('')` - needs `expect(() => new TestWorkflow('')).toThrow()`

- file: src/__tests__/unit/workflow.test.ts
  why: Contains existing constructor test patterns to follow for new validation tests
  pattern: Uses SimpleWorkflow class, `expect().toThrow()` for error testing

- docfile: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/docs/P1M3T3S1/DECISION.md
  why: Complete validation rules with examples and anti-patterns to avoid
  section: Rules 1-5 specify exact validation behavior required
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── core/
│   │   ├── workflow.ts          # MODIFICATION TARGET (constructor at lines 83-117)
│   │   ├── agent.ts
│   │   ├── context.ts
│   │   └── ...
│   ├── types/
│   │   ├── workflow.ts          # WorkflowConfig interface (name?: string)
│   │   └── ...
│   └── __tests__/
│       ├── adversarial/
│       │   └── edge-case.test.ts   # UPDATE REQUIRED (line 107-117)
│       └── unit/
│           └── workflow.test.ts     # REFERENCE for test patterns
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# No new files to be added
# Modifications only:
├── src/
│   ├── core/
│   │   └── workflow.ts          # MODIFY: Add validation to constructor (~line 98-100)
└── __tests__/
    ├── adversarial/
    │   └── edge-case.test.ts    # MODIFY: Update test at lines 107-117 to expect error
    └── unit/
        └── workflow.test.ts     # MODIFY: Add new validation test suite
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: The Workflow constructor has TWO patterns - validation must work for both
// Pattern 1: Class-based - new Workflow(name?, parent?)
// Pattern 2: Functional - new Workflow(config, executor)
// The name parameter comes from different sources in each pattern!

// Pattern 1 (lines 88-94):
// this.config = { name: name ?? this.constructor.name };
// If name is string, use it. If undefined/null, use class name.

// Pattern 2 (lines 96-101):
// if (typeof name === 'object') { this.config = name; } else { ... }
// name is actually a WorkflowConfig object with name property

// GOTCHA: The parameter named "name" in the constructor signature
// can be either: string | WorkflowConfig | undefined
// After config normalization, always check: this.config.name

// VALIDATION LOCATION: After line 94, this.config.name is always defined
// Check if it's a string and validate. If undefined, class name was used (valid).

// GOTCHA: Don't use custom error classes - codebase uses standard Error throughout
// Examples from codebase:
// throw new Error('Circular parent-child relationship detected');
// throw new Error('Child already attached to this workflow');

// GOTCHA: The test at edge-case.test.ts:107-117 expects empty names to work
// This test MUST be updated or it will fail after implementation

// GOTCHA: TypeScript compilation is a validation gate - code must compile without errors
// Run: npx tsc --noEmit
```

## Implementation Blueprint

### Data models and structure

No new data models needed. This is a pure validation enhancement to existing constructor.

```typescript
// Existing models (no changes needed):
// - WorkflowConfig interface: { name?: string; ... }
// - Workflow class extends WorkflowNodeBase
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/workflow.ts constructor
  - LOCATION: After line 94 (this.config assignment), before line 98 (conditional logic)
  - IMPLEMENT: Name validation using this.config.name
  - VALIDATION RULE 1 (Empty/Whitespace): if (typeof this.config.name === 'string' && this.config.name.trim().length === 0) throw new Error('Workflow name cannot be empty or whitespace only')
  - VALIDATION RULE 2 (Max Length): if (typeof this.config.name === 'string' && this.config.name.length > 100) throw new Error('Workflow name cannot exceed 100 characters')
  - PRESERVE: undefined/null fallback to class name (don't validate if this.config.name is undefined)
  - PATTERN: Follow existing error throwing pattern in codebase (standard Error, descriptive message)
  - GOTCHA: Only validate when this.config.name is explicitly a string - undefined means class name was used (valid)

Task 2: UPDATE src/__tests__/adversarial/edge-case.test.ts
  - LOCATION: Lines 107-117 (test "should handle empty string workflow name")
  - CHANGE: Modify test to expect error to be thrown
  - PATTERN: expect(() => new TestWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only')
  - PRESERVE: Test structure and description, only change expectation

Task 3: CREATE new test suite in src/__tests__/unit/workflow.test.ts
  - LOCATION: Add new describe block: 'Workflow Name Validation'
  - IMPLEMENT: Comprehensive tests for all validation rules
  - TEST CASES:
    - Empty string should throw
    - Whitespace-only (spaces) should throw
    - Whitespace-only (tabs/newlines) should throw
    - Name exceeding 100 characters should throw
    - Exactly 100 characters should work
    - Valid names should work
    - Undefined should use class name (existing behavior)
    - Null should use class name (existing behavior)
    - Name with leading/trailing whitespace should be accepted as-is
    - Both constructor patterns should be validated
  - PATTERN: Follow existing test patterns in workflow.test.ts (SimpleWorkflow class, expect().toThrow())

Task 4: VERIFY TypeScript compilation
  - RUN: npx tsc --noEmit
  - EXPECT: Zero type errors
  - FIX: Any type errors that arise from validation logic

Task 5: RUN full test suite
  - RUN: npm test
  - EXPECT: All tests pass
  - FIX: Any failing tests (should only be the updated edge-case test now passing)
```

### Implementation Patterns & Key Details

```typescript
// EXACT CODE TO INSERT at src/core/workflow.ts after line 94:

// Location: src/core/workflow.ts:94 (after this.config = { name: name ?? this.constructor.name })
// PATTERN: Only validate when name is explicitly provided as a string
// CRITICAL: undefined means class name was used - this is valid behavior

// Validate workflow name (after config is normalized)
if (typeof this.config.name === 'string') {
  const trimmedName = this.config.name.trim();
  if (trimmedName.length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  if (this.config.name.length > 100) {
    throw new Error('Workflow name cannot exceed 100 characters');
  }
}

// GOTCHA: We check this.config.name.length (not trimmed) for max length
// This matches the decision document Rule 2 exactly

// GOTCHA: We check trimmedName.length === 0 for whitespace-only detection
// This matches the decision document Rule 1 exactly

// GOTCHA: We DON'T auto-trim - we only reject if entirely whitespace
// This matches the decision document Rule 4 exactly

// Existing constructor structure for reference (lines 83-101):
constructor(name?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor<T>) {
  this.id = generateId();
  this.status = 'idle';
  this.observers = [];
  this.children = [];
  this.parent = null;

  // Class-based pattern: new Workflow(name?, parent?)
  if (typeof name !== 'object' || name === null) {
    this.config = { name: name ?? this.constructor.name };
    this.parent = parentOrExecutor as Workflow | null;
  }
  // Functional pattern: new Workflow(config, executor)
  else {
    this.config = name;
    this.executor = parentOrExecutor as WorkflowExecutor<T>;
  }

  // *** INSERT VALIDATION HERE *** (after line 94, before line 98)
  // After this point, this.config.name is set for both patterns

  this.node = new WorkflowNode({
    id: this.id,
    name: this.config.name ?? this.constructor.name,
    // ... rest of node creation
  });
}
```

### Integration Points

```yaml
VALIDATION:
  - location: "src/core/workflow.ts constructor"
  - line: "~94-97 (after config assignment, before node creation)"
  - pattern: "Standard Error throwing with descriptive messages"

TESTS:
  - update: "src/__tests__/adversarial/edge-case.test.ts:107-117"
  - add: "src/__tests__/unit/workflow.test.ts (new describe block)"
  - pattern: "expect(() => new Workflow('')).toThrow()"

COMPATIBILITY:
  - breaking: "Yes - empty names will now throw errors"
  - rationale: "Empty names provide no value and are bugs (Issue 8)"
  - migration: "Provide meaningful names instead of empty strings"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file modification - fix before proceeding
npx tsc --noEmit                    # TypeScript type checking
npm run lint                        # ESLint checking (if configured)
npm run format                      # Prettier formatting (if configured)

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the specific validation functionality
npm test -- workflow.test.ts        # Run workflow unit tests
npm test -- edge-case.test.ts       # Run adversarial edge case tests

# Full test suite for affected areas
npm test                            # Run all tests

# Expected: All tests pass. The edge-case test should now pass with the updated expectation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify workflow creation still works for valid names
node -e "
const { Workflow } = require('./dist/index.js');
class TestWF extends Workflow { async run() { return 'done'; } }

// Valid names should work
const wf1 = new TestWF('ValidName');
console.log('Valid name:', wf1.node.name);

// Undefined should use class name
const wf2 = new TestWF();
console.log('Undefined uses class name:', wf2.node.name);

// Empty should throw
try {
  new TestWF('');
  console.log('ERROR: Empty name should have thrown!');
} catch (e) {
  console.log('Empty name correctly throws:', e.message);
}
"

# Expected: Valid names work, empty names throw with correct error message
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test both constructor patterns
node -e "
const { Workflow } = require('./dist/index.js');

// Pattern 1: Class-based
try {
  const wf1 = new Workflow('   ');  // Whitespace only
  console.log('ERROR: Whitespace should have thrown!');
} catch (e) {
  console.log('Class-based pattern validation:', e.message);
}

// Pattern 2: Functional
try {
  const wf2 = new Workflow({ name: '' }, async () => {});
  console.log('ERROR: Empty should have thrown!');
} catch (e) {
  console.log('Functional pattern validation:', e.message);
}
"

# Test max length validation
node -e "
const { Workflow } = require('./dist/index.js');
class TestWF extends Workflow { async run() { return 'done'; } }

const longName = 'a'.repeat(101);
try {
  new TestWF(longName);
  console.log('ERROR: 101 chars should have thrown!');
} catch (e) {
  console.log('Max length validation:', e.message);
}

const exactly100 = 'a'.repeat(100);
const wf3 = new TestWF(exactly100);
console.log('Exactly 100 chars works:', wf3.node.name.length === 100);
"

# Expected: All validation rules work correctly for both constructor patterns
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] All tests pass: `npm test`
- [ ] Empty string names throw error with correct message
- [ ] Whitespace-only names throw error with correct message
- [ ] Names > 100 chars throw error with correct message
- [ ] Exactly 100 chars works
- [ ] Undefined/null names use class name (existing behavior)
- [ ] Both constructor patterns are validated

### Feature Validation

- [ ] Validation location: after config assignment, before node creation
- [ ] Error messages match decision document exactly
- [ ] No auto-trimming of whitespace (user intent preserved)
- [ ] Edge-case test updated and passing
- [ ] New validation tests added and passing

### Code Quality Validation

- [ ] Follows existing error throwing patterns (standard Error, descriptive messages)
- [ ] No custom error classes created
- [ ] Code is self-documenting with clear variable names
- [ ] Breaking change is documented (test expectations updated)

### Documentation & Deployment

- [ ] Code changes are minimal and focused
- [ ] No new dependencies added
- [ ] No new files created (modifications only)
- [ ] Backward compatibility handled (undefined preserved)

---

## Anti-Patterns to Avoid

- ❌ Don't auto-trim names - preserve user intent, only reject whitespace-only
- ❌ Don't use custom error classes - codebase uses standard `Error`
- ❌ Don't forget both constructor patterns - validation must work for class-based AND functional
- ❌ Don't break the undefined fallback - preserve class name default behavior
- ❌ Don't validate when this.config.name is undefined - this means class name was used (valid)
- ❌ Don't check trimmed length for max length - check original length per decision document
- ❌ Don't update the edge-case test description - only change the expectation
- ❌ Don't skip testing both constructor patterns - they handle name differently

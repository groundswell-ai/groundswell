# Implementation Context for P3.M1.T2.S1

## Work Item Context

This work item is part of **P3 (Phase 3: Minor Issues - Polish)** of the Groundswell bugfix plan.

### Parent Task Hierarchy

```
P3: Phase 3: Minor Issues - Polish
  └── P3.M1: Milestone 3.1: Documentation and DX Improvements
        ├── P3.M1.T1: Add Provider Capability Query Helpers
        │     ├── P3.M1.T1.S1: Implement supports() and requiresFeatures() methods [COMPLETE]
        │     └── P3.M1.T1.S2: Write tests for capability helpers [IN PARALLEL]
        └── P3.M1.T2: Improve JSDoc Clarity
              ├── P3.M1.T2.S1: Update Step decorator JSDoc for trackTiming default [THIS ITEM]
              └── P3.M1.T2.S2: Audit and improve other unclear JSDoc comments [PLANNED]
```

### Parallel Execution Context

**IMPORTANT**: This research is running **IN PARALLEL** while P3.M1.T1.S2 is being implemented.

- The previous work item (P3.M1.T1.S2) is implementing tests for capability helpers
- This work item (P3.M1.T2.S1) is a standalone JSDoc documentation update
- There are **no dependencies** between these work items
- They can be implemented in any order

## Contract from Previous Work Items

### From P3.M1.T1.S1 (Capability Methods Implementation)

The capability methods `supports()` and `requiresFeatures()` have been implemented in:
- `src/providers/anthropic-provider.ts` (lines 105-117)
- `src/providers/opencode-provider.ts` (lines 133-145)

This work item **does not depend** on those implementations.

### From P3.M1.T1.S2 (Capability Tests)

The test files will be created at:
- `src/__tests__/unit/providers/anthropic-provider-supports.test.ts`
- `src/__tests__/unit/providers/opencode-provider-supports.test.ts`

This work item **does not depend** on those tests.

## Files to Modify

### Primary File: src/types/decorators.ts

**Location**: `src/types/decorators.ts` line 13

**Current JSDoc**:
```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;
```

**Proposed JSDoc**:
```typescript
/** Track and emit step duration (default: true, tracked unless explicitly set to false) */
trackTiming?: boolean;
```

### Related Files (No Changes Needed)

These files contain related code but do not need modification:

1. **src/decorators/step.ts** - Contains the implementation (line 133)
   - Implementation already correct: `if (opts.trackTiming !== false)`
   - JSDoc for the Step decorator function (lines 17-28) doesn't document trackTiming

2. **src/types/index.ts** - Exports StepOptions
   - No changes needed, just re-exports

3. **PRD.md** - Contains trackTiming documentation
   - No changes needed as part of this work item

## Implementation Details

### Change Scope

- **Files to modify**: 1 file (`src/types/decorators.ts`)
- **Lines to change**: 1 line (line 13)
- **Type of change**: Documentation-only (JSDoc comment)
- **Behavior change**: None

### Exact Change Required

**File**: `src/types/decorators.ts`
**Line**: 13
**Change**: Update JSDoc comment text

```diff
- /** Track and emit step duration (default: true) */
+ /** Track and emit step duration (default: true, tracked unless explicitly set to false) */
```

## Testing

### No Tests Required

This is a **documentation-only change** that does not affect runtime behavior. No tests need to be:
- Created
- Modified
- Run

### Verification Steps

1. Read the file to verify the JSDoc comment was updated
2. Ensure no other changes were made to the file
3. Ensure the comment accurately reflects the implementation

## Build and Validation

### Level 1: File Verification

```bash
# Verify the file was modified
git diff src/types/decorators.ts

# Expected: Only the JSDoc comment on line 13 should change
```

### Level 2: Linting

```bash
# Run linter to ensure no issues
npm run lint

# Expected: No errors (documentation-only change)
```

### Level 3: TypeScript Compilation

```bash
# Verify TypeScript compilation
npm run build

# Expected: No type errors (documentation-only change)
```

### Level 4: Tests (No Changes Expected)

```bash
# Run tests to ensure no regressions
npm test

# Expected: All tests pass (documentation-only change)
```

## Anti-Patterns to Avoid

- ❌ Don't modify the implementation in `src/decorators/step.ts`
- ❌ Don't create tests for a documentation-only change
- ❌ Don't modify other JSDoc comments in the same file (out of scope)
- ❌ Don't modify the PRD.md file (out of scope)
- ❌ Don't change the behavior or add new features
- ❌ Don't reformat the entire file (only change the specific JSDoc comment)

## Success Criteria

- [ ] JSDoc comment updated in `src/types/decorators.ts` line 13
- [ ] Comment reads: "Track and emit step duration (default: true, tracked unless explicitly set to false)"
- [ ] No other changes to the codebase
- [ ] Linting passes
- [ ] TypeScript compilation succeeds
- [ ] All tests pass (unchanged)

## Points Estimate

**0.5 points** - Documentation-only change, single line update, no testing required.

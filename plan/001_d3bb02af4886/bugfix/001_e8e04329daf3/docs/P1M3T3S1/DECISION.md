# Decision: Workflow Name Validation

## Decision

**Option A: Add Validation**

Workflow names must be validated to reject empty and whitespace-only strings.

## Rationale

1. **User Experience Impact** (Primary Reason)
   - Empty workflow names provide no useful information to users
   - Tree debugger displays blank entries for empty names, creating confusion
   - Workflow names are the primary identifier for users viewing workflow structures
   - Source: Issue 8 in `plan/001_d3bb02af4886/TEST_RESULTS.md:196-217`

2. **Industry Best Practices Alignment**
   - All major workflow engines validate names (Kubernetes, Airflow, AWS Step Functions)
   - Universal requirement across all systems: names must be non-empty
   - Source: `research/external_best_practices.md` - all major systems require at least 1 character

3. **Bug vs Feature Clarity**
   - Issue 8 explicitly frames empty names as a bug ("should probably be non-empty")
   - The suggested fix is to "add validation to reject empty or whitespace-only names"
   - Empty names appearing as blank entries in the tree debugger is unintended behavior
   - Source: `plan/001_d3bb02af4886/TEST_RESULTS.md:202-203`

4. **Consistency with Existing Codebase Patterns**
   - Codebase already validates other critical inputs (circular references, duplicate registrations, null checks)
   - Validation follows established patterns: `throw new Error()` with descriptive messages
   - Source: `research/validation_patterns.md` - multiple examples of parameter validation

5. **PRD Silence is Not Permission**
   - PRD Section 3.1 specifies `name: string` with no explicit validation requirements
   - However, PRD also specifies name as "Human-readable name" - empty string is not human-readable
   - PRD silence on validation does not constitute intent to allow invalid values
   - Source: `PRD.md:56-60`

## Validation Rules

The following validation rules shall be implemented in `src/core/workflow.ts`:

### Rule 1: Non-Empty After Trim
Workflow names must contain at least one non-whitespace character.

**Invalid examples:**
- `''` (empty string)
- `'   '` (whitespace only)
- `'\t\n'` (control characters)

### Rule 2: Maximum Length
Workflow names must not exceed 100 characters.

**Rationale:** 100 characters provides a reasonable balance between usability and flexibility. AWS Step Functions uses 80, Kubernetes uses 253.

### Rule 3: Character Set
Any printable ASCII characters are allowed. No character restrictions beyond non-whitespace requirement.

**Rationale:** Groundswell workflows may benefit from descriptive names including spaces, hyphens, and other characters. Following GitHub Actions' permissive approach rather than Kubernetes' strict DNS subdomain requirement.

### Rule 4: Trim Behavior
Whitespace-only names are rejected. Names with leading/trailing whitespace are **not** auto-trimmed.

**Rationale:** Explicit user intent should be respected. If a user provides `'  MyWorkflow  '`, that is their choice. However, names that are entirely whitespace are clearly invalid.

### Rule 5: Undefined Behavior (Preserve Existing)
When `name` is `undefined` or `null`, fall back to the class name (existing behavior).

**Rationale:** The current fallback to `this.constructor.name` is useful and should be preserved.

### Error Message Format
```typescript
throw new Error('Workflow name cannot be empty or whitespace only');
```

## Examples of Valid/Invalid Names

### Valid Names
- `'MyWorkflow'`
- `'Data Processing Workflow'`
- `'Workflow-123'`
- `'test_workflow'`
- `'Parent'`, `'Child'`, `'Worker'`
- `'A'` (single character)

### Invalid Names
- `''` (empty string)
- `'   '` (whitespace only)
- `'\t\t'` (control characters)
- String exceeding 100 characters

## Implementation Location

**File:** `src/core/workflow.ts`
**Location:** After `this.config` is set, before `this.node` is created (around line 98-100)

```typescript
// Location: src/core/workflow.ts:98
// Validate workflow name (after config is normalized)
if (typeof this.config.name === 'string' && this.config.name.trim().length === 0) {
  throw new Error('Workflow name cannot be empty or whitespace only');
}
if (typeof this.config.name === 'string' && this.config.name.length > 100) {
  throw new Error('Workflow name cannot exceed 100 characters');
}
```

## References

| Source | Location | Key Finding |
|--------|----------|-------------|
| Issue 8 Bug Report | `plan/001_d3bb02af4886/TEST_RESULTS.md:196-217` | Empty names "should probably be non-empty" |
| PRD Section 3.1 | `PRD.md:56-60` | Specifies `name: string` with "Human-readable name" |
| External Best Practices | `research/external_best_practices.md` | All major systems require non-empty names |
| Codebase Validation Patterns | `research/validation_patterns.md` | Use `throw new Error()` with descriptive messages |
| Current Implementation | `src/core/workflow.ts:83-108` | No validation currently exists |
| Current Test (Will Need Update) | `src/__tests__/adversarial/edge-case.test.ts:107-117` | Currently expects empty names to work |

## Next Steps

### P1.M3.T3.S2: Implementation
1. Add validation in `src/core/workflow.ts` constructor at line ~98
2. Validation must apply to both constructor patterns (class-based and functional)
3. Validation occurs after config normalization, before node creation
4. Use standard `Error` type (no custom error classes)

### P1.M3.T3.S3: Testing
1. Update `src/__tests__/adversarial/edge-case.test.ts:107-117` to expect error
2. Add new validation tests:
   - Empty string should throw
   - Whitespace-only should throw
   - Valid names should work
   - Undefined should still use class name
   - Names exceeding 100 chars should throw
3. Test both constructor patterns (class-based and functional)

### Backward Compatibility Note
This is a **breaking change**. Code that currently uses empty workflow names will begin throwing errors. However:
- Empty names provide no value and are likely bugs
- Only one existing test explicitly verifies empty name behavior
- No production code examples found using empty names
- The fix is simple: provide a meaningful name

## Anti-Patterns to Avoid

- Don't auto-trim names - preserve user intent, only reject whitespace-only
- Don't use custom error classes - codebase uses standard `Error`
- Don't forget both constructor patterns - validation must work for both
- Don't break the undefined fallback - preserve class name default behavior

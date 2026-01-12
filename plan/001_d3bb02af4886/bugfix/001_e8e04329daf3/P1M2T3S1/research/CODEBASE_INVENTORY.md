# Codebase Inventory: @Step Decorator trackTiming

## Files Containing trackTiming References

### Type Definition
**File**: `/home/dustin/projects/groundswell/src/types/decorators.ts`
**Lines**: 11-12
```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;
```
Status: ✅ Default value documented in JSDoc

### Implementation
**File**: `/home/dustin/projects/groundswell/src/decorators/step.ts`
**Lines**: 94-101
```typescript
if (opts.trackTiming !== false) {
  wf.emitEvent({
    type: 'stepEnd',
    node: wf.node,
    step: stepName,
    duration,
  });
}
```
Status: ✅ Default behavior implemented (true unless false)

### PRD Documentation
**File**: `/home/dustin/projects/groundswell/PRD.md`
**Lines**: 177-189
```typescript
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;  // ❌ No default value documented
  logStart?: boolean;
  logFinish?: boolean;
}
```
Status: ❌ Default value NOT documented

### User Documentation
**File**: `/home/dustin/projects/groundswell/README.md`
**Lines**: 129-136
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. |
```
Status: ✅ Default value correctly documented in table

## Examples Using trackTiming

### Example File
**File**: `/home/dustin/projects/groundswell/examples/examples/02-decorator-options.ts`
**Lines**: 9-10, 69-74, 85-91

Documents usage with both default and explicit settings:
```typescript
// Default behavior - timing tracked
@Step()
async basicStep() { }

// Explicit disable
@Step({ trackTiming: false })
async highFrequencyStep() { }

// Explicit enable
@Step({ trackTiming: true })
async monitoredStep() { }
```

## Test Coverage

### Edge Case Tests
**File**: `/home/dustin/projects/groundswell/src/__tests__/adversarial/edge-case.test.ts`
**Lines**: 17-84

Tests verify:
- Default behavior (timing tracked when not specified)
- Explicit false (timing NOT tracked)
- stepEnd event emission behavior

### PRD Validation Tests
**File**: `/home/dustin/projects/groundswell/src/__tests__/adversarial/e2e-prd-validation.test.ts`
**Lines**: 137-318

Tests verify PRD compliance for trackTiming default behavior.

## Documentation Files

### Research Documentation
**File**: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/docs/research/P1M2T1S4/DECORATOR_DOCUMENTATION_QUICK_REF.md`
Contains recommendations for improving @Step decorator documentation with default values.

## Summary Table

| File | Has Default | Format | Status |
|------|-------------|--------|--------|
| `src/types/decorators.ts` | ✅ Yes | JSDoc comment | Correct |
| `src/decorators/step.ts` | ✅ Yes | Code logic | Correct |
| `PRD.md` (Section 8.1) | ❌ No | TypeScript interface | **Needs Update** |
| `README.md` | ✅ Yes | Table | Correct |
| `examples/02-decorator-options.ts` | ✅ Yes | Examples | Correct |

## Key Code Locations

| Purpose | File | Line | Description |
|---------|------|------|-------------|
| Type definition | `src/types/decorators.ts` | 11-12 | Interface with JSDoc |
| Implementation | `src/decorators/step.ts` | 94 | Default logic |
| PRD definition | `PRD.md` | 183 | Interface (no default) |
| User table | `README.md` | 132 | Table with default |

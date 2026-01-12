# PRD Location Analysis for @Step Decorator Options

## Executive Summary

This document provides the exact location of the @Step Decorator Options documentation in the PRD and identifies where the trackTiming default value needs to be documented.

## Primary PRD Location

**File**: `/home/dustin/projects/groundswell/PRD.md`
**Section**: 8.1 @Step() Decorator
**Lines**: 177-189

### Current PRD Content (Lines 177-189)

```typescript
## **8.1 @Step() Decorator**

```ts
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}

export function Step(options: StepOptions = {}): MethodDecorator;
```

**Responsibilities:**

* Emit `stepStart` + `stepEnd`.
* Optionally snapshot state.
* Catch and wrap errors into `WorkflowError`.
```

## Issue Identified

The PRD Section 8.1 defines the `trackTiming?: boolean` option but **does not explicitly state the default value**.

### Implementation Reality

The implementation clearly shows the default is `true`:

**File**: `src/decorators/step.ts`
**Line**: 94

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

The condition `opts.trackTiming !== false` means:
- Default behavior: timing IS tracked (unless explicitly disabled)
- To disable: user must set `trackTiming: false`

### Type Definition Clarity

**File**: `src/types/decorators.ts`
**Lines**: 11-12

```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;
```

The TypeScript type definition DOES include the default value in JSDoc comment, but the PRD does not.

## Other Documentation Locations

### README.md (User-Facing Documentation)

**File**: `/home/dustin/projects/groundswell/README.md`
**Lines**: 129-136

```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom step name |
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. Set to `false` to eliminate timing overhead. |
| `snapshotState` | `boolean` | `false` | Capture state snapshot after step completion |
| `logStart` | `boolean` | `false` | Log message at step start |
| `logFinish` | `boolean` | `false` | Log message at step end (includes duration) |
```

The README **correctly documents** the default value as `true` with a clear explanation.

## Documentation Gap Analysis

| Location | Has Default Value | Format | Status |
|----------|------------------|--------|--------|
| PRD.md (Section 8.1) | ❌ No | TypeScript interface | Needs update |
| src/types/decorators.ts | ✅ Yes | JSDoc comment | Correct |
| src/decorators/step.ts | ✅ Yes | Code logic | Correct |
| README.md | ✅ Yes | Table format | Correct |

## Recommended PRD Update

### Option 1: Add inline comment in interface

```typescript
export interface StepOptions {
  name?: string;                          // defaults to method name
  snapshotState?: boolean;                // defaults to false
  trackTiming?: boolean;                  // defaults to true
  logStart?: boolean;                     // defaults to false
  logFinish?: boolean;                    // defaults to false
}
```

### Option 2: Add description table (Recommended)

Add a table after the interface definition:

```typescript
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}

// Default values:
// | Option | Default | Description |
// |--------|---------|-------------|
// | name | method name | Custom step name |
// | snapshotState | false | Capture state snapshot after step completion |
// | trackTiming | true | Track and emit step duration |
// | logStart | false | Log message at step start |
// | logFinish | false | Log message at step end |
```

### Option 3: Add JSDoc-style documentation (Most Complete)

```typescript
/**
 * @Step Decorator Options
 *
 * @option name - Custom step name (default: method name)
 * @option snapshotState - Capture state snapshot after step completion (default: false)
 * @option trackTiming - Track and emit step duration in stepEnd event (default: true)
 * @option logStart - Log message at step start (default: false)
 * @option logFinish - Log message at step end including duration (default: false)
 */
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}
```

## Related Files

1. **Main PRD**: `/home/dustin/projects/groundswell/PRD.md` (lines 177-189)
2. **Type Definition**: `/home/dustin/projects/groundswell/src/types/decorators.ts` (lines 6-17)
3. **Implementation**: `/home/dustin/projects/groundswell/src/decorators/step.ts` (lines 17-101)
4. **User Documentation**: `/home/dustin/projects/groundswell/README.md` (lines 129-136)
5. **Examples**: `/home/dustin/projects/groundswell/examples/examples/02-decorator-options.ts`

## Conclusion

The exact file path and line number for the @Step decorator options documentation is:
- **File**: `/home/dustin/projects/groundswell/PRD.md`
- **Section**: 8.1 @Step() Decorator
- **Lines**: 177-189
- **Specific Line for trackTiming**: Line 183

The PRD needs to be updated to explicitly state that `trackTiming` defaults to `true`, matching the implementation and user-facing documentation.

---

## Handoff to P1.M2.T3.S2

**Next Task**: Update PRD.md line 183 to add default value documentation

**Recommended Update** (simple inline comment for PRD consistency):
```typescript
trackTiming?: boolean;  // default: true
```

**Verification Command** (run after S2 completes):
```bash
grep -A2 -B2 "trackTiming" PRD.md
```

---

**Research Task**: P1.M2.T3.S1 - Locate PRD Section for @Step Decorator Options
**Research Date**: 2026-01-12
**Next Task**: P1.M2.T3.S2 - Update PRD with trackTiming default value

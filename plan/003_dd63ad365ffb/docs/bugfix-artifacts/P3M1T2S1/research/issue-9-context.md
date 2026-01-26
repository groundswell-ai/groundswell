# Issue 9: trackTiming Default Documentation Clarity

## Summary

Issue 9 is a documentation clarity issue regarding the `trackTiming` option in the `@Step` decorator. The problem is that while the implementation correctly defaults `trackTiming` to `true` (timing is tracked unless explicitly set to `false`), the JSDoc comment doesn't clearly communicate this "opt-out" pattern to users.

## Current State

### Implementation (src/decorators/step.ts:133)

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

**Behavior**: Timing is tracked by default (true) unless explicitly disabled with `trackTiming: false`.

### JSDoc in src/types/decorators.ts:13

```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;
```

### PRD Documentation (PRD.md:555)

```typescript
trackTiming?: boolean; // Default: true - Track and emit step duration
```

## The Issue

The issue isn't about incorrect behavior, but about **clarity**. Users looking at the JSDoc might not realize that:

1. **Timing is tracked by default** - The feature is "on" unless explicitly turned off
2. **Opt-out pattern** - Users must explicitly pass `trackTiming: false` to disable timing
3. **Counter-intuitive default** - Most optional features default to false, but this one defaults to true
4. **Performance impact** - Users may be unaware they're incurring timing overhead on all steps

## Related Context

### 1. Task Tracking

This issue is tracked as part of:
- **P3.M1.T2**: "Improve JSDoc Clarity"
- **P3.M1.T2.S1**: "Update Step decorator JSDoc for trackTiming default"

### 2. Test Coverage

The issue is covered in tests like `src/__tests__/adversarial/e2e-prd-validation.test.ts` which verify the default behavior works correctly.

### 3. Documentation Gap

Multiple research documents identify this as a documentation clarity issue, not a functional bug. The behavior is correct; only the documentation needs improvement.

## Impact Assessment

| Aspect | Impact |
|--------|--------|
| **Priority** | Minor (developer experience, not functionality) |
| **Performance** | Users may be unaware of timing overhead on all steps |
| **Developer Experience** | May cause confusion when debugging performance issues |
| **Breaking Changes** | None - documentation-only change |

## Resolution

The fix involves updating the JSDoc comment to be more explicit about the default behavior.

### Current JSDoc
```typescript
/** Track and emit step duration (default: true) */
trackTiming?: boolean;
```

### Proposed JSDoc
```typescript
/** Track and emit step duration (default: true, tracked unless explicitly set to false) */
trackTiming?: boolean;
```

This change:
1. Keeps the existing `(default: true)` notation
2. Adds clarifying text about the "opt-out" behavior
3. Makes it crystal clear that timing is on by default
4. Follows the pattern from `src/types/error-strategy.ts:7` which uses `default: false, first error wins`

## Dependencies

This is a **standalone documentation change** with no dependencies on other work items. It can be implemented independently.

## Validation

After implementation, verify:
1. The JSDoc comment is updated in `src/types/decorators.ts`
2. The comment accurately reflects the implementation behavior
3. The pattern matches other JSDoc patterns in the codebase
4. No tests need to be updated (behavior unchanged)

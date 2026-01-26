# Product Requirement Prompt (PRP): Add treeUpdated emission to missing methods

---

## Goal

**Feature Goal**: Add `treeUpdated` event emissions to Workflow class methods that modify tree structure but currently don't emit this event.

**Deliverable**: Modified `src/core/workflow.ts` with `treeUpdated` emissions added to `attachChild()` and `detachChild()` methods, plus enhanced JSDoc documentation indicating event emission.

**Success Definition**:
- [ ] `attachChild()` emits `treeUpdated` event after child is attached (after line 372)
- [ ] `detachChild()` emits `treeUpdated` event after child is detached (after line 425)
- [ ] Both methods include JSDoc comments documenting `treeUpdated` emission
- [ ] Event emissions use exact pattern: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })`
- [ ] All existing tests pass
- [ ] New tests verify `treeUpdated` emission for both methods

---

## User Persona

**Target User**: Implementation agent following the audit findings from P2.M3.T1.S1.

**Use Case**: The implementation agent needs to add missing `treeUpdated` event emissions to methods identified in the audit document as having structural state changes but missing this critical notification.

**User Journey**:
1. Read the audit document to understand which methods need `treeUpdated` added
2. Review existing emission patterns in `setStatus()` and `snapshotState()`
3. Add `treeUpdated` emission to `attachChild()` after the `childAttached` event
4. Add `treeUpdated` emission to `detachChild()` after the `childDetached` event
5. Update JSDoc comments to document the event emission
6. Run tests to verify the changes work correctly

**Pain Points Addressed**:
- **Missing Notifications**: Tree structure changes (attach/detach) don't trigger tree debugger rebuilds
- **Inconsistent Event Emission**: Status changes emit `treeUpdated` but structural changes don't
- **Stale UI State**: TreeDebugger doesn't reflect current workflow topology after attach/detach

---

## Why

**Business Value and User Impact**:
- Resolves PRD Issue #6 ("Missing TreeUpdated Event on State Changes") - a MAJOR severity issue
- Restores "1:1 Tree Mirror" guarantee (PRD Section 21)
- Ensures TreeDebugger receives accurate real-time updates for structural changes
- Completes Phase 2 milestone (P2.M3: "Tree Update Event Consistency")

**Integration with Existing Features**:
- Builds on existing event system (src/types/events.ts)
- Fixes observer pattern inconsistencies identified in audit
- Enables P2.M3.T1.S3 integration tests
- Maintains backward compatibility (adds events, doesn't remove any)

**Problems Solved**:
- **Inconsistent Notifications**: Observers miss tree structure changes from attach/detach operations
- **Stale Debugger State**: TreeDebugger doesn't rebuild after structural modifications
- **Broken Invariant**: 1:1 tree mirror guarantee violated for structural changes
- **Test Coverage Gaps**: No tests verify treeUpdated emission for attach/detach

---

## What

**User-Visible Behavior and Technical Requirements**:

This PRP adds `treeUpdated` event emissions to two methods that modify workflow tree structure but currently don't emit this event. The changes are minimal and surgical.

**Scope of Changes**:

1. **Target File**: `src/core/workflow.ts` (Workflow base class)

2. **Methods to Modify**:
   - `attachChild()` (line 334-373) - Add treeUpdated emission after line 372
   - `detachChild()` (line 397-426) - Add treeUpdated emission after line 425

3. **Code Pattern to Add**:
   ```typescript
   // After the existing event emission (childAttached or childDetached), add:
   this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
   ```

4. **JSDoc Updates**:
   - Add bullet to existing JSDoc: `- Emits treeUpdated event to trigger tree debugger rebuild`
   - Consider enhanced JSDoc pattern with `@fires` tags (see research)

**Success Criteria**:
- [ ] `attachChild()` emits both `childAttached` AND `treeUpdated` events
- [ ] `detachChild()` emits both `childDetached` AND `treeUpdated` events
- [ ] Events are emitted AFTER state modifications complete
- [ ] Events use correct payload structure: `{ root: this.getRoot().node }`
- [ ] JSDoc comments document the event emission
- [ ] All existing tests pass
- [ ] New tests verify treeUpdated emissions

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Complete audit findings from P2.M3.T1.S1 identifying exact methods needing modification
- Exact code pattern to use for treeUpdated emission
- Specific line numbers where to add emissions
- JSDoc patterns to follow
- Test patterns for verification
- Research on event emission best practices

---

### Documentation & References

```yaml
# MUST READ - Input from previous task
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
  why: Audit document identifying methods missing treeUpdated emission
  section: Executive Summary, Missing treeUpdated Emission table, Detailed Method Analysis for attachChild/detachChild
  critical: Specifies exact line numbers and code patterns to use

# MUST READ - Core source files to modify
- file: src/core/workflow.ts
  why: Target file for modifications - contains attachChild() and detachChild() methods
  pattern: Event emission patterns in setStatus() (line 778) and snapshotState() (line 473)
  gotcha: Must use this.getRoot().node for root parameter, not this.node
  lines: 334-373 (attachChild), 397-426 (detachChild), 775-778 (setStatus pattern), 452-473 (snapshotState pattern)

- file: src/types/events.ts
  why: treeUpdated event type definition - understand the payload structure
  pattern: { type: 'treeUpdated'; root: WorkflowNode }
  line: ~25 (treeUpdated in discriminated union)

- file: src/types/index.ts
  why: WorkflowObserver interface - understand onTreeChanged() callback
  pattern: onTreeChanged(root: WorkflowNode): void

# MUST READ - Observer pattern context
- file: src/debugger/tree-debugger.ts
  why: Primary consumer of treeUpdated events - shows why emissions matter
  pattern: TreeDebugger rebuilds nodeMap on treeUpdated events
  line: 164-167 (treeUpdated case handler)

# MUST READ - Research findings
- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S2/research/workflow-treeupdated-patterns.md
  why: Exact implementation patterns for adding treeUpdated emissions
  section: Exact emitEvent() Code Pattern, Methods That Need treeUpdated Added, Implementation Template
  critical: Provides code templates showing exact pattern to use

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S2/research/event-type-definitions.md
  why: treeUpdated event type definition and how it differs from other events
  section: Exact treeUpdated Event Type Definition, How treeUpdated Differs from Other Events
  critical: Explains why treeUpdated uses { root } not { node }

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S2/research/test-patterns.md
  why: Test patterns for verifying treeUpdated emissions
  section: Test Template for attachChild treeUpdated, Test Template for detachChild treeUpdated
  critical: Provides complete test templates to follow

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M3T1S2/research/external-event-patterns.md
  why: Industry best practices for event emission timing and JSDoc documentation
  section: Event Emission Timing Best Practices, JSDoc Documentation Patterns for Events
  critical: Confirms emit AFTER state change is the correct pattern

# EXTERNAL RESEARCH - Event emission best practices
- url: https://nodejs.org/api/events.html
  why: Node.js EventEmitter documentation - synchronous emission after state change
  critical: Industry standard pattern to follow

- url: https://jsdoc.app/tags-event.html
  why: JSDoc @event tag documentation for documenting events
  critical: For enhancing JSDoc comments with event documentation
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # TARGET FILE - Modify attachChild() and detachChild()
│   ├── logger.ts                # WorkflowLogger (read-only context)
│   └── workflow-context.ts      # WorkflowContextImpl (out of scope)
├── types/
│   ├── events.ts                # treeUpdated event type definition
│   ├── workflow.ts              # WorkflowNode, WorkflowStatus types
│   └── index.ts                 # WorkflowObserver interface
├── debugger/
│   ├── tree-debugger.ts         # Primary treeUpdated consumer
│   └── event-replayer.ts        # Event replay with treeUpdated handling
└── __tests__/
    ├── integration/
    │   └── tree-mirroring.test.ts  # Tree invariant tests
    └── unit/
        └── workflow-emitEvent-childDetached.test.ts  # Event emission tests

plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/
├── architecture/
│   └── tree-update-audit.md     # INPUT - Audit document from P2.M3.T1.S1
└── P2M3T1S2/
    ├── PRP.md                   # OUTPUT - This file
    └── research/                # Research findings
        ├── workflow-treeupdated-patterns.md
        ├── event-type-definitions.md
        ├── test-patterns.md
        └── external-event-patterns.md
```

---

### Desired Codebase Tree with Files to be Added

```bash
# No new files to add - this PRP modifies existing src/core/workflow.ts

# Tests will be added in P2.M3.T1.S3, but you may run existing tests to verify changes
```

---

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: treeUpdated emission pattern

# 1. MUST use getRoot().node for the root parameter
# this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
# NOT: this.emitEvent({ type: 'treeUpdated', root: this.node });
# The root parameter must be the complete tree, not just current node

# 2. Emit AFTER state change, not before
# Industry best practice (confirmed by external research)
# State modification first, then event emission
# All existing emissions in workflow.ts follow this pattern

# 3. Emit treeUpdated AFTER the specific event
# Pattern: emit childAttached/childDetached first, then treeUpdated
# This matches the pattern in snapshotState() which emits multiple events

# 4. getRoot() traverses up the parent chain
# This is O(depth) where depth = tree height
# Acceptable performance because trees are typically shallow
# getRoot() includes cycle detection

# 5. treeUpdated uses unique payload structure
# Most events: { type, node }
# treeUpdated: { type, root }
# This signals "entire tree changed" not "single node changed"

# 6. Don't add duplicate emissions
# Methods that call setStatus/snapshotState transitively emit treeUpdated
# Don't add treeUpdated to restartStep(), runFunctional(), or constructor
# Only attachChild() and detachChild() need direct emissions

# 7. Event emission happens in emitEvent() method
# emitEvent() handles observer notification
# For structural events, emitEvent() also calls onTreeChanged()
# This is automatic - no need to call onTreeChanged() directly

# 8. JSDoc comments should document event emission
# Add bullet: "- Emits treeUpdated event to trigger tree debugger rebuild"
# Consider enhanced pattern with @fires tags (see external-event-patterns.md)

# 9. Test pattern uses inline observers
# Create observer with event capture arrays
// const events: WorkflowEvent[] = [];
// const observer: WorkflowObserver = {
//   onEvent: (e) => events.push(e),
//   onLog: () => {},
//   onStateUpdated: () => {},
//   onTreeChanged: () => {},
// };

# 10. Type guards required for discriminated union
// if (event.type === 'treeUpdated') {
//   expect(event.root).toBe(expectedRoot);
// }
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models needed - using existing WorkflowEvent discriminated union:

```typescript
// Existing type in src/types/events.ts
type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'treeUpdated'; root: WorkflowNode }  // This is what we emit
  // ... other event types
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ AUDIT DOCUMENT
  - READ: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/architecture/tree-update-audit.md
  - EXTRACT: Exact line numbers for attachChild() and detachChild() modifications
  - VERIFY: Current implementation matches audit findings
  - UNDERSTAND: Why these methods need treeUpdated emissions

Task 2: REVIEW EXISTING EMISSION PATTERNS
  - READ: src/core/workflow.ts lines 775-778 (setStatus pattern)
  - READ: src/core/workflow.ts lines 452-473 (snapshotState pattern)
  - NOTE: Exact syntax: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })
  - NOTE: Emission happens AFTER state change

Task 3: MODIFY attachChild() METHOD
  - FILE: src/core/workflow.ts
  - LOCATION: After line 372 (after childAttached event)
  - ADD: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  - UPDATE: JSDoc comment to document treeUpdated emission
  - PATTERN: Follow setStatus() and snapshotState() emission patterns

Task 4: MODIFY detachChild() METHOD
  - FILE: src/core/workflow.ts
  - LOCATION: After line 425 (after childDetached event)
  - ADD: this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
  - UPDATE: JSDoc comment to document treeUpdated emission
  - PATTERN: Follow setStatus() and snapshotState() emission patterns

Task 5: RUN EXISTING TESTS
  - COMMAND: npm test (or uv run pytest equivalent)
  - VERIFY: All existing tests still pass
  - CHECK: No regressions in event emission tests
  - VALIDATE: Tree mirroring tests still pass

Task 6: MANUAL VERIFICATION (optional but recommended)
  - CREATE: Simple test script to verify treeUpdated emission
  - TEST: attachChild() emits both childAttached and treeUpdated
  - TEST: detachChild() emits both childDetached and treeUpdated
  - VERIFY: Event payloads contain correct root node
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: treeUpdated emission syntax (from setStatus line 778)
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// PATTERN 2: Emission after state change (from snapshotState lines 452-473)
// 1. Modify state first
this.node.stateSnapshot = snapshot;

// 2. Emit specific event
this.emitEvent({ type: 'stateSnapshot', node: this.node });

// 3. Emit treeUpdated
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// PATTERN 3: attachChild() modification
// Current code at line 368-372:
this.emitEvent({
  type: 'childAttached',
  parentId: this.id,
  child: child.node,
});

// ADD AFTER LINE 372:
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// PATTERN 4: detachChild() modification
// Current code at line 421-425:
this.emitEvent({
  type: 'childDetached',
  parentId: this.id,
  childId: child.id,
});

// ADD AFTER LINE 425:
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });

// PATTERN 5: JSDoc enhancement (current attachChild JSDoc at line 281)
// Current:
* - Emits childAttached event to notify observers

// Add bullet:
* - Emits childAttached event to notify observers
* - Emits treeUpdated event to trigger tree debugger rebuild

// PATTERN 6: Enhanced JSDoc with @fires tag (optional, from external research)
/**
 * Attach a child workflow to this parent workflow.
 *
 * @fires {WorkflowEvent} childAttached - Emitted after child is attached
 * @fires {WorkflowEvent} treeUpdated - Emitted after tree structure changes
 */
```

---

### Integration Points

```yaml
NO NEW INTEGRATIONS - This is a surgical modification to existing code

MODIFIED FILES:
  - src/core/workflow.ts:
    modify: attachChild() method (add 1 line after line 372)
    modify: detachChild() method (add 1 line after line 425)
    modify: JSDoc comments for both methods (add 1 bullet each)

NO CHANGES TO:
  - src/types/events.ts (treeUpdated event already exists)
  - src/types/index.ts (WorkflowObserver already exists)
  - src/debugger/tree-debugger.ts (already handles treeUpdated)
  - Test files (tests added in P2.M3.T1.S3)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run lint       # or equivalent linter for this project
npm run format     # or equivalent formatter for this project

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Build & Type Checking (Component Validation)

```bash
# Verify TypeScript compilation
npm run build      # or npx tsc --noEmit

# Expected: Zero type errors. The emitEvent() call type must match WorkflowEvent discriminated union
```

### Level 3: Unit Tests (Component Validation)

```bash
# Run existing tests to verify no regressions
npm test           # or project-specific test command

# Run specific test files related to events
npm test -- workflow-emitEvent-childDetached
npm test -- tree-mirroring

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 4: Manual Verification (Integration Validation)

```bash
# Create simple verification script (optional)
cat > verify-treeupdated.js << 'EOF'
// Verification script for treeUpdated emissions
const { Workflow } = require('./src/core/workflow');

const parent = new Workflow('Parent');
const child = new Workflow('Child');

const events = [];
parent.addObserver({
  onEvent: (e) => events.push(e),
  onLog: () => {},
  onStateUpdated: () => {},
  onTreeChanged: () => {}
});

// Test attachChild
parent.attachChild(child);
const attachedEvents = events.filter(e => e.type === 'childAttached');
const treeUpdatedAfterAttach = events.filter(e => e.type === 'treeUpdated');

console.log('childAttached events:', attachedEvents.length);
console.log('treeUpdated events after attach:', treeUpdatedAfterAttach.length);

// Test detachChild
events.length = 0;
parent.detachChild(child);
const detachedEvents = events.filter(e => e.type === 'childDetached');
const treeUpdatedAfterDetach = events.filter(e => e.type === 'treeUpdated');

console.log('childDetached events:', detachedEvents.length);
console.log('treeUpdated events after detach:', treeUpdatedAfterDetach.length);

// Verify expectations
if (attachedEvents.length === 1 && treeUpdatedAfterAttach.length === 1) {
  console.log('✓ attachChild emits both events');
} else {
  console.error('✗ attachChild event emission failed');
  process.exit(1);
}

if (detachedEvents.length === 1 && treeUpdatedAfterDetach.length === 1) {
  console.log('✓ detachChild emits both events');
} else {
  console.error('✗ detachChild event emission failed');
  process.exit(1);
}

console.log('All verifications passed!');
EOF

node verify-treeupdated.js

# Expected: Both attachChild and detachChild emit treeUpdated events
```

---

## Final Validation Checklist

### Technical Validation

- [ ] attachChild() modified with treeUpdated emission after line 372
- [ ] detachChild() modified with treeUpdated emission after line 425
- [ ] Both emissions use exact pattern: `this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node })`
- [ ] JSDoc comments updated to document treeUpdated emission
- [ ] All existing tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run build`
- [ ] Manual verification confirms treeUpdated emissions

### Feature Validation

- [ ] attachChild() emits both childAttached AND treeUpdated events
- [ ] detachChild() emits both childDetached AND treeUpdated events
- [ ] Events are emitted AFTER state modifications (verified by code inspection)
- [ ] Event payloads contain correct root node (verified by manual testing)
- [ ] TreeDebugger receives treeUpdated events (inferred from existing behavior)
- [ ] No duplicate emissions (verified by code inspection)

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches setStatus/snapshotState)
- [ ] File placement unchanged (only modifying existing src/core/workflow.ts)
- [ ] Anti-patterns avoided (see below)
- [ ] No breaking changes (only additive event emissions)
- [ ] Consistent with observer pattern implementation

---

## Anti-Patterns to Avoid

- ❌ Don't emit treeUpdated BEFORE state change (must be after)
- ❌ Don't use `this.node` instead of `this.getRoot().node` for root parameter
- ❌ Don't add treeUpdated to methods that transitively emit it (restartStep, runFunctional, constructor)
- ❌ Don't skip JSDoc updates (documentation is part of the deliverable)
- ❌ Don't modify emitEvent() method (use existing implementation)
- ❌ Don't call onTreeChanged() directly (emitEvent handles this)
- ❌ Don't add treeUpdated to observer management methods (addObserver/removeObserver)
- ❌ Don't modify WorkflowEvent type (treeUpdated already exists)
- ❌ Don't create new files (this is surgical modification only)
- ❌ Don't add tests in this task (tests added in P2.M3.T1.S3)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Clear deliverable (modify 2 methods in 1 file)
- ✅ Complete audit from P2.M3.T1.S1 identifying exact changes needed
- ✅ Exact code pattern provided (emitEvent syntax)
- ✅ Specific line numbers provided
- ✅ JSDoc patterns documented
- ✅ Test patterns available for verification
- ✅ Research confirms industry best practices
- ✅ No new files or complex integrations needed
- ✅ Backward compatible (only additive changes)

**Validation**: The completed implementation will enable the TreeDebugger and other observers to receive accurate tree structure change notifications, resolving PRD Issue #6 and completing the P2.M3 milestone.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**

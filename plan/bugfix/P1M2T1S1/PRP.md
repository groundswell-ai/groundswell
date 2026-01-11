# Product Requirement Prompt (PRP): Add childDetached Event Type to events.ts

---

## Goal

**Feature Goal**: Add `childDetached` event type to the `WorkflowEvent` discriminated union to support future `detachChild()` functionality (P1.M2.T1.S3)

**Deliverable**: Updated `src/types/events.ts` with new `childDetached` case added to the `WorkflowEvent` discriminated union type

**Success Definition**:
- TypeScript compilation succeeds without errors: `npx tsc --noEmit`
- All existing tests pass: `npm test`
- The new event type follows the exact pattern of `childAttached` event
- The event type uses `childId: string` (not `child: WorkflowNode`) because the child is no longer in the tree after detachment

## Why

- **Foundation for detachChild()**: The `childDetached` event type is required for the future `detachChild()` method implementation (P1.M2.T1.S3)
- **Observer Pattern Consistency**: Observers need to be notified when children are detached from the workflow tree, just as they are notified when children are attached
- **Event System Completeness**: The event system currently has `childAttached` but lacks the complementary `childDetached` event
- **Bug Fix Context**: This is part of the larger bug fix for `attachChild()` tree integrity violation (P1), enabling proper reparenting workflow

## What

Add a new event type to the `WorkflowEvent` discriminated union in `src/types/events.ts`:

```typescript
| { type: 'childDetached'; parentId: string; childId: string }
```

**Key Design Decision**: Use `childId: string` instead of `child: WorkflowNode` because after detachment, the child node is no longer part of the parent's tree structure and may not be accessible. The ID is sufficient for observers to identify which child was detached.

### Success Criteria

- [ ] New `childDetached` event type added to `WorkflowEvent` discriminated union
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] All existing tests pass: `npm test`
- [ ] Event type placement follows existing pattern (in Core workflow events section, near `childAttached`)
- [ ] Event type uses correct payload structure: `{ type: 'childDetached'; parentId: string; childId: string }`

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file location and line numbers to modify
- The complete existing code pattern to follow
- The specific code snippet to add
- Validation commands to verify success
- Links to TypeScript discriminated union documentation
- Codebase-specific patterns and gotchas

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
  why: Official TypeScript documentation on discriminated unions - understand the pattern used in WorkflowEvent
  critical: The `type` property is the discriminator that allows TypeScript to narrow types

- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  why: Comprehensive type narrowing guide - discriminated unions are a key pattern
  critical: Understanding how discriminated unions enable type-safe event handling

- file: /home/dustin/projects/groundswell/src/types/events.ts
  why: THIS IS THE FILE TO MODIFY - contains the WorkflowEvent discriminated union definition
  pattern: Study line 10 for childAttached event structure; add childDetached immediately after it
  gotcha: Event types are organized into sections (Core workflow events, Agent/Prompt events, Tool events, etc.)

- file: /home/dustin/projects/groundswell/src/core/workflow.ts
  why: Contains emitEvent() implementation - shows how events are emitted and consumed
  pattern: Lines 259-275 show emitEvent() method that will emit childDetached events in future tasks
  gotcha: emitEvent() has special handling for tree-changing events (childAttached, treeUpdated) - childDetached may need similar treatment in P1.M2.T1.S4

- file: /home/dustin/projects/groundswell/plan/docs/bugfix-architecture/bug_analysis.md
  why: Provides context for why childDetached event is needed as part of the bug fix
  section: Lines 288-302 show the childDetached event type specification
  gotcha: This task is ONLY about adding the type definition - detachChild() implementation is a separate task (P1.M2.T1.S3)

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: Contains WorkflowNode interface - understand the data structure that events reference
  pattern: Lines 20-37 show WorkflowNode interface with id, name, parent, children properties
  gotcha: childDetached uses childId (string) not child (WorkflowNode) because child is no longer in tree

- file: /home/dustin/projects/groundswell/src/__tests__/unit/workflow.test.ts
  why: Shows existing test patterns for childAttached event - informs future childDetached testing
  pattern: Lines 63-80 show childAttached event emission test
  gotcha: This task doesn't require writing tests - that's P1.M2.T1.S2
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── types/
│   │   ├── events.ts          # TARGET FILE - Add childDetached event type here
│   │   ├── workflow.ts        # WorkflowNode interface definition
│   │   ├── observer.ts        # WorkflowObserver interface with onEvent method
│   │   └── index.ts           # Type exports
│   ├── core/
│   │   └── workflow.ts        # Workflow class with emitEvent() method
│   └── __tests__/
│       └── unit/
│           └── workflow.test.ts  # Existing childAttached event tests
├── plan/
│   └── bugfix/
│       └── P1M2T1S1/
│           └── PRP.md         # This file
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Desired Codebase Tree with Files to be Modified

```bash
# ONLY ONE FILE IS MODIFIED IN THIS TASK:
src/
└── types/
    └── events.ts              # MODIFY: Add childDetached event type to WorkflowEvent union
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript Discriminated Union Pattern
// - All WorkflowEvent types use 'type' property as discriminator (string literal)
// - The discriminated union enables type narrowing in switch statements
// - DO NOT add the 'childDetached' case in the middle of another section
// - Place it AFTER 'childAttached' in the "Core workflow events" section

// CRITICAL: childId vs child Property Design Decision
// - childAttached uses: child: WorkflowNode (full node reference)
// - childDetached uses: childId: string (only ID, not full node)
// - REASON: After detachment, the child node is no longer in the parent's tree
//   and may not be accessible via parent.children array
// - The ID is sufficient for observers to identify which child was detached

// CRITICAL: Event Type Organization
// - Events are grouped into sections with comment headers
// - Core workflow events: childAttached, stateSnapshot, stepStart, stepEnd, error, taskStart, taskEnd, treeUpdated
// - Agent/Prompt events: agentPromptStart, agentPromptEnd
// - Tool events: toolInvocation
// - MCP events: mcpEvent
// - Reflection events: reflectionStart, reflectionEnd
// - Cache events: cacheHit, cacheMiss
// - ADD childDetached in the "Core workflow events" section, AFTER childAttached

// GOTCHA: Future Task Dependency
// - P1.M2.T1.S4 will update emitEvent() to handle childDetached events
// - P1.M2.T1.S4 will add special handling similar to childAttached (triggering onTreeChanged)
// - For THIS task, ONLY add the type definition - do NOT modify emitEvent()

// GOTCHA: Type Import Structure
// - events.ts imports WorkflowNode from './workflow.js'
// - The new event type only needs string types (parentId, childId) - no new imports required

// GOTCHA: Observer Pattern
// - Observers receive events via onEvent(event: WorkflowEvent) method
// - They use event.type to discriminate and handle different event types
// - Adding a new event type means observers can now receive and handle it
// - Observers are NOT required to handle all event types (they can ignore unknown types)
```

## Implementation Blueprint

### Data Models and Structure

No new data models are created in this task. We are extending an existing discriminated union type.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ src/types/events.ts
  - EXAMINE: Current WorkflowEvent discriminated union structure (lines 8-74)
  - IDENTIFY: Core workflow events section (lines 9-17)
  - LOCATE: childAttached event type definition (line 10)
  - UNDERSTAND: Pattern: { type: 'childAttached'; parentId: string; child: WorkflowNode }
  - PLACEMENT: Target insertion point is AFTER line 10 (childAttached)

Task 2: MODIFY src/types/events.ts
  - ADD: New childDetached event type to WorkflowEvent discriminated union
  - CODE SNIPPET:
    ```typescript
    | { type: 'childDetached'; parentId: string; childId: string }
    ```
  - PLACEMENT: Add immediately AFTER line 10 (after childAttached event type)
  - FORMATTING: Align with existing event type indentation
  - SEPARATION: Add a blank line before the next event type (stateSnapshot)

Task 3: VERIFY TypeScript Compilation
  - RUN: npx tsc --noEmit
  - EXPECTED: Zero type errors
  - IF ERRORS: Check for typos in event type definition, verify proper syntax
  - GOTCHA: Missing comma or incorrect bracket placement will cause compilation errors

Task 4: VERIFY Existing Tests Pass
  - RUN: npm test
  - EXPECTED: All existing tests pass (no test modifications in this task)
  - REASON: Adding a new discriminated union case is backward compatible
  - GOTCHA: If tests fail, it may indicate a syntax error in the type definition
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// EXISTING PATTERN TO FOLLOW (childAttached)
// ============================================
// File: src/types/events.ts, Line 10
// { type: 'childAttached'; parentId: string; child: WorkflowNode }

// ============================================
// NEW EVENT TYPE TO ADD (childDetached)
// ============================================
// Add this AFTER line 10:
// { type: 'childDetached'; parentId: string; childId: string }

// ============================================
// COMPLETE CODE CONTEXT (AFTER MODIFICATION)
// ============================================
// File: src/types/events.ts
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }  // NEW - ADD THIS LINE
  | { type: 'stateSnapshot'; node: WorkflowNode }
  // ... rest of event types ...

// ============================================
// DESIGN RATIONALE: childId vs child
// ============================================
// childAttached uses child: WorkflowNode because:
// - The child is being added to the tree
// - The parent has full access to the child node
// - Observers may want to inspect the child node properties

// childDetached uses childId: string because:
// - The child is being removed from the tree
// - After detachment, child.parent is null
// - The child is no longer in parent.children array
// - Full node reference may not be meaningful/accessible
// - The ID is sufficient to identify which child was detached

// ============================================
// DISCRIMINATED UNION TYPE NARROWING
// ============================================
// Observers can use the 'type' property to narrow:
function handleEvent(event: WorkflowEvent) {
  if (event.type === 'childDetached') {
    // TypeScript knows event has: parentId, childId
    console.log(`Child ${event.childId} detached from ${event.parentId}`);
  } else if (event.type === 'childAttached') {
    // TypeScript knows event has: parentId, child
    console.log(`Child ${event.child.name} attached to ${event.parentId}`);
  }
}

// ============================================
// SWITCH STATEMENT PATTERN (from src/core/event-tree.ts)
// ============================================
// Future task P1.M2.T1.S4 may add handling:
switch (event.type) {
  case 'childAttached':
    // Handle child attachment
    break;
  case 'childDetached':  // NEW - Will be added in P1.M2.T1.S4
    // Handle child detachment
    break;
  // ... other cases ...
}
```

### Integration Points

```yaml
NO INTEGRATION POINTS IN THIS TASK:
  - This task ONLY adds a type definition
  - No emitEvent() modifications (that's P1.M2.T1.S4)
  - No detachChild() implementation (that's P1.M2.T1.S3)
  - No test writing (that's P1.M2.T1.S2)

FUTURE INTEGRATION (for reference):
  - emitEvent: P1.M2.T1.S4 will add childDetached handling to emitEvent()
  - detachChild: P1.M2.T1.S3 will implement the method that emits childDetached events
  - observers: Observers can handle childDetached events via onEvent() callback
  - tree debugger: May need to handle childDetached events (P1.M2.T1.S4 consideration)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file modification - fix before proceeding
npx tsc --noEmit              # TypeScript type checking (no emit)
npm run lint                  # ESLint checking (if configured)
npm run format                # Prettier formatting (if configured)

# Project-specific validation (based on package.json scripts)
npm run check:types           # May be aliased in package.json
npm run lint                  # May check formatting and linting

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Common TypeScript errors to watch for:
# - ',' expected              → Missing comma between union members
# - ')' expected              → Missing closing parenthesis or bracket
# - Property 'childId' does not exist → Wrong type name (should be childId, not child)
# - Type 'string' is not assignable → Wrong type annotation
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test that existing functionality is not broken
npm test                      # Run all tests
npm test -- workflow.test.ts  # Run specific workflow tests

# Expected: All tests pass. This task adds a type definition only,
# which is backward compatible. No tests should fail.

# If tests fail unexpectedly:
# 1. Check for syntax errors in events.ts
# 2. Verify the discriminated union syntax is correct
# 3. Ensure proper comma placement between union members
```

### Level 3: Integration Testing (System Validation)

```bash
# Type system validation - verify discriminated union works
npx tsc --noEmit              # TypeScript compilation check

# Manual type narrowing test (create temp test file):
# echo "import { WorkflowEvent } from './src/types/events.js';
#        function test(event: WorkflowEvent) {
#          if (event.type === 'childDetached') {
#            console.log(event.childId);
#          }
#        }" > /tmp/test-type.ts
# npx tsc --noEmit /tmp/test-type.ts

# Expected: Type narrowing works correctly. TypeScript should:
# 1. Allow accessing childId when event.type === 'childDetached'
# 2. Not allow accessing childId on other event types
# 3. Show proper autocomplete for childDetached event properties
```

### Level 4: Creative & Domain-Specific Validation

```bash
# TypeScript Language Server Validation (IDE integration)
# 1. Open src/types/events.ts in VS Code or similar IDE
# 2. Hover over the new childDetached event type
# 3. Verify no red squiggly lines (type errors)
# 4. Use "Go to Definition" on WorkflowEvent to see the full union
# 5. Verify childDetached appears in the type definition

# Discriminated Union Exhaustiveness Check
# Create a test function that switches on event.type:
# echo "import { WorkflowEvent } from './src/types/events.js';
#        function handleAllEvents(event: WorkflowEvent) {
#          switch (event.type) {
#            case 'childDetached':
#              console.log(event.childId);
#              break;
#            // ... other cases ...
#            default:
#              const _exhaustiveCheck: never = event;
#              break;
#          }
#        }" > /tmp/exhaustiveness.ts
# npx tsc --noEmit /tmp/exhaustiveness.ts

# Expected: TypeScript should NOT error on the default case,
# because we're not handling all event types in the switch.

# Documentation Generation (if project uses typedoc)
npm run docs                  # Generate type documentation
# Expected: childDetached event type appears in generated docs
```

## Final Validation Checklist

### Technical Validation

- [ ] Level 1 validation completed: `npx tsc --noEmit` passes with zero errors
- [ ] Level 2 validation completed: `npm test` passes all existing tests
- [ ] Type definition follows exact pattern of childAttached event
- [ ] Event type uses correct payload: `{ type: 'childDetached'; parentId: string; childId: string }`
- [ ] Event type placed in correct location (after childAttached, before stateSnapshot)
- [ ] Proper formatting matches existing code style

### Feature Validation

- [ ] childDetached event type added to WorkflowEvent discriminated union
- [ ] TypeScript discriminates properly on event.type === 'childDetached'
- [ ] Type narrowing provides access to parentId and childId properties
- [ ] No new imports required (only uses string types)
- [ ] Backward compatible - all existing code still compiles

### Code Quality Validation

- [ ] Follows existing discriminated union pattern in events.ts
- [ ] Placement in "Core workflow events" section
- [ ] Comment headers preserved (Core workflow events comment above)
- [ ] Consistent with childAttached structure (mirror pattern)

### Documentation & Deployment

- [ ] Type definition is self-documenting (property names are clear)
- [ ] No additional documentation needed (type definition is sufficient)
- [ ] No environment variables or configuration changes

---

## Anti-Patterns to Avoid

- ❌ **Don't add child: WorkflowNode** - Use childId: string instead (child is no longer in tree)
- ❌ **Don't place in wrong section** - Add to "Core workflow events", not "Agent/Prompt events"
- ❌ **Don't modify emitEvent()** - That's a separate task (P1.M2.T1.S4)
- ❌ **Don't write tests** - That's a separate task (P1.M2.T1.S2)
- ❌ **Don't implement detachChild()** - That's a separate task (P1.M2.T1.S3)
- ❌ **Don't add new imports** - Event type only uses string types (no WorkflowNode needed)
- ❌ **Don't break existing pattern** - Follow childAttached structure exactly
- ❌ **Don't skip validation** - Always run `npx tsc --noEmit` after modification

---

## References

- **Bug Analysis**: `/home/dustin/projects/groundswell/plan/docs/bugfix-architecture/bug_analysis.md`
- **Events Type File**: `/home/dustin/projects/groundswell/src/types/events.ts`
- **Workflow Class**: `/home/dustin/projects/groundswell/src/core/workflow.ts`
- **Task Status**: P1.M2.T1.S1 (1 point) - Add childDetached event type to events.ts
- **Next Tasks**:
  - P1.M2.T1.S2: Write failing tests for detachChild()
  - P1.M2.T1.S3: Implement detachChild() method
  - P1.M2.T1.S4: Update emitEvent() to handle childDetached events

---

## Confidence Score

**8/10** - One-pass implementation success likelihood

**Justification**:
- ✅ Clear, single-file modification with exact location specified
- ✅ Well-defined pattern to follow (childAttached event type)
- ✅ Type-only change with no runtime behavior modifications
- ✅ Backward compatible - won't break existing code
- ✅ Comprehensive validation commands provided
- ⚠️ Minor risk: Developer might place event in wrong section or use wrong property names (mitigated by clear instructions)

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to add the childDetached event type successfully using only the PRP content and codebase access.

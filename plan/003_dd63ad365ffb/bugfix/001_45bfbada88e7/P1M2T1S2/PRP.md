# Product Requirement Prompt (PRP): P1.M2.T1.S2 - Add invalidResponse event type

## Goal

**Feature Goal**: Add `invalidResponse` event type to the WorkflowEvent discriminated union to support tracking when agent responses fail schema validation.

**Deliverable**: New discriminated union member in WorkflowEvent type definition at `src/types/events.ts`.

**Success Definition**: The invalidResponse event type is properly typed with correct properties (type, node, response, agentId, errors, timestamp) and can be emitted when `validateAgentResponse()` detects validation failures.

## User Persona (if applicable)

**Target User**: Developer implementing workflow-level agent response validation

**Use Case**: When a workflow step validates an agent response and the response fails schema validation, the workflow needs to emit an event that observers can track for monitoring, debugging, and recovery patterns.

**User Journey**:
1. Agent returns a response (either malformed or with invalid data schema)
2. Workflow step calls `validateAgentResponse(response, agentId, schema)`
3. Validation fails, triggering event emission
4. Observer receives `invalidResponse` event with ZodError details
5. Observer can log the failure, trigger recovery (restart), or alert monitoring systems

**Pain Points Addressed**: Without this event type, validation failures would be silent to observers, making debugging and monitoring agent response quality difficult.

## Why

- **Business value and user impact**: Enables observability into agent response validation failures, critical for production monitoring and debugging AI agent behavior
- **Integration with existing features**: Works with the `validateAgentResponse()` method implemented in P1.M2.T1.S1; observers already exist for workflow events
- **Problems this solves and for whom**: Solves the lack of visibility into when agents return malformed or schema-invalid responses; helps developers identify and fix agent prompt or schema issues

## What

Add a new discriminated union member to the `WorkflowEvent` type that represents when an agent response fails validation.

### Success Criteria

- [ ] New `invalidResponse` event type added to WorkflowEvent discriminated union
- [ ] Event type includes all required properties: type, node, response, agentId, errors (ZodError), timestamp
- [ ] Event follows existing event type pattern with discriminant field
- [ ] Event is properly typed and compatible with observer pattern
- [ ] TypeScript compilation succeeds with no type errors

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Validation**: This PRP provides the exact file location, pattern to follow, complete type structure, and context from existing similar events. A developer unfamiliar with the codebase can add this event type by following the established pattern.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: src/types/events.ts
  why: This is the target file where the event type must be added. Contains the WorkflowEvent discriminated union definition with all existing event types.
  pattern: Discriminated union pattern using `| { type: 'eventName', ...properties }` syntax. All events have a `type` field as the discriminant and most include `timestamp: number`.
  gotcha: The file uses `import type { z } from 'zod'` for type-only import. Use `z.ZodError` for the errors field type.

- file: src/types/events.ts
  why: Reference existing similar event types for pattern matching. The `stepRetry` event (line 17) and `stepRestarted` event (line 19) are good examples of validation-related events.
  pattern: Events related to validation and errors: `stepRetry`, `stepRestarted`, `reflectionFailed`, `cacheError`. All follow structure: `{ type: 'eventName', node: WorkflowNode, ..., timestamp: number }`
  gotcha: Some events include `node: WorkflowNode` for workflow context. For invalidResponse, include node to identify which workflow emitted the event.

- file: src/core/workflow.ts
  why: Contains the `validateAgentResponse()` method (lines 729-773) that will emit this event. Shows how the event is constructed and emitted.
  pattern: Event emission uses `this.emitEvent({ type: 'invalidResponse', node: this.node, response, agentId, errors: zodError, timestamp: Date.now() })`
  gotcha: The method already exists and emits the event. Ensure the type definition matches the emitted structure exactly.

- file: src/types/agent.ts
  why: Contains the `AgentResponse<T>` interface definition (lines 324-357). Needed to understand the response type for the event.
  pattern: `AgentResponse<T>` has status, data, error, and metadata fields. Use `AgentResponse<unknown>` for the event type since validation can fail on any response type.
  gotcha: The response can be any generic type T. Use `AgentResponse<unknown>` to be type-safe while accepting any response.

- file: src/__tests__/unit/workflow-validate-agent-response.test.ts
  why: Contains comprehensive tests for the validateAgentResponse method including tests that verify invalidResponse event emission (lines 100-210).
  pattern: Tests use observer pattern with `onEvent` callback and filter events by type: `event?.type === 'invalidResponse'`
  gotcha: Tests verify event properties: type, agentId, response, errors (ZodError with errors array), timestamp, node.id matching workflow.id

- file: plan/003_dd63ad365ffb/docs/P1M2T1S1_validateAgentResponse_PRP.md
  why: PRP for the validateAgentResponse method that uses this event type. Provides context on how the event fits into the larger validation feature.
  section: "What" section describes the invalidResponse event structure and emission trigger.
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
src/
├── types/
│   ├── events.ts          # TARGET FILE - Add invalidResponse event type here
│   ├── agent.ts           # Contains AgentResponse interface
│   ├── workflow.ts        # Contains WorkflowNode interface
│   └── ...
├── core/
│   ├── workflow.ts        # Contains validateAgentResponse() method that emits the event
│   └── ...
└── __tests__/
    └── unit/
        └── workflow-validate-agent-response.test.ts  # Tests for validation feature
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# No new files - this is a type definition addition to existing file
src/types/events.ts  # MODIFY - Add invalidResponse discriminated union member
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Use type-only import for Zod in type definitions
// The file uses: import type { z } from 'zod'
// This means z.ZodError is available as a type annotation, not a runtime value

// CRITICAL: WorkflowEvent uses discriminated union pattern
// Each event type must have a unique 'type' literal as the discriminant
// Format: { type: 'eventName', ...properties }

// CRITICAL: Most events include timestamp: number
// Follow this convention for consistency with other events

// CRITICAL: Events include node: WorkflowNode for workflow context
// This allows observers to identify which workflow emitted the event

// CRITICAL: ZodError type from zod library
// The errors field must be typed as z.ZodError, not just ZodError
// z.ZodError has an `errors` property containing array of validation issues
```

## Implementation Blueprint

### Data models and structure

This task involves adding a type definition, not creating new data models. The type structure is:

```typescript
// Add to WorkflowEvent discriminated union in src/types/events.ts
| {
    type: 'invalidResponse';
    node: WorkflowNode;
    response: AgentResponse<unknown>;
    agentId: string;
    errors: z.ZodError;
    timestamp: number;
  }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/events.ts
  - ADD: New discriminated union member for invalidResponse event type
  - FIND pattern: Existing event types in WorkflowEvent union (lines 13-52)
  - FOLLOW pattern: Use same structure as stepRetry (line 17) and stepRestarted (line 19) events
  - TYPE: { type: 'invalidResponse', node: WorkflowNode, response: AgentResponse<unknown>, agentId: string, errors: z.ZodError, timestamp: number }
  - PLACEMENT: Add to WorkflowEvent discriminated union, logically grouped with validation/error events (after stepRestarted, before reflectionFailed)
  - NAMING: Use 'invalidResponse' (camelCase string literal) for type discriminant
  - DEPENDENCIES: None - this is the foundational type definition

Task 2: VERIFY TypeScript compilation
  - RUN: tsc --noEmit or npm run type-check to verify no type errors
  - VERIFY: WorkflowEvent type includes new invalidResponse member
  - VERIFY: Observer onEvent callbacks can receive invalidResponse events
  - DEPENDENCIES: Task 1

Task 3: VERIFY existing tests pass
  - RUN: npm test -- src/__tests__/unit/workflow-validate-agent-response.test.ts
  - VERIFY: Tests that verify invalidResponse event emission pass
  - VERIFY: Event type matches emitted structure from validateAgentResponse()
  - DEPENDENCIES: Task 1, Task 2
```

### Implementation Patterns & Key Details

```typescript
// Show critical patterns and gotchas - keep concise, focus on non-obvious details

// PATTERN: Discriminated union member for WorkflowEvent
// Location: src/types/events.ts, line ~22 (after stepRestarted event)
// Add this to the WorkflowEvent type definition:

| {
    // Discriminant field - must be unique string literal
    type: 'invalidResponse';

    // Workflow context - identifies which workflow emitted the event
    node: WorkflowNode;

    // The invalid response that failed validation
    response: AgentResponse<unknown>;

    // ID of the agent that produced the invalid response
    agentId: string;

    // Zod validation error with detailed error information
    errors: z.ZodError;

    // Event emission timestamp (milliseconds since epoch)
    timestamp: number;
  }

// GOTCHA: The response type uses AgentResponse<unknown>
// Reason: Validation can fail on any response type, regardless of generic T
// Using <unknown> is type-safe while accepting any AgentResponse variant

// GOTCHA: Use z.ZodError, not just ZodError
// Reason: The file imports z as a type: "import type { z } from 'zod'"
// This makes z.ZodError available as a type annotation

// PATTERN: Placement in discriminated union
// Insert logically after stepRestarted (line 19), before reflectionFailed (line 22)
// This groups validation-related events together

// CRITICAL: No breaking changes
// Adding to discriminated union is non-breaking
// Existing observers that don't handle invalidResponse will simply ignore it
// New observers can add case handling: if (event.type === 'invalidResponse') { ... }
```

### Integration Points

```yaml
TYPE_SYSTEM:
  - modification: "Add invalidResponse to WorkflowEvent discriminated union"
  - location: "src/types/events.ts"
  - compatibility: "Non-breaking change - extends existing type"

VALIDATION_METHOD:
  - usage: "validateAgentResponse() in src/core/workflow.ts already emits this event"
  - verify: "Ensure emitted structure matches type definition exactly"
  - properties: "type, node, response, agentId, errors, timestamp"

OBSERVER_PATTERN:
  - integration: "Observers receive invalidResponse via onEvent(event) callback"
  - pattern: "Filter by event.type === 'invalidResponse' to handle this event type"
  - example: "See tests in workflow-validate-agent-response.test.ts lines 116-127"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file modification - fix before proceeding
npx tsc --noEmit                      # TypeScript type checking - must have zero errors
npx eslint src/types/events.ts        # Lint check - must have zero errors

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the validateAgentResponse method which emits this event
npm test -- src/__tests__/unit/workflow-validate-agent-response.test.ts

# Run specific tests that verify invalidResponse event
npm test -- --testNamePattern="should emit invalidResponse event"
npm test -- --testNamePattern="should include ZodError in event payload"
npm test -- --testNamePattern="should use workflow ID in event context"

# Full test suite for validation
npm test

# Expected: All tests pass. The existing tests already verify the invalidResponse event structure.
```

### Level 3: Integration Testing (System Validation)

```bash
# Type checking - verify WorkflowEvent includes invalidResponse
node -e "import('./src/index.js').then(m => console.log('Types loaded successfully'))"

# Verify no runtime type errors in workflow execution
npm test -- --testNamePattern="should work with restart pattern after validation failure"

# Expected: All integration tests pass, event is properly typed and emitted.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify type narrowing works correctly with discriminated union
# Create a test file that checks TypeScript type narrowing:
cat > /tmp/test-event-type.ts << 'EOF'
import type { WorkflowEvent } from './src/types/events.js';

function handleEvent(event: WorkflowEvent) {
  if (event.type === 'invalidResponse') {
    // TypeScript should narrow to invalidResponse type
    const errors = event.errors; // z.ZodError
    const agentId = event.agentId; // string
    const response = event.response; // AgentResponse<unknown>
    console.log('Type narrowing works!', errors.errors.length);
  }
}
EOF
npx tsc --noEmit /tmp/test-event-type.ts

# Expected: Zero type errors, TypeScript correctly narrows type based on discriminant
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] No linting errors: `npx eslint src/types/events.ts`
- [ ] Type definition matches emitted structure from validateAgentResponse()
- [ ] Discriminated union properly typed with unique 'invalidResponse' literal
- [ ] z.ZodError type is correctly used (errors field)

### Feature Validation

- [ ] invalidResponse event type added to WorkflowEvent discriminated union
- [ ] Event includes all required properties: type, node, response, agentId, errors, timestamp
- [ ] Event follows existing event type pattern (discriminant field, timestamp)
- [ ] Type narrowing works correctly with TypeScript
- [ ] Existing tests for validateAgentResponse() pass (they verify this event)

### Code Quality Validation

- [ ] Follows existing event type naming conventions
- [ ] Properties are in consistent order with other events
- [ ] Type uses `z.ZodError` from type-only import
- [ ] Event type is logically grouped with validation/error events
- [ ] No breaking changes to existing WorkflowEvent consumers

### Documentation & Deployment

- [ ] Type is self-documenting with clear property names
- [ ] Event structure matches the emitted event from validateAgentResponse()
- [ ] No additional documentation needed (type definition is documentation)

---

## Anti-Patterns to Avoid

- Don't forget the `z.` prefix when using `z.ZodError` type
- Don't add runtime logic - this is a type definition only
- Don't modify existing event types - only add the new one
- Don't place the new event randomly in the union - group with validation/error events
- Don't use `ZodError` directly - must use `z.ZodError` from the type import
- Don't omit the `timestamp` field - all events have timestamps
- Don't omit the `node` field - events need workflow context
- Don't forget this was already implemented - verify current state before making changes

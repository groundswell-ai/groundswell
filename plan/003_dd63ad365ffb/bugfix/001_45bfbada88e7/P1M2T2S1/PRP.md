# Product Requirement Prompt (PRP): Add Automatic Validation Hook to Workflow Context

---

## Goal

**Feature Goal**: Integrate automatic AgentResponse validation into workflow step execution, enabling workflows to automatically validate agent responses after each `agent.prompt()` call and emit `invalidResponse` events with detailed error context when validation fails.

**Deliverable**: Modified workflow context (`src/core/workflow-context.ts`) with automatic validation hook that:
1. Checks if step results are `AgentResponse` objects
2. Calls `validateAgentResponse()` utility when appropriate
3. Emits `invalidResponse` events on validation failure
4. Throws `WorkflowError` with `INVALID_RESPONSE_FORMAT` context
5. Provides opt-in configuration via `WorkflowConfig.autoValidateResponses` (default: `true`)

**Success Definition**:
- Workflow steps automatically validate `AgentResponse` returns when `autoValidateResponses` is enabled
- Validation failures emit `invalidResponse` events with full error context
- Existing workflow patterns continue to work (backward compatibility)
- Configuration flag allows disabling automatic validation when needed
- All existing tests pass plus new integration tests

## User Persona

**Target User**: Workflow developers using agent orchestration in the Groundswell framework

**Use Case**: When executing agent prompts within workflow steps, developers want automatic response validation to catch malformed agent responses early and emit structured events for monitoring and debugging.

**User Journey**:
1. Developer creates workflow with `autoValidateResponses: true` (default)
2. Workflow executes steps that call `agent.prompt()`
3. After each step completes, context checks if result is `AgentResponse`
4. If yes, calls `validateAgentResponse()` utility automatically
5. On validation failure: emits `invalidResponse` event, throws `WorkflowError`
6. Developer can observe validation failures via event observers

**Pain Points Addressed**:
- Manual validation in every step is tedious and error-prone
- Malformed agent responses cause silent failures downstream
- No structured events for validation failure monitoring
- Debugging invalid responses requires manual instrumentation

## Why

- **Operational Excellence**: Automatic validation catches malformed agent responses immediately, preventing downstream errors
- **Developer Experience**: Eliminates boilerplate validation code in every step
- **Observability**: Structured `invalidResponse` events enable monitoring and alerting
- **Integration**: Uses existing `validateAgentResponse` utility from P1.M2.T1.S3
- **Backward Compatibility**: Opt-in design (default `true`) preserves existing workflows while enabling automatic validation for new code

## What

Modify the workflow context's `step()` method to automatically validate `AgentResponse` results:

### Success Criteria

- [ ] Workflow context validates `AgentResponse` results after step execution
- [ ] Validation failures emit `invalidResponse` event with `ZodError` details
- [ ] Validation failures throw `WorkflowError` with `INVALID_RESPONSE_FORMAT` context
- [ ] `WorkflowConfig.autoValidateResponses` flag controls behavior (default: `true`)
- [ ] Non-`AgentResponse` results pass through unchanged
- [ ] Existing workflow usage patterns continue to work
- [ ] Integration tests cover validation on/off scenarios

## All Needed Context

### Context Completeness Check

_Validation: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**YES** - This PRP provides:
- Exact file locations for all modifications
- Complete code patterns from existing implementations
- Type definitions and interfaces to use
- Validation utility specification with imports
- Event emission patterns with examples
- Error handling patterns with gotchas
- Test patterns to follow

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: file:///home/dustin/projects/groundswell/src/core/workflow-context.ts
  why: Core implementation file - modify step() method to add validation hook
  critical: The step() method (lines 79-195) is where validation must be inserted after line 124 (result = await runInContext(...))

- url: file:///home/dustin/projects/groundswell/src/utils/agent-validation.ts
  why: Contains validateAgentResponse utility to call for validation
  critical: Lines 91-108 - pure function, returns ValidationResult { valid: boolean, errors?: ZodError }

- url: file:///home/dustin/projects/groundswell/src/core/workflow.ts
  why: Reference for Workflow.validateAgentResponse pattern (lines 729-770)
  critical: Shows how to emit invalidResponse event and create WorkflowError from validation failure

- url: file:///home/dustin/projects/groundswell/src/types/workflow-context.ts
  why: WorkflowConfig interface - add autoValidateResponses flag
  critical: Lines 144-150 - add `autoValidateResponses?: boolean` with JSDoc

- url: file:///home/dustin/projects/groundswell/src/types/agent.ts
  why: AgentResponse interface definition for type guard
  critical: Lines 324-357 - AgentResponse<T> interface with status field

- url: file:///home/dustin/projects/groundswell/src/types/events.ts
  why: Event type definitions for invalidResponse event
  critical: Line 22 - invalidResponse event type structure

- url: file:///home/dustin/projects/groundswell/src/types/error.ts
  why: WorkflowError interface for error creation
  critical: WorkflowError interface with message, original, workflowId, stack, state, logs fields

- url: file:///home/dustin/projects/groundswell/src/__tests__/unit/workflow-validate-agent-response.test.ts
  why: Reference test patterns for validation behavior
  pattern: Test structure for validation success/failure, event emission, error creation

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M2T2S1/research/workflow-context-analysis.md
  why: Detailed analysis of workflow context implementation and validation integration points

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M2T2S1/research/validation-hook-patterns.md
  why: External research on validation hook patterns and best practices
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow-context.ts    # MODIFY: Add validation hook to step() method
│   ├── workflow.ts            # REFERENCE: validateAgentResponse pattern
│   └── context.ts             # REFERENCE: runInContext, AgentExecutionContext
├── utils/
│   └── agent-validation.ts    # USE: validateAgentResponse utility
├── types/
│   ├── workflow-context.ts    # MODIFY: Add autoValidateResponses to WorkflowConfig
│   ├── agent.ts               # REFERENCE: AgentResponse interface for type guard
│   ├── events.ts              # REFERENCE: invalidResponse event type
│   └── error.ts               # REFERENCE: WorkflowError interface
└── __tests__/
    ├── unit/
    │   └── workflow-validate-agent-response.test.ts  # REFERENCE: Test patterns
    └── integration/
        └── (add automatic validation integration tests here)
```

### Desired Codebase Tree with Files to be Added

```bash
# No new files needed - modifications only:
# 1. src/core/workflow-context.ts - Add validation hook to step() method
# 2. src/types/workflow-context.ts - Add autoValidateResponses to WorkflowConfig
# 3. src/__tests__/integration/workflow-automatic-validation.test.ts - NEW: Integration tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: agent.execute() does NOT exist - only agent.prompt() returns AgentResponse
// Do NOT look for agent.execute() - validation only applies to agent.prompt() results

// CRITICAL: validateAgentResponse is a pure function that does NOT throw
// It returns ValidationResult { valid: boolean, errors?: ZodError }
// Do NOT try-catch validateAgentResponse - check result.valid instead

// CRITICAL: Type guard required - not all step results are AgentResponse
// Use: isAgentResponse(result) helper before validation
// Pattern: if (result && typeof result === 'object' && 'status' in result)

// CRITICAL: WorkflowConfig flows from workflow → context via createWorkflowContext()
// Context receives config via constructor (see workflow.ts lines 819-823)
// enableReflection pattern: config.enableReflection ? { enabled: true } : undefined

// CRITICAL: Event emission requires workflow.emitEvent() - use executionContext.emitEvent
// Pattern: executionContext.emitEvent({ type: 'invalidResponse', ... })

// CRITICAL: WorkflowError creation requires getObservedState() and logs
// Pattern: state: getObservedState(this.workflow), logs: [...this.workflow.node.logs]

// CRITICAL: ZodError.stack exists but may be undefined - use optional chaining
// Pattern: stack: zodError.stack ?? undefined

// CRITICAL: invalidResponse event type requires specific structure
// Must include: type, node, response, agentId, errors, timestamp

// GOTCHA: Reflection retry logic runs AFTER validation failure
// Validation errors should NOT trigger reflection - throw immediately

// GOTCHA: Step result is returned BEFORE tree rebuild - validate before line 139
// Insert validation between lines 124-126 (after result, before status update)

// GOTCHA: Type narrowing - AgentResponse.status is discriminated union
// After checking 'status' in result, TypeScript narrows to AgentResponse type

// GOTCHA: Default autoValidateResponses to TRUE (opt-out for specific workflows)
// This differs from enableReflection which defaults to FALSE
```

## Implementation Blueprint

### Data Models and Structure

Add configuration option to enable/disable automatic validation:

```typescript
// src/types/workflow-context.ts - MODIFY WorkflowConfig interface
export interface WorkflowConfig {
  name?: string;
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;  // ADD THIS
}
```

Create type guard for detecting AgentResponse objects:

```typescript
// Helper function to add in workflow-context.ts
function isAgentResponse(value: unknown): value is AgentResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'string' &&
    ['success', 'error', 'partial'].includes(value.status)
  );
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/workflow-context.ts
  - ADD: autoValidateResponses?: boolean to WorkflowConfig interface
  - DEFAULT: true (enabled by default for opt-out pattern)
  - JSDOC: "Automatically validate AgentResponse results after agent.prompt() calls"
  - PLACEMENT: After enableReflection (line 149)
  - FOLLOW: Existing pattern for boolean config flags

Task 2: MODIFY src/core/workflow.ts constructor/initialization
  - FIND: Where WorkflowConfig flows to context (lines 819-823)
  - ENSURE: autoValidateResponses is passed to createWorkflowContext()
  - PATTERN: Follow enableReflection pattern - pass directly or undefined
  - GOTCHA: Context constructor signature needs to accept validation config

Task 3: MODIFY src/core/workflow-context.ts constructor
  - ADD: autoValidateResponses parameter to constructor
  - STORE: as private field this.autoValidateResponses
  - DEFAULT: true if not provided
  - PLACEMENT: After reflectionConfig parameter (line 59)
  - PATTERN: this.autoValidateResponses = autoValidateResponses ?? true;

Task 4: MODIFY src/core/workflow-context.ts
  - IMPORT: validateAgentResponse from '../utils/agent-validation.js'
  - IMPORT: AgentResponse type from '../types/agent.js'
  - IMPORT: ZodError from 'zod'
  - ADD: isAgentResponse type guard function (see blueprint above)
  - PLACEMENT: After existing imports (line 30)

Task 5: MODIFY src/core/workflow-context.ts step() method
  - LOCATION: After line 124 (const result = await runInContext(executionContext, fn))
  - ADD: Validation block before status update (before line 127)
  - CHECK: if (this.autoValidateResponses && isAgentResponse(result))
  - CALL: const validationResult = validateAgentResponse(result)
  - BRANCH: if (!validationResult.valid) → handle failure
  - EMIT: invalidResponse event via executionContext.emitEvent()
  - CREATE: WorkflowError with INVALID_RESPONSE_FORMAT context
  - THROW: WorkflowError immediately (no reflection for validation failures)
  - PRESERVE: All existing step() behavior for non-AgentResponse results

Task 6: CREATE src/__tests__/integration/workflow-automatic-validation.test.ts
  - IMPLEMENT: Integration test suite for automatic validation
  - TEST: Validation enabled (default) - should validate and emit event on failure
  - TEST: Validation disabled (autoValidateResponses: false) - should skip validation
  - TEST: Non-AgentResponse results - should pass through unchanged
  - TEST: Valid AgentResponse - should succeed without errors
  - TEST: Invalid AgentResponse - should emit event and throw WorkflowError
  - TEST: Event payload structure - verify invalidResponse event has all fields
  - TEST: WorkflowError structure - verify error has all required fields
  - FOLLOW: Pattern from workflow-validate-agent-response.test.ts
  - FIXTURES: Use mock agent, workflow, and observer patterns
```

### Implementation Patterns & Key Details

```typescript
// Task 1: WorkflowConfig modification (src/types/workflow-context.ts)
export interface WorkflowConfig {
  name?: string;
  enableReflection?: boolean;

  /** Automatically validate AgentResponse results after agent.prompt() calls */
  autoValidateResponses?: boolean;  // Default: true
}

// Task 3: Context constructor modification (src/core/workflow-context.ts)
constructor(
  workflow: WorkflowLike,
  parentWorkflowId?: string,
  reflectionConfig?: Partial<ReflectionConfig>,
  autoValidateResponses?: boolean  // ADD THIS PARAMETER
) {
  // ... existing code ...
  this.autoValidateResponses = autoValidateResponses ?? true;  // DEFAULT TRUE
}

// Task 4: Type guard helper (src/core/workflow-context.ts)
function isAgentResponse(value: unknown): value is AgentResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'string' &&
    ['success', 'error', 'partial'].includes(value.status)
  );
}

// Task 5: Validation block in step() method (src/core/workflow-context.ts)
// INSERT AFTER LINE 124, BEFORE LINE 127:

// Automatic validation for AgentResponse results
if (this.autoValidateResponses && isAgentResponse(result)) {
  const validationResult = validateAgentResponse(result);

  if (!validationResult.valid) {
    const zodError = validationResult.errors!;

    // Emit invalidResponse event
    executionContext.emitEvent({
      type: 'invalidResponse',
      node: stepNode,
      response: result,
      agentId: 'unknown',  // Cannot determine agentId at context level
      errors: zodError,
      timestamp: Date.now(),
    });

    // Create WorkflowError with INVALID_RESPONSE_FORMAT context
    const validationError = {
      message: `Agent response validation failed in step '${name}'`,
      original: zodError,
      workflowId: this.workflowId,
      stack: zodError.stack,
      state: getObservedState(this.workflow),
      logs: [...this.workflow.node.logs] as LogEntry[],
    };

    // Throw immediately - validation errors are not retried via reflection
    throw validationError;
  }
}

// CRITICAL: Do NOT trigger reflection for validation failures
// Reflection is for transient errors (network, timeouts, etc.)
// Validation failures indicate structural problems that retry won't fix

// CRITICAL: agentId is 'unknown' at context level
// Workflow-level validation (Workflow.validateAgentResponse) has agentId
// Context-level validation doesn't have access to agent information
// This is acceptable - event observers can still identify the failing step
```

### Integration Points

```yaml
WORKFLOW_CONFIG:
  - file: src/types/workflow-context.ts
  - add: autoValidateResponses?: boolean (line ~150)
  - default: true (enabled by default)

CONTEXT_CREATION:
  - file: src/core/workflow.ts
  - find: createWorkflowContext() call (lines 819-823)
  - modify: Pass config.autoValidateResponses to context
  - pattern: autoValidateResponses: config?.autoValidateResponses ?? true

CONTEXT_CONSTRUCTOR:
  - file: src/core/workflow-context.ts
  - modify: constructor signature (line 56)
  - add: autoValidateResponses parameter
  - store: this.autoValidateResponses field

STEP_EXECUTION:
  - file: src/core/workflow-context.ts
  - modify: step() method (line 79)
  - insert: Validation block after line 124
  - check: isAgentResponse(result) type guard
  - call: validateAgentResponse(result)
  - emit: invalidResponse event on failure
  - throw: WorkflowError on failure

IMPORTS:
  - file: src/core/workflow-context.ts
  - add: import { validateAgentResponse } from '../utils/agent-validation.js'
  - add: import type { AgentResponse } from '../types/agent.js'
  - add: import type { ZodError } from 'zod'
  - add: import type { LogEntry } from '../types/index.js'
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run lint -- src/core/workflow-context.ts  # Check linting
npm run lint -- src/types/workflow-context.ts
npm run format -- src/core/workflow-context.ts  # Format code
npm run format -- src/types/workflow-context.ts

# Type checking
npm run type-check  # or npx tsc --noEmit

# Full project validation
npm run lint
npm run format
npm run type-check

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing validation tests to ensure no regressions
npm test -- src/__tests__/unit/workflow-validate-agent-response.test.ts

# Run new automatic validation integration tests
npm test -- src/__tests__/integration/workflow-automatic-validation.test.ts

# Run all workflow-related tests
npm test -- --testPathPattern="workflow"

# Run all tests in the project
npm test

# Coverage validation (if coverage tools available)
npm test -- --coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Manual integration test - create test workflow file
cat > test-automatic-validation.ts << 'EOF'
import { createWorkflow, createAgent } from './src/index.js';
import { z } from 'zod';

const agent = createAgent({
  name: 'TestAgent',
  system: 'You return invalid data',
});

const workflow = createWorkflow(
  { name: 'TestValidation', autoValidateResponses: true },
  async (ctx) => {
    const result = await ctx.step('test-prompt', async () =>
      agent.prompt({
        user: 'Return data',
        responseFormat: z.object({ name: z.string() }),
      })
    );
    return result;
  }
);

// Observer for events
const observer = {
  onEvent: (event) => console.log('Event:', event.type),
  onTreeChanged: (tree) => console.log('Tree updated'),
};
workflow.addObserver(observer);

// Run workflow
try {
  await workflow.run();
} catch (error) {
  console.log('Caught validation error:', error.message);
}
EOF

# Run the integration test
node test-automatic-validation.ts

# Expected:
# - Event: invalidResponse logged
# - WorkflowError thrown with validation details
# - Agent ID in event (if available) or 'unknown'
# - Tree updated event emitted

# Cleanup
rm test-automatic-validation.ts

# Test with validation disabled
# Modify workflow config to autoValidateResponses: false
# Expected: No validation error, workflow completes
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test validation with various AgentResponse scenarios

# Scenario 1: Valid success response
# Expected: No errors, workflow completes

# Scenario 2: Invalid success response (wrong data type)
# Expected: invalidResponse event, WorkflowError thrown

# Scenario 3: Error response (status: 'error')
# Expected: Should pass validation (error responses are valid AgentResponse)

# Scenario 4: Partial response (status: 'partial')
# Expected: Should pass validation if data matches schema

# Scenario 5: Non-AgentResponse return value
# Expected: Pass through unchanged, no validation

# Scenario 6: Validation disabled globally
# Expected: All responses pass through, no validation errors

# Scenario 7: Validation disabled per-workflow
# Expected: This workflow skips validation, others still validate

# Test event structure
# - Verify invalidResponse event has all required fields
# - Verify errors field contains ZodError
# - Verify timestamp is present and reasonable

# Test WorkflowError structure
# - Verify message field contains step name
# - Verify original field contains ZodError
# - Verify workflowId field is correct
# - Verify state field is a valid state snapshot
# - Verify logs field is an array of LogEntry

# Test reflection interaction
# - Verify validation failures do NOT trigger reflection
# - Verify reflection still works for other error types
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format -- --check`

### Feature Validation

- [ ] WorkflowConfig has `autoValidateResponses` boolean option
- [ ] Default value is `true` (enabled by default)
- [ ] Workflow context validates AgentResponse results when enabled
- [ ] Non-AgentResponse results pass through unchanged
- [ ] Validation failures emit `invalidResponse` event with correct structure
- [ ] Validation failures throw WorkflowError with INVALID_RESPONSE_FORMAT context
- [ ] Setting `autoValidateResponses: false` disables validation
- [ ] Validation errors do NOT trigger reflection retry logic
- [ ] Existing workflow patterns continue to work

### Code Quality Validation

- [ ] Follows existing codebase patterns (enableReflection pattern)
- [ ] isAgentResponse type guard properly narrows types
- [ ] Validation occurs after result, before status update (correct position)
- [ ] Imports are organized and follow project conventions
- [ ] JSDoc comments added for new configuration option
- [ ] Error messages are informative and include context
- [ ] Event payloads include all required fields

### Documentation & Deployment

- [ ] WorkflowConfig JSDoc explains autoValidateResponses behavior
- [ ] Code is self-documenting with clear variable names
- [ ] Test files document expected behavior
- [ ] Integration tests serve as usage examples

---

## Anti-Patterns to Avoid

- ❌ Don't check for `agent.execute()` - it doesn't exist, only `agent.prompt()`
- ❌ Don't try-catch `validateAgentResponse()` - it returns ValidationResult, not throws
- ❌ Don't validate without type guard - not all step results are AgentResponse
- ❌ Don't trigger reflection for validation failures - throw immediately
- ❌ Don't default to `false` - should default to `true` (opt-out, not opt-in)
- ❌ Don't modify existing step() behavior for non-AgentResponse results
- ❌ Don't access agentId at context level - use 'unknown' or omit from event
- ❌ Don't rebuild event tree before throwing - let existing error handling do it
- ❌ Don't skip validation for error responses - they ARE valid AgentResponse
- ❌ Don't use synchronous validation - everything must be async (but validation is sync)
- ❌ Don't create new files unnecessarily - modify existing workflow-context.ts
- ❌ Don't forget to import LogEntry type for WorkflowError creation
- ❌ Don't omit ZodError.stack from WorkflowError (use optional chaining)

---

## Confidence Score

**8/10** for one-pass implementation success likelihood

**Justification**:
- ✅ Complete context with exact file locations and line numbers
- ✅ Clear implementation tasks ordered by dependencies
- ✅ Existing utility function to leverage (validateAgentResponse)
- ✅ Well-defined patterns to follow (enableReflection, event emission)
- ✅ Comprehensive validation gates with specific commands
- ⚠️ Minor uncertainty: agentId availability at context level (documented as 'unknown')
- ⚠️ Need to verify exact import paths for project structure

**Risk Mitigation**:
- Research notes provide fallback context
- External research documents best practices
- Task breakdown allows incremental validation
- Integration test scenarios cover edge cases

---

## Sources

- [Existing validateAgentResponse utility](file:///home/dustin/projects/groundswell/src/utils/agent-validation.ts)
- [Workflow validateAgentResponse pattern](file:///home/dustin/projects/groundswell/src/core/workflow.ts)
- [Workflow context implementation](file:///home/dustin/projects/groundswell/src/core/workflow-context.ts)
- [Agent type definitions](file:///home/dustin/projects/groundswell/src/types/agent.ts)
- [WorkflowConfig interface](file:///home/dustin/projects/groundswell/src/types/workflow-context.ts)
- [Event type definitions](file:///home/dustin/projects/groundswell/src/types/events.ts)
- [WorkflowError interface](file:///home/dustin/projects/groundswell/src/types/error.ts)
- [Research: Workflow context analysis](plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M2T2S1/research/workflow-context-analysis.md)
- [Research: Validation hook patterns](plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M2T2S1/research/validation-hook-patterns.md)

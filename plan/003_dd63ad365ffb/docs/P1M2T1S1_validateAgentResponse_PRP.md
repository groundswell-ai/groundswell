# Product Requirement Prompt (PRP): validateAgentResponse Method in Workflow Class

**Work Item**: P1.M2.T1.S1 - Implement validateAgentResponse method in Workflow class
**PRP Version**: 1.0
**Created**: 2026-01-26

---

## Goal

**Feature Goal**: Add workflow-level agent response validation method that enables parent workflows to validate agent responses before processing, emitting events and creating structured errors when validation fails.

**Deliverable**: A public `validateAgentResponse<T>()` method in the Workflow class (`src/core/workflow.ts`) that:
1. Validates AgentResponse<T> against a Zod schema
2. Emits an `invalidResponse` event on validation failure
3. Creates a WorkflowError with INVALID_RESPONSE_FORMAT context
4. Returns boolean indicating validation success

**Success Definition**:
- Method validates responses using Agent.validateResponse() utility pattern
- Event emission follows existing WorkflowEvent patterns
- Error creation follows existing WorkflowError patterns
- Unit tests cover happy path, validation failure, event emission, and error creation
- Integration tests demonstrate callable-from-steps usage

---

## User Persona

**Target User**: Developer implementing parent-child workflow patterns where agent responses from child workflows need validation at the workflow level.

**Use Case**: A parent workflow receives an AgentResponse from a child workflow and needs to validate it before continuing execution. This enables defensive programming where parent workflows can catch malformed responses from agents.

**User Journey**:
1. Developer creates parent workflow that calls child workflow
2. Child workflow returns AgentResponse<T> from agent execution
3. Parent workflow calls `this.validateAgentResponse(response, agentId)` to validate
4. If validation fails, `invalidResponse` event is emitted and error is created
5. Parent workflow can decide to retry, abort, or rebuild based on validation result

**Pain Points Addressed**:
- Currently, Agent.validateResponse() is private to Agent class
- No workflow-level validation hook exists
- No structured error handling for invalid responses at workflow level
- Missing observability for validation failures (no event emission)

---

## Why

**Business Value and User Impact**:
- Enables defensive programming in parent-child workflow patterns
- Provides structured error handling for invalid agent responses
- Improves observability through event emission
- Supports retry/abort/rebuild decisions based on validation failures

**Integration with Existing Features**:
- Builds on existing Agent.validateResponse() pattern (src/core/agent.ts:889-931)
- Integrates with existing WorkflowEvent system (src/types/events.ts)
- Uses existing WorkflowError patterns (src/types/error.ts)
- Supports existing analyzeError() and restartStep() methods

**Problems Solved**:
- Gap: Agent-level validation exists but workflow-level does not
- Gap: No event emission for validation failures at workflow level
- Gap: No structured INVALID_RESPONSE_FORMAT WorkflowError creation

---

## What

### Functional Requirements

The `validateAgentResponse<T>()` method shall:

1. **Accept Parameters**:
   - `response: AgentResponse<T>` - The agent response to validate
   - `agentId: string` - Identifier of the agent that produced the response
   - Optional: `dataSchema?: z.ZodTypeAny` - Zod schema for response data (defaults to z.unknown())

2. **Perform Validation**:
   - Call shared validation utility (Agent.validateResponse() or extracted utility)
   - Use `safeParse()` for non-throwing validation
   - Return `true` if validation succeeds

3. **Handle Validation Failure**:
   - Emit `invalidResponse` event with structure: `{ response, agentId, errors: ZodError }`
   - Create WorkflowError with:
     - `message`: Descriptive validation failure message
     - `original`: The ZodError from validation failure
     - `workflowId`: `this.id`
     - `state`: `getObservedState(this)`
     - `logs`: `[...this.node.logs]`
   - Return `false`

4. **Method Signature**:
   ```typescript
   public validateAgentResponse<T>(
     response: AgentResponse<T>,
     agentId: string,
     dataSchema?: z.ZodTypeAny
   ): boolean
   ```

5. **Event Structure**:
   ```typescript
   {
     type: 'invalidResponse';
     node: WorkflowNode;
     response: AgentResponse<T>;
     agentId: string;
     errors: ZodError;
     timestamp: number;
   }
   ```

### Success Criteria

- [ ] Method added to Workflow class with correct signature
- [ ] Validation uses safeParse() and returns boolean
- [ ] Event emission follows existing emitEvent() pattern
- [ ] WorkflowError creation follows existing patterns
- [ ] Unit tests pass: `npm test -- workflow-validate-agent-response`
- [ ] No existing tests break
- [ ] Method is callable from workflow steps
- [ ] Event structure matches WorkflowEvent discriminated union

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed?

**Answer**: Yes - this PRP provides:
- Exact file paths and line numbers for all references
- Complete code examples from existing patterns
- Specific imports and dependencies
- Test patterns and commands
- Event and error type definitions
- Validation patterns from Agent class

### Documentation & References

```yaml
# CRITICAL - Must read before implementing

- file: src/core/agent.ts
  lines: 889-931
  why: Contains the existing validateResponse() method to reference for pattern
  pattern: Private method using safeParse(), console.error logging, and createErrorResponse return
  gotcha: This is private to Agent - need to extract or call via public utility
  code: |
    private validateResponse<T>(
      response: AgentResponse<T>,
      dataSchema: z.ZodTypeAny
    ): AgentResponse<T> {
      const schema = AgentResponseSchema(dataSchema);
      const validation = schema.safeParse(response);

      if (validation.success) {
        return response;
      }

      console.error('Agent response validation failed', {
        agentId: this.id,
        timestamp: Date.now(),
        errorCount: validation.error.errors.length,
        errors: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });

      return createErrorResponse(
        'INTERNAL_ERROR',
        'Internal response validation failed',
        {
          validationErrors: validation.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
        false
      ) as AgentResponse<T>;
    }

- file: src/types/agent.ts
  lines: 972-995
  why: AgentResponseSchema factory function needed for validation
  pattern: Creates discriminated union schema for success/error/partial responses
  code: |
    export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
      const successSchema = z.object({
        status: z.literal('success'),
        data: dataSchema,
        error: z.null(),
        metadata: AgentResponseMetadataSchema.optional(),
      });

      const errorSchema = z.object({
        status: z.literal('error'),
        data: z.null(),
        error: AgentErrorDetailsSchema,
        metadata: AgentResponseMetadataSchema.optional(),
      });

      const partialSchema = z.object({
        status: z.literal('partial'),
        data: dataSchema,
        error: z.null(),
        metadata: AgentResponseMetadataSchema.optional(),
      });

      return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
    }

- file: src/types/events.ts
  lines: 1-80
  why: WorkflowEvent discriminated union - need to add new event type here
  pattern: Events use type discriminant with relevant properties
  gotcha: New event type must be added to discriminated union
  code: |
    export type WorkflowEvent =
      | { type: 'childAttached'; parentId: string; child: WorkflowNode }
      | { type: 'childDetached'; parentId: string; childId: string }
      // ... existing events
      // ADD: { type: 'invalidResponse'; node: WorkflowNode; response: AgentResponse<T>; agentId: string; errors: z.ZodError; timestamp: number }

- file: src/types/error.ts
  lines: 1-21
  why: WorkflowError interface structure
  pattern: Message, original error, workflowId, stack, state, logs
  code: |
    export interface WorkflowError {
      message: string;
      original: unknown;
      workflowId: string;
      stack?: string;
      state: SerializedWorkflowState;
      logs: LogEntry[];
    }

- file: src/core/workflow.ts
  lines: 428-444
  why: emitEvent() method pattern for event emission
  pattern: Pushes to node.events, iterates observers with try-catch
  code: |
    public emitEvent(event: WorkflowEvent): void {
      this.node.events.push(event);

      const observers = this.getRootObservers();
      for (const obs of observers) {
        try {
          obs.onEvent(event);

          if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
            obs.onTreeChanged(this.getRoot().node);
          }
        } catch (err) {
          this.logger.error('Observer onEvent error', { error: err, eventType: event.type });
        }
      }
    }

- file: src/core/workflow.ts
  lines: 650-697
  why: analyzeError() method shows error creation pattern
  pattern: Creates WorkflowError with getObservedState(this) and logs
  gotcha: Always use getObservedState(this) for state capture

- file: src/decorators/observed-state.ts
  why: getObservedState() function for state capture
  pattern: Used throughout workflow for creating state snapshots

- file: src/types/agent.ts
  lines: 605-656
  why: AGENT_ERROR_CODES constant - INVALID_RESPONSE_FORMAT already exists
  gotcha: Error code is defined but WorkflowError creation needed

- file: src/__tests__/unit/workflow-analyze-error.test.ts
  why: Test pattern for Workflow methods
  pattern: AAA (Arrange-Act-Assert), mock WorkflowError creation, class-based test workflow

- url: https://zod.dev/?id=error-handling
  why: Official Zod error handling documentation
  critical: Use safeParse() not parse() for validation, check .success property

- url: https://zod.dev/?id=safeparsetype
  why: ZodError structure documentation
  critical: ZodError has .errors array with .path, .message, .code properties
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── agent.ts              # Agent.validateResponse() at lines 889-931
│   ├── workflow.ts           # TARGET: Add validateAgentResponse() method
│   ├── logger.ts             # WorkflowLogger for error logging
│   └── factory.ts            # Factory functions
├── types/
│   ├── agent.ts              # AgentResponse, AgentResponseSchema, AGENT_ERROR_CODES
│   ├── events.ts             # WorkflowEvent discriminated union (ADD invalidResponse)
│   ├── error.ts              # WorkflowError interface
│   ├── workflow-context.ts   # WorkflowContext, WorkflowConfig
│   └── restart.ts            # RestartAnalysis, ErrorCriterion
├── utils/
│   ├── restart-analysis.ts   # analyzeErrorForRestart utility
│   └── workflow-error-utils.ts
├── decorators/
│   ├── step.ts               # @Step decorator
│   └── observed-state.ts     # getObservedState function
└── __tests__/
    └── unit/
        ├── workflow.test.ts
        ├── workflow-analyze-error.test.ts
        ├── workflow-restart-step.test.ts
        └── workflow-validate-agent-response.test.ts  # CREATE THIS
```

### Desired Codebase Tree (Changes)

```bash
src/
├── core/
│   └── workflow.ts           # ADD: validateAgentResponse() public method
├── types/
│   └── events.ts             # ADD: invalidResponse event type
└── __tests__/
    └── unit/
        └── workflow-validate-agent-response.test.ts  # NEW FILE
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Zod validation must use safeParse(), not parse()
// parse() throws on validation failure - we need boolean return
// BAD: schema.parse(response) - throws ZodError
// GOOD: schema.safeParse(response) - returns { success: boolean, data?: T, error?: ZodError }

// CRITICAL: WorkflowEvent is a discriminated union - must add new type
// File: src/types/events.ts
// New event type must be added to the union with proper typing

// CRITICAL: WorkflowError requires state from getObservedState()
// Use: state: getObservedState(this)
// NOT: state: {} or any manual state construction

// CRITICAL: Event emission uses this.emitEvent() which:
// 1. Pushes to this.node.events array
// 2. Gets root observers with this.getRootObservers()
// 3. Iterates observers with try-catch error isolation
// 4. May call onTreeChanged() for specific event types

// CRITICAL: AgentResponse<T> is a generic - preserve generic in signature
// Method signature: validateAgentResponse<T>(response: AgentResponse<T>, ...)

// CRITICAL: ZodError structure has .errors array (not .issues)
// Each error has: { path: (string|number)[], message: string, code: string }

// CRITICAL: Response validation schema comes from Prompt.responseFormat
// If not provided, default to z.unknown() for permissive validation

// CRITICAL: INVALID_RESPONSE_FORMAT error code already exists
// Location: src/types/agent.ts line 612
// Use this code for consistency, don't create new error codes

// CRITICAL: Logs must be copied with spread operator
// Use: logs: [...this.node.logs] as LogEntry[]
// NOT: logs: this.node.logs (reference copy)

// CRITICAL: TypeScript requires type assertion for ZodError in event
// Use: errors: validation.error as z.ZodError
```

---

## Implementation Blueprint

### Data Models and Structure

**No new data models needed** - using existing types:
- `AgentResponse<T>` from src/types/agent.ts
- `WorkflowError` from src/types/error.ts
- `WorkflowEvent` from src/types/events.ts (extending with new type)
- `ZodError` from Zod library

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/events.ts
  - ADD: New event type to WorkflowEvent discriminated union
  - CODE: |
      | {
          type: 'invalidResponse';
          node: WorkflowNode;
          response: AgentResponse<unknown>;
          agentId: string;
          errors: z.ZodError;
          timestamp: number;
        }
  - PLACEMENT: Add after 'error' event type (around line 19)
  - IMPORT: May need to import AgentResponse and ZodError at top
  - GOTCHA: Use AgentResponse<unknown> since generic can't be in discriminated union

Task 2: MODIFY src/core/workflow.ts
  - ADD: Import statement for z from zod
  - LOCATION: Top of file with other imports (around line 9)
  - CODE: import { z } from 'zod';

  - ADD: Import statement for AgentResponseSchema
  - LOCATION: Import from '../types/agent.js'
  - CODE: import { AgentResponseSchema } from '../types/agent.js';

  - ADD: Import statement for createErrorResponse (if using Agent pattern)
  - LOCATION: Import from '../types/agent.js'

  - IMPLEMENT: validateAgentResponse<T>() public method
  - PLACEMENT: After analyzeError() method (around line 698)
  - FOLLOW pattern: analyzeError() method structure (error creation, event emission)
  - NAMING: validateAgentResponse (camelCase for method)
  - SIGNATURE: |
      public validateAgentResponse<T>(
        response: AgentResponse<T>,
        agentId: string,
        dataSchema?: z.ZodTypeAny
      ): boolean
  - DEPENDENCIES: Imports from Task 2, event type from Task 1

Task 3: CREATE src/__tests__/unit/workflow-validate-agent-response.test.ts
  - IMPLEMENT: Unit tests for validateAgentResponse method
  - FOLLOW pattern: workflow-analyze-error.test.ts (AAA pattern, mock helper)
  - NAMING: describe('Workflow.validateAgentResponse', ...)
  - TEST CASES:
    - should return true for valid response
    - should return false for invalid response
    - should emit invalidResponse event on validation failure
    - should create WorkflowError with INVALID_RESPONSE_FORMAT context
    - should handle missing dataSchema (default to z.unknown())
    - should include ZodError in event payload
    - should use this.id for workflowId in error
    - should copy logs with spread operator
  - COVERAGE: All branches and error paths
  - PLACEMENT: src/__tests__/unit/ directory

Task 4: RUN existing tests to ensure no breakage
  - COMMAND: npm test
  - VERIFY: All existing tests pass
  - FIX: Any issues found
  - DEPENDENCIES: Tasks 1-3 complete

Task 5: INTEGRATION TEST (manual verification)
  - CREATE: Simple workflow demonstrating callable-from-steps usage
  - VERIFY: Method can be called from @Step decorator method
  - VERIFY: Event is emitted and observable
  - VERIFY: Return value influences workflow control flow
  - DEPENDENCIES: Tasks 1-4 complete
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// PATTERN 1: Method Placement in Workflow Class
// ============================================================
// Location: src/core/workflow.ts
// Add after analyzeError() method (around line 698)

/**
 * Validate an agent response at the workflow level
 *
 * This method enables parent workflows to validate agent responses
 * before processing them. It follows the same validation pattern as
 * Agent.validateResponse() but emits events and creates WorkflowError
 * for workflow-level error handling.
 *
 * @template T - The type of response data
 * @param response - The AgentResponse to validate
 * @param agentId - Identifier of the agent that produced the response
 * @param dataSchema - Optional Zod schema for response data (defaults to z.unknown())
 * @returns true if validation passes, false if validation fails
 *
 * @example Validate response from child workflow
 * ```ts
 * class ParentWorkflow extends Workflow {
 *   @Step()
 *   async processChildResult() {
 *     const response = await this.childWorkflow.run();
 *
 *     if (!this.validateAgentResponse(response, this.childWorkflow.agent.id)) {
 *       // Handle validation failure
 *       const action = this.analyzeError(this.lastError);
 *       if (action === 'retry') {
 *         return await this.restartStep('processChildResult');
 *       }
 *     }
 *
 *     // Process valid response
 *     return response.data;
 *   }
 * }
 * ```
 */
public validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema: z.ZodTypeAny = z.unknown()
): boolean {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate response against schema
  const validation = schema.safeParse(response);

  if (validation.success) {
    // Response is valid
    return true;
  }

  // Validation failed - emit event and create error
  const zodError = validation.error;

  // Emit invalidResponse event
  this.emitEvent({
    type: 'invalidResponse',
    node: this.node,
    response,
    agentId,
    errors: zodError,
    timestamp: Date.now(),
  });

  // Create WorkflowError with INVALID_RESPONSE_FORMAT context
  const validationError: WorkflowError = {
    message: `Agent response validation failed for agent '${agentId}'`,
    original: zodError,
    workflowId: this.id,
    stack: zodError.stack,
    state: getObservedState(this),
    logs: [...this.node.logs] as LogEntry[],
  };

  // Store error for potential use by analyzeError/restartStep
  // Note: Consider adding lastError property to Workflow class if not exists
  // For now, emit event and return false

  return false;
}

// ============================================================
// PATTERN 2: Event Type Definition
// ============================================================
// Location: src/types/events.ts
// Add to WorkflowEvent discriminated union (around line 19)

import type { AgentResponse } from './agent.js';
import type { z } from 'zod';

export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepRetry'; node: WorkflowNode; stepName: string; retryCount: number; analysis: RestartAnalysis; error: WorkflowError; timestamp: number }
  | { type: 'stepRestarted'; node: WorkflowNode; stepName: string; retryCount: number; restoredState: SerializedWorkflowState; timestamp: number }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  // Agent/Prompt events
  | {
      type: 'agentPromptStart';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
    }
  | {
      type: 'agentPromptEnd';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
      duration: number;
      tokenUsage?: TokenUsage;
    }
  // ADD: Validation event
  | {
      type: 'invalidResponse';
      node: WorkflowNode;
      response: AgentResponse<unknown>;
      agentId: string;
      errors: z.ZodError;
      timestamp: number;
    }
  // ... rest of events

// ============================================================
// PATTERN 3: Unit Test Structure
// ============================================================
// Location: src/__tests__/unit/workflow-validate-agent-response.test.ts

import { describe, it, expect, vi } from 'vitest';
import { Workflow, Step, type AgentResponse, type WorkflowError } from '../../index.js';
import { z } from 'zod';

describe('Workflow.validateAgentResponse', () => {
  // Helper to create valid AgentResponse
  function createValidResponse<T>(data: T, agentId: string = 'test-agent'): AgentResponse<T> {
    return {
      status: 'success',
      data,
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  // Helper to create invalid AgentResponse
  function createInvalidResponse(agentId: string = 'test-agent'): AgentResponse<unknown> {
    return {
      status: 'invalid' as any, // Wrong status
      data: 'some data',
      error: null,
      metadata: {
        agentId,
        timestamp: Date.now(),
      },
    };
  }

  describe('successful validation', () => {
    it('should return true for valid response with default schema', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createValidResponse({ result: 'test' });

      const result = wf.validateAgentResponse(response, 'test-agent');

      expect(result).toBe(true);
    });

    it('should return true for valid response with custom schema', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createValidResponse({
        name: 'test',
        count: 42
      });

      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const result = wf.validateAgentResponse(response, 'test-agent', schema);

      expect(result).toBe(true);
    });

    it('should not emit event for valid response', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createValidResponse({ result: 'test' });
      wf.validateAgentResponse(response, 'test-agent');

      // Find invalidResponse events
      const invalidEvents = observer.onEvent.mock.calls
        .flatMap(call => call)
        .filter((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvents).toHaveLength(0);
    });
  });

  describe('validation failure', () => {
    it('should return false for invalid response', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createInvalidResponse();

      const result = wf.validateAgentResponse(response, 'test-agent');

      expect(result).toBe(false);
    });

    it('should emit invalidResponse event on validation failure', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createInvalidResponse();
      wf.validateAgentResponse(response, 'test-agent');

      // Find invalidResponse event
      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvent).toBeDefined();
      expect(invalidEvent?.type).toBe('invalidResponse');
      expect(invalidEvent?.agentId).toBe('test-agent');
      expect(invalidEvent?.response).toBe(response);
      expect(invalidEvent?.errors).toBeDefined();
      expect(invalidEvent?.timestamp).toBeGreaterThan(0);
    });

    it('should include ZodError in event payload', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createInvalidResponse();
      wf.validateAgentResponse(response, 'test-agent');

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      // ZodError has errors array
      expect(invalidEvent?.errors.errors).toBeInstanceOf(Array);
      expect(invalidEvent?.errors.errors.length).toBeGreaterThan(0);
    });

    it('should use workflow ID in event context', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      const response = createInvalidResponse();
      wf.validateAgentResponse(response, 'test-agent');

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvent?.node.workflowId).toBe(wf.id);
    });

    it('should handle data schema validation failures', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const observer = {
        onLog: vi.fn(),
        onEvent: vi.fn(),
        onStateUpdated: vi.fn(),
        onTreeChanged: vi.fn(),
      };

      wf.addObserver(observer);

      // Valid structure but invalid data
      const response = createValidResponse({
        name: 'test',
        count: 'not a number'  // Should be number
      });

      const schema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const result = wf.validateAgentResponse(response, 'test-agent', schema);

      expect(result).toBe(false);

      const invalidEvent = observer.onEvent.mock.calls
        .flatMap(call => call)
        .find((event: any) => event?.type === 'invalidResponse');

      expect(invalidEvent).toBeDefined();
    });
  });

  describe('integration with workflow methods', () => {
    it('should be callable from workflow step', async () => {
      class TestWorkflow extends Workflow {
        private lastResponse?: AgentResponse<unknown>;

        @Step()
        async validateAndProcess() {
          const response = createValidResponse({ result: 'data' });
          this.lastResponse = response;

          const isValid = this.validateAgentResponse(response, 'step-agent');

          return isValid ? 'valid' : 'invalid';
        }
      }

      const wf = new TestWorkflow();
      const result = await wf.validateAndProcess();

      expect(result).toBe('valid');
    });

    it('should work with restart pattern after validation failure', async () => {
      class TestWorkflow extends Workflow {
        private attemptCount = 0;

        @Step({ restartable: true, retryOn: [{ code: 'INVALID_RESPONSE_FORMAT' }] })
        async attemptValidation() {
          this.attemptCount++;

          if (this.attemptCount === 1) {
            const invalidResponse = createInvalidResponse();
            this.validateAgentResponse(invalidResponse, 'test-agent');
            throw new Error('Validation failed');
          }

          const validResponse = createValidResponse({ result: 'success' });
          this.validateAgentResponse(validResponse, 'test-agent');
          return 'success';
        }
      }

      const wf = new TestWorkflow();
      // This would require full workflow execution context
      // Simplified test for demonstration
      expect(wf.validateAgentResponse(createInvalidResponse(), 'agent')).toBe(false);
      expect(wf.validateAgentResponse(createValidResponse({ data: 'test' }), 'agent')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should default to z.unknown() when dataSchema not provided', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();
      const response = createValidResponse({ arbitrary: 'data', nested: { value: 123 } });

      const result = wf.validateAgentResponse(response, 'test-agent');

      // z.unknown() accepts any value
      expect(result).toBe(true);
    });

    it('should handle response with null data', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();

      // Error response has null data
      const errorResponse: AgentResponse<null> = {
        status: 'error',
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          details: null,
          recoverable: false,
        },
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = wf.validateAgentResponse(errorResponse, 'test-agent');

      expect(result).toBe(true);
    });

    it('should handle response with partial status', () => {
      class TestWorkflow extends Workflow {}

      const wf = new TestWorkflow();

      const partialResponse: AgentResponse<{ progress: number }> = {
        status: 'partial',
        data: { progress: 50 },
        error: null,
        metadata: {
          agentId: 'test-agent',
          timestamp: Date.now(),
        },
      };

      const result = wf.validateAgentResponse(partialResponse, 'test-agent');

      expect(result).toBe(true);
    });
  });
});
```

### Integration Points

```yaml
EVENTS:
  - modify: src/types/events.ts
  - add: invalidResponse event type to WorkflowEvent discriminated union
  - structure: { type: 'invalidResponse', node: WorkflowNode, response: AgentResponse<unknown>, agentId: string, errors: z.ZodError, timestamp: number }

IMPORTS:
  - add to: src/core/workflow.ts
  - imports: |
      import { z } from 'zod';
      import { AgentResponseSchema } from '../types/agent.js';
      import type { AgentResponse } from '../types/agent.js';

METHOD:
  - add to: src/core/workflow.ts
  - location: After analyzeError() method (around line 698)
  - signature: public validateAgentResponse<T>(response: AgentResponse<T>, agentId: string, dataSchema?: z.ZodTypeAny): boolean

TESTS:
  - create: src/__tests__/unit/workflow-validate-agent-response.test.ts
  - pattern: Follow workflow-analyze-error.test.ts structure
  - coverage: All success/failure paths, event emission, error creation
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npm run check        # Runs type checking and linting

# Or run individually:
npx tsc --noEmit     # TypeScript type checking
npx eslint src/core/workflow.ts --fix
npx eslint src/types/events.ts --fix

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test new method specifically
npm test -- workflow-validate-agent-response

# Full workflow test suite
npm test -- workflow.test.ts
npm test -- workflow-analyze-error.test.ts
npm test -- workflow-restart-step.test.ts

# All tests
npm test

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run comprehensive test suite
npm run test:coverage

# Verify no existing tests broke
npm test -- --reporter=verbose

# Manual integration test (in TypeScript file):
# 1. Create test workflow with @Step that calls validateAgentResponse
# 2. Verify method returns correct boolean
# 3. Verify event is emitted
# 4. Verify error structure is correct

# Expected: Method callable from steps, events emitted, no existing tests broken.
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Type checking for new event type
npx tsc --noEmit src/types/events.ts

# Verify discriminated union includes new type
# Should see no "Type 'invalidResponse' is not assignable to type 'WorkflowEvent'" errors

# Test event emission flow
# 1. Create workflow
# 2. Add observer
# 3. Call validateAgentResponse with invalid response
# 4. Verify observer.onEvent called with invalidResponse event

# Test ZodError preservation
# 1. Create invalid response
# 2. Validate
# 3. Check event.errors is ZodError instance
# 4. Verify event.errors.errors array has correct structure

# Expected: All type checks pass, event flow works, ZodError preserved correctly.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npx tsc --noEmit`
- [ ] Event type added to WorkflowEvent discriminated union
- [ ] Method signature includes generic `<T>` parameter

### Feature Validation

- [ ] Method returns `true` for valid responses
- [ ] Method returns `false` for invalid responses
- [ ] Event emitted on validation failure with correct structure
- [ ] Event includes: node, response, agentId, errors, timestamp
- [ ] ZodError preserved in event payload
- [ ] Method callable from @Step decorator methods
- [ ] Default dataSchema (z.unknown()) works when not specified

### Code Quality Validation

- [ ] Follows existing workflow method patterns (analyzeError, restartStep)
- [ ] Uses `safeParse()` for validation (not `parse()`)
- [ ] Uses `getObservedState(this)` for state capture
- [ ] Copies logs with spread operator: `[...this.node.logs]`
- [ ] JSDoc comment includes usage example
- [ ] Imports organized and follow existing patterns

### Documentation & Deployment

- [ ] Method has JSDoc with @example showing callable-from-steps usage
- [ ] Event type comment describes structure and use case
- [ ] No environment variables added (not needed)
- [ ] No configuration changes needed

---

## Anti-Patterns to Avoid

- Don't use `parse()` instead of `safeParse()` - parse() throws, we need boolean return
- Don't add event type to discriminated union without proper typing
- Don't manually construct state - use `getObservedState(this)`
- Don't copy logs by reference - use spread operator `[...this.node.logs]`
- Don't forget to add `z` import from 'zod'
- Don't forget to import `AgentResponseSchema` from types
- Don't create new error codes - use existing `INVALID_RESPONSE_FORMAT`
- Don't emit event without using `this.emitEvent()` method
- Don't skip generic `<T>` parameter in method signature
- Don't use `AgentResponse<T>` in event type - use `AgentResponse<unknown>` (generics not allowed in discriminated union)

---

## Confidence Score

**8/10** - High confidence for one-pass implementation success

**Rationale**:
- Comprehensive existing patterns to follow (Agent.validateResponse, analyzeError, restartStep)
- Clear event system with established patterns
- Complete test examples from similar methods
- All dependencies and imports documented
- Specific line numbers and code examples provided

**Risk Factors**:
- Event type generic constraint may need adjustment (AgentResponse<unknown>)
- May need to add `lastError` property to Workflow class for full integration
- Integration with analyzeError/restartStep may require additional work in future tasks

---

## Sources

- [Agent.validateResponse() Implementation](file:///home/dustin/projects/groundswell/src/core/agent.ts#L889-L931)
- [AgentResponseSchema Factory](file:///home/dustin/projects/groundswell/src/types/agent.ts#L972-L995)
- [WorkflowEvent Types](file:///home/dustin/projects/groundswell/src/types/events.ts)
- [WorkflowError Interface](file:///home/dustin/projects/groundswell/src/types/error.ts)
- [Workflow.emitEvent() Pattern](file:///home/dustin/projects/groundswell/src/core/workflow.ts#L428-L444)
- [Workflow.analyzeError() Pattern](file:///home/dustin/projects/groundswell/src/core/workflow.ts#L650-L697)
- [Test Pattern Reference](file:///home/dustin/projects/groundswell/src/__tests__/unit/workflow-analyze-error.test.ts)
- [Zod Error Handling Documentation](https://zod.dev/?id=error-handling)
- [Zod safeParse Documentation](https://zod.dev/?id=safeparsetype)

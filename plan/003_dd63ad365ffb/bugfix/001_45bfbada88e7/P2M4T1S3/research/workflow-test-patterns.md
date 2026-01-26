# Workflow Test Patterns Research

## Overview

This document analyzes existing workflow test patterns in the codebase to establish conventions for creating workflow-level error merge tests.

## Relevant Test Files Found

### Unit Tests (src/__tests__/unit/)

- `workflow.test.ts` - Main workflow class tests
- `workflow-detachChild.test.ts` - Detach child functionality
- `workflow-emitEvent-childDetached.test.ts` - Event emission
- `workflow-analyze-error.test.ts` - Error analysis logic
- `workflow-isDescendantOf.test.ts` - Tree relationship tests
- `workflow-context.test.ts` - Context management
- `workflow-restart-step.test.ts` - Step restart functionality
- `workflow-validate-agent-response.test.ts` - Agent response validation
- `workflow-validation.test.ts` - Comprehensive validation integration
- `utils/workflow-error-utils.test.ts` - Error utility functions

### Integration Tests (src/__tests__/integration/)

- `agent-workflow.test.ts` - Agent workflow integration
- `workflow-reparenting.test.ts` - Reparenting functionality
- `workflow-automatic-validation.test.ts` - Automatic validation

### Adversarial Tests (src/__tests__/adversarial/)

- `error-merge-strategy.test.ts` - Error merge strategy tests (760 lines)

## Test File Naming Conventions

### Unit Tests
Pattern: `workflow-{feature}.test.ts`

Examples:
- `workflow.test.ts` - Core workflow functionality
- `workflow-detachChild.test.ts` - Specific method
- `workflow-analyze-error.test.ts` - Specific feature
- `workflow-validate-agent-response.test.ts` - Agent integration

**For P2.M4.T1.S3**: Use `workflow-error-merge.test.ts`

### Integration Tests
Pattern: `{area}-workflow.test.ts`

Examples:
- `agent-workflow.test.ts` - Agent integration
- `workflow-reparenting.test.ts` - Tree operations

## Test Organization Structure

Tests use the standard describe/it pattern with clear organization:

```typescript
describe('Workflow feature name', () => {
  describe('Specific scenario', () => {
    it('should do something specific', async () => {
      // ARRANGE
      // ACT
      // ASSERT
    });
  });
});
```

## Common Test Patterns

### 1. Workflow Class Test Pattern

**Simple Workflow Extension:**

```typescript
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}
```

**Two Constructor Pattern Testing:**
Tests cover both class-based inheritance and functional patterns.

### 2. Observer Pattern Testing

**Standard Observer Setup:**

```typescript
const events: WorkflowEvent[] = [];

const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};

workflow.addObserver(observer);
```

### 3. Error Testing Patterns

**Mock Error Creation:**

```typescript
function createMockWorkflowError(overrides?: Partial<WorkflowError>): WorkflowError {
  return {
    message: 'Test error',
    original: new Error('Original error'),
    workflowId: 'wf-test-123',
    stack: 'Error: Test error\n    at test.ts:10:15',
    state: { stepName: 'testStep' },
    logs: [],
    ...overrides,
  };
}
```

**Error Event Testing:**
- Tests verify error events are emitted
- Validates error structure (message, workflowId, state, logs)
- Tests both recoverable and non-recoverable scenarios

### 4. State Testing Patterns

**Status Change Testing:**
- Tests verify workflow status updates
- Tests treeUpdated event emission on status changes
- Validates both workflow.status and workflow.getNode().status

### 5. Integration Testing Patterns

**Agent Integration Pattern:**

```typescript
function createMockAgent(agentId: string = 'test-agent'): { agent: Agent; agentId: string } {
  const agent = new Agent({ name: 'TestAgent', provider: 'anthropic' });
  vi.spyOn(agent, 'prompt').mockResolvedValue(
    createSuccessResponse({ result: 'default' }, { agentId, timestamp: Date.now() })
  );
  return { agent, agentId };
}
```

**Provider Setup Pattern:**
- Uses ProviderRegistry for test isolation
- Mocks provider capabilities and execute methods

### 6. Mock/Stub Patterns

**Vitest Spy Pattern:**

```typescript
vi.spyOn(agent, 'prompt').mockResolvedValue(
  createMockValidResponse({ result: 'test' }, agentId)
);
```

**Mock Provider Pattern:**
- Creates mock providers with all required methods
- Implements async mock execute methods

### 7. Assertion Patterns

**Event Type Narrowing:**

```typescript
// For discriminated union event type access
const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
expect(treeUpdatedEvent?.type === 'treeUpdated' && treeUpdatedEvent.root).toBe(wf.getNode());
```

**Error Structure Validation:**
- Verifies error object contains all required fields
- Tests error state capture
- Validates log array presence

### 8. Fixture Patterns

**Simple Workflow Fixture:**
Basic workflow implementation for testing.

**Complex Workflow with State:**

```typescript
class StatefulWorkflowClass extends Workflow {
  @ObservedState()
  stepCount: number = 0;

  @ObservedState({ redact: true })
  apiKey: string = 'secret-key-123';

  @ObservedState({ hidden: true })
  internalCounter: number = 42;
}
```

### 9. Testing Tree Operations

**Tree Structure Testing:**
- Tests parent-child relationships
- Verifies tree node synchronization
- Tests reparenting operations

**Event Tree Handle Testing:**
- Tests event tree creation from workflow nodes
- Validates tree structure visualization

## Special Considerations

### 1. Event Emission Patterns
- Events are emitted after state changes
- `treeUpdated` events for structural changes
- Error events capture complete context

### 2. Testing Gotchas
- Observer attachment must happen before operations
- Tree consistency must be verified at both workflow and node levels
- Event timing requires async handling

### 3. Error Context Testing
- Verify error events contain: error object, workflowId, state, logs
- Test both recoverable and non-recoverable scenarios
- Validate error event emission for all state-changing methods

### 4. Async Testing Patterns
- Use async/await for all async operations
- Test context propagation through async boundaries
- Verify async operation completion

## Recommendations for Error Merge Testing

Based on these patterns, workflow-level error merge tests should:

1. **Follow the naming convention:** `workflow-error-merge.test.ts`
2. **Use the observer pattern** to capture error events
3. **Test both class-based and functional patterns**
4. **Verify error context preservation** during merge operations
5. **Test error merge strategy implementation** via WorkflowConfig
6. **Include integration tests** with child workflow scenarios
7. **Use the established mock patterns** for agents and providers
8. **Follow the arrange-act-assert structure**
9. **Include both unit and integration test levels**
10. **Test event emission consistency** for merged errors

## Key Patterns to Follow

- **File Structure:** Unit tests in `/unit/`, integration tests in `/integration/`
- **Test Organization:** Feature-based describe blocks with specific it tests
- **Mock Setup:** Use vi.spyOn and mock providers with proper cleanup
- **Event Testing:** Capture events with observers and validate structure
- **Error Testing:** Create mock errors with complete context
- **State Testing:** Verify both workflow and node state consistency
- **Async Testing:** Properly handle async operations and timing

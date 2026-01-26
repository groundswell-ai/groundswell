# Integration Test Patterns Research Report

## Overview

This research documents the integration test patterns used in the Groundswell codebase based on analysis of 10 integration test files in `src/__tests__/integration/`.

## 1. Test Framework Details

### Framework: Vitest
- **Test Runner**: Vitest (v1.6.1)
- **Configuration**: `vitest.config.ts` with Node 18 target
- **Test Discovery**: Glob pattern `src/__tests__/**/*.test.*`
- **Globals Enabled**: Yes (for cleaner test syntax)

### Key Features Used:
- `describe`, `it`, `expect` from vitest
- `vi` namespace for mocking (vitest's jest-compatible API)
- Async/await patterns throughout
- Error testing with `rejects.toThrow()`

## 2. File Structure Patterns

### Integration Test Directory Layout:
```
src/__tests__/integration/
├── agent-workflow.test.ts           # Agent-Workflow integration
├── bidirectional-consistency.test.ts # Tree mirroring validation
├── observer-logging.test.ts         # Observer pattern tests
├── parent-restart-decisions.test.ts # Restart decision logic
├── provider-agent.test.ts          # Agent-Provider-SDK flow
├── provider-switching.test.ts      # Multi-provider scenarios
├── retry-integration.test.ts       # Retry mechanism testing
├── tree-mirroring.test.ts          # Tree structure validation
├── workflow-automatic-validation.test.ts # Response validation
└── workflow-reparenting.test.ts    # Reparenting behavior
```

### Naming Conventions:
- Files: `feature-name.test.ts`
- Test suites: `describe('Feature Integration', ...)`
- Test cases: `it('should describe behavior', ...)`

## 3. Test Setup/Teardown Patterns

### Common Setup Patterns:

#### Basic Test Class (from agent-workflow.test.ts):
```typescript
class MockAgentWorkflow extends Workflow {
  public events: WorkflowEvent[] = [];

  @Step({ name: 'step1' })
  async executeStep1(): Promise<string> {
    return 'step1-result';
  }

  @Step({ name: 'step2' })
  async executeStep2(): Promise<string> {
    return 'step2-result';
  }

  async run(): Promise<string> {
    this.setStatus('running');
    await this.executeStep1();
    await this.executeStep2();
    this.setStatus('completed');
    return 'done';
  }
}
```

#### Observer Pattern Setup (common across tests):
```typescript
const events: WorkflowEvent[] = [];
const observer: WorkflowObserver = {
  onLog: () => {}, // Empty - not testing logs
  onEvent: (event) => events.push(event), // Capture events
  onStateUpdated: () => {}, // Empty - not testing state
  onTreeChanged: () => {}, // Empty - not testing tree
};

workflow.addObserver(observer);
```

#### beforeEach Pattern (from provider-agent.test.ts):
```typescript
beforeEach(async () => {
  // CRITICAL: Reset registry state for isolation
  ProviderRegistry._resetForTesting();
  // Reset global provider config
  resetGlobalConfig();
  // Clear all mocks
  vi.clearAllMocks();
});
```

## 4. Mocking Patterns

### Agent Mocking:
```typescript
// Mock AgentResponse creation
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
```

### Provider Mocking:
```typescript
// Mock Anthropic SDK
function createMockSDK(result: unknown = { result: 'test result' }) {
  const mockQuery = vi.fn();
  
  mockQuery.mockImplementation(() => {
    const generator = (async function* () {
      yield {
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Test response' }]
        }
      };
      yield {
        type: 'result',
        subtype: 'success',
        result,
        usage: { input_tokens: 100, output_tokens: 50 }
      };
    })();
    
    generator.streamInput = vi.fn().mockResolvedValue(undefined);
    return generator;
  });
  
  return {
    query: mockQuery,
    createSdkMcpServer: vi.fn(),
    tool: vi.fn()
  };
}
```

### Spy Pattern:
```typescript
// Spy on provider execution
const executeSpy = vi.spyOn(provider, 'execute');
await agent.prompt(prompt);
expect(executeSpy).toHaveBeenCalled();
```

## 5. Event Emission Testing Patterns

### Event Collection:
```typescript
const events: WorkflowEvent[] = [];

const observer: WorkflowObserver = {
  onEvent: (event) => events.push(event),
  // ... other handlers
};
```

### Event Filtering and Assertion:
```typescript
// Filter by event type
const stepStarts = events.filter((e) => e.type === 'stepStart');
const stepEnds = events.filter((e) => e.type === 'stepEnd');

expect(stepStarts).toHaveLength(2);
expect(stepEnds).toHaveLength(2);

// Check specific event properties
expect(stepStarts[0]?.node.name).toBe('step1');
```

### Event Type Validation:
```typescript
// Verify event was emitted
expect(events.some((e) => e.type === 'stepStart')).toBe(true);
expect(events.some((e) => e.type === 'stepEnd')).toBe(true);
```

### Mock Event Verification:
```typescript
// Using vitest mocks
const observer = {
  onEvent: vi.fn(),
  // ... other handlers
};

// After execution
const invalidEvents = observer.onEvent.mock.calls
  .flatMap(call => call)
  .filter((event: WorkflowEvent) => event.type === 'invalidResponse');

expect(invalidEvents).toHaveLength(1);
```

## 6. WorkflowError and Error Handling Test Patterns

### WorkflowError Structure Testing:
```typescript
let caughtError: unknown;
try {
  await workflow.run();
} catch (error) {
  caughtError = error;
}

const workflowError = caughtError as WorkflowError;
expect(workflowError.message).toContain("validation failed");
expect(workflowError.workflowId).toBe(workflow.id);
expect(workflowError.original).toBeDefined();
expect(workflowError.state).toBeDefined();
expect(workflowError.logs).toBeInstanceOf(Array);
```

### Error Type Guards:
```typescript
// Using isSuccess type guard
if (isSuccess(response)) {
  // TypeScript knows: response.data is available
  expect(response.data).toBeDefined();
}

// Using isError type guard
if (isError(response)) {
  // TypeScript knows: response.error exists
  expect(response.error.code).toBe('TEST_ERROR');
}
```

### Testing Error Scenarios:
```typescript
// Mock error response
vi.spyOn(provider, 'execute').mockResolvedValue({
  status: 'error',
  data: null,
  error: {
    code: 'TEST_ERROR',
    message: 'Test error',
    details: null,
    recoverable: false
  },
  metadata: {
    agentId: 'test',
    timestamp: Date.now(),
    duration: 0
  }
});
```

## 7. Assertion Patterns

### Common Assertion Types:

#### Result Structure Testing:
```typescript
expect(result).toEqual({
  data: 'completed',
  node: expect.any(Object),
  duration: expect.any(Number),
});
```

#### Array Length Testing:
```typescript
expect(stepStarts).toHaveLength(2);
expect(events.some((e) => e.type === 'stepStart')).toBe(true);
```

#### Object Property Testing:
```typescript
expect(response.metadata).toBeDefined();
expect(response.metadata.agentId).toBe('test-agent');
expect(response.metadata.timestamp).toBeGreaterThan(0);
```

#### Error Testing:
```typescript
await expect(workflow.run()).rejects.toThrow('Step failed');

expect(isError(response)).toBe(true);
expect(response.status).toBe('error');
expect(response.error).toBeDefined();
```

#### Type-Specific Testing:
```typescript
// PRD 6.4.4 compliance - null handling
expect(response.error).toBeNull();
expect(response.error).not.toBeUndefined();
```

## 8. Helper Functions and Utilities

### Tree Verification Helpers:
Located in `src/__tests__/helpers/tree-verification.ts`:
- `collectAllNodes()` - Collect all workflow nodes
- `validateTreeConsistency()` - Validate 1:1 mirror invariant
- `verifyBidirectionalLink()` - Verify parent-child links
- `verifyNoCycles()` - Check for circular references
- `verifyTreeMirror()` - Validate WorkflowNode tree consistency

### Response Validation Helpers:
```typescript
// From workflow-automatic-validation.test.ts
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
```

### Workflow Setup Helpers:
```typescript
// Common pattern for creating test workflows
const workflow = new Workflow<string>(
  { name: 'TestWorkflow' },
  async (ctx) => {
    await ctx.step('step-name', async () => {
      return 'step result';
    });
    return 'completed';
  }
);
```

## 9. Configuration Patterns

### Workflow Configuration:
```typescript
const workflow = createWorkflow(
  { 
    name: 'TestWorkflow',
    autoValidateResponses: false, // Disable validation for testing
    enableReflection: true,      // Enable reflection features
  },
  async (ctx) => {
    // ...
  }
);
```

### Agent Configuration:
```typescript
const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  system: 'You are a helpful assistant'
});
```

### Prompt Configuration:
```typescript
const prompt = new Prompt({
  user: 'Test prompt',
  responseFormat: z.object({ result: z.string() }),
  system: 'Prompt system override'
});
```

## 10. Gotchas and Special Considerations

### Important Testing Patterns:

1. **Registry Reset**: Critical for provider tests
   ```typescript
   ProviderRegistry._resetForTesting();
   ```

2. **Mock SDK Setup**: Requires private property access
   ```typescript
   // @ts-expect-error - Testing private property
   provider.sdk = createMockSDK();
   ```

3. **Event Isolation**: Clear events between test phases
   ```typescript
   parent1Events.length = 0; // Clear any construction events
   ```

4. **Async Boundaries**: Wait for async operations
   ```typescript
   await new Promise((resolve) => setTimeout(resolve, 10));
   ```

5. **Workflow States**: Manually set workflow status
   ```typescript
   workflow.setStatus('running');
   workflow.setStatus('completed');
   ```

### Common Pitfalls:

1. **Mock Persistence**: Always clear mocks with `vi.clearAllMocks()`
2. **Event Timing**: Some events are emitted asynchronously
3. **Workflow Lifecycle**: Workflows need explicit state setting
4. **Type Guards**: Always use `isSuccess`/`isError` for type narrowing
5. **Provider Registry**: Must be reset between tests for isolation

### Test Organization:

1. **Phase-Based Tests**: Many tests use ARRANGE-ACT-ASSERT phases
2. **Nested Describes**: Tests are organized by feature/behavior
3. **Helper Functions**: Complex setup is extracted to helper functions
4. **Mock Factories**: Reusable mock creation functions

## 11. Relevant Test Files with Line Numbers

### Core Pattern Examples:

1. **Agent-Workflow Integration**: `/src/__tests__/integration/agent-workflow.test.ts`
   - Line 42-211: Basic workflow with steps
   - Line 213-261: Prompt integration tests
   - Line 263-573: Agent.prompt() integration

2. **Workflow Automatic Validation**: `/src/__tests__/integration/workflow-automatic-validation.test.ts`
   - Line 39-144: Validation enabled tests
   - Line 230-283: Validation disabled tests
   - Line 284-350: Event payload structure tests
   - Line 353-406: WorkflowError structure tests

3. **Provider-Agent Integration**: `/src/__tests__/integration/provider-agent.test.ts`
   - Line 140-188: Agent creation with providers
   - Line 194-324: agent.prompt() → provider.execute() flow
   - Line 330-452: Tool executor delegation
   - Line 458-576: Session state management

4. **Workflow Reparenting**: `/src/__tests__/integration/workflow-reparenting.test.ts`
   - Line 32-127: Basic reparenting test
   - Line 129-186: Multiple reparenting cycles
   - Line 188-200+: Tree consistency validation

### Key Helper Files:

1. **Tree Verification Helpers**: `/src/__tests__/helpers/tree-verification.ts`
2. **WorkflowError Type**: `/src/types/error.ts` (lines 7-20)
3. **WorkflowEvent Types**: `/src/types/events.ts` (lines 12-82)


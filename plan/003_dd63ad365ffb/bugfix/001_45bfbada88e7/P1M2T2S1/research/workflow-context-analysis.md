# Workflow Context Analysis - Research Notes

## Key Files Identified

### Core Implementation Files
- `src/core/workflow-context.ts` - WorkflowContextImpl class with step() and replaceLastPromptResult() methods
- `src/core/workflow.ts` - Workflow class with validateAgentResponse() method (lines 729-770)
- `src/utils/agent-validation.ts` - validateAgentResponse utility function (lines 91-108)

### Type Definition Files
- `src/types/workflow-context.ts` - WorkflowConfig interface (lines 144-150)
- `src/types/agent.ts` - AgentResponse interface, INVALID_RESPONSE_FORMAT error code
- `src/types/events.ts` - invalidResponse event type (line 22)
- `src/types/error.ts` - WorkflowError interface

## Current Agent Operation Flow

1. **agent.prompt()** is called in workflow steps
2. Returns `AgentResponse<T>` with status ('success' | 'error' | 'partial')
3. **agent.execute()** does NOT exist as a public method
4. Results flow through `runInContext()` in workflow-context.ts

## Existing Hook Patterns

### AgentHooks Pattern (src/types/sdk-primitives.ts)
```typescript
export interface AgentHooks {
  preToolUse?: HookHandler<PreToolUseContext>[];
  postToolUse?: HookHandler<PostToolUseContext>[];
  sessionStart?: HookHandler<SessionStartContext>[];
  sessionEnd?: HookHandler<SessionEndContext>[];
}
```

### Workflow Event Emission Pattern
```typescript
this.emitEvent({
  type: 'invalidResponse',
  node: this.node,
  response,
  agentId,
  errors: zodError,
  timestamp: Date.now(),
});
```

## Validation Utility

### validateAgentResponse() (src/utils/agent-validation.ts)
- Pure function, non-throwing, uses safeParse()
- Returns ValidationResult: { valid: boolean, errors?: ZodError }
- Defaults to z.unknown() schema if none provided

### Workflow.validateAgentResponse() (src/core/workflow.ts)
- Calls shared utility, emits invalidResponse event
- Creates WorkflowError with rich context
- Returns boolean (true/false)

## WorkflowConfig Pattern

Current options:
- `name?: string` - Human-readable name
- `enableReflection?: boolean` - Opt-in flag for reflection

Pattern for new opt-in flags:
1. Add to WorkflowConfig interface
2. Default to false for opt-in behavior
3. Check `config?.flag` in implementation
4. Propagate from workflow → context

## Error Handling

### INVALID_RESPONSE_FORMAT Error Code
- Defined in src/types/agent.ts AGENT_ERROR_CODES
- Used for responses not matching AgentResponse schema

### WorkflowError Structure
```typescript
interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}
```

## Integration Points for PRP

1. **validateAgentResponse utility** - Already exists, can be called directly
2. **invalidResponse event** - Already defined in events schema
3. **WorkflowConfig** - Add autoValidateResponses boolean flag
4. **Context execution wrapper** - Modify step() method to validate results
5. **AgentResponse detection** - Check if result is AgentResponse before validating

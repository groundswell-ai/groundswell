# PRP: Agent & Prompt Foundation + Hierarchy Integration

## Phases 1 & 2 Implementation Plan

---

## Goal

### Feature Goal
Implement the foundational Agent and Prompt classes with full Anthropic SDK integration, and integrate them into the existing workflow hierarchy with automatic context propagation and event capture.

### Deliverable
A complete Agent/Prompt system where:
1. `Agent` class wraps Anthropic SDK for prompt execution
2. `Prompt<T>` class provides type-safe, immutable prompt definitions with Zod validation
3. Agent calls within workflow steps automatically capture events in the workflow tree
4. Zero-plumbing context propagation via `AsyncLocalStorage`
5. Extended `WorkflowEvent` union captures all agent/prompt/tool activities

### Success Definition
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm test` passes all new and existing tests
- [ ] Agent can execute prompts and validate responses with Zod schemas
- [ ] Events from agent.prompt() calls appear in WorkflowTreeDebugger output
- [ ] Context propagates automatically without manual plumbing

---

## Context

### External Documentation
```yaml
anthropic_sdk:
  npm: "https://www.npmjs.com/package/@anthropic-ai/sdk"
  github: "https://github.com/anthropics/anthropic-sdk-typescript"
  api_reference: "https://github.com/anthropics/anthropic-sdk-typescript/blob/main/api.md"
  tool_use: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use"
  version: "^0.71.1"

zod:
  npm: "https://www.npmjs.com/package/zod"
  docs: "https://v3.zod.dev/"
  api: "https://zod.dev/api"
  version: "^3.23.0"

async_local_storage:
  node_docs: "https://nodejs.org/api/async_context.html"
```

### Codebase Patterns to Follow
```yaml
workflow_base_class:
  file: "/src/core/workflow.ts"
  pattern: "Abstract class with node representation, emitEvent(), observer propagation"
  key_methods: "constructor(), attachChild(), emitEvent(), getNode(), setStatus()"

event_types:
  file: "/src/types/events.ts"
  pattern: "Discriminated union with type field"
  existing: "childAttached, stateSnapshot, stepStart, stepEnd, error, taskStart, taskEnd, treeUpdated"

observer_pattern:
  file: "/src/types/observer.ts"
  pattern: "WorkflowObserver interface with onLog, onEvent, onStateUpdated, onTreeChanged"

step_decorator:
  file: "/src/decorators/step.ts"
  pattern: "Method decorator that emits stepStart/stepEnd events, captures timing"

id_generation:
  file: "/src/utils/id.ts"
  pattern: "generateId() using crypto.randomUUID()"

type_exports:
  file: "/src/types/index.ts"
  pattern: "Re-export all types from individual files"

main_exports:
  file: "/src/index.ts"
  pattern: "Export classes from core/, decorators/, debugger/, utils/"
```

### Architectural Decisions (from system_context.md)
```yaml
decision_1:
  rule: "Agent is NOT a Workflow subclass"
  reason: "Agents execute prompts; they don't have their own lifecycle"

decision_2:
  rule: "Prompts are immutable value objects"
  reason: "Prompts define what to send; execution happens via Agent.prompt()"

decision_3:
  rule: "WorkflowContext provides step() and spawnWorkflow()"
  reason: "PRD requires step() callable anywhere in JS control flow"

decision_4:
  rule: "All SDK properties pass through unchanged"
  reason: "tools, mcps, skills, hooks, env must map 1:1 to Anthropic SDK"
```

### Test Patterns
```yaml
test_framework: "vitest"
test_location: "/src/__tests__/unit/*.test.ts and /src/__tests__/integration/*.test.ts"
test_config: "/vitest.config.ts"
test_pattern: |
  import { describe, it, expect } from 'vitest';
  describe('ClassName', () => {
    it('should do something', () => {
      expect(result).toBe(expected);
    });
  });
```

---

## Implementation Tasks

### Phase 1: Foundation Layer - Agent & Prompt Core

#### P1.M1: Project Setup & Dependencies

**P1.M1.T1.S1: Update package.json with dependencies**
```
LOCATION: /package.json
ACTION: Add dependencies block with @anthropic-ai/sdk@^0.71.1 and zod@^3.23.0
VALIDATION: npm install succeeds, npm ls @anthropic-ai/sdk zod shows correct versions
```

**P1.M1.T2.S1: Create AgentConfig and PromptOverrides types**
```
LOCATION: /src/types/agent.ts (NEW FILE)
PATTERN: Follow /src/types/workflow.ts structure
EXPORTS: AgentConfig, PromptOverrides interfaces
CONTENT:
  - AgentConfig: name?, system?, tools?, mcps?, skills?, hooks?, env?, enableReflection?, enableCache?
  - PromptOverrides: extends relevant AgentConfig fields + temperature?, maxTokens?, stop?, disableCache?
VALIDATION: tsc --noEmit passes
```

**P1.M1.T2.S2: Create PromptConfig and Prompt types**
```
LOCATION: /src/types/prompt.ts (NEW FILE)
IMPORTS: z from 'zod', AgentConfig from './agent.js'
EXPORTS: PromptConfig<T> interface
CONTENT:
  - PromptConfig<T>: user (string), data? (Record<string,any>), responseFormat (z.ZodType<T>)
  - Plus override fields: system?, tools?, mcps?, skills?, hooks?, enableReflection?
VALIDATION: tsc --noEmit passes
```

**P1.M1.T2.S3: Create SDK primitive types**
```
LOCATION: /src/types/sdk-primitives.ts (NEW FILE)
PATTERN: Mirror Anthropic SDK types for pass-through
EXPORTS: Tool, MCPServer, Skill, AgentHooks, HookHandler interfaces
CONTENT:
  - Tool: name, description, input_schema (JSON Schema object)
  - MCPServer: name, version?, transport ('stdio'|'inprocess'), command?, args?, tools?
  - Skill: name, path (string to skill directory)
  - AgentHooks: PreToolUse?, PostToolUse?, SessionStart?, SessionEnd? arrays
VALIDATION: tsc --noEmit passes
```

**P1.M1.T2.S4: Update types/index.ts exports**
```
LOCATION: /src/types/index.ts
ACTION: Add exports for new type files
PATTERN: Follow existing re-export pattern
```

#### P1.M2: Agent & Prompt Class Implementation

**P1.M2.T1.S1: Implement Agent constructor and config storage**
```
LOCATION: /src/core/agent.ts (NEW FILE)
IMPORTS: Anthropic from '@anthropic-ai/sdk', types from '../types/index.js'
PATTERN: Store config, instantiate private Anthropic client
CLASS: Agent
CONSTRUCTOR: (config: AgentConfig) => stores all config fields, creates client
VALIDATION: Unit test creates Agent instance successfully
```

**P1.M2.T2.S1: Implement Prompt<T> class**
```
LOCATION: /src/core/prompt.ts (NEW FILE)
IMPORTS: z from 'zod', types from '../types/index.js'
CLASS: Prompt<T>
CONSTRUCTOR: (config: PromptConfig<T>) => stores all fields as readonly
METHODS: validateResponse(data: unknown): T using this.responseFormat.parse()
PATTERN: Immutable value object - all fields readonly
VALIDATION: Unit test creates Prompt, validates response successfully
```

**P1.M2.T1.S2: Implement Agent.prompt() method**
```
LOCATION: /src/core/agent.ts
DEPENDENCIES: Agent constructor, Prompt class
METHOD: prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>
LOGIC:
  1. Merge config: Prompt overrides > PromptOverrides param > AgentConfig defaults
  2. Build Anthropic messages.create() params
  3. Execute API call
  4. Extract text content from response
  5. Parse JSON from text
  6. Validate with prompt.responseFormat.parse()
  7. Return typed result
ERROR_HANDLING: Throw on validation failure, API errors
VALIDATION: Integration test with mock API or real API call
```

**P1.M2.T1.S3: Implement Agent.reflect() method**
```
LOCATION: /src/core/agent.ts
DEPENDENCIES: Agent.prompt()
METHOD: reflect<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>
LOGIC: Same as prompt() but with reflection system prefix when enableReflection is true
VALIDATION: Unit test verifies reflection prefix added
```

**P1.M2.T3.S1: Implement tools array pass-through**
```
LOCATION: /src/core/agent.ts (within prompt() method)
LOGIC:
  1. Merge tools: prompt.toolsOverride ?? overrides?.tools ?? this.config.tools
  2. Pass to messages.create({ tools: mergedTools })
  3. Handle tool_use stop_reason with tool execution loop
VALIDATION: Test with mock tool definition, verify passed to API
```

**P1.M2.T3.S2: Implement MCP server handler**
```
LOCATION: /src/core/mcp-handler.ts (NEW FILE)
CLASS: MCPHandler
METHODS:
  - registerServer(server: MCPServer): void
  - getTools(): Tool[] (converts MCP tools to Anthropic format)
LOGIC: For inprocess transport: direct tool registration. For stdio: document as future.
VALIDATION: Unit test with inprocess MCP server
```

**P1.M2.T3.S3: Implement hooks pass-through**
```
LOCATION: /src/core/agent.ts (within prompt() method)
LOGIC:
  1. Merge hooks from config/overrides
  2. Call PreToolUse hooks before tool execution
  3. Call PostToolUse hooks after tool execution
VALIDATION: Unit test verifies hooks called at correct times
```

**P1.M2.T3.S4: Implement skills and env pass-through**
```
LOCATION: /src/core/agent.ts
LOGIC:
  - Skills: Load SKILL.md from skill.path, inject into system prompt
  - Env: Temporarily set process.env during prompt execution
VALIDATION: Test skill content appears in system prompt
```

**P1.M2.T4: Update core/index.ts and main exports**
```
LOCATION: /src/core/index.ts, /src/index.ts
ACTION: Export Agent, Prompt classes
VALIDATION: Import from 'groundswell' works
```

---

### Phase 2: Hierarchy & Event System Integration

#### P2.M1: Event Tree Extension

**P2.M1.T1.S1: Add agent event types to WorkflowEvent union**
```
LOCATION: /src/types/events.ts
ACTION: Extend WorkflowEvent union with new types
NEW_TYPES:
  - { type: 'agentPromptStart'; agentId: string; promptId: string; node: WorkflowNode }
  - { type: 'agentPromptEnd'; agentId: string; promptId: string; node: WorkflowNode; duration: number; tokenUsage?: { input: number; output: number } }
  - { type: 'toolInvocation'; toolName: string; input: unknown; output: unknown; duration: number; node: WorkflowNode }
  - { type: 'mcpEvent'; serverName: string; event: string; node: WorkflowNode }
  - { type: 'reflectionStart'; level: string; node: WorkflowNode }
  - { type: 'reflectionEnd'; level: string; success: boolean; node: WorkflowNode }
VALIDATION: tsc --noEmit passes
```

**P2.M1.T2.S1: Create AgentExecutionContext for hierarchy tracking**
```
LOCATION: /src/core/context.ts (NEW FILE)
IMPORTS: AsyncLocalStorage from 'node:async_hooks'
EXPORTS: AgentExecutionContext, agentExecutionContext (singleton)
INTERFACE:
  - workflowNode: WorkflowNode | null
  - emitEvent: (event: WorkflowEvent) => void
PATTERN: Use AsyncLocalStorage<AgentExecutionContext>
METHODS:
  - getContext(): AgentExecutionContext | undefined
  - runInContext<T>(ctx: AgentExecutionContext, fn: () => Promise<T>): Promise<T>
VALIDATION: Unit test context propagation through async calls
```

**P2.M1.T1.S2: Emit agentPromptStart/End events from Agent.prompt()**
```
LOCATION: /src/core/agent.ts
DEPENDENCIES: AgentExecutionContext
LOGIC:
  1. Check agentExecutionContext.getContext()
  2. If context exists, emit agentPromptStart before API call
  3. Track duration
  4. Emit agentPromptEnd after response with tokenUsage
  5. If no context, events are standalone (not in tree)
VALIDATION: Integration test shows events in tree when called from step
```

**P2.M1.T1.S3: Emit toolInvocation and mcpEvent events**
```
LOCATION: /src/core/agent.ts, /src/core/mcp-handler.ts
DEPENDENCIES: AgentExecutionContext
LOGIC:
  - In tool execution loop: emit toolInvocation for each tool call
  - In MCP handler: emit mcpEvent for MCP interactions
VALIDATION: Test tool events appear nested under agentPrompt node
```

**P2.M1.T2.S2: Integrate context into @Step decorator**
```
LOCATION: /src/decorators/step.ts
DEPENDENCIES: AgentExecutionContext
LOGIC:
  1. Before executing step function, get/create WorkflowNode
  2. Create AgentExecutionContext with node and emitEvent
  3. Use runInContext() to wrap step execution
  4. Any agent.prompt() inside step automatically inherits context
VALIDATION: Agent calls inside @Step decorated methods emit events in tree
```

#### P2.M2: WorkflowContext Implementation

**P2.M2.T1.S1: Define WorkflowContext interface**
```
LOCATION: /src/types/workflow-context.ts (NEW FILE)
EXPORTS: WorkflowContext interface
CONTENT:
  - workflowId: string
  - parentWorkflowId?: string
  - step(name: string, fn: () => Promise<any>): Promise<any>
  - spawnWorkflow(wf: Workflow): Promise<any>
  - eventTree: EventTreeHandle
  - reflection: ReflectionAPI (placeholder for Phase 3)
VALIDATION: tsc --noEmit passes
```

**P2.M2.T1.S2: Implement WorkflowContext class**
```
LOCATION: /src/core/workflow-context.ts (NEW FILE)
CLASS: WorkflowContextImpl implements WorkflowContext
CONSTRUCTOR: (workflow: Workflow)
METHODS:
  - step(name, fn): Creates step node, sets AgentExecutionContext, executes fn, captures result/error, emits stepStart/stepEnd
  - spawnWorkflow(wf): Attaches child workflow, runs it, returns result
  - eventTree getter: Returns EventTreeHandle for current workflow
PATTERN: Use AgentExecutionContext.runInContext() in step()
VALIDATION: Test step() creates events, test spawnWorkflow() attaches children
```

**P2.M2.T1.S3: Update Workflow class for executor pattern**
```
LOCATION: /src/core/workflow.ts
ACTION: Add optional executor function to constructor
SIGNATURE: constructor(config?: WorkflowConfig | string, executor?: (ctx: WorkflowContext) => Promise<any>)
LOGIC:
  - If executor provided: In run(), create WorkflowContext, call executor(ctx)
  - Keep abstract run() support for class-based workflows (backward compat)
NEW_INTERFACE:
  WorkflowConfig { name?: string; enableReflection?: boolean }
VALIDATION: Both patterns work - class-based and functional
```

**P2.M2.T2.S1: Implement EventTreeHandle**
```
LOCATION: /src/core/event-tree.ts (NEW FILE)
CLASS: EventTreeHandle
CONSTRUCTOR: (root: WorkflowNode)
METHODS:
  - get root(): EventNode
  - getNode(id: string): EventNode | undefined
  - getChildren(id: string): EventNode[]
  - getAncestors(id: string): EventNode[]
  - toJSON(): EventNode
PATTERN: Use existing WorkflowNode traversal from WorkflowTreeDebugger
VALIDATION: Unit test all traversal methods
```

**P2.M2.T3: Update exports**
```
LOCATION: /src/types/index.ts, /src/core/index.ts, /src/index.ts
ACTION: Export all new types and classes
EXPORTS:
  - WorkflowContext, WorkflowContextImpl
  - EventTreeHandle
  - AgentExecutionContext helpers
VALIDATION: All exports accessible from main package
```

---

## Validation Gates

### After Phase 1:
```bash
# Type check
npm run lint

# Build
npm run build

# Unit tests for Agent and Prompt
npm test -- --grep "Agent|Prompt"

# Manual validation
node -e "const { Agent, Prompt } = require('./dist'); console.log('Imports work');"
```

### After Phase 2:
```bash
# Full test suite
npm test

# Integration test - events in tree
npm test -- --grep "tree-mirroring"

# Manual validation - create workflow with agent
cat << 'EOF' > /tmp/test-agent.ts
import { Workflow, Agent, Prompt, WorkflowTreeDebugger } from './dist';
import { z } from 'zod';

const agent = new Agent({ name: 'TestAgent' });
const prompt = new Prompt({
  user: 'Say hello',
  responseFormat: z.object({ message: z.string() })
});

class TestWorkflow extends Workflow {
  async run() {
    this.setStatus('running');
    // This should emit events
    const result = await agent.prompt(prompt);
    console.log(result);
    this.setStatus('completed');
  }
}

const wf = new TestWorkflow('Test');
const debugger_ = new WorkflowTreeDebugger(wf);
debugger_.events.subscribe({ next: e => console.log('Event:', e.type) });
wf.run();
EOF
npx tsx /tmp/test-agent.ts
```

---

## Final Validation Checklist

- [ ] package.json has @anthropic-ai/sdk@^0.71.1 and zod@^3.23.0
- [ ] All new files created in correct locations
- [ ] Types exported from /src/types/index.ts
- [ ] Classes exported from /src/index.ts
- [ ] Agent.prompt() executes API calls and validates responses
- [ ] Prompt<T> provides type-safe response validation
- [ ] AgentExecutionContext propagates through AsyncLocalStorage
- [ ] Events emitted when agent.prompt() called within workflow step
- [ ] WorkflowTreeDebugger shows agent events in tree visualization
- [ ] @Step decorator integrates context automatically
- [ ] WorkflowContext.step() works for functional workflow pattern
- [ ] All existing tests still pass
- [ ] npm run build produces valid dist/

---

## File Creation Summary

### New Files:
```
/src/types/agent.ts           - AgentConfig, PromptOverrides types
/src/types/prompt.ts          - PromptConfig<T> type
/src/types/sdk-primitives.ts  - Tool, MCPServer, Skill, AgentHooks types
/src/types/workflow-context.ts - WorkflowContext interface
/src/core/agent.ts            - Agent class
/src/core/prompt.ts           - Prompt<T> class
/src/core/context.ts          - AgentExecutionContext with AsyncLocalStorage
/src/core/mcp-handler.ts      - MCPHandler class
/src/core/workflow-context.ts - WorkflowContextImpl class
/src/core/event-tree.ts       - EventTreeHandle class
/src/__tests__/unit/agent.test.ts
/src/__tests__/unit/prompt.test.ts
/src/__tests__/unit/context.test.ts
/src/__tests__/integration/agent-workflow.test.ts
```

### Modified Files:
```
/package.json                 - Add dependencies
/src/types/index.ts           - Export new types
/src/types/events.ts          - Extend WorkflowEvent union
/src/core/workflow.ts         - Add executor pattern support
/src/core/index.ts            - Export new classes
/src/decorators/step.ts       - Integrate AgentExecutionContext
/src/index.ts                 - Export all new public API
```

---

## Confidence Score: 8/10

**Strengths:**
- Clear existing codebase patterns to follow
- Well-documented external dependencies
- Specific file locations and method signatures
- Comprehensive validation steps

**Risks:**
- AsyncLocalStorage integration with existing decorator may need iteration
- Tool execution loop complexity depends on actual Anthropic SDK behavior
- MCP handler may need refinement based on actual MCP protocol details

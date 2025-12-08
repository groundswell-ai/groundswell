# PRP: Phase 4 & 5 - Validation & Examples Completion

## Phases 4 & 5 Implementation Plan

> **PRP**: Product Requirements Package - A comprehensive implementation guide enabling one-pass success

---

## Pre-Implementation Checklist

Before implementing, verify you have:
- [ ] Read and understood this entire PRP
- [ ] Read PRPs/PRDs/002-agent-prompt.md (main PRD - all sections)
- [ ] Read PRPs/PRDs/003-agent-prompt.md (Phases 3 & 4 PRP)
- [ ] Verified Phases 1-4 are complete (run validation commands below)
- [ ] Access to `./` codebase
- [ ] npm dependencies installed: `@anthropic-ai/sdk@^0.71.1`, `zod@^3.23.0`, `lru-cache@^10.0.0`
- [ ] Understanding of existing examples in `/examples/examples/01-06*.ts`

---

## Phase 4 & 5 Status Summary

### Phase 4: Dynamic Behavior & Introspection - **COMPLETE**

All Phase 4 tasks have been implemented:

| Task | Status | Implementation File |
|------|--------|---------------------|
| P4.1: Dynamic Factory Functions | COMPLETE | `/src/core/factory.ts` |
| P4.2: Dynamic Context Revision | COMPLETE | `/src/core/workflow-context.ts` |
| P4.3: Introspection Tool Definitions | COMPLETE | `/src/tools/introspection.ts` |
| P4.4: Introspection Tool Handlers | COMPLETE | `/src/tools/introspection.ts` |
| P4.5: Main Exports Update | COMPLETE | `/src/index.ts` |

### Phase 5: Examples - **IN PROGRESS**

| Task | Status | Implementation File |
|------|--------|---------------------|
| P5.1: Example 7 - Agent Loops | PENDING | `/examples/examples/07-agent-loops.ts` |
| P5.2: Example 8 - SDK Features | PENDING | `/examples/examples/08-sdk-features.ts` |
| P5.3: Example 9 - Multi-level Reflection | PENDING | `/examples/examples/09-reflection.ts` |
| P5.4: Example 10 - Introspection Tools | PENDING | `/examples/examples/10-introspection.ts` |
| P5.5: Update index.ts and README | PENDING | `/examples/index.ts`, `/examples/README.md` |

---

## 1. Goal

### Feature Goal
Complete the Groundswell orchestration framework by:
1. Validating all Phase 4 implementations are production-ready
2. Creating canonical examples 7-10 demonstrating Agent loops, SDK features, reflection, and introspection
3. Updating example runner and documentation

### Deliverable
A complete system where:
1. All Phase 3-4 implementations pass validation (PRD Sections 9, 10, 11)
2. Examples 7-10 demonstrate advanced Agent/Prompt capabilities (PRD Section 12 items 7-10)
3. Full examples runner with documentation

### Success Definition
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm test` passes all unit and integration tests
- [ ] Examples 7-10 execute successfully: `npx tsx examples/examples/07-agent-loops.ts`
- [ ] All 10 PRD examples listed in examples/README.md
- [ ] Cache, Reflection, and Introspection systems demonstrated in examples

---

## 2. Context

### External Documentation
```yaml
anthropic_sdk:
  url: "https://github.com/anthropics/anthropic-sdk-typescript"
  purpose: "Tool definitions, message API, error types"
  version: "^0.71.1"
  key_sections:
    - "Tool Use" - https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
    - "Streaming" - https://github.com/anthropics/anthropic-sdk-typescript#streaming

lru_cache:
  url: "https://www.npmjs.com/package/lru-cache"
  purpose: "LRU cache implementation (already installed)"
  version: "^10.0.0"

zod:
  url: "https://zod.dev/"
  purpose: "Schema validation for response formats"
  version: "^3.23.0"
```

### Codebase Context
```yaml
existing_implementations:
  - file: "/src/core/agent.ts"
    purpose: "Agent class with prompt(), reflect(), cache integration"
    key_exports: "Agent, PromptResult"
    lines: 573

  - file: "/src/core/prompt.ts"
    purpose: "Immutable Prompt class with Zod validation"
    key_exports: "Prompt"
    lines: 150

  - file: "/src/core/factory.ts"
    purpose: "Dynamic creation functions"
    key_exports: "createWorkflow, createAgent, createPrompt, quickWorkflow, quickAgent"
    lines: 124

  - file: "/src/cache/cache.ts"
    purpose: "LRU cache with metrics"
    key_exports: "LLMCache, defaultCache, CacheConfig, CacheMetrics"
    lines: 237

  - file: "/src/cache/cache-key.ts"
    purpose: "Deterministic cache key generation"
    key_exports: "generateCacheKey, deterministicStringify, getSchemaHash"
    lines: 245

  - file: "/src/reflection/reflection.ts"
    purpose: "ReflectionManager with retry logic"
    key_exports: "ReflectionManager, executeWithReflection"
    lines: 407

  - file: "/src/tools/introspection.ts"
    purpose: "6 introspection tools with handlers"
    key_exports: "INTROSPECTION_TOOLS, INTROSPECTION_HANDLERS, all handlers"
    lines: 465

  - file: "/src/core/workflow-context.ts"
    purpose: "WorkflowContext with step(), spawnWorkflow(), replaceLastPromptResult()"
    key_exports: "WorkflowContextImpl, createWorkflowContext"
    lines: 349

existing_examples:
  - file: "/examples/examples/01-basic-workflow.ts"
    demonstrates: "Core workflow concepts, status lifecycle, logging"

  - file: "/examples/examples/02-decorator-options.ts"
    demonstrates: "@Step, @Task, @ObservedState options"

  - file: "/examples/examples/03-parent-child.ts"
    demonstrates: "Hierarchical workflows, event propagation"

  - file: "/examples/examples/04-observers-debugger.ts"
    demonstrates: "WorkflowObserver, WorkflowTreeDebugger, streaming"

  - file: "/examples/examples/05-error-handling.ts"
    demonstrates: "WorkflowError, retry patterns, error context"

  - file: "/examples/examples/06-concurrent-tasks.ts"
    demonstrates: "Sequential vs concurrent, fan-out/fan-in"

naming_conventions:
  files: "kebab-case.ts (e.g., 07-agent-loops.ts)"
  classes: "PascalCase (e.g., DataProcessorWorkflow)"
  functions: "camelCase (e.g., runAgentLoopsExample)"
  tools: "snake_case (e.g., inspect_current_node)"
  exports: "run*Example pattern (e.g., runAgentLoopsExample)"
```

### Technical Constraints
```yaml
typescript:
  version: "5.2+"
  config_requirements:
    - "strict: true"
    - "module: NodeNext"
    - "moduleResolution: NodeNext"

runtime:
  node_version: "18+"
  target: "ES2022"

testing:
  framework: "vitest"
  command: "npm test"
  pattern: "describe/it/expect"

example_execution:
  command: "npx tsx examples/examples/07-agent-loops.ts"
  runner: "npm run start:all"
```

### Research References
```yaml
caching_patterns:
  file: "/plan/P3P4/research/caching-lru.md"
  key_points:
    - "Deterministic stringify with sorted keys"
    - "LRU config: maxItems=1000, maxSizeBytes=50MB, ttl=1hr"
    - "SHA-256 for cache keys (64-char hex)"
    - "Schema hashing via _def (16-char prefix)"

reflection_patterns:
  file: "/plan/P3P4/research/reflection-patterns.md"
  key_points:
    - "Three levels: workflow, agent, prompt"
    - "Max 3 attempts before failure"
    - "Skip reflection for rate limits, auth errors, quota exceeded"
    - "Emit reflectionStart/reflectionEnd events"

introspection_tools:
  file: "/plan/P3P4/research/introspection-tools.md"
  key_points:
    - "6 tools: inspect_current_node, read_ancestor_chain, list_siblings_children, inspect_prior_outputs, inspect_cache_status, request_spawn_workflow"
    - "All tools are read-only (except spawn)"
    - "Use getExecutionContext() for context access"
    - "Security: filter secrets, respect boundaries"

agent_introspection_patterns:
  file: "/plan/research/agent-introspection-patterns.md"
  key_points:
    - "HierarchyInfo with depth, position, metrics"
    - "Tool definitions in Anthropic format"
    - "Context-aware decision making patterns"

introspection_security:
  file: "/plan/research/introspection-security-guide.md"
  key_points:
    - "State snapshots filtered for sensitive fields"
    - "Cache tool filters credentials/secrets"
    - "All queries have result limits"
```

---

## 3. Implementation Validation

### Pre-Implementation Validation Commands

Before creating examples, validate all Phase 3-4 implementations:

```bash
# 1. Build passes
npm run build

# 2. All tests pass
npm test

# 3. Verify cache exports
node -e "
const { LLMCache, defaultCache, generateCacheKey, deterministicStringify, getSchemaHash } = require('./dist');
console.log('Cache exports:', { LLMCache: !!LLMCache, defaultCache: !!defaultCache, generateCacheKey: !!generateCacheKey });
"

# 4. Verify reflection exports
node -e "
const { ReflectionManager, executeWithReflection, DEFAULT_REFLECTION_CONFIG } = require('./dist');
console.log('Reflection exports:', { ReflectionManager: !!ReflectionManager, executeWithReflection: !!executeWithReflection });
"

# 5. Verify introspection exports
node -e "
const { INTROSPECTION_TOOLS, INTROSPECTION_HANDLERS, handleInspectCurrentNode } = require('./dist');
console.log('Introspection exports:', { INTROSPECTION_TOOLS: INTROSPECTION_TOOLS.length, handlers: !!handleInspectCurrentNode });
"

# 6. Verify factory exports
node -e "
const { createWorkflow, createAgent, createPrompt, quickWorkflow, quickAgent } = require('./dist');
console.log('Factory exports:', { createWorkflow: !!createWorkflow, createAgent: !!createAgent, createPrompt: !!createPrompt });
"

# 7. Run existing examples 1-6
npm run start:all
```

**Expected Results**: All commands complete without errors.

---

## 4. Implementation Tasks

> Tasks are ordered by dependency. Complete each task fully before moving to the next.

---

### Task P5.1: Example 7 - Agent Loops with Observability

**Depends on**: Phase 4 validation complete

**Input**: PRD Section 12 item 7 - "Loops calling multiple agents repeatedly with full observability"

**Purpose**: Demonstrate using `Agent.prompt()` within workflow loops with full event tree capture, timing metrics, and state snapshots.

**File**: `/examples/examples/07-agent-loops.ts`

**Implementation Steps**:

1. Create the example file with standard header:
```typescript
/**
 * Example 7: Agent Loops with Observability
 *
 * Demonstrates:
 * - Using Agent.prompt() within ctx.step() loops
 * - Multiple agents for different item types
 * - Full event tree visualization with timing
 * - State snapshots at each iteration
 * - Cache hit/miss tracking
 */
```

2. Import required modules:
```typescript
import { z } from 'zod';
import {
  createWorkflow,
  createAgent,
  createPrompt,
  Agent,
  Prompt,
  WorkflowContext,
  WorkflowTreeDebugger,
  Step,
  ObservedState,
  getExecutionContext,
  defaultCache,
} from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';
```

3. Implement three-part demonstration:

**Part 1: Basic Agent Loop**
```typescript
// Process array of items with Agent inside loop
const items = ['apple', 'banana', 'cherry'];
for (const item of items) {
  await ctx.step(`process-${item}`, async () => {
    const result = await agent.prompt(classifyPrompt.withData({ item }));
    // Show timing, result, event emission
  });
}
```

**Part 2: Multi-Agent Loop**
```typescript
// Different agents for different data types
const textAgent = createAgent({ name: 'TextAgent', enableCache: true });
const numberAgent = createAgent({ name: 'NumberAgent', enableCache: true });

for (const input of mixedData) {
  const agent = typeof input === 'string' ? textAgent : numberAgent;
  await ctx.step(`process-${input}`, async () => {
    await agent.prompt(appropriatePrompt);
  });
}
```

**Part 3: Observability Metrics**
```typescript
// Show complete event tree with timing per step
// Show cache metrics (hits/misses)
// Show state snapshots at each iteration
console.log('Tree:\n' + debugger_.toTreeString());
console.log('Cache metrics:', defaultCache.metrics());
```

4. Export run function:
```typescript
export async function runAgentLoopsExample(): Promise<void> { ... }

if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentLoopsExample().catch(console.error);
}
```

**Output**: Working example at `/examples/examples/07-agent-loops.ts`

**Validation**:
```bash
npx tsx examples/examples/07-agent-loops.ts
# Expected: Shows loop execution with timing, tree visualization, cache metrics
```

---

### Task P5.2: Example 8 - SDK Features (Tools, MCPs, Hooks, Skills)

**Depends on**: Task P5.1

**Input**: PRD Section 12 item 8 - "Tools, MCPs, hooks, skills usage examples"

**Purpose**: Demonstrate Anthropic SDK integration with custom tools, MCP servers, lifecycle hooks, and skills.

**File**: `/examples/examples/08-sdk-features.ts`

**Implementation Steps**:

1. Create the example file with standard header:
```typescript
/**
 * Example 8: SDK Features Integration
 *
 * Demonstrates:
 * - Custom tool definitions with handlers
 * - MCP server configuration (inprocess)
 * - Pre/Post tool hooks for logging and validation
 * - Skills integration with SKILL.md content
 * - Environment variable pass-through
 */
```

2. Import required modules:
```typescript
import { z } from 'zod';
import {
  createWorkflow,
  createAgent,
  createPrompt,
  Agent,
  Prompt,
  Tool,
  MCPHandler,
  WorkflowContext,
  WorkflowTreeDebugger,
} from 'groundswell';
import type { AgentHooks, PreToolUseContext, PostToolUseContext } from 'groundswell';
import { printHeader, printSection } from '../utils/helpers.js';
```

3. Implement five-part demonstration:

**Part 1: Custom Tool Definition**
```typescript
const calculatorTool: Tool = {
  name: 'calculate',
  description: 'Performs basic arithmetic',
  input_schema: {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['operation', 'a', 'b']
  }
};

// Handler implementation
async function handleCalculate(input: { operation: string; a: number; b: number }) {
  switch (input.operation) {
    case 'add': return { result: input.a + input.b };
    case 'subtract': return { result: input.a - input.b };
    // ...
  }
}
```

**Part 2: MCP Server Configuration**
```typescript
const mcpHandler = new MCPHandler();
mcpHandler.registerTool(calculatorTool, handleCalculate);

const agent = createAgent({
  name: 'ToolAgent',
  tools: mcpHandler.getTools(),
});
```

**Part 3: Lifecycle Hooks**
```typescript
const hooks: AgentHooks = {
  preToolUse: [
    async (ctx: PreToolUseContext) => {
      console.log(`[PRE] Tool: ${ctx.toolName}, Input:`, ctx.input);
      // Validation logic
    }
  ],
  postToolUse: [
    async (ctx: PostToolUseContext) => {
      console.log(`[POST] Tool: ${ctx.toolName}, Output:`, ctx.output);
      // Logging, metrics
    }
  ],
  sessionStart: [
    async (ctx) => console.log('[SESSION START]', ctx)
  ],
  sessionEnd: [
    async (ctx) => console.log('[SESSION END]', ctx)
  ]
};
```

**Part 4: Skills Integration**
```typescript
// Demonstrate skill content injection into system prompt
const agent = createAgent({
  name: 'SkilledAgent',
  skills: [
    { name: 'math', path: './skills/math' }
  ]
});
// Shows SKILL.md content in system prompt
```

**Part 5: Environment Variables**
```typescript
const agent = createAgent({
  name: 'EnvAgent',
  env: {
    API_KEY: 'demo-key',
    DEBUG: 'true'
  }
});
// Shows env vars passed through during execution
```

4. Export run function:
```typescript
export async function runSDKFeaturesExample(): Promise<void> { ... }
```

**Output**: Working example at `/examples/examples/08-sdk-features.ts`

**Validation**:
```bash
npx tsx examples/examples/08-sdk-features.ts
# Expected: Shows tool calls with hooks, MCP integration, skill loading
```

---

### Task P5.3: Example 9 - Multi-level Reflection

**Depends on**: Task P5.2

**Input**: PRD Section 12 item 9 - "Reflection at each level (Workflow, Agent, Prompt)"

**Purpose**: Demonstrate reflection capabilities at all three levels with automatic retry and error recovery.

**File**: `/examples/examples/09-reflection.ts`

**Implementation Steps**:

1. Create the example file with standard header:
```typescript
/**
 * Example 9: Multi-level Reflection
 *
 * Demonstrates:
 * - Prompt-level reflection (enableReflection on prompt)
 * - Agent-level reflection (agent.reflect() method)
 * - Workflow-level reflection (step failure retry)
 * - Reflection events in tree output
 * - Error recovery with revised prompts
 */
```

2. Import required modules:
```typescript
import { z } from 'zod';
import {
  createWorkflow,
  createAgent,
  createPrompt,
  Agent,
  Prompt,
  WorkflowContext,
  WorkflowTreeDebugger,
  ReflectionManager,
  executeWithReflection,
  DEFAULT_REFLECTION_CONFIG,
} from 'groundswell';
import type { ReflectionConfig, ReflectionEntry } from 'groundswell';
import { printHeader, printSection, simulateUnreliableTask } from '../utils/helpers.js';
```

3. Implement three-part demonstration:

**Part 1: Prompt-Level Reflection**
```typescript
// Schema validation fails, triggers reflection
const strictSchema = z.object({
  answer: z.string().min(10),
  confidence: z.number().min(0.8)
});

const prompt = createPrompt({
  user: 'Provide a brief answer',
  responseFormat: strictSchema,
  enableReflection: true  // Auto-reflect on validation failure
});

// First attempt may fail schema, reflection retries with adjusted output
const result = await agent.prompt(prompt);
```

**Part 2: Agent-Level Reflection**
```typescript
// Explicit reflection call for reasoning review
const complexPrompt = createPrompt({
  user: 'Analyze this complex scenario...',
  responseFormat: analysisSchema
});

// Agent reviews its own reasoning before final answer
const result = await agent.reflect(complexPrompt, {
  enableReflection: true
});
// Shows reflection system prompt prefix added
```

**Part 3: Workflow-Level Reflection**
```typescript
const workflow = createWorkflow(
  { name: 'ReflectiveWorkflow', enableReflection: true },
  async (ctx) => {
    let attemptCount = 0;

    await ctx.step('unreliable-operation', async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Transient failure - please retry');
      }
      return 'Success on attempt 3';
    });

    // Shows: reflectionStart, retry, reflectionEnd events in tree
  }
);

// Display reflection history
const history = ctx.reflection.getReflectionHistory();
console.log('Reflection history:', history);
```

4. Show reflection events in tree:
```typescript
console.log('Tree with reflection events:\n' + debugger_.toTreeString());
// Shows: reflectionStart, reflectionEnd nodes in tree
```

**Output**: Working example at `/examples/examples/09-reflection.ts`

**Validation**:
```bash
npx tsx examples/examples/09-reflection.ts
# Expected: Shows reflection at all three levels, retry behavior, events in tree
```

---

### Task P5.4: Example 10 - Introspection Tools Demo

**Depends on**: Task P5.3

**Input**: PRD Section 12 item 10 - "Introspection tools demo"

**Purpose**: Demonstrate agents using introspection tools to navigate and understand workflow hierarchy.

**File**: `/examples/examples/10-introspection.ts`

**Implementation Steps**:

1. Create the example file with standard header:
```typescript
/**
 * Example 10: Introspection Tools Demo
 *
 * Demonstrates:
 * - Agent with INTROSPECTION_TOOLS
 * - inspect_current_node - "Where am I?"
 * - read_ancestor_chain - "What's above me?"
 * - list_siblings_children - "What's around me?"
 * - inspect_prior_outputs - "What happened before?"
 * - inspect_cache_status - "Is this cached?"
 * - request_spawn_workflow - "Can I create children?"
 */
```

2. Import required modules:
```typescript
import { z } from 'zod';
import {
  createWorkflow,
  createAgent,
  createPrompt,
  Agent,
  WorkflowContext,
  WorkflowTreeDebugger,
  INTROSPECTION_TOOLS,
  INTROSPECTION_HANDLERS,
  handleInspectCurrentNode,
  handleReadAncestorChain,
  handleListSiblingsChildren,
  handleInspectPriorOutputs,
  handleInspectCacheStatus,
  handleRequestSpawnWorkflow,
  runInContext,
  getExecutionContext,
} from 'groundswell';
import type { CurrentNodeInfo, AncestorChainResult } from 'groundswell';
import { printHeader, printSection, prettyJson } from '../utils/helpers.js';
```

3. Implement six-part demonstration:

**Part 1: Setup Nested Hierarchy**
```typescript
// Create 3-level nested workflow for introspection
const rootWorkflow = createWorkflow(
  { name: 'RootWorkflow' },
  async (ctx) => {
    await ctx.step('setup', async () => { ... });

    await ctx.spawnWorkflow(createWorkflow(
      { name: 'ChildWorkflow' },
      async (childCtx) => {
        await childCtx.step('child-work', async () => {
          // Agent with introspection runs here
        });
      }
    ));
  }
);
```

**Part 2: inspect_current_node**
```typescript
await ctx.step('where-am-i', async () => {
  const nodeInfo = await handleInspectCurrentNode();
  console.log('Current node:', prettyJson(nodeInfo));
  // Shows: id, name, status, parentId, parentName, childCount, depth
});
```

**Part 3: read_ancestor_chain**
```typescript
await ctx.step('whats-above-me', async () => {
  const ancestors = await handleReadAncestorChain({ maxDepth: 10 });
  console.log('Ancestors:', prettyJson(ancestors));
  // Shows: array of ancestor nodes from current to root
});
```

**Part 4: list_siblings_children**
```typescript
await ctx.step('whats-around-me', async () => {
  const siblings = await handleListSiblingsChildren({ type: 'siblings' });
  const children = await handleListSiblingsChildren({ type: 'children' });
  console.log('Siblings:', siblings);
  console.log('Children:', children);
});
```

**Part 5: inspect_prior_outputs**
```typescript
await ctx.step('what-happened-before', async () => {
  const outputs = await handleInspectPriorOutputs({ count: 3 });
  console.log('Prior outputs:', prettyJson(outputs));
  // Shows: results from previous steps
});
```

**Part 6: Agent Using All Tools**
```typescript
// Agent with all introspection tools
const introspectionAgent = createAgent({
  name: 'IntrospectionAgent',
  tools: INTROSPECTION_TOOLS,
  system: `You are an agent that can explore workflow hierarchies.
           Use the introspection tools to understand your position
           and what work has been done.`
});

const explorePrompt = createPrompt({
  user: 'Describe your current position in the workflow hierarchy and summarize what work has been done.',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// Agent uses tools to explore, then responds
const analysis = await introspectionAgent.prompt(explorePrompt);
console.log('Agent analysis:', analysis);
```

**Output**: Working example at `/examples/examples/10-introspection.ts`

**Validation**:
```bash
npx tsx examples/examples/10-introspection.ts
# Expected: Shows agent using all 6 introspection tools in nested workflow
```

---

### Task P5.5: Update Examples Index and README

**Depends on**: Tasks P5.1-P5.4

**Input**: Existing `/examples/index.ts` and `/examples/README.md`

**Purpose**: Integrate examples 7-10 into the runner and documentation.

**Files**:
- `/examples/index.ts`
- `/examples/README.md`

**Implementation Steps**:

1. Update `/examples/index.ts`:
```typescript
// Add imports
import { runAgentLoopsExample } from './examples/07-agent-loops.js';
import { runSDKFeaturesExample } from './examples/08-sdk-features.js';
import { runReflectionExample } from './examples/09-reflection.js';
import { runIntrospectionExample } from './examples/10-introspection.js';

// Update MENU
const MENU = `
Available Examples:
───────────────────────────────────────────────────────────────────
  1. Basic Workflow          - Core workflow concepts
  2. Decorator Options       - All @Step, @Task, @ObservedState options
  3. Parent-Child Workflows  - Hierarchical workflow structures
  4. Observers & Debugger    - Real-time monitoring and debugging
  5. Error Handling          - Error wrapping, recovery patterns
  6. Concurrent Tasks        - Parallel execution patterns
  7. Agent Loops             - Agent.prompt() in loops with observability
  8. SDK Features            - Tools, MCPs, hooks, skills
  9. Multi-level Reflection  - Workflow, agent, prompt reflection
  10. Introspection Tools    - Agent self-awareness and hierarchy navigation

  A. Run All Examples
  Q. Quit
───────────────────────────────────────────────────────────────────
`;

// Update examples array in runAllExamples()
const examples = [
  { name: '1. Basic Workflow', fn: runBasicWorkflowExample },
  { name: '2. Decorator Options', fn: runDecoratorOptionsExample },
  { name: '3. Parent-Child Workflows', fn: runParentChildExample },
  { name: '4. Observers & Debugger', fn: runObserversDebuggerExample },
  { name: '5. Error Handling', fn: runErrorHandlingExample },
  { name: '6. Concurrent Tasks', fn: runConcurrentTasksExample },
  { name: '7. Agent Loops', fn: runAgentLoopsExample },
  { name: '8. SDK Features', fn: runSDKFeaturesExample },
  { name: '9. Multi-level Reflection', fn: runReflectionExample },
  { name: '10. Introspection Tools', fn: runIntrospectionExample },
];

// Update Summary
console.log(`
Summary of Features Demonstrated:
─────────────────────────────────
✓ Workflow base class with status management
✓ WorkflowLogger with structured logging
✓ @Step decorator with all options
✓ @Task decorator with concurrent option
✓ @ObservedState decorator with hidden and redact options
✓ Parent-child workflow hierarchies
✓ Automatic child attachment via constructor
✓ Event propagation to root observers
✓ WorkflowTreeDebugger with ASCII tree visualization
✓ Custom WorkflowObserver implementations
✓ Observable event streaming
✓ WorkflowError with full context
✓ Error recovery patterns
✓ Sequential vs parallel execution
✓ Agent.prompt() in loops with full observability
✓ Custom tools, MCPs, hooks, skills integration
✓ Multi-level reflection (workflow, agent, prompt)
✓ Introspection tools for hierarchy navigation
✓ Cache integration with metrics
`);
```

2. Update `/examples/README.md`:

Add sections for examples 7-10:
```markdown
## 7. Agent Loops with Observability

Run: `npx tsx examples/examples/07-agent-loops.ts`

Demonstrates:
- Using Agent.prompt() within ctx.step() loops
- Multiple agents for different item types
- Full event tree visualization with timing
- State snapshots at each iteration
- Cache hit/miss tracking

## 8. SDK Features Integration

Run: `npx tsx examples/examples/08-sdk-features.ts`

Demonstrates:
- Custom tool definitions with handlers
- MCP server configuration (inprocess)
- Pre/Post tool hooks for logging and validation
- Skills integration
- Environment variable pass-through

## 9. Multi-level Reflection

Run: `npx tsx examples/examples/09-reflection.ts`

Demonstrates:
- Prompt-level reflection (enableReflection on prompt)
- Agent-level reflection (agent.reflect() method)
- Workflow-level reflection (step failure retry)
- Reflection events in tree output

## 10. Introspection Tools Demo

Run: `npx tsx examples/examples/10-introspection.ts`

Demonstrates:
- Agent with INTROSPECTION_TOOLS
- inspect_current_node, read_ancestor_chain
- list_siblings_children, inspect_prior_outputs
- inspect_cache_status, request_spawn_workflow
- Agent self-awareness patterns
```

3. Update package.json scripts:
```json
{
  "scripts": {
    "start:agent-loops": "tsx examples/examples/07-agent-loops.ts",
    "start:sdk-features": "tsx examples/examples/08-sdk-features.ts",
    "start:reflection": "tsx examples/examples/09-reflection.ts",
    "start:introspection": "tsx examples/examples/10-introspection.ts"
  }
}
```

**Output**: Updated index, README, and package.json

**Validation**:
```bash
npm run start:all
# Expected: All 10 examples run successfully
```

---

## 5. Testing Strategy

### Unit Tests (Already Exist)

```yaml
existing_tests:
  - path: "/src/__tests__/unit/cache-key.test.ts"
    validates: "Deterministic key generation"

  - path: "/src/__tests__/unit/cache.test.ts"
    validates: "LRU cache operations"

  - path: "/src/__tests__/unit/reflection.test.ts"
    validates: "ReflectionManager behavior"

  - path: "/src/__tests__/unit/introspection-tools.test.ts"
    validates: "All 6 introspection tool handlers"
```

### Integration Tests (Already Exist)

```yaml
existing_tests:
  - path: "/src/__tests__/integration/agent-workflow.test.ts"
    validates: "Agent integration with workflow context"

  - path: "/src/__tests__/integration/tree-mirroring.test.ts"
    validates: "Event tree hierarchy"
```

### Example Validation

```yaml
manual_validation:
  - example: "07-agent-loops.ts"
    expected: "Loop executes, tree shows timing per step, cache metrics displayed"

  - example: "08-sdk-features.ts"
    expected: "Tools called with hooks logging, MCP integration shown"

  - example: "09-reflection.ts"
    expected: "Reflection at all levels, retry on failure, events in tree"

  - example: "10-introspection.ts"
    expected: "Agent describes position, uses all 6 tools, hierarchy navigation"
```

---

## 6. Final Validation Checklist

### Code Quality
- [ ] All TypeScript compiles without errors: `npm run build`
- [ ] No linting warnings: `npm run lint`
- [ ] Examples follow existing patterns (check 01-06)
- [ ] Proper imports with `.js` extensions
- [ ] JSDoc header comments on all examples

### Functionality
- [ ] Example 7 shows agent loops with timing
- [ ] Example 8 shows tools, MCPs, hooks, skills
- [ ] Example 9 shows three levels of reflection
- [ ] Example 10 shows all 6 introspection tools
- [ ] All examples produce console output demonstrating features

### Integration
- [ ] Examples run individually: `npx tsx examples/examples/07-*.ts`
- [ ] Examples run via runner: `npm run start:all`
- [ ] README documents all 10 examples
- [ ] Package.json has scripts for examples 7-10

### Documentation
- [ ] Each example has JSDoc header
- [ ] Each example uses printHeader/printSection for output
- [ ] README sections match example implementations

---

## 7. File Structure Summary

```
/examples/
├── index.ts                    # MODIFY: Add examples 7-10
├── README.md                   # MODIFY: Document examples 7-10
├── utils/
│   └── helpers.ts              # EXISTING: No changes needed
└── examples/
    ├── 01-basic-workflow.ts    # EXISTING
    ├── 02-decorator-options.ts # EXISTING
    ├── 03-parent-child.ts      # EXISTING
    ├── 04-observers-debugger.ts# EXISTING
    ├── 05-error-handling.ts    # EXISTING
    ├── 06-concurrent-tasks.ts  # EXISTING
    ├── 07-agent-loops.ts       # NEW: Task P5.1
    ├── 08-sdk-features.ts      # NEW: Task P5.2
    ├── 09-reflection.ts        # NEW: Task P5.3
    └── 10-introspection.ts     # NEW: Task P5.4

/package.json                   # MODIFY: Add example scripts
```

---

## 8. "No Prior Knowledge" Test

**Validation**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully using only this PRP?

- [x] All file paths are absolute and specific
- [x] All patterns have concrete code examples
- [x] All dependencies are explicitly listed with versions
- [x] All validation steps are executable commands
- [x] No assumed knowledge of codebase internals
- [x] Existing example patterns documented for reference
- [x] Import statements show exact module paths
- [x] Research documents referenced for background context

---

## Confidence Score: 9/10

**Strengths:**
- All Phase 3-4 implementations are complete and tested
- Clear existing example patterns to follow (examples 1-6)
- Comprehensive research documents exist for all features
- Specific code patterns provided for each example
- Validation commands provided at each step

**Risks:**
- Examples require actual Anthropic API calls (may need mocking)
- Introspection tools demo depends on context being properly set
- Example complexity may need iteration for clarity

**Mitigations:**
- Use `simulateApiCall` for demo purposes
- Test introspection in actual workflow context
- Follow existing example structure for consistency
- Keep examples focused on demonstrating specific features

---

## Appendix: Example Template

```typescript
/**
 * Example N: Feature Name
 *
 * Demonstrates:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */

import { z } from 'zod';
import {
  createWorkflow,
  createAgent,
  createPrompt,
  WorkflowTreeDebugger,
  // ... other imports
} from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';

/**
 * Main example runner
 */
export async function runExampleName(): Promise<void> {
  printHeader('Example N: Feature Name');

  // Part 1: Basic demonstration
  printSection('Part 1: Basic Usage');
  {
    // Implementation
  }

  // Part 2: Advanced usage
  printSection('Part 2: Advanced Patterns');
  {
    // Implementation
  }

  // Summary
  console.log('\n=== Example Complete ===');
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runExampleName().catch(console.error);
}
```

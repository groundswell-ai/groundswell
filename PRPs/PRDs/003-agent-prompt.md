# PRP: Caching, Reflection & Introspection Systems

## Phases 3 & 4 Implementation Plan

> **PRP**: Product Requirements Package - A comprehensive implementation guide enabling one-pass success

---

## Pre-Implementation Checklist

Before implementing, verify you have:
- [ ] Read and understood this entire PRP
- [ ] Read PRPs/PRDs/002-agent-prompt.md (prior phases)
- [ ] Verified Phase 1 & 2 are complete (Agent, Prompt, Hierarchy integration)
- [ ] Access to `./` codebase
- [ ] npm dependencies installed: `@anthropic-ai/sdk`, `zod`
- [ ] Understanding of existing patterns in `/src/core/agent.ts`, `/src/core/workflow.ts`

---

## 1. Goal

### Feature Goal
Implement deterministic response caching, multi-level reflection capabilities, and agent introspection tools to complete the Groundswell orchestration framework per PRD Sections 9, 10, 11, and 12.

### Deliverable
A complete system where:
1. LLM responses are cached with SHA-256 deterministic keys (PRD Section 9)
2. Reflection API provides automatic retry with self-correction at workflow, agent, and prompt levels (PRD Section 4.4)
3. Introspection tools allow agents to inspect/manipulate their hierarchy position (PRD Section 11)
4. Dynamic workflow/agent/prompt creation and context revision work seamlessly (PRD Section 10)
5. All 10 canonical examples are implemented (PRD Section 12)

### Success Definition
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm test` passes all new and existing tests
- [ ] Cache integration reduces redundant API calls in tests
- [ ] Reflection triggers automatically on step/prompt failures
- [ ] Agents can use introspection tools to navigate hierarchy
- [ ] All 10 PRD examples execute successfully

---

## 2. Context

### External Documentation
```yaml
anthropic_sdk:
  url: "https://github.com/anthropics/anthropic-sdk-typescript"
  purpose: "Tool definitions, message API"
  version: "^0.71.1"

lru_cache:
  url: "https://www.npmjs.com/package/lru-cache"
  purpose: "LRU cache implementation with TTL support"
  version: "^10.0.0"
  note: "Zero external dependencies in v10+"

node_crypto:
  url: "https://nodejs.org/api/crypto.html"
  purpose: "SHA-256 hashing for cache keys"
  section: "createHash"

zod:
  url: "https://zod.dev/"
  purpose: "Schema validation, _def access for hashing"
  version: "^3.23.0"
```

### Codebase Context
```yaml
existing_patterns:
  - file: "/src/core/agent.ts"
    pattern: "Agent class with prompt() method"
    follow_for: "Cache integration point in executePrompt()"
    line: 171

  - file: "/src/core/workflow-context.ts"
    pattern: "ReflectionAPIImpl placeholder"
    follow_for: "Full ReflectionAPI implementation"
    line: 24

  - file: "/src/core/context.ts"
    pattern: "AgentExecutionContext with AsyncLocalStorage"
    follow_for: "Introspection tool handlers accessing context"

  - file: "/src/types/events.ts"
    pattern: "WorkflowEvent discriminated union"
    follow_for: "Already includes reflectionStart/reflectionEnd types"

  - file: "/src/core/mcp-handler.ts"
    pattern: "Tool registration and execution"
    follow_for: "Introspection tool registration pattern"

related_files:
  - path: "/src/types/workflow-context.ts"
    relationship: "ReflectionAPI interface definition (line 70)"

  - path: "/src/core/event-tree.ts"
    relationship: "EventTreeHandle for introspection queries"

  - path: "/src/utils/id.ts"
    relationship: "generateId() for cache key prefixes"

naming_conventions:
  files: "kebab-case.ts in appropriate directory"
  classes: "PascalCase (e.g., LRUCache, ReflectionManager)"
  functions: "camelCase (e.g., generateCacheKey, triggerReflection)"
  types: "PascalCase with descriptive suffixes (e.g., CacheConfig, ReflectionEntry)"
  tools: "snake_case for Anthropic tool names (e.g., inspect_current_node)"
```

### Technical Constraints
```yaml
typescript:
  version: "5.2+"
  config_requirements:
    - "strict: true"
    - "module: NodeNext"
    - "moduleResolution: NodeNext"

dependencies:
  required:
    - name: "lru-cache"
      version: "^10.0.0"
      purpose: "LRU cache with size/TTL limits"
  existing:
    - name: "@anthropic-ai/sdk"
      version: "^0.71.1"
    - name: "zod"
      version: "^3.23.0"

runtime:
  node_version: "18+"
  target: "ES2022"
```

### Known Gotchas
```yaml
pitfalls:
  - issue: "JSON.stringify does not guarantee key order"
    solution: "Use deterministicStringify with sorted keys for cache key generation"
    file: "/plan/P3P4/research/caching-lru.md"

  - issue: "Zod schemas are functions, cannot serialize directly"
    solution: "Hash schema._def for schema fingerprint in cache key"

  - issue: "Reflection can infinite loop"
    solution: "Hard limit maxReflectionAttempts to 3, track attempt count"

  - issue: "AsyncLocalStorage context loss in some async patterns"
    solution: "Always use runInContext() wrapper, test with nested async/await"

  - issue: "Tool handlers need access to current context"
    solution: "Use getExecutionContext() from context.ts inside tool handlers"
```

---

## 3. Implementation Tasks

> Tasks are ordered by dependency. Complete each task fully before moving to the next.

### Phase 3: Caching & Reflection Systems

---

### Task P3.1: Cache Key Generation
**Depends on**: Phase 1 & 2 complete

**Input**:
- Prompt instance with user, data, responseFormat
- Merged AgentConfig (system, tools, mcps, skills, temperature, model)

**Steps**:
1. Create `/src/cache/cache-key.ts`
2. Implement `deterministicStringify(value: unknown): string`
   - Sort object keys alphabetically
   - Handle arrays, primitives, null, undefined
   - Detect circular references with WeakSet
3. Implement `getSchemaHash(schema: z.ZodType): string`
   - Access `schema._def` for internal representation
   - Hash with SHA-256
4. Implement `generateCacheKey(inputs: CacheKeyInputs): string`
   - Include: user, data, system, model, temperature, maxTokens
   - Include: sorted tool names, sorted mcp names, sorted skill names
   - Include: schemaHash from responseFormat
   - Return 64-character hex SHA-256 digest
5. Export `CacheKeyInputs` interface and functions

**Output**: `/src/cache/cache-key.ts` with deterministic key generation

**Validation**:
```bash
# Unit test: same input always produces same key
npm test -- --grep "cache-key"
```

---

### Task P3.2: LRU Cache Implementation
**Depends on**: Task P3.1

**Input**: Cache interface from PRD Section 9.2

**Steps**:
1. Add `lru-cache@^10.0.0` to package.json dependencies
2. Create `/src/cache/cache.ts`
3. Define `CacheConfig` interface:
   ```typescript
   interface CacheConfig {
     maxItems?: number;      // default: 1000
     maxSizeBytes?: number;  // default: 50MB
     defaultTTLMs?: number;  // default: 1 hour
   }
   ```
4. Implement `LLMCache` class:
   - Constructor accepting CacheConfig
   - `get(key: string): Promise<T | undefined>`
   - `set(key: string, value: T, ttl?: number): Promise<void>`
   - `bust(key: string): Promise<void>`
   - `bustPrefix(prefix: string): Promise<void>`
   - `metrics(): CacheMetrics`
5. Implement prefix tracking with Map<string, Set<string>> for bustPrefix
6. Export singleton `defaultCache` instance

**Output**: `/src/cache/cache.ts` with full Cache implementation

**Validation**:
```bash
npm test -- --grep "LLMCache"
```

---

### Task P3.3: Cache Integration into Agent
**Depends on**: Task P3.2

**Input**: Agent.executePrompt() method at `/src/core/agent.ts:171`

**Steps**:
1. Import `generateCacheKey` and `defaultCache` in agent.ts
2. Add cache check at start of `executePrompt()`:
   ```typescript
   if (this.config.enableCache && !overrides?.disableCache) {
     const cacheKey = generateCacheKey({...});
     const cached = await defaultCache.get(cacheKey);
     if (cached) {
       // Return cached result
     }
   }
   ```
3. Add cache set after successful response:
   ```typescript
   if (this.config.enableCache && !overrides?.disableCache) {
     await defaultCache.set(cacheKey, result);
   }
   ```
4. Emit cache hit/miss events if in workflow context:
   ```typescript
   { type: 'cacheHit' | 'cacheMiss'; key: string; node: WorkflowNode }
   ```
5. Update `/src/types/events.ts` to add cacheHit/cacheMiss event types

**Output**: Agent.prompt() checks and populates cache

**Validation**:
```bash
# Integration test: second identical prompt returns cached
npm test -- --grep "agent-cache"
```

---

### Task P3.4: ReflectionAPI Interface Definition
**Depends on**: Phase 2 complete

**Input**: Placeholder at `/src/core/workflow-context.ts:24`

**Steps**:
1. Create `/src/types/reflection.ts`
2. Define complete interfaces:
   ```typescript
   interface ReflectionConfig {
     enabled: boolean;
     maxAttempts: number;      // default: 3
     retryDelayMs?: number;    // default: 0
   }

   interface ReflectionContext {
     level: 'workflow' | 'agent' | 'prompt';
     failedNode: WorkflowNode;
     error: Error;
     attemptNumber: number;
     previousAttempts: ReflectionEntry[];
   }

   interface ReflectionResult {
     shouldRetry: boolean;
     revisedPromptData?: Record<string, unknown>;
     revisedSystemPrompt?: string;
     reason: string;
   }

   interface ReflectionEntry {
     timestamp: number;
     level: 'workflow' | 'agent' | 'prompt';
     reason: string;
     error: Error;
     resolution: 'retry' | 'skip' | 'abort';
     success: boolean;
   }

   interface ReflectionAPI {
     isEnabled(): boolean;
     triggerReflection(reason?: string): Promise<void>;
     getReflectionHistory(): ReflectionEntry[];
     reflect(context: ReflectionContext): Promise<ReflectionResult>;
   }
   ```
3. Export from `/src/types/index.ts`

**Output**: Complete reflection type definitions

**Validation**: `npm run build` passes

---

### Task P3.5: Reflection Implementation
**Depends on**: Task P3.4

**Input**: ReflectionAPI interface, Agent.reflect() method

**Steps**:
1. Create `/src/reflection/reflection.ts`
2. Implement `ReflectionManager` class:
   - Constructor: `(config: ReflectionConfig, agent?: Agent)`
   - `isEnabled()`: Return config.enabled
   - `reflect(context: ReflectionContext): Promise<ReflectionResult>`
     - Build reflection prompt with error context
     - Call agent.reflect() with reflection prompt
     - Parse response for shouldRetry decision
     - Record entry in history
   - `triggerReflection(reason?: string)`: Emit events, log
   - `getReflectionHistory()`: Return recorded entries
3. Define reflection prompt template:
   ```typescript
   const REFLECTION_PROMPT = `
   A previous operation failed with the following error:

   Error: {{error.message}}
   Level: {{level}}
   Attempt: {{attemptNumber}} of {{maxAttempts}}

   Analyze the error and determine:
   1. Can this be retried with modifications?
   2. What changes would help succeed?

   Respond with JSON: { "shouldRetry": boolean, "reason": string, "revisedPromptData": {...} }
   `;
   ```
4. Emit reflectionStart/reflectionEnd events

**Output**: `/src/reflection/reflection.ts` with full implementation

**Validation**:
```bash
npm test -- --grep "ReflectionManager"
```

---

### Task P3.6: Wire Reflection into WorkflowContext
**Depends on**: Task P3.5

**Input**: `/src/core/workflow-context.ts`

**Steps**:
1. Replace `ReflectionAPIImpl` placeholder with real import
2. Update `WorkflowContextImpl` constructor:
   - Create `ReflectionManager` with workflow's enableReflection config
3. Update `step()` method to wrap with reflection:
   ```typescript
   async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
     let lastError: Error | null = null;

     for (let attempt = 1; attempt <= this.reflection.maxAttempts; attempt++) {
       try {
         return await this.executeStep(name, fn);
       } catch (error) {
         if (!this.reflection.isEnabled()) throw error;

         const result = await this.reflection.reflect({
           level: 'workflow',
           failedNode: stepNode,
           error: error as Error,
           attemptNumber: attempt,
           previousAttempts: this.reflection.getReflectionHistory()
         });

         if (!result.shouldRetry) throw error;
         lastError = error as Error;
       }
     }

     throw lastError;
   }
   ```

**Output**: Automatic reflection on step failures

**Validation**:
```bash
npm test -- --grep "workflow-reflection"
```

---

### Phase 4: Dynamic Behavior & Introspection

---

### Task P4.1: Dynamic Factory Functions
**Depends on**: Phase 3 complete

**Input**: Workflow, Agent, Prompt classes

**Steps**:
1. Create `/src/core/factory.ts`
2. Implement factory functions:
   ```typescript
   export function createWorkflow<T>(
     config: WorkflowConfig,
     executor: WorkflowExecutor<T>
   ): Workflow<T> {
     return new Workflow(config, executor);
   }

   export function createAgent(config: AgentConfig): Agent {
     return new Agent(config);
   }

   export function createPrompt<T>(config: PromptConfig<T>): Prompt<T> {
     return new Prompt(config);
   }
   ```
3. Export from `/src/index.ts`

**Output**: Convenience factory functions for dynamic creation

**Validation**: `npm run build`

---

### Task P4.2: Dynamic Context Revision
**Depends on**: Task P4.1

**Input**: WorkflowContext, step() implementation

**Steps**:
1. Add to WorkflowContext interface in `/src/types/workflow-context.ts`:
   ```typescript
   replaceLastPromptResult<T>(
     newPrompt: Prompt<T>,
     agent: Agent
   ): Promise<T>;
   ```
2. Implement in `WorkflowContextImpl`:
   - Mark previous prompt node as 'revised'
   - Execute new prompt
   - Attach result as sibling (not child)
   - Update event tree
   - Return new result
3. Emit 'promptRevision' event

**Output**: Context revision without tree forking

**Validation**:
```bash
npm test -- --grep "context-revision"
```

---

### Task P4.3: Introspection Tool Definitions
**Depends on**: P4.1

**Input**: PRD Section 11, `/plan/P3P4/research/introspection-tools.md`

**Steps**:
1. Create `/src/tools/introspection.ts`
2. Define 6 tool interfaces using Anthropic Tool format:
   - `inspect_current_node`: Return current node info
   - `read_ancestor_chain`: Return ancestors up to root
   - `list_siblings_children`: Return siblings or children
   - `inspect_prior_outputs`: Return previous step outputs
   - `inspect_cache_status`: Check cache for prompt hash
   - `request_spawn_workflow`: Request dynamic workflow creation
3. For each tool, define:
   - Tool definition (name, description, input_schema)
   - Handler function signature

**Output**: Tool definitions in `/src/tools/introspection.ts`

**Validation**: TypeScript compiles

---

### Task P4.4: Introspection Tool Handlers
**Depends on**: Task P4.3

**Input**: Tool definitions, AgentExecutionContext

**Steps**:
1. Implement handler for `inspect_current_node`:
   ```typescript
   async function handleInspectCurrentNode(): Promise<CurrentNodeInfo> {
     const ctx = getExecutionContext();
     if (!ctx) throw new Error('Not in workflow context');

     return {
       id: ctx.workflowNode.id,
       name: ctx.workflowNode.name,
       status: ctx.workflowNode.status,
       parentId: ctx.workflowNode.parent?.id,
       parentName: ctx.workflowNode.parent?.name,
       childCount: ctx.workflowNode.children.length,
       depth: calculateDepth(ctx.workflowNode)
     };
   }
   ```
2. Implement remaining handlers similarly
3. Create tool executor registry
4. Register handlers with MCPHandler pattern

**Output**: Working introspection tool handlers

**Validation**:
```bash
npm test -- --grep "introspection-tools"
```

---

### Task P4.5: Introspection Tools Bundle
**Depends on**: Task P4.4

**Input**: All introspection tool definitions and handlers

**Steps**:
1. Export bundle from `/src/tools/introspection.ts`:
   ```typescript
   export const INTROSPECTION_TOOLS: Tool[] = [
     inspectCurrentNodeTool,
     readAncestorChainTool,
     listSiblingsChildrenTool,
     inspectPriorOutputsTool,
     inspectCacheStatusTool,
     requestSpawnWorkflowTool
   ];

   export function registerIntrospectionTools(handler: MCPHandler): void {
     // Register all tool handlers
   }
   ```
2. Export from `/src/index.ts`

**Output**: Single import for all introspection tools

**Validation**: Import works from main package

---

### Phase 5: Examples (partial - Agent/Prompt focused)

---

### Task P5.1: Example 7 - Agent Loops with Observability
**Depends on**: All Phase 3-4 tasks

**Input**: PRD Section 12 item 7

**Steps**:
1. Create `/examples/examples/07-agent-loops.ts`
2. Implement:
   - Array of items to process
   - for loop with ctx.step() for each item
   - Multiple agents for different item types
   - Full event tree visualization
   - Timing metrics per step

**Output**: Working example with observability

---

### Task P5.2: Example 8 - SDK Features (Tools, MCPs, Hooks)
**Depends on**: Task P5.1

**Input**: PRD Section 12 item 8

**Steps**:
1. Create `/examples/examples/08-sdk-features.ts`
2. Implement:
   - Custom tool definitions
   - MCP server configuration
   - Pre/Post tool hooks
   - Skills integration
   - Event capture demonstration

**Output**: Comprehensive SDK integration example

---

### Task P5.3: Example 9 - Multi-level Reflection
**Depends on**: Task P5.2

**Input**: PRD Section 12 item 9

**Steps**:
1. Create `/examples/examples/09-reflection.ts`
2. Implement three scenarios:
   - Workflow-level: step fails, reflection retries
   - Agent-level: prompt fails validation, agent reflects
   - Prompt-level: enableReflection on specific prompt
3. Show reflection events in tree output

**Output**: Multi-level reflection demonstration

---

### Task P5.4: Example 10 - Introspection Tools Demo
**Depends on**: Task P5.3

**Input**: PRD Section 12 item 10

**Steps**:
1. Create `/examples/examples/10-introspection.ts`
2. Implement:
   - Agent with all INTROSPECTION_TOOLS
   - Nested workflow structure
   - Prompt asking agent to describe its position
   - Agent using tools to explore hierarchy

**Output**: Agent self-awareness demonstration

---

### Task P5.5: Update Main Exports
**Depends on**: All prior tasks

**Input**: All new classes, types, tools

**Steps**:
1. Update `/src/index.ts` with all new exports:
   ```typescript
   // Cache
   export { LLMCache, defaultCache } from './cache/cache.js';
   export { generateCacheKey } from './cache/cache-key.js';
   export type { CacheConfig, CacheMetrics } from './cache/cache.js';

   // Reflection
   export { ReflectionManager } from './reflection/reflection.js';
   export type {
     ReflectionAPI,
     ReflectionConfig,
     ReflectionEntry
   } from './types/reflection.js';

   // Introspection
   export { INTROSPECTION_TOOLS, registerIntrospectionTools } from './tools/introspection.js';

   // Factories
   export { createWorkflow, createAgent, createPrompt } from './core/factory.js';
   ```
2. Update `/src/types/index.ts` with new type exports

**Output**: Complete public API

**Validation**:
```bash
npm run build
node -e "const g = require('./dist'); console.log(Object.keys(g))"
```

---

## 4. Implementation Details

### Code Patterns to Follow

```typescript
// Cache key generation pattern (deterministic)
import { createHash } from 'node:crypto';

function generateCacheKey(inputs: CacheKeyInputs): string {
  const normalized = {
    user: inputs.user,
    data: inputs.data,
    system: inputs.system,
    model: inputs.model,
    temperature: inputs.temperature,
    maxTokens: inputs.maxTokens,
    tools: inputs.tools?.map(t => t.name).sort(),
    mcps: inputs.mcps?.map(m => m.name).sort(),
    skills: inputs.skills?.map(s => s.name).sort(),
    schemaHash: getSchemaHash(inputs.responseFormat)
  };

  return createHash('sha256')
    .update(deterministicStringify(normalized))
    .digest('hex');
}
```

```typescript
// Reflection retry pattern
async function executeWithReflection<T>(
  fn: () => Promise<T>,
  reflection: ReflectionAPI,
  context: Partial<ReflectionContext>
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!reflection.isEnabled() || attempt === maxAttempts) {
        throw error;
      }

      const result = await reflection.reflect({
        ...context,
        error: error as Error,
        attemptNumber: attempt
      } as ReflectionContext);

      if (!result.shouldRetry) {
        throw error;
      }
    }
  }

  throw new Error('Max reflection attempts exceeded');
}
```

### File Structure
```
/src
├── cache/
│   ├── cache.ts              # LLMCache class
│   ├── cache-key.ts          # Key generation
│   └── index.ts              # Cache exports
├── reflection/
│   ├── reflection.ts         # ReflectionManager
│   └── index.ts              # Reflection exports
├── tools/
│   ├── introspection.ts      # Introspection tools
│   └── index.ts              # Tools exports
├── types/
│   ├── reflection.ts         # NEW: Reflection types
│   └── ... (existing)
└── ... (existing)

/examples/examples/
├── 07-agent-loops.ts         # NEW
├── 08-sdk-features.ts        # NEW
├── 09-reflection.ts          # NEW
└── 10-introspection.ts       # NEW
```

### Interface Definitions
```typescript
// Key new interfaces

interface CacheKeyInputs {
  user: string;
  data?: Record<string, unknown>;
  system?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  responseFormat: z.ZodType;
}

interface ReflectionAPI {
  isEnabled(): boolean;
  triggerReflection(reason?: string): Promise<void>;
  getReflectionHistory(): ReflectionEntry[];
  reflect(context: ReflectionContext): Promise<ReflectionResult>;
}

type IntrospectionTool = Tool & {
  handler: (input: unknown) => Promise<unknown>;
};
```

---

## 5. Testing Strategy

### Unit Tests
```yaml
test_files:
  - path: "/src/__tests__/unit/cache-key.test.ts"
    covers:
      - "deterministicStringify produces same output for same input"
      - "getSchemaHash produces consistent hashes"
      - "generateCacheKey is deterministic"
      - "Different inputs produce different keys"

  - path: "/src/__tests__/unit/cache.test.ts"
    covers:
      - "LRU eviction works correctly"
      - "TTL expiration works"
      - "bustPrefix removes correct entries"
      - "Size limits enforced"

  - path: "/src/__tests__/unit/reflection.test.ts"
    covers:
      - "ReflectionManager.reflect() builds correct prompt"
      - "History is recorded"
      - "maxAttempts is respected"

  - path: "/src/__tests__/unit/introspection-tools.test.ts"
    covers:
      - "Each tool handler returns expected format"
      - "Tools work within context"
      - "Tools fail gracefully outside context"

test_patterns:
  - "Use vitest describe/it/expect"
  - "Mock Agent for reflection tests"
  - "Use runInContext for introspection tests"
```

### Integration Tests
```yaml
scenarios:
  - name: "Cache integration with Agent"
    validates: "Second identical prompt returns cached response"
    file: "/src/__tests__/integration/agent-cache.test.ts"

  - name: "Reflection in workflow step"
    validates: "Failed step triggers reflection, retry succeeds"
    file: "/src/__tests__/integration/workflow-reflection.test.ts"

  - name: "Introspection tools in agent"
    validates: "Agent can use tools to explore hierarchy"
    file: "/src/__tests__/integration/introspection.test.ts"
```

### Manual Validation
```yaml
steps:
  - action: "Run example 09-reflection.ts"
    expected: "See reflection events in console, retry succeeds"
    command: "npx tsx examples/examples/09-reflection.ts"

  - action: "Run example 10-introspection.ts"
    expected: "Agent describes its position in hierarchy"
    command: "npx tsx examples/examples/10-introspection.ts"
```

---

## 6. Final Validation Checklist

### Code Quality
- [ ] All TypeScript compiles without errors: `npm run build`
- [ ] No linting warnings: `npm run lint`
- [ ] Follows existing code patterns (check agent.ts, workflow.ts)
- [ ] Proper error handling with typed errors
- [ ] No circular dependencies

### Functionality
- [ ] Cache generates deterministic keys
- [ ] Cache respects maxItems and maxSize limits
- [ ] Cache TTL works correctly
- [ ] Reflection triggers on step failures when enabled
- [ ] Reflection respects maxAttempts limit
- [ ] All 6 introspection tools work
- [ ] Dynamic factories create valid instances
- [ ] Context revision works without forking tree

### Testing
- [ ] Unit tests pass: `npm test -- --grep "cache|reflection|introspection"`
- [ ] Integration tests pass: `npm test`
- [ ] Manual validation with examples complete

### Documentation
- [ ] Code is self-documenting with clear names
- [ ] Complex logic has comments
- [ ] Public APIs have JSDoc
- [ ] Examples have header comments explaining purpose

---

## 7. "No Prior Knowledge" Test

**Validation**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully using only this PRP?

- [x] All file paths are absolute and specific
- [x] All patterns have concrete examples
- [x] All dependencies are explicitly listed
- [x] All validation steps are executable
- [x] No assumed knowledge of codebase internals
- [x] Research documents provide background context

---

## Research References

See `/plan/P3P4/research/` for detailed research:
- `caching-lru.md` - LRU cache implementation patterns
- `reflection-patterns.md` - AI reflection/self-correction patterns
- `introspection-tools.md` - Tool definitions and security considerations

---

## Confidence Score: 8/10

**Strengths:**
- Clear existing patterns to follow from Phase 1 & 2
- Comprehensive research on caching and reflection
- Specific file locations and code examples
- Detailed validation steps

**Risks:**
- Reflection prompt effectiveness depends on LLM behavior
- Introspection tool handlers need careful context access
- Cache key generation for complex Zod schemas may need iteration
- Some examples require real API calls (need mocking strategy)

**Mitigations:**
- Provide sensible defaults for reflection prompts
- Extensive test coverage for edge cases
- Schema hashing tested with various Zod types
- Mock Anthropic client for example testing

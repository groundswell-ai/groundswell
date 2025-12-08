# PRP: Caching, Reflection & Introspection Systems

## Phases 3 & 4 Implementation Plan

> **PRP**: Product Requirements Package - A comprehensive implementation guide enabling one-pass success

---

## Pre-Implementation Checklist

Before implementing, verify you have:
- [ ] Read and understood this entire PRP
- [ ] Read PRPs/PRDs/002-agent-prompt.md (main PRD - Sections 9, 10, 11, 12)
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
5. Examples 7-10 are implemented (PRD Section 12)

### Success Definition
- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm test` passes all new and existing tests
- [ ] Cache integration reduces redundant API calls in tests
- [ ] Reflection triggers automatically on step/prompt failures
- [ ] Agents can use introspection tools to navigate hierarchy
- [ ] Examples 7-10 execute successfully

---

## 2. Context

### External Documentation
```yaml
anthropic_sdk:
  url: "https://github.com/anthropics/anthropic-sdk-typescript"
  purpose: "Tool definitions, message API, error types"
  version: "^0.71.1"

lru_cache:
  url: "https://www.npmjs.com/package/lru-cache"
  purpose: "LRU cache implementation with TTL and size limits"
  version: "^10.0.0"
  key_sections:
    - "Options" - maxSize, ttl, sizeCalculation
    - "Methods" - get, set, delete, has
  note: "Zero external dependencies in v10+"

node_crypto:
  url: "https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options"
  purpose: "SHA-256 hashing for cache keys"
  section: "crypto.createHash()"

zod:
  url: "https://zod.dev/"
  purpose: "Schema validation, _def access for hashing"
  version: "^3.23.0"
  key_section: "https://zod.dev/?id=zodtype-with-zodeffects"
```

### Codebase Context
```yaml
existing_patterns:
  - file: "/src/core/agent.ts"
    pattern: "Agent class with executePrompt() method"
    follow_for: "Cache integration point"
    key_lines:
      - line: 171
        purpose: "Start of executePrompt() - insert cache check here"
      - line: 239
        purpose: "After API call success - insert cache set here"
      - line: 126-149
        purpose: "reflect() method - upgrade to full reflection loop"

  - file: "/src/core/workflow-context.ts"
    pattern: "ReflectionAPIImpl placeholder class"
    follow_for: "Full ReflectionAPI implementation"
    key_lines:
      - line: 24-42
        purpose: "Placeholder implementation to replace"
      - line: 83-162
        purpose: "step() method - wrap with reflection retry"

  - file: "/src/core/context.ts"
    pattern: "AgentExecutionContext with AsyncLocalStorage"
    follow_for: "Introspection tool handlers accessing context"
    key_lines:
      - line: 1-120
        purpose: "Context propagation pattern to follow"

  - file: "/src/types/events.ts"
    pattern: "WorkflowEvent discriminated union"
    follow_for: "Already includes reflectionStart/reflectionEnd types"
    key_lines:
      - line: 52-63
        purpose: "Reflection events already defined"

  - file: "/src/types/agent.ts"
    pattern: "AgentConfig with enableCache/enableReflection flags"
    follow_for: "Flags defined but not yet used in implementation"
    key_lines:
      - line: 35
        purpose: "enableReflection?: boolean"
      - line: 38
        purpose: "enableCache?: boolean"

related_files:
  - path: "/src/types/workflow-context.ts"
    relationship: "ReflectionAPI interface definition (line 70-80)"
    note: "Interface is minimal - needs extension"

  - path: "/src/core/event-tree.ts"
    relationship: "EventTreeHandle for introspection queries"

  - path: "/src/utils/id.ts"
    relationship: "generateId() for unique identifiers"

  - path: "/src/__tests__/unit/agent.test.ts"
    relationship: "Test patterns to follow"

  - path: "/src/__tests__/integration/agent-workflow.test.ts"
    relationship: "Integration test patterns"

naming_conventions:
  files: "kebab-case.ts in appropriate directory"
  classes: "PascalCase (e.g., LLMCache, ReflectionManager)"
  functions: "camelCase (e.g., generateCacheKey, triggerReflection)"
  types: "PascalCase with descriptive suffixes (e.g., CacheConfig, ReflectionEntry)"
  tools: "snake_case for Anthropic tool names (e.g., inspect_current_node)"
  test_files: "*.test.ts in /src/__tests__/unit/ or /src/__tests__/integration/"
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
  required_new:
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

testing:
  framework: "vitest"
  config: "/vitest.config.ts"
  patterns:
    - "Use describe/it/expect from vitest"
    - "Mock external services (Anthropic API)"
    - "Use runInContext() for context tests"
```

### Known Gotchas
```yaml
pitfalls:
  - issue: "JSON.stringify does not guarantee key order"
    solution: "Use deterministicStringify with sorted keys for cache key generation"
    reference: "/plan/P3P4/research/caching-lru.md"
    code_pattern: |
      const keys = Object.keys(obj).sort();
      const pairs = keys.map(k => JSON.stringify(k) + ':' + stringify(obj[k]));
      return '{' + pairs.join(',') + '}';

  - issue: "Zod schemas are functions, cannot serialize directly"
    solution: "Hash schema._def for schema fingerprint in cache key"
    code_pattern: |
      function getSchemaHash(schema: z.ZodType): string {
        const defString = JSON.stringify(schema._def);
        return createHash('sha256').update(defString).digest('hex').slice(0, 16);
      }

  - issue: "Reflection can infinite loop"
    solution: "Hard limit maxReflectionAttempts to 3, track attempt count"
    reference: "/plan/P1P2/research/reflection-patterns.md"

  - issue: "AsyncLocalStorage context loss in some async patterns"
    solution: "Always use runInContext() wrapper from /src/core/context.ts"
    test: "Test with nested async/await to verify propagation"

  - issue: "Tool handlers need access to current context"
    solution: "Use getExecutionContext() from context.ts inside tool handlers"
    code_pattern: |
      const ctx = getExecutionContext();
      if (!ctx) throw new Error('Not in workflow context');

  - issue: "When NOT to reflect (will waste tokens)"
    solution: "Skip reflection for: rate limit errors, auth errors, quota exceeded"
    reference: "/plan/P1P2/research/reflection-patterns.md lines 644-690"

  - issue: "Circular references in cache key serialization"
    solution: "Use WeakSet to track seen objects, throw TypeError if circular"
    code_pattern: |
      const seen = new WeakSet<object>();
      if (seen.has(val)) throw new TypeError('Circular reference detected');
      seen.add(val);
```

---

## 3. Implementation Tasks

> Tasks are ordered by dependency. Complete each task fully before moving to the next.

### Phase 3: Caching & Reflection Systems

---

### Task P3.1: Cache Key Generation
**Depends on**: Phase 1 & 2 complete (verified by existing agent.ts, prompt.ts)

**Input**:
- Prompt instance with user, data, responseFormat
- Merged AgentConfig (system, tools, mcps, skills, temperature, model)

**Steps**:
1. Create `/src/cache/cache-key.ts`
2. Implement `deterministicStringify(value: unknown): string`
   - Sort object keys alphabetically using `Object.keys(obj).sort()`
   - Handle arrays (preserve order), primitives, null, undefined
   - Detect circular references with WeakSet, throw TypeError
   - Return deterministic JSON string
3. Implement `getSchemaHash(schema: z.ZodType): string`
   - Access `schema._def` for internal representation
   - Stringify and hash with SHA-256
   - Return first 16 chars of hex digest (sufficient for uniqueness)
4. Implement `generateCacheKey(inputs: CacheKeyInputs): string`
   - Include: user, data, system, model, temperature, maxTokens
   - Include: sorted tool names, sorted mcp names, sorted skill names
   - Include: schemaHash from responseFormat
   - Return 64-character hex SHA-256 digest
5. Export `CacheKeyInputs` interface and all functions
6. Create `/src/cache/index.ts` exporting all cache exports

**Output**: `/src/cache/cache-key.ts` with deterministic key generation

**Validation**:
```bash
npm run build
npm test -- --grep "cache-key"
```

**Code Pattern**:
```typescript
// /src/cache/cache-key.ts
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import type { Tool, MCPServer, Skill } from '../types/index.js';

export interface CacheKeyInputs {
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

export function deterministicStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  function stringify(val: unknown): string {
    if (val === null) return 'null';
    if (typeof val === 'string') return JSON.stringify(val);
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'undefined') return 'undefined';

    if (typeof val === 'object') {
      if (seen.has(val as object)) {
        throw new TypeError('Converting circular structure');
      }
      seen.add(val as object);

      let result: string;
      if (Array.isArray(val)) {
        result = '[' + val.map(stringify).join(',') + ']';
      } else {
        const keys = Object.keys(val as Record<string, unknown>).sort();
        const pairs = keys.map(k =>
          JSON.stringify(k) + ':' + stringify((val as Record<string, unknown>)[k])
        );
        result = '{' + pairs.join(',') + '}';
      }

      seen.delete(val as object);
      return result;
    }

    return String(val);
  }

  return stringify(value);
}

export function getSchemaHash(schema: z.ZodType): string {
  const defString = deterministicStringify(schema._def);
  return createHash('sha256').update(defString, 'utf8').digest('hex').slice(0, 16);
}

export function generateCacheKey(inputs: CacheKeyInputs): string {
  const normalized = {
    user: inputs.user,
    data: inputs.data ?? null,
    system: inputs.system ?? null,
    model: inputs.model,
    temperature: inputs.temperature ?? null,
    maxTokens: inputs.maxTokens ?? null,
    tools: inputs.tools?.map(t => t.name).sort() ?? [],
    mcps: inputs.mcps?.map(m => m.name).sort() ?? [],
    skills: inputs.skills?.map(s => s.name).sort() ?? [],
    schemaHash: getSchemaHash(inputs.responseFormat),
  };

  const serialized = deterministicStringify(normalized);
  return createHash('sha256').update(serialized, 'utf8').digest('hex');
}
```

---

### Task P3.2: LRU Cache Implementation
**Depends on**: Task P3.1

**Input**: Cache interface from PRD Section 9.2

**Steps**:
1. Add `lru-cache@^10.0.0` to package.json dependencies
2. Run `npm install`
3. Create `/src/cache/cache.ts`
4. Define `CacheConfig` interface:
   ```typescript
   interface CacheConfig {
     maxItems?: number;      // default: 1000
     maxSizeBytes?: number;  // default: 50MB (52428800)
     defaultTTLMs?: number;  // default: 1 hour (3600000)
   }
   ```
5. Define `CacheMetrics` interface for observability
6. Implement `LLMCache` class:
   - Constructor accepting optional CacheConfig
   - `get<T>(key: string): T | undefined` - sync lookup
   - `set<T>(key: string, value: T, ttl?: number): void` - sync store
   - `bust(key: string): void` - remove single entry
   - `bustPrefix(prefix: string): void` - remove all keys matching prefix
   - `metrics(): CacheMetrics` - return hit/miss/size stats
7. Implement prefix tracking with Map<string, Set<string>> for bustPrefix
8. Export singleton `defaultCache` instance with default config
9. Update `/src/cache/index.ts` with new exports

**Output**: `/src/cache/cache.ts` with full Cache implementation

**Validation**:
```bash
npm install
npm run build
npm test -- --grep "LLMCache"
```

**Code Pattern**:
```typescript
// /src/cache/cache.ts
import { LRUCache } from 'lru-cache';

export interface CacheConfig {
  maxItems?: number;
  maxSizeBytes?: number;
  defaultTTLMs?: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  itemCount: number;
}

export class LLMCache {
  private cache: LRUCache<string, unknown>;
  private hits = 0;
  private misses = 0;
  private prefixIndex = new Map<string, Set<string>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxItems: config.maxItems ?? 1000,
      maxSizeBytes: config.maxSizeBytes ?? 52428800, // 50MB
      defaultTTLMs: config.defaultTTLMs ?? 3600000,  // 1 hour
    };

    this.cache = new LRUCache<string, unknown>({
      max: this.config.maxItems,
      maxSize: this.config.maxSizeBytes,
      ttl: this.config.defaultTTLMs,
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      updateAgeOnGet: true,
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get(key) as T | undefined;
    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    return value;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, value, { ttl: ttl ?? this.config.defaultTTLMs });

    // Track prefix (first 8 chars) for bustPrefix
    const prefix = key.slice(0, 8);
    if (!this.prefixIndex.has(prefix)) {
      this.prefixIndex.set(prefix, new Set());
    }
    this.prefixIndex.get(prefix)!.add(key);
  }

  bust(key: string): void {
    this.cache.delete(key);
    // Clean up prefix index
    const prefix = key.slice(0, 8);
    this.prefixIndex.get(prefix)?.delete(key);
  }

  bustPrefix(prefix: string): void {
    const keys = this.prefixIndex.get(prefix);
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key);
      }
      this.prefixIndex.delete(prefix);
    }
  }

  metrics(): CacheMetrics {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.calculatedSize ?? 0,
      maxSize: this.config.maxSizeBytes,
      itemCount: this.cache.size,
    };
  }

  clear(): void {
    this.cache.clear();
    this.prefixIndex.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const defaultCache = new LLMCache();
```

---

### Task P3.3: Cache Integration into Agent
**Depends on**: Task P3.2

**Input**: Agent.executePrompt() method at `/src/core/agent.ts:171`

**Steps**:
1. Import `generateCacheKey` and `defaultCache` in agent.ts
2. Add cache check at start of `executePrompt()` (after line 175):
   ```typescript
   if (this.config.enableCache && !overrides?.disableCache) {
     const cacheKey = generateCacheKey({
       user: prompt.user,
       data: prompt.data,
       system: effectiveSystem,
       model: effectiveModel,
       temperature: effectiveTemperature,
       maxTokens: effectiveMaxTokens,
       tools: effectiveTools,
       responseFormat: prompt.responseFormat,
     });
     const cached = defaultCache.get<PromptResult<T>>(cacheKey);
     if (cached) {
       // Emit cache hit event if in workflow context
       if (ctx) {
         this.emitWorkflowEvent({ type: 'cacheHit', key: cacheKey, node: ctx.workflowNode });
       }
       return cached;
     }
   }
   ```
3. Add cache set after successful response (around line 355):
   ```typescript
   if (this.config.enableCache && !overrides?.disableCache) {
     defaultCache.set(cacheKey, result);
   }
   ```
4. Update `/src/types/events.ts` to add cacheHit/cacheMiss event types:
   ```typescript
   | { type: 'cacheHit'; key: string; node: WorkflowNode }
   | { type: 'cacheMiss'; key: string; node: WorkflowNode }
   ```
5. Emit cache miss event when cache check fails

**Output**: Agent.prompt() checks and populates cache

**Validation**:
```bash
npm run build
npm test -- --grep "agent-cache"
```

---

### Task P3.4: ReflectionAPI Type Definitions
**Depends on**: Phase 2 complete

**Input**: Placeholder at `/src/types/workflow-context.ts:70`

**Steps**:
1. Create `/src/types/reflection.ts`
2. Define complete interfaces:
   ```typescript
   export interface ReflectionConfig {
     enabled: boolean;
     maxAttempts: number;      // default: 3
     retryDelayMs?: number;    // default: 0
   }

   export interface ReflectionContext {
     level: 'workflow' | 'agent' | 'prompt';
     failedNode: WorkflowNode;
     error: Error;
     attemptNumber: number;
     previousAttempts: ReflectionEntry[];
   }

   export interface ReflectionResult {
     shouldRetry: boolean;
     revisedPromptData?: Record<string, unknown>;
     revisedSystemPrompt?: string;
     reason: string;
   }

   export interface ReflectionEntry {
     timestamp: number;
     level: 'workflow' | 'agent' | 'prompt';
     reason: string;
     error: Error;
     resolution: 'retry' | 'skip' | 'abort';
     success: boolean;
   }

   export interface ReflectionAPI {
     isEnabled(): boolean;
     getMaxAttempts(): number;
     triggerReflection(reason?: string): Promise<void>;
     getReflectionHistory(): ReflectionEntry[];
     reflect(context: ReflectionContext): Promise<ReflectionResult>;
     recordAttempt(entry: ReflectionEntry): void;
   }
   ```
3. Update `/src/types/workflow-context.ts` to import and use extended ReflectionAPI
4. Export from `/src/types/index.ts`

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
   - `getMaxAttempts()`: Return config.maxAttempts
   - `reflect(context: ReflectionContext): Promise<ReflectionResult>`
     - Build reflection prompt with error context
     - If agent provided, call agent for reflection analysis
     - Parse response for shouldRetry decision
     - Record entry in history
   - `triggerReflection(reason?: string)`: Emit events, log
   - `getReflectionHistory()`: Return recorded entries
   - `recordAttempt(entry)`: Add to history
3. Define reflection prompt template:
   ```typescript
   const REFLECTION_PROMPT = `
   A previous operation failed with the following error:

   Error: {{error.message}}
   Level: {{level}}
   Attempt: {{attemptNumber}} of {{maxAttempts}}

   Previous attempts:
   {{previousAttempts}}

   Analyze the error and determine:
   1. Can this be retried with modifications?
   2. What changes would help succeed?
   3. What should NOT be repeated?

   Respond with JSON: { "shouldRetry": boolean, "reason": string, "revisedPromptData": {...} }
   `;
   ```
4. Emit reflectionStart/reflectionEnd events (types already exist in events.ts)
5. Create `/src/reflection/index.ts` exporting all reflection exports

**Output**: `/src/reflection/reflection.ts` with full implementation

**Validation**:
```bash
npm run build
npm test -- --grep "ReflectionManager"
```

---

### Task P3.6: Wire Reflection into WorkflowContext
**Depends on**: Task P3.5

**Input**: `/src/core/workflow-context.ts`

**Steps**:
1. Replace `ReflectionAPIImpl` placeholder with real import from `/src/reflection/reflection.ts`
2. Update `WorkflowContextImpl` constructor:
   - Create `ReflectionManager` with workflow's enableReflection config
3. Update `step()` method to wrap with reflection:
   ```typescript
   async step<T>(name: string, fn: () => Promise<T>): Promise<T> {
     let lastError: Error | null = null;

     for (let attempt = 1; attempt <= this.reflection.getMaxAttempts(); attempt++) {
       try {
         return await this.executeStep(name, fn, attempt);
       } catch (error) {
         lastError = error as Error;

         if (!this.reflection.isEnabled()) throw error;
         if (this.shouldSkipReflection(error)) throw error;
         if (attempt >= this.reflection.getMaxAttempts()) throw error;

         const result = await this.reflection.reflect({
           level: 'workflow',
           failedNode: stepNode,
           error: lastError,
           attemptNumber: attempt,
           previousAttempts: this.reflection.getReflectionHistory()
         });

         if (!result.shouldRetry) throw error;

         // Continue to next iteration with reflection context
       }
     }

     throw lastError;
   }

   private shouldSkipReflection(error: Error): boolean {
     const message = error.message.toLowerCase();
     // Skip reflection for errors that can't be self-corrected
     return message.includes('rate limit') ||
            message.includes('authentication') ||
            message.includes('quota exceeded') ||
            message.includes('unauthorized');
   }
   ```

**Output**: Automatic reflection on step failures

**Validation**:
```bash
npm run build
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
   import { Workflow, type WorkflowExecutor } from './workflow.js';
   import { Agent } from './agent.js';
   import { Prompt } from './prompt.js';
   import type { WorkflowConfig, AgentConfig, PromptConfig } from '../types/index.js';

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
3. Export from `/src/core/index.ts` and `/src/index.ts`

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
3. Emit 'promptRevision' event (add to events.ts if needed)

**Output**: Context revision without tree forking

**Validation**:
```bash
npm run build
npm test -- --grep "context-revision"
```

---

### Task P4.3: Introspection Tool Definitions
**Depends on**: P4.1

**Input**: PRD Section 11, `/plan/P3P4/research/introspection-tools.md`

**Steps**:
1. Create `/src/tools/introspection.ts`
2. Define 6 tool interfaces using Anthropic Tool format:
   - `inspect_current_node`: Return current node info (id, name, status, parent, childCount, depth)
   - `read_ancestor_chain`: Return ancestors up to root with optional maxDepth
   - `list_siblings_children`: Return siblings or children based on 'type' parameter
   - `inspect_prior_outputs`: Return previous step outputs with optional nodeId/count
   - `inspect_cache_status`: Check cache for prompt hash
   - `request_spawn_workflow`: Request dynamic workflow creation
3. For each tool, define:
   - Tool definition (name, description, input_schema following Anthropic format)
   - Handler function signature
4. Create `/src/tools/index.ts` exporting all tools

**Output**: Tool definitions in `/src/tools/introspection.ts`

**Validation**: TypeScript compiles

**Code Pattern**:
```typescript
// /src/tools/introspection.ts
import type { Tool } from '../types/index.js';
import type { WorkflowNode } from '../types/workflow.js';
import { getExecutionContext } from '../core/context.js';

// Tool Definitions
export const inspectCurrentNodeTool: Tool = {
  name: 'inspect_current_node',
  description: 'Get information about the current workflow node including ID, name, status, and parent reference',
  input_schema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const readAncestorChainTool: Tool = {
  name: 'read_ancestor_chain',
  description: 'Get all ancestor nodes from current position up to the root workflow',
  input_schema: {
    type: 'object',
    properties: {
      maxDepth: {
        type: 'number',
        description: 'Maximum ancestors to return (default: all)'
      }
    },
    required: []
  }
};

export const listSiblingsChildrenTool: Tool = {
  name: 'list_siblings_children',
  description: 'List sibling or child nodes relative to current position',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['siblings', 'children'],
        description: 'Type of nodes to list'
      }
    },
    required: ['type']
  }
};

export const inspectPriorOutputsTool: Tool = {
  name: 'inspect_prior_outputs',
  description: 'Get outputs from prior steps or prompt executions',
  input_schema: {
    type: 'object',
    properties: {
      nodeId: { type: 'string', description: 'Specific node ID to inspect' },
      count: { type: 'number', description: 'Number of prior outputs (default: 1)' }
    },
    required: []
  }
};

export const inspectCacheStatusTool: Tool = {
  name: 'inspect_cache_status',
  description: 'Check if a prompt response is cached',
  input_schema: {
    type: 'object',
    properties: {
      promptHash: { type: 'string', description: 'Hash of the prompt to check' }
    },
    required: ['promptHash']
  }
};

export const requestSpawnWorkflowTool: Tool = {
  name: 'request_spawn_workflow',
  description: 'Request to spawn a new child workflow dynamically',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Name for the new workflow' },
      description: { type: 'string', description: 'What the workflow should do' }
    },
    required: ['name', 'description']
  }
};

// Bundle export
export const INTROSPECTION_TOOLS: Tool[] = [
  inspectCurrentNodeTool,
  readAncestorChainTool,
  listSiblingsChildrenTool,
  inspectPriorOutputsTool,
  inspectCacheStatusTool,
  requestSpawnWorkflowTool
];
```

---

### Task P4.4: Introspection Tool Handlers
**Depends on**: Task P4.3

**Input**: Tool definitions, AgentExecutionContext

**Steps**:
1. Implement handler for `inspect_current_node`:
   ```typescript
   export interface CurrentNodeInfo {
     id: string;
     name: string;
     status: string;
     parentId?: string;
     parentName?: string;
     childCount: number;
     depth: number;
   }

   export async function handleInspectCurrentNode(): Promise<CurrentNodeInfo> {
     const ctx = getExecutionContext();
     if (!ctx) throw new Error('Not in workflow context');

     const node = ctx.workflowNode;
     return {
       id: node.id,
       name: node.name,
       status: node.status,
       parentId: node.parent?.id,
       parentName: node.parent?.name,
       childCount: node.children.length,
       depth: calculateDepth(node)
     };
   }

   function calculateDepth(node: WorkflowNode): number {
     let depth = 0;
     let current = node.parent;
     while (current) {
       depth++;
       current = current.parent;
     }
     return depth;
   }
   ```
2. Implement remaining handlers similarly (read_ancestor_chain, list_siblings_children, etc.)
3. Create tool executor registry mapping tool names to handlers
4. Export `registerIntrospectionHandlers(mcpHandler: MCPHandler)` function

**Output**: Working introspection tool handlers

**Validation**:
```bash
npm run build
npm test -- --grep "introspection-tools"
```

---

### Task P4.5: Update Main Exports
**Depends on**: All prior tasks

**Input**: All new classes, types, tools

**Steps**:
1. Update `/src/index.ts` with all new exports:
   ```typescript
   // Cache
   export { LLMCache, defaultCache } from './cache/cache.js';
   export { generateCacheKey, deterministicStringify, getSchemaHash } from './cache/cache-key.js';
   export type { CacheConfig, CacheMetrics, CacheKeyInputs } from './cache/index.js';

   // Reflection
   export { ReflectionManager } from './reflection/reflection.js';
   export type {
     ReflectionAPI,
     ReflectionConfig,
     ReflectionContext,
     ReflectionResult,
     ReflectionEntry
   } from './types/reflection.js';

   // Introspection
   export { INTROSPECTION_TOOLS, registerIntrospectionHandlers } from './tools/introspection.js';
   export type { CurrentNodeInfo, AncestorInfo } from './tools/introspection.js';

   // Factories
   export { createWorkflow, createAgent, createPrompt } from './core/factory.js';
   ```
2. Update `/src/types/index.ts` with new type exports

**Output**: Complete public API

**Validation**:
```bash
npm run build
node -e "const g = require('./dist'); console.log(Object.keys(g).filter(k => k.includes('Cache') || k.includes('Reflection') || k.includes('INTROSPECTION')));"
```

---

### Phase 5: Examples

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
   - Custom tool definitions with handlers
   - MCP server configuration (inprocess)
   - Pre/Post tool hooks
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
  const maxAttempts = reflection.getMaxAttempts();

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
      // Continue to next attempt
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
│   ├── introspection.ts      # Introspection tools + handlers
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

### Interface Definitions Summary
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

interface CacheConfig {
  maxItems?: number;
  maxSizeBytes?: number;
  defaultTTLMs?: number;
}

interface ReflectionConfig {
  enabled: boolean;
  maxAttempts: number;
  retryDelayMs?: number;
}

interface ReflectionAPI {
  isEnabled(): boolean;
  getMaxAttempts(): number;
  triggerReflection(reason?: string): Promise<void>;
  getReflectionHistory(): ReflectionEntry[];
  reflect(context: ReflectionContext): Promise<ReflectionResult>;
  recordAttempt(entry: ReflectionEntry): void;
}
```

---

## 5. Testing Strategy

### Unit Tests
```yaml
test_files:
  - path: "/src/__tests__/unit/cache-key.test.ts"
    covers:
      - "deterministicStringify produces same output for same input"
      - "deterministicStringify sorts object keys"
      - "deterministicStringify detects circular references"
      - "getSchemaHash produces consistent hashes"
      - "generateCacheKey is deterministic"
      - "Different inputs produce different keys"

  - path: "/src/__tests__/unit/cache.test.ts"
    covers:
      - "LLMCache get/set works correctly"
      - "LRU eviction works when maxItems exceeded"
      - "TTL expiration works"
      - "bustPrefix removes correct entries"
      - "Size limits enforced (maxSizeBytes)"
      - "metrics() returns accurate counts"

  - path: "/src/__tests__/unit/reflection.test.ts"
    covers:
      - "ReflectionManager.isEnabled() returns config value"
      - "ReflectionManager.reflect() builds correct prompt"
      - "History is recorded correctly"
      - "maxAttempts is respected"
      - "shouldSkipReflection() filters appropriate errors"

  - path: "/src/__tests__/unit/introspection-tools.test.ts"
    covers:
      - "Each tool definition has correct schema"
      - "Each tool handler returns expected format"
      - "Tools work within context"
      - "Tools fail gracefully outside context"

test_patterns:
  - "Use vitest describe/it/expect"
  - "Mock Agent for reflection tests"
  - "Use runInContext for introspection tests"
  - "Create mock WorkflowNode with createMockNode helper"
```

### Integration Tests
```yaml
scenarios:
  - name: "Cache integration with Agent"
    validates: "Second identical prompt returns cached response"
    file: "/src/__tests__/integration/agent-cache.test.ts"
    steps:
      - Create Agent with enableCache: true
      - Execute prompt
      - Execute same prompt again
      - Verify second call uses cache (check metrics)

  - name: "Reflection in workflow step"
    validates: "Failed step triggers reflection, retry succeeds"
    file: "/src/__tests__/integration/workflow-reflection.test.ts"
    steps:
      - Create workflow with enableReflection: true
      - Execute step that fails on first attempt
      - Verify reflection events emitted
      - Verify retry succeeds on second attempt

  - name: "Introspection tools in agent"
    validates: "Agent can use tools to explore hierarchy"
    file: "/src/__tests__/integration/introspection.test.ts"
    steps:
      - Create nested workflow structure
      - Add agent with INTROSPECTION_TOOLS
      - Have agent call inspect_current_node
      - Verify correct node info returned
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

  - action: "Verify cache reduces API calls"
    expected: "Second run much faster with cache enabled"
    command: "npm test -- --grep 'agent-cache'"
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
- [ ] Cache generates deterministic keys (same input = same key)
- [ ] Cache respects maxItems and maxSizeBytes limits
- [ ] Cache TTL works correctly (expired entries not returned)
- [ ] bustPrefix removes all matching entries
- [ ] Reflection triggers on step failures when enabled
- [ ] Reflection respects maxAttempts limit (default: 3)
- [ ] Reflection skips non-recoverable errors (rate limit, auth)
- [ ] All 6 introspection tools work correctly
- [ ] Dynamic factories create valid instances
- [ ] Context revision works without forking tree

### Testing
- [ ] Unit tests pass: `npm test -- --grep "cache|reflection|introspection"`
- [ ] Integration tests pass: `npm test`
- [ ] Manual validation with examples complete

### Documentation
- [ ] Code is self-documenting with clear names
- [ ] Complex logic has comments explaining "why"
- [ ] Public APIs have JSDoc comments
- [ ] Examples have header comments explaining purpose

---

## 7. "No Prior Knowledge" Test

**Validation**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully using only this PRP?

- [x] All file paths are absolute and specific
- [x] All patterns have concrete examples with code
- [x] All dependencies are explicitly listed with versions
- [x] All validation steps are executable commands
- [x] No assumed knowledge of codebase internals
- [x] Key line numbers provided for integration points
- [x] Research documents referenced for background context
- [x] Known gotchas documented with solutions

---

## Research References

See `/plan/P3P4/research/` for detailed research:
- `caching-lru.md` - LRU cache implementation patterns, deterministic stringify
- `reflection-patterns.md` - AI reflection/self-correction patterns
- `introspection-tools.md` - Tool definitions and security considerations

See `/plan/P1P2/research/` for additional context:
- `reflection-patterns.md` - Comprehensive reflection research (1400+ lines)
- `anthropic-sdk.md` - SDK patterns and error handling

---

## Confidence Score: 9/10

**Strengths:**
- Clear existing patterns to follow from Phase 1 & 2
- Comprehensive research on caching and reflection already exists
- Specific file locations and code examples provided
- Detailed validation steps with commands
- Event types for reflection already defined in codebase
- Configuration flags (enableCache, enableReflection) already in types

**Risks:**
- Reflection prompt effectiveness depends on LLM behavior
- Introspection tool handlers need careful context access testing
- Cache key generation for complex Zod schemas may need iteration
- AsyncLocalStorage edge cases in deeply nested async flows

**Mitigations:**
- Provide sensible defaults for reflection prompts
- Extensive test coverage for edge cases
- Schema hashing tested with various Zod types
- Context propagation already proven in Phase 2 tests

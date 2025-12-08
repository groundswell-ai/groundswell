# **📘 Product Requirements Document (PRD)**

### **Groundswell Orchestration Framework — Source of Truth v1.0**

### **Unified Workflow · Agent · Prompt System**

---

# **1. Purpose**

This PRD defines the core architecture and feature requirements for the Groundswell orchestration framework. The system provides a fully composable, hierarchical execution environment for workflows, agents, prompts, and dynamically created subflows. It ensures complete observability, strict determinism of structure, dynamic control, and seamless integration with Anthropic’s Agent SDK—including tools, MCPs, hooks, skills, and environment variables.

This document is the single source of truth for all functional, structural, and behavioral requirements.

---

# **2. System Goals**

1. Full composability of Workflows, Agents, Prompts in arbitrary JavaScript control flow.
2. Rich hierarchical observability with an automatically assembled event tree.
3. Full compatibility with Anthropic’s Agent SDK (tools, MCPs, hooks, skills, streaming).
4. Agents, Prompts, and Workflows that can be instantiated once and used anywhere.
5. Runtime dynamic construction of new workflows, agents, and prompts.
6. Dynamic context revision (replace or update prompts mid-session).
7. Reflection support at Workflow, Agent, and Prompt levels.
8. Hierarchical automatic “mounting” similar to React component trees.
9. Deterministic logging, traceability, and data inspection across the entire hierarchy.
10. Ability for agents to inspect and manipulate their own position in the hierarchy using special tools.

---

# **3. Core Entities**

The system consists of three primary entities:

```
Workflow  →  contains Steps  →  Steps contain AgentRuns and Subflows
Agent     →  executes Prompts via Anthropic’s Agent SDK
Prompt    →  immutable declarative definition of a single agent call
```

Entities are fully independent, instantiable, reusable, serializable, and composable.

---

# **4. Workflow Specification**

## **4.1 Workflow Type**

```ts
interface WorkflowConfig {
  name?: string;
  enableReflection?: boolean;
}
```

## **4.2 Workflow Instance**

```ts
class Workflow {
  constructor(config: WorkflowConfig, executor: (ctx: WorkflowContext) => Promise<any>);
  run(): Promise<WorkflowResult>;
}
```

* Workflows can be nested dynamically.
* A workflow always reports into the nearest ancestor workflow’s event tree.
* A workflow has a root node automatically mounted into the hierarchy.

## **4.3 Workflow Context**

```ts
interface WorkflowContext {
  workflowId: string;
  parentWorkflowId?: string;
  step(name: string, fn: () => Promise<any>): Promise<any>;
  spawnWorkflow(wf: Workflow): Promise<any>;
  eventTree: EventTreeHandle;
  reflection: ReflectionAPI;
}
```

### Requirements:

* `step()` may be called anywhere inside arbitrary JavaScript logic (loops, conditionals, async flows).
* `spawnWorkflow()` inserts a child workflow under the current workflow in the hierarchy.
* All events produced under a `step` are automatically nested.

## **4.4 Reflection (Workflow Level)**

If enabled:

* Any step failure triggers a reflection pass.
* A reflection prompt is automatically created unless overridden by the user.
* Workflow-level reflection may be disabled or enabled globally.

---

# **5. Agent Specification**

Agents are lightweight wrappers around Anthropic’s Agent SDK.
All Agent configuration properties correspond directly to Anthropic SDK properties.

## **5.1 Agent Type**

```ts
interface AgentConfig {
  name?: string;

  // Anthropic SDK properties
  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;    // lifecycle hooks FROM the SDK, not custom
  env?: Record<string, string>;

  enableReflection?: boolean;
  enableCache?: boolean;
}
```

### Rules:

* Every property in AgentConfig maps 1:1 to Anthropic SDK.
* No custom hook types are invented.
* Tools, MCPs, Skills, Hooks are passed through unchanged.
* All environment variables must be passed through untouched.

## **5.2 Agent Instance**

```ts
class Agent {
  constructor(config: AgentConfig);

  prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>;
  reflect<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<T>;
}
```

## **5.3 Prompt Overrides**

```ts
interface PromptOverrides {
  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;
  env?: Record<string, string>;

  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  disableCache?: boolean;

  enableReflection?: boolean;
}
```

### Rules:

* Prompt overrides take precedence over Agent config.
* Anything that exists in AgentConfig can be overridden at the prompt level.

---

# **6. Prompt Specification**

Prompts define the content and expected output shape.

## **6.1 Prompt Type**

```ts
class Prompt<T> {
  readonly user: string;         // user messages
  readonly data: Record<string, any>;  // structured data injected
  readonly responseFormat: ZodSchema<T>;

  readonly systemOverride?: string;
  readonly toolsOverride?: Tool[];
  readonly mcpsOverride?: MCPServer[];
  readonly skillsOverride?: Skill[];
  readonly hooksOverride?: AgentHooks;

  readonly enableReflection?: boolean;

  constructor(config: PromptConfig<T>);
}
```

## **6.2 PromptConfig**

```ts
interface PromptConfig<T> {
  user: string;
  data?: Record<string, any>;
  responseFormat: ZodSchema<T>;

  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;

  enableReflection?: boolean;
}
```

### Rules:

* Prompts are immutable.
* Prompts may override any Agent-level value that corresponds to Anthropic SDK fields.
* Reflection can be enabled specifically for a single Prompt.

---

# **7. Hierarchy Specification**

## **7.1 Automatic Mounting**

Whenever:

* a Workflow runs another Workflow
* an Agent executes a Prompt
* a Prompt triggers tools or MCP events
* a reflection flow is produced
* a dynamic subflow is created by an agent

The system must automatically:

1. Identify the current parent node.
2. Create a new child node.
3. Attach it in the event tree.
4. Propagate the lineage upward.

Zero user plumbing is allowed.
The hierarchy must behave like a React tree: mounting determines placement.

---

# **8. Event System**

## **8.1 Requirements**

* Every event from Anthropic SDK tools, MCP streams, agent streams, prompts, and workflow steps must be captured.
* The entire event tree must be assembled automatically.
* The tree must be directly queryable as a complete object.

## **8.2 Event Structure**

```ts
interface EventNode {
  id: string;
  type: EventType;
  timestamp: number;

  name?: string;
  payload?: any;
  metrics?: EventMetrics;

  parentId?: string;
  children: EventNode[];
}
```

## **8.3 Queryable Event Tree API**

```ts
interface EventTreeHandle {
  root: EventNode;
  getNode(id: string): EventNode | undefined;
  getChildren(id: string): EventNode[];
  getAncestors(id: string): EventNode[];
  toJSON(): EventNode;
}
```

---

# **9. Caching Specification**

## **9.1 Cache Key**

SHA-256 of deterministic JSON encoding of:

```
user message
data
system value
model settings
temperature
tools
mcps
skills
schema version/hash
```

## **9.2 Cache API**

```ts
interface Cache {
  get(key: string): Promise<any | undefined>;
  set(key: string, value: any): Promise<void>;
  bust(key: string): Promise<void>;
  bustPrefix(prefix: string): Promise<void>;
}
```

Default: in-memory LRU.

---

# **10. Dynamic Behavior Requirements**

## **10.1 Dynamic Workflow/Agent/Prompt Creation**

Agents must be able to:

* create new Workflows
* create new Agents
* create new Prompts
* spawn them
* attach them into the hierarchy automatically

No additional user code besides calling the workflow/agent/prompt constructors.

## **10.2 Dynamic Context Revision**

Users must be able to:

* send a yes/no or clarifying prompt
* inspect the result
* replace the previous prompt with a new prompt
* continue the chain without forking the tree incorrectly

---

# **11. Agent Introspection & Control Tools**

A standard set of tools must be provided to agents:

* inspect current workflow node
* read full ancestor chain
* list sibling or child nodes
* inspect prior outputs
* inspect cache status
* request workflow mount points
* request spawning of new workflows or agents

These are standard tools implemented using Anthropic SDK conventions.

---

# **12. Examples Directory**

A complete examples directory must include:

1. Basic workflow with steps
2. Workflow calling Agents with different prompts
3. A single Agent used across many workflows
4. Workflow inside a workflow
5. Agent spawning a new Workflow dynamically
6. Dynamic prompt replacement based on output conditions
7. Loops calling multiple agents repeatedly with full observability
8. Tools, MCPs, hooks, skills usage examples
9. Reflection at each level (Workflow, Agent, Prompt)
10. Introspection tools demo

All examples must be minimal, isolated, and canonical.

---

# **13. Completion Criteria (MVP)**

The MVP is complete when:

1. The hierarchy system mounts everything automatically.
2. Workflows, Agents, and Prompts are fully composable in JS control flow.
3. All Anthropic SDK fields pass through cleanly.
4. Event tree is complete and queryable.
5. Dynamic workflows are attachable anywhere.
6. Reflection works at all three levels.
7. Cache works with overrides and schema hashing.
8. Introspection tools work.
9. Examples directory is complete.

---

# **End of PRD**

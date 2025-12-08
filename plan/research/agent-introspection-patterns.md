# Agent Introspection and Self-Awareness Patterns in AI Orchestration Frameworks

**Research Date:** December 8, 2025
**Focus:** Anthropic Tool Format, Hierarchy Inspection, Security Boundaries, Self-Modification Capabilities

---

## Table of Contents

1. [Introspection Capabilities](#introspection-capabilities)
2. [Anthropic Tool Definition Format](#anthropic-tool-definition-format)
3. [Hierarchy Inspection Patterns](#hierarchy-inspection-patterns)
4. [Security Considerations](#security-considerations)
5. [Self-Modification Capabilities](#self-modification-capabilities)
6. [Implementation Patterns for Groundswell](#implementation-patterns-for-groundswell)

---

## Introspection Capabilities

### Current State of Agent Introspection

Research from Anthropic demonstrates that modern LLMs like Claude exhibit **emergent introspective awareness**, though it remains "highly unreliable and limited in scope." Key findings include:

- Claude models can examine and critique their own outputs
- Self-analysis ("introspection") capabilities are less developed than task execution
- Agents benefit from explicit introspection tools rather than relying on emergent capabilities

### How Agents Should Inspect Position in Workflow Hierarchy

Agents require access to contextual information about their place in execution hierarchy:

**Position Inspection Elements:**
- **Workflow Identity**: Current workflow ID, name, status
- **Parent Context**: Parent workflow ID, name, execution stage
- **Ancestor Chain**: Full path from current node to root
- **Sibling Information**: Peer workflows at same hierarchy level
- **Hierarchy Depth**: How many levels deep in the tree
- **Execution Timeline**: When workflow started, current elapsed time

**Prior Output Inspection:**
- **Ancestor Outputs**: Results from parent workflows and prior steps
- **Sibling Results**: Outputs from parallel or sequential peer workflows
- **Cache Status**: What results have been cached vs. computed fresh
- **State Snapshots**: Captured state at key decision points
- **Event History**: Log of all events in the execution tree

### Design Pattern: Ancestor Chain Traversal

From research on tree data structures (DOM navigation, XPath axes):

```
Current Node (ID: workflow-456)
    ↑ parent
    Parent Node (ID: workflow-123, status: running)
        ↑ parent
        Root Node (ID: root-001, status: running)
```

**Key Methods for Tree Traversal:**
- `ancestors(nodeId)` → returns path from node to root
- `parent(nodeId)` → returns immediate parent
- `root()` → returns root workflow
- `siblings(nodeId)` → returns peers at same level
- `children(nodeId)` → returns all direct children
- `descendants(nodeId)` → returns full subtree

---

## Anthropic Tool Definition Format

### Tool Structure (JSON Schema)

Based on Anthropic's official documentation and MCP Protocol specification:

```json
{
  "name": "inspect_workflow_hierarchy",
  "description": "Inspect the current workflow's position in the execution hierarchy, including ancestors, siblings, and prior results.",
  "input_schema": {
    "type": "object",
    "properties": {
      "node_id": {
        "type": "string",
        "description": "The workflow node ID to inspect. If omitted, inspects current workflow."
      },
      "include_ancestors": {
        "type": "boolean",
        "description": "Include full ancestor chain from current node to root",
        "default": true
      },
      "include_siblings": {
        "type": "boolean",
        "description": "Include sibling workflows at same hierarchy level",
        "default": false
      },
      "include_state_snapshots": {
        "type": "boolean",
        "description": "Include captured state snapshots from ancestor workflows",
        "default": false
      },
      "include_prior_outputs": {
        "type": "boolean",
        "description": "Include execution outputs from ancestor workflows",
        "default": false
      }
    },
    "required": ["node_id"]
  }
}
```

### Core Tool Naming Conventions

**Recommended Naming Patterns for Introspection Tools:**

1. **Prefix-Based (Resource + Action):**
   - `workflow_inspect_hierarchy`
   - `workflow_inspect_state`
   - `workflow_inspect_cache`
   - `workflow_read_ancestor_outputs`

2. **Verb-First (Clearer Intent):**
   - `inspect_workflow_hierarchy`
   - `read_workflow_state`
   - `query_execution_history`
   - `get_ancestor_results`

3. **Hierarchical Grouping (MCP Style):**
   - `workflows/inspect_hierarchy`
   - `workflows/read_state`
   - `workflows/list_ancestors`
   - `cache/get_status`

**Anthropic Best Practices:**
- Use snake_case for tool names
- Group related tools with common prefixes (e.g., `workflow_*`)
- Avoid generic names like `get` or `query` - be specific
- Names should be immediately understandable to the model

### Complete Tool Definition Set

#### 1. Workflow Hierarchy Inspector

```json
{
  "name": "workflow_inspect_hierarchy",
  "description": "Get the current workflow's position in the execution hierarchy. Returns parent, ancestors, siblings, and depth information.",
  "input_schema": {
    "type": "object",
    "properties": {
      "node_id": {
        "type": "string",
        "description": "Workflow node ID. If omitted, uses current workflow context."
      },
      "depth": {
        "type": "string",
        "enum": ["current_only", "parent_only", "ancestors_only", "full_tree"],
        "description": "How much of the hierarchy to return",
        "default": "full_tree"
      }
    },
    "required": []
  }
}
```

**Example Response:**
```json
{
  "current": {
    "id": "workflow-456",
    "name": "DataProcessingStep",
    "status": "running",
    "started_at": 1702080000000,
    "elapsed_ms": 5432
  },
  "parent": {
    "id": "workflow-123",
    "name": "MainOrchestrator",
    "status": "running",
    "depth": 1
  },
  "ancestors": [
    {
      "id": "workflow-123",
      "name": "MainOrchestrator",
      "depth": 1
    },
    {
      "id": "root-001",
      "name": "RootWorkflow",
      "depth": 2
    }
  ],
  "siblings": [
    {
      "id": "workflow-789",
      "name": "DataValidationStep",
      "status": "completed"
    },
    {
      "id": "workflow-999",
      "name": "DataTransformStep",
      "status": "pending"
    }
  ],
  "hierarchy_depth": 2,
  "total_siblings": 2
}
```

#### 2. Ancestor Output Reader

```json
{
  "name": "workflow_read_ancestor_outputs",
  "description": "Read execution outputs and results from ancestor workflows. Supports filtering by ancestor name or ID.",
  "input_schema": {
    "type": "object",
    "properties": {
      "ancestor_id": {
        "type": "string",
        "description": "Specific ancestor workflow ID. If omitted, returns outputs from all ancestors in order."
      },
      "ancestor_name": {
        "type": "string",
        "description": "Filter by ancestor workflow name (e.g., 'MainOrchestrator')"
      },
      "include_state_snapshots": {
        "type": "boolean",
        "description": "Include full state snapshots from ancestors",
        "default": false
      },
      "limit_ancestry_depth": {
        "type": "integer",
        "description": "Only go this many levels up (1=parent only, 2=parent+grandparent, etc)",
        "minimum": 1
      }
    },
    "required": []
  }
}
```

**Example Response:**
```json
{
  "outputs": [
    {
      "workflow_id": "workflow-123",
      "workflow_name": "MainOrchestrator",
      "depth": 1,
      "status": "running",
      "result": {
        "data_schema": "validated",
        "record_count": 15000,
        "processing_duration_ms": 2341
      },
      "state_snapshot": {
        "timestamp": 1702080005000,
        "error_count": 0,
        "warnings": ["High memory usage detected"]
      }
    }
  ]
}
```

#### 3. Cache Status Inspector

```json
{
  "name": "workflow_inspect_cache",
  "description": "Inspect caching status for current workflow and ancestors. Shows which results have been cached vs computed fresh.",
  "input_schema": {
    "type": "object",
    "properties": {
      "node_id": {
        "type": "string",
        "description": "Workflow node ID to check cache for"
      },
      "check_ancestors": {
        "type": "boolean",
        "description": "Also check cache status for ancestor workflows",
        "default": true
      },
      "cache_key_filter": {
        "type": "string",
        "description": "Only return cache entries matching this filter (supports wildcards)"
      }
    },
    "required": []
  }
}
```

**Example Response:**
```json
{
  "workflow_id": "workflow-456",
  "cache_status": {
    "enabled": true,
    "entries": [
      {
        "key": "data_validation_result",
        "cached": true,
        "age_ms": 1234,
        "hit_count": 3,
        "source_workflow": "workflow-123"
      },
      {
        "key": "schema_analysis",
        "cached": false,
        "computed_ms": 5678,
        "computation_time": 5678
      }
    ],
    "total_cache_size_bytes": 102400,
    "cache_hit_rate": 0.75
  }
}
```

#### 4. Event History Reader

```json
{
  "name": "workflow_read_event_history",
  "description": "Read events from workflow execution tree. Supports filtering by type, workflow, time range.",
  "input_schema": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "Filter to specific workflow (if omitted, includes all)"
      },
      "event_types": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": ["stepStart", "stepEnd", "toolInvocation", "error", "stateSnapshot", "childAttached"]
        },
        "description": "Only include these event types"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of events to return",
        "default": 100,
        "maximum": 1000
      },
      "include_full_context": {
        "type": "boolean",
        "description": "Include full event details and payload",
        "default": false
      }
    },
    "required": []
  }
}
```

#### 5. Workflow State Snapshot Reader

```json
{
  "name": "workflow_inspect_state_snapshot",
  "description": "Read captured state snapshot from a specific workflow. Shows decorated @ObservedState values at point of capture.",
  "input_schema": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "Workflow to read state from"
      },
      "snapshot_timestamp": {
        "type": "integer",
        "description": "Specific snapshot timestamp (if omitted, returns latest)"
      },
      "property_filter": {
        "type": "string",
        "description": "Only return state properties matching this filter"
      }
    },
    "required": ["workflow_id"]
  }
}
```

---

## Hierarchy Inspection Patterns

### Tree Navigation Query Language

From research on LangGraph, XPath, and ADK workflow patterns, effective hierarchy inspection requires:

**1. Axis-Based Navigation (XPath-Inspired):**

```
ancestor::* → All ancestors from current to root
ancestor-or-self::* → Current node plus all ancestors
parent::* → Immediate parent only
sibling::* → All siblings at same level
child::* → All direct children
descendant::* → All children recursively
descendant-or-self::* → Current plus all descendants
```

**2. Predicate Filtering:**

```
[name="MainOrchestrator"] → Filter by name
[status="completed"] → Filter by status
[depth=1] → Filter by hierarchy depth
[time_range="1702080000000..1702081000000"] → Filter by time
```

### Exposure Architecture

**What Agents Should See (READ-ONLY):**
- Workflow IDs and names
- Execution status (idle, running, completed, failed)
- Hierarchy relationships (parent, children, siblings)
- Execution timeline (start time, duration, elapsed)
- Results and outputs from ancestor workflows
- State snapshots from decision points
- Event history and logs
- Cache status and hit rates

**What Agents Should NEVER See:**
- Internal implementation details
- Memory pointers or internal node references
- Credentials or secrets in ancestor state
- Private parent workflow configurations
- Sibling workflow inputs (only outputs)
- System-level performance metrics
- Other tenant's data (multi-tenant systems)

### Security Boundaries - Read-Only Access Pattern

Implement introspection as **read-only query tools** with these protections:

```typescript
interface WorkflowIntrospectionRequest {
  // Which node to query
  node_id: string;

  // What information is requested
  query_type: 'hierarchy' | 'outputs' | 'state' | 'events';

  // Explicit data inclusion flags (deny-by-default)
  include_outputs?: boolean;
  include_state_snapshots?: boolean;
  include_event_history?: boolean;
  include_cache_status?: boolean;

  // Scope limitations
  max_ancestry_depth?: number;      // Limit how far up tree we traverse
  max_results?: number;             // Limit result set size
  time_range_start?: number;        // Prevent excessive historical queries
  time_range_end?: number;
}

interface WorkflowIntrospectionResponse {
  // What was queried
  request_id: string;

  // Results (filtered by permissions)
  data: {
    hierarchy?: HierarchyData;
    outputs?: OutputData;
    state?: StateData;
    events?: EventData;
  };

  // Metadata for debugging
  execution_time_ms: number;
  results_count: number;
  is_complete: boolean;           // Whether all requested data is included
  truncation_reason?: string;     // Why results might be incomplete
}
```

---

## Security Considerations

### Key Threat Vectors for Agent Introspection

**1. Prompt Injection via Introspection Data**
- Untrusted data in ancestor outputs could inject prompts
- **Mitigation**: Introspection returns structured, validated data only
- Agents cannot execute code embedded in returned state

**2. Information Leakage**
- Agents could read sensitive data from ancestor states
- **Mitigation**:
  - Read-only access only
  - Explicit `include_sensitive_data` flags
  - Audit logging of all introspection queries
  - Secrets never included in state snapshots

**3. Recursive Self-Modification**
- Agent could inspect itself and modify its own execution
- **Mitigation**:
  - Agents cannot read or modify their own prompts
  - Introspection tools return data only, never take actions
  - Self-spawning workflows require explicit approval

**4. Denial of Service via Deep Hierarchy**
- Agents could query very deep trees or large result sets
- **Mitigation**:
  - `max_ancestry_depth` limit (e.g., 10 levels)
  - `max_results` limit (e.g., 1000 items)
  - Pagination for large result sets
  - Query timeout (e.g., 5 second max)

### Design Pattern: Capability Tokens

From AWS Bedrock and Cerbos research, use explicit capabilities:

```typescript
interface AgentCapabilities {
  // Introspection permissions
  can_inspect_hierarchy: boolean;
  can_read_ancestor_outputs: boolean;
  can_read_state_snapshots: boolean;
  can_read_event_history: boolean;

  // Modification permissions
  can_spawn_child_workflows: boolean;
  can_modify_sibling_state: boolean;
  can_spawn_arbitrary_agents: boolean;

  // Resource limits
  max_ancestry_depth: number;
  max_concurrent_children: number;
  max_result_size_bytes: number;
}
```

### Sandboxing Pattern: Container Isolation

From research on multi-agent security:

```typescript
interface AgentSandbox {
  // Execution environment
  container_id: string;
  memory_limit_mb: number;
  cpu_shares: number;
  network_restricted: boolean;

  // Filesystem isolation
  mount_readonly: string[];      // Read-only mounts
  mount_readwrite: string[];     // Writable mounts
  mount_hidden: string[];        // Completely hidden

  // Tool access restrictions
  allowed_tools: string[];       // Whitelist of tools
  forbidden_tools: string[];     // Blacklist of tools

  // Data access controls
  visible_workflow_ids: string[];  // Which workflows this agent can see
  allowed_data_categories: string[]; // PII, secrets, etc.
}
```

---

## Self-Modification Capabilities

### Safe Patterns for Workflow Spawning

Research from LoopStacks, LangGraph, and Google ADK identifies several safe patterns:

**1. Explicit Spawning with Approval**

Agents cannot unilaterally spawn workflows. Instead:

```json
{
  "name": "workflow_spawn_child",
  "description": "Request to spawn a child workflow. Requires explicit configuration and parent approval.",
  "input_schema": {
    "type": "object",
    "properties": {
      "child_workflow_name": {
        "type": "string",
        "description": "Name for the child workflow"
      },
      "workflow_template_id": {
        "type": "string",
        "description": "Pre-approved template to use (REQUIRED - agents cannot define arbitrary workflows)"
      },
      "input_data": {
        "type": "object",
        "description": "Data to pass to child workflow"
      },
      "parallel_execution": {
        "type": "boolean",
        "description": "Whether to run in parallel or sequentially",
        "default": false
      },
      "timeout_seconds": {
        "type": "integer",
        "description": "Maximum execution time",
        "minimum": 1,
        "maximum": 3600
      }
    },
    "required": ["child_workflow_name", "workflow_template_id"]
  }
}
```

**2. Prompt Generation with Validation**

```json
{
  "name": "workflow_generate_dynamic_prompt",
  "description": "Generate a prompt for a child workflow based on current analysis. Generated prompt is validated before execution.",
  "input_schema": {
    "type": "object",
    "properties": {
      "target_workflow_id": {
        "type": "string",
        "description": "Which child workflow to generate prompt for"
      },
      "prompt_template": {
        "type": "string",
        "enum": [
          "data_analysis",
          "validation",
          "transformation",
          "summarization",
          "decision_making"
        ],
        "description": "Template constrains prompt generation"
      },
      "template_variables": {
        "type": "object",
        "description": "Variables to substitute in template"
      },
      "system_context": {
        "type": "string",
        "description": "System-level context to include (optional)"
      }
    },
    "required": ["target_workflow_id", "prompt_template"]
  }
}
```

**3. Safety Limits on Self-Modification**

```typescript
interface WorkflowModificationLimits {
  // Spawning limits
  max_children_per_workflow: number;           // e.g., 5
  max_total_descendants: number;               // e.g., 100
  max_depth: number;                           // e.g., 10 levels

  // Prompt generation limits
  max_prompt_length_chars: number;             // e.g., 5000
  max_dynamic_prompts_per_session: number;     // e.g., 10

  // State modification limits
  can_modify_own_state: boolean;               // false - only read
  can_modify_parent_state: boolean;            // false
  can_modify_sibling_state: boolean;           // false
  can_modify_ancestor_state: boolean;          // false

  // Execution limits
  max_concurrent_child_workflows: number;      // e.g., 3
  max_total_execution_time_seconds: number;    // e.g., 3600
}
```

### Self-Awareness Patterns from Anthropic Research

Anthropic's research on introspection suggests these metacognitive capabilities:

**1. Reflexion Pattern** (Self-Evaluation and Memory)
- After each reasoning-action cycle, agent critiques output
- Stores insights for future reference
- Enables "thinking about thinking"

**2. Chain-of-Thought with Introspection**
- Agent reasons through multiple steps
- At each step, checks own reasoning against hierarchy context
- Can revise based on ancestor examples

**3. Self-Correcting Workflows**
- Agent detects errors via introspection
- Can spawn correction workflows
- Learns which patterns work within organization

---

## Implementation Patterns for Groundswell

### Integration with Existing Groundswell Architecture

Based on analysis of `/src/core/workflow.ts`, `/src/core/agent.ts`, and `/src/core/event-tree.ts`:

**Current Capabilities:**
- `EventTreeHandle` already provides `getAncestors()` and `getChildren()`
- `WorkflowContext` maintains connection to root workflow
- `WorkflowNode` tracks hierarchy relationships
- Event emission is already implemented

**Proposed Introspection Tool Implementation:**

#### 1. WorkflowIntrospectionService

```typescript
// src/core/introspection-service.ts

import type { WorkflowNode, WorkflowEvent } from '../types/index.js';
import type { EventTreeHandle } from '../types/workflow-context.js';

export interface HierarchyInfo {
  current: {
    id: string;
    name: string;
    status: WorkflowStatus;
    started_at: number;
    elapsed_ms: number;
  };
  parent?: {
    id: string;
    name: string;
    status: WorkflowStatus;
    depth: number;
  };
  ancestors: Array<{
    id: string;
    name: string;
    status: WorkflowStatus;
    depth: number;
  }>;
  siblings: Array<{
    id: string;
    name: string;
    status: WorkflowStatus;
  }>;
  hierarchy_depth: number;
  total_siblings: number;
}

export class WorkflowIntrospectionService {
  constructor(
    private eventTree: EventTreeHandle,
    private workflowNode: WorkflowNode
  ) {}

  /**
   * Get full hierarchy information for a node
   */
  inspectHierarchy(nodeId?: string): HierarchyInfo {
    const targetId = nodeId || this.workflowNode.id;
    const node = this.eventTree.getNode(targetId);

    if (!node) {
      throw new Error(`Node not found: ${targetId}`);
    }

    const ancestors = this.eventTree.getAncestors(targetId);
    const parent = ancestors[0];
    const children = this.eventTree.getChildren(parent?.id || '');

    return {
      current: this.extractNodeInfo(node),
      parent: parent ? this.extractNodeInfo(parent) : undefined,
      ancestors: ancestors.map(a => this.extractNodeInfo(a)),
      siblings: children.filter(c => c.id !== targetId),
      hierarchy_depth: ancestors.length,
      total_siblings: children.length - 1
    };
  }

  /**
   * Read outputs from ancestor workflows
   */
  readAncestorOutputs(ancestorId?: string, maxDepth?: number): object {
    const ancestors = this.eventTree.getAncestors(this.workflowNode.id);
    const filtered = maxDepth
      ? ancestors.slice(0, maxDepth)
      : ancestors;

    if (ancestorId) {
      const ancestor = filtered.find(a => a.id === ancestorId);
      if (!ancestor) {
        throw new Error(`Ancestor not found: ${ancestorId}`);
      }
      return this.extractNodeOutput(ancestor);
    }

    return {
      outputs: filtered.map(a => ({
        workflow_id: a.id,
        result: this.extractNodeOutput(a)
      }))
    };
  }

  /**
   * Inspect cache status
   */
  inspectCache(nodeId?: string): object {
    // Implementation would check WorkflowContext cache
    // Return structure matching tool specification above
    return {
      workflow_id: nodeId || this.workflowNode.id,
      cache_status: {
        enabled: true,
        entries: [],
        total_cache_size_bytes: 0,
        cache_hit_rate: 0
      }
    };
  }

  /**
   * Read event history
   */
  readEventHistory(workflowId?: string, eventTypes?: string[], limit = 100): object {
    const targetId = workflowId || this.workflowNode.id;
    const node = this.eventTree.getNode(targetId);

    if (!node) {
      throw new Error(`Node not found: ${targetId}`);
    }

    const events = this.extractEvents(node, eventTypes).slice(0, limit);
    return { events, total_count: events.length };
  }

  // Helper methods
  private extractNodeInfo(node: any): object {
    return {
      id: node.id,
      name: node.name,
      status: node.status || 'unknown',
      depth: this.calculateDepth(node)
    };
  }

  private extractNodeOutput(node: any): object {
    // Extract result data from node
    return node.payload || node.metrics || {};
  }

  private extractEvents(node: any, types?: string[]): WorkflowEvent[] {
    if (!node.events) return [];

    if (types && types.length > 0) {
      return node.events.filter(e => types.includes(e.type));
    }

    return node.events;
  }

  private calculateDepth(node: any): number {
    if (!node.parentId) return 0;
    const parent = this.eventTree.getNode(node.parentId);
    return parent ? 1 + this.calculateDepth(parent) : 1;
  }
}
```

#### 2. Introspection Tools for Agent

```typescript
// src/core/introspection-tools.ts

import type { Tool } from '../types/index.js';
import { WorkflowIntrospectionService } from './introspection-service.js';

export function createIntrospectionTools(
  introspectionService: WorkflowIntrospectionService
): Tool[] {
  return [
    {
      name: 'workflow_inspect_hierarchy',
      description: 'Get the current workflow\'s position in the execution hierarchy, including ancestors, siblings, and depth.',
      input_schema: {
        type: 'object' as const,
        properties: {
          node_id: {
            type: 'string',
            description: 'Workflow node ID. If omitted, uses current workflow context.'
          },
          depth: {
            type: 'string',
            enum: ['current_only', 'parent_only', 'ancestors_only', 'full_tree'],
            description: 'How much of the hierarchy to return',
            default: 'full_tree'
          }
        },
        required: []
      },
      handler: async (input: any) => {
        const hierarchy = introspectionService.inspectHierarchy(input.node_id);

        // Apply depth filter
        if (input.depth === 'current_only') {
          return { current: hierarchy.current };
        } else if (input.depth === 'parent_only') {
          return { current: hierarchy.current, parent: hierarchy.parent };
        } else if (input.depth === 'ancestors_only') {
          return { ancestors: hierarchy.ancestors };
        }

        return hierarchy;
      }
    },

    {
      name: 'workflow_read_ancestor_outputs',
      description: 'Read execution outputs and results from ancestor workflows.',
      input_schema: {
        type: 'object' as const,
        properties: {
          ancestor_id: {
            type: 'string',
            description: 'Specific ancestor workflow ID'
          },
          max_depth: {
            type: 'integer',
            description: 'Only go this many levels up'
          }
        },
        required: []
      },
      handler: async (input: any) => {
        return introspectionService.readAncestorOutputs(input.ancestor_id, input.max_depth);
      }
    },

    {
      name: 'workflow_inspect_cache',
      description: 'Inspect caching status for current or specified workflow.',
      input_schema: {
        type: 'object' as const,
        properties: {
          node_id: {
            type: 'string',
            description: 'Workflow node ID'
          }
        },
        required: []
      },
      handler: async (input: any) => {
        return introspectionService.inspectCache(input.node_id);
      }
    },

    {
      name: 'workflow_read_event_history',
      description: 'Read events from workflow execution tree.',
      input_schema: {
        type: 'object' as const,
        properties: {
          workflow_id: {
            type: 'string',
            description: 'Filter to specific workflow'
          },
          event_types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['stepStart', 'stepEnd', 'toolInvocation', 'error', 'stateSnapshot']
            },
            description: 'Only include these event types'
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of events',
            default: 100
          }
        },
        required: []
      },
      handler: async (input: any) => {
        return introspectionService.readEventHistory(
          input.workflow_id,
          input.event_types,
          input.limit
        );
      }
    }
  ];
}
```

#### 3. Wiring Into WorkflowContext

```typescript
// In createWorkflowContext() function
// src/core/workflow-context.ts

import { WorkflowIntrospectionService } from './introspection-service.js';
import { createIntrospectionTools } from './introspection-tools.js';

export function createWorkflowContext(workflow, parentId?, enableReflection?) {
  // ... existing code ...

  // Create introspection service
  const introspectionService = new WorkflowIntrospectionService(
    eventTree,
    workflow.getNode()
  );

  // Create introspection tools
  const introspectionTools = createIntrospectionTools(introspectionService);

  // Add to agent config
  const agentConfig = {
    ...existingConfig,
    tools: [...(existingConfig.tools || []), ...introspectionTools]
  };

  return {
    // ... existing context properties ...
    introspectionService,
    getIntrospectionTools: () => introspectionTools
  };
}
```

---

## Best Practices Summary

### For Tool Design

1. **Explicit Over Implicit**: Require agents to explicitly request sensitive data
2. **Structured Schemas**: Use strict JSON schemas to prevent injection
3. **Clear Names**: Tool names should be immediately understandable
4. **Comprehensive Descriptions**: Include examples in descriptions
5. **Error Messages**: Return detailed, actionable error messages

### For Hierarchy Inspection

1. **Read-Only Access**: Introspection tools never modify state
2. **Depth Limits**: Prevent unbounded tree traversal
3. **Result Limits**: Cap result set sizes
4. **Time Limits**: Implement query timeouts
5. **Audit Logging**: Log all introspection queries

### For Self-Modification

1. **Approval Required**: No unilateral workflow spawning
2. **Template-Based**: Agents use pre-approved templates
3. **Prompt Validation**: Generated prompts are validated before execution
4. **Resource Limits**: Cap concurrent children, depth, total descendants
5. **Capability Tokens**: Explicitly grant permissions

### For Security

1. **Sandboxing**: Run agents in isolated containers
2. **Least Privilege**: Start read-only, grant permissions as needed
3. **Secrets Protection**: Never include credentials in introspection data
4. **Tenant Isolation**: Agents only see their own workflow tree
5. **Network Restrictions**: Isolate tool execution from host network

---

## References

### Key Research Sources

- **Anthropic Introspection Research**: [Emergent introspective awareness in large language models](https://www.anthropic.com/research/introspection)
- **Anthropic Tool Use Docs**: [Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- **Claude Agent SDK**: [Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- **Model Context Protocol**: [Tools - MCP Specification](https://modelcontextprotocol.io/docs/concepts/tools)
- **Multi-Agent Security**: [Securing Agentic AI: authorization patterns](https://dev.to/siddhantkcode/securing-agentic-ai-authorization-patterns-for-autonomous-systems-3ajo)
- **Prompt Injection Defense**: [Design Patterns for Securing LLM Agents against Prompt Injection](https://arxiv.org/abs/2506.08837)
- **Hierarchical Multi-Agent Systems**: [A Taxonomy of Hierarchical Multi-Agent Systems](https://arxiv.org/html/2508.12683)
- **LangGraph Workflows**: [Workflows and agents - LangChain Documentation](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- **Google ADK Safety**: [Safety and Security for AI Agents - Agent Development Kit](https://google.github.io/adk-docs/safety/)


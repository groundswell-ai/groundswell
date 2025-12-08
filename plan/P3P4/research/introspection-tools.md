# Agent Introspection Tools Research

## Overview (PRD Section 11)

Standard tools that allow agents to inspect and manipulate their position in the workflow hierarchy.

## Tool Definitions (Anthropic Tool Format)

### 1. inspect_current_node

```typescript
const inspectCurrentNode: Tool = {
  name: 'inspect_current_node',
  description: 'Get information about the current workflow node including ID, name, status, and parent reference',
  input_schema: {
    type: 'object',
    properties: {},
    required: []
  }
};

// Handler returns:
interface CurrentNodeInfo {
  id: string;
  name: string;
  status: WorkflowStatus;
  parentId?: string;
  parentName?: string;
  childCount: number;
  depth: number;
}
```

### 2. read_ancestor_chain

```typescript
const readAncestorChain: Tool = {
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

// Handler returns:
interface AncestorInfo {
  ancestors: Array<{
    id: string;
    name: string;
    status: WorkflowStatus;
    depth: number;
  }>;
  totalDepth: number;
}
```

### 3. list_siblings_children

```typescript
const listSiblingsChildren: Tool = {
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
```

### 4. inspect_prior_outputs

```typescript
const inspectPriorOutputs: Tool = {
  name: 'inspect_prior_outputs',
  description: 'Get outputs from prior steps or prompt executions',
  input_schema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Specific node ID to inspect (default: most recent)'
      },
      count: {
        type: 'number',
        description: 'Number of prior outputs to return (default: 1)'
      }
    },
    required: []
  }
};
```

### 5. inspect_cache_status

```typescript
const inspectCacheStatus: Tool = {
  name: 'inspect_cache_status',
  description: 'Check if a prompt response is cached',
  input_schema: {
    type: 'object',
    properties: {
      promptHash: {
        type: 'string',
        description: 'Hash of the prompt to check'
      }
    },
    required: ['promptHash']
  }
};
```

### 6. request_spawn_workflow

```typescript
const requestSpawnWorkflow: Tool = {
  name: 'request_spawn_workflow',
  description: 'Request to spawn a new child workflow dynamically',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the new workflow'
      },
      description: {
        type: 'string',
        description: 'Description of what the workflow should do'
      }
    },
    required: ['name', 'description']
  }
};
```

## Security Considerations

1. **Read-only by default**: Most introspection tools should be read-only
2. **Sanitize sensitive data**: Remove API keys, credentials from output
3. **Limit spawning**: request_spawn_workflow should have rate limits
4. **Depth limits**: Prevent infinite recursion in hierarchy traversal

## Tool Bundle Export

```typescript
export const INTROSPECTION_TOOLS: Tool[] = [
  inspectCurrentNode,
  readAncestorChain,
  listSiblingsChildren,
  inspectPriorOutputs,
  inspectCacheStatus,
  requestSpawnWorkflow
];
```

## Usage Example

```typescript
const agent = new Agent({
  name: 'IntrospectiveAgent',
  tools: [...INTROSPECTION_TOOLS, ...customTools],
  system: 'You can inspect your position in the workflow hierarchy using the introspection tools.'
});
```

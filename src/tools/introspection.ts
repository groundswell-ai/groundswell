/**
 * Introspection Tools - Standard tools for agents to inspect their workflow hierarchy
 *
 * These tools allow agents to understand their position in the workflow tree,
 * access prior outputs, check cache status, and request dynamic workflow spawning.
 */

import type { Tool, WorkflowStatus, WorkflowNode } from '../types/index.js';
import { getExecutionContext } from '../core/context.js';
import { defaultCache } from '../cache/index.js';

/**
 * Information about the current workflow node
 */
export interface CurrentNodeInfo {
  id: string;
  name: string;
  status: WorkflowStatus;
  parentId?: string;
  parentName?: string;
  childCount: number;
  depth: number;
}

/**
 * Information about an ancestor node
 */
export interface AncestorInfo {
  id: string;
  name: string;
  status: WorkflowStatus;
  depth: number;
}

/**
 * Result from reading ancestor chain
 */
export interface AncestorChainResult {
  ancestors: AncestorInfo[];
  totalDepth: number;
}

/**
 * Information about a sibling or child node
 */
export interface NodeInfo {
  id: string;
  name: string;
  status: WorkflowStatus;
}

/**
 * Result from listing siblings or children
 */
export interface SiblingsChildrenResult {
  nodes: NodeInfo[];
  type: 'siblings' | 'children';
}

/**
 * Information about a prior output
 */
export interface PriorOutputInfo {
  nodeId: string;
  nodeName: string;
  status: WorkflowStatus;
  events: unknown[];
}

/**
 * Result from cache status check
 */
export interface CacheStatusResult {
  exists: boolean;
  key: string;
}

/**
 * Request to spawn a workflow
 */
export interface SpawnWorkflowRequest {
  name: string;
  description: string;
  requestId: string;
  status: 'pending';
}

// ============================================================================
// Tool Definitions (Anthropic Tool format)
// ============================================================================

/**
 * Tool: inspect_current_node
 * Returns information about the current workflow node
 */
export const inspectCurrentNodeTool: Tool = {
  name: 'inspect_current_node',
  description:
    'Get information about the current workflow node including ID, name, status, and parent reference',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

/**
 * Tool: read_ancestor_chain
 * Returns all ancestor nodes from current position up to root
 */
export const readAncestorChainTool: Tool = {
  name: 'read_ancestor_chain',
  description: 'Get all ancestor nodes from current position up to the root workflow',
  input_schema: {
    type: 'object' as const,
    properties: {
      maxDepth: {
        type: 'number',
        description: 'Maximum ancestors to return (default: all)',
      },
    },
    required: [],
  },
};

/**
 * Tool: list_siblings_children
 * Returns sibling or child nodes relative to current position
 */
export const listSiblingsChildrenTool: Tool = {
  name: 'list_siblings_children',
  description: 'List sibling or child nodes relative to current position',
  input_schema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['siblings', 'children'],
        description: 'Type of nodes to list',
      },
    },
    required: ['type'],
  },
};

/**
 * Tool: inspect_prior_outputs
 * Returns outputs from prior steps or prompt executions
 */
export const inspectPriorOutputsTool: Tool = {
  name: 'inspect_prior_outputs',
  description: 'Get outputs from prior steps or prompt executions',
  input_schema: {
    type: 'object' as const,
    properties: {
      nodeId: {
        type: 'string',
        description: 'Specific node ID to inspect (default: most recent)',
      },
      count: {
        type: 'number',
        description: 'Number of prior outputs to return (default: 1)',
      },
    },
    required: [],
  },
};

/**
 * Tool: inspect_cache_status
 * Checks if a prompt response is cached
 */
export const inspectCacheStatusTool: Tool = {
  name: 'inspect_cache_status',
  description: 'Check if a prompt response is cached',
  input_schema: {
    type: 'object' as const,
    properties: {
      promptHash: {
        type: 'string',
        description: 'Hash of the prompt to check',
      },
    },
    required: ['promptHash'],
  },
};

/**
 * Tool: request_spawn_workflow
 * Requests to spawn a new child workflow dynamically
 */
export const requestSpawnWorkflowTool: Tool = {
  name: 'request_spawn_workflow',
  description: 'Request to spawn a new child workflow dynamically',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Name for the new workflow',
      },
      description: {
        type: 'string',
        description: 'Description of what the workflow should do',
      },
    },
    required: ['name', 'description'],
  },
};

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Calculate depth of a node in the tree
 */
function calculateDepth(node: WorkflowNode): number {
  let depth = 0;
  let current = node.parent;
  while (current) {
    depth++;
    current = current.parent;
  }
  return depth;
}

/**
 * Handler for inspect_current_node
 */
export async function handleInspectCurrentNode(): Promise<CurrentNodeInfo> {
  const ctx = getExecutionContext();
  if (!ctx) {
    throw new Error('Not in workflow context - cannot inspect current node');
  }

  const node = ctx.workflowNode;
  const depth = calculateDepth(node);

  return {
    id: node.id,
    name: node.name,
    status: node.status,
    parentId: node.parent?.id,
    parentName: node.parent?.name,
    childCount: node.children.length,
    depth,
  };
}

/**
 * Handler for read_ancestor_chain
 */
export async function handleReadAncestorChain(input: {
  maxDepth?: number;
}): Promise<AncestorChainResult> {
  const ctx = getExecutionContext();
  if (!ctx) {
    throw new Error('Not in workflow context - cannot read ancestor chain');
  }

  const ancestors: AncestorInfo[] = [];
  let current = ctx.workflowNode.parent;
  let depth = 1;
  const maxDepth = input.maxDepth ?? Infinity;

  while (current && depth <= maxDepth) {
    ancestors.push({
      id: current.id,
      name: current.name,
      status: current.status,
      depth,
    });
    current = current.parent;
    depth++;
  }

  return {
    ancestors,
    totalDepth: calculateDepth(ctx.workflowNode),
  };
}

/**
 * Handler for list_siblings_children
 */
export async function handleListSiblingsChildren(input: {
  type: 'siblings' | 'children';
}): Promise<SiblingsChildrenResult> {
  const ctx = getExecutionContext();
  if (!ctx) {
    throw new Error('Not in workflow context - cannot list siblings/children');
  }

  const node = ctx.workflowNode;
  let nodes: WorkflowNode[];

  if (input.type === 'children') {
    nodes = node.children;
  } else {
    // Get siblings (other children of parent, excluding self)
    nodes = node.parent?.children.filter((n) => n.id !== node.id) ?? [];
  }

  return {
    type: input.type,
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      status: n.status,
    })),
  };
}

/**
 * Handler for inspect_prior_outputs
 */
export async function handleInspectPriorOutputs(input: {
  nodeId?: string;
  count?: number;
}): Promise<PriorOutputInfo[]> {
  const ctx = getExecutionContext();
  if (!ctx) {
    throw new Error('Not in workflow context - cannot inspect prior outputs');
  }

  const count = input.count ?? 1;
  const node = ctx.workflowNode;

  // Get completed children nodes
  const completedNodes = node.parent?.children
    .filter((n) => n.status === 'completed' && n.id !== node.id)
    .slice(-count) ?? [];

  // If specific nodeId requested, filter to just that
  if (input.nodeId) {
    const specific = completedNodes.find((n) => n.id === input.nodeId);
    if (!specific) {
      return [];
    }
    return [
      {
        nodeId: specific.id,
        nodeName: specific.name,
        status: specific.status,
        events: specific.events,
      },
    ];
  }

  return completedNodes.map((n) => ({
    nodeId: n.id,
    nodeName: n.name,
    status: n.status,
    events: n.events,
  }));
}

/**
 * Handler for inspect_cache_status
 */
export async function handleInspectCacheStatus(input: {
  promptHash: string;
}): Promise<CacheStatusResult> {
  const exists = defaultCache.has(input.promptHash);

  return {
    exists,
    key: input.promptHash,
  };
}

/**
 * Handler for request_spawn_workflow
 * Note: This creates a spawn request that must be handled by the workflow orchestrator
 */
export async function handleRequestSpawnWorkflow(input: {
  name: string;
  description: string;
}): Promise<SpawnWorkflowRequest> {
  const ctx = getExecutionContext();
  if (!ctx) {
    throw new Error('Not in workflow context - cannot request spawn');
  }

  // Create a spawn request ID
  const requestId = `spawn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Return the request - actual spawning is handled by the orchestrator
  return {
    name: input.name,
    description: input.description,
    requestId,
    status: 'pending',
  };
}

// ============================================================================
// Tool Bundle and Registration
// ============================================================================

/**
 * All introspection tools bundled together
 */
export const INTROSPECTION_TOOLS: Tool[] = [
  inspectCurrentNodeTool,
  readAncestorChainTool,
  listSiblingsChildrenTool,
  inspectPriorOutputsTool,
  inspectCacheStatusTool,
  requestSpawnWorkflowTool,
];

/**
 * Map of tool names to handlers
 */
export const INTROSPECTION_HANDLERS: Record<
  string,
  (input: unknown) => Promise<unknown>
> = {
  inspect_current_node: handleInspectCurrentNode,
  read_ancestor_chain: handleReadAncestorChain as (input: unknown) => Promise<unknown>,
  list_siblings_children: handleListSiblingsChildren as (
    input: unknown
  ) => Promise<unknown>,
  inspect_prior_outputs: handleInspectPriorOutputs as (
    input: unknown
  ) => Promise<unknown>,
  inspect_cache_status: handleInspectCacheStatus as (
    input: unknown
  ) => Promise<unknown>,
  request_spawn_workflow: handleRequestSpawnWorkflow as (
    input: unknown
  ) => Promise<unknown>,
};

/**
 * Register all introspection tools with an MCP handler
 * @param handler MCP handler to register tools with
 */
export function registerIntrospectionTools(handler: {
  registerTool(name: string, executor: (input: unknown) => Promise<unknown>): void;
}): void {
  for (const [name, executor] of Object.entries(INTROSPECTION_HANDLERS)) {
    handler.registerTool(name, executor);
  }
}

/**
 * Execute an introspection tool by name
 * @param toolName Name of the tool to execute
 * @param input Tool input
 * @returns Tool result
 */
export async function executeIntrospectionTool(
  toolName: string,
  input: unknown
): Promise<unknown> {
  const handler = INTROSPECTION_HANDLERS[toolName];
  if (!handler) {
    throw new Error(`Unknown introspection tool: ${toolName}`);
  }
  return handler(input);
}

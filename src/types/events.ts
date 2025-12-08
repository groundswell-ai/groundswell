import type { WorkflowNode } from './workflow.js';
import type { WorkflowError } from './error.js';
import type { TokenUsage } from './sdk-primitives.js';

/**
 * Discriminated union of all workflow events
 */
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  // Agent/Prompt events
  | {
      type: 'agentPromptStart';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
    }
  | {
      type: 'agentPromptEnd';
      agentId: string;
      agentName: string;
      promptId: string;
      node: WorkflowNode;
      duration: number;
      tokenUsage?: TokenUsage;
    }
  // Tool events
  | {
      type: 'toolInvocation';
      toolName: string;
      input: unknown;
      output: unknown;
      duration: number;
      node: WorkflowNode;
    }
  // MCP events
  | {
      type: 'mcpEvent';
      serverName: string;
      event: string;
      payload?: unknown;
      node: WorkflowNode;
    }
  // Reflection events
  | {
      type: 'reflectionStart';
      level: 'workflow' | 'agent' | 'prompt';
      node: WorkflowNode;
    }
  | {
      type: 'reflectionEnd';
      level: 'workflow' | 'agent' | 'prompt';
      success: boolean;
      node: WorkflowNode;
    }
  // Cache events
  | {
      type: 'cacheHit';
      key: string;
      node: WorkflowNode;
    }
  | {
      type: 'cacheMiss';
      key: string;
      node: WorkflowNode;
    };

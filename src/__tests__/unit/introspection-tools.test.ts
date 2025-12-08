/**
 * Unit tests for introspection tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  INTROSPECTION_TOOLS,
  handleInspectCurrentNode,
  handleReadAncestorChain,
  handleListSiblingsChildren,
  handleInspectPriorOutputs,
  handleInspectCacheStatus,
  handleRequestSpawnWorkflow,
  executeIntrospectionTool,
} from '../../tools/introspection.js';
import { runInContext, type AgentExecutionContext } from '../../core/context.js';
import type { WorkflowNode } from '../../types/index.js';
import { defaultCache } from '../../cache/cache.js';

describe('Introspection Tools', () => {
  describe('INTROSPECTION_TOOLS', () => {
    it('should export 6 tools', () => {
      expect(INTROSPECTION_TOOLS).toHaveLength(6);
    });

    it('should have valid tool definitions', () => {
      for (const tool of INTROSPECTION_TOOLS) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.input_schema).toBeDefined();
        expect(tool.input_schema.type).toBe('object');
      }
    });

    it('should include all expected tool names', () => {
      const names = INTROSPECTION_TOOLS.map((t) => t.name);
      expect(names).toContain('inspect_current_node');
      expect(names).toContain('read_ancestor_chain');
      expect(names).toContain('list_siblings_children');
      expect(names).toContain('inspect_prior_outputs');
      expect(names).toContain('inspect_cache_status');
      expect(names).toContain('request_spawn_workflow');
    });
  });

  describe('handlers', () => {
    const createTestNode = (
      id: string,
      name: string,
      parent: WorkflowNode | null = null
    ): WorkflowNode => ({
      id,
      name,
      parent,
      children: [],
      status: 'running',
      logs: [],
      events: [],
      stateSnapshot: null,
    });

    const createContext = (node: WorkflowNode): AgentExecutionContext => ({
      workflowNode: node,
      emitEvent: () => {},
      workflowId: 'test-workflow',
    });

    describe('handleInspectCurrentNode', () => {
      it('should throw when not in workflow context', async () => {
        await expect(handleInspectCurrentNode()).rejects.toThrow(
          'Not in workflow context'
        );
      });

      it('should return current node info', async () => {
        const parent = createTestNode('parent-1', 'Parent');
        const node = createTestNode('child-1', 'Child', parent);
        parent.children.push(node);

        const result = await runInContext(createContext(node), () =>
          handleInspectCurrentNode()
        );

        expect(result.id).toBe('child-1');
        expect(result.name).toBe('Child');
        expect(result.status).toBe('running');
        expect(result.parentId).toBe('parent-1');
        expect(result.parentName).toBe('Parent');
        expect(result.depth).toBe(1);
      });

      it('should handle root node (no parent)', async () => {
        const node = createTestNode('root-1', 'Root');

        const result = await runInContext(createContext(node), () =>
          handleInspectCurrentNode()
        );

        expect(result.parentId).toBeUndefined();
        expect(result.depth).toBe(0);
      });
    });

    describe('handleReadAncestorChain', () => {
      it('should throw when not in workflow context', async () => {
        await expect(handleReadAncestorChain({})).rejects.toThrow(
          'Not in workflow context'
        );
      });

      it('should return ancestor chain', async () => {
        const root = createTestNode('root-1', 'Root');
        const parent = createTestNode('parent-1', 'Parent', root);
        root.children.push(parent);
        const child = createTestNode('child-1', 'Child', parent);
        parent.children.push(child);

        const result = await runInContext(createContext(child), () =>
          handleReadAncestorChain({})
        );

        expect(result.ancestors).toHaveLength(2);
        expect(result.ancestors[0].id).toBe('parent-1');
        expect(result.ancestors[1].id).toBe('root-1');
        expect(result.totalDepth).toBe(2);
      });

      it('should respect maxDepth limit', async () => {
        const root = createTestNode('root-1', 'Root');
        const parent = createTestNode('parent-1', 'Parent', root);
        root.children.push(parent);
        const child = createTestNode('child-1', 'Child', parent);
        parent.children.push(child);

        const result = await runInContext(createContext(child), () =>
          handleReadAncestorChain({ maxDepth: 1 })
        );

        expect(result.ancestors).toHaveLength(1);
        expect(result.ancestors[0].id).toBe('parent-1');
      });
    });

    describe('handleListSiblingsChildren', () => {
      it('should throw when not in workflow context', async () => {
        await expect(
          handleListSiblingsChildren({ type: 'children' })
        ).rejects.toThrow('Not in workflow context');
      });

      it('should return children', async () => {
        const parent = createTestNode('parent-1', 'Parent');
        const child1 = createTestNode('child-1', 'Child 1', parent);
        const child2 = createTestNode('child-2', 'Child 2', parent);
        parent.children.push(child1, child2);

        const result = await runInContext(createContext(parent), () =>
          handleListSiblingsChildren({ type: 'children' })
        );

        expect(result.type).toBe('children');
        expect(result.nodes).toHaveLength(2);
      });

      it('should return siblings (excluding self)', async () => {
        const parent = createTestNode('parent-1', 'Parent');
        const child1 = createTestNode('child-1', 'Child 1', parent);
        const child2 = createTestNode('child-2', 'Child 2', parent);
        parent.children.push(child1, child2);

        const result = await runInContext(createContext(child1), () =>
          handleListSiblingsChildren({ type: 'siblings' })
        );

        expect(result.type).toBe('siblings');
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].id).toBe('child-2');
      });
    });

    describe('handleInspectPriorOutputs', () => {
      it('should throw when not in workflow context', async () => {
        await expect(handleInspectPriorOutputs({})).rejects.toThrow(
          'Not in workflow context'
        );
      });

      it('should return completed sibling outputs', async () => {
        const parent = createTestNode('parent-1', 'Parent');
        const completed = createTestNode('completed-1', 'Completed', parent);
        completed.status = 'completed';
        // Add a valid workflow event for testing
        completed.events.push({
          type: 'stepEnd',
          node: completed,
          step: 'test-step',
          duration: 100,
        } as never); // Cast to avoid strict type checking in tests
        const current = createTestNode('current-1', 'Current', parent);
        parent.children.push(completed, current);

        const result = await runInContext(createContext(current), () =>
          handleInspectPriorOutputs({})
        );

        expect(result).toHaveLength(1);
        expect(result[0].nodeId).toBe('completed-1');
        expect(result[0].status).toBe('completed');
      });
    });

    describe('handleInspectCacheStatus', () => {
      beforeEach(async () => {
        await defaultCache.clear();
      });

      it('should return false for missing cache key', async () => {
        const result = await handleInspectCacheStatus({
          promptHash: 'nonexistent-key',
        });

        expect(result.exists).toBe(false);
        expect(result.key).toBe('nonexistent-key');
      });

      it('should return true for existing cache key', async () => {
        await defaultCache.set('test-key', { data: 'test' });

        const result = await handleInspectCacheStatus({ promptHash: 'test-key' });

        expect(result.exists).toBe(true);
      });
    });

    describe('handleRequestSpawnWorkflow', () => {
      it('should throw when not in workflow context', async () => {
        await expect(
          handleRequestSpawnWorkflow({ name: 'Test', description: 'Test workflow' })
        ).rejects.toThrow('Not in workflow context');
      });

      it('should return spawn request', async () => {
        const node = createTestNode('node-1', 'Node');

        const result = await runInContext(createContext(node), () =>
          handleRequestSpawnWorkflow({
            name: 'NewWorkflow',
            description: 'A new workflow',
          })
        );

        expect(result.name).toBe('NewWorkflow');
        expect(result.description).toBe('A new workflow');
        expect(result.requestId).toMatch(/^spawn-/);
        expect(result.status).toBe('pending');
      });
    });
  });

  describe('executeIntrospectionTool', () => {
    it('should execute tool by name', async () => {
      await defaultCache.set('cache-test', 'value');

      const result = await executeIntrospectionTool('inspect_cache_status', {
        promptHash: 'cache-test',
      });

      expect(result).toMatchObject({ exists: true, key: 'cache-test' });
    });

    it('should throw for unknown tool', async () => {
      await expect(
        executeIntrospectionTool('unknown_tool', {})
      ).rejects.toThrow('Unknown introspection tool');
    });
  });
});

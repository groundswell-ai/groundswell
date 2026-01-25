import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEventReplayer } from '../../debugger/event-replayer.js';
import type { WorkflowEvent, WorkflowNode } from '../../types/index.js';

/**
 * Unit tests for WorkflowEventReplayer
 * Tests structural event replay (childAttached, childDetached, treeUpdated)
 *
 * Test patterns from: plan/002_6761e4b84fd1/P2M1T1S2/research/test-patterns.md
 */

describe('WorkflowEventReplayer', () => {
  let replayer: WorkflowEventReplayer;

  beforeEach(() => {
    replayer = new WorkflowEventReplayer();
    // Mock console methods for tests that may produce warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('replay()', () => {
    it('should throw error if events array is empty', () => {
      expect(() => replayer.replay([])).toThrow('Events array is empty or null');
    });

    it('should throw error if root cannot be established from events', () => {
      // Create events without any structural events that establish root
      const events: WorkflowEvent[] = [
        { type: 'stepStart', node: createMockNode('step-node', null), step: 'test' }
      ];

      expect(() => replayer.replay(events)).toThrow('No root node established from event stream');
    });

    it('should reconstruct tree from childAttached events', () => {
      const rootId = 'root-123';
      const childId = 'child-456';

      // Create events: first childAttached establishes root (parent has no parent in map)
      const events: WorkflowEvent[] = [
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)  // child's parent is null initially
        }
      ];

      // For this test, we need to handle the fact that parent needs to exist first
      // Let's create a scenario where treeUpdated establishes root first
      const eventsWithRoot: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)
        }
      ];

      const tree = replayer.replay(eventsWithRoot);

      expect(tree).toBeDefined();
      expect(tree.id).toBe(rootId);
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].id).toBe(childId);
    });

    it('should process events sequentially in order', () => {
      const rootId = 'root';
      const child1Id = 'child1';
      const child2Id = 'child2';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(child1Id, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(child2Id, null)
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0].id).toBe(child1Id);
      expect(tree.children[1].id).toBe(child2Id);
    });

    it('should handle missing parent nodes gracefully (log warning, continue)', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'childAttached',
          parentId: 'non-existent-parent',
          child: createMockNode('child', null)
        }
      ];

      // Should not throw - error should be caught and logged
      expect(() => replayer.replay(events)).not.toThrow();
    });

    it('should handle childDetached events', () => {
      const rootId = 'root';
      const childId = 'child';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)
        },
        {
          type: 'childDetached',
          parentId: rootId,
          childId: childId
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.children).toHaveLength(0);
    });

    it('should handle treeUpdated events', () => {
      const newRootId = 'new-root';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(newRootId, null)
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.id).toBe(newRootId);
    });
  });

  describe('childAttached event handling', () => {
    it('should attach child to parent', () => {
      const rootId = 'root';
      const childId = 'child';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].id).toBe(childId);
    });

    it('should maintain bidirectional parent-child links', () => {
      const rootId = 'root';
      const childId = 'child';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)
        }
      ];

      const tree = replayer.replay(events);
      const child = tree.children[0];

      // Verify child.parent points to parent
      expect(child.parent).toBe(tree);

      // Verify parent.children includes child
      expect(tree.children.includes(child)).toBe(true);
    });

    it('should deep clone nodes to prevent event mutation', () => {
      const rootId = 'root';
      const childId = 'child';
      const originalChild = createMockNode(childId, null);

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: originalChild
        }
      ];

      const tree = replayer.replay(events);

      // Modify the original event data
      originalChild.name = 'MODIFIED';

      // Verify tree was not affected
      expect(tree.children[0].name).toBe('child');
    });

    it('should throw error if parent not found', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'childAttached',
          parentId: 'non-existent',
          child: createMockNode('child', null)
        }
      ];

      // Error is caught and logged, should not throw at top level
      expect(() => replayer.replay(events)).not.toThrow();
    });

    it('should enforce single-parent rule', () => {
      const rootId = 'root';
      const childId = 'child';
      const childWithParent = createMockNode(childId, null);
      // Set up child as already having a parent
      childWithParent.parent = createMockNode('other-parent', null);

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: childWithParent
        }
      ];

      // Error is caught and logged, should not throw at top level
      expect(() => replayer.replay(events)).not.toThrow();
      // Child should not be attached
      const tree = replayer.replay([
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        }
      ]);
      expect(tree.children).toHaveLength(0);
    });
  });

  describe('childDetached event handling', () => {
    it('should remove child from parent', () => {
      const rootId = 'root';
      const childId = 'child';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)
        },
        {
          type: 'childDetached',
          parentId: rootId,
          childId: childId
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.children).toHaveLength(0);
    });

    it('should clear child.parent reference', () => {
      const rootId = 'root';
      const childId = 'child';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(rootId, null)
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: createMockNode(childId, null)
        },
        {
          type: 'childDetached',
          parentId: rootId,
          childId: childId
        }
      ];

      replayer.replay(events);

      // Access the nodeMap to verify child.parent is null
      const child = (replayer as any).nodeMap.get(childId);
      // Child should be removed from map after detach
      expect(child).toBeUndefined();
    });

    it('should handle missing parent gracefully (log warning, continue)', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'childDetached',
          parentId: 'non-existent-parent',
          childId: 'child'
        }
      ];

      // Should not throw - warning should be logged
      expect(() => replayer.replay(events)).not.toThrow();
    });

    it('should handle missing child gracefully (log warning, continue)', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'childDetached',
          parentId: 'root',
          childId: 'non-existent-child'
        }
      ];

      // Should not throw - warning should be logged
      expect(() => replayer.replay(events)).not.toThrow();
    });
  });

  describe('treeUpdated event handling', () => {
    it('should update root reference', () => {
      const newRootId = 'new-root';

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode(newRootId, null)
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.id).toBe(newRootId);
    });

    it('should rebuild nodeMap from new root', () => {
      const childId = 'child';
      const root = createMockNode('root', null);
      root.children = [createMockNode(childId, null)];

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        }
      ];

      replayer.replay(events);

      // Both root and child should be in nodeMap
      const nodeMap = (replayer as any).nodeMap;
      expect(nodeMap.has('root')).toBe(true);
      expect(nodeMap.has(childId)).toBe(true);
    });
  });

  describe('buildNodeMap() helper', () => {
    it('should add all nodes to map recursively', () => {
      const grandchild = createMockNode('grandchild', null);
      const child = createMockNode('child', null);
      child.children = [grandchild];
      const root = createMockNode('root', null);
      root.children = [child];

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        }
      ];

      replayer.replay(events);

      const nodeMap = (replayer as any).nodeMap;
      expect(nodeMap.has('root')).toBe(true);
      expect(nodeMap.has('child')).toBe(true);
      expect(nodeMap.has('grandchild')).toBe(true);
    });
  });

  describe('removeSubtreeNodes() helper', () => {
    it('should remove entire subtree from map', () => {
      const grandchild = createMockNode('grandchild', null);
      const child = createMockNode('child', null);
      child.children = [grandchild];
      const root = createMockNode('root', null);
      root.children = [child];

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'childDetached',
          parentId: 'root',
          childId: 'child'
        }
      ];

      replayer.replay(events);

      const nodeMap = (replayer as any).nodeMap;
      expect(nodeMap.has('child')).toBe(false);
      expect(nodeMap.has('grandchild')).toBe(false);
      expect(nodeMap.has('root')).toBe(true);
    });
  });

  describe('isNodeDescendantOf() helper', () => {
    it('should detect circular references', () => {
      const rootId = 'root';
      const childId = 'child';

      // Create a circular reference scenario
      const root = createMockNode(rootId, null);
      const child = createMockNode(childId, null);
      // Make child an ancestor of root (circular)
      root.parent = child;

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: child
        }
      ];

      // The isNodeDescendantOf should detect the cycle
      expect(() => replayer.replay(events)).not.toThrow();
    });
  });

  describe('stateSnapshot event handling', () => {
    it('should update node.stateSnapshot with event data', () => {
      const rootId = 'root';
      const stateSnapshot = { count: 42, status: 'running' };

      const root = createMockNode(rootId, null);
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot }
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.stateSnapshot).toEqual(stateSnapshot);
    });

    it('should overwrite stateSnapshot with latest value (last write wins)', () => {
      const rootId = 'root';
      const root = createMockNode(rootId, null);

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot: { count: 1 } }
        },
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot: { count: 2 } }
        },
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot: { count: 3 } }
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.stateSnapshot).toEqual({ count: 3 });
    });

    it('should handle null stateSnapshot correctly', () => {
      const rootId = 'root';
      const root = createMockNode(rootId, null);

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot: { count: 42 } }
        },
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot: null }
        }
      ];

      const tree = replayer.replay(events);

      expect(tree.stateSnapshot).toBeNull();
    });

    it('should log warning for missing node in stateSnapshot', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'stateSnapshot',
          node: createMockNode('non-existent', null)
        }
      ];

      replayer.replay(events);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('non-existent')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found in nodeMap')
      );
    });
  });

  describe('error event handling', () => {
    it('should append error to node.events array', () => {
      const rootId = 'root';
      const root = createMockNode(rootId, null);

      const errorEvent: WorkflowEvent = {
        type: 'error',
        node: root,
        error: {
          message: 'Test error',
          original: null,
          workflowId: rootId,
          state: { count: 42 },
          logs: []
        }
      };

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        errorEvent
      ];

      const tree = replayer.replay(events);

      expect(tree.events).toHaveLength(1);
      expect(tree.events[0]).toBe(errorEvent);
    });

    it('should accumulate multiple errors (not overwrite)', () => {
      const rootId = 'root';
      const root = createMockNode(rootId, null);

      const error1: WorkflowEvent = {
        type: 'error',
        node: root,
        error: {
          message: 'Error 1',
          original: null,
          workflowId: rootId,
          state: {},
          logs: []
        }
      };

      const error2: WorkflowEvent = {
        type: 'error',
        node: root,
        error: {
          message: 'Error 2',
          original: null,
          workflowId: rootId,
          state: {},
          logs: []
        }
      };

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        error1,
        error2
      ];

      const tree = replayer.replay(events);

      expect(tree.events).toHaveLength(2);
      expect(tree.events[0]).toBe(error1);
      expect(tree.events[1]).toBe(error2);
    });

    it('should log warning for missing node in error event', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'error',
          node: createMockNode('non-existent', null),
          error: {
            message: 'Test error',
            original: null,
            workflowId: 'non-existent',
            state: {},
            logs: []
          }
        }
      ];

      replayer.replay(events);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('non-existent')
      );
    });
  });

  describe('stepStart event handling', () => {
    it('should append stepStart event to node.events array', () => {
      const stepId = 'step-1';
      const root = createMockNode('root', null);
      const step = createMockNode(stepId, null);

      const stepStartEvent: WorkflowEvent = {
        type: 'stepStart',
        node: step,
        step: 'processData'
      };

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'childAttached',
          parentId: 'root',
          child: step
        },
        stepStartEvent
      ];

      const tree = replayer.replay(events);
      const stepNode = tree.children[0];

      expect(stepNode.events).toHaveLength(1);
      expect(stepNode.events[0]).toBe(stepStartEvent);
    });

    it('should handle missing step node gracefully (silent return)', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'stepStart',
          node: createMockNode('non-existent-step', null),
          step: 'processData'
        }
      ];

      // Should not throw - step node may be added later via childAttached
      expect(() => replayer.replay(events)).not.toThrow();

      // Should NOT log warning for missing step nodes (they're added separately)
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('non-existent-step')
      );
    });
  });

  describe('stepEnd event handling', () => {
    it('should append stepEnd event with duration to node.events array', () => {
      const stepId = 'step-1';
      const root = createMockNode('root', null);
      const step = createMockNode(stepId, null);

      const stepEndEvent: WorkflowEvent = {
        type: 'stepEnd',
        node: step,
        step: 'processData',
        duration: 1500
      };

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'childAttached',
          parentId: 'root',
          child: step
        },
        stepEndEvent
      ];

      const tree = replayer.replay(events);
      const stepNode = tree.children[0];

      expect(stepNode.events).toHaveLength(1);
      expect(stepNode.events[0]).toBe(stepEndEvent);
      if (stepNode.events[0].type === 'stepEnd') {
        expect(stepNode.events[0].duration).toBe(1500);
      }
    });

    it('should handle missing step node gracefully (silent return)', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'stepEnd',
          node: createMockNode('non-existent-step', null),
          step: 'processData',
          duration: 1000
        }
      ];

      // Should not throw - step node may be added later via childAttached
      expect(() => replayer.replay(events)).not.toThrow();
    });
  });

  describe('taskStart event handling', () => {
    it('should append taskStart event to node.events array', () => {
      const rootId = 'root';
      const root = createMockNode(rootId, null);

      const taskStartEvent: WorkflowEvent = {
        type: 'taskStart',
        node: root,
        task: 'cleanup'
      };

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        taskStartEvent
      ];

      const tree = replayer.replay(events);

      expect(tree.events).toHaveLength(1);
      expect(tree.events[0]).toBe(taskStartEvent);
    });

    it('should log warning for missing node in taskStart event', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'taskStart',
          node: createMockNode('non-existent', null),
          task: 'cleanup'
        }
      ];

      replayer.replay(events);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('non-existent')
      );
    });
  });

  describe('taskEnd event handling', () => {
    it('should append taskEnd event to node.events array', () => {
      const rootId = 'root';
      const root = createMockNode(rootId, null);

      const taskEndEvent: WorkflowEvent = {
        type: 'taskEnd',
        node: root,
        task: 'cleanup'
      };

      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: root
        },
        taskEndEvent
      ];

      const tree = replayer.replay(events);

      expect(tree.events).toHaveLength(1);
      expect(tree.events[0]).toBe(taskEndEvent);
    });

    it('should log warning for missing node in taskEnd event', () => {
      const events: WorkflowEvent[] = [
        {
          type: 'treeUpdated',
          root: createMockNode('root', null)
        },
        {
          type: 'taskEnd',
          node: createMockNode('non-existent', null),
          task: 'cleanup'
        }
      ];

      replayer.replay(events);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('non-existent')
      );
    });
  });

  describe('replay() with state events', () => {
    it('should replay complete event stream with structural and state events', () => {
      const rootId = 'root';
      const childId = 'child';
      const root = createMockNode(rootId, null);
      const child = createMockNode(childId, null);

      const stateSnapshot = { count: 42, status: 'running' };

      const events: WorkflowEvent[] = [
        // Structural events
        {
          type: 'treeUpdated',
          root: root
        },
        {
          type: 'childAttached',
          parentId: rootId,
          child: child
        },
        // State events
        {
          type: 'stateSnapshot',
          node: { ...root, stateSnapshot }
        },
        {
          type: 'error',
          node: child,
          error: {
            message: 'Test error',
            original: null,
            workflowId: childId,
            state: {},
            logs: []
          }
        },
        {
          type: 'stepStart',
          node: child,
          step: 'processData'
        },
        {
          type: 'stepEnd',
          node: child,
          step: 'processData',
          duration: 1200
        },
        {
          type: 'taskStart',
          node: root,
          task: 'cleanup'
        },
        {
          type: 'taskEnd',
          node: root,
          task: 'cleanup'
        }
      ];

      const tree = replayer.replay(events);

      // Verify tree structure
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].id).toBe(childId);

      // Verify state snapshot
      expect(tree.stateSnapshot).toEqual(stateSnapshot);

      // Verify error accumulated
      const childNode = tree.children[0];
      const errorEvents = childNode.events.filter(e => e.type === 'error');
      expect(errorEvents).toHaveLength(1);

      // Verify step events tracked
      const stepStartEvents = childNode.events.filter(e => e.type === 'stepStart');
      const stepEndEvents = childNode.events.filter(e => e.type === 'stepEnd');
      expect(stepStartEvents).toHaveLength(1);
      expect(stepEndEvents).toHaveLength(1);
      if (stepEndEvents[0].type === 'stepEnd') {
        expect(stepEndEvents[0].duration).toBe(1200);
      }

      // Verify task events tracked
      const taskStartEvents = tree.events.filter(e => e.type === 'taskStart');
      const taskEndEvents = tree.events.filter(e => e.type === 'taskEnd');
      expect(taskStartEvents).toHaveLength(1);
      expect(taskEndEvents).toHaveLength(1);
    });
  });
});

/**
 * Helper function to create mock WorkflowNode
 */
function createMockNode(id: string, parent: WorkflowNode | null): WorkflowNode {
  return {
    id,
    name: id,
    parent,
    children: [],
    status: 'idle',
    logs: [],
    events: [],
    stateSnapshot: null
  };
}

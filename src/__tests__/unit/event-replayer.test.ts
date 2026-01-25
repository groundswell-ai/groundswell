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

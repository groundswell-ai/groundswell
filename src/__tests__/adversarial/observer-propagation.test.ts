/**
 * PRD Section 7: Observer Propagation Compliance Test
 *
 * Validates that observer propagation works correctly per PRD Section 7 requirements:
 * - Events from deeply nested children bubble up to root observers via getRoot()
 * - After reparenting, events propagate to new root's observer (not old root's)
 * - getRoot() correctly follows parent chain with cycle detection
 * - All observer callbacks (onEvent, onTreeChanged) are invoked
 *
 * Bug Context: The tree integrity bug (child in multiple parents) broke observer
 * propagation because getRoot() only followed child.parent chain. This test validates
 * the fix ensures events route to correct observers.
 *
 * References:
 * - Bug Analysis: plan/docs/bugfix-architecture/bug_analysis.md (lines 60-91)
 * - getRoot() implementation: src/core/workflow.ts (lines 174-189)
 * - getRootObservers() implementation: src/core/workflow.ts (lines 124-139)
 * - emitEvent() implementation: src/core/workflow.ts (lines 313-329)
 */

import { describe, it, expect } from 'vitest';
import {
  Workflow,
  WorkflowObserver,
  WorkflowEvent,
} from '../../index.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/integration/workflow-reparenting.test.ts
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

/**
 * Observer creation helper
 * Pattern from: src/__tests__/integration/workflow-reparenting.test.ts:142-147
 */
const createObserver = (eventsArray: WorkflowEvent[]): WorkflowObserver => ({
  onLog: () => {}, // Empty - not testing logs in this test suite
  onEvent: (e) => eventsArray.push(e), // Capture events for validation
  onStateUpdated: () => {}, // Empty - not testing state updates
  onTreeChanged: () => {}, // Empty - not testing tree changes
});

describe('PRD Section 7: Observer Propagation', () => {
  describe('Event Bubbling: Grandchild to Root Observer', () => {
    it('should propagate events from grandchild to root observer via getRoot()', () => {
      // ============================================================
      // PHASE 1: Setup - Create 3-level tree
      // ============================================================
      // ARRANGE: Create root, child, grandchild hierarchy
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);
      const grandchild = new SimpleWorkflow('Grandchild', child);

      // ============================================================
      // PHASE 2: Add observer to root
      // ============================================================
      // ARRANGE: Create event capture array and observer
      const rootEvents: WorkflowEvent[] = [];
      root.addObserver(createObserver(rootEvents));

      // ============================================================
      // PHASE 3: Emit event from grandchild
      // ============================================================
      // ACT: Clear any construction events, then emit from grandchild
      // PRD Section 7: "Observers attach to root workflow and receive all events"
      rootEvents.length = 0; // Clear any construction events
      grandchild.setStatus('running');

      // ============================================================
      // PHASE 4: Verify root observer received event
      // ============================================================
      // ASSERT: Root observer should receive event via getRoot() traversal
      // getRoot() from grandchild returns root, then root.observers receive event
      const receivedEvent = rootEvents.find((e) => e.type === 'treeUpdated');
      expect(receivedEvent).toBeDefined();

      // Type guard for discriminated union
      if (receivedEvent?.type === 'treeUpdated') {
        expect(receivedEvent.root.id).toBe(root.id);
      }
    });

    it('should propagate events through multiple hierarchy levels', () => {
      // ============================================================
      // Test deeper hierarchy (4+ levels) to verify getRoot() traversal
      // ============================================================
      // ARRANGE: Create 5-level deep hierarchy
      const root = new SimpleWorkflow('Root');
      const level1 = new SimpleWorkflow('L1', root);
      const level2 = new SimpleWorkflow('L2', level1);
      const level3 = new SimpleWorkflow('L3', level2);
      const level4 = new SimpleWorkflow('L4', level3);

      const rootEvents: WorkflowEvent[] = [];
      root.addObserver(createObserver(rootEvents));

      // ACT: Emit event from deepest level
      rootEvents.length = 0;
      level4.setStatus('running');

      // ASSERT: Verify event bubbled through 4 levels to root
      // This validates getRoot() correctly traverses: level4 -> level3 -> level2 -> level1 -> root
      expect(rootEvents.some((e) => e.type === 'treeUpdated')).toBe(true);

      // Verify the event root is the original root workflow
      const treeUpdatedEvent = rootEvents.find((e) => e.type === 'treeUpdated');
      if (treeUpdatedEvent?.type === 'treeUpdated') {
        expect(treeUpdatedEvent.root.id).toBe(root.id);
      }
    });
  });

  describe('Observer Routing After Reparenting', () => {
    it('should route events to new root observer after reparenting', () => {
      // ============================================================
      // PHASE 1: Setup - Create parent1, parent2, grandchild with parent1
      // ============================================================
      // ARRANGE: Create initial tree structure
      const parent1 = new SimpleWorkflow('Parent1');
      const child1 = new SimpleWorkflow('Child1', parent1);
      const grandchild = new SimpleWorkflow('Grandchild', child1);
      const parent2 = new SimpleWorkflow('Parent2');

      // ============================================================
      // PHASE 2: Verify initial propagation to parent1 observer
      // ============================================================
      // ARRANGE: Create observer for parent1
      const parent1Events: WorkflowEvent[] = [];
      parent1.addObserver(createObserver(parent1Events));

      // ACT: Emit event from grandchild
      parent1Events.length = 0;
      grandchild.setStatus('running');

      // ASSERT: parent1 observer receives event (initial state)
      expect(parent1Events.some((e) => e.type === 'treeUpdated')).toBe(true);

      // ============================================================
      // PHASE 3: Reparent grandchild to different tree
      // ============================================================
      // ACT: First detach from child1, then attach to child2
      // Pattern: detachChild() -> attachChild() for proper reparenting
      const child2 = new SimpleWorkflow('Child2', parent2);
      child1.detachChild(grandchild);
      child2.attachChild(grandchild);

      // ============================================================
      // PHASE 4: Add observer to new root (parent2)
      // ============================================================
      // ARRANGE: Create observer for parent2
      const parent2Events: WorkflowEvent[] = [];
      parent2.addObserver(createObserver(parent2Events));

      // ============================================================
      // PHASE 5: Emit event from grandchild
      // ============================================================
      // ACT: Clear events to isolate post-reparenting behavior
      parent1Events.length = 0;
      parent2Events.length = 0;
      grandchild.setStatus('completed');

      // ============================================================
      // PHASE 6: Verify new root observer receives event
      // ============================================================
      // ASSERT: parent2 observer receives event (after reparenting)
      expect(parent2Events.some((e) => e.type === 'treeUpdated')).toBe(true);
    });

    it('should not route events to old root observer after reparenting', () => {
      // ============================================================
      // CRITICAL VALIDATION: This test validates the bug fix
      // ============================================================
      // Bug analysis (bug_analysis.md:60-91) showed:
      // - child.parent stayed pointing to old parent
      // - getRoot() returned wrong root
      // - Old parent's observers still received events after reparenting
      //
      // This test ensures that after the fix:
      // - child.parent is updated to new parent
      // - getRoot() returns correct root
      // - Old parent's observers do NOT receive events

      // ARRANGE: Create two separate trees with observers
      const parent1 = new SimpleWorkflow('Parent1');
      const child1 = new SimpleWorkflow('Child1', parent1);
      const grandchild = new SimpleWorkflow('Grandchild', child1);
      const parent2 = new SimpleWorkflow('Parent2');
      const child2 = new SimpleWorkflow('Child2', parent2);

      const parent1Events: WorkflowEvent[] = [];
      const parent2Events: WorkflowEvent[] = [];

      parent1.addObserver(createObserver(parent1Events));
      parent2.addObserver(createObserver(parent2Events));

      // ACT: Reparent grandchild from parent1 tree to parent2 tree
      // Pattern: detach from old parent, then attach to new parent
      child1.detachChild(grandchild);
      child2.attachChild(grandchild);

      // Clear events to isolate post-reparenting behavior
      parent1Events.length = 0;
      parent2Events.length = 0;

      // Emit event from grandchild
      grandchild.setStatus('running');

      // ASSERT: CRITICAL - Old root's observer must NOT receive event
      // This was the bug - old parent's observers still received events
      expect(parent1Events.some((e) => e.type === 'treeUpdated')).toBe(false);
      expect(parent1Events.length).toBe(0);

      // ASSERT: New root's observer MUST receive event
      expect(parent2Events.some((e) => e.type === 'treeUpdated')).toBe(true);
    });
  });

  describe('getRoot() Traversal Correctness', () => {
    it('should find root workflow via parent chain traversal', () => {
      // ============================================================
      // Verify getRoot() from grandchild returns root
      // ============================================================
      // This is called internally by getRootObservers()
      // ARRANGE: Create 3-level tree
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);
      const grandchild = new SimpleWorkflow('Grandchild', child);

      // ACT: Call getRoot() on grandchild (protected method, access via cast)
      const foundRoot = (grandchild as any).getRoot();

      // ASSERT: getRoot() should return root workflow
      expect(foundRoot).toBe(root);
      expect(foundRoot).not.toBe(child);
      expect(foundRoot).not.toBe(grandchild);
    });

    it('should find root through deep parent chain', () => {
      // ============================================================
      // Verify getRoot() works correctly with deep hierarchies
      // ============================================================
      // ARRANGE: Create 10-level deep hierarchy
      const root = new SimpleWorkflow('Root');
      let current = root;

      for (let i = 0; i < 10; i++) {
        const nextChild = new SimpleWorkflow(`Level${i}`);
        current.attachChild(nextChild);
        current = nextChild;
      }

      // ACT: Call getRoot() on deepest child
      const foundRoot = (current as any).getRoot();

      // ASSERT: Deepest child's getRoot() returns original root
      expect(foundRoot).toBe(root);
    });

    it('should maintain correct root after multiple reparenting cycles', () => {
      // ============================================================
      // Test reparenting: A->B->C  =>  X->Y->C  =>  A->Z->C
      // ============================================================
      // ARRANGE: Create initial tree A->B->C
      const parentA = new SimpleWorkflow('ParentA');
      const parentB = new SimpleWorkflow('ParentB', parentA);
      const childC = new SimpleWorkflow('ChildC', parentB);

      // ASSERT: Initial - C's root should be A
      expect((childC as any).getRoot()).toBe(parentA);

      // ACT: Reparent to X->Y->C
      const parentX = new SimpleWorkflow('ParentX');
      const parentY = new SimpleWorkflow('ParentY', parentX);
      parentB.detachChild(childC);
      parentY.attachChild(childC);

      // ASSERT: After first reparenting, C's root should be X
      expect((childC as any).getRoot()).toBe(parentX);

      // ACT: Reparent again to A->Z->C
      const parentZ = new SimpleWorkflow('ParentZ', parentA);
      parentY.detachChild(childC);
      parentZ.attachChild(childC);

      // ASSERT: After second reparenting, C's root should be A again
      expect((childC as any).getRoot()).toBe(parentA);
    });
  });

  describe('Observer Callback Invocation', () => {
    it('should invoke onEvent() for all event types from children', () => {
      // ============================================================
      // Verify onEvent() callback is invoked
      // ============================================================
      // ARRANGE: Create 2-level tree with tracking observer
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      let onEventCallCount = 0;
      let receivedEventType: string | undefined;

      const trackingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: (e) => {
          onEventCallCount++;
          receivedEventType = e.type;
        },
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      };

      root.addObserver(trackingObserver);

      // ACT: Emit event from child
      child.setStatus('running');

      // ASSERT: Verify onEvent was called
      expect(onEventCallCount).toBeGreaterThan(0);
      expect(receivedEventType).toBeDefined();
    });

    it('should invoke onTreeChanged() for tree update events', () => {
      // ============================================================
      // Verify onTreeChanged() callback is invoked
      // ============================================================
      // ARRANGE: Create 2-level tree with tracking observer
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      let onTreeChangedCallCount = 0;
      let receivedRoot: any;

      const trackingObserver: WorkflowObserver = {
        onLog: () => {},
        onEvent: () => {},
        onStateUpdated: () => {},
        onTreeChanged: (rootNode) => {
          onTreeChangedCallCount++;
          receivedRoot = rootNode;
        },
      };

      root.addObserver(trackingObserver);

      // ACT: Emit tree update event (triggers both onEvent and onTreeChanged)
      // Note: setStatus() emits treeUpdated event which triggers onTreeChanged()
      child.setStatus('running');

      // ASSERT: Verify onTreeChanged was called with correct root
      expect(onTreeChangedCallCount).toBeGreaterThan(0);
      expect(receivedRoot).toBeDefined();
      expect(receivedRoot.id).toBe(root.id);
    });

    it('should invoke callbacks in correct order', () => {
      // ============================================================
      // Verify callback order: onEvent before onTreeChanged
      // ============================================================
      // ARRANGE: Create 2-level tree with order-tracking observer
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);

      const callOrder: string[] = [];

      const orderTrackingObserver: WorkflowObserver = {
        onLog: () => callOrder.push('onLog'),
        onEvent: () => callOrder.push('onEvent'),
        onStateUpdated: () => callOrder.push('onStateUpdated'),
        onTreeChanged: () => callOrder.push('onTreeChanged'),
      };

      root.addObserver(orderTrackingObserver);

      // ACT: Emit tree update event
      callOrder.length = 0;
      child.setStatus('running');

      // ASSERT: Verify callback order
      // emitEvent() calls onEvent() first, then onTreeChanged()
      // See workflow.ts:318-324
      const eventIndex = callOrder.indexOf('onEvent');
      const treeChangedIndex = callOrder.indexOf('onTreeChanged');

      expect(eventIndex).toBeGreaterThanOrEqual(0);
      expect(treeChangedIndex).toBeGreaterThanOrEqual(0);
      expect(eventIndex).toBeLessThan(treeChangedIndex);
    });
  });

  describe('Edge Cases: Cycle Detection', () => {
    it('should still propagate events after cycle detection validation', () => {
      // ============================================================
      // Verify that cycle detection in getRoot() doesn't break normal propagation
      // ============================================================
      // getRoot() uses visited Set for cycle detection (workflow.ts:175-188)
      // This test ensures normal operation is not affected

      // ARRANGE: Create 3-level tree with no cycles
      const root = new SimpleWorkflow('Root');
      const child = new SimpleWorkflow('Child', root);
      const grandchild = new SimpleWorkflow('Grandchild', child);

      const rootEvents: WorkflowEvent[] = [];
      root.addObserver(createObserver(rootEvents));

      // ACT: Emit event from grandchild
      // This should work normally (no cycle exists)
      grandchild.setStatus('running');

      // ASSERT: Verify propagation still works
      expect(rootEvents.some((e) => e.type === 'treeUpdated')).toBe(true);

      // Verify getRoot() didn't throw cycle detection error
      const foundRoot = (grandchild as any).getRoot();
      expect(foundRoot).toBe(root);
    });
  });

  describe('Multiple Reparenting Cycles', () => {
    it('should handle multiple reparenting cycles correctly', () => {
      // ============================================================
      // Test: A->B->C  =>  X->Y->C  =>  A->Z->C  =>  P->Q->C
      // ============================================================
      // ARRANGE: Create three potential parents
      const parentA = new SimpleWorkflow('ParentA');
      const parentB = new SimpleWorkflow('ParentB', parentA);
      const childC = new SimpleWorkflow('ChildC', parentB);

      const parentX = new SimpleWorkflow('ParentX');
      const parentY = new SimpleWorkflow('ParentY', parentX);

      const parentP = new SimpleWorkflow('ParentP');
      const parentQ = new SimpleWorkflow('ParentQ', parentP);

      const eventsA: WorkflowEvent[] = [];
      const eventsX: WorkflowEvent[] = [];
      const eventsP: WorkflowEvent[] = [];

      const createObserverWithTracking = (eventsArray: WorkflowEvent[]): WorkflowObserver => ({
        onLog: () => {},
        onEvent: (e) => eventsArray.push(e),
        onStateUpdated: () => {},
        onTreeChanged: () => {},
      });

      parentA.addObserver(createObserverWithTracking(eventsA));
      parentX.addObserver(createObserverWithTracking(eventsX));
      parentP.addObserver(createObserverWithTracking(eventsP));

      // ACT & ASSERT: Cycle 1 - Verify initial state A->B->C
      eventsA.length = 0;
      childC.setStatus('running');
      expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(true);

      // ACT & ASSERT: Cycle 2 - Reparent to X->Y->C
      parentB.detachChild(childC);
      parentY.attachChild(childC);

      eventsA.length = 0;
      eventsX.length = 0;
      childC.setStatus('completed');
      expect(eventsX.some((e) => e.type === 'treeUpdated')).toBe(true);
      expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(false);

      // ACT & ASSERT: Cycle 3 - Reparent to P->Q->C
      parentY.detachChild(childC);
      parentQ.attachChild(childC);

      eventsX.length = 0;
      eventsP.length = 0;
      childC.setStatus('running');
      expect(eventsP.some((e) => e.type === 'treeUpdated')).toBe(true);
      expect(eventsX.some((e) => e.type === 'treeUpdated')).toBe(false);

      // Final: Verify getRoot() returns correct root
      expect((childC as any).getRoot()).toBe(parentP);
    });
  });
});

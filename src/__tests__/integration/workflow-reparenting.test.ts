/**
 * Integration Test: Reparenting Observer Propagation
 *
 * Validates that observer propagation correctly updates when a child
 * workflow is reparented from one parent to another.
 *
 * Pattern 7 (from bug_fix_tasks.json):
 * "Observer propagation should update after reparenting.
 *  Events from child should only reach new parent's observers."
 */

import { describe, it, expect } from 'vitest';
import {
  Workflow,
  WorkflowObserver,
  WorkflowEvent,
} from '../../index.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/unit/workflow.test.ts:4-11
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Integration: Reparenting Observer Propagation', () => {
  it('should update observer propagation after reparenting', () => {
    // ============================================================
    // PHASE 1: Setup - Create parent1, parent2, and child
    // ============================================================
    // ARRANGE: Create two root workflows (both have parent = null)
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');

    // ARRANGE: Create child attached to parent1 (via constructor)
    const child = new SimpleWorkflow('Child', parent1);

    // ASSERT: Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);
    expect(parent2.children).not.toContain(child);

    // ============================================================
    // PHASE 2: Verify parent1 observer receives events
    // ============================================================
    // ARRANGE: Create observer for parent1
    const parent1Events: WorkflowEvent[] = [];

    const parent1Observer: WorkflowObserver = {
      onLog: () => {}, // Empty - not testing logs
      onEvent: (event) => parent1Events.push(event), // Capture events
      onStateUpdated: () => {}, // Empty - not testing state updates
      onTreeChanged: () => {}, // Empty - not testing tree changes
    };

    // ACT: Attach observer to parent1 (must be root workflow)
    parent1.addObserver(parent1Observer);

    // ACT: Child emits event (triggers treeUpdated via setStatus)
    // PATTERN: setStatus() emits treeUpdated event
    parent1Events.length = 0; // Clear any construction events
    child.setStatus('running');

    // ASSERT: Verify parent1 observer received the event
    const parent1ReceivedEvent = parent1Events.find(
      (e) => e.type === 'treeUpdated'
    );
    expect(parent1ReceivedEvent).toBeDefined();

    // ============================================================
    // PHASE 3: Reparent child from parent1 to parent2
    // ============================================================
    // ARRANGE: Create observer for parent2
    const parent2Events: WorkflowEvent[] = [];

    const parent2Observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => parent2Events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // ACT: Reparent using detach + attach pattern
    // CRITICAL: Must detach before attaching to new parent
    parent1.detachChild(child);
    parent2.attachChild(child);
    parent2.addObserver(parent2Observer);

    // ASSERT: Verify reparenting succeeded
    expect(child.parent).toBe(parent2);
    expect(parent2.children).toContain(child);
    expect(parent1.children).not.toContain(child);

    // ============================================================
    // PHASE 4: Verify parent2 observer receives events after reparenting
    // ============================================================
    // ACT: Clear events to isolate post-reparenting behavior
    parent1Events.length = 0;
    parent2Events.length = 0;

    // ACT: Child emits event again
    child.setStatus('completed');

    // ASSERT: Verify parent2 observer received the event
    const parent2ReceivedEvent = parent2Events.find(
      (e) => e.type === 'treeUpdated'
    );
    expect(parent2ReceivedEvent).toBeDefined();

    // ============================================================
    // PHASE 5: CRITICAL VALIDATION - parent1 observer does NOT receive events
    // ============================================================
    // ASSERT: Verify parent1 observer did NOT receive the post-reparenting event
    const parent1DidNotReceive = parent1Events.find(
      (e) => e.type === 'treeUpdated'
    );
    expect(parent1DidNotReceive).toBeUndefined();

    // ASSERT: Verify event count for parent1 is zero
    expect(parent1Events.length).toBe(0);
  });

  it('should handle multiple reparenting cycles correctly', () => {
    // ARRANGE: Create three potential parents
    const parentA = new SimpleWorkflow('ParentA');
    const parentB = new SimpleWorkflow('ParentB');
    const parentC = new SimpleWorkflow('ParentC');

    // ARRANGE: Create child and observers for each parent
    const child = new SimpleWorkflow('Child', parentA);

    const eventsA: WorkflowEvent[] = [];
    const eventsB: WorkflowEvent[] = [];
    const eventsC: WorkflowEvent[] = [];

    const createObserver = (eventsArray: WorkflowEvent[]): WorkflowObserver => ({
      onLog: () => {},
      onEvent: (e) => eventsArray.push(e),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    });

    parentA.addObserver(createObserver(eventsA));
    parentB.addObserver(createObserver(eventsB));
    parentC.addObserver(createObserver(eventsC));

    // ACT & ASSERT: Cycle 1 - A -> B
    eventsA.length = 0;
    child.setStatus('running');
    expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(true);

    parentA.detachChild(child);
    parentB.attachChild(child);

    eventsA.length = 0;
    eventsB.length = 0;
    child.setStatus('completed');
    expect(eventsB.some((e) => e.type === 'treeUpdated')).toBe(true);
    expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(false);

    // ACT & ASSERT: Cycle 2 - B -> C
    parentB.detachChild(child);
    parentC.attachChild(child);

    eventsB.length = 0;
    eventsC.length = 0;
    child.setStatus('running');
    expect(eventsC.some((e) => e.type === 'treeUpdated')).toBe(true);
    expect(eventsB.some((e) => e.type === 'treeUpdated')).toBe(false);

    // ACT & ASSERT: Cycle 3 - C -> A (return to original)
    parentC.detachChild(child);
    parentA.attachChild(child);

    eventsC.length = 0;
    eventsA.length = 0;
    child.setStatus('completed');
    expect(eventsA.some((e) => e.type === 'treeUpdated')).toBe(true);
    expect(eventsC.some((e) => e.type === 'treeUpdated')).toBe(false);
  });
});

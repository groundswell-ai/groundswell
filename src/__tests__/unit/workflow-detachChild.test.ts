import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowEvent } from '../../index.js';

class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow.detachChild()', () => {
  it('should remove child from parent.children array', () => {
    // Arrange: Create parent with child
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Assert: Verify child is in parent.children
    expect(parent.children).toContain(child);

    // Act: Call detachChild (will fail - method doesn't exist)
    parent.detachChild(child);

    // Assert: Verify child removed from parent.children
    expect(parent.children).not.toContain(child);
  });

  it('should clear child.parent to null', () => {
    // Arrange: Create parent with child
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Assert: Verify child.parent is set
    expect(child.parent).toBe(parent);

    // Act: Call detachChild
    parent.detachChild(child);

    // Assert: Verify child.parent is null
    expect(child.parent).toBeNull();
  });

  it('should remove child.node from parent.node.children array', () => {
    // Arrange: Create parent with child
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Assert: Verify child.node is in parent.node.children
    expect(parent.getNode().children).toContain(child.getNode());

    // Act: Call detachChild
    parent.detachChild(child);

    // Assert: Verify child.node removed from parent.node.children
    expect(parent.getNode().children).not.toContain(child.getNode());
  });

  it('should emit childDetached event with correct payload', () => {
    // Arrange: Create parent with observer
    const parent = new SimpleWorkflow('Parent');
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    parent.addObserver(observer);

    // Act: Create child (triggers attachChild event), then detach
    const child = new SimpleWorkflow('Child', parent);
    events.length = 0; // Clear attachChild events

    parent.detachChild(child);

    // Assert: Verify childDetached event was emitted
    const detachEvent = events.find((e) => e.type === 'childDetached');
    expect(detachEvent).toBeDefined();

    // Assert: Verify event payload (with type guard for discriminated union)
    expect(detachEvent?.type === 'childDetached' && detachEvent.parentId).toBe(parent.id);
    expect(detachEvent?.type === 'childDetached' && detachEvent.childId).toBe(child.id);
  });

  it('should throw error when child is not attached to parent', () => {
    // Arrange: Create parent and child separately (no attachment)
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child');

    // Assert: Verify child is NOT in parent.children
    expect(parent.children).not.toContain(child);

    // Act & Assert: Calling detachChild should throw error
    expect(() => parent.detachChild(child)).toThrow(
      /not attached/i
    );
  });
});

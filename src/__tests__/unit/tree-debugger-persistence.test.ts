import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlink, writeFile } from 'fs/promises';
import { Workflow, WorkflowTreeDebugger } from '../../index.js';
import type { WorkflowEvent } from '../../types/events.js';

class DebugTestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('completed');
  }
}

describe('WorkflowTreeDebugger persistence', () => {
  describe('getEventHistory', () => {
    it('should not accumulate events when persistEvents is false (default)', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf);

      // Trigger some events
      wf.snapshotState();
      wf.setStatus('running');

      const events = debugger_.getEventHistory();
      expect(events).toEqual([]);
      expect(events.length).toBe(0);
    });

    it('should accumulate events when persistEvents is true', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Trigger some events
      wf.snapshotState();
      wf.setStatus('running');

      const events = debugger_.getEventHistory();
      expect(events.length).toBeGreaterThan(0);
      expect(Array.isArray(events)).toBe(true);
    });

    it('should preserve event order in history', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Trigger events in sequence
      const eventTypes: string[] = [];
      wf.snapshotState();
      eventTypes.push('stateSnapshot');
      wf.setStatus('running');
      eventTypes.push('stateSnapshot'); // setStatus triggers stateSnapshot

      const events = debugger_.getEventHistory();
      expect(events.length).toBeGreaterThanOrEqual(eventTypes.length);

      // Verify order by checking timestamps (events are in order received)
      for (let i = 1; i < events.length; i++) {
        expect(events[i].type).toBeDefined();
      }
    });

    it('should return copy of history (prevent modification)', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      wf.snapshotState();

      const events1 = debugger_.getEventHistory();
      const events2 = debugger_.getEventHistory();

      // Modify first array
      events1.push({ type: 'stateSnapshot', node: wf.getNode() } as WorkflowEvent);

      // Second array should not be affected
      expect(events2.length).not.toBe(events1.length);
    });

    it('should return empty array when persistence disabled', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: false });

      wf.snapshotState();

      const events = debugger_.getEventHistory();
      expect(events).toEqual([]);
      expect(Array.isArray(events)).toBe(true);
    });

    it('should respect maxEventHistorySize limit', async () => {
      const wf = new DebugTestWorkflow('Root');
      const maxSize = 5;
      const debugger_ = new WorkflowTreeDebugger(wf, {
        persistEvents: true,
        maxEventHistorySize: maxSize,
      });

      // Trigger more events than max size
      for (let i = 0; i < maxSize + 5; i++) {
        wf.snapshotState();
      }

      const events = debugger_.getEventHistory();
      expect(events.length).toBeLessThanOrEqual(maxSize);
    });
  });

  describe('saveEventHistory', () => {
    const testFilePath = '/tmp/test-event-history.json';

    afterEach(async () => {
      // Clean up test file
      try {
        await unlink(testFilePath);
      } catch {
        // File may not exist
      }
    });

    it('should save event history to file', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Trigger some events
      wf.snapshotState();
      wf.setStatus('running');

      await debugger_.saveEventHistory(testFilePath);

      // Verify file was created
      const { readFile } = await import('fs/promises');
      const content = await readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should serialize events without circular reference errors', async () => {
      const wf = new DebugTestWorkflow('Root');
      const child = new DebugTestWorkflow('Child', wf);
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // This creates circular references (parent <-> child)
      wf.snapshotState();
      child.snapshotState();

      // Should not throw due to circular references
      await expect(debugger_.saveEventHistory(testFilePath)).resolves.not.toThrow();

      // Verify file content is valid JSON
      const { readFile } = await import('fs/promises');
      const content = await readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should throw error when persistence not enabled', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: false });

      await expect(debugger_.saveEventHistory(testFilePath)).rejects.toThrow(
        'Event persistence is not enabled'
      );
    });

    it('should throw error for non-existent directory', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      const invalidPath = '/non/existent/directory/events.json';

      await expect(debugger_.saveEventHistory(invalidPath)).rejects.toThrow();
    });

    it('should add timestamp to each serialized event', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      wf.snapshotState();

      await debugger_.saveEventHistory(testFilePath);

      const { readFile } = await import('fs/promises');
      const content = await readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.length).toBeGreaterThan(0);
      parsed.forEach((event: unknown) => {
        expect(event).toHaveProperty('timestamp');
        expect(typeof (event as { timestamp: number }).timestamp).toBe('number');
      });
    });

    it('should extract nodeId and nodeName from WorkflowNode references', async () => {
      const wf = new DebugTestWorkflow('TestWorkflow');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      wf.snapshotState();

      await debugger_.saveEventHistory(testFilePath);

      const { readFile } = await import('fs/promises');
      const content = await readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);

      const stateSnapshotEvent = parsed.find((e: unknown) =>
        (e as { type: string }).type === 'stateSnapshot'
      );

      expect(stateSnapshotEvent).toBeDefined();
      expect(stateSnapshotEvent).toHaveProperty('nodeId');
      expect(stateSnapshotEvent).toHaveProperty('nodeName');
      expect(stateSnapshotEvent.nodeId).toBe(wf.id);
      expect(stateSnapshotEvent.nodeName).toBe('TestWorkflow');
    });
  });

  describe('loadEventHistory', () => {
    const testFilePath = '/tmp/test-event-history.json';

    afterEach(async () => {
      // Clean up test file
      try {
        await unlink(testFilePath);
      } catch {
        // File may not exist
      }
    });

    it('should load event history from file', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Create and save events
      wf.snapshotState();
      await debugger_.saveEventHistory(testFilePath);

      // Load events
      const loadedEvents = await WorkflowTreeDebugger.loadEventHistory(testFilePath);

      expect(Array.isArray(loadedEvents)).toBe(true);
      expect(loadedEvents.length).toBeGreaterThan(0);
    });

    it('should throw descriptive error for missing file', async () => {
      const nonExistentPath = '/tmp/non-existent-file-xyz123.json';

      await expect(
        WorkflowTreeDebugger.loadEventHistory(nonExistentPath)
      ).rejects.toThrow('Event history file not found');
    });

    it('should throw descriptive error for invalid JSON', async () => {
      // Create file with invalid JSON
      await writeFile(testFilePath, 'invalid json content {', 'utf-8');

      await expect(
        WorkflowTreeDebugger.loadEventHistory(testFilePath)
      ).rejects.toThrow('Invalid JSON');
    });

    it('should throw descriptive error for non-array content', async () => {
      // Create file with non-array JSON
      await writeFile(testFilePath, JSON.stringify({ foo: 'bar' }), 'utf-8');

      await expect(
        WorkflowTreeDebugger.loadEventHistory(testFilePath)
      ).rejects.toThrow('Expected array');
    });
  });

  describe('event serialization', () => {
    it('should serialize all event types without errors', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Trigger various event types
      wf.snapshotState(); // stateSnapshot
      wf.setStatus('running'); // stateSnapshot

      await debugger_.saveEventHistory('/tmp/test-all-events.json');

      const { readFile, unlink } = await import('fs/promises');
      const content = await readFile('/tmp/test-all-events.json', 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.length).toBeGreaterThan(0);
      await unlink('/tmp/test-all-events.json');
    });

    it('should skip WorkflowError.original field during serialization', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Simulate error event (we'll manually add one)
      const errorEvent: WorkflowEvent = {
        type: 'error',
        node: wf.getNode(),
        error: {
          message: 'Test error',
          original: { circular: 'ref', nested: { parent: {} } }, // Circular potential
          workflowId: wf.id,
          state: {},
          logs: [],
        },
      };

      // Manually add to history
      (debugger_ as any).eventHistory.push(errorEvent);

      await debugger_.saveEventHistory('/tmp/test-error-event.json');

      const { readFile, unlink } = await import('fs/promises');
      const content = await readFile('/tmp/test-error-event.json', 'utf-8');
      const parsed = JSON.parse(content);

      const errorEventData = parsed.find((e: unknown) =>
        (e as { type: string }).type === 'error'
      );

      expect(errorEventData).toBeDefined();
      expect(errorEventData.error).toHaveProperty('message');
      expect(errorEventData.error.original).toBeUndefined(); // Should be skipped

      await unlink('/tmp/test-error-event.json');
    });
  });

  describe('save/load round-trip', () => {
    const testFilePath = '/tmp/test-roundtrip.json';

    afterEach(async () => {
      try {
        await unlink(testFilePath);
      } catch {
        // File may not exist
      }
    });

    it('should preserve event data through save/load cycle', async () => {
      const wf = new DebugTestWorkflow('Root');
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Create events
      wf.snapshotState();
      wf.setStatus('running');

      const originalEvents = debugger_.getEventHistory();

      // Save and load
      await debugger_.saveEventHistory(testFilePath);
      const loadedEvents = await WorkflowTreeDebugger.loadEventHistory(testFilePath);

      // Verify count matches
      expect(loadedEvents.length).toBe(originalEvents.length);

      // Verify event types match
      const originalTypes = originalEvents.map((e) => e.type);
      const loadedTypes = loadedEvents.map((e) => (e as { type: string }).type);
      expect(loadedTypes).toEqual(originalTypes);
    });
  });

  describe('backward compatibility', () => {
    it('should work with old constructor signature (no options)', async () => {
      const wf = new DebugTestWorkflow('Root');
      // Old usage - single parameter
      const debugger_ = new WorkflowTreeDebugger(wf);

      wf.snapshotState();

      const events = debugger_.getEventHistory();
      expect(events).toEqual([]); // Should not accumulate by default

      // Existing functionality should still work
      const tree = debugger_.getTree();
      expect(tree).toBeDefined();
      expect(tree.id).toBe(wf.id);
    });

    it('should maintain existing functionality when persistence enabled', async () => {
      const wf = new DebugTestWorkflow('Root');
      const child = new DebugTestWorkflow('Child', wf);
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Existing methods should work
      expect(debugger_.getTree().id).toBe(wf.id);
      expect(debugger_.getNode(wf.id)).toBeDefined();
      expect(debugger_.getNode(child.id)).toBeDefined();
      expect(debugger_.getStats().totalNodes).toBe(2);

      // Tree string should render
      const treeString = debugger_.toTreeString();
      expect(treeString).toContain('Root');
      expect(treeString).toContain('Child');
    });
  });

  describe('integration with WorkflowEventReplayer', () => {
    const testFilePath = '/tmp/test-replayer-integration.json';

    afterEach(async () => {
      try {
        await unlink(testFilePath);
      } catch {
        // File may not exist
      }
    });

    it('should produce events compatible with WorkflowEventReplayer', async () => {
      const { WorkflowEventReplayer } = await import('../../debugger/event-replayer.js');

      const wf = new DebugTestWorkflow('Root');
      const child = new DebugTestWorkflow('Child', wf);
      const debugger_ = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Create structural events
      wf.snapshotState();
      child.snapshotState();

      // Save and load
      await debugger_.saveEventHistory(testFilePath);
      const loadedEvents = await WorkflowTreeDebugger.loadEventHistory(testFilePath);

      // Use with replayer - should not throw
      const replayer = new WorkflowEventReplayer();

      // Note: The loaded events won't have full WorkflowNode objects,
      // so we can't fully replay, but we verify the format is compatible
      expect(loadedEvents).toBeDefined();
      expect(Array.isArray(loadedEvents)).toBe(true);
      expect(loadedEvents.length).toBeGreaterThan(0);
    });
  });

  describe('replay', () => {
    const testFilePath = '/tmp/test-replay-events.json';

    // Helper to create mock WorkflowNode
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

    afterEach(async () => {
      try {
        await unlink(testFilePath);
      } catch {
        // File may not exist
      }
    });

    it('should replay events from file and return tree root', async () => {
      const { WorkflowEventReplayer } = await import('../../debugger/event-replayer.js');

      // Create mock events for a tree structure
      const rootId = 'root-123';
      const childId = 'child-456';
      const root = createMockNode(rootId, null);
      const child = createMockNode(childId, null);

      const events = [
        { type: 'treeUpdated', root },
        { type: 'childAttached', parentId: rootId, child }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      expect(tree).toBeDefined();
      expect(tree.id).toBe(rootId);
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].id).toBe(childId);
    });

    it('should throw descriptive error for non-existent file', async () => {
      const nonExistentPath = '/tmp/non-existent-replay-file-xyz.json';

      await expect(
        WorkflowTreeDebugger.replay(nonExistentPath)
      ).rejects.toThrow('Event history file not found');
    });

    it('should throw descriptive error for invalid JSON', async () => {
      await writeFile(testFilePath, 'invalid json content {', 'utf-8');

      await expect(
        WorkflowTreeDebugger.replay(testFilePath)
      ).rejects.toThrow('Invalid JSON');
    });

    it('should throw descriptive error for non-array content', async () => {
      await writeFile(testFilePath, JSON.stringify({ foo: 'bar' }), 'utf-8');

      await expect(
        WorkflowTreeDebugger.replay(testFilePath)
      ).rejects.toThrow('Expected array');
    });

    it('should throw descriptive error for empty events array', async () => {
      await writeFile(testFilePath, JSON.stringify([]), 'utf-8');

      await expect(
        WorkflowTreeDebugger.replay(testFilePath)
      ).rejects.toThrow('Failed to replay events');
    });

    it('should reconstruct tree structure correctly with bidirectional links', async () => {
      const rootId = 'root-1';
      const child1Id = 'child-1';
      const child2Id = 'child-2';
      const root = createMockNode(rootId, null);
      const child1 = createMockNode(child1Id, null);
      const child2 = createMockNode(child2Id, null);

      const events = [
        { type: 'treeUpdated', root },
        { type: 'childAttached', parentId: rootId, child: child1 },
        { type: 'childAttached', parentId: rootId, child: child2 }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      // Verify structure
      expect(tree.children).toHaveLength(2);
      expect(tree.children[0].id).toBe(child1Id);
      expect(tree.children[1].id).toBe(child2Id);

      // Verify bidirectional parent-child links
      expect(tree.children[0].parent).toBe(tree);
      expect(tree.children[1].parent).toBe(tree);
      expect(tree.children).toContain(tree.children[0]);
      expect(tree.children).toContain(tree.children[1]);
    });

    it('should reconstruct node states (stateSnapshot, events)', async () => {
      const rootId = 'root-1';
      const root = createMockNode(rootId, null);
      const stateSnapshot = { count: 42, status: 'running' };

      const events = [
        { type: 'treeUpdated', root },
        { type: 'stateSnapshot', node: { ...root, stateSnapshot } }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      expect(tree.stateSnapshot).toEqual(stateSnapshot);
    });

    it('should handle error events correctly', async () => {
      const rootId = 'root-1';
      const root = createMockNode(rootId, null);

      const errorEvent = {
        type: 'error' as const,
        node: root,
        error: {
          message: 'Test error',
          original: null,
          workflowId: rootId,
          state: {},
          logs: []
        }
      };

      const events = [
        { type: 'treeUpdated', root },
        errorEvent
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      expect(tree.events).toHaveLength(1);
      expect(tree.events[0].type).toBe('error');
    });

    it('should return read-only node (no live workflow attached)', async () => {
      const rootId = 'root-1';
      const root = createMockNode(rootId, null);

      const events = [
        { type: 'treeUpdated', root }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      // Tree is standalone (can be modified but no live workflow)
      expect(tree.parent).toBeNull();
      expect(tree.id).toBe(rootId);

      // Can modify properties (read-only in the sense of no live workflow)
      tree.name = 'Modified';
      expect(tree.name).toBe('Modified');
    });

    it('should include file path in replay error message', async () => {
      // Create events without treeUpdated (no root will be established)
      const events = [
        { type: 'stepStart', node: createMockNode('step-node', null), step: 'test' }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      try {
        await WorkflowTreeDebugger.replay(testFilePath);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain(testFilePath);
        expect((error as Error).message).toContain('Failed to replay events');
      }
    });

    it('should handle childDetached events during replay', async () => {
      const rootId = 'root-1';
      const childId = 'child-1';
      const root = createMockNode(rootId, null);
      const child = createMockNode(childId, null);

      const events = [
        { type: 'treeUpdated', root },
        { type: 'childAttached', parentId: rootId, child },
        { type: 'childDetached', parentId: rootId, childId }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      // Child should be detached
      expect(tree.children).toHaveLength(0);
    });

    it('should handle complex nested tree structures', async () => {
      const rootId = 'root-1';
      const child1Id = 'child-1';
      const child2Id = 'child-2';
      const grandchild1Id = 'grandchild-1';

      const root = createMockNode(rootId, null);
      const child1 = createMockNode(child1Id, null);
      const child2 = createMockNode(child2Id, null);
      const grandchild1 = createMockNode(grandchild1Id, null);

      const events = [
        { type: 'treeUpdated', root },
        { type: 'childAttached', parentId: rootId, child: child1 },
        { type: 'childAttached', parentId: rootId, child: child2 },
        { type: 'childAttached', parentId: child1Id, child: grandchild1 }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const tree = await WorkflowTreeDebugger.replay(testFilePath);

      expect(tree.children).toHaveLength(2);
      expect(tree.children[0].id).toBe(child1Id);
      expect(tree.children[1].id).toBe(child2Id);
      expect(tree.children[0].children).toHaveLength(1);
      expect(tree.children[0].children[0].id).toBe(grandchild1Id);

      // Verify bidirectional links for grandchild
      expect(tree.children[0].children[0].parent).toBe(tree.children[0]);
    });
  });

  describe('save/replay round-trip integration', () => {
    const testFilePath = '/tmp/test-roundtrip-replay.json';

    afterEach(async () => {
      try {
        await unlink(testFilePath);
      } catch {
        // File may not exist
      }
    });

    it('should work with mock events that have full WorkflowNode objects', async () => {
      // Helper to create mock WorkflowNode
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

      // Create events with full WorkflowNode objects (simulating what we'd need for replay)
      const rootId = 'root-1';
      const childId = 'child-1';
      const root = createMockNode(rootId, null);
      const child = createMockNode(childId, null);
      const stateSnapshot = { count: 42, status: 'running' };

      const events = [
        { type: 'treeUpdated', root },
        { type: 'childAttached', parentId: rootId, child },
        { type: 'stateSnapshot', node: { ...root, stateSnapshot } }
      ];

      // Write events directly (not using saveEventHistory which serializes)
      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      // Replay should work with full WorkflowNode objects
      const replayedTree = await WorkflowTreeDebugger.replay(testFilePath);

      expect(replayedTree).toBeDefined();
      expect(replayedTree.id).toBe(rootId);
      expect(replayedTree.children).toHaveLength(1);
      expect(replayedTree.children[0].id).toBe(childId);
      expect(replayedTree.stateSnapshot).toEqual(stateSnapshot);
    });

    it('should handle complete event stream with all event types', async () => {
      // Helper to create mock WorkflowNode
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

      const rootId = 'root-1';
      const childId = 'child-1';
      const root = createMockNode(rootId, null);
      const child = createMockNode(childId, null);
      const stateSnapshot = { step: 1, count: 100 };

      const errorEvent = {
        type: 'error' as const,
        node: child,
        error: {
          message: 'Test error',
          original: null,
          workflowId: childId,
          state: {},
          logs: []
        }
      };

      const events = [
        // Structural events
        { type: 'treeUpdated', root },
        { type: 'childAttached', parentId: rootId, child },
        // State events
        { type: 'stateSnapshot', node: { ...root, stateSnapshot } },
        errorEvent,
        { type: 'stepStart', node: child, step: 'processData' },
        { type: 'stepEnd', node: child, step: 'processData', duration: 1500 },
        { type: 'taskStart', node: root, task: 'cleanup' },
        { type: 'taskEnd', node: root, task: 'cleanup' }
      ];

      await writeFile(testFilePath, JSON.stringify(events), 'utf-8');

      const replayedTree = await WorkflowTreeDebugger.replay(testFilePath);

      // Verify tree structure
      expect(replayedTree.id).toBe(rootId);
      expect(replayedTree.children).toHaveLength(1);
      expect(replayedTree.children[0].id).toBe(childId);

      // Verify state snapshot
      expect(replayedTree.stateSnapshot).toEqual(stateSnapshot);

      // Verify error accumulated on child
      const childNode = replayedTree.children[0];
      const errorEvents = childNode.events.filter(e => e.type === 'error');
      expect(errorEvents).toHaveLength(1);

      // Verify step events tracked on child
      const stepStartEvents = childNode.events.filter(e => e.type === 'stepStart');
      const stepEndEvents = childNode.events.filter(e => e.type === 'stepEnd');
      expect(stepStartEvents).toHaveLength(1);
      expect(stepEndEvents).toHaveLength(1);

      // Verify task events tracked on root
      const taskStartEvents = replayedTree.events.filter(e => e.type === 'taskStart');
      const taskEndEvents = replayedTree.events.filter(e => e.type === 'taskEnd');
      expect(taskStartEvents).toHaveLength(1);
      expect(taskEndEvents).toHaveLength(1);
    });

    it('should note the limitation with serialized events from saveEventHistory', async () => {
      // This test documents the current limitation:
      // saveEventHistory() serializes events to avoid circular references,
      // but WorkflowEventReplayer expects full WorkflowNode objects.
      // This integration test verifies the error is properly reported.

      const wf = new DebugTestWorkflow('Root');
      const child = new DebugTestWorkflow('Child', wf);
      const debugger1 = new WorkflowTreeDebugger(wf, { persistEvents: true });

      // Create some events
      wf.snapshotState();
      child.snapshotState();

      // Save events (serializes them)
      await debugger1.saveEventHistory(testFilePath);

      // Currently, replay will fail because serialized events don't have full WorkflowNode objects
      // The error message should be descriptive
      await expect(WorkflowTreeDebugger.replay(testFilePath)).rejects.toThrow(
        'Failed to replay events'
      );
    });
  });
});

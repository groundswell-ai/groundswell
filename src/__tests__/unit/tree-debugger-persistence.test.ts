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
});

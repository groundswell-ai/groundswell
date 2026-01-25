# Testing Patterns for WorkflowTreeDebugger Persistence

## Existing Test Structure

### Test Organization

```
src/__tests__/
├── unit/
│   ├── tree-debugger.test.ts (2.5K)
│   └── tree-debugger-incremental.test.ts (6.7K)
├── integration/
│   └── tree-mirroring.test.ts
└── helpers/
    └── tree-verification.ts (8.2K)
```

### Test Workflow Class Pattern

From existing tests:

```typescript
class DebugTestWorkflow extends Workflow {
  async run(): Promise<void> {
    this.setStatus('completed');
  }
}
```

**Key characteristics**:
- Simple extension of base `Workflow` class
- Minimal implementation for testing
- Consistent naming convention
- Easy to instantiate and control

## Test Helpers

### Tree Verification Helpers

**Location**: `src/__tests__/helpers/tree-verification.ts`

Key helper functions:
```typescript
function verifyBidirectionalLink(parent: WorkflowNode, child: WorkflowNode): void
function verifyTreeMirror(source: WorkflowNode, mirror: WorkflowNode): void
function validateTreeConsistency(root: WorkflowNode): void
```

**Pattern**: Helpers throw descriptive errors if invariants violated.

**For persistence tests**, we can use similar patterns:
```typescript
function verifyEventHistory(history: WorkflowEvent[], expectedCount: number): void
function verifyEventOrder(history: WorkflowEvent[]): void
function verifyEventSerialization(history: WorkflowEvent[]): void
```

## Test Patterns for Persistence

### 1. Basic Event Accumulation

```typescript
describe('WorkflowTreeDebugger event persistence', () => {
  it('should accumulate events when persistEvents is true', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    // Trigger some events
    await workflow.run();

    const history = debugger.getEventHistory();

    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('type');
    expect(history[0]).toHaveProperty('timestamp');
  });

  it('should not accumulate events when persistEvents is false', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: false,
    });

    await workflow.run();

    const history = debugger.getEventHistory();

    expect(history.length).toBe(0);
  });

  it('should default to not persisting events', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow);

    await workflow.run();

    const history = debugger.getEventHistory();

    expect(history.length).toBe(0);
  });
});
```

### 2. Event Order Preservation

```typescript
describe('Event order preservation', () => {
  it('should preserve chronological order of events', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    const receivedTypes: string[] = [];
    debugger.events.subscribe({
      next: (event) => {
        receivedTypes.push(event.type);
      },
    });

    await workflow.run();

    const history = debugger.getEventHistory();
    const historyTypes = history.map(e => e.type);

    expect(historyTypes).toEqual(receivedTypes);
  });

  it('should include timestamps in serialized events', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    const history = debugger.getEventHistory();

    for (const event of history) {
      expect(event).toHaveProperty('timestamp');
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
    }
  });
});
```

### 3. Event Type Coverage

```typescript
describe('Event type coverage', () => {
  it('should capture all structural event types', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    const history = debugger.getEventHistory();
    const eventTypes = new Set(history.map(e => e.type));

    expect(eventTypes).toContain('childAttached');
    expect(eventTypes).toContain('treeUpdated');
  });

  it('should capture state events', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    // Trigger state snapshot
    workflow.snapshotState();

    const history = debugger.getEventHistory();
    const stateEvents = history.filter(e => e.type === 'stateSnapshot');

    expect(stateEvents.length).toBeGreaterThan(0);
  });
});
```

### 4. File I/O Testing

```typescript
describe('Event history save/load', () => {
  const testFilePath = '/tmp/test-event-history.json';

  afterEach(async () => {
    // Clean up test file
    try {
      await unlink(testFilePath);
    } catch {
      // File doesn't exist, ignore
    }
  });

  it('should save event history to file', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    await debugger.saveEventHistory(testFilePath);

    // Verify file exists
    const fileExists = await access(testFilePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('should load event history from file', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();
    const originalHistory = debugger.getEventHistory();

    await debugger.saveEventHistory(testFilePath);
    const loadedHistory = await WorkflowTreeDebugger.loadEventHistory(testFilePath);

    expect(loadedHistory).toHaveLength(originalHistory.length);
  });

  it('should preserve event data through save/load cycle', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();
    const originalHistory = debugger.getEventHistory();

    await debugger.saveEventHistory(testFilePath);
    const loadedHistory = await WorkflowTreeDebugger.loadEventHistory(testFilePath);

    // Compare event types
    const originalTypes = originalHistory.map(e => e.type);
    const loadedTypes = loadedHistory.map(e => e.type);

    expect(loadedTypes).toEqual(originalTypes);
  });

  it('should throw on file not found', async () => {
    await expect(
      WorkflowTreeDebugger.loadEventHistory('/nonexistent/file.json')
    ).rejects.toThrow('File not found');
  });

  it('should handle invalid JSON gracefully', async () => {
    // Write invalid JSON
    await writeFile(testFilePath, 'invalid json', 'utf-8');

    await expect(
      WorkflowTreeDebugger.loadEventHistory(testFilePath)
    ).rejects.toThrow('Invalid JSON');
  });
});
```

### 5. Serialization Testing

```typescript
describe('Event serialization', () => {
  it('should serialize events without circular references', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    // This should not throw
    await debugger.saveEventHistory(testFilePath);
  });

  it('should handle events with WorkflowNode references', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    // Create child workflow
    const child = new DebugTestWorkflow('child-workflow');
    await workflow.attachChild(child);

    const history = debugger.getEventHistory();
    const childAttachedEvent = history.find(e => e.type === 'childAttached');

    expect(childAttachedEvent).toBeDefined();
    // Should have nodeId, not full node object
    expect(childAttachedEvent).toHaveProperty('nodeId');
  });
});
```

### 6. Memory Management Testing

```typescript
describe('Memory management', () => {
  it('should clear event history', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();
    expect(debugger.getEventHistory().length).toBeGreaterThan(0);

    debugger.clearEventHistory();
    expect(debugger.getEventHistory().length).toBe(0);
  });

  it('should respect max event history size', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
      maxEventHistorySize: 10,
    });

    // Generate more than 10 events
    for (let i = 0; i < 20; i++) {
      workflow.snapshotState();
    }

    const history = debugger.getEventHistory();
    expect(history.length).toBeLessThanOrEqual(10);
  });
});
```

### 7. Error Handling Testing

```typescript
describe('Error handling', () => {
  it('should handle save errors gracefully', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    // Try to save to invalid path
    const invalidPath = '/root/no-permission/test.json';

    await expect(
      debugger.saveEventHistory(invalidPath)
    ).rejects.toThrow();

    // Event history should still be intact
    expect(debugger.getEventHistory().length).toBeGreaterThan(0);
  });

  it('should log errors without breaking event stream', async () => {
    const mockLogger = {
      error: vi.fn(),
    };

    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
      logger: mockLogger,
    });

    // Trigger events after save failure
    await workflow.run();

    // Event stream should still work
    let eventReceived = false;
    debugger.events.subscribe({
      next: () => {
        eventReceived = true;
      },
    });

    await workflow.snapshotState();

    expect(eventReceived).toBe(true);
  });
});
```

### 8. Integration Testing

```typescript
describe('Integration with WorkflowEventReplayer', () => {
  it('should work with event replayer', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    const history = debugger.getEventHistory();

    // Load into replayer
    const replayer = new WorkflowEventReplayer();
    const tree = replayer.replay(history);

    expect(tree).toBeDefined();
    expect(tree.id).toBe(workflow.id);
  });

  it('should support round-trip through replayer', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();
    const originalTree = debugger.getTree();

    const history = debugger.getEventHistory();
    await debugger.saveEventHistory(testFilePath);
    const loadedHistory = await WorkflowTreeDebugger.loadEventHistory(testFilePath);

    const replayer = new WorkflowEventReplayer();
    const replayedTree = replayer.replay(loadedHistory);

    // Verify structure matches
    expect(replayedTree.id).toBe(originalTree.id);
    expect(replayedTree.name).toBe(originalTree.name);
  });
});
```

## Mock Patterns

### Mock Observable Subscriber

```typescript
describe('Event stream integration', () => {
  it('should forward events to subscribers while persisting', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    const receivedEvents: WorkflowEvent[] = [];
    const subscription = debugger.events.subscribe({
      next: (event) => {
        receivedEvents.push(event);
      },
    });

    await workflow.run();

    expect(receivedEvents.length).toBeGreaterThan(0);

    subscription.unsubscribe();
  });
});
```

### Mock File System

For testing file I/O without actual disk operations:

```typescript
import { vi } from 'vitest';

describe('File I/O with mocks', () => {
  it('should handle file write errors', async () => {
    const mockWriteFile = vi.fn().mockRejectedValue(new Error('Write failed'));

    // Mock fs/promises
    vi.doMock('fs/promises', () => ({
      writeFile: mockWriteFile,
    }));

    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    await expect(
      debugger.saveEventHistory(testFilePath)
    ).rejects.toThrow('Write failed');
  });
});
```

## Test Utilities

### Custom Test Matchers

```typescript
// Add custom matchers for event testing
declare global {
  namespace Vi {
    interface Matchers<R> {
      toBeValidEvent(): R;
      toHaveEventType(type: string): R;
    }
  }
}

expect.extend({
  toBeValidEvent(received: WorkflowEvent) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      'type' in received &&
      'timestamp' in received;

    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid event`
        : `Expected ${received} to be a valid event with type and timestamp`,
    };
  },

  toHaveEventType(received: WorkflowEvent, type: string) {
    const pass = received.type === type;
    return {
      pass,
      message: () => pass
        ? `Expected event type not to be ${type}`
        : `Expected event type to be ${type}, got ${received.type}`,
    };
  },
});
```

### Test Fixture Factory

```typescript
class TestFixture {
  static createWorkflowWithEvents(): {
    workflow: DebugTestWorkflow;
    debugger: WorkflowTreeDebugger;
  } {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });
    return { workflow, debugger };
  }

  static async generateEvents(count: number): Promise<WorkflowEvent[]> {
    const { workflow, debugger } = this.createWorkflowWithEvents();

    for (let i = 0; i < count; i++) {
      workflow.snapshotState();
    }

    return debugger.getEventHistory();
  }
}
```

## Performance Testing

```typescript
describe('Performance', () => {
  it('should handle large event volumes efficiently', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    const startTime = Date.now();

    // Generate 1000 events
    for (let i = 0; i < 1000; i++) {
      workflow.snapshotState();
    }

    const elapsed = Date.now() - startTime;

    // Should complete in reasonable time (< 1 second)
    expect(elapsed).toBeLessThan(1000);
  });

  it('should serialize large event history efficiently', async () => {
    const { workflow, debugger } = TestFixture.createWorkflowWithEvents();

    // Generate 1000 events
    for (let i = 0; i < 1000; i++) {
      workflow.snapshotState();
    }

    const startTime = Date.now();
    await debugger.saveEventHistory(testFilePath);
    const elapsed = Date.now() - startTime;

    // Should complete in reasonable time (< 1 second)
    expect(elapsed).toBeLessThan(1000);
  });
});
```

## Edge Cases

```typescript
describe('Edge cases', () => {
  it('should handle empty event history', () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    expect(debugger.getEventHistory()).toEqual([]);
  });

  it('should handle concurrent save operations', async () => {
    const workflow = new DebugTestWorkflow('test-workflow');
    const debugger = new WorkflowTreeDebugger(workflow, {
      persistEvents: true,
    });

    await workflow.run();

    // Trigger concurrent saves
    await Promise.all([
      debugger.saveEventHistory('/tmp/test1.json'),
      debugger.saveEventHistory('/tmp/test2.json'),
    ]);

    // Both should complete without errors
    const file1Exists = await access('/tmp/test1.json').then(() => true);
    const file2Exists = await access('/tmp/test2.json').then(() => true);

    expect(file1Exists).toBe(true);
    expect(file2Exists).toBe(true);
  });
});
```

## Key Takeaways

1. **Follow existing patterns**: Use DebugTestWorkflow class pattern
2. **Leverage helpers**: Use tree-verification helpers where applicable
3. **Test both modes**: Test with persistEvents true and false
4. **File I/O tests**: Clean up test files in afterEach
5. **Error handling**: Test both success and failure cases
6. **Integration**: Test with WorkflowEventReplayer (from P2.M1.T1.S3)
7. **Performance**: Test with large event volumes
8. **Edge cases**: Empty history, concurrent operations, invalid data

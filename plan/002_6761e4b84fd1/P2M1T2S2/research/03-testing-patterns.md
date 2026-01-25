# Testing Patterns for WorkflowTreeDebugger.replay()

## Overview

This document outlines testing patterns for the `WorkflowTreeDebugger.replay()` static method.

## Existing Test Patterns

### Test File Locations

```
src/__tests__/
├── unit/
│   ├── tree-debugger.test.ts          # Basic debugger tests
│   ├── tree-debugger-incremental.test.ts  # Incremental update tests
│   └── event-replayer.test.ts         # Replayer tests
├── helpers/
│   └── tree-verification.ts           # Tree verification helpers
└── integration/
    └── (integration tests)
```

### Test Framework

**Vitest** is used (not Jest):
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest configuration
  },
});
```

**Mock patterns:**
```typescript
// Use vi.fn() for mocks, not jest.fn()
const mockFn = vi.fn();

// Use vi.mock() for module mocking
vi.mock('../module', () => ({
  function: vi.fn(),
}));
```

## Test Structure for replay()

### Test File

Create: `src/__tests__/unit/tree-debugger-replay.test.ts`

### Test Suite Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkflowTreeDebugger } from '../../debugger/tree-debugger.js';
import { Workflow } from '../../core/workflow.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';

describe('WorkflowTreeDebugger.replay', () => {
  const testDir = '/tmp/test-replay';
  const testFile = join(testDir, 'test-events.json');

  beforeEach(async () => {
    // Create test directory
    // Setup test fixtures
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await unlink(testFile);
    } catch {
      // File might not exist
    }
  });

  describe('happy path', () => {
    it('should create debugger from valid event file', async () => {
      // Arrange
      const events = createTestEvents();
      await writeFile(testFile, JSON.stringify(events), 'utf-8');

      // Act
      const debugger = await WorkflowTreeDebugger.replay(testFile);

      // Assert
      expect(debugger).toBeInstanceOf(WorkflowTreeDebugger);
      expect(debugger.getTree()).toBeDefined();
    });

    it('should reconstruct tree structure correctly', async () => {
      // Arrange
      const workflow = createTestWorkflow();
      const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
      await workflow.run();
      await liveDebugger.saveEventHistory(testFile);

      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);

      // Assert
      expect(replayDebugger.getTree().name).toBe('TestWorkflow');
      expect(replayDebugger.getTree().children.length).toBeGreaterThan(0);
    });

    it('should create read-only debugger', async () => {
      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);

      // Assert: No event accumulation
      expect(replayDebugger.getEventHistory()).toEqual([]);

      // Assert: persistEvents is false
      // Note: persistEvents is private, test via behavior
      await expect(
        replayDebugger.saveEventHistory('./any-path.json')
      ).rejects.toThrow('Event persistence is not enabled');
    });
  });

  describe('error handling', () => {
    it('should throw for non-existent file', async () => {
      await expect(
        WorkflowTreeDebugger.replay('./non-existent.json')
      ).rejects.toThrow('Event history file not found');
    });

    it('should throw for invalid JSON', async () => {
      await writeFile(testFile, '{ invalid json }', 'utf-8');

      await expect(
        WorkflowTreeDebugger.replay(testFile)
      ).rejects.toThrow('Invalid JSON');
    });

    it('should throw for empty event array', async () => {
      await writeFile(testFile, '[]', 'utf-8');

      await expect(
        WorkflowTreeDebugger.replay(testFile)
      ).rejects.toThrow('Events array is empty');
    });

    it('should throw for invalid event structure', async () => {
      const invalidEvents = [{ type: 'invalidType' }];
      await writeFile(testFile, JSON.stringify(invalidEvents), 'utf-8');

      await expect(
        WorkflowTreeDebugger.replay(testFile)
      ).rejects.toThrow(); // Replayer will fail to establish root
    });
  });

  describe('debugger functionality', () => {
    it('should support tree rendering', async () => {
      // Arrange
      const workflow = createTestWorkflow();
      const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
      await workflow.run();
      await liveDebugger.saveEventHistory(testFile);

      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
      const treeString = replayDebugger.toTreeString();

      // Assert
      expect(treeString).toContain('TestWorkflow');
      expect(treeString).toContain('['); // Contains status symbols
    });

    it('should support node lookup', async () => {
      // Arrange
      const workflow = createTestWorkflow();
      const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
      await workflow.run();
      await liveDebugger.saveEventHistory(testFile);

      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
      const root = replayDebugger.getTree();
      const node = replayDebugger.getNode(root.id);

      // Assert
      expect(node).toBeDefined();
      expect(node?.id).toBe(root.id);
    });

    it('should support statistics', async () => {
      // Arrange
      const workflow = createTestWorkflow();
      const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
      await workflow.run();
      await liveDebugger.saveEventHistory(testFile);

      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
      const stats = replayDebugger.getStats();

      // Assert
      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.byStatus).toBeDefined();
    });

    it('should support log collection', async () => {
      // Arrange
      const workflow = createTestWorkflow();
      const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
      await workflow.run();
      await liveDebugger.saveEventHistory(testFile);

      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
      const logString = replayDebugger.toLogString();

      // Assert
      // Log string should be valid (may be empty if no logs)
      expect(typeof logString).toBe('string');
    });
  });

  describe('integration with loadEventHistory', () => {
    it('should reuse loadEventHistory method', async () => {
      // This tests that replay() uses the existing loadEventHistory()
      // by verifying the same error messages

      await expect(
        WorkflowTreeDebugger.replay('./missing.json')
      ).rejects.toThrow('Event history file not found');
    });
  });

  describe('integration with WorkflowEventReplayer', () => {
    it('should pass events to replayer correctly', async () => {
      // Arrange
      const events = createComplexTestEvents();
      await writeFile(testFile, JSON.stringify(events), 'utf-8');

      // Act
      const replayDebugger = await WorkflowTreeDebugger.replay(testFile);

      // Assert: Replayer successfully reconstructed tree
      expect(replayDebugger.getTree()).toBeDefined();
    });
  });
});
```

## Test Fixtures

### createTestEvents()

```typescript
function createTestEvents(): unknown[] {
  return [
    {
      type: 'treeUpdated',
      timestamp: Date.now(),
      rootId: 'wf-test-1',
      rootName: 'TestWorkflow',
    },
    {
      type: 'stateSnapshot',
      timestamp: Date.now(),
      nodeId: 'wf-test-1',
      nodeName: 'TestWorkflow',
      stateSnapshot: { count: 0 },
    },
  ];
}
```

### createTestWorkflow()

```typescript
import { Workflow } from '../../core/workflow.js';

class TestWorkflow extends Workflow {
  constructor() {
    super({ name: 'TestWorkflow' }, async (ctx) => {
      await ctx.step('testStep', () => {
        ctx.log('info', 'Test log message');
        return { result: 'success' };
      });
      return { result: 'success' };
    });
  }
}

function createTestWorkflow(): Workflow {
  return new TestWorkflow();
}
```

### createComplexTestEvents()

```typescript
function createComplexTestEvents(): unknown[] {
  const now = Date.now();
  return [
    // Root node
    {
      type: 'treeUpdated',
      timestamp: now,
      rootId: 'wf-root',
      rootName: 'RootWorkflow',
    },
    // Child attachment
    {
      type: 'childAttached',
      timestamp: now + 1,
      parentId: 'wf-root',
      childId: 'wf-child-1',
      childName: 'ChildWorkflow',
      childStatus: 'idle',
    },
    // State snapshot
    {
      type: 'stateSnapshot',
      timestamp: now + 2,
      nodeId: 'wf-root',
      nodeName: 'RootWorkflow',
      stateSnapshot: { value: 42 },
    },
    // Step events
    {
      type: 'stepStart',
      timestamp: now + 3,
      nodeId: 'wf-root',
      nodeName: 'RootWorkflow',
      step: 'processData',
    },
    {
      type: 'stepEnd',
      timestamp: now + 4,
      nodeId: 'wf-root',
      nodeName: 'RootWorkflow',
      step: 'processData',
      duration: 100,
    },
  ];
}
```

## Test Cleanup

### afterEach Pattern

```typescript
afterEach(async () => {
  // Clean up test files
  const testFiles = [
    testFile,
    './test-events.json',
    './test-output.json',
  ];

  for (const file of testFiles) {
    try {
      await unlink(file);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
});
```

## Integration Tests

### Full Round-Trip Test

```typescript
describe('round-trip integration', () => {
  it('should save and replay with same tree structure', async () => {
    // Arrange: Create and run workflow
    const workflow = createComplexWorkflow();
    const liveDebugger = new WorkflowTreeDebugger(workflow, { persistEvents: true });
    await workflow.run();

    // Capture live state
    const liveTree = liveDebugger.getTree();
    const liveStats = liveDebugger.getStats();

    // Act: Save and replay
    await liveDebugger.saveEventHistory(testFile);
    const replayDebugger = await WorkflowTreeDebugger.replay(testFile);

    // Assert: Compare structures
    const replayTree = replayDebugger.getTree();
    const replayStats = replayDebugger.getStats();

    expect(replayTree.name).toBe(liveTree.name);
    expect(replayStats.totalNodes).toBe(liveStats.totalNodes);
  });
});
```

## Test Helpers

### Tree Comparison Helper

```typescript
function assertTreesEqual(actual: WorkflowNode, expected: WorkflowNode): void {
  expect(actual.id).toBe(expected.id);
  expect(actual.name).toBe(expected.name);
  expect(actual.status).toBe(expected.status);
  expect(actual.children.length).toBe(expected.children.length);

  for (let i = 0; i < actual.children.length; i++) {
    assertTreesEqual(actual.children[i], expected.children[i]);
  }
}
```

## Performance Tests

### Large Event File Test

```typescript
describe('performance', () => {
  it('should handle large event files', async () => {
    // Arrange: Create 10,000 events
    const largeEvents: unknown[] = [];
    for (let i = 0; i < 10000; i++) {
      largeEvents.push({
        type: 'stateSnapshot',
        timestamp: Date.now() + i,
        nodeId: `node-${i}`,
        nodeName: `Node${i}`,
        stateSnapshot: { index: i },
      });
    }
    await writeFile(testFile, JSON.stringify(largeEvents), 'utf-8');

    // Act: Measure replay time
    const startTime = Date.now();
    const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
    const duration = Date.now() - startTime;

    // Assert
    expect(replayDebugger).toBeDefined();
    console.log(`Replayed 10,000 events in ${duration}ms`);
  });
});
```

## Edge Cases

### Boundary Conditions

```typescript
describe('edge cases', () => {
  it('should handle single event', async () => {
    const singleEvent = [{
      type: 'treeUpdated',
      timestamp: Date.now(),
      rootId: 'wf-1',
      rootName: 'SingleWorkflow',
    }];
    await writeFile(testFile, JSON.stringify(singleEvent), 'utf-8');

    const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
    expect(replayDebugger.getTree()).toBeDefined();
  });

  it('should handle events with null/undefined fields', async () => {
    const events = [{
      type: 'stateSnapshot',
      timestamp: Date.now(),
      nodeId: 'wf-1',
      nodeName: 'TestWorkflow',
      stateSnapshot: null, // Null snapshot
    }];
    await writeFile(testFile, JSON.stringify(events), 'utf-8');

    const replayDebugger = await WorkflowTreeDebugger.replay(testFile);
    expect(replayDebugger.getTree()).toBeDefined();
  });
});
```

## References

- Vitest Documentation: https://vitest.dev/
- existing test patterns in `src/__tests__/unit/tree-debugger.test.ts`
- existing test patterns in `src/__tests__/unit/event-replayer.test.ts`

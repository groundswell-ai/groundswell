# Existing Test Patterns for Performance Testing

**Task**: P1.M4.T2.S2 - Check for performance regressions
**Date**: 2026-01-12

## Overview

This document analyzes existing performance testing patterns in the codebase to guide the creation of new performance regression tests.

## Existing Performance Test Location

**File**: `/home/dustin/projects/groundswell/src/__tests__/adversarial/deep-hierarchy-stress.test.ts`

This file contains performance-focused stress tests for deep hierarchy operations.

## Key Test Pattern: Performance Threshold Testing

### Test Structure (lines 153-187)

```typescript
it('should complete deep tree operations within acceptable time', () => {
  const DEPTH = 1000;
  const root = new SimpleWorkflow('Root');
  let current: any = root;

  // Build deep hierarchy
  for (let i = 0; i < DEPTH; i++) {
    current = new SimpleWorkflow(`Child-${i}`, current);
  }

  // Measure getRoot() performance
  const startTime = performance.now();
  const foundRoot = (current as any).getRoot();
  const getRootDuration = performance.now() - startTime;

  expect(foundRoot.id).toBe(root.id);
  expect(getRootDuration).toBeLessThan(100); // < 100ms threshold

  // Measure isDescendantOf() performance
  const measureStart = performance.now();
  const isDescendant = (current as any).isDescendantOf(root);
  const checkDuration = performance.now() - measureStart;

  expect(isDescendant).toBe(true);
  expect(checkDuration).toBeLessThan(100); // < 100ms threshold

  // Total operations should complete well under 1 second
  const totalStartTime = performance.now();
  for (let i = 0; i < 100; i++) {
    (current as any).getRoot();
    (current as any).isDescendantOf(root);
  }
  const totalDuration = performance.now() - totalStartTime;
  expect(totalDuration).toBeLessThan(1000); // 100 iterations < 1 second
});
```

### Pattern Components

1. **Setup phase**: Create large test data structure (1000-deep tree)
2. **Single operation measurement**: Time individual operations
3. **Threshold assertion**: `expect(duration).toBeLessThan(100)`
4. **Bulk operation measurement**: Time repeated operations
5. **Correctness validation**: Verify functional correctness alongside timing

## Performance Threshold Standards

| Operation Type      | Threshold | Rationale                              |
|---------------------|-----------|----------------------------------------|
| Single operation    | < 100ms   | Fast enough for UI responsiveness       |
| Bulk (100 iterations) | < 1000ms | 10ms per operation average          |
| Deep traversal      | < 100ms   | Even for 1000-level deep chains        |

## Test File Structure Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';

class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Deep Hierarchy Stress Tests', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should complete within acceptable time', () => {
    // Test implementation
  });
});
```

## Workflow Creation Patterns

### Deep Hierarchy Creation (lines 94-101)

```typescript
const DEPTH = 1000;
const root = new SimpleWorkflow('Root');
let current: any = root;

for (let i = 0; i < DEPTH; i++) {
  const child = new SimpleWorkflow(`Child-${i}`, current);
  current = child;
}
```

### Wide Hierarchy Creation (pattern from integration tests)

```typescript
const NUM_CHILDREN = 100;
const parent = new SimpleWorkflow('Parent');

for (let i = 0; i < NUM_CHILDREN; i++) {
  const child = new SimpleWorkflow(`Child-${i}`);
  parent.attachChild(child);
}
```

## Timing Measurement API

### performance.now() - High Precision Timing

```typescript
const startTime = performance.now();
// operation to measure
const duration = performance.now() - startTime;
```

**Advantages**:
- Sub-millisecond precision
- Monotonic (guaranteed to increase)
- Not affected by system clock changes

**Usage in codebase**:
- `src/core/workflow.ts:451,468` - Workflow timing
- `src/core/workflow-context.ts:87,130` - Step timing
- `src/core/logger.ts:39` - Log timestamps (uses Date.now())

## Helper Utilities Available

### Tree Verification Functions

From `/home/dustin/projects/groundswell/src/__tests__/helpers/tree-verification.ts`:

```typescript
import {
  verifyBidirectionalLink,  // Verify parent<->child link in both trees
  verifyTreeMirror,         // Verify 1:1 correspondence between workflow and node trees
  verifyOrphaned,          // Verify child is detached from all parents
  verifyNoCycles,          // Verify no circular references
  validateTreeConsistency, // Comprehensive validation, returns errors array
  collectAllNodes,         // BFS traversal, returns all nodes
  getDepth,               // Calculate node depth in tree
} from '../helpers/tree-verification.js';
```

## Test Naming Conventions

- Performance tests: `"should complete deep tree operations within acceptable time"`
- Stress tests: `"should create 1000+ level deep workflow hierarchy"`
- Feature tests: `"should call getRoot() on deepest child without stack overflow"`

## Performance Assertion Patterns

### Individual Operation Timing

```typescript
const startTime = performance.now();
operation();
const duration = performance.now() - startTime;
expect(duration).toBeLessThan(100); // ms threshold
```

### Bulk Operation Timing

```typescript
const totalStartTime = performance.now();
for (let i = 0; i < 100; i++) {
  operation();
}
const totalDuration = performance.now() - totalStartTime;
expect(totalDuration).toBeLessThan(1000); // total threshold
```

### Average Time Calculation

```typescript
const times: number[] = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  operation();
  times.push(performance.now() - start);
}
const avg = times.reduce((a, b) => a + b, 0) / times.length;
expect(avg).toBeLessThan(10); // average threshold
```

## Integration Test Patterns

### Observer Setup Pattern

```typescript
const events: WorkflowEvent[] = [];
const observer: WorkflowObserver = {
  onLog: () => {},
  onEvent: (event) => events.push(event),
  onStateUpdated: () => {},
  onTreeChanged: () => {},
};
parent.addObserver(observer);
```

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should do something', () => {
  // ARRANGE: Setup test data
  const root = new SimpleWorkflow('Root');

  // ACT: Execute operation
  const child = new SimpleWorkflow('Child', root);

  // ASSERT: Verify results
  expect(child.parent).toBe(root);
});
```

## Test Categories

Based on codebase analysis, performance tests fall into these categories:

1. **Deep hierarchy tests**: 1000+ level deep chains
2. **Wide hierarchy tests**: 100+ children per parent
3. **Bulk operation tests**: 100+ sequential operations
4. **Stress tests**: Extreme conditions (2000+ levels)
5. **Functional validation**: Ensure correctness alongside performance

## NPM Test Commands

From `/home/dustin/projects/groundswell/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  }
}
```

## Recommendations for New Performance Test

Based on existing patterns, the new performance test should:

1. **Follow existing file structure**: Use `src/__tests__/adversarial/` or create new `src/__tests__/benchmarks/`
2. **Use SimpleWorkflow class**: Already defined in existing tests
3. **Use performance.now()**: Consistent with existing tests
4. **Set reasonable thresholds**: < 100ms single, < 1000ms bulk
5. **Include correctness assertions**: Don't just test speed
6. **Test multiple scenarios**: Deep, wide, and mixed trees
7. **Use beforeEach/afterEach**: Console mocking and cleanup
8. **Include JSDoc documentation**: Explain test purpose and patterns

## References

- Existing performance test: `src/__tests__/adversarial/deep-hierarchy-stress.test.ts`
- Tree verification helpers: `src/__tests__/helpers/tree-verification.ts`
- Integration test examples: `src/__tests__/integration/workflow-reparenting.test.ts`
- Package configuration: `package.json` (vitest, test scripts)

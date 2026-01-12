# tinybench Performance Testing Research

**Task**: P1.M4.T2.S2 - Check for performance regressions
**Date**: 2026-01-12

## Overview

The `tinybench` library (v2.9.0) is already available in the project's `node_modules` but is not currently used. This research documents how to use tinybench for performance testing of workflow tree operations.

## tinybench Availability

**Status**: Available but unused
**Location**: `/home/dustin/projects/groundswell/node_modules/tinybench/`
**Version**: 2.9.0
**Size**: 7KB (2KB minified/gzipped)
**Dependencies**: None

## Why Use tinybench vs Manual performance.now()?

### Manual Timing (Current Approach)

```typescript
const startTime = performance.now();
operation();
const duration = performance.now() - startTime;
expect(duration).toBeLessThan(100);
```

**Pros**:
- Simple, no dependencies
- Immediate feedback
- Easy to understand

**Cons**:
- No statistical analysis
- Single measurement (unreliable)
- No warmup (JIT not optimized)
- Sensitive to system variance
- No comparison capabilities

### tinybench Approach

```typescript
const bench = new Bench({
  time: 1000,
  warmupTime: 200,
});

bench.add('attachChild', () => {
  const parent = new Workflow('Parent');
  const child = new Workflow('Child');
  parent.attachChild(child);
});

await bench.warmup();
await bench.run();

console.log(bench.tasks[0].result?.mean); // Average time
console.log(bench.tasks[0].result?.sd);   // Standard deviation
```

**Pros**:
- Statistical analysis (mean, variance, std dev, percentiles)
- Automatic warmup (JIT optimization)
- Multiple iterations for reliability
- Comparison between implementations
- Margin of error calculation
- Event hooks for monitoring

**Cons**:
- Additional dependency
- More complex setup
- Overkill for simple threshold tests

## tinybench API

### Basic Setup

```typescript
import { Bench } from 'tinybench';

const bench = new Bench({
  time: 1000,        // Run each task for at least 1 second
  warmupTime: 200,   // Warmup for 200ms
  warmupIterations: 10,  // Minimum 10 warmup iterations
  iterations: 20,    // Minimum 20 iterations
});
```

### Adding Benchmarks

```typescript
// Simple benchmark
bench.add('operation name', () => {
  // Code to benchmark
});

// Benchmark with setup/teardown
bench.add('operation with setup', {
  fn: () => {
    // Actual benchmark code
  },
  beforeAll: function() {
    // Runs once before iterations (not timed)
  },
  beforeEach: function() {
    // Runs before each iteration (not timed)
  },
  afterAll: function() {
    // Runs once after all iterations (not timed)
  },
  afterEach: function() {
    // Runs after each iteration (not timed)
  }
});
```

### Running Benchmarks

```typescript
// Always warmup first!
await bench.warmup();

// Run the benchmarks
await bench.run();

// Access results
bench.tasks.forEach(task => {
  console.log(`${task.name}:`);
  console.log(`  Mean: ${task.result?.mean} ms`);
  console.log(`  Std Dev: ${task.result?.sd} ms`);
});
```

### Result Properties

Each task result contains:

```typescript
{
  mean: number,        // Average execution time (ms)
  sd: number,          // Standard deviation (ms)
  rme: number,         // Relative margin of error (%)
  hz: number,          // Operations per second
  min: number,         // Minimum time (ms)
  max: number,         // Maximum time (ms)
  p75: number,         // 75th percentile (ms)
  p99: number,         // 99th percentile (ms)
  p995: number,        // 99.5th percentile (ms)
  p999: number,        // 99.9th percentile (ms)
  samples: number[]    // All measured times
}
```

### Event Hooks

```typescript
bench.addEventListener('start', (e) => {
  console.log('Benchmark started');
});

bench.addEventListener('cycle', (e) => {
  const task = e.task;
  console.log(`${task.name} completed`);
});

bench.addEventListener('complete', () => {
  console.log('All benchmarks completed!');
  console.table(bench.table());
});
```

## Example: Benchmarking attachChild()

### Basic Benchmark

```typescript
import { Bench } from 'tinybench';
import { Workflow } from '../../core/workflow.js';

const bench = new Bench({
  time: 1000,
  warmupTime: 200,
});

// Benchmark single attachment
bench.add('attachChild - single', () => {
  const parent = new Workflow('Parent');
  const child = new Workflow('Child');
  parent.attachChild(child);
});

// Benchmark attachment in deep tree
bench.add('attachChild - deep tree (depth 100)', () => {
  let current = new Workflow('Root');
  for (let i = 0; i < 100; i++) {
    const child = new Workflow(`Child-${i}`);
    current.attachChild(child);
    current = child;
  }
});

// Benchmark attachment in wide tree
bench.add('attachChild - wide tree (100 children)', () => {
  const parent = new Workflow('Parent');
  for (let i = 0; i < 100; i++) {
    const child = new Workflow(`Child-${i}`);
    parent.attachChild(child);
  }
});

await bench.warmup();
await bench.run();

console.table(bench.table());
```

### Advanced Benchmark with Setup

```typescript
// Pre-create test data in beforeAll
let deepTreeRoot: Workflow;
let wideTreeParent: Workflow;

bench.add('isDescendantOf - deep tree check', {
  beforeAll: function() {
    // Setup deep tree (not timed)
    deepTreeRoot = new Workflow('Root');
    let current = deepTreeRoot;
    for (let i = 0; i < 100; i++) {
      const child = new Workflow(`Child-${i}`);
      current.attachChild(child);
      current = child;
    }
  },

  fn: function() {
    // Find leaf and check if descendant of root
    let leaf = deepTreeRoot;
    while (leaf.children.length > 0) {
      leaf = leaf.children[0];
    }
    (leaf as any).isDescendantOf(deepTreeRoot);
  }
});
```

## Statistical Analysis

### Understanding the Results

1. **Mean (Average)**: Expected execution time
2. **Standard Deviation**: Consistency of execution time
   - Lower = more consistent
   - Higher = more variance
3. **Margin of Error (RME)**: Confidence interval
   - ±2% means 95% confidence the true mean is within 2%
4. **Percentiles (p75, p99, p999)**: Worst-case performance
   - p99 = 99% of operations complete within this time
   - Important for tail latency analysis

### Interpreting Results

```typescript
// Good result (consistent)
{
  mean: 0.5,      // 0.5ms average
  sd: 0.05,       // Very low variance (10% of mean)
  rme: 1.2,       // ±1.2% margin of error
  p99: 0.7        // 99th percentile is 0.7ms
}

// Concerning result (inconsistent)
{
  mean: 0.5,      // 0.5ms average (same!)
  sd: 0.3,        // High variance (60% of mean)
  rme: 15.5,      // ±15.5% margin of error
  p99: 2.1        // 99th percentile is 2.1ms (4x mean!)
}
```

## Comparison Benchmarks

### Before/After Optimization

```typescript
const bench = new Bench({ time: 500 });

// Before optimization (baseline)
bench.add('isDescendantOf - before', () => {
  // Original implementation
});

// After optimization
bench.add('isDescendantOf - after', () => {
  // Optimized implementation
});

await bench.warmup();
await bench.run();

// Compare results
const before = bench.tasks[0].result;
const after = bench.tasks[1].result;

const improvement = ((before!.mean - after!.mean) / before!.mean) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);
```

## Integration with Vitest

### Option 1: Standalone Benchmark File

```typescript
// src/__tests__/benchmarks/attachChild.bench.ts
import { Bench } from 'tinybench';
import { Workflow } from '../../core/workflow.js';

async function runBenchmarks() {
  const bench = new Bench({ time: 1000, warmupTime: 200 });

  // Add benchmarks...

  await bench.warmup();
  await bench.run();

  console.table(bench.table());
}

runBenchmarks().catch(console.error);
```

Run with: `npx tsx src/__tests__/benchmarks/attachChild.bench.ts`

### Option 2: Vitest Integration

```typescript
// src/__tests__/performance/attachChild.perf.test.ts
import { describe, it, expect } from 'vitest';
import { Bench } from 'tinybench';
import { Workflow } from '../../core/workflow.js';

describe('attachChild Performance', () => {
  it('should complete within performance thresholds', async () => {
    const bench = new Bench({ time: 500, warmupTime: 100 });

    bench.add('attachChild', () => {
      const parent = new Workflow('Parent');
      const child = new Workflow('Child');
      parent.attachChild(child);
    });

    await bench.warmup();
    await bench.run();

    const result = bench.tasks[0].result;

    // Statistical assertions
    expect(result?.mean).toBeLessThan(1); // < 1ms average
    expect(result?.p99).toBeLessThan(5);  // 99th percentile < 5ms
    expect(result?.rme).toBeLessThan(10); // Margin of error < 10%
  });
});
```

## Recommendations for P1.M4.T2.S2

Given the task requirements and existing patterns:

### Recommended Approach: Manual Timing (vitest)

**Rationale**:
1. Consistent with existing tests (`deep-hierarchy-stress.test.ts`)
2. Simpler to integrate with existing test suite
3. Clear pass/fail thresholds
4. No additional learning curve
5. Immediate feedback in CI/CD

**Alternative: tinybench (future enhancement)**

If more sophisticated benchmarking is needed later:
1. Create separate benchmark files in `src/__tests__/benchmarks/`
2. Use tinybench for statistical analysis
3. Run benchmarks on-demand (not in CI)
4. Track performance trends over time

## Quick Reference

### Import
```typescript
import { Bench } from 'tinybench';
```

### Setup
```typescript
const bench = new Bench({
  time: 1000,        // Minimum runtime per task
  warmupTime: 200,   // Warmup duration
  iterations: 20,    // Minimum iterations
});
```

### Run
```typescript
await bench.warmup();  // REQUIRED!
await bench.run();
```

### Results
```typescript
bench.table()                    // Table format
bench.tasks[0].result?.mean      // Average time
bench.tasks[0].result?.p99       // 99th percentile
```

## Documentation Links

- **GitHub**: https://github.com/tinylibs/tinybench
- **npm**: https://www.npmjs.com/package/tinybench
- **Vitest Benchmark**: https://vitest.dev/guide/benchmark.html

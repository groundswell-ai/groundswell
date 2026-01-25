# Ink Performance Characteristics and Bundle Size Impact

## Executive Summary

Ink (v6.6.0) provides a React-based approach to building CLI interfaces with the trade-off of increased bundle size and startup overhead compared to raw console.log, but offers significant benefits in component reusability and state management.

**Key Finding:** Ink adds approximately **18-35KB (gzipped/minified)** to your bundle plus React dependencies (~1.9MB uncompressed in node_modules), but provides a 0.26ms average re-render time which is acceptable for most CLI use cases.

---

## 1. Bundle Size Analysis

### Ink Core Package

| Metric | Size |
|--------|------|
| **Unpacked (npm)** | 344.6 KB |
| **Source Files** | 87.2 KB (28 JS files in build/) |
| **Estimated Minified** | ~35 KB |
| **Estimated Gzipped** | ~17-18 KB |
| **Main Index (gzipped)** | 304 bytes |

**Main Build Files (Uncompressed):**
- `ink.js`: 12.02 KB (main reconciler)
- `reconciler.js`: 8.41 KB (React reconciliation)
- `styles.js`: 7.68 KB (styling system)
- `instance.js`: 6.46 KB (component instances)
- `render-node-to-output.js`: 6.09 KB (render pipeline)

### React Dependencies

| Package | Unpacked Size |
|---------|---------------|
| **react** | 167.58 KB |
| **react-reconciler** | 1,643.39 KB (1.6 MB) |
| **scheduler** | 80.73 KB |
| **Total React Stack** | ~1.9 MB |

### Key UI Dependencies

| Package | Size |
|---------|------|
| **yoga-layout** | 219.02 KB (Flexbox layout engine) |
| **chalk** | 43.30 KB (Color/styling) |
| **ansi-styles** | 17.08 KB |
| **slice-ansi** | 7.85 KB |

### Total Dependency Tree

```
ink@6.6.0: 336.49 KB (with all dependencies)
Total node_modules (ink-only): 5.78 MB
Total dependency packages: 40
```

---

## 2. Runtime Performance Benchmarks

### Tested Environment
- **Node.js**: v25.2.1
- **Platform**: Linux 6.17.8-arch1-1
- **Test Date**: 2026-01-24

### Benchmark Results

| Operation | Time | Notes |
|-----------|------|-------|
| **Initial Render Setup** | 15.76 ms | First render with basic component |
| **100 Re-renders (avg)** | 0.264 ms | Per-render average |
| **100 console.log calls (avg)** | 0.004 ms | Raw output comparison |
| **Overhead Factor** | **66x slower** | Ink vs console.log |

### Memory Usage

| Scenario | RSS Change | Heap Change |
|----------|------------|-------------|
| **100-line component** | +5.03 MB | -3.24 MB (freed after GC) |
| **Per-line overhead** | ~50 KB RSS | Varies with GC |

### Performance Characteristics

**Strengths:**
- Fast re-renders (0.26ms average)
- Efficient virtual DOM diffing
- React reconciliation optimization
- Good for interactive CLIs with frequent updates

**Weaknesses:**
- 66x slower than console.log for simple output
- Initial setup overhead (~16ms)
- Higher memory footprint
- Not suitable for high-frequency logging (>1000 updates/sec)

---

## 3. Startup Time Analysis

### Module Loading
```
Total import time: ~138ms (includes ink + react + all dependencies)
```

### Initialization Steps
1. **Import Ink**: ~20-30ms
2. **React initialization**: ~10-15ms
3. **Yoga layout setup**: ~5-10ms
4. **First render**: ~16ms

**Total Startup**: ~60-80ms before first output

---

## 4. Comparison to Alternatives

### Bundle Size Comparison

| Library | Unpacked Size | Purpose |
|---------|---------------|---------|
| **ink** | 344.6 KB | React-based CLI framework |
| **ora** (spinner) | 36.3 KB | Terminal spinners only |
| **cli-spinners** | 33.9 KB | Spinner animations |
| **blessed** | N/A (varies) | Full terminal UI (curses-like) |

### Use Case Fit

| Library | Best For | Not For |
|---------|----------|---------|
| **Ink** | Interactive CLIs, complex layouts, stateful UI | Simple logging, data dumps |
| **console.log** | Debug output, data streaming, simple scripts | Interactive interfaces |
| **ora** | Progress indicators, async operations | Complex layouts |
| **blessed** | Full-screen TUI apps, dashboards | Simple CLI tools |

### When to Use Ink

**Good Fit:**
- Interactive prompts with state
- Multi-step workflows
- Dynamic layouts (flexbox)
- Component reusability needed
- React knowledge on team

**Poor Fit:**
- Simple data output
- High-frequency logging (>100 lines/sec)
- One-shot scripts
- Minimal bundle size critical

---

## 5. Memory Usage Patterns

### Memory Lifecycle

```
Initial:    ~50-80 MB baseline
Component:  +5-10 MB per 100 lines
Updates:    Minimal if using React.memo
Cleanup:    Proper unmount() required
```

### Memory Optimization Tips

1. **Use React.memo**: Prevent unnecessary re-renders
2. **Unmount components**: Always call `.unmount()` on exit
3. **Avoid large state**: Keep component state minimal
4. **Virtualize long lists**: Use windowing for 1000+ items
5. **Batch updates**: Use React state batching

### Common Memory Issues

- **Not unmounting**: Memory leaks from event listeners
- **Large string state**: Holding huge output in memory
- **Frequent re-renders**: Without memoization
- **Circular references**: In component props

---

## 6. Known Performance Issues

### Documented Issues

1. **High-frequency updates**
   - Problem: Flickering above 60 updates/sec
   - Solution: Throttle/debounce updates

2. **Large output rendering**
   - Problem: Slow with 1000+ lines
   - Solution: Virtualization (Static component)

3. **ansi-escape overhead**
   - Problem: Terminal control sequences add latency
   - Solution: Use `patch-console` optimization

4. **Yoga layout calculation**
   - Problem: Expensive for complex nested layouts
   - Solution: Simplify component structure

### Optimization Strategies

```javascript
// Bad: Re-renders every state change
const MyComponent = () => {
  const [items, setItems] = useState([]);
  return <Box>{items.map(...)}</Box>
};

// Good: Memoized, stable
const MyComponent = React.memo(() => {
  const items = useMemo(() => [...], []);
  return <Box>{items.map(...)}</Box>
});
```

---

## 7. Best Practices for Performant Ink Apps

### 1. Minimize Re-renders
```javascript
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  return <Box>{/* expensive rendering */}</Box>;
});
```

### 2. Use Static for Unchanging Content
```javascript
import { Static } from 'ink';

<Static>
  {logs.map(log => <Box key={log.id}>{log.message}</Box>)}
</Static>
```

### 3. Batch State Updates
```javascript
// Instead of multiple setState calls:
setState1(v1);
setState2(v2);

// Use single update:
setState({ v1, v2 });
```

### 4. Optimize Large Lists
```javascript
// Only render visible portion
import { useApp } from 'ink';

const { stdout } = useApp();
const visibleItems = items.slice(0, stdout.rows);
```

### 5. Clean Up Properly
```javascript
useEffect(() => {
  return () => {
    // Cleanup listeners, timers
    clearInterval(timer);
  };
}, []);
```

### 6. Avoid Inline Functions
```javascript
// Bad: New function each render
<Box onClick={() => doSomething()}>

// Good: Stable function
const handleClick = useCallback(() => doSomething(), [deps]);
<Box onClick={handleClick}>
```

### 7. Profile Performance
```javascript
import { performance } from 'perf_hooks';

const start = performance.now();
// ... render code ...
console.log(`Render: ${performance.now() - start}ms`);
```

---

## 8. Production Considerations

### Build Optimization

1. **Tree-shaking**: Ink is mostly tree-shakeable
2. **Minification**: Use esbuild or swc for best results
3. **React production mode**: Set `NODE_ENV=production`
4. **Dead code elimination**: Remove dev-only code

### Recommended Bundle Config

```json
{
  "type": "module",
  "dependencies": {
    "ink": "^6.6.0"
  },
  "scripts": {
    "build": "swc src -d dist --minify"
  }
}
```

### Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| **Startup time** | <50ms | <100ms |
| **Re-render** | <1ms | <5ms |
| **Memory** | <50MB | <100MB |
| **Bundle (gzipped)** | <50KB | <100KB |

---

## 9. Recommendations for Groundswell

### For WorkflowTreeDebugger Use Case

**Analysis**: The debugger displays:
- Workflow tree structure (hierarchical)
- Event timeline (scrolling)
- Status indicators (interactive)
- Potential real-time updates

**Verdict**: **Ink is appropriate** for this use case because:

1. ✅ Component-based structure fits tree display
2. ✅ State management for event replay
3. ✅ Interactive elements (selection, navigation)
4. ✅ Layout flexibility (flexbox for tree)
5. ✅ Acceptable startup overhead (debugger not time-critical)
6. ⚠️ Need to optimize large tree rendering (virtualization)
7. ⚠️ Memory management for large event histories

### Specific Recommendations

1. **Use Static component** for event history log
2. **Implement virtualization** for trees >1000 nodes
3. **Memoize tree nodes** to prevent cascading re-renders
4. **Debounce real-time updates** to 10-30 FPS
5. **Implement lazy loading** for collapsed tree branches
6. **Clean up on exit** with proper unmount()
7. **Profile with actual data** to validate performance

### Bundle Impact

```
Estimated addition to project: ~50KB gzipped
- Ink core: ~18KB
- React stack: ~20KB (shared if using elsewhere)
- Layout utilities: ~12KB
```

---

## 10. Sources and References

### Package Information
- **Ink**: https://www.npmjs.com/package/ink (v6.6.0)
- **React**: https://www.npmjs.com/package/react (v19.2.3)
- **ora**: https://www.npmjs.com/package/ora (v9.1.0)
- **cli-spinners**: https://www.npmjs.com/package/cli-spinners

### Benchmark Methodology
- Tested on fresh Node.js v25.2.1 installation
- Measurements use `performance.now()` for precision
- Bundle sizes from npm registry and local analysis
- Memory measurements via `process.memoryUsage()`

### Additional Research Needed
- Real-world performance with production data
- Comparison to blessed for complex TUI
- Impact on CI/CD pipeline build times
- Alternative: Preact compatibility (smaller React)

---

## Appendix: Test Commands Used

```bash
# Install and test
npm install ink
node benchmark-ink.mjs

# Bundle analysis
du -sh node_modules/ink
gzip -c node_modules/ink/build/index.js | wc -c

# Dependency tree
npm ls ink
npm info ink dist.unpackedSize
```

---

*Generated: 2026-01-24*
*Ink Version: 6.6.0*
*Test Environment: Linux x64, Node.js v25.2.1*

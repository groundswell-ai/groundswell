# Research Summary: Reparenting Usage Example for P1.M4.T1.S2

**Research Date**: 2026-01-12
**Purpose**: Compile research findings for creating reparenting usage example
**Repository**: /home/dustin/projects/groundswell

---

## Executive Summary

This research compiled patterns for documenting tree node reparenting operations, specifically for creating a usage example that demonstrates the detach-then-attach pattern in the Groundswell workflow library.

## Key Findings

### 1. Wrong/Right Pattern Documentation

**Most Effective Pattern**:
```typescript
// WRONG: Direct attachChild() to new parent
parent2.attachChild(child); // THROWS: Error - child already has parent

// RIGHT: Detach first, then attach
parent1.detachChild(child);  // child.parent becomes null
parent2.attachChild(child);  // child.parent becomes parent2
```

**Source**: Analysis of existing codebase patterns and JSDoc best practices

### 2. Error Message Format

Groundswell's attachChild() throws descriptive error:
```
Error: Child 'Child' already has a parent 'Parent1'.
A workflow can only have one parent.
Use detachChild() on 'Parent1' first if you need to reparent.
```

**Key Elements**:
- Entity names included
- Invariant stated (single-parent rule)
- Remediation provided (call detachChild first)

**Source**: `src/core/workflow.ts` lines 271-279

### 3. Tree Structure Visualization

Use existing `WorkflowTreeDebugger.toTreeString()` for ASCII tree output:
```
Parent1 [completed]
  └── Child [completed]
```

**Source**: `examples/examples/03-parent-child.ts` lines 206-213

### 4. Observer Propagation Pattern

After reparenting, events from child go to NEW parent's observers.

**Test Pattern**: `src/__tests__/integration/workflow-reparenting.test.ts` lines 89-127
- Create observers for both parents
- Verify old parent observer stops receiving events
- Verify new parent observer receives events

### 5. Example File Structure

**Pattern from**: `examples/examples/03-parent-child.ts`

```typescript
/**
 * Example X: [Title]
 *
 * Demonstrates:
 * - [Feature 1]
 * - [Feature 2]
 */

import { Workflow, Step, ... } from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';

// Example classes...

export async function runXxxExample(): Promise<void> {
  printHeader('Example X: [Title]');

  // Section 1...
  printSection('1. [Section Name]');

  // Section 2...
  // ...

  // Summary...
  printSection('Summary');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runXxxExample().catch(console.error);
}
```

## Codebase Patterns Found

### Import Patterns
- Use `.js` extension for ESM imports: `from '../utils/helpers.js'`
- Import from 'groundswell' for library exports

### Utility Functions
- `printHeader(title)`: Display section header
- `printSection(title)`: Display subsection
- `sleep(ms)`: Async delay

### Decorators
- `@Step({ trackTiming: true })`: Step with timing
- `@ObservedState()`: Observable property
- `@Task()`: Child workflow spawning

### Class Patterns
- Extend `Workflow` base class
- Implement `async run()` method
- Use `this.setStatus()` for status changes
- Use `this.logger.info()` for logging

## External References

| Resource | URL | Relevance |
|----------|-----|-----------|
| TypeScript JSDoc | https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html | JSDoc patterns |
| JSDoc Official | https://jsdoc.app/ | Tag reference |
| MDN Error Handling | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling | Try/catch patterns |

## Recommended Example Structure

1. **Header/Setup**
   - Import statements
   - Simple workflow class
   - Observer class for event tracking

2. **Section 1: The WRONG Way**
   - Create parent1, parent2, child
   - Show `parent2.attachChild(child)` (throws error)
   - Catch and display error with explanation

3. **Section 2: The RIGHT Way**
   - Reset with fresh workflows
   - Show `detachChild()` then `attachChild()`
   - Display tree before/after

4. **Section 3: Observer Propagation**
   - Attach observers to both parents
   - Verify observer updates after reparenting

5. **Section 4: Error Handling**
   - Demonstrate proper try/catch patterns
   - Show various error conditions

6. **Summary**
   - List key takeaways
   - Show reparenting pattern

## Files to Modify

1. **CREATE**: `examples/examples/11-reparenting-workflows.ts`
2. **MODIFY**: `examples/index.ts` - Add import and include in examples array
3. **MODIFY**: `examples/README.md` - Add Example 11 section
4. **MODIFY**: `package.json` - Add `start:reparenting` script

---

**End of Research Summary**

name: "P1.M4.T1.S2: Create Reparenting Usage Example"
description: |

---

## Goal

**Feature Goal**: Create a comprehensive usage example that demonstrates the correct reparenting workflow pattern with clear WRONG vs RIGHT comparison, explaining why detaching before attaching is necessary.

**Deliverable**: A new example file at `examples/examples/11-reparenting-workflows.ts` that:
1. Shows the WRONG way (direct attachChild throws error)
2. Shows the RIGHT way (detach-then-attach pattern)
3. Includes complete error handling and validation
4. Explains the single-parent invariant and why it matters
5. Demonstrates tree verification before/after reparenting
6. Shows observer propagation updates after reparenting

**Success Definition**:
- Example can be run with `npm run start:reparenting` (or via tsx directly)
- Output clearly shows WRONG approach error and RIGHT approach success
- Tree visualization demonstrates structural changes
- Comments explain WHY the detach-then-attach pattern is required
- README.md is updated to include the new example

## User Persona

**Target User**: Developers using the Groundswell workflow library who need to move/reparent workflows between different parent workflows during execution.

**Use Case**: A developer has a workflow that needs to be moved from one parent to another (e.g., moving a failed task from a "fast lane" processor to a "retry lane" processor).

**User Journey**:
1. User reads documentation or examples to learn how to reparent workflows
2. User runs the reparenting example to see the pattern in action
3. User understands the WRONG way (throws error) vs RIGHT way (successful reparenting)
4. User implements reparenting in their own code with confidence

**Pain Points Addressed**:
- Without example, developers don't know about detachChild() method
- Direct attachChild() to new parent throws cryptic error without explanation
- Developers may try manual parent mutation (breaks invariants)
- No clear pattern showing proper error handling during reparenting

## Why

- **Migration Path**: Users upgrading from buggy behavior need clear pattern for reparenting
- **Error Prevention**: Demonstrates what happens when you skip detachChild()
- **Observer Updates**: Shows that observers change after reparenting (Pattern 7 from bug analysis)
- **Tree Integrity**: Explains single-parent invariant and 1:1 tree mirror requirement
- **Completes P1.M4**: This is subtask S2 of Task P1.M4.T1 (Update Documentation)

## What

Create a new example file demonstrating workflow reparenting:

### File: `examples/examples/11-reparenting-workflows.ts`

```typescript
/**
 * Example 11: Reparenting Workflows
 *
 * Demonstrates:
 * - WRONG way: Direct attachChild() throws error (single-parent invariant)
 * - RIGHT way: detachChild() then attachChild() pattern
 * - Tree structure verification before/after reparenting
 * - Observer propagation updates after reparenting
 * - Dual-tree synchronization (workflow tree + node tree)
 * - Error handling for invalid reparenting operations
 */

import {
  Workflow,
  Step,
  ObservedState,
  WorkflowTreeDebugger,
  WorkflowObserver,
  WorkflowEvent,
} from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';

// Example workflows...
```

### Content Structure

1. **Header/Setup**
   - Import statements following pattern from other examples
   - Example workflow classes (simple leaf, parent, orchestrator)
   - Observer for tracking events

2. **Section 1: The WRONG Way**
   - Create parent1, parent2, child
   - Show `parent2.attachChild(child)` directly (throws error)
   - Catch and display error with explanation
   - Explain WHY it failed (single-parent invariant)

3. **Section 2: The RIGHT Way**
   - Reset with fresh workflows
   - Show `parent1.detachChild(child)` then `parent2.attachChild(child)`
   - Verify success with assertions
   - Display tree before/after

4. **Section 3: Complete Reparenting with Observers**
   - Attach observers to both parents
   - Verify events go to correct observer after reparenting
   - Show observer propagation updates

5. **Section 4: Error Handling**
   - Demonstrate error when child not attached
   - Demonstrate error when circular reference would occur
   - Show proper try/catch patterns

### Success Criteria

- [ ] Example file created at `examples/examples/11-reparenting-workflows.ts`
- [ ] WRONG way section clearly shows error thrown
- [ ] RIGHT way section shows successful reparenting
- [ ] Comments explain WHY detach-then-attach is required
- [ ] Tree visualization shows structural changes
- [ ] README.md updated with new example description
- [ ] Example runs successfully with `npx tsx examples/examples/11-reparenting-workflows.ts`

---

## All Needed Context

### Context Completeness Check

_**"No Prior Knowledge" test passed**: This PRP contains complete file paths, exact code patterns, documentation templates, and external research findings. An AI agent unfamiliar with this codebase can implement this usage example successfully using only this PRP._

### Documentation & References

```yaml
# MUST READ - Current Workflow API methods
- file: src/core/workflow.ts
  why: Contains attachChild() and detachChild() methods with full JSDoc
  lines: 214-265 (attachChild), 307-358 (detachChild)
  pattern: Validation order: duplicate check → parent check → circular reference check
  critical: Error messages include workflow names and remediation advice

# MUST READ - Existing reparenting test patterns
- file: src/__tests__/integration/workflow-reparenting.test.ts
  why: Shows real-world reparenting usage with observer verification
  pattern: Lines 89-98 show detach-then-attach pattern
  critical: Demonstrates observer propagation updates after reparenting

# MUST READ - Example file structure and patterns
- file: examples/examples/03-parent-child.ts
  why: Template for parent-child workflow example structure
  pattern: Import statements, helper usage, printHeader/printSection
  critical: Shows @Step, @Task, @ObservedState decorator patterns

# MUST READ - Example helper utilities
- file: examples/utils/helpers.ts
  why: Contains printHeader, printSection, sleep utilities used in all examples
  pattern: Functions are imported as: import { printHeader, printSection, sleep } from '../utils/helpers.js'
  critical: Use .js extension in imports (this is ESM)

# MUST READ - Event types for observer
- file: src/types/events.ts
  why: WorkflowEvent discriminated union for observer implementation
  pattern: Lines 10-11 show childAttached and childDetached events
  critical: Observer needs onEvent, onLog, onStateUpdated, onTreeChanged methods

# MUST READ - JSDoc best practices
- docfile: plan/bugfix/P1M4T1S1/research/jsdoc_best_practices.md
  why: Documentation patterns for explaining reparenting operations
  section: "Documenting State-Mutating Methods", "Documenting Tree/Node Manipulation Methods"
  critical: Shows how to document dual-tree synchronization and invariants

# MUST READ - Previous PRP for JSDoc task (related)
- file: plan/bugfix/P1M4T1S1/PRP.md
  why: Shows attachChild/detachChild JSDoc with reparenting example
  section: Implementation Blueprint > Implementation Patterns & Key Details
  critical: Contains complete JSDoc template for reparenting workflow

# REFERENCE - Existing example 01 for basic structure
- file: examples/examples/01-basic-workflow.ts
  why: Simple example showing basic workflow structure
  pattern: Class extends Workflow, async run(), setStatus(), this.logger
  critical: Template for simple leaf workflow

# REFERENCE - Package.json scripts structure
- file: package.json
  why: Shows how examples are registered as npm scripts
  lines: scripts section with start:* patterns
  pattern: "start:reparenting": "tsx examples/examples/11-reparenting-workflows.ts"

# EXTERNAL - Tree reparenting documentation patterns
- url: https://github.com/microsoft/TypeScript
  why: Reference for high-quality documentation examples
  section: Search for "tree" or "hierarchy" in codebase for patterns

# EXTERNAL - Error handling best practices
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
  why: Reference for try/catch patterns in documentation examples
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── core/
│   │   └── workflow.ts           # Workflow class with attachChild/detachChild
│   ├── types/
│   │   ├── events.ts             # WorkflowEvent types (childAttached, childDetached)
│   │   └── workflow.ts           # WorkflowNode interface
│   └── __tests__/
│       ├── integration/
│       │   └── workflow-reparenting.test.ts  # Reference for reparenting patterns
│       └── unit/
│           └── workflow-detachChild.test.ts  # Reference for detachChild behavior
├── examples/
│   ├── examples/
│   │   ├── 01-basic-workflow.ts  # Basic workflow template
│   │   ├── 02-decorator-options.ts
│   │   ├── 03-parent-child.ts    # Parent-child workflow template
│   │   ├── 04-observers-debugger.ts
│   │   ├── 05-error-handling.ts  # Error handling patterns
│   │   ├── 06-concurrent-tasks.ts
│   │   ├── 07-agent-loops.ts
│   │   ├── 08-sdk-features.ts
│   │   ├── 09-reflection.ts
│   │   └── 10-introspection.ts
│   ├── utils/
│   │   └── helpers.ts            # printHeader, printSection, sleep utilities
│   ├── index.ts                  # Main example runner (update this)
│   └── README.md                 # Update with new example
├── plan/
│   └── bugfix/
│       ├── P1M4T1S1/
│       │   └── research/
│       │       └── jsdoc_best_practices.md  # JSDoc patterns reference
│       └── P1M4T1S2/
│           ├── PRP.md            # THIS FILE
│           └── research/
│               └── reparenting_research.md  # External research findings
└── package.json                  # Add start:reparenting script
```

### Desired Codebase Tree with Files to be Added

```bash
# CREATE new example file
├── examples/
│   └── examples/
│       └── 11-reparenting-workflows.ts  # NEW FILE - Reparenting usage example

# MODIFY existing files
├── examples/
│   ├── index.ts                  # ADD: Import and runReparentingExample
│   └── README.md                 # ADD: Section for Example 11
└── package.json                  # ADD: "start:reparenting": "tsx examples/examples/11-reparenting-workflows.ts"
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Single-parent invariant enforcement
// attachChild() throws Error if child already has a different parent
// Error message: "Child 'X' already has a parent 'Y'. Use detachChild() on 'Y' first"
// MUST call detachChild() before attachChild() when reparenting

// CRITICAL: Dual-tree synchronization
// Workflow maintains TWO parallel trees:
//   - Workflow tree: parent/children references on Workflow instances
//   - Node tree: parent/children references on WorkflowNode objects
// Both trees stay synchronized (1:1 mirror invariant)
// detachChild() and attachChild() update BOTH trees

// CRITICAL: Event emission order
// detachChild() emits childDetached event with { parentId, childId }
// attachChild() emits childAttached event with { parentId, child }
// Events trigger onTreeChanged() observer callback

// CRITICAL: Observer propagation updates
// After reparenting, events from child go to NEW parent's observers
// getRootObservers() traverses parent chain to find root
// Old parent's observers no longer receive events from reparented child

// CRITICAL: Constructor auto-attachment
// new Workflow('Child', parent) calls parent.attachChild(this) automatically
// This means child already has parent after construction
// Must detachChild() before attaching to different parent

// CRITICAL: Circular reference detection
// isDescendantOf() helper with Set-based cycle detection
// Throws immediately if circular reference would be created
// Cannot attach a workflow to its own descendant

// CRITICAL: Validation order in attachChild()
// 1. Duplicate check (child already in this.children)
// 2. Parent check (child.parent !== null && child.parent !== this)
// 3. Circular reference check (this.isDescendantOf(child))
// Document this order in example comments

// CRITICAL: Error handling patterns
// Always use try/catch when calling detachChild() and attachChild()
// Error messages include workflow names for debugging
// console.error() used before throwing (implementation detail)

// CRITICAL: Tree visualization with WorkflowTreeDebugger
// debugger.toTreeString() shows ASCII tree with status symbols
// debugger.getStats() returns node counts, log counts, event counts
# Use debugger.getNode(id) to find specific nodes in tree

// CRITICAL: ESM import syntax
// All imports use .js extension (not .ts) because this is ESM
// Import helpers as: import { printHeader, printSection, sleep } from '../utils/helpers.js'
// Import groundswell as: import { Workflow, WorkflowTreeDebugger } from 'groundswell'

// CRITICAL: Example file pattern
// Each example exports async function: export async function runXxxExample(): Promise<void>
// Example has IIFE at bottom: if (import.meta.url === `file://${process.argv[1]}`) { runXxxExample().catch(console.error); }
// Use printHeader() and printSection() for output formatting

// GOTCHA: Observer interface requires all methods
// WorkflowObserver needs: onLog(), onEvent(), onStateUpdated(), onTreeChanged()
// Can provide empty implementations for methods you don't use
# onEvent() receives discriminated union WorkflowEvent

// PATTERN: Wrong vs Right comparison
// Show WRONG way first (demonstrates the error)
// Then show RIGHT way (demonstrates success)
// Use clear comments: // WRONG: ... // RIGHT: ...

// PATTERN: Before/After tree visualization
// Print tree structure before reparenting
// Perform reparenting operation
// Print tree structure after reparenting
# Use WorkflowTreeDebugger.toTreeString() for visualization

// TESTING: How to verify example works
// 1. Run: npx tsx examples/examples/11-reparenting-workflows.ts
// 2. Verify WRONG way section shows error
// 3. Verify RIGHT way section shows success
# 4. Verify tree visualization shows structural changes
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models. The example uses existing types:

```typescript
// Existing types used in example:
- Workflow (class) - from src/core/workflow.ts
- WorkflowNode (interface) - from src/types/workflow.ts
- WorkflowEvent (discriminated union) - from src/types/events.ts
- WorkflowObserver (interface) - from src/types/index.js
- WorkflowTreeDebugger (class) - from src/core/debugger.ts

// Event types for observer:
- childAttached event: { type: 'childAttached'; parentId: string; child: WorkflowNode }
- childDetached event: { type: 'childDetached'; parentId: string; childId: string }
- treeUpdated event: { type: 'treeUpdated'; root: WorkflowNode }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE examples/examples/11-reparenting-workflows.ts
  - IMPLEMENT: Complete reparenting example with WRONG/RIGHT comparison
  - FOLLOW pattern: examples/examples/03-parent-child.ts (structure, imports, helpers)
  - FOLLOW pattern: src/__tests__/integration/workflow-reparenting.test.ts (reparenting logic)
  - NAMING: runReparentingExample() exported function
  - PLACEMENT: examples/examples/ directory as 11-reparenting-workflows.ts

Task 2: IMPLEMENT WRONG way section
  - CREATE: SimpleWorkflow class for demonstration
  - IMPLEMENT: Direct attachChild() to new parent (throws error)
  - CATCH: Error and display with explanation
  - DOCUMENT: Why it failed (single-parent invariant)
  - REFERENCE: src/core/workflow.ts lines 271-279 (error message format)

Task 3: IMPLEMENT RIGHT way section
  - RESET: Create fresh workflows for clean demonstration
  - IMPLEMENT: detachChild() then attachChild() pattern
  - VERIFY: Success with assertions/comments
  - DISPLAY: Tree before/after using WorkflowTreeDebugger
  - DOCUMENT: Why detach-then-attach works

Task 4: IMPLEMENT observer propagation section
  - CREATE: Custom WorkflowObserver for tracking events
  - ATTACH: Observers to both parent1 and parent2
  - DEMONSTRATE: Events go to correct observer after reparenting
  - VERIFY: Old parent's observer stops receiving events
  - REFERENCE: src/__tests__/integration/workflow-reparenting.test.ts lines 52-127

Task 5: IMPLEMENT error handling section
  - DEMONSTRATE: Error when child not attached to parent
  - DEMONSTRATE: Error when circular reference would occur
  - SHOW: Proper try/catch patterns
  - DOCUMENT: Error messages and remediation

Task 6: MODIFY examples/index.ts
  - IMPORT: runReparentingExample from new example file
  - ADD: To examples array in runAllExamples()
  - FOLLOW: Existing pattern for other examples
  - VERIFY: Can run with npm run start:all

Task 7: MODIFY examples/README.md
  - ADD: Section for Example 11: Reparenting Workflows
  - DESCRIBE: What the example demonstrates
  - INCLUDE: Run command (npm run start:reparenting or npx tsx)
  - FOLLOW: Existing README patterns

Task 8: MODIFY package.json
  - ADD: "start:reparenting": "tsx examples/examples/11-reparenting-workflows.ts"
  - VERIFY: Script follows existing pattern
  - PLACE: In scripts section after start:introspection

Task 9: RUN example to verify it works
  - EXECUTE: npx tsx examples/examples/11-reparenting-workflows.ts
  - VERIFY: WRONG way shows error output
  - VERIFY: RIGHT way shows success
  - VERIFY: Tree visualization displays correctly
  - VERIFY: No runtime errors or warnings
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// COMPLETE EXAMPLE FILE STRUCTURE
// Location: examples/examples/11-reparenting-workflows.ts
// ============================================================

/**
 * Example 11: Reparenting Workflows
 *
 * Demonstrates the detach-then-attach pattern for reparenting workflows.
 *
 * Key concepts:
 * - WRONG way: Direct attachChild() throws error (single-parent invariant)
 * - RIGHT way: detachChild() then attachChild() pattern
 * - Tree structure verification before/after reparenting
 * - Observer propagation updates after reparenting
 * - Dual-tree synchronization (workflow tree + node tree)
 */

import {
  Workflow,
  Step,
  ObservedState,
  WorkflowTreeDebugger,
  WorkflowObserver,
  WorkflowEvent,
} from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';

// ============================================================
// SIMPLE WORKFLOW CLASS FOR DEMONSTRATION
// ============================================================

/**
 * Simple workflow for reparenting demonstration
 */
class SimpleWorkflow extends Workflow {
  @ObservedState()
  public value: string = '';

  constructor(name: string, parent?: Workflow) {
    super(name, parent);
    this.value = name;
  }

  @Step({ trackTiming: true })
  async doWork(): Promise<void> {
    this.logger.info(`${this.node.name} doing work`);
    await sleep(50);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.doWork();
    this.setStatus('completed');
  }
}

// ============================================================
// CUSTOM OBSERVER FOR EVENT TRACKING
// ============================================================

/**
 * Observer that tracks events for demonstration
 */
class EventTrackingObserver implements WorkflowObserver {
  private events: WorkflowEvent[] = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  onLog(): void {}
  onStateUpdated(): void {}

  onEvent(event: WorkflowEvent): void {
    this.events.push(event);
    console.log(`  [${this.name}] Received event: ${event.type}`);
  }

  onTreeChanged(): void {
    console.log(`  [${this.name}] Tree changed`);
  }

  getEvents(): WorkflowEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}

// ============================================================
// MAIN EXAMPLE FUNCTION
// ============================================================

export async function runReparentingExample(): Promise<void> {
  printHeader('Example 11: Reparenting Workflows');

  // ============================================================
  // SECTION 1: THE WRONG WAY
  // ============================================================
  printSection('1. The WRONG Way: Direct attachChild()');

  console.log('Creating parent1, parent2, and child attached to parent1...\n');

  const parent1 = new SimpleWorkflow('Parent1');
  const parent2 = new SimpleWorkflow('Parent2');
  const child = new SimpleWorkflow('Child', parent1);

  console.log(`Initial state:`);
  console.log(`  child.parent = '${child.parent?.node.name}'`);
  console.log(`  parent1.children = [${parent1.children.map(c => c.node.name).join(', ')}]`);
  console.log(`  parent2.children = [${parent2.children.map(c => c.node.name).join(', ')}]`);

  console.log('\nAttempting: parent2.attachChild(child) (skipping detachChild)...\n');

  try {
    // WRONG: Direct attachChild() to new parent
    parent2.attachChild(child);
    console.log('✗ Unexpected: attachChild() succeeded (should have thrown)');
  } catch (error) {
    console.log('✓ Expected: Error thrown');
    console.log(`\nError message:`);
    console.log(`  "${(error as Error).message}"`);

    console.log('\n❌ WHY IT FAILED:');
    console.log('  The child already has a parent (Parent1).');
    console.log('  Groundswell enforces the SINGLE-PARENT invariant:');
    console.log('  "A workflow can only have one parent at a time."');
    console.log('  This prevents ambiguous tree traversal and observer propagation.');
  }

  // ============================================================
  // SECTION 2: THE RIGHT WAY
  // ============================================================
  printSection('2. The RIGHT Way: detachChild() then attachChild()');

  console.log('Creating fresh workflows for clean demonstration...\n');

  const parentA = new SimpleWorkflow('ParentA');
  const parentB = new SimpleWorkflow('ParentB');
  const workflowToReparent = new SimpleWorkflow('WorkflowToReparent', parentA);

  // Create debugger for tree visualization
  const debuggerA = new WorkflowTreeDebugger(parentA);

  console.log('BEFORE reparenting:');
  console.log(debuggerA.toTreeString());

  console.log('\nStep 1: Detach from ParentA');
  console.log('  parentA.detachChild(workflowToReparent);');
  parentA.detachChild(workflowToReparent);

  console.log('\nAfter detachChild():');
  console.log(`  workflowToReparent.parent = ${workflowToReparent.parent}`);
  console.log(`  parentA.children = [${parentA.children.map(c => c.node.name).join(', ')}]`);

  console.log('\nStep 2: Attach to ParentB');
  console.log('  parentB.attachChild(workflowToReparent);');
  parentB.attachChild(workflowToReparent);

  console.log('\nAfter attachChild():');
  console.log(`  workflowToReparent.parent = '${workflowToReparent.parent.node.name}'`);
  console.log(`  parentB.children = [${parentB.children.map(c => c.node.name).join(', ')}]`);

  const debuggerB = new WorkflowTreeDebugger(parentB);
  console.log('\nAFTER reparenting:');
  console.log(debuggerB.toTreeString());

  console.log('\n✅ SUCCESS: Workflow reparented from ParentA to ParentB');

  // ============================================================
  // SECTION 3: OBSERVER PROPAGATION
  // ============================================================
  printSection('3. Observer Propagation After Reparenting');

  console.log('Creating workflows with observers...\n');

  const obsParent1 = new SimpleWorkflow('ObsParent1');
  const obsParent2 = new SimpleWorkflow('ObsParent2');
  const obsChild = new SimpleWorkflow('ObsChild', obsParent1);

  const observer1 = new EventTrackingObserver('Observer1');
  const observer2 = new EventTrackingObserver('Observer2');

  obsParent1.addObserver(observer1);
  obsParent2.addObserver(observer2);

  console.log('Initial state: ObsChild attached to ObsParent1');
  console.log('Emitting event from ObsChild...\n');

  observer1.clear();
  observer2.clear();
  obsChild.setStatus('running');

  console.log('Observer1 (ObsParent1) events:', observer1.getEvents().map(e => e.type));
  console.log('Observer2 (ObsParent2) events:', observer2.getEvents().map(e => e.type));

  console.log('\nReparenting: ObsParent1 → ObsParent2');
  obsParent1.detachChild(obsChild);
  obsParent2.attachChild(obsChild);

  console.log('\nAfter reparenting: ObsChild attached to ObsParent2');
  console.log('Emitting event from ObsChild...\n');

  observer1.clear();
  observer2.clear();
  obsChild.setStatus('completed');

  console.log('Observer1 (ObsParent1) events:', observer1.getEvents().map(e => e.type));
  console.log('Observer2 (ObsParent2) events:', observer2.getEvents().map(e => e.type));

  console.log('\n✅ VERIFIED: Events now go to Observer2 (new parent\'s observer)');

  // ============================================================
  // SECTION 4: ERROR HANDLING
  // ============================================================
  printSection('4. Error Handling Patterns');

  console.log('Demonstrating proper error handling...\n');

  const errorParent1 = new SimpleWorkflow('ErrorParent1');
  const errorParent2 = new SimpleWorkflow('ErrorParent2');
  const errorChild = new SimpleWorkflow('ErrorChild');

  console.log('Case 1: Detaching when child not attached');
  try {
    errorParent1.detachChild(errorChild);
    console.log('✗ Unexpected: detachChild() succeeded');
  } catch (error) {
    console.log('✓ Expected: Error thrown');
    console.log(`  "${(error as Error).message}"`);
  }

  console.log('\nCase 2: Proper reparenting with error handling');
  try {
    // Attach first
    errorParent1.attachChild(errorChild);
    console.log('  Step 1: Attached to ErrorParent1 ✓');

    // Then reparent
    errorParent1.detachChild(errorChild);
    errorParent2.attachChild(errorChild);
    console.log('  Step 2: Reparented to ErrorParent2 ✓');
  } catch (error) {
    console.log('✗ Unexpected error:', (error as Error).message);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  printSection('Summary');

  console.log('Key Takeaways:');
  console.log('  1. ALWAYS detachChild() before attachChild() when reparenting');
  console.log('  2. The single-parent invariant prevents ambiguous parent relationships');
  console.log('  3. Observer propagation updates after reparenting');
  console.log('  4. Both workflow tree and node tree stay synchronized');
  console.log('  5. Use try/catch when calling detachChild() and attachChild()');

  console.log('\nReparenting Pattern:');
  console.log('  oldParent.detachChild(child);  // Step 1: Detach');
  console.log('  newParent.attachChild(child);  // Step 2: Attach');
}

// ============================================================
// RUN IF EXECUTED DIRECTLY
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runReparentingExample().catch(console.error);
}
```

### Import Statement Patterns

```typescript
// CRITICAL: Use .js extension for ESM imports
import { printHeader, printSection, sleep } from '../utils/helpers.js';
import { Workflow, WorkflowTreeDebugger, WorkflowObserver } from 'groundswell';

// CRITICAL: Discriminated union for event handling
import type { WorkflowEvent } from 'groundswell';
// Then in observer: onEvent(event: WorkflowEvent): void

// Pattern from existing examples:
// - examples/examples/03-parent-child.ts (lines 12-19)
// - examples/examples/04-observers-debugger.ts (lines 12-21)
```

### Wrong vs Right Pattern Template

```typescript
// ============================================================
// WRONG vs RIGHT PATTERN
// ============================================================

// WRONG: Direct attachChild() to new parent
const parent1 = new Workflow('Parent1');
const parent2 = new Workflow('Parent2');
const child = new Workflow('Child', parent1);

parent2.attachChild(child); // THROWS: Error - child already has parent

// RIGHT: Detach first, then attach
parent1.detachChild(child);  // child.parent becomes null
parent2.attachChild(child);  // child.parent becomes parent2

// Verification
console.log(child.parent === parent2); // true
```

### Error Handling Pattern Template

```typescript
// ============================================================
// ERROR HANDLING PATTERN
// ============================================================

try {
  // Reparenting operation
  oldParent.detachChild(child);
  newParent.attachChild(child);
  console.log('✓ Reparenting successful');
} catch (error) {
  console.error('✗ Reparenting failed:', (error as Error).message);
  // Handle error: retry, abort, or use fallback strategy
}

// Specific error cases:
// - "Child not attached" → Ensure you're detaching from correct parent
// - "Already has parent" → Call detachChild() first
// - "Circular reference" → Cannot attach to ancestor
```

### Integration Points

```yaml
CREATE: examples/examples/11-reparenting-workflows.ts
  - content: Complete reparenting example with 4 sections
  - export: runReparentingExample() function
  - IIFE: if (import.meta.url === `file://${process.argv[1]}`) { ... }

MODIFY: examples/index.ts
  - add import: import { runReparentingExample } from './examples/11-reparenting-workflows.js';
  - add to array: { name: '11. Reparenting Workflows', fn: runReparentingExample }
  - location: After example 10, before runAllExamples function

MODIFY: examples/README.md
  - add section: "### 11. Reparenting Workflows (`11-reparenting-workflows.ts`)"
  - include description, run command, concepts demonstrated
  - location: After example 10 section

MODIFY: package.json
  - add script: "start:reparenting": "tsx examples/examples/11-reparenting-workflows.ts"
  - location: In scripts section, after start:introspection
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
cd /home/dustin/projects/groundswell
npx tsc --noEmit

# Expected: Zero errors
# If errors exist, check:
#   - Import paths use .js extension (ESM requirement)
#   - All types are properly imported
#   - No undefined variables or methods

# Run the example directly
npx tsx examples/examples/11-reparenting-workflows.ts

# Expected output should show:
#   - Header: "Example 11: Reparenting Workflows"
#   - Section 1: WRONG way error
#   - Section 2: RIGHT way success
#   - Section 3: Observer propagation
#   - Section 4: Error handling
#   - Summary with key takeaways
```

### Level 2: Content Verification (Example Quality)

```bash
# Verify example produces expected output
npx tsx examples/examples/11-reparenting-workflows.ts 2>&1 | tee /tmp/reparenting-output.txt

# Check for key sections
grep -q "The WRONG Way" /tmp/reparenting-output.txt && echo "✓ WRONG way section present"
grep -q "The RIGHT Way" /tmp/reparenting-output.txt && echo "✓ RIGHT way section present"
grep -q "Observer Propagation" /tmp/reparenting-output.txt && echo "✓ Observer section present"
grep -q "Error Handling" /tmp/reparenting-output.txt && echo "✓ Error handling section present"
grep -q "detachChild() before attachChild()" /tmp/reparenting-output.txt && echo "✓ Key message present"

# Verify error is shown in WRONG way section
grep -q "already has a parent" /tmp/reparenting-output.txt && echo "✓ Error message shown"

# Verify success message in RIGHT way section
grep -q "SUCCESS.*Workflow reparented" /tmp/reparenting-output.txt && echo "✓ Success message shown"
```

### Level 3: Integration Testing (System Validation)

```bash
# Test npm script integration
cd /home/dustin/projects/groundswell
npm run start:reparenting

# Expected: Example runs successfully with full output

# Test via all examples runner
# First verify index.ts imports the new example
grep -q "11-reparenting-workflows" examples/index.ts && echo "✓ Example imported in index.ts"

# Test README update
grep -q "11. Reparenting Workflows" examples/README.md && echo "✓ README updated"

# Verify package.json script
grep -q "start:reparenting" package.json && echo "✓ Script added to package.json"
```

### Level 4: Documentation Completeness (Comprehensive Check)

```bash
# Verify example file structure
cat > /tmp/verify-example-structure.ts << 'EOF'
import fs from 'fs';

const content = fs.readFileSync('examples/examples/11-reparenting-workflows.ts', 'utf8');

const checks = [
  { name: 'Has file header comment', pattern: /Example 11: Reparenting Workflows/ },
  { name: 'Has WRONG way section', pattern: /The WRONG Way/ },
  { name: 'Has RIGHT way section', pattern: /The RIGHT Way/ },
  { name: 'Has observer section', pattern: /Observer Propagation/ },
  { name: 'Has error handling section', pattern: /Error Handling/ },
  { name: 'Has summary section', pattern: /Summary/ },
  { name: 'Has SimpleWorkflow class', pattern: /class SimpleWorkflow/ },
  { name: 'Has EventTrackingObserver class', pattern: /class EventTrackingObserver/ },
  { name: 'Exports runReparentingExample', pattern: /export async function runReparentingExample/ },
  { name: 'Has IIFE for direct execution', pattern: /import\.meta\.url === `file:\/\/\$\{process\.argv\[1\]\}`/ },
  { name: 'Imports print helpers', pattern: /import.*printHeader.*from.*helpers/ },
  { name: 'Imports groundswell', pattern: /import.*Workflow.*from 'groundswell'/ },
  { name: 'Shows detach-then-attach pattern', pattern: /detachChild.*attachChild/s },
  { name: 'Explains single-parent invariant', pattern: /single-parent invariant/ },
  { name: 'Uses WorkflowTreeDebugger', pattern: /WorkflowTreeDebugger/ },
];

console.log('Example Structure Verification:');
console.log('===============================');

const results = checks.map(check => {
  const found = check.pattern.test(content);
  console.log(`${found ? '✅' : '❌'} ${check.name}`);
  return found;
});

if (results.every(r => r)) {
  console.log('\n✅ All checks passed');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed');
  process.exit(1);
}
EOF

npx tsx /tmp/verify-example-structure.ts

# Expected: All checks passed
```

### Level 5: Example Output Validation (Domain-Specific)

```bash
# Verify example demonstrates correct concepts
cat > /tmp/verify-example-content.ts << 'EOF'
import fs from 'fs';

const content = fs.readFileSync('examples/examples/11-reparenting-workflows.ts', 'utf8');

const conceptChecks = [
  {
    name: 'WRONG way shows direct attachChild',
    patterns: [
      /WRONG.*Direct attachChild/s,
      /parent2\.attachChild\(child\)/,
      /try.*catch.*attachChild/s,
    ]
  },
  {
    name: 'RIGHT way shows detach-then-attach',
    patterns: [
      /RIGHT.*detachChild.*attachChild/s,
      /detachChild\(.*\).*attachChild\(.*\)/s,
    ]
  },
  {
    name: 'Explains WHY detach is required',
    patterns: [
      /WHY.*FAILED|single-parent invariant|already has a parent/s,
    ]
  },
  {
    name: 'Shows tree visualization',
    patterns: [
      /WorkflowTreeDebugger/,
      /toTreeString\(\)/,
      /BEFORE.*AFTER/s,
    ]
  },
  {
    name: 'Demonstrates observer updates',
    patterns: [
      /WorkflowObserver/,
      /Observer1.*Observer2/s,
      /events.*Observer/s,
    ]
  },
  {
    name: 'Shows error handling',
    patterns: [
      /try.*catch/s,
      /Error.*thrown/s,
      /Error message/s,
    ]
  },
  {
    name: 'Uses decorators',
    patterns: [
      /@Step\(/,
      /@ObservedState\(/,
    ]
  },
  {
    name: 'Has verification comments',
    patterns: [
      /✓|✅|✗|❌/s,
      /VERIFIED|SUCCESS|FAILED/s,
    ]
  },
];

console.log('Example Content Verification:');
console.log('============================');

const results = conceptChecks.map(check => {
  const allPatternsMatch = check.patterns.every(pattern => pattern.test(content));
  console.log(`${allPatternsMatch ? '✅' : '❌'} ${check.name}`);
  return allPatternsMatch;
});

if (results.every(r => r)) {
  console.log('\n✅ All concept checks passed');
  process.exit(0);
} else {
  console.log('\n❌ Some concept checks failed');
  process.exit(1);
}
EOF

npx tsx /tmp/verify-example-content.ts

# Expected: All concept checks passed
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **All 5 validation levels completed successfully**
- [ ] **TypeScript compilation passes**: `npx tsc --noEmit` shows zero errors
- [ ] **Example runs successfully**: `npx tsx examples/examples/11-reparenting-workflows.ts`
- [ ] **npm script works**: `npm run start:reparenting` runs example
- [ ] **No runtime errors**: Example completes without throwing
- [ ] **No linting errors**: Code follows project patterns

### Content Validation

- [ ] **WRONG way section present**: Shows direct attachChild() error
- [ ] **RIGHT way section present**: Shows detach-then-attach pattern
- [ ] **Observer section present**: Demonstrates observer propagation updates
- [ ] **Error handling section present**: Shows try/catch patterns
- [ ] **Summary section present**: Lists key takeaways
- [ ] **Comments explain WHY**: Not just WHAT

### Output Validation

- [ ] **Error message shown**: WRONG way displays error clearly
- [ ] **Success message shown**: RIGHT way shows reparenting success
- [ ] **Tree visualization displayed**: Before/after trees shown
- [ ] **Observer events tracked**: Shows which observer receives events
- [ ] **Key takeaways listed**: Summary has actionable advice

### Integration Validation

- [ ] **index.ts updated**: Imports and includes runReparentingExample
- [ ] **README.md updated**: Has Example 11 section with description
- [ ] **package.json updated**: Has start:reparenting script
- [ ] **File naming consistent**: Follows 01-XX naming pattern
- [ ] **ESM imports correct**: Uses .js extension for local imports

### Code Quality Validation

- [ ] **Follows existing patterns**: Matches structure of other examples
- [ ] **Uses project utilities**: printHeader, printSection, sleep
- [ ] **Decorator usage**: @Step, @ObservedState used appropriately
- [ ] **Comments are clear**: Explains concepts at 10th grade level
- [ ] **No redundant code**: Each section adds unique value

---

## Anti-Patterns to Avoid

- ❌ **Don't skip WRONG way demonstration** - Developers need to see the error to understand why the pattern is necessary
- ❌ **Don't bury the error message** - Show the full error output with explanation
- ❌ **Don't omit tree visualization** - Visual representation helps understanding
- ❌ **Don't forget observer updates** - Pattern 7 from bug analysis requires showing observer propagation changes
- ❌ **Don't use complex workflows** - Keep SimpleWorkflow minimal for clarity
- ❌ **Don't skip error handling section** - Show try/catch patterns for real-world usage
- ❌ **Don't use .ts extension in imports** - This is ESM, must use .js
- ❌ **Don't forget IIFE at bottom** - Enables direct execution with tsx
- ❌ **Don't omit summary section** - Key takeaways reinforce learning
- ❌ **Don't make comments too technical** - Explain at 10th grade level

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
1. ✅ Clear scope: Single example file with 4 defined sections
2. ✅ Complete context: File paths, code patterns, validation commands
3. ✅ Existing patterns to follow: 03-parent-child.ts, workflow-reparenting.test.ts
4. ✅ External research: JSDoc best practices, tree reparenting patterns
5. ✅ Complete code template: Full example structure provided
6. ✅ Validation at 5 levels: Syntax, content, integration, documentation, domain-specific
7. ✅ Integration points clear: index.ts, README.md, package.json changes specified

**Expected Outcome**: An AI agent implementing this PRP should:
- Create examples/examples/11-reparenting-workflows.ts (~200-250 lines)
- Update examples/index.ts to import and run the new example
- Update examples/README.md with Example 11 description
- Add start:reparenting script to package.json
- Complete all tasks in one pass with comprehensive, working example

**Developer Impact**: After this PRP is implemented, developers using Groundswell will:
- Have clear reference for reparenting workflows
- Understand WHY detach-then-attach pattern is required
- See what error occurs when skipping detachChild()
- Know how to handle errors during reparenting
- Understand observer propagation updates after reparenting

---

## Appendix: External Research Summary

### Tree Reparenting Documentation Patterns

**Key Findings:**

1. **Wrong/Right Comparison Pattern**: Most effective way to teach API patterns
   - WRONG: Show what happens with common mistake (error thrown)
   - RIGHT: Show correct pattern (success)
   - Explanation: WHY the wrong way fails

2. **Error Message Documentation**: Include actual error output
   - Shows entity names involved
   - States the invariant violated
   - Provides remediation advice

3. **Visual Diagrams**: ASCII art for tree structure changes
   - Before/After comparison
   - Show parent pointers changing
   - Use existing WorkflowTreeDebugger.toTreeString()

4. **Step-by-Step Guides**: Break complex operations into phases
   - Setup phase
   - Execution phase
   - Verification phase
   - Summary phase

5. **Observer Pattern**: Show how events propagate
   - Events from child go to root observers
   - After reparenting, events go to new root
   - Old parent's observers stop receiving events

**Documentation URLs:**
- TypeScript JSDoc Reference: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- JSDoc Official: https://jsdoc.app/
- MDN Error Handling: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling

---

**PRP Version**: 1.0
**Created**: 2026-01-12
**For**: Subtask P1.M4.T1.S2 - Create Reparenting Usage Example
**PRD Reference**: Bug Fix Plan P1 - attachChild() Tree Integrity Violation

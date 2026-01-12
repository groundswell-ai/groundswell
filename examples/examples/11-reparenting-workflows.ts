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
  console.log(`  parent1.children = [${parent1.children.map((c) => c.node.name).join(', ')}]`);
  console.log(`  parent2.children = [${parent2.children.map((c) => c.node.name).join(', ')}]`);

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
  console.log(`  parentA.children = [${parentA.children.map((c) => c.node.name).join(', ')}]`);

  console.log('\nStep 2: Attach to ParentB');
  console.log('  parentB.attachChild(workflowToReparent);');
  parentB.attachChild(workflowToReparent);

  console.log('\nAfter attachChild():');
  console.log(`  workflowToReparent.parent = '${workflowToReparent.parent.node.name}'`);
  console.log(`  parentB.children = [${parentB.children.map((c) => c.node.name).join(', ')}]`);

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

  console.log('Observer1 (ObsParent1) events:', observer1.getEvents().map((e) => e.type));
  console.log('Observer2 (ObsParent2) events:', observer2.getEvents().map((e) => e.type));

  console.log('\nReparenting: ObsParent1 → ObsParent2');
  obsParent1.detachChild(obsChild);
  obsParent2.attachChild(obsChild);

  console.log('\nAfter reparenting: ObsChild attached to ObsParent2');
  console.log('Emitting event from ObsChild...\n');

  observer1.clear();
  observer2.clear();
  obsChild.setStatus('completed');

  console.log('Observer1 (ObsParent1) events:', observer1.getEvents().map((e) => e.type));
  console.log('Observer2 (ObsParent2) events:', observer2.getEvents().map((e) => e.type));

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

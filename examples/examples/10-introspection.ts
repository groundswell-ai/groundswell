/**
 * Example 10: Introspection Tools Demo
 *
 * Demonstrates:
 * - Agent with INTROSPECTION_TOOLS
 * - inspect_current_node - "Where am I?"
 * - read_ancestor_chain - "What's above me?"
 * - list_siblings_children - "What's around me?"
 * - inspect_prior_outputs - "What happened before?"
 * - inspect_cache_status - "Is this cached?"
 * - request_spawn_workflow - "Can I create children?"
 */

import { z } from 'zod';
import {
  Workflow,
  Step,
  Task,
  ObservedState,
  WorkflowTreeDebugger,
  INTROSPECTION_TOOLS,
  INTROSPECTION_HANDLERS,
  handleInspectCurrentNode,
  handleReadAncestorChain,
  handleListSiblingsChildren,
  handleInspectPriorOutputs,
  handleInspectCacheStatus,
  handleRequestSpawnWorkflow,
  runInContext,
  createChildContext,
  agentExecutionStorage,
  defaultCache,
} from 'groundswell';
import type {
  CurrentNodeInfo,
  AncestorChainResult,
  SiblingsChildrenResult,
  PriorOutputInfo,
  CacheStatusResult,
  SpawnWorkflowRequest,
  WorkflowNode,
  AgentExecutionContext,
} from 'groundswell';
import { printHeader, printSection, sleep, prettyJson } from '../utils/helpers.js';

// ============================================================================
// Helper to simulate execution context
// ============================================================================

/**
 * Create a mock workflow node for demonstration
 */
function createMockNode(
  name: string,
  parent?: WorkflowNode,
  status: 'idle' | 'running' | 'completed' = 'running'
): WorkflowNode {
  return {
    id: `node-${name}-${Date.now()}`,
    name,
    status,
    parent,
    children: [],
    events: [],
  };
}

/**
 * Execute a function within a mock execution context
 */
async function executeInMockContext<T>(
  node: WorkflowNode,
  fn: () => Promise<T>
): Promise<T> {
  const context: AgentExecutionContext = {
    workflowId: node.id,
    workflowName: node.name,
    workflowNode: node,
    emitEvent: (event) => {
      node.events.push(event);
    },
  };

  return runInContext(context, fn);
}

// ============================================================================
// Workflow Definitions
// ============================================================================

/**
 * Root workflow for introspection demonstration
 */
class IntrospectionDemoWorkflow extends Workflow {
  @ObservedState()
  introspectionResults: Record<string, unknown> = {};

  constructor(name: string, parent?: Workflow) {
    super(name, parent);
  }

  @Step({ trackTiming: true, snapshotState: true })
  async setupStep(): Promise<string> {
    this.logger.info('Setting up introspection demo');
    await sleep(50);
    return 'Setup complete';
  }

  @Step({ trackTiming: true, snapshotState: true })
  async processStep(): Promise<string> {
    this.logger.info('Processing data');
    await sleep(50);
    return 'Processing complete';
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting introspection demo workflow');

    await this.setupStep();
    await this.processStep();

    this.setStatus('completed');
  }
}

/**
 * Child workflow for nested hierarchy demonstration
 */
class ChildIntrospectionWorkflow extends Workflow {
  @ObservedState()
  depth: number;

  constructor(name: string, depth: number, parent?: Workflow) {
    super(name, parent);
    this.depth = depth;
  }

  @Step({ trackTiming: true })
  async childWork(): Promise<string> {
    this.logger.info(`Child at depth ${this.depth} working`);
    await sleep(30);
    return `Child ${this.depth} result`;
  }

  async run(): Promise<string> {
    this.setStatus('running');
    const result = await this.childWork();
    this.setStatus('completed');
    return result;
  }
}

// ============================================================================
// Introspection Tool Demonstrations
// ============================================================================

/**
 * Demonstrate inspect_current_node tool
 */
async function demonstrateCurrentNode(): Promise<void> {
  console.log('Tool: inspect_current_node');
  console.log('Purpose: "Where am I?" - Get info about current workflow node\n');

  // Create mock hierarchy
  const root = createMockNode('RootWorkflow');
  const child = createMockNode('ChildWorkflow', root);
  root.children.push(child);

  await executeInMockContext(child, async () => {
    const result = await handleInspectCurrentNode();

    console.log('Result:');
    console.log(`  ID: ${result.id}`);
    console.log(`  Name: ${result.name}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Parent ID: ${result.parentId ?? '(none)'}`);
    console.log(`  Parent Name: ${result.parentName ?? '(none)'}`);
    console.log(`  Child Count: ${result.childCount}`);
    console.log(`  Depth: ${result.depth}`);
  });
}

/**
 * Demonstrate read_ancestor_chain tool
 */
async function demonstrateAncestorChain(): Promise<void> {
  console.log('Tool: read_ancestor_chain');
  console.log('Purpose: "What\'s above me?" - Get all ancestor nodes\n');

  // Create 3-level hierarchy
  const root = createMockNode('RootWorkflow', undefined, 'running');
  const level1 = createMockNode('Level1Workflow', root, 'running');
  const level2 = createMockNode('Level2Workflow', level1, 'running');
  root.children.push(level1);
  level1.children.push(level2);

  await executeInMockContext(level2, async () => {
    const result = await handleReadAncestorChain({ maxDepth: 10 });

    console.log(`Total depth: ${result.totalDepth}`);
    console.log('Ancestors (from current to root):');
    for (const ancestor of result.ancestors) {
      console.log(`  Depth ${ancestor.depth}: ${ancestor.name} [${ancestor.status}]`);
    }
  });
}

/**
 * Demonstrate list_siblings_children tool
 */
async function demonstrateSiblingsChildren(): Promise<void> {
  console.log('Tool: list_siblings_children');
  console.log('Purpose: "What\'s around me?" - List siblings or children\n');

  // Create hierarchy with siblings
  const root = createMockNode('RootWorkflow', undefined, 'running');
  const sibling1 = createMockNode('Sibling1', root, 'completed');
  const sibling2 = createMockNode('Sibling2', root, 'running');
  const sibling3 = createMockNode('Sibling3', root, 'idle');
  root.children.push(sibling1, sibling2, sibling3);

  // Add children to sibling2
  const child1 = createMockNode('Child1', sibling2, 'completed');
  const child2 = createMockNode('Child2', sibling2, 'running');
  sibling2.children.push(child1, child2);

  await executeInMockContext(sibling2, async () => {
    // Get siblings
    const siblings = await handleListSiblingsChildren({ type: 'siblings' });
    console.log('Siblings:');
    for (const node of siblings.nodes) {
      console.log(`  - ${node.name} [${node.status}]`);
    }

    // Get children
    const children = await handleListSiblingsChildren({ type: 'children' });
    console.log('\nChildren:');
    for (const node of children.nodes) {
      console.log(`  - ${node.name} [${node.status}]`);
    }
  });
}

/**
 * Demonstrate inspect_prior_outputs tool
 */
async function demonstratePriorOutputs(): Promise<void> {
  console.log('Tool: inspect_prior_outputs');
  console.log('Purpose: "What happened before?" - Get outputs from prior steps\n');

  // Create hierarchy with completed siblings
  const root = createMockNode('RootWorkflow', undefined, 'running');
  const step1 = createMockNode('Step1', root, 'completed');
  const step2 = createMockNode('Step2', root, 'completed');
  const step3 = createMockNode('CurrentStep', root, 'running');

  // Add events to completed steps
  step1.events.push({ type: 'stepEnd', payload: { result: 'Step 1 output' } });
  step2.events.push({ type: 'stepEnd', payload: { result: 'Step 2 output' } });

  root.children.push(step1, step2, step3);

  await executeInMockContext(step3, async () => {
    const result = await handleInspectPriorOutputs({ count: 3 });

    console.log(`Found ${result.length} prior outputs:`);
    for (const output of result) {
      console.log(`  Node: ${output.nodeName}`);
      console.log(`  Status: ${output.status}`);
      console.log(`  Events: ${output.events.length}`);
    }
  });
}

/**
 * Demonstrate inspect_cache_status tool
 */
async function demonstrateCacheStatus(): Promise<void> {
  console.log('Tool: inspect_cache_status');
  console.log('Purpose: "Is this cached?" - Check if a prompt response is cached\n');

  // Set up some cache entries
  const testKey1 = 'test-prompt-hash-12345';
  const testKey2 = 'test-prompt-hash-67890';

  await defaultCache.set(testKey1, { result: 'Cached response' });

  // Check existing key
  const result1 = await handleInspectCacheStatus({ promptHash: testKey1 });
  console.log(`Key "${testKey1}":`);
  console.log(`  Exists: ${result1.exists}`);

  // Check non-existing key
  const result2 = await handleInspectCacheStatus({ promptHash: testKey2 });
  console.log(`\nKey "${testKey2}":`);
  console.log(`  Exists: ${result2.exists}`);

  // Show cache metrics
  const metrics = defaultCache.metrics();
  console.log('\nCache metrics:');
  console.log(`  Entries: ${metrics.entries}`);
  console.log(`  Hits: ${metrics.hits}`);
  console.log(`  Misses: ${metrics.misses}`);
}

/**
 * Demonstrate request_spawn_workflow tool
 */
async function demonstrateSpawnWorkflow(): Promise<void> {
  console.log('Tool: request_spawn_workflow');
  console.log('Purpose: "Can I create children?" - Request to spawn new workflow\n');

  const root = createMockNode('OrchestratorWorkflow');

  await executeInMockContext(root, async () => {
    const request = await handleRequestSpawnWorkflow({
      name: 'DynamicChildWorkflow',
      description: 'Process additional data discovered during execution',
    });

    console.log('Spawn request created:');
    console.log(`  Name: ${request.name}`);
    console.log(`  Description: ${request.description}`);
    console.log(`  Request ID: ${request.requestId}`);
    console.log(`  Status: ${request.status}`);
    console.log('\nNote: The orchestrator handles actual spawning based on this request.');
  });
}

// ============================================================================
// Complete Integration Demo
// ============================================================================

/**
 * Workflow that uses introspection tools
 */
class IntrospectiveWorkflow extends Workflow {
  @ObservedState()
  introspectionLog: Array<{ tool: string; result: unknown }> = [];

  constructor(name: string, parent?: Workflow) {
    super(name, parent);
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'introspect-position' })
  async introspectPosition(): Promise<void> {
    this.logger.info('Using introspection to understand position');

    // Create context for this step
    const stepNode = createMockNode('introspect-position', undefined, 'running');

    await executeInMockContext(stepNode, async () => {
      const nodeInfo = await handleInspectCurrentNode();
      this.introspectionLog.push({ tool: 'inspect_current_node', result: nodeInfo });
      this.logger.info(`Position: ${nodeInfo.name} at depth ${nodeInfo.depth}`);
    });
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'analyze-hierarchy' })
  async analyzeHierarchy(): Promise<void> {
    this.logger.info('Analyzing workflow hierarchy');

    // Create a mock hierarchy for demo
    const root = createMockNode('Root');
    const parent = createMockNode('Parent', root);
    const current = createMockNode('Current', parent);
    root.children.push(parent);
    parent.children.push(current);

    await executeInMockContext(current, async () => {
      const ancestors = await handleReadAncestorChain({ maxDepth: 5 });
      this.introspectionLog.push({ tool: 'read_ancestor_chain', result: ancestors });
      this.logger.info(`Found ${ancestors.ancestors.length} ancestors`);
    });
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'check-cache' })
  async checkCache(): Promise<void> {
    this.logger.info('Checking cache status');

    const testHash = 'demo-prompt-hash';
    const cacheStatus = await handleInspectCacheStatus({ promptHash: testHash });
    this.introspectionLog.push({ tool: 'inspect_cache_status', result: cacheStatus });
    this.logger.info(`Cache hit: ${cacheStatus.exists}`);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting introspective workflow');

    await this.introspectPosition();
    await this.analyzeHierarchy();
    await this.checkCache();

    this.logger.info(`Total introspection calls: ${this.introspectionLog.length}`);
    this.setStatus('completed');
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

/**
 * Run the Introspection Tools example
 */
export async function runIntrospectionExample(): Promise<void> {
  printHeader('Example 10: Introspection Tools Demo');

  // Overview of available tools
  printSection('Available Introspection Tools');
  {
    console.log('The INTROSPECTION_TOOLS array contains 6 tools:\n');
    for (const tool of INTROSPECTION_TOOLS) {
      console.log(`  ${tool.name}`);
      console.log(`    ${tool.description}`);
      console.log(`    Required: ${tool.input_schema.required?.join(', ') || 'none'}\n`);
    }
  }

  // Part 1: inspect_current_node
  printSection('Part 1: inspect_current_node');
  {
    await demonstrateCurrentNode();
  }

  // Part 2: read_ancestor_chain
  printSection('Part 2: read_ancestor_chain');
  {
    await demonstrateAncestorChain();
  }

  // Part 3: list_siblings_children
  printSection('Part 3: list_siblings_children');
  {
    await demonstrateSiblingsChildren();
  }

  // Part 4: inspect_prior_outputs
  printSection('Part 4: inspect_prior_outputs');
  {
    await demonstratePriorOutputs();
  }

  // Part 5: inspect_cache_status
  printSection('Part 5: inspect_cache_status');
  {
    await demonstrateCacheStatus();
  }

  // Part 6: request_spawn_workflow
  printSection('Part 6: request_spawn_workflow');
  {
    await demonstrateSpawnWorkflow();
  }

  // Part 7: Complete Integration
  printSection('Part 7: Complete Workflow with Introspection');
  {
    console.log('Workflow using multiple introspection tools:\n');

    const workflow = new IntrospectiveWorkflow('IntrospectiveWorkflow');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    await workflow.run();

    console.log('\nIntrospection log:');
    for (const entry of workflow.introspectionLog) {
      console.log(`  Tool: ${entry.tool}`);
      if (typeof entry.result === 'object' && entry.result !== null) {
        const summary =
          'exists' in entry.result
            ? `exists: ${entry.result.exists}`
            : 'name' in entry.result
              ? `name: ${(entry.result as { name: string }).name}`
              : 'ancestors' in entry.result
                ? `${(entry.result as { ancestors: unknown[] }).ancestors.length} ancestors`
                : JSON.stringify(entry.result).slice(0, 50);
        console.log(`  Result: ${summary}`);
      }
      console.log('');
    }

    console.log('Tree:');
    console.log(debugger_.toTreeString());
  }

  // Part 8: Agent Integration Pattern
  printSection('Part 8: Agent Integration Pattern');
  {
    console.log('Pattern for agents using introspection tools:\n');

    console.log(`// Agent configuration with introspection tools
const introspectionAgent = createAgent({
  name: 'IntrospectionAgent',
  tools: INTROSPECTION_TOOLS,
  system: \`You are an agent that can explore workflow hierarchies.
           Use the introspection tools to understand your position
           and what work has been done.\`
});

// Prompt for self-aware analysis
const explorePrompt = createPrompt({
  user: 'Describe your position in the workflow and summarize prior work.',
  responseFormat: z.object({
    position: z.string(),
    depth: z.number(),
    parentName: z.string().optional(),
    summary: z.string()
  })
});

// Agent uses tools autonomously to gather context
const analysis = await introspectionAgent.prompt(explorePrompt);
`);

    console.log('\nThe agent can:');
    console.log('  1. Call inspect_current_node to understand its position');
    console.log('  2. Call read_ancestor_chain to understand hierarchy');
    console.log('  3. Call list_siblings_children to see nearby nodes');
    console.log('  4. Call inspect_prior_outputs to review prior work');
    console.log('  5. Call inspect_cache_status to check for cached results');
    console.log('  6. Call request_spawn_workflow to request child workflows');
  }

  // Summary
  printSection('Summary');
  {
    console.log('Introspection tools enable agents to:');
    console.log('  - Understand their position in the workflow hierarchy');
    console.log('  - Access context from parent and sibling workflows');
    console.log('  - Review outputs from prior execution steps');
    console.log('  - Check cache status before expensive operations');
    console.log('  - Request dynamic workflow spawning\n');

    console.log('All tools are:');
    console.log('  - Read-only (except request_spawn_workflow)');
    console.log('  - Security-filtered (sensitive data removed)');
    console.log('  - Context-aware (use getExecutionContext())');
    console.log('  - Result-limited (prevent overwhelming output)');
  }

  console.log('\n=== Example 10 Complete ===');
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntrospectionExample().catch(console.error);
}

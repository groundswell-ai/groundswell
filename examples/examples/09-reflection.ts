/**
 * Example 9: Multi-level Reflection
 *
 * Demonstrates:
 * - Prompt-level reflection (enableReflection on prompt)
 * - Agent-level reflection (agent.reflect() method)
 * - Workflow-level reflection (step failure retry)
 * - Reflection events in tree output
 * - Error recovery with revised prompts
 */

import { z } from 'zod';
import {
  Workflow,
  Step,
  ObservedState,
  WorkflowTreeDebugger,
  ReflectionManager,
  executeWithReflection,
  DEFAULT_REFLECTION_CONFIG,
  createReflectionConfig,
} from 'groundswell';
import type {
  ReflectionConfig,
  ReflectionEntry,
  ReflectionContext,
  WorkflowNode,
} from 'groundswell';
import { printHeader, printSection, sleep, simulateUnreliableTask } from '../utils/helpers.js';

// ============================================================================
// Response Schemas
// ============================================================================

const StrictAnswerSchema = z.object({
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  confidence: z.number().min(0.8, 'Confidence must be at least 0.8'),
  reasoning: z.string().min(20, 'Reasoning must be detailed'),
});

const AnalysisSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).min(2, 'Must have at least 2 key points'),
  recommendation: z.string(),
});

type StrictAnswer = z.infer<typeof StrictAnswerSchema>;
type Analysis = z.infer<typeof AnalysisSchema>;

// ============================================================================
// Simulated Responses (for demonstration without API calls)
// ============================================================================

/**
 * Simulate a response that might fail schema validation
 */
async function simulateStrictResponse(
  attemptNumber: number
): Promise<StrictAnswer> {
  await sleep(50);

  // First attempt might fail validation
  if (attemptNumber === 1 && Math.random() > 0.3) {
    return {
      answer: 'Short', // Too short - will fail validation
      confidence: 0.5, // Too low - will fail validation
      reasoning: 'Brief', // Too short
    };
  }

  // Subsequent attempts return valid data
  return {
    answer: 'This is a comprehensive answer that meets the minimum length requirement',
    confidence: 0.92,
    reasoning: 'Based on careful analysis of the input data and consideration of multiple factors',
  };
}

/**
 * Simulate an analysis response
 */
async function simulateAnalysis(): Promise<Analysis> {
  await sleep(75);

  return {
    summary: 'The analysis shows positive trends across all metrics',
    keyPoints: [
      'Revenue increased by 15%',
      'Customer satisfaction improved',
      'Operational efficiency gains',
    ],
    recommendation: 'Continue current strategy with minor adjustments',
  };
}

// ============================================================================
// Workflow Definitions
// ============================================================================

/**
 * Prompt-level reflection demonstration
 */
class PromptReflectionWorkflow extends Workflow {
  @ObservedState()
  attemptCount: number = 0;

  @ObservedState()
  validationErrors: string[] = [];

  @ObservedState()
  finalResult: StrictAnswer | null = null;

  private reflectionManager: ReflectionManager;

  constructor(name: string) {
    super(name);
    this.reflectionManager = new ReflectionManager(
      createReflectionConfig({ enabled: true, maxAttempts: 3 })
    );
  }

  @Step({ trackTiming: true, snapshotState: true })
  async executeWithSchemaValidation(): Promise<StrictAnswer> {
    this.logger.info('Attempting prompt with strict schema validation');

    // Simulate multiple attempts until schema validates
    for (let attempt = 1; attempt <= 3; attempt++) {
      this.attemptCount = attempt;
      this.logger.info(`Attempt ${attempt}/3`);

      const response = await simulateStrictResponse(attempt);

      // Validate against schema
      const result = StrictAnswerSchema.safeParse(response);

      if (result.success) {
        this.logger.info('Schema validation passed!');
        this.finalResult = result.data;
        return result.data;
      }

      // Collect validation errors
      const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      this.validationErrors.push(...errors);
      this.logger.warn(`Validation failed: ${errors.join(', ')}`);

      if (attempt < 3) {
        this.logger.info('Reflecting on error and retrying...');
        await sleep(100); // Reflection delay
      }
    }

    throw new Error('Max reflection attempts exceeded - schema validation failed');
  }

  async run(): Promise<StrictAnswer | null> {
    this.setStatus('running');
    this.logger.info('Starting prompt-level reflection demo');

    try {
      const result = await this.executeWithSchemaValidation();
      this.setStatus('completed');
      return result;
    } catch (error) {
      this.logger.error(`Failed after ${this.attemptCount} attempts`);
      this.setStatus('failed');
      return null;
    }
  }
}

/**
 * Agent-level reflection demonstration
 */
class AgentReflectionWorkflow extends Workflow {
  @ObservedState()
  reflectionHistory: Array<{
    attempt: number;
    action: string;
    result: string;
  }> = [];

  @ObservedState()
  analysisResult: Analysis | null = null;

  constructor(name: string) {
    super(name);
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'reflect-analysis' })
  async reflectOnAnalysis(): Promise<Analysis> {
    this.logger.info('Agent reflecting on analysis approach');

    // Step 1: Initial reasoning
    this.reflectionHistory.push({
      attempt: 1,
      action: 'Initial reasoning',
      result: 'Considering multiple analysis angles',
    });
    await sleep(50);

    // Step 2: Self-correction
    this.reflectionHistory.push({
      attempt: 2,
      action: 'Self-correction',
      result: 'Identified potential bias in initial approach',
    });
    await sleep(50);

    // Step 3: Revised approach
    this.reflectionHistory.push({
      attempt: 3,
      action: 'Revised analysis',
      result: 'Applied broader perspective for balanced view',
    });
    await sleep(50);

    // Final result after reflection
    const result = await simulateAnalysis();
    this.analysisResult = result;

    return result;
  }

  @Step({ snapshotState: true })
  async summarizeReflection(): Promise<string> {
    const summary = `
Reflection Summary:
  Total steps: ${this.reflectionHistory.length}
  ${this.reflectionHistory.map((r) => `  - ${r.action}: ${r.result}`).join('\n')}
    `.trim();

    this.logger.info('Reflection process complete');
    return summary;
  }

  async run(): Promise<Analysis | null> {
    this.setStatus('running');
    this.logger.info('Starting agent-level reflection demo');

    // System prompt would include reflection instructions:
    // "Before answering, reflect on your reasoning step by step.
    //  Consider alternative approaches and potential errors.
    //  Then provide your final answer."

    const result = await this.reflectOnAnalysis();
    await this.summarizeReflection();

    this.setStatus('completed');
    return result;
  }
}

/**
 * Workflow-level reflection demonstration
 */
class WorkflowReflectionWorkflow extends Workflow {
  @ObservedState()
  stepAttempts: Record<string, number> = {};

  @ObservedState()
  failureReasons: string[] = [];

  @ObservedState()
  successfulSteps: string[] = [];

  private reflectionManager: ReflectionManager;

  constructor(name: string) {
    super(name);
    this.reflectionManager = new ReflectionManager(
      createReflectionConfig({ enabled: true, maxAttempts: 3, retryDelayMs: 100 })
    );

    // Set event emitter for reflection events
    this.reflectionManager.setEventEmitter((event) => {
      if (event.type === 'reflectionStart') {
        this.logger.info(`Reflection started at ${event.level} level`);
      } else if (event.type === 'reflectionEnd') {
        this.logger.info(`Reflection ended: ${event.success ? 'will retry' : 'will abort'}`);
      }
    });
  }

  @Step({ trackTiming: true, snapshotState: true })
  async unreliableStep(): Promise<string> {
    const stepName = 'unreliableStep';
    this.stepAttempts[stepName] = (this.stepAttempts[stepName] ?? 0) + 1;
    const attempt = this.stepAttempts[stepName];

    this.logger.info(`Executing unreliable step (attempt ${attempt})`);

    // Simulate failure on first 2 attempts
    if (attempt < 3) {
      const reason = `Transient failure on attempt ${attempt}`;
      this.failureReasons.push(reason);
      throw new Error(reason);
    }

    this.successfulSteps.push(stepName);
    return `Success on attempt ${attempt}`;
  }

  @Step({ trackTiming: true, snapshotState: true })
  async reliableStep(): Promise<string> {
    const stepName = 'reliableStep';
    this.stepAttempts[stepName] = 1;
    this.logger.info('Executing reliable step');
    await sleep(50);
    this.successfulSteps.push(stepName);
    return 'Reliable step completed';
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting workflow-level reflection demo');

    // Create mock node for reflection context
    const mockNode: WorkflowNode = {
      id: this.id,
      name: this.name,
      status: 'running',
      children: [],
      events: [],
    };

    // Execute unreliable step with reflection wrapper
    try {
      await executeWithReflection(
        () => this.unreliableStep(),
        this.reflectionManager,
        (error, attempt, history) => ({
          level: 'workflow',
          failedNode: mockNode,
          error,
          attemptNumber: attempt,
          previousAttempts: history,
        })
      );
    } catch (error) {
      this.logger.error(`Step failed after max attempts: ${(error as Error).message}`);
    }

    // Execute reliable step
    await this.reliableStep();

    this.logger.info(`Completed steps: ${this.successfulSteps.join(', ')}`);
    this.logger.info(`Total failures: ${this.failureReasons.length}`);

    this.setStatus('completed');
  }
}

/**
 * Combined multi-level reflection demonstration
 */
class MultiLevelReflectionWorkflow extends Workflow {
  @ObservedState()
  reflectionEvents: Array<{
    level: string;
    type: string;
    timestamp: number;
  }> = [];

  private reflectionManager: ReflectionManager;

  constructor(name: string) {
    super(name);
    this.reflectionManager = new ReflectionManager(
      createReflectionConfig({ enabled: true, maxAttempts: 3 })
    );

    this.reflectionManager.setEventEmitter((event) => {
      if (event.type === 'reflectionStart' || event.type === 'reflectionEnd') {
        this.reflectionEvents.push({
          level: (event as { level: string }).level,
          type: event.type,
          timestamp: Date.now(),
        });
      }
    });
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'prompt-level' })
  async promptLevelReflection(): Promise<void> {
    this.logger.info('Prompt-level: Schema validation with retry');
    this.reflectionEvents.push({
      level: 'prompt',
      type: 'validation',
      timestamp: Date.now(),
    });
    await sleep(50);
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'agent-level' })
  async agentLevelReflection(): Promise<void> {
    this.logger.info('Agent-level: Self-correction before final answer');
    this.reflectionEvents.push({
      level: 'agent',
      type: 'self-correction',
      timestamp: Date.now(),
    });
    await sleep(50);
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'workflow-level' })
  async workflowLevelReflection(): Promise<void> {
    this.logger.info('Workflow-level: Step retry on failure');
    this.reflectionEvents.push({
      level: 'workflow',
      type: 'step-retry',
      timestamp: Date.now(),
    });
    await sleep(50);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting multi-level reflection demonstration');

    await this.promptLevelReflection();
    await this.agentLevelReflection();
    await this.workflowLevelReflection();

    this.logger.info(`Total reflection events: ${this.reflectionEvents.length}`);
    this.setStatus('completed');
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

/**
 * Run the Multi-level Reflection example
 */
export async function runReflectionExample(): Promise<void> {
  printHeader('Example 9: Multi-level Reflection');

  // Part 1: Prompt-Level Reflection
  printSection('Part 1: Prompt-Level Reflection (Schema Validation)');
  {
    console.log('Demonstrates: enableReflection on prompt config');
    console.log('Behavior: Auto-retry when schema validation fails\n');

    const workflow = new PromptReflectionWorkflow('PromptReflection');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const result = await workflow.run();

    console.log('\nExecution summary:');
    console.log(`  Attempts: ${workflow.attemptCount}`);
    console.log(`  Validation errors: ${workflow.validationErrors.length}`);
    if (workflow.validationErrors.length > 0) {
      console.log(`  Errors encountered:`);
      for (const error of workflow.validationErrors) {
        console.log(`    - ${error}`);
      }
    }

    if (result) {
      console.log(`\nFinal result:`);
      console.log(`  Answer: ${result.answer.slice(0, 50)}...`);
      console.log(`  Confidence: ${result.confidence}`);
    }

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  // Part 2: Agent-Level Reflection
  printSection('Part 2: Agent-Level Reflection (Self-Correction)');
  {
    console.log('Demonstrates: agent.reflect() method with system prompt prefix');
    console.log('Behavior: Agent reviews reasoning before final answer\n');

    const workflow = new AgentReflectionWorkflow('AgentReflection');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const result = await workflow.run();

    console.log('Reflection history:');
    for (const entry of workflow.reflectionHistory) {
      console.log(`  ${entry.attempt}. ${entry.action}: ${entry.result}`);
    }

    if (result) {
      console.log(`\nAnalysis result:`);
      console.log(`  Summary: ${result.summary}`);
      console.log(`  Key points: ${result.keyPoints.length}`);
      console.log(`  Recommendation: ${result.recommendation}`);
    }

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  // Part 3: Workflow-Level Reflection
  printSection('Part 3: Workflow-Level Reflection (Step Retry)');
  {
    console.log('Demonstrates: executeWithReflection() wrapper');
    console.log('Behavior: Retry failed steps with reflection analysis\n');

    const workflow = new WorkflowReflectionWorkflow('WorkflowReflection');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    await workflow.run();

    console.log('\nStep attempt summary:');
    for (const [step, attempts] of Object.entries(workflow.stepAttempts)) {
      console.log(`  ${step}: ${attempts} attempt(s)`);
    }

    console.log(`\nFailure reasons:`);
    for (const reason of workflow.failureReasons) {
      console.log(`  - ${reason}`);
    }

    console.log(`\nSuccessful steps: ${workflow.successfulSteps.join(', ')}`);

    // Show reflection history
    const history = workflow['reflectionManager'].getReflectionHistory();
    console.log(`\nReflection history entries: ${history.length}`);
    for (const entry of history) {
      console.log(`  [${entry.level}] ${entry.reason} -> ${entry.resolution}`);
    }

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  // Part 4: Multi-Level Combined
  printSection('Part 4: Multi-Level Reflection Overview');
  {
    console.log('All three levels working together:\n');

    const workflow = new MultiLevelReflectionWorkflow('MultiLevelReflection');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    await workflow.run();

    console.log('Reflection events by level:');
    const byLevel = workflow.reflectionEvents.reduce(
      (acc, event) => {
        acc[event.level] = (acc[event.level] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    for (const [level, count] of Object.entries(byLevel)) {
      console.log(`  ${level}: ${count} event(s)`);
    }

    console.log('\nReflection configuration defaults:');
    console.log(`  Enabled: ${DEFAULT_REFLECTION_CONFIG.enabled}`);
    console.log(`  Max attempts: ${DEFAULT_REFLECTION_CONFIG.maxAttempts}`);
    console.log(`  Retry delay: ${DEFAULT_REFLECTION_CONFIG.retryDelayMs}ms`);

    console.log('\nTree:');
    console.log(debugger_.toTreeString());

    const stats = debugger_.getStats();
    console.log('\nFinal statistics:', stats);
  }

  console.log('\n=== Example 9 Complete ===');
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runReflectionExample().catch(console.error);
}

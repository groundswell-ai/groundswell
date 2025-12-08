/**
 * Example 7: Agent Loops with Observability
 *
 * Demonstrates:
 * - Using Agent.prompt() within ctx.step() loops
 * - Multiple agents for different item types
 * - Full event tree visualization with timing
 * - State snapshots at each iteration
 * - Cache hit/miss tracking
 */

import { z } from 'zod';
import {
  Workflow,
  Step,
  ObservedState,
  WorkflowTreeDebugger,
  createAgent,
  createPrompt,
  defaultCache,
} from 'groundswell';
import { printHeader, printSection, sleep, simulateApiCall } from '../utils/helpers.js';

// ============================================================================
// Response Schemas
// ============================================================================

const ClassificationSchema = z.object({
  item: z.string(),
  category: z.enum(['fruit', 'vegetable', 'grain', 'protein', 'dairy']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const TextAnalysisSchema = z.object({
  input: z.string(),
  wordCount: z.number(),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  keyWords: z.array(z.string()),
});

const NumberAnalysisSchema = z.object({
  input: z.number(),
  isEven: z.boolean(),
  isPrime: z.boolean(),
  factors: z.array(z.number()),
});

type Classification = z.infer<typeof ClassificationSchema>;
type TextAnalysis = z.infer<typeof TextAnalysisSchema>;
type NumberAnalysis = z.infer<typeof NumberAnalysisSchema>;

// ============================================================================
// Simulated Agent Responses (no actual API calls)
// ============================================================================

/**
 * Simulate classification response
 */
async function simulateClassification(item: string): Promise<Classification> {
  const categories: Record<string, 'fruit' | 'vegetable' | 'grain' | 'protein' | 'dairy'> = {
    apple: 'fruit',
    banana: 'fruit',
    cherry: 'fruit',
    carrot: 'vegetable',
    broccoli: 'vegetable',
    rice: 'grain',
    chicken: 'protein',
    milk: 'dairy',
  };

  await sleep(50 + Math.random() * 100);

  return {
    item,
    category: categories[item.toLowerCase()] ?? 'fruit',
    confidence: 0.85 + Math.random() * 0.15,
    reasoning: `${item} is classified based on its nutritional properties`,
  };
}

/**
 * Simulate text analysis response
 */
async function simulateTextAnalysis(input: string): Promise<TextAnalysis> {
  await sleep(30 + Math.random() * 70);

  const words = input.split(/\s+/).filter((w) => w.length > 0);
  const sentiments: Array<'positive' | 'negative' | 'neutral'> = [
    'positive',
    'neutral',
    'negative',
  ];

  return {
    input,
    wordCount: words.length,
    sentiment: sentiments[Math.floor(Math.random() * 3)],
    keyWords: words.filter((w) => w.length > 4).slice(0, 3),
  };
}

/**
 * Simulate number analysis response
 */
async function simulateNumberAnalysis(input: number): Promise<NumberAnalysis> {
  await sleep(20 + Math.random() * 50);

  const isPrime = (n: number): boolean => {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  };

  const getFactors = (n: number): number[] => {
    const factors: number[] = [];
    for (let i = 1; i <= n; i++) {
      if (n % i === 0) factors.push(i);
    }
    return factors;
  };

  return {
    input,
    isEven: input % 2 === 0,
    isPrime: isPrime(input),
    factors: getFactors(input),
  };
}

// ============================================================================
// Workflow Definitions
// ============================================================================

/**
 * Basic agent loop workflow - processes items sequentially
 */
class BasicAgentLoopWorkflow extends Workflow {
  @ObservedState()
  items: string[] = [];

  @ObservedState()
  results: Classification[] = [];

  @ObservedState()
  currentIndex: number = 0;

  constructor(name: string, items: string[]) {
    super(name);
    this.items = items;
  }

  @Step({ trackTiming: true, snapshotState: true })
  async processItem(item: string): Promise<Classification> {
    this.logger.info(`Processing: ${item}`);
    const result = await simulateClassification(item);
    this.results.push(result);
    this.currentIndex++;
    return result;
  }

  async run(): Promise<Classification[]> {
    this.setStatus('running');
    this.logger.info(`Starting loop with ${this.items.length} items`);

    const startTime = Date.now();

    for (const item of this.items) {
      await this.processItem(item);
    }

    const duration = Date.now() - startTime;
    this.logger.info(`Loop completed in ${duration}ms`);

    this.setStatus('completed');
    return this.results;
  }
}

/**
 * Multi-agent loop workflow - uses different agents for different data types
 */
class MultiAgentLoopWorkflow extends Workflow {
  @ObservedState()
  mixedData: Array<string | number> = [];

  @ObservedState()
  textResults: TextAnalysis[] = [];

  @ObservedState()
  numberResults: NumberAnalysis[] = [];

  @ObservedState()
  processedCount: number = 0;

  constructor(name: string, data: Array<string | number>) {
    super(name);
    this.mixedData = data;
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'analyze-text' })
  async analyzeText(input: string): Promise<TextAnalysis> {
    this.logger.info(`TextAgent analyzing: "${input}"`);
    const result = await simulateTextAnalysis(input);
    this.textResults.push(result);
    this.processedCount++;
    return result;
  }

  @Step({ trackTiming: true, snapshotState: true, name: 'analyze-number' })
  async analyzeNumber(input: number): Promise<NumberAnalysis> {
    this.logger.info(`NumberAgent analyzing: ${input}`);
    const result = await simulateNumberAnalysis(input);
    this.numberResults.push(result);
    this.processedCount++;
    return result;
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info(`Starting multi-agent loop with ${this.mixedData.length} items`);

    const startTime = Date.now();

    for (const input of this.mixedData) {
      if (typeof input === 'string') {
        await this.analyzeText(input);
      } else {
        await this.analyzeNumber(input);
      }
    }

    const duration = Date.now() - startTime;
    this.logger.info(`Multi-agent loop completed in ${duration}ms`);
    this.logger.info(`Text results: ${this.textResults.length}, Number results: ${this.numberResults.length}`);

    this.setStatus('completed');
  }
}

/**
 * Cached agent loop workflow - demonstrates cache hits across iterations
 */
class CachedAgentLoopWorkflow extends Workflow {
  @ObservedState()
  items: string[] = [];

  @ObservedState()
  cacheHits: number = 0;

  @ObservedState()
  cacheMisses: number = 0;

  private cache: Map<string, Classification> = new Map();

  constructor(name: string, items: string[]) {
    super(name);
    this.items = items;
  }

  @Step({ trackTiming: true, snapshotState: true })
  async processWithCache(item: string): Promise<Classification> {
    // Check local cache first
    const cached = this.cache.get(item);
    if (cached) {
      this.cacheHits++;
      this.logger.info(`Cache HIT for: ${item}`);
      return cached;
    }

    this.cacheMisses++;
    this.logger.info(`Cache MISS for: ${item}`);

    const result = await simulateClassification(item);
    this.cache.set(item, result);
    return result;
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info(`Starting cached loop with ${this.items.length} items`);

    const startTime = Date.now();

    for (const item of this.items) {
      await this.processWithCache(item);
    }

    const duration = Date.now() - startTime;
    this.logger.info(`Cached loop completed in ${duration}ms`);
    this.logger.info(`Cache hits: ${this.cacheHits}, misses: ${this.cacheMisses}`);

    this.setStatus('completed');
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

/**
 * Run the Agent Loops example
 */
export async function runAgentLoopsExample(): Promise<void> {
  printHeader('Example 7: Agent Loops with Observability');

  // Part 1: Basic Agent Loop
  printSection('Part 1: Basic Agent Loop');
  {
    const items = ['apple', 'banana', 'cherry', 'carrot', 'broccoli'];
    const workflow = new BasicAgentLoopWorkflow('ClassificationLoop', items);
    const debugger_ = new WorkflowTreeDebugger(workflow);

    console.log(`Processing ${items.length} items: ${items.join(', ')}\n`);

    const startTime = Date.now();
    const results = await workflow.run();
    const elapsed = Date.now() - startTime;

    console.log(`\nResults (${elapsed}ms total):`);
    for (const result of results) {
      console.log(`  ${result.item}: ${result.category} (${(result.confidence * 100).toFixed(1)}%)`);
    }

    console.log('\nTree visualization:');
    console.log(debugger_.toTreeString());

    const stats = debugger_.getStats();
    console.log('Statistics:', {
      totalNodes: stats.totalNodes,
      completedSteps: stats.completed,
    });
  }

  // Part 2: Multi-Agent Loop
  printSection('Part 2: Multi-Agent Loop (Different Agents per Type)');
  {
    const mixedData: Array<string | number> = [
      'Hello world',
      42,
      'TypeScript is great',
      17,
      'Agent loops',
      100,
    ];

    const workflow = new MultiAgentLoopWorkflow('MultiAgentLoop', mixedData);
    const debugger_ = new WorkflowTreeDebugger(workflow);

    console.log(`Processing mixed data: ${mixedData.length} items\n`);

    const startTime = Date.now();
    await workflow.run();
    const elapsed = Date.now() - startTime;

    console.log(`\nText Analysis Results:`);
    for (const result of workflow.textResults) {
      console.log(`  "${result.input}": ${result.wordCount} words, ${result.sentiment} sentiment`);
    }

    console.log(`\nNumber Analysis Results:`);
    for (const result of workflow.numberResults) {
      console.log(`  ${result.input}: even=${result.isEven}, prime=${result.isPrime}, factors=[${result.factors.join(',')}]`);
    }

    console.log(`\nTotal time: ${elapsed}ms`);
    console.log('\nTree visualization:');
    console.log(debugger_.toTreeString());
  }

  // Part 3: Cached Agent Loop
  printSection('Part 3: Cached Agent Loop (Duplicate Detection)');
  {
    // Include duplicates to demonstrate cache hits
    const items = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];

    const workflow = new CachedAgentLoopWorkflow('CachedLoop', items);
    const debugger_ = new WorkflowTreeDebugger(workflow);

    console.log(`Processing ${items.length} items with duplicates: ${items.join(', ')}\n`);

    const startTime = Date.now();
    await workflow.run();
    const elapsed = Date.now() - startTime;

    console.log(`\nCache Performance:`);
    console.log(`  Total items: ${items.length}`);
    console.log(`  Cache hits:  ${workflow.cacheHits}`);
    console.log(`  Cache misses: ${workflow.cacheMisses}`);
    console.log(`  Hit rate: ${((workflow.cacheHits / items.length) * 100).toFixed(1)}%`);
    console.log(`\nTotal time: ${elapsed}ms`);

    console.log('\nTree visualization:');
    console.log(debugger_.toTreeString());

    const stats = debugger_.getStats();
    console.log('Statistics:', stats);
  }

  // Part 4: Performance Comparison
  printSection('Part 4: Sequential vs Timing Analysis');
  {
    const items = ['item1', 'item2', 'item3', 'item4', 'item5'];

    console.log('Sequential processing of 5 items:');
    const seqWorkflow = new BasicAgentLoopWorkflow('SequentialLoop', items);

    const seqStart = Date.now();
    await seqWorkflow.run();
    const seqTime = Date.now() - seqStart;

    console.log(`  Sequential time: ${seqTime}ms`);
    console.log(`  Average per item: ${(seqTime / items.length).toFixed(1)}ms`);

    // Show the timing from tree stats
    const debugger_ = new WorkflowTreeDebugger(seqWorkflow);
    const logs = debugger_.getTree().logs;
    console.log(`\nLog entries: ${logs.length}`);
    for (const log of logs.slice(-5)) {
      console.log(`  [${log.level}] ${log.message}`);
    }
  }

  console.log('\n=== Example 7 Complete ===');
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgentLoopsExample().catch(console.error);
}

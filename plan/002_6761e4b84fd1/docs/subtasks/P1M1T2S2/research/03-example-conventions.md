# Example Files Conventions and Patterns

**PRP**: P1.M1.T2.S2
**Research Date**: 2026-01-24
**Purpose**: Document conventions used in example files for consistent updates

---

## Example File Organization

### Location

**Base directory**: `/home/dustin/projects/groundswell/examples/examples/`

**Numbering**: Files are numbered from `01` to `11` with leading zeros:
- `01-basic-workflow.ts`
- `02-decorator-options.ts`
- ...
- `11-reparenting-workflows.ts`

**Utils directory**: `/home/dustin/projects/groundswell/examples/utils/`
- Contains helper functions used across examples

---

## Standard File Structure

Every example file follows this consistent structure:

```typescript
/**
 * Comprehensive header comment
 * ============================
 *
 * Describes:
 * - What the example demonstrates
 * - Key features shown
 * - Expected output/behavior
 *
 * Often includes ASCII art or formatted headers
 */

// ========================
// IMPORTS
// ========================

// Core workflow imports
import { Workflow, Step, Task, ObservedState, WorkflowTreeDebugger } from 'groundswell';

// Agent-specific imports (when used)
import { createAgent, createPrompt } from 'groundswell';

// Utility imports
import { printHeader, printSection, sleep, prettyJson } from '../utils/helpers.js';

// ========================
// WORKFLOW CLASS
// ========================

export class ExampleWorkflow extends Workflow {
  // State properties with @ObservedState decorator
  @ObservedState()
  private exampleState: string = 'initial';

  // Step methods with @Step decorator
  @Step({ logStart: true, logFinish: true })
  async exampleStep() {
    // Step implementation
  }
}

// ========================
// RUN FUNCTION
// ========================

export async function runExampleFeatureExample() {
  // Setup: Create workflow instance
  const workflow = new ExampleWorkflow('example-workflow');

  // Visualization: Print header
  printHeader('Example Feature Demo');

  // Execution: Run workflow
  const result = await workflow.run();

  // Visualization: Show tree/results
  const debugger = new WorkflowTreeDebugger(workflow);
  console.log(debugger.toTreeString());

  return result;
}

// ========================
// STANDALONE EXECUTION
// ========================

if (import.meta.url === file://${process.argv[1]}) {
  runExampleFeatureExample().catch(console.error);
}
```

---

## Naming Conventions

### Files

- **Pattern**: `{two-digit-number}-{descriptive-kebab-case}.ts`
- **Examples**:
  - `01-basic-workflow.ts`
  - `04-parallel-execution.ts`
  - `10-introspection.ts`

### Classes

- **Pattern**: PascalCase with descriptive names
- **Suffix**: Always ends with `Workflow`
- **Examples**:
  - `BasicWorkflow`
  - `DataProcessingWorkflow`
  - `IntrospectionWorkflow`

### Functions

- **Pattern**: `run{FeatureName}Example()`
- **Examples**:
  - `runBasicWorkflowExample()`
  - `runDecoratorOptionsExample()`
  - `runIntrospectionExample()`

### Methods

- **Pattern**: camelCase, explicit about purpose
- **Examples**:
  - `loadData()`, `processData()`, `saveData()`
  - `analyzeResults()`, `generateReport()`

### Variables

- **Pattern**: camelCase
- **State variables**: Private properties with descriptive names
- **Examples**:
  - `private itemCount: number = 0;`
  - `private results: string[] = [];`

---

## Import Patterns

### Standard Import Block

```typescript
// Core workflow framework
import { Workflow, Step, Task, ObservedState } from 'groundswell';
import { WorkflowTreeDebugger } from 'groundswell';

// Agent integration (when used)
import { createAgent, createPrompt } from 'groundswell';

// Utilities
import { printHeader, printSection, sleep } from '../utils/helpers.js';
```

### Import Organization

1. **Core workflow** (Workflow, decorators)
2. **Agent utilities** (if used)
3. **Helpers** (from utils/)
4. **External dependencies** (zod, etc.)

---

## Decorator Usage Patterns

### @Step Decorator Options

```typescript
// Basic step with logging
@Step({ logStart: true, logFinish: true })

// Step with state tracking
@Step({ snapshotState: true, trackTiming: true })

// Step with metadata
@Step({
  logStart: 'Loading data from API',
  logFinish: 'Data loaded successfully'
})
```

### @Task Decorator Options

```typescript
// Sequential tasks (default)
@Task()
async task1() { }

// Concurrent tasks
@Task({ concurrent: true })
async task2() { }

// Tasks with dependencies
@Task({ dependsOn: ['task1'] })
async task3() { }
```

### @ObservedState Decorator Variants

```typescript
// Basic observed state
@ObservedState()
private counter: number = 0;

// Redacted state (shown but values hidden)
@ObservedState({ redact: true })
private apiKey: string = 'secret';

// Hidden state (not shown in tree)
@ObservedState({ hidden: true })
private internalCache: Map<string, any> = new Map();
```

---

## Error Handling Patterns

### Try-Catch in Run Function

```typescript
export async function runExampleFeatureExample() {
  try {
    const workflow = new ExampleWorkflow('example');
    const result = await workflow.run();

    // Success path
    printSection('Results');
    console.log(prettyJson(result));

    return result;
  } catch (error) {
    // Error handling
    console.error('Workflow failed:', error);
    throw error;
  }
}
```

### Step-Level Error Handling

The `@Step` decorator automatically wraps errors in `WorkflowError` with context:

```typescript
@Step()
async riskyOperation() {
  // If this throws, @Step wraps it in WorkflowError
  // Error context includes: workflowId, state, logs, original error
  throw new Error('Something went wrong');
}
```

### Manual Retry Pattern

```typescript
@Step()
async operationWithRetry() {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      return await this.simulateUnreliableTask(data, 0.3);
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      await sleep(1000 * attempts); // Exponential backoff
    }
  }
}
```

---

## Output and Display Patterns

### Print Helper Functions

From `../utils/helpers.ts`:

```typescript
// Large formatted header
printHeader('Example Feature Demo');

// Section divider
printSection('Step 1: Load Data');

// Pretty JSON output
console.log(prettyJson(complexObject));
```

### WorkflowTreeDebugger Usage

```typescript
const debugger = new WorkflowTreeDebugger(workflow);

// ASCII tree representation
console.log(debugger.toTreeString());

// Event timeline
console.log(debugger.toLogString());

// Performance statistics
console.log(debugger.getStats());
```

---

## Agent Integration Patterns

### Creating an Agent

```typescript
import { createAgent } from 'groundswell';

const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
});
```

### Creating a Prompt with Schema

```typescript
import { createPrompt } from 'groundswell';
import { z } from 'zod';

const analysisSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  confidence: z.number(),
});

const prompt = createPrompt({
  schema: analysisSchema,
  system: 'You are an expert analyst.',
  user: 'Analyze this data: {data}',
});
```

### Using Agent in a Step (OLD PATTERN - NEEDS UPDATE)

```typescript
@Step()
async analyzeData() {
  // OLD: Direct data access (no status check)
  const result = await this.agent.prompt(analysisPrompt);
  console.log(result.summary); // WRONG - no status check!
}
```

### Using Agent in a Step (NEW PATTERN - CORRECT)

```typescript
@Step()
async analyzeData() {
  // NEW: Proper AgentResponse handling
  const response = await this.agent.prompt(analysisPrompt);

  if (response.status === 'error') {
    this.logger.error('Analysis failed', { error: response.error });
    throw new Error(response.error.message);
  }

  const result = response.data;
  console.log(result.summary); // SAFE
}
```

---

## Helper Utilities Reference

From `/home/dustin/projects/groundswell/examples/utils/helpers.ts`:

```typescript
// Formatted output
printHeader(title: string): void
printSection(title: string): void

// Utilities
sleep(ms: number): Promise<void>
prettyJson(obj: unknown): string

// Simulation
simulateApiCall<T>(data: T, minMs: number, maxMs: number): Promise<T>
simulateUnreliableTask<T>(data: T, failureRate: number): Promise<T>
```

---

## Example Execution

### Individual Execution

Each example can run independently via `tsx`:

```bash
npx tsx examples/examples/01-basic-workflow.ts
```

### NPM Scripts

From `package.json`:

```json
{
  "scripts": {
    "start:basic": "tsx examples/examples/01-basic-workflow.ts",
    "start:decorators": "tsx examples/examples/02-decorator-options.ts",
    // ... etc for each example
  }
}
```

Usage:
```bash
npm run start:basic
```

### Batch Execution

Main `examples/index.ts` can run all examples:

```typescript
// Runs all examples in sequence with error handling
for (const example of examples) {
  try {
    await example.run();
  } catch (error) {
    console.error(`${example.name} failed:`, error);
  }
}
```

---

## Documentation Guidelines

### Header Comment Format

```typescript
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                     Feature Name Example                      ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║                                                               ║
 * ║  This example demonstrates:                                  ║
 * ║  • Key feature 1                                              ║
 * ║  • Key feature 2                                              ║
 * ║  • Key feature 3                                              ║
 * ║                                                               ║
 * ║  Expected output:                                             ║
 * ║  - Shows feature 1 in action                                  ║
 * ║  - Demonstrates feature 2                                     ║
 * ║  - Results in feature 3                                       ║
 * ║                                                               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
```

### Inline Documentation

```typescript
// ============================================================================
// STEP 1: Initialize workflow
// ============================================================================

@Step()
async initialize() {
  // Create initial state
  this.state = { count: 0 };
}

// ============================================================================
// STEP 2: Process data
// ============================================================================
```

---

## State Management Patterns

### Observed State

```typescript
export class ExampleWorkflow extends Workflow {
  @ObservedState()
  public itemCount: number = 0;

  @ObservedState({ redact: true })
  private apiKey: string = 'secret-key';

  @ObservedState({ hidden: true })
  private internalCache: Map<string, any> = new Map();
}
```

### State Updates in Steps

```typescript
@Step()
async incrementCounter() {
  this.itemCount++; // Automatically tracked by @ObservedState
  this.logger.info(`Counter incremented to ${this.itemCount}`);
}
```

---

## Logging Patterns

### Logger Usage

```typescript
@Step()
async exampleStep() {
  this.logger.info('Starting operation');
  this.logger.debug('Detailed debug info', { context: 'data' });
  this.logger.warn('Warning message');
  this.logger.error('Error occurred', { error: err });
}
```

### Decorator Logging

```typescript
@Step({
  logStart: 'Custom start message',
  logFinish: 'Custom finish message'
})
async operation() {
  // Decorator automatically logs start/finish with custom messages
}
```

---

## Summary

Example files in Groundswell follow a consistent, well-documented structure:

1. **Standard file layout**: Header → Imports → Class → Run function → Standalone execution
2. **Naming conventions**: Descriptive, consistent naming throughout
3. **Decorator patterns**: @Step, @Task, @ObservedState with standard options
4. **Error handling**: Try-catch in run function, automatic @Step error wrapping
5. **Output formatting**: Consistent use of helper functions and WorkflowTreeDebugger
6. **Agent integration**: Proper AgentResponse handling (to be updated)
7. **Documentation**: Comprehensive header comments and inline documentation

When updating example files for AgentResponse handling, maintain these conventions and follow the established patterns.

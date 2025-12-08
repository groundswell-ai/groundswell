/**
 * Example 8: SDK Features Integration
 *
 * Demonstrates:
 * - Custom tool definitions with handlers
 * - MCP server configuration (inprocess)
 * - Pre/Post tool hooks for logging and validation
 * - Skills integration with system prompt content
 * - Environment variable pass-through
 */

import { z } from 'zod';
import {
  Workflow,
  Step,
  ObservedState,
  WorkflowTreeDebugger,
  MCPHandler,
} from 'groundswell';
import type {
  Tool,
  AgentHooks,
  PreToolUseContext,
  PostToolUseContext,
  SessionStartContext,
  SessionEndContext,
} from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';

// ============================================================================
// Custom Tool Definitions
// ============================================================================

/**
 * Calculator tool - performs basic arithmetic
 */
const calculatorTool: Tool = {
  name: 'calculate',
  description: 'Performs basic arithmetic operations (add, subtract, multiply, divide)',
  input_schema: {
    type: 'object' as const,
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The arithmetic operation to perform',
      },
      a: {
        type: 'number',
        description: 'The first operand',
      },
      b: {
        type: 'number',
        description: 'The second operand',
      },
    },
    required: ['operation', 'a', 'b'],
  },
};

/**
 * Weather tool - simulates weather lookup
 */
const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Gets current weather for a location',
  input_schema: {
    type: 'object' as const,
    properties: {
      location: {
        type: 'string',
        description: 'City name or location',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature units',
      },
    },
    required: ['location'],
  },
};

/**
 * Database tool - simulates database queries
 */
const databaseTool: Tool = {
  name: 'query_database',
  description: 'Executes a database query and returns results',
  input_schema: {
    type: 'object' as const,
    properties: {
      table: {
        type: 'string',
        description: 'Table name to query',
      },
      filter: {
        type: 'object',
        description: 'Filter conditions',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
      },
    },
    required: ['table'],
  },
};

// ============================================================================
// Tool Handlers
// ============================================================================

interface CalculateInput {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

interface WeatherInput {
  location: string;
  units?: 'celsius' | 'fahrenheit';
}

interface DatabaseInput {
  table: string;
  filter?: Record<string, unknown>;
  limit?: number;
}

/**
 * Handle calculator operations
 */
async function handleCalculate(input: CalculateInput): Promise<{ result: number; expression: string }> {
  await sleep(50); // Simulate processing time

  let result: number;
  let expression: string;

  switch (input.operation) {
    case 'add':
      result = input.a + input.b;
      expression = `${input.a} + ${input.b} = ${result}`;
      break;
    case 'subtract':
      result = input.a - input.b;
      expression = `${input.a} - ${input.b} = ${result}`;
      break;
    case 'multiply':
      result = input.a * input.b;
      expression = `${input.a} × ${input.b} = ${result}`;
      break;
    case 'divide':
      if (input.b === 0) throw new Error('Division by zero');
      result = input.a / input.b;
      expression = `${input.a} ÷ ${input.b} = ${result}`;
      break;
  }

  return { result, expression };
}

/**
 * Handle weather lookup (simulated)
 */
async function handleWeather(input: WeatherInput): Promise<{
  location: string;
  temperature: number;
  units: string;
  conditions: string;
}> {
  await sleep(100); // Simulate API call

  const weatherData: Record<string, { temp: number; conditions: string }> = {
    'new york': { temp: 72, conditions: 'Partly cloudy' },
    london: { temp: 58, conditions: 'Rainy' },
    tokyo: { temp: 85, conditions: 'Sunny' },
    sydney: { temp: 68, conditions: 'Clear' },
  };

  const locationKey = input.location.toLowerCase();
  const data = weatherData[locationKey] ?? { temp: 70, conditions: 'Unknown' };

  const temp =
    input.units === 'celsius' ? Math.round((data.temp - 32) * (5 / 9)) : data.temp;

  return {
    location: input.location,
    temperature: temp,
    units: input.units ?? 'fahrenheit',
    conditions: data.conditions,
  };
}

/**
 * Handle database queries (simulated)
 */
async function handleDatabase(input: DatabaseInput): Promise<{
  table: string;
  rowCount: number;
  results: Array<Record<string, unknown>>;
}> {
  await sleep(75); // Simulate query time

  const mockData: Record<string, Array<Record<string, unknown>>> = {
    users: [
      { id: 1, name: 'Alice', role: 'admin' },
      { id: 2, name: 'Bob', role: 'user' },
      { id: 3, name: 'Charlie', role: 'user' },
    ],
    products: [
      { id: 1, name: 'Widget', price: 9.99 },
      { id: 2, name: 'Gadget', price: 19.99 },
    ],
    orders: [
      { id: 1, userId: 1, total: 29.98 },
      { id: 2, userId: 2, total: 9.99 },
    ],
  };

  const tableData = mockData[input.table] ?? [];
  const limit = input.limit ?? tableData.length;
  const results = tableData.slice(0, limit);

  return {
    table: input.table,
    rowCount: results.length,
    results,
  };
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Create comprehensive agent hooks for logging and validation
 */
function createLoggingHooks(): AgentHooks {
  const hookLogs: string[] = [];

  return {
    preToolUse: [
      async (ctx: PreToolUseContext): Promise<void> => {
        const log = `[PRE] Tool: ${ctx.toolName}, Input: ${JSON.stringify(ctx.toolInput)}`;
        hookLogs.push(log);
        console.log(`  ${log}`);
      },
      async (ctx: PreToolUseContext): Promise<void> => {
        // Validation hook - could block execution if needed
        if (ctx.toolName === 'calculate') {
          const input = ctx.toolInput as CalculateInput;
          if (input.operation === 'divide' && input.b === 0) {
            console.log('  [PRE] WARNING: Division by zero detected');
          }
        }
      },
    ],
    postToolUse: [
      async (ctx: PostToolUseContext): Promise<void> => {
        const log = `[POST] Tool: ${ctx.toolName}, Duration: ${ctx.duration}ms`;
        hookLogs.push(log);
        console.log(`  ${log}`);
      },
      async (ctx: PostToolUseContext): Promise<void> => {
        // Metrics collection hook
        const output = ctx.toolOutput as Record<string, unknown>;
        if (output.result !== undefined) {
          console.log(`  [POST] Result: ${output.result}`);
        }
      },
    ],
    sessionStart: [
      async (ctx: SessionStartContext): Promise<void> => {
        console.log(`  [SESSION] Started: Agent ${ctx.agentName} (${ctx.agentId})`);
        hookLogs.push(`Session started: ${ctx.agentName}`);
      },
    ],
    sessionEnd: [
      async (ctx: SessionEndContext): Promise<void> => {
        console.log(`  [SESSION] Ended: Agent ${ctx.agentName}, Duration: ${ctx.totalDuration}ms`);
        hookLogs.push(`Session ended: ${ctx.agentName} (${ctx.totalDuration}ms)`);
      },
    ],
  };
}

// ============================================================================
// Workflow Definitions
// ============================================================================

/**
 * Tool demonstration workflow
 */
class ToolDemoWorkflow extends Workflow {
  @ObservedState()
  toolCalls: Array<{ tool: string; input: unknown; result: unknown }> = [];

  private mcpHandler: MCPHandler;

  constructor(name: string) {
    super(name);
    this.mcpHandler = new MCPHandler();

    // Register MCP server with tools (inprocess transport)
    this.mcpHandler.registerServer({
      name: 'demo',
      transport: 'inprocess',
      tools: [calculatorTool, weatherTool, databaseTool],
    });

    // Register tool executors
    this.mcpHandler.registerToolExecutor('demo', 'calculate', (input) =>
      handleCalculate(input as CalculateInput)
    );
    this.mcpHandler.registerToolExecutor('demo', 'get_weather', (input) =>
      handleWeather(input as WeatherInput)
    );
    this.mcpHandler.registerToolExecutor('demo', 'query_database', (input) =>
      handleDatabase(input as DatabaseInput)
    );
  }

  @Step({ trackTiming: true })
  async callTool(toolName: string, input: unknown): Promise<unknown> {
    this.logger.info(`Calling tool: ${toolName}`);

    // Use full tool name: serverName__toolName
    const fullName = `demo__${toolName}`;
    const result = await this.mcpHandler.executeTool(fullName, input);

    this.toolCalls.push({ tool: toolName, input, result: result.content });
    return result.content;
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting tool demonstration');

    // Demonstrate calculator tool
    await this.callTool('calculate', { operation: 'add', a: 10, b: 5 });
    await this.callTool('calculate', { operation: 'multiply', a: 7, b: 8 });

    // Demonstrate weather tool
    await this.callTool('get_weather', { location: 'Tokyo', units: 'celsius' });
    await this.callTool('get_weather', { location: 'London' });

    // Demonstrate database tool
    await this.callTool('query_database', { table: 'users', limit: 2 });
    await this.callTool('query_database', { table: 'products' });

    this.logger.info(`Total tool calls: ${this.toolCalls.length}`);
    this.setStatus('completed');
  }
}

/**
 * Hook demonstration workflow
 */
class HookDemoWorkflow extends Workflow {
  @ObservedState()
  hookEvents: string[] = [];

  private mcpHandler: MCPHandler;

  constructor(name: string) {
    super(name);
    this.mcpHandler = new MCPHandler();

    // Register MCP server with calculator tool
    this.mcpHandler.registerServer({
      name: 'calc',
      transport: 'inprocess',
      tools: [calculatorTool],
    });
    this.mcpHandler.registerToolExecutor('calc', 'calculate', (input) =>
      handleCalculate(input as CalculateInput)
    );
  }

  @Step({ trackTiming: true, logStart: true, logFinish: true })
  async executeWithHooks(): Promise<void> {
    // Simulate hook execution flow
    this.hookEvents.push('preToolUse: calculate');
    const result = await handleCalculate({ operation: 'add', a: 100, b: 200 });
    this.hookEvents.push(`postToolUse: calculate (result=${result.result})`);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Demonstrating lifecycle hooks');

    this.hookEvents.push('sessionStart');
    await this.executeWithHooks();
    this.hookEvents.push('sessionEnd');

    this.logger.info(`Hook events: ${this.hookEvents.length}`);
    this.setStatus('completed');
  }
}

/**
 * Skills demonstration workflow
 */
class SkillsDemoWorkflow extends Workflow {
  @ObservedState()
  skillContent: string = '';

  @ObservedState()
  systemPrompt: string = '';

  constructor(name: string) {
    super(name);
  }

  @Step({ snapshotState: true })
  async loadSkill(): Promise<void> {
    // Simulate loading skill content from SKILL.md
    this.skillContent = `
# Math Expert Skill

You are an expert mathematician. You can:
- Perform complex calculations
- Explain mathematical concepts
- Solve equations step by step

## Usage
Ask me any math question and I'll provide a detailed solution.
    `.trim();

    this.logger.info('Loaded skill: Math Expert');
  }

  @Step({ snapshotState: true })
  async buildSystemPrompt(): Promise<void> {
    const baseSystem = 'You are a helpful assistant.';

    // Skills inject content into system prompt
    this.systemPrompt = `${baseSystem}

## Available Skills

${this.skillContent}

## Instructions
Use the loaded skills to assist the user with their requests.`;

    this.logger.info('Built system prompt with skill content');
  }

  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Demonstrating skills integration');

    await this.loadSkill();
    await this.buildSystemPrompt();

    this.logger.info(`System prompt length: ${this.systemPrompt.length} chars`);
    this.setStatus('completed');

    return this.systemPrompt;
  }
}

/**
 * Environment variables demonstration workflow
 */
class EnvVarsDemoWorkflow extends Workflow {
  @ObservedState()
  capturedEnvVars: Record<string, string> = {};

  @ObservedState({ redact: true })
  sensitiveVars: Record<string, string> = {};

  constructor(name: string) {
    super(name);
  }

  @Step({ snapshotState: true })
  async captureEnvironment(): Promise<void> {
    // Capture non-sensitive environment info
    this.capturedEnvVars = {
      NODE_ENV: process.env.NODE_ENV ?? 'development',
      PWD: process.env.PWD ?? '(unknown)',
      SHELL: process.env.SHELL ?? '(unknown)',
    };

    // Simulate sensitive vars (would be passed to agent)
    this.sensitiveVars = {
      API_KEY: 'demo-key-12345',
      DATABASE_URL: 'postgres://localhost:5432/demo',
    };

    this.logger.info('Captured environment variables');
  }

  @Step()
  async demonstratePassThrough(): Promise<void> {
    // In real usage, env vars are passed through to agent execution
    this.logger.info('Environment vars would be set during agent execution');
    this.logger.info(`Non-sensitive vars: ${Object.keys(this.capturedEnvVars).join(', ')}`);
    this.logger.info(`Sensitive vars (redacted): ${Object.keys(this.sensitiveVars).length} vars`);
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Demonstrating environment variable handling');

    await this.captureEnvironment();
    await this.demonstratePassThrough();

    this.setStatus('completed');
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

/**
 * Run the SDK Features example
 */
export async function runSDKFeaturesExample(): Promise<void> {
  printHeader('Example 8: SDK Features Integration');

  // Part 1: Custom Tool Definitions
  printSection('Part 1: Custom Tool Definitions & Handlers');
  {
    const workflow = new ToolDemoWorkflow('ToolDemo');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    console.log('Registered tools:');
    console.log('  - calculate: Basic arithmetic operations');
    console.log('  - get_weather: Weather lookup (simulated)');
    console.log('  - query_database: Database queries (simulated)\n');

    await workflow.run();

    console.log('\nTool call results:');
    for (const call of workflow.toolCalls) {
      console.log(`  ${call.tool}: ${JSON.stringify(call.result)}`);
    }

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  // Part 2: MCP Server Integration
  printSection('Part 2: MCP Handler / In-Process Server');
  {
    console.log('MCP Handler features:');
    console.log('  - Register servers with tools (registerServer)');
    console.log('  - Register executors for inprocess tools (registerToolExecutor)');
    console.log('  - Execute tools by full name: serverName__toolName');
    console.log('  - Return structured ToolResult objects');
    console.log('  - Error handling with is_error flag\n');

    const mcpHandler = new MCPHandler();

    // Register server with tool
    const demoTool: Tool = {
      name: 'demo_tool',
      description: 'A demonstration tool',
      input_schema: {
        type: 'object' as const,
        properties: { test: { type: 'string' } },
        required: [],
      },
    };

    mcpHandler.registerServer({
      name: 'demo',
      transport: 'inprocess',
      tools: [demoTool],
    });

    mcpHandler.registerToolExecutor('demo', 'demo_tool', async (input: unknown) => ({
      status: 'success',
      input,
    }));

    const tools = mcpHandler.getTools();
    console.log(`Registered tools count: ${tools.length}`);

    // Execute using full name: serverName__toolName
    const result = await mcpHandler.executeTool('demo__demo_tool', { test: 'data' });
    console.log(`Execution result: ${JSON.stringify(result)}`);
  }

  // Part 3: Lifecycle Hooks
  printSection('Part 3: Lifecycle Hooks (Pre/Post Tool, Session)');
  {
    console.log('Hook types demonstrated:');
    console.log('  - preToolUse: Log input, validate parameters');
    console.log('  - postToolUse: Log duration, collect metrics');
    console.log('  - sessionStart: Initialize session context');
    console.log('  - sessionEnd: Cleanup, final metrics\n');

    const workflow = new HookDemoWorkflow('HookDemo');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    await workflow.run();

    console.log('\nHook events captured:');
    for (const event of workflow.hookEvents) {
      console.log(`  → ${event}`);
    }

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  // Part 4: Skills Integration
  printSection('Part 4: Skills Integration');
  {
    console.log('Skills system:');
    console.log('  - Load SKILL.md content from skill directories');
    console.log('  - Inject skill content into system prompt');
    console.log('  - Multiple skills can be combined\n');

    const workflow = new SkillsDemoWorkflow('SkillsDemo');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    const systemPrompt = await workflow.run();

    console.log('Generated system prompt preview:');
    console.log('─'.repeat(50));
    console.log(systemPrompt.slice(0, 300) + '...');
    console.log('─'.repeat(50));

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  // Part 5: Environment Variables
  printSection('Part 5: Environment Variable Pass-Through');
  {
    console.log('Environment handling:');
    console.log('  - Pass env vars to agent execution context');
    console.log('  - Sensitive vars marked with @ObservedState({ redact: true })');
    console.log('  - Vars restored after execution\n');

    const workflow = new EnvVarsDemoWorkflow('EnvVarsDemo');
    const debugger_ = new WorkflowTreeDebugger(workflow);

    await workflow.run();

    console.log('\nCaptured environment:');
    for (const [key, value] of Object.entries(workflow.capturedEnvVars)) {
      console.log(`  ${key}: ${value}`);
    }

    // Get state snapshot to show redaction
    const logs = debugger_.getAllLogs();
    console.log(`\nLog entries: ${logs.length}`);

    console.log('\nTree:');
    console.log(debugger_.toTreeString());
  }

  console.log('\n=== Example 8 Complete ===');
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runSDKFeaturesExample().catch(console.error);
}

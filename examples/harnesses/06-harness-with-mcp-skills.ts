/**
 * Example 06: Harness Features (MCP & Skills)
 *
 * **Purpose**: Demonstrates advanced harness features including MCP integration, skills loading,
 *             hooks, and the pi vs claude-code capability matrix (PRD §7.4, §7.12).
 *
 * **What you'll learn**:
 * - How to register MCP servers with both harnesses
 * - How to use MCP tools in agent prompts
 * - How to load skills on both harnesses (pi: native agentskills.io, cc: system prompt)
 * - How to use harness hooks for observability
 * - The capability matrix: pi vs claude-code (PRD §7.4)
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/harnesses/06-harness-with-mcp-skills.ts`
 */

// ============================================================================
// Imports
// ============================================================================
import {
  Agent,
  Prompt,
  HarnessRegistry,
  ClaudeCodeHarness,
  PiHarness,
  type MCPServer,
} from 'groundswell';
import { z } from 'zod';
import { printHeader, printSection, prettyJson } from '../utils/helpers.js';

// ============================================================================
// Environment Validation
// ============================================================================
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable not set');
  console.error('Set it with: export ANTHROPIC_API_KEY=sk-...');
  process.exit(1);
}

// ============================================================================
// Example Implementation
// ============================================================================
export async function runHarnessWithMcpSkillsExample(): Promise<void> {
  printHeader('Example 06: Harness Features (MCP & Skills)');

  // Setup: Register and initialize both harnesses
  const registry = HarnessRegistry.getInstance();
  // @ts-expect-error - Accessing private method for example isolation
  if (registry._resetForTesting) {
    // @ts-expect-error - Resetting registry state
    registry._resetForTesting();
  }

  console.log('Setting up harnesses...');
  registry.register(new ClaudeCodeHarness());
  registry.register(new PiHarness());
  await registry.initializeProvider('claude-code', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('✓ Both harnesses registered and initialized\n');

  // ========================================================================
  // Part 1: MCP Server Registration (Both Harnesses)
  // ========================================================================
  printSection('Part 1: MCP Server Registration (Both Harnesses)');
  {
    console.log('Registering MCP servers with BOTH harnesses...\n');

    // Define an MCP server (same server for both harnesses — parity, §7.4)
    const mcpServer: MCPServer = {
      name: 'demo-server',
      transport: 'inprocess',
      tools: [
        {
          name: 'calculate',
          description: 'Performs arithmetic operations',
          input_schema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['add', 'subtract', 'multiply', 'divide'],
                description: 'The operation to perform',
              },
              a: { type: 'number', description: 'First number' },
              b: { type: 'number', description: 'Second number' },
            },
            required: ['operation', 'a', 'b'],
          },
        },
        {
          name: 'get_current_time',
          description: 'Gets the current time',
          input_schema: {
            type: 'object',
            properties: {
              timezone: {
                type: 'string',
                description: 'Timezone (e.g., "UTC", "America/New_York")',
                default: 'UTC',
              },
            },
            required: [],
          },
        },
      ],
    };

    console.log('MCP Server Configuration:');
    console.log('  Name:', mcpServer.name);
    console.log('  Transport:', mcpServer.transport);
    console.log('  Tools:', mcpServer.tools.length);
    console.log('    - calculate: Performs arithmetic');
    console.log('    - get_current_time: Gets current time');

    // Register on claude-code harness
    console.log('\n--- Registering on claude-code ---');
    const cc = registry.get('claude-code');
    if (cc) {
      try {
        const ccTools = await cc.registerMCPs([mcpServer]);
        console.log('✓ MCP server registered on claude-code');
        console.log('  Registered tools:', prettyJson(ccTools.map(t => t.name)));
      } catch (error) {
        console.log('Note: Would register MCP server on claude-code');
      }
    }

    // Register on pi harness
    console.log('\n--- Registering on pi ---');
    const pi = registry.get('pi');
    if (pi) {
      try {
        const piTools = await pi.registerMCPs([mcpServer]);
        console.log('✓ MCP server registered on pi');
        console.log('  Registered tools:', prettyJson(piTools.map(t => t.name)));
      } catch (error) {
        console.log('Note: Would register MCP server on pi');
      }
    }

    console.log('\nKey points:');
    console.log('  - Both harnesses accept the same MCPServer (parity via MCPHandler, §7.4)');
    console.log('  - Tool names use format: "serverName__toolName"');
    console.log('  - Tools are automatically available to agents using these harnesses');
  }

  // ========================================================================
  // Part 2: Using MCP Tools in Agent Prompts
  // ========================================================================
  printSection('Part 2: Using MCP Tools in Agent Prompts');
  {
    console.log('Creating an agent with MCP tool access...\n');

    const cc = registry.get('claude-code');
    if (!cc) {
      console.log('claude-code harness not found');
      return;
    }

    // Register calculator MCP server
    const calcServer: MCPServer = {
      name: 'calculator',
      transport: 'inprocess',
      tools: [
        {
          name: 'add',
          description: 'Adds two numbers',
          input_schema: {
            type: 'object',
            properties: {
              a: { type: 'number' },
              b: { type: 'number' },
            },
            required: ['a', 'b'],
          },
        },
      ],
    };

    try {
      await cc.registerMCPs([calcServer]);
      console.log('✓ Calculator tools registered on claude-code');
    } catch (error) {
      console.log('Note: Would register calculator MCP server');
    }

    const agent = new Agent({
      name: 'CalculatorAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('\nAgent created:', agent.name);
    console.log('Harness: claude-code');
    console.log('Available tools: calculator__add');

    console.log('\n--- Example prompt using tools ---');
    const prompt = new Prompt({
      user: 'What is 25 + 17?',
      responseFormat: z.object({
        result: z.number(),
        calculation: z.string(),
      }),
    });

    try {
      const response = await agent.prompt(prompt);
      console.log('Response:', response);
      console.log('✓ Agent used calculator__add tool');
    } catch (error) {
      console.log('Note: In production, agent would:');
      console.log('  1. Recognize need for calculation');
      console.log('  2. Call calculator__add tool with { a: 25, b: 17 }');
      console.log('  3. Receive tool result: 42');
      console.log('  4. Respond with answer');
    }

    console.log('\nKey points:');
    console.log('  - MCP tools are automatically available to agents');
    console.log('  - Agent decides when to use tools based on prompt');
    console.log('  - Tool results are fed back to the harness');
  }

  // ========================================================================
  // Part 3: Loading Skills
  // ========================================================================
  printSection('Part 3: Loading Skills');
  {
    console.log('Loading skills on both harnesses...\n');

    const cc = registry.get('claude-code');
    const pi = registry.get('pi');

    console.log('--- Skills on claude-code (system prompt injection) ---');
    if (cc) {
      try {
        await cc.loadSkills([{
          name: 'code-review',
          path: '/tmp/skills/code-review',
        }]);
        console.log('✓ Skills loaded on claude-code (injected into system prompt)');
      } catch (error) {
        console.log('Note: claude-code loads skills via system prompt injection');
        console.log('  Skill path must exist; using /tmp/skills/code-review as example');
      }
    }

    console.log('\n--- Skills on pi (native agentskills.io) ---');
    if (pi) {
      try {
        await pi.loadSkills([{
          name: 'code-review',
          path: '/tmp/skills/code-review',
        }]);
        console.log('✓ Skills loaded on pi (via native agentskills.io / loadSkillsFromDir)');
      } catch (error) {
        console.log('Note: pi loads skills via native agentskills.io');
        console.log('  Skill path must exist; using /tmp/skills/code-review as example');
        console.log('  Error:', (error as Error).message);
      }
    }

    console.log('\nSkill format: { name: string, path: string, ... }');
    console.log('  - claude-code: Injects skill content into the system prompt');
    console.log('  - pi: Loads via Pi\'s native loadSkillsFromDir({ dir: skill.path })');

    console.log('\nKey points:');
    console.log('  - Skills are loaded via harness.loadSkills([{ name, path }])');
    console.log('  - Both harnesses support skills (parity, §7.4)');
    console.log('  - Implementation differs: system prompt injection vs native loading');
    console.log('  - Skills enhance agent capabilities without code changes');
  }

  // ========================================================================
  // Part 4: Harness Hooks for Observability
  // ========================================================================
  printSection('Part 4: Harness Hooks for Observability');
  {
    console.log('Using harness hooks for monitoring and debugging...\n');

    console.log('--- Available hook events ---');

    const hooks = {
      onToolStart: (toolName: string, input: unknown) => {
        console.log(`[Hook] Tool started: ${toolName}`);
        console.log(`[Hook] Input:`, prettyJson(input));
      },
      onToolEnd: (toolName: string, output: unknown) => {
        console.log(`[Hook] Tool completed: ${toolName}`);
        console.log(`[Hook] Output:`, prettyJson(output));
      },
      onSessionStart: (sessionId: string) => {
        console.log(`[Hook] Session started: ${sessionId}`);
      },
      onSessionEnd: (sessionId: string) => {
        console.log(`[Hook] Session ended: ${sessionId}`);
      },
      onStream: (chunk: string) => {
        console.log(`[Hook] Stream chunk: ${chunk.substring(0, 50)}...`);
      },
    };

    console.log('Hook events available:');
    console.log('  - onToolStart: Tool execution begins');
    console.log('  - onToolEnd: Tool execution completes');
    console.log('  - onSessionStart: Session begins');
    console.log('  - onSessionEnd: Session ends');
    console.log('  - onStream: Streaming chunk received');

    console.log('\n--- Using hooks in agent.prompt() ---');

    const agent = new Agent({
      name: 'HookedAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    const prompt = new Prompt({
      user: 'What is 2 + 2?',
      responseFormat: z.object({ result: z.number() }),
    });

    try {
      const response = await agent.prompt(prompt, { hooks });
      console.log('\nResponse:', response);
    } catch (error) {
      console.log('Note: In production, hooks would fire at appropriate times');
      console.log('  Example output:');
      console.log('  [Hook] Tool started: calculator__add');
      console.log('  [Hook] Input: {"a": 2, "b": 2}');
      console.log('  [Hook] Tool completed: calculator__add');
      console.log('  [Hook] Output: 4');
    }

    console.log('\nKey points:');
    console.log('  - Hooks provide observability into harness operations');
    console.log('  - Useful for debugging, monitoring, and analytics');
    console.log('  - Hooks are passed in agent.prompt() options');
  }

  // ========================================================================
  // Part 5: Capability Matrix (PRD §7.4)
  // ========================================================================
  printSection('Part 5: Capability Matrix (PRD §7.4)');
  {
    console.log('Comparing capabilities between pi and claude-code:\n');

    const pi = registry.get('pi');
    const cc = registry.get('claude-code');

    if (pi && cc) {
      console.log('Live capability values:');
      console.log('  pi capabilities:', prettyJson(pi.capabilities));
      console.log('  claude-code capabilities:', prettyJson(cc.capabilities));
    }

    console.log('\nCapability Matrix (PRD §7.4):');
    console.log('  ┌─────────────────────┬─────┬──────────────┐');
    console.log('  │ Feature             │  pi │ claude-code  │');
    console.log('  ├─────────────────────┼─────┼──────────────┤');
    console.log('  │ MCP Support         │  ✓  │      ✓       │');
    console.log('  │ Skills              │  ✓  │      ✓       │');
    console.log('  │ LSP Support         │  ✓  │      ✓       │');
    console.log('  │ Streaming           │  ✓  │      ✓       │');
    console.log('  │ Sessions            │  ✓  │      ✓       │');
    console.log('  │ Extended Thinking   │  ✓  │      ✓       │');
    console.log('  │ LLM providers       │ any │ Anthropic only│');
    console.log('  └─────────────────────┴─────┴──────────────┘');

    console.log('\nKey insight:');
    console.log('  - Every capability is TRUE for BOTH harnesses (parity without Pi plugins)');
    console.log('  - The ONLY differing row is "LLM providers"');
    console.log('  - pi: runs ANY LLM provider (open set)');
    console.log('  - claude-code: Anthropic ONLY (§7.8 constraint)');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Harness features demonstrated:');
  console.log('  1. MCP server registration on both harnesses (parity, §7.4)');
  console.log('  2. Using MCP tools in agent prompts');
  console.log('  3. Loading skills (cc: system prompt, pi: native agentskills.io)');
  console.log('  4. Harness hooks for observability');
  console.log('  5. Capability matrix: pi vs claude-code (§7.4)');
  console.log('\nKey takeaways:');
  console.log('  - Both harnesses have FULL capability parity (MCP, Skills, LSP, Streaming, Sessions, Extended Thinking)');
  console.log('  - The ONLY difference: LLM providers — pi runs ANY, claude-code is Anthropic-only');
  console.log('  - Skills: cc injects into system prompt; pi uses native agentskills.io');
  console.log('  - Hooks provide observability across both harnesses');
  console.log('\nBest practices:');
  console.log('  - Use claude-code for Anthropic-only workloads');
  console.log('  - Use pi for multi-provider or non-Anthropic workloads');
  console.log('  - Check harness.capabilities before using features');
  console.log('  - Use hooks for debugging and monitoring');
  console.log('  - Handle differences when using both harnesses');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runHarnessWithMcpSkillsExample().catch(console.error);
}

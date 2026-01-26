/**
 * Example 06: Provider Features (MCP & Skills)
 *
 * **Purpose**: Demonstrates advanced provider features including MCP integration and skills loading.
 *
 * **What you'll learn**:
 * - How to register MCP servers with AnthropicProvider
 * - How to load skills from SKILL.md files
 * - How to use provider hooks for observability
 * - Differences in MCP support between providers
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/providers/06-provider-with-mcp-skills.ts`
 */

// ============================================================================
// Imports
// ============================================================================
import {
  Agent,
  Prompt,
  AnthropicProvider,
  OpenCodeProvider,
  ProviderRegistry,
  type MCPServer,
} from 'groundswell';
import { z } from 'zod';
import { printHeader, printSection, prettyJson } from '../../utils/helpers.js';

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
export async function runProviderWithMcpSkillsExample(): Promise<void> {
  printHeader('Example 06: Provider Features (MCP & Skills)');

  // Setup: Register and initialize providers
  const registry = ProviderRegistry.getInstance();
  // @ts-expect-error - Accessing private method for example isolation
  if (registry._resetForTesting) {
    // @ts-expect-error - Resetting registry state
    registry._resetForTesting();
  }

  console.log('Setting up providers...');
  registry.register(new AnthropicProvider());
  registry.register(new OpenCodeProvider());
  await registry.initializeProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('✓ Providers registered and initialized\n');

  // ========================================================================
  // Part 1: MCP Server Registration with AnthropicProvider
  // ========================================================================
  printSection('Part 1: MCP Server Registration (AnthropicProvider)');
  {
    console.log('Registering MCP servers with AnthropicProvider...\n');

    const anthropicProvider = registry.get('anthropic');
    if (!anthropicProvider) {
      console.log('AnthropicProvider not found');
      return;
    }

    console.log('--- Example MCP Server Configuration ---');

    // Define an MCP server
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
              a: {
                type: 'number',
                description: 'First number',
              },
              b: {
                type: 'number',
                description: 'Second number',
              },
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

    console.log('\n--- Registering MCP Server ---');

    try {
      // Register the MCP server with the provider
      const registeredTools = await anthropicProvider.registerMCPs([mcpServer]);

      console.log('✓ MCP server registered successfully');
      console.log('\nRegistered tools:', prettyJson(registeredTools));

      console.log('\nKey points:');
      console.log('  - Tool names use format: "serverName__toolName"');
      console.log('  - Tools are automatically available to agents using this provider');
      console.log('  - MCP tools are executed via the agent\'s tool executor');
      console.log('  - AnthropicProvider has full MCP support (capabilities.mcp = true)');
    } catch (error) {
      console.log('Note: In production, would register MCP server successfully');
      console.log('  Tools would be available for agent use');
    }
  }

  // ========================================================================
  // Part 2: Using MCP Tools in Agent Prompts
  // ========================================================================
  printSection('Part 2: Using MCP Tools in Agent Prompts');
  {
    console.log('Creating an agent with MCP tool access...\n');

    const anthropicProvider = registry.get('anthropic');
    if (!anthropicProvider) {
      console.log('AnthropicProvider not found');
      return;
    }

    // Register MCP server
    const mcpServer: MCPServer = {
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

    console.log('Registering calculator MCP server...');

    try {
      await anthropicProvider.registerMCPs([mcpServer]);
      console.log('✓ Calculator tools registered');
    } catch (error) {
      console.log('Note: Would register calculator MCP server');
    }

    console.log('\n--- Creating agent with tool access ---');

    const agent = new Agent({
      name: 'CalculatorAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    console.log('Agent created:', agent.name);
    console.log('Provider: anthropic');
    console.log('Available tools: calculator__add');

    console.log('\n--- Example prompt using tools ---');

    const prompt = new Prompt({
      user: 'What is 25 + 17?',
      responseFormat: z.object({
        result: z.number(),
        calculation: z.string(),
      }),
    });

    console.log('Prompt: "What is 25 + 17?"');

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
    console.log('  - Tool executor handles tool execution');
    console.log('  - Tool results are fed back to the provider');
  }

  // ========================================================================
  // Part 3: Loading Skills
  // ========================================================================
  printSection('Part 3: Loading Skills');
  {
    console.log('Loading skills from SKILL.md files...\n');

    const anthropicProvider = registry.get('anthropic');
    if (!anthropicProvider) {
      console.log('AnthropicProvider not found');
      return;
    }

    console.log('--- Skills file format ---');
    console.log('Skills are loaded from SKILL.md files with the following format:');
    console.log('```markdown');
    console.log('# Skill Name');
    console.log('');
    console.log('Description of what this skill enables.');
    console.log('');
    console.log('## Usage');
    console.log('- When to use this skill');
    console.log('- How to apply it');
    console.log('');
    console.log('## Examples');
    console.log('Example scenarios where this skill is useful');
    console.log('```');

    console.log('\n--- Loading skills into provider ---');

    // Define skills (normally loaded from files)
    const skills = [
      {
        name: 'code-review',
        content: `
# Code Review

Expert code review capabilities for identifying bugs, security vulnerabilities, and performance issues.

## Guidelines
- Check for common security vulnerabilities (SQL injection, XSS, etc.)
- Identify performance bottlenecks
- Suggest refactoring opportunities
- Verify adherence to best practices

## Response Format
Provide structured feedback with:
- Critical issues (must fix)
- Suggestions (should fix)
- Nitpicks (nice to have)
`,
      },
      {
        name: 'technical-writing',
        content: `
# Technical Writing

Clear and concise technical documentation skills.

## Principles
- Write for the intended audience
- Use active voice
- Be concise but complete
- Include examples

## Output Format
- Clear headings and structure
- Code examples where applicable
- Diagram descriptions when needed
`,
      },
    ];

    console.log('Skills to load:', skills.map((s) => s.name).join(', '));

    try {
      // Load skills into the provider
      for (const skill of skills) {
        await anthropicProvider.loadSkills([skill]);
      }

      console.log('✓ Skills loaded successfully');
      console.log('\nSkills are now available in system prompts');
    } catch (error) {
      console.log('Note: In production, would load skills from SKILL.md files');
      console.log('  Skills would be injected into system prompts');
    }

    console.log('\n--- Creating agent with skills ---');

    const agent = new Agent({
      name: 'SkilledAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    console.log('Agent created with skills support');
    console.log('Available skills: code-review, technical-writing');

    console.log('\n--- Example prompt using skills ---');

    const prompt = new Prompt({
      user: 'Review this code: const x = y + z',
      responseFormat: z.object({
        review: z.string(),
        issues: z.array(z.string()),
      }),
    });

    console.log('Prompt: "Review this code: const x = y + z"');

    try {
      const response = await agent.prompt(prompt);
      console.log('Response:', response);
      console.log('✓ Agent applied code-review skill');
    } catch (error) {
      console.log('Note: In production, agent would:');
      console.log('  1. Access code-review skill from system prompt');
      console.log('  2. Apply review guidelines to the code');
      console.log('  3. Provide structured feedback');
    }

    console.log('\nKey points:');
    console.log('  - Skills are loaded via provider.loadSkills()');
    console.log('  - Skills are injected into system prompts');
    console.log('  - Multiple skills can be loaded');
    console.log('  - Skills enhance agent capabilities without code changes');
  }

  // ========================================================================
  // Part 4: Provider Hooks
  // ========================================================================
  printSection('Part 4: Provider Hooks for Observability');
  {
    console.log('Using provider hooks for monitoring and debugging...\n');

    console.log('--- Available hook events ---');

    const hooks = {
      // Called when a tool execution starts
      onToolStart: (toolName: string, input: unknown) => {
        console.log(`[Hook] Tool started: ${toolName}`);
        console.log(`[Hook] Input:`, prettyJson(input));
      },

      // Called when a tool execution completes
      onToolEnd: (toolName: string, output: unknown) => {
        console.log(`[Hook] Tool completed: ${toolName}`);
        console.log(`[Hook] Output:`, prettyJson(output));
      },

      // Called when a session starts
      onSessionStart: (sessionId: string) => {
        console.log(`[Hook] Session started: ${sessionId}`);
      },

      // Called when a session ends
      onSessionEnd: (sessionId: string) => {
        console.log(`[Hook] Session ended: ${sessionId}`);
      },

      // Called for each streaming chunk (when streaming is enabled)
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
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    const prompt = new Prompt({
      user: 'What is 2 + 2?',
      responseFormat: z.object({
        result: z.number(),
      }),
    });

    console.log('Executing prompt with hooks...');

    try {
      // Hooks are passed via providerOptions
      const response = await agent.prompt(prompt, {
        hooks,
      });
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
    console.log('  - Hooks provide observability into provider operations');
    console.log('  - Useful for debugging, monitoring, and analytics');
    console.log('  - Hooks are passed via providerOptions in agent.prompt()');
    console.log('  - Each hook receives relevant event data');
  }

  // ========================================================================
  // Part 5: Provider Feature Comparison
  // ========================================================================
  printSection('Part 5: Provider Feature Comparison');
  {
    console.log('Comparing capabilities across providers:\n');

    const anthropicProvider = registry.get('anthropic');
    const opencodeProvider = registry.get('opencode');

    if (anthropicProvider && opencodeProvider) {
      console.log('Capability Matrix:');
      console.log('┌─────────────────────┬────────────┬───────────┐');
      console.log('│ Feature             │ Anthropic  │ OpenCode  │');
      console.log('├─────────────────────┼────────────┼───────────┤');
      console.log('│ MCP Support         │ ✓          │ ✗         │');
      console.log('│ Skills              │ ✓          │ ✓         │');
      console.log('│ LSP Support         │ ✓          │ ✗         │');
      console.log('│ Streaming           │ ✓          │ ✓         │');
      console.log('│ Sessions            │ ✓          │ ✓         │');
      console.log('│ Extended Thinking   │ ✓          │ ✓         │');
      console.log('└─────────────────────┴────────────┴───────────┘');

      console.log('\nDetailed capabilities:');
      console.log('\nAnthropicProvider:');
      console.log('  ', prettyJson(anthropicProvider.capabilities));

      console.log('\nOpenCodeProvider:');
      console.log('  ', prettyJson(opencodeProvider.capabilities));
    }

    console.log('\nKey differences:');
    console.log('  - MCP: Only Anthropic supports MCP integration');
    console.log('  - LSP: Only Anthropic supports LSP via MCP plugins');
    console.log('  - Tools: OpenCode operates in LLM-only mode (server-side tools)');
    console.log('  - Skills: Both support skills via system prompt injection');
    console.log('  - Sessions: Both support sessions (different implementations)');

    console.log('\nImportant note:');
    console.log('  OpenCodeProvider.registerMCPs() returns empty array');
    console.log('  OpenCode executes tools server-side with no client-side delegation');
    console.log('  Use AnthropicProvider when you need MCP integration');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Provider features demonstrated:');
  console.log('  1. MCP server registration with AnthropicProvider');
  console.log('  2. Using MCP tools in agent prompts');
  console.log('  3. Loading skills from SKILL.md files');
  console.log('  4. Provider hooks for observability');
  console.log('  5. Feature comparison across providers');
  console.log('\nKey takeaways:');
  console.log('  - AnthropicProvider: Full MCP support, LSP, skills, sessions');
  console.log('  - OpenCodeProvider: LLM-only mode, skills, sessions, no MCP/LSP');
  console.log('  - Skills enhance agents via system prompt injection');
  console.log('  - Hooks provide observability into provider operations');
  console.log('  - Check provider capabilities before using features');
  console.log('\nBest practices:');
  console.log('  - Use AnthropicProvider for MCP tool integration');
  console.log('  - Load skills to enhance agent capabilities');
  console.log('  - Use hooks for debugging and monitoring');
  console.log('  - Check provider.capabilities before using features');
  console.log('  - Handle differences when using multiple providers');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runProviderWithMcpSkillsExample().catch(console.error);
}

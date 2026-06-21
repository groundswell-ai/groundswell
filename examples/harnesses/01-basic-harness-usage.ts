/**
 * Example 01: Basic Harness Usage
 *
 * **Purpose**: Demonstrates the minimal setup required to use Groundswell's harness system.
 *
 * **What you'll learn**:
 * - How to register harnesses (PiHarness and ClaudeCodeHarness) with the HarnessRegistry
 * - How to initialize harnesses before use
 * - How to create an Agent with a configured harness
 * - How to execute prompts using Agent.prompt()
 * - The Harness ⊥ ModelProvider split (PRD §7.1)
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/harnesses/01-basic-harness-usage.ts`
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
} from 'groundswell';
import { z } from 'zod';
import { printHeader, printSection } from '../utils/helpers.js';

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
export async function runBasicHarnessUsageExample(): Promise<void> {
  printHeader('Example 01: Basic Harness Usage');

  // ========================================================================
  // Part 1: Harness Registration
  // ========================================================================
  printSection('Part 1: Harness Registration');
  {
    console.log('Getting the HarnessRegistry singleton instance...');
    // The HarnessRegistry is a singleton that manages all harness instances
    const registry: HarnessRegistry = HarnessRegistry.getInstance();

    console.log('\nCreating and registering both harnesses...');
    // Register ClaudeCodeHarness — id 'claude-code', Anthropic-only (§7.8)
    const claudeCodeHarness = new ClaudeCodeHarness();
    registry.register(claudeCodeHarness);

    // Register PiHarness — id 'pi', runs ANY provider (§7.4)
    const piHarness = new PiHarness();
    registry.register(piHarness);

    console.log('✓ Both harnesses registered successfully');
    console.log('  ClaudeCodeHarness ID:', claudeCodeHarness.id, '— Anthropic-only');
    console.log('  PiHarness ID:', piHarness.id, '— any provider (the default)');
    console.log('\nClaudeCodeHarness capabilities:', claudeCodeHarness.capabilities);
    console.log('PiHarness capabilities:', piHarness.capabilities);
  }

  // ========================================================================
  // Part 2: Harness Initialization
  // ========================================================================
  printSection('Part 2: Harness Initialization');
  {
    console.log('Initializing ClaudeCodeHarness...');
    const registry = HarnessRegistry.getInstance();

    // Initialize the harness with API key from environment
    // This loads the Anthropic SDK and prepares the harness for use
    await registry.initializeProvider('claude-code', {
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('✓ ClaudeCodeHarness initialized successfully');
    console.log('  The harness is now ready to execute prompts');
    console.log('\nNote: PiHarness is the default harness (id "pi").');
    console.log('  It does not require explicit initialization for basic usage.');
  }

  // ========================================================================
  // Part 3: Creating an Agent with a Harness
  // ========================================================================
  printSection('Part 3: Creating an Agent with a Harness');
  {
    console.log('Creating an Agent configured for Claude Code...');
    // Create an Agent with the Claude Code harness
    // The harness option specifies which harness to use
    const agent = new Agent({
      name: 'BasicAgent',
      harness: 'claude-code',
      // Model string is provider/model — NEVER harness-qualified (§7.8)
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('✓ Agent created successfully');
    console.log('  Agent ID:', agent.id);
    console.log('  Harness:', agent.config.harness);
    console.log('  Model: anthropic/claude-sonnet-4-20250514');
  }

  // ========================================================================
  // Part 4: Executing a Prompt
  // ========================================================================
  printSection('Part 4: Executing a Prompt');
  {
    console.log('Creating a prompt and executing it...');
    const agent = new Agent({
      name: 'BasicAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    // Create a prompt with structured output
    const prompt = new Prompt({
      user: 'What is 2 + 2? Respond with just the number.',
      responseFormat: z.object({
        result: z.number(),
      }),
    });

    console.log('\nPrompt: "What is 2 + 2? Respond with just the number."');

    // Execute the prompt through the agent
    // The agent delegates to the ClaudeCodeHarness
    try {
      const response = await agent.prompt(prompt);
      console.log('\n✓ Prompt executed successfully');
      console.log('  Response:', response);
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
      console.log('  Error:', (error as Error).message);
    }
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. HarnessRegistry.getInstance() - Get singleton registry');
  console.log('  2. registry.register(new ClaudeCodeHarness()) - Register ClaudeCodeHarness (Anthropic-only)');
  console.log('  3. registry.register(new PiHarness()) - Register PiHarness (any provider, the default)');
  console.log('  4. registry.initializeProvider() - Initialize harnesses before use');
  console.log('  5. new Agent({ harness }) - Create agent with harness config');
  console.log('  6. agent.prompt() - Execute prompts via configured harness');
  console.log('\nKey points:');
  console.log('  - The model string is NEVER harness-qualified (§7.8).');
  console.log('    Valid: "anthropic/claude-sonnet-4-20250514" or "claude-sonnet-4-20250514".');
  console.log('    Invalid: "pi/anthropic/x" or "cc/anthropic/x".');
  console.log('  - ClaudeCodeHarness (id "claude-code") is Anthropic-only.');
  console.log('  - PiHarness (id "pi") can run ANY provider.');
  console.log('  - Harnesses must be registered BEFORE creating Agents.');
  console.log('  - Harnesses must be initialized BEFORE executing prompts.');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicHarnessUsageExample().catch(console.error);
}

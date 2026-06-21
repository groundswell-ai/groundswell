/**
 * Example 03: Harness Switching
 *
 * **Purpose**: Demonstrates how to switch between harnesses and models at different levels.
 *
 * **What you'll learn**:
 * - How to switch harnesses at the Agent level
 * - How to switch harnesses at the Prompt level (§7.13)
 * - How to override the model only, leaving the harness unchanged (§7.13)
 * - How to verify which harness is being used
 * - When to use each switching pattern
 * - The critical rule: model strings are NEVER harness-qualified (§7.8)
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/harnesses/03-harness-switching.ts`
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
export async function runHarnessSwitchingExample(): Promise<void> {
  printHeader('Example 03: Harness Switching');

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
  // Part 1: Agent-Level Harness Switching
  // ========================================================================
  printSection('Part 1: Agent-Level Harness Switching');
  {
    console.log('Creating multiple agents with different harnesses...\n');

    // Agent 1: Pi harness
    const piAgent = new Agent({
      name: 'PiAgent',
      harness: 'pi',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('Agent 1 created:');
    console.log('  Name: PiAgent');
    console.log('  Harness:', piAgent.config.harness);
    console.log('  Model: anthropic/claude-sonnet-4-20250514');

    // Agent 2: Claude Code harness
    const ccAgent = new Agent({
      name: 'ClaudeCodeAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('\nAgent 2 created:');
    console.log('  Name: ClaudeCodeAgent');
    console.log('  Harness:', ccAgent.config.harness);
    console.log('  Model: anthropic/claude-sonnet-4-20250514');

    console.log('\n--- Testing PiAgent ---');
    const prompt1 = new Prompt({
      user: 'Say "Hello from Pi harness" in exactly those words.',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      const response1 = await piAgent.prompt(prompt1);
      console.log('Response:', response1);
      console.log('✓ PiAgent used the pi harness');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\nKey points:');
    console.log('  - Each agent can use a different harness');
    console.log('  - Agent-level switching is good for:');
    console.log('    • Different agents for different purposes');
    console.log('    • Isolating workloads by harness');
    console.log('    • Harness-specific configurations');
  }

  // ========================================================================
  // Part 2: Prompt-Level Harness Switching (§7.13)
  // ========================================================================
  printSection('Part 2: Prompt-Level Harness Switching (§7.13)');
  {
    console.log('Creating a single agent and switching harnesses per prompt...\n');

    // Create agent with pi harness as default
    const agent = new Agent({
      name: 'FlexibleAgent',
      harness: 'pi',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('Agent created:');
    console.log('  Name: FlexibleAgent');
    console.log('  Default Harness: pi');

    console.log('\n--- Prompt 1: Using default harness (pi) ---');
    const prompt1 = new Prompt({
      user: 'Say "Using Pi" in exactly those words.',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      const response1 = await agent.prompt(prompt1);
      console.log('Response:', response1);
      console.log('Harness used: pi (agent default)');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\n--- Prompt 2: Switch to claude-code for one call ---');
    const prompt2 = new Prompt({
      user: 'Say "Using Claude Code" in exactly those words.',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      // Switch harness for this one call (§7.13 — harness axis override)
      const response2 = await agent.prompt(prompt2, {
        harness: 'claude-code',
      });
      console.log('Response:', response2);
      console.log('Harness used: claude-code (prompt-level override)');
    } catch (error) {
      console.log('Note: Would execute with prompt-level harness switch to claude-code');
    }

    console.log('\n--- Prompt 3: Back to default harness ---');
    const prompt3 = new Prompt({
      user: 'Say "Back to Pi" in exactly those words.',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      // Back to default harness (no override)
      const response3 = await agent.prompt(prompt3);
      console.log('Response:', response3);
      console.log('Harness used: pi (default restored)');
    } catch (error) {
      console.log('Note: Agent default harness restored');
    }

    console.log('\nKey points:');
    console.log('  - Prompt-level harness switching is temporary (one call only)');
    console.log('  - Agent default harness is restored after override');
    console.log('  - Prompt-level switching is good for:');
    console.log('    • A/B testing different harnesses');
    console.log('    • One-off harness switches for specific tasks');
  }

  // ========================================================================
  // Part 3: Model-Only Override (§7.13)
  // ========================================================================
  printSection('Part 3: Model-Only Override (§7.13)');
  {
    console.log('Overriding the MODEL only — harness unchanged (model axis)...\n');

    // Create agent with pi harness
    const piAgent = new Agent({
      name: 'ModelOverrideAgent',
      harness: 'pi',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('Agent created:');
    console.log('  Harness:', piAgent.config.harness, '(pi — unchanged)');
    console.log('  Default model: anthropic/claude-sonnet-4-20250514');

    console.log('\n--- Override to OpenAI model on pi harness ---');
    const prompt = new Prompt({
      user: 'Say "OpenAI model on Pi harness" in exactly those words.',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      // Override MODEL only — harness stays 'pi' (§7.13, model axis)
      // Pi harness can run ANY provider — this is valid.
      const response = await piAgent.prompt(prompt, {
        model: 'openai/gpt-4o',
      });
      console.log('Response:', response);
      console.log('Model: openai/gpt-4o (overridden)');
      console.log('Harness: pi (unchanged — model axis is independent)');
    } catch (error) {
      console.log('Note: Would execute on pi harness with openai/gpt-4o model');
      console.log('  (Requires OPENAI_API_KEY + configured pi provider for openai)');
    }

    console.log('\n⚠️  Critical rule (§7.8):');
    console.log('  The same model-only override (openai/gpt-4o) on a claude-code agent');
    console.log('  would be a CONFIG ERROR — claude-code is Anthropic-only.');
    console.log('  Non-Anthropic models require the pi harness.');
    console.log('');
    console.log('  Also: model strings are NEVER harness-qualified.');
    console.log('  Valid: "anthropic/claude-sonnet-4-20250514" or "claude-sonnet-4-20250514".');
    console.log('  Invalid: "pi/anthropic/x" or "cc/anthropic/x" (parseModelSpec throws).');
  }

  // ========================================================================
  // Part 4: Verifying Harness Usage
  // ========================================================================
  printSection('Part 4: Verifying Harness Usage');
  {
    console.log('How to verify which harness is being used...\n');

    const agent = new Agent({
      name: 'TestAgent',
      harness: 'claude-code',
    });

    console.log('Method 1: Check agent configuration');
    console.log('  agent.config.harness:', agent.config.harness);

    console.log('\nMethod 2: Use prompt-level overrides explicitly');
    console.log('  ```typescript');
    console.log('  await agent.prompt(prompt, { harness: "claude-code" })');
    console.log('  ```');

    console.log('\nMethod 3: Check harness capabilities');
    const pi = registry.get('pi');
    const cc = registry.get('claude-code');
    if (pi && cc) {
      console.log('  Pi capabilities:', prettyJson(pi.capabilities));
      console.log('  ClaudeCode capabilities:', prettyJson(cc.capabilities));
    }

    console.log('\nCapability Matrix (PRD §7.4):');
    console.log('  ┌───────────────────┬─────┬──────────────┐');
    console.log('  │ Feature           │  pi │ claude-code  │');
    console.log('  ├───────────────────┼─────┼──────────────┤');
    console.log('  │ MCP Support       │  ✓  │      ✓       │');
    console.log('  │ Skills            │  ✓  │      ✓       │');
    console.log('  │ LSP Support       │  ✓  │      ✓       │');
    console.log('  │ Streaming         │  ✓  │      ✓       │');
    console.log('  │ Sessions          │  ✓  │      ✓       │');
    console.log('  │ Extended Thinking │  ✓  │      ✓       │');
    console.log('  │ LLM providers     │ any │ Anthropic only│');
    console.log('  └───────────────────┴─────┴──────────────┘');
  }

  // ========================================================================
  // Part 5: When to Use Each Pattern
  // ========================================================================
  printSection('Part 5: When to Use Each Pattern');
  {
    console.log('Choosing the right switching strategy:\n');

    console.log('Agent-Level Switching (new Agent({ harness }))');
    console.log('  Use when:');
    console.log('    • Different agents serve different purposes');
    console.log('    • You need persistent harness-specific configuration');
    console.log('    • You want to isolate workloads by harness');
    console.log('  Example:');
    console.log('    const piAgent = new Agent({ harness: "pi" })');
    console.log('    const ccAgent = new Agent({ harness: "claude-code" })');

    console.log('\nPrompt-Level Harness Switching (agent.prompt(prompt, { harness }))');
    console.log('  Use when:');
    console.log('    • You need temporary harness changes');
    console.log('    • A/B testing different harnesses');
    console.log('    • One-off harness switches for specific tasks');
    console.log('  Example:');
    console.log('    await agent.prompt(prompt, { harness: "claude-code" })');

    console.log('\nModel-Only Override (agent.prompt(prompt, { model }))');
    console.log('  Use when:');
    console.log('    • You want to change the LLM model but keep the same harness');
    console.log('    • Switching between Anthropic and OpenAI models on pi');
    console.log('    • Cost optimization via model selection');
    console.log('  Example:');
    console.log('    await piAgent.prompt(prompt, { model: "openai/gpt-4o" })');
    console.log('    // ⚠️ Do NOT attempt openai/* on claude-code (Anthropic-only)');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. Agent-level switching: new Agent({ harness })');
  console.log('  2. Prompt-level harness switch: agent.prompt(prompt, { harness })');
  console.log('  3. Model-only override: agent.prompt(prompt, { model }) — harness unchanged');
  console.log('  4. Verifying harness usage via config and capabilities');
  console.log('  5. claude-code is Anthropic-only — non-Anthropic requires pi (§7.8)');
  console.log('\nHarness switching patterns:');
  console.log('  - Agent-level: Permanent for that agent instance');
  console.log('  - Prompt-level: Temporary for one prompt() call');
  console.log('  - Model-only: Changes LLM model, harness stays the same');
  console.log('\nBest practices:');
  console.log('  - Use agent-level switching for different agent purposes');
  console.log('  - Use prompt-level switching for A/B testing and one-offs');
  console.log('  - Use model-only override to change LLM without changing harness');
  console.log('  - Model strings are NEVER harness-qualified (§7.8)');
  console.log('  - Always check harness capabilities before switching');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runHarnessSwitchingExample().catch(console.error);
}

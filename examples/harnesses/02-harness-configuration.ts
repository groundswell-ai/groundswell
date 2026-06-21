/**
 * Example 02: Harness Configuration
 *
 * **Purpose**: Demonstrates the dual configuration cascade for harnesses and models.
 *
 * **What you'll learn**:
 * - How to set global harness defaults with configureHarnesses()
 * - How to configure harnesses at the Agent level
 * - How to override harness configuration at the Prompt level
 * - How the DUAL cascade works (harness axis + model axis, PRD §7.7)
 * - The two independent axes: harness and model/provider
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/harnesses/02-harness-configuration.ts`
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
  configureHarnesses,
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
export async function runHarnessConfigurationExample(): Promise<void> {
  printHeader('Example 02: Harness Configuration');

  // Reset registry for clean example
  const registry = HarnessRegistry.getInstance();
  // @ts-expect-error - Accessing private method for example isolation
  if (registry._resetForTesting) {
    // @ts-expect-error - Resetting registry state
    registry._resetForTesting();
  }

  // ========================================================================
  // Part 1: Global Harness Configuration
  // ========================================================================
  printSection('Part 1: Global Harness Configuration');
  {
    console.log('Configuring global harness defaults...');

    // configureHarnesses() sets application-wide defaults.
    // The harness axis and model axis are INDEPENDENT (§7.7).
    //
    // - defaultHarness: the harness used when no harness is specified ('pi' or 'claude-code')
    // - defaultModelProvider: the LLM host — INDEPENDENT axis ('anthropic', 'openai', etc.)
    // - harnessDefaults: per-harness default options (e.g., API keys, timeouts)
    configureHarnesses({
      defaultHarness: 'pi',
      defaultModelProvider: 'anthropic',
      harnessDefaults: {
        'claude-code': {
          apiKey: process.env.ANTHROPIC_API_KEY,
          timeout: 30000,
        },
      },
    });

    console.log('✓ Global configuration set');
    console.log('\nConfiguration values:');
    console.log('  defaultHarness: pi');
    console.log('  defaultModelProvider: anthropic');
    console.log('  harnessDefaults["claude-code"]:', prettyJson({
      apiKey: '***',
      timeout: 30000,
    }));

    console.log('\nKey points:');
    console.log('  - defaultHarness: Used when no harness is specified (\'pi\' or \'claude-code\')');
    console.log('  - defaultModelProvider: INDEPENDENT axis — the LLM host');
    console.log('  - harnessDefaults: Default options per harness (apiKey, timeout, etc.)');
    console.log('  - Global config has LOWEST priority (can be overridden at agent/prompt level)');
  }

  // Register and initialize both harnesses
  registry.register(new ClaudeCodeHarness());
  registry.register(new PiHarness());
  await registry.initializeProvider('claude-code', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // ========================================================================
  // Part 2: Agent-Level Configuration
  // ========================================================================
  printSection('Part 2: Agent-Level Configuration');
  {
    console.log('Creating agents with different harness configurations...');

    // Agent 1: Explicit Claude Code harness with custom options
    const agent1 = new Agent({
      name: 'ExplicitCcAgent',
      harness: 'claude-code',
      harnessOptions: {
        timeout: 15000,
      },
    });

    // Agent 2: Uses global default harness ('pi')
    const agent2 = new Agent({
      name: 'DefaultAgent',
      // No harness specified — inherits global defaultHarness 'pi'
    });

    // Agent 3: Claude Code with custom timeout overriding global
    const agent3 = new Agent({
      name: 'CustomCcAgent',
      harness: 'claude-code',
      harnessOptions: {
        timeout: 10000, // Override global default of 30000
      },
    });

    console.log('✓ Agents created with different configurations');
    console.log('\nAgent 1 (ExplicitCcAgent):');
    console.log('  - Harness:', agent1.config.harness, '(explicitly set)');
    console.log('\nAgent 2 (DefaultAgent):');
    console.log('  - Harness:', agent2.config.harness, '(from global default \'pi\')');
    console.log('\nAgent 3 (CustomCcAgent):');
    console.log('  - Harness:', agent3.config.harness, '(explicitly set)');
    console.log('  - Timeout: 10000ms (overrides global 30000ms)');

    console.log('\nKey points:');
    console.log('  - Agent-level config overrides global defaults');
    console.log('  - harnessOptions are merged with global harnessDefaults');
    console.log('  - Agent config has MEDIUM priority');
  }

  // ========================================================================
  // Part 3: Prompt-Level Configuration
  // ========================================================================
  printSection('Part 3: Prompt-Level Configuration');
  {
    console.log('Demonstrating prompt-level harness overrides...');

    const agent = new Agent({
      name: 'SwitchableAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    console.log('Agent configured with harness:', agent.config.harness);

    console.log('\n--- Prompt 1: Using Agent default (claude-code) ---');
    const prompt1 = new Prompt({
      user: 'Say "Hello from Claude Code"',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      const response1 = await agent.prompt(prompt1);
      console.log('Response:', response1);
      console.log('Harness used: claude-code (agent default)');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\n--- Prompt 2: Prompt-level options override ---');
    const prompt2 = new Prompt({
      user: 'Say "Hello with short timeout"',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      // Override harness options at prompt level
      const response2 = await agent.prompt(prompt2, {
        harnessOptions: {
          timeout: 5000,
        },
      });
      console.log('Response:', response2);
      console.log('Harness used: claude-code (prompt-level options override)');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\n--- Prompt 3: Prompt-level harness SWITCH ---');
    const prompt3 = new Prompt({
      user: 'Say "Hello from Pi harness"',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      // Switch harness for this one call only (§7.13)
      const response3 = await agent.prompt(prompt3, {
        harness: 'pi',
      });
      console.log('Response:', response3);
      console.log('Harness used: pi (prompt-level harness override)');
    } catch (error) {
      console.log('Note: Would execute with prompt-level harness switch to pi');
    }

    console.log('\n--- Prompt 4: Back to agent default ---');
    const prompt4 = new Prompt({
      user: 'Say "Back to Claude Code"',
      responseFormat: z.object({ message: z.string() }),
    });

    try {
      const response4 = await agent.prompt(prompt4);
      console.log('Response:', response4);
      console.log('Harness used: claude-code (agent default restored)');
    } catch (error) {
      console.log('Note: Agent default harness restored');
    }

    console.log('\nKey points:');
    console.log('  - Prompt-level overrides have HIGHEST priority');
    console.log('  - A harness SWITCH at prompt level only affects that call');
    console.log('  - Agent default is restored after the override');
  }

  // ========================================================================
  // Part 4: Dual Cascade Explainer
  // ========================================================================
  printSection('Part 4: Dual Configuration Cascade (PRD §7.7)');
  {
    console.log('The DUAL configuration cascade:');
    console.log('');
    console.log('  HARNESS AXIS (which adapter runs the prompt):');
    console.log('    harness = promptHarness ?? agentHarness ?? global.defaultHarness');
    console.log('    (first-defined wins — omitted = fall through to next level)');
    console.log('');
    console.log('  OPTIONS AXIS (merged config per harness):');
    console.log('    options = { ...globalDefaults[harness], ...agentOpts, ...promptOpts }');
    console.log('    (last-write wins — prompt options override agent options)');
    console.log('');
    console.log('  MODEL AXIS — SEPARATE from harness (§7.8):');
    console.log('    Overriding `model` never changes the harness.');
    console.log('    Model string format: "provider/model" or plain — NEVER harness-qualified.');
    console.log('');
    console.log('Worked example:');
    console.log('  configureHarnesses({ defaultHarness: "pi" })');
    console.log('  const agent = new Agent({ harness: "claude-code" })');
    console.log('  await agent.prompt(prompt)  // no prompt-level harness');
    console.log(' ');
    console.log('  → Resolved harness: "claude-code" (agent level wins over global "pi")');
    console.log('');
    console.log('  Another example:');
    console.log('  configureHarnesses({ defaultHarness: "pi" })');
    console.log('  const agent = new Agent({ /* no harness */ })');
    console.log('  await agent.prompt(prompt, { harness: "claude-code" })');
    console.log(' ');
    console.log('  → Resolved harness: "claude-code" (prompt level wins over global "pi")');
    console.log('');
    console.log('This design allows:');
    console.log('  - Global defaults for convenience (vendor-neutral "pi")');
    console.log('  - Agent-level customization per agent');
    console.log('  - Prompt-level flexibility for specific calls');
    console.log('  - Independent model/provider selection (model axis)');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. configureHarnesses() - Set global defaults (harness + model axes)');
  console.log('  2. Agent({ harness, harnessOptions }) - Agent-level configuration');
  console.log('  3. agent.prompt(prompt, { harness, harnessOptions }) - Prompt-level override');
  console.log('  4. Dual cascade: harness = prompt ?? agent ?? global (first-defined wins)');
  console.log('  5. Options merge: { ...global, ...agent, ...prompt } (last-write wins)');
  console.log('  6. Model axis is SEPARATE — overriding model never changes the harness');
  console.log('\nBest practices:');
  console.log('  - Use configureHarnesses() for application-wide defaults');
  console.log('  - Use agent-level config for agent-specific harnesses');
  console.log('  - Use prompt-level overrides for one-off harness switches');
  console.log('  - Read the resolved harness back via agent.config.harness');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runHarnessConfigurationExample().catch(console.error);
}

/**
 * Example 03: Provider Switching
 *
 * **Purpose**: Demonstrates how to switch between providers at different levels.
 *
 * **What you'll learn**:
 * - How to switch providers at the Agent level
 * - How to switch providers at the Prompt level
 * - How to verify which provider is being used
 * - When to use each switching pattern
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/providers/03-provider-switching.ts`
 */

// ============================================================================
// Imports
// ============================================================================
import {
  Agent,
  Prompt,
  AnthropicProvider,
  ProviderRegistry,
} from 'groundswell';
import { z } from 'zod';
import { printHeader, printSection } from '../../utils/helpers.js';

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
export async function runProviderSwitchingExample(): Promise<void> {
  printHeader('Example 03: Provider Switching');

  // Setup: Register and initialize providers
  const registry = ProviderRegistry.getInstance();
  // @ts-expect-error - Accessing private method for example isolation
  if (registry._resetForTesting) {
    // @ts-expect-error - Resetting registry state
    registry._resetForTesting();
  }

  console.log('Setting up providers...');
  registry.register(new AnthropicProvider());
  await registry.initializeProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('✓ Providers registered and initialized\n');

  // ========================================================================
  // Part 1: Agent-Level Provider Switching
  // ========================================================================
  printSection('Part 1: Agent-Level Provider Switching');
  {
    console.log('Creating multiple agents with different providers...\n');

    // Agent 1: Anthropic provider
    const anthropicAgent = new Agent({
      name: 'AnthropicAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    console.log('Agent 1 created:');
    console.log('  Name: AnthropicAgent');
    console.log('  Provider: anthropic');
    console.log('  Model: claude-sonnet-4-20250514');

    // Agent 2: Second Anthropic agent with different model
    // TODO(P4.M3.T2): rewrite as pi vs claude-code harness switching.
    //   The legacy provider vocabulary has no second valid provider after removal.
    const secondAgent = new Agent({
      name: 'SecondaryAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    console.log('\nAgent 2 created:');
    console.log('  Name: SecondaryAgent');
    console.log('  Provider: anthropic');
    console.log('  Model: claude-sonnet-4-20250514');

    console.log('\n--- Testing AnthropicAgent ---');

    // Test Anthropic agent
    const prompt1 = new Prompt({
      user: 'Say "Hello from Anthropic" in exactly those words.',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    try {
      const response1 = await anthropicAgent.prompt(prompt1);
      console.log('Response:', response1);
      console.log('✓ AnthropicAgent used Anthropic provider');
    } catch (error) {
      console.log('Note: Anthropic call would execute with ANTHROPIC_API_KEY');
      console.log('  Error:', (error as Error).message);
    }

    console.log('\n--- Testing SecondaryAgent ---');
    console.log('Note: Both agents use the Anthropic provider in this example');

    console.log('\nKey points:');
    console.log('  - Each agent can have a different provider');
    console.log('  - Agent-level switching is good for:');
    console.log('    • Different agents for different purposes');
    console.log('    • Isolating workloads by provider');
    console.log('    • Provider-specific configurations');
  }

  // ========================================================================
  // Part 2: Prompt-Level Provider Switching
  // ========================================================================
  printSection('Part 2: Prompt-Level Provider Switching');
  {
    console.log('Creating a single agent and switching providers per prompt...\n');

    // Create agent with default provider
    const agent = new Agent({
      name: 'FlexibleAgent',
      provider: 'anthropic', // Default to Anthropic
      model: 'claude-sonnet-4-20250514',
    });

    console.log('Agent created:');
    console.log('  Name: FlexibleAgent');
    console.log('  Default Provider: anthropic');

    console.log('\n--- Prompt 1: Using default provider (anthropic) ---');

    const prompt1 = new Prompt({
      user: 'Say "Using Anthropic" in exactly those words.',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    try {
      // Use agent's default provider
      const response1 = await agent.prompt(prompt1);
      console.log('Response:', response1);
      console.log('Provider used: anthropic (agent default)');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\n--- Prompt 2: Prompt-level provider options override ---');

    const prompt2 = new Prompt({
      user: 'Say "Using Anthropic with override" in exactly those words.',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    try {
      // Override provider options for this prompt only
      const response2 = await agent.prompt(prompt2, {
        providerOptions: {
          timeout: 5000,
        },
      });
      console.log('Response:', response2);
      console.log('Provider used: anthropic (with prompt-level options override)');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\n--- Prompt 3: Back to default provider ---');

    const prompt3 = new Prompt({
      user: 'Say "Back to Anthropic" in exactly those words.',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    try {
      // Back to default provider (no override)
      const response3 = await agent.prompt(prompt3);
      console.log('Response:', response3);
      console.log('Provider used: anthropic (default restored)');
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
    }

    console.log('\nKey points:');
    console.log('  - Prompt-level switching is temporary (one call only)');
    console.log('  - Agent default provider is restored after override');
    console.log('  - Prompt-level switching is good for:');
    console.log('    • A/B testing different providers');
    console.log('    • Fallback to alternative provider');
    console.log('    • Cost optimization (switch for specific tasks)');
  }

  // ========================================================================
  // Part 3: Verifying Provider Usage
  // ========================================================================
  printSection('Part 3: Verifying Provider Usage');
  {
    console.log('How to verify which provider is being used...\n');

    const agent = new Agent({
      name: 'TestAgent',
      provider: 'anthropic',
    });

    console.log('Method 1: Check agent configuration');
    console.log('  agent.config.provider:', agent.config.provider);

    console.log('\nMethod 2: Use prompt-level overrides explicitly');
    console.log('  Always specify provider in agent.prompt() call:');
    console.log('  ```typescript');
    console.log('  await agent.prompt(prompt, { provider: "anthropic" })');
    console.log('  ```');

    console.log('\nMethod 3: Check provider capabilities');
    const anthropicProvider = registry.get('anthropic');
    if (anthropicProvider) {
      console.log('  Anthropic capabilities:', anthropicProvider.capabilities);
    }

    console.log('\nAnthropic capabilities:');
    // TODO(P4.M3.T2): rewrite as pi vs claude-code capability comparison.
    console.log('  Feature           | Anthropic');
    console.log('  ------------------|-----------');
    console.log('  MCP support       | ✓');
    console.log('  Skills            | ✓');
    console.log('  LSP               | ✓');
    console.log('  Streaming         | ✓');
    console.log('  Sessions          | ✓');
    console.log('  Extended Thinking | ✓');
  }

  // ========================================================================
  // Part 4: When to Use Each Pattern
  // ========================================================================
  printSection('Part 4: When to Use Each Pattern');
  {
    console.log('Choosing the right switching strategy:\n');

    console.log('Agent-Level Switching (new Agent({ provider }))');
    console.log('  Use when:');
    console.log('    • Different agents serve different purposes');
    console.log('    • You need persistent provider-specific configuration');
    console.log('    • You want to isolate workloads by provider');
    console.log('  Example:');
    console.log('    const researchAgent = new Agent({ provider: "anthropic" })');
    console.log('    const codeAgent = new Agent({ provider: "anthropic" })');

    console.log('\nPrompt-Level Switching (agent.prompt(prompt, { provider }))');
    console.log('  Use when:');
    console.log('    • You need temporary provider changes');
    console.log('    • You\'re implementing fallback logic');
    console.log('    • You\'re A/B testing providers');
    console.log('    • You want cost optimization for specific tasks');
    console.log('  Example:');
    console.log('    // Try primary provider, fallback to secondary');
    console.log('    try {');
    console.log('      return await agent.prompt(prompt, { provider: "anthropic" })');
    console.log('    } catch {');
    console.log('      return await agent.prompt(prompt, { providerOptions: { timeout: 5000 } })');
    console.log('    }');

    console.log('\nGlobal Configuration (configureProviders())');
    console.log('  Use when:');
    console.log('    • Setting application-wide defaults');
    console.log('    • You want a fallback for unspecified providers');
    console.log('  Example:');
    console.log('    configureProviders({');
    console.log('      defaultProvider: "anthropic",');
    console.log('      providerDefaults: {');
    console.log('        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }');
    console.log('      }');
    console.log('    })');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. Agent-level switching: new Agent({ provider })');
  console.log('  2. Prompt-level switching: agent.prompt(prompt, { provider })');
  console.log('  3. Verifying provider usage via config and capabilities');
  console.log('  4. Choosing the right pattern for your use case');
  console.log('\nProvider switching patterns:');
  console.log('  - Agent-level: Permanent for that agent instance');
  console.log('  - Prompt-level: Temporary for one prompt() call');
  console.log('  - Global: Default fallback for all agents');
  console.log('\nBest practices:');
  console.log('  - Use agent-level switching for different agent purposes');
  console.log('  - Use prompt-level switching for A/B testing and fallbacks');
  console.log('  - Always check provider capabilities before switching');
  console.log('  - Handle errors when provider is unavailable');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runProviderSwitchingExample().catch(console.error);
}

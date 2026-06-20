/**
 * Example 02: Provider Configuration
 *
 * **Purpose**: Demonstrates the three levels of provider configuration and the configuration cascade.
 *
 * **What you'll learn**:
 * - How to set global provider defaults with configureProviders()
 * - How to configure providers at the Agent level
 * - How to override provider configuration at the Prompt level
 * - How the configuration cascade priority works (Prompt > Agent > Global)
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/providers/02-provider-configuration.ts`
 */

// ============================================================================
// Imports
// ============================================================================
import {
  Agent,
  Prompt,
  configureProviders,
  getGlobalProviderConfig,
  AnthropicProvider,
  ProviderRegistry,
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
export async function runProviderConfigurationExample(): Promise<void> {
  printHeader('Example 02: Provider Configuration');

  // Reset registry for clean example
  const registry = ProviderRegistry.getInstance();
  // @ts-expect-error - Accessing private method for example isolation
  if (registry._resetForTesting) {
    // @ts-expect-error - Resetting registry state
    registry._resetForTesting();
  }

  // ========================================================================
  // Part 1: Global Provider Configuration
  // ========================================================================
  printSection('Part 1: Global Provider Configuration');
  {
    console.log('Configuring global provider defaults...');

    // configureProviders() sets application-wide defaults
    // This is the LOWEST priority in the cascade
    configureProviders({
      defaultProvider: 'anthropic',
      providerDefaults: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          timeout: 30000,
        },

      },
    });

    console.log('✓ Global configuration set');
    console.log('\nGlobal config:', prettyJson(getGlobalProviderConfig()));

    console.log('\nKey points:');
    console.log('  - defaultProvider: Used when no provider is specified');
    console.log('  - providerDefaults: Default options for each provider');
    console.log('  - Global config has LOWEST priority (can be overridden)');
  }

  // Register and initialize providers
  registry.register(new AnthropicProvider());
  await registry.initializeProvider('anthropic');

  // ========================================================================
  // Part 2: Agent-Level Configuration
  // ========================================================================
  printSection('Part 2: Agent-Level Configuration');
  {
    console.log('Creating agents with different provider configurations...');

    // Agent 1: Uses global default (anthropic)
    const agent1 = new Agent({
      name: 'DefaultAgent',
      // No provider specified - uses global default
    });

    // Agent 2: Explicitly specifies Anthropic provider with custom options
    const agent2 = new Agent({
      name: 'ExplicitAnthropicAgent',
      provider: 'anthropic',
      providerOptions: {
        timeout: 15000,
      },
    });

    // Agent 3: Anthropic with custom options
    const agent3 = new Agent({
      name: 'CustomAnthropicAgent',
      provider: 'anthropic',
      providerOptions: {
        timeout: 10000, // Override global default of 30000
      },
    });

    console.log('✓ Agents created with different configurations');
    console.log('\nAgent 1 (DefaultAgent):');
    console.log('  - Provider: anthropic (from global default)');
    console.log('\nAgent 2 (ExplicitAnthropicAgent):');
    console.log('  - Provider: anthropic (explicitly set)');
    console.log('  - Timeout: 15000ms (custom value)');
    console.log('\nAgent 3 (CustomAnthropicAgent):');
    console.log('  - Provider: anthropic (explicitly set)');
    console.log('  - Timeout: 10000ms (overrides global 30000ms)');

    console.log('\nKey points:');
    console.log('  - Agent-level config overrides global defaults');
    console.log('  - providerOptions are merged with global defaults');
    console.log('  - Agent config has MEDIUM priority');
  }

  // ========================================================================
  // Part 3: Prompt-Level Configuration
  // ========================================================================
  printSection('Part 3: Prompt-Level Configuration');
  {
    console.log('Creating agents for prompt override demonstration...');

    const agent = new Agent({
      name: 'SwitchableAgent',
      provider: 'anthropic', // Default to Anthropic
    });

    console.log('Agent configured with provider: anthropic');

    // Create a simple prompt
    const prompt = new Prompt({
      user: 'Say "Hello from Anthropic"',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    console.log('\n--- Prompt 1: Using Agent default (anthropic) ---');
    console.log('Executing with agent default provider...');

    // Execute with agent's default provider (anthropic)
    const response1 = await agent.prompt(prompt);

    console.log('Response:', response1);
    console.log('Provider used: anthropic (agent default)');

    console.log('\n--- Prompt 2: Prompt-level override to different config ---');
    console.log('Overriding provider options at prompt level...');

    // Create a similar prompt
    const prompt2 = new Prompt({
      user: 'Say "Hello from Anthropic"',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    // Execute with prompt-level provider override
    // This OVERRIDES both agent and global configuration
    const response2 = await agent.prompt(prompt2, {
      providerOptions: {
        timeout: 5000,
      },
    });

    console.log('Response:', response2);
    console.log('Provider used: anthropic (prompt-level options override)');

    console.log('\n--- Prompt 3: Back to agent default ---');
    console.log('Executing without override (back to anthropic)...');

    const prompt3 = new Prompt({
      user: 'Say "Hello again"',
      responseFormat: z.object({
        message: z.string(),
      }),
    });

    const response3 = await agent.prompt(prompt3);

    console.log('Response:', response3);
    console.log('Provider used: anthropic (agent default restored)');

    console.log('\nKey points:');
    console.log('  - Prompt-level overrides have HIGHEST priority');
    console.log('  - Overrides only affect that specific prompt() call');
    console.log('  - Agent default is restored after override');
  }

  // ========================================================================
  // Part 4: Configuration Cascade Priority
  // ========================================================================
  printSection('Part 4: Configuration Cascade Priority');
  {
    console.log('The configuration cascade priority (highest to lowest):');
    console.log('');
    console.log('  1. Prompt-level overrides (agent.prompt(prompt, { provider })');
    console.log('     ↑ HIGHEST priority - always wins');
    console.log('');
    console.log('  2. Agent-level config (new Agent({ provider })');
    console.log('     ↑ MEDIUM priority - overrides global');
    console.log('');
    console.log('  3. Global configuration (configureProviders()');
    console.log('     ↑ LOWEST priority - used as fallback');
    console.log('');
    console.log('Example cascade:');
    console.log('  configureProviders({ defaultProvider: "anthropic" })');
    console.log('  const agent = new Agent({ provider: "anthropic" })');
    console.log('  await agent.prompt(prompt, { providerOptions: { timeout: 5000 } })');
    console.log('');
    console.log('  Result: Uses "anthropic" (prompt override wins)');
    console.log('');
    console.log('This design allows:');
    console.log('  - Global defaults for convenience');
    console.log('  - Agent-level customization per agent');
    console.log('  - Prompt-level flexibility for specific calls');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. configureProviders() - Set global defaults');
  console.log('  2. getGlobalProviderConfig() - Read global config');
  console.log('  3. Agent({ provider }) - Agent-level configuration');
  console.log('  4. agent.prompt(prompt, { provider }) - Prompt-level override');
  console.log('  5. Configuration cascade: Prompt > Agent > Global');
  console.log('\nBest practices:');
  console.log('  - Use configureProviders() for application-wide defaults');
  console.log('  - Use agent-level config for agent-specific providers');
  console.log('  - Use prompt-level overrides for one-off switches');
  console.log('  - Always register providers before creating agents');
  console.log('  - Always initialize providers before executing prompts');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runProviderConfigurationExample().catch(console.error);
}

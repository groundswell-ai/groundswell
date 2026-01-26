/**
 * Example 01: Basic Provider Usage
 *
 * **Purpose**: Demonstrates the minimal setup required to use Groundswell's provider system.
 *
 * **What you'll learn**:
 * - How to register providers with the ProviderRegistry
 * - How to initialize providers before use
 * - How to create an Agent with a configured provider
 * - How to execute prompts using Agent.prompt()
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/providers/01-basic-provider-usage.ts`
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
export async function runBasicProviderUsageExample(): Promise<void> {
  printHeader('Example 01: Basic Provider Usage');

  // ========================================================================
  // Part 1: Provider Registration
  // ========================================================================
  printSection('Part 1: Provider Registration');
  {
    console.log('Getting the ProviderRegistry singleton instance...');
    // The ProviderRegistry is a singleton that manages all provider instances
    const registry: ProviderRegistry = ProviderRegistry.getInstance();

    console.log('\nCreating and registering AnthropicProvider...');
    // Create a provider instance
    const anthropicProvider = new AnthropicProvider();

    // Register the provider with the registry
    // This step is REQUIRED before creating any Agents
    registry.register(anthropicProvider);

    console.log('✓ Provider registered successfully');
    console.log('  Provider ID:', anthropicProvider.id);
    console.log('  Capabilities:', anthropicProvider.capabilities);
  }

  // ========================================================================
  // Part 2: Provider Initialization
  // ========================================================================
  printSection('Part 2: Provider Initialization');
  {
    console.log('Initializing AnthropicProvider...');
    const registry = ProviderRegistry.getInstance();

    // Initialize the provider with API key from environment
    // This loads the Anthropic SDK and prepares the provider for use
    await registry.initializeProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('✓ Provider initialized successfully');
    console.log('  The provider is now ready to execute prompts');
  }

  // ========================================================================
  // Part 3: Creating an Agent with Provider
  // ========================================================================
  printSection('Part 3: Creating an Agent with Provider');
  {
    console.log('Creating an Agent configured for Anthropic...');
    // Create an Agent with the Anthropic provider
    // The provider option specifies which provider to use
    const agent = new Agent({
      name: 'BasicAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    console.log('✓ Agent created successfully');
    console.log('  Agent ID:', agent.id);
    console.log('  Provider: anthropic');
    console.log('  Model: claude-sonnet-4-20250514');
  }

  // ========================================================================
  // Part 4: Executing a Prompt
  // ========================================================================
  printSection('Part 4: Executing a Prompt');
  {
    console.log('Creating a prompt and executing it...');
    const agent = new Agent({
      name: 'BasicAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
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
    // The agent delegates to the AnthropicProvider
    const response = await agent.prompt(prompt);

    console.log('\n✓ Prompt executed successfully');
    console.log('  Response:', response);
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. ProviderRegistry.getInstance() - Get singleton registry');
  console.log('  2. registry.register() - Register provider instances');
  console.log('  3. registry.initializeProvider() - Initialize providers before use');
  console.log('  4. new Agent({ provider }) - Create agent with provider config');
  console.log('  5. agent.prompt() - Execute prompts via configured provider');
  console.log('\nNote:');
  console.log('  - Providers must be registered BEFORE creating Agents');
  console.log('  - Providers must be initialized BEFORE executing prompts');
  console.log('  - The ProviderRegistry maintains global state across the application');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicProviderUsageExample().catch(console.error);
}

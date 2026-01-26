/**
 * Example 04: Multi-Provider Scenarios
 *
 * **Purpose**: Demonstrates real-world multi-provider use cases.
 *
 * **What you'll learn**:
 * - How to implement cost optimization with multiple providers
 * - How to implement fallback patterns for resilience
 * - How to implement A/B testing between providers
 * - Practical patterns for production multi-provider setups
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 * - OpenCode server running (optional - for demonstration)
 *
 * **Run**: `npx tsx examples/providers/04-multi-provider-scenarios.ts`
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
export async function runMultiProviderScenariosExample(): Promise<void> {
  printHeader('Example 04: Multi-Provider Scenarios');

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

  // Note: OpenCode initialization is optional for this example
  console.log('✓ Providers registered and initialized\n');

  // ========================================================================
  // Part 1: Cost Optimization Scenario
  // ========================================================================
  printSection('Part 1: Cost Optimization Strategy');
  {
    console.log('Use Case: Route simple tasks to cheaper providers\n');

    /**
     * CostOptimizer - Routes tasks based on complexity
     *
     * Strategy:
     * - Simple tasks (FAQ, basic queries) → OpenCode (cheaper)
     * - Complex tasks (analysis, reasoning) → Anthropic (higher quality)
     */
    class CostOptimizer {
      private simpleAgent: Agent;
      private complexAgent: Agent;

      constructor() {
        // Simple agent for basic tasks (could use cheaper provider)
        this.simpleAgent = new Agent({
          name: 'SimpleAgent',
          provider: 'anthropic', // Would be 'opencode' in production
          model: 'claude-sonnet-4-20250514',
        });

        // Complex agent for advanced reasoning
        this.complexAgent = new Agent({
          name: 'ComplexAgent',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        });
      }

      /**
       * Determine task complexity and route to appropriate agent
       */
      private async analyzeComplexity(prompt: string): Promise<'simple' | 'complex'> {
        // Simple heuristics for complexity analysis
        const simpleKeywords = ['what is', 'define', 'explain briefly', 'faq'];
        const isSimple = simpleKeywords.some((keyword) =>
          prompt.toLowerCase().includes(keyword)
        );

        return isSimple ? 'simple' : 'complex';
      }

      /**
       * Execute task with cost-optimized provider selection
       */
      async execute(task: string): Promise<unknown> {
        const complexity = await this.analyzeComplexity(task);
        const agent = complexity === 'simple' ? this.simpleAgent : this.complexAgent;

        const prompt = new Prompt({
          user: task,
          responseFormat: z.object({
            answer: z.string(),
            providerUsed: z.string(),
          }),
        });

        console.log(`Task complexity: ${complexity}`);
        console.log(`Routing to: ${agent.config.provider}`);

        try {
          const response = await agent.prompt(prompt);
          return response;
        } catch (error) {
          console.log('Note: Would execute with configured provider');
          return { answer: 'Simulated response', providerUsed: agent.config.provider };
        }
      }
    }

    // Demonstrate cost optimization
    const optimizer = new CostOptimizer();

    console.log('--- Example 1: Simple task ---');
    const simpleTask = 'What is the capital of France?';
    console.log(`Task: "${simpleTask}"`);

    try {
      const result1 = await optimizer.execute(simpleTask);
      console.log('Result:', result1);
    } catch (error) {
      console.log('Note: Would route to cheaper provider for simple tasks');
    }

    console.log('\n--- Example 2: Complex task ---');
    const complexTask =
      'Analyze the economic implications of AI on the job market over the next decade';
    console.log(`Task: "${complexTask}"`);

    try {
      const result2 = await optimizer.execute(complexTask);
      console.log('Result:', result2);
    } catch (error) {
      console.log('Note: Would route to premium provider for complex tasks');
    }

    console.log('\nKey points:');
    console.log('  - Analyze task complexity before routing');
    console.log('  - Simple tasks → cheaper provider (cost savings)');
    console.log('  - Complex tasks → premium provider (quality assurance)');
    console.log('  - Balance cost vs. quality based on your needs');
  }

  // ========================================================================
  // Part 2: Fallback Pattern for Resilience
  // ========================================================================
  printSection('Part 2: Fallback Pattern for Resilience');
  {
    console.log('Use Case: Automatic failover when primary provider fails\n');

    /**
     * ResilientAgent - Implements fallback pattern
     *
     * Strategy:
     * - Try primary provider first
     * - Fallback to secondary provider on failure
     * - Log failures for monitoring
     */
    class ResilientAgent {
      private agent: Agent;
      private primaryProvider: 'anthropic' | 'opencode' = 'anthropic';
      private fallbackProvider: 'anthropic' | 'opencode' = 'opencode';

      constructor() {
        this.agent = new Agent({
          name: 'ResilientAgent',
          provider: this.primaryProvider,
        });
      }

      /**
       * Execute with automatic fallback
       */
      async executeWithFallback(task: string): Promise<unknown> {
        const prompt = new Prompt({
          user: task,
          responseFormat: z.object({
            answer: z.string(),
            provider: z.string(),
          }),
        });

        console.log(`Attempting primary provider: ${this.primaryProvider}...`);

        try {
          // Try primary provider
          const response = await this.agent.prompt(prompt);
          console.log('✓ Primary provider succeeded');
          return { ...response, fallbackUsed: false };
        } catch (primaryError) {
          console.log(`✗ Primary provider failed: ${(primaryError as Error).message}`);
          console.log(`Falling back to: ${this.fallbackProvider}...`);

          try {
            // Try fallback provider
            const response = await this.agent.prompt(prompt, {
              provider: this.fallbackProvider,
              providerOptions: {
                endpoint: 'http://localhost:4096',
              },
            });
            console.log('✓ Fallback provider succeeded');
            return { ...response, fallbackUsed: true };
          } catch (fallbackError) {
            console.log(`✗ Fallback provider also failed: ${(fallbackError as Error).message}`);
            throw new Error('All providers failed');
          }
        }
      }
    }

    // Demonstrate fallback pattern
    const resilientAgent = new ResilientAgent();

    console.log('--- Example: Normal execution ---');
    console.log('Task: "Tell me a joke"');

    try {
      const result = await resilientAgent.executeWithFallback('Tell me a joke');
      console.log('Result:', result);
    } catch (error) {
      console.log('Note: In production, would execute with primary provider');
      console.log('  On failure, would automatically fall back to secondary');
    }

    console.log('\nKey points:');
    console.log('  - Always try primary provider first');
    console.log('  - Implement graceful fallback on failure');
    console.log('  - Log failures for monitoring and alerting');
    console.log('  - Consider circuit breakers for repeated failures');
    console.log('  - Return metadata about which provider was used');
  }

  // ========================================================================
  // Part 3: A/B Testing Pattern
  // ========================================================================
  printSection('Part 3: A/B Testing Between Providers');
  {
    console.log('Use Case: Compare provider performance for the same task\n');

    /**
     * ProviderABTest - Runs A/B tests between providers
     *
     * Strategy:
     * - Execute same prompt on multiple providers
     * - Compare results (quality, latency, cost)
     * - Collect metrics for decision making
     */
    class ProviderABTest {
      private agent: Agent;

      constructor() {
        this.agent = new Agent({
          name: 'TestAgent',
          provider: 'anthropic',
        });
      }

      /**
       * Run prompt on multiple providers and compare
       */
      async compare(promptText: string): Promise<void> {
        const prompt = new Prompt({
          user: promptText,
          responseFormat: z.object({
            summary: z.string(),
          }),
        });

        const providers: Array<'anthropic' | 'opencode'> = ['anthropic', 'opencode'];
        const results: Array<{ provider: string; response: unknown; latency: number }> = [];

        console.log(`Testing prompt: "${promptText}"\n`);

        for (const provider of providers) {
          console.log(`Testing ${provider}...`);

          const startTime = Date.now();

          try {
            const response = await this.agent.prompt(prompt, {
              provider,
              providerOptions: provider === 'opencode' ? { endpoint: 'http://localhost:4096' } : undefined,
            });

            const latency = Date.now() - startTime;

            results.push({
              provider,
              response,
              latency,
            });

            console.log(`  ✓ Latency: ${latency}ms`);
            console.log(`  ✓ Response:`, response);
          } catch (error) {
            const latency = Date.now() - startTime;
            console.log(`  ✗ Failed after ${latency}ms: ${(error as Error).message}`);
            results.push({
              provider,
              response: null,
              latency,
            });
          }

          console.log('');
        }

        // Summary
        console.log('--- A/B Test Summary ---');
        results.forEach((result) => {
          console.log(`${result.provider}:`);
          console.log(`  Status: ${result.response ? 'Success' : 'Failed'}`);
          console.log(`  Latency: ${result.latency}ms`);
        });

        console.log('\nRecommendations:');
        console.log('  - Compare response quality manually');
        console.log('  - Track latency over multiple runs');
        console.log('  - Consider cost per token for each provider');
        console.log('  - Use metrics to inform provider selection strategy');
      }
    }

    // Demonstrate A/B testing
    const abTest = new ProviderABTest();

    try {
      await abTest.compare('Explain quantum computing in one sentence');
    } catch (error) {
      console.log('Note: In production, would execute on both providers');
      console.log('  and collect comparison metrics');
    }
  }

  // ========================================================================
  // Part 4: Multi-Provider Architecture Patterns
  // ========================================================================
  printSection('Part 4: Multi-Provider Architecture Patterns');
  {
    console.log('Common multi-provider architecture patterns:\n');

    console.log('Pattern 1: Specialized Agents');
    console.log('  Different agents for different capabilities');
    console.log('  ```typescript');
    console.log('  const researchAgent = new Agent({ provider: "anthropic" })');
    console.log('  const codeAgent = new Agent({ provider: "opencode" })');
    console.log('  ```');
    console.log('  Benefits:');
    console.log('    - Optimized for specific tasks');
    console.log('    - Clear separation of concerns');
    console.log('    - Easy to monitor and optimize individually');

    console.log('\nPattern 2: Provider Pool');
    console.log('  Round-robin or load-balanced provider selection');
    console.log('  ```typescript');
    console.log('  const providers = ["anthropic", "opencode"];');
    console.log('  const provider = providers[Math.floor(Math.random() * providers.length)];');
    console.log('  await agent.prompt(prompt, { provider })');
    console.log('  ```');
    console.log('  Benefits:');
    console.log('    - Distributes load across providers');
    console.log('    - Reduces rate limiting issues');
    console.log('    - Improves overall availability');

    console.log('\nPattern 3: Tiered Routing');
    console.log('  Route based on user tier or service level');
    console.log('  ```typescript');
    console.log('  const provider = user.tier === "premium" ? "anthropic" : "opencode";');
    console.log('  await agent.prompt(prompt, { provider })');
    console.log('  ```');
    console.log('  Benefits:');
    console.log('    - Cost control for free tier users');
    console.log('    - Premium experience for paying customers');
    console.log('    - Aligned costs with revenue');

    console.log('\nPattern 4: Geographic Routing');
    console.log('  Route based on user location for latency');
    console.log('  ```typescript');
    console.log('  const provider = user.region === "eu" ? "eu-provider" : "us-provider";');
    console.log('  await agent.prompt(prompt, { provider })');
    console.log('  ```');
    console.log('  Benefits:');
    console.log('    - Reduced latency for users');
    console.log('    - Data sovereignty compliance');
    console.log('    - Improved user experience');

    console.log('\nPattern 5: Feature-Based Routing');
    console.log('  Route based on required capabilities');
    console.log('  ```typescript');
    console.log('  const provider = needsMCP ? "anthropic" : "opencode";');
    console.log('  await agent.prompt(prompt, { provider })');
    console.log('  ```');
    console.log('  Benefits:');
    console.log('    - Ensures required features are available');
    console.log('    - Graceful handling of capability differences');
    console.log('    - Clear mapping of features to providers');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Multi-provider scenarios demonstrated:');
  console.log('  1. Cost Optimization - Route based on task complexity');
  console.log('  2. Fallback Pattern - Automatic failover on failure');
  console.log('  3. A/B Testing - Compare providers empirically');
  console.log('  4. Architecture Patterns - Production-ready designs');
  console.log('\nKey takeaways:');
  console.log('  - Multi-provider setups improve resilience and flexibility');
  console.log('  - Choose the right pattern for your use case');
  console.log('  - Always monitor performance and costs');
  console.log('  - Implement graceful fallbacks for production');
  console.log('  - Test thoroughly before deploying multi-provider systems');
  console.log('\nBest practices:');
  console.log('  - Start with a single provider, add more as needed');
  console.log('  - Use feature flags to control provider selection');
  console.log('  - Collect metrics on provider performance');
  console.log('  - Set up alerts for provider failures');
  console.log('  - Document your routing logic clearly');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runMultiProviderScenariosExample().catch(console.error);
}

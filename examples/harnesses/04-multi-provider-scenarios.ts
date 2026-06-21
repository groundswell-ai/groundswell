/**
 * Example 04: Multi-Provider Scenarios
 *
 * **Purpose**: Demonstrates the MODEL axis — using different LLM providers (anthropic vs openai)
 *             while keeping the harness CONSTANT (pi harness). PRD §7.8, §7.1.
 *
 * **What you'll learn**:
 * - The MODEL axis: switching between anthropic/* and openai/* on the pi harness
 * - Why claude-code is Anthropic-only and multi-provider scenarios require pi
 * - Cost optimization by model selection on a constant harness
 * - Fallback patterns across model providers
 * - A/B testing between different model providers
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 * - (Optional) OPENAI_API_KEY for openai model demonstrations
 *
 * **Run**: `npx tsx examples/harnesses/04-multi-provider-scenarios.ts`
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
export async function runMultiProviderScenariosExample(): Promise<void> {
  printHeader('Example 04: Multi-Provider Scenarios');

  // Setup: Register and initialize the PI harness
  // The pi harness can run ANY provider — it is the harness for multi-provider scenarios.
  // claude-code is Anthropic-only (§7.8), so it cannot be used for openai/* models.
  const registry = HarnessRegistry.getInstance();
  // @ts-expect-error - Accessing private method for example isolation
  if (registry._resetForTesting) {
    // @ts-expect-error - Resetting registry state
    registry._resetForTesting();
  }

  console.log('Setting up harnesses...');
  registry.register(new PiHarness());
  registry.register(new ClaudeCodeHarness());
  await registry.initializeProvider('claude-code', {
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('✓ Both harnesses registered and initialized');
  console.log('  Note: Multi-provider (non-Anthropic) scenarios require the pi harness.');
  console.log('  claude-code is Anthropic-only — attempting openai/* on claude-code is a config error.\n');

  // ========================================================================
  // Part 1: Cost Optimization (Model Axis)
  // ========================================================================
  printSection('Part 1: Cost Optimization (Model Axis)');
  {
    console.log('Use Case: Route tasks by complexity — harness stays CONSTANT (pi)\n');

    /**
     * CostOptimizer - Routes tasks based on complexity via the MODEL axis.
     * Both agents use the pi harness; only the model changes.
     */
    class CostOptimizer {
      private simpleAgent: Agent;
      private complexAgent: Agent;

      constructor() {
        // Simple agent: cheaper/faster model via pi harness
        this.simpleAgent = new Agent({
          name: 'SimpleAgent',
          harness: 'pi',
          model: 'anthropic/claude-haiku-4-20250514',
        });

        // Complex agent: premium model via pi harness
        this.complexAgent = new Agent({
          name: 'ComplexAgent',
          harness: 'pi',
          model: 'anthropic/claude-sonnet-4-20250514',
        });
      }

      private async analyzeComplexity(prompt: string): Promise<'simple' | 'complex'> {
        const simpleKeywords = ['what is', 'define', 'explain briefly', 'faq'];
        const isSimple = simpleKeywords.some((keyword) =>
          prompt.toLowerCase().includes(keyword)
        );
        return isSimple ? 'simple' : 'complex';
      }

      async execute(task: string): Promise<unknown> {
        const complexity = await this.analyzeComplexity(task);
        const agent = complexity === 'simple' ? this.simpleAgent : this.complexAgent;

        const prompt = new Prompt({
          user: task,
          responseFormat: z.object({
            answer: z.string(),
            modelUsed: z.string(),
          }),
        });

        console.log(`Task complexity: ${complexity}`);
        console.log(`Routing to: ${agent.config.harness} harness, model varies`);

        try {
          const response = await agent.prompt(prompt);
          return response;
        } catch (error) {
          console.log('Note: Would execute with configured provider');
          return { answer: 'Simulated response', modelUsed: agent.config.model };
        }
      }
    }

    const optimizer = new CostOptimizer();

    console.log('--- Example 1: Simple task ---');
    try {
      const result1 = await optimizer.execute('What is the capital of France?');
      console.log('Result:', result1);
    } catch (error) {
      console.log('Note: Would route to cheaper model for simple tasks');
    }

    console.log('\n--- Example 2: Complex task ---');
    try {
      const result2 = await optimizer.execute(
        'Analyze the economic implications of AI on the job market over the next decade'
      );
      console.log('Result:', result2);
    } catch (error) {
      console.log('Note: Would route to premium model for complex tasks');
    }

    console.log('\nKey points:');
    console.log('  - The harness NEVER changes here — only the model (model axis, §7.8)');
    console.log('  - Both agents use the same pi harness');
    console.log('  - Simple tasks → cheaper model; Complex tasks → premium model');
  }

  // ========================================================================
  // Part 2: Multi-Provider (anthropic vs openai via pi)
  // ========================================================================
  printSection('Part 2: Multi-Provider (anthropic vs openai via pi)');
  {
    console.log('Use Case: Run the same prompt on different providers — harness CONSTANT\n');

    const agent = new Agent({
      name: 'MultiProviderAgent',
      harness: 'pi',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    const prompt = new Prompt({
      user: 'Explain quantum computing in one sentence.',
      responseFormat: z.object({ summary: z.string() }),
    });

    // Try Anthropic
    console.log('--- Anthropic model ---');
    try {
      const response = await agent.prompt(prompt, {
        model: 'anthropic/claude-sonnet-4-20250514',
      });
      console.log('Response:', response);
    } catch (error) {
      console.log('Note: Would execute on pi harness with Anthropic model');
    }

    // Try OpenAI (requires OPENAI_API_KEY)
    console.log('\n--- OpenAI model ---');
    try {
      const response = await agent.prompt(prompt, {
        model: 'openai/gpt-4o',
      });
      console.log('Response:', response);
      console.log('Model: openai/gpt-4o on pi harness (harness unchanged)');
    } catch (error) {
      console.log('Note: Would execute on pi harness with OpenAI model');
      console.log('  (Requires OPENAI_API_KEY + a configured pi provider for openai)');
    }

    console.log('\n⚠️  Remember: the same openai/gpt-4o call on a claude-code agent');
    console.log('  would be a config error — claude-code is Anthropic-only (§7.8).');
  }

  // ========================================================================
  // Part 3: Fallback Pattern (Model Axis)
  // ========================================================================
  printSection('Part 3: Fallback Pattern (Model Axis)');
  {
    console.log('Use Case: Try primary model, fall back to cheaper model on failure\n');

    const agent = new Agent({
      name: 'ResilientAgent',
      harness: 'pi',
    });

    const prompt = new Prompt({
      user: 'Tell me a joke.',
      responseFormat: z.object({ answer: z.string() }),
    });

    console.log('Attempting primary model (claude-sonnet-4-20250514)...');

    try {
      const response = await agent.prompt(prompt, {
        model: 'anthropic/claude-sonnet-4-20250514',
      });
      console.log('✓ Primary model succeeded');
      console.log('Response:', response);
    } catch (primaryError) {
      console.log(`✗ Primary model failed: ${(primaryError as Error).message}`);
      console.log('Falling back to cheaper model (claude-haiku-4-20250514)...');

      try {
        const response = await agent.prompt(prompt, {
          model: 'anthropic/claude-haiku-4-20250514',
        });
        console.log('✓ Fallback model succeeded');
        console.log('Response:', response);
      } catch (fallbackError) {
        console.log(`✗ Fallback also failed: ${(fallbackError as Error).message}`);
        console.log('Note: In production, implement circuit breakers for repeated failures');
      }
    }

    console.log('\nKey points:');
    console.log('  - Fallback happens on the MODEL axis — harness stays pi');
    console.log('  - You can also fallback across providers: anthropic → openai (both via pi)');
    console.log('  - Log failures for monitoring and alerting');
  }

  // ========================================================================
  // Part 4: A/B Testing (Model Axis)
  // ========================================================================
  printSection('Part 4: A/B Testing (Model Axis)');
  {
    console.log('Use Case: Compare model performance — harness CONSTANT\n');

    const agent = new Agent({
      name: 'ABTestAgent',
      harness: 'pi',
    });

    const promptText = 'Explain quantum computing in one sentence.';
    const models = [
      'anthropic/claude-sonnet-4-20250514',
      'openai/gpt-4o',
    ];

    console.log(`Testing prompt: "${promptText}"\n`);

    for (const model of models) {
      console.log(`Testing ${model}...`);
      const startTime = Date.now();

      try {
        const prompt = new Prompt({
          user: promptText,
          responseFormat: z.object({ summary: z.string() }),
        });

        const response = await agent.prompt(prompt, { model });
        const latency = Date.now() - startTime;

        console.log(`  ✓ Latency: ${latency}ms`);
        console.log(`  ✓ Response:`, response);
      } catch (error) {
        const latency = Date.now() - startTime;
        console.log(`  ✗ Failed after ${latency}ms: ${(error as Error).message}`);
        console.log(`  Note: ${model} may require additional API key or configuration`);
      }

      console.log('');
    }

    console.log('Key points:');
    console.log('  - The harness never changes — only the model (model axis, §7.8)');
    console.log('  - Compare response quality, latency, and cost per token');
    console.log('  - Model strings are NEVER harness-qualified: use "provider/model" format');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Multi-provider scenarios demonstrated:');
  console.log('  1. Cost Optimization - Route by task complexity (model axis, harness constant)');
  console.log('  2. Multi-Provider - anthropic vs openai on the SAME pi harness');
  console.log('  3. Fallback Pattern - Primary → cheaper model on failure');
  console.log('  4. A/B Testing - Compare models empirically on same harness');
  console.log('\nKey takeaways:');
  console.log('  - The MODEL axis is INDEPENDENT of the harness axis (§7.8)');
  console.log('  - claude-code is Anthropic-only; non-Anthropic providers require pi');
  console.log('  - The harness stays CONSTANT while you vary the model');
  console.log('  - Model strings are NEVER harness-qualified ("provider/model" format only)');
  console.log('\nBest practices:');
  console.log('  - Use the pi harness for any multi-provider scenario');
  console.log('  - Keep model strings as "provider/model" or plain — never harness-qualified');
  console.log('  - Always monitor performance and costs across providers');
  console.log('  - Implement graceful fallbacks for production');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runMultiProviderScenariosExample().catch(console.error);
}

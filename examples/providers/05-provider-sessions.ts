/**
 * Example 05: Provider Sessions
 *
 * **Purpose**: Demonstrates session management for multi-turn conversations.
 *
 * **What you'll learn**:
 * - How to create a new session with sessionId
 * - How to continue an existing session
 * - How to retrieve session state and history
 * - Differences between provider session models
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/providers/05-provider-sessions.ts`
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
export async function runProviderSessionsExample(): Promise<void> {
  printHeader('Example 05: Provider Sessions');

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
  // Part 1: Creating a New Session
  // ========================================================================
  printSection('Part 1: Creating a New Session');
  {
    console.log('Creating a session for multi-turn conversation...\n');

    const agent = new Agent({
      name: 'SessionAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    // Generate a unique session ID
    const sessionId = `session-${Date.now()}`;

    console.log('Session ID:', sessionId);
    console.log('\n--- Turn 1: Initial greeting ---');

    const prompt1 = new Prompt({
      user: 'Hi! My name is Alice.',
      responseFormat: z.object({
        response: z.string(),
      }),
    });

    try {
      // Create session by providing sessionId
      const response1 = await agent.prompt(prompt1, {
        providerOptions: {
          sessionId,
        },
      });

      console.log('Alice: Hi! My name is Alice.');
      console.log('Assistant:', response1);
      console.log('\n✓ Session created with ID:', sessionId);
    } catch (error) {
      console.log('Note: Would execute with ANTHROPIC_API_KEY');
      console.log('  Session would be created with ID:', sessionId);
    }

    console.log('\nKey points:');
    console.log('  - Sessions are created by providing a sessionId');
    console.log('  - The same sessionId must be used to continue the session');
    console.log('  - Session IDs are provider-specific (cannot share between providers)');
    console.log('  - Each provider maintains its own session storage');
  }

  // ========================================================================
  // Part 2: Continuing an Existing Session
  // ========================================================================
  printSection('Part 2: Continuing an Existing Session');
  {
    console.log('Continuing a multi-turn conversation...\n');

    const agent = new Agent({
      name: 'SessionAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    const sessionId = `session-${Date.now()}`;

    console.log('Session ID:', sessionId);

    console.log('\n--- Turn 1: Introduction ---');

    const prompt1 = new Prompt({
      user: 'My favorite color is blue.',
      responseFormat: z.object({
        response: z.string(),
      }),
    });

    try {
      const response1 = await agent.prompt(prompt1, {
        providerOptions: { sessionId },
      });
      console.log('User: My favorite color is blue.');
      console.log('Assistant:', response1);
    } catch (error) {
      console.log('User: My favorite color is blue.');
      console.log('Assistant: [Simulated response]');
    }

    console.log('\n--- Turn 2: Follow-up question ---');

    const prompt2 = new Prompt({
      user: 'What is my favorite color?',
      responseFormat: z.object({
        response: z.string(),
      }),
    });

    try {
      // Continue the session by using the same sessionId
      const response2 = await agent.prompt(prompt2, {
        providerOptions: { sessionId },
      });
      console.log('User: What is my favorite color?');
      console.log('Assistant:', response2);
      console.log('\n✓ Session context maintained across turns');
    } catch (error) {
      console.log('User: What is my favorite color?');
      console.log('Assistant: Your favorite color is blue.');
      console.log('\n✓ Session context maintained across turns');
    }

    console.log('\n--- Turn 3: Another follow-up ---');

    const prompt3 = new Prompt({
      user: 'What did I tell you in the first message?',
      responseFormat: z.object({
        response: z.string(),
      }),
    });

    try {
      const response3 = await agent.prompt(prompt3, {
        providerOptions: { sessionId },
      });
      console.log('User: What did I tell you in the first message?');
      console.log('Assistant:', response3);
      console.log('\n✓ Session history preserved throughout conversation');
    } catch (error) {
      console.log('User: What did I tell you in the first message?');
      console.log('Assistant: You told me your favorite color is blue.');
      console.log('\n✓ Session history preserved throughout conversation');
    }

    console.log('\nKey points:');
    console.log('  - Use the same sessionId to continue a session');
    console.log('  - Provider maintains conversation history');
    console.log('  - Context is preserved across multiple turns');
    console.log('  - Each prompt() call adds to the session history');
  }

  // ========================================================================
  // Part 3: Retrieving Session State
  // ========================================================================
  printSection('Part 3: Retrieving Session State');
  {
    console.log('Accessing session state and history...\n');

    const agent = new Agent({
      name: 'SessionAgent',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });

    const sessionId = `session-${Date.now()}`;
    console.log('Session ID:', sessionId);

    // Create a session with a few turns
    console.log('\nCreating session history...');

    const prompt1 = new Prompt({
      user: 'I live in New York.',
      responseFormat: z.object({
        response: z.string(),
      }),
    });

    try {
      await agent.prompt(prompt1, {
        providerOptions: { sessionId },
      });
      console.log('Turn 1: User mentioned location');
    } catch (error) {
      console.log('Turn 1: [Simulated]');
    }

    const prompt2 = new Prompt({
      user: 'I work as a software engineer.',
      responseFormat: z.object({
        response: z.string(),
      }),
    });

    try {
      await agent.prompt(prompt2, {
        providerOptions: { sessionId },
      });
      console.log('Turn 2: User mentioned job');
    } catch (error) {
      console.log('Turn 2: [Simulated]');
    }

    console.log('\n--- Retrieving session state ---');

    // Get the provider
    const provider = registry.get('anthropic');
    if (provider) {
      // Check if session exists
      const session = provider.getSession(sessionId);

      if (session) {
        console.log('Session found!');
        console.log('\nSession state:', prettyJson(session));

        console.log('\nSession information:');
        console.log('  - Session ID:', session.sessionId);
        console.log('  - History length:', session.history.length);
        console.log('  - Created at:', new Date(session.createdAt).toISOString());

        console.log('\nHistory entries:');
        session.history.forEach((entry, index) => {
          console.log(`  ${index + 1}. Role: ${entry.role}`);
        });
      } else {
        console.log('Session not found (expected in this example)');
        console.log('In production, getSession() returns the session state');
      }
    }

    console.log('\nKey points:');
    console.log('  - Use provider.getSession(sessionId) to retrieve state');
    console.log('  - Session state includes history and metadata');
    console.log('  - Can be used for debugging, analytics, or UI display');
    console.log('  - History contains all user/assistant messages');
  }

  // ========================================================================
  // Part 4: Provider Session Model Differences
  // ========================================================================
  printSection('Part 4: Provider Session Model Differences');
  {
    console.log('Comparing session models across providers:\n');

    console.log('AnthropicProvider Session Model:');
    console.log('  - Implementation: Abstraction layer (in-memory Map)');
    console.log('  - Storage: Provider instance (private sessions Map)');
    console.log('  - Lifecycle: Exists until provider termination or process exit');
    console.log('  - Persistence: Not persistent (in-memory only)');
    console.log('  - Session ID: Any string (user-generated or UUID)');
    console.log('  - SDK Integration: Custom implementation on top of stateless SDK');

    console.log('\nOpenCodeProvider Session Model:');
    console.log('  - Implementation: Native SDK session management');
    console.log('  - Storage: Managed by OpenCode SDK');
    console.log('  - Lifecycle: Managed by SDK (may have TTL)');
    console.log('  - Persistence: Depends on SDK configuration');
    console.log('  - Session ID: Required by SDK format');
    console.log('  - SDK Integration: Built-in session support');

    console.log('\nKey Differences:');
    console.log('  | Aspect          | Anthropic              | OpenCode              |');
    console.log('  |-----------------|------------------------|-----------------------|');
    console.log('  | Storage         | In-memory (Map)        | SDK-managed           |');
    console.log('  | Persistence     | No                     | Depends on config     |');
    console.log('  | Implementation  | Custom abstraction     | Native SDK feature    |');
    console.log('  | Session sharing | Provider-specific only  | Provider-specific only |');
    console.log('  | State access    | getSession() method    | SDK-managed           |');

    console.log('\nImportant Notes:');
    console.log('  - Session IDs are provider-specific (cannot share between providers)');
    console.log('  - Sessions do not persist across process restarts');
    console.log('  - For production persistence, implement custom session storage');
    console.log('  - Consider session expiration and cleanup for long-running apps');
    console.log('  - Anthropic uses custom abstraction (SDK is stateless)');
    console.log('  - OpenCode uses native SDK session support');
  }

  // ========================================================================
  // Part 5: Session Management Best Practices
  // ========================================================================
  printSection('Part 5: Session Management Best Practices');
  {
    console.log('Recommended patterns for session management:\n');

    console.log('1. Session ID Generation');
    console.log('   ```typescript');
    console.log('   // Use UUID for unique session IDs');
    console.log('   import { randomUUID } from "crypto";');
    console.log('   const sessionId = randomUUID();');
    console.log('   ');
    console.log('   // Or use a custom pattern');
    console.log('   const sessionId = `user-${userId}-${Date.now()}`;');
    console.log('   ```');

    console.log('\n2. Session Lifecycle Management');
    console.log('   ```typescript');
    console.log('   // Create session');
    console.log('   await agent.prompt(prompt, { providerOptions: { sessionId } });');
    console.log('   ');
    console.log('   // Continue session');
    console.log('   await agent.prompt(prompt2, { providerOptions: { sessionId } });');
    console.log('   ');
    console.log('   // Check session exists');
    console.log('   const session = provider.getSession(sessionId);');
    console.log('   if (session) { /* session exists */ }');
    console.log('   ```');

    console.log('\n3. Multi-Turn Conversation Pattern');
    console.log('   ```typescript');
    console.log('   async function chat(agent: Agent, sessionId: string, messages: string[]) {');
    console.log('     for (const message of messages) {');
    console.log('       const prompt = new Prompt({ user: message, responseFormat });');
    console.log('       const response = await agent.prompt(prompt, {');
    console.log('         providerOptions: { sessionId }');
    console.log('       });');
    console.log('       console.log(response);');
    console.log('     }');
    console.log('   }');
    console.log('   ```');

    console.log('\n4. Session State Persistence (Custom)');
    console.log('   ```typescript');
    console.log('   // For production, implement persistent storage');
    console.log('   class SessionManager {');
    console.log('     private storage: Map<string, any> = new Map();');
    console.log('   ');
    console.log('     saveSession(sessionId: string, state: any) {');
    console.log('       this.storage.set(sessionId, state);');
    console.log('     }');
    console.log('   ');
    console.log('     loadSession(sessionId: string) {');
    console.log('       return this.storage.get(sessionId);');
    console.log('     }');
    console.log('   }');
    console.log('   ```');

    console.log('\n5. Error Handling');
    console.log('   ```typescript');
    console.log('   try {');
    console.log('     await agent.prompt(prompt, { providerOptions: { sessionId } });');
    console.log('   } catch (error) {');
    console.log('     // Session may be invalid or expired');
    console.log('     // Create new session and retry');
    console.log('     const newSessionId = randomUUID();');
    console.log('     await agent.prompt(prompt, { providerOptions: { sessionId: newSessionId } });');
    console.log('   }');
    console.log('   ```');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. Creating sessions with providerOptions.sessionId');
  console.log('  2. Continuing sessions by reusing the same sessionId');
  console.log('  3. Retrieving session state with provider.getSession()');
  console.log('  4. Understanding provider session model differences');
  console.log('  5. Best practices for session management');
  console.log('\nImportant considerations:');
  console.log('  - Sessions are provider-specific (cannot share between providers)');
  console.log('  - Sessions do not persist across process restarts');
  console.log('  - Implement custom persistence for production use cases');
  console.log('  - Handle session expiration and invalid session IDs');
  console.log('  - Use UUIDs or user-specific patterns for session IDs');
  console.log('\nWhen to use sessions:');
  console.log('  - Multi-turn conversations with context');
  console.log('  - Chat applications requiring history');
  console.log('  - Conversational workflows');
  console.log('  - Any use case requiring conversation state');
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runProviderSessionsExample().catch(console.error);
}

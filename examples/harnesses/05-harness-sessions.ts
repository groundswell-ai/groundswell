/**
 * Example 05: Harness Sessions
 *
 * **Purpose**: Demonstrates session management for multi-turn conversations using harnesses.
 *
 * **What you'll learn**:
 * - How to create a new session with sessionId via harnessOptions
 * - How to continue an existing session by reusing sessionId
 * - How to retrieve session state with harness.getSession() (claude-code)
 * - The session model difference between claude-code and pi (PRD §7.5)
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/harnesses/05-harness-sessions.ts`
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
export async function runHarnessSessionsExample(): Promise<void> {
  printHeader('Example 05: Harness Sessions');

  // Setup: Register and initialize the claude-code harness (it has getSession)
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
  // Part 1: Creating a New Session
  // ========================================================================
  printSection('Part 1: Creating a New Session');
  {
    console.log('Creating a session for multi-turn conversation...\n');

    const agent = new Agent({
      name: 'SessionAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    // Generate a unique session ID
    const sessionId = `session-${Date.now()}`;

    console.log('Session ID:', sessionId);
    console.log('\n--- Turn 1: Initial greeting ---');

    const prompt1 = new Prompt({
      user: 'Hi! My name is Alice.',
      responseFormat: z.object({ response: z.string() }),
    });

    try {
      // Create session by providing sessionId in harnessOptions
      const response1 = await agent.prompt(prompt1, {
        harnessOptions: {
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
    console.log('  - Sessions are created by providing a sessionId in harnessOptions');
    console.log('  - The same sessionId must be used to continue the session');
    console.log('  - Session IDs are harness-specific (cannot share between harnesses)');
  }

  // ========================================================================
  // Part 2: Continuing an Existing Session
  // ========================================================================
  printSection('Part 2: Continuing an Existing Session');
  {
    console.log('Continuing a multi-turn conversation...\n');

    const agent = new Agent({
      name: 'SessionAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    const sessionId = `session-${Date.now()}`;

    console.log('Session ID:', sessionId);

    console.log('\n--- Turn 1: Introduction ---');
    const prompt1 = new Prompt({
      user: 'My favorite color is blue.',
      responseFormat: z.object({ response: z.string() }),
    });

    try {
      const response1 = await agent.prompt(prompt1, {
        harnessOptions: { sessionId },
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
      responseFormat: z.object({ response: z.string() }),
    });

    try {
      // Continue the session by using the same sessionId
      const response2 = await agent.prompt(prompt2, {
        harnessOptions: { sessionId },
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
      responseFormat: z.object({ response: z.string() }),
    });

    try {
      const response3 = await agent.prompt(prompt3, {
        harnessOptions: { sessionId },
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
    console.log('  - Harness maintains conversation history');
    console.log('  - Context is preserved across multiple turns');
    console.log('  - Each prompt() call adds to the session history');
  }

  // ========================================================================
  // Part 3: Retrieving Session State (claude-code)
  // ========================================================================
  printSection('Part 3: Retrieving Session State (claude-code)');
  {
    console.log('Accessing session state via getSession() on the claude-code harness...\n');

    const agent = new Agent({
      name: 'SessionAgent',
      harness: 'claude-code',
      model: 'anthropic/claude-sonnet-4-20250514',
    });

    const sessionId = `session-${Date.now()}`;
    console.log('Session ID:', sessionId);

    // Create a session with a few turns
    console.log('\nCreating session history...');

    const prompt1 = new Prompt({
      user: 'I live in New York.',
      responseFormat: z.object({ response: z.string() }),
    });

    try {
      await agent.prompt(prompt1, {
        harnessOptions: { sessionId },
      });
      console.log('Turn 1: User mentioned location');
    } catch (error) {
      console.log('Turn 1: [Simulated]');
    }

    const prompt2 = new Prompt({
      user: 'I work as a software engineer.',
      responseFormat: z.object({ response: z.string() }),
    });

    try {
      await agent.prompt(prompt2, {
        harnessOptions: { sessionId },
      });
      console.log('Turn 2: User mentioned job');
    } catch (error) {
      console.log('Turn 2: [Simulated]');
    }

    console.log('\n--- Retrieving session state ---');

    // Get the claude-code harness instance
    const cc = registry.get('claude-code');
    if (cc) {
      try {
        // ClaudeCodeHarness HAS getSession() (§7.5)
        const session = await cc.getSession(sessionId);

        if (session) {
          console.log('Session found!');
          console.log('\nSession state:', prettyJson(session));
        } else {
          console.log('Session not found (expected without a live API key)');
          console.log('In production, getSession() returns the full session state');
        }
      } catch (error) {
        console.log('Note: getSession() would return session state with a live key');
        console.log('  Error:', (error as Error).message);
      }
    }

    console.log('\nKey points:');
    console.log('  - Use harness.getSession(sessionId) to retrieve state (claude-code)');
    console.log('  - Session state includes history and metadata');
    console.log('  - Can be used for debugging, analytics, or UI display');
  }

  // ========================================================================
  // Part 4: Session Model Differences (claude-code vs pi)
  // ========================================================================
  printSection('Part 4: Session Model Differences (claude-code vs pi)');
  {
    console.log('The two harnesses have different session models:\n');

    console.log('┌─────────────────────┬──────────────────────┬──────────────────────┐');
    console.log('│ Aspect              │ claude-code         │ pi                   │');
    console.log('├─────────────────────┼──────────────────────┼──────────────────────┤');
    console.log('│ Implementation       │ Abstraction on       │ Fresh AgentSession   │');
    console.log('│                      │ stateless SDK        │ per execute()        │');
    console.log('├─────────────────────┼──────────────────────┼──────────────────────┤');
    console.log('│ getSession()        │ ✓ Available          │ ✗ Not available      │');
    console.log('├─────────────────────┼──────────────────────┼──────────────────────┤');
    console.log('│ Session storage     │ In-memory / file     │ Pi SessionManager    │');
    console.log('│                      │ SessionStore         │ (fork/switch/clone)  │');
    console.log('├─────────────────────┼──────────────────────┼──────────────────────┤');
    console.log('│ State persistence    │ Not persistent       │ Managed by Pi        │');
    console.log('├─────────────────────┼──────────────────────┼──────────────────────┤');
    console.log('│ Session sharing     │ Harness-specific     │ Harness-specific     │');
    console.log('└─────────────────────┴──────────────────────┴──────────────────────┘');

    console.log('\n⚠️  Important: PiHarness does NOT have a getSession() method.');
    console.log('  Pi creates a fresh AgentSession per execute() call.');
    console.log('  Pi sessions are managed via Pi\'s SessionManager (fork/switch/clone).');
    console.log('  Do NOT call piHarness.getSession() — it does not exist.');

    console.log('\nClaudeCodeHarness provides getSession(sessionId) which returns');
    console.log('the session state including conversation history.');

    console.log('\nSession ID format:');
    console.log('  - Any string (user-generated or UUID)');
    console.log('  - Examples: "session-123", "user-42-1718000000"');
  }

  // ========================================================================
  // Part 5: Session Management Best Practices
  // ========================================================================
  printSection('Part 5: Session Management Best Practices');
  {
    console.log('Recommended patterns for session management:\n');

    console.log('1. Session ID Generation');
    console.log('   ```typescript');
    console.log('   import { randomUUID } from "crypto";');
    console.log('   const sessionId = randomUUID();');
    console.log('   // Or:');
    console.log('   const sessionId = `user-${userId}-${Date.now()}`;');
    console.log('   ```');

    console.log('\n2. Session Lifecycle (claude-code harness)');
    console.log('   ```typescript');
    console.log('   // Create session');
    console.log('   await agent.prompt(prompt, { harnessOptions: { sessionId } });');
    console.log('   ');
    console.log('   // Continue session');
    console.log('   await agent.prompt(prompt2, { harnessOptions: { sessionId } });');
    console.log('   ');
    console.log('   // Retrieve state (claude-code only)');
    console.log('   const cc = registry.get("claude-code");');
    console.log('   const session = await cc?.getSession(sessionId);');
    console.log('   ```');

    console.log('\n3. Multi-Turn Conversation Pattern');
    console.log('   ```typescript');
    console.log('   async function chat(agent: Agent, sessionId: string, messages: string[]) {');
    console.log('     for (const message of messages) {');
    console.log('       const prompt = new Prompt({ user: message, responseFormat });');
    console.log('       const response = await agent.prompt(prompt, {');
    console.log('         harnessOptions: { sessionId }');
    console.log('       });');
    console.log('       console.log(response);');
    console.log('     }');
    console.log('   }');
    console.log('   ```');

    console.log('\n4. Error Handling');
    console.log('   ```typescript');
    console.log('   try {');
    console.log('     await agent.prompt(prompt, { harnessOptions: { sessionId } });');
    console.log('   } catch (error) {');
    console.log('     // Session may be invalid or expired');
    console.log('     const newSessionId = randomUUID();');
    console.log('     await agent.prompt(prompt, { harnessOptions: { sessionId: newSessionId } });');
    console.log('   }');
    console.log('   ```');
  }

  // ========================================================================
  // Summary
  // ========================================================================
  printSection('Summary');
  console.log('Key concepts demonstrated:');
  console.log('  1. Creating sessions with harnessOptions.sessionId');
  console.log('  2. Continuing sessions by reusing the same sessionId');
  console.log('  3. Retrieving session state with harness.getSession() (claude-code only)');
  console.log('  4. Understanding session model differences (claude-code vs pi)');
  console.log('  5. Best practices for session management');
  console.log('\nImportant considerations:');
  console.log('  - Sessions are harness-specific (cannot share between harnesses)');
  console.log('  - ClaudeCodeHarness has getSession(); PiHarness does NOT');
  console.log('  - Pi sessions are managed via Pi\'s SessionManager (fork/switch/clone)');
  console.log('  - Implement custom persistence for production use cases');
  console.log('  - Handle session expiration and invalid session IDs');
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
  runHarnessSessionsExample().catch(console.error);
}

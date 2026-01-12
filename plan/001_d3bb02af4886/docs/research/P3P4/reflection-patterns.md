# Reflection Patterns Research

## What is Reflection in AI Agent Contexts

Reflection is a self-correction mechanism where an AI agent:
1. Evaluates its own output
2. Identifies errors or improvements
3. Revises its approach based on feedback

## Levels of Reflection (PRD Section 4.4)

### 1. Workflow-Level Reflection
- Triggered when a step fails
- Has access to entire workflow state
- Can retry failed steps with modified approach

### 2. Agent-Level Reflection
- Triggered via Agent.reflect() method
- Adds reflection system prompt prefix
- Reviews reasoning before final answer

### 3. Prompt-Level Reflection
- Enabled per-prompt via enableReflection flag
- Validates response against schema
- Retries with error context if validation fails

## Implementation Patterns

### Reflection Prompt Template

```typescript
const REFLECTION_PROMPT = `Before answering, reflect on your reasoning step by step:
1. What is the core problem/question?
2. What approaches could solve this?
3. What are potential errors or edge cases?
4. Review your answer for accuracy.

Then provide your final answer.`;
```

### Auto-Retry with Reflection

```typescript
async function executeWithReflection<T>(
  agent: Agent,
  prompt: Prompt<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await agent.prompt(prompt);
      return result;
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        // Create reflection prompt with error context
        const reflectionPrompt = prompt.withData({
          previousError: lastError.message,
          attempt: attempt,
          instruction: 'Reflect on the previous error and try again.'
        });

        // Emit reflection event
        emitEvent({
          type: 'reflectionStart',
          level: 'prompt',
          node: currentNode
        });
      }
    }
  }

  throw lastError;
}
```

### ReflectionAPI Interface (PRD Section 4.3)

```typescript
interface ReflectionAPI {
  isEnabled(): boolean;
  triggerReflection(reason?: string): Promise<void>;
  getReflectionHistory(): ReflectionEntry[];
}

interface ReflectionEntry {
  timestamp: number;
  level: 'workflow' | 'agent' | 'prompt';
  reason: string;
  originalError?: Error;
  resolution: 'retry' | 'skip' | 'abort';
  success: boolean;
}
```

## Best Practices

1. **Maximum reflection attempts**: 2-3 attempts before failure
2. **When NOT to reflect**:
   - Rate limit errors (wait and retry instead)
   - Authentication errors (cannot self-fix)
   - Quota exceeded (needs external action)
3. **Performance considerations**:
   - Each reflection doubles token usage
   - Cache reflection results when possible
4. **State capture**: Always snapshot state before reflection for debugging

## Integration with Workflow Events

```typescript
// Events to emit during reflection
{ type: 'reflectionStart'; level: 'workflow' | 'agent' | 'prompt'; node: WorkflowNode }
{ type: 'reflectionEnd'; level: 'workflow' | 'agent' | 'prompt'; success: boolean; node: WorkflowNode }
```

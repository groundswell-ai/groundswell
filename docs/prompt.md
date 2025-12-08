# Prompts

Prompts are immutable value objects that define what to send to an agent and how to validate the response using Zod schemas.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [Response Format](#response-format)
- [Data Injection](#data-injection)
- [Overrides](#overrides)
- [Validation](#validation)
- [API Reference](#api-reference)

## Basic Usage

```typescript
import { createPrompt } from 'groundswell';
import { z } from 'zod';

const prompt = createPrompt({
  user: 'Analyze this code for bugs',
  data: { code: 'function foo() { return 42; }' },
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});
```

## Configuration

### PromptConfig

```typescript
interface PromptConfig<T> {
  user: string;                           // Required: user message
  data?: Record<string, unknown>;         // Optional: structured data
  responseFormat: z.ZodType<T>;           // Required: response schema
  system?: string;                        // Optional: system prompt override
  tools?: Tool[];                         // Optional: tools override
  mcps?: MCPServer[];                     // Optional: MCPs override
  skills?: Skill[];                       // Optional: skills override
  hooks?: AgentHooks;                     // Optional: hooks override
  enableReflection?: boolean;             // Optional: enable reflection
}
```

### Creating Prompts

```typescript
// Factory function
const prompt = createPrompt({
  user: 'Hello',
  responseFormat: z.object({ response: z.string() }),
});

// Class constructor
const prompt = new Prompt({
  user: 'Hello',
  responseFormat: z.object({ response: z.string() }),
});
```

## Response Format

### Zod Schema Integration

The `responseFormat` property accepts any Zod schema. The schema:
- Defines the expected response type
- Enables compile-time type inference for `T`
- Validates API responses at runtime

```typescript
import { z } from 'zod';

// Simple object
const simpleSchema = z.object({
  answer: z.string(),
  confidence: z.number(),
});

// With constraints
const strictSchema = z.object({
  answer: z.string().min(10),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

// With descriptions (used for API hints)
const describedSchema = z.object({
  summary: z.string().describe('Brief summary in 2-3 sentences'),
  keyPoints: z.array(z.string()).describe('Main takeaways'),
  score: z.number().min(0).max(100).describe('Quality score'),
});

// Enums
const enumSchema = z.object({
  category: z.enum(['bug', 'feature', 'improvement']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

// Nested objects
const nestedSchema = z.object({
  analysis: z.object({
    issues: z.array(z.object({
      line: z.number(),
      message: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
    })),
    summary: z.string(),
  }),
});
```

### Type Inference

The prompt's response type is inferred from the schema:

```typescript
const prompt = createPrompt({
  user: 'Analyze',
  responseFormat: z.object({
    bugs: z.array(z.string()),
    score: z.number(),
  }),
});

// prompt is Prompt<{ bugs: string[], score: number }>

const result = await agent.prompt(prompt);
// result is { bugs: string[], score: number }
```

## Data Injection

### Data Property

Structured data is injected into the user message:

```typescript
const prompt = createPrompt({
  user: 'Analyze the following code for security issues',
  data: {
    code: 'const x = eval(userInput);',
    language: 'javascript',
  },
  responseFormat: analysisSchema,
});
```

The data is formatted as XML-like sections:

```
Analyze the following code for security issues

<code>
"const x = eval(userInput);"
</code>

<language>
"javascript"
</language>
```

### withData()

Create a new prompt with updated data (immutable):

```typescript
const basePrompt = createPrompt({
  user: 'Classify this item',
  responseFormat: classificationSchema,
});

// Create variations
const applePrompt = basePrompt.withData({ item: 'apple' });
const bananaPrompt = basePrompt.withData({ item: 'banana' });

// Data is merged
const prompt = basePrompt
  .withData({ item: 'apple' })
  .withData({ context: 'grocery store' });
// Data: { item: 'apple', context: 'grocery store' }
```

## Overrides

### System Prompt Override

```typescript
const prompt = createPrompt({
  user: 'Translate to French',
  system: 'You are a professional translator. Be precise and formal.',
  responseFormat: z.object({ translation: z.string() }),
});
```

### Tools Override

```typescript
const prompt = createPrompt({
  user: 'Calculate 2 + 2',
  tools: [calculatorTool],  // Only these tools available
  responseFormat: z.object({ result: z.number() }),
});
```

### Hooks Override

```typescript
const prompt = createPrompt({
  user: 'Process data',
  hooks: {
    preToolUse: [async (ctx) => console.log('Using tool:', ctx.toolName)],
  },
  responseFormat: z.object({ processed: z.boolean() }),
});
```

### Reflection Override

```typescript
const prompt = createPrompt({
  user: 'Complex analysis',
  enableReflection: true,  // Enable for this prompt
  responseFormat: analysisSchema,
});
```

## Validation

### validateResponse()

Validates data and throws on failure:

```typescript
try {
  const validated = prompt.validateResponse(parsed);
  // validated is T
} catch (error) {
  // error is ZodError with detailed validation info
  console.log(error.issues);
}
```

### safeValidateResponse()

Non-throwing validation:

```typescript
const result = prompt.safeValidateResponse(parsed);

if (result.success) {
  console.log(result.data);  // Type: T
} else {
  console.log(result.error.issues);  // Validation errors
}
```

### Validation Errors

ZodError provides detailed error information:

```typescript
const result = prompt.safeValidateResponse({ score: 'invalid' });

if (!result.success) {
  for (const issue of result.error.issues) {
    console.log(`Path: ${issue.path.join('.')}`);
    console.log(`Message: ${issue.message}`);
    console.log(`Code: ${issue.code}`);
  }
}
```

## API Reference

### Prompt Class

```typescript
class Prompt<T> {
  readonly id: string;
  readonly user: string;
  readonly data: Record<string, unknown>;
  readonly responseFormat: z.ZodType<T>;
  readonly systemOverride?: string;
  readonly toolsOverride?: Tool[];
  readonly mcpsOverride?: MCPServer[];
  readonly skillsOverride?: Skill[];
  readonly hooksOverride?: AgentHooks;
  readonly enableReflection?: boolean;

  constructor(config: PromptConfig<T>);

  validateResponse(data: unknown): T;
  safeValidateResponse(data: unknown):
    | { success: true; data: T }
    | { success: false; error: z.ZodError };
  buildUserMessage(): string;
  withData(newData: Record<string, unknown>): Prompt<T>;
  getData(): Record<string, unknown>;
  getResponseFormat(): z.ZodType<T>;
}
```

### Factory Function

```typescript
function createPrompt<T>(config: PromptConfig<T>): Prompt<T>;
```

### Immutability

Prompts are frozen on creation:

```typescript
const prompt = createPrompt({
  user: 'Hello',
  data: { key: 'value' },
  responseFormat: schema,
});

// These throw errors:
prompt.user = 'Modified';  // Error
prompt.data.key = 'new';   // Error (data is also frozen)

// Use withData() to create variations:
const newPrompt = prompt.withData({ key: 'new' });
```

### Usage with Agents

```typescript
import { createAgent, createPrompt } from 'groundswell';
import { z } from 'zod';

const agent = createAgent({ enableCache: true });

const prompt = createPrompt({
  user: 'Summarize',
  data: { text: longDocument },
  responseFormat: z.object({
    summary: z.string(),
    wordCount: z.number(),
  }),
});

// Simple execution
const result = await agent.prompt(prompt);

// With metadata
const { data, usage, duration } = await agent.promptWithMetadata(prompt);

// With reflection
const reflected = await agent.reflect(prompt);
```

### Common Patterns

**Reusable Base Prompts:**

```typescript
const classifyPrompt = createPrompt({
  user: 'Classify the following item into a category',
  responseFormat: z.object({
    category: z.string(),
    confidence: z.number(),
  }),
});

// Reuse with different items
for (const item of items) {
  const result = await agent.prompt(classifyPrompt.withData({ item }));
}
```

**Schema Libraries:**

```typescript
// schemas.ts
export const AnalysisSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string(),
  })),
});

export const ClassificationSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
});

// usage.ts
import { AnalysisSchema, ClassificationSchema } from './schemas';

const analysisPrompt = createPrompt({
  user: 'Analyze',
  responseFormat: AnalysisSchema,
});
```

**Conditional Prompts:**

```typescript
function createAnalysisPrompt(options: { detailed: boolean }) {
  return createPrompt({
    user: options.detailed
      ? 'Provide a detailed analysis with examples'
      : 'Provide a brief analysis',
    responseFormat: options.detailed
      ? detailedSchema
      : briefSchema,
  });
}
```

See [examples/09-reflection.ts](../examples/examples/09-reflection.ts) for prompt validation and reflection patterns.

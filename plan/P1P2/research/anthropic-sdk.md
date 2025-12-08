# Anthropic SDK Research

## Official Documentation URLs

| Resource | URL |
|----------|-----|
| **NPM Package** | https://www.npmjs.com/package/@anthropic-ai/sdk |
| **GitHub Repository** | https://github.com/anthropics/anthropic-sdk-typescript |
| **API Reference** | https://github.com/anthropics/anthropic-sdk-typescript/blob/main/api.md |
| **Helpers Documentation** | https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md |
| **Tool Use Guide** | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use |
| **Streaming Messages** | https://platform.claude.com/docs/en/api/messages-streaming |

## Key TypeScript Interfaces

### MessageCreateParams
```typescript
import Anthropic from '@anthropic-ai/sdk';

const params: Anthropic.MessageCreateParams = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello, Claude' }],
  system?: string,
  tools?: Tool[],
  temperature?: number,
  stop_sequences?: string[],
};
```

### Message (Response)
```typescript
interface Message {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: ContentBlock[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### ContentBlock Types
```typescript
type ContentBlock = TextBlock | ToolUseBlock;

interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}
```

### Tool Definition
```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

## Tool Use Pattern

### Define Tools
```typescript
const tools: Anthropic.Tool[] = [{
  name: 'get_weather',
  description: 'Get the current weather in a given location',
  input_schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  }
}];
```

### Handle Tool Use Response
```typescript
if (response.stop_reason === 'tool_use') {
  const toolUses = response.content.filter(
    (block) => block.type === 'tool_use'
  ) as Anthropic.ToolUseBlock[];

  // Execute tools and return results
  const toolResults = toolUses.map(toolUse => ({
    type: 'tool_result' as const,
    tool_use_id: toolUse.id,
    content: executeToolAndGetResult(toolUse)
  }));

  // Continue conversation with tool results
  const finalResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools,
    messages: [
      { role: 'user', content: originalMessage },
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults }
    ]
  });
}
```

## Streaming API

```typescript
const stream = await client.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }]
});

for await (const event of stream) {
  switch (event.type) {
    case 'message_start':
    case 'content_block_start':
    case 'content_block_delta':
    case 'content_block_stop':
    case 'message_delta':
    case 'message_stop':
  }
}

// Or use helper methods
for await (const text of stream.textStream) {
  process.stdout.write(text);
}
```

## Error Handling

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 2
});

try {
  const response = await client.messages.create(params);
} catch (error) {
  if (error instanceof Anthropic.RateLimitError) {
    // Handle rate limiting with retry-after header
  } else if (error instanceof Anthropic.APIError) {
    // Handle API errors
  }
}
```

## SDK Requirements

- **TypeScript**: 4.9+
- **Node.js**: 18+ (20 LTS recommended)
- **Package Version**: @anthropic-ai/sdk@^0.71.1

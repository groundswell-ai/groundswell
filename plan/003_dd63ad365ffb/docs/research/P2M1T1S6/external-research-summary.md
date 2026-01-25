# External Research: AsyncGenerator and Agent SDK Message Patterns

## AsyncGenerator in TypeScript/JavaScript

### Key Pattern
```typescript
// AsyncGenerator is synchronous to create, async to consume
const queryResult = sdk.query({ prompt, options }); // No await!

// Iterate with for-await
for await (const message of queryResult) {
  // Process each message
}
```

**Critical Gotcha**: Do NOT await the `query()` call - it returns the generator synchronously.

## Agent SDK Message Types

### SDKMessage Union Type
```typescript
type SDKMessage =
  | SDKAssistantMessage     // type: 'assistant' - contains tool_use blocks
  | SDKUserMessage          // type: 'user'
  | SDKResultMessage        // type: 'result' - final result with metadata
  | SDKSystemMessage        // type: 'system'
  | SDKPartialAssistantMessage; // type: 'partial_assistant' - streaming
```

### Message Processing Strategy

1. **Assistant messages**: Count tool calls (for tracking/metadata)
2. **Result messages**: Extract structured_output, usage, duration_ms
3. **Other messages**: Can be ignored for this implementation

## Extracting Data from SDKResultMessage

### structured_output
- Contains validated JSON when JSON Schema is used
- Type: `unknown` - needs validation or casting
- May be undefined if no structured output

### usage
```typescript
usage?: {
  input_tokens: number;
  output_tokens: number;
}
```

### subtype Status Mapping
| subtype | AgentResponse.status |
|---------|---------------------|
| 'success' | 'success' |
| 'error_during_execution' | 'error' (recoverable: false) |
| 'error_max_turns' | 'error' (recoverable: true) |

### duration_ms
- Provided by SDK in SDKResultMessage
- Type: `number`

## Tool Call Tracking Pattern

```typescript
let toolCallCount = 0;

for await (const message of query) {
  if (message.type === 'assistant') {
    const content = message.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use') {
          toolCallCount++;
          // Optional: Track individual tool calls for hooks
          // block.name - tool name
          // block.input - tool parameters
        }
      }
    }
  }
}
```

## References

- MDN AsyncGenerator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator
- TypeScript for-await-of: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-3.html#for-await-of

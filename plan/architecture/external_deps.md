# External Dependencies - Research Findings

## Document Purpose
This document records verified external dependencies, SDK patterns, and integration requirements for the Agent/Prompt layer implementation.

---

## 1. Anthropic SDK (@anthropic-ai/sdk)

### Package Information
- **NPM Package**: `@anthropic-ai/sdk`
- **Verified Version**: `0.71.1` (already in node_modules)
- **Node.js Requirement**: 18+
- **Module Type**: ESM compatible

### Key Interfaces for Integration

```typescript
// Core types to import from SDK
import Anthropic from '@anthropic-ai/sdk';

// Message types
interface MessageCreateParams {
  model: string;
  max_tokens: number;
  messages: MessageParam[];
  system?: string;
  tools?: Tool[];
  temperature?: number;
  stop_sequences?: string[];
}

interface MessageParam {
  role: 'user' | 'assistant';
  content: ContentBlock[] | string;
}

// Tool definition
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Response types
interface Message {
  id: string;
  type: 'message';
  role: 'assistant';
  content: ContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence: string | null;
  usage: Usage;
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
}

// Content blocks
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

### Streaming Support
```typescript
// Streaming iteration
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});

for await (const event of stream) {
  // event types: message_start, content_block_start, content_block_delta,
  // content_block_stop, message_delta, message_stop
}
```

### Tool Use Pattern
```typescript
// Define tools
const tools: Tool[] = [{
  name: 'get_weather',
  description: 'Get the weather for a location',
  input_schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  }
}];

// Send message with tools
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  tools,
  messages: [{ role: 'user', content: 'What is the weather in SF?' }]
});

// Handle tool_use response
if (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find(b => b.type === 'tool_use');
  // Execute tool, send result back
}
```

### Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Required
ANTHROPIC_BASE_URL=...         # Optional, for proxies
```

---

## 2. Zod Schema Validation

### Package Information
- **NPM Package**: `zod`
- **Recommended Version**: `^3.23.0` (v3 stable)
- **In node_modules**: `4.1.13` (v4 beta - consider downgrade for stability)

### Key Patterns for Prompt Response Validation

```typescript
import { z } from 'zod';

// Define response schema
const ReviewResponseSchema = z.object({
  approved: z.boolean(),
  comments: z.array(z.object({
    file: z.string(),
    line: z.number(),
    message: z.string(),
    severity: z.enum(['error', 'warning', 'info']),
  })),
  summary: z.string(),
});

type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

// In Prompt class
class Prompt<T> {
  constructor(config: PromptConfig<T>) {
    this.responseFormat = config.responseFormat; // ZodSchema<T>
  }

  // Validation method
  validateResponse(data: unknown): T {
    return this.responseFormat.parse(data);
  }
}
```

### Schema to JSON Schema (for cache key hashing)
```typescript
import { z } from 'zod';

// Get deterministic representation for hashing
function schemaToHashable(schema: z.ZodType): string {
  // Zod doesn't have built-in JSON schema export
  // Use schema._def for internal representation
  return JSON.stringify(schema._def);
}
```

---

## 3. Node.js Crypto API (SHA-256 Cache Keys)

### Available in Node 18+
```typescript
import { createHash } from 'crypto';

function generateCacheKey(inputs: CacheKeyInputs): string {
  const hash = createHash('sha256');

  // Deterministic JSON encoding
  const canonical = JSON.stringify({
    user: inputs.user,
    data: inputs.data,
    system: inputs.system,
    model: inputs.model,
    temperature: inputs.temperature,
    tools: inputs.tools?.map(t => t.name).sort(),
    mcps: inputs.mcps?.map(m => m.name).sort(),
    skills: inputs.skills?.map(s => s.name).sort(),
    schemaHash: inputs.schemaHash,
  }, Object.keys(inputs).sort());

  hash.update(canonical);
  return hash.digest('hex');
}
```

---

## 4. MCP (Model Context Protocol) Integration

### SDK MCP Server Pattern
From research, MCP servers can be:
1. **In-process**: Faster, no subprocess overhead
2. **External (stdio)**: Separate process

### In-Process MCP Server (Recommended)
```typescript
// Pattern from Anthropic docs
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';

const server = createSdkMcpServer({
  name: 'my-tools',
  version: '1.0.0',
  tools: [
    tool('get_data', 'Fetch data', { id: z.string() }, async (args) => {
      return { content: [{ type: 'text', text: '...' }] };
    })
  ]
});
```

### MCPServer Interface for Groundswell
```typescript
interface MCPServer {
  name: string;
  version?: string;
  transport: 'stdio' | 'inprocess';
  command?: string;        // For stdio
  args?: string[];         // For stdio
  tools?: Tool[];          // For inprocess
}
```

---

## 5. Hooks (Anthropic SDK)

### Hook Types Available
```typescript
// From SDK
type HookType = 'PreToolUse' | 'PostToolUse' | 'SessionStart' | 'SessionEnd';

interface AgentHooks {
  PreToolUse?: HookHandler[];
  PostToolUse?: HookHandler[];
  SessionStart?: HookHandler[];
  SessionEnd?: HookHandler[];
}

type HookHandler = (
  input: HookInput,
  toolUseId: string,
  context: HookContext
) => Promise<HookOutput>;
```

### Pass-Through Strategy
Hooks MUST be passed through unchanged to Anthropic SDK. Groundswell does NOT add custom hook types.

---

## 6. Skills Integration

### Skill Structure
```
.claude/skills/
└── my-skill/
    ├── SKILL.md (required)
    ├── /scripts (optional)
    └── /references (optional)
```

### Skills in AgentConfig
```typescript
interface Skill {
  name: string;
  path: string;  // Path to skill directory
}

interface AgentConfig {
  skills?: Skill[];
}
```

---

## 7. Verified Compatibility Matrix

| Dependency | Version | Node.js | ESM | Status |
|------------|---------|---------|-----|--------|
| @anthropic-ai/sdk | 0.71.1 | 18+ | Yes | In node_modules |
| zod | 3.23.x | 16+ | Yes | Install needed |
| typescript | 5.2+ | 18+ | Yes | In devDependencies |
| vitest | 1.0+ | 18+ | Yes | In devDependencies |

---

## 8. API Endpoint Reference

### Anthropic Messages API
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: $ANTHROPIC_API_KEY
  anthropic-version: 2023-06-01
  content-type: application/json
```

### Models Available
- `claude-sonnet-4-20250514` (recommended)
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`

---

## 9. Breaking Changes & Deprecations

### SDK Migration (v0.1.0)
- Package renamed: `@anthropic-ai/claude-code` -> `@anthropic-ai/claude-agent-sdk`
- Class renamed: `ClaudeCodeOptions` -> `ClaudeAgentOptions`
- These changes apply to the AGENT SDK, not the base SDK we're using

### Zod v4 Breaking Changes
- v4 is in beta; recommend using v3.x for production
- Schema internals changed; cache key hashing needs testing

---

## 10. Integration Checklist

- [ ] Add `@anthropic-ai/sdk` to package.json dependencies
- [ ] Add `zod@^3.23.0` to package.json dependencies
- [ ] Verify ANTHROPIC_API_KEY environment variable handling
- [ ] Test streaming iteration pattern
- [ ] Test tool use response handling
- [ ] Implement cache key SHA-256 generation
- [ ] Test Zod schema validation
- [ ] Create MCP server wrapper (if needed)
- [ ] Pass through hooks unchanged

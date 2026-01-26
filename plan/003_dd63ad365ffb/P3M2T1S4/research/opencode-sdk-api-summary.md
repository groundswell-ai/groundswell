# OpenCode SDK API Summary for MCP and Skills

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S4 - Implement registerMCPs() and loadSkills() methods
**Status:** Complete

---

## Executive Summary

Quick reference guide for OpenCode SDK MCP and skills APIs relevant to implementing registerMCPs() and loadSkills() methods.

---

## 1. OpenCode SDK Architecture

**Key Finding**: OpenCode SDK is a **client-server architecture**, not a standalone execution library.

**Implications**:
- Requires running OpenCode server process
- Tools executed server-side (no client delegation)
- No native skills API
- Skills must use system prompt injection

---

## 2. MCP API Reference

### Namespace: `client.mcp`

```typescript
class Mcp {
  // Get MCP server status
  status(options?: Options): RequestResult<McpStatusResponses>;

  // Add MCP server dynamically
  add(options?: Options): RequestResult<McpAddResponses>;

  // Connect MCP server
  connect(options: Options): RequestResult<McpConnectResponses>;

  // Disconnect MCP server
  disconnect(options: Options): RequestResult<McpDisconnectResponses>;

  // OAuth authentication for MCP servers
  auth: {
    remove(options: Options): RequestResult<McpAuthRemoveResponses>;
    start(options: Options): RequestResult<McpAuthStartResponses>;
    callback(options: Options): RequestResult<McpAuthCallbackResponses>;
    authenticate(options: Options): RequestResult<McpAuthAuthenticateResponses>;
  };
}
```

### Key Limitations

1. **No Direct Tool Registration**: Cannot register custom tools directly
2. **Server-Side Management**: MCP servers managed by OpenCode server, not client
3. **Dynamic Add Only**: Can only add servers dynamically via `mcp.add()`
4. **No Tool Execution Control**: Tools execute server-side, no client callback

---

## 3. Tool API Reference

### Namespace: `client.tool`

```typescript
class Tool {
  // List all tool IDs (built-in + dynamically registered)
  ids(options?: Options): RequestResult<ToolIdsResponses>;

  // List tools with JSON schema for provider/model
  list(options: Options): RequestResult<ToolListResponses>;
}
```

### Usage Pattern

```typescript
// Query available tools (read-only)
const toolIds = await client.tool.ids();
const toolList = await client.tool.list({ query: { providerID: 'anthropic' } });
```

---

## 4. Skills API Status

**Critical Finding**: OpenCode SDK does **NOT** have a native skills API.

### Research Sources

- **Section 14.1**: "Skills are server-side plugins"
- **Section 16.2**: `loadSkills(skills)` marked as ❌ not feasible
- **External Package**: `opencode-agent-skills@0.6.4` (separate package)

### Recommended Approach

Use **system prompt injection** for skills (same as AnthropicProvider):

```typescript
// Load skills into system prompt
async loadSkills(skills: Skill[]): Promise<void> {
  // Read SKILL.md files
  // Format with markdown headers
  // Store in this.skillsPrompt
  // Inject into system prompt during execute()
}
```

---

## 5. Session API for Skills

### Namespace: `client.session`

**Method**: `init()`

```typescript
class Session {
  // Initialize session with AGENTS.md
  init(options: Options): RequestResult<SessionInitResponses>;
}
```

### AGENTS.md Pattern

OpenCode supports session initialization via AGENTS.md file, but this is server-side configuration, not a client SDK API.

---

## 6. RequestResult Pattern

All OpenCode SDK methods return `RequestResult<T>`:

```typescript
type RequestResult<T> = {
  data: T;
  error?: Error;
  status: number;
};
```

### Usage Pattern

```typescript
const result = await client.mcp.add({ body: { /* config */ } });

if (result.error) {
  throw new Error(`MCP add failed: ${result.error.message}`);
}

const data = result.data;
```

---

## 7. System Prompt Injection

Since OpenCode has no native skills API, use system prompt injection:

### In session.prompt()

```typescript
const result = await this.client.session.prompt({
  body: {
    sessionID: sessionId,
    message: request.prompt,
    // Inject skills via system prompt
    system: this.buildSystemPromptWithSkills(request.options.systemPrompt),
    model: { providerID, modelID },
  },
});
```

---

## 8. Implementation Strategy

### registerMCPs()

```typescript
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // LLM-only mode: no tool registration possible
  // OpenCode executes tools server-side with no client delegation
  return [];
}
```

**Rationale**:
- No tool registration API exists
- Tools managed server-side only
- Return empty array to satisfy Provider interface

### loadSkills()

```typescript
async loadSkills(skills: Skill[]): Promise<void> {
  // Read SKILL.md files
  // Format with markdown headers
  // Store for system prompt injection
  // Use in execute() via session.prompt({ body: { system: ... }})
}
```

**Rationale**:
- No native skills API
- System prompt injection is only option
- Same pattern as AnthropicProvider

---

## 9. Type Definitions

### MCPServer (from src/types/sdk-primitives.ts)

```typescript
interface MCPServer {
  name: string;
  version?: string;
  transport: 'stdio' | 'inprocess';
  command?: string;
  args?: string[];
  tools?: Tool[];
  env?: Record<string, string>;
}
```

### Tool (from src/types/sdk-primitives.ts)

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

### Skill (from src/types/sdk-primitives.ts)

```typescript
interface Skill {
  name: string;
  path: string;  // Directory containing SKILL.md
}
```

---

## 10. Key Gotchas

```typescript
// GOTCHA 1: No tool execution delegation possible
// OpenCode executes tools server-side only
// Tool executor parameter in execute() cannot be used

// GOTCHA 2: No native skills API
// Must use system prompt injection pattern
// Read SKILL.md files, format as markdown

// GOTCHA 3: Session-based execution
// Use client.session.prompt({ body: { system: string }})
// NOT query() like Anthropic

// GOTCHA 4: Server-side state
// Sessions stored on OpenCode server
// Client receives session IDs for reference

// GOTCHA 5: RequestResult wrapper
// All API calls return { data, error, status }
// Must check error property
```

---

## 11. Code Reference Files

| File | Purpose |
|------|---------|
| `plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md` | Complete SDK API documentation |
| `plan/003_dd63ad365ffb/docs/P3M2T1S3/opencode-tool-execution-research.md` | Tool execution limitations |
| `src/providers/opencode-provider.ts` | Target implementation file |
| `src/providers/anthropic-provider.ts` | Reference for patterns |

---

## 12. External Documentation

| URL | Purpose |
|-----|---------|
| https://www.npmjs.com/package/@opencode-ai/sdk | Package documentation |
| https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz | Type definitions |

---

**End of OpenCode SDK API Summary**

# OpenCode Tool Execution Delegation Research

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S3 - Research tool execution delegation patterns for OpenCodeProvider
**Status:** Complete

---

## Executive Summary

**Critical Finding:** OpenCode SDK executes tools **server-side** and provides **no mechanism for client-side tool delegation**. This is a fundamental architectural mismatch with Groundswell's Provider interface requirement for `toolExecutor` callback delegation.

**Recommendation:** Use **Strategy C - LLM-Only Hybrid Approach** for OpenCodeProvider implementation.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [OpenCode Tool Execution Architecture](#2-opencode-tool-execution-architecture)
3. [Investigated Approaches](#3-investigated-approaches)
4. [Permission System Analysis](#4-permission-system-analysis)
5. [Event-Based Interception Research](#5-event-based-interception-research)
6. [Hybrid Approaches](#6-hybrid-approaches)
7. [Recommended Implementation Strategy](#7-recommended-implementation-strategy)
8. [Implementation Guidance](#8-implementation-guidance)

---

## 1. Problem Statement

### 1.1 The Architectural Mismatch

Groundswell's Provider interface requires:

```typescript
interface Provider {
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,  // ← REQUIRED: Callback for tool delegation
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

The `toolExecutor` callback is how providers delegate tool execution back to Groundswell's MCPHandler:

```typescript
type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

### 1.2 Why Delegation is Required

Groundswell's architecture:
1. **Agent** holds the MCPHandler instance
2. **Provider** receives `toolExecutor` callback from Agent
3. **Provider** calls `toolExecutor` when LLM requests tool use
4. **MCPHandler** executes the tool and returns result
5. **Provider** continues execution with tool result

This pattern is critical for:
- Unified tool management across providers
- MCP server lifecycle control
- Tool execution observability via hooks
- Consistent error handling

### 1.3 OpenCode's Constraint

OpenCode SDK:
- Executes tools **server-side** (in the OpenCode server process)
- Client SDK has **no control** over tool execution
- Tools are configured via `client.tool.list()` and `client.mcp` namespaces
- No callback mechanism for intercepting execution

---

## 2. OpenCode Tool Execution Architecture

### 2.1 Server-Side Tool Execution

Based on SDK analysis (`@opencode-ai/sdk@1.1.36`):

```typescript
// OpenCode client structure
class OpencodeClient {
  // Tool namespace - queries available tools
  tool: Tool;

  // MCP namespace - manages MCP connections
  mcp: Mcp;

  // Session namespace - executes prompts
  session: Session;
}

// Tool listing (query only, no execution control)
class Tool {
  // List all tool IDs
  ids(options?: Options): RequestResult<ToolIdsResponses>;

  // List tools with JSON schema
  list(options: Options): RequestResult<ToolListResponses>;
}
```

**Key Observation:** There is no `tool.execute()` method. Tool execution happens implicitly during `client.session.prompt()`.

### 2.2 Tool State Flow

From SDK type definitions:

```typescript
// Tool part in message stream
type ToolPart = {
  id: string;
  sessionID: string;
  messageID: string;
  type: "tool";
  callID: string;
  tool: string;
  state: ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError;
  metadata?: { [key: string]: unknown; };
};

// Tool states
type ToolStatePending = {
  status: "pending";
  input: { [key: string]: unknown; };
  raw: string;
};

type ToolStateRunning = {
  status: "running";
  input: { [key: string]: unknown; };
  title?: string;
  metadata?: { [key: string]: unknown; };
  time: { start: number; };
};

type ToolStateCompleted = {
  status: "completed";
  input: { [key: string]: unknown; };
  output: string;
  title: string;
  metadata: { [key: string]: unknown; };
  time: { start: number; end: number; };
};

type ToolStateError = {
  status: "error";
  input: { [key: string]: unknown; };
  error: string;
  metadata?: { [key: string]: unknown; };
  time: { start: number; end: number; };
};
```

**Critical Finding:** Tool state transitions happen server-side. Client only receives notifications via events.

### 2.3 MCP Integration Pattern

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
}
```

**Observation:** MCP servers are registered with the OpenCode server, not the client SDK. Tools from these servers become available to the LLM automatically.

---

## 3. Investigated Approaches

### 3.1 Approach A: "Managed" vs "Automatic" Tool Configuration

**Hypothesis:** OpenCode might have a configuration option to disable automatic tool execution and require manual approval/execution.

**Research Findings:**

| Configuration Option | Description | Delegation Support? |
|---------------------|-------------|---------------------|
| `tools?: { [key: string]: boolean; }` | Enable/disable specific tools | No - only on/off |
| `client.mcp.add()` | Add MCP servers | No - auto-execute |
| `client.mcp.connect()` | Connect to MCP server | No - server-side |
| `client.tool.list()` | Query available tools | No - read-only |

**Conclusion:** No "managed" mode exists. Tools are either enabled (executed server-side) or disabled.

### 3.2 Approach B: Tool Handlers and Callbacks

**Hypothesis:** OpenCode SDK might provide tool handler registration similar to Anthropic's `tool()` function.

**Research Findings:**

Searched SDK exports for:
- `tool` function (Anthropic pattern)
- `registerTool` method
- `addToolHandler` method
- `onToolUse` callback
- Tool executor interfaces

**Result:** None found. The SDK type definitions show no tool registration API beyond MCP server connections.

**Conclusion:** No tool handler or callback registration mechanism exists.

### 3.3 Approach C: Tool Execution Interception via Hooks

**Hypothesis:** Event hooks might allow intercepting tool execution requests.

**Research Findings:**

From SDK event types:

```typescript
// Message part updates (streaming)
type EventMessagePartUpdated = {
  type: "message.part.updated";
  properties: {
    part: Part;  // Includes ToolPart
    delta?: string;
  };
};

// Permission events
type EventPermissionUpdated = {
  type: "permission.updated";
  properties: Permission;
};

type EventPermissionReplied = {
  type: "permission.replied";
  properties: {
    sessionID: string;
    permissionID: string;
    response: string;
  };
};
```

**Analysis:**
- Events are **notifications only**, not interception points
- No way to provide custom tool execution response
- Events fire after tool execution decision is made
- No `ToolPart` event with `status: "pending"` that allows custom response

**Conclusion:** Events are observational, not actionable. Cannot intercept tool execution.

---

## 4. Permission System Analysis

### 4.1 Permission API

```typescript
class OpencodeClient {
  // Permission responses
  postSessionIdPermissionsPermissionId(options: Options): RequestResult;
}
```

### 4.2 Permission Events

```typescript
// Permission updated event
type EventPermissionUpdated = {
  type: "permission.updated";
  properties: Permission;
};

// Permission replied event
type EventPermissionReplied = {
  type: "permission.replied";
  properties: {
    sessionID: string;
    permissionID: string;
    response: string;
  };
};
```

### 4.3 Permission Workflow Analysis

**Hypothesis:** Use permission system to require approval for each tool use, allowing custom execution.

**Research Findings:**

1. **Permission Request Flow:**
   - OpenCode server creates permission request
   - Client receives `EventPermissionUpdated`
   - Client responds via `postSessionIdPermissionsPermissionId`
   - Server continues with approved response

2. **Limitations:**
   - Permission system is for **user approval**, not custom execution
   - Response options are limited: "approve", "deny", or modified text
   - No mechanism to inject custom tool execution results
   - Still executes server-side after approval

**Conclusion:** Permission system enables user approval workflow, not custom tool delegation.

---

## 5. Event-Based Interception Research

### 5.1 Server-Sent Events (SSE) Stream

```typescript
class Event {
  // Subscribe to global events
  event(options?: Options): Promise<ServerSentEventsResult<GlobalEventResponses>>;

  // Subscribe to all events
  subscribe(options?: Options): Promise<ServerSentEventsResult<EventSubscribeResponses>>;
}
```

### 5.2 Event Types Analysis

Relevant events for tool execution:

| Event Type | Description | Interception Possible? |
|------------|-------------|------------------------|
| `message.updated` | Message state changes | No - notification only |
| `message.part.updated` | Message part updates (includes ToolPart) | No - read-only |
| `permission.updated` | Permission requests | Partial - can approve/deny, not custom execute |
| `permission.replied` | Permission response | No - notification only |

### 5.3 Event Interception Attempt

**Hypothesis:** Subscribe to events, detect tool use, respond with custom result.

**Implementation Attempt (Conceptual):**

```typescript
// Subscribe to message part updates
const events = await client.event.subscribe();

for await (const event of events) {
  if (event.type === 'message.part.updated') {
    const part = event.properties.part;

    if (part.type === 'tool' && part.state.status === 'pending') {
      // TRY: Respond with custom tool execution
      await client.tool.execute({
        toolID: part.id,
        result: customExecutionResult
      });
    }
  }
}
```

**Problem:** No `client.tool.execute()` method exists. Tool execution is internal to the server.

**Conclusion:** Event stream is observable-only. No bidirectional tool execution control.

---

## 6. Hybrid Approaches

### 6.1 Approach A: LLM-Only Mode (Disable Tools)

**Strategy:** Configure OpenCode to disable all tools, use only for LLM inference.

```typescript
const result = await client.session.prompt({
  body: {
    sessionID: sessionId,
    message: prompt,
    tools: {},  // Disable all tools
  },
});
```

**Pros:**
- Clean separation of concerns
- OpenCode provides multi-provider LLM access
- Groundswell MCPHandler manages tools

**Cons:**
- LLM cannot call tools during reasoning
- Requires two-pass approach: LLM generates plan, Groundswell executes tools
- Loses OpenCode's native tool orchestration

**Feasibility:** ✅ **Technically Possible**

### 6.2 Approach B: Tool Observation Mode

**Strategy:** Let OpenCode execute tools, observe results via events, replicate in Groundswell.

```typescript
// Subscribe to events
const events = await client.event.subscribe();

// Execute prompt with tools enabled
const result = await client.session.prompt({
  body: {
    sessionID: sessionId,
    message: prompt,
    tools: { bash: true, editor: true },
  },
});

// Observe tool executions
for await (const event of events) {
  if (event.type === 'message.part.updated') {
    const part = event.properties.part;
    if (part.type === 'tool') {
      // Notify Groundswell's toolExecutor (observation only)
      await toolExecutor({
        name: part.tool,
        input: part.state.input,
      });
    }
  }
}
```

**Pros:**
- OpenCode handles tool orchestration
- Groundswell observes tool executions

**Cons:**
- No control over tool execution
- Duplicate tool execution (OpenCode + Groundswell)
- Cannot customize tool behavior
- Groundswell's toolExecutor is ignored for actual execution

**Feasibility:** ⚠️ **Possible but defeats the purpose**

### 6.3 Approach C: Provider Replacement

**Strategy:** Skip OpenCodeProvider, use direct provider SDKs (OpenAI, Anthropic, Google).

**Pros:**
- Full tool execution control
- Matches AnthropicProvider pattern
- Clean architecture

**Cons:**
- Loses OpenCode's multi-provider benefit
- Must implement each provider separately
- More code to maintain

**Feasibility:** ✅ **Viable Alternative**

### 6.4 Approach D: Vercel AI SDK + MCP Adapters

**Strategy:** Use Vercel AI SDK as underlying multi-provider engine with LangChain MCP adapters.

**Pros:**
- 17+ providers supported
- Full tool execution control
- Native TypeScript support
- Can integrate with Groundswell MCPHandler

**Cons:**
- Additional dependency
- Different API than OpenCode
- May require adapter layer

**Feasibility:** ✅ **Recommended Alternative**

---

## 7. Recommended Implementation Strategy

### 7.1 Strategy: LLM-Only Hybrid Approach

**Decision:** Implement OpenCodeProvider as an **LLM-only provider** with explicit tool execution delegation disabled.

**Rationale:**

1. **Architectural Alignment:**
   - Respects the Provider interface's `toolExecutor` contract
   - Maintains consistency with AnthropicProvider pattern
   - Allows Groundswell to control tool execution

2. **Pragmatic Compromise:**
   - OpenCode provides value through multi-provider LLM access (75+ providers)
   - Groundswell provides value through unified tool management
   - Clear separation of concerns

3. **Implementation Feasibility:**
   - Technically possible to disable tools in OpenCode
   - Meets PRD requirements for multi-provider support
   - Enables future enhancement if OpenCode adds delegation support

### 7.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Groundswell Agent                       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Anthropic  │  │   OpenCode   │  │ Future Provider │   │
│  │  Provider   │  │   Provider   │  │                 │   │
│  │             │  │              │  │                 │   │
│  │ - Full SDK  │  │ - LLM Only   │  │ - Full SDK     │   │
│  │ - Tools     │  │ - No Tools   │  │ - Tools        │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                │                    │             │
│         └────────────────┼────────────────────┘             │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │ MCPHandler  │                           │
│                   │             │                           │
│                   │ - Tool      │                           │
│                   │   Registry  │                           │
│                   │ - Execute   │                           │
│                   └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Capability Declaration

```typescript
export class OpenCodeProvider implements Provider {
  readonly id: ProviderId = "opencode";

  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections - DISABLED (LLM-only mode) */
    mcp: false,  // ← Changed from true to false

    /** Skill loading - via system prompt injection */
    skills: true,

    /** LSP integration - Not available in LLM-only mode */
    lsp: false,  // ← Changed from true to false

    /** Streaming response support */
    streaming: true,

    /** Native session-based state management */
    sessions: true,

    /** Extended thinking via reasoning tokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;
}
```

---

## 8. Implementation Guidance

### 8.1 execute() Implementation (LLM-Only)

```typescript
async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,  // ← Accepted but NOT used
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  if (!this.client) {
    throw new Error("OpenCode not initialized. Call initialize() first.");
  }

  // Create or get session
  let sessionId = request.options.sessionId;
  if (!sessionId) {
    const session = await this.client.session.create({});
    sessionId = session.data.id;
  }

  // Build session prompt options
  const promptOptions: import("@opencode-ai/sdk").SessionPromptOptions = {
    body: {
      sessionID: sessionId,
      message: request.prompt,
      // CRITICAL: Disable all tools for LLM-only mode
      tools: {},  // Empty object = no tools enabled
      // Model specification (providerID/modelID format)
      ...(request.options.model && {
        model: parseOpenCodeModel(request.options.model),
      }),
      // System prompt (includes loaded skills)
      ...(request.options.systemPrompt && {
        system: request.options.systemPrompt,
      }),
    },
  };

  // Track start time
  const startTime = Date.now();

  // Execute prompt (tools are disabled)
  const result = await this.client.session.prompt(promptOptions);

  // Calculate duration
  const duration = Date.now() - startTime;

  // Extract response data
  const data = result.data as T;

  // Extract usage if available
  const usage = result.data?.tokens ? {
    input_tokens: result.data.tokens.input,
    output_tokens: result.data.tokens.output,
  } : undefined;

  // Invoke onSessionStart hook if provided
  if (hooks?.onSessionStart) {
    await hooks.onSessionStart();
  }

  // Invoke onSessionEnd hook if provided
  if (hooks?.onSessionEnd) {
    await hooks.onSessionEnd(duration);
  }

  // Return success response
  return createSuccessResponse(data, {
    agentId: this.id,
    timestamp: Date.now(),
    duration,
    usage,
    toolCalls: 0,  // No tool calls in LLM-only mode
  });
}

/**
 * Parse model string for OpenCode format
 *
 * Converts Groundswell model format to OpenCode's providerID/modelID format.
 *
 * @param model - Model string (e.g., "gpt-4" or "openai/gpt-4")
 * @returns OpenCode model specification
 */
function parseOpenCodeModel(model: string): {
  providerID: string;
  modelID: string;
} {
  // If already in providerID/modelID format
  if (model.includes('/')) {
    const [providerID, modelID] = model.split('/', 2);
    return { providerID, modelID };
  }

  // Map common models to their providers
  const modelProviderMap: Record<string, { providerID: string; modelID: string }> = {
    'gpt-4': { providerID: 'openai', modelID: 'gpt-4' },
    'gpt-4-turbo': { providerID: 'openai', modelID: 'gpt-4-turbo' },
    'claude-opus-4': { providerID: 'anthropic', modelID: 'claude-opus-4-20250514' },
    'claude-sonnet-4': { providerID: 'anthropic', modelID: 'claude-sonnet-4-20250514' },
    'gemini-pro': { providerID: 'google', modelID: 'gemini-pro' },
  };

  const mapped = modelProviderMap[model];
  if (mapped) {
    return mapped;
  }

  // Default to OpenCode's default provider
  return { providerID: 'anthropic', modelID: model };
}
```

### 8.2 registerMCPs() Implementation (No-Op)

```typescript
/**
 * Register MCP servers and return available tools
 *
 * NOTE: OpenCodeProvider operates in LLM-only mode.
 * MCP servers are managed by Groundswell's MCPHandler, not OpenCode.
 *
 * @param servers - Array of MCP server configurations (ignored)
 * @returns Empty array (no tools in LLM-only mode)
 * @remarks
 * This method is a no-op to satisfy the Provider interface.
 * Tools are executed via Groundswell's MCPHandler, not OpenCode.
 */
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // LLM-only mode: no tool registration
  // Tools are managed by Groundswell's MCPHandler
  return [];
}
```

### 8.3 loadSkills() Implementation (System Prompt)

```typescript
/**
 * Load skills into the provider
 *
 * Skills are converted to system prompt fragments for injection
 * during execute() calls. OpenCode has no native skills API.
 *
 * @param skills - Array of skill definitions to load
 * @remarks
 * Follows AnthropicProvider pattern: read SKILL.md from each skill
 * directory and combine into formatted system prompt fragment.
 */
async loadSkills(skills: Skill[]): Promise<void> {
  // PATTERN: Follow AnthropicProvider implementation
  // Read SKILL.md from each skill directory
  const skillContents: string[] = [];

  for (const skill of skills) {
    try {
      const skillMdPath = join(skill.path, 'SKILL.md');
      const content = await readFile(skillMdPath, 'utf-8');

      // Format skill with markdown header
      skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
    } catch (error) {
      throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Combine all skills with markdown separator
  this.skillsPrompt = skillContents.join('\n\n---\n\n');
}

/**
 * Build system prompt with skills injected
 *
 * @param baseSystemPrompt - Optional base system prompt to enhance
 * @returns Enhanced system prompt with skills section
 * @internal
 */
private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
  // Case 1: No skills loaded
  if (!this.skillsPrompt) {
    return baseSystemPrompt ?? '';
  }

  // Case 2: No base prompt
  if (!baseSystemPrompt) {
    return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
  }

  // Case 3: Both exist
  return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
`;
}
```

### 8.4 Documentation Updates

Update JSDoc comments to clarify LLM-only mode:

```typescript
/**
 * OpenCode provider implementation (LLM-Only Mode)
 *
 * Wraps the @opencode-ai/sdk to provide multi-provider LLM access
 * through the unified Provider interface.
 *
 * ## IMPORTANT: Tool Execution Limitation
 *
 * OpenCode executes tools server-side and does not support client-side
 * tool delegation. This provider operates in **LLM-only mode**:
 *
 * - ✅ Multi-provider LLM access (75+ providers)
 * - ✅ Session-based state management
 * - ✅ Extended thinking support
 * - ✅ Streaming responses
 * - ❌ NO TOOL EXECUTION (tools disabled)
 * - ❌ NO MCP INTEGRATION (managed by Groundswell)
 * - ❌ NO LSP INTEGRATION (server-side only)
 *
 * ## Architecture
 *
 * This provider is designed for scenarios where:
 * 1. You need multi-provider LLM access without tools
 * 2. Tools are managed separately via Groundswell's MCPHandler
 * 3. Two-pass execution: LLM planning + tool execution
 *
 * For full tool support, use AnthropicProvider or implement direct
 * provider integrations (OpenAI, Google, etc.).
 *
 * @example
 * ```ts
 * import { OpenCodeProvider } from 'groundswell';
 *
 * const provider = new OpenCodeProvider();
 * await provider.initialize();
 *
 * // LLM-only execution (no tools)
 * const result = await provider.execute(
 *   { prompt: 'Explain quantum computing', options: {} },
 *   toolExecutor  // ← Accepted but not used
 * );
 * ```
 */
```

### 8.5 Usage Example: Two-Pass Execution

```typescript
import { Agent } from 'groundswell';
import { OpenCodeProvider } from 'groundswell';

// Create agent with OpenCode provider (LLM-only)
const agent = new Agent({
  name: 'multi-provider-agent',
  provider: 'opencode',
  model: 'openai/gpt-4',  // Use OpenAI via OpenCode
  tools: [],  // No tools in OpenCode mode
});

// First pass: Generate execution plan
const plan = await agent.prompt(
  'Create a plan to read file.txt and summarize its contents',
  { outputFormat: 'json' }
);

// Second pass: Execute plan using tools (via Anthropic provider)
const anthropicAgent = new Agent({
  name: 'tool-execution-agent',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  tools: ['filesystem', 'editor'],
});

const result = await anthropicAgent.prompt(
  `Execute this plan: ${plan.data}`
);
```

---

## 9. Alternative Strategies

### 9.1 Alternative A: Skip OpenCodeProvider

If LLM-only mode is insufficient:

1. **Remove OpenCodeProvider** from provider registry
2. **Implement direct providers** for needed models:
   - `OpenAIProvider` (openai SDK)
   - `GoogleProvider` (@google-cloud/vertexai)
   - `CohortProvider` (cohere-ai SDK)
3. **Use Vercel AI SDK** for unified multi-provider access

### 9.2 Alternative B: Use OpenCode as Plugin

Implement OpenCode as an optional plugin rather than core provider:

1. **Create `@groundswell/opencode-plugin`**
2. **Document server requirement** clearly
3. **Provide observe-only tool execution**
4. **Opt-in installation** (not default)

### 9.3 Alternative C: Wait for OpenCode SDK Enhancement

Monitor OpenCode SDK updates for:
- Client-side tool execution API
- Tool handler registration
- Callback-based tool delegation

**Note:** This would require architectural changes to Provider interface or special handling.

---

## 10. Decision Matrix

| Approach | Tool Control | Multi-Provider | Complexity | Recommendation |
|----------|--------------|----------------|------------|----------------|
| **LLM-Only Hybrid** | None (by design) | ✅ 75+ | Low | ✅ **RECOMMENDED** |
| **Tool Observation** | Observation only | ✅ 75+ | Medium | ⚠️ Limited value |
| **Provider Replacement** | ✅ Full control | ❌ 1 per provider | High | ✅ Viable |
| **Vercel AI SDK** | ✅ Full control | ✅ 17+ | Medium | ✅ Recommended alternative |
| **Skip OpenCode** | N/A | N/A | N/A | ⚠️ Loses benefit |

---

## 11. Key Takeaways

1. **OpenCode executes tools server-side** - no client-side delegation possible
2. **Permission system is for approval, not custom execution**
3. **Events are observational, not actionable**
4. **LLM-only mode is the only viable implementation**
5. **Document limitations clearly** in JSDoc and user-facing docs
6. **Consider Vercel AI SDK as alternative** for multi-provider + tools

---

## 12. Sources

### Primary Sources

1. **NPM Package:** `@opencode-ai/sdk@1.1.36`
   - URL: https://www.npmjs.com/package/@opencode-ai/sdk
   - TypeScript Definitions: `/dist/gen/sdk.gen.d.ts`, `/dist/gen/types.gen.d.ts`

2. **OpenCode SDK Complete Research**
   - File: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md`
   - Comprehensive API documentation

3. **OpenCode Initialization Research**
   - File: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/opencode-initialization-research.md`
   - Client-server architecture patterns

4. **Provider Type Definitions**
   - File: `/home/dustin/projects/groundswell/src/types/providers.ts`
   - Provider interface requirements

5. **AnthropicProvider Implementation**
   - File: `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
   - Reference implementation for tool delegation

6. **External Dependencies Documentation**
   - File: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md`
   - SDK integration patterns

### Code References

- Current OpenCodeProvider stub: `/home/dustin/projects/groundswell/src/providers/opencode-provider.ts`
- MCPHandler: `/home/dustin/projects/groundswell/src/core/mcp-handler.ts`
- Agent class: `/home/dustin/projects/groundswell/src/core/agent.ts`

---

**End of Research Report**

Generated: 2026-01-25
Task: P3.M2.T1.S3 - Research tool execution delegation for OpenCodeProvider
Status: Complete - Ready for implementation

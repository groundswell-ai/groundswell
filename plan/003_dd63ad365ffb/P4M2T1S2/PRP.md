# Product Requirement Prompt (PRP): Create Tool Executor for Provider Delegation

## Goal

**Feature Goal**: Implement an async `toolExecutor` method in the Agent class that delegates tool execution requests from providers back to the Agent's MCPHandler.

**Deliverable**: A private async method `toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult>` in the Agent class that:
1. Receives tool execution requests from providers via the ToolExecutor callback signature
2. Delegates execution to the Agent's MCPHandler instances
3. Wraps results in the ToolExecutionResult format required by providers

**Success Definition**:
- The Agent class can pass this toolExecutor to provider.execute() calls
- Providers can successfully delegate tool execution back to the Agent
- Tool names using the `serverName__toolName` format are correctly routed to MCPHandler
- Results are returned in the correct ToolExecutionResult format
- Error handling matches existing MCPHandler.executeTool() patterns

## User Persona (if applicable)

**Target User**: Groundswell framework developers implementing provider integration.

**Use Case**: When a provider (AnthropicProvider, OpenCodeProvider) needs to execute a tool during LLM inference, it must delegate the execution back to the Agent's MCPHandler rather than managing its own tool registry.

**User Journey**:
1. Developer creates an Agent with MCP servers registered
2. Agent calls provider.execute() with a toolExecutor callback
3. Provider receives tool use requests from the LLM
4. Provider invokes toolExecutor({ name: 'server__tool', input: {...} })
5. Agent delegates to MCPHandler.executeTool()
6. Result is returned to provider in ToolExecutionResult format

**Pain Points Addressed**:
- Centralized tool management through Agent's MCPHandler
- Providers don't need to duplicate tool registration logic
- Consistent tool execution across all providers

## Why

- **Provider Integration**: Providers delegate tool execution to maintain separation of concerns (LLM logic vs tool execution)
- **PRD Section 7.10**: Tools are executed locally via MCPHandler regardless of provider
- **Centralized Management**: Single source of truth for tool registration and execution in the Agent
- **Flexibility**: Different providers can use the same tool executor without implementing their own MCP handling

## What

Implement a private async method in the Agent class:

```typescript
private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
  // 1. Parse tool name (serverName__toolName format)
  // 2. Delegate to this.mcpHandler.executeTool(fullName, req.input)
  // 3. Wrap result in ToolExecutionResult format
}
```

The method will be passed to provider.execute() calls in future tasks (P4.M2.T1.S3, P4.M2.T1.S4).

### Success Criteria

- [ ] Async method `toolExecutor` defined in Agent class
- [ ] Accepts ToolExecutionRequest parameter (name: string, input: unknown)
- [ ] Returns Promise<ToolExecutionResult> (content: string | unknown, isError: boolean)
- [ ] Delegates to this.mcpHandler.executeTool() with full tool name
- [ ] Handles errors by setting isError: true in result
- [ ] Supports delegated MCPHandlers (this.mcpHandlers array)

## All Needed Context

### Context Completeness Check

**Before writing this PRP, validate**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Validation Result**: ✅ PASS - This PRP provides:
- Exact file path to modify (src/core/agent.ts)
- Complete type definitions from src/types/providers.ts
- MCPHandler.executeTool() reference implementation
- Existing async patterns in Agent class
- Tool naming convention (serverName__toolName)
- Error handling patterns to follow

### Documentation & References

```yaml
# MUST READ - Include these in your context window

- url: https://www.typescriptlang.org/docs/handbook/2/functions.html#async-await
  why: TypeScript async/await patterns for Promise return types
  critical: Always use explicit Promise<T> return types for public/private async methods

- url: https://basarat.gitbook.io/typescript/async-await
  why: Common async/await pitfalls and error handling patterns
  critical: Use try/catch blocks with instanceof checks for Error objects

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: ToolExecutor, ToolExecutionRequest, and ToolExecutionResult type definitions
  pattern: Lines 167-169 (ToolExecutor), 55-61 (ToolExecutionRequest), 66-72 (ToolExecutionResult)
  gotcha: ToolExecutionResult uses content: string | unknown (not ToolResult type)

- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Agent class implementation - add toolExecutor method here
  pattern: Lines 104-148 (constructor with MCPHandler initialization), 83-86 (mcpHandler and mcpHandlers fields)
  gotcha: Agent has TWO MCPHandler sources: this.mcpHandler (main) and this.mcpHandlers[] (delegated)

- file: /home/dustin/projects/groundswell/src/core/mcp-handler.ts
  why: Reference implementation for tool execution delegation
  pattern: Lines 116-146 (executeTool method with error handling)
  critical: MCPHandler.executeTool() returns ToolResult, not ToolExecutionResult - need to convert

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: How providers receive and use toolExecutor callback
  pattern: Lines 243-246 (execute() signature with toolExecutor parameter)
  gotcha: Providers use toolExecutor in hooks or SDK callbacks, not directly in execute() body

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/typescript-generic-execute-patterns.md
  why: Generic async execute patterns used in provider implementations
  section: Tool Executor Callback Pattern section

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/subtasks/P1M1T1S3/research/error-handling-patterns.md
  why: Error handling patterns for async functions
  section: Error Handling in Async Functions

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/mcp-handler-tool-execution-research.md
  why: MCPHandler tool execution research with architecture details
  section: Tool Execution Flow section
```

### Current Codebase Tree (Relevant Sections)

```bash
src/
├── core/
│   ├── agent.ts              # MODIFY: Add toolExecutor method here
│   └── mcp-handler.ts         # REFERENCE: executeTool() implementation
├── types/
│   ├── providers.ts          # REFERENCE: ToolExecutor, ToolExecutionRequest, ToolExecutionResult
│   └── agent.ts              # REFERENCE: AgentResponse and error handling patterns
└── providers/
    ├── anthropic-provider.ts # REFERENCE: How providers use toolExecutor
    └── opencode-provider.ts  # REFERENCE: LLM-only mode (toolExecutor not used)
```

### Desired Codebase Tree (Changes)

```bash
src/
└── core/
    └── agent.ts              # MODIFY: Add private async toolExecutor() method
        # Line ~148 (after constructor): Add toolExecutor method
        # Method signature: private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult>
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Tool name format is serverName__toolName (double underscore)
// MCPHandler.registerServer() creates full names: `${server.name}__${tool.name}`
// Example: 'filesystem__read_file', 'database__query'
// Do NOT split or parse the name - pass it directly to MCPHandler

// CRITICAL: MCPHandler.executeTool() returns ToolResult, NOT ToolExecutionResult
// ToolResult: { type: 'tool_result', tool_use_id: string, content: string, is_error?: boolean }
// ToolExecutionResult: { content: string | unknown, isError: boolean }
// Must convert: result.is_error → isError, result.content → content

// CRITICAL: Agent has TWO MCPHandler sources to check
// 1. this.mcpHandler (main handler) - primary tool registry
// 2. this.mcpHandlers[] (delegated handlers) - from MCPHandler instances in config.mcps
// Tool execution must check BOTH sources (handlers first, then main)

// CRITICAL: Use try/catch with instanceof checks for Error objects
// Pattern: error instanceof Error ? error.message : 'Unknown error'
// Follow src/core/agent.ts:641 pattern for error handling

// CRITICAL: Always return Promise<T> with explicit type parameter
// Method signature must be: async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult>
// Follow src/core/agent.ts:156-160 pattern (async prompt<T>() method)

// GOTCHA: MCPHandler.executeTool() never throws - returns error result with is_error: true
// Still use try/catch for defensive programming and any unexpected errors
// Follow src/core/mcp-handler.ts:130-146 pattern
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed - use existing types:

```typescript
// From src/types/providers.ts (lines 55-72)
interface ToolExecutionRequest {
  name: string;     // Full tool name (serverName__toolName format)
  input: unknown;   // Tool input parameters
}

interface ToolExecutionResult {
  content: string | unknown;  // Result content
  isError: boolean;           // Error flag
}

// Type signature for tool executor
type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: ADD toolExecutor method to Agent class
  - LOCATION: src/core/agent.ts after constructor (line ~148)
  - IMPLEMENT: private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult>
  - SIGNATURE: Match ToolExecutor type from src/types/providers.ts:167-169
  - NAMING: Private method (not exported)
  - PLACEMENT: After constructor, before prompt() method

Task 2: IMPLEMENT tool name handling
  - INPUT: req.name from ToolExecutionRequest
  - PATTERN: Use full tool name directly (serverName__toolName format)
  - GOTCHA: Do NOT parse or split the name - MCPHandler expects full format
  - DEPENDENCIES: None

Task 3: IMPLEMENT MCPHandler delegation
  - DELEGATE: Check this.mcpHandlers[] first, then this.mcpHandler
  - PATTERN: Follow src/core/agent.ts:242-249 pattern (building mcpServers for SDK)
  - LOGIC:
    1. Loop through this.mcpHandlers and check hasTool(toolName)
    2. If found, executeTool() and return result
    3. If not found, check this.mcpHandler.hasTool(toolName)
    4. If found in main handler, executeTool() and return result
    5. If not found anywhere, return error result
  - DEPENDENCIES: Task 2

Task 4: IMPLEMENT result conversion
  - INPUT: ToolResult from MCPHandler.executeTool()
  - CONVERT: { type: 'tool_result', content: string, is_error?: boolean }
  - OUTPUT: { content: string | unknown, isError: boolean }
  - MAPPING:
    - result.content → content (unchanged)
    - result.is_error → isError (if undefined, default to false)
  - GOTCHA: ToolResult has tool_use_id field - ignore it (not needed for providers)
  - DEPENDENCIES: Task 3

Task 5: IMPLEMENT error handling
  - PATTERN: try/catch block following src/core/agent.ts:639-648
  - ERROR CHECK: error instanceof Error ? error.message : 'Unknown error'
  - RETURN: ToolExecutionResult with isError: true on error
  - GOTCHA: MCPHandler.executeTool() doesn't throw, but use try/catch for safety
  - DEPENDENCIES: Task 4

Task 6: ADD JSDoc documentation
  - DOCUMENT: Purpose, parameters, return type, delegation flow
  - PATTERN: Follow existing Agent method JSDoc (lines 150-155, 163-169)
  - INCLUDE: Tool name format note (serverName__toolName)
  - INCLUDE: Dual MCPHandler source note
  - DEPENDENCIES: Task 5
```

### Implementation Patterns & Key Details

```typescript
// Show critical patterns and gotchas - keep concise

// Pattern 1: Method signature (follow src/types/providers.ts:167-169)
private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
  // Implementation
}

// Pattern 2: Dual MCPHandler source checking (follow src/core/agent.ts:242-249)
// Check delegated handlers first (preserve custom executors)
for (const handler of this.mcpHandlers) {
  if (handler.hasTool(req.name)) {
    const toolResult = await handler.executeTool(req.name, req.input);
    return this.convertToToolExecutionResult(toolResult);
  }
}

// Then check main handler
if (this.mcpHandler.hasTool(req.name)) {
  const toolResult = await this.mcpHandler.executeTool(req.name, req.input);
  return this.convertToToolExecutionResult(toolResult);
}

// Pattern 3: Result conversion (ToolResult → ToolExecutionResult)
private convertToToolExecutionResult(toolResult: {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}): ToolExecutionResult {
  return {
    content: toolResult.content,
    isError: toolResult.is_error ?? false,  // Default to false if undefined
  };
}

// Pattern 4: Error handling (follow src/core/agent.ts:639-648)
try {
  // Tool execution
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    content: `Tool execution error: ${message}`,
    isError: true,
  };
}

// Pattern 5: Tool not found handling (follow src/core/mcp-handler.ts:121-128)
if (!this.mcpHandler.hasTool(req.name)) {
  return {
    content: `Tool '${req.name}' not found`,
    isError: true,
  };
}
```

### Integration Points

```yaml
AGENT_CLASS:
  - file: src/core/agent.ts
  - location: After constructor (line ~148), before prompt() method
  - access: Uses this.mcpHandler and this.mcpHandlers[] (private fields)
  - visibility: Private method (not exported)

TYPE_IMPORTS:
  - add: import type { ToolExecutionRequest, ToolExecutionResult } from '../types/providers.js'
  - location: Line 50 (after existing Provider imports)
  - gotcha: Use type-only imports (import type)

PROVIDER_INTEGRATION:
  - usage: Pass this.toolExecutor to provider.execute() in future tasks (P4.M2.T1.S3, P4.M2.T1.S4)
  - method: this.provider.execute(request, this.toolExecutor, hooks)
  - note: Method signature matches ToolExecutor type from providers.ts
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after adding toolExecutor method - fix before proceeding
npx tsc --noEmit src/core/agent.ts           # Type check specific file
npm run lint                                  # Project linting
npm run format                                # Auto-format

# Expected: Zero type errors, zero linting errors
# If errors exist, READ output and fix before proceeding
```

### Level 2: Unit Tests (Component Validation)

```bash
# Create test file for toolExecutor
# Path: src/__tests__/unit/agent-tool-executor.test.ts

# Test structure:
describe('Agent.toolExecutor', () => {
  it('should delegate to MCPHandler for registered tools', async () => {
    // Test: Tool execution through main handler
  });

  it('should delegate to mcpHandlers for delegated tools', async () => {
    // Test: Tool execution through delegated handlers
  });

  it('should return error result for unregistered tools', async () => {
    // Test: Tool not found scenario
  });

  it('should convert ToolResult to ToolExecutionResult format', async () => {
    // Test: Result format conversion
  });

  it('should handle errors gracefully', async () => {
    // Test: Error handling with try/catch
  });
});

# Run tests
npm test -- src/__tests__/unit/agent-tool-executor.test.ts

# Expected: All tests pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Test with actual provider (after P4.M2.T1.S3 implementation)
# File: src/__tests__/integration/provider-tool-execution.test.ts

describe('Provider Tool Execution Integration', () => {
  it('should execute tools via Agent.toolExecutor', async () => {
    const agent = new Agent({
      mcps: [{
        name: 'test-server',
        transport: 'inprocess',
        tools: [{
          name: 'echo',
          description: 'Echo input',
          input_schema: {
            type: 'object',
            properties: { message: { type: 'string' } },
            required: ['message']
          }
        }]
      }]
    });

    // Register tool executor
    agent.registerToolExecutor('test-server', 'echo', async (input) => input);

    // Test tool execution (will be implemented in P4.M2.T1.S3)
    // const result = await agent.toolExecutor({
    //   name: 'test-server__echo',
    //   input: { message: 'hello' }
    // });
    // expect(result.isError).toBe(false);
    // expect(result.content).toEqual({ message: 'hello' });
  });

  it('should handle tool name format correctly', async () => {
    // Test serverName__toolName format
  });

  it('should delegate to correct MCPHandler instance', async () => {
    // Test dual MCPHandler source routing
  });
});

# Run integration tests
npm test -- src/__tests__/integration/provider-tool-execution.test.ts

# Expected: All integration tests pass
```

### Level 4: Provider Integration Validation

```bash
# This validation will be performed in P4.M2.T1.S3 (refactor Agent.prompt())
# Test toolExecutor with actual provider execution

# Manual test (after P4.M2.T1.S3):
node -e "
import { Agent } from './src/index.js';

const agent = new Agent({
  mcps: [{
    name: 'demo',
    transport: 'inprocess',
    tools: [{
      name: 'test',
      description: 'Test tool',
      input_schema: { type: 'object', properties: {} }
    }]
  }]
});

// Register tool executor
agent.getMcpHandler().registerToolExecutor('demo', 'test', async (input) => {
  return { result: 'success' };
});

// Test toolExecutor (will be private in implementation)
// For testing, you may need to expose it temporarily or test through provider
console.log('Agent tool executor ready for provider integration');
"

# Expected: No errors, toolExecutor callable by provider
```

## Final Validation Checklist

### Technical Validation

- [ ] Method signature matches ToolExecutor type exactly
- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] No linting errors: `npm run lint`
- [ ] Code formatted: `npm run format`
- [ ] JSDoc documentation complete
- [ ] All unit tests pass
- [ ] Integration tests pass (when implemented)

### Feature Validation

- [ ] Accepts ToolExecutionRequest with name and input
- [ ] Returns Promise<ToolExecutionResult> with content and isError
- [ ] Delegates to this.mcpHandlers[] first (delegated handlers)
- [ ] Falls back to this.mcpHandler (main handler)
- [ ] Converts ToolResult to ToolExecutionResult format
- [ ] Returns error result for unregistered tools
- [ ] Handles errors gracefully with try/catch
- [ ] Preserves serverName__toolName format (no parsing)

### Code Quality Validation

- [ ] Follows existing async method patterns in Agent class
- [ ] Error handling matches src/core/agent.ts:639-648 pattern
- [ ] Result conversion matches src/core/mcp-handler.ts:130-146 pattern
- [ ] Dual MCPHandler source checking matches src/core/agent.ts:242-249 pattern
- [ ] JSDoc follows existing documentation style
- [ ] No console.log or debug statements
- [ ] Type imports use `import type` syntax

### Integration Readiness

- [ ] Method ready to be passed to provider.execute() in P4.M2.T1.S3
- [ ] Tool name format compatible with MCPHandler registration
- [ ] Error format compatible with provider expectations
- [ ] No dependencies on provider implementation details

---

## Anti-Patterns to Avoid

- ❌ **Don't parse or split tool names** - MCPHandler expects full `serverName__toolName` format
- ❌ **Don't create new MCPHandler instances** - Use existing this.mcpHandler and this.mcpHandlers[]
- ❌ **Don't throw errors** - Return ToolExecutionResult with isError: true instead
- ❌ **Don't ignore delegated handlers** - Check this.mcpHandlers[] before this.mcpHandler
- ❌ **Don't use sync functions** - Must be async and return Promise<ToolExecutionResult>
- ❌ **Don't skip instanceof checks** - Always check `error instanceof Error` before accessing error properties
- ❌ **Don't forget type imports** - Add `import type { ToolExecutionRequest, ToolExecutionResult }`
- ❌ **Don't expose as public method** - Should be private (internal delegation only)

---

## Example Implementation

```typescript
// In src/core/agent.ts (after constructor, ~line 148)

/**
 * Execute tool via MCPHandler delegation
 *
 * This method implements the ToolExecutor callback signature for provider
 * integration. Providers delegate tool execution back to the Agent's
 * MCPHandler, maintaining centralized tool management.
 *
 * Tool names use the serverName__toolName format (double underscore)
 * created during MCP server registration. The full name is passed
 * directly to MCPHandler without parsing.
 *
 * ## Tool Resolution Order
 *
 * 1. Delegated handlers (this.mcpHandlers[]) - Custom MCPHandler instances
 * 2. Main handler (this.mcpHandler) - Primary tool registry
 *
 * ## Error Handling
 *
 * Tool errors are returned in ToolExecutionResult format with isError: true.
 * The method never throws - errors are wrapped in result objects.
 *
 * @param req - Tool execution request with name (serverName__toolName) and input
 * @returns Promise resolving to tool execution result with content and error flag
 * @private
 * @remarks
 * Used internally by provider.execute() for tool delegation.
 * Tool execution flow: Provider → Agent.toolExecutor → MCPHandler.executeTool()
 */
private async toolExecutor(req: ToolExecutionRequest): Promise<ToolExecutionResult> {
  try {
    // Check delegated MCPHandlers first (preserve custom executors)
    for (const handler of this.mcpHandlers) {
      if (handler.hasTool(req.name)) {
        const toolResult = await handler.executeTool(req.name, req.input);
        return this.convertToToolExecutionResult(toolResult);
      }
    }

    // Check main MCPHandler
    if (this.mcpHandler.hasTool(req.name)) {
      const toolResult = await this.mcpHandler.executeTool(req.name, req.input);
      return this.convertToToolExecutionResult(toolResult);
    }

    // Tool not found in any handler
    return {
      content: `Tool '${req.name}' not found`,
      isError: true,
    };
  } catch (error) {
    // Handle unexpected errors (defensive programming)
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: `Tool execution error: ${message}`,
      isError: true,
    };
  }
}

/**
 * Convert MCPHandler ToolResult to ToolExecutionResult
 *
 * Maps the MCPHandler's internal ToolResult format to the
 * provider-facing ToolExecutionResult format.
 *
 * @param toolResult - Result from MCPHandler.executeTool()
 * @returns ToolExecutionResult with content and isError flag
 * @private
 */
private convertToToolExecutionResult(toolResult: {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}): ToolExecutionResult {
  return {
    content: toolResult.content,
    isError: toolResult.is_error ?? false,
  };
}
```

---

## Confidence Score

**Overall Confidence: 9/10**

**Rationale**:
- ✅ Complete type definitions available (ToolExecutionRequest, ToolExecutionResult)
- ✅ Reference implementation exists (MCPHandler.executeTool)
- ✅ Async patterns well-established in Agent class
- ✅ Tool naming convention clearly defined
- ✅ Error handling patterns documented
- ⚠️ Minor uncertainty: Integration with providers not yet tested (will be validated in P4.M2.T1.S3)

**Risk Mitigation**:
- Comprehensive unit tests will validate behavior
- Integration tests in P4.M2.T1.S3 will verify provider compatibility
- Error handling follows proven patterns from existing code

---

## Appendix: Quick Reference

### Type Definitions

```typescript
// ToolExecutionRequest (src/types/providers.ts:55-61)
interface ToolExecutionRequest {
  name: string;     // Full tool name (serverName__toolName)
  input: unknown;   // Tool parameters
}

// ToolExecutionResult (src/types/providers.ts:66-72)
interface ToolExecutionResult {
  content: string | unknown;  // Result content
  isError: boolean;           // Error flag
}

// ToolExecutor callback type (src/types/providers.ts:167-169)
type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

### MCPHandler.executeTool() Signature

```typescript
// From src/core/mcp-handler.ts:116-146
async executeTool(toolName: string, input: unknown): Promise<{
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}>
```

### Key Files

1. **src/core/agent.ts** - Add toolExecutor method here
2. **src/types/providers.ts** - Type definitions
3. **src/core/mcp-handler.ts** - Reference implementation
4. **src/providers/anthropic-provider.ts** - Provider usage pattern

---

**PRP Version: 1.0**
**Last Updated: 2026-01-26**
**Status: Ready for Implementation**

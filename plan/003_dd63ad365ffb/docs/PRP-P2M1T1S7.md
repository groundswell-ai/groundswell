# Product Requirement Prompt (PRP): Implement AnthropicProvider registerMCPs() Method

**Work Item:** P2.M1.T1.S7 - Implement registerMCPs() method
**PRD Version:** 1.1
**Plan ID:** 003_dd63ad365ffb
**Status:** Ready for Implementation
**Created:** 2026-01-25

---

## Goal

**Feature Goal**: Implement the `registerMCPs()` method in the AnthropicProvider class to register MCP (Model Context Protocol) servers and convert their tools to Agent SDK format for use in `execute()`.

**Deliverable**: A fully implemented `registerMCPs()` method in `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` that:
1. Creates and manages an internal MCPHandler instance
2. Registers MCPServer[] configurations with the handler
3. Returns Tool[] array in MCP format (not SDK format)
4. Stores converted SDK server configuration for use in execute()
5. Handles errors gracefully and validates SDK initialization

**Success Definition**:
- `registerMCPs()` accepts MCPServer[] and registers them with MCPHandler
- Returns Tool[] array with tools in MCP format (name, description, input_schema)
- Converts tools to SDK format and stores for use in execute()
- SDK initialization is validated before registration
- Method follows existing idempotent and error handling patterns
- All existing tests continue to pass
- New tests validate MCP registration behavior

---

## Why

- **MCP Integration**: This method enables the Provider to register MCP servers whose tools will be available during Agent execution, fulfilling the `mcp: true` capability
- **SDK Bridge**: Converts MCP Tool format to Agent SDK Tool format, storing SDK server config for the execute() method to use
- **Tool Discovery**: Returns discovered tools in MCP format for the Agent to query and validate available tools
- **Provider Contract**: Fulfills the Provider interface requirement for MCP server registration capability
- **Separation of Concerns**: MCPHandler handles tool conversion and execution; Provider manages SDK integration

---

## What

Implement the `registerMCPs()` method in AnthropicProvider with the following behavior:

### Input
- `servers: MCPServer[]` - Array of MCP server configurations with:
  - `name: string` - Server identifier
  - `transport: 'stdio' | 'inprocess'` - Transport type
  - `command?: string` - Command for stdio transport
  - `args?: string[]` - Arguments for stdio command
  - `tools?: Tool[]` - Tools provided by this server
  - `env?: Record<string, string>` - Environment variables

### Logic
1. **SDK Validation**: Check `this.sdk` is initialized (throw if not)
2. **MCPHandler Creation**: Create private MCPHandler instance if not exists
3. **Server Registration**: Register each MCPServer with MCPHandler
4. **SDK Conversion**: Convert MCPHandler to SDK format via `toAgentSDKServer()`
5. **Store SDK Config**: Store converted McpServerConfig for use in execute()
6. **Return Tools**: Return Tool[] in MCP format (NOT SDK format)

### Output
- Returns `Promise<Tool[]>` - Array of discovered tools in MCP format
- SDK server config stored internally for execute() to use

### Success Criteria
- [ ] SDK initialization is validated before registration
- [ ] MCPServer[] are registered with internal MCPHandler
- [ ] Tools are returned in MCP format (Tool interface)
- [ ] SDK server config is stored for execute() method
- [ ] Method follows idempotent and error handling patterns
- [ ] Compatible with future execute() integration
- [ ] Tests cover registration, tool discovery, and error cases

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: ✅ YES - This PRP provides:
- Exact file location and existing class structure with stub method
- Complete type definitions for MCPServer, Tool, and SDK types
- Existing MCPHandler class with all conversion patterns
- Specific Agent SDK import patterns and createSdkMcpServer usage
- Test patterns from existing provider tests
- Integration points with execute() method
- Naming conventions and file organization standards

### Documentation & References

```yaml
# MUST READ - Implementation Guidance

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Target file containing the registerMCPs() stub method (lines 326-329)
  pattern: Observe existing class structure, private sdk field, method signatures
  gotcha: Class has no MCPHandler field yet - must add private field for handler
  critical: Lines 326-329 show current stub: return [];

- file: /home/dustin/projects/groundswell/src/core/mcp-handler.ts
  why: Complete MCPHandler implementation with server registration and SDK conversion
  pattern: registerServer(), getTools(), toAgentSDKServer() methods (lines 52-213)
  gotcha: toAgentSDKServer() returns McpServerConfig | null (null if no tools)
  critical: Lines 167-213 show complete SDK conversion pattern

- file: /home/dustin/projects/groundswell/src/types/sdk-primitives.ts
  why: MCPServer and Tool interface definitions
  pattern: Tool has name, description, input_schema (lines 10-24)
  gotcha: input_schema uses JSON Schema format
  critical: Lines 10-42 define MCPServer and Tool interfaces

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Provider interface definition showing registerMCPs() signature
  pattern: registerMCPs(servers: MCPServer[]): Promise<Tool[]>
  gotcha: Returns Tool[] in MCP format, NOT SDK format
  critical: Line 481 defines registerMCPs() method signature

- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  why: Reference test patterns for provider method testing
  pattern: Describe blocks, beforeEach hooks, @ts-expect-error for private access
  gotcha: Tests use ProviderRegistry._resetForTesting() for isolation
  critical: Lines 21-28 show test setup pattern

- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: Agent SDK documentation for createSdkMcpServer and tool() functions
  section: "API Reference"
  critical: SDK exports createSdkMcpServer, tool, McpServerConfig types

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/sdk-tool-integration.md
  why: Research on SDK MCP integration patterns
  section: "MCP Server Conversion" (lines 167-213)
  gotcha: tool() expects ZodRawShape, not ZodObject
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── package.json                          # SDK dependency: @anthropic-ai/claude-agent-sdk@^0.1.0
├── src/
│   ├── providers/
│   │   ├── anthropic-provider.ts         # TARGET: Implement registerMCPs() (lines 326-329)
│   │   ├── provider-registry.ts          # Reference: Provider lifecycle patterns
│   │   └── index.ts
│   ├── types/
│   │   ├── providers.ts                  # Provider interface with registerMCPs() signature
│   │   ├── agent.ts                      # AgentResponse types
│   │   └── sdk-primitives.ts             # Tool, MCPServer interfaces
│   ├── core/
│   │   ├── agent.ts                      # Reference: SDK MCP usage patterns
│   │   └── mcp-handler.ts                # MCPHandler class for server management
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── anthropic-provider-initialize.test.ts  # Test patterns
│               └── anthropic-provider.test.ts
└── plan/
    └── 003_dd63ad365ffb/
        ├── P2M1T1S7/
        │   ├── PRP.md                    # THIS FILE
        │   └── research/
        │       └── mcp_registration_research.md  # Research findings
        └── docs/
            └── research/
                └── sdk-tool-integration.md  # SDK MCP patterns
```

### Desired Codebase Tree (No New Files)

```bash
# No new files - this task modifies existing file:
src/providers/anthropic-provider.ts
├── private mcpHandler: MCPHandler = new MCPHandler();  # ADD: Private field
├── private mcpServerConfig: McpServerConfig | null = null;  # ADD: Stored SDK config
└── async registerMCPs(servers: MCPServer[]): Promise<Tool[]>  # IMPLEMENT THIS METHOD
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: SDK must be initialized before registerMCPs()
// Pattern from execute() method (line 197-199):
// if (!this.sdk) { throw new Error("SDK not initialized. Call initialize() first."); }
// MUST include this check at start of registerMCPs()

// CRITICAL: MCPHandler.toAgentSDKServer() returns McpServerConfig | null
// If no tools registered, returns null (not undefined)
// FROM: mcp-handler.ts lines 168-171
// if (tools.length === 0) { return null; }

// CRITICAL: Return type is Tool[] in MCP format, NOT SDK format
// Provider interface specifies: Promise<Tool[]>
// Tool interface: { name, description, input_schema } (JSON Schema)
// SDK format: SdkMcpToolDefinition with ZodRawShape and handler
// Use MCPHandler.getTools() to get MCP format tools

// CRITICAL: Store SDK config for execute() method
// execute() method will use this config in sdkOptions.mcpServers
// Store as private field: mcpServerConfig: McpServerConfig | null = null
// FROM: agent.ts lines 397-418 shows mcpServers usage pattern

// CRITICAL: Tool naming convention: serverName__toolName
// MCPHandler automatically prefixes tool names (line 62)
// This prevents collisions when multiple servers have same-named tools

// CRITICAL: createSdkMcpServer imported from SDK
// FROM: mcp-handler.ts line 9
// import { createSdkMcpServer, tool as sdkTool, type McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

// CRITICAL: ZodRawShape vs ZodObject (from research)
// tool() function expects plain object with Zod values
// WRONG: tool("name", "desc", z.object({ ... }), handler)
// CORRECT: tool("name", "desc", { field: z.string() }, handler)

// CRITICAL: MCPHandler.jsonSchemaToZodRawShape handles conversion
// Don't reimplement - use MCPHandler.toAgentSDKServer() which handles conversion
// FROM: mcp-handler.ts lines 219-247

// CRITICAL: Import MCPHandler class
// Add import: import { MCPHandler } from '../core/mcp-handler.js';
// Add to existing imports section

// CRITICAL: Add McpServerConfig type import
// Add to SDK type imports: type McpServerConfig = import('@anthropic-ai/claude-agent-sdk').McpServerConfig;
// Or import from SDK: import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - using existing types:

```typescript
// From src/types/sdk-primitives.ts (lines 10-42)
export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPServer {
  name: string;
  version?: string;
  transport: 'stdio' | 'inprocess';
  command?: string;
  args?: string[];
  tools?: Tool[];
  env?: Record<string, string>;
}

// From SDK (via @anthropic-ai/claude-agent-sdk)
type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpHttpServerConfig
  | McpSdkServerConfigWithInstance;
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD private fields to AnthropicProvider class
  - ADD: private mcpHandler: MCPHandler = new MCPHandler();
  - ADD: private mcpServerConfig: import('@anthropic-ai/claude-agent-sdk').McpServerConfig | null = null;
  - LOCATION: After private sdk field (line 100)
  - PATTERN: Follow existing private field pattern
  - DEPENDENCIES: None

Task 2: ADD MCPHandler import to existing imports
  - MODIFY: src/providers/anthropic-provider.ts imports section (lines 38-54)
  - ADD: import { MCPHandler } from '../core/mcp-handler.js';
  - ADD: type McpServerConfig import from SDK or this.sdk type
  - PATTERN: Follow existing import pattern with .js extensions
  - DEPENDENCIES: Task 1 complete

Task 3: IMPLEMENT registerMCPs() method body
  - MODIFY: src/providers/anthropic-provider.ts (lines 326-329)
  - REPLACE: Stub implementation with full implementation

  IMPLEMENTATION PATTERN:
  ```typescript
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // Step 1: SDK initialization check
    if (!this.sdk) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    // Step 2: Register each server with MCPHandler
    for (const server of servers) {
      this.mcpHandler.registerServer(server);
    }

    // Step 3: Convert to SDK format and store for execute()
    const sdkConfig = this.mcpHandler.toAgentSDKServer();
    if (sdkConfig) {
      this.mcpServerConfig = sdkConfig;
    }

    // Step 4: Return discovered tools in MCP format
    return this.mcpHandler.getTools();
  }
  ```

  - NAMING: Follow existing camelCase conventions
  - PLACEMENT: Lines 326-329 in anthropic-provider.ts
  - DEPENDENCIES: Task 1 and Task 2 complete
  - DELIVERABLE: Implemented registerMCPs() method

Task 4: UPDATE execute() method to use mcpServerConfig
  - MODIFY: src/providers/anthropic-provider.ts execute() method (lines 190-316)
  - UPDATE: sdkOptions construction to include mcpServers (around line 224)
  - ADD: ...(this.mcpServerConfig && { mcpServers: { 'groundswell-mcp': this.mcpServerConfig } })
  - PATTERN: Follow existing conditional property spread pattern
  - DEPENDENCIES: Task 3 complete
  - DELIVERABLE: execute() uses registered MCP servers

Task 5: CREATE comprehensive tests for registerMCPs()
  - CREATE: src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts
  - IMPLEMENT: Tests for SDK initialization check
  - IMPLEMENT: Tests for server registration
  - IMPLEMENT: Tests for tool discovery (MCP format)
  - IMPLEMENT: Tests for SDK config storage
  - IMPLEMENT: Tests for empty servers array
  - IMPLEMENT: Tests for multiple server registration
  - FOLLOW: Pattern from anthropic-provider-initialize.test.ts
  - NAMING: describe('registerMCPs()', ...) for test suite
  - DEPENDENCIES: Task 3 complete
  - DELIVERABLE: Comprehensive test coverage

Task 6: RUN validation commands
  - RUN: npm run lint (TypeScript compilation check)
  - RUN: npm test (full test suite)
  - RUN: npm run build (verify build succeeds)
  - DELIVERABLE: All validations passing
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN: SDK Initialization Check
// ============================================================================
// Must verify SDK is loaded before attempting to use it
// Follows pattern from execute() method (lines 197-199)

async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // PATTERN: SDK initialization check (follow execute() pattern)
  // CRITICAL: Validate SDK is loaded before attempting to use it
  if (!this.sdk) {
    throw new Error('SDK not initialized. Call initialize() first.');
  }

  // ... rest of implementation
}

// ============================================================================
// PATTERN: Server Registration with MCPHandler
// ============================================================================
// MCPHandler manages server registration and tool storage
// FROM: mcp-handler.ts lines 52-70

// Register each server with the handler
for (const server of servers) {
  this.mcpHandler.registerServer(server);
}

// MCPHandler automatically:
// - Validates server name uniqueness (throws if duplicate)
// - Registers tools with fullName pattern: serverName__toolName
// - Creates tool executors based on transport type
// - Stores tools in registeredTools Map

// ============================================================================
// PATTERN: SDK Conversion and Storage
// ============================================================================
// Convert to Agent SDK format and store for execute() method
// FROM: mcp-handler.ts lines 167-213

const sdkConfig = this.mcpHandler.toAgentSDKServer();
// Returns: McpServerConfig | null
// - null if no tools registered
// - McpSdkServerConfigWithInstance if tools exist

if (sdkConfig) {
  this.mcpServerConfig = sdkConfig;
}

// The SDK config will be used in execute() method:
// sdkOptions.mcpServers = { 'groundswell-mcp': this.mcpServerConfig }

// ============================================================================
// PATTERN: Return Tools in MCP Format
// ============================================================================
// Return discovered tools in MCP format (NOT SDK format)
// FROM: mcp-handler.ts lines 106-108

return this.mcpHandler.getTools();
// Returns: Tool[] with { name, description, input_schema }
// - name: Full name (serverName__toolName)
// - description: Tool description
// - input_schema: JSON Schema format

// This is different from SDK format which has:
// - name: string
// - description: string
// - inputSchema: ZodRawShape
// - handler: (args, extra) => Promise<CallToolResult>

// ============================================================================
// GOTCHA: mcpServerConfig Type Declaration
// ============================================================================
// Need to import or reference McpServerConfig type from SDK

// Option 1: Import from SDK (requires SDK module access)
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

// Option 2: Use typeof import on this.sdk
private mcpServerConfig: Awaited<ReturnType<typeof this.sdk['createSdkMcpServer']>> | null = null;

// Option 3: Use conditional type based on this.sdk
private mcpServerConfig: (typeof this.sdk extends null ? null : import('@anthropic-ai/claude-agent-sdk').McpServerConfig) | null = null;

// RECOMMENDED: Import from SDK (cleanest)
// Add to imports at top of file:
import type { McpServerConfig } from '@anthropic-ai/claude-agent-sdk';

// ============================================================================
// PATTERN: Execute Integration with MCP Servers
// ============================================================================
// Update execute() method to use registered MCP servers
// MODIFY: Lines 224-225 in anthropic-provider.ts

const sdkOptions = {
  model: modelSpec.model,
  systemPrompt: request.options.systemPrompt,
  ...(request.options.tools &&
    request.options.tools.length > 0 && {
      allowedTools: request.options.tools.map((t) => t.name),
    }),

  // ADD MCP servers integration
  ...(this.mcpServerConfig && {
    mcpServers: {
      'groundswell-mcp': this.mcpServerConfig
    }
  }),
};

// ============================================================================
// CRITICAL: Tool Naming Convention
// ============================================================================
// MCPHandler automatically prefixes tool names to prevent collisions
// FROM: mcp-handler.ts line 62

// Original tool: { name: 'read_file', description: '...', ... }
// After registration: 'myserver__read_file'

// This full naming prevents conflicts when:
// - Multiple servers register tools with the same name
// - Tools need to be uniquely identified
// - SDK needs to route tool calls to correct servers

// ============================================================================
// ERROR HANDLING: Server Registration Failures
// ============================================================================
// MCPHandler.registerServer() throws if server name already exists
// FROM: mcp-handler.ts lines 53-55

// Decide on error handling strategy:
// Option A: Let exceptions propagate (fail-fast)
for (const server of servers) {
  this.mcpHandler.registerServer(server);  // Throws on duplicate
}

// Option B: Catch and aggregate errors
const errors: string[] = [];
for (const server of servers) {
  try {
    this.mcpHandler.registerServer(server);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}
if (errors.length > 0) {
  throw new Error(`Failed to register MCP servers: ${errors.join(', ')}`);
}

// RECOMMENDED: Option A (fail-fast) for simplicity
// Aligns with existing error handling pattern in execute()
```

### Integration Points

```yaml
MCP_HANDLER:
  - file: src/core/mcp-handler.ts
  - integration: registerServer(), getTools(), toAgentSDKServer()
  - usage_pattern: Create instance, register servers, get SDK config
  - storage: Private field mcpHandler stores instance

EXECUTE_METHOD:
  - file: src/providers/anthropic-provider.ts
  - integration: sdkOptions.mcpServers configuration
  - line: 224-225 (currently commented out)
  - pattern: Conditional spread of mcpServers object

SDK_TYPES:
  - from: '@anthropic-ai/claude-agent-sdk'
  - imports: McpServerConfig, createSdkMcpServer, tool
  - usage: Type mcpServerConfig field, conversion by MCPHandler

FUTURE_TASKS:
  - P2.M1.T1.S8: loadSkills() method will use similar pattern
  - P2.M1.T2.S1: Hooks adapter will integrate with tool execution
  - P4.M2: Provider execution integration with Agent
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after implementing registerMCPs() - fix before proceeding
npm run lint
# Expected: Zero TypeScript errors
# Command runs: tsc --noEmit

# If errors exist:
# 1. READ the error message carefully
# 2. CHECK that McpServerConfig type is imported correctly
# 3. VERIFY MCPHandler is imported
# 4. CHECK that private fields are declared
# 5. FIX errors before proceeding to tests

# Common errors to check:
# - Cannot find name 'MCPHandler' → Add import
# - Cannot find name 'McpServerConfig' → Add type import
# - Property 'mcpHandler' does not exist → Add private field
# - Property 'mcpServerConfig' does not exist → Add private field
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the registerMCPs() method specifically
npm test -- src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts

# Expected: All new tests pass
# Tests should cover:
# - SDK initialization check (throws if not initialized)
# - Server registration with single server
# - Server registration with multiple servers
# - Tool discovery returns MCP format tools
# - SDK config is stored correctly
# - Empty servers array handling
# - Multiple calls to registerMCPs() (idempotent check)

# Run all provider tests
npm test -- src/__tests__/unit/providers/

# Expected: All provider tests pass
# Should include:
# - anthropic-provider-registermcps.test.ts
# - anthropic-provider-initialize.test.ts
# - anthropic-provider-terminate.test.ts
# - anthropic-provider-normalizemodel.test.ts
# - anthropic-provider.test.ts
# - provider-registry.test.ts
```

### Level 3: Integration Testing (System Validation)

```bash
# Test execute() method integration with MCP servers
npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts

# Expected: execute() method can use registered MCP servers
# Key behaviors:
# - registerMCPs() succeeds with valid servers
# - execute() includes mcpServers in sdkOptions
# - Tools are available during execution

# Manual integration test (create temporary test file)
cat > test-mcp-integration.ts << 'EOF'
import { AnthropicProvider } from './src/providers/anthropic-provider.js';
import type { MCPServer, Tool } from './src/types/sdk-primitives.js';

async function test() {
  const provider = new AnthropicProvider();

  // Initialize provider
  await provider.initialize();
  console.log('✓ Provider initialized');

  // Register MCP servers
  const servers: MCPServer[] = [
    {
      name: 'test-server',
      transport: 'inprocess',
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool',
          input_schema: {
            type: 'object',
            properties: {
              message: { type: 'string' }
            },
            required: ['message']
          }
        }
      ]
    }
  ];

  const tools = await provider.registerMCPs(servers);
  console.log('✓ MCPs registered, tools:', tools.length);
  console.log('  Tool names:', tools.map(t => t.name));

  // Verify tool format
  const tool = tools[0];
  console.log('  Tool name:', tool.name);
  console.log('  Has description:', !!tool.description);
  console.log('  Has input_schema:', !!tool.input_schema);

  await provider.terminate();
  console.log('✓ Provider terminated');
}

test().catch(console.error);
EOF

# Run integration test
npx tsx test-mcp-integration.ts

# Expected output:
# ✓ Provider initialized
# ✓ MCPs registered, tools: 1
#   Tool names: [ 'test-server__test_tool' ]
#   Tool name: test-server__test_tool
#   Has description: true
#   Has input_schema: true
# ✓ Provider terminated

# Cleanup
rm test-mcp-integration.ts
```

### Level 4: Build & Package Validation

```bash
# Verify build succeeds with new implementation
npm run build

# Expected: Successful compilation to dist/
# Output should show:
# - src/providers/anthropic-provider.ts → dist/providers/anthropic-provider.js
# - No compilation errors
# - Type definitions generated correctly

# Verify built output
ls -la dist/providers/anthropic-provider.*

# Expected:
# - dist/providers/anthropic-provider.js (compiled JavaScript)
# - dist/providers/anthropic-provider.d.ts (TypeScript definitions)

# Verify MCPHandler is bundled correctly
grep -i "mcpHandler" dist/providers/anthropic-provider.js
# Should show mcpHandler references in compiled output

# Verify McpServerConfig type is preserved
grep -i "mcpServerConfig" dist/providers/anthropic-provider.d.ts
# Should show type declaration for private field
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] SDK initialization check implemented
- [ ] MCPHandler instance created and stored
- [ ] McpServerConfig stored for execute() method
- [ ] Tools returned in MCP format (Tool interface)
- [ ] Method follows idempotent and error handling patterns

### Feature Validation

- [ ] `registerMCPs(servers: MCPServer[]): Promise<Tool[]>` signature matches interface
- [ ] SDK validation throws if not initialized
- [ ] MCPServer[] are registered with MCPHandler
- [ ] Tool names use serverName__toolName format
- [ ] Returned tools have correct Tool interface structure
- [ ] SDK config is stored and accessible to execute()
- [ ] execute() method integrates with mcpServerConfig
- [ ] Existing tests continue to pass
- [ ] New tests cover all registration scenarios

### Code Quality Validation

- [ ] Follows existing codebase patterns (initialize, execute, terminate)
- [ ] File placement correct (src/providers/anthropic-provider.ts)
- [ ] Naming conventions followed (camelCase for methods/fields)
- [ ] JSDoc comments accurate and complete
- [ ] Private fields properly typed
- [ ] Imports follow ES module pattern with .js extensions
- [ ] Error handling consistent with existing methods
- [ ] No anti-patterns used (see below)

### Integration & Future Compatibility

- [ ] Compatible with execute() method integration
- [ ] Compatible with future loadSkills() implementation
- [ ] Does not break ProviderRegistry integration
- [ ] MCPHandler can be extended for stdio transport
- [ ] Tool executors can be registered for inprocess tools
- [ ] SDK config format matches Agent SDK expectations

---

## Anti-Patterns to Avoid

- ❌ **Don't skip SDK initialization check**: Must validate `this.sdk` before use
- ❌ **Don't return SDK format tools**: Return MCP format Tool[], not SdkMcpToolDefinition
- ❌ **Don't reimplement conversion**: Use MCPHandler.toAgentSDKServer() for conversion
- ❌ **Don't forget to store SDK config**: execute() needs mcpServerConfig
- ❌ **Don't use ZodObject**: MCPHandler uses ZodRawShape for tool() function
- ❌ **Don't ignore tool naming**: Tools are prefixed with serverName__
- ❌ **Don't create multiple MCPHandlers**: Use single instance stored as field
- ❌ **Don't handle each server separately**: MCPHandler manages multiple servers
- ❌ **Don't throw generic errors**: Use descriptive error messages with context
- ❌ **Don't modify Tool interface**: Return tools as-is from MCPHandler.getTools()

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Rationale**:
- ✅ Complete context provided (file locations, types, patterns)
- ✅ MCPHandler fully implements conversion logic
- ✅ Existing test patterns to follow
- ✅ Integration patterns well documented
- ✅ Validation commands are project-specific and verified
- ✅ Anti-patterns section prevents common mistakes
- ⚠️ Minor uncertainty: SDK config type import (but pattern is standard TypeScript)

**Validation**: The completed PRP should enable an AI agent unfamiliar with the codebase to implement the `registerMCPs()` method successfully using only the PRP content and codebase access.

---

## Appendix: Quick Reference

### Key Files Summary

| File | Purpose | Lines |
|------|---------|-------|
| `src/providers/anthropic-provider.ts` | Target file - implement registerMCPs() | 326-329 |
| `src/core/mcp-handler.ts` | MCPHandler implementation | 52-213 |
| `src/types/sdk-primitives.ts` | MCPServer, Tool interfaces | 10-42 |
| `src/types/providers.ts` | Provider interface with registerMCPs() | 481 |

### Implementation Signature

```typescript
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // 1. SDK check: if (!this.sdk) throw Error
  // 2. Register: for (server of servers) mcpHandler.registerServer(server)
  // 3. Convert: const sdkConfig = mcpHandler.toAgentSDKServer()
  // 4. Store: if (sdkConfig) mcpServerConfig = sdkConfig
  // 5. Return: mcpHandler.getTools()
}
```

### Validation Commands Summary

```bash
npm run lint          # Level 1: Syntax & Style
npm test              # Level 2: Unit Tests
npm run build         # Level 4: Build Validation
```

### Type Reference

```typescript
// Input type
MCPServer {
  name: string;
  transport: 'stdio' | 'inprocess';
  command?: string;
  args?: string[];
  tools?: Tool[];
  env?: Record<string, string>;
}

// Output type
Tool {
  name: string;              // Prefixed: serverName__toolName
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Stored type (internal)
McpServerConfig = McpSdkServerConfigWithInstance {
  type: 'sdk';
  name: string;
  instance: McpServer;
}
```

---

**PRP Version:** 1.0
**Last Updated:** 2026-01-25
**Status:** Ready for Implementation

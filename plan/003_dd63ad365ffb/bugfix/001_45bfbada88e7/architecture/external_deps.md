# External Dependencies Analysis

## Current Dependencies

### LLM Provider SDKs
1. **@anthropic-ai/claude-agent-sdk** (Optional dependency)
   - Used by: `AnthropicProvider`
   - Purpose: Claude API integration with MCP support
   - Features: Sessions, streaming, tool execution, extended thinking
   - Status: ✅ Well-integrated
   - File: `src/providers/anthropic-provider.ts`

2. **@opencode-ai/sdk** (Optional dependency)
   - Used by: `OpenCodeProvider`
   - Purpose: Multi-provider LLM access (75+ providers)
   - Features: Sessions, streaming, extended thinking
   - Limitations: No client-side tool execution (LLM-only mode)
   - Status: ⚠️ Limited integration (no MCP/LSP)
   - File: `src/providers/opencode-provider.ts`

### Core Runtime Dependencies
3. **zod** - Schema validation
   - Used by: AgentResponse validation, configuration schemas
   - Purpose: Runtime type checking and validation
   - Status: ✅ Well-utilized

4. **eventemitter3** - Event emission
   - Used by: Workflow event system, observer pattern
   - Purpose: Typed event handling
   - Status: ✅ Core to architecture

### MCP (Model Context Protocol)
5. **@modelcontextprotocol/sdk** (Optional dependency)
   - Used by: MCPHandler, provider tool integration
   - Purpose: MCP server/client communication
   - Status: ✅ Well-integrated with AnthropicProvider
   - File: `src/core/mcp-handler.ts`

## Missing Dependencies (For New Features)

### For Session Persistence (Issue 8)
**No storage abstraction layer currently exists**

Recommended additions:
- **Low-Priority Option**: File-based persistence
  - `fs-extra` or `node:fs/promises` (built-in)
  - Simple JSON file storage
  - Effort: 1-2 weeks

- **High-Priority Option**: Distributed persistence
  - `redis` or `ioredis` for Redis support
  - Production-grade session storage
  - Effort: 2-3 weeks

### For Restart Logic (Issue 1)
**No checkpoint/resume mechanism exists**

Recommended additions:
- **Checkpoint Storage**: Same as session persistence (above)
- **State Serialization**: Already exists via `SerializedWorkflowState`
- **No new dependencies needed** - can use existing serialization

### For OpenCode MCP/LSP (Issue 3)
**Would require significant protocol bridge implementation**

Not recommended - architectural mismatch:
- OpenCode SDK executes tools server-side
- No client-side delegation mechanism
- Would require bypassing SDK's tool execution
- Effort: 4-6 weeks with breaking changes

## Dependency Health Assessment

### Healthy Dependencies ✅
1. **@anthropic-ai/claude-agent-sdk** - Actively maintained, well-documented
2. **zod** - Stable, widely adopted, excellent TypeScript support
3. **eventemitter3** - Lightweight, performant, well-maintained
4. **@modelcontextprotocol/sdk** - Official MCP SDK, evolving rapidly

### Problematic Dependencies ⚠️
1. **@opencode-ai/sdk** - Availability issues in tests
   - Package installation failures in test environment
   - Server startup failures in test suite
   - Limited documentation for advanced features
   - **Recommendation**: Consider deprecation if parity cannot be achieved

## Dependency Version Constraints

### Optional Dependencies Pattern
The codebase uses lazy loading for optional dependencies:

```typescript
// Example from anthropic-provider.ts
let SDK: typeof import("@anthropic-ai/claude-agent-sdk") | null = null;

async function loadSDK() {
  if (!SDK) {
    SDK = await import("@anthropic-ai/claude-agent-sdk");
  }
  return SDK;
}
```

**Advantages**:
- No hard dependency on SDK packages
- Users choose which providers to install
- Smaller bundle size

**Disadvantages**:
- Runtime errors if SDK not installed
- Type checking challenges
- Test complexity

## Recommendations for New Development

### For Issue 1 (Restart Logic)
**No new dependencies needed**
- Use existing `SerializedWorkflowState` serialization
- Use existing session storage (once implemented)
- Leverage existing event system

### For Issue 2 (Workflow-Level Validation)
**No new dependencies needed**
- Extend existing Zod schemas
- Use existing `AgentResponse` validation
- Add workflow-level validation wrapper

### For Issue 5 (Provider Type Mismatch)
**No new dependencies needed**
- Pure TypeScript type system fix
- Deprecate `ProviderResult` type
- Use `AgentResponse` consistently

### For Issue 8 (Session Persistence)
**Add storage abstraction dependency**
- **Minimal**: Use `node:fs/promises` (built-in)
- **Recommended**: Add abstraction layer for multiple backends
- **Production**: Support Redis via `ioredis`

## External Documentation References

### Anthropic SDK
- **Documentation**: https://docs.anthropic.com/claude-reference/agent-sdk
- **GitHub**: https://github.com/anthropics/anthropic-sdk-typescript
- **Key Features**: Sessions, MCP integration, streaming, extended thinking

### MCP Protocol
- **Specification**: https://modelcontextprotocol.io/specification/
- **SDK Documentation**: https://modelcontextprotocol.io/sdk/
- **Key Features**: Tool registration, discovery, execution

### Zod Validation
- **Documentation**: https://zod.dev/
- **Key Features**: Runtime type validation, TypeScript inference

### OpenCode SDK
- **Status**: Limited public documentation
- **Issue**: SDK availability problems in test environment
- **Recommendation**: Reassess usage before expanding integration

## Summary

**Current State**: Dependencies are well-chosen and mostly healthy
**Risk Area**: @opencode-ai/sdk availability issues
**Opportunity**: No major dependency additions needed for critical issues
**Strategy**: Leverage existing dependencies, avoid adding external complexity

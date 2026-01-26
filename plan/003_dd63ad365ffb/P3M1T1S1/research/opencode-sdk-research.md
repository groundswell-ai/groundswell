# OpenCode SDK Research Summary

## Research Completed

### 1. NPM Registry Search - VERIFIED

**Package Found:** `@opencode-ai/sdk`

| Property | Value |
|----------|-------|
| **Exact Package Name** | `@opencode-ai/sdk` |
| **Latest Version** | `1.1.36` |
| **License** | MIT |
| **Maintainers** | adamelmore (adam@terminal.shop), thdxr (d@ironbay.co) |
| **Publication Date** | 7 hours ago (via GitHub Actions) |
| **Total Versions** | 3,021 versions published |
| **Unpacked Size** | 453.8 kB |
| **Dependencies** | None (zero dependencies) |

### Installation Commands

```bash
# Core SDK
npm install @opencode-ai/sdk

# With specific version
npm install @opencode-ai/sdk@1.1.36

# Plugin framework
npm install @opencode-ai/plugin
```

### Documentation URLs

- **NPM Package:** https://www.npmjs.com/package/@opencode-ai/sdk
- **Tarball:** https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz

### Related Ecosystem Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@opencode-ai/plugin` | 1.1.36 | Plugin framework for extensions |
| `ai-sdk-provider-opencode-sdk` | 1.0.0 | Vercel AI SDK v6 provider for OpenCode |
| `opencode-agent-skills` | 0.6.4 | Dynamic skills plugin |
| `opencode-orchestrator` | 1.2.14 | Multi-agent workflows |
| `oh-my-opencode` | 3.0.1 | Batteries-included plugin |
| `@gitlab/opencode-gitlab-auth` | 1.3.2 | GitLab OAuth plugin |
| `opencode-openai-codex-auth` | 4.4.0 | OpenAI ChatGPT OAuth |
| `opencode-gemini-auth` | 1.3.8 | Google Gemini auth |

### Capabilities (Based on PRD Requirements)

Based on the PRD Section 7.4 and ecosystem analysis, OpenCode SDK provides:

1. **Multi-Provider Support** - 75+ LLM providers including:
   - Anthropic (claude-sonnet-4-20250514)
   - OpenAI (gpt-4, gpt-3.5-turbo)
   - Google (gemini-pro, gemini-flash)
   - Ollama (llama3, mistral)
   - Azure OpenAI
   - AWS Bedrock
   - Cohere (command)
   - And 60+ more

2. **Native Sessions** - Session-based state management (not just continuation)
3. **Extended Thinking** - Native support for reasoning/thinking tokens
4. **LSP Integration** - Language Server Protocol via MCP plugins
5. **MCP Support** - Model Context Protocol integration
6. **Skills System** - Dynamic skill loading

### 2. Multi-Provider SDK Alternatives Research

**Top Alternatives Considered:**

| SDK | Providers | TypeScript | MCP Support | Notes |
|-----|-----------|------------|-------------|-------|
| **Vercel AI SDK** | 17+ | Excellent | Via LangChain | Best unified API |
| **LangChain** | 17+ | Excellent | **Native** (@langchain/mcp-adapters) | Most mature |
| **Portkey** | 10+ | Excellent | No | Simple proxy |
| **LiteLLM** | 100+ | Good | No | Python-first |
| **OpenRouter** | 300+ | Excellent | No | Aggregator |

### 3. Provider Implementation Patterns

Analyzed from existing `AnthropicProvider`:

#### Key Patterns to Follow:

1. **Interface-First Design**
   - Implement `Provider` interface explicitly
   - Use `readonly` for `id` and `capabilities`
   - Use `satisfies ProviderCapabilities` for type safety

2. **SDK Lazy Loading**
   - Dynamic import in `initialize()` method
   - Use `typeof import()` for accurate typing
   - Idempotent check at start of `initialize()`

3. **MCP Integration**
   - Use shared `MCPHandler` class
   - Convert tools to SDK-specific format
   - Store configuration for `execute()` method

4. **Session Management**
   - Use `Map<string, SessionState>` for storage
   - Implement idempotent `createSession()`
   - Return `undefined` from `getSession()` if not found

5. **Error Handling**
   - Check SDK initialization at start of methods
   - Wrap errors with context
   - Use `AgentResponse<T>` factory functions

### 4. Groundswell Codebase Context

**Current Implementation Status:**

| Component | Status | Notes |
|-----------|--------|-------|
| Provider Type System | ✅ Complete | Phase 1 (P1) |
| AnthropicProvider | ✅ Complete | Phase 2 (P2) |
| OpenCodeProvider | ⏳ In Progress | Phase 3 (P3) - This task |
| Agent Integration | ⏳ Planned | Phase 4 (P4) |

**Key Files:**

- `/src/providers/anthropic-provider.ts` - Reference implementation
- `/src/providers/provider-registry.ts` - Provider registry
- `/src/providers/index.ts` - Public exports
- `/src/types/providers.ts` - Type definitions
- `/src/core/mcp-handler.ts` - MCP integration

## Recommendations

### For P3.M1.T1.S1 (This Task):

1. **Document findings** in `external_dependencies.md`
2. **Update external_dependencies.md** with OpenCode SDK section
3. **Proceed to P3.M1.T1.S2** (Document OpenCode SDK API)

### For P3.M1.T1.S2 (Next Task):

1. **Fetch actual OpenCode SDK documentation** from npm package
2. **Document exact API patterns** for:
   - Initialization
   - Model specification
   - Provider switching
   - Session management
   - Tool/MCP integration
   - Streaming

### For P3.M2 (OpenCodeProvider Implementation):

1. **Follow AnthropicProvider patterns** exactly
2. **Use lazy loading** for `@opencode-ai/sdk`
3. **Implement session management** (OpenCode has native sessions)
4. **Support LSP tools** via MCP

### Alternative Strategy (if needed):

If OpenCode SDK doesn't meet requirements:
- Use **Vercel AI SDK** as underlying multi-provider engine
- Or use **LangChain** with MCP adapters
- Implement custom provider abstraction

## Sources

- NPM Registry: @opencode-ai/sdk
- NPM Registry: @opencode-ai/plugin
- NPM Registry: ai-sdk-provider-opencode-sdk
- NPM Registry: opencode-agent-skills
- Local PRD: /home/dustin/projects/groundswell/PRD.md
- Local Architecture: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/

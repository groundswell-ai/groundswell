# Research Notes: Provider System APIs Catalog

## Overview
Comprehensive catalog of all provider system APIs that need to be demonstrated in usage examples.

## 1. Provider Configuration Module APIs

**File**: `src/utils/provider-config.ts`

### Core Functions

| Function | Location | Description | Priority |
|----------|----------|-------------|----------|
| `configureProviders(config)` | :159 | Sets global provider configuration | **HIGH** |
| `getGlobalProviderConfig()` | :228 | Returns current global provider config | **HIGH** |
| `resolveProviderConfig()` | :338 | Implements configuration cascade | MEDIUM |

## 2. ProviderRegistry Class

**File**: `src/providers/provider-registry.ts`

### Core Methods

| Method | Location | Description | Priority |
|--------|----------|-------------|----------|
| `getInstance()` | :164 | Returns singleton instance | **HIGH** |
| `register(provider)` | :191 | Register a provider | **HIGH** |
| `get(id)` | :219 | Get provider by ID | **HIGH** |
| `has(id)` | :242 | Check if provider exists | MEDIUM |
| `initializeProvider(id, options)` | :281 | Initialize single provider | **HIGH** |
| `initializeAll(config)` | :360 | Initialize all providers | **HIGH** |
| `getStatus(id)` | :419 | Get initialization status | MEDIUM |
| `isReady(id)` | :441 | Check if provider is ready | MEDIUM |
| `terminateAll()` | :511 | Terminate all providers | LOW |

### Enum

| Enum | Values | Description |
|------|--------|-------------|
| `InitializationStatus` | `'uninitialized' \| 'initializing' \| 'initialized' \| 'failed'` | Initialization states |

## 3. Provider Classes

### AnthropicProvider

**File**: `src/providers/anthropic-provider.ts`

| Method | Location | Description | Priority |
|--------|----------|-------------|----------|
| `initialize(options)` | :156 | Load Anthropic SDK and initialize client | **HIGH** |
| `terminate()` | :205 | Cleanup resources and clear SDK reference | LOW |
| `execute(request, toolExecutor, hooks?)` | :248 | Core LLM execution with streaming support | **HIGH** |
| `registerMCPs(servers)` | :716 | Register MCP servers and return discovered tools | **HIGH** |
| `loadSkills(skills)` | :768 | Load skills from SKILL.md files | **HIGH** |
| `normalizeModel(model)` | :984 | Parse and validate model specification | **HIGH** |
| `createSession(sessionId)` | :1010 | Create new session for multi-turn conversations | **HIGH** |
| `getSession(sessionId)` | :1037 | Retrieve session state and history | MEDIUM |

#### Properties

| Property | Value | Description |
|----------|-------|-------------|
| `id` | `'anthropic'` | Provider identifier |
| `capabilities` | `{ mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: true }` | Feature flags |

### OpenCodeProvider

**File**: `src/providers/opencode-provider.ts`

| Method | Location | Description | Priority |
|--------|----------|-------------|----------|
| `initialize(options)` | :164 | Load OpenCode SDK and start server | **HIGH** |
| `terminate()` | :268 | Shutdown server and clear references | LOW |
| `execute(request, toolExecutor, hooks?)` | :393 | Core multi-provider LLM execution | **HIGH** |
| `registerMCPs(servers)` | :811 | Returns empty array (LLM-only limitation) | **LOW** |
| `loadSkills(skills)` | :848 | Load skills via system prompt injection | **HIGH** |
| `normalizeModel(model)` | :963 | Parse multi-provider model specification | **HIGH** |

#### Properties

| Property | Value | Description |
|----------|-------|-------------|
| `id` | `'opencode'` | Provider identifier |
| `capabilities` | `{ mcp: false, skills: true, lsp: false, streaming: true, sessions: true, extendedThinking: true }` | Feature flags |

## 4. Provider Interfaces and Types

**File**: `src/types/providers.ts`

### Core Types

| Type | Description | Priority |
|------|-------------|----------|
| `ProviderId` | Union type: `'anthropic' \| 'opencode'` | **HIGH** |
| `ProviderCapabilities` | Feature flags interface | MEDIUM |
| `ProviderOptions` | Configuration options (endpoint, apiKey, sessionId, timeout, headers) | **HIGH** |
| `ProviderRequest` | Request wrapper (prompt, options) | **HIGH** |
| `ProviderExecutionOptions` | Execution options (model, systemPrompt, tools, hooks, sessionId, streaming) | **HIGH** |
| `ModelSpec` | Parsed model specification (provider, model, raw) | **HIGH** |
| `ProviderHookEvents` | Lifecycle hooks (onToolStart, onToolEnd, onSessionStart, onSessionEnd, onStream) | MEDIUM |
| `ToolExecutor` | Tool execution callback | **HIGH** |
| `GlobalProviderConfig` | Global configuration (defaultProvider, providerDefaults) | **HIGH** |

## 5. Model Specification Utilities

**File**: `src/utils/model-spec.ts`

| Function | Location | Description | Priority |
|----------|----------|-------------|----------|
| `parseModelSpec(model, defaultProvider?)` | :104 | Parse model specification in qualified or plain format | **HIGH** |
| `formatModelForProvider(spec, targetProvider)` | :236 | Format model spec for specific target provider | MEDIUM |
| `isValidProviderId(value)` | :30 | Type guard for ProviderId | LOW |

## Priority Classification

### Most Important (Core Usage) - MUST HAVE EXAMPLES

1. `configureProviders()` - Must be called first for global setup
2. `ProviderRegistry.getInstance()` - Entry point for provider management
3. `AnthropicProvider.initialize()` - How to set up Anthropic
4. `OpenCodeProvider.initialize()` - How to set up OpenCode
5. `provider.execute()` - Core execution method
6. `provider.normalizeModel()` - Essential for model handling

### High Priority (Common Features) - SHOULD HAVE EXAMPLES

7. `provider.loadSkills()` - Important for prompt enhancement
8. `provider.registerMCPs()` - Critical for tool integration
9. `provider.createSession()` - For multi-turn conversations
10. Provider streaming support - For real-time responses

### Medium Priority (Advanced Features) - NICE TO HAVE EXAMPLES

11. Configuration cascade - For complex setups
12. Provider lifecycle methods - For proper resource management
13. Hook events - For observability and customization

### Lower Priority (Utilities) - MAY BE MENTIONED

14. Model spec utilities - For model validation
15. Provider status checking - For debugging
16. Termination methods - For cleanup

## Key Takeaway for PRP

The provider system has **16 key APIs** across 5 categories:

1. **Configuration Module** (3 functions) - Global setup
2. **ProviderRegistry** (9 methods) - Provider management
3. **Provider Classes** (2 classes) - Anthropic and OpenCode
4. **Types/Interfaces** (9 types) - Type safety
5. **Model Spec Utilities** (3 functions) - Model parsing

The usage examples should prioritize:
- **6 most important APIs** (core usage)
- **4 high priority APIs** (common features)
- Mention **3 medium priority APIs** (advanced features)

Lower priority utilities can be referenced but don't need dedicated examples.

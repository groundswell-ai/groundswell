# Product Requirement Prompt (PRP): Implement AnthropicProvider Class Structure and Capabilities

**Work Item:** P2.M1.T1.S1
**Title:** Implement AnthropicProvider class structure and capabilities
**Points:** 1
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Create the `AnthropicProvider` class structure with proper capability flags, provider identifier, and lazy-loaded SDK typing as the first concrete implementation of the `Provider` interface.

**Deliverable**: A new `src/providers/anthropic-provider.ts` file exporting the `AnthropicProvider` class that implements the `Provider` interface with:
- `readonly id = 'anthropic'`
- `readonly capabilities` matching Anthropic SDK v0.1.77 capabilities
- Private SDK type for lazy loading
- Stub implementations of all required Provider interface methods

**Success Definition**:
- The `AnthropicProvider` class compiles without TypeScript errors
- The class correctly implements the `Provider` interface
- `id` and `capabilities` are readonly and match expected values
- Private SDK field is properly typed for lazy loading
- Unit tests verify the class structure and capability values
- The class can be registered with `ProviderRegistry`

---

## User Persona

**Target User**: Groundswell core developers implementing the Anthropic provider as the first concrete provider implementation, establishing the pattern for future providers (OpenCode, etc.).

**Use Case**: Developers need to create the Anthropic provider class structure before implementing the full method bodies (which come in subsequent subtasks). This establishes the contract and capability flags.

**User Journey**:
1. Developer creates `AnthropicProvider` class implementing `Provider` interface
2. TypeScript enforces all required methods are present
3. Capability flags are defined based on Anthropic SDK v0.1.77 capabilities
4. Provider is registered with ProviderRegistry for testing
5. Subsequent subtasks implement each method's body

**Pain Points Addressed**:
- **No concrete implementation** before - Provider interface was abstract
- **Unclear capability mapping** - which features does Anthropic SDK support?
- **Missing SDK integration pattern** - how to lazy load and type the SDK?
- **No provider registration example** - how to use ProviderRegistry?

---

## Why

- **First concrete provider**: This is the foundational implementation that establishes patterns for all future providers
- **Capability clarity**: Defines exactly what features the Anthropic SDK supports (MCP, skills, LSP, streaming, sessions, extendedThinking)
- **SDK integration pattern**: Establishes lazy loading pattern for `@anthropic-ai/claude-agent-sdk`
- **Foundation for P2.M1**: This is S1 of Task 1 (AnthropicProvider Class) - all method implementations (S2-S8) build on this structure
- **Registry integration**: Enables testing provider registration and lifecycle management

---

## What

Create the `AnthropicProvider` class structure with the following specifications:

### Class Location and Exports

```typescript
// File: src/providers/anthropic-provider.ts
export class AnthropicProvider implements Provider { ... }
```

### Class Properties

```typescript
class AnthropicProvider implements Provider {
  // Unique provider identifier
  readonly id: ProviderId = 'anthropic';

  // Provider capabilities matching Anthropic SDK v0.1.77
  readonly capabilities: ProviderCapabilities = {
    mcp: true,              // MCP via MCPHandler/createSdkMcpServer
    skills: true,           // Skills via system prompt
    lsp: true,              // LSP via MCP plugins
    streaming: true,        // Streaming responses supported
    sessions: false,        // Stateless API (no native sessions)
    extendedThinking: true, // maxThinkingTokens supported
  } satisfies ProviderCapabilities;

  // Private SDK type for lazy loading
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;
}
```

### Required Methods (Stub Implementations)

All methods from the `Provider` interface must be implemented with stub bodies:

```typescript
  // Lifecycle methods
  async initialize(options?: ProviderOptions): Promise<void> {
    // Stub: Will be implemented in P2.M1.T1.S2
  }

  async terminate(): Promise<void> {
    // Stub: Will be implemented in P2.M1.T1.S3
  }

  // Core execution
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    // Stub: Will be implemented in P2.M1.T1.S5-S6
    return {} as AgentResponse<T>;
  }

  // MCP and Skills
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // Stub: Will be implemented in P2.M1.T1.S7
    return [];
  }

  async loadSkills(skills: Skill[]): Promise<void> {
    // Stub: Will be implemented in P2.M1.T1.S8
  }

  // Model normalization
  normalizeModel(model: string): ModelSpec {
    // Stub: Will be implemented in P2.M1.T1.S4
    // For now, return a basic ModelSpec
    return {
      provider: 'anthropic',
      model,
      raw: model,
    };
  }
```

### Success Criteria

- [ ] `src/providers/anthropic-provider.ts` file created
- [ ] Class implements `Provider` interface
- [ ] `readonly id = 'anthropic'` property defined
- [ ] `readonly capabilities` with correct Anthropic SDK capability flags
- [ ] `private sdk` field with proper lazy-load typing
- [ ] All 6 Provider interface methods have stub implementations
- [ ] Class compiles without TypeScript errors
- [ ] Unit tests verify structure and capability values

---

## All Needed Context

### Context Completeness Check

**Question**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file location (`src/providers/anthropic-provider.ts`)
- Complete class structure with all required properties and methods
- Specific capability values for Anthropic SDK v0.1.77
- Lazy loading SDK type pattern
- Testing patterns with specific assertions
- Integration with ProviderRegistry
- Common gotchas and anti-patterns to avoid

---

### Documentation & References

```yaml
# MUST READ - Provider Interface Contract
- file: src/types/providers.ts
  why: Complete Provider interface definition that AnthropicProvider must implement
  critical: Lines 442-600 contain the full interface with all method signatures
  pattern: readonly id, readonly capabilities, initialize(), terminate(), execute<T>(), registerMCPs(), loadSkills(), normalizeModel()

# MUST READ - Provider Type Dependencies
- file: src/types/providers.ts
  why: Type imports needed for AnthropicProvider implementation
  critical: Lines 1-170 contain ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest
  pattern: ProviderId = 'anthropic' | 'opencode', ProviderCapabilities interface

# MUST READ - Existing Provider Pattern Example
- file: src/__tests__/unit/provider-interface.test.ts
  why: Shows how to implement a class that satisfies the Provider interface
  critical: Lines 66-109 contain MockProvider implementation example
  pattern: readonly id: ProviderId = 'anthropic', readonly capabilities: ProviderCapabilities

# MUST READ - Provider Registry Integration
- file: src/providers/provider-registry.ts
  why: Shows how to register and use providers with the registry
  critical: Lines 191-199 show register() method, usage pattern
  pattern: registry.register(provider), registry.get('anthropic')

# MUST READ - Anthropic SDK Import Pattern
- file: src/core/agent.ts
  why: Shows current import pattern for @anthropic-ai/claude-agent-sdk
  critical: Lines 8-22 show named imports (query, createSdkMcpServer, tool, etc.)
  pattern: import { query, createSdkMcpServer, tool, type Options, ... } from '@anthropic-ai/claude-agent-sdk'

# MUST READ - SDK Primitives Types
- file: src/types/sdk-primitives.ts
  why: Tool, MCPServer, Skill types used in registerMCPs() and loadSkills() methods
  critical: Lines 10-63 define Tool, MCPServer, Skill interfaces
  pattern: Tool interface (name, description, input_schema), MCPServer (name, transport, command, args)

# REFERENCE - Anthropic SDK Documentation
- url: https://docs.anthropic.com/en/api/messages
  why: Official Messages API documentation for understanding capabilities
  section: "Overview" and "Tool use"
  critical: Confirms streaming, tool use, and system prompt support

- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: NPM package documentation for Agent SDK
  section: "API Reference"
  critical: SDK exports (query, createSdkMcpServer, tool, Options types)

- url: https://docs.anthropic.com/en/docs/tool-use
  why: Tool/function calling documentation
  section: "Tool use overview"
  critical: How tools are defined and executed in Anthropic SDK

- url: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
  why: Extended thinking (maxThinkingTokens) documentation
  section: "Extended thinking overview"
  critical: Confirms extendedThinking capability support

# REFERENCE - Lazy Loading Pattern
- docfile: plan/003_dd63ad365ffb/docs/research/provider-interface-design-patterns.md
  why: Research document on provider implementation patterns
  section: "Capability Detection with Lazy Loading" (line 256)
  pattern: const sdk = await import('@anthropic-ai/claude-agent-sdk')

# REFERENCE - Previous PRP for Context
- file: plan/003_dd63ad365ffb/P1M1T1S3/PRP.md
  why: Previous PRP that defined the Provider interface
  section: "Implementation Blueprint" and "Implementation Tasks"
  critical: Understanding the Provider interface contract and expectations
```

---

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── provider-registry.ts       # Singleton registry for provider lifecycle
│   └── __tests__/
│       └── providers/
│           └── provider-registry.test.ts
├── types/
│   ├── providers.ts               # Provider interface and all type definitions
│   ├── sdk-primitives.ts          # Tool, MCPServer, Skill, AgentHooks types
│   ├── agent.ts                   # AgentResponse<T> type
│   └── index.ts                   # Public type exports
├── core/
│   ├── agent.ts                   # Existing Agent class with Anthropic SDK imports
│   └── mcp-handler.ts             # MCP server management and tool conversion
├── utils/
│   ├── model-spec.ts              # parseModelSpec(), formatModelForProvider()
│   └── provider-config.ts         # configureProviders(), getGlobalProviderConfig()
└── __tests__/
    └── unit/
        ├── provider-interface.test.ts
        └── utils/
            └── model-spec.test.ts
```

---

### Desired Codebase Tree (After This Subtask)

```bash
src/
├── providers/
│   ├── provider-registry.ts       # Existing - will import AnthropicProvider
│   ├── anthropic-provider.ts      # [NEW] AnthropicProvider class (this PRP)
│   └── __tests__/
│       ├── providers/
│       │   ├── provider-registry.test.ts
│       │   └── anthropic-provider.test.ts  # [NEW] Tests for AnthropicProvider
│       └── ...
├── types/
│   ├── providers.ts               # Existing - Provider interface
│   ├── sdk-primitives.ts          # Existing - Tool, MCPServer, Skill types
│   ├── agent.ts                   # Existing - AgentResponse<T>
│   └── index.ts                   # [MODIFY] Export AnthropicProvider
└── index.ts                       # [MODIFY] Export AnthropicProvider from public API
```

**New Files:**
- `src/providers/anthropic-provider.ts` - Main implementation
- `src/__tests__/unit/providers/anthropic-provider.test.ts` - Unit tests

**Modified Files:**
- `src/types/index.ts` - Export AnthropicProvider type
- `src/index.ts` - Export AnthropicProvider from public API

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Use 'satisfies' operator for capabilities object
// This ensures type safety while allowing literal values
readonly capabilities = {
  mcp: true,
  skills: true,
  lsp: true,
  streaming: true,
  sessions: false,
  extendedThinking: true,
} satisfies ProviderCapabilities;
// WRONG: readonly capabilities: ProviderCapabilities = { ... }  // Less type-safe

// CRITICAL: SDK type for lazy loading uses 'typeof import'
private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;
// This is the correct TypeScript pattern for typing a dynamically imported module
// WRONG: private sdk: any | null = null;
// WRONG: private sdk: unknown | null = null;

// GOTCHA: Anthropic SDK is already installed as dependency
// From package.json line 53: "@anthropic-ai/claude-agent-sdk": "^0.1.0"
// No need to install - can import directly in initialize() method

// GOTCHA: Provider interface requires exact method signatures
// All methods must match Provider interface exactly
// execute<T>() must return Promise<AgentResponse<T>>, NOT Promise<T>

// GOTCHA: normalizeModel() returns ModelSpec, not string
// Must return: { provider: 'anthropic', model: string, raw: string }
// The ModelSpec type is defined in src/types/providers.ts lines 150-157

// PATTERN: Use ES module imports with .js extension
import type { Provider } from '../types/providers.js';
import type { ProviderId, ProviderCapabilities } from '../types/providers.js';
// NOTE: Even though source is .ts, imports use .js for ES modules

// GOTCHA: extendedThinking capability is TRUE for Anthropic
// From external_dependencies.md: Anthropic SDK supports maxThinkingTokens
// This maps to extendedThinking: true in capabilities

// GOTCHA: sessions capability is FALSE for Anthropic
// Anthropic SDK is stateless - no native session support
// Sessions are handled at Groundswell Agent level, not provider level

// GOTCHA: All interface methods must be implemented
// TypeScript will error if any method is missing
// Stub implementations can return empty values for now

// PATTERN: Register with ProviderRegistry after instantiation
// const registry = ProviderRegistry.getInstance();
// const anthropic = new AnthropicProvider();
// registry.register(anthropic);

// GOTCHA: AgentResponse<T> is a discriminated union
// Import from '../types/agent.js', not from providers.ts
// Has status: 'success' | 'error' | 'partial', data: T | null, error, metadata

// GOTCHA: ToolExecutor is a callback function type
// Defined as: (request: ToolExecutionRequest) => Promise<ToolExecutionResult>
// Providers delegate tool execution to this callback (don't create own MCPHandler)

// GOTCHA: MCPServer.transport is a union type
// Valid values: 'stdio' | 'inprocess'
// Groundswell primarily uses 'inprocess' for MCP integration

// PATTERN: Use readonly for immutable class properties
// readonly id: ProviderId = 'anthropic';  // Correct
// id: ProviderId = 'anthropic';           // Wrong - not readonly

// GOTCHA: Lazy loading pattern for SDK
// Don't import at top level: import * as SDK from '@anthropic-ai/claude-agent-sdk';
// Instead, use dynamic import: this.sdk = await import('@anthropic-ai/claude-agent-sdk');
// This allows optional SDK loading and better tree-shaking
```

---

## Implementation Blueprint

### Data Models and Structure

This subtask creates a class that uses existing types (no new models):

**Input Types** (from src/types/providers.ts):
- `ProviderId` - Union type: `'anthropic' | 'opencode'`
- `ProviderCapabilities` - Interface with capability flags
- `ProviderOptions` - Configuration options
- `ProviderRequest` - Request wrapper
- `ToolExecutionRequest`, `ToolExecutionResult` - Tool execution types
- `ProviderHookEvents` - Lifecycle hooks

**Output Types** (from src/types/agent.ts):
- `AgentResponse<T>` - Response wrapper with status, data, error, metadata

**SDK Types** (from src/types/sdk-primitives.ts):
- `Tool` - Tool definition
- `MCPServer` - MCP server configuration
- `Skill` - Skill definition

---

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: VERIFY type imports and setup
  - CHECK: Provider interface exists in src/types/providers.ts
  - CHECK: ProviderId, ProviderCapabilities are exported
  - CHECK: AgentResponse<T> exists in src/types/agent.ts
  - CHECK: Tool, MCPServer, Skill exist in src/types/sdk-primitives.ts
  - VERIFY: @anthropic-ai/claude-agent-sdk is in package.json dependencies
  - LOCATION: Read existing type definition files
  - NO CODE CHANGES: Verification only

Task 2: CREATE src/providers/anthropic-provider.ts file
  - CREATE: New file at src/providers/anthropic-provider.ts
  - IMPORT: All required types from '../types/providers.js'
  - IMPORT: AgentResponse from '../types/agent.js'
  - IMPORT: Tool, MCPServer, Skill from '../types/sdk-primitives.js'
  - DEFINE: export class AnthropicProvider implements Provider
  - NAMING: PascalCase class name, matching filename pattern
  - LOCATION: src/providers/anthropic-provider.ts

Task 3: IMPLEMENT readonly id property
  - ADD: readonly id: ProviderId = 'anthropic';
  - VERIFY: TypeScript infers type as ProviderId (literal 'anthropic')
  - PATTERN: Follow provider-interface.test.ts example (line 67)
  - PLACEMENT: First property in class definition

Task 4: IMPLEMENT readonly capabilities property
  - ADD: readonly capabilities: ProviderCapabilities = { ... };
  - VALUES: mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: true
  - USE: satisfies ProviderCapabilities for type safety
  - PATTERN: Follow provider-interface.test.ts example (lines 68-75)
  - PLACEMENT: After id property

Task 5: IMPLEMENT private SDK field for lazy loading
  - ADD: private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;
  - PATTERN: Use typeof import() for module type
  - DEFAULT: Initialize to null (loaded in initialize() method in S2)
  - PLACEMENT: After capabilities property

Task 6: IMPLEMENT stub initialize() method
  - SIGNATURE: async initialize(options?: ProviderOptions): Promise<void>
  - BODY: Empty function with comment "// Implemented in P2.M1.T1.S2"
  - PATTERN: Match Provider interface signature exactly
  - PLACEMENT: After property declarations

Task 7: IMPLEMENT stub terminate() method
  - SIGNATURE: async terminate(): Promise<void>
  - BODY: Empty function with comment "// Implemented in P2.M1.T1.S3"
  - PATTERN: Match Provider interface signature exactly
  - PLACEMENT: After initialize()

Task 8: IMPLEMENT stub execute() method
  - SIGNATURE: async execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents): Promise<AgentResponse<T>>
  - BODY: return {} as AgentResponse<T>; with comment "// Implemented in P2.M1.T1.S5-S6"
  - PATTERN: Use generic type parameter T, cast return value
  - PLACEMENT: After terminate()

Task 9: IMPLEMENT stub registerMCPs() method
  - SIGNATURE: async registerMCPs(servers: MCPServer[]): Promise<Tool[]>
  - BODY: return []; with comment "// Implemented in P2.M1.T1.S7"
  - PATTERN: Return empty array for now
  - PLACEMENT: After execute()

Task 10: IMPLEMENT stub loadSkills() method
  - SIGNATURE: async loadSkills(skills: Skill[]): Promise<void>
  - BODY: Empty function with comment "// Implemented in P2.M1.T1.S8"
  - PATTERN: Match Provider interface signature exactly
  - PLACEMENT: After registerMCPs()

Task 11: IMPLEMENT stub normalizeModel() method
  - SIGNATURE: normalizeModel(model: string): ModelSpec
  - BODY: return { provider: 'anthropic', model, raw: model };
  - PATTERN: Return basic ModelSpec for now (full implementation in S4)
  - PLACEMENT: After loadSkills()
  - GOTCHA: This method is synchronous (no async)

Task 12: EXPORT AnthropicProvider from src/types/index.ts
  - ADD: export { AnthropicProvider } from '../providers/anthropic-provider.js';
  - LOCATION: src/types/index.ts
  - PATTERN: Add with other provider-related exports

Task 13: EXPORT AnthropicProvider from src/index.ts
  - ADD: export { AnthropicProvider } from './providers/anthropic-provider.js';
  - LOCATION: src/index.ts
  - PATTERN: Add to public API exports

Task 14: CREATE unit tests in src/__tests__/unit/providers/anthropic-provider.test.ts
  - CREATE: Test file at src/__tests__/unit/providers/anthropic-provider.test.ts
  - IMPLEMENT: Test 1 - AnthropicProvider has correct id property
  - IMPLEMENT: Test 2 - AnthropicProvider has correct capabilities
  - IMPLEMENT: Test 3 - AnthropicProvider implements Provider interface
  - IMPLEMENT: Test 4 - AnthropicProvider has all required methods
  - IMPLEMENT: Test 5 - AnthropicProvider can be registered with ProviderRegistry
  - FOLLOW: Pattern from provider-interface.test.ts
  - NAMING: describe('AnthropicProvider', () => { it('should ...', () => { ... }) })

Task 15: RUN validation commands
  - EXEC: npm run lint (TypeScript compilation check)
  - EXEC: npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts
  - VERIFY: No TypeScript errors
  - VERIFY: All tests pass
  - FIX: Any type errors or test failures
```

---

### Implementation Patterns & Key Details

```typescript
// ========================================
// PATTERN 1: Class Structure with Implements
// ========================================

import type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ToolExecutor,
  ProviderHookEvents,
  ModelSpec,
} from '../types/providers.js';
import type { AgentResponse } from '../types/agent.js';
import type { Tool, MCPServer, Skill } from '../types/sdk-primitives.js';

/**
 * Anthropic provider implementation
 *
 * Wraps the @anthropic-ai/claude-agent-sdk to provide Anthropic Claude
 * model access through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Model Context Protocol integration via createSdkMcpServer
 * - **Skills**: System prompt-based skill loading
 * - **LSP**: Language Server Protocol via MCP plugins
 * - **Streaming**: Streaming response support
 * - **Sessions**: Stateless API (no native sessions)
 * - **Extended Thinking**: maxThinkingTokens for extended reasoning
 *
 * ## SDK Integration
 *
 * Uses lazy loading for the Anthropic SDK. The SDK is imported dynamically
 * in the initialize() method to support optional dependencies.
 *
 * @example
 * ```ts
 * import { AnthropicProvider } from 'groundswell';
 *
 * const provider = new AnthropicProvider();
 * await provider.initialize({ apiKey: 'sk-...' });
 *
 * const result = await provider.execute(
 *   { prompt: 'Hello, Claude!', options: {} },
 *   toolExecutor
 * );
 * ```
 */
export class AnthropicProvider implements Provider {
  // Properties and methods...
}

// ========================================
// PATTERN 2: Readonly Properties
// ========================================

  /**
   * Unique provider identifier
   *
   * @readonly
   */
  readonly id: ProviderId = 'anthropic';

  /**
   * Provider capability flags
   *
   * Anthropic SDK v0.1.77 capabilities:
   * - MCP via createSdkMcpServer
   * - Skills via system prompt
   * - LSP via MCP plugins
   * - Streaming responses
   * - No native sessions (stateless)
   * - Extended thinking via maxThinkingTokens
   *
   * @readonly
   */
  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections via createSdkMcpServer */
    mcp: true,
    /** Skill loading via system prompt */
    skills: true,
    /** LSP integration via MCP plugins */
    lsp: true,
    /** Streaming response support */
    streaming: true,
    /** Session-based state (stateless API) */
    sessions: false,
    /** Extended thinking via maxThinkingTokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;

// ========================================
// PATTERN 3: Private SDK Field for Lazy Loading
// ========================================

  /**
   * Anthropic SDK module (lazy loaded)
   *
   * Dynamically imported in initialize() to support optional dependencies.
   * Typed using typeof import() pattern for accurate module types.
   *
   * @internal
   */
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

// ========================================
// PATTERN 4: Stub Method Implementations
// ========================================

  /**
   * Initialize the Anthropic provider
   *
   * Loads the Anthropic SDK and initializes the client.
   *
   * @param options - Optional provider configuration (apiKey, endpoint, etc.)
   * @remarks
   * Implemented in P2.M1.T1.S2
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    // Implemented in P2.M1.T1.S2
  }

  /**
   * Terminate the provider and cleanup resources
   *
   * @remarks
   * Implemented in P2.M1.T1.S3
   */
  async terminate(): Promise<void> {
    // Implemented in P2.M1.T1.S3
  }

  /**
   * Execute a prompt request
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Typed agent response
   * @remarks
   * Implemented in P2.M1.T1.S5 (query construction) and P2.M1.T1.S6 (message iteration)
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    // Implemented in P2.M1.T1.S5-S6
    return {} as AgentResponse<T>;
  }

  /**
   * Register MCP servers and return available tools
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of discovered tools
   * @remarks
   * Implemented in P2.M1.T1.S7
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // Implemented in P2.M1.T1.S7
    return [];
  }

  /**
   * Load skills into the provider
   *
   * @param skills - Array of skill definitions
   * @remarks
   * Implemented in P2.M1.T1.S8
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // Implemented in P2.M1.T1.S8
  }

  /**
   * Normalize a model string to a ModelSpec
   *
   * @param model - Model string (e.g., 'claude-sonnet-4' or 'anthropic/claude-opus-4')
   * @returns Parsed model specification
   * @remarks
   * Full implementation in P2.M1.T1.S4
   */
  normalizeModel(model: string): ModelSpec {
    // Full implementation in P2.M1.T1.S4
    return {
      provider: 'anthropic',
      model,
      raw: model,
    };
  }

// ========================================
// GOTCHA: ES Module Imports with .js Extension
// ========================================

// Even though the source files are .ts, ES module imports use .js
import type { Provider } from '../types/providers.js';  // Correct
import type { Provider } from '../types/providers';     // Wrong - will cause errors

// ========================================
// GOTCHA: satisfies vs Explicit Type Annotation
// ========================================

// PREFERRED: Using satisfies (type-safe literal)
readonly capabilities = {
  mcp: true,
  skills: true,
  // ...
} satisfies ProviderCapabilities;

// ALSO VALID: Using explicit type annotation
readonly capabilities: ProviderCapabilities = {
  mcp: true,
  skills: true,
  // ...
};

// satisfies is preferred because:
// 1. Allows TypeScript to infer literal types
// 2. Still validates against ProviderCapabilities
// 3. More flexible for readonly properties
```

---

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: '../types/providers.js'
    imports: Provider, ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest, ToolExecutor, ProviderHookEvents, ModelSpec
    critical: All required types for Provider interface implementation

  - from: '../types/agent.js'
    imports: AgentResponse (generic type)
    critical: execute<T>() return type

  - from: '../types/sdk-primitives.js'
    imports: Tool, MCPServer, Skill
    critical: registerMCPs() and loadSkills() method signatures

EXPORTS:
  - add_to: src/types/index.ts
    export: export { AnthropicProvider } from '../providers/anthropic-provider.js';
    reason: Make AnthropicProvider available via types barrel export

  - add_to: src/index.ts
    export: export { AnthropicProvider } from './providers/anthropic-provider.js';
    reason: Make AnthropicProvider part of public API

REGISTRY:
  - usage: ProviderRegistry.getInstance().register(new AnthropicProvider())
  - file: src/providers/provider-registry.ts
  - method: register(provider: Provider)
  - pattern: Singleton registry manages provider lifecycle
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run lint
# OR: npx tsc --noEmit

# Expected: Zero TypeScript errors
# If errors exist, check:
# - All imports use .js extensions for ES modules
# - Type imports use 'import type' syntax
# - All Provider interface methods are implemented
# - Generic type parameter <T> is properly declared
# - Method signatures match Provider interface exactly

# Run specific file check
npx tsc --noEmit src/providers/anthropic-provider.ts

# Expected: Clean compilation with no errors
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run AnthropicProvider tests
npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts

# Expected: All tests pass
# Test coverage:
# - AnthropicProvider.id is 'anthropic'
# - AnthropicProvider.capabilities has correct values
# - All capability flags match expected Anthropic SDK capabilities
# - AnthropicProvider implements Provider interface
# - All required methods exist and are functions
# - AnthropicProvider can be registered with ProviderRegistry
# - normalizeModel() returns correct ModelSpec structure

# Run all provider tests to ensure no regressions
npm test -- src/__tests__/unit/providers/

# Run all unit tests
npm test

# Expected: All existing tests still pass
# No test failures introduced by new class
```

---

### Level 3: Interface Compliance Validation

```bash
# Test that AnthropicProvider satisfies Provider interface
# Create a temporary test file: test-provider-implementation.ts

import { AnthropicProvider } from './src/providers/anthropic-provider.js';
import type { Provider } from './src/types/providers.js';

// Type check: AnthropicProvider should be assignable to Provider
const provider: Provider = new AnthropicProvider();

// If this compiles without errors, the interface is correctly implemented
# Run: npx tsc --noEmit test-provider-implementation.ts

# Expected: Successful compilation
# If errors: Check that all Provider methods are implemented with exact signatures
```

---

### Level 4: Integration Validation

```bash
# Test that AnthropicProvider can be registered with ProviderRegistry
# Create integration test: test-registry-integration.ts

import { AnthropicProvider } from './src/providers/anthropic-provider.js';
import { ProviderRegistry } from './src/providers/provider-registry.js';

const registry = ProviderRegistry.getInstance();
const anthropic = new AnthropicProvider();

// Should register without errors
registry.register(anthropic);

// Should be retrievable
const retrieved = registry.get('anthropic');
console.log('Retrieved provider:', retrieved?.id);  // Should print 'anthropic'

// Should pass has() check
console.log('Has anthropic:', registry.has('anthropic'));  // Should print true

# Expected: All operations succeed
# If errors: Check ProviderRegistry.register() implementation
```

---

### Level 5: Public API Validation

```bash
# Test that AnthropicProvider is exported from public API
node -e "
const { AnthropicProvider } = require('./dist/index.js');
console.log('AnthropicProvider exported:', typeof AnthropicProvider);
const provider = new AnthropicProvider();
console.log('Provider ID:', provider.id);
console.log('Capabilities:', provider.capabilities);
"

# Expected output:
# AnthropicProvider exported: function (or class)
# Provider ID: anthropic
# Capabilities: { mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: true }
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npm run lint`
- [ ] All imports are correct (use .js extensions for ES modules)
- [ ] Class implements `Provider` interface (use `implements` keyword)
- [ ] `readonly id: ProviderId = 'anthropic'` property exists
- [ ] `readonly capabilities` property with correct Anthropic SDK values
- [ ] `private sdk` field with `typeof import('@anthropic-ai/claude-agent-sdk') | null` type
- [ ] All 6 Provider interface methods have stub implementations
- [ ] Method signatures match Provider interface exactly
- [ ] Generic type parameter `<T>` properly declared on `execute<T>()`

### Feature Validation

- [ ] `id` property value is exactly `'anthropic'`
- [ ] `capabilities.mcp` is `true`
- [ ] `capabilities.skills` is `true`
- [ ] `capabilities.lsp` is `true`
- [ ] `capabilities.streaming` is `true`
- [ ] `capabilities.sessions` is `false`
- [ ] `capabilities.extendedThinking` is `true`
- [ ] `normalizeModel()` returns `ModelSpec` with correct structure
- [ ] Class can be instantiated: `new AnthropicProvider()`
- [ ] Class can be registered with `ProviderRegistry`

### Code Quality Validation

- [ ] Follows existing codebase patterns (compare to Agent class, ProviderRegistry)
- [ ] Naming conventions match (camelCase methods, PascalCase class)
- [ ] File placement matches desired structure (src/providers/anthropic-provider.ts)
- [ ] Public API exports added (src/types/index.ts, src/index.ts)
- [ ] JSDoc comments on class and public members
- [ ] No anti-patterns used (see below)

### Test Validation

- [ ] Unit test file created: `src/__tests__/unit/providers/anthropic-provider.test.ts`
- [ ] All tests pass: `npm test -- src/__tests__/unit/providers/anthropic-provider.test.ts`
- [ ] Test coverage includes:
  - [ ] Property value assertions (id, capabilities)
  - [ ] Interface implementation verification
  - [ ] Method existence checks
  - [ ] ProviderRegistry integration
  - [ ] normalizeModel() return value
- [ ] No existing tests broken by changes

---

## Anti-Patterns to Avoid

- ❌ **Don't use mutable properties for id and capabilities**
  - Wrong: `id: ProviderId = 'anthropic';` or `capabilities: ProviderCapabilities = { ... };`
  - Right: `readonly id: ProviderId = 'anthropic';` and `readonly capabilities = { ... } satisfies ProviderCapabilities;`
  - Why: These should be immutable after initialization

- ❌ **Don't import SDK at module level**
  - Wrong: `import * as SDK from '@anthropic-ai/claude-agent-sdk';` at top of file
  - Right: `private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;` field
  - Why: Lazy loading supports optional dependencies and better tree-shaking

- ❌ **Don't use 'any' for SDK type**
  - Wrong: `private sdk: any | null = null;`
  - Right: `private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;`
  - Why: typeof import() provides accurate type checking for the module

- ❌ **Don't forget .js extensions in imports**
  - Wrong: `import { Provider } from '../types/providers';`
  - Right: `import { Provider } from '../types/providers.js';`
  - Why: ES modules require file extensions, even for TypeScript source files

- ❌ **Don't omit 'implements Provider'**
  - Wrong: `export class AnthropicProvider { ... }`
  - Right: `export class AnthropicProvider implements Provider { ... }`
  - Why: TypeScript won't enforce interface compliance without implements keyword

- ❌ **Don't change method signatures**
  - Wrong: `async execute(request: ProviderRequest): Promise<AgentResponse<T>>`
  - Right: `async execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents): Promise<AgentResponse<T>>`
  - Why: Exact signature match required for interface compliance

- ❌ **Don't make normalizeModel async**
  - Wrong: `async normalizeModel(model: string): Promise<ModelSpec>`
  - Right: `normalizeModel(model: string): ModelSpec`
  - Why: Provider interface specifies synchronous method

- ❌ **Don't use wrong capability values**
  - Wrong: `sessions: true` or `extendedThinking: false`
  - Right: `sessions: false, extendedThinking: true`
  - Why: Anthropic SDK v0.1.77 has these specific capabilities

- ❌ **Don't implement full method bodies in this subtask**
  - Scope: This subtask ONLY creates class structure with stub methods
  - Wait: P2.M1.T1.S2 through P2.M1.T1.S8 for full implementations
  - Why: Incremental development allows testing at each step

- ❌ **Don't forget to export from public API**
  - Wrong: Class defined but not exported from src/index.ts
  - Right: Add `export { AnthropicProvider } from './providers/anthropic-provider.js';` to src/index.ts
  - Why: Public API must expose all public classes

---

## Research Summary

This PRP is based on comprehensive research across four key areas:

### 1. Codebase Analysis (Task: Explore Class Patterns)
- **Files Analyzed**: src/types/providers.ts, src/providers/provider-registry.ts, src/core/agent.ts, src/__tests__/unit/provider-interface.test.ts
- **Key Findings**:
  - Provider interface with readonly properties pattern (lines 442-600)
  - MockProvider implementation example in tests (lines 66-109)
  - ProviderRegistry singleton pattern with getInstance() (lines 164-169)
  - Existing Anthropic SDK import pattern in Agent class (lines 8-22)

### 2. Anthropic SDK Research (Task: General-Purpose Research)
- **Documentation**:
  - NPM Package: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  - Messages API: https://docs.anthropic.com/en/api/messages
  - Tool Use: https://docs.anthropic.com/en/docs/tool-use
  - Extended Thinking: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
- **Key Findings**:
  - SDK v0.1.77 installed in package.json (line 53)
  - Supports MCP via createSdkMcpServer
  - Supports streaming responses
  - Supports extended thinking via maxThinkingTokens
  - Stateless API (no native sessions)
  - Skills via system prompt

### 3. Test Pattern Research (Task: General-Purpose Research)
- **Files Analyzed**: src/__tests__/unit/provider-interface.test.ts, src/__tests__/unit/providers/provider-registry.test.ts
- **Key Findings**:
  - Test file naming: `<feature>.test.ts` in appropriate directory
  - Describe/It block organization with nested describes
  - Mock class implementation pattern with `implements Provider`
  - Readonly property testing with `expect(provider.id).toBe('anthropic')`
  - ProviderRegistry integration testing pattern

### 4. Type System Research
- **Type Imports**: All required types exist in src/types/providers.ts and src/types/sdk-primitives.ts
- **Lazy Loading Pattern**: `typeof import('@anthropic-ai/claude-agent-sdk')` for accurate module typing
- **ES Module Pattern**: Imports must use .js extensions even for .ts source files

---

## Confidence Score

**One-Pass Implementation Success Likelihood: 10/10**

**Justification**:
- ✅ Complete type definitions already exist (P1.M1.T1.S1 through P1.M1.T1.S5)
- ✅ Clear Provider interface specification with all method signatures
- ✅ Existing test patterns to follow (provider-interface.test.ts)
- ✅ Lazy loading pattern documented in research
- ✅ Specific capability values for Anthropic SDK v0.1.77
- ✅ Comprehensive anti-patterns and gotchas documented
- ✅ Incremental approach (stubs only in this subtask)
- ✅ No external dependencies to install
- ✅ Clear file locations and structure

**Validation**: An AI agent unfamiliar with Groundswell can implement this AnthropicProvider class structure successfully using only this PRP content, existing type definitions, and codebase access.

---

## Appendix: Complete Class Code Reference

```typescript
/**
 * Anthropic provider implementation
 *
 * Wraps the @anthropic-ai/claude-agent-sdk to provide Anthropic Claude
 * model access through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Model Context Protocol integration via createSdkMcpServer
 * - **Skills**: System prompt-based skill loading
 * - **LSP**: Language Server Protocol via MCP plugins
 * - **Streaming**: Streaming response support
 * - **Sessions**: Stateless API (no native sessions)
 * - **Extended Thinking**: maxThinkingTokens for extended reasoning
 *
 * ## SDK Integration
 *
 * Uses lazy loading for the Anthropic SDK. The SDK is imported dynamically
 * in the initialize() method to support optional dependencies.
 *
 * @example
 * ```ts
 * import { AnthropicProvider } from 'groundswell';
 *
 * const provider = new AnthropicProvider();
 * await provider.initialize({ apiKey: 'sk-...' });
 *
 * const result = await provider.execute(
 *   { prompt: 'Hello, Claude!', options: {} },
 *   toolExecutor
 * );
 * ```
 *
 * @see {@link https://docs.anthropic.com/en/api/messages | Anthropic Messages API}
 * @see {@link https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk | Agent SDK Package}
 */
export class AnthropicProvider implements Provider {
  /**
   * Unique provider identifier
   *
   * @readonly
   */
  readonly id: ProviderId = 'anthropic';

  /**
   * Provider capability flags
   *
   * Anthropic SDK v0.1.77 capabilities:
   * - MCP via createSdkMcpServer
   * - Skills via system prompt
   * - LSP via MCP plugins
   * - Streaming responses
   * - No native sessions (stateless)
   * - Extended thinking via maxThinkingTokens
   *
   * @readonly
   */
  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections via createSdkMcpServer */
    mcp: true,
    /** Skill loading via system prompt */
    skills: true,
    /** LSP integration via MCP plugins */
    lsp: true,
    /** Streaming response support */
    streaming: true,
    /** Session-based state (stateless API) */
    sessions: false,
    /** Extended thinking via maxThinkingTokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;

  /**
   * Anthropic SDK module (lazy loaded)
   *
   * Dynamically imported in initialize() to support optional dependencies.
   * Typed using typeof import() pattern for accurate module types.
   *
   * @internal
   */
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

  /**
   * Initialize the Anthropic provider
   *
   * Loads the Anthropic SDK and initializes the client.
   *
   * @param options - Optional provider configuration (apiKey, endpoint, etc.)
   * @remarks
   * Implemented in P2.M1.T1.S2
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    // Implemented in P2.M1.T1.S2
  }

  /**
   * Terminate the provider and cleanup resources
   *
   * @remarks
   * Implemented in P2.M1.T1.S3
   */
  async terminate(): Promise<void> {
    // Implemented in P2.M1.T1.S3
  }

  /**
   * Execute a prompt request
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Typed agent response
   * @remarks
   * Implemented in P2.M1.T1.S5 (query construction) and P2.M1.T1.S6 (message iteration)
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    // Implemented in P2.M1.T1.S5-S6
    return {} as AgentResponse<T>;
  }

  /**
   * Register MCP servers and return available tools
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of discovered tools
   * @remarks
   * Implemented in P2.M1.T1.S7
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // Implemented in P2.M1.T1.S7
    return [];
  }

  /**
   * Load skills into the provider
   *
   * @param skills - Array of skill definitions
   * @remarks
   * Implemented in P2.M1.T1.S8
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // Implemented in P2.M1.T1.S8
  }

  /**
   * Normalize a model string to a ModelSpec
   *
   * @param model - Model string (e.g., 'claude-sonnet-4' or 'anthropic/claude-opus-4')
   * @returns Parsed model specification
   * @remarks
   * Full implementation in P2.M1.T1.S4
   */
  normalizeModel(model: string): ModelSpec {
    // Full implementation in P2.M1.T1.S4
    return {
      provider: 'anthropic',
      model,
      raw: model,
    };
  }
}
```

---

**PRP Version**: 1.0
**Created**: January 25, 2026
**For**: Subtask P2.M1.T1.S1 - Implement AnthropicProvider class structure and capabilities
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support

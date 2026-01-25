# Product Requirement Prompt (PRP): Define Provider Interface with Core Methods

**Work Item:** P1.M1.T1.S3
**Title:** Define Provider interface with core methods
**Points:** 2
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Define the `Provider` interface contract that all LLM providers (Anthropic, OpenCode, future providers) must implement to enable multi-provider support in the Groundswell Agent SDK.

**Deliverable**: A complete, type-safe `Provider` interface export in `src/types/providers.ts` with all core methods specified in PRD Section 7.3.

**Success Definition**:
- The `Provider` interface is exported from `src/types/providers.ts`
- All methods from PRD Section 7.3 are defined with proper TypeScript signatures
- The interface uses generics for type-safe `execute<T>()` method
- The interface follows existing Groundswell patterns (readonly properties, JSDoc documentation)
- Unit tests validate the interface structure and type safety

---

## User Persona

**Target User**: Groundswell core developers implementing provider abstractions (Anthropic provider, OpenCode provider) and future provider contributors.

**Use Case**: Developers need a clear contract to implement when creating new LLM provider integrations. The interface defines the exact methods, signatures, and behaviors required for provider compatibility.

**User Journey**:
1. Developer reads the `Provider` interface definition
2. Developer creates a class implementing `Provider` (e.g., `class AnthropicProvider implements Provider`)
3. TypeScript enforces all required methods are implemented
4. Developer implements each method according to the contract
5. Provider is registered with `ProviderRegistry` and used by `Agent`

**Pain Points Addressed**:
- **No clear contract** before - developers had to guess what methods to implement
- **Inconsistent provider APIs** - each provider might have different method signatures
- **Missing type safety** - no guarantee that providers behave correctly
- **Unclear extensibility** - no guidance for adding new providers

---

## Why

- **Multi-provider foundation**: This interface is the contract layer that enables Agent to work with multiple LLM providers (Anthropic, OpenCode, and future providers)
- **Abstraction from SDK details**: Agent class wraps Anthropic SDK directly now; the Provider interface abstracts this pattern so any SDK can be used
- **Type safety guarantees**: Generics in `execute<T>()` ensure type-safe prompt execution across all providers
- **Cohesion with completed work**: Builds on P1.M1.T1.S1 (ProviderId, ProviderCapabilities) and P1.M1.T1.S2 (ProviderOptions, ProviderRequest) - this subtask combines them into the complete interface contract
- **Foundation for future work**: Required before P1.M1.T1.S4 (ToolExecutionResult, ProviderHookEvents), P1.M3 (Provider Registry), and P2 (Anthropic Provider Implementation)

---

## What

Define a `Provider` interface with the following contract per PRD Section 7.3:

### Interface Specification

```typescript
export interface Provider {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Provider capabilities (feature flags) */
  readonly capabilities: ProviderCapabilities;

  /** Initialize provider with optional configuration */
  initialize(options?: ProviderOptions): Promise<void>;

  /** Terminate provider and cleanup resources */
  terminate(): Promise<void>;

  /** Execute a prompt request with type-safe response */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

  /** Register MCP servers and return available tools */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

  /** Load skills into the provider */
  loadSkills(skills: Skill[]): Promise<void>;

  /** Normalize a model string to ModelSpec */
  normalizeModel(model: string): ModelSpec;
}
```

### Required Type Dependencies (Already Defined in P1.M1.T1.S1 and P1.M1.T1.S2)

- `ProviderId` - Union type: `'anthropic' | 'opencode'`
- `ProviderCapabilities` - Interface with capability flags (mcp, skills, lsp, streaming, sessions, extendedThinking)
- `ProviderOptions` - Interface for provider configuration (endpoint, apiKey, sessionId, timeout, headers)
- `ProviderRequest` - Interface wrapping prompt and execution options
- `ToolExecutionRequest` - Tool name and input
- `ToolExecutionResult` - Tool result content and error flag
- `ProviderHookEvents` - Hook callbacks for lifecycle events
- `AgentResponse<T>` - Generic response type from `src/types/agent.ts`

### Success Criteria

- [ ] `Provider` interface exported from `src/types/providers.ts`
- [ ] All 8 members defined (2 readonly properties, 6 methods)
- [ ] `execute<T>()` uses generics for type-safe return
- [ ] `execute<T>()` accepts `ToolExecutor` callback parameter
- [ ] All methods have comprehensive JSDoc documentation
- [ ] Interface compiles without TypeScript errors
- [ ] Unit tests validate interface structure
- [ ] Interface follows existing Groundswell patterns (readonly, async/await, naming)

---

## All Needed Context

### Context Completeness Check

**Question**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact file location and existing type definitions to import
- Complete interface specification with all methods
- TypeScript patterns to follow (generics, readonly, JSDoc)
- Testing patterns and validation commands
- Integration points with existing Agent class
- Common gotchas and anti-patterns to avoid

---

### Documentation & References

```yaml
# MUST READ - Type Definitions (Already Implemented)
- file: src/types/providers.ts
  why: Contains ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest - all required for Provider interface
  critical: These types are inputs to Provider interface methods
  lines: 1-130

# MUST READ - AgentResponse Type (Return Type for execute<T>())
- file: src/types/agent.ts
  why: AgentResponse<T> is the return type for Provider.execute<T>() - must understand its structure
  critical: execute<T>() returns Promise<AgentResponse<T>>, not Promise<T>
  lines: 93-250
  pattern: Discriminated union with status field ('success' | 'error' | 'partial')

# MUST READ - Existing Agent Class (Pattern to Abstract)
- file: src/core/agent.ts
  why: Current Agent class wraps Anthropic SDK directly - Provider interface abstracts this pattern
  critical: Provider implementations should follow Agent's structure but delegate to different SDKs
  lines: 68-350
  pattern: public readonly id, private config, async prompt<T>(), async reflect<T>(), getMcpHandler()

# MUST READ - MCPHandler (Tool Execution Pattern)
- file: src/core/mcp-handler.ts
  why: Tool execution is delegated to MCPHandler via ToolExecutor callback
  critical: Provider.execute() receives toolExecutor callback - doesn't create its own MCPHandler
  lines: 1-200
  pattern: async executeTool(toolName: string, input: unknown): Promise<ToolResult>

# REFERENCE - PRD Section 7.3 (Provider Interface Specification)
- docfile: plan/003_dd63ad365ffb/delta_prd.md
  why: Official PRD specification of Provider interface
  section: "3.1 Provider Interface (NEW)"
  pattern: Specifies exact methods: readonly id, readonly capabilities, initialize(), terminate(), execute<T>(), registerMCPs(), loadSkills(), normalizeModel()

# REFERENCE - TypeScript Generic Patterns
- docfile: plan/003_dd63ad365ffb/P1M1T1S3/research/typescript-generic-execute-patterns.md
  why: Research on best practices for generic execute<T>() method
  critical: Recommended pattern: execute<T = unknown>(request, toolExecutor, hooks?) with AgentResponse<T> return
  section: "Recommended Pattern" and "Groundswell-Specific Recommendations"

# REFERENCE - Provider Interface Design Patterns
- docfile: plan/003_dd63ad365ffb/docs/research/provider-interface-design-patterns.md
  why: Comprehensive research on provider abstraction patterns from popular LLM SDKs
  critical: Interface-first design, readonly properties, lifecycle methods, MCP integration patterns
  section: "Provider Interface Core Patterns" and "Recommended Groundswell Patterns"

# REFERENCE - System Context (Existing Implementation)
- docfile: plan/003_dd63ad365ffb/docs/architecture/system_context.md
  why: Overview of existing Agent implementation and what needs to be abstracted
  section: "Current Implementation Status" - "Provider System (Multi-Provider Support)"
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── agent.ts              # Existing Agent class (wraps Anthropic SDK)
│   ├── mcp-handler.ts        # MCP server management
│   └── ...
├── types/
│   ├── agent.ts              # AgentResponse<T>, AgentConfig, PromptOverrides
│   ├── providers.ts          # ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest (P1.M1.T1.S1, P1.M1.T1.S2)
│   ├── sdk-primitives.ts     # Tool, MCPServer, Skill, AgentHooks types
│   └── index.ts              # Public type exports
├── __tests__/
│   ├── unit/
│   │   ├── agent-response.test.ts      # AgentResponse validation tests (pattern to follow)
│   │   └── ...
│   └── integration/
│       └── ...
└── index.ts                   # Public API exports
```

---

### Desired Codebase Tree (After This Subtask)

```bash
src/
├── types/
│   ├── providers.ts          # [MODIFY] Add Provider interface export (this PRP)
│   ├── agent.ts              # AgentResponse<T> (used by Provider.execute<T>())
│   ├── sdk-primitives.ts     # Tool, MCPServer, Skill, AgentHooks
│   └── index.ts              # [MODIFY] Export Provider interface
├── __tests__/
│   └── unit/
│       └── provider-interface.test.ts  # [CREATE] Tests for Provider interface (this PRP)
```

**Note**: Only `src/types/providers.ts` is modified to add the `Provider` interface. One test file is created. No other files are modified in this subtask.

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Provider.execute<T>() returns AgentResponse<T>, NOT T directly
// WRONG: Promise<T>
// RIGHT: Promise<AgentResponse<T>>
// The AgentResponse wrapper provides status, error, and metadata fields

// CRITICAL: toolExecutor parameter is REQUIRED for execute<T>()
// Provider implementations must delegate tool execution to the callback
// Do NOT create or manage MCPHandler instances within providers
async execute<T>(
  request: ProviderRequest,
  toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,  // REQUIRED
  hooks?: ProviderHookEvents
): Promise<AgentResponse<T>>

// GOTCHA: ProviderOptions are all optional properties
// When implementing initialize(options?: ProviderOptions), handle undefined
// Follow Agent constructor pattern: config.options ?? defaultValue

// GOTCHA: AgentResponse is a discriminated union
// Use status field for type narrowing: 'success' | 'error' | 'partial'
// Import from src/types/agent.ts, not from providers.ts

// PATTERN: Use readonly modifier for id and capabilities properties
// This prevents reassignment after initialization
readonly id: ProviderId;
readonly capabilities: ProviderCapabilities;

// PATTERN: All lifecycle methods return Promise<void>
// async initialize(options?: ProviderOptions): Promise<void>
// async terminate(): Promise<void>
// async loadSkills(skills: Skill[]): Promise<void>

// PATTERN: registerMCPs() returns Promise<Tool[]>
// Returns the list of registered tools after MCP servers are connected
// This allows Agent to know what tools are available

// PATTERN: normalizeModel() returns ModelSpec (NOT string)
// ModelSpec interface: { provider: ProviderId; model: string; raw: string }
// Parse model strings like "claude-sonnet-4" or "anthropic/claude-opus-4"
// ModelSpec will be defined in P1.M1.T1.S5, define placeholder for now

// PATTERN: JSDoc documentation required for all interface members
// Follow pattern in src/types/agent.ts - comprehensive JSDoc with @param, @returns
// Include @example tags for complex methods like execute<T>()

// GOTCHA: ToolExecutor type signature
// Defined in src/core/mcp-handler.ts as: (input: unknown) => Promise<unknown>
// But ToolExecutionRequest/Result defined in src/types/providers.ts
// Use the types from providers.ts for type safety

// GOTCHA: MCPServer and Skill types are from src/types/sdk-primitives.ts
// Import these types, don't redefine them
// registerMCPs(servers: MCPServer[]): Promise<Tool[]>
// loadSkills(skills: Skill[]): Promise<void>
```

---

## Implementation Blueprint

### Data Models and Structure

**No new models created in this subtask.** This subtask defines the `Provider` interface which uses existing types:

- **Input Types** (from P1.M1.T1.S1, P1.M1.T1.S2): `ProviderId`, `ProviderCapabilities`, `ProviderOptions`, `ProviderRequest`
- **Output Types** (from existing codebase): `AgentResponse<T>` (src/types/agent.ts), `ModelSpec` (placeholder, P1.M1.T1.S5)
- **Callback Types**: `ToolExecutor` (function signature), `ProviderHookEvents` (P1.M1.T1.S4 placeholder)

---

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: VERIFY existing type imports in src/types/providers.ts
  - CHECK: ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest are exported
  - CHECK: ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents are defined (or add placeholders)
  - IMPORT: AgentResponse<T> from './agent.js'
  - IMPORT: Tool, MCPServer, Skill from './sdk-primitives.js'
  - LOCATION: Top of src/types/providers.ts
  - NO CODE CHANGES: Just verify imports are correct

Task 2: DEFINE placeholder types if not already present
  - CHECK: If ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents exist in providers.ts
  - CREATE: If missing, add placeholder definitions (will be fully defined in P1.M1.T1.S4)
  - PATTERN: Follow existing interface structure in providers.ts
  - LOCATION: After ProviderRequest interface in providers.ts
  - GOTCHA: These are placeholder definitions only - P1.M1.T1.S4 will refine them

Task 3: DEFINE Provider interface in src/types/providers.ts
  - ADD: export interface Provider { ... }
  - IMPLEMENT: readonly id: ProviderId
  - IMPLEMENT: readonly capabilities: ProviderCapabilities
  - IMPLEMENT: initialize(options?: ProviderOptions): Promise<void>
  - IMPLEMENT: terminate(): Promise<void>
  - IMPLEMENT: execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents): Promise<AgentResponse<T>>
  - IMPLEMENT: registerMCPs(servers: MCPServer[]): Promise<Tool[]>
  - IMPLEMENT: loadSkills(skills: Skill[]): Promise<void>
  - IMPLEMENT: normalizeModel(model: string): ModelSpec
  - DOCUMENTATION: Add comprehensive JSDoc for each member
  - NAMING: Follow existing naming conventions (camelCase for methods, PascalCase for interface)
  - LOCATION: After all type definitions, before re-exports in providers.ts

Task 4: EXPORT Provider interface from src/types/index.ts
  - ADD: export { Provider, type ProviderId, type ProviderCapabilities, ... } from './providers.js'
  - CHECK: All provider-related types are exported
  - LOCATION: src/types/index.ts
  - PATTERN: Follow existing export pattern (alphabetical or grouped)

Task 5: CREATE unit tests in src/__tests__/unit/provider-interface.test.ts
  - IMPLEMENT: Test 1 - Provider interface has all required properties
  - IMPLEMENT: Test 2 - Provider interface has all required methods
  - IMPLEMENT: Test 3 - Provider.execute<T>() is generic (type parameter test)
  - IMPLEMENT: Test 4 - Provider interface can be implemented (mock class test)
  - IMPLEMENT: Test 5 - Provider readonly properties are enforced
  - FOLLOW: Pattern from src/__tests__/unit/agent-response.test.ts
  - NAMING: describe('Provider Interface', () => { it('should have ...', () => { ... }) })
  - LOCATION: src/__tests__/unit/provider-interface.test.ts

Task 6: RUN validation commands
  - EXEC: npm run check (or equivalent TypeScript check)
  - EXEC: npm test -- src/__tests__/unit/provider-interface.test.ts
  - VERIFY: No TypeScript errors
  - VERIFY: All tests pass
  - FIX: Any type errors or test failures
```

---

### Implementation Patterns & Key Details

```typescript
// ========================================
// PATTERN 1: Interface Definition Structure
// ========================================

/**
 * Provider interface for LLM backend abstraction
 *
 * Defines the contract all providers must implement to support
 * multi-provider Agent SDK execution.
 *
 * @example
 * ```ts
 * class AnthropicProvider implements Provider {
 *   readonly id = 'anthropic';
 *   readonly capabilities = { mcp: true, skills: true, ... };
 *
 *   async initialize(options?: ProviderOptions): Promise<void> {
 *     // Initialize Anthropic SDK client
 *   }
 *
 *   async execute<T>(
 *     request: ProviderRequest,
 *     toolExecutor: ToolExecutor,
 *     hooks?: ProviderHookEvents
 *   ): Promise<AgentResponse<T>> {
 *     // Execute prompt via Anthropic SDK
 *   }
 * }
 * ```
 */
export interface Provider {
  // ... members
}

// ========================================
// PATTERN 2: Readonly Properties with JSDoc
// ========================================

  /**
   * Unique provider identifier
   *
   * Used for provider selection and model qualification.
   * Must be one of the supported ProviderId values.
   *
   * @example
   * ```ts
   * readonly id: ProviderId;  // 'anthropic' | 'opencode'
   * ```
   */
  readonly id: ProviderId;

  /**
   * Provider capability flags
   *
   * Indicates which features this provider supports.
   * Used for feature detection and capability queries.
   *
   * @example
   * ```ts
   * readonly capabilities: ProviderCapabilities;
   * // { mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: false }
   * ```
   */
  readonly capabilities: ProviderCapabilities;

// ========================================
// PATTERN 3: Lifecycle Methods with Async
// ========================================

  /**
   * Initialize the provider with optional configuration
   *
   * Called when provider is first instantiated or registered.
   * Providers should perform one-time setup here (SDK clients, connections).
   *
   * @param options - Optional provider-specific configuration
   * @throws ProviderError if initialization fails
   *
   * @example
   * ```ts
   * await provider.initialize({ apiKey: 'sk-...', endpoint: 'https://...' });
   * ```
   */
  initialize(options?: ProviderOptions): Promise<void>;

  /**
   * Terminate the provider and cleanup resources
   *
   * Called when provider is being shut down or unregistered.
   * Providers should close connections, release resources, etc.
   *
   * @example
   * ```ts
   * await provider.terminate();
   * ```
   */
  terminate(): Promise<void>;

// ========================================
// PATTERN 4: Generic Execute Method (CRITICAL)
// ========================================

  /**
   * Execute a prompt request with type-safe response
   *
   * This is the core method for LLM execution. Providers must:
   * 1. Construct the appropriate SDK query/request
   * 2. Handle tool execution via the toolExecutor callback
   * 3. Invoke hooks at appropriate lifecycle points
   * 4. Return an AgentResponse with validated data
   *
   * @typeParam T - The expected response data type (inferred from schema or explicit)
   * @param request - The prompt request with options
   * @param toolExecutor - Callback for executing tools (delegated to MCPHandler)
   * @param hooks - Optional lifecycle hooks for events
   * @returns Promise resolving to AgentResponse with status, data, error, metadata
   *
   * @example
   * ```ts
   * // Explicit type parameter
   * const response = await provider.execute<{ answer: string }>(
   *   { prompt: 'What is 2+2?', options: {} },
   *   toolExecutor,
   *   hooks
   * );
   * if (response.status === 'success') {
   *   console.log(response.data.answer);  // Type-safe access
   * }
   *
   * // Schema inference (if supported)
   * const response = await provider.execute(
   *   { prompt: '...', options: { outputSchema: AnswerSchema } },
   *   toolExecutor
   * );
   * ```
   */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

// ========================================
// PATTERN 5: MCP Registration Method
// ========================================

  /**
   * Register MCP servers and return available tools
   *
   * Providers should connect to the given MCP servers and discover
   * all available tools. Returns the list of discovered tools.
   *
   * @param servers - Array of MCP server configurations
   * @returns Promise resolving to array of discovered Tool definitions
   *
   * @example
   * ```ts
   * const tools = await provider.registerMCPs([
   *   { transport: 'stdio', command: 'python', args: ['mcp_server.py'] }
   * ]);
   * console.log(`Registered ${tools.length} tools`);
   * ```
   */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

// ========================================
// PATTERN 6: Skill Loading Method
// ========================================

  /**
   * Load skills into the provider
   *
   * Skills are reusable prompt templates or capabilities.
   * Anthropic provider uses system prompts; OpenCode has native /skills support.
   *
   * @param skills - Array of skill definitions to load
   *
   * @example
   * ```ts
   * await provider.loadSkills([
   *   { name: 'web-search', prompt: 'Search the web for...' }
   * ]);
   * ```
   */
  loadSkills(skills: Skill[]): Promise<void>;

// ========================================
// PATTERN 7: Model Normalization Method
// ========================================

  /**
   * Normalize a model string to a ModelSpec
   *
   * Parses model strings in two formats:
   * - Plain: "claude-sonnet-4-20250514" (uses default provider)
   * - Qualified: "anthropic/claude-opus-4-20250514" (explicit provider)
   *
   * @param model - Model string to parse
   * @returns ModelSpec with provider, model, and raw string
   *
   * @example
   * ```ts
   * provider.normalizeModel('claude-sonnet-4')
   * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
   *
   * provider.normalizeModel('anthropic/claude-opus-4')
   * // Returns: { provider: 'anthropic', model: 'claude-opus-4', raw: 'anthropic/claude-opus-4' }
   * ```
   */
  normalizeModel(model: string): ModelSpec;

// ========================================
// GOTCHA: Type Imports (Must be correct)
// ========================================

import type { Tool, MCPServer, Skill } from './sdk-primitives.js';
import type { AgentResponse } from './agent.js';

// Placeholder for ModelSpec (will be defined in P1.M1.T1.S5)
export interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;
}

// Placeholder for ToolExecutor (function signature)
export type ToolExecutor = (
  req: ToolExecutionRequest
) => Promise<ToolExecutionResult>;
```

---

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: './agent.js'
    imports: AgentResponse (generic type for execute<T>() return)
    critical: execute<T>() returns Promise<AgentResponse<T>>, not Promise<T>

  - from: './sdk-primitives.js'
    imports: Tool, MCPServer, Skill
    used_by: registerMCPs(), loadSkills()

  - from: './providers.js' (same file)
    imports: ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest
    used_by: Provider interface members

EXPORTS:
  - add_to: src/types/index.ts
    export: export type { Provider, ProviderId, ProviderCapabilities, ... } from './providers.js'
    reason: Make Provider interface available to rest of codebase

TEST_IMPORTS:
  - from: '../../types/providers.js'
    imports: Provider, type ProviderId, type ProviderCapabilities, etc.
    used_by: Unit tests for interface validation
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npm run check
# OR: npx tsc --noEmit

# Expected: Zero TypeScript errors
# If errors exist, check:
# - All imports are correct (AgentResponse from agent.ts, Tool from sdk-primitives.ts)
# - Generic type parameter <T> is properly declared
# - All method signatures match PRD specification

# Linting (if using ESLint)
npm run lint
# OR: npx eslint src/types/providers.ts --fix

# Formatting (if using Prettier)
npm run format
# OR: npx prettier --write src/types/providers.ts
```

---

### Level 2: Unit Tests (Component Validation)

```bash
# Run Provider interface tests
npm test -- src/__tests__/unit/provider-interface.test.ts

# Expected: All tests pass
# Test coverage:
# - Provider interface has 8 members (2 properties, 6 methods)
# - id and capabilities are readonly
# - execute<T>() is a generic method
# - Provider can be implemented by a class
# - All methods have correct signatures

# Run all unit tests to ensure no regressions
npm test -- src/__tests__/unit/

# Expected: All existing tests still pass
# No test failures introduced by new interface
```

---

### Level 3: Type System Validation

```bash
# Test that Provider interface can be implemented
# Create a temporary test file: test-provider-implementation.ts

import { Provider, type ProviderId, type ProviderCapabilities } from './src/types/providers.js';
import type { AgentResponse } from './src/types/agent.js';
import type { ProviderRequest, ToolExecutor, ProviderHookEvents } from './src/types/providers.js';

class MockProvider implements Provider {
  readonly id: ProviderId = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,
    extendedThinking: false
  };

  async initialize(options?: any): Promise<void> {}
  async terminate(): Promise<void> {}
  async execute<T>(request: any, toolExecutor: any, hooks?: any): Promise<AgentResponse<T>> {
    return {} as AgentResponse<T>;
  }
  async registerMCPs(servers: any[]): Promise<any[]> { return []; }
  async loadSkills(skills: any[]): Promise<void> {}
  normalizeModel(model: string): any { return { provider: 'anthropic', model, raw: model }; }
}

// If this compiles without errors, interface is correctly defined
// Run: npx tsc --noEmit test-provider-implementation.ts

# Expected: Successful compilation (no errors)
# If errors: Check method signatures match interface exactly
```

---

### Level 4: Integration Validation

```bash
# Test that Provider interface is exported from public API
node -e "
const { Provider } = require('./dist/types/index.js');
console.log('Provider interface exported:', typeof Provider);
console.log('Provider methods:', Object.getOwnPropertyNames(Provider.prototype));
"

# Expected output:
# Provider interface exported: function (or object)
# Provider methods: [array of method names]

# Verify interface is usable in Agent class context
# Create a test that uses Provider interface as a type constraint
function useProvider(provider: Provider) {
  console.log(provider.id);
  console.log(provider.capabilities);
  // TypeScript should allow calling all Provider methods
}

# Expected: TypeScript allows all Provider method calls
```

---

### Level 5: Documentation Validation

```bash
# Verify JSDoc comments are present and correct
npx typedoc --out /tmp/typedoc src/types/providers.ts

# Open /tmp/typedoc/index.html
# Check that Provider interface is documented
# Check that all methods have @param and @returns tags
# Check that @example tags are present for complex methods

# Alternative: Use tsc checks for JSDoc
npx tsc --noEmit --pretty
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npm run check` or `npx tsc --noEmit`
- [ ] All imports are correct (AgentResponse, Tool, MCPServer, Skill)
- [ ] Generic type parameter `<T>` properly declared on `execute<T>()`
- [ ] Return type `Promise<AgentResponse<T>>` is correct (not `Promise<T>`)
- [ ] `toolExecutor` parameter is present in `execute<T>()` signature
- [ ] `readonly` modifier used for `id` and `capabilities` properties
- [ ] All methods are `async` (return `Promise<...>`)

### Feature Validation

- [ ] All 8 interface members defined (2 properties, 6 methods)
- [ ] Methods match PRD Section 7.3 specification exactly:
  - [ ] `readonly id: ProviderId`
  - [ ] `readonly capabilities: ProviderCapabilities`
  - [ ] `initialize(options?: ProviderOptions): Promise<void>`
  - [ ] `terminate(): Promise<void>`
  - [ ] `execute<T>(request, toolExecutor, hooks?): Promise<AgentResponse<T>>`
  - [ ] `registerMCPs(servers: MCPServer[]): Promise<Tool[]>`
  - [ ] `loadSkills(skills: Skill[]): Promise<void>`
  - [ ] `normalizeModel(model: string): ModelSpec`
- [ ] Comprehensive JSDoc documentation on all members
- [ ] `@example` tags for complex methods (execute, registerMCPs, normalizeModel)

### Code Quality Validation

- [ ] Follows existing codebase patterns (compare to src/types/agent.ts)
- [ ] Naming conventions match (camelCase methods, PascalCase interface)
- [ ] File placement matches desired structure (src/types/providers.ts)
- [ ] Public API export added to src/types/index.ts
- [ ] No anti-patterns used (see below)

### Test Validation

- [ ] Unit test file created: `src/__tests__/unit/provider-interface.test.ts`
- [ ] All tests pass: `npm test -- src/__tests__/unit/provider-interface.test.ts`
- [ ] Test coverage includes:
  - [ ] Interface structure validation
  - [ ] Readonly property enforcement
  - [ ] Generic method type parameter
  - [ ] Class implementation possibility
- [ ] No existing tests broken by changes

---

## Anti-Patterns to Avoid

- ❌ **Don't make execute<T>() return Promise<T> directly**
  - Wrong: `execute<T>(...): Promise<T>`
  - Right: `execute<T>(...): Promise<AgentResponse<T>>`
  - Why: AgentResponse wrapper provides status, error, and metadata

- ❌ **Don't omit the toolExecutor parameter from execute<T>()**
  - Wrong: `execute<T>(request: ProviderRequest): Promise<AgentResponse<T>>`
  - Right: `execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, ...): Promise<AgentResponse<T>>`
  - Why: Providers delegate tool execution; they don't manage MCPHandler themselves

- ❌ **Don't use mutable properties for id and capabilities**
  - Wrong: `id: ProviderId;` or `capabilities: ProviderCapabilities;`
  - Right: `readonly id: ProviderId;` and `readonly capabilities: ProviderCapabilities;`
  - Why: These should be immutable after initialization

- ❌ **Don't make methods non-async**
  - Wrong: `initialize(options?: ProviderOptions): void;`
  - Right: `initialize(options?: ProviderOptions): Promise<void>;`
  - Why: All provider operations involve I/O (API calls, file system)

- ❌ **Don't skip JSDoc documentation**
  - Wrong: No comments on interface members
  - Right: Comprehensive JSDoc with @param, @returns, @example
  - Why: Provider interface is a public contract; documentation is critical

- ❌ **Don't use any for type parameters**
  - Wrong: `execute(request: any, toolExecutor: any): Promise<any>`
  - Right: `execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor): Promise<AgentResponse<T>>`
  - Why: Type safety is the whole point of generics

- ❌ **Don't create circular type dependencies**
  - Wrong: Provider imports from files that import back from providers.ts
  - Right: Provider only imports from agent.ts and sdk-primitives.ts (already exist)
  - Why: Circular dependencies cause TypeScript compilation errors

- ❌ **Don't forget to export from public API**
  - Wrong: Interface defined in providers.ts but not exported from index.ts
  - Right: Add `export type { Provider } from './providers.js'` to types/index.ts
  - Why: Interface must be accessible to rest of codebase

- ❌ **Don't use the ModelSpec type before it's defined**
  - Note: ModelSpec will be fully defined in P1.M1.T1.S5
  - Action: Create placeholder interface in this file for now
  - Why: This subtask (P1.M1.T1.S3) comes before P1.M1.T1.S5

- ❌ **Don't implement the Provider class in this subtask**
  - Scope: This subtask ONLY defines the interface
  - Wait: P2.M1.T1 (AnthropicProvider implementation) comes later
  - Why: Interface must be defined and validated before implementations

---

## Research Summary

This PRP is based on comprehensive research across three key areas:

### 1. Codebase Analysis (Task: Explore Agent)
- **Files Analyzed**: src/types/providers.ts, src/types/agent.ts, src/core/agent.ts, src/core/mcp-handler.ts
- **Key Findings**:
  - Existing Agent class wraps Anthropic SDK directly (lines 68-747)
  - ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest already defined in providers.ts
  - AgentResponse<T> is a discriminated union with status field
  - ToolExecutor pattern uses callback delegation

### 2. TypeScript Generic Patterns (Task: General-Purpose Research)
- **Documents**: plan/003_dd63ad365ffb/P1M1T1S3/research/typescript-generic-execute-patterns.md
- **Key Findings**:
  - Recommended pattern: `execute<T = unknown>(request, toolExecutor, hooks?): Promise<AgentResponse<T>>`
  - Three type-safety patterns: explicit type, schema inference, default unknown
  - Generic constraints: `extends Record<string, unknown>` for object types
  - Open-source examples: Prisma, Axios, Vitest, Execa patterns

### 3. Provider Interface Design (Task: General-Purpose Research)
- **Documents**: plan/003_dd63ad365ffb/docs/research/provider-interface-design-patterns.md
- **Key Findings**:
  - Interface-first design with clear contracts
  - Readonly properties for immutability
  - Async lifecycle methods (initialize, terminate, execute)
  - MCP integration patterns with dynamic server management
  - Skill loading patterns with capability checking
  - Model normalization with bidirectional mapping

---

## Confidence Score

**One-Pass Implementation Success Likelihood: 9/10**

**Justification**:
- ✅ Complete type definitions already exist (P1.M1.T1.S1, P1.M1.T1.S2)
- ✅ Clear PRD specification (Section 7.3)
- ✅ Existing patterns to follow (Agent class, AgentResponse)
- ✅ Comprehensive research on generics and provider patterns
- ✅ Specific file locations and line numbers provided
- ✅ Testing patterns established in codebase
- ⚠️ Only risk: ModelSpec placeholder may need adjustment in P1.M1.T1.S5 (minor)

**Validation**: An AI agent unfamiliar with Groundswell can implement this Provider interface successfully using only this PRP content, existing type definitions, and codebase access.

---

## Appendix: Complete Interface Code Reference

```typescript
/**
 * Provider interface for LLM backend abstraction
 *
 * Defines the contract all providers must implement to support
 * multi-provider Agent SDK execution. Providers encapsulate
 * SDK-specific details while presenting a uniform API.
 *
 * @see {@link https://github.com/anthropics/groundswell | Groundswell Documentation}
 *
 * @example
 * ```ts
 * import { Provider, type ProviderId, type ProviderCapabilities } from '@groundswell/sdk';
 *
 * class CustomProvider implements Provider {
 *   readonly id: ProviderId = 'anthropic';
 *   readonly capabilities: ProviderCapabilities = {
 *     mcp: true,
 *     skills: true,
 *     lsp: true,
 *     streaming: true,
 *     sessions: false,
 *     extendedThinking: false
 *   };
 *
 *   async initialize(options?: ProviderOptions): Promise<void> {
 *     // Initialize SDK client
 *   }
 *
 *   async terminate(): Promise<void> {
 *     // Cleanup resources
 *   }
 *
 *   async execute<T>(
 *     request: ProviderRequest,
 *     toolExecutor: ToolExecutor,
 *     hooks?: ProviderHookEvents
 *   ): Promise<AgentResponse<T>> {
 *     // Execute prompt via SDK
 *   }
 *
 *   async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
 *     // Register MCP servers
 *   }
 *
 *   async loadSkills(skills: Skill[]): Promise<void> {
 *     // Load skills
 *   }
 *
 *   normalizeModel(model: string): ModelSpec {
 *     // Parse model specification
 *   }
 * }
 * ```
 */
export interface Provider {
  /**
   * Unique provider identifier
   *
   * Used for provider selection and model qualification.
   * Must be one of the supported {@link ProviderId} values.
   */
  readonly id: ProviderId;

  /**
   * Provider capability flags
   *
   * Indicates which features this provider supports.
   * Used for feature detection and capability queries.
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Initialize the provider with optional configuration
   *
   * @param options - Optional provider-specific configuration
   */
  initialize(options?: ProviderOptions): Promise<void>;

  /**
   * Terminate the provider and cleanup resources
   */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request with type-safe response
   *
   * @typeParam T - The expected response data type
   * @param request - The prompt request with options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Promise resolving to typed AgentResponse
   */
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

  /**
   * Register MCP servers and return available tools
   *
   * @param servers - Array of MCP server configurations
   * @returns Promise resolving to array of discovered tools
   */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

  /**
   * Load skills into the provider
   *
   * @param skills - Array of skill definitions to load
   */
  loadSkills(skills: Skill[]): Promise<void>;

  /**
   * Normalize a model string to a ModelSpec
   *
   * @param model - Model string to parse
   * @returns Parsed model specification
   */
  normalizeModel(model: string): ModelSpec;
}
```

---

**PRP Version**: 1.0
**Created**: January 25, 2026
**For**: Subtask P1.M1.T1.S3 - Define Provider interface with core methods
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support

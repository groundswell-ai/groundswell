name: "OpenCodeProvider Class Structure Implementation"
description: |

---

## Goal

**Feature Goal**: Create the OpenCodeProvider class that implements the Provider interface, establishing the foundational structure for OpenCode SDK integration.

**Deliverable**: A complete `src/providers/opencode-provider.ts` file containing the OpenCodeProvider class with readonly properties (id, capabilities), SDK lazy-loading pattern, and stub methods matching the Provider interface.

**Success Definition**:
- OpenCodeProvider class implements Provider interface correctly
- TypeScript compilation passes with no type errors
- Class structure matches AnthropicProvider pattern exactly
- All required methods are stubbed with correct signatures
- Import of OpenCode SDK follows lazy-loading pattern

## User Persona (if applicable)

**Target User**: Developer implementing the multi-provider system

**Use Case**: Setting up the OpenCode provider as an alternative to Anthropic for multi-provider LLM execution

**User Journey**:
1. Developer creates new OpenCodeProvider instance
2. Calls initialize() to lazy-load the SDK
3. Registers MCP servers and loads skills
4. Executes prompts via the provider

**Pain Points Addressed**: Enables multi-provider support without requiring structural changes to Agent class

## Why

- **Multi-Provider Foundation**: Establishes OpenCode as a viable alternative provider to Anthropic
- **Feature Parity**: OpenCode supports native sessions (unlike Anthropic's abstraction), LSP integration, and 75+ providers
- **Integration Requirements**: PRD Section 7.4 specifies OpenCode capabilities: mcp=true, skills=true, lsp=true, streaming=true, sessions=true (native), extendedThinking=true
- **Provider System Completion**: P3.M2 is a conditional milestone that implements OpenCodeProvider based on P3.M1 SDK verification findings

## What

Implement the OpenCodeProvider class structure with:
1. Readonly `id` property set to 'opencode'
2. Readonly `capabilities` with all flags set to true (sessions=true is key difference from Anthropic)
3. Private SDK field with lazy-loading via initialize()
4. Stub implementations of all Provider interface methods
5. Proper TypeScript imports and exports

### Success Criteria

- [ ] Class implements Provider interface (TypeScript validates this)
- [ ] `id` property is readonly and equals 'opencode'
- [ ] `capabilities` has all 6 flags set to true
- [ ] Private `sdk` field uses `typeof import("@opencode-ai/sdk")` typing
- [ ] All 6 Provider methods have correct signatures
- [ ] `initialize()` method has idempotent check and dynamic import
- [ ] `terminate()` method clears SDK reference
- [ ] `execute()`, `registerMCPs()`, `loadSkills()`, `normalizeModel()` stubs present
- [ ] File exports default OpenCodeProvider class

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP includes:
- Exact file paths for all reference implementations
- Complete AnthropicProvider code as pattern reference
- Provider interface with all method signatures
- OpenCode SDK package name and API patterns
- Project structure and file placement conventions
- Type import patterns and gotchas

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: Official OpenCode SDK package documentation - confirms package name, version, API structure
  critical: Package name is @opencode-ai/sdk (NOT @opencode/sdk). Uses client-server architecture requiring external server process.

- url: https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
  why: Vercel AI SDK provider example showing OpenCode SDK usage patterns
  critical: Shows createOpencode(), createOpencodeClient(), session.prompt() usage patterns

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: EXACT reference pattern to follow - class structure, readonly properties, SDK lazy loading, all method signatures
  pattern: Implement Provider interface with readonly id/capabilities, private sdk field with typeof import(), idempotent initialize(), terminate() cleanup
  gotcha: Use `satisfies ProviderCapabilities` for capabilities type safety. SDK field must be nullable for lazy loading pattern.

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Provider interface definition - all 6 required methods with exact signatures
  pattern: interface Provider { readonly id: ProviderId; readonly capabilities: ProviderCapabilities; initialize(), terminate(), execute<T>(), registerMCPs(), loadSkills(), normalizeModel() }
  gotcha: ProviderId is a union type that includes 'opencode'. Execute() returns Promise<AgentResponse<T>>.

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Complete OpenCode SDK API documentation from P3.M1 research
  section: Sections 3-14 contain full API: createOpencode(), OpencodeClient, session.prompt(), provider API, types
  critical: SDK uses client-server architecture. Primary API: createOpencode({ hostname, port }) returns { client, server }. Client has session.prompt(), mcp.add(), provider.list().

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S1/research/opencode-sdk-research.md
  why: Quick reference for verified package info and capabilities
  section: Package verification, capabilities comparison, provider patterns
```

### Current Codebase tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts   # REFERENCE IMPLEMENTATION - copy this pattern
│   ├── opencode-provider.ts    # CREATE THIS FILE
│   ├── provider-registry.ts    # Will register OpenCodeProvider
│   └── index.ts                # Exports ProviderRegistry
├── types/
│   ├── providers.ts            # Provider interface definition
│   ├── agent.ts                # AgentResponse<T> type
│   └── sdk-primitives.ts       # Tool, MCPServer, Skill types
├── core/
│   └── mcp-handler.ts          # MCPHandler class for registerMCPs()
└── utils/
    └── model-spec.ts           # parseModelSpec() utility
```

### Desired Codebase tree with files to be added

```bash
src/
├── providers/
│   ├── anthropic-provider.ts   # Existing reference
│   ├── opencode-provider.ts    # [NEW] OpenCodeProvider class implementation
│   ├── provider-registry.ts    # [MODIFY] Will register OpenCodeProvider in P3.M2.T1.S2
│   └── index.ts                # [MODIFY] Will export OpenCodeProvider in P3.M2.T1.S2
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: OpenCode SDK uses client-server architecture, not standalone like Anthropic
// The SDK must start an external server process via createOpencode()
// This task only creates the class structure - server management is in P3.M2.T1.S2

// CRITICAL: Package name is @opencode-ai/sdk (NOT @opencode/sdk)
// Research confirmed: npm install @opencode-ai/sdk@1.1.36

// CRITICAL: OpenCode has NATIVE sessions (key difference from Anthropic)
// Anthropic uses sessions: false but implements session abstraction
// OpenCode has sessions: true capability with native session objects
// This means capabilities.sessions = true (not false like Anthropic would be)

// CRITICAL: SDK type import pattern - MUST use typeof import() for lazy loading
private sdk: typeof import("@opencode-ai/sdk") | null = null;
// NOT: private sdk: any | null = null;

// CRITICAL: Use `satisfies ProviderCapabilities` for type safety
readonly capabilities: ProviderCapabilities = {
  mcp: true,
  skills: true,
  lsp: true,
  streaming: true,
  sessions: true,      // TRUE for OpenCode (native sessions)
  extendedThinking: true,
} satisfies ProviderCapabilities;

// CRITICAL: ProviderId union type already includes 'opencode'
// From src/types/providers.ts: export type ProviderId = 'anthropic' | 'opencode';
// No need to extend the type - 'opencode' is already valid

// CRITICAL: Initialize must be idempotent (safe to call multiple times)
// Pattern from AnthropicProvider: if (this.sdk) { return; }

// CRITICAL: All Provider interface methods must be present even if stubbed
// execute<T>(), registerMCPs(), loadSkills(), normalizeModel()
// This task creates stubs - full implementation is in subsequent subtasks

// CRITICAL: Import paths use .js extension (ESM modules)
import type { Provider } from "../types/providers.js";
// NOT: import type { Provider } from "../types/providers";
```

## Implementation Blueprint

### Data models and structure

No new data models needed - using existing types from Provider interface:
- `ProviderId`: Already includes 'opencode' in union type
- `ProviderCapabilities`: Interface with 6 boolean flags
- `ProviderOptions`: Configuration options for initialize()
- `ProviderRequest`: Request structure for execute()
- `ModelSpec`: Model specification return type

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/providers/opencode-provider.ts
  - IMPLEMENT: OpenCodeProvider class with Provider interface
  - FOLLOW pattern: src/providers/anthropic-provider.ts (lines 59-93 for class structure)
  - NAMING: PascalCase class name "OpenCodeProvider"
  - PLACEMENT: src/providers/ directory (same level as anthropic-provider.ts)

Task 2: DECLARE readonly id property
  - IMPLEMENT: readonly id: ProviderId = "opencode"
  - FOLLOW pattern: src/providers/anthropic-provider.ts line 65
  - TYPE: ProviderId (already includes 'opencode' in union)
  - VALUE: String literal "opencode" (lowercase, matches ProviderId)

Task 3: DECLARE readonly capabilities property
  - IMPLEMENT: readonly capabilities with all 6 boolean flags set to true
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 80-93
  - FLAGS: mcp=true, skills=true, lsp=true, streaming=true, sessions=true, extendedThinking=true
  - TYPE_ANNOTATION: satisfies ProviderCapabilities for type safety
  - CRITICAL: sessions=true is key difference from Anthropic's abstraction approach

Task 4: DECLARE private SDK field for lazy loading
  - IMPLEMENT: private sdk field with nullable typeof import() type
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 103-103
  - TYPE: typeof import("@opencode-ai/sdk") | null
  - DEFAULT: null (loaded lazily in initialize())
  - GOTCHA: Must use exact package name @opencode-ai/sdk

Task 5: IMPLEMENT initialize() method stub
  - IMPLEMENT: async initialize(options?: ProviderOptions): Promise<void>
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 155-193
  - PATTERN: Idempotent check first (if (this.sdk) { return; })
  - IMPORT: Dynamic import using await import("@opencode-ai/sdk")
  - ERROR: Wrap import failure with descriptive error message
  - VALIDATION: Check that imported module is not null
  - PLACEMENT: After field declarations, before terminate()

Task 6: IMPLEMENT terminate() method stub
  - IMPLEMENT: async terminate(): Promise<void>
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 204-228
  - PATTERN: Idempotent check (if (this.sdk === null) { return; })
  - CLEANUP: Set this.sdk = null to allow garbage collection
  - STUB: Other cleanup (mcpServerConfig, skillsPrompt, sessions) will be added in later subtasks
  - PLACEMENT: After initialize()

Task 7: IMPLEMENT execute() method stub
  - IMPLEMENT: async execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents): Promise<AgentResponse<T>>
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 243-446
  - SIGNATURE: Exact match to Provider interface
  - STUB: Throw Error("Not implemented") - full implementation in P3.M2.T1.S3
  - TYPE_PARAMS: Generic <T> for response type
  - PLACEMENT: After terminate()

Task 8: IMPLEMENT registerMCPs() method stub
  - IMPLEMENT: async registerMCPs(servers: MCPServer[]): Promise<Tool[]>
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 486-513
  - SIGNATURE: Exact match to Provider interface
  - STUB: Throw Error("Not implemented") - full implementation in P3.M2.T1.S4
  - PARAM: servers array of MCPServer type
  - RETURN: Promise<Tool[]> array of discovered tools
  - PLACEMENT: After execute()

Task 9: IMPLEMENT loadSkills() method stub
  - IMPLEMENT: async loadSkills(skills: Skill[]): Promise<void>
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 538-574
  - SIGNATURE: Exact match to Provider interface
  - STUB: Throw Error("Not implemented") - full implementation in P3.M2.T1.S4
  - PARAM: skills array of Skill type
  - RETURN: Promise<void> (no return value)
  - PLACEMENT: After registerMCPs()

Task 10: IMPLEMENT normalizeModel() method stub
  - IMPLEMENT: normalizeModel(model: string): ModelSpec
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 754-767
  - SIGNATURE: Exact match to Provider interface (synchronous, no Promise)
  - STUB: Delegate to parseModelSpec() utility, validate provider is 'opencode'
  - DELEGATE: Call parseModelSpec(model, "opencode") from utils/model-spec.ts
  - VALIDATION: Check spec.provider === this.id, throw if mismatch
  - RETURN: ModelSpec object
  - PLACEMENT: After loadSkills(), as last method

Task 11: ADD JSDoc comments (optional but recommended)
  - IMPLEMENT: Class-level and method-level documentation
  - FOLLOW pattern: src/providers/anthropic-provider.ts lines 1-36
  - CONTENT: Class purpose, capabilities, SDK integration notes
  - FORMAT: JSDoc with @example, @see, @remarks tags
  - PLACEMENT: Above class and each method
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// CLASS STRUCTURE PATTERN (Copy EXACTLY from AnthropicProvider)
// ============================================================================

/**
 * OpenCode provider implementation
 *
 * Wraps the @opencode-ai/sdk to provide multi-provider LLM access
 * through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Native MCP integration via client.mcp namespace
 * - **Skills**: Native skill loading via OpenCode skills system
 * - **LSP**: Native LSP integration via client.lsp namespace
 * - **Streaming**: Server-Sent Events streaming support
 * - **Sessions**: Native session-based state management
 * - **Extended Thinking**: Native reasoning token support
 *
 * ## SDK Integration
 *
 * Uses lazy loading for the OpenCode SDK. The SDK is imported dynamically
 * in the initialize() method to support optional dependencies.
 *
 * @example
 * ```ts
 * import { OpenCodeProvider } from 'groundswell';
 *
 * const provider = new OpenCodeProvider();
 * await provider.initialize();
 *
 * const result = await provider.execute(
 *   { prompt: 'Hello!', options: {} },
 *   toolExecutor
 * );
 * ```
 */
export class OpenCodeProvider implements Provider {
  // Readonly properties (EXACT pattern from AnthropicProvider)
  readonly id: ProviderId = "opencode";
  readonly capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: true,      // TRUE - native sessions
    extendedThinking: true,
  } satisfies ProviderCapabilities;

  // SDK lazy loading pattern
  private sdk: typeof import("@opencode-ai/sdk") | null = null;

  // Methods implemented in order below...
}

// ============================================================================
// INITIALIZE PATTERN (Idempotent lazy loading)
// ============================================================================

async initialize(options?: ProviderOptions): Promise<void> {
  // PATTERN: Idempotent check FIRST - prevents double initialization
  if (this.sdk) {
    return;
  }

  // PATTERN: Dynamic import with error wrapping
  try {
    this.sdk = await import("@opencode-ai/sdk");
  } catch (error) {
    throw new Error(
      `Failed to load @opencode-ai/sdk: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // PATTERN: Validate import succeeded
  if (!this.sdk) {
    throw new Error("Failed to load @opencode-ai/sdk: Import returned null");
  }

  // Note: Server startup will be in P3.M2.T1.S2
  // This task only loads the SDK module
}

// ============================================================================
// TERMINATE PATTERN (Idempotent cleanup)
// ============================================================================

async terminate(): Promise<void> {
  // PATTERN: Idempotent check FIRST
  if (this.sdk === null) {
    return;
  }

  // PATTERN: Clear SDK reference for garbage collection
  this.sdk = null;

  // Additional cleanup will be added in later subtasks:
  // - Server shutdown (P3.M2.T1.S2)
  // - MCP config clearing (P3.M2.T1.S4)
  // - Skills clearing (P3.M2.T1.S4)
  // - Session clearing (P3.M2.T1.S3)
}

// ============================================================================
// EXECUTE PATTERN (Stub for this subtask)
// ============================================================================

async execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents,
): Promise<AgentResponse<T>> {
  // STUB: Full implementation in P3.M2.T1.S3
  throw new Error("OpenCodeProvider.execute() not implemented yet");
}

// ============================================================================
// NORMALIZE MODEL PATTERN (Delegate to utility)
// ============================================================================

normalizeModel(model: string): ModelSpec {
  // PATTERN: Delegate to parseModelSpec utility with provider default
  const spec = parseModelSpec(model, "opencode");

  // PATTERN: Provider-specific validation
  if (spec.provider !== this.id) {
    throw new Error(
      `Cannot normalize ${spec.provider}/${spec.model} with OpenCodeProvider. ` +
        `Use ProviderRegistry.get('${spec.provider}') instead.`
    );
  }

  return spec;
}

// ============================================================================
// IMPORT STATEMENTS (Required at top of file)
// ============================================================================

import type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ToolExecutor,
  ProviderHookEvents,
  ModelSpec,
} from "../types/providers.js";
import type { AgentResponse } from "../types/agent.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import { parseModelSpec } from "../utils/model-spec.js";

// ============================================================================
// CRITICAL GOTCHAS
// ============================================================================

// GOTCHA: OpenCode SDK uses client-server architecture
// createOpencode() starts a server process - not just a client
// This task only loads the SDK - server management is P3.M2.T1.S2

// GOTCHA: Package name is @opencode-ai/sdk (with -ai)
// Research: https://www.npmjs.com/package/@opencode-ai/sdk

// GOTCHA: sessions=true is native support (not abstraction like Anthropic)
// OpenCode has built-in session objects with IDs

// GOTCHA: Import paths MUST use .js extension (ESM requirement)
// import from "../types/providers.js" not "../types/providers"

// GOTCHA: Use satisfies ProviderCapabilities for extra type safety
// This ensures capabilities object matches the interface exactly
```

### Integration Points

```yaml
IMPORTS:
  - from: src/types/providers.js
    types: [Provider, ProviderId, ProviderCapabilities, ProviderOptions, ProviderRequest, ToolExecutor, ProviderHookEvents, ModelSpec]

  - from: src/types/agent.js
    types: [AgentResponse]

  - from: src/types/sdk-primitives.ts
    types: [Tool, MCPServer, Skill]

  - from: src/utils/model-spec.ts
    functions: [parseModelSpec]

  - dynamic: @opencode-ai/sdk
    method: await import("@opencode-ai/sdk") in initialize()

FILE_PLACEMENT:
  - create: src/providers/opencode-provider.ts
  - location: Same directory as anthropic-provider.ts

NO_CHANGES_NEEDED:
  - src/types/providers.ts (ProviderId already includes 'opencode')
  - src/providers/index.ts (export will be added in later subtask)
  - src/providers/provider-registry.ts (registration will be added in later subtask)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after creating the file - fix before proceeding
npx tsc --noEmit src/providers/opencode-provider.ts  # Type checking
npx eslint src/providers/opencode-provider.ts        # Linting (if configured)

# Project-wide validation
npm run type-check  # Or: npx tsc --noEmit
npm run lint        # Or: npx eslint .

# Expected: Zero type errors. If errors exist:
# 1. READ the error message carefully
# 2. Check import paths use .js extension
# 3. Verify all type imports match Provider interface exactly
# 4. Ensure readonly properties use correct types
```

### Level 2: Interface Compliance (Component Validation)

```bash
# TypeScript will validate Provider interface implementation automatically
# The 'implements Provider' clause enforces all methods exist with correct signatures

# Manual verification checks:
echo "Checking OpenCodeProvider implements Provider interface..."
grep -E "class OpenCodeProvider implements Provider" src/providers/opencode-provider.ts
echo "✓ Class declares Provider implementation"

grep -E "readonly id: ProviderId = .opencode." src/providers/opencode-provider.ts
echo "✓ id property is correct"

grep -E "readonly capabilities: ProviderCapabilities" src/providers/opencode-provider.ts
echo "✓ capabilities property declared"

grep -A 7 "capabilities:" src/providers/opencode-provider.ts | grep -E "sessions: true"
echo "✓ sessions capability is true (native support)"

echo "Checking all Provider methods are present..."
grep -E "async initialize\(" src/providers/opencode-provider.ts
grep -E "async terminate\(\)" src/providers/opencode-provider.ts
grep -E "async execute<T>" src/providers/opencode-provider.ts
grep -E "async registerMCPs\(" src/providers/opencode-provider.ts
grep -E "async loadSkills\(" src/providers/opencode-provider.ts
grep -E "normalizeModel\(" src/providers/opencode-provider.ts
echo "✓ All 6 Provider methods present"

# Expected: All checks pass, no missing methods or properties
```

### Level 3: Import Validation (Dependency Checking)

```bash
# Verify SDK import pattern (dynamic import in initialize)
grep -E 'await import\("@opencode-ai/sdk"\)' src/providers/opencode-provider.ts
echo "✓ SDK import uses correct package name"

# Verify all required type imports are present
grep -E "from.*types/providers.js" src/providers/opencode-provider.ts
echo "✓ Provider types imported"

grep -E "from.*types/agent.js" src/providers/opencode-provider.ts
echo "✓ Agent types imported"

grep -E "from.*types/sdk-primitives.js" src/providers/opencode-provider.ts
echo "✓ SDK primitive types imported"

grep -E "from.*utils/model-spec.js" src/providers/opencode-provider.ts
echo "✓ parseModelSpec utility imported"

# Verify .js extension usage (ESM requirement)
grep "\.ts'" src/providers/opencode-provider.ts && echo "ERROR: Found .ts extension in import" || echo "✓ All imports use .js extension"
```

### Level 4: Pattern Compliance (Code Quality)

```bash
# Verify AnthropicProvider pattern matching

# Check readonly property pattern
grep -E "^\s+readonly id: ProviderId = \"opencode\";" src/providers/opencode-provider.ts
echo "✓ id property matches AnthropicProvider pattern"

grep -A 6 "^\s+readonly capabilities:" src/providers/opencode-provider.ts | grep -E "satisfies ProviderCapabilities"
echo "✓ capabilities uses satisfies keyword for type safety"

# Check SDK field pattern
grep -E "private sdk: typeof import\(.@opencode-ai/sdk.\) \| null = null;" src/providers/opencode-provider.ts
echo "✓ SDK field matches lazy-loading pattern"

# Check initialize idempotent pattern
grep -A 3 "async initialize" src/providers/opencode-provider.ts | grep -E "if \(this\.sdk\)"
echo "✓ initialize() has idempotent check"

# Check terminate cleanup pattern
grep -A 3 "async terminate" src/providers/opencode-provider.ts | grep -E "if \(this\.sdk === null\)"
echo "✓ terminate() has idempotent check"

# Check normalizeModel delegates to parseModelSpec
grep -A 5 "normalizeModel" src/providers/opencode-provider.ts | grep -E "parseModelSpec\(model, \"opencode\"\)"
echo "✓ normalizeModel() delegates to parseModelSpec utility"

# Verify stub methods throw appropriate errors
grep "execute.*not implemented yet" src/providers/opencode-provider.ts
grep "registerMCPs.*not implemented yet" src/providers/opencode-provider.ts
grep "loadSkills.*not implemented yet" src/providers/opencode-provider.ts
echo "✓ Stub methods have descriptive error messages"

# Expected: All pattern checks pass
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] No type errors in OpenCodeProvider class
- [ ] All imports resolve correctly (check .js extensions)
- [ ] `implements Provider` clause present
- [ ] All 6 Provider methods have exact signature match
- [ ] Generic type parameter `<T>` used in execute() return

### Structure Validation

- [ ] File created at `src/providers/opencode-provider.ts`
- [ ] Readonly `id` property equals `"opencode"` (exact string match)
- [ ] Readonly `capabilities` has all 6 flags set to `true`
- [ ] Private `sdk` field typed as `typeof import("@opencode-ai/sdk") | null`
- [ ] `satisfies ProviderCapabilities` used for capabilities
- [ ] JSDoc comments present (at minimum class-level)

### Method Signature Validation

- [ ] `initialize(options?: ProviderOptions): Promise<void>`
- [ ] `terminate(): Promise<void>`
- [ ] `execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents): Promise<AgentResponse<T>>`
- [ ] `registerMCPs(servers: MCPServer[]): Promise<Tool[]>`
- [ ] `loadSkills(skills: Skill[]): Promise<void>`
- [ ] `normalizeModel(model: string): ModelSpec` (synchronous, no Promise)

### Pattern Compliance Validation

- [ ] `initialize()` has idempotent check: `if (this.sdk) { return; }`
- [ ] `initialize()` uses dynamic import: `await import("@opencode-ai/sdk")`
- [ ] `initialize()` wraps import failure in try/catch with descriptive error
- [ ] `initialize()` validates import not null
- [ ] `terminate()` has idempotent check: `if (this.sdk === null) { return; }`
- [ ] `terminate()` sets `this.sdk = null`
- [ ] `normalizeModel()` delegates to `parseModelSpec(model, "opencode")`
- [ ] `normalizeModel()` validates provider matches `this.id`

### Stub Implementation Validation

- [ ] `execute()` throws "not implemented yet" error
- [ ] `registerMCPs()` throws "not implemented yet" error
- [ ] `loadSkills()` throws "not implemented yet" error
- [ ] Stub methods have correct signatures (will be implemented in later subtasks)

### Documentation Validation

- [ ] Class-level JSDoc explains OpenCode SDK integration
- [ ] Capabilities documented (all 6 flags)
- [ ] SDK lazy-loading pattern documented
- [ ] Example usage provided in JSDoc

---

## Anti-Patterns to Avoid

- ❌ **Don't** set `sessions: false` - OpenCode has NATIVE sessions (key difference from Anthropic)
- ❌ **Don't** use `any` type for SDK field - must use `typeof import("@opencode-ai/sdk") | null`
- ❌ **Don't** use static import for SDK - must use dynamic `await import()` in initialize()
- ❌ **Don't** forget `.js` extension in import paths - required for ESM modules
- ❌ **Don't** omit `satisfies ProviderCapabilities` - provides extra type safety
- ❌ **Don't** make id/capabilities non-readonly - Provider interface requires readonly
- ❌ **Don't** implement full methods in this subtask - only create structure with stubs
- ❌ **Don't** skip idempotent checks in initialize/terminate - must be safe to call multiple times
- ❌ **Don't** use wrong package name - must be `@opencode-ai/sdk` (not `@opencode/sdk`)
- ❌ **Don't** forget `implements Provider` clause - TypeScript won't catch all method signature errors without it

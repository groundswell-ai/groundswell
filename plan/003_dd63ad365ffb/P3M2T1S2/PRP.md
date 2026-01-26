# Product Requirement Prompt (PRP): P3.M2.T1.S2 - Implement initialize() and terminate() methods

---

## Goal

**Feature Goal:** Implement the `initialize()` and `terminate()` lifecycle methods for OpenCodeProvider to enable proper SDK initialization and cleanup, supporting both client-only mode (connecting to existing OpenCode server) and full-stack mode (starting embedded server).

**Deliverable:** Fully implemented `initialize()` and `terminate()` methods in `src/providers/opencode-provider.ts` that:
1. Lazily load the `@opencode-ai/sdk` module via dynamic import
2. Support idempotent initialization (safe to call multiple times)
3. Store SDK client and server references for later use
4. Implement proper cleanup in `terminate()` (server shutdown, resource clearing)
5. Handle errors descriptively with actionable messages

**Success Definition:**
- `initialize()` loads SDK module successfully with idempotent behavior
- `terminate()` properly cleans up server and resources without throwing
- Methods follow the exact pattern established by `AnthropicProvider`
- All unit tests pass (idempotency, error handling, cleanup)
- Provider can be registered and initialized via `ProviderRegistry`

---

## Why

This task is critical because the OpenCode SDK uses a **client-server architecture** unlike standalone SDKs (e.g., Anthropic). The initialization must:
1. **Lazy load** the SDK module (optional dependency pattern)
2. **Start the OpenCode server** (full-stack mode) OR **connect to existing server** (client-only mode)
3. **Handle cleanup** explicitly (server process termination)

Without proper initialization/termination, the provider cannot:
- Execute prompts (SDK not loaded)
- Clean up resources (zombie processes)
- Support re-initialization after termination

**Business Impact:**
- Enables multi-provider LLM access through OpenCode SDK
- Provides 75+ provider support as specified in PRD
- Must handle external server lifecycle correctly

---

## What

### Method Specifications

#### `initialize(options?: ProviderOptions): Promise<void>`

**INPUT:**
- `options.endpoint?: string` - Server URL (default: `http://127.0.0.1:4096`)
- `options.apiKey?: string` - API key for authentication
- `options.sessionId?: string` - Ignored (OpenCode has native sessions)
- `options.timeout?: number` - Server startup timeout (ms)
- `options.headers?: Record<string, string>` - Custom headers

**LOGIC:**
1. Idempotent check: return if SDK already loaded
2. Dynamic import `@opencode-ai/sdk` module
3. Call `createOpencode()` with options (hostname, port, timeout, config)
4. Store `{ client, server }` references in private fields
5. Handle errors with descriptive messages

**OUTPUT:** Provider ready for use (SDK loaded, server running)

#### `terminate(): Promise<void>`

**INPUT:** None

**LOGIC:**
1. Idempotent check: return if SDK already null
2. Call `server.close()` to shut down OpenCode server process
3. Clear all internal references (client, server, mcp config, skills, sessions)
4. Never throw (best-effort cleanup)

**OUTPUT:** All resources released, provider ready for garbage collection

### Success Criteria

- [ ] SDK module loads successfully via dynamic import
- [ ] `initialize()` is idempotent (multiple calls safe)
- [ ] `terminate()` is idempotent (multiple calls safe)
- [ ] Server process starts in `initialize()` and stops in `terminate()`
- [ ] All internal state cleared in `terminate()`
- [ ] Error messages are descriptive and actionable
- [ ] Follows `AnthropicProvider` pattern exactly

---

## All Needed Context

### Context Completeness Check

_Validation: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**YES** - This PRP provides:
- Exact file locations to modify
- Line-by-line reference patterns from existing implementation
- Complete OpenCode SDK initialization API with examples
- All research documentation with URLs
- Test patterns and validation commands
- Gotchas and architectural differences

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# OpenCode SDK Research (P3.M1.T1.S2)
- file: plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Complete API documentation for @opencode-ai/sdk with initialization patterns
  section: Section 4 (Full Stack Initialization), Section 8 (Shutdown and Cleanup)
  critical: createOpencode() returns { client, server } with server.close() for cleanup
  gotcha: Server startup takes 1-3 seconds, async initialization required

# OpenCode Initialization Research (P3.M2.T1.S2)
- file: plan/003_dd63ad365ffb/P3M2T1S2/research/opencode-initialization-research.md
  why: Detailed initialization patterns, configuration options, and gotchas
  section: Section 4 (Full Stack Initialization), Section 8 (Shutdown and Cleanup)
  critical: Two modes: client-only (no cleanup) vs full-stack (requires server.close())
  gotcha: Must use await with createOpencode() - it's async!

# Provider Initialization Best Practices
- file: plan/003_dd63ad365ffb/P3M2T1S2/research/provider-initialization-best-practices.md
  why: Idempotent patterns, lazy loading, cleanup patterns for SDK wrappers
  section: Section 1 (Idempotent Initialization), Section 3 (Cleanup Patterns)
  critical: Use this.sdk as flag (no separate initialized boolean needed)
  gotcha: terminate() should never throw - use try-catch for cleanup

# Reference Implementation - AnthropicProvider
- file: src/providers/anthropic-provider.ts
  why: EXACT pattern to follow for initialize() and terminate()
  pattern: Lines 155-193 (initialize), Lines 204-228 (terminate)
  critical: Lazy loading with dynamic import, idempotent checks, descriptive errors
  gotcha: Options stored for later use in execute() - actual client creation deferred

# OpenCodeProvider (Existing Stub)
- file: src/providers/opencode-provider.ts
  why: Target file to modify, contains stub methods and class structure
  pattern: Lines 106-132 (initialize stub), Lines 143-157 (terminate stub)
  critical: Must preserve existing class structure and capabilities
  gotcha: Already has private sdk field - just need to implement the methods

# Provider Interface Definition
- file: src/types/providers.ts
  why: Provider interface with initialize/terminate method signatures
  pattern: Provider interface requires async initialize(options?) and async terminate()
  critical: Must match exact signature for ProviderRegistry integration

# Test Patterns - Initialize
- file: src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  why: Reference test patterns for initialize() method
  pattern: Idempotency tests, SDK verification tests, registry integration tests
  critical: Tests verify SDK has expected exports (query, createSdkMcpServer, tool)

# Test Patterns - Terminate
- file: src/__tests__/unit/providers/anthropic-provider-terminate.test.ts
  why: Reference test patterns for terminate() method
  pattern: Idempotent terminate, terminate after initialize, terminate before initialize
  critical: Tests verify method never throws

# Provider Registry
- file: src/providers/provider-registry.ts
  why: How providers are registered and initialized
  pattern: getInstance(), register(provider), initializeProvider(id), terminateAll()
  critical: OpenCodeProvider must be registered before use

# External Dependencies Documentation
- file: plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: OpenCode SDK API signatures and architectural notes
  section: OpenCode Agent SDK section (if present)
  critical: Model format uses providerID/modelID object, not string

# OpenCode SDK NPM Package
- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: Official package information and documentation links
  critical: Package name: @opencode-ai/sdk, Version: 1.1.36, License: MIT

# Vercel AI SDK Comparison
- url: https://sdk.vercel.ai/docs
  why: Compare factory pattern vs class-based provider pattern
  critical: Groundswell uses class-based approach with explicit lifecycle
```

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts      # REFERENCE IMPLEMENTATION (FOLLOW THIS PATTERN)
│   ├── opencode-provider.ts        # TARGET FILE - MODIFY initialize() and terminate()
│   ├── provider-registry.ts        # Provider registration and lifecycle management
│   └── index.ts                    # Public exports
├── types/
│   └── providers.ts                # Provider interface definition
├── core/
│   └── mcp-handler.ts              # MCP integration (used in later tasks)
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider-initialize.test.ts  # TEST PATTERNS
            ├── anthropic-provider-terminate.test.ts   # TEST PATTERNS
            └── ...
```

### Desired Codebase Tree with Files to be Added

```bash
# No new files - modifications only:
src/
├── providers/
│   └── opencode-provider.ts        # MODIFY: Implement initialize() and terminate()

# New test files (create after implementation):
src/
└── __tests__/
    └── unit/
        └── providers/
            ├── opencode-provider-initialize.test.ts  # CREATE: Test initialize()
            └── opencode-provider-terminate.test.ts   # CREATE: Test terminate()
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: OpenCode SDK Architecture
// Unlike Anthropic SDK (standalone library), OpenCode requires external server process
// User must run: npm install -g opencode
// Provider must start server in initialize() and stop in terminate()

// CRITICAL: Two Initialization Modes
// Mode A: Client-only - createOpencodeClient() - No cleanup needed
// Mode B: Full-stack - createOpencode() - Must call server.close()
// DECISION: Use full-stack mode for embedded usage

// CRITICAL: Async Initialization Required
// createOpencode() is ASYNC - must use await
// ❌ BAD: const result = createOpencode(); // Returns Promise, not result
// ✅ GOOD: const { client, server } = await createOpencode();

// GOTCHA: Server Startup Time
// OpenCode server takes 1-3 seconds to start
// Initialize may timeout if server.options.timeout is too low
// Default to 30000ms (30 seconds) for safety

// GOTCHA: Port Conflicts
// Default port 4096 may be in use
// Implement port fallback or handle EADDRINUSE error
// For MVP: Let error propagate with descriptive message

// GOTCHA: Server Cleanup Required
// Must call server.close() to terminate server process
// Forgetting cleanup leaves zombie processes
// Use try-finally pattern for safety

// PATTERN: Idempotent Initialize (from AnthropicProvider)
// Check if SDK already loaded before importing
if (this.sdk) {
  return; // Idempotent - safe to call multiple times
}

// PATTERN: Lazy Loading with Dynamic Import
// Load SDK at runtime, not build time
this.sdk = await import("@opencode-ai/sdk");

// PATTERN: Descriptive Error Messages
// Preserve original error context
throw new Error(
  `Failed to load @opencode-ai/sdk: ${error instanceof Error ? error.message : "Unknown error"}`
);

// PATTERN: Terminate Never Throws
// Cleanup is best-effort - log errors but don't throw
if (this.server) {
  try {
    this.server.close();
  } catch (error) {
    console.warn('Error during server cleanup:', error);
  }
}

// GOTCHA: Type Safety with Generated Types
// OpenCode types are auto-generated from OpenAPI spec
// Use typeof import() for accurate module types
private sdk: typeof import("@opencode-ai/sdk") | null = null;

// GOTCHA: Server Reference Type
// createOpencode() returns { client, server }
// server has { url: string, close(): void }
private server: { url: string; close(): void } | null = null;
private client: import("@opencode-ai/sdk").OpencodeClient | null = null;

// PATTERN: Match AnthropicProvider Exactly
// - Same private field names (sdk)
// - Same idempotent check pattern (if (this.sdk) return)
// - Same error handling (try-catch with descriptive messages)
// - Same terminate pattern (clear all references)

// GOTCHA: ProviderOptions Mapping
// options.endpoint -> hostname (for createOpencode ServerOptions)
// options.apiKey -> config.apiKey (for createOpencode Config)
// options.timeout -> timeout (for createOpencode ServerOptions)
// options.sessionId -> Ignored (OpenCode has native sessions)

// CRITICAL: Follow Existing File Structure
// OpenCodeProvider already exists with stub methods
// PRESERVE all existing structure, only implement the method bodies
// Lines 106-132: initialize() stub
// Lines 143-157: terminate() stub
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models required. Using existing types from `src/types/providers.ts`:

```typescript
// Existing types to use:
import type {
  Provider,              // Interface to implement
  ProviderId,            // 'opencode'
  ProviderCapabilities,  // Already defined in OpenCodeProvider
  ProviderOptions,       // Input to initialize()
} from "../types/providers.js";

// OpenCode SDK types (from @opencode-ai/sdk package)
import type {
  OpencodeClient,        // Client class
  ServerOptions,         // createOpencode() options
  Config,                // Client configuration
} from "@opencode-ai/sdk";
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE src/providers/opencode-provider.ts - Private Fields
  - ADD: private server field to store server reference
  - TYPE: { url: string; close(): void } | null
  - ADD: private client field to store client reference
  - TYPE: import("@opencode-ai/sdk").OpencodeClient | null
  - PRESERVE: Existing sdk field (already defined)
  - PLACEMENT: After capabilities declaration (after line 83)

Task 2: IMPLEMENT initialize() method body
  - LOCATE: Lines 106-132 (existing stub)
  - PRESERVE: Method signature and JSDoc
  - IMPLEMENT: Idempotent check (if this.sdk return)
  - IMPLEMENT: Dynamic import of @opencode-ai/sdk
  - IMPLEMENT: Error handling with descriptive messages
  - IMPLEMENT: createOpencode() call with options mapping
  - IMPLEMENT: Store client and server references
  - IMPLEMENT: Validate initialization succeeded
  - PATTERN: Follow AnthropicProvider lines 155-193 exactly
  - GOTCHA: Map ProviderOptions to ServerOptions correctly

Task 3: IMPLEMENT terminate() method body
  - LOCATE: Lines 143-157 (existing stub)
  - PRESERVE: Method signature and JSDoc
  - IMPLEMENT: Idempotent check (if this.sdk === null return)
  - IMPLEMENT: Server cleanup with try-catch (never throw)
  - IMPLEMENT: Clear server reference
  - IMPLEMENT: Clear client reference
  - IMPLEMENT: Clear sdk reference
  - PATTERN: Follow AnthropicProvider lines 204-228 exactly
  - GOTCHA: Call server.close() before clearing references

Task 4: VERIFY type safety
  - CHECK: TypeScript compilation succeeds
  - CHECK: No type errors in vscode/tsc
  - CHECK: typeof import() pattern used correctly
  - RUN: npx tsc --noEmit

Task 5: CREATE test file for initialize()
  - FILE: src/__tests__/unit/providers/opencode-provider-initialize.test.ts
  - IMPLEMENT: Idempotency test (multiple initialize calls)
  - IMPLEMENT: SDK loading test (verify imports)
  - IMPLEMENT: Error handling test (missing SDK)
  - IMPLEMENT: Registry integration test
  - PATTERN: Follow anthropic-provider-initialize.test.ts structure

Task 6: CREATE test file for terminate()
  - FILE: src/__tests__/unit/providers/opencode-provider-terminate.test.ts
  - IMPLEMENT: Idempotent terminate test
  - IMPLEMENT: Terminate after initialize test
  - IMPLEMENT: Terminate before initialize test
  - IMPLEMENT: Cleanup verification test
  - PATTERN: Follow anthropic-provider-terminate.test.ts structure
```

### Implementation Patterns & Key Details

```typescript
// =====================================================
// PATTERN 1: Idempotent Initialize
// =====================================================
// FROM: src/providers/anthropic-provider.ts:156-159
async initialize(options?: ProviderOptions): Promise<void> {
  // Idempotent check: if SDK is already loaded, return immediately
  if (this.sdk) {
    return;
  }

  // ... initialization code
}

// =====================================================
// PATTERN 2: Lazy Loading with Dynamic Import
// =====================================================
// FROM: src/providers/anthropic-provider.ts:163-170
try {
  this.sdk = await import("@opencode-ai/sdk");
} catch (error) {
  throw new Error(
    `Failed to load @opencode-ai/sdk: ${error instanceof Error ? error.message : "Unknown error"}`
  );
}

// CRITICAL: Validate import didn't return null
if (!this.sdk) {
  throw new Error("Failed to load @opencode-ai/sdk: Import returned null");
}

// =====================================================
// PATTERN 3: OpenCode SDK Initialization
// =====================================================
// UNIQUE TO OpenCode: Must call createOpencode() with await
// FROM: research/opencode-initialization-research.md:263-292
const { client, server } = await this.sdk.createOpencode({
  hostname: options?.endpoint?.replace(/^https?:\/\//, '') || '127.0.0.1',
  port: 4096,  // OpenCode default port
  timeout: options?.timeout || 30000,  // 30 second default
  config: {
    apiKey: options?.apiKey,
    // url: options?.endpoint,  // Use endpoint as URL if provided
  },
});

// GOTCHA: endpoint might be full URL (http://localhost:4096)
// Need to extract hostname if full URL provided

// =====================================================
// PATTERN 4: Store References
// =====================================================
// Store for later use in execute() and terminate()
this.client = client;
this.server = server;

// Log successful initialization
console.log(`OpenCode initialized at ${server.url}`);

// =====================================================
// PATTERN 5: Idempotent Terminate
// =====================================================
// FROM: src/providers/anthropic-provider.ts:206-209
async terminate(): Promise<void> {
  // Idempotent check: if SDK is already null, return immediately
  // FOLLOW: initialize() pattern at lines 107-110
  if (this.sdk === null) {
    return;
  }

  // ... cleanup code
}

// =====================================================
// PATTERN 6: Best-Effort Server Cleanup
// =====================================================
// UNIQUE TO OpenCode: Must close server process
// CRITICAL: Use try-catch to never throw in terminate()
if (this.server) {
  try {
    this.server.close();
  } catch (error) {
    // Log but don't throw - cleanup is best-effort
    console.warn('Error closing OpenCode server:', error);
  }
  this.server = null;
}

// =====================================================
// PATTERN 7: Clear All References
// =====================================================
// FROM: src/providers/anthropic-provider.ts:217-224
this.client = null;
this.sdk = null;

// GOTCHA: No return value needed - Promise<void> is implicit

// =====================================================
// PROVIDER OPTIONS MAPPING
// =====================================================
// ProviderOptions -> OpenCode ServerOptions mapping:
// {
//   endpoint?: string  -> hostname (extract from URL) or config.url
//   apiKey?: string    -> config.apiKey
//   timeout?: number   -> timeout (server startup timeout)
//   sessionId?: string -> Ignored (native sessions)
//   headers?: Record<string, string> -> Not supported by SDK
// }

// Example mapping function:
function mapProviderOptions(options?: ProviderOptions) {
  const serverOptions: {
    hostname?: string;
    port?: number;
    timeout?: number;
    config?: {
      url?: string;
      apiKey?: string;
    };
  } = {
    port: 4096,
    timeout: 30000,
  };

  if (options?.endpoint) {
    // Check if endpoint is full URL or just hostname
    if (options.endpoint.includes('://')) {
      serverOptions.config = { url: options.endpoint };
    } else {
      serverOptions.hostname = options.endpoint;
    }
  }

  if (options?.apiKey) {
    serverOptions.config = {
      ...serverOptions.config,
      apiKey: options.apiKey,
    };
  }

  if (options?.timeout) {
    serverOptions.timeout = options.timeout;
  }

  return serverOptions;
}
```

### Integration Points

```yaml
PROVIDER_REGISTRY:
  - import: src/providers/provider-registry.ts
  - usage: ProviderRegistry.getInstance().register(opencodeProvider)
  - usage: ProviderRegistry.getInstance().initializeProvider('opencode')
  - usage: ProviderRegistry.getInstance().terminateAll()
  - note: Registry manages provider lifecycle externally

TYPE_SYSTEM:
  - import: src/types/providers.ts
  - usage: Provider interface (initialize, terminate, execute, etc.)
  - usage: ProviderOptions type for initialize() parameter
  - usage: ProviderId type ('opencode')

MCP_INTEGRATION:
  - note: MCP integration happens in P3.M2.T1.S4 (registerMCPs method)
  - note: No MCP setup needed in this task

SESSION_MANAGEMENT:
  - note: Session management happens in P3.M2.T1.S3 (execute method)
  - note: Native sessions via OpenCode SDK
  - note: No session state needed in initialize/terminate
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file modification - fix before proceeding
npx tsc --noEmit                      # Type check with TypeScript compiler
npx eslint src/providers/opencode-provider.ts --fix  # Lint and auto-fix

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

**Validation Gates:**
- [ ] TypeScript compilation succeeds with no type errors
- [ ] ESLint passes with no warnings
- [ ] File follows existing code formatting (prettier/tap)

### Level 2: Unit Tests (Component Validation)

```bash
# Test initialize() method
npm test -- src/__tests__/unit/providers/opencode-provider-initialize.test.ts

# Test terminate() method
npm test -- src/__tests__/unit/providers/opencode-provider-terminate.test.ts

# Test provider registry integration
npm test -- src/__tests__/unit/providers/provider-registry.test.ts

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

**Validation Gates:**
- [ ] Initialize tests pass (idempotency, SDK loading, error handling)
- [ ] Terminate tests pass (idempotency, cleanup, never throws)
- [ ] Registry integration tests pass
- [ ] All tests use correct patterns (match AnthropicProvider tests)

### Level 3: Integration Testing (System Validation)

```bash
# Manual integration test - create test script
cat > test-opencode-provider.ts << 'EOF'
import { OpenCodeProvider } from './src/providers/opencode-provider.js';
import { ProviderRegistry } from './src/providers/provider-registry.js';

async function test() {
  const provider = new OpenCodeProvider();
  const registry = ProviderRegistry.getInstance();

  // Register provider
  registry.register(provider);
  console.log('✓ Provider registered');

  // Initialize provider
  await registry.initializeProvider('opencode');
  console.log('✓ Provider initialized');

  // Check registry status
  console.log('Registry status:', registry.getStatus('opencode'));
  console.log('Is ready:', registry.isReady('opencode'));

  // Terminate provider
  await registry.terminateAll();
  console.log('✓ Provider terminated');

  console.log('All integration tests passed!');
}

test().catch(console.error);
EOF

# Run integration test
node test-opencode-provider.ts

# Expected: All steps complete successfully
```

**Validation Gates:**
- [ ] Provider registers successfully
- [ ] Provider initializes without errors
- [ ] Registry reports correct status
- [ ] Provider terminates cleanly
- [ ] No zombie processes remain (check with ps aux | grep opencode)

### Level 4: Manual Verification

```bash
# Verification checklist

# 1. Check SDK module was loaded
# Should see: "OpenCode initialized at http://127.0.0.1:4096"
# Or custom URL if endpoint option provided

# 2. Verify idempotency
# Run initialize() twice - second call should return immediately

# 3. Verify cleanup
# After terminate(), all private fields should be null:
# - this.sdk === null
# - this.server === null
# - this.client === null

# 4. Verify no zombie processes
ps aux | grep -i opencode
# Should show no opencode processes after terminate()

# 5. Check error messages
# Try with invalid endpoint - should get descriptive error
```

**Validation Gates:**
- [ ] Server startup message logged
- [ ] Multiple initialize() calls don't cause errors
- [ ] terminate() never throws
- [ ] All references cleared after terminate()
- [ ] Descriptive error messages for failures

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] Linting passes: `npx eslint src/providers/opencode-provider.ts`
- [ ] All unit tests pass: `npm test -- opencode-provider`
- [ ] Integration test passes: manual test script
- [ ] No type errors in IDE

### Feature Validation

- [ ] `initialize()` loads SDK module successfully
- [ ] `initialize()` is idempotent (multiple calls safe)
- [ ] `terminate()` is idempotent (multiple calls safe)
- [ ] Server starts in `initialize()` and stops in `terminate()`
- [ ] All internal state cleared in `terminate()`
- [ ] Error messages are descriptive and actionable

### Code Quality Validation

- [ ] Follows `AnthropicProvider` pattern exactly
- [ ] Private field names match pattern (`sdk`, `server`, `client`)
- [ ] Idempotent checks use `this.sdk` truthiness
- [ ] Error handling preserves original error context
- [ ] JSDoc comments updated (remove @remarks about stub)

### Integration Validation

- [ ] ProviderRegistry can register provider
- [ ] ProviderRegistry can initialize provider
- [ ] ProviderRegistry can terminate provider
- [ ] No conflicts with existing providers

### Documentation Validation

- [ ] JSDoc comments are accurate
- [ ] Implementation notes removed (no "not implemented yet")
- [ ] Error messages are actionable

---

## Anti-Patterns to Avoid

- ❌ **Don't create new patterns** - Follow `AnthropicProvider` exactly
- ❌ **Don't skip idempotent checks** - Must check `this.sdk` before any operation
- ❌ **Don't throw in terminate()** - Use try-catch for cleanup
- ❌ **Don't forget server.close()** - Leaves zombie processes
- ❌ **Don't use sync initialization** - `createOpencode()` is async
- ❌ **Don't hardcode port** - Use options.endpoint for flexibility
- ❌ **Don't ignore errors** - Preserve error context in messages
- ❌ **Don't modify existing structure** - Only implement method bodies
- ❌ **Don't add extra state flags** - Use `this.sdk` as initialization flag
- ❌ **Don't skip validation** - Check for null after import

---

## Success Metrics

**Confidence Score:** 9/10

**Rationale:**
- Comprehensive research completed with all OpenCode SDK patterns documented
- Reference implementation (`AnthropicProvider`) provides exact pattern to follow
- Test patterns established from existing test files
- All gotchas and architectural differences documented
- Validation commands are project-specific and verified

**Validation:** The completed PRP enables one-pass implementation of `initialize()` and `terminate()` methods with full confidence, following established patterns and handling all OpenCode SDK specific requirements.

---

## Appendix: Complete Implementation Reference

### Full initialize() Implementation

```typescript
/**
 * Initialize the OpenCode provider
 *
 * Loads the OpenCode SDK and starts the OpenCode server.
 * Uses full-stack mode (embedded server) for complete lifecycle control.
 *
 * @param options - Optional provider configuration (endpoint, apiKey, timeout, etc.)
 * @throws {Error} When SDK module fails to load
 * @throws {Error} When server fails to start
 * @remarks
 * Implemented in P3.M2.T1.S2
 */
async initialize(options?: ProviderOptions): Promise<void> {
  // Idempotent check: if SDK is already loaded, return immediately
  // FOLLOW: AnthropicProvider pattern at src/providers/anthropic-provider.ts:156-159
  if (this.sdk) {
    return;
  }

  // Dynamic import of the OpenCode SDK for lazy loading
  // This allows optional dependencies and faster startup
  try {
    this.sdk = await import("@opencode-ai/sdk");
  } catch (error) {
    // Rethrow with descriptive message for ProviderRegistry to track
    throw new Error(
      `Failed to load @opencode-ai/sdk: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Validate import succeeded
  if (!this.sdk) {
    throw new Error(
      "Failed to load @opencode-ai/sdk: Import returned null",
    );
  }

  // Map ProviderOptions to OpenCode ServerOptions
  const serverOptions: {
    hostname?: string;
    port?: number;
    timeout?: number;
    config?: {
      url?: string;
      apiKey?: string;
    };
  } = {
    port: 4096,  // OpenCode default port
    timeout: options?.timeout || 30000,  // 30 second default
  };

  // Handle endpoint option (may be full URL or just hostname)
  if (options?.endpoint) {
    if (options.endpoint.includes('://')) {
      // Full URL provided (e.g., http://localhost:4096)
      serverOptions.config = {
        ...serverOptions.config,
        url: options.endpoint,
      };
    } else {
      // Just hostname provided (e.g., localhost)
      serverOptions.hostname = options.endpoint;
    }
  }

  // Handle API key option
  if (options?.apiKey) {
    serverOptions.config = {
      ...serverOptions.config,
      apiKey: options.apiKey,
    };
  }

  // Start OpenCode server and get client
  // CRITICAL: createOpencode() is async - must await
  // CRITICAL: Returns { client, server } - server needs cleanup
  try {
    const { client, server } = await this.sdk.createOpencode(serverOptions);

    this.client = client;
    this.server = server;

    console.log(`OpenCode initialized at ${server.url}`);
  } catch (error) {
    // Handle server startup failures
    throw new Error(
      `Failed to start OpenCode server: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Note: sessionId option ignored - OpenCode has native sessions
  // Note: headers option not supported by OpenCode SDK
}
```

### Full terminate() Implementation

```typescript
/**
 * Terminate the provider and cleanup resources
 *
 * Shuts down the OpenCode server and clears all references.
 * The server process is terminated and all resources are released.
 *
 * @remarks
 * Implemented in P3.M2.T1.S2
 */
async terminate(): Promise<void> {
  // Idempotent check: if SDK is already null, return immediately
  // FOLLOW: initialize() pattern (check this.sdk === null for terminate)
  if (this.sdk === null) {
    return;
  }

  // Close OpenCode server (best-effort - never throw)
  // CRITICAL: Must call server.close() to terminate server process
  // CRITICAL: Use try-catch to prevent throwing in terminate()
  if (this.server) {
    try {
      this.server.close();
    } catch (error) {
      // Log but don't throw - cleanup is best-effort
      console.warn('Error closing OpenCode server:', error);
    }
    this.server = null;
  }

  // Clear client reference
  this.client = null;

  // Clear SDK reference to allow garbage collection
  this.sdk = null;

  // GOTCHA: No return value needed - Promise<void> is implicit
  // GOTCHA: No throws possible from null check and assignment
}
```

### Required Private Fields

```typescript
/**
 * OpenCode SDK module (lazy loaded)
 *
 * Dynamically imported in initialize() to support optional dependencies.
 * Typed using typeof import() pattern for accurate module types.
 *
 * @internal
 */
private sdk: typeof import("@opencode-ai/sdk") | null = null;

/**
 * OpenCode server instance
 *
 * Stores the server control object from createOpencode().
 * Has { url: string, close(): void } shape.
 *
 * @internal
 */
private server: { url: string; close(): void } | null = null;

/**
 * OpenCode client instance
 *
 * Stores the OpencodeClient for use in execute() method.
 *
 * @internal
 */
private client: import("@opencode-ai/sdk").OpencodeClient | null = null;
```

---

**End of PRP**

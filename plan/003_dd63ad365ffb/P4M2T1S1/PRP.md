# PRP: P4.M2.T1.S1 - Get Provider Instance in Agent Constructor

---

## Goal

**Feature Goal**: Integrate ProviderRegistry into the Agent constructor to retrieve and store the provider instance for execution, enabling the Agent class to delegate LLM calls to the appropriate provider (Anthropic or OpenCode) instead of using the SDK directly.

**Deliverable**: Modified `src/core/agent.ts` Agent constructor that:
1. Imports and uses `ProviderRegistry.getInstance()` to get the registry singleton
2. Calls `ProviderRegistry.getInstance().get(effectiveProvider)` to retrieve the provider instance
3. Throws `Error('Provider not registered')` if the provider is not found in the registry
4. Stores the provider instance in a new private field `this.provider: Provider`
5. Uses the stored provider reference for subsequent LLM execution (in later tasks)

**Success Definition**:
- Agent constructor successfully retrieves provider instance from ProviderRegistry
- Provider instance stored in private `this.provider` field
- Proper error handling for "Provider not registered" case
- TypeScript compilation passes without errors
- Existing tests continue to pass (backward compatibility maintained)

---

## User Persona (if applicable)

**Target User**: Developer integrating multi-provider LLM support into Agent instances

**Use Case**: When an Agent is instantiated, it needs to obtain the actual provider implementation (AnthropicProvider or OpenCodeProvider) from the registry based on the resolved provider configuration.

**User Journey**:
1. Developer calls `configureProviders()` to set up global provider configuration and register providers
2. Developer creates Agent: `new Agent({ provider: 'anthropic' })`
3. Agent constructor resolves effective provider ID (via resolveProviderConfig cascade)
4. Agent constructor calls `ProviderRegistry.getInstance().get(effectiveProvider)`
5. Provider instance is stored in `this.provider` for later use in `executePrompt()`

**Pain Points Addressed**:
- Currently Agent uses Anthropic SDK directly (`query()` from `@anthropic-ai/claude-agent-sdk`)
- No abstraction layer for switching between providers
- Cannot support OpenCode or future providers without code changes

---

## Why

- **Multi-Provider Foundation**: This is the critical integration task that connects the Agent class to the provider registry system built in P1.M3. Without this, Agents cannot use the provider abstraction layer.
- **Enables Provider Delegation**: Storing the provider instance enables future tasks (P4.M2.T1.S3 - Refactor Agent.prompt() to use provider.execute()) to replace direct SDK calls with provider-based execution.
- **Configuration Cascade Integration**: This task integrates the `resolveProviderConfig()` utility from P1.M2.T1.S4 with the Agent constructor, implementing the full configuration cascade (global → agent → prompt).
- **Error Handling**: Enforces provider registration at Agent instantiation time, providing early feedback if a requested provider is not available.
- **Dependency for Future Tasks**: This unblocks P4.M2.T1.S2 (Create tool executor), P4.M2.T1.S3 (Refactor Agent.prompt()), and P4.M2.T1.S4 (Refactor Agent.stream()).

---

## What

Update the Agent class constructor to:
1. Resolve the effective provider ID using `resolveProviderConfig()` (global config + agent config)
2. Get the provider instance from `ProviderRegistry.getInstance().get(effectiveProvider)`
3. Throw `Error('Provider not registered')` if provider not found
4. Store provider instance in new private field `this.provider`
5. Maintain backward compatibility with existing Agent instantiation

### Success Criteria

- [ ] `ProviderRegistry` imported in Agent class
- [ ] `resolveProviderConfig` and `getGlobalProviderConfig` imported
- [ ] Private field `this.provider: Provider` added to Agent class
- [ ] Constructor calls `resolveProviderConfig()` to get effective provider
- [ ] Constructor calls `ProviderRegistry.getInstance().get(effectiveProvider)`
- [ ] Constructor throws `Error('Provider not registered')` if provider not found
- [ ] TypeScript compilation passes: `npm run build` or `tsc --noEmit`
- [ ] Existing tests pass: `npm test -- src/__tests__/unit/core/agent.test.ts`

---

## All Needed Context

### Context Completeness Check

_This PRP passes the "No Prior Knowledge" test: if someone knew nothing about this codebase, they would have everything needed to implement this successfully._

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# ========== CURRENT AGENT CONSTRUCTOR ==========
- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Target file for modification - Agent constructor to be updated
  pattern: Lines 98-124 - Current constructor implementation
  gotcha: Constructor already stores this.providerId and this.providerOptions from P4.M1.T1.S2
  critical: Do NOT modify existing constructor signature or MCP handler initialization

# ========== PROVIDER REGISTRY ==========
- file: /home/dustin/projects/groundswell/src/providers/provider-registry.ts
  why: ProviderRegistry singleton class - source of getInstance() and get() methods
  pattern: Lines 139-147 - getInstance() singleton access pattern
  pattern: Lines 218-223 - get() method for retrieving providers by ID
  gotcha: get() returns `Provider | undefined` - must check for undefined and throw error
  critical: Error message format: `Provider '${id}' is not registered` (from initializeProvider method)

# ========== PROVIDER CONFIG UTILITIES ==========
- file: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  why: resolveProviderConfig() and getGlobalProviderConfig() utilities
  pattern: Lines 338-363 - resolveProviderConfig() function signature and implementation
  pattern: Lines 288-335 - getGlobalProviderConfig() function with defaults
  gotcha: getGlobalProviderConfig() returns defaults even if not explicitly configured
  critical: resolveProviderConfig requires (globalConfig, agentProvider, agentOptions) parameters

# ========== PROVIDER TYPES ==========
- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Provider interface, ProviderId type, ProviderOptions interface
  pattern: Lines 90-120 - Provider interface with initialize, terminate, execute methods
  pattern: Lines 25-35 - ProviderId type: 'anthropic' | 'opencode'
  pattern: Lines 37-50 - ProviderOptions interface with optional fields

# ========== EXISTING PRP EXAMPLES ==========
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M1T1S2/PRP.md
  why: Previous PRP for Agent constructor modification - shows pattern and style
  pattern: Follow same PRP structure, validation levels, anti-patterns section

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M1T1S1/PRP.md
  why: PRP for adding provider fields to AgentConfig
  pattern: Comprehensive JSDoc, configuration cascade documentation

# ========== TESTING PATTERNS ==========
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/provider-registry.test.ts
  why: Test patterns for ProviderRegistry usage, error handling
  pattern: Lines 495-500 - Testing "provider not registered" error with expect().rejects.toThrow()
  pattern: createMockProvider() helper function pattern

- file: /home/dustin/projects/groundswell/src/__tests__/unit/core/agent.test.ts
  why: Existing Agent test patterns to follow
  pattern: Constructor tests with various AgentConfig options
  pattern: beforeEach/afterEach for test isolation

# ========== ERROR HANDLING PATTERNS ==========
- file: /home/dustin/projects/groundswell/src/providers/provider-registry.ts
  why: Reference pattern for "not found" error handling
  pattern: Lines 286-289 - Check for undefined and throw with descriptive message
  pattern: Template literal with backticks: `Provider '${id}' is not registered`

# ========== PROJECT CONFIGURATION ==========
- file: /home/dustin/projects/groundswell/package.json
  why: Test scripts and dependencies
  section: Lines 32-50 - npm scripts (test, build, lint)
  critical: Test command is "npm test" which runs vitest

- file: /home/dustin/projects/groundswell/tsconfig.json
  why: TypeScript configuration for type checking
  section: strict mode enabled, ES2022 target
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── core/
│   ├── agent.ts                    # MODIFICATION TARGET - Agent constructor
│   ├── prompt.ts                   # Reference for optional config patterns
│   └── ...
├── providers/
│   ├── provider-registry.ts        # ProviderRegistry singleton (getInstance, get)
│   ├── anthropic-provider.ts       # AnthropicProvider implementation
│   ├── opencode-provider.ts        # OpenCodeProvider implementation
│   └── index.ts                    # Provider exports
├── types/
│   ├── providers.ts                # Provider, ProviderId, ProviderOptions types
│   ├── agent.ts                    # AgentConfig interface (has provider fields)
│   └── index.ts                    # Type exports
├── utils/
│   ├── provider-config.ts          # resolveProviderConfig, getGlobalProviderConfig
│   └── ...
└── __tests__/
    ├── unit/
    │   ├── core/
    │   │   └── agent.test.ts       # Existing Agent tests
    │   └── providers/
    │       └── provider-registry.test.ts  # Registry test patterns
```

### Desired Codebase Tree (changes only)

```bash
# MODIFIED FILES:
src/
├── core/
│   └── agent.ts                    # MODIFIED
#     - Add imports: ProviderRegistry, Provider, resolveProviderConfig, getGlobalProviderConfig
#     - Add private field: this.provider: Provider
#     - Update constructor to resolve provider and get from registry

# NO NEW FILES - Only modifying src/core/agent.ts
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: ProviderRegistry.get() returns Provider | undefined
// WRONG: const provider = registry.get(id); await provider.execute(...);
// RIGHT: const provider = registry.get(id); if (!provider) { throw new Error(...); }

// CRITICAL: getGlobalProviderConfig() may not be initialized when Agent constructor runs
// SOLUTION: Use getGlobalProviderConfig() which returns defaults even if not configured
// The defaults are: { defaultProvider: 'anthropic', providerDefaults: {} }

// CRITICAL: resolveProviderConfig() requires GlobalProviderConfig as first parameter
// The agent's providerId and providerOptions are stored from AgentConfig (P4.M1.T1.S2)
// Call: resolveProviderConfig(globalConfig, this.providerId, this.providerOptions)

// CRITICAL: Error message format must match existing pattern
// From provider-registry.ts line 287: throw new Error(`Provider '${id}' is not registered`);
// Use same format for consistency

// CRITICAL: Private field naming convention in Agent class
// Current fields use NO underscore prefix: this.config, this.model, this.mcpHandler
// Follow this pattern: this.provider (NOT this._provider)

// CRITICAL: Constructor signature MUST NOT CHANGE
// Keep: constructor(config: AgentConfig = {})
// Do NOT add new parameters - all provider config comes through AgentConfig

// CRITICAL: Preserve all existing constructor logic
// MCP handler initialization (lines 109-123) must remain unchanged
// Only ADD provider resolution logic, don't modify existing code

// CRITICAL: ProviderRegistry is a singleton - always use getInstance()
// WRONG: const registry = new ProviderRegistry();
// RIGHT: const registry = ProviderRegistry.getInstance();

// GOTCHA: TypeScript requires import type for type-only imports
// Use: import type { Provider } from '../types/providers.js';
// Use: import { ProviderRegistry } from '../providers/index.js';

// GOTCHA: ES Module imports must use .js extension
// WRONG: import { ProviderRegistry } from '../providers/index';
// RIGHT: import { ProviderRegistry } from '../providers/index.js';

// CRITICAL: The provider field should be readonly
// Follow pattern of other readonly fields: private readonly provider: Provider;
// This prevents reassignment after constructor

// CRITICAL: Consider testing scenario where ProviderRegistry has no providers
// In this case, get('anthropic') returns undefined and we should throw
// This is expected behavior - providers must be registered before Agent instantiation
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - using existing types:
- `Provider` interface from `src/types/providers.ts` (lines 90-120)
- `ProviderId` type: `'anthropic' | 'opencode'`
- `GlobalProviderConfig` interface from `src/types/providers.ts`
- `AgentConfig` interface (already has provider fields from P4.M1.T1.S1)

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/agent.ts - Add imports for provider infrastructure
  - ADD import: import { ProviderRegistry } from '../providers/index.js';
  - ADD import: import type { Provider } from '../types/providers.js';
  - ADD import: import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';
  - PLACE at top of file with other imports (after line 50)
  - PRESERVE all existing imports
  - ENSURE correct relative paths from src/core/ to src/providers/ and src/utils/

Task 2: MODIFY src/core/agent.ts - Add private field for provider instance
  - ADD to class: private readonly provider: Provider;
  - PLACE after existing private fields (after line 92: providerOptions)
  - FOLLOW existing pattern: no underscore prefix, readonly modifier
  - TYPE: Provider (imported from types/providers.js)

Task 3: MODIFY src/core/agent.ts - Update constructor to resolve provider
  - FIND: constructor(config: AgentConfig = {}) method (lines 98-124)
  - ADD after this.providerOptions assignment (line 107):
      // Resolve provider configuration using cascade
      const globalConfig = getGlobalProviderConfig();
      const resolved = resolveProviderConfig(
        globalConfig,
        this.providerId,
        this.providerOptions
      );
      const effectiveProvider = resolved.provider;

  - PRESERVE all existing constructor logic
  - PLACE before MCP handler initialization (line 109)

Task 4: MODIFY src/core/agent.ts - Get provider instance from registry
  - ADD after effectiveProvider resolution (from Task 3):
      // Get provider instance from registry
      const registry = ProviderRegistry.getInstance();
      const providerInstance = registry.get(effectiveProvider);
      if (!providerInstance) {
        throw new Error(`Provider '${effectiveProvider}' is not registered`);
      }
      this.provider = providerInstance;

  - PRESERVE all existing constructor logic
  - PLACE before MCP handler initialization (line 109)
  - ENSURE error message format matches existing pattern

Task 5: VERIFY TypeScript compilation
  - RUN: npm run build OR tsc --noEmit
  - EXPECT: Zero errors
  - IF errors: Check import paths, type annotations, field declarations

Task 6: VERIFY backward compatibility
  - TEST: Existing code patterns still work
  - EXAMPLE: new Agent() should work (uses default provider from getGlobalProviderConfig)
  - EXAMPLE: new Agent({ provider: 'anthropic' }) should work
  - NOTE: Tests will fail if providers not registered - this is expected behavior

Task 7: RUN existing tests
  - RUN: npm test -- src/__tests__/unit/core/agent.test.ts
  - EXPECT: May have failures if providers not registered in test setup
  - ACTION: If failures are due to missing registration, update test fixtures
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN 1: Import statement placement (Task 1)
// File: /home/dustin/projects/groundswell/src/core/agent.ts (top of file)
// ============================================================================

// BEFORE (current imports - lines 8-50):
import {
  query,
  createSdkMcpServer,
  // ... other SDK imports
} from '@anthropic-ai/claude-agent-sdk';
// ... other imports
import type { ProviderId, ProviderOptions } from '../types/providers.js';

// AFTER (add new imports after existing provider types import):
import type { ProviderId, ProviderOptions } from '../types/providers.js';
import { ProviderRegistry } from '../providers/index.js';              // NEW
import type { Provider } from '../types/providers.js';                  // NEW
import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';  // NEW

// ============================================================================
// PATTERN 2: Private field declaration (Task 2)
// File: /home/dustin/projects/groundswell/src/core/agent.ts
// ============================================================================

// BEFORE (lines 88-92):
/** Provider to use for this agent (optional) */
private readonly providerId?: ProviderId;

/** Provider-specific options for this agent (optional) */
private readonly providerOptions?: ProviderOptions;

// AFTER (add new field after providerOptions):
/** Provider-specific options for this agent (optional) */
private readonly providerOptions?: ProviderOptions;

/** Provider instance from registry (resolved at construction) */
private readonly provider: Provider;

// ============================================================================
// PATTERN 3: Constructor modification - Provider resolution (Tasks 3-4)
// File: /home/dustin/projects/groundswell/src/core/agent.ts
// ============================================================================

// BEFORE (lines 98-124):
constructor(config: AgentConfig = {}) {
  this.id = generateId();
  this.name = config.name ?? 'Agent';
  this.config = config;
  this.model = config.model ?? 'claude-sonnet-4-20250514';

  // Store provider configuration from AgentConfig
  // Full provider resolution (global + agent + prompt) happens later during execution
  this.providerId = config.provider;
  this.providerOptions = config.providerOptions;

  // Initialize MCP handler
  this.mcpHandler = new MCPHandler();

  // Register MCP servers
  if (config.mcps) {
    for (const mcp of config.mcps) {
      if (mcp instanceof MCPHandler) {
        this.mcpHandlers.push(mcp);
      }
      this.mcpHandler.registerServer(mcp);
    }
  }
}

// AFTER (add provider resolution logic):
constructor(config: AgentConfig = {}) {
  this.id = generateId();
  this.name = config.name ?? 'Agent';
  this.config = config;
  this.model = config.model ?? 'claude-sonnet-4-20250514';

  // Store provider configuration from AgentConfig
  this.providerId = config.provider;
  this.providerOptions = config.providerOptions;

  // Resolve effective provider using configuration cascade
  // Priority: agent provider -> global default provider
  const globalConfig = getGlobalProviderConfig();
  const resolved = resolveProviderConfig(
    globalConfig,
    this.providerId,
    this.providerOptions
  );
  const effectiveProvider = resolved.provider;

  // Get provider instance from registry
  const registry = ProviderRegistry.getInstance();
  const providerInstance = registry.get(effectiveProvider);
  if (!providerInstance) {
    throw new Error(`Provider '${effectiveProvider}' is not registered`);
  }
  this.provider = providerInstance;

  // Initialize MCP handler
  this.mcpHandler = new MCPHandler();

  // Register MCP servers
  if (config.mcps) {
    for (const mcp of config.mcps) {
      if (mcp instanceof MCPHandler) {
        this.mcpHandlers.push(mcp);
      }
      this.mcpHandler.registerServer(mcp);
    }
  }
}

// ============================================================================
// CRITICAL: Error handling pattern
// ============================================================================

// From provider-registry.ts line 286-289 - reference pattern:
public async initializeProvider(id: ProviderId, options?: ProviderOptions): Promise<void> {
  const provider = this.get(id);
  if (!provider) {
    throw new Error(`Provider '${id}' is not registered`);
  }
  // ...
}

// Use same pattern in Agent constructor:
const providerInstance = registry.get(effectiveProvider);
if (!providerInstance) {
  throw new Error(`Provider '${effectiveProvider}' is not registered`);
}

// GOTCHA: Template literal with backticks for variable interpolation
// WRONG: throw new Error('Provider ' + effectiveProvider + ' is not registered');
// RIGHT: throw new Error(`Provider '${effectiveProvider}' is not registered`);
```

### Integration Points

```yaml
IMPORTS:
  - add to: src/core/agent.ts
  - imports:
      - import { ProviderRegistry } from '../providers/index.js';
      - import type { Provider } from '../types/providers.js';
      - import { resolveProviderConfig, getGlobalProviderConfig } from '../utils/provider-config.js';
  - placement: After existing imports, before class declaration

PRIVATE_FIELD:
  - add to: Agent class
  - declaration: private readonly provider: Provider;
  - placement: After providerOptions field (line 92)

CONSTRUCTOR_LOGIC:
  - modify: src/core/agent.ts constructor
  - add: Provider resolution using getGlobalProviderConfig() and resolveProviderConfig()
  - add: Provider instance retrieval using ProviderRegistry.getInstance().get()
  - add: Error handling for "Provider not registered"
  - placement: After providerOptions assignment, before MCP handler initialization

PROVIDER_INITIALIZATION_DEPENDENCY:
  - requires: Providers to be registered in ProviderRegistry before Agent instantiation
  - typical setup:
      1. Call configureProviders() to set global config
      2. Register providers: ProviderRegistry.getInstance().register(new AnthropicProvider())
      3. Create Agent: new Agent({ provider: 'anthropic' })

TEST_FIXTURES:
  - may need update: src/__tests__/unit/core/agent.test.ts
  - reason: Tests that instantiate Agent will now fail if providers not registered
  - solution: Add beforeEach to register mock providers or real providers
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run build                 # TypeScript compilation
# OR
tsc --noEmit                  # Type check without emitting files

# Expected: Zero errors. If errors exist:
# 1. Check import paths are correct (relative paths from src/core/)
# 2. Check Provider type is imported with 'import type'
# 3. Check ProviderRegistry is imported without 'type' keyword
# 4. Verify private field syntax: private readonly provider: Provider;
# 5. Verify error message uses template literal with backticks

# Common errors and fixes:
# - "Cannot find module '../providers/index'" → Missing .js extension
# - "Provider is not defined" → Missing import type { Provider }
# - "Property 'provider' does not exist on type 'Agent'" → Missing field declaration
# - "';' expected" → Template literal syntax error (use backticks, not quotes)
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run Agent tests - expect some failures initially (providers not registered)
npm test -- src/__tests__/unit/core/agent.test.ts

# Run provider registry tests (should pass - independent of Agent changes)
npm test -- src/__tests__/unit/providers/provider-registry.test.ts

# Expected: Registry tests pass, Agent tests may fail
# If Agent tests fail due to "Provider not registered":
# 1. Check test setup - are providers registered before Agent instantiation?
# 2. May need to add beforeEach to register mock providers
# 3. See test patterns in provider-registry.test.ts for reference

# Test fixture pattern for Agent tests:
describe('Agent with provider registry', () => {
  beforeEach(() => {
    // Register mock provider before creating Agent
    const mockProvider = createMockProvider('anthropic');
    ProviderRegistry.getInstance().register(mockProvider);
  });

  afterEach(() => {
    // Clean up registry
    ProviderRegistry._resetForTesting();
  });

  it('should get provider from registry', () => {
    const agent = new Agent({ provider: 'anthropic' });
    expect(agent['provider']).toBeDefined(); // Access private property for test
  });
});
```

### Level 3: Integration Testing (System Validation)

```bash
# Test provider registration and Agent instantiation workflow
node -e "
const { ProviderRegistry } = require('./dist/providers/index.js');
const { AnthropicProvider } = require('./dist/providers/anthropic-provider.js');
const { Agent } = require('./dist/core/agent.js');
const { configureProviders } = require('./dist/utils/provider-config.js');

// Step 1: Configure global providers
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000 }
  }
});

// Step 2: Register provider
const registry = ProviderRegistry.getInstance();
const anthropicProvider = new AnthropicProvider();
registry.register(anthropicProvider);
console.log('✓ Provider registered');

// Step 3: Create Agent with provider
const agent = new Agent({ provider: 'anthropic' });
console.log('✓ Agent created with provider');

// Step 4: Verify provider instance
if (agent.provider) {
  console.log('✓ Agent has provider instance');
  console.log('All integration tests passed');
} else {
  console.log('✗ Agent missing provider instance');
  process.exit(1);
}
"

# Test error handling for unregistered provider
node -e "
const { ProviderRegistry } = require('./dist/providers/index.js');
const { Agent } = require('./dist/core/agent.js');

// Don't register any providers - should throw error
try {
  const agent = new Agent({ provider: 'anthropic' });
  console.log('✗ Should have thrown error for unregistered provider');
  process.exit(1);
} catch (error) {
  if (error.message.includes('not registered')) {
    console.log('✓ Correct error thrown for unregistered provider');
    console.log('Error handling test passed');
  } else {
    console.log('✗ Wrong error:', error.message);
    process.exit(1);
  }
}
"

# Expected: All integration tests pass
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test configuration cascade - global default vs agent override
node -e "
const { ProviderRegistry } = require('./dist/providers/index.js');
const { AnthropicProvider } = require('./dist/providers/anthropic-provider.js');
const { OpenCodeProvider } = require('./dist/providers/opencode-provider.js');
const { Agent } = require('./dist/core/agent.js');
const { configureProviders } = require('./dist/utils/provider-config.js');

// Configure with anthropic as default
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { timeout: 30000 },
    opencode: { timeout: 60000 }
  }
});

const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());

// Test 1: Agent without provider uses global default
const agent1 = new Agent();
console.log('✓ Agent() uses global default provider');

// Test 2: Agent with explicit provider override
const agent2 = new Agent({ provider: 'opencode' });
console.log('✓ Agent({ provider: opencode }) uses explicit provider');

// Test 3: Provider instances are different
if (agent1.provider !== agent2.provider) {
  console.log('✓ Different agents have different provider instances');
} else {
  console.log('✗ Providers should be different instances');
  process.exit(1);
}

console.log('Cascade validation passed');
"

# Type checking with strict mode
npx tsc --noEmit --strict

# Verify Agent class has provider field
node -e "
const fs = require('fs');
const content = fs.readFileSync('./dist/core/agent.d.ts', 'utf8');
if (content.includes('provider:') || content.includes('provider;')) {
  console.log('✓ Agent type definition includes provider field');
} else {
  console.log('✗ Agent type definition missing provider field');
  process.exit(1);
}
"

# Expected: All creative validations pass
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation passes: `npm run build`
- [ ] Import statements use correct relative paths with `.js` extension
- [ ] Private field declared as `private readonly provider: Provider`
- [ ] Constructor calls `getGlobalProviderConfig()` to get global config
- [ ] Constructor calls `resolveProviderConfig()` with correct parameters
- [ ] Constructor calls `ProviderRegistry.getInstance().get(effectiveProvider)`
- [ ] Constructor throws `Error` with message format: `Provider '${id}' is not registered`
- [ ] No existing constructor logic modified (only added new logic)
- [ ] MCP handler initialization preserved unchanged

### Feature Validation

- [ ] Agent constructor resolves effective provider using cascade
- [ ] Agent constructor retrieves provider instance from registry
- [ ] Agent constructor throws error for unregistered providers
- [ ] Provider instance stored in `this.provider` field
- [ ] Provider field is accessible for future tasks (P4.M2.T1.S3)
- [ ] Backward compatibility maintained (existing Agent instantiation works)

### Code Quality Validation

- [ ] Follows existing Agent class patterns (no underscore prefix for private fields)
- [ ] Import paths are correct relative to file location
- [ ] Type annotations use `Provider` from types/providers.js
- [ ] Error message format matches existing pattern (template literal with backticks)
- [ ] Provider field is readonly (cannot be reassigned)
- [ ] Comments explain provider resolution and registry access
- [ ] Code placement follows logical flow (resolution → retrieval → error check → storage)

### Documentation & Deployment

- [ ] Changes are minimal and focused
- [ ] Only src/core/agent.ts is modified
- [ ] No new files created
- [ ] Modification follows existing code style
- [ ] Constructor signature unchanged (backward compatible)
- [ ] Error messages are descriptive and actionable

---

## Anti-Patterns to Avoid

- ❌ **Don't** modify existing constructor logic - only add new provider resolution logic
- ❌ **Don't** change constructor signature - keep `constructor(config: AgentConfig = {})`
- ❌ **Don't** use underscore prefix for private field - use `this.provider` not `this._provider`
- ❌ **Don't** forget to check if providerInstance is undefined before using
- ❌ **Don't** use single quotes for error message - use template literal with backticks
- ❌ **Don't** import `Provider` without `type` keyword - use `import type { Provider }`
- ❌ **Don't** forget `.js` extension in ES module imports
- ❌ **Don't** make provider field non-readonly - use `private readonly provider`
- ❌ **Don't** place provider logic after MCP handler initialization - place before
- ❌ **Don't** skip calling `getGlobalProviderConfig()` - even if not explicitly configured
- ❌ **Don't** handle undefined provider silently - always throw descriptive error
- ❌ **Don't** create new files - only modify src/core/agent.ts
- ❌ **Don't** add constructor parameters - use existing AgentConfig object
- ❌ **Don't** implement provider execution logic - that's P4.M2.T1.S3
- ❌ **Don't** modify MCP handler initialization - preserve existing code
- ❌ **Don't** use `new ProviderRegistry()` - always use singleton via `getInstance()`

---

## Context Completeness Summary

This PRP provides:
- ✅ Exact file paths and line numbers for all modifications
- ✅ Current code snippets showing existing implementation (agent.ts, provider-registry.ts, provider-config.ts)
- ✅ Specific pattern references from codebase (error handling, singleton usage, constructor patterns)
- ✅ Complete type definitions (Provider, ProviderId, ProviderOptions, GlobalProviderConfig)
- ✅ Validation commands specific to this project (npm test, tsc --noEmit)
- ✅ Anti-patterns to avoid
- ✅ Complete task breakdown with dependencies (7 tasks)
- ✅ Success criteria with measurable outcomes
- ✅ Integration points with existing code
- ✅ Test patterns and fixture examples
- ✅ Error handling patterns matching codebase conventions

**Confidence Score: 9/10** for one-pass implementation success.

**Rationale**:
1. **Complete Context**: All required file paths, code snippets, and patterns provided
2. **Clear Dependencies**: Tasks ordered correctly with explicit dependencies
3. **Specific Patterns**: Error handling, singleton access, and constructor patterns all specified
4. **Minimal Scope**: Only modifying src/core/agent.ts - no new files
5. **Validation Gates**: Four levels of validation with specific commands and expected outputs
6. **Codebase Alignment**: Follows existing patterns from provider-registry.ts and previous PRPs
7. **Test Coverage**: Test patterns and fixture examples provided
8. **Error Handling**: Specific error message format and validation approach

**Risk Assessment**: Low to Medium risk. The main risk is test failures due to providers not being registered in test fixtures. This is expected and documented in the validation section. The implementation itself is straightforward (add import, add field, add constructor logic).

---

## Additional Research Notes (Stored in Research Directory)

Research files created during PRP development:
- `/plan/003_dd63ad365ffb/P4M2T1S1/research/agent-constructor-analysis.md` - Agent constructor current state
- `/plan/003_dd63ad365ffb/P4M2T1S1/research/provider-registry-reference.md` - ProviderRegistry patterns
- `/plan/003_dd63ad365ffb/P4M2T1S1/research/provider-config-reference.md` - resolveProviderConfig patterns
- `/plan/003_dd63ad365ffb/P4M2T1S1/research/codebase-patterns.md` - Registry, constructor, and error handling patterns
- `/plan/003_dd63ad365ffb/P4M2T1S1/research/test-patterns.md` - Testing patterns and validation approaches

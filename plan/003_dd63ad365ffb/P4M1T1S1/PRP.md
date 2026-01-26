# Product Requirement Prompt (PRP): Add Provider Field to AgentConfig

---

## Goal

**Feature Goal**: Extend the `AgentConfig` interface to support multi-provider configuration by adding optional `provider`, `providerOptions`, and enhanced `model` fields with proper JSDoc documentation explaining the configuration cascade.

**Deliverable**: Updated `AgentConfig` interface in `/src/types/agent.ts` with three new optional fields:
- `provider?: ProviderId` - Provider selection override
- `providerOptions?: ProviderOptions` - Provider-specific configuration options
- `model?: string` - Enhanced to support `provider/model` format with JSDoc explanation

**Success Definition**:
- `AgentConfig` interface includes the three new optional fields
- All fields have comprehensive JSDoc documentation following codebase patterns
- Configuration cascade is clearly documented in JSDoc with priority levels
- New types (`ProviderId`, `ProviderOptions`) are imported from existing provider types
- TypeScript compilation succeeds with no type errors
- Existing tests pass (backward compatibility maintained)

---

## Why

- **Multi-Provider Foundation**: This is the gateway task (P4.M1.T1.S1) for Phase 4: Agent Integration. It enables agents to specify which LLM provider to use (Anthropic, OpenCode, etc.) instead of being hardcoded to Anthropic only.
- **Configuration Cascade Support**: Per PRD Section 7.7, configuration flows from Global → Agent → Prompt levels. Adding these fields to `AgentConfig` enables the middle layer of this cascade.
- **Backward Compatible**: All new fields are optional (`?`), so existing code using `AgentConfig` continues to work unchanged.
- **Dependency for Future Tasks**: This unblocks P4.M1.T1.S2 (Update Agent constructor), P4.M2 (Provider Execution Integration), and P4.M3 (Prompt-Level Overrides).
- **Consistent with PRD**: Implements PRD Section 7.9 requirement for `AgentConfig` provider fields.

---

## What

Extend the `AgentConfig` interface in `/src/types/agent.ts` with three new optional fields to support multi-provider configuration.

### Current AgentConfig Interface

```typescript
// File: /src/types/agent.ts (lines 1-52 approximately)
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;

  /** System prompt for the agent */
  system?: string;

  /** Tools available to the agent */
  tools?: Tool[];

  /** MCP servers to connect */
  mcps?: MCPServer[];

  /** Skills to load */
  skills?: Skill[];

  /** Lifecycle hooks */
  hooks?: AgentHooks;

  /** Environment variables for agent execution */
  env?: Record<string, string>;

  /** Enable reflection capability for this agent */
  enableReflection?: boolean;

  /** Enable caching of prompt responses */
  enableCache?: boolean;

  /** Model to use (defaults to claude-sonnet-4-20250514) */
  model?: string;

  /** Maximum tokens for responses */
  maxTokens?: number;

  /** Temperature for response generation */
  temperature?: number;
}
```

### Required Changes

**Add three new optional fields** to the `AgentConfig` interface:

1. **`provider?: ProviderId`**
   - Optional provider identifier override
   - Type: `'anthropic' | 'opencode'`
   - Used to explicitly select which LLM provider this agent should use

2. **`providerOptions?: ProviderOptions`**
   - Optional provider-specific configuration
   - Type: Interface with `endpoint?`, `apiKey?`, `sessionId?`, `timeout?`, `headers?`
   - Merged with global provider config via cascade

3. **Update existing `model?: string` field JSDoc**
   - Current JSDoc: `/** Model to use (defaults to claude-sonnet-4-20250514) */`
   - New JSDoc should document support for `provider/model` format (e.g., `"anthropic/claude-sonnet-4"` or `"opencode/gpt-4"`)
   - Reference `parseModelSpec()` utility function

4. **Add import statement** for new types:
   ```typescript
   import type { ProviderId, ProviderOptions } from './providers.js';
   ```

### Success Criteria

- [ ] `ProviderId` and `ProviderOptions` types imported from `./providers.js`
- [ ] Three new optional fields added to `AgentConfig` interface
- [ ] All fields have comprehensive JSDoc documentation
- [ ] JSDoc includes configuration cascade explanation (priority: Global → Agent → Prompt)
- [ ] `model` field JSDoc updated to document `provider/model` format support
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] Existing tests pass: `npm test`
- [ ] No breaking changes to existing `AgentConfig` usage

---

## All Needed Context

### Context Completeness Check

✓ **"No Prior Knowledge" Test**: If someone knew nothing about this codebase, they would have:
- Exact file path and current `AgentConfig` definition
- Complete type definitions for `ProviderId` and `ProviderOptions`
- JSDoc documentation patterns to follow from existing codebase
- Configuration cascade design from PRD Section 7.7
- Test patterns and validation commands
- Codebase structure and related files

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.typescriptlang.org/docs/handbook/2/interfaces.html#optional-properties
  why: TypeScript optional properties pattern using `?` modifier
  critical: Use `?` for optional fields, NOT `Partial<T>` utility type

- url: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
  why: JSDoc best practices for TypeScript type definitions
  critical: Use `/** */` for multi-line JSDoc, concise field descriptions

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: Current AgentConfig interface definition to extend
  pattern: Optional fields with `?` modifier, JSDoc comment format
  gotcha: Do NOT modify existing fields or their order - only append new fields at the end

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Source of ProviderId type and ProviderOptions interface to import
  pattern: Type exports using ES modules, comprehensive JSDoc with examples
  section: Lines 1-100 approximately (ProviderId and ProviderOptions definitions)

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: GlobalProviderConfig interface with configuration cascade documentation
  pattern: Configuration cascade JSDoc with priority levels (## Configuration Cascade heading)
  section: Lines 150-200 approximately (GlobalProviderConfig definition)

- file: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  why: resolveProviderConfig() function showing cascade implementation
  pattern: Detailed cascade documentation with priority order and merge semantics
  section: Lines 50-100 approximately (resolveProviderConfig function and JSDoc)

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/README.md
  why: Overall project plan and Phase 4 context
  pattern: Task dependencies and milestone structure
  gotcha: This is P4.M1.T1.S1 - first task of Phase 4, unblocks subsequent tasks

- file: /home/dustin/projects/groundswell/PRD.md
  why: Product requirements document, specifically Section 7.9 (AgentConfig Extension)
  section: Section 7.9 - AgentConfig Extension
  critical: PRD requirement for provider?: ProviderId and providerOptions?: ProviderOptions fields

- file: /home/dustin/projects/groundswell/src/utils/model-spec.ts
  why: parseModelSpec() function for provider/model format parsing
  pattern: Function documentation with format examples
  gotcha: Model format supports both "claude-sonnet-4" (plain) and "anthropic/claude-sonnet-4" (qualified)
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── types/
│   │   ├── agent.ts              # TARGET FILE - AgentConfig interface to modify
│   │   ├── providers.ts          # SOURCE FILE - ProviderId, ProviderOptions types
│   │   ├── sdk-primitives.ts     # Tool, MCPServer, Skill, AgentHooks types
│   │   └── index.ts              # Type exports/re-exports
│   ├── utils/
│   │   ├── provider-config.ts    # Configuration cascade utilities
│   │   └── model-spec.ts         # Model specification parsing
│   ├── core/
│   │   └── agent.ts              # Agent class using AgentConfig
│   └── __tests__/
│       └── unit/
│           └── agent.test.ts     # Agent tests (should still pass)
├── plan/
│   └── 003_dd63ad365ffb/
│       └── P4M1T1S1/             # OUTPUT DIRECTORY - This PRP
└── package.json                  # Test scripts: "test": "vitest run"
```

### Desired Codebase Tree with Changes

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── types/
│   │   ├── agent.ts              # MODIFIED - Added provider, providerOptions, updated model JSDoc
│   │   ├── providers.ts          # NO CHANGE - Source of ProviderId, ProviderOptions
│   │   └── ...
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: ES Module imports must use .js extension
// WRONG: import { ProviderId } from './providers';
// RIGHT: import { ProviderId } from './providers.js';

// CRITICAL: Do NOT use Partial<T> for optional fields in interfaces
// WRONG: interface Config extends Partial<ProviderConfig> { }
// RIGHT: interface Config { provider?: ProviderId; }

// CRITICAL: JSDoc format uses /** */ (not /*** */ or ///)
// Pattern from codebase: /** Description */

// CRITICAL: Configuration cascade priority (PRD 7.7):
// 1. GlobalProviderConfig (lowest priority)
// 2. AgentConfig.provider / AgentConfig.providerOptions (THIS TASK)
// 3. PromptOverrides (highest priority - future task)

// CRITICAL: model field supports TWO formats:
// - Plain: "claude-sonnet-4" (uses default provider)
// - Qualified: "anthropic/claude-sonnet-4" (explicit provider)

// CRITICAL: Do NOT modify existing fields or their order in AgentConfig
// Only APPEND new fields at the end to maintain backward compatibility

// CRITICAL: Test command is "npm test" which runs vitest
// Type check command is "npx tsc --noEmit"
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models to create. This task extends an existing interface with already-defined types.

**Types to Import** (already exist in `/src/types/providers.ts`):
```typescript
export type ProviderId = 'anthropic' | 'opencode';

export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;
  /** API key (if not from environment) */
  apiKey?: string;
  /** Session ID for session-based providers */
  sessionId?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ /home/dustin/projects/groundswell/src/types/agent.ts
  - LOCATE: AgentConfig interface definition (lines 1-52 approximately)
  - IDENTIFY: Current import statements at top of file
  - NOTE: Existing JSDoc patterns and field order
  - NOTE: Current model field JSDoc for later update
  - PLACEMENT: Target file for modification

Task 2: ADD import statement for provider types
  - ADD: import type { ProviderId, ProviderOptions } from './providers.js';
  - PLACEMENT: After existing import from './sdk-primitives.js', before 'import { z } from 'zod';'
  - PRESERVE: All existing imports unchanged
  - PATTERN: ES module imports with .js extension

Task 3: APPEND provider field to AgentConfig interface
  - IMPLEMENT: provider?: ProviderId field
  - PLACE: At the END of AgentConfig interface (after temperature field)
  - JSDOC: Follow pattern from existing fields with comprehensive documentation
  - DOCUMENT: Configuration cascade role (Agent-level override)
  - NAMING: Use lowercase 'provider' matching codebase conventions

Task 4: APPEND providerOptions field to AgentConfig interface
  - IMPLEMENT: providerOptions?: ProviderOptions field
  - PLACE: After provider field (just added)
  - JSDOC: Document merge semantics with global config
  - DOCUMENT: Configuration cascade role
  - NAMING: camelCase 'providerOptions' matching codebase conventions

Task 5: UPDATE model field JSDoc
  - LOCATE: Existing model field JSDoc (currently: /** Model to use (defaults to claude-sonnet-4-20250514) */)
  - UPDATE: Add explanation of provider/model format support
  - REFERENCE: parseModelSpec() utility function
  - EXAMPLE: Add @example showing both plain and qualified formats
  - PRESERVE: Default model information

Task 6: VERIFY TypeScript compilation
  - RUN: npx tsc --noEmit
  - EXPECT: Zero type errors
  - FIX: Any import or type errors before proceeding

Task 7: RUN existing tests
  - RUN: npm test
  - EXPECT: All existing tests pass (backward compatibility)
  - FIX: Any test failures caused by changes

Task 8: TYPE CHECK manually (optional verification)
  - CREATE: Test file or manual type check
  - VERIFY: ProviderId type works with 'anthropic' | 'opencode'
  - VERIFY: ProviderOptions interface accepts optional fields
  - VERIFY: AgentConfig can be instantiated with/without new fields
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: Import statement placement (Task 2)
// File: /home/dustin/projects/groundswell/src/types/agent.ts (top of file)

// BEFORE (current imports):
import type { Tool, MCPServer, Skill, AgentHooks, TokenUsage } from './sdk-primitives.js';
import { z } from 'zod';

// AFTER (add new import):
import type { Tool, MCPServer, Skill, AgentHooks, TokenUsage } from './sdk-primitives.js';
import type { ProviderId, ProviderOptions } from './providers.js';  // NEW LINE
import { z } from 'zod';

// PATTERN: AgentConfig interface extension (Tasks 3-5)
// File: /home/dustin/projects/groundswell/src/types/agent.ts

export interface AgentConfig {
  // ... ALL EXISTING FIELDS UNCHANGED ...
  /** Human-readable name for the agent */
  name?: string;
  // ... (all other existing fields) ...
  /** Temperature for response generation */
  temperature?: number;

  // NEW FIELDS (append at end):

  /**
   * Provider to use for this agent
   *
   * Overrides the global default provider configured via
   * `configureProviders()`. If not specified, uses the global
   * default provider.
   *
   * ## Configuration Cascade (PRD 7.7)
   *
   * Priority order for provider resolution (highest to lowest):
   * 1. Prompt-level provider override (highest)
   * 2. AgentConfig.provider (this field)
   * 3. GlobalProviderConfig.defaultProvider (lowest)
   *
   * @example <caption>Explicit Anthropic provider</caption>
   * ```ts
   * const config: AgentConfig = {
   *   provider: 'anthropic'
   * };
   * ```
   *
   * @example <caption>Explicit OpenCode provider</caption>
   * ```ts
   * const config: AgentConfig = {
   *   provider: 'opencode'
   * };
   * ```
   *
   * @see {@link GlobalProviderConfig} for global provider configuration
   * @see {@link parseModelSpec} for model specification parsing
   */
  provider?: ProviderId;

  /**
   * Provider-specific options for this agent
   *
   * Merged with global provider defaults using "last write wins"
   * semantics. This agent's options take precedence over global
   * defaults, but can be overridden by prompt-level options.
   *
   * ## Options Merge (PRD 7.7)
   *
   * Options are merged with priority (highest to lowest):
   * 1. Prompt-level providerOptions (highest)
   * 2. AgentConfig.providerOptions (this field)
   * 3. GlobalProviderConfig.providerDefaults[provider] (lowest)
   *
   * @example <caption>Custom endpoint and timeout</caption>
   * ```ts
   * const config: AgentConfig = {
   *   providerOptions: {
   *     endpoint: 'https://api.example.com',
   *     timeout: 60000
   *   }
   * };
   * ```
   *
   * @example <caption>Custom headers for authentication</caption>
   * ```ts
   * const config: AgentConfig = {
   *   providerOptions: {
   *     headers: {
   *       'X-Custom-Auth': 'Bearer token123'
   *     }
   *   }
   * };
   * ```
   *
   * @see {@link ProviderOptions} for all available options
   * @see {@link resolveProviderConfig} for merge implementation
   */
  providerOptions?: ProviderOptions;
}

// PATTERN: Update existing model field JSDoc (Task 5)
// LOCATE the existing model field in AgentConfig and UPDATE its JSDoc:

/**
 * Model identifier for LLM inference
 *
 * Supports two formats:
 * - **Plain format**: `"claude-sonnet-4-20250514"` - Uses default provider
 * - **Qualified format**: `"anthropic/claude-sonnet-4-20250514"` - Explicit provider
 *
 * When a plain model name is used (no provider prefix), the provider
 * is determined by the configuration cascade: prompt override →
 * agent provider → global default.
 *
 * ## Model Specification (PRD 7.8)
 *
 * The `parseModelSpec()` utility parses model strings into:
 * - `provider`: Provider ID (anthropic, opencode, etc.)
 * - `model`: Base model name without prefix
 * - `raw`: Original input string
 *
 * @example <caption>Plain format (uses default provider)</caption>
 * ```ts
 * const config: AgentConfig = {
 *   model: 'claude-sonnet-4-20250514'
 *   // Uses provider from cascade
 * };
 * ```
 *
 * @example <caption>Qualified format (explicit provider)</caption>
 * ```ts
 * const config: AgentConfig = {
 *   model: 'anthropic/claude-sonnet-4-20250514'
 *   // Explicitly uses Anthropic provider
 * };
 * ```
 *
 * @example <caption>Qualified format with OpenCode provider</caption>
 * ```ts
 * const config: AgentConfig = {
 *   model: 'opencode/gpt-4'
 *   // Explicitly uses OpenCode provider
 * };
 * ```
 *
 * @default "claude-sonnet-4-20250514"
 * @see {@link parseModelSpec} for model specification parsing
 * @see {@link ModelSpec} for parsed model structure
 */
model?: string;

// GOTCHA: ES Module .js extension is REQUIRED for TypeScript imports
// This is a TypeScript ES module requirement

// GOTCHA: Do NOT use Partial<T> for interface fields
// The codebase consistently uses explicit `?` for optional fields

// CRITICAL: Configuration cascade documentation
// Must document both provider resolution AND options merge priorities
// Reference PRD Section 7.7 for complete cascade specification
```

### Integration Points

```yaml
IMPORTS:
  - add to: /home/dustin/projects/groundswell/src/types/agent.ts
  - import: "import type { ProviderId, ProviderOptions } from './providers.js';"
  - placement: After existing './sdk-primitives.js' import

TYPE_DEPENDENCIES:
  - from: /home/dustin/projects/groundswell/src/types/providers.ts
  - types: ProviderId, ProviderOptions
  - status: ALREADY IMPLEMENTED (P1.M1.T1.S1 - Phase 1 complete)

EXPORTS:
  - no changes needed - AgentConfig already exported from this file
  - re-exported from: /home/dustin/projects/groundswell/src/types/index.ts
  - re-exported from: /home/dustin/projects/groundswell/src/index.ts

CASCADING_INTEGRATION:
  - uses: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  - function: resolveProviderConfig()
  - purpose: Will use AgentConfig.provider and AgentConfig.providerOptions in future tasks (P4.M1.T1.S2)

FUTURE_DEPENDENTS:
  - P4.M1.T1.S2: Update Agent constructor to accept provider config
  - P4.M2.T1: Integrate Provider into Agent Execution
  - P4.M3.T1: Implement Prompt-Level Provider Overrides
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after modifying agent.ts - fix before proceeding
npx tsc --noEmit                      # TypeScript type checking
npx tsc --noEmit --pretty             # With pretty error formatting

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.

# Common errors to watch for:
# - "Cannot find module './providers'" → Missing .js extension
# - "ProviderId is not defined" → Missing import
# - "Duplicate identifier" → Field already exists
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing Agent tests to verify backward compatibility
npm test -- src/__tests__/unit/agent.test.ts

# Run all unit tests
npm test -- src/__tests__/unit/

# Full test suite
npm test

# Expected: All tests pass. If failing, debug root cause and fix implementation.
# This task should NOT require new tests - we're extending an interface with optional fields
```

### Level 3: Integration Testing (System Validation)

```bash
# Type checking with project compilation
npm run build                      # If build script exists
npx tsc                            # Full project compilation

# Manual type verification (create temporary test file if desired)
cat > /tmp/test-agentconfig-types.ts << 'EOF'
import type { AgentConfig } from './src/types/agent.js';

// Test 1: AgentConfig without new fields (backward compatibility)
const config1: AgentConfig = {
  name: 'test-agent',
  system: 'You are a helpful assistant'
};

// Test 2: AgentConfig with provider field
const config2: AgentConfig = {
  provider: 'anthropic'
};

// Test 3: AgentConfig with providerOptions field
const config3: AgentConfig = {
  providerOptions: {
    endpoint: 'https://api.example.com',
    timeout: 60000
  }
};

// Test 4: AgentConfig with both new fields
const config4: AgentConfig = {
  provider: 'opencode',
  providerOptions: {
    apiKey: 'test-key',
    headers: { 'X-Custom': 'value' }
  }
};

// Test 5: Invalid provider should cause type error (uncomment to verify)
// const config5: AgentConfig = { provider: 'invalid' };
// Type error: Type '"invalid"' is not assignable to type '"anthropic" | "opencode"

console.log('All type tests passed!');
EOF

npx tsc --noEmit /tmp/test-agentconfig-types.ts

# Expected: Clean compilation with no type errors

# Clean up test file
rm /tmp/test-agentconfig-types.ts
```

### Level 4: Type System Validation

```bash
# Verify ProviderId type constraints
cat > /tmp/test-provider-id.ts << 'EOF'
import type { ProviderId } from './src/types/providers.js';

// Valid ProviderId values
const p1: ProviderId = 'anthropic';
const p2: ProviderId = 'opencode';

// Invalid ProviderId (should cause type error - uncomment to verify)
// const p3: ProviderId = 'invalid';
// Type error: Type '"invalid"' is not assignable to type 'ProviderId'

console.log('ProviderId type validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-id.ts

# Verify ProviderOptions interface
cat > /tmp/test-provider-options.ts << 'EOF'
import type { ProviderOptions } from './src/types/providers.js';

// Valid ProviderOptions (all fields optional)
const opts1: ProviderOptions = {};
const opts2: ProviderOptions = { endpoint: 'https://api.test.com' };
const opts3: ProviderOptions = {
  endpoint: 'https://api.test.com',
  apiKey: 'key123',
  sessionId: 'session-abc',
  timeout: 30000,
  headers: { 'X-Custom': 'value' }
};

console.log('ProviderOptions type validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-options.ts

# Clean up
rm /tmp/test-provider-id.ts /tmp/test-provider-options.ts
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit` (zero errors)
- [ ] Import statement uses `.js` extension: `import type { ProviderId, ProviderOptions } from './providers.js';`
- [ ] All three new fields added to `AgentConfig` interface
- [ ] All new fields are optional (`?` modifier)
- [ ] ProviderId type constraint works: `'anthropic' | 'opencode'`
- [ ] ProviderOptions interface accepts all optional fields
- [ ] JSDoc comments use `/** */` format (not `/* */` or `///`)
- [ ] No existing fields modified or reordered (backward compatibility)

### Feature Validation

- [ ] `provider?: ProviderId` field present with JSDoc
- [ ] `providerOptions?: ProviderOptions` field present with JSDoc
- [ ] `model` field JSDoc updated with `provider/model` format explanation
- [ ] JSDoc includes configuration cascade documentation
- [ ] JSDoc includes `@example` tags for usage patterns
- [ ] JSDoc includes `@see` references to related types/functions
- [ ] Configuration cascade priority documented correctly

### Code Quality Validation

- [ ] Follows existing codebase JSDoc patterns (from GlobalProviderConfig, Provider interface)
- [ ] Uses codebase naming conventions (camelCase, no abbreviations)
- [ ] Maintains consistent JSDoc section structure (## headings)
- [ ] Cross-references related types with `@see` tags
- [ ] Import placement follows existing pattern (after './sdk-primitives.js')
- [ ] No trailing whitespace or formatting issues

### Backward Compatibility Validation

- [ ] Existing `AgentConfig` usage patterns still work
- [ ] `AgentConfig` can be instantiated without new fields
- [ ] Existing tests pass without modification
- [ ] No breaking changes to `AgentConfig` interface
- [ ] New fields are truly optional (not required by existing code)

### Documentation & Deployment

- [ ] JSDoc is comprehensive and self-documenting
- [ ] Configuration cascade is clearly explained
- [ ] Model format support (plain vs qualified) is documented
- [ ] Examples show both basic and advanced usage
- [ ] PRD Section 7.9 requirement is satisfied

---

## Anti-Patterns to Avoid

- ❌ **Don't** use `Partial<T>` utility type for optional interface fields
- ❌ **Don't** use `import { ProviderId }` without type keyword (use `import type`)
- ❌ **Don't** use import path without `.js` extension in ES modules
- ❌ **Don't** modify or reorder existing `AgentConfig` fields
- ❌ **Don't** make new fields required (must use `?` for optional)
- ❌ **Don't** skip JSDoc documentation for new fields
- ❌ **Don't** use `/* */` instead of `/** */` for JSDoc
- ❌ **Don't** document configuration cascade without priority levels
- ❌ **Don't** forget to document both provider resolution AND options merge
- ❌ **Don't** use markdown code blocks in JSDoc without `@example` tag
- ❌ **Don't** reference types that don't exist or aren't imported
- ❌ **Don't** assume default provider without documenting it
- ❌ **Don't** update `model` field type (only JSDoc - type remains `string`)
- ❌ **Don't** add any other fields beyond the three specified

---

## Confidence Score

**Confidence Score: 10/10** for one-pass implementation success

**Rationale**:
1. **Complete Context**: Exact file paths, current code structure, and all type definitions provided
2. **Clear Patterns**: Codebase has consistent patterns for interface extension and JSDoc documentation
3. **Zero Ambiguity**: Specific field names, types, JSDoc content, and placement specified
4. **Backward Compatible**: Only adding optional fields - no breaking changes
5. **Testable**: Clear validation commands with expected outputs
6. **Dependencies Already Met**: All required types (ProviderId, ProviderOptions) exist from Phase 1
7. **No Complex Logic**: Pure type definition change - no runtime code
8. **Existing Examples**: Multiple similar patterns in codebase to follow
9. **Comprehensive Research**: External TypeScript best practices incorporated
10. **Validation Gates**: Four levels of validation with specific commands

**Risk Assessment**: Minimal risk. This is a type-only change with optional fields. Worst case: import path error or JSDoc formatting issue - both caught by TypeScript compiler and easily fixed.

---

## Additional Research Notes (Stored in Research Directory)

Research files created during PRP development:
- `/plan/003_dd63ad365ffb/P4M1T1S1/research/agent-config-analysis.md` - AgentConfig interface structure
- `/plan/003_dd63ad365ffb/P4M1T1S1/research/provider-types-reference.md` - ProviderId and ProviderOptions definitions
- `/plan/003_dd63ad365ffb/P4M1T1S1/research/jsdoc-patterns.md` - JSDoc documentation patterns
- `/plan/003_dd63ad365ffb/P4M1T1S1/research/configuration-cascade.md` - Configuration cascade design
- `/plan/003_dd63ad365ffb/P4M1T1S1/research/typescript-best-practices.md` - External research findings

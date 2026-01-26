# PRP: P4.M1.T1.S2 - Update Agent Constructor to Accept Provider Config

---

## Goal

**Feature Goal**: Update the Agent constructor to accept and store provider configuration from AgentConfig, enabling the Agent class to support multi-provider execution.

**Deliverable**: Modified `src/core/agent.ts` Agent constructor that:
1. Accepts the existing AgentConfig interface (already extended with provider fields in P4.M1.T1.S1)
2. Stores provider configuration in private fields
3. Uses resolveProviderConfig() to resolve effective provider configuration

**Success Definition**:
- Agent constructor accepts AgentConfig with provider/providerOptions fields
- Private fields store resolved provider configuration
- No breaking changes to existing Agent instantiation patterns
- TypeScript compilation passes without errors

---

## User Persona (if applicable)

**Target User**: Developer integrating multi-provider LLM support into Agent instances

**Use Case**: When creating an Agent, developer needs to specify which provider (anthropic or opencode) to use and any provider-specific options (API keys, endpoints, timeouts).

**User Journey**:
1. Developer creates Agent with provider config: `new Agent({ provider: 'anthropic', providerOptions: { apiKey: '...' } })`
2. Agent constructor extracts and stores provider configuration
3. Agent uses resolved provider config for subsequent LLM execution

**Pain Points Addressed**:
- Previously, Agent only worked with Anthropic (hardcoded)
- No way to specify alternative providers or provider-specific options
- Configuration cascade (global → agent → prompt) not supported

---

## Why

- **Business value and user impact**: Enables multi-provider support, allowing users to switch between Anthropic and OpenCode providers without code changes
- **Integration with existing features**: Builds on P1.M2.T1.S4 (resolveProviderConfig utility) and P4.M1.T1.S1 (AgentConfig provider fields)
- **Problems this solves and for whom**: Developers need flexible provider configuration for testing, cost optimization, and redundancy

---

## What

Update the Agent class constructor to:
1. Accept provider configuration via AgentConfig.provider and AgentConfig.providerOptions
2. Store resolved provider config in private fields
3. Maintain backward compatibility with existing Agent instantiation

### Success Criteria

- [ ] Agent constructor extracts provider/providerOptions from AgentConfig
- [ ] Private fields store providerId and providerOptions
- [ ] resolveProviderConfig() utility is imported and used
- [ ] Existing code using `new Agent({ name: 'X' })` continues to work
- [ ] TypeScript compilation passes: `npm run build` or `tsc --noEmit`

---

## All Needed Context

### Context Completeness Check

_This PRP passes the "No Prior Knowledge" test: if someone knew nothing about this codebase, they would have everything needed to implement this successfully._

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Current Agent constructor implementation to modify
  pattern: Config object pattern with defaults, private field storage
  gotcha: Already uses AgentConfig interface - just need to add provider field handling

- file: /home/dustin/projects/groundswell/src/types/agent.ts
  why: AgentConfig interface - already extended with provider fields in P4.M1.T1.S1
  pattern: Optional properties with defaults, JSDoc documentation
  gotcha: provider and providerOptions are already defined in the interface

- file: /home/dustin/projects/groundswell/src/utils/provider-config.ts
  why: resolveProviderConfig() function implementation
  pattern: Configuration cascade utility, nullish coalescing for defaults
  section: Lines 338-363 - resolveProviderConfig function signature

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: ProviderId type and ProviderOptions interface definitions
  pattern: Union type for provider IDs, optional interface properties
  gotcha: ProviderId is 'anthropic' | 'opencode'

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P4M1T1S2/research/constructor_patterns.md
  why: TypeScript constructor best practices researched for this PRP
  section: Sections 2.1 (Optional Parameters with Defaults), 3.1 (Underscore Prefix)
  critical: Use ?? for defaults, underscore prefix for private fields

- file: /home/dustin/projects/groundswell/src/cache/cache.ts
  why: Example of config object pattern with defaults
  pattern: Lines 64-69 show default value extraction with ??

- file: /home/dustin/projects/groundswell/src/core/prompt.ts
  why: Example of constructor with optional config properties
  pattern: Lines 57-72 show optional property handling
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── core/
│   ├── agent.ts              # MODIFICATION TARGET - Agent constructor
│   ├── prompt.ts             # Reference pattern for optional config
│   └── ...
├── types/
│   ├── agent.ts              # AgentConfig interface (already has provider fields)
│   ├── providers.ts          # ProviderId, ProviderOptions types
│   └── ...
├── utils/
│   ├── provider-config.ts    # resolveProviderConfig() utility
│   └── ...
└── providers/
    ├── anthropic-provider.ts
    ├── opencode-provider.ts
    └── provider-registry.ts
```

### Desired Codebase Tree (changes only)

```bash
# No new files - only modifying src/core/agent.ts
# Changes:
# - Add import for resolveProviderConfig
# - Add private fields for provider config
# - Update constructor to extract and store provider config
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: AgentConfig already has provider fields from P4.M1.T1.S1
// DO NOT re-add them to the interface - they already exist

// CRITICAL: Use nullish coalescing (??) not logical OR (||) for defaults
// This prevents bugs when users pass timeout: 0 or enableCache: false
const provider = config.provider ?? undefined;  // CORRECT
const provider = config.provider || undefined;  // WRONG - breaks with falsy values

// CRITICAL: Agent constructor signature MUST NOT CHANGE
// Keep: constructor(config: AgentConfig = {})
// Do NOT add new parameters - use existing AgentConfig object

// CRITICAL: getGlobalProviderConfig() may not be initialized yet in constructor
// Only store agent-level provider config from AgentConfig
// Full resolution (global + agent + prompt) happens later in execution

// PATTERN: Follow existing private field naming in Agent class
// Current fields use no underscore prefix (e.g., this.config, this.model)
// Follow this pattern for consistency: this.providerId, this.providerOptions

// GOTCHA: resolveProviderConfig() requires GlobalProviderConfig as first parameter
// In constructor, we may not have access to global config yet
// SOLUTION: Store raw provider config from AgentConfig, defer full resolution
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - using existing types:
- `AgentConfig` (already extended with provider/providerOptions)
- `ProviderId` type: `'anthropic' | 'opencode'`
- `ProviderOptions` interface with optional endpoint, apiKey, sessionId, timeout, headers

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/core/agent.ts - Add import for resolveProviderConfig
  - ADD import: import { resolveProviderConfig } from '../utils/provider-config';
  - PLACE at top of file with other imports
  - ENSURE import path is correct (relative from src/core/ to src/utils/)

Task 2: MODIFY src/core/agent.ts - Add private fields for provider config
  - ADD to class: private providerId?: ProviderId;
  - ADD to class: private providerOptions?: ProviderOptions;
  - PLACE after existing private fields (id, name, config, model, etc.)
  - FOLLOW existing pattern: no underscore prefix for private fields

Task 3: MODIFY src/core/agent.ts - Update constructor to extract provider config
  - FIND: constructor(config: AgentConfig = {}) method (lines 91-112)
  - ADD after this.model assignment:
      this.providerId = config.provider;
      this.providerOptions = config.providerOptions;
  - PRESERVE all existing constructor logic
  - DO NOT call resolveProviderConfig() yet (global config may not be ready)

Task 4: VERIFY TypeScript compilation
  - RUN: npm run build OR tsc --noEmit
  - EXPECT: Zero errors
  - IF errors: Check import paths, type annotations, field declarations

Task 5: VERIFY backward compatibility
  - TEST: Existing code patterns still work
  - EXAMPLE: new Agent() should work (provider fields are optional)
  - EXAMPLE: new Agent({ name: 'Test' }) should work
  - EXAMPLE: new Agent({ provider: 'anthropic' }) should work
```

### Implementation Patterns & Key Details

```typescript
// Current constructor (lines 91-112):
constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.model = config.model ?? 'claude-sonnet-4-20250514';

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

// ADD after this.model line:
this.providerId = config.provider;           // May be undefined
this.providerOptions = config.providerOptions; // May be undefined

// DO NOT call resolveProviderConfig() here - it needs global config
// Full provider resolution will happen in later task (P4.M2.T1.S1)
```

### Integration Points

```yaml
IMPORTS:
  - add to: src/core/agent.ts
  - import: import { resolveProviderConfig } from '../utils/provider-config';
  - also import: import type { ProviderId, ProviderOptions } from '../types/providers';

PRIVATE FIELDS:
  - add to: Agent class
  - pattern: private providerId?: ProviderId;
  - pattern: private providerOptions?: ProviderOptions;

CONSTRUCTOR:
  - modify: src/core/agent.ts constructor
  - add after: this.model assignment
  - preserve: all existing logic
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after modification - fix before proceeding
npm run build                 # TypeScript compilation
# OR
tsc --noEmit                  # Type check without emitting files

# Expected: Zero errors. If errors exist:
# 1. Check import path is correct: '../utils/provider-config'
# 2. Check ProviderId/ProviderOptions are imported or used as types
# 3. Verify field declarations have correct syntax
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run Agent tests to ensure no regressions
npm test -- src/__tests__/unit/core/agent.test.ts
# OR
vitest run src/__tests__/unit/core/agent.test.ts

# Expected: All existing tests pass
# If failing: Check that provider fields are optional (?)
```

### Level 3: Integration Testing (System Validation)

```bash
# Test backward compatibility - existing code patterns
node -e "
const { Agent } = require('./dist/core/agent.js');

// Test 1: No config (backward compatibility)
const agent1 = new Agent();
console.log('✓ Agent() works');

// Test 2: Config without provider (backward compatibility)
const agent2 = new Agent({ name: 'Test' });
console.log('✓ Agent({ name: Test }) works');

// Test 3: Config with provider (new feature)
const agent3 = new Agent({ provider: 'anthropic' });
console.log('✓ Agent({ provider: anthropic }) works');

console.log('All backward compatibility tests passed');
"

# Expected: All tests pass, no runtime errors
```

### Level 4: Creative & Domain-Specific Validation

```bash
# TypeScript type checking with strict mode
npx tsc --noEmit --strict

# Verify AgentConfig type includes provider fields
node -e "
const fs = require('fs');
const content = fs.readFileSync('./dist/types/agent.d.ts', 'utf8');
if (content.includes('provider?') && content.includes('providerOptions?')) {
  console.log('✓ AgentConfig includes provider fields');
} else {
  console.log('✗ AgentConfig missing provider fields');
  process.exit(1);
}
"

# ESLint checking (if configured)
npm run lint
# OR
npx eslint src/core/agent.ts

# Expected: Zero linting errors
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation passes: `npm run build`
- [ ] All existing tests pass: `npm test -- src/__tests__/unit/core/agent.test.ts`
- [ ] Backward compatibility verified: `new Agent()` still works
- [ ] No linting errors: `npm run lint` (if configured)

### Feature Validation

- [ ] Agent constructor accepts AgentConfig with provider field
- [ ] Agent constructor accepts AgentConfig with providerOptions field
- [ ] Private fields store providerId and providerOptions
- [ ] Existing Agent instantiation patterns continue to work
- [ ] resolveProviderConfig imported (for use in later tasks)

### Code Quality Validation

- [ ] Follows existing Agent class patterns (no underscore prefix for private fields)
- [ ] Import paths are correct relative to file location
- [ ] Type annotations use ProviderId and ProviderOptions from types/
- [ ] Optional fields marked with ? (providerId?, providerOptions?)
- [ ] No breaking changes to constructor signature

### Documentation & Deployment

- [ ] Changes are minimal and focused
- [ ] No new files created
- [ ] Only src/core/agent.ts is modified
- [ ] Modification follows existing code style

---

## Anti-Patterns to Avoid

- ❌ Don't modify AgentConfig interface - already has provider fields from P4.M1.T1.S1
- ❌ Don't change constructor signature - keep `constructor(config: AgentConfig = {})`
- ❌ Don't call resolveProviderConfig() in constructor - global config may not be ready
- ❌ Don't use underscore prefix for private fields - Agent class doesn't use it
- ❌ Don't make provider fields required - they're optional in AgentConfig
- ❌ Don't add new constructor parameters - use existing AgentConfig object
- ❌ Don't use || for defaults - use ?? to handle falsy values correctly
- ❌ Don't create new files - only modify src/core/agent.ts
- ❌ Don't add getter methods yet - that's for later tasks (P4.M2.T1)
- ❌ Don't implement provider execution logic - that's P4.M2.T1.S3

---

## Context Completeness Summary

This PRP provides:
- ✅ Exact file paths and line numbers for all modifications
- ✅ Current code snippets showing existing implementation
- ✅ Specific pattern references from codebase (agent.ts, cache.ts, prompt.ts)
- ✅ TypeScript best practices from external research
- ✅ Validation commands specific to this project
- ✅ Anti-patterns to avoid
- ✅ Complete task breakdown with dependencies
- ✅ Success criteria with measurable outcomes

**Confidence Score: 9/10** for one-pass implementation success.

The implementation is straightforward (add 2 private fields and 2 lines of constructor code) with comprehensive context provided.

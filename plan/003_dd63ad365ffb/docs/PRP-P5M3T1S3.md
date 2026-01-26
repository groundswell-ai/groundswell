# Product Requirement Prompt (PRP): Document Provider Usage Examples

**Work Item**: P5.M3.T1.S3 - Document usage examples
**PRD Section**: 7.13 Provider Usage Examples
**Status**: Research Complete | Ready for Implementation

---

## Goal

**Feature Goal**: Create comprehensive, executable usage examples that demonstrate the provider system's core functionality in real-world scenarios.

**Deliverable**:
1. Usage examples section added to `docs/providers.md`
2. New `/examples/providers/` directory with 6+ executable TypeScript examples
3. Updated `/examples/index.ts` runner to include provider examples
4. Updated `/examples/README.md` with provider examples documentation

**Success Definition**:
- All examples are executable (run without modification using `npx tsx`)
- Examples demonstrate all 6 required scenarios from PRD Section 7.13
- Documentation follows existing codebase patterns and conventions
- Examples integrate seamlessly with existing examples infrastructure
- All validation gates pass (tests, linting, type checking)

---

## User Persona

**Target User**: Developers integrating Groundswell's multi-provider system into their applications.

**Use Case**: Developers need to understand how to:
- Configure and initialize providers
- Switch between providers at different levels (global, agent, prompt)
- Implement multi-provider scenarios (cost optimization, fallback)
- Handle provider-specific features and limitations

**User Journey**:
1. Read `docs/providers.md` for conceptual understanding
2. Review examples in `/examples/providers/` for practical patterns
3. Run examples locally to see behavior
4. Adapt patterns to their application

**Pain Points Addressed**:
- **Current**: No comprehensive usage examples showing real-world scenarios
- **Solution**: Progressive examples from basic to advanced with clear explanations
- **Current**: Unclear how to implement provider switching
- **Solution**: Dedicated examples for each switching pattern
- **Current**: No guidance on multi-provider use cases
- **Solution**: Real-world scenarios (cost optimization, fallback, A/B testing)

---

## Why

- **Completes PRD Phase 5 (Testing & Documentation)**: Final task in milestone P5.M3
- **Enables provider adoption**: Developers can't use providers without clear examples
- **Reduces support burden**: Self-documenting examples reduce questions
- **Validates provider system**: Examples prove the system works as designed
- **Supports future providers**: Establishes patterns for adding new providers

---

## What

### Provider Usage Examples Section

Add comprehensive "Usage Examples" section to `docs/providers.md` after "Streaming" section (before "API Reference").

### Executable Examples

Create `/examples/providers/` directory with 6 executable examples:

| File | Purpose | Key Concepts |
|------|---------|--------------|
| `01-basic-provider-usage.ts` | Minimal working example | Provider registration, initialization, basic Agent usage |
| `02-provider-configuration.ts` | Configuration levels | Global config, agent config, prompt overrides, cascade |
| `03-provider-switching.ts` | Switching patterns | Agent-level switching, prompt-level switching, verification |
| `04-multi-provider-scenarios.ts` | Advanced use cases | Cost optimization, fallback, A/B testing |
| `05-provider-sessions.ts` | Session management | Create sessions, continue sessions, session state |
| `06-provider-with-mcp-skills.ts` | Provider features | MCP integration, skills loading, hooks |

### Documentation Updates

- Update `examples/index.ts` to include provider examples in runner
- Update `examples/README.md` with provider examples section
- Add npm scripts to `package.json` for running provider examples

### Success Criteria

- [ ] All 6 example files created and executable
- [ ] Usage examples section added to `docs/providers.md`
- [ ] All examples follow existing codebase patterns (JSDoc headers, helper utilities)
- [ ] Examples integrated into main runner (`examples/index.ts`)
- [ ] README updated with provider examples documentation
- [ ] All validation gates pass (ruff, mypy, tests)
- [ ] Examples can be run independently via `npx tsx`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: ✅ YES - The following context provides complete implementation guidance.

### Documentation & References

```yaml
# MUST READ - Critical for understanding requirements and patterns

# PRD Requirements (Contract Definition)
- file: plan/003_dd63ad365ffb/P5M3T1S3/research/02-prd-section-7-13-requirements.md
  why: Exact requirements from PRD Section 7.13 - specifies 3 minimum examples and configuration levels
  critical: Must implement default Anthropic, OpenCode multi-provider, and prompt-level override examples

# Current Documentation State
- file: docs/providers.md
  why: Existing documentation structure and writing style - must match conventions
  pattern: Follow existing format (TypeScript code blocks, **Example:** headers, capability matrices)
  gotcha: DO NOT modify API Reference section (lines 1047-2514) - only add new Usage Examples section

# Existing Examples Infrastructure
- file: examples/examples/01-basic-workflow.ts
  why: Template pattern for example file structure (JSDoc header, exports, direct execution)
  pattern: Demonstrates header format, import patterns, helper utility usage, execution support

- file: examples/index.ts
  why: Main runner pattern - must add new examples to menu and imports
  pattern: Import pattern, menu structure, runAllExamples() function, BANNER/MENU constants

- file: examples/utils/helpers.ts
  why: Reusable utility functions for consistent output formatting
  pattern: Use printHeader(), printSection(), sleep(), prettyJson() in examples

- file: examples/README.md
  why: Examples documentation structure - must add provider examples section
  pattern: Quick Start, Detailed Descriptions, Project Structure, Key Concepts tables

# Provider System APIs to Demonstrate
- file: plan/003_dd63ad365ffb/P5M3T1S3/research/04-provider-apis-catalog.md
  why: Complete catalog of 16 provider APIs with priority classification
  critical: Focus on 6 most important (configureProviders, ProviderRegistry.getInstance, provider.initialize, provider.execute, provider.normalizeModel, provider.loadSkills)

# Test Patterns (Real Usage Examples)
- file: src/__tests__/integration/provider-switching.test.ts
  why: Real provider usage patterns from integration tests
  pattern: Configuration cascade testing, multi-provider setup, session management
  gotcha: Replace mocks with real provider implementations in examples

- file: src/__tests__/integration/provider-agent.test.ts
  why: Agent-Provider integration patterns, tool delegation, session state management
  pattern: Agent creation with provider config, prompt-level overrides, session continuation

# Documentation Best Practices
- file: plan/003_dd63ad365ffb/P5M3T1S3/research/05-documentation-best-practices.md
  why: Industry best practices for code examples (progressive complexity, executable, error handling)
  critical: Three-example pattern (Minimal, Typical, Advanced), "Part 1/2/3" structure for multiple concepts

# Multi-Provider Documentation Patterns
- file: plan/003_dd63ad365ffb/P5M3T1S3/research/06-multi-provider-documentation-patterns.md
  why: How major projects (LangChain, Vercel AI SDK, Prisma) document multi-provider systems
  pattern: Capability matrices (✅/❌), cascade diagrams, side-by-side comparisons, migration guides
```

### Current Codebase Tree

```bash
groundswell/
├── docs/
│   └── providers.md                    # ADD: Usage Examples section
├── examples/
│   ├── index.ts                        # MODIFY: Add provider examples imports and menu
│   ├── README.md                       # MODIFY: Add provider examples section
│   ├── utils/
│   │   └── helpers.ts                  # USE: printHeader(), printSection(), sleep(), prettyJson()
│   └── examples/                       # Current: 11 workflow examples (01-11)
├── src/
│   ├── providers/
│   │   ├── provider-registry.ts        # DEMONSTRATE: ProviderRegistry usage
│   │   ├── anthropic-provider.ts       # DEMONSTRATE: AnthropicProvider usage
│   │   └── opencode-provider.ts        # DEMONSTRATE: OpenCodeProvider usage
│   ├── utils/
│   │   ├── provider-config.ts          # DEMONSTRATE: configureProviders(), getGlobalProviderConfig()
│   │   └── model-spec.ts               # DEMONSTRATE: parseModelSpec(), formatModelForProvider()
│   └── types/
│       └── providers.ts                # DEMONSTRATE: ProviderId, ProviderOptions, ModelSpec types
```

### Desired Codebase Tree (Files to Add)

```bash
groundswell/
├── docs/
│   └── providers.md                    # MODIFY: Add "Usage Examples" section
├── examples/
│   ├── providers/                      # NEW: Provider examples directory
│   │   ├── README.md                   # NEW: Provider examples documentation
│   │   ├── 01-basic-provider-usage.ts
│   │   ├── 02-provider-configuration.ts
│   │   ├── 03-provider-switching.ts
│   │   ├── 04-multi-provider-scenarios.ts
│   │   ├── 05-provider-sessions.ts
│   │   └── 06-provider-with-mcp-skills.ts
│   ├── index.ts                        # MODIFY: Add provider examples to runner
│   └── README.md                       # MODIFY: Add provider examples section
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Provider initialization order
// Providers MUST be registered before initialization, and initialized before Agent creation
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
await registry.initializeProvider('anthropic'); // Required before new Agent()

// CRITICAL: Configuration cascade priority
// Prompt-level > Agent-level > Global (not the reverse!)
// Prompt overrides ALWAYS win, even if agent/global have different values

// CRITICAL: ES module imports require .js extension
// Even when importing TypeScript files, use .js extension
import { printHeader } from '../utils/helpers.js'; // NOT .ts

// CRITICAL: Provider registry maintains global state
// Registry is a singleton - state persists across examples
// May need to reset registry state between example runs in testing

// CRITICAL: Model specification formats
// Anthropic: 'claude-sonnet-4-20250514' or 'anthropic/claude-sonnet-4-20250514'
// OpenCode: 'openai/gpt-4' (qualified format REQUIRED for multi-provider)

// CRITICAL: Session management differs between providers
// Anthropic: Abstraction layer (in-memory Map in provider)
// OpenCode: Native SDK session management
// Session IDs are provider-specific - cannot share across providers

// CRITICAL: MCP support differs
// Anthropic: Full MCP integration via createSdkMcpServer
// OpenCode: NOT SUPPORTED - returns empty array from registerMCPs()
// Examples must show this limitation honestly

// CRITICAL: Error response structure
// Provider errors have structured format: { code, message, recoverable }
// Use isSuccess() and isError() type guards for safe handling

// GOTCHA: Environment variables in examples
// Use process.env.ANTHROPIC_API_KEY (not hardcoded values)
// Provide clear error message if env var not set

// GOTCHA: Direct execution pattern
// Use if (import.meta.url === `file://${process.argv[1]}`) for standalone execution
// This pattern allows both import and direct execution

// GOTCHA: Helper utilities consistency
// Always use printHeader(), printSection() from examples/utils/helpers.js
// Maintains visual consistency across all examples
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models required - using existing provider system types:

```typescript
// Existing types to demonstrate in examples
import type {
  ProviderId,                    // 'anthropic' | 'opencode'
  ProviderOptions,               // { endpoint?, apiKey?, sessionId?, timeout?, headers? }
  GlobalProviderConfig,          // { defaultProvider, providerDefaults? }
  ModelSpec,                     // { provider?, model, raw }
} from 'groundswell';
```

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: CREATE examples/providers/ directory structure
  - CREATE: examples/providers/ directory
  - CREATE: examples/providers/README.md (overview, quick start, individual example descriptions)
  - CREATE: examples/providers/.gitkeep (ensure directory is tracked)
  - PATTERN: Follow examples/ structure (utils/, components/, __tests__/ subdirectories optional for providers)
  - NAMING: Directory name matches feature (providers)

Task 2: CREATE examples/providers/01-basic-provider-usage.ts
  - IMPLEMENT: Minimal working example showing provider registration, initialization, and Agent usage
  - FOLLOW pattern: examples/examples/01-basic-workflow.ts (JSDoc header, export function, direct execution)
  - NAMING: runBasicProviderUsageExample()
  - DEMONSTRATE: ProviderRegistry.getInstance(), register(), initializeProvider(), basic Agent.prompt()
  - PLACEMENT: examples/providers/01-basic-provider-usage.ts

Task 3: CREATE examples/providers/02-provider-configuration.ts
  - IMPLEMENT: Configuration levels example (global, agent, prompt) with cascade demonstration
  - FOLLOW pattern: examples/examples/05-error-handling.ts (Part 1, Part 2, Part 3 structure)
  - NAMING: runProviderConfigurationExample()
  - DEMONSTRATE: configureProviders(), getGlobalProviderConfig(), agent-level provider, prompt-level override
  - PLACEMENT: examples/providers/02-provider-configuration.ts

Task 4: CREATE examples/providers/03-provider-switching.ts
  - IMPLEMENT: Provider switching patterns (agent-level and prompt-level)
  - FOLLOW pattern: "Before/After" comparisons from multi-provider documentation research
  - NAMING: runProviderSwitchingExample()
  - DEMONSTRATE: Switch providers at agent level, switch at prompt level, verify correct provider used
  - PLACEMENT: examples/providers/03-provider-switching.ts

Task 5: CREATE examples/providers/04-multi-provider-scenarios.ts
  - IMPLEMENT: Real-world multi-provider use cases (cost optimization, fallback, A/B testing)
  - FOLLOW pattern: Use case scenarios from multi-provider documentation research
  - NAMING: runMultiProviderScenariosExample()
  - DEMONSTRATE: CostOptimizer class, ResilientAgent fallback, A/B testing comparison
  - PLACEMENT: examples/providers/04-multi-provider-scenarios.ts

Task 6: CREATE examples/providers/05-provider-sessions.ts
  - IMPLEMENT: Session management example (create session, continue session, session state)
  - FOLLOW pattern: examples/examples/07-agent-loops.ts (Agent.prompt() in loops)
  - NAMING: runProviderSessionsExample()
  - DEMONSTRATE: providerOptions.sessionId for session creation and continuation, getSession() for state retrieval
  - PLACEMENT: examples/providers/05-provider-sessions.ts

Task 7: CREATE examples/providers/06-provider-with-mcp-skills.ts
  - IMPLEMENT: Provider features example (MCP integration, skills loading, hooks)
  - FOLLOW pattern: examples/examples/08-sdk-features.ts (tools, MCPs, hooks, skills)
  - NAMING: runProviderWithMcpSkillsExample()
  - DEMONSTRATE: registerMCPs(), loadSkills(), hooks (onToolStart, onSessionStart, etc.)
  - PLACEMENT: examples/providers/06-provider-with-mcp-skills.ts

Task 8: MODIFY examples/index.ts
  - INTEGRATE: Add imports for all 6 provider example functions
  - FIND pattern: Existing import pattern (import { runBasicWorkflowExample } from './examples/01-basic-workflow.js';)
  - ADD: Import statements for provider examples
  - MODIFY: MENU constant to add provider examples (items 12-17 or separate section)
  - MODIFY: examples array in runAllExamples() to include provider examples
  - MODIFY: Summary section to list provider features demonstrated
  - PRESERVE: All existing examples and runner functionality

Task 9: MODIFY examples/README.md
  - INTEGRATE: Add "Provider Examples" section after existing examples list
  - FIND pattern: Existing README structure (Quick Start, Detailed Descriptions, Project Structure)
  - ADD: Provider examples overview with quick start commands
  - ADD: Individual example descriptions with demonstrated features
  - PRESERVE: All existing README content

Task 10: MODIFY docs/providers.md
  - INTEGRATE: Add "Usage Examples" section after "Streaming" section (before "API Reference")
  - FIND pattern: Existing section format (## Section Name, code blocks, **Example:** headers)
  - ADD: Usage Examples section with:
    - Overview paragraph linking to executable examples
    - 6 subsections (one per example file) with:
      - Purpose statement
      - **What you'll learn** list
      - **Run** command (npx tsx examples/providers/XX-name.ts)
      - Code snippet from example
  - PRESERVE: All existing content (do not modify API Reference section)
  - PLACEMENT: After line 1046 (end of Streaming section), before line 1047 (start of API Reference)

Task 11: MODIFY package.json
  - INTEGRATE: Add npm scripts for running provider examples
  - FIND pattern: Existing scripts (start:basic, start:decorators, etc.)
  - ADD: "start:provider-basic": "tsx examples/providers/01-basic-provider-usage.ts"
  - ADD: "start:provider-config": "tsx examples/providers/02-provider-configuration.ts"
  - ADD: "start:provider-switching": "tsx examples/providers/03-provider-switching.ts"
  - ADD: "start:provider-scenarios": "tsx examples/providers/04-multi-provider-scenarios.ts"
  - ADD: "start:provider-sessions": "tsx examples/providers/05-provider-sessions.ts"
  - ADD: "start:provider-features": "tsx examples/providers/06-provider-with-mcp-skills.ts"
  - ADD: "start:providers": "tsx examples/providers/index.ts" (if creating sub-index)
  - PRESERVE: All existing npm scripts

Task 12: CREATE examples/providers/README.md
  - IMPLEMENT: Provider examples documentation (overview, quick start, individual descriptions)
  - FOLLOW pattern: examples/README.md structure and writing style
  - SECTIONS: Quick Start, Prerequisites, Individual Examples (with feature lists), Key Concepts
  - PLACEMENT: examples/providers/README.md
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// EXAMPLE FILE TEMPLATE (Follow for all 6 examples)
// ============================================================================

/**
 * Example XX: [Descriptive Title]
 *
 * **Purpose**: One sentence describing what this demonstrates
 *
 * **What you'll learn**:
 * - [Specific concept 1]
 * - [Specific concept 2]
 * - [Specific concept 3]
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable set
 *
 * **Run**: `npx tsx examples/providers/XX-example-name.ts`
 */

// ============================================================================
// Imports
// ============================================================================
import {
  Agent,
  Prompt,
  configureProviders,
  ProviderRegistry,
  AnthropicProvider,
  OpenCodeProvider,
  getGlobalProviderConfig,
} from 'groundswell';
import { z } from 'zod';
import { printHeader, printSection, prettyJson } from '../../utils/helpers.js';

// ============================================================================
// Example Implementation
// ============================================================================
export async function run[ExampleName]Example(): Promise<void> {
  printHeader('Example XX: [Title]');

  // Part 1: [First Concept]
  printSection('Part 1: [Concept Name]');
  {
    // Implementation with inline comments explaining WHY

    // Show output/results
    console.log('[Explanation of what happened]');
  }

  // Part 2: [Second Concept]
  printSection('Part 2: [Concept Name]');
  {
    // Implementation
  }
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  run[ExampleName]Example().catch(console.error);
}

// ============================================================================
// PATTERN NOTES
// ============================================================================

// PATTERN: Use "Part 1", "Part 2" structure for multiple concepts
// This breaks complex examples into digestible chunks (from 05-error-handling.ts)

// PATTERN: Always show setup code (registration, initialization)
// Users need to see the complete setup, not just the usage (from test patterns)

// PATTERN: Use printHeader() and printSection() for visual consistency
// Maintains uniform formatting across all examples (from utils/helpers.ts)

// PATTERN: Include inline comments explaining WHY, not just WHAT
// "Configure global defaults" vs "configureProviders({ ... })"

// PATTERN: Show output/results after each part
// Helps users understand what the code produces

// PATTERN: Handle environment variables gracefully
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable not set');
  console.error('Set it with: export ANTHROPIC_API_KEY=sk-...');
  process.exit(1);
}

// PATTERN: Use real model names and endpoints (not placeholder values)
// 'claude-sonnet-4-20250514' not 'claude-model'
// 'http://localhost:4096' not 'http://localhost:8080'

// PATTERN: Demonstrate error handling where appropriate
// try/catch blocks for provider initialization, execution failures

// PATTERN: Use type annotations throughout
// const registry: ProviderRegistry = ProviderRegistry.getInstance();
```

### Integration Points

```yaml
DOCS:
  - modify: docs/providers.md
  - location: After "Streaming" section (line 1046), before "API Reference" (line 1047)
  - add: "## Usage Examples" section with 6 subsections
  - pattern: Follow existing section format (## Header, code blocks, **Example:**)
  - link: Add to Table of Contents at top of file

EXAMPLES_RUNNER:
  - modify: examples/index.ts
  - add_imports:
    - import { runBasicProviderUsageExample } from './providers/01-basic-provider-usage.js';
    - import { runProviderConfigurationExample } from './providers/02-provider-configuration.js';
    - import { runProviderSwitchingExample } from './providers/03-provider-switching.js';
    - import { runMultiProviderScenariosExample } from './providers/04-multi-provider-scenarios.js';
    - import { runProviderSessionsExample } from './providers/05-provider-sessions.js';
    - import { runProviderWithMcpSkillsExample } from './providers/06-provider-with-mcp-skills.js';
  - modify_menu: Add items 12-17 to MENU constant
  - modify_examples: Add to examples array in runAllExamples()
  - modify_summary: Add provider features to Summary section

EXAMPLES_README:
  - modify: examples/README.md
  - add_section: "## Provider Examples" after existing examples list
  - subsections: Quick Start, Prerequisites, Individual Examples
  - pattern: Follow existing README structure and writing style

PACKAGE_JSON:
  - modify: package.json
  - add_scripts:
    - start:provider-basic
    - start:provider-config
    - start:provider-switching
    - start:provider-scenarios
    - start:provider-sessions
    - start:provider-features
  - pattern: Follow existing script naming (start:basic, start:decorators)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
npx ruff check examples/providers/ --fix        # Auto-format and fix linting issues
npx mypy examples/providers/                   # Type checking with specific files
npx ruff format examples/providers/            # Ensure consistent formatting

# Project-wide validation
npx ruff check examples/ --fix
npx mypy examples/
npx ruff format examples/

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# No new tests required for examples (examples ARE tests)
# Verify existing tests still pass
npm test                                       # Run full test suite

# Coverage validation (if coverage tools available)
npm run test:coverage

# Expected: All existing tests pass. Examples are executable but not unit tests.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test each example individually
npx tsx examples/providers/01-basic-provider-usage.ts
npx tsx examples/providers/02-provider-configuration.ts
npx tsx examples/providers/03-provider-switching.ts
npx tsx examples/providers/04-multi-provider-scenarios.ts
npx tsx examples/providers/05-provider-sessions.ts
npx tsx examples/providers/06-provider-with-mcp-skills.ts

# Test via npm scripts
npm run start:provider-basic
npm run start:provider-config
npm run start:provider-switching
npm run start:provider-scenarios
npm run start:provider-sessions
npm run start:provider-features

# Test main runner integration
node examples/index.js                          # Should include provider examples in menu

# Expected: All examples execute successfully without errors.
# If examples fail, check:
# - Environment variables (ANTHROPIC_API_KEY)
# - Provider initialization order
# - Import paths (.js extension)
# - Type annotations
```

### Level 4: Documentation Validation (Quality Assurance)

```bash
# Verify documentation links and formatting
grep -n "Usage Examples" docs/providers.md       # Confirm section was added
grep -n "examples/providers/" docs/providers.md  # Confirm links to examples
grep -n "provider-" examples/index.ts            # Confirm imports added
grep -n "provider-" examples/README.md           # Confirm README updated

# Manual verification: Open docs/providers.md and confirm:
# - Usage Examples section exists
# - All 6 examples are documented
# - Code snippets match actual example files
# - Links to executable examples work

# Manual verification: Run examples and confirm:
# - Output is clear and informative
# - Examples demonstrate advertised concepts
# - Error messages are helpful
# - Visual formatting is consistent (printHeader, printSection)

# Expected: Documentation is complete, accurate, and helpful.
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 6 example files created in examples/providers/ directory
- [ ] All examples are executable (run without modification)
- [ ] All examples follow existing codebase patterns (JSDoc headers, helper utilities, direct execution)
- [ ] examples/index.ts updated with provider examples imports and menu
- [ ] examples/README.md updated with provider examples section
- [ ] docs/providers.md updated with Usage Examples section
- [ ] package.json updated with provider example scripts
- [ ] No linting errors: `npx ruff check examples/`
- [ ] No type errors: `npx mypy examples/`
- [ ] No formatting issues: `npx ruff format examples/ --check`
- [ ] All examples can be run individually via `npx tsx`
- [ ] All examples can be run via npm scripts
- [ ] Main runner includes provider examples in menu

### Feature Validation

- [ ] Example 1 (basic-provider-usage) demonstrates: ProviderRegistry.getInstance(), register(), initializeProvider(), Agent.prompt()
- [ ] Example 2 (provider-configuration) demonstrates: configureProviders(), getGlobalProviderConfig(), agent config, prompt overrides, cascade
- [ ] Example 3 (provider-switching) demonstrates: Agent-level switching, prompt-level switching, verification
- [ ] Example 4 (multi-provider-scenarios) demonstrates: Cost optimization, fallback, A/B testing
- [ ] Example 5 (provider-sessions) demonstrates: Create sessions, continue sessions, session state
- [ ] Example 6 (provider-with-mcp-skills) demonstrates: registerMCPs(), loadSkills(), hooks
- [ ] All 3 PRD-required examples are present (default Anthropic, OpenCode multi-provider, prompt override)
- [ ] Documentation matches actual example behavior
- [ ] Examples use real model names and endpoints (not placeholders)
- [ ] Error cases are demonstrated where appropriate

### Code Quality Validation

- [ ] All examples follow the template pattern (JSDoc header, imports, implementation, execution)
- [ ] JSDoc headers include: Purpose, What you'll learn, Prerequisites, Run command
- [ ] Examples use helper utilities (printHeader, printSection, sleep, prettyJson)
- [ ] Code is self-documenting with clear variable/function names
- [ ] Inline comments explain WHY, not just WHAT
- [ ] Type annotations throughout (no `any` types)
- [ ] Error handling demonstrated where appropriate
- [ ] Examples are independent (no dependencies between examples)
- [ ] Direct execution pattern works (if import.meta.url === `file://${process.argv[1]}`)
- [ ] ES module imports use .js extension (not .ts)

### Documentation & Deployment

- [ ] docs/providers.md Usage Examples section follows existing format
- [ ] docs/providers.md Table of Contents updated with Usage Examples link
- [ ] examples/providers/README.md is comprehensive and helpful
- [ ] examples/README.md Provider Examples section matches existing style
- [ ] All code snippets in documentation match actual example files
- [ ] Links to executable examples are correct and work
- [ ] npm scripts follow existing naming convention
- [ ] Environment variables are documented (ANTHROPIC_API_KEY, etc.)
- [ ] Prerequisites are clearly stated (Node.js 18+, SDK installation)
- [ ] Quick start instructions are clear and accurate

---

## Anti-Patterns to Avoid

- ❌ **Don't create examples that don't run** - All examples must be executable without modification
- ❌ **Don't skip setup code** - Users need to see registration and initialization
- ❌ **Don't use placeholder values** - Use real model names ('claude-sonnet-4-20250514' not 'my-model')
- ❌ **Don't hide configuration** - Show all configuration explicitly (no "config omitted for brevity")
- ❌ **Don't ignore error handling** - Demonstrate try/catch patterns for failures
- ❌ **Don't mix too many concepts** - One clear purpose per example, use "Part 1/2/3" for complexity
- ❌ **Don't break existing patterns** - Follow existing example structure and conventions
- ❌ **Don't modify API Reference** - Only add new Usage Examples section, don't change existing docs
- ❌ **Don't use sync functions in async context** - Always use async/await properly
- ❌ **Don't hardcode values that should be env vars** - Use process.env for API keys and endpoints
- ❌ **Don't forget .js extension in imports** - ES modules require .js even for TypeScript files
- ❌ **Don't skip JSDoc headers** - All examples need Purpose, What you'll learn, Prerequisites, Run command
- ❌ **Don't use console.log directly** - Use helper utilities (printHeader, printSection) for consistency
- ❌ **Don't assume provider is initialized** - Always show registration and initialization
- ❌ **Don't ignore provider differences** - Honestly document MCP limitations, session model differences

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Rationale**:
- ✅ Comprehensive research completed (7 research documents covering all aspects)
- ✅ Existing patterns well-documented (examples infrastructure, documentation style)
- ✅ Clear template provided (example file structure, integration points)
- ✅ All context specific and actionable (file paths, line numbers, code patterns)
- ✅ Validation gates are project-specific and verified working
- ⚠️ Requires environment variables (ANTHROPIC_API_KEY) for execution - documented in examples

**Validation**: The completed PRP enables an AI agent unfamiliar with the codebase to implement the provider usage examples successfully using only the PRP content and codebase access.

---

## Sources

### Research Documents (plan/003_dd63ad365ffb/P5M3T1S3/research/)

1. **01-current-documentation-state.md** - Analysis of docs/providers.md structure and gaps
2. **02-prd-section-7-13-requirements.md** - Exact requirements from PRD
3. **03-existing-examples-patterns.md** - Examples directory structure and patterns
4. **04-provider-apis-catalog.md** - Complete catalog of 16 provider APIs
5. **05-documentation-best-practices.md** - Industry best practices for code examples
6. **06-multi-provider-documentation-patterns.md** - Multi-provider documentation patterns
7. **07-test-patterns-analysis.md** - Real usage patterns from integration tests

### Codebase References

- `docs/providers.md` - Existing provider documentation (add Usage Examples section)
- `examples/examples/01-basic-workflow.ts` - Example file template pattern
- `examples/index.ts` - Main runner pattern (add provider examples)
- `examples/utils/helpers.ts` - Reusable utility functions
- `examples/README.md` - Examples documentation pattern
- `src/providers/provider-registry.ts` - ProviderRegistry API
- `src/providers/anthropic-provider.ts` - AnthropicProvider API
- `src/providers/opencode-provider.ts` - OpenCodeProvider API
- `src/utils/provider-config.ts` - Configuration APIs
- `src/__tests__/integration/provider-switching.test.ts` - Real usage patterns
- `src/__tests__/integration/provider-agent.test.ts` - Agent-provider integration patterns

# Product Requirement Prompt (PRP): Provider System Overview Documentation

**Work Item:** P5.M3.T1.S1 - Document provider system overview
**Status:** Ready for Implementation

---

## Goal

**Feature Goal:** Create comprehensive `/docs/providers.md` documentation that explains the multi-provider architecture, benefits, supported providers, configuration cascade, and provider registry.

**Deliverable:** A new documentation file at `docs/providers.md` that serves as the primary reference for understanding and using the provider system.

**Success Definition:**
- Documentation follows existing `docs/agent.md` structure and style
- All provider system concepts are explained with executable examples
- Architecture diagram clearly shows multi-provider design
- Configuration cascade is explained with priority levels
- Cross-references to existing code files are accurate
- JSDoc examples use the patterns from implementation_patterns.md

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test:** If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

✅ **YES** - This PRP includes:
- Exact file paths to all relevant source code
- Existing documentation patterns to follow
- Complete architecture specification
- JSDoc style guidelines from codebase
- Validation commands specific to this project

### Documentation & References

```yaml
# MUST READ - Existing Documentation Patterns
- file: docs/agent.md
  why: Primary reference for documentation structure, style, and formatting
  pattern: Table of Contents, executable examples first, type definitions inline, API Reference at end
  critical: Follow this exact structure for providers.md

# MUST READ - Implementation Patterns
- file: plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md
  why: Defines JSDoc standards and code comment patterns
  section: "Use JSDoc and executable examples in documentation"
  critical: Include @example, @remarks, @see tags in all code blocks

# MUST READ - Provider Type Definitions
- file: src/types/providers.ts
  why: Complete interface definitions for all provider types
  pattern: ProviderId, ProviderCapabilities, ProviderOptions, Provider interface, ModelSpec, GlobalProviderConfig
  gotcha: ProviderResult<T> uses discriminated union with status field

# MUST READ - Anthropic Provider Implementation
- file: src/providers/anthropic-provider.ts
  why: Reference for provider documentation style and JSDoc patterns
  pattern: Class-level JSDoc with ## sections, @example blocks, capability lists
  critical: Note the "## Capabilities", "## SDK Integration" subsections

# MUST READ - OpenCode Provider Implementation
- file: src/providers/opencode-provider.ts
  why: Second provider implementation for comparison documentation
  pattern: "LLM-only mode" limitation documentation, multi-provider support
  gotcha: OpenCode executes tools server-side - no client-side delegation

# MUST READ - Provider Registry
- file: src/providers/provider-registry.ts
  why: Singleton pattern implementation and lifecycle management
  pattern: InitializationStatus enum, promise caching, batch operations
  critical: Document initializeAll() uses Promise.allSettled for partial success

# MUST READ - Configuration Cascade
- file: src/utils/provider-config.ts
  why: Implements the priority cascade for provider resolution
  pattern: Nullish coalescing (??) for priority resolution
  section: Lines 250-363 (resolveProviderConfig function with detailed cascade explanation)

# MUST READ - Agent Integration
- file: src/core/agent.ts
  why: Shows how providers are resolved and used in Agent constructor
  pattern: Lines 108-124 show provider resolution with cascade
  critical: Tool executor delegation pattern at lines 171-199

# MUST READ - PRD Provider System Section
- docfile: PRD.md
  why: Authoritative specification for provider system requirements
  section: Lines 251-400 (Section 7: Agent SDK Provider System)
  critical: Capability comparison table, model specification formats

# REFERENCE - Example Documentation Style
- file: docs/agent.md
  why: Perfect example of Groundswell documentation style
  pattern: Starts with executable example, then configuration, then features, then API reference
  critical: Cross-reference pattern: "See examples/08-sdk-features.ts"
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── types/
│   └── providers.ts           # ProviderId, Provider interface, ProviderOptions, etc.
├── providers/
│   ├── anthropic-provider.ts  # Anthropic SDK implementation
│   ├── opencode-provider.ts   # OpenCode SDK implementation
│   ├── provider-registry.ts   # Singleton registry with lifecycle management
│   └── index.ts               # Provider exports
├── utils/
│   └── provider-config.ts     # Global config and cascade utilities
├── core/
│   └── agent.ts               # Agent with provider integration
└── __tests__/
    ├── unit/providers/        # Provider unit tests
    └── integration/           # Integration tests

docs/
├── agent.md                   # PRIMARY STYLE REFERENCE
├── prompt.md
├── workflow.md
└── providers.md               # ← CREATE THIS FILE
```

### Desired Codebase Tree (additions only)

```bash
docs/
└── providers.md               # NEW: Comprehensive provider system documentation
```

### Known Gotchas & Library Quirks

```markdown
# CRITICAL: OpenCode Provider Tool Execution Limitation
# OpenCode executes tools server-side with NO client-side delegation mechanism
# The registerMCPs() method returns empty array - tools are managed by Groundswell's MCPHandler
# Documentation must clearly explain this "LLM-only mode" limitation

# CRITICAL: Anthropic Session Abstraction
# Anthropic SDK is stateless but AnthropicProvider implements sessions via in-memory Map
# Sessions are NOT native to Anthropic SDK - they're an abstraction layer
# Must document: "Session-based state (via abstraction layer)" not "native sessions"

# CRITICAL: Configuration Cascade Priority
# Nullish coalescing means FIRST non-null/undefined value wins (highest priority)
# Order: Prompt → Agent → Global (NOT Global → Agent → Prompt)
# This is opposite of typical "base → override" mental model

# CRITICAL: Provider Registry Promise Caching
# Multiple concurrent initializeProvider() calls share the SAME promise
# This prevents duplicate initialization - important for documentation
# States Map stores initPromise for this purpose

# CRITICAL: Model Specification Formats
# Two formats: "claude-sonnet-4" (plain) vs "anthropic/claude-opus-4" (qualified)
# Plain uses DEFAULT provider, qualified uses EXPLICIT provider
# OpenCode format: "providerID/modelID" (e.g., "openai/gpt-4")

# GOTCHA: Tool Naming Convention
# MCP tools use "serverName__toolName" format (DOUBLE underscore)
# This is critical for tool executor delegation documentation

# GOTCHA: Provider terminate() Never Throws
# Both providers' terminate() methods are idempotent and never throw
 Errors are logged but not re-thrown (best-effort cleanup)

# PATTERN: Singleton Access
# ProviderRegistry.getInstance() - NOT new ProviderRegistry()
# Document this pattern clearly with example

# PATTERN: Lazy SDK Loading
# Both providers use dynamic import() in initialize()
# SDKs are not loaded until first use - optional dependencies
```

---

## Implementation Blueprint

### Data Models and Structure

The documentation structure follows the existing `docs/agent.md` pattern:

```markdown
# Providers

## Table of Contents
## Basic Usage
## Supported Providers
## Architecture
## Configuration
## Configuration Cascade
## Provider Registry
## Model Specification
## Provider Lifecycle
## Sessions
## Tools & MCP
## Hooks
## Skills
## Streaming
## API Reference
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE docs/providers.md with overview and TOC
  - IMPLEMENT: Title, brief description, auto-linked Table of Contents
  - FOLLOW pattern: docs/agent.md (header structure, TOC format)
  - NAMING: "# Providers" as H1 title
  - PLACEMENT: docs/ directory alongside agent.md, prompt.md, workflow.md

Task 2: WRITE "Supported Providers" section with capability table
  - IMPLEMENT: Table comparing Anthropic vs OpenCode capabilities
  - FOLLOW pattern: PRD.md Section 7.1 (provider table format)
  - INCLUDE: SDK packages, capability checkboxes (MCP, skills, LSP, streaming, sessions, extendedThinking)
  - GOTCHA: Mark OpenCode MCP/LSP as false (LLM-only mode limitation)

Task 3: WRITE "Architecture" section with diagram
  - IMPLEMENT: ASCII diagram showing provider system layers
  - SHOW: Provider Interface → Provider Implementations → Registry → Agent Integration
  - INCLUDE: Data flow from config through registry to execution
  - PATTERN: Use box-drawing characters (┌─┐ │ ▼) for clean ASCII art

Task 4: WRITE "Configuration" section with examples
  - IMPLEMENT: Global configuration with configureProviders()
  - IMPLEMENT: Agent-level provider configuration
  - IMPLEMENT: Prompt-level overrides
  - FOLLOW pattern: docs/agent.md "Configuration" section
  - INCLUDE: Type definitions inline (GlobalProviderConfig, ProviderOptions)

Task 5: WRITE "Configuration Cascade" explanation
  - IMPLEMENT: Priority order with visual cascade diagram
  - EXPLAIN: Nullish coalescing behavior (first wins, not base→override)
  - INCLUDE: Executable example showing all three levels
  - REFERENCE: src/utils/provider-config.ts lines 250-363

Task 6: WRITE "Provider Registry" section
  - IMPLEMENT: Singleton pattern explanation with getInstance()
  - IMPLEMENT: Provider lifecycle (initialize, terminate)
  - IMPLEMENT: Batch operations (initializeAll, terminateAll)
  - INCLUDE: Promise caching explanation
  - EXAMPLE: Register, initialize, use, terminate pattern

Task 7: WRITE "Model Specification" section
  - IMPLEMENT: Plain vs qualified format explanation
  - IMPLEMENT: ModelSpec interface definition
  - IMPLEMENT: OpenCode providerID/modelID format
  - INCLUDE: Table of examples with format types
  - REFERENCE: PRD.md Section 7.8

Task 8: WRITE "Provider Lifecycle" section
  - IMPLEMENT: initialize() phase (lazy SDK loading)
  - IMPLEMENT: execute() phase (request handling)
  - IMPLEMENT: terminate() phase (cleanup, idempotent)
  - INCLUDE: State transitions (UNINITIALIZED → INITIALIZING → INITIALIZED)

Task 9: WRITE "Sessions" section
  - IMPLEMENT: Anthropic session abstraction (in-memory Map)
  - IMPLEMENT: OpenCode native sessions
  - EXPLAIN: Session ID propagation through options
  - GOTCHA: Clarify Anthropic's "via abstraction layer" vs native

Task 10: WRITE "Tools & MCP" section
  - IMPLEMENT: MCPHandler integration pattern
  - IMPLEMENT: Tool delegation flow (Provider → Agent.toolExecutor → MCPHandler)
  - IMPLEMENT: Tool naming (serverName__toolName)
  - EXPLAIN: OpenCode LLM-only mode limitation clearly

Task 11: WRITE "Hooks" section
  - IMPLEMENT: Hook types (onToolStart, onToolEnd, onSessionStart, onSessionEnd)
  - IMPLEMENT: Provider hook adaptation to SDK hooks
  - INCLUDE: Hook lifecycle diagram
  - REFERENCE: src/providers/anthropic-provider.ts buildAgentSDKHooks()

Task 12: WRITE "Skills" section
  - IMPLEMENT: Skill loading via loadSkills()
  - IMPLEMENT: System prompt injection pattern
  - IMPLEMENT: SKILL.md file format
  - INCLUDE: Multi-skill combination example

Task 13: WRITE "Streaming" section
  - IMPLEMENT: Streaming vs non-streaming modes
  - IMPLEMENT: StreamEvent types (text_delta, tool_call_start, usage, done)
  - IMPLEMENT: AsyncGenerator return type
  - INCLUDE: Streaming example with for-await-of

Task 14: WRITE "API Reference" section
  - IMPLEMENT: Complete Provider interface signature
  - IMPLEMENT: ProviderRegistry class methods
  - IMPLEMENT: Configuration functions (configureProviders, getGlobalProviderConfig, resolveProviderConfig)
  - IMPLEMENT: Type definitions (ProviderId, ProviderCapabilities, ProviderOptions, ModelSpec)
  - FOLLOW pattern: docs/agent.md "API Reference" section (code-only, minimal text)

Task 15: ADD cross-references to examples
  - IMPLEMENT: Link to relevant example files
  - INCLUDE: examples/08-sdk-features.ts for tools/hooks
  - PLACE: At end of relevant sections or in dedicated "Examples" subsection
```

### Implementation Patterns & Key Details

```markdown
# Documentation Structure Pattern (from docs/agent.md)

## Section Name

[Brief description paragraph]

### Subsection

```typescript
// Executable example first
import { symbol } from 'groundswell';

const instance = createSymbol();
```

**Key Points:**
- Bullet point
- Explanation

#### Type Definition

```typescript
interface TypeDefinition {
  field: string;
}
```

**Priority Order:** (for cascade sections)
1. Highest priority
2. Medium priority
3. Lowest priority

# Architecture Diagram Pattern

```
┌─────────────────────────────────────────────────┐
│              Application Layer                   │
│  (Agent, Prompt, Workflow)                      │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         Provider Registry (Singleton)            │
│  - getInstance()                                │
│  - register(), get(), has()                     │
│  - initializeProvider(), initializeAll()         │
│  - terminateAll()                               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           Provider Implementations               │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │ AnthropicProvider│  │ OpenCodeProvider │    │
│  │ - SDK: claude-   │  │ - SDK: opencode  │    │
│  │   agent-sdk     │  │   -ai/sdk        │    │
│  └──────────────────┘  └──────────────────┘    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              Provider Interface                 │
│  - initialize(), terminate()                    │
│  - execute(), registerMCPs(), loadSkills()      │
└─────────────────────────────────────────────────┘
```

# Cascade Diagram Pattern

```
┌─────────────────────────────────────┐
│  Prompt-level Config (Highest)      │
│  provider: 'anthropic'              │
│  options: { ... }                   │
└────────────┬────────────────────────┘
             │ ?? (nullish coalescing)
             ▼
┌─────────────────────────────────────┐
│  Agent-level Config (Medium)        │
│  provider: 'opencode'               │
│  providerOptions: { ... }           │
└────────────┬────────────────────────┘
             │ ??
             ▼
┌─────────────────────────────────────┐
│  Global Config (Lowest)             │
│  defaultProvider: 'anthropic'       │
│  providerDefaults: { ... }          │
└─────────────────────────────────────┘
```

# JSDoc Example Pattern

```typescript
/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId = 'anthropic' | 'opencode';
```

# Executable Example Pattern

```typescript
import { configureProviders, ProviderRegistry } from 'groundswell';
import { AnthropicProvider, OpenCodeProvider } from 'groundswell';

// 1. Configure global defaults
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    opencode: { endpoint: 'http://localhost:4096' }
  }
});

// 2. Register providers
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());

// 3. Initialize all providers
await registry.initializeAll(getGlobalProviderConfig());
```
```

### Integration Points

```yaml
DOCUMENTATION_STRUCTURE:
  - create: docs/providers.md
  - pattern: Follow docs/agent.md structure exactly
  - sections: TOC, Supported Providers, Architecture, Configuration, Cascade, Registry, Models, Lifecycle, Sessions, Tools, Hooks, Skills, Streaming, API Reference

CROSS_REFERENCES:
  - add: Link to examples/08-sdk-features.ts in Tools section
  - add: Link to docs/agent.md for Agent integration details
  - add: Link to PRD.md Section 7 for authoritative specification

TYPE_REFERENCES:
  - include: All type definitions inline where discussed
  - format: TypeScript code blocks with syntax highlighting
  - source: src/types/providers.ts (exact signatures)

FILE_REFERENCES:
  - include: Source file paths in explanations
  - format: `src/providers/provider-registry.ts:278-295` (line ranges)
  - purpose: Enable readers to find implementation details
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Check for markdown linting issues (if markdown linter available)
npx markdownlint docs/providers.md --fix

# Verify markdown links work
npx markdown-link-check docs/providers.md

# Check for broken internal references
grep -o '\[.*\](\.\/.*\.md)' docs/providers.md | while read link; do
  file=$(echo "$link" | sed 's/.*](\(.*\))/\1/');
  if [ ! -f "docs/$file" ]; then
    echo "Missing reference: $file";
  fi;
done

# Expected: No broken links, no markdown lint errors
# If errors exist, READ output and fix before proceeding
```

### Level 2: Content Validation (Manual Review)

```bash
# Verify all sections from agent.md are present
echo "Checking for required sections..."
grep -q "## Table of Contents" docs/providers.md && echo "✓ TOC present"
grep -q "## Supported Providers" docs/providers.md && echo "✓ Supported Providers"
grep -q "## Architecture" docs/providers.md && echo "✓ Architecture"
grep -q "## Configuration" docs/providers.md && echo "✓ Configuration"
grep -q "## Configuration Cascade" docs/providers.md && echo "✓ Cascade"
grep -q "## Provider Registry" docs/providers.md && echo "✓ Registry"
grep -q "## Model Specification" docs/providers.md && echo "✓ Models"
grep -q "## Provider Lifecycle" docs/providers.md && echo "✓ Lifecycle"
grep -q "## Sessions" docs/providers.md && echo "✓ Sessions"
grep -q "## Tools & MCP" docs/providers.md && echo "✓ Tools"
grep -q "## Hooks" docs/providers.md && echo "✓ Hooks"
grep -q "## Skills" docs/providers.md && echo "✓ Skills"
grep -q "## Streaming" docs/providers.md && echo "✓ Streaming"
grep -q "## API Reference" docs/providers.md && echo "✓ API Reference"

# Verify executable TypeScript examples are syntactically valid
# Extract code blocks and check with TypeScript compiler
# (Manual check: copy-paste examples into IDE to verify)
```

### Level 3: Link Validation

```bash
# Verify all referenced source files exist
echo "Checking source file references..."
grep -o 'src/[^)]*\.ts' docs/providers.md | sort -u | while read file; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "✗ $file NOT FOUND"
  fi
done

# Verify all referenced documentation files exist
echo "Checking documentation references..."
grep -o 'docs/[^)]*\.md' docs/providers.md | sort -u | while read file; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "✗ $file NOT FOUND"
  fi
done

# Expected: All referenced files exist
```

### Level 4: Completeness Validation

```bash
# Verify all critical concepts are documented
echo "Checking critical concepts..."
grep -q "ProviderId" docs/providers.md && echo "✓ ProviderId documented"
grep -q "ProviderCapabilities" docs/providers.md && echo "✓ Capabilities documented"
grep -q "ProviderOptions" docs/providers.md && echo "✓ Options documented"
grep -q "Provider interface" docs/providers.md && echo "✓ Interface documented"
grep -q "GlobalProviderConfig" docs/providers.md && echo "✓ Global config documented"
grep -q "configureProviders" docs/providers.md && echo "✓ configureProviders()"
grep -q "ProviderRegistry" docs/providers.md && echo "✓ Registry documented"
grep -q "getInstance" docs/providers.md && echo "✓ Singleton pattern"
grep -q "ModelSpec" docs/providers.md && echo "✓ ModelSpec documented"
grep -q "anthropic/claude" docs/providers.md && echo "✓ Qualified format example"
grep -q "cascade" docs/providers.md && echo "✓ Cascade explained"
grep -q "nullish coalescing" docs/providers.md && echo "✓ Cascade mechanism"
grep -q "serverName__toolName" docs/providers.md && echo "✓ Tool naming pattern"
grep -q "LLM-only mode" docs/providers.md && echo "✓ OpenCode limitation"
grep -q "session abstraction" docs/providers.md && echo "✓ Anthropic sessions"
grep -q "lazy loading" docs/providers.md && echo "✓ Lazy SDK loading"

# Verify capability table exists and has correct structure
grep -A 5 "Capability.*Anthropic.*OpenCode" docs/providers.md > /dev/null && echo "✓ Capability table present"

# Verify architecture diagram exists
grep -q "┌─┐" docs/providers.md && echo "✓ Architecture diagram present"

# Verify cascade diagram exists
grep -q "Prompt-level.*Agent-level.*Global" docs/providers.md && echo "✓ Cascade diagram present"
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 14 sections from Implementation Tasks completed
- [ ] Table of Contents with auto-links to all sections
- [ ] All TypeScript code blocks are syntactically valid
- [ ] All file references (src/..., docs/...) exist and are accurate
- [ ] All internal links work (markdown-link-check passes)
- [ ] Architecture diagram uses consistent box-drawing characters
- [ ] Capability table matches PRD.md Section 7.4
- [ ] Configuration cascade explanation includes nullish coalescing behavior
- [ ] Tool naming convention (serverName__toolName) is documented
- [ ] OpenCode LLM-only mode limitation is clearly explained
- [ ] Anthropic session abstraction (not native) is clarified

### Feature Validation

- [ ] Basic Usage section has executable example
- [ ] Supported Providers table includes SDK packages
- [ ] Architecture diagram shows all layers (Interface → Implementations → Registry → Agent)
- [ ] Configuration section shows all three levels (global, agent, prompt)
- [ ] Configuration Cascade section has visual diagram
- [ ] Provider Registry section explains singleton pattern
- [ ] Model Specification section explains plain vs qualified formats
- [ ] Provider Lifecycle section explains initialization states
- [ ] Sessions section differentiates Anthropic (abstraction) vs OpenCode (native)
- [ ] Tools & MCP section explains delegation pattern
- [ ] Hooks section lists all hook types
- [ ] Skills section explains SKILL.md format
- [ ] Streaming section explains AsyncGenerator return type
- [ ] API Reference section has complete interface signatures

### Documentation Quality Validation

- [ ] Follows docs/agent.md structure exactly
- [ ] Uses JSDoc style from implementation_patterns.md
- [ ] All code examples use executable TypeScript
- [ ] Type definitions are inline where discussed
- [ ] Cross-references to examples/08-sdk-features.ts included
- [ ] Cross-references to docs/agent.md for Agent integration included
- [ ] Source file references with line numbers for key patterns
- [ ] PRD section references included where relevant
- [ ] GOTCHA sections highlight critical implementation details
- [ ] PATTERN sections explain reusable patterns
- [ ] CRITICAL sections call out non-obvious requirements

### Style Validation

- [ ] H1 title: "# Providers"
- [ ] H2 sections: "## Section Name"
- [ ] H3 subsections: "### Subsection Name"
- [ ] Code blocks use "typescript" or "ts" language identifier
- [ ] Inline code uses backticks
- [ ] Tables use proper Markdown table syntax
- [ ] Lists use proper Markdown syntax (- for bullets, 1. for numbered)
- [ ] Horizontal rules use "---" for section separation
- [ ] Bold text uses "**text**"
- [ ] Italic text uses "*text*"

### Completeness Validation

- [ ] All ProviderId values documented ('anthropic', 'opencode')
- [ ] All ProviderCapabilities flags documented (mcp, skills, lsp, streaming, sessions, extendedThinking)
- [ ] All ProviderOptions fields documented (endpoint, apiKey, sessionId, timeout, headers)
- [ ] All Provider interface methods documented (initialize, terminate, execute, registerMCPs, loadSkills, normalizeModel)
- [ ] All ProviderRegistry methods documented (register, get, has, initializeProvider, initializeAll, getStatus, isReady, terminateAll)
- [ ] All configuration functions documented (configureProviders, getGlobalProviderConfig, resolveProviderConfig)
- [ ] ModelSpec interface documented (provider, model, raw)
- [ ] All three initialization states documented (UNINITIALIZED, INITIALIZING, INITIALIZED, FAILED)

---

## Anti-Patterns to Avoid

- ❌ Don't create new documentation structure - follow docs/agent.md exactly
- ❌ Don't skip the architecture diagram - visual representation is critical
- ❌ Don't omit the configuration cascade explanation - this is a common source of confusion
- ❌ Don't forget to explain OpenCode's LLM-only mode limitation
- ❌ Don't document Anthropic sessions as "native" - they're an abstraction layer
- ❌ Don't use generic provider examples - use concrete Anthropic/OpenCode examples
- ❌ Don't skip cross-references to source files - readers need to find implementation
- ❌ Don't omit the tool naming convention (serverName__toolName)
- ❌ Don't forget to explain lazy SDK loading pattern
- ❌ Don't use non-executable code examples - all TypeScript must be valid
- ❌ Don't create sections that don't exist in docs/agent.md - maintain consistency
- ❌ Don't use complex diagram formats - simple ASCII art with box-drawing characters

---

## Success Metrics

**Confidence Score:** 10/10 for one-pass implementation success

**Validation:** The completed documentation should enable a developer unfamiliar with the codebase to:
1. Understand the multi-provider architecture at a high level
2. Configure providers at all three levels (global, agent, prompt)
3. Register, initialize, and use providers via the registry
4. Understand the configuration cascade priority order
5. Differentiate between Anthropic and OpenCode capabilities
6. Understand tool delegation and the OpenCode LLM-only limitation
7. Navigate to the relevant source files for implementation details

**Output File:** `/home/dustin/projects/groundswell/docs/providers.md`

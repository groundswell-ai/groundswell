# Product Requirement Prompt (PRP): Document OpenCode SDK API

---

## Goal

**Feature Goal**: Document the complete OpenCode SDK API with TypeScript signatures, code examples, and integration patterns in the existing `architecture/external_dependencies.md` file.

**Deliverable**: Updated `plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md` with comprehensive OpenCode SDK documentation section.

**Success Definition**: The documentation enables a reader unfamiliar with OpenCode SDK to:
- Understand the package architecture (client-server model)
- Locate and use the main API exports (Session, Provider, MCP, LSP, Tool namespaces)
- See working code examples for key operations (session creation, prompting, streaming)
- Compare OpenCode SDK patterns with Anthropic SDK patterns already documented
- Make an informed decision about implementation strategy for P3.M1.T1.S3

## User Persona

**Target User**: Groundswell developer / architect implementing the multi-provider system (P3.M2).

**Use Case**: The developer needs to understand the OpenCode SDK API to determine if it can be implemented as a Provider in the Groundswell architecture, or if an alternative SDK should be used.

**User Journey**:
1. Reader opens `external_dependencies.md` to find existing SDK documentation (Anthropic Agent SDK)
2. Reader navigates to OpenCode SDK section (already started with basic package info)
3. Reader reviews complete API documentation with TypeScript signatures
4. Reader compares OpenCode SDK patterns with Anthropic SDK patterns
5. Reader makes decision for P3.M1.T1.S3 (Determine Implementation Strategy)

**Pain Points Addressed**:
- OpenCode SDK has no public GitHub repository or comprehensive documentation
- Package is a client-server architecture (unlike standalone Anthropic SDK)
- TypeScript definitions are auto-generated from OpenAPI spec (complex nested types)
- Need to understand API before deciding on implementation strategy

## Why

- **Business value**: Enables informed decision on multi-provider implementation strategy (Strategy A: OpenCode SDK vs Strategy C: Alternative SDK)
- **Integration with existing features**: Aligns with Provider interface pattern established in P1 (Provider Type System) and P2 (Anthropic Provider Implementation)
- **Problems this solves**: Provides complete API reference without requiring external server installation or manual TypeScript inspection

---

## What

Add comprehensive OpenCode SDK API documentation to `plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md`.

### Documentation Sections to Add

1. **Core API Structure** - Main exports, OpencodeClient class, API namespaces
2. **Session API** - Primary execution interface with TypeScript signatures
3. **Multi-Provider Support** - Provider list, model format (`providerID/modelID`), configuration
4. **TypeScript Type Definitions** - Message types, Part types (streaming), Tool states
5. **MCP & LSP Integration** - MCP namespace (add, connect, status), LSP namespace
6. **Real-Time Events** - Server-Sent Events for streaming
7. **Code Examples** - Working examples from ecosystem (Vercel AI SDK provider)
8. **Comparison Table** - OpenCode SDK vs Anthropic SDK architectural differences
9. **Integration Considerations** - Server dependency, tool execution patterns, gotchas
10. **Recommendation** - Implementation strategy guidance for P3.M1.T1.S3

### Success Criteria

- [ ] Documentation follows existing structure in `external_dependencies.md` (matches Anthropic Agent SDK format)
- [ ] All API signatures include exact TypeScript types (from locally installed package)
- [ ] Code examples are executable and demonstrate key patterns
- [ ] Comparison with Anthropic SDK highlights architectural differences
- [ ] Links to research files are included for deep-dive reference
- [ ] Implementation recommendation is clear for P3.M1.T1.S3 decision

---

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase or OpenCode SDK, would they have everything needed to implement this documentation successfully?

**Answer**: Yes - this PRP includes:
- Exact file paths to existing documentation structure
- Exact file paths to locally installed TypeScript definitions
- Research findings with complete API signatures
- Code examples from ecosystem packages
- Anthropic SDK documentation pattern to follow

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: Official package page with version info, maintainers, description
  critical: Package version 1.1.36, MIT license, zero dependencies

- url: https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
  why: Vercel AI SDK provider for OpenCode with working code examples
  critical: Shows session management, streaming, model specification patterns

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: Existing documentation structure to follow (Anthropic Agent SDK section as pattern)
  pattern: Package Information, Official Resources, Core API, Code Examples, Integration sections
  gotcha: OpenCode SDK section already exists (lines 334-454) - need to EXTEND not replace

- file: /home/dustin/projects/groundswell/node_modules/@opencode-ai/sdk/dist/index.d.ts
  why: Main entry point TypeScript definitions
  pattern: Re-exports from client.d.ts, server.d.ts, gen/sdk.gen.d.ts
  gotcha: Package uses ESM module format

- file: /home/dustin/projects/groundswell/node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts
  why: OpencodeClient class definition with all API namespaces (Session, Provider, MCP, LSP, Tool, Event)
  pattern: Each namespace is a class with methods returning RequestResult<T>
  gotcha: Auto-generated from OpenAPI spec - complex nested types

- file: /home/dustin/projects/groundswell/node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts
  why: Core type definitions (UserMessage, AssistantMessage, Part, ToolState)
  pattern: Discriminated unions for type safety (TextPart, ReasoningPart, ToolPart, etc.)
  gotcha: 76KB file - use targeted reading for specific types

- file: /home/dustin/projects/groundswell/node_modules/@opencode-ai/sdk/dist/gen/client/types.gen.d.ts
  why: Client configuration interface (Config type)
  pattern: Extended RequestInit with auth, headers, responseTransformer options
  gotcha: Supports custom fetch implementation

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Complete research report with all API signatures, examples, comparisons
  section: Sections 4-12 contain the API documentation to synthesize
  critical: Contains architectural difference analysis and implementation recommendations

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Provider interface definition that OpenCode SDK must map to
  pattern: Provider interface with initialize(), execute(), registerMCPs(), loadSkills(), normalizeModel()
  critical: Shows what features are required for any provider implementation
```

### Current Codebase Tree

```bash
plan/003_dd63ad365ffb/
├── docs/
│   └── architecture/
│       ├── external_dependencies.md    # TARGET FILE - update this
│       ├── implementation_patterns.md
│       └── decisions.md
├── P3M1T1S2/
│   ├── PRP.md                          # THIS FILE
│   └── research/
│       └── opencode-sdk-complete-research.md  # Research source
└── tasks.json                          # DO NOT MODIFY
```

### Desired Documentation Structure (in external_dependencies.md)

```markdown
## OpenCode Agent SDK

### Package Information
- [Existing content - keep]

### Official Resources
- [Existing content - keep]

### Installation Commands
- [Existing content - keep]

### Core API Structure
[NEW - Main exports, OpencodeClient class, API namespaces]

### Session API (Primary Execution Interface)
[NEW - Session creation, execution, message retrieval with TypeScript signatures]

### Multi-Provider Support
[NEW - Provider API, model format, configuration API]

### TypeScript Type Definitions
[NEW - Core message types, Part types for streaming, Tool states]

### MCP & LSP Integration
[NEW - MCP namespace, Tool namespace, LSP namespace]

### Real-Time Events (Server-Sent Events)
[NEW - Event subscription, event types]

### Code Examples
[NEW - Working examples from ecosystem]

### Architectural Comparison
[NEW - OpenCode SDK vs Anthropic SDK table]

### Integration Considerations
[NEW - Server dependency, tool execution patterns, gotchas]

### Recommendation for P3.M1.T1.S3
[NEW - Implementation strategy guidance]
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: OpenCode SDK is NOT a standalone execution library
// It requires an external 'opencode' server process running
// This is fundamentally different from Anthropic Agent SDK

// GOTCHA: Package uses ESM format only
// Cannot use require() - must use import statements

// GOTCHA: All types are auto-generated from OpenAPI spec
// Result: Complex nested types like RequestResult<TResponses, TErrors, TThrowOnError, TResponseStyle>

// GOTCHA: Session state is stored server-side, not in client
// Sessions persist across client restarts (if server running)

// GOTCHA: Tool execution is server-side only
// Cannot provide custom tool implementations - can only observe via events

// GOTCHA: Default port 4096 may conflict with other services
// Need to handle port conflicts in server creation

// PATTERN: RequestResult always returns { data, error, status }
// Must check error property before accessing data

// PATTERN: Model format uses providerID/modelID object, not string
// Groundswell uses "provider/model" string - need conversion
```

---

## Implementation Blueprint

### Documentation Structure Plan

Extend the existing OpenCode SDK section in `external_dependencies.md` (lines 334-454) with detailed subsections following the Anthropic Agent SDK pattern.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: BACKUP existing external_dependencies.md
  - CREATE backup: external_dependencies.md.backup
  - PRESERVE: All existing content (Anthropic SDK, MCP, Zod, etc.)
  - LOCATION: plan/003_dd63ad365ffb/docs/architecture/

Task 2: READ existing OpenCode SDK section (lines 334-454)
  - IDENTIFY: What content exists (package info, official resources)
  - PRESERVE: All existing content - this is EXTENSION not replacement
  - FIND: Insertion point after "Implementation Strategy" section (line ~454)

Task 3: INSERT "Core API Structure" section
  - ADD: Main entry point exports (createOpencode, createOpencodeClient)
  - ADD: OpencodeClient class definition with all namespaces
  - FOLLOW: Pattern from Anthropic SDK "Main Entry Point" section
  - TYPESPEC: Use exact signatures from research/opencode-sdk-complete-research.md sections 3-4
  - PLACEMENT: After "Implementation Strategy" section, before new detailed sections

Task 4: INSERT "Session API" section
  - ADD: Session class with all methods (create, prompt, messages, etc.)
  - ADD: TypeScript signatures for each method
  - ADD: SessionPromptData type definition (request body structure)
  - FOLLOW: Pattern from Anthropic SDK "Query Interface" section
  - TYPESPEC: Use research file section 5 (Session API)
  - PLACEMENT: After Core API Structure section

Task 5: INSERT "Multi-Provider Support" section
  - ADD: Provider namespace methods (list, auth)
  - ADD: ProviderListResponse type with 75+ provider structure
  - ADD: Model format examples (providerID/modelID)
  - FOLLOW: Pattern from Anthropic SDK "Model Specification"
  - TYPESPEC: Use research file section 6 (Multi-Provider Support)
  - PLACEMENT: After Session API section

Task 6: INSERT "TypeScript Type Definitions" section
  - ADD: UserMessage type (input)
  - ADD: AssistantMessage type (response)
  - ADD: Part types (TextPart, ReasoningPart, ToolPart, etc.)
  - ADD: ToolState types (pending, running, completed, error)
  - FOLLOW: Pattern from Anthropic SDK "Message Types" section
  - TYPESPEC: Use research file section 7 (TypeScript Type Definitions)
  - PLACEMENT: After Multi-Provider Support section

Task 7: INSERT "MCP & LSP Integration" section
  - ADD: MCP namespace methods (status, add, connect, disconnect)
  - ADD: Tool namespace methods (ids, list)
  - ADD: LSP namespace methods (status)
  - FOLLOW: Pattern from Anthropic SDK "MCP Server Configuration"
  - TYPESPEC: Use research file sections 8-9 (MCP & LSP Integration)
  - PLACEMENT: After TypeScript Type Definitions section

Task 8: INSERT "Real-Time Events" section
  - ADD: Event subscription methods
  - ADD: Event types (message.part.updated, permission.updated, etc.)
  - ADD: Server-Sent Events pattern
  - FOLLOW: Pattern from Anthropic SDK "Hook System" section (for comparison)
  - TYPESPEC: Use research file section 10 (Real-Time Events)
  - PLACEMENT: After MCP & LSP Integration section

Task 9: INSERT "Code Examples" section
  - ADD: Basic client initialization example
  - ADD: Session creation and prompt example
  - ADD: Provider listing example
  - ADD: Streaming events example
  - ADD: MCP integration example
  - FOLLOW: Pattern from Anthropic SDK "Current Groundswell Integration"
  - EXAMPLES: Use research file section 12 (Code Examples from Ecosystem)
  - PLACEMENT: After Real-Time Events section

Task 10: INSERT "Architectural Comparison" section
  - ADD: Comparison table (OpenCode SDK vs Anthropic SDK)
  - ADD: Key differences: architecture, execution, sessions, tools, streaming
  - FOLLOW: Table format from "Alternative Multi-Provider SDKs" section
  - COMPARISON: Use research file section 13 (Architectural Differences)
  - PLACEMENT: After Code Examples section

Task 11: INSERT "Integration Considerations" section
  - ADD: Critical architectural mismatch warning
  - ADD: Server dependency implications
  - ADD: Tool execution limitations
  - ADD: Session management differences
  - ADD: Gotchas and special considerations
  - FOLLOW: Warning/advisory format pattern
  - CONSIDERATIONS: Use research file section 14 (Integration Considerations)
  - PLACEMENT: After Architectural Comparison section

Task 12: INSERT "Recommendation for P3.M1.T1.S3" section
  - ADD: Implementation strategy options (A, B, C)
  - ADD: Recommended strategy (Strategy C: Alternative SDK)
  - ADD: Rationale for recommendation
  - ADD: Alternative SDK suggestions (Vercel AI SDK)
  - FOLLOW: Decision document pattern
  - RECOMMENDATION: Use research file section 17 (Recommendations)
  - PLACEMENT: After Integration Considerations section

Task 13: UPDATE "Alternative Multi-Provider SDKs" table
  - ADD: OpenCode SDK row with accurate information
  - UPDATE: Provider count to 75+ (not 17+)
  - UPDATE: MCP Support column to "Native" (not "Via LangChain")
  - UPDATE: Notes column with "Client-server architecture"
  - MODIFY: Existing table at line ~434
  - REFERENCE: Use research file section 13 comparison table

Task 14: CREATE "Research References" section
  - ADD: Link to opencode-sdk-complete-research.md
  - ADD: Links to npm package, Vercel AI SDK provider
  - ADD: Links to locally installed TypeScript definitions
  - PLACEMENT: At end of OpenCode SDK section, before "---" separator

Task 15: VALIDATE markdown formatting
  - CHECK: All code blocks have language specifiers (typescript, bash)
  - CHECK: All tables are properly formatted
  - CHECK: All links are valid (both external and internal)
  - CHECK: Header hierarchy is correct (##, ###, ####)
  - FIX: Any formatting issues before finalizing

Task 16: CREATE git diff preview
  - RUN: git diff plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  - REVIEW: Changes to ensure only OpenCode SDK section is modified
  - VERIFY: No changes to Anthropic SDK or other sections
  - ABORT: If unintended changes detected
```

### Implementation Patterns & Key Details

```markdown
# Documentation Pattern to Follow (from Anthropic SDK section)

## Section Name

### Subsection Name
- **Property:** Value
- **Type:** Value

Brief description of what this section covers.

#### Code Example
```typescript
// Always include language specifier
import { Something } from 'somewhere';

const example = new Something();
```

#### Type Signature
```typescript
// Exact types from source
interface Example {
  property: string;
  method(): Promise<void>;
}
```

# Pattern for OpenCode SDK Documentation

## OpenCode Agent SDK [EXTEND THIS]

### Core API Structure

#### Main Entry Point
```typescript
import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';

// Client-only (connects to existing server)
const client = createOpencodeClient({
  baseUrl: 'http://localhost:3000',
  directory: '/path/to/project'
});

// Server + client (starts local server)
const { client, server } = await createOpencode({
  hostname: '127.0.0.1',
  port: 4096
});
```

#### OpencodeClient Class
```typescript
class OpencodeClient {
  session: Session;      // Primary execution API
  provider: Provider;    // Multi-provider management
  mcp: Mcp;             // MCP integration
  lsp: Lsp;             // LSP integration
  tool: Tool;           // Tool management
  event: Event;         // Real-time events
  // ... and 10+ more namespaces
}
```

# Critical gotchas to highlight

> **IMPORTANT:** OpenCode SDK uses a **client-server architecture**.
> Unlike Anthropic Agent SDK (standalone library), this requires:
> - External `opencode` server process running
> - HTTP/WebSocket communication
> - Server-side session storage
> - No direct tool control (observation-only via events)

# Comparison table pattern

| Aspect | Anthropic Agent SDK | OpenCode SDK |
|--------|-------------------|--------------|
| **Architecture** | Standalone library | Client-server (requires server) |
| **Execution** | `query()` function | `session.prompt()` method |
| **Sessions** | `continue: true` flag | Native session objects with IDs |
```

### Integration Points

```yaml
EXTERNAL_DEPENDENCIES_FILE:
  - path: plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  - action: EXTEND existing OpenCode SDK section (lines 334-454)
  - preserve: All existing content (Anthropic SDK, MCP, Zod, etc.)
  - insertion_point: After line 454 (after "Implementation Strategy" section)

RESEARCH_FILE:
  - path: plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  - usage: Source for all API signatures, examples, comparisons
  - sections_to_use: 4 (API Structure), 5 (Session API), 6 (Multi-Provider), 7 (Types), 8-9 (MCP/LSP), 10 (Events), 12 (Examples), 13 (Comparison), 14-17 (Considerations)

NODE_MODULES:
  - path: node_modules/@opencode-ai/sdk/dist/
  - files_for_reference:
    - index.d.ts (main exports)
    - gen/sdk.gen.d.ts (OpencodeClient class)
    - gen/types.gen.d.ts (core types)
    - gen/client/types.gen.d.ts (config)

LINKS_TO_INCLUDE:
  - npm: https://www.npmjs.com/package/@opencode-ai/sdk
  - vercel_provider: https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk
  - research: ./P3M1T1S2/research/opencode-sdk-complete-research.md
  - types: ../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate markdown syntax
# Install markdownlint if not available: npm install -g markdownlint-cli
markdownlint plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md

# Check for broken links
# Use markdown-link-check: npm install -g markdown-link-check
markdown-link-check plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md

# Validate code blocks are properly formatted
grep -n '^\`\`\`' plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md | wc -l
# Should be even number (opening + closing for each code block)

# Validate table formatting (all rows have same column count)
# Use tool or manual inspection

# Expected: Zero syntax errors, all links valid, tables properly formatted
```

### Level 2: Content Validation (Documentation Quality)

```bash
# Verify TypeScript signatures match installed package
# Spot-check key signatures against node_modules

# Check Session.create signature
grep -A 5 'class Session' node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.d.ts

# Check UserMessage type
grep -A 20 'export type UserMessage' node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts

# Verify code examples are syntactically valid TypeScript
# Copy example code to temp file and run: npx tsc --noEmit temp.ts

# Expected: All signatures accurate, all examples compile
```

### Level 3: Integration Validation (File Context)

```bash
# Verify backup was created
test -f plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md.backup && echo "Backup exists"

# Check only OpenCode SDK section was modified
git diff plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md | grep '^@@'
# Should only show changes around lines 334-500 (OpenCode SDK section)

# Verify no changes to Anthropic SDK section
git diff plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md | grep -q '^-.*Anthropic' && echo "Anthropic section modified - ABORT" || echo "Anthropic section intact"

# Expected: Only OpenCode SDK section modified, all other content unchanged
```

### Level 4: User Acceptance Validation

```bash
# Open documentation in markdown preview
# VS Code: Ctrl+Shift+V (Windows/Linux) or Cmd+Shift+V (Mac)
# Or use CLI: grip plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md

# Manual validation checklist:
# [ ] Can I find the OpenCode SDK section easily?
# [ ] Can I understand the architecture (client-server)?
# [ ] Can I see the main API exports?
# [ ] Can I find code examples for common operations?
# [ ] Can I compare with Anthropic SDK patterns?
# [ ] Is the implementation recommendation clear?
# [ ] Are all links clickable and working?
# [ ] Are code blocks readable with syntax highlighting?

# Expected: Documentation is navigable, understandable, actionable
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 16 implementation tasks completed
- [ ] Markdown syntax is valid (markdownlint passes)
- [ ] All internal links resolve (research file, type definition files)
- [ ] All external links resolve (npm, GitHub)
- [ ] Code blocks have language specifiers (typescript, bash)
- [ ] Tables are properly formatted (equal column counts)
- [ ] TypeScript signatures match installed package exactly

### Content Validation

- [ ] Package information is accurate (version 1.1.36)
- [ ] API signatures are complete (Session, Provider, MCP, LSP, Tool, Event)
- [ ] Code examples are executable and demonstrate key patterns
- [ ] Architectural comparison table is clear and accurate
- [ ] Integration considerations highlight server dependency
- [ ] Implementation recommendation is explicit for P3.M1.T1.S3
- [ ] Research references link to complete report

### Documentation Quality Validation

- [ ] Follows existing Anthropic SDK documentation pattern
- [ ] Section hierarchy is logical (##, ###, ####)
- [ ] Critical gotchas are highlighted (client-server architecture)
- [ ] Comparison with Anthropic SDK is thorough
- [ ] Code examples cover: initialization, session, prompt, streaming, MCP
- [ ] Backup of original file exists

### Context Completeness Validation

- [ ] Passes "No Prior Knowledge" test - someone unfamiliar with OpenCode SDK can understand the API
- [ ] All YAML references in this PRP are specific and accessible
- [ ] File paths are exact and accurate
- [ ] Research file references include section numbers
- [ ] npm package URL is included with specific version

---

## Anti-Patterns to Avoid

- **Don't modify existing sections** - Only extend OpenCode SDK section, preserve Anthropic SDK and other dependencies
- **Don't replace existing content** - The OpenCode SDK section already has basic info (lines 334-454), extend it
- **Don't omit TypeScript signatures** - Exact types are critical for understanding the API
- **Don't skip architectural warnings** - The client-server difference is critical for P3.M1.T1.S3 decision
- **Don't forget comparison table** - Developers need to see OpenCode vs Anthropic side-by-side
- **Don't bury the recommendation** - P3.M1.T1.S3 needs clear guidance on implementation strategy
- **Don't use vague references** - All links must be specific URLs with anchors where applicable
- **Don't create broken links** - Validate all external and internal links before finalizing

---

## Confidence Score

**One-Pass Implementation Success Likelihood: 9/10**

**Rationale:**
- Complete research already done with all API signatures extracted
- Existing documentation pattern (Anthropic SDK) is clear and replicable
- File paths are exact and accessible
- Task breakdown is sequential and dependency-ordered
- Validation gates are specific and executable
- Only risk is markdown formatting quirks (mitigated by validation steps)

**If you implement this PRP and any step fails, the failure will likely be:**
1. Markdown table formatting issues (easily fixed with validation tools)
2. Link path resolution (easily fixed with relative path correction)
3. Signature typo from research extraction (easily fixed by cross-referencing node_modules)

---

## Research Summary

This PRP is based on comprehensive research completed in parallel subagents:

1. **Documentation Pattern Analysis**: Identified existing structure in `external_dependencies.md` following Anthropic Agent SDK format
2. **External Research**: Located npm package, Vercel AI SDK provider with working examples
3. **Local Installation & Inspection**: Installed `@opencode-ai/sdk@1.1.36` and extracted all TypeScript definitions from node_modules
4. **Complete Research Report**: 1,148-line comprehensive report at `/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md`

**Key Finding for P3.M1.T1.S3**: OpenCode SDK uses a **client-server architecture** (requires external server process), which is fundamentally different from Anthropic Agent SDK (standalone library). This impacts the implementation strategy decision significantly.

**Documentation Focus**: Provide complete API information to enable informed decision-making, while highlighting architectural differences that make OpenCode SDK potentially unsuitable as a Groundswell provider.

---

**PRP Version:** 1.0
**Created For:** Subtask P3.M1.T1.S2 - Document OpenCode SDK API
**PRD Reference:** Phase 3, Milestone 3.1, Task 1, Subtask 2
**Estimated Implementation Time:** 2-3 hours (documentation focused, no code changes)

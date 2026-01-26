# Product Requirement Prompt (PRP): Search npm registry for OpenCode SDK

---

## Goal

**Feature Goal**: Locate and document the exact npm package name for the OpenCode SDK to enable implementation of the OpenCodeProvider in Phase 3 of the multi-provider system.

**Deliverable**: A completed research entry in `plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md` documenting the OpenCode SDK package name, version, installation command, and ecosystem context.

**Success Definition**:
- The exact npm package name is documented
- Latest version number is recorded
- Installation command is provided
- Related ecosystem packages are listed
- Documentation URLs are captured
- Implementation strategy recommendation is provided

## User Persona (if applicable)

**Target User**: Development team implementing Phase 3 (OpenCode Provider) of the multi-provider system.

**Use Case**: The engineering team needs to integrate the OpenCode SDK as a second provider (alongside Anthropic) to enable multi-provider AI model access through a unified interface.

**User Journey**:
1. Developer begins Phase 3 implementation
2. Reviews external_dependencies.md for OpenCode SDK package details
3. Uses documented installation command to add dependency
4. References package documentation for API patterns
5. Implements OpenCodeProvider following established patterns

**Pain Points Addressed**:
- Removes ambiguity about package name (multiple candidates existed)
- Provides verified installation commands
- Documents ecosystem context for informed implementation decisions
- Enables forward progress on Phase 3 without blocking on external research

## Why

- **Business Value**: Enables multi-provider support (75+ AI providers) through OpenCode SDK, giving users flexibility in model selection and provider pricing
- **Integration with Existing Features**: Builds upon completed Phase 1 (Provider Type System) and Phase 2 (AnthropicProvider) to extend multi-provider capabilities
- **Problems Solved**: Resolves the "OpenCode SDK package name" open question documented in system_context.md, unblocking Phase 3 implementation

## What

**User-Visible Behavior**: No direct user-visible behavior (this is a research/documentation task). The output enables future implementation of OpenCodeProvider.

**Technical Requirements**:
1. Search npm registry for OpenCode SDK package
2. Verify exact package name from candidates (@opencode-ai/sdk, opencode-agent-sdk, @opencodehq/agent-sdk)
3. Document package metadata (version, license, maintainers, size, dependencies)
4. List related ecosystem packages
5. Provide installation commands
6. Document alternative SDK options if primary package is unsuitable

### Success Criteria

- [ ] OpenCode SDK package name verified and documented
- [ ] Package metadata recorded in external_dependencies.md
- [ ] Installation command tested and verified
- [ ] Ecosystem packages catalogued
- [ ] Documentation URLs captured
- [ ] Implementation strategy recommendation provided
- [ ] Alternative SDK options documented (for fallback)

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact npm package name with verification
- Installation commands
- Package metadata and version
- Documentation URLs
- Ecosystem context
- Alternative options
- Codebase structure context

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Primary Research Source (already completed)
- docfile: plan/003_dd63ad365ffb/P3M1T1S1/research/opencode-sdk-research.md
  why: Contains completed npm registry research results with exact package name, version, and ecosystem analysis
  critical: The package @opencode-ai/sdk v1.1.36 has been verified as the correct package

# Existing External Dependencies Documentation (to update)
- file: plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: This is the target file to update with OpenCode SDK findings; contains existing Anthropic SDK documentation as reference
  pattern: Follow the same format as the "Anthropic Agent SDK" section (Package Information, Official Resources, Core API)
  gotcha: The OpenCode SDK section currently says "Status: UNVERIFIED" - this must be updated with verified findings

# System Context (for codebase understanding)
- file: plan/003_dd63ad365ffb/docs/architecture/system_context.md
  why: Provides context on current implementation status and Phase 3 requirements
  section: "## Open Questions (From Research)" section documents the research need
  critical: The provider system is already implemented for Anthropic (Phase 2 complete)

# Implementation Patterns (for future reference)
- file: plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md
  why: Documents the patterns to follow when implementing OpenCodeProvider in later tasks
  section: "## File Organization Patterns" and "## Provider Implementation Patterns"
  gotcha: This PRP is for RESEARCH only - no code implementation in this task

# Existing AnthropicProvider (reference for future OpenCodeProvider)
- file: src/providers/anthropic-provider.ts
  why: Shows the pattern that OpenCodeProvider will follow in later tasks (P3.M2)
  pattern: Lazy loading, MCP integration, hooks adapter, session management
  gotcha: This PRP does NOT implement OpenCodeProvider - that's P3.M2.T1

# PRD Section 7 (Multi-Provider Requirements)
- file: PRD.md
  why: Defines the requirements that OpenCode SDK must satisfy
  section: Section 7 - Multi-Provider Agent SDK Support
  critical: OpenCode must support: 75+ providers, native sessions, MCP, skills, LSP, extended thinking

# Task Definition (from tasks.json)
- docfile: plan/003_dd63ad365ffb/tasks.json
  why: Contains the official contract definition for this subtask
  section: P3.M1.T1.S1 (lines 429-436)
  critical: CONTRACT DEFINITION specifies exact INPUT, LOGIC, and OUTPUT requirements

# NPM Package Registry (for verification)
- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: Official npm registry page for verification
  critical: Latest version is 1.1.36 (as of research date)

# NPM Package Tarball (for inspection)
- url: https://registry.npmjs.org/@opencode-ai/sdk/-/sdk-1.1.36.tgz
  why: Direct download link for package inspection if needed
  gotcha: 453.8 kB unpacked size, zero dependencies
```

### Current Codebase Tree

```bash
# Key directories and files for this task
plan/003_dd63ad365ffb/
├── docs/
│   └── architecture/
│       ├── external_dependencies.md    # TARGET FILE - update with OpenCode SDK findings
│       ├── system_context.md           # Context on Phase 3 requirements
│       ├── implementation_patterns.md  # Patterns for future implementation
│       └── decisions.md                # Architecture decisions
├── P3M1T1S1/                           # This subtask's working directory
│   ├── research/                       # Research notes directory
│   │   └── opencode-sdk-research.md    # Completed research findings
│   └── PRP.md                          # This file
└── tasks.json                          # Task definitions (READ-ONLY)

src/
├── providers/
│   ├── index.ts                        # Provider exports
│   ├── provider-registry.ts            # Provider registry (Phase 1 complete)
│   └── anthropic-provider.ts           # AnthropicProvider (Phase 2 complete)
└── types/
    └── providers.ts                    # Provider type definitions (Phase 1 complete)
```

### Desired Codebase Tree (After This Task)

```bash
# No code changes - this is a documentation-only task
# The only change is to external_dependencies.md

plan/003_dd63ad365ffb/
├── docs/
│   └── architecture/
│       ├── external_dependencies.md    # UPDATED: OpenCode SDK section now contains verified package info
│       ├── system_context.md           # UNCHANGED
│       ├── implementation_patterns.md  # UNCHANGED
│       └── decisions.md                # MAY BE UPDATED: Decision on implementation strategy
└── P3M1T1S1/
    ├── research/
    │   └── opencode-sdk-research.md    # COMPLETE: Contains all research findings
    └── PRP.md                          # This file
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: This is a RESEARCH task - DO NOT write code
// The next task (P3.M1.T1.S2) will document the OpenCode SDK API
// The implementation task (P3.M2.T1) will create OpenCodeProvider

// GOTCHA: The "OpenCode SDK" section in external_dependencies.md currently says "Status: UNVERIFIED"
// This task changes that status to "VERIFIED" with full package details

// GOTCHA: Anthropic SDK uses different patterns than OpenCode SDK will
// Anthropic: Lazy loading via import(), stateless, sessions via continue: true
// OpenCode: Native sessions, 75+ providers, extended thinking built-in

// GOTCHA: The package name is @opencode-ai/sdk (NOT opencode-agent-sdk or @opencodehq/agent-sdk)
// This was verified through npm registry research

// GOTCHA: @opencode-ai/sdk has ZERO dependencies (unlike @anthropic-ai/claude-agent-sdk which has zod peer dependency)
// This makes it a lightweight addition to the project

// GOTCHA: Version 1.1.36 has 3,021 published versions - this is a very actively maintained package
// Last published 7 hours ago (via GitHub Actions) - active development

// CRITICAL: Do NOT modify tasks.json, PRD.md, or any code files
// Only modify external_dependencies.md with the research findings
```

## Implementation Blueprint

### Research Summary

The npm registry research has been **completed** with the following findings:

**Verified Package**: `@opencode-ai/sdk`

| Property | Value |
|----------|-------|
| **Exact Package Name** | `@opencode-ai/sdk` |
| **Latest Version** | `1.1.36` |
| **License** | MIT |
| **Maintainers** | adamelmore (adam@terminal.shop), thdxr (d@ironbay.co) |
| **Publication Date** | 7 hours ago (via GitHub Actions) |
| **Total Versions** | 3,021 versions published |
| **Unpacked Size** | 453.8 kB |
| **Dependencies** | None (zero dependencies) |

### Data Models and Structure

No data models to create - this is a documentation task.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  - LOCATE: The "OpenCode Agent SDK (To Be Researched)" section (currently says "Status: UNVERIFIED")
  - REPLACE: "Status: UNVERIFIED" with "Status: VERIFIED"
  - ADD: Package Information subsection with exact package name, version, license, maintainers
  - ADD: Official Resources subsection with npm URL, tarball URL
  - ADD: Related Ecosystem Packages subsection listing @opencode-ai/plugin, ai-sdk-provider-opencode-sdk, etc.
  - PRESERVE: Existing Anthropic SDK documentation as reference
  - PRESERVE: All other sections (MCP, Decorators, etc.)

Task 2: UPDATE plan/003_dd63ad365ffb/docs/architecture/decisions.md (optional)
  - ADD: Decision record for "OpenCode SDK Selection"
  - DOCUMENT: Rationale for using @opencode-ai/sdk
  - DOCUMENT: Alternative options considered (Vercel AI SDK, LangChain)
  - DOCUMENT: Implementation strategy (Strategy A: Package exists, proceed to P3.M2)
```

### Implementation Patterns & Key Details

```markdown
# Documentation Pattern to Follow (from external_dependencies.md)

## Package Name (e.g., "OpenCode Agent SDK")

### Package Information
- **Package Name:** `exact-package-name`
- **Current Version:** `x.y.z`
- **Type:** ESM module
- **Node Requirement:** >=18.0.0 (or as appropriate)
- **Peer Dependencies:** list if any

### Official Resources
- **Documentation:** https://url-to-docs
- **GitHub:** https://github-url
- **NPM:** https://www.npmjs.com/package/package-name

### Related Ecosystem Packages
| Package | Version | Purpose |
|---------|---------|---------|
| package-name | version | description |
```

### Integration Points

```yaml
DOCUMENTATION:
  - update: plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  - pattern: Follow same format as "Anthropic Agent SDK" section
  - preserve: All existing sections (MCP, Decorators, Zod, etc.)

DECISIONS (optional):
  - add to: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  - pattern: Create new decision record for OpenCode SDK selection
```

## Validation Loop

### Level 1: Documentation Completeness (Immediate Feedback)

```bash
# Verify the documentation was updated correctly
grep -A 5 "OpenCode Agent SDK" plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md

# Expected: Should show "Status: VERIFIED" and package details
# Expected: Should contain package name @opencode-ai/sdk
# Expected: Should contain version 1.1.36
# Expected: Should contain installation command

# Verify the old "UNVERIFIED" status is gone
grep "UNVERIFIED" plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md

# Expected: No results (UNVERIFIED status replaced)

# Check that file is still valid markdown
npx markdown-toc plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md 2>&1 || echo "File structure OK"
```

### Level 2: Research Verification (Cross-Check)

```bash
# Verify package exists on npm (optional - already done in research)
npm view @opencode-ai/sdk name version license

# Expected output:
# @opencode-ai/sdk@1.1.36 | MIT | deps: none | versions: 3021

# Check that installation command works (dry-run)
npm install --dry-run @opencode-ai/sdk@1.1.36

# Expected: OK (or warns about existing installation)

# Verify research notes are complete
ls -la plan/003_dd63ad365ffb/P3M1T1S1/research/

# Expected: opencode-sdk-research.md exists and is non-empty
```

### Level 3: Integration Readiness (Future Task Preparation)

```bash
# Verify no code files were modified (this is a documentation-only task)
git diff src/ --name-only

# Expected: No output (no source files modified)

# Verify only external_dependencies.md was modified
git diff plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md | head -50

# Expected: Only OpenCode SDK section changes

# Verify tasks.json and PRD.md are unchanged
git diff plan/003_dd63ad365ffb/tasks.json
git diff PRD.md

# Expected: No output (these files are READ-ONLY)
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test that the documented package is importable (optional)
cd /tmp && mkdir test-opencode && cd test-opencode
npm init -y
npm install @opencode-ai/sdk@1.1.36
node -e "console.log(Object.keys(require('@opencode-ai/sdk')))"

# Expected: Shows exported functions/types from the SDK
# Note: This is optional validation - the research already verified the package

# Verify documentation consistency across architecture files
grep -r "opencode" plan/003_dd63ad365ffb/docs/architecture/ | grep -i "sdk\|package"

# Expected: Consistent references across external_dependencies.md, system_context.md, decisions.md

# Check for TODO/FIXME comments that need resolution
grep -r "TODO.*opencode\|FIXME.*opencode" plan/003_dd63ad365ffb/docs/

# Expected: No TODOs related to OpenCode SDK package name (research complete)
```

## Final Validation Checklist

### Technical Validation

- [ ] external_dependencies.md updated with verified package information
- [ ] Package name `@opencode-ai/sdk` documented
- [ ] Version `1.1.36` recorded
- [ ] Installation command `npm install @opencode-ai/sdk` provided
- [ ] NPM URL https://www.npmjs.com/package/@opencode-ai/sdk documented
- [ ] Related ecosystem packages listed
- [ ] Status changed from "UNVERIFIED" to "VERIFIED"
- [ ] No code files modified (documentation-only task)
- [ ] tasks.json and PRD.md unchanged (READ-ONLY files respected)

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Package verification completed via npm registry
- [ ] Ecosystem packages catalogued (@opencode-ai/plugin, ai-sdk-provider-opencode-sdk, etc.)
- [ ] Alternative SDK options documented (Vercel AI SDK, LangChain)
- [ ] Implementation strategy recommendation provided (Strategy A)
- [ ] Research notes stored in P3M1T1S1/research/opencode-sdk-research.md

### Documentation Quality Validation

- [ ] Follows same format as Anthropic SDK section
- [ ] All required subsections present (Package Information, Official Resources, Related Packages)
- [ ] URLs are accurate and accessible
- [ ] Installation commands are tested and correct
- [ ] Maintainer information documented
- [ ] License information recorded (MIT)

### Project Integration Validation

- [ ] Unblocks P3.M1.T1.S2 (Document OpenCode SDK API)
- [ ] Enables P3.M2 (OpenCode Provider Implementation)
- [ ] Consistent with existing Phase 1 (Provider Type System) patterns
- [ ] Aligns with Phase 2 (AnthropicProvider) implementation approach
- [ ] Supports Phase 3 goal of multi-provider system

## Anti-Patterns to Avoid

- ❌ **Don't modify code files** - This is a research/documentation task only
- ❌ **Don't modify tasks.json or PRD.md** - These are READ-ONLY files
- ❌ **Don't implement OpenCodeProvider** - That's task P3.M2.T1 (future task)
- ❌ **Don't skip verification** - Package name must be verified, not guessed
- ❌ **Don't ignore alternatives** - Document fallback options (Vercel AI SDK, LangChain)
- ❌ **Don't use wrong package name** - It's `@opencode-ai/sdk`, not `opencode-agent-sdk`
- ❌ **Don't forget ecosystem packages** - Related packages provide important context
- ❌ **Don't leave status as UNVERIFIED** - Update to VERIFIED with evidence
- ❌ **Don't document without URLs** - Always include source URLs for traceability
- ❌ **Don't ignore version numbers** - Record specific version (1.1.36)

---

## Confidence Score

**9/10** - One-pass implementation success likelihood

**Rationale**:
- Research has been completed with verified package information
- Exact package name, version, and installation commands are known
- Documentation target (external_dependencies.md) and format are clear
- No code implementation required (documentation-only task)
- Ecosystem context and alternative options have been researched
- Only minor risk: Markdown formatting consistency with existing documentation

**Validation**: The completed PRP enables clear documentation of OpenCode SDK findings with specific package information, installation commands, and ecosystem context. No prior knowledge of the codebase is required to complete this documentation task.

# PRP: Write migration guide with before/after examples

**PRP ID**: P1.M3.T1.S1
**Work Item**: Write migration guide with before/after examples
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Create comprehensive migration guide `docs/migration-guide-agent-response.md` that enables users to migrate from the old `Agent.prompt()` signature (returns `T`) to the new signature (returns `AgentResponse<T>`) with clear before/after code examples and migration patterns.

**Deliverable**: New migration guide document `docs/migration-guide-agent-response.md` with:
- Clear explanation of what changed and why (PRD requirement)
- Before/after code examples using actual conversions from example files
- Common patterns documented (status checking, error handling, data extraction)
- Migration checklist for users
- Visual indicators for severity and effort

**Success Definition**:
- Migration guide created at `docs/migration-guide-agent-response.md`
- Guide follows existing documentation conventions from `CHANGELOG.md`
- Includes actual before/after examples from updated files (01-11)
- Documents all common patterns: status checking, error handling, data extraction
- Provides actionable migration checklist
- Matches codebase documentation style (markdown format, code examples, ToC)
- User can successfully migrate their code using only this guide

---

## Why

**Business Value and User Impact**:
- This is a **breaking API change** - users need a clear migration path to upgrade
- Reduces support burden by providing self-service migration documentation
- Minimizes user frustration during upgrade by showing exactly what changes are needed
- Maintains user trust by explaining the reasoning behind the change (PRD requirements for structured responses)

**Integration with Existing Features**:
- Builds upon completed work items:
  - **P1.M1.T1**: Agent.prompt() now returns `AgentResponse<T>`
  - **P1.M1.T2**: All example files (01-11) have been updated to handle AgentResponse
  - **P1.M2.T1**: Zod schema validation ensures runtime type safety
- Follows existing documentation patterns from `CHANGELOG.md` migration guide section

**Problems This Solves**:
- Users need to understand how to update their code when upgrading
- Existing code that calls `Agent.prompt()` will break due to return type change
- Users need to know new patterns for error handling, status checking, and data extraction

---

## What

**User-Visible Behavior**:
- Users will have a comprehensive migration guide that shows them exactly how to update their code
- Guide will be in markdown format in the `docs/` directory alongside other documentation
- Guide will reference actual code changes from example files

**Technical Requirements**:
- Must be valid markdown following existing codebase conventions
- Must include actual before/after code examples (not generic placeholders)
- Must document all common usage patterns
- Must provide clear migration steps
- Must reference the PRD requirement that drove this change

### Success Criteria

- [ ] Migration guide created at `docs/migration-guide-agent-response.md`
- [ ] Includes "What Changed" section with clear explanation
- [ ] Includes "Why This Change" section referencing PRD requirements
- [ ] Includes before/after code examples from actual updated files
- [ ] Documents status checking patterns with examples
- [ ] Documents error handling patterns with examples
- [ ] Documents data extraction patterns with examples
- [ ] Includes migration checklist
- [ ] Follows existing documentation style from `CHANGELOG.md`
- [ ] Links to related documentation (docs/agent.md, PRD)

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes specific file paths, actual code examples, documentation patterns, and PRD references. An implementer unfamiliar with the codebase can create the migration guide using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://v3-migration.vuejs.org/
  why: Gold standard for migration guide structure, before/after examples, and progressive disclosure
  critical: Use Quick Start + Deep Dive structure, visual indicators (🔴🟡🟢), effort estimates

- file: CHANGELOG.md
  why: Reference for existing migration guide format and before/after code presentation style
  pattern: Migration Guide sections with "What Changed", "Before (Buggy Pattern)", "After (Correct Pattern)", "Migration Steps"
  gotcha: Follow the exact same markdown formatting and code block style

- file: docs/agent.md
  why: Reference for documentation tone, structure, and Agent API documentation style
  pattern: Technical but accessible language, comprehensive examples, clear headers

- file: research/migration-guide-best-practices.md
  why: Comprehensive research on migration guide best practices from major libraries
  section: Complete template and structure recommendations
  critical: Use the progressive disclosure pattern: Overview → Quick Start → Deep Dive

- file: examples/examples/10-introspection.ts
  why: Source of actual before/after example for AgentResponse handling (lines 551-563)
  pattern: Shows the new pattern: status check, error handling, type narrowing for data extraction

- file: src/types/agent.ts
  why: Source of AgentResponse type definition for documentation
  pattern: AgentResponse interface, AgentErrorDetails interface, AgentResponseMetadata interface

- file: src/core/agent.ts
  why: Reference for Agent.prompt() implementation and return value changes
  section: executePrompt method (lines 425-526) shows how AgentResponse is created

- file: PRD.md
  why: Source of "Why" explanation - PRD section 6 defines AgentResponse requirements
  section: Section 6 "Agent Response Model" (lines 139-247)
  critical: Reference PRD 6.4 Response Requirements and 6.5 Example Responses
```

### Current Codebase Tree (root level)

```bash
/home/dustin/projects/groundswell
├── dist/                    # Built output
├── docs/                    # Documentation directory (TARGET LOCATION)
│   ├── agent.md            # Agent documentation
│   ├── prompt.md           # Prompt documentation
│   └── workflow.md         # Workflow documentation
├── examples/               # Example files (source of before/after)
│   └── examples/
│       ├── 01-basic-workflow.ts
│       ├── 02-decorator-options.ts
│       ├── ...
│       └── 10-introspection.ts  # Key example with AgentResponse
├── src/                    # Source code
│   ├── core/
│   │   └── agent.ts        # Agent.prompt() implementation
│   └── types/
│       └── agent.ts        # AgentResponse type definitions
├── CHANGELOG.md            # Reference for migration guide format
├── PRD.md                  # Reference for "why" explanation
└── README.md               # Main documentation
```

### Desired Codebase Tree (with new file)

```bash
/home/dustin/projects/groundswell
├── docs/                    # Documentation directory
│   ├── agent.md
│   ├── prompt.md
│   ├── workflow.md
│   └── migration-guide-agent-response.md  # NEW: Migration guide (TARGET OUTPUT)
```

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: Documentation Style Conventions
# - Follow CHANGELOG.md migration guide format exactly
# - Use triple-backtick with typescript for code blocks
# - Include file path references like [src/core/agent.ts:425-526](src/core/agent.ts#L425-L526)
# - Use "Before (Buggy Pattern)" / "After (Correct Pattern)" labels
# - Include "Migration Steps" numbered list

# CRITICAL: AgentResponse Type Safety
# - The AgentResponse type is a discriminated union on 'status'
# - Type narrowing works: when status === 'success', data is T (not null)
# - When status === 'error', error is AgentErrorDetails (not null)
# - Use null, not undefined (PRD 6.4.4 requirement)

# CRITICAL: Example 10 is the primary source
# - File: examples/examples/10-introspection.ts
# - Lines 551-563 show the canonical pattern
# - Include this exact example in the migration guide

# CRITICAL: This is a BREAKING CHANGE
# - Old signature: Promise<T>
# - New signature: Promise<AgentResponse<T>>
# - All existing prompt() calls will need updates
# - Severity: 🔴 Critical (breaking change)
# - Effort: ⏱️ ~15-30 minutes per file

# CRITICAL: PRD Reference
# - PRD Section 6 defines AgentResponse requirements
# - PRD 6.4: Response Requirements (Strict JSON, No Prose Wrapping, etc.)
# - PRD 6.5: Example Responses (success, error, partial)
# - Reference these to explain "why" the change was made
```

---

## Implementation Blueprint

### Data Models and Structure

The migration guide uses markdown with structured sections:

```markdown
# Title
## Table of Contents
## Quick Start
## What Changed
## Why This Change
## Breaking Changes
## Migration Patterns
## Before/After Examples
## Migration Checklist
## Related Documentation
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE docs/migration-guide-agent-response.md
  - IMPLEMENT: Complete migration guide with all sections
  - FOLLOW pattern: CHANGELOG.md migration guide format (exact same style)
  - NAMING: migration-guide-agent-response.md (kebab-case like other docs)
  - PLACEMENT: In docs/ directory alongside agent.md, prompt.md, workflow.md

Task 2: WRITE "What Changed" Section
  - IMPLEMENT: Clear explanation of signature change
  - CONTENT: Old Promise<T> vs new Promise<AgentResponse<T>>
  - INCLUDE: Code snippet showing the type change
  - PATTERN: Follow CHANGELOG.md "What Changed" format

Task 3: WRITE "Why This Change" Section
  - IMPLEMENT: Explanation referencing PRD requirements
  - REFERENCE: PRD Section 6 "Agent Response Model"
  - INCLUDE: Benefits (structured responses, error handling, metadata, type safety)
  - PATTERN: Business value first, then technical details

Task 4: WRITE "Breaking Changes" Section
  - IMPLEMENT: Severity indicator (🔴 Critical Breaking Change)
  - INCLUDE: Effort estimate (⏱️ ~15-30 minutes per file)
  - LIST: All affected code patterns
  - PATTERN: Use visual indicators from migration guide best practices

Task 5: WRITE "Migration Patterns" Section
  - IMPLEMENT: Three subsections: Status Checking, Error Handling, Data Extraction
  - INCLUDE: Code examples for each pattern
  - REFERENCE: src/types/agent.ts for type definitions
  - PATTERN: Show code, then explain

Task 6: WRITE "Before/After Examples" Section
  - IMPLEMENT: Actual example from examples/examples/10-introspection.ts (lines 551-563)
  - INCLUDE: "Before" showing old pattern (hypothetical or from git history)
  - INCLUDE: "After" showing new pattern from current code
  - PATTERN: Use "Before (Buggy Pattern)" / "After (Correct Pattern)" labels from CHANGELOG.md

Task 7: WRITE "Migration Checklist" Section
  - IMPLEMENT: Actionable numbered checklist
  - INCLUDE: Step-by-step instructions
  - ADD: Validation commands (npm run test, npm run build)
  - PATTERN: Follow CHANGELOG.md "Migration Steps" format

Task 8: WRITE "Related Documentation" Section
  - IMPLEMENT: Links to docs/agent.md, PRD.md section 6, CHANGELOG.md
  - INCLUDE: File path references with anchors
  - PATTERN: Use markdown links with descriptive text
```

### Implementation Patterns & Key Details

```markdown
# Migration Guide Structure Pattern

## Title and Header
# AgentResponse Migration Guide

**Severity**: 🔴 Critical Breaking Change
**Effort**: ⏱️ ~15-30 minutes per file
**Version**: [X.X.X]

## Table of Contents
- [Quick Start](#quick-start)
- [What Changed](#what-changed)
- [Why This Change](#why-this-change)
- [Breaking Changes](#breaking-changes)
- [Migration Patterns](#migration-patterns)
  - [Status Checking](#status-checking)
  - [Error Handling](#error-handling)
  - [Data Extraction](#data-extraction)
- [Before/After Examples](#beforeafter-examples)
- [Migration Checklist](#migration-checklist)
- [Related Documentation](#related-documentation)

## Quick Start Pattern
Summarize the change in 2-3 sentences, then show minimal example:

```typescript
// Before
const result = await agent.prompt(myPrompt);

// After
const response = await agent.prompt(myPrompt);
if (response.status === 'error') {
  throw new Error(response.error.message);
}
const result = response.data;
```

## What Changed Pattern
Describe the signature change with code comparison:
- Old: `Promise<T>`
- New: `Promise<AgentResponse<T>>`

## Why This Change Pattern
Reference PRD Section 6, list benefits:
1. Structured error responses
2. Consistent metadata (duration, requestId)
3. Type-safe discriminated union
4. PRD compliance for JSON responses

## Breaking Changes Pattern
Use severity indicators and list affected areas:
- 🔴 All direct `prompt()` calls
- 🟡 Type assertions (may need adjustment)
- 🟢 Metadata access (now via response.metadata)

## Migration Patterns Pattern
Three subsections with code examples:

### Status Checking
```typescript
if (response.status === 'success') {
  // Handle success
} else if (response.status === 'error') {
  // Handle error
}
```

### Error Handling
```typescript
if (response.status === 'error') {
  console.error(`[${response.error.code}] ${response.error.message}`);
  if (response.error.recoverable) {
    // Retry logic
  }
}
```

### Data Extraction
```typescript
if (response.status === 'success') {
  const data = response.data; // Type is T
}
```

## Before/After Examples Pattern
Use actual code from examples/examples/10-introspection.ts:

**Before (Old Pattern)**:
```typescript
const analysis = await agent.prompt(explorePrompt);
console.log('Position:', analysis.position);
```

**After (New Pattern)**:
```typescript
const response = await agent.prompt(explorePrompt);
if (response.status === 'error') {
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}
const analysis = response.data;
console.log('Position:', analysis.position);
```

## Migration Checklist Pattern
Numbered list with checkboxes:
- [ ] 1. Find all `agent.prompt()` calls
- [ ] 2. Update variable declarations to `AgentResponse<T>`
- [ ] 3. Add status checking logic
- [ ] 4. Add error handling
- [ ] 5. Update data access via `.data` property
- [ ] 6. Run tests: `npm test`
- [ ] 7. Run build: `npm run build`

## Related Documentation Pattern
Links with file references:
- [Agent API](docs/agent.md) - Full Agent documentation
- [PRD Section 6](PRD.md#6-agent-response-model) - Agent Response Model specification
- [CHANGELOG.md](CHANGELOG.md) - Version history
```

### Integration Points

```yaml
DOCUMENTATION:
  - add to: docs/migration-guide-agent-response.md
  - link_from: README.md (add to Documentation section)
  - link_from: CHANGELOG.md (reference in next release)

CODE REFERENCES:
  - AgentResponse types: src/types/agent.ts
  - Agent.prompt() implementation: src/core/agent.ts
  - Example usage: examples/examples/10-introspection.ts (lines 551-563)

PRD REFERENCES:
  - PRD Section 6: Agent Response Model
  - PRD 6.4: Response Requirements
  - PRD 6.5: Example Responses
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate markdown syntax
npx markdownlint docs/migration-guide-agent-response.md

# Check for broken links
npx markdown-link-check docs/migration-guide-agent-response.md

# Manual review: ensure all code blocks are properly formatted
grep -n '```' docs/migration-guide-agent-response.md

# Expected: All markdown is valid, no broken links, code blocks properly closed
```

### Level 2: Content Validation (Documentation Review)

```bash
# Verify guide exists and is readable
cat docs/migration-guide-agent-response.md

# Check all required sections exist
grep -E "^## (Quick Start|What Changed|Why This Change|Breaking Changes|Migration Patterns|Before/After Examples|Migration Checklist|Related Documentation)" docs/migration-guide-agent-response.md

# Verify code examples are present
grep -c '```typescript' docs/migration-guide-agent-response.md

# Expected: All sections present, at least 6 code blocks (one per pattern)
```

### Level 3: Link Validation (Reference Checking)

```bash
# Verify internal links work
grep -o '\[.*\](.*\.md)' docs/migration-guide-agent-response.md | while read link; do
  target=$(echo "$link" | sed 's/.*(\(.*\))/\1/');
  if [ ! -f "$target" ]; then
    echo "Broken link: $target";
  fi;
done

# Verify code file references exist
grep -o '\[src/.*\.ts#L[0-9-]*\]' docs/migration-guide-agent-response.md | sed 's/.*\[(src[^]]*)\].*/\1/' | while read ref; do
  file=$(echo "$ref" | cut -d'#' -f1);
  if [ ! -f "$file" ]; then
    echo "Missing file reference: $file";
  fi;
done

# Expected: All links resolve to existing files
```

### Level 4: User Testing (Usability Validation)

```bash
# Simulate user following the migration guide

# 1. Check that a user can find the guide
test -f docs/migration-guide-agent-response.md && echo "Guide exists" || echo "Guide missing"

# 2. Verify the guide references actual example code
grep "examples/examples/10-introspection.ts" docs/migration-guide-agent-response.md

# 3. Verify code examples are syntactically valid TypeScript
# Extract code blocks and validate with TypeScript compiler
# (This may require manual verification or a script)

# 4. Verify checklist is actionable
grep -E "^\- \[ \]" docs/migration-guide-agent-response.md | wc -l

# Expected:
# - Guide exists at documented path
# - References actual code files
# - Code examples are valid TypeScript
# - Checklist has 5-10 actionable items
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Markdown syntax is valid (markdownlint passes)
- [ ] No broken internal or external links
- [ ] All code blocks are properly formatted with typescript syntax highlighting
- [ ] Code examples are syntactically valid TypeScript

### Content Validation

- [ ] All required sections present (Quick Start, What Changed, Why, Patterns, Examples, Checklist)
- [ ] "What Changed" section clearly explains the signature change
- [ ] "Why This Change" section references PRD Section 6
- [ ] Breaking Changes section uses severity indicators (🔴🟡🟢)
- [ ] Migration Patterns section covers status, error, and data extraction
- [ ] Before/After examples use actual code from examples/10-introspection.ts
- [ ] Migration Checklist is actionable with 5-10 items

### Style Validation

- [ ] Follows CHANGELOG.md migration guide format
- [ ] Uses "Before (Buggy Pattern)" / "After (Correct Pattern)" labels
- [ ] Includes file path references like [src/core/agent.ts:425-526](src/core/agent.ts#L425-L526)
- [ ] Tone is technical but accessible
- [ ] Code examples include necessary imports and context

### Documentation & Deployment

- [ ] Guide is located at docs/migration-guide-agent-response.md
- [ ] Links to related documentation work (docs/agent.md, PRD.md, CHANGELOG.md)
- [ ] Can be read standalone without additional context
- [ ] Provides enough information for user to migrate successfully

---

## Anti-Patterns to Avoid

- ❌ Don't create generic placeholder examples - use actual code from the codebase
- ❌ Don't skip the "Why" section - users need to understand the reason for the change
- ❌ Don't use different formatting than CHANGELOG.md - consistency matters
- ❌ Don't forget severity indicators and effort estimates
- ❌ Don't write a checklist that can't be followed step-by-step
- ❌ Don't reference non-existent files or code - verify all references
- ❌ Don't use undefined instead of null - PRD 6.4.4 specifies null over undefined
- ❌ Don't skip the Table of Contents - navigation is critical for longer guides
- ❌ Don't assume prior knowledge - explain the discriminated union type narrowing
- ❌ Don't forget to reference the PRD - this change was driven by PRD requirements

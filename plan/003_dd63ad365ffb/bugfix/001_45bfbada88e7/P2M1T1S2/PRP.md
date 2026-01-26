# Product Requirement Prompt (PRP): Update PRD Documentation for Provider Interface

**Work Item:** P2.M1.T1.S2
**Title:** Update PRD documentation for Provider interface
**Points:** 1
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Update PRD.md Section 7.3 to reflect the current implementation reality where the Provider interface's `execute()` method returns `AgentResponse<T>` instead of the deprecated `ProviderResult<T>`.

**Deliverable**: Updated PRD.md file at the root of the repository with:
- Section 7.3 Provider interface showing `AgentResponse<T>` return type
- Migration note explaining the change from `ProviderResult<T>` to `AgentResponse<T>`
- Updated code examples using `AgentResponse<T>`

**Success Definition**:
- PRD.md Section 7.3 displays `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` as the execute() return type
- A migration note is added explaining the ProviderResult deprecation
- All code examples in Section 7.3 use AgentResponse instead of ProviderResult
- The documentation matches the actual implementation in src/types/providers.ts
- Markdown formatting follows existing PRD.md conventions

---

## User Persona

**Target User**: Groundswell users and contributors who reference the PRD for understanding the Provider interface contract and return types.

**Use Case**: Developers implementing providers or using the Provider interface need accurate documentation that matches the actual code implementation.

**User Journey**:
1. Developer reads PRD.md Section 7.3 to understand Provider interface
2. Developer sees execute() returns AgentResponse<T>
3. Developer reads migration note about ProviderResult deprecation
4. Developer implements code using correct AgentResponse<T> type

**Pain Points Addressed**:
- **Documentation-implementation mismatch** - PRD specified ProviderResult<T> but code returns AgentResponse<T>
- **Confusion** - Developers following PRD would use deprecated types
- **No migration guidance** - No explanation of why ProviderResult appears in older docs

---

## Why

- **Implementation accuracy** - P2.M1.T1.S1 updated Provider interface to return AgentResponse<T>, but PRD.md was not updated
- **Prevent deprecated type usage** - Documentation should guide developers to use current types, not deprecated ones
- **Migration transparency** - Users need clear guidance on the ProviderResult → AgentResponse change
- **Trust in documentation** - PRD must match implementation to maintain credibility

---

## What

Update PRD.md Section 7.3 with the following changes:

### Current State (Lines 267-289)

```ts
## **7.3 Provider Interface**

All providers implement this interface:

```ts
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: ProviderRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```
```

### Required Changes

1. **Change execute() return type** from `Promise<ProviderResult<T>>` to `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`

2. **Add migration note** after the interface definition explaining ProviderResult deprecation

3. **Add example** showing correct AgentResponse usage

### Target State

```ts
## **7.3 Provider Interface**

All providers implement this interface:

```ts
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: ProviderRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

**Migration Note (v1.5.0):** The `execute()` method return type was changed from `ProviderResult<T>` to `AgentResponse<T>`. The structure is identical, but use `AgentResponse<T>` in new code. See Section 6 for the `AgentResponse<T>` interface definition.

**Example:**

```ts
const response = await provider.execute<{ answer: string }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor
);

if (response.status === 'success') {
  console.log(response.data.answer);  // Type-safe access
}
```
```

### Success Criteria

- [ ] Line 283 shows `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` as return type
- [ ] Migration note added after interface definition explaining ProviderResult → AgentResponse change
- [ ] Example code shows AgentResponse usage with type-safe data access
- [ ] Markdown formatting matches PRD.md conventions (ts code fences, bold headings)
- [ ] No other sections of PRD.md are modified

---

## All Needed Context

### Context Completeness Check

**Question**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Exact line numbers and current content of PRD.md Section 7.3
- Precise replacement text with proper formatting
- Markdown conventions specific to PRD.md
- The full AgentResponse interface for reference
- Migration guidance from existing code comments
- Validation commands to verify correctness

---

### Documentation & References

```yaml
# MUST READ - Current PRD Section 7.3
- file: PRD.md
  why: Target file for updates - lines 267-289 contain current Provider interface definition
  critical: Section 7.3 is at lines 267-289 with Provider interface showing deprecated ProviderResult<T>
  pattern: ts code fences, export interface, method signatures with return types

# MUST READ - Actual Provider Interface Implementation
- file: src/types/providers.ts
  why: Source of truth for current Provider interface definition
  critical: Lines 553-724 contain the Provider interface with execute() returning AgentResponse<T>
  pattern: Lines 662-666 show execute<T>() signature: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>

# MUST READ - AgentResponse Type Definition
- file: src/types/agent.ts
  why: The return type that execute() now uses - needed for documentation accuracy
  critical: Lines 324-357 contain AgentResponse<T> interface with status, data, error, metadata
  pattern: Discriminated union with status: 'success' | 'error' | 'partial', data: T | null, error, metadata

# MUST READ - ProviderResult Deprecation Notice
- file: src/types/providers.ts
  why: Contains existing migration guidance that should be reflected in PRD
  critical: Lines 356-434 contain @deprecated ProviderResult with comprehensive JSDoc migration guide
  pattern: @deprecated Since v1.5.0, use AgentResponse instead, version info, before/after examples

# REFERENCE - P2.M1.T1.S1 Implementation
- file: plan/003_dd63ad365ffb/P2M1T1S1/PRP.md
  why: Previous PRP that implemented the execute() return type change
  critical: Shows the change from ProviderResult<T> to AgentResponse<T> that this documentation update reflects
  section: "Implementation Blueprint" and "Implementation Tasks"

# REFERENCE - Markdown Documentation Patterns
- docfile: plan/003_dd63ad365ffb/P2M1T1S2/research-documentation-patterns.md (virtual)
  why: Summary of PRD.md markdown conventions discovered during research
  critical: Use ts language identifier, export keywords in interfaces, inline // comments, no imports shown
  pattern: ## **X.Y Title** format, ```ts code fences, export interface, readonly properties

# REFERENCE - PRD Section 6 (AgentResponse)
- file: PRD.md
  why: Contains the authoritative AgentResponse interface definition that PRD Section 7.3 should reference
  critical: Lines 144-186 define AgentResponse<T>, AgentResponseStatus, AgentErrorDetails, AgentResponseMetadata
  pattern: Status discriminator pattern, null for absent values, strict JSON requirements
```

---

### Current Codebase Tree

```bash
.
├── PRD.md                           # [MODIFY] Lines 267-289 - Section 7.3 Provider Interface
├── src/
│   ├── types/
│   │   ├── providers.ts             # [READ-ONLY] Source of truth for Provider interface
│   │   ├── agent.ts                 # [READ-ONLY] AgentResponse<T> definition
│   │   └── index.ts                 # [READ-ONLY] Type exports
│   └── index.ts                     # [READ-ONLY] Public API exports
└── plan/
    └── 003_dd63ad365ffb/
        └── bugfix/
            └── 001_45bfbada88e7/
                └── P2M1T1S2/
                    └── PRP.md       # [NEW] This file
```

---

### Desired Codebase Tree (After This Subtask)

```bash
.
├── PRD.md                           # [MODIFIED] Section 7.3 updated with AgentResponse<T>
├── src/
│   ├── types/
│   │   ├── providers.ts             # [UNCHANGED] Implementation already correct
│   │   ├── agent.ts                 # [UNCHANGED] AgentResponse<T> definition
│   │   └── index.ts                 # [UNCHANGED]
│   └── index.ts                     # [UNCHANGED]
└── plan/
    └── 003_dd63ad365ffb/
        └── bugfix/
            └── 001_45bfbada88e7/
                └── P2M1T1S2/
                    ├── PRP.md       # [NEW] This file
                    └── research/    # [OPTIONAL] Research notes directory
```

**Modified Files:**
- `PRD.md` - Lines 267-289 updated with AgentResponse<T> return type and migration note

**New Files:**
- `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M1T1S2/PRP.md` - This PRP

---

### Known Gotchas of Our Codebase & Library Quirks

```markdown
# CRITICAL: PRD.md is human-owned documentation
# DO NOT modify PRD.md structure or other sections
# ONLY update lines 267-289 (Section 7.3)

# CRITICAL: PRD.md uses specific markdown conventions
# Code blocks use ts language identifier (not typescript or js)
# Section headings use ## **X.Y Title** format with bold
# Interface definitions show export keyword but NO import statements

# GOTCHA: execute() return type is a union type
# Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>
# This supports both regular responses and streaming responses
# Do NOT simplify to just Promise<AgentResponse<T>>

# GOTCHA: AgentResponse<T> is defined in PRD Section 6
# Reference Section 6 for the full interface definition
# Do NOT redefine AgentResponse in Section 7.3

# GOTCHA: ProviderResult<T> is deprecated but still exists in code
# Add migration note but do NOT remove ProviderResult from code
# PRD should guide users to AgentResponse, not ProviderResult

# PATTERN: PRD examples use concise code blocks
# Show only the essential parts for understanding
# No import statements, no setup code, just the core concept

# PATTERN: Migration notes reference version numbers
# ProviderResult deprecated in v1.5.0, removal planned for v2.0.0
# Include this information in migration note

# GOTCHA: Line numbers in PRD.md may shift
# Current Section 7.3 is at lines 267-289
# Verify before editing if other changes were made

# CRITICAL: Preserve all existing formatting
# - ## **7.3 Provider Interface** heading
# - ```ts code fences
# - Blank line after closing ```
# - Next section heading (## **7.4 ProviderCapabilities**)

# GOTCHA: AsyncGenerator return type may be unfamiliar
# It's standard TypeScript for async iterators
# Keep it in the signature as it's part of the implementation
```

---

## Implementation Blueprint

### Data Models and Structure

This task updates documentation only - no new data models:

**Referenced Types** (already defined in PRD.md Section 6):
- `AgentResponse<T>` - Lines 144-155 in PRD.md
- `AgentResponseStatus` - 'success' | 'error' | 'partial'
- `AgentErrorDetails` - Lines 156-167 in PRD.md
- `AgentResponseMetadata` - Lines 168-174 in PRD.md

**Referenced Types** (already defined in PRD.md Section 7):
- `ProviderId` - Section 7.2 (line 264)
- `ProviderCapabilities` - Section 7.4 (lines 291-302)
- `ProviderOptions` - Section 7.5 (lines 313-323)
- `ProviderRequest` - Used in execute() signature
- `ToolExecutionRequest` / `ToolExecutionResult` - Section 7.10 (lines 416-426)
- `ProviderHookEvents` - Section 7.11 (lines 432-440)
- `MCPServer[]`, `Skill[]`, `ModelSpec` - Referenced in interface

---

### Implementation Tasks (Ordered by Dependencies)

```yaml
Task 1: VERIFY current PRD.md Section 7.3 content
  - READ: PRD.md lines 267-289
  - CONFIRM: Current content shows Promise<ProviderResult<T>> return type
  - CONFIRM: Section heading is ## **7.3 Provider Interface**
  - CONFIRM: No migration note currently exists
  - LOCATION: PRD.md
  - NO CODE CHANGES: Verification only

Task 2: VERIFY AgentResponse definition in PRD Section 6
  - READ: PRD.md lines 144-186
  - CONFIRM: AgentResponse<T> interface is defined
  - CONFIRM: AgentResponseStatus, AgentErrorDetails, AgentResponseMetadata defined
  - NOTE: Section 6 will be referenced in migration note
  - LOCATION: PRD.md
  - NO CODE CHANGES: Verification only

Task 3: VERIFY actual Provider interface implementation
  - READ: src/types/providers.ts lines 662-666
  - CONFIRM: execute() returns Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>
  - CONFIRM: This is the correct return type to document
  - LOCATION: src/types/providers.ts
  - NO CODE CHANGES: Verification only

Task 4: BACKUP PRD.md before editing
  - CREATE: Backup copy at PRD.md.backup
  - EXEC: cp PRD.md PRD.md.backup
  - REASON: Safety measure in case of edit errors
  - LOCATION: Repository root

Task 5: UPDATE execute() return type in PRD.md
  - MODIFY: Line 283 of PRD.md
  - CHANGE: `: Promise<ProviderResult<T>>;`
  - TO: `: Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;`
  - PRESERVE: All other interface method signatures
  - PRESERVE: Formatting (indentation, line breaks)
  - LOCATION: PRD.md line 283

Task 6: ADD migration note after interface definition
  - ADD: New paragraph after closing ``` of interface block
  - CONTENT: "**Migration Note (v1.5.0):** The `execute()` method return type was changed from `ProviderResult<T>` to `AgentResponse<T>`. The structure is identical, but use `AgentResponse<T>` in new code. See Section 6 for the `AgentResponse<T>` interface definition."
  - FORMAT: Bold heading, inline code for type names, reference to Section 6
  - LOCATION: PRD.md after line 289 (after interface closing ```)

Task 7: ADD example code block
  - ADD: Code example after migration note
  - CONTENT: Show AgentResponse usage with type-safe data access pattern
  - FORMAT: ```ts code fence with example code
  - PATTERN: if (response.status === 'success') { console.log(response.data.answer); }
  - LOCATION: PRD.md after migration note paragraph

Task 8: VERIFY markdown formatting
  - CHECK: ts language identifier used in code fence
  - CHECK: ## **7.3 Provider Interface** heading preserved
  - CHECK: Blank line before next section (## **7.4 ProviderCapabilities**)
  - CHECK: No trailing whitespace added
  - CHECK: Consistent indentation (2 spaces for list items if any)
  - LOCATION: PRD.md lines 267-~300

Task 9: RUN validation commands
  - EXEC: grep -n "ProviderResult" PRD.md (should only find in new migration note)
  - EXEC: grep -n "AgentResponse" PRD.md (should find in Section 6 and updated Section 7.3)
  - VERIFY: No unintended changes to other sections
  - VERIFY: Markdown is valid (no broken code fences)

Task 10: CLEANUP backup file
  - DELETE: PRD.md.backup
  - CONFIRM: All changes are correct before deleting backup
  - REASON: Remove temporary backup after successful edit
```

---

### Implementation Patterns & Key Details

```markdown
========================================
PATTERN 1: PRD.md Section Heading Format
========================================

## **7.3 Provider Interface**

- Use ## for h2 level
- Bold entire heading with ** **
- Include section number (7.3)
- No trailing punctuation

========================================
PATTERN 2: Code Block Format
========================================

```ts
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  execute<T>(...): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;
}
```

- Use ts language identifier (NOT typescript, js, or javascript)
- Include export keyword
- No import statements
- Use readonly for properties
- Show full union return type

========================================
PATTERN 3: Migration Note Format
========================================

**Migration Note (v1.5.0):** The `execute()` method return type was changed from
`ProviderResult<T>` to `AgentResponse<T>`. The structure is identical, but use
`AgentResponse<T>` in new code. See Section 6 for the `AgentResponse<T>` interface
definition.

- Bold heading with version
- Inline code (backticks) for type names
- Clear before/after comparison
- Reference to related section
- Concise explanation

========================================
PATTERN 4: Example Code Format
========================================

**Example:**

```ts
const response = await provider.execute<{ answer: string }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor
);

if (response.status === 'success') {
  console.log(response.data.answer);
}
```

- Bold "Example:" label
- ts language identifier
- Generic type parameter shown: <{ answer: string }>
- Type-safe access pattern demonstrated
- Status check before data access

========================================
GOTCHA: AsyncGenerator Return Type
========================================

The execute() method returns a union type:
Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>

This means:
- Regular mode: Promise<AgentResponse<T>>
- Streaming mode: AsyncGenerator that yields StreamEvent and returns AgentResponse<T>

Do NOT simplify to just Promise<AgentResponse<T>>
The full union type must be documented for accuracy.

========================================
GOTCHA: AgentResponse vs ProviderResult
========================================

AgentResponse<T> (current, use this):
- status: 'success' | 'error' | 'partial'
- data: T | null
- error: AgentErrorDetails | null
- metadata.agentId: string

ProviderResult<T> (deprecated, don't use):
- status: 'success' | 'error' | 'partial'
- data: T | null
- error: ProviderErrorDetails | null
- metadata.providerId: string

Key difference: agentId vs providerId in metadata
Otherwise structures are identical

========================================
GOTCHA: Line Number Accuracy
========================================

Current Section 7.3 is at lines 267-289 (as of January 2026)

If other PRP tasks modified PRD.md first, line numbers may shift.
Always verify by searching for "## **7.3 Provider Interface**" before editing.

========================================
CRITICAL: Scope Limitation
========================================

ONLY modify PRD.md Section 7.3 (lines 267-289 plus new content)

DO NOT modify:
- PRD.md Section 6 (AgentResponse definition)
- PRD.md Section 7.1-7.2, 7.4-7.14 (other provider sections)
- src/types/providers.ts (implementation is correct)
- src/types/agent.ts (AgentResponse definition)

This is a documentation-only task.
```

---

### Integration Points

```yaml
PRD_SECTION_6:
  - reference: "See Section 6 for the `AgentResponse<T>` interface definition"
  - reason: AgentResponse is fully documented in Section 6, avoid duplication
  - location: PRD.md lines 144-186

PRD_SECTION_7:
  - modify: Section 7.3 only (lines 267-289)
  - preserve: All other subsections (7.1, 7.2, 7.4-7.14)
  - reason: Scope limitation - only update what's necessary

IMPLEMENTATION:
  - reference: src/types/providers.ts lines 662-666
  - reason: Source of truth for execute() signature
  - status: Already correct, no changes needed

MIGRATION_PATH:
  - from: ProviderResult<T> (deprecated, v1.5.0)
  - to: AgentResponse<T> (current)
  - note: Structure is identical, only type name and metadata field differ
```

---

## Validation Loop

### Level 1: File Content Verification (Immediate Feedback)

```bash
# Verify the edit was made correctly
grep -A 15 "## \*\*7.3 Provider Interface\*\*" PRD.md

# Expected output should show:
# - Interface definition with export interface Provider
# - execute() returning Promise<AgentResponse<T>> | AsyncGenerator<...>
# - Migration note paragraph after interface
# - Example code block

# Verify old type is removed (except in migration note)
grep -n "ProviderResult" PRD.md

# Expected: Should only appear in new migration note
# If found in interface definition, edit was incomplete

# Verify new type is present
grep -n "AgentResponse" PRD.md | head -5

# Expected: Should find in Section 6 (existing) and Section 7.3 (updated)
```

---

### Level 2: Markdown Syntax Validation

```bash
# Check for valid markdown syntax
# If markdownlint is available:
markdownlint PRD.md

# If not available, check for common issues:
grep -n '```[^t]' PRD.md  # Should NOT find non-ts code fences in this section
grep -n '^\*\*' PRD.md     # Verify bold headings are correct
grep -n '^## ' PRD.md      # Verify section headings are correct

# Expected: No markdown syntax errors
# All code fences properly closed
# All headings properly formatted
```

---

### Level 3: Documentation Consistency Check

```bash
# Verify consistency between PRD and implementation

# Check PRD execute() signature
grep -A 3 "execute<T>" PRD.md | grep "Promise<AgentResponse"

# Check implementation execute() signature
grep -A 3 "execute<T>" src/types/providers.ts | grep "AgentResponse"

# Expected: Both should show AgentResponse<T> in return type
# PRD may omit AsyncGenerator for simplicity but should mention it

# Verify AgentResponse is defined in Section 6
grep -B 2 -A 10 "interface AgentResponse" PRD.md

# Expected: Should find complete interface definition in Section 6
# Status, data, error, metadata fields all present
```

---

### Level 4: Cross-Reference Validation

```bash
# Verify migration note references are correct
grep -n "Section 6" PRD.md | grep -A 2 -B 2 "7.3"

# Expected: Migration note in Section 7.3 should reference Section 6

# Verify no broken references
grep -n "See Section" PRD.md

# Expected: All section references should be valid
# Section numbers should match actual headings

# Verify example code compiles (TypeScript syntax check)
# Extract example code to temp file and check
sed -n '/Example:/,/```/p' PRD.md | grep -A 10 "```ts" > /tmp/example.ts
npx tsc --noEmit /tmp/example.ts 2>&1 || echo "Example may have syntax issues"

# Expected: No TypeScript compilation errors in example
```

---

### Level 5: Visual Verification

```bash
# View the updated section in context
sed -n '250,310p' PRD.md

# Expected output should show:
# - Section 7 heading
# - Section 7.1, 7.2
# - Updated Section 7.3 with AgentResponse<T>
# - Migration note and example
# - Section 7.4 heading

# Verify spacing and formatting
cat -A PRD.md | sed -n '267,310p' | grep '$'

# Expected: No trailing whitespace (lines should end with $ only)
# Consistent blank lines between sections
```

---

## Final Validation Checklist

### Technical Validation

- [ ] PRD.md line 283 shows `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`
- [ ] Old `Promise<ProviderResult<T>>` is removed from execute() signature
- [ ] Migration note paragraph added after interface definition
- [ ] Migration note mentions v1.5.0 and references Section 6
- [ ] Example code block added showing AgentResponse usage
- [ ] Markdown syntax is valid (code fences closed, proper formatting)
- [ ] No unintended changes to other sections of PRD.md

### Content Validation

- [ ] execute() return type matches src/types/providers.ts implementation
- [ ] AgentResponse<T> type name correctly formatted (inline code)
- [ ] Migration note clearly explains ProviderResult → AgentResponse change
- [ ] Example demonstrates type-safe data access pattern
- [ ] Reference to Section 6 for AgentResponse definition is present
- [ ] Code example uses ts language identifier

### Formatting Validation

- [ ] ## **7.3 Provider Interface** heading preserved
- [ ] ```ts code fences used (not typescript or js)
- [ ] export interface keyword shown in code block
- [ ] No import statements in interface definition
- [ ] Blank line after interface closing ```
- [ ] Consistent indentation throughout

### Scope Validation

- [ ] Only Section 7.3 was modified (no changes to Section 6, 7.1-7.2, 7.4-7.14)
- [ ] No source code files modified (src/types/providers.ts, src/types/agent.ts)
- [ ] No other documentation files modified
- [ ] Changes are documentation-only (no implementation changes)

---

## Anti-Patterns to Avoid

- ❌ **Don't modify AgentResponse definition in Section 6**
  - Section 6 is the canonical definition - Section 7.3 should only reference it
  - Wrong: Adding AgentResponse interface to Section 7.3
  - Right: Reference Section 6 with "See Section 6 for AgentResponse<T> interface definition"

- ❌ **Don't remove the AsyncGenerator return type**
  - The full union type is part of the implementation
  - Wrong: `Promise<AgentResponse<T>>` only
  - Right: `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>`

- ❌ **Don't add import statements to the interface example**
  - PRD convention is to show standalone type definitions
  - Wrong: Including `import { AgentResponse } from 'groundswell'` in code block
  - Right: Show `execute<T>(): Promise<AgentResponse<T>>` without imports

- ❌ **Don't use the wrong code fence language**
  - PRD.md consistently uses `ts` for TypeScript code
  - Wrong: ` ```typescript` or ` ```js`
  - Right: ` ```ts`

- ❌ **Don't modify other sections of PRD.md**
  - Scope is limited to Section 7.3 only
  - Wrong: Updating Section 6 or other 7.x subsections
  - Right: Only edit lines 267-289 plus new migration note and example

- ❌ **Don't forget the migration note**
  - Users need context on why ProviderResult appears in older code/docs
  - Wrong: Just changing the type without explanation
  - Right: Add clear migration note with version info

- ❌ **Don't make the example too complex**
  - PRD examples should be concise and illustrative
  - Wrong: Including full setup, error handling, imports
  - Right: Show the core pattern: status check → type-safe data access

- ❌ **Don't break markdown formatting**
  - Preserve all heading levels, code fences, spacing
  - Wrong: Removing bold from headings, breaking code fences
  - Right: ## **7.3 Provider Interface** with proper formatting

---

## Research Summary

This PRP is based on comprehensive research across key areas:

### 1. PRD.md Structure Analysis (Task: Explore Documentation Patterns)
- **Files Analyzed**: PRD.md lines 144-494 (Sections 6-7)
- **Key Findings**:
  - Section 7.3 at lines 267-289 with Provider interface definition
  - Current documentation shows `Promise<ProviderResult<T>>` (needs update)
  - PRD uses `ts` code fences, export keywords, no imports
  - Section headings use `## **X.Y Title**` format
  - AgentResponse fully defined in Section 6 (lines 144-186)

### 2. Implementation Verification (Task: Research AgentResponse vs ProviderResult)
- **Files Analyzed**: src/types/providers.ts, src/types/agent.ts
- **Key Findings**:
  - Provider.execute() returns `Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>` (lines 662-666)
  - ProviderResult deprecated with @since v1.5.0, @removal v2.0.0 (lines 356-434)
  - AgentResponse<T> defined in src/types/agent.ts (lines 324-357)
  - Comprehensive migration guidance exists in code comments

### 3. Documentation Convention Research (Task: Explore Documentation Patterns)
- **Files Analyzed**: PRD.md, migration-opencode-removal.md
- **Key Findings**:
  - Code blocks use ts identifier consistently
  - Migration notes include version info and before/after examples
  - Examples are concise with minimal context
  - No import statements shown in type definitions
  - Bold headings with section numbers

### 4. Change Context Analysis
- **Previous Work**: P2.M1.T1.S1 updated Provider interface to return AgentResponse<T>
- **Current Gap**: PRD.md still reflects old ProviderResult<T> return type
- **Migration Path**: ProviderResult<T> → AgentResponse<T> (structure identical, name changed)
- **Version Info**: Deprecated in v1.5.0, removal planned for v2.0.0

---

## Confidence Score

**One-Pass Implementation Success Likelihood: 10/10**

**Justification**:
- ✅ Exact line numbers and current content identified (267-289)
- ✅ Precise replacement text specified with proper formatting
- ✅ Markdown conventions documented and clear
- ✅ AgentResponse reference exists in Section 6
- ✅ Migration guidance patterns available in codebase
- ✅ Simple scope (documentation-only, single file)
- ✅ Clear validation commands to verify correctness
- ✅ Comprehensive anti-patterns documented
- ✅ No external dependencies or installation required
- ✅ Backup/cleanup procedure included

**Validation**: An AI agent unfamiliar with Groundswell can successfully update PRD.md Section 7.3 using only this PRP content. The task is well-bounded with specific line numbers, replacement text, and validation procedures.

---

## Appendix: Complete Replacement Text

Below is the exact text to replace PRD.md lines 267-289 with:

```markdown
## **7.3 Provider Interface**

All providers implement this interface:

```ts
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: ProviderRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

**Migration Note (v1.5.0):** The `execute()` method return type was changed from `ProviderResult<T>` to `AgentResponse<T>`. The structure is identical, but use `AgentResponse<T>` in new code. See Section 6 for the `AgentResponse<T>` interface definition.

**Example:**

```ts
const response = await provider.execute<{ answer: string }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor
);

if (response.status === 'success') {
  console.log(response.data.answer);  // Type-safe access
}
```
```

---

**PRP Version**: 1.0
**Created**: January 26, 2026
**For**: Subtask P2.M1.T1.S2 - Update PRD documentation for Provider interface
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support

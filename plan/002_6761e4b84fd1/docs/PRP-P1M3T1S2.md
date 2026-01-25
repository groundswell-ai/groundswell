# PRP: Update README.md with AgentResponse usage

**PRP ID**: P1.M3.T1.S2
**Work Item**: Update README.md with AgentResponse usage
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Update the project root `README.md` Quick Start section and Documentation links to reflect the new `AgentResponse<T>` API, adding AgentResponse usage examples and a link to the migration guide created in P1.M3.T1.S1.

**Deliverable**: Updated `README.md` with:
- Agent with Prompt section updated to show `AgentResponse<T>` pattern (status checking, error handling, data extraction)
- Migration guide link prominently displayed
- Optional: Benefits section explaining why AgentResponse exists
- Documentation section updated to include migration guide link

**Success Definition**:
- README.md Agent with Prompt example shows current `AgentResponse<T>` API (not old `T` return)
- Code example includes status checking and error handling
- Migration guide link is visible and prominent (using GitHub alert or warning symbol)
- Documentation section includes link to migration guide
- Code example is under 15 lines (best practice from research)
- All imports shown are necessary for the example

---

## Why

**Business Value and User Impact**:
- **First impression matters**: README is the first thing new users see; it must show current API
- **Upgrading users need guidance**: Clear link to migration guide prevents confusion
- **Reduced support burden**: Accurate examples reduce "why doesn't this work?" questions
- **Trust maintenance**: Outdated documentation damages user trust

**Integration with Existing Features**:
- Builds upon completed work items:
  - **P1.M1.T1**: `Agent.prompt()` now returns `AgentResponse<T>`
  - **P1.M1.T2**: All example files (01-11) updated to handle AgentResponse
  - **P1.M2.T1**: Zod schema validation ensures runtime type safety
  - **P1.M3.T1.S1**: Migration guide created at `docs/migration-guide-agent-response.md` (CONTRACT OUTPUT)
- Follows existing README structure and formatting conventions

**Problems This Solves**:
- Current README shows OLD API (`const result = await agent.prompt(prompt)` returns `T` directly)
- No link to migration guide for users upgrading from v1.x
- No error handling pattern shown in Quick Start
- No explanation of why AgentResponse exists

---

## What

**User-Visible Behavior**:
- Users reading README will see current `AgentResponse<T>` API usage
- Users upgrading will see prominent link to migration guide
- New users will see proper error handling pattern from the start

**Technical Requirements**:
- Update `### Agent with Prompt` section (lines 62-84 of current README)
- Add migration guide alert/warning
- Update `## Documentation` section (lines 86-90)
- Ensure code example is syntactically valid TypeScript
- Follow existing README formatting conventions

### Success Criteria

- [ ] Agent with Prompt section shows `AgentResponse<T>` pattern
- [ ] Code example includes `if (response.status === 'error')` check
- [ ] Migration guide link is prominent (GitHub alert or ⚠️ warning)
- [ ] Documentation section includes migration guide link
- [ ] Code example is under 15 lines
- [ ] All imports shown are necessary
- [ ] Follows existing README formatting and style

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact file locations, current content, desired content patterns, and references to research files. An implementer unfamiliar with the codebase can update the README using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: README.md
  why: Target file to update - contains current (outdated) Agent with Prompt section
  pattern: Quick Start section structure, code fence format, Documentation section format
  section: Lines 62-90 (Agent with Prompt and Documentation sections)
  critical: Current README shows OLD API - must be updated to AgentResponse pattern

- file: docs/migration-guide-agent-response.md
  why: CONTRACT OUTPUT from P1.M3.T1.S1 - must be linked from README
  pattern: Migration guide format, before/after examples, severity indicators
  critical: This file will exist when implementation begins (P1.M3.T1.S1 running in parallel)

- file: docs/agent.md
  why: Reference for tone and style of Agent documentation
  pattern: Technical but accessible language, code examples with imports
  section: Lines 18-39 (Basic Usage section) - similar content to README Quick Start

- file: examples/examples/10-introspection.ts
  why: Source of actual AgentResponse usage pattern (canonical example)
  pattern: Status checking, error handling, data extraction (lines 554-562)
  critical: Use this exact pattern in README code example

- file: src/types/agent.ts
  why: Source of AgentResponse type definition
  pattern: AgentResponse interface, discriminated union structure
  section: Complete type definitions for understanding type safety benefits

- research/agent-response-patterns.md
  why: Consolidated research on all AgentResponse usage patterns
  section: "Core Usage Patterns" - Pattern 1 is recommended for README
  critical: Contains before/after examples and migration recommendations

- research/readme-best-practices.md
  why: Industry best practices for README Quick Start sections
  section: "AgentResponse-Specific Recommendations" and "Migration Link Placement"
  critical: Contains recommended code example and alert box patterns

- research/existing-doc-patterns.md
  why: Existing Groundswell documentation conventions
  section: "Patterns to Follow for README Update" - alert formats, link formats
  critical: Must follow project-specific conventions (tone, formatting, visual indicators)
```

### Current Codebase Tree (README location)

```bash
/home/dustin/projects/groundswell
├── README.md                    # TARGET FILE - Root level documentation
├── docs/                        # Documentation directory
│   ├── agent.md                 # Agent documentation (reference for tone/style)
│   ├── migration-guide-agent-response.md  # CONTRACT OUTPUT from P1.M3.T1.S1
│   ├── prompt.md
│   └── workflow.md
├── examples/
│   └── examples/
│       └── 10-introspection.ts  # Source of AgentResponse usage pattern
└── src/
    └── types/
        └── agent.ts             # AgentResponse type definitions
```

### Current README.md Structure (relevant sections)

```markdown
# Groundswell

## Installation
...

## Quick Start

### Class-Based Workflow
...

### Functional Workflow
...

### Agent with Prompt                 # LINES 62-84 - TARGET FOR UPDATE
                                    # CURRENT CONTENT (OUTDATED):
                                    # Shows: const result = await agent.prompt(prompt);
                                    # Missing: status checking, error handling
                                    # Missing: migration guide link

## Documentation                       # LINES 86-90 - TARGET FOR UPDATE
                                    # CURRENT CONTENT:
                                    # - Workflows
                                    # - Agents
                                    # - Prompts
                                    # MISSING: Migration Guide link
```

### Desired README.md Structure (after update)

```markdown
# Groundswell

## Installation
...

## Quick Start

### Class-Based Workflow
...

### Functional Workflow
...

### Agent with Prompt                 # UPDATED WITH:
                                    # - GitHub alert or warning for breaking change
                                    # - AgentResponse<T> pattern
                                    # - Status checking and error handling
                                    # - Link to migration guide
                                    # - Code example under 15 lines

## Documentation                       # UPDATED WITH:
                                    # - Migration Guide link (prominently displayed)
```

### Known Gotchas of Our Codebase & README Conventions

```markdown
# CRITICAL: README.md Location
# - Located at project ROOT (not in docs/ directory)
# - This is per SYSTEM_CONTEXT.md specification
# - Path: /home/dustin/projects/groundswell/README.md

# CRITICAL: Existing README Shows OLD API
# - Current content (lines 82-83): const result = await agent.prompt(prompt);
# - Comment says: result is typed as { bugs: string[], severity: ... }
# - This is OUTDATED - must be updated to AgentResponse pattern

# CRITICAL: Migration Guide is CONTRACT OUTPUT
# - File: docs/migration-guide-agent-response.md
# - Created by P1.M3.T1.S1 (running in parallel)
# - Assume it exists and use exact filename in link
# - Use descriptive link text: "Migration Guide"

# CRITICAL: Visual Indicators
# - Use ⚠️ for breaking change warnings
# - Use 🔴 for critical breaking changes (from migration guide)
# - GitHub alert format: > [!IMPORTANT] or > [!WARNING]
# - Follow existing CHANGELOG.md conventions

# CRITICAL: Code Example Length
# - Best practice: under 15 lines for Quick Start
# - Research shows Anthropic SDK: 13 lines, Zod: 7 lines
# - Groundswell current example: ~23 lines (too long!)
# - Must condense while maintaining clarity

# CRITICAL: Imports in Code Examples
# - Show only imports needed for that example
# - Current README shows: createAgent, createPrompt, z
# - New example may need: isSuccess or type guards (optional)

# CRITICAL: Documentation Link Format
# - Pattern: [Title](path) - Description
# - Example: - [Migration Guide](docs/migration-guide-agent-response.md) - Upgrading from v1.x ⚠️
# - Add to existing Documentation section (lines 86-90)

# CRITICAL: PRD Reference for "Why"
# - PRD Section 6 defines AgentResponse requirements
# - Use for benefits section (if added)
# - Benefits: type-safe responses, error handling, metadata, consistency
```

---

## Implementation Blueprint

### Data Models and Structure

This task modifies existing markdown content. No new data models.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ current README.md to understand exact content
  - READ: /home/dustin/projects/groundswell/README.md
  - FOCUS: Lines 62-90 (Agent with Prompt section and Documentation section)
  - NOTE: Current code example structure, imports, formatting

Task 2: VERIFY migration guide exists (CONTRACT from P1.M3.T1.S1)
  - CHECK: docs/migration-guide-agent-response.md exists
  - USE: Exact filename in README link
  - IF NOT EXISTS: Halt and explain P1.M3.T1.S1 must complete first

Task 3: UPDATE "### Agent with Prompt" section header (lines 62)
  - ADD: GitHub alert or warning after header
  - FORMAT: > [!IMPORTANT] or ⚠️ **Breaking Change**
  - CONTENT: Link to migration guide, explain API change
  - REFERENCE: research/readme-best-practices.md "Migration Link Placement"

Task 4: UPDATE code example in Agent with Prompt section (lines 64-82)
  - REPLACE: Current outdated example with AgentResponse pattern
  - ADD: Status checking: if (response.status === 'error')
  - ADD: Error handling: throw new Error(response.error.message)
  - ADD: Data extraction: const result = response.data
  - FOLLOW: Pattern from examples/10-introspection.ts (lines 554-562)
  - CONSTRAINT: Keep under 15 lines total (condense from current 23 lines)
  - PRESERVE: All imports shown (createAgent, createPrompt, z)
  - REFERENCE: research/agent-response-patterns.md "Pattern 1: Basic Status Checking"

Task 5: UPDATE comment after code example (line 83)
  - REPLACE: Old comment "result is typed as { bugs: string[], ... }"
  - ADD: Comment explaining type narrowing benefits
  - ADD: Comment about metadata access (optional)

Task 6: ADD "Why AgentResponse?" section (OPTIONAL, if space permits)
  - IMPLEMENT: 4-5 bullet points explaining benefits
  - CONTENT: Type-safe responses, error handling, metadata, consistency
  - REFERENCE: PRD Section 6 for benefits
  - IF INCLUDED: Keep brief, link to migration guide for details

Task 7: UPDATE "## Documentation" section (lines 86-90)
  - ADD: Migration Guide link as first item (most prominent)
  - FORMAT: - [Migration Guide](docs/migration-guide-agent-response.md) - Upgrading from v1.x ⚠️
  - PRESERVE: Existing documentation links (Workflows, Agents, Prompts)
  - REFERENCE: research/existing-doc-patterns.md "Documentation Link Pattern"

Task 8: VALIDATE markdown syntax and links
  - CHECK: All markdown properly formatted
  - CHECK: No broken links
  - CHECK: Code blocks properly closed
  - CHECK: GitHub alert syntax correct
```

### Implementation Patterns & Key Details

```markdown
# Recommended README Update Pattern

## BEFORE (Current README Lines 62-84):

### Agent with Prompt

```typescript
import { createAgent, createPrompt } from 'groundswell';
import { z } from 'zod';

const agent = createAgent({
  name: 'AnalysisAgent',
  enableCache: true,
});

const prompt = createPrompt({
  user: 'Analyze this code for bugs',
  data: { code: 'function foo() { return 42; }' },
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});

const result = await agent.prompt(prompt);
// result is typed as { bugs: string[], severity: 'low' | 'medium' | 'high' }
```

## AFTER (Recommended Update):

### Agent with Prompt

> [!IMPORTANT]
> Groundswell v2.0: `agent.prompt()` now returns `AgentResponse<T>`.
> See the [Migration Guide](docs/migration-guide-agent-response.md) if upgrading.

```typescript
import { createAgent, createPrompt } from 'groundswell';
import { z } from 'zod';

const agent = createAgent({ name: 'AnalysisAgent' });

const prompt = createPrompt({
  user: 'Analyze this code',
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});

const response = await agent.prompt(prompt);
if (response.status === 'error') {
  throw new Error(response.error.message);
}
console.log(response.data.bugs);
```

**Why AgentResponse?**
- ✅ Type-safe validated responses with error handling
- ✅ Observable metadata (tokens, timing, cache hits)
- ✅ Consistent API across all agent operations

---

# Alternative Alert Pattern (Option B):

### Agent with Prompt

⚠️ **Breaking Change**: `agent.prompt()` now returns `AgentResponse<T>`.
See [Migration Guide](docs/migration-guide-agent-response.md) for upgrade instructions.

```typescript
[Same code example as above]
```
```

### Integration Points

```yaml
README_CHANGES:
  - file: README.md
  - section: "### Agent with Prompt" (lines 62-84)
  - changes:
    - Add migration alert/warning after header
    - Update code example to AgentResponse pattern
    - Add status checking and error handling
    - Update comment to reflect new types
  - section: "## Documentation" (lines 86-90)
  - changes:
    - Add migration guide link as first item

MIGRATION_GUIDE_LINK:
  - url: docs/migration-guide-agent-response.md
  - contract_from: P1.M3.T1.S1 (parallel execution)
  - link_text: "Migration Guide"
  - description: "Upgrading from v1.x"

CODE_PATTERN_SOURCE:
  - file: examples/examples/10-introspection.ts
  - lines: 554-562
  - pattern: Status checking → error handling → data extraction
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Validate markdown syntax
npx markdownlint README.md

# Check for broken internal links
npx markdown-link-check README.md --config .markdown-link-check.json 2>/dev/null || echo "Link check config not found, manual check"

# Manual check: verify GitHub alert syntax
grep -A2 "^\> \[!" README.md

# Manual check: verify code blocks are properly closed
grep -n '```' README.md | wc -l  # Should be even number (pairs)

# Expected: Zero markdown syntax errors, all code blocks closed
```

### Level 2: Content Validation (Accuracy Check)

```bash
# Verify migration guide link exists
test -f docs/migration-guide-agent-response.md && echo "Migration guide exists" || echo "ERROR: Migration guide not found"

# Check that AgentResponse pattern is shown
grep -q "AgentResponse" README.md && echo "AgentResponse mentioned" || echo "ERROR: AgentResponse not mentioned"

# Check that status checking is shown
grep -q "response.status === 'error'" README.md && echo "Status checking shown" || echo "WARNING: Status checking may be missing"

# Check that migration guide is linked
grep -q "migration-guide-agent-response.md" README.md && echo "Migration guide linked" || echo "ERROR: Migration guide link missing"

# Expected: All checks pass, migration guide exists and is linked
```

### Level 3: Code Example Validation (TypeScript Check)

```bash
# Extract the Agent code block from README and validate syntax
# This is a manual check - copy the code block and run through TypeScript

# Alternative: Use a simple syntax check
cat > /tmp/readme-example.ts << 'EOF'
[PASTE CODE FROM README]
EOF

# Run TypeScript compiler on the extracted example
npx tsc --noEmit /tmp/readme-example.ts 2>&1 || echo "TypeScript error detected"

# Expected: Code example is syntactically valid TypeScript
```

### Level 4: User Testing (Usability Validation)

```bash
# Test that a user can find the migration guide

# 1. Check migration guide link is visible in first 100 lines
head -100 README.md | grep -q "migration-guide" && echo "Migration link visible early" || echo "WARNING: Migration link may be too far down"

# 2. Check alert box is prominent
head -100 README.md | grep -q "\[!IMPORTANT\]\|\[!WARNING\]" && echo "Alert visible early" || echo "WARNING: Alert may be missing or not prominent"

# 3. Verify code example length (should be under 15 lines)
sed -n '/### Agent with Prompt/,/^### /p' README.md | grep -c '^[^#]'  # Approximate line count
# Expected: Code block + surrounding content under 15 lines

# 4. Check that imports are accurate
grep -A20 "### Agent with Prompt" README.md | grep -q "import { createAgent, createPrompt }" && echo "Imports shown" || echo "ERROR: Imports missing"

# Expected:
# - Migration guide link visible in first 100 lines
# - Alert box prominent
# - Code example under 15 lines
# - All necessary imports shown
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] Markdown syntax is valid (markdownlint passes or manual review)
- [ ] No broken internal links (migration guide link works)
- [ ] Code blocks are properly formatted with typescript syntax highlighting
- [ ] Code example is syntactically valid TypeScript
- [ ] GitHub alert syntax is correct (`> [!IMPORTANT]` or `> [!WARNING]`)

### Content Validation

- [ ] Agent with Prompt section shows `AgentResponse<T>` pattern (not old `T` return)
- [ ] Code example includes `if (response.status === 'error')` check
- [ ] Code example includes error handling (`throw new Error(response.error.message)`)
- [ ] Code example includes data extraction (`const result = response.data`)
- [ ] Migration guide link is prominent (alert box or ⚠️ warning)
- [ ] Documentation section includes migration guide link
- [ ] Code example is under 15 lines (condensed from current 23 lines)
- [ ] All necessary imports are shown (`createAgent`, `createPrompt`, `z`)

### Style Validation

- [ ] Follows existing README formatting conventions
- [ ] Tone matches existing documentation (technical but accessible)
- [ ] Code fence format matches existing (````typescript` with language tag)
- [ ] Visual indicators used (⚠️, ✅) match project conventions
- [ ] Link format matches existing (`[Title](path)` pattern)

### Documentation & Deployment

- [ ] Migration guide link uses exact filename from P1.M3.T1.S1 contract
- [ ] Link is descriptive ("Migration Guide" not just "click here")
- [ ] README is standalone readable (no undefined references)
- [ ] Users can find migration guide easily from Quick Start section

---

## Anti-Patterns to Avoid

- ❌ Don't show the OLD API (`const result = await agent.prompt(prompt)` without AgentResponse)
- ❌ Don't skip status checking in the example (users need to see this pattern)
- ❌ Don't make the code example longer than 15 lines (best practice from research)
- ❌ Don't hide the migration guide link at the bottom (put it prominently after Quick Start or inline alert)
- ❌ Don't use a different filename for the migration guide (contract is `migration-guide-agent-response.md`)
- ❌ Don't add placeholder comments like `// your code here`
- ❌ Don't forget to update the comment after the code example (currently says old type inference)
- ❌ Don't break the existing Documentation section format when adding the migration guide link
- ❌ Don't use `undefined` instead of `null` in examples (PRD 6.4.4 specifies null over undefined)
- ❌ Don't remove the benefits of AgentResponse from the user's view (explain why this change exists)

---

## Appendix: Example Files Reference

### Canonical AgentResponse Pattern (examples/10-introspection.ts:554-562)

```typescript
const response = await agent.prompt(prompt);
if (response.status === 'error') {
  console.error(`[${response.error.code}] ${response.error.message}`);
  throw new Error(response.error.message);
}
const analysis = response.data;
// Now safely use analysis with full type safety
```

### Migration Guide Contract Output (P1.M3.T1.S1)

**File**: `docs/migration-guide-agent-response.md`
**Content**: Complete migration guide with:
- What Changed section
- Why This Change section (referencing PRD Section 6)
- Breaking Changes with severity indicators
- Migration Patterns (status checking, error handling, data extraction)
- Before/After Examples
- Migration Checklist
- Related Documentation links

**Action**: Link to this file prominently in README

---

## References

### Research Files (plan/002_6761e4b84fd1/P1M3T1S2/research/)

- `agent-response-patterns.md` - All AgentResponse usage patterns from codebase
- `readme-best-practices.md` - Industry best practices for README Quick Start sections
- `agent-response-types.md` - Complete AgentResponse type definitions
- `existing-doc-patterns.md` - Groundswell documentation conventions

### External References

- Vue.js Migration Guide: https://v3-migration.vuejs.org/ (Gold standard for migration docs)
- Anthropic TypeScript SDK README: https://github.com/anthropics/anthropic-sdk-typescript
- Zod README: https://github.com/colinhacks/zod
- Markdown Alert Syntax: https://github.com/orgs/community/discussions/16925

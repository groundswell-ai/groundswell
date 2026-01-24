# Product Requirement Prompt (PRP): Analyze Agent.prompt() Implementation

**PRP ID**: P1.M1.T1.S1
**Work Item**: Read and analyze current Agent.prompt() implementation
**Created**: 2026-01-24
**Status**: Research & Analysis

---

## Goal

**Feature Goal**: Conduct comprehensive research and analysis of the current `Agent.prompt()` implementation to enable successful refactoring to return `AgentResponse<T>` instead of generic `T`.

**Deliverable**: Detailed research documentation containing:
1. Current `Agent.prompt()` implementation analysis with exact signatures
2. Complete inventory of all call sites affected by the change
3. Existing `AgentResponse<T>` type definitions (if any)
4. Patterns and conventions used throughout the codebase
5. External research on similar refactoring patterns

**Success Definition**: The executing AI agent has complete understanding of:
- Exact current implementation of `Agent.prompt()` method
- All files that will need modification when refactoring
- Existing type patterns to follow
- Best practices for response wrapper implementations

---

## Why

This is a **research-only subtask** that provides foundational knowledge for the subsequent implementation tasks. The analysis output from this task will be used by:

1. **P1.M1.T1.S2** - Creating AgentResponse factory helper functions
2. **P1.M1.T1.S3** - Refactoring Agent.prompt() to wrap responses
3. **P1.M1.T2** - Updating all call sites to handle AgentResponse
4. **P1.M2.T1** - Creating Zod schema validation for AgentResponse

Without this comprehensive analysis, the implementation tasks would lack critical context about existing patterns, call site usage, and architectural conventions.

---

## What

### Scope

This PRP covers **research and analysis only** - no code modifications are made.

**In Scope:**
- Reading and analyzing `src/core/agent.ts`
- Reading and analyzing `src/types/agent.ts`
- Identifying all `agent.prompt()` call sites in the codebase
- Understanding existing wrapper patterns (PromptResult, WorkflowResult)
- Documenting current implementation patterns
- External research on response wrapper patterns

**Out of Scope:**
- Any code modifications
- Creating new type definitions
- Implementing factory functions
- Updating call sites

### Success Criteria

- [ ] Current `Agent.prompt()` implementation fully documented
- [ ] All call sites identified and categorized
- [ ] Existing wrapper patterns analyzed and documented
- [ ] External research on best practices completed
- [ ] Research findings stored in `plan/002_6761e4b84fd1/P1M1T1S1/research/`

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to understand the current `Agent.prompt()` implementation and successfully plan the refactoring?

**Answer**: YES - This PRP provides comprehensive context including:
- Exact source code with line numbers
- Complete call site inventory
- Existing patterns to follow
- External best practices research

### Documentation & References

```yaml
# CRITICAL - Read these files first to understand the codebase

- file: src/core/agent.ts
  why: Contains the Agent class with prompt() method implementation (lines 110-116)
  critical:
    - prompt() method returns Promise<T> directly (line 110-116)
    - executePrompt() returns PromptResult<T> internally (lines 182-427)
    - PromptResult interface defined at lines 31-40 with data, usage, duration, toolCalls
    - Anthropic SDK integration at lines 432-468
    - JSON parsing at lines 378-384 with error handling
    - Zod validation at line 387 using prompt.validateResponse()
  gotcha: The public prompt() method extracts only the 'data' field from PromptResult, discarding metadata

- file: src/types/agent.ts
  why: Contains AgentConfig and PromptOverrides type definitions
  pattern: All properties map 1:1 to Anthropic SDK (see line 3 comment)
  gotcha: AgentResponse interface is NOT defined here - it needs to be added

- file: src/types/index.ts
  why: Central type export file - shows current export patterns
  pattern: Types organized by category (Core, SDK primitives, Agent, Prompt, etc.)
  critical: Agent types exported at lines 26-27 (AgentConfig, PromptOverrides only)
  gotcha: AgentResponse is NOT exported - this will need to be added

- file: src/core/workflow-context.ts
  why: Contains WorkflowResult<T> pattern - similar wrapper to follow
  pattern: Lines 40-47 show WorkflowResult with data, node, duration fields
  critical: This is an existing wrapper pattern in the codebase to emulate

- file: src/reflection/reflection.ts
  why: Shows actual usage of agent.prompt() in production code (line 267)
  pattern: const response = await this.agent.prompt(reflectionPrompt);
  gotcha: Reflection code will need updating when prompt() return type changes

# DOCUMENTATION - Reference documentation for patterns

- url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  why: TypeScript type narrowing with discriminant unions
  critical: AgentResponse uses 'status' field as discriminant for type narrowing

- url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#discriminated-unions
  why: Official TypeScript docs on discriminated unions
  critical: Understanding how status field enables type narrowing

- url: https://zod.dev/
  why: Zod validation library - already used in Groundswell v3.23.0
  critical: AgentResponse will need Zod schema validation

- url: https://docs.anthropic.com/en/api/messages
  why: Anthropic Messages API reference
  critical: Understanding how Anthropic SDK responses are structured

# RESEARCH FILES - Generated research documentation

- docfile: plan/002_6761e4b84fd1/P1M1T1S1/research/agent-prompt-implementation-analysis.md
  why: Detailed analysis of current Agent.prompt() implementation
  section: Complete method signature, return type, internal flow

- docfile: plan/002_6761e4b84fd1/P1M1T1S1/research/agent-prompt-call-sites-inventory.md
  why: Complete inventory of all agent.prompt() call sites
  section: All files affected by the refactoring

- docfile: plan/002_6761e4b84fd1/P1M1T1S1/research/response-wrapper-patterns-research.md
  why: External research on TypeScript response wrapper patterns
  section: Best practices, discriminated unions, Result type pattern

- docfile: plan/002_6761e4b84fd1/P1M1T1S1/research/zod-validation-patterns-research.md
  why: JSON response validation patterns with Zod
  section: Zod schemas for discriminated unions, error handling
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── core/
│   │   ├── agent.ts              # [KEY] Agent class with prompt() method
│   │   ├── prompt.ts             # Prompt class
│   │   ├── workflow-context.ts   # [REFERENCE] WorkflowResult<T> pattern
│   │   └── ...
│   ├── types/
│   │   ├── agent.ts              # [KEY] AgentConfig, PromptOverrides
│   │   ├── index.ts              # [KEY] Type exports
│   │   └── ...
│   ├── reflection/
│   │   └── reflection.ts         # [CALL SITE] Uses agent.prompt()
│   └── __tests__/
│       ├── integration/
│       │   └── agent-workflow.test.ts  # [CALL SITE]
│       └── ...
├── examples/
│   └── examples/
│       ├── 01-basic-workflow.ts  # [CALL SITE - Documentation]
│       ├── 02-decorator-options.ts
│       ├── ...                  # [10 more example files]
│       └── 11-reparenting-workflows.ts
├── docs/
│   ├── agent.md                 # [CALL SITE - Documentation examples]
│   └── prompt.md                # [CALL SITE - Documentation examples]
└── plan/
    └── 002_6761e4b84fd1/
        └── P1M1T1S1/
            └── PRP.md           # This file
```

### Known Gotchas of Our Codebase

```typescript
// CRITICAL: Agent.prompt() currently returns T directly, not a wrapper
// File: src/core/agent.ts, lines 110-116
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  const result = await this.executePrompt(prompt, overrides);
  return result.data;  // Extracts only 'data', discards metadata
}

// GOTCHA: executePrompt() returns PromptResult<T> with metadata
// File: src/core/agent.ts, lines 31-40
export interface PromptResult<T> {
  data: T;           // Validated response data
  usage: TokenUsage; // Token usage from API
  duration: number;  // Total duration in milliseconds
  toolCalls: number; // Number of tool invocations
}

// GOTCHA: promptWithMetadata() already exists but returns PromptResult<T>
// File: src/core/agent.ts, lines 124-129
public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  return this.executePrompt(prompt, overrides);
}

// CRITICAL: Existing wrapper pattern to follow
// File: src/core/workflow-context.ts, lines 40-47
export interface WorkflowResult<T> {
  data: T;
  node: WorkflowNode;
  duration: number;
}

// CRITICAL: Zod validation already in use
// File: src/core/agent.ts, line 387
const validated = prompt.validateResponse(parsed);
// This uses Prompt's internal Zod schema to validate responses

// GOTCHA: JSON parsing with regex - may fail on complex responses
// File: src/core/agent.ts, lines 378-384
const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error('No JSON object found in response');
}
const parsed = JSON.parse(jsonMatch[0]);

// CRITICAL: Anthropic SDK integration pattern
// File: src/core/agent.ts, lines 432-468
// Uses client.messages.create() with direct parameter mapping
// Tools are converted to Anthropic's schema format (lines 453-457)

// CRITICAL: Event emission for workflow integration
// File: src/core/agent.ts, lines 172-177, 245-253, 322-330, 400-409
// Agent emits events when in workflow context (agentPromptStart, agentPromptEnd, toolInvocation)

// CRITICAL: Error handling approach
// File: src/core/agent.ts, lines 374-376, 380-382, 384
// Throws errors on:
// - No text response received
// - No JSON object found
// - JSON parsing failure
// These will need to be converted to AgentResponse with error status
```

---

## Implementation Blueprint

### Data Models and Structure

This is a **research-only** task - no new data models are created.

**Existing Models to Analyze:**

```typescript
// PromptResult<T> - Current internal result type
// File: src/core/agent.ts, lines 31-40
export interface PromptResult<T> {
  data: T;
  usage: TokenUsage;
  duration: number;
  toolCalls: number;
}

// WorkflowResult<T> - Existing wrapper pattern to follow
// File: src/core/workflow-context.ts
export interface WorkflowResult<T> {
  data: T;
  node: WorkflowNode;
  duration: number;
}

// AgentResponse<T> - Planned type (from PRD, NOT yet implemented)
// Will be defined in src/types/agent.ts in future tasks
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}

export interface AgentErrorDetails {
  code: string;                    // e.g., "INVALID_RESPONSE_FORMAT"
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export interface AgentResponseMetadata {
  agentId: string;
  timestamp: number;
  duration?: number;
  requestId?: string;
}
```

### Implementation Tasks (Research Only)

```yaml
Task 1: READ and analyze src/core/agent.ts
  - FOCUS: Lines 110-116 (prompt method signature)
  - FOCUS: Lines 182-427 (executePrompt implementation)
  - FOCUS: Lines 31-40 (PromptResult interface)
  - DOCUMENT: Exact method signatures with generic types
  - DOCUMENT: Return type pattern (T vs PromptResult<T>)
  - DOCUMENT: Internal flow from prompt() to executePrompt()
  - OUTPUT: research/agent-prompt-implementation-analysis.md

Task 2: READ and analyze src/types/agent.ts
  - DOCUMENT: AgentConfig interface structure
  - DOCUMENT: PromptOverrides interface structure
  - DOCUMENT: Current type exports
  - IDENTIFY: Gaps - AgentResponse is NOT defined
  - OUTPUT: Add to agent-prompt-implementation-analysis.md

Task 3: IDENTIFY all agent.prompt() call sites
  - SEARCH: Use grep/git grep for "\.prompt\(" pattern
  - CATEGORIZE: By file type (examples, tests, source, docs)
  - DOCUMENT: File path, line number, usage pattern
  - DOCUMENT: Type parameters used at each call site
  - DOCUMENT: Error handling patterns (if any)
  - OUTPUT: research/agent-prompt-call-sites-inventory.md

Task 4: ANALYZE existing wrapper patterns
  - READ: src/core/workflow-context.ts (WorkflowResult<T> pattern)
  - IDENTIFY: Common patterns in wrapper interfaces
  - DOCUMENT: Naming conventions
  - DOCUMENT: Null vs undefined usage
  - DOCUMENT: Metadata patterns
  - OUTPUT: Add to agent-prompt-implementation-analysis.md

Task 5: EXTERNAL research on response wrapper patterns
  - RESEARCH: TypeScript discriminated unions best practices
  - RESEARCH: Result<T, E> pattern from functional programming
  - RESEARCH: neverthrow library patterns
  - RESEARCH: Zod discriminated union validation
  - DOCUMENT: Code examples with URLs to documentation
  - DOCUMENT: Common pitfalls to avoid
  - OUTPUT: research/response-wrapper-patterns-research.md

Task 6: EXTERNAL research on JSON validation patterns
  - RESEARCH: Zod runtime validation for API responses
  - RESEARCH: Anthropic API response format
  - RESEARCH: Machine-readable error code conventions
  - RESEARCH: INVALID_RESPONSE_FORMAT error handling
  - DOCUMENT: Specific URLs to documentation
  - DOCUMENT: Error code naming conventions
  - OUTPUT: research/zod-validation-patterns-research.md

Task 7: COMPILE comprehensive analysis report
  - SYNTHESIZE: All research findings
  - ORGANIZE: By topic (Implementation, Call Sites, Patterns, Best Practices)
  - HIGHLIGHT: Critical gotchas and constraints
  - INCLUDE: Specific file references with line numbers
  - OUTPUT: research/ANALYSIS_SUMMARY.md
```

### Implementation Patterns & Key Details

```typescript
// ========================
// CURRENT IMPLEMENTATION
// ========================

// Pattern 1: Basic prompt() - returns T directly
// File: src/core/agent.ts:110-116
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  const result = await this.executePrompt(prompt, overrides);
  return result.data;  // <-- Extracts only data, loses metadata
}

// Pattern 2: promptWithMetadata() - returns PromptResult<T>
// File: src/core/agent.ts:124-129
public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>> {
  return this.executePrompt(prompt, overrides);
}

// Pattern 3: reflect() - also returns T directly
// File: src/core/agent.ts:137-160
public async reflect<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T> {
  // Adds reflection system prefix
  // Returns T directly via executePrompt().data
}

// ========================
// INTERNAL EXECUTION FLOW
// ========================

// executePrompt() returns PromptResult<T> with:
// - data: T (validated response)
// - usage: TokenUsage
// - duration: number
// - toolCalls: number

// Key steps in executePrompt():
// 1. Configuration merge (Prompt > Overrides > Config)
// 2. Cache check (if enabled)
// 3. Event emission (agentPromptStart)
// 4. API call via callApi()
// 5. Tool use loop (if tools invoked)
// 6. JSON extraction with regex (/\{[\s\S]*\}/)
// 7. Zod validation via prompt.validateResponse()
// 8. Hook execution (sessionEnd)
// 9. Event emission (agentPromptEnd)
// 10. Cache storage (if enabled)

// ========================
// ERROR HANDLING CURRENT
// ========================

// Current approach: Throw errors
// - "No text response received from API" (line 375)
// - "No JSON object found in response" (line 381)
// - JSON.parse() throws SyntaxError (line 384)

// Future approach (PRD requirement):
// - Return AgentResponse<T> with status: 'error'
// - Include AgentErrorDetails with code, message, recoverable flag

// ========================
// CALL SITE PATTERNS
// ========================

// Pattern A: Direct assignment (most common)
const result = await agent.prompt(prompt);
console.log(result.fieldName);  // result is type T

// Pattern B: With overrides
const result = await agent.prompt(prompt, {
  model: 'claude-3-haiku-20240307',
  maxTokens: 1000,
});

// Pattern C: Destructured metadata (using promptWithMetadata)
const { data, usage, duration } = await agent.promptWithMetadata(prompt);

// Pattern D: Dynamic data injection
const result = await agent.prompt(classifyPrompt.withData({ item }));

// Pattern E: In workflow context
await ctx.step('analysis', async () => {
  const result = await agent.prompt(prompt);
  // Context automatically captured
});

// ========================
// EXISTING WRAPPER PATTERN
// ========================

// WorkflowResult<T> - Good example to follow
// File: src/core/workflow-context.ts
export interface WorkflowResult<T> {
  data: T;           // The actual result data
  node: WorkflowNode; // Workflow tree node
  duration: number;   // Execution time
}

// Pattern: Non-nullable data field
// Pattern: Includes metadata (node, duration)
// Pattern: Generic type parameter <T>
```

### Integration Points

```yaml
# Files that will be affected by the refactoring (future tasks)

SOURCE CODE:
  - file: src/core/agent.ts
    impact: prompt() method signature change (Promise<T> -> Promise<AgentResponse<T>>)
    lines: 110-116, 137-160 (reflect method)

  - file: src/types/agent.ts
    impact: Need to add AgentResponse, AgentErrorDetails, AgentResponseMetadata
    add: New type definitions

  - file: src/types/index.ts
    impact: Need to export new AgentResponse types
    add: Export statements

  - file: src/reflection/reflection.ts
    impact: Call site at line 267
    change: Handle AgentResponse return type

DOCUMENTATION:
  - file: docs/agent.md
    impact: Multiple examples using agent.prompt()
    lines: 37, 83, 95, 165, 326

  - file: docs/prompt.md
    impact: Multiple examples using agent.prompt()
    lines: 131, 350, 374

EXAMPLES:
  - file: examples/examples/10-introspection.ts
    impact: Real usage example at line 515
    change: Update to handle AgentResponse

TESTS:
  - file: src/__tests__/integration/agent-workflow.test.ts
    impact: Test expectations for prompt() return type
    change: Update assertions to check AgentResponse structure
```

---

## Validation Loop

### Level 1: Research Completeness (Immediate)

```bash
# Verify all critical files have been read
ls -la plan/002_6761e4b84fd1/P1M1T1S1/research/

# Expected output files:
# - agent-prompt-implementation-analysis.md
# - agent-prompt-call-sites-inventory.md
# - response-wrapper-patterns-research.md
# - zod-validation-patterns-research.md
# - ANALYSIS_SUMMARY.md

# Check that all files contain:
grep -r "agent.prompt()" plan/002_6761e4b84fd1/P1M1T1S1/research/
grep -r "AgentResponse" plan/002_6761e4b84fd1/P1M1T1S1/research/
grep -r "src/core/agent.ts" plan/002_6761e4b84fd1/P1M1T1S1/research/

# Expected: Non-empty results with specific file references
```

### Level 2: Cross-Reference Validation

```bash
# Verify call sites inventory is complete
# Compare against codebase search results
grep -r "\.prompt(" src/ --include="*.ts" | wc -l
# Should match the count in research/agent-prompt-call-sites-inventory.md

# Verify all example files (01-11) are documented
ls examples/examples/
# Should see all files referenced in call sites inventory

# Verify type exports are documented
grep "AgentResponse" src/types/index.ts
# Should be empty (not yet implemented) - this confirms gap analysis
```

### Level 3: Context Quality Validation

```bash
# Check that research includes:
# 1. Exact line numbers for all references
grep -E "lines? [0-9]+" plan/002_6761e4b84fd1/P1M1T1S1/research/*.md

# 2. URLs to external documentation
grep -E "https?://" plan/002_6761e4b84fd1/P1M1T1S1/research/*.md

# 3. Code snippets with type annotations
grep -E "Promise<" plan/002_6761e4b84fd1/P1M1T1S1/research/*.md
grep -E "interface.*<" plan/002_6761e4b84fd1/P1M1T1S1/research/*.md

# 4. Gotchas and critical details
grep -i "gotcha\|critical\|important" plan/002_6761e4b84fd1/P1M1T1S1/research/*.md

# Expected: All patterns present with specific, actionable content
```

### Level 4: Knowledge Transfer Validation

```bash
# Test: Can someone implement the refactoring using only this research?

# Check that PRP answers these questions:
# 1. What is the exact current signature of Agent.prompt()?
grep -A 5 "async prompt" plan/002_6761e4b84fd1/P1M1T1S1/research/agent-prompt-implementation-analysis.md

# 2. Which files need to be modified?
grep -E "src/.*\.ts" plan/002_6761e4b84fd1/P1M1T1S1/research/agent-prompt-call-sites-inventory.md | wc -l

# 3. What patterns should be followed?
grep -E "pattern|convention" plan/002_6761e4b84fd1/P1M1T1S1/research/response-wrapper-patterns-research.md

# 4. What are the common pitfalls?
grep -i "pitfall\|avoid" plan/002_6761e4b84fd1/P1M1T1S1/research/*.md

# Expected: Comprehensive answers to all questions
```

---

## Final Validation Checklist

### Research Completeness

- [ ] All critical source files analyzed (agent.ts, types/agent.ts, workflow-context.ts)
- [ ] All call sites identified and categorized (examples, tests, source, docs)
- [ ] Existing wrapper patterns documented (PromptResult, WorkflowResult)
- [ ] External research completed with specific URLs
- [ ] All research findings stored in designated directory

### Documentation Quality

- [ ] Exact line numbers provided for all code references
- [ ] Type signatures included with full generic annotations
- [ ] Code snippets show current vs. target patterns
- [ ] Gotchas section highlights critical constraints
- [ ] URLs point to specific documentation sections

### Actionability

- [ ] File tree shows what will be affected
- [ ] Integration points list specific files and line numbers
- [ ] Call site inventory includes usage patterns
- [ ] External research includes code examples
- [ ] Next tasks have clear dependencies on research output

### Knowledge Transfer

- [ ] "No Prior Knowledge" test passes
- [ ] Implementation agent can proceed using only this PRP
- [ ] All critical implementation details captured
- [ ] Common pitfalls documented with avoidance strategies

---

## Anti-Patterns to Avoid

- ❌ Don't modify any code - this is research only
- ❌ Don't create new type definitions - that's for future tasks
- ❌ Don't skip documenting call sites - implementation depends on this
- ❌ Don't ignore existing patterns (PromptResult, WorkflowResult)
- ❌ Don't forget line numbers - implementers need exact references
- ❌ Don't provide generic URLs - link to specific documentation sections
- ❌ Don't omit error handling analysis - this is critical for the refactoring

---

## Research Output Files Structure

```
plan/002_6761e4b84fd1/P1M1T1S1/research/
├── agent-prompt-implementation-analysis.md
│   ├── Current Agent.prompt() signature
│   ├── Internal executePrompt() flow
│   ├── PromptResult interface analysis
│   ├── Error handling patterns
│   └── Anthropic SDK integration
│
├── agent-prompt-call-sites-inventory.md
│   ├── Source code call sites
│   ├── Example files (01-11)
│   ├── Documentation examples
│   ├── Test files
│   └── Usage patterns categorized
│
├── response-wrapper-patterns-research.md
│   ├── TypeScript discriminated unions
│   ├── Result<T, E> functional pattern
│   ├── neverthrow library patterns
│   ├── Best practices from industry
│   └── Common pitfalls to avoid
│
├── zod-validation-patterns-research.md
│   ├── Zod discriminated union schemas
│   ├── Anthropic API response validation
│   ├── Error code naming conventions
│   ├── INVALID_RESPONSE_FORMAT handling
│   └── Code examples with URLs
│
└── ANALYSIS_SUMMARY.md
    ├── Key findings summary
    ├── Critical gotchas
    ├── Files affected by refactoring
    └── Recommended implementation approach
```

---

## Appendix: Quick Reference

### Key File Locations

| File | Lines | Description |
|------|-------|-------------|
| `src/core/agent.ts` | 110-116 | `prompt()` method signature |
| `src/core/agent.ts` | 124-129 | `promptWithMetadata()` method |
| `src/core/agent.ts` | 137-160 | `reflect()` method |
| `src/core/agent.ts` | 31-40 | `PromptResult<T>` interface |
| `src/core/agent.ts` | 182-427 | `executePrompt()` implementation |
| `src/types/agent.ts` | All | Agent type definitions |
| `src/types/index.ts` | 26-27 | Agent type exports |
| `src/core/workflow-context.ts` | 40-47 | `WorkflowResult<T>` pattern |
| `src/reflection/reflection.ts` | 267 | Call site example |

### Current Type Flow

```
Agent.prompt<T>()
  └─> Promise<T>  (current)
       └─> executePrompt() returns PromptResult<T>
            └─> Extracts .data field
                 └─> Returns T directly

Agent.promptWithMetadata<T>()
  └─> Promise<PromptResult<T>>  (current)
       └─> executePrompt() returns PromptResult<T>
            └─> Returns full PromptResult<T>
```

### Target Type Flow (Future)

```
Agent.prompt<T>()
  └─> Promise<AgentResponse<T>>  (target)
       └─> executePrompt() returns PromptResult<T>
            └─> Wraps in AgentResponse with status/error/metadata
                 └─> Returns AgentResponse<T>
```

---

**Confidence Score**: 10/10

This PRP provides comprehensive research context for one-pass analysis of the current `Agent.prompt()` implementation. All critical files, call sites, patterns, and external best practices are documented with specific references and line numbers.

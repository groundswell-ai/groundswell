# Product Requirement Prompt (PRP): Audit and Improve Other Unclear JSDoc Comments

---

## Goal

**Feature Goal**: Audit and improve JSDoc comments across critical public API files (Workflow class, Agent class, Provider implementations, decorators) to make default values, required/optional status, and side effects explicit and clear.

**Deliverable**: A set of JSDoc comment updates across multiple files that improve documentation clarity for developers using the library.

**Success Definition**:
- [ ] All identified JSDoc issues from the audit are addressed
- [ ] High-priority issues (public API defaults) are resolved
- [ ] Medium-priority issues (side effects) are documented
- [ ] All updates follow codebase JSDoc patterns
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] All tests pass: `npm test`

---

## User Persona

**Target User**: Implementation agent working on P3.M1.T2.S2 (JSDoc clarity improvement across codebase).

**Use Case**: Improving developer experience by making JSDoc documentation clearer across the public API surface.

**User Journey**:
1. Review the comprehensive JSDoc audit report
2. Study codebase JSDoc patterns and best practices
3. Prioritize improvements by impact (public APIs first)
4. Update JSDoc comments following established patterns
5. Verify changes with linting and build
6. Confirm no tests need updating (documentation-only)

**Pain Points Addressed**:
- **Unclear Defaults**: Many JSDoc comments don't state default values explicitly
- **Missing Side Effects**: Methods that emit events or modify state don't document it
- **Ambiguous Parameters**: Optional parameters don't always clarify behavior when omitted
- **Documentation Quality**: Inconsistent JSDoc quality across codebase impacts DX

---

## Why

**Business Value and User Impact**:
- Improves developer experience with clearer API documentation
- Reduces time spent debugging unexpected behavior
- Makes the library more approachable for new users
- IDE autocomplete shows better documentation hints
- Reduces support questions about default behaviors

**Integration with Existing Features**:
- Builds on P3.M1.T2.S1 (trackTiming JSDoc improvement)
- Follows established JSDoc patterns in codebase
- Consistent with existing documentation standards
- No behavioral changes - documentation only

**Problems Solved**:
- **Ambiguous Defaults**: 12 JSDoc comments missing explicit default values
- **Missing Side Effect Documentation**: 15 methods don't document events/state changes
- **Unclear Required/Optional**: 8 parameters don't clarify behavior when omitted
- **Inconsistent Documentation**: Variable quality across codebase

---

## What

**User-Visible Behavior and Technical Requirements**:

### Documentation Update Requirements

This work item addresses multiple JSDoc clarity issues across critical files:

**Scope of Changes**:
- **HIGH PRIORITY** (6 items): Public API methods with unclear defaults
- **MEDIUM PRIORITY** (15 items): Internal methods or missing side effect docs
- **LOW PRIORITY** (8 items): Minor clarifications

**Files to Modify**:
1. `src/core/workflow.ts` - Workflow class JSDoc improvements
2. `src/core/agent.ts` - Agent class JSDoc improvements
3. `src/providers/anthropic-provider.ts` - AnthropicProvider JSDoc improvements
4. `src/providers/opencode-provider.ts` - OpenCodeProvider JSDoc improvements
5. `src/providers/provider-registry.ts` - ProviderRegistry JSDoc improvements

**Exclusions**:
- `src/types/decorators.ts:13` (trackTiming) - Already handled in P3.M1.T2.S1
- `src/decorators/step.ts` - No issues found
- `src/decorators/task.ts` - No issues found
- `src/decorators/observed-state.ts` - No issues found
- `src/types/**/*.ts` - No issues found

### Success Criteria

- [ ] All high-priority JSDoc issues addressed (public API defaults)
- [ ] Medium-priority issues addressed (side effects documentation)
- [ ] All JSDoc updates follow codebase patterns
- [ ] No implementation code changes (documentation only)
- [ ] No test changes required
- [ ] Linting passes
- [ ] Build succeeds
- [ ] All tests pass

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: YES - This PRP provides:
- Comprehensive audit report with exact file paths and line numbers
- Current JSDoc text for each issue
- Suggested improvements for each issue
- Codebase JSDoc pattern conventions
- External best practices research
- Validation commands

---

### Documentation & References

```yaml
# MUST READ - Comprehensive audit findings
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S2/research/jsdoc-audit-report.md
  why: Complete audit of all JSDoc issues with line numbers and suggested fixes
  section: Summary Statistics and Detailed Findings by File
  critical: Contains exact file paths, line numbers, and suggested improvements for all 32 issues

# MUST READ - External best practices
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S2/research/jsdoc-best-practices-external.md
  why: Industry-standard JSDoc patterns from TypeScript, Node.js, Azure SDK
  section: Pattern 1: Inline in Parameter Description, Pattern 2: Required vs Optional
  critical: Shows standard patterns for default values and optional parameters

# MUST READ - Codebase JSDoc patterns
- file: src/types/error-strategy.ts
  why: Shows similar pattern of default + behavioral context
  lines: 7 (default: false, first error wins)
  pattern: Default value plus explanation of default behavior
  critical: Model for adding behavioral context to default value

# MUST READ - Previous work context
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S1/PRP.md
  why: Understand what was already done (trackTiming JSDoc update)
  section: Goal and Implementation Blueprint
  critical: Don't duplicate work already completed in P3.M1.T2.S1

# MUST READ - Quick reference for patterns
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S2/research/jsdoc-quick-reference.md
  why: Copy-paste ready patterns for common JSDoc scenarios
  section: Parameter Documentation Patterns, Return Value Documentation
  critical: Quick reference for writing JSDoc updates

# MUST READ - Core files to audit
- file: src/core/workflow.ts
  why: Main Workflow class - primary public API
  lines: 104-106, 190-193, 271-273, 345-387, 413-445, 450-466, 471-493
  pattern: Constructor overloads, tree manipulation methods, event emission
  critical: 7 issues found requiring JSDoc improvements

- file: src/core/agent.ts
  why: Main Agent class - primary public API
  lines: 98, 244-253, 279-307, 613-624, 876-928, 975-987
  pattern: Constructor defaults, prompt execution, reflection, validation
  critical: 6 issues found requiring JSDoc improvements

- file: src/providers/anthropic-provider.ts
  why: Primary provider implementation
  lines: 182-188, 320-325, 828-892, 894-953, 1178-1209, 1211-1234, 1236-1256, 243-247
  pattern: Initialization, session management, MCP registration
  critical: 8 issues found requiring JSDoc improvements

- file: src/providers/opencode-provider.ts
  why: Secondary provider (deprecated but still used)
  lines: 1-71, 194-206, 431-453, 849-886, 888-953, 997-1038
  pattern: Deprecation warning, LLM-only mode limitations
  critical: 6 issues found requiring JSDoc improvements

- file: src/providers/provider-registry.ts
  why: Provider registry for managing multiple providers
  lines: 164-169, 281-324, 360-401, 473-530
  pattern: Singleton pattern, provider initialization, termination
  critical: 5 issues found requiring JSDoc improvements

# EXTERNAL REFERENCES - Best practices
- url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
  why: Official TypeScript JSDoc reference
  section: @param, @returns tags
  critical: Shows standard TypeScript JSDoc syntax

- url: https://tsdoc.org/
  why: TSDoc standard for TypeScript API documentation
  section: Parameter documentation
  critical: Industry standard for TypeScript docs

- url: https://github.com/microsoft/TypeScript/tree/main/src/compiler
  why: TypeScript compiler source - excellent JSDoc examples
  section: transformer.ts, types.ts
  critical: Real-world examples of clear JSDoc patterns
```

---

### Current Codebase Tree

```bash
src/
├── core/
│   ├── workflow.ts              # 7 JSDoc issues to fix
│   └── agent.ts                 # 6 JSDoc issues to fix
├── providers/
│   ├── provider-registry.ts     # 5 JSDoc issues to fix
│   ├── anthropic-provider.ts    # 8 JSDoc issues to fix
│   └── opencode-provider.ts     # 6 JSDoc issues to fix
├── decorators/
│   ├── step.ts                  # No issues (already clear)
│   ├── task.ts                  # No issues (already clear)
│   └── observed-state.ts        # No issues (already clear)
└── types/
    ├── decorators.ts            # trackTiming fixed in P3.M1.T2.S1
    └── [other types]            # No issues found
```

---

### Desired Codebase Tree with Files to be Modified

```bash
# MODIFIED FILES:

# src/core/workflow.ts
# - Line 104-106: Constructor overload - clarify defaults for both patterns
# - Line 190-193: isDescendantOf - add security warning context
# - Line 271-273: addObserver - add event emission side effect
# - Line 345-387: attachChild - add event emission details
# - Line 413-445: detachChild - add event emission details
# - Line 450-466: emitEvent - add notification side effects
# - Line 471-493: snapshotState - add observer notification details

# src/core/agent.ts
# - Line 98: Constructor - add default config documentation
# - Line 244-253: prompt - clarify required parameters and defaults
# - Line 279-307: reflect - add opt-out pattern explanation
# - Line 613-624: executePrompt - add cache/environment side effects
# - Line 876-928: validateResponse - clarify schema requirements
# - Line 975-987: setupEnvironment - add environment modification details

# src/providers/anthropic-provider.ts
# - Line 182-188: initialize - add session store default
# - Line 320-325: normalizeModel - add provider validation detail
# - Line 828-892: registerMCPs - add state modification side effects
# - Line 894-953: loadSkills - add empty array behavior
# - Line 1178-1209: createSession - add idempotent behavior
# - Line 1211-1234: getSession - add update side effects
# - Line 1236-1256: deleteSession - add destruction warning
# - Line 243-247: sessionTtl config - add default value

# src/providers/opencode-provider.ts
# - Line 1-71: File header - add deprecation logging side effect
# - Line 194-206: initialize - add port/timeout defaults
# - Line 431-453: execute - add LLM-only limitation detail
# - Line 849-886: registerMCPs - add LLM-only limitation
# - Line 888-953: loadSkills - add system prompt injection detail
# - Line 997-1038: normalizeModel - add multi-provider detail

# src/providers/provider-registry.ts
# - Line 164-169: getInstance - add lazy initialization detail
# - Line 281-324: initializeProvider - clarify options defaults
# - Line 360-401: initializeAll - add config default behavior
# - Line 473-530: terminateAll - add cleanup side effects
```

---

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: This is a documentation-only change
// NO implementation code should be modified
// NO tests should be created or modified
// All changes are JSDoc comment updates only

// CRITICAL: trackTiming already fixed in P3.M1.T2.S1
// File: src/types/decorators.ts line 13
// DO NOT modify this - already handled
// Focus on other JSDoc issues in the audit report

// CRITICAL: The JSDoc pattern in this codebase
// Pattern: /** Description (default: value) */
// Examples from src/types/decorators.ts:
// - "Track and emit step duration (default: true, tracked unless explicitly set to false)"
// - "If true, step can be restarted on failure (default: false)"
// - "Maximum number of retry attempts (default: 3)"

// CRITICAL: Adding behavioral context to default values
// Pattern from src/types/error-strategy.ts:7:
// "Enable error merging (default: false, first error wins)"
// This shows the pattern of adding explanation after the default value

// CRITICAL: Workflow constructor has two patterns
// Class-based: constructor(name?: string, parent?: Workflow)
// Functional: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)
// The JSDoc should clarify both patterns and their defaults

// CRITICAL: OpenCodeProvider is deprecated
// File: src/providers/opencode-provider.ts
// Has LLM-only mode limitations that should be documented
// Tools are executed server-side, not client-side
// This affects registerMCPs, execute, and loadSkills

// CRITICAL: Session persistence has multiple options
// sessionPersistence: 'memory' (default), 'file', 'redis'
// sessionTtl: defaults to 86400000ms (24 hours)
// These defaults should be documented in AnthropicProvider

// CRITICAL: Side effects to document
// - Event emissions: "emits X event", "triggers treeUpdated"
// - State modifications: "modifies workflow tree", "updates node.state"
// - I/O operations: "reads from file", "writes to store"
// - Cache operations: "reads from cache", "writes to cache"
// - Environment: "modifies process.env"

// CRITICAL: Opt-out vs opt-in patterns
// Reflection: enabled by default (opt-out)
// trackTiming: enabled by default (opt-out)
// restartable: disabled by default (opt-in)
// Document these patterns explicitly

// CRITICAL: Required vs optional
// Use TypeScript ? for optional: param?: Type
// In JSDoc, use [paramName] for optional
// Document what happens when optional is omitted

// CRITICAL: Idempotent operations
// createSession: idempotent - no-op if exists
// Document this behavior clearly

// CRITICAL: Destructive operations
// deleteSession: destructive - cannot be recovered
// terminateAll: stops all providers
// Add warning @remarks for destructive operations

// CRITICAL: Lazy initialization
// ProviderRegistry.getInstance() creates instance on first call
// Document "lazy initialization" pattern

// CRITICAL: Multi-provider support
// OpenCode supports 75+ providers via gateway
// normalizeModel should document this

// CRITICAL: No tests needed
// This is a documentation-only change
// Runtime behavior is unchanged
// Existing tests verify the implementation works correctly

// CRITICAL: Follow existing codebase conventions
// Use "(default: value)" notation
// Add behavioral context in the same sentence
// Keep it concise and readable
// Use @remarks for additional context
// Use @side effects for side effect documentation

// CRITICAL: Priority order
// 1. HIGH PRIORITY: Public API defaults (6 items)
// 2. MEDIUM PRIORITY: Side effects (15 items)
// 3. LOW PRIORITY: Minor clarifications (8 items)

// CRITICAL: Public API files
// src/core/workflow.ts - HIGH PRIORITY (public API)
// src/core/agent.ts - HIGH PRIORITY (public API)
// src/providers/ - MEDIUM PRIORITY (provider implementations)

// CRITICAL: Validation is simple
// Just run lint and build to ensure no errors
// Tests should pass unchanged
// No new test files needed
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models - this is a documentation-only change:

```typescript
// EXAMPLE: Before and After for High-Priority Issues

// BEFORE (src/core/agent.ts line 98):
/**
 * Creates a new Agent instance.
 * @param config Agent configuration
 */
constructor(config: AgentConfig = {})

// AFTER (src/core/agent.ts line 98):
/**
 * Creates a new Agent instance.
 * @param config Agent configuration (default: { name: 'Agent', model: 'claude-sonnet-4-20250514' })
 */
constructor(config: AgentConfig = {})

// BEFORE (src/core/workflow.ts line 104-106):
/**
 * @param name Human-readable name (defaults to class name)
 */

// AFTER (src/core/workflow.ts line 104-106):
/**
 * @param name Human-readable name. For class-based pattern, defaults to class name.
 * @overload constructor(name?: string, parent?: Workflow) - Class-based pattern
 * @overload constructor(config: WorkflowConfig, executor?: WorkflowExecutor) - Functional pattern
 */

// EXAMPLE: Side Effect Documentation

// BEFORE (src/core/workflow.ts line 450-466):
/**
 * Emit an event to all root observers.
 */

// AFTER (src/core/workflow.ts line 450-466):
/**
 * Emit an event to all root observers.
 * @side effects Pushes event to node.events array and notifies all registered observers.
 * May trigger treeUpdated notifications for specific event types.
 */
```

---

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: REVIEW audit report and understand scope
  - READ: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P3M1T2S2/research/jsdoc-audit-report.md
  - UNDERSTAND: 32 total issues across 5 files
  - PRIORITIZE: HIGH (6), MEDIUM (15), LOW (8)
  - REFERENCE: Previous work in P3.M1.T2.S1 (already completed)

Task 2: UPDATE src/core/agent.ts (6 issues, HIGH PRIORITY)
  - LINE 98: Constructor - add default config documentation
  - LINE 244-253: prompt - clarify required parameters
  - LINE 279-307: reflect - add opt-out pattern explanation
  - LINE 613-624: executePrompt - add cache/environment side effects
  - LINE 876-928: validateResponse - clarify schema requirements
  - LINE 975-987: setupEnvironment - add environment details
  - PATTERN: Follow codebase JSDoc conventions
  - PLACEMENT: src/core/agent.ts

Task 3: UPDATE src/core/workflow.ts (7 issues, HIGH/MEDIUM PRIORITY)
  - LINE 104-106: Constructor - clarify both patterns
  - LINE 190-193: isDescendantOf - add security context
  - LINE 271-273: addObserver - add event emission
  - LINE 345-387: attachChild - add event details
  - LINE 413-445: detachChild - add event details
  - LINE 450-466: emitEvent - add notification details
  - LINE 471-493: snapshotState - add observer details
  - PATTERN: Use @side effects for event emissions
  - PLACEMENT: src/core/workflow.ts

Task 4: UPDATE src/providers/anthropic-provider.ts (8 issues, MEDIUM PRIORITY)
  - LINE 182-188: initialize - add session store default
  - LINE 320-325: normalizeModel - add validation detail
  - LINE 828-892: registerMCPs - add state modification
  - LINE 894-953: loadSkills - add empty array behavior
  - LINE 1178-1209: createSession - add idempotent detail
  - LINE 1211-1234: getSession - add update behavior
  - LINE 1236-1256: deleteSession - add destruction warning
  - LINE 243-247: sessionTtl - add default value
  - PATTERN: Document session persistence defaults clearly
  - PLACEMENT: src/providers/anthropic-provider.ts

Task 5: UPDATE src/providers/opencode-provider.ts (6 issues, MEDIUM/LOW PRIORITY)
  - LINE 1-71: File header - add deprecation logging
  - LINE 194-206: initialize - add port/timeout defaults
  - LINE 431-453: execute - add LLM-only limitation
  - LINE 849-886: registerMCPs - add LLM-only warning
  - LINE 888-953: loadSkills - add injection detail
  - LINE 997-1038: normalizeModel - add multi-provider detail
  - PATTERN: Document LLM-only mode limitations
  - PLACEMENT: src/providers/opencode-provider.ts

Task 6: UPDATE src/providers/provider-registry.ts (5 issues, MEDIUM/LOW PRIORITY)
  - LINE 164-169: getInstance - add lazy initialization
  - LINE 281-324: initializeProvider - clarify defaults
  - LINE 360-401: initializeAll - add config behavior
  - LINE 473-530: terminateAll - add cleanup details
  - PATTERN: Document singleton and lazy patterns
  - PLACEMENT: src/providers/provider-registry.ts

Task 7: VERIFY all changes with git diff
  - COMMAND: git diff src/core/agent.ts src/core/workflow.ts src/providers/
  - VERIFY: Only JSDoc comments changed
  - VERIFY: No implementation code changed

Task 8: RUN linter
  - COMMAND: npm run lint
  - EXPECTED: No errors (documentation-only change)
  - FIX: Any linting issues if they arise

Task 9: RUN build
  - COMMAND: npm run build
  - EXPECTED: No type errors (documentation-only change)
  - FIX: Any type errors if they arise

Task 10: RUN tests
  - COMMAND: npm test
  - EXPECTED: All tests pass (documentation-only change)
  - VERIFY: No test changes needed
```

---

### Implementation Patterns & Key Details

```typescript
// PATTERN 1: Default Value Documentation
// Use inline (default: value) notation

/**
 * Creates a new Agent instance.
 * @param config Agent configuration (default: { name: 'Agent', model: 'claude-sonnet-4-20250514' })
 */
constructor(config: AgentConfig = {}) {}

// PATTERN 2: Constructor Overloads
// Document multiple calling patterns clearly

/**
 * Creates a new Workflow instance.
 * @overload Class-based: constructor(name?: string, parent?: Workflow)
 * @overload Functional: constructor(config: WorkflowConfig, executor?: WorkflowExecutor)
 * @param name For class-based pattern, human-readable name (default: class name)
 */
constructor(nameOrConfig?: string | WorkflowConfig, parentOrExecutor?: Workflow | WorkflowExecutor) {}

// PATTERN 3: Opt-Out Pattern Documentation
// Explicitly state when a feature is on by default

/**
 * Execute with optional reflection.
 * @param prompt Prompt to execute (required)
 * @param overrides Optional overrides (default: undefined)
 * @remarks Reflection follows opt-out pattern: enabled by default unless explicitly disabled.
 * When reflection is enabled (prompt.enableReflection, overrides.enableReflection, or
 * config.enableReflection), prefixes system prompt with reflection instructions.
 */

// PATTERN 4: Side Effect Documentation
// Use @side effects tag for clear indication

/**
 * Emit an event to all root observers.
 * @side effects Pushes event to node.events array and notifies all registered observers.
 * May trigger treeUpdated notifications for specific event types.
 */
emitEvent(event: WorkflowEvent): void {}

// PATTERN 5: Required vs Optional
// Use [paramName] for optional, document default behavior

/**
 * Initialize the provider.
 * @param options Optional provider configuration (default: undefined)
 * @remarks Session storage defaults to MemorySessionStore if not specified.
 */

// PATTERN 6: Idempotent Operations
// Document when operations are safe to retry

/**
 * Create a new session.
 * @param sessionId Unique identifier (required)
 * @remarks Idempotent: if session exists, this is a no-op.
 */

// PATTERN 7: Destructive Operations
// Add warning for irreversible operations

/**
 * Delete a session.
 * @param sessionId Session identifier to delete (required)
 * @returns true if deleted, false if not found
 * @remarks Destructive operation: deleted sessions cannot be recovered.
 */

// PATTERN 8: Lazy Initialization
// Document when singleton is created

/**
 * Get the singleton ProviderRegistry instance.
 * @remarks Creates instance on first call (lazy initialization).
 * Returns same instance on subsequent calls.
 */

// PATTERN 9: Multi-Provider Support
// Document provider gateway capabilities

/**
 * Normalize model string for multi-provider gateway.
 * @param model Model string to normalize
 * @remarks OpenCode supports 75+ providers via gateway.
 * Accepts any provider prefix (e.g., 'gpt-4', 'claude-3-opus').
 */

// PATTERN 10: LLM-Only Mode Limitations
// Document architectural limitations

/**
 * Execute a prompt request in LLM-only mode.
 * @remarks LLM-only mode: Tools are executed server-side with no client delegation.
 * The toolExecutor parameter is accepted for interface compliance but cannot be used.
 */

// GOTCHA 1: This is a documentation-only change
// Don't modify any implementation code
// Don't create or modify tests
// Don't change any other comments not in the audit

// GOTCHA 2: trackTiming already fixed in P3.M1.T2.S1
// File: src/types/decorators.ts line 13
// DO NOT modify this - already handled

// GOTCHA 3: Follow existing codebase conventions
// Use "(default: value)" notation
// Add behavioral context in same sentence
// Use @remarks for additional context
// Use @side effects for side effects

// GOTCHA 4: Priority matters
// HIGH: Public API defaults (Agent, Workflow constructors)
// MEDIUM: Side effects (event emissions, state modifications)
// LOW: Minor clarifications

// GOTCHA 5: Be consistent
// Use same JSDoc style across all updates
// Match existing patterns in the codebase
// Keep descriptions concise but informative

// GOTCHA 6: No tests needed
// Documentation-only change
// Runtime behavior unchanged
// Existing tests verify implementation

// GOTCHA 7: Public API focus
// Agent and Workflow are primary public APIs
// Provider implementations are secondary
// Focus on improving developer experience

// GOTCHA 8: Session persistence defaults
// sessionPersistence: 'memory' (default), 'file', 'redis'
// sessionTtl: 86400000ms (24 hours) default
// These should be documented in AnthropicProvider

// GOTCHA 9: OpenCode deprecation
// OpenCodeProvider is deprecated
// Should document deprecation side effects
// Should document LLM-only limitations

// GOTCHA 10: Event emissions are common side effects
// Many methods emit events
// Should document: "emits X event"
// Should document: "triggers treeUpdated"
```

---

### Integration Points

```yaml
NO INTEGRATION POINTS:
  - This is a standalone documentation change
  - No dependencies on other work items
  - No integration with other components
  - No configuration changes
  - No test changes

RELATED WORK:
  - P3.M1.T2.S1: trackTiming JSDoc update (already complete)
  - P2.M2.T1: Session persistence implementation (context for AnthropicProvider)
  - P1.M3.T1: OpenCode provider decision (context for deprecation)

FILES NOT TO MODIFY:
  - src/types/decorators.ts:13 (already fixed in P3.M1.T2.S1)
  - src/decorators/step.ts (no issues found)
  - src/decorators/task.ts (no issues found)
  - src/decorators/observed-state.ts (no issues found)
  - PRD.md (read-only)
  - tasks.json (read-only)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file update - fix before proceeding
npm run lint

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Verify changes with git diff
git diff src/core/agent.ts
git diff src/core/workflow.ts
git diff src/providers/anthropic-provider.ts
git diff src/providers/opencode-provider.ts
git diff src/providers/provider-registry.ts

# Expected: Only JSDoc comments changed, no implementation code
```

### Level 2: TypeScript Compilation (Component Validation)

```bash
# Run TypeScript compiler
npm run build

# Expected: No type errors (documentation-only change)
# If errors exist, READ output and fix before proceeding
```

### Level 3: Tests (System Validation)

```bash
# Run full test suite
npm test

# Expected: All tests pass (documentation-only change)
# No test modifications needed

# Verify test count unchanged
# Expected: Same number of tests as before
```

### Level 4: Review and Confirm (Final Validation)

```bash
# Review all changes
git diff

# Confirm:
# - Only JSDoc comments changed
# - All 32 issues from audit addressed
# - Changes follow codebase patterns
# - No implementation code changed
# - No test files changed
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 32 JSDoc issues from audit addressed
- [ ] High-priority issues (6) completed
- [ ] Medium-priority issues (15) completed
- [ ] Low-priority issues (8) completed or deferred
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm test`

### Feature Validation

- [ ] JSDoc comments follow codebase patterns
- [ ] Default values explicitly stated with "(default: X)"
- [ ] Side effects documented with "@side effects" tag
- [ ] Required vs optional parameters clarified
- [ ] Public API improvements prioritized
- [ ] No duplicate work from P3.M1.T2.S1

### Code Quality Validation

- [ ] Only documentation modified (no code changes)
- [ ] Follows existing JSDoc patterns in codebase
- [ ] Concise and readable comments
- [ ] No test changes (documentation-only)
- [ ] No breaking changes (public API documentation)

### Documentation & Deployment

- [ ] All audit findings addressed
- [ ] Consistent JSDoc style across updates
- [ ] No migration notes needed (no behavior change)
- [ ] Audit report updated with completion status

---

## Anti-Patterns to Avoid

- ❌ Don't modify the implementation code (JSDoc comments only)
- ❌ Don't create tests for a documentation-only change
- ❌ Don't modify src/types/decorators.ts:13 (already fixed in P3.M1.T2.S1)
- ❌ Don't modify PRD.md or tasks.json (read-only files)
- ❌ Don't reformat entire files (only update specific JSDoc comments)
- ❌ Don't change behavior or add new features
- ❌ Don't skip validation steps (lint, build, test)
- ❌ Don't use inconsistent JSDoc style across updates
- ❌ Don't forget to document side effects for event-emitting methods
- ❌ Don't omit default values for public API methods

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Comprehensive audit with exact file paths and line numbers
- ✅ Clear suggested improvements for each issue
- ✅ Codebase JSDoc patterns well-documented
- ✅ External best practices research available
- ✅ No implementation complexity (documentation only)
- ✅ No external dependencies needed
- ✅ No test writing required (documentation-only)
- ✅ Clear priority ordering (HIGH → MEDIUM → LOW)
- ✅ Previous work (P3.M1.T2.S1) shows pattern to follow
- ⚠️ 32 issues across 5 files is more complex than single-line change

**Validation**: This is a comprehensive but straightforward documentation update. The audit report provides exact file paths, line numbers, current text, and suggested improvements for all 32 issues. The changes are all JSDoc comment updates with no implementation complexity. The main challenge is the volume of changes (32 issues across 5 files), but each change is independent and well-specified. High confidence for one-pass implementation.

---

**PRP Version:** 1.0.0
**Date:** January 26, 2026
**Status:** READY FOR IMPLEMENTATION

---

**End of PRP**

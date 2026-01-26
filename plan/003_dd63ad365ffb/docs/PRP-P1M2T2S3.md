# Product Requirement Prompt (PRP): Document Workflow-Level Validation Behavior

**PRP ID**: P1.M2.T2.S3
**Work Item**: Document workflow-level validation behavior
**PRD Section**: 6.6 Validation
**Implementation Status**: Documentation Gap - Feature implemented (P1.M2.T1-T2), but no user-facing documentation exists

---

## Goal

**Feature Goal**: Create comprehensive user-facing documentation for the workflow-level agent response validation feature that was implemented in P1.M2.T1-T2, enabling users to understand and use both automatic and manual validation in their workflows.

**Deliverable**: New "Agent Response Validation" section in `docs/workflow.md` (or new `docs/validation.md` if preferred by user) with complete documentation of:
- Automatic validation behavior in functional workflows
- Manual validation using `validateAgentResponse()`
- Configuration options (`autoValidateResponses`)
- `invalidResponse` event structure and handling
- `INVALID_RESPONSE_FORMAT` error code
- Practical code examples for common scenarios

**Success Definition**:
- [ ] Documentation clearly explains both automatic and manual validation approaches
- [ ] Code examples are working, type-safe, and follow existing documentation patterns
- [ ] All validation features from P1.M2.T1-T2 are documented
- [ ] Documentation follows the structure and style of existing `docs/workflow.md`
- [ ] Users can understand how to enable, disable, and use validation without reading source code

## User Persona

**Target User**: Groundswell developers building agent-powered workflows who need to ensure LLM responses match expected schemas before processing.

**Use Case**: Developer has implemented a workflow that calls agents and needs to validate that agent responses conform to expected data structures before continuing execution.

**User Journey**:
1. Developer reads workflow documentation to understand how to build workflows
2. Developer encounters need to validate agent responses (PRD Section 6.6 requirement)
3. Developer finds validation section explaining automatic vs manual validation
4. Developer chooses approach (automatic for functional workflows, manual for class-based)
5. Developer implements validation using provided code examples
6. Developer understands validation errors and how to handle them

**Pain Points Addressed**:
- **Documentation Gap**: PRD Section 6.6 requires validation but no docs explain how to use it
- **Feature Discovery**: Users don't know validation exists or how to enable it
- **Error Handling**: Users don't understand `INVALID_RESPONSE_FORMAT` errors or how to recover
- **Configuration**: Users don't know how to control validation behavior (enable/disable)

## Why

- **PRD Compliance**: PRD Section 6.6 mandates workflow-level validation, but users cannot use what they cannot find
- **Feature Completeness**: Validation implementation (P1.M2.T1-T2) is incomplete without documentation
- **Developer Experience**: Clear documentation reduces support burden and accelerates adoption
- **Production Readiness**: Validation is critical for production workflows - documentation ensures proper usage

## What

Add a new "Agent Response Validation" section to `docs/workflow.md` (or create `docs/validation.md`) with:

### Documentation Structure

1. **Overview Section**
   - What validation is and why it matters
   - Link to PRD Section 6.6 requirement
   - Automatic vs manual validation comparison

2. **Automatic Validation (Functional Workflows)**
   - How `ctx.step()` automatically validates AgentResponse results
   - Configuration with `autoValidateResponses` option
   - Enable/disable at workflow level
   - Code examples showing automatic validation in action

3. **Manual Validation (Class-Based Workflows)**
   - `validateAgentResponse()` method usage
   - When to use manual validation
   - Integration with error handling
   - Code examples for class-based workflows

4. **Validation Events**
   - `invalidResponse` event structure
   - Event payload fields (workflowId, stepName, agentId, response, errors, timestamp)
   - Observer pattern for monitoring validation failures
   - Event-driven error handling examples

5. **Error Handling**
   - `INVALID_RESPONSE_FORMAT` error code
   - WorkflowError structure for validation failures
   - Error recovery strategies (retry with hints, graceful degradation)
   - Code examples for error handling patterns

6. **Common Scenarios**
   - Basic validation in functional workflow
   - Manual validation in class-based workflow
   - Conditional validation (enable in production only)
   - Event-driven monitoring and alerting
   - Retry logic with validation

7. **Configuration Reference**
   - `autoValidateResponses` option (default: false for non-breaking)
   - Workflow-level configuration table
   - Step-level override examples

8. **API Reference**
   - `validateAgentResponse<T>(response, agentId, dataSchema)` signature
   - `invalidResponse` event type definition
   - Related types and interfaces

### Success Criteria

- [ ] Documentation section exists with all subsections complete
- [ ] All code examples are syntactically correct and type-safe
- [ ] Automatic validation clearly distinguished from manual validation
- [ ] Configuration options documented with defaults
- [ ] Event structure documented with all fields
- [ ] Error handling patterns include practical examples
- [ ] Common scenarios provide copy-pasteable code
- [ ] Documentation follows existing `docs/workflow.md` patterns

## All Needed Context

### Context Completeness Check

**Question**: "If someone knew nothing about this codebase, would they have everything needed to implement this documentation successfully?"

**Answer**: YES - This PRP provides:
- Complete validation implementation details from codebase research
- Existing documentation structure and patterns to follow
- External research on validation documentation best practices
- Specific file locations and code snippets to reference
- Code examples from test files to adapt

### Documentation & References

```yaml
# MUST READ - Existing validation implementation
- file: src/core/workflow.ts
  why: Contains validateAgentResponse() method implementation with complete logic
  pattern: Method validates AgentResponse, emits invalidResponse event, creates WorkflowError
  gotcha: Method returns boolean (true=valid, false=invalid) but has side effects (event emission)

- file: src/core/workflow-context.ts
  why: Contains automatic validation hook in step() method
  pattern: Checks isAgentResponse() result, calls validateAgentResponse(), throws WorkflowError
  gotcha: agentId is 'unknown' at context level - workflow level has actual agentId

- file: src/utils/agent-validation.ts
  why: Contains shared validateAgentResponse() utility used by both Agent and Workflow
  pattern: Pure function returning ValidationResult { valid: boolean, errors?: ZodError }
  gotcha: Non-throwing validation - always returns result object

- file: src/types/events.ts
  why: Contains invalidResponse event type definition in WorkflowEvent discriminated union
  pattern: { type: 'invalidResponse', node, response, agentId, errors, timestamp }
  gotcha: Event must be added to WorkflowEvent type union

# MUST READ - Documentation structure patterns
- file: docs/workflow.md
  why: Master template for documentation structure, style, and patterns
  pattern: Table of contents, clear sections, code examples, API reference at end
  gotcha: Uses @Step, @Task, @ObservedState decorator patterns extensively

- file: docs/agent.md
  why: Reference for validation documentation style (see validateResponse section)
  pattern: Shows how to document validation methods with Zod schemas
  gotcha: Agent-level validation throws errors, workflow-level emits events

- file: docs/prompt.md
  why: Reference for schema validation documentation with Zod
  pattern: Shows responseFormat usage, schema definition, type inference
  gotcha: Emphasizes safeParse() over parse() for non-throwing validation

# MUST READ - Test examples for practical code patterns
- file: src/__tests__/integration/workflow-automatic-validation.test.ts
  why: Contains real-world examples of automatic validation in functional workflows
  pattern: Tests valid/invalid responses, event emission, configuration control
  gotcha: Shows both success and failure scenarios with assertions

- file: src/__tests__/integration/agent-validation.test.ts
  why: Contains examples of manual validation with validateAgentResponse()
  pattern: Shows workflow.validateAgentResponse() usage with schemas
  gotcha: Demonstrates event verification and error checking

# MUST READ - PRD requirements
- file: PRD.md
  why: Section 6.6 defines the validation requirement we're documenting
  section: "## 6.6 Validation"
  pattern: "Workflows receiving agent responses SHOULD validate against the AgentResponse schema"
  gotcha: Error code must be INVALID_RESPONSE_FORMAT for validation failures

# EXTERNAL RESEARCH - Best practices for validation documentation
- url: https://zod.dev
  why: Zod is the validation library - understanding their docs helps explain schema validation
  critical: Emphasize safeParse() for non-throwing validation, type inference patterns

- url: https://react-hook-form.com/get-started#SchemaValidation
  why: Best-in-class validation documentation example
  critical: Progressive examples (basic → advanced), side-by-side comparisons, clear error handling

- url: https://github.com/colinhacks/zod
  why: Zod GitHub has excellent examples of schema definition patterns
  critical: Schema composition, refinements, transforms, error formatting

# DOCUMENTATION PATTERNS TO FOLLOW
- file: docs/workflow.md (lines 1-603)
  why: Complete example of Groundswell documentation structure
  pattern: TOC at top, clear section headers, code examples with ```typescript, API reference at end
  gotcha: Always show type annotations, include error handling in examples

- file: docs/restart-pattern.md
  why: Advanced pattern documentation showing how to document complex features
  pattern: Problem → Solution → Code Example structure
  gotcha: Links to related documentation (error handling section)
```

### Current Codebase Tree

```bash
groundswell/
├── docs/
│   ├── workflow.md                    # TARGET FILE - add validation section here
│   ├── agent.md                       # Reference: validation examples
│   ├── prompt.md                      # Reference: schema validation patterns
│   └── restart-pattern.md             # Reference: advanced pattern documentation
├── src/
│   ├── core/
│   │   ├── workflow.ts                # validateAgentResponse() method (lines TBD)
│   │   └── workflow-context.ts        # automatic validation hook in step() (lines TBD)
│   ├── types/
│   │   └── events.ts                  # invalidResponse event type (lines TBD)
│   ├── utils/
│   │   └── agent-validation.ts        # shared validateAgentResponse() utility
│   └── __tests__/
│       ├── integration/
│       │   ├── workflow-automatic-validation.test.ts  # Automatic validation examples
│       │   └── agent-validation.test.ts               # Manual validation examples
│       └── ...
├── PRD.md                              # Section 6.6 validation requirement
└── plan/
    └── 003_dd63ad365ffb/
        └── bugfix/
            └── 001_45bfbada88e7/
                └── P1M2T2S3/
                    └── PRP.md         # THIS FILE
```

### Desired Codebase Tree with Files to be Added

```bash
# NO SOURCE CODE FILES ADDED - THIS IS DOCUMENTATION ONLY

docs/
└── workflow.md                         # MODIFIED - add "Agent Response Validation" section
    ├── Overview subsection
    ├── Automatic Validation subsection
    ├── Manual Validation subsection
    ├── Validation Events subsection
    ├── Error Handling subsection
    ├── Common Scenarios subsection
    ├── Configuration Reference subsection
    └── API Reference subsection (extends existing)

# ALTERNATIVE: Create new dedicated validation file
docs/
└── validation.md                       # NEW FILE (if user prefers)
    └── (complete validation documentation as separate doc)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: autoValidateResponses defaults to FALSE (non-breaking change)
// When documenting, emphasize that users must explicitly enable validation
const workflow = createWorkflow({
  name: 'MyWorkflow',
  autoValidateResponses: true,  // REQUIRED - validation is opt-in
  executor: async (ctx) => { /* ... */ }
});

// GOTCHA: Functional workflows (ctx.step) use automatic validation
// Class-based workflows (@Step decorator) use manual validation
// Make this distinction very clear in documentation

// CRITICAL: validateAgentResponse() returns boolean BUT has side effects
// Returns: true if valid, false if invalid
// Side effects: emits invalidResponse event, does NOT throw
// Users should check return value and handle accordingly

// GOTCHA: agentId in invalidResponse event
// Workflow-level validation: agentId is provided (passed to method)
// Context-level validation: agentId is 'unknown' (cannot determine at execution level)
// Document this limitation clearly

// CRITICAL: Validation errors bypass reflection retry logic
// Validation failures are system errors, not recoverable business logic errors
// They throw WorkflowError immediately without triggering @Step retry mechanism

// PATTERN: Zod schemas use safeParse() for non-throwing validation
// Always prefer safeParse() over parse() in examples
// Show how to check result.success before accessing result.data

// GOTCHA: Error code is INVALID_RESPONSE_FORMAT (not VALIDATION_FAILED)
// This is the PRD-mandated error code for schema validation failures
// Document this exact code for error handling patterns

// PATTERN: Event emission happens BEFORE error is thrown
// Observers receive invalidResponse event before WorkflowError is thrown
// This allows observers to log/monitor before workflow fails
```

## Implementation Blueprint

### Documentation Structure

Create hierarchical documentation following `docs/workflow.md` pattern:

```markdown
## Agent Response Validation

[Overview paragraph linking to PRD Section 6.6]

### Automatic vs Manual Validation

[Comparison table showing approaches]

### Automatic Validation (Functional Workflows)

[How ctx.step() validates automatically, configuration examples]

### Manual Validation (Class-Based Workflows)

[validateAgentResponse() method usage, when to use]

### Validation Events

[invalidResponse event structure, observer pattern]

### Error Handling

[INVALID_RESPONSE_FORMAT error, recovery strategies]

### Common Scenarios

[Practical code examples for real-world use cases]

### Configuration

[autoValidateResponses option, defaults, override patterns]

### API Reference

[Method signatures, type definitions]
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: RESEARCH and ANALYZE existing validation implementation
  - REVIEW: src/core/workflow.ts validateAgentResponse() method
  - REVIEW: src/core/workflow-context.ts step() automatic validation hook
  - REVIEW: src/utils/agent-validation.ts shared utility
  - EXTRACT: Key code patterns for documentation examples
  - UNDERSTAND: Difference between automatic (functional) and manual (class-based) validation
  - DELIVERABLE: Notes on validation behavior, event structure, error handling

Task 2: STUDY existing documentation patterns
  - ANALYZE: docs/workflow.md structure, tone, and formatting
  - ANALYZE: docs/agent.md validation section for style reference
  - ANALYZE: docs/prompt.md schema validation documentation
  - IDENTIFY: Code example patterns (imports, error handling, type annotations)
  - IDENTIFY: Table patterns for options and configuration
  - DELIVERABLE: Template for new validation section

Task 3: REVIEW test files for practical examples
  - EXTRACT: Real-world examples from workflow-automatic-validation.test.ts
  - EXTRACT: Manual validation examples from agent-validation.test.ts
  - ADAPT: Test code into documentation-ready examples
  - VERIFY: All examples are syntactically correct and type-safe
  - DELIVERABLE: Library of code examples for documentation

Task 4: CREATE documentation outline
  - STRUCTURE: All subsections following workflow.md pattern
  - PLAN: Content for each subsection (overview, examples, reference)
  - ENSURE: Automatic vs manual validation distinction is clear
  - ENSURE: Configuration options are documented with defaults
  - ENSURE: Event structure and error handling are complete
  - DELIVERABLE: Detailed outline with placeholder content

Task 5: WRITE "Overview" and "Automatic vs Manual Validation" sections
  - CONTENT: What validation is, why it matters (PRD 6.6 link)
  - CONTENT: Comparison table of automatic vs manual approaches
  - CONTENT: When to use each approach (functional vs class-based workflows)
  - EXAMPLES: Brief code snippets showing each approach
  - STYLE: Follow workflow.md intro section style
  - DELIVERABLE: Complete overview and comparison sections

Task 6: WRITE "Automatic Validation" section
  - CONTENT: How ctx.step() automatically validates AgentResponse results
  - CONTENT: Configuration with autoValidateResponses option
  - CONTENT: Enable/disable at workflow level
  - EXAMPLES: Functional workflow with validation enabled
  - EXAMPLES: Functional workflow with validation disabled
  - EXAMPLES: Workflow-level configuration
  - STYLE: Code examples with imports, comments, error handling
  - DELIVERABLE: Complete automatic validation documentation

Task 7: WRITE "Manual Validation" section
  - CONTENT: validateAgentResponse() method signature and usage
  - CONTENT: When to use manual validation (class-based workflows)
  - CONTENT: Integration with error handling (try/catch WorkflowError)
  - EXAMPLES: Class-based workflow with manual validation
  - EXAMPLES: Checking return value (boolean) and handling failure
  - EXAMPLES: Integrating with @Step decorator methods
  - STYLE: Follow workflow.md decorator pattern examples
  - DELIVERABLE: Complete manual validation documentation

Task 8: WRITE "Validation Events" section
  - CONTENT: invalidResponse event type structure
  - CONTENT: Event payload fields (workflowId, stepName, agentId, response, errors, timestamp)
  - CONTENT: Observer pattern for monitoring validation failures
  - EXAMPLES: Adding observer to listen for invalidResponse events
  - EXAMPLES: Logging validation failures to external service
  - EXAMPLES: Event-driven alerting on critical failures
  - STYLE: Follow workflow.md Observers section pattern
  - DELIVERABLE: Complete validation events documentation

Task 9: WRITE "Error Handling" section
  - CONTENT: INVALID_RESPONSE_FORMAT error code (PRD 6.6 requirement)
  - CONTENT: WorkflowError structure for validation failures
  - CONTENT: ZodError details in event payload
  - CONTENT: Error recovery strategies (retry with hints, graceful degradation)
  - EXAMPLES: Catching WorkflowError with validation failures
  - EXAMPLES: Extracting ZodError details from event
  - EXAMPLES: Retry logic with improved prompts
  - STYLE: Follow workflow.md Error Handling section pattern
  - DELIVERABLE: Complete error handling documentation

Task 10: WRITE "Common Scenarios" section
  - CONTENT: Scenario 1 - Basic validation in functional workflow
  - CONTENT: Scenario 2 - Manual validation in class-based workflow
  - CONTENT: Scenario 3 - Conditional validation (production only)
  - CONTENT: Scenario 4 - Event-driven monitoring and alerting
  - CONTENT: Scenario 5 - Retry logic with validation feedback
  - EXAMPLES: Complete, copy-pasteable code for each scenario
  - STYLE: Real-world examples with imports, types, error handling
  - DELIVERABLE: Complete common scenarios section

Task 11: WRITE "Configuration Reference" section
  - CONTENT: autoValidateResponses option (type, default, description)
  - CONTENT: Workflow-level configuration table
  - CONTENT: Step-level override examples (if applicable)
  - CONTENT: Configuration priority/hierarchy (if applicable)
  - STYLE: Follow workflow.md API Reference table pattern
  - DELIVERABLE: Complete configuration reference

Task 12: WRITE "API Reference" section
  - CONTENT: validateAgentResponse<T>(response, agentId, dataSchema) signature
  - CONTENT: Parameter descriptions and types
  - CONTENT: Return value (boolean) and side effects (event emission)
  - CONTENT: invalidResponse event type definition
  - CONTENT: Related types (ValidationResult, WorkflowError, ZodError)
  - STYLE: Follow workflow.md API Reference format
  - DELIVERABLE: Complete API reference

Task 13: INTEGRATE new section into docs/workflow.md
  - DECIDE: Insert location (after "Error Handling", before "Concurrent Execution")
  - UPDATE: Table of Contents to include new section link
  - VERIFY: Internal links work correctly
  - VERIFY: Code examples render properly
  - VERIFY: No formatting issues or broken sections
  - DELIVERABLE: Updated docs/workflow.md with validation section

Task 14: ALTERNATIVE - CREATE standalone docs/validation.md
  - DECIDE: User may prefer separate validation documentation file
  - CREATE: New docs/validation.md with complete validation documentation
  - UPDATE: docs/workflow.md to link to validation.md
  - UPDATE: Root README.md to include validation.md link
  - DELIVERABLE: New docs/validation.md file (if chosen)

Task 15: VALIDATE documentation completeness
  - CHECK: All P1.M2.T1-T2 features are documented
  - CHECK: Automatic vs manual distinction is clear
  - CHECK: Configuration options documented with defaults
  - CHECK: Event structure complete with all fields
  - CHECK: Error handling patterns include examples
  - CHECK: Common scenarios are practical and complete
  - CHECK: API reference is accurate and complete
  - CHECK: Code examples are syntactically correct
  - CHECK: Internal links work
  - DELIVERABLE: Validation checklist confirming completeness

Task 16: FINAL REVIEW and polish
  - REVIEW: Documentation tone matches existing docs
  - REVIEW: Code examples follow project patterns
  - REVIEW: Type annotations are correct
  - REVIEW: Error handling is realistic
  - REVIEW: No typos or formatting issues
  - DELIVERABLE: Final documentation ready for review
```

### Implementation Patterns & Key Details

```markdown
# Documentation Section Structure Pattern (from docs/workflow.md)

## Section Title

[Opening paragraph explaining what this feature is and why it matters]

### Subsection Title

[Brief description of the subsection content]

```typescript
// Code example with:
// - Imports at top
// - Type annotations
// - Realistic variable names
// - Error handling
// - Comments explaining key points
```

[Explanation of what the code does and why]

**Options Table (if applicable):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `undefined` | Description of option |
| `enabled` | `boolean` | `false` | Description with default |

**Key Points:**
- Important detail about usage
- Critical gotcha or limitation
- Best practice recommendation

# Automatic vs Manual Validation Pattern

## Automatic Validation (Functional Workflows)

**Used in:** Functional workflows created with `createWorkflow()`

**How it works:**
1. Workflow configured with `autoValidateResponses: true`
2. `ctx.step()` checks if result is `AgentResponse`
3. Calls `validateAgentResponse()` automatically
4. Emits `invalidResponse` event on failure
5. Throws `WorkflowError` immediately

**When to use:**
- Standard functional workflows
- Want validation for all agent calls
- Prefer automatic over manual validation

## Manual Validation (Class-Based Workflows)

**Used in:** Class-based workflows extending `Workflow`

**How it works:**
1. Call `this.validateAgentResponse(response, agentId, schema)` explicitly
2. Check return boolean value (true=valid, false=invalid)
3. Handle validation failure manually
4. Event already emitted, error already created

**When to use:**
- Class-based workflows with `@Step` decorator
- Need conditional validation
- Want custom error handling

# Code Example Pattern

```typescript
// Import dependencies
import { createWorkflow, Workflow } from 'groundswell';
import { z } from 'zod';

// Define schema
const ResponseSchema = z.object({
  result: z.string(),
  score: z.number().min(0).max(100),
});

// Example usage
const workflow = createWorkflow({
  name: 'ExampleWorkflow',
  autoValidateResponses: true,  // Enable automatic validation
  executor: async (ctx) => {
    // Automatic validation happens here
    const result = await ctx.step('analyze', async () => {
      return await agent.prompt(prompt);
    });
    // If validation failed, WorkflowError is thrown
    // If validation passed, result.data is type-safe
    return result.data;
  },
});
```

**Key Points:**
- `autoValidateResponses: true` is required (defaults to false)
- Validation happens automatically in `ctx.step()`
- `WorkflowError` is thrown on validation failure
- `invalidResponse` event is emitted before error is thrown

# Event Documentation Pattern

### invalidResponse Event

Emitted when agent response validation fails.

**Event Structure:**

```typescript
interface InvalidResponseEvent {
  type: 'invalidResponse';
  node: WorkflowNode;
  response: AgentResponse<unknown>;
  agentId: string;
  errors: z.ZodError;
  timestamp: number;
}
```

**Event Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'invalidResponse'` | Event type identifier |
| `node` | `WorkflowNode` | Workflow node where validation failed |
| `response` | `AgentResponse` | The response that failed validation |
| `agentId` | `string` | ID of the agent that produced the response |
| `errors` | `z.ZodError` | Zod validation error details |
| `timestamp` | `number` | Unix timestamp of validation failure |

**Observing Validation Events:**

```typescript
workflow.addObserver({
  onEvent: (event) => {
    if (event.type === 'invalidResponse') {
      console.log('Validation failed:', {
        agentId: event.agentId,
        errors: event.errors.issues,
      });
    }
  },
});
```

# Error Handling Pattern

### INVALID_RESPONSE_FORMAT Error

Validation failures use error code `INVALID_RESPONSE_FORMAT` as specified in PRD Section 6.6.

**Error Structure:**

```typescript
interface WorkflowError {
  message: string;
  original: z.ZodError;
  workflowId: string;
  stack?: string;
  state: Record<string, unknown>;
  logs: LogEntry[];
}
```

**Handling Validation Errors:**

```typescript
try {
  await workflow.run();
} catch (error) {
  if (error.original && error.original.name === 'ZodError') {
    // Validation failure
    console.log('Validation errors:', error.original.issues);
    // Decide whether to retry or abort
  }
}
```

# Common Scenario Pattern

Each scenario should follow this structure:

1. **Problem Statement** - Clear description of the user's goal
2. **Solution** - Brief explanation of the approach
3. **Complete Code** - Full working example with imports
4. **Key Points** - Bullet points explaining important details

Example:

```markdown
### Scenario: Validate in Production Only

**Problem:** You want to enable validation in production but skip it during development for faster iteration.

**Solution:** Use conditional configuration to enable validation based on environment.

```typescript
const workflow = createWorkflow({
  name: 'SmartWorkflow',
  autoValidateResponses: process.env.NODE_ENV === 'production',
  executor: async (ctx) => {
    // Validation runs only in production
    const result = await ctx.step('analyze', async () => {
      return await agent.prompt(prompt);
    });
    return result.data;
  },
});
```

**Key Points:**
- Validation disabled in development (faster iteration)
- Validation enabled in production (catches LLM errors)
- No code changes needed between environments
- Uses NODE_ENV environment variable
```
```

### Integration Points

```yaml
DOCUMENTATION STRUCTURE:
  - location: "docs/workflow.md"
  - insert_after: "## Error Handling" section
  - insert_before: "## Concurrent Execution" section
  - update_toc: "Add 'Agent Response Validation' link to Table of Contents"

INTERNAL LINKS:
  - link_to: "docs/agent.md#validation" (Agent-level validation)
  - link_to: "docs/prompt.md#schema-validation" (Zod schema definition)
  - link_to: "docs/restart-pattern.md" (Advanced error handling)

CROSS-REFERENCES:
  - reference: "PRD.md Section 6.6" (Validation requirement)
  - reference: "src/core/workflow.ts" (validateAgentResponse implementation)
  - reference: "src/utils/agent-validation.ts" (Shared validation utility)

CODE EXAMPLES:
  - import_from: "src/__tests__/integration/workflow-automatic-validation.test.ts"
  - import_from: "src/__tests__/integration/agent-validation.test.ts"
  - adapt_test_code: Convert test assertions into documentation examples
```

## Validation Loop

### Level 1: Documentation Structure Validation

```bash
# Verify documentation file exists and is accessible
ls -la docs/workflow.md

# Check for markdown formatting issues
# (No automated tool - manual review)

# Verify table of contents is updated
grep -A 20 "## Table of Contents" docs/workflow.md | grep "Agent Response Validation"

# Expected: TOC includes link to new validation section
# If missing: Add TOC entry following existing pattern
```

### Level 2: Content Completeness Validation

```bash
# Check all required subsections exist
grep -c "### Automatic Validation" docs/workflow.md
grep -c "### Manual Validation" docs/workflow.md
grep -c "### Validation Events" docs/workflow.md
grep -c "### Error Handling" docs/workflow.md
grep -c "### Common Scenarios" docs/workflow.md

# Expected: Each subsection exists (count > 0)
# If missing: Add missing subsection

# Verify code examples are present
grep -c "```typescript" docs/workflow.md

# Expected: Multiple code blocks (at least 10-15 for full section)
# If too few: Add more practical code examples

# Check for key terms
grep -i "autoValidateResponses" docs/workflow.md
grep -i "validateAgentResponse" docs/workflow.md
grep -i "invalidResponse" docs/workflow.md
grep -i "INVALID_RESPONSE_FORMAT" docs/workflow.md

# Expected: Each key term appears multiple times
# If missing: Add documentation for missing terms
```

### Level 3: Code Example Validation

```bash
# Extract code examples and verify syntax
# (Manual process - copy examples to test file)

# Create temporary test file with examples
cat > /tmp/validation-docs-test.ts << 'EOF'
// Paste code examples from documentation here
// Ensure they compile without errors
EOF

# Run TypeScript compiler to check examples
npx tsc --noEmit /tmp/validation-docs-test.ts

# Expected: No TypeScript errors
# If errors exist: Fix code examples in documentation

# Verify imports are correct
grep "import.*from 'groundswell'" docs/workflow.md
grep "import.*from 'zod'" docs/workflow.md

# Expected: Correct import statements
# If wrong: Fix import paths and names
```

### Level 4: Link and Reference Validation

```bash
# Check internal links work
# (Manual process - click each link in markdown viewer)

# Verify external links
grep -o 'https://[^)]*' docs/workflow.md | while read url; do
  curl -f -s -o /dev/null "$url" && echo "OK: $url" || echo "BROKEN: $url"
done

# Expected: All external links return 200 OK
# If broken: Fix or remove broken links

# Verify cross-references are accurate
grep "PRD.md" docs/workflow.md
grep "src/core/workflow.ts" docs/workflow.md

# Expected: References point to existing files
# If missing: Add cross-references for context
```

### Level 5: User-Facing Validation

```bash
# Test documentation as a new user would
# (Manual process - fresh read-through)

# Can user understand automatic vs manual validation?
# (Subjective assessment)

# Can user implement validation after reading?
# (Follow code examples and verify they work)

# Are all configuration options documented?
grep -A 5 "autoValidateResponses" docs/workflow.md | grep -E "(default|boolean|true|false)"

# Expected: Configuration options have types and defaults
# If missing: Add configuration details

# Are error handling patterns clear?
grep -A 10 "INVALID_RESPONSE_FORMAT" docs/workflow.md

# Expected: Error code has explanation and examples
# If unclear: Add more error handling context
```

## Final Validation Checklist

### Technical Validation

- [ ] All required subsections exist (Automatic, Manual, Events, Errors, Scenarios, Config, API)
- [ ] Table of Contents updated with validation section link
- [ ] Code examples are syntactically correct TypeScript
- [ ] All imports in examples are correct (groundswell, zod)
- [ ] Internal links work (TOC, cross-references)
- [ ] External links are accessible (if any)
- [ ] No markdown formatting issues

### Content Validation

- [ ] Automatic vs manual validation distinction is clear
- [ ] `autoValidateResponses` option documented with default (false)
- [ ] `validateAgentResponse()` method signature documented
- [ ] `invalidResponse` event structure complete with all fields
- [ ] `INVALID_RESPONSE_FORMAT` error code documented (PRD 6.6)
- [ ] Configuration examples show both enable and disable cases
- [ ] Error handling examples include ZodError details

### Documentation Quality Validation

- [ ] Tone matches existing `docs/workflow.md` documentation
- [ ] Code examples follow project patterns (imports, types, error handling)
- [ ] Practical scenarios are real-world applicable
- [ ] API reference is accurate and complete
- [ ] Cross-references to related documentation (agent.md, prompt.md)
- [ ] No typos or grammatical errors

### User Experience Validation

- [ ] New user can understand what validation is and why to use it
- [ ] User can choose between automatic and manual validation
- [ ] User can implement validation using provided examples
- [ ] User understands configuration options and defaults
- [ ] User knows how to handle validation errors
- [ ] User can observe validation events for monitoring

### Integration Validation

- [ ] Documentation references PRD Section 6.6 requirement
- [ ] Implementation details reference actual source code files
- [ ] Test file examples are adapted into documentation
- [ ] Links to related documentation (agent validation, prompt schemas)
- [ ] Follows existing documentation structure and patterns

---

## Anti-Patterns to Avoid

- ❌ Don't document features that don't exist (stick to P1.M2.T1-T2 implementation)
- ❌ Don't use theoretical examples - adapt from real test code
- ❌ Don't confuse automatic (functional) vs manual (class-based) validation
- ❌ Don't forget to document that `autoValidateResponses` defaults to `false`
- ❌ Don't omit event structure - users need it for monitoring
- ❌ Don't skip error handling examples - validation failures are common
- ❌ Don't use different documentation style than existing docs
- ❌ Don't forget to update Table of Contents
- ❌ Don't document Zod features not used in validation (keep focused)
- ❌ Don't assume user knows about validation - explain from scratch

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- ✅ Complete research of existing validation implementation (P1.M2.T1-T2)
- ✅ Clear documentation structure and patterns to follow (docs/workflow.md)
- ✅ Real-world code examples available in test files
- ✅ External research on validation documentation best practices
- ✅ Specific file locations and code patterns identified
- ✅ All validation features documented with practical examples
- ✅ Follows existing documentation tone and structure
- ⚠️ Minor risk: User may prefer standalone validation.md file (addressed in Task 14)

**Validation**: The completed PRP provides everything needed to create comprehensive validation documentation. An AI agent unfamiliar with the codebase can successfully write the documentation using only the PRP content and codebase access.

---

## Appendix: Key Code Snippets for Reference

### validateAgentResponse Implementation (src/core/workflow.ts)

```typescript
/**
 * Validate an agent response at the workflow level
 *
 * This method enables parent workflows to validate agent responses
 * before processing them. It follows the same validation pattern as
 * Agent.validateResponse() but emits events and creates WorkflowError
 * for workflow-level error handling.
 */
public validateAgentResponse<T>(
  response: AgentResponse<T>,
  agentId: string,
  dataSchema: z.ZodTypeAny = z.unknown()
): boolean {
  // Call shared utility for validation
  const result = validateAgentResponse(response, dataSchema);

  if (result.valid) {
    // Response is valid
    return true;
  }

  // Validation failed - emit event and create error
  const zodError = result.errors!;  // Safe: errors exists when valid is false

  // Emit invalidResponse event
  this.emitEvent({
    type: 'invalidResponse',
    node: this.node,
    response,
    agentId,
    errors: zodError,
    timestamp: Date.now(),
  });

  // Create WorkflowError with INVALID_RESPONSE_FORMAT context
  const validationError: WorkflowError = {
    message: `Agent response validation failed for agent '${agentId}'`,
    original: zodError,
    workflowId: this.id,
    stack: zodError.stack,
    state: getObservedState(this),
    logs: [...this.node.logs] as LogEntry[],
  };

  return false;
}
```

### Automatic Validation Hook (src/core/workflow-context.ts)

```typescript
// Automatic validation for AgentResponse results
if (this.autoValidateResponses && isAgentResponse(result)) {
  const validationResult = validateAgentResponse(result);

  if (!validationResult.valid) {
    const zodError = validationResult.errors!;

    // Emit invalidResponse event
    executionContext.emitEvent({
      type: 'invalidResponse',
      node: stepNode,
      response: result,
      agentId: 'unknown',  // Cannot determine agentId at context level
      errors: zodError,
      timestamp: Date.now(),
    });

    // Create WorkflowError with INVALID_RESPONSE_FORMAT context
    const validationError: WorkflowError = {
      message: `Agent response validation failed in step '${name}'`,
      original: zodError,
      workflowId: this.workflowId,
      stack: zodError.stack,
      state: getObservedState(this.workflow),
      logs: [...this.workflow.node.logs] as LogEntry[],
    };

    // Throw immediately - validation errors are not retried via reflection
    throw validationError;
  }
}
```

### Shared Validation Utility (src/utils/agent-validation.ts)

```typescript
/**
 * Validate an AgentResponse against a Zod schema
 *
 * This is a pure, side-effect-free function that validates AgentResponse
 * instances using Zod schemas. It returns a structured ValidationResult
 * with validity flag and optional error details.
 */
export function validateAgentResponse<T>(
  response: AgentResponse<T>,
  dataSchema: z.ZodTypeAny = z.unknown()
): ValidationResult {
  // Create schema for this response type
  const schema = AgentResponseSchema(dataSchema);

  // Validate response against schema (non-throwing)
  const validation = schema.safeParse(response);

  if (validation.success) {
    // Response is valid
    return { valid: true };
  }

  // Validation failed - return structured error
  return { valid: false, errors: validation.error };
}
```

### Event Type Definition (src/types/events.ts)

```typescript
export type WorkflowEvent =
  // ... other event types
  | { type: 'invalidResponse'; node: WorkflowNode; response: AgentResponse<unknown>; agentId: string; errors: z.ZodError; timestamp: number }
  // ... other event types
```

---

**PRP Version**: 1.0
**Last Updated**: 2025-01-26
**Status**: Ready for Implementation

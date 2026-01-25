---

## Goal

**Feature Goal**: Implement the `loadSkills()` method for `AnthropicProvider` class to convert skills from `Skill[]` format into system prompt text for injection into Anthropic SDK queries.

**Deliverable**: A complete `loadSkills()` method implementation in `src/providers/anthropic-provider.ts` that reads SKILL.md files, combines them with markdown formatting, stores the combined prompt in a private field, and provides a helper method to inject skills into system prompts during `execute()`.

**Success Definition**:
- `loadSkills()` method reads SKILL.md files from skill directories
- Skills are combined with markdown headers and separators
- Combined skills are stored in private `skillsPrompt` field
- `buildSystemPromptWithSkills()` helper method injects skills into system prompts
- `execute()` method is updated to use skills-enhanced system prompt
- Method throws descriptive errors for missing SKILL.md files
- Method validates SDK initialization state
- Passes all unit tests

## User Persona

**Target User**: Developer implementing the provider system (internal API user)

**Use Case**: Agent configuration includes skills that need to be loaded and injected into system prompts for specialized AI behavior

**User Journey**:
1. Agent is configured with skills (e.g., `{ name: 'math-expert', path: '/skills/math' }`)
2. `Agent` constructor calls `provider.loadSkills(skills)`
3. Provider reads SKILL.md from each skill directory
4. Skills are combined into formatted system prompt fragment
5. During `execute()`, skills are injected into the system prompt
6. AI model receives enhanced system prompt with skill instructions

**Pain Points Addressed**:
- Enables specialized AI behavior through skill-based instructions
- Provides consistent skill loading mechanism across providers
- Allows skills to be defined in external markdown files (easy to maintain)

## Why

- **Skill Injection**: Anthropic SDK lacks native skills API - skills must be converted to system prompt text
- **Modular Skills**: Skills defined as external markdown files can be maintained independently
- **Provider Parity**: Matches OpenCode's native skills capability through system prompt injection
- **Interface Compliance**: Satisfies Provider interface contract for `loadSkills()` method
- **Enhanced Prompts**: Enables agents to have specialized capabilities defined in skills

## What

Implement the `loadSkills()` method in `AnthropicProvider` class at `src/providers/anthropic-provider.ts:421-423`. The implementation should:

1. Add private `skillsPrompt: string` field to store combined skills
2. Implement `loadSkills(skills: Skill[]): Promise<void>` method that:
   - Validates SDK initialization (throws if not initialized)
   - Reads SKILL.md from each skill directory
   - Formats each skill with markdown header (`### Skill Name`)
   - Combines skills with markdown separator (`\n\n---\n\n`)
   - Stores result in `this.skillsPrompt`
3. Implement `buildSystemPromptWithSkills(baseSystemPrompt?: string): string` helper that:
   - Returns base prompt unchanged if no skills loaded
   - Returns skills-only prompt if no base prompt provided
   - Combines base prompt with skills section if both exist
4. Update `execute()` method to use `buildSystemPromptWithSkills()` for systemPrompt

### Success Criteria

- [ ] `loadSkills()` reads SKILL.md files from skill directories
- [ ] Skills are formatted with markdown headers (`### Skill Name`)
- [ ] Multiple skills are separated with `\n\n---\n\n`
- [ ] Combined skills stored in private `skillsPrompt` field
- [ ] `buildSystemPromptWithSkills()` helper method implemented
- [ ] `execute()` updated to inject skills into system prompt
- [ ] SDK initialization check throws descriptive error if not initialized
- [ ] File read errors wrapped with skill name and path context
- [ ] Empty skills array handled gracefully
- [ ] Passes unit tests

## All Needed Context

### Context Completeness Check

**"If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"** - YES

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Target file with existing class structure, execute() method to update, and loadSkills() stub
  pattern: Lines 219-223 show SDK initialization check pattern used in execute()
  pattern: Lines 232-258 show sdkOptions construction where systemPrompt is set
  pattern: Lines 386-390 show SDK initialization check in registerMCPs()
  gotcha: systemPrompt is set at line 239 - this must be updated to inject skills

- file: /home/dustin/projects/groundswell/src/types/sdk-primitives.ts
  why: Skill interface definition showing name and path properties
  pattern: Lines 55-63 define Skill interface with name: string and path: string
  critical: Skill.path points to directory containing SKILL.md file

- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts
  why: Reference test patterns for method testing, SDK initialization checks, error handling
  pattern: Lines 54-88 show SDK initialization check test pattern
  pattern: Lines 383-414 show error handling test patterns
  pattern: Lines 417-454 show execute integration test patterns

- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Shows existing system prompt handling and how options are passed
  pattern: Lines 317-318 show systemPrompt mapping to sdkOptions
  pattern: Lines 397-426 show AgentSDKOptions construction pattern

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P2M1T1S8/research/anthropic_system_prompts.md
  why: Comprehensive research on Anthropic SDK system prompt handling and skill conversion
  section: Lines 164-258 show complete skill-to-system-prompt conversion algorithm
  section: Lines 347-476 show AnthropicProvider implementation pattern
  section: Lines 854-862 show implementation checklist

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P2M1T1S8/research/skill_examples.md
  why: Example SKILL.md file format and structure
  section: Complete example showing markdown structure for skill files

- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: Anthropic SDK documentation confirming systemPrompt parameter format
  critical: systemPrompt accepts string | { type: 'preset', preset: 'claude_code', append?: string }

- url: https://docs.anthropic.com/en/api/messages
  why: Messages API documentation showing system prompt parameter usage
  critical: System prompt is passed at top level of message creation
```

### Current Codebase tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts      # TARGET FILE - lines 421-423 (loadSkills stub)
│   ├── provider-registry.ts       # Reference for provider patterns
│   └── provider-config.ts
├── types/
│   ├── providers.ts               # Provider interface with loadSkills() signature
│   ├── agent.ts
│   └── sdk-primitives.ts          # Skill interface definition (lines 55-63)
├── core/
│   ├── agent.ts                   # Reference for system prompt handling
│   └── mcp-handler.ts
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider-registermcps.test.ts    # Test patterns reference
            ├── anthropic-provider-initialize.test.ts      # Test patterns reference
            └── anthropropic-provider.test.ts               # Where loadSkills tests go
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
src/
├── providers/
│   └── anthropic-provider.ts      # MODIFY: Implement loadSkills(), add skillsPrompt field, add buildSystemPromptWithSkills(), update execute()
src/__tests__/
    └── unit/
        └── providers/
            └── anthropic-provider-loadskills.test.ts     # CREATE: Tests for loadSkills() method
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Anthropic SDK does NOT have a native skills API
// Skills must be converted to system prompt text and injected via systemPrompt parameter
// This is different from OpenCode which may have native /skills endpoint

// CRITICAL: Skill interface has path property pointing to DIRECTORY, not file
// SKILL.md file must be read from path.join(skill.path, 'SKILL.md')
// Skill.path = "/skills/math-expert" → read from "/skills/math-expert/SKILL.md"

// CRITICAL: SDK initialization check pattern used in execute() and registerMCPs()
// if (!this.sdk) { throw new Error("SDK not initialized. Call initialize() first."); }
// MUST use this pattern at start of loadSkills()

// CRITICAL: systemPrompt in execute() is set at line 239
// Before: systemPrompt: request.options.systemPrompt
// After: systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt)

// CRITICAL: Private field access in tests requires @ts-expect-error
// @ts-expect-error - Testing private property
// expect(provider.skillsPrompt).toContain('### Math Expert');

// CRITICAL: Test isolation requires ProviderRegistry._resetForTesting()
// Always call this in beforeEach() or afterEach() hooks

// CRITICAL: Vitest is the testing framework (globals enabled)
// Use describe, it, expect, beforeEach, vi without imports

// CRITICAL: File system operations use fs/promises
// import { readFile } from 'fs/promises';
// import { join } from 'path';

// CRITICAL: Error context matters - wrap file read errors with skill info
// throw new Error(`Failed to load skill '${skill.name}' from ${skill.path}: ${error}`)

// CRITICAL: Skills are combined with markdown formatting
// Each skill gets "### Skill Name\n\n{content}" format
// Skills separated by "\n\n---\n\n" (markdown horizontal rule)

// CRITICAL: buildSystemPromptWithSkills must handle three cases:
// 1. No skills loaded → return basePrompt unchanged
// 2. No base prompt → return skills-only prompt with default header
// 3. Both exist → combine with "## Available Skills" section
```

## Implementation Blueprint

### Data models and structure

Using existing types and adding one private field:

```typescript
// Existing types from src/types/sdk-primitives.ts
interface Skill {
  name: string;
  path: string;  // Directory containing SKILL.md
}

// New private field to add to AnthropicProvider
private skillsPrompt: string = '';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD private skillsPrompt field to AnthropicProvider
  - LOCATION: src/providers/anthropic-provider.ts after line 121 (after mcpServerConfig field)
  - IMPLEMENT: private skillsPrompt: string = '';
  - PURPOSE: Store combined skill content for system prompt injection
  - JSDOC: Add JSDoc explaining skills are stored for injection during execute()
  - DEPENDENCIES: None - this is the first step

Task 2: ADD import statements for file system operations
  - LOCATION: src/providers/anthropic-provider.ts at top of file (after line 55)
  - IMPLEMENT: import { readFile } from 'fs/promises';
  - IMPLEMENT: import { join } from 'path';
  - PURPOSE: Enable reading SKILL.md files from skill directories
  - DEPENDENCIES: None

Task 3: IMPLEMENT loadSkills() method in src/providers/anthropic-provider.ts
  - LOCATION: Lines 421-423 (replace existing stub comment)
  - IMPLEMENT: SDK initialization check (follow execute() pattern at lines 219-223)
  - IMPLEMENT: Loop through skills array
  - IMPLEMENT: Read SKILL.md from each skill.path
  - IMPLEMENT: Format each skill with "### {skill.name}\n\n{content}"
  - IMPLEMENT: Combine skills with "\n\n---\n\n" separator
  - IMPLEMENT: Store in this.skillsPrompt
  - IMPLEMENT: Error handling with skill context (name and path)
  - FOLLOW pattern: registerMCPs() SDK initialization check (lines 386-390)
  - NAMING: async loadSkills(skills: Skill[]): Promise<void>
  - DEPENDENCIES: Task 1 (skillsPrompt field), Task 2 (imports)

Task 4: IMPLEMENT buildSystemPromptWithSkills() helper method
  - LOCATION: src/providers/anthropic-provider.ts after loadSkills() method
  - IMPLEMENT: Handle case with no skills (return basePrompt unchanged)
  - IMPLEMENT: Handle case with no basePrompt (return skills-only prompt)
  - IMPLEMENT: Handle case with both (combine with "## Available Skills" section)
  - ACCESSIBILITY: private method (internal use only)
  - SIGNATURE: private buildSystemPromptWithSkills(baseSystemPrompt?: string): string
  - DEPENDENCIES: Task 3 (loadSkills must populate skillsPrompt)

Task 5: UPDATE execute() method to inject skills into system prompt
  - LOCATION: src/providers/anthropic-provider.ts line 239
  - BEFORE: systemPrompt: request.options.systemPrompt
  - AFTER: systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt)
  - DEPENDENCIES: Task 4 (buildSystemPromptWithSkills must exist)

Task 6: UPDATE terminate() method to clear skillsPrompt
  - LOCATION: src/providers/anthropic-provider.ts line 195 (after mcpServerConfig = null)
  - IMPLEMENT: this.skillsPrompt = '';
  - PURPOSE: Ensure clean state after termination
  - DEPENDENCIES: Task 1 (skillsPrompt field must exist)

Task 7: CREATE src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts
  - IMPLEMENT: Comprehensive test suite for loadSkills() method
  - FOLLOW pattern: anthropic-provider-registermcps.test.ts (test structure)
  - COVERAGE:
    - SDK initialization check (throws if not initialized)
    - Single skill loading (reads SKILL.md, formats correctly)
    - Multiple skills loading (combines with separators)
    - Empty skills array handling (no errors)
    - Missing SKILL.md file error handling (descriptive error)
    - buildSystemPromptWithSkills() helper tests (all three cases)
    - Integration with execute() (skills injected into system prompt)
    - Idempotent behavior (multiple loadSkills calls)
  - MOCK: vi.mock('fs/promises') for file system mocking
  - FIXTURES: Create test SKILL.md content fixtures
  - ISOLATION: Use ProviderRegistry._resetForTesting() in beforeEach/afterEach

Task 8: RUN validation gates
  - LEVEL 1: Syntax & Style (TypeScript compilation, linting)
  - LEVEL 2: Unit Tests (vitest for new loadSkills tests)
  - LEVEL 3: Integration Testing (execute() with skills)
  - EXPECTED: All validation levels pass
```

### Implementation Patterns & Key Details

```typescript
// Pattern: loadSkills() implementation following registerMCPs() structure
async loadSkills(skills: Skill[]): Promise<void> {
  // PATTERN: SDK initialization check (follow execute() at lines 219-223)
  // CRITICAL: Must check SDK is loaded before proceeding
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // Load each skill's SKILL.md content
  const skillContents: string[] = [];

  for (const skill of skills) {
    try {
      // GOTCHA: Skill.path is directory, must join with 'SKILL.md'
      const skillMdPath = join(skill.path, 'SKILL.md');
      const content = await readFile(skillMdPath, 'utf-8');

      // Format skill with markdown header
      skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
    } catch (error) {
      // PATTERN: Wrap errors with context (follow registerMCPs pattern)
      throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Combine all skills with markdown separator
  // PATTERN: Use "\n\n---\n\n" for visual clarity (horizontal rule)
  this.skillsPrompt = skillContents.join('\n\n---\n\n');
}

// Pattern: buildSystemPromptWithSkills() helper
private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
  // Case 1: No skills loaded - return base prompt unchanged
  if (!this.skillsPrompt) {
    return baseSystemPrompt ?? '';
  }

  // Case 2: No base prompt - return skills with default header
  if (!baseSystemPrompt) {
    return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
  }

  // Case 3: Both exist - combine with skills section
  return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
}

// Pattern: execute() update at line 239
// BEFORE:
//   systemPrompt: request.options.systemPrompt,
// AFTER:
//   systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),

// Pattern: terminate() update at line 195
// Add after: this.mcpServerConfig = null;
//   this.skillsPrompt = '';
```

### Integration Points

```yaml
INTERNAL:
  - provider: "src/providers/anthropic-provider.ts"
  - modifications:
      - line_range: "After 121" - Add private skillsPrompt field
      - line_range: "After 55" - Add fs/promises and path imports
      - line_range: "421-423" - Implement loadSkills() method
      - line_range: "After loadSkills" - Add buildSystemPromptWithSkills() helper
      - line_range: "239" - Update execute() systemPrompt assignment
      - line_range: "195" - Update terminate() to clear skillsPrompt

TESTING:
  - test_file: "src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts"
  - framework: "Vitest (globals enabled)"
  - pattern: "Follow anthropic-provider-registermcps.test.ts structure"
  - mocks: "vi.mock('fs/promises') for file system operations"

NO_CHANGES_TO:
  - src/types/sdk-primitives.ts (Skill interface already exists)
  - src/types/providers.ts (Provider interface already has loadSkills())
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npm run check       # TypeScript type checking
npm run lint        # ESLint validation

# Or if using uv (Python-style):
ruff check src/providers/anthropic-provider.ts --fix
mypy src/providers/anthropic-provider.ts

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test the new loadSkills() implementation specifically
npm test -- anthropic-provider-loadskills.test.ts

# Test all AnthropicProvider tests to ensure no regression
npm test -- anthropic-provider

# Full provider test suite
npm test -- providers

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test execute() method with skills integration
npm test -- anthropic-provider.test.ts -t "execute"

# Verify skills are injected into system prompt during execute
# Test should mock SDK query() and verify systemPrompt parameter includes skills

# Expected: Integration tests pass, skills properly injected
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Manual verification - create test skill directory
mkdir -p /tmp/test-skill
echo "# Test Skill

This is a test skill content." > /tmp/test-skill/SKILL.md

# Create test script: node -e "
import { AnthropicProvider } from './dist/providers/anthropic-provider.js';
import { readFile } from 'fs/promises';

async function test() {
  const p = new AnthropicProvider();
  await p.initialize();
  await p.loadSkills([{ name: 'Test', path: '/tmp/test-skill' }]);

  // Verify skillsPrompt contains skill content
  console.log('Skills loaded successfully');
  console.log('Skills prompt:', p.skillsPrompt);

  await p.terminate();
}
test();
"

# Expected: Skills loaded, formatted correctly, no errors
```

## Final Validation Checklist

### Technical Validation

- [ ] `loadSkills()` method reads SKILL.md files
- [ ] Skills formatted with `### Skill Name` headers
- [ ] Skills separated with `\n\n---\n\n`
- [ ] `buildSystemPromptWithSkills()` handles all three cases
- [ ] `execute()` updated to use skills-enhanced system prompt
- [ ] `terminate()` clears `skillsPrompt`
- [ ] SDK initialization check throws descriptive error
- [ ] File read errors wrapped with skill context
- [ ] No TypeScript errors
- [ ] No linting errors

### Feature Validation

- [ ] All success criteria from "What" section met
- [ ] Unit tests pass: `npm test -- anthropic-provider-loadskills.test.ts`
- [ ] Integration tests pass: `npm test -- anthropic-provider.test.ts`
- [ ] Skills injected into system prompt during execute()
- [ ] Empty skills array handled gracefully
- [ ] Missing SKILL.md throws descriptive error with skill name and path
- [ ] Multiple skills combined correctly

### Code Quality Validation

- [ ] Follows existing codebase patterns (SDK init check, error wrapping)
- [ ] File placement matches desired codebase tree structure
- [ ] Private field naming follows convention (`skillsPrompt`)
- [ ] JSDoc comments accurate and helpful
- [ ] Test file follows existing patterns
- [ ] Test isolation with ProviderRegistry._resetForTesting()

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] JSDoc added to new methods with examples
- [ ] @remarks tag updated if needed
- [ ] No new environment variables or dependencies
- [ ] fs/promises and path are standard Node modules (no new dependencies)

---

## Anti-Patterns to Avoid

- ❌ Don't forget SDK initialization check (must throw if not initialized)
- ❌ Don't read from skill.path directly (must join with 'SKILL.md')
- ❌ Don't let file read errors propagate without context (wrap with skill name/path)
- ❌ Don't use inconsistent markdown formatting (follow `### Name` and `\n\n---\n\n` pattern)
- ❌ Don't skip buildSystemPromptWithSkills helper (needed for clean injection)
- ❌ Don't forget to update execute() method (skills won't be injected)
- ❌ Don't forget to clear skillsPrompt in terminate() (state cleanup)
- ❌ Don't add native skills API calls (Anthropic SDK doesn't have one)
- ❌ Don't use sync file operations (must use fs/promises)
- ❌ Don't hardcode skill file name (use constant or documented pattern)
- ❌ Don't modify Skill interface (already defined in sdk-primitives.ts)
- ❌ Don't throw generic errors (include skill name and path in error messages)

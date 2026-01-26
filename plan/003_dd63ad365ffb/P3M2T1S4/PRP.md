# Product Requirement Prompt (PRP): P3.M2.T1.S4 - Implement registerMCPs() and loadSkills() methods

**Work Item**: P3.M2.T1.S4
**Task Title**: Implement registerMCPs() and loadSkills() methods
**Status**: Ready for Implementation
**Confidence Score**: 8/10

---

## Goal

**Feature Goal**: Implement `registerMCPs()` and `loadSkills()` methods for OpenCodeProvider to enable MCP server tool discovery and skills loading via system prompt injection.

**Deliverable**:
- `registerMCPs()` method in OpenCodeProvider that registers MCP servers and returns discovered tools
- `loadSkills()` method in OpenCodeProvider that loads skills via system prompt injection (OpenCode has no native skills API)
- Integration with existing OpenCode client from initialize()
- Proper error handling and SDK state validation

**Success Definition**:
- `registerMCPs()` returns `Tool[]` in MCP format (or empty array for LLM-only mode)
- `loadSkills()` stores skills as system prompt fragments for injection in execute()
- Both methods validate SDK is initialized before proceeding
- Methods throw descriptive errors when SDK is not initialized
- Integration tests pass demonstrating MCP registration and skills loading

---

## User Persona

**Target User**: Groundswell framework developer implementing provider integrations

**Use Case**: Developer needs to register MCP servers and load skills when configuring OpenCodeProvider for multi-provider LLM access

**User Journey**:
1. Developer creates OpenCodeProvider instance
2. Calls `initialize()` to start OpenCode server
3. Calls `registerMCPs(servers)` to discover available tools
4. Calls `loadSkills(skills)` to load skill definitions
5. Uses `execute()` with registered tools and loaded skills

**Pain Points Addressed**:
- OpenCode SDK has different MCP pattern than Anthropic (server-side vs client-side)
- OpenCode has no native skills API (requires system prompt injection)
- Need consistent Provider interface across different SDK architectures

---

## Why

- **Multi-Provider Support**: OpenCode provides access to 75+ LLM providers via unified interface
- **MCP Integration**: Enables tool discovery from MCP servers for OpenCode sessions
- **Skills Reuse**: Allows sharing skill definitions across Anthropic and OpenCode providers
- **Interface Consistency**: Maintains Provider interface contract despite SDK differences

---

## What

**User-Visible Behavior**:
- `registerMCPs(servers: MCPServer[]): Promise<Tool[]>` - Returns array of discovered tools
- `loadSkills(skills: Skill[]): Promise<void>` - Loads skills for system prompt injection
- Both methods throw `Error` if SDK not initialized
- Methods integrate with OpenCode client created in initialize()

### Success Criteria

- [ ] SDK initialization check throws "OpenCode provider not initialized. Call initialize() first." if SDK not loaded
- [ ] `registerMCPs()` handles empty servers array (returns empty array)
- [ ] `registerMCPs()` returns `Tool[]` format (matching Provider interface)
- [ ] `loadSkills()` handles empty skills array (no errors, clears any previous skills)
- [ ] `loadSkills()` reads SKILL.md from each skill directory
- [ ] `loadSkills()` stores formatted skills for system prompt injection
- [ ] Both methods wrap errors with context (skill name, path, etc.)
- [ ] terminate() clears any stored MCP/skills state

---

## All Needed Context

### Context Completeness Check

**Question**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Answer**: Yes - This PRP provides:
- Exact file locations to reference and modify
- Code patterns from existing implementations
- External documentation with specific URLs
- Type definitions and interfaces
- Testing patterns and validation commands
- Known gotchas and limitations

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: OpenCode SDK package documentation for MCP and session APIs
  critical: OpenCode uses client-server architecture; tools executed server-side only

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Comprehensive OpenCode SDK API research with MCP namespace patterns
  section: Sections 8 (MCP Integration) and 9 (LSP Integration)
  gotcha: OpenCode has no native skills API - must use system prompt injection

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/P3M2T1S3/opencode-tool-execution-research.md
  why: Research on OpenCode's tool execution limitations (server-side only)
  section: Section 7 (Recommended Implementation Strategy)
  critical: OpenCode executes tools server-side with NO client-side delegation mechanism

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Reference implementation for registerMCPs() and loadSkills() patterns
  pattern: Lines 486-513 (registerMCPs), Lines 538-574 (loadSkills)
  gotcha: Anthropic uses MCPHandler for tool registration; OpenCode cannot use this pattern

- file: /home/dustin/projects/groundswell/src/providers/opencode-provider.ts
  why: Target file for implementation - has stub methods at lines 507-523
  pattern: Lines 50-114 (SDK/client storage patterns), Lines 127-220 (initialize pattern)
  gotcha: Uses this.client for all SDK calls (not this.sdk directly)

- file: /home/dustin/projects/groundswell/src/types/sdk-primitives.ts
  why: MCPServer, Tool, and Skill interface definitions
  pattern: Lines 37-52 (MCPServer), Lines 10-21 (Tool), Lines 58-63 (Skill)
  critical: SKILL.md file reading pattern required for loadSkills()

- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-registermcps.test.ts
  why: Test patterns for registerMCPs() validation
  pattern: SDK initialization check (lines 54-88), empty array handling (lines 154-159)
  gotcha: Tests expect Tool[] return type with serverName__toolName naming

- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts
  why: Test patterns for loadSkills() validation including SKILL.md mocking
  pattern: Lines 106-152 (single skill), Lines 154-226 (multiple skills)
  gotcha: Must mock fs/promises.readFile for testing

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M2T1S4/research/mcp-integration-patterns.md
  why: Detailed MCP implementation patterns from codebase analysis
  section: Complete patterns for server registration, tool naming, error handling

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P3M2T1S4/research/skills-loading-patterns.md
  why: Skills loading patterns from AnthropicProvider with system prompt injection
  section: buildSystemPromptWithSkills() helper implementation
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── providers/
│   │   ├── anthropic-provider.ts          # Reference for registerMCPs/loadSkills patterns
│   │   ├── opencode-provider.ts            # TARGET FILE - Implement methods here
│   │   └── provider-registry.ts
│   ├── types/
│   │   ├── providers.ts                    # Provider interface
│   │   ├── sdk-primitives.ts               # MCPServer, Tool, Skill types
│   │   └── agent.ts
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── anthropic-provider-registermcps.test.ts  # Test patterns
│               ├── anthropic-provider-loadskills.test.ts    # Test patterns
│               ├── opencode-provider-initialize.test.ts
│               ├── opencode-provider-terminate.test.ts
│               └── opencode-provider-execute.test.ts
```

### Desired Codebase Tree with Files to be Added

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── providers/
│   │   └── opencode-provider.ts            # MODIFY: Add registerMCPs(), loadSkills()
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── opencode-provider-registermcps.test.ts  # NEW: Test file
│               └── opencode-provider-loadskills.test.ts    # NEW: Test file
```

### Known Gotchas of OpenCode SDK

```typescript
// CRITICAL: OpenCode executes tools server-side only
// No client-side tool delegation mechanism exists
// OpenCodeProvider operates in LLM-only mode (tools disabled in execute())

// CRITICAL: OpenCode has NO native skills API
// Skills must be loaded via system prompt injection (like Anthropic)
// SKILL.md files must be read using fs/promises.readFile

// CRITICAL: OpenCode uses client.session.prompt() for execution
// NOT the same as Anthropic's query() pattern
// Session creation required: client.session.create()

// CRITICAL: Tool discovery via client.tool.list() and client.tool.ids()
// Returns RequestResult wrapper: { data, error, status }
// Tools are server-side managed, not registered via SDK

// PATTERN: SDK initialization check required
// if (!this.client) {
//   throw new Error("OpenCode provider not initialized. Call initialize() first.");
// }

// GOTCHA: MCP servers managed by OpenCode server, not client SDK
// client.mcp.add() adds server configuration
// client.mcp.connect() connects to server
// No direct tool registration like Anthropic's createSdkMcpServer()
```

---

## Implementation Blueprint

### Data Models and Structure

**Key Types** (from `src/types/sdk-primitives.ts`):

```typescript
// MCPServer - MCP server configuration
interface MCPServer {
  name: string;
  version?: string;
  transport: 'stdio' | 'inprocess';
  command?: string;
  args?: string[];
  tools?: Tool[];
  env?: Record<string, string>;
}

// Tool - Tool definition in MCP format
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Skill - Skill definition for loading
interface Skill {
  name: string;
  path: string;  // Directory containing SKILL.md
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UNDERSTAND OpenCode SDK Limitations
  - RESEARCH: OpenCode tool execution is server-side only (no client delegation)
  - READ: docs/P3M2T1S3/opencode-tool-execution-research.md Section 7
  - ACCEPT: OpenCodeProvider operates in LLM-only mode (tools disabled)
  - IMPLIES: registerMCPs() will return empty array or no-op

Task 2: IMPLEMENT registerMCPs() method stub
  - LOCATION: src/providers/opencode-provider.ts lines 507-510
  - REPLACE: Stub with implementation that returns empty array
  - PATTERN: Follow AnthropicProvider SDK initialization check (lines 488-491)
  - NAMING: async registerMCPs(servers: MCPServer[]): Promise<Tool[]>
  - LOGIC:
    1. Check if (this.client) exists, throw if not
    2. Return empty array (LLM-only mode - no tool registration)
    3. Document LLM-only limitation in JSDoc
  - DEPENDENCIES: None (uses existing this.client from initialize)

Task 3: IMPLEMENT loadSkills() method
  - LOCATION: src/providers/opencode-provider.ts lines 520-523
  - REPLACE: Stub with implementation for system prompt injection
  - PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts lines 538-574)
  - NAMING: async loadSkills(skills: Skill[]): Promise<void>
  - IMPORTS: Add 'import { readFile } from "fs/promises";' and 'import { join } from "path";'
  - PRIVATE FIELD: Add 'private skillsPrompt: string = "";' after line 113
  - LOGIC:
    1. Check if (this.client) exists, throw if not
    2. Handle empty skills array (set this.skillsPrompt = ''; return)
    3. For each skill: read join(skill.path, 'SKILL.md')
    4. Format with '### ${skill.name}\\n\\n${content.trim()}'
    5. Join with '\\n\\n---\\n\\n'
    6. Store in this.skillsPrompt
    7. Wrap errors with skill name and path context
  - DEPENDENCIES: Task 2 (same pattern for SDK check)

Task 4: IMPLEMENT buildSystemPromptWithSkills() helper
  - LOCATION: New private method in OpenCodeProvider class
  - PATTERN: Follow AnthropicProvider pattern (anthropic-provider.ts lines 591-621)
  - NAMING: private buildSystemPromptWithSkills(baseSystemPrompt?: string): string
  - LOGIC:
    1. If !this.skillsPrompt, return baseSystemPrompt ?? ''
    2. If !baseSystemPrompt, return skills-only with default header
    3. If both exist, combine with "## Available Skills" section
  - DEPENDENCIES: Task 3 (requires this.skillsPrompt field)

Task 5: INTEGRATE skills into execute() method
  - LOCATION: src/providers/opencode-provider.ts line 426 (session.prompt body)
  - MODIFY: Add system prompt with skills to session.prompt() call
  - PATTERN: Follow buildSystemPromptWithSkills() usage in AnthropicProvider (line 296)
  - LOGIC:
    1. Call this.buildSystemPromptWithSkills(request.options.systemPrompt)
    2. Add result to session.prompt body as 'system' field
    3. Ensure skills are injected into all prompts
  - DEPENDENCIES: Task 4 (requires buildSystemPromptWithSkills helper)

Task 6: UPDATE terminate() to clear skillsPrompt
  - LOCATION: src/providers/opencode-provider.ts lines 231-259
  - MODIFY: Add 'this.skillsPrompt = "";' after line 252 (after client = null)
  - PATTERN: Follow AnthropicProvider pattern (line 221)
  - LOGIC:
    1. Clear skillsPrompt field
    2. Ensures clean state after terminate
  - DEPENDENCIES: Task 3 (requires this.skillsPrompt field)

Task 7: CREATE opencode-provider-registermcps.test.ts
  - LOCATION: src/__tests__/unit/providers/opencode-provider-registermcps.test.ts
  - PATTERN: Follow anthropic-provider-registermcps.test.ts structure
  - TESTS:
    1. SDK initialization check (throws if not initialized)
    2. Empty servers array (returns empty array)
    3. Returns Tool[] type (empty array for LLM-only mode)
    4. terminate() integration (verify idempotent)
  - FIXTURES: createTestTool(), createTestServer() functions
  - DEPENDENCIES: Task 2 (requires registerMCPs implementation)

Task 8: CREATE opencode-provider-loadskills.test.ts
  - LOCATION: src/__tests__/unit/providers/opencode-provider-loadskills.test.ts
  - PATTERN: Follow anthropic-provider-loadskills.test.ts structure
  - MOCKS: vi.mock('fs/promises') for readFile
  - TESTS:
    1. SDK initialization check (throws if not initialized)
    2. Single skill loading (reads SKILL.md, formats correctly)
    3. Multiple skills loading (combines with separators)
    4. Empty skills array (clears skillsPrompt)
    5. Error handling (descriptive errors with skill context)
    6. buildSystemPromptWithSkills() helper (all three cases)
    7. terminate() clears skillsPrompt
  - FIXTURES: createTestSkill(), mockSkillContent objects
  - DEPENDENCIES: Tasks 3-6 (requires loadSkills implementation)

Task 9: UPDATE JSDoc documentation
  - LOCATION: src/providers/opencode-provider.ts class header and method docs
  - PATTERN: Follow AnthropicProvider JSDoc style (lines 1-36)
  - UPDATES:
    1. Document LLM-only mode limitation in class header
    2. Document registerMCPs() returns empty array
    3. Document loadSkills() uses system prompt injection
    4. Add @remarks sections explaining OpenCode constraints
  - DEPENDENCIES: Tasks 1-8 (complete implementation)
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: SDK initialization check (CRITICAL - all methods must do this)
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  // CRITICAL: Validate client is initialized before attempting to use it
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }
  // ... rest of implementation
}

// PATTERN: Empty input handling (graceful, no errors)
async loadSkills(skills: Skill[]): Promise<void> {
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }

  // Handle empty skills array
  if (skills.length === 0) {
    this.skillsPrompt = '';
    return;
  }
  // ... rest of implementation
}

// PATTERN: SKILL.md file reading with error wrapping
import { readFile } from 'fs/promises';
import { join } from 'path';

for (const skill of skills) {
  try {
    // GOTCHA: Skill.path is directory, must join with 'SKILL.md'
    const skillMdPath = join(skill.path, 'SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');

    // Format skill with markdown header
    skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
  } catch (error) {
    // PATTERN: Wrap errors with context
    throw new Error(
      `Failed to load skill '${skill.name}' from ${skill.path}: ` +
      `${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// PATTERN: Combine skills with markdown separator
this.skillsPrompt = skillContents.join('\n\n---\n\n');

// PATTERN: buildSystemPromptWithSkills() three-case logic
private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
  // Case 1: No skills loaded
  if (!this.skillsPrompt) {
    return baseSystemPrompt ?? '';
  }

  // Case 2: No base prompt
  if (!baseSystemPrompt) {
    return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
  }

  // Case 3: Both exist
  return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
}

// PATTERN: LLM-only mode for registerMCPs()
async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }

  // LLM-only mode: no tool registration
  // OpenCode executes tools server-side with no client-side delegation
  // Tools are managed by Groundswell's MCPHandler, not OpenCode
  return [];
}
```

### Integration Points

```yaml
OPENCODE SDK:
  - use: client.session.prompt({ body: { system: string } })
  - pattern: Inject skillsPrompt via 'system' field in session prompt
  - gotcha: System prompt passed to session.prompt(), not query()

FILE SYSTEM:
  - import: { readFile } from 'fs/promises'
  - import: { join } from 'path'
  - pattern: Read SKILL.md from skill.path directory
  - test: Mock with vi.mock('fs/promises')

EXECUTE METHOD:
  - modify: src/providers/opencode-provider.ts execute() method
  - add: system: this.buildSystemPromptWithSkills(request.options.systemPrompt)
  - location: session.prompt() body object (around line 426)

TERMINATE METHOD:
  - modify: src/providers/opencode-provider.ts terminate() method
  - add: this.skillsPrompt = '';
  - location: After client = null (after line 252)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file creation - fix before proceeding
pnpm exec eslint src/providers/opencode-provider.ts --fix  # Auto-format and fix linting
pnpm exec tsc --noEmit src/providers/opencode-provider.ts    # Type checking
pnpm exec prettier --write src/providers/opencode-provider.ts  # Format code

# Project-wide validation
pnpm exec eslint src/ --fix
pnpm exec tsc --noEmit
pnpm exec prettier --write src/

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test each method implementation
pnpm test src/__tests__/unit/providers/opencode-provider-registermcps.test.ts
pnpm test src/__tests__/unit/providers/opencode-provider-loadskills.test.ts

# Full provider test suite
pnpm test src/__tests__/unit/providers/

# Coverage validation (if coverage tools available)
pnpm test src/__tests__/unit/providers/ --coverage

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Manual integration test (requires OpenCode SDK installed)
cd /home/dustin/projects/groundswell
cat > test-opencode-integration.ts << 'EOF'
import { OpenCodeProvider } from './src/providers/opencode-provider.js';

async function testIntegration() {
  const provider = new OpenCodeProvider();

  // Test initialize
  await provider.initialize();
  console.log('✓ Initialize succeeded');

  // Test registerMCPs (should return empty array)
  const tools = await provider.registerMCPs([]);
  console.log('✓ registerMCPs returned:', tools);

  // Test loadSkills
  await provider.loadSkills([]);
  console.log('✓ loadSkills succeeded');

  // Test terminate
  await provider.terminate();
  console.log('✓ Terminate succeeded');
}

testIntegration().catch(console.error);
EOF

pnpm tsx test-opencode-integration.ts

# Expected: All integration steps complete without errors
```

### Level 4: Provider Interface Validation

```bash
# Verify Provider interface compliance
cat > verify-provider-interface.ts << 'EOF'
import { OpenCodeProvider } from './src/providers/opencode-provider.js';
import type { Provider } from './src/types/providers.js';

// Type check: OpenCodeProvider should satisfy Provider interface
const provider: Provider = new OpenCodeProvider();
console.log('✓ Provider interface satisfied');

// Verify methods exist
console.log('✓ registerMCPs exists:', typeof provider.registerMCPs === 'function');
console.log('✓ loadSkills exists:', typeof provider.loadSkills === 'function');
EOF

pnpm tsx verify-provider-interface.ts

# Expected: All type checks pass, Provider interface satisfied
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `pnpm test src/__tests__/unit/providers/`
- [ ] No linting errors: `pnpm exec eslint src/providers/opencode-provider.ts`
- [ ] No type errors: `pnpm exec tsc --noEmit`
- [ ] No formatting issues: `pnpm exec prettier --check src/providers/opencode-provider.ts`

### Feature Validation

- [ ] SDK initialization check throws descriptive error if not initialized
- [ ] `registerMCPs()` returns empty `Tool[]` (LLM-only mode)
- [ ] `loadSkills()` reads SKILL.md files correctly
- [ ] `loadSkills()` formats skills with markdown headers
- [ ] `buildSystemPromptWithSkills()` handles all three cases
- [ ] Skills injected into execute() via system prompt
- [ ] `terminate()` clears skillsPrompt field

### Code Quality Validation

- [ ] Follows existing AnthropicProvider patterns
- [ ] File placement matches desired codebase tree
- [ ] JSDoc comments added for all methods
- [ ] LLM-only mode limitation documented
- [ ] Error messages include context (skill name, path)

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable/function names
- [ ] JSDoc explains LLM-only mode limitation
- [ ] Gotchas documented in method comments
- [ ] Research files stored in plan/003_dd63ad365ffb/P3M2T1S4/research/

---

## Anti-Patterns to Avoid

- ❌ Don't try to implement actual MCP tool registration (OpenCode limitation)
- ❌ Don't use MCPHandler pattern (doesn't work with OpenCode architecture)
- ❌ Don't skip SDK initialization check (all methods must validate)
- ❌ Don't forget to clear skillsPrompt in terminate()
- ❌ Don't use sync functions for async operations
- ❌ Don't catch all exceptions - be specific with error types
- ❌ Don't hardcode skill paths - use join(skill.path, 'SKILL.md')
- ❌ Don't forget to mock fs/promises in tests

---

## Implementation Notes

### OpenCode Architecture Constraints

1. **LLM-Only Mode**: OpenCode executes tools server-side with no client delegation mechanism. The `registerMCPs()` method returns an empty array to satisfy the Provider interface while documenting this limitation.

2. **Skills via System Prompts**: OpenCode has no native skills API. The `loadSkills()` method reads SKILL.md files and stores formatted content for injection into system prompts during execute().

3. **Session-Based Execution**: OpenCode uses `client.session.prompt()` for execution, not a query() pattern like Anthropic. Skills are injected via the `system` field in the prompt body.

### Testing Strategy

1. **Mock fs/promises**: The loadSkills() tests must mock readFile to avoid actual file I/O
2. **SDK Mock**: Consider mocking the OpenCode SDK for faster, more reliable tests
3. **Pattern Matching**: Follow existing AnthropicProvider test patterns for consistency

### Error Handling

All methods should wrap errors with context:
- Include skill name and path in error messages
- Preserve original error messages from underlying operations
- Use descriptive error messages for SDK initialization failures

---

## Confidence Score

**8/10** - High confidence for one-pass implementation success

**Rationale**:
- Clear reference implementation in AnthropicProvider
- Comprehensive research documentation available
- Well-defined type system and interfaces
- Established testing patterns
- Known limitations documented (LLM-only mode)

**Risk Factors**:
- OpenCode SDK architectural differences from Anthropic
- No native skills API requires system prompt workaround
- File I/O testing requires careful mocking

---

## Research Artifacts

The following research files are stored in `plan/003_dd63ad365ffb/P3M2T1S4/research/`:

1. **mcp-integration-patterns.md** - Detailed MCP patterns from codebase analysis
2. **skills-loading-patterns.md** - Skills loading patterns with system prompt injection
3. **opencode-sdk-api-summary.md** - OpenCode SDK API reference for MCP and skills

These files provide detailed context extracted during the research phase and should be referenced during implementation.

---

**End of PRP**

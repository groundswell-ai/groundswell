# PRP: Define ProviderId Type and ProviderCapabilities Interface

## Goal

**Feature Goal**: Create foundational type definitions for the multi-provider system, enabling type-safe provider identification and capability declaration.

**Deliverable**: `src/types/providers.ts` file exporting `ProviderId` union type and `ProviderCapabilities` interface, integrated into the barrel export system.

**Success Definition**:
- `ProviderId` and `ProviderCapabilities` are exported from `src/types/providers.ts`
- Types are exported from `src/types/index.ts`
- No TypeScript compilation errors
- Types match PRD Section 7.2 and 7.4 specifications exactly

## Why

- **Foundation for Multi-Provider System**: These types are the bedrock for all provider-related code in Phase 1 (P1) and subsequent phases
- **Type Safety**: Ensures compile-time validation of provider identifiers and capability flags
- **Developer Experience**: Provides clear, documented contracts for provider implementations
- **Integration Point**: These types will be used by Agent, Provider Registry, and individual provider implementations

## What

Create type definitions for provider identification and capabilities.

### Success Criteria

- [ ] `ProviderId` type is defined as `'anthropic' | 'opencode'` (PRD 7.2)
- [ ] `ProviderCapabilities` interface has all 6 boolean flags (PRD 7.4)
- [ ] Types are exported from `src/types/providers.ts`
- [ ] Types are re-exported in `src/types/index.ts`
- [ ] All TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Proper JSDoc documentation on both types

## All Needed Context

### Context Completeness Check

**No Prior Knowledge Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

- **Where to put the file**: `src/types/providers.ts` (new file)
- **What patterns to follow**: Union types from `src/types/logging.ts`, interfaces from `src/types/sdk-primitives.ts`
- **How to export**: Add to `src/types/index.ts` following the grouped export pattern
- **Import extensions**: Must use `.js` extensions (TypeScript `moduleResolution: bundler`)
- **JSDoc style**: Follow existing patterns with summary line and property comments

### Documentation & References

```yaml
# MUST READ - PRD Specification
- file: /home/dustin/projects/groundswell/PRD.md
  why: Contains authoritative specification for ProviderId (7.2) and ProviderCapabilities (7.4)
  critical: Section 7.4 lines 294-313 define exact capability flags and their meanings
  section: "## 7.2 ProviderId" and "## 7.4 ProviderCapabilities"

# MUST READ - Codebase Type Patterns
- file: /home/dustin/projects/groundswell/src/types/logging.ts
  why: Shows exact pattern for union type definition (LogLevel)
  pattern: Multi-line union with pipe prefix, JSDoc summary comment
  gotcha: Use `.js` extension for imports even though source is `.ts`

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: Shows union type pattern for status enums (WorkflowStatus)
  pattern: Multi-line format with `|` prefix on continuation lines
  gotcha: Import dependencies with `.js` extensions

- file: /home/dustin/projects/groundswell/src/types/sdk-primitives.ts
  why: Shows interface pattern with boolean flags and JSDoc property comments
  pattern: Interface with `/** */` property documentation
  gotcha: All property comments use `/** */` format

- file: /home/dustin/projects/groundswell/src/types/index.ts
  why: Shows barrel export pattern - where and how to add new type exports
  pattern: Grouped exports with section comments, explicit type names
  gotcha: Must add to appropriate section (will create new "Provider types" section)

# EXTERNAL RESEARCH
- url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types
  why: TypeScript union type best practices
  critical: String literal unions are preferred over enums for small sets

- url: https://www.typescriptlang.org/docs/handbook/2/objects.html#interface-extensions
  why: TypeScript interface definition patterns
  critical: Optional properties marked with `?`, readonly with `readonly` keyword

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
  why: Type manipulation and utility types
  critical: Understanding `readonly`, optional properties, and exact types

# INTERNAL RESEARCH
- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M1T1S1/research/codebase-patterns.md
  why: Detailed analysis of existing type patterns in this codebase
  section: "Type File Organization", "Pattern: Union Type Definition"

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M1T1S1/research/typescript-best-practices.md
  why: TypeScript best practices specific to this project
  section: "Union Types vs Enums", "Interface Naming Conventions"

- docfile: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M1T1S1/research/prd-reference.md
  why: Extracted PRD specifications for quick reference
  section: "Section 7.2 - ProviderId Type", "Section 7.4 - ProviderCapabilities"
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── agent.ts           (AgentConfig, AgentResponse, etc.)
│   ├── workflow.ts        (WorkflowStatus, WorkflowNode)
│   ├── logging.ts         (LogLevel, LogEntry)
│   ├── error.ts           (WorkflowError)
│   ├── error-strategy.ts  (ErrorMergeStrategy)
│   ├── events.ts          (WorkflowEvent)
│   ├── observer.ts        (WorkflowObserver)
│   ├── snapshot.ts        (SerializedWorkflowState)
│   ├── decorators.ts      (StepOptions, TaskOptions)
│   ├── prompt.ts          (PromptConfig)
│   ├── reflection.ts      (ReflectionConfig, ReflectionAPI)
│   ├── sdk-primitives.ts  (Tool, MCPServer, Skill, etc.)
│   └── index.ts           (barrel exports)
├── core/
│   ├── agent.ts           (Agent class - currently Anthropic-only)
│   └── mcp-handler.ts     (MCP transport abstraction)
└── index.ts               (main barrel export)
```

### Desired Codebase Tree (After Implementation)

```bash
src/
├── types/
│   ├── agent.ts
│   ├── workflow.ts
│   ├── logging.ts
│   ├── error.ts
│   ├── error-strategy.ts
│   ├── events.ts
│   ├── observer.ts
│   ├── snapshot.ts
│   ├── decorators.ts
│   ├── prompt.ts
│   ├── reflection.ts
│   ├── sdk-primitives.ts
│   ├── providers.ts       # NEW: ProviderId, ProviderCapabilities
│   └── index.ts           # MODIFIED: Add provider type exports
└── index.ts
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript moduleResolution: bundler requires .js extensions
// Even though source files are .ts, imports must use .js
import type { LogLevel } from './logging.js';  // CORRECT
import type { LogLevel } from './logging';     // WRONG - will cause error

// CRITICAL: Union type formatting follows specific pattern
// Multi-line format with pipe prefix on continuation lines
export type ProviderId =
  | 'anthropic'
  | 'opencode';

// NOT THIS (single line is acceptable but multi-line is preferred):
export type ProviderId = 'anthropic' | 'opencode';

// CRITICAL: JSDoc comment style
// Every exported type/interface must have a summary comment
// Every interface property must have a `/** */` comment
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  // NOT: // MCP server (wrong style)
}

// CRITICAL: Barrel export pattern
// Must add to src/types/index.ts with explicit type names
// Section comment should precede the exports
// Provider types
export type { ProviderId, ProviderCapabilities } from './providers.js';

// NOT THIS (wildcard exports lose tree-shaking):
export * from './providers.js';

// CRITICAL: Interface property names from PRD are lowercase
// Do NOT change to camelCase - must match PRD exactly
mcp: boolean;        // CORRECT - matches PRD
skills: boolean;     // CORRECT - matches PRD
```

## Implementation Blueprint

### Data Models and Structure

```typescript
// src/types/providers.ts

/**
 * Provider identifier union type
 * Defines supported Agent SDK providers
 */
export type ProviderId =
  | 'anthropic'
  | 'opencode';

/**
 * Provider capability flags
 * Indicates which features a provider supports
 */
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE src/types/providers.ts
  - IMPLEMENT: ProviderId union type with 'anthropic' | 'opencode'
  - IMPLEMENT: ProviderCapabilities interface with 6 boolean flags
  - FOLLOW pattern: src/types/logging.ts (union type formatting)
  - FOLLOW pattern: src/types/sdk-primitives.ts (interface JSDoc style)
  - NAMING: PascalCase for types, lowercase for interface properties
  - PLACEMENT: New file in src/types/
  - FORMAT: Multi-line union with `|` prefix on continuation lines
  - JSDOC: Summary comment for type, `/** */` for each property

Task 2: MODIFY src/types/index.ts
  - ADD: New section "// Provider types" after SDK primitive types section
  - ADD: export type { ProviderId, ProviderCapabilities } from './providers.js';
  - FIND pattern: Existing section grouping (lines 11-24)
  - PRESERVE: All existing exports and section structure
  - PLACEMENT: Between SDK primitive types and Agent types sections
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN: Multi-line union type definition
// Source: src/types/workflow.ts:4-9
// ============================================

/**
 * Workflow status representing the current execution state
 */
export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

// APPLY TO ProviderId:
/**
 * Provider identifier for supported Agent SDK providers
 */
export type ProviderId =
  | 'anthropic'
  | 'opencode';

// ============================================
// PATTERN: Interface with JSDoc property comments
// Source: src/types/sdk-primitives.ts:37-52
// ============================================

/**
 * MCP Server configuration
 * Supports stdio and inprocess transports
 */
export interface MCPServer {
  /** Server name for identification */
  name: string;
  /** Server version (optional) */
  version?: string;
  /** Transport type */
  transport: 'stdio' | 'inprocess';
}

// APPLY TO ProviderCapabilities:
/**
 * Provider capability flags
 * Indicates which features a provider supports
 */
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}

// ============================================
// PATTERN: Barrel export with section grouping
// Source: src/types/index.ts:11-24
// ============================================

// SDK primitive types
export type {
  Tool,
  ToolResult,
  MCPServer,
  Skill,
  HookHandler,
  PreToolUseContext,
  PostToolUseContext,
  SessionStartContext,
  SessionEndContext,
  AgentHooks,
  TokenUsage,
} from './sdk-primitives.js';

// APPLY for provider types (insert after SDK primitives, before Agent types):
// Provider types
export type { ProviderId, ProviderCapabilities } from './providers.js';
```

### Integration Points

```yaml
FILES:
  - create: src/types/providers.ts
  - modify: src/types/index.ts
    - insert_after: line 24 (end of SDK primitive types section)
    - add_section: "// Provider types"
    - add_export: "export type { ProviderId, ProviderCapabilities } from './providers.js';"

NO_CHANGES_TO:
  - src/core/agent.ts (will use these types in later tasks)
  - src/core/mcp-handler.ts (unchanged)
  - tsconfig.json (configuration already supports this)
  - Any other source files (this is foundational type definition only)
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after file creation - fix before proceeding
npx tsc --noEmit                  # Type check without emitting files
npx tsc --noEmit src/types/providers.ts  # Type check specific file

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.

# Common errors to watch for:
# - "Cannot find module './providers.ts'" - means you need .js extension
# - "Missing JSDoc comment" - add summary comments
# - "Property name mismatch" - check PRD for exact property names
```

### Level 2: Type Checking (Component Validation)

```bash
# Verify types are properly exported
npx tsc --noEmit src/types/index.ts

# Verify main barrel export works
npx tsc --noEmit src/index.ts

# Test import from outside (simulates consumer usage)
node -e "
  const { ProviderId, ProviderCapabilities } = require('./dist/index.js');
  console.log('Types exported successfully');
"

# Expected: All type checks pass, no "Cannot find module" errors
```

### Level 3: Integration Testing (System Validation)

```bash
# Build the project
npm run build

# Verify types are in declaration files
grep "ProviderId" dist/types/providers.d.ts
grep "ProviderCapabilities" dist/types/providers.d.ts

# Verify barrel export includes new types
grep "ProviderId" dist/types/index.d.ts
grep "ProviderCapabilities" dist/types/index.d.ts

# Test type usage (create temporary test file)
cat > /tmp/test-provider-types.ts << 'EOF'
import type { ProviderId, ProviderCapabilities } from './src/index.js';

const id: ProviderId = 'anthropic';  // Should compile
const badId: ProviderId = 'invalid';  // Should error

const caps: ProviderCapabilities = {
  mcp: true,
  skills: true,
  lsp: false,
  streaming: true,
  sessions: false,
  extendedThinking: false,
};
EOF

npx tsc --noEmit /tmp/test-provider-types.ts

# Expected:
# - Build succeeds with no errors
# - Type declarations include ProviderId and ProviderCapabilities
# - Test file shows id compiles, badId produces error
```

### Level 4: Manual Inspection (Code Quality)

```bash
# Verify formatting matches codebase style
cat src/types/providers.ts

# Checklist:
# [ ] File has empty line at end
# [ ] Multi-line union uses `|` prefix on continuation lines
# [ ] JSDoc summary comment for each type
# [ ] JSDoc `/** */` comment for each interface property
# [ ] No trailing whitespace
# [ ] Consistent indentation (2 spaces)

# Verify barrel export placement
cat src/types/index.ts | grep -A 2 -B 2 "Provider types"

# Expected:
# - Section comment appears before export
# - Export is in logical position (after SDK primitives, before Agent types)
# - Explicit type names (not wildcard export)
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Type declarations include new types
- [ ] No linting errors (if using ESLint)

### Feature Validation

- [ ] `ProviderId` is `'anthropic' | 'opencode'` (exact PRD match)
- [ ] `ProviderCapabilities` has all 6 boolean flags (mcp, skills, lsp, streaming, sessions, extendedThinking)
- [ ] Property names match PRD exactly (lowercase, camelCase for extendedThinking)
- [ ] JSDoc comments present on types and properties
- [ ] Types exported from `src/types/providers.ts`
- [ ] Types re-exported in `src/types/index.ts`

### Code Quality Validation

- [ ] Multi-line union format with `|` prefix
- [ ] Follows existing codebase patterns (LogLevel, WorkflowStatus)
- [ ] File placement matches desired codebase tree
- [ ] Import/export uses `.js` extensions
- [ ] Barrel export has section comment
- [ ] No wildcard exports (explicit type names)

### Documentation & Integration

- [ ] Code is self-documenting with clear type names
- [ ] JSDoc comments explain purpose of each capability flag
- [ ] No additional dependencies required

## Anti-Patterns to Avoid

- ❌ **Don't use single-line union format** - Multi-line with `|` prefix is preferred
- ❌ **Don't skip JSDoc comments** - Every type and property needs documentation
- ❌ **Don't use `.ts` in imports** - Must use `.js` extensions
- ❌ **Don't use wildcard exports** - Explicit type names for tree-shaking
- ❌ **Don't change property names** - Must match PRD exactly (lowercase)
- ❌ **Don't add extra properties** - Only what PRD specifies (6 flags only)
- ❌ **Don't use `readonly` on properties** - PRD doesn't specify readonly
- ❌ **Don't make properties optional** - All 6 flags are required boolean
- ❌ **Don't add enum or const object** - String literal union is correct pattern
- ❌ **Don't modify other type files** - Only create `providers.ts` and modify `index.ts`

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Validation**:
- This PRP provides exact file paths, line patterns, and code examples
- All research findings are documented and accessible
- No ambiguity in type definitions - exact PRD match required
- Existing codebase patterns are thoroughly analyzed
- Common gotchas are explicitly documented

**Risk Factors**: None identified
- This is a pure type definition task with no runtime logic
- No external dependencies required
- No integration complexity (foundational types only)

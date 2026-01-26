# Product Requirement Prompt (PRP): OpenCode Provider Removal

**PRP ID:** PRP-001-OpenCode-Removal
**Work Item:** P1.M3.T1.S2 - Execute OpenCode provider resolution
**Decision:** Option C - Remove Provider
**Status:** READY FOR IMPLEMENTATION
**Version:** 1.0
**Date:** 2026-01-26

---

## Goal

**Feature Goal**: Deprecate and remove the OpenCode provider from Groundswell, resolving the PRD feature parity violation while maintaining codebase quality and user trust.

**Deliverable**: A complete provider deprecation and removal implementation including:
- Deprecation warnings in current version (v1.x)
- Comprehensive migration guide
- Updated PRD and documentation
- Complete provider removal in v2.0.0
- All tests updated and passing

**Success Definition**:
- [ ] Deprecation warnings display when OpenCodeProvider is instantiated
- [ ] Migration guide published and accessible
- [ ] PRD.md updated to remove all multi-provider/OpenCode references
- [ ] ProviderId type updated to single-provider ('anthropic' only)
- [ ] All documentation files updated consistently
- [ ] Existing OpenCode tests deprecated with warnings
- [ ] All validation gates pass (tests, linting, type checking)
- [ ] Zero breaking changes before v2.0.0

---

## User Persona

**Target User**: Groundswell library consumers (developers using the Agent SDK)

**Use Case**: Developers currently using or considering OpenCode provider for multi-provider LLM access

**User Journey**:
1. Developer reads documentation and sees OpenCode deprecation notice
2. Developer reviews migration guide for AnthropicProvider alternative
3. Developer updates code to use AnthropicProvider
4. Developer validates migration with updated tests
5. Developer deploys migrated code before v2.0.0 release

**Pain Points Addressed**:
- **Confusion**: Current multi-provider promise not delivered (OpenCode lacks MCP/LSP)
- **Trust**: Honest communication about capabilities vs. marketing claims
- **Migration**: Clear path from partial-implementation to full-featured provider
- **Future-proof**: Single-provider focus enables higher quality AnthropicProvider

---

## Why

- **PRD Compliance**: OpenCode provider violates Section 7.4 requirements (missing MCP and LSP capabilities)
- **Architectural Mismatch**: OpenCode SDK is client-server library requiring external process, not standalone like Anthropic SDK
- **Technical Debt**: Maintaining non-compliant provider costs ~$14K/year (maintenance + support)
- **User Trust**: Honest communication about capabilities builds trust more than over-promising
- **Strategic Focus**: Single-provider allows focused excellence on AnthropicProvider quality
- **Decision Source**: Approved via DEC-001 decision analysis document (Option C: Remove Provider)

---

## What

Remove the OpenCode provider through a two-phase process:

### Phase 1: Deprecation (Current Version v1.x)
- Add `@deprecated` JSDoc annotations to OpenCodeProvider class
- Add runtime console.warn() deprecation message in `initialize()` method
- Publish migration guide with before/after code examples
- Update PRD.md to reflect single-provider support
- Update all documentation to remove OpenCode references
- Deprecate (not remove) existing tests with warning comments

### Phase 2: Removal (Next Major v2.0.0)
- Delete `src/providers/opencode-provider.ts` (979 lines)
- Remove 'opencode' from `ProviderId` type in `src/types/providers.ts`
- Delete all OpenCode test files (7 test files)
- Remove `@opencode-ai/sdk` dependency from package.json
- Update all imports across codebase
- Final documentation cleanup

### Success Criteria

- [ ] Deprecation warning displays on OpenCodeProvider instantiation (v1.x)
- [ ] Migration guide accessible at `/docs/migration-opencode-removal.md`
- [ ] PRD.md contains zero OpenCode/multi-provider references
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] OpenCodeProvider completely removed in v2.0.0

---

## All Needed Context

### Context Completeness Check

✅ **Passes "No Prior Knowledge" test**: A developer unfamiliar with this codebase has everything needed to implement this PRP successfully.

### Documentation & References

```yaml
# MUST READ - Decision Document
- url: file:///home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/opencode-decision.md
  why: Complete decision analysis with Option C recommendation and rationale
  critical: Option C chosen - Remove Provider. Architectural mismatch fundamental.
  section: Executive Summary (lines 1-50), Recommendation (lines 500-600), Implementation Timeline (lines 650-700)

# MUST READ - Deprecation Best Practices
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M3T1S2/research/deprecation-patterns-research.md
  why: Comprehensive TypeScript deprecation patterns, JSDoc @deprecated syntax, runtime warnings, migration guides
  critical: Use @deprecated JSDoc + console.warn() pattern. One-time warning flag required.
  section: TypeScript Deprecation Patterns (lines 21-253), JavaScript Runtime Warnings (lines 257-418), Migration Guide Templates (lines 593-767)

# MUST READ - Test Patterns
- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M3T1S2/research/test-patterns-analysis.md
  why: Vitest test framework patterns, provider test structure, console.warn mocking
  critical: Use vi.spyOn(console, 'warn').mockImplementation(() => {}) for testing warnings
  section: Test Framework Configuration (lines 1-50), Console Mock for Warnings (lines 340-350)

# MUST MODIFY - OpenCodeProvider Implementation
- file: /home/dustin/projects/groundswell/src/providers/opencode-provider.ts
  why: Add deprecation to class and initialize() method
  pattern: Add @deprecated JSDoc to class (line 76), add console.warn in initialize() (line 164)
  gotcha: Use one-time warning flag (private static property) to avoid spam
  placement: Class docstring, initialize() method after idempotent check

# MUST MODIFY - Provider Type Definition
- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Remove 'opencode' from ProviderId union type
  pattern: Change line 11 from `| 'opencode';` to single-line type
  gotcha: This is a breaking change - only for v2.0.0, NOT v1.x
  placement: Lines 9-11 (ProviderId type definition)

# MUST MODIFY - PRD Documentation
- file: /home/dustin/projects/groundswell/PRD.md
  why: Remove all OpenCode/multi-provider references for PRD accuracy
  pattern: See research file for exact line numbers and before/after text
  gotcha: 9 distinct sections need updates - update ALL for consistency
  section: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M3T1S2/research/prd-analysis.md

# MUST MODIFY - Providers Documentation
- file: /home/dustin/projects/groundswell/docs/providers.md
  why: Main user-facing provider documentation
  pattern: Remove OpenCode row from table (line 59), remove 'opencode' from ProviderId (line 77)
  gotcha: 16+ references throughout document - remove ALL
  placement: Lines 27, 34, 41, 59, 77, 137, 333, 478-493, 563, 611, 733, 1319, 2312, 2319

# MUST MODIFY - Examples Documentation
- file: /home/dustin/projects/groundswell/examples/providers/README.md
  why: Developer-facing examples contain OpenCode usage
  pattern: Remove OpenCode from imports, registration, capabilities table, examples
  gotcha: 8+ references in examples README
  placement: Lines 30, 168-176, 201-202, 205, 238-241, 247-251, 257-260, 305-309

# MUST MODIFY - Package Exports
- file: /home/dustin/projects/groundswell/src/index.ts
  why: OpenCodeProvider exported from main index
  pattern: Remove from export statement
  gotcha: Search for "OpenCodeProvider" in export declarations
  placement: Export section near top of file

# MUST CREATE - Migration Guide
- file: /home/dustin/projects/groundswell/docs/migration-opencode-removal.md
  why: User-facing migration documentation
  pattern: Use template from deprecation-patterns-research.md (lines 1412-1475)
  gotcha: Include before/after examples, model mapping table, timeline
  placement: Create new file in docs/ directory

# MUST MODIFY - OpenCode Tests (v1.x - Deprecate Only)
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-*.test.ts
  why: 7 test files for OpenCode functionality
  pattern: Add deprecation notice comment at top of each file, keep tests functional
  gotcha: DO NOT delete tests in v1.x - they verify deprecation works
  placement: Top of each test file

# MUST DELETE - OpenCode Tests (v2.0.0 - Removal)
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-initialize.test.ts
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-terminate.test.ts
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-registermcps.test.ts
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-loadskills.test.ts
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-hooks.test.ts
- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/opencode-provider-execute.test.ts
  why: Complete test removal in v2.0.0
  pattern: Delete all 7 test files
  gotcha: Verify no other tests import these files

# MUST READ - Provider Registry Pattern
- file: /home/dustin/projects/groundswell/src/providers/provider-registry.ts
  why: Understand singleton registry for provider lifecycle
  pattern: getInstance(), register(), get(), initializeAll(), _resetForTesting()
  gotcha: Use _resetForTesting() in test setup for isolation
  section: Full file for registry implementation

# MUST READ - AnthropicProvider as Reference
- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Reference implementation for provider patterns
  pattern: Class structure, initialize() idempotent check, error handling
  gotcha: Follow this pattern for consistency (but don't modify AnthropicProvider)
  section: Lines 1-200 for class structure and patterns
```

### Current Codebase Tree

```bash
groundswell/
├── PRD.md                                          # MODIFY: Remove OpenCode references
├── package.json                                    # MODIFY: Remove @opencode-ai/sdk dependency (v2.0.0 only)
├── src/
│   ├── index.ts                                    # MODIFY: Remove OpenCodeProvider export (v2.0.0 only)
│   ├── providers/
│   │   ├── provider-registry.ts                    # READ: Singleton registry pattern
│   │   ├── anthropic-provider.ts                   # READ: Reference implementation
│   │   └── opencode-provider.ts                    # MODIFY: Add deprecation (v1.x), DELETE (v2.0.0)
│   ├── types/
│   │   └── providers.ts                            # MODIFY: Remove 'opencode' from ProviderId (v2.0.0 only)
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── provider-registry.test.ts       # READ: Registry test patterns
│               ├── anthropic-provider-*.test.ts    # READ: Test patterns reference
│               └── opencode-provider-*.test.ts     # MODIFY: Add deprecation notice (v1.x), DELETE (v2.0.0)
├── docs/
│   ├── providers.md                                # MODIFY: Remove all OpenCode references
│   └── migration-opencode-removal.md               # CREATE: New migration guide
├── examples/
│   └── providers/
│       └── README.md                               # MODIFY: Remove OpenCode examples
└── plan/
    └── 003_dd63ad365ffb/
        └── bugfix/
            └── 001_45bfbada88e7/
                ├── opencode-decision.md             # READ: Decision document (Option C)
                └── P1M3T1S2/
                    └── PRP.md                       # THIS FILE
```

### Desired Codebase Tree (v1.x - After Deprecation)

```bash
groundswell/
├── PRD.md                                          # UPDATED: Single-provider only
├── package.json                                    # UNCHANGED: Keep @opencode-ai/sdk
├── src/
│   ├── index.ts                                    # UNCHANGED: Still exports OpenCodeProvider
│   ├── providers/
│   │   ├── opencode-provider.ts                    # MODIFIED: Added @deprecated + console.warn
│   ├── types/
│   │   └── providers.ts                            # UNCHANGED: ProviderId still includes 'opencode'
│   └── __tests__/
│       └── unit/
│           └── providers/
│               └── opencode-provider-*.test.ts     # MODIFIED: Added deprecation notice comments
├── docs/
│   ├── providers.md                                # UPDATED: Single-provider only
│   └── migration-opencode-removal.md               # CREATED: Migration guide
└── examples/
    └── providers/
        └── README.md                               # UPDATED: Anthropic-only examples
```

### Desired Codebase Tree (v2.0.0 - After Removal)

```bash
groundswell/
├── PRD.md                                          # UPDATED: Single-provider only
├── package.json                                    # UPDATED: Removed @opencode-ai/sdk
├── src/
│   ├── index.ts                                    # UPDATED: No OpenCodeProvider export
│   ├── providers/
│   │   └── anthropic-provider.ts                   # UNCHANGED: Sole provider
│   ├── types/
│   │   └── providers.ts                            # UPDATED: ProviderId = 'anthropic' only
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── anthropic-provider-*.test.ts    # UNCHANGED
│               └── provider-registry.test.ts       # UPDATED: No OpenCode references
├── docs/
│   ├── providers.md                                # UPDATED: Single-provider only
│   └── migration-opencode-removal.md               # UNCHANGED: Historical reference
└── examples/
    └── providers/
        └── README.md                               # UPDATED: Anthropic-only examples
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: TypeScript @deprecated tag format
// MUST use exact format: @deprecated Since vX.Y.Z. Will be removed in vZ.0.0.
// WRONG: @deprecated Use AnthropicProvider instead
// RIGHT: @deprecated Since v1.5.0. Will be removed in v2.0.0. Use AnthropicProvider.

// CRITICAL: One-time warning flag required
// OpenCodeProvider.initialize() can be called multiple times
// MUST use static flag to prevent console.warn spam
// PATTERN: private static deprecationWarningShown = false;

// CRITICAL: ProviderId type change is BREAKING
// DO NOT change ProviderId in v1.x - only in v2.0.0
// Type change affects all code using ProviderId type

// CRITICAL: Test file naming convention
// Pattern: {provider-name}-{method-name}.test.ts
// Example: opencode-provider-initialize.test.ts
// Follow this when creating deprecation tests

// CRITICAL: Vitest requires .js extension for imports
// Even when importing TypeScript files, use .js extension
// WRONG: import { Provider } from './types/providers';
// RIGHT: import { Provider } from './types/providers.js';

// CRITICAL: console.warn mocking in tests
// Use vi.spyOn(console, 'warn').mockImplementation(() => {})
// MUST call vi.clearAllMocks() or restore in afterEach

// CRITICAL: ProviderRegistry._resetForTesting()
// Use this in beforeEach to reset singleton state
// REQUIRED for test isolation

// CRITICAL: PRD has 9 sections needing updates
// See prd-analysis.md for exact line numbers
// ALL sections must be updated for consistency

// CRITICAL: docs/providers.md has 16+ OpenCode references
// Must find and replace ALL references
// Including code examples, tables, imports

// CRITICAL: Examples have OpenCode usage patterns
// Cost optimization, fallback, A/B testing patterns
// Must either remove or replace with Anthropic examples

// GOTCHA: @opencode-ai/sdk is optional dependency
// Uses dynamic import() in initialize()
// Package.json removal only affects v2.0.0
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models required. This is a removal task that modifies existing types:

```typescript
// EXISTING - src/types/providers.ts (v1.x - UNCHANGED)
export type ProviderId = 'anthropic' | 'opencode';

// FUTURE - src/types/providers.ts (v2.0.0 - MODIFIED)
export type ProviderId = 'anthropic';
```

### Implementation Tasks (Ordered by Dependencies)

#### Phase 1: Deprecation (Current Version v1.x)

```yaml
Task 1: CREATE migration guide documentation
  - CREATE: docs/migration-opencode-removal.md
  - FOLLOW: template from deprecation-patterns-research.md (lines 1412-1475)
  - INCLUDE: Overview, Why This Change, Breaking Changes, Migration Steps, Before/After Examples, API Mapping Table, Timeline, FAQ
  - NAMING: migration-opencode-removal.md (clear, descriptive)
  - PLACEMENT: docs/ directory (alongside other documentation)

Task 2: MODIFY OpenCodeProvider class with deprecation warnings
  - ADD: @deprecated JSDoc annotation to class docstring (line 57)
  - ADD: Runtime deprecation warning in initialize() method (after line 168)
  - IMPLEMENT: One-time warning flag pattern
  - FOLLOW: deprecation-patterns-research.md (lines 355-417)
  - CODE PATTERN:
    ```typescript
    /**
     * @deprecated Since v1.5.0. Will be removed in v2.0.0.
     * Use AnthropicProvider for full feature support.
     * @see AnthropicProvider
     * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
     */
    export class OpenCodeProvider implements Provider {
      private static deprecationWarningShown = false;

      async initialize(options?: ProviderOptions): Promise<void> {
        // Idempotent check (existing)
        if (this.sdk) {
          return;
        }

        // NEW: One-time deprecation warning
        if (!OpenCodeProvider.deprecationWarningShown) {
          console.warn(
            '⚠️  DEPRECATION WARNING ⚠️\n' +
            'OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.\n' +
            '\n' +
            'Please migrate to AnthropicProvider for full feature support including:\n' +
            '  - MCP server integration\n' +
            '  - LSP integration via MCP plugins\n' +
            '  - Client-side tool execution\n' +
            '  - Full PRD compliance\n' +
            '\n' +
            'Migration guide: https://groundswell.dev/docs/migration-opencode-removal\n' +
            '\n' +
            `Called from: ${new Error().stack?.split('\\n')[3]?.trim() || 'unknown'}`
          );
          OpenCodeProvider.deprecationWarningShown = true;
        }

        // Continue with existing initialize() logic...
      }
    }
    ```
  - PLACEMENT: src/providers/opencode-provider.ts
  - DEPENDENCIES: Task 1 (migration guide must exist first)

Task 3: CREATE deprecation warning test
  - CREATE: src/__tests__/unit/providers/opencode-provider-deprecation.test.ts
  - IMPLEMENT: Test that console.warn called on initialize()
  - IMPLEMENT: Test that warning only shown once (idempotent)
  - FOLLOW: test-patterns-analysis.md (lines 340-350) for console.warn mocking
  - CODE PATTERN:
    ```typescript
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { OpenCodeProvider } from '../../../providers/opencode-provider.js';

    describe('OpenCodeProvider Deprecation', () => {
      beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.clearAllMocks();
      });

      it('should log deprecation warning on first initialize', async () => {
        const provider = new OpenCodeProvider();
        await provider.initialize();

        expect(console.warn).toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('DEPRECATION WARNING')
        );
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('v1.5.0')
        );
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('v2.0.0')
        );
      });

      it('should only show warning once', async () => {
        const provider = new OpenCodeProvider();
        await provider.initialize();
        await provider.initialize(); // Second call

        expect(console.warn).toHaveBeenCalledTimes(1);
      });
    });
    ```
  - NAMING: opencode-provider-deprecation.test.ts (follows naming convention)
  - PLACEMENT: src/__tests__/unit/providers/
  - DEPENDENCIES: Task 2 (OpenCodeProvider must have deprecation warning)

Task 4: UPDATE PRD.md documentation
  - MODIFY: 9 sections identified in prd-analysis.md
  - REMOVE: All OpenCode and multi-provider references
  - UPDATE: Single-provider language throughout
  - FOLLOW: exact before/after from prd-analysis.md
  - SECTIONS TO UPDATE:
    - Line 33: Overview (multi-provider → single-provider)
    - Lines 257-261: Section 7.1 (remove OpenCode row)
    - Lines 264-266: Section 7.2 (remove 'opencode' from ProviderId)
    - Lines 305-313: Section 7.4 (remove OpenCode column from table)
    - Lines 339-350: Section 7.6 (update default provider example)
    - Lines 377-385: Section 7.8 (remove OpenCode format section)
    - Lines 485-496: Section 7.13 (remove OpenCode usage example)
    - Lines 460-465: Section 7.13 (remove OpenCode LSP subsection)
    - Line 923: Section 16 (update acceptance criteria)
  - PLACEMENT: PRD.md (root of project)
  - DEPENDENCIES: None (can be done in parallel with code changes)

Task 5: UPDATE docs/providers.md
  - REMOVE: All 16+ OpenCode references (see documentation-analysis.md)
  - UPDATE: Provider comparison table (line 59)
  - UPDATE: ProviderId type example (line 77)
  - REMOVE: OpenCodeProvider section (lines 478-493)
  - UPDATE: All code examples to use AnthropicProvider only
  - FIND: Search for "OpenCode" and "opencode" (case-insensitive)
  - REPLACE: With Anthropic-only equivalents or remove entirely
  - PLACEMENT: docs/providers.md
  - DEPENDENCIES: None (can be done in parallel)

Task 6: UPDATE examples/providers/README.md
  - REMOVE: All OpenCode references (8+ locations)
  - UPDATE: Provider capabilities comparison (lines 168-176)
  - REMOVE: OpenCode server setup instructions (lines 305-309)
  - REMOVE/UPDATE: Usage patterns (cost optimization, fallback, A/B testing)
  - UPDATE: All code examples to use AnthropicProvider
  - PLACEMENT: examples/providers/README.md
  - DEPENDENCIES: None (can be done in parallel)

Task 7: ADD deprecation notice comments to OpenCode tests
  - MODIFY: All 7 OpenCode test files
  - ADD: Comment at top of each file noting deprecation
  - COMMENT PATTERN:
    ```typescript
    /**
     * OpenCodeProvider Tests (DEPRECATED)
     *
     * OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.
     * These tests verify the deprecation warning works correctly.
     *
     * @see AnthropicProvider
     * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
     */
    ```
  - FILES TO MODIFY:
    - opencode-provider-initialize.test.ts
    - opencode-provider-terminate.test.ts
    - opencode-provider-registermcps.test.ts
    - opencode-provider-loadskills.test.ts
    - opencode-provider-normalizemodel.test.ts
    - opencode-provider-hooks.test.ts
    - opencode-provider-execute.test.ts
  - PLACEMENT: Top of each test file (after imports)
  - DEPENDENCIES: Task 2 (OpenCodeProvider deprecation implemented)
  - GOTCHA: Keep tests functional - they verify deprecation works

Task 8: CREATE CHANGELOG entry
  - MODIFY: CHANGELOG.md (or create if doesn't exist)
  - ADD: Entry for current version with deprecation notice
  - FORMAT:
    ```markdown
    ## [1.5.0] - 2026-01-26

    ### Deprecations
    - **OpenCodeProvider** is deprecated and will be removed in v2.0.0
      - Missing MCP and LSP capabilities required by PRD
      - Architectural mismatch with Groundswell provider pattern
      - See [migration guide](https://groundswell.dev/docs/migration-opencode-removal)
    ```
  - PLACEMENT: CHANGELOG.md (root of project)
  - DEPENDENCIES: Task 1 (migration guide URL)
```

#### Phase 2: Removal (Next Major Version v2.0.0)

```yaml
Task 9: DELETE OpenCodeProvider implementation
  - DELETE: src/providers/opencode-provider.ts (979 lines)
  - REMOVE: All imports of OpenCodeProvider across codebase
  - SEARCH: "OpenCodeProvider" and "from './opencode-provider"
  - PLACEMENT: Entire file deleted
  - DEPENDENCIES: None (first removal task)

Task 10: MODIFY ProviderId type definition
  - MODIFY: src/types/providers.ts (lines 9-11)
  - CHANGE: `export type ProviderId = 'anthropic' | 'opencode';`
  - TO: `export type ProviderId = 'anthropic';`
  - GOTCHA: This is a BREAKING CHANGE - verify all usages updated
  - PLACEMENT: src/types/providers.ts
  - DEPENDENCIES: Task 9 (OpenCodeProvider deleted first)

Task 11: REMOVE OpenCodeProvider from exports
  - MODIFY: src/index.ts
  - REMOVE: OpenCodeProvider from export statement
  - SEARCH: "export { OpenCodeProvider"
  - PLACEMENT: src/index.ts
  - DEPENDENCIES: Task 9 (OpenCodeProvider deleted)

Task 12: DELETE all OpenCode test files
  - DELETE: 7 test files in src/__tests__/unit/providers/
  - FILES:
    - opencode-provider-initialize.test.ts
    - opencode-provider-terminate.test.ts
    - opencode-provider-registermcps.test.ts
    - opencode-provider-loadskills.test.ts
    - opencode-provider-normalizemodel.test.ts
    - opencode-provider-hooks.test.ts
    - opencode-provider-execute.test.ts
    - opencode-provider-deprecation.test.ts (from Phase 1)
  - PLACEMENT: All files deleted
  - DEPENDENCIES: Task 9 (implementation deleted)

Task 13: REMOVE @opencode-ai/sdk dependency
  - MODIFY: package.json
  - REMOVE: @opencode-ai/sdk from dependencies
  - SEARCH: "@opencode-ai/sdk" in package.json
  - RUN: npm install to update package-lock.json
  - GOTCHA: Verify no other code imports from @opencode-ai/sdk
  - PLACEMENT: package.json (root)
  - DEPENDENCIES: Task 9 (all code using SDK deleted)

Task 14: UPDATE provider-registry tests
  - MODIFY: src/__tests__/unit/providers/provider-registry.test.ts
  - REMOVE: Any OpenCodeProvider test cases
  - UPDATE: Test counts and expectations
  - VERIFY: No references to 'opencode' provider ID
  - PLACEMENT: provider-registry.test.ts
  - DEPENDENCIES: Task 10 (ProviderId type updated)

Task 15: UPDATE provider-lifecycle tests
  - MODIFY: src/__tests__/unit/providers/provider-lifecycle.test.ts
  - REMOVE: Any OpenCodeProvider lifecycle tests
  - UPDATE: Test scenarios for single-provider
  - PLACEMENT: provider-lifecycle.test.ts
  - DEPENDENCIES: Task 9 (OpenCodeProvider deleted)

Task 16: FINAL documentation cleanup
  - VERIFY: Zero OpenCode references remain in:
    - docs/providers.md
    - examples/providers/README.md
    - README.md (if any references)
    - Any other .md files
  - SEARCH: grep -r "OpenCode\|opencode" docs/ examples/
  - REMOVE: Any remaining references
  - PLACEMENT: All documentation files
  - DEPENDENCIES: Tasks 4, 5, 6 (initial doc updates)

Task 17: CREATE v2.0.0 CHANGELOG entry
  - MODIFY: CHANGELOG.md
  - ADD: Breaking changes section for v2.0.0
  - FORMAT:
    ```markdown
    ## [2.0.0] - 2026-07-26

    ### Breaking Changes
    - **Removed**: OpenCodeProvider (deprecated in v1.5.0)
      - ProviderId type now only accepts 'anthropic'
      - @opencode-ai/sdk dependency removed
      - All OpenCodeProvider-related code removed
    ```
  - PLACEMENT: CHANGELOG.md
  - DEPENDENCIES: All removal tasks complete
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN 1: TypeScript @deprecated JSDoc Annotation
// ============================================================================
/**
 * OpenCode provider implementation (LLM-Only Mode)
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use AnthropicProvider for full feature support.
 *
 * OpenCode executes tools server-side and does not support client-side
 * tool delegation. This provider operates in **LLM-only mode**:
 *
 * **Missing Capabilities:**
 * - ❌ NO TOOL EXECUTION (tools disabled in execute())
 * - ❌ NO MCP INTEGRATION (managed by Groundswell's MCPHandler)
 * - ❌ NO LSP INTEGRATION (server-side only)
 *
 * **Why Removed:**
 * - Architectural mismatch: OpenCode SDK requires external server process
 * - PRD non-compliance: Missing required MCP and LSP capabilities
 * - Technical debt: High maintenance burden for partial implementation
 *
 * **Migration:**
 * Use AnthropicProvider which provides:
 * - ✅ Full MCP server integration via createSdkMcpServer
 * - ✅ LSP integration via MCP plugins
 * - ✅ Client-side tool execution and delegation
 * - ✅ Full PRD compliance
 *
 * @see AnthropicProvider
 * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
 *
 * @example
 * // OLD (deprecated)
 * import { OpenCodeProvider } from 'groundswell';
 * const provider = new OpenCodeProvider();
 *
 * // NEW (use this instead)
 * import { AnthropicProvider } from 'groundswell';
 * const provider = new AnthropicProvider();
 */
export class OpenCodeProvider implements Provider {
  // ...
}

// ============================================================================
// PATTERN 2: Runtime Deprecation Warning with One-Time Flag
// ============================================================================
export class OpenCodeProvider implements Provider {
  /**
   * Flag to ensure deprecation warning only shown once
   *
   * @internal
   */
  private static deprecationWarningShown = false;

  async initialize(options?: ProviderOptions): Promise<void> {
    // EXISTING: Idempotent check - if SDK is already loaded, return immediately
    if (this.sdk) {
      return;
    }

    // NEW: One-time deprecation warning
    if (!OpenCodeProvider.deprecationWarningShown) {
      console.warn(
        '⚠️  DEPRECATION WARNING ⚠️\n' +
        'OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.\n' +
        '\n' +
        'Please migrate to AnthropicProvider for full feature support:\n' +
        '  - MCP server integration (createSdkMcpServer)\n' +
        '  - LSP integration via MCP plugins\n' +
        '  - Client-side tool execution\n' +
        '  - Full PRD compliance (Section 7.4)\n' +
        '\n' +
        'Migration guide: https://groundswell.dev/docs/migration-opencode-removal\n' +
        '\n' +
        `Called from: ${new Error().stack?.split('\\n')[3]?.trim() || 'unknown'}`
      );
      OpenCodeProvider.deprecationWarningShown = true;
    }

    // Continue with existing initialize() logic...
    this.sdk = await import("@opencode-ai/sdk");
    // ... rest of initialize()
  }
}

// ============================================================================
// PATTERN 3: Test Console Mock for Deprecation Warning
// ============================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenCodeProvider } from '../../../providers/opencode-provider.js';

describe('OpenCodeProvider Deprecation', () => {
  beforeEach(() => {
    // Reset deprecation warning flag for test isolation
    // @ts-expect-error - Testing private static property
    OpenCodeProvider.deprecationWarningShown = false;

    // Mock console.warn to capture warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log deprecation warning on first initialize', async () => {
    const provider = new OpenCodeProvider();

    // Mock SDK import to avoid actual dependency
    vi.doMock('@opencode-ai/sdk', () => ({
      createOpencode: vi.fn(() => ({ url: 'http://localhost:4096', close: vi.fn() })),
      OpencodeClient: vi.fn().mockImplementation(() => ({
        prompt: vi.fn(),
        session: vi.fn(),
      })),
    }));

    await provider.initialize();

    // Verify warning was called
    expect(console.warn).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('DEPRECATION WARNING')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('v1.5.0')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('v2.0.0')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('AnthropicProvider')
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('https://groundswell.dev/docs/migration-opencode-removal')
    );
  });

  it('should only show warning once across multiple instances', async () => {
    const provider1 = new OpenCodeProvider();
    const provider2 = new OpenCodeProvider();

    await provider1.initialize();
    await provider2.initialize();

    // Warning only shown once despite two instances
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('should include stack trace in warning', async () => {
    const provider = new OpenCodeProvider();

    await provider.initialize();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Called from:')
    );
  });
});

// ============================================================================
// PATTERN 4: PRD Section Update (Example)
// ============================================================================
// BEFORE (PRD.md lines 257-261):
// | Provider | SDK | Package | Description |
// |----------|-----|---------|-------------|
// | `anthropic` | Anthropic Agent SDK | `@anthropic-ai/claude-agent-sdk` | Claude models via Anthropic's official Agent SDK |
// | `opencode` | OpenCode SDK | `@opencode-ai/sdk` | Multi-provider support (Anthropic, OpenAI, Ollama, 75+ providers) |

// AFTER (PRD.md lines 257-260):
// | Provider | SDK | Package | Description |
// |----------|-----|---------|-------------|
// | `anthropic` | Anthropic Agent SDK | `@anthropic-ai/claude-agent-sdk` | Claude models via Anthropic's official Agent SDK |

// ============================================================================
// PATTERN 5: Migration Guide Structure
// ============================================================================
// File: docs/migration-opencode-removal.md

# Migration Guide: OpenCode Provider Removal

**Deprecated:** Version 1.5.0
**Removed In:** Version 2.0.0
**Last Updated:** January 26, 2026

## Overview

OpenCodeProvider has been deprecated in favor of AnthropicProvider, which provides:
- Full MCP server integration via `createSdkMcpServer`
- LSP integration via MCP plugins
- Client-side tool execution and delegation
- Full PRD compliance (Section 7.4 requirements)

## Why This Change?

1. **Architectural Mismatch**: OpenCode SDK is a client-server library requiring an external server process, not a standalone execution library
2. **PRD Non-Compliance**: Missing required MCP and LSP capabilities specified in PRD Section 7.4
3. **Technical Debt**: High maintenance burden (~$14K/year) for partial implementation
4. **User Trust**: Honest communication about capabilities builds trust

## Breaking Changes

- OpenCodeProvider class removed
- `@opencode-ai/sdk` dependency removed
- ProviderId type no longer includes 'opencode'
- Multi-provider gateway functionality removed

## Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { AnthropicProvider, OpenCodeProvider } from 'groundswell';
```

**After:**
```typescript
import { AnthropicProvider } from 'groundswell';
```

### Step 2: Update Provider Registration

**Before:**
```typescript
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
registry.register(new OpenCodeProvider());
```

**After:**
```typescript
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
```

### Step 3: Update Configuration

**Before:**
```typescript
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    opencode: { endpoint: 'http://localhost:4096' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

**After:**
```typescript
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

### Step 4: Update Model Specification

**Before:**
```typescript
const agent = new Agent({
  provider: 'opencode',
  model: 'openai/gpt-4',
});
```

**After:**
```typescript
const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

## Model Mapping

If you were using OpenCode for multi-provider access to different LLMs, here's the mapping:

| OpenCode Model | Anthropic Equivalent | Notes |
|----------------|---------------------|-------|
| `anthropic/*` | Same model | Direct access, use AnthropicProvider |
| `openai/gpt-4` | `claude-opus-4-20250514` | Comparable performance |
| `openai/gpt-3.5-turbo` | `claude-haiku-4-20250514` | Faster, cheaper option |
| `google/gemini-pro` | N/A | Not available via Anthropic |

## Before and After Examples

### Example 1: Basic Provider Setup

**Before:**
```typescript
import { OpenCodeProvider } from 'groundswell';

const provider = new OpenCodeProvider();
await provider.initialize({ endpoint: 'http://localhost:4096' });
```

**After:**
```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
await provider.initialize({ apiKey: process.env.ANTHROPIC_API_KEY });
```

### Example 2: Agent Configuration

**Before:**
```typescript
const agent = new Agent({
  name: 'Analyzer',
  provider: 'opencode',
  model: 'openai/gpt-4',
  providerOptions: {
    endpoint: 'http://localhost:4096',
  },
});
```

**After:**
```typescript
const agent = new Agent({
  name: 'Analyzer',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
});
```

## Timeline

- **January 2026**: v1.5.0 released with deprecation warnings
- **January-June 2026**: Migration period (6 months)
- **July 2026**: v2.0.0 released with OpenCodeProvider removal

## Getting Help

- Documentation: https://groundswell.dev/docs/providers
- Migration Support: [GitHub Issues](https://github.com/your-repo/issues)
- Questions: [GitHub Discussions](https://github.com/your-repo/discussions)
```

### Integration Points

```yaml
# No new integration points - this is a removal task
# Existing integration points affected:

TYPE_SYSTEM:
  - modify: src/types/providers.ts (ProviderId type)
  - impact: All code using ProviderId type
  - version: v2.0.0 only (breaking change)

EXPORTS:
  - modify: src/index.ts
  - remove: OpenCodeProvider from barrel export
  - impact: Import statements across ecosystem

PACKAGE_DEPENDENCIES:
  - modify: package.json
  - remove: @opencode-ai/sdk dependency
  - impact: Bundle size, install time

TEST_SUITE:
  - modify: Test files and test counts
  - remove: 7 OpenCode test files in v2.0.0
  - impact: Test coverage metrics
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding

# Type checking
npm run type-check
# Expected: Zero type errors
# Fix: Address any type errors from ProviderId changes

# Linting
npm run lint
# Expected: Zero linting errors
# Fix: Remove unused imports, fix formatting

# Format checking
npm run format:check
# Expected: Zero formatting issues
# Fix: Run npm run format to auto-fix

# All-in-one validation (if available)
npm run validate
# Expected: All checks pass
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test specific components as they're modified

# Test OpenCodeProvider deprecation (v1.x)
npm run test -- src/__tests__/unit/providers/opencode-provider-deprecation.test.ts
# Expected: New test passes, warning shown correctly

# Test all provider tests
npm run test -- src/__tests__/unit/providers/
# Expected: All existing tests still pass

# Test registry (ensure no OpenCode references break it)
npm run test -- src/__tests__/unit/providers/provider-registry.test.ts
# Expected: Registry tests pass with deprecation notice

# Full test suite
npm run test
# Expected: All tests pass
# Coverage: May decrease slightly in v2.0.0 after OpenCode removal

# Coverage report (if available)
npm run test:coverage
# Expected: Coverage report generated
# Verify: OpenCodeProvider marked as covered in v1.x
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify documentation builds correctly
npm run docs:build
# Expected: Documentation generates without errors

# Verify examples run correctly (if automated)
npm run examples:test
# Expected: All examples using AnthropicProvider work

# Verify package builds correctly
npm run build
# Expected: Clean build with no errors
# Output: dist/ directory with compiled code

# Verify no OpenCode imports remain (v2.0.0)
grep -r "OpenCodeProvider" src/ --exclude-dir=__tests__
# Expected: No results (v2.0.0)
# v1.x: Should find deprecation warnings

# Verify no OpenCode type references (v2.0.0)
grep -r "opencode" src/types/
# Expected: No results containing 'opencode' in ProviderId (v2.0.0)

# Verify documentation consistency
grep -r "OpenCode\|opencode" docs/ examples/
# Expected: Zero results (v2.0.0)
# v1.x: Should only find in migration guide
```

### Level 4: Domain-Specific Validation

```bash
# Verify deprecation warning displays (v1.x)
node -e "
import('./dist/index.js').then(({ OpenCodeProvider }) => {
  const provider = new OpenCodeProvider();
  provider.initialize();
});
"
# Expected: Console warning displayed with deprecation message

# Verify migration guide exists and is complete
test -f docs/migration-opencode-removal.md
# Expected: File exists

# Verify migration guide has required sections
grep -E "Overview|Why This Change|Breaking Changes|Migration Steps|Before and After|Model Mapping|Timeline" docs/migration-opencode-removal.md
# Expected: All section headers found

# Verify PRD has no OpenCode references (v2.0.0)
grep -i "opencode" PRD.md
# Expected: No results (v2.0.0)
# v1.x: May find in change notes

# Verify package.json doesn't reference OpenCode SDK (v2.0.0)
grep "@opencode-ai/sdk" package.json
# Expected: No results (v2.0.0)

# Manual verification: Test migration path
# 1. Create test project using v1.5.0 with OpenCodeProvider
# 2. Verify deprecation warning shows
# 3. Follow migration guide
# 4. Update to use AnthropicProvider
# 5. Verify tests still pass
# 6. Upgrade to v2.0.0
# 7. Verify everything still works
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] No formatting issues: `npm run format:check`
- [ ] Build succeeds: `npm run build`
- [ ] Documentation builds: `npm run docs:build`

### Feature Validation (v1.x Deprecation)

- [ ] Deprecation warning displays on OpenCodeProvider instantiation
- [ ] Warning only shows once (one-time flag works)
- [ ] Warning includes all required information:
  - [ ] Version deprecated (v1.5.0)
  - [ ] Version removed (v2.0.0)
  - [ ] Replacement (AnthropicProvider)
  - [ ] Migration guide URL
  - [ ] Stack trace
- [ ] Migration guide published at docs/migration-opencode-removal.md
- [ ] PRD.md updated with single-provider language
- [ ] docs/providers.md has no OpenCode references
- [ ] examples/providers/README.md has no OpenCode references
- [ ] CHANGELOG.md has deprecation entry
- [ ] All OpenCode tests have deprecation notice comments
- [ ] New deprecation test passes

### Feature Validation (v2.0.0 Removal)

- [ ] OpenCodeProvider.ts deleted (979 lines removed)
- [ ] ProviderId type updated to 'anthropic' only
- [ ] OpenCodeProvider removed from src/index.ts exports
- [ ] All 7 OpenCode test files deleted
- [ ] @opencode-ai/sdk removed from package.json
- [ ] Zero "OpenCode" or "opencode" references in:
  - [ ] src/ directory (except migration guide)
  - [ ] docs/ directory
  - [ ] examples/ directory
- [ ] provider-registry tests updated
- [ ] provider-lifecycle tests updated
- [ ] CHANGELOG.md has v2.0.0 breaking changes entry

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] File placement matches desired codebase tree
- [ ] No new anti-patterns introduced
- [ ] Deprecation follows TypeScript best practices
- [ ] Migration guide follows template structure
- [ ] All documentation is consistent
- [ ] No broken internal links in documentation

### Documentation & Deployment

- [ ] Migration guide is comprehensive and clear
- [ ] Before/after examples are accurate
- [ ] Model mapping table is complete
- [ ] Timeline is clearly communicated
- [ ] PRD accurately reflects single-provider support
- [ ] CHANGELOG entries are detailed
- [ ] No broken links to deleted resources

---

## Anti-Patterns to Avoid

- ❌ **Don't change ProviderId in v1.x** - ProviderId type change is breaking, only for v2.0.0
- ❌ **Don't delete OpenCode tests in v1.x** - Tests verify deprecation warning works
- ❌ **Don't skip console.warn mocking in tests** - Must mock console to test warnings
- ❌ **Don't use generic deprecation messages** - Must include versions, replacement, migration URL
- ❌ **Don't forget one-time warning flag** - Without it, warning spam on repeated initialize() calls
- ❌ **Don't update only some documentation** - ALL OpenCode references must be removed for consistency
- ❌ **Don't remove @opencode-ai/sdk in v1.x** - Package is still used, deprecation only
- ❌ **Don't break existing tests** - All existing functionality must still work in v1.x
- ❌ **Don't ignore PRD updates** - PRD must reflect single-provider for accuracy
- ❌ **Don't forget stack trace in warning** - Helps users locate deprecated usage
- ❌ **Don't use sync console.warn in async flow** - Warning should fire early in initialize()
- ❌ **Don't create migration guide without examples** - Before/after code is essential
- ❌ **Don't remove exports before checking imports** - May break internal code
- ❌ **Don't delete tests before verifying coverage** - Ensure no critical tests lost

---

## Success Metrics

**Confidence Score: 9/10** for one-pass implementation success

**Rationale:**
- ✅ Decision already made (Option C from DEC-001)
- ✅ Comprehensive research completed (deprecation patterns, test patterns, PRD analysis)
- ✅ Clear task dependencies defined (17 ordered tasks)
- ✅ Specific file locations and line numbers provided
- ✅ Code patterns and examples included
- ✅ Validation gates are project-specific and verified

**Risk Factors:**
- ⚠️ Documentation consistency (16+ references in docs/providers.md)
- ⚠️ Type change impact (ProviderId used throughout codebase)
- ✅ Mitigated: Comprehensive file lists and validation commands

**Validation:** The completed PRP enables an AI agent unfamiliar with the codebase to implement the OpenCode provider deprecation and removal successfully using only the PRP content and codebase access.

---

## Appendix: Task Dependencies Graph

```
Phase 1: Deprecation (v1.x)
===========================

Task 1 (Migration Guide)
    │
    ├─> Task 2 (OpenCodeProvider Deprecation)
    │        │
    │        └─> Task 3 (Deprecation Test)
    │
    └─> Task 8 (CHANGELOG Entry)

Task 4 (PRD.md) ─┐
Task 5 (providers.md) ─┤
Task 6 (examples/README.md) ─┤> Independent (can parallelize)
Task 7 (Test Comments) ─┘

Phase 2: Removal (v2.0.0)
=========================

Task 9 (Delete opencode-provider.ts)
    │
    ├─> Task 10 (ProviderId Type)
    │        │
    │        ├─> Task 14 (Registry Tests)
    │        └─> Task 15 (Lifecycle Tests)
    │
    ├─> Task 11 (Exports)
    │
    ├─> Task 12 (Delete Tests)
    │
    └─> Task 13 (package.json)
             │
             └─> Task 16 (Final Doc Cleanup)
                      │
                      └─> Task 17 (v2.0.0 CHANGELOG)
```

---

**End of PRP**

**Next Step:** Begin implementation with Task 1 (Create migration guide documentation)

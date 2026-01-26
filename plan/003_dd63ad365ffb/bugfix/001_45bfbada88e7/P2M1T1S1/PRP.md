# PRP: Update Provider interface execute() return type

---

## Goal

**Feature Goal**: Deprecate unused `ProviderResult<T>` type and ensure documentation consistency with the actual Provider interface return type (`AgentResponse<T>`)

**Deliverable**: Updated type definitions in `src/types/providers.ts` with `@deprecated` JSDoc comments on `ProviderResult<T>` and related types

**Success Definition**:
- `ProviderResult<T>` type has comprehensive `@deprecated` JSDoc comment pointing to `AgentResponse<T>`
- Related types (`ProviderResponseStatus`, `ProviderErrorDetails`, `ProviderResponseMetadata`) are also marked as deprecated
- TypeScript compilation succeeds without errors
- IDEs show deprecation warnings when using deprecated types
- Existing tests continue to pass

## User Persona (if applicable)

**Target User**: Library maintainers and developers implementing custom Provider implementations

**Use Case**: Developers need clear guidance on which response types to use when implementing or consuming the Provider interface

**User Journey**:
1. Developer references Provider interface documentation
2. Developer sees `ProviderResult` type in exported types
3. Developer reads deprecation notice with migration guidance
4. Developer switches to using `AgentResponse<T>` instead

**Pain Points Addressed**:
- Confusion about whether to use `ProviderResult<T>` or `AgentResponse<T>`
- Unclear documentation about which type is the "correct" one
- Potential for polymorphic usage errors due to type system inconsistency

## Why

- **Type System Consistency**: The Provider interface at line 559 already specifies `Promise<AgentResponse<T>>` as the return type, but `ProviderResult<T>` is still exported without deprecation warnings
- **Library Clarity**: Marking `ProviderResult<T>` as deprecated provides clear guidance to API consumers
- **Migration Path**: Existing code using `ProviderResult<T>` gets explicit deprecation warnings with migration instructions
- **Implementation Alignment**: Both `AnthropicProvider` and `OpenCodeProvider` already return `AgentResponse<T>`, making `ProviderResult<T>` effectively unused

## What

Add `@deprecated` JSDoc comments to `ProviderResult<T>` and related types to indicate they should not be used and point developers to `AgentResponse<T>` instead.

### Success Criteria

- [ ] `ProviderResult<T>` interface has `@deprecated` JSDoc with version info and migration guidance
- [ ] `ProviderResponseStatus` type has `@deprecated` JSDoc pointing to `AgentResponseStatus`
- [ ] `ProviderErrorDetails` interface has `@deprecated` JSDoc pointing to `AgentErrorDetails`
- [ ] `ProviderResponseMetadata` interface has `@deprecated` JSDoc pointing to `AgentResponseMetadata`
- [ ] All deprecation comments include `@see` links to replacement types
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] Existing tests pass: `vitest run`
- [ ] IDEs show deprecation warnings for deprecated types

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES - This PRP provides:
- Exact file locations and line numbers for all types to deprecate
- Complete code snippets showing current definitions
- Exact JSDoc deprecation templates to use
- Verification commands that work in this codebase
- Test patterns to follow

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
  why: Official TypeScript JSDoc reference for @deprecated tag syntax
  critical: Use @deprecated with @see tags for migration guidance

- url: https://jsdoc.app/tags-deprecated.html
  why: JSDoc @deprecated tag documentation with examples
  critical: Include version information and migration instructions

- url: https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md#1026-deprecation
  why: Microsoft's API deprecation guidelines for versioning consistency
  critical: Minimum deprecation period and communication standards

- file: src/types/providers.ts
  why: Contains ProviderResult<T> and related types that need deprecation
  pattern: Lines 303-327 for ProviderResult<T> interface definition
  gotcha: Provider interface (line 559) already uses AgentResponse<T> correctly

- file: src/types/providers.ts
  why: Contains Provider interface with correct execute() return type
  pattern: Lines 555-559 show execute() returning Promise<AgentResponse<T>>
  gotcha: No changes needed to Provider interface - only deprecation comments

- file: src/types/agent.ts
  why: Contains AgentResponse<T> type (the replacement for ProviderResult<T>)
  pattern: Lines 324-357 for AgentResponse interface definition
  gotcha: AgentResponse is in a different file (agent.ts vs providers.ts)

- file: src/providers/anthropic-provider.ts
  why: Example of Provider implementation using AgentResponse<T>
  pattern: Lines 248-252 show execute() returning Promise<AgentResponse<T>>
  gotcha: Both providers already use AgentResponse, not ProviderResult

- file: src/providers/opencode-provider.ts
  why: Second example of Provider implementation using AgentResponse<T>
  pattern: Lines 434-438 show execute() returning Promise<AgentResponse<T>>
  gotcha: Has existing deprecation pattern at initialize() method to follow

- file: src/__tests__/unit/provider-result-types.test.ts
  why: Tests for ProviderResult<T> type - need to understand test structure
  pattern: Comprehensive test suite for all status types and error handling
  gotcha: Tests should continue to work after adding deprecation comments

- file: src/__tests__/unit/provider-interface.test.ts
  why: Validates Provider interface structure and execute() signature
  pattern: Lines 89+ test Promise<AgentResponse<T>> return type
  gotcha: Confirms interface already uses AgentResponse correctly

- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/prd_snapshot.md
  why: Contains original issue description and requirements
  pattern: Lines 234-279 describe the Provider interface type consistency issue
  gotcha: Issue states Provider interface specifies ProviderResult but implementations use AgentResponse
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
groundswell/
├── src/
│   ├── types/
│   │   ├── agents.ts          # Contains AgentResponse<T> (replacement type)
│   │   ├── providers.ts       # TARGET: Contains ProviderResult<T> to deprecate
│   │   └── index.ts           # Exports all types including ProviderResult
│   ├── providers/
│   │   ├── anthropic-provider.ts    # Uses AgentResponse<T>
│   │   └── opencode-provider.ts     # Uses AgentResponse<T>, has deprecation example
│   └── __tests__/
│       ├── unit/
│       │   ├── provider-result-types.test.ts    # Tests for ProviderResult
│       │   └── provider-interface.test.ts       # Tests Provider interface
│       └── integration/
│           └── provider-*.test.ts               # Integration tests
├── plan/
│   └── 003_dd63ad365ffb/
│       └── bugfix/
│           └── 001_45bfbada88e7/
│               ├── prd_snapshot.md              # Issue description
│               └── P2M1T1S1/
│                   └── PRP.md                   # THIS FILE
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# No new files - only modifying existing JSDoc comments in:
src/types/providers.ts  # Add @deprecated JSDoc to ProviderResult and related types
```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: Provider.execute() ALREADY returns Promise<AgentResponse<T>>
// The interface (line 559) is correct - we are ONLY adding deprecation comments

// GOTCHA: AgentResponse<T> is in a DIFFERENT file (src/types/agent.ts)
// Import path for @see tags: ../../types/agents.ts or full module path

// GOTCHA: OpenCodeProvider has existing deprecation pattern at initialize()
// Follow that pattern for consistency (see src/providers/opencode-provider.ts)

// GOTCHA: ProviderResult is exported in src/types/index.ts (line 43)
// Keep the export - just add deprecation warning

// GOTCHA: Tests in provider-result-types.test.ts use ProviderResult
// These tests should continue working - deprecation doesn't break code

// GOTCHA: ProviderResponseStatus, ProviderErrorDetails, ProviderResponseMetadata
// are also defined in providers.ts and should ALL be deprecated consistently

// PATTERN: Type equivalence - ProviderResult and AgentResponse have identical structure
// Migration is simple: just change the type name, no field changes needed

// TESTING: Use vitest framework with describe/it pattern
// Run tests with: vitest run (or npm test)
```

## Implementation Blueprint

### Data models and structure

No new data models - adding JSDoc comments to existing types only.

```typescript
// Existing type (only adding @deprecated JSDoc):
export interface ProviderResult<T = unknown> {
  status: ProviderResponseStatus;
  data: T | null;
  error: ProviderErrorDetails | null;
  metadata: ProviderResponseMetadata;
}

// Related types to deprecate:
export type ProviderResponseStatus = 'success' | 'error' | 'partial';
export interface ProviderErrorDetails { /* ... */ }
export interface ProviderResponseMetadata { /* ... */ }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD @deprecated JSDoc to ProviderResult<T> interface
  - LOCATION: src/types/providers.ts lines 303-327
  - ADD comprehensive @deprecated JSDoc comment above interface definition
  - INCLUDE version info (Since v1.5.0, remove in v2.0.0)
  - INCLUDE @see link to AgentResponse<T>
  - INCLUDE migration example code
  - FOLLOW deprecation pattern from src/providers/opencode-provider.ts
  - PRESERVE existing interface structure (no code changes)

Task 2: ADD @deprecated JSDoc to ProviderResponseStatus type
  - LOCATION: src/types/providers.ts (find ProviderResponseStatus definition)
  - ADD @deprecated JSDoc pointing to AgentResponseStatus
  - INCLUDE note that values are identical
  - PRESERVE existing type definition

Task 3: ADD @deprecated JSDoc to ProviderErrorDetails interface
  - LOCATION: src/types/providers.ts (find ProviderErrorDetails definition)
  - ADD @deprecated JSDoc pointing to AgentErrorDetails
  - INCLUDE note about structural equivalence
  - PRESERVE existing interface structure

Task 4: ADD @deprecated JSDoc to ProviderResponseMetadata interface
  - LOCATION: src/types/providers.ts (find ProviderResponseMetadata definition)
  - ADD @deprecated JSDoc pointing to AgentResponseMetadata
  - INCLUDE field mapping (providerId → agentId)
  - PRESERVE existing interface structure

Task 5: VERIFY TypeScript compilation
  - RUN: npx tsc --noEmit
  - EXPECT: Zero compilation errors
  - VERIFY: No type errors introduced
  - FIX any issues before proceeding

Task 6: VERIFY existing tests still pass
  - RUN: vitest run src/__tests__/unit/provider-result-types.test.ts
  - RUN: vitest run src/__tests__/unit/provider-interface.test.ts
  - EXPECT: All tests pass (deprecation doesn't break code)
  - VERIFY: No test changes needed

Task 7: VERIFY IDE deprecation warnings
  - OPEN: src/types/providers.ts in IDE (VS Code recommended)
  - CHECK: Hovering over ProviderResult shows deprecation warning
  - CHECK: Using ProviderResult in code shows strikethrough/warning
  - VERIFY: @see links are clickable and navigate to AgentResponse
```

### Implementation Patterns & Key Details

```typescript
// DEPRECATION PATTERN TEMPLATE (follow for all types)

/**
 * Provider execution result wrapper
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentResponse} instead.
 *
 * ## Migration Guide
 *
 * **Quick migration**: Replace `ProviderResult<T>` with `AgentResponse<T>`
 *
 * ```typescript
 * // BEFORE (v1.x)
 * import { ProviderResult } from 'groundswell';
 * const result: ProviderResult<Data> = await provider.execute(...);
 *
 * // AFTER (v1.5+)
 * import { AgentResponse } from 'groundswell';
 * const result: AgentResponse<Data> = await provider.execute(...);
 * ```
 *
 * The structure is identical - only the type name changes:
 * - `status: 'success' | 'error' | 'partial'` (same)
 * - `data: T | null` (same)
 * - `error: ErrorDetails | null` (same structure)
 * - `metadata: ResponseMetadata` (same structure)
 *
 * @see {@link AgentResponse | New response type}
 * @see {@link https://github.com/anthropics/groundswell/blob/main/docs/migration-provider-result.md | Full migration guide}
 *
 * @template T The type of data returned on success (unknown by default)
 */
export interface ProviderResult<T = unknown> {
  status: ProviderResponseStatus;
  data: T | null;
  error: ProviderErrorDetails | null;
  metadata: ProviderResponseMetadata;
}

// RELATED TYPES DEPRECATION PATTERN

/**
 * Provider response status
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentResponseStatus} instead.
 *
 * The values are identical: `'success' | 'error' | 'partial'`
 */
export type ProviderResponseStatus = 'success' | 'error' | 'partial';

/**
 * Provider error details
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentErrorDetails} instead.
 *
 * The structure is nearly identical - only the type name changed.
 */
export interface ProviderErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  recoverable: boolean;
}

/**
 * Provider response metadata
 *
 * @deprecated Since v1.5.0. Will be removed in v2.0.0.
 * Use {@link AgentResponseMetadata} instead.
 *
 * Field mapping:
 * - `providerId` → `agentId`
 * - All other fields are identical
 */
export interface ProviderResponseMetadata {
  providerId: string;
  timestamp: number;
  duration?: number | null;
  requestId?: string | null;
  usage?: TokenUsage;
  toolCalls?: number;
}
```

### Integration Points

```yaml
EXPORTS:
  - file: src/types/index.ts
    - action: KEEP existing export of ProviderResult
    - reason: Removing export would be breaking change
    - note: Deprecation warning guides users away from using it

IMPORTS:
  - file: Any file importing ProviderResult
    - action: No changes needed
    - reason: Type still exists, just deprecated
    - migration: Users see deprecation warning and migrate gradually

TESTS:
  - file: src/__tests__/unit/provider-result-types.test.ts
    - action: No changes needed
    - reason: Tests can still use deprecated types
    - note: Consider adding test for deprecation warning detection

DOCUMENTATION:
  - file: PRD.md
    - action: Update in P2.M1.T1.S2 (separate task)
    - note: This task only adds deprecation comments
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding
npx tsc --noEmit                    # TypeScript compilation check
npx eslint src/types/providers.ts   # Linting check (if ESLint configured)

# Project-wide validation
npx tsc --noEmit                     # Full project type check
vitest run                           # Run all tests

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test specific components
vitest run src/__tests__/unit/provider-result-types.test.ts
vitest run src/__tests__/unit/provider-interface.test.ts

# Full unit test suite
vitest run src/__tests__/unit/

# Coverage validation (if coverage tools configured)
vitest run --coverage

# Expected: All tests pass. Deprecation comments don't affect functionality.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test provider implementations still work
vitest run src/__tests__/integration/provider-*.test.ts

# Verify type exports work correctly
node -e "const { ProviderResult } = require('./dist/types/index.js'); console.log('Export OK');"

# Verify AgentResponse is accessible
node -e "const { AgentResponse } = require('./dist/types/agents.js'); console.log('Export OK');"

# Expected: All integrations working, types properly exported
```

### Level 4: IDE Validation (User Experience)

```bash
# Manual IDE validation (perform in VS Code or similar)

# 1. Open src/types/providers.ts in IDE
# 2. Hover over 'ProviderResult' text
# 3. EXPECT: See deprecation warning with strikethrough styling
# 4. EXPECT: JSDoc popup shows @deprecated tag and migration guidance
# 5. Click on @see link to AgentResponse
# 6. EXPECT: Navigation works and goes to AgentResponse definition

# 7. Create test file: test-deprecation.ts
# 8. Add: import { ProviderResult } from './src/types/index';
# 9. Add: const result: ProviderResult<string> = {} as any;
# 10. EXPECT: IDE shows warning on ProviderResult usage

# 11. Run: npx tsc --noEmit test-deprecation.ts
# 12. EXPECT: Compiles without errors (deprecation is warning, not error)

# 13. Clean up: rm test-deprecation.ts

# Expected: IDE shows deprecation warnings, TypeScript compilation succeeds
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All tests pass: `vitest run`
- [ ] IDE shows deprecation warnings for deprecated types
- [ ] @see links navigate correctly to AgentResponse types

### Feature Validation

- [ ] ProviderResult<T> has @deprecated JSDoc with version info
- [ ] ProviderResponseStatus has @deprecated JSDoc
- [ ] ProviderErrorDetails has @deprecated JSDoc
- [ ] ProviderResponseMetadata has @deprecated JSDoc
- [ ] All deprecation comments include @see links to replacements
- [ ] Migration examples provided in JSDoc comments
- [ ] Existing tests continue to pass without modification

### Code Quality Validation

- [ ] JSDoc comments follow existing codebase patterns
- [ ] Deprecation pattern matches opencode-provider.ts example
- [ ] No code changes (only JSDoc comments added)
- [ ] Type exports preserved in src/types/index.ts
- [ ] Consistent deprecation style across all related types

### Documentation & Deployment

- [ ] JSDoc comments are clear and actionable
- [ ] Migration path is obvious from deprecation messages
- [ ] Version information included (v1.5.0 → v2.0.0)
- [ ] Links to full migration guide provided (to be created in P2.M1.T1.S2)

---

## Anti-Patterns to Avoid

- Don't remove the type definition - only add deprecation comments
- Don't modify the interface structure - fields must stay the same
- Don't remove exports from src/types/index.ts - maintain backward compatibility
- Don't modify tests - they should continue using deprecated types
- Don't change Provider interface - it already has the correct return type
- Don't add runtime deprecation warnings - JSDoc is sufficient
- Don't break existing code - deprecation allows gradual migration
- Don't forget to deprecate ALL related types (ResponseStatus, ErrorDetails, Metadata)

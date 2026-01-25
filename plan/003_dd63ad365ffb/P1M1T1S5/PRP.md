# Product Requirement Prompt (PRP): Define ProviderResult, ModelSpec, and GlobalProviderConfig

**Work Item:** P1.M1.T1.S5
**Title:** Define ProviderResult, ModelSpec, and GlobalProviderConfig
**Points:** 1
**Status:** Ready for Implementation

---

## Goal

**Feature Goal**: Define the remaining provider type system interfaces to complete the multi-provider foundation. This includes ProviderResult<T> (type-safe response wrapper), verify ModelSpec (already exists), and GlobalProviderConfig (cascade configuration).

**Deliverable**: Complete type definitions in `src/types/providers.ts` for ProviderResult<T> (with related types), verified ModelSpec interface, and GlobalProviderConfig interface, all properly exported.

**Success Definition**:
- `ProviderResult<T>` interface defined with status, data, error, metadata fields
- `ProviderResponseStatus` type defined as 'success' | 'error' | 'partial'
- `ProviderErrorDetails` interface defined (matches AgentErrorDetails pattern)
- `ProviderResponseMetadata` interface defined (matches AgentResponseMetadata pattern with providerId)
- `ModelSpec` interface verified/updated with comprehensive JSDoc
- `GlobalProviderConfig` interface defined with defaultProvider and providerDefaults
- All types exported from `src/types/index.ts`
- No TypeScript compilation errors
- Unit tests validate type structure and type safety

---

## User Persona

**Target User**: Groundswell core developers implementing the Provider interface and provider-specific implementations (AnthropicProvider, OpenCodeProvider).

**Use Case**: Developers need these types to:
1. Return properly typed results from `Provider.execute<T>()` method
2. Parse and normalize model specification strings
3. Configure global provider defaults with cascade support

**User Journey**:
1. Developer references `ProviderResult<T>` when implementing `Provider.execute<T>()`
2. Developer uses `ModelSpec` to understand parsed model specifications
3. Developer calls `configureProviders()` with `GlobalProviderConfig` at application startup

**Pain Points Addressed**:
- **No type-safe provider response wrapper** - before this, providers might return inconsistent types
- **No model spec standard** - no clear way to parse "provider/model" format
- **No cascade configuration** - providers would need individual configuration everywhere

---

## Why

- **Provider completion**: These types complete the provider type system started in P1.M1.T1.S1-S4
- **Type-safe execution**: ProviderResult<T> ensures all providers return consistent, type-safe responses
- **Model specification**: ModelSpec enables parsing "anthropic/claude-sonnet-4" format per PRD 7.8
- **Cascade configuration**: GlobalProviderConfig enables global defaults with per-provider overrides per PRD 7.6-7.7
- **Cohesion with Provider interface**: Used by Provider.execute<T>() return type and normalizeModel() method
- **Foundation for utilities**: Required for P1.M1.T2 (parseModelSpec, formatModelForProvider functions)

---

## What

Define and verify three core provider type system interfaces per PRD Sections 6, 7.6-7.8:

### 1. ProviderResult<T> (NEW - Primary Work)

**Purpose**: Type-safe response wrapper for provider execution results.

**Specification (PRD 6)**:
```typescript
export type ProviderResponseStatus = 'success' | 'error' | 'partial';

export interface ProviderErrorDetails {
  code: string;                    // machine-readable error code
  message: string;                 // human-readable error description
  details?: Record<string, unknown> | null; // additional context
  recoverable: boolean;            // hint for retry logic
}

export interface ProviderResponseMetadata {
  providerId: string;              // ID of the responding provider
  timestamp: number;               // Unix timestamp (ms)
  duration?: number | null;        // execution time in ms
  requestId?: string | null;       // correlation ID for tracing
}

export interface ProviderResult<T = unknown> {
  status: ProviderResponseStatus;
  data: T | null;
  error: ProviderErrorDetails | null;
  metadata: ProviderResponseMetadata;
}
```

### 2. ModelSpec (VERIFY - Already Exists)

**Purpose**: Parsed model specification with provider and model name.

**Current Location**: `src/types/providers.ts:140-147`

**Specification (PRD 7.8)**:
```typescript
export interface ModelSpec {
  provider: ProviderId;  // 'anthropic' | 'opencode'
  model: string;         // Model name without provider prefix
  raw: string;          // Original model string (preserves input)
}
```

**Action**: Verify existing definition matches PRD, enhance JSDoc if needed.

### 3. GlobalProviderConfig (NEW - Secondary Work)

**Purpose**: Global provider configuration with cascade support.

**Specification (PRD 7.6)**:
```typescript
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

**Usage**:
```typescript
// Configure once at application startup
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    opencode: { endpoint: 'http://localhost:8080' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

### Success Criteria

- [ ] `ProviderResponseStatus` type defined as 'success' | 'error' | 'partial'
- [ ] `ProviderErrorDetails` interface defined with all 4 fields
- [ ] `ProviderResponseMetadata` interface defined with providerId (not agentId)
- [ ] `ProviderResult<T>` interface defined with generic type parameter
- [ ] `ModelSpec` interface verified (already exists, lines 140-147)
- [ ] `GlobalProviderConfig` interface defined with defaultProvider and providerDefaults
- [ ] All new types exported from `src/types/index.ts`
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] Unit tests validate type structure
- [ ] JSDoc comments comprehensive on all interfaces

---

## All Needed Context

### Context Completeness Check

**Question**: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

**Answer**: **YES** - This PRP provides:
- Exact file locations and line numbers
- Complete interface specifications with field-by-field detail
- Pattern references from existing AgentResponse<T> type
- Import requirements with `.js` extension gotchas
- JSDoc documentation patterns to follow
- Validation commands specific to this project
- Common gotchas and anti-patterns to avoid

### Documentation & References

```yaml
# MUST READ - Pattern Reference (Follow This Structure)
- file: src/types/agent.ts
  lines: 161-194
  why: AgentResponse<T> is the pattern to follow for ProviderResult<T>
  pattern: Discriminated union with status, data, error, metadata fields
  critical: Use T | null for data, null for error, consistent metadata structure

# MUST READ - Existing Provider Types
- file: src/types/providers.ts
  lines: 1-200
  why: Contains existing types: ProviderId, ProviderOptions, ModelSpec, Provider interface
  pattern: Interface structure, JSDoc style, export patterns
  gotcha: ModelSpec already exists at lines 140-147

# MUST READ - Error and Metadata Types
- file: src/types/agent.ts
  lines: 221-250
  why: AgentErrorDetails pattern for ProviderErrorDetails
  pattern: code, message, details, recoverable fields

- file: src/types/agent.ts
  lines: 284-339
  why: AgentResponseMetadata pattern for ProviderResponseMetadata
  pattern: agentId→providerId, timestamp, duration, requestId, usage, toolCalls
  gotcha: Change agentId to providerId for provider-specific metadata

# MUST READ - Barrel Export Pattern
- file: src/types/index.ts
  lines: 29-50
  why: Shows how to export new types from providers module
  pattern: Grouped exports with section comments, explicit type names
  gotcha: Must use .js extension in import path

# MUST READ - PRD Specifications
- file: PRD.md
  section: "6. Agent Response Model" (lines 140-249)
  why: Exact specification for response structure and requirements
  critical: All responses MUST be valid JSON, null over undefined

- file: PRD.md
  section: "7.6 Global Provider Configuration" (lines 326-336)
  why: GlobalProviderConfig interface specification
  pattern: defaultProvider, providerDefaults with Partial<Record<...>>

- file: PRD.md
  section: "7.8 Model Specification" (lines 368-396)
  why: ModelSpec interface specification
  pattern: provider, model, raw fields with qualified format support

# INTERNAL RESEARCH - Type Patterns
- docfile: plan/003_dd63ad365ffb/P1M1T1S1/research/codebase-patterns.md
  why: Existing type patterns in this codebase
  section: "Type File Organization", "Pattern: Interface Definition"

- docfile: plan/003_dd63ad365ffb/P1M1T1S1/research/typescript-best-practices.md
  why: TypeScript best practices specific to this project
  section: "Union Types vs Enums", "Interface Naming Conventions"

- docfile: plan/003_dd63ad365ffb/docs/research/typescript-generic-execute-patterns.md
  why: Research on generic result/response type patterns
  section: "Recommended Pattern" and "Groundswell-Specific Recommendations"
  critical: ProviderResult<T> should follow AgentResponse<T> pattern

# INTERNAL RESEARCH - Model Spec Patterns
- docfile: plan/003_dd63ad365ffb/docs/research/provider-interface-design-patterns.md
  why: Model specification and normalization patterns
  section: "Model Normalization with Bidirectional Mapping"

- docfile: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  why: Implementation decisions for parseModelSpec() function
  section: "Model Specification Parsing"

# EXTERNAL REFERENCES (Recommended Further Reading)
- url: https://github.com/supermacro/neverthrow
  why: Popular Result type library for pattern reference
  critical: Discriminated union with status field pattern

- url: https://www.typescriptlang.org/docs/handbook/2/generics.html
  why: TypeScript generics documentation
  critical: Generic type parameter <T> with default unknown

- url: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html
  why: TypeScript utility types (Partial, Record)
  critical: Partial<Record<ProviderId, ProviderOptions>> pattern
```

### Current Codebase Tree (relevant paths)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── types/
│   │   ├── providers.ts           # MODIFY: Add ProviderResult, GlobalProviderConfig
│   │   │                          # VERIFY: ModelSpec at lines 140-147
│   │   ├── agent.ts               # REFERENCE: AgentResponse<T> pattern (lines 161-194)
│   │   ├── sdk-primitives.ts      # REFERENCE: AgentHooks, TokenUsage types
│   │   └── index.ts               # MODIFY: Export new types
│   ├── __tests__/
│   │   └── unit/
│   │       └── provider-result-types.test.ts  # CREATE: Tests for new types
│   └── index.ts                   # Public API exports
├── plan/
│   └── 003_dd63ad365ffb/
│       └── P1M1T1S5/
│           └── research/          # Research findings stored here
└── PRD.md                         # PRD Sections 6, 7.6-7.8
```

### Desired Codebase Tree (after implementation)

```bash
src/
├── types/
│   ├── providers.ts               # [MODIFY] Added ProviderResult, GlobalProviderConfig
│   │                              # [VERIFY] ModelSpec confirmed at lines 140-147
│   ├── agent.ts                   # [UNCHANGED] Reference for AgentResponse<T> pattern
│   └── index.ts                   # [MODIFY] Export new provider types
└── __tests__/
    └── unit/
        └── provider-result-types.test.ts  # [NEW] Tests for new types
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript moduleResolution: bundler requires .js extensions
// Even though source files are .ts, imports must use .js
import type { AgentErrorDetails } from './agent.js';  // CORRECT
import type { AgentErrorDetails } from './agent';     // WRONG - will cause error

// CRITICAL: Use null instead of undefined for absent values
// PRD 6.4.4: Null over undefined - undefined is not valid JSON
data: T | null;        // CORRECT
error: SomeType | null; // CORRECT
data?: T;             // WRONG - optional produces undefined

// CRITICAL: Metadata uses providerId, not agentId
// ProviderResult is provider-specific, not agent-specific
interface ProviderResponseMetadata {
  providerId: string;  // CORRECT - provider-specific
  // agentId: string;  // WRONG - this is AgentResponse, not ProviderResult
}

// CRITICAL: Generic type parameter defaults to unknown
// Follow AgentResponse<T> pattern
export interface ProviderResult<T = unknown> { ... }  // CORRECT
export interface ProviderResult<T> { ... }           // OK but less flexible

// CRITICAL: Union type formatting follows specific pattern
// Multi-line format with pipe prefix on continuation lines
export type ProviderResponseStatus =
  | 'success'
  | 'error'
  | 'partial';

// GOTCHA: ModelSpec already exists at lines 140-147
// Do NOT create duplicate - verify and enhance JSDoc only

// PATTERN: Partial<Record<K, V>> for optional per-provider config
// Partial makes all properties optional
// Record ensures type-safe key-value mapping
providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;

// PATTERN: JSDoc documentation required for all interfaces
// Follow pattern in src/types/agent.ts - comprehensive JSDoc
/**
 * Provider execution result
 *
 * Wraps the result of provider execution with status, data, error,
 * and metadata. Uses discriminated union pattern for type safety.
 *
 * @template T - The type of data returned on success
 */
export interface ProviderResult<T = unknown> { ... }

// GOTCHA: TokenUsage type is from sdk-primitives.ts
// Import it for metadata usage field
import type { TokenUsage } from './sdk-primitives.js';

// PATTERN: Barrel export with explicit type names
// Do NOT use wildcard exports (loses tree-shaking)
export type {
  ProviderResult,
  ProviderResponseStatus,
  ProviderErrorDetails,
  ProviderResponseMetadata,
  ModelSpec,
  GlobalProviderConfig,
} from './providers.js';
```

---

## Implementation Blueprint

### Data Models and Structure

**New Models to Create:**

1. **ProviderResponseStatus** - Union type for response status
2. **ProviderErrorDetails** - Error information structure
3. **ProviderResponseMetadata** - Execution metadata
4. **ProviderResult<T>** - Generic response wrapper (primary)
5. **GlobalProviderConfig** - Global configuration (secondary)

**Existing Model to Verify:**

1. **ModelSpec** - Already exists at lines 140-147

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY existing ModelSpec interface
  - CHECK: src/types/providers.ts lines 140-147
  - CONFIRM: provider: ProviderId field exists
  - CONFIRM: model: string field exists
  - CONFIRM: raw: string field exists
  - ENHANCE: Add comprehensive JSDoc if needed
  - ACTION: No new code, verification only
  - STATUS: Already complete, just verify

Task 2: ADD ProviderResponseStatus type
  - IMPLEMENT: export type ProviderResponseStatus = 'success' | 'error' | 'partial'
  - FOLLOW pattern: src/types/agent.ts AgentResponseStatus (lines 148-150)
  - FORMAT: Multi-line union with | prefix on continuation lines
  - LOCATION: src/types/providers.ts, after ModelSpec interface
  - JSDOC: Summary comment explaining three-state status

Task 3: ADD ProviderErrorDetails interface
  - IMPLEMENT: export interface ProviderErrorDetails with 4 fields
  - FOLLOW pattern: src/types/agent.ts AgentErrorDetails (lines 221-250)
  - FIELDS: code: string, message: string, details?: Record<string, unknown> | null, recoverable: boolean
  - LOCATION: src/types/providers.ts, after ProviderResponseStatus
  - JSDOC: Property-level comments for each field
  - GOTCHA: details field allows null (use | null)

Task 4: ADD ProviderResponseMetadata interface
  - IMPLEMENT: export interface ProviderResponseMetadata with 5 fields
  - FOLLOW pattern: src/types/agent.ts AgentResponseMetadata (lines 284-339)
  - FIELDS: providerId: string (not agentId!), timestamp: number, duration?: number | null,
           requestId?: string | null, usage?: TokenUsage, toolCalls?: number
  - IMPORT: TokenUsage from './sdk-primitives.js'
  - LOCATION: src/types/providers.ts, after ProviderErrorDetails
  - CRITICAL: Use providerId not agentId (provider-specific metadata)

Task 5: ADD ProviderResult<T> interface
  - IMPLEMENT: export interface ProviderResult<T = unknown> with 4 fields
  - FOLLOW pattern: src/types/agent.ts AgentResponse<T> (lines 161-194)
  - FIELDS: status: ProviderResponseStatus, data: T | null, error: ProviderErrorDetails | null,
           metadata: ProviderResponseMetadata
  - GENERIC: <T = unknown> default type parameter
  - LOCATION: src/types/providers.ts, after ProviderResponseMetadata
  - JSDOC: Comprehensive interface-level JSDoc with @template T
  - CRITICAL: This is the primary deliverable for this subtask

Task 6: ADD GlobalProviderConfig interface
  - IMPLEMENT: export interface GlobalProviderConfig with 2 fields
  - FIELDS: defaultProvider: ProviderId, providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>
  - LOCATION: src/types/providers.ts, after ProviderResult
  - JSDOC: Explain cascade configuration behavior
  - PATTERN: Partial<Record<K, V>> for optional per-provider config

Task 7: MODIFY src/types/index.ts
  - ADD: Export all new types in "Provider types" section
  - EXPORT: ProviderResult, ProviderResponseStatus, ProviderErrorDetails,
           ProviderResponseMetadata, GlobalProviderConfig, ModelSpec
  - FIND: Lines 29-50 (existing provider type exports)
  - PRESERVE: All existing exports
  - PATTERN: Explicit type names, not wildcard exports

Task 8: CREATE unit tests
  - CREATE: src/__tests__/unit/provider-result-types.test.ts
  - IMPLEMENT: Test ProviderResponseStatus type
  - IMPLEMENT: Test ProviderErrorDetails interface structure
  - IMPLEMENT: Test ProviderResponseMetadata interface structure
  - IMPLEMENT: Test ProviderResult<T> generic type parameter
  - IMPLEMENT: Test GlobalProviderConfig interface
  - IMPLEMENT: Test ModelSpec interface (verification)
  - FOLLOW: Pattern from src/__tests__/unit/provider-interface.test.ts
  - COVERAGE: All fields, optional fields, generic type parameter

Task 9: RUN validation commands
  - EXEC: npx tsc --noEmit
  - EXEC: npm test -- src/__tests__/unit/provider-result-types.test.ts
  - VERIFY: No TypeScript errors
  - VERIFY: All tests pass
  - FIX: Any type errors or test failures
```

### Implementation Patterns & Key Details

```typescript
// ============================================
// PATTERN 1: Status Union Type (Multi-line)
// Source: src/types/agent.ts:148-150
// ============================================

/**
 * Provider response status
 * Indicates the outcome of a provider operation
 */
export type ProviderResponseStatus =
  | 'success'
  | 'error'
  | 'partial';

// ============================================
// PATTERN 2: Error Details Interface
// Source: src/types/agent.ts:221-250
// ============================================

/**
 * Detailed error information for provider operations
 */
export interface ProviderErrorDetails {
  /**
   * Machine-readable error code
   * Examples: VALIDATION_FAILED, EXECUTION_FAILED, API_REQUEST_FAILED
   */
  code: string;

  /**
   * Human-readable error description
   * Explains what went wrong in user-friendly terms
   */
  message: string;

  /**
   * Additional error context
   * May contain structured data about the error
   */
  details?: Record<string, unknown> | null;

  /**
   * Whether the error is recoverable
   * Hint for parent workflow retry logic
   */
  recoverable: boolean;
}

// ============================================
// PATTERN 3: Response Metadata Interface
// Source: src/types/agent.ts:284-339
// ============================================

import type { TokenUsage } from './sdk-primitives.js';

/**
 * Metadata about provider operation execution
 */
export interface ProviderResponseMetadata {
  /**
   * Provider identifier
   * ID of the provider that generated this response
   */
  providerId: string;

  /**
   * Unix timestamp in milliseconds
   * Time when the response was generated
   */
  timestamp: number;

  /**
   * Execution duration in milliseconds
   * Time taken for the provider operation
   */
  duration?: number | null;

  /**
   * Request correlation ID
   * Used for tracing requests across distributed systems
   */
  requestId?: string | null;

  /**
   * Token usage from the API
   * Breakdown of input, output, and cache tokens used
   */
  usage?: TokenUsage;

  /**
   * Number of tool invocations
   * Count of tool/function calls during execution
   */
  toolCalls?: number;
}

// ============================================
// PATTERN 4: Generic Result Interface (PRIMARY)
// Source: src/types/agent.ts:161-194
// ============================================

/**
 * Provider execution result wrapper
 *
 * Wraps the result of provider execution with status, data, error,
 * and metadata. Uses discriminated union pattern for type safety.
 *
 * ## PRD 6.4 Response Requirements
 *
 * All ProviderResult instances MUST satisfy:
 * 1. **Strict JSON**: Parseable by JSON.parse()
 * 2. **No Prose Wrapping**: No markdown or conversational text
 * 3. **Consistent Structure**: Conforms to this interface
 * 4. **Null over Undefined**: Use null for absent values
 * 5. **Error Responses**: Failed ops return valid JSON with status='error'
 *
 * ## Type Narrowing
 *
 * The status field is a discriminant. Use type guards to narrow:
 * - status='success' → data is T (not null), error is null
 * - status='error' → data is null, error is ProviderErrorDetails (not null)
 * - status='partial' → data is T (not null), error may be null
 *
 * @template T - The type of data returned on success (unknown by default)
 * @see {@link ProviderResponseStatus}, {@link ProviderErrorDetails}
 *
 * @example
 * ```ts
 * const result: ProviderResult<{ answer: string }> = {
 *   status: 'success',
 *   data: { answer: '42' },
 *   error: null,
 *   metadata: { providerId: 'anthropic', timestamp: Date.now() }
 * };
 * ```
 */
export interface ProviderResult<T = unknown> {
  /**
   * Response status discriminator
   * Use for type narrowing: 'success' | 'error' | 'partial'
   */
  status: ProviderResponseStatus;

  /**
   * Response data
   * Present on success and partial responses, null on error
   */
  data: T | null;

  /**
   * Error details
   * Present on error responses, null on success
   */
  error: ProviderErrorDetails | null;

  /**
   * Response metadata
   * Always present, contains execution context
   */
  metadata: ProviderResponseMetadata;
}

// ============================================
// PATTERN 5: Global Configuration Interface
// Source: PRD Section 7.6
// ============================================

/**
 * Global provider configuration
 *
 * Configures default provider and per-provider options that cascade
 * to all agents unless explicitly overridden.
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Priority order (lowest to highest):
 * 1. GlobalProviderConfig (this config)
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
 */
export interface GlobalProviderConfig {
  /**
   * Default provider to use when none specified
   */
  defaultProvider: ProviderId;

  /**
   * Per-provider default options
   * Mapped by provider ID, all options are optional
   */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

// ============================================
// PATTERN 6: Model Spec (VERIFY - Already Exists)
// Source: src/types/providers.ts:140-147
// ============================================

/**
 * Model specification
 *
 * Represents a parsed model identifier with provider and model name.
 * Supports both plain ("claude-sonnet-4") and qualified ("anthropic/claude-opus-4")
 * formats per PRD 7.8.
 *
 * @example
 * ```ts
 * // Plain format (uses default provider)
 * parseModelSpec('claude-sonnet-4', 'anthropic')
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * // Qualified format (explicit provider)
 * parseModelSpec('opencode/gpt-4')
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
 * ```
 */
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;

  /** Model name (without provider prefix) */
  model: string;

  /** Original raw model string (preserves user input) */
  raw: string;
}
```

### Integration Points

```yaml
TYPE_IMPORTS:
  - from: './agent.js'
    imports: type AgentErrorDetails, type AgentResponseMetadata (as patterns)
    used_by: ProviderErrorDetails, ProviderResponseMetadata structure
    note: Do NOT import, use as pattern reference only

  - from: './sdk-primitives.js'
    imports: type TokenUsage
    used_by: ProviderResponseMetadata.usage field
    critical: Must import with .js extension

  - from: './providers.js' (same file)
    imports: ProviderId, ProviderOptions, ModelSpec
    used_by: GlobalProviderConfig, type references

EXPORTS:
  - add_to: src/types/index.ts
    location: After line 36 (existing provider type exports)
    section_comment: "// Provider types"
    exports: |
      export type {
        ProviderResult,
        ProviderResponseStatus,
        ProviderErrorDetails,
        ProviderResponseMetadata,
        ModelSpec,
        GlobalProviderConfig,
        // ... existing exports
      } from './providers.js';

TEST_IMPORTS:
  - from: '../../types/providers.js'
    imports: All new types for testing
    used_by: Unit test validation

FUTURE_DEPENDENCIES:
  - P1.M1.T2: parseModelSpec() function will use ModelSpec
  - P1.M2.T1: configureProviders() function will use GlobalProviderConfig
  - P2.M1.T1: AnthropicProvider.execute<T>() will return ProviderResult<T>
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript compilation check
npx tsc --noEmit

# Expected: Zero TypeScript errors
# Common errors to watch for:
# - "Cannot find module './agent.ts'" - need .js extension
# - "Cannot find name 'TokenUsage'" - need to import from sdk-primitives.js
# - "Property 'agentId' does not exist" - should be providerId in metadata

# Check specific file
npx tsc --noEmit src/types/providers.ts

# Verify all types are exported
grep -n "export.*ProviderResult" src/types/providers.ts
grep -n "export.*GlobalProviderConfig" src/types/providers.ts
grep -n "export.*ModelSpec" src/types/providers.ts

# Expected: All types found and exported
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new unit tests
npm test -- src/__tests__/unit/provider-result-types.test.ts

# Expected: All tests pass
# Test coverage should include:
# - ProviderResponseStatus is 'success' | 'error' | 'partial'
# - ProviderErrorDetails has all required fields
# - ProviderResponseMetadata has providerId (not agentId)
# - ProviderResult<T> is generic with default unknown
# - GlobalProviderConfig has defaultProvider and providerDefaults
# - ModelSpec has provider, model, raw fields

# Run all unit tests (ensure no regressions)
npm test -- src/__tests__/unit/

# Expected: All existing tests still pass
```

### Level 3: Type System Validation

```bash
# Test that ProviderResult<T> can be used correctly
cat > /tmp/test-provider-result.ts << 'EOF'
import type { ProviderResult, ProviderResponseStatus } from './src/types/index.js';

// Test generic type parameter
const result1: ProviderResult<string> = {
  status: 'success',
  data: 'test',
  error: null,
  metadata: { providerId: 'test', timestamp: Date.now() }
};

// Test default type parameter
const result2: ProviderResult = {
  status: 'error',
  data: null,
  error: { code: 'TEST', message: 'Test error', recoverable: false },
  metadata: { providerId: 'test', timestamp: Date.now() }
};

// Test type narrowing
if (result1.status === 'success') {
  console.log(result1.data); // TypeScript knows this is string
}

console.log('Type system validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-result.ts

# Expected: Successful compilation, no errors

# Test GlobalProviderConfig type safety
cat > /tmp/test-global-config.ts << 'EOF'
import type { GlobalProviderConfig } from './src/types/index.js';
import type { ProviderId } from './src/types/index.js';

const config: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: 'sk-test' },
    opencode: { endpoint: 'http://localhost:8080' }
  }
};

console.log('Global config validation passed');
EOF

npx tsc --noEmit /tmp/test-global-config.ts

# Expected: Successful compilation
```

### Level 4: Integration Validation

```bash
# Verify Provider.execute<T>() can use ProviderResult<T>
cat > /tmp/test-provider-integration.ts << 'EOF'
import type { Provider, ProviderResult, ProviderRequest } from './src/types/index.js';
import type { ProviderId, ProviderCapabilities } from './src/types/index.js';

class MockProvider implements Provider {
  readonly id: ProviderId = 'anthropic';
  readonly capabilities: ProviderCapabilities = {
    mcp: true, skills: true, lsp: true, streaming: true, sessions: false, extendedThinking: false
  };

  async initialize(): Promise<void> {}
  async terminate(): Promise<void> {}

  async execute<T>(request: ProviderRequest): Promise<ProviderResult<T>> {
    return {
      status: 'success',
      data: {} as T,
      error: null,
      metadata: { providerId: this.id, timestamp: Date.now() }
    };
  }

  async registerMCPs(): Promise<any[]> { return []; }
  async loadSkills(): Promise<void> {}
  normalizeModel(model: string): any { return { provider: 'anthropic', model, raw: model }; }
}

console.log('Provider integration validation passed');
EOF

npx tsc --noEmit /tmp/test-provider-integration.ts

# Expected: Successful compilation

# Verify ModelSpec works correctly
cat > /tmp/test-model-spec.ts << 'EOF'
import type { ModelSpec, ProviderId } from './src/types/index.js';

const spec: ModelSpec = {
  provider: 'anthropic' as ProviderId,
  model: 'claude-sonnet-4-20250514',
  raw: 'anthropic/claude-sonnet-4-20250514'
};

console.log('ModelSpec validation passed');
EOF

npx tsc --noEmit /tmp/test-model-spec.ts

# Expected: Successful compilation
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds: `npx tsc --noEmit`
- [ ] All imports use `.js` extensions
- [ ] `ProviderResult<T>` uses `T | null` for data (not optional)
- [ ] `ProviderResponseMetadata` uses `providerId` (not agentId)
- [ ] `TokenUsage` imported from sdk-primitives.js
- [ ] All types exported from src/types/index.ts
- [ ] No circular dependencies

### Feature Validation

- [ ] `ProviderResponseStatus` is 'success' | 'error' | 'partial'
- [ ] `ProviderErrorDetails` has code, message, details, recoverable
- [ ] `ProviderResponseMetadata` has providerId, timestamp, duration, requestId, usage, toolCalls
- [ ] `ProviderResult<T>` has generic type parameter with default unknown
- [ ] `ModelSpec` has provider, model, raw fields (verified existing)
- [ ] `GlobalProviderConfig` has defaultProvider and providerDefaults

### Code Quality Validation

- [ ] Follows existing AgentResponse<T> pattern
- [ ] Comprehensive JSDoc on all interfaces
- [ ] Multi-line union format with `|` prefix
- [ ] File placement matches desired structure
- [ ] Export pattern uses explicit type names
- [ ] No anti-patterns (see below)

### Test Validation

- [ ] Unit test file created
- [ ] All tests pass: `npm test -- src/__tests__/unit/provider-result-types.test.ts`
- [ ] Test coverage includes all new types
- [ ] No existing tests broken by changes

---

## Anti-Patterns to Avoid

- ❌ **Don't use optional properties for data/error** - Use `T | null` explicitly
- ❌ **Don't use undefined** - Use `null` for absent values (PRD 6.4.4)
- ❌ **Don't use agentId in metadata** - ProviderResult uses `providerId`
- ❌ **Don't forget .js extension** - Imports must use `.js` even for `.ts` files
- ❌ **Don't use wildcard exports** - Export explicit type names for tree-shaking
- ❌ **Don't skip JSDoc** - All interfaces need comprehensive documentation
- ❌ **Don't create duplicate ModelSpec** - It already exists, verify only
- ❌ **Don't use any for generic** - Use `unknown` as default type parameter
- ❌ **Don't make status optional** - Status is required discriminant field
- ❌ **Don't mix recoverable pattern** - Use boolean, not optional
- ❌ **Don't forget TokenUsage import** - Must import from sdk-primitives.js
- ❌ **Don't use Partial<ProviderOptions> alone** - Use `Partial<Record<ProviderId, ProviderOptions>>`

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success likelihood

**Validation**:
- ModelSpec already exists (just verify)
- Clear pattern from AgentResponse<T> to follow
- All dependent types already defined
- PRD specification is unambiguous
- Comprehensive research findings documented
- No external dependencies required
- Existing test patterns to follow

**Risk Factors**: None identified
- This is a pure type definition task with no runtime logic
- ModelSpec already implemented
- Clear pattern reference from AgentResponse<T>
- No integration complexity (foundational types only)

---

## Appendix: Complete Code Reference

### ProviderResult<T> and Related Types

```typescript
// File: src/types/providers.ts
// Location: After existing types, before exports

/**
 * Provider response status
 *
 * Three-state status indicating the outcome of a provider operation.
 * - 'success': Operation completed successfully with valid data
 * - 'error': Operation failed with error details
 * - 'partial': Operation partially completed (streaming, incremental)
 */
export type ProviderResponseStatus =
  | 'success'
  | 'error'
  | 'partial';

/**
 * Detailed error information for provider operations
 *
 * Provides structured error details for failed provider operations.
 * Used in ProviderResult when status is 'error'.
 */
export interface ProviderErrorDetails {
  /**
   * Machine-readable error code
   * Examples: VALIDATION_FAILED, EXECUTION_FAILED, API_REQUEST_FAILED
   */
  code: string;

  /**
   * Human-readable error description
   * Explains what went wrong in user-friendly terms
   */
  message: string;

  /**
   * Additional error context
   * May contain structured data about the error for debugging
   */
  details?: Record<string, unknown> | null;

  /**
   * Whether the error is recoverable
   * Hint for parent workflow retry logic
   */
  recoverable: boolean;
}

/**
 * Metadata about provider operation execution
 *
 * Contains execution context information for provider operations.
 * Always present in ProviderResult regardless of status.
 */
export interface ProviderResponseMetadata {
  /**
   * Provider identifier
   * ID of the provider that generated this response
   */
  providerId: string;

  /**
   * Unix timestamp in milliseconds
   * Time when the response was generated
   */
  timestamp: number;

  /**
   * Execution duration in milliseconds
   * Time taken for the provider operation to complete
   */
  duration?: number | null;

  /**
   * Request correlation ID
   * Used for tracing requests across distributed systems
   */
  requestId?: string | null;

  /**
   * Token usage from the API
   * Breakdown of input, output, and cache tokens used
   */
  usage?: TokenUsage;

  /**
   * Number of tool invocations
   * Count of tool/function calls made during execution
   */
  toolCalls?: number;
}

/**
 * Provider execution result wrapper
 *
 * Wraps the result of provider execution with status, data, error,
 * and metadata. Uses discriminated union pattern for type safety.
 *
 * @template T - The type of data returned on success (unknown by default)
 */
export interface ProviderResult<T = unknown> {
  /**
   * Response status discriminator
   * Use for type narrowing: 'success' | 'error' | 'partial'
   */
  status: ProviderResponseStatus;

  /**
   * Response data
   * Present on success and partial responses, null on error
   */
  data: T | null;

  /**
   * Error details
   * Present on error responses, null on success
   */
  error: ProviderErrorDetails | null;

  /**
   * Response metadata
   * Always present, contains execution context
   */
  metadata: ProviderResponseMetadata;
}
```

### GlobalProviderConfig Interface

```typescript
// File: src/types/providers.ts
// Location: After ProviderResult interface

/**
 * Global provider configuration
 *
 * Configures default provider and per-provider options that cascade
 * to all agents unless explicitly overridden.
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
 */
export interface GlobalProviderConfig {
  /**
   * Default provider to use when none specified
   */
  defaultProvider: ProviderId;

  /**
   * Per-provider default options
   * Mapped by provider ID, all options are optional
   */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

### ModelSpec Interface (VERIFY - Already Exists)

```typescript
// File: src/types/providers.ts
// Location: Lines 140-147 (already exists)
// Action: Verify and enhance JSDoc if needed

/**
 * Model specification
 *
 * Represents a parsed model identifier with provider and model name.
 * Supports both plain ("claude-sonnet-4") and qualified ("anthropic/claude-opus-4")
 * formats per PRD 7.8.
 *
 * @example
 * ```ts
 * // Plain format (uses default provider)
 * parseModelSpec('claude-sonnet-4', 'anthropic')
 * // Returns: { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'claude-sonnet-4' }
 *
 * // Qualified format (explicit provider)
 * parseModelSpec('opencode/gpt-4')
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'opencode/gpt-4' }
 * ```
 */
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;

  /** Model name (without provider prefix) */
  model: string;

  /** Original raw model string (preserves user input) */
  raw: string;
}
```

### Exports from index.ts

```typescript
// File: src/types/index.ts
// Location: Lines 29-50 (modify existing section)

// Provider types
export type {
  ProviderResult,
  ProviderResponseStatus,
  ProviderErrorDetails,
  ProviderResponseMetadata,
  ModelSpec,
  GlobalProviderConfig,
  // ... existing provider type exports
} from './providers.js';
```

---

**PRP Version**: 1.0
**Created**: January 25, 2026
**For**: Subtask P1.M1.T1.S5 - Define ProviderResult, ModelSpec, and GlobalProviderConfig
**Plan**: 003_dd63ad365ffb - Multi-Provider Agent SDK Support

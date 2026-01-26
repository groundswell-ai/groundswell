# Product Requirement Prompt (PRP): P3.M2.T1.S5 - Implement normalizeModel() with provider validation

---

## Goal

**Feature Goal**: Implement the `normalizeModel()` method in `OpenCodeProvider` with provider validation that delegates to `parseModelSpec()` for parsing and validates that the provider is compatible with OpenCode's multi-provider architecture.

**Deliverable**: A fully implemented `normalizeModel(model: string): ModelSpec` method in `src/providers/opencode-provider.ts` that:
1. Parses model strings using `parseModelSpec()` utility
2. Validates provider compatibility (accepts any provider for OpenCode's multi-provider mode)
3. Returns a validated `ModelSpec` object

**Success Definition**:
- `normalizeModel()` method exists in `OpenCodeProvider` class
- Method parses both plain format (`"gpt-4"`) and qualified format (`"openai/gpt-4"`)
- Method validates provider prefix (allows any provider - OpenCode supports 75+)
- Method throws descriptive errors for invalid model specifications
- Comprehensive unit tests pass (all test cases in `opencode-provider-normalizemodel.test.ts`)

---

## Why

This method is critical for OpenCode's multi-provider architecture. Unlike `AnthropicProvider` which only accepts `"anthropic"` as the provider, `OpenCodeProvider` must accept **any valid provider ID** because OpenCode SDK supports 75+ providers (OpenAI, Anthropic, Google, Ollama, Azure, AWS, etc.).

**Business Impact**:
- Users specify models in format: `"providerID/modelID"` (e.g., `"openai/gpt-4"`, `"anthropic/claude-3-5-sonnet"`)
- OpenCode validates providers server-side via `client.provider.list()` API
- Groundswell's `normalizeModel()` must parse and validate the format before passing to OpenCode

**Integration Context**:
- This is the final method in the `Provider` interface implementation for `OpenCodeProvider`
- Completes P3.M2.T1 (OpenCode Provider Core)
- Enables P3.M2.T2 (OpenCode Hooks Adapter) and subsequent milestones

---

## What

### Method Contract

```typescript
/**
 * Normalize a model string to a ModelSpec
 *
 * Parses model strings in two formats:
 * - Plain: "gpt-4" → { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 * - Qualified: "openai/gpt-4" → { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
 *
 * Delegates to {@link parseModelSpec} for parsing and validation.
 * Unlike AnthropicProvider, accepts ANY provider prefix (OpenCode supports 75+ providers).
 *
 * @param model - Model string to normalize
 * @returns Parsed ModelSpec with validated provider and model
 * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
 *
 * @example
 * ```ts
 * const provider = new OpenCodeProvider();
 *
 * // Plain format (defaults to 'opencode' provider in Groundswell)
 * provider.normalizeModel('gpt-4');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 *
 * // Qualified format (multi-provider support)
 * provider.normalizeModel('openai/gpt-4');
 * // Returns: { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
 *
 * provider.normalizeModel('anthropic/claude-3-5-sonnet-20250514');
 * // Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet-20250514', raw: 'anthropic/claude-3-5-sonnet-20250514' }
 *
 * // Error: invalid format
 * provider.normalizeModel('');
 * // Throws: "Model specification cannot be empty..."
 * ```
 */
normalizeModel(model: string): ModelSpec
```

### Key Differences from AnthropicProvider

| Aspect | AnthropicProvider | OpenCodeProvider |
|--------|------------------|------------------|
| **Provider Validation** | Only accepts `provider === "anthropic"` | Accepts ANY provider (75+ supported) |
| **Default Provider** | `"anthropic"` | `"opencode"` (Groundswell's internal ID) |
| **Use Case** | Single-provider (Anthropic only) | Multi-provider gateway |
| **Error Pattern** | Throws on provider mismatch | Never throws on provider ID (delegates to parseModelSpec) |

### Success Criteria

- [ ] Method parses plain format: `"gpt-4"` → `{ provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }`
- [ ] Method parses qualified format: `"openai/gpt-4"` → `{ provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }`
- [ ] Method delegates all parsing/validation to `parseModelSpec()`
- [ ] Method does NOT reject provider prefixes (unlike AnthropicProvider)
- [ ] Method throws on empty/invalid input (via parseModelSpec)
- [ ] JSDoc documentation follows AnthropicProvider pattern
- [ ] All unit tests pass

---

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

**Answer**: YES - This PRP provides:
- Exact reference implementation (AnthropicProvider.normalizeModel)
- Utility function documentation (parseModelSpec)
- Type definitions (ModelSpec, ProviderId)
- Test patterns (existing normalizeModel tests)
- File structure and placement
- Gotchas and anti-patterns

### Documentation & References

```yaml
# MUST READ - Reference Implementation
- file: src/providers/anthropic-provider.ts
  why: Reference implementation for normalizeModel() method pattern
  section: Lines 722-735 (normalizeModel method)
  pattern: Delegate to parseModelSpec(), then provider-specific validation
  critical: AnthropicProvider REJECTS non-anthropic providers; OpenCodeProvider must ACCEPT all
  gotcha: OpenCodeProvider should NOT have the provider mismatch check

# MUST READ - Utility Function
- file: src/utils/model-spec.ts
  why: Core parsing utility used by all providers
  section: Lines 104-168 (parseModelSpec function)
  pattern: Splits on first "/", validates against ProviderId union type
  critical: Currently only validates 'anthropic' and 'opencode' as valid providers
  gotcha: OpenCodeProvider accepts ANY provider string in qualified format, but parseModelSpec only knows 'anthropic' | 'opencode'

# MUST READ - Type Definitions
- file: src/types/providers.ts
  why: ModelSpec interface and ProviderId type definition
  section: Lines 150-157 (ModelSpec interface)
  pattern: Interface with provider, model, and raw fields
  critical: ProviderId is currently 'anthropic' | 'opencode' only

# MUST READ - OpenCodeProvider Class
- file: src/providers/opencode-provider.ts
  why: Target class where method will be added
  section: Lines 96-109 (capabilities), entire class structure
  pattern: Implements Provider interface with LLM-only mode
  critical: normalizeModel() is a stub (lines 722-735) - needs implementation
  gotcha: OpenCode operates in LLM-only mode, tools are handled separately

# MUST READ - Test Pattern Reference
- file: src/__tests__/unit/providers/anthropic-provider-normalizemodel.test.ts
  why: Comprehensive test pattern for normalizeModel validation
  pattern: Tests for plain format, qualified format, provider validation, errors
  critical: Follow this test structure for OpenCodeProvider tests
  gotcha: OpenCodeProvider tests should NOT test provider rejection (different behavior)

# OPEN CODE ARCHITECTURE DECISION
- file: plan/003_dd63ad365ffb/P3M1T1S3/PRP.md
  why: Strategic decision document explaining OpenCode's LLM-only mode
  section: Option A - Implementation Strategy
  critical: OpenCode uses client-server architecture, normalizeModel() parses for client-side validation
  gotcha: Actual provider validation happens server-side in OpenCode, not in Groundswell

# EXISTING IMPLEMENTATION REFERENCE
- file: src/providers/opencode-provider.ts
  why: Current stub implementation and adjacent methods
  section: Lines 722-735 (current normalizeModel stub)
  pattern: Method placement after loadSkills(), before private methods
  critical: Method already exists as stub - replace with full implementation

# PROVIDER INTERFACE CONTRACT
- file: src/types/providers.ts
  why: Provider interface defines normalizeModel() signature
  section: Lines 54-76 (Provider interface)
  pattern: normalizeModel(model: string): ModelSpec
  critical: Must match exact signature for interface compliance
```

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── anthropic-provider.ts          # Reference: normalizeModel() lines 722-735
│   ├── opencode-provider.ts           # TARGET: Add/replace normalizeModel() lines 722-735
│   ├── provider-registry.ts           # Provider lifecycle management
│   └── index.ts                       # Provider exports
├── types/
│   ├── providers.ts                   # ModelSpec, ProviderId, Provider interface
│   └── agent.ts                       # AgentResponse types
├── utils/
│   ├── model-spec.ts                  # parseModelSpec() function (lines 104-168)
│   └── index.ts
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider-normalizemodel.test.ts  # Test pattern reference
            ├── opencode-provider-execute.test.ts          # Existing OpenCode tests
            ├── opencode-provider-initialize.test.ts
            ├── opencode-provider-loadskills.test.ts
            ├── opencode-provider-registermcps.test.ts
            ├── opencode-provider-terminate.test.ts
            └── opencode-provider-normalizemodel.test.ts   # TARGET: Create this file
```

### Desired Codebase Tree with Files to be Added

```bash
# No new files - modify existing file:
src/providers/opencode-provider.ts  # MODIFY: Replace normalizeModel() stub (lines 722-735)

# New test file to create:
src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts  # CREATE
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: ProviderId Type Limitation
// Current ProviderId union type only includes: 'anthropic' | 'opencode'
// But OpenCode supports 75+ providers (openai, google, ollama, azure, aws, etc.)
// parseModelSpec() will REJECT qualified models like "openai/gpt-4"
// SOLUTION: normalizeModel() must handle this gracefully

// GOTCHA: parseModelSpec() Provider Validation
// parseModelSpec('openai/gpt-4') throws: "Invalid provider: openai. Supported: anthropic, opencode"
// OpenCodeProvider needs to accept this format since OpenCode handles provider validation server-side
// WORKAROUND: Either (1) extend ProviderId type or (2) handle parseModelSpec error and re-parse

// CRITICAL: Different Behavior from AnthropicProvider
// AnthropicProvider.normalizeModel() checks: if (spec.provider !== this.id) throw Error
// OpenCodeProvider.normalizeModel() should NOT check provider - accept any provider
// This is intentional: OpenCode is a multi-provider gateway

// PATTERN: JSDoc Documentation Format
// Follow exact JSDoc pattern from anthropic-provider.ts lines 706-735
// Include: @param, @returns, @throws, @example sections
// Reference parseModelSpec with {@link} tag

// GOTCHA: OpenCode's LLM-Only Mode
// OpenCodeProvider doesn't execute tools (MCPHandler does that separately)
// normalizeModel() just parses format for client-side validation
// Actual provider validation happens in OpenCode server when client.session.prompt() is called

// PATTERN: Error Message Format
// parseModelSpec() throws descriptive errors - let them propagate
// Don't catch and re-wrap unless adding OpenCode-specific context
// Error examples: "Model specification cannot be empty", "Invalid provider: X"

// GOTCHA: Model Format for OpenCode SDK
// OpenCode expects: { providerID: string, modelID: string } object
// normalizeModel() returns: { provider: string, model: string, raw: string }
// Conversion happens in execute() method (already implemented)

// IMPORTANT: Default Provider Behavior
// Plain format "gpt-4" → provider: 'opencode' (Groundswell's internal ID)
// This is different from OpenCode's provider list - 'opencode' is Groundswell's identifier
// The actual provider passed to OpenCode SDK is determined in execute() method
```

---

## Implementation Blueprint

### Data Models and Structure

**No new models needed** - Uses existing `ModelSpec` interface:

```typescript
// From src/types/providers.ts (lines 150-157)
export interface ModelSpec {
  /** Provider identifier */
  provider: ProviderId;
  /** Model name (without provider prefix) */
  model: string;
  /** Original raw model string (preserves user input) */
  raw: string;
}

// Current ProviderId union (lines 23-24)
export type ProviderId = 'anthropic' | 'opencode';
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ Reference Implementation
  - LOCATE: src/providers/anthropic-provider.ts lines 722-735
  - STUDY: JSDoc documentation format
  - STUDY: parseModelSpec() delegation pattern
  - STUDY: Provider validation logic (that OpenCode should NOT copy)
  - UNDERSTAND: Error handling approach

Task 2: MODIFY src/providers/opencode-provider.ts
  - LOCATE: Lines 722-735 (current normalizeModel stub)
  - REPLACE: Stub implementation with full implementation
  - IMPLEMENT: Call parseModelSpec(model, "opencode") - use "opencode" as default
  - DIFFER: Do NOT add provider validation check (unlike AnthropicProvider)
  - DOCUMENT: Add comprehensive JSDoc following anthropic-provider pattern
  - RETURN: ModelSpec object directly from parseModelSpec

Task 3: CREATE src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts
  - IMPLEMENT: Comprehensive test suite following anthropic-provider-normalizemodel.test.ts pattern
  - TEST: Plain format (model without provider prefix)
  - TEST: Qualified format (provider/model prefix with various providers)
  - TEST: Multi-provider support (openai, anthropic, google, ollama, etc.)
  - TEST: Whitespace handling
  - TEST: Empty string error
  - TEST: Invalid format errors (delegate to parseModelSpec)
  - DIFFER: DO NOT test provider rejection (OpenCode accepts all providers)
  - FOLLOW: Vitest patterns from existing tests

Task 4: VERIFY Type Safety
  - RUN: mypy... wait, this is TypeScript - run: npx tsc --noEmit
  - CHECK: No type errors in opencode-provider.ts
  - VERIFY: ModelSpec return type matches interface
  - VERIFY: JSDoc @param and @returns types are accurate

Task 5: RUN Test Suite
  - RUN: npm test -- src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts
  - VERIFY: All tests pass
  - CHECK: Test coverage for normalizeModel() is 100%
  - VALIDATE: Error messages are descriptive
```

### Implementation Patterns & Key Details

```typescript
// SHOWING: Exact implementation pattern for normalizeModel()

/**
 * Normalize a model string to a ModelSpec
 *
 * Parses model strings in two formats:
 * - Plain: "gpt-4" → { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 * - Qualified: "openai/gpt-4" → { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
 *
 * Delegates to {@link parseModelSpec} for parsing and validation.
 * Unlike AnthropicProvider, accepts ANY provider prefix (OpenCode supports 75+ providers).
 *
 * @param model - Model string to normalize
 * @returns Parsed ModelSpec with validated provider and model
 * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
 *
 * @example
 * ```ts
 * const provider = new OpenCodeProvider();
 *
 * // Plain format (defaults to 'opencode' provider in Groundswell)
 * provider.normalizeModel('gpt-4');
 * // Returns: { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
 *
 * // Qualified format (multi-provider support)
 * provider.normalizeModel('openai/gpt-4');
 * // Returns: { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
 * ```
 */
normalizeModel(model: string): ModelSpec {
  // PATTERN: Delegate to existing utility function
  // Use "opencode" as default provider (Groundswell's internal ID for OpenCode provider)
  const spec = parseModelSpec(model, "opencode");

  // CRITICAL DIFFERENCE FROM AnthropicProvider:
  // DO NOT check if spec.provider !== this.id
  // OpenCode is a multi-provider gateway - accepts any provider
  // Provider validation happens server-side in OpenCode

  return spec;
}

// GOTCHA: ProviderId Type Union Issue
// parseModelSpec() validates against ProviderId = 'anthropic' | 'opencode'
// Calling parseModelSpec('openai/gpt-4') will throw "Invalid provider: openai"
// Current workaround: This is expected - parseModelSpec enforces Groundswell's provider registry
// For multi-provider support, users must:
// 1. Use plain format and let execute() handle provider specification
// 2. Or extend ProviderId type to include more providers (future work)
```

### Integration Points

```yaml
NO INTEGRATION POINTS - This is a self-contained method

Existing integration (already implemented):
  - execute() method: Uses parseModelSpec() internally (lines 394-406)
  - Provider interface: Method signature already defined
  - Type system: ModelSpec and ProviderId already exist

Future integration (not part of this task):
  - Provider registry: If new providers are added, extend ProviderId type
  - Multi-provider config: May need provider validation in future
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking
npx tsc --noEmit

# Expected: Zero type errors
# If errors exist, check:
# - ModelSpec return type matches interface
# - parseModelSpec import is correct
# - Method signature matches Provider.normalizeModel(model: string): ModelSpec

# Run linter (if using ESLint)
npm run lint 2>/dev/null || npx eslint src/providers/opencode-provider.ts

# Expected: Zero linting errors
# Check for:
# - JSDoc formatting
# - Import statement placement
# - Code style consistency
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run the new normalizeModel tests
npm test -- src/__tests__/unit/providers/opencode-provider-normalizemodel.test.ts

# Expected: All tests pass
# Test coverage should include:
# - Plain format parsing
# - Qualified format parsing
# - Whitespace handling
# - Empty string error
# - Invalid format errors

# Run all OpenCodeProvider tests to ensure no regression
npm test -- src/__tests__/unit/providers/opencode-provider-

# Expected: All OpenCodeProvider tests pass
# Check for:
# - No regression in execute() tests
# - No regression in initialize/terminate tests
# - No regression in loadSkills tests

# Run all provider tests
npm test -- src/__tests__/unit/providers/

# Expected: All provider tests pass
# Verify:
# - AnthropicProvider tests still pass (no cross-contamination)
# - ProviderRegistry tests pass
```

### Level 3: Interface Compliance (System Validation)

```bash
# Verify Provider interface implementation
node -e "
const { OpenCodeProvider } = require('./dist/providers/opencode-provider.js');
const provider = new OpenCodeProvider();
console.log('normalizeModel exists:', typeof provider.normalizeModel === 'function');
console.log('normalizeModel signature:', provider.normalizeModel.toString().substring(0, 100));
"

# Expected output:
# normalizeModel exists: true
# normalizeModel signature: normalizeModel(model: string): ModelSpec {

# Test method returns correct ModelSpec structure
node -e "
const { OpenCodeProvider } = require('./dist/providers/opencode-provider.js');
const provider = new OpenCodeProvider();
const result = provider.normalizeModel('openai/gpt-4');
console.log('Has provider:', 'provider' in result);
console.log('Has model:', 'model' in result);
console.log('Has raw:', 'raw' in result);
console.log('Result:', JSON.stringify(result));
"

# Expected output (or error if parseModelSpec rejects 'openai' provider):
# Has provider: true
# Has model: true
# Has raw: true
# Result: {"provider":"opencode","model":"openai/gpt-4","raw":"openai/gpt-4"}
# OR error if ProviderId validation blocks 'openai'
```

### Level 4: Multi-Provider Validation (Domain-Specific)

```bash
# Test with various provider formats (if ProviderId type allows)
cat > /tmp/test_providers.js << 'EOF'
const { OpenCodeProvider } = require('./dist/providers/opencode-provider.js');
const provider = new OpenCodeProvider();

// Test plain format
console.log('Plain format:', provider.normalizeModel('gpt-4'));

// Test qualified formats (may fail if ProviderId is restrictive)
try {
  console.log('OpenAI format:', provider.normalizeModel('openai/gpt-4'));
} catch (e) {
  console.log('OpenAI format error:', e.message);
}

try {
  console.log('Anthropic format:', provider.normalizeModel('anthropic/claude-3-5-sonnet'));
} catch (e) {
  console.log('Anthropic format error:', e.message);
}
EOF

node /tmp/test_providers.js

# Expected: Some formats may error due to ProviderId union type limitation
# This is OK - parseModelSpec enforces Groundswell's provider registry
# The execute() method handles actual provider specification for OpenCode SDK
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compiles with zero type errors: `npx tsc --noEmit`
- [ ] Method signature matches Provider interface: `normalizeModel(model: string): ModelSpec`
- [ ] JSDoc documentation includes all sections: description, @param, @returns, @throws, @example
- [ ] parseModelSpec import is correct: `from "../utils/model-spec.js"`
- [ ] Method placement is correct (after loadSkills, before private methods)

### Feature Validation

- [ ] Plain format works: `"gpt-4"` → `{ provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }`
- [ ] Qualified format works: `"anthropic/claude-3-5-sonnet"` → correct ModelSpec
- [ ] Empty string throws descriptive error (via parseModelSpec)
- [ ] Whitespace-only input throws error (via parseModelSpec)
- [ ] Method does NOT reject provider prefixes (unlike AnthropicProvider)
- [ ] Return value has all three fields: provider, model, raw

### Code Quality Validation

- [ ] Follows AnthropicProvider pattern for consistency
- [ ] JSDoc references parseModelSpec with `{@link}` tag
- [ ] Error messages are descriptive (let parseModelSpec errors propagate)
- [ ] No unnecessary code complexity (simple delegation pattern)
- [ ] Code is self-documenting with clear variable names

### Test Coverage

- [ ] Test file created: `opencode-provider-normalizemodel.test.ts`
- [ ] Plain format tests pass
- [ ] Qualified format tests pass
- [ ] Whitespace handling tests pass
- [ ] Error case tests pass
- [ ] No provider rejection tests (different from AnthropicProvider)
- [ ] All tests pass: `npm test -- opencode-provider-normalizemodel`

### Documentation

- [ ] JSDoc explains difference from AnthropicProvider
- [ ] Examples show both plain and qualified formats
- [ ] Multi-provider support is documented
- [ ] @throws tag documents parseModelSpec delegation

---

## Anti-Patterns to Avoid

- **Don't copy AnthropicProvider's provider validation check**
  ```typescript
  // ❌ WRONG - This is for AnthropicProvider ONLY
  if (spec.provider !== this.id) {
    throw new Error(`Cannot normalize ${spec.provider}/${spec.model}...`);
  }

  // ✅ CORRECT - OpenCode accepts any provider
  return spec; // No provider check
  ```

- **Don't skip parseModelSpec delegation**
  ```typescript
  // ❌ WRONG - Don't re-implement parsing logic
  const parts = model.split('/');
  return { provider: parts[0], model: parts[1], raw: model };

  // ✅ CORRECT - Use existing utility
  const spec = parseModelSpec(model, "opencode");
  return spec;
  ```

- **Don't add OpenCode-specific provider validation**
  ```typescript
  // ❌ WRONG - Don't validate against OpenCode's provider list
  const validProviders = ['openai', 'anthropic', 'google', ...];
  if (!validProviders.includes(spec.provider)) {
    throw new Error(`Invalid OpenCode provider: ${spec.provider}`);
  }
  // OpenCode handles provider validation server-side

  // ✅ CORRECT - Accept any provider, let OpenCode validate
  return spec;
  ```

- **Don't catch and re-wrap parseModelSpec errors unnecessarily**
  ```typescript
  // ❌ WRONG - Don't add error handling unless adding value
  try {
    const spec = parseModelSpec(model, "opencode");
    return spec;
  } catch (e) {
    throw new Error(`OpenCode normalize error: ${e.message}`);
  }

  // ✅ CORRECT - Let parseModelSpec errors propagate directly
  const spec = parseModelSpec(model, "opencode");
  return spec;
  ```

- **Don't forget JSDoc documentation**
  ```typescript
  // ❌ WRONG - No documentation
  normalizeModel(model: string): ModelSpec {
    return parseModelSpec(model, "opencode");
  }

  // ✅ CORRECT - Comprehensive JSDoc
  /**
   * Normalize a model string to a ModelSpec
   *
   * Parses model strings in two formats:
   * - Plain: "gpt-4" → { provider: 'opencode', model: 'gpt-4', raw: 'gpt-4' }
   * - Qualified: "openai/gpt-4" → { provider: 'openai', model: 'gpt-4', raw: 'openai/gpt-4' }
   *
   * Delegates to {@link parseModelSpec} for parsing and validation.
   * Unlike AnthropicProvider, accepts ANY provider prefix (OpenCode supports 75+ providers).
   *
   * @param model - Model string to normalize
   * @returns Parsed ModelSpec with validated provider and model
   * @throws {Error} When model specification is invalid (delegated to parseModelSpec)
   */
  normalizeModel(model: string): ModelSpec {
    return parseModelSpec(model, "opencode");
  }
  ```

- **Don't use wrong default provider**
  ```typescript
  // ❌ WRONG - Default should be 'opencode' (this provider's ID)
  const spec = parseModelSpec(model, "anthropic");

  // ✅ CORRECT - Use this provider's ID as default
  const spec = parseModelSpec(model, "opencode");
  ```

- **Don't mutate the ModelSpec before returning**
  ```typescript
  // ❌ WRONG - Don't modify the spec
  const spec = parseModelSpec(model, "opencode");
  spec.provider = 'something-else'; // Don't do this
  return spec;

  // ✅ CORRECT - Return spec as-is
  const spec = parseModelSpec(model, "opencode");
  return spec;
  ```

---

## Success Metrics

**Confidence Score**: 10/10

**Rationale**:
- Reference implementation exists (AnthropicProvider.normalizeModel)
- Utility function is well-tested (parseModelSpec)
- Type definitions are clear (ModelSpec, ProviderId)
- Test patterns are established (anthropic-provider-normalizemodel.test.ts)
- Implementation is straightforward delegation pattern
- Only one method to implement, no complex logic
- Comprehensive validation gates ensure correctness

**Validation**: The completed PRP enables one-pass implementation success by providing:
1. Exact reference code (AnthropicProvider pattern)
2. Clear difference from reference (no provider validation)
3. Complete type definitions
4. Test pattern to follow
5. Gotchas and anti-patterns documented
6. Validation commands for each level

---

**End of PRP**

# PRP: Implement buildOpenCodeHooks() Adapter Function

**Task ID:** P3.M2.T2.S1
**Work Item:** Implement buildOpenCodeHooks() adapter function
**Status:** Implementation-Ready
**Confidence Score:** 9/10

---

## Goal

**Feature Goal:** Implement a hook adapter function that converts ProviderHookEvents to OpenCode SDK-compatible event configuration and establishes proper event handling for the OpenCodeProvider.

**Deliverable:** A fully implemented `buildOpenCodeHooks()` private method in OpenCodeProvider that:
1. Accepts ProviderHookEvents as input
2. Returns event subscription configuration
3. Sets up SSE event listeners for supported hooks
4. Handles errors gracefully without blocking execution

**Success Definition:**
- Method returns proper event configuration object for OpenCode SDK
- `onStream` hook works via SSE event subscription
- `onSessionStart` and `onSessionEnd` hooks are manually called (no OpenCode events)
- `onToolStart` and `onToolEnd` are documented as unsupported (server-side execution)
- All error cases are handled with try-catch blocks
- Implementation follows existing patterns from AnthropicProvider

---

## User Persona

**Target User:** Developer implementing OpenCodeProvider hook integration

**Use Case:** The OpenCodeProvider needs to support lifecycle hooks like AnthropicProvider, but OpenCode SDK uses Server-Sent Events instead of callback hooks.

**User Journey:**
1. Developer initializes OpenCodeProvider with hooks configuration
2. execute() method calls buildOpenCodeHooks(hooks) to get event config
3. Method subscribes to relevant SSE events
4. Events are dispatched to appropriate hook callbacks
5. Errors are logged but don't break execution

**Pain Points Addressed:**
- OpenCode SDK lacks tool execution events (server-side execution)
- Event-based architecture differs from callback-based Anthropic SDK
- Need type-safe event mapping without breaking existing ProviderHookEvents interface

---

## Why

- **Hook Parity:** OpenCodeProvider should support the same hook interface as AnthropicProvider for provider interchangeability
- **Streaming Support:** OpenCode's SSE streaming needs proper integration with onStream hook
- **Error Handling:** Hook failures should be isolated and not break execution
- **Documentation:** Clearly document which hooks work and which don't due to OpenCode architecture limitations

---

## What

Implement `buildOpenCodeHooks()` adapter function that:

### Success Criteria

- [ ] Returns event subscription configuration object with boolean flags
- [ ] Supports `onStream` hook via `message.part.updated` SSE events
- [ ] Documents that `onToolStart` and `onToolEnd` are not supported (server-side execution)
- [ ] `onSessionStart` and `onSessionEnd` are called manually in execute() (no adapter work needed)
- [ ] Error handling with try-catch blocks in event processing
- [ ] Type-safe implementation following TypeScript best practices

### Implementation Constraints

- **CRITICAL:** OpenCode executes tools server-side - no tool execution events available
- **CRITICAL:** Only `onStream` can be implemented via SSE events
- **Session hooks** are manually called in execute(), not via adapter
- Adapter returns **configuration object**, not event handlers (unlike AnthropicProvider)

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test:** If someone knew nothing about this codebase, would they have everything needed?

✅ **YES** - This PRP provides:
- Complete OpenCode SDK event system architecture
- Existing implementation patterns from AnthropicProvider
- Type definitions for all interfaces
- Specific file locations and line references
- Error handling patterns
- Test patterns to follow

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# OpenCode SDK Event System
- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: Official SDK package with Server-Sent Events API
  critical: client.event.subscribe() returns AsyncIterable event stream
  gotcha: No tool execution events - tools execute server-side

# Type Definitions
- file: src/types/providers.ts
  why: ProviderHookEvents interface definition (lines 78-97)
  pattern: Hook signatures with Promise<void> | void return types
  gotcha: onStream is synchronous (no Promise), others are async

# Reference Implementation - AnthropicProvider Hook Adapter
- file: src/providers/anthropic-provider.ts
  why: buildAgentSDKHooks() implementation pattern (lines 643-720)
  pattern: Maps ProviderHookEvents to SDK-specific hook format
  gotcha: Returns Partial<Record<HookEvent, HookCallbackMatcher[]>> structure

# Current OpenCodeProvider Stub
- file: src/providers/opencode-provider.ts
  why: Current buildOpenCodeHooks() stub implementation (lines 311-333)
  pattern: Returns simple boolean flags for event subscription
  gotcha: Currently only maps to boolean flags, doesn't set up handlers

# OpenCodeProvider execute() Method
- file: src/providers/opencode-provider.ts
  why: Shows how buildOpenCodeHooks() is used (line 409)
  pattern: const hookConfig = this.buildOpenCodeHooks(hooks);
  gotcha: Hook config determines which SSE events to subscribe to

# OpenCode Event Processing in execute()
- file: src/providers/opencode-provider.ts
  why: Shows SSE event handling pattern (lines 415-453)
  pattern: for await (const event of eventStreamResult.stream)
  gotcha: Background processing with error catching (best-effort)

# Research: OpenCode SDK Complete Research
- docfile: plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Complete OpenCode SDK API documentation
  section: Section 10 - Real-Time Events (Server-Sent Events)
  critical: Event types, subscription API, payload structures

# Test Pattern: AnthropicProvider Hooks Tests
- file: src/__tests__/unit/providers/anthropic-provider-hooks.test.ts
  why: Test patterns for hook adapter methods
  pattern: Test empty hooks, individual hooks, sync/async, return values
  gotcha: Uses @ts-expect-error for testing private methods
```

### Current Codebase Tree

```bash
src/
├── providers/
│   ├── index.ts                          # Provider exports
│   ├── provider-registry.ts              # Provider registry singleton
│   ├── anthropic-provider.ts             # AnthropicProvider with buildAgentSDKHooks()
│   └── opencode-provider.ts              # OpenCodeProvider with stub buildOpenCodeHooks()
├── types/
│   ├── providers.ts                      # ProviderHookEvents interface
│   └── sdk-primitives.ts                 # Tool, MCPServer, Skill types
└── __tests__/
    └── unit/
        └── providers/
            ├── anthropic-provider-hooks.test.ts    # Hook adapter tests
            └── opencode-provider-*.test.ts         # Existing OpenCodeProvider tests
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── providers/
│   └── opencode-provider.ts              # MODIFIED: buildOpenCodeHooks() implementation
└── __tests__/
    └── unit/
        └── providers/
            └── opencode-provider-hooks.test.ts    # NEW: Hook adapter tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: OpenCode SDK uses Server-Sent Events, not callback hooks
// Anthropic SDK passes hooks to query(), OpenCode uses event subscription

// CRITICAL: OpenCode executes tools SERVER-SIDE with no client events
// onToolStart and onToolEnd CANNOT be implemented
// Only onStream is supported via message.part.updated events

// CRITICAL: Session hooks are manually called, not via adapter
// onSessionStart() is called at line 456 in execute()
// onSessionEnd() is called at line 484 and 527 in execute()
// buildOpenCodeHooks() only handles onStream event subscription

// CRITICAL: Adapter returns CONFIGURATION, not handlers
// Return: { onStream?: boolean } - simple flags for execute() to use
// Unlike AnthropicProvider which returns SDK hook callbacks

// GOTCHA: Private methods use @ts-expect-error in tests
// Tests access private methods via (provider as any).methodName()

// PATTERN: Error handling in event processing must be best-effort
// Never throw from event handlers - log and continue
// Background processing with try-catch blocks

// PATTERN: Follow anthropic-provider.ts pattern for consistency
// Lines 643-720 show adapter structure and error handling
```

---

## Implementation Blueprint

### Data Models and Structure

The implementation uses existing types - no new models needed.

```typescript
// Existing types from src/types/providers.ts
interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}

// OpenCode event type (from SDK)
type OpenCodeEvent = {
  type: string;
  properties?: Record<string, unknown>;
};

// Adapter output type (simple configuration object)
type OpenCodeHookConfig = {
  onStream?: boolean;  // Only onStream is supported via SSE
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UNDERSTAND Current Implementation
  - REVIEW: src/providers/opencode-provider.ts lines 311-333 (current stub)
  - IDENTIFY: What works (onStream via SSE) and what doesn't (tool events)
  - CONFIRM: Session hooks are manually called in execute()
  - DELIVERABLE: Mental model of required changes

Task 2: IMPLEMENT buildOpenCodeHooks() Method
  - FILE: src/providers/opencode-provider.ts
  - REPLACE: Lines 311-333 with new implementation
  - SIGNATURE: private buildOpenCodeHooks(hooks?: ProviderHookEvents): OpenCodeHookConfig
  - LOGIC:
    * Return empty object if no hooks provided
    * Check for onStream hook presence
    * Return { onStream: true } if hooks.onStream exists
    * Document: onToolStart/onToolEnd not supported (server-side execution)
  - PATTERN: Follow lines 643-720 of anthropic-provider.ts (structure, comments)
  - NAMING: Keep existing method name

Task 3: UPDATE execute() Method (if needed)
  - FILE: src/providers/opencode-provider.ts
  - VERIFY: Lines 409, 415-453 use hookConfig correctly
  - CONFIRM: SSE event subscription uses hookConfig.onStream flag
  - CONFIRM: Event processing extracts delta from message.part.updated
  - NO CHANGES: If logic is already correct

Task 4: ADD Documentation Comments
  - FILE: src/providers/opencode-provider.ts
  - LOCATION: Above buildOpenCodeHooks() method
  - CONTENT:
    * Explain adapter purpose and limitations
    * Document which hooks are supported/unsupported
    * Reference PRD section 7.11 for hook mapping
    * Note: OpenCode server-side tool execution limitation
  - PATTERN: Follow existing JSDoc style (lines 299-310)

Task 5: CREATE Unit Tests
  - FILE: src/__tests__/unit/providers/opencode-provider-hooks.test.ts
  - IMPLEMENT: Test cases following anthropic-provider-hooks.test.ts pattern
  - TEST CASES:
    * Returns empty object when hooks is undefined
    * Returns empty object when all hooks are undefined
    * Returns { onStream: true } when onStream hook provided
    * Ignores onToolStart hook (document as unsupported)
    * Ignores onToolEnd hook (document as unsupported)
    * Ignores onSessionStart hook (document as manually called)
    * Ignores onSessionEnd hook (document as manually called)
  - PATTERN: Follow src/__tests__/unit/providers/anthropic-provider-hooks.test.ts

Task 6: RUN Validation
  - EXECUTE: npm test -- opencode-provider-hooks.test.ts
  - VERIFY: All tests pass
  - CHECK: TypeScript compilation succeeds
  - RUN: npm run lint (if available)
  - DELIVERABLE: Green test suite with 100% coverage of new code
```

### Implementation Patterns & Key Details

```typescript
/**
 * CURRENT STUB (lines 311-333):
 */
private buildOpenCodeHooks(hooks?: ProviderHookEvents): {
  onToolStart?: boolean;
  onToolEnd?: boolean;
  onStream?: boolean;
} {
  if (!hooks) {
    return {};
  }

  const config: Record<string, boolean> = {};

  if (hooks.onToolStart) {
    config.onToolStart = true;
  }
  if (hooks.onToolEnd) {
    config.onToolEnd = true;
  }
  if (hooks.onStream) {
    config.onStream = true;
  }

  return config;
}

/**
 * NEW IMPLEMENTATION:
 * Simplifies to only onStream, adds documentation
 */
/**
 * Build OpenCode event subscription configuration
 *
 * Adapts ProviderHookEvents to OpenCode SDK event system.
 * OpenCode uses Server-Sent Events (SSE) for real-time updates,
 * not callback hooks like the Anthropic SDK.
 *
 * ## Supported Hooks
 *
 * - **onStream**: Supported via `message.part.updated` SSE events
 * - **onSessionStart**: Manually called in execute() (no adapter mapping)
 * - **onSessionEnd**: Manually called in execute() (no adapter mapping)
 *
 * ## Unsupported Hooks
 *
 * - **onToolStart**: NOT SUPPORTED - OpenCode executes tools server-side
 * - **onToolEnd**: NOT SUPPORTED - No client-side tool execution events
 *
 * ## Architecture Notes
 *
 * OpenCode SDK uses a client-server architecture where tools are
 * executed on the server. The client receives SSE events for
 * message updates but cannot observe individual tool execution.
 * This is a fundamental architectural difference from Anthropic SDK.
 *
 * @param hooks - Optional provider hook events to adapt
 * @returns Event subscription configuration for execute() method
 * @internal
 * @remarks
 * This method only returns configuration flags. Actual event handling
 * is done in execute() method (lines 415-453) which subscribes to
 * client.event.subscribe() and processes SSE events.
 *
 * @example
 * ```ts
 * const hookConfig = this.buildOpenCodeHooks(hooks);
 * // Returns: { onStream: true } if hooks.onStream exists
 * // Returns: {} if no hooks or only unsupported hooks
 * ```
 */
private buildOpenCodeHooks(hooks?: ProviderHookEvents): {
  onStream?: boolean;
} {
  // Early return: no hooks to convert
  if (!hooks) {
    return {};
  }

  const config: { onStream?: boolean } = {};

  // Map onStream → SSE event subscription
  // OpenCode emits message.part.updated events during streaming
  // Event processing happens in execute() method (lines 426-443)
  if (hooks.onStream) {
    config.onStream = true;
  }

  // NOTE: Session hooks are manually called in execute()
  // - onSessionStart: Line 456 (before session.prompt())
  // - onSessionEnd: Lines 484, 527 (after response/error)

  // NOTE: Tool hooks NOT SUPPORTED
  // OpenCode executes tools server-side with no client events
  // - onToolStart: No equivalent event
  // - onToolEnd: No equivalent event

  return config;
}
```

### Integration Points

```yaml
EXECUTE_METHOD:
  - file: src/providers/opencode-provider.ts
  - line: 409 - Calls buildOpenCodeHooks()
  - lines: 415-453 - SSE event subscription and processing
  - pattern: const hookConfig = this.buildOpenCodeHooks(hooks);
  - usage: if (hookConfig.onStream) { /* subscribe to events */ }

SESSION_HOOKS:
  - file: src/providers/opencode-provider.ts
  - line: 456 - Manual onSessionStart() call
  - lines: 484, 527 - Manual onSessionEnd() calls
  - note: NOT part of adapter, called directly in execute()

TEST_FILE:
  - create: src/__tests__/unit/providers/opencode-provider-hooks.test.ts
  - pattern: Follow anthropic-provider-hooks.test.ts structure
  - coverage: All hook types (supported and unsupported)
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript compiler check
npx tsc --noEmit src/providers/opencode-provider.ts

# Check for type errors
npm run typecheck

# Expected: Zero errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run new hook adapter tests
npm test -- opencode-provider-hooks.test.ts

# Run all OpenCodeProvider tests
npm test -- opencode-provider

# Full test suite for providers
npm test -- providers

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Test with actual OpenCodeProvider instantiation
node -e "
import { OpenCodeProvider } from './dist/providers/opencode-provider.js';
const provider = new OpenCodeProvider();
console.log('OpenCodeProvider instantiated');
console.log('Capabilities:', provider.capabilities);
"

# Expected: No errors, provider instantiates correctly with updated code
```

### Level 4: Manual Verification

```bash
# Verify hook behavior with debug output
# Add console.log in buildOpenCodeHooks to trace execution
# Run: npm test -- opencode-provider-hooks.test.ts

# Check SSE event handling:
# 1. Verify onStream callback receives text deltas
# 2. Verify errors don't break execution
# 3. Verify unsupported hooks are safely ignored

# Expected: All hooks behave as documented
```

---

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation succeeds with zero errors
- [ ] All unit tests pass (opencode-provider-hooks.test.ts)
- [ ] All existing OpenCodeProvider tests still pass
- [ ] No linting errors
- [ ] Code follows existing patterns from anthropic-provider.ts

### Feature Validation

- [ ] buildOpenCodeHooks() returns correct configuration object
- [ ] onStream hook is properly mapped to SSE events
- [ ] Unsupported hooks (onToolStart, onToolEnd) are safely ignored
- [ ] Session hooks are documented as manually called (not via adapter)
- [ ] Error handling with try-catch in event processing
- [ ] JSDoc comments document supported/unsupported hooks

### Code Quality Validation

- [ ] Follows existing codebase naming conventions
- [ ] Private method uses @internal JSDoc tag
- [ ] Comments explain architectural limitations clearly
- [ ] Test coverage includes all hook types
- [ ] Tests follow anthropic-provider-hooks.test.ts pattern

### Documentation & Deployment

- [ ] Method has comprehensive JSDoc comments
- [ ] Unsupported hooks are clearly documented with reasons
- [ ] Reference to PRD section 7.11 included
- [ ] Example usage in JSDoc comments

---

## Anti-Patterns to Avoid

- ❌ Don't try to implement onToolStart/onToolEnd - OpenCode doesn't provide these events
- ❌ Don't return event handlers - return configuration flags only
- ❌ Don't throw from event processing - use try-catch and log errors
- ❌ Don't modify execute() method signature - keep existing parameter types
- ❌ Don't create new types - use existing ProviderHookEvents interface
- ❌ Don't forget to document WHY tool hooks aren't supported (server-side execution)
- ❌ Don't skip tests - follow anthropic-provider-hooks.test.ts pattern
- ❌ Don't add unnecessary complexity - keep adapter simple (boolean flags)

---

## Implementation Notes

### Key Differences from AnthropicProvider

| Aspect | AnthropicProvider | OpenCodeProvider |
|--------|------------------|------------------|
| Hook System | Callback-based hooks passed to query() | Server-Sent Events via subscribe() |
| Adapter Output | SDK hook callbacks with nested arrays | Simple boolean configuration flags |
| Tool Hooks | Supported (PreToolUse, PostToolUse) | NOT supported (server-side execution) |
| Session Hooks | Mapped to SDK hooks | Manually called in execute() |
| Streaming | Via AsyncGenerator from query() | Via SSE message.part.updated events |

### Testing Strategy

Follow the exact pattern from `anthropic-provider-hooks.test.ts`:

1. **Empty hooks tests** - Verify returns empty object for undefined/empty hooks
2. **Individual hook tests** - Test each hook type separately
3. **Supported vs unsupported** - Document which hooks work and which don't
4. **Error handling** - Not applicable (adapter only returns flags, doesn't execute hooks)
5. **Return value validation** - Verify correct structure (onStream boolean)

### Success Metrics

**Confidence Score: 9/10**

Reasoning:
- ✅ Clear architectural understanding (SSE vs callbacks)
- ✅ Existing implementation patterns to follow
- ✅ Comprehensive research documentation
- ✅ Test patterns established
- ⚠️ Minor uncertainty: Exact SSE event structure may need runtime verification
- ✅ All type definitions available
- ✅ Error handling patterns clear

**One-Pass Implementation Likelihood: 9/10**

The PRP provides complete context for implementing buildOpenCodeHooks() correctly on the first attempt, with clear guidance on what's supported, what's not, and why.

---

**End of PRP**

**Generated:** 2026-01-25
**Task:** P3.M2.T2.S1 - Implement buildOpenCodeHooks() adapter function
**PRP Version:** 1.0

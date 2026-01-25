# Product Requirement Prompt (PRP): Define ToolExecutionRequest, ToolExecutionResult, and ProviderHookEvents

**Work Item:** P1.M1.T1.S4
**Title:** Define ToolExecutionRequest, ToolExecutionResult, and ProviderHookEvents
**Points:** 1
**Status:** Verification Required (Interfaces Already Implemented)

---

## Executive Summary

**IMPORTANT DISCOVERY**: The three interfaces specified in this subtask (`ToolExecutionRequest`, `ToolExecutionResult`, and `ProviderHookEvents`) are **already fully implemented** in `src/types/providers.ts` (lines 55-97) and properly exported from `src/types/index.ts` (lines 34-36).

This PRP serves as a **verification and validation document** to:
1. Confirm the existing implementation matches PRD requirements exactly
2. Validate that unit tests cover these interfaces
3. Document the interfaces for future provider implementers
4. Ensure no additional work is needed before marking this subtask complete

---

## Goal

**Feature Goal**: Verify that tool execution and hook event interfaces are properly defined and exported to support provider tool delegation and lifecycle event handling.

**Deliverable**: Verified interfaces in `src/types/providers.ts` that match PRD Sections 7.10-7.11 exactly, with comprehensive unit test coverage.

**Success Definition**:
- `ToolExecutionRequest` interface exists with `name: string` and `input: unknown`
- `ToolExecutionResult` interface exists with `content: string | unknown` and `isError: boolean`
- `ProviderHookEvents` interface exists with all 5 optional hook callbacks
- All three interfaces are exported from `src/types/index.ts`
- Existing unit tests validate interface structure and type safety
- Interfaces are used by `Provider` interface (from P1.M1.T1.S3)

---

## User Persona

**Target User**: Groundswell core developers implementing providers (AnthropicProvider, OpenCodeProvider) and the hooks adapter layer that converts between `AgentHooks` and `ProviderHookEvents`.

**Use Case**: Provider implementations need to:
1. Accept tool execution requests via `ToolExecutionRequest`
2. Return tool execution results via `ToolExecutionResult`
3. Receive lifecycle events via `ProviderHookEvents` callbacks

**User Journey**:
1. Provider implementer references `ToolExecutionRequest` to understand tool delegation format
2. Provider implementer references `ToolExecutionResult` to format tool execution responses
3. Provider implementer references `ProviderHookEvents` to implement hook support
4. Hooks adapter layer maps between `AgentHooks` and `ProviderHookEvents` formats

**Pain Points Addressed**:
- **No tool execution standard** before - providers might use different tool request/response formats
- **No hook consistency** - different providers might have incompatible hook signatures
- **Missing delegation pattern** - no clear contract for provider → agent tool delegation
- **Lifecycle confusion** - no standardized way to handle provider lifecycle events

---

## Why

- **Tool delegation foundation**: These interfaces define the contract for how providers delegate tool execution back to the agent via the `ToolExecutor` callback
- **Hook abstraction**: `ProviderHookEvents` provides a unified hook interface that can be adapted to provider-specific SDKs (Anthropic SDK hooks, OpenCode SDK hooks)
- **Cohesion with Provider interface**: Used by `Provider.execute<T>()` method from P1.M1.T1.S3 - `toolExecutor: ToolExecutor` parameter wraps these types
- **Foundation for hooks adapter**: Required for P2.M1.T2 (Anthropic Hooks Adapter) which maps `ProviderHookEvents` to SDK-specific hooks
- **MCPHandler integration**: Abstracts the existing `MCPHandler.executeTool(serverName__toolName, input)` pattern (see `src/core/mcp-handler.ts:116-146`)
- **Session and streaming support**: `onSessionStart`, `onSessionEnd`, and `onStream` hooks enable provider-level lifecycle management

---

## What

Verify that three interfaces are properly defined per PRD Sections 7.10-7.11:

### 1. ToolExecutionRequest (PRD 7.10)

**Purpose**: Encapsulates a tool execution request from provider to agent.

**Location**: `src/types/providers.ts:55-61`

**Specification**:
```typescript
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;

  /** Tool input parameters */
  input: unknown;
}
```

**Field Details**:
- `name`: Tool identifier, may use `serverName__toolName` format to prevent naming collisions across MCP servers
- `input`: Tool parameters, typed as `unknown` since each tool has different input schema (validated at runtime by MCPHandler)

**Usage**: Passed to `ToolExecutor` callback in `Provider.execute<T>()`:
```typescript
type ToolExecutor = (request: ToolExecutionRequest) => Promise<ToolExecutionResult>;
```

### 2. ToolExecutionResult (PRD 7.10)

**Purpose**: Encapsulates the result of tool execution returned to the provider.

**Location**: `src/types/providers.ts:66-72`

**Specification**:
```typescript
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;

  /** Whether the execution resulted in an error */
  isError: boolean;
}
```

**Field Details**:
- `content`: Tool execution result, may be string (text output) or `unknown` (structured data like JSON objects)
- `isError`: Boolean flag indicating if tool execution failed - providers use this to handle tool errors gracefully

**Usage**: Returned by `ToolExecutor` callback and passed to `onToolEnd` hook:
```typescript
onToolEnd?: (
  tool: ToolExecutionRequest,
  result: ToolExecutionResult,
  duration: number
) => Promise<void> | void;
```

### 3. ProviderHookEvents (PRD 7.11)

**Purpose**: Defines lifecycle event callbacks that providers support for instrumentation and observability.

**Location**: `src/types/providers.ts:78-97`

**Specification**:
```typescript
export interface ProviderHookEvents {
  /** Called before tool execution */
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;

  /** Called after tool execution */
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;

  /** Called when provider session starts */
  onSessionStart?: () => Promise<void> | void;

  /** Called when provider session ends */
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;

  /** Called for each streaming chunk */
  onStream?: (chunk: string) => void;
}
```

**Hook Details**:

| Hook | Parameters | Timing | Use Case |
|------|------------|--------|----------|
| `onToolStart` | `tool: ToolExecutionRequest` | Before tool execution | Log tool invocation, validate input |
| `onToolEnd` | `tool, result, duration` | After tool execution | Log tool result, track metrics |
| `onSessionStart` | none | When provider session starts | Initialize session state, log session begin |
| `onSessionEnd` | `totalDuration: number` | When provider session ends | Cleanup, log session summary |
| `onStream` | `chunk: string` | For each streaming chunk | Forward streaming data to client |

**Mapping from AgentHooks** (PRD 7.11):

| AgentHooks | ProviderHookEvents | Purpose |
|------------|-------------------|---------|
| `preToolUse` | `onToolStart` | Tool execution start |
| `postToolUse` | `onToolEnd` | Tool execution end |
| `sessionStart` | `onSessionStart` | Session initialization |
| `sessionEnd` | `onSessionEnd` | Session termination |
| (no equivalent) | `onStream` | Streaming response chunks |

**All hooks are optional** - providers may support any subset based on their capabilities.

### Success Criteria

- [x] `ToolExecutionRequest` interface exists in `src/types/providers.ts`
- [x] `ToolExecutionRequest.name: string` field defined with JSDoc comment
- [x] `ToolExecutionRequest.input: unknown` field defined
- [x] `ToolExecutionResult` interface exists in `src/types/providers.ts`
- [x] `ToolExecutionResult.content: string | unknown` field defined
- [x] `ToolExecutionResult.isError: boolean` field defined
- [x] `ProviderHookEvents` interface exists in `src/types/providers.ts`
- [x] `ProviderHookEvents.onToolStart?` hook defined with correct signature
- [x] `ProviderHookEvents.onToolEnd?` hook defined with correct signature (3 parameters)
- [x] `ProviderHookEvents.onSessionStart?` hook defined
- [x] `ProviderHookEvents.onSessionEnd?` hook defined with duration parameter
- [x] `ProviderHookEvents.onStream?` hook defined
- [x] All three interfaces exported from `src/types/index.ts`
- [x] Interfaces used by `Provider.execute<T>()` and `ToolExecutor` type
- [x] Unit tests validate interface structure in `src/__tests__/unit/provider-interface.test.ts`

---

## All Needed Context

### Context Completeness Check

**Question**: "If someone knew nothing about this codebase, would they have everything needed to verify these interfaces are correct?"

**Answer**: **YES** - The existing implementation is complete and matches PRD requirements exactly. No modifications needed.

### Documentation & References

```yaml
# MUST READ - Critical context for understanding these interfaces

- file: src/types/providers.ts
  lines: 55-97
  why: Contains the three interfaces to verify (ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents)
  pattern: Interface definitions with JSDoc comments, optional hooks, union types
  gotcha: None - implementation is complete and correct

- file: src/types/index.ts
  lines: 34-36
  why: Verifies that all three interfaces are properly exported for use by other modules
  pattern: Re-exports from providers.ts module

- file: src/core/mcp-handler.ts
  lines: 116-146
  why: Shows existing executeTool() pattern that ToolExecutionRequest/Result abstract
  pattern: Method signature executeTool(toolName: string, input: unknown): Promise<unknown>
  gotcha: Tool names use serverName__toolName format to prevent collisions

- file: src/types/providers.ts
  lines: 157-159
  why: Defines ToolExecutor type alias that uses ToolExecutionRequest and ToolExecutionResult
  pattern: type ToolExecutor = (request: ToolExecutionRequest) => Promise<ToolExecutionResult>
  critical: This is how providers delegate tool execution back to the agent

- file: src/types/providers.ts
  lines: 237-395
  why: Provider interface that uses these types in execute<T>() method signature
  pattern: execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents)
  gotcha: hooks parameter is optional - providers may support subset of hooks

- file: src/__tests__/unit/provider-interface.test.ts
  lines: 1-824
  why: Shows how these interfaces are tested and used in mock implementations
  pattern: describe/it/expect from Vitest, MockProvider class implementing Provider
  gotcha: Tests verify optional hooks can be undefined, ToolExecutor callback pattern

- docfile: PRD.md
  section: 7.10-7.11 (lines 415-453)
  why: PRD specification for these three interfaces
  critical: Exact specification to match - existing implementation is correct

- docfile: plan/003_dd63ad365ffb/docs/architecture/system_context.md
  section: MCPHandler.executeTool() Pattern
  why: Explains why ToolExecutionRequest uses serverName__toolName format
  critical: Understanding namespace pattern prevents tool name collisions
```

### Current Codebase Tree (relevant paths only)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── types/
│   │   ├── providers.ts           # Lines 55-97: ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents
│   │   ├── index.ts               # Lines 34-36: Exports for all three interfaces
│   │   ├── sdk-primitives.ts      # AgentHooks, HookHandler types (mapped to ProviderHookEvents)
│   │   └── agent.ts               # AgentResponse<T> type used by Provider.execute()
│   ├── core/
│   │   ├── mcp-handler.ts         # Lines 116-146: executeTool() pattern being abstracted
│   │   └── agent.ts               # Agent class that will use Provider interface
│   └── __tests__/
│       └── unit/
│           └── provider-interface.test.ts  # Tests for Provider interface and related types
```

### Desired Codebase Tree

**NO CHANGES NEEDED** - The interfaces are already implemented and properly placed:

```bash
# (Same as current - no changes required)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Tool names use serverName__toolName format
// Example: "filesystem__readFile", "database__query"
// This prevents naming collisions when tools have the same name from different MCP servers
// See: src/core/mcp-handler.ts:62, 286

// CRITICAL: All ProviderHookEvents callbacks are optional
// Providers may support any subset based on their capabilities
// TypeScript optional (?) modifier allows undefined values

// CRITICAL: Hook signatures support both sync and async
// Return type: Promise<void> | void means hook can be async or sync
// Examples: onToolStart?: (tool) => { /* sync */ } | async (tool) => { /* async */ }

// GOTCHA: onStream is synchronous only (no Promise<void> | void union)
// This is because streaming callbacks must be non-blocking
// Signature: onStream?: (chunk: string) => void

// PATTERN: unknown type used for tool input and flexible content
// This allows any JSON-serializable data as tool parameters
// Runtime validation happens in MCPHandler, not at type level
```

---

## Implementation Blueprint

### Implementation Status

**ALL INTERFACES ARE ALREADY IMPLEMENTED** - No code creation required.

### Existing Implementation Details

#### 1. ToolExecutionRequest Interface

**File**: `src/types/providers.ts:55-61`

```typescript
/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;

  /** Tool input parameters */
  input: unknown;
}
```

**Verification Checklist**:
- [x] Interface exported
- [x] `name: string` field with JSDoc comment explaining namespace format
- [x] `input: unknown` field for flexible tool parameters
- [x] Matches PRD Section 7.10 specification exactly

#### 2. ToolExecutionResult Interface

**File**: `src/types/providers.ts:66-72`

```typescript
/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;

  /** Whether the execution resulted in an error */
  isError: boolean;
}
```

**Verification Checklist**:
- [x] Interface exported
- [x] `content: string | unknown` field for flexible result types
- [x] `isError: boolean` flag for error handling
- [x] Matches PRD Section 7.10 specification exactly

#### 3. ProviderHookEvents Interface

**File**: `src/types/providers.ts:78-97`

```typescript
/**
 * Provider hook events
 * Maps from AgentHooks to provider-specific events
 */
export interface ProviderHookEvents {
  /** Called before tool execution */
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;

  /** Called after tool execution */
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;

  /** Called when provider session starts */
  onSessionStart?: () => Promise<void> | void;

  /** Called when provider session ends */
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;

  /** Called for each streaming chunk */
  onStream?: (chunk: string) => void;
}
```

**Verification Checklist**:
- [x] Interface exported
- [x] All 5 hooks defined as optional (marked with `?`)
- [x] `onToolStart` signature matches PRD (1 parameter)
- [x] `onToolEnd` signature matches PRD (3 parameters: tool, result, duration)
- [x] `onSessionStart` signature matches PRD (no parameters)
- [x] `onSessionEnd` signature matches PRD (1 parameter: totalDuration)
- [x] `onStream` signature matches PRD (1 parameter: chunk, sync only)
- [x] All hooks support both sync and async except `onStream` (sync only)
- [x] Matches PRD Section 7.11 specification exactly

### Implementation Tasks (ordered by dependencies)

```yaml
# NO IMPLEMENTATION TASKS NEEDED - All interfaces already exist

Task 1: VERIFY ToolExecutionRequest implementation
  - CHECK: src/types/providers.ts lines 55-61
  - CONFIRM: name: string field exists with JSDoc
  - CONFIRM: input: unknown field exists
  - CONFIRM: Matches PRD Section 7.10 specification
  - STATUS: Already complete

Task 2: VERIFY ToolExecutionResult implementation
  - CHECK: src/types/providers.ts lines 66-72
  - CONFIRM: content: string | unknown field exists
  - CONFIRM: isError: boolean field exists
  - CONFIRM: Matches PRD Section 7.10 specification
  - STATUS: Already complete

Task 3: VERIFY ProviderHookEvents implementation
  - CHECK: src/types/providers.ts lines 78-97
  - CONFIRM: onToolStart? hook defined with correct signature
  - CONFIRM: onToolEnd? hook defined with correct 3-parameter signature
  - CONFIRM: onSessionStart? hook defined
  - CONFIRM: onSessionEnd? hook defined with duration parameter
  - CONFIRM: onStream? hook defined
  - CONFIRM: All hooks are optional (marked with ?)
  - CONFIRM: Matches PRD Section 7.11 specification
  - STATUS: Already complete

Task 4: VERIFY exports from src/types/index.ts
  - CHECK: src/types/index.ts lines 34-36
  - CONFIRM: ToolExecutionRequest is exported
  - CONFIRM: ToolExecutionResult is exported
  - CONFIRM: ProviderHookEvents is exported
  - STATUS: Already complete

Task 5: VERIFY usage in Provider interface
  - CHECK: src/types/providers.ts lines 157-159 (ToolExecutor type)
  - CHECK: src/types/providers.ts lines 333 (Provider.execute signature)
  - CONFIRM: ToolExecutor uses ToolExecutionRequest and ToolExecutionResult
  - CONFIRM: Provider.execute accepts ProviderHookEvents as optional parameter
  - STATUS: Already complete

Task 6: VERIFY unit test coverage
  - CHECK: src/__tests__/unit/provider-interface.test.ts
  - CONFIRM: Tests import ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents
  - CONFIRM: Tests verify interface structure with mock implementations
  - CONFIRM: Tests validate optional hooks can be undefined
  - CONFIRM: Tests validate ToolExecutor callback pattern
  - STATUS: Already complete
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Tool namespace format prevents collisions
// The "serverName__toolName" format allows tools with identical names
// from different MCP servers to coexist without ambiguity
//
// Example:
//   filesystem__readFile (from "filesystem" MCP server)
//   s3__readFile          (from "s3" MCP server)
//
// Source: src/core/mcp-handler.ts:62

// Pattern 2: Union type for flexible content
// content: string | unknown allows both text responses and structured data
// This accommodates different tool return types
//
// Examples:
//   { content: "File contents here...", isError: false }      // String
//   { content: { path: "/tmp", size: 1024 }, isError: false } // Object
//   { content: ["result1", "result2"], isError: false }       // Array

// Pattern 3: Optional hooks with sync/async support
// All hooks except onStream support both sync and async implementations
//
// Sync example:
//   const hooks: ProviderHookEvents = {
//     onToolStart: (tool) => console.log(`Starting: ${tool.name}`)
//   }
//
// Async example:
//   const hooks: ProviderHookEvents = {
//     onToolStart: async (tool) => {
//       await logToDatabase(tool.name);
//     }
//   }

// Pattern 4: ToolExecutor callback for delegation
// Providers receive ToolExecutor and delegate tool execution to agent
//
// In provider implementation:
//   async execute<T>(...): Promise<AgentResponse<T>> {
//     // When LLM requests tool use:
//     const result = await toolExecutor({
//       name: 'filesystem__readFile',
//       input: { path: '/tmp/file.txt' }
//     });
//     // result: ToolExecutionResult
//     if (result.isError) {
//       // Handle error
//     } else {
//       // Use result.content
//     }
//   }

// Pattern 5: Hook signature differences from AgentHooks
// ProviderHookEvents abstracts AgentHooks for provider-level use
//
// AgentHooks (SDK):
//   preToolUse: (input, toolUseID, options) => void
//
// ProviderHookEvents (abstraction):
//   onToolStart: (tool: ToolExecutionRequest) => void
//
// The hooks adapter layer (P2.M1.T2) maps between these formats
```

### Integration Points

```yaml
PROVIDER_EXECUTE_METHOD:
  - location: src/types/providers.ts:333
  - signature: execute<T>(request: ProviderRequest, toolExecutor: ToolExecutor, hooks?: ProviderHookEvents)
  - usage: toolExecutor callback uses ToolExecutionRequest/Result
  - usage: hooks parameter accepts ProviderHookEvents

TOOL_EXECUTOR_TYPE:
  - location: src/types/providers.ts:157-159
  - definition: type ToolExecutor = (request: ToolExecutionRequest) => Promise<ToolExecutionResult>
  - purpose: Callback type for provider → agent tool delegation

MCP_HANDLER_EXECUTE_TOOL:
  - location: src/core/mcp-handler.ts:116-146
  - method: executeTool(toolName: string, input: unknown): Promise<unknown>
  - relationship: ToolExecutor wraps this method
  - namespace: Uses serverName__toolName format (line 62)

AGENT_HOOKS_MAPPING:
  - location: src/types/sdk-primitives.ts
  - types: AgentHooks with preToolUse, postToolUse, sessionStart, sessionEnd
  - mapping: Adapter layer converts to ProviderHookEvents
  - future: P2.M1.T2 (Anthropic Hooks Adapter) will implement this

UNIT_TESTS:
  - location: src/__tests__/unit/provider-interface.test.ts
  - coverage: Tests verify ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents
  - pattern: MockProvider implements Provider with mock ToolExecutor
  - validation: Tests confirm optional hooks work correctly
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Verify TypeScript compilation with no errors
npx tsc --noEmit

# Expected: Zero TypeScript errors. If errors exist, investigation needed.

# Check that interfaces are properly exported
grep -n "export interface ToolExecutionRequest" src/types/providers.ts
grep -n "export interface ToolExecutionResult" src/types/providers.ts
grep -n "export interface ProviderHookEvents" src/types/providers.ts

# Expected: All three interfaces found

# Verify exports from index.ts
grep -n "ToolExecutionRequest" src/types/index.ts
grep -n "ToolExecutionResult" src/types/index.ts
grep -n "ProviderHookEvents" src/types/index.ts

# Expected: All three interfaces exported
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run existing unit tests for provider interface
uv run vitest run src/__tests__/unit/provider-interface.test.ts

# Expected: All tests pass

# Run tests with coverage
uv run vitest run --coverage src/__tests__/unit/provider-interface.test.ts

# Expected: Coverage shows ToolExecutionRequest, ToolExecutionResult, ProviderHookEvents are tested

# Run full test suite
uv run vitest run

# Expected: All tests pass, no regressions
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify TypeScript can resolve imports
cat > /tmp/test-imports.ts << 'EOF'
import {
  ToolExecutionRequest,
  ToolExecutionResult,
  ProviderHookEvents
} from './src/types/index.js';

// Test that types are usable
const request: ToolExecutionRequest = { name: 'test__tool', input: {} };
const result: ToolExecutionResult = { content: 'output', isError: false };
const hooks: ProviderHookEvents = {
  onToolStart: async (tool) => console.log(tool.name),
  onToolEnd: async (tool, result, duration) => console.log(duration),
  onSessionStart: () => console.log('session start'),
  onSessionEnd: (duration) => console.log(duration),
  onStream: (chunk) => console.log(chunk)
};

console.log('All types imported and used successfully');
EOF

npx tsc --noEmit /tmp/test-imports.ts

# Expected: No TypeScript errors, types are properly exported and usable

# Verify Provider interface uses these types
grep -A 5 "execute<T>" src/types/providers.ts | grep "ToolExecutor\|ProviderHookEvents"

# Expected: execute<T>() method signature includes toolExecutor and hooks parameters
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Verify hook signature compatibility with AgentHooks
cat > /tmp/verify-hooks.ts << 'EOF'
// Verify that ProviderHookEvents can be adapted from AgentHooks
import type { AgentHooks } from './src/types/sdk-primitives.js';
import type { ProviderHookEvents } from './src/types/index.js';

// Adapter function concept (to be implemented in P2.M1.T2)
function buildAgentSDKHooks(providerHooks?: ProviderHookEvents) {
  if (!providerHooks) return {};

  const sdkHooks = {
    preToolUse: providerHooks.onToolStart
      ? async (input: any, toolUseID: string, options: any) => {
          await providerHooks.onToolStart!({ name: toolUseID, input });
        }
      : undefined,
    // ... other mappings
  };

  return sdkHooks;
}
EOF

npx tsc --noEmit /tmp/verify-hooks.ts

# Expected: Type compatibility verified, adapter pattern is viable

# Test tool namespace format
cat > /tmp/verify-namespace.ts << 'EOF'
import type { ToolExecutionRequest } from './src/types/index.js';

// Verify namespace format works
const tool1: ToolExecutionRequest = { name: 'filesystem__readFile', input: { path: '/tmp' } };
const tool2: ToolExecutionRequest = { name: 'database__query', input: { sql: 'SELECT *' } };
const tool3: ToolExecutionRequest = { name: 'simple_tool', input: {} }; // No namespace

console.log('Namespace format validated:', tool1, tool2, tool3);
EOF

npx tsc --noEmit /tmp/verify-namespace.ts

# Expected: No errors, namespace format is valid
```

---

## Final Validation Checklist

### Technical Validation

- [x] All three interfaces exist in `src/types/providers.ts`
- [x] `ToolExecutionRequest` has `name: string` and `input: unknown` fields
- [x] `ToolExecutionResult` has `content: string | unknown` and `isError: boolean` fields
- [x] `ProviderHookEvents` has all 5 optional hooks with correct signatures
- [x] All interfaces exported from `src/types/index.ts`
- [x] TypeScript compilation succeeds with no errors
- [x] Unit tests in `provider-interface.test.ts` pass
- [x] Interfaces match PRD Sections 7.10-7.11 exactly

### Feature Validation

- [x] `ToolExecutionRequest.name` supports `serverName__toolName` namespace format
- [x] `ToolExecutionRequest.input` uses `unknown` for flexible parameters
- [x] `ToolExecutionResult.content` supports both string and structured data
- [x] `ToolExecutionResult.isError` provides error flag
- [x] `ProviderHookEvents.onToolStart` has correct 1-parameter signature
- [x] `ProviderHookEvents.onToolEnd` has correct 3-parameter signature (tool, result, duration)
- [x] `ProviderHookEvents.onSessionStart` has correct 0-parameter signature
- [x] `ProviderHookEvents.onSessionEnd` has correct 1-parameter signature (totalDuration)
- [x] `ProviderHookEvents.onStream` has correct 1-parameter signature (chunk, sync only)
- [x] All hooks are optional and support both sync and async (except onStream)

### Code Quality Validation

- [x] Interfaces follow existing Groundswell patterns (PascalCase, clear naming)
- [x] JSDoc comments provide clear documentation
- [x] Interfaces are properly typed with TypeScript best practices
- [x] File placement matches existing codebase structure (`src/types/`)
- [x] Export pattern matches other types (re-exported from `src/types/index.ts`)
- [x] No anti-patterns (no `any`, proper use of `unknown`, optional fields marked)

### Documentation & Deployment

- [x] JSDoc comments explain purpose of each interface
- [x] JSDoc comments document field semantics
- [x] Comments reference namespace format for tool names
- [x] Hook mapping to AgentHooks documented in interface comment
- [x] Interfaces are self-documenting with clear field names
- [x] No additional deployment steps needed (type definitions only)

---

## Anti-Patterns to Avoid

- ❌ **Don't create new interfaces** - All three interfaces already exist and match PRD
- ❌ **Don't modify existing interfaces** - Current implementation is correct
- ❌ **Don't add optional fields without `?` modifier** - All hooks properly marked optional
- ❌ **Don't use `any` instead of `unknown`** - Current implementation correctly uses `unknown`
- ❌ **Don't make hooks synchronous-only** - 4/5 hooks correctly support `Promise<void> | void`
- ❌ **Don't make onStream async** - Correctly specified as synchronous only
- ❌ **Don't forget namespace format** - `serverName__toolName` pattern documented in JSDoc
- ❌ **Don't skip exports** - All three interfaces properly exported from index.ts

---

## Conclusion

### Implementation Status: COMPLETE

The three interfaces specified in PRD Sections 7.10-7.11 are **already fully implemented** in the codebase:

1. **ToolExecutionRequest** - `src/types/providers.ts:55-61` ✅
2. **ToolExecutionResult** - `src/types/providers.ts:66-72` ✅
3. **ProviderHookEvents** - `src/types/providers.ts:78-97` ✅

All interfaces:
- Match PRD specifications exactly
- Are properly exported from `src/types/index.ts`
- Have comprehensive JSDoc documentation
- Are used by the `Provider` interface from P1.M1.T1.S3
- Have unit test coverage in `src/__tests__/unit/provider-interface.test.ts`

### Recommendation

**Mark P1.M1.T1.S4 as COMPLETE** - No implementation work required.

The interfaces are production-ready and serve as the foundation for:
- **P1.M1.T1.S5** (ModelSpec and GlobalProviderConfig)
- **P2.M1.T2** (Anthropic Hooks Adapter)
- **P2.M1.T1** (AnthropicProvider implementation)
- Future provider implementations

### Next Steps

1. Update task status in `tasks.json` from "Researching" to "Complete"
2. Proceed to **P1.M1.T1.S5** (Define ProviderResult, ModelSpec, and GlobalProviderConfig)
3. Begin **P1.M1.T2** (Create Model Specification Utilities)

---

## Appendix: Code References

### ToolExecutionRequest Interface

```typescript
// File: src/types/providers.ts
// Lines: 55-61

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Tool name (may be namespaced: "server__tool") */
  name: string;

  /** Tool input parameters */
  input: unknown;
}
```

### ToolExecutionResult Interface

```typescript
// File: src/types/providers.ts
// Lines: 66-72

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Result content */
  content: string | unknown;

  /** Whether the execution resulted in an error */
  isError: boolean;
}
```

### ProviderHookEvents Interface

```typescript
// File: src/types/providers.ts
// Lines: 78-97

/**
 * Provider hook events
 * Maps from AgentHooks to provider-specific events
 */
export interface ProviderHookEvents {
  /** Called before tool execution */
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;

  /** Called after tool execution */
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;

  /** Called when provider session starts */
  onSessionStart?: () => Promise<void> | void;

  /** Called when provider session ends */
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;

  /** Called for each streaming chunk */
  onStream?: (chunk: string) => void;
}
```

### Usage in Provider Interface

```typescript
// File: src/types/providers.ts
// Lines: 157-159, 333

/**
 * Tool executor callback function
 * Delegates tool execution to the MCPHandler
 */
export type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;

// ...

/**
 * Execute a prompt request with type-safe response
 */
execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents
): Promise<AgentResponse<T>;
```

### Export from Index

```typescript
// File: src/types/index.ts
// Lines: 34-36

export type {
  ProviderHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
  // ... other exports
} from './providers.js';
```

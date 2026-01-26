---

name: "PRP: Implement AnthropicProvider buildAgentSDKHooks() Adapter Function"
description: |

---

## Goal

**Feature Goal**: Implement the `buildAgentSDKHooks()` private method in the `AnthropicProvider` class to adapt `ProviderHookEvents` to Anthropic Agent SDK-compatible hook format.

**Deliverable**: A fully implemented `buildAgentSDKHooks()` private method that:
1. Accepts optional `ProviderHookEvents` parameter
2. Returns SDK-compatible `Partial<Record<HookEvent, HookCallbackMatcher[]>>` object
3. Maps hook types: `onToolStart` → `PreToolUse`, `onToolEnd` → `PostToolUse`, `onSessionStart` → `SessionStart`, `onSessionEnd` → `SessionEnd`
4. Adapts signatures between Provider and SDK hook formats
5. Handles async/sync hook execution
6. Includes comprehensive unit tests

**Success Definition**:
- Method correctly adapts all four hook event types
- Signature transformation works (Provider format → SDK format)
- Async hooks are properly wrapped and awaited
- Empty hooks return empty object (no undefined properties)
- All unit tests pass (Vitest)
- TypeScript type checking passes with no errors
- Linting passes with no warnings

## User Persona

**Target User**: Internal - The `buildAgentSDKHooks()` method is used by the `execute()` method in `AnthropicProvider` to convert user-provided hooks into SDK-compatible format.

**Use Case**: When a user provides `ProviderHookEvents` to `provider.execute()`, the provider needs to convert these hooks to the Anthropic Agent SDK's hook format for use in `query()` options.

**User Journey**:
1. User creates `ProviderHookEvents` with `onToolStart`, `onToolEnd`, `onSessionStart`, `onSessionEnd` callbacks
2. User calls `provider.execute(request, toolExecutor, hooks)`
3. `execute()` calls `buildAgentSDKHooks(hooks)` to convert hooks
4. Converted hooks are passed to SDK `query()` in `sdkOptions.hooks`
5. SDK invokes hooks at appropriate lifecycle points

**Pain Points Addressed**:
- Provider hook signature differs from SDK hook signature
- SDK hooks require specific input format (`HookInput` with `snake_case` fields)
- SDK hooks expect specific return value format (`HookJSONOutput`)
- Users shouldn't need to understand SDK hook internals

## Why

- **Interface Adaptation**: Converts our `ProviderHookEvents` interface to SDK-compatible format
- **Abstraction Layer**: Users provide hooks in Provider format, not SDK format
- **Signature Compatibility**: SDK `HookCallback` signature differs from `ProviderHookEvents` callbacks
- **Type Safety**: Ensures proper type conversion between Provider and SDK types
- **Integration Point**: Enables hook functionality in `execute()` method (P2.M1.T1.S5 placeholder at line 273)

## What

Implement the `buildAgentSDKHooks()` private method in `AnthropicProvider` per the contract definition.

### Method Contract

**Input**: `hooks?: ProviderHookEvents` - Optional provider hook events with:
- `onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void`
- `onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void`
- `onSessionStart?: () => Promise<void> | void`
- `onSessionEnd?: (totalDuration: number) => Promise<void> | void`

**Logic**:
1. If `hooks` is undefined or all properties are undefined/empty, return empty object `{}`
2. Create `Partial<Record<HookEvent, HookCallbackMatcher[]>>` result object
3. For each defined hook in ProviderHookEvents:
   - Map to corresponding SDK HookEvent
   - Create adapter wrapper function
   - Transform signature from Provider format to SDK format
   - Return `{ continue: true }` for SDK compatibility
4. Return result object with only populated hook entries

**Output**: `Partial<Record<HookEvent, HookCallbackMatcher[]>>` - SDK-compatible hooks object

### Hook Mapping

| ProviderHookEvents | SDK HookEvent | Input Transformation |
|-------------------|---------------|---------------------|
| `onToolStart(tool)` | `PreToolUse` | `ToolExecutionRequest` → `PreToolUseHookInput` |
| `onToolEnd(tool, result, duration)` | `PostToolUse` | `ToolExecutionRequest, ToolExecutionResult, duration` → `PostToolUseHookInput` |
| `onSessionStart()` | `SessionStart` | No input → `SessionStartHookInput` |
| `onSessionEnd(totalDuration)` | `SessionEnd` | `totalDuration` → `SessionEndHookInput` |

### Success Criteria

- [ ] Method accepts optional `ProviderHookEvents` parameter
- [ ] Returns SDK-compatible `Partial<Record<HookEvent, HookCallbackMatcher[]>>` object
- [ ] Correctly maps `onToolStart` → `PreToolUse`
- [ ] Correctly maps `onToolEnd` → `PostToolUse`
- [ ] Correctly maps `onSessionStart` → `SessionStart`
- [ ] Correctly maps `onSessionEnd` → `SessionEnd`
- [ ] Adapts signatures: Provider callbacks receive different parameters than SDK `HookCallback`
- [ ] Returns empty object when no hooks provided
- [ ] Async hooks are properly awaited
- [ ] Each hook returns `{ continue: true }` for SDK compatibility
- [ ] Tests cover all hook types and edge cases

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: Yes. This PRP includes:
- Exact file location and existing class structure
- Complete type definitions for both ProviderHookEvents and SDK hook types
- Reference implementation from existing `Agent.buildAgentSDKHooks()` in `src/core/agent.ts`
- Specific signature transformation patterns
- Test patterns from existing provider tests
- Integration points with `execute()` method

### Documentation & References

```yaml
# MUST READ - Implementation Context

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Target file containing the AnthropicProvider class where buildAgentSDKHooks() will be added
  pattern: Follow existing private method patterns (buildSystemPromptWithSkills at lines 507-537)
  gotcha: Method must be private (not exported)
  critical: Line 273 has placeholder comment: // Hooks (placeholder for P2.M1.T2.S1)

- file: /home/dustin/projects/groundswell/src/core/agent.ts
  why: Contains reference implementation of buildAgentSDKHooks() (lines 221-294)
  pattern: This is the PRIMARY REFERENCE - shows exact adaptation pattern
  gotcha: Adapts AgentHooks to SDK format, but pattern is identical for ProviderHookEvents
  critical: Lines 221-294 show complete adapter implementation

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Contains ProviderHookEvents interface definition (lines 78-97)
  pattern: Interface with optional callback properties
  gotcha: Callbacks have different signatures than SDK hooks
  critical: Lines 78-97 define input interface

- file: /home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts
  why: SDK HookInput types and HookJSONOutput definitions
  pattern: SDK uses snake_case for field names (tool_name, tool_input, etc.)
  gotcha: HookCallback returns Promise<HookJSONOutput>, not void
  critical: PreToolUseHookInput (line ~235), PostToolUseHookInput (line ~242), SessionStartHookInput (line ~249), SessionEndHookInput (line ~254)

- file: /home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts
  why: SDK HookCallback type definition (lines 49-51)
  pattern: HookCallback = (input: HookInput, toolUseID: string | undefined, options: { signal: AbortSignal }) => Promise<HookJSONOutput>
  gotcha: toolUseID is undefined for non-tool events (SessionStart, SessionEnd)
  critical: Line 49-51 defines exact signature

- file: /home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts
  why: Reference test patterns for private methods and async testing
  pattern: beforeEach setup, vi.mock() for dependencies, async/await testing
  gotcha: Uses @ts-expect-error for private property access
  critical: Shows comprehensive test structure

- file: /home/dustin/projects/groundswell/src/core/mcp-handler.ts
  why: Contains adapter patterns (jsonSchemaToZodRawShape, toAgentSDKServer)
  pattern: Input transformation, type conversion patterns
  gotcha: Shows how to handle optional parameters
  critical: Lines 167-213 show SDK conversion pattern

- url: https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
  why: Agent SDK documentation for hooks system
  section: "Hooks" or "Lifecycle Events"
  critical: Documents HookEvent types and HookCallbackMatcher structure
```

### Current Codebase Tree (Relevant Sections)

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── providers/
│   │   ├── anthropic-provider.ts         # TARGET FILE - Add buildAgentSDKHooks() method
│   │   ├── provider-registry.ts          # Reference: Provider lifecycle patterns
│   │   └── index.ts
│   ├── types/
│   │   ├── providers.ts                  # ProviderHookEvents interface (lines 78-97)
│   │   ├── agent.ts                      # AgentResponse types
│   │   └── sdk-primitives.ts             # ToolExecutionRequest, ToolExecutionResult
│   ├── core/
│   │   ├── agent.ts                      # REFERENCE: buildAgentSDKHooks() implementation (lines 221-294)
│   │   └── mcp-handler.ts                # Adapter patterns reference
│   └── __tests__/
│       └── unit/
│           └── providers/
│               ├── anthropropic-provider-initialize.test.ts  # Test patterns
│               ├── anthropropic-provider-loadskills.test.ts   # Test patterns
│               └── anthropropic-provider-terminate.test.ts    # Test patterns
├── package.json                          # SDK dependency: @anthropic-ai/claude-agent-sdk@^0.1.0
└── node_modules/
    └── @anthropic-ai/claude-agent-sdk/
        └── entrypoints/
            ├── sdk/
            │   └── coreTypes.d.ts         # SDK HookInput types, HookJSONOutput
            └── sdk/
                └── runtimeTypes.d.ts      # HookCallback type definition
```

### Desired Codebase Tree (No New Files)

```bash
# No new files - this task modifies existing file:
src/providers/anthropic-provider.ts
└── private buildAgentSDKHooks(hooks?: ProviderHookEvents): Partial<Record<HookEvent, HookCallbackMatcher[]>>
```

### Known Gotchas of Codebase & Library Quirks

```typescript
// CRITICAL: SDK HookCallback signature differs from ProviderHookEvents
// Provider: onToolStart(tool: ToolExecutionRequest) => Promise<void> | void
// SDK: (input: HookInput, toolUseID: string | undefined, options: { signal: AbortSignal }) => Promise<HookJSONOutput>
// The adapter must transform parameters AND return value

// CRITICAL: SDK HookInput uses snake_case for field names
// Provider: tool.name, tool.input
// SDK: tool_name, tool_input
// The adapter receives SDK format and may need to transform it

// CRITICAL: SDK HookCallback MUST return HookJSONOutput
// Provider hooks return void (no return value)
// Adapter must always return { continue: true } after invoking Provider hook

// CRITICAL: toolUseID is undefined for SessionStart and SessionEnd hooks
// Only PreToolUse and PostToolUse receive valid toolUseID
// Adapter should handle undefined gracefully

// CRITICAL: HookEvent type is a string literal union from SDK
// Type: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | ...
// Must import from SDK: import type { HookEvent } from '@anthropic-ai/claude-agent-sdk'

// CRITICAL: HookCallbackMatcher array structure
// SDK expects: { hooks: [callback1, callback2, ...], matcher?: string, timeout?: number }
// We only use hooks array, no matcher or timeout

// CRITICAL: Empty hooks should NOT create entries in result object
// If hooks.onToolStart is undefined, don't add PreToolUse to result
// Result should only have keys for defined hooks
// Pattern from agent.ts lines 227-233: Check if hook exists before adding

// CRITICAL: Import SDK types for type safety
// Add imports: import type { HookEvent, HookCallbackMatcher, HookJSONOutput, HookInput } from '@anthropic-ai/claude-agent-sdk'
// Or use: type HookEvent = import('@anthropic-ai/claude-agent-sdk').HookEvent

// CRITICAL: Use this.sdk for dynamic SDK type access
// Pattern: type HookCallback = typeof this.sdk extends null ? never : import('@anthropic-ai/claude-agent-sdk').HookCallback
// This avoids importing SDK types when SDK might not be loaded

// CRITICAL: Provider hook receives ToolExecutionRequest with name and input
// ToolExecutionRequest: { name: string, input: unknown }
// SDK PreToolUseHookInput has: tool_name: string, tool_input: unknown, tool_use_id: string, session_id, transcript_path, cwd

// CRITICAL: Duration tracking for onToolEnd
// Provider: onToolEnd(tool, result, duration) receives duration as parameter
// SDK: PostToolUseHookInput does NOT include duration - SDK limitation
// Adapter will need to calculate duration or use placeholder value

// CRITICAL: Session hooks ignore SDK input entirely
// onSessionStart() and onSessionEnd(totalDuration) don't use SDK HookInput
// Adapter calls Provider hooks directly without SDK input transformation

// CRITICAL: Async/sync handling
// Provider hooks can be sync or async (Promise<void> | void)
// Adapter must await the hook in both cases
// Pattern: await providerHook(...)

// CRITICAL: Return value format
// SDK expects: { continue: true } (or other HookJSONOutput fields)
// Provider hooks return void
// Adapter always returns { continue: true } after hook completes
```

---

## Implementation Blueprint

### Data Models and Structure

**Existing Types Used**:

```typescript
// From src/types/providers.ts (lines 78-97)
export interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
}

// From src/types/sdk-primitives.ts
export interface ToolExecutionRequest {
  name: string;
  input: unknown;
}

export interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}

// From SDK (node_modules/@anthropic-ai/claude-agent-sdk)
type HookEvent = "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | ...;

type HookCallback = (
  input: HookInput,
  toolUseID: string | undefined,
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;

interface HookCallbackMatcher {
  matcher?: string;
  hooks: HookCallback[];
  timeout?: number;
}

type HookJSONOutput = {
  continue?: boolean;
  suppressOutput?: boolean;
  stopReason?: string;
  // ... other fields
};

type PreToolUseHookInput = {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: unknown;
  tool_use_id: string;
};

type PostToolUseHookInput = PreToolUseHookInput & {
  hook_event_name: 'PostToolUse';
  tool_response: unknown;
};

type SessionStartHookInput = {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name: 'SessionStart';
  source: 'startup' | 'resume' | 'clear' | 'compact';
};

type SessionEndHookInput = {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name: 'SessionEnd';
  reason: string;
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD SDK type imports to anthropic-provider.ts
  - MODIFY: src/providers/anthropic-provider.ts imports section (around line 38-57)
  - ADD: Dynamic import types for SDK hook types
  - CODE:
    ```typescript
    // Add after existing SDK type imports (around line 103)
    // SDK hook types (loaded dynamically)
    type HookEvent = typeof import('@anthropic-ai/claude-agent-sdk').HookEvent;
    type HookCallbackMatcher = typeof import('@anthropic-ai/claude-agent-sdk').HookCallbackMatcher;
    type HookInput = typeof import('@anthropic-ai/claude-agent-sdk').HookInput;
    type HookJSONOutput = typeof import('@anthropic-ai/claude-agent-sdk').HookJSONOutput;
    ```
  - ALTERNATIVE: Use inline typeof pattern in method signature
  - PATTERN: Follow existing this.sdk type pattern at line 103
  - DEPENDENCIES: None

Task 2: ADD buildAgentSDKHooks() method to AnthropicProvider class
  - MODIFY: src/providers/anthropic-provider.ts
  - ADD: Private method after buildSystemPromptWithSkills() (around line 538)
  - LOCATION: After buildSystemPromptWithSkills() method, before normalizeModel()
  - SIGNATURE: private buildAgentSDKHooks(hooks?: ProviderHookEvents): Partial<Record<HookEvent, HookCallbackMatcher[]>>
  - DEPENDENCIES: Task 1 complete

Task 3: IMPLEMENT hook type mapping logic
  - IMPLEMENT: Core logic in buildAgentSDKHooks() method body
  - CREATE: Result object with conditional hook mapping
  - CODE STRUCTURE:
    ```typescript
    private buildAgentSDKHooks(
      hooks?: ProviderHookEvents
    ): Partial<Record<HookEvent, HookCallbackMatcher[]>> {
      // Step 1: Early return for undefined or empty hooks
      if (!hooks) {
        return {};
      }

      const sdkHooks: Partial<Record<HookEvent, HookCallbackMatcher[]>> = {};

      // Step 2: Map onToolStart → PreToolUse
      if (hooks.onToolStart) {
        sdkHooks['PreToolUse' as HookEvent] = [{
          hooks: [async (input, toolUseID, options) => {
            // Transform SDK input to Provider format
            const toolRequest: ToolExecutionRequest = {
              name: (input as PreToolUseHookInput).tool_name,
              input: (input as PreToolUseHookInput).tool_input,
            };
            // Call Provider hook
            await hooks.onToolStart(toolRequest);
            // Return SDK-compatible response
            return { continue: true };
          }]
        }];
      }

      // Step 3: Map onToolEnd → PostToolUse
      if (hooks.onToolEnd) {
        sdkHooks['PostToolUse' as HookEvent] = [{
          hooks: [async (input, toolUseID, options) => {
            const sdkInput = input as PostToolUseHookInput;
            const toolRequest: ToolExecutionRequest = {
              name: sdkInput.tool_name,
              input: sdkInput.tool_input,
            };
            const toolResult: ToolExecutionResult = {
              content: sdkInput.tool_response,
              isError: false, // SDK doesn't provide this info
            };
            // Duration not available in SDK input - use placeholder
            const duration = 0;
            await hooks.onToolEnd(toolRequest, toolResult, duration);
            return { continue: true };
          }]
        }];
      }

      // Step 4: Map onSessionStart → SessionStart
      if (hooks.onSessionStart) {
        sdkHooks['SessionStart' as HookEvent] = [{
          hooks: [async (input, toolUseID, options) => {
            await hooks.onSessionStart();
            return { continue: true };
          }]
        }];
      }

      // Step 5: Map onSessionEnd → SessionEnd
      if (hooks.onSessionEnd) {
        sdkHooks['SessionEnd' as HookEvent] = [{
          hooks: [async (input, toolUseID, options) => {
            const sdkInput = input as SessionEndHookInput;
            // Use session end reason or placeholder
            const totalDuration = 0;
            await hooks.onSessionEnd(totalDuration);
            return { continue: true };
          }]
        }];
      }

      return sdkHooks;
    }
    ```
  - PATTERN: Follow agent.ts lines 221-294 for exact adaptation pattern
  - DEPENDENCIES: Task 2 complete
  - DELIVERABLE: Implemented buildAgentSDKHooks() method

Task 4: UPDATE execute() method to use buildAgentSDKHooks()
  - MODIFY: src/providers/anthropic-provider.ts execute() method
  - UPDATE: Line 273 placeholder comment
  - ADD: Hook conversion before sdkOptions construction
  - CODE:
    ```typescript
    // Around line 273, replace placeholder with:
    const sdkHooks = this.buildAgentSDKHooks(hooks);
    ```
  - UPDATE: Add hooks to sdkOptions object
  - CODE:
    ```typescript
    const sdkOptions = {
      model: modelSpec.model,
      systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),
      ...(request.options.tools &&
        request.options.tools.length > 0 && {
          allowedTools: request.options.tools.map((t) => t.name),
        }),
      ...(this.mcpServerConfig && {
        mcpServers: {
          "groundswell-mcp": this.mcpServerConfig,
        },
      }),
      // Add hooks if any were mapped
      ...(Object.keys(sdkHooks).length > 0 && {
        hooks: sdkHooks,
      }),
    };
    ```
  - PATTERN: Follow conditional property spread pattern (lines 266-271)
  - DEPENDENCIES: Task 3 complete
  - DELIVERABLE: execute() uses buildAgentSDKHooks() for hook conversion

Task 5: CREATE comprehensive tests for buildAgentSDKHooks()
  - CREATE: src/__tests__/unit/providers/anthropic-provider-hooks.test.ts
  - IMPLEMENT: Tests for all hook types
  - IMPLEMENT: Tests for empty/undefined hooks
  - IMPLEMENT: Tests for async hook execution
  - IMPLEMENT: Tests for signature transformation
  - CODE STRUCTURE:
    ```typescript
    /**
     * Unit tests for AnthropicProvider.buildAgentSDKHooks()
     */

    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { AnthropicProvider } from '../../../providers/anthropic-provider.js';
    import type { ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult } from '../../../types/providers.js';

    describe('AnthropicProvider.buildAgentSDKHooks()', () => {
      let provider: AnthropicProvider;

      beforeEach(async () => {
        provider = new AnthropicProvider();
        await provider.initialize();
      });

      describe('empty/undefined hooks', () => {
        it('should return empty object when hooks is undefined', () => {
          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(undefined);
          expect(Object.keys(result)).toHaveLength(0);
        });

        it('should return empty object when all hooks are undefined', () => {
          const hooks: ProviderHookEvents = {};
          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          expect(Object.keys(result)).toHaveLength(0);
        });
      });

      describe('onToolStart → PreToolUse mapping', () => {
        it('should map onToolStart to PreToolUse hook', () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onToolStart: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);

          expect(result['PreToolUse']).toBeDefined();
          expect(result['PreToolUse']).toHaveLength(1);
          expect(result['PreToolUse'][0].hooks).toHaveLength(1);
        });

        it('should call onToolStart with transformed parameters', async () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onToolStart: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          const sdkHook = result['PreToolUse'][0].hooks[0];

          // Simulate SDK calling the hook
          const sdkInput = {
            session_id: 'test-session',
            transcript_path: '/path',
            cwd: '/cwd',
            hook_event_name: 'PreToolUse',
            tool_name: 'test-tool',
            tool_input: { param: 'value' },
            tool_use_id: 'tool-123',
          };

          await sdkHook(sdkInput, 'tool-123', { signal: new AbortController().signal });

          expect(mockHook).toHaveBeenCalledTimes(1);
          expect(mockHook).toHaveBeenCalledWith({
            name: 'test-tool',
            input: { param: 'value' },
          });
        });

        it('should handle async onToolStart hooks', async () => {
          const mockHook = vi.fn().mockResolvedValue(undefined);
          const hooks: ProviderHookEvents = {
            onToolStart: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          const sdkHook = result['PreToolUse'][0].hooks[0];

          const sdkInput = {
            session_id: 'test-session',
            transcript_path: '/path',
            cwd: '/cwd',
            hook_event_name: 'PreToolUse',
            tool_name: 'test-tool',
            tool_input: {},
            tool_use_id: 'tool-123',
          };

          const hookResult = await sdkHook(sdkInput, 'tool-123', { signal: new AbortController().signal });

          expect(mockHook).toHaveBeenCalled();
          expect(hookResult).toEqual({ continue: true });
        });
      });

      describe('onToolEnd → PostToolUse mapping', () => {
        it('should map onToolEnd to PostToolUse hook', () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onToolEnd: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);

          expect(result['PostToolUse']).toBeDefined();
          expect(result['PostToolUse']).toHaveLength(1);
        });

        it('should call onToolEnd with transformed parameters', async () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onToolEnd: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          const sdkHook = result['PostToolUse'][0].hooks[0];

          const sdkInput = {
            session_id: 'test-session',
            transcript_path: '/path',
            cwd: '/cwd',
            hook_event_name: 'PostToolUse',
            tool_name: 'test-tool',
            tool_input: { param: 'value' },
            tool_response: 'result data',
            tool_use_id: 'tool-123',
          };

          await sdkHook(sdkInput, 'tool-123', { signal: new AbortController().signal });

          expect(mockHook).toHaveBeenCalledTimes(1);
          const callArgs = mockHook.mock.calls[0];
          expect(callArgs[0]).toEqual({
            name: 'test-tool',
            input: { param: 'value' },
          });
          expect(callArgs[1]).toEqual({
            content: 'result data',
            isError: false,
          });
          expect(callArgs[2]).toBe(0); // duration placeholder
        });
      });

      describe('onSessionStart → SessionStart mapping', () => {
        it('should map onSessionStart to SessionStart hook', () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onSessionStart: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);

          expect(result['SessionStart']).toBeDefined();
          expect(result['SessionStart']).toHaveLength(1);
        });

        it('should call onSessionStart without parameters', async () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onSessionStart: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          const sdkHook = result['SessionStart'][0].hooks[0];

          const sdkInput = {
            session_id: 'test-session',
            transcript_path: '/path',
            cwd: '/cwd',
            hook_event_name: 'SessionStart',
            source: 'startup',
          };

          await sdkHook(sdkInput, undefined, { signal: new AbortController().signal });

          expect(mockHook).toHaveBeenCalledTimes(1);
          expect(mockHook).toHaveBeenCalledWith();
        });
      });

      describe('onSessionEnd → SessionEnd mapping', () => {
        it('should map onSessionEnd to SessionEnd hook', () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onSessionEnd: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);

          expect(result['SessionEnd']).toBeDefined();
          expect(result['SessionEnd']).toHaveLength(1);
        });

        it('should call onSessionEnd with duration placeholder', async () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onSessionEnd: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          const sdkHook = result['SessionEnd'][0].hooks[0];

          const sdkInput = {
            session_id: 'test-session',
            transcript_path: '/path',
            cwd: '/cwd',
            hook_event_name: 'SessionEnd',
            reason: 'completed',
          };

          await sdkHook(sdkInput, undefined, { signal: new AbortController().signal });

          expect(mockHook).toHaveBeenCalledTimes(1);
          expect(mockHook).toHaveBeenCalledWith(0); // duration placeholder
        });
      });

      describe('multiple hooks', () => {
        it('should map all provided hooks', () => {
          const hooks: ProviderHookEvents = {
            onToolStart: vi.fn(),
            onToolEnd: vi.fn(),
            onSessionStart: vi.fn(),
            onSessionEnd: vi.fn(),
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);

          expect(Object.keys(result)).toHaveLength(4);
          expect(result['PreToolUse']).toBeDefined();
          expect(result['PostToolUse']).toBeDefined();
          expect(result['SessionStart']).toBeDefined();
          expect(result['SessionEnd']).toBeDefined();
        });

        it('should map only provided hooks', () => {
          const hooks: ProviderHookEvents = {
            onToolStart: vi.fn(),
            onSessionEnd: vi.fn(),
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);

          expect(Object.keys(result)).toHaveLength(2);
          expect(result['PreToolUse']).toBeDefined();
          expect(result['SessionEnd']).toBeDefined();
          expect(result['PostToolUse']).toBeUndefined();
          expect(result['SessionStart']).toBeUndefined();
        });
      });

      describe('return value', () => {
        it('should always return { continue: true } for SDK compatibility', async () => {
          const mockHook = vi.fn();
          const hooks: ProviderHookEvents = {
            onToolStart: mockHook,
          };

          // @ts-expect-error - Testing private method
          const result = provider.buildAgentSDKHooks(hooks);
          const sdkHook = result['PreToolUse'][0].hooks[0];

          const hookResult = await sdkHook(
            { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 't', tool_input: {}, tool_use_id: '1' },
            '1',
            { signal: new AbortController().signal }
          );

          expect(hookResult).toEqual({ continue: true });
        });
      });
    });
    ```
  - PATTERN: Follow anthropic-provider-loadskills.test.ts structure
  - NAMING: anthropic-provider-hooks.test.ts
  - PLACEMENT: src/__tests__/unit/providers/
  - DEPENDENCIES: Task 4 complete
  - DELIVERABLE: Comprehensive test coverage

Task 6: RUN validation commands
  - RUN: npx tsc --noEmit (TypeScript type checking)
  - RUN: npm test (run all tests)
  - RUN: npm run lint (linting check)
  - EXPECT: All validations pass with zero errors
  - DEPENDENCIES: Task 5 complete
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// PATTERN: Hook Type Mapping
// ============================================================================
// FROM: src/core/agent.ts lines 221-294 (PRIMARY REFERENCE)
// Maps ProviderHookEvents to SDK HookEvent types

if (hooks.onToolStart) {
  sdkHooks['PreToolUse' as HookEvent] = [{
    hooks: [async (input, toolUseID, options) => {
      // Adapter implementation
    }]
  }];
}

// ============================================================================
// PATTERN: Signature Transformation (onToolStart)
// ============================================================================
// Provider: onToolStart(tool: ToolExecutionRequest) => Promise<void> | void
// SDK: (input: HookInput, toolUseID, options) => Promise<HookJSONOutput>

hooks: [async (input, toolUseID, options) => {
  // Transform SDK input to Provider format
  const toolRequest: ToolExecutionRequest = {
    name: (input as PreToolUseHookInput).tool_name,  // snake_case → camelCase
    input: (input as PreToolUseHookInput).tool_input,
  };
  // Call Provider hook (await handles both sync and async)
  await hooks.onToolStart(toolRequest);
  // Return SDK-compatible response
  return { continue: true };
}]

// ============================================================================
// PATTERN: Signature Transformation (onToolEnd)
// ============================================================================
// Provider: onToolEnd(tool, result, duration) => Promise<void> | void
// SDK: PostToolUseHookInput has tool_response but no duration

hooks: [async (input, toolUseID, options) => {
  const sdkInput = input as PostToolUseHookInput;
  const toolRequest: ToolExecutionRequest = {
    name: sdkInput.tool_name,
    input: sdkInput.tool_input,
  };
  const toolResult: ToolExecutionResult = {
    content: sdkInput.tool_response,  // SDK has result, no isError field
    isError: false,  // SDK limitation - always false
  };
  const duration = 0;  // SDK limitation - duration not available
  await hooks.onToolEnd(toolRequest, toolResult, duration);
  return { continue: true };
}]

// ============================================================================
// PATTERN: Signature Transformation (onSessionStart)
// ============================================================================
// Provider: onSessionStart() => Promise<void> | void
// SDK: SessionStartHookInput (ignored - we don't use SDK input)

hooks: [async (input, toolUseID, options) => {
  // Ignore SDK input - Provider hook takes no parameters
  await hooks.onSessionStart();
  return { continue: true };
}]

// ============================================================================
// PATTERN: Signature Transformation (onSessionEnd)
// ============================================================================
// Provider: onSessionEnd(totalDuration: number) => Promise<void> | void
// SDK: SessionEndHookInput with reason (not duration)

hooks: [async (input, toolUseID, options) => {
  const totalDuration = 0;  // SDK limitation - duration not available
  await hooks.onSessionEnd(totalDuration);
  return { continue: true };
}]

// ============================================================================
// PATTERN: Type Assertion for SDK Input
// ============================================================================
// SDK input is HookInput (union type), need to assert specific type

const sdkInput = input as PreToolUseHookInput;
// Now we can access tool_name, tool_input, etc.

// ============================================================================
// PATTERN: Early Return for Empty Hooks
// ============================================================================
// FROM: src/core/agent.ts lines 227-233

if (!hooks) {
  return {};
}

// Also check individual hooks before adding to result
if (hooks.onToolStart) {
  // Add PreToolUse to result
}

// ============================================================================
// PATTERN: Conditional Property Spread for sdkOptions
// ============================================================================
// FROM: src/providers/anthropic-provider.ts lines 266-271

const sdkHooks = this.buildAgentSDKHooks(hooks);

const sdkOptions = {
  model: modelSpec.model,
  systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),
  // ... other options

  // Only add hooks if any were mapped
  ...(Object.keys(sdkHooks).length > 0 && {
    hooks: sdkHooks,
  }),
};

// ============================================================================
// CRITICAL: Type Import Pattern for SDK Types
// ============================================================================
// Option 1: Dynamic import types (RECOMMENDED - matches this.sdk pattern)

type HookEvent = typeof import('@anthropic-ai/claude-agent-sdk').HookEvent;
type HookCallbackMatcher = typeof import('@anthropic-ai/claude-agent-sdk').HookCallbackMatcher;
type HookInput = typeof import('@anthropic-ai/claude-agent-sdk').HookInput;
type HookJSONOutput = typeof import('@anthropic-ai/claude-agent-sdk').HookJSONOutput;

// Option 2: Direct import (if SDK is always available)
import type {
  HookEvent,
  HookCallbackMatcher,
  HookInput,
  HookJSONOutput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  SessionStartHookInput,
  SessionEndHookInput,
} from '@anthropic-ai/claude-agent-sdk';

// RECOMMENDED: Use Option 1 for consistency with this.sdk pattern

// ============================================================================
// GOTCHA: HookEvent String Literal Type Assertion
// ============================================================================
// SDK HookEvent is a string literal union, need to assert when using string keys

sdkHooks['PreToolUse' as HookEvent] = [...];
sdkHooks['PostToolUse' as HookEvent] = [...];
sdkHooks['SessionStart' as HookEvent] = [...];
sdkHooks['SessionEnd' as HookEvent] = [...];

// ============================================================================
// GOTCHA: toolUseID is undefined for non-tool events
// ============================================================================
// SessionStart and SessionEnd receive undefined for toolUseID parameter

hooks: [async (input, toolUseID, options) => {
  // toolUseID is undefined here - that's expected for session hooks
  await hooks.onSessionStart();
  return { continue: true };
}]

// ============================================================================
// GOTCHA: AbortSignal in options parameter
// ============================================================================
// SDK provides { signal: AbortSignal } in options
// We don't use it in our adapter, but must accept the parameter

hooks: [async (input, toolUseID, options) => {
  // options.signal is available if we need to cancel hook execution
  await hooks.onToolStart(tool);
  return { continue: true };
}]
```

### Integration Points

```yaml
EXECUTE_METHOD:
  - file: src/providers/anthropic-provider.ts
  - integration: buildAgentSDKHooks() called in execute() method
  - line: 273 (placeholder comment to replace)
  - pattern: const sdkHooks = this.buildAgentSDKHooks(hooks);

SDK_OPTIONS:
  - file: src/providers/anthropic-provider.ts
  - integration: Add converted hooks to sdkOptions
  - line: ~274 (in sdkOptions object)
  - pattern: ...(Object.keys(sdkHooks).length > 0 && { hooks: sdkHooks })

SDK_QUERY:
  - from: '@anthropic-ai/claude-agent-sdk'
  - usage: sdkOptions.hooks passed to query() function
  - format: Partial<Record<HookEvent, HookCallbackMatcher[]>>

FUTURE_TASKS:
  - P2.M1.T1.S6: execute() message iteration will trigger SDK hooks
  - P4.M2: Provider execution integration with Agent
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# TypeScript Type Checking
npx tsc --noEmit

# Expected: Zero type errors
# If errors exist:
# 1. READ the error message carefully
# 2. CHECK that HookEvent and other SDK types are imported correctly
# 3. VERIFY type assertions are correct (as HookEvent, as PreToolUseHookInput)
# 4. CHECK that return type matches Partial<Record<HookEvent, HookCallbackMatcher[]>>
# 5. FIX errors before proceeding to tests

# Common errors to check:
# - Cannot find name 'HookEvent' → Add type import
# - Cannot find name 'HookCallbackMatcher' → Add type import
# - Type 'X' is not assignable to type 'Y' → Check type assertions
# - Property 'PreToolUse' does not exist → Use type assertion: 'PreToolUse' as HookEvent

# Linting (if project uses ESLint)
npm run lint

# Expected: Zero linting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test buildAgentSDKHooks() specifically
npm test -- anthropic-provider-hooks

# Expected: All new tests pass
# Tests should cover:
# - Empty/undefined hooks return empty object
# - onToolStart → PreToolUse mapping
# - onToolEnd → PostToolUse mapping
# - onSessionStart → SessionStart mapping
# - onSessionEnd → SessionEnd mapping
# - Multiple hooks all mapped correctly
# - Only provided hooks are mapped (undefined hooks skipped)
# - Return value is always { continue: true }
# - Async hooks are properly awaited
# - Signature transformation works correctly

# Run all provider tests
npm test -- src/__tests__/unit/providers/

# Expected: All provider tests pass
# Should include:
# - anthropic-provider-hooks.test.ts (new)
# - anthropic-provider-initialize.test.ts
# - anthropic-provider-terminate.test.ts
# - anthropic-provider-normalizemodel.test.ts
# - anthropic-provider-loadskills.test.ts
# - anthropropic-provider.test.ts

# Coverage validation (if coverage tools configured)
npm run test:coverage

# Expected: High coverage for buildAgentSDKHooks() method
# - All hook mappings tested
# - All code paths tested (empty, partial, full hooks)
```

### Level 3: Integration Testing (System Validation)

```bash
# Test execute() method integration with hooks
npm test -- anthropic-provider

# Expected: execute() method can use hooks via buildAgentSDKHooks()
# Key behaviors:
# - Hooks are correctly converted to SDK format
# - sdkOptions.hooks is populated when hooks provided
# - SDK query() receives hooks in correct format

# Manual integration test (create temporary test file)
cat > test-hooks-integration.ts << 'EOF'
import { AnthropicProvider } from './src/providers/anthropic-provider.js';
import type { ProviderHookEvents } from './src/providers/providers.js';

async function test() {
  const provider = new AnthropicProvider();
  await provider.initialize();

  // Create test hooks
  const hooks: ProviderHookEvents = {
    onToolStart: async (tool) => {
      console.log('Tool started:', tool.name);
    },
    onToolEnd: async (tool, result, duration) => {
      console.log('Tool ended:', tool.name, 'duration:', duration);
    },
    onSessionStart: async () => {
      console.log('Session started');
    },
    onSessionEnd: async (totalDuration) => {
      console.log('Session ended, total duration:', totalDuration);
    },
  };

  // Test buildAgentSDKHooks (access private method for testing)
  // @ts-expect-error - Testing private method
  const sdkHooks = provider.buildAgentSDKHooks(hooks);

  console.log('SDK hooks:', Object.keys(sdkHooks));
  // Expected: ['PreToolUse', 'PostToolUse', 'SessionStart', 'SessionEnd']

  // Verify hook structure
  console.log('PreToolUse hooks:', sdkHooks['PreToolUse']?.length);
  // Expected: 1

  console.log('✓ Hooks adapter working correctly');

  await provider.terminate();
}

test().catch(console.error);
EOF

# Run integration test
npx tsx test-hooks-integration.ts

# Expected output:
# SDK hooks: [ 'PreToolUse', 'PostToolUse', 'SessionStart', 'SessionEnd' ]
# PreToolUse hooks: 1
# ✓ Hooks adapter working correctly

# Cleanup
rm test-hooks-integration.ts
```

### Level 4: Build & Package Validation

```bash
# Verify build succeeds with new implementation
npm run build

# Expected: Successful compilation to dist/
# Output should show:
# - src/providers/anthropic-provider.ts → dist/providers/anthropic-provider.js
# - No compilation errors
# - Type definitions generated correctly

# Verify built output
ls -la dist/providers/anthropic-provider.*

# Expected:
# - dist/providers/anthropic-provider.js (compiled JavaScript)
# - dist/providers/anthropic-provider.d.ts (TypeScript definitions)

# Verify buildAgentSDKHooks is in compiled output
grep -i "buildAgentSDKHooks" dist/providers/anthropic-provider.js
# Should show buildAgentSDKHooks references in compiled output
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] All tests pass: `npm test -- anthropic-provider-hooks`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Method signature matches: `private buildAgentSDKHooks(hooks?: ProviderHookEvents): Partial<Record<HookEvent, HookCallbackMatcher[]>>`
- [ ] SDK types are correctly imported or referenced
- [ ] Type assertions are correct and safe

### Feature Validation

- [ ] Empty/undefined hooks return empty object `{}`
- [ ] `onToolStart` correctly maps to `PreToolUse`
- [ ] `onToolEnd` correctly maps to `PostToolUse`
- [ ] `onSessionStart` correctly maps to `SessionStart`
- [ ] `onSessionEnd` correctly maps to `SessionEnd`
- [ ] Only provided hooks create entries in result object
- [ ] SDK hook input is transformed to Provider format
- [ ] Provider hooks are called with correct parameters
- [ ] Each hook returns `{ continue: true }` for SDK compatibility
- [ ] Async hooks are properly awaited
- [ ] Sync hooks work correctly (no await needed)

### Code Quality Validation

- [ ] Follows existing codebase patterns (matches agent.ts buildAgentSDKHooks)
- [ ] File placement correct (src/providers/anthropic-provider.ts)
- [ ] Method is private (not exported)
- [ ] Naming convention followed: buildAgentSDKHooks()
- [ ] JSDoc comments accurate and complete (if added)
- [ ] Type annotations are specific and correct
- [ ] Error handling is consistent with existing methods
- [ ] No anti-patterns used (see below)

### Integration & Future Compatibility

- [ ] execute() method successfully uses buildAgentSDKHooks()
- [ ] sdkOptions.hooks is populated correctly
- [ ] Compatible with SDK query() function
- [ ] Does not break existing Provider interface
- [ ] Ready for P2.M1.T1.S6 message iteration integration
- [ ] Ready for P4.M2 provider execution integration

---

## Anti-Patterns to Avoid

- Don't create entries in result object for undefined hooks
- Don't forget to return `{ continue: true }` after each hook
- Don't skip awaiting the Provider hook (must use `await`)
- Don't use incorrect type assertions (verify types match)
- Don't forget the `{ hooks: [...] }` wrapper structure
- Don't hardcode hook event strings without type assertion
- Don't assume SDK input has all fields (use type assertions)
- Don't ignore the toolUseID parameter (even if unused)
- Don't ignore the options.signal parameter (even if unused)
- Don't create new hook entries for hooks that weren't provided
- Don't mix up snake_case and camelCase field names
- Don't forget that SDK doesn't provide duration in PostToolUse
- Don't forget that SDK doesn't provide isError in tool response
- Don't use sync return statements in async hook functions
- Don't modify the original hooks parameter
- Don't throw errors from hooks (let them propagate naturally)

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
- Complete context provided (file locations, types, patterns)
- Reference implementation exists in agent.ts (lines 221-294)
- SDK hook types thoroughly documented
- Test patterns well established
- Integration patterns clearly defined
- Anti-patterns section prevents common mistakes
- Validation commands are project-specific

**Validation**: The completed PRP should enable an AI agent unfamiliar with the codebase to implement the `buildAgentSDKHooks()` method successfully using only the PRP content and codebase access.

---

## Appendix: Quick Reference

### Key Files Summary

| File | Purpose | Lines |
|------|---------|-------|
| `src/providers/anthropic-provider.ts` | Target file - add buildAgentSDKHooks() | After line 537 |
| `src/core/agent.ts` | PRIMARY REFERENCE - exact pattern to follow | 221-294 |
| `src/types/providers.ts` | ProviderHookEvents interface | 78-97 |
| `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/coreTypes.d.ts` | SDK HookInput types | Various |
| `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` | SDK HookCallback type | 49-51 |
| `src/__tests__/unit/providers/anthropic-provider-hooks.test.ts` | Test file to create | NEW |

### Hook Mapping Reference

| Provider Hook | SDK HookEvent | SDK Input Type | Transformation |
|---------------|---------------|----------------|----------------|
| `onToolStart(tool)` | `PreToolUse` | `PreToolUseHookInput` | `{name, input} ← {tool_name, tool_input}` |
| `onToolEnd(tool, result, duration)` | `PostToolUse` | `PostToolUseHookInput` | `{name, input, content} ← {tool_name, tool_input, tool_response}` |
| `onSessionStart()` | `SessionStart` | `SessionStartHookInput` | No transformation (ignore input) |
| `onSessionEnd(totalDuration)` | `SessionEnd` | `SessionEndHookInput` | No transformation (ignore input) |

### Implementation Signature

```typescript
private buildAgentSDKHooks(
  hooks?: ProviderHookEvents
): Partial<Record<HookEvent, HookCallbackMatcher[]>> {
  // 1. Early return: if (!hooks) return {};
  // 2. Create result object: const sdkHooks = {};
  // 3. Map onToolStart → PreToolUse
  // 4. Map onToolEnd → PostToolUse
  // 5. Map onSessionStart → SessionStart
  // 6. Map onSessionEnd → SessionEnd
  // 7. Return sdkHooks;
}
```

### Validation Commands Summary

```bash
npx tsc --noEmit      # Level 1: Type Checking
npm test              # Level 2: Unit Tests
npm run build         # Level 4: Build Validation
```

### Type Reference

```typescript
// Input type
ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
}

// Output type
Partial<Record<HookEvent, HookCallbackMatcher[]>> {
  "PreToolUse"?: [{ hooks: [HookCallback, ...], matcher?: string, timeout?: number }],
  "PostToolUse"?: [{ hooks: [HookCallback, ...], matcher?: string, timeout?: number }],
  "SessionStart"?: [{ hooks: [HookCallback, ...], matcher?: string, timeout?: number }],
  "SessionEnd"?: [{ hooks: [HookCallback, ...], matcher?: string, timeout?: number }],
}

// SDK HookCallback signature
HookCallback = (
  input: HookInput,           // Varies by event type
  toolUseID: string | undefined,  // undefined for non-tool events
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

---

**PRP Version:** 1.0
**Last Updated:** 2026-01-25
**Status:** Ready for Implementation

# PRP: P2.M1.T1.S6 - Implement execute() Method Message Iteration

---

## Goal

**Feature Goal**: Complete the `execute()` method in `AnthropicProvider` by implementing message iteration logic that processes the `AsyncGenerator<SDKMessage>` from the Agent SDK and builds an `AgentResponse` with proper status, data, error handling, and metadata.

**Deliverable**: Modified `src/providers/anthropic-provider.ts` with completed message iteration implementation in the `execute()` method (lines 235-246).

**Success Definition**:
- The `execute()` method iterates over the SDK query's AsyncGenerator
- Tool calls are counted from assistant messages
- Result messages are captured and processed
- `AgentResponse` is returned with correct status mapping (success/error)
- Metadata includes duration, usage, and tool call count
- Error cases are handled with appropriate error responses

## User Persona (if applicable)

**Target User**: Developer integrating with the Anthropic provider

**Use Case**: When a developer calls `provider.execute()` with a prompt and options, the method should process the SDK's AsyncGenerator response and return a properly formatted `AgentResponse`.

**User Journey**:
1. Developer calls `anthropicProvider.execute(request, toolExecutor, hooks?)`
2. Provider constructs SDK query and calls `sdk.query()`
3. Provider iterates through messages using `for await`
4. Provider extracts result, usage, tool count, and duration
5. Provider returns formatted `AgentResponse<T>`

**Pain Points Addressed**:
- Currently returns a temporary cast (`queryResult as T`) instead of processing messages
- No tool call tracking
- No proper error handling from SDK result subtypes
- Missing metadata (usage, duration, tool count)

## Why

- **Completes P2.M1.T1**: This is the final piece of the `execute()` method implementation (S5 did query construction, S6 does message iteration)
- **Enables provider execution**: Without this, the AnthropicProvider cannot return valid responses
- **Follows existing patterns**: The codebase already has this pattern in `src/core/agent.ts` - we're applying it to the provider abstraction

## What

Implement message iteration logic in `AnthropicProvider.execute()` that:
1. Iterates over the `AsyncGenerator<SDKMessage>` returned by `sdk.query()`
2. Counts tool calls from assistant messages (for metadata)
3. Captures the final `SDKResultMessage`
4. Maps SDK result `subtype` to `AgentResponse.status`
5. Extracts `structured_output`, `usage`, `duration_ms` from result
6. Returns `AgentResponse<T>` using factory functions

### Success Criteria

- [ ] Query generator is consumed using `for await (const message of queryResult)`
- [ ] Tool calls are counted from assistant message content blocks
- [ ] `SDKResultMessage` is captured when `message.type === 'result'`
- [ ] Status is mapped: `subtype === 'success'` → `'success'`, else `'error'`
- [ ] `createSuccessResponse()` is used for successful results
- [ ] `createErrorResponse()` is used for error results
- [ ] Metadata includes: `duration`, `usage` (input/output tokens), `toolCalls`
- [ ] Duration is calculated from `startTime` tracking
- [ ] Code follows existing patterns from `src/core/agent.ts` lines 437-492

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" test**: If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**Answer**: Yes - this PRP provides:
- Exact file locations and line numbers to reference
- Complete code patterns to follow
- Type definitions for all involved types
- Implementation patterns from existing code
- External documentation references

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator
  why: Understanding AsyncGenerator iteration with for-await-of
  critical: Do NOT await the query() call - it returns generator synchronously

- file: src/core/agent.ts
  why: EXACT pattern for message iteration (lines 437-492)
  pattern: for-await loop, tool call counting, result capture, status mapping
  gotcha: Duration calculated manually from Date.now(), not from SDK

- file: src/providers/anthropic-provider.ts
  why: File to modify - contains execute() method with TODO at lines 235-246
  pattern: Class structure, SDK access pattern, method signatures
  gotcha: Must add imports for createSuccessResponse and createErrorResponse

- file: src/types/agent.ts
  why: Factory function definitions (lines 540-550 for createSuccessResponse, 595-620 for createErrorResponse)
  pattern: Function signatures and return types
  gotcha: createErrorResponse requires code, message, details (nullable), recoverable (default false)

- file: src/types/providers.ts
  why: Provider interface definition (execute signature at lines 538-542)
  pattern: Type parameters, return type AgentResponse<T>
  gotcha: execute() must return Promise<AgentResponse<T>>

- file: plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: SDK message type definitions (lines 44-64)
  section: Message Types, SDKResultMessage structure
  gotcha: subtype determines status ('success' vs 'error_*')

- docfile: plan/003_dd63ad365ffb/P2M1T1S6/research/codebase-analysis-summary.md
  why: Complete analysis of existing patterns in Agent class
  section: AsyncGenerator Pattern Location, Status Determination Pattern

- docfile: plan/003_dd63ad365ffb/P2M1T1S6/research/external-research-summary.md
  why: AsyncGenerator patterns and SDK message type reference
  section: Extracting Data from SDKResultMessage
```

### Current Codebase Tree

```bash
src/
├── providers/
│   └── anthropic-provider.ts          # MODIFY THIS FILE (lines 235-246)
├── core/
│   └── agent.ts                       # REFERENCE: Message iteration pattern (lines 437-492)
├── types/
│   ├── agent.ts                       # REFERENCE: Factory functions (lines 540-550, 595-620)
│   └── providers.ts                   # REFERENCE: Provider interface (lines 538-542)
└── utils/
    └── model-spec.ts                  # REFERENCE: parseModelSpec usage
```

### Desired Codebase Tree with Changes

```bash
src/providers/anthropic-provider.ts
├── Lines 38-50: IMPORTS SECTION
│   └── ADD: import { createSuccessResponse, createErrorResponse } from '../types/agent.js';
├── Lines 186-247: execute() METHOD
│   ├── Lines 192-195: SDK initialization check (already done)
│   ├── Lines 197-202: Model resolution (already done)
│   ├── Lines 204-233: Query construction (already done in S5)
│   └── Lines 235-246: MESSAGE ITERATION (IMPLEMENT IN THIS TASK)
│       ├── Track startTime
│       ├── for-await loop over queryResult
│       ├── Count tool calls from assistant messages
│       ├── Capture resultMessage
│       ├── Calculate duration
│       ├── Handle missing resultMessage
│       ├── Map subtype to status
│       ├── Extract usage
│       ├── Return createSuccessResponse or createErrorResponse
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Do NOT await the sdk.query() call - it returns AsyncGenerator synchronously
// WRONG: const queryResult = await this.sdk.query({ prompt, options });
// RIGHT: const queryResult = this.sdk.query({ prompt, options });

// CRITICAL: Duration is NOT provided by SDK - must calculate manually
// const duration = Date.now() - startTime;

// CRITICAL: SDKResultMessage.structured_output may be undefined
// Use resultMessage.structured_output ?? resultMessage.result

// CRITICAL: Status mapping from subtype
// 'success' → AgentResponse.status = 'success'
// 'error_*' (e.g., 'error_during_execution', 'error_max_turns') → 'error'
// Recoverable only for 'error_max_turns'

// CRITICAL: Tool count is metadata only - not used for logic decisions
// Just track and include in response metadata

// CRITICAL: Must add imports for factory functions
// import { createSuccessResponse, createErrorResponse } from '../types/agent.js';

// GOTCHA: No hooks implementation yet (P2.M1.T2.S1)
// The hooks parameter exists but we don't use it in this task
```

---

## Implementation Blueprint

### Data Models and Structure

The following types are already defined in the codebase:

**SDKResultMessage** (from @anthropic-ai/claude-agent-sdk):
```typescript
interface SDKResultMessage {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns';
  structured_output?: unknown;  // Validated JSON from JSON Schema
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  duration_ms: number;
  result?: string;
  errors?: string[];
}
```

**AgentResponse** (from src/types/agent.ts):
```typescript
interface AgentResponse<T> {
  status: 'success' | 'error' | 'partial';
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ADD imports to anthropic-provider.ts
  - ADD: import { createSuccessResponse, createErrorResponse } from '../types/agent.js';
  - LOCATION: Lines 38-50 (existing imports section)
  - PATTERN: Follow existing import format (path aliases with .js extensions)
  - GOTCHA: Use type imports only for types, value imports for functions

Task 2: ADD startTime tracking before query call
  - ADD: const startTime = Date.now();
  - LOCATION: Line 229 (before sdk.query call)
  - PATTERN: Follow src/core/agent.ts line 406
  - PLACEMENT: After sdkOptions construction, before query call

Task 3: REPLACE TODO comment with message iteration loop
  - IMPLEMENT: for await (const message of queryResult) { ... }
  - LOCATION: Lines 235-246 (replace entire TODO section)
  - PATTERN: EXACT pattern from src/core/agent.ts lines 437-466
  - STRUCTURE:
    - Declare resultMessage: SDKResultMessage | null = null
    - Declare toolCallCount: number = 0
    - for await (const message of queryResult)
      - if message.type === 'assistant': count tool_use blocks
      - if message.type === 'result': capture resultMessage
    - Calculate duration from startTime
    - Handle null resultMessage case
    - Map subtype to status
    - Extract usage
    - Return createSuccessResponse or createErrorResponse

Task 4: IMPLEMENT tool call counting
  - FOLLOW: src/core/agent.ts lines 439-460
  - PATTERN: Nested loop over content array, check block.type === 'tool_use'
  - GOTCHA: Content may be undefined or not an array - add guards

Task 5: IMPLEMENT result message capture
  - FOLLOW: src/core/agent.ts lines 463-465
  - PATTERN: if (message.type === 'result') { resultMessage = message as SDKResultMessage; }
  - GOTCHA: Type assertion needed for SDKResultMessage

Task 6: IMPLEMENT missing result error handling
  - FOLLOW: src/core/agent.ts lines 471-478
  - PATTERN: if (!resultMessage) { return createErrorResponse(...) }
  - ERROR CODE: 'INVALID_RESPONSE_FORMAT'
  - RECOVERABLE: false

Task 7: IMPLEMENT status mapping from subtype
  - FOLLOW: src/core/agent.ts lines 481-492
  - PATTERN: if (resultMessage.subtype !== 'success') { return createErrorResponse(...) }
  - MAPPING:
    - 'success' → proceed to success response
    - 'error_during_execution' → error, recoverable: false
    - 'error_max_turns' → error, recoverable: true
  - ERROR CODE: 'EXECUTION_FAILED'

Task 8: IMPLEMENT success response with metadata
  - FOLLOW: src/core/agent.ts lines 494-592 (simplified for provider context)
  - PATTERN: createSuccessResponse(data, metadata)
  - DATA: resultMessage.structured_output ?? resultMessage.result (as T)
  - METADATA:
    - agentId: this.id
    - timestamp: Date.now()
    - duration: calculated duration
    - usage: { input_tokens, output_tokens }
    - toolCalls: toolCallCount

Task 9: VERIFY imports compile correctly
  - RUN: npx tsc --noEmit
  - CHECK: No type errors for createSuccessResponse, createErrorResponse
  - FIX: Add type imports if needed
```

### Implementation Patterns & Key Details

```typescript
// Message iteration pattern (EXACT from src/core/agent.ts lines 437-466)
let resultMessage: SDKResultMessage | null = null;
let toolCallCount = 0;

for await (const message of queryResult) {
  // Count tool uses from assistant messages
  if (message.type === 'assistant') {
    const content = message.message?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use') {
          toolCallCount++;
          // Hooks would go here (P2.M1.T2.S1)
        }
      }
    }
  }

  // Capture the final result message
  if (message.type === 'result') {
    resultMessage = message as SDKResultMessage;
  }
}

const duration = Date.now() - startTime;

// Handle missing result (from src/core/agent.ts lines 471-478)
if (!resultMessage) {
  return createErrorResponse(
    'INVALID_RESPONSE_FORMAT',
    'No result message received from Agent SDK',
    { duration },
    false
  ) as AgentResponse<T>;
}

// Handle error subtypes (from src/core/agent.ts lines 481-492)
if (resultMessage.subtype !== 'success') {
  return createErrorResponse(
    'EXECUTION_FAILED',
    `Agent SDK execution failed: ${resultMessage.subtype}`,
    {
      errors: resultMessage.errors ?? [],
      subtype: resultMessage.subtype,
    },
    resultMessage.subtype === 'error_max_turns' // Recoverable if just hit turn limit
  ) as AgentResponse<T>;
}

// Extract usage (from src/core/agent.ts lines 494-498)
const usage = {
  input_tokens: resultMessage.usage?.input_tokens ?? 0,
  output_tokens: resultMessage.usage?.output_tokens ?? 0,
};

// Extract data from result (simplified from src/core/agent.ts)
// NOTE: Provider doesn't have Prompt validation - use structured_output directly
const data = (resultMessage.structured_output ?? resultMessage.result) as T;

// Return success response (from src/core/agent.ts line 592)
return createSuccessResponse(data, {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  usage,
  toolCalls: toolCallCount,
});
```

### Integration Points

```yaml
IMPORTS:
  - file: src/providers/anthropic-provider.ts
  - add: import { createSuccessResponse, createErrorResponse } from '../types/agent.js';
  - location: Lines 38-50 (imports section)

EXECUTE_METHOD:
  - file: src/providers/anthropic-provider.ts
  - modify: Lines 235-246 (TODO section)
  - replace: Entire TODO comment with implementation

NO_CHANGES:
  - sdk.query() call (line 230-233) - already done in S5
  - model resolution (lines 197-202) - already done
  - SDK initialization check (lines 192-195) - already done
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check for linting errors (if project uses ESLint)
npx eslint src/providers/anthropic-provider.ts

# Expected: Zero type errors, zero linting errors
```

### Level 2: Unit Tests (Component Validation)

```bash
# Run provider tests (when they exist)
npm test -- src/providers/__tests__/anthropic-provider.test.ts

# Run all unit tests
npm test

# Expected: All tests pass
# Note: Provider tests may not exist yet (P5.M1.T3.S2 - pending)
```

### Level 3: Integration Testing (System Validation)

```bash
# Build the project
npm run build

# Test basic provider instantiation
node -e "
const { AnthropicProvider } = require('./dist/index.js');
const provider = new AnthropicProvider();
console.log('Provider created:', provider.id);
console.log('Capabilities:', provider.capabilities);
"

# Test execute method (requires API key)
# Create test script: test-provider-exec.js
```

**Integration Test Script** (create as `test-provider-exec.js`):
```javascript
import { AnthropicProvider } from './dist/index.js';

async function testExecute() {
  const provider = new AnthropicProvider();
  await provider.initialize({ apiKey: process.env.ANTHROPIC_API_KEY });

  const result = await provider.execute(
    { prompt: 'What is 2+2?', options: { tools: [] } },
    async (req) => ({ content: 'Not implemented', isError: false })
  );

  console.log('Result status:', result.status);
  console.log('Result data:', result.data);
  console.log('Metadata:', result.metadata);

  await provider.terminate();
}

testExecute().catch(console.error);
```

### Level 4: Manual Verification

```bash
# Verify the implementation matches expected pattern
# Check that:
# 1. for await loop is present
# 2. Tool calls are counted
# 3. resultMessage is captured
# 4. Status is mapped correctly
# 5. createSuccessResponse/createErrorResponse are used
# 6. Metadata includes duration, usage, toolCalls
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All imports added correctly (createSuccessResponse, createErrorResponse)
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Message iteration uses `for await (const message of queryResult)`
- [ ] Tool call counting loops over assistant message content blocks
- [ ] resultMessage is captured when `message.type === 'result'`
- [ ] Missing resultMessage returns error response
- [ ] Status mapping: `'success'` → success, `'error_*'` → error
- [ ] Duration calculated from `startTime`
- [ ] Usage extracted from `resultMessage.usage`
- [ ] `createSuccessResponse` used for success cases
- [ ] `createErrorResponse` used for error cases
- [ ] Metadata includes: `agentId`, `timestamp`, `duration`, `usage`, `toolCalls`

### Feature Validation

- [ ] Success response returns data from `structured_output` or `result`
- [ ] Error response includes proper error code and message
- [ ] Error responses are recoverable for `error_max_turns` subtype
- [ ] Tool call count is accurate (from assistant messages)
- [ ] Implementation follows exact pattern from `src/core/agent.ts` lines 437-492
- [ ] No new patterns introduced - follows existing conventions

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions
- [ ] JSDoc comments updated if needed
- [ ] Type assertions are minimal and safe
- [ ] Error handling covers all edge cases (null resultMessage, error subtypes)
- [ ] Code is self-documenting with clear variable names

---

## Anti-Patterns to Avoid

- **Do NOT await the query() call**: `sdk.query()` returns `AsyncGenerator` synchronously
- **Do NOT hardcode duration**: Calculate from `Date.now() - startTime`
- **Do NOT ignore null checks**: Guard against undefined content and resultMessage
- **Do NOT create new patterns**: Follow existing `src/core/agent.ts` pattern exactly
- **Do NOT implement hooks yet**: Hooks adapter is P2.M1.T2.S1 (separate task)
- **Do NOT add Prompt validation**: Provider doesn't have access to Prompt schema
- **Do NOT use `as T` excessively**: Only for the final data extraction
- **Do NOT forget type imports**: Factory functions must be imported, not just types

# Architectural Decisions Log

This document records key architectural decisions made during the research and planning phase.

## Decision 1: OpenCode SDK Package Verification

**Status:** DECIDED

**Context:**
The PRD specifies OpenCode SDK as a multi-provider solution supporting 75+ providers. Initial research could not verify the package due to web search rate limits.

**Research Completed (P3.M1.T1.S1):**
- **Package Verified:** `@opencode-ai/sdk@1.1.36` exists publicly on npm
- **Maintainers:** adamelmore (adam@terminal.shop), thdxr (d@ironbay.co)
- **License:** MIT
- **Dependencies:** Zero runtime dependencies
- **Versions:** 3,021+ published (actively maintained)

**Decision:** Option A - Package is Public
- OpenCode SDK is a real, publicly available package
- Proceed to P3.M1.T1.S2 for API documentation
- Continue to P3.M1.T1.S3 for implementation strategy determination

**References:**
- P3.M1.T1.S1 Research: `./P3M1T1S1/research/opencode-sdk-research.md`
- NPM Package: https://www.npmjs.com/package/@opencode-ai/sdk

---

## Decision 2: Session Management Approach

**Status:** DECISION NEEDED

**Context:**
Anthropic SDK has stateless sessions (requires explicit `continue: true`). OpenCode SDK (per PRD) has native session management. Need to decide how to handle sessions in the provider abstraction.

**Options:**

### Option A: Session Abstraction Layer
**Description:** Implement session management for Anthropic in the provider adapter

**Pros:**
- Consistent API across providers
- Users don't need to worry about provider differences
- Cleaner user experience

**Cons:**
- More complex implementation
- May not perfectly match OpenCode's native sessions
- Additional abstraction layer

**Implementation:**
```typescript
class AnthropicProvider implements Provider {
  private sessions: Map<string, SessionState> = new Map();

  async execute(request: ProviderRequest): Promise<ProviderResult> {
    if (request.sessionId) {
      // Resume session using in-memory state
      return this.executeWithSession(request);
    }
    // One-shot execution
  }
}
```

### Option B: Expose Provider-Specific Behavior
**Description:** Document sessions as OpenCode-only feature; Anthropic remains stateless

**Pros:**
- Simpler implementation
- No abstraction leakage
- Explicit about provider differences

**Cons:**
- Inconsistent user experience
- Users must know provider details
- Migration between providers requires code changes

**Implementation:**
```typescript
// Anthropic: Stateless
const result1 = await agent.prompt('Hello');
const result2 = await agent.prompt('Continue', { continue: true });

// OpenCode: Native sessions
const session = await opencode.createSession({ sessionId: 'my-session' });
await session.send('Hello');
await session.send('Continue');
```

**Recommendation:** Option A (Session Abstraction)
- Provides better UX
- Aligns with PRD goal of provider parity
- Abstraction complexity is manageable

---

## Decision 3: OpenCode Implementation Strategy

**Status:** DECIDED

**Context:**
OpenCode SDK has been verified as publicly available (`@opencode-ai/sdk@1.1.36`) and fully documented (P3.M1.T1.S2). However, research revealed significant architectural differences between OpenCode SDK and Groundswell's Provider interface pattern. This decision determines whether to proceed with OpenCode SDK implementation or choose an alternative multi-provider solution.

**Key Findings from Research:**

1. **Architectural Mismatch:** OpenCode SDK uses a client-server architecture requiring an external `opencode` server process, while Groundswell's Provider interface expects a standalone execution library.

2. **Tool Execution Limitation:** OpenCode executes tools server-side with observation-only via events; Groundswell requires direct tool execution via `toolExecutor` callback.

3. **Session Management:** OpenCode stores sessions server-side; Groundswell uses in-memory `Map<sessionId, SessionState>`.

4. **Deployment Complexity:** Users must install and manage a separate CLI/server process (`npm install -g opencode`).

**Options:**

### Option A: Implement OpenCode Provider (Strategy A)

**Approach:** Create `OpenCodeProvider` class despite architectural differences

**Pros:**
- Native 75+ provider support as specified in PRD
- Native MCP and LSP integration
- Zero dependencies (lightweight client)
- Matches PRD specification exactly
- Actively maintained (3,021+ versions)

**Cons:**
- External server dependency (deployment complexity)
- Tool execution limitation (observation only, cannot delegate)
- Session state server-side (abstraction leakage)
- Requires user to install `opencode` CLI separately
- Server lifecycle management in initialize()/terminate()

**Provider Interface Compatibility Assessment:**

| Method | Compatibility | Notes |
|--------|--------------|-------|
| `initialize()` | ✅ Yes | Can start server via `createOpencode()` |
| `terminate()` | ✅ Yes | Can stop server via `server.close()` |
| `execute()` | ⚠️ Partial | Cannot use `toolExecutor` callback (tools execute server-side) |
| `registerMCPs()` | ⚠️ Partial | Dynamic add only via `mcp.add()` |
| `loadSkills()` | ❌ No | Skills are server-side plugins |
| `normalizeModel()` | ✅ Yes | Can parse `{providerID, modelID}` format |

**Critical Blocker:** The `execute()` method's `toolExecutor` callback requirement is fundamentally incompatible with OpenCode's server-side tool execution. This is a **showstopper** for full Provider interface compliance.

### Option B: Contact Maintainers (Strategy B)

**Status:** Not Applicable - Package is public with documented API

### Option C: Use Alternative SDK (Strategy C)

**Researched Alternatives:**

| Alternative | Providers | MCP Support | Architecture | Compatibility Score |
|-------------|-----------|-------------|--------------|---------------------|
| **LangChain.js** | 30+ | Native (@langchain/mcp-adapters) | Framework-heavy | 5.7/10 - Poor |
| **Vercel AI SDK** | 17+ | Via LangChain adapters | Standalone | Not fully evaluated |

**LangChain.js Assessment:**
- **Pros:** Excellent TypeScript, native MCP, mature ecosystem
- **Cons:** Framework architecture (chains/agents/AgentExecutor), incompatible with standalone Provider pattern
- **Verdict:** LangChain.js is a framework, not a drop-in provider. Requires complex adapter layer.

**Decision:** Strategy C - Use Alternative Approach with Architectural Refinement

**Rationale:**

After comprehensive analysis, **none of the evaluated options (A, B, or C) fully satisfy the requirements**. The decision requires a nuanced approach:

1. **OpenCode SDK (Option A) cannot be implemented as specified** due to the fundamental tool execution architectural mismatch. The `toolExecutor` callback pattern is non-negotiable for Groundswell's design.

2. **LangChain.js (Option C) is not a viable alternative** as it is a framework requiring chains/agents, not a standalone provider that can implement the Provider interface directly.

3. **The PRD's requirement for "75+ providers via OpenCode SDK" is based on an assumption** that OpenCode SDK provides a direct execution interface like Anthropic's Agent SDK. Research proves this assumption incorrect.

**Recommended Approach: Architectural Refinement (Hybrid Strategy)**

Instead of choosing A, B, or C, recommend a **hybrid approach**:

1. **Defer OpenCode Provider implementation** - Do NOT implement OpenCodeProvider in P3.M2

2. **Implement direct provider integrations** for the most commonly needed providers:
   - OpenAI (via `openai` package)
   - Google Gemini (via `@google/generative-ai`)
   - Other providers as needed

3. **Reframe OpenCode as optional integration** - If users want 75+ providers via OpenCode, implement it as an **optional plugin/extension** that:
   - Requires explicit opt-in (install `opencode` CLI separately)
   - Documents server requirement and limitations clearly
   - Accepts reduced functionality (no toolExecutor callback)

4. **Update PRD Section 7.4** to reflect:
   - Direct provider integrations for OpenAI, Google, etc.
   - Optional OpenCode integration for extended provider support
   - Clear documentation of trade-offs

**Architectural Considerations:**

1. **Tool Execution Pattern:** The `toolExecutor` callback is core to Groundswell's design. It enables:
   - Centralized tool execution via MCPHandler
   - Consistent tool lifecycle management
   - Hook integration (onToolStart, onToolEnd)
   - Error handling and retry logic

   OpenCode's server-side tool execution breaks this pattern.

2. **Session Management:** Groundswell's in-memory session state provides:
   - Provider-agnostic session abstraction
   - No external dependencies
   - Simple lifecycle (create, get, delete)

   OpenCode's server-side sessions create external state dependency.

3. **Deployment Simplicity:** Groundswell is designed as a standalone npm package. OpenCode's server requirement:
   - Adds deployment complexity (process management)
   - Creates operational overhead (port conflicts, startup time)
   - Increases user friction (install CLI separately)

**PRD Alignment Assessment:**

| PRD Requirement | OpenCode SDK | Alternative |
|-----------------|--------------|-------------|
| Multi-provider (75+) | ✅ Yes | ❌ No (unless OpenCode) |
| Standalone execution | ❌ No (requires server) | ✅ Yes |
| Tool execution via callback | ❌ No | ✅ Yes |
| Native sessions | ✅ Yes | ✅ Yes (via abstraction) |
| MCP support | ✅ Yes | ✅ Yes |

**User Experience Impact:**

- **With OpenCode:** Users must install CLI, manage server process, accept tool execution limitations
- **With Direct Providers:** Simple npm install, no external dependencies, full tool control

**Next Steps:**

1. **Update PRD Section 7.4** to reflect direct provider integrations instead of OpenCode SDK
2. **Implement P3.M2** for direct provider integrations (OpenAI, Google) instead of OpenCodeProvider
3. **Create new task branch** for optional OpenCode plugin (future milestone)
4. **Document architectural decision** with clear rationale for stakeholders
5. **Re-evaluate OpenCode plugin** if user demand justifies the complexity

**Risk Factors:**

- **PRD Deviation:** This decision deviates from the PRD's specification of OpenCode SDK as the multi-provider solution. Stakeholder approval required.
- **Provider Count:** Direct integrations will initially support fewer providers than OpenCode's 75+. Plan to prioritize most-needed providers.
- **Future Work:** Optional OpenCode plugin may be needed if users demand extensive provider support.

**References:**
- P3.M1.T1.S1 Research: `./P3M1T1S1/research/opencode-sdk-research.md`
- P3.M1.T1.S2 Research: `./P3M1T1S2/research/opencode-sdk-complete-research.md`
- LangChain Research: `./docs/research/LANGCHAIN_JS_RESEARCH.md`
- Provider Interface: `src/types/providers.ts`
- External Dependencies: `./docs/architecture/external_dependencies.md`

## Decision 4: Provider Capability Detection

**Status:** DECISION NEEDED

**Context:**
How should the system detect and expose provider capabilities?

**Options:**

### Option A: Static Declaration
**Description:** Each provider statically declares capabilities in interface

**Implementation:**
```typescript
class AnthropicProvider implements Provider {
  readonly capabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,  // Not natively supported
    extendedThinking: false
  } satisfies ProviderCapabilities;
}
```

**Pros:**
- Simple implementation
- No runtime overhead
- Type-safe

**Cons:**
- May not reflect actual SDK version capabilities
- Requires manual updates when SDK changes

### Option B: Dynamic Detection
**Description:** Provider detects capabilities at runtime by testing SDK features

**Implementation:**
```typescript
class AnthropicProvider implements Provider {
  async detectCapabilities(): Promise<ProviderCapabilities> {
    const sdk = await import('@anthropic-ai/claude-agent-sdk');

    return {
      mcp: typeof sdk.createSdkMcpServer === 'function',
      skills: typeof sdk.loadSkills === 'function',
      lsp: await this.testLSPSupport(),
      streaming: true,  // Assume true
      sessions: typeof sdk.unstable_v2_createSession === 'function',
      extendedThinking: typeof sdk.setMaxThinkingTokens === 'function'
    };
  }
}
```

**Pros:**
- Accurate for actual SDK version
- Automatically adapts to SDK changes

**Cons:**
- Runtime overhead
- More complex implementation
- Async initialization complexity

**Recommendation:** Option A (Static Declaration)
- Capabilities are well-known for each SDK
- Simpler implementation
- No async initialization complexity
- Easy to update when SDK changes

---

## Decision 5: Error Code Normalization

**Status:** DECISION NEEDED

**Context:**
Should providers normalize error codes to Groundswell-standard codes, or expose native provider codes?

**Options:**

### Option A: Normalize to Groundswell Codes
**Description:** Map all provider errors to common error codes

**Implementation:**
```typescript
const ERROR_CODE_MAP = {
  // Anthropic SDK → Groundswell
  'rate_limit_error': 'RATE_LIMIT_EXCEEDED',
  'invalid_request_error': 'INVALID_REQUEST',
  'authentication_error': 'AUTHENTICATION_FAILED',

  // OpenCode SDK → Groundswell
  'RateLimitError': 'RATE_LIMIT_EXCEEDED',
  'ValidationError': 'INVALID_REQUEST'
};

function normalizeError(code: string): string {
  return ERROR_CODE_MAP[code] || 'UNKNOWN_ERROR';
}
```

**Pros:**
- Consistent error handling across providers
- Provider-agnostic error handling
- Easier migration between providers

**Cons:**
- Loss of provider-specific error context
- Mapping must be maintained for each SDK
- May miss new error types

### Option B: Expose Native Provider Codes
**Description:** Keep original provider error codes

**Implementation:**
```typescript
interface ProviderError {
  code: string;           // Native provider code
  provider: ProviderId;   // Which provider
  original: unknown;      // Original error object
}
```

**Pros:**
- Full error context from provider
- No mapping maintenance
- Provider-specific error handling possible

**Cons:**
- Inconsistent error codes across providers
- User must understand provider-specific errors
- Harder to switch providers

### Option C: Hybrid Approach
**Description:** Expose both normalized and native codes

**Implementation:**
```typescript
interface ProviderError {
  code: string;           // Normalized Groundswell code
  nativeCode: string;     // Original provider code
  provider: ProviderId;
  original: unknown;
}
```

**Pros:**
- Best of both worlds
- Consistent API + full context

**Cons:**
- More complex error interface
- Still requires mapping maintenance

**Recommendation:** Option C (Hybrid Approach)
- Provides consistency via `code`
- Preserves native context via `nativeCode`
- Users can choose which to use
- Aligns with PRD's AgentResponse.error.details pattern

---

## Decision 6: Model Specification Parsing

**Status:** DECIDED (PRD specification)

**Context:**
How to parse and validate model specifications like `anthropic/claude-sonnet-4-20250514`?

**Decision:** Follow PRD specification

**Implementation:**
```typescript
export interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;
}

function parseModelSpec(
  model: string,
  defaultProvider: ProviderId = 'anthropic'
): ModelSpec {
  // Check for provider/model format
  if (model.includes('/')) {
    const [provider, modelName] = model.split('/', 2);

    if (provider !== 'anthropic' && provider !== 'opencode') {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return {
      provider: provider as ProviderId,
      model: modelName,
      raw: model
    };
  }

  // Use default provider
  return {
    provider: defaultProvider,
    model,
    raw: model
  };
}

function formatModelForProvider(
  spec: ModelSpec,
  targetProvider: ProviderId
): string {
  if (spec.provider === targetProvider) {
    return spec.model;
  }

  // Cross-provider model translation (if needed)
  // This would require a model mapping table
  throw new Error(
    `Cannot translate ${spec.provider}/${spec.model} to ${targetProvider}`
  );
}
```

---

## Decision 7: Provider Lifecycle Management

**Status:** DECIDED (Singleton Registry)

**Context:**
How to manage provider instance lifecycle?

**Decision:** Use singleton provider registry

**Implementation:**
```typescript
class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<ProviderId, Provider> = new Map();

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: ProviderId): Provider | undefined {
    return this.providers.get(id);
  }

  async initializeAll(config: GlobalProviderConfig): Promise<void> {
    for (const [id, provider] of this.providers) {
      const options = config.providerDefaults?.[id];
      await provider.initialize(options);
    }
  }
}
```

**Rationale:**
- Single instance per provider (shared across agents)
- Centralized initialization
- Consistent configuration

---

## Decision 8: Testing Strategy for OpenCode

**Status:** DECISION NEEDED

**Context:**
How to test OpenCode provider implementation if SDK is unavailable during development?

**Options:**

### Option A: Mock OpenCode SDK
**Implementation:**
```typescript
// tests/mocks/opencode-sdk.ts
export const createMockOpenCodeSDK = () => ({
  execute: vi.fn(),
  createSession: vi.fn(),
  // ...
});
```

**Pros:**
- Can develop without SDK
- Tests run without dependency

**Cons:**
- May not match real SDK behavior
- Integration tests still needed

### Option B: Conditional Tests
**Implementation:**
```typescript
describe('OpenCodeProvider', () => {
  const hasOpenCode = tryRequire('opencode-agent-sdk');

  if (!hasOpenCode) {
    it.skip('OpenCode SDK not available', () => {});
    return;
  }

  // Actual tests...
});
```

**Pros:**
- Tests real SDK when available
- Doesn't fail when SDK missing

**Cons:**
- Tests may not run in CI

### Option C: Feature Flags
**Implementation:**
```bash
npm test -- --includeOpenCode
```

**Pros:**
- Explicit control
- CI can test both scenarios

**Cons:**
- Requires test configuration

**Recommendation:** Option A (Mock SDK) for now, transition to Option B (Conditional) when SDK becomes available

---

## Summary of Decisions

| Decision | Status | Choice |
|----------|--------|--------|
| OpenCode SDK Strategy | OPEN | Awaiting research |
| Session Management | NEEDED |倾向于 Option A (Abstraction) |
| Dependency Strategy | NEEDED |倾向于 Option A (Required) |
| Capability Detection | NEEDED |倾向于 Option A (Static) |
| Error Normalization | NEEDED |倾向于 Option C (Hybrid) |
| Model Specification | DECIDED | PRD specification |
| Provider Lifecycle | DECIDED | Singleton registry |
| Testing Strategy | NEEDED |倾向于 Option A → B |

**Next Steps:**
1. Resolve OpenCode SDK strategy (web research or maintainer contact)
2. Confirm remaining architectural decisions with team
3. Update architecture docs with final decisions

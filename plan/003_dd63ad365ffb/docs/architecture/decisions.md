# Architectural Decisions Log

This document records key architectural decisions made during the research and planning phase.

## Decision 1: OpenCode SDK Strategy

**Status:** OPEN (requires resolution)

**Context:**
The PRD specifies OpenCode SDK as a multi-provider solution supporting 75+ providers. However, research could not verify the existence or package name of this SDK due to web search rate limits.

**Options:**

### Option A: OpenCode is a Real Public Package
**Action Required:**
- Search npmjs.com for "opencode agent sdk" after rate limit reset (Feb 1, 2026)
- Find GitHub repository
- Document actual API and capabilities
- Implement according to discovered patterns

**Probability:** 60%

### Option B: OpenCode is a Custom/Private Package
**Action Required:**
- Contact project maintainers for package details
- Obtain installation instructions
- Document internal API
- Implement according to provided specifications

**Probability:** 30%

### Option C: OpenCode Doesn't Exist (Use Alternative)
**Alternatives:**
1. **LangChain.js** - Multi-provider support (OpenAI, Anthropic, etc.)
2. **Vercel AI SDK** - Provider-agnostic interface
3. **Custom Abstraction** - Build our own multi-provider layer

**Action Required:**
- Choose alternative SDK
- Adjust PRD to reflect chosen solution
- Implement provider abstraction using alternative

**Probability:** 10%

**Decision Deadline:** After web research (Feb 1, 2026) or maintainer consultation

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

## Decision 3: Dependency Strategy for OpenCode SDK

**Status:** DECISION NEEDED

**Context:**
How should OpenCode SDK be included as a dependency?

**Options:**

### Option A: Required Dependency
**package.json:**
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.77",
    "opencode-agent-sdk": "^1.0.0"
  }
}
```

**Pros:**
- Always available
- Simpler imports (no dynamic requires)
- Type checking works out of the box

**Cons:**
- Increases bundle size for Anthropic-only users
- Requires OpenCode to be published to npm
- Forces all users to install both SDKs

### Option B: Optional Dependency
**package.json:**
```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.77"
  },
  "optionalDependencies": {
    "opencode-agent-sdk": "^1.0.0"
  }
}
```

**Pros:**
- Smaller bundle for Anthropic-only users
- OpenCode installed only if needed

**Cons:**
- Requires dynamic imports or try/catch requires
- TypeScript needs `@types/opencode-agent-sdk` separately
- May confuse users about availability

### Option C: Peer Dependency
**package.json:**
```json
{
  "peerDependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0",
    "opencode-agent-sdk": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "opencode-agent-sdk": {
      "optional": true
    }
  }
}
```

**Pros:**
- User controls version
- Smallest bundle size
- Flexibility for version requirements

**Cons:**
- Users must manually install
- More complex setup
- Version compatibility issues possible

**Recommendation:** Option A (Required Dependency)
- OpenCode is a core feature (not optional)
- Simpler developer experience
- Type safety guaranteed

**Note:** If OpenCode SDK is not publicly available (private package), use Option C or make it a user-provided dependency.

---

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

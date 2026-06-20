# Test strategy (P2.M1.T1.S2)

## Existing patterns to follow (verified in working tree)

### Registry test isolation — `src/__tests__/unit/providers/harness-registry.test.ts`
```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ProviderRegistry, InitializationStatus } from '../../../harnesses/harness-registry.js';

afterEach(() => {
  const registry = ProviderRegistry.getInstance();
  registry._resetInitStateForTesting();
  ProviderRegistry._resetForTesting();
});
```
Use the SAME reset in `register-defaults.test.ts` (both `_resetForTesting` static +
`_resetInitStateForTesting` instance) so registering into the singleton doesn't leak across tests.

### Stubbing the SDK on the harness — `claude-code-harness-execute.test.ts`
The execute tests set the (private) `sdk` field directly:
```ts
provider.sdk = { /* mock SDK query/streamInput */ };
```
vitest uses esbuild (transpile-only — no type check) and `npm run lint` excludes `src/__tests__`,
so poking the private field at runtime is fine and is the established pattern (10+ sites in the
execute test).

### normalizeModel test shape — `claude-code-harness-normalizemodel.test.ts` (S1-renamed)
S1 updated it to assert on the ClaudeCodeHarness/HarnessRegistry message text:
```ts
expect(() => provider.normalizeModel('opencode/gpt-4')).toThrow(
  /Cannot normalize opencode\/gpt-4 with ClaudeCodeHarness/
);
// ...toContain('ClaudeCodeHarness'); ...toContain('HarnessRegistry');
```
S2 KEEPS all of these (message text is preserved by ConfigError) and ADDS the structured-code
assertions (see Test 2).

---

## Test 1 — NEW `src/__tests__/unit/providers/register-defaults.test.ts`

Purpose: the bootstrap helper registers ClaudeCodeHarness under `'claude-code'`, is idempotent,
returns the registry, uses the singleton by default, and accepts a custom registry.

```ts
import { describe, it, expect, afterEach } from 'vitest';
import {
  HarnessRegistry,
  ProviderRegistry,
} from '../../../harnesses/harness-registry.js';
import { registerDefaultHarnesses } from '../../../harnesses/register-defaults.js';
import { ClaudeCodeHarness } from '../../../harnesses/claude-code-harness.js';

afterEach(() => {
  // identical isolation pattern to harness-registry.test.ts
  const registry = HarnessRegistry.getInstance();
  registry._resetInitStateForTesting();
  HarnessRegistry._resetForTesting();
});

describe('registerDefaultHarnesses()', () => {
  it('registers ClaudeCodeHarness under "claude-code" on the singleton by default', () => {
    const registry = registerDefaultHarnesses();
    expect(registry.has('claude-code')).toBe(true);
    const cc = registry.get('claude-code');
    expect(cc).toBeInstanceOf(ClaudeCodeHarness);
    expect(cc?.id).toBe('claude-code');
  });

  it('returns the same registry instance it wrote to (the singleton)', () => {
    const registry = registerDefaultHarnesses();
    expect(registry).toBe(HarnessRegistry.getInstance());
  });

  it('is idempotent — calling twice does NOT throw (registry.register duplicate guard)', () => {
    expect(() => {
      registerDefaultHarnesses();
      registerDefaultHarnesses();
    }).not.toThrow();
    // still exactly one claude-code harness registered
    expect(HarnessRegistry.getInstance().has('claude-code')).toBe(true);
  });

  it('accepts a custom target registry', () => {
    // fresh singleton after reset
    HarnessRegistry._resetForTesting();
    const custom = HarnessRegistry.getInstance(); // fresh instance
    const returned = registerDefaultHarnesses(custom);
    expect(returned).toBe(custom);
    expect(custom.has('claude-code')).toBe(true);
  });

  it('registers only claude-code today (pi is deferred to P2.M3)', () => {
    const registry = registerDefaultHarnesses();
    expect(registry.has('claude-code')).toBe(true);
    expect(registry.has('pi')).toBe(false); // added in P2.M3.T2.S3
  });
});
```

**No SDK mock needed** — `new ClaudeCodeHarness()` (constructor) does not load the SDK; the test
never calls `initialize()`/`execute()`.

---

## Test 2 — MODIFY `src/__tests__/unit/providers/claude-code-harness-normalizemodel.test.ts`
(S1-renamed file. Add structured-code assertions; KEEP S1's message-text assertions.)

```ts
import { ClaudeCodeHarness, ConfigError } from '../../../harnesses/claude-code-harness.js';
import { AGENT_ERROR_CODES } from '../../../types/agent.js';

describe('provider validation', () => {
  it('throws a ConfigError with code CONFIG_ERROR on a non-anthropic provider', () => {
    let err: unknown;
    try {
      provider.normalizeModel('opencode/gpt-4');
      expect.fail('Should have thrown');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConfigError);
    expect(err).toBeInstanceOf(Error);
    expect((err as ConfigError).code).toBe(AGENT_ERROR_CODES.CONFIG_ERROR);
    expect((err as ConfigError).code).toBe('CONFIG_ERROR');
    // S1 message-text assertions STILL hold (message preserved):
    expect((err as Error).message).toContain('Cannot normalize');
    expect((err as Error).message).toContain('opencode/gpt-4');
    expect((err as Error).message).toContain('ClaudeCodeHarness');
    expect((err as Error).message).toContain('HarnessRegistry');
    // structured details carry the offending provider/model + harness id
    expect((err as ConfigError).details).toMatchObject({
      provider: 'opencode', model: 'gpt-4', harnessId: 'claude-code',
    });
  });

  it('still rejects openai provider with CONFIG_ERROR (open-set provider, non-anthropic)', () => {
    expect(() => provider.normalizeModel('openai/gpt-4o')).toThrow(ConfigError);
    try { provider.normalizeModel('openai/gpt-4o'); } catch (e) {
      expect((e as ConfigError).code).toBe('CONFIG_ERROR');
    }
  });

  it('happy path unchanged — anthropic models normalize without throwing', () => {
    expect(() => provider.normalizeModel('claude-sonnet-4')).not.toThrow();
    expect(() => provider.normalizeModel('anthropic/claude-opus-4')).not.toThrow();
  });
});
```
Leave S1's existing parseModelSpec-delegation tests (empty string, whitespace, `/model`,
`anthropic/`, etc.) UNCHANGED — those exercise `parseModelSpec` (empty/provider-empty/model-empty)
and are unaffected by the `Error` → `ConfigError` swap at the provider-mismatch gate.

---

## Test 3 — NEW `src/__tests__/unit/providers/claude-code-harness-execute-config-error.test.ts`
Purpose: prove `execute` (and the streaming path) surface the ConfigError from normalizeModel —
WITHOUT initializing/loading the real SDK (the stub is never invoked).

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeCodeHarness, ConfigError } from '../../../harnesses/claude-code-harness.js';
import { AGENT_ERROR_CODES } from '../../../types/agent.js';

describe('ClaudeCodeHarness.execute() — anthropic-only enforcement (CONFIG_ERROR)', () => {
  let harness: ClaudeCodeHarness;

  beforeEach(() => {
    harness = new ClaudeCodeHarness();
    // Bypass the `if (!this.sdk) throw "SDK not initialized"` guard. The stub is NEVER invoked:
    // normalizeModel throws BEFORE query() is called (claude-code-harness.ts L409 non-streaming,
    // L641 streaming — both run before the first SDK call / first yield).
    (harness as unknown as { sdk: unknown }).sdk = {};
  });

  it('non-streaming execute rejects with ConfigError (CONFIG_ERROR) for a non-anthropic model', async () => {
    const request = {
      prompt: 'hi',
      options: { model: 'openai/gpt-4o' }, // streaming undefined → non-streaming path
    };
    await expect(
      harness.execute(request, async () => ({ content: '', isError: false })),
    ).rejects.toBeInstanceOf(ConfigError);

    try {
      await harness.execute(request, async () => ({ content: '', isError: false }));
    } catch (e) {
      expect((e as ConfigError).code).toBe(AGENT_ERROR_CODES.CONFIG_ERROR);
    }
  });

  it('streaming execute surfaces ConfigError on first iteration (non-anthropic model)', async () => {
    const request = {
      prompt: 'hi',
      options: { model: 'openai/gpt-4o', streaming: true },
    };
    const stream = harness.execute(request, async () => ({ content: '', isError: false }));
    // normalizeModel runs before the first yield → first .next() rejects
    await expect(stream.next()).rejects.toBeInstanceOf(ConfigError);
  });

  it('does NOT throw for an anthropic model (happy path reaches the SDK stub)', async () => {
    // The stub has no query() → it throws a different (non-ConfigError) error when reached,
    // which proves we got PAST normalizeModel. We only assert NO ConfigError is thrown.
    const request = { prompt: 'hi', options: { model: 'claude-sonnet-4' } };
    let threwConfig = false;
    try {
      await harness.execute(request, async () => ({ content: '', isError: false }));
    } catch (e) {
      threwConfig = e instanceof ConfigError;
    }
    expect(threwConfig).toBe(false); // it failed for SDK-stub reasons, NOT the provider gate
  });
});
```

**The SDK stub trick (the key testing insight):** `normalizeModel` is called at L409 (non-streaming)
/ L641 (streaming) — BEFORE any `this.sdk.query(...)` call. So setting `harness.sdk = {}` (truthy)
satisfies the `!this.sdk` guard, and the ConfigError fires before the stub is ever touched. No
`vi.mock('@anthropic-ai/claude-agent-sdk')` is needed for these tests (the contract's "Mock: SDK
import in tests" is honored by stubbing the field instead of the module — lighter and sufficient
since the SDK is never reached).

---

## Validation gates (verified commands)

```bash
npm run lint                      # tsc --noEmit (excludes tests) — claude-code-harness.ts +
                                  # register-defaults.ts + agent.ts + harnesses/index.ts compile
npm test -- src/__tests__/unit/providers/register-defaults
npm test -- src/__tests__/unit/providers/claude-code-harness-normalizemodel
npm test -- src/__tests__/unit/providers/claude-code-harness-execute-config-error
npm test                          # full suite — no ripple (mock-based suites untouched)
npm run build                     # dist/harnesses/register-defaults.{js,d.ts} emitted
```

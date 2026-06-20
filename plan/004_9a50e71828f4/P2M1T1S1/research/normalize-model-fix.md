# normalizeModel Latent Bug + Fix — P2.M1.T1.S1

## The bug (would silently break ALL claude-code execution after a naive id rename)

Current code in `src/harnesses/anthropic-provider.ts` (normalizeModel):

```ts
normalizeModel(model: string): ModelSpec {
  const spec = parseModelSpec(model, "anthropic");   // default provider already 'anthropic'
  if (spec.provider !== this.id) {                    // ← this.id was 'anthropic'
    throw new Error(
      `Cannot normalize ${spec.provider}/${spec.model} with AnthropicProvider. ` +
      `Use ProviderRegistry.get('${spec.provider}') instead.`,
    );
  }
  return spec;
}
```

**Why it breaks after `readonly id` → `'claude-code'`:** the check compares the MODEL provider axis
(`spec.provider`, always an LLM host like `'anthropic'`/`'openai'`) against the HARNESS id
(`this.id`, now `'claude-code'`). These are now TWO DIFFERENT orthogonal axes (PRD §7 / §7.8). After
the rename, `spec.provider !== this.id` is **always true** (no model provider is ever `'claude-code'`),
so `normalizeModel` would **throw on every call** → every `execute()`/`executeStreaming()` fails at
model resolution. This is a silent correctness regression, not a compile error.

## The fix — compare against the literal LLM-host `'anthropic'`, not `this.id`

PRD §7.8: *"The `claude-code` SDK can only run `anthropic/*` models. Requesting a non-Anthropic
provider on `claude-code` is a configuration error surfaced at `initialize()`/`execute()`."*

```ts
normalizeModel(model: string): ModelSpec {
  // Delegate to the shared parser (open ModelProviderId set; default 'anthropic').
  const spec = parseModelSpec(model, "anthropic");

  // PRD §7.8 — claude-code can ONLY run anthropic/* models.
  // Compare against the literal LLM-host 'anthropic', NOT this.id (which is the harness id
  // 'claude-code' — a different axis). A naive `!== this.id` would throw on every call.
  if (spec.provider !== "anthropic") {
    throw new Error(
      `Cannot normalize ${spec.provider}/${spec.model} with ClaudeCodeHarness. ` +
      `The claude-code harness only supports anthropic/* models (PRD §7.8). ` +
      `Use HarnessRegistry to select a harness that supports the '${spec.provider}' provider.`,
    );
  }

  return spec;
}
```

This is the ONE behavioral change permitted in normalizeModel (the contract calls it out separately:
"normalizeModel defaultProvider='anthropic'" + "Keep ALL SDK wrapping logic verbatim" — normalizeModel
is NOT in the verbatim list of query/createSdkMcpServer/hooks/resume). The happy path (anthropic
models) is unchanged; only non-anthropic providers are rejected, exactly as before.

## Test impact (see research/test-rename-rules.md for the full rule set)

In `claude-code-harness-normalizemodel.test.ts`:
- HAPPY-PATH assertions stay `'anthropic'` (they assert `result.provider` = the ModelSpec.provider,
  which is still `'anthropic'` for claude models). e.g. `expect(result.provider).toBe('anthropic')`.
- ERROR-message assertions UPDATE: the message now says `ClaudeCodeHarness` (not `AnthropicProvider`)
  and `HarnessRegistry` (not `ProviderRegistry`).
  - `toThrow(/Cannot normalize opencode\/gpt-4 with AnthropicProvider/)` → `/ClaudeCodeHarness/`
  - `toContain('AnthropicProvider')` → `toContain('ClaudeCodeHarness')`
  - `toContain('ProviderRegistry')` → `toContain('HarnessRegistry')`
  - `toThrow(/ProviderRegistry\.get\('opencode'\)/)` → `/HarnessRegistry/` (the new message)
- The `'should throw on opencode provider'` / provider-mismatch tests still THROW (provider
  'opencode' !== 'anthropic') — only the expected message text changes.

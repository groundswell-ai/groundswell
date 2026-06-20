/**
 * Unit tests for ClaudeCodeHarness.execute() CONFIG_ERROR propagation
 *
 * Purpose: Prove execute() and the streaming path surface ConfigError from
 * normalizeModel — WITHOUT initializing/loading the real SDK (the stub is
 * never invoked). P2.M1.T1.S2.
 */

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

  it('does NOT throw ConfigError for an anthropic model (happy path reaches the SDK stub)', async () => {
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

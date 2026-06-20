/**
 * Unit tests for registerDefaultHarnesses() bootstrap helper
 *
 * Purpose: Verify the helper registers ClaudeCodeHarness under 'claude-code'
 * idempotently, returns the registry, uses the singleton by default, and
 * accepts a custom registry. P2.M1.T1.S2.
 */

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

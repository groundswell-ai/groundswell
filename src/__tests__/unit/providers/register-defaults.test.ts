/**
 * Unit tests for registerDefaultHarnesses().
 *
 * PRP: P2.M3.T2.S3 — verifies both ClaudeCodeHarness and PiHarness are registered,
 * 'pi' is a PiHarness instance, idempotency, and defaultHarness === 'pi'.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerDefaultHarnesses } from '../../../harnesses/register-defaults.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { ClaudeCodeHarness } from '../../../harnesses/claude-code-harness.js';
import {
  getGlobalHarnessConfig,
  resetGlobalHarnessConfig,
} from '../../../utils/harness-config.js';

describe('registerDefaultHarnesses', () => {
  beforeEach(() => {
    HarnessRegistry._resetForTesting();
    resetGlobalHarnessConfig();
  });

  it('should register both claude-code and pi harnesses', () => {
    const registry = registerDefaultHarnesses();
    expect(registry.has('claude-code')).toBe(true);
    expect(registry.has('pi')).toBe(true);
  });

  it('should register pi as a PiHarness instance', () => {
    const registry = registerDefaultHarnesses();
    expect(registry.get('pi')).toBeInstanceOf(PiHarness);
  });

  it('should register claude-code as a ClaudeCodeHarness instance', () => {
    const registry = registerDefaultHarnesses();
    expect(registry.get('claude-code')).toBeInstanceOf(ClaudeCodeHarness);
  });

  it('should be idempotent — calling twice does not throw', () => {
    registerDefaultHarnesses();
    expect(() => registerDefaultHarnesses()).not.toThrow();
    const registry = HarnessRegistry.getInstance();
    expect(registry.has('pi')).toBe(true);
    expect(registry.has('claude-code')).toBe(true);
  });

  it('should return the HarnessRegistry singleton for chaining', () => {
    const result = registerDefaultHarnesses();
    expect(result).toBe(HarnessRegistry.getInstance());
  });

  it('should confirm defaultHarness is pi', () => {
    registerDefaultHarnesses();
    expect(getGlobalHarnessConfig().defaultHarness).toBe('pi');
  });
});

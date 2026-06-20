/**
 * Bootstrap helper: register Groundswell's built-in harnesses with the
 * HarnessRegistry (PRD §7.6 / §7.1). Idempotent — safe to call multiple times
 * (guards each registration with `registry.has(id)` so the registry's own
 * duplicate-error is never triggered).
 *
 * Registers:
 *   - ClaudeCodeHarness (id 'claude-code') — Anthropic-only (PRD §7.8).
 *   - PiHarness (id 'pi') — vendor-neutral default (PRD §7.1, §7.6).
 *
 * @param registry - Target registry (defaults to the HarnessRegistry singleton).
 * @returns The registry (for chaining / testing).
 *
 * @example
 * ```ts
 * import { registerDefaultHarnesses } from 'groundswell/harnesses';
 * const registry = registerDefaultHarnesses();
 * const cc = registry.get('claude-code');  // ClaudeCodeHarness instance
 * const pi = registry.get('pi');           // PiHarness instance
 * ```
 */

import { HarnessRegistry } from './harness-registry.js';
import { ClaudeCodeHarness } from './claude-code-harness.js';
import { PiHarness } from './pi-harness.js';
import type { HarnessId } from '../types/harnesses.js';

export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  // Claude Code harness — Anthropic-only (PRD §7.8).
  const CLAUDE_CODE: HarnessId = 'claude-code';
  if (!registry.has(CLAUDE_CODE)) {
    registry.register(new ClaudeCodeHarness());
  }

  // Pi harness — vendor-neutral DEFAULT (PRD §7.1, §7.6). defaultHarness is already 'pi' in
  // src/utils/harness-config.ts (DEFAULT_HARNESS_CONFIG); this registration pairs the id with a
  // live instance so registry.get('pi') resolves. Idempotent (guard mirrors the claude-code block).
  const PI: HarnessId = 'pi';
  if (!registry.has(PI)) {
    registry.register(new PiHarness());
  }

  return registry;
}

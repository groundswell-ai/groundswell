/**
 * Bootstrap helper: register Groundswell's built-in harnesses with the
 * HarnessRegistry (PRD §7.6 / §7.1). Idempotent — safe to call multiple times
 * (guards each registration with `registry.has(id)` so the registry's own
 * duplicate-error is never triggered).
 *
 * Today registers:
 *   - ClaudeCodeHarness (id 'claude-code') — Anthropic-only (PRD §7.8).
 *
 * P2.M3.T2.S3 will add PiHarness (id 'pi') as the vendor-neutral default here.
 *
 * @param registry - Target registry (defaults to the HarnessRegistry singleton).
 * @returns The registry (for chaining / testing).
 *
 * @example
 * ```ts
 * import { registerDefaultHarnesses } from 'groundswell/harnesses';
 * const registry = registerDefaultHarnesses();
 * const cc = registry.get('claude-code');  // ClaudeCodeHarness instance
 * ```
 */

import { HarnessRegistry } from './harness-registry.js';
import { ClaudeCodeHarness } from './claude-code-harness.js';
import type { HarnessId } from '../types/harnesses.js';

export function registerDefaultHarnesses(
  registry: HarnessRegistry = HarnessRegistry.getInstance(),
): HarnessRegistry {
  // Claude Code harness — Anthropic-only (PRD §7.8).
  const CLAUDE_CODE: HarnessId = 'claude-code';
  if (!registry.has(CLAUDE_CODE)) {
    registry.register(new ClaudeCodeHarness());
  }

  // TODO(P2.M3.T2.S3): register PiHarness (id 'pi') as the vendor-neutral default.
  //   import { PiHarness } from "./pi-harness.js";
  //   if (!registry.has("pi")) registry.register(new PiHarness());

  return registry;
}

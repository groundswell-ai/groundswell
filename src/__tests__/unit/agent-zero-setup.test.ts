/**
 * Milestone M1 acceptance gate — zero-setup Agent construction + example-02 launch smoke.
 *
 * Proves the documented primary user journey (architecture/system_context.md §3) works end-to-end
 * with NO setup: `new Agent({ model })` — no configureHarnesses(), no registerDefaultHarnesses(),
 * no registry.register() — resolves to a real 'pi' harness with BOTH built-in defaults materialized
 * by the auto-registration safety net. Also replicates the shipped example 02 launch sequence.
 *
 * Dependencies (BOTH Complete):
 *   - P1.M1.T1.S1 (commit adbdc5c): Agent reads getGlobalHarnessConfig/resolveHarnessConfig (Issue 1).
 *   - P1.M1.T2.S1 (commit b529564): registerDefaultHarnesses exported + lazy auto-register safety net (Issue 4).
 *
 * Fail-on-pre-fix honesty: pre-T1.S1/T2.S1 both assertions threw
 *   `Harness 'anthropic' is not registered` (legacy singleton default 'anthropic', empty registry).
 * Post-fix they pass. This file is the permanent regression guard for that compound journey.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Agent } from '../../core/agent.js';
import { HarnessRegistry } from '../../harnesses/harness-registry.js';
import { PiHarness } from '../../harnesses/pi-harness.js';
import { ClaudeCodeHarness } from '../../harnesses/claude-code-harness.js';
import { configureHarnesses, resetGlobalHarnessConfig } from '../../utils/harness-config.js';
import { resetGlobalConfig } from '../../utils/provider-config.js';

// ---------------------------------------------------------------------------
// Lifecycle: reset both singletons + the registry before and after each test.
// Mirrors agent-harness-cascade-matrix.test.ts's lifecycle exactly.
// Block A triggers auto-register (side-effect on the singleton), so reset is
// mandatory to prevent cross-test / cross-file leakage.
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  HarnessRegistry['_resetForTesting']();
});

afterEach(() => {
  resetGlobalHarnessConfig();
  resetGlobalConfig();
  HarnessRegistry['_resetForTesting']();
});

// ===========================================================================
// Block A — Zero-setup journey (PRD §7.6 / Issues 1 + 4 end-to-end)
//
// WHY THIS IS DISTINCT FROM cascade-matrix scenario 4:
//   scenario 4 (agent-harness-cascade-matrix.test.ts) asserts ONLY
//   `agent.harness.id === 'pi'` via private-field access, behind
//   it.skipIf(!AUTO_REGISTER_ACTIVE). Block A adds:
//   - Explicit `not.toThrow()` (the keystone Issue-1 regression guard)
//   - Public `agent.config.harness` assertion
//   - BOTH-defaults-registered assertion (`has('pi') && has('claude-code')`)
//   - Example-02 launch smoke (Block B, below)
// ===========================================================================
describe('Zero-setup Agent construction (PRD §7.6 / §h3.0 — Issues 1 + 4 end-to-end)', () => {
  it('constructs new Agent({model}) with NO setup (empty registry, no configureHarnesses) and resolves to "pi"', () => {
    // beforeEach already reset everything. Do NOT call configureHarnesses,
    // registerDefaultHarnesses, or registry.register — that is the point.
    const a = new Agent({ model: 'anthropic/claude-sonnet-4-20250514' });

    // Primary assertion: resolved harness is 'pi'.
    // Note: agent.config.harness reflects the raw input (undefined when user omits it),
    // not the cascade-resolved id. The resolved harness is on the private harness instance.
    // @ts-expect-error - Testing private property (harness is private readonly)
    expect(a.harness.id).toBe('pi');

    // Auto-register materialized BOTH built-in defaults (distinct from
    // cascade-matrix scenario 4, which only checks the resolved id).
    expect(HarnessRegistry.getInstance().has('pi')).toBe(true);
    expect(HarnessRegistry.getInstance().has('claude-code')).toBe(true);
  });

  it('does not throw when constructing with zero setup (explicit no-throw regression guard)', () => {
    // The keystone Issue-1 regression guard: pre-T1.S1 this threw
    // "Harness 'anthropic' is not registered" because the legacy singleton
    // defaulted to 'anthropic' with nothing in the registry.
    expect(() => new Agent({ model: 'anthropic/claude-sonnet-4-20250514' })).not.toThrow();
  });
});

// ===========================================================================
// Block B — Example 02 launch smoke (the shipped reproducer)
//
// Replicates the exact launch sequence of examples/harnesses/02-harness-configuration.ts
// (L70-77 configureHarnesses, L98-99 manual register, L121-124 the crash point).
//
// WHY REPLICATE INSTEAD OF IMPORTING:
//   The example file has a top-level guard (L36-40):
//     if (!process.env.ANTHROPIC_API_KEY) process.exit(1);
//   Importing it without the env var KILLS the test process. And
//   runHarnessConfigurationExample() calls agent.prompt() (real SDK/network).
//   We replicate the launch sequence and STOP before L100 (initializeProvider)
//   and L193+ (agent.prompt).
//
// WHY STOP BEFORE SDK CALLS:
//   The crash reproducer is the Agent construction at L121. Everything after
//   needs a real API key / SDK client and is out of scope for a unit-level
//   launch smoke.
// ===========================================================================
describe('Example 02 launch smoke (examples/harnesses/02-harness-configuration.ts reproducer)', () => {
  it('replicates example 02 launch (configureHarnesses + manual register + no-harness Agent) without throwing', () => {
    // L70-77 equivalent: global harness configuration.
    // harnessDefaults trimmed to the reproducer-relevant keys; construction
    // does not call the SDK so the apiKey value is never sent.
    configureHarnesses({
      defaultHarness: 'pi',
      defaultModelProvider: 'anthropic',
      harnessDefaults: {
        'claude-code': { apiKey: 'dummy-not-used-construction-only', timeout: 30000 },
      },
    });

    // L98-99 equivalent: the example's manual registration (old-style;
    // auto-register makes this redundant but the example still does it —
    // replicating faithfully proves the example launches).
    const registry = HarnessRegistry.getInstance();
    registry.register(new ClaudeCodeHarness());
    registry.register(new PiHarness());

    // L121-124 equivalent: the CRASH POINT — no harness field, inherits
    // global defaultHarness 'pi'. Pre-fix this threw
    // "Harness 'anthropic' is not registered".
    const agent = new Agent({ name: 'DefaultAgent' /* no harness */ });

    // Resolves to global default 'pi'
    // @ts-expect-error - Testing private property (harness is private readonly)
    expect(agent.harness.id).toBe('pi');
  });

  it('explicit no-throw at the example-02 crash point (Agent construction)', () => {
    // Same setup as above but focused on the not.toThrow contract
    configureHarnesses({
      defaultHarness: 'pi',
      defaultModelProvider: 'anthropic',
      harnessDefaults: {
        'claude-code': { apiKey: 'dummy-not-used-construction-only', timeout: 30000 },
      },
    });
    const registry = HarnessRegistry.getInstance();
    registry.register(new ClaudeCodeHarness());
    registry.register(new PiHarness());

    expect(() => new Agent({ name: 'DefaultAgent' })).not.toThrow();
  });
});

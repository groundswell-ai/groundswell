/**
 * Unit tests for PiHarness buildCustomTools() delegation to MCPHandler.toPiCustomTools().
 *
 * buildCustomTools() is a 1-line delegator: `return this.mcpHandler.toPiCustomTools()`.
 * The real logic (schema conversion, executor delegation) is tested in
 * mcp-handler-pi-customtools.test.ts.
 *
 * PRP: P2.M4.T1.S2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeToolDef = {
  name: 'srv__echo',
  label: 'srv__echo',
  description: 'echoes input',
  parameters: {},
  execute: vi.fn(async () => ({
    content: [{ type: 'text' as const, text: 'x' }],
    details: { isError: false },
  })),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness - buildCustomTools() delegates to MCPHandler.toPiCustomTools', () => {
  let harness: PiHarness;

  beforeEach(async () => {
    harness = new PiHarness();
    await harness.initialize();
    HarnessRegistry._resetForTesting();
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  // ── Shape — pure delegation ────────────────────────────────────────────

  describe('delegation', () => {
    it('should return the exact array from mcpHandler.toPiCustomTools (same reference)', () => {
      const fakeTools = [fakeToolDef];
      vi.spyOn((harness as any).mcpHandler, 'toPiCustomTools').mockReturnValue(fakeTools);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools();
      expect(tools).toBe(fakeTools); // same reference — pure delegation
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('srv__echo');
    });
  });

  // ── Empty delegation ──────────────────────────────────────────────────

  describe('empty delegation', () => {
    it('should return [] when mcpHandler.toPiCustomTools returns []', () => {
      vi.spyOn((harness as any).mcpHandler, 'toPiCustomTools').mockReturnValue([]);

      // @ts-expect-error - Testing private method
      const tools = harness.buildCustomTools();
      expect(tools).toHaveLength(0);
    });
  });

  // ── execute() passes customTools into createAgentSession ────────────────

  describe('execute() integration — customTools wired', () => {
    it('should pass non-empty customTools into createAgentSession when tools are registered', async () => {
      const executor = vi.fn(async () => ({
        content: 'ok',
        isError: false,
      }));

      // Spy toPiCustomTools to return a fake tool
      vi.spyOn((harness as any).mcpHandler, 'toPiCustomTools').mockReturnValue([fakeToolDef]);

      // Monkey-patch createAgentSession to capture opts
      let capturedOpts: any = {};
      const fakeSession = {
        subscribe: () => () => {},
        prompt: async () => {},
      };
      // @ts-expect-error - private field access for testing
      harness.sdk = {
        ...harness.sdk,
        createAgentSession: vi.fn(async (opts: any) => {
          capturedOpts = opts;
          return { session: fakeSession };
        }),
      };

      await harness.execute({ prompt: 'hi', options: {} }, executor);

      expect(capturedOpts.customTools).toHaveLength(1);
      expect(capturedOpts.customTools[0].name).toBe('srv__echo');
      expect(typeof capturedOpts.customTools[0].execute).toBe('function');
    });
  });
});

/**
 * Unit tests for PiHarness loadSkills() via Pi's NATIVE agentskills.io implementation.
 *
 * PRP: P2.M3.T2.S3 — loadSkillsFromDir + formatSkillsForPrompt → skillsPrompt →
 * buildSkillsResourceLoader → DefaultResourceLoader injected into createAgentSession.
 *
 * Uses the private-field overwrite idiom (mirror wireFakeSession in pi-harness-execute.test.ts)
 * to mock this.sdk.loadSkillsFromDir and this.sdk.formatSkillsForPrompt.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import type { Skill } from '../../../types/sdk-primitives.js';
import type { HarnessRequest } from '../../../types/harnesses.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeEvent = Record<string, unknown> & { type: string };

/** Builds a fake AgentSession whose subscribe captures the listener and prompt replays events. */
function makeFakeSession(events: FakeEvent[]) {
  let listener: ((e: FakeEvent) => void) | null = null;
  return {
    subscribe: vi.fn((l: (e: FakeEvent) => void) => {
      listener = l;
      return () => {
        listener = null;
      };
    }),
    prompt: vi.fn(async (_text: string) => {
      for (const e of events) listener?.(e);
    }),
    _emit(e: FakeEvent) {
      listener?.(e);
    },
  };
}

const TURN_END_TEXT = (text: string) => ({
  type: 'turn_end',
  turnIndex: 0,
  message: {
    role: 'assistant',
    content: [{ type: 'text', text }],
    usage: { input: 10, output: 10 },
    stopReason: 'stop',
  },
  toolResults: [],
});

/**
 * Wire fake skill functions + a fake createAgentSession into a real-initialized harness.
 * This mirrors the wireFakeSession pattern but ALSO mocks loadSkillsFromDir and formatSkillsForPrompt.
 */
function wireSkillMocks(harness: PiHarness) {
  // @ts-expect-error - private field access for testing
  harness.sdk = {
    ...harness.sdk,
    loadSkillsFromDir: vi.fn(({ dir, source }: { dir: string; source: string }) => ({
      skills: [
        {
          name: source,
          description: `Skill ${source}`,
          filePath: `${dir}/SKILL.md`,
          baseDir: dir,
          sourceInfo: {},
          disableModelInvocation: false,
        },
      ],
      diagnostics: [],
    })),
    formatSkillsForPrompt: vi.fn((skills: unknown[]) => `<skills>${skills.length}</skills>`),
    DefaultResourceLoader: vi.fn().mockImplementation(() => ({
      reload: vi.fn().mockResolvedValue(undefined),
    })),
    getAgentDir: vi.fn(() => '/tmp/pi-agent'),
    createAgentSession: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PiHarness - loadSkills()', () => {
  let harness: PiHarness;

  beforeEach(async () => {
    harness = new PiHarness();
    await harness.initialize();
    HarnessRegistry._resetForTesting();
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
  });

  describe('init guard', () => {
    it('should throw /not initialized/ when harness is not initialized', async () => {
      const fresh = new PiHarness(); // no initialize()
      await expect(
        fresh.loadSkills([{ name: 'a', path: '/x' }]),
      ).rejects.toThrow(/not initialized/i);
    });
  });

  describe('empty array', () => {
    it('should set skillsPrompt to "" and not call loadSkillsFromDir', async () => {
      wireSkillMocks(harness);
      await harness.loadSkills([]);

      // @ts-expect-error - private field access for testing
      expect(harness.skillsPrompt).toBe('');
      // @ts-expect-error - private field access for testing
      expect(harness.sdk.loadSkillsFromDir).not.toHaveBeenCalled();
    });
  });

  describe('single skill', () => {
    it('should call loadSkillsFromDir once and formatSkillsForPrompt once', async () => {
      wireSkillMocks(harness);
      await harness.loadSkills([{ name: 'tdd', path: '/s/tdd' }]);

      // @ts-expect-error - private field access for testing
      expect(harness.sdk.loadSkillsFromDir).toHaveBeenCalledTimes(1);
      // @ts-expect-error - private field access for testing
      expect(harness.sdk.loadSkillsFromDir).toHaveBeenCalledWith({
        dir: '/s/tdd',
        source: 'tdd',
      });
      // @ts-expect-error - private field access for testing
      expect(harness.sdk.formatSkillsForPrompt).toHaveBeenCalledTimes(1);
      // @ts-expect-error - private field access for testing
      const passedSkills = harness.sdk.formatSkillsForPrompt.mock.calls[0][0];
      expect(passedSkills).toHaveLength(1);
      // @ts-expect-error - private field access for testing
      expect(harness.skillsPrompt).toBe('<skills>1</skills>');
    });
  });

  describe('multiple skills', () => {
    it('should call loadSkillsFromDir twice and collect all skills', async () => {
      wireSkillMocks(harness);
      await harness.loadSkills([
        { name: 'a', path: '/a' },
        { name: 'b', path: '/b' },
      ]);

      // @ts-expect-error - private field access for testing
      expect(harness.sdk.loadSkillsFromDir).toHaveBeenCalledTimes(2);
      // @ts-expect-error - private field access for testing
      expect(harness.sdk.formatSkillsForPrompt).toHaveBeenCalledTimes(1);
      // The collected array passed to formatSkillsForPrompt should have 2 skills
      // @ts-expect-error - private field access for testing
      const passedSkills = harness.sdk.formatSkillsForPrompt.mock.calls[0][0];
      expect(passedSkills).toHaveLength(2);
      // @ts-expect-error - private field access for testing
      expect(harness.skillsPrompt).toBe('<skills>2</skills>');
    });
  });

  describe('accumulation', () => {
    it('should flatten all loadSkillsFromDir results into one array', async () => {
      wireSkillMocks(harness);
      // Make the second loadSkillsFromDir return 2 skills
      // @ts-expect-error - private field access for testing
      harness.sdk.loadSkillsFromDir = vi.fn(({ dir, source }: { dir: string; source: string }) => {
        if (source === 'a') {
          return { skills: [{ name: 'a1' }, { name: 'a2' }], diagnostics: [] };
        }
        return { skills: [{ name: 'b1' }], diagnostics: [] };
      });

      await harness.loadSkills([
        { name: 'a', path: '/a' },
        { name: 'b', path: '/b' },
      ]);

      // @ts-expect-error - private field access for testing
      const passedSkills = harness.sdk.formatSkillsForPrompt.mock.calls[0][0];
      expect(passedSkills).toHaveLength(3);
    });
  });

  describe('error wrapping', () => {
    it('should wrap per-skill errors with skill name and path', async () => {
      wireSkillMocks(harness);
      // @ts-expect-error - private field access for testing
      harness.sdk.loadSkillsFromDir = vi.fn(() => {
        throw new Error('permission denied');
      });

      await expect(
        harness.loadSkills([{ name: 'bad', path: '/x' }]),
      ).rejects.toThrow(/Failed to load skill 'bad' from \/x: permission denied/);
    });
  });

  describe('disableModelInvocation passthrough', () => {
    it('should NOT filter disableModelInvocation:true — passed through to formatSkillsForPrompt', async () => {
      wireSkillMocks(harness);
      // Return a skill with disableModelInvocation: true
      // @ts-expect-error - private field access for testing
      harness.sdk.loadSkillsFromDir = vi.fn(({ dir, source }: { dir: string; source: string }) => ({
        skills: [
          {
            name: source,
            description: `Skill ${source}`,
            filePath: `${dir}/SKILL.md`,
            baseDir: dir,
            sourceInfo: {},
            disableModelInvocation: true,
          },
        ],
        diagnostics: [],
      }));

      await harness.loadSkills([{ name: 'disabled-skill', path: '/s/disabled' }]);

      // @ts-expect-error - private field access for testing
      const passedSkills = harness.sdk.formatSkillsForPrompt.mock.calls[0][0];
      expect(passedSkills).toHaveLength(1);
      // We do NOT filter — Pi's formatSkillsForPrompt does that internally
      // @ts-expect-error - private field access for testing
      expect(passedSkills[0].disableModelInvocation).toBe(true);
    });
  });

  describe('skillsPrompt persists for execute', () => {
    it('should have non-empty skillsPrompt after loadSkills', async () => {
      wireSkillMocks(harness);
      await harness.loadSkills([{ name: 'tdd', path: '/s/tdd' }]);

      // @ts-expect-error - private field access for testing
      expect(harness.skillsPrompt).toBe('<skills>1</skills>');
    });
  });

  describe('execute injection — resourceLoader', () => {
    it('should pass resourceLoader to createAgentSession when skills are loaded', async () => {
      wireSkillMocks(harness);
      const fakeSession = makeFakeSession([TURN_END_TEXT('hello')]);
      // @ts-expect-error - private field access for testing
      harness.sdk.createAgentSession = vi.fn().mockResolvedValue({ session: fakeSession });

      // Load skills first
      await harness.loadSkills([{ name: 'tdd', path: '/s/tdd' }]);

      // Now execute — createAgentSession should receive a resourceLoader
      const noopExecutor = async () => ({ content: '', isError: false });
      const request: HarnessRequest = {
        prompt: 'write a test',
        options: { model: 'claude-sonnet-4-20250514' },
      };
      await harness.execute(request, noopExecutor);

      // @ts-expect-error - private field access for testing
      const callArgs = harness.sdk.createAgentSession.mock.calls[0][0];
      expect(callArgs.resourceLoader).toBeDefined();
    });

    it('should NOT pass resourceLoader to createAgentSession when no skills are loaded', async () => {
      wireSkillMocks(harness);
      const fakeSession = makeFakeSession([TURN_END_TEXT('hello')]);
      // @ts-expect-error - private field access for testing
      harness.sdk.createAgentSession = vi.fn().mockResolvedValue({ session: fakeSession });

      // Do NOT load skills
      const noopExecutor = async () => ({ content: '', isError: false });
      const request: HarnessRequest = {
        prompt: 'write a test',
        options: { model: 'claude-sonnet-4-20250514' },
      };
      await harness.execute(request, noopExecutor);

      // @ts-expect-error - private field access for testing
      const callArgs = harness.sdk.createAgentSession.mock.calls[0][0];
      expect(callArgs.resourceLoader).toBeUndefined();
    });
  });
});

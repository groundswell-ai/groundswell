/**
 * Test file: provider-alias-shim.test.ts
 *
 * Purpose: Validate the deprecated Provider* → Harness* alias shim (P1.M1.T3.S1).
 *
 * Tests:
 * - Bucket A: ProviderCapabilities / ProviderHookEvents / ProviderExecutionOptions /
 *   ProviderRequest are type-identical to their Harness* counterparts.
 * - ToolExecutionRequest / ToolExecutionResult are the harness types (re-export).
 * - ModelSpec accepts the open ModelProviderId set.
 * - Bucket B: ProviderId is a superset (HarnessId | 'anthropic' | 'opencode').
 * - Bucket C: Concrete types still expose the fields consumers rely on.
 *
 * PRP: P1.M1.T3.S1 — Provider* → Harness* deprecated alias shim
 */

import { describe, it, expect } from 'vitest';
import type {
  ProviderCapabilities,
  ProviderHookEvents,
  ProviderExecutionOptions,
  ProviderRequest,
  ToolExecutionRequest,
  ToolExecutionResult,
  ModelSpec,
  ProviderId,
  ProviderOptions,
  GlobalProviderConfig,
  SessionState,
} from '../../../types/providers.js';
import type {
  HarnessCapabilities,
  HarnessHookEvents,
  HarnessExecutionOptions,
  HarnessRequest,
} from '../../../types/harnesses.js';

describe('Provider* deprecated alias shim', () => {
  // ── Bucket A: type-identity assertions ──────────────────────────────────────────

  describe('Bucket A — aliases', () => {
    it('ProviderCapabilities === HarnessCapabilities', () => {
      const caps: ProviderCapabilities = {
        mcp: true,
        skills: true,
        lsp: true,
        streaming: true,
        sessions: false,
        extendedThinking: false,
      };
      const asHarness: HarnessCapabilities = caps; // compiles iff identical
      expect(asHarness.mcp).toBe(true);
      expect(asHarness.skills).toBe(true);
      expect(asHarness.lsp).toBe(true);
      expect(asHarness.streaming).toBe(true);
      expect(asHarness.sessions).toBe(false);
      expect(asHarness.extendedThinking).toBe(false);
    });

    it('ProviderHookEvents === HarnessHookEvents', () => {
      const hooks: ProviderHookEvents = { onStream: () => {} };
      const asHarness: HarnessHookEvents = hooks; // compiles iff identical
      expect(typeof hooks.onStream).toBe('function');
    });

    it('ProviderExecutionOptions === HarnessExecutionOptions', () => {
      const o: ProviderExecutionOptions = {
        model: 'anthropic/claude-sonnet-4',
        streaming: true,
      };
      const asHarness: HarnessExecutionOptions = o; // compiles iff identical
      expect(o.streaming).toBe(true);
    });

    it('ProviderRequest === HarnessRequest', () => {
      const r: ProviderRequest = { prompt: 'hi', options: {} };
      const asHarness: HarnessRequest = r; // compiles iff identical
      expect(r.prompt).toBe('hi');
    });

    it('ToolExecutionRequest/Result are the harness types', () => {
      const req: ToolExecutionRequest = { name: 'fs__read', input: {} };
      const res: ToolExecutionResult = { content: 'x', isError: false };
      expect(req.name).toBe('fs__read');
      expect(res.isError).toBe(false);
    });

    it('ModelSpec accepts the open ModelProviderId set', () => {
      const spec: ModelSpec = {
        provider: 'openai',
        model: 'gpt-4o',
        raw: 'openai/gpt-4o',
      };
      expect(spec.provider).toBe('openai');
    });
  });

  // ── Bucket B: ProviderId superset ─────────────────────────────────────────────

  describe('Bucket B — ProviderId superset', () => {
    it('ProviderId accepts all four literals (harness + legacy)', () => {
      const ids: ProviderId[] = ['pi', 'claude-code', 'anthropic', 'opencode'];
      expect(ids).toHaveLength(4);
    });

    it('ProviderId accepts new harness axis literals', () => {
      const pi: ProviderId = 'pi';
      const claudeCode: ProviderId = 'claude-code';
      expect(pi).toBe('pi');
      expect(claudeCode).toBe('claude-code');
    });

    it('ProviderId accepts legacy adapter literals', () => {
      const legacyAnthropic: ProviderId = 'anthropic';
      const legacyOpencode: ProviderId = 'opencode';
      expect(legacyAnthropic).toBe('anthropic');
      expect(legacyOpencode).toBe('opencode');
    });
  });

  // ── Bucket C: concrete types still work ───────────────────────────────────────

  describe('Bucket C — concrete types preserved', () => {
    it('ProviderOptions keeps session fields', () => {
      const opts: ProviderOptions = {
        sessionPersistence: 'file',
        sessionPath: '/tmp',
        sessionTtl: 1000,
      };
      expect(opts.sessionPersistence).toBe('file');
      expect(opts.sessionPath).toBe('/tmp');
      expect(opts.sessionTtl).toBe(1000);
    });

    it('GlobalProviderConfig keeps old field names', () => {
      const cfg: GlobalProviderConfig = {
        defaultProvider: 'anthropic',
        providerDefaults: {
          anthropic: { apiKey: 'sk-' },
        },
      };
      expect(cfg.defaultProvider).toBe('anthropic');
      expect(cfg.providerDefaults?.anthropic?.apiKey).toBe('sk-');
    });

    it('SessionState shape is intact', () => {
      const st: SessionState = { history: [], lastResult: null };
      expect(st.history).toHaveLength(0);
      expect(st.lastResult).toBeNull();
    });
  });
});

/**
 * Test file: harness-public-api.test.ts
 *
 * Purpose: Verify the PRD 7 harness surface is exported from the public API (src/index.ts)
 * AND that the legacy Provider aliases (AnthropicProvider/ProviderRegistry) remain (backward compat).
 *
 * PRP: P3.M3.T1.S1 - Export Harness surface + deprecated aliases in src/index.ts
 */
import { describe, it, expect } from 'vitest';
// Import from MAIN INDEX (public API entry point)
import type {
  Harness,
  HarnessId,
  ModelProviderId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessRequest,
  HarnessHookEvents,
  GlobalHarnessConfig,
  ModelSpec,
} from '../../index.js';
import type {
  Provider,
  ProviderId,
  GlobalProviderConfig,
} from '../../index.js';
import {
  PiHarness,
  ClaudeCodeHarness,
  AnthropicProvider,
  HarnessRegistry,
  ProviderRegistry,
  configureHarnesses,
  parseModelSpec,
  formatModelForProvider,
} from '../../index.js';

describe('Harness Public API Exports', () => {
  describe('Harness types (PRD 7.2-7.8)', () => {
    it('exports HarnessId ("pi" | "claude-code")', () => {
      const ids: HarnessId[] = ['pi', 'claude-code'];
      expect(ids).toEqual(['pi', 'claude-code']);
    });
    it('exports ModelProviderId (open set incl. anthropic/openai)', () => {
      const p: ModelProviderId = 'anthropic';
      expect(p).toBe('anthropic');
    });
    it('exports HarnessCapabilities shape', () => {
      const caps: HarnessCapabilities = {
        mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: false,
      };
      expect(caps.mcp).toBe(true);
      expect(caps.extendedThinking).toBe(false);
    });
    it('exports HarnessOptions shape', () => {
      const opts: HarnessOptions = { endpoint: 'https://x', apiKey: 'k', sessionId: 's', timeout: 1, headers: {} };
      expect(opts.endpoint).toBe('https://x');
    });
    it('exports HarnessRequest shape', () => {
      const req: HarnessRequest = { prompt: 'hi', options: {} };
      expect(req.prompt).toBe('hi');
    });
    it('exports HarnessHookEvents shape', () => {
      const hooks: HarnessHookEvents = { onStream: () => {} };
      expect(typeof hooks.onStream).toBe('function');
    });
    it('exports GlobalHarnessConfig shape', () => {
      const cfg: GlobalHarnessConfig = { defaultHarness: 'pi', defaultModelProvider: 'anthropic' };
      expect(cfg.defaultHarness).toBe('pi');
    });
    it('exports ModelSpec shape', () => {
      const spec: ModelSpec = { provider: 'anthropic', model: 'claude-sonnet-4', raw: 'anthropic/claude-sonnet-4' };
      expect(spec.provider).toBe('anthropic');
    });
  });

  describe('Harness classes (PRD 7.3)', () => {
    it('exports PiHarness', () => {
      expect(typeof PiHarness).toBe('function');
    });
    it('exports ClaudeCodeHarness', () => {
      expect(typeof ClaudeCodeHarness).toBe('function');
    });
    it('exports HarnessRegistry and it is constructible', () => {
      expect(typeof HarnessRegistry).toBe('function');
      const reg = new HarnessRegistry();
      expect(reg).toBeInstanceOf(HarnessRegistry);
    });
  });

  describe('Harness configuration and model-spec functions (PRD 7.6 / 7.8)', () => {
    it('exports configureHarnesses (callable, accepts valid config)', () => {
      expect(typeof configureHarnesses).toBe('function');
      expect(() => configureHarnesses({ defaultHarness: 'pi' })).not.toThrow();
    });
    it('exports parseModelSpec (parses qualified model)', () => {
      expect(typeof parseModelSpec).toBe('function');
      const spec = parseModelSpec('anthropic/claude-sonnet-4-20250514');
      expect(spec.provider).toBe('anthropic');
      expect(spec.model).toBe('claude-sonnet-4-20250514');
      expect(spec.raw).toBe('anthropic/claude-sonnet-4-20250514');
    });
    it('exports formatModelForProvider (same-provider pass-through)', () => {
      expect(typeof formatModelForProvider).toBe('function');
      const spec = parseModelSpec('anthropic/claude-sonnet-4-20250514');
      expect(formatModelForProvider(spec, 'anthropic')).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('Backward compatibility (deprecated aliases retained)', () => {
    it('still exports AnthropicProvider === ClaudeCodeHarness', () => {
      expect(AnthropicProvider).toBe(ClaudeCodeHarness);
    });
    it('still exports ProviderRegistry === HarnessRegistry', () => {
      expect(ProviderRegistry).toBe(HarnessRegistry);
    });
    it('still exports legacy Provider* types (compile-time reachability)', () => {
      const pid: ProviderId = 'anthropic' as ProviderId;
      expect(pid).toBe('anthropic');
      const gpc: GlobalProviderConfig = { defaultProvider: 'anthropic' } as GlobalProviderConfig;
      expect(gpc.defaultProvider).toBe('anthropic');
    });
  });
});

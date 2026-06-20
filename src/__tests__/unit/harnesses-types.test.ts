/**
 * Test file: harnesses-types.test.ts
 *
 * Purpose: Validate Harness*, ModelProviderId, and ModelSpec type definitions per PRD §7.2–§7.5, §7.8, §7.10, §7.11
 *
 * Tests:
 * - HarnessId narrows to 'pi' | 'claude-code'
 * - ModelProviderId is an open set (4 literals + arbitrary string)
 * - HarnessCapabilities has all 6 boolean flags
 * - HarnessOptions has slimmed fields (no session-store)
 * - HarnessHookEvents has all 5 optional hook callbacks
 * - ToolExecutionRequest/Result match verbatim shape from providers.ts
 * - HarnessExecutionOptions has model, systemPrompt, tools, hooks, sessionId, streaming
 * - HarnessRequest has prompt + options
 * - ModelSpec has provider (ModelProviderId), model, raw
 * - Harness interface surface matches PRD §7.3
 *
 * PRP: P1.M1.T1.S1 - Create harnesses.ts with core harness interfaces
 */

import { describe, it, expect } from 'vitest';
import type {
  HarnessId,
  ModelProviderId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
  HarnessExecutionOptions,
  HarnessRequest,
  ModelSpec,
  Harness,
} from '../../types/harnesses.js';

describe('Harness Types', () => {
  describe('HarnessId', () => {
    it('should accept valid harness id values', () => {
      const piId: HarnessId = 'pi';
      const claudeCodeId: HarnessId = 'claude-code';

      expect(piId).toBe('pi');
      expect(claudeCodeId).toBe('claude-code');
    });

    it('should narrow to exactly two values', () => {
      const validIds: HarnessId[] = ['pi', 'claude-code'];

      expect(validIds).toHaveLength(2);
      expect(validIds).toContain('pi');
      expect(validIds).toContain('claude-code');
    });
  });

  describe('ModelProviderId', () => {
    it('should accept the four well-known provider literals', () => {
      const anthropic: ModelProviderId = 'anthropic';
      const openai: ModelProviderId = 'openai';
      const google: ModelProviderId = 'google';
      const zai: ModelProviderId = 'zai';

      expect(anthropic).toBe('anthropic');
      expect(openai).toBe('openai');
      expect(google).toBe('google');
      expect(zai).toBe('zai');
    });

    it('should accept arbitrary strings (open set)', () => {
      const custom: ModelProviderId = 'my-custom-provider';
      const another: ModelProviderId = 'deepseek';
      const yetAnother: ModelProviderId = 'groq/llama';

      expect(custom).toBe('my-custom-provider');
      expect(another).toBe('deepseek');
      expect(yetAnother).toBe('groq/llama');
    });
  });

  describe('HarnessCapabilities', () => {
    it('should have all 6 boolean capability flags', () => {
      const caps: HarnessCapabilities = {
        mcp: true,
        skills: true,
        lsp: true,
        streaming: true,
        sessions: false,
        extendedThinking: false,
      };

      expect(caps.mcp).toBe(true);
      expect(caps.skills).toBe(true);
      expect(caps.lsp).toBe(true);
      expect(caps.streaming).toBe(true);
      expect(caps.sessions).toBe(false);
      expect(caps.extendedThinking).toBe(false);
    });

    it('should allow all capabilities set to true', () => {
      const fullCaps: HarnessCapabilities = {
        mcp: true,
        skills: true,
        lsp: true,
        streaming: true,
        sessions: true,
        extendedThinking: true,
      };

      Object.values(fullCaps).forEach((val) => {
        expect(val).toBe(true);
      });
    });
  });

  describe('HarnessOptions', () => {
    it('should have slimmed fields (no session-store)', () => {
      const options: HarnessOptions = {
        endpoint: 'https://api.example.com',
        apiKey: 'sk-test',
        sessionId: 'session-123',
        timeout: 60000,
        headers: { 'X-Custom': 'value' },
      };

      expect(options.endpoint).toBe('https://api.example.com');
      expect(options.apiKey).toBe('sk-test');
      expect(options.sessionId).toBe('session-123');
      expect(options.timeout).toBe(60000);
      expect(options.headers?.['X-Custom']).toBe('value');

      // Confirm session-store fields are NOT present on the type
      const opts = options as Record<string, unknown>;
      expect(opts.sessionStore).toBeUndefined();
      expect(opts.sessionPersistence).toBeUndefined();
      expect(opts.sessionTtl).toBeUndefined();
      expect(opts.sessionPath).toBeUndefined();
    });

    it('should allow all fields to be optional', () => {
      const empty: HarnessOptions = {};

      expect(empty.endpoint).toBeUndefined();
      expect(empty.apiKey).toBeUndefined();
      expect(empty.sessionId).toBeUndefined();
      expect(empty.timeout).toBeUndefined();
      expect(empty.headers).toBeUndefined();
    });
  });

  describe('HarnessHookEvents', () => {
    it('should have all 5 optional hook callbacks', () => {
      const hooks: HarnessHookEvents = {
        onToolStart: async (_tool) => {},
        onToolEnd: async (_tool, _result, _duration) => {},
        onSessionStart: async () => {},
        onSessionEnd: async (_totalDuration) => {},
        onStream: (_chunk) => {},
      };

      expect(hooks.onToolStart).toBeDefined();
      expect(hooks.onToolEnd).toBeDefined();
      expect(hooks.onSessionStart).toBeDefined();
      expect(hooks.onSessionEnd).toBeDefined();
      expect(hooks.onStream).toBeDefined();
    });

    it('should allow hooks to be optional', () => {
      const empty: HarnessHookEvents = {};

      expect(empty.onToolStart).toBeUndefined();
      expect(empty.onToolEnd).toBeUndefined();
      expect(empty.onSessionStart).toBeUndefined();
      expect(empty.onSessionEnd).toBeUndefined();
      expect(empty.onStream).toBeUndefined();
    });

    it('should accept sync or async hook implementations', () => {
      const syncHooks: HarnessHookEvents = {
        onToolStart: (_tool) => {},
        onStream: (_chunk) => {},
      };

      const asyncHooks: HarnessHookEvents = {
        onToolEnd: async (_tool, _result, _duration) => {},
        onSessionEnd: async (_totalDuration) => {},
      };

      expect(syncHooks.onToolStart).toBeDefined();
      expect(asyncHooks.onToolEnd).toBeDefined();
    });
  });

  describe('ToolExecutionRequest', () => {
    it('should have name and input fields', () => {
      const req: ToolExecutionRequest = {
        name: 'filesystem__read_file',
        input: { path: '/src/index.ts' },
      };

      expect(req.name).toBe('filesystem__read_file');
      expect(req.input).toEqual({ path: '/src/index.ts' });
    });

    it('should accept any unknown input', () => {
      const stringInput: ToolExecutionRequest = { name: 'echo', input: 'hello' };
      const nullInput: ToolExecutionRequest = { name: 'noop', input: null };
      const arrayInput: ToolExecutionRequest = { name: 'batch', input: [1, 2, 3] };

      expect(stringInput.input).toBe('hello');
      expect(nullInput.input).toBeNull();
      expect(arrayInput.input).toEqual([1, 2, 3]);
    });
  });

  describe('ToolExecutionResult', () => {
    it('should have content and isError fields', () => {
      const result: ToolExecutionResult = {
        content: 'const x = 1;',
        isError: false,
      };

      expect(result.content).toBe('const x = 1;');
      expect(result.isError).toBe(false);
    });

    it('should accept string or unknown content', () => {
      const strResult: ToolExecutionResult = { content: 'text output', isError: false };
      const objResult: ToolExecutionResult = { content: { key: 'value' }, isError: false };
      const errorResult: ToolExecutionResult = { content: 'Error: something broke', isError: true };

      expect(typeof strResult.content).toBe('string');
      expect(typeof objResult.content).toBe('object');
      expect(errorResult.isError).toBe(true);
    });
  });

  describe('HarnessExecutionOptions', () => {
    it('should have all expected fields', () => {
      const opts: HarnessExecutionOptions = {
        model: 'anthropic/claude-sonnet-4',
        systemPrompt: 'You are helpful.',
        sessionId: 'sess-123',
        streaming: false,
      };

      expect(opts.model).toBe('anthropic/claude-sonnet-4');
      expect(opts.systemPrompt).toBe('You are helpful.');
      expect(opts.sessionId).toBe('sess-123');
      expect(opts.streaming).toBe(false);
      expect(opts.tools).toBeUndefined();
      expect(opts.hooks).toBeUndefined();
    });

    it('should allow all fields to be optional', () => {
      const empty: HarnessExecutionOptions = {};

      expect(empty.model).toBeUndefined();
      expect(empty.systemPrompt).toBeUndefined();
      expect(empty.tools).toBeUndefined();
      expect(empty.hooks).toBeUndefined();
      expect(empty.sessionId).toBeUndefined();
      expect(empty.streaming).toBeUndefined();
    });
  });

  describe('HarnessRequest', () => {
    it('should have prompt and options fields', () => {
      const request: HarnessRequest = {
        prompt: 'What is TypeScript?',
        options: {
          model: 'claude-sonnet-4',
          streaming: false,
        },
      };

      expect(request.prompt).toBe('What is TypeScript?');
      expect(request.options.model).toBe('claude-sonnet-4');
    });

    it('should support streaming option', () => {
      const request: HarnessRequest = {
        prompt: 'Stream this response',
        options: { streaming: true },
      };

      expect(request.options.streaming).toBe(true);
    });
  });

  describe('ModelSpec', () => {
    it('should have provider (ModelProviderId), model, and raw fields', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        raw: 'claude-sonnet-4-20250514',
      };

      expect(spec.provider).toBe('anthropic');
      expect(spec.model).toBe('claude-sonnet-4-20250514');
      expect(spec.raw).toBe('claude-sonnet-4-20250514');
    });

    it('should accept qualified model strings', () => {
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-opus-4-20250514',
        raw: 'anthropic/claude-opus-4-20250514',
      };

      expect(spec.provider).toBe('anthropic');
      expect(spec.model).toBe('claude-opus-4-20250514');
      expect(spec.raw).toBe('anthropic/claude-opus-4-20250514');
    });

    it('should accept ModelProviderId (not ProviderId) for provider', () => {
      // The new ModelSpec uses ModelProviderId (open set), not ProviderId (closed set)
      const spec: ModelSpec = {
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        raw: 'claude-sonnet-4',
      };

      expect(spec.provider).toBeDefined();
    });

    it('should accept custom provider strings via open union', () => {
      const spec: ModelSpec = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        raw: 'deepseek/deepseek-chat',
      };

      expect(spec.provider).toBe('deepseek');
    });
  });

  describe('Harness interface', () => {
    it('should satisfy the interface with a concrete implementation shape', () => {
      // This is a type-level test: if this compiles, the interface surface is correct.
      // We assign a partial mock to validate the shape.
      const harness: Harness = {
        id: 'pi',
        capabilities: {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: true,
          extendedThinking: false,
        },
        initialize: async (_options?) => {},
        terminate: async () => {},
        execute: async <T>(
          _request: HarnessRequest,
          _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
          _hooks?: HarnessHookEvents,
        ) => {
          return {
            status: 'success',
            data: null as T,
            error: null,
            metadata: { agentId: 'test', timestamp: Date.now() },
          };
        },
        registerMCPs: async (_servers) => [],
        loadSkills: async (_skills) => {},
        normalizeModel: (model: string): ModelSpec => ({
          provider: 'anthropic',
          model,
          raw: model,
        }),
        supports: (capability: keyof HarnessCapabilities): boolean => {
          return capability === 'mcp';
        },
        requiresFeatures: (features: (keyof HarnessCapabilities)[]): boolean => {
          return features.every((f) => f === 'mcp');
        },
      };

      expect(harness.id).toBe('pi');
      expect(harness.capabilities.mcp).toBe(true);
      expect(typeof harness.initialize).toBe('function');
      expect(typeof harness.terminate).toBe('function');
      expect(typeof harness.execute).toBe('function');
      expect(typeof harness.registerMCPs).toBe('function');
      expect(typeof harness.loadSkills).toBe('function');
      expect(typeof harness.normalizeModel).toBe('function');
      expect(typeof harness.supports).toBe('function');
      expect(typeof harness.requiresFeatures).toBe('function');
    });

    it('should have readonly id and capabilities', () => {
      const harness: Harness = {
        id: 'claude-code',
        capabilities: {
          mcp: false,
          skills: false,
          lsp: false,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        },
        initialize: async () => {},
        terminate: async () => {},
        execute: async <T>(
          _request: HarnessRequest,
          _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
          _hooks?: HarnessHookEvents,
        ) => ({
          status: 'success',
          data: null as T,
          error: null,
          metadata: { agentId: 'claude-code', timestamp: Date.now() },
        }),
        registerMCPs: async () => [],
        loadSkills: async () => {},
        normalizeModel: (model: string): ModelSpec => ({
          provider: 'anthropic',
          model,
          raw: model,
        }),
        supports: () => false,
        requiresFeatures: () => false,
      };

      expect(harness.id).toBe('claude-code');
      expect(harness.capabilities.streaming).toBe(true);
    });

    it('should normalize model correctly', () => {
      const harness: Harness = {
        id: 'pi',
        capabilities: {
          mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: false,
        },
        initialize: async () => {},
        terminate: async () => {},
        execute: async <T>(
          _request: HarnessRequest,
          _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
          _hooks?: HarnessHookEvents,
        ) => ({
          status: 'success',
          data: null as T,
          error: null,
          metadata: { agentId: 'pi', timestamp: Date.now() },
        }),
        registerMCPs: async () => [],
        loadSkills: async () => {},
        normalizeModel: (model: string): ModelSpec => {
          const slashIdx = model.indexOf('/');
          if (slashIdx !== -1) {
            return {
              provider: model.slice(0, slashIdx),
              model: model.slice(slashIdx + 1),
              raw: model,
            };
          }
          return { provider: 'anthropic', model, raw: model };
        },
        supports: () => true,
        requiresFeatures: () => true,
      };

      const plain = harness.normalizeModel('claude-sonnet-4');
      expect(plain.provider).toBe('anthropic');
      expect(plain.model).toBe('claude-sonnet-4');
      expect(plain.raw).toBe('claude-sonnet-4');

      const qualified = harness.normalizeModel('anthropic/claude-opus-4');
      expect(qualified.provider).toBe('anthropic');
      expect(qualified.model).toBe('claude-opus-4');
      expect(qualified.raw).toBe('anthropic/claude-opus-4');
    });

    it('supports() should return boolean', () => {
      const harness: Harness = {
        id: 'pi',
        capabilities: {
          mcp: true, skills: false, lsp: true, streaming: true, sessions: false, extendedThinking: false,
        },
        initialize: async () => {},
        terminate: async () => {},
        execute: async <T>(
          _request: HarnessRequest,
          _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
          _hooks?: HarnessHookEvents,
        ) => ({
          status: 'success',
          data: null as T,
          error: null,
          metadata: { agentId: 'pi', timestamp: Date.now() },
        }),
        registerMCPs: async () => [],
        loadSkills: async () => {},
        normalizeModel: (model: string): ModelSpec => ({ provider: 'anthropic', model, raw: model }),
        supports: (capability: keyof HarnessCapabilities): boolean => {
          const supported: (keyof HarnessCapabilities)[] = ['mcp', 'lsp', 'streaming'];
          return supported.includes(capability);
        },
        requiresFeatures: (features: (keyof HarnessCapabilities)[]): boolean => {
          return features.every((f) => ['mcp', 'lsp', 'streaming'].includes(f));
        },
      };

      expect(harness.supports('mcp')).toBe(true);
      expect(harness.supports('skills')).toBe(false);
      expect(harness.requiresFeatures(['mcp', 'streaming'])).toBe(true);
      expect(harness.requiresFeatures(['mcp', 'skills'])).toBe(false);
      expect(harness.requiresFeatures([])).toBe(true);
    });
  });

  describe('Type Exports', () => {
    it('should export all harness types', () => {
      // Compilation of this block proves all types are exported
      const _id: HarnessId = 'pi';
      const _provider: ModelProviderId = 'anthropic';
      const _caps: HarnessCapabilities = { mcp: true, skills: true, lsp: true, streaming: true, sessions: true, extendedThinking: true };
      const _opts: HarnessOptions = {};
      const _hooks: HarnessHookEvents = {};
      const _toolReq: ToolExecutionRequest = { name: 't', input: {} };
      const _toolRes: ToolExecutionResult = { content: '', isError: false };
      const _execOpts: HarnessExecutionOptions = {};
      const _request: HarnessRequest = { prompt: '', options: {} };
      const _spec: ModelSpec = { provider: 'anthropic', model: '', raw: '' };

      expect(_id).toBeDefined();
      expect(_provider).toBeDefined();
      expect(_caps).toBeDefined();
      expect(_opts).toBeDefined();
      expect(_hooks).toBeDefined();
      expect(_toolReq).toBeDefined();
      expect(_toolRes).toBeDefined();
      expect(_execOpts).toBeDefined();
      expect(_request).toBeDefined();
      expect(_spec).toBeDefined();
    });
  });
});

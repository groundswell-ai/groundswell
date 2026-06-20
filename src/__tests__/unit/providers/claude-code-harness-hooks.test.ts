/**
 * Unit tests for ClaudeCodeHarness.buildAgentSDKHooks()
 *
 * Tests the adapter method that converts ProviderHookEvents to
 * Anthropic Agent SDK-compatible hook format.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeCodeHarness } from '../../../harnesses/claude-code-harness.js';
import type { ProviderHookEvents, ToolExecutionRequest, ToolExecutionResult } from '../../../types/providers.js';

describe('ClaudeCodeHarness.buildAgentSDKHooks()', () => {
  let provider: ClaudeCodeHarness;

  beforeEach(async () => {
    provider = new ClaudeCodeHarness();
    await provider.initialize();
  });

  describe('empty/undefined hooks', () => {
    it('should return empty object when hooks is undefined', () => {
      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(undefined);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return empty object when all hooks are undefined', () => {
      const hooks: ProviderHookEvents = {};
      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('onToolStart → PreToolUse mapping', () => {
    it('should map onToolStart to PreToolUse hook', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      expect(result['PreToolUse']).toBeDefined();
      expect(result['PreToolUse']).toHaveLength(1);
      expect(result['PreToolUse']?.[0].hooks).toHaveLength(1);
    });

    it('should call onToolStart with transformed parameters', async () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['PreToolUse']?.[0].hooks[0];

      // Simulate SDK calling the hook
      const sdkInput = {
        session_id: 'test-session',
        transcript_path: '/path',
        cwd: '/cwd',
        hook_event_name: 'PreToolUse' as const,
        tool_name: 'test-tool',
        tool_input: { param: 'value' },
        tool_use_id: 'tool-123',
      };

      await sdkHook!(sdkInput, 'tool-123', { signal: new AbortController().signal });

      expect(mockHook).toHaveBeenCalledTimes(1);
      expect(mockHook).toHaveBeenCalledWith({
        name: 'test-tool',
        input: { param: 'value' },
      });
    });

    it('should handle async onToolStart hooks', async () => {
      const mockHook = vi.fn().mockResolvedValue(undefined);
      const hooks: ProviderHookEvents = {
        onToolStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['PreToolUse']?.[0].hooks[0];

      const sdkInput = {
        session_id: 'test-session',
        transcript_path: '/path',
        cwd: '/cwd',
        hook_event_name: 'PreToolUse' as const,
        tool_name: 'test-tool',
        tool_input: {},
        tool_use_id: 'tool-123',
      };

      const hookResult = await sdkHook!(sdkInput, 'tool-123', { signal: new AbortController().signal });

      expect(mockHook).toHaveBeenCalled();
      expect(hookResult).toEqual({ continue: true });
    });
  });

  describe('onToolEnd → PostToolUse mapping', () => {
    it('should map onToolEnd to PostToolUse hook', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolEnd: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      expect(result['PostToolUse']).toBeDefined();
      expect(result['PostToolUse']).toHaveLength(1);
    });

    it('should call onToolEnd with transformed parameters', async () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolEnd: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['PostToolUse']?.[0].hooks[0];

      const sdkInput = {
        session_id: 'test-session',
        transcript_path: '/path',
        cwd: '/cwd',
        hook_event_name: 'PostToolUse' as const,
        tool_name: 'test-tool',
        tool_input: { param: 'value' },
        tool_response: 'result data',
        tool_use_id: 'tool-123',
      };

      await sdkHook!(sdkInput, 'tool-123', { signal: new AbortController().signal });

      expect(mockHook).toHaveBeenCalledTimes(1);
      const callArgs = mockHook.mock.calls[0];
      expect(callArgs[0]).toEqual({
        name: 'test-tool',
        input: { param: 'value' },
      });
      expect(callArgs[1]).toEqual({
        content: 'result data',
        isError: false,
      });
      expect(callArgs[2]).toBe(0); // duration placeholder
    });
  });

  describe('onSessionStart → SessionStart mapping', () => {
    it('should map onSessionStart to SessionStart hook', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onSessionStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      expect(result['SessionStart']).toBeDefined();
      expect(result['SessionStart']).toHaveLength(1);
    });

    it('should call onSessionStart without parameters', async () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onSessionStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['SessionStart']?.[0].hooks[0];

      const sdkInput = {
        session_id: 'test-session',
        transcript_path: '/path',
        cwd: '/cwd',
        hook_event_name: 'SessionStart' as const,
        source: 'startup' as const,
      };

      await sdkHook!(sdkInput, undefined, { signal: new AbortController().signal });

      expect(mockHook).toHaveBeenCalledTimes(1);
      expect(mockHook).toHaveBeenCalledWith();
    });
  });

  describe('onSessionEnd → SessionEnd mapping', () => {
    it('should map onSessionEnd to SessionEnd hook', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onSessionEnd: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      expect(result['SessionEnd']).toBeDefined();
      expect(result['SessionEnd']).toHaveLength(1);
    });

    it('should call onSessionEnd with duration placeholder', async () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onSessionEnd: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['SessionEnd']?.[0].hooks[0];

      const sdkInput = {
        session_id: 'test-session',
        transcript_path: '/path',
        cwd: '/cwd',
        hook_event_name: 'SessionEnd' as const,
        reason: 'completed',
      };

      await sdkHook!(sdkInput, undefined, { signal: new AbortController().signal });

      expect(mockHook).toHaveBeenCalledTimes(1);
      expect(mockHook).toHaveBeenCalledWith(0); // duration placeholder
    });
  });

  describe('multiple hooks', () => {
    it('should map all provided hooks', () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onToolEnd: vi.fn(),
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      expect(Object.keys(result)).toHaveLength(4);
      expect(result['PreToolUse']).toBeDefined();
      expect(result['PostToolUse']).toBeDefined();
      expect(result['SessionStart']).toBeDefined();
      expect(result['SessionEnd']).toBeDefined();
    });

    it('should map only provided hooks', () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['PreToolUse']).toBeDefined();
      expect(result['SessionEnd']).toBeDefined();
      expect(result['PostToolUse']).toBeUndefined();
      expect(result['SessionStart']).toBeUndefined();
    });
  });

  describe('return value', () => {
    it('should always return { continue: true } for SDK compatibility', async () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['PreToolUse']?.[0].hooks[0];

      const hookResult = await sdkHook!(
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 't', tool_input: {}, tool_use_id: '1' },
        '1',
        { signal: new AbortController().signal }
      );

      expect(hookResult).toEqual({ continue: true });
    });

    it('should return { continue: true } for all hook types', async () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onToolEnd: vi.fn(),
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);

      // Test PreToolUse
      const preToolResult = await result['PreToolUse']?.[0].hooks[0](
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 't', tool_input: {}, tool_use_id: '1' },
        '1',
        { signal: new AbortController().signal }
      );
      expect(preToolResult).toEqual({ continue: true });

      // Test PostToolUse
      const postToolResult = await result['PostToolUse']?.[0].hooks[0](
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'PostToolUse', tool_name: 't', tool_input: {}, tool_response: 'res', tool_use_id: '1' },
        '1',
        { signal: new AbortController().signal }
      );
      expect(postToolResult).toEqual({ continue: true });

      // Test SessionStart
      const sessionStartResult = await result['SessionStart']?.[0].hooks[0](
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'SessionStart', source: 'startup' },
        undefined,
        { signal: new AbortController().signal }
      );
      expect(sessionStartResult).toEqual({ continue: true });

      // Test SessionEnd
      const sessionEndResult = await result['SessionEnd']?.[0].hooks[0](
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'SessionEnd', reason: 'completed' },
        undefined,
        { signal: new AbortController().signal }
      );
      expect(sessionEndResult).toEqual({ continue: true });
    });
  });

  describe('sync vs async hooks', () => {
    it('should handle synchronous hooks correctly', async () => {
      let syncHookCalled = false;
      const syncHook = () => {
        syncHookCalled = true;
      };
      const hooks: ProviderHookEvents = {
        onToolStart: syncHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['PreToolUse']?.[0].hooks[0];

      await sdkHook!(
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 't', tool_input: {}, tool_use_id: '1' },
        '1',
        { signal: new AbortController().signal }
      );

      expect(syncHookCalled).toBe(true);
    });

    it('should handle asynchronous hooks correctly', async () => {
      let asyncHookCalled = false;
      const asyncHook = async () => {
        asyncHookCalled = true;
        await Promise.resolve();
      };
      const hooks: ProviderHookEvents = {
        onToolStart: asyncHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildAgentSDKHooks(hooks);
      const sdkHook = result['PreToolUse']?.[0].hooks[0];

      await sdkHook!(
        { session_id: 'x', transcript_path: '/', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 't', tool_input: {}, tool_use_id: '1' },
        '1',
        { signal: new AbortController().signal }
      );

      expect(asyncHookCalled).toBe(true);
    });
  });
});

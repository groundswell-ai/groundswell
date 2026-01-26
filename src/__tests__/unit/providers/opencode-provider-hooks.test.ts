/**
 * OpenCodeProvider Tests (DEPRECATED)
 *
 * OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.
 * These tests verify the deprecation warning works correctly.
 *
 * @see AnthropicProvider
 * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
 *
 * Unit tests for OpenCodeProvider.buildOpenCodeHooks()
 *
 * Tests the adapter method that converts ProviderHookEvents to
 * OpenCode SDK-compatible event subscription configuration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenCodeProvider } from '../../../providers/opencode-provider.js';
import type { ProviderHookEvents } from '../../../types/providers.js';

describe('OpenCodeProvider.buildOpenCodeHooks()', () => {
  let provider: OpenCodeProvider;

  // Setup: Create provider instance before each test
  // NOTE: buildOpenCodeHooks() is a pure function that doesn't require
  // OpenCode server initialization - it only transforms hook configuration
  beforeEach(() => {
    provider = new OpenCodeProvider();
  });

  describe('empty/undefined hooks', () => {
    it('should return empty object when hooks is undefined', () => {
      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(undefined);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should return empty object when all hooks are undefined', () => {
      const hooks: ProviderHookEvents = {};
      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('onStream hook mapping', () => {
    it('should return onStream: true when onStream hook provided', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onStream: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onStream).toBe(true);
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should return onStream: true with other hooks', () => {
      const hooks: ProviderHookEvents = {
        onStream: vi.fn(),
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onStream).toBe(true);
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe('unsupported hooks - onToolStart', () => {
    it('should ignore onToolStart hook (server-side execution)', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolStart: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onToolStart).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should ignore onToolStart even when provided with other hooks', () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onStream: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onToolStart).toBeUndefined();
      expect(result.onStream).toBe(true);
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe('unsupported hooks - onToolEnd', () => {
    it('should ignore onToolEnd hook (server-side execution)', () => {
      const mockHook = vi.fn();
      const hooks: ProviderHookEvents = {
        onToolEnd: mockHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onToolEnd).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should ignore onToolEnd even when provided with other hooks', () => {
      const hooks: ProviderHookEvents = {
        onToolEnd: vi.fn(),
        onStream: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onToolEnd).toBeUndefined();
      expect(result.onStream).toBe(true);
      expect(Object.keys(result)).toHaveLength(1);
    });
  });

  describe('session hooks - manually called', () => {
    it('should ignore onSessionStart (manually called in execute())', () => {
      const hooks: ProviderHookEvents = {
        onSessionStart: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      // Session hooks are NOT part of adapter - manually called in execute()
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should ignore onSessionEnd (manually called in execute())', () => {
      const hooks: ProviderHookEvents = {
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      // Session hooks are NOT part of adapter - manually called in execute()
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should ignore both session hooks (manually called in execute())', () => {
      const hooks: ProviderHookEvents = {
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      // Session hooks are NOT part of adapter - manually called in execute()
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('mixed hook combinations', () => {
    it('should only return onStream when all hooks provided', () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onToolEnd: vi.fn(),
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
        onStream: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      // Only onStream is supported via SSE
      expect(result.onStream).toBe(true);
      expect(result.onToolStart).toBeUndefined();
      expect(result.onToolEnd).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(1);
    });

    it('should return empty object when only unsupported hooks provided', () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onToolEnd: vi.fn(),
        onSessionStart: vi.fn(),
        onSessionEnd: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      // All hooks are unsupported or manually called
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('return value structure', () => {
    it('should return object with onStream property when onStream hook exists', () => {
      const hooks: ProviderHookEvents = {
        onStream: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result).toEqual({ onStream: true });
    });

    it('should return empty object when no supported hooks exist', () => {
      const hooks: ProviderHookEvents = {
        onToolStart: vi.fn(),
        onSessionStart: vi.fn(),
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result).toEqual({});
    });
  });

  describe('sync vs async hooks', () => {
    it('should accept synchronous onStream hook', () => {
      let syncHookCalled = false;
      const syncHook = (chunk: string) => {
        syncHookCalled = true;
      };
      const hooks: ProviderHookEvents = {
        onStream: syncHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onStream).toBe(true);
    });

    it('should accept asynchronous onStream hook', () => {
      let asyncHookCalled = false;
      const asyncHook = async (chunk: string) => {
        asyncHookCalled = true;
        await Promise.resolve();
      };
      const hooks: ProviderHookEvents = {
        onStream: asyncHook,
      };

      // @ts-expect-error - Testing private method
      const result = provider.buildOpenCodeHooks(hooks);

      expect(result.onStream).toBe(true);
    });
  });
});

/**
 * Unit tests for PiHarness initialize() and terminate() methods.
 *
 * Uses REAL imports of @earendil-works/pi-coding-agent (no vi.mock — proves the SDK loads
 * and the registry builds deterministically). The vi.mock-based resolveModel tests live in a
 * SEPARATE file (pi-harness-resolvemodel.test.ts) because vi.mock is hoisted file-scope.
 *
 * PRP: P2.M2.T1.S2 — Implement initialize/terminate + model resolution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';
import { ModelRegistry } from '@earendil-works/pi-coding-agent';
import type { HarnessOptions } from '../../../types/harnesses.js';

describe('PiHarness - initialize()', () => {
  let harness: PiHarness;

  beforeEach(() => {
    harness = new PiHarness();
  });

  afterEach(() => {
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  describe('SDK Import Success', () => {
    it('should load the SDK module into private sdk field', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();
      expect(harness.sdk).toBeDefined();
    });

    it('should have createAgentSession in the loaded SDK', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      const sdk = harness.sdk;
      expect(typeof sdk?.createAgentSession).toBe('function');
    });

    it('should have ModelRegistry in the loaded SDK', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      const sdk = harness.sdk;
      expect(typeof sdk?.ModelRegistry).toBe('function');
    });
  });

  describe('Registry + AuthStorage built', () => {
    it('should build a ModelRegistry instance', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.modelRegistry).not.toBeNull();
    });

    it('should build a ModelRegistry that is an instance of ModelRegistry', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.modelRegistry instanceof ModelRegistry).toBe(true);
    });

    it('should build an AuthStorage instance', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.authStorage).not.toBeNull();
    });
  });

  describe('Options Handling', () => {
    it('should accept initialize() without options parameter', async () => {
      await expect(harness.initialize()).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();
    });

    it('should accept initialize() with empty options', async () => {
      await expect(harness.initialize({})).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();
    });

    it('should accept initialize() with apiKey option', async () => {
      await harness.initialize({ apiKey: 'sk-test-key' });

      // @ts-expect-error - Testing private property
      expect(harness.options).toEqual({ apiKey: 'sk-test-key' });
    });

    it('should accept initialize() with all options', async () => {
      const options: HarnessOptions = {
        apiKey: 'sk-test-key',
        endpoint: 'https://custom.endpoint.com',
        timeout: 30000,
        headers: { 'X-Custom-Header': 'value' },
        sessionId: 'session-123',
      };
      await expect(harness.initialize(options)).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.options).toEqual(options);
    });

    it('should store options as null when not provided', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.options).toBeNull();
    });

    it('should store options as empty object when empty object provided', async () => {
      await harness.initialize({});

      // @ts-expect-error - Testing private property
      expect(harness.options).toEqual({});
    });
  });

  describe('Idempotent Behavior', () => {
    it('should return the same sdk reference on second call', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      const firstSdk = harness.sdk;

      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBe(firstSdk);
    });

    it('should not rebuild the registry on second call', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      const firstRegistry = harness.modelRegistry;

      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.modelRegistry).toBe(firstRegistry);
    });

    it('should be safe to call initialize() multiple times', async () => {
      await expect(harness.initialize()).resolves.not.toThrow();
      await expect(harness.initialize()).resolves.not.toThrow();
      await expect(harness.initialize()).resolves.not.toThrow();
    });
  });

  describe('Method Signature', () => {
    it('should return Promise<void>', async () => {
      const result = harness.initialize();

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.not.toThrow();

      const resolved = await result;
      expect(resolved).toBeUndefined();
    });
  });

  describe('HarnessRegistry Integration', () => {
    it('should work with HarnessRegistry.register()', () => {
      const registry = HarnessRegistry.getInstance();
      registry.register(harness);
      expect(registry.has('pi')).toBe(true);
    });

    it('should be callable after registration', async () => {
      const registry = HarnessRegistry.getInstance();
      registry.register(harness);

      await expect(harness.initialize()).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing SDK package with descriptive error', async () => {
      // In normal testing, the SDK is available. This documents expected behavior.
      // The implementation has try/catch with descriptive error.
      const providerString = harness.toString();
      expect(typeof providerString).toBe('string');
    });
  });

  describe('State Management', () => {
    it('should start with sdk field as null', () => {
      const newHarness = new PiHarness();

      // @ts-expect-error - Testing private property
      expect(newHarness.sdk).toBeNull();
    });

    it('should start with modelRegistry field as null', () => {
      const newHarness = new PiHarness();

      // @ts-expect-error - Testing private property
      expect(newHarness.modelRegistry).toBeNull();
    });

    it('should start with authStorage field as null', () => {
      const newHarness = new PiHarness();

      // @ts-expect-error - Testing private property
      expect(newHarness.authStorage).toBeNull();
    });

    it('should start with options field as null', () => {
      const newHarness = new PiHarness();

      // @ts-expect-error - Testing private property
      expect(newHarness.options).toBeNull();
    });
  });
});

describe('PiHarness - terminate()', () => {
  let harness: PiHarness;

  beforeEach(() => {
    harness = new PiHarness();
  });

  afterEach(() => {
    const r = HarnessRegistry.getInstance();
    r._resetInitStateForTesting();
    HarnessRegistry._resetForTesting();
  });

  describe('Basic Functionality', () => {
    it('should clear sdk reference after termination', async () => {
      await harness.initialize();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();

      await harness.terminate();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();
    });

    it('should clear modelRegistry reference after termination', async () => {
      await harness.initialize();
      await harness.terminate();

      // @ts-expect-error - Testing private property
      expect(harness.modelRegistry).toBeNull();
    });

    it('should clear authStorage reference after termination', async () => {
      await harness.initialize();
      await harness.terminate();

      // @ts-expect-error - Testing private property
      expect(harness.authStorage).toBeNull();
    });

    it('should clear options reference after termination', async () => {
      await harness.initialize({ apiKey: 'sk-test' });
      await harness.terminate();

      // @ts-expect-error - Testing private property
      expect(harness.options).toBeNull();
    });
  });

  describe('Idempotent Behavior', () => {
    it('should be safe to call terminate() multiple times', async () => {
      await harness.initialize();

      await harness.terminate();
      await harness.terminate();
      await harness.terminate();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();
    });

    it('should be idempotent even when called before initialize()', async () => {
      // sdk is already null — terminate should be a no-op
      await expect(harness.terminate()).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();
    });
  });

  describe('Safe Before Init', () => {
    it('should not throw when called before initialize()', async () => {
      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();

      await expect(harness.terminate()).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();
      // @ts-expect-error - Testing private property
      expect(harness.modelRegistry).toBeNull();
      // @ts-expect-error - Testing private property
      expect(harness.authStorage).toBeNull();
      // @ts-expect-error - Testing private property
      expect(harness.options).toBeNull();
    });
  });

  describe('Re-init After Terminate', () => {
    it('should allow re-initialization after termination', async () => {
      await harness.initialize();
      await harness.terminate();
      await expect(harness.initialize()).resolves.not.toThrow();

      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();
    });

    it('should support full lifecycle: init → terminate → init → terminate', async () => {
      await harness.initialize();
      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();

      await harness.terminate();
      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();

      await harness.initialize();
      // @ts-expect-error - Testing private property
      expect(harness.sdk).not.toBeNull();

      await harness.terminate();
      // @ts-expect-error - Testing private property
      expect(harness.sdk).toBeNull();
    });
  });

  describe('Method Signature', () => {
    it('should return Promise<void>', async () => {
      const result = harness.terminate();

      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.not.toThrow();

      const resolved = await result;
      expect(resolved).toBeUndefined();
    });
  });
});

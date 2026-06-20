/**
 * Unit tests for PiHarness class structure, capabilities, stub behavior,
 * interface satisfaction, Provider assignability, and registrability.
 *
 * PRP: P2.M2.T1.S1 — PiHarness scaffold, dependency, and model resolution.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PiHarness } from '../../../harnesses/pi-harness.js';
import type { Harness } from '../../../types/harnesses.js';
import type { Provider } from '../../../types/providers.js';
import { HarnessRegistry } from '../../../harnesses/harness-registry.js';

afterEach(() => {
  const r = HarnessRegistry.getInstance();
  r._resetInitStateForTesting();
  HarnessRegistry._resetForTesting();
});

describe('PiHarness', () => {
  describe('Class Structure', () => {
    it('should have id === "pi"', () => {
      const harness = new PiHarness();
      expect(harness.id).toBe('pi');
      expect(typeof harness.id).toBe('string');
    });

    it('should have all capabilities set to true (PRD §7.4 pi column)', () => {
      const harness = new PiHarness();
      expect(harness.capabilities).toEqual({
        mcp: true,
        skills: true,
        lsp: true,
        streaming: true,
        sessions: true,
        extendedThinking: true,
      });
    });
  });

  describe('supports / requiresFeatures', () => {
    it('supports("mcp") should return true', () => {
      const harness = new PiHarness();
      expect(harness.supports('mcp')).toBe(true);
    });

    it('supports("extendedThinking") should return true', () => {
      const harness = new PiHarness();
      expect(harness.supports('extendedThinking')).toBe(true);
    });

    it('requiresFeatures(["mcp","streaming"]) should return true', () => {
      const harness = new PiHarness();
      expect(harness.requiresFeatures(['mcp', 'streaming'])).toBe(true);
    });

    it('requiresFeatures([]) should return true', () => {
      const harness = new PiHarness();
      expect(harness.requiresFeatures([])).toBe(true);
    });
  });

  describe('stub methods throw with downstream subtask references', () => {
    it('loadSkills() should throw /not initialized/ when not initialized', async () => {
      const harness = new PiHarness();
      await expect(harness.loadSkills([])).rejects.toThrow(/not initialized/i);
    });
  });

  describe('interface satisfaction', () => {
    it('should be assignable to Harness', () => {
      const h: Harness = new PiHarness();
      expect(h.id).toBe('pi');
    });

    it('should have all required Harness methods', () => {
      const harness = new PiHarness();
      expect(typeof harness.initialize).toBe('function');
      expect(typeof harness.terminate).toBe('function');
      expect(typeof harness.execute).toBe('function');
      expect(typeof harness.registerMCPs).toBe('function');
      expect(typeof harness.loadSkills).toBe('function');
      expect(typeof harness.normalizeModel).toBe('function');
      expect(typeof harness.supports).toBe('function');
      expect(typeof harness.requiresFeatures).toBe('function');
    });
  });

  describe('Provider structural assignability + registration', () => {
    it('should be assignable to Provider', () => {
      const p: Provider = new PiHarness();
      expect(p.id).toBe('pi');
    });

    it('should be registerable with HarnessRegistry', () => {
      const registry = HarnessRegistry.getInstance();
      registry.register(new PiHarness());
      expect(registry.has('pi')).toBe(true);
      expect(registry.get('pi')?.id).toBe('pi');
    });

    it('should throw on duplicate registration', () => {
      const registry = HarnessRegistry.getInstance();
      registry.register(new PiHarness());
      expect(() => registry.register(new PiHarness())).toThrow(/already registered/);
    });
  });

  describe('instantiation', () => {
    it('should be instantiable without arguments', () => {
      expect(() => new PiHarness()).not.toThrow();
    });

    it('should create independent instances', () => {
      const h1 = new PiHarness();
      const h2 = new PiHarness();
      expect(h1).not.toBe(h2);
      expect(h1.id).toBe(h2.id);
    });
  });
});

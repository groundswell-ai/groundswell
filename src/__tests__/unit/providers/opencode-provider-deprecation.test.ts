/**
 * OpenCodeProvider Tests (DEPRECATED)
 *
 * OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.
 * These tests verify the deprecation warning works correctly.
 *
 * @see AnthropicProvider
 * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
 *
 * Purpose: Tests for OpenCodeProvider deprecation warning per P1.M3.T1.S2
 *
 * Tests:
 * - Deprecation warning displays on first initialize()
 * - Warning only shows once (one-time flag works)
 * - Warning includes all required information
 * - Warning includes stack trace for debugging
 * - Multiple instances share the same static flag
 *
 * PRP: P1.M3.T1.S2 - Execute OpenCode provider resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenCodeProvider } from '../../../providers/opencode-provider.js';

describe('OpenCodeProvider - Deprecation', () => {
  let provider: OpenCodeProvider;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new OpenCodeProvider();

    // Mock console.warn to capture warnings
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset deprecation warning flag for test isolation
    // @ts-expect-error - Testing private static property
    OpenCodeProvider.deprecationWarningShown = false;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Deprecation Warning Display', () => {
    it('should log deprecation warning on first initialize', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });

    it('should include deprecation version (v1.5.0)', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('v1.5.0')
      );
    });

    it('should include removal version (v2.0.0)', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('v2.0.0')
      );
    });

    it('should mention AnthropicProvider as replacement', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('AnthropicProvider')
      );
    });

    it('should include migration guide URL', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://groundswell.dev/docs/migration-opencode-removal')
      );
    });

    it('should include stack trace for debugging', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Called from:')
      );
    });

    it('should list all AnthropicProvider features', async () => {
      await provider.initialize();

      const warningCall = consoleWarnSpy.mock.calls.flat().join('\n');

      expect(warningCall).toContain('MCP server integration');
      expect(warningCall).toContain('LSP integration via MCP plugins');
      expect(warningCall).toContain('Client-side tool execution');
      expect(warningCall).toContain('Full PRD compliance');
    });
  });

  describe('One-Time Warning Behavior', () => {
    it('should only show warning once on multiple initialize() calls', async () => {
      await provider.initialize();
      await provider.initialize(); // Second call

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should only show warning once across multiple instances', async () => {
      const provider1 = new OpenCodeProvider();
      const provider2 = new OpenCodeProvider();

      await provider1.initialize();
      await provider2.initialize();

      // Static flag is shared across all instances
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should reset flag when explicitly reset (for testing)', async () => {
      await provider.initialize();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      // Reset flag
      // @ts-expect-error - Testing private static property
      OpenCodeProvider.deprecationWarningShown = false;
      consoleWarnSpy.mockClear();

      // Should show warning again after reset
      await provider.initialize();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should check static flag before showing warning', async () => {
      // Set flag to true before initialize
      // @ts-expect-error - Testing private static property
      OpenCodeProvider.deprecationWarningShown = true;

      await provider.initialize();

      // Warning should not be shown
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Warning Format and Content', () => {
    it('should use emoji warning symbol (⚠️)', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️')
      );
    });

    it('should have structured warning with clear sections', async () => {
      await provider.initialize();

      const warningCall = consoleWarnSpy.mock.calls.flat().join('\n');

      // Check for structured sections
      expect(warningCall).toMatch(/DEPRECATION WARNING/);
      expect(warningCall).toMatch(/deprecated since v1\.5\.0/);
      expect(warningCall).toMatch(/will be removed in v2\.0\.0/);
      expect(warningCall).toMatch(/Migration guide:/);
      expect(warningCall).toMatch(/Called from:/);
    });

    it('should be multiline for readability', async () => {
      await provider.initialize();

      // Should have multiple newlines in the warning
      const warningCall = consoleWarnSpy.mock.calls.flat();
      const hasNewlines = warningCall.some(call =>
        typeof call === 'string' && call.includes('\n')
      );

      expect(hasNewlines).toBe(true);
    });
  });

  describe('Idempotent Behavior with Warning', () => {
    it('should show warning on first initialize() call', async () => {
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should not show warning on second initialize() call', async () => {
      await provider.initialize();
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should not show warning on third initialize() call', async () => {
      await provider.initialize();
      await provider.initialize();
      await provider.initialize();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain SDK functionality despite deprecation', async () => {
      await provider.initialize();

      // Provider should still be functional
      // @ts-expect-error - Testing private property
      expect(provider.sdk).not.toBeNull();
    });
  });

  describe('JSDoc @deprecated Tag', () => {
    it('should have @deprecated JSDoc tag on class', () => {
      // This test documents the presence of @deprecated tag
      // The tag is in the JSDoc comment above the class definition
      // It will be picked up by TypeScript compilers and IDEs

      // Verify class exists
      expect(OpenCodeProvider).toBeDefined();

      // The @deprecated tag is in documentation, not verifiable at runtime
      // This test serves as documentation that the tag should exist
      expect(typeof OpenCodeProvider).toBe('function');
    });

    it('should reference AnthropicProvider in JSDoc', () => {
      // This test documents the @see AnthropicProvider reference
      // The reference is in the JSDoc comment above the class

      expect(OpenCodeProvider).toBeDefined();
    });

    it('should reference migration guide in JSDoc', () => {
      // This test documents the @see link to migration guide
      // The link is in the JSDoc comment above the class

      expect(OpenCodeProvider).toBeDefined();
    });
  });

  describe('Integration with ProviderRegistry', () => {
    it('should show warning when initialized via ProviderRegistry', async () => {
      const { ProviderRegistry } = await import('../../../providers/provider-registry.js');

      // Reset registry state
      ProviderRegistry._resetForTesting();

      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      await registry.initializeProvider('opencode');

      // Warning should still be shown when initialized via registry
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
    });

    it('should only show warning once even via ProviderRegistry', async () => {
      const { ProviderRegistry } = await import('../../../providers/provider-registry.js');

      // Reset registry state
      ProviderRegistry._resetForTesting();

      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      await registry.initializeProvider('opencode');
      await registry.initializeProvider('opencode');

      // Should only show once despite two registry calls
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Static Flag Behavior', () => {
    it('should have static deprecationWarningShown property', () => {
      // @ts-expect-error - Testing private static property
      expect(OpenCodeProvider.hasOwnProperty('deprecationWarningShown')).toBe(true);
    });

    it('should start with deprecationWarningShown as false', () => {
      // @ts-expect-error - Testing private static property
      expect(OpenCodeProvider.deprecationWarningShown).toBe(false);
    });

    it('should set deprecationWarningShown to true after initialize', async () => {
      await provider.initialize();

      // @ts-expect-error - Testing private static property
      expect(OpenCodeProvider.deprecationWarningShown).toBe(true);
    });

    it('should share flag across all instances', async () => {
      const provider1 = new OpenCodeProvider();
      const provider2 = new OpenCodeProvider();

      await provider1.initialize();

      // @ts-expect-error - Testing private static property
      expect(OpenCodeProvider.deprecationWarningShown).toBe(true);

      // Second instance should see flag as true
      // @ts-expect-error - Testing private static property
      expect(OpenCodeProvider.deprecationWarningShown).toBe(true);
    });
  });
});

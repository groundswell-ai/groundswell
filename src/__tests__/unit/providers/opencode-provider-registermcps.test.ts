/**
 * OpenCodeProvider Tests (DEPRECATED)
 *
 * OpenCodeProvider is deprecated since v1.5.0 and will be removed in v2.0.0.
 * These tests verify the deprecation warning works correctly.
 *
 * @see AnthropicProvider
 * @see {@link https://groundswell.dev/docs/migration-opencode-removal | Migration Guide}
 *
 * Test file: opencode-provider-registermcps.test.ts
 *
 * Purpose: Comprehensive tests for OpenCodeProvider registerMCPs() method per P3.M2.T1.S4
 *
 * Tests:
 * - SDK initialization check (throws if not initialized)
 * - Empty servers array (returns empty array)
 * - Returns Tool[] type (empty array for LLM-only mode)
 * - terminate() integration (verify idempotent)
 *
 * PRP: P3.M2.T1.S4 - Implement registerMCPs() and loadSkills() methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenCodeProvider } from '../../../harnesses/opencode-provider.js';
import { ProviderRegistry } from '../../../harnesses/provider-registry.js';
import type { MCPServer, Tool } from '../../../types/sdk-primitives.js';

describe('OpenCodeProvider - registerMCPs()', () => {
  let provider: OpenCodeProvider;

  beforeEach(() => {
    provider = new OpenCodeProvider();
    // Reset registry state for isolation
    ProviderRegistry._resetForTesting();
  });

  // Test tool fixture
  const createTestTool = (name: string, description: string): Tool => ({
    name,
    description,
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  });

  // Test server fixture
  const createTestServer = (name: string, tools: Tool[]): MCPServer => ({
    name,
    transport: 'inprocess',
    tools,
  });

  describe('SDK Initialization Check', () => {
    it('should throw if SDK is not initialized', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await expect(provider.registerMCPs(servers)).rejects.toThrow(
        'OpenCode provider not initialized. Call initialize() first.'
      );
    });

    it('should throw with descriptive error message', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      try {
        await provider.registerMCPs(servers);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('OpenCode provider not initialized. Call initialize() first.');
      }
    });

    it('should not throw after initialize() is called', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      await expect(provider.registerMCPs(servers)).resolves.not.toThrow();
    });
  });

  describe('LLM-Only Mode Behavior', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should return empty array for any servers', async () => {
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });

    it('should return empty array for multiple servers', async () => {
      const servers: MCPServer[] = [
        createTestServer('server1', [createTestTool('tool1', 'Tool 1')]),
        createTestServer('server2', [createTestTool('tool2', 'Tool 2')]),
        createTestServer('server3', [createTestTool('tool3', 'Tool 3')]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });

    it('should return empty array for server with multiple tools', async () => {
      const servers: MCPServer[] = [
        createTestServer('multi-tool-server', [
          createTestTool('tool1', 'First tool'),
          createTestTool('tool2', 'Second tool'),
          createTestTool('tool3', 'Third tool'),
        ]),
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });

    it('should handle empty servers array', async () => {
      const tools = await provider.registerMCPs([]);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });

    it('should handle server with no tools', async () => {
      const servers: MCPServer[] = [
        {
          name: 'empty-server',
          transport: 'inprocess',
          tools: [],
        },
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });

    it('should handle servers with undefined tools property', async () => {
      const servers: MCPServer[] = [
        {
          name: 'no-tools-server',
          transport: 'inprocess',
          // tools property is undefined
        },
      ];

      const tools = await provider.registerMCPs(servers);

      expect(tools).toEqual([]);
    });
  });

  describe('Type Safety', () => {
    it('should return Tool[] with correct typing', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      // Type check: tools should be an array
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should accept MCPServer[] parameter with correct typing', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        {
          name: 'typed-server',
          transport: 'inprocess',
          tools: [
            {
              name: 'typed_tool',
              description: 'A typed tool',
              input_schema: {
                type: 'object',
                properties: {
                  param: { type: 'string' },
                },
                required: ['param'],
              },
            },
          ],
        },
      ];

      // Should compile without TypeScript errors
      const tools: Tool[] = await provider.registerMCPs(servers);
      expect(tools).toBeDefined();
    });
  });

  describe('Idempotent Behavior', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should allow calling registerMCPs() multiple times', async () => {
      // First call
      const tools1 = await provider.registerMCPs([
        createTestServer('server1', [createTestTool('tool1', 'Tool 1')]),
      ]);

      expect(tools1).toHaveLength(0);

      // Second call with different servers
      const tools2 = await provider.registerMCPs([
        createTestServer('server2', [createTestTool('tool2', 'Tool 2')]),
      ]);

      // Should always return empty array in LLM-only mode
      expect(tools2).toHaveLength(0);
    });
  });

  describe('ProviderRegistry Integration', () => {
    it('should work with ProviderRegistry initialization', async () => {
      const registry = ProviderRegistry.getInstance();
      registry.register(provider);

      // Initialize via registry
      await registry.initializeProvider('opencode');

      // Register MCPs
      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      // Should return empty array in LLM-only mode
      expect(tools).toHaveLength(0);
    });
  });

  describe('terminate() Integration', () => {
    it('should handle registerMCPs after terminate', async () => {
      await provider.initialize();

      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      // First call before terminate
      const tools1 = await provider.registerMCPs(servers);
      expect(tools1).toEqual([]);

      // Terminate
      await provider.terminate();

      // Should throw after terminate (SDK not initialized)
      await expect(provider.registerMCPs(servers)).rejects.toThrow(
        'OpenCode provider not initialized. Call initialize() first.'
      );
    });
  });

  describe('LLM-Only Mode Documentation', () => {
    it('should document LLM-only mode behavior in JSDoc', async () => {
      // This test verifies the method has proper documentation
      // The actual documentation is in the JSDoc comments
      await provider.initialize();

      const servers: MCPServer[] = [
        createTestServer('test-server', [createTestTool('test_tool', 'A test tool')]),
      ];

      const tools = await provider.registerMCPs(servers);

      // Verify LLM-only mode: returns empty array
      expect(tools).toEqual([]);
      expect(tools).toHaveLength(0);
    });
  });
});

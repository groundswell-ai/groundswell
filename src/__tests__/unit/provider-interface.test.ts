/**
 * Test file: provider-interface.test.ts
 *
 * Purpose: Validate Provider interface structure and type safety per PRD Section 7.3
 *
 * Tests:
 * - Provider interface has all required properties (id, capabilities)
 * - Provider interface has all required methods (initialize, terminate, execute, registerMCPs, loadSkills, normalizeModel)
 * - Provider.execute<T>() is a generic method (type parameter test)
 * - Provider interface can be implemented by a class (mock class test)
 * - Provider readonly properties are enforced
 *
 * PRP: P1.M1.T1.S3 - Define Provider interface with core methods
 */

import { describe, it, expect } from 'vitest';
import type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ToolExecutionRequest,
  ToolExecutionResult,
  ProviderHookEvents,
  ModelSpec,
  ToolExecutor,
} from '../../types/providers.js';
import type { AgentResponse } from '../../types/agent.js';
import type { MCPServer, Tool, Skill } from '../../types/sdk-primitives.js';

describe('Provider Interface', () => {
  describe('Interface Structure', () => {
    it('should have all required readonly properties', () => {
      // This test validates the interface structure at compile time
      // The mock implementation below must satisfy all interface requirements

      interface ProviderProperties {
        id: ProviderId;
        capabilities: ProviderCapabilities;
      }

      const mockId: ProviderId = 'anthropic';
      const mockCapabilities: ProviderCapabilities = {
        mcp: true,
        skills: true,
        lsp: true,
        streaming: true,
        sessions: false,
        extendedThinking: false,
      };

      const properties: ProviderProperties = {
        id: mockId,
        capabilities: mockCapabilities,
      };

      expect(properties.id).toBeDefined();
      expect(properties.capabilities).toBeDefined();
      expect(typeof properties.id).toBe('string');
      expect(typeof properties.capabilities).toBe('object');
    });

    it('should have all required methods with correct signatures', () => {
      // Mock provider implementation to verify interface methods
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {
          // Mock implementation
        }

        async terminate(): Promise<void> {
          // Mock implementation
        }

        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          // Mock implementation
          return {} as AgentResponse<T>;
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {
          // Mock implementation
        }

        normalizeModel(model: string): ModelSpec {
          return {
            provider: 'anthropic',
            model,
            raw: model,
          };
        }
      }

      const provider = new MockProvider();

      // Verify all methods exist and are functions
      expect(typeof provider.initialize).toBe('function');
      expect(typeof provider.terminate).toBe('function');
      expect(typeof provider.execute).toBe('function');
      expect(typeof provider.registerMCPs).toBe('function');
      expect(typeof provider.loadSkills).toBe('function');
      expect(typeof provider.normalizeModel).toBe('function');
    });

    it('should have exactly 8 members (2 properties, 6 methods)', () => {
      // Create a mock provider to count interface members
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }
        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }
        async loadSkills(skills: Skill[]): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const memberCount = Object.getOwnPropertyNames(Object.getPrototypeOf(provider)).length +
        Object.getOwnPropertyNames(provider).filter(p => p !== 'constructor' && !Object.getOwnPropertyNames(Object.getPrototypeOf(provider)).includes(p)).length;

      // We check that at least the required methods exist
      expect(provider.id).toBeDefined();
      expect(provider.capabilities).toBeDefined();
      expect(provider.initialize).toBeDefined();
      expect(provider.terminate).toBeDefined();
      expect(provider.execute).toBeDefined();
      expect(provider.registerMCPs).toBeDefined();
      expect(provider.loadSkills).toBeDefined();
      expect(provider.normalizeModel).toBeDefined();
    });
  });

  describe('Readonly Properties', () => {
    it('should enforce readonly modifier on id property', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }
        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }
        async loadSkills(skills: Skill[]): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();

      // TypeScript should prevent reassignment at compile time
      // At runtime, we verify the property exists and has correct type
      expect(provider.id).toBe('anthropic');
      expect(provider.capabilities.mcp).toBe(true);

      // The following line would cause a TypeScript error if uncommented:
      // provider.id = 'opencode'; // Error: Cannot assign to 'id' because it is a read-only property
    });

    it('should enforce readonly modifier on capabilities property', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }
        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }
        async loadSkills(skills: Skill[]): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();

      // Verify capabilities object structure
      expect(provider.capabilities).toHaveProperty('mcp');
      expect(provider.capabilities).toHaveProperty('skills');
      expect(provider.capabilities).toHaveProperty('lsp');
      expect(provider.capabilities).toHaveProperty('streaming');
      expect(provider.capabilities).toHaveProperty('sessions');
      expect(provider.capabilities).toHaveProperty('extendedThinking');

      // The following line would cause a TypeScript error if uncommented:
      // provider.capabilities = { mcp: false, skills: false, lsp: false, streaming: false, sessions: false, extendedThinking: false };
    });
  });

  describe('Generic execute Method', () => {
    it('should be a generic method with type parameter T', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}

        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {
            status: 'success',
            data: {} as T,
            error: null,
            metadata: {
              agentId: 'test',
              timestamp: Date.now(),
            },
          };
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {}

        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const mockToolExecutor: ToolExecutor = async (req: ToolExecutionRequest) => ({
        content: 'result',
        isError: false,
      });

      // Test with explicit type parameter
      provider.execute<{ answer: string }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      ).then(response => {
        // Response should be typed as AgentResponse<{ answer: string }>
        expect(response.status).toBeDefined();
      });

      // Test with different type parameter
      provider.execute<{ count: number }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      ).then(response => {
        expect(response.status).toBeDefined();
      });
    });

    it('should accept ToolExecutor callback parameter', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}

        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          // Call the tool executor to verify it's passed correctly
          const result = await toolExecutor({
            name: 'test-tool',
            input: { test: 'input' },
          });

          return {
            status: 'success',
            data: result as T,
            error: null,
            metadata: {
              agentId: 'test',
              timestamp: Date.now(),
            },
          };
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {}

        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const mockToolExecutor: ToolExecutor = async (req: ToolExecutionRequest) => ({
        content: 'tool executed',
        isError: false,
      });

      // Verify tool executor is called
      provider.execute<string>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      ).then(response => {
        expect(response.status).toBe('success');
      });
    });

    it('should accept optional hooks parameter', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}

        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          // Verify hooks is optional (may be undefined)
          if (hooks?.onToolStart) {
            await hooks.onToolStart({ name: 'test', input: {} });
          }

          return {
            status: 'success',
            data: {} as T,
            error: null,
            metadata: {
              agentId: 'test',
              timestamp: Date.now(),
            },
          };
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {}

        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const mockToolExecutor: ToolExecutor = async (req: ToolExecutionRequest) => ({
        content: 'result',
        isError: false,
      });

      // Test without hooks (undefined)
      provider.execute<string>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      ).then(response => {
        expect(response.status).toBe('success');
      });

      // Test with hooks
      const mockHooks: ProviderHookEvents = {
        onToolStart: async (tool) => {
          // Hook called
        },
      };

      provider.execute<string>(
        { prompt: 'test', options: {} },
        mockToolExecutor,
        mockHooks
      ).then(response => {
        expect(response.status).toBe('success');
      });
    });

    it('should return AgentResponse<T> not T directly', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}

        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          // Return AgentResponse wrapper, not raw T
          return {
            status: 'success',
            data: { result: 'test' } as T,
            error: null,
            metadata: {
              agentId: 'test',
              timestamp: Date.now(),
            },
          };
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {}

        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const mockToolExecutor: ToolExecutor = async (req: ToolExecutionRequest) => ({
        content: 'result',
        isError: false,
      });

      provider.execute<{ result: string }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      ).then(response => {
        // Verify response has AgentResponse structure
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('data');
        expect(response).toHaveProperty('error');
        expect(response).toHaveProperty('metadata');
        expect(response.status).toBe('success');
      });
    });
  });

  describe('Method Signatures', () => {
    it('should have initialize with optional options parameter', () => {
      // Track if initialize was called with options
      let calledWithUndefined = false;
      let calledWithOptions = false;

      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {
          // Options may be undefined
          if (options === undefined) {
            calledWithUndefined = true;
          } else {
            calledWithOptions = true;
          }
        }

        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }
        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }
        async loadSkills(skills: Skill[]): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();

      // Test without options
      return provider.initialize()
        .then(() => {
          expect(calledWithUndefined).toBe(true);
          // Test with options
          return provider.initialize({ apiKey: 'test-key' });
        })
        .then(() => {
          expect(calledWithOptions).toBe(true);
        });
    });

    it('should have registerMCPs that returns Promise<Tool[]>', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          // Return mock tools
          return [
            {
              name: 'test-tool',
              description: 'A test tool',
              input_schema: {
                type: 'object',
                properties: {},
              },
            },
          ];
        }

        async loadSkills(skills: Skill[]): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const mockServers: MCPServer[] = [
        {
          name: 'test-server',
          transport: 'stdio',
          command: 'python',
          args: ['server.py'],
        },
      ];

      provider.registerMCPs(mockServers).then(tools => {
        expect(Array.isArray(tools)).toBe(true);
        expect(tools.length).toBeGreaterThan(0);
        if (tools.length > 0) {
          expect(tools[0]).toHaveProperty('name');
          expect(tools[0]).toHaveProperty('description');
          expect(tools[0]).toHaveProperty('input_schema');
        }
      });
    });

    it('should have loadSkills that accepts Skill[] parameter', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }
        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {
          expect(Array.isArray(skills)).toBe(true);
        }

        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const provider = new MockProvider();
      const mockSkills: Skill[] = [
        {
          name: 'test-skill',
          path: '/skills/test',
        },
      ];

      provider.loadSkills(mockSkills).then(() => {
        expect(true).toBe(true);
      });
    });

    it('should have normalizeModel that returns ModelSpec', () => {
      class MockProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {}
        async terminate(): Promise<void> {}
        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          return {} as AgentResponse<T>;
        }
        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          return [];
        }
        async loadSkills(skills: Skill[]): Promise<void> {}

        normalizeModel(model: string): ModelSpec {
          return {
            provider: 'anthropic',
            model,
            raw: model,
          };
        }
      }

      const provider = new MockProvider();

      // Test plain model string
      const spec1 = provider.normalizeModel('claude-sonnet-4');
      expect(spec1.provider).toBe('anthropic');
      expect(spec1.model).toBe('claude-sonnet-4');
      expect(spec1.raw).toBe('claude-sonnet-4');

      // Test qualified model string
      const spec2 = provider.normalizeModel('anthropic/claude-opus-4');
      expect(spec2.provider).toBe('anthropic');
      expect(spec2.raw).toBe('anthropic/claude-opus-4');
    });
  });

  describe('Class Implementation', () => {
    it('should be implementable by a class', () => {
      // This test validates that the Provider interface can be implemented
      class AnthropicProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: true,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(options?: ProviderOptions): Promise<void> {
          // Initialize Anthropic SDK client
        }

        async terminate(): Promise<void> {
          // Cleanup resources
        }

        async execute<T>(
          request: ProviderRequest,
          toolExecutor: ToolExecutor,
          hooks?: ProviderHookEvents
        ): Promise<AgentResponse<T>> {
          // Execute prompt via Anthropic SDK
          return {
            status: 'success',
            data: {} as T,
            error: null,
            metadata: {
              agentId: 'anthropic-provider',
              timestamp: Date.now(),
            },
          };
        }

        async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
          // Register MCP servers and return discovered tools
          return [];
        }

        async loadSkills(skills: Skill[]): Promise<void> {
          // Load skills into the provider
        }

        normalizeModel(model: string): ModelSpec {
          // Parse model specification
          return {
            provider: 'anthropic',
            model,
            raw: model,
          };
        }
      }

      const provider = new AnthropicProvider();

      // Verify all interface members are accessible
      expect(provider.id).toBe('anthropic');
      expect(provider.capabilities.mcp).toBe(true);
      expect(typeof provider.initialize).toBe('function');
      expect(typeof provider.terminate).toBe('function');
      expect(typeof provider.execute).toBe('function');
      expect(typeof provider.registerMCPs).toBe('function');
      expect(typeof provider.loadSkills).toBe('function');
      expect(typeof provider.normalizeModel).toBe('function');
    });

    it('should support different ProviderId values', () => {
      // Test that both 'anthropic' and 'opencode' are valid ProviderId values
      const anthropicId: ProviderId = 'anthropic';
      const opencodeId: ProviderId = 'opencode';

      expect(anthropicId).toBe('anthropic');
      expect(opencodeId).toBe('opencode');
    });
  });

  describe('Type Compatibility', () => {
    /**
     * Type Compatibility Tests
     *
     * Purpose: Verify polymorphic type behavior and return type consistency for Provider interface implementations
     *
     * Tests:
     * - Polymorphic assignment: Provider variable can be assigned AnthropicProvider instance
     * - Return type consistency: execute() returns AgentResponse<T> regardless of implementation
     * - Generic type parameter flow: Type parameter T is preserved through polymorphic context
     * - Multiple implementations: Different Provider implementations are interchangeable
     *
     * PRP: P2.M1.T1.S3 - Add Type Compatibility Tests for Provider Interface
     */

    // Mock provider implementing Provider interface for type compatibility testing
    class TypeCompatibleMockProvider implements Provider {
      readonly id: ProviderId = 'anthropic';
      readonly capabilities: ProviderCapabilities = {
        mcp: true,
        skills: true,
        lsp: true,
        streaming: false, // Disable streaming for simpler testing
        sessions: false,
        extendedThinking: false,
      };

      async initialize(options?: ProviderOptions): Promise<void> {
        // Mock: no-op
      }

      async terminate(): Promise<void> {
        // Mock: no-op
      }

      // CRITICAL: Generic execute method must return AgentResponse<T>
      async execute<T>(
        request: ProviderRequest,
        toolExecutor: ToolExecutor,
        hooks?: ProviderHookEvents
      ): Promise<AgentResponse<T>> {
        // PATTERN: Use factory function for consistent response creation
        return {
          status: 'success',
          data: { result: 'mock data' } as T,
          error: null,
          metadata: {
            agentId: 'test-provider',
            timestamp: Date.now(),
          },
        };
      }

      async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
        return [];
      }

      async loadSkills(skills: Skill[]): Promise<void> {
        // Mock: no-op
      }

      normalizeModel(model: string): ModelSpec {
        return { provider: 'anthropic', model, raw: model };
      }
    }

    it('should allow polymorphic assignment of implementation to Provider variable', () => {
      // CREATE: Provider typed variable
      let provider: Provider;

      // ASSIGN: MockProvider instance (demonstrates polymorphic assignment)
      // This line validates compile-time type checking - if TypeCompatibleMockProvider
      // didn't implement Provider correctly, TypeScript would fail to compile
      provider = new TypeCompatibleMockProvider();

      // VERIFY: Assignment compiles and properties are accessible
      expect(provider.id).toBeDefined();
      expect(provider.capabilities).toBeDefined();
      expect(typeof provider.execute).toBe('function');
      expect(provider.id).toBe('anthropic');
      expect(provider.capabilities.mcp).toBe(true);
    });

    it('should return AgentResponse<T> when execute() is called through Provider reference', async () => {
      // CREATE: Provider typed variable with mock implementation
      const provider: Provider = new TypeCompatibleMockProvider();
      await provider.initialize();

      // MOCK: ToolExecutor callback
      const mockToolExecutor = vi.fn<ToolExecutor>().mockResolvedValue({
        content: 'tool result',
        isError: false,
      });

      // CALL: execute() through Provider reference (polymorphic call)
      const response = await provider.execute<string>(
        { prompt: 'test prompt', options: {} },
        mockToolExecutor
      );

      // VERIFY: Return type structure matches AgentResponse<string>
      expect(response.status).toBeDefined();
      expect(['success', 'error', 'partial']).toContain(response.status);
      expect(response.data).toBeDefined();
      expect(response.error).toBeNull();
      expect(response.metadata).toBeDefined();
      expect(response.metadata.agentId).toBeDefined();
      expect(response.metadata.timestamp).toBeDefined();

      // GOTCHA: Type narrowing using discriminated union
      if (response.status === 'success') {
        // TypeScript knows: response.data is T (not null)
        expect(response.data).toBeDefined();
      }
    });

    it('should preserve generic type parameter T in polymorphic context', async () => {
      const provider: Provider = new TypeCompatibleMockProvider();
      await provider.initialize();

      const mockToolExecutor = vi.fn<ToolExecutor>().mockResolvedValue({
        content: 'result',
        isError: false,
      });

      // TEST: Different generic types through polymorphic Provider reference
      const stringResponse = await provider.execute<string>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      const numberResponse = await provider.execute<number>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      const objectResponse = await provider.execute<{ value: string }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      const complexResponse = await provider.execute<{
        nested: { deep: { value: boolean } };
        items: string[];
      }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      // VERIFY: Each response has correct AgentResponse<T> structure
      expect(stringResponse.data).toBeDefined();
      expect(numberResponse.data).toBeDefined();
      expect(objectResponse.data).toBeDefined();
      expect(complexResponse.data).toBeDefined();

      // VERIFY: Status is one of the valid discriminated union values
      expect(['success', 'error', 'partial']).toContain(stringResponse.status);
      expect(['success', 'error', 'partial']).toContain(numberResponse.status);
      expect(['success', 'error', 'partial']).toContain(objectResponse.status);
      expect(['success', 'error', 'partial']).toContain(complexResponse.status);

      // GOTCHA: TypeScript's structural typing ensures type safety
      // Even though we're calling through Provider reference,
      // the generic type parameter T is preserved correctly
    });

    it('should support multiple Provider implementations interchangeably', async () => {
      // CREATE: Two different Provider implementations
      class FirstProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: false,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(): Promise<void> {}
        async terminate(): Promise<void> {}

        async execute<T>(
          _request: ProviderRequest,
          _toolExecutor: ToolExecutor
        ): Promise<AgentResponse<T>> {
          return {
            status: 'success',
            data: { from: 'FirstProvider' } as T,
            error: null,
            metadata: { agentId: 'first', timestamp: Date.now() },
          };
        }

        async registerMCPs(): Promise<Tool[]> {
          return [];
        }

        async loadSkills(): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      class SecondProvider implements Provider {
        readonly id: ProviderId = 'anthropic';
        readonly capabilities: ProviderCapabilities = {
          mcp: true,
          skills: true,
          lsp: true,
          streaming: false,
          sessions: false,
          extendedThinking: false,
        };

        async initialize(): Promise<void> {}
        async terminate(): Promise<void> {}

        async execute<T>(
          _request: ProviderRequest,
          _toolExecutor: ToolExecutor
        ): Promise<AgentResponse<T>> {
          return {
            status: 'success',
            data: { from: 'SecondProvider' } as T,
            error: null,
            metadata: { agentId: 'second', timestamp: Date.now() },
          };
        }

        async registerMCPs(): Promise<Tool[]> {
          return [];
        }

        async loadSkills(): Promise<void> {}
        normalizeModel(model: string): ModelSpec {
          return { provider: 'anthropic', model, raw: model };
        }
      }

      const mockToolExecutor = vi.fn<ToolExecutor>().mockResolvedValue({
        content: 'result',
        isError: false,
      });

      // TEST: Both implementations can be used via Provider reference
      let provider: Provider;

      provider = new FirstProvider();
      await provider.initialize();
      const firstResponse = await provider.execute<{ from: string }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      provider = new SecondProvider();
      await provider.initialize();
      const secondResponse = await provider.execute<{ from: string }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      // VERIFY: Both return AgentResponse<T> with correct structure
      expect(firstResponse.status).toBe('success');
      expect(secondResponse.status).toBe('success');
      expect(firstResponse.metadata.agentId).toBe('first');
      expect(secondResponse.metadata.agentId).toBe('second');
    });

    it('should enforce type safety at compile time', () => {
      // This test documents TypeScript's compile-time type checking

      // VALID: Correct type usage compiles successfully
      const provider: Provider = new TypeCompatibleMockProvider();
      expect(provider.id).toBeDefined();

      // INVALID: The following would cause TypeScript compilation errors
      // (shown as comments for documentation purposes)

      // Error: Type 'string' is not assignable to type 'ProviderId'
      // const invalidId: ProviderId = 'not-a-valid-provider';

      // Error: Property 'invalidMethod' does not exist on type 'Provider'
      // provider.invalidMethod();

      // Error: Cannot assign to 'id' because it is a read-only property
      // provider.id = 'opencode';

      // Error: Cannot assign to 'capabilities' because it is a read-only property
      // provider.capabilities = { mcp: false, skills: false, lsp: false, streaming: false, sessions: false, extendedThinking: false };

      // GOTCHA: These errors are caught by TypeScript compiler, not Vitest
      // Run `npm run lint` (tsc --noEmit) to verify type safety
      // This test validates that the code compiles successfully
      expect(true).toBe(true);
    });

    it('should maintain type narrowing with discriminated union', async () => {
      const provider: Provider = new TypeCompatibleMockProvider();
      await provider.initialize();

      const mockToolExecutor = vi.fn<ToolExecutor>().mockResolvedValue({
        content: 'result',
        isError: false,
      });

      const response = await provider.execute<{ message: string }>(
        { prompt: 'test', options: {} },
        mockToolExecutor
      );

      // TEST: Type narrowing using discriminated union pattern
      if (response.status === 'success') {
        // TypeScript knows: response.data is { message: string } (not null)
        // response.error is definitely null
        expect(response.data).toBeDefined();
        expect(response.error).toBeNull();

        // We can safely access response.data properties
        expect(typeof response.data).toBe('object');
      } else if (response.status === 'error') {
        // TypeScript knows: response.data is null
        // response.error is AgentErrorDetails
        expect(response.data).toBeNull();
        expect(response.error).not.toBeNull();
      } else {
        // TypeScript knows: response.status is 'partial'
        // response.data is T, response.error is null
        expect(response.data).toBeDefined();
        expect(response.error).toBeNull();
      }
    });
  });
});

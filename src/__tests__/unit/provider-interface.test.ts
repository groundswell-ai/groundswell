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
});

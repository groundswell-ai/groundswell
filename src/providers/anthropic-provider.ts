/**
 * Anthropic provider implementation
 *
 * Wraps the @anthropic-ai/claude-agent-sdk to provide Anthropic Claude
 * model access through the unified Provider interface.
 *
 * ## Capabilities
 *
 * - **MCP**: Model Context Protocol integration via createSdkMcpServer
 * - **Skills**: System prompt-based skill loading
 * - **LSP**: Language Server Protocol via MCP plugins
 * - **Streaming**: Streaming response support
 * - **Sessions**: Stateless API (no native sessions)
 * - **Extended Thinking**: maxThinkingTokens for extended reasoning
 *
 * ## SDK Integration
 *
 * Uses lazy loading for the Anthropic SDK. The SDK is imported dynamically
 * in the initialize() method to support optional dependencies.
 *
 * @example
 * ```ts
 * import { AnthropicProvider } from 'groundswell';
 *
 * const provider = new AnthropicProvider();
 * await provider.initialize({ apiKey: 'sk-...' });
 *
 * const result = await provider.execute(
 *   { prompt: 'Hello, Claude!', options: {} },
 *   toolExecutor
 * );
 * ```
 *
 * @see {@link https://docs.anthropic.com/en/api/messages | Anthropic Messages API}
 * @see {@link https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk | Agent SDK Package}
 */

import type {
  Provider,
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ToolExecutor,
  ProviderHookEvents,
  ModelSpec,
} from '../types/providers.js';
import type { AgentResponse } from '../types/agent.js';
import type { Tool, MCPServer, Skill } from '../types/sdk-primitives.js';

export class AnthropicProvider implements Provider {
  /**
   * Unique provider identifier
   *
   * @readonly
   */
  readonly id: ProviderId = 'anthropic';

  /**
   * Provider capability flags
   *
   * Anthropic SDK v0.1.77 capabilities:
   * - MCP via createSdkMcpServer
   * - Skills via system prompt
   * - LSP via MCP plugins
   * - Streaming responses
   * - No native sessions (stateless)
   * - Extended thinking via maxThinkingTokens
   *
   * @readonly
   */
  readonly capabilities: ProviderCapabilities = {
    /** MCP server connections via createSdkMcpServer */
    mcp: true,
    /** Skill loading via system prompt */
    skills: true,
    /** LSP integration via MCP plugins */
    lsp: true,
    /** Streaming response support */
    streaming: true,
    /** Session-based state (stateless API) */
    sessions: false,
    /** Extended thinking via maxThinkingTokens */
    extendedThinking: true,
  } satisfies ProviderCapabilities;

  /**
   * Anthropic SDK module (lazy loaded)
   *
   * Dynamically imported in initialize() to support optional dependencies.
   * Typed using typeof import() pattern for accurate module types.
   *
   * @internal
   */
  private sdk: typeof import('@anthropic-ai/claude-agent-sdk') | null = null;

  /**
   * Initialize the Anthropic provider
   *
   * Loads the Anthropic SDK and initializes the client.
   *
   * @param options - Optional provider configuration (apiKey, endpoint, etc.)
   * @remarks
   * Implemented in P2.M1.T1.S2
   */
  async initialize(options?: ProviderOptions): Promise<void> {
    // Implemented in P2.M1.T1.S2
  }

  /**
   * Terminate the provider and cleanup resources
   *
   * @remarks
   * Implemented in P2.M1.T1.S3
   */
  async terminate(): Promise<void> {
    // Implemented in P2.M1.T1.S3
  }

  /**
   * Execute a prompt request
   *
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Typed agent response
   * @remarks
   * Implemented in P2.M1.T1.S5 (query construction) and P2.M1.T1.S6 (message iteration)
   */
  async execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    // Implemented in P2.M1.T1.S5-S6
    return {} as AgentResponse<T>;
  }

  /**
   * Register MCP servers and return available tools
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of discovered tools
   * @remarks
   * Implemented in P2.M1.T1.S7
   */
  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    // Implemented in P2.M1.T1.S7
    return [];
  }

  /**
   * Load skills into the provider
   *
   * @param skills - Array of skill definitions
   * @remarks
   * Implemented in P2.M1.T1.S8
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // Implemented in P2.M1.T1.S8
  }

  /**
   * Normalize a model string to a ModelSpec
   *
   * @param model - Model string (e.g., 'claude-sonnet-4' or 'anthropic/claude-opus-4')
   * @returns Parsed model specification
   * @remarks
   * Full implementation in P2.M1.T1.S4
   */
  normalizeModel(model: string): ModelSpec {
    // Full implementation in P2.M1.T1.S4
    return {
      provider: 'anthropic',
      model,
      raw: model,
    };
  }
}

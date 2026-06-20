import type {
  Harness,
  HarnessId,
  HarnessCapabilities,
  HarnessOptions,
  HarnessRequest,
  HarnessHookEvents,
  ToolExecutionRequest,
  ToolExecutionResult,
  ModelSpec,
} from "../types/harnesses.js";
import type { Tool, MCPServer, Skill } from "../types/sdk-primitives.js";
import type { AgentResponse } from "../types/agent.js";
import type { StreamEvent } from "../types/streaming.js";
import { parseModelSpec } from "../utils/model-spec.js";

/**
 * Pi harness skeleton (PRD §7.1).
 *
 * Wraps `@earendil-works/pi-coding-agent` (the vendor-neutral default runtime). This file is the
 * S1 SCAFFOLD: it installs the adapter as a compilable, instantiable `Harness` with correct identity
 * and capabilities. The SDK is wired in S2 (P2.M2.T1.S2); tools/streaming/hooks/skills land in
 * P2.M3/P2.M4.
 *
 * ## Capabilities (PRD §7.4 `pi` column — ALL supported)
 * - **MCP**: via Groundswell `MCPHandler` (tools registered with the harness)
 * - **Skills**: native agentskills.io
 * - **LSP**: via MCP plugins through `MCPHandler`
 * - **Streaming**: `session.subscribe` (`MessageUpdateEvent`)
 * - **Sessions**: `SessionManager` (fork/switch/clone)
 * - **Extended Thinking**: model-dependent
 *
 * Pi is vendor-neutral: it runs ANY LLM provider (PRD §7.4/§7.8), so `normalizeModel` applies NO
 * provider constraint (unlike `ClaudeCodeHarness`).
 *
 * @example
 * ```ts
 * import { PiHarness } from './harnesses/pi-harness.js';
 * const harness = new PiHarness();
 * // harness.id === 'pi'; harness.capabilities.* === true
 * await harness.initialize(); // throws until P2.M2.T1.S2
 * ```
 */
export class PiHarness implements Harness {
  /** Harness identifier (PRD §7.2). */
  readonly id: HarnessId = "pi";

  /** Capability flags — PRD §7.4 `pi` column (all true; vendor-neutral runtime). */
  readonly capabilities: HarnessCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: true,
    extendedThinking: true,
  } satisfies HarnessCapabilities;

  // NOTE: SDK wiring (createAgentSession / getModel / session.prompt+subscribe) lands in S2
  // (P2.M2.T1.S2). No `private session`/`private sdk` field at this layer.

  async initialize(_options?: HarnessOptions): Promise<void> {
    throw new Error(
      "PiHarness.initialize() not implemented — P2.M2.T1.S2 wires createAgentSession()",
    );
  }

  async terminate(): Promise<void> {
    throw new Error(
      "PiHarness.terminate() not implemented — P2.M2.T1.S2",
    );
  }

  execute<T>(
    _request: HarnessRequest,
    _toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    _hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    throw new Error(
      "PiHarness.execute() not implemented — P2.M2.T2.S1 (prompt/subscribe → AgentResponse)",
    );
  }

  async registerMCPs(_servers: MCPServer[]): Promise<Tool[]> {
    throw new Error(
      "PiHarness.registerMCPs() not implemented — P2.M4.T1.S2 (MCPHandler.toPiCustomTools)",
    );
  }

  async loadSkills(_skills: Skill[]): Promise<void> {
    throw new Error(
      "PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io loading)",
    );
  }

  /**
   * Parse a model string into a ModelSpec (PRD §7.8).
   *
   * Pi is vendor-neutral — ANY provider is valid (PRD §7.4 "LLM providers: any"). Unlike
   * `ClaudeCodeHarness`, there is NO anthropic-only constraint here. Delegates to `parseModelSpec`
   * (open `ModelProviderId` set; rejects harness-qualified 3-segment strings per PRD §7.8).
   *
   * This is the string→ModelSpec layer. S2 (P2.M2.T1.S2) owns ModelSpec→Pi `Model<any>` via
   * `getModel(provider, model)`.
   */
  normalizeModel(model: string): ModelSpec {
    return parseModelSpec(model);
  }

  supports(capability: keyof HarnessCapabilities): boolean {
    return this.capabilities[capability];
  }

  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean {
    return features.every((f) => this.capabilities[f]);
  }
}

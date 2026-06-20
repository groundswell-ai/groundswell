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
import { getGlobalHarnessConfig } from "../utils/harness-config.js";
import { AGENT_ERROR_CODES } from "../types/agent.js";
import { createSuccessResponse, createErrorResponse } from "../types/agent.js";
import { ConfigError } from "./claude-code-harness.js";
import type {
  AgentSession,
  AgentSessionEvent,
  AgentSessionEventListener,
} from "@earendil-works/pi-coding-agent";
import { ModelRegistry, AuthStorage } from "@earendil-works/pi-coding-agent";

/**
 * The Pi `Model<Api>` element type, derived from the re-exported ModelRegistry so
 * NO import from the non-hoisted `@earendil-works/pi-ai` is needed (Decision 4).
 * Structurally identical to Model<Api>; assignable to Model<any> for createAgentSession.
 */
type PiModel = NonNullable<ReturnType<ModelRegistry["find"]>>;

/**
 * Pi harness implementation (PRD §7.1).
 *
 * Wraps `@earendil-works/pi-coding-agent` (the vendor-neutral default runtime). This file is the
 * S2 implementation: it wires the SDK via lazy import in `initialize()`, builds a headless
 * `ModelRegistry`, and provides `resolveModel()` to map `ModelSpec` → Pi `Model<Api>`.
 * Tools/streaming/hooks/skills land in P2.M3/P2.M4.
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
 * await harness.initialize({ apiKey: 'sk-...' });
 * const spec = harness.normalizeModel('anthropic/claude-sonnet-4');
 * const model = harness.resolveModel(spec); // Model<Api>
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

  // ── S2: SDK + registry state (all nullable for idempotent terminate) ───────────────────────
  /** Lazily-imported Pi SDK module (mirrors ClaudeCodeHarness.sdk). Null until initialize(). */
  private sdk: typeof import("@earendil-works/pi-coding-agent") | null = null;
  /** Headless auth store (env/runtime API-key resolution). Null until initialize(). */
  private authStorage: AuthStorage | null = null;
  /** Model registry (built-in + custom models; per-provider auth). Null until initialize(). */
  private modelRegistry: ModelRegistry | null = null;
  /** Caller-supplied options (apiKey forwarded per-provider at resolveModel time). */
  private options: HarnessOptions | null = null;

  // ── S2: lifecycle ──────────────────────────────────────────────────────────────────────────
  /**
   * Initialize the Pi harness (PRD §7.3).
   *
   * Lazily `await import`s the Pi SDK, builds a headless `ModelRegistry.inMemory(...)`, and stores
   * the caller's options. Does NOT call `createAgentSession` — that is T2 (P2.M2.T2.S1), which
   * consumes `this.sdk`, `this.modelRegistry`, and `this.resolveModel(spec)`.
   *
   * Idempotent: a no-op if already initialized. API keys are resolved per-provider at
   * `resolveModel` time (the provider is unknown until a model string is parsed — GOTCHA #8).
   */
  async initialize(options?: HarnessOptions): Promise<void> {
    // Idempotent guard (mirror ClaudeCodeHarness L233-235).
    if (this.sdk) return;

    // Lazy SDK import (mirror ClaudeCodeHarness L237-248).
    try {
      this.sdk = await import("@earendil-works/pi-coding-agent");
    } catch (error) {
      throw new Error(
        `Failed to load @earendil-works/pi-coding-agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
    if (!this.sdk) {
      throw new Error("Failed to load @earendil-works/pi-coding-agent: Import returned null");
    }

    // Headless registry: no disk (no agentDir/models.json/auth.json). Env-var key resolution
    // is built into AuthStorage.getApiKey (GOTCHA #7).
    this.authStorage = AuthStorage.inMemory();
    this.modelRegistry = ModelRegistry.inMemory(this.authStorage);

    // Store options; apiKey is applied per-provider in resolveModel (GOTCHA #8).
    this.options = options ?? null;
  }

  /**
   * Terminate the harness and release references (PRD §7.3).
   *
   * Idempotent. Nulls sdk/authStorage/modelRegistry/options to allow GC. The Pi SDK manages its
   * own resources internally; no session exists at this layer (createAgentSession is T2).
   */
  async terminate(): Promise<void> {
    // Idempotent guard (mirror ClaudeCodeHarness L333-335).
    if (this.sdk === null) return;
    this.sdk = null;
    this.authStorage = null;
    this.modelRegistry = null;
    this.options = null;
  }

  // ── S2: ModelSpec → Model<Api> resolution (the "map to Model<any>" step) ───────────────────
  /**
   * Resolve a parsed {@link ModelSpec} to a Pi `Model<Api>` via the registry (PRD §7.8).
   *
   * Uses `modelRegistry.find(provider, model)` — the open-set, registry/auth-aware seam (NOT
   * `getModel`, which is generic-constrained to known providers/models and not importable —
   * research/model-resolution-path.md). T2 passes the result to `createAgentSession({ model })`.
   *
   * @throws {Error} if initialize() has not been called.
   * @throws {ConfigError} (code CONFIG_ERROR) if the model is not in the registry.
   */
  resolveModel(spec: ModelSpec): PiModel {
    if (!this.modelRegistry || !this.authStorage) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    // Inject the caller's apiKey for THIS provider (provider unknown until parse time — GOTCHA #8).
    if (this.options?.apiKey) {
      this.authStorage.setRuntimeApiKey(spec.provider, this.options.apiKey);
    }
    const model = this.modelRegistry.find(spec.provider, spec.model);
    if (!model) {
      throw new ConfigError(
        `Model "${spec.provider}/${spec.model}" not found in the Pi model registry. ` +
          `Ensure the provider/model id is correct and auth is configured ` +
          `(env var, auth.json, or HarnessOptions.apiKey). (PRD §7.8)`,
        {
          code: AGENT_ERROR_CODES.CONFIG_ERROR,
          details: { provider: spec.provider, model: spec.model, harnessId: this.id },
        },
      );
    }
    return model;
  }

  /**
   * Execute a prompt and return a structured AgentResponse (PRD §7.3, §7.11, §7.14.4).
   *
   * Creates a Pi AgentSession via createAgentSession, drives one prompt through session.prompt(),
   * aggregates the terminal assistant text + token usage + tool-call count from the event stream
   * (session.subscribe), fires session lifecycle hooks, and returns an AgentResponse<T>.
   *
   * Non-streaming path (this task — P2.M2.T2.S1): returns Promise<AgentResponse<T>>.
   * Streaming path: owned by P2.M3.T2.S1 (StreamEvent mapping) — throws synchronously.
   * Tool delegation: owned by P2.M3.T1 — customTools:[] in T2 (toolExecutor accepted, unused).
   * Remaining hooks (onToolStart/onToolEnd/onStream): owned by P2.M3.T2.S2.
   */
  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    // STREAMING branch — owned by P2.M3.T2.S1. Throw synchronously (not a rejected promise).
    if (request.options.streaming) {
      throw new Error(
        "PiHarness streaming execute() not implemented — P2.M3.T2.S1 (StreamEvent mapping)",
      );
    }

    // NON-STREAMING branch — IIFE returning Promise<AgentResponse<T>> (mirrors ClaudeCodeHarness).
    return (async (): Promise<AgentResponse<T>> => {
      // Uninitialized guard (mirror ClaudeCodeHarness's `if (!this.sdk) throw …`).
      if (!this.sdk || !this.modelRegistry || !this.authStorage) {
        throw new Error("PiHarness not initialized. Call initialize() first.");
      }

      const startTime = Date.now(); // capture BEFORE createAgentSession (duration includes setup)

      // Model resolution (S2's resolveModel; S1/S2's normalizeModel).
      const modelSpec = this.normalizeModel(
        request.options.model ?? "claude-sonnet-4-20250514",
      );
      const model = this.resolveModel(modelSpec); // throws ConfigError if absent — let it propagate

      // Create the Pi session. customTools: [] — Groundswell tools wired in P2.M3.T1.
      const { session } = await this.sdk!.createAgentSession({
        model,
        modelRegistry: this.modelRegistry,
        authStorage: this.authStorage,
        customTools: [],
      });

      // Aggregation closure — terminal assistant text + usage + tool-call count from events.
      // Pi's prompt() resolves void; the answer is ONLY available via the event stream.
      let lastAssistantText = "";
      let totalInput = 0;
      let totalOutput = 0;
      let toolCallCount = 0;

      const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
        // Structural cast — AgentMessage/AssistantMessage are NON-importable transitive types.
        const e = event as { type: string; message?: any; messages?: any[] };
        switch (e.type) {
          case "session_start": // PRD §7.11 → onSessionStart
            void hooks?.onSessionStart?.();
            break;
          case "session_shutdown": // PRD §7.11 → onSessionEnd(duration)
            void hooks?.onSessionEnd?.(Date.now() - startTime);
            break;
          case "turn_end": {
            const msg = e.message;
            if (msg && msg.role === "assistant" && Array.isArray(msg.content)) {
              // Text: last turn wins (final assistant message after all tool calls).
              const text = msg.content
                .filter((b: any) => b?.type === "text")
                .map((b: any) => b.text ?? "")
                .join("");
              if (text) lastAssistantText = text;
              // Usage: accumulate across turns (input→input_tokens, output→output_tokens).
              if (msg.usage) {
                totalInput += msg.usage.input ?? 0;
                totalOutput += msg.usage.output ?? 0;
              }
              // Tool calls: count toolCall blocks in this turn's message.
              for (const b of msg.content) {
                if (b?.type === "toolCall") toolCallCount++;
              }
            }
            break;
          }
          // agent_end is the terminal signal but turn_end already captured everything we need.
        }
      };

      const unsubscribe = session.subscribe(listener);

      try {
        await session.prompt(request.prompt); // resolves when the turn/loop is processed; events already fired
      } catch (error) {
        // EXECUTION_FAILED path (parity with ClaudeCodeHarness's createErrorResponse usage).
        return createErrorResponse(
          AGENT_ERROR_CODES.EXECUTION_FAILED,
          `Pi agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            prompt: request.prompt,
            model: modelSpec.raw,
            ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
          },
          true, // recoverable: assume transient (provider/network) — caller can retry
        ) as AgentResponse<T>;
      } finally {
        unsubscribe(); // detach even on success to avoid leaks if the session is reused
      }

      const duration = Date.now() - startTime;
      return createSuccessResponse(lastAssistantText as unknown as T, {
        agentId: this.id,
        timestamp: Date.now(),
        duration,
        usage: { input_tokens: totalInput, output_tokens: totalOutput },
        toolCalls: toolCallCount,
      });
    })();
  }

  async registerMCPs(_servers: MCPServer[]): Promise<Tool[]> {
    throw new Error(
      "PiHarness.registerMCPs() not implemented — P2.M4.T1.S2 (MCPHandler.toPiCustomTools)",
    );
  }

  async loadSkills(_skills: Skill[]): Promise<void> {
    throw new Error("PiHarness.loadSkills() not implemented — P2.M3.T2.S3 (native agentskills.io loading)");
  }

  /**
   * Parse a model string into a ModelSpec (PRD §7.8).
   *
   * Pi is vendor-neutral — ANY provider is valid (PRD §7.4 "LLM providers: any"). Unlike
   * `ClaudeCodeHarness`, there is NO anthropic-only constraint here. Delegates to `parseModelSpec`
   * (open `ModelProviderId` set; rejects harness-qualified 3-segment strings per PRD §7.8).
   *
   * Threads the global `defaultModelProvider` when configured (backward-compatible — when unset,
   * `defaultModelProvider` is `undefined`, so `parseModelSpec` defaults to `'anthropic'` exactly
   * as S1 does).
   *
   * This is the string→ModelSpec layer. `resolveModel()` owns the ModelSpec→Pi `Model<Api>` step.
   */
  normalizeModel(model: string): ModelSpec {
    const defaultProvider = getGlobalHarnessConfig().defaultModelProvider;
    return parseModelSpec(model, defaultProvider);
  }

  supports(capability: keyof HarnessCapabilities): boolean {
    return this.capabilities[capability];
  }

  requiresFeatures(features: (keyof HarnessCapabilities)[]): boolean {
    return features.every((f) => this.capabilities[f]);
  }
}

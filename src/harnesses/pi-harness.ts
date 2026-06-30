import type {
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
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
import { MCPHandler } from "../core/mcp-handler.js";
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
  Skill as PiSkill,
} from "@earendil-works/pi-coding-agent";
import { ModelRegistry, AuthStorage } from "@earendil-works/pi-coding-agent";

/**
 * The Pi `Model<Api>` element type, derived from the re-exported ModelRegistry so
 * NO import from the non-hoisted `@earendil-works/pi-ai` is needed (Decision 4).
 * Structurally identical to Model<Api>; assignable to Model<any> for createAgentSession.
 */
type PiModel = NonNullable<ReturnType<ModelRegistry["find"]>>;

/**
 * Mutable context shared across events during a single execute()/executeStreaming() call, used by
 * {@link PiHarness.fireHookEvents}. NOT exported (internal to PiHarness).
 */
interface HookDispatchContext {
  /** toolCallId → start info (timestamp for duration; name/input for request reconstruction). */
  toolStarts: Map<string, { name: string; input: unknown; timestamp: number }>;
  /** Snapshot-diff accumulator for onStream (independent from the drain loop's `fullText`). */
  streamText: { value: string };
}

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
  /** File-backed auth store (default: reads ~/.pi/agent/auth.json). Null until initialize(). */
  private authStorage: AuthStorage | null = null;
  /** Model registry (built-in + custom models; per-provider auth). Null until initialize(). */
  private modelRegistry: ModelRegistry | null = null;
  /** Caller-supplied options (apiKey forwarded per-provider at resolveModel time). */
  private options: HarnessOptions | null = null;
  /** MCP tool registry — mirrors ClaudeCodeHarness L177. */
  private mcpHandler: MCPHandler = new MCPHandler();
  /**
   * Combined skills prompt (agentskills.io XML) from loadSkills(), injected into the session's system
   * prompt during execute() via a DefaultResourceLoader.appendSystemPrompt (parity with
   * ClaudeCodeHarness.skillsPrompt). Empty string when no skills are loaded (loadSkills not called, or
   * called with []). When empty, execute() omits the resourceLoader → Pi builds its own default loader
   * (current behavior preserved — no regression).
   * @internal
   */
  private skillsPrompt: string = "";

  // ── S2: lifecycle ──────────────────────────────────────────────────────────────────────────
  /**
   * Initialize the Pi harness (PRD §7.3, §9.2.6).
   *
   * Lazily `await import`s the Pi SDK, builds a file-backed `AuthStorage.create()` and
   * `ModelRegistry.create(authStorage)` honoring `~/.pi/agent/auth.json` (PRD §9.2.6),
   * and stores the caller's options. Does NOT call `createAgentSession` — that is T2
   * (P2.M2.T2.S1), which consumes `this.sdk`, `this.modelRegistry`, and
   * `this.resolveModel(spec)`.
   *
   * Callers MAY inject their own `authStorage` / `modelRegistry` via `HarnessOptions`
   * (PRD §7.5 per-harness extension) — e.g. tests seed `AuthStorage.inMemory({ zai: {...} })`
   * to avoid touching disk.
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

    // File-backed by default (PRD §9.2.6): AuthStorage.create() reads ~/.pi/agent/auth.json
    // (overridable via PI_CODING_AGENT_DIR); ModelRegistry.create() reads models.json. Callers
    // MAY inject their own (PRD §7.5) — e.g. tests seed AuthStorage.inMemory({ zai: {...} }).
    // getApiKey() priority: runtime override → auth.json api_key → auth.json oauth → env → fallback.
    this.authStorage = options?.authStorage ?? AuthStorage.create();
    this.modelRegistry = options?.modelRegistry ?? ModelRegistry.create(this.authStorage);

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
   * Non-streaming path (P2.M2.T2.S1): returns Promise<AgentResponse<T>>.
   * Streaming path: delegates to executeStreaming() (P2.M3.T2.S1) — returns AsyncGenerator<StreamEvent, AgentResponse<T>>.
   * Tool delegation: customTools wired via buildCustomTools (P2.M3.T1).
   * All hooks fire: session hooks inline (S1/P2.M2.T2.S1); tool/stream hooks via fireHookEvents() (P2.M3.T2.S2).
   */
  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    // STREAMING branch — P2.M3.T2.S1. Init guard BEFORE returning the generator (synchronous return).
    // Mirror ClaudeCodeHarness L386-395: if (streaming) { guard; return this.executeStreaming(...); }
    if (request.options.streaming) {
      if (!this.sdk || !this.modelRegistry || !this.authStorage) {
        throw new Error("PiHarness not initialized. Call initialize() first.");
      }
      return this.executeStreaming<T>(request, toolExecutor, hooks);
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

      // PiHarness creates a fresh AgentSession per execute() call, so loadSkills() state
      // takes effect on the next execute() — no session rebuild is required.
      const resourceLoader = await this.buildSkillsResourceLoader(
        request.options.systemPrompt
      );

      // Create the Pi session. customTools: [] — Groundswell tools wired in P2.M3.T1.
      const { session } = await this.sdk!.createAgentSession({
        model,
        modelRegistry: this.modelRegistry,
        authStorage: this.authStorage,
        customTools: this.buildCustomTools(toolExecutor),
        ...(resourceLoader ? { resourceLoader } : {}), // skills injection; omitted when no skills
      });

      // Aggregation closure — terminal assistant text + usage + tool-call count from events.
      // Pi's prompt() resolves void; the answer is ONLY available via the event stream.
      let lastAssistantText = "";
      let totalInput = 0;
      let totalOutput = 0;
      let toolCallCount = 0;

      // Hook dispatch context — mutable accumulators for fireHookEvents (P2.M3.T2.S2).
      const hookCtx: HookDispatchContext = {
        toolStarts: new Map(),
        streamText: { value: "" },
      };

      const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
        this.fireHookEvents(event, hooks, hookCtx); // P2.M3.T2.S2 — tool/stream hooks
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

  /**
   * Stream a Pi turn as `StreamEvent`s (PRD §7.3, §7.4, §7.14.4).
   *
   * Pi's `session.subscribe(listener)` is SYNCHRONOUS — a listener cannot `yield`. This method
   * bridges sync callbacks → async generator via an internal queue: the listener `enqueue`s events
   * (and resolves a parked drain), the generator `dequeue`s/maps/`yield`s. `session.prompt()` runs
   * detached; its resolution flips the terminal condition.
   *
   * Mapping (PRD §7.11): message_update→text_delta (snapshot-diff), tool_execution_start→tool_call_start,
   * tool_execution_end→tool_call_done, turn_end→usage, terminal→done, errors→error.
   *
   * Hooks (Decision 5): session lifecycle hooks (onSessionStart/onSessionEnd) fire for parity with
   * the non-streaming path. onToolStart/onToolEnd/onStream are P2.M3.T2.S2 (NOT wired here).
   */
  private async *executeStreaming<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents,
  ): AsyncGenerator<StreamEvent, AgentResponse<T>, unknown> {
    if (!this.sdk || !this.modelRegistry || !this.authStorage) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    const startTime = Date.now();

    const modelSpec = this.normalizeModel(request.options.model ?? "claude-sonnet-4-20250514");
    const model = this.resolveModel(modelSpec); // throws ConfigError if absent — let it propagate

    // PiHarness creates a fresh AgentSession per execute() call, so loadSkills() state
    // takes effect on the next execute() — no session rebuild is required.
    const resourceLoader = await this.buildSkillsResourceLoader(
      request.options.systemPrompt
    );

    // REUSE P2.M3.T1.S1's customTools seam (Decision 1) — do NOT pass customTools: [].
    const { session } = await this.sdk!.createAgentSession({
      model,
      modelRegistry: this.modelRegistry,
      authStorage: this.authStorage,
      customTools: this.buildCustomTools(toolExecutor),
      ...(resourceLoader ? { resourceLoader } : {}), // skills injection; omitted when no skills
    });

    // Yield metadata FIRST (mirror ClaudeCodeHarness L696-701).
    yield {
      type: "metadata",
      metadata: {
        requestId: `${this.id}-${Date.now()}`,
        model: modelSpec.model,
        provider: modelSpec.provider,
      },
    } satisfies Extract<StreamEvent, { type: "metadata" }>;

    // ── Async-queue bridge (Decision 3) ─────────────────────────────────────────────
    const queue: AgentSessionEvent[] = [];
    let resolveNext: (() => void) | null = null;
    let turnDone = false;

    const enqueue = (e: AgentSessionEvent) => {
      queue.push(e);
      resolveNext?.();
      resolveNext = null;
    };

    // Aggregation state (mirrors the non-streaming listener).
    let fullText = "";
    let textIndex = 0;
    let toolIndex = 0;
    let lastInput = 0;
    let lastOutput = 0;
    let lastCache: number | undefined;

    // Hook dispatch context — mutable accumulators for fireHookEvents (P2.M3.T2.S2).
    const hookCtx: HookDispatchContext = {
      toolStarts: new Map(),
      streamText: { value: "" },
    };

    const listener: AgentSessionEventListener = (event: AgentSessionEvent) => {
      const e = event as { type: string; message?: any };
      // Session lifecycle hooks — parity with non-streaming (Decision 5).
      switch (e.type) {
        case "session_start":
          void hooks?.onSessionStart?.();
          break;
        case "session_shutdown":
          void hooks?.onSessionEnd?.(Date.now() - startTime);
          break;
      }
      this.fireHookEvents(event, hooks, hookCtx); // P2.M3.T2.S2 — BEFORE enqueue → ordering (PRD §7.14.3)
      enqueue(event); // every event flows through the bridge for mapping
    };

    const unsubscribe = session.subscribe(listener);

    // Kick off prompt() WITHOUT awaiting in the generator body (Decision 3). Capture rejection.
    let promptError: unknown = null;
    void session
      .prompt(request.prompt)
      .catch((err: unknown) => {
        promptError = err;
      })
      .finally(() => {
        turnDone = true;
        resolveNext?.();
        resolveNext = null;
      });

    try {
      // ── Drain loop: map Pi events → StreamEvent ──────────────────────────────────
      while (!turnDone || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((r) => {
            resolveNext = r;
          });
        }
        while (queue.length > 0) {
          const event = queue.shift()!;
          const e = event as {
            type: string;
            message?: any;
            toolCallId?: string;
            toolName?: string;
            result?: any;
            isError?: boolean;
          };
          switch (e.type) {
            case "message_update": {
              // Snapshot-diff (Decision 2) — assistant text only.
              if (e.message?.role === "assistant" && Array.isArray(e.message.content)) {
                const text = e.message.content
                  .filter((b: any) => b?.type === "text")
                  .map((b: any) => b.text ?? "")
                  .join("");
                if (text.length > fullText.length && text.startsWith(fullText)) {
                  yield {
                    type: "text_delta",
                    delta: text.slice(fullText.length),
                    index: textIndex++,
                  } satisfies Extract<StreamEvent, { type: "text_delta" }>;
                  fullText = text;
                } else if (text.length > fullText.length) {
                  // Non-prefix growth (rare replays) — emit the whole new tail.
                  yield { type: "text_delta", delta: text.slice(fullText.length), index: textIndex++ } satisfies Extract<StreamEvent, { type: "text_delta" }>;
                  fullText = text;
                }
              }
              break;
            }
            case "tool_execution_start":
              yield {
                type: "tool_call_start",
                id: String(e.toolCallId ?? ""),
                name: String(e.toolName ?? ""),
                index: toolIndex++,
              } satisfies Extract<StreamEvent, { type: "tool_call_start" }>;
              break;
            case "tool_execution_end":
              yield {
                type: "tool_call_done",
                id: String(e.toolCallId ?? ""),
                result: e.result ?? null,
              } satisfies Extract<StreamEvent, { type: "tool_call_done" }>;
              break;
            case "turn_end": {
              const msg = e.message;
              if (msg && msg.role === "assistant" && msg.usage) {
                lastInput = msg.usage.input ?? 0;
                lastOutput = msg.usage.output ?? 0;
                lastCache = msg.usage.cacheRead ?? msg.usage.cacheWrite; // mirror ClaudeCodeHarness L843-845
              }
              break;
            }
            // session_start/session_shutdown/agent_end/turn_start/etc. handled by hooks or ignored.
          }
        }
      }

      // ── Terminal ─────────────────────────────────────────────────────────────────
      if (promptError) {
        const message = promptError instanceof Error ? promptError.message : String(promptError);
        yield {
          type: "error",
          error: new Error(`Pi agent execution failed: ${message}`),
          code: AGENT_ERROR_CODES.EXECUTION_FAILED,
          retryable: true,
        } satisfies Extract<StreamEvent, { type: "error" }>;
        return createErrorResponse(
          AGENT_ERROR_CODES.EXECUTION_FAILED,
          `Pi agent execution failed: ${message}`,
          {
            prompt: request.prompt,
            model: modelSpec.raw,
            ...(promptError instanceof Error && promptError.stack ? { stack: promptError.stack } : {}),
          },
          true,
        ) as AgentResponse<T>;
      }

      // Usage (one event — final turn wins; GOTCHA #9).
      if (lastInput || lastOutput) {
        const usageEvent: Extract<StreamEvent, { type: "usage" }> = {
          type: "usage",
          inputTokens: lastInput,
          outputTokens: lastOutput,
        };
        if (lastCache !== undefined) usageEvent.cacheTokens = lastCache;
        yield usageEvent;
      }

      yield { type: "done", finishReason: "stop" } satisfies Extract<StreamEvent, { type: "done" }>;

      return createSuccessResponse(fullText as unknown as T, {
        agentId: this.id,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        usage: { input_tokens: lastInput, output_tokens: lastOutput },
      });
    } finally {
      unsubscribe(); // detach even on early break / abort (GOTCHA #16)
    }
  }

  /**
   * Dispatch the three harness hooks owned by P2.M3.T2.S2 (PRD §7.11):
   *   tool_execution_start → onToolStart({name, input})
   *   tool_execution_end   → onToolEnd({name, input}, {content, isError}, duration)
   *   message_update       → onStream(delta)   [snapshot-diff; assistant text only]
   *
   * Session hooks (onSessionStart/onSessionEnd) are NOT handled here — they stay inline in the
   * listeners as S1/P2.M2.T2.S1 wrote them (no scope overlap, no merge conflict).
   *
   * Pi fidelity advantage over claude-code (item note): onToolEnd observes the REAL isError
   * (ToolExecutionEndEvent.isError) and a REAL duration (computed from the stashed start timestamp);
   * claude-code's PostToolUse cannot (always isError:false, duration:0).
   *
   * Hooks are FIRE-AND-TRACK (`void`): the Pi listener runs SYNCHRONOUSLY during session.prompt()
   * and cannot `await` a hook Promise (would block/reorder the SDK event loop). Matches the existing
   * `void hooks?.onSessionStart?.()` pattern. Tests use sync vi.fn() hooks for deterministic assertions.
   *
   * @param event  Pi session event (structurally cast — transitive types are non-importable).
   * @param hooks  Optional HarnessHookEvents. Early-returns on `!hooks` (cheap no-op).
   * @param ctx    Mutable accumulators (toolStarts for duration/input reconstruction; streamText for onStream).
   */
  private fireHookEvents(
    event: AgentSessionEvent,
    hooks: HarnessHookEvents | undefined,
    ctx: HookDispatchContext,
  ): void {
    if (!hooks) return; // no hooks → cheap no-op
    const e = event as {
      type: string;
      message?: any;
      toolCallId?: string;
      toolName?: string;
      args?: any;
      result?: any;
      isError?: boolean;
    };
    switch (e.type) {
      case "tool_execution_start": {
        const req: ToolExecutionRequest = { name: e.toolName ?? "", input: e.args };
        if (e.toolCallId) {
          ctx.toolStarts.set(e.toolCallId, {
            name: req.name,
            input: req.input,
            timestamp: Date.now(), // tool events carry NO timestamp; we record it
          });
        }
        void hooks.onToolStart?.(req); // fire-and-track
        break;
      }
      case "tool_execution_end": {
        const id = e.toolCallId ?? "";
        const start = ctx.toolStarts.get(id);
        const duration = start ? Date.now() - start.timestamp : 0;
        // Reconstruct the request from the STASHED start info (end event lacks args).
        const req: ToolExecutionRequest = start
          ? { name: start.name, input: start.input }
          : { name: e.toolName ?? "", input: undefined }; // graceful degradation
        const result: ToolExecutionResult = {
          content: e.result ?? null,
          isError: e.isError ?? false, // REAL isError (Pi > claude-code)
        };
        if (id) ctx.toolStarts.delete(id); // defend against duplicate end events
        void hooks.onToolEnd?.(req, result, duration); // fire-and-track
        break;
      }
      case "message_update": {
        // onStream snapshot-diff; INDEPENDENT accumulator (ctx.streamText) decoupled
        // from the drain loop's `fullText` so S2 never edits the drain loop. Both produce identical
        // deltas for the same chunk (same algorithm, same event).
        const msg = e.message;
        if (msg?.role === "assistant" && Array.isArray(msg.content)) {
          const text = msg.content
            .filter((b: any) => b?.type === "text")
            .map((b: any) => b.text ?? "")
            .join("");
          if (text.length > ctx.streamText.value.length) {
            const delta = text.slice(ctx.streamText.value.length);
            void hooks.onStream?.(delta);
            ctx.streamText.value = text;
          }
        }
        break;
      }
      // session_start/session_shutdown handled inline in the listeners (NOT here — scope boundary).
      // tool_execution_update/turn_end/etc. — no hook mapping (PRD §7.11 table).
    }
  }

  async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
    if (!this.sdk) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    for (const server of servers) {
      this.mcpHandler.registerServer(server);
    }
    return this.mcpHandler.getTools();
  }

  /**
   * Build Pi `ToolDefinition[]` from the registered MCPHandler tools (PRD §7.10, §7.12, §7.14.1).
   *
   * Delegates to `MCPHandler.toPiCustomTools()` (P2.M4.T1.S2) which produces schema-faithful
   * ToolDefinitions with REAL TypeBox `parameters` (converted via `jsonSchemaToTypebox`) and
   * `execute` delegating to `registered.executor` (Claude parity).
   *
   * When `toolExecutor` is provided (PRD §7.10 bridge), forwards it to `toPiCustomTools` so
   * each tool's `execute` dispatches through the caller-supplied executor instead of the
   * harness's internal `registered.executor`.
   */
  private buildCustomTools(
    toolExecutor?: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
  ): ToolDefinition[] {
    return this.mcpHandler.toPiCustomTools(toolExecutor);
  }

  /**
   * Load skills via Pi's NATIVE agentskills.io implementation (PRD §7.12, §7.14.2).
   *
   * For each Groundswell {@link Skill} ({name, path}), calls Pi's `loadSkillsFromDir({dir: path,
   * source: name})` (which reads SKILL.md from the dir), collects all returned Pi Skills, then formats
   * them to agentskills.io XML via `formatSkillsForPrompt` and stores the result in {@link skillsPrompt}.
   *
   * ## No session re-init required
   * PiHarness creates a FRESH AgentSession per execute()/executeStreaming() call (P2.M2.T2.S1 /
   * P2.M3.T2.S1), so this stored skillsPrompt is consumed on the NEXT execute() when
   * buildSkillsResourceLoader() builds the DefaultResourceLoader. This mirrors how registerMCPs()
   * state is consumed when execute() builds customTools. (A long-lived-session model would need an
   * explicit rebuild; not the case here.)
   *
   * ## Parity with ClaudeCodeHarness
   * ClaudeCodeHarness reads each SKILL.md and joins with markdown; PiHarness uses Pi's native loaders
   * and emits the agentskills.io XML format. Both store the result in a `skillsPrompt` field and inject
   * at BOTH execute sites. EFFECT is identical: the skill's SKILL.md content reaches the model's system
   * prompt.
   *
   * @param skills - Groundswell portable Skill list ({name, path}). path = dir containing SKILL.md.
   * @throws {Error} /not initialized/i if initialize() has not been called.
   * @throws {Error} "Failed to load skill '<name>' from <path>: <msg>" if loadSkillsFromDir throws.
   */
  async loadSkills(skills: Skill[]): Promise<void> {
    // Init guard (mirror registerMCPs / ClaudeCodeHarness.loadSkills).
    if (!this.sdk) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    // Empty → clear (mirror ClaudeCodeHarness; also ensures a prior loadSkills doesn't linger).
    if (skills.length === 0) {
      this.skillsPrompt = "";
      return;
    }
    // NATIVE agentskills.io loading: map each Groundswell Skill {name,path} → Pi loadSkillsFromDir.
    // Collect ALL Pi Skills, then format to ONE agentskills.io XML string.
    const collected: PiSkill[] = [];
    for (const skill of skills) {
      try {
        // loadSkillsFromDir is SYNC; reads SKILL.md from `dir` (skill root / .md children / recurse).
        // `source` is the SourceInfo identifier (use the Groundswell skill name).
        const result = this.sdk.loadSkillsFromDir({
          dir: skill.path,
          source: skill.name,
        });
        collected.push(...result.skills);
      } catch (error) {
        // Wrap with context (mirror ClaudeCodeHarness L983-988 error wrapping).
        throw new Error(
          `Failed to load skill '${skill.name}' from ${skill.path}: ` +
            `${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
    // formatSkillsForPrompt → agentskills.io XML; EXCLUDES disableModelInvocation:true (Pi filters).
    this.skillsPrompt = this.sdk.formatSkillsForPrompt(collected);
  }

  /**
   * Build a DefaultResourceLoader that appends the loaded skills ({@link skillsPrompt}) to the
   * session's system prompt (PRD §7.12, §7.14.2).
   *
   * Returns `undefined` when no skills are loaded (`skillsPrompt === ""`), so execute() OMITS the
   * `resourceLoader` option and Pi builds its own default loader — current behavior is preserved
   * (zero regression in the execute/streaming suites).
   *
   * ## Parity: noSkills: true
   * Suppresses Pi's DEFAULT skill discovery (~/.pi/agent/skills, cwd-local) so the session's skills are
   * EXACTLY Groundswell's portable Skill[] (parity with ClaudeCodeHarness, which builds its prompt only
   * from the passed skills). `appendSystemPrompt` is INDEPENDENT of `noSkills`, so our pre-formatted
   * agentskills.io XML is still appended to the system prompt.
   *
   * createAgentSession uses a caller-provided loader AS-IS (no reload), so we `await loader.reload()`.
   *
   * @returns A configured DefaultResourceLoader, or undefined when no skills are loaded.
   * @throws {Error} /not initialized/i if called before initialize() (defensive — execute() guards too).
   */
  private async buildSkillsResourceLoader(
    systemPrompt?: string
  ): Promise<
    import("@earendil-works/pi-coding-agent").DefaultResourceLoader | undefined
  > {
    if (!this.sdk) {
      throw new Error("PiHarness not initialized. Call initialize() first.");
    }
    // Forward BOTH the harness system prompt (the agent persona, e.g.
    // TASK_BREAKDOWN_PROMPT) AND the loaded skills to Pi via appendSystemPrompt.
    // Without this, HarnessRequest.options.systemPrompt is silently dropped —
    // createAgentSession never receives it — so every agent runs under Pi's
    // generic coding persona (e.g. the architect implements the PRD directly
    // instead of decomposing it into tasks.json).
    const appendParts: string[] = [];
    if (systemPrompt) appendParts.push(systemPrompt);
    if (this.skillsPrompt) appendParts.push(this.skillsPrompt);
    if (appendParts.length === 0) return undefined; // nothing to inject → let Pi use its default loader
    // cwd/agentDir are REQUIRED by DefaultResourceLoaderOptions. agentDir = Pi's default (~/.pi/agent).
    const loader = new this.sdk.DefaultResourceLoader({
      cwd: process.cwd(),
      agentDir: this.sdk.getAgentDir(),
      appendSystemPrompt: appendParts, // persona + agentskills.io XML appended to the system prompt
      noSkills: true, // parity: don't ALSO load Pi's default skills
    });
    await loader.reload(); // createAgentSession will NOT reload a caller-provided loader
    return loader;
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

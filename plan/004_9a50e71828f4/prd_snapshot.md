# **📘 PRODUCT REQUIREMENTS DOCUMENT (PRD)**

### **Hierarchical Workflow Engine with Full Observability & Tree Debugging**

Version: **1.2**
Status: **Implementation-ready**

> **v1.2 — Harness / Provider split.** The agent runtime is now modeled as a pluggable **harness** (`pi` default, `claude-code` optional) that is fully decoupled from the LLM **provider/model** (Anthropic, OpenAI, …). The model string is never harness-qualified. See Section 7. The current `Provider*` types in source map to the new `Harness*` types; code migration to match this spec is a tracked follow-up.

---

# **1. Overview**

This PRD defines a TypeScript workflow orchestration engine that provides:

* Hierarchical workflows with sequential + concurrent steps.
* Automatic parent/child attachment.
* High-resolution observability (logs, events, snapshots).
* Error introspection with full child state visibility.
* Restart logic handled at correct parent level.
* Real-time tree debugger API for terminal visualization.

All logs & events must form a **perfect 1:1 tree mirror** of the workflow execution tree in memory.

This PRD includes:

✔️ Full data model
✔️ All TypeScript interfaces
✔️ Decorator specs
✔️ Workflow base class skeleton
✔️ Logger implementation skeleton
✔️ Observer/event system skeleton
✔️ Snapshot system spec
✔️ Error/restart semantics
✔️ Pluggable agent harness (Pi default, Claude Code optional) with orthogonal provider/model selection

---

# **2. Architecture**

```
Workflow
 ├─ Steps (decorated methods)
 ├─ Tasks (decorated methods)
 ├─ Observed state (decorated fields)
 ├─ Children (other workflows)
 ├─ Logs
 └─ Events
```

The tree debugger subscribes to a root workflow and receives real-time events.

---

# **3. Core Data Model (Interfaces)**

## **3.1 WorkflowNode**

```ts
export interface WorkflowNode {
  id: string;
  name: string;

  parent: WorkflowNode | null;
  children: WorkflowNode[];

  status: WorkflowStatus;

  logs: LogEntry[];
  events: WorkflowEvent[];

  // optional state snapshot
  stateSnapshot: SerializedWorkflowState | null;
}
```

## **3.2 WorkflowStatus**

```ts
export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

---

# **4. Logging & Events Model**

## **4.1 LogEntry**

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  workflowId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  parentLogId?: string;
}
```

## **4.2 WorkflowEvent**

```ts
export type WorkflowEvent =
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode };
```

---

# **5. Error Model**

## **5.1 WorkflowError**

```ts
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;

  state: SerializedWorkflowState; // a snapshot
  logs: LogEntry[];               // logs from this node only
}
```

---

# **6. Agent Response Model**

**All agent responses MUST be valid JSON.** This is a non-negotiable requirement for system interoperability, parsing reliability, and debugging capability.

## **6.1 AgentResponse Interface**

```ts
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

## **6.2 AgentErrorDetails**

```ts
export interface AgentErrorDetails {
  code: string;                    // machine-readable error code (e.g., "VALIDATION_FAILED")
  message: string;                 // human-readable error description
  details?: Record<string, unknown>; // additional context
  recoverable: boolean;            // hint for parent workflow retry logic
}
```

## **6.3 AgentResponseMetadata**

```ts
export interface AgentResponseMetadata {
  agentId: string;                 // ID of the responding agent/workflow
  timestamp: number;               // Unix timestamp (ms)
  duration?: number;               // execution time in ms
  requestId?: string;              // correlation ID for tracing
}
```

## **6.4 Response Requirements**

1. **Strict JSON**: All responses must be parseable by `JSON.parse()` without modification.
2. **No Prose Wrapping**: Responses must not be wrapped in markdown code blocks, conversational text, or any non-JSON content.
3. **Consistent Structure**: Every response must conform to the `AgentResponse` interface—no ad-hoc formats.
4. **Null over Undefined**: Use `null` for absent values; `undefined` is not valid JSON.
5. **Error Responses**: Failed operations must still return valid JSON with `status: 'error'` and populated `error` field.

## **6.5 Example Responses**

**Success Response:**
```ts
{
  "status": "success",
  "data": {
    "result": "Task completed",
    "artifacts": ["file1.ts", "file2.ts"]
  },
  "error": null,
  "metadata": {
    "agentId": "agent-abc123",
    "timestamp": 1706140800000,
    "duration": 1523
  }
}
```

**Error Response:**
```ts
{
  "status": "error",
  "data": null,
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Failed to compile TypeScript files",
    "details": {
      "failedFiles": ["src/index.ts"],
      "compilerErrors": ["TS2307: Cannot find module 'foo'"]
    },
    "recoverable": true
  },
  "metadata": {
    "agentId": "agent-abc123",
    "timestamp": 1706140800000,
    "duration": 892
  }
}
```

**Partial Response (for streaming/incremental results):**
```ts
{
  "status": "partial",
  "data": {
    "completedSteps": 3,
    "totalSteps": 5,
    "intermediateResult": { ... }
  },
  "error": null,
  "metadata": {
    "agentId": "agent-abc123",
    "timestamp": 1706140800000
  }
}
```

## **6.6 Validation**

Workflows receiving agent responses SHOULD validate against the `AgentResponse` schema before processing. Invalid responses must be treated as errors with code `INVALID_RESPONSE_FORMAT`.

---

# **7. Agent Harness System**

Groundswell runs the agent loop through a pluggable **harness** — an agent runtime/SDK that drives prompting, tool execution, streaming, and sessions. The harness is **orthogonal** to the LLM **provider/model** (Anthropic, OpenAI, Z.ai, …): the two are chosen independently.

* Users select a harness once at the top level; all workflows, agents, and prompts inherit that setting unless explicitly overridden.
* The **default harness is `pi`** (vendor-neutral, no lock-in). **`claude-code`** remains a fully supported, 1:1-compatible option for users who must stay within Anthropic's ecosystem.
* The two harnesses share one `Harness` interface (§7.3); each ships an adapter (`PiHarness`, `ClaudeCodeHarness`).
* **The harness never appears in the model string** (§7.8). Strings like `pi/anthropic/...` or `cc/anthropic/...` are invalid.

## **7.1 Supported Harnesses**

| Harness | SDK / Package | Description |
|---------|--------------|-------------|
| `pi` *(default)* | Pi SDK — `@earendil-works/pi-coding-agent` | Vendor-neutral runtime. No walled garden; runs any LLM provider through its own provider system. Barebones out of the box — MCP, Skills, and LSP are supplied by Groundswell (or optional Pi plugins). |
| `claude-code` | Claude Code SDK — `@anthropic-ai/claude-agent-sdk` | Anthropic's official agent SDK. First-class MCP/Skills/LSP, but Anthropic-only models and plan/SDK usage restrictions apply. Use when you must remain inside Anthropic's ecosystem. |

**Rationale.** Claude Code was the original default because it is widely preconfigured, but Anthropic's SDK imposes a walled-garden ecosystem and serious limits on coding-plan usage. Pi provides comparable functionality without vendor lock-in, so it is now the default. Claude Code is retained as an optional, parity-maintained fallback because some users are constrained to it and cannot use Pi.

## **7.2 HarnessId**

```ts
export type HarnessId = 'pi' | 'claude-code';
```

## **7.3 Harness Interface**

The shared contract that both adapters implement:

```ts
export interface Harness {
  readonly id: HarnessId;
  readonly capabilities: HarnessCapabilities;

  initialize(options?: HarnessOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: HarnessRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: HarnessHookEvents
  ): Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

**Adapters.** `PiHarness` wraps `createAgentSession()` from the Pi SDK; `ClaudeCodeHarness` wraps the Claude Code SDK. Each maps its runtime onto the interface above. New harnesses are added by implementing `Harness` and registering with the `HarnessRegistry` (§7.6).

**Migration Note:** `execute()` returns `AgentResponse<T>` (see §6). The legacy `ProviderResult<T>` type is deprecated.

**Example:**

```ts
const response = await harness.execute<{ answer: string }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor
);

if (response.status === 'success') {
  console.log(response.data.answer);  // Type-safe access
}
```

## **7.4 Harness Capabilities**

```ts
export interface HarnessCapabilities {
  mcp: boolean;              // MCP server connections
  skills: boolean;           // Skill loading
  lsp: boolean;              // Language Server Protocol integration
  streaming: boolean;        // Streaming responses
  sessions: boolean;         // Session-based state
  extendedThinking: boolean; // Extended thinking/reasoning
}
```

| Capability | `pi` | `claude-code` |
|------------|------|---------------|
| MCP | via Groundswell `MCPHandler` (tools registered with the harness) | built-in **and** via `MCPHandler` |
| Skills | ✓ native ([agentskills.io](https://agentskills.io); loads `~/.claude/skills`) | ✓ native (system prompt) |
| LSP | via MCP plugins through `MCPHandler` | via MCP plugins |
| Streaming | ✓ (`session.subscribe`) | ✓ (message stream) |
| Sessions | ✓ (`SessionManager`; fork/switch/clone) | ✓ (file-based resume) |
| Extended Thinking | ✓ (model-dependent) | ✓ |
| LLM providers | any | Anthropic only |

> **Parity without Pi plugins.** Groundswell executes all tools locally through `MCPHandler` (§7.10) and registers them with whichever harness is active; the harness only reports tool calls back via `toolExecutor`. Therefore Pi's lack of built-in MCP/LSP is **not** a capability gap, and no Pi plugin needs to be bundled to reach parity.

## **7.5 HarnessOptions**

```ts
export interface HarnessOptions {
  endpoint?: string;                  // API endpoint override
  apiKey?: string;                    // forwarded to the LLM provider
  sessionId?: string;                 // session/resume id
  timeout?: number;                   // timeout in milliseconds
  headers?: Record<string, string>;   // custom headers
}
```

Harness implementations MAY extend this with harness-specific fields (e.g., `skillsDirs?: string[]` on `pi` to point at additional skill directories). API keys belong to the **LLM provider**, not the harness — the harness only forwards them.

## **7.6 Global Harness Configuration**

```ts
export interface GlobalHarnessConfig {
  defaultHarness: HarnessId;
  harnessDefaults?: Partial<Record<HarnessId, HarnessOptions>>;
  /** Default LLM provider used to resolve unqualified model strings (§7.8). */
  defaultModelProvider?: ModelProviderId;
}

export function configureHarnesses(config: GlobalHarnessConfig): void;
```

**Example:**

```ts
import { configureHarnesses } from 'groundswell';

// Set once at application startup - cascades to all agents
configureHarnesses({
  defaultHarness: 'pi',                  // vendor-neutral default
  defaultModelProvider: 'anthropic',     // LLM host - independent of harness
  harnessDefaults: {
    'claude-code': { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

## **7.7 Configuration Cascade**

Harness selection cascades independently of model selection:

```
GlobalHarnessConfig.defaultHarness  (highest priority for defaults)
    ↓
AgentConfig.harness / AgentConfig.harnessOptions
    ↓
PromptOverrides.harness / PromptOverrides.harnessOptions
    ↓
Prompt-level overrides  (lowest priority)
```

Resolution uses null-coalescing: first defined value wins. The model/provider cascade is specified separately in §7.8.

## **7.8 Model & Provider Specification**

The model identifies the **LLM host** and model — never the harness. Two formats:

| Format | Example | Meaning |
|--------|---------|---------|
| Plain model id | `claude-sonnet-4-20250514` | Resolved against `defaultModelProvider` |
| Provider-qualified | `anthropic/claude-opus-4-20250514` | Explicit LLM host |

```ts
/** LLM host. Open set; the available values depend on the active harness's model registry. */
export type ModelProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'zai'
  | (string & {});
```

```ts
// Example model strings
'anthropic/claude-sonnet-4-20250514'
'openai/gpt-4o'
'google/gemini-2.5-pro'
'zai/glm-4.6'
```

```ts
export interface ModelSpec {
  provider: ModelProviderId;   // LLM host - NOT the harness
  model: string;
  raw: string;                 // original specification string
}

export function parseModelSpec(model: string, defaultProvider?: ModelProviderId): ModelSpec;
export function formatModelForProvider(spec: ModelSpec, targetProvider: ModelProviderId): string;
```

> **Critical rule.** The harness is never part of the model string. Strings such as `pi/anthropic/claude-sonnet-4` or `cc/anthropic/...` are **invalid**. Harness and provider are independent axes chosen separately.
>
> **`claude-code` constraint.** The Claude Code SDK can only run `anthropic/*` models. Requesting a non-Anthropic provider on `claude-code` is a configuration error surfaced at `initialize()`/`execute()`.

## **7.9 AgentConfig Extensions**

```ts
export interface AgentConfig {
  // ... existing fields ...

  /** Harness to use (inherits from global; default 'pi'). */
  harness?: HarnessId;

  /** Harness-specific options. */
  harnessOptions?: HarnessOptions;

  /** Model specification ("provider/model" or plain; never harness-qualified). */
  model?: string;
}
```

## **7.10 Tool Execution**

Tools are executed locally via `MCPHandler` regardless of harness. The harness delegates tool calls back to Groundswell:

```ts
export interface ToolExecutionRequest {
  name: string;     // tool name (may be namespaced: "server__tool")
  input: unknown;   // tool input parameters
}

export interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}
```

**`pi` adapter specifics.** Groundswell passes its tool list into `createAgentSession({ tools })` (or the harness's tool-registration path). When Pi emits a `tool_call`, the adapter invokes `toolExecutor` and returns the `ToolExecutionResult`. No Pi MCP plugin is required — Pi treats Groundswell's tools as ordinary registered tools.

## **7.11 Hook Adaptation**

Groundswell hooks are adapted to harness-specific events:

```ts
export interface HarnessHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}
```

Mapping from `AgentHooks`:

| AgentHooks | HarnessHookEvents | `pi` source event | `claude-code` source event |
|------------|-------------------|-------------------|----------------------------|
| `preToolUse` | `onToolStart` | `tool_execution_start` | `preToolUse` |
| `postToolUse` | `onToolEnd` | `tool_execution_end` | `postToolUse` |
| `sessionStart` | `onSessionStart` | `session_start` | `sessionStart` |
| `sessionEnd` | `onSessionEnd` | `session_shutdown` | `sessionEnd` |
| *(streaming)* | `onStream` | `message_update` | message stream |

## **7.12 MCP, Skills & LSP Integration**

Capability parity is achieved through Groundswell's shared infrastructure, not through harness-specific features:

* **MCP & LSP** — provided by Groundswell's `MCPHandler` (and MCP plugins for LSP diagnostics), **not** by the harness. Both harnesses receive the same tool list and delegate calls back. claude-code's built-in MCP is bypassed in favor of `MCPHandler` so behavior is identical across harnesses; Pi needs no plugin.
* **Skills** — Pi implements the [agentskills.io](https://agentskills.io) standard natively and loads Claude Code skill directories directly (e.g. `~/.claude/skills`), so skills are cross-harness with no adapter work. claude-code injects skills via system prompt.

```ts
export interface LSPConfig {
  enabled: boolean;
  languages?: string[];  // restrict to specific languages
}
```

## **7.13 Harness Usage Examples**

**Default (Pi):**

```ts
const agent = new Agent({
  name: 'Analyzer',
  harness: 'pi',                                  // default; may be omitted
  model: 'anthropic/claude-sonnet-4-20250514',    // provider/model - no harness prefix
});
```

**Switch harness for one call (e.g., a user inside Anthropic's walled garden):**

```ts
const response = await agent.prompt(myPrompt, {
  harness: 'claude-code',
});
```

**Override model only (harness unchanged):**

```ts
const response = await agent.prompt(myPrompt, {
  model: 'openai/gpt-4o',   // runs on whichever harness is active
});
```

## **7.14 Feature Parity Requirements**

All features MUST work identically across `pi` and `claude-code`:

1. **MCP Tools**: Register, discover, and execute MCP tools
2. **Skills**: Load and invoke skills
3. **Hooks**: All hook types fire with consistent context and ordering
4. **AgentResponse**: Identical response format regardless of harness
5. **Caching**: Cache keys incorporate **both** the harness and the provider/model for isolation
6. **Workflow Integration**: Events emit correctly in workflow context

**Adapter non-functional requirements:**

* Identical `AgentResponse<T>` shape from both harnesses.
* Identical tool-execution semantics (`ToolExecutionRequest` / `ToolExecutionResult`).
* Deterministic hook ordering.
* Unsupported features are advertised via `HarnessCapabilities` rather than silently degrading.

---

# **8. Snapshot System**

## **8.1 State Snapshot**

```ts
export type SerializedWorkflowState = Record<string, unknown>;
```

## **8.2 ObservedState Metadata**

```ts
export interface StateFieldMetadata {
  hidden?: boolean;   // not shown in debugger
  redact?: boolean;   // shown as "***"
}
```

---

# **9. Observers**

## **9.1 WorkflowObserver**

```ts
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}
```

Observers attach to the **root workflow** and receive all events.

---

# **10. Decorators (Complete Technical Specification)**

## **10.1 @Step() Decorator**

```ts
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean; // Default: true - Track and emit step duration
  logStart?: boolean;
  logFinish?: boolean;
}

export function Step(options: StepOptions = {}): MethodDecorator;
```

**Responsibilities:**

* Emit `stepStart` + `stepEnd`.
* Optionally snapshot state.
* Catch and wrap errors into `WorkflowError`.

---

## **10.2 @Task() Decorator**

```ts
export interface TaskOptions {
  name?: string;
  concurrent?: boolean;
}

export function Task(options: TaskOptions = {}): MethodDecorator;
```

**Responsibilities:**

* Emit `taskStart` + `taskEnd`
* Attach returned workflow(s) as children.
* Enforce concurrency rules.

---

## **10.3 @ObservedState Decorator**

```ts
export function ObservedState(meta: StateFieldMetadata = {}): PropertyDecorator;
```

Fields marked with this decorator are included in snapshots.

---

# **11. Restart Semantics**

* Descendant workflows never request restart upward.
* A parent step decides whether restart is needed by analyzing:

  * all captured `WorkflowError`s
  * descendant state snapshots
  * logs from failing nodes
* Parent step may:

  1. Retry the step
  2. Abort the workflow
  3. Rebuild the plan and continue

Restartability is **opt-in** at the step method level; not global.

---

# **12. Optional Multi-Error Merging**

```ts
export interface ErrorMergeStrategy {
  enabled: boolean;
  maxMergeDepth?: number;
  combine?(errors: WorkflowError[]): WorkflowError;
}
```

Default: **disabled** → first error wins (race is preserved).

---

# **13. Tree Debugger API**

## **13.1 Tree Debugger Interface**

```ts
export interface WorkflowTreeDebugger {
  getTree(): WorkflowNode;
  getNode(id: string): WorkflowNode | undefined;

  events: Observable<WorkflowEvent>;

  toTreeString(node?: WorkflowNode): string;
  toLogString(node?: WorkflowNode): string;
}
```

This is consumed by the terminal UI.

---

# **14. Base Classes (Class Skeletons)**

Below are implementation-ready class skeletons with exact method signatures.

---

# **14.1 WorkflowLogger Skeleton**

```ts
export class WorkflowLogger {
  constructor(private readonly node: WorkflowNode,
              private readonly observers: WorkflowObserver[]) {}

  private emit(entry: LogEntry) {
    this.node.logs.push(entry);
    for (const obs of this.observers) obs.onLog(entry);
  }

  debug(message: string, data?: unknown) { /* ... */ }
  info(message: string, data?: unknown) { /* ... */ }
  warn(message: string, data?: unknown) { /* ... */ }
  error(message: string, data?: unknown) { /* ... */ }

  child(meta: Partial<LogEntry>): WorkflowLogger {
    return new WorkflowLogger(this.node, this.observers);
  }
}
```

---

# **14.2 Workflow Base Class Skeleton**

```ts
export abstract class Workflow {
  public readonly id: string;
  public parent: Workflow | null = null;
  public children: Workflow[] = [];
  public status: WorkflowStatus = 'idle';

  protected readonly logger: WorkflowLogger;
  protected readonly node: WorkflowNode;

  constructor(name?: string, parent?: Workflow) {
    this.id = generateId();
    this.parent = parent || null;

    this.node = {
      id: this.id,
      name: name ?? this.constructor.name,
      parent: parent?.node ?? null,
      children: [],
      logs: [],
      events: [],
      status: 'idle',
      stateSnapshot: null,
    };

    this.logger = new WorkflowLogger(this.node, this.getRootObservers());
    if (parent) parent.attachChild(this);
  }

  private getRootObservers(): WorkflowObserver[] {
    return this.parent ? this.parent.getRootObservers() : []; 
  }

  attachChild(child: Workflow) {
    this.children.push(child);
    this.node.children.push(child.node);
    this.emitEvent({ type: 'childAttached', parentId: this.id, child: child.node });
  }

  protected emitEvent(event: WorkflowEvent) {
    this.node.events.push(event);
    for (const obs of this.getRootObservers()) {
      obs.onEvent(event);
      if (event.type === 'treeUpdated') obs.onTreeChanged(this.node);
    }
  }

  snapshotState() {
    const snapshot = createStateSnapshot(this);
    this.node.stateSnapshot = snapshot;
    for (const obs of this.getRootObservers()) obs.onStateUpdated(this.node);
  }

  abstract run(...args: any[]): Promise<any>;
}
```

---

# **14.3 Decorator Skeletons**

These are implementation-level scaffolds.

### **@ObservedState**

```ts
const OBSERVED_STATE_FIELDS = new WeakMap<object, Map<string, StateFieldMetadata>>();

export function ObservedState(meta: StateFieldMetadata = {}): PropertyDecorator {
  return (target, propertyKey) => {
    let map = OBSERVED_STATE_FIELDS.get(target);
    if (!map) {
      map = new Map();
      OBSERVED_STATE_FIELDS.set(target, map);
    }
    map.set(propertyKey.toString(), meta);
  };
}

export function getObservedState(obj: any): SerializedWorkflowState {
  const map = OBSERVED_STATE_FIELDS.get(Object.getPrototypeOf(obj));
  if (!map) return {};
  const result: SerializedWorkflowState = {};
  for (const [key, meta] of map) {
    let v = (obj as any)[key];
    if (meta.redact) v = '***';
    if (!meta.hidden) result[key] = v;
  }
  return result;
}
```

---

### **@Step**

```ts
export function Step(opts: StepOptions = {}): MethodDecorator {
  return (target, prop, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const wf = this as Workflow;
      const stepName = opts.name ?? String(prop);

      if (opts.logStart) wf.logger.info(`STEP START: ${stepName}`);

      wf.emitEvent({ type: 'stepStart', node: wf.node, step: stepName });

      let start = Date.now();
      try {
        const result = await original.apply(this, args);

        if (opts.snapshotState) wf.snapshotState();
        if (opts.trackTiming) {
          const duration = Date.now() - start;
          wf.emitEvent({ type: 'stepEnd', node: wf.node, step: stepName, duration });
        }

        if (opts.logFinish) wf.logger.info(`STEP END: ${stepName}`);
        return result;

      } catch (err: any) {
        const snap = getObservedState(wf);
        const wfError: WorkflowError = {
          message: err?.message ?? 'error',
          original: err,
          workflowId: wf.id,
          stack: err?.stack,
          state: snap,
          logs: [...wf.node.logs],
        };

        wf.emitEvent({ type: 'error', node: wf.node, error: wfError });

        throw wfError;
      }
    };
  };
}
```

---

### **@Task**

```ts
export function Task(opts: TaskOptions = {}): MethodDecorator {
  return (target, prop, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const wf = this as Workflow;
      const taskName = opts.name ?? String(prop);

      wf.emitEvent({ type: 'taskStart', node: wf.node, task: taskName });

      const result = await original.apply(this, args);

      // must return Workflow or Workflow[]
      const workflows = Array.isArray(result) ? result : [result];
      for (const child of workflows) {
        if (!(child instanceof Workflow)) {
          throw new Error(`@Task method "${taskName}" did not return a Workflow.`);
        }
        child.parent = wf;
        wf.attachChild(child);
      }

      wf.emitEvent({ type: 'taskEnd', node: wf.node, task: taskName });

      return result;
    };
  };
}
```

---

# **15. Example Workflow Using the System**

```ts
class TestCycleWorkflow extends Workflow {
  @ObservedState() currentTest!: string;

  @Step({ snapshotState: true })
  async generateTest() { /* ... */ }

  @Step()
  async runTest() { /* ... may throw ... */ }

  @Step()
  async updateImplementation() { /* ... */ }
}

class TDDOrchestrator extends Workflow {
  @Step({ logStart: true })
  async setupEnvironment() { /* ... */ }

  @Task()
  async runCycle() {
    return new TestCycleWorkflow('Cycle', this);
  }

  async run() {
    try {
      await this.setupEnvironment();
      await this.runCycle();
    } catch (err) {
      /* analyze & restart logic here */
    }
  }
}
```

---

# **16. Acceptance Criteria (Updated)**

This PRD now includes:

* explicit interfaces
* complete decorators
* class skeletons
* logger skeleton
* observer system
* real-time debugger interface
* error/restart models
* snapshot system
* **agent response model (all responses MUST be JSON)**
* **Pluggable agent harness system (Pi default, Claude Code optional) — harness ⊥ provider/model, with cascading configuration**

A senior engineer should be able to implement the full engine from this PRD.

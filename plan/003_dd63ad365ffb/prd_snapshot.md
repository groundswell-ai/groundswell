# **📘 PRODUCT REQUIREMENTS DOCUMENT (PRD)**

### **Hierarchical Workflow Engine with Full Observability & Tree Debugging**

Version: **1.1**
Status: **Implementation-ready**

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
✔️ Multi-provider Agent SDK support (Anthropic + OpenCode)

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

# **7. Agent SDK Provider System**

Groundswell supports multiple Agent SDK providers with full feature parity. Users select a provider once at the top level; all workflows, agents, and prompts inherit that setting unless explicitly overridden.

## **7.1 Supported Providers**

| Provider | SDK | Package | Description |
|----------|-----|---------|-------------|
| `anthropic` | Anthropic Agent SDK | `@anthropic-ai/claude-agent-sdk` | Claude models via Anthropic's official Agent SDK |
| `opencode` | OpenCode SDK | `@opencode-ai/sdk` | Multi-provider support (Anthropic, OpenAI, Ollama, 75+ providers) |

## **7.2 ProviderId**

```ts
export type ProviderId = 'anthropic' | 'opencode';
```

## **7.3 Provider Interface**

All providers implement this interface:

```ts
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T>(
    request: ProviderRequest,
    toolExecutor: (req: ToolExecutionRequest) => Promise<ToolExecutionResult>,
    hooks?: ProviderHookEvents
  ): Promise<ProviderResult<T>>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

## **7.4 ProviderCapabilities**

```ts
export interface ProviderCapabilities {
  mcp: boolean;              // MCP server connections
  skills: boolean;           // Skill loading
  lsp: boolean;              // Language Server Protocol integration
  streaming: boolean;        // Streaming responses
  sessions: boolean;         // Session-based state
  extendedThinking: boolean; // Extended thinking/reasoning
}
```

| Capability | Anthropic SDK | OpenCode SDK |
|------------|--------------|--------------|
| MCP | ✓ (via MCPHandler) | ✓ (native) |
| Skills | ✓ (system prompt) | ✓ (native `/skills`) |
| LSP | ✓ (MCP plugins) | ✓ (explicit `lsp` tool) |
| Streaming | ✓ (message) | ✓ (SSE) |
| Sessions | ✗ (stateless) | ✓ |
| Extended Thinking | ✗ | ✓ |

## **7.5 ProviderOptions**

```ts
export interface ProviderOptions {
  endpoint?: string;                  // API endpoint override
  apiKey?: string;                    // API key (if not from environment)
  sessionId?: string;                 // Session ID for session-based providers
  timeout?: number;                   // Timeout in milliseconds
  headers?: Record<string, string>;   // Custom headers
}
```

## **7.6 Global Provider Configuration**

```ts
export interface GlobalProviderConfig {
  defaultProvider: ProviderId;
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}

export function configureProviders(config: GlobalProviderConfig): void;
```

**Example:**

```ts
import { configureProviders } from 'groundswell';

// Set once at application startup - cascades to all agents
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    opencode: { endpoint: 'http://localhost:8080' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

## **7.7 Configuration Cascade**

Provider configuration cascades through the hierarchy:

```
GlobalProviderConfig (highest priority for defaults)
    ↓
AgentConfig.provider / AgentConfig.providerOptions
    ↓
PromptOverrides.provider / PromptOverrides.providerOptions
    ↓
Prompt-level overrides (lowest priority)
```

Resolution uses null-coalescing: first defined value wins.

## **7.8 Model Specification**

Model strings support two formats:

| Format | Example | Usage |
|--------|---------|-------|
| Plain name | `claude-sonnet-4-20250514` | Uses current provider |
| Provider-qualified | `anthropic/claude-opus-4-20250514` | Explicit provider |

**OpenCode provider/model format:**

```ts
// OpenCode supports 75+ providers
'anthropic/claude-sonnet-4-20250514'
'openai/gpt-4'
'ollama/llama3'
'google/gemini-pro'
```

```ts
export interface ModelSpec {
  provider: ProviderId;
  model: string;
  raw: string;  // Original specification string
}

export function parseModelSpec(model: string, defaultProvider?: ProviderId): ModelSpec;
export function formatModelForProvider(spec: ModelSpec, targetProvider: ProviderId): string;
```

## **7.9 AgentConfig Extensions**

```ts
export interface AgentConfig {
  // ... existing fields ...

  /** Provider to use (inherits from global if not specified) */
  provider?: ProviderId;

  /** Provider-specific options */
  providerOptions?: ProviderOptions;

  /** Model specification (supports "provider/model" format) */
  model?: string;
}
```

## **7.10 Tool Execution**

Tools are executed locally via MCPHandler regardless of provider. The provider delegates tool calls back to the agent:

```ts
export interface ToolExecutionRequest {
  name: string;     // Tool name (may be namespaced: "server__tool")
  input: unknown;   // Tool input parameters
}

export interface ToolExecutionResult {
  content: string | unknown;
  isError: boolean;
}
```

## **7.11 Hook Adaptation**

Groundswell hooks are adapted to provider-specific events:

```ts
export interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (tool: ToolExecutionRequest, result: ToolExecutionResult, duration: number) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}
```

Mapping from `AgentHooks`:

| AgentHooks | ProviderHookEvents |
|------------|-------------------|
| `preToolUse` | `onToolStart` |
| `postToolUse` | `onToolEnd` |
| `sessionStart` | `onSessionStart` |
| `sessionEnd` | `onSessionEnd` |

## **7.12 LSP Integration**

Both providers support Language Server Protocol for code intelligence:

**Anthropic SDK:** LSP via MCP plugins (automatic diagnostics after edits)

**OpenCode SDK:** Explicit `lsp` tool with actions:
- `definition` - Go to definition
- `references` - Find references
- `hover` - Hover information
- `completion` - Code completion
- `diagnostics` - Get diagnostics

```ts
export interface LSPConfig {
  enabled: boolean;
  languages?: string[];  // Restrict to specific languages
}
```

## **7.13 Provider Usage Examples**

**Default (Anthropic):**

```ts
const agent = new Agent({
  name: 'Analyzer',
  model: 'claude-sonnet-4-20250514',
});
```

**OpenCode with multi-provider:**

```ts
const agent = new Agent({
  name: 'Analyzer',
  provider: 'opencode',
  model: 'openai/gpt-4',
  providerOptions: {
    endpoint: 'http://localhost:8080',
  },
});
```

**Override at prompt level:**

```ts
const response = await agent.prompt(myPrompt, {
  model: 'anthropic/claude-opus-4-20250514',  // Override for this call
});
```

## **7.14 Feature Parity Requirements**

All features MUST work identically across providers:

1. **MCP Tools**: Register, discover, and execute MCP tools
2. **Skills**: Load and invoke skills
3. **Hooks**: All hook types fire with consistent context
4. **AgentResponse**: Same response format regardless of provider
5. **Caching**: Cache keys incorporate provider for isolation
6. **Workflow Integration**: Events emit correctly in workflow context

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
* **multi-provider Agent SDK support with cascading configuration**

A senior engineer should be able to implement the full engine from this PRD.

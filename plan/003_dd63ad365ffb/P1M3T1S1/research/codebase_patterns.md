# Codebase Pattern Research: Singleton and Registry Patterns

## Summary of Findings

### 1. Singleton Pattern Implementations in Codebase

**No traditional singleton classes exist** - The codebase primarily uses module-level singletons rather than class-based singleton patterns.

#### Module-Level Singleton (Primary Pattern)

**File:** `/home/dustin/projects/groundswell/src/utils/provider-config.ts`

```typescript
// Line 81: Module-private variable (not exported)
let globalConfig: GlobalProviderConfig | null = null;

// Line 236: Default singleton instance (in cache.ts)
export const defaultCache = new LLMCache();
```

**Key Characteristics:**
- Uses ES module scoping to create a true singleton
- `let` for mutable state (config can be updated)
- Module-private variable prevents external modification
- Accessed through exported functions

### 2. Registry Pattern Implementations

#### MCP Handler Registry (Primary Reference)

**File:** `/home/dustin/projects/groundswell/src/core/mcp-handler.ts`

```typescript
// Lines 40-46: Registry storage
private servers: Map<string, MCPServer> = new Map();
private registeredTools: Map<string, RegisteredTool> = new Map();
private toolExecutors: Map<string, ToolExecutor> = new Map();

// Lines 52-70: Register method
public registerServer(server: MCPServer): void {
  if (this.servers.has(server.name)) {
    throw new Error(`MCP server '${server.name}' is already registered`);
  }
  this.servers.set(server.name, server);
}

// Lines 106-108: Get all items
public getTools(): Tool[] {
  return Array.from(this.registeredTools.values()).map((rt) => rt.tool);
}

// Lines 152-154: Check existence
public hasTool(toolName: string): boolean {
  return this.registeredTools.has(toolName);
}
```

**Key Patterns to Follow:**
1. **Map-based storage**: Uses `Map<key, value>` for O(1) lookups
2. **Duplicate detection**: Throws error on duplicate registration
3. **has() method**: Boolean check for existence
4. **get() method**: Returns `undefined` if not found (not throwing)
5. **getAll() method**: Returns array of all registered items

### 3. Service Class Patterns

#### Reflection Manager

**File:** `/home/dustin/projects/groundswell/src/reflection/reflection.ts`

```typescript
// Lines 67-81: Class definition with private state
export class ReflectionManager implements ReflectionAPI {
  private readonly config: ReflectionConfig;
  private readonly history: ReflectionEntry[] = [];
  private readonly agent?: Agent;
  private eventEmitter?: (event: WorkflowEvent) => void;

  // Lines 78-81: Constructor
  constructor(config: ReflectionConfig, agent?: Agent) {
    this.config = config;
    this.agent = agent;
  }
}
```

#### Agent Class

**File:** `/home/dustin/projects/groundswell/src/core/agent.ts`

```typescript
// Lines 68-96: Class definition
export class Agent {
  public readonly id: string;
  public readonly name: string;
  private readonly config: AgentConfig;
  private readonly mcpHandler: MCPHandler;

  // Lines 91-96: Constructor
  constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.mcpHandler = new MCPHandler();
  }
}
```

### 4. Factory Pattern

**File:** `/home/dustin/projects/groundswell/src/core/factory.ts`

```typescript
// Lines 35-40: Create workflow
export function createWorkflow<T>(
  config: WorkflowConfig,
  executor: WorkflowExecutor<T>
): Workflow<T> {
  return new Workflow(config, executor);
}

// Lines 60-62: Create agent
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
```

## Key Insights for ProviderRegistry Implementation

1. **This will be the FIRST traditional singleton class** in the codebase
2. **Follow MCPHandler pattern** for Map-based registry operations
3. **Use class-based singleton** (not module-level) because:
   - Requires private constructor
   - Needs getInstance() method
   - Must manage instance lifecycle
4. **Error handling**: Follow MCPHandler's pattern of throwing on duplicate registration

## File Locations Reference

| Pattern | File | Lines |
|---------|------|-------|
| Module-level singleton | `src/utils/provider-config.ts` | 77, 236 |
| Registry pattern | `src/core/mcp-handler.ts` | 40-154 |
| Service class | `src/reflection/reflection.ts` | 67-81 |
| Service class | `src/core/agent.ts` | 68-96 |
| Factory pattern | `src/core/factory.ts` | 35-86 |

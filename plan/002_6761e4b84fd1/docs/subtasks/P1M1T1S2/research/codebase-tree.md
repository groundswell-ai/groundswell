# Codebase Tree Structure

**Generated:** 2026-01-24
**Project:** groundswell v0.0.4
**Location:** `/home/dustin/projects/groundswell`

## Full Project Tree Structure

```
groundswell/
├── dist/                          # Compiled JavaScript output
│   ├── cache/                     # Cache module builds
│   ├── core/                      # Core module builds
│   ├── debugger/                  # Debugger module builds
│   ├── decorators/                # Decorators module builds
│   ├── examples/                  # Examples module builds
│   ├── reflection/                # Reflection module builds
│   ├── tools/                     # Tools module builds
│   ├── types/                     # Type definitions builds
│   ├── utils/                     # Utilities module builds
│   └── __tests__/                 # Test file builds
│
├── docs/                          # Documentation
│   ├── agent.md                   # Agent documentation
│   ├── prompt.md                  # Prompt documentation
│   └── workflow.md                # Workflow documentation
│
├── examples/                      # Example usage code
│   ├── examples/
│   │   ├── 01-basic-workflow.ts
│   │   ├── 02-decorator-options.ts
│   │   ├── 03-parent-child.ts
│   │   ├── 04-observers-debugger.ts
│   │   ├── 05-error-handling.ts
│   │   ├── 06-concurrent-tasks.ts
│   │   ├── 07-agent-loops.ts
│   │   ├── 08-sdk-features.ts
│   │   ├── 09-reflection.ts
│   │   ├── 10-introspection.ts
│   │   └── 11-reparenting-workflows.ts
│   ├── index.ts
│   ├── README.md
│   └── utils/
│       └── helpers.ts
│
├── plan/                          # Project planning and research
│   ├── 001_d3bb02af4886/         # Previous iteration plan
│   └── 002_6761e4b84fd1/         # Current iteration plan
│
├── PRPs/                          # Project Requirements & Proposals
│   ├── PRDs/                      # Product Requirement Documents
│   └── templates/                 # PRP templates
│
├── scripts/                       # Build and utility scripts
│   └── generate-llms-full.ts
│
├── src/                           # Source code (see detailed section below)
│
├── CHANGELOG.md                   # Version history
├── package.json                   # NPM package configuration
├── package-lock.json              # Dependency lock file
├── PRD.md                         # Product Requirements Document
├── README.md                      # Project overview
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.tsbuildinfo          # TypeScript incremental build cache
└── vitest.config.ts              # Vitest test configuration
```

## Detailed Source Code Structure

### `/src` Directory Tree

```
src/
├── cache/                         # Caching layer implementation
│   ├── cache-key.ts              # Cache key generation logic
│   ├── cache.ts                  # LRU cache implementation
│   └── index.ts                  # Cache module exports
│
├── core/                          # Core functionality
│   ├── agent.ts                  # ⭐ Agent class with prompt() method
│   ├── context.ts                # Execution context management
│   ├── event-tree.ts             # Event tree for observability
│   ├── factory.ts                # Factory for creating workflows
│   ├── index.ts                  # Core module exports
│   ├── logger.ts                 # Logging functionality
│   ├── mcp-handler.ts            # MCP (Model Context Protocol) handler
│   ├── prompt.ts                 # Prompt class definition
│   ├── workflow-context.ts       # Workflow execution context
│   └── workflow.ts               # Workflow base class
│
├── debugger/                      # Debugging tools
│   ├── index.ts                  # Debugger module exports
│   └── tree-debugger.ts          # Tree visualization debugger
│
├── decorators/                    # TypeScript decorators
│   ├── index.ts                  # Decorator module exports
│   ├── observed-state.ts         # @Observed state decorator
│   ├── step.ts                   # @Step decorator
│   └── task.ts                   # @Task decorator
│
├── examples/                      # Example workflows in source
│   ├── index.ts                  # Examples module exports
│   ├── tdd-orchestrator.ts       # TDD orchestration example
│   └── test-cycle-workflow.ts    # Test cycle workflow example
│
├── reflection/                    # Reflection capabilities
│   ├── index.ts                  # Reflection module exports
│   └── reflection.ts             # Reflection implementation
│
├── tools/                         # Tool utilities
│   ├── index.ts                  # Tools module exports
│   └── introspection.ts          # Introspection tools
│
├── types/                         # TypeScript type definitions
│   ├── agent.ts                  # ⭐ AgentConfig, PromptOverrides types
│   ├── decorators.ts             # Decorator option types
│   ├── error-strategy.ts         # Error merge strategy types
│   ├── error.ts                  # Error types
│   ├── events.ts                 # Event types
│   ├── index.ts                  # ⭐ Central type exports
│   ├── logging.ts                # Logging types
│   ├── observer.ts               # Observer types
│   ├── prompt.ts                 # Prompt configuration types
│   ├── reflection.ts             # Reflection types
│   ├── sdk-primitives.ts         # SDK primitive types
│   ├── snapshot.ts               # State snapshot types
│   ├── workflow-context.ts       # Workflow context types
│   └── workflow.ts               # Workflow types
│
├── utils/                         # Utility functions
│   ├── id.ts                     # ID generation utilities
│   ├── index.ts                  # Utils module exports
│   ├── observable.ts             # Observable utilities
│   └── workflow-error-utils.ts   # Workflow error utilities
│
├── __tests__/                     # Test suites
│   ├── adversarial/              # Stress and edge case tests
│   │   ├── attachChild-performance.test.ts
│   │   ├── circular-reference.test.ts
│   │   ├── complex-circular-reference.test.ts
│   │   ├── concurrent-task-failures.test.ts
│   │   ├── deep-analysis.test.ts
│   │   ├── deep-hierarchy-stress.test.ts
│   │   ├── e2e-prd-validation.test.ts
│   │   ├── edge-case.test.ts
│   │   ├── error-merge-strategy.test.ts
│   │   ├── incremental-performance.test.ts
│   │   ├── node-map-update-benchmarks.test.ts
│   │   ├── observer-propagation.test.ts
│   │   ├── parent-validation.test.ts
│   │   ├── prd-12-2-compliance.test.ts
│   │   └── prd-compliance.test.ts
│   │
│   ├── compatibility/            # Backward compatibility tests
│   │   └── backward-compatibility.test.ts
│   │
│   ├── helpers/                  # Test helper utilities
│   │   ├── index.ts
│   │   └── tree-verification.ts
│   │
│   ├── integration/              # Integration tests
│   │   ├── agent-workflow.test.ts
│   │   ├── bidirectional-consistency.test.ts
│   │   ├── observer-logging.test.ts
│   │   ├── tree-mirroring.test.ts
│   │   └── workflow-reparenting.test.ts
│   │
│   └── unit/                     # Unit tests
│       ├── agent.test.ts
│       ├── cache-key.test.ts
│       ├── cache.test.ts
│       ├── context.test.ts
│       ├── decorators.test.ts
│       ├── introspection-tools.test.ts
│       ├── logger.test.ts
│       ├── observable.test.ts
│       ├── prompt.test.ts
│       ├── reflection.test.ts
│       ├── tree-debugger-incremental.test.ts
│       ├── tree-debugger.test.ts
│       ├── utils/
│       │   └── workflow-error-utils.test.ts
│       ├── workflow-detachChild.test.ts
│       ├── workflow-emitEvent-childDetached.test.ts
│       ├── workflow-isDescendantOf.test.ts
│       └── workflow.test.ts
│
└── index.ts                      # Main package entry point
```

## Key Files Highlight

### ⭐ `src/core/agent.ts`

**Purpose:** Agent class that wraps Anthropic's SDK

**Key Features:**
- `prompt<T>()` method - Main entry point for executing prompts
- `promptWithMetadata<T>()` - Returns full result with metadata
- `reflect<T>()` - Executes prompts with reflection capabilities
- Tool invocation management via MCP handlers
- Caching support with configurable LRU cache
- Lifecycle hooks (sessionStart, sessionEnd, preToolUse, postToolUse)
- Environment variable management
- Workflow event emission integration

**Important Methods:**
```typescript
public async prompt<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<T>

public async promptWithMetadata<T>(
  prompt: Prompt<T>,
  overrides?: PromptOverrides
): Promise<PromptResult<T>>
```

### ⭐ `src/types/agent.ts`

**Purpose:** Agent-related type definitions

**Current Exports:**
- `AgentConfig` - Configuration for creating Agent instances
- `PromptOverrides` - Per-prompt override options

**Note:** This is where `AgentResponse` type will be added

**AgentConfig Properties:**
```typescript
interface AgentConfig {
  name?: string;
  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;
  env?: Record<string, string>;
  enableReflection?: boolean;
  enableCache?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
```

**PromptOverrides Properties:**
```typescript
interface PromptOverrides {
  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;
  env?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  disableCache?: boolean;
  enableReflection?: boolean;
  model?: string;
}
```

### ⭐ `src/types/index.ts`

**Purpose:** Central type export hub

**Current Export Categories:**
1. **Core types:** WorkflowStatus, WorkflowNode, LogLevel, LogEntry, etc.
2. **SDK primitives:** Tool, MCPServer, Skill, AgentHooks, TokenUsage, etc.
3. **Agent types:** AgentConfig, PromptOverrides
4. **Prompt types:** PromptConfig
5. **WorkflowContext types:** WorkflowContext, WorkflowConfig, etc.
6. **Reflection types:** ReflectionAPI, ReflectionConfig, etc.

**Note:** This is where `AgentResponse` will be exported after being defined in `agent.ts`

### `src/utils/` - Existing Utilities

**Current Utility Files:**
1. **id.ts** - Unique ID generation
2. **observable.ts** - Observable pattern utilities
3. **workflow-error-utils.ts** - Workflow error handling utilities
4. **index.ts** - Utility module exports

### `src/__tests__/` - Test Structure

**Test Organization:**
- **adversarial/** - Stress tests, performance tests, edge cases (15 files)
- **compatibility/** - Backward compatibility tests (1 file)
- **helpers/** - Test utilities (2 files)
- **integration/** - Integration tests (5 files)
- **unit/** - Unit tests (20+ files including subdirectories)

**Test for Agent:** `src/__tests__/unit/agent.test.ts`

## Package Configuration

### `package.json` - Scripts for Testing

**Available Test Scripts:**
```json
{
  "test": "vitest run",           // Run tests once
  "test:watch": "vitest",         // Run tests in watch mode
  "lint": "tsc --noEmit",         // Type checking without compilation
  "build": "tsc"                  // Compile TypeScript
}
```

**Example Run Scripts:**
```json
{
  "start:all": "tsx examples/index.ts",
  "start:basic": "tsx examples/examples/01-basic-workflow.ts",
  "start:agent-loops": "tsx examples/examples/07-agent-loops.ts"
}
```

### `tsconfig.json` - TypeScript Configuration

**Relevant Settings for This Work:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "useDefineForClassFields": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/__tests__"]
}
```

**Key Points:**
- `strict: true` - All strict type-checking options enabled
- `declaration: true` - Generates .d.ts type definition files
- `exclude: ["src/__tests__"]` - Test files are not compiled
- `isolatedModules: true` - Each file must be transpilable independently

### `vitest.config.ts` - Test Configuration

**Settings:**
```typescript
{
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true
  },
  esbuild: {
    target: 'node18'
  }
}
```

## Build Output Structure

The `dist/` directory mirrors `src/` structure:
- Compiled `.js` files
- Declaration `.d.ts` files
- Source maps `.js.map` and `.d.ts.map` files

## Dependencies

### Production Dependencies
- `@anthropic-ai/sdk: ^0.71.1` - Anthropic Claude SDK
- `lru-cache: ^10.4.3` - LRU cache implementation
- `zod: ^3.23.0` - Schema validation

### Development Dependencies
- `@types/node: ^20.0.0` - Node.js type definitions
- `tsx: ^4.21.0` - TypeScript execution
- `typescript: ^5.2.0` - TypeScript compiler
- `vitest: ^1.0.0` - Testing framework

## Engine Requirements
```json
{
  "engines": {
    "node": ">=18"
  }
}
```

## Package Distribution

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"]
}
```

## Summary for AgentResponse Implementation

**Files to Modify:**
1. `/home/dustin/projects/groundswell/src/types/agent.ts` - Add `AgentResponse` type
2. `/home/dustin/projects/groundswell/src/types/index.ts` - Export `AgentResponse`

**Files to Reference:**
1. `/home/dustin/projects/groundswell/src/core/agent.ts` - Agent.prompt() method
2. `/home/dustin/projects/groundswell/src/__tests__/unit/agent.test.ts` - Existing tests

**Testing Strategy:**
- Add tests to `src/__tests__/unit/agent.test.ts`
- Follow existing test patterns in `src/__tests__/unit/`
- Use vitest with TypeScript support

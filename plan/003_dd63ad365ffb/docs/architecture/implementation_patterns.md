# Implementation Patterns & Best Practices

## Overview

This document captures the key architectural patterns and implementation conventions used in the Groundswell codebase. These patterns should be followed when implementing the multi-provider system.

---

## Type System Patterns

### Interface-First Design

All public APIs should be defined as interfaces before implementation:

```typescript
// GOOD: Define interface first
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  execute<T>(...): Promise<ProviderResult<T>>;
}

// Then implement
export class AnthropicProvider implements Provider {
  readonly id = 'anthropic';
  readonly capabilities = { ... };

  async initialize(options?: ProviderOptions): Promise<void> {
    // Implementation
  }
}
```

### Strict Typing with Generics

Use generics to preserve type information through the call chain:

```typescript
// GOOD: Generic preserves return type
async function execute<T>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor
): Promise<ProviderResult<T>> {
  const raw = await sdk.query(...);
  return raw as T;
}

// BAD: Type information lost
async function execute(request: ProviderRequest): Promise<unknown> {
  // Type information lost
}
```

### Discriminated Unions

Use discriminated unions for type-safe event handling:

```typescript
// GOOD: Discriminated union
type WorkflowEvent =
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError };

function handleEvent(event: WorkflowEvent) {
  switch (event.type) {
    case 'stepStart':
      // TypeScript knows event.step exists
      break;
    case 'error':
      // TypeScript knows event.error exists
      break;
  }
}
```

### Readonly vs Mutable

Mark interfaces as `readonly` where appropriate:

```typescript
// GOOD: Immutable configuration
export interface ProviderConfig {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;
  readonly options?: ProviderOptions;
}

// BAD: Mutable configuration (allows accidental mutation)
export interface ProviderConfig {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  options?: ProviderOptions;
}
```

---

## Decorator Patterns

### Method Decorators (Stage 3)

```typescript
export function Step(options: StepOptions = {}) {
  return function <This, Args extends unknown[], Return>(
    originalMethod: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return>
    >
  ): (this: This, ...args: Args) => Promise<Return> {
    const methodName = String(context.name);

    // CRITICAL: Use regular function (NOT arrow function)
    // Arrow functions capture 'this' incorrectly
    async function wrapper(this: This, ...args: Args): Promise<Return> {
      const wf = this as unknown as WorkflowLike;
      const startTime = Date.now();

      // Pre-execution
      wf.emitEvent({ type: 'stepStart', node: wf.node, step: methodName });

      try {
        const result = await originalMethod.call(this, ...args);

        // Post-execution
        const duration = Date.now() - startTime;
        wf.emitEvent({ type: 'stepEnd', node: wf.node, step: methodName, duration });

        return result;
      } catch (error) {
        // Error handling
        throw error;
      }
    }

    return wrapper;
  };
}
```

### Field Decorators with WeakMap

```typescript
// WeakMap keyed by prototype, mapping to field metadata
const METADATA_STORE = new WeakMap<object, Map<string, Metadata>>();

export function ObservedState(meta: Metadata = {}) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext
  ): void {
    const propertyKey = String(context.name);

    // Use addInitializer to register when class is instantiated
    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const proto = Object.getPrototypeOf(instance);

      let map = METADATA_STORE.get(proto);
      if (!map) {
        map = new Map();
        METADATA_STORE.set(proto, map);
      }

      map.set(propertyKey, meta);
    });
  };
}

// Retrieve metadata
export function getObservedState(obj: object): Record<string, unknown> {
  const proto = Object.getPrototypeOf(obj);
  const map = METADATA_STORE.get(proto);

  if (!map) return {};

  const result: Record<string, unknown> = {};
  for (const [key, meta] of map) {
    let value = (obj as Record<string, unknown>)[key];
    if (meta.redact) value = '***';
    if (!meta.hidden) result[key] = value;
  }

  return result;
}
```

### Decorator Type Assertions

When decorators need to access class properties, use type assertions:

```typescript
async function wrapper(this: This, ...args: Args): Promise<Return> {
  // Assert that 'this' has required properties
  const wf = this as unknown as WorkflowLike;

  if (!wf.emitEvent || !wf.node) {
    throw new Error('@Step decorator must be used on a Workflow class');
  }

  // Now we can safely access workflow properties
  wf.emitEvent({ type: 'stepStart', node: wf.node, step: methodName });
}
```

---

## Error Handling Patterns

### Structured Error Types

All errors should implement structured interfaces:

```typescript
export interface WorkflowError {
  message: string;
  original: unknown;
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;
  logs: LogEntry[];
}

// Throwing
throw {
  message: 'Step failed',
  original: error,
  workflowId: this.id,
  state: getObservedState(this),
  logs: [...this.node.logs]
} satisfies WorkflowError;
```

### Error Context Preservation

Always capture context at the error site:

```typescript
try {
  await originalMethod.call(this, ...args);
} catch (err: unknown) {
  // Capture state immediately
  const state = getObservedState(this);
  const logs = [...this.node.logs];

  // Create context-rich error
  const wfError: WorkflowError = {
    message: err instanceof Error ? err.message : 'Unknown error',
    original: err,
    workflowId: this.id,
    stack: err instanceof Error ? err.stack : undefined,
    state,
    logs
  };

  this.emitEvent({ type: 'error', node: this.node, error: wfError });
  throw wfError;
}
```

### AgentResponse Error Format

Agent errors must always return valid JSON:

```typescript
// GOOD: Valid JSON error response
{
  "status": "error",
  "data": null,
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Failed to compile TypeScript",
    "details": { /* ... */ },
    "recoverable": true
  },
  "metadata": {
    "agentId": "agent-abc",
    "timestamp": 1706140800000
  }
}

// BAD: Throwing raw error (breaks JSON contract)
throw new Error('Execution failed');
```

---

## Async Patterns

### Async/Await Consistency

All async functions should use `async/await` consistently:

```typescript
// GOOD: Consistent async/await
async function executeWorkflow(): Promise<void> {
  await this.setup();
  const result = await this.process();
  await this.cleanup();
}

// AVOID: Mixing promises
async function executeWorkflow(): Promise<void> {
  return this.setup()
    .then(() => this.process())
    .then(result => this.cleanup());
}
```

### Async Generator Usage

For streaming operations, use `AsyncGenerator`:

```typescript
async function* streamResults(
  query: Query
): AsyncGenerator<SDKMessage, void, unknown> {
  for await (const message of query) {
    if (message.type === 'result') {
      yield message;
    }
  }
}

// Usage
for await (const result of streamResults(query)) {
  console.log(result);
}
```

### Error Boundaries in Async Chains

Use try-catch in all async functions:

```typescript
async function executeStep(): Promise<Result> {
  try {
    return await this.doWork();
  } catch (error) {
    // Handle error
    throw this.wrapError(error);
  }
}
```

---

## Event System Patterns

### Observer Pattern

Groundswell uses a push-based observer pattern:

```typescript
export interface WorkflowObserver {
  onLog(entry: LogEntry): void;
  onEvent(event: WorkflowEvent): void;
  onStateUpdated(node: WorkflowNode): void;
  onTreeChanged(root: WorkflowNode): void;
}

// Emitter pattern
class Workflow {
  private getRootObservers(): WorkflowObserver[] {
    return this.parent ? this.parent.getRootObservers() : [];
  }

  protected emitEvent(event: WorkflowEvent) {
    this.node.events.push(event);
    for (const obs of this.getRootObservers()) {
      obs.onEvent(event);
      if (event.type === 'treeUpdated') {
        obs.onTreeChanged(this.node);
      }
    }
  }
}
```

### Event Type Safety

Use discriminated unions for events:

```typescript
type WorkflowEvent =
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError };

// TypeScript narrows type in switch
function handleEvent(event: WorkflowEvent) {
  switch (event.type) {
    case 'stepStart':
      console.log('Starting:', event.step); // Safe
      break;
    case 'error':
      console.log('Error:', event.error.message); // Safe
      break;
  }
}
```

---

## Configuration Patterns

### Configuration Cascade

Configuration cascades from global to local:

```typescript
// Resolution order (first defined value wins)
function resolveConfig<T>(
  global: T | undefined,
  agent: T | undefined,
  prompt: T | undefined,
  fallback: T
): T {
  return prompt ?? agent ?? global ?? fallback;
}

// Usage
const effectiveModel = resolveConfig(
  globalConfig.model,
  agentConfig.model,
  promptOptions.model,
  'claude-sonnet-4-20250514'
);
```

### Default Value Patterns

Use `??` (nullish coalescing) for defaults, not `||`:

```typescript
// GOOD: ?? only treats null/undefined as missing
const timeout = options.timeout ?? 30000;

// BAD: || treats 0, '', false as missing
const timeout = options.timeout || 30000; // Wrong if timeout is 0
```

### Immutable Configuration

Configuration objects should be treated as immutable:

```typescript
// GOOD: Spread for updates
const newConfig = {
  ...oldConfig,
  timeout: 5000
};

// BAD: Mutation
oldConfig.timeout = 5000; // Mutates shared config
```

---

## Testing Patterns

### Unit Test Structure

Tests follow the `describe/it/expect` pattern:

```typescript
import { describe, it, expect } from 'vitest';

describe('AnthropicProvider', () => {
  describe('initialize', () => {
    it('should initialize with API key', async () => {
      const provider = new AnthropicProvider();
      await provider.initialize({ apiKey: 'test-key' });

      expect(provider.initialized).toBe(true);
    });
  });
});
```

### Test Fixtures

Use fixtures for complex setup:

```typescript
const mockWorkflow = {
  id: 'test-workflow',
  node: {
    id: 'test-workflow',
    name: 'TestWorkflow',
    logs: [],
    events: [],
    children: [],
    parent: null,
    status: 'idle',
    stateSnapshot: null
  },
  emitEvent: vi.fn()
} satisfies Partial<Workflow>;
```

### Mock Patterns

Use `vi.fn()` for mocks:

```typescript
const mockObserver = {
  onLog: vi.fn(),
  onEvent: vi.fn(),
  onStateUpdated: vi.fn(),
  onTreeChanged: vi.fn()
};

workflow.attachObserver(mockObserver);
expect(mockObserver.onEvent).toHaveBeenCalledWith(expect.objectContaining({
  type: 'stepStart'
}));
```

---

## File Organization Patterns

### Barrel Exports (index.ts)

Use `index.ts` files for clean public APIs:

```typescript
// src/core/providers/index.ts
export { Provider } from './provider';
export { AnthropicProvider } from './anthropic/anthropic-provider';
export { OpenCodeProvider } from './opencode/opencode-provider';
export { configureProviders } from './provider-config';
export type {
  ProviderId,
  ProviderCapabilities,
  ProviderOptions,
  ProviderRequest,
  ProviderResult
} from './types';
```

### Directory Structure

```
src/core/providers/
├── index.ts                    # Public exports
├── provider.ts                 # Provider interface
├── provider-config.ts          # Global configuration
├── provider-registry.ts        # Provider registry
├── model-spec.ts              # Model specification
├── anthropic/
│   ├── index.ts
│   ├── anthropic-provider.ts
│   └── hooks-adapter.ts
└── opencode/
    ├── index.ts
    ├── opencode-provider.ts
    └── hooks-adapter.ts
```

### Import Organization

```typescript
// 1. External dependencies
import { z } from 'zod';
import { query } from '@anthropic-ai/claude-agent-sdk';

// 2. Internal dependencies (absolute)
import { Workflow } from '@/core/workflow';
import { AgentConfig } from '@/types/agent';

// 3. Relative imports
import { ProviderOptions } from './provider';
```

---

## Documentation Patterns

### JSDoc Comments

All public APIs should have JSDoc:

```typescript
/**
 * Initializes the provider with optional configuration.
 *
 * @example
 * ```ts
 * const provider = new AnthropicProvider();
 * await provider.initialize({ apiKey: 'sk-...' });
 * ```
 *
 * @param options - Optional provider configuration
 * @throws {ProviderError} If initialization fails
 * @returns Promise that resolves when initialized
 */
async initialize(options?: ProviderOptions): Promise<void>;
```

### Usage Examples

Provide executable examples:

```typescript
/**
 * @example
 * ```ts
 * import { configureProviders, Agent } from 'groundswell';
 *
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' }
 *   }
 * });
 *
 * const agent = new Agent({
 *   name: 'MyAgent',
 *   model: 'openai/gpt-4'
 * });
 * ```
 */
```

---

## Performance Patterns

### WeakMap for Metadata

Use `WeakMap` for metadata to prevent memory leaks:

```typescript
// GOOD: WeakMap allows garbage collection
const METADATA = new WeakMap<object, Metadata>();

// BAD: Map prevents garbage collection
const METADATA = new Map<object, Metadata>();
```

### LRU Cache for Expensive Operations

Use `lru-cache` for expensive results:

```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, ProviderResult>({
  max: 500,
  ttl: 1000 * 60 * 5 // 5 minutes
});

async function execute(key: string): Promise<ProviderResult> {
  const cached = cache.get(key);
  if (cached) return cached;

  const result = await doExpensiveWork(key);
  cache.set(key, result);
  return result;
}
```

### Lazy Initialization

Defer expensive initialization until first use:

```typescript
class ProviderRegistry {
  private providers: Map<ProviderId, Provider> | null = null;

  private getProviders(): Map<ProviderId, Provider> {
    if (!this.providers) {
      this.providers = this.initializeProviders();
    }
    return this.providers;
  }
}
```

---

## Summary of Key Patterns

| Pattern | Purpose | Example |
|---------|---------|---------|
| **Interface-First** | Define contracts before implementation | `Provider` interface |
| **Discriminated Unions** | Type-safe event handling | `WorkflowEvent` |
| **WeakMap Metadata** | Memory-efficient decorator storage | `@ObservedState` |
| **Regular Function Wrappers** | Preserve `this` in decorators | `@Step` wrapper |
| **Configuration Cascade** | Global → Agent → Prompt priority | Model resolution |
| **Observer Pattern** | Real-time event propagation | `WorkflowObserver` |
| **Structured Errors** | Context-rich error objects | `WorkflowError` |
| **AsyncGenerator** | Type-safe streaming | SDK message iteration |
| **LRU Cache** | Cache expensive operations | Agent response caching |
| **JSDoc** | Self-documenting code | All public APIs |

# WorkflowEvent Serialization Research

## Event Type Structure

**Location**: `src/types/events.ts`

### Complete WorkflowEvent Discriminated Union

```typescript
export type WorkflowEvent =
  // Core workflow events
  | { type: 'childAttached'; parentId: string; child: WorkflowNode }
  | { type: 'childDetached'; parentId: string; childId: string }
  | { type: 'stateSnapshot'; node: WorkflowNode }
  | { type: 'stepStart'; node: WorkflowNode; step: string }
  | { type: 'stepEnd'; node: WorkflowNode; step: string; duration: number }
  | { type: 'error'; node: WorkflowNode; error: WorkflowError }
  | { type: 'taskStart'; node: WorkflowNode; task: string }
  | { type: 'taskEnd'; node: WorkflowNode; task: string }
  | { type: 'treeUpdated'; root: WorkflowNode }
  // Agent/Prompt events
  | { type: 'agentPromptStart'; agentId: string; agentName: string; promptId: string; node: WorkflowNode }
  | { type: 'agentPromptEnd'; agentId: string; agentName: string; promptId: string; node: WorkflowNode; duration: number; tokenUsage?: TokenUsage }
  // Tool events
  | { type: 'toolInvocation'; toolName: string; input: unknown; output: unknown; duration: number; node: WorkflowNode }
  // MCP events
  | { type: 'mcpEvent'; serverName: string; event: string; payload?: unknown; node: WorkflowNode }
  // Reflection events
  | { type: 'reflectionStart'; level: 'workflow' | 'agent' | 'prompt'; node: WorkflowNode }
  | { type: 'reflectionEnd'; level: 'workflow' | 'agent' | 'prompt'; success: boolean; node: WorkflowNode }
  // Cache events
  | { type: 'cacheHit'; key: string; node: WorkflowNode }
  | { type: 'cacheMiss'; key: string; node: WorkflowNode };
```

## Circular Reference Problem

### The Issue

Many events contain `WorkflowNode` references:

```typescript
| { type: 'stateSnapshot'; node: WorkflowNode }
| { type: 'stepStart'; node: WorkflowNode; step: string }
```

**WorkflowNode structure** (from `src/types/workflow.ts`):
```typescript
export interface WorkflowNode {
  id: string;
  name: string;
  parent: WorkflowNode | null;      // ← Circular reference
  children: WorkflowNode[];          // ← Circular reference
  status: WorkflowStatus;
  logs: LogEntry[];
  events: WorkflowEvent[];           // ← Circular reference
  stateSnapshot: SerializedWorkflowState | null;
}
```

**Circular reference chain**:
```
WorkflowEvent → node (WorkflowNode) → parent (WorkflowNode) → children[] → events[] → WorkflowEvent...
```

### JSON.stringify Behavior

```typescript
JSON.stringify(eventWithCircularRef);
// TypeError: Converting circular structure to JSON
```

**Default behavior**: Throws `TypeError` on circular references.

## Serialization Strategies

### Strategy 1: Selective Field Extraction (RECOMMENDED)

Extract only the fields needed, avoid circular references:

```typescript
interface SerializableWorkflowEvent {
  type: string;
  nodeId?: string;
  // Add other primitive fields based on event type
}

function serializeEvent(event: WorkflowEvent): SerializableWorkflowEvent {
  const base = {
    type: event.type,
    timestamp: Date.now(), // Add timestamp for ordering
  };

  switch (event.type) {
    case 'childAttached':
      return {
        ...base,
        parentId: event.parentId,
        childId: event.child.id,      // Only ID, not full node
        childName: event.child.name,
      };

    case 'stateSnapshot':
      return {
        ...base,
        nodeId: event.node.id,
        nodeName: event.node.name,
        stateSnapshot: event.node.stateSnapshot, // This is already serializable
      };

    case 'error':
      return {
        ...base,
        nodeId: event.node.id,
        nodeName: event.node.name,
        error: {
          message: event.error.message,
          workflowId: event.error.workflowId,
          state: event.error.state,
          logs: event.error.logs,
        },
      };

    // ... handle all event types
  }
}
```

**Pros**:
- No circular references
- Smaller file size
- Explicit about what's preserved
- GDPR-friendly (only store needed data)

**Cons**:
- More verbose code
- Need to handle all event types
- Loses some context

### Strategy 2: Custom Replacer Function

Use JSON.stringify replacer to handle circular references:

```typescript
function safeReplacer(key: string, value: unknown): unknown {
  // Detect circular references
  if (typeof value === 'object' && value !== null) {
    if (this.has(value)) {
      return '[Circular]';
    }
    this.add(value);
  }

  // For WorkflowNode, only keep ID and name
  if (key === 'node' && value && typeof value === 'object') {
    const node = value as WorkflowNode;
    return {
      id: node.id,
      name: node.name,
      status: node.status,
    };
  }

  return value;
}

// Usage with WeakSet for cycle detection
const seen = new WeakSet();
JSON.stringify(events, function(key, value) {
  return safeReplacer.call(seen, key, value);
}, 2);
```

**Pros**:
- Handles circular references automatically
- Preserves more context
- Less event-type-specific code

**Cons**:
- Still contains nested objects
- Need to handle WorkflowNode carefully
- May still have issues with nested events

### Strategy 3: Flattened Event Format

Create a completely flat event structure:

```typescript
interface FlatWorkflowEvent {
  type: string;
  timestamp: number;
  nodeId?: string;
  nodeName?: string;
  parentId?: string;
  // Add primitive fields for each event type
  step?: string;
  task?: string;
  duration?: number;
  error?: string;
  agentId?: string;
  agentName?: string;
  toolName?: string;
  // ... all other primitive fields
}
```

**Pros**:
- Very simple to serialize
- Easy to query/filter
- No circular references possible
- Database-friendly

**Cons**:
- Loses type safety
- Need to convert back for replay
- More complex reconstruction logic

## Recommended Approach for Groundswell

Based on the codebase patterns and requirements, **Strategy 1 (Selective Field Extraction)** is recommended because:

1. **Type Safety**: Preserves discriminated union pattern
2. **Explicit**: Clear what data is being stored
3. **Efficient**: Smaller file sizes
4. **Replay-Friendly**: Can be converted back to WorkflowEvent for replay
5. **Follows Existing Patterns**: Similar to how event tree handles serialization

### Implementation Pattern

```typescript
/**
 * Serialize a WorkflowEvent to a JSON-safe format
 * Extracts only primitive fields, avoiding circular references
 */
function serializeWorkflowEvent(event: WorkflowEvent): unknown {
  const timestamp = Date.now();

  switch (event.type) {
    case 'childAttached':
      return {
        type: event.type,
        timestamp,
        parentId: event.parentId,
        childId: event.child.id,
        childName: event.child.name,
        childStatus: event.child.status,
      };

    case 'childDetached':
      return {
        type: event.type,
        timestamp,
        parentId: event.parentId,
        childId: event.childId,
      };

    case 'stateSnapshot':
      return {
        type: event.type,
        timestamp,
        nodeId: event.node.id,
        nodeName: event.node.name,
        stateSnapshot: event.node.stateSnapshot,
      };

    case 'stepStart':
      return {
        type: event.type,
        timestamp,
        nodeId: event.node.id,
        nodeName: event.node.name,
        step: event.step,
      };

    case 'stepEnd':
      return {
        type: event.type,
        timestamp,
        nodeId: event.node.id,
        nodeName: event.node.name,
        step: event.step,
        duration: event.duration,
      };

    case 'error':
      return {
        type: event.type,
        timestamp,
        nodeId: event.node.id,
        nodeName: event.node.name,
        error: {
          message: event.error.message,
          workflowId: event.error.workflowId,
          state: event.error.state,
          logs: event.error.logs,
          stack: event.error.stack,
        },
      };

    case 'taskStart':
    case 'taskEnd':
      return {
        type: event.type,
        timestamp,
        nodeId: event.node.id,
        nodeName: event.node.name,
        task: event.task,
      };

    case 'treeUpdated':
      return {
        type: event.type,
        timestamp,
        rootId: event.root.id,
        rootName: event.root.name,
      };

    // Agent events
    case 'agentPromptStart':
      return {
        type: event.type,
        timestamp,
        agentId: event.agentId,
        agentName: event.agentName,
        promptId: event.promptId,
        nodeId: event.node.id,
        nodeName: event.node.name,
      };

    case 'agentPromptEnd':
      return {
        type: event.type,
        timestamp,
        agentId: event.agentId,
        agentName: event.agentName,
        promptId: event.promptId,
        nodeId: event.node.id,
        nodeName: event.node.name,
        duration: event.duration,
        tokenUsage: event.tokenUsage,
      };

    // Tool events
    case 'toolInvocation':
      return {
        type: event.type,
        timestamp,
        toolName: event.toolName,
        input: event.input,
        output: event.output,
        duration: event.duration,
        nodeId: event.node.id,
        nodeName: event.node.name,
      };

    // MCP events
    case 'mcpEvent':
      return {
        type: event.type,
        timestamp,
        serverName: event.serverName,
        event: event.event,
        payload: event.payload,
        nodeId: event.node.id,
        nodeName: event.node.name,
      };

    // Reflection events
    case 'reflectionStart':
      return {
        type: event.type,
        timestamp,
        level: event.level,
        nodeId: event.node.id,
        nodeName: event.node.name,
      };

    case 'reflectionEnd':
      return {
        type: event.type,
        timestamp,
        level: event.level,
        success: event.success,
        nodeId: event.node.id,
        nodeName: event.node.name,
      };

    // Cache events
    case 'cacheHit':
    case 'cacheMiss':
      return {
        type: event.type,
        timestamp,
        key: event.key,
        nodeId: event.node.id,
        nodeName: event.node.name,
      };

    default:
      // Unknown event type - store minimal info
      return {
        type: (event as { type: string }).type,
        timestamp,
        raw: JSON.parse(JSON.stringify(event, circularReplacer)),
      };
  }
}

/**
 * JSON replacer for handling circular references in unknown event types
 */
function circularReplacer(key: string, value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    if (this.has(value)) {
      return '[Circular]';
    }
    this.add(value);
  }
  return value;
}
```

### Deserialization Pattern

```typescript
/**
 * Deserialize serialized events back to WorkflowEvent format
 * Note: This returns a simplified version, not a full WorkflowEvent with live nodes
 * For full replay with WorkflowEventReplayer, use the event IDs to reconstruct
 */
function deserializeWorkflowEvent(data: unknown): Partial<WorkflowEvent> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid event data');
  }

  const event = data as { type: string; timestamp: number };

  // Return as-is for now - full reconstruction would require
  // rebuilding the entire node tree
  return event as Partial<WorkflowEvent>;
}
```

## Related Types

### SerializedWorkflowState

**Location**: `src/types/snapshot.ts`

```typescript
export type SerializedWorkflowState = Record<string, unknown>;
```

This is already JSON-safe - just a key-value record.

### WorkflowError

**Location**: `src/types/error.ts`

```typescript
export interface WorkflowError {
  message: string;
  original: unknown;          // Could be circular
  workflowId: string;
  stack?: string;
  state: SerializedWorkflowState;  // Safe
  logs: LogEntry[];           // Should be safe
}
```

**Potential issue**: `original` field could contain circular references.

**Solution**: Handle specifically in serialization:
```typescript
error: {
  message: event.error.message,
  workflowId: event.error.workflowId,
  state: event.error.state,
  logs: event.error.logs,
  // Skip 'original' field - could be circular
  stack: event.error.stack,
}
```

### TokenUsage

**Location**: `src/types/sdk-primitives.ts`

```typescript
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}
```

Already JSON-safe - just numbers.

## Testing Serialization

```typescript
// Test function to verify serialization
function testSerialization(event: WorkflowEvent): boolean {
  try {
    const serialized = serializeWorkflowEvent(event);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);
    return true;
  } catch (error) {
    console.error('Serialization failed:', error);
    return false;
  }
}

// Test with circular reference
const circularEvent: WorkflowEvent = {
  type: 'stateSnapshot',
  node: {
    id: 'test',
    name: 'Test',
    parent: null, // In real code, this could create circular ref
    children: [],
    status: 'idle',
    logs: [],
    events: [],
    stateSnapshot: { count: 42 },
  }
};

console.log(testSerialization(circularEvent)); // Should be true
```

## File I/O Integration

```typescript
import { writeFile, readFile } from 'fs/promises';

async function saveEventHistory(
  events: WorkflowEvent[],
  path: string
): Promise<void> {
  const serialized = events.map(serializeWorkflowEvent);
  const json = JSON.stringify(serialized, null, 2);
  await writeFile(path, json, 'utf-8');
}

async function loadEventHistory(
  path: string
): Promise<unknown[]> {
  const json = await readFile(path, 'utf-8');
  return JSON.parse(json);
}
```

## Key Takeaways

1. **Circular references are the main problem** - WorkflowNode has bidirectional links
2. **Selective extraction is safest** - Only store primitive fields needed for replay
3. **Timestamps are important** - Add timestamp field for event ordering
4. **Type safety matters** - Keep discriminated union pattern even in serialized form
5. **Test with real events** - Some event types may have unexpected nested structures

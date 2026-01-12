# child() Implementation Research

## File Location

**Path**: `/home/dustin/projects/groundswell/src/core/logger.ts`
**Lines**: 81-94 (child() method)

## Current child() Method Implementation

```typescript
/**
 * Create a child logger that includes parentLogId
 * @param parentLogId - ID of the parent log entry (legacy API)
 */
child(parentLogId: string): WorkflowLogger;
/**
 * Create a child logger with metadata
 * @param meta - Partial log entry metadata (typically { parentLogId: string })
 */
child(meta: Partial<LogEntry>): WorkflowLogger;
child(input: string | Partial<LogEntry>): WorkflowLogger {
  const parentLogId = typeof input === 'string' ? input : input.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

## LogEntry Type Definition

**Path**: `/home/dustin/projects/groundswell/src/types/logging.ts`
**Lines**: 9-24

```typescript
export interface LogEntry {
  id: string;                  // Unique identifier for this log entry
  workflowId: string;          // ID of the workflow that created this log
  timestamp: number;           // Unix timestamp in milliseconds
  level: LogLevel;             // Severity level
  message: string;             // Log message
  data?: unknown;              // Optional structured data
  parentLogId?: string;        // ID of parent log entry (for hierarchical logging)
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

## child() Method Behavior by Input Type

### Scenario 1: Partial<LogEntry> containing parentLogId
```typescript
// Input: { parentLogId: 'some-id' }
const childLogger = logger.child({ parentLogId: 'some-id' });

// Behavior:
// - Type guard returns false (not a string)
// - input.parentLogId is extracted ('some-id')
// - New WorkflowLogger created with parentLogId = 'some-id'
// - All log entries from this child will have parentLogId = 'some-id'
```

### Scenario 2: Partial<LogEntry> containing id (should use as parentLogId)
```typescript
// Input: { id: 'some-id' }
const childLogger = logger.child({ id: 'some-id' });

// Behavior:
// - Type guard returns false
// - input.parentLogId is undefined (object only has id)
// - New WorkflowLogger created with parentLogId = undefined
// - All log entries from this child will NOT have a parentLogId
```

### Scenario 3: String input (backward compatibility)
```typescript
// Input: 'parent-id-123'
const childLogger = logger.child('parent-id-123');

// Behavior:
// - Type guard returns true
// - input is assigned directly as parentLogId
// - New WorkflowLogger created with parentLogId = 'parent-id-123'
// - All log entries from this child will have parentLogId = 'parent-id-123'
```

### Scenario 4: Empty object (should generate parentLogId)
```typescript
// Input: {}
const childLogger = logger.child({});

// Behavior:
// - Type guard returns false
// - input.parentLogId is undefined (empty object has no properties)
// - New WorkflowLogger created with parentLogId = undefined
// - All log entries from this child will NOT have a parentLogId
```

## How parentLogId is Set in Child Logger Entries

**Location**: `src/core/logger.ts` lines 45-48

```typescript
// Add parent log ID if this is a child logger
if (this.parentLogId) {
  entry.parentLogId = this.parentLogId;
}
```

**Process**:
1. When logging (lines 35-51), a new LogEntry is created with `generateId()`
2. If `this.parentLogId` exists (is truthy), it's added to the entry
3. The entry is then emitted to the node and observers
4. **Note**: Empty strings (`''`) are falsy, so `parentLogId: ''` becomes `undefined`

## Constructor Support

```typescript
// Line 8-16
export class WorkflowLogger {
  private readonly parentLogId?: string;

  constructor(
    private node: WorkflowNode,
    private observers: WorkflowObserver[],
    parentLogId?: string
  ) {
    this.parentLogId = parentLogId;
  }
  // ...
}
```

## Key Implementation Details

1. **Function Overloads**: Two overload signatures for backward compatibility
2. **Type Guard**: Uses `typeof input === 'string'` to narrow union type
3. **Falsy Handling**: Empty strings are treated as undefined due to falsy check in `log()` method
4. **PRD Compliance**: Matches PRD specification with backward-compatible overloads
5. **Future Extensibility**: Accepts additional fields in `Partial<LogEntry>` but only uses `parentLogId`

## Existing Usage Sites

1. **deep-analysis.test.ts:61**: `this.logger.child('')` - Tests empty string handling
2. **edge-case.test.ts:96**: `this.logger.child('parent-id-123')` - Tests normal parent ID

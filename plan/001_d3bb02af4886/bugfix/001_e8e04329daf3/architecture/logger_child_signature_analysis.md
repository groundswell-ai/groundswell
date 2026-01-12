# Logger child() Signature Analysis

## 1. PRD Specification

### Signature from PRD Section 12.1

```typescript
child(meta: Partial<LogEntry>): WorkflowLogger {
  return new WorkflowLogger(this.node, this.observers);
}
```

**Source**: PRD.md lines 303-305

### LogEntry Type Definition

```typescript
export interface LogEntry {
  /** Unique identifier for this log entry */
  id: string;
  /** ID of the workflow that created this log */
  workflowId: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Severity level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Optional structured data */
  data?: unknown;
  /** ID of parent log entry (for hierarchical logging) */
  parentLogId?: string;
}
```

**Source**: src/types/logging.ts lines 9-24

### PRD Implementation Notes

The PRD skeleton shows that `meta: Partial<LogEntry>` is **accepted but NOT USED** in the implementation. The `child()` method simply returns a new `WorkflowLogger` with the same `node` and `observers`, ignoring the `meta` parameter entirely.

This suggests the parameter is for **future extensibility** - the PRD architect intended to allow passing metadata when creating child loggers, but the skeleton implementation was a stub.

---

## 2. Current Implementation

### Actual Signature

```typescript
child(parentLogId: string): WorkflowLogger
```

**Source**: src/core/logger.ts line 84

### Current Code

```typescript
export class WorkflowLogger {
  private readonly parentLogId?: string;

  constructor(
    private readonly node: WorkflowNode,
    private readonly observers: WorkflowObserver[],
    parentLogId?: string
  ) {
    this.parentLogId = parentLogId;
  }

  /**
   * Create a child logger that includes parentLogId
   */
  child(parentLogId: string): WorkflowLogger {
    return new WorkflowLogger(this.node, this.observers, parentLogId);
  }
}
```

**Source**: src/core/logger.ts lines 8-16, 84-86

### Constructor Support for parentLogId

The current implementation **does support** hierarchical logging through the constructor:

1. `WorkflowLogger` stores `parentLogId` as a private field
2. The constructor accepts an optional `parentLogId` parameter
3. The `child()` method passes the `parentLogId` to the constructor
4. When logging, if `this.parentLogId` exists, it's added to the log entry:

```typescript
// From src/core/logger.ts lines 45-48
if (this.parentLogId) {
  entry.parentLogId = this.parentLogId;
}
```

---

## 3. Signature Comparison

### Key Differences Table

| Aspect | PRD Spec | Current Implementation |
|--------|----------|----------------------|
| Parameter Type | `Partial<LogEntry>` | `string` |
| Parameter Name | `meta` | `parentLogId` |
| Flexibility | Can pass any LogEntry field | Only accepts parentLogId |
| PRD Skeleton Behavior | Ignores the meta parameter | Uses parentLogId to set hierarchy |
| Actual Implementation | N/A (skeleton only) | Passes parentLogId to constructor |

### Compatibility Matrix

| Call Pattern | Works with PRD Spec | Works with Current Implementation |
|--------------|-------------------|----------------------------------|
| `logger.child('parent-id')` | No (wrong type) | Yes |
| `logger.child({ parentLogId: 'parent-id' })` | Yes | No |
| `logger.child({})` | Yes | No |
| `logger.child({ id: 'custom-id', parentLogId: 'parent-id' })` | Yes | No |

**Result**: Complete incompatibility - the two signatures are mutually exclusive.

---

## 4. Existing Usage Analysis

### Usage Site 1: deep-analysis.test.ts:61

```typescript
const childLogger = this.logger.child('');
childLogger.info('Child log with empty parent');
```

**Context**: Testing empty parentLogId handling

**Expected Behavior**: Empty string is passed through, and because of the falsy check in the logger's `log()` method, `parentLogId` remains `undefined`.

**Impact**: BREAKING - will need migration

**Migration Path**:
```typescript
// Before
const childLogger = this.logger.child('');

// After
const childLogger = this.logger.child({ parentLogId: '' });
// Or for root logger behavior:
const childLogger = this.logger.child({});
```

### Usage Site 2: edge-case.test.ts:96

```typescript
const childLogger = this.logger.child('parent-id-123');
expect(childLogger).toBeDefined();
```

**Context**: Testing normal parentLogId passing and verifying child logger is created

**Expected Behavior**: Child logger stores `'parent-id-123'` as its parentLogId, which gets attached to all log entries from this child logger.

**Impact**: BREAKING - will need migration

**Migration Path**:
```typescript
// Before
const childLogger = this.logger.child('parent-id-123');

// After
const childLogger = this.logger.child({ parentLogId: 'parent-id-123' });
```

### Usage Summary

- **Total Usage Sites**: 2 test files
- **Both Are Breaking Changes**: String parameter is incompatible with object parameter
- **Migration Required**: Both test files will need updates

---

## 5. Partial<LogEntry> Field Analysis

### Fields That Make Sense for child()

| Field | Type | Relevance | Notes |
|-------|------|-----------|-------|
| `parentLogId` | `string` | **Primary** | Main use case - links child log entries to parent |
| `id` | `string` | Low | Could allow explicit child log ID, but logger generates IDs automatically |
| `workflowId` | `string` | Low | Could allow different workflow context, but logger uses `this.node.id` |
| `data` | `unknown` | Medium | Could attach metadata to child logger for inclusion in all logs |
| `level` | `LogLevel` | Medium | Could set default level for child logger |

### Fields That DON'T Make Sense

| Field | Type | Why It Doesn't Make Sense |
|-------|------|---------------------------|
| `timestamp` | `number` | Child logger generates timestamps when logging, not at creation |
| `message` | `string` | Logger doesn't have a default message - messages are provided per log call |

---

## 6. Recommended Implementation Approach

### Option 1: Strict PRD Compliance (Breaking Change)

```typescript
child(meta: Partial<LogEntry>): WorkflowLogger {
  // Extract parentLogId from meta
  const parentLogId = meta.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

**Pros**:
- Matches PRD exactly
- Enables future extensibility for other meta fields
- More consistent with TypeScript patterns

**Cons**:
- Breaking change for 2 existing test files
- Requires user code migration

**Migration Required**:
```typescript
// All existing calls must change from:
logger.child('parent-id')
// To:
logger.child({ parentLogId: 'parent-id' })
```

### Option 2: Backward Compatible with Overload

```typescript
// Legacy signature for backward compatibility
child(parentLogId: string): WorkflowLogger;
// New PRD-compliant signature
child(meta: Partial<LogEntry>): WorkflowLogger;

child(input: string | Partial<LogEntry>): WorkflowLogger {
  const parentLogId = typeof input === 'string'
    ? input
    : input.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

**Pros**:
- No breaking change
- Supports both old and new patterns
- Smooth migration path

**Cons**:
- More complex implementation
- TypeScript type narrowing required at call sites
- Ambiguity: what if someone passes `{ parentLogId: '123' }` vs `'123'`?

### Option 3: Hybrid Approach with Default

```typescript
child(meta: Partial<LogEntry> = {}): WorkflowLogger {
  const parentLogId = meta.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

**Pros**:
- Default empty object makes `logger.child()` calls work
- Closer to PRD signature

**Cons**:
- Still breaking for string-based calls like `logger.child('parent-id')`
- Doesn't solve the incompatibility problem

### Recommendation: **Option 1 - Strict PRD Compliance**

**Rationale**:

1. **Codebase Pattern**: This project has a history of breaking changes when correcting PRD mismatches. See CHANGELOG.md for the `attachChild()` behavior change which also broke existing patterns.

2. **Limited Impact**: Only 2 test files are affected. The public API impact is minimal since this is primarily used internally.

3. **Future Extensibility**: The `Partial<LogEntry>` signature allows passing additional metadata (like `data`, `level`) in future enhancements without another breaking change.

4. **Type Safety**: The object-based signature is more self-documenting and type-safe than a string parameter.

5. **Consistency**: Aligning implementation with PRD specification is the correct architectural decision.

---

## 7. Migration Strategy

### Code Changes Required

1. **Update src/core/logger.ts:84** - Change `child()` signature
2. **Update 2 test files** - Convert to object syntax
3. **Update documentation** - Document the new signature

### Test Migration Examples

#### Test File 1: src/__tests__/adversarial/deep-analysis.test.ts:61

```typescript
// Before
const childLogger = this.logger.child('');
childLogger.info('Child log with empty parent');

// After
const childLogger = this.logger.child({});
childLogger.info('Child log with empty parent');
```

#### Test File 2: src/__tests__/adversarial/edge-case.test.ts:96

```typescript
// Before
const childLogger = this.logger.child('parent-id-123');
expect(childLogger).toBeDefined();

// After
const childLogger = this.logger.child({ parentLogId: 'parent-id-123' });
expect(childLogger).toBeDefined();
```

### Implementation Template for P1.M1.T1.S2

```typescript
/**
 * Create a child logger that includes parentLogId
 * @param meta Partial log entry metadata (typically { parentLogId: string })
 */
child(meta: Partial<LogEntry> = {}): WorkflowLogger {
  const parentLogId = meta.parentLogId;
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```

**Note**: The default parameter `{}` allows `logger.child()` to be called without arguments, creating a logger with no parentLogId (similar to current empty string behavior).

---

## 8. Related Files

| File | Lines | Purpose |
|------|-------|---------|
| PRD.md | 286-307 | PRD Section 12.1 WorkflowLogger specification |
| src/core/logger.ts | 8-16, 84-86 | Current WorkflowLogger implementation with child() |
| src/types/logging.ts | 9-24 | LogEntry interface definition |
| src/__tests__/adversarial/deep-analysis.test.ts | 61 | Usage site 1: empty string parentLogId |
| src/__tests__/adversarial/edge-case.test.ts | 96 | Usage site 2: normal parentLogId |
| src/types/reflection.ts | 110-117 | Partial<T> usage pattern reference |

### Partial<T> Pattern Reference from reflection.ts

```typescript
export function createReflectionConfig(
  partial?: Partial<ReflectionConfig>
): ReflectionConfig {
  return {
    ...DEFAULT_REFLECTION_CONFIG,  // Spread defaults first
    ...partial,                     // Then override with provided values
  };
}
```

**Pattern Note**: This shows the codebase uses spread operator for merging Partial objects. Similar pattern could be applied if child() needs to merge multiple metadata fields in the future.

---

## Summary

### Core Issue

The `child()` method signature is **incompatible** between PRD specification and current implementation:

- **PRD**: `child(meta: Partial<LogEntry>)`
- **Actual**: `child(parentLogId: string)`

### Impact Assessment

- **Breaking Change**: Yes - string and object types are incompatible
- **Affected Files**: 2 test files (minimal impact)
- **Public API Impact**: Low - primarily internal usage

### Recommended Action

**Implement Option 1 (Strict PRD Compliance)** in the next subtask (P1.M1.T1.S2):

1. Update `src/core/logger.ts:84` to accept `Partial<LogEntry>`
2. Migrate the 2 test files to use object syntax
3. Add a default parameter `{}` to allow `logger.child()` calls without arguments

### Next Steps

1. **P1.M1.T1.S2** - Implement the signature change in `src/core/logger.ts`
2. **P1.M1.T1.S3** - Add tests for the new `child()` signature with `Partial<LogEntry>`
3. **P1.M1.T1.S4** - Verify all existing `child()` calls work after migration

---

**Document Version**: 1.0
**Generated**: 2026-01-12
**For**: P1.M1.T1.S2 - Update WorkflowLogger.child() to accept Partial<LogEntry>

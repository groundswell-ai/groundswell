# Product Requirement Prompt (PRP): Research PRD Specification for child() Signature

**Work Item**: P1.M1.T1.S1 - Research PRD specification for child() signature
**PRD Reference**: Section 12.1 - WorkflowLogger Skeleton
**Implementation Target**: src/core/logger.ts:84

---

## Goal

**Feature Goal**: Document the exact differences between the PRD-specified `child()` signature and the current implementation, and provide a clear migration path.

**Deliverable**: A comprehensive analysis document (`logger_child_signature_analysis.md`) that:
1. Compares PRD specification vs. current implementation
2. Documents all existing usage patterns
3. Identifies backward compatibility requirements
4. Provides a recommended implementation approach

**Success Definition**: The analysis document enables the next subtask (P1.M1.T1.S2) to implement the signature change with complete understanding of:
- What fields from `Partial<LogEntry>` should be supported
- How to handle backward compatibility with existing `child(parentLogId: string)` calls
- The correct pattern for merging Partial<LogEntry> metadata

## User Persona

**Target User**: Developer implementing the signature change (P1.M1.T1.S2) and QA validating the migration (P1.M1.T1.S4)

**Use Case**: Understanding the full context of the `child()` signature discrepancy before implementing the fix

**User Journey**:
1. Read this PRP to understand the scope
2. Examine the generated analysis document
3. Use findings to implement the updated signature
4. Validate backward compatibility with existing test cases

**Pain Points Addressed**:
- Ambiguity about which `LogEntry` fields should be accepted in `Partial<LogEntry>`
- Unclear migration path from `child(parentLogId: string)` to `child(meta: Partial<LogEntry>)`
- Risk of breaking existing code that depends on the current signature

## Why

- **API Contract Compliance**: The current public API (`child(parentLogId: string)`) does not match the documented PRD specification (`child(meta: Partial<LogEntry>)`)
- **Extensibility**: The `Partial<LogEntry>` signature allows passing additional metadata (like `id`, `workflowId`, custom `data`) when creating child loggers
- **Consistency**: Aligns the implementation with the architectural design documented in the PRD

## What

### Success Criteria

- [ ] Analysis document created at `plan/bugfix/architecture/logger_child_signature_analysis.md`
- [ ] PRD specification for `child()` fully documented with exact signature
- [ ] Current implementation documented with code examples
- [ ] All existing usage sites catalogued (currently 2 test files)
- [ ] Backward compatibility requirements identified
- [ ] Recommended implementation approach provided with code examples

---

## All Needed Context

### Context Completeness Check

_This PRP passes the "No Prior Knowledge" test - someone unfamiliar with the codebase would have everything needed to complete this research task successfully._

### Documentation & References

```yaml
# MUST READ - PRD Specification
- url: ./prd_snapshot.md#section-12.1
  why: Exact PRD specification for WorkflowLogger.child() method signature
  critical: PRD specifies `child(meta: Partial<LogEntry>)` but implementation uses `child(parentLogId: string)`

# CRITICAL - Current Implementation
- file: src/core/logger.ts
  why: Current WorkflowLogger implementation with child() at line 84-86
  pattern: Hierarchical logging pattern using parentLogId string parameter
  gotcha: The current signature is incompatible with PRD spec - this is the core bug

# CRITICAL - Type Definitions
- file: src/types/logging.ts
  why: Complete LogEntry interface definition required to understand Partial<LogEntry>
  section: Lines 9-24 define the full LogEntry interface with all optional fields

# CRITICAL - Usage Sites
- file: src/__tests__/adversarial/deep-analysis.test.ts
  why: Test file using child() with empty string at line 61
  pattern: `const childLogger = this.logger.child('');`

- file: src/__tests__/adversarial/edge-case.test.ts
  why: Test file using child() with parent ID at line 96
  pattern: `const childLogger = this.logger.child('parent-id-123');`

# REFERENCE - Codebase Structure
- docfile: plan/001_d3bb02af4886/bugfix/architecture/codebase_structure.md
  why: Architecture documentation showing logger location and design
  section: WorkflowLogger section with child() signature notes

# REFERENCE - Partial Usage Patterns
- file: src/types/reflection.ts
  why: Examples of how Partial<T> is used elsewhere in the codebase
  pattern: Partial used for optional config with default merging via createReflectionConfig()

# REFERENCE - Migration Patterns
- file: CHANGELOG.md
  why: Examples of previous API migrations (e.g., attachChild breaking change)
  pattern: Clear migration guides with before/after code examples
```

### Current Codebase Tree

```bash
src/
├── core/
│   ├── logger.ts              # TARGET FILE - child() at line 84
│   ├── workflow.ts            # Creates root logger at line 111
│   └── index.ts               # Public API exports
├── types/
│   ├── logging.ts             # LogEntry, LogLevel definitions
│   ├── observer.ts            # WorkflowObserver interface
│   └── workflow.ts            # WorkflowNode interface
├── utils/
│   └── id.ts                  # generateId() utility
└── __tests__/
    └── adversarial/
        ├── deep-analysis.test.ts    # Uses child('') at line 61
        └── edge-case.test.ts        # Uses child('parent-id-123') at line 96
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Partial<LogEntry> means ALL LogEntry fields are optional
// Including required fields like id, workflowId, timestamp, level, message
// The implementation must handle missing required fields appropriately

// CRITICAL: The PRD skeleton shows meta parameter is accepted but NOT USED:
// child(meta: Partial<LogEntry>): WorkflowLogger {
//   return new WorkflowLogger(this.node, this.observers);
// }
// This suggests the parameter is for future extensibility

// GOTCHA: Current test code expects string parameter, not object:
// this.logger.child('parent-id-123')  // Current usage
// this.logger.child({ parentLogId: 'parent-id-123' })  // PRD usage

// GOTCHA: The parentLogId field in LogEntry is optional (parentLogId?: string)
// Root loggers have no parentLogId, child loggers inherit it via constructor

// PATTERN: Codebase uses spread operator for merging Partial objects:
// { ...DEFAULT_CONFIG, ...partial }  // From reflection.ts
```

---

## Implementation Blueprint

### Research Task Breakdown

This is a **research-only task**. No code changes should be made.

The analysis document should follow this structure:

```markdown
# Logger child() Signature Analysis

## 1. PRD Specification

### Signature from PRD Section 12.1
```typescript
child(meta: Partial<LogEntry>): WorkflowLogger
```

### LogEntry Type Definition
[Full type from src/types/logging.ts]

### PRD Implementation Notes
[Extract the skeleton implementation from PRD]

## 2. Current Implementation

### Actual Signature
```typescript
child(parentLogId: string): WorkflowLogger
```

### Current Code
[Full implementation from src/core/logger.ts:84-86]

### Constructor Support for parentLogId
[Show how constructor accepts parentLogId parameter]

## 3. Signature Comparison

### Key Differences Table
| Aspect | PRD Spec | Current Implementation |
|--------|----------|----------------------|
| Parameter Type | Partial<LogEntry> | string |
| Parameter Name | meta | parentLogId |
| Flexibility | Can pass any LogEntry field | Only accepts parentLogId |

### Compatibility Matrix
[Show which call patterns work with each signature]

## 4. Existing Usage Analysis

### Usage Site 1: deep-analysis.test.ts:61
```typescript
const childLogger = this.logger.child('');
```
- Context: Testing empty parentLogId handling
- Impact: BREAKING - will need migration

### Usage Site 2: edge-case.test.ts:96
```typescript
const childLogger = this.logger.child('parent-id-123');
```
- Context: Testing normal parentLogId passing
- Impact: BREAKING - will need migration

## 5. Partial<LogEntry> Field Analysis

### Fields That Make Sense for child()
- parentLogId: string - Primary use case, links to parent log entry
- id: string - Could allow explicit child log ID
- workflowId: string - Could allow different workflow context
- data: unknown - Could attach metadata to child logger
- level: LogLevel - Could set default level for child

### Fields That DON'T Make Sense
- timestamp: number - Child logger generates timestamps when logging
- message: string - Logger doesn't have a default message

## 6. Recommended Implementation Approach

### Option 1: Strict PRD Compliance (Breaking Change)
```typescript
child(meta: Partial<LogEntry>): WorkflowLogger {
  const parentLogId = meta.parentLogId;
  // Extract and use other fields as needed
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```
- Pros: Matches PRD exactly
- Cons: Breaking change, requires migration of 2 test files

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
- Pros: No breaking change
- Cons: More complex implementation

### Option 3: Hybrid Approach
```typescript
child(meta: Partial<LogEntry> = {}): WorkflowLogger {
  const parentLogId = meta.parentLogId;
  // Handle other meta fields...
  return new WorkflowLogger(this.node, this.observers, parentLogId);
}
```
- Pros: Default empty object makes migration easier
- Cons: Still breaking for string calls

### Recommendation
[Chosen option with rationale based on codebase migration patterns]

## 7. Migration Strategy

### Code Changes Required
1. Update src/core/logger.ts:84 child() signature
2. Update 2 test files to use object syntax
3. Update any user code using the old signature

### Test Migration Examples
```typescript
// Before
this.logger.child('parent-id-123');

// After
this.logger.child({ parentLogId: 'parent-id-123' });
```

## 8. Related Files
- src/core/logger.ts:84 - Implementation location
- src/types/logging.ts - LogEntry definition
- src/__tests__/adversarial/deep-analysis.test.ts:61 - Usage site 1
- src/__tests__/adversarial/edge-case.test.ts:96 - Usage site 2
```

### Implementation Patterns & Key Details

```typescript
// PATTERN: How Partial<T> is used in this codebase (from reflection.ts)
export function createReflectionConfig(
  partial?: Partial<ReflectionConfig>
): ReflectionConfig {
  return {
    ...DEFAULT_REFLECTION_CONFIG,  // Spread defaults first
    ...partial,                     // Then override with provided values
  };
}

// PATTERN: Similar approach could be used for child() meta processing
function processChildMeta(meta: Partial<LogEntry>): RequiredMeta {
  const defaults: RequiredMeta = {
    parentLogId: undefined,
  };
  return {
    ...defaults,
    ...meta,
  };
}

// GOTCHA: The PRD skeleton shows meta is accepted but NOT USED
// This suggests the parameter may be for future extensibility
// Consider whether to implement full merging now or stub for later

// CRITICAL: Test files verify the current string-based signature
// Any implementation MUST maintain backward compatibility or include migration
```

### Integration Points

```yaml
NO CODE CHANGES - This is a research task only.

OUTPUT:
  - create: plan/bugfix/architecture/logger_child_signature_analysis.md
  - content: Analysis document following the structure above

FOLLOW-UP:
  - next_task: P1.M1.T1.S2 (Update WorkflowLogger.child() to accept Partial<LogEntry>)
  - next_task: P1.M1.T1.S3 (Add tests for new child() signature)
  - next_task: P1.M1.T1.S4 (Verify all existing child() calls still work)
```

---

## Validation Loop

### Level 1: Document Completeness (Immediate Validation)

```bash
# After creating the analysis document, verify:
grep -i "prd specification" plan/bugfix/architecture/logger_child_signature_analysis.md
grep -i "current implementation" plan/bugfix/architecture/logger_child_signature_analysis.md
grep -i "usage" plan/bugfix/architecture/logger_child_signature_analysis.md
grep -i "recommendation" plan/bugfix/architecture/logger_child_signature_analysis.md

# Expected: All sections present and populated with content
```

### Level 2: Content Accuracy (Verification)

```bash
# Verify PRD reference is accurate
grep -A 5 "child(meta: Partial" PRD.md

# Verify current implementation reference is accurate
grep -A 3 "child(parentLogId" src/core/logger.ts

# Verify usage sites are documented
grep "child('" src/__tests__/adversarial/*.test.ts

# Expected: All references match actual code
```

### Level 3: Actionability (Review)

```markdown
Review checklist:
- [ ] Document clearly identifies the signature mismatch
- [ ] All existing usage sites are catalogued with file paths and line numbers
- [ ] LogEntry type definition is fully documented
- [ ] At least 3 implementation options are presented with pros/cons
- [ ] Clear recommendation is provided with rationale
- [ ] Migration examples show before/after code
- [ ] Related files section is complete and accurate
```

### Level 4: Handoff Readiness

```bash
# Verify the document enables the next task
cat plan/bugfix/architecture/logger_child_signature_analysis.md | grep -i "next"

# Expected: Clear reference to P1.M1.T1.S2 as the next step
```

---

## Final Validation Checklist

### Research Validation

- [ ] PRD Section 12.1 has been read and documented accurately
- [ ] Current implementation at src/core/logger.ts:84 has been examined
- [ ] LogEntry type definition from src/types/logging.ts is documented
- [ ] All 2 usage sites in test files are catalogued
- [ ] Partial<T> usage patterns in the codebase have been analyzed
- [ ] Migration patterns from CHANGELOG.md have been reviewed

### Document Quality Validation

- [ ] Analysis document follows the specified structure
- [ ] Code examples are accurate and include line numbers
- [ ] Signature comparison is clear and tabular
- [ ] Implementation options include pros/cons
- [ ] Recommendation is specific and actionable
- [ ] Migration strategy includes concrete code examples

### Handoff Validation

- [ ] Document location is correct: plan/bugfix/architecture/logger_child_signature_analysis.md
- [ ] Document references all relevant files with exact paths
- [ ] Next task (P1.M1.T1.S2) can proceed with only this document + codebase access
- [ ] No additional research should be required for implementation

---

## Anti-Patterns to Avoid

- [ ] Don't make code changes - this is a research-only task
- [ ] Don't skip documenting the 2 existing usage sites
- [ ] Don't assume which LogEntry fields are relevant - analyze each one
- [ ] Don't provide only one implementation option - present alternatives
- [ ] Don't forget to document the migration examples
- [ ] Don't leave the recommendation ambiguous - be specific
- [ ] Don't ignore the PRD's note that meta parameter is unused in skeleton
- [ ] Don't overlook the backward compatibility implications

---

## Appendix: Quick Reference

### Key File Locations

| File | Lines | Purpose |
|------|-------|---------|
| PRD.md | 286-307 | PRD Section 12.1 WorkflowLogger specification |
| src/core/logger.ts | 84-86 | Current child() implementation |
| src/types/logging.ts | 9-24 | LogEntry interface definition |
| src/__tests__/adversarial/deep-analysis.test.ts | 61 | Usage site 1 |
| src/__tests__/adversarial/edge-case.test.ts | 96 | Usage site 2 |
| src/types/reflection.ts | - | Partial<T> usage pattern reference |
| CHANGELOG.md | - | Migration pattern reference |

### Signature Comparison

```typescript
// PRD Specification (Section 12.1)
child(meta: Partial<LogEntry>): WorkflowLogger

// Current Implementation (src/core/logger.ts:84)
child(parentLogId: string): WorkflowLogger

// LogEntry Fields (from src/types/logging.ts)
interface LogEntry {
  id: string;                  // Unique identifier
  workflowId: string;          // Workflow that created log
  timestamp: number;           // Unix timestamp in ms
  level: LogLevel;             // 'debug' | 'info' | 'warn' | 'error'
  message: string;             // Log message
  data?: unknown;              // Optional structured data
  parentLogId?: string;        // Parent log ID for hierarchy
}
```

### Existing Usage Patterns

```typescript
// Pattern 1: Empty string (deep-analysis.test.ts:61)
this.logger.child('');

// Pattern 2: Parent ID string (edge-case.test.ts:96)
this.logger.child('parent-id-123');
```

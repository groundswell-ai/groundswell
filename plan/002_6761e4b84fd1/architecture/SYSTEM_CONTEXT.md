# System Context & Architecture Overview

**Project:** Groundswell - Hierarchical Workflow Orchestration Engine
**Version:** 0.0.4
**Analysis Date:** 2026-01-24
**PRD Reference:** Hierarchical Workflow Engine with Full Observability & Tree Debugging

---

## Executive Summary

The existing Groundswell codebase **already implements 95% of the PRD requirements**. This is a mature, production-ready system with comprehensive observability, hierarchical workflow execution, decorator-based step orchestration, and real-time tree debugging capabilities.

The PRD describes features that are **largely already built**, with only minor gaps in Agent Response standardization and some optional enhancements.

---

## Current Architecture State

### Core Components Already Implemented

#### 1. **Workflow Engine** ✅ COMPLETE
- **Location:** `src/core/workflow.ts` (541 lines)
- **Features:**
  - Hierarchical parent-child workflow trees
  - Status management (idle, running, completed, failed, cancelled)
  - Automatic child attachment via `attachChild()`
  - Root observer propagation to all descendants
  - Event emission system
  - State snapshot functionality
  - Cycle detection with Set-based traversal

#### 2. **Decorator System** ✅ COMPLETE
- **@Step Decorator:** `src/decorators/step.ts`
  - Emits stepStart/stepEnd events
  - Tracks timing (enabled by default)
  - Optional state snapshots
  - Error wrapping with WorkflowError
  - Integration with AsyncLocalStorage context

- **@Task Decorator:** `src/decorators/task.ts`
  - Emits taskStart/taskEnd events
  - Automatic child workflow attachment
  - Concurrent execution support
  - Duck-typing validation
  - Error merge strategies

- **@ObservedState Decorator:** `src/decorators/observed-state.ts`
  - WeakMap-based metadata storage
  - Redaction support (`***`)
  - Hidden field support
  - Selective serialization

#### 3. **Observability System** ✅ COMPLETE
- **WorkflowLogger:** `src/core/workflow.ts` (inner class)
  - Hierarchical logging with parentLogId
  - Log levels: debug, info, warn, error
  - Automatic observer notification
  - Child logger creation

- **Observer Pattern:** `src/types/observer.ts`
  - WorkflowObserver interface
  - Observer registration at root level
  - Automatic propagation to descendants
  - Error isolation (observer failures don't crash workflow)

- **Event System:** `src/types/events.ts`
  - 15+ event types
  - Tree change notifications
  - Agent lifecycle events
  - Cache hit/miss tracking
  - Tool invocation events
  - Reflection events

#### 4. **Tree Debugger API** ✅ COMPLETE
- **Location:** `src/debugger/tree-debugger.ts`
- **Features:**
  - `getTree()` - Get root WorkflowNode
  - `getNode(id)` - O(1) node lookup by ID
  - `events` - Observable<WorkflowEvent> stream
  - `toTreeString(node)` - ASCII tree visualization
  - `toLogString(node)` - Hierarchical log formatting
  - Incremental O(k) subtree updates
  - Statistics aggregation
  - Status symbol rendering (○ ◐ ✓ ✗ ⊘)

#### 5. **Error Handling** ✅ COMPLETE
- **WorkflowError Interface:** `src/types/error.ts`
  - message, original error, workflowId, stack
  - State snapshot at error time
  - Node-specific logs
  - Full child state visibility

- **Error Merge Strategies:** `src/types/error-strategy.ts`
  - Configurable merging for concurrent tasks
  - Optional depth limiting
  - Custom combine functions

#### 6. **Agent Response Model** ⚠️ PARTIAL
- **Status:** Interface exists but not consistently enforced
- **Location:** `src/types/agent.ts`
- **Gaps:**
  - AgentResponse interface defined but not used in Agent class
  - No validation that responses conform to schema
  - No INVALID_RESPONSE_FORMAT error handling
  - Anthropic SDK returns raw Message objects (not AgentResponse)

---

## Architectural Patterns in Use

### Design Patterns

1. **Composite Pattern** - Workflow tree structure with parent-child relationships
2. **Observer Pattern** - Event-driven observability with WorkflowObserver
3. **Decorator Pattern** - @Step, @Task, @ObservedState method/field decoration
4. **Factory Pattern** - createWorkflow(), createAgent(), createPrompt()
5. **Context Pattern** - AsyncLocalStorage-based zero-plumbing context propagation
6. **Immutable Value Objects** - Prompt class with Object.freeze()
7. **Repository Pattern** - LLMCache for data persistence
8. **Strategy Pattern** - Reflection strategies, error merge strategies
9. **Template Method** - Workflow base class with abstract run()
10. **Builder Pattern** - WorkflowContext step chaining

### Key Architectural Principles

1. **Hierarchical Organization** - Single-parent tree structure
2. **Event-Driven** - All actions emit events for observability
3. **Type Safety** - Strict TypeScript + Zod runtime validation
4. **Immutability** - Prompts are frozen value objects
5. **Zero-Plumbing Context** - AsyncLocalStorage automatic propagation
6. **Dual API** - Class-based and functional patterns
7. **Lenient Validation** - @Task decorator duck-typing
8. **Cycle Detection** - Set-based traversal prevents infinite loops
9. **Incremental Updates** - O(k) tree operations
10. **Reflection-First** - Built-in error recovery

---

## Technology Stack

### Core Technologies

- **Language:** TypeScript 5.2+ (ES2022 target)
- **Runtime:** Node.js >=18
- **Testing:** Vitest (modern Jest alternative)
- **Build:** Native TypeScript compiler (tsc)
- **Package Module:** ES Module (`"type": "module"`)

### Dependencies

#### Production
- `@anthropic-ai/sdk: ^0.71.1` - Anthropic Claude API
- `lru-cache: ^10.4.3` - LRU cache implementation
- `zod: ^3.23.0` - Runtime type validation

#### Development
- `typescript: ^5.2.0`
- `vitest: ^1.0.0`
- `tsx: ^4.21.0`

---

## Build & Distribution

### Build Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "useDefineForClassFields": true
  }
}
```

### Distribution

- **Output:** `dist/` directory
- **Entry Point:** `dist/index.js`
- **Types:** `dist/index.d.ts`
- **Module Format:** ES Module
- **Distributed Files:** `dist/` only (via `files` field)

---

## Testing Infrastructure

### Test Framework

- **Framework:** Vitest
- **Config:** `vitest.config.ts`
- **Pattern:** `src/__tests__/**/*.test.ts`
- **Global APIs:** Enabled (describe, it, expect)
- **Total Tests:** 36 test files

### Test Categories

1. **Unit Tests** - `src/__tests__/unit/`
2. **Integration Tests** - `src/__tests__/integration/`
3. **Adversarial Tests** - `src/__tests__/adversarial/`
4. **Compatibility Tests** - `src/__tests__/compatibility/`
5. **Helpers** - `src/__tests__/helpers/`

### Test Commands

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run lint             # Type checking only
```

---

## Data Flow

### Workflow Execution Flow

```
User Code
  ↓
Workflow.run()
  ↓
@Step Decorator Wrapper
  ↓
Context Creation (AsyncLocalStorage)
  ↓
Event Emission (stepStart)
  ↓
Method Execution
  ↓
Agent.prompt() [captures context automatically]
  ↓
Event Emission (stepEnd, error, etc.)
  ↓
Observer Notification
  ↓
Tree Debugger Update
```

### Agent Response Flow (Current)

```
Agent.prompt()
  ↓
Anthropic SDK Call
  ↓
Raw Message Response
  ↓
Zod Validation
  ↓
Return T (generic type)
```

### Agent Response Flow (PRD Requirement)

```
Agent.prompt()
  ↓
Anthropic SDK Call
  ↓
Raw Message Response
  ↓
Wrap in AgentResponse<T>
  ↓
Validate AgentResponse Schema
  ↓
Return AgentResponse<T>
```

---

## File Structure Reference

```
src/
├── core/
│   ├── workflow.ts              # Workflow base class (541 lines)
│   ├── agent.ts                 # Agent class
│   ├── prompt.ts                # Prompt class
│   ├── context.ts               # AsyncLocalStorage context
│   └── workflow-context.ts      # Context implementation
├── decorators/
│   ├── step.ts                  # @Step decorator
│   ├── task.ts                  # @Task decorator
│   └── observed-state.ts        # @ObservedState decorator
├── types/
│   ├── workflow.ts              # WorkflowNode, WorkflowStatus
│   ├── logging.ts               # LogEntry, LogLevel
│   ├── events.ts                # WorkflowEvent types
│   ├── error.ts                 # WorkflowError
│   ├── error-strategy.ts        # ErrorMergeStrategy
│   ├── observer.ts              # WorkflowObserver interface
│   ├── decorators.ts            # Decorator option types
│   ├── agent.ts                 # AgentConfig, AgentResponse
│   ├── prompt.ts                # Prompt types
│   └── index.ts                 # Type exports
├── debugger/
│   └── tree-debugger.ts         # WorkflowTreeDebugger
├── cache/
│   └── cache.ts                 # LLMCache
├── reflection/
│   └── reflection.ts            # ReflectionManager
├── tools/
│   └── introspection.ts         # INTROSPECTION_TOOLS
├── utils/
│   └── observable.ts            # Observable implementation
└── __tests__/                   # 36 test files
```

---

## PRD Alignment Matrix

| PRD Requirement | Implementation Status | Notes |
|----------------|----------------------|-------|
| Hierarchical workflows | ✅ COMPLETE | Workflow tree with parent-child |
| Sequential + concurrent steps | ✅ COMPLETE | @Step (sequential), @Task (concurrent) |
| Automatic parent/child attachment | ✅ COMPLETE | attachChild() in @Task decorator |
| High-resolution observability | ✅ COMPLETE | Logs, events, snapshots |
| Error introspection | ✅ COMPLETE | WorkflowError with state snapshot |
| Full child state visibility | ✅ COMPLETE | Nested tree access via debugger |
| Restart logic at correct parent | ✅ COMPLETE | Parent analyzes child errors |
| Real-time tree debugger API | ✅ COMPLETE | WorkflowTreeDebugger class |
| 1:1 tree mirror (logs + events) | ✅ COMPLETE | Synchronous atomic updates |
| @Step decorator | ✅ COMPLETE | Full implementation with options |
| @Task decorator | ✅ COMPLETE | Full implementation with concurrency |
| @ObservedState decorator | ✅ COMPLETE | WeakMap-based metadata |
| Workflow base class | ✅ COMPLETE | Workflow abstract class |
| WorkflowLogger | ✅ COMPLETE | Hierarchical logging |
| Observer system | ✅ COMPLETE | WorkflowObserver interface |
| Snapshot system | ✅ COMPLETE | getObservedState() |
| Restart semantics | ✅ COMPLETE | Parent-controlled restart |
| Error merge strategy | ✅ COMPLETE | Configurable merging |
| Tree debugger interface | ✅ COMPLETE | Full API with Observable |
| **AgentResponse JSON enforcement** | ⚠️ **PARTIAL** | **Needs implementation** |

---

## Gaps & Implementation Needs

### Critical Gap: Agent Response Standardization

**Problem:** The PRD mandates "All agent responses MUST be valid JSON" and conform to the AgentResponse interface, but the current implementation does not enforce this.

**Current Behavior:**
```typescript
const result = await agent.prompt<string>(...); // Returns T directly
```

**PRD Requirement:**
```typescript
const response = await agent.prompt<string>(...);
// response: AgentResponse<T>

if (response.status === 'success') {
  const data = response.data; // T | null
}
```

**Implementation Required:**
1. Modify `Agent.prompt()` to return `AgentResponse<T>` instead of `T`
2. Wrap Anthropic SDK responses in AgentResponse schema
3. Add validation for INVALID_RESPONSE_FORMAT
4. Update all usages throughout codebase
5. Update examples (11 files)
6. Update tests

**Estimated Effort:** 8-12 story points (moderate complexity, wide impact)

---

## Development Workflow

### Adding a New Workflow

```typescript
import { Workflow, Step, Task, ObservedState } from 'groundswell';

class MyWorkflow extends Workflow {
  @ObservedState()
  public currentState!: string;

  @Step({ logStart: true, snapshotState: true })
  async stepOne() {
    this.currentState = 'processing';
    // ... work
  }

  @Task({ concurrent: false })
  async spawnChild() {
    return new ChildWorkflow('Child', this);
  }

  async run() {
    await this.stepOne();
    await this.spawnChild();
  }
}
```

### Adding a Tree Debugger

```typescript
import { WorkflowTreeDebugger } from 'groundswell';

const workflow = new MyWorkflow('Root');
const debugger = new WorkflowTreeDebugger(workflow);

// Subscribe to real-time events
debugger.events.subscribe({
  next: (event) => console.log(event),
});

// Get current tree
const tree = debugger.getTree();
console.log(debugger.toTreeString(tree));

// Find specific node
const node = debugger.getNode('workflow-id-123');
```

---

## Performance Characteristics

### Time Complexity

- **Tree traversal:** O(n) where n = total nodes
- **Node lookup by ID:** O(1) via Map
- **Subtree removal:** O(k) where k = subtree size
- **Tree rebuild from events:** O(e) where e = event count
- **Snapshot creation:** O(f) where f = observed field count

### Space Complexity

- **Workflow tree:** O(n) where n = total nodes
- **Event log per node:** O(e) where e = events for that node
- **Log entries per node:** O(l) where l = logs for that node
- **Debugger node map:** O(n) for O(1) lookups
- **Observer registry:** O(o) where o = observer count

---

## Security Considerations

### Current Security Measures

1. **Redaction:** @ObservedState supports sensitive field redaction (`***`)
2. **Hidden Fields:** @ObservedState supports hiding fields from snapshots
3. **Error Isolation:** Observer failures don't crash workflows
4. **Input Validation:** Zod schema validation for Prompts
5. **Cycle Detection:** Prevents infinite loops in tree traversal

### Future Security Enhancements

1. **PII Detection:** Automatic redaction of sensitive patterns
2. **RBAC:** Role-based access control for debugger API
3. **Audit Logging:** Immutable audit trail for all operations
4. **Secrets Scanning:** Prevent secret leakage in logs/events

---

## Conclusion

The Groundswell codebase is a **mature, production-ready system** that implements almost all PRD requirements. The primary gap is Agent Response standardization, which is a **moderate-effort refactor** with wide-ranging impact but low technical risk.

The architecture follows modern best practices for TypeScript, observability, and workflow orchestration. The codebase is well-tested (36 test files), documented (11 examples), and ready for production use.

**Recommendation:** Proceed with implementing the Agent Response standardization as the primary focus, with optional enhancements to follow.

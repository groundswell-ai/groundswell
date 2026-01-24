# **Delta PRD: Agent Response Model**

**Session ID:** 002_6761e4b84fd1
**Based on:** PRD v1.0 (Session 001_d3bb02af4886)
**Date:** 2026-01-24

---

## **1. Change Summary**

**Change Type:** Medium Feature Addition
**Lines Changed:** ~112 new lines (Section 6), section renumbering, minor documentation updates

### **What Changed:**

1. **NEW: Section 6 - Agent Response Model** (Complete new section)
   - Adds structured JSON response interfaces for agent/workflow outputs
   - Non-negotiable requirement: all agent responses MUST be valid JSON

2. **Section Renumbering:**
   - Previous Section 6 (Snapshot System) → Section 7
   - Previous Section 7 (Observers) → Section 8
   - Previous Section 8 (Decorators) → Section 9
   - Previous Section 9 (Restart Semantics) → Section 10
   - Previous Section 10 (Multi-Error Merging) → Section 11
   - Previous Section 11 (Tree Debugger) → Section 12
   - Previous Section 12 (Base Classes) → Section 13
   - Previous Section 13 (Example Workflow) → Section 14
   - Previous Section 14 (Acceptance Criteria) → Section 15

3. **Minor Update:**
   - Added comment clarifying `trackTiming` default value in `@Step` decorator options

---

## **2. New Requirements**

### **2.1 Agent Response Model (Section 6)**

All agent responses MUST be valid JSON. This is a non-negotiable requirement for:
- System interoperability
- Parsing reliability
- Debugging capability

#### **2.1.1 AgentResponse Interface**

```ts
export type AgentResponseStatus = 'success' | 'error' | 'partial';

export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;
  data: T | null;
  error: AgentErrorDetails | null;
  metadata: AgentResponseMetadata;
}
```

#### **2.1.2 AgentErrorDetails Interface**

```ts
export interface AgentErrorDetails {
  code: string;                    // machine-readable error code (e.g., "VALIDATION_FAILED")
  message: string;                 // human-readable error description
  details?: Record<string, unknown>; // additional context
  recoverable: boolean;            // hint for parent workflow retry logic
}
```

#### **2.1.3 AgentResponseMetadata Interface**

```ts
export interface AgentResponseMetadata {
  agentId: string;                 // ID of the responding agent/workflow
  timestamp: number;               // Unix timestamp (ms)
  duration?: number;               // execution time in ms
  requestId?: string;              // correlation ID for tracing
}
```

#### **2.1.4 Response Requirements**

1. **Strict JSON**: All responses must be parseable by `JSON.parse()` without modification
2. **No Prose Wrapping**: Responses must not be wrapped in markdown code blocks, conversational text, or any non-JSON content
3. **Consistent Structure**: Every response must conform to the `AgentResponse` interface—no ad-hoc formats
4. **Null over Undefined**: Use `null` for absent values; `undefined` is not valid JSON
5. **Error Responses**: Failed operations must still return valid JSON with `status: 'error'` and populated `error` field

#### **2.1.5 Example Responses**

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

**Partial Response (streaming/incremental):**
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

#### **2.1.6 Validation**

Workflows receiving agent responses SHOULD validate against the `AgentResponse` schema before processing. Invalid responses must be treated as errors with code `INVALID_RESPONSE_FORMAT`.

---

## **3. Modified Requirements**

### **3.1 StepOptions Interface (Section 9.1, formerly 8.1)**

Added clarifying comment to `trackTiming` option:

```ts
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean; // Default: true - Track and emit step duration
  logStart?: boolean;
  logFinish?: boolean;
}
```

**Note:** This is a documentation-only change. The implementation already defaulted `trackTiming` to true (as verified in Session 001).

---

## **4. Implementation Plan**

### **Phase 1: Core Type Definitions**

**Milestone 1: Add Agent Response Types**
- Add `AgentResponse<T>`, `AgentResponseStatus`, `AgentErrorDetails`, `AgentResponseMetadata` interfaces to `src/types/`
- Export types from main index

**Milestone 2: Add Response Validator**
- Create `validateAgentResponse()` utility function
- Implement schema validation for required fields
- Return `AgentErrorDetails` with code `INVALID_RESPONSE_FORMAT` for invalid responses

### **Phase 2: Integration with Existing Components**

**Milestone 3: Update WorkflowObserver (if needed)**
- Review `WorkflowObserver` interface for agent response handling
- Add event type for agent responses if needed

**Milestone 4: Update Acceptance Criteria**
- Add "agent response model (all responses MUST be JSON)" to acceptance criteria (already done in PRD)

---

## **5. Task Breakdown**

### **P1.M1.T1: Add Agent Response Type Definitions**
- [ ] Create `src/types/agent-response.ts` with all four interfaces
- [ ] Add JSDoc comments explaining requirements
- [ ] Export from `src/types/index.ts`

### **P1.M1.T2: Implement Response Validation**
- [ ] Create `validateAgentResponse()` utility in appropriate location
- [ ] Implement field validation (status, error, metadata presence)
- [ ] Add type guard `isAgentResponse()`
- [ ] Handle partial responses (optional duration, requestId)

### **P1.M1.T3: Add Unit Tests**
- [ ] Test valid success responses
- [ ] Test valid error responses
- [ ] Test valid partial responses
- [ ] Test invalid responses (missing fields, wrong types, undefined values)
- [ ] Test validation error code generation

---

## **6. Non-Goals**

- This delta does NOT require changes to existing `@Step`, `@Task`, or `@ObservedState` decorators
- This delta does NOT require changes to `Workflow` base class
- This delta does NOT require changes to `WorkflowLogger`
- This delta does NOT implement response serialization/deserialization (only type definitions and validation)

---

## **7. References**

- **Previous Session:** `plan/001_d3bb02af4886/` - All core workflow engine implementation
- **Previous Tasks:** `plan/001_d3bb02af4886/tasks.json` - Completed bug fixes and validations
- **PRD Section 6:** Full specification in `PRD.md` lines 139-247

---

## **8. Acceptance Criteria**

This delta PRD is complete when:

1. All four `AgentResponse*` interfaces are defined and exported
2. `validateAgentResponse()` utility exists and passes unit tests
3. Type guard `isAgentResponse()` exists for runtime checks
4. All new code is covered by tests
5. No existing tests are broken (backward compatibility maintained)

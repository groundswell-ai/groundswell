# Agent.prompt() Call Sites Inventory

**PRP**: P1.M1.T2.S1
**Research Date**: 2026-01-24
**Purpose**: Complete inventory of all Agent.prompt() call sites in the codebase

---

## Executive Summary

Total call sites found: **3 actual implementations** + **5 documentation/examples**

**Distribution**:
- Source code (src/): 2 actual calls
- Examples (examples/): 1 actual call
- Test files (src/__tests__/): 0 actual calls
- Documentation: 5 references

---

## Detailed Call Sites

### 1. Source Code: src/reflection/reflection.ts (Line 267)

**File**: `/home/dustin/projects/groundswell/src/reflection/reflection.ts`
**Line**: 267
**Category**: Workflow Source - Reflection System

```typescript
const response = await this.agent.prompt(reflectionPrompt);
// Handle AgentResponse return type
if (response.status === 'error') {
  return {
    shouldRetry: false,
    reason: `Reflection analysis failed: ${response.error?.message ?? 'Unknown error'}`,
  };
}
// Type assertion: data is non-null when status is not 'error'
const data = response.data;
if (!data) {
  return {
    shouldRetry: false,
    reason: 'Reflection analysis failed: No data returned',
  };
}
```

**Analysis**:
- **ALREADY UPDATED**: This code correctly handles `AgentResponse<T>` return type
- Uses proper error checking with `response.status === 'error'`
- Accesses `response.error?.message` for error details
- Type-safely extracts `response.data` after status check
- **NO CHANGES NEEDED** for this file

---

### 2. Source Code: src/core/workflow-context.ts (Line 295)

**File**: `/home/dustin/projects/groundswell/src/core/workflow-context.ts`
**Line**: 295
**Category**: Workflow Source - Context Management

```typescript
const result = await runInContext(executionContext, () =>
  agent.prompt(newPrompt)
);
```

**Analysis**:
- Returns `AgentResponse<T>` but caller doesn't appear to check status
- Wrapped in `runInContext()` for execution context management
- **MAY NEED UPDATE**: Verify caller handles AgentResponse properly
- Used for dynamic step execution in workflows

---

### 3. Examples: examples/examples/10-introspection.ts (Line 515)

**File**: `/home/dustin/projects/groundswell/examples/examples/10-introspection.ts`
**Line**: 515
**Category**: Example - Documentation (not executable code)

```typescript
// Agent uses tools autonomously to gather context
const analysis = await introspectionAgent.prompt(explorePrompt);
```

**Analysis**:
- This is a **documentation comment** showing expected usage pattern
- Located in a console.log() example output
- Not executable code
- **NEEDS UPDATE**: Update example to show proper AgentResponse handling

---

## Documentation References

### 4. src/decorators/step.ts (Line 79)

**File**: `/home/dustin/projects/groundswell/src/decorators/step.ts`
**Line**: 79
**Category**: Documentation/Comment

```typescript
// Execute the original method within the execution context
// This allows Agent.prompt() calls to automatically capture events
const result = await runInContext(executionContext, async () => {
  return originalMethod.call(this, ...args);
});
```

**Analysis**:
- Comment explaining how Agent.prompt() integrates with decorators
- No actual prompt() call in this code
- **NO CHANGES NEEDED** - documentation only

---

### 5-7. src/core/factory.ts (Lines 57, 81)

**File**: `/home/dustin/projects/groundswell/src/core/factory.ts`
**Lines**: 57, 81
**Category**: API Documentation (JSDoc)

```typescript
/**
 * const result = await agent.prompt(analysisPrompt);
 * ```
```

**Analysis**:
- JSDoc examples showing agent.prompt() usage
- **NEEDS UPDATE**: Update to show AgentResponse handling pattern

---

### 8-9. examples/README.md and examples/index.ts

**File**: `/home/dustin/projects/groundswell/examples/README.md`
**Lines**: 100-104

**File**: `/home/dustin/projects/groundswell/examples/index.ts`
**Lines**: 55, 132

**Analysis**:
- Documentation mentioning Agent.prompt() features
- **NEEDS UPDATE**: Ensure docs reflect new AgentResponse return type

---

## Test Files Analysis

### Finding: Zero Actual Calls in Tests

**Result**: No actual `agent.prompt()` calls found in any test files

**Implications**:
- Tests are not yet written for Agent.prompt() functionality
- Test infrastructure exists (prompt.test.ts, agent-response-factory.test.ts)
- Tests will need to be created/updated to verify AgentResponse handling

**Test Coverage Gaps**:
1. No integration tests for Agent.prompt() in workflow steps
2. No unit tests for error response handling
3. No tests for type guards (isSuccess, isError, isPartial)
4. No tests for metadata extraction from AgentResponse

---

## Call Site Categories

| Category | Count | Files | Status |
|----------|-------|-------|--------|
| **Actual Code - Updated** | 1 | reflection.ts | ✅ Already handles AgentResponse |
| **Actual Code - May Need Update** | 1 | workflow-context.ts | ⚠️ Verify caller handling |
| **Examples - Documentation** | 1 | 10-introspection.ts | 📝 Update example |
| **Documentation** | 5 | factory.ts, step.ts, README, index.ts | 📝 Update docs |
| **Test Code** | 0 | All test files | ❌ Need new tests |

---

## Changes Required by File

### Files Requiring Updates

| File | Type | Change Required | Priority |
|------|------|-----------------|----------|
| `src/core/workflow-context.ts` | Source | Verify AgentResponse handling | High |
| `examples/examples/10-introspection.ts` | Example | Update to show proper handling | Medium |
| `src/core/factory.ts` | Documentation | Update JSDoc examples | Low |
| `examples/README.md` | Documentation | Update examples | Low |
| `examples/index.ts` | Documentation | Update feature list | Low |

### Files Already Compliant

| File | Reason |
|------|--------|
| `src/reflection/reflection.ts` | Already handles AgentResponse with proper error checking |
| `src/decorators/step.ts` | Documentation only, no actual call |

### Files Needing New Tests

| Test Type | Target Coverage |
|-----------|-----------------|
| Integration tests | Agent.prompt() in workflow steps |
| Unit tests | Error response handling |
| Unit tests | Type guard functions |
| Adversarial tests | Edge cases and error conditions |

---

## Key Findings

1. **Low Impact**: Only 2 actual code implementations need verification
2. **Reflection Already Updated**: The reflection.ts file shows proper AgentResponse handling pattern
3. **Test Gap**: No tests exist for Agent.prompt() - major opportunity for test coverage
4. **Documentation Alignment**: Multiple doc files need updating to reflect new API
5. **Example Gap**: Only 1 actual example in codebase, and it's documentation

---

## Next Steps for Implementation

1. **Verify workflow-context.ts**: Check if caller properly handles AgentResponse
2. **Update examples**: Add proper error handling to example code
3. **Update documentation**: Sync all docs with AgentResponse return type
4. **Create tests**: Comprehensive test coverage for Agent.prompt() behavior
5. **Verify reflection.ts pattern**: Use as reference for proper AgentResponse handling

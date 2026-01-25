# Codebase Analysis Summary for P1.M1.T2.S1

**Research Date:** January 25, 2026
**Task:** Analyze Groundswell codebase for parseModelSpec() implementation patterns

## Summary of Findings

### Existing Type Definitions

**File:** `src/types/providers.ts`

1. **ProviderId Type** (lines 8-10)
   ```typescript
   export type ProviderId = 'anthropic' | 'opencode';
   ```

2. **ModelSpec Interface** (lines 150-157)
   ```typescript
   export interface ModelSpec {
     provider: ProviderId;
     model: string;
     raw: string;
   }
   ```

### Codebase Patterns Identified

1. **Error Throwing Pattern** (src/core/workflow.ts:102-105)
   ```typescript
   throw new Error('Workflow name cannot be empty or whitespace only');
   throw new Error('Workflow name cannot exceed 100 characters');
   ```
   - Use descriptive error messages
   - Include specific constraints in message

2. **Default Parameter Pattern** (src/core/agent.ts:95)
   ```typescript
   this.model = config.model ?? 'claude-sonnet-4-20250514';
   ```
   - Nullish coalescing for defaults

3. **String Splitting Pattern** (examples/examples/07-agent-loops.ts:88)
   ```typescript
   const words = input.split(/\s+/).filter((w) => w.length > 0);
   ```
   - Split with limit for controlled parsing

### Test Framework

- **Framework:** Vitest
- **Configuration:** `vitest.config.ts` with `globals: true`
- **Test Command:** `npm test` or `npx vitest run`

**Test Patterns:**
- Describe/it/expect without imports (globals enabled)
- `expect(() => fn()).toThrow(/pattern/)` for error testing
- Arrange-act-assert structure
- Test file naming: `[feature].test.ts`

## Key Files to Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/types/providers.ts` | ProviderId, ModelSpec definitions | 8-10, 150-157 |
| `src/core/workflow.ts` | Error throwing patterns | 102-105, 328-337 |
| `src/core/agent.ts` | Default parameter handling | 95 |
| `vitest.config.ts` | Test configuration | - |

## Implementation Requirements

1. Create `src/utils/model-spec.ts` with `parseModelSpec()` function
2. Create `src/__tests__/unit/utils/model-spec.test.ts` for tests
3. Modify `src/utils/index.ts` to export the function
4. Use type guard pattern for ProviderId validation
5. Follow existing error throwing patterns
6. Comprehensive JSDoc documentation

## Gotchas

1. **Module Resolution:** Imports must use `.js` extension even for `.ts` files
2. **Type Narrowing:** `split()` returns `string[]`, not discriminated types
3. **Type Assertion:** Must validate before using `as ProviderId`
4. **Vitest Globals:** No need to import describe, it, expect

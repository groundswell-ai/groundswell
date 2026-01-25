# P1.M2.T2.S1 Research Summary

## Work Item
Write tests for valid AgentResponse structures

## Key Research Findings

### 1. Existing Test Patterns in Codebase

**Test File Naming**: `*.test.ts` in `src/__tests__/unit/`

**Test Structure Patterns** (from `agent-response-factory.test.ts` and `agent-response-public-api.test.ts`):
- Import pattern: `import { describe, it, expect } from 'vitest';`
- Nested describe blocks for logical grouping
- Clear test descriptions with "should" phrasing
- Factory functions for test data creation
- Type guard testing with type narrowing assertions

**Key Patterns to Follow**:
```typescript
// Import pattern
import { describe, it, expect } from 'vitest';
import { AgentResponseSchema, ... } from '../../types/agent.js';

// Test structure
describe('Feature', () => {
  describe('Scenario', () => {
    it('should do something', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### 2. AgentResponse Structure (from src/types/agent.ts)

**Interface Definition** (lines 161-194):
```typescript
export interface AgentResponse<T = unknown> {
  status: AgentResponseStatus;        // 'success' | 'error' | 'partial'
  data: T | null;                      // PRD 6.4.4: use null for absent
  error: AgentErrorDetails | null;     // PRD 6.4.4: use null for absent
  metadata: AgentResponseMetadata;
}
```

**Zod Schema Factory** (lines 809-832):
```typescript
export function AgentResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  const successSchema = z.object({
    status: z.literal('success'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const errorSchema = z.object({
    status: z.literal('error'),
    data: z.null(),  // PRD 6.4.4: null not undefined
    error: AgentErrorDetailsSchema,
    metadata: AgentResponseMetadataSchema.optional(),
  });

  const partialSchema = z.object({
    status: z.literal('partial'),
    data: dataSchema,
    error: z.null(),  // PRD 6.4.4: null not undefined
    metadata: AgentResponseMetadataSchema.optional(),
  });

  return z.discriminatedUnion('status', [successSchema, errorSchema, partialSchema]);
}
```

### 3. PRD 6.4 Requirements

From `/home/dustin/projects/groundswell/PRD.md` lines 178-184:
1. **Strict JSON**: All responses must be parseable by `JSON.parse()`
2. **No Prose Wrapping**: No markdown code blocks or conversational text
3. **Consistent Structure**: Conform to AgentResponse interface
4. **Null over Undefined**: Use `null` for absent values; `undefined` is not valid JSON
5. **Error Responses**: Failed operations return valid JSON with `status: 'error'`

### 4. External Documentation URLs

**Vitest Documentation**:
- Type Testing: https://vitest.dev/guide/testing-types.html#type-testing
- vi.spyOn: https://vitest.dev/api/vi.html#vispyon
- Expect Matchers: https://vitest.dev/api/expect.html
- Async Testing: https://vitest.dev/guide/testing-types.html#async-testing

**Zod Documentation**:
- Discriminated Unions: https://zod.dev/?id=discriminated-unions
- safeParse(): https://zod.dev/?id=safeparse
- Error Handling: https://github.com/colinhacks/zod#error-handling

**Groundswell-Specific Research Files** (created by external research agent):
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/vitest-zod-testing-guide.md`
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/agent-response-testing-examples.md`
- `/home/dustin/projects/groundswell/plan/002_6761e4b84fd1/docs/vitest-zod-testing-quick-reference.md`

### 5. Test Configuration

**vitest.config.ts**:
```typescript
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
  },
  esbuild: {
    target: 'node18',
  },
});
```

**package.json scripts**:
```json
"test": "vitest run",
"test:watch": "vitest"
```

### 6. Dependencies on Previous Work

**CONTRACT with P1.M2.T1.S2** (Add validation to Agent.prompt() return path):
- This PRP adds `INTERNAL_ERROR` to `AGENT_ERROR_CODES`
- AgentResponseSchema factory is fully implemented
- Schema validation is added to Agent.executePrompt()

**CONTRACT with P1.M2.T1.S1** (Define Zod schemas for AgentResponse types):
- All Zod schemas are defined in src/types/agent.ts
- AgentResponseSchema factory function exists
- All schemas use PRD 6.4.4 null-over-undefined patterns

### 7. Test Cases Required (from Work Item Description)

1. Success response has all required fields
2. Error response has populated error field
3. Metadata always includes agentId and timestamp
4. Null is used instead of undefined
5. All responses are valid JSON (JSON.parse(JSON.stringify(response)) succeeds)

## Research Complete

All necessary context has been gathered for PRP creation.

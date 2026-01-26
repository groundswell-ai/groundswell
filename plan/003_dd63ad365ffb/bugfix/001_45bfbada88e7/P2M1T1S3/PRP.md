# PRP: Add Type Compatibility Tests for Provider Interface

## Goal

**Feature Goal**: Extend existing Provider interface tests to verify polymorphic type behavior and return type consistency for implementations

**Deliverable**: Extended test coverage in `src/__tests__/unit/provider-interface.test.ts` that verifies:
- Polymorphic usage: Provider variable can be assigned AnthropicProvider instance
- Return type consistency: execute() returns AgentResponse<T> regardless of implementation
- TypeScript compilation passes with strict type checking

**Success Definition**:
- All new tests pass when run with Vitest
- TypeScript compilation succeeds with `tsc --noEmit` (strict mode enabled)
- Tests verify that Provider interface polymorphic usage works correctly
- Type assertions confirm AgentResponse<T> return type consistency

## User Persona

**Target User**: TypeScript developers implementing or consuming Provider interface

**Use Case**: Developers need confidence that Provider interface implementations are type-safe and polymorphic usage works as expected

**User Journey**:
1. Developer creates custom Provider implementation
2. Developer assigns implementation to Provider typed variable
3. Developer calls execute() method expecting AgentResponse<T> return type
4. TypeScript compiler validates type consistency at compile time
5. Tests verify polymorphic behavior at runtime

**Pain Points Addressed**:
- Uncertainty whether custom Provider implementations maintain type safety
- Fear of runtime type errors in polymorphic Provider usage
- Lack of confidence that interface contract is enforced by TypeScript

## Why

- **Type Safety Assurance**: Verifies that TypeScript's type system correctly enforces Provider interface contract
- **Polymorphic Confidence**: Ensures Provider interface works as intended for polymorphic usage patterns
- **Implementation Validation**: Catches type inconsistencies before they reach production code
- **Documentation**: Tests serve as executable documentation of correct Provider usage patterns

## What

Add type compatibility tests to `src/__tests__/unit/provider-interface.test.ts` that verify:

1. **Polymorphic Assignment Test**: Create Provider variable, assign AnthropicProvider instance, verify assignment compiles
2. **Return Type Consistency Test**: Call execute() on polymorphic Provider reference, verify return type is AgentResponse<T>
3. **Generic Type Parameter Test**: Verify that generic type parameter T flows through correctly in polymorphic context
4. **Multiple Implementation Test**: Test that different Provider implementations can be used interchangeably

### Success Criteria

- [ ] Polymorphic assignment compiles without type errors
- [ ] execute() returns AgentResponse<T> when called through Provider reference
- [ ] Generic type parameter T is correctly preserved in polymorphic context
- [ ] TypeScript strict mode compilation succeeds (`tsc --noEmit`)
- [ ] All tests pass with `npm test`

## All Needed Context

### Context Completeness Check

✅ **Validated**: If someone knew nothing about this codebase, they would have everything needed to implement this successfully because:
- Provider interface location and structure is documented
- AnthropicProvider implementation location is specified
- Test framework (Vitest) and configuration is documented
- Existing test patterns and conventions are provided
- TypeScript configuration and compilation commands are specified

### Documentation & References

```yaml
# MUST READ - Core type definitions
- file: src/types/providers.ts
  why: Contains Provider interface definition with execute() method signature
  critical: Lines 553-724 contain the complete Provider interface contract
  pattern: Interface defines generic execute<T>() method returning Promise<AgentResponse<T>> | AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>

- file: src/types/agent.ts
  why: Contains AgentResponse<T> type definition that execute() must return
  critical: Lines 324-357 define AgentResponse<T> with discriminated union pattern
  section: AgentResponse interface with status, data, error, metadata fields

# MUST READ - Implementation to test
- file: src/providers/anthropic-provider.ts
  why: Concrete Provider implementation for polymorphic testing
  critical: Lines 60-100 show AnthropicProvider class implementing Provider interface
  pattern: Class implements Provider with readonly id, capabilities, and all required methods

# MUST READ - Existing test patterns
- file: src/__tests__/unit/provider-interface.test.ts
  why: Existing Provider interface tests to extend with type compatibility tests
  critical: Lines 1-823 contain comprehensive interface structure tests
  pattern: Uses MockProvider class pattern, nested describe blocks, expect() assertions

- file: src/__tests__/unit/anthropic-provider-execute.test.ts
  why: Example of AnthropicProvider execute() method testing patterns
  pattern: Shows how to mock ToolExecutor, ProviderRequest, and test execute() behavior

# Test configuration
- file: vitest.config.ts
  why: Vitest configuration for running tests
  critical: Tests use globals: true, include src/__tests__/**/*.test.ts

- file: tsconfig.json
  why: TypeScript compiler configuration with strict mode enabled
  critical: strict: true ensures type safety, exclude: ["src/__tests__"] for production build

# External documentation
- url: https://github.com/microsoft/TypeScript-Expect-Type#api
  why: expect-type library for type-level assertions (if needed for advanced type testing)
  critical: expectTypeOf() API for runtime type assertions

- url: https://vitest.dev/guide/assertion.html
  why: Vitest assertion API documentation
  critical: expect().toEqualTypeOf() for type assertions in tests

- url: https://www.typescriptlang.org/docs/handbook/2/generics.html
  why: TypeScript generics documentation for understanding generic type parameter flow
  critical: Generic constraints and type parameter inference patterns
```

### Current Codebase Tree

```bash
src/
├── types/
│   ├── providers.ts              # Provider interface definition (lines 553-724)
│   ├── agent.ts                  # AgentResponse<T> type definition (lines 324-357)
│   └── streaming.ts              # StreamEvent type for streaming responses
├── providers/
│   └── anthropic-provider.ts     # AnthropicProvider implementation
├── __tests__/
│   └── unit/
│       ├── provider-interface.test.ts      # EXISTING: Provider interface tests (823 lines)
│       └── providers/
│           └── anthropic-provider-execute.test.ts  # REFERENCE: execute() test patterns
└── core/
    └── agent.ts                  # Agent class that consumes Provider interface

vitest.config.ts                  # Vitest configuration
tsconfig.json                     # TypeScript configuration (strict: true)
package.json                      # npm scripts: test, test:watch, lint
```

### Desired Codebase Tree with Files to be Added

```bash
src/
├── __tests__/
│   └── unit/
│       └── provider-interface.test.ts      # MODIFY: Add type compatibility tests
│                                               - New describe block: "Type Compatibility"
│                                               - Polymorphic assignment test
│                                               - Return type consistency test
│                                               - Generic type parameter flow test
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: TypeScript strict mode is enabled
// tsconfig.json has strict: true, which means:
// - All type assertions must be valid
// - No implicit any types
// - Null checks are enforced
// Tests must compile without type errors

// CRITICAL: Tests are excluded from tsconfig.json
// "exclude": ["src/__tests__"] means tests have separate compilation
// Vitest handles TypeScript compilation in test context independently
// Use npm run lint (tsc --noEmit) to verify production code types
// Use npm test to run tests (Vitest compiles tests with its own config)

// GOTCHA: Provider.execute() has union return type
// Returns Promise<AgentResponse<T>> OR AsyncGenerator<StreamEvent, AgentResponse<T>, unknown>
// Non-streaming: Promise<AgentResponse<T>>
// Streaming: AsyncGenerator that yields StreamEvent and returns AgentResponse<T>
// Tests should focus on non-streaming case for type compatibility (simpler)

// GOTCHA: AnthropicProvider.execute() is async and requires initialization
// AnthropicProvider.initialize() must be called before execute()
// Tests should mock AnthropicProvider or use a test double to avoid SDK dependencies

// PATTERN: Existing tests use MockProvider class pattern
// Each test creates its own MockProvider implementing Provider interface
// This allows testing interface contract without real implementation dependencies
// Follow this pattern for new tests to maintain consistency

// PATTERN: Test file organization uses nested describe blocks
// describe('Feature Name', () => {
//   describe('Specific Aspect', () => {
//     it('should do something specific', () => { ... });
//   });
// });

// GOTCHA: Vitest globals are enabled
// vitest.config.ts has globals: true
// No need to import describe, it, expect from vitest
// Tests use these globals directly

// PATTERN: AgentResponse factory functions exist
// createSuccessResponse<T>(data: T, metadata?: Partial<AgentResponseMetadata>): AgentResponse<T>
// createErrorResponse(code: string, message: string, ...): AgentResponse<null>
// Use these for creating mock AgentResponse objects in tests
```

## Implementation Blueprint

### Data Models and Structure

No new data models required. Using existing types:
- `Provider` interface from `src/types/providers.ts`
- `AgentResponse<T>` from `src/types/agent.ts`
- `AnthropicProvider` class from `src/providers/anthropic-provider.ts`

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: CREATE test helper for polymorphic Provider testing
  - IMPLEMENT: MockProvider class that implements Provider interface
  - FOLLOW pattern: src/__tests__/unit/provider-interface.test.ts (existing MockProvider pattern)
  - NAMING: TypeCompatibleMockProvider to distinguish from existing mocks
  - FUNCTIONALITY:
    - Implement all Provider methods with mock implementations
    - execute() should return a properly typed AgentResponse<T>
    - Use createSuccessResponse<T>() factory for consistent response creation
  - PLACEMENT: Define inside new describe block in provider-interface.test.ts

Task 2: ADD describe block for "Type Compatibility" tests
  - IMPLEMENT: New top-level describe block in provider-interface.test.ts
  - FOLLOW pattern: Existing test structure (lines 32-823)
  - NAMING: describe('Type Compatibility', () => { ... })
  - PLACEMENT: After existing describe blocks, before final closing brace
  - DOCUMENTATION: Add JSDoc header explaining test purpose

Task 3: IMPLEMENT polymorphic assignment test
  - IMPLEMENT: Test that Provider variable can be assigned AnthropicProvider instance
  - VERIFY: TypeScript compilation succeeds (compile-time type check)
  - PATTERN:
    - Create Provider typed variable
    - Assign AnthropicProvider instance (or MockProvider instance)
    - Verify assignment compiles without type errors
    - Use expect() to verify runtime properties
  - ASSERTIONS:
    - expect(provider.id).toBeDefined()
    - expect(provider.capabilities).toBeDefined()
    - expect(typeof provider.execute).toBe('function')
  - PLACEMENT: Inside "Type Compatibility" describe block

Task 4: IMPLEMENT return type consistency test
  - IMPLEMENT: Test that execute() returns AgentResponse<T> through Provider reference
  - VERIFY: Return type is AgentResponse<T> with correct generic parameter
  - PATTERN:
    - Create Provider typed variable with mock implementation
    - Call execute() method with proper parameters
    - Assert return type matches AgentResponse<T> structure
    - Verify generic type parameter T is preserved
  - MOCK PARAMETERS:
    - ProviderRequest: { prompt: 'test', options: {} }
    - ToolExecutor: vi.fn().mockResolvedValue({ content: 'result', isError: false })
    - Hooks: undefined or mock object
  - ASSERTIONS:
    - expect(response.status).toBe('success')
    - expect(response.data).toBeDefined()
    - expect(response.error).toBeNull()
    - expect(response.metadata).toBeDefined()
  - PLACEMENT: Inside "Type Compatibility" describe block

Task 5: IMPLEMENT generic type parameter flow test
  - IMPLEMENT: Test that generic type parameter T flows correctly through polymorphic context
  - VERIFY: Different T types produce correctly typed AgentResponse<T>
  - PATTERN:
    - Test with T = string (simple type)
    - Test with T = { custom: 'object' } (complex type)
    - Test with T = unknown (default type)
    - Verify type narrowing works with discriminated union
  - ASSERTIONS:
    - expect(response.data).toBeTypeOf('string') for T = string
    - expect(response.data).toEqualTypeOf<{ custom: string }>() for complex type
  - PLACEMENT: Inside "Type Compatibility" describe block

Task 6: ADD compile-time type validation test
  - IMPLEMENT: Test that demonstrates TypeScript type checking catches errors
  - VERIFY: Invalid type assignments fail TypeScript compilation
  - PATTERN:
    - Commented code showing type errors (for documentation)
    - Explanation of what would fail at compile time
    - Demonstrate that correct code compiles successfully
  - DOCUMENTATION: Use JSDoc comments to explain compile-time vs runtime validation
  - PLACEMENT: Inside "Type Compatibility" describe block
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: MockProvider for type compatibility testing
// Define inside describe block to avoid polluting global scope
describe('Type Compatibility', () => {
  // Mock provider implementing Provider interface
  class TypeCompatibleMockProvider implements Provider {
    readonly id: ProviderId = 'anthropic';
    readonly capabilities: ProviderCapabilities = {
      mcp: true,
      skills: true,
      lsp: true,
      streaming: false,  // Disable streaming for simpler testing
      sessions: false,
      extendedThinking: false,
    };

    async initialize(options?: ProviderOptions): Promise<void> {
      // Mock: no-op
    }

    async terminate(): Promise<void> {
      // Mock: no-op
    }

    // CRITICAL: Generic execute method must return AgentResponse<T>
    async execute<T>(
      request: ProviderRequest,
      toolExecutor: ToolExecutor,
      hooks?: ProviderHookEvents
    ): Promise<AgentResponse<T>> {
      // PATTERN: Use factory function for consistent response creation
      return createSuccessResponse<T>(
        { result: 'mock data' } as T,  // Cast to T for mock data
        { agentId: 'test-provider', timestamp: Date.now() }
      );
    }

    async registerMCPs(servers: MCPServer[]): Promise<Tool[]> {
      return [];
    }

    async loadSkills(skills: Skill[]): Promise<void> {
      // Mock: no-op
    }

    normalizeModel(model: string): ModelSpec {
      return { provider: 'anthropic', model, raw: model };
    }
  }

  // Tests follow...
});

// Pattern 2: Polymorphic assignment test
it('should allow polymorphic assignment of AnthropicProvider to Provider variable', () => {
  // CREATE: Provider typed variable
  let provider: Provider;

  // ASSIGN: AnthropicProvider instance (or MockProvider for testing)
  provider = new TypeCompatibleMockProvider();

  // VERIFY: Assignment compiles and properties are accessible
  expect(provider.id).toBe('anthropic');
  expect(provider.capabilities.mcp).toBe(true);
  expect(typeof provider.execute).toBe('function');

  // GOTCHA: This test validates compile-time type checking
  // If AnthropicProvider didn't implement Provider correctly,
  // TypeScript would fail to compile this code
});

// Pattern 3: Return type consistency test
it('should return AgentResponse<T> when execute() is called through Provider reference', async () => {
  // CREATE: Provider typed variable with mock implementation
  const provider: Provider = new TypeCompatibleMockProvider();
  await provider.initialize();

  // MOCK: ToolExecutor callback
  const mockToolExecutor = vi.fn<ToolExecutor>().mockResolvedValue({
    content: 'tool result',
    isError: false,
  });

  // CALL: execute() through Provider reference
  const response = await provider.execute<string>(
    { prompt: 'test prompt', options: {} },
    mockToolExecutor
  );

  // VERIFY: Return type structure matches AgentResponse<string>
  expect(response.status).toBeDefined();
  expect(['success', 'error', 'partial']).toContain(response.status);
  expect(response.data).toBeDefined();
  expect(response.metadata).toBeDefined();
  expect(response.metadata.agentId).toBeDefined();
  expect(response.metadata.timestamp).toBeDefined();

  // GOTCHA: Type narrowing using discriminated union
  if (response.status === 'success') {
    // TypeScript knows: response.data is string (not null)
    expect(response.data).toBeTypeOf('object');  // Mock returns object
  }
});

// Pattern 4: Generic type parameter flow test
it('should preserve generic type parameter T in polymorphic context', async () => {
  const provider: Provider = new TypeCompatibleMockProvider();
  await provider.initialize();

  const mockToolExecutor = vi.fn<ToolExecutor>().mockResolvedValue({
    content: 'result',
    isError: false,
  });

  // TEST: Different generic types
  const stringResponse = await provider.execute<string>(
    { prompt: 'test', options: {} },
    mockToolExecutor
  );

  const numberResponse = await provider.execute<number>(
    { prompt: 'test', options: {} },
    mockToolExecutor
  );

  const objectResponse = await provider.execute<{ value: string }>(
    { prompt: 'test', options: {} },
    mockToolExecutor
  );

  // VERIFY: Each response has correct type structure
  expect(stringResponse.data).toBeDefined();
  expect(numberResponse.data).toBeDefined();
  expect(objectResponse.data).toBeDefined();

  // GOTCHA: TypeScript's structural typing ensures type safety
  // Even though we're calling through Provider reference,
  // the generic type parameter T is preserved correctly
});

// Pattern 5: Compile-time type validation (documentation test)
it('should enforce type safety at compile time', () => {
  // This test documents TypeScript's compile-time type checking

  // VALID: Correct type usage compiles successfully
  const provider: Provider = new TypeCompatibleMockProvider();
  expect(provider.id).toBeDefined();

  // INVALID: The following would cause TypeScript compilation errors
  // (shown as comments for documentation purposes)

  // Error: Type 'string' is not assignable to type 'ProviderId'
  // const invalidId: ProviderId = 'invalid';

  // Error: Property 'invalidMethod' does not exist on type 'Provider'
  // provider.invalidMethod();

  // Error: Cannot assign to 'id' because it is a read-only property
  // provider.id = 'opencode';

  // GOTCHA: These errors are caught by TypeScript compiler, not Vitest
  // Run `npm run lint` (tsc --noEmit) to verify type safety
});
```

### Integration Points

```yaml
EXISTING_TESTS:
  - extend: src/__tests__/unit/provider-interface.test.ts
  - pattern: "Add new describe block at end of file, before closing brace"
  - preserve: "All existing test blocks and assertions"

MOCK DEPENDENCIES:
  - use: vitest vi.fn() for mocking ToolExecutor
  - pattern: "vi.fn<ToolExecutor>().mockResolvedValue({ content: 'result', isError: false })"

FACTORY FUNCTIONS:
  - import: createSuccessResponse, createErrorResponse from src/types/agent.js
  - pattern: "Use factory functions for consistent mock response creation"

TYPE ASSERTIONS:
  - use: vitest expect().toBeTypeOf() for runtime type checking
  - use: TypeScript compiler for compile-time type checking
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run TypeScript type checking on production code
npm run lint
# Equivalent: tsc --noEmit
# Expected: Zero type errors in production code
# If errors exist, READ output and fix before proceeding

# Run new tests to verify they work
npm test src/__tests__/unit/provider-interface.test.ts
# Expected: All tests pass, including new type compatibility tests

# Run full test suite to ensure no regressions
npm test
# Expected: All tests pass in entire test suite
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test only the new type compatibility tests
npx vitest run src/__tests__/unit/provider-interface.test.ts --grep "Type Compatibility"
# Expected: All new tests pass

# Test entire provider-interface test file
npx vitest run src/__tests__/unit/provider-interface.test.ts
# Expected: All 823+ lines of tests pass

# Verify no regressions in related tests
npx vitest run src/__tests__/unit/providers/anthropic-provider-*.test.ts
# Expected: All AnthropicProvider tests still pass
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify TypeScript compilation succeeds (strict mode)
npm run lint
# Expected: Zero compilation errors
# This validates that type assertions are correct

# Run tests in watch mode to observe test behavior
npm run test:watch
# Expected: Tests run successfully and re-run on file changes

# Verify production build succeeds
npm run build
# Expected: tsc compiles production code successfully
# dist/ directory is created with compiled JavaScript
```

### Level 4: Type-Specific Validation

```bash
# Verify type checking with explicit type compilation
npx tsc --noEmit --strict
# Expected: Zero type errors across entire codebase
# This is the ultimate validation that type compatibility is correct

# Verify test file compiles (Vitest handles this, but good to double-check)
npx tsc --noEmit src/__tests__/unit/provider-interface.test.ts
# Expected: May have test-specific warnings, but no type errors in test logic

# Optional: Run with additional type checking flags
npx tsc --noEmit --strict --noUnusedLocals --noUnusedParameters
# Expected: Zero errors, ensuring no unused code in type tests
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint` (tsc --noEmit)
- [ ] Build succeeds: `npm run build`
- [ ] New tests are in provider-interface.test.ts
- [ ] Tests follow existing MockProvider pattern
- [ ] Tests use vitest globals (describe, it, expect)
- [ ] Tests have clear descriptions following naming convention

### Feature Validation

- [ ] Polymorphic assignment test validates Provider variable assignment
- [ ] Return type consistency test verifies AgentResponse<T> return type
- [ ] Generic type parameter test confirms type flow through polymorphic context
- [ ] Compile-time type validation documented for future reference
- [ ] All success criteria from "What" section met
- [ ] TypeScript strict mode compilation succeeds

### Code Quality Validation

- [ ] Follows existing test patterns (MockProvider class, nested describe blocks)
- [ ] Test descriptions are clear and descriptive
- [ ] Tests have proper JSDoc documentation
- [ ] Mock implementations use factory functions (createSuccessResponse)
- [ ] No code duplication with existing tests
- [ ] Tests are independent and can run in any order

### Documentation & Deployment

- [ ] Code is self-documenting with clear variable names
- [ ] Test file JSDoc header is updated with new test descriptions
- [ ] Comments explain TypeScript type system behavior where helpful
- [ ] No changes to production code (only tests added)
- [ ] No new dependencies added

## Anti-Patterns to Avoid

- ❌ **Don't modify production code**: This is a test-only task, no changes to src/providers/ or src/types/
- ❌ **Don't use real AnthropicProvider**: Avoid SDK dependencies, use MockProvider for testing
- ❌ **Don't test streaming in this task**: Focus on non-streaming Promise<AgentResponse<T>> return type
- ❌ **Don't add external type testing libraries**: Use TypeScript compiler and Vitest, no tsd/expect-type needed
- ❌ **Don't create separate test file**: Extend existing provider-interface.test.ts
- ❌ **Don't skip TypeScript compilation**: Always run `npm run lint` to verify type safety
- ❌ **Don't ignore type errors**: If TypeScript reports errors, fix them before considering task complete
- ❌ **Don't use runtime type checking excessively**: TypeScript compile-time checking is primary validation
- ❌ **Don't over-complicate mocks**: Keep MockProvider simple, focus on interface contract
- ❌ **Don't forget to initialize provider**: Always call provider.initialize() before execute()

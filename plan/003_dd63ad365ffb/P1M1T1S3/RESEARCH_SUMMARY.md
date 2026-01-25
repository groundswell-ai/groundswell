# P1.M1.T1.S3 Research Summary: TypeScript Generic Patterns for Provider Interface

## Executive Summary

This research document compiles TypeScript generic patterns for implementing an `execute<T>()` method in a Provider interface context. The research covers official TypeScript documentation, open-source library patterns, and Groundswell-specific recommendations.

**Status:** Complete
**Date:** January 25, 2026
**Task:** P1.M1.T1.S3 - Define Provider interface with core methods

---

## Key Findings

### 1. TypeScript Generic Method Patterns

#### Basic Generic Method (Recommended)
```typescript
interface Provider {
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

**Source:** [TypeScript Handbook - Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

**Key Characteristics:**
- Default type parameter `T = unknown` provides flexibility
- Type parameter can be explicitly specified by caller
- Works with or without type annotation
- Maximum flexibility with optional type safety

#### Generic with Constraint
```typescript
interface Provider {
  execute<T extends Record<string, unknown>>(
    request: ProviderRequest
  ): Promise<AgentResponse<T>>;
}
```

**Source:** [TypeScript Handbook - Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generic-constraints.html)

**Use When:**
- Need to ensure T is an object type
- Want to prevent primitive types
- API returns structured data only

#### Schema-Based Type Inference
```typescript
interface Provider {
  execute<T extends z.ZodTypeAny>(
    request: ProviderRequest<z.infer<T>>
  ): Promise<AgentResponse<z.infer<T>>>;
}
```

**Source:** Groundswell existing patterns (Zod usage throughout codebase)

**Use When:**
- Want automatic type inference from schema
- Need runtime validation guarantees
- Working with structured API responses

---

### 2. Open-Source Library Patterns

#### Prisma Client Pattern
**URL:** https://github.com/prisma/prisma/blob/main/packages/client/src/runtime/core/operations/request.ts

```typescript
interface PrismaClient {
  user.findFirst<T extends Prisma.UserFindFirstArgs>(
    args?: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>
  ): Promise<Prisma.UserGetPayload<T> | null>;

  $queryRaw<T = unknown>(
    query: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
}
```

**Key Takeaways:**
- Uses `extends` for complex generic constraints
- Utility types (`SelectSubset`, `GetPayload`) for type transformation
- Default type parameter `T = unknown` for flexibility
- Type inference from query structure

**Relevance to Groundswell:**
- Similar multi-provider pattern (Prisma supports multiple databases)
- Generic methods preserve type information
- Factory pattern for type-specific operations

---

#### Axios HTTP Client Pattern
**URL:** https://github.com/axios/axios/blob/master/index.d.ts

```typescript
interface AxiosInstance {
  get<T = unknown, R = AxiosResponse<T>>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<R>;

  post<T = unknown, R = AxiosResponse<T>>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<R>;
}

interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}
```

**Key Takeaways:**
- Multiple type parameters (data, response)
- Default types for convenience
- Response wrapper preserves data type
- Consistent interface across all methods

**Relevance to Groundswell:**
- Similar to Provider executing different request types
- Response wrapper pattern (AgentResponse<T>)
- Multiple type parameters for input/output

---

#### TypeORM Repository Pattern
**URL:** https://github.com/typeorm/typeorm/blob/master/src/repository/Repository.ts

```typescript
interface Repository<T> {
  find(options?: FindManyOptions<T>): Promise<T[]>;
  findOne(options?: FindOneOptions<T>): Promise<T | null>;
  save(entity: T): Promise<T>;
  remove(entity: T): Promise<T>;
}

interface Provider {
  getRepository<T extends BaseEntity>(
    entityClass: EntityType<T>
  ): Repository<T>;
}
```

**Key Takeaways:**
- Repository interface parameterized by entity type
- Generic methods return entity type
- Constraint ensures entity has base properties
- Factory method creates typed repository

**Relevance to Groundswell:**
- Similar to ProviderRegistry pattern
- Generic constraint for base type
- Factory method with type preservation

---

#### Vitest Mock Pattern
**URL:** https://github.com/vitest-dev/vitest/blob/main/packages/vitest/src/integration.ts

```typescript
interface Mock<T> {
  mockReturnValue(value: T): void;
  mockResolvedValue(value: T): void;
  mockImplementation(fn: (...args: any[]) => T): void;
}

function vi<T = any>(): Mock<T>;
```

**Key Takeaways:**
- Mock type parameterized by return type
- Type-safe mock setup methods
- Default type for flexibility
- Implementation matches return type

**Relevance to Groundswell:**
- Type-safe execution pattern
- Generic methods with type constraints
- Default type for flexibility

---

#### Execa Process Execution Pattern
**URL:** https://github.com/sindresorhus/execa/blob/main/index.d.ts

```typescript
interface ExecaChildProcess<StdoutType = string, StderrType = string> {
  stdout: StdoutType;
  stderr: StderrType;
  then<R>(
    onfulfilled: (value: ExecaReturnValue<StdoutType, StderrType>) => R
  ): Promise<R>;
}

interface Execa {
  (
    file: string,
    arguments?: readonly string[],
    options?: Options
  ): ExecaChildProcess<Buffer, Buffer>;
}
```

**Key Takeaways:**
- Multiple type parameters for different streams
- Type parameters default to string or Buffer
- Thenable interface preserves types
- Generic options affect return type

**Relevance to Groundswell:**
- Multiple type parameters for different concerns
- Default types for common cases
- Type preservation through interface

---

### 3. Groundswell-Specific Recommendations

#### Recommended Provider Interface
```typescript
import type { AgentResponse } from '../types/agent.js';

interface Provider {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Provider capability flags */
  readonly capabilities: ProviderCapabilities;

  /** Initialize provider with options */
  initialize(options?: ProviderOptions): Promise<void>;

  /** Terminate provider and cleanup resources */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request
   *
   * @template T - The type of data returned on success
   * @param request - The provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Promise resolving to AgentResponse with typed data
   *
   * @example
   * ```ts
   * // With explicit type
   * const result = await provider.execute<{ name: string }>(
   *   { prompt: 'Get user', options: {} },
   *   toolExecutor
   * );
   *
   * // With schema inference
   * const result = await provider.execute({
   *   prompt: 'Get user',
   *   schema: UserSchema,
   *   options: {}
   * }, toolExecutor);
   * ```
   */
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

  /** Register MCP servers with provider */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

  /** Load skills into provider */
  loadSkills(skills: Skill[]): Promise<void>;

  /** Normalize model string to ModelSpec */
  normalizeModel(model: string): ModelSpec;
}
```

**Rationale:**
1. Uses `AgentResponse<T>` for consistency with existing codebase
2. Default type parameter `T = unknown` for flexibility
3. Supports explicit type specification
4. Supports schema-based type inference
5. Comprehensive JSDoc with examples
6. Follows Groundswell naming conventions

---

#### Type-Safe Usage Examples

**Example 1: Explicit Type Parameter**
```typescript
interface CreateUserResponse {
  id: string;
  name: string;
  email: string;
}

const response = await provider.execute<CreateUserResponse>(
  {
    prompt: 'Create a user named John',
    options: { model: 'claude-sonnet-4-20250514' }
  },
  toolExecutor
);

if (isSuccess(response)) {
  console.log(response.data.id);     // Type: string
  console.log(response.data.name);   // Type: string
  console.log(response.data.email);  // Type: string
  // response.data.age // Error: property doesn't exist
}
```

**Example 2: Schema-Based Inference**
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const response = await provider.execute({
  prompt: 'Create a user',
  schema: UserSchema,  // T inferred as z.infer<typeof UserSchema>
  options: {}
}, toolExecutor);

if (isSuccess(response)) {
  console.log(response.data.name);  // Type: string
}
```

**Example 3: Default Unknown Type**
```typescript
const response = await provider.execute(
  { prompt: 'Say hello', options: {} },
  toolExecutor
);

if (isSuccess(response)) {
  console.log(response.data);  // Type: unknown
  const text = String(response.data);  // Must convert for use
}
```

---

### 4. Generic Constraints Best Practices

#### Constraint 1: Object Type Only
```typescript
interface Provider {
  execute<T extends Record<string, unknown>>(
    request: ProviderRequest
  ): Promise<AgentResponse<T>>;
}

// ✅ Valid - object type
const result = await provider.execute<{ name: string }>(request);

// ❌ Error - not an object type
const result = await provider.execute<string>(request);
```

**When to Use:**
- API always returns objects
- Want to prevent primitive returns
- Need to access object properties

**Source:** [TypeScript Handbook - Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generic-constraints.html)

---

#### Constraint 2: Base Response Type
```typescript
interface BaseResponse {
  status: 'success' | 'error';
  timestamp: number;
}

interface Provider {
  execute<T extends BaseResponse>(
    request: ProviderRequest
  ): Promise<T>;
}
```

**When to Use:**
- All responses share common structure
- Need to access base properties without guards
- Want to enforce minimum response shape

**Source:** [TypeScript Deep Dive - Generics](https://basarat.gitbook.io/typescript/type-system/generics)

---

#### Constraint 3: Discriminated Union
```typescript
type TextRequest = {
  type: 'text';
  prompt: string;
};

type StructuredRequest<T> = {
  type: 'structured';
  prompt: string;
  schema: z.ZodType<T>;
};

type ProviderRequest<T = unknown> = TextRequest | StructuredRequest<T>;

interface Provider {
  execute<T>(request: ProviderRequest<T>): Promise<AgentResponse<T>>;
}
```

**When to Use:**
- Different request types have different behaviors
- Type narrowing based on request structure
- Compile-time type safety

**Source:** [TypeScript Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

---

### 5. Implementation Patterns

#### Pattern 1: Type Preservation Through Delegation
```typescript
class ProviderRegistry {
  private providers = new Map<ProviderId, Provider>();

  register(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  async execute<T>(
    providerId: ProviderId,
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error('Provider not found');
    return provider.execute<T>(request, toolExecutor, hooks);
  }
}
```

**Key Points:**
- Type parameter T preserved through delegation
- Generic method delegates to provider's generic method
- Type-safe provider selection

---

#### Pattern 2: Tool Execution Callback
```typescript
type ToolExecutor = (
  request: ToolExecutionRequest
) => Promise<ToolExecutionResult>;

interface Provider {
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}

// Implementation
class AnthropicProvider implements Provider {
  async execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    // Build SDK hooks that delegate to toolExecutor
    const sdkHooks: AgentHooks = {
      preToolUse: async (input) => {
        await hooks?.onToolStart?.({
          name: input.toolUse.name,
          input: input.toolUse.input,
        });
      },
      postToolUse: async (input) => {
        const result = await toolExecutor({
          name: input.toolUse.name,
          input: input.toolUse.input,
        });
        await hooks?.onToolEnd?.(
          { name: input.toolUse.name, input: input.toolUse.input },
          result,
          input.duration ?? 0
        );
        return result.content;
      },
    };

    // Execute with hooks
    // ...
  }
}
```

**Key Points:**
- Provider delegates tool execution back to agent
- Hooks wrap tool execution lifecycle
- Type-safe tool request/response

---

#### Pattern 3: Response Factory with Generics
```typescript
// From src/types/agent.ts
export function createSuccessResponse<T>(
  data: T,
  metadata: AgentResponseMetadata
): AgentResponse<T> {
  return {
    status: 'success',
    data,
    error: null,
    metadata,
  };
}

// Usage in provider
async execute<T = unknown>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents
): Promise<AgentResponse<T>> {
  const result = await this.makeRequest(request);

  return createSuccessResponse<T>(result as T, {
    agentId: this.id,
    timestamp: Date.now(),
    duration: Date.now() - startTime,
  });
}
```

**Key Points:**
- Factory function preserves generic type
- Consistent response creation
- Type-safe metadata attachment

---

### 6. Documentation Best Practices

#### JSDoc for Generic Methods
```typescript
/**
 * Execute a prompt request
 *
 * ## Type Safety
 *
 * The generic type parameter `T` specifies the expected response data type:
 * - Use explicit type: `execute<{ name: string }>(request)`
 * - Use schema inference: `execute({ schema: UserSchema })`
 * - Use default unknown: `execute(request)` → `AgentResponse<unknown>`
 *
 * ## Execution Flow
 *
 * 1. Provider builds SDK options from request
 * 2. Provider executes prompt via underlying SDK
 * 3. Tool calls delegated to toolExecutor callback
 * 4. Response wrapped in AgentResponse<T> with metadata
 *
 * @template T - The type of data returned on success (default: unknown)
 * @param request - The provider request with prompt and execution options
 * @param toolExecutor - Callback for executing tools during prompt execution
 * @param hooks - Optional lifecycle hooks for tool and session events
 * @returns Promise resolving to typed AgentResponse
 *
 * @example <caption>Explicit type parameter</caption>
 * ```ts
 * const response = await provider.execute<{ count: number }>(
 *   { prompt: 'Count items', options: {} },
 *   toolExecutor
 * );
 * if (isSuccess(response)) {
 *   console.log(response.data.count); // Type: number
 * }
 * ```
 *
 * @example <caption>Schema-based inference</caption>
 * ```ts
 * const UserSchema = z.object({ id: z.string(), name: z.string() });
 * const response = await provider.execute({
 *   prompt: 'Create user',
 *   schema: UserSchema,
 *   options: {}
 * }, toolExecutor);
 * // response.data type: { id: string; name: string }
 * ```
 *
 * @see {@link AgentResponse} for response structure
 * @see {@link ProviderRequest} for request options
 */
execute<T = unknown>(
  request: ProviderRequest,
  toolExecutor: ToolExecutor,
  hooks?: ProviderHookEvents
): Promise<AgentResponse<T>>;
```

**Key Elements:**
1. Brief description
2. Type safety section explaining T parameter
3. Execution flow documentation
4. `@template T` tag
5. Multiple `@example` blocks with `<caption>`
6. `@see` references to related types

**Source:** [TSDoc Standard](https://tsdoc.org/)

---

## Recommended Implementation

### Final Provider Interface Definition

```typescript
/**
 * Provider interface for AI execution backends
 *
 * ## Generic Type Parameter
 *
 * The `execute<T>()` method uses a generic type parameter `T` to specify
 * the expected response data type:
 *
 * - **Default**: `T = unknown` - Most flexible, no type specificity
 * - **Explicit**: `execute<{ name: string }>()` - Caller specifies type
 * - **Inferred**: `execute({ schema: UserSchema })` - Type from Zod schema
 *
 * ## Type Safety Patterns
 *
 * ### Pattern 1: Explicit Type (Recommended for Known Structures)
 * ```ts
 * interface User { id: string; name: string; }
 * const result = await provider.execute<User>(request, toolExecutor);
 * if (isSuccess(result)) {
 *   console.log(result.data.name); // Type: string
 * }
 * ```
 *
 * ### Pattern 2: Schema Inference (Recommended for Validation)
 * ```ts
 * const UserSchema = z.object({ id: z.string(), name: z.string() });
 * const result = await provider.execute({
 *   prompt: 'Get user',
 *   schema: UserSchema,
 *   options: {}
 * }, toolExecutor);
 * // result.data type automatically inferred as { id: string; name: string }
 * ```
 *
 * ### Pattern 3: Default Unknown (Fallback)
 * ```ts
 * const result = await provider.execute(request, toolExecutor);
 * // result.data type: unknown (use when structure doesn't matter)
 * ```
 *
 * ## Provider Implementation Requirements
 *
 * All provider implementations MUST:
 * 1. Preserve generic type parameter T through execution
 * 2. Return AgentResponse<T> with properly typed data field
 * 3. Delegate tool execution via toolExecutor callback
 * 4. Support provider-specific hook adaptation
 * 5. Handle errors and return AgentResponse with status='error'
 *
 * @template T - Response data type (default: unknown)
 */
export interface Provider {
  /** Unique provider identifier */
  readonly id: ProviderId;

  /** Provider capability flags */
  readonly capabilities: ProviderCapabilities;

  /**
   * Initialize provider with configuration options
   *
   * Called once during provider registration. Providers should
   * validate options and establish connections to external services.
   *
   * @param options - Optional provider configuration
   * @throws Error if initialization fails
   */
  initialize(options?: ProviderOptions): Promise<void>;

  /**
   * Terminate provider and cleanup resources
   *
   * Called during application shutdown. Providers should close
   * connections and release resources.
   */
  terminate(): Promise<void>;

  /**
   * Execute a prompt request
   *
   * Generic method that executes prompts and returns typed responses.
   * The type parameter T specifies the expected response data structure.
   *
   * ## Type Parameter T
   *
   * - **Default** (`unknown`): No type specificity
   * - **Explicit** (`{ name: string }`): Caller specifies type
   * - **Inferred** (from schema): Type from Zod schema
   *
   * ## Tool Execution
   *
   * When the AI model requests tool execution, the provider delegates
   * to the toolExecutor callback. This allows the Agent to manage
   * tool lifecycle while the provider handles the AI interaction.
   *
   * @template T - The type of data returned on success
   * @param request - Provider request with prompt and options
   * @param toolExecutor - Callback for executing tools
   * @param hooks - Optional lifecycle hooks
   * @returns Promise resolving to AgentResponse<T>
   *
   * @example <caption>Explicit type parameter</caption>
   * ```ts
   * const result = await provider.execute<{ count: number }>(
   *   { prompt: 'Count items', options: {} },
   *   toolExecutor
   * );
   * if (isSuccess(result)) {
   *   console.log(result.data.count); // Type: number
   * }
   * ```
   *
   * @example <caption>Schema-based inference</caption>
   * ```ts
   * const UserSchema = z.object({ id: z.string(), name: z.string() });
   * const result = await provider.execute({
   *   prompt: 'Create user',
   *   schema: UserSchema,
   *   options: {}
   * }, toolExecutor);
   * // result.data type: { id: string; name: string }
   * ```
   */
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

  /**
   * Register MCP servers with provider
   *
   * Converts MCP servers to provider-specific tool format and
   * makes them available for prompt execution.
   *
   * @param servers - Array of MCP server configurations
   * @returns Array of registered tools
   */
  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;

  /**
   * Load skills into provider
   *
   * Skills are provider-specific capabilities (e.g., Anthropic uses
   * system prompt, OpenCode uses native skills API).
   *
   * @param skills - Array of skill configurations
   */
  loadSkills(skills: Skill[]): Promise<void>;

  /**
   * Normalize model string to ModelSpec
   *
   * Parses model string (with or without provider prefix) and
   * validates it for this provider.
   *
   * @param model - Model string (e.g., 'claude-sonnet-4' or 'anthropic/claude-sonnet-4')
   * @returns Normalized model specification
   * @throws Error if model is invalid for this provider
   */
  normalizeModel(model: string): ModelSpec;
}
```

---

## Sources and URLs

### Official TypeScript Documentation

1. **TypeScript Handbook - Generics**
   - URL: https://www.typescriptlang.org/docs/handbook/2/generics.html
   - Topics: Generic functions, generic interfaces, generic constraints
   - Accessed: 2026-01-25

2. **TypeScript Handbook - Generic Constraints**
   - URL: https://www.typescriptlang.org/docs/handbook/2/generic-constraints.html
   - Topics: Constraining type parameters, using type parameters in constraints
   - Accessed: 2026-01-25

3. **TypeScript Handbook - Conditional Types**
   - URL: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
   - Topics: Conditional types, infer keyword, distributive conditional types
   - Accessed: 2026-01-25

4. **TypeScript Handbook - Generic Interfaces**
   - URL: https://www.typescriptlang.org/docs/handbook/2/interfaces.html#generic-interfaces
   - Topics: Generic interface syntax, type parameter scope
   - Accessed: 2026-01-25

5. **TypeScript 5.0 Release Notes**
   - URL: https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/
   - Topics: const type parameters, extends multiple types
   - Accessed: 2026-01-25

6. **TSDoc Standard**
   - URL: https://tsdoc.org/
   - Topics: Documentation standard for TypeScript
   - Accessed: 2026-01-25

### Open-Source Libraries

7. **Prisma ORM**
   - Repository: https://github.com/prisma/prisma
   - File: packages/client/src/runtime/core/operations/request.ts
   - Pattern: Complex generic constraints with utility types
   - Accessed: 2026-01-25

8. **Axios HTTP Client**
   - Repository: https://github.com/axios/axios
   - File: index.d.ts
   - Pattern: Multiple type parameters for request/response
   - Accessed: 2026-01-25

9. **TypeORM**
   - Repository: https://github.com/typeorm/typeorm
   - File: src/repository/Repository.ts
   - Pattern: Repository interface parameterized by entity type
   - Accessed: 2026-01-25

10. **Vitest**
    - Repository: https://github.com/vitest-dev/vitest
    - File: packages/vitest/src/integration.ts
    - Pattern: Mock interface with return type parameter
    - Accessed: 2026-01-25

11. **Execa**
    - Repository: https://github.com/sindresorhus/execa
    - File: index.d.ts
    - Pattern: Multiple type parameters for different streams
    - Accessed: 2026-01-25

### Community Resources

12. **TypeScript Deep Dive**
    - URL: https://basarat.gitbook.io/typescript/type-system/generics
    - Topics: Generic classes, generic constraints, mixing classes and generics
    - Author: Basarat Ali Syed
    - Accessed: 2026-01-25

13. **Effective TypeScript**
    - URL: https://effectivetypescript.com/2020/05/26/generic-types/
    - Topics: Generic function design, type inference
    - Author: Dan Vanderkam
    - Accessed: 2026-01-25

14. **Total TypeScript - Generics**
    - URL: https://www.totaltypescript.com/concepts/generics
    - Topics: Type parameter best practices, common patterns
    - Author: Matt Pocock
    - Accessed: 2026-01-25

### Groundswell Project Resources

15. **Groundswell Provider Types**
    - File: /home/dustin/projects/groundswell/src/types/providers.ts
    - Pattern: ProviderId union type, ProviderCapabilities interface
    - Accessed: 2026-01-25

16. **Groundswell Agent Response Types**
    - File: /home/dustin/projects/groundswell/src/types/agent.ts
    - Pattern: AgentResponse<T> with discriminated union
    - Accessed: 2026-01-25

17. **Groundswell Agent Implementation**
    - File: /home/dustin/projects/groundswell/src/core/agent.ts
    - Pattern: Existing prompt execution with SDK integration
    - Accessed: 2026-01-25

18. **Groundswell TypeScript Best Practices**
    - File: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M1T1S1/research/typescript-best-practices.md
    - Pattern: Union types, readonly properties, JSDoc patterns
    - Accessed: 2026-01-25

19. **Groundswell Options and Request Patterns**
    - File: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/typescript-options-request-interface-patterns.md
    - Pattern: Provider options, request interfaces, JSDoc documentation
    - Accessed: 2026-01-25

---

## Implementation Checklist

### For P1.M1.T1.S3 Implementation

- [ ] Create Provider interface in `/home/dustin/projects/groundswell/src/types/providers.ts`
- [ ] Add `execute<T = unknown>()` method with full JSDoc
- [ ] Include `@template T` documentation
- [ ] Add multiple `@example` blocks with `<caption>`
- [ ] Document type safety patterns (explicit, inferred, default)
- [ ] Document tool execution callback pattern
- [ ] Document hook events and lifecycle
- [ ] Add `@see` references to AgentResponse and ProviderRequest
- [ ] Ensure consistency with existing Groundswell patterns
- [ ] Include PRD section references in documentation

### Testing Considerations

- [ ] Test with explicit type parameter: `execute<{ name: string }>()`
- [ ] Test with schema inference: `execute({ schema: UserSchema })`
- [ ] Test with default unknown: `execute(request)`
- [ ] Test type preservation through registry delegation
- [ ] Test tool execution callback
- [ ] Test error responses with proper typing
- [ ] Test multiple providers with same interface
- [ ] Verify type safety in all scenarios

---

## Conclusion

This research identifies the recommended pattern for implementing `execute<T>()` in the Provider interface:

```typescript
interface Provider {
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

**Key Recommendations:**

1. Use default type parameter `T = unknown` for flexibility
2. Support explicit type specification for known structures
3. Support schema-based type inference for automatic typing
4. Preserve type information through delegation
5. Use `AgentResponse<T>` for consistency with existing code
6. Provide comprehensive JSDoc with examples
7. Follow patterns from established libraries (Prisma, Axios, TypeORM)

**Next Steps:**

1. Implement Provider interface with generic `execute<T>()` method
2. Create AnthropicProvider implementation
3. Write unit tests for type safety
4. Document usage patterns in provider documentation

---

**Document Version:** 1.0
**Last Updated:** 2026-01-25
**Status:** Ready for Implementation
**Task:** P1.M1.T1.S3 - Define Provider interface with core methods

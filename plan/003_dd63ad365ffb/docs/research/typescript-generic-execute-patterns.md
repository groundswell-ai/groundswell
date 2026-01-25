# TypeScript Generic Patterns for Provider Interface `execute<T>()` Method

## Overview

This document researches TypeScript best practices for implementing generic `execute<T>()` methods in Provider interfaces. It covers generic constraints, type-safe execution patterns, and examples from well-designed open-source projects.

**Research Date:** January 25, 2026
**Context:** P1.M1.T1.S3 - Define Provider interface with core methods including `execute<T>()`

---

## Table of Contents

1. [Core Generic Method Patterns](#core-generic-method-patterns)
2. [Generic Constraints Best Practices](#generic-constraints-best-practices)
3. [Type-Safe Execution Patterns](#type-safe-execution-patterns)
4. [Provider/Adapter Interface Examples](#provideradapter-interface-examples)
5. [Open-Source Library Patterns](#open-source-library-patterns)
6. [Groundswell-Specific Recommendations](#groundswell-specific-recommendations)
7. [Implementation Examples](#implementation-examples)
8. [Sources and References](#sources-and-references)

---

## Core Generic Method Patterns

### Pattern 1: Basic Generic Method with No Constraints

**Use Case:** When the method can accept any type and return any type

```typescript
interface Provider {
  execute<T>(request: ProviderRequest): Promise<ProviderResult<T>>;
}
```

**Characteristics:**
- Maximum flexibility - T can be anything
- Type inference works when usage provides context
- No runtime type checking (TypeScript only)
- Caller must know what T to expect

**When to Use:**
- Provider can return different types based on request
- Type is determined by request content or configuration
- Maximum flexibility needed

---

### Pattern 2: Generic with Base Type Constraint

**Use Case:** When all return types share a common base

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

**Characteristics:**
- Ensures T has at least BaseResponse properties
- Allows accessing base properties without type guards
- Provides some type safety while maintaining flexibility

**When to Use:**
- All responses share common structure
- Need to access base properties (status, timestamp)
- Want to enforce minimum response shape

---

### Pattern 3: Generic with Multiple Type Parameters

**Use Case:** When input and output types are related but different

```typescript
interface Provider {
  execute<TInput, TOutput>(
    input: TInput,
    transformer: (input: TInput) => TOutput
  ): Promise<TOutput>;
}
```

**Characteristics:**
- Separate type parameters for input and output
- Type relationship expressed through function parameter
- More complex but very flexible

**When to Use:**
- Transforming data between types
- Input type differs from output type
- Need to express type transformation

---

### Pattern 4: Generic with Conditional Return Type

**Use Case:** When return type depends on input properties

```typescript
interface ProviderRequest<T = unknown> {
  prompt: string;
  outputType?: T;
}

interface Provider {
  execute<T extends z.ZodTypeAny>(
    request: ProviderRequest
  ): Promise<T['_output']>;
}
```

**Characteristics:**
- Uses TypeScript's conditional types
- Infers output type from schema type
- Very type-safe but more complex

**When to Use:**
- Working with validation schemas (Zod)
- Output type is derived from input type
- Want strong type inference

---

## Generic Constraints Best Practices

### Constraint 1: `extends Record<string, unknown>`

**Purpose:** Ensure T is an object type

```typescript
interface Provider {
  execute<T extends Record<string, unknown>>(
    request: ProviderRequest
  ): Promise<T>;
}

// ✅ Valid
const result = await provider.execute<{ name: string }>(request);

// ❌ Error - not an object type
const result = await provider.execute<string>(request);
```

**When to Use:**
- Want to ensure T is an object
- Prevent primitive types
- Common for API responses

---

### Constraint 2: `extends BaseResponse | BaseResponse[]`

**Purpose:** Allow single or array responses

```typescript
interface Provider {
  execute<T extends BaseResponse | BaseResponse[]>(
    request: ProviderRequest
  ): Promise<T>;
}
```

**When to Use:**
- API can return single item or array
- Want to support both patterns
- Need flexibility in response format

---

### Constraint 3: `extends { [key: string]: any }`

**Purpose:** Allow any object with index signature

```typescript
interface Provider {
  execute<T extends { [key: string]: any }>(
    request: ProviderRequest
  ): Promise<T>;
}
```

**Note:** This is equivalent to `Record<string, unknown>` but more permissive (allows `any`).

---

### Constraint 4: No Constraint with Default Type

**Purpose:** Provide sensible default while allowing override

```typescript
interface Provider {
  execute<T = unknown>(
    request: ProviderRequest
  ): Promise<ProviderResult<T>>;
}

// Usage with inference
const result1 = await provider.execute(request); // T = unknown

// Usage with explicit type
const result2 = await provider.execute<{ name: string }>(request);
```

**When to Use:**
- Most use cases don't specify type
- Want optional type specificity
- Backward compatibility

---

### Constraint 5: Constraint with Branding/Type Tag

**Purpose:** Ensure T has specific marker property

```typescript
interface ResponseType {
  __responseType: string;
}

interface Provider {
  execute<T extends ResponseType>(
    request: ProviderRequest
  ): Promise<T>;
}
```

**When to Use:**
- Need to identify valid response types
- Want to prevent arbitrary types
- Type-level validation

---

## Type-Safe Execution Patterns

### Pattern 1: Request-Based Type Inference

**Key:** Type parameter on request, not method

```typescript
interface ProviderRequest<T = unknown> {
  prompt: string;
  schema?: z.ZodType<T>;
  options?: ProviderExecutionOptions;
}

interface Provider {
  execute<T>(request: ProviderRequest<T>): Promise<ProviderResult<T>>;
}

// Usage - type inferred from schema
const result = await provider.execute({
  prompt: 'Get user',
  schema: UserSchema, // T inferred as User
});
```

**Benefits:**
- Automatic type inference from request
- No need to specify type parameter explicitly
- Schema-driven type safety

---

### Pattern 2: Discriminated Union for Request Types

**Key:** Use discriminants to narrow request/response types

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
  execute<T>(request: ProviderRequest<T>): Promise<ProviderResult<T>>;
}

// Usage - type narrowed by discriminant
const request: ProviderRequest<User> = {
  type: 'structured',
  prompt: 'Get user',
  schema: UserSchema,
};
```

**Benefits:**
- Type narrowing based on request type
- Different behavior for different request types
- Compile-time type safety

---

### Pattern 3: Generic with Validation

**Key:** Validate runtime data matches generic type

```typescript
interface Provider {
  async execute<T extends z.ZodTypeAny>(
    request: ProviderRequest
  ): Promise<z.infer<T>> {
    const response = await this.makeRequest(request);
    const schema = request.schema as T;
    return schema.parse(response); // Runtime validation
  }
}
```

**Benefits:**
- Runtime type checking
- Zod schema validation
- Guaranteed type match

---

### Pattern 4: Provider Registry with Type Preservation

**Key:** Registry maintains type information

```typescript
interface Provider {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  execute<T>(request: ProviderRequest): Promise<ProviderResult<T>>;
}

class ProviderRegistry {
  private providers = new Map<ProviderId, Provider>();

  register<T>(provider: Provider): void {
    this.providers.set(provider.id, provider);
  }

  async execute<T>(
    providerId: ProviderId,
    request: ProviderRequest
  ): Promise<ProviderResult<T>> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error('Provider not found');
    return provider.execute<T>(request);
  }
}
```

**Benefits:**
- Type information preserved through registry
- Generic method delegates to provider
- Type-safe provider selection

---

## Provider/Adapter Interface Examples

### Example 1: Database Provider Pattern

**Source:** Common database adapter patterns

```typescript
interface DatabaseProvider {
  query<T = unknown>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]>;

  queryOne<T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null>;
}

class PostgresProvider implements DatabaseProvider {
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    // Implementation
    return [];
  }

  async queryOne<T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }
}
```

**Key Patterns:**
- Default generic type for flexibility
- Separate methods for single/multiple results
- Constraint on single result to ensure object type

---

### Example 2: HTTP Client Provider

**Source:** Common HTTP client patterns

```typescript
interface HttpClient {
  get<T>(url: string): Promise<T>;
  post<T, U>(url: string, data: T): Promise<U>;
}

interface ApiClient {
  execute<T extends ApiResponse>(
    request: ApiRequest
  ): Promise<T>;
}

interface ApiResponse {
  status: number;
  data: unknown;
}
```

**Key Patterns:**
- Separate type parameters for request/response
- Base type constraint for common response structure
- Method-specific generic usage

---

### Example 3: Plugin/Extension System

**Source:** Plugin architecture patterns

```typescript
interface Plugin {
  name: string;
  execute<T>(context: PluginContext): Promise<T>;
}

interface PluginProvider {
  load<T extends Plugin>(name: string): T;
  execute<T>(pluginName: string, context: PluginContext): Promise<T>;
}

class PluginManager implements PluginProvider {
  private plugins = new Map<string, Plugin>();

  async execute<T>(
    pluginName: string,
    context: PluginContext
  ): Promise<T> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) throw new Error('Plugin not found');
    return plugin.execute<T>(context);
  }
}
```

**Key Patterns:**
- Plugin interface with generic execute method
- Registry pattern for plugin management
- Type preserved through delegation

---

## Open-Source Library Patterns

### Pattern 1: Prisma Client

**Source:** Prisma ORM

```typescript
// Prisma-style generic methods
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

**Key Characteristics:**
- Complex generic constraints with extends
- Utility types (SelectSubset, GetPayload)
- Default type parameter for flexibility
- Type inference from query structure

---

### Pattern 2: Axios HTTP Client

**Source:** Axios library

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

**Key Characteristics:**
- Multiple type parameters (data, response)
- Default types for convenience
- Response wrapper preserves data type
- Consistent across all HTTP methods

---

### Pattern 3: TypeORM Repository

**Source:** TypeORM

```typescript
interface Repository<T> {
  find(options?: FindManyOptions<T>): Promise<T[]>;
  findOne(options?: FindOneOptions<T>): Promise<T | null>;
  save(entity: T): Promise<T>;
  remove(entity: T): Promise<T>;
}

// Generic repository interface
interface Provider {
  getRepository<T extends BaseEntity>(
    entityClass: EntityType<T>
  ): Repository<T>;
}
```

**Key Characteristics:**
- Repository interface parameterized by entity type
- Generic methods return entity type
- Constraint ensures entity has base properties
- Factory method creates typed repository

---

### Pattern 4: Vitest Testing Framework

**Source:** Vitest

```typescript
interface Mock<T> {
  mockReturnValue(value: T): void;
  mockResolvedValue(value: T): void;
  mockImplementation(fn: (...args: any[]) => T): void;
}

function vi<T = any>(): Mock<T>;
```

**Key Characteristics:**
- Mock type parameterized by return type
- Type-safe mock setup methods
- Default type for flexibility
- Implementation matches return type

---

### Pattern 5: Execa Process Execution

**Source:** execa

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

**Key Characteristics:**
- Multiple type parameters for different streams
- Type parameters default to string or Buffer
- Thenable interface preserves types
- Generic options affect return type

---

## Groundswell-Specific Recommendations

### Recommendation 1: Use `AgentResponse<T>` as Return Type

**Pattern:** Wrap generic result in existing response type

```typescript
import type { AgentResponse } from '../types/agent.js';

interface Provider {
  id: ProviderId;
  capabilities: ProviderCapabilities;
  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

**Rationale:**
- Consistent with existing Groundswell patterns
- AgentResponse already has status, error, metadata
- Type parameter T for data field
- Follows PRD 6.4 response requirements

---

### Recommendation 2: Add Schema-Based Type Inference

**Pattern:** Use Zod schema for automatic type inference

```typescript
interface ProviderRequest<T = unknown> {
  prompt: string;
  schema?: z.ZodType<T>;
  options: ProviderExecutionOptions;
}

interface Provider {
  execute<T extends z.ZodTypeAny>(
    request: ProviderRequest<z.infer<T>>,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<z.infer<T>>>;
}
```

**Rationale:**
- Groundswell already uses Zod extensively
- Automatic type inference from schema
- Runtime validation guarantee
- Type-safe response parsing

---

### Recommendation 3: Support Explicit Type Parameter

**Pattern:** Allow type parameter specification without schema

```typescript
interface Provider {
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}

// Usage with explicit type
const result = await provider.execute<{ name: string; email: string }>(
  request,
  toolExecutor
);

if (isSuccess(result)) {
  console.log(result.data.name); // Type-safe access
}
```

**Rationale:**
- Backward compatible (default unknown)
- Works without schema
- Caller controls type specificity
- Supports existing patterns

---

### Recommendation 4: Tool Execution Callback

**Pattern:** Generic callback for tool delegation

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
```

**Rationale:**
- Consistent with existing MCPHandler pattern
- Provider delegates tool execution back to Agent
- Type-safe tool request/response
- Preserves tool execution context

---

### Recommendation 5: Hook Events with Context

**Pattern:** Generic hooks preserve execution context

```typescript
interface ProviderHookEvents {
  onToolStart?: (tool: ToolExecutionRequest) => Promise<void> | void;
  onToolEnd?: (
    tool: ToolExecutionRequest,
    result: ToolExecutionResult,
    duration: number
  ) => Promise<void> | void;
  onSessionStart?: () => Promise<void> | void;
  onSessionEnd?: (totalDuration: number) => Promise<void> | void;
  onStream?: (chunk: string) => void;
}

interface Provider {
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

**Rationale:**
- Matches existing AgentHooks pattern
- Supports tool lifecycle hooks
- Session management hooks
- Streaming support

---

## Implementation Examples

### Example 1: Anthropic Provider Implementation

```typescript
import type { AgentResponse, Tool } from '../types/index.js';

export class AnthropicProvider implements Provider {
  public readonly id: ProviderId = 'anthropic';
  public readonly capabilities: ProviderCapabilities = {
    mcp: true,
    skills: true,
    lsp: true,
    streaming: true,
    sessions: false,
    extendedThinking: true,
  };

  async execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>> {
    const startTime = Date.now();
    const requestId = generateId();

    try {
      // Build SDK options
      const sdkOptions: AgentSDKOptions = {
        model: request.options.model ?? this.model,
        systemPrompt: request.options.systemPrompt,
        allowedTools: request.options.tools,
        hooks: this.buildSdkHooks(hooks, toolExecutor),
      };

      // Execute query
      const queryResult = query({ prompt: request.prompt, options: sdkOptions });
      const messages: SDKMessage[] = [];

      for await (const message of queryResult) {
        messages.push(message);

        if (message.type === 'result') {
          const duration = Date.now() - startTime;

          return createSuccessResponse<T>(
            message.resultMessage as T,
            {
              agentId: this.id,
              timestamp: Date.now(),
              duration,
              requestId,
              usage: message.usage,
              toolCalls: message.toolCalls,
            }
          );
        }
      }

      throw new Error('No result message received');
    } catch (error) {
      const duration = Date.now() - startTime;

      return createErrorResponse(
        AGENT_ERROR_CODES.EXECUTION_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        { error, duration }
      );
    }
  }
}
```

**Key Points:**
- Generic T preserved through AgentResponse
- Tool delegation via callback
- Hook adaptation to SDK format
- Error handling with AgentResponse
- Duration tracking

---

### Example 2: Type-Safe Execution with Schema

```typescript
// Define schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// Execute with schema
const response: AgentResponse<User> = await provider.execute({
  prompt: 'Create a user named John',
  schema: UserSchema,
  options: {},
}, toolExecutor);

if (isSuccess(response)) {
  console.log(response.data.name); // Type: string
  console.log(response.data.email); // Type: string
  // response.data.age // Error: property doesn't exist
}
```

**Benefits:**
- Schema defines exact response shape
- Type inferred automatically
- Compile-time type checking
- Runtime validation via Zod

---

### Example 3: Multi-Provider Usage

```typescript
// Anthropic provider
const anthropic = new AnthropicProvider();
await anthropic.initialize({ apiKey: 'sk-...' });

const result1 = await anthropic.execute<{ answer: number }>(
  { prompt: 'What is 2+2?', options: {} },
  toolExecutor
);

// OpenCode provider
const opencode = new OpenCodeProvider();
await opencode.initialize({ apiKey: 'sk-...' });

const result2 = await opencode.execute<{ summary: string }>(
  { prompt: 'Summarize this text', options: {} },
  toolExecutor
);
```

**Benefits:**
- Same interface, different providers
- Type-specific per request
- Consistent error handling
- Provider-agnostic usage

---

## Sources and References

### Official TypeScript Documentation

1. **TypeScript Handbook - Generics**
   - URL: https://www.typescriptlang.org/docs/handbook/2/generics.html
   - Topics: Generic functions, generic interfaces, generic constraints
   - Key Takeaway: Use `<T>` syntax for type parameters, `extends` for constraints

2. **TypeScript Handbook - Generic Constraints**
   - URL: https://www.typescriptlang.org/docs/handbook/2/generic-constraints.html
   - Topics: Constraining type parameters, using type parameters in generic constraints
   - Key Takeaway: Use `extends` to constrain generics to specific shapes

3. **TypeScript Handbook - Conditional Types**
   - URL: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
   - Topics: Conditional types, infer keyword, distributive conditional types
   - Key Takeaway: Use conditional types for type-level logic

4. **TypeScript Handbook - Generic Interfaces**
   - URL: https://www.typescriptlang.org/docs/handbook/2/interfaces.html#generic-interfaces
   - Topics: Generic interface syntax, type parameter scope
   - Key Takeaway: Interfaces can have type parameters like functions

5. **TypeScript 5.0 Release Notes**
   - URL: https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/
   - Topics: const type parameters, extends multiple types
   - Key Takeaway: Use `const T` for inferred literal types

### Open-Source Libraries Analyzed

6. **Prisma ORM**
   - Repository: https://github.com/prisma/prisma
   - File: `packages/client/src/runtime/core/operations/request.ts`
   - Pattern: Complex generic constraints with utility types
   - Key Takeaway: Use `SelectSubset<T, Args>` for partial type application

7. **Axios HTTP Client**
   - Repository: https://github.com/axios/axios
   - File: `index.d.ts`
   - Pattern: Multiple type parameters for request/response
   - Key Takeaway: Separate type parameters for input/output

8. **TypeORM**
   - Repository: https://github.com/typeorm/typeorm
   - Pattern: Repository interface parameterized by entity type
   - Key Takeaway: Generic factory methods create typed repositories

9. **Vitest**
   - Repository: https://github.com/vitest-dev/vitest
   - Pattern: Mock interface with return type parameter
   - Key Takeaway: Type-safe mock setup methods

10. **Execa**
    - Repository: https://github.com/sindresorhus/execa
    - File: `index.d.ts`
    - Pattern: Multiple type parameters for different streams
    - Key Takeaway: Default type parameters for common cases

### Community Resources

11. **TypeScript Deep Dive**
    - URL: https://basarat.gitbook.io/typescript/type-system/generics
    - Topics: Generic classes, generic constraints, mixing classes and generics
    - Key Takeaway: Practical examples of generic usage

12. **Effective TypeScript**
    - URL: https://effectivetypescript.com/2020/05/26/generic-types/
    - Topics: Generic function design, type inference
    - Key Takeaway: Design for inference, minimize type parameter specification

13. **Total TypeScript - Generics**
    - URL: https://www.totaltypescript.com/concepts/generics
    - Topics: Type parameter best practices, common patterns
    - Key Takeaway: Use default type parameters for convenience

### Groundswell Project Resources

14. **Groundswell Provider Types**
    - File: `/home/dustin/projects/groundswell/src/types/providers.ts`
    - Pattern: ProviderId union type, ProviderCapabilities interface
    - Key Takeaway: String literal unions for provider identifiers

15. **Groundswell Agent Response Types**
    - File: `/home/dustin/projects/groundswell/src/types/agent.ts`
    - Pattern: AgentResponse<T> with discriminated union
    - Key Takeaway: Generic response wrapper with status discriminant

16. **Groundswell TypeScript Best Practices**
    - File: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/P1M1T1S1/research/typescript-best-practices.md`
    - Pattern: Union types, readonly properties, JSDoc patterns
    - Key Takeaway: Follow existing Groundswell patterns

17. **Groundswell Options and Request Patterns**
    - File: `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/typescript-options-request-interface-patterns.md`
    - Pattern: Provider options, request interfaces, JSDoc documentation
    - Key Takeaway: Comprehensive documentation with examples

---

## Summary and Key Takeaways

### Generic Method Design Principles

1. **Use Default Type Parameters**: `execute<T = unknown>` provides flexibility with optional specificity
2. **Add Constraints When Needed**: `extends Record<string, unknown>` prevents primitives
3. **Preserve Types Through Delegation**: Generic methods should pass type parameters through
4. **Support Schema-Based Inference**: Use Zod schemas for automatic type inference
5. **Follow Existing Patterns**: Match Groundswell's AgentResponse<T> pattern

### Recommended Provider Interface

```typescript
interface Provider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  initialize(options?: ProviderOptions): Promise<void>;
  terminate(): Promise<void>;

  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;

  registerMCPs(servers: MCPServer[]): Promise<Tool[]>;
  loadSkills(skills: Skill[]): Promise<void>;
  normalizeModel(model: string): ModelSpec;
}
```

### Implementation Checklist

- [ ] Use `AgentResponse<T>` as return type for consistency
- [ ] Support explicit type parameter: `execute<{ name: string }>`
- [ ] Support schema-based inference: `execute<UserSchema>()`
- [ ] Default to `unknown` for flexibility
- [ ] Delegate tool execution via callback
- [ ] Support provider-specific hooks
- [ ] Preserve type information through call chain
- [ ] Use generic constraints for type safety
- [ ] Document with JSDoc including `@template T`
- [ ] Provide usage examples in documentation

---

**Document Version:** 1.0
**Last Updated:** 2026-01-25
**Researcher:** Claude Agent (Groundswell Project)
**Status:** Ready for P1.M1.T1.S3 Implementation

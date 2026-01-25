# Quick Reference: Provider `execute<T>()` Patterns

## Recommended Pattern

```typescript
interface Provider {
  execute<T = unknown>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}
```

## Usage Examples

### 1. Explicit Type Parameter
```typescript
const result = await provider.execute<{ name: string; count: number }>(
  { prompt: 'Get data', options: {} },
  toolExecutor
);
if (isSuccess(result)) {
  console.log(result.data.name);   // Type: string
  console.log(result.data.count);  // Type: number
}
```

### 2. Schema-Based Inference
```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const result = await provider.execute({
  prompt: 'Create user',
  schema: UserSchema,
  options: {}
}, toolExecutor);
// result.data type: { id: string; name: string }
```

### 3. Default Unknown
```typescript
const result = await provider.execute(
  { prompt: 'Say hello', options: {} },
  toolExecutor
);
// result.data type: unknown
```

## Key URLs

- **TypeScript Generics**: https://www.typescriptlang.org/docs/handbook/2/generics.html
- **Generic Constraints**: https://www.typescriptlang.org/docs/handbook/2/generic-constraints.html
- **Prisma Pattern**: https://github.com/prisma/prisma/blob/main/packages/client/src/runtime/core/operations/request.ts
- **Axios Pattern**: https://github.com/axios/axios/blob/master/index.d.ts
- **TypeORM Pattern**: https://github.com/typeorm/typeorm/blob/master/src/repository/Repository.ts

## Generic Constraints

### Object Only
```typescript
execute<T extends Record<string, unknown>>(request)
```

### Base Type
```typescript
execute<T extends BaseResponse>(request)
```

### No Constraint (Recommended)
```typescript
execute<T = unknown>(request)
```

## Open-Source Examples

### Prisma
```typescript
findFirst<T extends Args>(args?: T): Promise<GetPayload<T> | null>
$queryRaw<T = unknown>(query, ...values): Promise<T>
```

### Axios
```typescript
get<T = unknown, R = AxiosResponse<T>>(url): Promise<R>
post<T = unknown, R = AxiosResponse<T>>(url, data): Promise<R>
```

### TypeORM
```typescript
interface Repository<T> {
  find(options?: FindManyOptions<T>): Promise<T[]>
  findOne(options?: FindOneOptions<T>): Promise<T | null>
}
```

## Implementation Tips

1. **Use Default Type**: `T = unknown` provides maximum flexibility
2. **Add JSDoc**: Document `@template T` and usage patterns
3. **Provide Examples**: Show explicit, inferred, and default usage
4. **Preserve Types**: Keep type parameter through delegation
5. **Support Schema**: Enable Zod-based type inference
6. **Handle Errors**: Return `AgentResponse<T>` with status='error'

## JSDoc Template

```typescript
/**
 * Execute a prompt request
 *
 * @template T - The type of data returned on success (default: unknown)
 * @param request - Provider request with prompt and options
 * @param toolExecutor - Callback for executing tools
 * @param hooks - Optional lifecycle hooks
 * @returns Promise resolving to AgentResponse<T>
 *
 * @example <caption>Explicit type</caption>
 * ```ts
 * const result = await provider.execute<{ count: number }>(
 *   { prompt: 'Count', options: {} },
 *   toolExecutor
 * );
 * ```
 *
 * @example <caption>Schema inference</caption>
 * ```ts
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
```

## Related Groundswell Files

- `/home/dustin/projects/groundswell/src/types/providers.ts` - Provider interface
- `/home/dustin/projects/groundswell/src/types/agent.ts` - AgentResponse<T>
- `/home/dustin/projects/groundswell/src/core/agent.ts` - Existing Agent implementation

## Research Documents

- **Full Research**: `typescript-generic-execute-patterns.md`
- **Summary**: `RESEARCH_SUMMARY.md`
- **Quick Reference**: `QUICK_REFERENCE.md` (this file)

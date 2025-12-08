# Zod Schema Validation Research

## Official Documentation URLs

| Resource | URL |
|----------|-----|
| **Zod v3 Docs** | https://v3.zod.dev/ |
| **Current Docs** | https://zod.dev/ |
| **Basics Guide** | https://zod.dev/basics |
| **API Reference** | https://zod.dev/api |
| **GitHub** | https://github.com/colinhacks/zod |
| **NPM** | https://www.npmjs.com/package/zod |
| **Error Formatting** | https://zod.dev/error-formatting |
| **JSON Schema** | https://zod.dev/json-schema |

## Key Patterns

### Basic Schema Definition
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().positive(),
  active: z.boolean()
});
```

### Type Inference with z.infer<T>
```typescript
type User = z.infer<typeof UserSchema>;
// { name: string; email: string; age: number; active: boolean }
```

### Schema Validation
```typescript
// Method 1: .parse() - throws ZodError on failure
try {
  const result = userSchema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.issues);
  }
}

// Method 2: .safeParse() - returns discriminated union
const result = userSchema.safeParse(data);
if (result.success) {
  console.log(result.data); // Type-safe
} else {
  console.error(result.error.issues);
}
```

### Error Handling
```typescript
const result = schema.safeParse(data);
if (!result.success) {
  // Access issues array
  console.log(result.error.issues);

  // Format as nested object
  const formatted = result.error.format();

  // Flatten for forms
  const flattened = z.flattenError(result.error);
}
```

## Schema Introspection

### Accessing _def (Internal)
```typescript
const schema = z.object({
  name: z.string(),
  tags: z.array(z.string())
});

// Access object shape
console.log(schema._def.shape());

// Get array element type
const arraySchema = z.array(z.string());
console.log(arraySchema._def.type);

// Detect schema type
console.log(z.string()._def.typeName); // "ZodString"
```

### JSON Schema Conversion (v3)
```typescript
// Use zod-to-json-schema for v3
import { zodToJsonSchema } from 'zod-to-json-schema';

const jsonSchema = zodToJsonSchema(zodSchema);
```

## Advanced Features

### Optional Fields
```typescript
const schema = z.object({
  name: z.string(),
  middleName: z.string().optional(),  // string | undefined
  nickname: z.string().nullable()     // string | null
});
```

### Union Types
```typescript
const stringOrNumber = z.union([z.string(), z.number()]);

// Discriminated union (more efficient)
const result = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), data: z.string() }),
  z.object({ status: z.literal('error'), message: z.string() })
]);
```

### Arrays
```typescript
const stringArray = z.array(z.string());
const boundedArray = z.array(z.number()).min(1).max(10);
```

## TypeScript Integration

### Generic ZodType Usage
```typescript
import { z, ZodType } from 'zod';

function validateData<T extends ZodType>(
  data: unknown,
  schema: T
): z.infer<T> {
  return schema.parse(data);
}

// Generic schema factory
function createEnvelopeSchema<T extends ZodType>(messageSchema: T) {
  return z.object({
    from: z.string(),
    to: z.string(),
    message: messageSchema
  });
}
```

## Package Version

Use **zod@^3.23.0** for stability (not v4.x which is in beta).

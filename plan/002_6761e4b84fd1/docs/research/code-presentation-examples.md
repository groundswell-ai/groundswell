# Before/After Code Presentation Examples

This document provides concrete examples of effective before/after code presentation for migration guides.

---

## Table of Contents

1. [Basic Before/After Format](#basic-beforeafter-format)
2. [Tab-Based Interactive Examples](#tab-based-interactive-examples)
3. [Diff-Based Presentation](#diff-based-presentation)
4. [Progressive Migration Examples](#progressive-migration-examples)
5. [Real-World Scenarios](#real-world-scenarios)
6. [TypeScript-Specific Examples](#typescript-specific-examples)
7. [Common API Changes](#common-api-changes)

---

## Basic Before/After Format

### Example 1: Simple Function Rename

```typescript
// ❌ BEFORE (v1.x)
import { getData } from 'mylib';

const data = getData('user-id');
console.log(data.name);
```

```typescript
// ✅ AFTER (v2.0)
import { fetchUser } from 'mylib';

const user = fetchUser('user-id');
console.log(user.name);
```

### What Changed?

| Aspect | Before | After |
|--------|--------|-------|
| Function name | `getData` | `fetchUser` (more specific) |
| Return type | Generic `data` | Typed `User` object |
| Intent | Unclear what data | Clear: fetching a user |

---

### Example 2: Callback to Promise Migration

```typescript
// ❌ BEFORE (v1.x) - Callback-based
import { Client } from 'mylib';

const client = new Client();

client.connect((err) => {
  if (err) {
    console.error('Connection failed:', err);
    return;
  }

  client.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('Query failed:', err);
      return;
    }

    console.log('Users:', results);
  });
});
```

```typescript
// ✅ AFTER (v2.0) - Promise-based
import { Client } from 'mylib';

const client = new Client();

try {
  await client.connect();
  const results = await client.query('SELECT * FROM users');
  console.log('Users:', results);
} catch (error) {
  console.error('Error:', error);
}
```

### What Changed?

- ✅ Callbacks replaced with async/await
- ✅ Error handling simplified (try/catch)
- ✅ No more callback hell
- ✅ Better TypeScript type inference

---

### Example 3: Configuration Object Changes

```typescript
// ❌ BEFORE (v1.x)
const client = new Client({
  apiKey: 'key-123',
  timeout: 5000,
  debug: true,
  retries: 3
});
```

```typescript
// ✅ AFTER (v2.0)
const client = new Client({
  credentials: {
    apiKey: 'key-123'
  },
  connection: {
    timeoutMs: 5000,
    retryCount: 3
  },
  logging: {
    enabled: true,
    level: 'debug'
  }
});
```

### What Changed?

- ✅ **Better organization**: Related options grouped together
- ✅ **More explicit names**: `timeout` → `timeoutMs` (clearer units)
- ✅ **Consistent naming**: `retries` → `retryCount` (noun form)
- ✅ **Future-proof**: Structure allows adding new options without breaking

---

## Tab-Based Interactive Examples

### Example 1: Using Interactive Tabs

<Tabs>
<Tab label="v1.x (Deprecated)">
```typescript
import { useQuery } from 'mylib';

function UserProfile({ userId }) {
  const { data, loading, error } = useQuery(
    `/api/users/${userId}`,
    { cache: true }
  );

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <div>{data.name}</div>;
}
```
</Tab>

<Tab label="v2.0 (Current)">
```typescript
import { useQuery } from 'mylib';

function UserProfile({ userId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(r => r.json()),
    staleTime: 5000
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <div>{data.name}</div>;
}
```
</Tab>
</Tabs>

**Key improvements in v2.0:**
- Object-based configuration (easier to extend)
- Explicit `queryKey` for cache management
- `isLoading` instead of `loading` (more explicit)
- Configurable cache behavior (`staleTime`)

---

### Example 2: Step-by-Step Migration

<Tabs>
<Tab label="Step 1: Initial Code">
```typescript
// Original v1.x code
import { API } from 'mylib';

const result = API.get('/users/123');
console.log(result.data.name);
```
</Tab>

<Tab label="Step 2: Add Import">
```typescript
// Import the new API
import { API, fetchUser } from 'mylib';

// Keep old code for now
const result = API.get('/users/123');
console.log(result.data.name);
```
</Tab>

<Tab label="Step 3: Replace Method">
```typescript
// Use the new specific method
import { API, fetchUser } from 'mylib';

const user = await fetchUser('123');
console.log(user.name);
```
</Tab>

<Tab label="Step 4: Clean Up">
```typescript
// Remove unused import
import { fetchUser } from 'mylib';

const user = await fetchUser('123');
console.log(user.name);
```
</Tab>
</Tabs>

---

## Diff-Based Presentation

### Example 1: Inline Diff

```diff
// Migrating configuration file
module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
-   libraryTarget: 'var',
+   library: {
+     type: 'var',
+     name: 'MyLibrary'
+   },
-   name: 'MyLibrary'
  },
- externals: {
-   react: 'React'
+   externalType: 'var',
+   externals: ['react']
  }
}
```

### Example 2: Side-by-Side Diff with Annotations

**v1.x Configuration** | **v2.0 Configuration**
------------------------|------------------------
```typescript```typescript{// Old wayconst config = {  debug: true,  timeout: 5000,  maxRetries: 3,```} | ```typescript```typescript{// New way - grouped by concernconst config = {  logging: {    enabled: true,    level: 'debug'  },  connection: {    timeoutMs: 5000    retryCount: 3  }  // Note: maxRetries renamed to retryCount for consistency```}

---

## Progressive Migration Examples

### Example 1: Running Both Versions

```typescript
// Step 1: Install both versions
// package.json
{
  "dependencies": {
    "mylib": "^2.0.0",
    "mylib-v1-compat": "^1.5.0"
  }
}

// Step 2: Import separately
import mylibV1 from 'mylib-v1-compat';
import { mylib as mylibV2 } from 'mylib';

// Step 3: Migrate module by module
// oldModule.ts - uses v1
export const oldFunction = () => {
  return mylibV1.doSomething();
};

// newModule.ts - uses v2
export const newFunction = () => {
  return mylibV2.doSomething();
};

// Step 4: Gradually migrate
// Eventually remove mylib-v1-compat
```

### Example 2: Feature Flag Migration

```typescript
// Step 1: Add feature flag
const USE_NEW_API = process.env.FEATURE_NEW_API === 'true';

// Step 2: Create adapter
function fetchUser(userId: string) {
  if (USE_NEW_API) {
    // New implementation
    return mylibV2.user.fetch(userId);
  } else {
    // Old implementation
    return mylibV1.getUser(userId);
  }
}

// Step 3: Test both paths
// Run with: FEATURE_NEW_API=true npm test
// Run with: FEATURE_NEW_API=false npm test

// Step 4: Remove old path when confident
function fetchUser(userId: string) {
  return mylibV2.user.fetch(userId);
}
```

---

## Real-World Scenarios

### Scenario 1: Migrating an Authentication System

#### Before (Callback-based, mixed concerns)

```typescript
// ❌ OLD WAY - v1.x
import { Auth } from 'mylib';

Auth.login('user@example.com', 'password', (user, error) => {
  if (error) {
    // Handle error
    if (error.code === 'INVALID_CREDENTIALS') {
      alert('Wrong email or password');
    } else if (error.code === 'NETWORK_ERROR') {
      alert('Connection failed');
    } else {
      alert('Unknown error');
    }
    return;
  }

  // Success - store token manually
  localStorage.setItem('authToken', user.token);
  localStorage.setItem('userId', user.id);

  // Redirect manually
  window.location.href = '/dashboard';
});
```

#### After (Promise-based, structured errors)

```typescript
// ✅ NEW WAY - v2.0
import { Auth, AuthError } from 'mylib';

try {
  const session = await Auth.signIn({
    email: 'user@example.com',
    password: 'password'
  });

  // Session automatically stored
  // Redirect automatically handled
} catch (error) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        alert('Wrong email or password');
        break;
      case 'NETWORK_ERROR':
        alert('Connection failed');
        break;
      case 'ACCOUNT_LOCKED':
        alert('Account temporarily locked');
        break;
    }
  }
}
```

### What Changed?

| Aspect | Before | After |
|--------|--------|-------|
| Method name | `login` | `signIn` (matches convention) |
| Parameters | Two strings | Single object (extensible) |
| Return type | Callback | Promise |
| Error handling | Error codes in object | Typed error classes |
| Session storage | Manual | Automatic |
| Redirects | Manual | Automatic |

---

### Scenario 2: Migrating Data Validation

#### Before (Chain-based API)

```typescript
// ❌ BEFORE - v1.x
import { validate } from 'mylib';

const result = validate(data)
  .required('name')
  .string('name')
  .minLength('name', 2)
  .maxLength('name', 50)
  .email('email')
  .required('email')
  .number('age')
  .min('age', 18)
  .run();

if (result.hasErrors) {
  console.log('Validation failed:', result.errors);
} else {
  console.log('Valid data:', result.data);
}
```

#### After (Schema-based API)

```typescript
// ✅ AFTER - v2.0
import { object, string, number } from 'mylib';

const userSchema = object({
  name: string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .required('Name is required'),

  email: string()
    .email('Invalid email address')
    .required('Email is required'),

  age: number()
    .min(18, 'Must be 18 or older')
});

const result = await userSchema.validate(data);

if (!result.success) {
  console.log('Validation failed:', result.errors);
} else {
  console.log('Valid data:', result.data);
}
```

### Benefits of the New API

- ✅ **TypeScript-friendly**: Full type inference
- ✅ **Reusable schemas**: Define once, use everywhere
- ✅ **Composable**: Schemas can be combined
- ✅ **Better error messages**: Custom error messages per field
- ✅ **Async validation**: Built-in support for async checks
- ✅ **Nested objects**: Better support for complex data structures

---

## TypeScript-Specific Examples

### Example 1: Type Definition Changes

```typescript
// ❌ BEFORE - v1.x
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

const user: User = await api.getUser('123');
```

```typescript
// ✅ AFTER - v2.0
// Base type for all users
interface BaseUser {
  id: string;
  name: string;
  email: string;
}

// Discriminated union for different user types
type User =
  | (BaseUser & { role: 'admin'; permissions: Permission[] })
  | (BaseUser & { role: 'user'; organizationId: string })
  | (BaseUser & { role: 'guest' });

const user = await api.getUser('123');

// TypeScript now knows exact type based on role
if (user.role === 'admin') {
  // TypeScript knows user has permissions
  console.log(user.permissions); // ✅ Type-safe
}
```

### What Changed?

- ✅ **Discriminated unions**: More precise type modeling
- ✅ **Type narrowing**: Better type guards
- ✅ **Extensibility**: Easier to add new user types
- ✅ **Type safety**: Catches more errors at compile time

---

### Example 2: Generic Type Improvements

```typescript
// ❌ BEFORE - v1.x
interface ApiResponse<T> {
  data: T;
  error: Error | null;
  success: boolean;
}

// Usage - have to check null
const response: ApiResponse<User> = await api.getUser('123');
if (response.error) {
  throw response.error;
}
console.log(response.data.name);
```

```typescript
// ✅ AFTER - v2.0
// Discriminated union for success/error states
type ApiResponse<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Usage - TypeScript knows data exists when success is true
const response = await api.getUser('123');

if (response.success) {
  // TypeScript knows response.data exists
  console.log(response.data.name);
} else {
  // TypeScript knows response.error exists
  console.error(response.error.message);
}
```

### Benefits

- ✅ **No null checks needed**: Discriminated union handles it
- ✅ **Type-safe access**: TypeScript knows what properties exist
- ✅ **Exhaustive checking**: Compiler ensures all cases handled

---

## Common API Changes

### Change 1: Method Renaming for Clarity

```typescript
// ❌ Vague names
const items = list.get();
list.set(items);
list.remove(item);

// ✅ Clear, specific names
const items = list.getItems();
list.setItems(items);
list.removeItem(item);
```

### Change 2: Options Object Instead of Multiple Parameters

```typescript
// ❌ Hard to remember parameter order
function query(
  table: string,
  filters: Record<string, any>,
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  limit: number,
  offset: number
) { /* ... */ }

// Usage - unclear what each arg is
query('users', { active: true }, 'createdAt', 'desc', 10, 0);
```

```typescript
// ✅ Named parameters via options object
function query(options: {
  table: string;
  filters?: Record<string, any>;
  sort?: {
    by: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    limit: number;
    offset: number;
  };
}) { /* ... */ }

// Usage - clear what each option does
query({
  table: 'users',
  filters: { active: true },
  sort: { by: 'createdAt', order: 'desc' },
  pagination: { limit: 10, offset: 0 }
});
```

### Change 3: Fluent to Declarative

```typescript
// ❌ Fluent (chaining) API
const result = client
  .query('SELECT * FROM users')
  .where('active', true)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .execute();
```

```typescript
// ✅ Declarative API
const result = client.query({
  sql: 'SELECT * FROM users',
  where: { active: true },
  orderBy: [{ column: 'createdAt', direction: 'DESC' }],
  limit: 10
});
```

### Change 4: Event Emitter to Async Iterator

```typescript
// ❌ Event emitter pattern
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

emitter.on('data', (chunk) => {
  console.log('Received:', chunk);
});

emitter.on('end', () => {
  console.log('Done');
});

emitter.on('error', (err) => {
  console.error('Error:', err);
});
```

```typescript
// ✅ Async iterator pattern
async function consumeStream(stream) {
  try {
    for await (const chunk of stream) {
      console.log('Received:', chunk);
    }
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
  }
}

await consumeStream(dataStream);
```

### Change 5: Config Class to Options Object

```typescript
// ❌ Config class
const config = new Config();
config.setHost('api.example.com');
config.setPort(443);
config.setSecure(true);
config.setTimeout(5000);

const client = new Client(config);
```

```typescript
// ✅ Options object with defaults
const client = new Client({
  host: 'api.example.com',
  port: 443,
  secure: true,
  timeout: 5000
});

// Or use defaults
const client = new Client(); // All optional
```

---

## Best Practices Summary

### Do's ✅

1. **Show real, production-like code** - Not toy examples
2. **Provide context** - Explain what the code does
3. **Highlight what changed** - Use visual indicators
4. **Show the benefits** - Why is the new way better?
5. **Include imports** - Full working examples
6. **Add comments** - Explain non-obvious parts
7. **Show error handling** - Don't ignore edge cases
8. **Use TypeScript** - Show type definitions
9. **Keep examples short** - Focus on the change
10. **Test your examples** - Ensure they actually work

### Don'ts ❌

1. **Don't use unrealistic examples** - `foo/bar/baz`
2. **Don't skip context** - Make assumptions clear
3. **Don't over-complicate** - Keep the change focused
4. **Don't ignore errors** - Show error handling
5. **Don't use TODO comments** - Complete the example
6. **Don't mix concerns** - One change at a time
7. **Don't use magic numbers** - Explain constants
8. **Don't assume knowledge** - Explain imports/types
9. **Don't make examples too long** - Distracts from the point
10. **Don't use deprecated APIs** - Current best practices only

---

## Visual Elements

Use visual elements to make changes stand out:

```typescript
// 🚫 DEPRECATED - Don't use this anymore
import { OldAPI } from 'library';

// ✅ NEW - Use this instead
import { NewAPI } from 'library';

// ⚠️ WARNING - This will be removed in v3.0
import { DeprecatedAPI } from 'library';

// 📝 NOTE - Important context
// This API requires authentication

// 💡 TIP - Helpful suggestion
// Use async/await for cleaner code

// 🔧 CUSTOMIZATION - Configurable behavior
// Pass { debug: true } for verbose logging
```

---

## Template for Before/After Examples

```markdown
### [Change Title]

**Migration Time:** ~[time]
**Difficulty:** [Easy/Medium/Hard]

#### Before (v[X.Y])
```typescript
[Show the old way]
```

#### After (v[Z.W])
```typescript
[Show the new way]
```

#### What Changed?

- [Change 1]: [Benefit]
- [Change 2]: [Benefit]
- [Change 3]: [Benefit]

#### Why This Is Better

[Explain the benefits of the new approach]

#### Migration Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

#### See Also

- [Related documentation]
- [Related change]
```

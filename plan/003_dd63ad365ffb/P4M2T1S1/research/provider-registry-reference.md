# ProviderRegistry Reference

## File Location
`/home/dustin/projects/groundswell/src/providers/provider-registry.ts`

## Singleton Pattern (Lines 139-147)

```typescript
private static instance: ProviderRegistry;

private constructor() {
  // Empty constructor for S1
  // Future subtasks may initialize with configuration
}

public static getInstance(): ProviderRegistry {
  if (!ProviderRegistry.instance) {
    ProviderRegistry.instance = new ProviderRegistry();
  }
  return ProviderRegistry.instance;
}
```

### Usage Pattern

```typescript
// CORRECT: Always use getInstance()
const registry = ProviderRegistry.getInstance();

// WRONG: Never instantiate directly
const registry = new ProviderRegistry(); // Error - constructor is private
```

## Provider Retrieval (Lines 218-223)

```typescript
public get(id: ProviderId): Provider | undefined {
  return this.providers.get(id);
}
```

### Key Characteristics

1. **Returns `Provider | undefined`**: Does NOT throw for missing providers
2. **Follows Map semantics**: Uses internal `Map<ProviderId, Provider>` storage
3. **Non-throwing**: Caller must check for undefined

### Usage Pattern

```typescript
const registry = ProviderRegistry.getInstance();
const provider = registry.get('anthropic');

if (provider) {
  // Provider exists - use it
  await provider.execute(request);
} else {
  // Provider not found - handle error
  throw new Error(`Provider 'anthropic' is not registered`);
}
```

## Error Handling Pattern (Lines 286-289)

From `initializeProvider()` method:

```typescript
const provider = this.get(id);
if (!provider) {
  throw new Error(`Provider '${id}' is not registered`);
}
```

### Error Message Format

- **Template literal with backticks**: `` `Provider '${id}' is not registered` ``
- **Includes provider ID**: Helpful for debugging
- **Consistent format**: All "not found" errors follow this pattern

## Provider Registration (Lines 207-215)

```typescript
public register(provider: Provider): void {
  if (this.providers.has(provider.id)) {
    throw new Error(`Provider '${provider.id}' is already registered`);
  }
  this.providers.set(provider.id, provider);
}
```

### Duplicate Registration Handling

- **Throws error**: Prevents duplicate registration with descriptive message
- **Uses `has()` check**: Tests if provider already exists before adding

## Testing Utilities (Lines 375-383)

```typescript
public static _resetForTesting(): void {
  ProviderRegistry.instance = null as any;
}

public _resetInitStateForTesting(): void {
  this.states.clear();
}
```

### Usage in Tests

```typescript
beforeEach(() => {
  ProviderRegistry._resetForTesting();
});

afterEach(() => {
  ProviderRegistry._resetForTesting();
});
```

## Module Export

From `/home/dustin/projects/groundswell/src/providers/index.ts`:
```typescript
export { ProviderRegistry, InitializationStatus } from './provider-registry.js';
```

### Import Pattern

```typescript
// In Agent constructor file (src/core/agent.ts)
import { ProviderRegistry } from '../providers/index.js';
```

## Complete Example for Agent Constructor

```typescript
// Get the registry singleton
const registry = ProviderRegistry.getInstance();

// Get provider by ID (returns undefined if not found)
const providerInstance = registry.get(effectiveProvider);

// Check for undefined and throw error
if (!providerInstance) {
  throw new Error(`Provider '${effectiveProvider}' is not registered`);
}

// Store provider instance
this.provider = providerInstance;
```

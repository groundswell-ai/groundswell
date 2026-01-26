# Usage Examples Extracted from Tests

This document contains real usage examples extracted from test files for reference when creating API documentation.

## configureProviders() Examples

### Basic Configuration

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:22-24
configureProviders({ defaultProvider: 'anthropic' });
```

### Configuration with Provider Defaults

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:35-42
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    anthropic: { apiKey: 'sk-test' },
    opencode: { endpoint: 'http://localhost:8080' }
  }
});
```

### Error Handling

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:58-61
expect(() => {
  configureProviders({ defaultProvider: 'invalid' });
}).toThrow(/Invalid default provider/i);
```

## getGlobalProviderConfig() Examples

### Default Behavior

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:145-151
const config = getGlobalProviderConfig();
expect(config).toEqual({
  defaultProvider: 'anthropic',
  providerDefaults: undefined
});
```

### After Configuration

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:180-191
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    anthropic: { apiKey: 'sk-test' }
  }
});
const config = getGlobalProviderConfig();
expect(config.defaultProvider).toBe('opencode');
```

## resolveProviderConfig() Examples

### Provider Resolution

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:252-257
const global = createGlobalConfig('anthropic');
const result = resolveProviderConfig(global);
expect(result.provider).toBe('anthropic');
```

### Agent Override

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:259-264
const global = createGlobalConfig('anthropic');
const result = resolveProviderConfig(global, 'opencode');
expect(result.provider).toBe('opencode');
```

### Options Merge

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:289-298
const global = createGlobalConfig('anthropic', {
  anthropic: { timeout: 30000, apiKey: 'sk-test' }
});
const result = resolveProviderConfig(global);
expect(result.options).toEqual({
  timeout: 30000,
  apiKey: 'sk-test'
});
```

### Full Cascade

```typescript
// From: src/__tests__/unit/utils/provider-config.test.ts:380-410
const global = createGlobalConfig('anthropic', {
  anthropic: {
    timeout: 30000,
    apiKey: 'sk-global',
    endpoint: 'https://api.anthropic.com'
  },
  opencode: {
    endpoint: 'http://localhost:8080',
    timeout: 60000
  }
});

const result = resolveProviderConfig(
  global,                    // Global: anthropic + both providers' defaults
  'opencode',                // Agent: use opencode provider
  { timeout: 10000 },        // Agent: override timeout
  'anthropic',               // Prompt: override back to anthropic
  { apiKey: 'sk-prompt' }    // Prompt: override apiKey
);

expect(result.provider).toBe('anthropic');
expect(result.options).toEqual({
  timeout: 10000,
  endpoint: 'https://api.anthropic.com',
  apiKey: 'sk-prompt'
});
```

## parseModelSpec() Examples

### Qualified Format

```typescript
// From: src/__tests__/unit/utils/model-spec.test.ts:11-18
const result = parseModelSpec('anthropic/claude-3-5-sonnet');
expect(result).toStrictEqual({
  provider: 'anthropic',
  model: 'claude-3-5-sonnet',
  raw: 'anthropic/claude-3-5-sonnet'
} as ModelSpec);
```

### Plain Format with Default Provider

```typescript
// From: src/__tests__/unit/utils/model-spec.test.ts:39-46
const result = parseModelSpec('claude-sonnet-4', 'anthropic');
expect(result).toStrictEqual({
  provider: 'anthropic',
  model: 'claude-sonnet-4',
  raw: 'claude-sonnet-4'
} as ModelSpec);
```

### OpenCode Qualified Format

```typescript
// From: src/__tests__/unit/utils/model-spec.test.ts:21-26
const result = parseModelSpec('opencode/gpt-4');
expect(result.provider).toBe('opencode');
expect(result.model).toBe('gpt-4');
expect(result.raw).toBe('opencode/gpt-4');
```

### Error Cases

```typescript
// From: src/__tests__/unit/utils/model-spec.test.ts:88-90
expect(() => parseModelSpec('')).toThrow(/cannot be empty/i);

// From: src/__tests__/unit/utils/model-spec.test.ts:96-97
expect(() => parseModelSpec('invalid/model')).toThrow(/invalid provider/i);
```

## formatModelForProvider() Examples

### Same Provider Pass-Through

```typescript
// From: src/__tests__/unit/utils/model-spec.test.ts:171-181
const spec: ModelSpec = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet',
  raw: 'anthropic/claude-3-5-sonnet'
};
const result = formatModelForProvider(spec, 'anthropic');
expect(result).toBe('claude-3-5-sonnet');
```

### Cross-Provider Error

```typescript
// From: src/__tests__/unit/utils/model-spec.test.ts:213-223
const spec: ModelSpec = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet',
  raw: 'anthropic/claude-3-5-sonnet'
};
expect(() => formatModelForProvider(spec, 'opencode')).toThrow(
  /Cannot translate.*anthropic\/claude-3-5-sonnet.*to.*opencode/
);
```

## ProviderRegistry Examples

### Singleton Pattern

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:63-68
const registry1 = ProviderRegistry.getInstance();
const registry2 = ProviderRegistry.getInstance();
expect(registry1).toBe(registry2);
expect(Object.is(registry1, registry2)).toBe(true);
```

### Register and Retrieve

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:98-103
const registry = ProviderRegistry.getInstance();
const anthropicProvider = createMockProvider('anthropic');
registry.register(anthropicProvider);
```

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:158-167
registry.register(anthropicProvider);
const retrieved = registry.get('anthropic');
expect(retrieved).toBeDefined();
expect(retrieved).toBe(anthropicProvider);
```

### Check Existence

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:201-207
const registry = ProviderRegistry.getInstance();
const anthropicProvider = createMockProvider('anthropic');
registry.register(anthropicProvider);
expect(registry.has('anthropic')).toBe(true);
```

### Initialize Provider

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:433-443
const registry = ProviderRegistry.getInstance();
const provider = createMockProvider('anthropic');
registry.register(provider);

await registry.initializeProvider('anthropic');

expect(provider.initialize).toHaveBeenCalledTimes(1);
expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
expect(registry.isReady('anthropic')).toBe(true);
```

### Initialize All

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:538-561
const registry = ProviderRegistry.getInstance();
const anthropic = createMockProvider('anthropic');
const opencode = createMockProvider('opencode');

registry.register(anthropic);
registry.register(opencode);

const config = {
  defaultProvider: 'anthropic' as const,
  providerDefaults: {
    anthropic: { apiKey: 'sk-anthropic' },
    opencode: { endpoint: 'http://localhost:8080' }
  }
};

const result = await registry.initializeAll(config);

expect(result.success).toContain('anthropic');
expect(result.success).toContain('opencode');
expect(result.failed).toHaveLength(0);
```

### Status Checking

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:713-722
const registry = ProviderRegistry.getInstance();
const provider = createMockProvider('anthropic');
registry.register(provider);

expect(registry.getStatus('anthropic')).toBe(InitializationStatus.UNINITIALIZED);

await registry.initializeProvider('anthropic');

expect(registry.getStatus('anthropic')).toBe(InitializationStatus.INITIALIZED);
```

### Terminate All

```typescript
// From: src/__tests__/unit/providers/provider-registry.test.ts:910-921
const registry = ProviderRegistry.getInstance();
const anthropic = createMockProvider('anthropic');
const opencode = createMockProvider('opencode');

registry.register(anthropic);
registry.register(opencode);

await registry.terminateAll();

expect(anthropic.terminate).toHaveBeenCalledTimes(1);
expect(opencode.terminate).toHaveBeenCalledTimes(1);
```

## Integration Usage Examples

### Agent Creation with Provider

```typescript
// From: src/__tests__/integration/provider-agent.test.ts:167-175
const provider = await createMockProvider();
ProviderRegistry.getInstance().register(provider);

const agent = new Agent({ provider: 'anthropic' });

expect(agent).toBeDefined();
expect(agent.id).toBeDefined();
```

### Agent Prompt Execution

```typescript
// From: src/__tests__/integration/provider-agent.test.ts:220-237
const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({
  user: 'Test prompt',
  responseFormat: z.object({ result: z.string() })
});

const response = await agent.prompt(prompt);

expect(isSuccess(response)).toBe(true);
expect(response.status).toBe('success');
expect(response.data).toBeDefined();
expect(response.error).toBeNull();
expect(response.metadata).toBeDefined();
```

### Prompt-Level Provider Override

```typescript
// From: src/__tests__/integration/provider-agent.test.ts:583-601
const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({
  user: 'Test',
  responseFormat: z.object({ result: z.string() })
});

// Prompt with provider override
const response = await agent.prompt(prompt, {
  provider: 'anthropic'
});

expect(isSuccess(response)).toBe(true);
```

### Session Management

```typescript
// From: src/__tests__/integration/provider-agent.test.ts:459-483
const agent = new Agent({ provider: 'anthropic' });
const prompt = new Prompt({
  user: 'First message',
  responseFormat: z.object({ result: z.string() })
});

// Prompt with sessionId
const response = await agent.prompt(prompt, {
  providerOptions: { sessionId: 'test-session' }
});

expect(isSuccess(response)).toBe(true);

// Session was created
const session = provider.getSession('test-session');
expect(session).toBeDefined();
```

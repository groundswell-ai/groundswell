# TypeScript Constructor Patterns Research

## Executive Summary

This document researches TypeScript best practices for constructor parameter patterns, backward compatibility, private field naming conventions, and optional parameter handling. Findings are based on established TypeScript patterns and analysis of the groundswell codebase.

## Table of Contents

1. [Constructor Parameter Patterns](#1-constructor-parameter-patterns)
2. [Backward Compatibility Patterns](#2-backward-compatibility-patterns)
3. [Private Field Naming Conventions](#3-private-field-naming-conventions)
4. [Optional Parameters and Default Values](#4-optional-parameters-and-default-values)
5. [Common Pitfalls](#5-common-pitfalls)
6. [Recommendations for OpenCodeProvider](#6-recommendations-for-opencodeprovider)

---

## 1. Constructor Parameter Patterns

### 1.1 Config Object Pattern vs Individual Parameters

#### Config Object Pattern ✅ (Recommended for this use case)

**When to use:**
- Constructor has 4+ parameters
- Many optional parameters
- Parameters may be added/removed frequently
- API is evolving

**Example from groundswell:**

```typescript
// src/types/agent.ts
export interface AgentConfig {
  name?: string;
  system?: string;
  tools?: Tool[];
  mcps?: MCPServer[];
  skills?: Skill[];
  hooks?: AgentHooks;
  env?: Record<string, string>;
  enableReflection?: boolean;
  enableCache?: boolean;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: ProviderId;
  providerOptions?: ProviderOptions;
}

// src/core/agent.ts
export class Agent {
  private readonly config: AgentConfig;

  constructor(config: AgentConfig = {}) {
    this.id = generateId();
    this.name = config.name ?? 'Agent';
    this.config = config;
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    // ... rest of initialization
  }
}
```

**Advantages:**
- ✅ Order independent - parameters can be in any order
- ✅ Self-documenting - parameter names visible at call site
- ✅ Easy to extend - adding new parameters without breaking existing code
- ✅ Reduces parameter count - cleaner for constructors with many parameters
- ✅ Better for optional parameters - easy to skip what you don't need
- ✅ Forward compatible - new properties don't affect existing calls

**Disadvantages:**
- ❌ Slightly more verbose for simple cases
- ❌ Requires defining an interface/type
- ❌ Minor object creation overhead (negligible)

#### Individual Parameters Pattern

**When to use:**
- Constructor has 1-3 parameters
- All parameters are required
- API is stable and won't change often
- Performance is critical

```typescript
class DatabaseConnection {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly database: string
  ) {}
}
```

**Advantages:**
- ✅ Concise - less boilerplate for simple cases
- ✅ Type safety - TypeScript enforces all required parameters
- ✅ Traditional - familiar pattern for most developers

**Disadvantages:**
- ❌ Order matters - must remember parameter order
- ❌ Hard to extend - adding parameters breaks existing calls
- ❌ Parameter position issues - unclear what each value represents
- ❌ Optional parameters must come after required ones

#### Hybrid Approach

**Best of both worlds when you have a mix of required and optional:**

```typescript
class UserService {
  constructor(
    private readonly apiKey: string,  // Required, positional
    private readonly apiUrl: string,  // Required, positional
    options?: UserServiceOptions      // Optional, named
  ) {}
}
```

### 1.2 Parameter Properties Shorthand

TypeScript provides a shorthand for declaring and initializing properties:

```typescript
// ✅ Concise - parameter properties
class Agent {
  constructor(
    private readonly config: AgentConfig,
    public readonly id: string
  ) {}
}

// Equivalent to:
class Agent {
  private readonly config: AgentConfig;
  public readonly id: string;

  constructor(config: AgentConfig, id: string) {
    this.config = config;
    this.id = id;
  }
}
```

**Accessibility modifiers in constructors:**
- `public` - property accessible from anywhere (rarely used)
- `private` - property only accessible within class (most common)
- `protected` - property accessible in class and subclasses
- `readonly` - property cannot be reassigned after initialization

---

## 2. Backward Compatibility Patterns

### 2.1 Optional Parameters with Defaults

**Simplest approach for backward compatibility:**

```typescript
class OpenCodeProvider {
  constructor(
    private readonly config: OpenCodeConfig = {}
  ) {
    // Use nullish coalescing for defaults
    this.endpoint = config.endpoint ?? 'https://api.opencode.dev';
    this.timeout = config.timeout ?? 30000;
    this.apiKey = config.apiKey ?? this.getDefaultApiKey();
  }
}
```

**Benefits:**
- ✅ Existing code continues to work
- ✅ New code can provide options
- ✅ Zero breaking changes

### 2.2 Constructor Overloading

**For multiple accepted signatures:**

```typescript
class OpenCodeProvider {
  // Overload signatures
  constructor(apiKey: string);
  constructor(config: OpenCodeConfig);
  constructor(configOrKey: string | OpenCodeConfig = {}) {
    // Implementation signature
    if (typeof configOrKey === 'string') {
      this.config = { apiKey: configOrKey };
    } else {
      this.config = configOrKey;
    }
  }
}
```

**Use cases:**
- Supporting legacy call patterns
- Migrating from positional to config object
- Multiple initialization patterns

### 2.3 Static Factory Methods

**For complex initialization or multiple creation patterns:**

```typescript
class OpenCodeProvider {
  private constructor(private readonly config: OpenCodeConfig) {
    // Private constructor - use factory methods
  }

  static create(config: OpenCodeConfig): OpenCodeProvider {
    return new OpenCodeProvider(config);
  }

  static fromApiKey(apiKey: string): OpenCodeProvider {
    return new OpenCodeProvider({ apiKey });
  }

  static fromEnv(): OpenCodeProvider {
    return new OpenCodeProvider({
      apiKey: process.env.OPENCODE_API_KEY,
      endpoint: process.env.OPENCODE_ENDPOINT
    });
  }
}
```

**Benefits:**
- ✅ Clear intent at call site
- ✅ Can return different types/subclasses
- ✅ Enables async initialization patterns
- ✅ Better for complex validation

### 2.4 Configuration Cascade Pattern (from groundswell)

**Priority order for configuration merging:**

```typescript
class Agent {
  private mergeConfig(
    promptOverrides?: PromptOverrides,
    agentConfig?: AgentConfig,
    globalConfig?: GlobalConfig
  ): EffectiveConfig {
    return {
      // Priority: Prompt > Agent > Global
      model: promptOverrides?.model ?? agentConfig?.model ?? globalConfig?.model ?? 'default',
      temperature: promptOverrides?.temperature ?? agentConfig?.temperature,
      // ... merge all properties with "last write wins"
    };
  }
}
```

---

## 3. Private Field Naming Conventions

### 3.1 Underscore Prefix (Most Common) ✅

**Convention:** Prefix private fields with underscore `_`

```typescript
class OpenCodeProvider {
  private _config: OpenCodeConfig;
  private _client: HttpClient;
  private _cache: Map<string, unknown>;

  constructor(config: OpenCodeConfig) {
    this._config = config;
    this._client = new HttpClient();
    this._cache = new Map();
  }

  public getConfig(): OpenCodeConfig {
    return this._config;  // Return copy or readonly view
  }
}
```

**Benefits:**
- ✅ Industry-standard convention
- ✅ Clear visual distinction from public properties
- ✅ Works with TypeScript's `private` keyword
- ✅ Supported by ESLint rules

**ESLint Configuration:**
```json
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "memberLike",
        "modifiers": ["private"],
        "format": ["camelCase"],
        "leadingUnderscore": "require"
      }
    ]
  }
}
```

### 3.2 No Prefix (Alternative)

**Some teams omit the underscore and rely solely on `private` keyword:**

```typescript
class OpenCodeProvider {
  private readonly config: OpenCodeConfig;
  private readonly client: HttpClient;

  constructor(config: OpenCodeConfig) {
    this.config = config;
    this.client = new HttpClient();
  }
}
```

**Benefits:**
- ✅ Cleaner code
- ✅ TypeScript enforces privacy anyway
- ✅ Less visual noise

**Drawbacks:**
- ❌ Harder to distinguish private from public at a glance
- ❌ No immediate visual indicator

### 3.3 Hash Prefix `#` (ES2022 Private Fields)

**For truly private fields (not accessible via `this`):**

```typescript
class OpenCodeProvider {
  #config: OpenCodeConfig;
  #cache: Map<string, unknown>;

  constructor(config: OpenCodeConfig) {
    this.#config = config;
    this.#cache = new Map();
  }
}
```

**Benefits:**
- ✅ Runtime privacy (cannot be accessed via bracket notation)
- ✅ Guaranteed privacy (not even accessible in subclasses)

**Drawbacks:**
- ❌ Harder to debug (not visible in console.log)
- ❌ Not yet widely adopted
- ❌ TypeScript tooling support is evolving

### 3.4 Recommendation for OpenCodeProvider

**Use underscore prefix for consistency with groundswell patterns:**

```typescript
class OpenCodeProvider {
  private readonly _config: OpenCodeConfig;
  private readonly _client: HttpClient;
  private readonly _mcpServers: Map<string, MCPServer>;

  constructor(config: OpenCodeConfig = {}) {
    this._config = this.normalizeConfig(config);
    this._client = new HttpClient(this._config);
    this._mcpServers = new Map();
  }

  // Public getter if needed
  get config(): Readonly<OpenCodeConfig> {
    return this._config;
  }
}
```

---

## 4. Optional Parameters and Default Values

### 4.1 Optional Properties in Config Interface

**Use optional properties with `?`:**

```typescript
interface OpenCodeConfig {
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
  retries?: number;
  enableCache?: boolean;
}
```

### 4.2 Default Value Patterns

#### Pattern 1: Nullish Coalescing `??` ✅ (Recommended)

**Use `??` to handle `null` and `undefined`:**

```typescript
constructor(config: OpenCodeConfig = {}) {
  this._endpoint = config.endpoint ?? 'https://api.opencode.dev';
  this._timeout = config.timeout ?? 30000;
  this._apiKey = config.apiKey ?? this.getDefaultApiKey();
}
```

**Why `??` over `||`:**
- `??` only treats `null`/`undefined` as "no value"
- `||` treats all falsy values (`''`, `0`, `false`) as "no value"
- `??` is safer for boolean and numeric defaults

#### Pattern 2: Logical OR `||` (Use with caution)

```typescript
// ⚠️ Potentially unsafe for boolean/numeric values
constructor(config: OpenCodeConfig = {}) {
  this._enableCache = config.enableCache || true;  // Always true!
  this._timeout = config.timeout || 30000;          // Can't use 0
}
```

#### Pattern 3: Explicit Undefined Checks

```typescript
constructor(config: OpenCodeConfig = {}) {
  this._endpoint = config.endpoint !== undefined
    ? config.endpoint
    : 'https://api.opencode.dev';
}
```

**Use when:**
- Need to distinguish between explicit `null` and undefined
- Complex validation logic required

### 4.3 Required vs Optional Properties

**Mark truly required properties without `?`:**

```typescript
interface OpenCodeConfig {
  apiKey: string;        // Required - no default
  endpoint?: string;     // Optional - has default
  timeout?: number;      // Optional - has default
}
```

**For backward compatibility, make new properties optional:**

```typescript
// Version 1.0
interface OpenCodeConfig {
  apiKey: string;
}

// Version 2.0 - backward compatible
interface OpenCodeConfig {
  apiKey: string;
  timeout?: number;      // ✅ New optional property
  retries?: number;      // ✅ New optional property
}
```

### 4.4 Validation and Normalization

**Normalize config in constructor:**

```typescript
class OpenCodeProvider {
  private readonly _config: NormalizedConfig;

  constructor(config: OpenCodeConfig = {}) {
    this._config = this.normalizeConfig(config);
  }

  private normalizeConfig(config: OpenCodeConfig): NormalizedConfig {
    if (!config.apiKey) {
      throw new Error('OpenCodeConfig.apiKey is required');
    }

    return {
      apiKey: config.apiKey,
      endpoint: config.endpoint ?? 'https://api.opencode.dev',
      timeout: Math.max(1000, Math.min(300000, config.timeout ?? 30000)),
      retries: Math.max(0, Math.min(10, config.retries ?? 3)),
      enableCache: config.enableCache ?? false,
    };
  }
}
```

---

## 5. Common Pitfalls

### 5.1 Using `||` for Defaults

❌ **Anti-pattern:**

```typescript
constructor(config: OpenCodeConfig = {}) {
  this._timeout = config.timeout || 30000;  // Can't use timeout: 0
  this._enableCache = config.enableCache || false;  // Always false!
}
```

✅ **Correct:**

```typescript
constructor(config: OpenCodeConfig = {}) {
  this._timeout = config.timeout ?? 30000;
  this._enableCache = config.enableCache ?? false;
}
```

### 5.2 Breaking Backward Compatibility

❌ **Anti-pattern:**

```typescript
// Version 1.0
constructor(apiKey: string) {}

// Version 2.0 - BREAKING CHANGE!
constructor(config: OpenCodeConfig) {}
```

✅ **Correct:**

```typescript
// Version 2.0 - backward compatible
constructor(config: string | OpenCodeConfig) {
  if (typeof config === 'string') {
    config = { apiKey: config };
  }
  // ... use config
}
```

### 5.3 Exposing Private Config Directly

❌ **Anti-pattern:**

```typescript
class OpenCodeProvider {
  private _config: OpenCodeConfig;

  getConfig(): OpenCodeConfig {
    return this._config;  // Mutable! Caller can modify
  }
}
```

✅ **Correct:**

```typescript
class OpenCodeProvider {
  private readonly _config: NormalizedConfig;

  getConfig(): Readonly<NormalizedConfig> {
    return this._config;  // TypeScript prevents modification
  }

  // Or return a copy
  getConfigCopy(): NormalizedConfig {
    return { ...this._config };
  }
}
```

### 5.4 Mutable Configuration Objects

❌ **Anti-pattern:**

```typescript
constructor(config: OpenCodeConfig) {
  this._config = config;  // Reference to mutable object!
}

// Caller can do:
provider.getConfig().apiKey = 'hacked';
```

✅ **Correct:**

```typescript
constructor(config: OpenCodeConfig) {
  // Create a defensive copy
  this._config = { ...config };
}

// Or normalize to a new object
constructor(config: OpenCodeConfig) {
  this._config = this.normalizeConfig(config);
}
```

### 5.5 Inconsistent Naming

❌ **Anti-pattern:**

```typescript
private config: OpenCodeConfig;       // No underscore
private _client: HttpClient;           // Underscore
private mcpServers: Map<string, MCP>;  // No underscore, inconsistent!
```

✅ **Correct:**

```typescript
private readonly _config: OpenCodeConfig;
private readonly _client: HttpClient;
private readonly _mcpServers: Map<string, MCP>;
```

---

## 6. Recommendations for OpenCodeProvider

### 6.1 Recommended Constructor Signature

```typescript
/**
 * OpenCodeProvider - Multi-provider LLM integration
 *
 * ## Constructor Pattern
 *
 * Uses config object pattern for extensibility and backward compatibility.
 *
 * @example <caption>Minimal configuration</caption>
 * ```ts
 * const provider = new OpenCodeProvider({
 *   apiKey: process.env.OPENCODE_API_KEY
 * });
 * ```
 *
 * @example <caption>Full configuration</caption>
 * ```ts
 * const provider = new OpenCodeProvider({
 *   apiKey: 'sk-...',
 *   endpoint: 'https://custom.endpoint.com',
 *   timeout: 60000,
 *   retries: 5,
 *   enableCache: true
 * });
 * ```
 *
 * @example <caption>Backward compatible legacy call</caption>
 * ```ts
 * // Still supported for backward compatibility
 * const provider = new OpenCodeProvider('api-key-here');
 * ```
 */
export class OpenCodeProvider {
  /** Normalized configuration with defaults applied */
  private readonly _config: NormalizedOpenCodeConfig;

  /** HTTP client for API requests */
  private readonly _client: HttpClient;

  /** Registered MCP servers */
  private readonly _mcpServers: Map<string, MCPServer> = new Map();

  /** Loaded skills */
  private readonly _skills: Map<string, Skill> = new Map();

  /**
   * Create a new OpenCodeProvider instance
   *
   * @param config - Provider configuration (or API key string for legacy support)
   */
  constructor(config: OpenCodeConfig | string = {}) {
    // Support legacy string API key pattern
    if (typeof config === 'string') {
      config = { apiKey: config };
    }

    // Normalize and validate config
    this._config = this.normalizeConfig(config);

    // Initialize HTTP client
    this._client = new HttpClient({
      endpoint: this._config.endpoint,
      timeout: this._config.timeout,
      headers: {
        'Authorization': `Bearer ${this._config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Initialize cache if enabled
    if (this._config.enableCache) {
      this._cache = new LRUCache({
        maxSize: this._config.cacheMaxSize,
        ttl: this._config.cacheTTL
      });
    }
  }

  /**
   * Normalize and validate configuration
   *
   * Applies defaults and validates required fields.
   * Creates a new object to avoid mutation of input.
   */
  private normalizeConfig(config: OpenCodeConfig): NormalizedOpenCodeConfig {
    // Validate required fields
    if (!config.apiKey) {
      throw new Error(
        'OpenCodeConfig.apiKey is required. ' +
        'Provide it in config or set OPENCODE_API_KEY environment variable.'
      );
    }

    // Apply defaults with validation
    const timeout = config.timeout ?? 30000;
    if (timeout < 1000 || timeout > 300000) {
      throw new Error(
        'OpenCodeConfig.timeout must be between 1000 and 300000 milliseconds'
      );
    }

    const retries = config.retries ?? 3;
    if (retries < 0 || retries > 10) {
      throw new Error(
        'OpenCodeConfig.retries must be between 0 and 10'
      );
    }

    // Return normalized config
    return {
      apiKey: config.apiKey,
      endpoint: config.endpoint ?? 'https://api.opencode.dev',
      timeout,
      retries,
      enableCache: config.enableCache ?? false,
      cacheMaxSize: config.cacheMaxSize ?? 1000,
      cacheTTL: config.cacheTTL ?? 300000,  // 5 minutes
    };
  }

  /**
   * Get the provider configuration (read-only)
   *
   * Returns a readonly view of the configuration to prevent
   * external mutation.
   */
  get config(): Readonly<NormalizedOpenCodeConfig> {
    return this._config;
  }
}
```

### 6.2 Type Definitions

```typescript
/**
 * Configuration for OpenCodeProvider
 *
 * All properties are optional except when otherwise noted,
 * to support incremental adoption and backward compatibility.
 */
export interface OpenCodeConfig {
  /**
   * API key for authentication
   *
   * Can also be provided via OPENCODE_API_KEY environment variable.
   * This is the only required property.
   */
  apiKey?: string;

  /**
   * API endpoint URL
   *
   * @default "https://api.opencode.dev"
   */
  endpoint?: string;

  /**
   * Request timeout in milliseconds
   *
   * Must be between 1000 and 300000 (5 minutes).
   *
   * @default 30000
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed requests
   *
   * Must be between 0 and 10.
   *
   * @default 3
   */
  retries?: number;

  /**
   * Enable response caching
   *
   * @default false
   */
  enableCache?: boolean;

  /**
   * Maximum cache size (number of entries)
   *
   * @default 1000
   */
  cacheMaxSize?: number;

  /**
   * Cache time-to-live in milliseconds
   *
   * @default 300000 (5 minutes)
   */
  cacheTTL?: number;
}

/**
 * Normalized configuration with all defaults applied
 *
 * This is the internal representation after normalization.
 * All properties are required (no optional).
 */
export interface NormalizedOpenCodeConfig {
  /** API key (required) */
  readonly apiKey: string;

  /** API endpoint with default applied */
  readonly endpoint: string;

  /** Timeout with default and validation applied */
  readonly timeout: number;

  /** Retries with default and validation applied */
  readonly retries: number;

  /** Cache enabled flag with default applied */
  readonly enableCache: boolean;

  /** Cache max size with default applied */
  readonly cacheMaxSize: number;

  /** Cache TTL with default applied */
  readonly cacheTTL: number;
}
```

### 6.3 Backward Compatibility Support

```typescript
/**
 * Factory methods for common initialization patterns
 */
export class OpenCodeProvider {
  /**
   * Create provider from environment variables
   *
   * Reads OPENCODE_API_KEY and OPENCODE_ENDPOINT from environment.
   *
   * @throws Error if OPENCODE_API_KEY is not set
   */
  static fromEnv(): OpenCodeProvider {
    const apiKey = process.env.OPENCODE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENCODE_API_KEY environment variable is required'
      );
    }

    return new OpenCodeProvider({
      apiKey,
      endpoint: process.env.OPENCODE_ENDPOINT
    });
  }

  /**
   * Create provider with minimal configuration
   *
   * Shortcut for providing just an API key.
   */
  static withApiKey(apiKey: string): OpenCodeProvider {
    return new OpenCodeProvider({ apiKey });
  }

  /**
   * Legacy constructor support
   *
   * Accepts API key as string for backward compatibility.
   */
  constructor(config: string | OpenCodeConfig = {}) {
    // Handle legacy string API key pattern
    if (typeof config === 'string') {
      console.warn(
        'Passing API key as string is deprecated. ' +
        'Use { apiKey: "..." } instead.'
      );
      config = { apiKey: config };
    }

    // ... rest of constructor
  }
}
```

### 6.4 Key Takeaways

1. **Use config object pattern** - Extensible and self-documenting
2. **Make properties optional** - Use `?` for backward compatibility
3. **Use `??` for defaults** - Safer than `||` for boolean/numeric values
4. **Normalize config** - Validate and create defensive copy in constructor
5. **Private fields with `_` prefix** - Industry standard convention
6. **Expose readonly config** - Use `Readonly<>` or getters to prevent mutation
7. **Support legacy patterns** - Constructor overloading for backward compatibility
8. **Static factory methods** - For complex initialization patterns
9. **Validate required fields** - Throw descriptive errors for missing config
10. **Document with examples** - Show common usage patterns in JSDoc

---

## References

### TypeScript Documentation
- [TypeScript Handbook - Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript Handbook - Parameter Properties](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties)
- [TypeScript Handbook - Handbook/Classes#constructors)

### ESLint Rules
- [@typescript-eslint/naming-convention](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/naming-convention.md)
- [no-underscore-dangle considerations](https://eslint.org/docs/latest/rules/no-underscore-dangle)

### Community Best Practices
- [TypeScript Deep Dive - Classes](https://basarat.gitbook.io/typescript/type-system/classes)
- [Effective TypeScript - Constructors](https://effectivetypescript.com/2020/08/12/constructors/)
- [Microsoft TypeScript Coding Guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines)

### Groundswell Codebase Patterns
- `/home/dustin/projects/groundswell/src/core/agent.ts` - Config object pattern
- `/home/dustin/projects/groundswell/src/types/agent.ts` - Config interface design
- `/home/dustin/projects/groundswell/src/cache/cache.ts` - Cache config pattern
- `/home/dustin/projects/groundswell/src/types/providers.ts` - Provider config cascade

---

*Document generated: 2026-01-26*
*Research task: P4M1T1S2 - Constructor patterns research*
*Plan ID: 003_dd63ad365ffb*

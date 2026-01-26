# JSDoc Documentation Patterns

## Codebase JSDoc Standards

### 1. Basic Field Documentation

```typescript
export interface AgentConfig {
  /** Human-readable name for the agent */
  name?: string;

  /** System prompt for the agent */
  system?: string;

  /** Tools available to the agent */
  tools?: Tool[];
}
```

**Pattern**: Concise single-line description using `/** */`

### 2. Extended Documentation with Sections

From `/src/types/providers.ts` - GlobalProviderConfig:

```typescript
/**
 * Global provider configuration
 *
 * Configures default provider and per-provider options that cascade
 * to all agents unless explicitly overridden.
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * Priority order (lowest to highest):
 * 1. GlobalProviderConfig (this config)
 * 2. AgentConfig.provider / AgentConfig.providerOptions
 * 3. Prompt-level overrides
 *
 * @example
 * ```ts
 * configureProviders({
 *   defaultProvider: 'opencode',
 *   providerDefaults: {
 *     opencode: { endpoint: 'http://localhost:8080' },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY }
 *   }
 * });
 * ```
 */
export interface GlobalProviderConfig {
  /**
   * Default provider to use when none specified
   */
  defaultProvider: ProviderId;

  /**
   * Per-provider default options
   * Mapped by provider ID, all options are optional
   */
  providerDefaults?: Partial<Record<ProviderId, ProviderOptions>>;
}
```

**Key Elements**:
- Interface-level summary
- Detailed description paragraphs
- `##` headings for sections
- `@example` tags with code blocks
- Field-level JSDoc for each property

### 3. Configuration Cascade Documentation Pattern

From `/src/utils/provider-config.ts`:

```typescript
/**
 * Resolve provider configuration with cascade
 *
 * **P1.M2.T1.S4 - Configuration Cascade Utility**
 *
 * This function implements the PRD 7.7 configuration cascade:
 * Global config → Agent config → Prompt config (highest priority).
 *
 * ## Provider Resolution
 *
 * The provider is resolved using nullish coalescing (`??`), which means
 * the first non-null/undefined value wins:
 *
 * ```ts
 * const provider = promptProvider ?? agentProvider ?? globalConfig.defaultProvider;
 * ```
 *
 * Priority (highest to lowest):
 * 1. Prompt-level provider override
 * 2. Agent-level provider override
 * 3. Global default provider
 *
 * ## Options Merge
 *
 * Options are merged using object spread with "last write wins" semantics:
 *
 * ```ts
 * const options = {
 *   ...globalConfig.providerDefaults?.[provider],
 *   ...agentOptions,
 *   ...promptOptions
 * };
 * ```
 */
```

**Pattern**: Explicit priority levels with code examples

### 4. Extended JSDoc with PRD Cross-References

From `/src/types/agent.ts` - createSuccessResponse():

```typescript
/**
 * Creates a success response with data and metadata.
 *
 * ## PRD 6.4 Compliance
 *
 * The returned response satisfies all PRD 6.4 requirements:
 * - Strict JSON parseable by `JSON.parse()` (PRD 6.4.1)
 * - No prose wrapping - pure JSON structure (PRD 6.4.2)
 * - Consistent with AgentResponse interface (PRD 6.4.3)
 * - Uses null instead of undefined (PRD 6.4.4)
 *
 * @template T - The type of the response data
 * @param data - The response data to return
 * @param metadata - Response metadata including agentId and timestamp
 * @returns A success AgentResponse with status 'success', provided data, null error
 *
 * @example <caption>Basic success response (PRD 6.5)</caption>
 * ```ts
 * const response = createSuccessResponse(
 *   { result: 'Task completed', artifacts: ['file1.ts', 'file2.ts'] },
 *   { agentId: 'agent-abc123', timestamp: 1706140800000, duration: 1523 }
 * );
 *
 * // Guaranteed to be valid JSON (PRD 6.4.1)
 * const jsonString = JSON.stringify(response);
 * const parsed = JSON.parse(jsonString); // Always valid
 * ```
 */
```

**Key Elements**:
- PRD section cross-references
- Bulleted compliance requirements
- `@template` for generics
- `@param` for parameters
- `@returns` for return value
- `@example <caption>Description>` for examples

### 5. Provider Interface Documentation

From `/src/types/providers.ts`:

```typescript
/**
 * Provider interface for LLM backend abstraction
 *
 * Defines the contract all providers must implement to support
 * multi-provider Agent SDK execution.
 *
 * @remarks
 *
 * ## Implementation Requirements
 *
 * All provider implementations MUST:
 * - Use readonly properties for `id` and `capabilities`
 * - Implement all 6 methods with exact signatures
 * - Delegate tool execution via the `toolExecutor` callback
 *
 * ## Lifecycle
 *
 * 1. **Construction**: Provider is instantiated
 * 2. **Initialization**: `initialize(options?)` is called
 * 3. **Execution**: `execute<T>(request, toolExecutor, hooks?)`
 * 4. **Termination**: `terminate()` cleans up resources
 *
 * @template T - The expected response data type
 * @param request - The prompt request with options
 * @returns Promise resolving to AgentResponse
 *
 * @example <caption>Basic usage</caption>
 * ```ts
 * const response = await provider.execute(
 *   { prompt: 'Hello', options: {} },
 *   toolExecutor
 * );
 * ```
 *
 * @see {@link https://docs.anthropic.com/en/api/messages | External Docs}
 * @see {@link ProviderOptions} for options structure
 */
export interface Provider {
  // ...
}
```

**Key Elements**:
- `@remarks` for implementation details
- `##` for subheadings
- Numbered lists for sequences
- `@see` for cross-references (internal and external)
- `@template` for generic types

## Best Practices for This PRP

1. **Use `/** */` format** - Not `/* */` or `///`
2. **Include configuration cascade documentation** - With `##` heading
3. **Use `@example <caption>Description>`** - For code examples
4. **Cross-reference related types** - With `@see` tags
5. **Document priority levels** - Explicitly for cascading configs
6. **Reference PRD sections** - When applicable
7. **Keep field descriptions concise** - One line per field
8. **Use code blocks for examples** - With language identifier (`ts`)

## Template for AgentConfig Extension

```typescript
/**
 * [Brief summary of field purpose]
 *
 * [Extended description if needed]
 *
 * ## Configuration Cascade (PRD 7.7)
 *
 * [Priority explanation with highest to lowest order]
 *
 * @example <caption>[Example description]</caption>
 * ```ts
 * [Code example]
 * ```
 *
 * @see {@link [RelatedType]} for [description]
 * @see {@link [RelatedFunction]} for [description]
 */
fieldName?: FieldType;
```

# Provider Types Reference

## Source File: `/src/types/providers.ts`

## ProviderId Type

```typescript
export type ProviderId = 'anthropic' | 'opencode';
```

**Description**: Union type of supported provider identifiers

**Valid Values**:
- `'anthropic'` - Anthropic Claude provider
- `'opencode'` - OpenCode provider

## ProviderOptions Interface

```typescript
export interface ProviderOptions {
  /** API endpoint override */
  endpoint?: string;

  /** API key (if not from environment) */
  apiKey?: string;

  /** Session ID for session-based providers */
  sessionId?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Custom headers */
  headers?: Record<string, string>;
}
```

**Field Descriptions**:
- `endpoint?: string` - Override default API endpoint
- `apiKey?: string` - API key if not from environment variables
- `sessionId?: string` - Session identifier for session-based providers
- `timeout?: number` - Request timeout in milliseconds
- `headers?: Record<string, string>` - Custom HTTP headers

**All fields are optional** - Uses `?` modifier consistently

## Related Types

### GlobalProviderConfig

```typescript
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

### ProviderCapabilities

```typescript
export interface ProviderCapabilities {
  /** MCP server connections */
  mcp: boolean;
  /** Skill loading */
  skills: boolean;
  /** Language Server Protocol integration */
  lsp: boolean;
  /** Streaming responses */
  streaming: boolean;
  /** Session-based state */
  sessions: boolean;
  /** Extended thinking/reasoning */
  extendedThinking: boolean;
}
```

## Import Statement

```typescript
import type { ProviderId, ProviderOptions } from './providers.js';
```

**Note**: ES modules require `.js` extension even for TypeScript files

## Export Structure

These types are exported from:
- Primary: `/src/types/providers.ts`
- Re-export: `/src/types/index.ts`
- Re-export: `/src/index.ts`

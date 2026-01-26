# Research Notes: Multi-Provider Documentation Patterns

## Overview
Research into how major projects document multi-provider and multi-backend systems, with focus on patterns relevant to Groundswell's LLM provider abstraction layer.

## 1. LLM SDK Multi-Provider Documentation

### LangChain.js Documentation Patterns

**URL**: https://js.langchain.com/docs/

#### Provider-Specific Documentation Structure

```markdown
## Integration: [Provider Name]

### Overview
[Brief description of what this provider offers]

### Installation
```bash
npm install @langchain/[provider]
```

### Setup
```typescript
import { [Provider] } from "@langchain/[provider]";
const provider = new [Provider]({
  apiKey: process.env.[PROVIDER]_API_KEY,
});
```

### Features
- Feature 1: Description
- Feature 2: Description
- ⚠️ Limitations: What's not supported

### Usage Examples
#### Basic Usage
#### Advanced Configuration

### API Reference
### Migration Guide
```

#### Capability Matrix Pattern

| Feature | OpenAI | Anthropic | Cohere | HuggingFace |
|---------|--------|-----------|--------|-------------|
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Function Calling | ✅ | ✅ | ❌ | ❌ |
| Image Input | ✅ | ✅ | ✅ | Partial |
| Token Counting | ✅ | ✅ | ✅ | ❌ |

**Key Insight**: Visual indicators (✅, ❌, Partial) make capability differences immediately scannable.

#### Configuration Cascade Documentation

```markdown
## Configuration Priority

1. **Runtime parameters** (highest priority)
2. **Environment variables**
3. **Constructor defaults**
4. **Global configuration** (lowest priority)
```

### Vercel AI SDK Documentation Patterns

**URL**: https://sdk.vercel.ai/docs

#### Provider Switching Examples

Vercel AI SDK shows explicit before/after comparisons:

```markdown
## Switching Providers

### From OpenAI to Anthropic

**Before (OpenAI):**
```typescript
import { openai } from '@ai-sdk/openai';
const result = await generateText({
  model: openai('gpt-4-turbo'),
  prompt: 'Hello'
});
```

**After (Anthropic):**
```typescript
import { anthropic } from '@ai-sdk/anthropic';
const result = await generateText({
  model: anthropic('claude-3-opus-20240229'),
  prompt: 'Hello'
});
```
```

#### Unified Interface Documentation

Vercel emphasizes the **same interface, different providers** pattern:

```markdown
## Unified Provider Interface

All providers implement the same interface. This means you can swap providers without changing application logic.
```

#### Provider-Specific Features Section

```markdown
## Provider-Specific Features

### OpenAI
- **Parallel Function Calling**: Call multiple functions simultaneously
- **JSON Mode**: Guarantee JSON output
- **Seed Support**: Reproducible outputs

### Anthropic
- **Extended Thinking**: Reasoning tokens for complex tasks
- **Tool Use Beta**: Advanced tool calling
- **Cache Control**: Prompt caching for cost reduction
```

## 2. Database ORM Multi-Database Documentation

### Prisma Documentation Patterns

**URL**: https://www.prisma.io/docs

#### Multi-Database Setup Documentation

```markdown
## Multiple Database Connections

### Schema Configuration

**prisma/databases/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

datasource analytics {
  provider = "clickhouse"
  url      = env("ANALYTICS_DATABASE_URL")
}
```

### Client Generation

```typescript
import { PrismaClient } from '@prisma/client-db';
import { PrismaClient as AnalyticsClient } from '@prisma/client-analytics';

const db = new PrismaClient();
const analytics = new AnalyticsClient();
```
```

#### Database-Specific Features Matrix

```markdown
## Feature Support by Database

| Feature | PostgreSQL | MySQL | SQLite | SQL Server |
|---------|-----------|-------|--------|------------|
| JSON Support | ✅ JsonB | ✅ Json | ❌ | ✅ |
| Full-text Search | ✅ | ✅ | ❌ | ✅ |
| Array Types | ✅ | ❌ | ❌ | ❌ |
```

### TypeORM Documentation Patterns

**URL**: https://typeorm.io

#### Multiple Connection Documentation

```markdown
## Multiple Database Connections

### Creating Multiple Connections

```typescript
// Primary database (PostgreSQL)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'app_db',
});

// Analytics database (MongoDB)
const AnalyticsDataSource = new DataSource({
  type: 'mongodb',
  host: 'localhost',
  port: 27017,
  database: 'analytics_db',
});
```

### Configuration Manager Pattern

```typescript
export const connections = {
  app: AppDataSource,
  analytics: AnalyticsDataSource
};

export async function initializeAllConnections() {
  await Promise.all([
    AppDataSource.initialize(),
    AnalyticsDataSource.initialize()
  ]);
}
```

## 3. Storage Provider Multi-Backend Documentation

### AWS SDK v3 for JavaScript

**URL**: https://docs.aws.amazon.com/sdk-for-javascript

#### Endpoint Override Pattern

```markdown
## Using Different S3-Compatible Services

### Amazon S3 (Standard)
```typescript
const s3 = new S3Client({
  region: 'us-east-1'
});
```

### MinIO (Self-Hosted)
```typescript
const s3 = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin'
  },
  forcePathStyle: true  // Required for MinIO
});
```

### Wasabi (Alternative Cloud)
```typescript
const s3 = new S3Client({
  endpoint: 'https://s3.wasabisys.com',
  region: 'us-east-1',
  credentials: fromNodeProviderChain()
});
```

### Configuration Factory Pattern

```typescript
interface StorageConfig {
  provider: 'aws' | 'minio' | 'wasabi';
  endpoint?: string;
  region: string;
}

export function createStorageClient(config: StorageConfig): S3Client {
  const baseConfig = { region: config.region };

  const providerConfigs = {
    aws: () => baseConfig,
    minio: () => ({
      ...baseConfig,
      endpoint: config.endpoint ?? 'http://localhost:9000',
      forcePathStyle: true
    }),
    wasabi: () => ({
      ...baseConfig,
      endpoint: 'https://s3.wasabisys.com'
    })
  };

  return new S3Client(providerConfigs[config.provider]());
}
```

## 4. Documentation Structure Patterns

### Navigation Organization

**Best Practice**: Separate "Concepts" from "Reference" from "Guides"

```markdown
docs/
├── concepts/
│   ├── providers.md           # Provider abstraction overview
│   ├── configuration.md       # How configuration cascade works
│   └── model-specification.md # Model string formats
├── guides/
│   ├── switching-providers.md # Step-by-step migration
│   ├── multi-provider-setup.md# Using multiple providers
│   └── provider-specific.md   # Provider-specific features
├── reference/
│   ├── provider-api.md        # Complete API reference
│   ├── provider-config.md     # Configuration options
│   └── provider-registry.md   # Registry class docs
└── providers/
    ├── anthropic.md           # Anthropic-specific docs
    ├── opencode.md            # OpenCode-specific docs
    └── comparison.md          # Feature comparison matrix
```

### Quick Reference Tables

**Pattern**: Feature Comparison Matrix

```markdown
## Provider Feature Comparison

| Feature | Anthropic | OpenCode | Notes |
|---------|-----------|----------|-------|
| **LLM Access** | ✅ Claude models | ✅ 75+ providers | OpenCode is multi-provider gateway |
| **MCP Integration** | ✅ Full support | ❌ LLM-only mode | |
| **Tool Execution** | ✅ Client-side | ❌ Server-side | OpenCode tools run on server |
| **Sessions** | ✅ Abstraction layer | ✅ Native | Different implementations |
| **Streaming** | ✅ | ✅ | Both support SSE |
| **Skills** | ✅ System prompt injection | ✅ System prompt injection | Same approach |
```

### Configuration Cascade Visualization

**Pattern**: Visual Hierarchy Diagram

```markdown
## Configuration Cascade

The provider system uses a three-level configuration cascade. Higher levels override lower levels.

```
┌─────────────────────────────────────────────────────────────┐
│  Level 1: Global Configuration (Lowest Priority)           │
│  configureProviders({                                       │
│    defaultProvider: 'anthropic',                            │
│    providerDefaults: {                                      │
│      anthropic: { apiKey: '...', timeout: 30000 },         │
│      opencode: { endpoint: '...', timeout: 60000 }         │
│    }                                                        │
│  })                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │ ?? (nullish coalescing)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Level 2: Agent Configuration (Medium Priority)            │
│  new Agent({                                                │
│    provider: 'opencode',           // Overrides global      │
│    providerOptions: {              // Merges with global    │
│      timeout: 120000               // Override timeout      │
│    }                                                        │
│  })                                                         │
└────────────────────┬────────────────────────────────────────┘
                     │ ??
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Level 3: Prompt Configuration (Highest Priority)          │
│  agent.prompt(prompt, {                                     │
│    provider: 'anthropic',          // Overrides agent       │
│    providerOptions: {              // Merges with all      │
│      apiKey: 'sk-prompt'           // Override API key     │
│    }                                                        │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
```

## 5. Code Example Patterns

### Getting Started Examples

**Pattern**: Minimal Working Example First

```markdown
## Quick Start

### 1. Install Dependencies
```bash
npm install groundswell @anthropic-ai/claude-agent-sdk
```

### 2. Configure Provider
```typescript
// src/config/providers.ts
import { configureProviders, AnthropicProvider, ProviderRegistry } from 'groundswell';

configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30000
    }
  }
});

const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());
await registry.initializeAll();
```

### 3. Use with Agent
```typescript
// src/index.ts
import { Agent, Prompt } from 'groundswell';

const agent = new Agent({
  model: 'claude-sonnet-4-20250514'
});

const result = await agent.prompt(
  new Prompt({ user: 'Explain quantum computing' })
);

console.log(result.content);
```
```

### Provider Switching Examples

**Pattern**: Side-by-Side Comparisons

```markdown
## Provider Switching Examples

### Example 1: Switch at Agent Level

```typescript
// Agent A uses Anthropic
const agentA = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514'
});

// Agent B uses OpenCode
const agentB = new Agent({
  provider: 'opencode',
  model: 'openai/gpt-4'
});

// Both use the same interface
const resultA = await agentA.prompt(prompt);
const resultB = await agentB.prompt(prompt);
```

### Example 2: Switch at Prompt Level

```typescript
// Default agent
const agent = new Agent({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514'
});

// Most prompts use Anthropic
const result1 = await agent.prompt(prompt1);

// This prompt uses OpenCode instead
const result2 = await agent.prompt(prompt2, {
  provider: 'opencode',
  providerOptions: {
    model: 'openai/gpt-4'
  }
});
```
```

### Multi-Provider Examples

**Pattern**: Use Case Scenarios

```markdown
## Use Case: Multi-Provider Application

### Scenario: Cost-Optimized Routing

Route simple requests to cheaper models, complex requests to capable models.

```typescript
class CostOptimizer {
  private anthropicAgent: Agent;
  private openCodeAgent: Agent;

  constructor() {
    // Expensive but capable
    this.anthropicAgent = new Agent({
      provider: 'anthropic',
      model: 'claude-opus-4-20250514'
    });

    // Cheap via OpenCode gateway
    this.openCodeAgent = new Agent({
      provider: 'opencode',
      model: 'openai/gpt-4o-mini'
    });
  }

  async prompt(userMessage: string) {
    // Simple queries → cheap model
    if (userMessage.length < 100) {
      return await this.openCodeAgent.prompt(
        new Prompt({ user: userMessage })
      );
    }

    // Complex queries → capable model
    return await this.anthropicAgent.prompt(
      new Prompt({ user: userMessage })
    );
  }
}
```

### Scenario: Provider Fallback

```typescript
class ResilientAgent {
  private primaryProvider: ProviderId = 'anthropic';
  private fallbackProvider: ProviderId = 'opencode';

  async promptWithFallback(prompt: Prompt) {
    try {
      return await this.agent.prompt(prompt, {
        provider: this.primaryProvider
      });
    } catch (error) {
      console.warn(`Primary provider failed: ${error.message}`);
      return await this.agent.prompt(prompt, {
        provider: this.fallbackProvider
      });
    }
  }
}
```
```

## 6. Anti-Patterns to Avoid

### Documentation Anti-Patterns

❌ **Don't**: Mix provider-specific and generic documentation
```markdown
# Bad: Confusing
## Provider Configuration
Configure Anthropic with API key. For OpenCode use endpoint.

configureProviders({
  anthropic: { apiKey: '...' },  // Anthropic only
  opencode: { endpoint: '...' }   // OpenCode only
});
```

✅ **Do**: Separate concerns clearly
```markdown
# Good: Clear separation
## Generic Configuration
```typescript
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: { /* ... */ }
});
```

## Provider-Specific Options
See [Anthropic Configuration](/providers/anthropic#configuration) and [OpenCode Configuration](/providers/opencode#configuration).
```

❌ **Don't**: Hide capability differences
```markdown
# Bad: Misleading
Both providers support tools and sessions.
```

✅ **Do**: Explicitly document differences
```markdown
# Good: Honest
| Feature | Anthropic | OpenCode |
|---------|-----------|----------|
| Tools | ✅ Client-side MCP | ❌ Server-side only |
| Sessions | ✅ Abstraction layer | ✅ Native SDK |
```

❌ **Don't**: Make users search for switch instructions
```markdown
# Bad: Buried information
To switch providers, update the configuration object's provider property...
```

✅ **Do**: Provide dedicated migration guide
```markdown
# Good: Obvious link
## Switching Providers
→ [Migration Guide: Anthropic to OpenCode](/guides/migrations/anthropic-to-opencode)
→ [Quick Reference: Provider Switching](/guides/provider-switching)
```

## Key Takeaway for PRP

Industry best practices for multi-provider documentation:

1. **Visual Documentation**: Capability matrices with ✅/❌, cascade diagrams, side-by-side code
2. **Structural Patterns**: Separate concepts/guides/reference, provider-specific pages, migration guides
3. **Code Examples**: Executable, progressive, real-world use cases (cost optimization, fallback)
4. **Anti-Patterns to Avoid**: Don't hide differences, don't mix concerns, don't bury information

For Groundswell provider usage examples:
- Create feature comparison matrix
- Show configuration cascade visually
- Provide side-by-side provider comparisons
- Include real-world multi-provider scenarios
- Document provider-specific features honestly

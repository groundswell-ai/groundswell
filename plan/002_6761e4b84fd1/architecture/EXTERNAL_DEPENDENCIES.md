# External Dependencies & Research

**Project:** Groundswell - Hierarchical Workflow Orchestration Engine
**Analysis Date:** 2026-01-24

---

## Production Dependencies

### @anthropic-ai/sdk (^0.71.1)

**Purpose:** Anthropic Claude API client for LLM interactions

**Usage Locations:**
- `src/core/agent.ts` - Agent class
- Examples 07, 08, 09, 10

**Key Features Used:**
- Message API (text responses)
- Tool use (function calling)
- Streaming responses (optional)
- Error handling

**Integration Points:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await client.messages.create({ ... });
```

**Known Issues:**
- SDK returns raw `Message` objects (not AgentResponse format)
- Need to wrap responses in AgentResponse schema per PRD
- No built-in caching (handled by LLMCache)

**Documentation:** https://docs.anthropic.com/

---

### lru-cache (^10.4.3)

**Purpose:** LRU (Least Recently Used) cache for LLM responses

**Usage Locations:**
- `src/cache/cache.ts` - LLMCache class

**Configuration:**
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, CachedPrompt>({
  max: 1000,                    // Max items
  ttl: 1000 * 60 * 60,          // 1 hour
  maxSize: 50 * 1024 * 1024,    // 50MB
  sizeCalculation: (value) => { ... }
});
```

**Key Features Used:**
- Size-based eviction
- TTL-based expiration
- Item count limits
- Automatic cleanup

**Best Practices:**
- Cache key is SHA-256 hash of prompt + config
- Prefix-based invalidation
- Metrics tracking (hits, misses, hit rate)

**Documentation:** https://github.com/isaacs/node-lru-cache

---

### zod (^3.23.0)

**Purpose:** Runtime type validation for LLM responses

**Usage Locations:**
- `src/core/prompt.ts` - Prompt class
- `src/core/agent.ts` - Agent response validation
- Examples

**Integration Points:**
```typescript
import { z } from 'zod';

const prompt = new Prompt({
  user: 'Extract data',
  responseFormat: z.object({
    name: z.string(),
    count: z.number()
  })
});

const response = await agent.prompt(prompt);
// response is automatically validated against schema
```

**Key Features Used:**
- Schema validation
- Type inference
- Error messages
- Coercion
- Optional/nullable types

**Best Practices:**
- Always use Zod schemas for Agent responses
- Provide descriptive error messages
- Use `.safeParse()` for non-throwing validation

**Documentation:** https://zod.dev/

---

## Development Dependencies

### typescript (^5.2.0)

**Purpose:** TypeScript compiler for type checking and compilation

**Configuration:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "strict": true,
    "experimentalDecorators": false,  // NOT needed - using Stage 3 decorators
    "useDefineForClassFields": true
  }
}
```

**Key Features Used:**
- Stage 3 decorators (no experimental flag needed)
- Strict type checking
- Declaration file generation
- Source map generation

**Documentation:** https://www.typescriptlang.org/

---

### vitest (^1.0.0)

**Purpose:** Modern testing framework (Jest alternative)

**Configuration:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true
  }
});
```

**Key Features Used:**
- Jest-compatible API (describe, it, expect)
- Watch mode
- Coverage reports
- TypeScript support

**Test Patterns:**
- Unit tests: `src/__tests__/unit/`
- Integration tests: `src/__tests__/integration/`
- Adversarial tests: `src/__tests__/adversarial/`
- Compatibility tests: `src/__tests__/compatibility/`

**Documentation:** https://vitest.dev/

---

### tsx (^4.21.0)

**Purpose:** Direct TypeScript execution (no build step)

**Usage:**
- Running examples: `tsx examples/examples/01-basic-workflow.ts`
- Running scripts: `npx tsx scripts/generate-llms-full.ts`
- Development workflow

**Documentation:** https://tsx.is/

---

## Node.js Built-ins Used

### AsyncLocalStorage

**Purpose:** Zero-plumbing context propagation

**Usage Locations:**
- `src/core/context.ts` - AgentExecutionContext

**Implementation:**
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

const contextStorage = new AsyncLocalStorage<AgentExecutionContext>();

// Get current context
const ctx = contextStorage.getStore();

// Run in context
contextStorage.run(newContext, () => {
  // Workflows automatically capture context
});
```

**Why It's Critical:**
- Enables Agent.prompt() to automatically capture workflow events
- No manual context passing required
- Works across async boundaries

**Documentation:** https://nodejs.org/api/async_context.html

---

### crypto (node:crypto)

**Purpose:** SHA-256 hashing for cache keys

**Usage Locations:**
- `src/cache/cache.ts` - generateCacheKey()

**Implementation:**
```typescript
import { createHash } from 'node:crypto';

const hash = createHash('sha256')
  .update(JSON.stringify({ user, data, system }))
  .digest('hex');
```

**Documentation:** https://nodejs.org/api/crypto.html

---

## External Services

### Anthropic API

**Purpose:** LLM inference

**Authentication:**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

**Models Used:**
- claude-3-5-sonnet-20241022 (default)
- claude-3-5-haiku-20241022
- claude-3-opus-20240229

**Rate Limits:**
- Sonnet: 5 requests/second (tier 1)
- Haiku: 25 requests/second (tier 1)
- Opus: 5 requests/second (tier 1)

**Documentation:** https://docs.anthropic.com/

---

## Optional Dependencies (Future Considerations)

### Ink (React for CLI)

**Purpose:** Terminal UI for tree debugger

**Potential Usage:**
```typescript
import { render, Box, Text } from 'ink';

const app = (
  <Box>
    <Text>Workflow Tree Debugger</Text>
    {/* ... interactive tree ... */}
  </Box>
);

render(app);
```

**Why Consider:**
- Reactive UI updates
- Virtual scrolling for large trees
- Interactive navigation (arrow keys)
- Split-pane layout

**Documentation:** https://ink.think.io/

---

## Dependency Security

### Security Best Practices

1. **Pin Versions:** All dependencies are pinned with `^` (minor version updates only)
2. **Regular Updates:** Dependabot/ Renovate for automated updates
3. **Vulnerability Scanning:** `npm audit` for security advisories
4. **License Compliance:** All dependencies use permissive licenses (MIT, Apache-2.0)

### Known Vulnerabilities

As of 2026-01-24, no known vulnerabilities in current dependency versions.

---

## Dependency Maintenance

### Update Strategy

1. **Major Versions:** Manual review and testing required
2. **Minor Versions:** Automatic via Dependabot with CI checks
3. **Patch Versions:** Automatic deployment

### Monitoring

- GitHub Dependabot alerts
- npm audit reports
- GitHub Advisory Database

---

## Conclusion

The Groundswell project has a **minimal, well-chosen dependency footprint**:

- **3 production dependencies** (Anthropic SDK, lru-cache, zod)
- **3 development dependencies** (TypeScript, Vitest, tsx)
- **2 Node.js built-ins** (AsyncLocalStorage, crypto)

All dependencies are:
- Actively maintained (as of 2026)
- Well-documented
- Secure (no known vulnerabilities)
- Industry-standard

**Recommendation:** Current dependency stack is optimal. No changes needed unless:
1. Anthropic SDK releases breaking changes
2. Performance issues require alternative caching strategy
3. Terminal UI requires Ink (optional enhancement)

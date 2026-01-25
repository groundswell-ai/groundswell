# README Best Practices for TypeScript Projects

## Research Focus: Documenting Breaking Changes and New Features

**Date:** 2025-01-24
**Objective:** Gather best practices for updating README.md with new AgentResponse usage examples and breaking changes

---

## 1. Quick Start Section Best Practices

### Key Principles

1. **Immediate Value Delivery**
   - Show the most common use case first
   - Code should be copy-pasteable and runnable
   - Keep examples under 15 lines for primary Quick Start

2. **Progressive Complexity**
   - Start with simplest usage pattern
   - Follow with slightly more advanced examples
   - Link to detailed docs for complex scenarios

3. **Minimal Imports**
   - Only import what's needed for the example
   - Group related imports together
   - Add comments explaining non-obvious imports

### Example Structure (Based on Anthropic SDK)

```markdown
## Quick Start

### Basic Usage

```typescript
import { createAgent } from 'groundswell';

const agent = createAgent({
  name: 'MyAgent',
  enableCache: true,
});

const result = await agent.prompt({
  user: 'Hello, world!',
});
```

### With Typed Responses

```typescript
import { createAgent, z } from 'groundswell';

const agent = createAgent({ name: 'AnalysisAgent' });

const result = await agent.prompt({
  user: 'Analyze this data',
  responseFormat: z.object({
    score: z.number(),
    summary: z.string(),
  }),
});
// result is typed as { score: number; summary: string }
```

**Note:** For migration from previous versions, see [Migration Guide](#migration-guide).
```

---

## 2. Documenting Breaking Changes

### Best Practices

1. **Prominent Placement**
   - Add "Migration Guide" section immediately after Quick Start
   - Use GitHub-style alerts/admonitions for critical breaking changes
   - Keep migration path clear and actionable

2. **Before/After Comparisons**
   - Show old pattern side-by-side with new pattern
   - Highlight what changed and why
   - Provide automated migration scripts when possible

3. **Version-Specific Sections**
   - Group changes by version number
   - Use semantic versioning consistently
   - Link to detailed changelog for full changes

### Example Migration Section

```markdown
## Migration Guide

### ⚠️ Breaking Changes in v2.0

#### AgentResponse Return Type

The `agent.prompt()` method now returns an `AgentResponse` object instead of raw data.

**Before (v1.x):**
```typescript
const data = await agent.prompt({
  user: 'Get user data',
  responseFormat: userDataSchema,
});
// data: UserData
```

**After (v2.0):**
```typescript
const response = await agent.prompt({
  user: 'Get user data',
  responseFormat: userDataSchema,
});
// response: AgentResponse<UserData>

const data = response.data; // Extract the actual data
console.log(response.metadata); // Access timing, token usage, etc.
```

**Why?** This change provides better observability and debugging capabilities without breaking existing code patterns.

**Automated Migration:**
```bash
npx groundswell-migrate@2
```

For detailed changes, see [CHANGELOG.md](CHANGELOG.md#v2.0.0).
```

---

## 3. Code Example Guidelines

### Length Recommendations

| Section | Max Lines | Reason |
|---------|-----------|---------|
| Primary Quick Start | 10-15 lines | Must fit on screen without scrolling |
| Secondary Examples | 15-25 lines | Show complexity but remain digestible |
| Advanced Examples | 25-40 lines | Comprehensive, but consider separate file |
| Documentation Files | No limit | Full reference documentation |

### Complexity Balance

**Quick Start Should:**
- Show happy path only
- Use sensible defaults
- Avoid error handling in primary example
- Be immediately runnable (with API key placeholder)

**Documentation Should:**
- Show error handling patterns
- Demonstrate configuration options
- Include edge cases
- Link to full examples repo

### Import Best Practices

**Do:**
```typescript
import { createAgent, z } from 'groundswell';
```

**Don't:**
```typescript
import { createAgent } from 'groundswell/src/agent/Agent';
import { z } from 'zod';
```

**Exception:** When importing specific sub-modules for clarity:
```typescript
import { createAgent } from 'groundswell';
import { defaultCache } from 'groundswell/cache';
```

---

## 4. Linking to Migration Guides

### Link Placement Strategy

1. **In-Section Alert**
   ```markdown
   **Note:** This example uses v2.0 syntax. For v1.x migration, see [Migration Guide](#migration-guide).
   ```

2. **Primary Navigation Link**
   ```markdown
   ## Documentation

   - [Workflows](docs/workflow.md) - Hierarchical task orchestration
   - [Agents](docs/agent.md) - LLM execution with caching
   - **[Migration Guide](MIGRATION.md)** - Upgrading between major versions ⚠️
   ```

3. **Footer/Badge Link**
   ```markdown
   ## Important Links

   - [Documentation](docs/README.md)
   - [Examples](examples/)
   - [Migration Guide](MIGRATION.md) ← **Start here if upgrading**
   ```

### Anchor Link Strategy

Use descriptive anchors for jumping to specific migration sections:

```markdown
### Quick Start

**New to Groundswell?** Start with the [Basic Usage](#basic-usage) example below.

**Upgrading from v1.x?** Jump to [Migration Guide →](#migration-from-v1x)

#### Basic Usage
...
```

---

## 5. Examples from Popular TypeScript Libraries

### Anthropic TypeScript SDK

**Strengths:**
- Minimal primary example (13 lines)
- Clear "Installation → Usage → Streaming" progression
- TypeScript-first with inline type annotations
- Advanced features in separate sections with sub-headers

**Quick Start Pattern:**
```markdown
## Installation
npm install @anthropic-ai/sdk

## Usage
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

const message = await client.messages.create({
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello, Claude' }],
  model: 'claude-sonnet-4-5-20250929',
});
```

## Streaming responses
[Separate example showing streaming pattern]
```

**Source:** https://github.com/anthropics/anthropic-sdk-typescript

### Zod

**Strengths:**
- Extremely concise primary example (7 lines)
- Shows immediate value (type safety + validation)
- Progressive disclosure: basic → error handling → type inference
- Clear separation between "what" and "how"

**Quick Start Pattern:**
```markdown
## What is Zod?

[Brief explanation + 7-line example]

## Basic usage
### Parsing data
[Example]
### Handling errors
[Example with try/catch]
### Inferring types
[Example with z.infer<>]
```

**Source:** https://github.com/colinhacks/zod

### Prisma

**Strengths:**
- Multiple "Getting Started" paths (backend, frontend, full-stack)
- Clear separation: installation → setup → first query
- Heavy use of code fences with language tags
- Links to detailed docs after each major section

**Quick Start Pattern:**
```markdown
## Quick start

### 1. Installation
npm install prisma

### 2. Initialize Prisma
npx prisma init

### 3. Run your first query
[Example code]

**Next steps:** Browse [Advanced usage](docs/advanced-usage.md)
```

**Source:** https://github.com/prisma/prisma

---

## 6. Breaking Change Communication Patterns

### Pattern 1: Top-Level Warning

```markdown
# Groundswell v2.0

⚠️ **Breaking Changes Ahead:** If you're upgrading from v1.x, please read the
[Migration Guide](MIGRATION.md) before updating. The `AgentResponse` API has
significant changes from v1.x.

[Then proceed with Quick Start]
```

### Pattern 2: Versioned Quick Start Sections

```markdown
## Quick Start

### For New Users (v2.0)

[Current best practices]

### For v1.x Users

[Legacy pattern with deprecation notice]

**See [Migration Guide](MIGRATION.md) for upgrade path.**
```

### Pattern 3: Inline Callouts

```markdown
### Agent with Prompt

```typescript
const result = await agent.prompt({
  user: 'Analyze this code',
  responseFormat: z.object({
    bugs: z.array(z.string()),
  }),
});
```

**Note:** In v2.0+, `result` is an `AgentResponse` object. Access the data via
`result.data`. See [AgentResponse API](#agentresponse-api) for details.
```

---

## 7. README Section Structure Recommendations

### Optimal Order for TypeScript Libraries

1. **Project Title + One-Line Description**
2. **Installation** (npm install command)
3. **Quick Start** (Primary use case, <15 lines)
4. **Migration Guide** (⚠️ Prominent if breaking changes exist)
5. **Key Features** (3-5 bullet points)
6. **Additional Examples** (Progressive complexity)
7. **Documentation Links** (Structured by topic)
8. **API Reference** (Brief table linking to docs)
9. **Contributing** (Brief)
10. **License**

### Anti-Patterns to Avoid

❌ **Don't:** Put migration guide at the bottom
- Users upgrading won't see it until they've broken something

❌ **Don't:** Mix multiple versions in Quick Start
- Confusing for new users; they don't know which to copy

❌ **Don't:** Use overly complex Quick Start examples
- Error handling, retries, logging belong in "Advanced Usage"

❌ **Don't:** Hide breaking changes in prose
- Use clear headings, alerts, and visual indicators

---

## 8. AgentResponse-Specific Recommendations

### For Groundswell v2.0 AgentResponse

#### Quick Start Example (Recommended)

```markdown
### Agent with Typed Response

```typescript
import { createAgent, z } from 'groundswell';

const agent = createAgent({ name: 'AnalysisAgent' });

const response = await agent.prompt({
  user: 'Analyze this code for bugs',
  responseFormat: z.object({
    bugs: z.array(z.string()),
    severity: z.enum(['low', 'medium', 'high']),
  }),
});

console.log(response.data.bugs);      // Access validated data
console.log(response.metadata.tokens); // Access metadata
```

**Why AgentResponse?**
- ✅ Type-safe validated responses
- ✅ Built-in error handling
- ✅ Observable metadata (tokens, timing, cache hits)
- ✅ Consistent API across all agent operations
```

#### Migration Notice (Recommended)

```markdown
### ⚠️ Upgrading from v1.x?

The `agent.prompt()` return type changed in v2.0:

**v1.x:** `agent.prompt()` returned raw data
**v2.0:** `agent.prompt()` returns `AgentResponse<T>` object

**Quick migration:** Add `.data` to access the underlying value:

```typescript
// Before
const data = await agent.prompt(...);

// After
const data = (await agent.prompt(...)).data;
```

See [MIGRATION.md](MIGRATION.md#agentresponse) for detailed guide.
```

---

## 9. Visual and Formatting Best Practices

### Use GitHub-Style Alerts

```markdown
> **Note**
> This is an informational note.

> **Warning**
> Breaking changes ahead!

> **Important**
> Critical information for all users.
```

### Code Block Standards

```markdown
<!-- Always specify language -->
```typescript
// code here
```

<!-- Use comments to explain non-obvious parts -->
```typescript
const response = await agent.prompt({
  user: 'Hello', // Required: user message
  responseFormat: z.string(), // Optional: defaults to string
});
```

<!-- Show type annotations inline -->
```typescript
const response: AgentResponse<UserData> = await agent.prompt(...);
```
```

### Link Conventions

```markdown
- [Documentation](docs/README.md) - External docs
- [Agent API](#agent-api) - Internal anchor
- `AgentResponse` - Code/Type references (inline code)
- **Migration Guide** - Emphasize important links
```

---

## 10. Testing Your README

### Validation Checklist

- [ ] Can a new user run Quick Start example by copying only the code shown?
- [ ] Are all imports explicitly shown?
- [ ] Is every code block language-tagged?
- [ ] Do all internal anchor links work?
- [ ] Do all external doc links resolve?
- [ ] Is the migration path clear for existing users?
- [ ] Are breaking changes prominently flagged?
- [ ] Do examples fit on screen (no scrolling for primary Quick Start)?

### Automated Testing

Consider adding a script to verify README examples:

```typescript
// scripts/test-readme-examples.ts
import { execSync } from 'child_process';

const examples = [
  'Quick Start - Basic Usage',
  'Quick Start - Agent with Prompt',
];

examples.forEach(example => {
  console.log(`Testing ${example}...`);
  // Extract and execute code blocks from README
  // Verify they compile and run
});
```

---

## 11. Additional Resources

### Excellent README Examples

1. **Anthropic TypeScript SDK**
   - URL: https://github.com/anthropics/anthropic-sdk-typescript
   - Strengths: Minimal Quick Start, clear progression, advanced features well-separated

2. **Zod**
   - URL: https://github.com/colinhacks/zod
   - Strengths: Extremely concise, immediate value demonstration

3. **Prisma**
   - URL: https://github.com/prisma/prisma
   - Strengths: Multiple onboarding paths, clear step-by-step progression

4. **tRPC**
   - URL: https://github.com/trpc/trpc
   - Strengths: Great migration guides, version-specific documentation

5. **Vercel AI SDK**
   - URL: https://github.com/vercel/ai
   - Strengths: Multiple framework examples, clear "quick start" vs "advanced" separation

### Further Reading

- "How to Write a Great README" by GitHub
- "README Best Practices" from Artifact Hub
- "Semantic Versioning 2.0.0" (semver.org)
- "The Art of README" by PurpleBooth (GitHub)

---

## Summary: Key Takeaways for AgentResponse Documentation

1. **Quick Start:** Show AgentResponse pattern immediately, keep under 15 lines
2. **Migration Guide:** Place prominently after Quick Start, use before/after comparisons
3. **Progressive Disclosure:** Basic usage → AgentResponse benefits → Advanced patterns
4. **Visual Indicators:** Use ⚠️ emoji, bold text, and alert boxes for breaking changes
5. **Link Strategy:** Inline alerts + prominent navigation link + footer reminder
6. **Code Quality:** All examples runnable, imports shown, types annotated
7. **Test Your README:** Verify all examples compile, links work, and migration path is clear

---

**Next Steps:**
1. Review existing Groundswell README against these guidelines
2. Draft AgentResponse Quick Start example following "Anthropic pattern"
3. Create migration guide section with before/after comparisons
4. Test all code examples for copy-pasteability
5. Add visual indicators (⚠️) for breaking changes

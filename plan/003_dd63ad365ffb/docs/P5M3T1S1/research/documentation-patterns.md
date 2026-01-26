# Documentation Patterns Research

## Existing Documentation Standards

### File: `docs/agent.md` Pattern Analysis

**Section Structure:**
```markdown
# [Feature Name]

[Brief 1-2 sentence description]

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)
...

## [Section Name]
[Description]

### [Subsection]
[Code example]
```

**Key Elements:**
1. **Table of Contents** - Auto-linked sections
2. **Executable Examples First** - Start with working code
3. **Type Definitions Inline** - Show interfaces where discussed
4. **Priority Explanations** - Numbered lists for cascade/override behavior
5. **Cross-references** - Link to examples and related docs

### File: `src/providers/anthropic-provider.ts` JSDoc Patterns

**Class Documentation:**
```typescript
/**
 * [Name] provider implementation
 *
 * [One-line summary]
 *
 * ## [Aspect 1]
 *
 * - [Bullet points]
 * - [Feature list]
 *
 * ## SDK Integration
 *
 * [Implementation details]
 *
 * @example
 * ```ts
 * [Executable example]
 * ```
 *
 * @see {@link [URL]} - External docs
 * @see {@link [module]} - Internal refs
 */
```

**Method Documentation:**
```typescript
/**
 * [Brief one-line description]
 *
 * [Detailed paragraph explaining behavior]
 *
 * @param [param] - [Description]
 * @returns [Return value description]
 * @throws {ErrorType} When [condition]
 * @remarks
 * [Implementation notes, PRD references]
 *
 * @example
 * ```ts
 * [Usage example]
 * ```
 */
```

## Implementation Patterns from `plan/003_dd63ad365ffb/docs/architecture/implementation_patterns.md`

From the implementation patterns reference:

### JSDoc Usage
- **JSDoc and executable examples** in documentation
- Use `@example` blocks with runnable TypeScript
- Include `@remarks` for implementation notes
- Use `@internal` for private API
- Use `@see` for cross-references

### Code Comments
- **Section separators**: `// === Section Name ===`
- **Pattern markers**: `// PATTERN:`, `// GOTCHA:`, `// CRITICAL:`
- **Implementation references**: `// FROM: path:line`
- **PRD references**: `// PRD X.Y - Description`

## PRD Documentation Style

From `PRD.md` Section 7 (Provider System):

### Format:
```markdown
## **7.X [Section Name]**

[Brief description paragraph]

| Provider | SDK | Package | Description |
|----------|-----|---------|-------------|
| [name] | [SDK] | [package] | [desc] |
```

### Type Definitions:
```markdown
```ts
export interface ProviderId = 'anthropic' | 'opencode';
```
```

### Capability Tables:
```markdown
| Capability | Anthropic SDK | OpenCode SDK |
|------------|--------------|--------------|
| MCP | ✓ | ✓ |
```

## Diagram Conventions

Based on existing codebase patterns, use:

### ASCII Architecture Diagrams:
```
┌─────────────────┐
│    Component    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Next Layer    │
└─────────────────┘
```

### Cascade/Flow Diagrams:
```
Level 1 (highest)
    ↓
Level 2
    ↓
Level 3 (lowest)
```

## Required Sections for `/docs/providers.md`

Based on `docs/agent.md` structure and PRD Section 7:

1. **Overview** - Multi-provider architecture explanation
2. **Supported Providers** - Table with SDK/packages
3. **Architecture** - Diagram showing layers
4. **Configuration** - Global, agent, prompt-level
5. **Configuration Cascade** - Priority explanation
6. **Provider Registry** - Singleton pattern
7. **Model Specification** - Plain vs qualified formats
8. **Provider Lifecycle** - init/terminate patterns
9. **Sessions** - State management
10. **Tools & MCP** - Delegation pattern
11. **Hooks** - Lifecycle events
12. **Skills** - Loading pattern
13. **API Reference** - Complete interface signatures
14. **Examples** - Cross-reference to examples

## Markdown File Location

**Target Path:** `/home/dustin/projects/groundswell/docs/providers.md`

**Placement:** Alongside existing docs:
- `/docs/agent.md`
- `/docs/prompt.md`
- `/docs/workflow.md`
- `/docs/providers.md` ← **NEW**

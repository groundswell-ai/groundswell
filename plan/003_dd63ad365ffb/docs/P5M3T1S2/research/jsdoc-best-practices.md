# JSDoc Best Practices Reference

Reference documentation for JSDoc tag syntax and formatting used in the Groundswell provider system API documentation.

## JSDoc Tags Reference

### Core Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param` | Document a parameter | `@param name - Description` |
| `@returns` | Document return value | `@returns Type - Description` |
| `@throws` | Document errors thrown | `@throws {ErrorType} Condition` |
| `@example` | Provide usage example | `@example \`\`\`typescript code \`\`\`` |
| `@see` | Cross-reference | `@see OtherAPI` |
| `@typeParam` | Document generic types | `@typeParam T - Description` |

### Markdown Documentation Format

**IMPORTANT**: In markdown files (like `docs/providers.md`), use markdown formatting instead of JSDoc tags:

- **Parameters**: Use `**Parameters:**` followed by `- \`name\`: \`Type\` - Description` lists
- **Returns**: Use `**Returns:**` \`Type\` - Description
- **Throws**: Use `**Throws:**` followed by `- ErrorType - Condition` lists
- **Examples**: Use `**Example:**` followed by markdown code blocks
- **See Also**: Use `**See Also:**` followed by markdown links

## Code Block Formatting

### Language Identifier

**ALWAYS** use `typescript` for code blocks (NOT `ts`):

```typescript
// CORRECT
```typescript
const provider: ProviderId = 'anthropic';
```
```

```typescript
// INCORRECT
```ts
const provider: ProviderId = 'anthropic';
```
```

### Example Formatting

Examples should include:
1. Brief comment explaining what's demonstrated
2. Import statements
3. Complete, runnable code
4. Expected output/result comments (optional)

```typescript
**Example:**
```typescript
// Qualified format with explicit provider
import { parseModelSpec } from 'groundswell';

const spec = parseModelSpec('anthropic/claude-3-5-sonnet');
// Returns: { provider: 'anthropic', model: 'claude-3-5-sonnet', raw: 'anthropic/claude-3-5-sonnet' }
```
```

## Cross-Reference Formatting

### Internal Links

Use `[Text](#anchor)` format for internal markdown links:

```markdown
**See Also:**
- [Provider Interface](#provider-interface)
- [GlobalProviderConfig](#globalproviderconfig)
```

### Anchor Generation

Anchors are generated from headings by:
1. Converting to lowercase
2. Replacing spaces with hyphens
3. Removing special characters

Example: `### Provider Options` becomes `#provider-options`

## Type Documentation Patterns

### Union Types

Document all union members with descriptions:

```markdown
**Values:**
- `'anthropic'`: Anthropic Claude provider via `@anthropic-ai/claude-agent-sdk`
- `'opencode'`: OpenCode multi-provider gateway via `@opencode-ai/sdk`
```

### Generic Types

Document type parameters explicitly:

```markdown
**Type Parameters:**
- `T` - The expected response data type
```

### Optional Properties

Mark optional properties clearly:

```markdown
**Properties:**
- `endpoint`: `string` (optional) - Override the default API endpoint
```

### Discriminated Unions

Explain the narrowing pattern:

```markdown
**Type Narrowing:**
The status field is a discriminant. Use type guards to narrow:
- `status='success'` → data is T (not null), error is null
- `status='error'` → data is null, error is ProviderErrorDetails (not null)
```

## Error Documentation

Document all possible errors with conditions:

```markdown
**Throws:**
- `Error` - If `defaultProvider` is not a valid ProviderId ('anthropic' | 'opencode')
- `Error` - If `providerDefaults` contains invalid provider IDs
```

## Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

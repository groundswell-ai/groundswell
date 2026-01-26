# Research Notes: Documentation Best Practices

## Overview
Research into industry best practices for TypeScript code examples and documentation, based on analysis of major TypeScript projects and documentation frameworks.

## Industry Standards Analysis

### TypeScript Handbook Pattern
- **Progressive complexity**: Start with simplest usage, gradually add features
- **Single concept per example**: Each example demonstrates one clear concept
- **Executable snippets**: All code can be copied and run directly
- **Inline explanations**: Comments explain WHY, not just WHAT

### Microsoft/TypeScript Documentation
- **Table of Contents**: Clear navigation with anchor links ✅ (we do this)
- **Type signatures first**: Show types before examples ✅ (we do this)
- **"See Also" cross-references**: Link related concepts ✅ (we do this)
- **Warning/Notice callouts**: Highlight gotchas ✅ (we use GOTCHA notes)

### Deno Documentation
- **Runnable examples**: Every example can be executed via `deno run`
- **Environment setup clearly stated**: Dependencies shown upfront
- **Expected output**: Show what the code produces
- **File naming**: Examples match their feature name

### Node.js Documentation
- **Pattern: Description → Code → Explanation**
- **Error handling shown**: Always demonstrate error cases
- **Performance notes**: When to use/not use a feature
- **API stability indicators**: Version requirements

## Code Example Format

### Recommended Structure

```typescript
/**
 * [Feature Name]
 *
 * **Purpose**: One sentence describing what this demonstrates
 *
 * **What you'll learn**:
 * - Concept 1
 * - Concept 2
 * - Concept 3
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - API key configured
 *
 * **Expected Output**:
 * ```
 * Shows what the user will see
 * ```
 */

// ============================================================================
// Imports
// ============================================================================
import { ... } from 'groundswell';

// ============================================================================
// Example Implementation
// ============================================================================
// ... code ...

// ============================================================================
// Execution
// ============================================================================
export async function runExample(): Promise<void> {
  // ... runnable code ...
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}
```

### Comment Best Practices

From `examples/05-error-handling.ts` - EXCELLENT PATTERN:
```typescript
// Part 1: Basic error wrapping
printSection('Part 1: WorkflowError Structure');
{
  const workflow = new ErrorDemoWorkflow('ErrorDemo');
  // ... implementation ...
  console.log('\nNote:');
  console.log('  - apiKey and password show as "***" (redacted)');
  console.log('  - internalCounter and debugInfo are not present (hidden)');
}
```

**Best Practices Used:**
- ✅ Section comments with clear labels
- ✅ Inline explanations of what's happening
- ✅ Summary notes after execution
- ✅ Visual grouping with blank lines

## Completeness vs. Simplicity

### The Progression Pattern (Our README Does This Well)

```
1. Class-Based Workflow (simplest)
2. Functional Workflow (medium)
3. Agent with Prompt (most complex)
```

**This is the gold standard** - start simple, add complexity progressively.

### Balancing Realism vs. Simplicity

**Our Pattern from `docs/agent.md`:**

```typescript
// Simple (shows the concept)
const agent = createAgent({
  name: 'AnalysisAgent',
  enableCache: true,
});
```

**Then add complexity:**

```typescript
// More realistic (shows options)
const agent = createAgent({
  name: 'AnalysisAgent',
  model: 'claude-sonnet-4-20250514',
  enableCache: true,
  hooks: { ... },
  tools: [ ... ]
});
```

**Best Practice: Show both** - simple first for understanding, realistic for production use.

## When to Simplify

**Simplify when:**
- Introducing a new concept
- Showing API usage for the first time
- Demonstrating a specific feature in isolation

**Be realistic when:**
- Showing integration patterns
- Demonstrating error handling
- Performance examples

## Executable Examples Best Practices

### Our Current Pattern (Excellent!)

From `examples/02-decorator-options.ts`:
```typescript
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDecoratorOptionsExample().catch(console.error);
}
```

**Perfect pattern** - allows both:
- Importing as a module for testing
- Direct execution with `npx tsx file.ts`

### Handling Imports/Dependencies

**Our pattern is correct:**
```typescript
// Group imports at top
import { Workflow, Step, Task } from 'groundswell';
import { printHeader, sleep } from '../utils/helpers.js';

// Note the .js extension - required for ES modules
```

**Best Practices:**
- ✅ Group related imports
- ✅ Use `.js` extensions (even for TypeScript files)
- ✅ Import from utils/helpers for common patterns
- ✅ Use absolute imports from package name

### Environment Configuration Patterns

**From `docs/providers.md` - EXCELLENT:**

```typescript
// 1. Show configuration clearly at the top
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
    opencode: { endpoint: 'http://localhost:4096' }
  }
});

// 2. Show registration
const registry = ProviderRegistry.getInstance();
registry.register(new AnthropicProvider());

// 3. Show initialization
await registry.initializeAll(getGlobalProviderConfig());

// 4. Show usage
const agent = new Agent({ model: 'claude-sonnet-4-20250514' });
```

**Perfect pattern** - clear setup, then usage.

### Making Examples Runnable

**Our Helper Pattern (`examples/utils/helpers.ts`):**

```typescript
export function printHeader(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

export function printSection(title: string): void {
  console.log('\n' + '-'.repeat(40));
  console.log(title);
  console.log('-'.repeat(40));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Best Practice**: Create reusable helpers for:
- Visual formatting
- Common operations (delays, mocks)
- Test data generation

## Common Pitfalls to Avoid

### What Makes Examples Confusing

**❌ DON'T - Too many concepts at once:**
```typescript
const agent = new Agent({
  provider: 'anthropic',
  hooks: { preToolUse, postToolUse, sessionStart, sessionEnd },
  tools: [tool1, tool2, tool3],
  skills: [skill1, skill2],
  enableCache: true,
  enableReflection: true,
  model: 'claude-sonnet-4',
  temperature: 0.7,
  maxTokens: 4096
});
```

**✅ DO - Build up progressively:**
```typescript
// Step 1: Basic agent
const agent = new Agent({ name: 'MyAgent' });

// Step 2: Add provider
const agent = new Agent({
  name: 'MyAgent',
  provider: 'anthropic'
});

// Step 3: Add hooks (shown separately later)
```

### Over-Complicating Examples

**Signs of over-complication:**
- More than 5-7 concepts in one example
- Deeply nested configuration objects
- Multiple unrelated features demonstrated together
- Complex business logic that distracts from the API

**Our `examples/05-error-handling.ts` avoids this well** by breaking into parts:
```typescript
// Part 1: Basic error wrapping
// Part 2: Error events
// Part 3: Retry logic
// Part 4: Parent-child error isolation
// Part 5: Full error context
```

### Balancing Realistic vs. Simplified

**Too Simplified** ❌:
```typescript
// Not useful - doesn't show real usage
const agent = new Agent();
agent.prompt('hello');
```

**Too Complex** ❌:
```typescript
// Overwhelming for first-time users
const agent = new Agent({
  provider: config.provider,
  hooks: createProductionHooks(),
  tools: await loadAllTools(),
  skills: loadSkillsFromDirectory(),
  // ... 20 more lines
});
```

**Just Right** ✅:
```typescript
// Shows essential setup without overwhelming
const agent = new Agent({
  name: 'AnalysisAgent',
  model: 'claude-sonnet-4-20250514',
  enableCache: true
});

const prompt = createPrompt({
  user: 'Analyze this code',
  responseFormat: z.object({ bugs: z.array(z.string()) })
});

const result = await agent.prompt(prompt);
```

## Example Patterns to Follow

### The "Three-Example" Pattern

Our README uses this perfectly:

**Example 1: Minimal (Hello World)**
```typescript
const agent = createAgent({ name: 'Agent' });
const result = await agent.prompt(prompt);
```

**Example 2: Typical (Common Use Case)**
```typescript
const agent = createAgent({
  name: 'Agent',
  model: 'claude-sonnet-4-20250514',
  enableCache: true
});
```

**Example 3: Advanced (Full Featured)**
```typescript
const agent = createAgent({
  name: 'Agent',
  model: 'claude-sonnet-4-20250514',
  enableCache: true,
  hooks: { ... },
  tools: [ ... ],
  skills: [ ... ]
});
```

### The "Before/After" Pattern

From `docs/providers.md` cascade example:

```typescript
// Before (without override)
const agent = new Agent({ provider: 'opencode' });

// After (with prompt override)
await agent.prompt(prompt, {
  provider: 'anthropic'  // Override for this call
});
```

This shows **evolution** of usage patterns.

### The "Error Case" Pattern

From `examples/05-error-handling.ts`:

```typescript
// Show the error
try {
  await workflow.run();
} catch (error) {
  const wfError = error as WorkflowError;
  console.log('Error caught:', wfError.message);
  console.log('State at error:', wfError.state);
  console.log('Logs:', wfError.logs);
}
```

**Best Practice**: Always show error handling!

## Recommended Provider Examples Structure

Based on our patterns and industry standards:

### Example Files to Create

```
examples/
├── providers/
│   ├── 01-basic-provider-usage.ts
│   ├── 02-provider-configuration.ts
│   ├── 03-provider-switching.ts
│   ├── 04-multi-provider-scenarios.ts
│   ├── 05-provider-errors.ts
│   └── README.md
```

### Example Template

```typescript
/**
 * Example XX: [Title]
 *
 * **Purpose**: [One-sentence description]
 *
 * **What you'll learn**:
 * - [Specific concept 1]
 * - [Specific concept 2]
 * - [Specific concept 3]
 *
 * **Prerequisites**:
 * - Node.js 18+
 * - ANTHROPIC_API_KEY environment variable
 *
 * **Run**: `npx tsx examples/providers/XX-example-name.ts`
 */

// ============================================================================
// Imports
// ============================================================================
import {
  configureProviders,
  ProviderRegistry,
  AnthropicProvider
} from 'groundswell';
import { printHeader, printSection } from '../utils/helpers.js';

// ============================================================================
// Example Implementation
// ============================================================================
export async function runExample(): Promise<void> {
  printHeader('Example XX: [Title]');

  // Part 1: [First concept]
  printSection('Part 1: [Concept Name]');
  {
    // [Implementation]
    console.log('[Explanation of what happened]');
  }

  // Part 2: [Second concept]
  printSection('Part 2: [Concept Name]');
  {
    // [Implementation]
  }
}

// ============================================================================
// Execution
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}
```

## Documentation Checklist

For each provider example, ensure:

### Content Quality
- [ ] **Single Purpose**: Each example demonstrates one clear concept
- [ ] **Progressive**: Starts simple, adds complexity gradually
- [ ] **Complete**: Shows imports, setup, execution, cleanup
- [ ] **Explained**: Comments explain WHY, not just WHAT
- [ ] **Tested**: Code actually runs without modifications

### Structure
- [ ] **Header Block**: Purpose, prerequisites, run command
- [ ] **Imports Grouped**: Related imports together
- [ ] **Section Headers**: Clear visual separation
- [ ] **Output Shown**: What the user will see
- [ ] **Executable**: Can run with `npx tsx`

### Code Quality
- [ ] **Type Safe**: Proper TypeScript types throughout
- [ ] **Error Handling**: Shows try/catch patterns
- [ ] **Realistic**: Uses real-world scenarios
- [ ] **Consistent**: Follows project conventions
- [ ] **Formatted**: Proper indentation and spacing

### Accessibility
- [ ] **Clear Naming**: Variables describe their purpose
- [ ] **No Magic Numbers**: Constants for values
- [ ] **Visual Separation**: Blank lines between sections
- [ ] **Comments**: Explain non-obvious code
- [ ] **Cross-References**: Link to related docs

## Key Takeaway for PRP

Our project already demonstrates **excellent documentation practices**. For provider usage examples:

1. **Use Our Existing Patterns**: Follow `/examples/` directory structure
2. **Follow Our `/docs/providers.md` Structure**: Excellent API reference format
3. **Progressive Complexity**: Start with basic, add features incrementally
4. **Always Runnable**: Every example should execute without modification
5. **Break Into Parts**: Use "Part 1", "Part 2" structure for multiple concepts
6. **Show Error Handling**: Always demonstrate error cases
7. **Use Helper Utilities**: `printHeader`, `printSection`, etc.
8. **Three-Example Pattern**: Minimal, Typical, Advanced

Quality checklist for each example:
- Can I copy-paste this code and run it?
- Do I understand what each line does?
- Are all imports shown?
- Is error handling demonstrated?
- Is the output shown or described?
- Are related concepts linked?
- Is the code formatted consistently?
- Are variable names meaningful?
- Is there too much or too little code?
- Would this help a new user understand providers?

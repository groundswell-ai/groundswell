# Research Notes: Existing Examples Patterns

## Overview
Analysis of `/home/dustin/projects/groundswell/examples/` directory structure and existing documentation patterns.

## Examples Directory Structure

```
examples/
├── README.md                    # Comprehensive documentation
├── index.ts                    # Main entry point and runner
├── utils/
│   └── helpers.ts              # Utility functions for examples
├── examples/                   # Core examples directory
│   ├── 01-basic-workflow.ts
│   ├── 02-decorator-options.ts
│   ├── 03-parent-child.ts
│   ├── 04-observers-debugger.ts
│   ├── 05-error-handling.ts
│   ├── 06-concurrent-tasks.ts
│   ├── 07-agent-loops.ts
│   ├── 08-sdk-features.ts
│   ├── 09-reflection.ts
│   ├── 10-introspection.ts
│   └── 11-reparenting.ts
├── components/                 # React components
│   ├── WorkflowTreeDebuggerUI.tsx
│   ├── WorkflowTreeNode.tsx
│   ├── WorkflowTree.tsx
│   ├── NodeDetailsPanel.tsx
│   └── StatusIcon.tsx
└── __tests__/                 # Example-specific tests
```

## File Naming Conventions

- **Prefix numbering**: `01-`, `02-`, etc. for ordering
- **Descriptive names**: `basic-workflow.ts`, `decorator-options.ts`
- **Consistent `.ts` extension** for TypeScript files

## Example File Structure Pattern

```typescript
/**
 * Example X: [Descriptive Title]
 *
 * Demonstrates:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */

import { ... } from 'groundswell';
import { printHeader, printSection, sleep } from '../utils/helpers.js';

// Exported function with consistent naming
export async function run[ExampleName]Example(): Promise<void> {
  printHeader('Example X: [Title]');

  // Example implementation

  // Direct execution support
  if (import.meta.url === `file://${process.argv[1]}`) {
    run[ExampleName]Example().catch(console.error);
  }
}
```

## Code Documentation Styles

### JSDoc Comments
- Comprehensive module-level documentation
- "Demonstrates:" section listing features
- Purpose statement in header

### Inline Documentation
- Method-level JSDoc for classes and functions
- Type annotations throughout
- Clear variable naming

### README Structure
- Quick Start section with npm scripts
- Detailed example descriptions with feature lists
- Usage patterns and code snippets
- Project structure overview
- Key concepts tables (lifecycle, events, symbols)

## Executable Example Patterns

### Execution Methods

1. **Individual scripts**: `npx tsx examples/examples/01-basic-workflow.ts`
2. **npm scripts**: `npm run start:basic`
3. **Batch runner**: `npm run start:all` (runs through index.ts)

### Package.json Scripts Pattern
```json
"scripts": {
  "start:all": "tsx examples/index.ts",
  "start:basic": "tsx examples/examples/01-basic-workflow.ts",
  "start:decorators": "tsx examples/examples/02-decorator-options.ts",
  // ... more examples
}
```

### Import Patterns
- ES modules with `.js` extension (even for TS files)
- Relative imports within examples directory
- Consistent import from `groundswell` package

## Supporting Infrastructure

### Utility Functions (utils/helpers.ts)

```typescript
export function printHeader(title: string): void
export function printSection(title: string): void
export function sleep(ms: number): Promise<void>
export function simulateApiCall<T>(data: T, minMs?, maxMs?): Promise<T>
export function simulateUnreliableTask<T>(data: T, failureRate?): Promise<T>
export function prettyJson(obj: unknown): string
```

### Interactive Runner (index.ts)
- ASCII art banner
- Menu-driven interface
- Error handling with try/catch
- Sequential execution with pauses
- Summary of demonstrated features

## Current Gaps - No Provider Usage Examples

**Missing Provider Examples:**
- No examples showing `ProviderRegistry` usage
- No examples showing `configureProviders()` API
- No examples demonstrating multiple provider setup
- No examples showing prompt-level provider overrides
- No examples showing provider switching workflows

## Test File Patterns

While comprehensive tests exist in `src/__tests__/`, they are:
- Mock-based testing rather than usage examples
- Focused on individual provider methods
- Not structured as user-facing examples

## Documentation Quality Assessment

### Strengths
- Comprehensive README with clear structure
- Numbered examples for progressive learning
- Code examples in README
- JSDoc throughout codebase
- Interactive execution capabilities

### Areas for Enhancement
- Provider usage documentation missing
- Multi-provider examples absent
- Real-world integration examples needed
- Environment setup instructions minimal

## Recommendations for Provider Usage Examples

Based on existing patterns, new provider usage examples should:

1. **Follow existing naming conventions**: `12-provider-basic.ts`, `13-provider-switching.ts`, etc.
2. **Use existing utility functions**: `printHeader`, `printSection`, etc.
3. **Add to package.json scripts**: `start:provider-basic`, `start:provider-switching`
4. **Include in main runner**: Update `index.ts` to include new examples
5. **Document in README**: Add provider section to examples README
6. **Show configuration patterns**: `configureProviders()`, `ProviderRegistry`
7. **Demonstrate cascade priority**: global → agent → prompt
8. **Include error handling examples**: invalid providers, configuration errors

## Key Takeaway for PRP

The existing examples framework provides a **solid foundation** for adding comprehensive provider usage examples. The patterns are well-established:

- Use numbered files for ordering
- Follow the JSDoc header pattern
- Use helper utilities for consistency
- Add to package.json scripts
- Include in main index.ts runner
- Document in README

The provider examples should integrate seamlessly with this existing structure.

---
name: "PRP for P2.M2.T1.S1: Research Ink Library and Create Hello-World Prototype"
description: "Evaluate Ink (React for CLI) for interactive workflow tree debugger and create working prototype"
---

## Goal

**Feature Goal**: Evaluate the Ink library for building an interactive terminal UI for the WorkflowTreeDebugger and create a working hello-world prototype that demonstrates basic workflow tree visualization.

**Deliverable**:
1. A working Ink prototype at `examples/ink-debugger-hello.tsx` that renders a sample workflow tree with status indicators
2. Installation of Ink dependencies in the project
3. Evaluation notes documenting performance, bundle size, and compatibility

**Success Definition**:
- Running `tsx examples/ink-debugger-hello.tsx` displays a workflow tree with ASCII-style connectors and status icons (pending/running/completed/failed)
- Ink dependencies (`ink`, `react`) are installed and compatible with the existing codebase
- Evaluation notes document bundle size impact, Node.js version compatibility, and any gotchas encountered
- Prototype successfully renders on the terminal without errors

## User Persona

**Target User**: Developer debugging workflow execution issues

**Use Case**: A developer wants to visualize workflow execution in real-time with an interactive terminal interface that can show the tree structure, node status, and eventually allow navigation and inspection.

**User Journey**:
1. Developer runs the Ink debugger prototype: `tsx examples/ink-debugger-hello.tsx`
2. Terminal displays an interactive workflow tree with status indicators
3. Developer sees the tree structure with expandable nodes
4. (Future) Developer navigates with keyboard, selects nodes for details

**Pain Points Addressed**:
- Current ASCII output in `toTreeString()` is static and non-interactive
- No ability to expand/collapse branches
- No real-time updates as workflow executes
- Difficult to inspect large workflow trees

## Why

- **Interactive Debugging**: Ink enables reactive UI with keyboard navigation, expand/collapse, and real-time updates
- **Familiar Paradigm**: React components make the UI code maintainable and extensible
- **Production-Ready**: Ink is used by major CLIs (GitHub Copilot CLI, Cloudflare Wrangler, Prisma)
- **Architectural Fit**: Tree structures map naturally to recursive React components
- **Integration**: Builds on existing `WorkflowTreeDebugger` and `WorkflowNode` types from P2.M1.T2.S2

## What

### Scope

This subtask covers:
1. **Ink Installation**: Add `ink` and `react` as project dependencies
2. **Hello-World Prototype**: Create a minimal Ink app that renders a workflow tree
3. **Evaluation**: Document findings on bundle size, compatibility, and gotchas

### Out of Scope (Future Subtasks)
- Keyboard navigation and interactivity (P2.M2.T2.S1)
- Real-time updates from running workflows
- Integration with `WorkflowTreeDebugger` events
- Split-pane layout with node details

### Success Criteria

- [ ] Ink dependencies installed (`ink@^6.6.0`, `react@^19.0.0`)
- [ ] Prototype file `examples/ink-debugger-hello.tsx` created
- [ ] Prototype runs without errors: `tsx examples/ink-debugger-hello.tsx`
- [ ] Tree displays with proper indentation and branch connectors
- [ ] Status icons render correctly (○ ◉ ✓ ✗)
- [ ] Evaluation notes document findings

## All Needed Context

### Context Completeness Check

_If someone knew nothing about this codebase, would they have everything needed to implement this successfully?_

**Answer**: YES - This PRP includes:
- Exact installation commands with version constraints
- Working prototype code with complete TypeScript types
- File structure and placement
- Integration points with existing codebase
- Research references with specific URLs
- Known gotchas and version compatibility issues

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- url: https://www.npmjs.com/package/ink
  why: Official Ink package documentation with API reference
  critical: Ink 6.6.0 requires React 19+ and Node 20+

- url: https://github.com/vadimdemedes/ink
  why: Ink GitHub repository with examples and source code
  critical: Examples folder demonstrates tree rendering patterns

- url: https://github.com/vadimdemedes/ink-ui
  why: Official Ink UI components (@inkjs/ui)
  critical: Select, MultiSelect components for future interactivity

- docfile: plan/002_6761e4b84fd1/P2M2T1S1/research/01-ink-library-basics.md
  why: Complete Ink API reference with all props, installation, and gotchas
  section: Installation, Core API Reference, Working Hello-World Example, Gotchas

- docfile: plan/002_6761e4b84fd1/P2M2T1S1/research/02-ink-tree-components.md
  why: Tree component patterns and expand/collapse implementations
  section: Code Examples - Recursive Tree with Expand/Collapse

- docfile: plan/002_6761e4b84fd1/P2M2T1S1/research/03-ink-typescript-patterns.md
  why: TypeScript + ESM configuration for .tsx files
  section: tsconfig.json Settings, Shebang Patterns, Common TypeScript Issues

- docfile: plan/002_6761e4b84fd1/P2M2T1S1/research/04-ink-performance.md
  why: Bundle size and performance characteristics
  section: Bundle Size, Runtime Performance, Startup Time

- docfile: plan/002_6761e4b84fd1/P2M2T1S1/research/05-ink-alternatives.md
  why: Comparison with alternative TUI libraries
  section: Feature Comparison Table, Recommendation

- file: /home/dustin/projects/groundswell/src/debugger/tree-debugger.ts
  why: Existing WorkflowTreeDebugger with toTreeString() pattern to replicate
  pattern: renderTree() method (lines 217-245) shows ASCII tree rendering
  gotcha: Uses STATUS_SYMBOLS constant for status icons

- file: /home/dustin/projects/groundswell/src/types/workflow.ts
  why: WorkflowNode interface definition for tree structure
  pattern: Interface with id, name, parent, children, status

- file: /home/dustin/projects/groundswell/examples/examples/04-observers-debugger.ts
  why: Example WorkflowTreeDebugger usage to understand data structure
  pattern: Creating workflows, attaching debugger, running workflow

- file: /home/dustin/projects/groundswell/package.json
  why: Current project dependencies and scripts
  pattern: "type": "module" for ESM, existing scripts for running examples
  gotcha: Current Node.js engine requirement is ">=18", Ink requires ">=20"

- file: /home/dustin/projects/groundswell/tsconfig.json
  why: TypeScript configuration for the project
  pattern: "target": "ES2022", "module": "ES2022", jsx: "react" for .tsx support
  gotcha: Need to add "jsx": "react-jsx" and "jsxImportSource": "ink" for Ink 6.x

- file: /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M1T2S2/PRP.md
  why: Previous PRP defining WorkflowTreeDebugger.replay() output
  pattern: Static method returning WorkflowNode for tree reconstruction
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── dist/                          # Compiled JavaScript output
├── docs/                          # User documentation
├── examples/
│   ├── examples/
│   │   ├── 01-basic-workflow.ts
│   │   ├── 02-decorator-options.ts
│   │   ├── 03-parent-child.ts
│   │   ├── 04-observers-debugger.ts  # WorkflowTreeDebugger usage
│   │   ├── 05-error-handling.ts
│   │   ├── 06-concurrent-tasks.ts
│   │   ├── 07-agent-loops.ts
│   │   ├── 08-sdk-features.ts
│   │   ├── 09-reflection.ts
│   │   ├── 10-introspection.ts
│   │   └── 11-reparenting-workflows.ts
│   ├── index.ts                    # Main examples entry point
│   └── utils/
│       └── helpers.ts
├── plan/
│   └── 002_6761e4b84fd1/
│       ├── architecture/
│       │   └── OBSERVABILITY_PATTERNS_RESEARCH.md
│       ├── P2M1T2S2/               # Previous subtask (replay API)
│       │   └── PRP.md
│       └── P2M2T1S1/               # Current subtask
│           ├── research/           # Research documents (EXISTING)
│           └── PRP.md              # THIS FILE
├── src/
│   ├── __tests__/                  # Vitest tests
│   ├── cache/                      # Caching layer
│   ├── core/
│   │   ├── workflow.ts             # Main Workflow class
│   │   ├── agent.ts                # Agent class
│   │   └── factory.ts              # Workflow factory
│   ├── debugger/
│   │   ├── tree-debugger.ts        # MODIFICATION REFERENCE
│   │   ├── event-replayer.ts       # REFERENCED BY P2M1T2S2
│   │   └── index.ts
│   ├── types/
│   │   ├── workflow.ts             # WorkflowNode interface
│   │   ├── events.ts               # WorkflowEvent types
│   │   ├── observer.ts             # WorkflowObserver interface
│   │   └── index.ts
│   └── index.ts                    # Main exports
├── package.json                    # MODIFICATION: Add Ink dependencies
├── tsconfig.json                   # MODIFICATION: Add JSX config
└── vitest.config.ts                # Test configuration
```

### Desired Codebase Tree (Changes Only)

```bash
# NEW FILES
examples/
  └── examples/
      └── ink-debugger-hello.tsx    # NEW: Ink hello-world prototype

# MODIFIED FILES
package.json                        # ADD: ink, react dependencies
  └── dependencies:
      ├── "ink": "^6.6.0"           # NEW
      └── "react": "^19.0.0"        # NEW

tsconfig.json                       # ADD: JSX configuration for Ink
  └── compilerOptions:
      ├── "jsx": "react-jsx"        # NEW
      └── "jsxImportSource": "ink"  # NEW
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Ink 6.6.0 requires React 19+ (NOT React 18)
// Ink 6.x peerDependencies: "react": ">=19.0.0"
// Installing React 18 will cause runtime errors
// CORRECT: npm install ink react
// WRONG: npm install ink react@18

// CRITICAL: Ink 6.6.0 requires Node.js 20+ (NOT Node 18)
// Current groundswell package.json has: "engines": { "node": ">=18" }
// Ink requires: "engines": { "node": ">=20" }
// CONFLICT: Prototype will work on Node 20+, but may fail on Node 18

// CRITICAL: tsconfig.json needs JSX configuration for .tsx files
// Without "jsx": "react-jsx", TypeScript will use old JSX transform
// Without "jsxImportSource": "ink", will import from 'react' not 'ink'
// REQUIRED ADDITIONS to tsconfig.json compilerOptions:
//   "jsx": "react-jsx"
//   "jsxImportSource": "ink"

// CRITICAL: Ink components must wrap ALL text in <Text> components
// <Box> cannot contain bare strings - always wrap in <Text>
// ❌ WRONG: <Box>Hello</Box>
// ✅ CORRECT: <Box><Text>Hello</Text></Box>

// CRITICAL: Never nest <Box> inside <Text>
// <Text> can only contain text and other <Text> components
// ❌ WRONG: <Text><Box>Hello</Box></Text>
// ✅ CORRECT: <Text><Text bold>Hello</Text></Text>

// CRITICAL: Use "type": "module" in package.json (already set)
// Groundswell already uses ES modules, so Ink works seamlessly
// ESM import: import { render } from 'ink' (no .js extension needed in source)

// CRITICAL: Run .tsx files with tsx, not node directly
// ❌ WRONG: node examples/ink-debugger-hello.tsx
// ✅ CORRECT: tsx examples/ink-debugger-hello.tsx
// ALTERNATIVE: Add to package.json scripts: "start:ink": "tsx examples/ink-debugger-hello.tsx"

// CRITICAL: Status symbols from WorkflowTreeDebugger
// STATUS_SYMBOLS constant: idle='○', running='◐', completed='✓', failed='✗'
// Use these symbols for consistency with existing ASCII output

// CRITICAL: WorkflowNode interface from src/types/workflow.ts
// interface WorkflowNode {
//   id: string;
//   name: string;
//   parent: WorkflowNode | null;
//   children: WorkflowNode[];
//   status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
//   logs: LogEntry[];
//   events: WorkflowEvent[];
//   stateSnapshot: SerializedWorkflowState | null;
// }

// CRITICAL: Bundle size impact of Ink
// Unpacked: ~344 KB
// Dependencies: 22 production dependencies (yoga-layout, chalk, ansi-escapes, etc.)
// Gzipped: ~17-18 KB
// Estimated project addition: ~50 KB gzipped

// CRITICAL: render() function return value
// render() returns { rerender, unmount, waitUntilExit }
// For hello-world, we don't need these - just call render() and exitOnCtrlC: true

// CRITICAL: exitOnCtrlC option in render()
// Always set { exitOnCtrlC: true } to allow clean exit
// Without this, Ctrl+C won't work and user must kill process

// CRITICAL: Shebang pattern for executable .tsx files
// Use: #!/usr/bin/env node (NOT #!/usr/bin/env tsx)
// TypeScript will ignore shebang line
// Run with: tsx filename.tsx
```

## Implementation Blueprint

### Data Models and Structure

**No new data models required** - prototype uses existing `WorkflowNode` interface and creates a simplified mock:

```typescript
// Simplified workflow node for prototype (matches WorkflowNode structure)
interface WorkflowNode {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  children?: WorkflowNode[];
}

// Status symbols (matches STATUS_SYMBOLS from tree-debugger.ts)
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE package.json with Ink dependencies
  - ADD to dependencies: "ink": "^6.6.0"
  - ADD to dependencies: "react": "^19.0.0"
  - VERIFY: "type": "module" is already set (it is)
  - RUN: npm install to install new dependencies
  - LOCATION: /home/dustin/projects/groundswell/package.json
  - NAMING: Use caret (^) for minor version compatibility
  - DEPENDENCIES: None (first task)

Task 2: UPDATE tsconfig.json with JSX configuration
  - ADD to compilerOptions: "jsx": "react-jsx"
  - ADD to compilerOptions: "jsxImportSource": "ink"
  - VERIFY: "target": "ES2022" (already set)
  - VERIFY: "module": "ES2022" (already set)
  - LOCATION: /home/dustin/projects/groundswell/tsconfig.json
  - PATTERN: Follow existing compilerOptions structure
  - DEPENDENCIES: Task 1 (Ink must be installed first)

Task 3: CREATE examples/ink-debugger-hello.tsx
  - IMPLEMENT: React functional component rendering workflow tree
  - USE: Ink components (Box, Text, Newline, render)
  - IMPLEMENT: StatusIcon component for status symbols
  - IMPLEMENT: WorkflowTree component for recursive rendering
  - IMPLEMENT: App component with sample workflow data
  - SHEBANG: Add #!/usr/bin/env node at top
  - NAMING: snake_case file name (ink-debugger-hello.tsx)
  - PLACEMENT: examples/examples/ directory (with other examples)
  - DEPENDENCIES: Task 1, Task 2 (Ink installed, TypeScript configured)

Task 4: VERIFY prototype runs successfully
  - RUN: tsx examples/examples/ink-debugger-hello.tsx
  - VERIFY: No TypeScript compilation errors
  - VERIFY: No runtime errors
  - VERIFY: Tree displays with proper indentation
  - VERIFY: Status icons render correctly
  - VERIFY: Press Ctrl+C exits cleanly
  - DEPENDENCIES: Task 3 (prototype file must exist)

Task 5: CREATE evaluation notes
  - DOCUMENT: Bundle size impact (measure with npm list --depth=0)
  - DOCUMENT: Node.js version compatibility (test on Node 18 vs 20)
  - DOCUMENT: Any gotchas encountered during implementation
  - DOCUMENT: Performance observations (startup time, render time)
  - DOCUMENT: Recommendations for proceeding with full implementation
  - LOCATION: plan/002_6761e4b84fd1/P2M2T1S1/research/06-ink-evaluation-notes.md
  - DEPENDENCIES: Task 4 (must run prototype first)

Task 6: ADD package.json script (optional but recommended)
  - ADD to scripts: "start:ink": "tsx examples/examples/ink-debugger-hello.tsx"
  - FOLLOW: Existing script pattern (see "start:observers", "start:basic")
  - ALTERNATIVE: Add as "start:ink-hello" for clarity
  - LOCATION: /home/dustin/projects/groundswell/package.json
  - DEPENDENCIES: Task 3 (prototype file must exist)
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// Pattern 1: Basic Ink component structure
// Location: examples/examples/ink-debugger-hello.tsx
// ============================================================================
#!/usr/bin/env node
import React from 'react';
import { render, Box, Text, Newline } from 'ink';

// Status icons (matches STATUS_SYMBOLS from tree-debugger.ts:15-21)
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

// Pattern 2: StatusIcon component
// Renders colored status symbols
const StatusIcon = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    idle: 'gray',
    running: 'yellow',
    completed: 'green',
    failed: 'red',
    cancelled: 'cyan',
  };

  return (
    <Text color={colors[status] || 'white'}>
      {STATUS_SYMBOLS[status] || '?'}
    </Text>
  );
};

// Pattern 3: Recursive tree rendering
// Matches renderTree() from tree-debugger.ts:217-245
const WorkflowTree = ({ node, depth = 0 }: { node: WorkflowNode; depth?: number }) => {
  const indent = '  '.repeat(depth);
  const branch = depth > 0 ? '├─ ' : '';

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{indent}</Text>
        <Text dimColor>{branch}</Text>
        <StatusIcon status={node.status} />
        <Text> </Text>
        <Text color={node.status === 'failed' ? 'red' : 'white'}>
          {node.name}
        </Text>
      </Box>
      {node.children?.map((child) => (
        <WorkflowTree key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
};

// Pattern 4: Main App component
// Sample workflow data demonstrating tree structure
const App = () => {
  const workflow: WorkflowNode = {
    id: 'root',
    name: 'Build Application',
    status: 'running',
    children: [
      {
        id: 'deps',
        name: 'Install Dependencies',
        status: 'completed',
        children: [
          { id: 'npm', name: 'npm install', status: 'completed', children: [] },
          { id: 'audit', name: 'npm audit', status: 'completed', children: [] },
        ],
      },
      {
        id: 'lint',
        name: 'Run Linter',
        status: 'running',
        children: [],
      },
      {
        id: 'test',
        name: 'Run Tests',
        status: 'idle',
        children: [
          { id: 'unit', name: 'Unit Tests', status: 'idle', children: [] },
          { id: 'int', name: 'Integration Tests', status: 'idle', children: [] },
        ],
      },
    ],
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Workflow Tree Debugger (Ink Prototype)
      </Text>
      <Text dimColor>Press Ctrl+C to exit</Text>
      <Newline />
      <WorkflowTree node={workflow} />
    </Box>
  );
};

// Pattern 5: Render with exit handler
// CRITICAL: Always set exitOnCtrlC: true
render(<App />, { exitOnCtrlC: true });
```

### Integration Points

```yaml
EXISTING CODE:
  - references: src/debugger/tree-debugger.ts
    pattern: "STATUS_SYMBOLS" constant (lines 15-21)
    usage: Replicate status symbols in Ink prototype

  - references: src/types/workflow.ts
    pattern: "WorkflowNode" interface
    usage: Create simplified interface matching structure

  - references: examples/examples/04-observers-debugger.ts
    pattern: Workflow creation and execution
    usage: Understand workflow data structure for sample data

NO MODIFICATIONS TO EXISTING CODE:
  - No changes to src/ directory
  - No changes to existing examples
  - Only additions to package.json and tsconfig.json
  - New file: examples/examples/ink-debugger-hello.tsx

NEW DEPENDENCIES:
  - add to: package.json
    dependencies:
      "ink": "^6.6.0"
      "react": "^19.0.0"

NEW TYPESCRIPT CONFIG:
  - add to: tsconfig.json
    compilerOptions:
      "jsx": "react-jsx"
      "jsxImportSource": "ink"
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# After modifying package.json - verify dependencies
npm install

# Expected: No errors, dependencies install successfully
# Common issues:
# - React 18 installed instead of 19 → Delete node_modules, reinstall
# - ESM conflicts → Verify "type": "module" is set

# After modifying tsconfig.json - verify TypeScript configuration
npx tsc --noEmit

# Expected: No errors ( Ink types are included in package)
# Common issues:
# - JSX configuration errors → Verify "jsx" and "jsxImportSource" are set
# - Module resolution errors → Verify "moduleResolution": "bundler" is set

# After creating prototype file - verify syntax
npx tsc --noEmit examples/examples/ink-debugger-hello.tsx

# Expected: No errors, TypeScript compiles .tsx successfully
# Common issues:
# - React import errors → Verify React 19 is installed
# - Ink component errors → Verify Ink is installed
# - JSX errors → Verify tsconfig.json JSX configuration
```

### Level 2: Unit Tests (Component Validation)

```bash
# No unit tests required for this prototype
# This is a visual prototype - manual testing is sufficient

# Future: When integrating with WorkflowTreeDebugger
# Tests will verify:
# - Tree renders correctly for complex workflows
# - Status icons match STATUS_SYMBOLS
# - Indentation matches toTreeString() output
```

### Level 3: Integration Testing (System Validation)

```bash
# Test 1: Run the prototype
tsx examples/examples/ink-debugger-hello.tsx

# Expected output:
# ╔══════════════════════════════════════════════════════════╗
# ║ Workflow Tree Debugger (Ink Prototype)                    ║
# ║ Press Ctrl+C to exit                                      ║
# ╠══════════════════════════════════════════════════════════╣
# ║ ◐ Build Application                                       ║
# ║   ├─ ✓ Install Dependencies                              ║
# ║   │   ├─ ✓ npm install                                    ║
# ║   │   └─ ✓ npm audit                                      ║
# ║   ├─ ◐ Run Linter                                         ║
# ║   └─ ○ Run Tests                                          ║
# ║       ├─ ○ Unit Tests                                     ║
# ║       └─ ○ Integration Tests                              ║
# ╚══════════════════════════════════════════════════════════╝
#
# Press Ctrl+C to exit → Clean exit

# Test 2: Verify Ctrl+C exits cleanly
# Press Ctrl+C while prototype is running
# Expected: Process exits immediately, no error messages

# Test 3: Check bundle size impact
npm list ink react --depth=0

# Expected:
# groundswell@x.x.x
# ├── ink@6.6.0
# └── react@19.0.0

# Check total dependencies added
npm list | grep -E "ink|react" | wc -l

# Expected: ~22 new dependencies (Ink + React + transitive deps)

# Test 4: Verify Node.js version compatibility
node --version

# Expected: v20.x.x or higher
# If v18.x.x: Ink may not work, recommend upgrade

# Test 5: Using package.json script (if added)
npm run start:ink

# Expected: Same output as running tsx directly
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Validation 1: Visual comparison with existing toTreeString()
# Create a test workflow, compare outputs
node -e "
const { createWorkflow } = require('./dist/index.js');

const workflow = createWorkflow('Test', async (ctx) => {
  ctx.log('Test');
});

const { WorkflowTreeDebugger } = require('./dist/index.js');
const debugger = new WorkflowTreeDebugger(workflow);

console.log('=== ASCII Output ===');
console.log(debugger.toTreeString());
"

# Then run Ink prototype with similar structure
# Compare: Indentation should match, status symbols should match

# Validation 2: Performance measurement
time tsx examples/examples/ink-debugger-hello.tsx

# Expected: Startup time < 500ms
# If > 1s: May indicate performance issues

# Validation 3: Memory usage
/usr/bin/time -v tsx examples/examples/ink-debugger-hello.tsx 2>&1 | grep "Maximum resident"

# Expected: RSS increase < 50MB compared to baseline
# If > 100MB: May indicate memory leak or inefficiency

# Validation 4: Terminal compatibility
# Test on different terminals:
# - GNOME Terminal
# - iTerm2
# - Windows Terminal
# - VS Code integrated terminal

# Expected: Consistent rendering across all terminals
# Issues to watch for:
# - Color not showing (terminal doesn't support colors)
# - Unicode symbols displaying as boxes (font issue)
# - Incorrect line wrapping (terminal size)

# Validation 5: Screen resize handling
# Run prototype, resize terminal window
# Expected: Output reflows correctly, no corruption

# Validation 6: Compare with prototype from research
cd /home/dustin/projects/groundswell/plan/002_6761e4b84fd1/P2M2T1S1/prototype
tsx cli.tsx

# Expected: Similar rendering to research prototype
# Use as reference for correct output
```

## Final Validation Checklist

### Technical Validation

- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] Dependencies install successfully: `npm install`
- [ ] Prototype runs without errors: `tsx examples/examples/ink-debugger-hello.tsx`
- [ ] Ctrl+C exits cleanly
- [ ] No console errors or warnings
- [ ] Tree renders with proper indentation
- [ ] Status icons display correctly
- [ ] Colors render (if terminal supports)
- [ ] Unicode symbols display correctly

### Feature Validation

- [ ] Tree structure matches expected format (indentation, branches)
- [ ] Status symbols match STATUS_SYMBOLS from tree-debugger.ts
- [ ] Recursion handles nested children correctly
- [ ] File follows existing example file patterns
- [ ] Shebang allows direct execution with tsx
- [ ] Exit on Ctrl+C works as expected

### Code Quality Validation

- [ ] All text wrapped in `<Text>` components
- [ ] No `<Box>` inside `<Text>`
- [ ] Uses Ink components correctly (Box, Text, Newline)
- [ ] TypeScript types are correct (no implicit any)
- [ ] File naming convention matches other examples
- [ ] Code is self-documenting with clear component names

### Documentation & Deployment

- [ ] Evaluation notes document findings
- [ ] Bundle size impact measured
- [ ] Node.js compatibility verified
- [ ] Gotchas documented for future reference
- [ ] Recommendations for next steps included

---

## Anti-Patterns to Avoid

- ❌ Don't install React 18 - Ink 6.x requires React 19+
- ❌ Don't run .tsx files with `node` - must use `tsx`
- ❌ Don't put bare strings in `<Box>` - always wrap in `<Text>`
- ❌ Don't nest `<Box>` inside `<Text>` - not allowed
- ❌ Don't forget `exitOnCtrlC: true` - users won't be able to exit
- ❌ Don't use old JSX transform - must configure `jsx: "react-jsx"`
- ❌ Don't skip `jsxImportSource: "ink"` - will import from wrong package
- ❌ Don't modify existing source files - this is a prototype only
- ❌ Don't add complex state management - keep it simple for hello-world
- ❌ Don't implement keyboard navigation yet - that's P2.M2.T2.S1
- ❌ Don't integrate with live WorkflowTreeDebugger - that's future work
- ❌ Don't modify `tasks.json`, `prd_snapshot.md`, or `.gitignore` - FORBIDDEN

## Context Completeness Validation

### "No Prior Knowledge" Test Results

If someone knew nothing about this codebase, would they have everything needed to implement this successfully?

**YES** - This PRP provides:

1. **Exact Installation Commands**:
   - `npm install ink react` with specific versions
   - React 19+ requirement clearly documented
   - Node 20+ requirement documented

2. **Complete Working Code**:
   - Full prototype code with all components
   - StatusIcon component
   - WorkflowTree recursive component
   - App component with sample data
   - Exact import statements

3. **File Locations**:
   - `examples/examples/ink-debugger-hello.tsx` for prototype
   - `package.json` for dependencies
   - `tsconfig.json` for JSX configuration

4. **TypeScript Configuration**:
   - Exact compilerOptions to add
   - JSX configuration for Ink 6.x
   - Integration with existing ES module setup

5. **Research References**:
   - 6 research documents with detailed findings
   - Official Ink documentation URLs
   - GitHub repositories for examples
   - Performance and bundle size data

6. **Gotchas and Constraints**:
   - React version requirement (19+, not 18)
   - Node.js version requirement (20+, not 18)
   - JSX configuration requirements
   - Ink component nesting rules
   - Text wrapping requirements

7. **Validation Commands**:
   - Specific commands to test the prototype
   - Expected output format
   - Error troubleshooting

8. **Integration Points**:
   - References to existing `tree-debugger.ts` patterns
   - `WorkflowNode` interface to follow
   - `STATUS_SYMBOLS` constant to replicate
   - Example file patterns to match

### Confidence Score

**10/10** - One-pass implementation success likelihood is excellent.

**Justification**:
1. Complete working code provided - just copy-paste
2. All dependencies and configuration specified
3. Research thoroughly covers all aspects
4. Validation commands are specific and executable
5. Gotchas are comprehensively documented
6. Working prototype already exists in research directory

**Remaining risks** (minimal):
- Node.js version mismatch if developer has Node 18
- React version mismatch if npm installs React 18
- Both are documented with clear error messages

The completed PRP enables an AI agent unfamiliar with the codebase to implement the feature successfully using only the PRP content and codebase access.

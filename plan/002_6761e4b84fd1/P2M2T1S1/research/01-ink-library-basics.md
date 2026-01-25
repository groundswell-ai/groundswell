# Ink Library (React for CLI) - Comprehensive Research

## Executive Summary

**Ink** is a React renderer for building interactive command-line interfaces. It allows you to use React components to build CLI applications with the same component-based UI building experience that React offers in the browser.

- **Latest Version**: `6.6.0` (released December 2025)
- **Repository**: https://github.com/vadimdemedes/ink
- **Bundle Size**: ~344 KB (unpacked)
- **Tagline**: "React for CLIs"

---

## 1. INSTALLATION

### Exact Install Commands

```bash
# Basic installation (recommended)
npm install ink react

# With TypeScript types (automatically included)
npm install ink react

# Install exact version
npm install ink@6.6.0 react@latest

# Using yarn
yarn add ink react

# Using pnpm
pnpm add ink react
```

### Peer Dependencies

Ink v6.6.0 requires the following peer dependencies:

```json
{
  "peerDependencies": {
    "@types/react": ">=19.0.0",
    "react": ">=19.0.0",
    "react-devtools-core": "^6.1.2"
  }
}
```

**CRITICAL**: You must install React 19 or higher. Older React versions will NOT work with Ink 6.6.0.

### Minimum Requirements

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

**Minimum Node.js version**: 20.0.0

---

## 2. CORE API REFERENCE

### render()

The main entry point for rendering Ink components.

```typescript
import { render } from 'ink';

render(<App />, {
  // Options
  stdout: process.stdout,
  stderr: process.stderr,
  debug: boolean,
  exitOnCtrlC: boolean
});
```

**Return value**: Returns an instance with the following methods:
- `.unmount()` - Unmount the Ink app
- `.rerender()` - Re-render the app with new props
- `.waitUntilExit()` - Wait until the app exits

### Core Components

#### `<Text>`

Displays text with styling options.

**Props:**
- `color: string` - Text color (uses chalk)
  - Named colors: `"green"`, `"red"`, `"blue"`, `"yellow"`, etc.
  - Hex colors: `"#005cc5"`
  - RGB: `"rgb(232, 131, 136)"`
- `backgroundColor: string` - Background color (same formats as color)
- `dimColor: boolean` - Dim the color (default: `false`)
- `bold: boolean` - Bold text (default: `false`)
- `italic: boolean` - Italic text (default: `false`)
- `underline: boolean` - Underlined text (default: `false`)
- `strikethrough: boolean` - Strikethrough text (default: `false`)
- `inverse: boolean` - Inverse foreground/background (default: `false`)
- `wrap: string` - Text wrapping behavior
  - `"wrap"` - Wrap text (default)
  - `"truncate"` - Truncate with ellipsis at end
  - `"truncate-start"` - Truncate with ellipsis at start
  - `"truncate-middle"` - Truncate with ellipsis in middle
  - `"truncate-end"` - Same as "truncate"

**Important**: `<Text>` only allows text nodes and other `<Text>` components inside. Cannot contain `<Box>`.

#### `<Box>`

Essential layout component (flexbox container). Like `<div style="display: flex">` in browser.

**Dimensions:**
- `width: number | string` - Width in spaces or percentage (e.g., `"50%"`)
- `height: number | string` - Height in lines or percentage
- `minWidth: number` - Minimum width
- `minHeight: number` - Minimum height

**Padding:**
- `paddingTop: number` - Top padding (default: 0)
- `paddingBottom: number` - Bottom padding (default: 0)
- `paddingLeft: number` - Left padding (default: 0)
- `paddingRight: number` - Right padding (default: 0)
- `paddingX: number` - Horizontal padding
- `paddingY: number` - Vertical padding
- `padding: number` - All sides

**Margin:**
- `marginTop: number`
- `marginBottom: number`
- `marginLeft: number`
- `marginRight: number`
- `marginX: number`
- `marginY: number`
- `margin: number`

**Flexbox:**
- `flexDirection: "row" | "column"`
- `flexGrow: number`
- `flexShrink: number`
- `flexBasis: number`
- `justifyContent: "flex-start" | "center" | "flex-end" | "space-between"`
- `alignItems: "flex-start" | "center" | "flex-end"`
- `gap: number`

**Other:**
- `borderStyle: string` - Border style
- `borderColor: string` - Border color
- `display: string` - Display type

#### `<Newline>`

Adds a newline.

```jsx
<Newline count={2} /> // Adds 2 newlines
```

#### `<Spacer>`

Expands to fill available space.

```jsx
<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

---

## 3. TYPESCRIPT SUPPORT

### Using .tsx Files

Ink has built-in TypeScript support. The types are included in the package at `./build/index.d.ts`.

### Running .tsx Files

**Option 1: Using tsx (Recommended)**
```bash
# Install tsx
npm install -D tsx

# Run .tsx file
tsx cli.tsx
```

**Option 2: Using esbuild-loader**
```bash
npm install -D @esbuild-kit/esm-loader
node --loader @esbuild-kit/esm-loader cli.tsx
```

**Option 3: Using import-jsx**
```bash
npm install import-jsx
node cli.js  # Transpile first
```

**Option 4: Build with tsc**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "jsx": "react",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

```bash
tsc cli.tsx && node cli.js
```

### ES Modules Support

**Yes**, Ink works with ES modules (`"type": "module"` in package.json).

```json
{
  "type": "module",
  "dependencies": {
    "ink": "^6.6.0",
    "react": "^19.0.0"
  }
}
```

```tsx
// cli.tsx - ES Module syntax
import React from 'react';
import { render, Text, Box } from 'ink';

const App = () => (
  <Box>
    <Text>Hello from Ink!</Text>
  </Box>
);

render(<App />);
```

Run with: `tsx cli.tsx`

---

## 4. WORKING HELLO-WORLD EXAMPLE

### Basic Hello World

```tsx
#!/usr/bin/env node
import React from 'react';
import { render, Text, Box } from 'ink';

const App = () => (
  <Box padding={1}>
    <Text color="green" bold>
      Hello, World! 👋
    </Text>
  </Box>
);

render(<App />);
```

### Interactive Counter Example

```tsx
#!/usr/bin/env node
import React, { useState, useEffect } from 'react';
import { render, Text, Box } from 'ink';

const Counter = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return <Text color="green">Count: {count}</Text>;
};

render(<Counter />);
```

### Complete Workflow Tree Debugger Prototype

```tsx
#!/usr/bin/env node
import React from 'react';
import { render, Box, Text, Newline } from 'ink';

interface WorkflowNode {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  children?: WorkflowNode[];
}

const StatusIcon = ({ status }: { status: WorkflowNode['status'] }) => {
  const icons = {
    pending: <Text color="gray">○</Text>,
    running: <Text color="yellow">◉</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status];
};

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
          {node.label}
        </Text>
      </Box>
      {node.children?.map((child) => (
        <WorkflowTree key={child.id} node={child} depth={depth + 1} />
      ))}
    </Box>
  );
};

const App = () => {
  const workflow: WorkflowNode = {
    id: 'root',
    label: 'Build Application',
    status: 'running',
    children: [
      {
        id: 'deps',
        label: 'Install Dependencies',
        status: 'completed',
        children: [
          { id: 'npm', label: 'npm install', status: 'completed' },
          { id: 'audit', label: 'npm audit', status: 'completed' },
        ],
      },
      {
        id: 'lint',
        label: 'Run Linter',
        status: 'running',
        children: [],
      },
      {
        id: 'test',
        label: 'Run Tests',
        status: 'pending',
        children: [
          { id: 'unit', label: 'Unit Tests', status: 'pending' },
          { id: 'int', label: 'Integration Tests', status: 'pending' },
        ],
      },
    ],
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Workflow Tree Debugger
      </Text>
      <Newline />
      <WorkflowTree node={workflow} />
    </Box>
  );
};

render(<App />);
```

### Setup Instructions

```bash
# 1. Create project directory
mkdir ink-debugger && cd ink-debugger

# 2. Initialize with ES modules
npm init -y
echo '{"type": "module"}' > package.json

# 3. Install dependencies
npm install ink react tsx

# 4. Create cli.tsx with the code above
cat > cli.tsx << 'EOF'
#!/usr/bin/env node
// (paste the code from above)
EOF

# 5. Make executable
chmod +x cli.tsx

# 6. Run
tsx cli.tsx
```

---

## 5. HOOKS API

### useInput

Handle user input.

```tsx
import { useInput } from 'ink';

const App = () => {
  useInput((input, key) => {
    if (input === 'q') {
      process.exit(0);
    }
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  return <Text>Press q to quit</Text>;
};
```

### useApp

Access the Ink app instance.

```tsx
import { useApp } from 'ink';

const App = () => {
  const { exit } = useApp();

  return <Text onPress={() => exit()}>Exit</Text>;
};
```

### useStdin, useStdout, useStderr

Access standard streams.

```tsx
import { useStdin } from 'ink';

const App = () => {
  const { stdin } = useStdin();
  return <Text>Input is TTY: {stdin.isTTY}</Text>;
};
```

### useFocus

Focus management for interactive components.

```tsx
import { useFocus } from 'ink';

const App = () => {
  const { isFocused } = useFocus();
  return <Text>{isFocused ? 'Focused' : 'Not focused'}</Text>;
};
```

---

## 6. GOTCHAS & COMMON PITFALLS

### 1. React Version Mismatch
**Problem**: Using React < 19 with Ink 6.6.0
**Solution**: Always install React 19+: `npm install react@latest`

### 2. Node.js Version
**Problem**: Using Node < 20
**Solution**: Upgrade to Node 20 or higher

### 3. Text Inside Box
**Problem**: Putting text directly inside `<Box>` without `<Text>`
**Solution**: Always wrap text in `<Text>` component
```tsx
// ❌ Wrong
<Box>Hello</Box>

// ✅ Correct
<Box><Text>Hello</Text></Box>
```

### 4. Box Inside Text
**Problem**: Nesting `<Box>` inside `<Text>`
**Solution**: `<Text>` can only contain text and other `<Text>` components
```tsx
// ❌ Wrong
<Text><Box>Hello</Box></Text>

// ✅ Correct
<Text><Text bold>Hello</Text></Text>
```

### 5. Forgetting exitOnCtrlC
**Problem**: App doesn't exit on Ctrl+C
**Solution**: Add to render options
```tsx
render(<App />, { exitOnCtrlC: true });
```

### 6. Multiple render() calls
**Problem**: Calling render() multiple times
**Solution**: Call render() once, use `.rerender()` for updates
```tsx
// ❌ Wrong
render(<App state={1} />);
render(<App state={2} />);

// ✅ Correct
const { rerender } = render(<App state={1} />);
rerender(<App state={2} />);
```

### 7. Package.json type
**Problem**: CommonJS with ES module syntax
**Solution**: Add `"type": "module"` to package.json or use `.cjs` extension

### 8. Shebang in .tsx files
**Problem**: Shebang causes TypeScript errors
**Solution**: Use `@ts-ignore` or separate build step
```tsx
#!/usr/bin/env node
// @ts-ignore
import React from 'react';
```

---

## 7. BUNDLE SIZE IMPACT

### Installation Size
- **Unpacked**: ~344 KB
- **Dependencies**: 22 production dependencies
  - React runtime dependencies
  - Yoga layout engine
  - ANSI escape handling
  - WebSocket support for DevTools

### Key Dependencies
- `@alcalzone/ansi-tokenize` - ANSI tokenization
- `ansi-escapes` - ANSI escape codes
- `chalk` - Color support
- `yoga-layout` - Flexbox layout engine
- `react-reconciler` - React rendering
- `ws` - WebSocket support

### Optimization Tips
1. Use production builds: `NODE_ENV=production`
2. Tree-shaking works with ES modules
3. Consider lighter alternatives if size is critical
4. Dependencies are mostly focused on layout and rendering

---

## 8. TESTING

Ink supports testing with `ink-testing-library`:

```bash
npm install --save-dev ink-testing-library
```

```tsx
import { render } from 'ink-testing-library';
import { App } from './App';

test('renders hello world', () => {
  const { lastFrame } = render(<App />);
  expect(lastFrame()).toContain('Hello World');
});
```

---

## 9. REACT DEVTOOLS SUPPORT

Ink supports React DevTools for debugging:

```bash
npm install --save-dev react-devtools-core
```

```tsx
render(<App />, { debug: true });
```

Then run React DevTools standalone to inspect your CLI app.

---

## 10. NOTABLE USERS

Ink is used by major projects:
- **Claude Code** (Anthropic)
- **GitHub Copilot CLI**
- **Cloudflare Wrangler**
- **Prisma**
- **Gatsby**
- **Shopify CLI**
- **Twilio SIGNAL**
- **New York Times** (kyt toolkit)

---

## 11. QUICK START CHECKLIST

```bash
# 1. Create project
mkdir my-ink-cli && cd my-ink-cli

# 2. Initialize
npm init -y

# 3. Set ES modules (optional but recommended)
npm pkg set type="module"

# 4. Install dependencies
npm install ink react tsx

# 5. Create cli.tsx
cat > cli.tsx << 'EOF'
#!/usr/bin/env node
import React from 'react';
import { render, Text, Box } from 'ink';

const App = () => (
  <Box padding={1}>
    <Text color="green" bold>Hello, Ink! 🎉</Text>
  </Box>
);

render(<App />, { exitOnCtrlC: true });
EOF

# 6. Make executable
chmod +x cli.tsx

# 7. Run
tsx cli.tsx
```

---

## 12. ADDITIONAL RESOURCES

- **GitHub**: https://github.com/vadimdemedes/ink
- **NPM**: https://www.npmjs.com/package/ink
- **Examples**: Check the `/examples` folder in the GitHub repo
- **Scaffold**: Use `npx create-ink-app my-cli` for quick project setup
- **Discord**: Join the Ink community for support

---

## SUMMARY

✅ **Exact install command**: `npm install ink react`
✅ **React version required**: `>=19.0.0`
✅ **Minimum Node.js**: `>=20`
✅ **Run .tsx**: `tsx cli.tsx` (after `npm install -D tsx`)
✅ **ES modules**: Fully supported with `"type": "module"`
✅ **Bundle size**: ~344 KB unpacked
✅ **TypeScript**: Built-in support with `.d.ts` included
✅ **Core components**: `<Text>`, `<Box>`, `<Newline>`, `<Spacer>`

**Ink is production-ready and battle-tested by major companies.**

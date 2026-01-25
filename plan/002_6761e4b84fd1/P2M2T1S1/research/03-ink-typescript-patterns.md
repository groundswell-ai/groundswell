# Ink + TypeScript + ESM: Best Practices Guide

**Last Updated:** 2026-01-24  
**Research for:** P2M2T1S1 - CLI UI Implementation with Ink

---

## Executive Summary

Ink is React for CLIs. When combined with TypeScript and ESM in a Node.js project, several configuration details must be aligned correctly. This guide provides working patterns for tsconfig, shebang execution, type definitions, and testing.

---

## 1. TypeScript Configuration for Ink

### Recommended tsconfig.json

For Ink + ESM projects, use this configuration:

```json
{
  "compilerOptions": {
    // Modern target for Node.js 18+
    "target": "ES2022",
    
    // ESM module system
    "module": "ES2022",
    
    // CRITICAL for ESM + TypeScript
    "moduleResolution": "bundler",
    
    // Library definitions
    "lib": ["ES2022", "DOM"],
    
    // JSX configuration for Ink
    "jsx": "react-jsx",
    "jsxImportSource": "ink",
    
    // Type checking
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    
    // Build output
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    
    // Modern class features
    "useDefineForClassFields": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Critical tsconfig Options Explained

| Option | Value | Why Required for Ink |
|--------|-------|---------------------|
| `moduleResolution` | `"bundler"` | Required for ESM with TypeScript 5+. `"node"` causes issues with `.tsx` files |
| `jsx` | `"react-jsx"` | New JSX transform (automatic runtime) |
| `jsxImportSource` | `"ink"` | Tells TypeScript to import JSX runtime from Ink, not React |
| `module` | `"ES2022"` | Matches `"type": "module"` in package.json |
| `target` | `"ES2022"` | Node.js 18+ supports ES2022 features |
| `lib` | `["ES2022", "DOM"]` | DOM needed for React/Ink types (Element, FC, etc.) |

---

## 2. Shebang Patterns for Executable .tsx Files

### Direct Execution with tsx

Ink CLI tools can be made executable using tsx:

```tsx
#!/usr/bin/env -S tsx --tsconfig=./tsconfig.json

import { render, Box, Text } from 'ink'

const App = () => <Box>Hello World</Box>
render(<App />)
```

**Key Points:**
- Use `-S` flag to pass multiple arguments to env
- Explicitly specify tsconfig path (resolves module resolution issues)
- File must be executable: `chmod +x cli.tsx`

### Alternative: Node.js with tsx register

```tsx
#!/usr/bin/env node
// @ts-check

import { register } from 'tsx/register'
import { render, Box, Text } from 'ink'

const App = () => <Box>Hello World</Box>
render(<App />)
```

### Package.json Scripts Pattern

```json
{
  "scripts": {
    "start": "tsx src/cli.tsx",
    "dev": "tsx watch src/cli.tsx"
  }
}
```

---

## 3. Type Definitions from Ink

### Main Type Imports

```typescript
import {
  render,          // (component: ReactElement) -> Instance
  Box,             // FC<BoxProps>
  Text,            // FC<TextProps>
  Static,          // FC (prevents re-renders)
  Newline,         // FC (adds newline)
  Spacer,          // FC (flexible spacing)
  Flex,            // FC (alias for Box with flexDirection: 'row')
} from 'ink'

import type {
  Instance,        // Render instance with .unmount() method
  BoxProps,        // {padding, margin, width, height, ...}
  TextProps,       // {bold, italic, underline, color, ...}
  InkProps,        // Props for root Ink component
} from 'ink'
```

### Component Props Interface

```typescript
import type { FC } from 'react'
import { Box, Text } from 'ink'

interface MyComponentProps {
  title: string
  count?: number
  onExit?: () => void
}

export const MyComponent: FC<MyComponentProps> = ({ title, count = 0 }) => {
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <Text>Count: {count}</Text>
    </Box>
  )
}
```

### Using Ink Hooks with Types

```typescript
import { useApp, useInput, useStdin } from 'ink'

function App() {
  const { exit } = useApp()
  
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit()
    }
  })
  
  const { isRawModeSupported } = useStdin()
  
  return <Box>Press Ctrl+C to exit</Box>
}
```

---

## 4. Custom Component Typing Patterns

### Higher-Order Component Pattern

```typescript
import type { FC, ReactNode } from 'react'
import { Box } from 'ink'

interface WrapperProps {
  children: ReactNode
  border?: boolean
}

export const Wrapper: FC<WrapperProps> = ({ children, border = false }) => {
  const borderStyle = border ? { borderStyle: 'single' } : {}
  return <Box {...borderStyle}>{children}</Box>
}
```

### Generic List Component

```typescript
import type { FC } from 'react'
import { Box, Text } from 'ink'

interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => string
  emptyMessage?: string
}

export function List<T>({ items, renderItem, emptyMessage = 'No items' }: ListProps<T>) {
  if (items.length === 0) {
    return <Text dimColor>{emptyMessage}</Text>
  }
  
  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Text key={i}>{renderItem(item, i)}</Text>
      ))}
    </Box>
  )
}

// Usage
interface User { name: string; id: number }
<List<User> items={users} renderItem={(u) => `${u.id}: ${u.name}`} />
```

### Strict Props with Discriminated Unions

```typescript
import type { FC } from 'react'
import { Box, Text } from 'ink'

type Status = 'loading' | 'success' | 'error'

interface BaseProps {
  status: Status
}

interface LoadingProps extends BaseProps {
  status: 'loading'
  message?: string
}

interface SuccessProps extends BaseProps {
  status: 'success'
  result: string
}

interface ErrorProps extends BaseProps {
  status: 'error'
  error: Error
  retry?: () => void
}

type StatusProps = LoadingProps | SuccessProps | ErrorProps

export const StatusDisplay: FC<StatusProps> = (props) => {
  switch (props.status) {
    case 'loading':
      return <Text>Loading... {props.message}</Text>
    case 'success':
      return <Text color="green">✓ {props.result}</Text>
    case 'error':
      return (
        <Box flexDirection="column">
          <Text color="red">✗ {props.error.message}</Text>
          {props.retry && <Text dimColor>Press R to retry</Text>}
        </Box>
      )
  }
}
```

---

## 5. Common TypeScript Issues with Ink

### Issue 1: JSX Element Type Errors

**Error:** `JSX element type 'Box' does not have any construct or call signatures`

**Solution:** Ensure `jsxImportSource` is set in tsconfig:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "ink"
  }
}
```

### Issue 2: Module Resolution Failures

**Error:** `Cannot find module 'ink' or its corresponding type declarations`

**Solution:** Check peer dependencies are installed:

```bash
npm install react@^19.0.0 @types/react@^19.0.0
# OR for React 18:
npm install react@^18.0.0 @types/react@^18.0.0 ink@^4.0.0
```

### Issue 3: ESM Import Errors

**Error:** `Unknown file extension ".tsx"`

**Solution:** Use `tsx` CLI, not `node`:

```json
{
  "scripts": {
    "start": "tsx src/cli.tsx"  // Correct
    // "start": "node src/cli.tsx"  // Wrong
  }
}
```

### Issue 4: Type Assertions for Styles

**Error:** `Type 'string' is not assignable to type 'never'`

**Solution:** Use proper type imports:

```typescript
import type { CSSProperties } from 'ink'

const styles: CSSProperties = {
  flexDirection: 'column',
  padding: 1,
  borderStyle: 'single'
}
```

### Issue 5: Hook Rules in TypeScript

**Error:** `Hooks can only be called inside the body of a function component`

**Solution:** Ensure FC type is used and hooks are at top level:

```typescript
import type { FC } from 'react'
import { useApp } from 'ink'

const App: FC = () => {
  const { exit } = useApp()  // Correct: at top level
  
  const nested = () => {
    const { exit } = useApp()  // ERROR: hook in nested function
  }
}
```

---

## 6. Ink with "type": "module" (ESM)

### Package.json Configuration

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### ESM-Specific Patterns

**Importing .tsx files directly:**
```typescript
// Works with tsx
import { MyComponent } from './components/MyComponent.tsx'

// Also works (extension optional)
import { MyComponent } from './components/MyComponent'
```

**Dynamic imports for lazy loading:**
```typescript
const { HeavyComponent } = await import('./HeavyComponent')
```

**__dirname and __filename in ESM:**
```typescript
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const configPath = join(__dirname, 'config.json')
```

---

## 7. Testing Ink Components with TypeScript

### Vitest Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.tsx'],
  },
  esbuild: {
    jsx: 'automatic',  // Required for Ink
    jsxImportSource: 'ink',
  }
})
```

### Test File Structure

```typescript
// src/components/MyComponent.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders title and count', async () => {
    const { lastFrame } = await render(
      <MyComponent title="Test" count={42} />
    )
    
    expect(lastFrame()).toContain('Test')
    expect(lastFrame()).toContain('42')
  })
})
```

### Testing User Input

```typescript
import { render } from 'ink-testing-library'
import { stdin } from 'mock-stdin'

describe('InputHandler', () => {
  it('exits on Ctrl+C', async () => {
    const exit = vi.fn()
    const { unmount } = await render(<App />)
    
    const mockStdin = stdin()
    mockStdin.send('\x03')  // Ctrl+C
    mockStdin.end()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(exit).toHaveBeenCalled()
    unmount()
  })
})
```

### Testing Async Components

```typescript
import { render } from 'ink-testing-library'
import { waitFor } from '@testing-library/dom'

describe('AsyncComponent', () => {
  it('shows loading then result', async () => {
    const { lastFrame } = await render(<AsyncComponent />)
    
    expect(lastFrame()).toContain('Loading...')
    
    await waitFor(() => {
      expect(lastFrame()).toContain('Complete')
    })
  })
})
```

---

## 8. Type Exports for Library Projects

### Exporting Ink Components

```typescript
// src/index.ts
export { MyComponent } from './components/MyComponent'
export type { MyComponentProps } from './components/MyComponent'

// Re-export Ink types for convenience
export type { BoxProps, TextProps } from 'ink'
```

### Declaration Map Generation

Ensure tsconfig generates declaration maps:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}
```

This enables IDE "Go to Definition" to work for consumers.

---

## 9. TypeScript + Ink + tsx Best Practices

### File Organization

```
src/
├── cli.tsx              # Entry point with shebang
├── components/          # Reusable Ink components
│   ├── Header.tsx
│   ├── StatusLine.tsx
│   └── index.ts         # Exports
├── hooks/               # Custom Ink hooks
│   ├── useAsync.ts
│   └── index.ts
├── utils/               # Helper functions
│   ├── format.ts
│   └── constants.ts
└── types/               # Shared types
    └── index.ts
```

### Component Type Template

```typescript
// src/components/Feature.tsx
import type { FC } from 'react'
import { Box, Text } from 'ink'
import type { BoxProps } from 'ink'

export interface FeatureProps extends BoxProps {
  /** Feature name for display */
  name: string
  /** Optional description */
  description?: string
  /** Whether feature is enabled */
  enabled: boolean
}

export const Feature: FC<FeatureProps> = ({ 
  name, 
  description, 
  enabled, 
  ...boxProps 
}) => {
  const color = enabled ? 'green' : 'red'
  const symbol = enabled ? '✓' : '✗'
  
  return (
    <Box {...boxProps}>
      <Text color={color}>{symbol}</Text>
      <Text bold> {name}</Text>
      {description && <Text dimColor> - {description}</Text>}
    </Box>
  )
}
```

---

## 10. Quick Reference: tsconfig for Ink + ESM

### Minimal Working Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "ink",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### All Recommended Options

```json
{
  "compilerOptions": {
    // Target and Module
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    
    // JSX
    "jsx": "react-jsx",
    "jsxImportSource": "ink",
    
    // Type Checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    
    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    
    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    
    // Advanced
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.tsx"]
}
```

---

## 11. Dependency Versions Matrix

| Ink Version | React Version | @types/react | Notes |
|-------------|---------------|--------------|-------|
| 6.x | 19.x | >=19.0.0 | Latest, React 19 required |
| 5.x | 18.x | >=18.0.0 | Stable, React 18 |
| 4.x | 18.x | >=18.0.0 | Last with React 18 |

**Install command for latest:**
```bash
npm install ink@latest react@^19.0.0 @types/react@^19.0.0
```

**Install command for React 18 (recommended for stability):**
```bash
npm install ink@^4.0.0 react@^18.0.0 @types/react@^18.0.0
```

---

## 12. Common Patterns Cheat Sheet

### Import Patterns
```typescript
// Ink components
import { render, Box, Text } from 'ink'

// Types
import type { FC, ReactNode } from 'react'
import type { Instance } from 'ink'

// Hooks
import { useApp, useInput, useStdout } from 'ink'
```

### Component Template
```typescript
import type { FC } from 'react'
import { Box, Text } from 'ink'

interface Props {
  /** Prop description */
  value: string
}

export const Component: FC<Props> = ({ value }) => {
  return <Text>{value}</Text>
}
```

### Render Pattern
```typescript
import { render } from 'ink'
import { App } from './App'

const { waitUntilExit } = render(<App />)
await waitUntilExit()
```

### Shebang Template
```tsx
#!/usr/bin/env -S tsx
import { render } from 'ink'
render(<App />)
```

---

## Conclusion

The critical success factors for Ink + TypeScript + ESM:

1. **tsconfig.json**: Set `moduleResolution: "bundler"` and `jsxImportSource: "ink"`
2. **Shebang**: Use `#!/usr/bin/env -S tsx` for executable .tsx files
3. **Peer Dependencies**: Install matching React and @types/react versions
4. **Testing**: Configure vitest with `jsx: "automatic"` and `jsxImportSource: "ink"`
5. **Types**: Import from 'ink' and use FC<Props> pattern for components

---

**Related Research:**
- `01-cli-frameworks-research.md` - CLI framework comparison
- `02-ink-component-patterns.md` - Ink-specific component patterns
- `04-testing-ink-components.md` - Testing strategies

**See Also:**
- `/plan/002_6761e4b84fd1/P2M2T1S1/PRP.md` - Implementation PRP
- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [Ink Documentation](https://github.com/vadimdemedes/ink/tree/main/documentation)

---

*Document generated as part of P2M2T1S1 research for CLI UI implementation*

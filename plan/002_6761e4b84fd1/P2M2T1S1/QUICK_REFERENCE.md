# Ink Quick Reference Card

## INSTALLATION

```bash
npm install ink react tsx
```

## REQUIREMENTS

- Node.js >= 20
- React >= 19
- ES modules (`"type": "module"`)

## BASIC TEMPLATE

```tsx
#!/usr/bin/env node
import React from 'react';
import { render, Text, Box } from 'ink';

const App = () => (
  <Box padding={1}>
    <Text color="green">Hello, Ink!</Text>
  </Box>
);

render(<App />, { exitOnCtrlC: true });
```

## CORE COMPONENTS

### Text
```tsx
<Text color="green" bold>Success</Text>
<Text color="red" underline>Error</Text>
<Text dimColor>Muted</Text>
<Text italic>Italic</Text>
<Text strikethrough>Struck</Text>
```

### Box (Layout)
```tsx
<Box padding={1} margin={2}>      // Spacing
<Box width={10} height={5}>        // Dimensions
<Box flexDirection="column">       // Column layout
<Box justifyContent="center">      // Alignment
<Box gap={2}>                      // Gap between items
```

## HOOKS

```tsx
useInput((input, key) => {})       // Keyboard input
useApp()                           // App instance
useStdin() / useStdout()           // Streams
useFocus()                         // Focus management
```

## RUNNING

```bash
tsx cli.tsx                        # Run directly
tsx --watch cli.tsx                # Watch mode
npm start                          # Using package.json
```

## COMMON PATTERNS

### Conditional Styling
```tsx
<Text color={status === 'ok' ? 'green' : 'red'}>
  {status}
</Text>
```

### Lists
```tsx
<Box flexDirection="column">
  {items.map(item => (
    <Text key={item.id}>{item.name}</Text>
  ))}
</Box>
```

### Status Icons
```tsx
const icons = {
  pending: <Text color="gray">○</Text>,
  running: <Text color="yellow">◉</Text>,
  completed: <Text color="green">✓</Text>,
  failed: <Text color="red">✗</Text>,
};
```

## TREE STRUCTURE

```tsx
const TreeNode = ({ node, depth = 0 }) => (
  <Box flexDirection="column">
    <Box paddingLeft={depth * 2}>
      <Text>{node.label}</Text>
    </Box>
    {node.children?.map(child => (
      <TreeNode key={child.id} node={child} depth={depth + 1} />
    ))}
  </Box>
);
```

## KEYBOARD INPUT

```tsx
useInput((input, key) => {
  if (key.ctrl && input === 'c') exit();
  if (key.return) console.log('Enter');
  if (key.name === 'up') navigateUp();
});
```

## COLORS

Named: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
Hex: `"#005cc5"`
RGB: `"rgb(232, 131, 136)"`

## GOTCHAS

- Always wrap text in `<Text>` component
- Never put `<Box>` inside `<Text>`
- Use React 19+, not 18
- Use Node 20+, not 18
- Add `"type": "module"` to package.json

## FULL EXAMPLE

```tsx
#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';

const Counter = () => {
  const [count, setCount] = useState(0);

  useInput((input, key) => {
    if (input === 'q') process.exit(0);
    if (key.return) setCount(c => c + 1);
  });

  return (
    <Box padding={1}>
      <Text color="cyan">Count: {count}</Text>
      <Text dimColor> (Press Enter to increment, q to quit)</Text>
    </Box>
  );
};

render(<Counter />);
```

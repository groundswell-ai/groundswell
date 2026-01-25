# Ink Workflow Tree Debugger - Hello World Prototype

This is a working prototype demonstrating Ink's capabilities for building a workflow tree debugger CLI.

## What is Ink?

Ink is **React for CLIs** - it allows you to build command-line interfaces using React components.

## Quick Start

```bash
# Install dependencies
npm install

# Run the prototype
npm start
```

## What You'll See

```
┌─────────────────────────────────────┐
│ Workflow Tree Debugger              │
│ Press Ctrl+C to exit                │
│                                     │
│ ✓ Build Application                 │
│   ├─ ✓ Install Dependencies         │
│   │   ├─ ✓ npm install              │
│   │   └─ ✓ npm audit                │
│   ├─ ◉ Run Linter                   │
│   └─ ○ Run Tests                    │
│       ├─ ○ Unit Tests               │
│       └─ ○ Integration Tests        │
└─────────────────────────────────────┘
```

## Features Demonstrated

- **Text Styling**: Colors, bold, dim
- **Box Layouts**: Padding, flexbox layout
- **Tree Structure**: Recursive component rendering
- **Status Icons**: Conditional rendering based on state
- **ES Modules**: Using `"type": "module"` in package.json
- **TypeScript**: Full type safety with `.tsx` files

## File Structure

```
.
├── cli.tsx          # Main CLI application
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## Key Ink Concepts Used

### 1. Text Component
```tsx
<Text color="green" bold>Success!</Text>
<Text color="red" bold>Error!</Text>
<Text dimColor>Dimmed text</Text>
```

### 2. Box Component (Layout)
```tsx
<Box padding={1} flexDirection="column">
  <Text>Line 1</Text>
  <Text>Line 2</Text>
</Box>
```

### 3. render() Function
```tsx
render(<App />, { exitOnCtrlC: true });
```

### 4. Conditional Rendering
```tsx
const StatusIcon = ({ status }) => {
  const icons = {
    pending: <Text color="gray">○</Text>,
    running: <Text color="yellow">◉</Text>,
    completed: <Text color="green">✓</Text>,
    failed: <Text color="red">✗</Text>,
  };
  return icons[status];
};
```

## Development

```bash
# Run in watch mode (auto-reload on changes)
npm run dev

# Run directly with tsx
tsx cli.tsx
```

## Installation Requirements

- **Node.js**: >= 20.0.0
- **React**: >= 19.0.0
- **Ink**: 6.6.0
- **tsx**: 4.19.0 (for running .tsx files)

## Next Steps

To extend this prototype:

1. **Add interactivity** - Use `useInput` hook for keyboard controls
2. **Real data** - Connect to actual workflow data
3. **Auto-refresh** - Use `useEffect` with polling or WebSocket
4. **Debug controls** - Add pause/resume/step-through features
5. **Error details** - Expand failed nodes to show error messages

## Resources

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Ink on NPM](https://www.npmjs.com/package/ink)
- [React Documentation](https://react.dev)

## License

ISC

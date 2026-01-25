# Ink Text Component: Color Rendering and Styling Research

**Documentation Sources:**
- [Ink GitHub Repository](https://github.com/vadimdemedes/ink/tree/main/packages/ink)
- [Chalk Terminal Styling](https://github.com/chalk/chalk)
- [ansi-styles](https://github.com/chalk/ansi-styles)

**Local Package Versions:**
- `ink@6.6.0`
- `chalk@5.6.2`
- `ansi-styles@6.2.3`

---

## 1. Text Color Prop

### 1.1 All Available Color Values

Ink uses [chalk](https://github.com/chalk/chalk) under the hood, supporting all chalk color functionality.

#### Named Colors (Basic 16)

```jsx
import { Text } from 'ink';

// Basic colors
<Text color="black">Black</Text>
<Text color="red">Red</Text>
<Text color="green">Green</Text>
<Text color="yellow">Yellow</Text>
<Text color="blue">Blue</Text>
<Text color="magenta">Magenta</Text>
<Text color="cyan">Cyan</Text>
<Text color="white">White</Text>

// Bright variants (also have aliases: gray, grey)
<Text color="blackBright">Dimmed</Text>
<Text color="redBright">Bright Red</Text>
<Text color="greenBright">Bright Green</Text>
<Text color="yellowBright">Bright Yellow</Text>
<Text color="blueBright">Bright Blue</Text>
<Text color="magentaBright">Bright Magenta</Text>
<Text color="cyanBright">Bright Cyan</Text>
<Text color="whiteBright">Bright White</Text>

// Gray aliases
<Text color="gray">Gray Text</Text>
<Text color="grey">Grey Text</Text>
```

#### Hex Colors

```jsx
import { Text } from 'ink';

// Full hex color support (requires Truecolor terminal)
<Text color="#005cc5">GitHub Blue</Text>
<Text color="#FF0000">Pure Red</Text>
<Text color="#00FF00">Pure Green</Text>
<Text color="#DEADED">Custom Color</Text>
```

#### RGB Colors

```jsx
import { Text } from 'ink';

// RGB color support
<Text color="rgb(232, 131, 136)">Soft Red</Text>
<Text color="rgb(0, 255, 0)">Pure Green RGB</Text>
<Text color="rgb(15, 100, 204">Custom RGB</Text>
```

#### ANSI 256 Colors

```jsx
import { Text } from 'ink';

// ANSI 256 color palette (0-255)
<Text color="ansi(196)">Red (256)</Text>
<Text color="ansi(46)">Green (256)</Text>
<Text color="ansi(226)">Yellow (256)</Text>
```

### 1.2 Status Indicator Colors (Matching STATUS_SYMBOLS Pattern)

Based on the STATUS_SYMBOLS from `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`:

```typescript
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};
```

#### Recommended Status Color Mapping

```jsx
import { Text } from 'ink';

// Idle state - neutral gray
<Text color="gray">○ idle</Text>
<Text color="grayBright">○ idle (brighter)</Text>

// Running state - active cyan or yellow
<Text color="cyan">◐ running</Text>
<Text color="yellow">◐ running</Text>

// Completed state - success green
<Text color="green">✓ completed</Text>
<Text color="greenBright">✓ completed (bright)</Text>

// Failed state - error red
<Text color="red">✗ failed</Text>
<Text color="redBright">✗ failed (bright)</Text>

// Cancelled state - warning yellow or dimmed gray
<Text color="yellow">⊘ cancelled</Text>
<Text color="gray" dimColor>⊘ cancelled</Text>
```

#### Complete Status Component Example

```jsx
import React from 'react';
import { Text } from 'ink';

interface StatusTextProps {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  label?: string;
}

const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  cancelled: 'yellow',
};

export const StatusText: React.FC<StatusTextProps> = ({ status, label }) => {
  const symbol = STATUS_SYMBOLS[status] || '?';
  const color = STATUS_COLORS[status] || 'white';

  return (
    <Text color={color}>
      {symbol} {label || status}
    </Text>
  );
};

// Usage
<StatusText status="idle" label="Waiting for input" />
<StatusText status="running" label="Processing workflow" />
<StatusText status="completed" label="Workflow finished" />
<StatusText status="failed" label="Error occurred" />
<StatusText status="cancelled" label="User cancelled" />
```

---

## 2. Text Styling Props

### 2.1 Available Style Modifiers

All style props are boolean values (default: `false`):

```jsx
import { Text } from 'ink';

// Bold text
<Text bold>Bold text</Text>

// Dimmed color (reduced brightness/opacity)
<Text color="red" dimColor>Dimmed red</Text>

// Italic text (not widely supported in terminals)
<Text italic>Italic text</Text>

// Underlined text (not widely supported)
<Text underline>Underlined text</Text>

// Inverse (swap foreground and background colors)
<Text inverse color="yellow">Inversed yellow</Text>

// Strikethrough text (not widely supported)
<Text strikethrough>Struck through</Text>
```

### 2.2 Combining Multiple Styles

```jsx
import { Text } from 'ink';

// Combine multiple styles on a single element
<Text bold underline color="cyan">
  Bold, underlined cyan text
</Text>

// Style combinations for different states
<Text bold color="green">✓ Success</Text>
<Text bold color="red">✗ Error</Text>
<Text bold color="yellow" dimColor>⚠ Warning</Text>

// All styles combined
<Text bold italic underline strikethrough inverse color="magenta">
  Everything at once
</Text>
```

### 2.3 Status-Specific Style Combinations

```jsx
import { Text } from 'ink';

// Success - bold green
<Text bold color="green">✓ completed</Text>

// Error - bold red
<Text bold color="red">✗ failed</Text>

// Warning - bold yellow
<Text bold color="yellow">⚠ warning</Text>

// Info - bold cyan
<Text bold color="cyan">ⓘ info</Text>

// Dimmed/subtle - gray with dimColor
<Text color="gray" dimColor>○ idle</Text>

// In-progress - cyan (no bold needed, color is distinctive)
<Text color="cyan">◐ running</Text>
```

---

## 3. Color Modules in Ink

### 3.1 Color Modifiers Available

Ink uses chalk internally, which provides the following color modifier methods:

#### Foreground Color Modifiers

```javascript
// Basic colors
chalk.black
chalk.red
chalk.green
chalk.yellow
chalk.blue
chalk.magenta
chalk.cyan
chalk.white

// Bright variants
chalk.blackBright  // alias: gray, grey
chalk.redBright
chalk.greenBright
chalk.yellowBright
chalk.blueBright
chalk.magentaBright
chalk.cyanBright
chalk.whiteBright
```

#### Background Color Modifiers

```javascript
// Background colors (prefixed with bg)
chalk.bgBlack
chalk.bgRed
chalk.bgGreen
chalk.bgYellow
chalk.bgBlue
chalk.bgMagenta
chalk.bgCyan
chalk.bgWhite

// Bright background variants
chalk.bgBlackBright  // alias: bgGray, bgGrey
chalk.bgRedBright
chalk.bgGreenBright
chalk.bgYellowBright
chalk.bgBlueBright
chalk.bgMagentaBright
chalk.bgCyanBright
chalk.bgWhiteBright
```

#### Advanced Color Models

```javascript
// RGB colors
chalk.rgb(255, 0, 0)        // Red
chalk.rgb(0, 255, 0)        // Green
chalk.rgb(0, 0, 255)        // Blue

// Hex colors
chalk.hex('#FF0000')        // Red
chalk.hex('#00FF00')        // Green
chalk.hex('#0000FF')        // Blue

// ANSI 256 colors
chalk.ansi256(196)          // Red from 256 palette
chalk.ansi256(46)           // Green from 256 palette
```

### 3.2 Hex/RGB Color Support

Ink supports full Truecolor (16 million colors) via chalk:

```jsx
import { Text } from 'ink';

// Hex color examples
<Text color="#005cc5">GitHub Blue</Text>
<Text color="#FF6B6B">Soft Red</Text>
<Text color="#4ECDC4">Teal</Text>
<Text color="#FFE66D">Warm Yellow</Text>

// RGB color examples
<Text color="rgb(255, 107, 107)">Soft Red RGB</Text>
<Text color="rgb(78, 205, 196)">Teal RGB</Text>
<Text color="rgb(255, 230, 109)">Warm Yellow RGB</Text>

// Background hex/rgb colors
<Text backgroundColor="#FF0000" color="white">
  White on Red
</Text>
<Text backgroundColor="rgb(0, 128, 0)" color="white">
  White on Green
</Text>
```

#### Converting Between Color Formats

```javascript
import chalk from 'chalk';

// Chalk provides conversion utilities
const ansi256 = chalk.rgbToAnsi256(255, 0, 0);      // RGB to 256
const rgb = chalk.hexToRgb('#FF0000');              // Hex to RGB array

// Usage in Ink
<Text color={`ansi(${ansi256})`}>Via ANSI 256</Text>
<Text color={`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`}>Via RGB</Text>
```

---

## 4. Terminal Color Compatibility

### 4.1 Color Support Levels

Chalk (and Ink) auto-detects terminal color support via `chalk.level`:

| Level | Description                          | Colors Available |
|-------|--------------------------------------|------------------|
| `0`   | All colors disabled                  | None             |
| `1`   | Basic color support                  | 16 colors        |
| `2`   | 256 color palette support            | 256 colors       |
| `3`   | Truecolor support (16 million colors)| 16,777,216 colors |

### 4.2 Which Terminals Support Colors

#### Modern Terminals with Full Truecolor Support
- **Windows Terminal** (recommended over cmd.exe)
- **iTerm2** (macOS)
- **GNOME Terminal** (Linux)
- **Alacritty** (cross-platform)
- **Kitty** (cross-platform)
- **WezTerm** (cross-platform)
- **VS Code integrated terminal**
- **JetBrains IDEs integrated terminal**

#### Terminals with 256 Color Support
- **Terminal.app** (macOS default)
- **PuTTY** (with configuration)
- **Most Linux terminal emulators**

#### Basic 16-Color Support
- **cmd.exe** (Windows - not recommended)
- **Older terminal emulators**

### 4.3 Fallback Behavior for Non-Color Terminals

Ink/chalk automatically downsamples colors to match terminal capabilities:

```jsx
import { Text } from 'ink';

// Truecolor terminal: Shows exact #FF6B6B
// 256-color terminal: Finds closest match in 256 palette
// 16-color terminal: Maps to basic red (ANSI 31)
// No color: Shows plain text
<Text color="#FF6B6B">Soft Red</Text>

// Automatic fallback examples
<Text color="rgb(255, 136, 0)">Orange</Text>
// Level 3: Shows exact RGB(255, 136, 0)
// Level 2: Maps to closest 256 color (209 or similar)
// Level 1: Maps to basic yellow or red
// Level 0: No color (plain text)
```

#### Manual Color Level Control

```jsx
import { Text } from 'ink';
import { Chalk } from 'chalk';

// Create a custom chalk instance with specific color level
const customChalk = new Chalk({ level: 1 });  // Force 16 colors only

// Or disable colors completely
const noColorChalk = new Chalk({ level: 0 }); // Force no colors
```

#### Environment Variable Overrides

Users can force color behavior:

```bash
# Force enable color (level 1, 2, or 3)
FORCE_COLOR=1 my-cli    # Basic colors
FORCE_COLOR=2 my-cli    # 256 colors
FORCE_COLOR=3 my-cli    # Truecolor

# Force disable colors
FORCE_COLOR=0 my-cli

# Command line flags (via supports-color)
my-cli --color          # Auto-detect
my-cli --no-color       # Disable
my-cli --color=256      # Force 256 colors
my-cli --color=16m      # Force truecolor
```

---

## 5. Practical Examples for Workflow Tree Debugger

### 5.1 Tree Node Status Component

```jsx
import React from 'react';
import { Text } from 'ink';

// From tree-debugger.ts STATUS_SYMBOLS
const STATUS_SYMBOLS: Record<string, string> = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

interface TreeNodeProps {
  name: string;
  status: keyof typeof STATUS_SYMBOLS;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'idle':
      return 'gray';
    case 'running':
      return 'cyan';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    case 'cancelled':
      return 'yellow';
    default:
      return 'white';
  }
};

export const TreeNode: React.FC<TreeNodeProps> = ({ name, status }) => {
  const symbol = STATUS_SYMBOLS[status] || '?';
  const color = getStatusColor(status);
  const isDimmed = status === 'idle';

  return (
    <Text color={color} dimColor={isDimmed}>
      {symbol} {name} [{status}]
    </Text>
  );
};
```

### 5.2 Tree Structure with Colored Status

```jsx
import React from 'react';
import { Text, Box } from 'ink';

interface WorkflowNode {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  children?: WorkflowNode[];
}

const STATUS_COLORS = {
  idle: 'gray',
  running: 'cyan',
  completed: 'green',
  failed: 'red',
  cancelled: 'yellow',
};

const STATUS_SYMBOLS = {
  idle: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘',
};

const TreeBranch: React.FC<{
  node: WorkflowNode;
  prefix?: string;
  isLast?: boolean;
}> = ({ node, prefix = '', isLast = true }) => {
  const statusColor = STATUS_COLORS[node.status];
  const symbol = STATUS_SYMBOLS[node.status];
  const connector = isLast ? '└── ' : '├── ';

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={statusColor}>
          {prefix}{connector}{symbol} {node.name} [{node.status}]
        </Text>
      </Box>

      {node.children && node.children.map((child, index) => (
        <TreeBranch
          key={child.id}
          node={child}
          prefix={prefix + (isLast ? '    ' : '│   ')}
          isLast={index === node.children!.length - 1}
        />
      ))}
    </Box>
  );
};

// Usage
<TreeBranch node={rootNode} />
```

### 5.3 Log Level Colors

```jsx
import React from 'react';
import { Text } from 'ink';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntryProps {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

const LOG_COLORS: Record<LogLevel, string> = {
  info: 'cyan',
  warn: 'yellow',
  error: 'red',
  debug: 'gray',
};

const LOG_SYMBOLS: Record<LogLevel, string> = {
  info: 'ⓘ',
  warn: '⚠',
  error: '✗',
  debug: '⚙',
};

export const LogEntry: React.FC<LogEntryProps> = ({ level, message, timestamp }) => {
  const color = LOG_COLORS[level];
  const symbol = LOG_SYMBOLS[level];

  return (
    <Text>
      <Text color="gray">[{timestamp.toISOString()}]</Text>{' '}
      <Text bold color={color}>{symbol} {level.toUpperCase()}</Text>{' '}
      <Text>{message}</Text>
    </Text>
  );
};
```

### 5.4 Progress Bar with Color States

```jsx
import React from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  current: number;
  total: number;
  status?: 'pending' | 'in-progress' | 'completed' | 'failed';
}

const STATUS_COLORS = {
  pending: 'gray',
  'in-progress': 'cyan',
  completed: 'green',
  failed: 'red',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  status = 'pending'
}) => {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 20);
  const color = STATUS_COLORS[status];

  return (
    <Box>
      <Text color={color} bold>
        {[{ length: filled }].fill('▰').join('')}
      </Text>
      <Text dimColor color={color}>
        {[{ length: 20 - filled }].fill('▱').join('')}
      </Text>
      <Text> {percentage}%</Text>
    </Box>
  );
};
```

---

## 6. Quick Reference

### 6.1 Named Colors (16-color palette)

```
Basic:        Bright:
black         blackBright (gray, grey)
red           redBright
green         greenBright
yellow        yellowBright
blue          blueBright
magenta       magentaBright
cyan          cyanBright
white         whiteBright
```

### 6.2 Style Modifiers

```
bold          - Make text bold
dimColor      - Reduce brightness/opacity
italic        - Italic text (limited support)
underline     - Underline text (limited support)
inverse       - Swap foreground/background
strikethrough - Strike through text (limited support)
```

### 6.3 Color Formats

```
Named:        color="green"
Hex:          color="#00FF00"
RGB:          color="rgb(0, 255, 0)"
ANSI 256:     color="ansi(46)"
```

### 6.4 Recommended Status Colors

```
idle:         gray + dimColor
running:      cyan (no bold needed)
completed:    green + bold
failed:       red + bold
cancelled:    yellow + bold
info/debug:   cyan
warning:      yellow + bold
error:        red + bold
```

---

## 7. Implementation Notes

1. **Color detection is automatic** - Ink uses `supports-color` to detect terminal capabilities
2. **Graceful degradation** - Colors automatically downsample to match terminal support
3. **Always provide fallbacks** - Test with `FORCE_COLOR=0` to ensure readability without colors
4. **Use bold for emphasis** - Bold works on more terminals than italic/underline/strikethrough
5. **Gray/dimColor for subtlety** - Perfect for idle states, timestamps, and secondary information
6. **Cyan for active states** - Less aggressive than yellow, more visible than gray
7. **Green/red for success/error** - Follows universal color conventions
8. **Yellow for warnings** - High visibility without the severity of red

---

**Sources:**
- [Ink GitHub - Text Component](https://github.com/vadimdemedes/ink#text)
- [Chalk Documentation](https://github.com/chalk/chalk)
- [ansi-styles Documentation](https://github.com/chalk/ansi-styles)
- Local packages: `ink@6.6.0`, `chalk@5.6.2`, `ansi-styles@6.2.3`
- STATUS_SYMBOLS pattern from `/home/dustin/projects/groundswell/src/debugger/tree-debugger.ts`

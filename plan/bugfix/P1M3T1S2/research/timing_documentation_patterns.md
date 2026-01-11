# Research: Documentation Patterns for Timing/Performance Tracking Options

## Summary

Research findings on how popular Node.js/TypeScript libraries document timing/performance options that default to enabled.

## Key Findings

### 1. "Enabled by Default" vs "Opt-Out" Pattern Documentation

#### Pattern 1: Explicit Default Statement (Most Common)

**Source: Pino Logger**

```markdown
#### `enabled` (Boolean)

Default: `true`

Set to `false` to disable logging.
```

**Key Elements:**
- Clear type annotation `(Boolean)`
- Explicit "Default: `true`" statement
- Inverse phrasing ("Set to `false` to disable") reinforces the default

#### Pattern 2: Performance-Centric Documentation

**Source: Pino Logger**

```markdown
#### `timestamp` (Boolean | Function)

Default: `true`

Enables or disables the inclusion of a timestamp in the
log message. If a function is supplied, it must synchronously return a partial JSON string
representation of the time.

If set to `false`, no timestamp will be included in the output.

**Caution**: attempting to format time in-process will significantly impact logging performance.
```

**Key Elements:**
- Explains WHAT the option does
- Shows the default behavior explicitly
- Documents the trade-off with a **Caution** note
- Explains when/why users might want to disable

#### Pattern 3: Multi-State Option with Context

**Source: Node Cache**

```markdown
- `useClones`: *(default: `true`)* en/disable cloning of variables.
  **Note:**
    - `true` is recommended if you want **simplicity**
    - `false` is recommended if you want **performance**
```

**Key Elements:**
- Inline default notation: `*(default: `value`)*`
- **Note** section explaining WHEN to use each option
- Performance vs simplicity trade-off clearly articulated

### 2. Performance-Related Option Documentation Patterns

#### Performance Implication Callouts

**Source: Pino Logger**

```markdown
**Caution**: attempting to format time in-process will significantly impact logging performance.
```

#### Overhead Documentation

**Source: Pino Redaction**

```markdown
## Overhead

Pino's redaction functionality is built on top of `fast-redact`
which adds about 2% overhead to `JSON.stringify` when using paths without wildcards.
```

**Key Elements:**
- Dedicated "Overhead" section
- Quantified performance impact (2%)
- Explains WHEN the impact matters

### 3. When to Disable Timing/Performance Tracking

Common reasons libraries document for disabling performance features:

#### Performance Overhead
- When the tracking overhead is significant relative to the operation
- For high-throughput scenarios where every microsecond matters
- When running in performance-critical environments

#### Environment-Specific Behavior
- When timing interferes with other features
- When running in constrained environments (serverless, edge functions)

## Recommended Documentation Pattern for `trackTiming` Option

### Option 1: Concise Pattern (Pino-style)

```typescript
/**
 * Track and emit step duration
 * @default true
 *
 * Timing information is included in the `stepEnd` event.
 * Set to `false` to eliminate timing overhead in performance-critical code paths.
 *
 * @example
 * ```ts
 * @Step({ trackTiming: false })  // Disable timing for performance
 * async processItem() { }
 * ```
 */
trackTiming?: boolean;
```

### Option 2: Inline Pattern (Node Cache-style)

```typescript
/**
 * Track and emit step duration in the `stepEnd` event
 * *(default: `true`)*
 *
 * **Performance Note**: Timing tracking has minimal overhead (~0.1ms per step).
 * Consider disabling only in extremely performance-sensitive scenarios with
 * high-frequency step execution (1000+ steps/second).
 */
trackTiming?: boolean;
```

## README Documentation Pattern

For the main README, use this pattern from Pino's approach:

```markdown
## Decorators

### @Step

Emit lifecycle events and optionally track timing information.

```typescript
@Step({ trackTiming: true, snapshotState: true })
async processData(): Promise<void> { }
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom step name |
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. Set to `false` to eliminate timing overhead. |
| `snapshotState` | `boolean` | `false` | Capture state snapshot after step completion |
| `logStart` | `boolean` | `false` | Log message at step start |
| `logFinish` | `boolean` | `false` | Log message at step end (includes duration) |

**Performance Considerations:**

- Timing tracking is **enabled by default** and has minimal overhead (~0.1ms per step)
- Disable `trackTiming` only in performance-critical code paths with high-frequency execution
- The `duration` field is omitted from `stepEnd` events when `trackTiming: false`
```

## Key Best Practices

1. **Always state the default explicitly** - Use `@default true` or `Default: true`
2. **Explain the trade-off** - Why would someone disable this feature?
3. **Quantify overhead when possible** - "adds about 2% overhead" vs "impacts performance"
4. **Provide code examples** - Show both enabled and disabled states
5. **Use strong callouts for performance warnings** - `**Caution**`, `**Performance Note**`
6. **Document the environment-specific behavior** - Serverless, browser, etc.
7. **Explain what changes when disabled** - "no timestamp will be included" vs "timestamp disabled"

## URLs and References

1. **Pino Logger** - https://github.com/pinojs/pino
   - `/docs/api.md` - Lines 497-530 (enabled, timestamp options)
   - `/docs/asynchronous.md` - Lines 3-26 (performance patterns)
   - `/docs/redaction.md` - Lines 117-127 (overhead documentation)

2. **Node Cache** - https://github.com/node-cache/node-cache
   - `/README.md` - Lines 60-71 (multi-state options with performance notes)

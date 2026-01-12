# Decorator Documentation Patterns Research

## External Best Practices for Documenting Default Values

### 1. JSDoc @default Tag Pattern (Industry Standard)

The most common and standardized pattern for documenting default values:

```typescript
/**
 * If true, tracks execution timing for the step.
 * @default true
 */
trackTiming?: boolean;

/**
 * If true, logs a message when the step finishes.
 * @default false
 */
logFinish?: boolean;
```

### 2. In-Description Pattern

Many libraries include default values directly in the description:

```typescript
/**
 * Track and emit step duration (defaults to true).
 */
trackTiming?: boolean;

/**
 * Capture state snapshot after step completion (disabled by default).
 */
snapshotState?: boolean;
```

### 3. Table Format with Default Column

Used in user-facing documentation (README, API docs):

```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackTiming` | `boolean` | `true` | Include duration in stepEnd event |
| `snapshotState` | `boolean` | `false` | Capture state snapshot |
```

### 4. Inline Comment Pattern

```typescript
export interface StepOptions {
  name?: string;              // defaults to method name
  snapshotState?: boolean;    // defaults to false
  trackTiming?: boolean;      // defaults to true
  logStart?: boolean;         // defaults to false
  logFinish?: boolean;        // defaults to false
}
```

## Communicating True vs False Defaults

### For Options Defaulting to TRUE

```typescript
/**
 * Track execution timing and emit duration in stepEnd events.
 * Enabled by default. Set to false to eliminate timing overhead.
 * @default true
 */
trackTiming?: boolean;
```

Key phrases:
- "Enabled by default"
- "Set to false to disable"
- "Set to false to eliminate overhead"

### For Options Defaulting to FALSE

```typescript
/**
 * Capture state snapshot after step completion.
 * Disabled by default to minimize overhead.
 * @default false
 */
snapshotState?: boolean;
```

Key phrases:
- "Disabled by default"
- "Set to true to enable"
- "Disabled to minimize overhead"

## Examples from Popular Libraries

### TypeScript @types/node

```typescript
/**
 * If true, a diagnostic report is generated on uncaught exception.
 * @default false
 */
reportOnUncaughtException: boolean;

/**
 * Indicates whether half-opened TCP connections are allowed.
 * @default false
 */
allowHalfOpen?: boolean;
```

### Zod Validation Library

```typescript
/**
 * @default "insensitive"
 */
case?: "sensitive" | "insensitive";
```

### Benchmark Libraries

```typescript
/**
 * Time needed for running a benchmark task (milliseconds)
 * @default 500
 */
time?: number;
```

## Recommended Patterns for Groundswell PRD

Based on external best practices and the codebase style, here are recommended patterns:

### Pattern 1: Inline Comment (Simplest)

```typescript
export interface StepOptions {
  name?: string;              // default: method name
  snapshotState?: boolean;    // default: false
  trackTiming?: boolean;      // default: true
  logStart?: boolean;         // default: false
  logFinish?: boolean;        // default: false
}
```

### Pattern 2: JSDoc Comment (Most Complete)

```typescript
/**
 * Configuration options for the @Step decorator
 */
export interface StepOptions {
  /** Custom step name (default: method name) */
  name?: string;
  /** Capture state snapshot after step completion (default: false) */
  snapshotState?: boolean;
  /** Track and emit step duration (default: true) */
  trackTiming?: boolean;
  /** Log message at step start (default: false) */
  logStart?: boolean;
  /** Log message at step end (default: false) */
  logFinish?: boolean;
}
```

### Pattern 3: Description Table After Interface (Most Comprehensive)

```typescript
export interface StepOptions {
  name?: string;
  snapshotState?: boolean;
  trackTiming?: boolean;
  logStart?: boolean;
  logFinish?: boolean;
}

/*
 * Default values:
 * | Option | Default | Description |
 * |--------|---------|-------------|
 * | name | method name | Custom step name |
 * | snapshotState | false | Capture state snapshot |
 * | trackTiming | true | Track and emit step duration |
 * | logStart | false | Log at step start |
 * | logFinish | false | Log at step end |
 */
```

## Best Practices Summary

1. **Always include the default value** for optional boolean parameters
2. **Be explicit about true vs false** - avoid ambiguity
3. **Explain the implications** of changing the default (performance, overhead, etc.)
4. **Use consistent wording** across all options
5. **Follow TypeScript conventions** (JSDoc @default tag for code, tables for user docs)
6. **For boolean options**, explain WHY one might want to disable an enabled-by-default feature

## Additional Resources

- JSDoc Documentation: https://jsdoc.app/
- TypeScript Deep Dive: https://basarat.gitbook.io/typescript/
- Angular Style Guide: https://angular.io/guide/styleguide

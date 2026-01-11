# Research: TypeScript Decorator Documentation Best Practices

## Summary

Comprehensive guide on best practices for documenting TypeScript decorator options in README.md files, with specific application to Groundswell's @Step decorator.

## Key Findings

### 1. Add a Dedicated "Default" Column (Top Priority)

**Current Groundswell pattern:**
```markdown
| Option | Type | Description |
|--------|------|-------------|
| `trackTiming` | `boolean` | Track and emit step duration |
```

**Recommended improvement:**
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackTiming` | `boolean` | `true` | Track and emit step duration |
```

**Why:** Makes defaults immediately visible, reduces cognitive load, enables quick scanning.

### 2. Document Default Behavior Explicitly

Add a "Default Behavior" section before showing options:

```markdown
#### Default Behavior

Without any options, `@Step()` emits `stepStart` and `stepEnd` events with automatic timing tracking.

```typescript
@Step()  // All defaults: trackTiming=true, snapshotState=false
async basicStep(): Promise<void> {}
```
```

### 3. Show Progressive Code Examples

Demonstrate increasing complexity:
- **Level 1**: Default behavior (`@Step()` with no options)
- **Level 2**: Single option override (`@Step({ trackTiming: false })`)
- **Level 3**: Multiple options combined (`@Step({ trackTiming: true, snapshotState: true })`)

## Groundswell-Specific Examples

### Files Analyzed

- `/home/dustin/projects/groundswell/docs/workflow.md` (lines 114-244)
- `/home/dustin/projects/groundswell/README.md` (lines 114-131)
- `/home/dustin/projects/groundswell/src/types/decorators.ts` (lines 1-26)
- `/home/dustin/projects/groundswell/examples/examples/02-decorator-options.ts` (lines 1-20)

### Current State

README already follows many best practices:
- Progressive examples in Quick Start section
- Clear code formatting with TypeScript syntax highlighting
- Code examples are executable and match the implementation

**Improvement needed:** Add "Default" column to decorator options table and explicitly document default behavior.

## Recommended Template for README Updates

```markdown
## Decorators

### @Step

Emit lifecycle events and track step execution timing.

**Default Behavior**: Without any options, `@Step()` automatically tracks timing information.

```typescript
@Step()  // Timing tracked by default
async processData(): Promise<void> { }
```

**Configuration Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom step name |
| `trackTiming` | `boolean` | `true` | Include duration in `stepEnd` event. Set to `false` to eliminate timing overhead. |
| `snapshotState` | `boolean` | `false` | Capture state snapshot after step completion |
| `logStart` | `boolean` | `false` | Log message at step start |
| `logFinish` | `boolean` | `false` | Log message at step end (includes duration) |

**Examples**:

```typescript
// Default behavior - timing tracked automatically
@Step()
async basicStep(): Promise<void> { }

// Disable timing for performance-critical code
@Step({ trackTiming: false })
async highFrequencyStep(): Promise<void> { }

// Full configuration
@Step({ trackTiming: true, snapshotState: true, logStart: true })
async monitoredStep(): Promise<void> { }
```

**Performance Note**: Timing tracking has minimal overhead. Disable `trackTiming` only in performance-critical code paths with high-frequency execution.
```

## Implementation Checklist

For updating Groundswell documentation:

- [ ] Add "Default" column to @Step options table
- [ ] Add "Default" column to @Task options table (if applicable)
- [ ] Add "Default" column to @ObservedState options table (if applicable)
- [ ] Add "Default Behavior" sections before options tables
- [ ] Add type definition sections (optional)
- [ ] Update inline comments in examples
- [ ] Validate against source code

## External URLs for Further Reference

While not accessed during research, these are excellent references:

5. **class-validator** - https://github.com/typestack/class-validator
   - Known for extensive decorator options documentation

6. **TypeORM** - https://typeorm.io/#/decorator-reference
   - Known for entity and column decorator options

7. **NestJS** - https://docs.nestjs.com/custom-decorators
   - Known for clean decorator API design

8. **Angular Style Guide** - https://angular.io/guide/styleguide#style-05-12
   - Known for consistent decorator documentation

9. **InversifyJS** - https://github.com/inversify/InversifyJS
   - Known for dependency injection decorators

## Confidence Score

**9/10** - Based on thorough analysis of Groundswell codebase and established documentation patterns from Pino and Node Cache libraries.

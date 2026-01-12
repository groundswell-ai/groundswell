# Decorator Documentation Quick Reference

**Purpose:** Fast reference for documenting TypeScript decorator options in README.md files

---

## Recommended Table Format

```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom name for logs/events |
| `enabled` | `boolean` | `true` | Enable the feature |
| `callback` | `function` | `undefined` | Optional callback |
```

**Key Points:**
- Column order: Option → Type → Default → Description
- Use backticks for all identifiers
- Show `undefined` for optional with no default
- Show literal values for primitives (`true`, `false`, `'string'`)

---

## Code Example Pattern

```typescript
// Level 1: Default behavior
@Decorator()
async basicMethod(): Promise<void> {}

// Level 2: Single option
@Decorator({ optionName: 'value' })
async configuredMethod(): Promise<void> {}

// Level 3: Multiple options
@Decorator({
  optionName: 'value',
  enabled: true
})
async fullConfigured(): Promise<void> {}
```

---

## Groundswell Specific Examples

### @Step Decorator

**Current (to be improved):**
```markdown
| Option | Type | Description |
|--------|------|-------------|
| `trackTiming` | `boolean` | Track and emit step duration |
```

**Recommended:**
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackTiming` | `boolean` | `true` | Track and emit step duration |
```

### @Task Decorator

**Current:**
```markdown
| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Custom task name |
| `concurrent` | `boolean` | Run returned workflows in parallel |
```

**Recommended:**
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | method name | Custom task name for logs/events |
| `concurrent` | `boolean` | `false` | Run returned workflows in parallel |
```

### @ObservedState Decorator

**Current:**
```markdown
| Option | Type | Description |
|--------|------|-------------|
| `hidden` | `boolean` | Exclude field from snapshots entirely |
| `redact` | `boolean` | Show value as `'***'` in snapshots |
```

**Recommended:**
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hidden` | `boolean` | `false` | Exclude field from snapshots entirely |
| `redact` | `boolean` | `false` | Show value as `'***'` in snapshots |
```

---

## Inline Documentation Pattern

Use comments for option explanations in code:

```typescript
@Step({
  name: 'DataProcessing',      // Custom name for logs/events
  trackTiming: true,            // Emits stepEnd event with duration
  snapshotState: true,          // Captures @ObservedState fields
  logStart: true,               // Logs "Starting step: DataProcessing"
  logFinish: true,              // Logs "Completed step: DataProcessing"
})
async processData(): Promise<void> {}
```

---

## Common Default Values

| Type | Default | When to Use |
|------|---------|-------------|
| `boolean` | `false` | Disabled by default (safer) |
| `boolean` | `true` | Enabled by default (expected behavior) |
| `string` | `'default-value'` | Explicit string in backticks |
| `number` | `0` | Numeric default |
| `object` | `undefined` | Optional, no default |
| `function` | `undefined` | Optional callback |
| `array` | `[]` | Empty array |
| method name | `method name` | Use method name as default (not in backticks) |

---

## File Locations

- **Main Documentation:** `/home/dustin/projects/groundswell/docs/workflow.md`
- **Type Definitions:** `/home/dustin/projects/groundswell/src/types/decorators.ts`
- **Examples:** `/home/dustin/projects/groundswell/examples/examples/02-decorator-options.ts`
- **Main README:** `/home/dustin/projects/groundswell/README.md`

---

## Validation Checklist

When updating decorator documentation:

- [ ] Added "Default" column to all tables
- [ ] Defaults are explicit (not hidden in descriptions)
- [ ] All options use backticks for code formatting
- [ ] Type definitions match source code
- [ ] Code examples show progressive complexity
- [ ] Inline comments explain non-obvious options
- [ ] Cross-references to related decorators
- [ ] Examples remain executable

---

## PRP Template Section

```markdown
### Documentation Update

**File:** `docs/workflow.md`

**Change:** Add Default column to @Step decorator options table

**Before:**
```markdown
| Option | Type | Description |
|--------|------|-------------|
| `trackTiming` | `boolean` | Track and emit step duration |
```

**After:**
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trackTiming` | `boolean` | `true` | Track and emit step duration |
```
```

---

**Quick Reference Version:** 1.0
**Last Updated:** 2026-01-11
**Full Research:** See `DECORATOR_DOCUMENTATION_BEST_PRACTICES.md`

# Existing Documentation Patterns Research

Based on analysis of the groundswell codebase, this document identifies established patterns for migration documentation and README updates.

---

## Summary of Findings

This research identified:
1. **Existing migration guide** for AgentResponse breaking changes
2. **Comprehensive research files** on migration guide best practices 
3. **CHANGELOG.md** format for documenting breaking changes
4. **Established template** for migration documentation

---

## 1. Migration Guide Linking Patterns

### Pattern: Direct README Integration
Found in: `/docs/migration-guide-agent-response.md`

**How migration guides are linked:**
- Direct link from the migration guide to related docs:
```markdown
### Related Documentation
- **[Agent API](agent.md)** - Full Agent documentation and API reference
- **[PRD Section 6](../PRD.md#6-agent-response-model)** - Agent Response Model specification
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and change details
- **[Type Definitions](../src/types/agent.ts)** - AgentResponse type definitions
```

### Pattern: CHANGELOG Integration
Found in: `/CHANGELOG.md`

**Format for documenting breaking changes in CHANGELOG:**
```markdown
## [0.0.2] - 2026-01-12

### Fixed

- **attachChild() parent validation**: `attachChild()` now throws an Error if you attempt to attach a child that already has a different parent. Previously, this would silently create an inconsistent tree state...

### Migration Guide for attachChild() Behavior Change

**What Changed**:
The `attachChild()` method now throws an Error if you attempt to attach a child that already has a different parent.

**Before (Buggy Pattern)**:
```typescript
// This would silently create inconsistent state
const parent1 = new Workflow({ name: 'parent1' });
const parent2 = new Workflow({ name: 'parent2' });
const child = new Workflow({ name: 'child' });

parent1.attachChild(child);  // child.parent = parent1
parent2.attachChild(child);  // BUG: child still has parent1, but parent2 thinks it's attached
```

**After (Correct Pattern)**:
```typescript
// Use detachChild() before reattaching to a new parent
const parent1 = new Workflow({ name: 'parent1' });
const parent2 = new Workflow({ name: 'parent2' });
const child = new Workflow({ name: 'child' });

parent1.attachChild(child);
parent1.detachChild(child);  // Explicitly detach first
parent2.attachChild(child);  // Now works correctly
```

**Migration Steps**:
1. Search your code for patterns of attaching the same child to multiple parents
2. Add `detachChild()` calls before reattaching to a new parent
3. Test that your workflow tree operations complete without errors
```

---

## 2. Breaking Change Documentation Patterns

### Pattern: Severity Classification
Used consistently across all documentation:

```markdown
🔴 Critical - Breaking change that requires immediate attention
🟡 Moderate - Change that may require code updates  
🟢 Minor - Change that's mostly cosmetic or API-additive
🔵 Enhancement - New feature, non-breaking
```

### Pattern: Migration Effort Estimates
Found in existing migration guide:

```markdown
**Effort**: ⏱️ ~15-30 minutes per file
| Project Size | Estimated Time | Complexity |
|--------------|---------------|------------|
| Small (<1K LOC) | ~30 minutes | Low |
| Medium (1K-10K LOC) | ~2 hours | Medium |  
| Large (>10K LOC) | ~1 day | High |
```

### Pattern: Template for Breaking Change Sections
From CHANGELOG.md and migration guide:

```markdown
### [Feature Name] Change

**Severity:** 🔴 Critical / 🟡 Moderate / 🟢 Minor
**Migration Time:** ⏱️ ~[time]
**Introduced:** v[version]

#### What Changed
[Clear description of the change]

#### Why
[Explanation of why this change was necessary. What problem does it solve? What are the benefits?]

#### Migration
##### Before (v[X.Y])
```typescript
[old code]
```

##### After (v[Z.W])
```typescript
[new code]
```

#### Migration Steps
1. [Step 1]
2. [Step 2] 
3. [Step 3]
```

---

## 3. Style and Tone Patterns

### Pattern: Professional but Accessible Tone
- Uses clear, direct language
- Explains the "why" before the "how"
- Acknowledges migration pain but focuses on benefits
- Provides realistic migration time estimates

### Pattern: Problem-Solution Format
```markdown
### The Problem
In v1.x, the `data` prop could be either an array or a single object. This caused:
- Type confusion in TypeScript
- Runtime errors when assumptions were wrong
- Inconsistent behavior across components

### The Solution
In v2.0, we split this into two clear props:
- `items` - Always an array (use `[]` for single items)
- `item` - Always a single object

### The Benefit
- Clearer TypeScript types
- Fewer runtime errors
- More predictable component behavior
```

### Pattern: Code-First Documentation
Shows concrete examples before explanations:
```markdown
## Quick Start
The `Agent.prompt()` method now returns `AgentResponse<T>` instead of `T`. You must check the response status and handle errors before accessing the data.

```typescript
// Before
const result = await agent.prompt(myPrompt);
console.log('Result:', result);

// After  
const response = await agent.prompt(myPrompt);
if (response.status === 'error') {
  throw new Error(response.error.message);
}
const result = response.data;
console.log('Result:', result);
```
```

---

## 4. Formatting Conventions

### Pattern: Consistent Section Headers
```markdown
## [Version] - [Date]

### 🎉 Highlights
- [New feature 1]

### 🔴 Breaking Changes
- **[Feature]**: [Description] ([#PR]())

### 🟡 Important Changes  
- **[Feature]**: [Description]

### 🟢 Minor Changes
- [Minor change 1]

### 🐛 Bug Fixes
- [Bug fix 1] ([#Issue]())
```

### Pattern: Code Block Conventions
```markdown
### Before (Old Pattern)
```typescript
// Descriptive comment about old approach
const oldCode = something();
```

### After (New Pattern)
```typescript
// Descriptive comment about new approach  
const newCode = somethingElse();
```
```

### Pattern: Linking Conventions
```markdown
- Internal docs: `[Agent API](agent.md)`
- External docs: `[Keep a Changelog](https://keepachangelog.com/)`
- PRs: `[#PR-number](link)`
- Issues: `[#Issue](link)`
```

### Pattern: Checklist Format
```markdown
## Migration Checklist
1. **[ ] Find all `agent.prompt()` calls**
   ```bash
   # Search for agent.prompt usage
   grep -r "agent\.prompt(" src/
   ```

2. **[ ] Update variable declarations**
   - Change variables from `const result: T` to `const response: AgentResponse<T>`

3. **[ ] Add status checking logic**
   ```typescript
   if (response.status === 'error') {
     // Handle error
   }
   ```
```

---

## 5. Established Template Structure

Based on the existing `/plan/002_6761e4b84fd1/docs/research/migration-guide-template.md`, the complete template includes:

### Required Sections:
1. **Overview** - Summary, highlights, migration effort
2. **What's New** - Positive changes before diving into breaking changes
3. **Upgrade Steps** - Step-by-step process with CLI commands
4. **Breaking Changes** - Categorized by severity with before/after examples
5. **Deprecations** - Deprecated APIs with migration paths and timelines
6. **Migration FAQ** - Common questions and answers
7. **Troubleshooting** - Common issues and solutions
8. **Need Help?** - Support resources and community links

### Optional Sections:
- **Migration Assistant** - Automated tools/codemods
- **Requirements** - Runtime and development requirements
- **Post-Migration Checklist** - Verification steps
- **Rollback Instructions** - How to revert changes

---

## Key Takeaways for New Documentation

1. **Follow the established severity indicators** (🔴🟡🟢)
2. **Provide realistic migration time estimates**
3. **Include before/after code examples** with clear explanations
4. **Link to related documentation** using consistent formatting
5. **Use the problem-solution-benefit framework**
6. **Provide step-by-step checklists** for migrations
7. **Document in both CHANGELOG.md and standalone guides**
8. **Maintain professional but accessible tone**

These patterns provide a solid foundation for creating consistent, user-friendly migration documentation that follows the established conventions of the groundswell project.

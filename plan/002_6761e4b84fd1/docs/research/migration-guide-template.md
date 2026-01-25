# Migration Guide Template

A comprehensive template for writing migration guides for breaking API changes in TypeScript/JavaScript libraries.

---

# [Library Name] v[Version] Migration Guide

**Release Date:** [Date]
**Previous Version:** v[X.Y.Z]
**New Version:** v[A.B.C]
**Status:** Stable / Release Candidate / Beta

---

## Table of Contents

- [Overview](#overview)
- [What's New](#whats-new)
- [Upgrade Steps](#upgrade-steps)
- [Breaking Changes](#breaking-changes)
- [Deprecations](#deprecations)
- [New Features](#new-features)
- [Migration FAQ](#migration-faq)
- [Troubleshooting](#troubleshooting)
- [Need Help?](#need-help)

---

## Overview

### Summary

[Brief 2-3 sentence summary of the major changes]

### Key Highlights

- 🎉 [Highlight 1]
- 🎉 [Highlight 2]
- 🎉 [Highlight 3]

### Migration Effort

| Project Size | Estimated Time | Complexity |
|--------------|---------------|------------|
| Small (<1K LOC) | ~30 minutes | Low |
| Medium (1K-10K LOC) | ~2 hours | Medium |
| Large (>10K LOC) | ~1 day | High |

---

## What's New

[This section focuses on the positive changes and benefits before diving into breaking changes]

### Feature 1: [Name]

**Why this matters:** [Explanation of the benefit]

```typescript
// Example of new feature
import { something } from 'library';

const result = something.newFeature();
```

### Feature 2: [Name]

[Description and example]

### Performance Improvements

- [Improvement 1]: [X]% faster
- [Improvement 2]: [Y]% smaller bundle
- [Improvement 3]: [Z]% fewer memory allocations

---

## Upgrade Steps

### Step 1: Pre-Migration Checklist

Before you begin, ensure you:

- [ ] Read this entire migration guide
- [ ] Back up your code (create a git branch/tag)
- [ ] Run your full test suite and record baseline results
- [ ] Check [environment requirements](#requirements)
- [ ] Review [breaking changes](#breaking-changes) summary

### Step 2: Update Dependencies

#### npm

```bash
npm install library-name@latest
```

#### yarn

```bash
yarn add library-name@latest
```

#### pnpm

```bash
pnpm update library-name@latest
```

### Step 3: Update Peer Dependencies

This version requires [dependency-name] [version-or-higher].

```bash
npm install dependency-name@version
```

### Step 4: Run the Migration Assistant (Optional)

We provide an automated migration tool to help with common changes:

```bash
npx library-name-codemod
```

[Learn more about the migration assistant](#migration-assistant)

### Step 5: Update Your Code

Follow the [Breaking Changes](#breaking-changes) section to update your code.

### Step 6: Test Your Changes

```bash
# Run tests
npm test

# Type check
npm run type-check

# Build
npm run build
```

### Step 7: Deploy to Staging

Deploy to a staging environment and verify:
- [ ] Application starts without errors
- [ ] Key user flows work correctly
- [ ] Console has no deprecation warnings
- [ ] Performance is acceptable

---

## Breaking Changes

**Summary:** [Number] breaking changes in this release.

### Quick Reference

| Change | Severity | Effort | Section |
|--------|----------|--------|---------|
| [Change 1] | 🔴 Critical | 30 min | [Link](#change-1) |
| [Change 2] | 🟡 Moderate | 1 hour | [Link](#change-2) |
| [Change 3] | 🟢 Minor | 10 min | [Link](#change-3) |

---

### Change 1: [Descriptive Title]

**Severity:** 🔴 Critical / 🟡 Moderate / 🟢 Minor
**Effort:** ⏱️ ~[time estimate]
**Affected:** [What areas of the API]

#### What Changed

[Clear description of what changed]

#### Why

[Explanation of why this change was necessary. What problem does it solve? What are the benefits?]

#### Migration

##### Before (v[X.Y.Z])

```typescript
// Show old API usage
import { OldAPI } from 'library';

const result = OldAPI.doSomething(options);
```

##### After (v[A.B.C])

```typescript
// Show new API usage
import { NewAPI } from 'library';

const result = NewAPI.doSomething(options);
```

##### What's Different

- Change 1: [Description]
- Change 2: [Description]
- Change 3: [Description]

#### Common Migration Patterns

##### Pattern 1: [When to use this pattern]

```typescript
// Code showing this pattern
```

##### Pattern 2: [When to use this pattern]

```typescript
// Code showing this pattern
```

#### See Also

- [Related Change](#related-change)
- [Documentation link]

---

### Change 2: [Descriptive Title]

[Repeat structure above for each breaking change]

---

## Deprecations

The following APIs are deprecated in this release and will be removed in v[Future Version].

### Deprecated: [API Name]

**Status:** ⚠️ Deprecated
**Removal:** v[Future Version]
**Replacement:** [New API Name]

#### Why It's Being Deprecated

[Explanation]

#### Migration Path

```typescript
// BEFORE (Deprecated)
import { OldAPI } from 'library';

// AFTER (Use this instead)
import { NewAPI } from 'library';
```

#### Timeline

- **Announced:** v[Current Version]
- **Soft Deprecation:** Warnings start in v[Version]
- **Hard Deprecation:** v[Future Version]
- **Removal:** v[Future Version + 1]

---

## New Features

[Detailed coverage of new, non-breaking features]

### Feature 1: [Name]

[Description and usage examples]

---

## Migration FAQ

### Common Questions

#### Q: Can I use v[X] and v[Y] side-by-side?

**A:** [Answer]

#### Q: Will this break my existing tests?

**A:** [Answer]

#### Q: How long will the migration take?

**A:** [Answer with estimates]

#### Q: Can I get help with the migration?

**A:** [Answer pointing to support resources]

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: [Error message or description]

**Symptom:** [What the user sees]

**Cause:** [Why it happens]

**Solution:**
```typescript
// Code showing the fix
```

#### Issue: [Another error message]

**Symptom:**

**Cause:**

**Solution:**

---

## Migration Assistant

We provide an automated migration tool to help with common code changes.

### Usage

```bash
# Install the codemod CLI
npm install -g library-name-codemod

# Run all migrations
library-name-codemod

# Run specific migration
library-name-codemod --transform rename-option

# Dry run (no changes)
library-name-codemod --dry
```

### Available Transformations

| Transform | Description | Safe to Run? |
|-----------|-------------|--------------|
| [Transform 1] | [Description] | ✅ Yes |
| [Transform 2] | [Description] | ⚠️ Review needed |

### What the Codemod Does

- [Action 1]
- [Action 2]
- [Action 3]

### What the Codemod Doesn't Do

- [Limitation 1]
- [Limitation 2]

### Manual Steps After Codemod

After running the codemod, you'll need to:
1. [Manual step 1]
2. [Manual step 2]
3. Review and test changes

---

## Requirements

### Runtime Requirements

- **Node.js:** [version] or higher
- **TypeScript:** [version] or higher (if applicable)
- **Browser:** [browser support information]

### Development Requirements

- **npm:** [version] or higher
- **yarn/pnpm:** [version] or higher (optional)

---

## Post-Migration Checklist

After completing the migration:

- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] Production build succeeds: `npm run build`
- [ ] Application runs without errors
- [ ] No deprecation warnings in console
- [ ] Performance is acceptable
- [ ] Manual testing complete

---

## Rollback Instructions

If you need to rollback:

### npm

```bash
npm install library-name@previous-version
```

### yarn

```bash
yarn add library-name@previous-version
```

Then revert any code changes you made during migration.

---

## Changelog

For a complete list of all changes, see the [full changelog](LINK_TO_CHANGELOG.md).

### Notable Changes

- [ ] [Change 1] ([#PR-number](link))
- [ ] [Change 2] ([#PR-number](link))
- [ ] [Change 3] ([#PR-number](link))

---

## Need Help?

### Documentation

- [Full Documentation](link)
- [API Reference](link)
- [Examples](link)

### Community

- [GitHub Issues](link) - Bug reports and feature requests
- [GitHub Discussions](link) - Questions and discussions
- [Discord/Slack](link) - Real-time chat
- [Stack Overflow](link) - Tag: `[tag-name]`

### Professional Support

- [Consulting Services](link)
- [Enterprise Support](link)
- [Training](link)

### Reporting Issues

If you find a bug or have a suggestion:

1. Check existing [GitHub Issues](link)
2. Create a new issue with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Minimal reproduction

---

## Acknowledgments

This release wouldn't be possible without contributions from:

- [@contributor1] - [Contribution]
- [@contributor2] - [Contribution]
- [@contributor3] - [Contribution]

And all our users who provided feedback during the pre-release period.

---

**Previous Migration Guides:**
- [v[X] to v[Y]](link)
- [v[W] to v[X]](link)

**Next Steps:**
- Read the [full documentation](link)
- Check out [examples](link)
- Join our [community](link)

---

*Last updated: [Date]*

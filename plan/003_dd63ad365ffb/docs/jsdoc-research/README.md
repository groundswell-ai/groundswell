# JSDoc/TypeScript Documentation Research

This directory contains comprehensive research on JSDoc and TypeScript documentation best practices, compiled from industry-leading open-source projects.

## Research Documents

### 1. **Comprehensive Best Practices Guide** (18 KB, 577 lines)
**File:** `jsdoc-typescript-best-practices.md`

Complete research document covering:
- Documenting default values clearly
- Indicating required vs optional parameters
- Documenting side effects
- API documentation clarity best practices

Includes:
- Real-world examples from TypeScript, Node.js, Azure SDK, and ESLint
- Common anti-patterns to avoid
- Implementation checklist
- Quick reference card for tags

**Best for:** Deep understanding and learning the "why" behind documentation patterns

### 2. **Quick Reference Guide** (8.0 KB, 326 lines)
**File:** `jsdoc-quick-reference.md`

Practical reference with:
- All parameter documentation patterns
- Return value documentation examples
- Side effect documentation patterns
- Complete real-world examples
- Common tags reference table
- Best practices summary

**Best for:** Looking up specific patterns while writing documentation

### 3. **Cheat Sheet** (3.3 KB, 131 lines)
**File:** `jsdoc-cheat-sheet.md`

Concise quick-reference with:
- Quick syntax reference
- Standard patterns (copy-paste ready)
- Best practices checklist
- Common mistakes to avoid
- Type examples
- Key source URLs

**Best for:** Quick lookups during development

## Key Findings Summary

### Default Values
- Use inline description: `@param {string} [name="default"] - Description`
- Mention defaults in parameter description when not obvious
- Document defaults in implementation: `function foo(param = defaultValue)`

### Required vs Optional
- Universal standard: square brackets `[paramName]` for optional
- TypeScript: `param?: Type` for optional parameters
- Group optional parameters at the end
- Document what happens when optional params are omitted

### Side Effects
- Document mutations clearly in main description
- Use action verbs: "modifies", "transforms", "emits"
- Mention what gets modified (params, state, resources)
- Use `@fires` or `@emits` for event emitters
- Document async side effects explicitly

### API Clarity
- Start with clear, action-oriented summary (verb-first)
- Use present tense: "gets", "sets", "creates"
- Document all parameters with types and descriptions
- Always document return types
- Explain what the function does, not just how to call it
- Provide context for why/when to use the function

## Research Sources

Analyzed code from:
- **TypeScript Compiler** - https://github.com/microsoft/TypeScript
  - `src/compiler/transformer.ts`
  - `src/compiler/types.ts`
  - `src/compiler/checker.ts`

- **Node.js Core Library** - https://github.com/nodejs/node
  - `lib/fs.js` (File System)
  - `lib/events.js` (EventEmitter)

- **Azure SDK for JavaScript** - https://github.com/Azure/azure-sdk-for-js
  - `sdk/core/core-rest-pipeline/src/pipeline.ts`

- **ESLint** - https://github.com/eslint/eslint
  - `lib/rules/no-undef.js`

## Recommended External Resources

### Official Documentation
- **TypeScript JSDoc Reference**: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **TSDoc Standard**: https://tsdoc.org/
- **JSDoc Official**: https://jsdoc.app/

### Well-Documented Libraries to Study
- Node.js Core: https://github.com/nodejs/node/tree/main/lib
- TypeScript Compiler: https://github.com/microsoft/TypeScript/tree/main/src/compiler
- Azure SDK: https://github.com/Azure/azure-sdk-for-js

### Tools
- **TypeDoc**: https://typedoc.org/ - Documentation generator
- **TSDoc**: https://tsdoc.org/ - TypeScript API documentation standard

## Usage Guide

### For Learning
Start with `jsdoc-typescript-best-practices.md` for comprehensive understanding.

### For Writing Documentation
Use `jsdoc-quick-reference.md` to find patterns and examples.

### For Quick Reference
Keep `jsdoc-cheat-sheet.md` open for syntax reminders during development.

## Common Patterns to Follow

### Simple Function
```typescript
/**
 * Creates a new user account.
 *
 * @param username - The desired username
 * @param [isAdmin=false] - Whether the user has admin privileges
 * @returns The newly created user object
 * @throws {ValidationError} If username is invalid
 */
function createUser(username: string, isAdmin: boolean = false): User {}
```

### Optional Parameter
```typescript
/**
 * @param {string} [name="Guest"] - The user's name (defaults to "Guest")
 */
function greet(name: string = "Guest"): void {}
```

### Side Effects
```typescript
/**
 * Updates the cache and triggers a re-render.
 * @param key - The cache key
 * @param value - The value to cache
 * @modifies cache
 * @fires Event#updated
 */
function updateCache(key: string, value: any): void {}
```

## Research Date

2026-01-26

---

**Total Research Content:** 1,034 lines of documentation across three comprehensive files

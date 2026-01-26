# Skills Loading Patterns from Codebase Analysis

**Research Date:** 2026-01-25
**Task:** P3.M2.T1.S4 - Implement registerMCPs() and loadSkills() methods
**Status:** Complete

---

## Executive Summary

This document extracts skills loading patterns from the existing codebase to serve as reference for implementing OpenCodeProvider.loadSkills().

---

## 1. AnthropicProvider.loadSkills() Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 538-574

### Method Signature

```typescript
async loadSkills(skills: Skill[]): Promise<void>
```

### Implementation Flow

```typescript
async loadSkills(skills: Skill[]): Promise<void> {
  // STEP 1: SDK initialization check
  if (!this.sdk) {
    throw new Error("SDK not initialized. Call initialize() first.");
  }

  // STEP 2: Handle empty skills array
  if (skills.length === 0) {
    this.skillsPrompt = '';
    return;
  }

  // STEP 3: Load each skill's SKILL.md content
  const skillContents: string[] = [];

  for (const skill of skills) {
    try {
      // Construct path to SKILL.md file
      const skillMdPath = join(skill.path, 'SKILL.md');
      const content = await readFile(skillMdPath, 'utf-8');

      // Format skill with markdown header
      skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
    } catch (error) {
      // Error wrapping pattern
      throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // STEP 4: Combine all skills with markdown separator
  this.skillsPrompt = skillContents.join('\n\n---\n\n');
}
```

### Key Patterns

1. **SDK Check First**: Always validate SDK is initialized
2. **Empty Array Handling**: Return early with empty skillsPrompt
3. **File Path Construction**: Use `join(skill.path, 'SKILL.md')`
4. **Markdown Formatting**: Use `### SkillName` header
5. **Error Wrapping**: Include skill name and path in error messages
6. **Content Combination**: Join with `\n\n---\n\n` separator

---

## 2. Private Field for Skills Storage

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Line:** 134

```typescript
/**
 * Combined skills prompt for injection into system prompts
 *
 * Stores the formatted skills content from loadSkills() for injection
 * into system prompts during execute() calls. Skills are combined with
 * markdown headers and separators.
 *
 * @internal
 */
private skillsPrompt: string = '';
```

### Clear Pattern in terminate()

```typescript
// Line 221 in terminate()
this.skillsPrompt = '';
```

---

## 3. buildSystemPromptWithSkills() Helper Pattern

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Lines:** 591-621

### Implementation

```typescript
private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
  // Case 1: No skills loaded - return base prompt unchanged
  if (!this.skillsPrompt) {
    return baseSystemPrompt ?? '';
  }

  // Case 2: No base prompt - return skills with default header
  if (!baseSystemPrompt) {
    return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
  }

  // Case 3: Both exist - combine with skills section
  return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
}
```

### Three Handling Cases

| Case | Condition | Return Value |
|------|-----------|--------------|
| No Skills | `!this.skillsPrompt` | `baseSystemPrompt ?? ''` |
| Skills Only | `!baseSystemPrompt` | Default header + skills |
| Both Exist | Both provided | Base prompt + skills section |

---

## 4. SKILL.md File Format

**Expected Location**: `{skill.path}/SKILL.md`

**Format Example**:

```markdown
# Skill Name

Skill description and capabilities.

## Usage
Instructions for when and how to use this skill.

## Examples
- Example 1
- Example 2

## Guidelines
- Guideline 1
- Guideline 2
```

---

## 5. File Reading Pattern

### Required Imports

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
```

### Path Construction

```typescript
// GOTCHA: Skill.path is directory, must join with 'SKILL.md'
const skillMdPath = join(skill.path, 'SKILL.md');
const content = await readFile(skillMdPath, 'utf-8');
```

---

## 6. Error Handling Patterns

### File Read Error Wrapping

```typescript
try {
  const content = await readFile(skillMdPath, 'utf-8');
  skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
} catch (error) {
  throw new Error(
    `Failed to load skill '${skill.name}' from ${skill.path}: ` +
    `${error instanceof Error ? error.message : 'Unknown error'}`
  );
}
```

### SDK Initialization Error

```typescript
if (!this.sdk) {
  throw new Error("SDK not initialized. Call initialize() first.");
}
```

---

## 7. Integration with execute()

**File:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`
**Line:** 296

```typescript
// In execute() method
systemPrompt: this.buildSystemPromptWithSkills(request.options.systemPrompt),
```

---

## 8. Testing Patterns

**File**: `/home/dustin/projects/groundswell/src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts`

### Mock Setup

```typescript
// Mock fs/promises for file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import('fs/promises');
```

### Test Content Fixture

```typescript
const mockSkillContent = {
  'math-expert': `# Math Expert

You are an expert mathematician capable of solving complex calculations.

## Examples
- 2 + 2 = 4
- 10 * 5 = 50`,
};
```

### Test Fixture

```typescript
const createTestSkill = (name: string, path: string): Skill => ({
  name,
  path,
});
```

### Test Cases

1. **SDK Initialization Check**: Throws if not initialized
2. **Single Skill Loading**: Reads SKILL.md, formats correctly
3. **Multiple Skills Loading**: Combines with separators
4. **Empty Skills Array**: No errors, clears skillsPrompt
5. **Error Handling**: Descriptive errors with skill context
6. **Helper Method Testing**: All three cases of buildSystemPromptWithSkills()
7. **terminate() Integration**: Clears skillsPrompt

---

## 9. OpenCode Considerations

### Key Difference

OpenCode has **no native skills API**. Skills must be loaded via system prompt injection, just like Anthropic.

### Implementation Pattern

```typescript
// OpenCodeProvider will use identical pattern
async loadSkills(skills: Skill[]): Promise<void> {
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }

  if (skills.length === 0) {
    this.skillsPrompt = '';
    return;
  }

  // Same file reading pattern as AnthropicProvider
  const skillContents: string[] = [];

  for (const skill of skills) {
    try {
      const skillMdPath = join(skill.path, 'SKILL.md');
      const content = await readFile(skillMdPath, 'utf-8');
      skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
    } catch (error) {
      throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  this.skillsPrompt = skillContents.join('\n\n---\n\n');
}
```

---

## 10. Code References

| File | Lines | Purpose |
|------|-------|---------|
| `src/providers/anthropic-provider.ts` | 538-574 | loadSkills() implementation |
| `src/providers/anthropic-provider.ts` | 591-621 | buildSystemPromptWithSkills() helper |
| `src/providers/anthropic-provider.ts` | 134 | skillsPrompt private field |
| `src/providers/anthropic-provider.ts` | 296 | Integration with execute() |
| `src/providers/anthropic-provider.ts` | 221 | Clear in terminate() |
| `src/types/sdk-primitives.ts` | 58-63 | Skill interface |
| `src/__tests__/unit/providers/anthropic-provider-loadskills.test.ts` | Full | Test patterns |

---

## 11. Quick Reference Implementation

```typescript
// Imports needed
import { readFile } from 'fs/promises';
import { join } from 'path';

// Private field (add after other private fields)
private skillsPrompt: string = '';

// Main method
async loadSkills(skills: Skill[]): Promise<void> {
  if (!this.client) {
    throw new Error("OpenCode provider not initialized. Call initialize() first.");
  }

  if (skills.length === 0) {
    this.skillsPrompt = '';
    return;
  }

  const skillContents: string[] = [];

  for (const skill of skills) {
    try {
      const skillMdPath = join(skill.path, 'SKILL.md');
      const content = await readFile(skillMdPath, 'utf-8');
      skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
    } catch (error) {
      throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  this.skillsPrompt = skillContents.join('\n\n---\n\n');
}

// Helper method
private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
  if (!this.skillsPrompt) {
    return baseSystemPrompt ?? '';
  }

  if (!baseSystemPrompt) {
    return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
  }

  return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
}

// Clear in terminate()
async terminate(): Promise<void> {
  // ... existing cleanup
  this.skillsPrompt = '';
}
```

---

**End of Skills Loading Patterns Research**

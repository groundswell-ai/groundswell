# Anthropic System Prompt Handling Research

**Research Date:** January 25, 2026
**SDK Version:** @anthropic-ai/claude-agent-sdk@0.1.77
**Task:** P2.M1.T1.S8 - Implement loadSkills() method for AnthropicProvider
**Purpose:** Document how to set system prompts in Anthropic SDK, best practices, and skill-to-system-prompt conversion

---

## Executive Summary

The Anthropic Agent SDK uses the `systemPrompt` parameter for agent instructions. Unlike OpenCode's native `/skills` API, Anthropic's SDK implements skills through system prompt injection. Skills are loaded from `SKILL.md` files and concatenated into the system prompt before query execution.

**Key Finding:** Anthropic SDK does NOT have a native skills API. Skills MUST be converted to system prompt text and passed via the `systemPrompt` option.

---

## 1. System Prompt in Anthropic SDK

### 1.1 System Prompt Configuration

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/sdk/runtimeTypes.d.ts` (lines 517-542)

```typescript
export type Options = {
    // System Prompt
    systemPrompt?: string | {
        type: 'preset';
        preset: 'claude_code';
        append?: string;
    };
    // ... other options
}
```

**Three Configuration Modes:**

1. **Direct String** - Custom system prompt
   ```typescript
   {
       systemPrompt: 'You are a helpful coding assistant.'
   }
   ```

2. **Preset with Default Claude Code Prompt** - Use built-in prompt
   ```typescript
   {
       systemPrompt: {
           type: 'preset',
           preset: 'claude_code'
       }
   }
   ```

3. **Preset with Appended Instructions** - Extend built-in prompt
   ```typescript
   {
       systemPrompt: {
           type: 'preset',
           preset: 'claude_code',
           append: 'Always explain your reasoning step by step.'
       }
   }
   ```

### 1.2 System Prompt in query() Function

**Location:** `/node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts`

```typescript
export declare function query(_params: {
    prompt: string | AsyncIterable<SDKUserMessage>;
    options?: Options;  // systemPrompt goes here
}): Query;
```

**Usage Example:**

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const q = query({
    prompt: 'What files are in the current directory?',
    options: {
        model: 'claude-sonnet-4-5-20250929',
        systemPrompt: 'You are a helpful assistant specialized in file analysis.'
    }
});

for await (const message of q) {
    if (message.type === 'result') {
        console.log('Result:', message.result);
    }
}
```

---

## 2. System Prompt Best Practices

### 2.1 Structure and Formatting

**Recommended Structure:**

```typescript
const systemPrompt = `# Role
You are a helpful AI assistant with expertise in [domain].

## Capabilities
- [Capability 1]
- [Capability 2]
- [Capability 3]

## Guidelines
1. [Guideline 1]
2. [Guideline 2]
3. [Guideline 3]

## Constraints
- [Constraint 1]
- [Constraint 2]

## Available Skills
{Skills injected here}`;
```

**Best Practices:**

1. **Start with Role Definition** - Clearly define who the AI should be
2. **Use Markdown Headers** - Organize with `#`, `##`, `###` for clarity
3. **List Capabilities** - Bullet points for what the model can do
4. **Set Guidelines** - Numbered lists for step-by-step instructions
5. **Define Constraints** - What the model should NOT do
6. **Be Concise** - Long system prompts use more tokens and may dilute focus
7. **Be Explicit** - Avoid ambiguous language

### 2.2 Length Considerations

- **Recommended:** 200-1000 characters for most use cases
- **Maximum:** ~200,000 tokens (with `context-1m-2025-08-07` beta)
- **Trade-off:** More detailed prompts = better behavior but higher cost

### 2.3 Skill Injection Pattern

**From:** `/home/dustin/projects/groundswell/examples/examples/08-sdk-features.ts` (lines 435-446)

```typescript
async buildSystemPrompt(): Promise<void> {
    const baseSystem = 'You are a helpful assistant.';

    // Skills inject content into system prompt
    this.systemPrompt = `${baseSystem}

## Available Skills

${this.skillContent}

## Instructions
Use the loaded skills to assist the user with their requests.`;
}
```

---

## 3. Converting Skills to System Prompts

### 3.1 Skill Type Definition

**Location:** `/home/dustin/projects/groundswell/src/types/sdk-primitives.ts` (lines 55-63)

```typescript
export interface Skill {
    /** Skill name for identification */
    name: string;
    /** Path to skill directory containing SKILL.md */
    path: string;
}
```

### 3.2 SKILL.md Format

Skills are markdown files containing instructions to be injected into the system prompt.

**Example SKILL.md Structure:**

```markdown
# Math Expert Skill

You are an expert mathematician. You can:
- Perform complex calculations
- Explain mathematical concepts
- Solve equations step by step

## Usage
Ask me any math question and I'll provide a detailed solution.

## Example
User: What is 25 * 37?
Assistant: To calculate 25 * 37, I'll break it down:
25 * 37 = 25 * (30 + 7) = 25*30 + 25*7 = 750 + 175 = 925
```

### 3.3 Conversion Algorithm

**Step 1: Load Skill Content**

```typescript
import { readFile } from 'fs/promises';

async function loadSkillContent(skillPath: string): Promise<string> {
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    const content = await readFile(skillMdPath, 'utf-8');
    return content.trim();
}
```

**Step 2: Combine Multiple Skills**

```typescript
async function combineSkills(skills: Skill[]): Promise<string> {
    const skillContents = await Promise.all(
        skills.map(skill => loadSkillContent(skill.path))
    );

    return skillContents
        .map((content, index) => {
            const skillName = skills[index].name;
            return `### ${skillName}\n\n${content}`;
        })
        .join('\n\n---\n\n');
}
```

**Step 3: Inject into System Prompt**

```typescript
async function buildSystemPromptWithSkills(
    baseSystemPrompt: string,
    skills: Skill[]
): Promise<string> {
    if (skills.length === 0) {
        return baseSystemPrompt;
    }

    const combinedSkills = await combineSkills(skills);

    return `${baseSystemPrompt}

## Available Skills

${combinedSkills}

## Instructions
When responding to user requests, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
}
```

### 3.4 Complete Implementation Example

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Skill } from '../types/sdk-primitives.js';

export class SkillLoader {
    private skills: Map<string, string> = new Map();

    /**
     * Load skills from Skill[] array
     */
    async loadSkills(skills: Skill[]): Promise<void> {
        for (const skill of skills) {
            const content = await this.readSkillFile(skill.path);
            this.skills.set(skill.name, content);
        }
    }

    /**
     * Read SKILL.md from skill directory
     */
    private async readSkillFile(skillPath: string): Promise<string> {
        const skillMdPath = join(skillPath, 'SKILL.md');
        try {
            const content = await readFile(skillMdPath, 'utf-8');
            return content.trim();
        } catch (error) {
            throw new Error(
                `Failed to read skill file at ${skillMdPath}: ${error}`
            );
        }
    }

    /**
     * Build system prompt with injected skills
     */
    buildSystemPrompt(basePrompt: string): string {
        if (this.skills.size === 0) {
            return basePrompt;
        }

        const skillSections = Array.from(this.skills.entries())
            .map(([name, content]) => `### ${name}\n\n${content}`)
            .join('\n\n---\n\n');

        return `${basePrompt}

## Available Skills

${skillSections}

## Skill Usage Guidelines
When responding to user requests, leverage the available skills above.
Each skill provides specific capabilities, guidelines, and examples.
Choose the most relevant skill for the task at hand.
`;
    }

    /**
     * Get combined skill content for debugging
     */
    getSkillsContent(): string {
        return Array.from(this.skills.entries())
            .map(([name, content]) => `### ${name}\n\n${content}`)
            .join('\n\n---\n\n');
    }

    /**
     * Clear loaded skills
     */
    clear(): void {
        this.skills.clear();
    }

    /**
     * Get number of loaded skills
     */
    get count(): number {
        return this.skills.size;
    }
}
```

---

## 4. AnthropicProvider Implementation Pattern

### 4.1 Private Field for Skills Storage

**Location:** `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts`

```typescript
export class AnthropicProvider implements Provider {
    // ... existing fields

    /**
     * Loaded skills stored for injection into system prompt
     *
     * Skills are loaded from SKILL.md files and combined into
     * a single system prompt fragment. This fragment is injected
     * during execute() when building SDK options.
     *
     * @internal
     */
    private skillsPrompt: string = '';

    // ... rest of class
}
```

### 4.2 loadSkills() Implementation

```typescript
/**
 * Load skills into the provider
 *
 * Skills are read from SKILL.md files in each skill directory,
 * combined, and stored for injection into the system prompt.
 *
 * @param skills - Array of skill definitions with name and path
 * @remarks
 * Anthropic SDK does not have native skills API. Skills are
 * converted to system prompt text and injected into each query.
 *
 * @example
 * ```ts
 * const provider = new AnthropicProvider();
 * await provider.initialize();
 *
 * await provider.loadSkills([
 *   { name: 'math-expert', path: '/path/to/math-skill' },
 *   { name: 'code-reviewer', path: '/path/to/code-skill' }
 * ]);
 *
 * // Skills are now injected into all subsequent queries
 * const result = await provider.execute(
 *   { prompt: 'Solve 25 * 37', options: {} },
 *   toolExecutor
 * );
 * ```
 */
async loadSkills(skills: Skill[]): Promise<void> {
    // PATTERN: Validate SDK initialization
    // CRITICAL: Must check SDK is loaded before proceeding
    if (!this.sdk) {
        throw new Error("SDK not initialized. Call initialize() first.");
    }

    // Load each skill's SKILL.md content
    const skillContents: string[] = [];

    for (const skill of skills) {
        try {
            const skillPath = path.join(skill.path, 'SKILL.md');
            const content = await readFile(skillPath, 'utf-8');

            // Format skill with header
            skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
        } catch (error) {
            // Re-throw with context about which skill failed
            throw new Error(
                `Failed to load skill '${skill.name}' from ${skill.path}: ` +
                `${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // Combine all skills into single prompt fragment
    // Use "---" separator for visual clarity
    this.skillsPrompt = skillContents.join('\n\n---\n\n');
}

/**
 * Build system prompt with injected skills
 *
 * Combines base system prompt with loaded skills for inclusion
 * in SDK query options.
 *
 * @param baseSystemPrompt - The base system prompt from request.options
 * @returns System prompt with skills injected
 *
 * @internal
 */
private buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
    // If no skills loaded, return base prompt unchanged
    if (!this.skillsPrompt) {
        return baseSystemPrompt ?? '';
    }

    // If no base prompt, just return skills
    if (!baseSystemPrompt) {
        return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
    }

    // Combine base prompt with skills
    return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
}
```

### 4.3 Modified execute() Method

**Update lines 234-258 in anthropic-provider.ts:**

```typescript
// PATTERN: AgentSDKOptions construction (EXACT pattern from src/core/agent.ts:397-426)
// CRITICAL: Map ProviderRequest fields to SDK Options format
const sdkOptions = {
    // Model mapping
    model: modelSpec.model,

    // System prompt mapping with skills injection
    // UPDATED: Inject loaded skills into system prompt
    systemPrompt: this.buildSystemPromptWithSkills(
        request.options.systemPrompt
    ),

    // Tools mapping to allowedTools (string[])
    // CRITICAL: Map tool objects to tool names (from src/core/agent.ts:405-407)
    ...(request.options.tools &&
        request.options.tools.length > 0 && {
        allowedTools: request.options.tools.map((t) => t.name),
    }),

    // MCP servers integration (from P2.M1.T1.S7)
    // Include registered MCP servers if available
    ...(this.mcpServerConfig && {
        mcpServers: {
            "groundswell-mcp": this.mcpServerConfig,
        },
    }),

    // Hooks (placeholder for P2.M1.T2.S1)
    // hooks: undefined,
};
```

---

## 5. Examples and Patterns

### 5.1 Single Skill Example

```typescript
// Skill directory structure:
// /skills/math-expert/SKILL.md

const provider = new AnthropicProvider();
await provider.initialize();

await provider.loadSkills([
    {
        name: 'Math Expert',
        path: '/skills/math-expert'
    }
]);

// Generated system prompt:
// "You are a helpful assistant.
//
// ## Available Skills
//
// ### Math Expert
//
// You are an expert mathematician. You can:
// - Perform complex calculations
// - Explain mathematical concepts
// - Solve equations step by step
//
// ## Instructions
// Leverage the available skills above when responding to requests."
```

### 5.2 Multiple Skills Example

```typescript
await provider.loadSkills([
    { name: 'Code Reviewer', path: '/skills/code-reviewer' },
    { name: 'Test Writer', path: '/skills/test-writer' },
    { name: 'Documentor', path: '/skills/documentor' }
]);

// Skills are combined with "---" separators
// Each skill gets "### Skill Name" header
```

### 5.3 With Custom System Prompt

```typescript
const result = await provider.execute(
    {
        prompt: 'Review this code',
        options: {
            systemPrompt: 'You are a senior software engineer.'
        }
    },
    toolExecutor
);

// Final system prompt combines:
// 1. Custom prompt: "You are a senior software engineer."
// 2. Skills section with all loaded skills
// 3. Instructions for skill usage
```

---

## 6. Gotchas and Edge Cases

### 6.1 Common Pitfalls

**❌ DON'T: Forget to check SDK initialization**

```typescript
async loadSkills(skills: Skill[]): Promise<void> {
    // Missing SDK check - will fail if initialize() not called
    const content = await readFile(skills[0].path, 'SKILL.md');
}
```

**✅ DO: Always validate SDK state**

```typescript
async loadSkills(skills: Skill[]): Promise<void> {
    if (!this.sdk) {
        throw new Error("SDK not initialized. Call initialize() first.");
    }
    // ... rest of implementation
}
```

### 6.2 Error Handling

**❌ DON'T: Let file read errors propagate without context**

```typescript
const content = await readFile(skillPath, 'utf-8');
// If this fails, error doesn't indicate which skill or why
```

**✅ DO: Wrap errors with skill context**

```typescript
try {
    const content = await readFile(skillPath, 'utf-8');
} catch (error) {
    throw new Error(
        `Failed to load skill '${skill.name}' from ${skill.path}: ${error}`
    );
}
```

### 6.3 Empty Skills Array

**❌ DON'T: Process empty arrays unnecessarily**

```typescript
async loadSkills(skills: Skill[]): Promise<void> {
    for (const skill of skills) {
        // This loop does nothing if skills.length === 0
    }
    // Still builds prompt even with no skills
}
```

**✅ DO: Handle empty input gracefully**

```typescript
buildSystemPromptWithSkills(baseSystemPrompt?: string): string {
    if (!this.skillsPrompt) {
        return baseSystemPrompt ?? '';
    }
    // ... combine logic
}
```

### 6.4 Skill Content Length

**❌ DON'T: Ignore skill content length**

```typescript
// Loading 50 skills could exceed token limits
await provider.loadSkills(largeSkillArray);
// No warning about potential issues
```

**✅ DO: Consider logging for debugging**

```typescript
async loadSkills(skills: Skill[]): Promise<void> {
    // ... load logic

    // Log for debugging
    console.log(
        `Loaded ${skills.length} skills, ` +
        `combined length: ${this.skillsPrompt.length} characters`
    );
}
```

### 6.5 Skill Naming

**❌ DON'T: Use names that break markdown**

```typescript
{ name: 'Skill_Multiple_Words', path: '...' }
// Results in: "### Skill_Multiple_Words" (not ideal markdown)
```

**✅ DO: Use human-readable names**

```typescript
{ name: 'Multiple Word Skill', path: '...' }
// Results in: "### Multiple Word Skill" (proper markdown header)
```

---

## 7. Testing Patterns

### 7.1 Unit Test Structure

```typescript
describe('AnthropicProvider.loadSkills', () => {
    it('should load single skill from SKILL.md', async () => {
        const provider = new AnthropicProvider();
        await provider.initialize();

        // Mock file system
        vi.mock('fs/promises', () => ({
            readFile: vi.fn().mockResolvedValue('# Test Skill\n\nContent here')
        }));

        await provider.loadSkills([
            { name: 'Test', path: '/test/skill' }
        ]);

        // Verify skillsPrompt contains skill content
        expect(provider['skillsPrompt']).toContain('### Test');
        expect(provider['skillsPrompt']).toContain('Content here');
    });

    it('should combine multiple skills with separators', async () => {
        // ... test multiple skills
    });

    it('should throw if SDK not initialized', async () => {
        const provider = new AnthropicProvider();
        // Don't call initialize()

        await expect(
            provider.loadSkills([{ name: 'Test', path: '/test' }])
        ).rejects.toThrow('SDK not initialized');
    });

    it('should handle empty skills array', async () => {
        // ... test empty array
    });
});
```

### 7.2 Integration Test Pattern

```typescript
describe('AnthropicProvider skills integration', () => {
    it('should inject skills into system prompt during execute', async () => {
        const provider = new AnthropicProvider();
        await provider.initialize();

        await provider.loadSkills([
            { name: 'Math', path: '/fixtures/math-skill' }
        ]);

        const mockToolExecutor = vi.fn();

        // Mock SDK query to capture options
        vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
            query: vi.fn().mockReturnValue(asyncGenerator)
        }));

        await provider.execute(
            { prompt: 'test', options: {} },
            mockToolExecutor
        );

        // Verify systemPrompt includes skills
        expect(query).toHaveBeenCalledWith(
            expect.objectContaining({
                options: expect.objectContaining({
                    systemPrompt: expect.stringContaining('### Math')
                })
            })
        );
    });
});
```

---

## 8. Comparison: Anthropic vs OpenCode Skills

| Feature | Anthropic SDK | OpenCode SDK |
|---------|---------------|--------------|
| **API** | System prompt injection | Native `/skills` endpoint |
| **Format** | Text in SKILL.md | Structured skill objects |
| **Loading** | Manual file reading | SDK handles loading |
| **Execution** | Text concatenation into prompt | Direct skill invocation |
| **State** | Stateless (prompt per query) | May have session-based skills |
| **Discovery** | No skill listing API | May have skill discovery |

---

## 9. Documentation URLs

### 9.1 Official Documentation

**Note:** Web search tools are experiencing rate limits. Based on local SDK analysis and codebase inspection:

- **NPM Package:** https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk
- **GitHub Repository:** https://github.com/anthropics/claude-agent-sdk-typescript
- **Agent SDK Docs:** https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk
- **Messages API:** https://docs.anthropic.com/en/api/messages

### 9.2 Type Definition Locations

```
/home/dustin/projects/groundswell/node_modules/@anthropic-ai/claude-agent-sdk/
├── entrypoints/
│   ├── agentSdkTypes.d.ts      # Main SDK API
│   └── sdk/
│       ├── coreTypes.d.ts       # Core serializable types
│       └── runtimeTypes.d.ts    # Runtime Options interface
```

### 9.3 Local Codebase References

- `/home/dustin/projects/groundswell/src/providers/anthropic-provider.ts` - Provider implementation
- `/home/dustin/projects/groundswell/src/types/sdk-primitives.ts` - Skill type definition
- `/home/dustin/projects/groundswell/examples/examples/08-sdk-features.ts` - Skills example (lines 410-462)
- `/home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/research/anthropic_agent_sdk_query_research.md` - SDK query documentation

---

## 10. Summary

### Key Takeaways

1. **No Native Skills API** - Anthropic SDK uses system prompt for skills, not a dedicated skills endpoint
2. **File-Based Skills** - Skills are loaded from `SKILL.md` files in skill directories
3. **Text Concatenation** - Multiple skills are combined with markdown separators
4. **Prompt Injection** - Combined skills are injected into the system prompt parameter
5. **Stateless Design** - Skills are re-injected on each query execution

### Implementation Checklist

- [ ] Add private `skillsPrompt: string` field to AnthropicProvider
- [ ] Implement `loadSkills(skills: Skill[]): Promise<void>` method
- [ ] Add `buildSystemPromptWithSkills(basePrompt?: string): string` helper
- [ ] Update `execute()` to inject skills into `sdkOptions.systemPrompt`
- [ ] Add error handling for missing SKILL.md files
- [ ] Add validation for SDK initialization state
- [ ] Write unit tests for loadSkills()
- [ ] Write integration tests for skill injection
- [ ] Update JSDoc comments with examples

### Best Practices to Follow

1. Always validate SDK is initialized before loading skills
2. Wrap file read errors with skill name and path context
3. Use markdown headers (`### Skill Name`) for skill sections
4. Separate skills with visual dividers (`---`)
5. Log skill count and combined length for debugging
6. Handle empty skills array gracefully
7. Document the skill-to-prompt conversion pattern

---

**Document Status:** ✅ COMPLETE
**SDK Version:** @anthropic-ai/claude-agent-sdk@0.1.77
**Last Updated:** January 25, 2026
**Maintainer:** Groundswell Development Team

---

## Appendix: Complete Code Template

```typescript
/**
 * AnthropicProvider loadSkills() implementation template
 * Ready for P2.M1.T1.S8 implementation
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Skill } from '../types/sdk-primitives.js';

export class AnthropicProvider implements Provider {
    // ... existing fields

    /**
     * Combined skill content for system prompt injection
     *
     * Loaded from SKILL.md files and combined with markdown formatting.
     * Injected into systemPrompt during execute() method.
     *
     * @internal
     */
    private skillsPrompt: string = '';

    /**
     * Load skills into the provider
     *
     * Anthropic SDK does not have a native skills API. Skills are
     * implemented by reading SKILL.md files and injecting the content
     * into the system prompt for each query.
     *
     * @param skills - Array of skill definitions with name and path
     * @throws {Error} If SDK not initialized
     * @throws {Error} If skill file cannot be read
     *
     * @example
     * ```ts
     * await provider.loadSkills([
     *   { name: 'Math Expert', path: '/skills/math' },
     *   { name: 'Code Reviewer', path: '/skills/code-review' }
     * ]);
     * ```
     */
    async loadSkills(skills: Skill[]): Promise<void> {
        // Validate SDK initialization
        if (!this.sdk) {
            throw new Error(
                'SDK not initialized. Call initialize() first.'
            );
        }

        // Load each skill's SKILL.md content
        const skillContents: string[] = [];

        for (const skill of skills) {
            try {
                const skillMdPath = join(skill.path, 'SKILL.md');
                const content = await readFile(skillMdPath, 'utf-8');

                // Format with markdown header
                skillContents.push(`### ${skill.name}\n\n${content.trim()}`);
            } catch (error) {
                throw new Error(
                    `Failed to load skill '${skill.name}' from ${skill.path}: ` +
                    `${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
        }

        // Combine with markdown separator
        this.skillsPrompt = skillContents.join('\n\n---\n\n');
    }

    /**
     * Build system prompt with injected skills
     *
     * @param baseSystemPrompt - Optional base system prompt
     * @returns Combined system prompt with skills
     *
     * @internal
     */
    private buildSystemPromptWithSkills(
        baseSystemPrompt?: string
    ): string {
        // No skills loaded
        if (!this.skillsPrompt) {
            return baseSystemPrompt ?? '';
        }

        // No base prompt, return skills only
        if (!baseSystemPrompt) {
            return `You are a helpful assistant.

## Available Skills

${this.skillsPrompt}

## Instructions
Leverage the available skills above when responding to requests.
`;
        }

        // Combine base prompt with skills
        return `${baseSystemPrompt}

## Available Skills

${this.skillsPrompt}

## Skill Usage
When responding, leverage the available skills above.
Each skill provides specific capabilities and guidelines.
`;
    }

    // execute() method updates:
    // In sdkOptions construction, replace:
    //   systemPrompt: request.options.systemPrompt,
    // With:
    //   systemPrompt: this.buildSystemPromptWithSkills(
    //       request.options.systemPrompt
    //   ),
}
```

---

**End of Document**

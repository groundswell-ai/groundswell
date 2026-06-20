# Progress

## Status
In Progress

## Tasks
- [x] Research external SDKs for pluggable agent harness abstraction (Claude + Pi + agentskills.io)
      → delivered: `plan/004_9a50e71828f4/architecture/external-sdk-research.md`

## Files Changed
- `plan/004_9a50e71828f4/architecture/external-sdk-research.md` (created) — external SDK research brief

## Notes
### Claude Agent SDK — VERIFIED (authoritative)
- Inspected installed `@anthropic-ai/claude-agent-sdk@0.1.77` `.d.ts` files directly.
- Entry: `query({prompt, options}): AsyncGenerator<SDKMessage>`; V2 session API is `unstable_`.
- Tools: built-in `tools` option, in-process `tool()` + `createSdkMcpServer()` (returns `Promise<CallToolResult>`), external `mcpServers` (stdio/sse/http); `setMcpServers()` swaps live.
- Streaming deltas OFF by default → set `options.includePartialMessages = true`.
- Lifecycle: 12-event `hooks` (PreToolUse/PostToolUse/SessionStart/SessionEnd/Stop/SubagentStart/...) + `canUseTool` permission callback.
- Sessions resume from disk (`~/.claude/projects/`) via `resume`/`continue`/`forkSession`; `persistSession:false` disables.
- Skills: no `loadSkills(text)`; inject via `systemPrompt.append`, plugins, or SessionStart/UserPromptSubmit hooks `additionalContext`; `supportedCommands()` lists them.
- Constraint: Anthropic models ONLY; spawns the Claude Code CLI subprocess (not a direct API call); peer-depends `zod ^3.25||^4` (repo pins ^3.23 — verify lockfile).

### Pi SDK — UNVERIFIED (BLOCKER for PiHarness)
- `@earendil-works/pi-coding-agent` is NOT installed in this repo (not in package.json, not in node_modules).
- This subagent has NO web_search tool and no bash (cannot `npm view`/install). All Pi signatures in the brief are therefore UNVERIFIED and clearly flagged.
- Brief includes a concrete verification protocol (npm view + install + read .d.ts) and a target `Harness` interface (§4) so implementation can proceed once verified.
- Key open question: does Pi execute tools internally (like Claude) or emit `tool_call` events for the host to fulfill? The proposed Harness interface accommodates both via `capabilities.hostExecutedTools`.

### agentskills.io — partial
- Markdown-first `/command` skill standard; format likely shared, but each SDK loads it differently. Frontmatter keys need official spec confirmation.

### Environment limitation
- Only `read`/`write` tools available; no `web_search`, `bash`, or `contact_supervisor`. Could not web-verify Pi or contact a supervisor for the missing package.

### Recommended next step (for parent)
- Delegate a follow-up task with bash/network access to: install `@earendil-works/pi-coding-agent`, read its `.d.ts`, and update the Pi section (§2) + mapping table (§2.5) of the brief. Also confirm the resolved `zod` version in the lockfile.

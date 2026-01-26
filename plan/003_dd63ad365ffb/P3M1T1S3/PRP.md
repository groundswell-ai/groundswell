# Product Requirement Prompt (PRP): P3.M1.T1.S3 - Determine Implementation Strategy

---

## Goal

**Feature Goal:** Determine and document the implementation strategy for OpenCode provider integration by evaluating whether the OpenCode SDK (`@opencode-ai/sdk`) meets architectural requirements, or whether an alternative SDK should be used instead.

**Deliverable:** A documented strategic decision in `architecture/decisions.md` (Decision 3) that:
1. Evaluates OpenCode SDK against Provider interface requirements
2. Selects Strategy A (implement OpenCode), Strategy B (contact maintainers), or Strategy C (use alternative)
3. Provides architectural justification for the decision
4. Outlines next steps for implementation (if Strategy A) or alternative approach (if Strategy C)

**Success Definition:**
- Decision 3 in `architecture/decisions.md` is marked "DECIDED" with clear rationale
- If Strategy A: P3.M2 tasks proceed with OpenCode SDK
- If Strategy B: Contact plan is documented with maintainers' contact information
- If Strategy C: Alternative SDK is selected and PRD adjustments are documented

---

## Why

This task is critical because the PRD specifies OpenCode SDK as a multi-provider solution supporting 75+ providers, but research from P3.M1.T1.S1 and P3.M1.T1.S2 revealed significant architectural differences between OpenCode SDK and Groundswell's Provider interface pattern.

**Key Issues to Resolve:**
1. **Architectural Mismatch:** OpenCode SDK uses a client-server model (requires external `opencode` server process), while Groundswell's Provider interface expects a standalone execution library
2. **Tool Execution:** OpenCode executes tools server-side (observation only), while Groundswell requires direct tool execution via `toolExecutor` callback
3. **Deployment Complexity:** OpenCode requires users to install and manage a separate CLI/server process

**Business Impact:**
- Wrong strategy choice could block P3.M2 implementation or require significant rework
- User experience depends on this decision (standalone vs. server-dependent operation)
- Must balance PRD requirements (75+ providers) with architectural practicality

---

## What

### Decision Process

The implementation strategy is determined through this contract:

```
CONTRACT DEFINITION:
1. RESEARCH NOTE: From decisions.md Decision 1 - Three options:
   A) Package exists, implement per docs
   B) Private package, contact maintainers
   C) Doesn't exist, use alternative (LangChain.js recommended)

2. INPUT: API docs from S2 (P3.M1.T1.S2 completed)

3. LOGIC:
   If package exists publicly → Strategy A, proceed to P3.M2
   If package is private → Strategy B, contact maintainers
   If package doesn't exist → Strategy C, choose alternative and adjust PRD

4. OUTPUT: Document decision in architecture/decisions.md
```

### Decision Options

Based on research from P3.M1.T1.S1 and P3.M1.T1.S2:

#### Option A: Implement OpenCode Provider (Package Verified: `@opencode-ai/sdk@1.1.36`)

**Facts:**
- Package exists and is publicly available on npm
- Version 1.1.36, actively maintained (3,021+ versions published)
- Zero dependencies, MIT license
- Supports 75+ providers via `providerID/modelID` format

**Architectural Considerations:**
- Client-server model (requires external `opencode` server process)
- Server-side session storage
- Tool execution is server-side only (observation via events)
- Communication via HTTP/WebSocket

**Implementation Path:**
- Create `OpenCodeProvider` class implementing Provider interface
- Handle server lifecycle (start in `initialize()`, stop in `terminate()`)
- Adapt session API to Groundswell's SessionState pattern
- Document server requirement and deployment considerations

#### Option B: Contact Maintainers (Not Applicable)

**Status:** Package is public, maintainers known (adam@terminal.shop, d@ironbay.co)
**Action:** Not required unless package has undocumented requirements

#### Option C: Use Alternative SDK (LangChain.js or Vercel AI SDK)

**Researched Alternatives:**

| Alternative | Providers | MCP Support | Architecture | Alignment |
|-------------|-----------|-------------|--------------|-----------|
| **LangChain.js** | 30+ | Native (@langchain/mcp-adapters) | Framework-heavy | Poor (5.7/10) |
| **Vercel AI SDK** | 17+ | Via LangChain adapters | Standalone | Good (rate-limited research) |

**Key Finding:** LangChain.js research completed - shows framework architecture mismatch with Groundswell's standalone Provider pattern. Requires AgentExecutor wrapper, complex adapter layer.

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Critical for understanding the decision

# PRD Context
- file: plan/003_dd63ad365ffb/prd_snapshot.md
  why: PRD Section 7 specifies OpenCode SDK as multi-provider solution with 75+ providers
  section: Section 7 - Provider System Implementation
  critical: PRD requires "native sessions" and "extended thinking" capabilities

# Architecture Decisions (current state)
- file: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  why: Decision 1 outlines the three strategy options
  section: Decision 1: OpenCode SDK Strategy (Status: OPEN)
  critical: This task must update Decision 1's status to DECIDED

# Previous Research: P3.M1.T1.S1
- file: plan/003_dd63ad365ffb/P3M1T1S1/research/opencode-sdk-research.md
  why: Verified package exists (@opencode-ai/sdk@1.1.36)
  critical: Package is publicly available, zero dependencies, MIT license
  gotcha: Package uses client-server architecture, not standalone library

# Previous Research: P3.M1.T1.S2
- file: plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md
  why: Complete API documentation with architectural analysis
  section: Section 14 - Integration Considerations (architectural mismatch)
  critical: "Client-server architecture doesn't align with Groundswell's standalone Provider pattern"
  gotcha: Requires external `opencode` server process (npm install -g opencode)

# External Dependencies Documentation
- file: plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: Contains OpenCode SDK API patterns and comparison with Anthropic SDK
  section: OpenCode Agent SDK section (lines 334-1502)
  critical: Model format uses `providerID/modelID` object, not string
  gotcha: All types auto-generated from OpenAPI spec (complex nested types)

# Provider Interface Definition
- file: src/types/providers.ts
  why: The Provider interface that OpenCode must implement
  pattern: 6 required methods: initialize(), terminate(), execute(), registerMCPs(), loadSkills(), normalizeModel()
  critical: execute() receives toolExecutor callback - MUST use for tool delegation
  gotcha: AgentResponse wrappers required (createSuccessResponse/createErrorResponse)

# Existing Provider Implementation
- file: src/providers/anthropic-provider.ts
  why: Reference implementation showing all required patterns
  pattern: Lazy SDK loading with import(), idempotent initialize/terminate, session state management
  critical: Follow this pattern EXACTLY for any new provider
  gotcha: Session state is in-memory Map, not SDK-managed

# Provider Registry
- file: src/providers/provider-registry.ts
  why: How providers are registered and initialized
  pattern: Singleton getInstance(), register(provider), get(id)
  critical: New providers must be registered with registry before use

# LangChain Alternative Research
- file: plan/003_dd63ad365ffb/docs/research/LANGCHAIN_JS_RESEARCH.md
  why: Alternative SDK evaluation if OpenCode is rejected
  section: Section 9 - Architectural Assessment (compatibility score: 5.7/10)
  critical: "Framework architecture doesn't align with standalone Provider pattern"
  gotcha: Requires AgentExecutor for tool calling (automatic vs. callback-based)

# Codebase Decision Patterns
- file: plan/003_dd63ad365ffb/docs/architecture/decisions.md
  why: Template for documenting Decision 3
  pattern: Status, Context, Options (with Pros/Cons), Recommendation, Rationale, Next Steps
  critical: Follow exact format for consistency
```

### Current Codebase Context

**Provider System Status (from tasks.json):**
- Phase 1 (Provider Type System): ✅ Complete
- Phase 2 (Anthropic Provider): ✅ Complete
- Phase 3 (OpenCode Provider): ⏳ In Progress (this milestone)
- Phase 4 (Agent Integration): ⏳ Planned

**Key Files:**
```
src/
├── types/
│   └── providers.ts           # Provider interface, ProviderId, ProviderCapabilities
├── providers/
│   ├── anthropic-provider.ts  # Reference implementation (FOLLOW THIS PATTERN)
│   └── provider-registry.ts   # Singleton registry for provider lifecycle
├── core/
│   ├── provider-config.ts     # Global configuration and cascade logic
│   └── mcp-handler.ts         # MCP server management
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: OpenCode SDK Architecture
// Unlike Anthropic SDK (standalone), OpenCode requires external server process
// User must run: npm install -g opencode
// Provider must start server in initialize() and stop in terminate()

// CRITICAL: Tool Execution Pattern Mismatch
// OpenCode: Tools executed server-side, can only observe via events
// Groundswell: Requires toolExecutor callback for direct tool delegation
// This is a FUNDAMENTAL architectural mismatch

// CRITICAL: Session Management Difference
// OpenCode: Server-side session storage (persists across client restarts)
// Groundswell: In-memory Map<sessionId, SessionState>
// Must adapt to maintain consistency with AnthropicProvider pattern

// GOTCHA: Model Format Difference
// OpenCode: { providerID: string, modelID: string } object
// Groundswell: "provider/model" string (e.g., "anthropic/claude-sonnet-4")
// parseModelSpec() handles string parsing, but OpenCode API expects object

// GOTCHA: RequestResult Pattern
// OpenCode: Returns { data, error, status } objects (auto-generated types)
// Groundswell: Uses AgentResponse<T> with createSuccessResponse/createErrorResponse
// Must convert between formats

// PATTERN: Decision Documentation Format
// Follow exact format in decisions.md:
// ## Decision 3: OpenCode Implementation Strategy
// **Status:** DECIDED
// **Context:** [why decision needed]
// **Options:** [A, B, C with Pros/Cons]
// **Decision:** [chosen option]
// **Rationale:** [justification]
// **Next Steps:** [action items]

// GOTCHA: Scope Boundaries
// This task ONLY makes the strategy decision
// Does NOT implement OpenCodeProvider (that's P3.M2)
// Does NOT modify existing code
// OUTPUT: Updated decisions.md file only
```

---

## Implementation Blueprint

### Decision Framework

This task requires **evaluating three options** and **documenting the decision** in `architecture/decisions.md`. No code changes are made.

### Evaluation Criteria

| Criterion | Weight | OpenCode SDK | LangChain.js | Vercel AI SDK |
|-----------|--------|--------------|--------------|---------------|
| **Multi-Provider Count** | High | 75+ ✅ | 30+ ⚠️ | 17+ ⚠️ |
| **Architecture Alignment** | Critical | Poor (client-server) | Poor (framework) | Good (standalone) |
| **MCP Support** | High | Native ✅ | Native ✅ | Via adapters |
| **Tool Control** | Critical | Observation only ❌ | Automatic ⚠️ | Direct ✅ |
| **Deployment Simplicity** | High | Complex (server) ❌ | Simple ✅ | Simple ✅ |
| **Session Management** | Medium | Server-side | LangChain State | Configurable |
| **PRD Alignment** | High | Specified ✅ | Alternative | Alternative |
| **Implementation Effort** | Low | Medium | High | Medium |

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: Analyze OpenCode SDK Architecture
  - RESEARCH: Review external_dependencies.md OpenCode section (lines 334-1502)
  - ANALYZE: Client-server architecture implications
  - IDENTIFY: Showstoppers vs. workarounds
  - DOCUMENT: Key findings for decision
  - OUTPUT: Analysis summary for Decision 3 context

Task 2: Evaluate Provider Interface Compatibility
  - COMPARE: Provider interface requirements (src/types/providers.ts) vs. OpenCode capabilities
  - ASSESS: Each required method:
    * initialize() → Can we start server? ✅ Yes, via createOpencode()
    * terminate() → Can we stop server? ✅ Yes, via server.close()
    * execute() → Can we delegate tools? ❌ NO - server-side only
    * registerMCPs() → Can we register MCPs? ⚠️ Dynamic add only
    * loadSkills() → Can we load skills? ❌ NO - server-side plugins
    * normalizeModel() → Can we parse models? ✅ Yes, parseModelSpec() handles it
  - IDENTIFY: Critical blockers (tool execution is showstopper)
  - OUTPUT: Compatibility matrix

Task 3: Assess Alternative SDKs
  - REVIEW: LangChain.js research (LANGCHAIN_JS_RESEARCH.md)
  - IDENTIFY: Compatibility score 5.7/10 - framework mismatch
  - ASSESS: Vercel AI SDK (rate-limited, use external_dependencies.md info)
  - COMPARE: Trade-offs of each alternative
  - OUTPUT: Alternative evaluation matrix

Task 4: Make Strategic Decision
  - WEIGH: Criteria from evaluation table
  - DECIDE: Strategy A (OpenCode), B (contact), or C (alternative)
  - JUSTIFY: Provide clear rationale
  - CONSIDER: PRD requirements vs. architectural reality
  - OUTPUT: Final decision with rationale

Task 5: Document Decision in architecture/decisions.md
  - LOCATE: Decision 1 section in decisions.md
  - UPDATE: Change status from "OPEN" to "DECIDED"
  - POPULATE: Selected option with rationale
  - REMOVE: Unselected options (keep for reference)
  - ADD: "Next Steps" section with implementation path
  - FOLLOW: Exact format from Decision 2 template
  - OUTPUT: Completed Decision 3 documentation

Task 6: Update External Dependencies (if Strategy C)
  - CONDITIONAL: Only if Strategy C selected
  - DOCUMENT: Chosen alternative SDK in external_dependencies.md
  - INCLUDE: Installation commands, API patterns, integration considerations
  - CREATE: New section for alternative SDK
  - OUTPUT: Updated external_dependencies.md

Task 7: Update Task Dependencies (if Strategy C)
  - CONDITIONAL: Only if Strategy C selected
  - MODIFY: tasks.json to reflect alternative implementation path
  - UPDATE: P3.M2 tasks to use alternative SDK
  - ADJUST: Task descriptions and context_scope
  - OUTPUT: Updated tasks.json (NOTE: This orchestrator-owned file - recommend changes only)
```

### Decision Documentation Template

```markdown
## Decision 3: OpenCode Implementation Strategy

**Status:** DECIDED

**Context:**
- OpenCode SDK verified as available (P3.M1.T1.S1): `@opencode-ai/sdk@1.1.36`
- Complete API documented (P3.M1.T1.S2) with architectural analysis
- Provider interface requirements defined (P1.M1.T1.S3)
- Alternative SDKs researched (LangChain.js, Vercel AI SDK)

**Key Findings:**
1. **Architectural Mismatch:** OpenCode uses client-server model; requires external `opencode` server
2. **Tool Execution:** Server-side only; cannot integrate Groundswell's toolExecutor callback
3. **Session Management:** Server-side state; differs from in-memory SessionState pattern
4. **Deployment:** Users must install and manage separate CLI/server process

**Options:**

### Option A: Implement OpenCode Provider
**Approach:** Create OpenCodeProvider despite architectural differences

**Pros:**
- Native 75+ provider support as specified in PRD
- Native MCP and LSP integration
- Zero dependencies (lightweight client)
- Matches PRD specification exactly

**Cons:**
- External server dependency (deployment complexity)
- Tool execution limitation (observation only)
- Session state server-side (abstraction leakage)
- Requires user to install `opencode` CLI

**Implementation:** Create `src/providers/opencode-provider.ts` with server lifecycle management

### Option B: Contact Maintainers
**Approach:** Reach out to OpenCode maintainers for guidance

**Status:** Not required - package is public with documented API

### Option C: Use Alternative SDK
**Approach:** Use LangChain.js or Vercel AI SDK instead

**Pros:**
- Standalone execution (no server required)
- Direct tool control compatible with Provider interface
- Simpler deployment

**Cons:**
- LangChain: Framework architecture (compatibility 5.7/10)
- Fewer providers (17-30 vs. 75+)
- Deviates from PRD specification
- Requires PRD adjustment

**Decision:** [SELECTED OPTION]

**Rationale:**
[JUSTIFICATION FOR DECISION]
[ARCHITECTURAL CONSIDERATIONS]
[PRD ALIGNMENT ASSESSMENT]
[USER EXPERIENCE IMPACT]

**Next Steps:**
[IF A]: Proceed to P3.M2 - OpenCode Provider Implementation
[IF C]: Create new task branch for [chosen alternative] integration
[DOCUMENT]: Update external_dependencies.md with implementation details
[CREATE]: Implementation guide for deployment considerations

**References:**
- P3.M1.T1.S1 Research: `./P3M1T1S1/research/opencode-sdk-research.md`
- P3.M1.T1.S2 Research: `./P3M1T1S2/research/opencode-sdk-complete-research.md`
- LangChain Research: `./docs/research/LANGCHAIN_JS_RESEARCH.md`
- Provider Interface: `src/types/providers.ts`
- External Dependencies: `./docs/architecture/external_dependencies.md`
```

### Decision Logic Flowchart

```
START
  │
  ▼
Does OpenCode SDK exist publicly?
  │
  ├─ NO → Strategy B (contact maintainers) → END
  │
  └─ YES ✅ (verified: @opencode-ai/sdk@1.1.36)
       │
       ▼
    Does it meet architectural requirements?
       │
       ├─ CHECK: Can it implement Provider interface?
       │  ├─ initialize() ✅ (createOpencode)
       │  ├─ terminate() ✅ (server.close)
       │  ├─ execute() ⚠️ (tool execution limitation)
       │  ├─ registerMCPs() ⚠️ (dynamic add only)
       │  ├─ loadSkills() ❌ (server-side plugins)
       │  └─ normalizeModel() ✅ (parseModelSpec)
       │
       ├─ CHECK: Can it delegate tools via toolExecutor?
       │  └─ ❌ NO - tools executed server-side
       │
       ├─ CHECK: Can it maintain in-memory sessions?
       │  └─ ❌ NO - sessions stored server-side
       │
       ├─ CHECK: Is standalone (no external process)?
       │  └─ ❌ NO - requires `opencode` server
       │
       ▼
    Are there blocking architectural mismatches?
       │
       ├─ YES → Consider Strategy C (alternative SDK)
       │  │
       │  ├─ Evaluate LangChain.js → 5.7/10 compatibility
       │  ├─ Evaluate Vercel AI SDK → rate-limited research
       │  └─ Assess PRD deviation impact
       │
       └─ NO → Proceed with Strategy A
       │
          ▼
    DECISION POINT:
    │
    ├─ PRD alignment (75+ providers) critical?
    │  └─ YES → Strategy A with caveats
    │
    └─ Architectural purity critical?
       └─ YES → Strategy C
       │
       ▼
    FINAL DECISION:
    │
    ├─ Strategy A: Document architectural trade-offs
    ├─ Strategy C: Select alternative, adjust PRD
    │
    ▼
Document in architecture/decisions.md
  │
  ▼
END
```

---

## Validation Loop

### Level 1: Decision Completeness Check (Immediate)

```bash
# Verify decision documentation exists
cat plan/003_dd63ad365ffb/docs/architecture/decisions.md | grep -A 20 "Decision 3"

# Expected: Decision 3 section with Status: DECIDED

# Verify all required sections present
grep -E "(Status|Context|Options|Decision|Rationale|Next Steps)" \
  plan/003_dd63ad365ffb/docs/architecture/decisions.md | head -20

# Expected: All section headers present
```

**Validation Gates:**
- [ ] Decision 3 status changed from "OPEN" to "DECIDED"
- [ ] Context section references previous research (P3.M1.T1.S1, P3.M1.T1.S2)
- [ ] Options section includes at least Options A and C (B is optional)
- [ ] Decision clearly states chosen option (A, B, or C)
- [ ] Rationale explains why chosen option is best
- [ ] Next Steps outline implementation path
- [ ] References section links to all research sources

### Level 2: Decision Quality Check (Review)

```bash
# Verify decision addresses key architectural concerns
cat plan/003_dd63ad365ffb/docs/architecture/decisions.md | \
  grep -A 50 "Decision 3" | grep -E "(server|tool.*execution|session|deployment)"

# Expected: Decision addresses these critical concerns

# Verify rationale is comprehensive
cat plan/003_dd63ad365ffb/docs/architecture/decisions.md | \
  grep -A 100 "Rationale:" | head -20

# Expected: Clear justification with architectural considerations
```

**Validation Gates:**
- [ ] Rationale addresses tool execution mismatch (if Option A)
- [ ] Rationale addresses server dependency (if Option A)
- [ ] Rationale addresses PRD deviation (if Option C)
- [ ] Rationale includes user experience impact
- [ ] Rationale includes deployment considerations

### Level 3: Consistency Check (Cross-Reference)

```bash
# Verify decision is consistent with previous research
cat plan/003_dd63ad365ffb/P3M1T1S2/research/opencode-sdk-complete-research.md | \
  grep -i "recommendation" -A 5

# Cross-check with Decision 3 rationale
cat plan/003_dd63ad365ffb/docs/architecture/decisions.md | \
  grep -A 50 "Rationale:"

# Expected: Decision aligns with research recommendations

# Verify external_dependencies.md is updated (if Strategy C)
cat plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md | \
  grep -i "vercel\|langchain" -A 5

# Expected: Alternative SDK documented (if Strategy C chosen)
```

**Validation Gates:**
- [ ] Decision consistent with P3.M1.T1.S2 research recommendations
- [ ] No contradictions between decision and previous research
- [ ] external_dependencies.md updated (if Strategy C)
- [ ] All referenced research files exist and are accessible

### Level 4: Forward-Looking Validation (Impact Assessment)

```bash
# Verify next steps are actionable
cat plan/003_dd63ad365ffb/docs/architecture/decisions.md | \
  grep -A 20 "Next Steps:"

# Expected: Clear, specific action items

# Check if implementation path is clear
cat plan/003_dd63ad365ffb/tasks.json | \
  grep -A 10 "P3.M2"

# Expected: P3.M2 tasks align with decision
```

**Validation Gates:**
- [ ] Next steps are specific and actionable
- [ ] Implementation path is clear (P3.M2 or new tasks)
- [ ] Dependencies on future tasks are documented
- [ ] Risk factors are acknowledged (if applicable)

---

## Final Validation Checklist

### Decision Documentation

- [ ] Decision 3 created/updated in `architecture/decisions.md`
- [ ] Status changed from "OPEN" to "DECIDED"
- [ ] All required sections present (Status, Context, Options, Decision, Rationale, Next Steps)
- [ ] References section links to all research sources
- [ ] Format matches existing decision templates

### Decision Quality

- [ ] Decision addresses architectural mismatches identified in research
- [ ] Rationale explains trade-offs clearly
- [ ] PRD alignment is addressed (either followed or justified deviation)
- [ ] User experience impact is considered
- [ ] Deployment implications are documented (if Option A)

### Consistency

- [ ] Decision consistent with P3.M1.T1.S1 research (package verification)
- [ ] Decision consistent with P3.M1.T1.S2 research (API documentation)
- [ ] Decision consistent with LangChain research (alternative evaluation)
- [ ] No contradictions with existing architectural decisions

### Forward Readiness

- [ ] Next steps clearly defined
- [ ] P3.M2 tasks can proceed based on this decision (if Option A)
- [ ] Alternative implementation path documented (if Option C)
- [ ] No blockers for dependent milestones

### Documentation Updates (Conditional)

- [ ] `external_dependencies.md` updated (if Strategy C)
- [ ] Task dependency updates recommended (if Strategy C)
- [ ] Implementation considerations documented
- [ ] Known limitations documented (if Option A)

---

## Anti-Patterns to Avoid

- ❌ **Don't modify code** - This task ONLY documents a decision
- ❌ **Don't implement OpenCodeProvider** - That's P3.M2.T1.S1's job
- ❌ **Don't modify tasks.json directly** - It's orchestrator-owned; recommend changes only
- ❌ **Don't ignore architectural trade-offs** - Must address tool execution limitation
- ❌ **Don't skip rationale** - Decision must be well-justified
- ❌ **Don't reference non-existent files** - All citations must be valid
- ❌ **Don't leave decision ambiguous** - Must clearly choose A, B, or C
- ❌ **Don't forget PRD alignment** - Must explain any deviation from PRD
- ❌ **Don't overlook deployment** - Server dependency is significant user impact
- ❌ **Don't ignore next steps** - Implementation path must be clear

---

## Success Metrics

**Confidence Score:** 9/10

**Rationale:**
- Comprehensive research completed in P3.M1.T1.S1 and P3.M1.T1.S2
- Architectural analysis clearly identifies mismatches
- Alternative SDKs researched (LangChain.js complete)
- Decision framework is well-defined
- Validation gates ensure quality decision

**Validation:** The completed PRP enables clear strategy determination with documented rationale, ensuring P3.M2 can proceed with confidence (or alternative path if Strategy C chosen).

---

## Appendix: Decision Considerations

### OpenCode SDK: Key Architectural Facts

```typescript
// FACT 1: Client-Server Architecture
// OpenCode SDK is NOT a standalone execution library
// It requires external server process: npm install -g opencode
const { client, server } = await createOpencode({
  hostname: '127.0.0.1',
  port: 4096
});

// FACT 2: Server-Side Tool Execution
// Tools are executed on the server, client can only observe via events
// Cannot implement toolExecutor callback pattern required by Provider interface
const eventStream = await client.event.subscribe({});
for await (const event of eventStream) {
  if (event.type === 'tool.executed') {
    // Can only observe, not control execution
  }
}

// FACT 3: Server-Side Session Storage
// Sessions stored on server, persist across client restarts
const sessionResult = await client.session.create({});
const sessionId = sessionResult.data.id; // Server-managed ID

// FACT 4: Model Format Difference
// OpenCode uses object format: { providerID, modelID }
// Groundswell uses string format: "provider/model"
const model = {
  providerID: "anthropic",
  modelID: "claude-opus-4-5-20251101"
};

// FACT 5: Multi-Provider Support
// 75+ providers natively supported (main PRD requirement)
const providers = ["anthropic", "openai", "google", "ollama", "azure", "aws", ...];
```

### Provider Interface: Non-Negotiable Requirements

```typescript
// REQUIRED: Tool execution via callback
interface Provider {
  execute<T>(
    request: ProviderRequest,
    toolExecutor: ToolExecutor,  // ← MUST call this for tool execution
    hooks?: ProviderHookEvents
  ): Promise<AgentResponse<T>>;
}

// REQUIRED: AgentResponse wrapper
return createSuccessResponse(data, {
  agentId: this.id,
  timestamp: Date.now(),
  duration,
  usage,
  toolCalls,
});

// REQUIRED: In-memory session management
private sessions: Map<string, SessionState> = new Map();

// REQUIRED: Idempotent operations
async initialize(): Promise<void> {
  if (this.sdk) return; // Idempotent
  // ... initialization
}
```

### Strategic Questions to Answer

1. **Can OpenCode implement the Provider interface as specified?**
   - Yes, technically (all methods can be implemented)
   - But with significant architectural compromises

2. **Is the tool execution limitation a showstopper?**
   - Provider interface requires toolExecutor callback
   - OpenCode executes tools server-side (cannot delegate)
   - This is a FUNDAMENTAL mismatch

3. **Is server dependency acceptable for users?**
   - Requires: `npm install -g opencode`
   - Management: Server lifecycle (start/stop)
   - Deployment: Port configuration, process management
   - This is SIGNIFICANT user impact

4. **Does PRD require OpenCode specifically, or multi-provider capability?**
   - PRD Section 7.4: "OpenCode SDK supports 75+ providers"
   - Implies OpenCode is the specified solution
   - But goal is multi-provider support, not OpenCode per se

5. **If Strategy C, which alternative?**
   - LangChain.js: 30+ providers, framework mismatch (5.7/10)
   - Vercel AI SDK: 17+ providers, better alignment (rate-limited research)
   - Custom: Build own multi-provider abstraction

---

**End of PRP**

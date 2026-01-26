---
name: "P1.M3.T1.S1: Create OpenCode Provider Decision Analysis Document"
description: |

---

## Goal

**Feature Goal**: Create a comprehensive decision analysis document that evaluates three strategic options for addressing OpenCode provider gaps (missing MCP/LSP tool execution capabilities vs PRD requirements)

**Deliverable**: Decision analysis document at `plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/opencode-decision.md` containing:
- Capability gap analysis (current vs PRD requirements)
- Three option evaluation with effort estimates, business impact, and technical feasibility
- Risk assessment for breaking changes
- Clear recommendation with rationale

**Success Definition**:
- Document is actionable for product/engineering leadership
- All three options (Document limitations, Implement full support, Remove provider) are thoroughly analyzed
- Effort estimates are specific (A: 1-2 days, B: 4-6 weeks, C: 1 week)
- Recommendation includes migration path if provider removal is chosen

## User Persona

**Target User**: Product and Engineering Leadership

**Use Case**: Making a strategic decision about the future of the OpenCode provider integration in Groundswell

**User Journey**:
1. Review executive summary (2-minute read)
2. Understand current gaps vs PRD requirements
3. Compare three options across multiple dimensions
4. Review recommendation and rationale
5. Approve resolution path for P1.M3.T1.S2

**Pain Points Addressed**:
- Unclear business impact of maintaining vs removing OpenCode provider
- Unknown effort required to implement missing capabilities
- Risk of breaking changes for existing users
- Need for data-driven decision framework

## Why

- **Business Impact**: OpenCode provider was marketed as a key differentiator (multi-provider support, 75+ LLM backends) but lacks critical capabilities (MCP/LSP tool execution)
- **User Trust**: PRD promises multi-provider support; current implementation delivers LLM-only mode without clear communication
- **Technical Debt**: Maintaining non-compliant provider diverts engineering resources from higher-value features
- **Strategic Clarity**: Decision enables clear roadmap for P2 (other providers) and prevents scope creep

## What

Create a decision analysis document that:

### Success Criteria

- [ ] Executive summary with clear recommendation (max 2-minute read)
- [ ] Current state vs PRD requirements comparison table
- [ ] Three option evaluation with weighted scoring (effort, business impact, technical feasibility, risk)
- [ ] Migration path for breaking changes (if Option C recommended)
- [ ] Test coverage implications analysis
- [ ] Post-implementation review framework

### Document Structure

1. **Executive Summary** (2-minute read)
   - Current state (1 paragraph)
   - Three options table (1-2 pages)
   - Recommended option with rationale (1 paragraph)
   - Next steps (bullet list)

2. **Context & Background**
   - PRD Section 7.4 capability requirements
   - Current OpenCode provider implementation gaps
   - User expectations vs delivery

3. **Option Analysis**

   **Option A: Document Limitations**
   - Effort: 1-2 days
   - Business impact: Low (maintains status quo, sets expectations)
   - Technical feasibility: High (documentation only)
   - Risk: Low (no code changes)

   **Option B: Implement Full Support**
   - Effort: 4-6 weeks
   - Business impact: High (delivers on PRD promises)
   - Technical feasibility: Medium (SDK limitations, architectural mismatch)
   - Risk: High (server dependency, deployment complexity)

   **Option C: Remove Provider**
   - Effort: 1 week (deprecation + removal)
   - Business impact: Medium (loss of multi-provider differentiation)
   - Technical feasibility: High (delete code, update docs)
   - Risk: Medium (breaking change for existing users)

4. **Risk Assessment**
   - Breaking change impact analysis
   - Migration complexity
   - User communication strategy

5. **Recommendation**
   - Chosen option with detailed rationale
   - Implementation timeline
   - Success metrics

6. **Appendices**
   - Capability comparison matrix
   - Effort estimation methodology
   - References to architecture docs

## All Needed Context

### Context Completeness Check

_Before writing this PRP, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"_

### Documentation & References

```yaml
# MUST READ - Critical context for decision analysis

- url: https://www.npmjs.com/package/@opencode-ai/sdk
  why: OpenCode SDK documentation to understand capabilities and limitations
  critical: Client-server architecture requires external server process; tools executed server-side with no client delegation

- file: /home/dustin/projects/groundswell/src/providers/opencode-provider.ts
  why: Current OpenCode provider implementation showing LLM-only mode limitation
  pattern: Lines 7-20 document critical gaps (no MCP/LSP, no tool execution)
  gotcha: Provider implements Provider interface but with capabilities.mcp=false and capabilities.lsp=false

- file: /home/dustin/projects/groundswell/src/types/providers.ts
  why: Provider interface and ProviderCapabilities specification from PRD 7.4
  pattern: Lines 17-30 define capability flags (mcp, skills, lsp, streaming, sessions, extendedThinking)
  gotcha: PRD expects all providers to support MCP and LSP for tool execution

- file: /home/dustin/projects/groundswell/plan/003_dd63ad365ffb/docs/architecture/external_dependencies.md
  why: Complete OpenCode SDK API analysis and architectural comparison
  section: Lines 333-1225 (OpenCode Agent SDK section)
  critical: "CRITICAL ARCHITECTURAL MISMATCH" section at lines 1123-1178 details server dependency issues

- file: /home/dustin/projects/groundswell/PRD.md
  why: Product requirements for provider capabilities (Section 7.4)
  section: Lines 377-430 (Provider Capabilities specification)
  gotcha: PRD promises feature parity across providers; OpenCode currently delivers subset

- docfile: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M3T1S1/research/decision-analysis-research.md
  why: Best practices for engineering decision documents, ADR templates, evaluation frameworks
  section: Complete file (weighted decision matrix, RICE prioritization, risk assessment)

- file: /home/dustin/projects/groundswell/src/providers/anthropic-provider.ts
  why: Reference implementation showing full MCP/LSP integration
  pattern: Lines 200-400 show MCP server registration via createSdkMcpServer
  gotcha: AnthropicProvider achieves PRD compliance; OpenCodeProvider does not
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell
├── src/
│   ├── providers/
│   │   ├── anthropic-provider.ts      # Reference: full PRD compliance
│   │   ├── opencode-provider.ts       # LLM-only mode, gaps documented
│   │   ├── provider-registry.ts       # Provider lifecycle management
│   │   └── index.ts
│   └── types/
│       └── providers.ts               # Provider interface, ProviderCapabilities
├── plan/003_dd63ad365ffb/
│   ├── docs/architecture/
│   │   └── external_dependencies.md   # SDK capability analysis
│   └── bugfix/001_45bfbada88e7/
│       └── P1M3T1S1/
│           └── opencode-decision.md   # [TO BE CREATED]
└── PRD.md                              # Section 7.4 provider requirements
```

### Desired Codebase Tree (After Decision Implementation)

```bash
# If Option A (Document Limitations) chosen:
plan/003_dd63ad365ffb/docs/
├── providers.md                        # Updated with OpenCode limitations
└── migration-guide.md                  # New: provider selection guide

# If Option B (Implement Full Support) chosen:
src/providers/
└── opencode-provider.ts                # Updated with full MCP/LSP support

# If Option C (Remove Provider) chosen:
src/providers/
└── opencode-provider.ts                # DEPRECATED (removed in next major version)
docs/
└── deprecation-notice.md               # Migration guide for existing users
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: OpenCode SDK architectural mismatch
// The SDK is a client library for an external server, not a standalone execution library
// Unlike Anthropic Agent SDK, it requires:
// 1. External 'opencode' server process (npm install -g opencode)
// 2. HTTP/WebSocket communication (adds deployment complexity)
// 3. Server-side session storage (doesn't align with Groundswell's in-memory abstraction)
// 4. No client-side tool execution (tools run server-side, cannot integrate MCPHandler)

// CRITICAL: Current implementation documents this in opencode-provider.ts:7-20
// "OpenCode executes tools server-side and does not support client-side tool delegation"
// "This provider operates in LLM-only mode"
// Lines 97-110 set capabilities.mcp=false and capabilities.lsp=false

// GOTCHA: Provider interface requires registerMCPs() method
// OpenCodeProvider implements this but returns empty array (line 824)
// Method exists for interface compliance but cannot function due to SDK limitations

// GOTCHA: PRD Section 7.4 expects all providers to support:
// - MCP server connections (for tool execution via MCPHandler)
// - LSP integration (for code intelligence)
// Current OpenCodeProvider sets both to false in capabilities

// PATTERN: Provider capabilities are declared in readonly property
// readonly capabilities: ProviderCapabilities = { mcp, skills, lsp, streaming, sessions, extendedThinking }
// This is how feature detection works across the codebase

// GOTCHA: Multi-provider promise in PRD vs delivery
// PRD advertises "multi-provider Agent SDK support (Anthropic + OpenCode)"
// Reality: Anthropic = full support, OpenCode = LLM-only mode
```

## Implementation Blueprint

### Data Models and Structure

No new data models needed for this task. The decision document is a research/deliverable artifact.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: ANALYZE current state vs PRD requirements
  - COMPARE: ProviderCapabilities interface (src/types/providers.ts:17-30) vs OpenCodeProvider capabilities (src/providers/opencode-provider.ts:97-110)
  - EXTRACT: All PRD mentions of OpenCode provider (search PRD.md for "opencode", "multi-provider")
  - DOCUMENT: Gap matrix showing which capabilities are missing
  - DELIVERABLE: Table showing current vs required state

Task 2: RESEARCH Option A (Document Limitations)
  - EFFORT: 1-2 days for documentation updates
  - SCOPE: Update providers.md, add deprecation notices, create migration guide
  - BUSINESS IMPACT: Low effort, maintains user expectations
  - TECHNICAL FEASIBILITY: High (documentation only, no code changes)
  - RISK: Low (no breaking changes)
  - TEST COVERAGE: No new tests needed

Task 3: RESEARCH Option B (Implement Full Support)
  - EFFORT: 4-6 weeks for full implementation
  - SCOPE: Client-side tool delegation, MCP integration, LSP integration, rewrite opencode-provider.ts
  - BLOCKERS: OpenCode SDK doesn't support client-side tool execution (architectural limitation)
  - WORKAROUND: Would require forked SDK or different approach
  - BUSINESS IMPACT: High (delivers PRD promises)
  - TECHNICAL FEASIBILITY: Medium-Low (fundamental SDK limitation)
  - RISK: High (server dependency, deployment complexity, maintenance burden)
  - TEST COVERAGE: Full test suite rewrite for OpenCode provider

Task 4: RESEARCH Option C (Remove Provider)
  - EFFORT: 1 week for deprecation + removal
  - SCOPE: Deprecate in current version, remove in next major version, migration guide
  - BUSINESS IMPACT: Medium (loss of multi-provider differentiation)
  - TECHNICAL FEASIBILITY: High (delete code, update docs)
  - RISK: Medium (breaking change for existing users)
  - TEST COVERAGE: Remove OpenCode-specific tests, update provider tests

Task 5: CREATE decision analysis document
  - FILE: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/opencode-decision.md (NEW FILE)
  - TEMPLATE: Use decision-analysis-research.md frameworks (ADR template, weighted matrix)
  - STRUCTURE: Executive summary, context, option analysis, risk assessment, recommendation, appendices
  - FOLLOW: Architecture Decision Record (ADR) format from research
  - INCLUDE: All findings from Tasks 1-4

Task 6: VALIDATE document completeness
  - REVIEW: Against "Context Completeness Check" criteria
  - VERIFY: All three options analyzed with effort/business/technical/risk dimensions
  - CONFIRM: Recommendation is clear and actionable
  - APPROVAL: Ready for product/engineering leadership review
```

### Implementation Patterns & Key Details

```markdown
# Decision Document Structure (based on research)

## Executive Summary (2-minute read)
- Current state: OpenCode provider in LLM-only mode, missing MCP/LSP capabilities required by PRD
- Three options comparison table
- Recommended option with 3-sentence rationale
- Next steps for P1.M3.T1.S2

## Context
- PRD Section 7.4 requirements (quote specific lines)
- Current implementation state (reference opencode-provider.ts:7-20, 97-110)
- User expectations vs delivery gap

## Option Analysis
Use weighted decision matrix from research:

| Criteria | Weight | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| Effort   | 0.25   | 9/10     | 2/10     | 7/10     |
| Impact   | 0.35   | 4/10     | 9/10     | 5/10     |
| Feasibility | 0.25 | 9/10     | 3/10     | 8/10     |
| Risk     | 0.15   | 9/10     | 2/10     | 6/10     |

## Risk Assessment
- Breaking change analysis (consumer-by-consumer impact)
- Migration complexity assessment
- Rollback plans with triggers

## Recommendation
- Chosen option
- Rationale (data-driven, references to analysis)
- Implementation timeline
- Success metrics (measurable outcomes)
```

### Integration Points

```yaml
DECISION DOCUMENT:
  - location: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/opencode-decision.md
  - format: Markdown (following ADR template from research)
  - audience: Product and Engineering Leadership
  - approval: Required before P1.M3.T1.S2 implementation

FOLLOW-UP TASKS:
  - P1.M3.T1.S2: Execute OpenCode provider resolution (depends on decision)
  - Update PRD.md if Option C chosen (remove multi-provider claims)
  - Update docs/providers.md with final decision outcome
```

## Validation Loop

### Level 1: Document Completeness (Immediate Feedback)

```bash
# Validate document structure exists
test -f plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/opencode-decision.md

# Check required sections exist
grep -q "## Executive Summary" opencode-decision.md
grep -q "## Option Analysis" opencode-decision.md
grep -q "## Recommendation" opencode-decision.md

# Verify all three options are analyzed
grep -q "Option A" opencode-decision.md
grep -q "Option B" opencode-decision.md
grep -q "Option C" opencode-decision.md

# Expected: All checks pass, document is complete and structured
```

### Level 2: Content Quality Review

```bash
# Verify effort estimates match specification
grep -E "1-2 days|4-6 weeks|1 week" opencode-decision.md

# Check business impact analysis exists
grep -q "business impact" opencode-decision.md

# Verify technical feasibility assessment
grep -q "technical feasibility" opencode-decision.md

# Check risk assessment is present
grep -q "risk" opencode-decision.md

# Expected: All analysis dimensions present, estimates match requirements
```

### Level 3: Leadership Approval (Stakeholder Validation)

```bash
# Document review by product/engineering leadership
# Approval gate: Decision is accepted before P1.M3.T1.S2 begins

# Validation questions for leadership:
# 1. Is the recommendation clear and actionable?
# 2. Are the trade-offs well-communicated?
# 3. Is the implementation timeline realistic?
# 4. Are the risks adequately addressed?

# Expected: Leadership approval to proceed with P1.M3.T1.S2
```

### Level 4: Decision Execution Readiness

```bash
# Verify P1.M3.T1.S2 task dependencies are clear
cat plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P1M3T1S1/opencode-decision.md | grep "Next Steps"

# Confirm migration path exists (if Option C)
cat opencode-decision.md | grep -A 10 "Migration Path"

# Check success metrics are defined
cat opencode-decision.md | grep "Success Metrics"

# Expected: Clear path forward for P1.M3.T1.S2 execution
```

## Final Validation Checklist

### Technical Validation

- [ ] All required sections present (Executive Summary, Context, Option Analysis, Risk Assessment, Recommendation)
- [ ] Three options fully analyzed (effort, business impact, technical feasibility, risk)
- [ ] Effort estimates match requirements (A: 1-2 days, B: 4-6 weeks, C: 1 week)
- [ ] References to source files are specific (file paths with line numbers)
- [ ] Decision framework is documented (methodology transparency)

### Feature Validation

- [ ] Executive summary is actionable (2-minute read max)
- [ ] Recommendation includes clear rationale
- [ ] Migration path defined (if breaking changes)
- [ ] Success metrics are measurable
- [ ] Test coverage implications addressed

### Code Quality Validation

- [ ] No code modifications required (this is a research/deliverable task)
- [ ] Document follows markdown best practices
- [ ] Tables are properly formatted
- [ ] Links and references are valid

### Documentation & Deployment

- [ ] Decision document is stored at correct path
- [ ] Document is version-controlled (committed to repo)
- [ ] Leadership approval workflow documented
- [ ] Next steps for P1.M3.T1.S2 are clear

---

## Anti-Patterns to Avoid

- Don't modify any source code (this is a research/documentation task)
- Don't make recommendations without data backing (use weighted scoring)
- Don't ignore the architectural mismatch documented in external_dependencies.md
- Don't underestimate effort for Option B (SDK limitation is fundamental, not a bug)
- Don't proceed to P1.M3.T1.S2 without leadership approval
- Don't forget to update PRD.md if Option C is chosen (remove multi-provider claims)

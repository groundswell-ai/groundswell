# Agent Introspection and Self-Awareness Research

Complete research package on implementing agent introspection capabilities in the Groundswell workflow orchestration framework.

---

## Quick Navigation

### For Everyone: Start Here
- **[INTROSPECTION_RESEARCH_SUMMARY.md](./INTROSPECTION_RESEARCH_SUMMARY.md)** - Overview, key findings, and implementation roadmap (5 min read)

### For Framework Developers
- **[agent-introspection-patterns.md](./agent-introspection-patterns.md)** - Complete patterns, architecture, integration with Groundswell (30 min read)
- **[introspection-tool-examples.md](./introspection-tool-examples.md)** - Ready-to-implement tool definitions with examples (20 min read)

### For Security and Operations Teams
- **[introspection-security-guide.md](./introspection-security-guide.md)** - Threat models, mitigations, implementation checklist (25 min read)

---

## Research Scope

This research covers how agents in an AI orchestration framework can introspect and gain awareness of:

### What Agents Can Inspect
1. **Their Position in Workflow Hierarchy**
   - Parent, ancestors, siblings relationships
   - Depth in tree
   - Execution status

2. **Ancestor Workflow Outputs**
   - Results from parent and prior workflows
   - Structured execution data
   - Performance metrics

3. **Cache Status**
   - Which results are cached
   - Cache freshness
   - Cache hit rates

4. **Execution History**
   - Events that occurred
   - Errors and warnings
   - Tool invocations

5. **State Snapshots**
   - Internal state at decision points
   - Captured via @ObservedState decorators
   - State evolution over time

### What Agents Can Do (Self-Modification)
1. **Spawn Child Workflows**
   - Create parallel or sequential children
   - Via pre-approved templates only
   - With resource limits and approval

2. **Generate Dynamic Prompts**
   - Create context-aware prompts for children
   - Based on current analysis
   - With safety validation

### What Agents CANNOT Do
- Modify their own code or prompts
- Modify parent or sibling state
- Create arbitrary workflows (only templates)
- Access secrets in state
- Query unbounded results
- Modify or delete execution history

---

## Key Findings Summary

### Seven Core Introspection Tools

All tools follow Anthropic's JSON Schema tool format:

| Tool Name | Purpose | Risk Level |
|-----------|---------|-----------|
| `workflow_inspect_hierarchy` | Discover position in tree | LOW |
| `workflow_read_ancestor_outputs` | Access parent results | MEDIUM |
| `workflow_inspect_cache` | Check cache status | LOW |
| `workflow_read_event_history` | Review what happened | LOW |
| `workflow_inspect_state_snapshot` | View internal state | MEDIUM |
| `workflow_spawn_child` | Create child workflows | HIGH |
| `workflow_generate_dynamic_prompt` | Create prompts | HIGH |

### Security Principles

1. **Read-Only First**: Introspection tools never modify state
2. **Explicit Filters**: Agents explicitly request data they need
3. **Hard Limits**: All queries have maximum bounds (depth, items, size, time)
4. **Output Validation**: Ancestor outputs treated as untrusted input
5. **Template-Based**: Spawning requires pre-approved templates
6. **Audit Everything**: All introspection queries are logged
7. **Tenant Isolation**: Agents only see their own workflow tree

### Threat Mitigation

| Threat | Mitigation |
|--------|-----------|
| Secret Exfiltration | Redaction patterns, secret filtering |
| Prompt Injection | Output validation, injection detection |
| Privilege Escalation | Template-based spawning, depth limits |
| Denial of Service | Query limits (depth, items, size, time, rate) |

---

## Implementation Phases

### Phase 1: Introspection (Weeks 1-2)
Low-risk inspection tools without spawning
- `workflow_inspect_hierarchy`
- `workflow_read_ancestor_outputs`
- `workflow_inspect_cache`
- `workflow_read_event_history`
- `workflow_inspect_state_snapshot`

### Phase 2: Security (Weeks 3-4)
Add protections and validation
- Input schema validation
- Output sanitization
- Secret filtering
- Audit logging

### Phase 3: Self-Modification (Weeks 5-6)
Add controlled spawning
- `workflow_spawn_child` (template-based)
- `workflow_generate_dynamic_prompt` (validated)
- Resource enforcement
- Privilege checks

### Phase 4: Operations (Weeks 7-8)
Production readiness
- Monitoring and alerting
- Documentation
- Testing (unit, integration, penetration)

---

## File Organization

```
plan/research/
├── README-INTROSPECTION.md                 ← You are here
├── INTROSPECTION_RESEARCH_SUMMARY.md       ← Executive summary
├── agent-introspection-patterns.md         ← Main technical reference
├── introspection-tool-examples.md          ← Code examples
└── introspection-security-guide.md         ← Security deep-dive
```

---

## Groundswell Integration Points

### Existing Architecture

The Groundswell codebase already has everything needed:

**EventTreeHandle** (src/core/event-tree.ts)
- Already implements `getAncestors()` and `getChildren()`
- Can be extended for introspection

**WorkflowContext** (src/core/workflow-context.ts)
- Already maintains connection to root workflow
- Can provide execution context

**WorkflowNode** (src/types/workflow.ts)
- Already tracks hierarchy
- Can expose hierarchy info to agents

**Agent** (src/core/agent.ts)
- Already supports tool invocation
- Can register introspection tools

### New Components Needed

```typescript
// src/core/introspection-service.ts
class WorkflowIntrospectionService {
  inspectHierarchy(nodeId?: string): HierarchyInfo
  readAncestorOutputs(ancestorId?: string): object
  inspectCache(nodeId?: string): object
  readEventHistory(...): object
  inspectStateSnapshot(...): object
}

// src/core/introspection-tools.ts
function createIntrospectionTools(
  introspectionService: WorkflowIntrospectionService
): Tool[]

// src/types/introspection.ts
interface HierarchyInfo { ... }
interface IntrospectionLimits { ... }
interface StateAccessPolicy { ... }
```

---

## Starting Points for Different Roles

### Framework Developer
1. Read INTROSPECTION_RESEARCH_SUMMARY.md (10 min)
2. Read agent-introspection-patterns.md (30 min)
3. Review introspection-tool-examples.md (20 min)
4. Look at "Implementation Patterns for Groundswell" section
5. Create src/core/introspection-service.ts based on examples

### Security Engineer
1. Read INTROSPECTION_RESEARCH_SUMMARY.md (10 min)
2. Review introspection-security-guide.md (25 min)
3. Work through threat models and mitigations
4. Create implementation checklist
5. Plan penetration testing

### DevOps / Operations
1. Read INTROSPECTION_RESEARCH_SUMMARY.md (10 min)
2. Review "Operational Recommendations" in security-guide.md
3. Plan monitoring setup
4. Create incident response procedures
5. Set up audit logging

### Agent Developer / User
1. Read INTROSPECTION_RESEARCH_SUMMARY.md (10 min)
2. Review introspection-tool-examples.md (20 min)
3. Study "Integration Patterns" section
4. Review security checklist
5. Test with provided examples

---

## Key Concepts Explained

### Hierarchy Introspection

Agents live in a tree of workflows:

```
Root Workflow
├── Child 1 (Agent working here)
│   ├── Grandchild 1
│   ├── Grandchild 2 (Agent working here)
│   └── Grandchild 3
└── Child 2
    └── Grandchild 4
```

Via `workflow_inspect_hierarchy`, Agent can learn:
- "I'm Grandchild 2"
- "My parent is Child 1"
- "My siblings are Grandchild 1 and 3"
- "My ancestors are Child 1 and Root Workflow"
- "I'm 3 levels deep"

### Output Introspection

Each workflow produces outputs. Via `workflow_read_ancestor_outputs`:
- "What did my parent output?"
- "What did my grandparent output?"
- "Here's the full chain: Root → Child 1 → Me"

Agents use this to understand what prior workflows accomplished.

### State Snapshots

Workflows can declare state with `@ObservedState`:
```typescript
class MyWorkflow {
  @ObservedState() errorCount = 0;
  @ObservedState() successRate = 1.0;
}
```

Via `workflow_inspect_state_snapshot`:
- "What was the error count when I started?"
- "How did the success rate change over time?"
- "What was the state at each decision point?"

### Self-Modification

Agents can spawn children, but only:
- Using pre-approved templates
- With resource limits
- With parent approval (checked at runtime)
- With depth-based capability degradation

Example:
```
Root (can spawn any template, max 5 children)
└── Processor (can spawn data_validation template, max 10 children)
    ├── Validator 1 (cannot spawn any children)
    ├── Validator 2 (cannot spawn any children)
    └── Validator 3 (cannot spawn any children)
```

---

## Security Assumptions

This research assumes:

1. **Anthropic API is secure** (latest Claude models, official SDK)
2. **Sandboxed execution** available (container-based isolation)
3. **Audit logging** implemented (all queries logged)
4. **Network isolation** available (tool execution restricted)
5. **Secret management** in place (no secrets in code)

If any assumption is violated, refer to security guide for alternatives.

---

## References and Sources

All research is based on:

- **Anthropic Research**: Introspection in LLMs, Tool Use, Agent SDK
- **MCP Protocol**: Model Context Protocol tool specifications
- **Security Research**: AgentArmor, design patterns from Stanford/Berkeley
- **Cloud Providers**: AWS Bedrock, Google ADK, Azure AI Agent Service
- **Frameworks**: LangGraph, CrewAI, LangChain patterns

See each document for full citations.

---

## Questions?

1. **General questions?** See INTROSPECTION_RESEARCH_SUMMARY.md FAQ section
2. **Technical questions?** See agent-introspection-patterns.md
3. **Security questions?** See introspection-security-guide.md
4. **Implementation questions?** See introspection-tool-examples.md

---

## Contributing to This Research

If you discover:
- Issues with recommendations
- New threat vectors
- Better security patterns
- Optimization opportunities

Please file a GitHub issue with details and we'll update the research.

---

**Status**: COMPLETE - Ready for implementation
**Confidence**: HIGH - Based on production research and patterns
**Applicable To**: All workflow orchestration frameworks (especially Groundswell)
**Last Updated**: December 8, 2025


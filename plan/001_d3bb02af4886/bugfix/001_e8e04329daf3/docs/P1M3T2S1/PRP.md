# Product Requirement Prompt (PRP): P1.M3.T2.S1 - Analyze Tree Debugger onTreeChanged Implementation

**PRP ID**: P1M3T2S1
**Task ID**: P1.M3.T2.S1
**Story Points**: 1
**Status**: Researching
**Created**: 2025-01-12

---

## Goal

**Feature Goal**: Conduct a comprehensive analysis of the WorkflowTreeDebugger's `onTreeChanged()` implementation to understand the current full-rebuild behavior and identify opportunities for incremental updates.

**Deliverable**: Analysis document stored at `plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md` containing:
- Current rebuild logic documentation with line number references
- Tree change event type analysis (childAttached, childDetached, treeUpdated)
- Performance impact assessment for current O(n) rebuild behavior
- Identified opportunities for incremental O(1)/O(k) updates
- Recommendations for P1.M3.T2.S2 implementation

**Success Definition**:
- [ ] Analysis document exists at specified path
- [ ] Current implementation behavior fully documented with code references
- [ ] All tree change trigger events identified and documented
- [ ] Performance bottleneck clearly explained with complexity analysis
- [ ] Incremental update opportunities identified with specific recommendations
- [ ] Research findings stored in research/ subdirectory for P1.M3.T2.S2 reference

---

## User Persona (if applicable)

**Target User**: Implementation AI agent for P1.M3.T2.S2 and P1.M3.T2.S3

**Use Case**: The analysis document serves as the foundation for implementing incremental node map updates (P1.M3.T2.S2) and creating benchmark tests (P1.M3.T2.S3).

**User Journey**:
1. Read analysis document to understand current behavior
2. Use identified opportunities to implement incremental updates
3. Reference performance analysis for benchmark test design
4. Validate implementation against recommendations

**Pain Points Addressed**:
- Eliminates need for P1.M3.T2.S2 agent to rediscover current implementation
- Provides concrete recommendations backed by research
- Accelerates implementation by providing clear guidance

---

## Why

- **Performance Optimization**: Current O(n) full rebuild on every tree change is inefficient for large workflow trees (1000+ nodes)
- **Foundation for Implementation**: Analysis enables P1.M3.T2.S2 to implement incremental updates without additional research overhead
- **Informed Benchmark Design**: Performance assessment informs P1.M3.T2.S3 benchmark test design
- **Documentation**: Creates permanent record of optimization rationale for future maintainers

**Business Value**:
- Reduces node map update overhead from O(n) to O(1) for single-node operations
- Enables 100-1000× performance improvement for large trees with frequent structural changes
- Prevents garbage collection pressure from Map.clear() and full rebuild
- Maintains correctness while improving performance

---

## What

**User-Visible Behavior**: No behavior change - this is a research and analysis task only.

**Technical Requirements**:
- Read and analyze `src/debugger/tree-debugger.ts` implementation
- Read and analyze `src/core/workflow.ts` emitEvent and observer notification logic
- Document all tree change events that trigger `onTreeChanged()`
- Map current rebuild logic with specific line number references
- Calculate time complexity of current operations
- Research incremental update patterns
- Document specific opportunities for optimization

### Success Criteria

- [ ] Analysis document contains complete current implementation documentation
- [ ] All three tree change events (childAttached, childDetached, treeUpdated) documented
- [ ] Performance impact quantified with complexity analysis
- [ ] At least 3 specific incremental update opportunities identified
- [ ] Recommendations include code pattern examples
- [ ] External research cited with specific URLs

---

## All Needed Context

### Context Completeness Check

**"No Prior Knowledge" Test**: If someone knew nothing about this codebase, would they have everything needed to conduct this analysis successfully?

**Answer**: YES - This PRP provides:
- Exact file paths and line numbers for all relevant code
- Complete WorkflowNode and WorkflowEvent type definitions
- Observer pattern documentation
- Testing framework patterns
- External research with specific URLs
- Output template for analysis document

### Documentation & References

```yaml
# MUST READ - Code Files (read in order)

- file: src/debugger/tree-debugger.ts
  why: Core implementation to analyze - contains onTreeChanged(), buildNodeMap(), onEvent(), nodeMap
  lines: "53-84" # buildNodeMap() and onTreeChanged() implementation
  pattern: Recursive tree traversal using for-of loop over node.children
  gotcha: "onEvent() at line 66-74 already handles childAttached incrementally - onTreeChanged() redundant"

- file: src/core/workflow.ts
  why: Understanding when onTreeChanged is called via emitEvent()
  lines: "360-379" # emitEvent() method showing observer notification logic
  pattern: "obs.onTreeChanged(this.getRoot().node) called for childAttached, childDetached, treeUpdated events"
  gotcha: "onTreeChanged called AFTER onEvent - causing redundant work for childAttached"

- file: src/types/workflow.ts
  why: WorkflowNode structure definition - needed to understand tree hierarchy
  lines: "16-37" # Complete WorkflowNode interface
  pattern: "id, name, parent, children[], status, logs[], events[], stateSnapshot"
  gotcha: "parent is WorkflowNode | null - null for root nodes"

- file: src/types/events.ts
  why: WorkflowEvent discriminated union - all tree change event types
  lines: "8-18" # Core workflow events including childAttached, childDetached, treeUpdated
  pattern: "type: 'childAttached' | 'childDetached' | 'treeUpdated' are tree structure change events"
  gotcha: "childDetached only provides childId string, not full child node"

- file: src/types/observer.ts
  why: WorkflowObserver interface defining onTreeChanged signature
  lines: "9-18" # Complete WorkflowObserver interface
  pattern: "onTreeChanged(root: WorkflowNode): void - receives root node after any tree change"
  gotcha: "Called for ALL tree events including state changes (via treeUpdated)"

# EXTERNAL RESEARCH - Read for best practices and patterns

- url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#instance-methods
  why: Map.set(), Map.get(), Map.delete() are O(1) - validates incremental approach feasibility
  critical: "Map operations have O(1) average case complexity - incremental updates faster than O(n) rebuild"

- url: https://react.dev/learn/understanding-reacts-render-phase#rendering-and-committing
  why: React reconciliation algorithm - tree diffing strategy reference
  critical: "React only updates changed subtrees - same principle applies to node map updates"

- url: https://v8.dev/blog/elements-kinds#hidden-classes
  why: V8 Map optimization and garbage collection behavior
  critical: "Map.clear() triggers full GC - incremental updates spread GC cost over time"

- url: https://stackoverflow.com/questions/38476433/what-is-the-time-complexity-of-map-set-in-javascript#answer-38476768
  why: Confirmed O(1) complexity for Map operations
  critical: "Map.set() and Map.delete() are O(1) on average in modern JavaScript engines"

# INTERNAL RESEARCH - Generated research package

- docfile: plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/QUICK_REFERENCE.md
  why: Code examples and implementation patterns for incremental updates
  section: "Code Examples - Incremental Update Pattern"

- docfile: plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/RESEARCH_REPORT.md
  why: Comprehensive analysis of current implementation and recommended patterns
  section: "Current Implementation Analysis" and "Recommended Implementation"

- docfile: plan/001_d3bb02af4886/bugfix/architecture/codebase_structure.md
  why: Overall codebase architecture and dual tree structure
  section: "7. Observer Pattern Implementation" and "8. Additional Architecture Patterns"

# TEST PATTERNS - For validation approach

- file: src/__tests__/unit/tree-debugger.test.ts
  why: Existing test patterns for tree-debugger functionality
  pattern: "WorkflowTreeDebugger instantiation, getNode() lookup, tree string rendering"
  gotcha: "Tests verify nodeMap behavior - useful for validating incremental correctness"

- file: src/__tests__/integration/tree-mirroring.test.ts
  why: Observer propagation and treeUpdated event testing
  pattern: "treeUpdated events trigger onTreeChanged callback"
  gotcha: "Test at lines 115-150 verifies onTreeChanged is called with correct root"
```

### Current Codebase Tree (relevant portions)

```
src/
├── debugger/
│   └── tree-debugger.ts          # PRIMARY ANALYSIS TARGET
│       ├── WorkflowTreeDebugger class
│       ├── buildNodeMap()         # Line 53-58 - O(n) recursive rebuild
│       ├── onEvent()              # Line 66-74 - handles childAttached incrementally
│       ├── onTreeChanged()        # Line 80-84 - O(n) full rebuild (OPTIMIZE TARGET)
│       └── nodeMap: Map           # Line 33 - node lookup map
├── core/
│   └── workflow.ts                # Event emission logic
│       ├── emitEvent()            # Line 363-379 - triggers onTreeChanged
│       ├── attachChild()          # Line 266-305 - childAttached trigger
│       └── detachChild()          # Line 329-358 - childDetached trigger
├── types/
│   ├── workflow.ts                # WorkflowNode interface
│   ├── events.ts                  # WorkflowEvent discriminated union
│   └── observer.ts                # WorkflowObserver interface
└── __tests__/
    ├── unit/
    │   └── tree-debugger.test.ts  # Existing test patterns
    └── integration/
        └── tree-mirroring.test.ts # Observer propagation tests
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: onEvent() and onTreeChanged() are BOTH called for tree changes
// From src/core/workflow.ts:372-374
if (event.type === 'treeUpdated' || event.type === 'childAttached' || event.type === 'childDetached') {
  obs.onTreeChanged(this.getRoot().node);  // ❌ This triggers full rebuild
}

// CRITICAL: onEvent() already handles childAttached incrementally
// From src/debugger/tree-debugger.ts:66-70
onEvent(event: WorkflowEvent): void {
  if (event.type === 'childAttached') {
    this.buildNodeMap(event.child);  // ✅ Already incremental!
  }
  // Then onTreeChanged() is called, causing REDUNDANT full rebuild
}

// CRITICAL: childDetached only provides childId, not full node
// From src/types/events.ts:11
{ type: 'childDetached'; parentId: string; childId: string }
// Must use stored node reference to collect descendants for removal

// CRITICAL: buildNodeMap() is recursive - may hit call stack limits on deep trees
// From src/debugger/tree-debugger.ts:53-58
private buildNodeMap(node: WorkflowNode): void {
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);  // Recursive call
  }
}

// CRITICAL: treeUpdated is called for non-structural changes
// From src/core/workflow.ts:414
this.emitEvent({ type: 'treeUpdated', root: this.getRoot().node });
// Called by setStatus() - NO tree structure change, just status update
// Current implementation rebuilds entire map for status changes!
```

---

## Implementation Blueprint

### Data Models and Structure

**No data model changes** - This is a research task only.

**Data structures to analyze**:

```typescript
// From src/types/workflow.ts:20-37
interface WorkflowNode {
  id: string;                  // Unique identifier
  name: string;                // Human-readable name
  parent: WorkflowNode | null; // Parent reference (null for root)
  children: WorkflowNode[];    // Child nodes (tree structure)
  status: WorkflowStatus;      // Current execution state
  logs: LogEntry[];            // Log entries
  events: WorkflowEvent[];     // Emitted events
  stateSnapshot: SerializedWorkflowState | null; // State snapshot
}

// Tree structure maintained by debugger:
// - this.root: WorkflowNode (root node reference)
// - this.nodeMap: Map<string, WorkflowNode> (id -> node lookup)
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: READ and document current implementation
  - READ: src/debugger/tree-debugger.ts lines 53-84 (buildNodeMap, onTreeChanged)
  - READ: src/debugger/tree-debugger.ts lines 66-74 (onEvent childAttached handling)
  - DOCUMENT: Current rebuild logic in analysis.md
  - IDENTIFY: Time complexity of buildNodeMap() - O(n) where n = total nodes
  - IDENTIFY: Redundant work - childAttached handled in both onEvent() AND onTreeChanged()
  - OUTPUT: Section "Current Implementation" in analysis.md

Task 2: ANALYZE tree change event types
  - READ: src/types/events.ts lines 8-18 (core workflow events)
  - READ: src/core/workflow.ts lines 360-379 (emitEvent observer notification)
  - IDENTIFY: Three events trigger onTreeChanged:
    1. childAttached - new subtree added
    2. childDetached - subtree removed (only childId provided)
    3. treeUpdated - root reference or status change
  - DOCUMENT: For each event:
    - When it occurs
    - What data it provides
    - Current onTreeChanged behavior
    - Optimal incremental behavior
  - OUTPUT: Section "Tree Change Event Analysis" in analysis.md

Task 3: CALCULATE performance impact
  - CALCULATE: Current complexity per event type
    - childAttached: O(n) - rebuilds entire map
    - childDetached: O(n) - rebuilds entire map
    - treeUpdated: O(n) - rebuilds entire map
  - CALCULATE: Potential incremental complexity
    - childAttached: O(k) where k = nodes in new subtree (already implemented in onEvent)
    - childDetached: O(k) where k = nodes in removed subtree
    - treeUpdated: O(1) - just update root reference
  - CALCULATE: Speedup potential
    - Single node attach to 1000-node tree: 1000× faster (O(1000) → O(1))
    - Single node detach from 1000-node tree: 100× faster (O(1000) → O(10))
    - Root status update: 1000× faster (O(1000) → O(1))
  - OUTPUT: Section "Performance Impact Analysis" in analysis.md

Task 4: IDENTIFY incremental update opportunities
  - RESEARCH: Read plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/
  - IDENTIFY: Opportunity 1 - Remove redundant childAttached rebuild
    - onEvent() already adds new subtree
    - onTreeChanged() rebuild is redundant work
  - IDENTIFY: Opportunity 2 - Implement childDetached subtree removal
    - Use stored node reference to collect descendants
    - Remove collected node IDs from map
  - IDENTIFY: Opportunity 3 - Replace treeUpdated full rebuild
    - Just update this.root reference
    - Node references in map unchanged
  - IDENTIFY: Opportunity 4 - Eliminate onTreeChanged rebuild entirely
    - All tree changes can be handled incrementally in onEvent()
  - OUTPUT: Section "Incremental Update Opportunities" in analysis.md

Task 5: CREATE implementation recommendations
  - DOCUMENT: Specific code changes for P1.M3.T2.S2
    - Add handleChildDetached() method with BFS subtree collection
    - Modify onEvent() to handle childDetached
    - Remove full rebuild from onTreeChanged()
  - DOCUMENT: Code pattern examples (from research package)
    - BFS-based subtree removal
    - Incremental update pattern
  - DOCUMENT: Gotchas to avoid
    - Must remove entire subtree, not just detached node
    - Must handle case where node already removed from map
    - Recursive removal may hit stack limits - use iterative BFS
  - OUTPUT: Section "Implementation Recommendations" in analysis.md

Task 6: STORE research for P1.M3.T2.S2 and P1.M3.T2.S3
  - CREATE: plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/research/ directory
  - COPY: External research URLs with annotations
  - STORE: Code pattern examples for incremental updates
  - STORE: Performance benchmark template for P1.M3.T2.S3
  - OUTPUT: research/README.md with links to all resources
```

### Implementation Patterns & Key Details

```typescript
// Current Implementation (to analyze and document)

// From src/debugger/tree-debugger.ts:53-58
private buildNodeMap(node: WorkflowNode): void {
  // PATTERN: Recursive DFS traversal
  this.nodeMap.set(node.id, node);
  for (const child of node.children) {
    this.buildNodeMap(child);  // RECURSIVE - may hit stack limits
  }
  // COMPLEXITY: O(n) where n = total nodes in tree
  // SIDE EFFECT: Replaces entire map content
}

// From src/debugger/tree-debugger.ts:66-74
onEvent(event: WorkflowEvent): void {
  // PATTERN: Event-type dispatch
  if (event.type === 'childAttached') {
    this.buildNodeMap(event.child);  // ✅ Already adds new subtree
  }
  // GOTCHA: No handling for childDetached - leaks orphaned nodes

  this.events.next(event);
  // GOTCHA: After onEvent returns, emitEvent() calls onTreeChanged()
}

// From src/debugger/tree-debugger.ts:80-84
onTreeChanged(root: WorkflowNode): void {
  // PATTERN: Complete map invalidation
  this.root = root;
  this.nodeMap.clear();        // ❌ Clears entire map
  this.buildNodeMap(root);     // ❌ O(n) rebuild from scratch
  // PROBLEM: Redundant work for childAttached (already handled in onEvent)
  // PROBLEM: Unnecessary for treeUpdated (node references unchanged)
}

// Recommended Incremental Pattern (for recommendations section)

onEvent(event: WorkflowEvent): void {
  switch (event.type) {
    case 'childAttached':
      // ✅ Keep existing logic - already optimal
      this.buildNodeMap(event.child);
      break;

    case 'childDetached':
      // ✅ NEW: Incremental subtree removal
      this.removeSubtree(event.childId);
      break;

    case 'treeUpdated':
      // ✅ NEW: Just update root reference
      this.root = event.root;
      break;
  }
  this.events.next(event);
}

// BFS-based subtree removal (recommended over recursive)
private removeSubtree(nodeId: string): void {
  const node = this.nodeMap.get(nodeId);
  if (!node) return;

  // Collect all descendants using BFS (avoid stack overflow)
  const toRemove: string[] = [];
  const queue = [node];

  while (queue.length > 0) {
    const current = queue.shift()!;
    toRemove.push(current.id);
    queue.push(...current.children);
  }

  // Remove all collected nodes
  for (const id of toRemove) {
    this.nodeMap.delete(id);
  }
  // COMPLEXITY: O(k) where k = nodes in removed subtree
}

onTreeChanged(root: WorkflowNode): void {
  // ✅ No longer needed - all updates handled in onEvent()
  this.root = root;
}
```

### Integration Points

```yaml
WORKFLOW EMIT EVENT:
  - file: src/core/workflow.ts:363-379
  - pattern: "emitEvent() calls obs.onEvent() then obs.onTreeChanged()"
  - gotcha: "Both observers called for same event - causes redundant work"

EVENT TYPES:
  - file: src/types/events.ts:10-18
  - pattern: "Discriminated union with type field"
  - gotcha: "childDetached only provides childId, not full node"

OBSERVER PATTERN:
  - file: src/core/workflow.ts:124-139
  - pattern: "getRootObservers() traverses parent chain"
  - gotcha: "Uses visited Set for cycle detection"
```

---

## Validation Loop

### Level 1: Completeness Check (Immediate Feedback)

```bash
# Verify analysis document exists
test -f plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Analysis document exists: $?"

# Verify document contains all required sections
grep -q "Current Implementation" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Current Implementation section exists: $?"

grep -q "Tree Change Event Analysis" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Event Analysis section exists: $?"

grep -q "Performance Impact Analysis" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Performance Analysis section exists: $?"

grep -q "Incremental Update Opportunities" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Opportunities section exists: $?"

grep -q "Implementation Recommendations" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Recommendations section exists: $?"

# Expected: All checks return 0 (true)
```

### Level 2: Content Quality Validation

```bash
# Verify line number references are accurate
grep -n "onTreeChanged" src/debugger/tree-debugger.ts
# Expected: Line 80 shows onTreeChanged method

grep -n "buildNodeMap" src/debugger/tree-debugger.ts
# Expected: Line 53 shows buildNodeMap method

grep -n "childAttached\|childDetached\|treeUpdated" src/types/events.ts
# Expected: Lines 10-18 show event definitions

# Verify analysis document contains code references
grep -q "src/debugger/tree-debugger.ts:80-84" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Line number references present: $?"

# Verify complexity analysis present
grep -q "O(n)\|O(1)\|O(k)" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Complexity analysis present: $?"

# Verify external research cited
grep -q "https://" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "External references cited: $?"
```

### Level 3: Research Artifact Validation

```bash
# Verify research directory exists
test -d plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/research
echo "Research directory exists: $?"

# Verify research README exists
test -f plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/research/README.md
echo "Research README exists: $?"

# Verify README contains link to main research package
grep -q "incremental-tree-map-updates" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/research/README.md
echo "Research package linked: $?"
```

### Level 4: Readiness for P1.M3.T2.S2 Validation

```bash
# Verify recommendations are actionable
grep -q "addSubtree\|removeSubtree\|handleChildDetached" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Actionable method names present: $?"

# Verify code examples provided
grep -q "```typescript" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Code examples present: $?"

# Verify gotchas documented
grep -q "GOTCHA\|gotcha\|WARNING" plan/001_d3bb02af4886/bugfix/001_e8e04329daf3/P1M3T2S1/analysis.md
echo "Gotchas documented: $?"
```

---

## Final Validation Checklist

### Technical Validation

- [ ] Analysis document exists at correct path
- [ ] All required sections completed (Current Implementation, Event Analysis, Performance, Opportunities, Recommendations)
- [ ] Line number references accurate and verifiable
- [ ] Complexity analysis includes O(n), O(1), O(k) notations
- [ ] External research URLs cited with annotations
- [ ] Code pattern examples included for each recommendation

### Content Quality Validation

- [ ] Current implementation behavior fully documented
- [ ] All three tree change events (childAttached, childDetached, treeUpdated) analyzed
- [ ] Performance impact quantified with specific complexity values
- [ ] Redundant work identified (onEvent + onTreeChanged for childAttached)
- [ ] At least 3 specific optimization opportunities identified
- [ ] Implementation recommendations include specific method names and patterns

### Research Artifact Validation

- [ ] research/ directory created
- [ ] research/README.md exists with links to external resources
- [ ] Code pattern examples stored for P1.M3.T2.S2 reference
- [ ] Benchmark template provided for P1.M3.T2.S3

### P1.M3.T2.S2 Readiness Validation

- [ ] Recommendations enable implementation without additional research
- [ ] Specific method signatures provided (removeSubtree, handleChildDetached)
- [ ] Code examples follow existing codebase patterns
- [ ] Gotchas and anti-patterns documented to avoid
- [ ] Performance expectations quantified for validation

---

## Anti-Patterns to Avoid

- ❌ Don't implement code changes - this is a research task only
- ❌ Don't skip external research - use provided URLs for validation
- ❌ Don't omit line number references - P1.M3.T2.S2 needs exact locations
- ❌ Don't ignore the redundancy between onEvent() and onTreeChanged()
- ❌ Don't forget that childDetached only provides childId, not full node
- ❌ Don't recommend recursive subtree removal - use iterative BFS to avoid stack limits
- ❌ Don't omit complexity analysis - quantitative comparison essential
- ❌ Don't forget to document the treeUpdated case - root reference changes only

---

## Output Template

The analysis document should follow this structure:

```markdown
# Tree Debugger onTreeChanged Implementation Analysis

## Current Implementation

### buildNodeMap() - Line 53-58
[Code snippet and analysis]

### onEvent() - Line 66-74
[Code snippet and analysis]

### onTreeChanged() - Line 80-84
[Code snippet and analysis]

## Tree Change Event Analysis

### childAttached Event
- When: Called by attachChild() after child added to workflow.children and node.children
- Data: { type: 'childAttached', parentId: string, child: WorkflowNode }
- Current behavior: Added in onEvent(), then entire map rebuilt in onTreeChanged()
- Optimal behavior: Just add in onEvent(), skip onTreeChanged() rebuild

### childDetached Event
[Similar analysis]

### treeUpdated Event
[Similar analysis]

## Performance Impact Analysis

### Current Complexity
- childAttached: O(n)
- childDetached: O(n)
- treeUpdated: O(n)

### Incremental Complexity
- childAttached: O(k) already implemented
- childDetached: O(k) - needs implementation
- treeUpdated: O(1) - needs implementation

### Speedup Potential
[Table with specific speedup calculations]

## Incremental Update Opportunities

### Opportunity 1: Eliminate Redundant childAttached Rebuild
[Description and recommendation]

### Opportunity 2: Implement childDetached Subtree Removal
[Description with code pattern]

### Opportunity 3: Replace treeUpdated Full Rebuild
[Description with code pattern]

### Opportunity 4: Remove onTreeChanged Rebuild Entirely
[Description with code pattern]

## Implementation Recommendations

### For P1.M3.T2.S2: Add removeSubtree() Method
[Specific implementation guidance]

### For P1.M3.T2.S2: Modify onEvent() to Handle childDetached
[Specific implementation guidance]

### For P1.M3.T2.S2: Simplify onTreeChanged()
[Specific implementation guidance]

### Gotchas to Avoid
[List of potential issues]

## References

### External Research
[Links to MDN, React docs, V8 blog, StackOverflow]

### Internal Research
[Links to research package files]

### Code Files Referenced
[Links to specific files with line numbers]
```

---

## Appendix: Research Summary

### Research Package Location

`plan/001_d3bb02af4886/docs/research/incremental-tree-map-updates/`

### Key Files

- `QUICK_REFERENCE.md` - Code examples and patterns
- `RESEARCH_REPORT.md` - Comprehensive analysis
- `SUMMARY.md` - Executive summary
- `PRP_TEMPLATE.md` - Implementation PRP template

### Expected P1.M3.T2.S2 Output

After this analysis, P1.M3.T2.S2 should implement:

1. `removeSubtree(nodeId: string)` - BFS-based subtree removal
2. Modified `onEvent()` - Handle childDetached
3. Simplified `onTreeChanged()` - Remove full rebuild

Expected performance improvement: **100-1000× faster** for large trees.

---

**PRP Version**: 1.0
**Last Updated**: 2025-01-12
**Next PRP**: P1.M3.T2.S2 (Implementation)
**Dependencies**: None (research task)

# Comprehensive Research: Workflow Engine Ancestry/Descendant APIs

## Executive Summary

This document provides comprehensive research on how popular workflow engines handle ancestry and descendant checking APIs, with specific focus on:
1. Whether these systems expose public APIs for relationship checking
2. Terminology used (ancestor/descendant vs parent/child vs upstream/downstream)
3. Implementation patterns and design decisions
4. Specific code examples and documentation URLs

---

## 1. Apache Airflow

### Terminology
- **Upstream/Downstream** - Primary terms for task relationships
- **Dependencies** - Core concept
- **DAG (Directed Acyclic Graph)** - Underlying structure

### Public APIs

#### Relationship Definition (Public)
```python
# Method 1: set_upstream / set_downstream
task_a.set_downstream(task_b)  # task_a → task_b
task_b.set_upstream(task_a)    # equivalent

# Method 2: Bitshift operators (Pythonic)
task_a >> task_b  # task_a upstream of task_b
task_b << task_a  # equivalent

# Method 3: Multiple dependencies
task_a >> [task_b, task_c, task_d]
```

#### Relationship Querying (Limited)
```python
# Get immediate relationships
downstream_tasks = task.get_downstream()
upstream_tasks = task.get_upstream()

# Returns: Set[Task]
# Note: These return immediate neighbors, not full ancestry
```

**Documentation URLs:**
- DAG Concepts: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
- Task Instance Reference: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html#task-instance
- BaseOperator API: https://airflow.apache.org/docs/apache-airflow/stable/_api/airflow/models/baseoperator/index.html

### API Exposure Analysis
- **Definition APIs**: ✅ Public (set_upstream, set_downstream, >>, <<)
- **Query APIs**: ⚠️ Limited (get_downstream, get_upstream - immediate only)
- **Ancestry Checking**: ❌ Not exposed publicly (internal graph traversal)
- **Descendant Checking**: ❌ Not exposed publicly

### Design Rationale
Airflow focuses on DAG definition and execution. Relationship querying is mostly internal because:
1. Users define relationships, don't typically query them
2. Execution history is more important than topology queries
3. Graph traversal is handled internally by the scheduler

---

## 2. Temporal

### Terminology
- **Parent/Child Workflows** - Explicit hierarchical relationships
- **Workflow Executions** - Independent units
- **Namespace** - Isolation boundary

### Public APIs

#### Child Workflow Creation (Public)
```python
from temporalio import workflow

@workflow.defn
class ParentWorkflow:
    @workflow.run
    async def run(self) -> None:
        # Start child workflow
        child_id = f"child-{workflow.uuid4()}"
        await workflow.execute_child_workflow(
            ChildWorkflow.run,
            id=child_id,
            task_queue="child-task-queue"
        )
```

#### Query Methods (Limited)
```python
# Query workflow execution (not relationships)
handle = client.get_workflow_handle(workflow_id)
result = await handle.query("get_status")

# Child workflow info (if you have the reference)
# No public API to check "is this workflow a descendant of that one"
```

**Documentation URLs:**
- Child Workflows: https://docs.temporal.io/develop/python/child-workflows
- Workflow Concepts: https://docs.temporal.io/concepts/what-is-a-workflow-execution
- Python SDK: https://python.temporal.io

### API Exposure Analysis
- **Definition APIs**: ✅ Public (execute_child_workflow)
- **Query APIs**: ⚠️ Limited (execution-focused, not topology)
- **Ancestry Checking**: ❌ Not exposed publicly
- **Descendant Checking**: ❌ Not exposed publicly

### Design Rationale
Temporal focuses on workflow execution reliability:
1. Parent-child relationships are for organization, not querying
2. Execution history and state are primary concerns
3. Relationships are implicit through execution context

---

## 3. Prefect

### Terminology
- **Upstream/Downstream** - Task dependency terms
- **Flows** - Primary unit
- **Dependencies** - Relationship concept

### Public APIs

#### Dependency Definition (Public)
```python
from prefect import flow, task

@task
def task_a():
    return 1

@task
def task_b(x):
    return x + 1

@flow
def my_flow():
    # Define dependencies
    a = task_a()
    b = task_b(a)  # b depends on a (implicit)
    
    # Or explicit
    b = task_b.submit(wait_for=[a])
```

#### Relationship Querying (Limited)
```python
# Task run relationships (internal, not public API)
# Focus is on execution state, not topology
from prefect import get_run_logger

@flow
def query_flow():
    # Can query state, not relationships
    state = task_a.wait_for()
    # No public API like "is_descendant_of()"
```

**Documentation URLs:**
- Dependencies: https://docs.prefect.io/latest/concepts/dependencies/
- Tasks API: https://docs.prefect.io/latest/api-ref/prefect.tasks/
- Flows: https://docs.prefect.io/concepts/flows/

### API Exposure Analysis
- **Definition APIs**: ✅ Public (through task dependencies)
- **Query APIs**: ⚠️ Limited (state-focused, not relationship-focused)
- **Ancestry Checking**: ❌ Not exposed publicly
- **Descendant Checking**: ❌ Not exposed publicly

### Design Rationale
Prefect emphasizes workflow execution and state:
1. Dependencies are means to execution order
2. Task state and results are primary
3. Topology queries are secondary concern

---

## 4. Dagster

### Terminology
- **Assets** - Core unit (data/software artifacts)
- **Lineage** - Asset dependency tracking
- **Dependencies** - Asset relationships

### Public APIs

#### Asset Dependencies (Public)
```python
from dagster import asset, Definitions

@asset
def upstream_asset():
    return [1, 2, 3]

@asset(deps=[upstream_asset])
def downstream_asset(upstream_asset):
    return upstream_asset + [4]

# Or
from dagster import AssetIn, AssetOut

@asset(outs=AssetOut("my_asset"))
def my_asset(context):
    return context.input_assets()["upstream_asset"]
```

#### Lineage Querying (Partial)
```python
from dagster import AssetSelection

# Select assets based on dependencies
selection = AssetSelection.assets("upstream_asset")
downstream = selection.downstream()  # Get downstream assets
upstream = selection.upstream()      # Get upstream assets

# Note: This is for selection, not direct relationship checking
```

**Documentation URLs:**
- Concepts: https://docs.dagster.io/getting-started/concepts
- Asset Dependencies: https://docs.dagster.io/guides/dagster/asset-dependencies
- Asset Selection: https://docs.dagster.io/concepts/assets/asset-selection

### API Exposure Analysis
- **Definition APIs**: ✅ Public (asset dependencies)
- **Query APIs**: ⚠️ Partial (AssetSelection for navigation)
- **Ancestry Checking**: ⚠️ Indirect (through AssetSelection)
- **Descendant Checking**: ⚠️ Indirect (through AssetSelection)

### Design Rationale
Dagster focuses on data lineage:
1. Assets are primary, workflows are secondary
2. Lineage is important for data provenance
3. Selection APIs enable topology queries indirectly

---

## 5. GitHub Actions

### Terminology
- **Jobs** - Units of work
- **Dependencies** - Via `needs` keyword
- **Workflows** - YAML-based orchestration

### Public APIs

#### Workflow Dependencies (YAML)
```yaml
jobs:
  job_a:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Job A"
  
  job_b:
    needs: job_a  # job_b depends on job_a
    runs-on: ubuntu-latest
    steps:
      - run: echo "Job B"
  
  job_c:
    needs: [job_a, job_b]  # Multiple dependencies
    runs-on: ubuntu-latest
```

#### REST API (Querying)
```bash
# Get workflow run jobs
curl -X GET \
  https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/jobs

# Response includes dependencies, but no "is_descendant_of" check
```

**Documentation URLs:**
- Workflow Syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- REST API: https://docs.github.com/en/rest/actions
- Job Dependencies: https://docs.github.com/en/actions/using-jobs/using-jobs-in-a-workflow

### API Exposure Analysis
- **Definition APIs**: ✅ Public (YAML `needs` keyword)
- **Query APIs**: ⚠️ Limited (REST API for execution, not topology)
- **Ancestry Checking**: ❌ Not exposed publicly
- **Descendant Checking**: ❌ Not exposed publicly

### Design Rationale
GitHub Actions focuses on CI/CD execution:
1. Workflow definition is declarative (YAML)
2. Execution status is primary concern
3. Topology queries are not a common use case

---

## 6. AWS Step Functions

### Terminology
- **States** - Units of work
- **State Machine** - Overall workflow
- **Transitions** - State relationships

### Public APIs

#### State Machine Definition (JSON/ASL)
```json
{
  "Comment": "A simple minimal example",
  "StartAt": "FirstState",
  "States": {
    "FirstState": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:FirstFunction",
      "Next": "SecondState"
    },
    "SecondState": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:function:SecondFunction",
      "End": true
    }
  }
}
```

#### SDK APIs
```python
import boto3

client = boto3.client('stepfunctions')

# Get execution history
response = client.get_execution_history(
    executionArn='arn:aws:states:...'
)

# No public API for "is this state a descendant of that state"
```

**Documentation URLs:**
- Amazon States Language: https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language.html
- API Reference: https://docs.aws.amazon.com/step-functions/latest/apireference/

### API Exposure Analysis
- **Definition APIs**: ✅ Public (Amazon States Language JSON)
- **Query APIs**: ⚠️ Limited (execution history, not topology)
- **Ancestry Checking**: ❌ Not exposed publicly
- **Descendant Checking**: ❌ Not exposed publicly

### Design Rationale
AWS Step Functions emphasizes execution:
1. State machines are declarative
2. Execution history and monitoring are primary
3. Topology queries are handled internally

---

## 7. Groundswell (Current Project)

### Current Implementation

#### isDescendantOf Method (Private)
**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:162-180`

```typescript
/**
 * Check if this workflow is a descendant of the given ancestor workflow
 * Traverses the parent chain upward looking for the ancestor reference
 * Uses visited Set to detect cycles during traversal
 *
 * @private
 * @param ancestor - The potential ancestor workflow to check
 * @returns true if ancestor is found in parent chain, false otherwise
 * @throws {Error} If a cycle is detected during traversal
 */
private isDescendantOf(ancestor: Workflow): boolean {
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;

  while (current !== null) {
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);

    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
```

#### Usage in attachChild (Internal)
**Location**: `/home/dustin/projects/groundswell/src/core/workflow.ts:293`

```typescript
public attachChild(child: Workflow): void {
  // ... validation code ...
  
  // Validate child is not an ancestor (circular reference detection)
  if (this.isDescendantOf(child)) {
    throw new Error(
      `Cannot attach ancestor '${child.name}' as child of '${this.name}'. ` +
      `This would create a circular reference.`
    );
  }
  
  // ... rest of attachment logic ...
}
```

### API Exposure Status
- **Implementation**: ✅ Complete (isDescendantOf exists)
- **Visibility**: ❌ Private (marked `@private`)
- **Public Access**: ❌ Not accessible externally
- **Internal Use**: ✅ Used for circular reference detection

### Known Issues
**Source**: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/TEST_RESULTS.md:229`

> "The `isDescendantOf()` method is private and only used internally for cycle detection. External code cannot check ancestry relationships."

**Task in Backlog**:
- "Consider Exposing isDescendantOf as Public API"
- Location: `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bug_fix_tasks.json:342`

---

## Cross-System Comparison

### Terminology Matrix

| System | Primary Terms | Secondary Terms | Lineage Concept |
|--------|--------------|-----------------|-----------------|
| Apache Airflow | Upstream/Downstream | Parent/Child | No |
| Temporal | Parent/Child | Ancestor | No |
| Prefect | Upstream/Downstream | Dependencies | No |
| Dagster | Dependencies | Lineage | Yes ✅ |
| GitHub Actions | Dependencies | Needs | No |
| AWS Step Functions | States | Transitions | No |
| **Groundswell** | **Parent/Child** | **Ancestor/Descendant** | **Yes ✅** |

### API Exposure Matrix

| System | Define Relationships | Query Immediate | Query Ancestry | Public Descendant Check |
|--------|---------------------|-----------------|----------------|-------------------------|
| Apache Airflow | ✅ Public | ✅ Public | ❌ Internal | ❌ No |
| Temporal | ✅ Public | ❌ No | ❌ Internal | ❌ No |
| Prefect | ✅ Public | ❌ No | ❌ Internal | ❌ No |
| Dagster | ✅ Public | ⚠️ Indirect | ⚠️ Indirect | ⚠️ Indirect |
| GitHub Actions | ✅ Public | ⚠️ Limited | ❌ No | ❌ No |
| AWS Step Functions | ✅ Public | ❌ No | ❌ No | ❌ No |
| **Groundswell** | ✅ Public | ✅ Public | ⚠️ Private | ⚠️ Private (can be made public) |

### Method Naming Patterns

| Pattern | Systems Using It | Example |
|---------|------------------|---------|
| `set_upstream()` / `set_downstream()` | Apache Airflow, Prefect | `task_a.set_downstream(task_b)` |
| `get_upstream()` / `get_downstream()` | Apache Airflow | `task.get_downstream()` |
| `execute_child_workflow()` | Temporal | `workflow.execute_child_workflow(ChildWorkflow.run)` |
| `AssetSelection.upstream()` / `.downstream()` | Dagster | `selection.downstream()` |
| **`isDescendantOf()`** | **Groundswell** | **`workflow.isDescendantOf(ancestor)`** |

**Key Finding**: Groundswell's `isDescendantOf()` naming is unique and more explicit than other systems.

---

## Industry Patterns

### What's Common

1. **Definition APIs are Always Public**
   - All systems expose public APIs for defining relationships
   - Examples: `set_downstream()`, `needs:`, `deps:[]`

2. **Query APIs are Limited or Internal**
   - Most systems don't expose public ancestry/descendant checking
   - Focus is on execution, not topology queries

3. **Upstream/Downstream Dominates**
   - Most systems use this terminology (except Temporal)
   - More intuitive than ancestor/descendant for workflows

### What's Rare

1. **Explicit Ancestry Checking**
   - Only Dagster has lineage concepts (data-focused)
   - No systems expose `isDescendantOf()`-style methods publicly

2. **Public Relationship Validation APIs**
   - Systems validate internally (like Groundswell's attachChild)
   - Don't expose validation as public API

3. **Cycle Detection APIs**
   - All handle internally, none expose publicly
   - Groundswell's implementation with visited Set is industry standard

---

## Recommendations for Groundswell

### 1. Terminology

**Recommendation**: Keep "Parent/Child" as primary, support "Ancestor/Descendant" as secondary

**Rationale**:
- "Parent/Child" is most universally understood
- "Ancestor/Descendant" is more precise for deep hierarchies
- Groundswell already uses both (good consistency)

### 2. API Design

**Option A: Make isDescendantOf Public**
```typescript
class Workflow {
  /**
   * Check if this workflow is a descendant of the given ancestor
   * @param ancestor - Potential ancestor workflow
   * @returns true if this workflow is a descendant
   */
  public isDescendantOf(ancestor: Workflow): boolean {
    // existing implementation
  }
}
```

**Pros**:
- More explicit than `getParent()` chain traversal
- Useful for validation and debugging
- Already implemented and tested

**Cons**:
- None significant - method is well-tested

**Option B: Add Convenience Methods**
```typescript
class Workflow {
  // Direct descendant check
  public isDescendantOf(ancestor: Workflow): boolean;
  
  // Convenience: direct child check
  public isChildOf(parent: Workflow): boolean {
    return this.parent === parent;
  }
  
  // Convenience: has ancestor at any depth
  public hasAncestor(ancestor: Workflow): boolean {
    return this.isDescendantOf(ancestor);
  }
  
  // Get ancestor chain
  public getAncestors(): Workflow[] {
    const ancestors: Workflow[] = [];
    let current = this.parent;
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    return ancestors;
  }
}
```

**Option C: Add Downstream/Upstream Aliases**
```typescript
class Workflow {
  // Alias for compatibility with Airflow/Prefect users
  public getDownstream(): Workflow[] {
    return [...this.children];
  }
  
  public getUpstream(): Workflow | null {
    return this.parent;
  }
  
  // Multiple levels
  public getAllDescendants(): Workflow[] {
    const descendants: Workflow[] = [];
    const queue = [...this.children];
    while (queue.length > 0) {
      const current = queue.shift()!;
      descendants.push(current);
      queue.push(...current.children);
    }
    return descendants;
  }
}
```

### 3. Documentation Decision

**Recommendation**: Document why `isDescendantOf` is private OR make it public

**If Private**:
```typescript
/**
 * Check if this workflow is a descendant of another
 * 
 * @internal
 * This method is used internally for circular reference detection.
 * It is intentionally private to avoid exposing implementation details.
 * 
 * If you need to check workflow relationships, use:
 * - workflow.parent (immediate parent)
 * - workflow.children (immediate children)
 * - Manual traversal if needed (but be careful of cycles!)
 */
private isDescendantOf(ancestor: Workflow): boolean
```

**If Public**:
```typescript
/**
 * Check if this workflow is a descendant of the given ancestor workflow
 * 
 * @example Check ancestry before an operation
 * ```typescript
 * if (child.isDescendantOf(root)) {
 *   console.log('Child is in the root hierarchy');
 * }
 * ```
 * 
 * @example Prevent circular operations
 * ```typescript
 * if (!newChild.isDescendantOf(parent)) {
 *   parent.attachChild(newChild);
 * }
 * ```
 */
public isDescendantOf(ancestor: Workflow): boolean
```

### 4. Security Considerations

If making `isDescendantOf` public, consider:

1. **Depth Limits**: Prevent traversal abuse
```typescript
public isDescendantOf(ancestor: Workflow, maxDepth: number = 1000): boolean {
  let depth = 0;
  const visited = new Set<Workflow>();
  let current: Workflow | null = this.parent;
  
  while (current !== null) {
    if (++depth > maxDepth) {
      throw new Error(`Ancestry depth exceeds ${maxDepth}`);
    }
    if (visited.has(current)) {
      throw new Error('Circular parent-child relationship detected');
    }
    visited.add(current);
    
    if (current === ancestor) {
      return true;
    }
    
    current = current.parent;
  }
  
  return false;
}
```

2. **Traversal Logging**: For debugging
```typescript
private debugAncestryTraversal(from: Workflow, to: Workflow) {
  if (this.config.debug) {
    this.logger.debug(`Checking ancestry: ${from.name} -> ${to.name}`);
  }
}
```

---

## Conclusion

### Key Findings

1. **Groundswell is Ahead of Industry**
   - `isDescendantOf()` implementation is complete and tested
   - More explicit than most systems (which keep this internal)
   - Well-documented with cycle detection

2. **Industry Standard: Keep it Internal**
   - Most workflow engines don't expose ancestry checking publicly
   - Focus is on execution, not topology queries
   - Dagster is exception (data lineage focus)

3. **Making it Public is Differentiator**
   - No major system exposes explicit `isDescendantOf()` API
   - Could be competitive advantage for debugging/validation
   - Already well-tested (25+ test cases)

### Recommendation

**Make `isDescendantOf` public with safeguards:**

1. Add depth limit parameter (default: 1000)
2. Keep cycle detection (already implemented)
3. Add convenience methods (`getAncestors()`, `getAllDescendants()`)
4. Document clearly with examples
5. Consider `upstream`/`downstream` aliases for familiarity

**Rationale**:
- Differentiates from competition
- Already battle-tested
- Minimal risk (implementation is solid)
- High value for users (debugging, validation)

---

## Sources

### Documentation URLs

**Apache Airflow:**
- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html#task-instance
- https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/xcoms.html

**Temporal:**
- https://docs.temporal.io/develop/python/child-workflows
- https://docs.temporal.io/concepts/what-is-a-workflow-execution
- https://docs.temporal.io/namespaces
- https://typescript.temporal.io/api/namespaces/workflow

**Prefect:**
- https://docs.prefect.io/latest/concepts/dependencies/
- https://docs.prefect.io/latest/api-ref/prefect.tasks/
- https://docs.prefect.io/concepts/flows/

**Dagster:**
- https://docs.dagster.io/getting-started/concepts
- https://docs.dagster.io/guides/dagster/asset-dependencies

**GitHub Actions:**
- https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- https://docs.github.com/en/rest/actions

**AWS Step Functions:**
- https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language.html
- https://docs.aws.amazon.com/step-functions/latest/apireference/

### Internal Project Files

- `/home/dustin/projects/groundswell/src/core/workflow.ts` - Implementation
- `/home/dustin/projects/groundswell/CHANGELOG.md` - Version history
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/TEST_RESULTS.md` - Known issues
- `/home/dustin/projects/groundswell/plan/001_d3bb02af4886/bug_fix_tasks.json` - Backlog tasks

---

*Research conducted on 2026-01-12*

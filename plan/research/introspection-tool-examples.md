# Agent Introspection Tools: Complete Implementation Examples

**Status:** Ready-to-implement code patterns for Groundswell
**Target:** Anthropic Tool Format (JSON Schema)

---

## Quick Reference: All Tool Definitions

### 1. Workflow Hierarchy Inspector

**Use Case:** Agent discovers its position in execution tree

```json
{
  "name": "workflow_inspect_hierarchy",
  "description": "Inspect the current workflow's position in the execution hierarchy including ancestors, siblings, and tree depth. Returns structured hierarchy information that helps agents understand their context within the larger workflow orchestration.",
  "input_schema": {
    "type": "object",
    "properties": {
      "node_id": {
        "type": "string",
        "description": "The workflow node ID to inspect. If omitted, introspects the current workflow context."
      },
      "depth_mode": {
        "type": "string",
        "enum": ["current_only", "parent_only", "ancestors_only", "full_tree"],
        "description": "Controls what hierarchy information is returned. 'current_only' returns just the current node. 'parent_only' adds immediate parent. 'ancestors_only' returns full path to root. 'full_tree' includes siblings and full tree structure.",
        "default": "full_tree"
      },
      "include_metadata": {
        "type": "boolean",
        "description": "Include execution metadata like elapsed time and status for each node",
        "default": true
      }
    },
    "required": []
  }
}
```

**Example Invocation:**

```json
{
  "node_id": "wf-789-data-processor",
  "depth_mode": "full_tree",
  "include_metadata": true
}
```

**Example Response:**

```json
{
  "current": {
    "id": "wf-789-data-processor",
    "name": "DataProcessingStep",
    "status": "running",
    "created_at": 1702080000000,
    "elapsed_ms": 5432,
    "completion_percentage": 45
  },
  "parent": {
    "id": "wf-123-main-orchestrator",
    "name": "MainOrchestrator",
    "status": "running",
    "depth_in_tree": 1
  },
  "ancestors": [
    {
      "id": "wf-123-main-orchestrator",
      "name": "MainOrchestrator",
      "status": "running",
      "created_at": 1702079900000,
      "depth_in_tree": 1
    },
    {
      "id": "wf-001-root",
      "name": "RootWorkflow",
      "status": "running",
      "created_at": 1702079800000,
      "depth_in_tree": 2
    }
  ],
  "siblings": [
    {
      "id": "wf-456-validation",
      "name": "DataValidationStep",
      "status": "completed",
      "completion_percentage": 100
    },
    {
      "id": "wf-999-transform",
      "name": "DataTransformStep",
      "status": "pending",
      "completion_percentage": 0
    }
  ],
  "tree_metrics": {
    "max_depth": 2,
    "total_nodes": 5,
    "siblings_count": 2,
    "leaf_nodes": 2
  }
}
```

**Agent Usage Example:**

```
User: "What's your execution context?"

Agent Analysis:
- Inspects hierarchy to understand position
- Tool call: workflow_inspect_hierarchy with depth_mode="ancestors_only"
- Receives ancestors up to root
- Analyzes: "I'm 2 levels deep in a tree rooted at RootWorkflow, currently processing data as part of MainOrchestrator"
```

---

### 2. Ancestor Output Reader

**Use Case:** Agent reads results from parent/ancestor workflows to inform decisions

```json
{
  "name": "workflow_read_ancestor_outputs",
  "description": "Read execution results and output data from ancestor workflows. Supports reading specific ancestors or all ancestors in hierarchy order. Returns structured output data that helps agents understand what prior workflow steps have accomplished.",
  "input_schema": {
    "type": "object",
    "properties": {
      "ancestor_id": {
        "type": "string",
        "description": "Specific ancestor workflow ID to read from. If omitted, reads from all ancestors."
      },
      "ancestor_name": {
        "type": "string",
        "description": "Filter by ancestor workflow name (e.g., 'DataValidationStep'). Useful if you don't know the ID."
      },
      "max_ancestry_depth": {
        "type": "integer",
        "description": "Only read from ancestors this many levels up. Set to 1 for immediate parent only, 2 for grandparent, etc.",
        "minimum": 1
      },
      "include_execution_metadata": {
        "type": "boolean",
        "description": "Include timing and status information alongside the output",
        "default": true
      },
      "include_error_details": {
        "type": "boolean",
        "description": "If ancestor failed, include error details for debugging",
        "default": false
      }
    },
    "required": []
  }
}
```

**Example Invocation:**

```json
{
  "ancestor_name": "DataValidationStep",
  "include_execution_metadata": true
}
```

**Example Response:**

```json
{
  "outputs": [
    {
      "ancestor_id": "wf-456-validation",
      "ancestor_name": "DataValidationStep",
      "hierarchy_depth": 1,
      "status": "completed",
      "execution_summary": {
        "started_at": 1702080100000,
        "completed_at": 1702080150000,
        "duration_ms": 50000
      },
      "output_data": {
        "records_validated": 15000,
        "validation_pass_rate": 0.987,
        "validation_rules_applied": 23,
        "error_records": 195,
        "warnings": [
          "High cardinality in field 'user_id'",
          "Null values detected in 'timestamp' field (0.3%)"
        ]
      }
    },
    {
      "ancestor_id": "wf-123-main-orchestrator",
      "ancestor_name": "MainOrchestrator",
      "hierarchy_depth": 2,
      "status": "running",
      "execution_summary": {
        "started_at": 1702080000000,
        "elapsed_ms": 175000
      },
      "output_data": {
        "stage": "data_processing",
        "input_file_size_mb": 487.2,
        "data_schema": "validated",
        "schema_version": "1.2.3"
      }
    }
  ]
}
```

**Agent Usage Example:**

```
Agent thinks: "I need to understand what validation rules were applied before processing this data."
- Tool call: workflow_read_ancestor_outputs with ancestor_name="DataValidationStep"
- Receives: 987 validation pass rate, specific warnings about null values
- Decision: "I'll use conservative defaults for null value handling given the warnings"
```

---

### 3. Cache Status Inspector

**Use Case:** Agent checks if results have been cached to avoid redundant computation

```json
{
  "name": "workflow_inspect_cache",
  "description": "Inspect caching status for current and ancestor workflows. Shows which results have been cached, how stale they are, and whether recomputation occurred. Helps agents understand data freshness and optimize for cost vs accuracy.",
  "input_schema": {
    "type": "object",
    "properties": {
      "node_id": {
        "type": "string",
        "description": "Workflow node to check cache for. If omitted, checks current node."
      },
      "check_ancestors": {
        "type": "boolean",
        "description": "Also return cache status for ancestor workflows",
        "default": true
      },
      "cache_key_pattern": {
        "type": "string",
        "description": "Filter to cache entries matching this pattern (supports * wildcards, e.g., 'validation_*')"
      },
      "include_statistics": {
        "type": "boolean",
        "description": "Include cache hit rates and performance metrics",
        "default": true
      }
    },
    "required": []
  }
}
```

**Example Invocation:**

```json
{
  "check_ancestors": true,
  "cache_key_pattern": "schema_*",
  "include_statistics": true
}
```

**Example Response:**

```json
{
  "workflow_id": "wf-789-data-processor",
  "cache_configuration": {
    "enabled": true,
    "strategy": "persistent",
    "ttl_seconds": 86400
  },
  "cache_entries": [
    {
      "cache_key": "schema_analysis_result",
      "is_cached": true,
      "cached_at": 1702080050000,
      "age_seconds": 382,
      "hit_count": 3,
      "size_bytes": 2048,
      "source_workflow_id": "wf-456-validation"
    },
    {
      "cache_key": "schema_validation_rules",
      "is_cached": true,
      "cached_at": 1702079950000,
      "age_seconds": 482,
      "hit_count": 5,
      "size_bytes": 4096,
      "stale_after_minutes": 60,
      "stale": false
    }
  ],
  "cache_statistics": {
    "total_entries": 2,
    "total_size_bytes": 6144,
    "cache_hit_rate": 0.889,
    "average_hit_count": 4,
    "recent_misses": 1
  },
  "ancestor_cache_summary": [
    {
      "ancestor_id": "wf-456-validation",
      "cache_hit_rate": 0.95,
      "size_bytes": 15360
    }
  ]
}
```

**Agent Usage Example:**

```
Agent: "Should I recompute the schema analysis?"
- Checks cache: schema_analysis_result was cached 6 minutes ago
- TTL is 60 minutes, so still fresh
- Decision: "Use cached result to save computation time"
```

---

### 4. Event History Reader

**Use Case:** Agent reviews what happened during execution to understand workflow behavior

```json
{
  "name": "workflow_read_event_history",
  "description": "Read detailed event history from workflow execution tree. Supports filtering by event type, workflow, and time range. Helps agents understand workflow execution flow, errors, and performance characteristics.",
  "input_schema": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "Filter to events from specific workflow. If omitted, returns events from all workflows in tree."
      },
      "event_types": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "stepStart",
            "stepEnd",
            "toolInvocation",
            "toolCompletion",
            "error",
            "warning",
            "stateSnapshot",
            "childAttached",
            "completionMilestone"
          ]
        },
        "description": "Filter to only these event types"
      },
      "time_range_start": {
        "type": "integer",
        "description": "Only return events after this Unix timestamp (ms)"
      },
      "time_range_end": {
        "type": "integer",
        "description": "Only return events before this Unix timestamp (ms)"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of events to return",
        "default": 100,
        "maximum": 1000
      },
      "sort_order": {
        "type": "string",
        "enum": ["ascending", "descending"],
        "description": "Sort by timestamp",
        "default": "ascending"
      },
      "include_full_context": {
        "type": "boolean",
        "description": "Include complete event details and payloads (may be verbose)",
        "default": false
      }
    },
    "required": []
  }
}
```

**Example Invocation:**

```json
{
  "event_types": ["error", "warning"],
  "include_full_context": true,
  "limit": 50
}
```

**Example Response:**

```json
{
  "events": [
    {
      "id": "event-001",
      "timestamp": 1702080150000,
      "workflow_id": "wf-456-validation",
      "workflow_name": "DataValidationStep",
      "event_type": "toolInvocation",
      "tool_name": "validate_schema",
      "duration_ms": 2341,
      "status": "success",
      "context": {
        "input_records": 15000,
        "output_status": "validation_passed"
      }
    },
    {
      "id": "event-002",
      "timestamp": 1702080152000,
      "workflow_id": "wf-456-validation",
      "workflow_name": "DataValidationStep",
      "event_type": "warning",
      "severity": "medium",
      "message": "195 records failed validation (1.3% error rate)",
      "affected_field": "timestamp",
      "context": {
        "error_type": "null_value",
        "count": 195,
        "recommendation": "Consider handling nulls in downstream processing"
      }
    },
    {
      "id": "event-003",
      "timestamp": 1702080175000,
      "workflow_id": "wf-789-data-processor",
      "workflow_name": "DataProcessingStep",
      "event_type": "error",
      "severity": "high",
      "message": "Memory usage exceeded threshold",
      "error_code": "ERR_OUT_OF_MEMORY",
      "context": {
        "memory_limit_mb": 2048,
        "memory_used_mb": 2156,
        "memory_required_mb": 2500,
        "recommendation": "Consider partitioning input data"
      }
    }
  ],
  "summary": {
    "total_events": 3,
    "event_types_found": ["toolInvocation", "warning", "error"],
    "time_span_ms": 25000,
    "errors_count": 1,
    "warnings_count": 1,
    "successful_tools": 1
  }
}
```

**Agent Usage Example:**

```
Agent: "What went wrong?"
- Queries event history for errors
- Receives: Memory exceeded threshold event with recommendation
- Action: "I'll implement data partitioning to process in smaller batches"
```

---

### 5. State Snapshot Reader

**Use Case:** Agent reads captured state from decision points to understand workflow's internal reasoning

```json
{
  "name": "workflow_inspect_state_snapshot",
  "description": "Read captured state snapshots from specified workflows. State snapshots are captured at key decision points using @ObservedState decorators and contain workflow internal state at that point in time.",
  "input_schema": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "Workflow to read state from"
      },
      "snapshot_timestamp": {
        "type": "integer",
        "description": "Specific snapshot timestamp. If omitted, returns latest snapshot."
      },
      "property_filter": {
        "type": "string",
        "description": "Return only state properties matching this filter (supports * wildcards)"
      },
      "include_change_history": {
        "type": "boolean",
        "description": "Show how state changed over time (multiple snapshots)",
        "default": false
      },
      "max_snapshots": {
        "type": "integer",
        "description": "Maximum number of snapshots to return",
        "default": 1,
        "maximum": 10
      }
    },
    "required": ["workflow_id"]
  }
}
```

**Example Invocation:**

```json
{
  "workflow_id": "wf-456-validation",
  "property_filter": "validation_*",
  "include_change_history": true
}
```

**Example Response:**

```json
{
  "workflow_id": "wf-456-validation",
  "workflow_name": "DataValidationStep",
  "snapshots": [
    {
      "timestamp": 1702080140000,
      "sequence_number": 1,
      "state": {
        "validation_rules_loaded": 23,
        "validation_stage": "schema_check",
        "records_processed": 0,
        "errors_found": 0,
        "current_rule": "schema_type_mismatch"
      }
    },
    {
      "timestamp": 1702080150000,
      "sequence_number": 2,
      "state": {
        "validation_rules_loaded": 23,
        "validation_stage": "data_validation",
        "records_processed": 15000,
        "errors_found": 195,
        "current_rule": "null_value_check",
        "validation_pass_rate": 0.987
      },
      "changes_from_previous": {
        "records_processed": { "from": 0, "to": 15000 },
        "errors_found": { "from": 0, "to": 195 },
        "validation_stage": { "from": "schema_check", "to": "data_validation" }
      }
    }
  ],
  "state_summary": {
    "property_count": 5,
    "snapshot_count": 2,
    "time_span_ms": 10000,
    "state_volatility": "medium"
  }
}
```

**Agent Usage Example:**

```
Agent: "How was validation progressing?"
- Reads state snapshots from validation workflow
- Sees: 0 errors after schema check, then 195 errors after data validation
- Analysis: "Data validation is stricter than schema validation; nulls are the main issue"
```

---

### 6. Workflow Spawn Request (Self-Modification)

**Use Case:** Agent requests to spawn a child workflow for parallel processing

```json
{
  "name": "workflow_spawn_child",
  "description": "Request to spawn a child workflow. Child workflow executes under current workflow context and can access ancestor state via introspection tools. Requires a pre-approved workflow template.",
  "input_schema": {
    "type": "object",
    "properties": {
      "child_workflow_name": {
        "type": "string",
        "description": "Human-readable name for the child workflow instance"
      },
      "workflow_template_id": {
        "type": "string",
        "description": "ID of pre-approved workflow template. Agents cannot define arbitrary workflows - only use pre-approved templates.",
        "enum": [
          "template_data_validation",
          "template_data_transformation",
          "template_data_analysis",
          "template_data_aggregation",
          "template_error_handling"
        ]
      },
      "input_data": {
        "type": "object",
        "description": "Data to pass to child workflow. Must match template input schema."
      },
      "parallel_execution": {
        "type": "boolean",
        "description": "If true, run in parallel with siblings. If false, wait for completion before returning.",
        "default": true
      },
      "timeout_seconds": {
        "type": "integer",
        "description": "Maximum execution time before child is terminated",
        "minimum": 1,
        "maximum": 3600
      },
      "resource_allocation": {
        "type": "object",
        "properties": {
          "memory_mb": {
            "type": "integer",
            "description": "Memory limit for child",
            "minimum": 128,
            "maximum": 4096
          },
          "cpu_shares": {
            "type": "integer",
            "description": "CPU allocation (relative to parent)",
            "minimum": 1,
            "maximum": 100
          }
        }
      }
    },
    "required": ["child_workflow_name", "workflow_template_id", "input_data"]
  }
}
```

**Example Invocation:**

```json
{
  "child_workflow_name": "process_partition_001",
  "workflow_template_id": "template_data_transformation",
  "input_data": {
    "partition_id": "part-001",
    "data_slice": { "records": 5000 },
    "transformation_rules": ["uppercase_names", "normalize_dates"]
  },
  "parallel_execution": true,
  "timeout_seconds": 300
}
```

**Example Response:**

```json
{
  "status": "spawned",
  "child_workflow_id": "wf-spawn-001-partition",
  "child_workflow_name": "process_partition_001",
  "parent_workflow_id": "wf-789-data-processor",
  "template_used": "template_data_transformation",
  "execution_mode": "parallel",
  "resource_limits": {
    "memory_mb": 512,
    "cpu_shares": 25,
    "timeout_seconds": 300
  },
  "estimated_completion_time_ms": 45000,
  "can_be_inspected_via": [
    "workflow_inspect_hierarchy",
    "workflow_read_ancestor_outputs",
    "workflow_read_event_history"
  ]
}
```

**Agent Usage Example:**

```
Agent: "This dataset is too large to process at once. Let me partition it."
- Spawns 3 child workflows using template_data_transformation
- Each processes 1/3 of the data in parallel
- Uses workflow_read_ancestor_outputs to collect results from all children
- Aggregates results from completed children
```

---

### 7. Dynamic Prompt Generation

**Use Case:** Agent creates context-aware prompt for child workflow based on current analysis

```json
{
  "name": "workflow_generate_dynamic_prompt",
  "description": "Generate a system prompt for a child workflow based on current analysis. Generated prompt is validated against template before execution. Supports templating variables from current context.",
  "input_schema": {
    "type": "object",
    "properties": {
      "target_workflow_id": {
        "type": "string",
        "description": "Child workflow to generate prompt for"
      },
      "prompt_template": {
        "type": "string",
        "enum": [
          "analysis_guided",
          "error_recovery",
          "optimization",
          "quality_checking",
          "decision_making"
        ],
        "description": "Template type constrains what kind of prompt is generated"
      },
      "context_variables": {
        "type": "object",
        "description": "Context from current workflow to inject into template (e.g., {error_count}, {data_quality})"
      },
      "additional_constraints": {
        "type": "object",
        "properties": {
          "max_iterations": {
            "type": "integer",
            "description": "Maximum tool invocations"
          },
          "focus_area": {
            "type": "string",
            "description": "What to prioritize (e.g., 'speed' or 'accuracy')"
          },
          "error_handling_strategy": {
            "type": "string",
            "enum": ["fail_fast", "collect_and_continue", "best_effort"],
            "description": "How to handle errors"
          }
        }
      },
      "dry_run": {
        "type": "boolean",
        "description": "If true, return generated prompt without executing it",
        "default": false
      }
    },
    "required": ["target_workflow_id", "prompt_template"]
  }
}
```

**Example Invocation:**

```json
{
  "target_workflow_id": "wf-spawn-001",
  "prompt_template": "error_recovery",
  "context_variables": {
    "error_count": 195,
    "error_type": "null_value",
    "error_percentage": 1.3
  },
  "additional_constraints": {
    "focus_area": "accuracy",
    "error_handling_strategy": "collect_and_continue",
    "max_iterations": 5
  },
  "dry_run": true
}
```

**Example Response:**

```json
{
  "status": "validated",
  "target_workflow_id": "wf-spawn-001",
  "generated_prompt": "You are processing data with known issues: 195 null values detected (1.3%). Focus on accuracy and collect errors for later review. Use conservative defaults for null handling. Maximum 5 iterations. If you encounter errors, collect them and continue processing the remaining data.",
  "prompt_token_count": 67,
  "safety_check": {
    "passed": true,
    "issues_found": [],
    "validation_rules_applied": [
      "no_code_injection",
      "no_escaping_template",
      "no_disabling_safety_features"
    ]
  },
  "execution_parameters": {
    "will_override": ["system_prompt"],
    "will_preserve": ["model", "max_tokens", "temperature"]
  }
}
```

**Agent Usage Example:**

```
Agent thinks: "Child workflow needs to know about the 1.3% error rate"
- Generates dynamic prompt using error_recovery template
- Includes context: error_count=195, error_type=null_value
- Sets error_handling_strategy to collect_and_continue
- Verification: Prompt passes safety checks
- Executes with generated prompt
```

---

## Integration Patterns

### Pattern 1: Context-Aware Decision Making

```
Agent receives task → Inspects hierarchy to understand context
                   → Reads ancestor outputs to see what's been done
                   → Checks cache status for data freshness
                   → Makes decision based on integrated context
                   → Executes action
```

### Pattern 2: Adaptive Parallel Processing

```
Agent receives large dataset → Estimates partition count
                            → Spawns child workflows for each partition
                            → Monitors via event history
                            → Reads ancestor outputs from children as they complete
                            → Aggregates results
```

### Pattern 3: Error Recovery

```
Agent encounters error → Reads event history to find root cause
                      → Checks state snapshots at failure point
                      → Generates recovery prompt for new child workflow
                      → Spawns recovery workflow with learned context
                      → Compares results
```

### Pattern 4: Self-Improvement Loop

```
Agent completes task → Reads own event history
                    → Analyzes performance via state snapshots
                    → Identifies bottlenecks from metrics
                    → Spawns optimized child workflow with refined approach
                    → Compares performance
                    → Uses better approach going forward
```

---

## Security Checklist for Implementation

- [ ] All introspection tools are read-only (no state modification)
- [ ] Cache tool never returns credentials or secrets
- [ ] State snapshots are filtered for sensitive fields
- [ ] Event history excludes internal system events
- [ ] Hierarchy inspection respects tenant boundaries
- [ ] Child spawning requires template approval
- [ ] Dynamic prompts are validated before execution
- [ ] All queries have result limits and timeouts
- [ ] Ancestor depth traversal is limited
- [ ] Introspection queries are audit logged


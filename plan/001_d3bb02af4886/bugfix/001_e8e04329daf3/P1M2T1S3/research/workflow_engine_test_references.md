# Workflow Engine Test References for Concurrent Failures

## Repository Quick Links

### Apache Airflow
- **Main Repo**: https://github.com/apache/airflow
- **Key Test Files**:
  - `tests/models/test_taskinstance.py` - Task failure states
  - `tests/executors/test_local_executor.py` - Concurrent task execution
  - `tests/dag_processing/test_dag_run.py` - DAG-level failures
  - `tests/www/views/test_views.py` - UI error display

### Temporal
- **Main Repo**: https://github.com/temporalio/sdk-python
- **Key Test Files**:
  - `tests/worker/workflow_tests/test_child_workflow.py` - Child workflows
  - `tests/worker/workflow_tests/test_workflow_replay.py` - Failure recovery
  - `tests/worker/activity_tests/test_activity.py` - Activity failures

### Prefect
- **Main Repo**: https://github.com/PrefectHQ/prefect
- **Key Test Files**:
  - `tests/tasks/test_task_runners.py` - Concurrent execution
  - `tests/orchestration/test_task_runs.py` - State tracking
  - `tests/engine/test_execution.py` - Engine failure handling

### Dagster
- **Main Repo**: https://github.com/dagster-io/dagster
- **Key Test Files**:
  - `dagster_tests/core_tests/execution_tests/` - Execution patterns
  - `dagster_tests/core_tests/composite_tests/` - Composite solids

### Node.js Promise Tests
- **Main Repo**: https://github.com/nodejs/node
- **Key Test Files**:
  - `test/parallel/test-promise-all-settled.js` - allSettled behavior
  - `test/parallel/test-promise-any.js` - Promise.any patterns

---

## Common Testing Patterns by Engine

### 1. Airflow: TaskInstance State Tracking

**Location**: `tests/models/test_taskinstance.py`

```python
def test_concurrent_task_failure_states(self):
    """
    Test that multiple task instances can fail concurrently
    while others succeed, and all states are tracked correctly.
    """
    dag = DAG(
        'test_concurrent_failures',
        default_args={
            'owner': 'airflow',
            'start_date': datetime(2024, 1, 1),
            'retries': 0,
        }
    )

    # Create tasks with different outcomes
    tasks = []
    for i in range(10):
        task = PythonOperator(
            task_id=f'task_{i}',
            python_callable=execute_task,
            op_args=[i],
            dag=dag
        )
        tasks.append(task)

    # Execute
    dr = dag.create_dagrun(
        run_id='test_run',
        execution_date=datetime(2024, 1, 1),
        state=State.RUNNING
    )

    # Run tasks
    for task in tasks:
        ti = TaskInstance(task, run_id=dr.run_id)
        ti.run(ignore_ti_state=True)

    # Assert: All task instances have a state
    tis = dr.get_task_instances()
    assert len(tis) == 10

    # Assert: Count failures and successes
    failed = [ti for ti in tis if ti.state == State.FAILED]
    success = [ti for ti in tis if ti.state == State.SUCCESS]

    assert len(failed) == expected_failures
    assert len(success) == expected_successes

    # Assert: No task instances in RUNNING state (all settled)
    running = [ti for ti in tis if ti.state == State.RUNNING]
    assert len(running) == 0
```

**Key Assertions**:
- All task instances have a terminal state
- Correct count of failures vs successes
- No tasks left in RUNNING state

---

### 2. Temporal: Child Workflow Error Collection

**Location**: `tests/worker/workflow_tests/test_child_workflow.py`

```python
@workflow.defn
class ParentWorkflow:
    @workflow.run
    async def run(self) -> dict[str, Any]:
        # Start multiple child workflows
        handles = [
            workflow.start_child_workflow(
                ChildWorkflow,
                id=f"child-{i}",
                task_queue="test-queue"
            )
            for i in range(5)
        ]

        # Wait for all children with exception collection
        results = []
        errors = []

        for handle in handles:
            try:
                result = await handle.result()
                results.append(result)
            except ApplicationError as e:
                errors.append({
                    'child_id': handle.id,
                    'error': e.message,
                    'details': e.details
                })

        # Return aggregated results
        return {
            'results': results,
            'errors': errors,
            'total': len(handles)
        }

# Test
async def test_child_workflow_error_collection():
    # Create a workflow that will fail specific children
    async def test_workflow():
        result = await ParentWorkflow.run()
        assert result['total'] == 5
        assert len(result['results']) + len(result['errors']) == 5
        assert all('child_id' in e for e in result['errors'])

    # Execute test
    await execute_workflow(test_workflow)
```

**Key Assertions**:
- Total children = results + errors (all accounted for)
- Each error has child identifier
- No orphaned child workflows

---

### 3. Prefect: State Aggregation for Concurrent Tasks

**Location**: `tests/tasks/test_task_runners.py`

```python
async def test_concurrent_task_state_aggregation():
    """
    Test that all task states are aggregated correctly
    when multiple tasks run concurrently with mixed outcomes.
    """

    @task
    async def failing_task(task_id: str):
        raise ValueError(f"Task {task_id} failed")

    @task
    async def succeeding_task(task_id: str):
        return f"Task {task_id} succeeded"

    # Create task runs with mixed outcomes
    task_runs = []

    for i in range(10):
        if i % 3 == 0:
            # Every 3rd task fails
            task_runs.append(failing_task(f"task-{i}"))
        else:
            task_runs.append(succeeding_task(f"task-{i}"))

    # Run all tasks concurrently
    results = await asyncio.gather(
        *task_runs,
        return_exceptions=True
    )

    # Aggregate states
    failed = [r for r in results if isinstance(r, Exception)]
    succeeded = [r for r in results if not isinstance(r, Exception)]

    # Assert: All tasks completed
    assert len(failed) + len(succeeded) == 10

    # Assert: Expected failure count
    assert len(failed) == 4  # 0, 3, 6, 9

    # Assert: Expected success count
    assert len(succeeded) == 6

    # Assert: All error messages are distinct
    error_messages = [str(e) for e in failed]
    assert len(set(error_messages)) == 4
```

**Key Assertions**:
- Total results = failed + succeeded
- Correct counts for each state
- Distinct error messages

---

### 4. Node.js: Promise.allSettled Edge Cases

**Location**: `test/parallel/test-promise-all-settled.js`

```javascript
// Test 1: All promises rejected
assert.rejects(
  Promise.all([
    Promise.reject(1),
    Promise.reject(2),
    Promise.reject(3)
  ]),
  { 1: 1 }
);

// Test 2: Mixed rejection/fulfillment
const input = [
  Promise.resolve(1),
  Promise.reject('err1'),
  Promise.resolve(2),
  Promise.reject('err2'),
  Promise.resolve(3)
];

Promise.allSettled(input).then((results) => {
  // Assert: All promises settled
  assert.strictEqual(results.length, 5);

  // Assert: Verify status distribution
  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert.strictEqual(fulfilled.length, 3);
  assert.strictEqual(rejected.length, 2);

  // Assert: Values preserved in order
  assert.deepStrictEqual(
    fulfilled.map(r => r.value),
    [1, 2, 3]
  );

  // Assert: Reasons preserved in order
  assert.deepStrictEqual(
    rejected.map(r => r.reason),
    ['err1', 'err2']
  );
});

// Test 3: Empty input
Promise.allSettled([]).then((results) => {
  assert.deepStrictEqual(results, []);
  assert.strictEqual(results.length, 0);
});

// Test 4: All non-thenables
Promise.allSettled([1, 2, 3]).then((results) => {
  assert.strictEqual(results.length, 3);
  results.forEach((result) => {
    assert.strictEqual(result.status, 'fulfilled');
  });
});

// Test 5: Already settled promises
const settledPromise = Promise.resolve('already settled');
Promise.allSettled([settledPromise]).then((results) => {
  assert.strictEqual(results[0].status, 'fulfilled');
  assert.strictEqual(results[0].value, 'already settled');
});
```

**Key Assertions**:
- All promises in result array
- Statuses correct (fulfilled vs rejected)
- Values/reasons preserved
- Handles empty and non-thenable inputs

---

## Test Helpers by Engine

### Airflow: State Verification Helper

```python
def verify_dag_run_states(dag_run: DagRun, expected: Dict[str, int]):
    """
    Helper to verify DAG run has expected state distribution.

    Args:
        dag_run: DAG run to verify
        expected: Dict mapping state to expected count
                 e.g., {'success': 7, 'failed': 3}
    """
    tis = dag_run.get_task_instances()

    # Count actual states
    actual_counts = {}
    for ti in tis:
        state = ti.state
        actual_counts[state] = actual_counts.get(state, 0) + 1

    # Verify each expected state count
    for state, expected_count in expected.items():
        actual_count = actual_counts.get(state, 0)
        assert actual_count == expected_count, (
            f"Expected {expected_count} tasks in state {state}, "
            f"but found {actual_count}"
        )

    # Verify all tasks accounted for
    total_expected = sum(expected.values())
    total_actual = len(tis)
    assert total_actual == total_expected, (
        f"Expected {total_expected} task instances, "
        f"but found {total_actual}"
    )

    # Verify no tasks in non-terminal states
    non_terminal = [
        state for state in actual_counts.keys()
        if state not in [State.SUCCESS, State.FAILED, State.SKIPPED]
    ]
    assert len(non_terminal) == 0, (
        f"Found tasks in non-terminal states: {non_terminal}"
    )
```

---

### Temporal: Error Aggregation Helper

```python
@dataclass
class ChildWorkflowError:
    child_id: str
    error_type: str
    message: str
    details: Dict[str, Any]

@dataclass
class ChildWorkflowResult:
    child_id: str
    result: Any
    status: str

def aggregate_child_results(
    handles: List[ChildWorkflowHandle]
) -> Dict[str, Any]:
    """
    Aggregate results from multiple child workflows,
    collecting both successes and failures.

    Returns:
        Dict with 'results', 'errors', and 'total' keys
    """
    results = []
    errors = []

    for handle in handles:
        try:
            result = handle.result()
            results.append(ChildWorkflowResult(
                child_id=handle.id,
                result=result,
                status='completed'
            ))
        except Exception as e:
            errors.append(ChildWorkflowError(
                child_id=handle.id,
                error_type=type(e).__name__,
                message=str(e),
                details=getattr(e, 'details', {})
            ))

    return {
        'results': results,
        'errors': errors,
        'total': len(handles),
        'success_count': len(results),
        'error_count': len(errors)
    }

# Test helper
def assert_child_execution_complete(aggregation: Dict[str, Any]):
    """
    Assert that all child workflows completed.
    """
    assert aggregation['total'] > 0, "No child workflows executed"

    total_accounted = aggregation['success_count'] + aggregation['error_count']
    assert total_accounted == aggregation['total'], (
        f"Not all children accounted for: "
        f"{aggregation['total']} total, {total_accounted} accounted"
    )

    # Verify all errors have child_id
    for error in aggregation['errors']:
        assert error.child_id, "Error missing child_id"
        assert error.message, "Error missing message"
```

---

### Prefect: Promise.allSettled-like Helper

```python
from typing import Any, List, Tuple
from prefect import task

async def run_tasks_with_settlement(
    tasks: List[Coroutine]
) -> Tuple[List[Any], List[Exception]]:
    """
    Run all tasks to completion, collecting both
    successful results and failures.

    Similar to Promise.allSettled in JavaScript.

    Returns:
        Tuple of (successful_results, failures)
    """
    # Run all tasks, catching exceptions
    results = await asyncio.gather(
        *tasks,
        return_exceptions=True
    )

    # Separate successes from failures
    successes = []
    failures = []

    for result in results:
        if isinstance(result, Exception):
            failures.append(result)
        else:
            successes.append(result)

    return successes, failures

# Test helper
def assert_settlement_counts(
    successes: List[Any],
    failures: List[Exception],
    expected_successes: int,
    expected_failures: int
):
    """
    Assert expected counts of successes and failures.
    """
    assert len(successes) == expected_successes, (
        f"Expected {expected_successes} successes, "
        f"got {len(successes)}"
    )

    assert len(failures) == expected_failures, (
        f"Expected {expected_failures} failures, "
        f"got {len(failures)}"
    )

    # Assert all error messages are unique
    error_messages = [str(e) for e in failures]
    assert len(set(error_messages)) == len(error_messages), (
        "Some error messages are duplicates"
    )
```

---

## Observable Testing Patterns

### Event Tracking Template

```python
class EventTracker:
    """
    Helper to track events during concurrent workflow execution.
    """

    def __init__(self):
        self.events = []

    def track_event(self, event_type: str, **kwargs):
        """Record an event with timestamp and metadata."""
        self.events.append({
            'type': event_type,
            'timestamp': time.time(),
            **kwargs
        })

    def get_events_by_type(self, event_type: str) -> List[Dict]:
        """Get all events of a specific type."""
        return [e for e in self.events if e['type'] == event_type]

    def assert_event_count(self, event_type: str, expected_count: int):
        """Assert expected number of events of a type."""
        actual = len(self.get_events_by_type(event_type))
        assert actual == expected_count, (
            f"Expected {expected_count} {event_type} events, "
            f"got {actual}"
        )

    def assert_event_sequence(self, expected_sequence: List[str]):
        """Assert events occurred in expected order."""
        actual_sequence = [e['type'] for e in self.events]
        assert actual_sequence == expected_sequence, (
            f"Event sequence mismatch.\n"
            f"Expected: {expected_sequence}\n"
            f"Actual: {actual_sequence}"
        )

    def assert_all_children_accounted(self, child_count: int):
        """Assert all child workflows have terminal events."""
        completed = len(self.get_events_by_type('child_completed'))
        failed = len(self.get_events_by_type('child_failed'))

        assert completed + failed == child_count, (
            f"Not all children accounted for. "
            f"Expected {child_count}, got {completed + failed}"
        )
```

---

## Performance Testing Patterns

### Timeout Protection Template

```typescript
/**
 * Helper to run workflows with timeout protection
 * to detect hanging promises.
 */
async function runWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );

  return Promise.race([promise, timeout]);
}

// Usage in test
it('should complete all workflows without hanging', async () => {
  const children = createChildren(10);

  const results = await runWithTimeout(
    Promise.allSettled(children.map(c => c.run())),
    5000, // 5 second timeout
    'Workflows hung - some promises did not settle'
  );

  expect(results.length).toBe(10);
});
```

---

## Summary of Key Patterns

| Pattern | Purpose | Example From |
|---------|---------|--------------|
| **Promise.allSettled** | Ensure all tasks complete regardless of failures | Node.js, Prefect |
| **Event Tracking** | Verify errors are emitted and captured | Airflow, Temporal |
| **State Aggregation** | Collect final states of all concurrent tasks | Prefect, Temporal |
| **Count Assertions** | Verify expected failure/success counts | All engines |
| **Timeout Protection** | Detect hanging or orphaned workflows | Temporal, Node.js |
| **Error Context** | Preserve workflow info in errors | Temporal, Airflow |
| **Distinct Errors** | Ensure multiple failures create distinct errors | All engines |
| **Completion Verification** | Explicitly verify all tasks complete | All engines |

---

This document provides a reference guide for finding specific test implementations in major workflow engines. Each engine has extensive test suites that demonstrate these patterns in production code.

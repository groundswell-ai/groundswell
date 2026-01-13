# External Best Practices for Workflow Name Validation

## Industry Standards Comparison

### 1. Kubernetes Naming Standards
**Source:** [Kubernetes Documentation - Names](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)

| Requirement | Value |
|-------------|-------|
| Max Length | 253 characters |
| Allowed Characters | Lowercase alphanumeric, `-`, `.` |
| Must Start/End With | Alphanumeric |
| Pattern | `[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*` |
| Rule | Must be valid DNS subdomain name |

### 2. Apache Airflow DAG Naming
**Source:** [Airflow DAG Documentation](https://airflow.apache.org/docs/apache-airflow/stable/concepts/dags.html)

| Requirement | Value |
|-------------|-------|
| Characters | Alphanumeric, underscores only |
| Spaces | Not allowed |
| Pattern | `^[a-zA-Z0-9_]+$` |
| Uniqueness | Required across all DAGs |
| Case | Case-sensitive |
| File Naming | Must match Python module naming (no hyphens) |

### 3. AWS Step Functions State Machine Names
**Source:** [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-state-machine-structure.html)

| Requirement | Value |
|-------------|-------|
| Min Length | 1 character |
| Max Length | 80 characters |
| Allowed Characters | Alphanumeric, hyphens, underscores |
| Pattern | `^[a-zA-Z0-9_-]+$` |
| Uniqueness | Required within account/region |
| Case | Case-insensitive |

### 4. GitHub Actions Workflow Names
**Source:** [GitHub Actions Documentation](https://docs.github.com/en/actions/using-workflows)

| Requirement | Value |
|-------------|-------|
| Characters | Most printable characters allowed |
| Purpose | Display name for UI |
| Format | String value in YAML |
| Fallback | Uses filename if name omitted |

### 5. Temporal Workflow Names
**Source:** [Temporal TypeScript Documentation](https://docs.temporal.io/docs/typescript/workflows)

| Requirement | Value |
|-------------|-------|
| Pattern | Valid TypeScript identifier |
| Regex | `^[a-zA-Z_$][a-zA-Z0-9_$]*$` |
| Convention | PascalCase or camelCase |
| Uniqueness | Scoped to namespace/task queue |

## Common Validation Patterns

### Pattern 1: Strict Identifier (Kubernetes-style)
```typescript
const STRICT_IDENTIFIER = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

function validateStrict(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= 253 &&
    STRICT_IDENTIFIER.test(name)
  );
}
```

### Pattern 2: Alphanumeric with Underscores (Airflow-style)
```typescript
const SNAKE_CASE_IDENTIFIER = /^[a-zA-Z0-9_]+$/;

function validateSnakeCase(name: string): boolean {
  return name.length > 0 && SNAKE_CASE_IDENTIFIER.test(name);
}
```

### Pattern 3: Flexible Identifier (AWS-style)
```typescript
const FLEXIBLE_IDENTIFIER = /^[a-zA-Z0-9_-]+$/;

function validateFlexible(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= 80 &&
    FLEXIBLE_IDENTIFIER.test(name)
  );
}
```

### Pattern 4: TypeScript/JavaScript Identifier
```typescript
const JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function validateJSIdentifier(name: string): boolean {
  return JS_IDENTIFIER.test(name);
}
```

## Best Practice Summary

### Length Limits
| System | Min | Max | Recommendation for Groundswell |
|--------|-----|-----|--------------------------------|
| Kubernetes | 1 | 253 | |
| Airflow | - | - | |
| AWS | 1 | 80 | **1-100** (reasonable balance) |
| GitHub | - | - | |

### Character Sets
| System | Characters | Restrictiveness |
|--------|------------|-----------------|
| Kubernetes | `[a-z0-9.-]` | Most restrictive |
| Airflow | `[a-zA-Z0-9_]` | Moderate |
| AWS | `[a-zA-Z0-9_-]` | Moderate |
| GitHub | Most printable | Permissive |
| Temporal | `[a-zA-Z0-9_$]` | Language-specific |

### Common Rules Across All Systems

1. **Non-empty:** All systems require at least 1 character
2. **No spaces:** Spaces are universally rejected
3. **ASCII-only:** Unicode not typically allowed
4. **Uniqueness:** Required within appropriate scope
5. **No reserved words:** System keywords avoided

## TypeScript Implementation Patterns

### Basic Validation Function
```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateWorkflowName(name: unknown): ValidationResult {
  // Type check
  if (typeof name !== 'string') {
    return { valid: false, error: 'Workflow name must be a string' };
  }

  // Empty check
  if (name.length === 0) {
    return { valid: false, error: 'Workflow name cannot be empty' };
  }

  // Whitespace check
  if (name.trim().length === 0) {
    return { valid: false, error: 'Workflow name cannot be whitespace only' };
  }

  // Length check
  if (name.length > 100) {
    return { valid: false, error: 'Workflow name cannot exceed 100 characters' };
  }

  return { valid: true };
}
```

### Branded Type Pattern (Type-safe)
```typescript
// Type for validated workflow names
type WorkflowName = string & { readonly __brand: unique symbol };

function toWorkflowName(name: unknown): WorkflowName {
  const result = validateWorkflowName(name);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return name as WorkflowName;
}

// Usage in Workflow class
class Workflow {
  constructor(name: WorkflowName | string) {
    // If passed as string, validate
    const validated = typeof name === 'string' ? toWorkflowName(name) : name;
    this.node = { name: validated, ... };
  }
}
```

### Regex-based Validation
```typescript
// Recommended pattern for Groundswell
const WORKFLOW_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/;

// Or simpler: just ensure non-empty with no control characters
const SIMPLE_PATTERN = /^[^\x00-\x1F\x7F]+$/;

function validateWithPattern(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= 100 &&
    SIMPLE_PATTERN.test(name)
  );
}
```

## Recommendation for Groundswell

Based on industry standards and codebase patterns:

### Option A: Minimal Validation (Recommended for initial implementation)
```typescript
// Rules:
// 1. Must be a string
// 2. Must be non-empty after trimming
// 3. No length limit (or very generous limit)

function validateWorkflowName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('Workflow name must be a string');
  }
  if (name.trim().length === 0) {
    throw new Error('Workflow name cannot be empty or whitespace only');
  }
  return name.trim();
}
```

### Option B: Moderate Validation (Follows AWS/Airflow style)
```typescript
// Rules:
// 1. Non-empty string
// 2. 1-100 characters
// 3. Alphanumeric, hyphens, underscores only
// 4. Must start/end with alphanumeric

const WORKFLOW_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/;

function validateWorkflowName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('Workflow name must be a string');
  }
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    throw new Error('Workflow name must be 1-100 characters');
  }
  if (!WORKFLOW_NAME_PATTERN.test(trimmed)) {
    throw new Error(
      'Workflow name must contain only alphanumeric characters, hyphens, and underscores, ' +
      'and must start and end with an alphanumeric character'
    );
  }
  return trimmed;
}
```

## External References

| System | Documentation URL |
|--------|-------------------|
| Kubernetes Names | https://kubernetes.io/docs/concepts/overview/working-with-objects/names/ |
| Apache Airflow DAGs | https://airflow.apache.org/docs/apache-airflow/stable/concepts/dags.html |
| AWS Step Functions | https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-state-machine-structure.html |
| GitHub Actions | https://docs.github.com/en/actions/using-workflows |
| Temporal Workflows | https://docs.temporal.io/docs/typescript/workflows |

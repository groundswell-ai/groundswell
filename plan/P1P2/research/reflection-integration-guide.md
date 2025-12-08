# Reflection Integration Guide for Groundswell Agent Framework

This guide explains how to integrate reflection patterns into the Groundswell workflow orchestration engine.

## Architecture Overview

Groundswell's hierarchical workflow engine provides the perfect foundation for reflection:

```
Workflow
├── Step 1 (with reflection capability)
├── Step 2 (with reflection capability)
└── Step 3 (with reflection capability)
    └── Child Workflow
        ├── Sub-Step 1 (with reflection capability)
        └── Sub-Step 2 (with reflection capability)
```

Each step/task can have reflection configured independently, allowing fine-grained control over when and how reflection occurs.

## Core Integration Points

### 1. **Step-Level Reflection**

Add reflection configuration to the `@Step` decorator:

```typescript
interface StepReflectionConfig {
  enabled: boolean;
  trigger: "always" | "on-error" | "low-confidence";
  maxAttempts: number;
  validationRules?: ValidationRule[];
  confidenceThreshold?: number;
}

@Step({
  name: "GenerateCode",
  reflection: {
    enabled: true,
    trigger: "on-error",
    maxAttempts: 3,
    validationRules: [
      { name: "syntax", validate: (output) => checkSyntax(output) },
      { name: "hasTests", validate: (output) => output.includes("test") }
    ]
  }
})
async generateCode(requirement: string): Promise<string> {
  // Implementation
}
```

### 2. **Task-Level Reflection**

Configure reflection at the task/workflow level:

```typescript
@Task({
  name: "CodeReviewWorkflow",
  reflection: {
    enabled: true,
    trigger: "on-error",
    maxAttempts: 3,
    stateCapture: true, // Capture state before/after
    errorCategories: {
      transient: { retries: 3, backoff: "exponential" },
      logical: { retries: 2, backoff: "linear" },
      invalid: { retries: 0, escalate: true }
    }
  }
})
async reviewCode() {
  // Implementation
}
```

### 3. **Workflow-Level Reflection**

Configure reflection at the orchestration level:

```typescript
class TestCycleWorkflow {
  reflection: WorkflowReflectionConfig = {
    enabled: true,
    trigger: "on-workflow-error",
    maxRounds: 3,
    evaluationCriteria: {
      allTestsPassed: true,
      coverageAbove: 85,
      noBlockingIssues: true
    },
    multiAgentCritique: {
      enabled: true,
      models: ["claude-opus-4.5", "claude-opus-4.5"] // Generator + Critic
    }
  };

  async execute() {
    // Multi-level workflow with reflection
  }
}
```

## Implementation Patterns for Groundswell

### Pattern 1: Automatic Retry with Error Reflection

```typescript
import { Step, Task, WorkflowContext } from "@groundswell/core";

@Step({
  name: "ExecuteWithReflection",
  reflection: {
    enabled: true,
    trigger: "on-error",
    maxAttempts: 3
  }
})
async executeWithReflection(
  ctx: WorkflowContext,
  input: string
): Promise<string> {
  const state = {
    attempt: 0,
    lastError: null,
    attempts: [] as Array<{ output: string; error: string | null }>
  };

  while (state.attempt < 3) {
    state.attempt++;

    try {
      const output = await this.attemptExecution(input, state.attempts);

      // Emit success event
      ctx.emit({
        type: "step:success",
        step: "ExecuteWithReflection",
        attempt: state.attempt,
        output
      });

      return output;
    } catch (error) {
      state.lastError = error;
      state.attempts.push({ output: "", error: String(error) });

      // Emit error event for observability
      ctx.emit({
        type: "step:error",
        step: "ExecuteWithReflection",
        attempt: state.attempt,
        error: String(error)
      });

      // Trigger reflection if not last attempt
      if (state.attempt < 3) {
        const reflection = await this.reflect(
          input,
          String(error),
          state.attempts
        );

        ctx.emit({
          type: "step:reflection",
          step: "ExecuteWithReflection",
          attempt: state.attempt,
          reflection
        });
      }
    }
  }

  throw new Error(
    `Step failed after 3 attempts. Last error: ${state.lastError}`
  );
}

private async attemptExecution(
  input: string,
  history: Array<{ output: string; error: string | null }>
): Promise<string> {
  const historyContext = history.length > 0
    ? `Previous attempts failed with: ${history
        .map((h) => h.error)
        .join("; ")}`
    : "";

  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${input}\n${historyContext}`,
      },
    ],
  });

  return response.content[0].text || "";
}

private async reflect(
  input: string,
  error: string,
  attempts: Array<{ output: string; error: string | null }>
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Task: ${input}

Failed with: ${error}

What should we try differently?`,
      },
    ],
  });

  return response.content[0].text || "";
}
```

### Pattern 2: Validation-Driven Reflection

```typescript
@Step({
  name: "GenerateAndValidate",
  reflection: {
    enabled: true,
    trigger: "on-validation-failure",
    maxAttempts: 3,
    validationRules: [
      { name: "required_fields", validate: (output) => hasRequiredFields(output) },
      { name: "type_safety", validate: (output) => isTypeValid(output) },
      { name: "business_rules", validate: (output) => meetsBusinessRules(output) }
    ]
  }
})
async generateAndValidate(
  ctx: WorkflowContext,
  requirement: string
): Promise<string> {
  const validationRules = [
    { name: "required_fields", validate: (output: string) => hasRequiredFields(output) },
    { name: "type_safety", validate: (output: string) => isTypeValid(output) },
    { name: "business_rules", validate: (output: string) => meetsBusinessRules(output) }
  ];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const output = await this.generate(requirement);

    const violations = this.validate(output, validationRules);

    if (violations.length === 0) {
      ctx.emit({
        type: "step:validation-passed",
        step: "GenerateAndValidate",
        attempt
      });
      return output;
    }

    ctx.emit({
      type: "step:validation-failed",
      step: "GenerateAndValidate",
      attempt,
      violations: violations.map((v) => v.name)
    });

    if (attempt < 3) {
      const reflection = await this.reflectOnViolations(
        requirement,
        output,
        violations
      );

      ctx.emit({
        type: "step:reflection",
        step: "GenerateAndValidate",
        attempt,
        reflection,
        violationCount: violations.length
      });
    }
  }

  throw new Error("Validation failed after 3 attempts");
}

private validate(
  output: string,
  rules: Array<{ name: string; validate: (output: string) => boolean }>
): Array<{ name: string; description: string }> {
  const violations = [];
  for (const rule of rules) {
    if (!rule.validate(output)) {
      violations.push({
        name: rule.name,
        description: `Failed: ${rule.name}`
      });
    }
  }
  return violations;
}

private async reflectOnViolations(
  requirement: string,
  output: string,
  violations: Array<{ name: string; description: string }>
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Requirement: ${requirement}

Your output violated these rules:
${violations.map((v) => `- ${v.description}`).join("\n")}

Output: ${output}

How would you fix these violations?`,
      },
    ],
  });

  return response.content[0].text || "";
}
```

### Pattern 3: Confidence-Based Reflection

```typescript
interface ConfidenceOutput {
  content: string;
  confidence: number;
  uncertaintyAreas: string[];
}

@Step({
  name: "HighConfidenceGeneration",
  reflection: {
    enabled: true,
    trigger: "low-confidence",
    confidenceThreshold: 0.75,
    maxAttempts: 2
  }
})
async highConfidenceGeneration(
  ctx: WorkflowContext,
  task: string
): Promise<string> {
  // First pass with confidence assessment
  const firstPass = await this.generateWithConfidence(task);

  ctx.emit({
    type: "step:confidence-assessment",
    step: "HighConfidenceGeneration",
    confidence: firstPass.confidence,
    uncertaintyAreas: firstPass.uncertaintyAreas
  });

  if (firstPass.confidence >= 0.75) {
    return firstPass.content;
  }

  // Low confidence, reflect and improve
  const improved = await this.reflectOnUncertainty(
    task,
    firstPass
  );

  ctx.emit({
    type: "step:low-confidence-reflection",
    step: "HighConfidenceGeneration",
    initialConfidence: firstPass.confidence,
    reflection: improved
  });

  return improved;
}

private async generateWithConfidence(task: string): Promise<ConfidenceOutput> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `${task}

Assess your own confidence (respond with JSON after your answer):
{"confidence": 0-1, "uncertaintyAreas": ["area1", "area2"]}`,
      },
    ],
  });

  const text = response.content[0].text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}$/);

  if (jsonMatch) {
    const meta = JSON.parse(jsonMatch[0]);
    return {
      content: text.substring(0, text.lastIndexOf("{")),
      confidence: meta.confidence,
      uncertaintyAreas: meta.uncertaintyAreas || []
    };
  }

  return {
    content: text,
    confidence: 0.5,
    uncertaintyAreas: []
  };
}

private async reflectOnUncertainty(
  task: string,
  output: ConfidenceOutput
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Task: ${task}

Your response (confidence: ${output.confidence}):
${output.content}

You identified uncertainty in: ${output.uncertaintyAreas.join(", ")}

Provide an improved response that addresses these uncertainty areas with more detail and evidence.`,
      },
    ],
  });

  return response.content[0].text || "";
}
```

### Pattern 4: Multi-Agent Reflection in Workflow

```typescript
@Task({
  name: "ReviewAndIterateWorkflow",
  reflection: {
    enabled: true,
    multiAgentCritique: {
      enabled: true,
      generatorModel: "claude-opus-4.5",
      criticModel: "claude-opus-4.5",
      maxRounds: 3
    }
  }
})
class ReviewAndIterateWorkflow {
  @Step()
  async generateOutput(ctx: WorkflowContext, requirement: string): Promise<string> {
    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [{ role: "user", content: requirement }],
    });
    return response.content[0].text || "";
  }

  @Step()
  async criticReview(
    ctx: WorkflowContext,
    output: string,
    requirement: string
  ): Promise<{
    isSatisfactory: boolean;
    feedback: string;
    suggestions: string[];
  }> {
    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Requirement: ${requirement}

Response to review:
${output}

Provide JSON critique:
{"isSatisfactory": boolean, "feedback": string, "suggestions": ["s1", "s2"]}`,
        },
      ],
    });

    const text = response.content[0].text || "{}";
    return JSON.parse(text);
  }

  @Step()
  async improveBasedOnCritique(
    ctx: WorkflowContext,
    originalOutput: string,
    requirement: string,
    critique: { feedback: string; suggestions: string[] }
  ): Promise<string> {
    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Requirement: ${requirement}

Original: ${originalOutput}

Critique: ${critique.feedback}

Suggestions: ${critique.suggestions.join("; ")}

Provide improved version.`,
        },
      ],
    });

    return response.content[0].text || "";
  }

  async execute(ctx: WorkflowContext, requirement: string): Promise<string> {
    let output = await this.generateOutput(ctx, requirement);

    for (let round = 1; round <= 3; round++) {
      const critique = await this.criticReview(ctx, output, requirement);

      ctx.emit({
        type: "workflow:critique",
        round,
        isSatisfactory: critique.isSatisfactory,
        feedback: critique.feedback
      });

      if (critique.isSatisfactory) {
        return output;
      }

      output = await this.improveBasedOnCritique(
        ctx,
        output,
        requirement,
        critique
      );
    }

    return output;
  }
}
```

## State Capture & Observability

### State Capture Before Reflection

```typescript
interface ReflectionSnapshot {
  timestamp: Date;
  stepName: string;
  attemptNumber: number;
  input: any;
  output: string;
  error: Error | null;
  validationViolations: string[];
  executionTimeMs: number;
}

async function captureStateBeforeReflection(
  ctx: WorkflowContext,
  step: string,
  attempt: number,
  input: any,
  output: string,
  error: Error | null,
  violations: string[],
  executionTimeMs: number
): Promise<void> {
  const snapshot: ReflectionSnapshot = {
    timestamp: new Date(),
    stepName: step,
    attemptNumber: attempt,
    input,
    output,
    error,
    validationViolations: violations,
    executionTimeMs
  };

  // Store in context for downstream access
  ctx.state.reflectionHistory = ctx.state.reflectionHistory || [];
  ctx.state.reflectionHistory.push(snapshot);

  // Emit event for observability
  ctx.emit({
    type: "reflection:state-captured",
    snapshot
  });
}
```

### Event-Based Observability

```typescript
// In your workflow/step implementation
ctx.on("step:error", (event) => {
  console.log(`Step ${event.step} failed on attempt ${event.attempt}`);
  console.log(`Error: ${event.error}`);
});

ctx.on("step:reflection", (event) => {
  console.log(`Reflection triggered for ${event.step}`);
  console.log(`Reflection content: ${event.reflection}`);
});

ctx.on("reflection:state-captured", (event) => {
  console.log(`State captured for reflection at ${event.snapshot.timestamp}`);
  console.log(`Violations: ${event.snapshot.validationViolations.join(", ")}`);
});

ctx.on("step:success", (event) => {
  console.log(`Step ${event.step} succeeded on attempt ${event.attempt}`);
});
```

## Configuration Best Practices

### Development Configuration

```typescript
const devConfig = {
  reflection: {
    enabled: true,
    verbose: true,
    captureFullState: true,
    maxAttempts: 5, // More attempts for testing
    logAllAttempts: true,
    saveReflectionHistory: true
  }
};
```

### Production Configuration

```typescript
const prodConfig = {
  reflection: {
    enabled: true,
    verbose: false,
    captureFullState: false,
    maxAttempts: 3, // Fewer attempts, lower cost
    logAllAttempts: false,
    saveReflectionHistory: false, // Save only on error
    confidenceThreshold: 0.8, // Higher threshold
    maxTokensPerReflection: 300,
    timeoutMs: 5000
  }
};
```

## Cost Optimization

### Cost Calculation

```
Base Cost = Input Tokens + Output Tokens
Reflection Cost = Base Cost * (Number of Attempts - 1)

Example:
- Initial: 500 input + 500 output = 1000 tokens
- Reflection (2 retries): 1000 * 2 = 2000 tokens
- Total: 3000 tokens = 3x cost

Rule of thumb: Each reflection attempt multiplies cost by ~2x
```

### Strategies to Reduce Cost

1. **Use cheaper models for reflection**:
```typescript
const response = await client.messages.create({
  model: state.attempt === 1
    ? "claude-opus-4.5"  // First attempt with capable model
    : "claude-haiku-4.5", // Reflection with cheaper model
  max_tokens: 1024,
  messages
});
```

2. **Limit reflection scope**:
```typescript
const response = await client.messages.create({
  model: "claude-opus-4.5",
  max_tokens: state.attempt === 1
    ? 2048  // First attempt, more tokens
    : 400,  // Reflection, fewer tokens
  messages
});
```

3. **Confidence-based triggering**:
```typescript
if (output.confidence > 0.85) {
  return output; // Skip reflection if confident
}
```

## Monitoring & Metrics

### Key Metrics to Track

```typescript
interface ReflectionMetrics {
  stepName: string;
  totalAttempts: number;
  successOnFirstAttempt: number; // % that succeed without reflection
  reflectionEffectiveness: number; // % improved by reflection
  averageReflectionTime: number; // ms
  totalTokensSpent: number;
  costMultiplier: number; // How much more expensive than baseline
}

function calculateMetrics(history: ReflectionSnapshot[]): ReflectionMetrics {
  const total = history.length;
  const successful = history.filter((h) => h.error === null).length;
  const successPercent = successful === 0 ? 0 : 1;

  return {
    stepName: history[0]?.stepName || "unknown",
    totalAttempts: total,
    successOnFirstAttempt: history.filter((h) => h.attemptNumber === 1).length,
    reflectionEffectiveness: successPercent,
    averageReflectionTime: 0, // Calculated from execution times
    totalTokensSpent: 0, // Calculated from usage
    costMultiplier: total // More attempts = higher multiplier
  };
}
```

## Testing Reflection

### Unit Test Pattern

```typescript
describe("Step with Reflection", () => {
  it("should succeed on first attempt", async () => {
    const output = await step.execute(ctx, "simple task");
    expect(output).toBeDefined();
    expect(ctx.getEventCount("step:error")).toBe(0);
  });

  it("should retry on error", async () => {
    // Mock to fail first, succeed second
    const attempts: number[] = [];
    step.generate = jest.fn(async () => {
      attempts.push(1);
      if (attempts.length === 1) throw new Error("First attempt fails");
      return "success";
    });

    const output = await step.executeWithReflection(ctx, "task");
    expect(output).toBe("success");
    expect(attempts.length).toBe(2);
  });

  it("should fail after max attempts", async () => {
    step.generate = jest.fn(async () => {
      throw new Error("Always fails");
    });

    await expect(step.executeWithReflection(ctx, "task")).rejects.toThrow();
  });
});
```

## Troubleshooting

### Infinite Reflection Loops

**Problem**: Reflection keeps suggesting same fix without making progress

**Solution**:
```typescript
// Add state deduplication
const previousOutputs = new Set();
const output = await generate();

if (previousOutputs.has(output)) {
  throw new Error("Stuck in loop, breaking out");
}
previousOutputs.add(output);
```

### Excessive Token Usage

**Problem**: Reflection consuming too many tokens

**Solution**:
```typescript
// Cap tokens per step
const maxTokensPerStep = 2000;
const maxTokensPerAttempt = maxTokensPerStep / maxAttempts;

messages.max_tokens = Math.min(
  1024,
  maxTokensPerAttempt - tokensSoFar
);
```

### Reflection Not Helping

**Problem**: Output quality not improving with reflection

**Solution**:
```typescript
// Track effectiveness
if (attempt > 1 && newOutput.quality <= previousOutput.quality) {
  // Reflection didn't help, return original
  return previousOutput;
}
```


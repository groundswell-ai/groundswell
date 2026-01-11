# AI Agent Reflection - Practical Code Patterns

This document provides copy-paste-ready patterns for implementing reflection in TypeScript/JavaScript agents.

## Pattern 1: Simple Reflection Loop (Minimal)

**Use Case**: Basic validation + single reflection pass
**Lines of Code**: ~30
**Tokens per attempt**: ~200-400

```typescript
async function simpleReflection(task: string): Promise<string> {
  // Generate
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [{ role: "user", content: task }],
  });
  const output = response.content[0].text || "";

  // Quick validation
  if (output.length < 50) {
    // Reflect and retry
    const improved = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${task}\n\nYour previous response was too short. Provide a more detailed, comprehensive answer.`,
        },
      ],
    });
    return improved.content[0].text || output;
  }

  return output;
}
```

---

## Pattern 2: Multi-Attempt Loop with History

**Use Case**: Complex tasks needing intelligent retry
**Lines of Code**: ~50
**Tokens per attempt**: ~300-600

```typescript
interface AttemptRecord {
  number: number;
  output: string;
  error: string | null;
  timestamp: Date;
}

async function multiAttemptReflection(
  task: string,
  maxAttempts: number = 3
): Promise<string> {
  const attempts: AttemptRecord[] = [];

  for (let i = 1; i <= maxAttempts; i++) {
    const historyContext =
      attempts.length > 0
        ? `\n\nPrevious attempts:\n${attempts
            .map((a) => `Attempt ${a.number}: ${a.error || "completed"}`)
            .join("\n")}\n`
        : "";

    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${task}${historyContext}`,
        },
      ],
    });

    const output = response.content[0].text || "";
    const validation = validateOutput(output);

    if (validation.isValid) {
      return output;
    }

    attempts.push({
      number: i,
      output,
      error: validation.errors[0],
      timestamp: new Date(),
    });

    // Request reflection if not on last attempt
    if (i < maxAttempts) {
      const reflection = await client.messages.create({
        model: "claude-opus-4.5",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Task: ${task}\n\nYour attempt failed: ${validation.errors[0]}\n\nWhat should you try differently?`,
          },
        ],
      });
      console.log("Reflection:", reflection.content[0].text);
    }
  }

  throw new Error(
    `Failed after ${maxAttempts} attempts. Last error: ${
      attempts[attempts.length - 1].error
    }`
  );
}

function validateOutput(output: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (output.length < 20) errors.push("Output too short");
  if (!output.includes(" ")) errors.push("No proper sentences");
  return { isValid: errors.length === 0, errors };
}
```

---

## Pattern 3: Error-Triggered Reflection

**Use Case**: Reflection only on detected failures
**Lines of Code**: ~60
**Tokens per attempt**: ~400-800

```typescript
interface ReflectionContext {
  originalInput: string;
  failedOutput: string;
  errorType: "validation" | "execution" | "logic";
  errorMessage: string;
}

async function errorTriggeredReflection(
  task: string,
  executeTask: (input: string) => Promise<{ success: boolean; output: string; error?: string }>
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;

    // Generate solution
    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [{ role: "user", content: task }],
    });
    const solution = response.content[0].text || "";

    // Try to execute
    const execution = await executeTask(solution);

    if (execution.success) {
      return solution;
    }

    // Build reflection context
    const context: ReflectionContext = {
      originalInput: task,
      failedOutput: solution,
      errorType: detectErrorType(execution.error),
      errorMessage: execution.error || "Unknown error",
    };

    // Reflect on error
    if (attempts < maxAttempts) {
      const reflectionPrompt = buildReflectionPrompt(context);
      const reflectionResponse = await client.messages.create({
        model: "claude-opus-4.5",
        max_tokens: 400,
        messages: [{ role: "user", content: reflectionPrompt }],
      });
      const reflection = reflectionResponse.content[0].text || "";
      console.log(`Attempt ${attempts} - Reflection:\n${reflection}\n`);

      // Update task with reflection
      task = `${context.originalInput}\n\nPrevious approach didn't work because: ${context.errorMessage}\n\nReflection: ${reflection}\n\nTry again with a different strategy.`;
    }
  }

  throw new Error(
    `Failed after ${maxAttempts} attempts on task: ${task.substring(0, 100)}`
  );
}

function detectErrorType(
  error: string | undefined
): "validation" | "execution" | "logic" {
  if (!error) return "logic";
  if (error.includes("TypeError") || error.includes("SyntaxError"))
    return "execution";
  if (error.includes("assert") || error.includes("expect")) return "validation";
  return "logic";
}

function buildReflectionPrompt(context: ReflectionContext): string {
  return `Your solution failed with this error:

ERROR TYPE: ${context.errorType}
ERROR MESSAGE: ${context.errorMessage}

Your attempted solution:
${context.failedOutput}

Analyze:
1. Why did this approach fail?
2. What's a fundamentally different approach?
3. What assumption was wrong?

Provide a new strategy to solve: ${context.originalInput}`;
}
```

---

## Pattern 4: Instruction-Following Validation

**Use Case**: Ensuring outputs meet explicit criteria
**Lines of Code**: ~80
**Tokens per attempt**: ~400-700

```typescript
interface ValidationRule {
  name: string;
  description: string;
  validate: (output: string) => boolean;
}

interface ValidatedOutput {
  output: string;
  passedRules: string[];
  failedRules: string[];
}

async function validateWithReflection(
  task: string,
  rules: ValidationRule[],
  maxAttempts: number = 3
): Promise<string> {
  let output = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate
    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildGenerationPrompt(
            task,
            rules,
            attempt > 1
          ),
        },
      ],
    });
    output = response.content[0].text || "";

    // Validate
    const validation = validateOutput(output, rules);
    console.log(`Attempt ${attempt}: ${validation.passedRules.length}/${rules.length} rules passed`);

    if (validation.failedRules.length === 0) {
      return output;
    }

    // Reflect if not last attempt
    if (attempt < maxAttempts) {
      const reflection = await client.messages.create({
        model: "claude-opus-4.5",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: buildReflectionPromptForValidation(
              task,
              output,
              validation.failedRules,
              rules
            ),
          },
        ],
      });
      console.log("Reflection:", reflection.content[0].text);
    }
  }

  throw new Error(
    `Validation failed after ${maxAttempts} attempts. ` +
    `Failed rules: ${failedRules.join(", ")}`
  );
}

function buildGenerationPrompt(
  task: string,
  rules: ValidationRule[],
  includeReminder: boolean = false
): string {
  const rulesText = rules
    .map((r) => `- ${r.name}: ${r.description}`)
    .join("\n");

  const reminderText = includeReminder
    ? "\n\nREMINDER: Your previous response violated some of these rules. This time, ensure ALL rules are satisfied."
    : "";

  return `Task: ${task}

Your response MUST satisfy these rules:
${rulesText}${reminderText}`;
}

function validateOutput(
  output: string,
  rules: ValidationRule[]
): ValidatedOutput {
  const passedRules: string[] = [];
  const failedRules: string[] = [];

  for (const rule of rules) {
    if (rule.validate(output)) {
      passedRules.push(rule.name);
    } else {
      failedRules.push(rule.name);
    }
  }

  return { output, passedRules, failedRules };
}

function buildReflectionPromptForValidation(
  task: string,
  output: string,
  failedRules: string[],
  allRules: ValidationRule[]
): string {
  const failedRulesDetails = allRules
    .filter((r) => failedRules.includes(r.name))
    .map((r) => `- ${r.name}: ${r.description}`)
    .join("\n");

  return `Task: ${task}

Your response violated these rules:
${failedRulesDetails}

Your response was:
${output}

What specific changes would make your response satisfy all rules?`;
}

// Example usage
const rules: ValidationRule[] = [
  {
    name: "proper_grammar",
    description: "Response uses proper grammar and punctuation",
    validate: (output) => output.includes(".") || output.includes("?"),
  },
  {
    name: "min_length",
    description: "Response is at least 100 characters",
    validate: (output) => output.length >= 100,
  },
  {
    name: "structured_format",
    description: "Response uses clear formatting with sections",
    validate: (output) => output.includes("\n") && output.split("\n").length >= 3,
  },
];

// const result = await validateWithReflection(
//   "Write about the benefits of reflection in AI",
//   rules,
//   3
// );
```

---

## Pattern 5: Confidence-Based Reflection

**Use Case**: Reflect only when model is uncertain
**Lines of Code**: ~70
**Tokens per attempt**: ~500-1000

```typescript
interface ConfidenceAssessment {
  output: string;
  confidence: number; // 0-1
  uncertaintyAreas: string[];
  suggestedAlternatives: string[];
}

async function confidenceBasedReflection(
  task: string,
  confidenceThreshold: number = 0.75
): Promise<string> {
  // First pass: generate and assess confidence
  const assessment = await generateWithConfidence(task);

  console.log(`Initial confidence: ${(assessment.confidence * 100).toFixed(0)}%`);
  console.log(`Uncertainty areas: ${assessment.uncertaintyAreas.join(", ")}`);

  // If confident enough, return immediately
  if (assessment.confidence >= confidenceThreshold) {
    console.log("Output meets confidence threshold, returning without reflection");
    return assessment.output;
  }

  // If not confident, reflect and improve
  console.log("Confidence below threshold, triggering reflection...");
  const improved = await reflectOnLowConfidence(
    task,
    assessment
  );

  return improved;
}

async function generateWithConfidence(
  task: string
): Promise<ConfidenceAssessment> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `${task}

After providing your response, assess your own confidence by providing a JSON block:
{
  "confidence": <0.0 to 1.0>,
  "uncertaintyAreas": ["area1", "area2"],
  "suggestedAlternatives": ["alternative1", "alternative2"]
}

Only provide JSON for the assessment, nothing else after it.`,
      },
    ],
  });

  const text = response.content[0].text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}$/);

  if (!jsonMatch) {
    return {
      output: text,
      confidence: 0.5,
      uncertaintyAreas: [],
      suggestedAlternatives: [],
    };
  }

  const assessment = JSON.parse(jsonMatch[0]);
  return {
    output: text.substring(0, text.lastIndexOf("{")),
    confidence: assessment.confidence,
    uncertaintyAreas: assessment.uncertaintyAreas || [],
    suggestedAlternatives: assessment.suggestedAlternatives || [],
  };
}

async function reflectOnLowConfidence(
  task: string,
  assessment: ConfidenceAssessment
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Original task: ${task}

Your previous response (confidence: ${(assessment.confidence * 100).toFixed(0)}%):
${assessment.output}

You identified these uncertainty areas:
${assessment.uncertaintyAreas.map((a) => `- ${a}`).join("\n")}

You considered these alternatives:
${assessment.suggestedAlternatives.map((a) => `- ${a}`).join("\n")}

Given your identified uncertainties, provide an improved response that:
1. Directly addresses the uncertainty areas
2. Is more thorough and robust
3. Includes more detail or evidence
4. Considers the alternatives you mentioned

Provide your improved response, then a brief confidence assessment (0-1).`,
      },
    ],
  });

  return response.content[0].text || "";
}
```

---

## Pattern 6: Tool-Feedback Reflection (Code)

**Use Case**: Reflection based on test/lint results
**Lines of Code**: ~90
**Tokens per attempt**: ~600-1200

```typescript
interface CodeFeedback {
  type: "syntax" | "lint" | "test" | "runtime";
  message: string;
  severity: "error" | "warning";
}

async function codeGenerationWithReflection(
  requirement: string,
  maxAttempts: number = 3
): Promise<string> {
  let code = "";
  const feedback: CodeFeedback[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate code
    const response = await client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildCodeGenerationPrompt(
            requirement,
            feedback,
            attempt
          ),
        },
      ],
    });

    code = extractCode(response.content[0].text || "");

    // Get feedback
    const newFeedback = await getCodeFeedback(code);

    if (newFeedback.length === 0) {
      console.log(`Code passed on attempt ${attempt}`);
      return code;
    }

    feedback.push(...newFeedback);
    console.log(
      `Attempt ${attempt}: ${newFeedback.length} issues found`
    );

    // Request reflection if not last attempt
    if (attempt < maxAttempts) {
      const reflection = await client.messages.create({
        model: "claude-opus-4.5",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: buildCodeReflectionPrompt(
              requirement,
              code,
              newFeedback
            ),
          },
        ],
      });
      console.log("Reflection:", reflection.content[0].text);
    }
  }

  throw new Error(
    `Code generation failed after ${maxAttempts} attempts with ${feedback.length} issues`
  );
}

function buildCodeGenerationPrompt(
  requirement: string,
  previousFeedback: CodeFeedback[],
  attempt: number
): string {
  const feedbackText =
    previousFeedback.length > 0
      ? `\n\nPrevious issues found:\n${previousFeedback
          .map(
            (f) =>
              `[${f.severity.toUpperCase()}] ${f.type}: ${f.message}`
          )
          .join("\n")}\n\nFix these issues in your new response.`
      : "";

  return `Generate TypeScript/JavaScript code for:
${requirement}${feedbackText}

Requirements:
- Use modern TypeScript (5.2+)
- Include proper type annotations
- Include error handling
- Include comments for complex logic
- Be production-ready`;
}

async function getCodeFeedback(code: string): Promise<CodeFeedback[]> {
  const feedback: CodeFeedback[] = [];

  // Syntax check
  try {
    // Basic syntax validation (would use ts-node or similar in real implementation)
    eval(code);
  } catch (e) {
    feedback.push({
      type: "syntax",
      message: String(e),
      severity: "error",
    });
  }

  // Lint checks (would use eslint in real implementation)
  if (!code.includes("://") && code.includes("http")) {
    feedback.push({
      type: "lint",
      message: "URL should be quoted string",
      severity: "warning",
    });
  }

  // Complexity check
  const lines = code.split("\n").length;
  if (lines > 100) {
    feedback.push({
      type: "lint",
      message: "Function is too long, consider breaking it up",
      severity: "warning",
    });
  }

  return feedback;
}

function buildCodeReflectionPrompt(
  requirement: string,
  code: string,
  feedback: CodeFeedback[]
): string {
  return `Requirement: ${requirement}

Your code had these issues:
${feedback.map((f) => `[${f.severity.toUpperCase()}] ${f.type}: ${f.message}`).join("\n")}

Current code:
${code}

What specific changes would address these issues? Focus on:
1. The root cause of each issue
2. How to fix it without breaking functionality`;
}

function extractCode(text: string): string {
  // Extract code from markdown code blocks
  const codeBlockMatch = text.match(/```(?:typescript|javascript)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }
  return text;
}
```

---

## Pattern 7: Multi-Agent Reflection (Generator + Critic)

**Use Case**: Higher quality through dialogue between agents
**Lines of Code**: ~100
**Tokens per attempt**: ~800-1600

```typescript
interface CritiqueResult {
  isSatisfactory: boolean;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

class GeneratorCriticReflection {
  private client: LLMClient;
  private maxRounds: number;

  constructor(client: LLMClient, maxRounds: number = 3) {
    this.client = client;
    this.maxRounds = maxRounds;
  }

  async generate(task: string): Promise<string> {
    let output = await this.generatorPass(task);

    for (let round = 1; round < this.maxRounds; round++) {
      const critique = await this.criticPass(task, output);

      if (critique.isSatisfactory) {
        console.log(`✓ Critique satisfied on round ${round}`);
        return output;
      }

      console.log(`Round ${round} critique:`, critique.weaknesses);
      output = await this.generatorImprove(
        task,
        output,
        critique
      );
    }

    return output;
  }

  private async generatorPass(task: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [{ role: "user", content: task }],
    });
    return response.content[0].text || "";
  }

  private async generatorImprove(
    task: string,
    previousOutput: string,
    critique: CritiqueResult
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Task: ${task}

Previous output:
${previousOutput}

Critique feedback:
Weaknesses: ${critique.weaknesses.join("; ")}
Suggestions: ${critique.suggestions.join("; ")}

Provide an improved version that addresses all the feedback.`,
        },
      ],
    });
    return response.content[0].text || "";
  }

  private async criticPass(
    task: string,
    output: string
  ): Promise<CritiqueResult> {
    const response = await this.client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are a critical reviewer.

Task: ${task}

Response to critique:
${output}

Provide a JSON critique:
{
  "isSatisfactory": boolean,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Respond with ONLY the JSON object.`,
        },
      ],
    });

    const text = response.content[0].text || "{}";
    try {
      return JSON.parse(text);
    } catch {
      return {
        isSatisfactory: true,
        strengths: [],
        weaknesses: [],
        suggestions: [],
      };
    }
  }
}

// Usage
// const gc = new GeneratorCriticReflection(client, 3);
// const result = await gc.generate("Write an essay on AI reflection");
```

---

## Pattern 8: State-Aware Reflection with History

**Use Case**: Learning from previous attempts within workflow
**Lines of Code**: ~110
**Tokens per attempt**: ~700-1400

```typescript
interface ExecutionState {
  taskId: string;
  attempt: number;
  previousAttempts: Array<{
    output: string;
    result: "success" | "failed";
    reason: string;
    timestamp: Date;
  }>;
  currentError: string | null;
  succeededApproaches: string[];
  failedApproaches: string[];
}

async function stateAwareReflection(
  task: string,
  state: ExecutionState,
  maxAttempts: number = 3
): Promise<string> {
  while (state.attempt < maxAttempts) {
    state.attempt++;

    // Generate solution informed by history
    const solution = await generateInformedSolution(
      task,
      state
    );

    // Try to execute
    const result = await executeAndValidate(solution);

    if (result.success) {
      // Record success
      state.previousAttempts.push({
        output: solution,
        result: "success",
        reason: "Execution passed all checks",
        timestamp: new Date(),
      });
      state.succeededApproaches.push(result.approachUsed);
      return solution;
    }

    // Record failure
    state.previousAttempts.push({
      output: solution,
      result: "failed",
      reason: result.error,
      timestamp: new Date(),
    });
    state.failedApproaches.push(result.approachUsed);
    state.currentError = result.error;

    // Reflect before next attempt
    if (state.attempt < maxAttempts) {
      const reflection = await reflectWithState(
        task,
        solution,
        result.error,
        state
      );
      console.log(`Attempt ${state.attempt} reflection:`, reflection);
    }
  }

  throw new Error(
    `Task failed after ${maxAttempts} attempts. ` +
    `Last error: ${state.currentError}`
  );
}

async function generateInformedSolution(
  task: string,
  state: ExecutionState
): Promise<string> {
  const historyContext = buildHistoryContext(state);

  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${task}${historyContext}`,
      },
    ],
  });

  return response.content[0].text || "";
}

function buildHistoryContext(state: ExecutionState): string {
  if (state.previousAttempts.length === 0) {
    return "";
  }

  const succeeded =
    state.succeededApproaches.length > 0
      ? `\n\nApproaches that worked: ${state.succeededApproaches.join(", ")}`
      : "";

  const failed =
    state.failedApproaches.length > 0
      ? `\nApproaches that failed: ${state.failedApproaches.join(", ")}`
      : "";

  const recent = state.previousAttempts
    .slice(-2)
    .map(
      (a) =>
        `Attempt ${a.previousAttempts.length}: ${a.result} (${a.reason})`
    )
    .join("\n");

  return `${succeeded}${failed}\n\nRecent attempts:\n${recent}\n\nFor this attempt, try a different approach from what failed before.`;
}

async function reflectWithState(
  task: string,
  solution: string,
  error: string,
  state: ExecutionState
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Task: ${task}

Attempt ${state.attempt} failed with: ${error}

Your attempted solution:
${solution}

What different approach should we try next?
- What assumptions was this approach based on?
- How could those assumptions be wrong?
- What fundamentally different strategy exists?`,
      },
    ],
  });

  return response.content[0].text || "";
}

async function executeAndValidate(solution: string): Promise<{
  success: boolean;
  error: string;
  approachUsed: string;
}> {
  // Mock implementation - would be actual execution
  try {
    // Execute solution (parse, validate, run, etc.)
    return {
      success: true,
      error: "",
      approachUsed: "web_search_approach",
    };
  } catch (e) {
    return {
      success: false,
      error: String(e),
      approachUsed: "web_search_approach",
    };
  }
}
```

---

## Pattern 9: Low-Token Reflection (Budget-Conscious)

**Use Case**: Reflection with minimal token overhead
**Lines of Code**: ~40
**Tokens per attempt**: ~150-300

```typescript
async function budgetConsciousReflection(
  task: string,
  tokenBudget: number = 1000
): Promise<string> {
  let tokensUsed = 0;
  let output = "";

  // Initial generation
  const gen1 = await client.messages.create({
    model: "claude-haiku-4.5", // Cheaper model
    max_tokens: Math.min(500, tokenBudget - 200),
    messages: [{ role: "user", content: task }],
  });

  output = gen1.content[0].text || "";
  tokensUsed += gen1.usage?.input_tokens || 0;
  tokensUsed += gen1.usage?.output_tokens || 0;

  if (tokensUsed + 200 > tokenBudget) {
    return output;
  }

  // Lightweight reflection
  const reflection = await client.messages.create({
    model: "claude-haiku-4.5",
    max_tokens: Math.min(300, tokenBudget - tokensUsed - 100),
    messages: [
      {
        role: "user",
        content: `Review this response for errors (brief 1-2 sentence assessment):\n\n${output.substring(
          0,
          500
        )}...`,
      },
    ],
  });

  tokensUsed +=
    reflection.usage?.input_tokens || 0;
  tokensUsed +=
    reflection.usage?.output_tokens || 0;

  // If still within budget and issues found, do one quick pass
  const reflectionText = reflection.content[0].text || "";
  if (
    tokensUsed + 200 <= tokenBudget &&
    reflectionText.toLowerCase().includes("error")
  ) {
    const fix = await client.messages.create({
      model: "claude-haiku-4.5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Issue: ${reflectionText}\n\nOriginal response: ${output}\n\nQuick fix:`,
        },
      ],
    });

    output = fix.content[0].text || output;
  }

  return output;
}
```

---

## Pattern 10: Timeout-Safe Reflection

**Use Case**: Reflection with guaranteed completion
**Lines of Code**: ~60
**Tokens per attempt**: Variable

```typescript
interface TimeoutAwareReflectionOptions {
  initialTimeout: number; // ms for first attempt
  maxTotalTime: number; // ms for entire reflection
  reflectionTime: number; // ms budget per reflection
}

async function timeoutSafeReflection(
  task: string,
  options: TimeoutAwareReflectionOptions
): Promise<string> {
  const startTime = Date.now();
  const deadline = startTime + options.maxTotalTime;
  let output = "";

  try {
    // First attempt with time limit
    output = await withTimeout(
      generateResponse(task),
      options.initialTimeout
    );
    return output;
  } catch (e) {
    // If generation fails, return error instead of reflecting
    if (Date.now() > deadline) {
      throw new Error("Timeout exceeded during generation");
    }
  }

  // Reflection (only if time permits)
  const timeRemaining = deadline - Date.now();
  if (timeRemaining < 500) {
    // Less than 500ms left, don't reflect
    return output;
  }

  try {
    const reflection = await withTimeout(
      reflectOnOutput(task, output),
      Math.min(options.reflectionTime, timeRemaining - 100)
    );
    return reflection;
  } catch (e) {
    // Reflection failed or timed out, return what we have
    console.warn("Reflection timed out or failed, returning original output");
    return output;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

async function generateResponse(task: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [{ role: "user", content: task }],
  });
  return response.content[0].text || "";
}

async function reflectOnOutput(
  task: string,
  output: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Quickly review and improve:\n\nTask: ${task}\n\nResponse: ${output}`,
      },
    ],
  });
  return response.content[0].text || output;
}
```

---

## Quick Reference: Pattern Selection

| Pattern | Best For | Tokens/Attempt | Latency |
|---------|----------|------------------|---------|
| Simple (1) | Basic validation | 200-400 | +200ms |
| Multi-Attempt (2) | Complex tasks | 300-600 | +400ms |
| Error-Triggered (3) | Execution errors | 400-800 | +500ms |
| IFE Validation (4) | Explicit rules | 400-700 | +400ms |
| Confidence (5) | Uncertain output | 500-1000 | +600ms |
| Tool-Feedback (6) | Code/tests | 600-1200 | +800ms |
| Multi-Agent (7) | High quality | 800-1600 | +1000ms |
| State-Aware (8) | Learning workflows | 700-1400 | +700ms |
| Budget-Conscious (9) | Limited tokens | 150-300 | +200ms |
| Timeout-Safe (10) | Time constraints | Variable | Guaranteed |

---

## Implementation Checklist

When implementing reflection patterns:

- [ ] Define success criteria (not vague goals)
- [ ] Set max retry limit (typically 3-5)
- [ ] Capture error context before reflection
- [ ] Implement exponential backoff for transient errors
- [ ] Use state deduplication to detect loops
- [ ] Include cost/token tracking
- [ ] Log all attempts and reflections
- [ ] Test with both success and failure paths
- [ ] Monitor reflection effectiveness (did it help?)
- [ ] Consider latency impact on user experience
- [ ] Plan graceful degradation if reflection fails


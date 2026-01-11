# AI Agent Reflection & Self-Correction Patterns - Research Summary

**Date**: December 2025
**Focus**: Comprehensive research on reflection and self-correction patterns for AI agent frameworks

## Table of Contents

1. [Reflection in AI Systems](#reflection-in-ai-systems)
2. [Reflection Levels & Triggers](#reflection-levels--triggers)
3. [Implementation Patterns](#implementation-patterns)
4. [Reflection Prompt Templates](#reflection-prompt-templates)
5. [Existing Framework Approaches](#existing-framework-approaches)
6. [Best Practices & Guardrails](#best-practices--guardrails)
7. [When NOT to Reflect](#when-not-to-reflect)
8. [State Capture Patterns](#state-capture-patterns)
9. [Code Implementation Examples](#code-implementation-examples)

---

## Reflection in AI Systems

### What is Reflection?

Reflection in AI agent contexts refers to an agent's ability to **think about its own actions and results in order to self-correct and improve**. It's essentially the AI analog of human introspection or "System 2" deliberative thinking. Rather than merely reacting instinctively, a reflective AI will pause to analyze what it has done, identify errors or suboptimal steps, and adjust its strategy.

Key insight: Agents that can check and improve their own output are fundamentally more reliable because they catch mistakes before they compound, self-correct when they drift, and get better as they iterate.

### Core Components of Reflection

The reflection pattern typically follows a three-phase cycle:

1. **Generation** - The model creates an initial output based on a prompt
2. **Reflection** - The AI critiques its own work, identifying areas for improvement
3. **Iteration/Refinement** - The AI refines its output based on feedback and continues until quality thresholds are met

### Why Reflection Matters

Research demonstrates significant performance improvements:
- **Reflexion (Shinn et al., 2023)**: Achieved 91% success rates in complex tasks
- **CRITIC (Gou et al., 2024)**: Showed 10-30% improvement in accuracy across multiple domains
- **Reflexion + GPT-4**: Reached 91% on HumanEval coding benchmark vs 80% without reflection

---

## Reflection Levels & Triggers

### Three Levels of Reflection

#### 1. **Prompt-Level Reflection**
- Occurs within a single LLM call
- Model is prompted to "check your work" after generation
- Lightweight, uses only one additional prompt
- Good for: Basic quality improvement, simple validations
- Cost: 1 additional LLM call

#### 2. **Agent-Level Reflection**
- Occurs between tool calls or action sequences
- Agent pauses after each major step to evaluate progress
- Can include both self-assessment and external tool feedback
- Good for: Multi-step tasks, tool-based workflows
- Cost: Adds latency but improves task success

#### 3. **Workflow-Level Reflection**
- Occurs at the orchestration level
- Multiple agents or sub-tasks are evaluated together
- Captures systemic improvements and pattern recognition
- Good for: Complex multi-agent systems, long-running workflows
- Cost: Significant additional compute, reserved for high-value tasks

### Trigger Mechanisms

#### **Error-Driven Reflection** (Most Common)
Triggered when:
- Tool call fails with error
- Output validation rules fail
- Test/assertion fails
- Response status codes indicate problems

Pattern:
```
Output → Validate → Error Detected → Reflect → Retry
```

#### **Low-Confidence Reflection**
Triggered when:
- Model expresses uncertainty in output
- Confidence score below threshold
- Multiple alternative interpretations exist
- Ambiguous user input detected

Mechanism:
- Use certainty tokens or confidence metadata
- Leverage model's own uncertainty assessment
- Self-Reflection Certainty: Ask model "Does this seem correct to you?"
- Dynamically adjust confidence as model reasons (chain-of-thought)

#### **Manual/Explicit Triggers**
- User explicitly requests reflection
- Scheduled checkpoints in workflow
- Budget-based (after N tokens/steps)
- Performance-based (when metric drops below threshold)

#### **Progress-Based Triggers**
- No progress after N iterations
- State duplication (same output returned twice)
- Repeated error patterns
- Timeout approaching

---

## Implementation Patterns

### Pattern 1: Error Detection → Reflection → Retry Loop

**Core Cycle:**
```
1. Generate Solution
2. Execute/Validate → Capture Error
3. Reflect: "What went wrong? Why did this fail?"
4. Retry with improved strategy
5. Loop until success or max attempts reached
```

**Key Variables:**
- `max_retry_limit`: Total retry attempts (default: 3-5)
- `retry_count`: Current attempt number
- `error_context`: Captured error message/state
- `previous_attempts`: History of what was tried

**Implementation Considerations:**
- Always include error message in reflection prompt
- Maintain history of previous attempts to avoid loops
- Implement exponential backoff for API calls
- Track which approaches failed to suggest different strategies

### Pattern 2: Instruction-Following Validation (IFE)

Treats LLM outputs as **untrusted inputs requiring explicit validation**.

**Flow:**
```
Agent Generates Output
    ↓
Validation Checkpoint:
  - Check instruction compliance
  - Verify format requirements
  - Validate output constraints
    ↓
If Violations Detected:
  - Log specific failures
  - Refine prompt with violation details
  - Retry (up to max attempts)
    ↓
If Passed:
  - Accept and proceed
```

**Example Constraints:**
```
- Time estimates: numeric only, 0-4.0 range, no units
- Function names: snake_case, no special characters
- Response format: valid JSON, specific schema
- Length: within min/max bounds
```

### Pattern 3: Reflexion Architecture

Separates three distinct models/roles:

1. **Actor** - Generates text and actions using Chain-of-Thought or ReAct
2. **Evaluator** - Scores outputs by assigning reward signals
3. **Self-Reflection** - Generates verbal feedback using rewards and memory

**Flow:**
```
Task Definition
    ↓
Generate Initial Trajectory (Actor)
    ↓
Evaluate Outcome (Evaluator assigns reward score)
    ↓
Generate Reflection (Self-Reflection creates verbal feedback)
    ↓
Store in Memory
    ↓
Generate Next Trajectory (with reflection context)
```

Advantages:
- Structured feedback mechanism
- Interpretable reflection output
- Can learn from feedback across multiple attempts
- Grounded in external signals (rewards)

### Pattern 4: Tool-Enhanced Reflection

Agent uses external tools to verify correctness before self-reflection.

**Tools Used:**
- Unit tests / test cases
- Code linters (for TypeScript/Python)
- Web search to verify facts
- APIs to validate data
- Sandbox execution to catch runtime errors

**Flow:**
```
Generate Code
    ↓
Run Tests/Linter
    ↓
Capture Feedback
    ↓
Reflect on Specific Failures
    ↓
Revise Based on Concrete Evidence
```

**Key Insight**: Type-checked languages (TypeScript vs JavaScript) provide multiple layers of automatic feedback, improving reflection quality.

### Pattern 5: Multi-Agent Reflection

Rather than self-reflection, deploy two specialized agents:
1. **Generator Agent** - Prompted to produce outputs
2. **Critic Agent** - Prompted to provide constructive criticism

**Flow:**
```
Generator creates output
    ↓
Critic reviews and provides specific feedback:
  - What works well
  - What's missing or wrong
  - Specific improvement suggestions
    ↓
Generator receives critique
    ↓
Revised output
    ↓
(Loop up to N times or until satisfied)
```

Benefits:
- More diverse feedback (different reasoning path)
- Can leverage specialized critic models
- Dialogue creates interactive improvement
- Often produces better results than self-reflection alone

---

## Reflection Prompt Templates

### Template 1: Basic Self-Critique (Lightweight)

```
Original Task: [TASK]

Your previous response:
[RESPONSE]

Please review your response for:
1. Accuracy - Is the information correct?
2. Completeness - Did you address all aspects of the task?
3. Clarity - Is it easy to understand?
4. Potential improvements - What could be better?

Identify any issues and provide a revised response.
```

**Cost**: Single additional LLM call
**Best for**: Quick quality improvements, simple tasks

---

### Template 2: Error-Context Reflection (With Feedback)

```
Original Task: [TASK]

Your previous attempt:
[PREVIOUS_RESPONSE]

Error encountered: [ERROR_MESSAGE]

Analysis: What specifically caused this error?
- Root cause analysis
- What assumption was wrong?
- What information was missing?

Revised approach: Provide a corrected solution that addresses the specific error.
Explain your reasoning for why this approach will work better.
```

**Cost**: Single additional LLM call with rich context
**Best for**: Recovery from errors, learning from failures

---

### Template 3: Expert Persona Reflection

```
Original Task: [TASK]

Response to evaluate:
[RESPONSE]

You are now a [EXPERT_ROLE: code reviewer | technical architect | quality assurance specialist].
Review the above response from the perspective of [EXPERT_ROLE].

Specifically evaluate:
1. [TECHNICAL_CRITERIA]
2. [BEST_PRACTICES]
3. [EDGE_CASES]
4. [PERFORMANCE/QUALITY_METRICS]

Provide your expert assessment and specific improvements.
```

**Cost**: Single additional LLM call
**Best for**: Complex technical outputs, code, architectural decisions

---

### Template 4: Structured Reflection with Rubric

```
Original Task: [TASK]

Generated Output:
[OUTPUT]

Evaluation Rubric:
1. Requirement A: [DESCRIPTION]
   Status: ✓ Met / ✗ Not Met
   If not met, why?

2. Requirement B: [DESCRIPTION]
   Status: ✓ Met / ✗ Not Met
   If not met, why?

[... for each requirement ...]

Summary:
- Which requirements were NOT met?
- Specific fixes needed for each failure
- Revised output addressing all requirements

Provide corrected output that meets all requirements.
```

**Cost**: Single additional LLM call
**Best for**: Tasks with explicit criteria, validation-heavy workflows

---

### Template 5: Confidence-Triggered Reflection

```
Original Task: [TASK]

Your response:
[RESPONSE]

Before we proceed, please evaluate your own confidence:
1. How confident are you that this response is correct? (0-100%)
2. What aspects are you uncertain about?
3. What additional information would increase your confidence?

If confidence < 80%:
- Identify specific sources of uncertainty
- Provide alternative approaches you considered
- Suggest how to verify your answer
- Offer a revised response with higher confidence
```

**Cost**: Single additional call with conditional branching
**Best for**: High-stakes decisions, complex problem-solving

---

### Template 6: Multi-Turn Reflection Loop

```
ROUND 1 - Initial Generation:
[INITIAL_PROMPT]

ROUND 2 - Self-Critique:
"Review your response for: correctness, completeness, clarity, and efficiency.
Identify specific issues."

[CRITIQUE_FROM_PREVIOUS_ROUND]

ROUND 3 - Improvement:
"Based on the identified issues, provide an improved version.
Explain what you changed and why."

[CONTINUE_FOR_UP_TO_N_ROUNDS]

Quality Checkpoint:
Does current output meet all quality criteria? If yes, finalize.
If no, continue round [N+1].
```

**Cost**: Multiple LLM calls (3-5 typically)
**Best for**: Complex writing, algorithm optimization, architectural design

---

## Existing Framework Approaches

### LangChain/LangGraph Reflection

LangChain implements reflection through **LangGraph**, a stateful graph framework.

**Three Core Patterns:**

#### 1. Basic Reflection (MessageGraph)
```typescript
- State: List of messages
- Generator Node: Produces initial responses
- Reflector Node: Acts as "teacher" providing constructive criticism
- Edges: Loop back up to N times
```

#### 2. Reflexion Pattern
```typescript
- Generator produces draft
- Tools are executed
- Feedback captured
- Revision happens with reflection context
- Conditional loop based on iteration count
```

#### 3. Language Agent Tree Search (LATS)
```typescript
- Combines reflection/evaluation with Monte Carlo tree search
- Four steps: Select → Expand/Simulate → Reflect+Evaluate → Backpropagate
- Uses StateGraph with tree-based exploration
```

**Key Implementation Details:**
- Uses `add_node()`, `add_edge()`, `add_conditional_edges()`
- State is shared data structure representing current snapshot
- Nodes encode logic, perform computation, make LLM calls
- Edges define next node based on current state

**Trade-off**: Reflection requires additional computational time and resources. Each pattern trades latency for higher output quality. Not suitable for low-latency applications.

---

### Reflexion Framework (Shinn et al., 2023)

**Design Philosophy**: Keep model frozen, use text-based feedback as reinforcement.

**Components**:
1. **Actor** - Attempts task using Chain-of-Thought/ReAct with memory
2. **Evaluator** - Assigns reward scores to trajectories
3. **Self-Reflection** - Generates verbal feedback from rewards

**Key Feature**: Reflexion forces explicit grounding in external data:
- Must cite sources for claims
- Explicitly enumerate superfluous aspects (what's wrong)
- Explicitly enumerate missing aspects (what's needed)

**Results**:
- 91% success on complex tasks vs lower baselines
- Strong performance on: AlfWorld (decision-making), HotPotQA (reasoning), HumanEval/MBPP (programming)

**Best Use Cases**:
- Iterative learning from mistakes
- When traditional RL is impractical
- Tasks where interpretability matters
- Systems requiring nuanced feedback

---

### Claude/Anthropic Reflection Patterns

**Philosophy**: Simplicity over complexity. Start with simple prompts, optimize through evaluation, add multi-step systems only when necessary.

**Core Principles**:
1. Maintain simplicity in agent design
2. Prioritize transparency (show planning steps explicitly)
3. Carefully craft agent-computer interface (ACI) through tool documentation

**Evaluator-Optimizer Workflow**:
```
One LLM Call: Generates response
    ↓
Another LLM Call: Provides evaluation and feedback
    ↓
Loop: Iteratively refine
```

**Most Effective When**:
- Clear evaluation criteria exist
- Iterative refinement provides measurable value
- Not implementing complex internal reasoning

**Extended Thinking Integration**:
- Use extended thinking for complex reasoning within reflection
- Interleaved mode: tool call → tool result → reflection thinking
- Strongly prefer thinking block when uncertain
- Enables "System 2" deliberative thinking in reflection phase

**Feedback Approaches**:
- **Rules-Based Feedback**: Define explicit rules, explain which failed and why
- **Code Linting**: Type-checked languages (TypeScript) provide automatic feedback layers
- **Sandbox Execution**: Run code to identify bugs

---

### AutoGPT Self-Correction

**Approach**: Analyze feedback from errors and adjust strategy.

**Core Mechanism**:
```
Execute Step
    ↓
Evaluate Outcome
    ↓
If Failed:
  - Run reflection process
  - Diagnose failure points
  - Update strategy
  - Proceed
```

**Key Features**:
- Flexible automation with error analysis
- Requires human oversight to prevent infinite loops
- Handles many errors on client side

**Recent Innovation: Retrials Without Feedback**
Research shows "retrials without feedback" is effective:
- Retry whenever incorrect answer identified
- No explicit self-reflection needed
- Continue until correct solution found or budget exhausted
- Simpler than Reflexion, surprisingly effective

---

### Google Agent Development Kit (ADK) - Reflect & Retry

**Technical Implementation**:

**Core Mechanism**: Intercepts tool failures, provides structured guidance for correction, retries up to configurable limit.

**Key Features**:
- Concurrency-safe with locking mechanisms
- Failure tracking per-invocation (default) or global across users
- Custom error extraction by overriding detection methods
- Supports both transient and logical errors

**Configuration**:
```
max_retries: 3 (default)
throw_on_exceeded: true (default)
failure_scope: per_invocation or global
```

**Advanced Pattern**: Custom error detection
```
Override extract_error_from_result() to identify:
- HTTP status codes
- Custom response fields
- Error patterns in normal responses
```

---

## Best Practices & Guardrails

### Maximum Reflection Attempts

**Industry Standard**: 3-5 maximum reflection attempts

**Recommended Configuration**:
```
- Basic Tasks (simple validation): 2 attempts
- Standard Tasks (tool-based workflows): 3 attempts
- Complex Reasoning: 4-5 attempts
- Never exceed: 8 attempts
```

**Guardrails to Prevent Loops**:
1. **Hard iteration limit**: `max_rounds` (fixed ceiling)
2. **No-progress detection**: Stop after K rounds with no improvement
3. **State-hash deduplication**: Exit if returning to previous state
4. **Cost budget**: Total token limit across all attempts
5. **Timeout mechanism**: Overall time limit (not just per-request)

### Error Handling Strategy

**Distinguish Error Types**:

| Error Type | Action | Retry? |
|-----------|--------|--------|
| Transient (timeout, rate limit) | Wait with exponential backoff | Yes (2-3x) |
| Logical (wrong approach) | Reflect, change strategy | Yes (up to 3x) |
| Invalid input (bad data) | Return error to user | No |
| Model refusal | Accept result | No |
| Permanent failure (API down) | Escalate/fallback | No |

**Backoff Strategies**:
- **Constant Backoff**: Fixed delay (e.g., 1 second)
- **Exponential Backoff**: Delay doubles each attempt
- **Jittered Backoff**: Add randomness to prevent thundering herd

Example exponential backoff:
```
Attempt 1: Retry immediately
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 4 seconds
Attempt 5: Wait 8 seconds
```

### Success Criteria Matter

Clear success criteria prevent infinite loops:

**Bad**: "Fix the bug", "optimize the database", "improve the response"
**Good**: "Make test_user_login pass", "reduce query time below 100ms", "increase BLEU score to 0.85+"

### State Capture Before Reflection

**What to Capture**:
1. **Input Context**: Original request, parameters, user intent
2. **Execution Snapshot**: Current state at failure point
3. **Error Details**: Exception, error code, message
4. **Attempt History**: What was tried before, outcomes
5. **Decision Metadata**: Why each choice was made, confidence level

**Storage Strategy**:
- Use lightweight JSON objects
- Store in Redis with expiration matching workflow duration
- Separate learned patterns from temporary processing state
- Keep reasoning chain (why decisions were made) separate

---

## When NOT to Reflect

### Scenarios to Avoid Reflection

#### 1. **Low-Stakes, High-Velocity Tasks**
- Real-time chat responses
- Autocomplete suggestions
- Quick lookups
- Requirements: <100ms latency

**Cost/Benefit**: Cost of reflection exceeds value of marginal improvement

#### 2. **Well-Understood, Deterministic Workflows**
- Simple CRUD operations
- Predictable data transformations
- Tasks with 99%+ baseline accuracy

**Cost/Benefit**: No errors to fix, reflection wastes tokens

#### 3. **Clear Model Refusals**
- User asks model to do something against policies
- Model refuses for safety reasons
- No reflection can change this outcome

**Cost/Benefit**: Reflection won't help

#### 4. **Ambiguous User Input Without Clarification**
- User request is unclear
- Model can't determine intent

**Better approach**: Ask clarifying questions, don't reflect

#### 5. **High-Confidence Outputs with Good Validation**
- Model is highly confident
- Output passes all validation checks
- Tests confirm correctness

**Cost/Benefit**: Reflection adds latency with no benefit

#### 6. **Token Budget Constraints**
- Limited tokens remaining in context window
- Reflection would consume majority of remaining budget

**Cost/Benefit**: Can't afford the cost

#### 7. **Cascading Failures**
- Reflection failure causes downstream failures
- Loop detection shows same error pattern repeating

**Better approach**: Escalate to human or fallback

### Performance Impact

**Cost of Reflection**:
- Each reflection attempt = ~1 additional LLM call
- Latency: +200-2000ms per reflection (depends on model)
- Cost: +1x-2x per reflection (depending on output length)

**When Cost Justifies Benefit**:
- High-value decisions (code generation, critical business logic)
- Complex reasoning tasks
- Where 10-30% improvement is meaningful
- User acceptable for 2-5x latency increase

### Confidence-Based Thresholds

**Reflection Triggers**:
- Model confidence < 70%: Trigger reflection
- Model confidence 70-85%: Optional reflection
- Model confidence > 85%: Skip reflection

**Implementation**:
- Use model's own uncertainty assessment
- Leverage confidence tokens from extended thinking
- Monitor chain-of-thought for hedging language
- Track prediction confidence scores

---

## State Capture Patterns

### Pre-Reflection State Snapshot

Capture critical state **before** attempting reflection:

```json
{
  "attempt_number": 1,
  "timestamp": "2025-12-08T12:34:56Z",
  "input": {
    "user_request": "...",
    "context": "...",
    "parameters": {...}
  },
  "generation": {
    "output": "...",
    "model": "claude-opus-4.5",
    "tokens_used": 245,
    "confidence": 0.65
  },
  "validation": {
    "passed": false,
    "violations": ["format_check_failed", "logic_error"],
    "error_message": "..."
  },
  "error_context": {
    "type": "logical_error",
    "details": "..."
  }
}
```

### Reasoning Chain Logging

Separate reasoning metadata from content:

```json
{
  "decision_point": "tool_selection",
  "options_considered": ["approach_a", "approach_b", "approach_c"],
  "chosen": "approach_a",
  "reasoning": "Approach A is more efficient because...",
  "confidence": 0.72,
  "alternative_rationale": "Approach B would work but...",
  "risk_factors": ["potential_timeout", "edge_case_handling"]
}
```

Benefits:
- Recovery doesn't re-analyze same information
- Next attempt picks up decision trail where it left off
- Provides context for reflection prompts

### Memory State Preservation

Distinguish learned patterns from temporary state:

```json
{
  "learned_patterns": {
    "document_structure_insights": ["..."],
    "user_preferences": ["..."],
    "error_recovery_strategies": ["..."]
  },
  "temporary_state": {
    "current_task_context": "...",
    "current_output": "...",
    "current_attempt": 2
  }
}
```

**Key principle**: When individual tasks fail, preserve learned insights while resetting temporary state.

### State for Error Recovery

Include information needed for intelligent retry:

```json
{
  "failed_attempt": {
    "approach": "web_search_strategy",
    "output": "...",
    "error": "timeout"
  },
  "recovery_context": {
    "what_worked_before": [
      {"approach": "api_call", "result": "success"},
      {"approach": "local_cache", "result": "cache_miss"}
    ],
    "what_failed": [
      {"approach": "web_search", "reason": "timeout"}
    ],
    "suggestion": "Try API call approach next"
  }
}
```

---

## Code Implementation Examples

### Example 1: Basic Error-Reflection-Retry Loop (TypeScript)

```typescript
interface ReflectionState {
  attempt: number;
  maxAttempts: number;
  lastError: string | null;
  attemptHistory: Array<{
    approach: string;
    result: string;
    error: string | null;
  }>;
}

async function executeWithReflection(
  task: string,
  maxAttempts: number = 3
): Promise<string> {
  const state: ReflectionState = {
    attempt: 0,
    maxAttempts,
    lastError: null,
    attemptHistory: [],
  };

  while (state.attempt < state.maxAttempts) {
    state.attempt++;

    try {
      // Step 1: Generate solution
      const solution = await generateSolution(task, state.attemptHistory);

      // Step 2: Validate
      const validation = validateOutput(solution);
      if (validation.isValid) {
        return solution;
      }

      // Step 3: Reflect on failure
      state.lastError = validation.errors.join("; ");
      const reflection = await reflectOnFailure(
        task,
        solution,
        validation.errors,
        state.attemptHistory
      );

      // Step 4: Update history
      state.attemptHistory.push({
        approach: reflection.suggestedApproach,
        result: solution,
        error: state.lastError,
      });

    } catch (error) {
      state.lastError = String(error);

      // Attempt recovery reflection
      const recovery = await reflectOnError(task, error, state.attemptHistory);
      state.attemptHistory.push({
        approach: recovery.suggestedApproach,
        result: "",
        error: state.lastError,
      });
    }
  }

  throw new Error(
    `Failed after ${state.maxAttempts} attempts. ` +
    `Last error: ${state.lastError}`
  );
}

async function generateSolution(
  task: string,
  history: ReflectionState["attemptHistory"]
): Promise<string> {
  const historyContext = history.length > 0
    ? `Previous attempts:\n${history
        .map((h, i) => `Attempt ${i + 1} (${h.approach}): ${h.error || "failed"}`)
        .join("\n")}\n`
    : "";

  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${historyContext}\nTask: ${task}\n\nGenerate a solution.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function reflectOnFailure(
  task: string,
  solution: string,
  errors: string[],
  history: ReflectionState["attemptHistory"]
): Promise<{ suggestedApproach: string }> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Task: ${task}

Your previous solution failed with these issues:
${errors.map((e) => `- ${e}`).join("\n")}

Previous solution:
${solution}

Analyze what went wrong and suggest a different approach that would avoid these issues.`,
      },
    ],
  });

  return {
    suggestedApproach:
      response.content[0].type === "text" ? response.content[0].text : "",
  };
}

async function reflectOnError(
  task: string,
  error: unknown,
  history: ReflectionState["attemptHistory"]
): Promise<{ suggestedApproach: string }> {
  // Similar to reflectOnFailure but handles exceptions
  return {
    suggestedApproach: `Error recovery strategy after: ${String(error)}`,
  };
}

function validateOutput(output: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!output || output.trim().length === 0) {
    errors.push("Output is empty");
  }

  if (output.length < 10) {
    errors.push("Output is too short");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

---

### Example 2: Instruction-Following Validation Pattern

```typescript
interface ValidationRule {
  name: string;
  validate: (value: any) => boolean;
  errorMessage: string;
}

interface InstructionFollowingEvaluator {
  rules: ValidationRule[];
  maxRetries: number;
}

async function validateWithIFE(
  task: string,
  evaluator: InstructionFollowingEvaluator
): Promise<string> {
  let retries = 0;

  while (retries < evaluator.maxRetries) {
    // Generate output
    const output = await generateOutput(task);

    // Check each rule
    const violations: string[] = [];
    for (const rule of evaluator.rules) {
      if (!rule.validate(output)) {
        violations.push(rule.errorMessage);
      }
    }

    // If all rules pass, return
    if (violations.length === 0) {
      return output;
    }

    // If violations, refine and retry
    retries++;
    if (retries < evaluator.maxRetries) {
      const refinedTask = await refinePormptWithViolations(
        task,
        output,
        violations
      );
      task = refinedTask;
    } else {
      throw new Error(
        `Validation failed after ${evaluator.maxRetries} attempts. ` +
        `Violations: ${violations.join("; ")}`
      );
    }
  }

  throw new Error("Unexpected error in IFE validation");
}

async function generateOutput(task: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [{ role: "user", content: task }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function refinePormptWithViolations(
  originalTask: string,
  output: string,
  violations: string[]
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Original task: ${originalTask}

Your output failed these validation rules:
${violations.map((v) => `- ${v}`).join("\n")}

Your output was:
${output}

Revise the task/instructions to ensure the next attempt will satisfy all rules.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// Example usage with specific validation rules
const codeEvaluator: InstructionFollowingEvaluator = {
  maxRetries: 3,
  rules: [
    {
      name: "valid_syntax",
      validate: (code) => {
        try {
          // Parse or compile check
          return code.includes("function") || code.includes("const");
        } catch {
          return false;
        }
      },
      errorMessage: "Code must have valid TypeScript syntax",
    },
    {
      name: "includes_tests",
      validate: (code) => code.includes("test") || code.includes("describe"),
      errorMessage: "Code must include test cases",
    },
    {
      name: "has_comments",
      validate: (code) => code.includes("//") || code.includes("/*"),
      errorMessage: "Code must include comments",
    },
  ],
};
```

---

### Example 3: Reflexion-Style Architecture

```typescript
interface ReflexionState {
  task: string;
  trajectory: string;
  reward: number;
  reflection: string;
  nextAttempt: string;
}

class ReflexionAgent {
  private actor: LLMClient;
  private evaluator: (output: string) => number;
  private reflector: LLMClient;
  private memory: ReflexionState[] = [];

  async runReflexion(task: string, maxIterations: number = 3): Promise<string> {
    let currentTask = task;

    for (let i = 0; i < maxIterations; i++) {
      // Step 1: Actor generates trajectory
      const trajectory = await this.actor.generate(currentTask);

      // Step 2: Evaluator assigns reward
      const reward = this.evaluator(trajectory);

      // Step 3: Reflector generates feedback
      const reflection = await this.reflector.generateReflection(
        task,
        trajectory,
        reward,
        this.memory
      );

      // Step 4: Store in memory
      const state: ReflexionState = {
        task,
        trajectory,
        reward,
        reflection,
        nextAttempt: "",
      };
      this.memory.push(state);

      // Step 5: Use reflection to improve next attempt
      if (reward > 0.8) {
        // Good enough, return
        return trajectory;
      }

      // Prepare for next iteration with reflection context
      currentTask = `${task}

Previous attempt feedback:
${reflection}

Generate an improved solution that addresses the feedback above.`;
    }

    return this.memory[this.memory.length - 1].trajectory;
  }
}

class ReflectorModel {
  private client: LLMClient;

  async generateReflection(
    task: string,
    trajectory: string,
    reward: number,
    memory: ReflexionState[]
  ): Promise<string> {
    const memoryContext =
      memory.length > 0
        ? `Previous attempts and feedback:\n${memory
            .slice(-2)
            .map((m) => `Reward: ${m.reward}\nFeedback: ${m.reflection}`)
            .join("\n\n")}\n`
        : "";

    const response = await this.client.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Task: ${task}

${memoryContext}

Current attempt (reward score: ${reward}):
${trajectory}

Evaluate this attempt:
1. What did it do well?
2. What are the specific failures or issues?
3. What should be tried differently in the next attempt?
4. What patterns from previous attempts should be avoided?

Format your response as structured verbal feedback.`,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}
```

---

### Example 4: Multi-Agent Reflection

```typescript
class MultiAgentReflection {
  private generator: LLMClient;
  private critic: LLMClient;

  async reflectiveGeneration(
    task: string,
    maxRounds: number = 3
  ): Promise<string> {
    let currentOutput = await this.generator.generate(task);

    for (let round = 1; round < maxRounds; round++) {
      // Get critique
      const critique = await this.critic.critique(task, currentOutput);

      if (critique.isSatisfactory) {
        return currentOutput;
      }

      // Generate improvement
      currentOutput = await this.generator.improve(
        task,
        currentOutput,
        critique.feedback,
        critique.suggestions
      );
    }

    return currentOutput;
  }

  async generate(task: string): Promise<string> {
    const response = await this.generator.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [{ role: "user", content: task }],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async improve(
    task: string,
    currentOutput: string,
    feedback: string,
    suggestions: string[]
  ): Promise<string> {
    const response = await this.generator.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Task: ${task}

Current output:
${currentOutput}

Feedback from review:
${feedback}

Specific improvements to make:
${suggestions.map((s) => `- ${s}`).join("\n")}

Provide an improved version that addresses all feedback.`,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async critique(
    task: string,
    output: string
  ): Promise<{
    isSatisfactory: boolean;
    feedback: string;
    suggestions: string[];
  }> {
    const response = await this.critic.messages.create({
      model: "claude-opus-4.5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are a critical reviewer. Evaluate this response:

Task: ${task}

Response:
${output}

Provide:
1. Overall assessment (satisfactory or needs improvement)
2. Specific issues with the current response
3. Concrete suggestions for improvement

Format as JSON: { "isSatisfactory": boolean, "feedback": string, "suggestions": string[] }`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "{}";
    return JSON.parse(text);
  }
}
```

---

### Example 5: Confidence-Based Reflection Trigger

```typescript
interface ConfidenceMetadata {
  overallConfidence: number;
  uncertaintyAreas: string[];
  alternativesConsidered: string[];
}

async function confidenceBasedReflection(
  task: string,
  confidenceThreshold: number = 0.75
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${task}

After your response, provide a JSON block with confidence metadata:
{
  "overallConfidence": <0-1>,
  "uncertaintyAreas": ["area1", "area2"],
  "alternativesConsidered": ["alternative1", "alternative2"]
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract response and metadata
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const metadata: ConfidenceMetadata = jsonMatch
    ? JSON.parse(jsonMatch[0])
    : { overallConfidence: 0.5, uncertaintyAreas: [], alternativesConsidered: [] };

  // If confidence too low, reflect
  if (metadata.overallConfidence < confidenceThreshold) {
    const reflection = await reflectWithLowConfidence(
      task,
      text,
      metadata
    );
    return reflection;
  }

  return text;
}

async function reflectWithLowConfidence(
  task: string,
  initialResponse: string,
  metadata: ConfidenceMetadata
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Original task: ${task}

Your previous response (confidence: ${metadata.overallConfidence}):
${initialResponse}

You indicated uncertainty in these areas:
${metadata.uncertaintyAreas.map((a) => `- ${a}`).join("\n")}

You considered these alternatives:
${metadata.alternativesConsidered.map((a) => `- ${a}`).join("\n")}

Given your own identified uncertainties:
1. Identify what specific information would increase your confidence
2. Provide a revised response that addresses these uncertainty areas
3. Explain how your revised response is more robust`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
```

---

## Summary & Key Takeaways

### What Is Reflection?
Self-reflection in AI agents enables error detection, analysis, and correction without human intervention. It's a three-phase cycle: generate → analyze → improve.

### When to Implement Reflection
- **Error recovery**: When outputs fail validation
- **Iterative refinement**: Complex tasks needing multiple passes
- **High-stakes decisions**: Code generation, critical logic
- **Low-confidence outputs**: When model expresses uncertainty

### When NOT to Implement Reflection
- Low-latency requirements (<100ms)
- Simple, deterministic tasks
- Well-understood workflows with 99%+ baseline accuracy
- Clear model refusals
- Token budget constraints

### Best Practices
1. **Limit retries**: 3-5 attempts maximum, never unlimited
2. **Clear success criteria**: Specific, measurable goals (not vague)
3. **State capture**: Preserve context for intelligent retry
4. **Error categorization**: Different strategies for different error types
5. **Backoff strategies**: Exponential backoff for transient errors
6. **Avoid reflection loops**: Use state deduplication and progress detection

### Implementation Hierarchy
1. Start simple: Basic self-critique in prompts
2. Add validation: Explicit output rules
3. Multi-attempt: Error-reflection-retry loop (3 attempts)
4. Tool-enhanced: Use linters, tests, execution for feedback
5. Multi-agent: Deploy separate critic for complex tasks
6. Full Reflexion: If baseline approaches insufficient

### Framework Selection
- **LangChain/LangGraph**: Pre-built reflection patterns, good for graph-based workflows
- **Anthropic/Claude**: Emphasis on simplicity, extended thinking for reflection
- **Google ADK**: Specialized reflect-and-retry plugin
- **Custom**: Lightweight TypeScript patterns for specific needs


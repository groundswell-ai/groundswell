# Reflection and Self-Correction: Implementation Guide

This guide provides practical TypeScript/Python code examples for implementing reflection patterns in agent orchestration systems.

---

## 1. Basic Reflection Loop Implementation

### TypeScript: Simple Reflection Pattern

```typescript
interface ReflectionState {
  task: string;
  attempt: number;
  output: string;
  feedback: string;
  quality: number;
  shouldRetry: boolean;
}

class ReflectionAgent {
  private maxAttempts = 3;
  private qualityThreshold = 0.8;

  async executeWithReflection(task: string): Promise<string> {
    let state: ReflectionState = {
      task,
      attempt: 0,
      output: "",
      feedback: "",
      quality: 0,
      shouldRetry: true,
    };

    while (state.attempt < this.maxAttempts && state.shouldRetry) {
      state.attempt++;

      // Step 1: Generate output
      state.output = await this.generateOutput(state.task);

      // Step 2: Evaluate quality
      state.quality = await this.evaluateQuality(state.output, state.task);

      // Step 3: Check if good enough
      if (state.quality >= this.qualityThreshold) {
        return state.output;
      }

      // Step 4: Generate feedback for reflection
      state.feedback = await this.generateFeedback(
        state.task,
        state.output,
        state.quality
      );

      // Step 5: Use feedback to improve
      state.output = await this.improveBasedOnFeedback(
        state.output,
        state.feedback
      );

      // Step 6: Decide whether to continue
      state.shouldRetry = this.shouldContinueReflecting(
        state.attempt,
        state.quality
      );
    }

    return state.output;
  }

  private async generateOutput(task: string): Promise<string> {
    // Call LLM to generate initial output
    const response = await this.llm.generate({
      prompt: task,
      maxTokens: 1000,
    });
    return response.text;
  }

  private async evaluateQuality(output: string, task: string): Promise<number> {
    // Use evaluator to score output (0-1)
    const evaluation = await this.llm.generate({
      prompt: `Rate the quality of this response to "${task}": ${output}
        Respond with only a number between 0 and 1.`,
      maxTokens: 10,
    });

    const score = parseFloat(evaluation.text.trim());
    return Math.max(0, Math.min(1, score)); // Clamp to 0-1
  }

  private async generateFeedback(
    task: string,
    output: string,
    quality: number
  ): Promise<string> {
    if (quality > 0.7) {
      // High quality - minor improvements
      return await this.llm.generate({
        prompt: `The response to "${task}" is good but could be better.
          Current response: ${output}

          What specific improvements would make this response better?
          Focus on small, actionable improvements.`,
        maxTokens: 500,
      });
    } else {
      // Low quality - major rework
      return await this.llm.generate({
        prompt: `The response to "${task}" needs significant improvement.
          Current response: ${output}

          What are the main problems with this response?
          What should be completely rewritten?`,
        maxTokens: 500,
      });
    }
  }

  private async improveBasedOnFeedback(
    output: string,
    feedback: string
  ): Promise<string> {
    return await this.llm.generate({
      prompt: `Original output: ${output}

        Feedback: ${feedback}

        Please improve the output based on the feedback provided.
        Generate an improved version that addresses all feedback points.`,
      maxTokens: 1500,
    });
  }

  private shouldContinueReflecting(attempt: number, quality: number): boolean {
    // Never exceed max attempts
    if (attempt >= this.maxAttempts) return false;

    // Stop if quality is good
    if (quality >= this.qualityThreshold) return false;

    // Continue if quality is low and we have attempts left
    return true;
  }
}
```

### Python: Evidence-Grounded Reflection (Reflexion Pattern)

```python
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ReflectionCycle:
    attempt: int
    output: str
    feedback: str
    external_evidence: Dict[str, any]
    quality_score: float
    timestamp: datetime

class ReflexionAgent:
    """Implementation of Reflexion pattern with evidence grounding"""

    def __init__(self, llm_client, max_attempts: int = 3):
        self.llm = llm_client
        self.max_attempts = max_attempts
        self.memory: List[ReflectionCycle] = []

    def execute_with_reflexion(self, task: str, tools: Dict) -> str:
        """Execute task with Reflexion feedback loop"""

        for attempt in range(1, self.max_attempts + 1):
            # Generate output
            output = self._generate_output(task, attempt)

            # Get external evidence (tool results, retrieval, etc.)
            evidence = self._gather_evidence(task, output, tools)

            # Evaluate with external grounding
            feedback = self._generate_grounded_feedback(
                task=task,
                output=output,
                evidence=evidence
            )

            # Score quality
            quality_score = self._score_with_evidence(output, evidence)

            # Store in memory
            cycle = ReflectionCycle(
                attempt=attempt,
                output=output,
                feedback=feedback,
                external_evidence=evidence,
                quality_score=quality_score,
                timestamp=datetime.now()
            )
            self.memory.append(cycle)

            # Check stopping conditions
            if quality_score >= 0.85:
                return output

            if attempt < self.max_attempts:
                # Use feedback to improve
                output = self._revise_with_feedback(output, feedback, self.memory)

        return self.memory[-1].output

    def _generate_output(self, task: str, attempt: int) -> str:
        """Generate output, incorporating prior attempts if available"""

        memory_context = ""
        if attempt > 1:
            # Add context from prior attempts
            memory_context = self._format_memory_for_context(self.memory)

        prompt = f"""Task: {task}

{memory_context}

Generate your response to this task."""

        response = self.llm.generate(prompt)
        return response

    def _gather_evidence(self, task: str, output: str, tools: Dict) -> Dict:
        """Gather external evidence to ground reflection"""

        evidence = {}

        # Run tools to get evidence
        for tool_name, tool_func in tools.items():
            try:
                evidence[tool_name] = tool_func(output)
            except Exception as e:
                evidence[tool_name] = {"error": str(e)}

        return evidence

    def _generate_grounded_feedback(
        self,
        task: str,
        output: str,
        evidence: Dict
    ) -> str:
        """Generate feedback grounded in external evidence"""

        evidence_summary = self._format_evidence(evidence)

        prompt = f"""Task: {task}

Response: {output}

External Evidence:
{evidence_summary}

Based on the external evidence, please provide constructive feedback:

1. What does the evidence tell us about the quality of this response?
2. Are there claims in the response that contradict the evidence?
3. What specific improvements are needed?
4. Rate your confidence in this feedback (1-10)

Format as actionable feedback."""

        feedback = self.llm.generate(prompt)
        return feedback

    def _score_with_evidence(self, output: str, evidence: Dict) -> float:
        """Score output quality using evidence"""

        # Simple heuristic: check if output aligns with evidence
        alignment_scores = []

        for tool_name, tool_result in evidence.items():
            if isinstance(tool_result, dict) and "score" in tool_result:
                alignment_scores.append(tool_result["score"])

        if alignment_scores:
            return sum(alignment_scores) / len(alignment_scores)

        # Fallback to LLM evaluation
        eval_prompt = f"""Rate this response quality (0-1):
        Response: {output}
        Evidence: {evidence}

        Respond with only a decimal between 0 and 1."""

        score_text = self.llm.generate(eval_prompt)
        return float(score_text.strip())

    def _revise_with_feedback(
        self,
        output: str,
        feedback: str,
        memory: List[ReflectionCycle]
    ) -> str:
        """Revise output using feedback and prior learnings"""

        lessons_learned = self._extract_lessons(memory)

        prompt = f"""Original response: {output}

Feedback: {feedback}

Lessons from prior attempts:
{lessons_learned}

Please revise the response to:
1. Address all feedback points
2. Incorporate lessons learned
3. Maintain strengths from original response
4. Fix specific issues identified

Provide revised response."""

        revised = self.llm.generate(prompt)
        return revised

    def _format_memory_for_context(self, memory: List[ReflectionCycle]) -> str:
        """Format memory for context window inclusion"""

        if not memory:
            return ""

        formatted = "Prior attempts:\n"
        for cycle in memory[-2:]:  # Include last 2 attempts
            formatted += f"""
Attempt {cycle.attempt}:
- Output: {cycle.output[:200]}...
- Quality: {cycle.quality_score}
- Key feedback: {cycle.feedback[:200]}...
"""
        return formatted

    def _format_evidence(self, evidence: Dict) -> str:
        """Format evidence for readability"""

        formatted = ""
        for tool_name, result in evidence.items():
            formatted += f"\n{tool_name}:\n{result}\n"
        return formatted

    def _extract_lessons(self, memory: List[ReflectionCycle]) -> str:
        """Extract patterns/lessons from memory"""

        if len(memory) < 2:
            return "No prior attempts yet."

        lessons = []
        prev_cycle = memory[-2] if len(memory) > 1 else None

        if prev_cycle:
            lessons.append(f"Previous attempt had quality score: {prev_cycle.quality_score}")
            lessons.append(f"That feedback was: {prev_cycle.feedback[:100]}...")

        return "\n".join(lessons)
```

---

## 2. Loop Detection and Prevention

### TypeScript: Loop Detection System

```typescript
interface OutputHistoryEntry {
  timestamp: number;
  output: string;
  error: string;
  tokenHash: string;
}

class LoopDetectionSystem {
  private outputHistory: OutputHistoryEntry[] = [];
  private readonly similarityThreshold = 0.95;
  private readonly maxIdenticalConsecutive = 2;

  /**
   * Check if current attempt indicates an infinite loop
   */
  isInfiniteLoop(
    currentOutput: string,
    currentError: string,
    attemptNumber: number
  ): boolean {
    const now = Date.now();

    // Check 1: Identical outputs
    if (this.detectIdenticalOutputLoop(currentOutput)) {
      return true;
    }

    // Check 2: Repeated errors
    if (this.detectRepeatedErrors(currentError)) {
      return true;
    }

    // Check 3: Low variance in outputs
    if (this.detectLowVarianceLoop(currentOutput)) {
      return true;
    }

    // Check 4: Too many attempts in short time
    if (this.detectRapidRepeatedAttempts(now)) {
      return true;
    }

    return false;
  }

  private detectIdenticalOutputLoop(output: string): boolean {
    const hash = this.hashOutput(output);

    // Check if last 2 outputs are identical
    const recent = this.outputHistory.slice(-2);
    if (recent.length >= 2) {
      const allIdentical = recent.every((e) => e.tokenHash === hash);
      if (allIdentical) {
        console.warn("Loop detected: Identical outputs");
        return true;
      }
    }

    return false;
  }

  private detectRepeatedErrors(error: string): boolean {
    // Check if same error appeared 2+ times
    const recentErrors = this.outputHistory
      .slice(-3)
      .map((e) => e.error)
      .filter((e) => e.length > 0);

    const errorCounts = new Map<string, number>();
    for (const err of recentErrors) {
      errorCounts.set(err, (errorCounts.get(err) || 0) + 1);
    }

    const isRepeated = recentErrors.some((e) => errorCounts.get(e)! >= 2);
    if (isRepeated) {
      console.warn("Loop detected: Repeated errors");
    }

    return isRepeated;
  }

  private detectLowVarianceLoop(output: string): boolean {
    if (this.outputHistory.length < 3) {
      return false;
    }

    const recent = this.outputHistory.slice(-3).map((e) => e.output);

    // Compute pairwise similarities
    const similarities: number[] = [];
    for (let i = 0; i < recent.length - 1; i++) {
      const sim = this.computeSimilarity(recent[i], recent[i + 1]);
      similarities.push(sim);
    }

    const avgSimilarity = similarities.reduce((a, b) => a + b) / similarities.length;

    if (avgSimilarity > this.similarityThreshold) {
      console.warn(`Loop detected: Low variance (similarity: ${avgSimilarity})`);
      return true;
    }

    return false;
  }

  private detectRapidRepeatedAttempts(now: number): boolean {
    // Check if more than 3 attempts in last 10 seconds
    const recentWindow = 10_000; // 10 seconds
    const recentAttempts = this.outputHistory.filter(
      (e) => now - e.timestamp < recentWindow
    );

    if (recentAttempts.length > 5) {
      console.warn(
        `Loop detected: Too many rapid attempts (${recentAttempts.length} in 10s)`
      );
      return true;
    }

    return false;
  }

  /**
   * Record an output for loop detection tracking
   */
  recordOutput(output: string, error: string = ""): void {
    this.outputHistory.push({
      timestamp: Date.now(),
      output,
      error,
      tokenHash: this.hashOutput(output),
    });

    // Keep only last 10 outputs
    if (this.outputHistory.length > 10) {
      this.outputHistory.shift();
    }
  }

  /**
   * Get recovery suggestion when loop is detected
   */
  getRecoverySuggestion(attemptNumber: number): string {
    if (this.detectIdenticalOutputLoop(this.outputHistory[-1]?.output || "")) {
      return "Identical outputs detected. Try a different approach or tool.";
    }

    if (attemptNumber >= 3) {
      return "Maximum attempts reached. Escalate to supervisor or human.";
    }

    return `Try using a different reflection strategy. Current strategy is looping.`;
  }

  private computeSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const tokens1 = new Set(text1.split(/\s+/));
    const tokens2 = new Set(text2.split(/\s+/));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  private hashOutput(output: string): string {
    // Simple hash for comparison
    let hash = 0;
    for (let i = 0; i < output.length; i++) {
      const char = output.charCodeAt(i);
      hash = (hash << 5) - hash + char;
    }
    return hash.toString(36);
  }
}
```

---

## 3. Context Window Management

### Python: Token Budget Allocation

```python
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class TokenBudget:
    """Track and allocate token budget"""
    total_budget: int
    used: int = 0
    reserved_for_final: int = 5000

    @property
    def remaining(self) -> int:
        return self.total_budget - self.used - self.reserved_for_final

    @property
    def percentage_used(self) -> float:
        return (self.used / self.total_budget) * 100

    def allocate_for_reflection_cycle(
        self,
        cycle_number: int,
        max_cycles: int
    ) -> Dict[str, int]:
        """Allocate tokens dynamically based on progress"""

        available = self.remaining

        # Earlier cycles get more budget, later cycles get less
        progress_ratio = cycle_number / max_cycles
        budget_multiplier = 1.0 - (progress_ratio * 0.5)

        action_budget = int(available * budget_multiplier * 0.6)
        reflection_budget = int(available * budget_multiplier * 0.4)

        return {
            "action": action_budget,
            "reflection": reflection_budget,
            "total": action_budget + reflection_budget,
        }

    def record_usage(self, tokens: int) -> None:
        """Record token usage"""
        self.used += tokens

    def compress_context(self, context: str, target_tokens: int) -> str:
        """Compress context to fit within token budget"""

        current_tokens = self._estimate_tokens(context)

        if current_tokens <= target_tokens:
            return context

        # Strategy 1: Remove oldest entries
        lines = context.split("\n")
        compressed_lines = lines[-int(len(lines) * target_tokens / current_tokens) :]
        compressed = "\n".join(compressed_lines)

        if self._estimate_tokens(compressed) <= target_tokens:
            return compressed

        # Strategy 2: Summarize
        summary_prompt = f"""Please summarize this context in 50 tokens or less:

{context}

Summary:"""

        # Call LLM to summarize
        # return self.llm.generate(summary_prompt)
        return context[:target_tokens * 4]  # Rough estimate

    def will_exceed_budget(self, additional_tokens: int) -> bool:
        """Check if additional tokens would exceed budget"""
        return self.used + additional_tokens > self.total_budget

    def _estimate_tokens(self, text: str) -> int:
        """Rough estimation: 1 token ≈ 4 characters"""
        return len(text) // 4


class ReflectionWithTokenTracking:
    """Reflection that respects token budgets"""

    def __init__(self, llm_client, total_token_budget: int = 100000):
        self.llm = llm_client
        self.budget = TokenBudget(total_token_budget)

    def execute_with_budget(self, task: str, max_cycles: int = 3) -> str:
        """Execute task while respecting token budget"""

        for cycle in range(1, max_cycles + 1):
            # Check if we have budget
            if self.budget.remaining < 5000:
                print(f"Token budget exhausted ({self.budget.percentage_used}% used)")
                break

            # Allocate budget for this cycle
            cycle_budget = self.budget.allocate_for_reflection_cycle(
                cycle, max_cycles
            )

            print(f"Cycle {cycle}: {cycle_budget['total']} tokens available")

            # Generate with budget constraint
            output = self._generate_with_budget(
                task,
                max_tokens=cycle_budget["action"]
            )

            # Record token usage
            estimated_tokens = len(output) // 4
            self.budget.record_usage(estimated_tokens)

            # Reflect with budget constraint
            if cycle < max_cycles:
                feedback = self._reflect_with_budget(
                    output,
                    max_tokens=cycle_budget["reflection"]
                )

                estimated_feedback_tokens = len(feedback) // 4
                self.budget.record_usage(estimated_feedback_tokens)

        return output

    def _generate_with_budget(self, task: str, max_tokens: int) -> str:
        """Generate with token limit"""
        return self.llm.generate(
            prompt=task,
            max_tokens=max_tokens
        )

    def _reflect_with_budget(self, output: str, max_tokens: int) -> str:
        """Reflect with token limit"""
        return self.llm.generate(
            prompt=f"Reflect on: {output}",
            max_tokens=max_tokens
        )
```

---

## 4. Security: Input Sanitization

### TypeScript: Secure Reflection Execution

```typescript
interface ReflectionSecurityPolicy {
  allowedTools: Set<string>;
  maxReflectionLength: number;
  forbiddenKeywords: string[];
  enableCommandExecution: boolean;
}

class SecureReflectionExecutor {
  private policy: ReflectionSecurityPolicy;

  constructor(policy: ReflectionSecurityPolicy) {
    this.policy = policy;
  }

  /**
   * Execute reflection with security checks
   */
  async executeSecureReflection(
    feedback: string,
    currentOutput: string
  ): Promise<string> {
    // Validate feedback
    this.validateReflectionFeedback(feedback);

    // Sanitize before sending to LLM
    const sanitizedFeedback = this.sanitizeReflectionFeedback(feedback);

    // Execute safely
    return await this.llm.generate({
      prompt: this.buildSecureReflectionPrompt(
        sanitizedFeedback,
        currentOutput
      ),
      maxTokens: 2000,
    });
  }

  /**
   * Validate reflection feedback doesn't contain attacks
   */
  private validateReflectionFeedback(feedback: string): void {
    // Check 1: Length limit prevents prompt injection
    if (feedback.length > this.policy.maxReflectionLength) {
      throw new Error(
        `Feedback too long (${feedback.length} > ${this.policy.maxReflectionLength})`
      );
    }

    // Check 2: Forbidden keywords
    const lowerFeedback = feedback.toLowerCase();
    for (const keyword of this.policy.forbiddenKeywords) {
      if (lowerFeedback.includes(keyword.toLowerCase())) {
        throw new Error(
          `Feedback contains forbidden keyword: "${keyword}"`
        );
      }
    }

    // Check 3: Tool mentions must be whitelisted
    const toolMentions = this.extractToolNames(feedback);
    for (const tool of toolMentions) {
      if (!this.policy.allowedTools.has(tool)) {
        throw new Error(
          `Feedback references unauthorized tool: "${tool}"`
        );
      }
    }

    // Check 4: No command execution attempts
    if (!this.policy.enableCommandExecution) {
      const commandPatterns = [
        /execute.*command/i,
        /run.*shell/i,
        /system.*call/i,
        /subprocess/i,
      ];

      for (const pattern of commandPatterns) {
        if (pattern.test(feedback)) {
          throw new Error("Feedback attempts to trigger command execution");
        }
      }
    }
  }

  private sanitizeReflectionFeedback(feedback: string): string {
    // Truncate to max length
    let sanitized = feedback.substring(0, this.policy.maxReflectionLength);

    // Remove suspicious patterns
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi, // Scripts
      /javascript:/gi, // JS protocol
      /on\w+\s*=/gi, // Event handlers
    ];

    for (const pattern of suspiciousPatterns) {
      sanitized = sanitized.replace(pattern, "[REMOVED]");
    }

    return sanitized;
  }

  private buildSecureReflectionPrompt(
    feedback: string,
    currentOutput: string
  ): string {
    return `You are helping to improve a response.

Current response:
${currentOutput}

Feedback (trusted source):
${feedback}

Based on this feedback, improve the response. Only use allowed tools: ${Array.from(this.policy.allowedTools).join(", ")}

Do not execute any commands or access credentials.

Improved response:`;
  }

  private extractToolNames(text: string): Set<string> {
    const toolPattern = /\b(tool|use)[:_](\w+)\b/gi;
    const tools = new Set<string>();

    let match;
    while ((match = toolPattern.exec(text)) !== null) {
      tools.add(match[2].toLowerCase());
    }

    return tools;
  }
}

// Usage:
const policy: ReflectionSecurityPolicy = {
  allowedTools: new Set(["search", "compute", "validate"]),
  maxReflectionLength: 1000,
  forbiddenKeywords: [
    "api_key",
    "password",
    "token",
    "secret",
    "execute",
    "system",
  ],
  enableCommandExecution: false,
};

const executor = new SecureReflectionExecutor(policy);

try {
  const improved = await executor.executeSecureReflection(
    userProvidedFeedback,
    currentOutput
  );
} catch (e) {
  console.error("Security validation failed:", e.message);
}
```

---

## 5. Multi-Level Reflection Framework

### Python: Hierarchical Reflection

```python
from typing import List, Dict, Callable, Any
from enum import Enum
from dataclasses import dataclass

class ReflectionLevel(Enum):
    """Levels of reflection in hierarchical system"""
    PROMPT_LEVEL = "prompt"      # Individual LLM refinement
    AGENT_LEVEL = "agent"        # Agent evaluates its actions
    ORCHESTRATION_LEVEL = "orch" # Parent reviews agent work
    WORKFLOW_LEVEL = "workflow"  # Overall workflow assessment

@dataclass
class ReflectionRequest:
    level: ReflectionLevel
    subject: str
    context: Dict[str, Any]
    evaluator: Callable
    max_cycles: int = 3

class HierarchicalReflectionFramework:
    """Multi-level reflection system"""

    def __init__(self, llm_client):
        self.llm = llm_client
        self.reflection_handlers = {
            ReflectionLevel.PROMPT_LEVEL: self._handle_prompt_reflection,
            ReflectionLevel.AGENT_LEVEL: self._handle_agent_reflection,
            ReflectionLevel.ORCHESTRATION_LEVEL: self._handle_orchestration_reflection,
            ReflectionLevel.WORKFLOW_LEVEL: self._handle_workflow_reflection,
        }

    async def reflect(self, request: ReflectionRequest) -> Dict[str, Any]:
        """Execute reflection at appropriate level"""

        handler = self.reflection_handlers.get(request.level)
        if not handler:
            raise ValueError(f"Unknown reflection level: {request.level}")

        return await handler(request)

    async def _handle_prompt_reflection(
        self, request: ReflectionRequest
    ) -> Dict[str, Any]:
        """Reflection at prompt level: Improve individual response"""

        output = request.subject
        max_cycles = request.max_cycles

        for cycle in range(max_cycles):
            # Evaluate current output
            quality, issues = await request.evaluator(output)

            if quality > 0.8:
                return {
                    "level": "prompt",
                    "final_output": output,
                    "quality": quality,
                    "cycles": cycle + 1,
                }

            # Generate improvement suggestions
            prompt = f"""Please improve this response:

Current response:
{output}

Issues identified:
{issues}

Provide an improved version that addresses all identified issues."""

            output = await self.llm.generate(prompt)

        return {
            "level": "prompt",
            "final_output": output,
            "quality": quality,
            "cycles": max_cycles,
        }

    async def _handle_agent_reflection(
        self, request: ReflectionRequest
    ) -> Dict[str, Any]:
        """Reflection at agent level: Evaluate actions and decisions"""

        actions = request.subject
        context = request.context

        # Evaluate action sequence
        evaluation = await request.evaluator(actions)

        prompt = f"""Review this action sequence:

Actions: {actions}
Context: {context}
Evaluation: {evaluation}

1. Did these actions achieve the goal?
2. What alternative actions would have been better?
3. What did you learn from this attempt?
4. What should the next attempt focus on?"""

        reflection = await self.llm.generate(prompt)

        return {
            "level": "agent",
            "actions": actions,
            "evaluation": evaluation,
            "reflection": reflection,
            "recommendation": self._extract_recommendation(reflection),
        }

    async def _handle_orchestration_reflection(
        self, request: ReflectionRequest
    ) -> Dict[str, Any]:
        """Reflection at orchestration level: Review agent work"""

        agent_output = request.subject
        parent_context = request.context

        # Manager reviews
        prompt = f"""As a manager, review this agent's work:

Output: {agent_output}

Parent goals: {parent_context.get('goals')}
Quality requirements: {parent_context.get('requirements')}

1. Did the agent meet requirements?
2. Is the quality acceptable?
3. Should we request revision?
4. Should we reassign to different agent?
5. What feedback should we give?"""

        review = await self.llm.generate(prompt)

        decision = self._parse_manager_decision(review)

        return {
            "level": "orchestration",
            "agent_output": agent_output,
            "manager_review": review,
            "decision": decision,  # "accept", "revise", "reassign"
            "feedback": self._extract_feedback(review),
        }

    async def _handle_workflow_reflection(
        self, request: ReflectionRequest
    ) -> Dict[str, Any]:
        """Reflection at workflow level: Assess overall progress"""

        workflow_state = request.subject
        workflow_context = request.context

        prompt = f"""Review overall workflow progress:

Current state:
{workflow_state}

Context:
{workflow_context}

Assessment:
1. Are we on track to complete the workflow?
2. What stages are complete?
3. What stages are blocked?
4. Are there any critical issues?
5. Should we pivot or continue current approach?"""

        assessment = await self.llm.generate(prompt)

        return {
            "level": "workflow",
            "state": workflow_state,
            "assessment": assessment,
            "status": self._extract_workflow_status(assessment),
            "recommendations": self._extract_recommendations(assessment),
        }

    def _extract_recommendation(self, reflection: str) -> str:
        """Extract action recommendation from reflection"""
        # Simple heuristic - in production, use more sophisticated parsing
        if "try" in reflection.lower():
            return "retry_with_changes"
        if "different" in reflection.lower():
            return "try_different_approach"
        return "continue_current"

    def _parse_manager_decision(self, review: str) -> str:
        """Parse manager's decision on agent work"""
        review_lower = review.lower()
        if "revise" in review_lower or "redo" in review_lower:
            return "revise"
        if "reassign" in review_lower or "different agent" in review_lower:
            return "reassign"
        if "accept" in review_lower or "good" in review_lower:
            return "accept"
        return "undecided"

    def _extract_feedback(self, text: str) -> str:
        """Extract feedback from manager review"""
        lines = text.split("\n")
        feedback_lines = [l for l in lines if l.strip()]
        return "\n".join(feedback_lines[:3])

    def _extract_workflow_status(self, assessment: str) -> str:
        """Extract overall workflow status"""
        if "blocked" in assessment.lower():
            return "blocked"
        if "on track" in assessment.lower():
            return "on_track"
        if "issue" in assessment.lower():
            return "issues"
        return "unknown"

    def _extract_recommendations(self, assessment: str) -> List[str]:
        """Extract action recommendations from assessment"""
        # In production, use more sophisticated extraction
        recommendations = []
        if "pivot" in assessment.lower():
            recommendations.append("Consider pivoting strategy")
        if "urgent" in assessment.lower():
            recommendations.append("Address urgent issues immediately")
        return recommendations
```

---

## 6. Monitoring and Metrics

### TypeScript: Reflection Metrics Collection

```typescript
interface ReflectionMetrics {
  taskId: string;
  attemptNumber: number;
  reflectionApproach: string;
  qualityBefore: number;
  qualityAfter: number;
  tokensUsed: number;
  wallClockMs: number;
  errorsIdentified: string[];
  success: boolean;
  timestamp: Date;
}

class ReflectionMetricsCollector {
  private metrics: ReflectionMetrics[] = [];
  private readonly storageInterval = 10; // Store after every 10 metrics

  recordReflectionCycle(
    taskId: string,
    attempt: number,
    approach: string,
    qualityBefore: number,
    qualityAfter: number,
    tokensUsed: number,
    wallClockMs: number,
    errors: string[],
    success: boolean
  ): void {
    const metric: ReflectionMetrics = {
      taskId,
      attemptNumber: attempt,
      reflectionApproach: approach,
      qualityBefore,
      qualityAfter,
      tokensUsed,
      wallClockMs,
      errorsIdentified: errors,
      success,
      timestamp: new Date(),
    };

    this.metrics.push(metric);

    if (this.metrics.length % this.storageInterval === 0) {
      this.persistMetrics();
    }
  }

  getMetricsSummary(): {
    totalTasks: number;
    successRate: number;
    avgQualityImprovement: number;
    avgTokensPerTask: number;
    avgAttemptsPerTask: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalTasks: 0,
        successRate: 0,
        avgQualityImprovement: 0,
        avgTokensPerTask: 0,
        avgAttemptsPerTask: 0,
      };
    }

    const uniqueTasks = new Set(this.metrics.map((m) => m.taskId)).size;
    const successCount = this.metrics.filter((m) => m.success).length;
    const totalImprovement = this.metrics.reduce(
      (sum, m) => sum + (m.qualityAfter - m.qualityBefore),
      0
    );
    const totalTokens = this.metrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalAttempts = this.metrics.length;

    return {
      totalTasks: uniqueTasks,
      successRate: successCount / this.metrics.length,
      avgQualityImprovement: totalImprovement / this.metrics.length,
      avgTokensPerTask: totalTokens / uniqueTasks,
      avgAttemptsPerTask: totalAttempts / uniqueTasks,
    };
  }

  getApproachComparison(): Map<string, any> {
    const approaches = new Map<
      string,
      { count: number; avgImprovement: number; successRate: number }
    >();

    for (const metric of this.metrics) {
      if (!approaches.has(metric.reflectionApproach)) {
        approaches.set(metric.reflectionApproach, {
          count: 0,
          totalImprovement: 0,
          successCount: 0,
        });
      }

      const stats = approaches.get(metric.reflectionApproach)!;
      stats.count += 1;
      stats.totalImprovement += metric.qualityAfter - metric.qualityBefore;
      if (metric.success) stats.successCount += 1;
    }

    // Convert to comparison format
    const comparison = new Map<string, any>();
    for (const [approach, stats] of approaches) {
      comparison.set(approach, {
        count: stats.count,
        avgImprovement: stats.totalImprovement / stats.count,
        successRate: stats.successCount / stats.count,
      });
    }

    return comparison;
  }

  private persistMetrics(): void {
    // Save metrics to storage (database, file, analytics service)
    const metricsToSave = this.metrics.splice(0, this.storageInterval);
    console.log(
      `Persisting ${metricsToSave.length} metrics to storage...`
    );
    // this.storage.saveMetrics(metricsToSave);
  }
}
```

---

## 7. Orchestration Integration Example

### TypeScript: Reflection in Agent Orchestration

```typescript
interface AgentTask {
  id: string;
  description: string;
  requiredQuality: number;
  maxAttempts: number;
}

class OrchestratedAgentWithReflection {
  private reflectionLoop: ReflectionAgent;
  private loopDetection: LoopDetectionSystem;
  private metrics: ReflectionMetricsCollector;

  async executeTask(task: AgentTask): Promise<{
    output: string;
    quality: number;
    attempts: number;
  }> {
    console.log(`[Task ${task.id}] Starting with reflection loop`);

    let output = "";
    let quality = 0;
    let attempt = 0;

    for (attempt = 1; attempt <= task.maxAttempts; attempt++) {
      // Step 1: Generate output
      const startTime = Date.now();
      output = await this.generateOutput(task);

      // Step 2: Detect loops
      if (this.loopDetection.isInfiniteLoop(output, "", attempt)) {
        console.error(`[Task ${task.id}] Loop detected at attempt ${attempt}`);
        console.log(this.loopDetection.getRecoverySuggestion(attempt));
        break;
      }

      // Step 3: Evaluate quality
      quality = await this.evaluateQuality(output, task);

      const wallClockMs = Date.now() - startTime;

      // Step 4: Record metrics
      this.metrics.recordReflectionCycle(
        task.id,
        attempt,
        "evidence_grounded",
        quality,
        quality,
        Math.floor(output.length / 4), // Rough token count
        wallClockMs,
        [],
        quality >= task.requiredQuality
      );

      // Step 5: Check if done
      if (quality >= task.requiredQuality) {
        console.log(`[Task ${task.id}] Met quality threshold on attempt ${attempt}`);
        break;
      }

      // Step 6: Reflect and improve
      if (attempt < task.maxAttempts) {
        console.log(`[Task ${task.id}] Reflecting to improve...`);
        output = await this.reflectionLoop.executeWithReflection(
          task.description
        );
      }

      this.loopDetection.recordOutput(output, "");
    }

    console.log(
      `[Task ${task.id}] Complete: Quality=${quality}, Attempts=${attempt}`
    );

    return { output, quality, attempts: attempt };
  }

  // ... implementation details ...
}
```

---

## Conclusion

These implementation patterns provide:

1. **Basic Reflection**: Simple generate→reflect→improve cycles
2. **Advanced Reflection**: Evidence-grounded feedback with external tools
3. **Safety**: Loop detection, token budgeting, security validation
4. **Observability**: Metrics collection and performance monitoring
5. **Orchestration**: Multi-level reflection in hierarchical systems

All patterns are designed to be:
- **Composable**: Mix and match as needed
- **Observable**: Integrate with monitoring systems
- **Secure**: Include security checks and validation
- **Efficient**: Respect token budgets and time constraints


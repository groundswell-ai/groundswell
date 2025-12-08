# Reflection Patterns: Quick Reference Guide

## Decision Tree: When and How to Use Reflection

```
START: Should I use reflection?
  |
  ├─ Does your task need high quality? (not time-critical)
  |  └─ YES: Consider reflection
  |     |
  |     ├─ Can you get external feedback? (tool results, tests, retrieval)
  |     |  └─ YES: Use Reflexion (evidence-grounded)
  |     |  └─ NO: Use basic reflection with internal evaluation
  |     |
  |     ├─ Multiple attempts possible?
  |     |  └─ YES: Set max_attempts = 2-3
  |     |  └─ NO: Single-pass reflection only
  |     |
  |     └─ Can you allocate extra tokens?
  |        └─ YES: Proceed with implementation
  |        └─ NO: Use minimal reflection (1 cycle max)
  |
  └─ NO: Skip reflection, use single-pass generation
     (E.g., real-time chat, low-latency APIs)
```

---

## Reflection Approach Selection Matrix

| Task Type | Approach | Max Attempts | Feedback Source | Notes |
|-----------|----------|--------------|-----------------|-------|
| Code Generation | Reflexion | 2-3 | Test results | Tool-assisted validation critical |
| Writing/Content | Basic Reflection | 2-3 | Quality criteria | Simple evaluation works well |
| Analysis/Research | Reflexion | 2-3 | Fact-checking, retrieval | Ground in external data |
| Planning | Basic Reflection | 1-2 | Feasibility check | Keep lightweight |
| Dialogue/Conversation | None | 0 | Real-time feedback | Too slow for interactive |
| Multi-step workflows | Hierarchical | 1-2 per step | Manager review | Reflect at orchestration level |
| Math/Logic Problems | Tool-Interactive | 2-3 | Verification | Use solver tools |

---

## Prompt Template Quick Reference

### Template 1: Quick Retry (Fastest)
```
Generated: [OUTPUT]
Issues: [BRIEF_ERROR]

Try again, fixing these issues.
```
**Use when**: Time-critical, simple corrections needed
**Token cost**: Low
**Effectiveness**: 60-70% improvement

### Template 2: Evidence-Grounded (Recommended)
```
Your response: [OUTPUT]
Evidence check: [TOOL_RESULTS]
Issues: [CONTRADICTIONS]

Fix issues based on evidence.
Cite your sources.
```
**Use when**: Accuracy matters, external tools available
**Token cost**: Medium
**Effectiveness**: 80-90% improvement

### Template 3: Self-Critique (Detailed)
```
Your response: [OUTPUT]
Quality evaluation: [SCORING]

Identify weaknesses.
Propose specific improvements.
Rewrite addressing each weakness.
```
**Use when**: Complex tasks, nuanced improvements needed
**Token cost**: Medium-High
**Effectiveness**: 75-85% improvement

### Template 4: Multi-Agent (Highest Quality)
```
Initial response: [OUTPUT]

As a critic, identify problems with this response.
Be specific and cite evidence.

[SEPARATE LLM CALL]

Based on criticism: [FEEDBACK]

Provide improved response addressing all feedback.
```
**Use when**: Critical quality required, budget available
**Token cost**: High (2 LLM calls)
**Effectiveness**: 85-95% improvement

---

## Configuration Profiles

### Profile: Speed-Optimized
```
max_attempts: 1
reflection_style: "minimal"
external_feedback: false
token_budget: 20000
timeout_seconds: 10
```
**Best for**: Real-time applications, chat interfaces

### Profile: Quality-Optimized
```
max_attempts: 3
reflection_style: "evidence_grounded"
external_feedback: true
token_budget: 100000
timeout_seconds: 60
```
**Best for**: Knowledge work, analysis, content creation

### Profile: Balanced
```
max_attempts: 2
reflection_style: "self_critique"
external_feedback: conditional
token_budget: 50000
timeout_seconds: 30
```
**Best for**: Most production applications

### Profile: Safety-Critical
```
max_attempts: 3
reflection_style: "multi_agent"
external_feedback: required
token_budget: 150000
timeout_seconds: 120
loop_detection: aggressive
security_validation: strict
```
**Best for**: Medical, legal, financial applications

---

## Stopping Conditions Checklist

Check these in order (first true = stop):

1. **Hard Limit**: `attempt_number >= max_attempts`
   - Never exceed configured maximum
   - Typically 2-3 for reflection

2. **Quality Achieved**: `quality_score >= target_threshold`
   - Task complete if quality is good enough
   - Typical threshold: 0.8 (0-1 scale)

3. **Improvement Stalled**: `improvement < min_improvement_threshold`
   - If quality improved less than 5% this cycle
   - Indicates diminishing returns

4. **Loop Detected**: `detect_infinite_loop(output, error, history)`
   - Stop if exact same output repeated
   - Stop if same error repeated 2+ times
   - Stop if outputs too similar (>95%)

5. **Budget Exceeded**: `tokens_used > token_budget OR time_elapsed > timeout`
   - Token budget exhausted
   - Wall-clock timeout reached

6. **User Intervention**: `user_requested_stop()`
   - If humans cancel the operation
   - If user provides different instruction

---

## Common Mistakes and Fixes

### Mistake 1: Reflecting Without External Feedback

```
WRONG:
  Generate output
  → LLM reflects on own output
  → LLM generates improvement
  → Often doesn't improve or gets worse

CORRECT:
  Generate output
  → Run tests/retrieve data/check facts
  → Provide concrete evidence to LLM
  → LLM reflects grounded in evidence
  → Improvement is reliable
```

### Mistake 2: Infinite Reflection Loops

```
WRONG:
  while true:
    output = generate()
    feedback = reflect(output)
    output = improve(output, feedback)

CORRECT:
  for attempt in range(max_attempts):
    if detect_loop(output):
      break
    output = generate()
    if is_good_enough(output):
      break
    feedback = reflect(output)
    output = improve(output, feedback)
```

### Mistake 3: Including Full History in Every Cycle

```
WRONG:
  Attempt 1: 100 tokens output
  Reflect with 100 tokens context + feedback = 150 tokens
  Attempt 2: 150 tokens output
  Reflect with 250 tokens context + feedback = 400 tokens
  ... context window balloons exponentially

CORRECT:
  Keep rolling window of last 2 attempts only
  Summarize older attempts: "Attempts 1-3 hit these issues: ..."
  Use external memory for full history
  Track lessons learned separately from raw outputs
```

### Mistake 4: Waiting for Perfect Quality

```
WRONG:
  Set target_quality = 1.0 (perfect)
  Keep reflecting until perfect
  Uses all tokens, never actually achieves perfection

CORRECT:
  Set target_quality = 0.8 (good enough)
  Stop when threshold reached
  Accept "best effort" after max attempts
  Use remaining budget for other tasks
```

### Mistake 5: Reflecting on Unpredictable Outputs

```
WRONG:
  Task: "Write a creative story"
  → Every reflection produces completely different story
  → Can't detect improvement or loops
  → Metrics meaningless

CORRECT:
  Only use reflection for deterministic/measurable tasks
  For creative tasks: use single-pass generation
  Or define specific evaluation criteria (tone, length, style)
```

---

## Performance Benchmarks

These are typical baselines - adjust based on your models and tasks.

### Code Generation
```
Task: "Write function that..."
Approach: Reflexion with test feedback

Without reflection:
- Success rate: 60%
- Time: 2-3 seconds
- Token cost: 2000 tokens

With reflection (2 cycles):
- Success rate: 88%
- Time: 5-8 seconds
- Token cost: 5000 tokens

ROI: +28% success rate, 2.5x cost
```

### Fact-Checking / Analysis
```
Task: "Analyze this research finding"
Approach: Reflexion with web search

Without reflection:
- Error rate: 20%
- Token cost: 3000 tokens

With reflection (2 cycles):
- Error rate: 3%
- Token cost: 8000 tokens

ROI: Error reduction worth cost in high-stakes use cases
```

### Writing Quality
```
Task: "Write product description"
Approach: Self-critique reflection

Without reflection:
- Quality score: 6.5/10
- Time: 3 seconds
- Token cost: 2000 tokens

With reflection (2 cycles):
- Quality score: 8.2/10
- Time: 8 seconds
- Token cost: 5000 tokens

ROI: 26% quality improvement, 2.5x cost
     Worth it for marketing/professional content
     Not worth it for chat responses
```

---

## Token Budget Calculator

Quick estimation for reflection:

```
Initial output generation:
  ~2-3 KB text = 500-750 tokens

Per reflection cycle:
  - Feedback generation: 200-300 tokens
  - Improvement generation: similar to initial = 500-750 tokens
  - Total per cycle: 700-1050 tokens

Examples:
  1 cycle: 500 + 850 = 1350 tokens
  2 cycles: 500 + 850 + 850 = 2200 tokens
  3 cycles: 500 + 850 + 850 + 850 = 3050 tokens

With memory/context:
  Add 20-30% overhead for context window usage

Total budget recommendation:
  Simple task: 5000-10000 tokens
  Complex task: 20000-50000 tokens
  Very complex: 50000-100000+ tokens
```

---

## Security Checklist

Before deploying reflection system:

- [ ] Sanitize all feedback before sending to LLM
- [ ] Validate tool calls mentioned in feedback are whitelisted
- [ ] Limit feedback length (max 1000 characters)
- [ ] Filter credentials/secrets from history
- [ ] Implement reflection depth limits
- [ ] Log all reflection activities for audit
- [ ] Test with adversarial feedback/prompts
- [ ] Define clear escalation paths
- [ ] Set rate limits on reflection API calls
- [ ] Monitor for unusual reflection patterns

---

## Introspection Tool Permissions Matrix

| Tool | Worker Agent | Supervisor | Manager | Admin |
|------|--------------|-----------|---------|-------|
| `read_own_history` | Yes | Yes | Yes | Yes |
| `read_own_metadata` | Yes | Yes | Yes | Yes |
| `read_parent_context` | Limited | Yes | Yes | Yes |
| `read_sibling_context` | No | Limited | Yes | Yes |
| `modify_own_state` | No | No | Limited | Yes |
| `escalate_to_parent` | Yes | Yes | Limited | No |
| `query_execution_metrics` | Limited | Yes | Yes | Yes |
| `query_cost_metrics` | No | Limited | Yes | Yes |
| `read_credentials` | No | No | No | Yes |

---

## Monitoring Dashboard Essentials

Key metrics to track:

**Real-time:**
- Active reflection cycles
- Avg quality improvement this hour
- Tokens used this hour
- Loop detections this hour

**Daily/Weekly:**
- Success rate (with/without reflection)
- Avg attempts per successful task
- Most common errors
- Most effective reflection approaches

**Cost Analysis:**
- Cost per improved result
- Cost per percentage improvement
- ROI per use case

---

## Integration Checklist

### Before deploying reflection:

**Architecture**
- [ ] LLM client configured with retry logic
- [ ] Token tracking integrated
- [ ] State persistence implemented (checkpoints)
- [ ] Loop detection system active

**Safety**
- [ ] Input validation in place
- [ ] Rate limits configured
- [ ] Timeout limits set
- [ ] Credentials filtered from context

**Observability**
- [ ] Logging configured
- [ ] Metrics collection active
- [ ] Alerting rules defined
- [ ] Dashboard created

**Testing**
- [ ] Unit tests for reflection logic
- [ ] Integration tests with LLM calls
- [ ] Load tests on token budgets
- [ ] Security/adversarial tests

**Documentation**
- [ ] How to configure reflection per task
- [ ] How to interpret metrics
- [ ] How to troubleshoot issues
- [ ] How to modify templates

---

## When to Use vs. When NOT to Use Reflection

### Use Reflection When:

✓ Quality is more important than speed
✓ You have time/tokens to spend
✓ You can get external feedback (tests, tools, retrieval)
✓ The task is deterministic/measurable
✓ Users are willing to wait
✓ Cost is not the primary constraint
✓ Correctness is critical

### DO NOT Use Reflection When:

✗ Sub-second latency required
✗ Operating under strict token/cost limits
✗ Task is purely creative (no criteria)
✗ No external feedback available
✗ Frequent updates needed (information changes rapidly)
✗ Task is inherently random/unpredictable
✗ User engagement requires immediate response

---

## Quick Troubleshooting Guide

| Problem | Symptoms | Solution |
|---------|----------|----------|
| Infinite Loop | Same output repeated, timeouts | Reduce max_attempts, add loop detection |
| Token Overflow | Out of memory errors | Reduce budget, compress history, use external memory |
| No Improvement | Quality stays same despite reflection | Add external feedback, change template |
| Getting Worse | Quality decreases after reflection | Disable reflection for this task type |
| Too Slow | Timeouts at reflection stage | Reduce reflection depth, use faster model |
| Misleading Feedback | Loop keeps trying same wrong approach | Use multi-agent reflection, add evidence requirement |
| Security Issues | Injection attempts in feedback | Add input validation, limit tool mentions |

---

## Example Configuration Files

### TypeScript Config
```typescript
const reflectionConfig = {
  enabled: true,
  maxAttempts: 2,
  approach: "evidence_grounded",
  tokenBudget: 30000,
  qualityThreshold: 0.8,
  loopDetection: {
    enabled: true,
    identicalThreshold: 2,
    similarityThreshold: 0.95,
  },
  security: {
    maxFeedbackLength: 1000,
    forbiddenKeywords: ["api_key", "password"],
    allowedTools: ["search", "test", "validate"],
  },
  timeouts: {
    perCycleSeconds: 30,
    totalSeconds: 120,
  },
};
```

### YAML Config
```yaml
reflection:
  enabled: true
  max_attempts: 2
  approach: "evidence_grounded"

  budget:
    tokens: 30000
    time_seconds: 120

  quality:
    threshold: 0.8
    min_improvement: 0.05

  safety:
    max_feedback_length: 1000
    loop_detection: true
    forbidden_keywords:
      - api_key
      - password
      - token
```

---

## Further Reading

### Academic Papers
- [Self-Reflection in LLM Agents](https://arxiv.org/pdf/2405.06682) - Core research
- [Reflexion Framework](https://arxiv.org/abs/2303.11366) - Evidence grounding
- [Language Agent Tree Search (LATS)](https://arxiv.org/abs/2310.04406) - Tree-based reflection

### Framework Documentation
- [LangGraph Reflection](https://langchain-ai.github.io/langgraph/tutorials/reflection/reflection/)
- [CrewAI Hierarchical Process](https://docs.crewai.com/how-to/hierarchical-process)
- [LangChain Reflection Agents](https://blog.langchain.com/reflection-agents/)

### Security Resources
- [OWASP LLM Security](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- [OpenAI on Prompt Injection](https://openai.com/index/prompt-injections/)

---

**Last Updated**: December 2025
**Version**: 1.0


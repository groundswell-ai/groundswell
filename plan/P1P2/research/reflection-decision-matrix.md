# Reflection Patterns - Decision Matrix & Quick Reference

## Quick Decision Tree

```
Does your task need reflection?
│
├─ Is it a critical decision (code, logic, policy)?
│  ├─ YES → Use reflection
│  └─ NO → Go to next
│
├─ Can it fail in ways that need recovery?
│  ├─ YES → Use error-triggered reflection
│  └─ NO → Go to next
│
├─ Does output quality vary significantly?
│  ├─ YES → Use validation or confidence-based reflection
│  └─ NO → Go to next
│
├─ Do you have token/latency budget?
│  ├─ YES → Use appropriate pattern
│  └─ NO → Skip reflection or use budget-conscious pattern
│
└─ Not recommended for reflection
```

## Pattern Comparison Matrix

| Aspect | Simple | Multi-Attempt | Error-Triggered | Validation | Confidence | Tool-Feedback | Multi-Agent | State-Aware | Budget-Conscious | Timeout-Safe |
|--------|--------|----------------|-----------------|-----------|------------|---------------|-------------|------------|------------------|--------------|
| **Complexity** | 1/5 | 2/5 | 2/5 | 3/5 | 3/5 | 4/5 | 4/5 | 4/5 | 1/5 | 2/5 |
| **Latency** | +200ms | +400ms | +500ms | +400ms | +600ms | +800ms | +1000ms | +700ms | +200ms | Variable |
| **Token Cost** | +1x | +1.5x | +2x | +1.5x | +2x | +3x | +4x | +2.5x | +0.5x | +1.5x |
| **Reliability** | 3/5 | 4/5 | 4/5 | 5/5 | 4/5 | 5/5 | 5/5 | 5/5 | 2/5 | 4/5 |
| **Observability** | 2/5 | 3/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | 5/5 | 1/5 | 3/5 |
| **Development Effort** | Low | Low | Medium | Medium | Medium | High | High | High | Low | Low |
| **Production Ready** | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| **Testing Difficulty** | Easy | Easy | Medium | Medium | Medium | Hard | Hard | Hard | Easy | Medium |

## Task Type → Pattern Mapping

### Data/Content Generation Tasks

| Task | Best Pattern | Alternative | Avoid |
|------|-------------|------------|-------|
| Writing essays | Multi-Agent | Confidence | Simple |
| Code generation | Tool-Feedback | Multi-Agent | Simple |
| Data transformation | Validation | Error-Triggered | Confidence |
| Summary generation | Confidence | Simple | Tool-Feedback |

**Rationale**: Content quality is subjective and improves with review. Tool-feedback provides objective validation. Multi-agent adds diverse perspective.

### Analysis & Decision Tasks

| Task | Best Pattern | Alternative | Avoid |
|------|-------------|------------|-------|
| Root cause analysis | State-Aware | Multi-Agent | Simple |
| Risk assessment | Confidence | Validation | Simple |
| Recommendation | Multi-Agent | Confidence | Tool-Feedback |
| Diagnosis | Confidence | State-Aware | Simple |

**Rationale**: These tasks benefit from learning history and alternative perspectives. Confidence-based triggering prevents over-thinking.

### Structured Output Tasks

| Task | Best Pattern | Alternative | Avoid |
|------|-------------|------------|-------|
| JSON generation | Validation | Tool-Feedback | Simple |
| Schema compliance | Validation | Error-Triggered | Confidence |
| Format conversion | Error-Triggered | Validation | Multi-Agent |
| Data validation | Validation | Validation | Simple |

**Rationale**: Explicit validation rules work best for structured output. Format issues are deterministic.

### Real-Time/Low-Latency Tasks

| Task | Best Pattern | Alternative | Avoid |
|------|-------------|------------|-------|
| Chat responses | Skip Reflection | Budget-Conscious | All others |
| Autocomplete | Skip Reflection | Budget-Conscious | All others |
| Search results | Timeout-Safe | Simple | Multi-Agent |
| Quick lookups | Skip Reflection | Timeout-Safe | All others |

**Rationale**: Latency is critical. Either skip reflection or use timeout-safe/budget-conscious with strict limits.

### Complex/High-Stakes Tasks

| Task | Best Pattern | Alternative | Avoid |
|------|-------------|------------|-------|
| Security decisions | Multi-Agent | State-Aware | Simple |
| System architecture | State-Aware | Multi-Agent | Simple |
| Critical fixes | Tool-Feedback | State-Aware | Simple |
| Strategic planning | Multi-Agent | State-Aware | Simple |

**Rationale**: High stakes justify higher cost and latency. Multiple perspectives reduce risk of critical errors.

### Learning/Iterative Tasks

| Task | Best Pattern | Alternative | Avoid |
|------|-------------|------------|-------|
| Test-driven development | Tool-Feedback | State-Aware | Simple |
| Continuous refinement | State-Aware | Multi-Agent | Simple |
| Error recovery | Error-Triggered | State-Aware | Simple |
| Multi-step problem solving | State-Aware | Multi-Agent | Simple |

**Rationale**: State-aware patterns capture learning and avoid repeated mistakes. Tool-feedback provides objective metrics.

## Framework Selection Guide

### LangChain/LangGraph
**When**: Building graph-based agentic systems with complex state management
**Strengths**:
- Built-in reflection patterns (Reflexion, LATS)
- Native state management
- Rich integrations with tools

**Patterns to use**:
- Multi-Agent Reflection
- Tool-Feedback Reflection
- State-Aware Reflection

**Cost**: Highest (multiple nodes, state management overhead)

**Example**:
```python
from langgraph.graph import StateGraph

graph = StateGraph(AgentState)
graph.add_node("generate", generate_node)
graph.add_node("reflect", reflect_node)
graph.add_edge("generate", "reflect")
graph.add_conditional_edges("reflect", ...)
```

---

### Anthropic/Claude (Direct API)
**When**: Building lightweight agents with simplicity prioritized
**Strengths**:
- Simpler to understand and implement
- Extended thinking for self-reflection
- Lower overhead

**Patterns to use**:
- Simple Reflection
- Error-Triggered Reflection
- Confidence-Based Reflection
- Budget-Conscious Reflection

**Cost**: Lower (direct API calls only)

**Recommendation**: Start here for new projects

---

### Google ADK
**When**: Building agents with specialized reflect-and-retry plugin
**Strengths**:
- Purpose-built for reflection
- Concurrency-safe
- Custom error detection

**Patterns to use**:
- Error-Triggered Reflection
- Tool-Feedback Reflection

**Cost**: Medium

---

### Custom Implementation
**When**: Highly specialized requirements not met by frameworks
**Strengths**:
- Full control
- No overhead from unused features
- Optimized for specific use case

**Patterns to use**:
- Any pattern can be custom implemented
- Typically: Simple, Error-Triggered, Validation

**Cost**: High development cost, variable runtime cost

---

## Error Type → Recovery Strategy

| Error Type | Retry? | Reflection? | Backoff | Max Attempts |
|-----------|--------|-----------|---------|--------------|
| **Transient (timeout, rate limit)** | YES | NO | Exponential | 3-5 |
| **Logical (wrong approach)** | YES | YES | Linear | 2-3 |
| **Invalid Input (bad data)** | NO | NO | - | 0 |
| **Model Refusal (safety)** | NO | NO | - | 0 |
| **Resource Exhausted** | YES | NO | Exponential | 2 |
| **Validation Failed** | YES | YES | Linear | 3 |

**Implementation**:
```typescript
async function handleError(error: Error, attempt: number) {
  if (isTransient(error)) {
    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    await sleep(delay);
    return "retry";
  }

  if (isLogical(error)) {
    const reflection = await reflect(error);
    return "reflect_and_retry";
  }

  return "escalate";
}
```

## Confidence Thresholds

### Recommended Thresholds by Task Type

| Task Type | Reflect Below | Safe Above |
|-----------|--------------|-----------|
| High-stakes decisions | 80% | 90% |
| Code generation | 75% | 85% |
| Data transformation | 70% | 80% |
| Analysis/reasoning | 75% | 85% |
| Summary generation | 65% | 75% |
| Real-time responses | 60% | 70% |

### Implementing Confidence Thresholds

```typescript
async function reflectIfUncertain(task: string, threshold: number = 0.75) {
  const output = await generate(task);
  const confidence = await assessConfidence(output);

  if (confidence >= threshold) {
    return output; // Skip reflection
  }

  return await improveWithReflection(task, output);
}

async function assessConfidence(output: string): Promise<number> {
  // Methods:
  // 1. Ask model explicitly
  // 2. Use perplexity/entropy metrics
  // 3. Check presence of hedging language
  // 4. Token probability scores
  // 5. Ensemble disagreement

  // Simple implementation:
  const response = await client.messages.create({
    model: "claude-opus-4.5",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Rate your confidence (0-1) in this response: ${output}`
    }]
  });

  const confidence = parseFloat(response.content[0].text);
  return isNaN(confidence) ? 0.5 : confidence;
}
```

## Cost-Benefit Analysis

### When Reflection Is Cost-Effective

**Cost Multiplier Formula**:
```
Total Cost = Base Cost × Max Attempts
Benefit = Improvement % × Task Value

Reflection is worth it when:
Benefit ≥ (Cost Multiplier - 1) × Base Cost × Success Probability
```

### Examples

**Example 1: Code Generation**
- Base cost: 1000 tokens
- Max attempts: 3 (3x cost multiplier)
- Base success: 60%
- With reflection: 90%
- Improvement: 30%
- Task value: 100 (critical code)

Calculation:
- Total cost: 1000 × 3 = 3000 tokens = $0.09 (at Sonnet pricing)
- Benefit: 30% × 100 = 30 points improvement
- Worth it? YES (low cost for significant improvement)

**Example 2: Chat Response**
- Base cost: 100 tokens
- Max attempts: 2 (2x cost multiplier)
- Base success: 90%
- With reflection: 95%
- Improvement: 5%
- Task value: 10 (low stakes)

Calculation:
- Total cost: 100 × 2 = 200 tokens = $0.006
- Benefit: 5% × 10 = 0.5 points improvement
- Worth it? NO (high cost relative to benefit)

## Implementation Checklist

### Pre-Implementation
- [ ] Define task success criteria (specific, measurable)
- [ ] Estimate baseline success rate
- [ ] Calculate acceptable latency increase
- [ ] Set token budget
- [ ] Identify error types that need recovery

### Implementation
- [ ] Choose appropriate pattern(s)
- [ ] Set max attempts (typically 3)
- [ ] Implement error detection
- [ ] Add reflection prompts
- [ ] Implement state capture
- [ ] Add observability/logging
- [ ] Test error paths
- [ ] Test success paths
- [ ] Test max attempts exceeded

### Testing
- [ ] Unit tests for each reflection type
- [ ] Integration tests with real API
- [ ] Load tests for concurrent reflection
- [ ] Cost tracking tests
- [ ] Latency benchmarks
- [ ] Effectiveness measurement

### Monitoring
- [ ] Success rate without reflection
- [ ] Success rate with reflection
- [ ] Average attempts per task
- [ ] Reflection effectiveness %
- [ ] Total tokens per task
- [ ] Cost multiplier
- [ ] Latency impact
- [ ] Error type frequency

### Production
- [ ] A/B test reflection vs no reflection
- [ ] Monitor effectiveness metrics
- [ ] Watch for cost overruns
- [ ] Set alerts for reflection failures
- [ ] Document success criteria met
- [ ] Plan iteration/optimization

## Common Mistakes & Solutions

| Mistake | Impact | Solution |
|---------|--------|----------|
| No max attempts limit | Infinite loops, infinite cost | Always set `maxAttempts <= 5` |
| Reflecting on everything | High cost, slower responses | Use confidence triggers or error-only |
| Vague success criteria | Can't tell if reflection worked | Use specific, measurable criteria |
| No state capture | Can't learn from previous attempts | Capture input/output/error for each attempt |
| Reflecting too early | Premature optimization | Use multi-attempt loop, only reflect on repeated failures |
| Wrong error categorization | Wrong recovery strategy | Categorize errors (transient/logical/invalid) first |
| Not testing failure paths | Untested code in production | Always test max retries exhausted scenario |
| Insufficient logging | Can't debug failures | Log all attempts and reflections |
| No observability | Blind to what's happening | Emit events, track metrics |
| No cost tracking | Surprise high bills | Monitor tokens per task, set budgets |

## Decision Framework

### Should I Use Reflection for This Task?

**Start here**: Answer these 5 questions

1. **How critical is correctness?**
   - Critical (99%+): YES, use reflection
   - Important (95%+): MAYBE, depends on other factors
   - Nice-to-have: NO

2. **What's the baseline success rate?**
   - Low (<70%): YES, reflection can help
   - Medium (70-90%): MAYBE, depends on improvement potential
   - High (>90%): NO, already working well

3. **How much time can you spend?**
   - >1 second acceptable: YES
   - 100-500ms: MAYBE, use lightweight patterns
   - <100ms: NO, skip reflection

4. **What's your token budget?**
   - Unlimited: YES, use comprehensive reflection
   - Limited (per-task): MAYBE, use cost-conscious pattern
   - Very limited: NO, skip reflection

5. **Can you measure improvement?**
   - YES: Implement reflection with metrics
   - NO: Skip, or first establish measurement

### Scoring System

**Count YES answers:**
- 5/5: Implement comprehensive reflection
- 4/5: Implement moderate reflection
- 3/5: Implement lightweight reflection
- 2/5: Implement minimal reflection
- 0-1/5: Skip reflection

---

## Next Steps After Reading This

1. **Start small**: Pick one task and implement Simple Reflection
2. **Measure**: Track success rate, latency, cost
3. **Evaluate**: Is improvement worth the cost?
4. **Iterate**: Adjust pattern based on results
5. **Scale**: Apply successful patterns to other tasks

## Related Resources

- `reflection-patterns.md` - Comprehensive pattern documentation
- `reflection-code-patterns.md` - Copy-paste-ready implementations
- `reflection-integration-guide.md` - Integration with Groundswell framework


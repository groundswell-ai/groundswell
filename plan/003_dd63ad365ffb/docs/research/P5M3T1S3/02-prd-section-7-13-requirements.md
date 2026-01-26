# Research Notes: PRD Section 7.13 Requirements

## Overview
Section 7.13 of the PRD defines the specific requirements for provider usage examples documentation.

## Exact Requirements from Section 7.13

### Section Title
"7.13 Provider Usage Examples"

### Specific Usage Examples Required

#### 1. Default (Anthropic) Configuration
```typescript
const agent = new Agent({
  name: 'Analyzer',
  model: 'claude-sonnet-4-20250514',
});
```

#### 2. OpenCode with Multi-Provider Configuration
```typescript
const agent = new Agent({
  name: 'Analyzer',
  provider: 'opencode',
  model: 'openai/gpt-4',
  providerOptions: {
    endpoint: 'http://localhost:8080',
  },
});
```

#### 3. Prompt-Level Override Example
```typescript
const response = await agent.prompt(myPrompt, {
  model: 'anthropic/claude-opus-4-20250514',  // Override for this call
});
```

## Scope of Examples

The examples demonstrate three key configuration levels:

1. **Global Config** (Section 7.6): `configureProviders()` function for application-wide defaults
2. **Agent Config**: Provider and model selection at agent instantiation
3. **Prompt Overrides**: Per-prompt provider/model overrides

## Structural Requirements

1. **Code Format**: All examples in TypeScript with proper syntax highlighting
2. **Consistent Structure**: Each example shows `new Agent()` instantiation with configuration objects
3. **Comments**: Include explanatory comments where needed
4. **Realistic Scenarios**: Examples show practical use cases (local endpoints, different models)

## Integration with Overall PRD Goals

The usage examples support the PRD's core objectives:

1. **Multi-Provider Support**: Demonstrates both Anthropic and OpenCode providers
2. **Feature Parity** (Section 7.14): Shows identical API usage across providers
3. **Configuration Cascade** (Section 7.7): Illustrates how configuration flows through hierarchy
4. **Provider Independence**: Users can switch providers with minimal code changes

## Additional Context from Related Sections

### Section 7.6: Global Provider Configuration
- Documents the `configureProviders()` function
- Shows how to set application-wide defaults
- Includes providerDefaults configuration

### Section 7.7: Configuration Cascade
- Documents priority hierarchy: Global → Agent → Prompt
- Shows how higher levels override lower levels
- Critical for understanding provider switching

### Section 7.8: Model Specification
- Documents two formats:
  - Plain: `claude-sonnet-4-20250514`
  - Qualified: `anthropic/claude-sonnet-4-20250514` or `openai/gpt-4`

### Section 7.14: Feature Parity
- Requirements for consistent behavior across providers
- Where providers differ (MCP support, tool execution, session management)

## Deliverable Locations

1. **docs/providers.md**: Add usage examples section to existing documentation
2. **/examples/providers/**: Create executable examples directory with individual example files

## Key Takeaway for PRP

The PRD specifies:
- **3 minimum required examples** (default Anthropic, OpenCode multi-provider, prompt override)
- **2 delivery locations** (documentation + executable examples)
- **3 configuration levels** to demonstrate (global, agent, prompt)
- **Real-world scenarios** with actual model names and endpoints

The implementation should go beyond these minimums to provide comprehensive coverage of real-world usage patterns.

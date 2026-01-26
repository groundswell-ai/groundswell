# PRD Analysis: OpenCode Provider Removal

## Complete PRD Path
**File**: `/home/dustin/projects/groundswell/PRD.md`

## Summary
This analysis identifies all sections in the PRD that reference OpenCode provider or multi-provider support, documenting the exact changes needed for complete OpenCode removal.

## Identified Sections and Changes

### 1. **Section 1: Overview** (Line 33)
**Current**: `✔️ Multi-provider Agent SDK support (Anthropic + OpenCode)`

**Proposed**: `✔️ Single-provider Agent SDK support (Anthropic only)`

**Reason**: Removes mention of multi-provider support and specifically OpenCode.

### 2. **Section 7.1: Supported Providers** (Lines 257-261)
**Current**:
```
| Provider | SDK | Package | Description |
|----------|-----|---------|-------------|
| `anthropic` | Anthropic Agent SDK | `@anthropic-ai/claude-agent-sdk` | Claude models via Anthropic's official Agent SDK |
| `opencode` | OpenCode SDK | `@opencode-ai/sdk` | Multi-provider support (Anthropic, OpenAI, Ollama, 75+ providers) |
```

**Proposed**:
```
| Provider | SDK | Package | Description |
|----------|-----|---------|-------------|
| `anthropic` | Anthropic Agent SDK | `@anthropic-ai/claude-agent-sdk` | Claude models via Anthropic's official Agent SDK |
```

**Reason**: Complete removal of OpenCode provider row from the providers table.

### 3. **Section 7.2: ProviderId** (Lines 264-266)
**Current**:
```ts
export type ProviderId = 'anthropic' | 'opencode';
```

**Proposed**:
```ts
export type ProviderId = 'anthropic';
```

**Reason**: Remove 'opencode' from the ProviderId type definition.

### 4. **Section 7.4: ProviderCapabilities Table** (Lines 305-313)
**Current**:
```
| Capability | Anthropic SDK | OpenCode SDK |
|------------|--------------|--------------|
| MCP | ✓ (via MCPHandler) | ✓ (native) |
| Skills | ✓ (system prompt) | ✓ (native `/skills`) |
| LSP | ✓ (MCP plugins) | ✓ (explicit `lsp` tool) |
| Streaming | ✓ (message) | ✓ (SSE) |
| Sessions | ✗ (stateless) | ✓ |
| Extended Thinking | ✗ | ✓ |
```

**Proposed**:
```
| Capability | Anthropic SDK |
|------------|--------------|
| MCP | ✓ (via MCPHandler) |
| Skills | ✓ (system prompt) |
| LSP | ✓ (MCP plugins) |
| Streaming | ✓ (message) |
| Sessions | ✗ (stateless) |
| Extended Thinking | ✗ |
```

**Reason**: Remove the entire "OpenCode SDK" column from the capabilities comparison table.

### 5. **Section 7.6: Global Provider Configuration** (Lines 339-350)
**Current**:
```ts
import { configureProviders } from 'groundswell';

// Set once at application startup - cascades to all agents
configureProviders({
  defaultProvider: 'opencode',
  providerDefaults: {
    opencode: { endpoint: 'http://localhost:8080' },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

**Proposed**:
```ts
import { configureProviders } from 'groundswell';

// Set once at application startup - cascades to all agents
configureProviders({
  defaultProvider: 'anthropic',
  providerDefaults: {
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  },
});
```

**Reason**: Update example to use 'anthropic' as default and remove OpenCode-specific configuration.

### 6. **Section 7.8: Model Specification** (Lines 377-385)
**Current**:
```
**OpenCode provider/model format:**

```ts
// OpenCode supports 75+ providers
'anthropic/claude-sonnet-4-20250514'
'openai/gpt-4'
'ollama/llama3'
'google/gemini-pro'
```
```

**Proposed**:
```
**Model specification:**

Models are specified using their plain name or provider-qualified format:

| Format | Example | Usage |
|--------|---------|-------|
| Plain name | `claude-sonnet-4-20250514` | Uses current provider |
| Provider-qualified | `anthropic/claude-opus-4-20250514` | Explicit provider |

```ts
// Model specifications
'claude-sonnet-4-20250514'
'claude-opus-4-20250514'
```
```

**Reason**: Remove the OpenCode-specific "provider/model format" section and replace with generic model specification information.

### 7. **Section 7.13: Provider Usage Examples** (Lines 485-496)
**Current**:
```
**OpenCode with multi-provider:**

```ts
const agent = new Agent({
  name: 'Analyzer',
  provider: 'opencode',
  model: 'openai/gpt-4',
  providerOptions: {
    endpoint: 'http://localhost:8080',
  },
});
```
```

**Proposed**: Complete removal of this subsection.

**Reason**: The example demonstrates OpenCode multi-provider usage which will no longer be supported.

### 8. **Section 7.13: Provider Usage Examples - LSP Integration** (Lines 460-465)
**Current**:
```
**OpenCode SDK:** Explicit `lsp` tool with actions:
- `definition` - Go to definition
- `references` - Find references
- `hover` - Hover information
- `completion` - Code completion
- `diagnostics` - Get diagnostics
```

**Proposed**:
Remove this subsection entirely.

**Reason**: Describes OpenCode-specific LSP implementation that will be removed.

### 9. **Section 16: Acceptance Criteria** (Line 923)
**Current**: `* **multi-provider Agent SDK support with cascading configuration**`

**Proposed**: `* **Single-provider Agent SDK support**`

**Reason**: Update acceptance criteria to reflect single-provider support instead of multi-provider.

## Additional References to Consider

### Type Definitions
Several interfaces reference `ProviderId` which will need to be updated:
- `Provider.id` (line 274)
- `GlobalProviderConfig.defaultProvider` (line 330)
- `GlobalProviderConfig.providerDefaults` (line 331)
- `AgentConfig.provider` (line 405)
- `ModelSpec.provider` (line 389)
- `parseModelSpec()` function (line 394)
- `formatModelForProvider()` function (line 395)

### Package Dependencies
- Remove `@opencode-ai/sdk` dependency
- Update any imports that reference OpenCode-specific functionality

## Implementation Dependencies

The changes identified here are critical prerequisites for:
1. Updating type definitions in interfaces
2. Modifying implementation code that conditionally handles OpenCode
3. Updating documentation and examples
4. Removing test cases specific to OpenCode
5. Cleaning up package.json dependencies

## Impact Assessment

**High Impact Sections**:
- Section 7.1 (Supported Providers) - Core provider definition
- Section 7.2 (ProviderId) - Type system foundation
- Section 7.4 (ProviderCapabilities) - Feature parity documentation

**Medium Impact Sections**:
- Configuration examples
- Model specification documentation
- Usage examples

**Low Impact Sections**:
- Overview mentions
- Acceptance criteria

All identified changes must be made to maintain PRD consistency after OpenCode provider removal.

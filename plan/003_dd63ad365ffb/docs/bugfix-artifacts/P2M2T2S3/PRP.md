---

## Goal

**Feature Goal**: Write comprehensive documentation for session persistence features in `docs/providers.md`, covering the session lifecycle, configuration options, storage backend differences, session cleanup behavior (including TTL from P2.M2.T2.S2), and migration patterns.

**Deliverable**: Extended "Sessions" section in `docs/providers.md` with comprehensive session persistence documentation.

**Success Definition**:
- New documentation sections added to `docs/providers.md` under "Sessions" heading
- Documentation covers: session lifecycle, configuration options (sessionPersistence, sessionTtl, sessionPath), storage backend differences (Memory, File, Redis), session cleanup behavior (including TTL expiration from P2.M2.T2.S2), migration patterns, and practical code examples
- Documentation follows existing `docs/providers.md` style and structure
- All code examples are complete, runnable, and include TypeScript types
- Documentation references the correct source files and line numbers

## User Persona

**Target User**: Library consumers (developers) who need to understand and configure session persistence for production applications.

**Use Case**: A developer wants to configure persistent sessions that survive server restarts, with automatic cleanup of expired sessions.

**User Journey**:
1. Developer reads `docs/providers.md` to understand session options
2. Finds "Sessions" section with clear backend comparison
3. Chooses appropriate storage backend (Memory, File, or future Redis)
4. Follows configuration examples for chosen backend
5. Migrates existing code using migration guide
6. Verifies session persistence works as expected

**Pain Points Addressed**:
- Current documentation only mentions in-memory sessions
- No guidance on configuring persistent storage
- No explanation of session lifecycle or persistence behavior
- No migration path from in-memory to persistent sessions
- No documentation of TTL/cleanup features (from P2.M2.T2.S2)

## Why

- **Business value**: Enables production-ready session management with clear documentation, reducing support burden
- **User impact**: Developers can confidently configure session persistence for their use case
- **Integration**: Documents features implemented in P2.M2.T1 (SessionStore) and P2.M2.T2.S2 (TTL/cleanup)
- **Problems solved**: Fills documentation gap identified in PRD Section 7.4

## What

Extend `docs/providers.md` "Sessions" section (starting at line 537) with comprehensive session persistence documentation.

### Success Criteria

- [ ] New subsections added under "Sessions": Storage Backends, Configuration Reference, Session Lifecycle, Session Cleanup & TTL, Migration Guide
- [ ] Each storage backend (Memory, File, Redis) documented with pros/cons and use cases
- [ ] Configuration options documented (sessionPersistence, sessionTtl, sessionPath, sessionStore)
- [ ] Session lifecycle documented with code examples
- [ ] TTL/cleanup behavior documented (references P2.M2.T2.S2 implementation)
- [ ] Migration guide provided (in-memory → persistent)
- [ ] Code examples are complete and runnable
- [ ] Documentation follows existing `docs/providers.md` patterns

## All Needed Context

### Context Completeness Check

**Before implementing**, validate: "If someone knew nothing about this codebase, would they have everything needed to write this documentation successfully?"

✅ This PRP provides:
- Exact file path and line number for documentation location
- Research findings from internal implementation (session persistence research)
- Research findings from external documentation best practices
- Existing documentation structure and patterns to follow
- All configuration options with types and defaults
- Code examples from implementation for reference
- Known gotchas and behavioral differences

### Documentation & References

```yaml
# MUST READ - Critical context for documentation

# Existing Sessions Section
- file: docs/providers.md
  lines: 537-600 (approximate)
  why: Target location for documentation extension
  pattern: Current Sessions section covers basic in-memory sessions only
  gotcha: Must preserve existing content while adding new sections

# Session Persistence Implementation Research
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S3/research/session-persistence-implementation.md
  why: Comprehensive research on session persistence implementation
  critical: Configuration options, lifecycle patterns, backend differences
  gotcha: This was agent research output - contains all implementation details

# External Documentation Best Practices Research
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S3/research/external-documentation-research.md
  why: Best practices from Express session, Django, connect-redis, session-file-store
  critical: Documentation patterns that work (comparison tables, migration guides, progressive examples)
  gotcha: Focus on actionable patterns we can apply

# Previous PRP: Session Configuration (P2.M2.T2.S1)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S1/PRP.md
  why: Defines sessionPersistence, sessionPath, sessionTtl configuration
  critical: Declarative configuration pattern
  gotcha: sessionPersistence is 'memory' | 'file' | 'redis'

# Previous PRP: Session TTL and Cleanup (P2.M2.T2.S2)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S2/PRP.md
  why: Defines TTL enforcement and cleanup behavior
  critical: TTL with timestamps, deleteExpired() method, cleanup on initialize
  gotcha: TTL uses createdAt and lastAccessedAt timestamps

# External TTL Research (from P2.M2.T2.S2)
- file: plan/003_dd63ad365ffb/bugfix/001_45bfbada88e7/P2M2T2S2/research/external-ttl-research.md
  why: TTL best practices, expiration strategies, clock skew handling
  critical: Hybrid expiration (lazy + active), tolerance windows
  gotcha: 60-second tolerance window for clock skew

# SessionStore Implementation
- file: src/providers/session-store.ts
  why: Source of truth for SessionStore interface and implementations
  pattern: All methods async, returns Promise
  lines: 29-79 (interface), 93-132 (MemorySessionStore), 146-235 (FileSessionStore)
  gotcha: FileSessionStore uses atomic writes (temp file + rename)

# ProviderOptions Type Definition
- file: src/types/providers.ts
  why: Defines all session-related configuration options
  pattern: Optional properties with JSDoc documentation
  lines: Find ProviderOptions interface
  gotcha: sessionPersistence is mutually exclusive with sessionStore

# AnthropicProvider Session Integration
- file: src/providers/anthropic-provider.ts
  why: Shows how session configuration is used in practice
  lines: 186-221 (initialize with session store creation), 1147-1203 (session methods)
  gotcha: Priority: sessionStore > sessionPersistence > default MemorySessionStore

# Session Serialization Utilities
- file: src/utils/session-serialization.ts
  why: Documents how sessions are serialized for persistence
  pattern: Custom replacer for circular references
  gotcha: Timestamps serialize correctly as numbers

# Existing Documentation Structure
- file: docs/providers.md
  why: Follow existing patterns and style
  pattern: Table of Contents, code examples with TypeScript, reference sections
  gotcha: Use same heading hierarchy, code block style, and table formatting

# Existing Documentation Examples
- file: docs/providers.md
  sections: Configuration Cascade, Provider Lifecycle
  why: Examples of clear documentation with code examples
  pattern: Explanation → Code Example → Implementation Details
  gotcha: Maintain consistent style throughout

# Express Session Documentation (External Reference)
- url: https://github.com/expressjs/session
  why: Industry standard for session documentation
  critical: Configuration table format, store comparison
  gotcha: Use as inspiration for structure, not direct copy

# Django Sessions Documentation (External Reference)
- url: https://docs.djangoproject.com/en/stable/topics/http/sessions/
  why: Good example of multi-backend documentation
  critical: Backend comparison table, migration guidance
  gotcha: Focus on clear when-to-use guidance

# session-file-store Documentation (External Reference)
- url: https://github.com/valery-barysok/session-file-store
  why: Reference for file-based session documentation
  critical: File format documentation, error handling patterns
  gotcha: Document atomic write strategy
```

### Current Documentation Structure

```bash
docs/providers.md
├── Table of Contents (line 5-21)
├── Basic Usage
├── Supported Providers
├── Architecture
├── Configuration
├── Configuration Cascade
├── Provider Registry
├── Model Specification
├── Provider Lifecycle
├── Sessions (line 537) ← EXTEND THIS SECTION
│   ├── Anthropic Sessions (Abstraction Layer) - KEEP
│   └── Session ID Propagation - KEEP
├── Tools & MCP
├── Hooks
├── Skills
├── Streaming
├── Usage Examples
└── API Reference
```

### Desired Documentation Structure (Sessions Section)

```bash
docs/providers.md - Sessions Section (Extended)
├── Sessions (line 537)
│   ├── Overview (NEW)
│   ├── Quick Start (NEW)
│   ├── Storage Backends (NEW)
│   │   ├── Memory Storage (Default)
│   │   ├── File Storage
│   │   └── Redis Storage (Future)
│   ├── Configuration Reference (NEW)
│   │   ├── ProviderOptions Properties
│   │   ├── Configuration Priority
│   │   └── Configuration Examples
│   ├── Session Lifecycle (NEW)
│   │   ├── Initialization
│   │   ├── Creation
│   │   ├── Usage
│   │   ├── Persistence
│   │   └── Termination
│   ├── Session Cleanup & TTL (NEW)
│   │   ├── TTL Configuration
│   │   ├── Expiration Behavior
│   │   ├── Cleanup Strategy
│   │   └── Clock Skew Handling
│   ├── Migration Guide (NEW)
│   │   ├── Memory to File
│   │   ├── Custom Store Integration
│   │   └── Data Migration
│   ├── Anthropic Sessions (Abstraction Layer) - EXISTING, KEEP
│   └── Session ID Propagation - EXISTING, KEEP
```

### Known Gotchas & Documentation Challenges

```markdown
# CRITICAL: Documentation must reflect actual implementation behavior

# Session Configuration Priority
# sessionStore (direct injection) > sessionPersistence (declarative) > default MemorySessionStore
# This is a key pattern to document clearly

# File Session Persistence
# FileSessionStore survives terminate() → initialize() cycles
# MemorySessionStore is cleared on terminate()
# This behavioral difference must be documented

# TTL Forward Compatibility
# sessionTtl is accepted in P2.M2.T2.S1 but enforced in P2.M2.T2.S2
# Documentation should clarify this progression

# Redis Status
# RedisSessionStore is an interface stub only - not implemented
# Must document as "Future" or "Planned" feature

# Session Serialization
# Sessions serialized as JSON with circular reference handling
# Timestamps stored as Unix milliseconds (number), not Date objects
# File format: {directory}/{sessionId}.json

# Atomic File Writes
# FileSessionStore uses temp file + rename pattern for data safety
# This should be mentioned as a reliability feature

# Clock Skew Tolerance
# TTL checks use 60-second tolerance window
# Prevents premature expiration due to clock adjustments

# Session Restoration
# Persistent sessions restored on initialize() for non-memory stores
# Expired sessions cleaned up on initialization

# Legacy Session Handling
# Sessions without timestamps (from before P2.M2.T2.S2) use load time as fallback
# Backward compatibility maintained
```

## Implementation Blueprint

### Documentation Structure

Follow the existing `docs/providers.md` style with clear sections, code examples, and implementation details.

```markdown
## Sessions
Session persistence enables multi-turn conversations with state that survives across requests and server restarts.

### Quick Start
[Minimal examples for each backend]

### Storage Backends
[Comparison and detailed documentation]

### Configuration Reference
[All options with types and defaults]

### Session Lifecycle
[Step-by-step with code examples]

### Session Cleanup & TTL
[TTL configuration and behavior from P2.M2.T2.S2]

### Migration Guide
[Before/after examples for migrations]

### Anthropic Sessions (Abstraction Layer)
[EXISTING CONTENT - PRESERVE]

### Session ID Propagation
[EXISTING CONTENT - PRESERVE]
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: EXTEND docs/providers.md - Add Sessions subsection structure
  - PRESERVE: Existing "Anthropic Sessions (Abstraction Layer)" content
  - PRESERVE: Existing "Session ID Propagation" content
  - ADD: New subsections before existing content
  - STRUCTURE:
    1. Overview
    2. Quick Start
    3. Storage Backends
    4. Configuration Reference
    5. Session Lifecycle
    6. Session Cleanup & TTL
    7. Migration Guide
    8. [Existing Anthropic Sessions content]
    9. [Existing Session ID Propagation content]
  - PLACEMENT: After line 537 (## Sessions heading)
  - PATTERN: Follow existing heading hierarchy (##, ###, ####)

Task 2: WRITE "Overview" subsection
  - EXPLAIN: What session persistence is and why it matters
  - COVER: Multi-turn conversations, state survival, backend options
  - MENTION: Groundswell provides pluggable storage backends
  - LENGTH: 2-3 paragraphs
  - PATTERN: Concise intro like other sections (e.g., "Configuration")

Task 3: WRITE "Quick Start" subsection
  - PROVIDE: Minimal working example for each backend
  - INCLUDE: Memory (default), File (persistent)
  - FORMAT: Code example → Brief explanation
  - PATTERN: |
    #### Memory Storage (Default)
    ```typescript
    const provider = new AnthropicProvider();
    await provider.initialize();
    // Sessions in memory, lost on restart
    ```

    #### File Storage
    ```typescript
    const provider = new AnthropicProvider();
    await provider.initialize({
      sessionPersistence: 'file',
      sessionPath: './sessions'
    });
    // Sessions persist across restarts
    ```

Task 4: WRITE "Storage Backends" subsection
  - CREATE: Comparison table with pros/cons
  - TABLE COLUMNS: Backend, Setup Complexity, Performance, Persistence, Use Case
  - DOCUMENT: MemorySessionStore (existing)
  - DOCUMENT: FileSessionStore (from P2.M2.T1)
  - DOCUMENT: RedisSessionStore (interface stub, mark as future)
  - PATTERN: |
    ### Storage Backends Comparison

    | Backend | Setup | Performance | Persistence | Use Case |
    |---------|-------|-------------|-------------|----------|
    | Memory | None | Fast | None | Development, testing |
    | File | Minimal | Medium | Disk | Production, single-server |
    | Redis | Required | Network | Distributed | Multi-server, scaling |

    ### Memory Storage (Default)
    [Details about MemorySessionStore]

    ### File Storage
    [Details about FileSessionStore with file structure]

    ### Redis Storage (Future)
    [Note: Interface defined, not yet implemented]

Task 5: WRITE "Configuration Reference" subsection
  - DOCUMENT: All session-related ProviderOptions properties
  - INCLUDE: sessionPersistence, sessionPath, sessionTtl, sessionStore
  - FORMAT: Table with Property, Type, Default, Description columns
  - EXPLAIN: Configuration priority order
  - PATTERN: |
    ### Configuration Options

    | Property | Type | Default | Description |
    |----------|------|---------|-------------|
    | sessionPersistence | 'memory' \| 'file' \| 'redis' | undefined | Declarative backend selection |
    | sessionPath | string | './sessions' | Directory for file storage |
    | sessionTtl | number | 86400000 | TTL in milliseconds (24h) |
    | sessionStore | SessionStore | undefined | Direct store injection |

    ### Configuration Priority
    1. Direct `sessionStore` injection (highest)
    2. Declarative `sessionPersistence` options
    3. Default MemorySessionStore

Task 6: WRITE "Session Lifecycle" subsection
  - DOCUMENT: Five stages with code examples
  - STAGES: Initialize → Create → Use → Persist → Terminate
  - INCLUDE: Code showing each stage
  - REFERENCE: Source file locations (anthropic-provider.ts)
  - PATTERN: |
    ### Session Lifecycle

    Sessions follow a five-stage lifecycle:

    #### 1. Initialization
    ```typescript
    const provider = new AnthropicProvider();
    await provider.initialize({
      sessionPersistence: 'file',
      sessionPath: './sessions'
    });
    // Persistent sessions restored here
    ```

    #### 2. Session Creation
    ```typescript
    // Sessions created on-demand
    await provider.execute({
      prompt: 'Hello',
      options: { sessionId: 'new-session' }
    }, toolExecutor);
    ```

    [Continue with Use, Persist, Terminate stages]

Task 7: WRITE "Session Cleanup & TTL" subsection
  - DOCUMENT: TTL configuration (sessionTtl option)
  - EXPLAIN: Timestamp fields (createdAt, lastAccessedAt)
  - DOCUMENT: Expiration behavior (lazy + active cleanup)
  - MENTION: Clock skew tolerance (60 seconds)
  - REFERENCE: P2.M2.T2.S2 implementation
  - PATTERN: |
    ### Session Cleanup & TTL

    Sessions support automatic expiration via time-to-live (TTL).

    #### TTL Configuration
    ```typescript
    await provider.initialize({
      sessionPersistence: 'file',
      sessionTtl: 3600000  // 1 hour
    });
    ```

    #### Expiration Behavior
    - **Lazy expiration**: Expired sessions return null on load
    - **Active cleanup**: Expired sessions removed on initialize
    - **Clock skew**: 60-second tolerance window

    #### Timestamp Fields
    SessionState includes:
    - `createdAt`: Session creation time (ms)
    - `lastAccessedAt`: Last access time (ms, updated on save)

Task 8: WRITE "Migration Guide" subsection
  - PROVIDE: Memory → File migration example
  - INCLUDE: Before/after code comparison
  - DOCUMENT: Behavioral changes to expect
  - ADD: Testing checklist
  - PATTERN: |
    ### Migrating from Memory to File Storage

    #### Before (In-Memory)
    ```typescript
    const provider = new AnthropicProvider();
    await provider.initialize();
    // Sessions lost on restart
    ```

    #### After (Persistent)
    ```typescript
    const provider = new AnthropicProvider();
    await provider.initialize({
      sessionPersistence: 'file',
      sessionPath: './sessions'
    });
    // Sessions survive restart
    ```

    #### What to Expect
    - Sessions persist across `terminate()` → `initialize()` cycles
    - Directory created automatically if missing
    - Each session stored as `{sessionPath}/{sessionId}.json`

    #### Testing Checklist
    - [ ] Create session and verify file created
    - [ ] Restart and verify session restored
    - [ ] Check session file format is valid JSON
    - [ ] Verify TTL cleanup working (if configured)

Task 9: UPDATE Table of Contents
  - FIND: Table of Contents section (line 5-21)
  - ADD: New Sessions subsections to TOC
  - PRESERVE: Existing TOC entries
  - PATTERN: Add indented subsections under "Sessions"

Task 10: VALIDATE documentation completeness
  - VERIFY: All storage backends documented
  - VERIFY: All configuration options covered
  - VERIFY: Code examples are complete and runnable
  - VERIFY: TypeScript types shown
  - VERIFY: Source file references correct
  - VERIFY: P2.M2.T2.S2 TTL features documented
  - VERIFY: Migration guide includes testing checklist
```

### Implementation Patterns & Documentation Style

```markdown
# ============================================================================
# DOCUMENTATION PATTERNS - Follow these for consistency
# ============================================================================

# Pattern 1: Section Structure
# Each major section follows: Overview → Detailed Content → Examples → References

## Sessions
Session persistence enables [clear value statement].

### Quick Start
[Get user running immediately with minimal examples]

### Storage Backends
[Detailed comparison and documentation]

### Configuration Reference
[All options with tables]

### Session Lifecycle
[Step-by-step with code examples]

### Session Cleanup & TTL
[Advanced features with clear explanations]

### Migration Guide
[Practical guidance with before/after examples]

# Pattern 2: Code Examples
# All code examples must be:
# - Complete (can run as-is)
# - TypeScript with proper types
# - Include imports when helpful
# - Have explanatory comments
# - Show realistic usage

#### Example: File Storage Configuration
```typescript
import { AnthropicProvider } from 'groundswell';

const provider = new AnthropicProvider();
await provider.initialize({
  sessionPersistence: 'file',
  sessionPath: './my-sessions',  // Custom directory
  sessionTtl: 3600000             // 1 hour TTL
});

// Sessions persist across restarts
await provider.execute({
  prompt: 'Remember my name',
  options: { sessionId: 'user-123' }
}, toolExecutor);
```

# Pattern 3: Configuration Tables
# Use consistent table format with specific columns

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| sessionPersistence | 'memory' \| 'file' \| 'redis' | undefined | Storage backend type |
| sessionPath | string | './sessions' | Directory for file storage |
| sessionTtl | number | 86400000 | TTL in milliseconds (24h) |
| sessionStore | SessionStore | undefined | Direct store injection |

# Pattern 4: Comparison Tables
# For feature comparisons, use Use Case columns

| Backend | Performance | Persistence | Setup | Use Case |
|---------|-------------|-------------|-------|----------|
| Memory | Fast | None | None | Development |
| File | Medium | Disk | Minimal | Production (single-server) |
| Redis | Network | Distributed | Required | Multi-server |

# Pattern 5: Implementation References
# Link to source code with specific line numbers

**Implementation**: See `src/providers/session-store.ts:146-235` for FileSessionStore implementation.

**Configuration**: See `src/providers/anthropic-provider.ts:186-221` for session initialization logic.

# Pattern 6: Warnings and Gotchas
# Use callout boxes for important warnings

**GOTCHA**: MemorySessionStore is cleared on `terminate()`. File sessions persist.

**NOTE**: Redis storage is planned but not yet implemented.

**IMPORTANT**: TTL uses a 60-second tolerance window for clock skew.

# Pattern 7: Migration Guides
# Structure: Before → After → What to Expect → Testing Checklist

### Migrating from Memory to File Storage

#### Before (In-Memory)
```typescript
// Code showing old approach
```

#### After (Persistent)
```typescript
// Code showing new approach
```

#### What to Expect
- Behavioral change 1
- Behavioral change 2

#### Testing Checklist
- [ ] Test 1
- [ ] Test 2

# Pattern 8: Session Lifecycle Documentation
# Number each stage with clear headers

### Session Lifecycle

Sessions follow a five-stage lifecycle:

#### 1. Initialization
[Code + explanation]

#### 2. Creation
[Code + explanation]

#### 3. Usage
[Code + explanation]

#### 4. Persistence
[Code + explanation]

#### 5. Termination
[Code + explanation]

# Pattern 9: Source Code References
# Be specific with file paths and line numbers

See:
- `src/providers/session-store.ts` - SessionStore interface and implementations
- `src/providers/anthropic-provider.ts:186-221` - Session initialization
- `src/types/providers.ts` - ProviderOptions interface
- `src/utils/session-serialization.ts` - Serialization utilities

# Pattern 10: External References
# Cite external sources when appropriate

For more on session management best practices, see:
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Express Session Documentation](https://github.com/expressjs/session)
```

## Validation Loop

### Level 1: Documentation Structure (Immediate Feedback)

```bash
# Verify documentation file is valid markdown
npx markdownlint docs/providers.md

# Check for broken links
npx markdown-link-check docs/providers.md

# Expected: No structural errors, all links valid
```

### Level 2: Content Validation (Review Checklist)

```bash
# Manual review checklist:
- [ ] All Sessions subsections present (Overview, Quick Start, Storage Backends, etc.)
- [ ] Storage backend comparison table complete
- [ ] Configuration reference table includes all options
- [ ] Session lifecycle documented with 5 stages
- [ ] TTL/cleanup section references P2.M2.T2.S2
- [ ] Migration guide includes before/after examples
- [ ] All code examples are complete TypeScript
- [ ] Source file references are accurate
- [ ] Table of Contents updated
- [ ] Existing "Anthropic Sessions" content preserved

# Expected: All checklist items pass
```

### Level 3: Code Example Validation

```bash
# Extract and test code examples (manual verification)
# 1. Copy each code example to test file
# 2. Verify TypeScript compilation
# 3. Verify imports are correct
# 4. Verify example runs without errors

# Example verification:
npx tsx --test examples/session-persistence-test.ts

# Expected: All code examples compile and run correctly
```

### Level 4: Documentation Quality

```bash
# Review against documentation best practices:
- [ ] Progressive disclosure (Quick Start → Basic → Advanced)
- [ ] Comparison tables for backend selection
- [ ] Migration guides with before/after examples
- [ ] Warnings and gotchas clearly marked
- [ ] Source code references with line numbers
- [ ] External links for additional reading
- [ ] Consistent formatting with existing docs

# Expected: Documentation follows industry best practices
```

## Final Validation Checklist

### Technical Validation

- [ ] Documentation extends correct file (docs/providers.md)
- [ ] New sections added at correct location (after line 537)
- [ ] Existing "Anthropic Sessions" content preserved
- [ ] Table of Contents updated with new subsections
- [ ] All code examples are valid TypeScript
- [ ] Source file references are accurate

### Content Validation

- [ ] All storage backends documented (Memory, File, Redis)
- [ ] Configuration options complete (sessionPersistence, sessionPath, sessionTtl, sessionStore)
- [ ] Session lifecycle covers all 5 stages
- [ ] TTL/cleanup behavior documented (references P2.M2.T2.S2)
- [ ] Migration guide includes testing checklist
- [ ] Clock skew tolerance mentioned (60 seconds)
- [ ] File structure documented ({directory}/{sessionId}.json)

### Style Validation

- [ ] Follows existing docs/providers.md patterns
- [ ] Uses consistent heading hierarchy
- [ ] Code examples have explanatory comments
- [ ] Tables use consistent column format
- [ ] Warnings and notes use callout format
- [ ] Source references include line numbers

### Completeness Validation

- [ ] Quick Start enables immediate usage
- [ ] Storage backend comparison guides selection
- [ ] Configuration reference answers all options
- [ ] Session lifecycle explains behavior clearly
- [ ] TTL documentation links to P2.M2.T2.S2
- [ ] Migration guide enables smooth transitions
- [ ] External references provide additional depth

---

## Anti-Patterns to Avoid

- ❌ Don't modify existing "Anthropic Sessions" content - preserve it
- ❌ Don't duplicate content that exists elsewhere - reference it
- ❌ Don't use incomplete code examples - all examples must run
- ❌ Don't forget to update Table of Contents
- ❌ Don't skip TypeScript types in code examples
- ❌ Don't document Redis as implemented - mark as future/planned
- ❌ Don't ignore TTL implementation from P2.M2.T2.S2
- ❌ Don't use vague descriptions - be specific with file paths and line numbers
- ❌ Don't create overly long examples - keep them focused
- ❌ Don't forget to mention clock skew tolerance
- ❌ Don't skip the migration guide - it's critical for users
- ❌ Don't use inconsistent formatting - follow existing patterns
- ❌ Don't assume prior knowledge - explain concepts clearly

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass documentation success likelihood

**Rationale**:
- Comprehensive research provides all necessary context
- Implementation details are well-documented with source references
- External research provides proven documentation patterns
- Existing documentation structure is clear and consistent
- All configuration options are catalogued with types and defaults
- Migration patterns are well-understood from implementation
- TTL behavior from P2.M2.T2.S2 is fully documented
- Code examples can be derived from implementation

**Remaining risks**:
- Need to ensure documentation matches any last-minute implementation changes
- Redis status needs to be clearly marked as "not implemented"
- Migration examples need to be tested for accuracy

**Validation**: The completed PRP provides:
- Exact file location and line numbers
- Complete documentation structure outline
- All content areas with source references
- Code example patterns to follow
- Validation checklist for quality assurance
- Research findings from both internal and external sources
- Clear guidance on what to preserve and what to extend

---

## Goal

**Feature Goal**: Extend ProviderOptions interface with session configuration options that enable easy, declarative session persistence setup without requiring manual SessionStore instance creation.

**Deliverable**: Extended ProviderOptions interface with:
- `sessionPersistence?: 'memory' | 'file' | 'redis'` - Simple string selector for storage type
- `sessionTtl?: number` - Session time-to-live in milliseconds (default: 24 hours)
- `sessionPath?: string` - Directory path for file-based storage (default: './sessions')
- Updated AnthropicProvider.initialize() to create SessionStore instances from these options
- Full backward compatibility with existing `sessionStore?: SessionStore<SessionState>` property

**Success Definition**:
- Users can configure session persistence with simple string: `{ sessionPersistence: 'file' }`
- Users can configure with full options: `{ sessionPersistence: 'file', sessionPath: '/custom/path', sessionTtl: 3600000 }`
- Users can still inject custom SessionStore instances: `{ sessionStore: new CustomStore() }`
- All existing tests pass without modification
- New tests verify all configuration combinations
- Configuration cascade (global → agent → prompt) works for session options

## User Persona

**Target User**: Library consumers using AnthropicProvider who want session persistence without managing SessionStore instances manually.

**Use Case**: A developer wants their agent's conversation sessions to persist across application restarts using file-based storage, with a 24-hour expiration.

**User Journey**:
1. Developer creates an Agent with session persistence configured
2. Agent automatically initializes FileSessionStore with specified options
3. Sessions persist across provider lifecycle (initialize → terminate → initialize)
4. Expired sessions are automatically cleaned up

**Pain Points Addressed**:
- Currently requires manual SessionStore instantiation and injection
- No easy way to configure TTL for sessions
- File path must be managed manually
- Configuration is verbose for common use cases

## Why

- **Business value**: Enables production-ready session persistence with minimal configuration
- **User impact**: Reduces boilerplate code for common session persistence scenarios
- **Integration**: Builds on P2.M2.T1 (SessionStore implementations) to provide declarative configuration
- **Problems solved**: Eliminates need for manual SessionStore management, provides easy TTL configuration, enables configuration cascade for session settings

## What

Extend ProviderOptions interface with session configuration properties and update AnthropicProvider.initialize() to create SessionStore instances from these options.

### Success Criteria

- [ ] ProviderOptions interface extended with sessionPersistence, sessionTtl, sessionPath properties
- [ ] AnthropicProvider.initialize() creates appropriate SessionStore based on options
- [ ] Backward compatibility maintained - existing sessionStore property still works
- [ ] All existing tests pass without modification
- [ ] New tests verify easy configuration (string values) and full configuration (objects)
- [ ] Configuration cascade works for session options
- [ ] JSDoc documentation complete with defaults and examples

## All Needed Context

### Context Completeness Check

**Before implementing**, validate: "If someone knew nothing about this codebase, would they have everything needed to implement this successfully?"

✅ This PRP provides:
- Exact file paths and line numbers for all modifications
- Complete code examples from existing patterns to follow
- Research findings on configuration patterns from external sources
- Specific test patterns from the codebase
- Validation commands that work in this project
- Known gotchas and constraints

### Documentation & References

```yaml
# MUST READ - Critical context for implementation

# Codebase Research
- file: research/codebase-analysis.md
  why: Complete analysis of ProviderOptions interface, SessionStore implementations, and existing patterns
  critical: Current ProviderOptions structure at src/types/providers.ts:34-58
  gotcha: sessionStore property already exists - must maintain backward compatibility

# External Research
- file: research/external-patterns.md
  why: Best practices for TypeScript configuration interfaces, discriminated unions, TTL patterns
  critical: Discriminated union pattern for implementation selection
  gotcha: Use milliseconds for TTL consistency with existing cache implementation

# Core ProviderOptions Interface
- file: src/types/providers.ts
  why: Target interface to extend with new properties
  pattern: All properties are optional with JSDoc documentation
  gotcha: Uses dynamic import for SessionStore type to avoid circular dependency
  lines: 34-58

# SessionStore Interface and Implementations
- file: src/providers/session-store.ts
  why: Must understand SessionStore interface and constructor signatures
  pattern: MemorySessionStore() takes no args, FileSessionStore(directory: string = './sessions')
  gotcha: RedisSessionStore is interface stub only - not implemented yet

# AnthropicProvider Integration Point
- file: src/providers/anthropic-provider.ts
  why: Must update initialize() to create SessionStore from options
  pattern: Constructor injection with default fallback to MemorySessionStore
  gotcha: Uses instanceof checks to distinguish memory vs persistent stores
  lines: 1-100 (constructor and initialize method)

# Configuration Cascade System
- file: src/utils/provider-config.ts
  why: Understanding how options merge through global → agent → prompt levels
  pattern: Object spread with "last write wins" semantics
  gotcha: Must work with resolveProviderConfig() function

# Existing TTL Configuration Pattern
- file: src/cache/cache.ts
  why: Example of TTL configuration in codebase
  pattern: defaultTTLMs?: number with JSDoc default value
  gotcha: Uses milliseconds - maintain consistency

# Test Pattern: ProviderOptions Handling
- file: src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  why: Pattern for testing ProviderOptions in initialize()
  pattern: Test without options, with empty options, with specific options
  gotcha: All tests should be async and use Promise syntax

# Test Pattern: SessionStore Integration
- file: src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts
  why: Pattern for testing SessionStore integration
  pattern: Use instanceof to verify store type, test persistence across terminate/initialize
  gotcha: Must test both memory and persistent store behaviors

# Test Pattern: Configuration Cascade
- file: src/__tests__/unit/utils/provider-config.test.ts
  why: Pattern for testing configuration merge behavior
  pattern: Test global, agent, and prompt level options
  gotcha: Verify "last write wins" semantics
```

### Current Codebase Tree (relevant sections)

```bash
src/
├── providers/
│   ├── anthropic-provider.ts       # MODIFY: Update initialize() to create SessionStore from options
│   ├── session-store.ts            # REFERENCE: SessionStore implementations
│   └── index.ts
├── types/
│   ├── providers.ts                # MODIFY: Extend ProviderOptions interface
│   └── index.ts
├── utils/
│   ├── provider-config.ts          # REFERENCE: Configuration cascade system
│   └── index.ts
└── __tests__/
    └── unit/
        ├── providers/
        │   ├── anthropropic-provider-initialize.test.ts      # MODIFY: Add tests for new options
        │   └── anthropropic-provider-sessionstore.test.ts    # REFERENCE: SessionStore test patterns
        └── utils/
            └── provider-config.test.ts                       # REFERENCE: Configuration test patterns
```

### Desired Codebase Tree (new/modified files)

```bash
# No new files - modifications only

# MODIFIED FILES:
src/
├── providers/
│   └── anthropic-provider.ts       # UPDATE: initialize() creates SessionStore from sessionPersistence option
├── types/
│   └── providers.ts                # EXTEND: Add sessionPersistence, sessionTtl, sessionPath properties
└── __tests__/
    └── unit/
        └── providers/
            └── anthropropic-provider-initialize.test.ts      # EXTEND: Add tests for session configuration options
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Backward Compatibility Gotcha
// The existing sessionStore property MUST remain functional
// Users may already be injecting custom SessionStore instances
// Pattern: Check if sessionStore is provided, use it. Otherwise, create from sessionPersistence

// CRITICAL: SessionStore Constructor Signatures
// MemorySessionStore() - takes NO parameters
// FileSessionStore(directory: string = './sessions') - takes optional directory path
// RedisSessionStore - NOT YET IMPLEMENTED (interface stub only)

// CRITICAL: Configuration Cascade Order
// Global (lowest) → Agent (middle) → Prompt (highest)
// Must work with resolveProviderConfig() in src/utils/provider-config.ts

// CRITICAL: Type Import Pattern
// ProviderOptions uses dynamic import to avoid circular dependency:
// sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>

// CRITICAL: Instanceof Detection Pattern
// AnthropicProvider uses instanceof checks to distinguish store types:
// if (!(this.sessionStore instanceof MemorySessionStore)) { ... }

// CRITICAL: TTL Units
// Existing cache implementation uses MILLISECONDS
// Session TTL should also use MILLISECONDS for consistency
// Default: 24 hours = 86400000 milliseconds

// CRITICAL: File Path Default
// FileSessionStore defaults to './sessions'
// Our sessionPath option should also default to './sessions'

// CRITICAL: SessionState Type
// Sessions store SessionState type (defined in src/types/providers.ts)
// Must preserve generic type parameter when creating SessionStore instances
```

## Implementation Blueprint

### Data Models and Structure

The implementation extends existing types - no new data models required.

```typescript
// Existing type (will be extended)
export interface ProviderOptions {
  endpoint?: string;
  apiKey?: string;
  sessionId?: string;
  timeout?: number;
  headers?: Record<string, string>;
  sessionStore?: import("../providers/session-store.js").SessionStore<SessionState>;

  // NEW PROPERTIES TO ADD:
  // sessionPersistence?: 'memory' | 'file' | 'redis';
  // sessionTtl?: number;
  // sessionPath?: string;
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: MODIFY src/types/providers.ts
  - ADD: sessionPersistence property to ProviderOptions interface
  - TYPE: 'memory' | 'file' | 'redis'
  - OPTIONAL: Yes (undefined = use existing sessionStore or default to memory)
  - JSDOC: "Session persistence type. Use 'file' for persistent storage across restarts. Mutually exclusive with sessionStore property."
  - DEFAULT: Not specified - uses sessionStore if provided, otherwise 'memory'

  - ADD: sessionTtl property to ProviderOptions interface
  - TYPE: number (milliseconds)
  - OPTIONAL: Yes
  - JSDOC: "Session time-to-live in milliseconds. Sessions expire after this duration. Default: 86400000 (24 hours)."
  - DEFAULT: 86400000 (24 hours = 24 * 60 * 60 * 1000)

  - ADD: sessionPath property to ProviderOptions interface
  - TYPE: string
  - OPTIONAL: Yes
  - JSDOC: "Directory path for file-based session storage. Only used when sessionPersistence is 'file'. Default: './sessions'."
  - DEFAULT: './sessions'

  - PRESERVE: All existing properties (endpoint, apiKey, sessionId, timeout, headers, sessionStore)
  - PLACEMENT: Add new properties after sessionStore property (around line 56)
  - NAMING: camelCase following existing pattern

Task 2: MODIFY src/providers/anthropic-provider.ts - initialize() method
  - IMPLEMENT: SessionStore creation logic in initialize() method
  - FIND: Existing sessionStore assignment in constructor (around line 40-45)
  - MOVE: SessionStore creation logic from constructor to initialize()
  - PATTERN:
    ```typescript
    async initialize(options?: ProviderOptions): Promise<void> {
      // ... existing initialization code ...

      // Handle session store configuration
      if (options?.sessionStore) {
        // Direct injection (backward compatibility)
        this.sessionStore = options.sessionStore;
      } else if (options?.sessionPersistence) {
        // Create SessionStore from sessionPersistence option
        const ttl = options.sessionTtl ?? 86400000; // 24 hours default

        switch (options.sessionPersistence) {
          case 'memory':
            this.sessionStore = new MemorySessionStore<SessionState>();
            break;
          case 'file':
            const path = options.sessionPath ?? './sessions';
            this.sessionStore = new FileSessionStore<SessionState>(path);
            break;
          case 'redis':
            throw new Error('Redis session storage not yet implemented');
          default:
            const _exhaustiveCheck: never = options.sessionPersistence;
            throw new Error(`Unknown session persistence type: ${_exhaustiveCheck}`);
        }
      }
      // If neither sessionStore nor sessionPersistence provided, keep existing default (MemorySessionStore)

      // ... rest of initialization ...
    }
    ```

  - GOTCHA: Must handle case where neither sessionStore nor sessionPersistence is provided
  - GOTCHA: Must preserve existing instanceof checks for store type detection
  - GOTCHA: RedisSessionStore is not implemented - throw clear error message
  - PLACEMENT: Add session store creation logic at the beginning of initialize()

Task 3: MODIFY src/providers/anthropic-provider.ts - constructor
  - REMOVE: SessionStore assignment logic from constructor
  - KEEP: Default sessionStore initialization: `private sessionStore: SessionStore<SessionState> = new MemorySessionStore();`
  - REASON: Move session store creation to initialize() to have access to options
  - PLACEMENT: Constructor should only initialize default sessionStore property

Task 4: CREATE src/__tests__/unit/providers/anthropic-provider-sessionconfig.test.ts
  - IMPLEMENT: Comprehensive tests for session configuration options
  - FOLLOW: Pattern from anthropropic-provider-initialize.test.ts
  - TEST CASES:
    1. "should initialize with default session store (no options)"
    2. "should accept sessionPersistence: 'memory'"
    3. "should accept sessionPersistence: 'file'"
    4. "should accept sessionPersistence: 'file' with custom sessionPath"
    5. "should accept sessionPersistence: 'file' with custom sessionTtl"
    6. "should accept direct sessionStore injection (backward compatibility)"
    7. "should prioritize sessionStore over sessionPersistence"
    8. "should throw error for redis sessionPersistence (not implemented)"
    9. "should use default sessionPath when not specified"
    10. "should use default sessionTtl when not specified"

  - PATTERN:
    ```typescript
    describe('AnthropicProvider Session Configuration', () => {
      describe('sessionPersistence option', () => {
        it('should accept sessionPersistence: "memory"', async () => {
          const provider = new AnthropicProvider();
          await provider.initialize({ sessionPersistence: 'memory' });
          expect(provider['sessionStore']).toBeInstanceOf(MemorySessionStore);
        });

        it('should accept sessionPersistence: "file"', async () => {
          const provider = new AnthropicProvider();
          await provider.initialize({ sessionPersistence: 'file' });
          expect(provider['sessionStore']).toBeInstanceOf(FileSessionStore);
        });

        it('should accept sessionPersistence: "file" with custom sessionPath', async () => {
          const provider = new AnthropicProvider();
          const customPath = '/tmp/custom-sessions';
          await provider.initialize({ sessionPersistence: 'file', sessionPath: customPath });
          // Verify FileSessionStore created with custom path
        });

        it('should throw error for redis sessionPersistence', async () => {
          const provider = new AnthropicProvider();
          await expect(
            provider.initialize({ sessionPersistence: 'redis' })
          ).rejects.toThrow(/not yet implemented/);
        });
      });

      describe('Backward Compatibility', () => {
        it('should accept direct sessionStore injection', async () => {
          const customStore = new MemorySessionStore<SessionState>();
          const provider = new AnthropicProvider();
          await provider.initialize({ sessionStore: customStore });
          expect(provider['sessionStore']).toBe(customStore);
        });

        it('should prioritize sessionStore over sessionPersistence', async () => {
          const customStore = new MemorySessionStore<SessionState>();
          const provider = new AnthropicProvider();
          await provider.initialize({
            sessionStore: customStore,
            sessionPersistence: 'file'
          });
          expect(provider['sessionStore']).toBe(customStore); // Should use injected store
        });
      });
    });
    ```

  - NAMING: anthropic-provider-sessionconfig.test.ts
  - PLACEMENT: src/__tests__/unit/providers/
  - COVERAGE: All combinations of options and backward compatibility

Task 5: MODIFY src/__tests__/unit/providers/anthropic-provider-initialize.test.ts
  - VERIFY: All existing tests still pass with modified initialize() method
  - NO CHANGES to existing tests - they should pass without modification
  - REASON: Ensures backward compatibility

Task 6: VERIFY configuration cascade works
  - VERIFY: Session options merge correctly through global → agent → prompt levels
  - TEST: Use resolveProviderConfig() from src/utils/provider-config.ts
  - PATTERN: Follow provider-config.test.ts examples
  - GOTCHA: "Last write wins" semantics - prompt level overrides agent level
```

### Implementation Patterns & Key Details

```typescript
// ============================================================================
// CRITICAL PATTERNS - Follow these exactly
// ============================================================================

// Pattern 1: Discriminated Union for Type Safety
// When checking sessionPersistence, use switch with exhaustive check
switch (options.sessionPersistence) {
  case 'memory':
    // TypeScript knows: options is of type that includes 'memory'
    this.sessionStore = new MemorySessionStore<SessionState>();
    break;
  case 'file':
    // TypeScript knows: options is of type that includes 'file'
    this.sessionStore = new FileSessionStore<SessionState>(
      options.sessionPath ?? './sessions'
    );
    break;
  case 'redis':
    throw new Error('Redis session storage not yet implemented');
  default:
    // Exhaustive check - TypeScript will error if missing case
    const _exhaustiveCheck: never = options.sessionPersistence;
    throw new Error(`Unknown session persistence type: ${_exhaustiveCheck}`);
}

// Pattern 2: Nullish Coalescing for Defaults
// Use ?? instead of || for default values
const ttl = options.sessionTtl ?? 86400000; // 24 hours
const path = options.sessionPath ?? './sessions';

// Pattern 3: Priority Handling (sessionStore vs sessionPersistence)
// sessionStore (direct injection) takes priority over sessionPersistence
if (options?.sessionStore) {
  // Use injected store (backward compatibility)
  this.sessionStore = options.sessionStore;
} else if (options?.sessionPersistence) {
  // Create store from sessionPersistence option
  // ... switch statement ...
}
// If neither provided, keep existing default (MemorySessionSetore)

// Pattern 4: Generic Type Preservation
// When creating SessionStore instances, preserve generic type parameter
new MemorySessionStore<SessionState>()
new FileSessionStore<SessionState>(path)

// Pattern 5: JSDoc Documentation Pattern
// Follow existing pattern in ProviderOptions interface
/**
 * Session persistence type. Use 'file' for persistent storage across restarts.
 * Mutually exclusive with sessionStore property.
 *
 * @remarks
 * When specified, a SessionStore instance will be created automatically.
 * Provide sessionStore directly for custom store implementations.
 *
 * @example
 * ```typescript
 * // Easy configuration - file persistence
 * { sessionPersistence: 'file' }
 *
 * // Full configuration - custom path and TTL
 * {
 *   sessionPersistence: 'file',
 *   sessionPath: '/tmp/sessions',
 *   sessionTtl: 3600000
 * }
 *
 * // Direct injection - custom store
 * { sessionStore: new CustomStore() }
 * ```
 */
sessionPersistence?: 'memory' | 'file' | 'redis';

// Pattern 6: Error Message Format
// Use descriptive error messages that guide users
throw new Error('Redis session storage not yet implemented. Use sessionPersistence: "memory" or "file", or provide a custom sessionStore instance.');

// Pattern 7: Instanceof Check Pattern
// Existing code uses instanceof to distinguish store types
if (!(this.sessionStore instanceof MemorySessionStore)) {
  // Persistent store behavior
}
// This pattern must continue to work with our created stores
```

### Integration Points

```yaml
PROVIDEROPTIONS_INTERFACE:
  - file: src/types/providers.ts
  - add: sessionPersistence, sessionTtl, sessionPath properties
  - preserve: sessionStore property (backward compatibility)
  - location: After existing sessionStore property (around line 56)

ANTHROPICPROVIDER_CONSTRUCTOR:
  - file: src/providers/anthropic-provider.ts
  - remove: SessionStore assignment from constructor
  - keep: Default sessionStore property initialization
  - location: Constructor method

ANTHROPICPROVIDER_INITIALIZE:
  - file: src/providers/anthropic-provider.ts
  - add: SessionStore creation logic from sessionPersistence option
  - add: Priority handling (sessionStore vs sessionPersistence)
  - add: Error handling for redis (not implemented)
  - location: Beginning of initialize() method

CONFIGURATION_CASCADE:
  - file: src/utils/provider-config.ts
  - verify: Session options merge correctly through levels
  - no changes needed: Object spread handles new properties automatically

TESTS:
  - add: src/__tests__/unit/providers/anthropic-provider-sessionconfig.test.ts
  - verify: All existing tests pass without modification
  - coverage: All combinations of session options
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Run after each file modification - fix before proceeding

# Type checking with specific files
npx tsc --noEmit src/types/providers.ts
npx tsc --noEmit src/providers/anthropic-provider.ts

# Type checking for test files
npx tsc --noEmit src/__tests__/unit/providers/anthropic-provider-sessionconfig.test.ts

# Project-wide type checking
npm run check    # or: npx tsc --noEmit

# Expected: Zero type errors. If errors exist, READ output and fix before proceeding.
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test new session configuration functionality
npm test -- src/__tests__/unit/providers/anthropic-provider-sessionconfig.test.ts

# Test AnthropicProvider initialize() (existing tests should still pass)
npm test -- src/__tests__/unit/providers/anthropic-provider-initialize.test.ts

# Test AnthropicProvider sessionstore integration (should still pass)
npm test -- src/__tests__/unit/providers/anthropic-provider-sessionstore.test.ts

# Test configuration cascade
npm test -- src/__tests__/unit/utils/provider-config.test.ts

# Full test suite for providers
npm test -- src/__tests__/unit/providers/

# Expected: All tests pass. If failing, debug root cause and fix implementation.
```

### Level 3: Integration Testing (System Validation)

```bash
# Run all provider tests
npm test -- --testNamePattern="AnthropicProvider"

# Run all session-related tests
npm test -- --testNamePattern="session"

# Full unit test suite
npm test -- src/__tests__/unit/

# Integration test for session persistence
# (Manual verification: Create a provider with file persistence, initialize, terminate, initialize again, verify sessions restored)

# Expected: All integrations working, session store created correctly based on options
```

### Level 4: Domain-Specific Validation

```bash
# TypeScript compilation validation
npm run build    # Verify project builds successfully

# Type-level validation tests
npm test -- src/__tests__/unit/provider-interface.test.ts

# Adversarial input tests
npm test -- src/__tests__/adversarial/

# Expected: All validations pass, type safety maintained, backward compatibility verified
```

## Final Validation Checklist

### Technical Validation

- [ ] All 4 validation levels completed successfully
- [ ] All tests pass: `npm test`
- [ ] No type errors: `npm run check`
- [ ] Project builds successfully: `npm run build`
- [ ] No linting errors (if project uses linter)

### Feature Validation

- [ ] `sessionPersistence: 'memory'` creates MemorySessionStore
- [ ] `sessionPersistence: 'file'` creates FileSessionStore
- [ ] `sessionPersistence: 'file'` with custom `sessionPath` uses custom path
- [ ] `sessionPersistence: 'file'` with custom `sessionTtl` passes TTL (note: TTL implementation is P2.M2.T2.S2)
- [ ] `sessionPersistence: 'redis'` throws clear error message
- [ ] Direct `sessionStore` injection still works (backward compatibility)
- [ ] `sessionStore` takes priority over `sessionPersistence`
- [ ] Default sessionStore (MemorySessionStore) when no options provided
- [ ] Configuration cascade works for session options

### Code Quality Validation

- [ ] Follows existing codebase patterns and naming conventions
- [ ] JSDoc documentation complete for all new properties
- [ ] Discriminated union pattern with exhaustive check
- [ ] Nullish coalescing (??) used for defaults
- [ ] Generic type parameter preserved when creating SessionStore instances
- [ ] Error messages are descriptive and helpful
- [ ] No modifications to existing tests (backward compatibility verified)

### Backward Compatibility

- [ ] Existing `sessionStore` property remains functional
- [ ] All existing tests pass without modification
- [ ] Existing code using `sessionStore` injection continues to work
- [ ] Instanceof checks for store type detection still work
- [ ] No breaking changes to ProviderOptions interface

---

## Anti-Patterns to Avoid

- ❌ Don't remove or modify the existing `sessionStore` property
- ❌ Don't use `||` for defaults - use `??` (nullish coalescing)
- ❌ Don't forget to preserve generic type parameter `<SessionState>` when creating stores
- ❌ Don't implement RedisSessionStore - it's not ready yet
- ❌ Don't modify existing tests - they should pass without changes
- ❌ Don't use synchronous file operations - SessionStore methods are async
- ❌ Don't hardcode default values - use constants with clear names
- ❌ Don't skip the exhaustive check in the switch statement
- ❌ Don't create SessionStore in constructor - move to initialize()
- ❌ Don't throw generic errors - provide helpful guidance in error messages

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success likelihood

**Rationale**:
- Comprehensive research provides all necessary context
- Existing patterns are well-documented and clear to follow
- Backward compatibility requirements are explicitly defined
- Test patterns from codebase are specific and actionable
- All file paths and line numbers are provided
- Known gotchas are documented with solutions
- Validation commands are project-specific and verified

**Remaining risks**:
- RedisSessionStore stub implementation may cause confusion
- TTL implementation (sessionTtl) is deferred to P2.M2.T2.S2
- Need to ensure configuration cascade works correctly with new properties

**Validation**: The completed PRP provides comprehensive context including:
- Exact code structure from research
- Specific implementation patterns to follow
- Complete test coverage requirements
- All file paths and line numbers
- Backward compatibility guidance
- Known gotchas with solutions

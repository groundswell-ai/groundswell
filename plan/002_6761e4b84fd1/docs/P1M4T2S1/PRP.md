# PRP: Run TypeScript Compiler and Fix Errors

**PRP ID**: P1.M4.T2.S1
**Work Item**: Run TypeScript compiler and fix errors
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Execute TypeScript compiler verification to ensure zero compilation errors after the AgentResponse migration, validating type safety across the entire codebase.

**Deliverable**: Clean TypeScript compilation with zero errors - both `npm run lint` (type checking) and `npm run build` (full compilation) must pass without errors, with `dist/` directory properly populated.

**Success Definition**:
- Running `npm run lint` (tsc --noEmit) completes with zero errors
- Running `npm run build` (tsc) completes with zero errors
- `dist/` directory is populated with compiled JavaScript (.js) and declaration (.d.ts) files
- All source files compile without type errors
- dist/ structure mirrors src/ structure (excluding __tests__)

---

## User Persona (if applicable)

**Target User**: Development team verifying TypeScript compilation integrity before deployment

**Use Case**: After completing test suite validation (P1.M4.T1), developers run TypeScript compiler to ensure type safety across the codebase and generate distribution files for publishing

**User Journey**:
1. Developer completes AgentResponse migration and test fixes (P1.M1-P1.M4.T1)
2. Developer runs `npm run lint` to verify type checking
3. Developer runs `npm run build` to generate distribution files
4. TypeScript compiler reports any type errors (if any)
5. Developer fixes errors using this PRP's guidance
6. Clean compilation achieved, ready for example script verification (P1.M4.T3)

**Pain Points Addressed**:
- TypeScript type errors that prevent compilation
- Missing type annotations after code changes
- Discriminated union misuse with AgentResponse<T>
- Generic type parameter inference failures
- Property access without proper type narrowing

---

## Why

**Business Value and User Impact**:
- **Type safety assurance**: TypeScript compiler validates all types are correct, catching errors at compile time
- **Distribution readiness**: Generates compiled JavaScript and declaration files for npm package publishing
- **Developer confidence**: Zero compilation errors means code is type-safe and ready for deployment
- **Prevents runtime errors**: TypeScript's strict mode catches issues before runtime
- **Documentation generation**: Declaration files (.d.ts) provide IntelliSense for consumers

**Integration with Existing Features**:
- **Depends on**: P1.M4.T1.S3 (adversarial tests passing) - provides foundation of working, tested code
- **Validates**:
  - P1.M1.T1 (Agent.prompt() returns AgentResponse<T>) - type signatures are correct
  - P1.M1.T2 (All call sites handle AgentResponse) - usage patterns are type-safe
  - P1.M1.T3 (AgentResponse type definitions and exports) - types are properly defined
  - All previous work items have correct TypeScript syntax

**Testing**: TypeScript compiler as type checker, build output verification

**Problems This Solves**:
- Catch any remaining type errors from AgentResponse migration
- Ensure all discriminated union usage is correct (status checks before data/error access)
- Validate generic type parameters are properly specified
- Generate production-ready distribution files
- Verify PRD 6.4.4 compliance (null over undefined) at type level

---

## What

**User-Visible Behavior**:
- Developers run `npm run lint` and `npm run build` with zero errors
- TypeScript compiler validates all types are correct
- dist/ directory is populated with compiled files ready for publishing
- No type errors in IDE or CI/CD pipeline

**Technical Requirements**:
- Execute `npm run lint` (tsc --noEmit) for type checking only
- Execute `npm run build` (tsc) for full compilation with dist/ generation
- Fix any TypeScript compiler errors that occur
- Ensure strict mode compliance (all strict options enabled)
- Verify dist/ structure matches expected output

### Success Criteria

- [ ] `npm run lint` completes with zero errors (tsc --noEmit passes)
- [ ] `npm run build` completes with zero errors (tsc passes)
- [ ] dist/ directory is populated with .js, .d.ts, and .map files
- [ ] dist/ structure mirrors src/ (cache/, core/, debugger/, decorators/, reflection/, tools/, types/, utils/)
- [ ] Main entry points exist: dist/index.js, dist/index.d.ts
- [ ] No TypeScript errors in IDE or CLI
- [ ] All AgentResponse<T> usages are type-safe
- [ ] All discriminated union accesses are properly narrowed
- [ ] All generic type parameters are correctly specified

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact build commands, tsconfig.json details, common error patterns with fixes, and references to AgentResponse types. An implementer unfamiliar with the codebase can run the compiler and fix errors using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P1M4T1S3/PRP.md
  why: Defines adversarial test outputs - assumes 100% adversarial test pass rate as starting point
  critical: TypeScript verification runs after tests pass; ensures runtime behavior matches types

# TypeScript Configuration
- file: tsconfig.json
  why: Complete TypeScript compiler configuration - strict mode, target, module, paths
  pattern: ES2022 target, bundler resolution, strict: true, outDir: ./dist
  critical: "strict": true enables all strict type checking options
  section: Lines 1-22 (complete tsconfig.json)

# Build Commands
- file: package.json
  why: npm scripts for lint and build commands
  section: scripts.lint = "tsc --noEmit" (type checking only)
  section: scripts.build = "tsc" (full compilation)
  critical: Use 'npm run lint' first, then 'npm run build'

# Core Type Definitions
- file: src/types/agent.ts
  why: AgentResponse<T> type definition - discriminated union with status field
  pattern: status: 'success' | 'error' | 'partial', data: T | null, error: AgentErrorDetails | null
  critical: Lines 161-833 (complete AgentResponse definition)
  section: Lines 97-194 for AgentResponse interface, lines 101 for AgentResponseStatus

# Type Guard Functions
- file: src/types/agent.ts
  why: isSuccess(), isError(), isPartial() type guard functions for narrowing
  pattern: User-defined type guards with type predicates (response is SuccessResponse<T>)
  critical: Use these guards before accessing data or error properties
  section: Lines 400-500 (type guard function definitions)

# Factory Functions
- file: src/types/agent.ts
  why: createSuccessResponse(), createErrorResponse(), createPartialResponse() for creating AgentResponse
  pattern: Factory functions handle null conversion, metadata generation, status validation
  critical: ALWAYS use factory functions instead of manual construction
  section: Lines 600-800 (factory function definitions)

# Agent.prompt() Implementation
- file: src/core/agent.ts
  why: Main entry point returning AgentResponse<T> - shows proper return type annotation
  pattern: async prompt<T>(prompt: Prompt<T>, overrides?: PromptOverrides): Promise<AgentResponse<T>>
  critical: Line 121 (method signature), lines 425-478 (INVALID_RESPONSE_FORMAT handling)

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P1M4T2S1/research/typescript-compiler-research.md
  why: Complete TypeScript compiler error reference with fixes for discriminated unions and generics
  section: All sections - error codes, fixes, best practices, quick reference
  critical: Section 1 (TypeScript Compiler Errors), Section 5 (AgentResponse<T> Specific Patterns)

- docfile: plan/002_6761e4b84fd1/P1M4T2S1/research/agentresponse-type-patterns.md
  why: Common AgentResponse type usage patterns and potential errors found in codebase
  section: All sections - usage patterns, error patterns, recommendations
  critical: Common error patterns, specific file paths with line numbers
```

### Current Codebase Tree (TypeScript configuration)

```bash
/home/dustin/projects/groundswell
├── package.json                 # Contains "lint": "tsc --noEmit" and "build": "tsc"
├── tsconfig.json                # TypeScript compiler configuration
├── src/
│   ├── core/
│   │   ├── agent.ts             # Agent.prompt() returns AgentResponse<T>
│   │   ├── workflow.ts          # Workflow base class
│   │   └── prompt.ts            # Prompt class
│   ├── types/
│   │   ├── agent.ts             # AgentResponse<T> types, type guards, factory functions
│   │   ├── workflow.ts          # Workflow types
│   │   └── index.ts             # Type exports
│   ├── decorators/
│   │   ├── step.ts              # @Step decorator
│   │   └── task.ts              # @Task decorator
│   ├── debugger/
│   │   └── tree-debugger.ts     # WorkflowTreeDebugger
│   ├── cache/
│   │   └── cache.ts             # LLMCache
│   ├── reflection/
│   │   └── reflection.ts        # ReflectionManager
│   ├── tools/
│   │   └── introspection.ts     # INTROSPECTION_TOOLS
│   ├── utils/
│   │   └── observable.ts        # Observable implementation
│   └── index.ts                 # Main entry point
├── dist/                        # OUTPUT DIRECTORY (generated by tsc)
│   ├── index.js                 # Main entry point (generated)
│   ├── index.d.ts               # Type declarations (generated)
│   ├── core/                    # Compiled core modules
│   ├── types/                   # Compiled type definitions
│   ├── decorators/              # Compiled decorators
│   └── ...                      # Other compiled directories
└── plan/
    └── 002_6761e4b84fd1/
        └── P1M4T2S1/
            ├── PRP.md           # This file
            └── research/        # Research files (2 files)
                ├── typescript-compiler-research.md
                └── agentresponse-type-patterns.md
```

### Desired Codebase Tree (after successful build)

```bash
dist/                              # Generated by npm run build
├── cache/
│   ├── cache.js
│   ├── cache.d.ts
│   └── cache.js.map
├── core/
│   ├── agent.js                  # Compiled Agent class
│   ├── agent.d.ts                # Agent type declarations
│   ├── agent.js.map              # Source map
│   ├── workflow.js
│   ├── workflow.d.ts
│   ├── workflow.js.map
│   └── ... (other core files)
├── decorators/
│   ├── step.js
│   ├── step.d.ts
│   └── ...
├── debugger/
│   ├── tree-debugger.js
│   ├── tree-debugger.d.ts
│   └── ...
├── examples/
│   └── ... (compiled examples)
├── reflection/
│   ├── reflection.js
│   └── ...
├── types/
│   ├── agent.js                  # Compiled AgentResponse types
│   ├── agent.d.ts                # AgentResponse type declarations
│   └── ... (other type files)
├── tools/
│   └── ...
├── utils/
│   └── ...
├── index.js                      # Main entry point
├── index.d.ts                    # Main type declarations
├── index.js.map                  # Source map
└── index.d.ts.map                # Declaration map
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Build Commands
// - Use 'npm run lint' FIRST for type checking (tsc --noEmit)
// - Use 'npm run build' SECOND for full compilation (tsc)
// - lint is faster (no file output) and catches all type errors
// - build generates dist/ directory with .js, .d.ts, .map files

// CRITICAL: TypeScript Version
// - TypeScript 5.2.0 or later required
// - ES2022 target for modern JavaScript features
// - bundler module resolution for modern build tools
// - strict: true enables ALL strict type checking options

// CRITICAL: Strict Mode (ALL enabled)
// - strictNullChecks: null and undefined are distinct types
// - noImplicitAny: disallows implicit any types
// - strictFunctionTypes: stricter function type checking
// - strictPropertyInitialization: class properties must be initialized
// - noImplicitThis: disallows implicit any this types
// - alwaysStrict: always in strict mode

// CRITICAL: AgentResponse Discriminated Union
// - status field is the discriminant ('success' | 'error' | 'partial')
// - TypeScript narrows type based on status value
// - MUST check status before accessing data or error
// - Accessing response.data without status check: TypeScript error (Object is possibly 'null')
// - Accessing response.error without status check: TypeScript error (Object is possibly 'null')

// CRITICAL: PRD 6.4.4 Compliance (null over undefined)
// - PRD 6.4.4: "Use null for absent values; undefined is not valid JSON"
// - TypeScript strictNullChecks enforces null vs undefined distinction
// - data: T | null (not T | undefined)
// - error: AgentErrorDetails | null (not AgentErrorDetails | undefined)
// - Factory functions automatically convert undefined to null

// CRITICAL: Type Guard Usage
// - isSuccess(response): narrows to SuccessResponse<T> (data is T, error is null)
// - isError(response): narrows to ErrorResponse (data is null, error is AgentErrorDetails)
// - isPartial(response): narrows to PartialResponse<T> (data is T, error is null)
// - Type narrowing is LOST across async boundaries - capture data before await

// CRITICAL: Generic Type Parameters
// - AgentResponse<T> requires T to be specified or inferred
// - When calling agent.prompt<T>(), T is inferred from responseFormat schema
// - Explicit type: agent.prompt<{ result: string }>()
// - Inferred type: agent.prompt(prompt) where prompt has z.object responseFormat

// CRITICAL: Common TypeScript Errors with AgentResponse
// - TS2531: Object is possibly 'null' (accessing data/error without status check)
// - TS2339: Property does not exist on type (wrong union member access)
// - TS2345: Argument not assignable (wrong generic type or null vs undefined)
// - TS2322: Type not assignable (discriminated union mismatch)
// - TS7005: Element implicitly has 'any' type (missing type annotation)

// CRITICAL: File Exclusions
// - src/__tests__ is EXCLUDED from compilation (tsconfig.json exclude)
// - Test files are NOT compiled to dist/
// - Only production source files are compiled

// CRITICAL: Declaration Files (.d.ts)
// - Automatically generated by tsc with declaration: true
// - Include type information for library consumers
// - dist/index.d.ts is the main declaration file
// - declarationMap: true generates .d.ts.map for IDE navigation

// CRITICAL: Source Maps (.map)
// - Generated for both .js and .d.ts files
// - Enable debugging and IDE navigation
// - sourceMap: true for JavaScript
// - declarationMap: true for declarations

// CRITICAL: Module System
// - "type": "module" in package.json (ES modules)
// - Target is ES2022 (modern JavaScript)
// - moduleResolution: "bundler" (optimized for bundlers)
// - No CommonJS compatibility needed

// CRITICAL: Build Output
// - outDir: ./dist (all output goes here)
// - rootDir: ./src (preserves directory structure)
// - dist structure mirrors src structure (excluding __tests__)

// CRITICAL: Compiler Options
// - isolatedModules: true (each file can be transpiled independently)
// - skipLibCheck: true (faster compilation, skips .d.ts files)
// - forceConsistentCasingInFileNames: true (prevents cross-platform issues)
// - esModuleInterop: true (better CommonJS/ESM interop)
```

---

## Implementation Blueprint

### Data Models and Structure

This task validates existing code through TypeScript compilation. No new data models.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: RUN type checking with npm run lint
  - EXECUTE: npm run lint (tsc --noEmit)
  - VERIFY: Command completes with exit code 0
  - VERIFY: No error messages in output
  - VERIFY: TypeScript compiler reports no errors
  - LOCATION: Run from /home/dustin/projects/groundswell
  - EXPECTED: Clean output with no errors (tests pass from P1.M4.T1.S3)
  - IF ERRORS: Proceed to Task 2
  - IF SUCCESS: Proceed to Task 4

Task 2: ANALYZE TypeScript compiler errors (if any)
  - REVIEW: Each error message from tsc
  - IDENTIFY: Error code (TS####) and location (file:line)
  - CATEGORIZE: Error type using research/typescript-compiler-research.md
  - DOCUMENT: List of errors with proposed fixes
  - PRIORITIZE: Fix errors in dependency order (types before usages)
  - REFERENCE: Use error categories from research:
    * Category 1: Discriminated union errors (accessing data/error without status check)
    * Category 2: Generic type parameter errors (T not specified or inferred)
    * Category 3: Null/undefined assignment errors (PRD 6.4.4 violations)
    * Category 4: Missing type annotations (implicit any errors)
    * Category 5: Type assertion errors (incorrect type narrowing)

Task 3: FIX TypeScript compiler errors (if any exist)
  - PATTERN: Add type guard checks before accessing data/error
  - FIX: Check response.status before accessing response.data or response.error
  - REFERENCE: research/typescript-compiler-research.md Section 1.1 (Discriminated Union Errors)
  - EXAMPLE:
      // Before (ERROR)
      const value = response.data.value;  // Object is possibly 'null'
      // After (CORRECT)
      if (isSuccess(response)) {
        const value = response.data.value;  // Safe
      }
  - FILES: Any files with AgentResponse usage (src/core/agent.ts, src/reflection/reflection.ts, etc.)
  - VALIDATION: Re-run npm run lint after each fix batch

Task 4: RUN full build with npm run build
  - EXECUTE: npm run build (tsc)
  - VERIFY: Command completes with exit code 0
  - VERIFY: No error messages in output
  - VERIFY: dist/ directory is created/populated
  - LOCATION: Run from /home/dustin/projects/groundswell
  - EXPECTED: Clean compilation with dist/ populated

Task 5: VERIFY dist/ directory structure
  - CHECK: dist/index.js exists (main entry point)
  - CHECK: dist/index.d.ts exists (type declarations)
  - CHECK: dist/index.js.map exists (source map)
  - CHECK: dist/core/ exists (compiled core modules)
  - CHECK: dist/types/ exists (compiled type definitions)
  - CHECK: dist/decorators/ exists (compiled decorators)
  - CHECK: dist/debugger/ exists (compiled debugger)
  - CHECK: dist/reflection/ exists (compiled reflection)
  - CHECK: dist/tools/ exists (compiled tools)
  - CHECK: dist/utils/ exists (compiled utils)
  - CHECK: dist/cache/ exists (compiled cache)
  - VERIFY: No dist/__tests__/ directory (tests excluded)
  - VERIFY: dist structure mirrors src structure

Task 6: VERIFY specific compiled files
  - CHECK: dist/core/agent.js exists (Agent class)
  - CHECK: dist/core/agent.d.ts exists (Agent type declarations)
  - CHECK: dist/types/agent.js exists (AgentResponse types)
  - CHECK: dist/types/agent.d.ts exists (AgentResponse type declarations)
  - VERIFY: .d.ts files have proper export declarations
  - VERIFY: .js files are readable and valid JavaScript

Task 7: VERIFY build output completeness
  - COUNT: Total .js files in dist/
  - COUNT: Total .d.ts files in dist/
  - VERIFY: Each .js file has corresponding .d.ts file
  - VERIFY: Source maps (.js.map, .d.ts.map) exist
  - CHECK: No unexpected errors in build output

Task 8: DOCUMENT build results
  - RECORD: TypeScript compiler version (tsc --version)
  - RECORD: Total compilation time (from build output)
  - RECORD: Total files compiled (from build output)
  - RECORD: Any warnings (if any)
  - STORE: Notes in research/ directory if significant issues found
```

### Implementation Patterns & Key Details

```typescript
// Show critical patterns and gotchas - keep concise

// Pattern 1: Type Guard Before Data Access (Most Common Fix)
// PROBLEM: TypeScript error "Object is possibly 'null'"
// Before: Direct access without status check
function processData(response: AgentResponse<{ value: string }>) {
  const value = response.data.value;  // ERROR: Object is possibly 'null'
}

// After: Use type guard before access
function processData(response: AgentResponse<{ value: string }>) {
  if (isSuccess(response) || isPartial(response)) {
    const value = response.data.value;  // SAFE: data is not null
    return value;
  }
  throw new Error('Invalid response status');
}

// Pattern 2: Exhaustive Status Handling
// PROBLEM: Missing case in status handling
// Before: Not all status cases handled
function handleResponse(response: AgentResponse<string>) {
  if (response.status === 'success') {
    return response.data;
  }
  // Missing 'error' and 'partial' cases - TypeScript error in strict mode
}

// After: Handle all cases explicitly
function handleResponse(response: AgentResponse<string>) {
  switch (response.status) {
    case 'success':
      return response.data;
    case 'partial':
      return response.data;
    case 'error':
      throw new Error(response.error.message);
    default:
      const _exhaustive: never = response;  // TypeScript checks exhaustiveness
      return _exhaustive;
  }
}

// Pattern 3: Generic Type Parameter Specification
// PROBLEM: TypeScript cannot infer generic type
// Before: No type parameter
const response = await agent.prompt(createPrompt({
  user: 'Hello',
  // No responseFormat - T defaults to unknown
}));

// After: Specify type parameter or provide responseFormat
const response = await agent.prompt<{ result: string }>(
  createPrompt({
    user: 'Hello',
    responseFormat: z.object({ result: z.string() }),
  })
);
// T is inferred as { result: string }

// Pattern 4: Null vs Undefined (PRD 6.4.4)
// PROBLEM: Using undefined instead of null
// Before: undefined assignment
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: undefined,  // ERROR: undefined is not assignable to null
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// After: Use null (PRD 6.4.4 compliant)
const response: AgentResponse<string> = {
  status: 'success',
  data: 'test',
  error: null,  // CORRECT: null is required
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// Pattern 5: Factory Function Usage (Best Practice)
// ALWAYS use factory functions for creating AgentResponse objects
// Factory functions handle:
// - Null conversion (undefined -> null)
// - Metadata generation
// - Status validation
// - Discriminated union consistency

// Instead of manual construction (error-prone):
const response = {
  status: 'success',
  data: 'test',
  error: undefined,  // Wrong - should be null
  metadata: { agentId: 'test', timestamp: Date.now() }
};

// Use factory functions (correct):
const response = createSuccessResponse('test', {
  agentId: 'test',
  timestamp: Date.now()
});

// Pattern 6: Return Type Annotations
// PROBLEM: Missing return type annotation
// Before: No return type (may fail strict mode)
async function executeAgent() {
  return await agent.prompt(prompt);  // TypeScript may infer Promise<any>
}

// After: Explicit return type
async function executeAgent(): Promise<AgentResponse<ResultType>> {
  return await agent.prompt(prompt);
}

// Pattern 7: Type Assertion Avoidance
// PROBLEM: Using 'as' to bypass type checker
// Before: Forceful type assertion
const data = (response as any).data;  // UNSAFE

// After: Proper type narrowing
if (isSuccess(response)) {
  const data = response.data;  // SAFE
}

// Pattern 8: Async Boundary Type Narrowing
// PROBLEM: Type narrowing lost across async boundary
// Before: Accessing data after await
const response = await agent.prompt(prompt);
// Some async operation
await somethingElse();
// Type narrowing may be lost
const data = response.data;  // May error

// After: Capture data before async operations
const response = await agent.prompt(prompt);
if (isSuccess(response)) {
  const data = response.data;  // Capture while narrowed
  await somethingElse();
  return data;  // Safe to use
}
```

### Integration Points

```yaml
DEPENDS_ON:
  - P1.M4.T1.S1: Unit tests passing
  - P1.M4.T1.S2: Integration tests passing
  - P1.M4.T1.S3: Adversarial tests passing
  - P1.M1.T1: Agent.prompt() returns AgentResponse<T>
  - P1.M1.T2: All call sites handle AgentResponse
  - P1.M1.T3: AgentResponse types exported from index.ts
  - P1.M2.T1: Zod schema validation added

VALIDATES:
  - TypeScript compiler finds no type errors
  - All discriminated union usage is correct
  - All generic type parameters are specified
  - PRD 6.4.4 compliance (null over undefined) at type level
  - Strict mode compliance (all strict options)
  - Distribution files are generated correctly
  - Type declarations are properly exported

OUTPUTS:
  - Clean TypeScript compilation (zero errors)
  - dist/ directory with compiled files
  - .js files for runtime execution
  - .d.ts files for type information
  - .map files for debugging
  - Ready for npm package publishing

NEXT_STEPS:
  - P1.M4.T3: Verify example scripts run successfully
  - Deployment readiness verification
```

---

## Validation Loop

### Level 1: Type Checking (Immediate Feedback)

```bash
# Run TypeScript compiler with --noEmit flag (type checking only)
npm run lint

# Expected output:
# (empty - no errors)

# If errors occur, output format:
# src/file.ts:line:column - error TS####: error message
# Example:
# src/core/agent.ts:142:5 - error TS2531: Object is possibly 'null'

# If errors occur:
# 1. Note the error code (TS####) and location (file:line:column)
# 2. Read the error message carefully
# 3. Categorize the error type using research/typescript-compiler-research.md
# 4. Apply appropriate fix from Implementation Tasks
# 5. Re-run npm run lint to verify fix

# Common error codes:
# TS2531: Object is possibly 'null' - add type guard check
# TS2339: Property does not exist - wrong union member access
# TS2345: Argument not assignable - type mismatch
# TS2322: Type not assignable - discriminated union mismatch
# TS7005: Element implicitly has 'any' type - missing type annotation

# Expected: Zero errors with clean output
```

### Level 2: Full Compilation (Component Validation)

```bash
# Run full TypeScript compiler (generates dist/)
npm run build

# Expected output:
# (empty - no errors, or brief compilation summary)

# Verify dist/ directory was created
ls -la dist/

# Expected dist/ structure:
# dist/
# ├── cache/
# ├── core/
# ├── debugger/
# ├── decorators/
# ├── examples/
# ├── reflection/
# ├── tools/
# ├── types/
# ├── utils/
# ├── index.js
# ├── index.d.ts
# ├── index.js.map
# └── index.d.ts.map

# Verify key files exist
test -f dist/index.js && echo "index.js exists"
test -f dist/index.d.ts && echo "index.d.ts exists"
test -f dist/core/agent.js && echo "agent.js exists"
test -f dist/types/agent.d.ts && echo "agent type declarations exist"

# Expected: All files exist, no build errors
```

### Level 3: Build Output Verification (System Validation)

```bash
# Count compiled files
find dist/ -name "*.js" | wc -l
find dist/ -name "*.d.ts" | wc -l

# Verify .js and .d.ts files match (each .js should have .d.ts)
JS_COUNT=$(find dist/ -name "*.js" | wc -l)
DTS_COUNT=$(find dist/ -name "*.d.ts" | wc -l)
echo "JS files: $JS_COUNT, DTS files: $DTS_COUNT"

# Verify source maps exist
find dist/ -name "*.map" | wc -l

# Check dist/index.d.ts for proper exports
head -50 dist/index.d.ts | grep -E "(export|import)"

# Verify specific AgentResponse exports
grep -A5 "AgentResponse" dist/types/agent.d.ts

# Expected: Matching file counts, proper exports, no errors
```

### Level 4: TypeScript Version and Strict Mode Validation

```bash
# Verify TypeScript version
npx tsc --version

# Expected: Version 5.2.0 or later

# Verify strict mode is enabled
grep "strict" tsconfig.json

# Expected: "strict": true

# Verify all strict options are implicitly enabled
npx tsc --showConfig | jq '.compilerOptions | keys | select(contains("strict"))'

# Verify ES2022 target
grep '"target"' tsconfig.json

# Expected: "target": "ES2022"

# Verify module resolution
grep '"moduleResolution"' tsconfig.json

# Expected: "moduleResolution": "bundler"

# Expected: TypeScript 5.2+, strict mode, ES2022 target, bundler resolution
```

---

## Final Validation Checklist

### Technical Validation

- [ ] `npm run lint` completes with zero errors (tsc --noEmit passes)
- [ ] `npm run build` completes with zero errors (tsc passes)
- [ ] dist/ directory exists and is populated
- [ ] dist/index.js exists (main entry point)
- [ ] dist/index.d.ts exists (type declarations)
- [ ] dist/index.js.map exists (source map)
- [ ] dist/index.d.ts.map exists (declaration map)
- [ ] All source directories have corresponding dist/ subdirectories
- [ ] dist/__tests__/ does NOT exist (tests excluded)
- [ ] .js, .d.ts, and .map file counts match

### AgentResponse Validation

- [ ] All AgentResponse<T> usages are type-safe
- [ ] All discriminated union accesses use type guards
- [ ] No direct data/error access without status check
- [ ] All generic type parameters are specified or inferred
- [ ] PRD 6.4.4 compliance (null over undefined) at type level
- [ ] Factory functions used for creating AgentResponse
- [ ] Return type annotations present on functions returning AgentResponse

### Code Quality Validation

- [ ] No TypeScript errors in any source files
- [ ] No @ts-ignore comments (type safety maintained)
- [ ] No 'any' types unless explicitly justified
- [ ] No forceful type assertions ('as any') without reason
- [ ] Strict mode compliance maintained
- [ ] Proper type narrowing with type guards
- [ ] Exhaustive status handling where required

### Distribution Readiness Validation

- [ ] dist/ structure is ready for npm publishing
- [ ] All exports are properly declared in .d.ts files
- [ ] Source maps enable debugging
- [ ] No test files in dist/ (only production code)
- [ ] package.json points to correct entry points (main, module, types)
- [ ] Build is reproducible (same source = same dist/)

---

## Anti-Patterns to Avoid

- ❌ Don't skip npm run lint - always type check before building
- ❌ Don't ignore TypeScript errors - fix them before proceeding
- ❌ Don't use `// @ts-ignore` to bypass type checker - fix the type
- ❌ Don't use `as any` to force types - use proper type narrowing
- ❌ Don't access response.data without status check - use type guards
- ❌ Don't access response.error without status check - use type guards
- ❌ Don't use undefined instead of null - PRD 6.4.4 requires null
- ❌ Don't forget to specify generic type parameters when needed
- ❌ Don't manually construct AgentResponse - use factory functions
- ❌ Don't assume build succeeds if tests pass - type errors are different from runtime errors
- ❌ Don't modify tsconfig.json without understanding implications
- ❌ Don't exclude source files from compilation without reason
- ❌ Don't check dist/ into git - it's generated content
- ❌ Don't use .ts files in production - always use compiled .js files
- ❌ Don't forget to re-run lint after fixing errors - new errors may appear

---

## References

### Research Files (plan/002_6761e4b84fd1/P1M4T2S1/research/)

- `typescript-compiler-research.md` - Comprehensive TypeScript compiler error reference with fixes for discriminated unions, generics, and AgentResponse<T> patterns
- `agentresponse-type-patterns.md` - Common AgentResponse type usage patterns and potential errors found in codebase

### External References

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- TypeScript Compiler Options: https://www.typescriptlang.org/tsconfig
- Discriminated Unions: https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes-func.html#discriminated-unions
- Type Narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
- TypeScript Error Index: https://www.typescriptlang.org/docs/handbook/2/types-from-types.html#error-codes

### Source Files Referenced

- `tsconfig.json` - TypeScript compiler configuration
- `package.json` - Build and lint script definitions
- `src/types/agent.ts` - AgentResponse<T> types, type guards, factory functions
- `src/core/agent.ts` - Agent.prompt() implementation returning AgentResponse<T>
- `src/index.ts` - Main entry point with exports

### PRD References

- PRD Section 6: Agent Response Model
- PRD Section 6.4: Response Requirements (null over undefined)
- PRD Section 6.4.4: "Use null for absent values; undefined is not valid JSON"

---

**End of PRP**

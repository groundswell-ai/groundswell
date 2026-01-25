# PRP: Run Example Scripts and Verify Output

**PRP ID**: P1.M4.T3.S1
**Work Item**: Run example scripts and verify output
**Status**: Implementation Ready
**Confidence Score**: 10/10

---

## Goal

**Feature Goal**: Execute all 11 example scripts using their npm scripts and verify they run successfully without errors, demonstrating proper AgentResponse usage patterns where applicable.

**Deliverable**: Verified execution of all example scripts with confirmation of:
1. All scripts execute without uncaught exceptions
2. Console output shows expected patterns (status messages, tree visualizations, statistics)
3. AgentResponse handling is correct (for scripts that use it)
4. No runtime errors or crashes

**Success Definition**:
- All 11 example scripts execute via `npm run start:*` commands
- Each script completes without throwing uncaught exceptions
- Console output contains expected success indicators (completed status, tree visualization, statistics)
- No runtime TypeScript errors (compiled dist/ from P1.M4.T2.S1 is used)
- Scripts produce their documented output (tree strings, logs, results)

---

## User Persona (if applicable)

**Target User**: Development team verifying the complete AgentResponse migration and build pipeline

**Use Case**: After completing TypeScript compilation (P1.M4.T2), developers run all example scripts to verify the entire system works end-to-end with the new AgentResponse<T> patterns

**User Journey**:
1. Developer completes TypeScript compilation with zero errors (P1.M4.T2.S1)
2. Developer runs each example script individually to verify execution
3. Developer observes console output for expected patterns
4. Developer confirms AgentResponse handling is correct where used
5. Developer marks build verification complete

**Pain Points Addressed**:
- Manual script-by-script verification is tedious
- Unclear what "success" looks like for each example
- Need to ensure AgentResponse migration didn't break examples
- Need to verify dist/ compilation produces working code

---

## Why

**Business Value and User Impact**:
- **End-to-end validation**: Confirms the entire system works after AgentResponse migration
- **Documentation verification**: Examples serve as live documentation; they must work
- **Build confidence**: Successful example execution proves readiness for deployment
- **User onboarding**: Working examples are critical for new users

**Integration with Existing Features**:
- **Depends on**: P1.M4.T2.S1 (TypeScript compilation) - provides compiled dist/ that examples import from
- **Validates**:
  - P1.M1.T1 (Agent.prompt() returns AgentResponse<T>) - examples should work with new return type
  - P1.M1.T2 (All call sites handle AgentResponse) - examples demonstrate correct handling
  - P1.M1.T3 (AgentResponse types exported) - examples can import and use types
  - P1.M2.T1 (Zod schema validation) - examples that use agents benefit from validation
  - Build system produces working distribution

**Testing**: Manual execution verification with console output inspection

**Problems This Solves**:
- Catches any runtime issues not detected by TypeScript compiler
- Verifies dist/ compilation is complete and correct
- Confirms examples demonstrate proper AgentResponse patterns
- Provides final validation before release

---

## What

**User-Visible Behavior**:
- Developers run `npm run start:*` commands for each example
- Each script executes and produces console output
- Output shows workflow execution, tree visualizations, and results
- Scripts exit cleanly (though exit code issue exists, no crashes occur)

**Technical Requirements**:
- Run all 11 example scripts via their npm scripts
- Verify each script executes without uncaught exceptions
- Check console output for expected patterns
- Verify AgentResponse handling where applicable

### Success Criteria

- [ ] `npm run start:basic` executes successfully with expected output
- [ ] `npm run start:decorators` executes successfully with expected output
- [ ] `npm run start:parent-child` executes successfully with expected output
- [ ] `npm run start:observers` executes successfully with expected output
- [ ] `npm run start:errors` executes successfully (intentional errors are OK)
- [ ] `npm run start:concurrent` executes successfully with expected output
- [ ] `npm run start:agent-loops` executes successfully with expected output
- [ ] `npm run start:sdk-features` executes successfully with expected output
- [ ] `npm run start:reflection` executes successfully with expected output
- [ ] `npm run start:introspection` executes successfully with expected output
- [ ] `npm run start:reparenting` executes successfully with expected output
- [ ] `npm run start:all` executes all examples sequentially
- [ ] All scripts produce their documented output (trees, logs, statistics)
- [ ] No uncaught exceptions or runtime crashes

---

## All Needed Context

### Context Completeness Check

**Passes "No Prior Knowledge" test**: The PRP includes exact npm scripts to run, expected output patterns for each example, verification commands, and references to example files. An implementer unfamiliar with the codebase can run and verify examples using only this PRP and codebase access.

### Documentation & References

```yaml
# MUST READ - Include these in your context window

# Previous Work Item Output (CONTRACT)
- file: plan/002_6761e4b84fd1/P1M4T2S1/PRP.md
  why: Defines TypeScript compilation output - assumes clean build with populated dist/
  critical: Examples import from dist/ via 'groundswell' package; must have successful build first

# Example Scripts Package Configuration
- file: package.json
  why: Contains all npm scripts for running examples
  section: lines 37-48 (start:* scripts)
  critical: Uses tsx to execute TypeScript files directly; 'groundswell' imports from dist/

# Example Files Overview
- file: examples/README.md
  why: Complete documentation of all 11 examples with descriptions and expected behavior
  section: All sections - Example overview, project structure, usage patterns
  critical: Lines 32-152 describe each example's purpose and features

# Example Files List (11 files)
- file: examples/examples/01-basic-workflow.ts
  why: Basic workflow demonstration - no Agent.prompt() usage
  pattern: Simple Workflow class with run(), setStatus(), logger usage
  expected: "Workflow completed successfully", tree visualization, statistics

- file: examples/examples/02-decorator-options.ts
  why: Demonstrates all @Step, @Task, @ObservedState options
  pattern: Decorated methods with configuration options
  expected: Step timing output, state snapshots

- file: examples/examples/03-parent-child.ts
  why: Hierarchical workflow structures with @Task decorator
  pattern: Parent workflow spawning child workflows
  expected: Multi-level tree visualization

- file: examples/examples/04-observers-debugger.ts
  why: Real-time monitoring with WorkflowObserver
  pattern: Custom observers, event subscriptions
  expected: Real-time event logs, metrics

- file: examples/examples/05-error-handling.ts
  why: Error management patterns with WorkflowError
  pattern: Try/catch blocks, retry logic
  expected: Error messages, state snapshots, retry attempts (intentional errors OK)

- file: examples/examples/06-concurrent-tasks.ts
  why: Parallel execution with @Task({ concurrent: true })
  pattern: Concurrent vs sequential execution comparison
  expected: Timing comparison output

- file: examples/examples/07-agent-loops.ts
  why: Agent processing in loops with observability
  pattern: Loops with simulated agent responses (not actual Agent.prompt())
  expected: Classification results, timing, cache metrics
  gotcha: Uses simulated responses, not real Agent.prompt() calls

- file: examples/examples/08-sdk-features.ts
  why: SDK features integration (tools, MCPs, hooks, skills)
  pattern: Custom tool definitions, handlers
  expected: Tool invocation results

- file: examples/examples/09-reflection.ts
  why: Multi-level reflection (workflow, agent, prompt)
  pattern: Reflection at different levels
  expected: Reflection events, error recovery

- file: examples/examples/10-introspection.ts
  why: Agent introspection tools demonstration
  pattern: Lines 554-562 show correct AgentResponse usage pattern
  expected: Tool results, hierarchy information
  critical: Contains proper AgentResponse status checking example

- file: examples/examples/11-reparenting-workflows.ts
  why: Workflow reparenting with detach-then-attach pattern
  pattern: detachChild() then attachChild() sequence
  expected: Tree structure before/after reparenting

# Main Example Runner
- file: examples/index.ts
  why: Runs all examples sequentially via start:all script
  pattern: Array of example functions with try/catch error handling
  section: lines 78-113 (runAllExamples function)
  critical: Demonstrates sequential execution pattern

# Research Files (created for this PRP)
- docfile: plan/002_6761e4b84fd1/P1M4T3S1/research/example-scripts-research.md
  why: Complete inventory of all 11 examples with AgentResponse usage analysis
  section: All sections - overview, inventory, exit code issue, npm scripts

- docfile: plan/002_6761e4b84fd1/P1M4T3S1/research/npm-script-verification-research.md
  why: Best practices for npm script testing and verification
  section: All sections - exit code validation, tsx usage, console output patterns

# AgentResponse Type Reference (for verification)
- file: src/types/agent.ts
  why: AgentResponse<T> type definition for verifying proper usage in examples
  section: Lines 97-194 (AgentResponse interface), Lines 400-500 (type guards)
  critical: status field is discriminant; data/error require status check

# tsx Documentation
- url: https://tsx.is
  why: TypeScript execution tool used by all example scripts
  critical: tsx runs .ts files directly, handles ESM, respects tsconfig.json

# Vitest Testing Framework (for alternative verification approach)
- url: https://vitest.dev
  why: If creating automated tests for examples, use Vitest patterns
  section: Console mocking with vi.spyOn(console, 'error')
```

### Current Codebase Tree (example scripts)

```bash
/home/dustin/projects/groundswell
├── package.json                 # Contains start:* npm scripts (lines 37-48)
├── tsconfig.json                # TypeScript configuration
├── dist/                        # COMPILED OUTPUT (from P1.M4.T2.S1)
│   ├── index.js                 # Main entry point (examples import from here)
│   ├── index.d.ts               # Type declarations
│   ├── core/                    # Compiled core modules
│   ├── types/                   # Compiled type definitions
│   └── ...                      # Other compiled directories
├── src/
│   ├── types/agent.ts           # AgentResponse<T> definitions
│   └── __tests__/               # Test patterns for reference
└── examples/
    ├── README.md                # Examples documentation
    ├── index.ts                 # Main runner (start:all)
    ├── utils/
    │   └── helpers.ts           # Helper functions (printHeader, etc.)
    └── examples/
        ├── 01-basic-workflow.ts
        ├── 02-decorator-options.ts
        ├── 03-parent-child.ts
        ├── 04-observers-debugger.ts
        ├── 05-error-handling.ts
        ├── 06-concurrent-tasks.ts
        ├── 07-agent-loops.ts
        ├── 08-sdk-features.ts
        ├── 09-reflection.ts
        ├── 10-introspection.ts
        └── 11-reparenting-workflows.ts
```

### Desired Codebase Tree (no changes - verification only)

```bash
# No code changes expected for this task
# Verification only - ensure existing examples work correctly
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: Build Dependency
// - Examples MUST have successful build from P1.M4.T2.S1 first
// - Examples import from 'groundswell' which resolves to dist/index.js
// - If dist/ is missing or incomplete, examples will fail to run
// - PRE-REQUISITE: Run 'npm run build' before running examples

// CRITICAL: Exit Code Issue (Known, Out of Scope)
// - All examples have: .catch(console.error) which exits with code 0 even on error
// - This is a KNOWN ISSUE but OUT OF SCOPE for this task
// - Do NOT modify example files to fix exit codes
// - Verification should focus on: no crashes, expected console output

// CRITICAL: tsx Execution
// - All npm scripts use 'tsx' to run TypeScript files directly
// - tsx handles ESM imports (matches "type": "module" in package.json)
// - tsx respects tsconfig.json configuration
// - No need to pre-compile examples

// CRITICAL: Import Path Resolution
// - Examples import from 'groundswell' (package name)
// - 'groundswell' resolves to dist/ via package.json exports field
// - exports: ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }

// CRITICAL: AgentResponse Usage in Examples
// - Most examples do NOT use Agent.prompt() directly
// - Example 07 (agent-loops) uses SIMULATED responses, not actual Agent.prompt()
// - Example 10 (introspection) shows correct AgentResponse pattern in comments (lines 554-562)
// - When verifying, focus on examples that actually use AgentResponse patterns

// CRITICAL: Expected Output Patterns
// - Success: "Workflow completed successfully" or similar
// - Tree visualization: ASCII trees with symbols (○ ◐ ✓ ✗ ⊘)
// - Statistics: JSON output with timing, node counts
// - Errors: Intentional errors in example 05 are OK

// CRITICAL: Console Output Validation
// - Look for status messages (idle -> running -> completed)
// - Tree visualizations show workflow structure
// - Statistics show execution metrics
// - No uncaught exceptions or crash stack traces

// CRITICAL: Example-Specific Notes
// - Example 05 (error-handling): Intentional errors are expected
// - Example 07 (agent-loops): Uses simulated responses, not real API calls
// - Example 10 (introspection): Shows AgentResponse pattern in code comments
// - Example 11 (reparenting): Shows tree structure changes

// CRITICAL: Runtime vs Compile-time
// - TypeScript compiler catches type errors (P1.M4.T2.S1)
// - This task catches RUNTIME errors only
// - Examples may compile successfully but fail at runtime
// - Common runtime issues: missing dist/ files, incorrect imports

// CRITICAL: Sequential vs Parallel Execution
// - start:all runs examples sequentially (examples/index.ts)
// - Individual scripts run one example at a time
// - No parallel execution conflicts expected
```

---

## Implementation Blueprint

### Data Models and Structure

This task verifies existing code through execution. No new data models.

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY build dependency exists
  - CHECK: dist/ directory exists and is populated
  - VERIFY: dist/index.js exists (main entry point)
  - VERIFY: dist/types/agent.js exists (AgentResponse types)
  - RUN: ls -la dist/ to confirm build output
  - IF MISSING: Run 'npm run build' first (from P1.M4.T2.S1)
  - LOCATION: /home/dustin/projects/groundswell
  - CRITICAL: Examples import from 'groundswell' which requires dist/

Task 2: RUN basic workflow example
  - EXECUTE: npm run start:basic
  - VERIFY: Script executes without crashes
  - CHECK: Console output contains "Workflow completed successfully"
  - CHECK: Tree visualization is present (ASCII symbols)
  - CHECK: Statistics output appears
  - EXPECTED_DURATION: < 5 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions, expected output present

Task 3: RUN decorator options example
  - EXECUTE: npm run start:decorators
  - VERIFY: Script executes without crashes
  - CHECK: Console output shows decorator configuration
  - CHECK: Step timing information appears
  - EXPECTED_DURATION: < 5 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 4: RUN parent-child workflow example
  - EXECUTE: npm run start:parent-child
  - VERIFY: Script executes without crashes
  - CHECK: Multi-level tree visualization appears
  - CHECK: Parent-child relationships visible in output
  - EXPECTED_DURATION: < 5 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 5: RUN observers and debugger example
  - EXECUTE: npm run start:observers
  - VERIFY: Script executes without crashes
  - CHECK: Real-time event logging appears
  - CHECK: Observer output shows metrics
  - EXPECTED_DURATION: < 5 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 6: RUN error handling example
  - EXECUTE: npm run start:errors
  - VERIFY: Script executes without crashes
  - CHECK: Intentional error messages appear
  - CHECK: Error recovery patterns demonstrated
  - NOTE: Errors are EXPECTED and part of the demonstration
  - EXPECTED_DURATION: < 10 seconds (retry delays)
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions (intentional errors OK)

Task 7: RUN concurrent tasks example
  - EXECUTE: npm run start:concurrent
  - VERIFY: Script executes without crashes
  - CHECK: Sequential vs concurrent timing comparison appears
  - CHECK: Fan-out/fan-in patterns demonstrated
  - EXPECTED_DURATION: < 10 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 8: RUN agent loops example
  - EXECUTE: npm run start:agent-loops
  - VERIFY: Script executes without crashes
  - CHECK: Classification results appear
  - CHECK: Timing information appears
  - CHECK: Cache metrics appear
  - NOTE: Uses SIMULATED responses, not actual Agent.prompt()
  - EXPECTED_DURATION: < 10 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 9: RUN SDK features example
  - EXECUTE: npm run start:sdk-features
  - VERIFY: Script executes without crashes
  - CHECK: Tool invocation results appear
  - CHECK: MCP/hook/skills integration demonstrated
  - EXPECTED_DURATION: < 5 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 10: RUN reflection example
  - EXECUTE: npm run start:reflection
  - VERIFY: Script executes without crashes
  - CHECK: Reflection events appear
  - CHECK: Error recovery patterns demonstrated
  - EXPECTED_DURATION: < 10 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 11: RUN introspection example
  - EXECUTE: npm run start:introspection
  - VERIFY: Script executes without crashes
  - CHECK: Introspection tool results appear
  - CHECK: AgentResponse usage pattern visible (lines 554-562)
  - CHECK: All 6 introspection tools demonstrated
  - EXPECTED_DURATION: < 10 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 12: RUN reparenting workflow example
  - EXECUTE: npm run start:reparenting
  - VERIFY: Script executes without crashes
  - CHECK: Tree structure before/after reparenting appears
  - CHECK: Detach-then-attach pattern demonstrated
  - EXPECTED_DURATION: < 5 seconds
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: No uncaught exceptions

Task 13: RUN all examples sequentially
  - EXECUTE: npm run start:all
  - VERIFY: All 11 examples run sequentially
  - CHECK: Each example completes before next starts
  - CHECK: No crashes across any example
  - EXPECTED_DURATION: < 60 seconds total
  - LOCATION: /home/dustin/projects/groundswell
  - SUCCESS: All examples complete, summary appears

Task 14: VERIFY AgentResponse usage patterns
  - REVIEW: Example 10 (introspection) lines 554-562
  - VERIFY: Correct status checking pattern is shown
  - PATTERN: if (response.status === 'success') { const data = response.data; }
  - PATTERN: if (response.status === 'error') { throw new Error(response.error.message); }
  - CONFIRM: Examples demonstrate proper AgentResponse handling
  - LOCATION: examples/examples/10-introspection.ts

Task 15: DOCUMENT verification results
  - RECORD: Each script execution result
  - RECORD: Any unexpected output or errors
  - RECORD: Total execution time for all examples
  - STORE: Notes in research/ directory if issues found
  - CONFIRM: All success criteria met
```

### Implementation Patterns & Key Details

```typescript
// Pattern 1: Example Script Structure
// All examples follow this pattern:

export async function runExampleName(): Promise<void> {
  printHeader('Example N: Title');

  // Create workflow
  const workflow = new ExampleWorkflow('WorkflowName');
  const debugger_ = new WorkflowTreeDebugger(workflow);

  // Run workflow
  await workflow.run();

  // Display results
  console.log('Status:', workflow.status);
  console.log('Tree:\n' + debugger_.toTreeString());
  console.log('Statistics:', debugger_.getStats());
}

// Direct execution check
if (import.meta.url === `file://${process.argv[1]}`) {
  runExampleName().catch(console.error);
}
```

```typescript
// Pattern 2: AgentResponse Usage (from Example 10)
// CORRECT pattern for handling AgentResponse:

const response = await agent.prompt(explorePrompt);

// Check status before accessing data
if (response.status === 'error') {
  console.error(`[${response.error.code}] Analysis failed: ${response.error.message}`);
  throw new Error(response.error.message);
}

// Type narrowing: response.data is the schema type when status is 'success'
const analysis = response.data;
console.log('Position:', analysis.position);
console.log('Depth:', analysis.depth);
```

```typescript
// Pattern 3: Expected Console Output
// All examples produce similar output patterns:

// Success message
console.log('Workflow completed successfully');

// Tree visualization
console.log('Tree:\n' + debugger_.toTreeString());
// Output:
// ○ DataProcessor
//   ├─ loadData [52ms]
//   ├─ processData [153ms]
//   └─ saveResults [51ms]

// Statistics
console.log('Statistics:', debugger_.getStats());
// Output: { totalNodes: 4, completed: 3, failed: 0, ... }
```

```bash
# Pattern 4: Script Execution Commands
# Run individual examples
npm run start:basic
npm run start:decorators
npm run start:parent-child
npm run start:observers
npm run start:errors
npm run start:concurrent
npm run start:agent-loops
npm run start:sdk-features
npm run start:reflection
npm run start:introspection
npm run start:reparenting

# Run all examples sequentially
npm run start:all
```

### Integration Points

```yaml
DEPENDS_ON:
  - P1.M4.T2.S1: TypeScript compilation complete with dist/ populated
  - P1.M1.T1: Agent.prompt() returns AgentResponse<T>
  - P1.M1.T2: All call sites handle AgentResponse
  - P1.M1.T3: AgentResponse types exported from index.ts

VALIDATES:
  - dist/ compilation is complete and correct
  - Examples can import and use compiled 'groundswell' package
  - AgentResponse patterns work in real examples
  - No runtime errors in example execution
  - Build pipeline produces working distribution

OUTPUTS:
  - Verified execution of all 11 example scripts
  - Confirmation of expected console output
  - Documentation of AgentResponse usage patterns
  - Ready for release/deployment

NEXT_STEPS:
  - Release deployment (if all validation passes)
  - Optional Phase 2 enhancements (P2.M1, P2.M2)
```

---

## Validation Loop

### Level 1: Build Dependency Verification (Immediate Feedback)

```bash
# Verify dist/ exists from P1.M4.T2.S1
ls -la dist/

# Expected output:
# dist/
# ├── index.js
# ├── index.d.ts
# ├── core/
# ├── types/
# └── ...

# Check key files exist
test -f dist/index.js && echo "index.js exists"
test -f dist/types/agent.js && echo "agent types exist"

# If dist/ is missing, run build first
npm run build

# Expected: All files exist, build successful
```

### Level 2: Individual Script Execution (Component Validation)

```bash
# Run each example script individually
npm run start:basic
npm run start:decorators
npm run start:parent-child
npm run start:observers
npm run start:errors
npm run start:concurrent
npm run start:agent-loops
npm run start:sdk-features
npm run start:reflection
npm run start:introspection
npm run start:reparenting

# For each script, verify:
# 1. No crash/stack trace
# 2. Expected output appears
# 3. Script completes in reasonable time

# Expected: All scripts execute successfully
```

### Level 3: Sequential Execution (System Validation)

```bash
# Run all examples sequentially
npm run start:all

# Verify:
# 1. All 11 examples run in order
# 2. No crashes across any example
# 3. Summary appears at end
# 4. Total time < 60 seconds

# Expected output:
# ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
# ║                                                                                                   ║
# ║   G R O U N D S W E L L                                                                          ║
# ║                          Workflow Engine Examples & Feature Showcase                              ║
# ║                                                                                                   ║
# ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
#
# Running all examples sequentially...
#
# ######################################################################
# # Running: 1. Basic Workflow
# ######################################################################
# [... example output ...]
#
# ######################################################################
# # Running: 2. Decorator Options
# ######################################################################
# [... example output ...]
#
# [... all 11 examples ...]
#
# ═══════════════════════════════════════════════════════════════════════════════════════════════════
# All examples completed!
# ═══════════════════════════════════════════════════════════════════════════════════════════════════

# Expected: All examples complete, summary shown
```

### Level 4: AgentResponse Pattern Verification (Domain-Specific Validation)

```bash
# Check Example 10 for proper AgentResponse usage
grep -A 10 "response.status" examples/examples/10-introspection.ts

# Expected to see:
# if (response.status === 'error') {
#   console.error(`[${response.error.code}] Analysis failed: ${response.error.message}`);
#   throw new Error(response.error.message);
# }
#
# // Type narrowing: response.data is the schema type when status is 'success'
# const analysis = response.data;

# Verify pattern is correct
# 1. Status check before data access
# 2. Error handling for error status
# 3. Type-safe data access after status check

# Expected: Correct AgentResponse handling pattern demonstrated
```

---

## Final Validation Checklist

### Technical Validation

- [ ] dist/ directory exists and is populated
- [ ] dist/index.js exists (main entry point)
- [ ] All 11 individual example scripts execute successfully
- [ ] No uncaught exceptions or crash stack traces
- [ ] All scripts produce expected console output
- [ ] Tree visualizations appear with ASCII symbols
- [ ] Statistics output appears for completed workflows
- [ ] `npm run start:all` executes all examples sequentially

### AgentResponse Validation

- [ ] Example 10 demonstrates correct AgentResponse status checking
- [ ] Status checked before accessing response.data
- [ ] Error handling for response.status === 'error'
- [ ] Type-safe data access after status narrowing
- [ ] No direct data/error access without status check

### Output Validation

- [ ] Success messages appear ("Workflow completed successfully")
- [ ] Tree visualizations display correctly (ASCII symbols)
- [ ] Statistics show timing and node counts
- [ ] Logs show step execution
- [ ] Errors (intentional in Example 05) display correctly
- [ ] All examples complete in reasonable time (< 60s total)

### Documentation Validation

- [ ] Examples match their README.md descriptions
- [ ] Console output matches documented expectations
- [ ] AgentResponse patterns are visible and correct
- [ ] No deprecated or broken patterns demonstrated

---

## Anti-Patterns to Avoid

- ❌ Don't modify example files - this is a verification task only
- ❌ Don't "fix" the exit code issue - it's known and out of scope
- ❌ Don't skip individual script verification - run each one
- ❌ Don't ignore crashes or stack traces - investigate failures
- ❌ Don't verify AgentResponse in examples that don't use it - focus on Example 10
- ❌ Don't run examples without dist/ - build must exist first
- ❌ Don't expect real Agent.prompt() calls in Example 07 - it uses simulations
- ❌ Don't consider intentional errors (Example 05) as failures
- ❌ Don't skip the start:all sequential run - it verifies all examples together
- ❌ Don't forget to check console output - silent execution isn't success

---

## References

### Research Files (plan/002_6761e4b84fd1/P1M4T3S1/research/)

- `example-scripts-research.md` - Complete inventory of all 11 examples with AgentResponse usage analysis
- `npm-script-verification-research.md` - Best practices for npm script testing and verification

### External References

- tsx Documentation: https://tsx.is
- tsx GitHub: https://github.com/privatenumber/tsx
- npm Scripts: https://docs.npmjs.com/cli/v9/using-npm/scripts
- Node.js Exit Codes: https://nodejs.org/api/process.html#process_exit_codes
- Vitest Console Mocking: https://vitest.dev/api/vi#vi-spyon

### Source Files Referenced

- `package.json` - npm scripts for running examples (lines 37-48)
- `examples/README.md` - Complete examples documentation
- `examples/index.ts` - Main runner for all examples
- `examples/examples/*.ts` - All 11 example files
- `src/types/agent.ts` - AgentResponse<T> type definitions

### PRD References

- PRD Section 6: Agent Response Model
- PRD Section 6.4: Response Requirements (null over undefined)
- PRD Section 6.4.4: "Use null for absent values; undefined is not valid JSON"

---

**End of PRP**

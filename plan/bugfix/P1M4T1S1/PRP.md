name: "P1.M4.T1.S1: Add JSDoc Comments to Modified Methods"
description: |

---

## Goal

**Feature Goal**: Add comprehensive JSDoc documentation to the modified workflow tree manipulation methods (`attachChild()`, `detachChild()`, `isDescendantOf()`) in the Workflow class to enable IDE hover documentation, improve developer experience, and document the new tree integrity validation behavior.

**Deliverable**: Enhanced JSDoc comments for three methods in `src/core/workflow.ts`:
1. `attachChild()` - Add JSDoc for the two new error cases (has parent, circular reference)
2. `detachChild()` - Ensure JSDoc is comprehensive (verify existing is adequate)
3. `isDescendantOf()` - Ensure JSDoc is comprehensive (verify existing is adequate)

**Success Definition**:
- IDE hover documentation displays complete information for all three methods
- All `@throws` tags document the exact error conditions with descriptive messages
- JSDoc comments follow established codebase patterns (3-space indentation, consistent formatting)
- TypeScript compiler recognizes JSDoc annotations (no type errors)
- Developers understand the new validation behavior without reading implementation code

## User Persona

**Target User**: Developers using the Workflow library who need to understand the tree manipulation API through IDE hover documentation.

**Use Case**: A developer hovers over `attachChild()`, `detachChild()`, or `isDescendantOf()` in their IDE to understand:
- What the method does
- What parameters it accepts
- What errors it can throw
- How to use it correctly

**User Journey**:
1. Developer opens IDE and types `workflow.attachChild(`
2. IDE displays parameter tooltip with JSDoc description
3. Developer hovers over method name to see full documentation
4. Developer sees all error conditions documented with `@throws` tags
5. Developer clicks `@example` to see usage pattern

**Pain Points Addressed**:
- Without JSDoc, developers must read source code to understand new validation behavior
- Without `@throws` documentation, developers don't know what errors to catch
- Without `@example`, developers may misuse the reparenting workflow

## Why

- **Developer Experience**: IDE hover documentation is the primary way developers discover API behavior. Well-documented methods reduce the need to read source code.
- **Bug Prevention**: Clear `@throws` documentation helps developers handle errors properly and avoid common mistakes (like trying to attach a child with an existing parent).
- **Onboarding**: New developers can understand the tree integrity requirements through documentation rather than debugging.
- **TypeScript Integration**: JSDoc enables TypeScript to provide better autocomplete and type hints in IDEs.
- **Completes P1.M4**: This is subtask S1 of Task P1.M4.T1 (Update Documentation). Without proper documentation, the bug fixes are incomplete.

## What

Add comprehensive JSDoc comments to three modified methods in `src/core/workflow.ts`:

1. **`attachChild()` (lines 216-255)**: Enhance existing JSDoc to document:
   - The two new error cases (child has different parent, circular reference)
   - The validation order (duplicate check → parent check → circular reference check)
   - The dual-tree mutation behavior
   - The reparenting workflow pattern

2. **`detachChild()` (lines 279-308)**: Verify existing JSDoc is adequate:
   - Already has comprehensive documentation (added in P1.M2.T1.S3)
   - May need minor enhancements if patterns changed

3. **`isDescendantOf()` (lines 150-168)**: Verify existing JSDoc is adequate:
   - Already has documentation as private helper
   - May need `@private` tag if missing

### Success Criteria

- [ ] `attachChild()` JSDoc documents all three error cases with `@throws` tags
- [ ] `attachChild()` JSDoc includes reparenting workflow example
- [ ] `attachChild()` JSDoc explains the validation order
- [ ] `detachChild()` JSDoc is comprehensive (verify existing is adequate)
- [ ] `isDescendantOf()` JSDoc is comprehensive (verify existing is adequate)
- [ ] All JSDoc follows codebase patterns (3-space indentation, consistent formatting)
- [ ] IDE hover documentation displays correctly

---

## All Needed Context

### Context Completeness Check

_**"No Prior Knowledge" test passed**: This PRP contains complete file paths, exact line references, existing JSDoc patterns, documentation templates, and validation commands. An AI agent unfamiliar with this codebase can implement this documentation successfully using only this PRP._

### Documentation & References

```yaml
# MUST READ - Current JSDoc state of target methods
- file: src/core/workflow.ts
  why: Contains all three methods that need documentation
  pattern: Lines 150-168 (isDescendantOf), 216-255 (attachChild), 279-308 (detachChild)
  critical: attachChild() needs enhancement for new error cases; detachChild() and isDescendantOf() may already be documented

# MUST READ - JSDoc best practices research
- docfile: plan/bugfix/P1M4T1S1/research/jsdoc_best_practices.md
  why: Comprehensive guide on TypeScript JSDoc patterns, @throws documentation, tree mutation documentation
  section: "Documenting Error Throwing with @throws", "Documenting Tree/Node Manipulation Methods"
  critical: Shows exact patterns for documenting validation errors and dual-tree mutations

# MUST READ - Existing codebase JSDoc patterns
- file: src/core/workflow.ts
  why: Reference for established JSDoc style in this file
  pattern: Lines 14-43 (class JSDoc with @example), 73-82 (constructor @overload), 257-278 (detachChild JSDoc as template)
  gotcha: 3-space indentation in JSDoc blocks, @example uses triple backticks with ts language specifier

# MUST READ - attachChild() error cases from implementation
- file: src/core/workflow.ts
  why: Understanding the exact error conditions to document
  lines: 217-238 (validation logic with three error cases)
  pattern: Error messages include workflow names for debugging
  critical: Document all three @throws in order: duplicate → different parent → circular reference

# MUST READ - Bug analysis context
- file: plan/docs/bugfix-architecture/bug_analysis.md
  why: Explains WHY the new validation exists (PRD Section 12.2 compliance)
  section: "Current Implementation (Buggy)" vs "Fixed Implementation"
  critical: Documentation should explain the single-parent invariant and 1:1 tree mirror requirement

# REFERENCE - Similar methods for JSDoc patterns
- file: src/core/workflow.ts
  why: Additional JSDoc examples in same file for consistency
  lines: 141-149 (getRoot - private method with cycle detection), 193-199 (addObserver - public method with @throws)
  pattern: Private methods explain "why", public methods explain "what"

# REFERENCE - External JSDoc resources
- url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
  why: Official TypeScript JSDoc reference
  section: @param, @returns, @throws, @example, @private tags

- url: https://jsdoc.app/
  why: Official JSDoc tag reference
  section: Index of all JSDoc tags

# EXTERNAL - TypeScript documentation examples
- url: https://github.com/microsoft/TypeScript
  why: Reference for high-quality JSDoc in large TypeScript codebase
  section: compiler/src files for complex method documentation
```

### Current Codebase Tree

```bash
/home/dustin/projects/groundswell/
├── src/
│   ├── core/
│   │   └── workflow.ts           # TARGET FILE - Three methods need JSDoc enhancement
│   │       ├── isDescendantOf()  # Lines 150-168 (private helper, already has JSDoc)
│   │       ├── attachChild()     # Lines 216-255 (NEEDS ENHANCEMENT for new error cases)
│   │       └── detachChild()     # Lines 279-308 (already has comprehensive JSDoc)
│   └── types/
│       ├── events.ts             # Event type definitions for @throws documentation
│       └── workflow.ts           # WorkflowNode interface for type references
├── plan/
│   └── bugfix/
│       ├── P1M4T1S1/
│       │   ├── PRP.md           # THIS FILE
│       │   └── research/
│       │       └── jsdoc_best_practices.md  # Comprehensive JSDoc patterns guide
│       └── architecture/
│           └── implementation_patterns.md  # Method specification context
└── package.json
```

### Desired Codebase Tree with Files to be Modified

```bash
# MODIFY existing src/core/workflow.ts - enhance JSDoc for three methods

├── src/
│   └── core/
│       └── workflow.ts
#           ├── isDescendantOf() (lines 141-149) - Verify JSDoc is adequate, add @private if missing
#           ├── attachChild() (lines 213-255) - ENHANCE JSDoc: add @throws for parent check and circular ref
#           └── detachChild() (lines 257-308) - Verify JSDoc is adequate (already comprehensive)
```

### Known Gotchas of Our Codebase & Library Quirks

```typescript
// CRITICAL: JSDoc formatting style in this codebase
// - 3-space indentation within JSDoc blocks (not 2, not 4)
// - @param format: "@param name - Description" (dash separator, not colon)
// - @throws format: "@throws {Error} Description" (error type in braces)
// - @example format: "@example\n ```ts\n code here\n ```" (triple backticks with ts specifier)

// CRITICAL: Error message format for documentation
// Error messages include workflow names for debugging:
// `Child '${child.node.name}' already has a parent '${child.parent.node.name}'`
// `Cannot attach child '${child.node.name}' - it is an ancestor of '${this.node.name}'`
// Document these EXACT patterns in @throws so developers know what to catch

// CRITICAL: Validation order in attachChild()
// The checks happen in this specific order:
// 1. Duplicate check (child already in this.children)
// 2. Parent check (child.parent !== null && child.parent !== this)
// 3. Circular reference check (this.isDescendantOf(child))
// Document this order in JSDoc so developers know which error to handle first

// CRITICAL: Dual-tree mutation pattern
// Every tree operation updates BOTH:
//   - this.children (Workflow instances array)
//   - this.node.children (WorkflowNode objects array)
// Document this explicitly as it's a common gotcha

// CRITICAL: Private method visibility
// isDescendantOf() is private - should have @private tag
// Private methods document "why they exist" not just "what they do"

// CRITICAL: TypeScript JSDoc integration
// JSDoc comments enable IDE features:
// - Hover documentation (Ctrl+Space in VS Code)
// - Parameter tooltips (when typing function call)
// - Type inference (from @param types)
// - Error checking (from @throws documentation)

// GOTCHA: detachChild() and isDescendantOf() already have JSDoc
// These were documented in previous tasks (P1.M2.T1.S3 and P1.M1.T2.S2)
// Verify they're adequate, but focus effort on attachChild() enhancement

// PATTERN: @example for reparenting workflow
// Show the detach-then-attach pattern:
// oldParent.detachChild(child);
// newParent.attachChild(child);

// PATTERN: Constructor auto-attachment
// When creating child with parent: new Workflow('Child', parent)
// Constructor calls parent.attachChild(this) automatically
// Document this in attachChild() @example

// TESTING: How to verify JSDoc works
// 1. Open IDE (VS Code with TypeScript extension)
// 2. Hover over method name - should see documentation
// 3. Type method call - should see parameter tooltips
// 4. Check for TypeScript type errors: npx tsc --noEmit
```

---

## Implementation Blueprint

### Data Models and Structure

No new data models. The JSDoc comments document existing methods and types:

```typescript
// Types referenced in JSDoc:
- Workflow (class) - from src/core/workflow.ts
- WorkflowNode (interface) - from src/types/workflow.ts
- Error (built-in) - thrown for validation failures

// Event types for @throws documentation:
- childAttached event: { type: 'childAttached'; parentId: string; child: WorkflowNode }
- childDetached event: { type: 'childDetached'; parentId: string; childId: string }
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: VERIFY isDescendantOf() JSDoc is adequate
  - CHECK: Lines 141-149 in src/core/workflow.ts
  - VERIFY: Has @private tag (private methods should be marked)
  - VERIFY: Explains the "why" (cycle detection in parent chain traversal)
  - VERIFY: Has @param, @returns, @throws tags
  - ENHANCE: Add @private tag if missing, improve description if needed
  - PATTERN: Follow private method documentation from research/jsdoc_best_practices.md

Task 2: VERIFY detachChild() JSDoc is adequate
  - CHECK: Lines 257-278 in src/core/workflow.ts
  - VERIFY: Has @param, @throws, @example tags
  - VERIFY: Documents dual-tree mutation (workflow tree + node tree)
  - VERIFY: Shows reparenting workflow example
  - VERIFY: @throws documents "child not attached" error
  - ENHANCE: Minor improvements if needed (should already be comprehensive from P1.M2.T1.S3)

Task 3: ANALYZE attachChild() current JSDoc state
  - READ: Lines 213-215 in src/core/workflow.ts
  - IDENTIFY: Current JSDoc only says "Attach a child workflow" and "Called automatically in constructor"
  - IDENTIFY: Missing @throws tags for three error cases
  - IDENTIFY: Missing @param documentation
  - IDENTIFY: Missing @example for usage pattern
  - NOTE: This is the PRIMARY method needing enhancement

Task 4: DESIGN enhanced attachChild() JSDoc structure
  - PLAN: Multi-paragraph description explaining:
    - What the method does (attach child to parent)
    - Validation behavior (three checks in specific order)
    - Dual-tree mutation (workflow tree + node tree)
    - Event emission (childAttached event)
  - PLAN: @param tag for child parameter
  - PLAN: Three @throws tags (one per validation error)
  - PLAN: @example showing basic usage
  - PLAN: @example showing reparenting workflow

Task 5: IMPLEMENT enhanced attachChild() JSDoc
  - REPLACE: Lines 213-215 with comprehensive JSDoc
  - FOLLOW: 3-space indentation pattern from other methods
  - INCLUDE: @param child - The child workflow to attach
  - INCLUDE: @throws {Error} If child already attached to this workflow
  - INCLUDE: @throws {Error} If child has different parent (single-parent invariant)
  - INCLUDE: @throws {Error} If child is ancestor (circular reference invariant)
  - INCLUDE: @example showing basic usage
  - INCLUDE: @example showing reparenting workflow
  - STORE: plan/bugfix/P1M4T1S1/research/attachChild_jsdoc_template.md (optional reference)

Task 6: VERIFY TypeScript compilation with new JSDoc
  - RUN: npx tsc --noEmit
  - EXPECT: No type errors from JSDoc annotations
  - CHECK: JSDoc doesn't introduce syntax errors
  - CHECK: @param types match actual method signature

Task 7: VERIFY IDE hover documentation
  - OPEN: VS Code or similar IDE with TypeScript extension
  - HOVER: Over attachChild method name
  - VERIFY: See full documentation including @throws tags
  - HOVER: Over detachChild method name
  - VERIFY: See comprehensive documentation
  - HOVER: Over isDescendantOf method name
  - VERIFY: See private method documentation

Task 8: RUN test suite to ensure no regressions
  - RUN: npm test
  - EXPECT: All tests still pass (JSDoc is comments only)
  - VERIFY: No new warnings from TypeScript compiler
  - VERIFY: Documentation doesn't affect runtime behavior
```

### Implementation Patterns & Key Details

```typescript
// ============================================================
// COMPLETE JSDOC TEMPLATE FOR attachChild()
// Location: src/core/workflow.ts, lines 213-255 (replace existing)
// ============================================================

/**
 * Attach a child workflow to this parent workflow.
 *
 * Validates that the child can be attached by checking:
 * 1. Child is not already attached to this parent workflow
 * 2. Child does not have a different parent (enforces single-parent invariant)
 * 3. Child is not an ancestor of this parent (prevents circular references)
 *
 * **Structural Changes:**
 * - Adds child to this.children array (workflow tree)
 * - Adds child.node to this.node.children array (node tree)
 * - Sets child.parent = this (workflow tree)
 * - Sets child.node.parent = this.node (node tree)
 * - Emits childAttached event to notify observers
 *
 * **Invariants Maintained:**
 * - Single-parent rule: A workflow can only have one parent
 * - 1:1 tree mirror: workflow tree and node tree stay synchronized
 * - No cycles: A workflow cannot be its own ancestor
 *
 * **Cycle Detection:**
 * - Uses isDescendantOf() helper with Set-based cycle detection
 * - Throws immediately if circular reference would be created
 *
 * @param child - The child workflow to attach
 * @throws {Error} If the child is already attached to this workflow
 * @throws {Error} If the child already has a different parent (use detachChild() first for reparenting)
 * @throws {Error} If the child is an ancestor of this parent (would create circular reference)
 *
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child');
 * parent.attachChild(child);
 * // child.parent === parent
 * // parent.children.includes(child) === true
 * ```
 *
 * @example Reparenting workflow
 * ```ts
 * const parent1 = new Workflow('Parent1');
 * const parent2 = new Workflow('Parent2');
 * const child = new Workflow('Child', parent1); // Attached to parent1
 *
 * // Later, move child to parent2
 * parent1.detachChild(child);
 * parent2.attachChild(child);
 * // child.parent === parent2
 * ```
 *
 * @see detachChild - For detaching children (enables reparenting)
 * @see isDescendantOf - Private helper for circular reference detection
 */
public attachChild(child: Workflow): void {
  // Implementation (lines 217-255) remains unchanged
}

// ============================================================
// VERIFY DETACHCHILD() JSDoc (should already exist from P1.M2.T1.S3)
// Location: src/core/workflow.ts, lines 257-278
// ============================================================

/**
 * Detach a child workflow from this parent workflow.
 *
 * Removes the child from both the workflow tree (this.children) and
 * the node tree (this.node.children), clears the child's parent reference,
 * and emits a childDetached event to notify observers.
 *
 * This enables reparenting workflows: oldParent.detachChild(child); newParent.attachChild(child);
 *
 * @param child - The child workflow to detach
 * @throws {Error} If the child is not attached to this parent workflow
 *
 * @example
 * ```ts
 * const parent = new Workflow('Parent');
 * const child = new Workflow('Child', parent);
 *
 * // Later, reparent to a different parent
 * parent.detachChild(child);
 * newParent.attachChild(child);
 * ```
 */
// (Already exists - verify it's adequate)

// ============================================================
// VERIFY ISDESCENDANTOF() JSDoc (may already exist from P1.M1.T2.S2)
// Location: src/core/workflow.ts, lines 141-149
// ============================================================

/**
 * Check if this workflow is a descendant of the given ancestor workflow.
 *
 * Traverses the parent chain upward looking for the ancestor reference.
 * Uses visited Set to detect cycles during traversal.
 *
 * **Cycle Detection:**
 * - Maintains a Set of visited workflow references
 * - Throws immediately if a workflow is encountered twice
 * - Prevents infinite loops from corrupted parent chains
 *
 * @private
 * @param ancestor - The potential ancestor workflow to check
 * @returns true if ancestor is found in parent chain, false otherwise
 * @throws {Error} If a cycle is detected during traversal
 */
// (May already exist - verify @private tag is present)
```

### JSDoc Formatting Patterns

```typescript
// PATTERN 1: 3-space indentation (this codebase's standard)
/**
 * Description.
 *
 * @param name - Description
 * @returns Description
 */

// PATTERN 2: @throws with error type in braces
/**
 * @throws {Error} If validation fails
 * @throws {TypeError} If parameter is wrong type
 */

// PATTERN 3: @example with ts language specifier
/**
 * @example
 * ```ts
 * const result = method();
 * ```
 */

// PATTERN 4: Multi-paragraph description with blank lines
/**
 * First paragraph: what the method does.
 *
 * Second paragraph: additional details about behavior.
 *
 * Third paragraph: important notes or gotchas.
 */

// PATTERN 5: @see for related methods
/**
 * @see attachChild - For attaching children
 * @see detachChild - For detaching children
 */

// PATTERN 6: Private method with @private tag
/**
 * Private helper method description.
 *
 * @private
 * @param name - Description
 * @returns Description
 */

// PATTERN 7: Validation list in description
/**
 * Validates the following conditions:
 * - First condition
 * - Second condition
 * - Third condition
 */
```

### Integration Points

```yaml
MODIFY: src/core/workflow.ts
  - location: Lines 213-215 (attachChild JSDoc - ENHANCE)
  - location: Lines 141-149 (isDescendantOf JSDoc - VERIFY)
  - location: Lines 257-278 (detachChild JSDoc - VERIFY)
  - dependencies: No code changes, only JSDoc comments
  - imports: No new imports needed

NO CHANGES NEEDED:
  - src/types/events.ts (event types already documented)
  - src/types/workflow.ts (WorkflowNode already documented)
  - Test files (JSDoc is comments only, doesn't affect tests)

IDE INTEGRATION:
  - VS Code: TypeScript extension reads JSDoc for hover documentation
  - WebStorm/IntelliJ: Built-in TypeScript support for JSDoc
  - Language Server Protocol: Any LSP-compliant editor shows JSDoc
```

---

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Verify JSDoc syntax is correct
cd /home/dustin/projects/groundswell

# TypeScript compilation (JSDoc errors will show here)
npx tsc --noEmit

# Expected: Zero errors
# If errors exist, check:
#   - JSDoc blocks are properly closed with */
#   - @param names match actual parameter names
#   - @throws format is correct: @throws {Error} Description
#   - No syntax errors in JSDoc (unescaped asterisks, etc.)

# Linting (if ESLint configured for JSDoc)
npm run lint 2>/dev/null || echo "No JSDoc linting configured"

# Format checking (JSDoc should be formatted consistently)
npm run format:check 2>/dev/null || echo "No format checking configured"
```

### Level 2: JSDoc Validation (Documentation Quality)

```bash
# Use JSDoc validation tool (if available)
npx jsdoc -c .jsdocrc.json src/core/workflow.ts 2>/dev/null || echo "JSDoc tool not configured"

# Manual validation: Check JSDoc structure
echo "Checking JSDoc completeness..."

# Check attachChild() has all required tags
grep -A 30 "public attachChild" src/core/workflow.ts | grep -E "@param|@throws|@example" || echo "Missing tags in attachChild()"

# Check for 3-space indentation pattern
grep -A 5 "  \* @" src/core/workflow.ts | head -20

# Expected output should show consistent indentation
# If not, fix JSDoc formatting to match codebase patterns
```

### Level 3: IDE Hover Documentation (User Experience)

```bash
# Test IDE documentation display
# This requires manual verification in an IDE

echo "Manual IDE verification required:"
echo "1. Open src/core/workflow.ts in VS Code"
echo "2. Hover over 'attachChild' method name"
echo "3. Verify documentation displays with all @throws tags"
echo "4. Type 'parent.attachChild(' and verify parameter tooltip"
echo "5. Repeat for detachChild() and isDescendantOf()"

# Alternative: Use TypeScript compiler API to extract JSDoc
cat > /tmp/verify-jsdoc.ts << 'EOF'
import fs from 'fs';

const content = fs.readFileSync('src/core/workflow.ts', 'utf-8');

// Check for JSDoc patterns
const hasAttachChildJSDoc = content.includes('/**') &&
  content.includes('@param child') &&
  content.includes('@throws') &&
  content.includes('@example');

console.log('attachChild() JSDoc present:', hasAttachChildJSDoc);
console.log('Has @param:', content.includes('@param child'));
console.log('Has @throws:', content.match(/@throws/g)?.length || 0, 'tags');
console.log('Has @example:', content.includes('@example'));

process.exit(hasAttachChildJSDoc ? 0 : 1);
EOF

npx tsx /tmp/verify-jsdoc.ts

# Expected: attachChild() JSDoc present: true
```

### Level 4: Documentation Completeness (Comprehensive Check)

```bash
# Verify all three methods have comprehensive JSDoc
cd /home/dustin/projects/groundswell

cat > /tmp/check-jsdoc-completeness.ts << 'EOF'
import fs from 'fs';

const content = fs.readFileSync('src/core/workflow.ts', 'utf-8');

// Extract method sections
const attachChildMatch = content.match(/\/\*\*[\s\S]*?\*\/\s*public attachChild/);
const detachChildMatch = content.match(/\/\*\*[\s\S]*?\*\/\s*public detachChild/);
const isDescendantOfMatch = content.match(/\/\*\*[\s\S]*?\*\/\s*private isDescendantOf/);

function checkJSDoc(methodName: string, match: RegExpMatchArray | null) {
  if (!match) {
    console.log(`❌ ${methodName}: No JSDoc found`);
    return false;
  }

  const jsdoc = match[0];
  const issues: string[] = [];

  // Check for required tags
  if (!jsdoc.includes('@param')) issues.push('Missing @param');
  if (!jsdoc.includes('@throws')) issues.push('Missing @throws');

  // Check for example
  if (!jsdoc.includes('@example')) issues.push('Missing @example');

  // Check formatting (3-space indentation)
  if (jsdoc.includes('   * @')) {
    // Good - has 3-space indentation
  } else if (jsdoc.includes('  * @')) {
    issues.push('Wrong indentation (2-space, should be 3-space)');
  }

  // Private method check
  if (methodName === 'isDescendantOf' && !jsdoc.includes('@private')) {
    issues.push('Missing @private tag');
  }

  if (issues.length > 0) {
    console.log(`⚠️  ${methodName}: ${issues.join(', ')}`);
    return false;
  }

  console.log(`✅ ${methodName}: Complete JSDoc`);
  return true;
}

console.log('JSDoc Completeness Check:');
console.log('========================');
const results = [
  checkJSDoc('attachChild', attachChildMatch),
  checkJSDoc('detachChild', detachChildMatch),
  checkJSDoc('isDescendantOf', isDescendantOfMatch),
];

if (results.every(r => r)) {
  console.log('\n✅ All methods have complete JSDoc');
  process.exit(0);
} else {
  console.log('\n❌ Some methods need JSDoc improvements');
  process.exit(1);
}
EOF

npx tsx /tmp/check-jsdoc-completeness.ts

# Expected: All methods have complete JSDoc
```

### Level 5: Tree Integrity Documentation (Domain-Specific)

```bash
# Verify JSDoc documents the new tree integrity requirements
cd /home/dustin/projects/groundswell

cat > /tmp/verify-tree-integrity-docs.ts << 'EOF'
import fs from 'fs';

const content = fs.readFileSync('src/core/workflow.ts', 'utf-8');

// Extract attachChild JSDoc
const attachChildMatch = content.match(/\/\*\*[\s\S]*?\*\/\s*public attachChild/);

if (!attachChildMatch) {
  console.log('❌ attachChild JSDoc not found');
  process.exit(1);
}

const jsdoc = attachChildMatch[0];
const checks: { name: string; pattern: RegExp }[] = [
  { name: 'Single-parent invariant', pattern: /single.?parent/i },
  { name: 'Circular reference prevention', pattern: /circular/i },
  { name: 'Dual-tree mutation', pattern: /node\.children|workflow.*tree/i },
  { name: 'Reparenting workflow', pattern: /reparent|detach.*attach/i },
  { name: 'Error documentation', pattern: /@throws.*Error/i },
];

console.log('Tree Integrity Documentation Check:');
console.log('===================================');

const results = checks.map(check => {
  const found = check.pattern.test(jsdoc);
  console.log(`${found ? '✅' : '❌'} ${check.name}`);
  return found;
});

if (results.every(r => r)) {
  console.log('\n✅ All tree integrity concepts documented');
  process.exit(0);
} else {
  console.log('\n❌ Some tree integrity concepts missing from JSDoc');
  process.exit(1);
}
EOF

npx tsx /tmp/verify-tree-integrity-docs.ts

# Expected: All tree integrity concepts documented
```

---

## Final Validation Checklist

### Technical Validation

- [ ] **All 5 validation levels completed successfully**
- [ ] **TypeScript compilation passes**: `npx tsc --noEmit` shows zero errors
- [ ] **attachChild() JSDoc enhanced**: Lines 213-215 replaced with comprehensive JSDoc
- [ ] **detachChild() JSDoc verified**: Existing JSDoc is adequate
- [ ] **isDescendantOf() JSDoc verified**: Has @private tag, is adequate
- [ ] **3-space indentation**: All JSDoc blocks follow codebase formatting
- [ ] **No syntax errors**: JSDoc blocks are properly closed and formatted

### Documentation Quality

- [ ] **@param tags present**: All methods document parameters
- [ ] **@throws tags complete**: attachChild() has all three error cases documented
- [ ] **@example tags present**: attachChild() shows basic usage and reparenting workflow
- [ ] **@private tag present**: isDescendantOf() marked as private
- [ ] **@see tags present**: attachChild() references detachChild() and isDescendantOf()
- [ ] **Descriptions are clear**: Non-technical language, explains "why" not just "what"

### IDE Integration

- [ ] **Hover documentation works**: IDE shows full JSDoc on hover
- [ ] **Parameter tooltips work**: IDE shows @param descriptions when typing
- [ ] **Type inference works**: TypeScript uses JSDoc for type checking
- [ ] **No JSDoc warnings**: IDE doesn't show JSDoc syntax warnings

### Tree Integrity Documentation

- [ ] **Single-parent invariant documented**: JSDoc explains one-parent rule
- [ ] **Circular reference documented**: JSDoc explains cycle detection
- [ ] **Dual-tree mutation documented**: JSDoc mentions workflow tree and node tree
- [ ] **Reparenting workflow documented**: JSDoc shows detach-then-attach pattern
- [ ] **Error messages documented**: @throws tags show exact error conditions

### Code Quality

- [ ] **Follows existing patterns**: Matches JSDoc style of other methods in file
- [ ] **No redundant information**: JSDoc adds value beyond obvious code
- [ ] **Consistent formatting**: 3-space indentation, dash separators in @param
- [ ] **Professional tone**: Clear, concise, developer-focused language

---

## Anti-Patterns to Avoid

- ❌ **Don't use 2-space or 4-space indentation** - This codebase uses 3-space
- ❌ **Don't forget @throws tags** - Every error condition must be documented
- ❌ **Don't use vague descriptions** - "If invalid" → "If child has different parent"
- ❌ **Don't omit @example** - Developers need usage patterns, not just descriptions
- ❌ **Don't document the obvious** - Focus on non-obvious behavior (validation, side effects)
- ❌ **Don't use colon in @param** - Use dash: "@param name - Description" not "@param name: Description"
- ❌ **Don't skip error types in @throws** - Always specify: "@throws {Error}" not just "@throws"
- ❌ **Don't forget @private** - Private methods must be marked to exclude from API docs
- ❌ **Don't document implementation details** - Focus on contract, not implementation
- ❌ **Don't create overly long descriptions** - Keep it concise, use @example for clarity

---

## Success Metrics

**Confidence Score**: 10/10 for one-pass implementation success

**Rationale**:
1. ✅ Clear scope: Only JSDoc comments, no code changes
2. ✅ Existing patterns: detachChild() and isDescendantOf() already have good JSDoc to follow
3. ✅ Comprehensive research: jsdoc_best_practices.md provides complete patterns
4. ✅ Specific line numbers: Exact locations for all modifications
5. ✅ Validation commands: Multiple levels of verification
6. ✅ Template provided: Complete JSDoc template for attachChild()
7. ✅ Anti-patterns documented: Common mistakes are explicitly listed

**Expected Outcome**: An AI agent implementing this PRP should:
- Enhance attachChild() JSDoc with ~30 lines of documentation
- Verify detachChild() and isDescendantOf() JSDoc are adequate
- Complete the task in one pass with comprehensive documentation
- Enable IDE hover documentation for all three methods

**Developer Impact**: After this PRP is implemented, developers using the Workflow library will:
- See complete documentation when hovering over tree manipulation methods
- Understand all error conditions before calling methods
- Learn the reparenting workflow pattern from @example tags
- Understand the single-parent invariant and circular reference prevention

---

## Appendix: JSDoc Template Reference

### Complete attachChild() JSDoc Template

```typescript
/**
 * [One-sentence summary of what the method does].
 *
 * [Optional paragraph explaining behavior in more detail].
 * [Include information about validation, side effects, or important details].
 *
 * **Structural Changes:**
 * - [Workflow tree mutation description]
 * - [Node tree mutation description]
 * - [Event emission or other side effects]
 *
 * **Invariants:**
 * - [Invariant 1 maintained]
 * - [Invariant 2 maintained]
 *
 * **Validation Behavior:**
 * - [Validation rule 1]
 * - [Validation rule 2]
 * - [Validation rule 3]
 *
 * @param [paramName] - [Description]
 * @throws {Error} [When this error is thrown - be specific]
 * @throws {Error} [When this error is thrown - be specific]
 * @throws {Error} [When this error is thrown - be specific]
 *
 * @example
 * ```ts
 * // [Basic usage example]
 * const [result] = [methodName]([args]);
 * ```
 *
 * @example [Alternative scenario]
 * ```ts
 * // [Reparenting workflow example]
 * [methodName1]([args]);
 * [methodName2]([args]);
 * ```
 *
 * @see [relatedMethod] - [Relationship description]
 * @see [relatedMethod] - [Relationship description]
 */
```

### JSDoc Tag Quick Reference

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param {Type} name - desc` | Parameter documentation | `@param child - The child workflow` |
| `@returns {Type} desc` | Return value | `@returns {Workflow[]} All nodes` |
| `@throws {ErrorType} desc` | Exception documentation | `@throws {Error} If circular ref detected` |
| `@example` | Usage example | `@example\n \`\`\`ts\n code\n \`\`\`` |
| `@private` | Internal method | `@private` (before description) |
| `@see` | Related items | `@see attachChild - For attaching` |
| `@template T` | Generic types | `@template T - Node value type` |

---

**PRP Version**: 1.0
**Created**: 2026-01-12
**For**: Subtask P1.M4.T1.S1 - Add JSDoc Comments to Modified Methods
**PRD Reference**: Bug Fix Plan P1 - attachChild() Tree Integrity Violation

/**
 * Circular Reference Tests (TDD Red Phase)
 *
 * These tests validate the attachChild() method properly prevents
 * attaching an ancestor workflow as a child (which would create a circular reference).
 *
 * This is the RED phase of TDD - tests are written to FAIL initially,
 * documenting the expected behavior before implementation.
 *
 * Related: plan/docs/bugfix-architecture/bug_analysis.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workflow } from '../../index.js';

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/unit/workflow.test.ts:4-11
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Adversarial: Circular Reference Detection', () => {
  /**
   * Setup: Mock console methods to capture error messages
   * Pattern from: research/console-mocking.md "Basic Spying Patterns"
   */
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  /**
   * Teardown: Restore all mocks to prevent test pollution
   * CRITICAL: Always use vi.restoreAllMocks() in afterEach
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test 1: Immediate Circular Reference
   *
   * Bug: attachChild() does NOT check if the child being attached is actually
   * an ancestor of this workflow (would create a circular reference)
   *
   * Expected: Error thrown with message containing 'circular' OR 'cycle' OR 'ancestor'
   * Actual: No error thrown, circular reference created
   *
   * Pattern from: plan/docs/bugfix-architecture/implementation_patterns.md "Pattern 2"
   */
  it('should throw when attaching immediate parent as child', () => {
    // ARRANGE: Create parent and child workflows
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Verify initial state
    // CRITICAL: Constructor auto-attaches child to parent at workflow.ts:113-116
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);

    // ACT & ASSERT: Attempting to attach parent as child should throw
    // This test FAILS because attachChild() doesn't call this.isDescendantOf(child)
    expect(() => child.attachChild(parent)).toThrow(/circular|cycle|ancestor/i);
  });

  /**
   * Test 2: Ancestor Circular Reference (Multi-level)
   *
   * Bug: attachChild() does NOT check if the child being attached is an ancestor
   * anywhere up the parent chain (would create a circular reference)
   *
   * Expected: Error thrown with message containing 'circular' OR 'cycle' OR 'ancestor'
   * Actual: No error thrown, circular reference created
   *
   * Pattern from: plan/docs/bugfix-architecture/implementation_patterns.md "Pattern 2"
   */
  it('should throw when attaching ancestor as child', () => {
    // ARRANGE: Create 3-level hierarchy
    const root = new SimpleWorkflow('Root');
    const child1 = new SimpleWorkflow('Child1', root);
    const child2 = new SimpleWorkflow('Child2', child1);

    // Verify initial state
    // CRITICAL: Constructor auto-attaches at workflow.ts:113-116
    expect(child2.parent).toBe(child1);
    expect(child1.parent).toBe(root);
    expect(root.children).toContain(child1);
    expect(child1.children).toContain(child2);

    // ACT & ASSERT: Attempting to attach root as child of child2 should throw
    // This test FAILS because attachChild() doesn't call this.isDescendantOf(child)
    expect(() => child2.attachChild(root)).toThrow(/circular|cycle|ancestor/i);
  });
});

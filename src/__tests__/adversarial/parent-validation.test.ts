/**
 * Parent Validation Tests (TDD Red Phase)
 *
 * These tests validate the attachChild() method properly prevents
 * attaching a child workflow that already has a different parent.
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

describe('Adversarial: Parent Validation', () => {
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
   * Primary failing test for parent validation bug
   *
   * Bug: attachChild() only checks if child is already attached to THIS workflow
   * It does NOT check if child already has a different parent
   *
   * Expected: Error thrown with message containing 'already has a parent'
   * Actual: No error thrown, inconsistent tree state created
   *
   * Pattern from: research/error-assertions.md "Partial Message Matching"
   */
  it('should throw when attaching child that already has a different parent', () => {
    // ARRANGE: Create two parent workflows
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');

    // ARRANGE: Create child with parent1 (constructor auto-attaches)
    // CRITICAL: Constructor calls parent.attachChild(this) at workflow.ts:113-116
    const child = new SimpleWorkflow('Child', parent1);

    // Verify initial state
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);

    // ACT & ASSERT: Attempting to attach child to parent2 should throw
    // This test FAILS because attachChild() doesn't check child.parent !== this
    expect(() => parent2.attachChild(child)).toThrow('already has a parent');
  });

  /**
   * Test: Manual Parent Mutation with 'as any'
   *
   * Scenario: Even if someone manually mutates child.parent using 'as any',
   * attachChild() should still validate and throw an error.
   *
   * This tests the defensive programming aspect - that the existing validation
   * checks catch inconsistent state even when TypeScript type safety is bypassed.
   *
   * The attachChild() method has two validation checks (in order):
   * 1. Line 217-219: children.includes(child) check
   * 2. Line 222-228: child.parent !== null && child.parent !== this check
   *
   * When we manually mutate (child as any).parent = parent2, the child is
   * still in parent1.children, so the first check throws first.
   *
   * Pattern from: plan/bugfix/P1M3T1S2/PRP.md "Manual Parent Mutation Test"
   */
  it('should throw when manually mutating parent with as any then calling attachChild', () => {
    // ARRANGE: Create two parent workflows
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');

    // ARRANGE: Create child with parent1 (constructor auto-attaches)
    // CRITICAL: Constructor calls parent.attachChild(this) at workflow.ts:113-116
    const child = new SimpleWorkflow('Child', parent1);

    // Verify initial state - child should be attached to parent1
    expect(child.parent).toBe(parent1);
    expect(parent1.children).toContain(child);

    // ARRANGE: Manually mutate child.parent using 'as any' to bypass TypeScript
    // This simulates a developer bypassing the type system
    (child as any).parent = parent2;

    // Verify manual mutation worked
    expect(child.parent).toBe(parent2); // Now points to parent2
    expect(parent1.children).toContain(child); // But still in parent1's children array!

    // ACT & ASSERT: parent1.attachChild(child) should throw
    // The validation at workflow.ts:217-219 checks children.includes(child) first
    // Since child is still in parent1.children, it throws "Child already attached"
    // This is defensive programming - even manual mutation is caught
    expect(() => parent1.attachChild(child)).toThrow('Child already attached to this workflow');
  });

  /**
   * Verify console.error is called with helpful message
   *
   * Pattern from: research/console-mocking.md "Verifying Error Messages"
   */
  it('should log helpful error message to console when attaching child with existing parent', () => {
    // ARRANGE
    const parent1 = new SimpleWorkflow('Parent1');
    const parent2 = new SimpleWorkflow('Parent2');
    const child = new SimpleWorkflow('Child', parent1);

    // ACT: Attempt the invalid attachment
    try {
      parent2.attachChild(child);
    } catch (err) {
      // Expected error - test will fail because error isn't thrown yet
    }

    // ASSERT: Console.error should be called with helpful message
    expect(console.error).toHaveBeenCalled();
  });
});

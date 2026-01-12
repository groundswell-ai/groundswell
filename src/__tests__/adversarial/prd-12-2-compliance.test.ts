/**
 * PRD Section 12.2 Compliance Tests
 *
 * PRD Reference: PRPs/PRDs/001-hierarchical-workflow-engine.md, Section 12.2 (lines 311-368)
 *
 * These tests explicitly validate ALL requirements from PRD Section 12.2 for the Workflow Base Class
 * related to parent-child tree structure integrity:
 *
 * PRD Section 12.2 Requirements:
 * 1. Child has exactly one parent
 * 2. child.parent matches parent (bidirectional link)
 * 3. Child appears in only one parent's children array
 * 4. Node tree mirrors workflow tree (1:1 correspondence)
 *
 * Each test includes clear documentation linking assertions to specific PRD requirements.
 *
 * Related: plan/bugfix/P1M3T2S1/PRP.md - PRD compliance validation for attachChild() bug fix
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Workflow } from "../../index.js";
import {
  verifyBidirectionalLink,
  verifyTreeMirror,
  validateTreeConsistency,
} from "../helpers/tree-verification.js";

/**
 * SimpleWorkflow class for testing
 * Pattern from: src/__tests__/adversarial/parent-validation.test.ts:20-26
 */
class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus("running");
    this.setStatus("completed");
    return "done";
  }
}

// ============================================================================
// PRD Section 12.2: Workflow Base Class - Tree Integrity Requirements
// ============================================================================

describe("PRD Section 12.2: Workflow Base Class - Tree Integrity Requirements", () => {
  /**
   * Setup: Mock console methods to suppress error output during expected failures
   * Pattern from: src/__tests__/adversarial/parent-validation.test.ts:33-37
   */
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  // ==========================================================================
  // Requirement 1: Child has exactly one parent
  // PRD Section 12.2, lines 316-317: "public parent: Workflow | null = null;"
  // ==========================================================================

  describe("Requirement 1: Child has exactly one parent", () => {
    it("should set parent when child is attached via constructor", () => {
      // ARRANGE & ACT
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ASSERT - PRD 12.2 Requirement 1: child has exactly one parent
      expect(child.parent).toBe(parent);
      expect(child.parent).not.toBeNull();

      // Verify using helper
      expect(child.parent).toBeDefined();
      expect(child.parent?.id).toBe(parent.id);
    });

    it("should set parent when child is attached via attachChild()", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child");

      // ACT
      parent.attachChild(child);

      // ASSERT - PRD 12.2 Requirement 1: child has exactly one parent
      expect(child.parent).toBe(parent);
      expect(child.parent).not.toBeNull();
    });

    it("should throw when trying to attach child to second parent", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // Verify initial state - child has parent1 as parent
      expect(child.parent).toBe(parent1);

      // ACT & ASSERT - PRD 12.2 Requirement 1: child can only have one parent
      // Attempting to attach to second parent should throw
      expect(() => parent2.attachChild(child)).toThrow(/already has a parent/);
    });

    it("should have null parent when created without parent", () => {
      // ARRANGE & ACT
      const orphan = new SimpleWorkflow("Orphan");

      // ASSERT - PRD 12.2 Requirement 1: child without parent has null
      expect(orphan.parent).toBeNull();
    });

    it("should maintain single parent after multiple attachChild calls to same parent", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ACT - Try to attach again to same parent (should throw, not create second parent)
      expect(() => parent.attachChild(child)).toThrow(
        /already attached to this workflow/,
      );

      // ASSERT - PRD 12.2 Requirement 1: child still has exactly one parent
      expect(child.parent).toBe(parent);
      expect(parent.children.filter((c) => c === child).length).toBe(1);
    });
  });

  // ==========================================================================
  // Requirement 2: child.parent matches parent (bidirectional link)
  // PRD Section 12.2, lines 346-349: attachChild() maintains bidirectional link
  // ==========================================================================

  describe("Requirement 2: child.parent matches parent", () => {
    it("should maintain bidirectional link in workflow tree after constructor attachment", () => {
      // ARRANGE & ACT
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ASSERT - PRD 12.2 Requirement 2: child.parent points to parent
      expect(child.parent).toBe(parent);
      // PRD 12.2 Requirement 2: parent contains child in children array
      expect(parent.children).toContain(child);

      // Verify using helper
      verifyBidirectionalLink(parent, child);
    });

    it("should maintain bidirectional link in workflow tree after attachChild()", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child");

      // ACT
      parent.attachChild(child);

      // ASSERT - PRD 12.2 Requirement 2: bidirectional link in workflow tree
      expect(child.parent).toBe(parent);
      expect(parent.children).toContain(child);
      expect(parent.children.indexOf(child)).toBeGreaterThanOrEqual(0);

      // Verify using helper
      verifyBidirectionalLink(parent, child);
    });

    it("should maintain bidirectional link in node tree", () => {
      // ARRANGE & ACT
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ASSERT - PRD 12.2 Requirement 2: node tree mirrors workflow tree
      // child.node.parent should equal parent.node
      expect(child.node.parent).toBe(parent.node);
      // parent.node.children should contain child.node
      expect(parent.node.children).toContain(child.node);

      // Verify using helper (checks both trees)
      verifyBidirectionalLink(parent, child);
    });

    it("should maintain bidirectional link after detachChild()", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ACT
      parent.detachChild(child);

      // ASSERT - PRD 12.2 Requirement 2: bidirectional link broken in both trees
      expect(child.parent).toBeNull();
      expect(parent.children).not.toContain(child);
      expect(child.node.parent).toBeNull();
      expect(parent.node.children).not.toContain(child.node);
    });
  });

  // ==========================================================================
  // Requirement 3: Child appears in only one parent's children array
  // PRD Section 12.2, lines 316-318: children array must be consistent
  // ==========================================================================

  describe("Requirement 3: Child appears in only one parent's children array", () => {
    it("should only appear in one parent's children array after attachment", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // ASSERT - PRD 12.2 Requirement 3: child appears only in parent1.children
      expect(parent1.children).toContain(child);
      expect(parent2.children).not.toContain(child);

      // Verify exactly one occurrence
      expect(parent1.children.filter((c) => c === child).length).toBe(1);
    });

    it("should not appear in second parent's children after failed attachment", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // ACT - Attempting second attachment should fail
      expect(() => parent2.attachChild(child)).toThrow();

      // ASSERT - PRD 12.2 Requirement 3: child still only in parent1.children
      expect(parent1.children).toContain(child);
      expect(parent2.children).not.toContain(child);

      // Verify parent1 still has exactly one entry for child
      expect(parent1.children.filter((c) => c === child).length).toBe(1);
    });

    it("should appear in new parent's children after reparenting", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // ACT - Reparent using detach/attach pattern
      parent1.detachChild(child);
      parent2.attachChild(child);

      // ASSERT - PRD 12.2 Requirement 3: child now only in parent2.children
      expect(parent1.children).not.toContain(child);
      expect(parent2.children).toContain(child);
      expect(parent2.children.filter((c) => c === child).length).toBe(1);
    });

    it("should have no duplicates in parent's children array", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ACT - Try to attach again (should throw)
      expect(() => parent.attachChild(child)).toThrow();

      // ASSERT - PRD 12.2 Requirement 3: no duplicates in children array
      const occurrences = parent.children.filter((c) => c === child).length;
      expect(occurrences).toBe(1);
    });

    it("should only appear in one node tree children array", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // ASSERT - PRD 12.2 Requirement 3: child.node only in parent1.node.children
      expect(parent1.node.children).toContain(child.node);
      expect(parent2.node.children).not.toContain(child.node);

      // Verify exactly one occurrence
      expect(parent1.node.children.filter((c) => c === child.node).length).toBe(
        1,
      );
    });
  });

  // ==========================================================================
  // Requirement 4: Node tree mirrors workflow tree (1:1 correspondence)
  // PRD Section 12.2, lines 327-336: Dual tree structure must stay synchronized
  // ==========================================================================

  describe("Requirement 4: Node tree mirrors workflow tree", () => {
    it("should maintain 1:1 correspondence between trees after attachment", () => {
      // ARRANGE & ACT
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ASSERT - PRD 12.2 Requirement 4: workflow tree
      expect(parent.children.length).toBe(1);
      expect(parent.children[0]).toBe(child);
      expect(child.parent).toBe(parent);

      // ASSERT - PRD 12.2 Requirement 4: node tree mirrors workflow tree exactly
      expect(parent.node.children.length).toBe(1);
      expect(parent.node.children[0]).toBe(child.node);
      expect(child.node.parent).toBe(parent.node);

      // Use existing helper for comprehensive validation
      verifyTreeMirror(parent);
    });

    it("should maintain 1:1 correspondence after multiple attachments", () => {
      // ARRANGE
      const root = new SimpleWorkflow("Root");
      const child1 = new SimpleWorkflow("Child1", root);
      const child2 = new SimpleWorkflow("Child2", root);
      const child3 = new SimpleWorkflow("Child3", root);

      // ASSERT - PRD 12.2 Requirement 4: workflow tree has 3 children
      expect(root.children.length).toBe(3);
      expect(root.children).toEqual([child1, child2, child3]);

      // ASSERT - PRD 12.2 Requirement 4: node tree has same 3 children
      expect(root.node.children.length).toBe(3);
      expect(root.node.children).toEqual([
        child1.node,
        child2.node,
        child3.node,
      ]);

      // Verify complete mirror
      verifyTreeMirror(root);
    });

    it("should maintain mirror after detachment", () => {
      // ARRANGE
      const root = new SimpleWorkflow("Root");
      const child1 = new SimpleWorkflow("Child1", root);
      const child2 = new SimpleWorkflow("Child2", root);

      // ACT
      root.detachChild(child1);

      // ASSERT - PRD 12.2 Requirement 4: workflow tree updated
      expect(root.children.length).toBe(1);
      expect(root.children[0]).toBe(child2);

      // ASSERT - PRD 12.2 Requirement 4: node tree mirrors workflow tree
      expect(root.node.children.length).toBe(1);
      expect(root.node.children[0]).toBe(child2.node);

      // Verify mirror maintained
      verifyTreeMirror(root);
    });

    it("should maintain mirror after reparenting", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // ACT - Reparent
      parent1.detachChild(child);
      parent2.attachChild(child);

      // ASSERT - PRD 12.2 Requirement 4: Verify new parent in workflow tree
      expect(child.parent).toBe(parent2);
      expect(parent2.children).toContain(child);

      // ASSERT - PRD 12.2 Requirement 4: Verify new parent in node tree
      expect(child.node.parent).toBe(parent2.node);
      expect(parent2.node.children).toContain(child.node);

      // ASSERT - PRD 12.2 Requirement 4: Verify old parent no longer has child
      expect(parent1.children).not.toContain(child);
      expect(parent1.node.children).not.toContain(child.node);

      // Verify complete mirror
      verifyTreeMirror(parent2);
    });

    it("should maintain mirror with deep hierarchy", () => {
      // ARRANGE - Create 3-level hierarchy
      const root = new SimpleWorkflow("Root");
      const child = new SimpleWorkflow("Child", root);
      const grandchild = new SimpleWorkflow("Grandchild", child);

      // ASSERT - PRD 12.2 Requirement 4: Verify root level
      expect(root.children.length).toBe(1);
      expect(root.children[0]).toBe(child);
      expect(root.node.children.length).toBe(1);
      expect(root.node.children[0]).toBe(child.node);

      // ASSERT - PRD 12.2 Requirement 4: Verify child level
      expect(child.children.length).toBe(1);
      expect(child.children[0]).toBe(grandchild);
      expect(child.node.children.length).toBe(1);
      expect(child.node.children[0]).toBe(grandchild.node);

      // ASSERT - PRD 12.2 Requirement 4: Verify grandchild level (leaf)
      expect(grandchild.children.length).toBe(0);
      expect(grandchild.node.children.length).toBe(0);

      // Verify complete tree mirror
      verifyTreeMirror(root);
    });

    it("should maintain mirror for parent relationships in deep hierarchy", () => {
      // ARRANGE - Create 3-level hierarchy
      const root = new SimpleWorkflow("Root");
      const child = new SimpleWorkflow("Child", root);
      const grandchild = new SimpleWorkflow("Grandchild", child);

      // ASSERT - PRD 12.2 Requirement 4: Verify workflow tree parent chain
      expect(grandchild.parent).toBe(child);
      expect(child.parent).toBe(root);
      expect(root.parent).toBeNull();

      // ASSERT - PRD 12.2 Requirement 4: Verify node tree parent chain
      expect(grandchild.node.parent).toBe(child.node);
      expect(child.node.parent).toBe(root.node);
      expect(root.node.parent).toBeNull();

      // Verify complete tree mirror
      verifyTreeMirror(root);
    });
  });

  // ==========================================================================
  // Comprehensive Integration Tests
  // All requirements validated simultaneously
  // ==========================================================================

  describe("Comprehensive Integration: All PRD 12.2 Requirements", () => {
    it("should satisfy all requirements with complex multi-level tree", () => {
      // ARRANGE - Create complex tree structure
      const root = new SimpleWorkflow("Root");
      const branch1 = new SimpleWorkflow("Branch1", root);
      const branch2 = new SimpleWorkflow("Branch2", root);
      const leaf1a = new SimpleWorkflow("Leaf1A", branch1);
      const leaf1b = new SimpleWorkflow("Leaf1B", branch1);
      const leaf2a = new SimpleWorkflow("Leaf2A", branch2);

      // ASSERT - PRD 12.2 Requirement 1: Each node has exactly one parent
      expect(root.parent).toBeNull();
      expect(branch1.parent).toBe(root);
      expect(branch2.parent).toBe(root);
      expect(leaf1a.parent).toBe(branch1);
      expect(leaf1b.parent).toBe(branch1);
      expect(leaf2a.parent).toBe(branch2);

      // ASSERT - PRD 12.2 Requirement 2: Bidirectional links
      expect(root.children).toContain(branch1);
      expect(branch1.parent).toBe(root);
      expect(branch1.children).toContain(leaf1a);
      expect(leaf1a.parent).toBe(branch1);

      // ASSERT - PRD 12.2 Requirement 3: Each child appears only once
      expect(root.children.filter((c) => c === branch1).length).toBe(1);
      expect(branch1.children.filter((c) => c === leaf1a).length).toBe(1);

      // ASSERT - PRD 12.2 Requirement 4: Node tree mirrors workflow tree
      verifyTreeMirror(root);
      expect(validateTreeConsistency(root)).toEqual([]);
    });

    it("should maintain all requirements during reparenting operation", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // Verify initial state satisfies all requirements
      expect(child.parent).toBe(parent1); // Req 1
      expect(parent1.children).toContain(child); // Req 2
      expect(parent1.children.filter((c) => c === child).length).toBe(1); // Req 3
      verifyTreeMirror(parent1); // Req 4

      // ACT - Reparent
      parent1.detachChild(child);
      parent2.attachChild(child);

      // ASSERT - Verify all requirements still satisfied
      // PRD 12.2 Requirement 1: child has exactly one parent (now parent2)
      expect(child.parent).toBe(parent2);
      expect(child.parent).not.toBe(parent1);

      // PRD 12.2 Requirement 2: bidirectional link with new parent
      expect(child.parent).toBe(parent2);
      expect(parent2.children).toContain(child);

      // PRD 12.2 Requirement 3: child appears only in new parent's children
      expect(parent1.children).not.toContain(child);
      expect(parent2.children).toContain(child);
      expect(parent2.children.filter((c) => c === child).length).toBe(1);

      // PRD 12.2 Requirement 4: node tree mirrors workflow tree
      expect(child.node.parent).toBe(parent2.node);
      expect(parent2.node.children).toContain(child.node);
      expect(parent1.node.children).not.toContain(child.node);
      verifyTreeMirror(parent2);
      expect(validateTreeConsistency(parent2)).toEqual([]);
    });

    it("should prevent violations when trying to create inconsistent state", () => {
      // ARRANGE
      const parent1 = new SimpleWorkflow("Parent1");
      const parent2 = new SimpleWorkflow("Parent2");
      const child = new SimpleWorkflow("Child", parent1);

      // ACT & ASSERT - Attempting to violate Requirement 1 (single parent)
      expect(() => parent2.attachChild(child)).toThrow();

      // Verify requirements still satisfied despite failed attack
      expect(child.parent).toBe(parent1); // Req 1: single parent maintained
      expect(parent1.children).toContain(child); // Req 2: bidirectional link
      expect(parent2.children).not.toContain(child); // Req 3: only in one parent
      verifyTreeMirror(parent1); // Req 4: mirror maintained
    });

    it("should satisfy all requirements with wide tree (many siblings)", () => {
      // ARRANGE - Create tree with many children
      const parent = new SimpleWorkflow("Parent");
      const children: SimpleWorkflow[] = [];

      for (let i = 0; i < 10; i++) {
        children.push(new SimpleWorkflow(`Child${i}`, parent));
      }

      // ASSERT - PRD 12.2 Requirement 1: Each child has exactly one parent
      children.forEach((child) => {
        expect(child.parent).toBe(parent);
      });

      // ASSERT - PRD 12.2 Requirement 2: All bidirectional links valid
      children.forEach((child) => {
        expect(child.parent).toBe(parent);
        expect(parent.children).toContain(child);
      });

      // ASSERT - PRD 12.2 Requirement 3: Each child appears exactly once
      children.forEach((child) => {
        expect(parent.children.filter((c) => c === child).length).toBe(1);
      });

      // ASSERT - PRD 12.2 Requirement 4: Node tree mirrors workflow tree
      expect(parent.children.length).toBe(10);
      expect(parent.node.children.length).toBe(10);
      verifyTreeMirror(parent);
      expect(validateTreeConsistency(parent)).toEqual([]);
    });
  });

  // ==========================================================================
  // Event Emission Validation (PRD 12.2, line 349)
  // ==========================================================================

  describe("PRD 12.2 Event Emission: childAttached and childDetached", () => {
    it("should emit childAttached event when attaching via constructor", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);

      // ASSERT - PRD 12.2 line 349: attachChild emits childAttached event
      const attachedEvents = parent.node.events.filter(
        (e) => e.type === "childAttached",
      );
      expect(attachedEvents.length).toBeGreaterThan(0);

      const lastAttachedEvent = attachedEvents[attachedEvents.length - 1];
      if (lastAttachedEvent.type === "childAttached") {
        expect(lastAttachedEvent.parentId).toBe(parent.id);
        expect(lastAttachedEvent.child).toBe(child.node);
      }
    });

    it("should emit childAttached event when attaching via attachChild()", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child");
      const eventCountBefore = parent.node.events.filter(
        (e) => e.type === "childAttached",
      ).length;

      // ACT
      parent.attachChild(child);

      // ASSERT - PRD 12.2 line 349: childAttached event emitted
      const eventCountAfter = parent.node.events.filter(
        (e) => e.type === "childAttached",
      ).length;
      expect(eventCountAfter).toBe(eventCountBefore + 1);
    });

    it("should emit childDetached event when detaching", () => {
      // ARRANGE
      const parent = new SimpleWorkflow("Parent");
      const child = new SimpleWorkflow("Child", parent);
      const eventCountBefore = parent.node.events.filter(
        (e) => e.type === "childDetached",
      ).length;

      // ACT
      parent.detachChild(child);

      // ASSERT - childDetached event emitted
      const eventCountAfter = parent.node.events.filter(
        (e) => e.type === "childDetached",
      ).length;
      expect(eventCountAfter).toBe(eventCountBefore + 1);

      const lastDetachedEvent = parent.node.events
        .filter((e) => e.type === "childDetached")
        .pop();
      if (lastDetachedEvent?.type === "childDetached") {
        expect(lastDetachedEvent.parentId).toBe(parent.id);
        expect(lastDetachedEvent.childId).toBe(child.id);
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import { Workflow } from "../../core/workflow.js";

/**
 * Test suite for public isDescendantOf() API.
 *
 * These tests verify that the isDescendantOf() method is publicly accessible
 * without requiring (as any) type casting, following the P1.M3.T4.S2 PRP
 * implementation for making this method public.
 */
describe("Workflow.isDescendantOf() - Public API", () => {
  describe("Public API Accessibility", () => {
    it("should be publicly accessible without casting to any", () => {
      const root = new Workflow("root");
      const child = new Workflow("child", root);

      // This should work without (as any) cast - verifies public visibility
      const result = child.isDescendantOf(root);

      expect(result).toBe(true);
    });

    it("should return true for direct parent relationship", () => {
      const root = new Workflow("root");
      const child = new Workflow("child", root);

      const result = child.isDescendantOf(root);

      expect(result).toBe(true);
    });

    it("should return true for nested descendant relationship", () => {
      const root = new Workflow("root");
      const level1 = new Workflow("level1", root);
      const level2 = new Workflow("level2", level1);
      const level3 = new Workflow("level3", level2);

      expect(level1.isDescendantOf(root)).toBe(true);
      expect(level2.isDescendantOf(root)).toBe(true);
      expect(level3.isDescendantOf(root)).toBe(true);
      expect(level3.isDescendantOf(level1)).toBe(true);
    });

    it("should return false for unrelated workflows", () => {
      const tree1 = new Workflow("tree1");
      const tree2 = new Workflow("tree2");

      const result = tree1.isDescendantOf(tree2);

      expect(result).toBe(false);
    });

    it("should return false when checking root against descendant", () => {
      const root = new Workflow("root");
      const child = new Workflow("child", root);

      const result = root.isDescendantOf(child);

      expect(result).toBe(false);
    });

    it("should return false for root checking itself", () => {
      const root = new Workflow("root");

      const result = root.isDescendantOf(root);

      expect(result).toBe(false);
    });
  });

  describe("Use Case: Hierarchy Validation", () => {
    it("should support validating workflow belongs to specific hierarchy", () => {
      const productionRoot = new Workflow("production-root");
      const stagingRoot = new Workflow("staging-root");

      const prodWorkflow = new Workflow("prod-workflow", productionRoot);
      const stagingWorkflow = new Workflow("staging-workflow", stagingRoot);

      expect(prodWorkflow.isDescendantOf(productionRoot)).toBe(true);
      expect(prodWorkflow.isDescendantOf(stagingRoot)).toBe(false);
      expect(stagingWorkflow.isDescendantOf(stagingRoot)).toBe(true);
      expect(stagingWorkflow.isDescendantOf(productionRoot)).toBe(false);
    });
  });

  describe("Use Case: Circular Reference Prevention", () => {
    it("should support validation before attaching to prevent circular references", () => {
      const root = new Workflow("root");
      const child = new Workflow("child", root);
      const grandchild = new Workflow("grandchild", child);

      // grandchild should NOT be attachable to root (would create cycle)
      expect(grandchild.isDescendantOf(root)).toBe(true);

      // Unrelated workflow should be attachable
      const unrelated = new Workflow("unrelated");
      expect(unrelated.isDescendantOf(root)).toBe(false);
    });
  });

  describe("Use Case: Conditional Logic Based on Ancestry", () => {
    it("should support conditional execution based on hierarchy position", () => {
      const productionRoot = new Workflow("production-root");
      const developmentRoot = new Workflow("development-root");

      const prodBatch = new Workflow("prod-batch", productionRoot);
      const devBatch = new Workflow("dev-batch", developmentRoot);

      // Simulate conditional logic
      const isInProduction = prodBatch.isDescendantOf(productionRoot);
      const isProductionWorkflow = devBatch.isDescendantOf(productionRoot);

      expect(isInProduction).toBe(true);
      expect(isProductionWorkflow).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle workflows with no parent", () => {
      const orphan = new Workflow("orphan");
      const root = new Workflow("root");

      const result = orphan.isDescendantOf(root);

      expect(result).toBe(false);
    });

    it("should handle sibling relationships correctly", () => {
      const root = new Workflow("root");
      const sibling1 = new Workflow("sibling1", root);
      const sibling2 = new Workflow("sibling2", root);

      // Siblings are not descendants of each other
      expect(sibling1.isDescendantOf(sibling2)).toBe(false);
      expect(sibling2.isDescendantOf(sibling1)).toBe(false);
    });

    it("should handle complex multi-level hierarchies", () => {
      const root = new Workflow("root");
      const branch1 = new Workflow("branch1", root);
      const branch2 = new Workflow("branch2", root);
      const leaf1a = new Workflow("leaf1a", branch1);
      const leaf1b = new Workflow("leaf1b", branch1);
      const leaf2a = new Workflow("leaf2a", branch2);

      // All leafs should be descendants of root
      expect(leaf1a.isDescendantOf(root)).toBe(true);
      expect(leaf1b.isDescendantOf(root)).toBe(true);
      expect(leaf2a.isDescendantOf(root)).toBe(true);

      // Leaf1a should not be descendant of branch2
      expect(leaf1a.isDescendantOf(branch2)).toBe(false);

      // Leaf2a should not be descendant of branch1
      expect(leaf2a.isDescendantOf(branch1)).toBe(false);
    });
  });

  describe("Edge Cases: Circular Reference Detection", () => {
    it("should throw error when circular reference is detected", () => {
      // Arrange: Create parent and child workflows with circular reference
      const parent = new Workflow("Parent");
      const child = new Workflow("Child", parent);
      const unrelated = new Workflow("Unrelated");

      // Act: Create circular reference manually
      // This simulates a bug or malicious input that creates a cycle
      // Normal attachChild() prevents this, so we bypass normal safeguards
      parent.parent = child;

      // Assert: isDescendantOf should throw error for circular reference
      // We use 'unrelated' as the ancestor to force traversal through the cycle
      // If we used 'child', the method would return true immediately before
      // detecting the cycle (since child === child at first iteration)
      expect(() => parent.isDescendantOf(unrelated)).toThrow(
        "Circular parent-child relationship detected",
      );
    });
  });
});

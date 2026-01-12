import type { Workflow } from '../../index.js';

/**
 * Collect all nodes in tree via BFS traversal
 * Throws if circular reference detected
 *
 * @param root - The root workflow node to start traversal from
 * @returns Array of all workflow nodes in the tree
 * @throws Error if circular reference is detected
 *
 * Pattern from: tree-debugger.ts:52-58 (buildNodeMap)
 */
export function collectAllNodes(root: Workflow): Workflow[] {
  const nodes: Workflow[] = [];
  const queue: Workflow[] = [root];
  const visited = new Set<Workflow>();

  while (queue.length > 0) {
    const node = queue.shift()!;

    // CRITICAL: Cycle detection
    if (visited.has(node)) {
      throw new Error(`Circular reference detected at ${node.node.name}`);
    }

    visited.add(node);
    nodes.push(node);
    queue.push(...node.children);
  }

  return nodes;
}

/**
 * Validate tree-wide bidirectional consistency
 * Returns array of inconsistency descriptions (empty if valid)
 *
 * This is the comprehensive validation that checks:
 * 1. Parent → child links in workflow tree
 * 2. Child → parent links in workflow tree
 * 3. Node tree mirrors workflow tree (parent relationship)
 * 4. Node tree mirrors workflow tree (children relationship)
 *
 * @param root - The root workflow to validate
 * @returns Array of error descriptions (empty if tree is consistent)
 */
export function validateTreeConsistency(root: Workflow): string[] {
  const errors: string[] = [];
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    // Check parent→child link in workflow tree
    if (node.parent) {
      if (!node.parent.children.includes(node)) {
        errors.push(
          `[WORKFLOW TREE] Orphaned child: "${node.node.name}" not in parent "${node.parent.node.name}"'s children list`
        );
      }
    } else {
      // Root node - should not be in anyone's children
      const parentClaimants = allNodes.filter(n => n.children.includes(node));
      if (parentClaimants.length > 0) {
        errors.push(
          `[WORKFLOW TREE] Root node "${node.node.name}" claimed as child by [${parentClaimants.map(n => n.node.name).join(', ')}]`
        );
      }
    }

    // Check child→parent links
    node.children.forEach(child => {
      // Workflow tree check
      if (child.parent !== node) {
        errors.push(
          `[WORKFLOW TREE] Mismatched parent: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${node.node.name}"`
        );
      }

      // CRITICAL: Check node tree mirrors workflow tree - parent relationship
      if (child.node.parent !== node.node) {
        errors.push(
          `[NODE TREE] Mismatched parent: "${child.node.name}".node.parent is "${child.node.parent?.name ?? 'null'}", expected "${node.node.name}"`
        );
      }

      // CRITICAL: Check node tree mirrors workflow tree - children relationship
      if (!node.node.children.includes(child.node)) {
        errors.push(
          `[NODE TREE] Orphaned child: "${child.node.name}".node not in parent "${node.node.name}"'s node.children array`
        );
      }
    });
  });

  return errors;
}

/**
 * Verify bidirectional link between parent and child in BOTH trees
 * Throws if inconsistency found
 *
 * This is the primary assertion helper for testing attachChild() operations.
 * Verifies:
 * - child.parent === parent (workflow tree)
 * - parent.children includes child (workflow tree)
 * - child.node.parent === parent.node (node tree)
 * - parent.node.children includes child.node (node tree)
 *
 * @param parent - The parent workflow
 * @param child - The child workflow
 * @throws Error if bidirectional link is broken in either tree
 *
 * Usage: parent.attachChild(child); verifyBidirectionalLink(parent, child);
 */
export function verifyBidirectionalLink(parent: Workflow, child: Workflow): void {
  // Workflow tree checks
  if (child.parent !== parent) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${child.node.name}".parent is "${child.parent?.node.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.children.includes(child)) {
    throw new Error(
      `[WORKFLOW TREE] Bidirectional link broken: "${parent.node.name}".children does not contain "${child.node.name}"`
    );
  }

  // CRITICAL: Node tree checks (must mirror workflow tree)
  if (child.node.parent !== parent.node) {
    throw new Error(
      `[NODE TREE] Bidirectional link broken: "${child.node.name}".node.parent is "${child.node.parent?.name ?? 'null'}", expected "${parent.node.name}"`
    );
  }

  if (!parent.node.children.includes(child.node)) {
    throw new Error(
      `[NODE TREE] Bidirectional link broken: "${parent.node.name}".node.children does not contain "${child.node.name}"`
    );
  }
}

/**
 * Verify complete orphaning after detach
 * Confirms that child is no longer attached to any parent in BOTH trees
 *
 * @param child - The child workflow to verify
 * @throws Error if child is not properly orphaned
 *
 * Usage: parent.detachChild(child); verifyOrphaned(child);
 */
export function verifyOrphaned(child: Workflow): void {
  if (child.parent !== null) {
    throw new Error(
      `Child "${child.node.name}" not orphaned: parent is "${child.parent.node.name}"`
    );
  }

  if (child.node.parent !== null) {
    throw new Error(
      `Child "${child.node.name}" not orphaned in node tree: parent is "${child.node.parent.name}"`
    );
  }
}

/**
 * Verify no circular references exist in the tree
 * Uses collectAllNodes which throws on circular reference detection
 *
 * @param root - The root workflow to check
 * @throws Error if circular reference is detected
 *
 * Usage: verifyNoCycles(root);
 */
export function verifyNoCycles(root: Workflow): void {
  const visited = new Set<Workflow>();
  const allNodes = collectAllNodes(root);

  allNodes.forEach(node => {
    if (visited.has(node)) {
      throw new Error(`Circular reference detected: node "${node.node.name}" visited twice`);
    }
    visited.add(node);
  });
}

/**
 * Verify tree mirror invariant (1:1 correspondence)
 * This is the CRITICAL invariant from PRD Section 12.2
 *
 * For every relationship in the workflow tree, there MUST be an equivalent relationship in the node tree:
 * - If node.parent exists, it must equal wfNode.parent.node
 * - If node.parent is null, wfNode.parent must be null
 * - node.children.length must equal wfNode.children.length
 * - node.children[index] must equal wfNode.children[index].node
 *
 * @param workflowRoot - The root workflow to verify
 * @throws Error if mirror invariant is violated
 *
 * Usage: verifyTreeMirror(root);
 */
export function verifyTreeMirror(workflowRoot: Workflow): void {
  const allNodes = collectAllNodes(workflowRoot);

  allNodes.forEach(wfNode => {
    const node = wfNode.node;

    // Verify parent relationship mirrors
    if (wfNode.parent) {
      if (node.parent !== wfNode.parent.node) {
        throw new Error(
          `[MIRROR] Parent mismatch: "${wfNode.node.name}".parent is "${node.parent?.name}", expected "${wfNode.parent.node.name}"`
        );
      }
    } else {
      if (node.parent !== null) {
        throw new Error(
          `[MIRROR] Parent mismatch: "${wfNode.node.name}".parent is "${node.parent.name}", expected null`
        );
      }
    }

    // Verify children relationship mirrors
    if (node.children.length !== wfNode.children.length) {
      throw new Error(
        `[MIRROR] Children count mismatch: "${wfNode.node.name}" has ${wfNode.children.length} workflow children but ${node.children.length} node children`
      );
    }

    wfNode.children.forEach((childWf, index) => {
      if (node.children[index] !== childWf.node) {
        throw new Error(
          `[MIRROR] Child mismatch at index ${index}: expected "${childWf.node.name}", got "${node.children[index].name}"`
        );
      }
    });
  });
}

/**
 * Get depth of node in tree
 * Depth is the number of edges from the node to the root
 * Root has depth 0, its children have depth 1, etc.
 *
 * @param node - The workflow node to calculate depth for
 * @returns The depth of the node (0 for root)
 */
export function getDepth(node: Workflow): number {
  let depth = 0;
  let current: Workflow | null = node;

  while (current !== null) {
    depth++;
    current = current.parent;
  }

  return depth - 1; // Subtract 1 for the node itself
}

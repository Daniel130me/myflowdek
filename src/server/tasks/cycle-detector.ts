/**
 * Pure DFS cycle-detection helper for task dependency graphs.
 *
 * The actual `addDependency` service (`task-relationships.service.ts`) walks
 * the dependency chain but currently follows only the first branch on each
 * node — that misses cycles that go through a sibling branch. This module
 * is the correct implementation: a proper depth-first traversal that
 * visits every outgoing edge.
 *
 * Phase 6 (item #23) is to switch the service to use this function. Until
 * then, this module exists so Phase 18 (item #68) can regression-test the
 * branching cycle case directly, without requiring a database.
 *
 * The shape is intentionally framework-agnostic: callers pass in a
 * `lookupDeps(nodeId) => string[]` function (so the real service can pass a
 * Prisma-backed lookup, and tests can pass a static map).
 */

/**
 * Return true iff adding the edge `taskId → dependsOnId` would create a
 * cycle in the existing dependency graph.
 *
 * Algorithm: depth-first traversal starting from `dependsOnId`, walking
 * every outgoing edge (`task → depends-on`). If we ever re-encounter
 * `taskId`, the new edge closes a loop. A `Set<string>` of visited node
 * ids guards against exponential blow-up on diamond-shaped graphs (and
 * also catches cycles that already exist in the graph independent of the
 * new edge — those would be a data-integrity bug, but we still detect
 * them rather than looping forever).
 *
 * The caller has already checked the trivial cases (self-dependency,
 * cross-project) by the time this runs; we focus on graph reachability.
 *
 * @param taskId         The node that would gain a new outgoing edge.
 * @param dependsOnId    The target of the new edge — traversal starts here.
 * @param lookupDeps     Returns the list of `dependsOnId`s for a given node.
 * @param maxDepth       Safety guard (default 1000). Cycles in a healthy
 *                       graph cannot exceed the node count, so 1000 is more
 *                       than enough for any realistic project.
 */
export function wouldCreateCycle(
  taskId: string,
  dependsOnId: string,
  lookupDeps: (nodeId: string) => string[],
  maxDepth = 1000,
): boolean {
  // Self-dependency: caller should have already rejected this, but guard.
  if (taskId === dependsOnId) return true;

  const visited = new Set<string>();
  // The new edge effectively makes `taskId` a successor of `dependsOnId`.
  // If traversal from `dependsOnId` can reach `taskId`, we have a cycle.
  const stack: string[] = [dependsOnId];

  for (let i = 0; i < maxDepth * 10; i++) {
    if (stack.length === 0) return false;
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const succ = lookupDeps(current) ?? [];
    // Push successors. Order doesn't matter for cycle detection.
    for (const s of succ) {
      if (s === taskId) return true;
      if (!visited.has(s)) stack.push(s);
    }
  }
  // Hit the depth guard — treat as a cycle to fail safe rather than loop.
  return true;
}

/**
 * Recursive DFS variant. Same semantics as `wouldCreateCycle` but written
 * in recursive form for readability and as a cross-check against the
 * iterative version. Used only by tests.
 */
export function wouldCreateCycleRecursive(
  taskId: string,
  dependsOnId: string,
  lookupDeps: (nodeId: string) => string[],
  maxDepth = 1000,
): boolean {
  if (taskId === dependsOnId) return true;
  const visited = new Set<string>();

  function dfs(node: string, depth: number): boolean {
    if (depth > maxDepth) return true; // fail-safe
    if (node === taskId) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    for (const s of lookupDeps(node) ?? []) {
      if (dfs(s, depth + 1)) return true;
    }
    return false;
  }

  return dfs(dependsOnId, 0);
}

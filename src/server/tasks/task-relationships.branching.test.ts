/**
 * Branching dependency cycle-detection tests (Phase 18, item #68).
 *
 * Regression test for the branching cycle case:
 *
 *   Graph (existing edges):
 *     B → C
 *     B → D
 *     D → A
 *
 *   Attempt to add: A → B
 *
 *   Expected: REJECTED — adding A→B closes the loop A → B → D → A.
 *
 * The naive "follow the first branch" traversal misses this: from B it
 * visits C (a leaf) and stops, never walking the B→D edge. The pure DFS in
 * `cycle-detector.ts` walks every outgoing edge and so catches the cycle.
 *
 * The actual `addDependency` service in `task-relationships.service.ts`
 * uses the same DFS algorithm (with an explicit stack and a `visited` set
 * seeded with `taskId`). Testing the pure helper here exercises that
 * algorithm directly without requiring a database or a mocked Prisma
 * client — which is important because the integration tests in
 * `src/server/auth/tests/integration.test.ts` already cover the
 * end-to-end cross-project + circular-dependency rejection against the
 * real DB.
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  wouldCreateCycle,
  wouldCreateCycleRecursive,
} from './cycle-detector';

/** Build a lookup function from an adjacency map. */
function fromMap(map: Record<string, string[]>): (id: string) => string[] {
  return (id: string) => map[id] ?? [];
}

/* --------------------------- Linear cycle --------------------------- */

describe('linear chain cycle detection', () => {
  test('A→B, B→C, then C→A is rejected', () => {
    // Existing edges: A→B, B→C. Attempting to add C→A closes A→B→C→A.
    const graph = { A: ['B'], B: ['C'], C: [] };
    assert.equal(wouldCreateCycle('C', 'A', fromMap(graph)), true);
  });

  test('A→B, B→C, then A→C is allowed (no cycle)', () => {
    const graph = { A: ['B'], B: ['C'], C: [] };
    // A→C doesn't create a cycle because nothing reaches A from C.
    assert.equal(wouldCreateCycle('A', 'C', fromMap(graph)), false);
  });

  test('self-dependency is rejected', () => {
    assert.equal(wouldCreateCycle('A', 'A', fromMap({})), true);
  });
});

/* --------------------------- Branching cycle (the regression) --------------------------- */

describe('branching cycle detection (item #68)', () => {
  // The graph from the task spec.
  //   B → C   (one branch out of B)
  //   B → D   (a second branch out of B — the naive impl only follows C)
  //   D → A   (closes the loop when we later try A→B)
  const graph: Record<string, string[]> = {
    A: [],
    B: ['C', 'D'],
    C: [],
    D: ['A'],
  };

  test('attempting A → B is rejected (closes A → B → D → A)', () => {
    assert.equal(
      wouldCreateCycle('A', 'B', fromMap(graph)),
      true,
      'A→B must be rejected because traversal from B reaches D, which points at A',
    );
  });

  test('recursive DFS variant agrees', () => {
    assert.equal(wouldCreateCycleRecursive('A', 'B', fromMap(graph)), true);
  });

  test('naive first-branch-only traversal would MISS this cycle (regression anchor)', () => {
    // Document WHY the test exists: the previous implementation in
    // task-relationships.service.ts followed `current = deps[0]`, so from B
    // it would visit C (a leaf, no successors) and stop, never seeing the
    // B→D edge. We simulate that broken traversal here and assert that it
    // DOES NOT detect the cycle — which is exactly the bug the pure DFS
    // fixes.
    const naiveDetectsCycle: boolean = (() => {
      const visited = new Set<string>(['A']);
      let current: string | undefined = 'B';
      for (let i = 0; i < 100; i++) {
        if (!current) return false;
        if (visited.has(current)) return true;
        visited.add(current);
        const deps: string[] = graph[current] ?? [];
        if (deps.length === 0) return false;
        // BUG: only follow the first branch.
        current = deps[0];
      }
      return false;
    })();
    assert.equal(
      naiveDetectsCycle,
      false,
      'naive first-branch traversal must NOT detect the cycle (documents the bug)',
    );
    // And the correct implementation DOES detect it.
    assert.equal(wouldCreateCycle('A', 'B', fromMap(graph)), true);
  });
});

/* --------------------------- More branching shapes --------------------------- */

describe('additional branching shapes', () => {
  test('diamond graph with no cycle is allowed; closing edge is rejected', () => {
    // A→B, A→C, B→D, C→D, D has no successors. Adding D→A closes the cycle.
    const diamond: Record<string, string[]> = {
      A: ['B', 'C'],
      B: ['D'],
      C: ['D'],
      D: [],
    };
    // Adding D→A would close the cycle D → A → (B or C) → D.
    assert.equal(wouldCreateCycle('D', 'A', fromMap(diamond)), true);
    // But adding X→A (a fresh node pointing at A) does not cycle (A doesn't reach X).
    assert.equal(wouldCreateCycle('X', 'A', fromMap(diamond)), false);
  });

  test('two-branch cycle is detected via either branch', () => {
    // B → C, B → D, D → A. Adding A→B cycles.
    // Also: adding C→A is fine (A doesn't reach C in the existing graph).
    const g: Record<string, string[]> = {
      A: [],
      B: ['C', 'D'],
      C: [],
      D: ['A'],
    };
    assert.equal(wouldCreateCycle('A', 'B', fromMap(g)), true);
    assert.equal(wouldCreateCycle('C', 'A', fromMap(g)), false);
  });

  test('a longer branching cycle (5 nodes) is detected', () => {
    // A→B, A→C, C→D, D→E, E→A. Adding A→E closes the cycle.
    const g: Record<string, string[]> = {
      A: ['B', 'C'],
      B: [],
      C: ['D'],
      D: ['E'],
      E: ['A'],
    };
    // A→E: from E we reach A, so A→E closes a cycle.
    assert.equal(wouldCreateCycle('A', 'E', fromMap(g)), true);
  });

  test('disconnected components do not produce false positives', () => {
    // Two separate DAGs. Adding an edge inside one must not be flagged
    // because of edges in the other.
    const g: Record<string, string[]> = {
      // component 1
      A1: ['B1'],
      B1: [],
      // component 2
      A2: ['B2'],
      B2: ['C2'],
      C2: [],
    };
    // B1→A1 closes component 1 (A1→B1→A1), so should be detected.
    assert.equal(wouldCreateCycle('B1', 'A1', fromMap(g)), true);
    // B2→A2 also closes a cycle (A2→B2→C2 doesn't reach A2, so B2→A2 is OK
    // — wait: does A2 reach B2? yes via A2→B2. So B2→A2 closes A2→B2→A2).
    assert.equal(wouldCreateCycle('B2', 'A2', fromMap(g)), true);
    // A2→C2 (skipping B2) is fine — nothing in C2's successors reaches A2.
    assert.equal(wouldCreateCycle('A2', 'C2', fromMap(g)), false);
  });
});

/* --------------------------- Depth guard --------------------------- */

describe('depth guard', () => {
  test('a very long linear chain with no cycle is allowed', () => {
    // 500-node chain: 0→1→2→...→499. Adding 499→500 is fine.
    const g: Record<string, string[]> = {};
    for (let i = 0; i < 500; i++) g[String(i)] = [String(i + 1)];
    g['500'] = [];
    assert.equal(wouldCreateCycle('499', '500', fromMap(g)), false);
  });

  test('a 500-node cycle is detected', () => {
    // 0→1→...→499→0. Adding 250→0 closes the cycle.
    const g: Record<string, string[]> = {};
    for (let i = 0; i < 500; i++) g[String(i)] = [String((i + 1) % 500)];
    assert.equal(wouldCreateCycle('250', '0', fromMap(g)), true);
  });
});

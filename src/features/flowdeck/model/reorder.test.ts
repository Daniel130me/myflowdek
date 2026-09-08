/**
 * Anchor-based reorder tests (audit H-07).
 *
 * The bug: Board/Sheet/Tasks views computed the drop index inside their own
 * filtered/sorted/grouped list, but the store spliced the GLOBAL unfiltered
 * array at that index — dropping a card at the visually-correct position
 * reordered unrelated tasks and persisted the wrong order.
 *
 * These tests exercise the exact divergent scenario reproduced live against
 * the seeded demo project: a status column whose cards start at global
 * offset 2 (two foreign-status tasks above), and a drag downward inside it.
 *
 * Run with: npm run test
 */
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { applyReorderAnchor } from './reorder';
import type { Task, TaskStatus } from './types';

/** Minimal task factory — only identity matters for ordering. */
function t(id: string, status: TaskStatus): Task {
  return {
    id, projectId: 'p', name: id, status,
    assignee: '', start: '', duration: 1, progress: 0, priority: 'medium',
    deps: [], sortOrder: 0,
  };
}

/**
 * The live-reproduced layout: [0]=review, [1]=in_progress (foreign), then a
 * contiguous backlog block starting at global index 2. Visual backlog
 * column: [native, core, ios, android, push, appstore].
 */
function divergentGlobal(): Task[] {
  return [
    t('onboard', 'review'),
    t('mvp', 'in_progress'),
    t('native', 'backlog'),
    t('core', 'backlog'),
    t('ios', 'backlog'),
    t('android', 'backlog'),
    t('push', 'backlog'),
    t('appstore', 'backlog'),
  ];
}

const ids = (list: Task[]) => list.map(x => x.id);

describe('applyReorderAnchor (H-07)', () => {
  test('drop before a neighbour anchors in the GLOBAL array, not the view index', () => {
    // Visually: drag `native` (col idx 0) onto `ios` (col idx 2) — the old
    // code spliced the global array at index 2/3 and corrupted the order
    // (core jumped to the top). The anchor keeps native next to ios.
    const result = applyReorderAnchor(divergentGlobal(), 'native', { beforeTaskId: 'ios' });
    assert.ok(result);
    assert.deepEqual(ids(result), ['onboard', 'mvp', 'core', 'native', 'ios', 'android', 'push', 'appstore']);
  });

  test('drop after a neighbour also anchors correctly with foreign tasks above', () => {
    const result = applyReorderAnchor(divergentGlobal(), 'native', { afterTaskId: 'core' });
    assert.ok(result);
    assert.deepEqual(ids(result), ['onboard', 'mvp', 'core', 'native', 'ios', 'android', 'push', 'appstore']);
  });

  test('downward drag inside a column lands directly under the target card', () => {
    // Drag `core` (col idx 1) onto the lower half of `push` (col idx 4).
    const result = applyReorderAnchor(divergentGlobal(), 'core', { afterTaskId: 'push' });
    assert.ok(result);
    assert.deepEqual(ids(result), ['onboard', 'mvp', 'native', 'ios', 'android', 'push', 'core', 'appstore']);
  });

  test('null anchor moves the task to the end of the manual order', () => {
    const result = applyReorderAnchor(divergentGlobal(), 'native', null);
    assert.ok(result);
    assert.deepEqual(ids(result), ['onboard', 'mvp', 'core', 'ios', 'android', 'push', 'appstore', 'native']);
  });

  test('no anchor at all behaves like an append (column-body drop on empty list)', () => {
    const result = applyReorderAnchor(divergentGlobal(), 'native');
    assert.ok(result);
    assert.equal(result[result.length - 1].id, 'native');
  });

  test('drop that does not change the position returns null (skips network write)', () => {
    // native is already immediately before core.
    const result = applyReorderAnchor(divergentGlobal(), 'native', { beforeTaskId: 'core' });
    assert.equal(result, null);
  });

  test('anchor pointing at the dragged task itself is treated as no anchor', () => {
    const result = applyReorderAnchor(divergentGlobal(), 'native', { beforeTaskId: 'native' });
    assert.ok(result);
    assert.equal(result[result.length - 1].id, 'native');
  });

  test('unknown anchor id falls back to append instead of corrupting the order', () => {
    const result = applyReorderAnchor(divergentGlobal(), 'native', { beforeTaskId: 'ghost' });
    assert.ok(result);
    assert.equal(result[result.length - 1].id, 'native');
  });

  test('unknown task id returns null', () => {
    assert.equal(applyReorderAnchor(divergentGlobal(), 'ghost', { beforeTaskId: 'ios' }), null);
  });

  test('the input array is not mutated', () => {
    const original = divergentGlobal();
    applyReorderAnchor(original, 'native', { beforeTaskId: 'ios' });
    assert.deepEqual(ids(original), ['onboard', 'mvp', 'native', 'core', 'ios', 'android', 'push', 'appstore']);
  });
});

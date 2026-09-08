/**
 * Anchor-based reorder translation (audit H-07).
 *
 * Views (Board / Sheet / Tasks list) render FILTERED, SORTED or GROUPED
 * subsets of the project's task list. An index inside such a subset is
 * meaningless against the store's global, unfiltered array — splicing at it
 * reordered unrelated hidden tasks and persisted the wrong order. Instead,
 * views now pass the drop ANCHOR: the neighbouring task the drop is visually
 * relative to. The anchor travels with the data, so it stays correct under
 * any view transformation.
 */
import type { Task } from './types';

export interface ReorderAnchor {
  /** Insert the moved task immediately before this task. */
  beforeTaskId?: string | null;
  /** Insert the moved task immediately after this task. */
  afterTaskId?: string | null;
}

/**
 * Return a reordered copy of `tasks` with `taskId` moved to the anchor
 * position, or `null` when the drop is a no-op (task missing, anchor
 * missing/invalid, or position unchanged). Callers should skip their update
 * entirely on `null` — including the network write.
 */
export function applyReorderAnchor(tasks: Task[], taskId: string, anchor?: ReorderAnchor | null): Task[] | null {
  const fromIdx = tasks.findIndex(t => t.id === taskId);
  if (fromIdx === -1) return null;

  const arr = [...tasks];
  const [removed] = arr.splice(fromIdx, 1);

  // Default: end of the manual order (drop past the last visible row).
  let toIndex = arr.length;
  if (anchor?.beforeTaskId && anchor.beforeTaskId !== taskId) {
    const i = arr.findIndex(t => t.id === anchor.beforeTaskId);
    if (i !== -1) toIndex = i;
  } else if (anchor?.afterTaskId && anchor.afterTaskId !== taskId) {
    const i = arr.findIndex(t => t.id === anchor.afterTaskId);
    if (i !== -1) toIndex = i + 1;
  }

  // Removing then re-inserting at the same index changed nothing.
  if (toIndex === fromIdx) return null;

  arr.splice(toIndex, 0, removed);
  return arr;
}

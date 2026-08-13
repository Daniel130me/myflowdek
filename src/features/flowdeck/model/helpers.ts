export const TODAY = new Date("2026-07-25");

export const dayMs = 86400000;

export function offsetDays(dateStr: string, fromStr: string): number {
  return Math.round((new Date(dateStr).getTime() - new Date(fromStr).getTime()) / dayMs);
}

export function addDays(dateStr: string, n: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d;
}

export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtRange(startStr: string, duration: number): string {
  const s = new Date(startStr);
  const e = addDays(startStr, duration - 1);
  return `${fmtDate(s)} \u2013 ${fmtDate(e)}`;
}

export function fmtSize(bytes: number): string {
  if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + " MB";
  return Math.round(bytes / 1000) + " KB";
}

export function extOf(name: string): string {
  return name.split(".").pop()!.toUpperCase();
}

export function initials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

/* ---------------------------------- tree helpers ---------------------------------- */

/** Find the top-level parent of a task (traverses parentId chain) */
export function getTopParent(task: { id: string; parentId?: string | null }, tasks: { id: string; parentId?: string | null }[]): { id: string; parentId?: string | null } | null {
  let current = task;
  const visited = new Set<string>();
  while (current.parentId) {
    if (visited.has(current.parentId)) return null; // cycle guard
    visited.add(current.parentId);
    const parent = tasks.find(t => t.id === current.parentId);
    if (!parent) return null;
    current = parent;
  }
  return current;
}

/** Get the depth of a task in the tree (root = 0) */
export function getTaskDepth(taskId: string, tasks: { id: string; parentId?: string | null }[]): number {
  let depth = 0;
  let current = tasks.find(t => t.id === taskId);
  const visited = new Set<string>();
  while (current?.parentId) {
    if (visited.has(current.parentId)) return depth; // cycle guard
    visited.add(current.parentId);
    depth++;
    current = tasks.find(t => t.id === current!.parentId);
  }
  return depth;
}

/** Get all descendant IDs (children, grandchildren, etc.) */
export function getDescendantIds(taskId: string, tasks: { id: string; parentId?: string | null }[]): string[] {
  const ids: string[] = [];
  const children = tasks.filter(t => t.parentId === taskId);
  for (const child of children) {
    ids.push(child.id);
    ids.push(...getDescendantIds(child.id, tasks));
  }
  return ids;
}

/** Get direct children of a task */
export function getDirectChildren<T extends { id: string; parentId?: string | null }>(taskId: string, tasks: T[]): T[] {
  return tasks.filter(t => t.parentId === taskId);
}

/** Build a summary of a parent task from its direct children */
export function buildParentSummary(parentId: string, tasks: { id: string; parentId?: string | null; progress: number; status: string }[]): { total: number; done: number; avgProgress: number } {
  const directChildren = getDirectChildren(parentId, tasks);
  const total = directChildren.length;
  if (total === 0) return { total: 0, done: 0, avgProgress: 0 };
  const done = directChildren.filter(t => t.status === 'done').length;
  const avgProgress = Math.round(directChildren.reduce((sum, t) => sum + t.progress, 0) / total);
  return { total, done, avgProgress };
}

/** Get the color for a task based on its top parent's position in the task list */
export function getTaskColor(taskId: string, tasks: { id: string; parentId?: string | null }[], palette: { bar: string }[]): string {
  const topParent = getTopParent(tasks.find(t => t.id === taskId)!, tasks);
  if (!topParent) return palette[0].bar;
  const topLevelParents = tasks.filter(t => !t.parentId);
  const idx = topLevelParents.findIndex(t => t.id === topParent.id);
  return palette[Math.max(0, idx % palette.length)].bar;
}

/* ---------------------------------- due-date helpers ---------------------------------- */

export type DueDateStatus = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' | 'none';

export function getDueDateStatus(dueDate: string | undefined, status: string): DueDateStatus {
  if (!dueDate) return 'none';
  if (status === 'done') return 'normal';
  const due = new Date(dueDate + 'T23:59:59');
  const now = TODAY;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + dayMs);
  const weekEnd = new Date(todayStart.getTime() + dayMs * 7);
  if (due < todayStart) return 'overdue';
  if (due < tomorrowStart) return 'today';
  if (due < weekEnd) return 'soon';
  return 'normal';
}

export function fmtDueDate(dueDate: string | undefined): string {
  if (!dueDate) return '';
  return fmtDate(dueDate);
}

export function dueDateOffsetLabel(dueDate: string | undefined, status: string): string {
  if (!dueDate) return '';
  if (status === 'done') return fmtDate(dueDate);
  const due = new Date(dueDate + 'T23:59:59');
  const todayStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const diff = Math.round((due.getTime() - todayStart.getTime()) / dayMs);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff <= 7) return `Due in ${diff}d`;
  return fmtDate(dueDate);
}

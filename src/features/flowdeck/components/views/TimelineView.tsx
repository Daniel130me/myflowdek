'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  COLORS, STATUS_META, STATUS_ORDER, TODAY, ZOOM_LEVELS,
  EPIC_PALETTE, TASK_COLOR_FALLBACK,
  offsetDays, addDays, fmtDate, fmtRange,
  getTopParent, buildParentSummary, getDirectChildren, getDescendantIds,
  type Task, type Project,
} from '@/features/flowdeck/model';
import {
  ZoomIn, ZoomOut, Filter, Rows3, LocateFixed, Diamond,
  FolderTree, Users, ChevronRight, ChevronDown, Route,
} from 'lucide-react';
import { Avatar, StatusPill, PriorityFlag, SectionHeader, ToolbarBtn, TaskCheckbox, useMemberDirectory, useProjectMembers } from '../ui';
import { FF } from '../ui/styles';
import { GridToolbar, type GridActions } from '../toolbar';
import { useViewport } from '../../hooks/useViewport';

/* ------------------------------------------------------------------ critical path ------------------------------------------------------------------ */

/** Compute critical path: tasks on the longest dependency chain */
function computeCriticalPath(allTasks: Task[]): Set<string> {
  const taskMap = new Map(allTasks.map(t => [t.id, t]));
  // Compute earliest end (longest path from any root to this task)
  const earliestEnd = new Map<string, number>();
  const visited = new Set<string>();

  function dfs(id: string): number {
    if (visited.has(id)) return earliestEnd.get(id) || 0;
    visited.add(id);
    const t = taskMap.get(id);
    if (!t) return 0;
    let maxDepEnd = 0;
    for (const depId of t.deps) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const depEnd = dfs(depId);
        const depFinish = depEnd + depTask.duration;
        if (depFinish > maxDepEnd) maxDepEnd = depFinish;
      }
    }
    const result = maxDepEnd + t.duration;
    earliestEnd.set(id, result);
    return result;
  }

  // Find max end time
  let maxEnd = 0;
  for (const t of allTasks) {
    const end = dfs(t.id);
    if (end > maxEnd) maxEnd = end;
  }

  // Backtrack: find tasks on the critical path
  const critical = new Set<string>();
  // Find task(s) that achieve maxEnd
  let currentEnd = maxEnd;
  while (true) {
    const candidates = allTasks.filter(t => !critical.has(t.id) && (earliestEnd.get(t.id) || 0) === currentEnd);
    if (candidates.length === 0) break;
    // Pick the first candidate
    const chosen = candidates[0];
    critical.add(chosen.id);
    // Find which dependency leads to the critical predecessor
    let maxPredEnd = 0;
    let predId: string | null = null;
    for (const depId of chosen.deps) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const depFinish = (earliestEnd.get(depId) || 0);
        if (depFinish > maxPredEnd) { maxPredEnd = depFinish; predId = depId; }
      }
    }
    if (predId) {
      currentEnd = maxPredEnd;
    } else {
      break;
    }
  }
  return critical;
}

/* ------------------------------------------------------------------ types ------------------------------------------------------------------ */

type GroupMode = 'parent' | 'assignee' | 'none';

interface ParentHeaderRow {
  kind: 'parent-header';
  task: Task;
  summary: { total: number; done: number; avgProgress: number };
  paletteIdx: number;
  collapsed: boolean;
}

interface AssigneeGroupRow {
  kind: 'assignee-group';
  assigneeId: string;
  label: string;
}

interface TaskRow {
  kind: 'task';
  task: Task;
  depth: number;
  paletteIdx: number;
}

type Row = ParentHeaderRow | AssigneeGroupRow | TaskRow;

type LayoutRow = Row & {
  top: number;
  height: number;
};

/* ------------------------------------------------------------------ component ------------------------------------------------------------------ */

export function TimelineView({ projectId, project, tasks, onOpenTask, onToggleComplete, onUpdateTask, grid }: {
  projectId: string;
  project: Project;
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  grid: GridActions;
}) {
  const { isMobile } = useViewport();
  // Real project members — registered into the global MemberDirectory so
  // Avatar + the assignee-grouping logic below resolve real users.
  const { members: projectMembers } = useProjectMembers(projectId);
  const { lookup } = useMemberDirectory();
  const [dayWidth, setDayWidth] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 720) ? 20 : 28);
  const [labelWidth, setLabelWidth] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 720) ? 140 : 280);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());
  const [groupMode, setGroupMode] = useState<GroupMode>('parent');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  /* Critical path computation */
  const criticalPathIds = useMemo(() => showCriticalPath ? computeCriticalPath(tasks) : new Set<string>(), [tasks, showCriticalPath]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  /* ---- Gantt bar drag ---- */
  const ganttDrag = useRef<{ taskId: string; mode: 'move' | 'resize-left' | 'resize-right'; startX: number; origStart: string; origDuration: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const didDrag = useRef(false);

  useEffect(() => {
    if (!isDragging) return;
    didDrag.current = false;
    const handleMove = (e: MouseEvent) => {
      const d = ganttDrag.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const daysDelta = Math.round(dx / dayWidth);
      if (daysDelta === 0) return;
      didDrag.current = true;
      if (d.mode === 'move') {
        const newStart = addDays(d.origStart, daysDelta);
        onUpdateTask?.(d.taskId, { start: newStart.toISOString().slice(0, 10) });
      } else if (d.mode === 'resize-right') {
        const newDuration = Math.max(1, d.origDuration + daysDelta);
        onUpdateTask?.(d.taskId, { duration: newDuration });
      } else if (d.mode === 'resize-left') {
        const newStart = addDays(d.origStart, daysDelta);
        const newDuration = Math.max(1, d.origDuration - daysDelta);
        onUpdateTask?.(d.taskId, { start: newStart.toISOString().slice(0, 10), duration: newDuration });
      }
    };
    const handleUp = () => { ganttDrag.current = null; setIsDragging(false); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isDragging, dayWidth, onUpdateTask]);

  const rowHeight = isMobile ? 44 : 38;
  const groupRowHeight = 30;
  const totalDays = offsetDays(project.end, project.start) + 6;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(project.start, i));
  const todayOffset = offsetDays(TODAY.toISOString().slice(0, 10), project.start);

  const visibleTasks = tasks.filter(t => !hiddenStatuses.has(t.status));

  /* -------------------------------------------------------- palette assignment (stable across filters) -------------------------------------------------------- */

  const paletteAssignment = (() => {
    const map = new Map<string, number>();
    let counter = 0;
    tasks.filter(t => !t.parentId && getDirectChildren(t.id, tasks).length > 0).forEach(root => {
      map.set(root.id, counter % EPIC_PALETTE.length);
      counter++;
    });
    return map;
  })();

  function getPaletteIdx(taskId: string): number {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return 0;
    if (paletteAssignment.has(task.id)) return paletteAssignment.get(task.id)!;
    const top = getTopParent(task, tasks);
    if (top && paletteAssignment.has(top.id)) return paletteAssignment.get(top.id)!;
    return 0;
  }

  function getTaskDepth(taskId: string): number {
    let depth = 0;
    let current = tasks.find(t => t.id === taskId);
    const visited = new Set<string>();
    while (current?.parentId) {
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);
      depth++;
      current = tasks.find(t => t.id === current!.parentId);
    }
    return depth;
  }

  /* -------------------------------------------------------- helpers -------------------------------------------------------- */

  function jumpToToday() {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOffset * dayWidth - 240);
  }

  function toggleStatus(s: string) {
    setHiddenStatuses(prev => {
      const next = new Set(prev);
      if (next.has(s)) { next.delete(s); } else { next.add(s); }
      return next;
    });
  }

  function toggleSelect(id: string, e: React.SyntheticEvent) {
    e.stopPropagation();
    grid.setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }

  function toggleCollapse(parentId: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) { next.delete(parentId); } else { next.add(parentId); }
      return next;
    });
  }

  function startResize(e: React.MouseEvent) {
    dragState.current = { startX: e.clientX, startWidth: labelWidth };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeUp);
  }
  function onResizeMove(e: MouseEvent) {
    if (!dragState.current) return;
    const delta = e.clientX - dragState.current.startX;
    setLabelWidth(Math.min(440, Math.max(160, dragState.current.startWidth + delta)));
  }
  function onResizeUp() {
    dragState.current = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeUp);
  }

  /* -------------------------------------------------------- build rows -------------------------------------------------------- */

  const builtRows = (() => {
    const rows: Row[] = [];
    const visibleIds = new Set(visibleTasks.map(t => t.id));

    if (groupMode === 'parent') {
      // Children map from visible tasks only
      const childrenOf = new Map<string, Task[]>();
      visibleTasks.forEach(t => {
        if (t.parentId && visibleIds.has(t.parentId)) {
          const arr = childrenOf.get(t.parentId) || [];
          arr.push(t);
          childrenOf.set(t.parentId, arr);
        }
      });

      // Roots: visible tasks with no visible parent
      const roots = visibleTasks.filter(t => !t.parentId || !visibleIds.has(t.parentId));

      const addTask = (task: Task, depth: number) => {
        const children = childrenOf.get(task.id);
        if (children && children.length > 0) {
          const collapsed = collapsedGroups.has(task.id);
          const summary = buildParentSummary(task.id, visibleTasks);
          const pIdx = paletteAssignment.has(task.id)
            ? paletteAssignment.get(task.id)!
            : getPaletteIdx(task.id);
          rows.push({ kind: 'parent-header', task, summary, paletteIdx: pIdx, collapsed });
          if (!collapsed) {
            children.forEach(c => addTask(c, depth + 1));
          }
        } else {
          rows.push({ kind: 'task', task, depth, paletteIdx: getPaletteIdx(task.id) });
        }
      };

      roots.forEach(r => addTask(r, 0));

    } else if (groupMode === 'assignee') {
      // Group by assignee using real project members (falling back to the
      // global directory so any task whose assignee isn't a current
      // project member still shows up under a labelled group).
      const seen = new Set<string>();
      // First, project members (ordered)…
      projectMembers.forEach(m => {
        const mine = visibleTasks.filter(t => t.assignee === m.id);
        if (!mine.length) return;
        seen.add(m.id);
        rows.push({ kind: 'assignee-group', assigneeId: m.id, label: m.name });
        mine.forEach(t => rows.push({ kind: 'task', task: t, depth: 0, paletteIdx: getPaletteIdx(t.id) }));
      });
      // …then any remaining assignees that have tasks but aren't in the
      // project members list (e.g. a former member who still owns tasks).
      visibleTasks.forEach(t => {
        if (seen.has(t.assignee)) return;
        seen.add(t.assignee);
        const info = lookup(t.assignee);
        const mine = visibleTasks.filter(x => x.assignee === t.assignee);
        if (!mine.length) return;
        rows.push({ kind: 'assignee-group', assigneeId: t.assignee, label: info?.name ?? 'Unassigned' });
        mine.forEach(x => rows.push({ kind: 'task', task: x, depth: 0, paletteIdx: getPaletteIdx(x.id) }));
      });

    } else {
      // none – flat list with tree-depth indentation
      visibleTasks.forEach(t => {
        rows.push({ kind: 'task', task: t, depth: getTaskDepth(t.id), paletteIdx: getPaletteIdx(t.id) });
      });
    }

    return rows;
  })();

  /* -------------------------------------------------------- layout -------------------------------------------------------- */

  const rowsWithLayout: LayoutRow[] = (() => {
    let top = 0;
    return builtRows.map(r => {
      const height = r.kind === 'assignee-group' ? groupRowHeight : rowHeight;
      const lr: LayoutRow = { ...r, top, height } as LayoutRow;
      top += height;
      return lr;
    });
  })();

  const gridHeight = rowsWithLayout.reduce((sum, r) => sum + r.height, 0);

  const taskTop: Record<string, { top: number; height: number }> = {};
  rowsWithLayout.forEach(r => {
    if (r.kind === 'task') {
      taskTop[r.task.id] = { top: r.top, height: r.height };
    }
  });

  // Set of task IDs that are rendered (for dep line filtering)
  const renderedTaskIds = new Set<string>();
  rowsWithLayout.forEach(r => { if (r.kind === 'task') renderedTaskIds.add(r.task.id); });

  // Dependency lines
  const deps: { px: number; py: number; cx: number; cy: number; id: string }[] = [];
  visibleTasks.forEach(t => {
    t.deps.forEach(depId => {
      if (!renderedTaskIds.has(t.id) || !renderedTaskIds.has(depId)) return;
      const parent = visibleTasks.find(p => p.id === depId);
      const pRow = parent && taskTop[parent.id];
      const cRow = taskTop[t.id];
      if (!pRow || !cRow) return;
      const px = offsetDays(parent.start, project.start) * dayWidth + parent.duration * dayWidth;
      const py = pRow.top + pRow.height / 2;
      const cx = offsetDays(t.start, project.start) * dayWidth;
      const cy = cRow.top + cRow.height / 2;
      deps.push({ px, py, cx, cy, id: `${depId}-${t.id}` });
    });
  });

  /* -------------------------------------------------------- summary bar range helper -------------------------------------------------------- */

  function getSummaryRange(parentTaskId: string): { left: number; width: number } {
    const descIds = new Set([parentTaskId, ...getDescendantIds(parentTaskId, visibleTasks)]);
    const relevant = visibleTasks.filter(t => descIds.has(t.id));
    if (relevant.length === 0) return { left: 0, width: 10 };
    const minStart = Math.min(...relevant.map(t => offsetDays(t.start, project.start)));
    const maxEnd = Math.max(...relevant.map(t => offsetDays(t.start, project.start) + t.duration));
    return { left: minStart * dayWidth, width: Math.max((maxEnd - minStart) * dayWidth - 4, 10) };
  }

  /* -------------------------------------------------------- group mode buttons config -------------------------------------------------------- */

  const groupButtons: { mode: GroupMode; icon: React.FC<{ size?: number }> ; label: string }[] = [
    { mode: 'parent', icon: FolderTree, label: 'Parent' },
    { mode: 'assignee', icon: Users, label: 'Assignee' },
    { mode: 'none', icon: Rows3, label: 'Flat' },
  ];

  /* ======================================================== MOBILE VIEW ======================================================== */

  if (isMobile) {
    // Build mobile groups
    const mobileGroups = (() => {
      if (groupMode === 'parent') {
        const groups: { parentId: string; parentTask: Task; children: Task[]; summary: ReturnType<typeof buildParentSummary>; pIdx: number }[] = [];
        const visibleIds = new Set(visibleTasks.map(t => t.id));
        const childrenOf = new Map<string, Task[]>();
        visibleTasks.forEach(t => {
          if (t.parentId && visibleIds.has(t.parentId)) {
            const arr = childrenOf.get(t.parentId) || [];
            arr.push(t);
            childrenOf.set(t.parentId, arr);
          }
        });
        const roots = visibleTasks.filter(t => !t.parentId || !visibleIds.has(t.parentId));
        const added = new Set<string>();
        roots.forEach(r => {
          const children = childrenOf.get(r.id);
          if (children && children.length > 0) {
            added.add(r.id);
            children.forEach(c => added.add(c.id));
            groups.push({
              parentId: r.id,
              parentTask: r,
              children,
              summary: buildParentSummary(r.id, visibleTasks),
              pIdx: paletteAssignment.has(r.id) ? paletteAssignment.get(r.id)! : getPaletteIdx(r.id),
            });
          }
        });
        const orphans = visibleTasks.filter(t => !added.has(t.id));
        return { groups, orphans, childrenOf };
      }
      return { groups: [], orphans: visibleTasks, childrenOf: new Map<string, Task[]>() };
    })();

    const mobileAssigneeGroups = (() => {
      if (groupMode === 'assignee') {
        const groups: { memberId: string; name: string; items: Task[] }[] = [];
        const seen = new Set<string>();
        projectMembers.forEach(m => {
          const mine = visibleTasks.filter(t => t.assignee === m.id);
          if (mine.length) {
            seen.add(m.id);
            groups.push({ memberId: m.id, name: m.name, items: mine });
          }
        });
        // Catch any remaining assignees not in the project members list.
        visibleTasks.forEach(t => {
          if (seen.has(t.assignee)) return;
          seen.add(t.assignee);
          const mine = visibleTasks.filter(x => x.assignee === t.assignee);
          if (!mine.length) return;
          const info = lookup(t.assignee);
          groups.push({ memberId: t.assignee, name: info?.name ?? 'Unassigned', items: mine });
        });
        return groups;
      }
      return [];
    })();

    return (
      <div>
        <GridToolbar projectId={projectId} tasks={tasks} grid={grid} members={projectMembers} />
        <SectionHeader title="Timeline" subtitle="Tap a task to view details" />

        {/* Group mode selector */}
        <div style={{ display: 'flex', border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
          {groupButtons.map(btn => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.mode}
                onClick={() => setGroupMode(btn.mode)}
                style={{
                  flex: 1,
                  border: 'none',
                  padding: '8px 6px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: groupMode === btn.mode ? COLORS.ink : '#F3F4F6',
                  color: groupMode === btn.mode ? '#FFFFFF' : COLORS.ink,
                  fontFamily: FF,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Icon size={13} />
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Parent mode */}
        {groupMode === 'parent' && mobileGroups.groups.map(g => {
          const collapsed = collapsedGroups.has(g.parentId);
          const barColor = EPIC_PALETTE[g.pIdx].bar;
          return (
            <div key={g.parentId} style={{ marginBottom: 12 }}>
              <div
                onClick={() => toggleCollapse(g.parentId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px',
                  background: EPIC_PALETTE[g.pIdx].bg,
                  borderRadius: 10,
                  cursor: 'pointer',
                  marginBottom: collapsed ? 0 : 6,
                }}
              >
                {collapsed
                  ? <ChevronRight size={14} color={EPIC_PALETTE[g.pIdx].bar} style={{ flexShrink: 0 }} />
                  : <ChevronDown size={14} color={EPIC_PALETTE[g.pIdx].bar} style={{ flexShrink: 0 }} />
                }
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, fontFamily: FF, color: EPIC_PALETTE[g.pIdx].text }}>{g.parentTask.name}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, fontFamily: FF,
                  color: EPIC_PALETTE[g.pIdx].text,
                  background: `${barColor}22`,
                  padding: '2px 8px', borderRadius: 9999, whiteSpace: 'nowrap',
                }}>
                  {g.summary.done}/{g.summary.total} · {g.summary.avgProgress}%
                </span>
              </div>
              {!collapsed && g.children.map(child => {
                const meta = STATUS_META[child.status];
                const cColor = barColor;
                const barRight = offsetDays(project.end, project.start);
                const barLeft = offsetDays(child.start, project.start);
                const barW = barRight > 0 ? ((child.duration / barRight) * 100) : 20;
                const barS = barRight > 0 ? ((barLeft / barRight) * 100) : 0;
                return (
                  <div
                    key={child.id}
                    onClick={() => onOpenTask(child.id)}
                    style={{
                      background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
                      padding: '12px 14px', marginBottom: 6, cursor: 'pointer', marginLeft: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <TaskCheckbox done={child.status === 'done'} onToggle={e => { e.stopPropagation(); onToggleComplete(child.id); }} size={18} />
                      <Avatar id={child.assignee} size={22} />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: child.status === 'done' ? 'line-through' : 'none', color: child.status === 'done' ? COLORS.gray : COLORS.ink }}>{child.name}</span>
                      <PriorityFlag priority={child.priority} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{fmtRange(child.start, child.duration)}</span>
                      <StatusPill status={child.status} />
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{child.progress}%</span>
                    </div>
                    <div style={{ position: 'relative', height: 8, background: COLORS.line, borderRadius: 4 }}>
                      <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: `${cColor}33`, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS)}%` }} />
                      <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: cColor, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS) * (child.progress / 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Orphan tasks in parent mode (root tasks without children) */}
        {groupMode === 'parent' && mobileGroups.orphans.map(t => {
          const meta = STATUS_META[t.status];
          const barColor = EPIC_PALETTE[getPaletteIdx(t.id)].bar;
          const barRight = offsetDays(project.end, project.start);
          const barLeft = offsetDays(t.start, project.start);
          const barW = barRight > 0 ? ((t.duration / barRight) * 100) : 20;
          const barS = barRight > 0 ? ((barLeft / barRight) * 100) : 0;
          return (
            <div
              key={t.id}
              onClick={() => onOpenTask(t.id)}
              style={{
                background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
                padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <TaskCheckbox done={t.status === 'done'} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={18} />
                <Avatar id={t.assignee} size={22} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? COLORS.gray : COLORS.ink }}>{t.name}</span>
                <PriorityFlag priority={t.priority} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{fmtRange(t.start, t.duration)}</span>
                <StatusPill status={t.status} />
                <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{t.progress}%</span>
              </div>
              <div style={{ position: 'relative', height: 8, background: COLORS.line, borderRadius: 4 }}>
                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: `${barColor}33`, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS)}%` }} />
                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: barColor, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS) * (t.progress / 100)}%` }} />
              </div>
            </div>
          );
        })}

        {/* Assignee mode */}
        {groupMode === 'assignee' && mobileAssigneeGroups.map(g => (
          <div key={g.memberId} style={{ marginBottom: 12 }}>
            <div style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 700, fontFamily: FF,
              color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
            }}>{g.name}</div>
            {g.items.map(t => {
              const meta = STATUS_META[t.status];
              const barColor = EPIC_PALETTE[getPaletteIdx(t.id)].bar;
              const barRight = offsetDays(project.end, project.start);
              const barLeft = offsetDays(t.start, project.start);
              const barW = barRight > 0 ? ((t.duration / barRight) * 100) : 20;
              const barS = barRight > 0 ? ((barLeft / barRight) * 100) : 0;
              return (
                <div
                  key={t.id}
                  onClick={() => onOpenTask(t.id)}
                  style={{
                    background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
                    padding: '12px 14px', marginBottom: 6, cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <TaskCheckbox done={t.status === 'done'} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={18} />
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? COLORS.gray : COLORS.ink }}>{t.name}</span>
                    <PriorityFlag priority={t.priority} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{fmtRange(t.start, t.duration)}</span>
                    <StatusPill status={t.status} />
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{t.progress}%</span>
                  </div>
                  <div style={{ position: 'relative', height: 8, background: COLORS.line, borderRadius: 4 }}>
                    <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: `${barColor}33`, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS)}%` }} />
                    <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: barColor, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS) * (t.progress / 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* None mode */}
        {groupMode === 'none' && visibleTasks.map(t => {
          const meta = STATUS_META[t.status];
          const barColor = EPIC_PALETTE[getPaletteIdx(t.id)].bar;
          const barRight = offsetDays(project.end, project.start);
          const barLeft = offsetDays(t.start, project.start);
          const barW = barRight > 0 ? ((t.duration / barRight) * 100) : 20;
          const barS = barRight > 0 ? ((barLeft / barRight) * 100) : 0;
          return (
            <div
              key={t.id}
              onClick={() => onOpenTask(t.id)}
              style={{
                background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12,
                padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input type="checkbox" checked={grid.selectedIds.has(t.id)} onChange={e => toggleSelect(t.id, e)} onClick={e => e.stopPropagation()} style={{ flexShrink: 0, width: 18, height: 18 }} />
                <Avatar id={t.assignee} size={22} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                <PriorityFlag priority={t.priority} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{fmtRange(t.start, t.duration)}</span>
                <StatusPill status={t.status} />
                <span style={{ marginLeft: 'auto', fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{t.progress}%</span>
              </div>
              <div style={{ position: 'relative', height: 8, background: COLORS.line, borderRadius: 4 }}>
                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: `${barColor}33`, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS)}%` }} />
                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 4, background: barColor, left: `${Math.min(barS, 95)}%`, width: `${Math.min(barW, 100 - barS) * (t.progress / 100)}%` }} />
              </div>
            </div>
          );
        })}

        {visibleTasks.length === 0 && (
          <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, padding: 24, fontFamily: FF }}>No tasks match your filter.</div>
        )}
      </div>
    );
  }

  /* ======================================================== DESKTOP GANTT VIEW ======================================================== */

  return (
    <div>
      <GridToolbar projectId={projectId} tasks={tasks} grid={grid} members={projectMembers} />
      <SectionHeader title="Timeline" subtitle="Click a bar to view or edit task details · lines show dependencies" />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {/* Group mode buttons */}
        <div style={{ display: 'flex', border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {groupButtons.map(btn => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.mode}
                onClick={() => setGroupMode(btn.mode)}
                style={{
                  border: 'none',
                  padding: '6px 11px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: groupMode === btn.mode ? COLORS.ink : '#F3F4F6',
                  color: groupMode === btn.mode ? '#FFFFFF' : COLORS.ink,
                  fontFamily: FF,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Icon size={13} />
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Zoom levels */}
        <div style={{ display: 'flex', border: `1px solid ${COLORS.line}`, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          {ZOOM_LEVELS.map(z => (
            <button
              key={z.label}
              onClick={() => setDayWidth(z.width)}
              style={{
                border: 'none', padding: '6px 11px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                background: dayWidth === z.width ? COLORS.ink : '#F3F4F6',
                color: dayWidth === z.width ? '#FFFFFF' : COLORS.ink,
                fontFamily: FF,
              }}
            >
              {z.label}
            </button>
          ))}
        </div>

        {/* Zoom in/out */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
          <ToolbarBtn icon={ZoomOut} onClick={() => setDayWidth(w => Math.max(10, w - 4))} title="Zoom out" />
          <ToolbarBtn icon={ZoomIn} onClick={() => setDayWidth(w => Math.min(56, w + 4))} title="Zoom in" />
        </div>

        <div style={{ width: 1, height: 22, background: COLORS.line, margin: '0 2px', flexShrink: 0 }} />

        <ToolbarBtn icon={LocateFixed} label="Today" onClick={jumpToToday} title="Jump to today" />

        {/* Filter */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ToolbarBtn
            icon={Filter}
            label={`Filter${hiddenStatuses.size ? ` (${STATUS_ORDER.length - hiddenStatuses.size})` : ''}`}
            onClick={() => setFilterMenuOpen(o => !o)}
            active={filterMenuOpen}
          />
          {filterMenuOpen && (
            <div style={{
              position: 'absolute', top: 34, left: 0, background: '#FFFFFF',
              border: `1px solid ${COLORS.line}`, borderRadius: 10,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
              width: 180, zIndex: 20, padding: 8,
            }}>
              {STATUS_ORDER.map(s => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 12.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!hiddenStatuses.has(s)} onChange={() => toggleStatus(s)} />
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_META[s].color }} />
                  {STATUS_META[s].label}
                </label>
              ))}
            </div>
          )}
        </div>

        <ToolbarBtn icon={Route} label="Critical Path" onClick={() => setShowCriticalPath(o => !o)} active={showCriticalPath} title="Highlight the longest dependency chain" />

        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: COLORS.gray, whiteSpace: 'nowrap', fontFamily: FF }}>Drag the divider to resize the task column →</span>
      </div>

      {/* Gantt chart container */}
      <div
        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'hidden' }}
        onClick={() => setFilterMenuOpen(false)}
      >
        <div style={{ display: 'flex' }}>

          {/* ---- Left: Labels ---- */}
          <div style={{ width: labelWidth, flexShrink: 0, borderRight: `1px solid ${COLORS.line}`, position: 'relative' }}>
            {/* Header */}
            <div style={{
              height: 52, borderBottom: `1px solid ${COLORS.line}`,
              display: 'flex', alignItems: 'center', padding: '0 14px',
              fontSize: 12, fontWeight: 700, color: COLORS.gray, letterSpacing: 0.8, fontFamily: FF,
            }}>TASK</div>

            {/* Rows */}
            {rowsWithLayout.map(r => {
              if (r.kind === 'assignee-group') {
                return (
                  <div key={`ag-${r.assigneeId}`} style={{
                    height: r.height, display: 'flex', alignItems: 'center', padding: '0 14px',
                    background: '#F9FAFB', borderBottom: `1px solid ${COLORS.line}`,
                    fontSize: 11, fontWeight: 700, color: COLORS.gray,
                    textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FF,
                  }}>{r.label}</div>
                );
              }

              if (r.kind === 'parent-header') {
                const pal = EPIC_PALETTE[r.paletteIdx];
                const ChevronIcon = r.collapsed ? ChevronRight : ChevronDown;
                return (
                  <div key={`ph-${r.task.id}`} style={{
                    height: r.height, display: 'flex', alignItems: 'center', gap: 7,
                    padding: '0 14px', borderBottom: `1px solid ${COLORS.line}`,
                    background: pal.bg, cursor: 'pointer',
                  }} onClick={() => toggleCollapse(r.task.id)}>
                    <ChevronIcon size={14} color={pal.bar} style={{ flexShrink: 0 }} />
                    <input
                      type="checkbox"
                      checked={grid.selectedIds.has(r.task.id)}
                      onChange={e => toggleSelect(r.task.id, e)}
                      onClick={e => e.stopPropagation()}
                      style={{ flexShrink: 0 }}
                    />
                    {r.task.milestone && <Diamond size={11} color={COLORS.accent} fill={COLORS.accent} style={{ flexShrink: 0 }} />}
                    <Avatar id={r.task.assignee} size={20} />
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: 700, fontFamily: FF, flex: 1,
                    }}>{r.task.name}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, fontFamily: FF, color: pal.text,
                      background: `${pal.bar}22`, padding: '2px 8px', borderRadius: 9999,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{r.summary.done}/{r.summary.total} · {r.summary.avgProgress}%</span>
                  </div>
                );
              }

              // kind === 'task'
              const t = r.task;
              const depth = r.depth;
              const pal = EPIC_PALETTE[r.paletteIdx];
              return (
                <div
                  key={t.id}
                  onClick={() => onOpenTask(t.id)}
                  onMouseEnter={() => setHoverId(t.id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    height: r.height, display: 'flex', alignItems: 'center', gap: 7,
                    padding: `0 14px 0 ${14 + depth * 16}px`,
                    borderBottom: `1px solid ${COLORS.line}`, cursor: 'pointer', fontSize: 12.5,
                    background: grid.selectedIds.has(t.id) ? COLORS.accentSoft : hoverId === t.id ? COLORS.paper : 'transparent',
                    fontFamily: FF,
                  }}
                >
                  <TaskCheckbox done={t.status === 'done'} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={16} />
                  <input
                    type="checkbox"
                    checked={grid.selectedIds.has(t.id)}
                    onChange={e => toggleSelect(t.id, e)}
                    onClick={e => e.stopPropagation()}
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: pal.bar, flexShrink: 0 }} />
                  {t.milestone && <Diamond size={11} color={COLORS.accent} fill={COLORS.accent} style={{ flexShrink: 0 }} />}
                  <Avatar id={t.assignee} size={20} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: t.bold ? 800 : 400, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? COLORS.gray : COLORS.ink }}>{t.name}</span>
                </div>
              );
            })}

            {/* Resize handle */}
            <div
              onMouseDown={startResize}
              style={{ position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 5 }}
            />
          </div>

          {/* ---- Right: Gantt chart ---- */}
          <div ref={scrollRef} style={{ overflowX: 'auto', flex: 1 }}>
            <div style={{ position: 'relative', width: totalDays * dayWidth }}>
              {/* Date header */}
              <div style={{ height: 52, borderBottom: `1px solid ${COLORS.line}`, display: 'flex' }}>
                {days.map((d, i) => (
                  <div key={i} style={{
                    width: dayWidth, flexShrink: 0, textAlign: 'center',
                    fontSize: dayWidth < 20 ? 0 : 10.5, color: COLORS.gray,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    background: [0, 6].includes(d.getDay()) ? '#F9FAFB' : 'transparent',
                    borderLeft: d.getDate() === 1 ? `1px solid ${COLORS.line}` : 'none',
                  }}>
                    {(i === 0 || d.getDate() === 1) && (
                      <div style={{ fontWeight: 700, color: COLORS.ink, fontSize: 10.5 }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                    )}
                    {dayWidth >= 20 && <div>{d.getDate()}</div>}
                  </div>
                ))}
              </div>

              {/* Chart body */}
              <div style={{ position: 'relative', height: gridHeight }}>
                {/* Row backgrounds */}
                {rowsWithLayout.map(r => {
                  const bg = r.kind === 'parent-header'
                    ? EPIC_PALETTE[r.paletteIdx].bg
                    : r.kind === 'assignee-group'
                      ? '#F9FAFB'
                      : 'transparent';
                  return (
                    <div
                      key={r.kind === 'parent-header' ? `bg-${r.task.id}` : r.kind === 'assignee-group' ? `bg-ag-${r.assigneeId}` : `bg-${r.task.id}`}
                      style={{ position: 'absolute', top: r.top, left: 0, right: 0, height: r.height, borderBottom: `1px solid ${COLORS.line}`, background: bg }}
                    />
                  );
                })}

                {/* Today marker */}
                {todayOffset >= 0 && todayOffset < totalDays && (
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayOffset * dayWidth, width: 2, background: COLORS.accent, zIndex: 3 }}>
                    <div style={{ position: 'absolute', top: -18, left: -18, fontSize: 10, color: COLORS.accent, fontWeight: 700, width: 40 }}>TODAY</div>
                  </div>
                )}

                {/* Dependency lines */}
                <svg width={totalDays * dayWidth} height={gridHeight} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
                  {deps.map(d => {
                    const midX = d.px + 10;
                    return <path key={d.id} d={`M ${d.px} ${d.py} H ${midX} V ${d.cy} H ${d.cx}`} fill="none" stroke="#E5E7EB" strokeWidth={1.5} />;
                  })}
                </svg>

                {/* Bars */}
                {rowsWithLayout.map(r => {
                  if (r.kind === 'assignee-group') return null;

                  if (r.kind === 'parent-header') {
                    // Summary bar
                    const parentTask = r.task;
                    const barColor = EPIC_PALETTE[r.paletteIdx].bar;
                    const range = getSummaryRange(parentTask.id);

                    if (parentTask.milestone) {
                      const size = 16;
                      return (
                        <div
                          key={parentTask.id}
                          onClick={() => onOpenTask(parentTask.id)}
                          title={`${parentTask.name} · milestone · ${fmtDate(parentTask.start)}`}
                          style={{
                            position: 'absolute',
                            top: r.top + (r.height - size) / 2,
                            left: offsetDays(parentTask.start, project.start) * dayWidth - size / 2,
                            width: size, height: size,
                            background: barColor, transform: 'rotate(45deg)', borderRadius: 3,
                            cursor: 'pointer', zIndex: 2,
                            boxShadow: hoverId === parentTask.id ? '0 2px 6px rgba(31,33,36,0.25)' : 'none',
                          }}
                          onMouseEnter={() => setHoverId(parentTask.id)}
                          onMouseLeave={() => setHoverId(null)}
                        />
                      );
                    }

                    return (
                      <div
                        key={parentTask.id}
                        onClick={() => onOpenTask(parentTask.id)}
                        onMouseEnter={() => setHoverId(parentTask.id)}
                        onMouseLeave={() => setHoverId(null)}
                        title={`${parentTask.name} · ${r.summary.done}/${r.summary.total} tasks · ${r.summary.avgProgress}%`}
                        style={{
                          position: 'absolute', top: r.top + 5, left: range.left,
                          width: range.width, height: r.height - 10,
                          borderRadius: 6,
                          background: `${barColor}22`,
                          border: `1.5px solid ${barColor}66`,
                          cursor: 'pointer', zIndex: 2, overflow: 'hidden',
                          boxShadow: hoverId === parentTask.id ? '0 2px 6px rgba(31,33,36,0.15)' : 'none',
                        }}
                      >
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${r.summary.avgProgress}%`,
                          background: `${barColor}55`,
                        }} />
                        {range.width > 100 && dayWidth >= 16 && (
                          <span style={{
                            position: 'relative', fontSize: 10.5, fontWeight: 700,
                            lineHeight: `${r.height - 10}px`, paddingLeft: 8,
                            color: barColor, whiteSpace: 'nowrap', fontFamily: FF,
                          }}>
                            {parentTask.name} · {r.summary.done}/{r.summary.total}
                          </span>
                        )}
                      </div>
                    );
                  }

                  // kind === 'task'
                  const t = r.task;
                  const isCritical = criticalPathIds.has(t.id);
                  const barColor = isCritical ? COLORS.red : EPIC_PALETTE[r.paletteIdx].bar;
                  const left = offsetDays(t.start, project.start) * dayWidth;

                  if (t.milestone) {
                    const size = 16;
                    return (
                      <div
                        key={t.id}
                        onClick={() => onOpenTask(t.id)}
                        title={`${t.name} · milestone · ${fmtDate(t.start)}`}
                        style={{
                          position: 'absolute',
                          top: r.top + (r.height - size) / 2,
                          left: left - size / 2,
                          width: size, height: size,
                          background: barColor, transform: 'rotate(45deg)', borderRadius: 3,
                          cursor: 'pointer', zIndex: 2,
                          boxShadow: hoverId === t.id ? '0 2px 6px rgba(31,33,36,0.25)' : 'none',
                        }}
                        onMouseEnter={() => setHoverId(t.id)}
                        onMouseLeave={() => setHoverId(null)}
                      />
                    );
                  }

                  const width = Math.max(t.duration * dayWidth - 4, 10);
                  const makeResizeHandler = (mode: 'resize-left' | 'resize-right') => (ev: React.MouseEvent) => {
                    ev.stopPropagation();
                    ganttDrag.current = { taskId: t.id, mode, startX: ev.clientX, origStart: t.start, origDuration: t.duration };
                    setIsDragging(true);
                  };
                  const leftResizeStyle: React.CSSProperties = { position: 'absolute', left: -3, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 3 };
                  const rightResizeStyle: React.CSSProperties = { position: 'absolute', right: -3, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 3 };
                  return (
                    <div
                      key={t.id}
                      onMouseEnter={() => setHoverId(t.id)}
                      onMouseLeave={() => setHoverId(null)}
                      title={`${t.name} · ${fmtRange(t.start, t.duration)} · drag to move, edges to resize`}
                      style={{
                        position: 'absolute', top: r.top + 7, left, width,
                        height: r.height - 14, borderRadius: 6,
                        background: `${barColor}22`,
                        border: `1px solid ${barColor}88`,
                        cursor: 'grab', zIndex: 2, overflow: 'visible',
                        boxShadow: hoverId === t.id ? '0 2px 6px rgba(31,33,36,0.15)' : 'none',
                      }}
                      onMouseDown={e => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        ganttDrag.current = { taskId: t.id, mode: 'move', startX: e.clientX, origStart: t.start, origDuration: t.duration };
                        setIsDragging(true);
                      }}
                      onClick={() => { if (!didDrag.current) onOpenTask(t.id); }}
                    >
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${t.progress}%`, background: barColor, opacity: 0.9, borderRadius: 6, pointerEvents: 'none' }} />
                      {onUpdateTask && <div onMouseDown={makeResizeHandler('resize-left')} style={leftResizeStyle} />}
                      {onUpdateTask && <div onMouseDown={makeResizeHandler('resize-right')} style={rightResizeStyle} />}
                      {width > 60 && dayWidth >= 16 && (
                        <span style={{ position: 'relative', fontSize: 11, fontWeight: t.bold ? 800 : 600, lineHeight: `${r.height - 14}px`, paddingLeft: 8, color: t.progress > 45 ? '#FFFFFF' : COLORS.ink, whiteSpace: 'nowrap', fontFamily: FF, pointerEvents: 'none' }}>{t.name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

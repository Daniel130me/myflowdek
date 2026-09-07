'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, Repeat, Layers } from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable, closestCorners,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PRIORITY_META, COLORS, STATUS_META, STATUS_ORDER, getDueDateStatus, DUE_STATUS, dueDateOffsetLabel, type Task, type FileItem, type Tag, type Project } from '@/features/flowdeck/model';
import { Avatar, PriorityFlag, SectionHeader, FileThumbnailGrid, TaskCheckbox, TagPills, TagFilterBar, FF, TaskContextMenu, InlineTaskName, useMemberDirectory } from '../ui';
import { useViewport } from '../../hooks/useViewport';

/**
 * Pointer distance (px) required before a drag activates. Keeps clicks and
 * scroll gestures working on touch while still allowing a real drag.
 */
const DRAG_ACTIVATION_DISTANCE = 6;

/**
 * Window (ms) after a drop in which a card's click handler is ignored —
 * some browsers fire a trailing click after pointer-up, which would open
 * the task you just dragged.
 */
const DRAG_CLICK_SUPPRESS_MS = 200;

/* Helper: compute next occurrence date for recurring badge tooltip */
function computeNextBoardDate(dateStr: string, recurrence: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    default: return dateStr;
  }
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface BoardViewProps {
  tasks: Task[];
  files?: FileItem[];
  tags?: Tag[];
  projects?: Record<string, Project>;
  currentProjectId?: string | null;
  allTasks?: Task[];
  onOpenTask: (id: string) => void;
  onMove: (id: string, status: string) => void;
  onToggleComplete: (id: string) => void;
  onReorder: (taskId: string, toIndex: number) => void;
  onQuickAdd: (name: string, status: string) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onRemoveTask?: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onToggleTaskTag?: (taskId: string, tagId: string) => void;
  onMoveToProject?: (taskId: string, targetProjectId: string) => void;
  onPromoteSubtask?: (taskId: string) => void;
  onDemoteToSubtask?: (taskId: string, newParentId: string) => void;
  /* #31/#35: Recurrence & section assignment in context menu */
  onSetRecurrence?: (taskId: string, recurrence: string | undefined) => void;
}

/**
 * Everything the per-card components need besides the task itself. Bundled
 * once so SortableTaskCard/BoardCardBody stay readable instead of carrying
 * fifteen parallel props.
 */
interface CardBundle {
  tagMap: Record<string, Tag>;
  filesByTask: Record<string, FileItem[]>;
  tags: Tag[];
  projects?: Record<string, Project>;
  currentProjectId?: string | null;
  allTasks: Task[];
  isMobile: boolean;
  onOpenTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onRemoveTask?: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onToggleTaskTag?: (taskId: string, tagId: string) => void;
  onMoveToProject?: (taskId: string, targetProjectId: string) => void;
  onPromoteSubtask?: (taskId: string) => void;
  onDemoteToSubtask?: (taskId: string, newParentId: string) => void;
  onSetRecurrence?: (taskId: string, recurrence: string | undefined) => void;
  /** Timestamp (Date.now()) of the last drop — used to swallow ghost clicks. */
  lastDropAt: React.MutableRefObject<number>;
}

/* ------------------------------------------------------------------ */
/*  BoardCardBody — the card's visual content (drag-agnostic)          */
/* ------------------------------------------------------------------ */
function BoardCardBody({ task: t, bundle }: { task: Task; bundle: CardBundle }) {
  const { tagMap, filesByTask, isMobile, onOpenTask, onToggleComplete, onUpdateTask } = bundle;
  const tFiles = filesByTask[t.id] || [];
  const dueStatus = getDueDateStatus(t.dueDate, t.status);
  const dueMeta = DUE_STATUS[dueStatus];
  const isDone = t.status === 'done';
  const meta = STATUS_META[t.status];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div onClick={e => { e.stopPropagation(); onToggleComplete(t.id); }} style={{ marginTop: 1 }}>
          <TaskCheckbox done={isDone} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineTaskName
            name={t.name}
            isDone={isDone}
            style={{ fontSize: isMobile ? 14 : 13, marginBottom: 4, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? COLORS.gray : COLORS.ink }}
            onSave={(newName) => onUpdateTask?.(t.id, { name: newName })}
            onOpenTask={() => onOpenTask(t.id)}
          />
          {t.description && (
            <div style={{ fontSize: 12, color: COLORS.gray, lineHeight: 1.4, fontFamily: FF, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', marginBottom: 6 }}>{t.description}</div>
          )}
          {t.tags && t.tags.length > 0 && (
            <div style={{ marginBottom: 6 }}><TagPills tags={t.tags} tagMap={tagMap} /></div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {t.recurrence && (
              <span title={t.dueDate ? `Next: ${computeNextBoardDate(t.dueDate, t.recurrence)}` : 'Recurring task'} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#0891B2', background: '#CFFAFE', padding: '2px 7px', borderRadius: 9999, fontFamily: FF }}><Repeat size={9} />{t.recurrence}</span>
            )}
            {t.dueDate && dueStatus !== 'none' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: FF, padding: '2px 8px', borderRadius: 9999, background: dueMeta.bg, color: dueMeta.color }}>{dueDateOffsetLabel(t.dueDate, t.status)}</span>
            )}
          </div>
        </div>
      </div>

      {tFiles.length > 0 && (
        <div style={{ marginBottom: 8, marginLeft: 26 }}><FileThumbnailGrid files={tFiles} max={3} /></div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: 26 }}>
        <PriorityFlag priority={t.priority} />
        <Avatar id={t.assignee} size={22} />
      </div>

      <div style={{ marginTop: 8, height: 4, background: COLORS.line, borderRadius: 2, marginLeft: 26 }}>
        <div style={{ width: `${t.progress}%`, height: '100%', borderRadius: 2, background: meta.color }} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SortableTaskCard — dnd-kit wrapper (audit C-08)                     */
/*                                                                      */
/*  The previous card used native HTML5 drag events, which never fire   */
/*  on touch devices, and was a plain div — unreachable by keyboard.    */
/*  useSortable provides pointer + touch dragging and exposes the       */
/*  KeyboardSensor's handles (Space lifts, arrows move, Space drops),  */
/*  along with role="button" + tabIndex for focus and screen readers.   */
/*  The right-click context menu is kept as a non-drag fallback.        */
/* ------------------------------------------------------------------ */
function SortableTaskCard({ task, columnKey, bundle }: { task: Task; columnKey: string; bundle: CardBundle }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status, columnKey },
  });
  const { onOpenTask, lastDropAt } = bundle;

  function handleClick() {
    if (Date.now() - lastDropAt.current < DRAG_CLICK_SUPPRESS_MS) return;
    onOpenTask(task.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // dnd-kit's KeyboardSensor owns Space (lift/drop) and the arrow keys;
    // its handler arrives via `listeners`. Enter is ours: open the task.
    // (This prop intentionally overrides the spread listener — it delegates
    // everything non-Enter back to the sensor.)
    if (e.key === 'Enter' && !isDragging) {
      e.preventDefault();
      onOpenTask(task.id);
      return;
    }
    listeners?.onKeyDown?.(e);
  }

  return (
    <TaskContextMenu
      task={task}
      tags={bundle.tags}
      projects={bundle.projects}
      currentProjectId={bundle.currentProjectId}
      allTasks={bundle.allTasks}
      onOpenTask={bundle.onOpenTask}
      onToggleComplete={bundle.onToggleComplete}
      onUpdateTask={bundle.onUpdateTask || (() => {})}
      onDeleteTask={bundle.onRemoveTask || (() => {})}
      onDuplicateTask={bundle.onDuplicateTask}
      onToggleTag={bundle.onToggleTaskTag}
      onMoveToProject={bundle.onMoveToProject}
      onPromoteSubtask={bundle.onPromoteSubtask}
      onDemoteToSubtask={bundle.onDemoteToSubtask}
      onSetRecurrence={bundle.onSetRecurrence}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: bundle.isMobile ? 14 : 12,
          cursor: 'grab',
          border: `1px solid ${COLORS.line}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          opacity: isDragging ? 0.4 : 1,
          transform: CSS.Translate.toString(transform),
          transition,
          // Allow vertical page scroll on touch; drags still activate via
          // the pointer-distance constraint.
          touchAction: 'manipulation' as any,
        }}
      >
        <BoardCardBody task={task} bundle={bundle} />
      </div>
    </TaskContextMenu>
  );
}

/* ------------------------------------------------------------------ */
/*  DroppableShell — registers a column as a drop target               */
/* ------------------------------------------------------------------ */
function DroppableShell({ droppableId, status, columnKey, style, children }: { droppableId: string; status: string; columnKey: string; style: React.CSSProperties; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: droppableId, data: { status, columnKey } });
  return <div ref={setNodeRef} style={style}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  BoardView                                                          */
/* ------------------------------------------------------------------ */
export function BoardView({
  tasks,
  files = [],
  tags = [],
  projects,
  currentProjectId,
  allTasks = [],
  onOpenTask,
  onMove,
  onToggleComplete,
  onReorder,
  onQuickAdd,
  onUpdateTask,
  onRemoveTask,
  onDuplicateTask,
  onToggleTaskTag,
  onMoveToProject,
  onPromoteSubtask,
  onDemoteToSubtask,
  onSetRecurrence,
}: BoardViewProps) {
  const { isMobile, isTablet } = useViewport();
  const stacked = isMobile || isTablet;
  // Real project member directory — used for the assignee swimlane grouping.
  const { lookup: lookupMember } = useMemberDirectory();

  /* ---------- swimlane state ---------- */
  const [swimlaneBy, setSwimlaneBy] = useState<string>('none');
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(new Set());

  /* ---------- dnd-kit sensors (audit C-08: touch + keyboard) ---------- */
  const sensors = useSensors(
    // PointerSensor covers mouse AND touch; a small activation distance
    // keeps taps and scrolls from turning into accidental drags.
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    // KeyboardSensor makes the board fully operable without a pointer:
    // Space lifts a focused card, arrows move it, Space drops it.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ---------- drag state ---------- */
  const [activeDrag, setActiveDrag] = useState<{ id: string; fromStatus: string } | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const lastDropAt = useRef<number>(0);

  /* ---------- WIP limit state ---------- */
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [editingWip, setEditingWip] = useState<string | null>(null);

  /* ---------- quick-add state ---------- */
  const [quickAddOpen, setQuickAddOpen] = useState<Record<string, boolean>>({});
  const quickAddRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* ---------- derived ---------- */
  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const filesByTask = useMemo(() => {
    const map: Record<string, FileItem[]> = {};
    for (const f of files) {
      if (f.linkedTaskId) (map[f.linkedTaskId] ??= []).push(f);
    }
    return map;
  }, [files]);

  /* Tag filter */
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const filteredTasks = useMemo(() => {
    if (tagFilter.size === 0) return tasks;
    return tasks.filter(t => (t.tags || []).some(tagId => tagFilter.has(tagId)));
  }, [tasks, tagFilter]);

  /* ---------- swimlane groups ---------- */
  const swimlaneGroups = useMemo(() => {
    if (swimlaneBy === 'none') return null;
    const groups = new Map<string, Task[]>();
    filteredTasks.forEach(t => {
      let key = 'Unassigned';
      if (swimlaneBy === 'assignee') {
        const m = lookupMember(t.assignee);
        key = m ? m.name : 'Unassigned';
      } else if (swimlaneBy === 'priority') {
        key = PRIORITY_META[t.priority]?.label || t.priority;
      } else if (swimlaneBy === 'tag' && t.tags?.length) {
        key = t.tags.join(', ');
      } else {
        return;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    });
    return groups;
  }, [swimlaneBy, filteredTasks, lookupMember]);

  const toggleSwimlaneCollapse = useCallback((key: string) => {
    setCollapsedSwimlanes(prev => {
      const n = new Set(prev);
      if (n.has(key)) { n.delete(key); } else { n.add(key); }
      return n;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Drag handlers (dnd-kit)                                          */
  /* ---------------------------------------------------------------- */

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    setActiveDrag({ id: String(event.active.id), fromStatus: String(data?.status ?? '') });
  }, []);

  // Track the hovered column so it highlights while a card is over it.
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const over = event.over;
    if (!over) { setOverColumnId(null); return; }
    const data = over.data.current;
    if (data?.status && data?.columnKey) {
      setOverColumnId(`${String(data.columnKey)}:${String(data.status)}`);
      return;
    }
    setOverColumnId(String(over.id));
  }, []);

  const clearDragState = useCallback(() => {
    setActiveDrag(null);
    setOverColumnId(null);
  }, []);

  const handleDragCancel = useCallback(() => {
    lastDropAt.current = Date.now(); // cancel swallows the ghost click too
    clearDragState();
  }, [clearDragState]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    lastDropAt.current = Date.now();
    const over = event.over;
    const drag = activeDrag;
    clearDragState();
    if (!drag || !over) return;

    const overData = over.data.current;
    // The target column: from the card being hovered, or the column itself
    // (when dropping onto an empty column / the empty area below the cards).
    const targetStatus = overData?.status !== undefined ? String(overData.status) : String(over.id).split(':')[1];
    const targetColumnKey = overData?.columnKey !== undefined ? String(overData.columnKey) : String(over.id).split(':')[0];
    if (!targetStatus) return;

    if (targetStatus !== drag.fromStatus) {
      // Column change → status move (append semantics, same as before).
      onMove(drag.id, targetStatus);
      return;
    }

    // Same status but a different grouping row: the read-only swimlane rows
    // never own another row's task, so there is nothing to change.
    const sourceKey = sourceColumnKeyOf(drag.id, swimlaneGroups);
    if (targetColumnKey !== sourceKey) return;

    // Same column → reorder to the hovered card's index (or column end).
    const columnTasks = tasksForColumn(sourceKey, targetStatus, filteredTasks, swimlaneGroups);
    const newIndex = columnTasks.findIndex(t => t.id === over.id);
    const oldIndex = columnTasks.findIndex(t => t.id === drag.id);
    const resolvedIndex = newIndex >= 0 ? newIndex : columnTasks.length;
    if (resolvedIndex !== oldIndex) {
      onReorder(drag.id, resolvedIndex);
    }
  }, [activeDrag, clearDragState, filteredTasks, swimlaneGroups, onMove, onReorder]);

  /** The swimlane key a task is currently rendered in ('main' = no grouping). */
  function sourceColumnKeyOf(taskId: string, groups: Map<string, Task[]> | null): string {
    if (!groups) return 'main';
    for (const [key, groupTasks] of groups) {
      if (groupTasks.some(t => t.id === taskId)) return key;
    }
    return 'main';
  }

  /** The rendered task list of one column, in view order. */
  function tasksForColumn(columnKey: string, status: string, all: Task[], groups: Map<string, Task[]> | null): Task[] {
    const source = groups ? (groups.get(columnKey) ?? []) : all;
    return source.filter(t => t.status === status);
  }

  /* ---------------------------------------------------------------- */
  /*  Quick-add handlers                                               */
  /* ---------------------------------------------------------------- */
  const openQuickAdd = useCallback((status: string) => {
    setQuickAddOpen(prev => ({ ...prev, [status]: true }));
    requestAnimationFrame(() => quickAddRefs.current[status]?.focus());
  }, []);

  const handleQuickAddKeyDown = useCallback(
    (e: React.KeyboardEvent, status: string) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = quickAddRefs.current[status];
        const val = input?.value.trim();
        if (val) {
          onQuickAdd(val, status);
          input!.value = '';
          requestAnimationFrame(() => input?.focus());
        }
      } else if (e.key === 'Escape') {
        const input = quickAddRefs.current[status];
        if (input) input.value = '';
        setQuickAddOpen(prev => ({ ...prev, [status]: false }));
      }
    },
    [onQuickAdd],
  );

  const handleQuickAddBlur = useCallback((status: string) => {
    const input = quickAddRefs.current[status];
    if (input && !input.value.trim()) {
      setQuickAddOpen(prev => ({ ...prev, [status]: false }));
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Per-card bundle                                                  */
  /* ---------------------------------------------------------------- */
  const cardBundle: CardBundle = {
    tagMap, filesByTask, tags, projects, currentProjectId, allTasks, isMobile,
    onOpenTask, onToggleComplete, onUpdateTask, onRemoveTask, onDuplicateTask,
    onToggleTaskTag, onMoveToProject, onPromoteSubtask, onDemoteToSubtask, onSetRecurrence,
    lastDropAt,
  };

  /* ================================================================== */
  /*  ColumnCard — extracted so it can be reused per swimlane row        */
  /* ================================================================== */
  function ColumnCard({ tasksToRender, status, columnKey }: { tasksToRender: Task[]; status: string; columnKey: string }) {
    const col = tasksToRender.filter(t => t.status === status);
    const meta = STATUS_META[status];
    const droppableId = `${columnKey}:${status}`;
    const isColumnHighlighted = !!activeDrag && overColumnId === droppableId;
    const isOverWip = !!(wipLimits[status] && col.length >= wipLimits[status]);

    return (
      <DroppableShell
        droppableId={droppableId}
        status={status}
        columnKey={columnKey}
        style={{
          background: isColumnHighlighted ? COLORS.accentSoft : isOverWip ? `${COLORS.redSoft}33` : '#F7F7F7',
          borderRadius: 12,
          padding: 10,
          minHeight: 200,
          border: isColumnHighlighted ? `1.5px dashed ${COLORS.accent}` : isOverWip ? `1.5px solid ${COLORS.red}` : '1.5px dashed transparent',
          ...(stacked ? { width: isMobile ? '82vw' : 280, maxWidth: 320, flexShrink: 0 } : {}),
        }}
      >
        {/* Column header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px' }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: meta.color }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: -0.3, fontFamily: FF }}>{meta.label}</span>
          <span
            onClick={e => { e.stopPropagation(); if (editingWip === status) { setEditingWip(null); return; } setEditingWip(status); }}
            title="Click to set WIP limit"
            style={{ fontSize: 12, color: (wipLimits[status] && col.length >= wipLimits[status]) ? COLORS.red : COLORS.gray, fontFamily: FF, cursor: 'pointer', fontWeight: (wipLimits[status] && col.length >= wipLimits[status]) ? 700 : 400, padding: '1px 6px', borderRadius: 6, background: (wipLimits[status] && col.length >= wipLimits[status]) ? COLORS.redSoft : 'transparent', transition: 'all 0.15s' }}
          >{wipLimits[status] ? `${col.length}/${wipLimits[status]}` : col.length}</span>
          {editingWip === status && (
            <input
              autoFocus type="number" min={1} defaultValue={wipLimits[status] || ''}
              onBlur={e => { const val = Number(e.target.value); if (val > 0) { setWipLimits(prev => ({ ...prev, [status]: val })); } else { setWipLimits(prev => { const n = { ...prev }; delete n[status]; return n; }); } setEditingWip(null); }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setEditingWip(null); } }}
              style={{ width: 48, border: `1.5px solid ${COLORS.accent}`, borderRadius: 6, fontSize: 12, fontFamily: FF, padding: '2px 6px', outline: 'none', boxShadow: '0 0 0 3px rgba(254,128,41,0.12)' }}
            />
          )}
        </div>

        {/* Cards — each wrapped in a sortable, keyboard-reachable shell */}
        <SortableContext items={col.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 8 }}>
            {col.map(t => (
              <SortableTaskCard key={t.id} task={t} columnKey={columnKey} bundle={cardBundle} />
            ))}
            {col.length === 0 && (
              <div style={{ fontSize: 12, color: COLORS.gray, textAlign: 'center', padding: '16px 0', fontFamily: FF }}>No tasks</div>
            )}
          </div>
        </SortableContext>

        {/* Quick Add */}
        <div style={{ marginTop: 8 }}>
          {quickAddOpen[status] ? (
            <input
              ref={el => { quickAddRefs.current[status] = el; }}
              onKeyDown={e => handleQuickAddKeyDown(e, status)}
              onBlur={() => handleQuickAddBlur(status)}
              placeholder="+ Add task"
              style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: FF, color: COLORS.ink, padding: '6px 8px', borderRadius: 8, boxShadow: 'none' }}
            />
          ) : (
            <div
              onClick={() => openQuickAdd(status)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', cursor: 'pointer', borderRadius: 8, fontSize: 13, fontFamily: FF, color: COLORS.gray }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Plus size={14} />
              <span>Add task</span>
            </div>
          )}
        </div>
      </DroppableShell>
    );
  }

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  const columnGridStyle = stacked
    ? { display: 'flex' as const, gap: 12, overflowX: 'auto' as const, paddingBottom: 8, WebkitOverflowScrolling: 'touch' as any }
    : { display: 'grid' as const, gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 };

  const draggedTask = activeDrag ? filteredTasks.find(t => t.id === activeDrag.id) : undefined;

  return (
    <div>
      <SectionHeader
        title="Board"
        subtitle="Drag cards between columns to update status"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={swimlaneBy}
              onChange={e => { setSwimlaneBy(e.target.value); setCollapsedSwimlanes(new Set()); }}
              style={{ padding: '5px 8px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 11.5, fontFamily: FF, color: COLORS.ink, background: '#F9FAFB', cursor: 'pointer', outline: 'none' }}
            >
              <option value="none">No grouping</option>
              <option value="assignee">Group by Assignee</option>
              <option value="priority">Group by Priority</option>
              <option value="tag">Group by Tag</option>
            </select>
            <TagFilterBar
              tags={tags}
              selectedTagIds={tagFilter}
              onToggleTag={id => setTagFilter(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; })}
              onClearAll={() => setTagFilter(new Set())}
            />
          </div>
        }
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Swimlane mode */}
        {swimlaneGroups ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from(swimlaneGroups.entries()).map(([groupKey, groupTasks]) => {
              const collapsed = collapsedSwimlanes.has(groupKey);
              return (
                <div key={groupKey}>
                  <div
                    onClick={() => toggleSwimlaneCollapse(groupKey)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', cursor: 'pointer', borderBottom: `1px solid ${COLORS.line}` }}
                  >
                    <Layers size={14} color={COLORS.gray} />
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>{groupKey}</span>
                    <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>({groupTasks.length})</span>
                    <span style={{ fontSize: 10, color: COLORS.gray }}>{collapsed ? '\u25B6' : '\u25BC'}</span>
                  </div>
                  {!collapsed && (
                    <div style={{ ...columnGridStyle, marginTop: 10 }}>
                      {STATUS_ORDER.map(status => (
                        <ColumnCard key={groupKey + '-' + status} tasksToRender={groupTasks} status={status} columnKey={groupKey} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={columnGridStyle}>
            {STATUS_ORDER.map(status => (
              <ColumnCard key={status} tasksToRender={filteredTasks} status={status} columnKey="main" />
            ))}
          </div>
        )}

        {/* The card follows the pointer/cursor while dragging */}
        <DragOverlay dropAnimation={null}>
          {draggedTask && (
            <div style={{
              background: '#FFFFFF', borderRadius: 12, padding: isMobile ? 14 : 12,
              border: `1px solid ${COLORS.line}`, boxShadow: '0 12px 24px rgba(0,0,0,0.14)',
              width: stacked ? (isMobile ? '82vw' : 280) : undefined, maxWidth: 320,
            }}>
              <BoardCardBody task={draggedTask} bundle={cardBundle} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

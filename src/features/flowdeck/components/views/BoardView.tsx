'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Plus, Repeat, Layers } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragOverEvent,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { PRIORITY_META, COLORS, STATUS_META, STATUS_ORDER, getDueDateStatus, DUE_STATUS, dueDateOffsetLabel, type Task, type FileItem, type Tag, type Project } from '@/features/flowdeck/model';
import { Avatar, PriorityFlag, SectionHeader, FileThumbnailGrid, TaskCheckbox, TagPills, TagFilterBar, FF, TaskContextMenu, InlineTaskName, useMemberDirectory } from '../ui';
import { useViewport } from '../../hooks/useViewport';

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

/**
 * A kanban card wrapper wired into dnd-kit.
 *
 * Replaces the previous HTML5 drag attributes, which never fired on touch
 * devices and gave the card no keyboard path (audit C-08). The wrapper is:
 *   - focusable (tabIndex=0, role=button) so Tab reaches it
 *   - keyboard-draggable: Space lifts, arrows move, Space drops (the sensor
 *     is configured to start on Space only, leaving Enter to open the task)
 *   - touch-draggable: TouchSensor long-press (180ms) lifts the card
 *   - also a drop target so cards above/below resolve precise insert indexes
 * The Radix context menu wrapping it remains as a no-drag fallback.
 */
function DraggableCard({
  taskId,
  taskName,
  status,
  idx,
  isDragged,
  onOpenTask,
  padding,
  children,
}: {
  taskId: string;
  taskName: string;
  status: string;
  idx: number;
  isDragged: boolean;
  onOpenTask: (id: string) => void;
  padding: number;
  children: React.ReactNode;
}) {
  const { setNodeRef: setDragRef, attributes, listeners, transform } = useDraggable({
    id: taskId,
    data: { status, idx },
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `card:${taskId}`,
    data: { status, idx },
  });

  // Enter opens the task (the sensor only claims Space). While a drag is
  // active the keyboard sensor owns the keys — don't double-handle.
  // dnd-kit's keyboard listener arrives via `listeners.onKeyDown`; it must
  // run, so compose it with ours instead of letting one clobber the other.
  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      listeners?.onKeyDown?.(e);
      if (isDragged) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onOpenTask(taskId);
      }
    },
    [listeners, isDragged, onOpenTask, taskId],
  );

  return (
    <div
      ref={el => { setDragRef(el); setDropRef(el); }}
      data-dnd-card={taskId}
      {...attributes}
      {...listeners}
      onKeyDown={handleCardKeyDown}
      // Ours win over the sensor defaults: Space (not Enter) lifts, so Enter
      // stays free for opening the task.
      tabIndex={0}
      role="button"
      aria-label={`${taskName}. Press Space to lift and arrow keys to move, then Space to drop. Press Enter to open.`}
      onClick={() => { if (!isDragged) onOpenTask(taskId); }}
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        padding,
        cursor: 'grab',
        border: `1px solid ${COLORS.line}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        opacity: isDragged ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
        touchAction: 'pan-y',
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = COLORS.accent; }}
      onBlur={e => { e.currentTarget.style.borderColor = COLORS.line; }}
    >
      {children}
    </div>
  );
}

/*
 * Fixed-step keyboard coordinate getter. The sortable preset snaps to
 * sortable containers, which the board doesn't use — plain droppables need
 * plain deltas. 60px per keypress crosses a column in ~5 presses.
 */
const keyboardBoardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  const deltas: Record<string, { x: number; y: number }> = {
    ArrowDown: { x: 0, y: 60 },
    ArrowUp: { x: 0, y: -60 },
    ArrowLeft: { x: -60, y: 0 },
    ArrowRight: { x: 60, y: 0 },
  };
  const delta = deltas[event.key];
  if (!delta) return currentCoordinates;
  event.preventDefault();
  return { x: currentCoordinates.x + delta.x, y: currentCoordinates.y + delta.y };
};

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
  onReorder: (taskId: string, anchor?: { beforeTaskId?: string | null; afterTaskId?: string | null } | null) => void;
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

  /* ---------- drag state ---------- */
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSourceCol, setDragSourceCol] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number>(-1);

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

  // True when we are doing a same-column reorder (insertion line visible)
  const isReordering = !!(dragId && overCol && dragSourceCol && overCol === dragSourceCol);

  /* ---------------------------------------------------------------- */
  /*  Drag handlers                                                     */
  /* ---------------------------------------------------------------- */

  // Per-card dragover: compute insertion index within the hovered column.
  // Uses the over target's data (cards carry {status, idx}, columns carry
  // {status, colLength}) so the precise insertion index survives; hovering a
  // card's upper/lower half resolves above/below placement.
  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      const over = e.over;
      if (!over?.data.current) { setOverCol(null); setDragOverIdx(-1); return; }
      const overStatus = (over.data.current.status as string | undefined) ?? null;
      setOverCol(overStatus);
      if (dragSourceCol && overStatus === dragSourceCol && typeof over.data.current.idx === 'number') {
        const activeRect = e.active.rect.current.translated;
        // dnd-kit doesn't give the over rect on the event; measure from DOM.
        const overNode = document.querySelector(`[data-dnd-card="${String(over.id)}"]`);
        if (activeRect && overNode) {
          const overRect = overNode.getBoundingClientRect();
          const overMid = overRect.top + overRect.height / 2;
          const activeMid = activeRect.top + activeRect.height / 2;
          setDragOverIdx(activeMid > overMid ? over.data.current.idx + 1 : over.data.current.idx);
        }
      } else {
        setDragOverIdx(-1);
      }
    },
    [dragSourceCol],
  );

  // Drop handler: dispatches either onReorder (same column) or onMove
  // (cross column) — identical semantics to the previous HTML5 drop path.
  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const over = e.over;
      if (dragId && over?.data.current) {
        const targetStatus = (over.data.current.status as string | undefined) ?? null;
        if (targetStatus) {
          if (dragSourceCol === targetStatus) {
            // Anchor-based reorder (audit H-07): the view's column index is
            // meaningless against the store's global, unfiltered array, so
            // the drop names the neighbouring CARD it lands on instead.
            // Placement is recomputed here from live rects rather than read
            // from dragover state — a fast release must not reorder against
            // a stale anchor. Ids survive any filtering/sorting; a bare
            // index never did.
            let anchor: { beforeTaskId?: string; afterTaskId?: string } | null;
            if (String(over.id).startsWith('card:')) {
              const overTaskId = String(over.id).replace(/^card:/, '');
              const activeRect = e.active.rect.current.translated;
              const overNode = document.querySelector(`[data-dnd-card="${String(over.id)}"]`);
              if (activeRect && overNode) {
                const overRect = overNode.getBoundingClientRect();
                const belowMid = (activeRect.top + activeRect.height / 2) > (overRect.top + overRect.height / 2);
                anchor = belowMid ? { afterTaskId: overTaskId } : { beforeTaskId: overTaskId };
              } else {
                anchor = { beforeTaskId: overTaskId };
              }
            } else {
              // Column body: anchor below the column's visible bottom card.
              const lastTaskId = over.data.current.lastTaskId as string | undefined;
              anchor = lastTaskId ? { afterTaskId: lastTaskId } : null;
            }
            onReorder(dragId, anchor);
          } else {
            onMove(dragId, targetStatus);
          }
        }
      }
      setDragId(null);
      setDragSourceCol(null);
      setOverCol(null);
      setDragOverIdx(-1);
    },
    [dragId, dragSourceCol, onReorder, onMove],
  );

  // Reset drag state on cancel (Escape during keyboard drag).
  const handleDragCancel = useCallback(() => {
    setDragId(null);
    setDragSourceCol(null);
    setOverCol(null);
    setDragOverIdx(-1);
  }, []);

  const sensors = useSensors(
    // Mouse: drag starts after 5px of movement so clicks keep working.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: long-press lifts the card; moving scrolls are tolerated so the
    // board can still be scrolled vertically (HTML5 DnD never fired here).
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    // Keyboard: Tab to a card, Space lifts, arrows move, Space drops.
    // Activation is Space-only so Enter stays reserved for opening the task.
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardBoardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

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
  /*  Inline insertion-line style                                       */
  /* ---------------------------------------------------------------- */
  const insertLineStyle: React.CSSProperties = {
    height: 2.5,
    background: '#2563EB',
    borderRadius: 1,
    margin: '0 2px',
    flexShrink: 0,
    marginTop: -3,
    marginBottom: -3,
  };

  /* ================================================================== */
  /*  ColumnCard — extracted so it can be reused per swimlane row        */
  /* ================================================================== */
  function ColumnCard({ tasksToRender, status, columnKey }: { tasksToRender: Task[]; status: string; columnKey: string }) {
    const col = tasksToRender.filter(t => t.status === status);
    const meta = STATUS_META[status];
    const isColumnHighlighted = overCol === status;
    const showLine = isReordering && isColumnHighlighted;
    const isOverWip = !!(wipLimits[status] && col.length >= wipLimits[status]);
    // Drop target for a column's empty area (below the last card). Ids are
    // unique per swimlane group because a status can render once per group.
    // `lastTaskId` anchors the drop to the column's visible bottom card so
    // the store can insert in the right place of the GLOBAL order (H-07).
    const { setNodeRef: setColDropRef } = useDroppable({
      id: `col:${columnKey}:${status}`,
      data: { status, colLength: col.length, lastTaskId: col.length ? col[col.length - 1].id : null },
    });

    return (
      <div
        key={columnKey + '-' + status}
        ref={setColDropRef}
        style={{
          background: isColumnHighlighted && !isReordering ? COLORS.accentSoft : isOverWip ? `${COLORS.redSoft}33` : '#F7F7F7',
          borderRadius: 12,
          padding: 10,
          minHeight: 200,
          border: isColumnHighlighted && !isReordering ? `1.5px dashed ${COLORS.accent}` : isOverWip ? `1.5px solid ${COLORS.red}` : '1.5px dashed transparent',
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

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {col.map((t, idx) => {
            const tFiles = filesByTask[t.id] || [];
            const dueStatus = getDueDateStatus(t.dueDate, t.status);
            const dueMeta = DUE_STATUS[dueStatus];
            const isDone = t.status === 'done';
            const isDragged = dragId === t.id;
            const showLineAbove = showLine && dragOverIdx === idx;
            const showLineBelow = showLine && dragOverIdx === col.length && idx === col.length - 1;

            return (
              <React.Fragment key={t.id}>
                {showLineAbove && <div style={insertLineStyle} />}

                <TaskContextMenu
                  task={t}
                  tags={tags}
                  projects={projects}
                  currentProjectId={currentProjectId}
                  allTasks={allTasks}
                  onOpenTask={onOpenTask}
                  onToggleComplete={onToggleComplete}
                  onUpdateTask={onUpdateTask || (() => {})}
                  onDeleteTask={onRemoveTask || (() => {})}
                  onDuplicateTask={onDuplicateTask}
                  onToggleTag={onToggleTaskTag}
                  onMoveToProject={onMoveToProject}
                  onPromoteSubtask={onPromoteSubtask}
                  onDemoteToSubtask={onDemoteToSubtask}
                  onSetRecurrence={onSetRecurrence}
                >
                  <DraggableCard
                    taskId={t.id}
                    taskName={t.name}
                    status={status}
                    idx={idx}
                    isDragged={isDragged}
                    onOpenTask={onOpenTask}
                    padding={isMobile ? 14 : 12}
                  >
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
                  </DraggableCard>
                </TaskContextMenu>

                {showLineBelow && <div style={insertLineStyle} />}
              </React.Fragment>
            );
          })}

          {col.length === 0 && !showLine && (
            <div style={{ fontSize: 12, color: COLORS.gray, textAlign: 'center', padding: '16px 0', fontFamily: FF }}>No tasks</div>
          )}
          {col.length === 0 && showLine && dragOverIdx === 0 && <div style={insertLineStyle} />}
          {showLine && dragOverIdx === col.length && col.length > 0 && <div style={insertLineStyle} />}
        </div>

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
      </div>
    );
  }

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  const columnGridStyle = stacked
    ? { display: 'flex' as const, gap: 12, overflowX: 'auto' as const, paddingBottom: 8, WebkitOverflowScrolling: 'touch' as any }
    : { display: 'grid' as const, gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 };

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

      {/* Swimlane mode */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={e => {
          const activeData = e.active.data.current as { status?: string } | undefined;
          setDragId(String(e.active.id));
          setDragSourceCol(activeData?.status ?? null);
        }}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
            <ColumnCard key={status} tasksToRender={filteredTasks} status={status} columnKey={status} />
          ))}
        </div>
      )}
      </DndContext>
    </div>
  );
}

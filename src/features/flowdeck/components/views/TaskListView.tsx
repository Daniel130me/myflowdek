'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { MoreHorizontal, GripVertical, Plus, Repeat, ChevronRight, ChevronDown, Trash2, X } from 'lucide-react';
import { COLORS, STATUS_META, STATUS_ORDER, teamById, fmtRange, getDueDateStatus, DUE_STATUS, dueDateOffsetLabel, type Task, type Tag, type Project, type Section } from '@/features/flowdeck/model';
import { Avatar, StatusPill, PriorityFlag, SectionHeader, TaskCheckbox, TagPills, TagFilterBar, FF, TaskContextMenu, InlineTaskName } from '../ui';
import { useViewport } from '../../hooks/useViewport';

function computeNextDateStr(dateStr: string, recurrence: string): string {
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

/* ---- Section header row for desktop table ---- */
function DesktopSectionRow({ section, collapsed, onToggle, onRename, onDelete }: {
  section: Section;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== section.name) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="fd-section-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 36px 2.4fr 1fr 1fr 1fr 1.3fr 40px',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#F9FAFB',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        <div />
        <div />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronRight size={16} color={COLORS.gray} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
            onBlur={save}
            style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, border: `1.5px solid ${COLORS.accent}`, borderRadius: 6, padding: '3px 8px', outline: 'none', width: '100%', boxShadow: '0 0 0 3px rgba(254,128,41,0.12)' }}
          />
        </div>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{section.name}</span>
        </div>
        <div /><div /><div />
      </div>
    );
  }

  return (
    <div
      className="fd-section-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 36px 2.4fr 1fr 1fr 1fr 1.3fr 40px',
        alignItems: 'center',
        padding: '8px 16px',
        background: '#F9FAFB',
        borderBottom: `1px solid ${COLORS.line}`,
        cursor: 'pointer',
      }}
    >
      <div />
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }} onClick={onToggle}>
        {collapsed ? <ChevronRight size={16} color={COLORS.gray} style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color={COLORS.gray} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 0.5 }} onDoubleClick={(e) => { e.stopPropagation(); setDraft(section.name); setEditing(true); }}>{section.name}</span>
      </div>
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{section.name}</span>
      </div>
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, borderRadius: 6, display: 'flex', opacity: 0.5 }} title="Delete section"><Trash2 size={13} /></button>
      </div>
      <div />
    </div>
  );
}

/* ---- Section header for mobile card layout ---- */
function MobileSectionHeader({ section, collapsed, onToggle, onRename, onDelete }: {
  section: Section;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== section.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', cursor: 'pointer' }} onClick={onToggle}>
      {collapsed ? <ChevronRight size={16} color={COLORS.gray} /> : <ChevronDown size={16} color={COLORS.gray} />}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          onBlur={save}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, border: `1.5px solid ${COLORS.accent}`, borderRadius: 6, padding: '3px 8px', outline: 'none', flex: 1 }}
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); setDraft(section.name); setEditing(true); }}
          style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}
        >{section.name}</span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, borderRadius: 6, display: 'flex', opacity: 0.5 }}><Trash2 size={14} /></button>
    </div>
  );
}

/* ---- Add Section Button ---- */
function AddSectionButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
    setAdding(false);
  };

  if (adding) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setAdding(false); }}
          onBlur={() => { if (!name.trim()) setAdding(false); }}
          placeholder="Section name..."
          style={{ flex: 1, border: `1.5px solid ${COLORS.accent}`, borderRadius: 8, fontSize: 12.5, fontFamily: FF, padding: '6px 10px', outline: 'none' }}
        />
        <button onClick={confirm} style={{ border: 'none', background: COLORS.accent, color: '#FFF', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: FF, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
        <button onClick={() => setAdding(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4 }}><X size={16} /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', border: 'none', background: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 12.5, color: COLORS.accent, fontWeight: 600 }}
    >
      <Plus size={14} /> Add section
    </button>
  );
}

interface TaskListViewProps {
  tasks: Task[];
  tags?: Tag[];
  projects?: Record<string, Project>;
  currentProjectId?: string | null;
  allTasks?: Task[];
  sections?: Section[];
  onOpenTask: (id: string) => void;
  onMove: (id: string, status: string) => void;
  onToggleComplete: (id: string) => void;
  onReorder: (taskId: string, toIndex: number) => void;
  onQuickAdd: (name: string) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onRemoveTask?: (id: string) => void;
  onDuplicateTask?: (id: string) => void;
  onToggleTaskTag?: (taskId: string, tagId: string) => void;
  onMoveToProject?: (taskId: string, targetProjectId: string) => void;
  onPromoteSubtask?: (taskId: string) => void;
  onDemoteToSubtask?: (taskId: string, newParentId: string) => void;
  /* #35: Sections */
  onAddSection?: (name: string) => void;
  onRenameSection?: (sectionId: string, name: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onToggleSectionCollapsed?: (sectionId: string) => void;
  /* #31/#35: Recurrence & section assignment in context menu */
  onSetRecurrence?: (taskId: string, recurrence: string | undefined) => void;
  onSetTaskSection?: (taskId: string, sectionId: string | null) => void;
}

export function TaskListView({ tasks, tags = [], projects, currentProjectId, allTasks = [], sections = [], onOpenTask, onMove, onToggleComplete, onReorder, onQuickAdd, onUpdateTask, onRemoveTask, onDuplicateTask, onToggleTaskTag, onMoveToProject, onPromoteSubtask, onDemoteToSubtask, onAddSection, onRenameSection, onDeleteSection, onToggleSectionCollapsed, onSetRecurrence, onSetTaskSection }: TaskListViewProps) {
  const { isMobile } = useViewport();
  const [sortKey, setSortKey] = useState('start');
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const filteredByTag = useMemo(() => {
    if (tagFilter.size === 0) return tasks;
    return tasks.filter(t => (t.tags || []).some(tagId => tagFilter.has(tagId)));
  }, [tasks, tagFilter]);
  const sorted = useMemo(() => {
    const arr = [...filteredByTag];
    if (sortKey === 'start') return arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    if (sortKey === 'priority') return arr.sort((a, b) => ['urgent', 'high', 'medium', 'low'].indexOf(a.priority) - ['urgent', 'high', 'medium', 'low'].indexOf(b.priority));
    return arr.sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredByTag, sortKey]);

  /* Section grouping: when sections exist, group tasks by sectionId */
  const hasSections = sections.length > 0;
  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.position - b.position), [sections]);
  const tasksBySection = useMemo(() => {
    if (!hasSections) return null;
    const map = new Map<string, Task[]>();
    const unsectioned: Task[] = [];
    for (const t of sorted) {
      if (t.sectionId) {
        const arr = map.get(t.sectionId) || [];
        arr.push(t);
        map.set(t.sectionId, arr);
      } else {
        unsectioned.push(t);
      }
    }
    return { map, unsectioned };
  }, [sorted, hasSections]);

  /* Desktop drag-to-reorder state (must be before conditional return) */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      setOverIdx(idx);
    }
  }, [dragIdx]);

  const handleDragLeave = useCallback(() => {
    setOverIdx(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      const taskId = sorted[dragIdx].id;
      onReorder(taskId, idx);
    }
    setDragIdx(null);
    setOverIdx(null);
  }, [sorted, dragIdx, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);

  /* ---- Shared: render a single mobile task card ---- */
  const renderMobileCard = (t: Task) => {
    const meta = STATUS_META[t.status];
    const isDone = t.status === 'done';
    const dueStatus = getDueDateStatus(t.dueDate, t.status);
    const dueMeta = DUE_STATUS[dueStatus];
    return (
      <TaskContextMenu
        key={t.id}
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
        sections={sections}
        onSetTaskSection={onSetTaskSection}
      >
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: t.description ? 6 : 8 }}>
            <TaskCheckbox done={isDone} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <InlineTaskName name={t.name} isDone={isDone} style={{ flex: 1, fontSize: 14, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? COLORS.gray : COLORS.ink }} onSave={(newName) => onUpdateTask?.(t.id, { name: newName })} onOpenTask={() => onOpenTask(t.id)} />
                <PriorityFlag priority={t.priority} />
              </div>
            </div>
          </div>
          {t.description && (
            <div style={{ fontSize: 12.5, color: COLORS.gray, fontFamily: FF, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', marginBottom: 6, marginLeft: 30 }}>{t.description}</div>
          )}
          {t.tags && t.tags.length > 0 && <div style={{ marginBottom: 8, marginLeft: 30 }}><TagPills tags={t.tags} tagMap={tagMap} /></div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginLeft: 30, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar id={t.assignee} size={22} />
              <span style={{ fontSize: 12.5, color: COLORS.gray, fontFamily: FF }}>{teamById[t.assignee]?.name.split(' ')[0]}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {t.recurrence && (
                <span title={t.dueDate ? `Next: ${computeNextDateStr(t.dueDate, t.recurrence)}` : 'Recurring task'} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#0891B2', background: '#CFFAFE', padding: '2px 7px', borderRadius: 9999, fontFamily: FF }}><Repeat size={9} />{t.recurrence}</span>
              )}
              {t.dueDate && dueStatus !== 'none' && (
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: FF, padding: '2px 8px', borderRadius: 9999, background: dueMeta.bg, color: dueMeta.color }}>{dueDateOffsetLabel(t.dueDate, t.status)}</span>
              )}
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtRange(t.start, t.duration)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginLeft: 30 }}>
            <StatusPill status={t.status} />
            <div style={{ height: 4, flex: 1, background: COLORS.line, borderRadius: 2, marginLeft: 12, maxWidth: 100 }}>
              <div style={{ height: '100%', borderRadius: 2, background: meta.color, width: `${t.progress}%` }} />
            </div>
            <span style={{ fontSize: 11, color: COLORS.gray, marginLeft: 8, fontFamily: FF }}>{t.progress}%</span>
          </div>
        </div>
      </TaskContextMenu>
    );
  };

  /* ---- Shared: render a single desktop task row ---- */
  const renderDesktopRow = (t: Task, idx: number) => {
    const isDone = t.status === 'done';
    const dueStatus = getDueDateStatus(t.dueDate, t.status);
    const dueMeta = DUE_STATUS[dueStatus];
    return (
      <TaskContextMenu
        key={t.id}
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
        sections={sections}
        onSetTaskSection={onSetTaskSection}
      >
        <div
          className="fd-task-row"
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 36px 2.4fr 1fr 1fr 1fr 1.3fr 40px',
            alignItems: 'center',
            padding: '11px 16px',
            borderBottom: `1px solid ${COLORS.line}`,
            fontSize: 13,
            position: 'relative',
            cursor: 'default',
            opacity: dragIdx === idx ? 0.4 : 1,
          }}
        >
          {overIdx === idx && (
            <div style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 2.5, background: '#2563EB', borderRadius: 1, zIndex: 2 }} />
          )}
          <div className="fd-grip-handle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}>
            <GripVertical size={14} color={COLORS.gray} />
          </div>
          <div><TaskCheckbox done={isDone} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={18} /></div>
          <div>
            <InlineTaskName name={t.name} isDone={isDone} style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? COLORS.gray : COLORS.ink }} onSave={(newName) => onUpdateTask?.(t.id, { name: newName })} onOpenTask={() => onOpenTask(t.id)} />
            {t.tags && t.tags.length > 0 && <div style={{ marginTop: 4 }}><TagPills tags={t.tags} tagMap={tagMap} /></div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar id={t.assignee} size={20} /><span style={{ fontSize: 12.5 }}>{teamById[t.assignee]?.name.split(' ')[0]}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {t.recurrence && (
              <span title={t.dueDate ? `Next: ${computeNextDateStr(t.dueDate, t.recurrence)}` : 'Recurring task'} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#0891B2', background: '#CFFAFE', padding: '2px 7px', borderRadius: 9999, fontFamily: FF }}><Repeat size={9} />{t.recurrence}</span>
            )}
            {t.dueDate ? (
              <span style={{ fontSize: 12, fontFamily: FF, padding: '2px 8px', borderRadius: 9999, background: dueMeta.bg, color: dueMeta.color, fontWeight: 600 }}>{dueDateOffsetLabel(t.dueDate, t.status)}</span>
            ) : (
              <span style={{ fontSize: 12, color: COLORS.gray }}>{fmtRange(t.start, t.duration)}</span>
            )}
          </div>
          <div><PriorityFlag priority={t.priority} /></div>
          <div>
            <select value={t.status} onChange={e => onMove(t.id, e.target.value)} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 12, padding: '5px 8px', color: STATUS_META[t.status]?.color || COLORS.ink, fontWeight: 600, background: STATUS_META[t.status]?.bg || '#FFFFFF', cursor: 'pointer' }}>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>
          <button onClick={() => onOpenTask(t.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray }}><MoreHorizontal size={16} /></button>
        </div>
      </TaskContextMenu>
    );
  };

  /* ---- Section-aware right side content ---- */
  const headerRight = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {onAddSection && <AddSectionButton onAdd={onAddSection} />}
      <TagFilterBar tags={tags} selectedTagIds={tagFilter} onToggleTag={id => setTagFilter(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; })} onClearAll={() => setTagFilter(new Set())} />
      {!hasSections && ['start', 'priority', 'name'].map(k => (
        <button key={k} onClick={() => setSortKey(k)} style={{ fontSize: isMobile ? 11 : 12, padding: '6px 10px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${COLORS.line}`, background: sortKey === k ? COLORS.ink : '#F3F4F6', color: sortKey === k ? '#FFFFFF' : COLORS.ink, fontWeight: 600, textTransform: 'capitalize', fontFamily: FF, minHeight: isMobile ? 36 : undefined }}>{isMobile ? k : `Sort: ${k}`}</button>
      ))}
    </div>
  );

  /* ---- Build sectioned content arrays ---- */
  const mobileSectionsContent = hasSections && tasksBySection ? (
    <>
      {sortedSections.map(sec => {
        const secTasks = tasksBySection.map.get(sec.id) || [];
        return (
          <React.Fragment key={sec.id}>
            <MobileSectionHeader
              section={sec}
              collapsed={!!sec.collapsed}
              onToggle={() => onToggleSectionCollapsed?.(sec.id)}
              onRename={(name) => onRenameSection?.(sec.id, name)}
              onDelete={() => { if (confirm(`Delete section "${sec.name}"? Tasks will be moved to unsectioned.`)) onDeleteSection?.(sec.id); }}
            />
            {!sec.collapsed && secTasks.map(t => renderMobileCard(t))}
          </React.Fragment>
        );
      })}
      {tasksBySection.unsectioned.length > 0 && (
        <>
          {sortedSections.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF, textTransform: 'uppercase', letterSpacing: 0.5, padding: '6px 4px' }}>UNSECTIONED</div>}
          {tasksBySection.unsectioned.map(t => renderMobileCard(t))}
        </>
      )}
    </>
  ) : null;

  const desktopSectionsContent = hasSections && tasksBySection ? (
    <>
      {sortedSections.map(sec => {
        const secTasks = tasksBySection.map.get(sec.id) || [];
        return (
          <React.Fragment key={sec.id}>
            <DesktopSectionRow
              section={sec}
              collapsed={!!sec.collapsed}
              onToggle={() => onToggleSectionCollapsed?.(sec.id)}
              onRename={(name) => onRenameSection?.(sec.id, name)}
              onDelete={() => { if (confirm(`Delete section "${sec.name}"? Tasks will be moved to unsectioned.`)) onDeleteSection?.(sec.id); }}
            />
            {!sec.collapsed && secTasks.map((t, idx) => renderDesktopRow(t, idx))}
          </React.Fragment>
        );
      })}
      {tasksBySection.unsectioned.length > 0 && (
        <>
          {sortedSections.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '28px 36px 2.4fr 1fr 1fr 1fr 1.3fr 40px', padding: '6px 16px', fontSize: 10, fontWeight: 700, color: COLORS.gray, letterSpacing: 0.8, background: '#F9FAFB', borderBottom: `1px solid ${COLORS.line}`, fontFamily: FF, textTransform: 'uppercase' }}><div /><div /><div>UNSECTIONED</div><div /><div /><div /><div /><div /></div>
          )}
          {tasksBySection.unsectioned.map((t, idx) => renderDesktopRow(t, idx))}
        </>
      )}
    </>
  ) : null;

  /* ================================================================== */
  /*  Mobile layout                                                     */
  /* ================================================================== */
  if (isMobile) {
    return (
      <div>
        <SectionHeader title="Tasks" subtitle={`${filteredByTag.length}${filteredByTag.length !== tasks.length ? ` of ${tasks.length}` : ''} tasks`} right={headerRight} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mobileSectionsContent || sorted.map(t => renderMobileCard(t))}
          {sorted.length === 0 && <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, padding: 24, fontFamily: FF }}>No tasks match your search.</div>}
          <QuickAddRow onQuickAdd={onQuickAdd} placeholder="Type a task name and press Enter..." />
        </div>
      </div>
    );
  }

  /* ================================================================== */
  /*  Desktop layout                                                    */
  /* ================================================================== */
  return (
    <div>
      <SectionHeader title="Tasks" subtitle={`${filteredByTag.length}${filteredByTag.length !== tasks.length ? ` of ${tasks.length}` : ''} tasks`} right={headerRight} />
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 720 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 36px 2.4fr 1fr 1fr 1fr 1.3fr 40px', padding: '10px 16px', fontSize: 11.5, fontWeight: 700, color: COLORS.gray, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.8 }}><div /><div /><div>TASK</div><div>ASSIGNEE</div><div>DUE DATE</div><div>PRIORITY</div><div>STATUS</div><div /></div>
          {desktopSectionsContent || sorted.map((t, idx) => renderDesktopRow(t, idx))}
          {sorted.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13, fontFamily: FF }}>No tasks match your search.</div>}
          <QuickAddRow onQuickAdd={onQuickAdd} placeholder="Type a task name and press Enter..." isDesktop />
          <style>{`
            .fd-task-row:hover .fd-grip-handle { opacity: 1 !important; }
            .fd-task-row .fd-grip-handle { opacity: 0.25; transition: opacity 0.15s; }
            .fd-task-row:hover { background: ${'#F9FAFB'}; }
            .fd-section-row:hover { background: #F3F4F6 !important; }
          `}</style>
        </div>
      </div>
    </div>
  );
}

/* ---------- Quick Add Row ---------- */

function QuickAddRow({ onQuickAdd, placeholder, isDesktop = false }: { onQuickAdd: (name: string) => void; placeholder: string; isDesktop?: boolean }) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && val.trim()) {
      onQuickAdd(val.trim());
      setVal('');
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  if (isDesktop) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '28px 36px 2.4fr 1fr 1fr 1fr 1.3fr 40px',
        alignItems: 'center',
        padding: '8px 16px',
        fontSize: 13,
        minHeight: 44,
      }}>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
          <Plus size={14} color={COLORS.gray} />
        </div>
        <div>
          <input
            ref={inputRef}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: FF, color: COLORS.ink, padding: '4px 0' }}
          />
        </div>
        <div /><div /><div /><div /><div />
      </div>
    );
  }

  /* Mobile quick-add */
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', opacity: 0.35 }}>
        <Plus size={18} color={COLORS.gray} />
      </div>
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: FF, color: COLORS.ink, padding: '4px 0' }}
      />
    </div>
  );
}

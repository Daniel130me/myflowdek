'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Search, Diamond, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { COLORS, STATUS_META, PRIORITY_META, SHEET_COLUMNS, getDueDateStatus, DUE_STATUS, dueDateOffsetLabel, type Task, type TaskStatus, type TaskPriority } from '@/features/flowdeck/model';
import { SectionHeader, TaskCheckbox, FF, useProjectMembers } from '../ui';
import { GridToolbar, type GridActions } from '../toolbar';
import { useViewport } from '../../hooks/useViewport';

interface SheetViewProps {
  projectId: string;
  tasks: Task[];
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onAdd: (task: Task) => void;
  onRemove: (id: string) => void;
  grid: GridActions;
  onReorder: (taskId: string, anchor?: { beforeTaskId?: string | null; afterTaskId?: string | null } | null) => void;
  onQuickAdd: (name: string) => void;
  onToggleComplete: (id: string) => void;
}

export function SheetView({ projectId, tasks, onUpdate, onAdd, onRemove, grid, onReorder, onQuickAdd, onToggleComplete }: SheetViewProps) {
  const { isMobile } = useViewport();
  // Real project members for the assignee <select>. Registered into the
  // global MemberDirectory so Avatar + lookups resolve real users.
  const { members } = useProjectMembers(projectId);
  const allColumns = [...SHEET_COLUMNS, ...grid.customCols.map(c => ({ ...c, width: 140 } as const))];
  const [widths, setWidths] = useState<Record<string, number>>(() => Object.fromEntries(allColumns.map(c => [c.key, c.width])));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  // Drag-to-reorder state (useState to avoid refs-during-render lint error)
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Quick add state
  const [quickAddValue, setQuickAddValue] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);

  const cellPad = isMobile ? '8px 8px' : '8px 10px';
  const cellStyle: React.CSSProperties = { border: `1px solid ${COLORS.line}`, padding: 0 };
  const moveBtnStyle: React.CSSProperties = {
    border: 'none', background: 'none', cursor: 'pointer', padding: 0,
    color: COLORS.gray, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 16, height: 13, touchAction: 'manipulation',
  };
  // Audit H-30: 12.5px inputs trigger iOS focus zoom; >= 14px keeps the
  // software keyboard from blowing the layout up.
  const inputCell: React.CSSProperties = { width: '100%', border: 'none', outline: 'none', padding: cellPad, fontSize: isMobile ? 14 : 12.5, background: 'transparent', fontFamily: 'inherit', minHeight: 36, boxSizing: 'border-box' };

  // Audit H-30: phones cannot carry all eight columns — auto-hide the
  // schedule-detail trio (the ColumnManager can bring them back) so the
  // important context fits in ~360px of horizontal space.
  const MOBILE_AUTO_HIDE_COLS = new Set(['start', 'duration', 'progress']);
  // Sticky left offsets for the frozen control columns + Task column, so row
  // identity survives horizontal scrolling. Cumulative widths of the fixed
  // columns: sel(34) + done(34) + grip(32) + num(36) = 136.
  const STICKY_LEFT = { done: 34, grip: 68, num: 100, name: 136 } as const;
  const stickyCell = (left: number, selected: boolean): React.CSSProperties => ({
    position: 'sticky',
    left,
    zIndex: 1,
    background: selected ? COLORS.accentSoft : '#FFFFFF',
  });

  const visibleCols = allColumns.filter(c => !hidden.has(c.key) && !(isMobile && MOBILE_AUTO_HIDE_COLS.has(c.key)));
  const filtered = query.trim() ? tasks.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || (members.find(m => m.id === t.assignee)?.name || '').toLowerCase().includes(query.toLowerCase())) : tasks;
  const isSearching = query.trim().length > 0;

  const dragState = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  function widthOf(key: string) { return widths[key] || 140; }
  function startResize(key: string, e: React.MouseEvent) {
    dragState.current = { key, startX: e.clientX, startWidth: widthOf(key) };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  // Touch path for the same handle: tablets take the desktop sheet, where
  // the mouse-only handle made columns unresizable (audit Table 6.1).
  function startResizeTouch(key: string, e: React.TouchEvent) {
    const t0 = e.touches[0];
    dragState.current = { key, startX: t0.clientX, startWidth: widthOf(key) };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }
  function onTouchMove(e: TouchEvent) {
    if (!dragState.current) return;
    e.preventDefault(); // resize, don't scroll — touch-action:none on the handle
    const { key, startX, startWidth } = dragState.current;
    setWidths(prev => ({ ...prev, [key]: Math.max(70, startWidth + (e.touches[0].clientX - startX)) }));
  }
  function onMove(e: MouseEvent) {
    if (!dragState.current) return;
    const { key, startX, startWidth } = dragState.current;
    setWidths(prev => ({ ...prev, [key]: Math.max(70, startWidth + (e.clientX - startX)) }));
  }
  function onUp() {
    dragState.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchend', onUp);
  }
  const resizeWithKeyboard = useCallback((key: string, e: React.KeyboardEvent) => {
    const delta = e.key === 'ArrowLeft' ? -24 : e.key === 'ArrowRight' ? 24 : 0;
    if (!delta) return;
    e.preventDefault();
    setWidths(prev => ({ ...prev, [key]: Math.max(70, (prev[key] || 140) + delta) }));
  }, []);
  function toggleSelect(id: string) { grid.setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  function toggleAll() { grid.setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(t => t.id))); }

  // ── Drag-to-reorder handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    setDragIdx(idx);
    setDragOverIdx(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const taskId = filtered[dragIdx].id;
    // Anchor on the neighbour occupying the drop position (audit H-07):
    // `filtered` may be a search-filtered subset, so its index is meaningless
    // to the store's global order — the target task's id travels instead.
    const target = filtered[targetIdx];
    onReorder(taskId, target ? { beforeTaskId: target.id } : null);
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, filtered, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  /* Keyboard + touch reorder: anchor on the neighbour in the move direction
     (same contract as the drag path — ids travel, not filtered indices). */
  const moveRow = useCallback((idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;
    const taskId = filtered[idx].id;
    const neighbour = filtered[targetIdx];
    onReorder(taskId, dir === -1 ? { beforeTaskId: neighbour.id } : { afterTaskId: neighbour.id });
  }, [filtered, onReorder]);

  // ── Quick add handler ──
  const handleQuickAddKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = quickAddValue.trim();
      if (val) {
        onQuickAdd(val);
        setQuickAddValue('');
        requestAnimationFrame(() => {
          quickAddRef.current?.focus();
        });
      }
    }
  }, [quickAddValue, onQuickAdd]);

  function renderCell(t: Task, col: typeof allColumns[0]) {
    if (col.key.startsWith('custom_')) {
      const val = (t.customFields || {})[col.key] || '';
      const set = (v: string) => onUpdate(t.id, { customFields: { ...(t.customFields || {}), [col.key]: v } });
      if (col.type === 'number') return <input type="number" style={inputCell} value={val} onChange={e => set(e.target.value)} />;
      if (col.type === 'date') return <input type="date" style={inputCell} value={val} onChange={e => set(e.target.value)} />;
      return <input style={inputCell} value={val} onChange={e => set(e.target.value)} />;
    }
    switch (col.type) {
      case 'text':
        return <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: (t.level || 0) * 16 }}>
          {t.color && <span style={{ width: 6, height: 6, borderRadius: 2, background: t.color, flexShrink: 0 }} />}
          {t.milestone && <Diamond size={11} color={COLORS.accent} fill={COLORS.accent} style={{ flexShrink: 0 }} />}
          <input style={{ ...inputCell, padding: cellPad, fontWeight: t.bold ? 800 : 400 }} value={t.name} onChange={e => onUpdate(t.id, { name: e.target.value })} />
        </div>;
      case 'description':
        return <input style={{ ...inputCell, color: t.description ? COLORS.ink : COLORS.grayLight }} value={t.description || ''} placeholder="Add description…" onChange={e => onUpdate(t.id, { description: e.target.value || undefined })} />;
      case 'select-assignee':
        return <select style={inputCell} value={t.assignee} onChange={e => onUpdate(t.id, { assignee: e.target.value })}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>;
      case 'date':
        if (col.key === 'dueDate') {
          const dueStatus = getDueDateStatus(t.dueDate, t.status);
          const dueMeta = DUE_STATUS[dueStatus];
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" style={inputCell} value={t.dueDate || ''} onChange={e => onUpdate(t.id, { dueDate: e.target.value || undefined })} />
              {t.dueDate && dueStatus !== 'none' && dueStatus !== 'normal' && (
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FF, padding: '1px 6px', borderRadius: 9999, background: dueMeta.bg, color: dueMeta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{dueDateOffsetLabel(t.dueDate, t.status)}</span>
              )}
            </div>
          );
        }
        return <input type="date" style={inputCell} value={t.start} onChange={e => onUpdate(t.id, { start: e.target.value })} />;
      case 'duration':
        return grid.durationUnit === 'hours' ? <input type="number" min={1} style={inputCell} value={t.duration * 8} onChange={e => onUpdate(t.id, { duration: Math.max(1, Math.round((Number(e.target.value) || 8) / 8)) })} /> : <input type="number" min={1} style={inputCell} value={t.duration} onChange={e => onUpdate(t.id, { duration: Number(e.target.value) || 1 })} />;
      case 'progress':
        return <input type="number" min={0} max={100} step={5} style={inputCell} value={t.progress} onChange={e => { const val = Math.max(0, Math.min(100, Number(e.target.value) || 0)); onUpdate(t.id, { progress: val, status: val === 100 ? 'done' : t.status === 'done' ? 'in_progress' : t.status }); }} />;
      case 'select-priority':
        return <select style={inputCell} value={t.priority} onChange={e => onUpdate(t.id, { priority: e.target.value as TaskPriority })}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>;
      case 'select-status':
        return <select style={{ ...inputCell, color: STATUS_META[t.status]?.color || COLORS.ink, fontWeight: 600 }} value={t.status} onChange={e => onUpdate(t.id, { status: e.target.value as TaskStatus, progress: e.target.value === 'done' ? 100 : t.progress })}>{['backlog', 'in_progress', 'review', 'done'].map(s => <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>)}</select>;
      default: return null;
    }
  }

  // Total columns: checkbox(34) + done(34) + grip(32) + #(36) + visibleCols
  const totalCols = visibleCols.length + 4;

  return (
    <div>
      <style>{`
        .fd-grip-handle { opacity: 0.25; transition: opacity 0.2s; cursor: grab; }
        .fd-row:hover .fd-grip-handle { opacity: 1; }
        .fd-row:hover .fd-grip-handle:active { cursor: grabbing; }
        /* Move buttons: visible-but-subtle so touch can tap them without a
           hover state; full strength on hover/keyboard focus. */
        .fd-move-btns button { opacity: 0.4; transition: opacity 0.2s; }
        .fd-row:hover .fd-move-btns button { opacity: 1; }
        .fd-move-btns button:focus-visible { opacity: 1; }
        .fd-move-btns button:disabled { opacity: 0.1 !important; cursor: default; }
      `}</style>
      <GridToolbar projectId={projectId} tasks={tasks} grid={grid} members={members} />
      <SectionHeader title="Sheet" subtitle="Every cell is editable — drag column edges to resize, just like a spreadsheet" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: COLORS.paper, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: '6px 10px', width: isMobile ? '100%' : 220 }}>
          <Search size={13} color={COLORS.gray} />
          <input placeholder="Find in sheet…" value={query} onChange={e => setQuery(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: isMobile ? 14 : 12.5, width: '100%', fontFamily: FF, minHeight: 36 }} />
        </div>
      </div>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'auto' }}>
        {/* border-collapse: separate — collapsed borders belong to the table
            and stop following sticky cells once they start scrolling. */}
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>{[
              <th key="sel-all" style={{ ...cellStyle, width: 34, textAlign: 'center', position: 'sticky', left: 0, top: 0, zIndex: 3, background: '#F9FAFB' }}><input type="checkbox" style={isMobile ? { width: 18, height: 18 } : undefined} checked={grid.selectedIds.size > 0 && grid.selectedIds.size === filtered.length} onChange={toggleAll} /></th>,
              <th key="done-hdr" style={{ ...cellStyle, width: 34, textAlign: 'center', position: 'sticky', left: STICKY_LEFT.done, top: 0, zIndex: 3, background: '#F9FAFB' }}><span style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, fontFamily: FF }}>DONE</span></th>,
              <th key="grip-hdr" style={{ ...cellStyle, width: 32, position: 'sticky', left: STICKY_LEFT.grip, top: 0, zIndex: 3, background: '#F9FAFB' }} />,
              <th key="num-hdr" style={{ ...cellStyle, width: 36, fontSize: 11, color: COLORS.gray, fontWeight: 700, textAlign: 'center', position: 'sticky', left: STICKY_LEFT.num, top: 0, zIndex: 3, background: '#F9FAFB' }}>#</th>,
              ...visibleCols.map(c => (
                <th key={c.key} style={{ ...cellStyle, width: widthOf(c.key), position: 'sticky', top: 0, zIndex: 2, background: '#F9FAFB', textAlign: 'left', padding: '9px 10px', fontSize: 11, fontWeight: 700, color: COLORS.gray, ...(c.key === 'name' ? { left: STICKY_LEFT.name, zIndex: 3 } : {}) }}>
                  {c.key === 'duration' ? `Duration (${grid.durationUnit === 'hours' ? 'h' : 'd'})` : c.label}
                  {!isMobile && (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Resize ${c.key === 'duration' ? 'duration' : c.label} column. Arrow keys adjust width.`}
                      tabIndex={0}
                      onMouseDown={e => startResize(c.key, e)}
                      onTouchStart={e => startResizeTouch(c.key, e)}
                      onKeyDown={e => resizeWithKeyboard(c.key, e)}
                      style={{ position: 'absolute', top: 0, right: -2, width: 5, height: '100%', cursor: 'col-resize', touchAction: 'none', outlineOffset: -2 }}
                    />
                  )}
                </th>
              )),
            ]}</tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => {
              const rowCells: React.ReactNode[] = [];
              if (dragOverIdx === idx && dragIdx !== null && dragIdx !== idx) {
                rowCells.push(<td key="drop-ind" colSpan={totalCols} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: COLORS.accent, zIndex: 1, pointerEvents: 'none', padding: 0, border: 'none' }} />);
              }
              rowCells.push(
                <td key="sel" style={{ ...cellStyle, textAlign: 'center', ...stickyCell(0, grid.selectedIds.has(t.id)) }}><input type="checkbox" style={isMobile ? { width: 18, height: 18 } : undefined} checked={grid.selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>,
                <td key="done" style={{ ...cellStyle, textAlign: 'center', width: 34, ...stickyCell(STICKY_LEFT.done, grid.selectedIds.has(t.id)) }}><TaskCheckbox done={t.status === 'done'} onToggle={e => { e.stopPropagation(); onToggleComplete(t.id); }} size={isMobile ? 20 : 16} /></td>,
                <td key="grip" style={{ ...cellStyle, textAlign: 'center', width: 32, ...stickyCell(STICKY_LEFT.grip, grid.selectedIds.has(t.id)) }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', flexDirection: 'column' }}>
                    <span className="fd-grip-handle" style={{ display: 'inline-flex', alignItems: 'center' }}><GripVertical size={14} color={COLORS.gray} /></span>
                    {/* Tap/keyboard reorder — HTML5 drag never fires on touch. */}
                    <span className="fd-move-btns" style={{ display: 'inline-flex', flexDirection: 'column' }}>
                      <button type="button" aria-label={`Move ${t.name} up`} disabled={idx === 0} onClick={() => moveRow(idx, -1)} style={moveBtnStyle}><ChevronUp size={11} /></button>
                      <button type="button" aria-label={`Move ${t.name} down`} disabled={idx === filtered.length - 1} onClick={() => moveRow(idx, 1)} style={moveBtnStyle}><ChevronDown size={11} /></button>
                    </span>
                  </span>
                </td>,
                <td key="num" style={{ ...cellStyle, fontSize: 11.5, color: COLORS.gray, textAlign: 'center', ...stickyCell(STICKY_LEFT.num, grid.selectedIds.has(t.id)) }}>{idx + 1}</td>,
              );
              for (const c of visibleCols) {
                rowCells.push(<td key={c.key} style={{ ...cellStyle, width: widthOf(c.key), background: c.key === 'status' ? STATUS_META[t.status]?.bg || 'transparent' : 'transparent', ...(c.key === 'name' ? stickyCell(STICKY_LEFT.name, grid.selectedIds.has(t.id)) : {}) }}>{renderCell(t, c)}</td>);
              }
              return (
                <tr
                  key={t.id}
                  className="fd-row"
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={e => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: grid.selectedIds.has(t.id) ? COLORS.accentSoft : 'transparent',
                    opacity: dragIdx === idx ? 0.4 : 1,
                    position: 'relative',
                  }}
                >{rowCells}</tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={totalCols} style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13, fontFamily: FF }}>No rows match your search.</td>
              </tr>
            )}
            {/* Quick Add Row — hidden when search is active */}
            {!isSearching && (
              <tr style={{ background: 'transparent' }}>{[
                <td key="qa-sel" style={{ ...cellStyle, textAlign: 'center', width: 34, position: 'sticky', left: 0, zIndex: 1, background: '#FFFFFF' }} />,
                <td key="qa-done" style={{ ...cellStyle, textAlign: 'center', width: 34, position: 'sticky', left: STICKY_LEFT.done, zIndex: 1, background: '#FFFFFF' }} />,
                <td key="qa-grip" style={{ ...cellStyle, textAlign: 'center', width: 32, position: 'sticky', left: STICKY_LEFT.grip, zIndex: 1, background: '#FFFFFF' }}><span style={{ opacity: 0.2, display: 'inline-flex', alignItems: 'center' }}><GripVertical size={14} color={COLORS.gray} /></span></td>,
                <td key="qa-num" style={{ ...cellStyle, fontSize: 11.5, color: COLORS.gray, textAlign: 'center', fontWeight: 600, position: 'sticky', left: STICKY_LEFT.num, zIndex: 1, background: '#FFFFFF' }}>+</td>,
                ...visibleCols.map(c => (
                  <td key={c.key} style={{ ...cellStyle, width: widthOf(c.key), padding: 0, border: `1px solid ${COLORS.line}`, ...(c.key === 'name' ? { position: 'sticky' as const, left: STICKY_LEFT.name, zIndex: 1, background: '#FFFFFF' } : {}) }}>
                    {c.type === 'text' ? (
                      <input
                        ref={quickAddRef}
                        style={{ ...inputCell, padding: cellPad, fontFamily: FF, fontSize: isMobile ? 14 : 12.5 }}
                        placeholder="Type task name and press Enter..."
                        value={quickAddValue}
                        onChange={e => setQuickAddValue(e.target.value)}
                        onKeyDown={handleQuickAddKeyDown}
                      />
                    ) : null}
                  </td>
                )),
              ]}</tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

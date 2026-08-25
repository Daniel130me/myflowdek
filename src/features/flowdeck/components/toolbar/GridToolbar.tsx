'use client';

import React from 'react';
import {
  Plus, Undo2, Redo2, MoreHorizontal, UserPlus, Repeat, Outdent, Indent,
  Link2, Unlink2, Trash2, Bold, Palette, Hash, Diamond, FileUp, FileDown,
  Printer, Scissors, Copy, ClipboardPaste, Paperclip, Columns3, Share2,
} from 'lucide-react';
import { COLORS, COLOR_SWATCHES, type Task, type MemberInfo } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { Avatar } from '../ui/Avatar';
import { selectStyle, popoverRowStyle, FF } from '../ui/styles';
import { ColumnManager } from './ColumnManager';
import type { GridActions } from './types';
import { MobileToolbarSheet } from './MobileToolbarSheet';

export function GridToolbar({ projectId, tasks, grid, filterSlot, extraLeft, members = [] }: { projectId: string; tasks: Task[]; grid: GridActions; filterSlot?: React.ReactNode; extraLeft?: React.ReactNode; members?: MemberInfo[] }) {
  const { isMobile } = useViewport();
  const [open, setOpen] = React.useState<string | null>(null);
  const [mobileSheet, setMobileSheet] = React.useState(false);
  const importRef = React.useRef<HTMLInputElement>(null);
  const attachRef = React.useRef<HTMLInputElement>(null);
  const hasSelection = grid.selectedIds.size > 0;
  const toggle = (key: string) => setOpen(o => o === key ? null : key);

  /* ---- Mobile: compact toolbar + bottom sheet ---- */
  if (isMobile) {
    return (
      <>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        }}>
          <button
            onClick={e => { e.stopPropagation(); grid.onAddTask(projectId); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: FF, boxShadow: '0 1px 3px rgba(254,128,41,0.2)', minHeight: 40 }}
          >
            <Plus size={16} /> Add
          </button>
          <button onClick={grid.onUndo} disabled={!grid.canUndo} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${COLORS.line}`, borderRadius: 10, background: '#F3F4F6', color: grid.canUndo ? COLORS.ink : COLORS.line, cursor: grid.canUndo ? 'pointer' : 'not-allowed', opacity: grid.canUndo ? 1 : 0.5 }}><Undo2 size={16} /></button>
          <button onClick={grid.onRedo} disabled={!grid.canRedo} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${COLORS.line}`, borderRadius: 10, background: '#F3F4F6', color: grid.canRedo ? COLORS.ink : COLORS.line, cursor: grid.canRedo ? 'pointer' : 'not-allowed', opacity: grid.canRedo ? 1 : 0.5 }}><Redo2 size={16} /></button>
          <div style={{ flex: 1 }} />
          {hasSelection && <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, marginRight: 4 }}>{grid.selectedIds.size} selected</span>}
          <button onClick={() => setMobileSheet(true)} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${COLORS.line}`, borderRadius: 10, background: '#F3F4F6', color: COLORS.ink, cursor: 'pointer' }}><MoreHorizontal size={18} /></button>
        </div>
        {mobileSheet && <MobileToolbarSheet projectId={projectId} grid={grid} hasSelection={hasSelection} onClose={() => setMobileSheet(false)} members={members} />}
      </>
    );
  }

  /* ---- Desktop toolbar ---- */
  const iconBtn = (Icon: React.ElementType, key: string, title: string, opts: { disabled?: boolean; onClick?: () => void; popover?: React.ReactNode } = {}) => (
    <div key={key} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={e => { e.stopPropagation(); if (opts.onClick) opts.onClick(); else toggle(key); }}
        disabled={opts.disabled}
        title={title}
        style={{
          width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${open === key ? COLORS.ink : COLORS.line}`, borderRadius: 10, cursor: opts.disabled ? 'not-allowed' : 'pointer',
          background: open === key ? COLORS.ink : '#F3F4F6', color: open === key ? '#FFFFFF' : opts.disabled ? COLORS.line : COLORS.ink,
          opacity: opts.disabled ? 0.5 : 1
        }}
      >
        <Icon size={15} />
      </button>
      {open === key && opts.popover && (
        <div style={{
          position: 'absolute', top: 36, left: 0, background: '#FFFFFF', border: `1px solid ${COLORS.line}`,
          borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)', zIndex: 30, padding: 10, minWidth: 190
        }} onClick={e => e.stopPropagation()}>
          {opts.popover}
        </div>
      )}
    </div>
  );

  const Sep = () => <div key={Math.random()} style={{ width: 1, height: 22, background: COLORS.line, margin: '0 3px', flexShrink: 0 }} />;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: COLORS.card, border: `1px solid ${COLORS.line}`,
        borderRadius: 10, padding: 8, marginBottom: 10, flexWrap: 'wrap'
      }}
      onClick={() => setOpen(null)}
    >
      {extraLeft}

      <button
        onClick={e => { e.stopPropagation(); grid.onAddTask(projectId); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: FF, boxShadow: '0 1px 3px rgba(254,128,41,0.2)' }}
      >
        <Plus size={14} /> Add task
      </button>

      {iconBtn(UserPlus, 'assign', 'Assign to\u2026', {
        disabled: !hasSelection,
        popover: (
          <div>{members.map(m => (
            <button key={m.id} onClick={() => { grid.onBulkAssign(projectId, m.id); setOpen(null); }} style={popoverRowStyle}>
              <Avatar id={m.id} size={18} /> {m.name}
            </button>
          ))}</div>
        )
      })}

      {iconBtn(Repeat, 'recur', 'Set recurrence', {
        disabled: !hasSelection,
        popover: (
          <div>{[['none', 'No recurrence'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([k, label]) => (
            <button key={k} onClick={() => { grid.onSetRecurrence(projectId, k === 'none' ? null : k); setOpen(null); }} style={popoverRowStyle}>{label}</button>
          ))}</div>
        )
      })}

      <Sep />
      {iconBtn(Undo2, 'undo', 'Undo', { onClick: grid.onUndo, disabled: !grid.canUndo })}
      {iconBtn(Redo2, 'redo', 'Redo', { onClick: grid.onRedo, disabled: !grid.canRedo })}

      <Sep />
      {iconBtn(Outdent, 'outdent', 'Outdent', { onClick: () => grid.onOutdent(projectId), disabled: !hasSelection })}
      {iconBtn(Indent, 'indent', 'Indent', { onClick: () => grid.onIndent(projectId), disabled: !hasSelection })}

      <Sep />
      {iconBtn(Link2, 'link', 'Link selected tasks', { onClick: () => grid.onLink(projectId), disabled: grid.selectedIds.size < 2 })}
      {iconBtn(Unlink2, 'unlink', 'Unlink selected tasks', { onClick: () => grid.onUnlink(projectId), disabled: !hasSelection })}
      {iconBtn(Trash2, 'delete', 'Delete selected', { onClick: () => grid.onDeleteSelected(projectId), disabled: !hasSelection })}

      <Sep />
      {iconBtn(Bold, 'bold', 'Bold text', { onClick: () => grid.onToggleBold(projectId), disabled: !hasSelection })}
      {iconBtn(Palette, 'color', 'Colour tag', {
        disabled: !hasSelection,
        popover: (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, width: 140 }}>
            {COLOR_SWATCHES.map((c, i) => (
              <button
                key={i} onClick={() => { grid.onSetColor(projectId, c); setOpen(null); }}
                title={c || 'No colour'}
                style={{ width: 22, height: 22, borderRadius: 10, cursor: 'pointer', background: c || '#FFFFFF', border: c ? 'none' : `1px dashed ${COLORS.gray}` }}
              />
            ))}
          </div>
        )
      })}
      {iconBtn(Hash, 'numfmt', `Duration: ${grid.durationUnit}`, { onClick: grid.onToggleDurationUnit })}
      {iconBtn(Diamond, 'milestone', 'Mark as milestone', { onClick: () => grid.onToggleMilestone(projectId), disabled: !hasSelection })}

      <Sep />
      <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) grid.onImportCSV(projectId, e.target.files[0]); e.target.value = ''; }} />
      {iconBtn(FileUp, 'import', 'Import CSV', { onClick: () => importRef.current?.click() })}
      {iconBtn(FileDown, 'export', 'Export CSV', { onClick: () => grid.onExportCSV(projectId) })}
      {iconBtn(Printer, 'print', 'Print', { onClick: grid.onPrint })}

      <Sep />
      {iconBtn(Scissors, 'cut', 'Cut', { onClick: () => grid.onCut(projectId), disabled: !hasSelection })}
      {iconBtn(Copy, 'copy', 'Copy', { onClick: () => grid.onCopy(projectId), disabled: !hasSelection })}
      {iconBtn(ClipboardPaste, 'paste', 'Paste', { onClick: () => grid.onPaste(projectId), disabled: !grid.canPaste })}

      <Sep />
      <input ref={attachRef} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) grid.onAttachFiles(projectId, e.target.files); e.target.value = ''; }} />
      {iconBtn(Paperclip, 'attach', 'Attach files to selected task', { onClick: () => attachRef.current?.click(), disabled: !hasSelection })}

      {iconBtn(Columns3, 'column', 'Add or remove columns', {
        popover: <ColumnManager projectId={projectId} customCols={grid.customCols} onAddColumn={grid.onAddColumn} onRemoveColumn={grid.onRemoveColumn} />
      })}

      {filterSlot}

      {iconBtn(Share2, 'share', 'Share project', { onClick: () => grid.onOpenShare(projectId) })}

      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: COLORS.gray, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: FF }}>
        {hasSelection ? `${grid.selectedIds.size} selected` : 'Select rows to enable row actions'}
      </span>
    </div>
  );
}

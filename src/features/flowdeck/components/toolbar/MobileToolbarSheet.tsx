'use client';

import React from 'react';
import {
  UserPlus, Repeat, Link2, Unlink2, Trash2, Bold, Palette, Diamond,
  Indent, Outdent, Hash, Scissors, Copy, ClipboardPaste, Paperclip,
  FileUp, FileDown, Printer, Share2, ArrowLeft,
} from 'lucide-react';
import { COLORS, COLOR_SWATCHES, type MemberInfo } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { Avatar } from '../ui/Avatar';
import { FF } from '../ui/styles';
import type { GridActions } from './types';

export function MobileToolbarSheet({ projectId, grid, hasSelection, onClose, members = [] }: {
  projectId: string; grid: GridActions; hasSelection: boolean; onClose: () => void; members?: MemberInfo[];
}) {
  const { isMobile } = useViewport();
  const [colorPicker, setColorPicker] = React.useState(false);
  const [assignPicker, setAssignPicker] = React.useState(false);
  const [triggerImport, setTriggerImport] = React.useState(0);
  const [triggerAttach, setTriggerAttach] = React.useState(0);
  const localImportRef = React.useRef<HTMLInputElement>(null);
  const localAttachRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (triggerImport > 0) localImportRef.current?.click();
  }, [triggerImport]);
  React.useEffect(() => {
    if (triggerAttach > 0) localAttachRef.current?.click();
  }, [triggerAttach]);

  const sectionTitle = (text: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FF, padding: '12px 0 6px', marginTop: 4 }}>{text}</div>
  );

  const actionRow = (Icon: React.ElementType, label: string, onClick: () => void, disabled = false, color?: string) => (
    <button
      key={label}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
        padding: '12px 14px', border: 'none', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent', fontFamily: FF, fontSize: 14, fontWeight: 500,
        color: color || (disabled ? COLORS.line : COLORS.ink), opacity: disabled ? 0.4 : 1,
        minHeight: 48,
      }}
    >
      <Icon size={18} strokeWidth={1.8} />
      {label}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <input ref={localImportRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) grid.onImportCSV(projectId, e.target.files[0]); e.target.value = ''; }} />
      <input ref={localAttachRef} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) grid.onAttachFiles(projectId, e.target.files); e.target.value = ''; }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '8px 16px 28px', maxHeight: '75vh', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '4px auto 8px' }} />

        {!assignPicker && !colorPicker && (
          <>
            {sectionTitle('SELECTION')}
            {actionRow(UserPlus, 'Assign to\u2026', () => setAssignPicker(true), !hasSelection)}
            {actionRow(Repeat, 'Set recurrence', () => {
              const freqs: [string, string][] = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
              grid.onSetRecurrence(projectId, freqs[0][0]); onClose();
            }, !hasSelection)}
            {actionRow(Link2, 'Link tasks', () => grid.onLink(projectId), grid.selectedIds.size < 2)}
            {actionRow(Unlink2, 'Unlink tasks', () => grid.onUnlink(projectId), !hasSelection)}
            {actionRow(Trash2, 'Delete selected', () => grid.onDeleteSelected(projectId), !hasSelection, COLORS.red)}

            {sectionTitle('FORMATTING')}
            {actionRow(Bold, 'Toggle bold', () => grid.onToggleBold(projectId), !hasSelection)}
            {actionRow(Palette, 'Colour tag', () => setColorPicker(true), !hasSelection)}
            {actionRow(Diamond, 'Toggle milestone', () => grid.onToggleMilestone(projectId), !hasSelection)}
            {actionRow(Indent, 'Indent', () => grid.onIndent(projectId), !hasSelection)}
            {actionRow(Outdent, 'Outdent', () => grid.onOutdent(projectId), !hasSelection)}
            {actionRow(Hash, `Duration: ${grid.durationUnit}`, grid.onToggleDurationUnit)}

            {sectionTitle('CLIPBOARD & FILES')}
            {actionRow(Scissors, 'Cut', () => grid.onCut(projectId), !hasSelection)}
            {actionRow(Copy, 'Copy', () => grid.onCopy(projectId), !hasSelection)}
            {actionRow(ClipboardPaste, 'Paste', () => grid.onPaste(projectId), !grid.canPaste)}
            {actionRow(Paperclip, 'Attach files', () => setTriggerAttach(n => n + 1), !hasSelection)}

            {sectionTitle('IMPORT / EXPORT')}
            {actionRow(FileUp, 'Import CSV', () => setTriggerImport(n => n + 1))}
            {actionRow(FileDown, 'Export CSV', () => { grid.onExportCSV(projectId); onClose(); })}
            {actionRow(Printer, 'Print', grid.onPrint)}
            {actionRow(Share2, 'Share project', () => { grid.onOpenShare(projectId); onClose(); })}
          </>
        )}

        {assignPicker && (
          <>
            <button onClick={() => setAssignPicker(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 14, fontWeight: 600, color: COLORS.gray, padding: '8px 0', minHeight: 44 }}><ArrowLeft size={16} /> Assign to</button>
            {members.map(m => (
              <button key={m.id} onClick={() => { grid.onBulkAssign(projectId, m.id); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FF, fontSize: 14, borderRadius: 12, minHeight: 48 }}>
                <Avatar id={m.id} size={22} /> {m.name}
              </button>
            ))}
          </>
        )}

        {colorPicker && (
          <>
            <button onClick={() => setColorPicker(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: FF, fontSize: 14, fontWeight: 600, color: COLORS.gray, padding: '8px 0', minHeight: 44 }}><ArrowLeft size={16} /> Colour tag</button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 4px' }}>
              {COLOR_SWATCHES.map((c, i) => (
                <button
                  key={i} onClick={() => { grid.onSetColor(projectId, c); onClose(); }}
                  title={c || 'No colour'}
                  style={{ width: 36, height: 36, borderRadius: 12, cursor: 'pointer', background: c || '#FFFFFF', border: c ? 'none' : `1px dashed ${COLORS.gray}` }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

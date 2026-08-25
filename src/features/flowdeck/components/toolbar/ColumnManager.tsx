'use client';

import React from 'react';
import { Plus, X } from 'lucide-react';
import { COLORS } from '@/features/flowdeck/model';
import type { CustomColumn } from '@/features/flowdeck/model';
import { selectStyle, popoverRowStyle, FF } from '../ui/styles';

export function ColumnManager({ projectId, customCols, onAddColumn, onRemoveColumn }: { projectId: string; customCols: CustomColumn[]; onAddColumn: (projectId: string, def: CustomColumn) => void; onRemoveColumn: (projectId: string, key: string) => void }) {
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState('');
  const [type, setType] = React.useState<CustomColumn['type']>('text');

  function submit() {
    if (!label.trim()) return;
    onAddColumn(projectId, { key: 'custom_' + Math.random().toString(36).slice(2, 8), label: label.trim(), type });
    setLabel(''); setType('text'); setAdding(false);
  }

  return (
    <div style={{ width: 220 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, marginBottom: 6, fontFamily: FF }}>CUSTOM COLUMNS</div>
      {customCols.length === 0 && <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 8, fontFamily: FF }}>None yet.</div>}
      {customCols.map(c => (
        <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px', fontSize: 12.5, fontFamily: FF }}>
          <span>{c.label} <span style={{ color: COLORS.gray, fontSize: 11 }}>({c.type})</span></span>
          <button onClick={() => onRemoveColumn(projectId, c.key)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4 }}><X size={13} /></button>
        </div>
      ))}
      <div style={{ height: 1, background: COLORS.line, margin: '8px 0' }} />
      {!adding ? (
        <button onClick={() => setAdding(true)} style={{ ...popoverRowStyle, color: COLORS.accent, fontWeight: 700 }}>
          <Plus size={13} /> Add column
        </button>
      ) : (
        <div>
          <input autoFocus placeholder="Column name" value={label} onChange={e => setLabel(e.target.value)} style={{ ...selectStyle, marginBottom: 6, fontSize: 13, minHeight: 38 }} />
          <select value={type} onChange={e => setType(e.target.value as CustomColumn['type'])} style={{ ...selectStyle, marginBottom: 6, fontSize: 13, minHeight: 38 }}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
          </select>
          <button onClick={submit} disabled={!label.trim()} style={{ width: '100%', background: label.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: label.trim() ? 'pointer' : 'not-allowed', fontFamily: FF, minHeight: 40 }}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Type, Hash, Calendar, List } from 'lucide-react';
import { COLORS } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { selectStyle, FF } from '../ui/styles';
import type { CustomColumn } from '@/features/flowdeck/model';

interface CustomFieldsModalProps {
  columns: CustomColumn[];
  onAdd: (col: CustomColumn) => void;
  onRemove: (key: string) => void;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { value: 'text' as const, label: 'Text', icon: Type, desc: 'Short text input' },
  { value: 'number' as const, label: 'Number', icon: Hash, desc: 'Numeric values' },
  { value: 'date' as const, label: 'Date', icon: Calendar, desc: 'Date picker' },
  { value: 'select' as const, label: 'Dropdown', icon: List, desc: 'Pick from options' },
];

export function CustomFieldsModal({ columns, onAdd, onRemove, onClose }: CustomFieldsModalProps) {
  const { isMobile } = useViewport();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomColumn['type']>('text');
  const [options, setOptions] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  function handleAdd() {
    if (!label.trim()) return;
    const key = 'cf_' + label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Math.random().toString(36).slice(2, 5);
    const opts = type === 'select' ? options.split(',').map(o => o.trim()).filter(Boolean) : undefined;
    onAdd({ key, label: label.trim(), type, options: opts });
    setLabel('');
    setOptions('');
  }

  function startEdit(col: CustomColumn) {
    setEditingKey(col.key);
    setEditLabel(col.label);
  }

  function saveEdit(key: string) {
    if (!editLabel.trim()) return;
    onRemove(key);
    onAdd({ ...columns.find(c => c.key === key)!, label: editLabel.trim() });
    setEditingKey(null);
    setEditLabel('');
  }

  const modalContent = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontFamily: FF, fontSize: isMobile ? 18 : 17, margin: 0, fontWeight: 700 }}>Custom Fields</h3>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
      </div>

      {/* Existing fields */}
      {columns.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Active Fields ({columns.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {columns.map(col => {
              const typeInfo = TYPE_OPTIONS.find(t => t.value === col.type);
              const Icon = typeInfo?.icon || Type;
              return (
                <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${COLORS.line}`, background: '#FFFFFF' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.graySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color={COLORS.gray} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingKey === col.key ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={() => saveEdit(col.key)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(col.key); if (e.key === 'Escape') setEditingKey(null); }}
                        style={{ fontSize: 13, fontWeight: 600, fontFamily: FF, border: `1.5px solid ${COLORS.accent}`, borderRadius: 6, padding: '4px 8px', outline: 'none', width: '100%' }}
                      />
                    ) : (
                      <div onClick={() => startEdit(col)} style={{ fontSize: 13.5, fontWeight: 600, fontFamily: FF, color: COLORS.ink, cursor: 'pointer' }}>{col.label}</div>
                    )}
                    <div style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF, marginTop: 1 }}>{typeInfo?.desc}{col.options ? ` (${col.options.length} options)` : ''}</div>
                  </div>
                  <button onClick={() => onRemove(col.key)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: COLORS.redSoft, color: COLORS.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add new field */}
      <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Add New Field
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, display: 'block', marginBottom: 4 }}>Field Name</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Budget, Client, Sprint" style={selectStyle} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, display: 'block', marginBottom: 6 }}>Field Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.value} onClick={() => setType(opt.value)} style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${type === opt.value ? COLORS.accent : COLORS.line}`,
                    background: type === opt.value ? COLORS.accentSoft : '#FFFFFF',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={15} color={type === opt.value ? COLORS.accent : COLORS.gray} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: FF, color: type === opt.value ? COLORS.accent : COLORS.ink }}>{opt.label}</div>
                        <div style={{ fontSize: 10.5, fontFamily: FF, color: COLORS.gray, marginTop: 1 }}>{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {type === 'select' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, display: 'block', marginBottom: 4 }}>Options (comma-separated)</label>
              <input value={options} onChange={e => setOptions(e.target.value)} placeholder="e.g. Pending, Approved, Rejected" style={selectStyle} />
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={!label.trim()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
              background: label.trim() ? COLORS.accent : COLORS.line,
              color: '#FFFFFF', fontSize: 13, fontWeight: 700, fontFamily: FF,
              cursor: label.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            <Plus size={16} /> Add Field
          </button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${COLORS.line}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.ink, padding: 6, borderRadius: 10, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FF, flex: 1 }}>Custom Fields</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Same content but without the header/close button */}
          {columns.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Active Fields ({columns.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {columns.map(col => {
                  const typeInfo = TYPE_OPTIONS.find(t => t.value === col.type);
                  const Icon = typeInfo?.icon || Type;
                  return (
                    <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${COLORS.line}`, background: '#FFFFFF' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.graySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} color={COLORS.gray} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingKey === col.key ? (
                          <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)} onBlur={() => saveEdit(col.key)} onKeyDown={e => { if (e.key === 'Enter') saveEdit(col.key); if (e.key === 'Escape') setEditingKey(null); }} style={{ fontSize: 13, fontWeight: 600, fontFamily: FF, border: `1.5px solid ${COLORS.accent}`, borderRadius: 6, padding: '4px 8px', outline: 'none', width: '100%' }} />
                        ) : (
                          <div onClick={() => startEdit(col)} style={{ fontSize: 14, fontWeight: 600, fontFamily: FF, color: COLORS.ink, cursor: 'pointer' }}>{col.label}</div>
                        )}
                        <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, marginTop: 1 }}>{typeInfo?.desc}</div>
                      </div>
                      <button onClick={() => onRemove(col.key)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: COLORS.redSoft, color: COLORS.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${COLORS.line}`, paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Add New Field</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, display: 'block', marginBottom: 4 }}>Field Name</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Budget, Client" style={selectStyle} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, display: 'block', marginBottom: 6 }}>Field Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {TYPE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button key={opt.value} onClick={() => setType(opt.value)} style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${type === opt.value ? COLORS.accent : COLORS.line}`, background: type === opt.value ? COLORS.accentSoft : '#FFFFFF', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon size={15} color={type === opt.value ? COLORS.accent : COLORS.gray} />
                          <div><div style={{ fontSize: 13, fontWeight: 600, fontFamily: FF, color: type === opt.value ? COLORS.accent : COLORS.ink }}>{opt.label}</div><div style={{ fontSize: 11, fontFamily: FF, color: COLORS.gray, marginTop: 1 }}>{opt.desc}</div></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {type === 'select' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, fontFamily: FF, color: COLORS.ink, display: 'block', marginBottom: 4 }}>Options (comma-separated)</label>
                  <input value={options} onChange={e => setOptions(e.target.value)} placeholder="e.g. Pending, Approved" style={selectStyle} />
                </div>
              )}
              <button onClick={handleAdd} disabled={!label.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: label.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', fontSize: 14, fontWeight: 700, fontFamily: FF, cursor: label.trim() ? 'pointer' : 'not-allowed' }}><Plus size={17} /> Add Field</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 16, padding: 24, width: 'min(460px, 92vw)', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)' }}>
        {modalContent}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X, LayoutTemplate, Sparkles } from 'lucide-react';
import { COLORS, PROJECT_COLORS, TODAY, addDays, PROJECT_TEMPLATES } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { Field } from '../ui/Field';
import { selectStyle, FF } from '../ui/styles';
import type { Tag, CustomColumn, Task } from '@/features/flowdeck/model';

export function NewProjectModal({
  onClose,
  onCreate,
  onCreateFromTemplate,
  submitting = false,
}: {
  onClose: () => void;
  onCreate: (p: { name: string; color: string; start: string; end: string }) => void;
  onCreateFromTemplate?: (templateId: string, name: string, color: string, start: string, end: string) => void;
  submitting?: boolean;
}) {
  const [mode, setMode] = useState<'blank' | 'template'>('blank');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [start, setStart] = useState(TODAY.toISOString().slice(0, 10));
  const [end, setEnd] = useState(addDays(TODAY.toISOString().slice(0, 10), 30).toISOString().slice(0, 10));
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const valid = name.trim() && new Date(end) > new Date(start);
  const tplValid = name.trim() && new Date(end) > new Date(start) && selectedTemplate;

  function submitBlank() {
    if (!valid || submitting) return;
    onCreate({ name: name.trim(), color, start, end });
  }

  function submitTemplate() {
    if (!tplValid || !onCreateFromTemplate || !selectedTemplate || submitting) return;
    onCreateFromTemplate(selectedTemplate, name.trim(), color, start, end);
  }

  const { isMobile } = useViewport();

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: isMobile ? '10px 16px' : '8px 14px',
    borderRadius: 10,
    border: `1.5px solid ${active ? COLORS.accent : COLORS.line}`,
    background: active ? COLORS.accentSoft : '#FFFFFF',
    color: active ? COLORS.accent : COLORS.gray,
    fontSize: isMobile ? 13.5 : 13,
    fontWeight: 600,
    fontFamily: FF,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all 0.15s',
  });

  const templateCardStyle = (selected: boolean): React.CSSProperties => ({
    padding: isMobile ? '14px 16px' : '16px',
    borderRadius: 12,
    border: `1.5px solid ${selected ? COLORS.accent : COLORS.line}`,
    background: selected ? COLORS.accentSoft : '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const formContent = (
    <>
      <Field label="Project name">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 Marketing Campaign" style={selectStyle} />
      </Field>
      <Field label="Colour">
        <div style={{ display: 'flex', gap: isMobile ? 10 : 8, flexWrap: 'wrap' }}>
          {PROJECT_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: isMobile ? 32 : 24, height: isMobile ? 32 : 24, borderRadius: isMobile ? 12 : 10, background: c, cursor: 'pointer', border: color === c ? `2.5px solid ${COLORS.ink}` : '2.5px solid transparent', transition: 'border 0.15s' }} />
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Start date"><input type="date" value={start} onChange={e => setStart(e.target.value)} style={selectStyle} /></Field>
        <Field label="End date"><input type="date" value={end} onChange={e => setEnd(e.target.value)} style={selectStyle} /></Field>
      </div>
      {name.trim() && !(new Date(end) > new Date(start)) && (
        <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 12, marginTop: -6, fontFamily: FF }}>End date must be after the start date.</div>
      )}
    </>
  );

  const templateContent = (
    <>
      <Field label="Project name">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q4 Marketing Campaign" style={selectStyle} />
      </Field>
      <Field label="Start date">
        <input type="date" value={start} onChange={e => setStart(e.target.value)} style={selectStyle} />
      </Field>
      <Field label="Choose a template">
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 8, maxHeight: isMobile ? 280 : 260, overflowY: 'auto' }}>
          {PROJECT_TEMPLATES.map(tpl => (
            <div key={tpl.id} onClick={() => setSelectedTemplate(tpl.id)} style={templateCardStyle(selectedTemplate === tpl.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: isMobile ? 24 : 22, lineHeight: 1 }}>{tpl.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMobile ? 14 : 13.5, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>{tpl.name}</div>
                  <div style={{ fontSize: isMobile ? 12 : 11.5, color: COLORS.gray, fontFamily: FF, marginTop: 2, lineHeight: 1.4 }}>{tpl.description}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: FF, color: COLORS.teal, background: COLORS.tealSoft, padding: '2px 8px', borderRadius: 6 }}>{tpl.taskCount} tasks</span>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {tpl.tags.slice(0, 3).map(tag => (
                        <span key={tag.name} style={{ fontSize: 10, fontWeight: 600, fontFamily: FF, color: tag.color, background: `${tag.color}14`, padding: '1px 6px', borderRadius: 4 }}>{tag.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selectedTemplate === tpl.id ? COLORS.accent : COLORS.line}`, background: selectedTemplate === tpl.id ? COLORS.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selectedTemplate === tpl.id && <span style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 1 }}>&#10003;</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Field>
      {name.trim() && !(new Date(end) > new Date(start)) && (
        <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 12, marginTop: -6, fontFamily: FF }}>Start date is required.</div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '8px 20px 32px', maxHeight: '92vh', overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '4px auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontFamily: FF, fontSize: 18, margin: 0 }}>New project</h3>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <button onClick={() => setMode('blank')} style={tabStyle(mode === 'blank')}><LayoutTemplate size={16} /> Blank</button>
            <button onClick={() => setMode('template')} style={tabStyle(mode === 'template')}><Sparkles size={16} /> Template</button>
          </div>
          {mode === 'blank' ? (
            <>
              {formContent}
              <button onClick={submitBlank} disabled={!valid} style={{ marginTop: 6, width: '100%', background: valid ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: valid ? '0 1px 3px rgba(254,128,41,0.2)' : 'none' }}>
                Create project
              </button>
            </>
          ) : (
            <>
              {templateContent}
              <button onClick={submitTemplate} disabled={!tplValid} style={{ marginTop: 6, width: '100%', background: tplValid ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: tplValid ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: tplValid ? '0 1px 3px rgba(254,128,41,0.2)' : 'none' }}>
                Create from template
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 16, padding: 24, width: 'min(480px, 92vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: FF, fontSize: 17, margin: 0 }}>New project</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button onClick={() => setMode('blank')} style={tabStyle(mode === 'blank')}><LayoutTemplate size={15} /> Blank</button>
          <button onClick={() => setMode('template')} style={tabStyle(mode === 'template')}><Sparkles size={15} /> Template</button>
        </div>
        {mode === 'blank' ? (
          <>
            {formContent}
            <button onClick={submitBlank} disabled={!valid} style={{ marginTop: 6, width: '100%', background: valid ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13.5, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: valid ? '0 1px 3px rgba(254,128,41,0.2)' : 'none' }}>Create project</button>
          </>
        ) : (
          <>
            {templateContent}
            <button onClick={submitTemplate} disabled={!tplValid} style={{ marginTop: 6, width: '100%', background: tplValid ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13.5, fontWeight: 700, cursor: tplValid ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: tplValid ? '0 1px 3px rgba(254,128,41,0.2)' : 'none' }}>Create from template</button>
          </>
        )}
      </div>
    </div>
  );
}

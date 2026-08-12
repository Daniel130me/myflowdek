'use client';

import React from 'react';
import { X } from 'lucide-react';
import { COLORS, PRIORITY_META, TODAY, TAG_COLORS, type Task, type Tag, type TaskPriority, type CreateTaskInput, type MemberInfo } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { Field } from '../ui/Field';
import { selectStyle, FF } from '../ui/styles';

export function NewTaskModal({ projectStart, tasks = [], tags = [], members = [], onClose, onCreate }: { projectStart: string; tasks?: Task[]; tags?: Tag[]; members?: MemberInfo[]; onClose: () => void; onCreate: (input: CreateTaskInput) => void }) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [assignee, setAssignee] = React.useState(members[0]?.id ?? '');
  const [priority, setPriority] = React.useState<TaskPriority>('medium');
  const [duration, setDuration] = React.useState(5);
  const [start, setStart] = React.useState(TODAY.toISOString().slice(0, 10));
  const [dueDate, setDueDate] = React.useState('');
  const [parentId, setParentId] = React.useState<string | null>(null);
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(new Set());

  function submit() {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: description.trim() || undefined,
      status: 'backlog',
      assignee,
      start,
      duration: Number(duration),
      priority,
      dueDate: dueDate || undefined,
      tags: [...selectedTags],
      parentId: parentId || null,
    });
  }

  const { isMobile } = useViewport();

  const descStyle: React.CSSProperties = {
    width: '100%', border: `1.5px solid ${COLORS.line}`, borderRadius: 10,
    padding: '10px 14px', fontSize: 13.5, fontFamily: FF, color: COLORS.ink,
    background: '#FFFFFF', outline: 'none', minHeight: 80, resize: 'vertical' as const,
    lineHeight: 1.5, boxSizing: 'border-box' as const,
  };

  /* Build parent task options */
  const topLevelTasks = tasks.filter(t => !t.parentId);
  const parentOptions: { id: string; name: string; indent: number }[] = [];
  for (const top of topLevelTasks) {
    parentOptions.push({ id: top.id, name: top.name, indent: 0 });
    const children = tasks.filter(t => t.parentId === top.id);
    for (const child of children) { parentOptions.push({ id: child.id, name: child.name, indent: 1 }); }
  }

  const parentSelectContent = (
    <Field label="Parent task">
      <select value={parentId || ''} onChange={e => setParentId(e.target.value || null)} style={selectStyle}>
        <option value="">None (top-level task)</option>
        {parentOptions.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.indent > 0 ? '\u2014 ' : ''}{opt.name}</option>
        ))}
      </select>
    </Field>
  );

  const tagToggle = (tagId: string) => {
    setSelectedTags(prev => { const n = new Set(prev); if (n.has(tagId)) n.delete(tagId); else n.add(tagId); return n; });
  };

  const tagPickerContent = tags.length > 0 ? (
    <Field label="Tags">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tags.map(tag => (
          <button key={tag.id} onClick={() => tagToggle(tag.id)} style={{
            padding: '4px 12px', borderRadius: 9999, border: `1.5px solid ${selectedTags.has(tag.id) ? tag.color : COLORS.line}`,
            background: selectedTags.has(tag.id) ? TAG_COLORS.find(c => c.text === tag.color)?.bg || '#F3F4F6' : '#FFFFFF',
            color: tag.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FF, transition: 'all 0.15s',
          }}>{tag.name}</button>
        ))}
      </div>
    </Field>
  ) : null;

  if (isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '8px 20px 32px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '4px auto 16px' }} />
          <h3 style={{ fontFamily: FF, fontSize: 18, margin: '0 0 18px' }}>New task</h3>
          <Field label="Task name"><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Draft launch email" style={selectStyle} /></Field>
          <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a more detailed description\u2026" style={descStyle} /></Field>
          {parentSelectContent}
          {tagPickerContent}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Assignee"><select value={assignee} onChange={e => setAssignee(e.target.value)} style={selectStyle}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
            <Field label="Priority"><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} style={selectStyle}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
            <Field label="Start date"><input type="date" value={start} onChange={e => setStart(e.target.value)} style={selectStyle} /></Field>
            <Field label="Due date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={selectStyle} /></Field>
            <Field label="Duration (days)"><input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))} style={selectStyle} /></Field>
          </div>
          <button onClick={submit} disabled={!name.trim()} style={{ marginTop: 6, width: '100%', background: name.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: name.trim() ? '0 1px 3px rgba(254,128,41,0.2)' : 'none' }}>Create task</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 16, padding: 24, width: 'min(440px, 92vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: FF, fontSize: 17, margin: 0 }}>New task</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <Field label="Task name"><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Draft launch email" style={selectStyle} /></Field>
        <Field label="Description"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a more detailed description\u2026" style={descStyle} /></Field>
        {parentSelectContent}
        {tagPickerContent}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Assignee"><select value={assignee} onChange={e => setAssignee(e.target.value)} style={selectStyle}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          <Field label="Priority"><select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} style={selectStyle}>{Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
          <Field label="Start date"><input type="date" value={start} onChange={e => setStart(e.target.value)} style={selectStyle} /></Field>
          <Field label="Due date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={selectStyle} /></Field>
          <Field label="Duration (days)"><input type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))} style={selectStyle} /></Field>
        </div>
        <button onClick={submit} disabled={!name.trim()} style={{ marginTop: 6, width: '100%', background: name.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13.5, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: name.trim() ? '0 1px 3px rgba(254,128,41,0.2)' : 'none' }}>Create task</button>
      </div>
    </div>
  );
}

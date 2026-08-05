'use client';

import React from 'react';
import { X, Check } from 'lucide-react';
import { COLORS, TEAM, type Project } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { Avatar } from '../ui/Avatar';
import { Field } from '../ui/Field';
import { selectStyle, FF } from '../ui/styles';

export function ShareModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const [link] = React.useState(`https://flowdeck.app/share/${project.id}-${Math.random().toString(36).slice(2, 8)}`);
  const [copied, setCopied] = React.useState(false);
  const [people, setPeople] = React.useState<(typeof TEAM[number] & { access: 'view' | 'edit' })[]>(TEAM.slice(0, 4).map(m => ({ ...m, access: 'edit' })));

  function copyLink() {
    if (navigator.clipboard) navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 28px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: FF, fontSize: 18, margin: 0 }}>Share {project.name}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <Field label="Shareable link">
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={link} style={{ ...selectStyle, flex: 1, fontSize: 12, color: COLORS.gray, minHeight: 44 }} />
            <button onClick={copyLink} style={{ background: copied ? COLORS.green : COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: FF, whiteSpace: 'nowrap', minHeight: 44 }}>
              {copied ? <><Check size={13} /> Copied</> : 'Copy'}
            </button>
          </div>
        </Field>
        <Field label="People with access">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {people.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                <Avatar id={p.id} size={26} />
                <span style={{ fontSize: 14, flex: 1, fontFamily: FF }}>{p.name}</span>
                <select
                  value={p.access}
                  onChange={e => setPeople(prev => prev.map(x => x.id === p.id ? { ...x, access: e.target.value as 'view' | 'edit' } : x))}
                  style={{ ...selectStyle, width: 'auto', fontSize: 13, padding: '8px 10px' }}
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
              </div>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

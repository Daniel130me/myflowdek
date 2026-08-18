'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { COLORS, RAID_META, RAID_ORDER, IMPACT_META, TODAY, type RaidItem } from '@/features/flowdeck/model';
import { Avatar, SectionHeader, selectStyle, FF, useMemberDirectory, useProjectMembers } from '../ui';
import { useViewport } from '../../hooks/useViewport';

export function RaidView({ items, onAdd, onUpdate, onRemove, projectId }: { items: RaidItem[]; onAdd: (item: RaidItem) => void; onUpdate: (id: string, patch: Partial<RaidItem>) => void; onRemove: (id: string) => void; projectId?: string | null }) {
  const { isMobile } = useViewport();
  // Real project members — used to populate the owner dropdown. Falls back
  // to an empty list when no project is selected.
  const { members } = useProjectMembers(projectId ?? null);
  const { lookup: lookupMember } = useMemberDirectory();
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ type: 'risk', description: '', owner: members[0]?.id ?? '', impact: 'medium' });
  const shown = filter === 'all' ? items : items.filter(i => i.type === filter);

  function submit() {
    if (!draft.description.trim()) return;
    onAdd({ id: 'r' + Math.random().toString(36).slice(2, 8), type: draft.type, description: draft.description.trim(), owner: draft.owner, impact: draft.impact, status: 'open', dateRaised: TODAY.toISOString().slice(0, 10) });
    setDraft({ type: 'risk', description: '', owner: members[0]?.id ?? '', impact: 'medium' });
    setShowForm(false);
  }

  /* Mobile: card layout */
  if (isMobile) {
    return (
      <div>
        <SectionHeader title="RAID Log" subtitle={`${items.length} items`} right={
          <button onClick={() => setShowForm(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}><Plus size={15} /> Add</button>
        } />
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any, paddingBottom: 4 }}>
          {['all', ...RAID_ORDER].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 9999, cursor: 'pointer', textTransform: 'capitalize', border: `1px solid ${COLORS.line}`, fontWeight: 600, background: filter === f ? COLORS.ink : '#F3F4F6', color: filter === f ? '#FFFFFF' : COLORS.ink, fontFamily: FF, whiteSpace: 'nowrap', minHeight: 36 }}>{f === 'all' ? 'All' : RAID_META[f].label + 's'}</button>
          ))}
        </div>
        {showForm && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} style={selectStyle}>{RAID_ORDER.map(t => <option key={t} value={t}>{RAID_META[t].label}</option>)}</select>
              <select value={draft.owner} onChange={e => setDraft({ ...draft, owner: e.target.value })} style={selectStyle}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </div>
            <select value={draft.impact} onChange={e => setDraft({ ...draft, impact: e.target.value })} style={{ ...selectStyle, marginBottom: 10 }}>
              {Object.entries(IMPACT_META).map(([k, v]) => <option key={k} value={k}>{v.label} impact</option>)}
            </select>
            <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Describe the risk, assumption, issue, or dependency…" rows={2} style={{ ...selectStyle, resize: 'vertical', marginBottom: 10 }} />
            <button onClick={submit} disabled={!draft.description.trim()} style={{ background: draft.description.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: draft.description.trim() ? 'pointer' : 'not-allowed', fontFamily: FF, width: '100%', minHeight: 48 }}>Add to log</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map(item => {
            const meta = RAID_META[item.type];
            return (
              <div key={item.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: meta.bg, color: meta.color, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 9999, fontFamily: FF }}>{meta.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: IMPACT_META[item.impact]?.color || COLORS.ink, fontFamily: FF }}>{IMPACT_META[item.impact]?.label || item.impact}</span>
                  </div>
                  <button onClick={() => onRemove(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                </div>
                <div style={{ fontSize: 14, fontFamily: FF, lineHeight: 1.4, marginBottom: 10 }}>{item.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar id={item.owner} size={22} />
                    <span style={{ fontSize: 12.5, color: COLORS.gray, fontFamily: FF }}>{lookupMember(item.owner)?.name.split(' ')[0]}</span>
                  </div>
                  <select value={item.status} onChange={e => onUpdate(item.id, { status: e.target.value })} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 12, padding: '6px 10px', fontWeight: 600, cursor: 'pointer', fontFamily: FF, minHeight: 36 }}><option value="open">Open</option><option value="mitigated">Mitigated</option><option value="closed">Closed</option></select>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13, fontFamily: FF }}>Nothing logged in this category yet.</div>}
        </div>
      </div>
    );
  }

  /* Desktop: table layout */
  return (
    <div>
      <SectionHeader title="RAID Log" subtitle="Risks, Assumptions, Issues & Dependencies" right={
        <button onClick={() => setShowForm(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF }}><Plus size={15} /> Log item</button>
      } />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', ...RAID_ORDER].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 9999, cursor: 'pointer', textTransform: 'capitalize', border: `1px solid ${COLORS.line}`, fontWeight: 600, background: filter === f ? COLORS.ink : '#F3F4F6', color: filter === f ? '#FFFFFF' : COLORS.ink, fontFamily: FF }}>{f === 'all' ? 'All' : RAID_META[f].label + 's'}</button>
        ))}
      </div>
      {showForm && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} style={selectStyle}>{RAID_ORDER.map(t => <option key={t} value={t}>{RAID_META[t].label}</option>)}</select>
            <select value={draft.owner} onChange={e => setDraft({ ...draft, owner: e.target.value })} style={selectStyle}>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <select value={draft.impact} onChange={e => setDraft({ ...draft, impact: e.target.value })} style={selectStyle}>{Object.entries(IMPACT_META).map(([k, v]) => <option key={k} value={k}>{v.label} impact</option>)}</select>
          </div>
          <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Describe the risk, assumption, issue, or dependency…" rows={2} style={{ ...selectStyle, resize: 'vertical', marginBottom: 10 }} />
          <button onClick={submit} disabled={!draft.description.trim()} style={{ background: draft.description.trim() ? COLORS.accent : COLORS.line, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: draft.description.trim() ? 'pointer' : 'not-allowed', fontFamily: FF }}>Add to log</button>
        </div>
      )}
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 2.2fr 1fr 100px 1fr 36px', padding: '10px 16px', fontSize: 11.5, fontWeight: 700, color: COLORS.gray, borderBottom: `1px solid ${COLORS.line}`, letterSpacing: 0.8 }}><div>TYPE</div><div>DESCRIPTION</div><div>OWNER</div><div>IMPACT</div><div>STATUS</div><div /></div>
          {shown.map(item => {
            const meta = RAID_META[item.type];
            return (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '110px 2.2fr 1fr 100px 1fr 36px', alignItems: 'center', padding: '11px 16px', borderBottom: `1px solid ${COLORS.line}`, fontSize: 13 }}>
                <span style={{ background: meta.bg, color: meta.color, fontSize: 11.5, fontWeight: 700, padding: '4px 8px', borderRadius: 9999, width: 'fit-content' }}>{meta.label}</span>
                <div style={{ paddingRight: 10 }}>{item.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Avatar id={item.owner} size={20} /> <span style={{ fontSize: 12.5 }}>{lookupMember(item.owner)?.name.split(' ')[0]}</span></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: IMPACT_META[item.impact]?.color || COLORS.ink }}>{IMPACT_META[item.impact]?.label || item.impact}</span>
                <select value={item.status} onChange={e => onUpdate(item.id, { status: e.target.value })} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 12, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}><option value="open">Open</option><option value="mitigated">Mitigated</option><option value="closed">Closed</option></select>
                <button onClick={() => onRemove(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray }}><Trash2 size={15} /></button>
              </div>
            );
          })}
          {shown.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13, fontFamily: FF }}>Nothing logged in this category yet.</div>}
        </div>
      </div>
    </div>
  );
}

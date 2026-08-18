'use client';

import React, { useState, useRef } from 'react';
import { Clock, Plus, Trash2, Timer } from 'lucide-react';
import { COLORS, type TimeLog } from '@/features/flowdeck/model';
import { FF } from './styles';
import { Avatar } from './Avatar';
import { useMemberDirectory } from './MemberDirectory';

interface TimeTrackingSectionProps {
  timeLogs: TimeLog[];
  onAdd: (minutes: number, note: string) => void;
  onDelete: (timeLogId: string) => void;
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const sectionStyle: React.CSSProperties = { marginBottom: 16 };
const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: COLORS.gray, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.8, fontFamily: FF, display: 'flex', alignItems: 'center', gap: 6 };

export function TimeTrackingSection({ timeLogs, onAdd, onDelete }: TimeTrackingSectionProps) {
  const [adding, setAdding] = useState(false);
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { lookup: lookupMember } = useMemberDirectory();

  const totalMinutes = timeLogs.reduce((sum, tl) => sum + tl.minutes, 0);

  function handleSubmit() {
    const h = parseInt(hours) || 0;
    const m = parseInt(mins) || 0;
    const total = h * 60 + m;
    if (total <= 0) return;
    onAdd(total, note || 'Time logged');
    setHours(''); setMins(''); setNote(''); setAdding(false);
  }

  function handleCancel() {
    setAdding(false); setHours(''); setMins(''); setNote('');
  }

  return (
    <div style={sectionStyle}>
      <div style={labelStyle}>
        <Clock size={13} color={COLORS.gray} />
        <span>Time Tracked</span>
        {totalMinutes > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FF, color: COLORS.teal, background: COLORS.tealSoft, padding: '1px 8px', borderRadius: 6 }}>{fmtDuration(totalMinutes)}</span>
        )}
      </div>

      {/* Time log entries */}
      {timeLogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: adding ? 10 : 0, maxHeight: 180, overflowY: 'auto' }}>
          {timeLogs.slice().reverse().map(tl => {
            const member = lookupMember(tl.userId);
            return (
              <div key={tl.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', borderBottom: `1px solid ${COLORS.lineLight}` }}>
                <Avatar id={tl.userId} size={22} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: FF, color: COLORS.ink, fontWeight: 500 }}>{member?.name || 'Unknown'}</div>
                  {tl.note && <div style={{ fontSize: 11, fontFamily: FF, color: COLORS.gray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tl.note}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: FF, color: COLORS.teal }}>{fmtDuration(tl.minutes)}</span>
                  <span style={{ fontSize: 10, color: COLORS.grayLight, fontFamily: FF }}>{fmtTime(tl.loggedAt)}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(tl.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.grayLight, padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add time form */}
      {adding ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: COLORS.graySoft, borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
              <input ref={inputRef} type="number" min={0} max={24} placeholder="h" value={hours} onChange={e => setHours(e.target.value)} style={{ width: 48, padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`, fontSize: 12, fontFamily: FF, outline: 'none', textAlign: 'center', color: COLORS.ink }} />
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>h</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
              <input type="number" min={0} max={59} placeholder="m" value={mins} onChange={e => setMins(e.target.value)} style={{ width: 48, padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`, fontSize: 12, fontFamily: FF, outline: 'none', textAlign: 'center', color: COLORS.ink }} />
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>m</span>
            </div>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="What did you work on?" onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleCancel(); }} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`, fontSize: 12, fontFamily: FF, outline: 'none', color: COLORS.ink }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button onClick={handleCancel} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${COLORS.line}`, background: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: COLORS.ink }}>Cancel</button>
            <button onClick={handleSubmit} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: COLORS.teal, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: '#FFFFFF' }}>Log Time</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, border: `1.5px dashed ${COLORS.line}`, background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontFamily: FF, color: COLORS.gray, width: '100%', transition: 'border-color 0.15s' }}>
          <Timer size={13} />
          Log time
        </button>
      )}
    </div>
  );
}

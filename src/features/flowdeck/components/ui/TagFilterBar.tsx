'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Filter } from 'lucide-react';
import { COLORS, type Tag } from '@/features/flowdeck/model';
import { FF } from './styles';

interface TagFilterBarProps {
  tags: Tag[];
  selectedTagIds: Set<string>;
  onToggleTag: (tagId: string) => void;
  onClearAll: () => void;
}

export function TagFilterBar({ tags, selectedTagIds, onToggleTag, onClearAll }: TagFilterBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = selectedTagIds.size;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${activeCount > 0 ? COLORS.accent : COLORS.line}`,
          background: activeCount > 0 ? COLORS.accentSoft : '#FFFFFF',
          fontFamily: FF, fontSize: 12.5, fontWeight: 600,
          color: activeCount > 0 ? '#9A3412' : COLORS.ink,
          transition: 'all 0.15s',
        }}
      >
        <Filter size={13} />
        <span>{activeCount > 0 ? `${activeCount} tag${activeCount > 1 ? 's' : ''}` : 'Tags'}</span>
        {activeCount > 0 && (
          <span
            onClick={e => { e.stopPropagation(); onClearAll(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: 9999,
              background: COLORS.accent, color: '#FFFFFF',
              marginLeft: 2,
            }}
          >
            <X size={9} />
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#FFFFFF', border: `1px solid ${COLORS.line}`,
          borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
          zIndex: 30, padding: 8, minWidth: 200, maxHeight: 320, overflowY: 'auto',
        }}>
          {tags.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 12.5, color: COLORS.gray, fontFamily: FF, textAlign: 'center' }}>
              No tags in this project
            </div>
          )}
          {tags.map(tag => {
            const active = selectedTagIds.has(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => onToggleTag(tag.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: active ? COLORS.accentSoft : 'transparent',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F3F4F6'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 4,
                  border: `2px solid ${active ? COLORS.accent : COLORS.line}`,
                  background: active ? COLORS.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {active && <span style={{ color: '#FFFFFF', fontSize: 9, lineHeight: 1 }}>&#10003;</span>}
                </div>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: tag.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontFamily: FF, color: COLORS.ink, fontWeight: active ? 600 : 400 }}>{tag.name}</span>
              </button>
            );
          })}
          {tags.length > 1 && (
            <div style={{ borderTop: `1px solid ${COLORS.line}`, marginTop: 4, paddingTop: 4 }}>
              <button
                onClick={onClearAll}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontSize: 12.5, fontFamily: FF, color: COLORS.gray,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >Clear all filters</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

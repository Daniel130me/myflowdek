'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal, CalendarDays, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react';
import { COLORS, STATUS_META, STATUS_ORDER, PRIORITY_META, TEAM, type SearchFilters, type SavedFilter, type Tag, EMPTY_FILTERS } from '@/features/flowdeck/model';
import { FF } from './styles';
import { Avatar } from './Avatar';
import { TagPill } from './TagPill';

interface SearchFilterPanelProps {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onClear: () => void;
  activeFilterCount: number;
  tags: Tag[];
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: SearchFilters) => void;
  onDeleteSavedFilter?: (id: string) => void;
  onApplySavedFilter?: (id: string) => void;
}

export function SearchFilterPanel({ open, onClose, filters, onChange, onClear, activeFilterCount, tags, savedFilters, onSaveFilter, onDeleteSavedFilter, onApplySavedFilter }: SearchFilterPanelProps) {
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');

  if (!open) return null;

  function toggleArray(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  }

  function set<K extends keyof SearchFilters>(key: K, val: SearchFilters[K]) {
    onChange({ ...filters, [key]: val });
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', right: 0, marginTop: 8,
    width: 'min(380px, 92vw)',
    background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 14,
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
    zIndex: 30, padding: 0, overflow: 'hidden',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderBottom: `1px solid ${COLORS.lineLight}`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, fontFamily: FF, color: COLORS.gray,
    textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8,
  };

  const pillBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`,
    fontSize: 12, fontFamily: FF, cursor: 'pointer', transition: 'all 0.12s',
    background: '#FFFFFF', color: COLORS.ink,
  };

  const pillActive: React.CSSProperties = {
    ...pillBase,
    borderColor: COLORS.accent, background: COLORS.accentSoft, color: '#9A3412', fontWeight: 600,
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${COLORS.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={15} color={COLORS.ink} />
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>Filters</span>
            {activeFilterCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FF, color: '#FFFFFF', background: COLORS.accent, borderRadius: 9999, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>{activeFilterCount}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {activeFilterCount > 0 && (
              <button onClick={onClear} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontFamily: FF, color: COLORS.accent, fontWeight: 600 }}>Clear all</button>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center' }}><X size={16} /></button>
          </div>
        </div>

        {/* Saved Filters */}
        {savedFilters !== undefined && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Saved Filters</div>
            {savedFilters.length === 0 ? (
              <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>No saved filters</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {savedFilters.map(sf => (
                  <div
                    key={sf.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F3F4F6'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span
                      onClick={() => { onApplySavedFilter?.(sf.id); onClose(); }}
                      style={{ fontSize: 13, fontWeight: 600, fontFamily: FF, color: COLORS.ink }}
                    >
                      {sf.name}
                    </span>
                    {onDeleteSavedFilter && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteSavedFilter(sf.id); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 2, display: 'flex', borderRadius: 4 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = COLORS.red; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = COLORS.gray; }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Status</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STATUS_ORDER.map(s => {
              const meta = STATUS_META[s];
              const active = filters.statuses.includes(s);
              return (
                <button key={s} onClick={() => set('statuses', toggleArray(filters.statuses, s))} style={active ? pillActive : pillBase}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Priority</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(PRIORITY_META).map(([k, v]) => {
              const active = filters.priorities.includes(k);
              return (
                <button key={k} onClick={() => set('priorities', toggleArray(filters.priorities, k))} style={active ? pillActive : pillBase}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: v.color, flexShrink: 0, transform: 'rotate(45deg)' }} />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignee */}
        <div style={sectionStyle}>
          <div style={labelStyle}>Assignee</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEAM.map(m => {
              const active = filters.assignees.includes(m.id);
              return (
                <button key={m.id} onClick={() => set('assignees', toggleArray(filters.assignees, m.id))} style={active ? pillActive : pillBase}>
                  <Avatar id={m.id} size={16} />
                  {m.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => {
                const active = filters.tags.includes(tag.id);
                return (
                  <button key={tag.id} onClick={() => set('tags', toggleArray(filters.tags, tag.id))} style={active ? pillActive : pillBase}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: tag.color, flexShrink: 0 }} />
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Range */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}><CalendarDays size={11} /> Due Date Range</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>After</span>
              <input type="date" value={filters.dueAfter || ''} onChange={e => set('dueAfter', e.target.value || null)} style={{ padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`, fontSize: 12, fontFamily: FF, outline: 'none', color: COLORS.ink }} />
            </div>
            <span style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF }}>–</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>Before</span>
              <input type="date" value={filters.dueBefore || ''} onChange={e => set('dueBefore', e.target.value || null)} style={{ padding: '5px 8px', borderRadius: 8, border: `1.5px solid ${COLORS.line}`, fontSize: 12, fontFamily: FF, outline: 'none', color: COLORS.ink }} />
            </div>
          </div>
        </div>

        {/* Save Filter Button */}
        {onSaveFilter && !showSaveInput && (
          <div style={{ padding: '10px 16px 14px' }}>
            <button
              onClick={() => setShowSaveInput(true)}
              style={{
                width: '100%', padding: '10px', background: COLORS.accentSoft, color: '#9A3412',
                fontWeight: 700, fontSize: 12.5, fontFamily: FF, borderRadius: 10,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Bookmark size={14} />
              Save current filter
            </button>
          </div>
        )}

        {/* Save Filter Input */}
        {onSaveFilter && showSaveInput && (
          <div style={{ padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              autoFocus
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && saveName.trim()) {
                  onSaveFilter(saveName.trim(), filters);
                  setSaveName('');
                  setShowSaveInput(false);
                }
                if (e.key === 'Escape') {
                  setSaveName('');
                  setShowSaveInput(false);
                }
              }}
              placeholder="Filter name…"
              style={{
                fontSize: 12.5, fontFamily: FF, padding: '8px 12px',
                border: `1.5px solid ${COLORS.accent}`, borderRadius: 10, outline: 'none', color: COLORS.ink,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  if (saveName.trim()) {
                    onSaveFilter(saveName.trim(), filters);
                    setSaveName('');
                    setShowSaveInput(false);
                  }
                }}
                style={{
                  flex: 1, padding: '7px 0', background: COLORS.accent, color: '#FFFFFF',
                  fontWeight: 600, fontSize: 12, fontFamily: FF, borderRadius: 10,
                  border: 'none', cursor: 'pointer',
                }}
              >Save</button>
              <button
                onClick={() => { setSaveName(''); setShowSaveInput(false); }}
                style={{
                  flex: 1, padding: '7px 0', background: '#FFFFFF', color: COLORS.gray,
                  fontWeight: 600, fontSize: 12, fontFamily: FF, borderRadius: 10,
                  border: `1.5px solid ${COLORS.line}`, cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

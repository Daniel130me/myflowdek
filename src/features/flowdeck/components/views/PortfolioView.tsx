'use client';

import React, { useState } from 'react';
import { COLORS, TODAY, dayMs, fmtDate, addDays, type Task, type Project } from '@/features/flowdeck/model';
import { Plus, Trash2, Star, Archive, RotateCcw, Users, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Avatar, SectionHeader, FF } from '../ui';
import { useViewport } from '../../hooks/useViewport';

type SortDir = 'asc' | 'desc';

export function PortfolioView({ projects, tasksByProject, searchQuery, onOpen, onDelete, onNew, onToggleFavorite, onArchive, onRestore }: {
  projects: Record<string, Project>; tasksByProject: Record<string, Task[]>; searchQuery: string;
  onOpen: (id: string) => void; onDelete: (id: string) => void; onNew: () => void;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
}) {
  const { isMobile } = useViewport();
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const activeProjects = Object.values(projects).filter(p => !p.isArchived && p.name.toLowerCase().includes((searchQuery || '').toLowerCase()));
  const archivedProjects = Object.values(projects).filter(p => p.isArchived && p.name.toLowerCase().includes((searchQuery || '').toLowerCase()));

  function statsFor(id: string) {
    const tasks = tasksByProject[id] || [];
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const progress = total ? Math.round(tasks.reduce((a, t) => a + t.progress, 0) / total) : 0;
    const overdue = tasks.filter(t => t.status !== 'done' && addDays(t.start, t.duration) < TODAY).length;
    return { total, done, progress, overdue };
  }

  /* ---- sort ---- */
  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortProjects(list: Project[]) {
    if (!sortKey) return list;
    const arr = [...list];
    arr.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortKey === 'progress') { va = statsFor(a.id).progress; vb = statsFor(b.id).progress; }
      else if (sortKey === 'members') { va = (a.members || []).length; vb = (b.members || []).length; }
      else if (sortKey === 'due') { va = new Date(a.end).getTime(); vb = new Date(b.end).getTime(); }
      else if (sortKey === 'tasks') { va = statsFor(a.id).total; vb = statsFor(b.id).total; }
      else if (sortKey === 'overdue') { va = statsFor(a.id).overdue; vb = statsFor(b.id).overdue; }
      else return 0;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }

  const sortedActive = sortProjects(activeProjects);
  const portfolioAvg = activeProjects.length === 0 ? 0 : Math.round(activeProjects.reduce((sum, p) => sum + statsFor(p.id).progress, 0) / activeProjects.length);

  /* ---- shared styles ---- */
  const thStyle: React.CSSProperties = {
    background: '#F9FAFB', borderBottom: `1px solid ${COLORS.line}`, fontSize: 11, fontWeight: 700,
    cursor: 'pointer', padding: '10px 14px', whiteSpace: 'nowrap', userSelect: 'none', color: COLORS.gray,
    textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FF,
  };
  const tdStyle: React.CSSProperties = {
    borderBottom: `1px solid ${COLORS.lineLight}`, padding: '10px 14px', fontSize: 13, fontFamily: FF, color: COLORS.ink, verticalAlign: 'middle',
  };

  /* ---- toggle button ---- */
  const togBtn = (active: boolean): React.CSSProperties => ({
    border: `1px solid ${active ? COLORS.accent : COLORS.line}`, background: active ? COLORS.accentSoft : COLORS.card,
    color: active ? COLORS.accent : COLORS.gray, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
  });

  /* ---- sort icon helper ---- */
  function renderSortIcon(col: string) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: 0.4 }} />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} style={{ marginLeft: 4, color: COLORS.accent }} />
      : <ArrowDown size={12} style={{ marginLeft: 4, color: COLORS.accent }} />;
  }

  /* ---- table row ---- */
  function renderTableRow(p: Project, archived: boolean) {
    const s = statsFor(p.id);
    const members = p.members || [];
    const maxAvatars = isMobile ? 2 : 3;
    return (
      <tr
        key={p.id}
        onClick={() => onOpen(p.id)}
        style={{ cursor: 'pointer', opacity: archived ? 0.6 : 1, transition: 'background 0.1s' }}
        onMouseEnter={e => { e.currentTarget.style.background = COLORS.lineLight; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <td style={{ ...tdStyle, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: archived ? 'line-through' : 'none' }}>{p.name}</span>
              {onToggleFavorite && !archived && (
                <button onClick={e => { e.stopPropagation(); onToggleFavorite(p.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: p.isFavorite ? '#FBBF24' : COLORS.line, padding: 0, display: 'flex', flexShrink: 0 }}>
                  <Star size={13} fill={p.isFavorite ? '#FBBF24' : 'none'} />
                </button>
              )}
            </div>
          </div>
        </td>
        <td style={{ ...tdStyle, minWidth: 130 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 60, height: 6, background: COLORS.line, borderRadius: 3 }}>
              <div style={{ width: `${s.progress}%`, height: '100%', borderRadius: 3, background: p.color, transition: 'width 0.2s' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.gray, whiteSpace: 'nowrap' }}>{s.progress}%</span>
          </div>
        </td>
        <td style={{ ...tdStyle, minWidth: 90 }}>
          {members.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {members.slice(0, maxAvatars).map((id, i) => (
                  <div key={id} style={{ marginLeft: i === 0 ? 0 : -6, border: '2px solid #FFFFFF', borderRadius: '50%' }}>
                    <Avatar id={id} size={22} />
                  </div>
                ))}
              </div>
              {members.length > maxAvatars && (
                <span style={{ marginLeft: 4, fontSize: 11, color: COLORS.gray, fontWeight: 600 }}>+{members.length - maxAvatars}</span>
              )}
              <span style={{ marginLeft: 6, fontSize: 11, color: COLORS.gray }}>{members.length}</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: COLORS.grayLight }}>—</span>
          )}
        </td>
        <td style={{ ...tdStyle, minWidth: 90, whiteSpace: 'nowrap' }}>
          <span style={{ color: new Date(p.end).getTime() < TODAY.getTime() ? COLORS.red : COLORS.gray }}>{fmtDate(p.end)}</span>
        </td>
        <td style={{ ...tdStyle, minWidth: 70, textAlign: 'center' }}>
          <span style={{ fontWeight: 600 }}>{s.done}</span><span style={{ color: COLORS.grayLight }}>/</span><span style={{ color: COLORS.gray }}>{s.total}</span>
        </td>
        <td style={{ ...tdStyle, minWidth: 60, textAlign: 'center' }}>
          {s.overdue > 0 ? (
            <span style={{ background: COLORS.redSoft, color: COLORS.red, borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{s.overdue}</span>
          ) : (
            <span style={{ color: COLORS.grayLight }}>0</span>
          )}
        </td>
        {!archived && (
          <td style={{ ...tdStyle, minWidth: isMobile ? 60 : 90 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {onArchive && (
                <button onClick={e => { e.stopPropagation(); onArchive(p.id); }} title="Archive" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', borderRadius: 4 }}>
                  <Archive size={14} />
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); onDelete(p.id); }} title="Delete" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', borderRadius: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        )}
      </tr>
    );
  }

  /* ---- table block ---- */
  function renderTable(list: Project[], archived: boolean, showRollup: boolean) {
    if (list.length === 0) return null;
    return (
      <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('name')}>Project {renderSortIcon('name')}</th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('progress')}>Status {renderSortIcon('progress')}</th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('members')}>Members {renderSortIcon('members')}</th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => handleSort('due')}>Due Date {renderSortIcon('due')}</th>
              <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('tasks')}>Tasks {renderSortIcon('tasks')}</th>
              <th style={{ ...thStyle, textAlign: 'center' }} onClick={() => handleSort('overdue')}>Overdue {renderSortIcon('overdue')}</th>
              {!archived && <th style={{ ...thStyle, cursor: 'default', width: isMobile ? 60 : 90 }} />}
            </tr>
          </thead>
          <tbody>
            {list.map(p => renderTableRow(p, archived))}
          </tbody>
          {showRollup && list.length > 1 && (
            <tfoot>
              <tr>
                <td colSpan={7} style={{ padding: '10px 14px', borderTop: `2px solid ${COLORS.line}`, fontSize: 12, fontFamily: FF }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: COLORS.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 }}>Portfolio Average</span>
                    <div style={{ flex: 1, maxWidth: 200, height: 6, background: COLORS.line, borderRadius: 3 }}>
                      <div style={{ width: `${portfolioAvg}%`, height: '100%', borderRadius: 3, background: COLORS.accent, transition: 'width 0.2s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink }}>{portfolioAvg}%</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  }

  /* ---- card (preserved exactly) ---- */
  function renderCard(p: Project, archived: boolean) {
    const s = statsFor(p.id);
    const daysLeft = Math.ceil((new Date(p.end).getTime() - TODAY.getTime()) / dayMs);
    const members = p.members || [];
    return (
      <div
        key={p.id}
        onClick={() => onOpen(p.id)}
        style={{
          background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: isMobile ? 16 : 18,
          cursor: 'pointer', position: 'relative', transition: 'box-shadow 0.15s', opacity: archived ? 0.65 : 1,
        }}
        title={p.description || undefined}
      >
        <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          {onToggleFavorite && !archived && (
            <button onClick={e => { e.stopPropagation(); onToggleFavorite(p.id); }} title={p.isFavorite ? 'Remove from favorites' : 'Add to favorites'} style={{ border: 'none', background: 'none', cursor: 'pointer', color: p.isFavorite ? '#FBBF24' : COLORS.gray, padding: 4, display: 'flex', alignItems: 'center' }}>
              <Star size={16} fill={p.isFavorite ? '#FBBF24' : 'none'} />
            </button>
          )}
          {!archived && onArchive && (
            <button onClick={e => { e.stopPropagation(); onArchive(p.id); }} title="Archive project" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', alignItems: 'center' }}>
              <Archive size={15} />
            </button>
          )}
          {archived && onRestore && (
            <button onClick={e => { e.stopPropagation(); onRestore(p.id); }} title="Restore project" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.teal, padding: 4, display: 'flex', alignItems: 'center' }}>
              <RotateCcw size={15} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(p.id); }} title="Delete project" style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 4, display: 'flex', alignItems: 'center' }}>
            <Trash2 size={15} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
          <div style={{ fontWeight: 700, fontSize: 15.5, fontFamily: FF, paddingRight: 80, letterSpacing: -0.3, lineHeight: 1.3, textDecoration: archived ? 'line-through' : 'none' }}>{p.name}</div>
        </div>

        {p.description && (
          <div style={{ fontSize: 12, color: COLORS.gray, lineHeight: 1.4, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
            {p.description}
          </div>
        )}

        <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 14 }}>
          {fmtDate(p.start)} – {fmtDate(p.end)} · {daysLeft >= 0 ? `${daysLeft}d left` : 'past due date'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: COLORS.gray, marginBottom: 5 }}>
          <span>Progress</span><span>{s.progress}%</span>
        </div>
        <div style={{ height: 6, background: COLORS.line, borderRadius: 3, marginBottom: 14 }}>
          <div style={{ width: `${s.progress}%`, height: '100%', borderRadius: 3, background: p.color }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {members.length > 0 ? (
              <>
                <div style={{ display: 'flex' }}>
                  {members.slice(0, isMobile ? 3 : 4).map((id, i) => (
                    <div key={id} style={{ marginLeft: i === 0 ? 0 : -8, border: '2px solid #FFFFFF', borderRadius: '50%' }}>
                      <Avatar id={id} size={24} />
                    </div>
                  ))}
                  {members.length > (isMobile ? 3 : 4) && (
                    <span style={{ marginLeft: 4, fontSize: 11, color: COLORS.gray, fontWeight: 600 }}>+{members.length - (isMobile ? 3 : 4)}</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: COLORS.gray, marginLeft: 6 }}>{members.length} members</span>
              </>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: COLORS.gray }}><Users size={13} /> No members</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span style={{ color: COLORS.gray }}>{s.done}/{s.total}</span>
            {s.overdue > 0 && <span style={{ color: COLORS.red, fontWeight: 700 }}>{s.overdue} overdue</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="All Projects"
        subtitle={`${activeProjects.length} project${activeProjects.length === 1 ? '' : 's'} in your workspace`}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button style={togBtn(viewMode === 'card')} onClick={() => setViewMode('card')} title="Card view">
              <Grid3X3 size={16} />
            </button>
            <button style={togBtn(viewMode === 'table')} onClick={() => setViewMode('table')} title="Table view">
              <List size={16} />
            </button>
          </div>
        }
      />

      {viewMode === 'card' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {activeProjects.map(p => renderCard(p, false))}
            <button onClick={onNew} style={{ border: `1.5px dashed ${COLORS.line}`, borderRadius: 14, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: isMobile ? 120 : 150, color: COLORS.gray, fontSize: 13.5, fontWeight: 600, fontFamily: FF }}>
              <Plus size={20} />
              New project
            </button>
          </div>
          {activeProjects.length === 0 && !showArchived && <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, marginTop: 12 }}>No projects match your search.</div>}
        </>
      ) : (
        <>
          {renderTable(sortedActive, false, true)}
          <button onClick={onNew} style={{ marginTop: 12, border: `1.5px dashed ${COLORS.line}`, borderRadius: 12, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, color: COLORS.gray, fontSize: 13.5, fontWeight: 600, fontFamily: FF, width: '100%' }}>
            <Plus size={18} />
            New project
          </button>
          {activeProjects.length === 0 && !showArchived && <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 13, marginTop: 12 }}>No projects match your search.</div>}
        </>
      )}

      {/* Archived section */}
      {archivedProjects.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 14, cursor: 'pointer' }} onClick={() => setShowArchived(o => !o)}>
            <Archive size={16} color={COLORS.gray} />
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>Archived ({archivedProjects.length})</span>
            <span style={{ fontSize: 12, color: COLORS.gray }}>{showArchived ? '▲' : '▼'}</span>
          </div>
          {showArchived && (viewMode === 'card' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {archivedProjects.map(p => renderCard(p, true))}
            </div>
          ) : (
            renderTable(archivedProjects, true, false)
          ))}
        </>
      )}
    </div>
  );
}

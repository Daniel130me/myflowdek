'use client';

import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Menu, Search, Plus, ChevronDown, SlidersHorizontal, LogOut } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { FONT_FAMILY as FF, TEAM, COLORS, CURRENT_USER_ID, teamById, type SearchFilters } from '@/features/flowdeck/model';
import { Avatar, SearchFilterPanel } from '../ui';
import { useTheme } from '../../hooks/useTheme';
import type { Project, Tag } from '@/features/flowdeck/model';

export interface TopBarHandle { focusSearch: () => void; }

export const TopBar = forwardRef<TopBarHandle, {
  isMobile: boolean; project: Project | null; projects: Record<string, Project>; activeView: string;
  searchQuery: string; projectMenuOpen: boolean; topbarHeight: number;
  searchFilters: SearchFilters; activeFilterCount: number; tags: Tag[];
  onToggleSidebar: () => void; onToggleProjectMenu: () => void; onOpenProject: (id: string) => void;
  onShowNewTask: () => void; onShowNewProject: () => void; onSearchChange: (q: string) => void;
  onSearchFiltersChange: (f: SearchFilters) => void; onClearFilters: () => void;
  onLogout?: () => void;
}>(function TopBar({ isMobile, project, projects, activeView, searchQuery, projectMenuOpen, topbarHeight,
  searchFilters, activeFilterCount, tags,
  onToggleSidebar, onToggleProjectMenu, onOpenProject,
  onShowNewTask, onShowNewProject, onSearchChange, onSearchFiltersChange, onClearFilters,
  onLogout
}, ref) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({ focusSearch: () => searchRef.current?.focus() }), []);
  const { colors, layout } = useTheme();
  const S = layout;
  const accentSoft = colors.accentSoft;

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const me = teamById[CURRENT_USER_ID];
  const initials = me ? me.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return (
    <header style={{
      height: topbarHeight, borderBottom: `1px solid ${S.topbar.border}`, background: S.topbar.bg,
      display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 12px' : '0 28px', gap: isMobile ? 8 : 16, flexShrink: 0,
    }}>
      {isMobile && (
        <button onClick={onToggleSidebar} style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.ink, flexShrink: 0, padding: 6, borderRadius: 10, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Menu size={20} strokeWidth={1.8} /></button>
      )}

      {project ? (
        <div style={{ position: 'relative', minWidth: 0, flex: 1 }}>
          <button onClick={onToggleProjectMenu} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: isMobile ? 14 : 16, fontWeight: 700, fontFamily: FF, letterSpacing: -0.3,
            minWidth: 0, maxWidth: isMobile ? '100%' : 'none', padding: '4px 0',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 4, background: project.color, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.ink }}>{project.name}</span>
            <ChevronDown size={14} color={colors.gray} style={{ flexShrink: 0 }} />
          </button>
          {projectMenuOpen && (
            <div style={{
              position: 'absolute', top: isMobile ? 40 : 40, left: 0, background: S.card.bg,
              border: `1px solid ${S.topbar.border}`, borderRadius: 14,
              boxShadow: S.card.shadowLg, width: 'min(260px, 84vw)', zIndex: 20, padding: 6,
            }}>
              {Object.values(projects).map(p => (
                <button key={p.id} onClick={() => onOpenProject(p.id)} style={{
                  width: '100%', textAlign: 'left', padding: isMobile ? '12px 14px' : '10px 12px', borderRadius: 10, border: 'none',
                  background: p.id === project.id ? accentSoft : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5,
                  color: colors.ink, transition: 'background 0.1s', minHeight: 44, fontFamily: FF,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: p.color, flexShrink: 0 }} /> {p.name}
                </button>
              ))}
              <div style={{ height: 1, background: S.topbar.border, margin: '6px 6px' }} />
              <button onClick={() => { onToggleProjectMenu(); onShowNewProject(); }} style={{
                width: '100%', textAlign: 'left', padding: isMobile ? '12px 14px' : '10px 12px', borderRadius: 10, border: 'none',
                background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, color: '#FE8029', minHeight: 44, fontFamily: FF,
              }}>
                <Plus size={14} strokeWidth={2} /> New project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, fontFamily: FF, letterSpacing: -0.3, color: colors.ink }}>All Projects</div>
      )}

      {!isMobile && (
        <div style={{
          flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8,
          background: S.topbar.searchBg, border: `1px solid ${S.topbar.searchBorder}`, borderRadius: 10, padding: '8px 14px',
        }}>
          <Search size={15} color={colors.grayLight} strokeWidth={1.8} />
          <input ref={searchRef} placeholder={project ? 'Search tasks or people\u2026' : 'Search projects\u2026'} value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', fontFamily: FF, color: colors.ink }}
          />
          {project && (
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button onClick={() => setFilterOpen(o => !o)} style={{ position: 'relative', border: 'none', background: 'none', cursor: 'pointer', color: activeFilterCount > 0 ? COLORS.accent : colors.grayLight, padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
                <SlidersHorizontal size={15} strokeWidth={1.8} />
                {activeFilterCount > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -4, width: 15, height: 15, borderRadius: '50%', background: COLORS.accent, color: '#FFFFFF', fontSize: 9, fontWeight: 700, fontFamily: FF, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilterCount}</span>
                )}
              </button>
              <SearchFilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} filters={searchFilters} onChange={onSearchFiltersChange} onClear={onClearFilters} activeFilterCount={activeFilterCount} tags={tags} />
            </div>
          )}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 12 }}>
        {!isMobile && project && (
          <div style={{ display: 'flex' }}>{TEAM.slice(0, 5).map((t, i) => (
            <div key={t.id} style={{ marginLeft: i === 0 ? 0 : -8, border: `2px solid ${S.topbar.bg}`, borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <Avatar id={t.id} size={30} />
            </div>
          ))}</div>
        )}
        <button onClick={() => project ? onShowNewTask() : onShowNewProject()} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#FE8029', color: '#FFFFFF', border: 'none', borderRadius: 10,
          padding: isMobile ? '0 12px' : '9px 16px', height: isMobile ? 38 : 'auto', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          flexShrink: 0, fontFamily: FF, boxShadow: '0 1px 3px rgba(254,128,41,0.3)', transition: 'background 0.15s ease',
        }}>
          <Plus size={15} strokeWidth={2} /> {!isMobile && (project ? 'New Task' : 'New Project')}
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* User avatar + logout menu */}
        {onLogout && (
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              style={{
                width: isMobile ? 34 : 36, height: isMobile ? 34 : 36, borderRadius: '50%',
                background: '#16A34A', border: `2px solid ${S.topbar.bg}`, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 12 : 13, fontWeight: 800, color: '#FFFFFF',
                fontFamily: FF, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                padding: 0, outline: 'none',
              }}
              title={me?.name || 'User menu'}
            >
              {initials}
            </button>
            {userMenuOpen && (
              <div style={{
                position: 'absolute', top: isMobile ? 42 : 46, right: 0,
                background: S.card.bg, border: `1px solid ${S.topbar.border}`,
                borderRadius: 12, boxShadow: S.card.shadowLg,
                width: isMobile ? 180 : 200, zIndex: 30, padding: 6, overflow: 'hidden',
              }}>
                {/* User info header */}
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${S.topbar.border}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.ink, fontFamily: FF }}>{me?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: colors.gray, marginTop: 2, fontFamily: FF }}>{me?.role || ''}</div>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); onLogout(); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none',
                    background: 'transparent', display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#DC2626',
                    minHeight: 40, fontFamily: FF, transition: 'background 0.1s',
                  }}
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
});

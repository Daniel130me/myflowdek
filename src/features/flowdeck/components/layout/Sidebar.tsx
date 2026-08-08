'use client';

import React, { useState } from 'react';
import { LayoutGrid, Sun, Moon, Star, Archive, LogOut } from 'lucide-react';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { Avatar } from '../ui';
import { useTheme } from '../../hooks/useTheme';
import { NAV } from './navItems';
import { WorkspaceSelector } from './WorkspaceSelector';
import type { WorkspaceSummary } from '../../hooks/useWorkspaces';
import type { Project } from '@/features/flowdeck/model';

export function Sidebar({ project, projects, activeView, onNavigate, goToPortfolio, pendingMyTasks = 0, onToggleFavorite, onArchive, onLogout, workspaces, selectedWorkspace, onSelectWorkspace }: {
  project: Project | null;
  projects: Record<string, Project>;
  activeView: string;
  onNavigate: (id: string) => void;
  goToPortfolio: () => void;
  pendingMyTasks?: number;
  onToggleFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onLogout?: () => void;
  workspaces?: WorkspaceSummary[];
  selectedWorkspace?: WorkspaceSummary | null;
  onSelectWorkspace?: (id: string) => void;
}) {
  const { isDark, toggle, colors, layout } = useTheme();
  const S = layout.sidebar;
  const [showArchived, setShowArchived] = useState(false);

  const favoriteProjects = Object.values(projects).filter(p => p.isFavorite && !p.isArchived);
  const archivedProjects = Object.values(projects).filter(p => p.isArchived);
  const activeProjects = Object.values(projects).filter(p => !p.isArchived);

  return (
    <aside style={{
      width: S.width, background: S.bg,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #FE8029 0%, #FF9F5A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(254,128,41,0.3)' }}>
          <div style={{ width: 12, height: 12, borderRadius: 4, background: '#fff' }} />
        </div>
        <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 18, fontFamily: FF, letterSpacing: -0.5 }}>FlowDeck</span>
      </div>

      {/* Workspace selector — establishes the tenant context */}
      {workspaces && selectedWorkspace && onSelectWorkspace && (
        <WorkspaceSelector
          workspaces={workspaces}
          selectedWorkspace={selectedWorkspace}
          onSelect={onSelectWorkspace}
        />
      )}

      <div style={{ padding: '0 12px 8px' }}>
        <button onClick={goToPortfolio} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
          border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13.5, fontWeight: 500,
          background: activeView === 'projects' ? S.activeBg : 'transparent',
          color: activeView === 'projects' ? '#FFFFFF' : S.textMuted, transition: 'all 0.15s ease', position: 'relative',
        }}>
          {activeView === 'projects' && <span style={{ position: 'absolute', right: 12, width: 6, height: 6, borderRadius: '50%', background: S.activeDot }} />}
          <LayoutGrid size={16} strokeWidth={1.8} /> All Projects
        </button>
      </div>

      {/* #38: Favorites section */}
      {favoriteProjects.length > 0 && (
        <>
          <div style={{ margin: '4px 20px 6px', borderTop: `1px solid ${S.divider}` }} />
          <div style={{ padding: '0 20px 6px', fontSize: 11, fontWeight: 600, color: S.textDim, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={11} fill={S.textDim} /> Favorites
          </div>
          <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {favoriteProjects.map(p => (
              <button key={p.id} onClick={() => onNavigate(`_fav_${p.id}`)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
                background: 'transparent', color: S.textMuted, transition: 'all 0.15s ease', position: 'relative',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                <Star size={13} fill="#FBBF24" color="#FBBF24" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ margin: '4px 20px 10px', borderTop: `1px solid ${S.divider}` }} />

      {project && (
        <div style={{ padding: '0 20px 10px', fontSize: 11, fontWeight: 600, color: S.textDim, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: project.color, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
        </div>
      )}

      <nav style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = activeView === n.id;
          const disabled = !project;
          return (
            <button key={n.id} onClick={() => { if (!disabled) onNavigate(n.id); }} disabled={disabled} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
              border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
              background: active ? S.activeBg : 'transparent',
              color: disabled ? colors.navyLight : active ? '#FFFFFF' : S.textMuted,
              fontSize: 13.5, fontWeight: active ? 600 : 500, transition: 'all 0.15s ease', position: 'relative',
              opacity: disabled ? 0.5 : 1,
            }}>
              {active && <span style={{ position: 'absolute', right: 12, width: 6, height: 6, borderRadius: '50%', background: S.activeDot }} />}
              {n.id === 'mytasks' && pendingMyTasks > 0 && !active && <span style={{ position: 'absolute', right: 12, minWidth: 18, height: 18, borderRadius: 9999, background: '#FE8029', color: '#FFFFFF', fontSize: 10, fontWeight: 700, fontFamily: FF, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{pendingMyTasks}</span>}
              <Icon size={16} strokeWidth={1.8} /> {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* #39: Archived projects */}
      {archivedProjects.length > 0 && (
        <>
          <div style={{ margin: '4px 20px 6px', borderTop: `1px solid ${S.divider}` }} />
          <button onClick={() => setShowArchived(o => !o)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px',
            border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 600,
            background: 'transparent', color: S.textDim, textTransform: 'uppercase', letterSpacing: 0.8,
          }}>
            <Archive size={11} /> Archived ({archivedProjects.length})
          </button>
          {showArchived && (
            <div style={{ padding: '2px 12px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {archivedProjects.map(p => (
                <button key={p.id} onClick={() => onNavigate(`_fav_${p.id}`)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12.5, fontWeight: 500,
                  background: 'transparent', color: S.textDim, opacity: 0.7,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: p.color, flexShrink: 0, opacity: 0.6 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textDecoration: 'line-through' }}>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ padding: '16px 16px 20px', borderTop: `1px solid ${S.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ border: '2px solid rgba(255,255,255,0.15)', borderRadius: '50%' }}>
            <Avatar id="u5" size={32} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Wale Johnson</div>
            <div style={{ color: S.textDim, fontSize: 11.5, fontWeight: 400 }}>Away this week</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                border: 'none', background: S.hoverBg, cursor: 'pointer',
                borderRadius: 10, width: 34, height: 34, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: S.textMuted, transition: 'background 0.15s ease',
              }}
            >
              {isDark ? <Sun size={16} strokeWidth={1.8} /> : <Moon size={16} strokeWidth={1.8} />}
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                style={{
                  border: 'none', background: S.hoverBg, cursor: 'pointer',
                  borderRadius: 10, width: 34, height: 34, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: S.textDim, transition: 'background 0.15s ease',
                }}
              >
                <LogOut size={16} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

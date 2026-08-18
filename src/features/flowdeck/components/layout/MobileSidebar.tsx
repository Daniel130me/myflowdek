'use client';

import React from 'react';
import { LayoutGrid, Menu, Sun, Moon } from 'lucide-react';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { Avatar } from '../ui';
import { useTheme } from '../../hooks/useTheme';
import { NAV } from './navItems';
import type { Project } from '@/features/flowdeck/model';

export function MobileSidebar({ project, activeView, open, onClose, onNavigate, goToPortfolio, bottomNavHeight }: {
  project: Project | null; activeView: string; open: boolean; onClose: () => void;
  onNavigate: (id: string) => void; goToPortfolio: () => void; bottomNavHeight: number;
}) {
  const { isDark, toggle, colors, layout } = useTheme();
  const S = layout.sidebar;

  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55, backdropFilter: 'blur(4px)' }} />}
      <aside style={{
        width: 280, background: S.bg, display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed' as const, top: 0, bottom: 0, left: 0, zIndex: 60,
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        boxShadow: open ? '12px 0 32px rgba(0,0,0,0.2)' : 'none',
        paddingBottom: bottomNavHeight,
      }}>
        <div style={{ padding: '20px 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, #FE8029 0%, #FF9F5A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(254,128,41,0.3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: '#fff' }} />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16, fontFamily: FF, letterSpacing: -0.5 }}>FlowDeck</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: S.textMuted, cursor: 'pointer', padding: 8, borderRadius: 10 }}><Menu size={18} /></button>
        </div>

        <div style={{ padding: '0 12px 6px' }}>
          <button onClick={() => { goToPortfolio(); onClose(); }} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', borderRadius: 12,
            border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 500,
            background: activeView === 'projects' ? S.activeBg : 'transparent',
            color: activeView === 'projects' ? '#FFFFFF' : S.textMuted,
          }}>
            <LayoutGrid size={18} strokeWidth={1.8} /> All Projects
          </button>
        </div>

        {project && (
          <div style={{ padding: '8px 20px 8px', fontSize: 11, fontWeight: 600, color: S.textDim, textTransform: 'uppercase', letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: project.color, flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
          </div>
        )}

        <nav style={{ padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' }}>
          {NAV.map(n => {
            const Icon = n.icon;
            const active = activeView === n.id;
            const disabled = !project;
            return (
              <button key={n.id} onClick={() => { if (!disabled) { onNavigate(n.id); onClose(); } }} disabled={disabled} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                background: active ? S.activeBg : 'transparent',
                color: disabled ? colors.navyLight : active ? '#FFFFFF' : S.textMuted,
                fontSize: 14, fontWeight: active ? 600 : 500, opacity: disabled ? 0.5 : 1, minHeight: 44,
              }}>
                <Icon size={18} strokeWidth={1.8} /> {n.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${S.divider}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ border: '2px solid rgba(255,255,255,0.15)', borderRadius: '50%' }}>
              <Avatar id="u5" size={32} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 600 }}>Wale Johnson</div>
              <div style={{ color: S.textDim, fontSize: 11.5 }}>Away this week</div>
            </div>
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
          </div>
        </div>
      </aside>
    </>
  );
}

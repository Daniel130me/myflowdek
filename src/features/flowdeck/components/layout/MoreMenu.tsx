'use client';

import React from 'react';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useTheme } from '../../hooks/useTheme';
import { MORE_NAV } from './navItems';
import type { Project } from '@/features/flowdeck/model';

const BOTTOM_NAV_HEIGHT = 64;

export function MoreMenu({ activeView, project, onNavigate, onClose }: {
  activeView: string; project: Project | null; onNavigate: (id: string) => void; onClose: () => void;
}) {
  const { colors, layout } = useTheme();
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', bottom: BOTTOM_NAV_HEIGHT, right: 12,
        background: layout.card.bg, border: `1px solid ${layout.card.border}`, borderRadius: 16,
        boxShadow: '0 10px 25px rgba(0,0,0,0.12)', zIndex: 56, padding: 8, width: 200, marginBottom: 4,
      }}>
        {MORE_NAV.map(item => {
          const Icon = item.icon;
          const active = activeView === item.id;
          const disabled = !project && item.id !== 'talent';
          return (
            <button key={item.id} onClick={() => { if (!disabled) { onNavigate(item.id); onClose(); } }} disabled={disabled} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 14px',
              borderRadius: 12, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
              background: active ? colors.accentSoft : 'transparent',
              color: disabled ? colors.grayLight : active ? '#FE8029' : colors.ink,
              fontSize: 14, fontWeight: active ? 600 : 500, fontFamily: FF, opacity: disabled ? 0.5 : 1, minHeight: 44,
            }}>
              <Icon size={18} strokeWidth={1.8} />{item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

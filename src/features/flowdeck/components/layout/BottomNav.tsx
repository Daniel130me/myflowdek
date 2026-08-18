'use client';

import React from 'react';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useTheme } from '../../hooks/useTheme';
import { BOTTOM_NAV } from './navItems';

const BOTTOM_NAV_HEIGHT = 64;

export function BottomNav({ activeView, onNav }: { activeView: string; onNav: (id: string) => void }) {
  const { colors, layout } = useTheme();
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: BOTTOM_NAV_HEIGHT, background: layout.topbar.bg, borderTop: `1px solid ${layout.topbar.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -1px 3px rgba(0,0,0,0.04)',
    }}>
      {BOTTOM_NAV.map(item => {
        const Icon = item.icon;
        const isActive = item.id === '_more' ? false : activeView === item.id;
        return (
          <button key={item.id} onClick={e => { e.stopPropagation(); onNav(item.id); }} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, border: 'none', background: 'none', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 12, minWidth: 52, minHeight: 48,
            transition: 'all 0.15s ease', position: 'relative',
          }}>
            {isActive && <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, borderRadius: '0 0 3px 3px', background: '#FE8029' }} />}
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} color={isActive ? '#FE8029' : colors.grayLight} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#FE8029' : colors.grayLight, fontFamily: FF, lineHeight: 1 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

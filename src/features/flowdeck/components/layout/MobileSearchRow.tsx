'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { LAYOUT, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import type { Project } from '@/features/flowdeck/model';

export function MobileSearchRow({ project, searchQuery, onChange }: {
  project: Project | null; searchQuery: string; onChange: (q: string) => void;
}) {
  const S = LAYOUT;
  return (
    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${S.topbar.border}`, background: S.topbar.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: S.topbar.searchBg, border: `1px solid ${S.topbar.searchBorder}`, borderRadius: 10, padding: '8px 12px' }}>
        <Search size={15} color="#9CA3AF" strokeWidth={1.8} />
        <input placeholder={project ? 'Search tasks or people\u2026' : 'Search projects\u2026'} value={searchQuery}
          onChange={e => onChange(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, width: '100%', fontFamily: FF, color: '#1F2124' }}
        />
      </div>
    </div>
  );
}

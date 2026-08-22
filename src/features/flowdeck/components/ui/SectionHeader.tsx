'use client';

import React from 'react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { isMobile } = useViewport();
  return (
    <div style={{
      display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between',
      marginBottom: isMobile ? 14 : 18, flexWrap: 'wrap', gap: 12,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 style={{ fontFamily: FF, fontSize: isMobile ? 18 : 21, margin: 0, letterSpacing: -0.3 }}>{title}</h1>
        {subtitle && <div style={{ color: COLORS.gray, fontSize: isMobile ? 12 : 13, marginTop: 2, fontFamily: FF, lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>{right}</div>}
    </div>
  );
}
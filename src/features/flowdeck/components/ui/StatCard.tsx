'use client';

import React from 'react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';

export function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  const { isMobile } = useViewport();
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: isMobile ? '12px 14px' : '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: isMobile ? 11 : 12.5, color: COLORS.gray, fontWeight: 600, fontFamily: FF }}>{label}</span>
        <Icon size={isMobile ? 14 : 16} color={color} />
      </div>
      <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, marginTop: 4, fontFamily: FF }}>{value}</div>
    </div>
  );
}
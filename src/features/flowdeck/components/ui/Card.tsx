'use client';

import React from 'react';
import { COLORS } from '@/features/flowdeck/model';

export function Card({ title, children, style }: { title?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)', ...style }}>
      {title && <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>{title}</div>}
      {children}
    </div>
  );
}
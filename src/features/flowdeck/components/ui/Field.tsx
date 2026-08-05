'use client';

import React from 'react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.gray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FF }}>{label}</div>
      {children}
    </div>
  );
}
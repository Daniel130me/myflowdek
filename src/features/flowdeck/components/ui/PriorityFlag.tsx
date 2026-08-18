'use client';

import React from 'react';
import { Flag } from 'lucide-react';
import { PRIORITY_META, FONT_FAMILY as FF } from '@/features/flowdeck/model';

export function PriorityFlag({ priority }: { priority: string }) {
  const m = PRIORITY_META[priority];
  if (!m) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: m.color, fontWeight: 600, fontFamily: FF }}>
      <Flag size={12} fill={m.color} strokeWidth={0} /> {m.label}
    </span>
  );
}

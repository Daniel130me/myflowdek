'use client';

import React from 'react';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';

export default function Loading() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 300, width: '100%',
      fontFamily: FF, color: '#9CA3AF', fontSize: 14,
    }}>
      Loading view data…
    </div>
  );
}

'use client';

import React from 'react';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';

export function ToolbarBtn({ icon: Icon, label, onClick, active, title, compact }: { icon: React.ElementType; label?: string; onClick?: () => void; active?: boolean; title?: string; compact?: boolean }) {
  const { isMobile } = useViewport();
  if (compact && isMobile) {
    return (
      <button
        onClick={onClick}
        title={title || label}
        style={{
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${active ? COLORS.ink : COLORS.line}`, borderRadius: 10,
          cursor: 'pointer', background: active ? COLORS.ink : '#F3F4F6', color: active ? '#FFFFFF' : COLORS.ink,
          flexShrink: 0
        }}
      >
        <Icon size={16} />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      title={title || label}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${COLORS.line}`, borderRadius: 10,
        padding: isMobile ? '8px 12px' : '6px 10px', fontSize: isMobile ? 13 : 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: FF,
        background: active ? COLORS.ink : '#F3F4F6', color: active ? '#FFFFFF' : COLORS.ink,
        minHeight: isMobile ? 36 : undefined
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
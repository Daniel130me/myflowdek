'use client';

import React from 'react';
import { COLORS } from '@/features/flowdeck/model';
import { Check } from 'lucide-react';

interface TaskCheckboxProps {
  done: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: number;
}

export function TaskCheckbox({ done, onToggle, size = 18 }: TaskCheckboxProps) {
  const ringColor = done ? COLORS.green : COLORS.line;
  const bg = done ? COLORS.green : 'transparent';
  return (
    <button
      onClick={onToggle}
      style={{
        width: size, height: size, minWidth: size, borderRadius: '50%',
        border: `2px solid ${ringColor}`,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0, transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
      title={done ? 'Mark incomplete' : 'Mark complete'}
    >
      {done && <Check size={size * 0.6} color='#FFFFFF' strokeWidth={3} />}
    </button>
  );
}

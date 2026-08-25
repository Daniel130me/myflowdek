'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { COLORS, FF } from '@/features/flowdeck/model';

interface InlineTaskNameProps {
  name: string;
  isDone?: boolean;
  style?: React.CSSProperties;
  onSave: (newName: string) => void;
  onOpenTask?: () => void;
}

export function InlineTaskName({ name, isDone = false, style, onSave, onOpenTask }: InlineTaskNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(name); }, [name]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onSave(trimmed);
    } else {
      setValue(name);
    }
    setEditing(false);
  }, [value, name, onSave]);

  const cancel = useCallback(() => {
    setValue(name);
    setEditing(false);
  }, [name]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') { commit(); }
    else if (e.key === 'Escape') { cancel(); }
  }, [commit, cancel]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onDoubleClick={e => e.stopPropagation()}
        style={{
          ...baseStyle,
          ...style,
          outline: 'none',
          border: `1.5px solid ${COLORS.accent}`,
          borderRadius: 4,
          padding: '1px 4px',
          background: '#FFFFFF',
          boxShadow: '0 0 0 3px rgba(254,128,41,0.12)',
          cursor: 'text',
        }}
      />
    );
  }

  return (
    <div
      onClick={onOpenTask}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      style={{
        ...baseStyle,
        ...style,
        cursor: 'pointer',
      }}
    >
      {name}
    </div>
  );
}

const baseStyle: React.CSSProperties = {
  fontWeight: 600,
  fontFamily: FF,
  lineHeight: 1.3,
  color: COLORS.ink,
};

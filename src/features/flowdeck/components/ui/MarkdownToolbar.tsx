'use client';

import React from 'react';
import { Bold, Code, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { COLORS, FF } from '@/features/flowdeck/model';

export type MarkdownFormat = 'bold' | 'italic' | 'bullet' | 'numbered' | 'code' | 'link';

const tools: Array<{ format: MarkdownFormat; label: string; icon: React.ElementType }> = [
  { format: 'bold', label: 'Bold', icon: Bold },
  { format: 'italic', label: 'Italic', icon: Italic },
  { format: 'bullet', label: 'Bullet list', icon: List },
  { format: 'numbered', label: 'Numbered list', icon: ListOrdered },
  { format: 'code', label: 'Inline code', icon: Code },
  { format: 'link', label: 'Link', icon: Link2 },
];

export function MarkdownToolbar({ onFormat }: { onFormat: (format: MarkdownFormat) => void }) {
  return (
    <div role="toolbar" aria-label="Text formatting" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px 6px', borderBottom: `1px solid ${COLORS.line}`, background: '#FAFAFA', borderRadius: '10px 10px 0 0' }}>
      {tools.map(({ format, label, icon: Icon }) => (
        <button
          key={format}
          type="button"
          onMouseDown={event => event.preventDefault()}
          onClick={() => onFormat(format)}
          aria-label={label}
          title={label}
          style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, padding: 0, border: 0, borderRadius: 7, background: 'transparent', color: COLORS.gray, cursor: 'pointer', fontFamily: FF }}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function applyMarkdownFormat(
  format: MarkdownFormat,
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const wrappers: Partial<Record<MarkdownFormat, [string, string, string]>> = {
    bold: ['**', '**', 'bold text'],
    italic: ['*', '*', 'italic text'],
    code: ['`', '`', 'code'],
    link: ['[', '](https://)', 'link text'],
  };

  let nextValue: string;
  let selectionStart: number;
  let selectionEnd: number;
  const wrapper = wrappers[format];
  if (wrapper) {
    const content = selected || wrapper[2];
    nextValue = value.slice(0, start) + wrapper[0] + content + wrapper[1] + value.slice(end);
    selectionStart = start + wrapper[0].length;
    selectionEnd = selectionStart + content.length;
  } else {
    const prefix = format === 'numbered' ? '1. ' : '- ';
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    nextValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    selectionStart = start + prefix.length;
    selectionEnd = end + prefix.length;
  }

  onChange(nextValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selectionStart, selectionEnd);
  });
}

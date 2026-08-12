'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Heading2, List, ListOrdered, Code, Link2, CheckSquare, Eye, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { COLORS, FF } from '@/features/flowdeck/model';
import { Field } from './Field';
import { useMemberDirectory } from './MemberDirectory';

/* ---- Markdown toolbar button ---- */
function ToolBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 7, border: 'none',
        background: 'transparent', cursor: 'pointer', color: COLORS.gray,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = COLORS.ink; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.gray; }}
    >
      <Icon size={15} />
    </button>
  );
}

/* ---- Mention renderer for markdown ---- */
function renderMentionText(text: string, members: ReturnType<typeof useMemberDirectory>['list']): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      const member = members.find(m => m.name.toLowerCase().split(' ').some(n => n.toLowerCase().startsWith(username.toLowerCase())));
      return (
        <span key={i} style={{ fontWeight: 600, color: member?.color || COLORS.teal, backgroundColor: member?.color ? `${member.color}15` : 'transparent', padding: '1px 4px', borderRadius: 4 }}>{part}</span>
      );
    }
    return part;
  });
}

/* ---- Markdown preview renderer ---- */
function MarkdownPreview({ content, members }: { content: string; members: ReturnType<typeof useMemberDirectory>['list'] }) {
  return (
    <div style={{ fontSize: 13.5, fontFamily: FF, lineHeight: 1.6, color: COLORS.ink }}>
      <ReactMarkdown
        components={{
          /* @mention rendering inside markdown */
          p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{typeof children === 'string' ? renderMentionText(children, members) : children}</p>,
          h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 700, margin: '12px 0 6px 0', color: COLORS.ink }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 700, margin: '10px 0 4px 0', color: COLORS.ink }}>{children}</h3>,
          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) return <pre style={{ background: '#F3F4F6', padding: 12, borderRadius: 8, fontSize: 12.5, overflowX: 'auto', margin: '8px 0' }}><code>{children}</code></pre>;
            return <code style={{ background: '#F3F4F6', padding: '2px 5px', borderRadius: 4, fontSize: 12.5, fontFamily: 'monospace' }}>{children}</code>;
          },
          ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ol>,
          li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.teal, textDecoration: 'none' }}>{children}</a>,
          input: ({ node, ...props }) => {
            if (props.type === 'checkbox') return <input {...props} style={{ marginRight: 6 }} readOnly />;
            return <input {...props} />;
          },
          blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${COLORS.line}`, paddingLeft: 12, margin: '8px 0', color: COLORS.gray }}>{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* ---- Main MarkdownDescription component ---- */
export function MarkdownDescription({ value, onUpdate }: { value: string | undefined; onUpdate: (desc: string | undefined) => void }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'preview'>('view');
  const [draft, setDraft] = useState(value || '');
  const ref = useRef<HTMLTextAreaElement>(null);
  const { list: memberList } = useMemberDirectory();

  /* @mention autocomplete state */
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIdx, setMentionIdx] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);

  const mentionMatches = mentionQuery
    ? memberList.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : memberList.slice(0, 5);

  /* Focus textarea when entering edit mode (draft is set in click handlers) */
  useEffect(() => {
    if (mode === 'edit' && ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
    }
  }, [mode]);

  /* ---- Toolbar insert helpers ---- */
  const wrapSelection = useCallback((before: string, after: string, placeholder?: string) => {
    if (!ref.current) return;
    const ta = ref.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = draft.slice(start, end) || placeholder || 'text';
    const newDraft = draft.slice(0, start) + before + selected + after + draft.slice(end);
    setDraft(newDraft);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }, [draft]);

  const insertAtLineStart = useCallback((prefix: string) => {
    if (!ref.current) return;
    const ta = ref.current;
    const pos = ta.selectionStart;
    const lineStart = draft.lastIndexOf('\n', pos - 1) + 1;
    const newDraft = draft.slice(0, lineStart) + prefix + draft.slice(lineStart);
    setDraft(newDraft);
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = pos + prefix.length;
      ta.selectionStart = newPos;
      ta.selectionEnd = newPos;
    });
  }, [draft]);

  const insertLink = useCallback(() => {
    if (!ref.current) return;
    const ta = ref.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = draft.slice(start, end) || 'link text';
    const newDraft = draft.slice(0, start) + `[${selected}](url)` + draft.slice(end);
    setDraft(newDraft);
    requestAnimationFrame(() => {
      ta.focus();
      /* Select 'url' portion for easy replacement */
      const urlStart = start + selected.length + 3;
      ta.selectionStart = urlStart;
      ta.selectionEnd = urlStart + 3;
    });
  }, [draft]);

  const insertCheckbox = useCallback(() => {
    if (!ref.current) return;
    const ta = ref.current;
    const pos = ta.selectionStart;
    const newDraft = draft.slice(0, pos) + '\n- [ ] ' + draft.slice(pos);
    setDraft(newDraft);
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = pos + 8;
      ta.selectionStart = newPos;
      ta.selectionEnd = newPos;
    });
  }, [draft]);

  /* ---- @mention handling ---- */
  function handleTextChange(val: string) {
    setDraft(val);
    const cursorIdx = ref.current?.selectionStart || val.length;
    setCursorPos(cursorIdx);
    const beforeCursor = val.slice(0, cursorIdx);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
      setMentionIdx(0);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(name: string) {
    const beforeCursor = draft.slice(0, cursorPos);
    const afterCursor = draft.slice(cursorPos);
    const newBefore = beforeCursor.replace(/@\w*$/, `@${name.split(' ')[0]} `);
    const newText = newBefore + afterCursor;
    setDraft(newText);
    setShowMentions(false);
    setMentionQuery('');
    requestAnimationFrame(() => {
      if (ref.current) {
        const newPos = newBefore.length;
        ref.current.focus();
        ref.current.setSelectionRange(newPos, newPos);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentions && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(prev => Math.min(prev + 1, mentionMatches.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(prev => Math.max(prev - 1, 0)); return; }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          insertMention(mentionMatches[mentionIdx].name);
          return;
        }
      }
      if (e.key === 'Escape') { setShowMentions(false); return; }
    }
    if (e.key === 'Escape') { save(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(); return; }
  }

  function handleBlur() {
    setTimeout(() => setShowMentions(false), 200);
  }

  function save() {
    const trimmed = draft.trim();
    onUpdate(trimmed || undefined);
    setMode('view');
  }

  function cancel() {
    setDraft(value || '');
    setMode('view');
  }

  /* ---- View mode (click to edit) ---- */
  if (mode === 'view') {
    return (
      <Field label="Description">
        {value ? (
          <div style={{ position: 'relative' }}>
            <div onClick={() => { setDraft(value || ''); setMode('preview'); }} style={{ minHeight: 60, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.line}`, cursor: 'pointer', transition: 'border-color 0.15s' }}>
              <MarkdownPreview content={value} members={memberList} />
            </div>
            <button
              onClick={() => { setDraft(value || ''); setMode('edit'); }}
              title="Edit description"
              style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: '#F9FAFB', cursor: 'pointer', color: COLORS.gray, transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = COLORS.ink; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = COLORS.gray; }}
            >
              <Edit3 size={13} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => { setDraft(''); setMode('edit'); }}
            style={{
              minHeight: 60, padding: '10px 14px', borderRadius: 10,
              border: `1.5px solid ${COLORS.line}`, cursor: 'text',
              fontSize: 13.5, fontFamily: FF, color: COLORS.gray,
              lineHeight: 1.55, transition: 'border-color 0.15s',
            }}
          >Click to add a description…</div>
        )}
      </Field>
    );
  }

  /* ---- Edit mode ---- */
  if (mode === 'edit') {
    return (
      <Field label="Description">
        <div style={{ position: 'relative' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderBottom: `1px solid ${COLORS.line}`, background: '#FAFAFA', borderRadius: '10px 10px 0 0' }}>
            <ToolBtn icon={Bold} label="Bold (Ctrl+B)" onClick={() => wrapSelection('**', '**', 'bold')} />
            <ToolBtn icon={Italic} label="Italic (Ctrl+I)" onClick={() => wrapSelection('*', '*', 'italic')} />
            <ToolBtn icon={Heading2} label="Heading" onClick={() => insertAtLineStart('## ')} />
            <div style={{ width: 1, height: 18, background: COLORS.line, margin: '0 4px' }} />
            <ToolBtn icon={List} label="Bullet list" onClick={() => insertAtLineStart('- ')} />
            <ToolBtn icon={ListOrdered} label="Numbered list" onClick={() => insertAtLineStart('1. ')} />
            <ToolBtn icon={CheckSquare} label="Checkbox" onClick={insertCheckbox} />
            <div style={{ width: 1, height: 18, background: COLORS.line, margin: '0 4px' }} />
            <ToolBtn icon={Code} label="Code" onClick={() => wrapSelection('`', '`', 'code')} />
            <ToolBtn icon={Link2} label="Link" onClick={insertLink} />
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setMode('preview')}
              title="Preview"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, fontFamily: FF, color: COLORS.accent, transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(254,128,41,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
          {/* Textarea */}
          <div style={{ position: 'relative' }}>
            <textarea
              ref={ref}
              value={draft}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder="Write a description… Use Markdown for formatting. Type @ to mention someone."
              style={{
                width: '100%', minHeight: 140, padding: '10px 14px',
                borderRadius: '0 0 10px 10px', border: `1.5px solid ${COLORS.accent}`,
                borderTop: 'none', fontSize: 13.5, fontFamily: 'monospace', color: COLORS.ink,
                lineHeight: 1.55, resize: 'vertical' as const, outline: 'none',
                boxShadow: '0 0 0 3px rgba(254,128,41,0.12)', boxSizing: 'border-box' as const,
              }}
            />
            {/* @mention autocomplete popup */}
            {showMentions && mentionMatches.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 10, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)', padding: 4, minWidth: 200, maxHeight: 200, overflowY: 'auto' }}>
                {mentionMatches.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertMention(m.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, border: 'none',
                      background: i === mentionIdx ? '#F3F4F6' : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 11, fontWeight: 700, fontFamily: FF, flexShrink: 0 }}>{m.name.charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: FF, color: COLORS.ink }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{m.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
            <button onClick={cancel} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${COLORS.line}`, background: '#FFFFFF', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: COLORS.ink, transition: 'all 0.12s' }}>Cancel</button>
            <button onClick={save} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: '#FFFFFF', transition: 'all 0.12s' }}>Save</button>
          </div>
        </div>
      </Field>
    );
  }

  /* ---- Preview mode ---- */
  return (
    <Field label="Description">
      <div style={{ position: 'relative' }}>
        <div style={{ minHeight: 60, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${COLORS.accent}`, boxShadow: '0 0 0 3px rgba(254,128,41,0.12)', background: '#FFFCF8' }}>
          <MarkdownPreview content={draft} members={memberList} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
          <button
            onClick={() => setMode('edit')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: `1px solid ${COLORS.line}`, background: '#FFFFFF', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: COLORS.ink, transition: 'all 0.12s' }}
          >
            <Edit3 size={13} /> Edit
          </button>
          <button onClick={save} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: '#FFFFFF', transition: 'all 0.12s' }}>Save</button>
        </div>
      </div>
    </Field>
  );
}

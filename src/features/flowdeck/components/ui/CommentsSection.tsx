'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Pencil, Reply, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { COLORS, FF, type Comment, type ActivityEntry, type Reaction, type MemberInfo } from '@/features/flowdeck/model';
import { Avatar } from './Avatar';
import { Field } from './Field';
import { useMemberDirectory } from './MemberDirectory';

/* ---- Quick-reaction emojis ---- */
const QUICK_REACTIONS = ['❤️', '👍', '🎉', '🎊', '👏', '😮', '😎', '👀'];

/* ---- Component props ---- */
interface CommentsSectionProps {
  taskId: string;
  comments: Comment[];
  activity: ActivityEntry[];
  onAddComment: (taskId: string, text: string, parentId?: string | null) => void;
  onDeleteComment: (commentId: string) => void;
  onEditComment?: (commentId: string, newText: string) => void;
  onToggleReaction?: (commentId: string, emoji: string) => void;
  /** The authenticated user's id — used to show edit/delete buttons on
   *  the user's own comments + render the main input avatar. Defaults to
   *  an empty string (no edit/delete actions shown) when omitted. */
  currentUserId?: string;
}

export function CommentsSection({
  taskId, comments, activity, onAddComment, onDeleteComment, onEditComment, onToggleReaction,
  currentUserId = '',
}: CommentsSectionProps) {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const listRef = useRef<HTMLDivElement>(null);

  // Real member directory — powers @mention lookup + reaction tooltips +
  // comment author names. Falls back to an empty list when no projects
  // have been opened yet (the directory hydrates on first
  // `useProjectMembers` call).
  const { list: directoryMembers } = useMemberDirectory();
  const memberList: MemberInfo[] = directoryMembers;

  /* All comments for this task, sorted chronologically */
  const taskComments = comments
    .filter(c => c.taskId === taskId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  /* Top-level comments (no parent) */
  const topLevelComments = taskComments.filter(c => !c.parentId);

  /* Replies map: parentId → Comment[] */
  const repliesMap = new Map<string, Comment[]>();
  taskComments.forEach(c => {
    if (c.parentId) {
      const existing = repliesMap.get(c.parentId) || [];
      existing.push(c);
      repliesMap.set(c.parentId, existing);
    }
  });

  const taskActivity = activity.filter(a => a.taskId === taskId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [taskComments.length]);

  /* ---- Main comment submit ---- */
  function submit() {
    if (!text.trim()) return;
    onAddComment(taskId, text);
    setText('');
  }

  /* ---- Time formatter ---- */
  function fmtTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* ---- @mention rendering ---- */
  function renderMentionText(text: string): React.ReactNode {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const member = memberList.find(m => m.name.toLowerCase().split(' ').some(n => n.toLowerCase().startsWith(username.toLowerCase())));
        return (
          <span key={i} style={{ fontWeight: 600, color: member?.color || COLORS.teal, backgroundColor: member?.color ? `${member.color}15` : 'transparent', padding: '1px 4px', borderRadius: 4 }}>{part}</span>
        );
      }
      return part;
    });
  }

  /* ---- @mention autocomplete (main input) ---- */
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIdx, setMentionIdx] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionMatches = mentionQuery
    ? memberList.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : memberList.slice(0, 5);

  function handleTextChange(val: string) {
    setText(val);
    const cursorIdx = textareaRef.current?.selectionStart || val.length;
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

  function insertMention(name: string, textarea: HTMLTextAreaElement | null, currentText: string, currentCursorPos: number, setTextFn: (v: string) => void, setCursorPosFn: (v: number) => void) {
    const beforeCursor = currentText.slice(0, currentCursorPos);
    const afterCursor = currentText.slice(currentCursorPos);
    const newBefore = beforeCursor.replace(/@\w*$/, `@${name.split(' ')[0]} `);
    const newText = newBefore + afterCursor;
    setTextFn(newText);
    setShowMentions(false);
    setMentionQuery('');
    requestAnimationFrame(() => {
      if (textarea) {
        const newPos = newBefore.length;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
      }
    });
  }

  function handleMainKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentions && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(prev => Math.min(prev + 1, mentionMatches.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(prev => Math.max(prev - 1, 0)); return; }
      if (e.key === 'Tab' || e.key === 'Enter') {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          insertMention(mentionMatches[mentionIdx].name, textareaRef.current, text, cursorPos, setText, setCursorPos);
          return;
        }
      }
      if (e.key === 'Escape') { setShowMentions(false); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  }

  function handleMainBlur() {
    setTimeout(() => setShowMentions(false), 200);
  }

  /* ---- Mention autocomplete dropdown (shared) ---- */
  function MentionDropdown({ matches, idx, onSelect, position }: { matches: MemberInfo[]; idx: number; onSelect: (name: string) => void; position: 'above' | 'below' }) {
    if (matches.length === 0) return null;
    return (
      <div style={{ position: position === 'above' ? 'absolute' as const : 'absolute' as const, ...(position === 'above' ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }), left: 0, background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)', zIndex: 10, padding: 4, minWidth: 200, maxHeight: 200, overflowY: 'auto' }}>
        {matches.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.name)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, border: 'none',
              background: i === idx ? '#F3F4F6' : 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left',
            }}
          >
            <Avatar id={m.id} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: FF, color: COLORS.ink }}>{m.name}</div>
              <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{m.role ?? ''}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  /* ---- Reaction bar ---- */
  function ReactionBar({ commentId, reactions }: { commentId: string; reactions?: Reaction[] }) {
    if (!reactions || reactions.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {reactions.map(r => {
          const hasReacted = r.userIds.includes(currentUserId);
          return (
            <button
              key={r.emoji}
              type="button"
              onClick={() => onToggleReaction && onToggleReaction(commentId, r.emoji)}
              title={r.userIds.map(uid => memberList.find(m => m.id === uid)?.name).filter(Boolean).join(', ')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 9999,
                border: hasReacted ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                background: hasReacted ? 'rgba(254,128,41,0.08)' : '#F9FAFB',
                cursor: 'pointer', fontSize: 12, fontFamily: FF, lineHeight: 1.6,
                transition: 'all 0.12s',
              }}
            >
              <span>{r.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: hasReacted ? COLORS.accent : COLORS.gray }}>{r.userIds.length}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /* ---- Quick reaction picker ---- */
  function QuickReactionPicker({ commentId, reactions }: { commentId: string; reactions?: Reaction[] }) {
    const [open, setOpen] = useState(false);
    const activeEmojis = new Set((reactions || []).map(r => r.emoji));
    const btnRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    function toggle() {
      if (open) { setOpen(false); return; }
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setPos({ top: rect.top - 8, left: rect.left });
      }
      setOpen(true);
    }

    /* Close picker when clicking outside */
    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
      <>
        <button
          ref={btnRef}
          type="button"
          onClick={toggle}
          title="Add reaction"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', borderRadius: 6,
            border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: COLORS.grayLight,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = COLORS.gray; }}
          onMouseLeave={e => { e.currentTarget.style.color = COLORS.grayLight; }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>❤️</span>
          <span style={{ fontSize: 11 }}>{(reactions || []).reduce((s, r) => s + r.userIds.length, 0) > 0 ? '+' : ''}</span>
        </button>
        {open && (
          <div
            ref={pickerRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)', display: 'flex', gap: 2, padding: '6px 8px', background: '#FFFFFF', border: `1px solid ${COLORS.line}`, borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', zIndex: 9999 }}
          >
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => { if (onToggleReaction) onToggleReaction(commentId, emoji); setOpen(false); }}
                title={emoji}
                style={{
                  fontSize: 18, border: 'none', background: activeEmojis.has(emoji) ? '#F3F4F6' : 'transparent',
                  borderRadius: 6, cursor: 'pointer', padding: '2px 4px', lineHeight: 1, transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = activeEmojis.has(emoji) ? '#F3F4F6' : 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
              >{emoji}</button>
            ))}
          </div>
        )}
      </>
    );
  }

  /* ---- Single comment card ---- */
  function CommentCard({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) {
    const author = memberList.find(m => m.id === comment.authorId);
    const [editing, setEditing] = useState(false);
    const [editDraft, setEditDraft] = useState(comment.text);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const editRef = useRef<HTMLTextAreaElement>(null);
    const replyRef = useRef<HTMLTextAreaElement>(null);

    /* Reply mention autocomplete */
    const [replyShowMentions, setReplyShowMentions] = useState(false);
    const [replyMentionQuery, setReplyMentionQuery] = useState('');
    const [replyMentionIdx, setReplyMentionIdx] = useState(0);
    const [replyCursorPos, setReplyCursorPos] = useState(0);

    const replyMentionMatches = replyMentionQuery
      ? memberList.filter(m => m.name.toLowerCase().includes(replyMentionQuery.toLowerCase())).slice(0, 5)
      : memberList.slice(0, 5);

    const replies = repliesMap.get(comment.id) || [];
    const hasReplies = replies.length > 0;

    useEffect(() => {
      if (editing && editRef.current) {
        editRef.current.focus();
        editRef.current.selectionStart = editRef.current.value.length;
      }
    }, [editing]);

    useEffect(() => {
      if (showReplyInput && replyRef.current) replyRef.current.focus();
    }, [showReplyInput]);

    function saveEdit() {
      if (!editDraft.trim() || !onEditComment) return;
      onEditComment(comment.id, editDraft);
      setEditing(false);
    }

    function cancelEdit() {
      setEditDraft(comment.text);
      setEditing(false);
    }

    function submitReply() {
      if (!replyText.trim()) return;
      onAddComment(taskId, replyText, comment.id);
      setReplyText('');
      setShowReplyInput(false);
    }

    function handleReplyTextChange(val: string) {
      setReplyText(val);
      const cursorIdx = replyRef.current?.selectionStart || val.length;
      setReplyCursorPos(cursorIdx);
      const beforeCursor = val.slice(0, cursorIdx);
      const atMatch = beforeCursor.match(/@(\w*)$/);
      if (atMatch) {
        setReplyShowMentions(true);
        setReplyMentionQuery(atMatch[1]);
        setReplyMentionIdx(0);
      } else {
        setReplyShowMentions(false);
      }
    }

    function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (replyShowMentions && replyMentionMatches.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setReplyMentionIdx(prev => Math.min(prev + 1, replyMentionMatches.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setReplyMentionIdx(prev => Math.max(prev - 1, 0)); return; }
        if (e.key === 'Tab' || e.key === 'Enter') {
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            insertMention(replyMentionMatches[replyMentionIdx].name, replyRef.current, replyText, replyCursorPos, setReplyText, setReplyCursorPos);
            return;
          }
        }
        if (e.key === 'Escape') { setReplyShowMentions(false); return; }
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply();
    }

    return (
      <div style={{ display: 'flex', gap: 10, ...isReply ? { marginLeft: 38, marginTop: 8 } : {} }}>
        <Avatar id={comment.authorId} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: FF }}>{author?.name || 'Unknown'}</span>
            <span style={{ fontSize: 11, color: COLORS.grayLight, fontFamily: FF }}>{fmtTime(comment.createdAt)}</span>
            {comment.edited && <span style={{ fontSize: 10, color: COLORS.grayLight, fontFamily: FF, fontStyle: 'italic' }}>(edited)</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
              <QuickReactionPicker commentId={comment.id} reactions={comment.reactions} />
              <button
                type="button"
                onClick={() => { setShowReplyInput(!showReplyInput); setCollapsed(false); }}
                title="Reply"
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: COLORS.grayLight, display: 'flex', borderRadius: 4, transition: 'color 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.color = COLORS.gray; }}
                onMouseLeave={e => { e.currentTarget.style.color = COLORS.grayLight; }}
              ><Reply size={12} /></button>
              {comment.authorId === currentUserId && !editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  title="Edit"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: COLORS.grayLight, display: 'flex', borderRadius: 4, transition: 'color 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = COLORS.gray; }}
                  onMouseLeave={e => { e.currentTarget.style.color = COLORS.grayLight; }}
                ><Pencil size={12} /></button>
              )}
              {comment.authorId === currentUserId && (
                <button
                  type="button"
                  onClick={() => onDeleteComment(comment.id)}
                  title="Delete"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: COLORS.grayLight, display: 'flex', borderRadius: 4, transition: 'color 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = COLORS.red; }}
                  onMouseLeave={e => { e.currentTarget.style.color = COLORS.grayLight; }}
                ><Trash2 size={12} /></button>
              )}
            </div>
          </div>

          {/* Comment body */}
          {editing ? (
            <div style={{ position: 'relative' }}>
              <textarea
                ref={editRef}
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') cancelEdit();
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                }}
                style={{
                  width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8,
                  border: `1.5px solid ${COLORS.accent}`, fontSize: 13, fontFamily: FF, color: COLORS.ink,
                  outline: 'none', boxShadow: '0 0 0 3px rgba(254,128,41,0.12)', lineHeight: 1.5, resize: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button onClick={cancelEdit} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${COLORS.line}`, background: '#FFFFFF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: COLORS.ink }}>Cancel</button>
                <button onClick={saveEdit} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: COLORS.accent, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FF, color: '#FFFFFF' }}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, fontFamily: FF, lineHeight: 1.5, color: COLORS.ink, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {renderMentionText(comment.text)}
            </div>
          )}

          {/* Reactions bar */}
          {!editing && <ReactionBar commentId={comment.id} reactions={comment.reactions} />}

          {/* Replies (only for top-level comments, and only 1 level deep per spec) */}
          {!isReply && hasReplies && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0', color: COLORS.gray, fontSize: 11.5, fontFamily: FF, fontWeight: 600, transition: 'color 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.color = COLORS.ink; }}
                onMouseLeave={e => { e.currentTarget.style.color = COLORS.gray; }}
              >
                {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <MessageSquare size={11} /> {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>
              {!collapsed && replies.map(r => (
                <CommentCard key={r.id} comment={r} isReply />
              ))}
            </div>
          )}

          {/* Reply input */}
          {!isReply && showReplyInput && (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <textarea
                ref={replyRef}
                value={replyText}
                onChange={e => handleReplyTextChange(e.target.value)}
                onKeyDown={handleReplyKeyDown}
                onBlur={() => setTimeout(() => setReplyShowMentions(false), 200)}
                placeholder={`Reply to ${author?.name || 'Unknown'}… Type @ to mention`}
                style={{
                  width: '100%', minHeight: 36, maxHeight: 100, padding: '8px 36px 8px 10px', borderRadius: 8,
                  border: `1.5px solid ${COLORS.line}`, fontSize: 12.5, fontFamily: FF, color: COLORS.ink,
                  outline: 'none', lineHeight: 1.4, resize: 'none', boxSizing: 'border-box',
                }}
              />
              {replyShowMentions && (
                <MentionDropdown
                  matches={replyMentionMatches}
                  idx={replyMentionIdx}
                  onSelect={(name) => insertMention(name, replyRef.current, replyText, replyCursorPos, setReplyText, setReplyCursorPos)}
                  position="above"
                />
              )}
              <button
                type="button"
                onClick={submitReply}
                disabled={!replyText.trim()}
                style={{
                  position: 'absolute', right: 6, bottom: 6, width: 24, height: 24, borderRadius: 6,
                  border: 'none', background: replyText.trim() ? COLORS.accent : COLORS.line,
                  color: '#FFFFFF', cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
                }}
              ><Send size={12} /></button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Field label={activeTab === 'comments' ? `Comments (${taskComments.length})` : `Activity (${taskActivity.length})`}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderBottom: `1px solid ${COLORS.line}` }}>
        {(['comments', 'activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: activeTab === tab ? 700 : 500, fontFamily: FF,
              color: activeTab === tab ? COLORS.ink : COLORS.gray,
              borderBottom: activeTab === tab ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >{tab === 'comments' ? `Comments` : 'Activity'}</button>
        ))}
      </div>

      {activeTab === 'comments' ? (
        <>
          <div ref={listRef} style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topLevelComments.length === 0 && (
              <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 12.5, fontFamily: FF, padding: '12px 0' }}>No comments yet. Be the first to comment.</div>
            )}
            {topLevelComments.map(c => (
              <CommentCard key={c.id} comment={c} />
            ))}
          </div>
          {/* Main comment input */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
            <Avatar id={currentUserId} size={28} />
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => handleTextChange(e.target.value)}
                onKeyDown={handleMainKeyDown}
                onBlur={handleMainBlur}
                placeholder="Write a comment… Type @ to mention someone"
                style={{
                  width: '100%', minHeight: 38, maxHeight: 120, resize: 'none',
                  padding: '8px 36px 8px 10px', borderRadius: 10,
                  border: `1.5px solid ${COLORS.line}`,
                  fontSize: 13, fontFamily: FF, color: COLORS.ink,
                  outline: 'none', boxSizing: 'border-box' as const, lineHeight: 1.4,
                }}
              />
              {showMentions && (
                <MentionDropdown
                  matches={mentionMatches}
                  idx={mentionIdx}
                  onSelect={(name) => insertMention(name, textareaRef.current, text, cursorPos, setText, setCursorPos)}
                  position="above"
                />
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!text.trim()}
                style={{
                  position: 'absolute', right: 6, bottom: 6,
                  width: 26, height: 26, borderRadius: 8,
                  border: 'none', background: text.trim() ? COLORS.accent : COLORS.line,
                  color: '#FFFFFF', cursor: text.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              ><Send size={13} /></button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {taskActivity.length === 0 && (
            <div style={{ textAlign: 'center', color: COLORS.gray, fontSize: 12.5, fontFamily: FF, padding: '12px 0' }}>No activity recorded yet.</div>
          )}
          {taskActivity.map(a => {
            const author = memberList.find(m => m.id === a.authorId);
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${COLORS.lineLight}` }}>
                <Avatar id={a.authorId} size={20} />
                <span style={{ fontSize: 12, fontFamily: FF, color: COLORS.gray, flex: 1 }}>{a.description}</span>
                <span style={{ fontSize: 11, color: COLORS.grayLight, fontFamily: FF, flexShrink: 0 }}>{fmtTime(a.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Field>
  );
}

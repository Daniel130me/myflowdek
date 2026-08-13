'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, Trash2, Paperclip, Eye, Download } from 'lucide-react';
import { COLORS, TODAY, fmtSize, fmtDate, extOf, type Task, type FileItem } from '@/features/flowdeck/model';
import { Avatar, SectionHeader, FileThumbnail, FF, useMemberDirectory } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { useAuth } from '../auth';

export function FilesView({ files, tasks, onAdd, onRemove, onLink, onViewFile }: { files: FileItem[]; tasks: Task[]; onAdd: (files: FileItem[]) => void; onRemove: (id: string) => void; onLink: (id: string, taskId: string | null) => void; onViewFile: (id: string) => void }) {
  const { isMobile } = useViewport();
  const inputRef = useRef<HTMLInputElement>(null);
  // Real authenticated user identity — replaces the hard-coded
  // CURRENT_USER_ID fallback for newly-uploaded files.
  const auth = useAuth();
  const myUserId = auth.user?.id ?? '';
  // Resolve uploader ids to display names via the global MemberDirectory
  // (populated by `useProjectMembers` for every opened project). Falls back
  // to undefined for unknown ids — the label renders empty in that case.
  const { lookup: lookupMember } = useMemberDirectory();

  /* Track hover state for desktop cards */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const handleMouseEnter = useCallback((id: string) => setHoveredId(id), []);
  const handleMouseLeave = useCallback(() => setHoveredId(null), []);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    const now = TODAY.toISOString().slice(0, 10);
    const newFiles: FileItem[] = picked.map(f => ({
      id: 'f' + Math.random().toString(36).slice(2, 8),
      name: f.name, size: f.size, uploadedBy: myUserId, uploadedAt: now,
      linkedTaskId: null, url: URL.createObjectURL(f),
    }));
    onAdd(newFiles);
    e.target.value = '';
  }

  function handleDownload(f: FileItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const url = f.url || '';
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = f.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  const uploadBtn = (
    <>
      <input ref={inputRef} type="file" multiple onChange={handlePick} style={{ display: 'none' }} />
      <button onClick={() => inputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: isMobile ? '9px 14px' : '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF, boxShadow: '0 1px 3px rgba(254,128,41,0.3)' }}><Upload size={15} /> {isMobile ? 'Upload' : 'Upload files'}</button>
    </>
  );

  /* ---------- Empty state ---------- */
  if (files.length === 0) {
    return (
      <div>
        <SectionHeader title="Files" subtitle="0 files attached to this project" right={uploadBtn} />
        <div style={{ padding: 48, textAlign: 'center', color: COLORS.gray, fontFamily: FF, fontSize: 14 }}>
          <Paperclip size={32} color={COLORS.line} style={{ marginBottom: 12, display: 'inline-block' }} />
          <div>No files yet. Upload something to get started.</div>
        </div>
      </div>
    );
  }

  /* ---------- Mobile: card layout with thumbnails ---------- */
  if (isMobile) {
    return (
      <div>
        <SectionHeader title="Files" subtitle={`${files.length} files`} right={uploadBtn} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {files.map(f => {
            const linkedTask = f.linkedTaskId ? tasks.find(t => t.id === f.linkedTaskId) : null;
            return (
              <div key={f.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'hidden' }}>
                {/* Thumbnail row */}
                <div style={{ padding: 12, display: 'flex', gap: 12 }}>
                  <FileThumbnail name={f.name} thumbnailUrl={f.thumbnailUrl} size="md" />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtSize(f.size)} · {fmtDate(f.uploadedAt)}</div>
                    {linkedTask && (
                      <div style={{ fontSize: 11, color: COLORS.accent, fontFamily: FF, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Paperclip size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />{linkedTask.name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 2, alignSelf: 'flex-start' }}>
                    <button onClick={() => onViewFile(f.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={16} /></button>
                    {f.url && (
                      <button onClick={(e) => handleDownload(f, e)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Download size={16} /></button>
                    )}
                    <button onClick={() => onRemove(f.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray, padding: 6, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                  </div>
                </div>
                {/* Footer: uploader + link task */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px 10px' }}>
                  <Avatar id={f.uploadedBy} size={18} />
                  <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{lookupMember(f.uploadedBy)?.name.split(' ')[0]}</span>
                  <select value={f.linkedTaskId || ''} onChange={e => onLink(f.id, e.target.value || null)} style={{ marginLeft: 'auto', border: `1px solid ${COLORS.line}`, borderRadius: 8, fontSize: 11, padding: '4px 6px', cursor: 'pointer', maxWidth: 120, fontFamily: FF }}><option value="">Link task...</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- Desktop: grid of thumbnail cards ---------- */
  return (
    <div>
      <SectionHeader title="Files" subtitle={`${files.length} files attached to this project`} right={uploadBtn} />
      {/* Thumbnail grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {files.map(f => {
          const linkedTask = f.linkedTaskId ? tasks.find(t => t.id === f.linkedTaskId) : null;
          const isHovered = hoveredId === f.id;
          return (
            <div
              key={f.id}
              onClick={() => onViewFile(f.id)}
              onMouseEnter={() => handleMouseEnter(f.id)}
              onMouseLeave={handleMouseLeave}
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s ease', boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Thumbnail area */}
              <div style={{ position: 'relative', aspectRatio: '16/10', background: '#F3F4F6', overflow: 'hidden' }}>
                <FileThumbnail name={f.name} thumbnailUrl={f.thumbnailUrl} size="lg" rounded={0} />
                {/* Eye preview icon overlay (bottom-left, visible on hover) */}
                <div style={{
                  position: 'absolute', bottom: 8, left: 8,
                  width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#FFFFFF', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s',
                  pointerEvents: 'none',
                }}>
                  <Eye size={14} />
                </div>
                {/* Delete button overlay (top-right, visible on hover) */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' } as React.CSSProperties}
                >
                  <Trash2 size={14} />
                </button>
                {/* Download button overlay (top-left, visible on hover) */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(f, e); }}
                  style={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' } as React.CSSProperties}
                >
                  <Download size={14} />
                </button>
              </div>
              {/* Info area */}
              <div style={{ padding: '12px 14px 10px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{f.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar id={f.uploadedBy} size={18} />
                    <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{lookupMember(f.uploadedBy)?.name.split(' ')[0]}</span>
                    <span style={{ fontSize: 12, color: COLORS.line }}>·</span>
                    <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtSize(f.size)}</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: COLORS.gray, fontFamily: FF }}>{fmtDate(f.uploadedAt)}</span>
                </div>
                {linkedTask && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11.5, color: COLORS.accent, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Paperclip size={11} /> {linkedTask.name}
                  </div>
                )}
                {/* Inline link task select */}
                {!linkedTask && (
                  <select value="" onChange={e => { if (e.target.value) onLink(f.id, e.target.value); }} style={{ marginTop: 8, width: '100%', border: `1px solid ${COLORS.line}`, borderRadius: 8, fontSize: 11.5, padding: '5px 8px', cursor: 'pointer', color: COLORS.gray, fontFamily: FF }}><option value="">Link to task...</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

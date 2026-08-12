'use client';

import React from 'react';
import { X, ArrowLeft, Download as DownloadIcon, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
import { COLORS, fmtSize, fmtDate, extOf, type FileItem, type Task } from '@/features/flowdeck/model';
import { FF } from '../ui/styles';
import { Avatar } from '../ui/Avatar';
import { FileThumbnail } from '../ui/FileThumbnail';
import { useMemberDirectory } from '../ui';
import { useViewport } from '../../hooks/useViewport';

/* Extension -> colour tint for the type badge */
const EXT_COLORS: Record<string, string> = {
  pdf: '#E53E3E',
  fig: '#A259FF',
  xlsx: '#16A34A',
  xls: '#16A34A',
  csv: '#16A34A',
  docx: '#2563EB',
  doc: '#2563EB',
  png: '#0891B2',
  jpg: '#0891B2',
  jpeg: '#0891B2',
  svg: '#0891B2',
  pptx: '#D97706',
  ppt: '#D97706',
};

function getExtColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return EXT_COLORS[ext] || '#6B7280';
}

interface FileViewerModalProps {
  file: FileItem;
  allFiles: FileItem[];
  allTasks: Task[];
  onClose: () => void;
  onNavigateFile: (fileId: string) => void;
}

export function FileViewerModal({ file, allFiles, allTasks, onClose, onNavigateFile }: FileViewerModalProps) {
  const { isMobile } = useViewport();
  const { lookup } = useMemberDirectory();
  const ext = extOf(file.name);
  const tint = getExtColor(file.name);
  const linkedTask = file.linkedTaskId ? allTasks.find(t => t.id === file.linkedTaskId) : null;
  const uploader = lookup(file.uploadedBy);
  const uploaderName = uploader?.name ?? '';
  const currentIndex = allFiles.findIndex(f => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 10,
    border: `1px solid ${COLORS.line}`,
    background: '#F3F4F6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? COLORS.grayLight : COLORS.ink,
  });

  /* Mobile: full-screen panel */
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column',
        background: '#FFFFFF',
      }}>
        {/* Header with back arrow */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: `1px solid ${COLORS.line}`,
          flexShrink: 0, background: '#FFFFFF',
        }}>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: COLORS.ink, padding: 6, borderRadius: 10,
              minHeight: 44, minWidth: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, fontFamily: FF,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{file.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', background: tint, padding: '2px 6px', borderRadius: 6, fontFamily: FF, letterSpacing: 0.3 }}>{ext}</span>
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtSize(file.size)}</span>
              <span style={{ fontSize: 12, color: COLORS.line }}>·</span>
              <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF }}>{fmtDate(file.uploadedAt)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {file.url ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <iframe src={file.url} title={file.name} style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
            <FileThumbnail name={file.name} thumbnailUrl={file.thumbnailUrl} size="lg" />
            <span style={{ fontSize: 14, color: COLORS.gray, fontFamily: FF }}>No preview available</span>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: `1px solid ${COLORS.line}`, flexShrink: 0, background: '#FFFFFF' }}>
          <button disabled={!hasPrev} onClick={() => onNavigateFile(allFiles[currentIndex - 1].id)} style={navBtnStyle(!hasPrev)}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, whiteSpace: 'nowrap' }}>{currentIndex + 1} / {allFiles.length}</span>
          <button disabled={!hasNext} onClick={() => onNavigateFile(allFiles[currentIndex + 1].id)} style={navBtnStyle(!hasNext)}>
            <ChevronRight size={18} />
          </button>
          <div style={{ width: 1, height: 20, background: COLORS.line, flexShrink: 0 }} />
          {file.url && (
            <a href={file.url} download={file.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: COLORS.accent, textDecoration: 'none', fontFamily: FF, cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
              <DownloadIcon size={15} /> Download
            </a>
          )}
          {linkedTask && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.gray, fontFamily: FF, overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <Paperclip size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedTask.name}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <Avatar id={file.uploadedBy} size={20} />
            <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, whiteSpace: 'nowrap' }}>{uploaderName.split(' ')[0]}</span>
          </div>
        </div>
      </div>
    );
  }

  /* Desktop: centered modal */
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }}
      />
      <div style={{
        position: 'relative', width: 680, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 64px)',
        background: '#FFFFFF', borderRadius: 16,
        boxShadow: '0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: `1px solid ${COLORS.line}`, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', background: tint, padding: '3px 8px', borderRadius: 8, fontFamily: FF, letterSpacing: 0.5, flexShrink: 0 }}>{ext}</span>
            <span style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF, flexShrink: 0 }}>{fmtSize(file.size)}</span>
            <span style={{ fontSize: 13, color: COLORS.line, flexShrink: 0 }}>·</span>
            <span style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF, flexShrink: 0 }}>{fmtDate(file.uploadedAt)}</span>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#F3F4F6', cursor: 'pointer', color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {file.url ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <iframe src={file.url} title={file.name} style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
            <FileThumbnail name={file.name} thumbnailUrl={file.thumbnailUrl} size="lg" />
            <span style={{ fontSize: 14, color: COLORS.gray, fontFamily: FF }}>No preview available</span>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: `1px solid ${COLORS.line}`, flexShrink: 0, background: '#FFFFFF' }}>
          <button disabled={!hasPrev} onClick={() => onNavigateFile(allFiles[currentIndex - 1].id)} style={navBtnStyle(!hasPrev)}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, whiteSpace: 'nowrap' }}>{currentIndex + 1} / {allFiles.length}</span>
          <button disabled={!hasNext} onClick={() => onNavigateFile(allFiles[currentIndex + 1].id)} style={navBtnStyle(!hasNext)}>
            <ChevronRight size={18} />
          </button>
          <div style={{ width: 1, height: 20, background: COLORS.line, flexShrink: 0 }} />
          {file.url && (
            <a href={file.url} download={file.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: COLORS.accent, textDecoration: 'none', fontFamily: FF, cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
              <DownloadIcon size={15} /> Download
            </a>
          )}
          {linkedTask && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.gray, fontFamily: FF, overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <Paperclip size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedTask.name}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <Avatar id={file.uploadedBy} size={20} />
            <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, whiteSpace: 'nowrap' }}>{uploaderName.split(' ')[0]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

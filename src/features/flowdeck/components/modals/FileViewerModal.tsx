'use client';

import React from 'react';
import { X, ArrowLeft, ExternalLink, Paperclip, ChevronLeft, ChevronRight, Cloud, FileText, Image as ImageIcon, File } from 'lucide-react';
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

/**
 * Google-native document MIME types. These cannot be rendered in an iframe
 * via a direct URL — they must be opened in Google Drive's native UI.
 */
const GOOGLE_NATIVE_MIME_TYPES = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.drawing',
  'application/vnd.google-apps.form',
  'application/vnd.google-apps.site',
]);

/**
 * Check if a file is a connected-provider file (e.g. Google Drive).
 * Connected files are provider-hosted and must NOT be iframed via the
 * Flowdek download endpoint.
 */
function isConnectedFile(file: FileItem): boolean {
  return !!file.storageProvider;
}

/**
 * Check if a file is a Google-native document (Docs, Sheets, Slides, etc.)
 * that cannot be rendered in an iframe and must be opened in Google Drive.
 */
function isGoogleNativeDoc(file: FileItem): boolean {
  return GOOGLE_NATIVE_MIME_TYPES.has(file.mimeType ?? '');
}

/**
 * Check if a file type can be previewed in an iframe.
 * Only legacy R2/local files with a direct URL can be iframed.
 * Connected-provider files are never iframed (they return metadata JSON
 * from the download endpoint, not file bytes).
 */
function canIframe(file: FileItem): boolean {
  // Connected-provider files must NEVER be iframed via Flowdek.
  if (isConnectedFile(file)) return false;
  // Legacy/local files with a URL can be iframed.
  return !!file.url;
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

  const connected = isConnectedFile(file);
  const isGoogleDoc = isGoogleNativeDoc(file);
  // The URL to open in the provider's native UI (e.g. Google Drive).
  // For connected files, this is the providerWebUrl. For legacy files,
  // this is the file.url (R2 presigned URL).
  const openUrl = connected ? (file.providerWebUrl ?? undefined) : file.url;

  const navBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: 10,
    border: `1px solid ${COLORS.line}`,
    background: '#F3F4F6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: disabled ? COLORS.grayLight : COLORS.ink,
  });

  /**
   * Render the connected-file preview card.
   * This is shown for all connected-provider files (Google Drive, etc.)
   * instead of an iframe. It shows file metadata and an "Open in Google
   * Drive" button.
   */
  function renderConnectedFilePreview() {
    const providerName = file.storageProvider === 'GOOGLE_DRIVE' ? 'Google Drive'
      : file.storageProvider === 'ONEDRIVE' ? 'OneDrive'
      : file.storageProvider === 'DROPBOX' ? 'Dropbox'
      : 'Cloud Drive';

    const icon = isGoogleDoc ? <FileText size={48} color={COLORS.accent} />
      : (file.mimeType?.startsWith('image/') ? <ImageIcon size={48} color={COLORS.accent} />
      : <File size={48} color={COLORS.accent} />);

    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: 32, background: '#F9FAFB',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: 16,
          background: '#FFFFFF', border: `1px solid ${COLORS.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, fontFamily: FF, marginBottom: 4 }}>
            {file.name}
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF, marginBottom: 2 }}>
            {providerName} · {fmtSize(file.size)}
          </div>
          {file.mimeType && (
            <div style={{ fontSize: 11, color: COLORS.grayLight, fontFamily: FF }}>
              {file.mimeType}
            </div>
          )}
          {isGoogleDoc && (
            <div style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, marginTop: 8 }}>
              This is a Google-native document. Open it in Google Drive to view and edit.
            </div>
          )}
        </div>
        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10,
              background: COLORS.accent, color: '#FFFFFF',
              fontSize: 14, fontWeight: 600, fontFamily: FF,
              textDecoration: 'none', cursor: 'pointer',
            }}
          >
            <Cloud size={16} />
            Open in {providerName}
          </a>
        )}
      </div>
    );
  }

  /** Mobile: full-screen panel */
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
              {connected && (
                <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.accent, fontFamily: FF }}>
                  · {file.storageProvider === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Cloud'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {connected ? renderConnectedFilePreview() : canIframe(file) ? (
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
          {openUrl && (
            <a href={openUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: COLORS.accent, textDecoration: 'none', fontFamily: FF, cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
              <ExternalLink size={15} /> {connected ? `Open in ${file.storageProvider === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Cloud'}` : 'Open in Cloud Drive'}
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

  /** Desktop: centered modal */
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
            {connected && (
              <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.accent, fontFamily: FF, flexShrink: 0 }}>
                · {file.storageProvider === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Cloud'}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#F3F4F6', cursor: 'pointer', color: COLORS.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {connected ? renderConnectedFilePreview() : canIframe(file) ? (
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
          {openUrl && (
            <a href={openUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: COLORS.accent, textDecoration: 'none', fontFamily: FF, cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
              <ExternalLink size={15} /> {connected ? `Open in ${file.storageProvider === 'GOOGLE_DRIVE' ? 'Google Drive' : 'Cloud'}` : 'Open in Cloud Drive'}
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

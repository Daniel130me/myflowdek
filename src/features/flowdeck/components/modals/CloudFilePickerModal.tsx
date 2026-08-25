'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Cloud, RefreshCw, CheckCircle, ExternalLink, Paperclip, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { COLORS } from '@/features/flowdeck/model';
import { FF } from '../ui/styles';
import { useViewport } from '../../hooks/useViewport';
import { GooglePickerButton } from './GooglePickerButton';

interface ProviderFileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webUrl?: string;
  thumbnailUrl?: string;
  ownerEmail?: string;
  modifiedAt?: string;
}

interface StorageConnection {
  provider: 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX';
  providerEmail: string | null;
}

interface CloudFilePickerModalProps {
  projectId: string;
  taskId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onFileAttached: () => void;
}

const PROVIDER_NAMES: Record<string, string> = {
  'google-drive': 'Google Drive',
  'onedrive': 'OneDrive',
  'dropbox': 'Dropbox',
};

/**
 * Providers currently enabled in the product.
 * Only Google Drive is active — OneDrive and Dropbox are deferred until
 * their adapters are fully implemented. Hiding them prevents users from
 * hitting unsupported-provider errors.
 */
const ENABLED_PROVIDERS: ReadonlyArray<string> = ['google-drive'];

/**
 * CloudFilePickerModal — lets the user attach files from connected cloud
 * storage providers.
 *
 * For Google Drive, this opens the native Google Picker (the correct way
 * to browse the full Drive while keeping the `drive.file` scope). The
 * Picker grants per-file access — no need for the restricted `drive` scope.
 *
 * For other providers (OneDrive, Dropbox), the modal uses server-side
 * listing via /api/storage/files.
 */
export function CloudFilePickerModal({
  projectId,
  taskId,
  isOpen,
  onClose,
  onFileAttached,
}: CloudFilePickerModalProps) {
  const { isMobile } = useViewport();
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('google-drive');
  const [query, setQuery] = useState<string>('');
  const [files, setFiles] = useState<ProviderFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check connected storage accounts.
  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/storage/connections');
      if (!res.ok) return;
      const data = (await res.json()) as { connections?: StorageConnection[] };
      setConnections(data.connections ?? []);
    } catch {
      // Ignore network errors.
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen, loadConnections]);

  // Fetch files from provider — ONLY for non-Google-Drive providers.
  // Google Drive uses the Google Picker (see GooglePickerButton).
  const fetchProviderFiles = useCallback(
    async (providerSlug: string, searchQuery: string) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const url = `/api/storage/files?provider=${encodeURIComponent(providerSlug)}&query=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          setConnected(false);
          setErrorMessage(data.error ?? 'Failed to connect to storage provider.');
          setFiles([]);
          return;
        }

        if (data.connected === false) {
          setConnected(false);
          setAccountEmail(null);
          setFiles([]);
        } else {
          setConnected(true);
          setAccountEmail(data.accountEmail ?? null);
          setFiles(data.files ?? []);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error fetching provider files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Only fetch files automatically for non-Google-Drive providers.
  // Google Drive uses the Picker button — no auto-fetch.
  useEffect(() => {
    if (isOpen && activeProvider !== 'google-drive') {
      const timer = setTimeout(() => {
        fetchProviderFiles(activeProvider, query);
      }, 250);
      return () => clearTimeout(timer);
    }
    // For Google Drive, reset the file list (Picker is the entry point).
    if (isOpen && activeProvider === 'google-drive') {
      setFiles([]);
      setErrorMessage(null);
      setConnected(true);
    }
  }, [isOpen, activeProvider, query, fetchProviderFiles]);

  /** Attach a file by its provider file ID. */
  const handleAttachByProviderFileId = useCallback(
    async (provider: string, providerFileId: string) => {
      setAttachingId(providerFileId);
      try {
        const res = await fetch(`/api/projects/${projectId}/files/attach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            providerFileId,
            taskId: taskId ?? null,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? 'Failed to attach file');

        toast.success(`Attached "${data.file?.name ?? 'file'}" from ${PROVIDER_NAMES[provider]}`);
        onFileAttached();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not attach file');
      } finally {
        setAttachingId(null);
      }
    },
    [projectId, taskId, onFileAttached, onClose],
  );

  /** Handle Google Picker file selection. */
  const handleGooglePickerFileSelected = useCallback(
    (file: { providerFileId: string; name: string; mimeType: string }) => {
      void handleAttachByProviderFileId('google-drive', file.providerFileId);
    },
    [handleAttachByProviderFileId],
  );

  /** Attach a file from the non-Google-Drive provider list. */
  const handleAttach = async (fileItem: ProviderFileItem) => {
    await handleAttachByProviderFileId(activeProvider, fileItem.id);
  };

  const handleConnectOAuth = () => {
    window.location.href = `/api/storage/connections/${activeProvider}/authorize`;
  };

  if (!isOpen) return null;

  const isGoogleDrive = activeProvider === 'google-drive';
  const googleDriveConnected = connections.some((c) => c.provider === 'GOOGLE_DRIVE');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(31,33,36,0.5)',
        backdropFilter: 'blur(4px)',
        padding: isMobile ? 12 : 24,
      }}
    >
      <div
        style={{
          width: 720,
          maxWidth: '100%',
          maxHeight: '90vh',
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: FF,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cloud size={20} color={COLORS.accent} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink }}>
                Attach Connected File
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>
                Link files directly from your cloud drive — no copies stored in Flowdek
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: '#F3F4F6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.gray,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Provider Selector */}
        <div
          style={{
            padding: '12px 20px',
            background: '#F9FAFB',
            borderBottom: `1px solid ${COLORS.line}`,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 10,
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          {/* Provider Tabs — only show enabled providers */}
          <div style={{ display: 'flex', gap: 6 }}>
            {ENABLED_PROVIDERS.map((pSlug) => {
              const isSelected = activeProvider === pSlug;
              return (
                <button
                  key={pSlug}
                  onClick={() => setActiveProvider(pSlug)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: isSelected ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                    background: isSelected ? COLORS.accentSoft : '#FFFFFF',
                    color: isSelected ? COLORS.accent : COLORS.ink,
                    fontWeight: isSelected ? 600 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {PROVIDER_NAMES[pSlug]}
                </button>
              );
            })}
          </div>

          {/* Search Box — only for non-Google-Drive providers */}
          {!isGoogleDrive && (
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={15}
                color={COLORS.gray}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder={`Search ${PROVIDER_NAMES[activeProvider]} files...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.line}`,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: FF,
                }}
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, minHeight: 280 }}>

          {/* ===== GOOGLE DRIVE: Picker button ===== */}
          {isGoogleDrive && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              {googleDriveConnected ? (
                <>
                  <Cloud size={40} color={COLORS.accent} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: COLORS.ink }}>
                    Attach from Google Drive
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.gray, maxWidth: 420, margin: '0 auto 20px' }}>
                    Click below to open the Google Drive file picker. Browse your full Drive,
                    select a file, and Flowdek will attach it by reference — no copies stored.
                  </div>
                  <GooglePickerButton
                    projectId={projectId}
                    taskId={taskId}
                    onFileSelected={handleGooglePickerFileSelected}
                    disabled={!!attachingId}
                  />
                  {attachingId && (
                    <div style={{ marginTop: 12, fontSize: 12, color: COLORS.gray }}>
                      Attaching file from Google Drive...
                    </div>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle size={36} color={COLORS.accent} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                    Connect your Google Drive account
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.gray, maxWidth: 400, margin: '0 auto 16px' }}>
                    Flowdek does not upload or copy your files. Authorize access to attach and
                    open files directly from your personal drive.
                  </div>
                  <button
                    onClick={handleConnectOAuth}
                    style={{
                      background: COLORS.accent,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '9px 18px',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    Connect Google Drive
                  </button>
                </>
              )}
            </div>
          )}

          {/* ===== NON-GOOGLE-DRIVE: Custom file list ===== */}
          {!isGoogleDrive && (
            <>
              {/* Not Connected State */}
              {!connected && (
                <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <AlertCircle size={36} color={COLORS.accent} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                    Connect your {PROVIDER_NAMES[activeProvider]} account
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.gray, maxWidth: 400, margin: '0 auto 16px' }}>
                    Flowdek does not upload or copy your files. Authorize access to attach and
                    open files directly from your personal drive.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <button
                      onClick={handleConnectOAuth}
                      style={{
                        background: COLORS.accent,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 18px',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      Connect {PROVIDER_NAMES[activeProvider]}
                    </button>
                    <a
                      href="/settings"
                      style={{
                        background: '#F3F4F6',
                        color: COLORS.ink,
                        borderRadius: 8,
                        padding: '9px 18px',
                        fontWeight: 600,
                        fontSize: 13,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Workspace Settings
                    </a>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {connected && loading && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: COLORS.gray }}>
                  <RefreshCw className="animate-spin" size={24} style={{ marginBottom: 8 }} />
                  <div>Fetching files from {PROVIDER_NAMES[activeProvider]}...</div>
                </div>
              )}

              {/* Error State */}
              {connected && !loading && errorMessage && (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 10,
                    padding: 16,
                    color: '#991B1B',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Connection Error</div>
                  <div>{errorMessage}</div>
                  <button
                    onClick={handleConnectOAuth}
                    style={{
                      marginTop: 10,
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Reconnect Account
                  </button>
                </div>
              )}

              {/* File List */}
              {connected && !loading && !errorMessage && files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {files.map((file) => {
                    const isAttaching = attachingId === file.id;
                    return (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: `1px solid ${COLORS.line}`,
                          background: '#FFFFFF',
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                          {file.thumbnailUrl ? (
                            <img
                              src={file.thumbnailUrl}
                              alt={file.name}
                              style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 6,
                                background: '#F3F4F6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: COLORS.gray,
                                flexShrink: 0,
                              }}
                            >
                              <Paperclip size={18} />
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: COLORS.ink,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {file.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: COLORS.gray, marginTop: 2 }}>
                              {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Cloud file'}
                              {file.ownerEmail ? ` · ${file.ownerEmail}` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                          {file.webUrl && (
                            <a
                              href={file.webUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: `1px solid ${COLORS.line}`,
                                color: COLORS.gray,
                                textDecoration: 'none',
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              View <ExternalLink size={12} />
                            </a>
                          )}
                          <button
                            onClick={() => handleAttach(file)}
                            disabled={isAttaching}
                            style={{
                              background: COLORS.accent,
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 14px',
                              fontWeight: 600,
                              fontSize: 12.5,
                              cursor: isAttaching ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {isAttaching ? 'Attaching...' : 'Attach Reference'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty Search Result */}
              {connected && !loading && !errorMessage && files.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: COLORS.gray }}>
                  <Search size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {query ? `No files matching "${query}"` : `No files found in ${PROVIDER_NAMES[activeProvider]}`}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

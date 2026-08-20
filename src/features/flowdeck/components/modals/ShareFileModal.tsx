'use client';

import React, { useState } from 'react';
import { X, Share2, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { COLORS } from '@/features/flowdeck/model';
import { FF } from '../ui/styles';

interface ShareFileModalProps {
  fileId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  shareEndpoint?: string;
}

export function ShareFileModal({ fileId, fileName, isOpen, onClose, shareEndpoint }: ShareFileModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'reader' | 'writer'>('reader');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(shareEndpoint ?? `/api/files/${fileId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sharing failed');

      toast.success(data.message ?? `Shared "${fileName}" with ${email}`);
      setEmail('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(31,33,36,0.5)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: '100%',
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          padding: 24,
          fontFamily: FF,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Share2 size={18} color={COLORS.accent} />
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink }}>
              Share in Provider
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLORS.gray }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
          Grant access to <strong>{fileName}</strong> directly on Google Drive / Cloud Provider. The cloud provider controls actual permissions.
        </div>

        <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, display: 'block', marginBottom: 6 }}>
              Teammate Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color={COLORS.gray} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: 8,
                  border: `1px solid ${COLORS.line}`,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: FF,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, display: 'block', marginBottom: 6 }}>
              Permission Role
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRole('reader')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 8,
                  border: role === 'reader' ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                  background: role === 'reader' ? COLORS.accentSoft : '#FFFFFF',
                  color: role === 'reader' ? COLORS.accent : COLORS.ink,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: FF,
                }}
              >
                Viewer (Read)
              </button>
              <button
                type="button"
                onClick={() => setRole('writer')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 8,
                  border: role === 'writer' ? `1.5px solid ${COLORS.accent}` : `1px solid ${COLORS.line}`,
                  background: role === 'writer' ? COLORS.accentSoft : '#FFFFFF',
                  color: role === 'writer' ? COLORS.accent : COLORS.ink,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  fontFamily: FF,
                }}
              >
                Editor (Write)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${COLORS.line}`,
                background: '#FFFFFF',
                fontSize: 12.5,
                fontWeight: 600,
                color: COLORS.gray,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: COLORS.accent,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#FFFFFF',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

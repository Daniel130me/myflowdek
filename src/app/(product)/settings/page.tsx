'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Users, Mail, Settings, Trash2, Crown, Shield, UserMinus, Send, HardDrive, AlertTriangle, X } from 'lucide-react';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useAuth } from '@/features/flowdeck/components/auth';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
import { useViewport } from '@/features/flowdeck/hooks/useViewport';
import { toast } from 'sonner';

interface WorkspaceMember {
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; avatarColor: string | null; jobTitle: string | null };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

type StorageProvider = 'GOOGLE_DRIVE';

interface StorageConnection {
  id: string;
  provider: StorageProvider;
  providerEmail: string | null;
}

const storageProviders = [
  { provider: 'GOOGLE_DRIVE' as const, slug: 'google-drive', label: 'Google Drive' },
];

/**
 * Workspace Settings page — accessible from the sidebar.
 *
 * Shows:
 *   - Workspace name (rename)
 *   - Members list (with role management)
 *   - Pending invitations (revoke)
 *   - Danger zone (transfer ownership, delete workspace)
 */
export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ws = useWorkspaces();
  const auth = useAuth();
  const { isMobile } = useViewport();
  const workspaceId = ws.selectedWorkspaceId;
  const selectedWs = ws.selectedWorkspace;

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [storageConnections, setStorageConnections] = useState<StorageConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);

  const processedToastRef = useRef<string | null>(null);

  useEffect(() => {
    const storageParam = searchParams.get('storage');
    const storageErrorParam = searchParams.get('storage_error');

    if (storageParam === 'connected' && processedToastRef.current !== 'connected') {
      processedToastRef.current = 'connected';
      toast.success('Cloud storage connected successfully');
      router.replace('/settings');
    } else if (storageErrorParam && processedToastRef.current !== storageErrorParam) {
      processedToastRef.current = storageErrorParam;
      toast.error('Cloud storage connection failed', { description: storageErrorParam });
      router.replace('/settings');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (selectedWs) setName(selectedWs.name);
  }, [selectedWs]);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [memRes, invRes, storageRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/members`),
        fetch(`/api/workspaces/${workspaceId}/invitations`),
        fetch('/api/storage/connections'),
      ]);
      if (memRes.ok) setMembers((await memRes.json()).members ?? []);
      if (invRes.ok) setInvitations((await invRes.json()).invitations ?? []);
      if (storageRes.ok) setStorageConnections((await storageRes.json()).connections ?? []);
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRename = async () => {
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Workspace renamed');
    } catch { toast.error('Failed to rename workspace'); }
    finally { setSaving(false); }
  };

  const handleInvite = async () => {
    if (!workspaceId || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed');
      }
      toast.success(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      fetchAll();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to send invitation'); }
    finally { setInviting(false); }
  };

  const handleRevokeInvitation = async (invitationId: string): Promise<boolean> => {
    if (!workspaceId) return false;
    setRevokingInvitationId(invitationId);
    try {
      const response = await fetch(
        '/api/workspaces/' + workspaceId + '/invitations/' + invitationId,
        { method: 'DELETE' },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to revoke invitation');
      }

      setInvitations((current) => current.filter(({ id }) => id !== invitationId));
      toast.success('Invitation removed. You can invite this email again.');
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to revoke invitation',
      );
      return false;
    } finally {
      setRevokingInvitationId(null);
    }
  };

  const confirmRevokeInvitation = async () => {
    if (!invitationToRevoke) return;
    const removed = await handleRevokeInvitation(invitationToRevoke.id);
    if (removed) setInvitationToRevoke(null);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
      toast.success('Member removed');
      fetchAll();
    } catch { toast.error('Failed to remove member'); }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    if (!workspaceId) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      toast.success('Role updated');
      fetchAll();
    } catch { toast.error('Failed to update role'); }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    if (!confirm('Are you sure? This will permanently delete the workspace and all its projects.')) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      toast.success('Workspace deleted');
      router.push('/projects');
    } catch { toast.error('Failed to delete workspace'); }
  };

  const handleDisconnectStorage = async (slug: string) => {
    try {
      const response = await fetch('/api/storage/connections/' + slug, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Could not disconnect storage');
      toast.success('Storage disconnected');
      fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disconnect storage');
    }
  };

  if (!workspaceId) {
    return <div style={{ padding: 40, color: COLORS.gray, fontFamily: FF }}>No workspace selected.</div>;
  }

  const isOwner = selectedWs?.role === 'OWNER';
  const canManageInvitations = isOwner || selectedWs?.role === 'ADMIN';

  return (
    <div style={{ minHeight: '100%', background: '#F7F7F7', fontFamily: FF, color: COLORS.ink, padding: isMobile ? '18px 0 0' : '4px 0 0' }}>
      <div style={{paddingBottom: 70, maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, marginBottom: isMobile ? 20 : 28, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={24} color={COLORS.accent} /> Workspace Settings
        </h1>

        {/* General */}
        <Section title="General" icon={Building2}>
          <label style={labelStyle}>Workspace name</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ ...inputStyle, minWidth: 0, width: isMobile ? '100%' : undefined }}
              disabled={!isOwner && selectedWs?.role !== 'ADMIN'}
            />
            <button
              onClick={handleRename}
              disabled={saving || !name.trim()}
              style={btnPrimary}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div style={metaStyle}>Slug: {selectedWs?.slug}</div>
        </Section>

        {/* Personal connected storage */}
        <Section title={'Your Connected Storage'} icon={HardDrive}>
          <div style={{ fontSize: 12, color: COLORS.gray, lineHeight: 1.5, marginBottom: 12 }}>
            Files you upload are saved in your own cloud account. Flowdek stores file metadata and encrypted access credentials, not file bytes.
          </div>
          {storageProviders.map(({ provider, slug, label }) => {
            const connection = storageConnections.find((item) => item.provider === provider);
            return (
              <div key={provider} style={responsiveRowStyle(isMobile)}>
                <div style={{ ...avatarStyle(connection ? '#16A34A' : '#9CA3AF'), borderRadius: 8 }}>
                  <HardDrive size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: COLORS.gray }}>
                    {connection ? connection.providerEmail ?? 'Connected' : 'Not connected'}
                  </div>
                </div>
                {connection ? (
                  <button onClick={() => handleDisconnectStorage(slug)} style={{ ...btnPrimary, background: '#6B7280' }}>
                    Disconnect
                  </button>
                ) : (
                  <a href={'/api/storage/connections/' + slug + '/authorize'} style={{ ...btnPrimary, textDecoration: 'none' }}>
                    Connect
                  </a>
                )}
              </div>
            );
          })}
        </Section>

        {/* Members */}
        <Section title={`Members (${members.length})`} icon={Users}>
          {loading ? (
            <div style={{ color: COLORS.gray, fontSize: 13 }}>Loading members…</div>
          ) : (
            members.map(m => (
              <div key={m.userId} style={responsiveRowStyle(isMobile)}>
                <div style={{ ...avatarStyle(m.user.avatarColor ?? COLORS.accent) }}>
                  {m.user.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.user.name ?? m.user.email}</div>
                  <div style={{ fontSize: 11, color: COLORS.gray }}>{m.user.email}</div>
                </div>
                {m.userId === auth.user?.email ? (
                  <span style={badgeStyle('#F3F4F6', COLORS.gray)}>You</span>
                ) : m.role === 'OWNER' ? (
                  <span style={badgeStyle('#FEF3C7', '#D97706')}><Crown size={12} style={{ display: 'inline', marginRight: 4 }} />Owner</span>
                ) : (
                  <>
                    <select
                      value={m.role}
                      onChange={e => handleChangeRole(m.userId, e.target.value)}
                      disabled={!isOwner}
                      style={selectStyle}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="GUEST">Guest</option>
                    </select>
                    {isOwner && (
                      <button onClick={() => handleRemoveMember(m.userId)} style={iconBtnStyle} title="Remove member">
                        <UserMinus size={14} color="#DC2626" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </Section>

        {/* Invitations */}
        <Section title={`Pending Invitations (${invitations.filter(i => i.status === 'PENDING').length})`} icon={Mail}>
          {/* Invite form */}
          {canManageInvitations && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                style={{ ...inputStyle, minWidth: 0, width: isMobile ? '100%' : undefined }}
                type="email"
              />
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={selectStyle}>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="GUEST">Guest</option>
              </select>
              <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} style={btnPrimary}>
                {inviting ? 'Sending…' : <><Send size={14} style={{ display: 'inline', marginRight: 4 }} />Invite</>}
              </button>
            </div>
          )}
          {invitations.filter(i => i.status === 'PENDING').map(inv => (
            <div key={inv.id} style={responsiveRowStyle(isMobile)}>
              <div style={{ ...avatarStyle('#E5E7EB') }}><Mail size={14} color="#6B7280" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.email}</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>Role: {inv.role} · Expires: {new Date(inv.expiresAt).toLocaleDateString()}</div>
              </div>
              {canManageInvitations && (
                <button
                  onClick={() => setInvitationToRevoke(inv)}
                  disabled={revokingInvitationId === inv.id}
                  style={{
                    ...iconBtnStyle,
                    opacity: revokingInvitationId === inv.id ? 0.5 : 1,
                  }}
                  title="Remove pending invitation"
                  aria-label={'Remove invitation for ' + inv.email}
                >
                  <Trash2 size={14} color="#DC2626" />
                </button>
              )}
            </div>
          ))}
          {!loading && invitations.filter(i => i.status === 'PENDING').length === 0 && (
            <div style={{ color: COLORS.gray, fontSize: 13 }}>No pending invitations.</div>
          )}
        </Section>

        {/* Danger Zone */}
        {isOwner && (
          <Section title="Danger Zone" icon={Shield} danger>
            <div style={responsiveRowStyle(isMobile)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Delete this workspace</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>Permanently deletes the workspace, all projects, tasks, and members. This cannot be undone.</div>
              </div>
              <button onClick={handleDelete} style={{ ...btnPrimary, background: '#DC2626' }}>
                <Trash2 size={14} style={{ display: 'inline', marginRight: 4 }} />Delete
              </button>
            </div>
          </Section>
        )}
      </div>
      {invitationToRevoke && (
        <div role="dialog" aria-modal="true" aria-labelledby="revoke-invitation-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={() => !revokingInvitationId && setInvitationToRevoke(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', width: 'min(420px, 100%)', background: '#FFFFFF', borderRadius: 16, padding: isMobile ? 20 : 24, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontFamily: FF }}>
            <button onClick={() => setInvitationToRevoke(null)} disabled={Boolean(revokingInvitationId)} title="Close" aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', color: COLORS.gray, cursor: revokingInvitationId ? 'not-allowed' : 'pointer', padding: 4 }}><X size={18} /></button>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><AlertTriangle size={20} /></div>
            <h2 id="revoke-invitation-title" style={{ margin: '0 36px 8px 0', fontSize: 18, fontWeight: 700, color: COLORS.ink }}>Cancel invitation?</h2>
            <p style={{ margin: '0 0 22px', color: COLORS.gray, fontSize: 13.5, lineHeight: 1.5 }}>The pending invitation for <strong style={{ color: COLORS.ink }}>{invitationToRevoke.email}</strong> will be cancelled. They will not be able to use this invitation link.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setInvitationToRevoke(null)} disabled={Boolean(revokingInvitationId)} style={{ border: `1px solid ${COLORS.line}`, background: '#FFFFFF', color: COLORS.gray, cursor: revokingInvitationId ? 'not-allowed' : 'pointer', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: FF }}>Keep invitation</button>
              <button onClick={confirmRevokeInvitation} disabled={Boolean(revokingInvitationId)} style={{ border: 'none', background: COLORS.red, color: '#FFFFFF', cursor: revokingInvitationId ? 'wait' : 'pointer', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: FF }}>{revokingInvitationId ? 'Cancelling…' : 'Cancel invitation'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- styles ---- */
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: FF };
const inputStyle: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: FF, outline: 'none', boxSizing: 'border-box' };
const selectStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, fontFamily: FF, outline: 'none', cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { padding: '10px 16px', borderRadius: 8, border: 'none', background: COLORS.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF, whiteSpace: 'nowrap' };
const metaStyle: React.CSSProperties = { fontSize: 12, color: COLORS.gray };
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid #F3F4F6` };
function responsiveRowStyle(isMobile: boolean): React.CSSProperties { return { ...rowStyle, flexWrap: 'wrap', alignItems: isMobile ? 'flex-start' : 'center' }; }
const iconBtnStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' };
function badgeStyle(bg: string, color: string): React.CSSProperties { return { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: bg, color }; }
function avatarStyle(bg: string): React.CSSProperties { return { width: 32, height: 32, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }; }

function Section({ title, icon: Icon, children, danger }: { title: string; icon: any; children: React.ReactNode; danger?: boolean }) {
  const { isMobile } = useViewport();
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: isMobile ? 14 : 20,
      border: `1px solid ${danger ? '#FECACA' : COLORS.line}`,
    }}>
      <h2 style={{
        fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        color: danger ? '#DC2626' : COLORS.ink,
      }}>
        <Icon size={18} color={danger ? '#DC2626' : COLORS.accent} /> {title}
      </h2>
      {children}
    </div>
  );
}

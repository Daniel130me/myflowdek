'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Mail, Settings, Trash2, Crown, Shield, UserMinus, Send, HardDrive } from 'lucide-react';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useAuth } from '@/features/flowdeck/components/auth';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
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

type StorageProvider = 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX';

interface StorageConnection {
  id: string;
  provider: StorageProvider;
  providerEmail: string | null;
}

const storageProviders = [
  { provider: 'GOOGLE_DRIVE' as const, slug: 'google-drive', label: 'Google Drive' },
  { provider: 'ONEDRIVE' as const, slug: 'onedrive', label: 'OneDrive' },
  { provider: 'DROPBOX' as const, slug: 'dropbox', label: 'Dropbox' },
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
  const ws = useWorkspaces();
  const auth = useAuth();
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

  const handleRevokeInvitation = async (invId: string) => {
    if (!workspaceId) return;
    try {
      await fetch(`/api/workspaces/${workspaceId}/invitations/${invId}`, { method: 'DELETE' });
      toast.success('Invitation revoked');
      fetchAll();
    } catch { toast.error('Failed to revoke invitation'); }
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

  return (
    <div style={{ minHeight: '100%', background: '#F7F7F7', fontFamily: FF, color: COLORS.ink, padding: '32px 28px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={24} color={COLORS.accent} /> Workspace Settings
        </h1>

        {/* General */}
        <Section title="General" icon={Building2}>
          <label style={labelStyle}>Workspace name</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
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
              <div key={provider} style={rowStyle}>
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
              <div key={m.userId} style={rowStyle}>
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
          {isOwner && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                style={inputStyle}
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
            <div key={inv.id} style={rowStyle}>
              <div style={{ ...avatarStyle('#E5E7EB') }}><Mail size={14} color="#6B7280" /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.email}</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>Role: {inv.role} · Expires: {new Date(inv.expiresAt).toLocaleDateString()}</div>
              </div>
              {isOwner && (
                <button onClick={() => handleRevokeInvitation(inv.id)} style={iconBtnStyle} title="Revoke">
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
            <div style={rowStyle}>
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
const iconBtnStyle: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' };
function badgeStyle(bg: string, color: string): React.CSSProperties { return { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: bg, color }; }
function avatarStyle(bg: string): React.CSSProperties { return { width: 32, height: 32, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }; }

function Section({ title, icon: Icon, children, danger }: { title: string; icon: any; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20,
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

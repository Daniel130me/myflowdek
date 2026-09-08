'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Users, UserPlus, UserMinus, Crown } from 'lucide-react';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useAuth } from '@/features/flowdeck/components/auth';
import { getSingleParam } from '@/shared/utils/routeParams';
import { FONT_FAMILY as FF, COLORS } from '@/features/flowdeck/model';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/ui/skeleton';
import { fetchJson } from '@/lib/fetch-json';
import { useOptionalWorkspaceContext } from '@/providers/WorkspaceProvider';

interface ProjectMember {
  userId: string;
  role: string;
  isFavorite: boolean;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; avatarColor: string | null; jobTitle: string | null };
}

/**
 * Project Team page — shows project members with role management.
 *
 * Fetches from GET /api/projects/:id/members and allows:
 *   - Change role (PATCH) — OWNER/ADMIN only
 *   - Remove member (DELETE) — OWNER/ADMIN only
 *   - Leave project (DELETE self) — any member
 */
export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const auth = useAuth();
  const workspace = useOptionalWorkspaceContext();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceMembers, setWorkspaceMembers] = useState<ProjectMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  if (!projectId) notFound();

  // Populate the Add Member picker with the workspace directory (minus
  // existing project members) — the modal used to be a dead-end (audit H-13).
  useEffect(() => {
    if (!showAddModal || !workspace?.selectedWorkspaceId) return;
    (async () => {
      const res = await fetchJson<{ members: ProjectMember[] }>(`/api/workspaces/${workspace.selectedWorkspaceId}/members`);
      if (res.ok) setWorkspaceMembers(res.data.members ?? []);
    })();
  }, [showAddModal, workspace?.selectedWorkspaceId]);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (res.ok) setMembers((await res.json()).members ?? []);
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Determine current user's role for authorization.
  const currentMember = members.find(m => m.user.email === auth.user?.email);
  const canManage = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const handleChangeRole = async (userId: string, role: string) => {
    const res = await fetchJson(`/api/projects/${projectId}/members/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      toast.error('Failed to update role', { description: res.error });
      return;
    }
    toast.success('Role updated');
    fetchMembers();
  };

  const handleRemove = async (userId: string) => {
    const res = await fetchJson(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to remove member', { description: res.error });
      return;
    }
    toast.success('Member removed');
    fetchMembers();
  };

  const handleAddMember = async (userId: string) => {
    const res = await fetchJson(`/api/projects/${projectId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: 'MEMBER' }),
    });
    if (!res.ok) {
      toast.error('Failed to add member', { description: res.error });
      return;
    }
    toast.success('Member added');
    setShowAddModal(false);
    fetchMembers();
  };

  const tasks = state.tasksByProject[projectId!] ?? [];
  const timeLogs = state.timeLogsByProject[projectId!] ?? [];

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div style={{ padding: '28px', fontFamily: FF, color: COLORS.ink, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={22} color={COLORS.accent} /> Team ({members.length})
        </h1>
        {canManage && (
          <button onClick={() => setShowAddModal(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', background: COLORS.accent,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <UserPlus size={15} /> Add Member
          </button>
        )}
      </div>

      {/* Members list */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${COLORS.line}`, overflow: 'hidden' }}>
        {members.map(m => (
          <div key={m.userId} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderBottom: `1px solid #F3F4F6`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: m.user.avatarColor ?? COLORS.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0,
            }}>
              {m.user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {m.user.name ?? m.user.email}
                {m.user.email === auth.user?.email && <span style={{ fontSize: 12, color: COLORS.gray, marginLeft: 8 }}>(you)</span>}
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>{m.user.email} · {m.user.jobTitle ?? 'Team member'}</div>
            </div>
            {m.role === 'OWNER' ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Crown size={12} /> Owner
              </span>
            ) : canManage && m.user.email !== auth.user?.email ? (
              <>
                <select
                  value={m.role}
                  onChange={e => handleChangeRole(m.userId, e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${COLORS.line}`, fontSize: 13, fontFamily: FF, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <button onClick={() => handleRemove(m.userId)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }} title="Remove">
                  <UserMinus size={16} color="#DC2626" />
                </button>
              </>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#F3F4F6', color: COLORS.gray }}>
                {m.role}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Add member modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', fontFamily: FF }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add workspace member to project</h3>
            <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
              Select a workspace member to add to this project. They will be added as a MEMBER.
            </p>
            {/* Addable = workspace directory minus current project members */}
            {(() => {
              const addable = workspaceMembers.filter(w => !members.some(m => m.user.id === w.user.id));
              if (addable.length === 0) {
                return (
                  <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>
                    Everyone in the workspace already has access, or the directory is still loading. To add new
                    people, invite them from Workspace Settings first.
                  </p>
                );
              }
              return (
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {addable.map(w => (
                    <div key={w.user.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 13.5, color: COLORS.ink }}>
                        {w.user.name ?? w.user.email}
                        <span style={{ color: COLORS.gray, fontSize: 12 }}> · {w.user.email}</span>
                      </span>
                      <button onClick={() => handleAddMember(w.user.id)} style={{ ...btnStyle, width: 'auto', padding: '7px 14px' }}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
            <button onClick={() => setShowAddModal(false)} style={{ ...btnStyle, background: COLORS.line, color: COLORS.ink, marginTop: 16 }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 8, border: 'none', background: COLORS.accent,
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FF, width: '100%',
};

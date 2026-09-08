'use client';

import React from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { COLORS, type Project } from '@/features/flowdeck/model';
import { useViewport } from '../../hooks/useViewport';
import { Avatar } from '../ui/Avatar';
import { Field } from '../ui/Field';
import { selectStyle, FF } from '../ui/styles';
import { useOptionalWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  apiAddProjectMember,
  apiRemoveProjectMember,
  apiUpdateProjectMember,
} from '@/lib/api-client';

/** Server member shape from GET /api/projects/:id/members. */
interface ProjectMember {
  user: { id: string; name: string | null; email: string; avatarColor?: string | null };
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

/** Workspace directory entry from GET /api/workspaces/:id/members. */
interface WorkspaceMember {
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string; avatarColor?: string | null };
}

const ROLES_ABLE_TO_CHANGE: ProjectMember['role'][] = ['MEMBER', 'VIEWER'];

/**
 * Share modal — genuine member management for the project.
 *
 * Replaces the previous false affordance (a fabricated shareable link pointing
 * at a domain that is not this product, a truncated people list, and a
 * View/Edit dropdown mutating only component state). Everything here talks to
 * the real members API:
 *   GET    /api/projects/:id/members          → real access list
 *   PATCH  /api/projects/:id/members/:userId  → change View/Editor role
 *   DELETE /api/projects/:id/members/:userId  → remove member
 *   POST   /api/projects/:id/members          → add a workspace member
 * Server-side capability checks (MANAGE_MEMBERS) are the source of truth —
 * the UI optimistically updates and reverts with an error toast when the
 * server rejects a change.
 */
export function ShareModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { isMobile } = useViewport();
  const workspace = useOptionalWorkspaceContext();

  const [members, setMembers] = React.useState<ProjectMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [candidates, setCandidates] = React.useState<WorkspaceMember[]>([]);
  const [candidateId, setCandidateId] = React.useState('');
  const [candidateAccess, setCandidateAccess] = React.useState<'VIEWER' | 'MEMBER'>('MEMBER');
  const [busy, setBusy] = React.useState(false);

  const loadMembers = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/members`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {
      toast.error('Could not load the people list');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  // Workspace directory (minus existing project members) powers "add member".
  React.useEffect(() => {
    if (!workspace?.selectedWorkspaceId) return;
    (async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspace.selectedWorkspaceId}/members`);
        if (!res.ok) return;
        const data = await res.json();
        setCandidates(data.members ?? []);
      } catch {
        // Directory is an enhancement; the modal still works without it.
      }
    })();
  }, [workspace?.selectedWorkspaceId, members]);

  React.useEffect(() => { loadMembers(); }, [loadMembers]);

  const addable = candidates.filter(
    (c) => !members.some((m) => m.user.id === c.userId),
  );

  function changeAccess(member: ProjectMember, access: 'VIEWER' | 'MEMBER') {
    if (member.role === access) return;
    const snapshot = members;
    setMembers((prev) => prev.map((m) => (m.user.id === member.user.id ? { ...m, role: access } : m)));
    apiUpdateProjectMember(project.id, member.user.id, access).then((res) => {
      if (res.ok) {
        toast.success(`${member.user.name ?? member.user.email} is now ${access === 'VIEWER' ? 'a viewer' : 'an editor'}`);
        return;
      }
      setMembers(snapshot);
      toast.error('Could not change access', { description: res.error });
    });
  }

  function removeMember(member: ProjectMember) {
    const snapshot = members;
    setMembers((prev) => prev.filter((m) => m.user.id !== member.user.id));
    apiRemoveProjectMember(project.id, member.user.id).then((res) => {
      if (res.ok) {
        toast.success(`${member.user.name ?? member.user.email} removed`);
        return;
      }
      setMembers(snapshot);
      toast.error('Could not remove member', { description: res.error });
    });
  }

  async function addMember() {
    const candidate = addable.find((c) => c.userId === candidateId);
    if (!candidate || busy) return;
    setBusy(true);
    const res = await apiAddProjectMember(project.id, candidate.userId, candidateAccess);
    setBusy(false);
    if (!res.ok) {
      toast.error('Could not add member', { description: res.error });
      return;
    }
    toast.success(`${candidate.user.name ?? candidate.user.email} added`);
    setCandidateId('');
    loadMembers();
  }

  const roleLabel = (role: ProjectMember['role']) =>
    role === 'OWNER' ? 'Owner' : role === 'ADMIN' ? 'Admin' : role === 'MEMBER' ? 'Editor' : 'Viewer';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: isMobile ? '20px 20px 0 0' : 16, padding: '20px 20px 28px', width: isMobile ? '100%' : 440, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: FF, fontSize: 18, margin: 0 }}>Share {project.name}</h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <Field label="Add people">
          {addable.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.gray, margin: 0, fontFamily: FF }}>
              Everyone in the workspace already has access.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                style={{ ...selectStyle, flex: 1, fontSize: 13, minHeight: 44 }}
                aria-label="Choose a workspace member"
              >
                <option value="">Choose a person…</option>
                {addable.map((c) => (
                  <option key={c.userId} value={c.userId}>{c.user.name ?? c.user.email}</option>
                ))}
              </select>
              <select
                value={candidateAccess}
                onChange={(e) => setCandidateAccess(e.target.value as 'VIEWER' | 'MEMBER')}
                style={{ ...selectStyle, width: 'auto', fontSize: 13, padding: '8px 10px', minHeight: 44 }}
                aria-label="Access level for the new member"
              >
                <option value="MEMBER">Edit</option>
                <option value="VIEWER">View</option>
              </select>
              <button
                onClick={addMember}
                disabled={!candidateId || busy}
                style={{ background: !candidateId || busy ? COLORS.line : COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10, padding: '0 14px', fontSize: 13, fontWeight: 700, cursor: !candidateId || busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: FF, whiteSpace: 'nowrap', minHeight: 44 }}
              >
                <UserPlus size={14} /> Add
              </button>
            </div>
          )}
        </Field>

        <Field label="People with access">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading && <p style={{ fontSize: 13, color: COLORS.gray, margin: 0, fontFamily: FF }}>Loading…</p>}
            {!loading && members.length === 0 && (
              <p style={{ fontSize: 13, color: COLORS.gray, margin: 0, fontFamily: FF }}>No members yet.</p>
            )}
            {members.map((m) => (
              <div key={m.user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                <Avatar id={m.user.id} size={26} />
                <span style={{ fontSize: 14, flex: 1, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.user.name ?? m.user.email}
                </span>
                {ROLES_ABLE_TO_CHANGE.includes(m.role) ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeAccess(m, e.target.value as 'VIEWER' | 'MEMBER')}
                      style={{ ...selectStyle, width: 'auto', fontSize: 13, padding: '8px 10px' }}
                      aria-label={`Access for ${m.user.name ?? m.user.email}`}
                    >
                      <option value="VIEWER">View</option>
                      <option value="MEMBER">Edit</option>
                    </select>
                    <button
                      onClick={() => removeMember(m)}
                      aria-label={`Remove ${m.user.name ?? m.user.email}`}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6, color: COLORS.gray, display: 'flex' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, padding: '0 6px' }}>{roleLabel(m.role)}</span>
                )}
              </div>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { COLORS, type Project, type MemberInfo } from '@/features/flowdeck/model';
import { Avatar } from '../ui/Avatar';
import { Field } from '../ui/Field';
import { selectStyle, FF } from '../ui/styles';
import { useProjectMembers } from '../ui/MemberDirectory';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { apiUpdateProjectMemberRole } from '@/lib/api-client';
import { toast } from 'sonner';

/**
 * Share modal — real project access management (audit C-03).
 *
 * The previous version fabricated a share URL on a domain that is not this
 * product (every copied link 404'd), kept the View/Edit dropdown in
 * local-only state, and truncated the people list to four entries. All of
 * that was a false affordance: users believed they had shared a project
 * when nothing happened.
 *
 * What it does now:
 *  - lists every project member with their real role (no truncation)
 *  - the View/Edit dropdown PATCHes the member's project role and rolls back
 *    with an honest error toast on failure (server enforces OWNER/ADMIN)
 *  - members without manage rights see read-only labels instead of controls
 *    that would only fail
 *  - there is no share-by-link feature in the product, so no link is shown
 */

/** Dropdown choices offered per member — View/Edit mirror the project roles. */
const ACCESS_OPTIONS = [
  { value: 'VIEWER', label: 'View' },
  { value: 'MEMBER', label: 'Edit' },
] as const;

/** Labels for roles rendered as fixed badges (not changeable here). */
const ROLE_BADGES: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
};

/** Read-only label for member roles when the viewer cannot manage access. */
const ROLE_LABELS: Record<string, string> = {
  VIEWER: 'View',
  MEMBER: 'Edit',
};

export function ShareModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { currentUserId } = useFlowDeck();
  // Real project members — the access list. Falls back to an empty list
  // while the API request is in flight.
  const { members } = useProjectMembers(project.id);

  // Optimistic role overrides keyed by userId. Set on change, kept on
  // success (they match the server's new state) and dropped on failure so
  // the row snaps back to the real role.
  const [roleOverrides, setRoleOverrides] = React.useState<Record<string, string>>({});

  const myRole = members.find(m => m.id === currentUserId)?.projectRole;
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  /** Optimistically change a member's View/Edit access, then PATCH. */
  function changeAccess(member: MemberInfo, role: string) {
    const previous = roleOverrides[member.id] ?? member.projectRole;
    setRoleOverrides(prev => ({ ...prev, [member.id]: role }));
    apiUpdateProjectMemberRole(project.id, member.id, role).then(res => {
      if (res.ok) {
        toast.success('Access updated');
        return;
      }
      setRoleOverrides(prev => {
        const next = { ...prev };
        if (previous === undefined) delete next[member.id];
        else next[member.id] = previous;
        return next;
      });
      toast.error('Could not update access', { description: res.error });
    });
  }

  function accessLabel(member: MemberInfo): string {
    const role = roleOverrides[member.id] ?? member.projectRole;
    return ROLE_LABELS[role ?? ''] ?? role ?? 'Member';
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 28px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontFamily: FF, fontSize: 18, margin: 0 }}>Share {project.name}</h3>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: COLORS.gray, fontFamily: FF }}>
          Everyone listed below can open this project. Access is managed through project membership.
        </p>
        <Field label="People with access">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.length === 0 && (
              <div style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF, padding: '8px 0' }}>
                Loading access list…
              </div>
            )}
            {members.map(m => {
              const role = roleOverrides[m.id] ?? m.projectRole;
              const badge = ROLE_BADGES[role ?? ''];
              const editable = canManage && !badge && m.id !== currentUserId;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                  <Avatar id={m.id} size={26} />
                  <span style={{ fontSize: 14, flex: 1, fontFamily: FF, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  {badge ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.gray, background: '#F3F4F6', borderRadius: 9999, padding: '5px 12px', fontFamily: FF }}>{badge}</span>
                  ) : editable ? (
                    <select
                      value={role === 'VIEWER' ? 'VIEWER' : 'MEMBER'}
                      onChange={e => changeAccess(m, e.target.value)}
                      aria-label={`Access for ${m.name}`}
                      style={{ ...selectStyle, width: 'auto', fontSize: 13, padding: '8px 10px' }}
                    >
                      {ACCESS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF }}>{accessLabel(m)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
}

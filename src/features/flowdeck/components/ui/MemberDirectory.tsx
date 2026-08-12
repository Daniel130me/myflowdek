'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import type { MemberInfo } from '@/features/flowdeck/model';

/**
 * MemberDirectory — a global registry of every user the current session has
 * encountered across all open projects.
 *
 * The directory is a thin React context over the store's `membersById` map.
 * `useProjectMembers(projectId)` fetches `GET /api/projects/:id/members` and
 * merges the results into the store via `registerMembers`; the directory's
 * `lookup(id)` helper then resolves any user id → `{ name, color, role }`
 * for avatar rendering, activity-log labels, and @mention autocomplete.
 *
 * Why a context (and not just direct store reads)? Two reasons:
 *   1. Decouples presentational components from the store so they can be
 *      reused in tests / stories without a full FlowdekDataProvider.
 *   2. Lets a future phase swap the implementation (e.g. fetch all
 *      workspace members up front, or push updates over a websocket)
 *      without touching call sites.
 *
 * For components rendered outside the provider tree, `useMemberDirectory`
 * falls back to a direct store read so existing call sites keep working.
 */

interface MemberDirectoryValue {
  /** The full `userId → MemberInfo` map. */
  members: Record<string, MemberInfo>;
  /** Resolve a single user id. Returns `undefined` if not yet registered. */
  lookup: (id: string) => MemberInfo | undefined;
  /** Convenience: list of all registered members (insertion order not guaranteed). */
  list: MemberInfo[];
}

const MemberDirectoryContext = createContext<MemberDirectoryValue | null>(null);

export function MemberDirectoryProvider({ children }: { children: React.ReactNode }) {
  const { membersById } = useFlowDeck();
  const lookup = useCallback((id: string) => membersById[id], [membersById]);
  const list = useCallback(() => Object.values(membersById), [membersById]);
  // Re-create the value object only when the underlying map reference
  // changes — `membersById` is replaced wholesale on every registerMembers
  // call that actually mutated state (see store), so this is correct.
  const value: MemberDirectoryValue = React.useMemo(
    () => ({ members: membersById, lookup, list: list() }),
    [membersById, lookup, list],
  );
  return (
    <MemberDirectoryContext.Provider value={value}>
      {children}
    </MemberDirectoryContext.Provider>
  );
}

/**
 * Read the global member directory. Falls back to a direct store read when
 * called outside a `MemberDirectoryProvider` (e.g. in legacy layouts or
 * tests) so existing call sites don't have to be rewired all at once.
 */
export function useMemberDirectory(): MemberDirectoryValue {
  const ctx = useContext(MemberDirectoryContext);
  const store = useFlowDeck();
  const lookup = useCallback((id: string) => store.membersById[id], [store.membersById]);
  if (ctx) return ctx;
  return {
    members: store.membersById,
    lookup,
    list: Object.values(store.membersById),
  };
}

/* --------------------------- useProjectMembers --------------------------- */

/** Shape returned by GET /api/projects/:id/members. */
interface ApiProjectMember {
  userId: string;
  role: string;
  isFavorite: boolean;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarColor: string | null;
    jobTitle: string | null;
  };
}

function mapMember(api: ApiProjectMember): MemberInfo {
  return {
    id: api.user.id,
    name: api.user.name ?? api.user.email,
    role: api.user.jobTitle ?? undefined,
    color: api.user.avatarColor ?? undefined,
  };
}

/**
 * Fetch the member list for a single project and register every member
 * into the global directory (so Avatars, @mention autocomplete, and the
 * store's name-resolution paths all see real member data).
 *
 * Returns the project-scoped list for components that need to render a
 * picker/select (e.g. the assignee dropdown in the BulkActionBar).
 */
export function useProjectMembers(projectId: string | null) {
  const { registerMembers } = useFlowDeck();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/members`);
        if (!res.ok) throw new Error('Failed to load members');
        const data = await res.json();
        const mapped = (data.members ?? []).map(mapMember);
        if (cancelled) return;
        setMembers(mapped);
        // Register into the global directory so Avatar/lookup see real data.
        registerMembers(mapped);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, registerMembers]);

  return { members, loading, error };
}

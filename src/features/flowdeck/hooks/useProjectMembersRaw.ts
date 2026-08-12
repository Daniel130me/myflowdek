'use client';

import { useState, useEffect, useCallback } from 'react';

/** Shape returned by GET /api/projects/:id/members. */
interface ApiProjectMember {
  userId: string;
  role: string;
  isFavorite: boolean;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatarColor: string | null;
    jobTitle: string | null;
  };
}

/**
 * Hook that fetches project members from the API.
 *
 * Returns the raw list of `{ userId, role }` records (the project dashboard
 * only needs the user ids so the existing `project.members` field keeps
 * working). Use `useProjectMembers` to sync the id list into the store.
 */
export function useProjectMembersRaw(projectId: string | null) {
  const [members, setMembers] = useState<ApiProjectMember[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) return;
      const data = await res.json();
      setMembers((data.members ?? []) as ApiProjectMember[]);
    } catch {
      // Network error — leave members empty.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { members, loading, refetch };
}

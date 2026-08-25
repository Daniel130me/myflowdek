'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tag } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id/tags. */
interface ApiTag {
  id: string;
  name: string;
  color: string;
}

/** Map the API tag shape to the frontend Tag type. */
function mapTag(api: ApiTag): Tag {
  return { id: api.id, name: api.name, color: api.color };
}

/**
 * Hook that fetches tags for a project from the API.
 * Returns `{ tags, loading, refetch, createTag }`.
 */
export function useTags(projectId: string | null) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tags`);
      if (!res.ok) return;
      const data = await res.json();
      setTags((data.tags ?? []).map(mapTag));
    } catch {
      // Network error — leave tags empty.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createTag = useCallback(
    async (input: { name: string; color?: string }) => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const mapped = mapTag(data.tag as ApiTag);
      setTags((prev) => [...prev, mapped]);
      return mapped;
    },
    [projectId],
  );

  return { tags, loading, refetch, createTag };
}

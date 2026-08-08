'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Comment } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id/comments. */
interface ApiComment {
  id: string;
  taskId: string;
  authorId: string | null;
  text: string;
  createdAt: string;
  author?: { id: string; name: string | null; email: string; avatarColor: string | null };
}

/** Map the API comment shape to the frontend Comment type. */
function mapComment(api: ApiComment): Comment {
  return {
    id: api.id,
    taskId: api.taskId,
    authorId: api.authorId ?? '',
    text: api.text,
    createdAt: api.createdAt,
  };
}

/**
 * Hook that fetches comments for a project from the API.
 * Returns `{ comments, loading, refetch, addComment }`.
 */
export function useComments(projectId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments((data.comments ?? []).map(mapComment));
    } catch {
      // Network error — leave comments empty.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Add a comment via the API and update the local list. */
  const addComment = useCallback(
    async (input: { taskId: string; text: string }) => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const mapped = mapComment(data.comment as ApiComment);
      setComments((prev) => [...prev, mapped]);
      return mapped;
    },
    [projectId],
  );

  return { comments, loading, refetch, addComment };
}

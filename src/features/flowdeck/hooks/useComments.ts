'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Comment, FileItem, Reaction } from '@/features/flowdeck/model';

/**
 * Shape returned by GET /api/projects/:id/comments.
 *
 * Phase 9-10 (item 55): the server nests replies under their parent comment
 * via the `replies` field. We flatten the tree into a single list (preserving
 * `parentId` on every reply) so the existing CommentsSection — which expects
 * a flat array of comments with optional `parentId` — keeps working.
 */
interface ApiReaction {
  emoji: string;
  user: { id: string; name: string | null; email: string; avatarColor: string | null };
}

interface ApiComment {
  id: string;
  taskId: string;
  projectId?: string;
  authorId: string | null;
  text: string;
  createdAt: string;
  /** Set when the comment has been edited. */
  editedAt?: string | null;
  /** Parent comment id for threaded replies. */
  parentId?: string | null;
  author?: { id: string; name: string | null; email: string; avatarColor: string | null };
  /** Reactions on this comment. */
  reactions?: ApiReaction[];
  /** Nested replies — only present on top-level comments. */
  replies?: ApiComment[];
  attachments?: Array<{ file: ApiFile }>;
}

interface ApiFile {
  id: string;
  projectId?: string;
  taskId?: string | null;
  name: string;
  size: number;
  mimeType?: string | null;
  storageProvider?: FileItem['storageProvider'];
  providerWebUrl?: string | null;
  uploadedById?: string | null;
  uploadedAt: string;
  url?: string | null;
  thumbnailUrl?: string | null;
}

function mapFile(file: ApiFile): FileItem {
  return {
    id: file.id,
    projectId: file.projectId,
    name: file.name,
    size: file.size,
    uploadedBy: file.uploadedById ?? '',
    uploadedAt: file.uploadedAt,
    linkedTaskId: file.taskId ?? null,
    url: file.providerWebUrl ?? file.url ?? undefined,
    thumbnailUrl: file.thumbnailUrl ?? undefined,
    storageProvider: file.storageProvider ?? null,
    providerWebUrl: file.providerWebUrl ?? null,
    mimeType: file.mimeType ?? null,
  };
}

/**
 * Reduce the server's per-user reaction rows into the frontend's grouped
 * `{ emoji, userIds[] }` shape.
 */
function groupReactions(reactions: ApiReaction[] | undefined): Reaction[] {
  if (!reactions || reactions.length === 0) return [];
  const byEmoji = new Map<string, string[]>();
  for (const r of reactions) {
    if (!r.user?.id) continue;
    const list = byEmoji.get(r.emoji) ?? [];
    list.push(r.user.id);
    byEmoji.set(r.emoji, list);
  }
  return Array.from(byEmoji.entries()).map(([emoji, userIds]) => ({ emoji, userIds }));
}

/**
 * Map a single API comment to the frontend `Comment` type. Preserves
 * `parentId`, the `edited` flag (derived from `editedAt`), and grouped
 * reactions (item 55).
 */
function mapComment(api: ApiComment): Comment {
  return {
    id: api.id,
    taskId: api.taskId,
    authorId: api.authorId ?? '',
    text: api.text,
    createdAt: api.createdAt,
    edited: Boolean(api.editedAt),
    parentId: api.parentId ?? null,
    reactions: groupReactions(api.reactions),
    attachments: (api.attachments ?? []).map(attachment => mapFile(attachment.file)),
  };
}

/**
 * Flatten the server's nested-replies tree into a single list. Each reply
 * keeps its `parentId` so the UI can still render threads via parentId
 * lookups instead of walking a tree.
 */
function flattenComments(roots: ApiComment[]): Comment[] {
  const out: Comment[] = [];
  const walk = (nodes: ApiComment[]) => {
    for (const node of nodes) {
      out.push(mapComment(node));
      if (node.replies && node.replies.length > 0) {
        walk(node.replies);
      }
    }
  };
  walk(roots);
  return out;
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
      // Flatten nested replies so the store keeps a single flat list with
      // parentId links — the existing CommentsSection already renders
      // threads from parentId, so this preserves its behaviour while
      // surfacing reactions + editedAt + parentId (item 55).
      const flattened = flattenComments((data.comments ?? []) as ApiComment[]);
      setComments(flattened);
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
    async (input: { taskId: string; text: string; parentId?: string | null; fileIds?: string[] }) => {
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

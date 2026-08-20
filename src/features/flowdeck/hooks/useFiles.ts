'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FileItem } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id/files. */
interface ApiFile {
  id: string;
  projectId: string;
  taskId: string | null;
  name: string;
  size: number;
  uploadedById: string | null;
  uploadedAt: string;
  url: string | null;
  thumbnailUrl: string | null;
  storageProvider: 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | null;
  providerWebUrl: string | null;
  mimeType: string | null;
}

/**
 * Map the API file shape to the frontend FileItem type.
 *
 * For connected-provider files (Google Drive, etc.), the URL is the
 * provider's direct web URL (e.g. Google Drive webViewLink) — NOT
 * `/api/files/:id/download`. The download endpoint returns metadata JSON
 * for connected files (not file bytes), so it must never be used as an
 * iframe src or file URL.
 *
 * For legacy R2/local files, the URL is whatever was stored in `api.url`.
 */
function mapFile(api: ApiFile): FileItem {
  return {
    id: api.id,
    projectId: api.projectId,
    name: api.name,
    size: api.size,
    uploadedBy: api.uploadedById ?? '',
    uploadedAt: api.uploadedAt,
    linkedTaskId: api.taskId,
    // Connected-provider files use the provider's direct URL.
    // Legacy/local files use the stored URL.
    url: api.providerWebUrl ?? api.url ?? undefined,
    thumbnailUrl: api.thumbnailUrl ?? undefined,
    storageProvider: api.storageProvider ?? null,
    providerWebUrl: api.providerWebUrl ?? null,
    mimeType: api.mimeType ?? null,
  };
}

/**
 * Hook that fetches files for a project from the API.
 * Returns `{ files, loading, refetch, createFile }`.
 */
export function useFiles(projectId: string | null) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (!res.ok) return;
      const data = await res.json();
      setFiles((data.files ?? []).map(mapFile));
    } catch {
      // Network error — leave files empty.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Create a file record via the API and update the local list. */
  const createFile = useCallback(
    async (input: { name: string; size?: number; taskId?: string; url?: string; thumbnailUrl?: string }) => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const mapped = mapFile(data.file as ApiFile);
      setFiles((prev) => [...prev, mapped]);
      return mapped;
    },
    [projectId],
  );

  return { files, loading, refetch, createFile };
}

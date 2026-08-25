'use client';

import { useState, useEffect } from 'react';
import type { Project } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id. */
interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  startDate: string | null;
  endDate: string | null;
  isArchived: boolean;
  ownerId: string;
  workspaceId: string;
  _count: { members: number; tasks: number };
}

/** Map the API project shape to the frontend Project type. */
function mapProject(api: ApiProject): Project {
  return {
    id: api.id,
    name: api.name,
    color: api.color,
    start: api.startDate ?? '',
    end: api.endDate ?? '',
    description: api.description ?? undefined,
    isArchived: api.isArchived,
  };
}

/**
 * Hook that fetches a single project from the API.
 *
 * Returns `{ project, loading, error }`. Re-fetches when `projectId` changes.
 */
export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  // A hard refresh starts with an empty client store. Mark the request as
  // loading immediately so pages do not call notFound() before the effect's
  // first API request has started.
  const [loading, setLoading] = useState(Boolean(projectId));
  const [requestedProjectId, setRequestedProjectId] = useState<string | null>(projectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setRequestedProjectId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setRequestedProjectId(projectId);
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Project not found');
          if (res.status === 403) throw new Error('Access denied');
          throw new Error('Failed to load project');
        }
        const data = await res.json();
        if (!cancelled) setProject(mapProject(data.project as ApiProject));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // During a project-to-project route change, the effect has not run yet but
  // the requested ID has changed. Keep the page in its loading state for that
  // render rather than briefly treating the new project as missing.
  return {
    project,
    loading: Boolean(projectId) && (loading || requestedProjectId !== projectId),
    error,
  };
}

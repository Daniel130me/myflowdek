'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project } from '@/features/flowdeck/model';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import {
  apiArchiveProject,
  apiDeleteProject,
  apiRestoreProject,
  apiSetProjectFavorite,
} from '@/lib/api-client';

/** Shape returned by GET /api/workspaces/:id/projects. */
export interface ApiProject {
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
  role: string;
  isFavorite: boolean;
  members?: string[];
  portfolio?: NonNullable<Project['portfolio']>;
}

/** Map the API project shape to the frontend Project type. */
export function mapProject(api: ApiProject): Project {
  return {
    id: api.id,
    name: api.name,
    color: api.color,
    start: api.startDate ?? '',
    end: api.endDate ?? '',
    description: api.description ?? undefined,
    isFavorite: api.isFavorite,
    isArchived: api.isArchived,
    members: api.members ?? [],
    portfolio: api.portfolio,
  };
}

/**
 * Hook that fetches projects for a workspace from the API and syncs the
 * results into the shared Zustand store (`syncProjects`).
 *
 * Phase 8 (item 26): every consumer reads projects from the store, so the
 * sidebar/portfolio/task-detail panels all stay in sync. Returns a local
 * `projects` copy too, for callers that still read directly (e.g. the
 * portfolio page).
 */
export function useProjects(workspaceId: string | null) {
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { syncProjects, upsertProject, removeProjectFromCache } = useFlowDeck();

  const refetch = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects?includeArchived=true`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      const mapped: Record<string, Project> = {};
      for (const p of (data.projects ?? []) as ApiProject[]) {
        mapped[p.id] = mapProject(p);
      }
      setProjects(mapped);
      // Sync the API results into the shared store so every consumer (sidebar,
      // portfolio, project layout) sees real data instead of the mock seed.
      syncProjects(workspaceId, mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, syncProjects]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Create a new project via the API and add it to the local + shared store. */
  const createProject = useCallback(
    async (input: { name: string; description?: string; color?: string }) => {
      if (!workspaceId) return null;
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create project');
      }
      const data = await res.json();
      const mapped = mapProject(data.project as ApiProject);
      setProjects((prev) => ({ ...prev, [mapped.id]: mapped }));
      upsertProject(mapped);
      return mapped;
    },
    [workspaceId, upsertProject],
  );

  const patchCachedProject = useCallback((projectId: string, patch: Partial<Project>) => {
    const current = projects[projectId];
    if (!current) return;
    const next = { ...current, ...patch };
    setProjects((previous) => ({ ...previous, [projectId]: next }));
    upsertProject(next);
  }, [projects, upsertProject]);

  const deleteProject = useCallback(async (projectId: string) => {
    const result = await apiDeleteProject(projectId);
    if (!result.ok) throw new Error(result.error ?? 'Failed to delete project');
    setProjects((previous) => {
      const next = { ...previous };
      delete next[projectId];
      return next;
    });
    removeProjectFromCache(projectId);
  }, [removeProjectFromCache]);

  const setFavorite = useCallback(async (projectId: string, favorite: boolean) => {
    const result = await apiSetProjectFavorite(projectId, favorite);
    if (!result.ok) throw new Error(result.error ?? 'Failed to update favorite');
    patchCachedProject(projectId, { isFavorite: favorite });
  }, [patchCachedProject]);

  const archiveProject = useCallback(async (projectId: string) => {
    const result = await apiArchiveProject(projectId);
    if (!result.ok) throw new Error(result.error ?? 'Failed to archive project');
    patchCachedProject(projectId, { isArchived: true });
  }, [patchCachedProject]);

  const restoreProject = useCallback(async (projectId: string) => {
    const result = await apiRestoreProject(projectId);
    if (!result.ok) throw new Error(result.error ?? 'Failed to restore project');
    patchCachedProject(projectId, { isArchived: false });
  }, [patchCachedProject]);

  return {
    projects,
    loading,
    error,
    refetch,
    createProject,
    deleteProject,
    setFavorite,
    archiveProject,
    restoreProject,
  };
}

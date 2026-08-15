'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Project } from '@/features/flowdeck/model';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

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
  const { syncProjects, upsertProject } = useFlowDeck();

  const refetch = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`);
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

  return { projects, loading, error, refetch, createProject };
}

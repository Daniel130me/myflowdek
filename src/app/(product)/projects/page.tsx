'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortfolioView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useProjects } from '@/features/flowdeck/hooks/useProjects';
import { routes } from '@/shared/navigation/routes';
import { toast } from 'sonner';

/**
 * Projects portfolio page — backed by the real API.
 *
 * Fetches projects from GET /api/workspaces/:id/projects (filtered to the
 * selected workspace) and creates via POST. Task counts come from the mock
 * store until the task backend is wired in a later phase.
 */
export default function ProjectsPortfolioPage() {
  const router = useRouter();
  const state = useFlowDeck();
  const wsHook = useWorkspaces();
  const {
    projects,
    loading,
    createProject,
    deleteProject,
    setFavorite,
    archiveProject,
    restoreProject,
  } = useProjects(wsHook.selectedWorkspaceId);
  const [creating, setCreating] = useState(false);

  /** Open a project — set it as active and navigate to its overview. */
  const handleOpen = (id: string) => {
    state.openProject(id);
    router.push(routes.projectOverview(id));
  };

  /** Create a new project via the API, then navigate to it. */
  const handleNew = async () => {
    if (!wsHook.selectedWorkspaceId) return;
    setCreating(true);
    try {
      const project = await createProject({
        name: 'Untitled Project',
        color: '#FE8029',
      });
      if (project) {
        toast.success('Project created');
        router.push(routes.projectOverview(project.id));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
        Loading projects…
      </div>
    );
  }

  return (
    <PortfolioView
      projects={projects}
      searchQuery={state.searchQuery}
      onOpen={handleOpen}
      onDelete={async (id) => {
        const project = projects[id];
        if (!project || !confirm(`Delete ${project.name} permanently?`)) return;
        try {
          await deleteProject(id);
          toast.success('Project deleted');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to delete project');
        }
      }}
      onNew={handleNew}
      onToggleFavorite={async (id) => {
        try {
          await setFavorite(id, !projects[id]?.isFavorite);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to update favorite');
        }
      }}
      onArchive={async (id) => {
        try {
          await archiveProject(id);
          toast.success('Project archived');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to archive project');
        }
      }}
      onRestore={async (id) => {
        try {
          await restoreProject(id);
          toast.success('Project restored');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to restore project');
        }
      }}
    />
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortfolioView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useProjects } from '@/features/flowdeck/hooks/useProjects';
import { AlertTriangle, X } from 'lucide-react';
import { COLORS, type Project } from '@/features/flowdeck/model';
import { routes } from '@/shared/navigation/routes';
import { toast } from 'sonner';
import { ProjectListSkeleton } from '@/components/ui/skeleton';

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
    loading,
    deleteProject,
    setFavorite,
    archiveProject,
    restoreProject,
    projects: workspaceProjects,
  } = useProjects(wsHook.selectedWorkspaceId);
  const projects = workspaceProjects;
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Open a project — set it as active and navigate to its overview. */
  const handleOpen = (id: string) => {
    state.openProject(id);
    router.push(routes.projectOverview(id));
  };

  /** Open the project creation modal, including the template picker. */
  const handleNew = () => router.push(routes.newProject());

  const handleDelete = async () => {
    if (!projectToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      toast.success('Project deleted');
      setProjectToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <ProjectListSkeleton />;
  }

  return (
    <>
      <PortfolioView
        projects={projects}
        searchQuery={state.searchQuery}
        onOpen={handleOpen}
        onDelete={(id) => setProjectToDelete(projects[id] ?? null)}
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
      {projectToDelete && (
      <div role="dialog" aria-modal="true" aria-labelledby="delete-project-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div onClick={() => !deleting && setProjectToDelete(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', width: 'min(420px, 100%)', background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          <button onClick={() => setProjectToDelete(null)} disabled={deleting} title="Close" aria-label="Close" style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'none', color: COLORS.gray, cursor: deleting ? 'not-allowed' : 'pointer', padding: 4 }}><X size={18} /></button>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: COLORS.redSoft, color: COLORS.red, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><AlertTriangle size={20} /></div>
          <h2 id="delete-project-title" style={{ margin: '0 36px 8px 0', fontSize: 18, fontWeight: 700, color: COLORS.ink }}>Delete project?</h2>
          <p style={{ margin: '0 0 22px', color: COLORS.gray, fontSize: 13.5, lineHeight: 1.5 }}>“{projectToDelete.name}” will be permanently deleted along with its tasks, files, and activity history. This action cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setProjectToDelete(null)} disabled={deleting} style={{ border: `1px solid ${COLORS.line}`, background: '#FFFFFF', color: COLORS.gray, cursor: deleting ? 'not-allowed' : 'pointer', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{ border: 'none', background: deleting ? COLORS.line : COLORS.red, color: '#FFFFFF', cursor: deleting ? 'wait' : 'pointer', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>{deleting ? 'Deleting…' : 'Delete project'}</button>
          </div>
        </div>
      </div>
      )}
    </>
  );
}

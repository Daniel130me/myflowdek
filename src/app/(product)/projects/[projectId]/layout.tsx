'use client';

import React, { useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProject } from '@/features/flowdeck/hooks/useProject';
import { useProjectCustomFields } from '@/features/flowdeck/hooks/useProjectCustomFields';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';

/**
 * Project-scoped layout.
 *
 * Phase 8 (item 27): we no longer call `notFound()` when the project isn't in
 * local state — that was a leftover from the mock-only era and broke direct
 * navigation (e.g. opening a project URL from an email). Instead we fetch the
 * project from the API via `useProject(projectId)`, upsert it into the store,
 * and only call `notFound()` on a real API 404/403.
 *
 * Item 4: hydrate the project's custom-field definitions from the server on
 * layout mount so the Sheet view / TaskDetailPanel custom-field controls have
 * canonical server-side ids (required for value persistence).
 */
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : Array.isArray(params.projectId) ? params.projectId[0] : '';
  const state = useFlowDeck();
  const { project, loading, error } = useProject(projectId || null);
  useProjectCustomFields(projectId || null);

  const projectExistsInStore = Boolean(projectId && state.projects[projectId]);

  const {
    currentProjectId,
    syncProjectFromRoute,
    upsertProject,
  } = state;

  // When the API returns a real project, upsert it into the store so the
  // sidebar / panels render real data instead of the mock seed.
  useEffect(() => {
    if (projectId && project) {
      upsertProject(project);
    }
  }, [projectId, project, upsertProject]);

  useEffect(() => {
    if (
      (projectExistsInStore || project) &&
      currentProjectId !== projectId
    ) {
      syncProjectFromRoute(projectId);
    }
  }, [
    projectId,
    projectExistsInStore,
    project,
    currentProjectId,
    syncProjectFromRoute,
  ]);

  // Real API 404 ("Project not found") or 403 ("Access denied") → notFound().
  // We treat a 401 the same way (the (product) layout will redirect to login).
  if (projectId && !loading && error && /not found|access denied|404|403/i.test(error)) {
    notFound();
  }

  // While the API is still loading and we don't have a local copy, show a
  // spinner instead of a 404 — direct navigation from external links lands
  // here before the project list has been fetched.
  if (!projectExistsInStore && loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontFamily: FF }}>
        Loading project…
      </div>
    );
  }

  return <>{children}</>;
}

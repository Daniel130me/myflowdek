'use client';

import { useCallback } from 'react';
import {
  useOptionalWorkspaceContext,
  type WorkspaceSummary,
} from '@/providers/WorkspaceProvider';

// Re-export the workspace summary type so existing imports keep working.
export type { WorkspaceSummary } from '@/providers/WorkspaceProvider';

/**
 * Backward-compatible hook that delegates to the centralized
 * `WorkspaceProvider` context.
 *
 * Phase 8 (item 24-25): the workspace list + selected id now live in a
 * provider so every consumer sees the same state. This hook preserves the
 * old call-site signature (`useWorkspaces()`) and falls back to a no-op
 * context when called outside the provider (e.g. in legacy test code that
 * doesn't wrap with `<WorkspaceProvider>`).
 *
 * Returns `{ workspaces, loading, selectedWorkspaceId, setSelectedWorkspace,
 * selectedWorkspace }`.
 */
export function useWorkspaces() {
  const ctx = useOptionalWorkspaceContext();

  // Default fallback when used outside the provider (legacy tests, server
  // render of a stray component, etc.). We can't fetch from the API here
  // without duplicating the provider logic, so we expose empty state.
  const setSelectedWorkspace = useCallback((_id: string) => {
    /* no-op outside provider */
  }, []);

  if (!ctx) {
    return {
      workspaces: [] as WorkspaceSummary[],
      loading: false,
      selectedWorkspaceId: null,
      setSelectedWorkspace,
      selectedWorkspace: null,
    };
  }

  return {
    workspaces: ctx.workspaces,
    loading: ctx.loading,
    selectedWorkspaceId: ctx.selectedWorkspaceId,
    setSelectedWorkspace: ctx.setSelectedWorkspace,
    selectedWorkspace: ctx.selectedWorkspace,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';

/** Minimal workspace shape returned by GET /api/workspaces. */
export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  _count: { members: number; projects: number };
}

/** localStorage key for the selected workspace ID. */
const SELECTED_WORKSPACE_KEY = 'flowdeck_selected_workspace';

/**
 * Hook that fetches the authenticated user's workspaces from the API and
 * manages the currently-selected workspace (persisted in localStorage so the
 * user stays in the same workspace across page refreshes).
 *
 * Returns `{ workspaces, loading, selectedWorkspaceId, setSelectedWorkspace,
 * selectedWorkspace }`.
 */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch workspaces on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workspaces');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setWorkspaces(data.workspaces ?? []);

        // Restore the selected workspace from localStorage, or default to
        // the first workspace.
        const stored = localStorage.getItem(SELECTED_WORKSPACE_KEY);
        const isValid = stored && data.workspaces.some((w: WorkspaceSummary) => w.id === stored);
        setSelectedId(isValid ? stored : data.workspaces[0]?.id ?? null);
      } catch {
        // Network error — leave workspaces empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setSelectedWorkspace = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem(SELECTED_WORKSPACE_KEY, id);
  }, []);

  const selectedWorkspace = workspaces.find((w) => w.id === selectedId) ?? null;

  return {
    workspaces,
    loading,
    selectedWorkspaceId: selectedId,
    setSelectedWorkspace,
    selectedWorkspace,
  };
}

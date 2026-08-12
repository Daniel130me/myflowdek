'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
 * Shape exposed by the WorkspaceProvider context. Mirrors the legacy
 * `useWorkspaces()` hook so existing consumers can switch over with no changes.
 */
export interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[];
  loading: boolean;
  selectedWorkspaceId: string | null;
  selectedWorkspace: WorkspaceSummary | null;
  setSelectedWorkspace: (id: string) => void;
  /** Force a refetch from the API (e.g. after creating a workspace). */
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Provider that fetches the authenticated user's workspaces from the API and
 * manages the currently-selected workspace (persisted in localStorage so the
 * user stays in the same workspace across page refreshes).
 *
 * Auto-selects the first workspace if none is selected (or if the stored id
 * is no longer valid — e.g. the user left that workspace).
 */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) {
        setWorkspaces([]);
        return;
      }
      const data = await res.json();
      const list: WorkspaceSummary[] = data.workspaces ?? [];
      setWorkspaces(list);

      // Restore the selected workspace from localStorage, or default to the
      // first workspace. We read localStorage inside this effect (rather than
      // during render) so SSR + hydration stay consistent.
      const stored =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(SELECTED_WORKSPACE_KEY)
          : null;
      const isValid = Boolean(
        stored && list.some((w) => w.id === stored),
      );
      const nextId = isValid ? (stored as string) : (list[0]?.id ?? null);
      setSelectedId((prev) => {
        // Preserve a previously-selected id if it's still valid — this lets
        // us avoid stomping on a user's choice when refetching.
        if (prev && list.some((w) => w.id === prev)) return prev;
        return nextId;
      });
    } catch {
      // Network error — leave workspaces empty.
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const setSelectedWorkspace = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SELECTED_WORKSPACE_KEY, id);
    }
  }, []);

  // Persist the auto-selected id to localStorage so refreshes preserve it.
  useEffect(() => {
    if (selectedId && typeof window !== 'undefined') {
      window.localStorage.setItem(SELECTED_WORKSPACE_KEY, selectedId);
    }
  }, [selectedId]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.id === selectedId) ?? null,
    [workspaces, selectedId],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      loading,
      selectedWorkspaceId: selectedId,
      selectedWorkspace,
      setSelectedWorkspace,
      refetch: fetchWorkspaces,
    }),
    [
      workspaces,
      loading,
      selectedId,
      selectedWorkspace,
      setSelectedWorkspace,
      fetchWorkspaces,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Access the centralized workspace context. Must be used within a
 * `<WorkspaceProvider>`.
 */
export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      'useWorkspaceContext must be used within a WorkspaceProvider',
    );
  }
  return ctx;
}

/** Optional variant — returns null outside the provider (for legacy code). */
export function useOptionalWorkspaceContext(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}

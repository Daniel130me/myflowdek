'use client';

import { useEffect } from 'react';
import { useCustomFields } from './useCustomFields';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches custom-field definitions for a project from the API and
 * syncs them into the Zustand store so all existing custom-column UIs (Sheet
 * view header, TaskDetailPanel custom-fields section, CustomFieldsModal) work
 * with the canonical server-side list.
 *
 * The sync only fires when the API responded successfully — a network error
 * or 404 on a local-only project must NOT wipe locally-defined columns (e.g.
 * columns seeded from a template before the project has been created on the
 * server). Returns `{ loading, refetch }` — the columns themselves are read
 * from the store (`customCols`), which has been populated from the API.
 */
export function useProjectCustomFields(projectId: string | null) {
  const { customFields, loading, ok, refetch } = useCustomFields(projectId);
  const { syncProjectCustomCols } = useFlowDeck();

  useEffect(() => {
    if (projectId && ok) {
      syncProjectCustomCols(projectId, customFields);
    }
  }, [projectId, customFields, ok, syncProjectCustomCols]);

  return { loading, refetch };
}

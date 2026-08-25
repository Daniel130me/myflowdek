'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CustomColumn } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id/custom-fields. */
interface ApiCustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  options?: string[] | null;
}

/**
 * Map the API custom-field shape to the frontend `CustomColumn` type.
 *
 * Carries the server-side `id` so the store can DELETE the definition later
 * (the per-task value endpoint also accepts `key`, but having the id avoids
 * an extra lookup when removing a column).
 */
function mapCustomField(api: ApiCustomField): CustomColumn {
  return {
    id: api.id,
    key: api.key,
    label: api.label,
    type: api.type as CustomColumn['type'],
    ...(api.options && api.options.length > 0 ? { options: api.options } : {}),
  };
}

/**
 * Hook that fetches custom-field definitions for a project from the API.
 * Returns `{ customFields, loading, ok, refetch }`.
 *
 * `ok` distinguishes a successful fetch that returned an empty list (`ok:
 * true, customFields: []`) from a failed fetch (`ok: false, customFields:
 * []`). Callers that sync into a store should only replace local state when
 * `ok === true` — otherwise a network error or a 404 on a local-only project
 * would wipe locally-defined columns (e.g. columns seeded from a template
 * before the project has been created on the server).
 */
export function useCustomFields(projectId: string | null) {
  const [customFields, setCustomFields] = useState<CustomColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/custom-fields`);
      if (!res.ok) {
        setOk(false);
        return;
      }
      const data = await res.json();
      setCustomFields((data.fields ?? []).map(mapCustomField));
      setOk(true);
    } catch {
      setOk(false);
      // Network error — leave fields empty.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { customFields, loading, ok, refetch };
}

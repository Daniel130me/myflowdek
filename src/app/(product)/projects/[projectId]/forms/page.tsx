'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { FormsView } from '@/features/flowdeck/components/views';
import { useForms } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';
import { toast } from 'sonner';
import type { Form, FormSubmission } from '@/features/flowdeck/model';
import { apiUpdateForm, apiListFormSubmissions } from '@/lib/api-client';

export default function ProjectFormsPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  useEffect(() => {
    if (projectId && state.currentProjectId !== projectId) {
      state.syncProjectFromRoute(projectId);
    }
  }, [projectId, state]);

  const { data, loading, refetch } = useForms(projectId);
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);

  useEffect(() => {
    if (data.forms) {
      setForms(
        data.forms.map((f: any) => ({
          id: f.id,
          projectId: f.projectId,
          name: f.name,
          description: f.description ?? '',
          fields: f.fields ?? [],
          isActive: f.isActive,
          createdAt: f.createdAt,
        })),
      );
    }
  }, [data]);

  useEffect(() => {
    if (!projectId || forms.length === 0) {
      setSubmissions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const projectForms = forms.filter((f) => f.projectId === projectId);
      const results = await Promise.all(
        projectForms.map((f) => apiListFormSubmissions(projectId, f.id)),
      );
      if (cancelled) return;
      const all: FormSubmission[] = [];
      for (const r of results) {
        if (!r.ok) continue;
        for (const raw of r.submissions as Array<Record<string, unknown>>) {
          all.push({
            id: raw.id as string,
            formId: raw.formId as string,
            projectId: raw.projectId as string,
            data: (raw.data ?? {}) as Record<string, string>,
            submittedAt: raw.submittedAt as string,
            submittedBy: (raw.submittedBy as string) ?? undefined,
            convertedTaskId: (raw.convertedTaskId as string) ?? undefined,
          });
        }
      }
      setSubmissions(all);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, forms]);

  const handleAdd = useCallback(
    async (form: Form) => {
      if (!projectId) return;
      try {
        const res = await fetch(`/api/projects/${projectId}/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            fields: form.fields,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success('Form created');
        refetch();
      } catch {
        toast.error('Failed to create form');
      }
    },
    [projectId, refetch],
  );

  const handleUpdate = useCallback(
    async (id: string, patch: Partial<Form>) => {
      if (!projectId) return;
      const res = await apiUpdateForm(projectId, id, patch as Record<string, unknown>);
      if (res.ok) {
        refetch();
      } else {
        toast.error(res.error ?? 'Failed to update form');
      }
    },
    [projectId, refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!projectId) return;
      try {
        await fetch(`/api/projects/${projectId}/forms/${id}`, { method: 'DELETE' });
        toast.success('Form deleted');
        refetch();
      } catch {
        toast.error('Failed to delete form');
      }
    },
    [projectId, refetch],
  );

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading forms…</div>;

  return (
    <FormsView
      forms={forms}
      submissions={submissions}
      projects={state.projects}
      currentProjectId={projectId}
      onAddForm={handleAdd}
      onUpdateForm={handleUpdate}
      onDeleteForm={handleDelete}
    />
  );
}

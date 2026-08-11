'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FormsView } from '@/features/flowdeck/components/views';
import { useForms } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { toast } from 'sonner';
import type { Form, FormSubmission } from '@/features/flowdeck/model';

export default function FormsRoutePage() {
  const state = useFlowDeck();
  const projectId = state.currentProjectId;
  const { data, loading, refetch } = useForms(projectId);
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);

  useEffect(() => {
    if (data.forms) {
      setForms(data.forms.map((f: any) => ({
        id: f.id, projectId: f.projectId, name: f.name,
        description: f.description ?? '', fields: f.fields ?? [],
        isActive: f.isActive, createdAt: f.createdAt,
      })));
    }
  }, [data]);

  const handleAddForm = useCallback(async (form: Partial<Form>) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/forms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, fields: form.fields ?? [] }),
      });
      if (!res.ok) throw new Error();
      toast.success('Form created');
      refetch();
    } catch { toast.error('Failed to create form'); }
  }, [projectId, refetch]);

  const handleDeleteForm = useCallback(async (id: string) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/forms/${id}`, { method: 'DELETE' });
      toast.success('Form deleted');
      refetch();
    } catch { toast.error('Failed to delete form'); }
  }, [projectId, refetch]);

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Loading forms…</div>;

  return (
    <FormsView
      forms={forms}
      submissions={submissions}
      projects={state.projects}
      currentProjectId={projectId ?? ''}
      onAddForm={handleAddForm as any}
      onUpdateForm={() => {}}
      onDeleteForm={handleDeleteForm}
    />
  );
}

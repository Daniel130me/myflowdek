'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { FilesView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectFiles } from '@/features/flowdeck/hooks/useProjectFiles';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';
import { COLORS, FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { toast } from 'sonner';

interface StorageConnection {
  provider: 'GOOGLE_DRIVE';
  providerEmail: string | null;
}

const providerDetails = {
  GOOGLE_DRIVE: { slug: 'google-drive', label: 'Google Drive' },
} as const;

/** Project files backed exclusively by the uploader's connected cloud account. */
export default function ProjectFilesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const { refetch } = useProjectFiles(projectId);
  useProjectTasks(projectId);
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    fetch('/api/storage/connections')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load connected storage');
        const data = await response.json() as { connections?: StorageConnection[] };
        const available = data.connections ?? [];
        setConnections(available);
        setProvider((current) => current || (available[0] ? providerDetails[available[0].provider].slug : ''));
      })
      .catch(() => toast.error('Could not load connected storage'));
  }, []);

  if (!projectId) notFound();

  const files = state.filesByProject[projectId] ?? [];
  const tasks = state.tasksByProject[projectId] ?? [];

  const handleAdd = useCallback(async (selectedFiles: File[]) => {
    if (!provider) {
      toast.error('Connect a storage provider in Settings before uploading');
      return;
    }
    for (const selectedFile of selectedFiles) {
      try {
        const form = new FormData();
        form.set('provider', provider);
        form.set('file', selectedFile);
        const response = await fetch('/api/projects/' + projectId + '/files/upload', {
          method: 'POST',
          body: form,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? 'Upload failed');
        toast.success('Uploaded ' + selectedFile.name);
      } catch (error) {
        toast.error('Failed to upload ' + selectedFile.name, {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    await refetch();
  }, [projectId, provider, refetch]);

  const handleRemove = useCallback(async (fileId: string) => {
    try {
      const response = await fetch('/api/files/' + fileId, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Delete failed');
      await refetch();
      toast.success('File removed from connected storage');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove file');
    }
  }, [refetch]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontFamily: FF }}>
        <span style={{ fontSize: 12, color: COLORS.gray }}>Save uploads to</span>
        {connections.length > 0 ? (
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            style={{ border: '1px solid ' + COLORS.line, borderRadius: 8, padding: '7px 10px', background: '#fff' }}
          >
            {connections.map((connection) => {
              const details = providerDetails[connection.provider];
              return <option key={connection.provider} value={details.slug}>{details.label} · {connection.providerEmail ?? 'Connected'}</option>;
            })}
          </select>
        ) : (
          <button onClick={() => router.push('/settings')} style={{ border: 0, background: COLORS.accent, color: '#fff', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>
            Connect storage
          </button>
        )}
      </div>
      <FilesView
        files={files}
        tasks={tasks}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onLink={(fileId, linkedTaskId) => state.linkFile(projectId, fileId, linkedTaskId)}
        onViewFile={(fileId) => router.push(routes.file(projectId, fileId))}
      />
    </div>
  );
}

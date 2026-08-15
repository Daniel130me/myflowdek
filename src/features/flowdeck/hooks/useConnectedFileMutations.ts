'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useProjectFiles } from './useProjectFiles';

interface StorageConnection {
  provider: 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX';
}

const providerSlug = {
  GOOGLE_DRIVE: 'google-drive',
  ONEDRIVE: 'onedrive',
  DROPBOX: 'dropbox',
} as const;

/** Provider-backed attachment mutations shared by full and intercepted task views. */
export function useConnectedFileMutations(projectId: string) {
  const { refetch } = useProjectFiles(projectId);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    fetch('/api/storage/connections')
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { connections?: StorageConnection[] };
        const first = data.connections?.[0];
        if (first) setProvider(providerSlug[first.provider]);
      })
      .catch(() => undefined);
  }, []);

  const uploadFiles = useCallback(async (files: File[], taskId: string) => {
    if (!provider) {
      toast.error('Connect a storage provider in Settings before uploading');
      return;
    }
    for (const file of files) {
      try {
        const form = new FormData();
        form.set('provider', provider);
        form.set('taskId', taskId);
        form.set('file', file);
        const response = await fetch('/api/projects/' + projectId + '/files/upload', {
          method: 'POST',
          body: form,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? 'Upload failed');
        toast.success('Uploaded ' + file.name);
      } catch (error) {
        toast.error('Failed to upload ' + file.name, {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    await refetch();
  }, [projectId, provider, refetch]);

  const removeFile = useCallback(async (fileId: string) => {
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

  return { uploadFiles, removeFile };
}

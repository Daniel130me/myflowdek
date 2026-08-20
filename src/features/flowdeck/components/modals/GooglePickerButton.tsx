'use client';

/**
 * Google Picker integration for Flowdek.
 *
 * Loads the Google Picker API script and opens the native Google file
 * selection dialog. This is the correct way to browse a user's full
 * Google Drive while keeping the `drive.file` scope — the Picker grants
 * per-file access, so we never need the restricted `drive` scope.
 *
 * Flow:
 *   1. User clicks "Attach from Google Drive"
 *   2. We fetch picker config from /api/storage/picker/config (client ID,
 *      app ID, access token)
 *   3. We load the Google Picker API script (apis.google.com/js/api.js)
 *   4. We build and open a Picker with Docs, Sheets, Slides, PDFs, images,
 *      and general files views
 *   5. On selection, we extract the file ID and pass it to onFileSelected()
 *   6. The parent component sends the file ID to /api/projects/:id/files/attach
 *      which validates it against Google Drive and persists metadata
 */

import React, { useState, useCallback } from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { COLORS } from '@/features/flowdeck/model';
import { FF } from '../ui/styles';

interface PickerConfig {
  clientId: string;
  appId: string;
  accessToken: string;
  developerKey: string | null;
}

interface SelectedFile {
  providerFileId: string;
  name: string;
  mimeType: string;
}

interface GooglePickerButtonProps {
  projectId: string;
  taskId?: string | null;
  onFileSelected: (file: SelectedFile) => void;
  disabled?: boolean;
}

/** Cache the Picker API script load promise so we only load it once. */
let pickerApiPromise: Promise<void> | null = null;

function loadGooglePickerApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  // The script attaches `gapi` and `google` to the window.
  if ((window as any).google?.picker) return Promise.resolve();
  if (pickerApiPromise) return pickerApiPromise;

  pickerApiPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // `gapi.load('picker')` is the standard way to load the Picker module.
      const gapi = (window as any).gapi;
      if (!gapi?.load) {
        reject(new Error('Google API failed to load'));
        return;
      }
      gapi.load('picker', () => resolve());
    };
    script.onerror = () => reject(new Error('Failed to load Google Picker API'));
    document.head.appendChild(script);
  });

  return pickerApiPromise;
}

export function GooglePickerButton({
  projectId,
  taskId,
  onFileSelected,
  disabled,
}: GooglePickerButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleOpenPicker = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch the picker config (access token + client ID).
      const configRes = await fetch('/api/storage/picker/config');
      if (configRes.status === 409) {
        toast.error('Google Drive is not connected. Connect it in Settings first.');
        return;
      }
      if (!configRes.ok) {
        const data = await configRes.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to open Google Drive picker.');
        return;
      }
      const config: PickerConfig = await configRes.json();

      // 2. Load the Google Picker API script.
      await loadGooglePickerApi();

      // 3. Build and open the Picker.
      // `google.picker` is available after the script + gapi.load('picker').
      const google = (window as any).google;
      if (!google?.picker) {
        toast.error('Google Picker failed to initialize.');
        return;
      }

      const { ViewId, DocsViewMode, PickerBuilder } = google.picker;

      // Create views for different file types so the user can browse all of Drive.
      const docsView = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setMode(DocsViewMode.LIST)
        .setOwnedByMe(true);

      const sharedView = new google.picker.DocsView(ViewId.DOCS)
        .setIncludeFolders(true)
        .setMode(DocsViewMode.LIST)
        .setOwnedByMe(false);

      const builder = new PickerBuilder()
        .setAppId(config.appId)
        .setOAuthToken(config.accessToken)
        .addView(docsView)
        .addView(sharedView)
        .addView(google.picker.ViewId.RECENTLY_PICKED)
        // Enable multi-select — the user can pick multiple files at once.
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setTitle('Select files from Google Drive')
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            // `data.docs` is an array of selected files.
            const docs: Array<{
              id: string;
              name: string;
              mimeType: string;
              url?: string;
              iconUrl?: string;
              sizeBytes?: string;
            }> = data.docs ?? [];
            for (const doc of docs) {
              onFileSelected({
                providerFileId: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
              });
            }
          }
          // Action.CANCEL — user closed the picker without selecting. No-op.
          // We don't toast on cancel — it's a normal user action.
        });

      const picker = builder.build();
      picker.setVisible(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to open Google Picker';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, onFileSelected]);

  return (
    <button
      onClick={handleOpenPicker}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 16px',
        borderRadius: 8,
        border: `1px solid ${COLORS.accent}`,
        background: COLORS.accentSoft,
        color: COLORS.accent,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FF,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.6 : 1,
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
      Attach from Google Drive
    </button>
  );
}

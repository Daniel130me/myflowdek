import type { StorageConnection } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { getValidAccessToken } from '../storage.service';
import type { IFileProviderAdapter, ProviderFileItem, ShareOptions } from './file-provider.interface';

export class GoogleDriveProviderAdapter implements IFileProviderAdapter {
  readonly provider = 'GOOGLE_DRIVE' as const;

  /**
   * List files from Google Drive.
   *
   * NOTE: With the `drive.file` scope (which Flowdek uses for security),
   * this endpoint only returns files the user has explicitly granted the
   * app access to — typically files selected via the Google Picker.
   * For newly connected accounts, this returns an empty list.
   *
   * The Google Picker (not this method) is the correct entry point for
   * browsing the full Drive. This method is kept for providers where
   * server-side listing is appropriate (OneDrive, Dropbox), and as a
   * fallback for already-granted files.
   */
  async listFiles(connection: StorageConnection, query?: string): Promise<ProviderFileItem[]> {
    const token = await getValidAccessToken(connection);
    const searchParams = new URLSearchParams({
      pageSize: '50',
      fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, owners, modifiedTime, trashed)',
      orderBy: 'modifiedTime desc',
    });

    let q = 'trashed = false';
    if (query && query.trim()) {
      const safeQuery = query.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      q += ` and name contains '${safeQuery}'`;
    }
    searchParams.set('q', q);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      throw new AuthError('Google Drive connection expired or access revoked. Please reconnect in Settings.', 403);
    }
    if (!res.ok) {
      throw new AuthError('Failed to fetch files from Google Drive.', 502);
    }

    const data = (await res.json()) as {
      files?: Array<{
        id: string;
        name: string;
        mimeType?: string;
        size?: string;
        webViewLink?: string;
        thumbnailLink?: string;
        owners?: Array<{ emailAddress?: string }>;
        modifiedTime?: string;
        trashed?: boolean;
      }>;
    };

    return (data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType ?? 'application/octet-stream',
      size: f.size ? parseInt(f.size, 10) : 0,
      webUrl: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
      thumbnailUrl: f.thumbnailLink ?? undefined,
      ownerEmail: f.owners?.[0]?.emailAddress ?? undefined,
      modifiedAt: f.modifiedTime ?? undefined,
    }));
  }

  async getFileMetadata(connection: StorageConnection, providerFileId: string): Promise<ProviderFileItem> {
    const token = await getValidAccessToken(connection);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(providerFileId)}?fields=id,name,mimeType,size,webViewLink,thumbnailLink,owners,modifiedTime,trashed`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // 404 — the file was deleted from Google Drive, or the file ID is invalid.
    if (res.status === 404) {
      throw new AuthError('File was deleted or not found in Google Drive.', 404);
    }
    // 401 — the access token is expired or invalid. The storage service should
    // refresh it, but if we still get 401 the token was revoked.
    if (res.status === 401) {
      throw new AuthError(
        'Google Drive access token has expired or been revoked. Please reconnect in Settings.',
        401,
      );
    }
    // 403 — the user revoked Drive permission for this app, or the file owner
    // removed the user's access. These are distinct from 401 (token issue).
    if (res.status === 403) {
      // Try to get a more specific error message from Google's response.
      const errBody = await res.json().catch(() => ({}));
      const errMessage = errBody?.error?.message ?? '';
      if (errMessage.includes('insufficientFilePermission') || errMessage.includes('cannot be accessed')) {
        throw new AuthError(
          'The file owner has removed your access, or the app does not have permission to view this file.',
          403,
        );
      }
      throw new AuthError(
        'Access denied by Google Drive. The app may have been revoked permission. Please reconnect in Settings.',
        403,
      );
    }
    if (!res.ok) {
      throw new AuthError('Unable to verify file in Google Drive.', 502);
    }

    const f = (await res.json()) as {
      id: string;
      name: string;
      mimeType?: string;
      size?: string;
      webViewLink?: string;
      thumbnailLink?: string;
      owners?: Array<{ emailAddress?: string }>;
      modifiedTime?: string;
      trashed?: boolean;
    };

    // Even if the API returns 200, the file might be in the trash.
    if (f.trashed) {
      throw new AuthError('File has been moved to trash in Google Drive.', 404);
    }

    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType ?? 'application/octet-stream',
      size: f.size ? parseInt(f.size, 10) : 0,
      webUrl: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
      thumbnailUrl: f.thumbnailLink ?? undefined,
      ownerEmail: f.owners?.[0]?.emailAddress ?? undefined,
      modifiedAt: f.modifiedTime ?? undefined,
    };
  }

  async shareFile(connection: StorageConnection, providerFileId: string, options: ShareOptions): Promise<void> {
    const token = await getValidAccessToken(connection);
    const role = options.role === 'writer' ? 'writer' : 'reader';

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(providerFileId)}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          type: 'user',
          emailAddress: options.email,
        }),
      },
    );

    if (res.status === 403) {
      throw new AuthError('You do not have permission to share this file in Google Drive.', 403);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new AuthError(err.error?.message ?? 'Failed to share file in Google Drive.', 502);
    }
  }

  async getDirectUrl(connection: StorageConnection, providerFileId: string): Promise<string> {
    const meta = await this.getFileMetadata(connection, providerFileId);
    return meta.webUrl ?? `https://drive.google.com/file/d/${providerFileId}/view`;
  }
}

export const googleDriveProviderAdapter = new GoogleDriveProviderAdapter();

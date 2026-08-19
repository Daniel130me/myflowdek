import type { StorageConnection } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { getValidAccessToken } from '../storage.service';
import type { IFileProviderAdapter, ProviderFileItem, ShareOptions } from './file-provider.interface';

export class OneDriveProviderAdapter implements IFileProviderAdapter {
  readonly provider = 'ONEDRIVE' as const;

  async listFiles(connection: StorageConnection, query?: string): Promise<ProviderFileItem[]> {
    const token = await getValidAccessToken(connection);
    const endpoint = query && query.trim()
      ? `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query.trim())}')`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      throw new AuthError('OneDrive connection expired or access revoked.', 403);
    }
    if (!res.ok) {
      throw new AuthError('Failed to fetch files from OneDrive.', 502);
    }

    const data = (await res.json()) as {
      value?: Array<{
        id: string;
        name: string;
        size?: number;
        webUrl?: string;
        file?: { mimeType?: string };
        lastModifiedDateTime?: string;
      }>;
    };

    return (data.value ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.file?.mimeType ?? 'application/octet-stream',
      size: item.size ?? 0,
      webUrl: item.webUrl ?? `https://onedrive.live.com/?id=${item.id}`,
      modifiedAt: item.lastModifiedDateTime,
    }));
  }

  async getFileMetadata(connection: StorageConnection, providerFileId: string): Promise<ProviderFileItem> {
    const token = await getValidAccessToken(connection);
    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(providerFileId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      throw new AuthError('File was deleted or not found in OneDrive.', 404);
    }
    if (res.status === 401 || res.status === 403) {
      throw new AuthError('Access denied or restricted by OneDrive.', 403);
    }
    if (!res.ok) {
      throw new AuthError('Unable to verify file in OneDrive.', 502);
    }

    const item = (await res.json()) as {
      id: string;
      name: string;
      size?: number;
      webUrl?: string;
      file?: { mimeType?: string };
      lastModifiedDateTime?: string;
    };

    return {
      id: item.id,
      name: item.name,
      mimeType: item.file?.mimeType ?? 'application/octet-stream',
      size: item.size ?? 0,
      webUrl: item.webUrl ?? `https://onedrive.live.com/?id=${item.id}`,
      modifiedAt: item.lastModifiedDateTime,
    };
  }

  async shareFile(connection: StorageConnection, providerFileId: string, options: ShareOptions): Promise<void> {
    const token = await getValidAccessToken(connection);
    const role = options.role === 'writer' ? 'write' : 'read';

    const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(providerFileId)}/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [{ email: options.email }],
        roles: [role],
        sendInvitation: true,
      }),
    });

    if (!res.ok) {
      throw new AuthError('Failed to share file in OneDrive.', 502);
    }
  }

  async getDirectUrl(connection: StorageConnection, providerFileId: string): Promise<string> {
    const meta = await this.getFileMetadata(connection, providerFileId);
    return meta.webUrl ?? `https://onedrive.live.com/?id=${providerFileId}`;
  }
}

export const oneDriveProviderAdapter = new OneDriveProviderAdapter();

import type { StorageConnection } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { getValidAccessToken } from '../storage.service';
import type { IFileProviderAdapter, ProviderFileItem, ShareOptions } from './file-provider.interface';

export class DropboxProviderAdapter implements IFileProviderAdapter {
  readonly provider = 'DROPBOX' as const;

  async listFiles(connection: StorageConnection, query?: string): Promise<ProviderFileItem[]> {
    const token = await getValidAccessToken(connection);
    const isSearch = Boolean(query && query.trim());
    const endpoint = isSearch
      ? 'https://api.dropboxapi.com/2/files/search_v2'
      : 'https://api.dropboxapi.com/2/files/list_folder';

    const body = isSearch
      ? { query: query!.trim() }
      : { path: '', recursive: false };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401 || res.status === 403) {
      throw new AuthError('Dropbox connection expired or access revoked.', 403);
    }
    if (!res.ok) {
      throw new AuthError('Failed to fetch files from Dropbox.', 502);
    }

    const data = (await res.json()) as {
      entries?: Array<{
        ['.tag']?: string;
        id: string;
        name: string;
        size?: number;
        client_modified?: string;
      }>;
      matches?: Array<{
        metadata?: {
          metadata?: {
            id: string;
            name: string;
            size?: number;
            client_modified?: string;
          };
        };
      }>;
    };

    if (isSearch) {
      return (data.matches ?? [])
        .map((m) => m.metadata?.metadata)
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => ({
          id: item.id,
          name: item.name,
          mimeType: 'application/octet-stream',
          size: item.size ?? 0,
          webUrl: `https://www.dropbox.com/home?preview=${encodeURIComponent(item.name)}`,
          modifiedAt: item.client_modified,
        }));
    }

    return (data.entries ?? [])
      .filter((e) => e['.tag'] === 'file')
      .map((item) => ({
        id: item.id,
        name: item.name,
        mimeType: 'application/octet-stream',
        size: item.size ?? 0,
        webUrl: `https://www.dropbox.com/home?preview=${encodeURIComponent(item.name)}`,
        modifiedAt: item.client_modified,
      }));
  }

  async getFileMetadata(connection: StorageConnection, providerFileId: string): Promise<ProviderFileItem> {
    const token = await getValidAccessToken(connection);
    const res = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: providerFileId }),
    });

    if (res.status === 409 || res.status === 404) {
      throw new AuthError('File was deleted or not found in Dropbox.', 404);
    }
    if (res.status === 401 || res.status === 403) {
      throw new AuthError('Access denied or restricted by Dropbox.', 403);
    }
    if (!res.ok) {
      throw new AuthError('Unable to verify file in Dropbox.', 502);
    }

    const item = (await res.json()) as {
      id: string;
      name: string;
      size?: number;
      client_modified?: string;
    };

    return {
      id: item.id,
      name: item.name,
      mimeType: 'application/octet-stream',
      size: item.size ?? 0,
      webUrl: `https://www.dropbox.com/home?preview=${encodeURIComponent(item.name)}`,
      modifiedAt: item.client_modified,
    };
  }

  async shareFile(connection: StorageConnection, providerFileId: string, options: ShareOptions): Promise<void> {
    const token = await getValidAccessToken(connection);
    const res = await fetch('https://api.dropboxapi.com/2/sharing/add_file_member', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: providerFileId,
        members: [{ '.tag': 'email', email: options.email }],
        access_level: options.role === 'writer' ? 'editor' : 'viewer',
      }),
    });

    if (!res.ok) {
      throw new AuthError('Failed to share file in Dropbox.', 502);
    }
  }

  async getDirectUrl(connection: StorageConnection, providerFileId: string): Promise<string> {
    const meta = await this.getFileMetadata(connection, providerFileId);
    return meta.webUrl ?? 'https://www.dropbox.com/home';
  }
}

export const dropBoxProviderAdapter = new DropboxProviderAdapter();

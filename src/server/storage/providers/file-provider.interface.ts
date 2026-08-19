import type { StorageConnection, StorageProvider } from '@prisma/client';

export interface ProviderFileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webUrl?: string;
  thumbnailUrl?: string;
  ownerEmail?: string;
  modifiedAt?: string;
}

export interface ShareOptions {
  email: string;
  role: 'reader' | 'writer';
}

export interface IFileProviderAdapter {
  provider: StorageProvider;

  /** Browse / search files directly from the cloud provider's API. */
  listFiles(connection: StorageConnection, query?: string): Promise<ProviderFileItem[]>;

  /** Fetch metadata for a specific file from the cloud provider. */
  getFileMetadata(connection: StorageConnection, providerFileId: string): Promise<ProviderFileItem>;

  /** Share a file with a teammate via the provider's permission API. */
  shareFile(connection: StorageConnection, providerFileId: string, options: ShareOptions): Promise<void>;

  /** Get direct view/open URL for browser navigation. */
  getDirectUrl(connection: StorageConnection, providerFileId: string): Promise<string>;
}

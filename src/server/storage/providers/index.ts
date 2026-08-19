import type { StorageProvider } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import type { IFileProviderAdapter } from './file-provider.interface';
import { googleDriveProviderAdapter } from './google-drive.provider';
import { oneDriveProviderAdapter } from './onedrive.provider';
import { dropBoxProviderAdapter } from './dropbox.provider';

export * from './file-provider.interface';
export * from './google-drive.provider';
export * from './onedrive.provider';
export * from './dropbox.provider';

export function getFileProviderAdapter(provider: StorageProvider | string): IFileProviderAdapter {
  const norm = typeof provider === 'string'
    ? (provider === 'google-drive' || provider === 'GOOGLE_DRIVE' ? 'GOOGLE_DRIVE'
      : provider === 'onedrive' || provider === 'ONEDRIVE' ? 'ONEDRIVE'
      : provider === 'dropbox' || provider === 'DROPBOX' ? 'DROPBOX'
      : null)
    : provider;

  switch (norm) {
    case 'GOOGLE_DRIVE':
      return googleDriveProviderAdapter;
    case 'ONEDRIVE':
      return oneDriveProviderAdapter;
    case 'DROPBOX':
      return dropBoxProviderAdapter;
    default:
      throw new AuthError(`Unsupported storage provider: ${provider}`, 400);
  }
}

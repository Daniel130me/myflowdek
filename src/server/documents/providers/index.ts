import type { StorageProvider } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import type { IDocumentProviderAdapter } from './document-provider.interface';
import { googleDocumentProviderAdapter } from './google-document.provider';

export * from './document-provider.interface';
export * from './google-document.provider';

export function getDocumentProviderAdapter(provider: StorageProvider): IDocumentProviderAdapter {
  if (provider === 'GOOGLE_DRIVE') return googleDocumentProviderAdapter;
  throw new AuthError('Document creation is currently available only for Google Drive.', 400);
}
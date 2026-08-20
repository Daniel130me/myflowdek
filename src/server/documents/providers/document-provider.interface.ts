import type { StorageConnection, StorageProvider } from '@prisma/client';
import type { GoogleDocumentContent, GoogleSheetContent } from '../types';

export interface CreatedProviderDocument {
  providerFileId: string;
  providerWebUrl: string;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface CreateDocumentInput {
  name: string;
  content: GoogleDocumentContent;
}

export interface CreateSpreadsheetInput {
  name: string;
  content: GoogleSheetContent;
}

export interface IDocumentProviderAdapter {
  provider: StorageProvider;
  createDocument(connection: StorageConnection, input: CreateDocumentInput): Promise<CreatedProviderDocument>;
  createSpreadsheet(connection: StorageConnection, input: CreateSpreadsheetInput): Promise<CreatedProviderDocument>;
}
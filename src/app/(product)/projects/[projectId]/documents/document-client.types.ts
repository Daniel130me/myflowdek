export type ProjectDocument = {
  id: string;
  name: string;
  providerWebUrl: string;
  mimeType: string | null;
  storageProvider: 'GOOGLE_DRIVE';
  createdAt: string;
  createdBy: { name: string | null; email: string };
  template: { name: string; phase: string; documentType: string } | null;
};

export type DocumentParagraph = {
  id: string;
  startIndex: number;
  endIndex: number;
  text: string;
  style: string;
  isBullet: boolean;
  editable: boolean;
};

export type DocumentSnapshot = {
  kind: 'document';
  title: string;
  revisionId: string;
  paragraphs: DocumentParagraph[];
  hasUnsupportedContent: boolean;
};

export type SpreadsheetSnapshot = {
  kind: 'spreadsheet';
  title: string;
  revisionId: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    values: string[][];
    truncated: boolean;
  }>;
};

export type ProviderDocumentSnapshot = DocumentSnapshot | SpreadsheetSnapshot;

import type { ProjectDocumentPhase, TemplateDocumentType } from '@prisma/client';

export type DocumentBlock =
  | { type: 'heading'; text: string }
  | { type: 'field'; label: string; value: string }
  | { type: 'section'; heading: string; body: string }
  | { type: 'bullets'; heading?: string; items: string[] };

export interface GoogleDocumentContent {
  sections: DocumentBlock[];
}

export interface SheetDefinition {
  name: string;
  columns: string[];
  rows?: string[][];
}

export interface GoogleSheetContent {
  sheets: SheetDefinition[];
}

export type StructuredTemplateContent = GoogleDocumentContent | GoogleSheetContent;

export type GoogleParagraphStyle =
  | 'TITLE'
  | 'SUBTITLE'
  | 'HEADING_1'
  | 'HEADING_2'
  | 'HEADING_3'
  | 'HEADING_4'
  | 'HEADING_5'
  | 'HEADING_6'
  | 'NORMAL_TEXT';

export interface GoogleDocumentParagraph {
  id: string;
  startIndex: number;
  endIndex: number;
  text: string;
  style: GoogleParagraphStyle;
  isBullet: boolean;
  editable: boolean;
}

export interface GoogleDocumentSnapshot {
  kind: 'document';
  title: string;
  revisionId: string;
  paragraphs: GoogleDocumentParagraph[];
  hasUnsupportedContent: boolean;
}

export interface GoogleSheetSnapshot {
  sheetId: number;
  title: string;
  values: string[][];
  truncated: boolean;
}

export interface GoogleSpreadsheetSnapshot {
  kind: 'spreadsheet';
  title: string;
  revisionId: string;
  sheets: GoogleSheetSnapshot[];
}

export type ProviderDocumentSnapshot = GoogleDocumentSnapshot | GoogleSpreadsheetSnapshot;

export interface GoogleDocumentParagraphUpdate {
  startIndex: number;
  endIndex: number;
  text: string;
}

export type ProviderDocumentUpdate =
  | {
      kind: 'document';
      revisionId: string;
      paragraphs: GoogleDocumentParagraphUpdate[];
    }
  | {
      kind: 'spreadsheet';
      revisionId: string;
      sheets: Array<{ title: string; values: string[][] }>;
    };

export interface DocumentTemplateDefinition {
  slug: string;
  name: string;
  description: string;
  phase: ProjectDocumentPhase;
  documentType: TemplateDocumentType;
  content: StructuredTemplateContent;
  thumbnailUrl?: string;
  tags: string[];
  version: number;
}

export interface TemplateResolutionContext {
  project: {
    name: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    manager: { name: string | null; email: string };
  };
  workspace: { name: string };
  currentDate?: Date;
}

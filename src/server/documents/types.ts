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
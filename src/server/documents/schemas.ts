import { z } from 'zod';

export const createProjectDocumentSchema = z.object({
  templateId: z.string().min(1, 'Template is required'),
  name: z.string().trim().min(1).max(255).optional(),
});

export const renameProjectDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Document name is required').max(255),
});

export const shareProjectDocumentSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  role: z.enum(['reader', 'writer']).default('reader'),
});

const documentParagraphUpdateSchema = z.object({
  startIndex: z.number().int().min(1),
  endIndex: z.number().int().min(1),
  text: z.string().max(50_000, 'A paragraph cannot exceed 50,000 characters'),
}).refine((paragraph) => paragraph.endIndex >= paragraph.startIndex, {
  message: 'Paragraph range is invalid',
});

const sheetValuesSchema = z.array(
  z.array(z.string().max(10_000, 'A cell cannot exceed 10,000 characters')).max(50),
).max(200);

export const updateProjectDocumentContentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('document'),
    revisionId: z.string().min(1, 'Document revision is required'),
    paragraphs: z.array(documentParagraphUpdateSchema).max(500),
  }),
  z.object({
    kind: z.literal('spreadsheet'),
    revisionId: z.string().min(1, 'Spreadsheet revision is required'),
    sheets: z.array(z.object({
      title: z.string().min(1).max(100),
      values: sheetValuesSchema,
    })).min(1).max(50),
  }),
]);

export type CreateProjectDocumentInput = z.infer<typeof createProjectDocumentSchema>;
export type UpdateProjectDocumentContentInput = z.infer<typeof updateProjectDocumentContentSchema>;

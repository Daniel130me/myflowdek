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

export type CreateProjectDocumentInput = z.infer<typeof createProjectDocumentSchema>;
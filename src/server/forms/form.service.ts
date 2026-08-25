import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createFormSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  fields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['text', 'textarea', 'number', 'date', 'select', 'email']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
  })),
});

export const submitFormSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;

export function listForms(projectId: string) {
  return db.form.findMany({
    where: { projectId },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createForm(projectId: string, input: CreateFormInput) {
  return db.form.create({
    data: { projectId, name: input.name, description: input.description ?? null, fields: input.fields },
  });
}

export async function deleteForm(formId: string) {
  await db.form.delete({ where: { id: formId } }).catch(() => { throw new AuthError('Form not found', 404); });
}

export function listSubmissions(formId: string) {
  return db.formSubmission.findMany({
    where: { formId },
    orderBy: { submittedAt: 'desc' },
  });
}

export async function submitForm(formId: string, projectId: string, data: Record<string, unknown>, submittedBy?: string) {
  return db.formSubmission.create({
    data: { formId, projectId, data: data as Prisma.InputJsonValue, submittedBy },
  });
}

import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createCustomFieldSchema = z.object({
  key: z.string().trim().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Key must be lowercase alphanumeric + underscore'),
  label: z.string().trim().min(1).max(100),
  type: z.enum(['text', 'number', 'date', 'select']),
  options: z.array(z.string()).optional(),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;

export function listCustomFields(projectId: string) {
  return db.customField.findMany({ where: { projectId }, orderBy: { key: 'asc' } });
}

export async function createCustomField(projectId: string, input: CreateCustomFieldInput) {
  return db.customField.create({
    data: { projectId, key: input.key, label: input.label, type: input.type, options: input.options ?? undefined },
  }).catch(() => { throw new AuthError('A custom field with this key already exists', 409); });
}

export async function deleteCustomField(fieldId: string) {
  await db.customField.delete({ where: { id: fieldId } })
    .catch(() => { throw new AuthError('Custom field not found', 404); });
}

/** Set a custom field value on a task. */
export async function setTaskCustomValue(taskId: string, fieldId: string, value: string | null) {
  return db.taskCustomFieldValue.upsert({
    where: { taskId_fieldId: { taskId, fieldId } },
    update: { value },
    create: { taskId, fieldId, value },
  });
}

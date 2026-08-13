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

/**
 * List all custom-field values for a task. Joined with the field definition so
 * the caller can map back to the column `key` without an extra round-trip.
 */
export function listTaskCustomValues(taskId: string) {
  return db.taskCustomFieldValue.findMany({
    where: { taskId },
    select: {
      fieldId: true,
      value: true,
      field: { select: { key: true, label: true, type: true } },
    },
  });
}

/**
 * Resolve a CustomField by its (projectId, key). Returns the row or null.
 * Used by the value-set endpoint so callers can identify a field by its
 * human-readable `key` (which is what the frontend CustomColumn carries)
 * without needing the server-side `fieldId`.
 */
export async function findCustomFieldByKey(projectId: string, key: string) {
  return db.customField.findUnique({
    where: { projectId_key: { projectId, key } },
    select: { id: true, projectId: true, key: true, label: true, type: true },
  });
}

/** Resolve a CustomField by id. Returns the row or null. */
export async function findCustomFieldById(fieldId: string) {
  return db.customField.findUnique({
    where: { id: fieldId },
    select: { id: true, projectId: true, key: true, label: true, type: true },
  });
}

/** Delete a single custom-field value from a task. No-op if the row doesn't
 *  exist (the @@unique constraint on (taskId, fieldId) makes this safe). */
export async function deleteTaskCustomValue(taskId: string, fieldId: string) {
  await db.taskCustomFieldValue.deleteMany({ where: { taskId, fieldId } });
}

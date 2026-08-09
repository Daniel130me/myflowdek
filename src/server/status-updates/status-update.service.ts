import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createStatusUpdateSchema = z.object({
  text: z.string().trim().min(1, 'Status update text is required').max(500),
  color: z.enum(['green', 'yellow', 'red']).default('green'),
});

export type CreateStatusUpdateInput = z.infer<typeof createStatusUpdateSchema>;

export function listStatusUpdates(projectId: string) {
  return db.projectStatusUpdate.findMany({
    where: { projectId },
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStatusUpdate(projectId: string, authorId: string, input: CreateStatusUpdateInput) {
  return db.projectStatusUpdate.create({
    data: { projectId, authorId, text: input.text, color: input.color },
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
  });
}

export async function deleteStatusUpdate(updateId: string) {
  await db.projectStatusUpdate.delete({ where: { id: updateId } })
    .catch(() => { throw new AuthError('Status update not found', 404); });
}

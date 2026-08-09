import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createSavedFilterSchema = z.object({
  name: z.string().trim().min(1).max(100),
  filters: z.record(z.string(), z.unknown()),
  isPinned: z.boolean().default(false),
});

export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;

export function listSavedFilters(userId: string) {
  return db.savedFilter.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createSavedFilter(userId: string, input: CreateSavedFilterInput) {
  return db.savedFilter.create({
    data: { userId, name: input.name, filters: input.filters as Prisma.InputJsonValue, isPinned: input.isPinned },
  });
}

export async function deleteSavedFilter(filterId: string, userId: string) {
  const filter = await db.savedFilter.findUnique({ where: { id: filterId }, select: { userId: true } });
  if (!filter || filter.userId !== userId) throw new AuthError('Saved filter not found', 404);
  await db.savedFilter.delete({ where: { id: filterId } });
}

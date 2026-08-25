import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

/** Validation for creating/updating a tag. */
export const upsertTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(50),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

export type UpsertTagInput = z.infer<typeof upsertTagSchema>;

/** List all tags for a project. */
export function listTags(projectId: string) {
  return db.tag.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  });
}

/** Create a tag. */
export async function createTag(projectId: string, input: UpsertTagInput) {
  try {
    return await db.tag.create({
      data: {
        projectId,
        name: input.name,
        color: input.color ?? '#9CA3AF',
      },
    });
  } catch (err) {
    // P2002 = unique constraint on (projectId, name)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AuthError('A tag with this name already exists in this project', 409);
    }
    throw err;
  }
}

/** Delete a tag. */
export async function deleteTag(tagId: string) {
  try {
    await db.tag.delete({ where: { id: tagId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Tag not found', 404);
    }
    throw err;
  }
}

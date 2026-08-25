import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createSectionSchema = z.object({
  name: z.string().trim().min(1, 'Section name is required').max(100),
  position: z.number().int().optional(),
});

export const updateSectionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  position: z.number().int().optional(),
  collapsed: z.boolean().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

/** List all sections for a project, ordered by position. */
export function listSections(projectId: string) {
  return db.section.findMany({
    where: { projectId },
    orderBy: { position: 'asc' },
  });
}

/** Create a section. Auto-increments position if not supplied. */
export async function createSection(projectId: string, input: CreateSectionInput) {
  const maxPos = await db.section.findFirst({
    where: { projectId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return db.section.create({
    data: {
      projectId,
      name: input.name,
      position: input.position ?? (maxPos?.position ?? -1) + 1,
    },
  });
}

/** Update a section. */
export async function updateSection(sectionId: string, input: UpdateSectionInput) {
  try {
    return await db.section.update({
      where: { id: sectionId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.collapsed !== undefined ? { collapsed: input.collapsed } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Section not found', 404);
    }
    throw err;
  }
}

/** Delete a section. Tasks in it have sectionId set to null (SetNull). */
export async function deleteSection(sectionId: string) {
  try {
    await db.section.delete({ where: { id: sectionId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Section not found', 404);
    }
    throw err;
  }
}

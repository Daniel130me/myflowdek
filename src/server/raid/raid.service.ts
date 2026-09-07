import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

/**
 * RAID log service (audit C-01).
 *
 * RAID items are project risk-management records (Risks, Assumptions,
 * Issues, Dependencies). Before this service existed the entire RAID CRUD
 * was React state only — every entry was destroyed on refresh and never
 * visible to other team members.
 *
 * The value sets below are the canonical contract. The UI mirrors them in
 * `RAID_ORDER` / `IMPACT_META` (features/flowdeck/model/constants.ts) and
 * the status dropdown; if you change a value here, change it there too.
 */

export const RAID_ITEM_TYPES = ['risk', 'assumption', 'issue', 'dependency'] as const;
export const RAID_IMPACTS = ['low', 'medium', 'high'] as const;
export const RAID_STATUSES = ['open', 'mitigated', 'closed'] as const;

export const createRaidItemSchema = z.object({
  type: z.enum(RAID_ITEM_TYPES),
  description: z.string().trim().min(1, 'Description is required').max(2000),
  /** Unassigned items carry a null owner. */
  ownerId: z.string().trim().min(1).nullable().optional(),
  impact: z.enum(RAID_IMPACTS).default('medium'),
});

export const updateRaidItemSchema = z
  .object({
    type: z.enum(RAID_ITEM_TYPES).optional(),
    description: z.string().trim().min(1, 'Description cannot be empty').max(2000).optional(),
    ownerId: z.string().trim().min(1).nullable().optional(),
    impact: z.enum(RAID_IMPACTS).optional(),
    status: z.enum(RAID_STATUSES).optional(),
  })
  .refine(data => Object.values(data).some(value => value !== undefined), {
    message: 'Nothing to update',
  });

export type CreateRaidItemInput = z.infer<typeof createRaidItemSchema>;
export type UpdateRaidItemInput = z.infer<typeof updateRaidItemSchema>;

/** List a project's RAID items, newest first (matches the UI's prepend order). */
export function listRaidItems(projectId: string) {
  return db.raidItem.findMany({
    where: { projectId },
    orderBy: { dateRaised: 'desc' },
  });
}

/** Create a RAID item. `dateRaised` is server-owned (defaults to now). */
export async function createRaidItem(projectId: string, input: CreateRaidItemInput) {
  try {
    return await db.raidItem.create({
      data: {
        projectId,
        type: input.type,
        description: input.description,
        ownerId: input.ownerId ?? null,
        impact: input.impact,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new AuthError('Project not found', 404);
    }
    throw error;
  }
}

/**
 * Update a RAID item. Scoped by `projectId` in the same query (updateMany)
 * so a cross-project id cannot be patched even by a valid project member.
 */
export async function updateRaidItem(
  projectId: string,
  itemId: string,
  input: UpdateRaidItemInput,
) {
  const { count } = await db.raidItem.updateMany({
    where: { id: itemId, projectId },
    data: input,
  });
  if (count === 0) {
    throw new AuthError('RAID item not found in this project', 404);
  }
  return db.raidItem.findUnique({ where: { id: itemId } });
}

/** Delete a RAID item, with the same project scoping as update. */
export async function deleteRaidItem(projectId: string, itemId: string) {
  const { count } = await db.raidItem.deleteMany({
    where: { id: itemId, projectId },
  });
  if (count === 0) {
    throw new AuthError('RAID item not found in this project', 404);
  }
}

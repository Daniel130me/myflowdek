import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

/**
 * RAID log service.
 *
 * Backs the project RAID Log view (Risks, Assumptions, Issues, Dependencies).
 * Before this service existed the view kept everything in React state and
 * every entry was destroyed on refresh (audit C-01).
 */

export const RAID_TYPES = ['risk', 'assumption', 'issue', 'dependency'] as const;
export const RAID_IMPACTS = ['low', 'medium', 'high'] as const;
export const RAID_STATUSES = ['open', 'mitigated', 'closed'] as const;

export const createRaidItemSchema = z.object({
  type: z.enum(RAID_TYPES),
  description: z.string().trim().min(1).max(500),
  owner: z.string().trim().max(50).optional().nullable(),
  impact: z.enum(RAID_IMPACTS).default('medium'),
  status: z.enum(RAID_STATUSES).default('open'),
  // The view sends date-only ('2026-09-08'); full ISO timestamps are fine too.
  dateRaised: z
    .string()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), 'Invalid date'),
});

export const updateRaidItemSchema = z.object({
  description: z.string().trim().min(1).max(500).optional(),
  owner: z.string().trim().max(50).optional().nullable(),
  impact: z.enum(RAID_IMPACTS).optional(),
  status: z.enum(RAID_STATUSES).optional(),
});

export type CreateRaidItemInput = z.infer<typeof createRaidItemSchema>;
export type UpdateRaidItemInput = z.infer<typeof updateRaidItemSchema>;

/** Row shape with the fields the view needs (ownerId returned as `owner`). */
const raidSelect = {
  id: true,
  type: true,
  description: true,
  ownerId: true,
  impact: true,
  status: true,
  dateRaised: true,
} as const;

export function listRaidItems(projectId: string) {
  return db.raidItem.findMany({
    where: { projectId },
    orderBy: { dateRaised: 'desc' },
    select: raidSelect,
  });
}

export async function createRaidItem(projectId: string, input: CreateRaidItemInput) {
  return db.raidItem.create({
    data: {
      projectId,
      type: input.type,
      description: input.description,
      ownerId: input.owner || null,
      impact: input.impact,
      status: input.status,
      ...(input.dateRaised && !Number.isNaN(Date.parse(input.dateRaised))
        ? { dateRaised: new Date(input.dateRaised) }
        : {}),
    },
    select: raidSelect,
  });
}

/** Update an item, verifying it belongs to the project (defense in depth). */
export async function updateRaidItem(projectId: string, itemId: string, input: UpdateRaidItemInput) {
  const existing = await db.raidItem.findUnique({
    where: { id: itemId },
    select: { projectId: true },
  });
  if (!existing || existing.projectId !== projectId) {
    throw new AuthError('RAID item not found in this project', 404);
  }
  return db.raidItem.update({
    where: { id: itemId },
    data: {
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.owner === undefined ? {} : { ownerId: input.owner || null }),
      ...(input.impact === undefined ? {} : { impact: input.impact }),
      ...(input.status === undefined ? {} : { status: input.status }),
    },
    select: raidSelect,
  });
}

export async function deleteRaidItem(projectId: string, itemId: string) {
  const existing = await db.raidItem.findUnique({
    where: { id: itemId },
    select: { projectId: true },
  });
  if (!existing || existing.projectId !== projectId) {
    throw new AuthError('RAID item not found in this project', 404);
  }
  await db.raidItem.delete({ where: { id: itemId } });
}

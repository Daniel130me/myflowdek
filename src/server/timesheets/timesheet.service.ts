import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { z } from 'zod';

export const createTimesheetSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional().nullable(),
  date: z.iso.datetime(),
  hours: z.number().positive().max(24),
  note: z.string().trim().max(500).optional(),
});

export const updateTimesheetSchema = z.object({
  hours: z.number().min(0).max(24).optional(),
  note: z.string().trim().max(500).optional(),
  date: z.iso.datetime().optional(),
});

export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>;
export type UpdateTimesheetInput = z.infer<typeof updateTimesheetSchema>;

/** List timesheet entries for a user, optionally filtered by project + date range. */
export function listTimesheets(userId: string, opts?: { projectId?: string; startDate?: string; endDate?: string; submitted?: boolean }) {
  return db.timesheetEntry.findMany({
    where: {
      userId,
      ...(opts?.projectId ? { projectId: opts.projectId } : {}),
      ...(opts?.startDate || opts?.endDate ? {
        date: {
          ...(opts.startDate ? { gte: new Date(opts.startDate) } : {}),
          ...(opts.endDate ? { lte: new Date(opts.endDate) } : {}),
        },
      } : {}),
      ...(opts?.submitted !== undefined ? { submitted: opts.submitted } : {}),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: 'desc' },
  });
}

/**
 * Create a timesheet entry.
 *
 * Integrity invariants enforced here (the route layer has already verified
 * the caller is a member of `input.projectId` via `requireProjectMember`):
 *
 *  - If `input.taskId` is supplied, the referenced task must exist AND belong
 *    to `input.projectId`. Rejects cross-project taskIds that would otherwise
 *    attach a timesheet entry to a task the user cannot see.
 */
export async function createTimesheet(userId: string, input: CreateTimesheetInput) {
  if (input.taskId) {
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { projectId: true },
    });
    if (!task || task.projectId !== input.projectId) {
      throw new AuthError('Task does not belong to this project', 400);
    }
  }

  return db.timesheetEntry.create({
    data: {
      userId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      date: new Date(input.date),
      hours: input.hours,
      note: input.note ?? null,
    },
  });
}

export async function submitTimesheets(userId: string, entryIds: string[]) {
  const result = await db.timesheetEntry.updateMany({
    where: { id: { in: entryIds }, userId, submitted: false },
    data: { submitted: true },
  });
  return result.count;
}

export async function approveTimesheets(entryIds: string[]) {
  const result = await db.timesheetEntry.updateMany({
    where: { id: { in: entryIds }, submitted: true, approved: false },
    data: { approved: true },
  });
  return result.count;
}

export async function deleteTimesheet(entryId: string, userId: string) {
  // Only the owner can delete, and only if not yet submitted.
  const entry = await db.timesheetEntry.findUnique({ where: { id: entryId }, select: { userId: true, submitted: true } });
  if (!entry) return;
  if (entry.userId !== userId || entry.submitted) return;
  await db.timesheetEntry.delete({ where: { id: entryId } });
}

/**
 * Update a timesheet entry's editable fields.
 *
 * Guards:
 *  - Only the entry's owner can edit it.
 *  - Once submitted (or approved), the entry is locked — the caller must
 *    unsubmit or use the approval workflow instead.
 */
export async function updateTimesheet(entryId: string, userId: string, input: UpdateTimesheetInput) {
  const entry = await db.timesheetEntry.findUnique({
    where: { id: entryId },
    select: { userId: true, submitted: true },
  });
  if (!entry) throw new AuthError('Timesheet entry not found', 404);
  if (entry.userId !== userId) throw new AuthError('You can only edit your own timesheet entries', 403);
  if (entry.submitted) throw new AuthError('Cannot edit a submitted timesheet entry', 400);

  try {
    return await db.timesheetEntry.update({
      where: { id: entryId },
      data: {
        ...(input.hours !== undefined ? { hours: input.hours } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Timesheet entry not found', 404);
    }
    throw err;
  }
}

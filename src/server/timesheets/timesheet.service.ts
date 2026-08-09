import { db } from '@/server/db/client';
import { z } from 'zod';

export const createTimesheetSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional().nullable(),
  date: z.iso.datetime(),
  hours: z.number().positive().max(24),
  note: z.string().trim().max(500).optional(),
});

export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>;

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

export async function createTimesheet(userId: string, input: CreateTimesheetInput) {
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

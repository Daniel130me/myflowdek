import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, requireProjectCapability, authErrorResponse } from '@/server/auth/authorization';
import { approveTimesheets } from '@/server/timesheets/timesheet.service';
import { db } from '@/server/db/client';
import { z } from 'zod';

const approveSchema = z.object({ entryIds: z.array(z.string()).min(1) });

/**
 * POST /api/timesheets/approve
 * Approve submitted timesheet entries. Requires the `APPROVE_TIMESHEETS`
 * capability (OWNER/ADMIN) on the project of every entry being approved.
 *
 * The capability check is delegated to the centralized `requireProjectCapability`
 * helper so the matrix in `capabilities.ts` stays the single source of truth
 * for who can approve timesheets.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json().catch(() => null);
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 });

    // Verify the user holds APPROVE_TIMESHEETS on the project of every entry.
    // Loading the entries first lets us short-circuit on a 404 (unknown id)
    // before doing any capability checks.
    const entries = await db.timesheetEntry.findMany({
      where: { id: { in: parsed.data.entryIds } },
      select: { id: true, projectId: true },
    });

    if (entries.length !== parsed.data.entryIds.length) {
      return NextResponse.json({ error: 'One or more timesheet entries were not found' }, { status: 404 });
    }

    // De-duplicate projectIds — typically a single approval batch is for one
    // project, but the API doesn't enforce that.
    const projectIds = Array.from(new Set(entries.map(e => e.projectId)));
    for (const projectId of projectIds) {
      await requireProjectCapability(user.id, projectId, 'APPROVE_TIMESHEETS');
    }

    const count = await approveTimesheets(parsed.data.entryIds);
    return NextResponse.json({ approved: count });
  } catch (e) { return authErrorResponse(e); }
}
